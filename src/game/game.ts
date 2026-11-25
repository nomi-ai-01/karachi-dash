import { GAME_CONFIG } from "./config";

import { Renderer } from "./renderer";
import { InputSystem } from "./input";
import { StorageSystem } from "./storage";

import type {
  GameState,
  Player,
  Obstacle,
  ObstacleType,
  Coin,
  PowerUp,
  PowerUpType,
  Particle,
  ActivePowerUp
} from "./types";

import type { RenderFrame } from "./renderer";

export interface GameSnapshot {
  state: GameState;
  score: number;
  coins: number;
  distance: number;
  highScore: number;
  bestDistance: number;
  totalCoins: number;
  isNewRecord: boolean;
}

export class KarachiDashGame {
  private canvas: HTMLCanvasElement;

  private renderer: Renderer;
  private input: InputSystem;
  private storage: StorageSystem;

  public state: GameState = "menu";

  private player: Player = {
    lane: 1,
    visualLane: 1,
    y: GAME_CONFIG.player.baseY,
    jumpTimer: 0,
    slideTimer: 0,
    invulnerable: 0
  };

  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private powerups: PowerUp[] = [];
  private particles: Particle[] = [];
  private activePowerUps: ActivePowerUp[] = [];

  private score = 0;
  private runCoins = 0;
  private distance = 0;

  private speed = GAME_CONFIG.movement.initialSpeed;

  private elapsed = 0;
  private spawnTimer = 0;

  private message = "";
  private messageTimer = 0;

  private animationTime = 0;

  private lastTime = 0;
  private accumulator = 0;

  private readonly fixedStep = 1 / 60;

  private animationId = 0;
  private running = false;

  private isNewRecord = false;

  private random = Math.random;

  private lastObstacleLane = -1;
  private nearMissCooldown = 0;

  private lastScoreSave = 0;

