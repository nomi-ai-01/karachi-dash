import Phaser from 'phaser';
import { CONFIG, PALETTE, WORLDS, type WorldId } from '../data/config';
import { loadSave, writeSave } from '../data/save';
import { ensureDailyMissions, getMissionDef } from '../data/missions';
import { Rickshaw, type Lane } from '../entities/Rickshaw';
import { Obstacle, randomObstacle } from '../entities/Obstacle';
import { Coin } from '../entities/Coin';
import { PowerUp, randomPowerUp, type PowerUpKind } from '../entities/PowerUp';
import { InputManager, applyLaneAction } from '../systems/InputManager';
import { audio } from '../audio/AudioManager';
import { TextureFactory } from '../utils/TextureFactory';
import { Hud } from '../ui/Hud';
import { shareScore } from '../utils/shareScore';
import { clamp, rand, randInt, pick } from '../utils/math';

interface ActivePower {
  kind: PowerUpKind;
  remaining: number;
}

/**
 * Production GameScene – full state reset, perspective entities,
 * professional HUD, near-miss, revive, level clear, boss chase.
 */
export class GameScene extends Phaser.Scene {
  private rickshaw!: Rickshaw;
  private inputMgr!: InputManager;
  private hud!: Hud;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private powerups: PowerUp[] = [];
  private roadGraphics!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private parallaxFar!: Phaser.GameObjects.Container;
  private parallaxMid!: Phaser.GameObjects.Container;
  private parallaxNear!: Phaser.GameObjects.Container;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private speedLines: Phaser.GameObjects.Rectangle[] = [];
  private rainDrops: Phaser.GameObjects.Rectangle[] = [];
  private cheerText!: Phaser.GameObjects.Text;

  private speed = CONFIG.BASE_SPEED;
  private speedBoost = 1;
  private elapsed = 0;
  private distance = 0;
  private score = 0;
  private coinCount = 0;
  private combo = 0;
  private comboTimer = 0;
  private spawnTimer = 0;
  private roadOffset = 0;
  private gameOver = false;
  private paused = false;
  private revived = false;
  private crashedThisRun = false;
  private levelComplete = false;
  private activePowers: ActivePower[] = [];
  private magnetActive = false;
  private doubleActive = false;
  private batActive = false;
  private shieldActive = false;
  private lastCheer = 0;
  private nearMissCooldown = 0;
  private busesDodged = 0;
  private nearMissCount = 0;
  private maxCombo = 0;
  private worldId: WorldId = 'saddar';
  private bossActive = false;
  private bossTimer = 0;

  constructor() {
    super('Game');
  }

  create() {
    TextureFactory.ensure(this);
    this.resetState();
    this.buildWorld();
    this.buildPlayer();
    this.buildHud();
    this.bindInput();
  }

  /** Complete clean slate – fixes retry freeze */
  private resetState() {
    this.obstacles.forEach((o) => o.destroy());
    this.coins.forEach((c) => c.destroy());
    this.powerups.forEach((p) => p.destroy());
    this.speedLines.forEach((l) => l.destroy());
    this.rainDrops.forEach((d) => d.destroy());
    if (this.rickshaw) this.rickshaw.destroy();
    if (this.hud) this.hud.destroy();
    this.children.getByName('pauseOverlay')?.destroy(true);
    this.children.getByName('gameOverOverlay')?.destroy(true);

    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.speedLines = [];
    this.rainDrops = [];
    this.activePowers = [];

    this.gameOver = false;
    this.paused = false;
    this.revived = false;
    this.crashedThisRun = false;
    this.levelComplete = false;
    this.speed = CONFIG.BASE_SPEED * 0.8;
    this.speedBoost = 1;
    this.elapsed = 0;
    this.distance = 0;
    this.score = 0;
    this.coinCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.spawnTimer = 1.0;
    this.roadOffset = 0;
    this.lastCheer = 0;
    this.nearMissCooldown = 0;
    this.busesDodged = 0;
    this.nearMissCount = 0;
    this.maxCombo = 0;
    this.bossActive = false;
    this.bossTimer = 0;
    this.magnetActive = false;
    this.doubleActive = false;
    this.batActive = false;
    this.shieldActive = false;
    this.worldId = (this.registry.get('worldId') as WorldId) || 'saddar';
  }

