import * as THREE from 'three';
import { C } from './config';
import type { Assets } from './assets';
import { World } from './world';
import { Spawner } from './spawner';
import { Player, CHARACTERS } from './player';
import { audio } from './audio';
import { loadSave, writeSave } from './save';

type State = 'menu' | 'run' | 'dead';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private spawner: Spawner;
  private player: Player;
  private clock = new THREE.Clock();
  private pr = 1;
  private invuln = 0;
  private stumbleT = 0;
  private slowT = 0;
  private slowN = 0;
  private buf: 'jump' | 'slide' | null = null;
  private bufT = 0;
  private tmpPos = new THREE.Vector3();
  private tmpLook = new THREE.Vector3();

  private state: State = 'menu';
  private paused = false;
  private dist = 0;
  private speed = 0;
  private elapsed = 0;
  private coinsRun = 0;
  private score = 0;
  private save = loadSave();
  private shake = 0;
  private deadT = 0;
  private hudT = 0;
  private camPos = new THREE.Vector3(1.2, 1.6, 4.2);
  private camLook = new THREE.Vector3(0, 1.0, 0);

  constructor(private host: HTMLElement, assets: Assets) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.pr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(this.pr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false; // real-time shadows were the biggest slowdown; the player keeps a blob shadow
    host.appendChild(this.renderer.domElement);

    // sharper textures at grazing angles (tracks, ground, buildings)
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    for (const t of Object.values(assets)) if (t instanceof THREE.Texture) t.anisotropy = maxAniso;

    const sky = new THREE.Color(0xd6ebff);
    this.scene.background = this.makeSky();
    this.scene.fog = new THREE.Fog(sky, 40, 118);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xa59270, 1.3));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
    sun.position.set(-10, 18, -17);
    sun.target.position.set(0, 0, -25);
    this.scene.add(sun, sun.target);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 140);
    this.world = new World(assets);
    this.scene.add(this.world.root);
    this.spawner = new Spawner(this.scene, assets);
    this.spawner.onHorn = () => audio.horn();
    this.player = new Player(assets);
    this.player.addTo(this.scene);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.bindInput();
    this.bindUi();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'run' && !this.paused) this.setPaused(true);
    });
  }

  async init() {
    await this.player.load(this.save.char);
    this.showCharName();
    // build every material once now, so the first train/barrier doesn't freeze the game mid-run
    this.spawner.prewarm();
    this.renderer.compile(this.scene, this.camera);
    this.spawner.reset();
    this.refreshMenu();
  }

  run() {
    this.clock.start();
    const loop = () => {
      requestAnimationFrame(loop);
      const raw = this.clock.getDelta();
      const dt = Math.min(0.05, raw);
      this.adapt(raw);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  // -------------------------------------------------------------- setup

  private makeSky() {
    const cv = document.createElement('canvas');
    cv.width = 4;
    cv.height = 256;
    const c = cv.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#4f9fe8');
    g.addColorStop(0.55, '#9fd0f5');
    g.addColorStop(1, '#d6ebff');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /** If the phone is struggling, lower the render resolution automatically. */
  private adapt(raw: number) {
    if (this.state !== 'run' || this.pr <= 0.75) return;
    this.slowT += raw;
    if (++this.slowN < 90) return;
    if (this.slowT / this.slowN > 0.026) {
      this.pr = Math.max(0.75, this.pr - 0.25);
      this.renderer.setPixelRatio(this.pr);
      this.resize();
    }
    this.slowT = 0;
    this.slowN = 0;
  }

  private resize() {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 68 : 55;
    this.camera.updateProjectionMatrix();
  }

  private bindInput() {
    window.addEventListener('keydown', (e) => {
      audio.unlock();
      if (e.repeat) return;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.act('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.act('right');
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          this.act('jump');
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.act('slide');
          break;
        case 'KeyP':
        case 'Escape':
          if (this.state === 'run') this.setPaused(!this.paused);
          break;
        case 'Enter':
          if (this.state === 'menu') this.startGame();
          else if (this.state === 'dead' && this.deadT > 1) this.startGame();
          break;
      }
    });

    // swipe: triggers as soon as the finger has moved far enough, then re-arms
    const el = this.renderer.domElement;
    let sx = 0;
    let sy = 0;
    let down = false;
    let fired = false;
    el.addEventListener('pointerdown', (e) => {
      audio.unlock();
      down = true;
      fired = false;
      sx = e.clientX;
      sy = e.clientY;
    });
    el.addEventListener('pointermove', (e) => {
      if (!down || fired) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      fired = true; // one swipe = one move (lift your finger for the next one)
      if (Math.abs(dx) > Math.abs(dy)) this.act(dx > 0 ? 'right' : 'left');
      else this.act(dy > 0 ? 'slide' : 'jump');
    });
    const up = () => (down = false);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  private bindUi() {
    $('playBtn').onclick = () => {
      if (this.picking) return; // character still loading
      audio.unlock();
      this.startGame();
    };
    $('retryBtn').onclick = () => this.startGame();
    $('homeBtn').onclick = () => this.toMenu();
    $('pauseBtn').onclick = () => this.setPaused(true);
    $('resumeBtn').onclick = () => this.setPaused(false);
    $('quitBtn').onclick = () => {
      this.setPaused(false);
      this.toMenu();
    };
    const pick = async (d: number) => {
      if (this.state !== 'menu' || this.picking) return;
      this.picking = true;
      const i = CHARACTERS.findIndex((c) => c.id === this.player.charId);
      const next = CHARACTERS[(i + d + CHARACTERS.length) % CHARACTERS.length];
      $('charName').textContent = 'Loading...';
      try {
        await this.player.select(next.id);
        this.save.char = this.player.charId;
        writeSave(this.save);
      } finally {
        this.picking = false;
        this.showCharName();
      }
    };
    $('charPrev').onclick = () => pick(-1);
    $('charNext').onclick = () => pick(1);
    const mute = $('muteBtn');
    mute.onclick = () => {
      audio.unlock();
      audio.setMuted(!audio.muted);
      mute.textContent = audio.muted ? 'Sound: OFF' : 'Sound: ON';
    };
  }

  // -------------------------------------------------------------- state

  private act(a: 'left' | 'right' | 'jump' | 'slide') {
    if (this.state !== 'run' || this.paused) return;
    let ok = false;
    if ((a === 'jump' || a === 'slide') && !(a === 'jump' ? this.player.canJump() : this.player.canSlide())) {
      this.buf = a; // remember the swipe for a moment (Subway Surfers style input buffer)
      this.bufT = 0.18;
    }
    if (a === 'left') ok = this.player.moveLeft();
    else if (a === 'right') ok = this.player.moveRight();
    else if (a === 'jump') {
      ok = this.player.jump();
      if (ok) audio.jump();
      return;
    } else {
      ok = this.player.slide();
      if (ok) audio.slide();
      return;
    }
    if (ok) audio.swish();
  }

  private show(id: string, on: boolean) {
    $(id).classList.toggle('hidden', !on);
  }

  private picking = false;
  private showCharName() {
    $('charName').textContent = CHARACTERS.find((c) => c.id === this.player.charId)?.name ?? '';
  }

  private refreshMenu() {
    $('menuBest').textContent = String(this.save.best);
    $('menuCoins').textContent = String(this.save.coins);
  }

  private startGame() {
    this.spawner.reset();
    this.dist = 0;
    this.elapsed = 0;
    this.speed = C.BASE_SPEED * 0.7;
    this.coinsRun = 0;
    this.score = 0;
    this.shake = 0;
    this.deadT = 0;
    this.paused = false;
    this.buf = null;
    this.invuln = 0;
    this.stumbleT = 0;
    this.player.setMenu();
    this.player.startRun();
    this.state = 'run';
    this.show('menu', false);
    this.show('over', false);
    this.show('pause', false);
    this.show('hud', true);
    this.updateHud(true);
    audio.unlock();
    audio.startMusic();
  }

  private toMenu() {
    this.spawner.reset();
    this.player.setMenu();
    this.state = 'menu';
    this.paused = false;
    audio.stopMusic();
    this.show('hud', false);
    this.show('over', false);
    this.show('pause', false);
    this.show('menu', true);
    this.refreshMenu();
  }

  private setPaused(p: boolean) {
    if (this.state !== 'run') return;
    this.paused = p;
    this.show('pause', p);
    if (!p) this.clock.getDelta();
  }

  private crash() {
    this.state = 'dead';
    this.deadT = 0;
    this.shake = 0.5;
    this.player.die();
    audio.stopMusic();
    audio.crash();
    this.save.coins += this.coinsRun;
    if (this.score > this.save.best) this.save.best = this.score;
    writeSave(this.save);
  }

  // ------------------------------------------------------------- update

  private update(dt: number) {
    if (this.state === 'run' && !this.paused) {
      this.elapsed += dt;
      const ramp = Math.min(1, this.elapsed / 3);
      const base = Math.min(C.MAX_SPEED, C.BASE_SPEED + this.elapsed * C.RAMP);
      this.speed = base * (0.7 + 0.3 * ramp);
      const dz = this.speed * dt;
      this.dist += dz;
      this.world.update(dz);
      this.spawner.update(dz, dt, this.dist, this.speed);
      this.player.update(dt, this.speed);
      if (this.buf) {
        this.bufT -= dt;
        if (this.bufT <= 0) this.buf = null;
        else if (this.buf === 'jump' ? this.player.canJump() : this.player.canSlide()) {
          const b = this.buf;
          this.buf = null;
          this.act(b);
        }
      }

      const h = this.player.hitHeight;
      const got = this.spawner.collect(this.player.x, this.player.y, h);
      if (got > 0) {
        this.coinsRun += got;
        audio.coin();
      }
      this.score = Math.floor(this.dist) + this.coinsRun * 10;
      this.invuln = Math.max(0, this.invuln - dt);
      this.stumbleT = Math.max(0, this.stumbleT - dt);
      const hit = this.invuln <= 0 ? this.spawner.collides(this.player.x, this.player.y, h) : null;
      if (hit) {
        // Subway Surfers rule: scraping the SIDE of something while changing lane = stumble (go back, keep running).
        // Running into the FRONT of a train / barrier, or a second hit within 5 s, ends the run.
        const front = hit.pz + hit.len / 2; // end of the obstacle that faces the player (one frame ago)
        const alongside = front > C.PLAYER_HD + 0.6; // its front had already passed the player: a side scrape
        const side = alongside && this.player.laneOffset() > 0.45 && this.player.prevLane !== this.player.lane;
        if (side && this.stumbleT <= 0) {
          this.player.bounce();
          this.stumbleT = 5;
          this.invuln = 0.4;
          this.shake = 0.3;
          audio.swish();
        } else this.crash();
      }
      this.hudT -= dt;
      if (this.hudT <= 0) this.updateHud();
    } else if (this.state === 'dead') {
      this.deadT += dt;
      this.speed *= Math.exp(-dt * 6);
      const dz = this.speed * dt;
      this.world.update(dz);
      this.spawner.update(dz, dt, this.dist, 0);
      this.player.update(dt, 0);
      if (this.deadT > 1.0 && $('over').classList.contains('hidden')) this.showGameOver();
    } else if (this.state === 'menu') {
      this.spawner.update(0, dt, 0, 0); // side trains keep passing behind the menu
      this.player.update(dt, 0);
    }
    this.updateCamera(dt);
  }

  private updateHud(force = false) {
    this.hudT = 0.08;
    $('score').textContent = String(this.score).padStart(6, '0');
    $('coins').textContent = String(this.coinsRun);
    if (force) $('score').textContent = '000000';
  }

  private showGameOver() {
    $('overScore').textContent = String(this.score);
    $('overBest').textContent = String(this.save.best);
    $('overCoins').textContent = String(this.coinsRun);
    $('newBest').classList.toggle('hidden', this.score < this.save.best || this.score === 0);
    this.show('hud', false);
    this.show('over', true);
  }

  private updateCamera(dt: number) {
    const px = this.player.x;
    const pos = this.tmpPos;
    const look = this.tmpLook;
    if (this.state === 'menu') {
      pos.set(1.1, 1.5, 4.0);
      look.set(0, 1.0, 0);
    } else {
      // Subway-Surfer style chase camera: higher and further back
      pos.set(px * 0.5, 3.5, 6.4);
      look.set(px * 0.35, 1.2, -12);
    }
    const k = 1 - Math.exp(-dt * (this.state === 'menu' ? 4 : 7));
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.5);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
    this.camera.lookAt(this.camLook);
  }
}