  private listeners = new Set<
    (snapshot: GameSnapshot) => void
  >();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);
    this.input = new InputSystem(canvas);
    this.storage = new StorageSystem();
  }

  start(): void {
    if (this.running) return;

    this.running = true;

    this.lastTime = performance.now();

    this.animationId = requestAnimationFrame(
      this.loop
    );
  }

  stop(): void {
    this.running = false;

    cancelAnimationFrame(this.animationId);

    this.renderer.destroy();
    this.input.destroy();
  }

  subscribe(
    callback: (snapshot: GameSnapshot) => void
  ): () => void {
    this.listeners.add(callback);

    callback(this.getSnapshot());

    return () => {
      this.listeners.delete(callback);
    };
  }

  getSnapshot(): GameSnapshot {
    const saved = this.storage.getData();

    return {
      state: this.state,
      score: Math.floor(this.score),
      coins: this.runCoins,
      distance: Math.floor(this.distance),
      highScore: saved.highScore,
      bestDistance: saved.bestDistance,
      totalCoins: saved.totalCoins,
      isNewRecord: this.isNewRecord
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  startRun(): void {
    if (this.state === "playing") return;

    this.player = {
      lane: 1,
      visualLane: 1,
      y: GAME_CONFIG.player.baseY,
      jumpTimer: 0,
      slideTimer: 0,
      invulnerable: 0
    };

    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.particles = [];
    this.activePowerUps = [];

    this.score = 0;
    this.runCoins = 0;
    this.distance = 0;

    this.speed = GAME_CONFIG.movement.initialSpeed;

    this.elapsed = 0;
    this.spawnTimer = 0.8;

    this.message = "Chalo! Let's Go!";
    this.messageTimer = 1.3;

    this.nearMissCooldown = 0;
    this.lastObstacleLane = -1;

    this.isNewRecord = false;
    this.lastScoreSave = 0;

    this.state = "playing";

    this.input.setEnabled(true);

    this.notify();
  }

  pause(): void {
    if (this.state !== "playing") return;

    this.state = "paused";

    this.input.setEnabled(false);

    this.notify();
  }

  resume(): void {
    if (this.state !== "paused") return;

    this.state = "playing";

    this.lastTime = performance.now();
    this.accumulator = 0;

    this.input.setEnabled(true);

    this.notify();
  }

  returnToMenu(): void {
    this.state = "menu";

    this.input.setEnabled(false);

    this.notify();
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const frameTime = Math.min(
      (timestamp - this.lastTime) / 1000,
      0.1
    );

    this.lastTime = timestamp;

    if (this.state === "playing") {
      this.accumulator += frameTime;

      while (this.accumulator >= this.fixedStep) {
        this.update(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }
    } else {
      this.animationTime += frameTime;
    }

    this.render();

    this.animationId = requestAnimationFrame(
      this.loop
    );
  };

  private update(dt: number): void {
    if (this.state !== "playing") return;

    this.elapsed += dt;
    this.animationTime += dt;

    this.updateInput();
    this.updateTimers(dt);
    this.updateDifficulty(dt);
    this.updatePlayer(dt);
    this.updateSpawning(dt);
    this.updateWorld(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateNearMiss(dt);
    this.updateMessage(dt);

    if (
      Math.floor(this.elapsed) !==
      this.lastScoreSave
    ) {
      this.lastScoreSave = Math.floor(this.elapsed);
      this.storage.updateDistance(this.distance);
    }
  }

  private updateInput(): void {
    const actions = this.input.consume();

    for (const action of actions) {
      if (this.state !== "playing") break;

      switch (action) {
        case "left":
          this.changeLane(-1);
          break;

        case "right":
          this.changeLane(1);
          break;

        case "jump":
          this.jump();
          break;

        case "slide":
          this.slide();
          break;

        case "pause":
          this.pause();
          break;
      }
    }
  }

  private changeLane(direction: number): void {
    const next = Math.max(
      0,
      Math.min(
        GAME_CONFIG.lanes - 1,
        this.player.lane + direction
      )
    );

    if (next === this.player.lane) return;

    this.player.lane = next;

    this.showMessage(
      direction < 0 ? "Left!" : "Right!",
      0.35
    );

    this.vibrate(12);
  }

  private jump(): void {
    if (
      this.player.jumpTimer > 0 ||
      this.player.slideTimer > 0
    ) {
      return;
    }

    this.player.jumpTimer =
      GAME_CONFIG.player.jumpDuration;

    this.vibrate(18);
  }

  private slide(): void {
    if (
      this.player.slideTimer > 0 ||
      this.player.jumpTimer > 0
    ) {
      return;
    }

    this.player.slideTimer =
      GAME_CONFIG.player.slideDuration;

    this.vibrate(12);
  }

  private updatePlayer(dt: number): void {
    const difference =
      this.player.lane - this.player.visualLane;

    this.player.visualLane +=
      difference *
      Math.min(1, GAME_CONFIG.player.laneChangeSpeed * dt);

    if (Math.abs(difference) < 0.005) {
      this.player.visualLane = this.player.lane;
    }

    this.player.jumpTimer = Math.max(
      0,
      this.player.jumpTimer - dt
    );

    this.player.slideTimer = Math.max(
      0,
      this.player.slideTimer - dt
    );

    this.player.invulnerable = Math.max(
      0,
      this.player.invulnerable - dt
    );
  }

  private updateTimers(dt: number): void {
    this.nearMissCooldown = Math.max(
      0,
      this.nearMissCooldown - dt
    );

    for (const power of this.activePowerUps) {
      power.remaining -= dt;
    }

    this.activePowerUps =
      this.activePowerUps.filter(
        (power) => power.remaining > 0
      );
  }

  private updateDifficulty(dt: number): void {
    const config = GAME_CONFIG.movement;

    if (
      this.elapsed <
      GAME_CONFIG.difficulty.startEasySeconds
    ) {
      return;
    }

    this.speed = Math.min(
      config.maximumSpeed,
      this.speed +
        GAME_CONFIG.movement.acceleration * dt
    );
  }

  private updateSpawning(dt: number): void {
    this.spawnTimer -= dt;

    if (this.spawnTimer > 0) return;

    this.spawnPattern();

    const progress = Math.min(
      1,
      this.elapsed / 150
    );

    const min =
      GAME_CONFIG.movement.obstacleSpawnMin;

    const max =
      GAME_CONFIG.movement.obstacleSpawnMax;

    this.spawnTimer =
      max - progress * (max - min) +
      this.random() * 0.25;
  }

  private spawnPattern(): void {
    const lane = this.chooseSafeObstacleLane();

    const obstacleTypes: ObstacleType[] = [
      "bus",
      "cart",
      "manhole",
      "wire",
      "cricket"
    ];

    const type = obstacleTypes[
      Math.floor(this.random() * obstacleTypes.length)
    ];

    this.spawnObstacle(lane, type);

    this.lastObstacleLane = lane;

    // A coin trail gives the player a reward path.
    if (this.random() < 0.75) {
      const coinLane =
        this.random() < 0.65
          ? (lane + 1 + Math.floor(this.random() * 2)) % 3
          : Math.floor(this.random() * 3);

      this.spawnCoinLine(coinLane, 3);
    }

    if (
      this.elapsed > 20 &&
      this.random() <
      GAME_CONFIG.powerups.spawnChance
    ) {
      this.spawnPowerUp();
    }
  }

  private chooseSafeObstacleLane(): number {
    const choices = [0, 1, 2];

    const available = choices.filter(
      (lane) => lane !== this.lastObstacleLane
    );

    return available[
      Math.floor(this.random() * available.length)
    ];
  }

  private spawnObstacle(
    lane: number,
    type: ObstacleType
  ): void {
    const dimensions = {
      bus: { width: 74, height: 105 },
      cart: { width: 65, height: 65 },
      manhole: { width: 76, height: 48 },
      wire: { width: 80, height: 55 },
      cricket: { width: 35, height: 35 }
    };

    const size = dimensions[type];

    this.obstacles.push({
      lane,
      y: 155,
      type,
      width: size.width,
      height: size.height,
      passed: false
    });
  }

  private spawnCoinLine(
    lane: number,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      this.coins.push({
        lane,
        y: 135 - i * 42,
        collected: false,
        rotation: this.random() * Math.PI
      });
    }
  }

  private spawnPowerUp(): void {
    const types: PowerUpType[] = [
      "magnet",
      "shield",
      "boost",
      "double"
    ];

    const type = types[
      Math.floor(this.random() * types.length)
    ];

    const lane = Math.floor(this.random() * 3);

    this.powerups.push({
      lane,
      y: 150,
      type,
      collected: false
    });
  }

  private updateWorld(dt: number): void {
    let movementSpeed = this.speed;

    if (this.hasPower("boost")) {
      movementSpeed *=
        GAME_CONFIG.powerups.boostMultiplier;
    }

    const travel = movementSpeed * dt;

    this.distance += travel;

    for (const obstacle of this.obstacles) {
      obstacle.y += travel;
    }

    for (const coin of this.coins) {
      coin.y += travel;
    }

    for (const power of this.powerups) {
      power.y += travel;
    }

    this.obstacles = this.obstacles.filter(
      (item) => item.y < 850
    );

    this.coins = this.coins.filter(
      (item) => item.y < 850 && !item.collected
    );

    this.powerups = this.powerups.filter(
      (item) => item.y < 850 && !item.collected
    );
  }

  private checkCollisions(): void {
    this.checkCoinCollisions();
    this.checkPowerUpCollisions();
    this.checkObstacleCollisions();
  }

  private checkCoinCollisions(): void {
    for (const coin of this.coins) {
      if (coin.collected) continue;

      let laneDistance = Math.abs(
        this.player.visualLane - coin.lane
      );

      const coinDistance = Math.abs(
        coin.y - this.player.y
      );

      if (
        this.hasPower("magnet") &&
        coinDistance <
        GAME_CONFIG.coins.magnetRadius
      ) {
        laneDistance *= 0.15;
      }

      const horizontalTolerance =
        this.hasPower("magnet") ? 0.8 : 0.32;

      if (
        laneDistance < horizontalTolerance &&
        coinDistance <
        GAME_CONFIG.coins.pickupRadius
      ) {
        coin.collected = true;

        const multiplier =
          this.hasPower("double") ? 2 : 1;

        this.runCoins += multiplier;

        this.score += 10 * multiplier;

        this.createCoinParticles(
          this.getLanePosition(coin.lane),
          coin.y
        );

        this.showMessage(
          multiplier === 2 ? "DOUBLE COINS!" : "+1 COIN",
          0.45
        );

        this.vibrate(10);
      }
    }
  }

  private checkPowerUpCollisions(): void {
    for (const item of this.powerups) {
      if (item.collected) continue;

      const laneDistance = Math.abs(
        this.player.visualLane - item.lane
      );

      const distance = Math.abs(
        this.player.y - item.y
      );

      if (
        laneDistance < 0.35 &&
        distance < 43
      ) {
        item.collected = true;

        this.activatePowerUp(item.type);

        this.createCoinParticles(
          this.getLanePosition(item.lane),
          item.y
        );

        this.vibrate(30);
      }
    }
  }

  private activatePowerUp(type: PowerUpType): void {
    const duration =
      type === "shield"
        ? GAME_CONFIG.powerups.shieldDuration
        : GAME_CONFIG.powerups.duration;

    this.activePowerUps =
      this.activePowerUps.filter(
        (item) => item.type !== type
      );

    this.activePowerUps.push({
      type,
      remaining: duration
    });

    if (type === "shield") {
      this.player.invulnerable = duration;
    }

    this.showMessage(
      {
        magnet: "COIN MAGNET!",
        shield: "SHIELD ON!",
        boost: "CHAI BOOST!",
        double: "DOUBLE COINS!"
      }[type],
      1.2
    );
  }

  private checkObstacleCollisions(): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.passed) continue;

      const verticalDistance = Math.abs(
        obstacle.y - this.player.y
      );

      if (verticalDistance > 43) continue;

      const laneDistance = Math.abs(
        this.player.visualLane - obstacle.lane
      );

      if (laneDistance > 0.38) continue;

      obstacle.passed = true;

      if (this.player.invulnerable > 0) {
        this.score += 20;

        this.showMessage("ZABARDAST!", 0.7);

        continue;
      }

      const safe =
        (obstacle.type === "manhole" &&
          this.player.jumpTimer > 0.15) ||
        (obstacle.type === "wire" &&
          this.player.slideTimer > 0.12);

      if (safe) {
        this.score += 15;

        this.showMessage("SHABASH!", 0.55);

        this.createCoinParticles(
          this.getLanePosition(obstacle.lane),
          obstacle.y
        );

        continue;
      }

      if (this.hasPower("shield")) {
        this.player.invulnerable = 2;

        this.showMessage("SHIELD SAVED YOU!", 0.8);

        continue;
      }

      if (this.hasPower("boost")) {
        this.score += 25;

        this.showMessage("CHAI POWER!", 0.6);

        continue;
      }

      this.crash();

      return;
    }
  }

  private updateNearMiss(dt: number): void {
    if (this.nearMissCooldown > 0) return;

    for (const obstacle of this.obstacles) {
      if (obstacle.passed) continue;

      const verticalDistance = Math.abs(
        obstacle.y - this.player.y
      );

      const laneDistance = Math.abs(
        this.player.visualLane - obstacle.lane
      );

      if (
        verticalDistance < 65 &&
        laneDistance > 0.38 &&
        laneDistance < 1.1
      ) {
        this.score +=
          GAME_CONFIG.scoring.nearMissBonus;

        this.nearMissCooldown = 0.8;

        this.showMessage("BAL BAL BACHA!", 0.7);

        break;
      }
    }
  }

  private updateScore(dt: number): void {
    this.score +=
      dt *
      this.speed *
      GAME_CONFIG.scoring.distanceMultiplier;

    this.storage.updateDistance(this.distance);
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      particle.life -= dt;

      particle.vy += 90 * dt;
    }

    this.particles = this.particles.filter(
      (particle) => particle.life > 0
    );
  }

  private createCoinParticles(
    x: number,
    y: number
  ): void {
    for (let i = 0; i < 7; i++) {
      const angle =
        (Math.PI * 2 * i) / 7;

      const speed = 45 + this.random() * 70;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45,
        maxLife: 0.45,
        size: 2 + this.random() * 3
      });
    }

    if (
      this.particles.length >
      GAME_CONFIG.effects.particleLimit
    ) {
      this.particles.splice(
        0,
        this.particles.length -
          GAME_CONFIG.effects.particleLimit
      );
    }
  }

  private crash(): void {
    if (this.state !== "playing") return;

    this.state = "gameover";

    this.input.setEnabled(false);

    this.isNewRecord =
      this.storage.updateHighScore(
        Math.floor(this.score)
      );

    this.storage.addCoins(this.runCoins);

    this.storage.updateDistance(this.distance);

    this.showMessage("GAME OVER!", 2);

    this.vibrate(100);

    this.notify();
  }

  private showMessage(
    message: string,
    duration: number
  ): void {
    this.message = message;
    this.messageTimer = duration;
  }

  private updateMessage(dt: number): void {
    if (this.messageTimer <= 0) return;

    this.messageTimer -= dt;

    if (this.messageTimer <= 0) {
      this.message = "";
    }
  }

  private hasPower(type: PowerUpType): boolean {
    return this.activePowerUps.some(
      (power) => power.type === type &&
        power.remaining > 0
    );
  }

  private getLanePosition(lane: number): number {
    return (
      210 +
      (lane - 1) * 95
    );
  }

  private vibrate(duration: number): void {
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(duration);
      }
    } catch {
      // Unsupported haptics are ignored.
    }
  }

  private render(): void {
    const frame: RenderFrame = {
      time: this.animationTime,
      distance: this.distance,
      score: this.score,
      coins: this.runCoins,
      highScore: this.storage.getData().highScore,
      speed: this.speed,

      player: this.player,

      obstacles: this.obstacles,
      coinItems: this.coins,
      powerups: this.powerups,
      particles: this.particles,

      activePowerUps: this.activePowerUps,

      state: this.state,
      message: this.messageTimer > 0
        ? this.message
        : ""
    };

    this.renderer.render(frame);
  }
      }