  private buildWorld() {
    this.cameras.main.setBackgroundColor(PALETTE.midnight);
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.roadGraphics = this.add.graphics().setDepth(20);

    this.parallaxFar = this.add.container(0, 0).setDepth(4);
    this.parallaxMid = this.add.container(0, 0).setDepth(8);
    this.parallaxNear = this.add.container(0, 0).setDepth(14);

    for (let i = 0; i < 14; i++) {
      if (this.textures.exists('tex-building')) {
        this.parallaxFar.add(
          this.add.image(i * 52 - 30, 160, 'tex-building').setScale(0.55).setAlpha(0.4).setTint(0x6a8aaa),
        );
      }
    }
    for (let i = 0; i < 10; i++) {
      if (this.textures.exists('tex-building')) {
        this.parallaxMid.add(
          this.add.image(i * 68 - 20, 190, 'tex-building').setScale(0.85).setAlpha(0.65),
        );
      }
    }
    for (let i = 0; i < 8; i++) {
      if (this.textures.exists('tex-palm')) {
        this.parallaxNear.add(
          this.add.image(i * 95 + 10, 240, 'tex-palm').setScale(0.75).setAlpha(0.75),
        );
      }
    }

    for (let i = 0; i < 8; i++) {
      const line = this.add
        .rectangle(rand(40, CONFIG.VIEW_WIDTH - 40), rand(200, 600), 2, 28, 0xffffff, 0.12)
        .setDepth(21)
        .setVisible(false);
      this.speedLines.push(line);
    }

    this.particles = this.add.particles(0, 0, 'tex-dot', {
      x: { min: 50, max: CONFIG.VIEW_WIDTH - 50 },
      y: { min: 120, max: CONFIG.VIEW_HEIGHT - 100 },
      speedY: { min: 60, max: 180 },
      scale: { start: 0.35, end: 0.02 },
      alpha: { start: 0.25, end: 0 },
      lifespan: 500,
      frequency: 120,
      blendMode: 'ADD',
      tint: 0xffc857,
      emitting: false,
    });
    this.particles.setDepth(22);

    this.cheerText = this.add
      .text(CONFIG.VIEW_WIDTH / 2, CONFIG.VIEW_HEIGHT * 0.38, '', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '30px',
        color: '#ffc857',
        stroke: '#0b1c2c',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setAlpha(0);
  }

  private buildPlayer() {
    const save = loadSave();
    this.rickshaw = new Rickshaw(this, save.selectedSkin);
    this.rickshaw.container.x = CONFIG.VIEW_WIDTH / 2;
    this.rickshaw.container.y = CONFIG.VIEW_HEIGHT * CONFIG.PLAYER_Y;
  }

  private buildHud() {
    const world = WORLDS.find((w) => w.id === this.worldId) || WORLDS[0];
    this.hud = new Hud(this, world.name);

    const pauseBtn = this.add
      .text(CONFIG.VIEW_WIDTH - 16, 58, '❚❚', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#fefae0',
      })
      .setOrigin(1, 0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this.togglePause());
  }

  private bindInput() {
    this.inputMgr = new InputManager(this);
    this.input.once('pointerdown', () => {
      audio.unlock().then(() => audio.startMusic());
    });
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
  }

  private togglePause() {
    if (this.gameOver || this.levelComplete) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.particles.stop();
      this.showPauseOverlay();
    } else {
      this.children.getByName('pauseOverlay')?.destroy(true);
    }
  }

  private showPauseOverlay() {
    const c = this.add.container(0, 0).setDepth(200).setName('pauseOverlay');
    c.add(
      this.add.rectangle(
        CONFIG.VIEW_WIDTH / 2,
        CONFIG.VIEW_HEIGHT / 2,
        CONFIG.VIEW_WIDTH,
        CONFIG.VIEW_HEIGHT,
        0x000000,
        0.72,
      ),
    );
    c.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, CONFIG.VIEW_HEIGHT * 0.3, 'Paused', {
          fontFamily: 'Arial Black, Arial',
          fontSize: '36px',
          color: '#fefae0',
        })
        .setOrigin(0.5),
    );
    const btn = (y: number, label: string, fn: () => void) => {
      const t = this.add
        .text(CONFIG.VIEW_WIDTH / 2, y, label, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffc857',
          backgroundColor: '#1a1a2e',
          padding: { x: 22, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', fn);
      c.add(t);
    };
    btn(CONFIG.VIEW_HEIGHT * 0.45, 'Resume', () => this.togglePause());
    btn(CONFIG.VIEW_HEIGHT * 0.55, 'Restart', () => this.scene.restart());
    btn(CONFIG.VIEW_HEIGHT * 0.65, 'Home', () => this.scene.start('Menu'));
  }

  update(_: number, delta: number) {
    if (this.gameOver || this.paused || this.levelComplete) return;
    const dt = Math.min(delta / 1000, 0.05);

    this.elapsed += dt;
    const worldDef = WORLDS.find((w) => w.id === this.worldId) || WORLDS[0];

    if (this.elapsed >= worldDef.durationSec) {
      this.levelComplete = true;
      this.onLevelComplete();
      return;
    }

    const ramp = Math.max(0, this.elapsed - CONFIG.START_GENTLE_SEC);
    const baseSpeed = clamp(
      CONFIG.BASE_SPEED + ramp * CONFIG.SPEED_RAMP_PER_SEC,
      CONFIG.BASE_SPEED * 0.75,
      CONFIG.MAX_SPEED,
    );
    this.speed = baseSpeed * this.speedBoost;
    const speedFactor = this.speed / CONFIG.MAX_SPEED;

    this.distance += this.speed * dt;
    this.score += this.speed * dt * CONFIG.DISTANCE_SCORE_RATE;
    if (this.nearMissCooldown > 0) this.nearMissCooldown -= dt;

    this.tickPowers(dt);
    this.tickBoss(dt);
    this.handleInput();
    this.rickshaw.update(dt, CONFIG.VIEW_WIDTH / 2, speedFactor);

    this.roadOffset = (this.roadOffset + this.speed * dt) % 120;
    this.drawWorld();
    this.updateRain(dt);
    this.scrollParallax(dt);
    this.updateSpeedLines(speedFactor, dt);

    if (speedFactor > 0.5) {
      if (!this.particles.emitting) this.particles.start();
    } else {
      this.particles.stop();
    }

    this.spawnTimer -= this.speed * dt;
    if (this.spawnTimer <= 0) {
      this.spawnRow();
      this.spawnTimer = clamp(
        CONFIG.SPAWN_BASE_GAP - (baseSpeed - CONFIG.BASE_SPEED) * 0.22,
        CONFIG.SPAWN_MIN_GAP,
        CONFIG.SPAWN_BASE_GAP,
      );
    }

    this.updateEntities(dt);
    this.checkCollisions();

    if (this.comboTimer > 0) {
      this.comboTimer -= dt * 1000;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    const milestone = Math.floor(this.distance / 500) * 500;
    if (milestone > this.lastCheer && milestone > 0) {
      this.lastCheer = milestone;
      this.showCheer(pick(['Shabash!', 'Zabardast!', 'Kya baat hai!', 'Chalo!']));
    }

    this.hud.update({
      score: this.score,
      coins: this.coinCount,
      combo: this.combo,
      timeLeft: Math.ceil(worldDef.durationSec - this.elapsed),
      powers: this.activePowers
        .map((p) => `${p.kind.toUpperCase()} ${Math.ceil(p.remaining)}s`)
        .join('  '),
    });
  }

  private tickBoss(dt: number) {
    if (
      !this.bossActive &&
      this.elapsed > CONFIG.BOSS_MIN_ELAPSED &&
      Math.random() < CONFIG.BOSS_CHANCE_PER_FRAME
    ) {
      this.bossActive = true;
      this.bossTimer = CONFIG.BOSS_DURATION;
      this.showCheer('Police Chase!');
      audio.playHorn();
    }
    if (!this.bossActive) return;

    this.bossTimer -= dt;
    this.speedBoost = Math.max(this.speedBoost, CONFIG.BOSS_SPEED_MULT);
    if (Math.random() < 0.035) {
      const lanes = ([0, 1, 2] as Lane[]).filter((l) => l !== this.rickshaw.getLane());
      if (lanes.length) {
        const lane = pick(lanes);
        const def = { kind: 'bus' as const, lane, action: 'block' as const, width: 70, height: 90 };
        const obs = new Obstacle(this, def, this.depthToLaneX(lane, 0), this.depthToY(0));
        obs.depth = 0;
        obs.lane = lane;
        obs.container.setScale(this.depthToScale(0));
        this.obstacles.push(obs);
      }
    }
    if (this.bossTimer <= 0) {
      this.bossActive = false;
      this.score += CONFIG.BOSS_ESCAPE_BONUS;
      this.showCheer(`Escaped! +${CONFIG.BOSS_ESCAPE_BONUS}`);
    }
  }

  private tickPowers(dt: number) {
    this.magnetActive = false;
    this.doubleActive = false;
    this.batActive = false;
    this.shieldActive = false;
    let chai = false;
    for (let i = this.activePowers.length - 1; i >= 0; i--) {
      this.activePowers[i].remaining -= dt;
      if (this.activePowers[i].remaining <= 0) {
        this.activePowers.splice(i, 1);
        continue;
      }
      switch (this.activePowers[i].kind) {
        case 'magnet':
          this.magnetActive = true;
          break;
        case 'double':
          this.doubleActive = true;
          break;
        case 'bat':
          this.batActive = true;
          break;
        case 'shield':
          this.shieldActive = true;
          break;
        case 'chai':
          chai = true;
          break;
      }
    }
    if (!this.bossActive) this.speedBoost = chai ? 1.35 : 1;
  }

  private activatePower(kind: PowerUpKind) {
    const dur: Record<PowerUpKind, number> = {
      bat: 6,
      chai: 3.5,
      magnet: 8,
      double: 10,
      shield: 12,
    };
    const ex = this.activePowers.find((p) => p.kind === kind);
    if (ex) ex.remaining = dur[kind];
    else this.activePowers.push({ kind, remaining: dur[kind] });
    if (kind === 'chai') this.rickshaw.grantInvuln(3500);
    if (kind === 'shield') this.rickshaw.grantInvuln(500);
    audio.playPowerup();
    const names: Record<PowerUpKind, string> = {
      bat: 'Cricket Bat!',
      chai: 'Chai Boost!',
      magnet: 'Coin Magnet!',
      double: 'Double Coins!',
      shield: 'Shield!',
    };
    this.showCheer(names[kind]);
  }

  private depthToY(depth: number): number {
    const horizon = CONFIG.VIEW_HEIGHT * 0.28;
    return horizon + (CONFIG.VIEW_HEIGHT * CONFIG.PLAYER_Y - horizon) * depth;
  }

  private depthToScale(depth: number): number {
    return (
      CONFIG.PERSPECTIVE_SPAWN_SCALE +
      (CONFIG.PERSPECTIVE_PLAYER_SCALE - CONFIG.PERSPECTIVE_SPAWN_SCALE) * depth
    );
  }

  private depthToLaneX(lane: number, depth: number): number {
    const cx = CONFIG.VIEW_WIDTH / 2;
    const roadBottomW = CONFIG.ROAD_WIDTH + 40;
    const roadTopW = 70;
    const w = roadTopW + (roadBottomW - roadTopW) * depth;
    return cx + (lane - 1) * 0.33 * w;
  }

  private handleInput() {
    let action = this.inputMgr.consume();
    while (action) {
      if (action === 'left' || action === 'right') {
        const next = applyLaneAction(this.rickshaw.getLane(), action);
        if (next !== this.rickshaw.getLane()) {
          this.rickshaw.setLane(next);
          audio.playLane();
        }
      } else if (action === 'jump') {
        if (this.rickshaw.jump()) audio.playJump();
      } else if (action === 'slide') {
        if (this.rickshaw.slide()) audio.playSlide();
      }
      action = this.inputMgr.consume();
    }
  }

  private spawnRow() {
    const lanes: Lane[] = [0, 1, 2];
    const blocked = new Set<number>();
    const nObs = Math.random() < CONFIG.OBSTACLE_CHANCE ? (Math.random() < 0.3 ? 2 : 1) : 0;

    for (let i = 0; i < nObs; i++) {
      const free = lanes.filter((l) => !blocked.has(l));
      if (free.length <= 1) break;
      const lane = pick(free);
      blocked.add(lane);
      const def = randomObstacle(lane);
      const obs = new Obstacle(this, def, this.depthToLaneX(lane, 0), this.depthToY(0));
      obs.depth = 0;
      obs.lane = lane;
      obs.container.setScale(this.depthToScale(0));
      this.obstacles.push(obs);
    }

    if (Math.random() < CONFIG.COIN_CHANCE) {
      const free = lanes.filter((l) => !blocked.has(l));
      const lane = pick(free.length ? free : lanes);
      const count = randInt(1, 4);
      const golden = Math.random() < 0.08;
      for (let i = 0; i < count; i++) {
        const d = i * 0.04;
        const coin = new Coin(this, this.depthToLaneX(lane, d), this.depthToY(d), golden && i === 0);
        coin.depth = d;
        coin.lane = lane;
        coin.applyDepth(this.depthToScale(d));
        this.coins.push(coin);
      }
    }

    if (Math.random() < CONFIG.POWERUP_CHANCE) {
      const free = lanes.filter((l) => !blocked.has(l));
      const lane = pick(free.length ? free : lanes);
      const pu = new PowerUp(this, randomPowerUp(), this.depthToLaneX(lane, 0), this.depthToY(0));
      pu.depth = 0;
      pu.lane = lane;
      pu.container.setScale(this.depthToScale(0));
      this.powerups.push(pu);
    }
  }

  private updateEntities(dt: number) {
    const depthSpeed = (this.speed * dt) / (CONFIG.VIEW_HEIGHT * 0.55);

    for (const o of this.obstacles) {
      if (!o.active) continue;
      o.depth += depthSpeed;
      if (o.depth > 1.15) {
        o.destroy();
        continue;
      }
      const d = Math.min(1, o.depth);
      o.container.y = this.depthToY(d);
      o.container.x = this.depthToLaneX(o.lane, d);
      o.container.setScale(this.depthToScale(d));
    }
    this.obstacles = this.obstacles.filter((o) => o.active);

    for (const c of this.coins) {
      if (!c.active) continue;
      c.depth += depthSpeed;
      if (c.depth > 1.15) {
        c.destroy();
        continue;
      }
      const d = Math.min(1, c.depth);
      c.container.y = this.depthToY(d);
      c.container.x = this.depthToLaneX(c.lane, d);
      c.applyDepth(this.depthToScale(d));
      c.update(dt);
      if (this.magnetActive && c.depth > 0.45) {
        c.container.x += (this.rickshaw.container.x - c.container.x) * 0.1;
        c.container.y += (this.rickshaw.container.y - c.container.y) * 0.1;
      }
    }
    this.coins = this.coins.filter((c) => c.active);

    for (const p of this.powerups) {
      if (!p.active) continue;
      p.depth += depthSpeed;
      if (p.depth > 1.15) {
        p.destroy();
        continue;
      }
      const d = Math.min(1, p.depth);
      p.container.y = this.depthToY(d);
      p.container.x = this.depthToLaneX(p.lane, d);
      p.container.setScale(this.depthToScale(d));
      p.update(dt);
    }
    this.powerups = this.powerups.filter((p) => p.active);
  }

  private checkCollisions() {
    const pb = this.rickshaw.getBounds();
    const dMin = CONFIG.COLLISION_Y_MIN;
    const dMax = CONFIG.COLLISION_Y_MAX;

    for (const c of this.coins) {
      if (!c.active || c.depth < dMin || c.depth > dMax) continue;
      if (Phaser.Geom.Intersects.CircleToRectangle(c.getBounds(), pb)) {
        const val =
          (c.golden ? CONFIG.GOLDEN_VALUE : CONFIG.COIN_VALUE) * (this.doubleActive ? 2 : 1);
        this.coinCount += val;
        this.score += val * 5;
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.comboTimer = CONFIG.COMBO_WINDOW_MS;
        audio.playCoin(this.combo);
        c.collect();
        this.hud.flashScore();
        if (navigator.vibrate && loadSave().settings.haptics) navigator.vibrate(8);
      }
    }

    for (const p of this.powerups) {
      if (!p.active || p.depth < dMin || p.depth > dMax) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), pb)) {
        this.activatePower(p.kind);
        p.collect();
      }
    }

    if (this.rickshaw.isInvulnerable()) return;

    for (const o of this.obstacles) {
      if (!o.active || o.depth < dMin || o.depth > dMax) continue;
      const hits = Phaser.Geom.Intersects.RectangleToRectangle(o.getBounds(), pb);

      if (!hits && this.nearMissCooldown <= 0) {
        const dx = Math.abs(o.container.x - this.rickshaw.container.x);
        const dy = Math.abs(o.container.y - this.rickshaw.container.y);
        if (dx < CONFIG.NEAR_MISS_DIST && dy < 42) {
          this.score += CONFIG.NEAR_MISS_BONUS;
          this.nearMissCount += 1;
          this.nearMissCooldown = 0.55;
          this.showCheer('Bal Bal Bacha!');
          audio.playNearMiss();
        }
      }
      if (!hits) continue;

      let avoided = false;
      if (o.def.action === 'jump' && this.rickshaw.isAirborne()) {
        avoided = true;
        if (o.def.kind === 'bus' || o.def.kind === 'minibus') this.busesDodged += 1;
      }
      if (o.def.action === 'slide' && this.rickshaw.isSliding()) {
        avoided = true;
        if (o.def.kind === 'bus' || o.def.kind === 'minibus') this.busesDodged += 1;
      }
      if (this.batActive && o.def.action === 'block') {
        if (o.def.kind === 'bus' || o.def.kind === 'minibus') this.busesDodged += 1;
        o.destroy();
        this.score += 25;
        this.showCheer('Bal Bal Bacha!');
        audio.playNearMiss();
        avoided = true;
      }
      if (avoided) continue;

      if (this.shieldActive) {
        this.activePowers = this.activePowers.filter((p) => p.kind !== 'shield');
        this.rickshaw.grantInvuln(CONFIG.INVULN_MS);
        o.destroy();
        this.showCheer('Shield!');
        continue;
      }

      this.onCrash();
      return;
    }
  }

  private onCrash() {
    this.gameOver = true;
    this.crashedThisRun = true;
    this.particles.stop();
    audio.playCrash();
    audio.stopMusic();
    if (navigator.vibrate && loadSave().settings.haptics) navigator.vibrate([40, 30, 60]);
    this.cameras.main.shake(280, CONFIG.SHAKE_INTENSITY);
    const save = loadSave();
    this.time.delayedCall(320, () => this.showGameOver(Math.floor(this.score), save));
  }

  private applyMissionProgress(save: ReturnType<typeof loadSave>) {
    ensureDailyMissions(save);
    for (const m of save.missions.daily) {
      if (m.claimed) continue;
      const def = getMissionDef(m.id);
      if (!def) continue;
      if (def.type === 'coins') m.progress = Math.max(m.progress, this.coinCount);
      if (def.type === 'distance') m.progress = Math.max(m.progress, Math.floor(this.distance));
      if (def.type === 'runs') m.progress += 1;
      if (def.type === 'combo') m.progress = Math.max(m.progress, this.maxCombo);
      if (def.type === 'dodge_bus') m.progress = Math.max(m.progress, this.busesDodged);
      if (def.type === 'near_miss') m.progress = Math.max(m.progress, this.nearMissCount);
    }
  }

  private onLevelComplete() {
    this.particles.stop();
    audio.stopMusic();
    const save = loadSave();
    const finalScore = Math.floor(this.score);
    const worldDef = WORLDS.find((w) => w.id === this.worldId) || WORLDS[0];

    let stars = 1;
    if (this.coinCount >= CONFIG.STAR2_COINS || finalScore >= CONFIG.STAR2_SCORE) stars = 2;
    if (
      !this.crashedThisRun &&
      this.coinCount >= CONFIG.STAR3_COINS &&
      finalScore >= CONFIG.STAR3_SCORE
    )
      stars = 3;

    const prev = save.worldStars[this.worldId] ?? 0;
    if (stars > prev) save.worldStars[this.worldId] = stars;
    if (finalScore > save.highScore) save.highScore = finalScore;
    if (this.distance > save.bestDistance) save.bestDistance = this.distance;
    const bonus = CONFIG.CLEAR_BONUS_BASE + stars * CONFIG.CLEAR_BONUS_PER_STAR;
    save.coins += this.coinCount + bonus;
    save.totalCoinsEarned += this.coinCount + bonus;
    save.totalRuns += 1;
    this.applyMissionProgress(save);
    writeSave(save);

    this.gameOver = true;
    this.showLevelComplete(finalScore, stars, bonus, worldDef.name);
  }

  private showLevelComplete(score: number, stars: number, bonus: number, worldName: string) {
    const overlay = this.add.container(0, 0).setDepth(200).setName('gameOverOverlay');
    overlay.add(
      this.add.rectangle(
        CONFIG.VIEW_WIDTH / 2,
        CONFIG.VIEW_HEIGHT / 2,
        CONFIG.VIEW_WIDTH,
        CONFIG.VIEW_HEIGHT,
        0x0b1c2c,
        0.92,
      ),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 110, 'Zone Clear!', {
          fontFamily: 'Arial Black, Arial',
          fontSize: '36px',
          color: '#ffc857',
          stroke: '#000',
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 160, worldName, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#90e0ef',
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 210, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
          fontFamily: 'Arial',
          fontSize: '40px',
          color: '#ffc857',
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 270, `Score  ${score}`, {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#fefae0',
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 310, `+${this.coinCount} coins  ·  +${bonus} bonus`, {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#ffc857',
        })
        .setOrigin(0.5),
    );

    const next = this.add
      .text(CONFIG.VIEW_WIDTH / 2, 390, '  NEXT ZONE  ', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '22px',
        color: '#0b1c2c',
        backgroundColor: '#ffc857',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    next.on('pointerdown', () => {
      audio.playUI();
      this.scene.start('LevelSelect');
    });
    overlay.add(next);

    const replay = this.add
      .text(CONFIG.VIEW_WIDTH / 2, 460, 'Replay Zone', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#90e0ef',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    replay.on('pointerdown', () => {
      audio.playUI();
      this.scene.restart();
    });
    overlay.add(replay);

    const home = this.add
      .text(CONFIG.VIEW_WIDTH / 2, 510, 'Home', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#fefae0',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    home.on('pointerdown', () => {
      audio.playUI();
      this.scene.start('Menu');
    });
    overlay.add(home);
    audio.playPowerup();
  }

  private showGameOver(score: number, save: ReturnType<typeof loadSave>) {
    const overlay = this.add.container(0, 0).setDepth(200).setName('gameOverOverlay');
    overlay.add(
      this.add.rectangle(
        CONFIG.VIEW_WIDTH / 2,
        CONFIG.VIEW_HEIGHT / 2,
        CONFIG.VIEW_WIDTH,
        CONFIG.VIEW_HEIGHT,
        0x0b1c2c,
        0.9,
      ),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 130, 'Game Over', {
          fontFamily: 'Arial Black, Arial',
          fontSize: '38px',
          color: '#e63946',
          stroke: '#000',
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 200, `Score  ${score}`, {
          fontFamily: 'Arial',
          fontSize: '26px',
          color: '#fefae0',
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(
          CONFIG.VIEW_WIDTH / 2,
          245,
          score >= save.highScore ? 'New High Score!' : `Best  ${save.highScore}`,
          {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: score >= save.highScore ? '#ffc857' : '#90e0ef',
          },
        )
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(CONFIG.VIEW_WIDTH / 2, 285, `+${this.coinCount} coins`, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ffc857',
        })
        .setOrigin(0.5),
    );

    const canRevive = !this.revived && save.coins + this.coinCount >= CONFIG.REVIVE_COST;
    let y = 340;

    if (canRevive) {
      const rev = this.add
        .text(CONFIG.VIEW_WIDTH / 2, y, `  REVIVE (${CONFIG.REVIVE_COST})  `, {
          fontFamily: 'Arial',
          fontSize: '17px',
          color: '#0b1c2c',
          backgroundColor: '#90e0ef',
          padding: { x: 14, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      rev.on('pointerdown', () => {
        audio.playUI();
        const s = loadSave();
        s.coins = s.coins + this.coinCount - CONFIG.REVIVE_COST;
        this.coinCount = 0;
        writeSave(s);
        this.revived = true;
        this.gameOver = false;
        this.rickshaw.grantInvuln(2200);
        overlay.destroy(true);
        audio.startMusic();
        for (const o of this.obstacles) {
          if (o.depth > 0.35) o.destroy();
        }
        this.obstacles = this.obstacles.filter((o) => o.active);
      });
      overlay.add(rev);
      y += 60;
    }

    const retry = this.add
      .text(CONFIG.VIEW_WIDTH / 2, y, '  RETRY  ', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '24px',
        color: '#0b1c2c',
        backgroundColor: '#ffc857',
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    retry.on('pointerdown', () => {
      audio.playUI();
      this.commitRun(save, score);
      this.scene.restart();
    });
    overlay.add(retry);
    y += 55;

    const share = this.add
      .text(CONFIG.VIEW_WIDTH / 2, y, 'Share Score', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#90e0ef',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    share.on('pointerdown', () => {
      audio.playUI();
      shareScore(score, this.distance, save.selectedSkin);
    });
    overlay.add(share);
    y += 45;

    const home = this.add
      .text(CONFIG.VIEW_WIDTH / 2, y, 'Home', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#fefae0',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    home.on('pointerdown', () => {
      audio.playUI();
      this.commitRun(save, score);
      this.scene.start('Menu');
    });
    overlay.add(home);
  }

  private commitRun(save: ReturnType<typeof loadSave>, score: number) {
    if (score > save.highScore) save.highScore = score;
    if (this.distance > save.bestDistance) save.bestDistance = this.distance;
    save.coins += this.coinCount;
    save.totalCoinsEarned += this.coinCount;
    save.totalRuns += 1;
    this.applyMissionProgress(save);
    writeSave(save);
  }

  private showCheer(msg: string) {
    this.cheerText.setText(msg);
    this.cheerText.setAlpha(1);
    this.cheerText.setScale(0.55);
    this.tweens.killTweensOf(this.cheerText);
    this.tweens.add({
      targets: this.cheerText,
      scale: 1.08,
      duration: 160,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.cheerText,
          alpha: 0,
          duration: 350,
          delay: 180,
        });
      },
    });
  }

  private drawWorld() {
    const g = this.roadGraphics;
    g.clear();
    this.bgGraphics.clear();
    const W = CONFIG.VIEW_WIDTH;
    const H = CONFIG.VIEW_HEIGHT;
    const cx = W / 2;
    const horizon = H * 0.28;
    const roadBottomW = CONFIG.ROAD_WIDTH + 40;
    const roadTopW = 70;
    const world = WORLDS.find((w) => w.id === this.worldId) || WORLDS[0];

    this.bgGraphics.fillGradientStyle(world.skyTop, world.skyTop, world.skyBot, world.skyBot, 1);
    this.bgGraphics.fillRect(0, 0, W, horizon + 40);
    const ground =
      world.weather === 'evening' ? 0x2a3540 : world.weather === 'dust' ? 0x4a5a38 : 0x3a5a40;
    this.bgGraphics.fillStyle(ground, 1);
    this.bgGraphics.fillRect(0, horizon, W, H - horizon);

    g.fillStyle(0x2a2a2a, 1);
    g.beginPath();
    g.moveTo(cx - roadTopW / 2, horizon);
    g.lineTo(cx + roadTopW / 2, horizon);
    g.lineTo(cx + roadBottomW / 2, H);
    g.lineTo(cx - roadBottomW / 2, H);
    g.closePath();
    g.fillPath();

    g.lineStyle(5, 0xffc857, 0.95);
    g.lineBetween(cx - roadTopW / 2, horizon, cx - roadBottomW / 2, H);
    g.lineBetween(cx + roadTopW / 2, horizon, cx + roadBottomW / 2, H);

    const drawLane = (frac: number) => {
      g.lineStyle(3, 0xf4a261, 0.85);
      for (let t = 0; t < 1; t += 0.07) {
        const y1 = horizon + (H - horizon) * t;
        const y2 = horizon + (H - horizon) * Math.min(1, t + 0.035);
        const w1 = roadTopW + (roadBottomW - roadTopW) * t;
        const w2 = roadTopW + (roadBottomW - roadTopW) * Math.min(1, t + 0.035);
        const dash = (t * 14 + this.roadOffset * 0.04) % 1;
        if (dash < 0.55) {
          g.lineBetween(cx + frac * (w1 / 2), y1, cx + frac * (w2 / 2), y2);
        }
      }
    };
    drawLane(-0.33);
    drawLane(0.33);
  }

  private scrollParallax(dt: number) {
    const base = this.speed * dt * 0.12;
    this.parallaxFar.x -= base * 0.3;
    this.parallaxMid.x -= base * 0.55;
    this.parallaxNear.x -= base * 0.9;
    if (this.parallaxFar.x < -52) this.parallaxFar.x += 52;
    if (this.parallaxMid.x < -68) this.parallaxMid.x += 68;
    if (this.parallaxNear.x < -95) this.parallaxNear.x += 95;
  }

  private updateSpeedLines(speedFactor: number, dt: number) {
    const show = speedFactor > 0.5;
    for (const line of this.speedLines) {
      if (!show) {
        line.setVisible(false);
        continue;
      }
      line.setVisible(true);
      line.y += this.speed * dt * 0.75;
      line.setAlpha(0.08 + speedFactor * 0.18);
      if (line.y > CONFIG.VIEW_HEIGHT) {
        line.y = 180 + rand(0, 100);
        line.x = rand(40, CONFIG.VIEW_WIDTH - 40);
      }
    }
  }

  private updateRain(dt: number) {
    const world = WORLDS.find((w) => w.id === this.worldId);
    if (!world || world.weather !== 'evening') {
      for (const d of this.rainDrops) d.setVisible(false);
      return;
    }
    if (this.rainDrops.length === 0) {
      for (let i = 0; i < 28; i++) {
        this.rainDrops.push(
          this.add
            .rectangle(
              Math.random() * CONFIG.VIEW_WIDTH,
              Math.random() * CONFIG.VIEW_HEIGHT,
              2,
              10,
              0xaaccff,
              0.3,
            )
            .setDepth(19),
        );
      }
    }
    for (const d of this.rainDrops) {
      d.setVisible(true);
      d.y += 380 * dt;
      d.x -= 35 * dt;
      if (d.y > CONFIG.VIEW_HEIGHT) {
        d.y = -10;
        d.x = Math.random() * CONFIG.VIEW_WIDTH;
      }
    }
  }
}
