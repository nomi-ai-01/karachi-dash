import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { C } from './config';
import type { Assets } from './assets';

type Anim = 'run' | 'jump' | 'slide' | 'die' | 'idle';
const MODEL_DIR = 'models/boy/';
const AIR_TIME = (2 * C.JUMP_V) / C.GRAVITY;

/**
 * The boy. Loads Mixamo FBX animations (run/jump/slide/die/idle .fbx in public/models/boy/).
 * Falls back to the static boy.obj (procedural pose) and finally to a simple capsule figure.
 */
export class Player {
  readonly root = new THREE.Group(); // gameplay position
  private visual = new THREE.Group(); // model + yaw/pose
  private shadow: THREE.Mesh;

  lane = 1;
  x = 0;
  y = 0;
  vy = 0;
  slideT = 0;
  alive = true;
  private pendingSlide = false;

  private mixer?: THREE.AnimationMixer;
  private actions: Partial<Record<Anim, THREE.AnimationAction>> = {};
  private current?: Anim;
  private animated = false;
  private yawTarget = 0.5;
  private t = 0;
  private running = false;

  constructor(private assets: Assets) {
    this.root.add(this.visual);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.32; // sits on the sleepers
    this.visual.rotation.y = this.yawTarget;
  }

  get hitHeight() {
    return this.slideT > 0 ? C.SLIDE_H : C.PLAYER_H;
  }

  async load() {
    const fbx = new FBXLoader();
    let main: THREE.Group | null = null;
    try {
      main = await fbx.loadAsync(MODEL_DIR + 'run.fbx');
    } catch {
      main = null;
    }
    if (main) {
      try {
        this.setupFbx(main);
      const clips: Partial<Record<Anim, THREE.AnimationClip>> = {};
      if (main.animations[0]) clips.run = main.animations[0];
      this.mixer = new THREE.AnimationMixer(main);
      if (clips.run) {
        clips.run.name = 'run';
        this.actions.run = this.mixer.clipAction(clips.run);
      }
      // the other animations load in the background so the game starts after run.fbx only
      for (const name of ['idle', 'jump', 'slide', 'die'] as Anim[]) {
        fbx
          .loadAsync(`${MODEL_DIR}${name}.fbx`)
          .then((f) => {
            if (!f.animations[0] || !this.mixer) return;
            f.animations[0].name = name;
            this.actions[name] = this.mixer.clipAction(f.animations[0]);
            if (name === 'idle' && !this.running && !this.current) this.play('idle');
          })
          .catch(() => {
            /* optional */
          });
      }
      this.animated = !!this.actions.run;
      console.info('[Player] FBX animations loaded:', Object.keys(this.actions).join(', '));
      } catch (err) {
        console.error('[Player] FBX setup failed, using static boy', err);
        this.visual.clear();
        this.mixer = undefined;
        this.actions = {};
        this.animated = false;
        await this.loadFallback();
      }
    } else {
      await this.loadFallback();
    }
    this.setMenu();
  }

  private setupFbx(obj: THREE.Group) {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const h = Math.max(0.001, box.max.y - box.min.y);
    const s = C.PLAYER_H / h;
    obj.scale.multiplyScalar(s);
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    obj.position.y -= box2.min.y;
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats as THREE.MeshPhongMaterial[]) {
        if (!m.map) m.map = this.assets.boy;
        m.color?.set(0xffffff);
        m.needsUpdate = true;
      }
    });
    this.visual.add(obj);
  }

  private async loadFallback() {
    try {
      const obj = await new OBJLoader().loadAsync(MODEL_DIR + 'boy.obj');
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.material = new THREE.MeshLambertMaterial({ map: this.assets.boy });
      });
      this.visual.add(obj);
      console.info('[Player] Using static boy.obj (add Mixamo FBX files for animation)');
    } catch {
      const mat = new THREE.MeshLambertMaterial({ color: 0xf3f1e4 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 10), mat);
      body.position.y = 1.0;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), new THREE.MeshLambertMaterial({ color: 0xb98462 }));
      head.position.y = 1.55;
      this.visual.add(body, head);
    }
  }

  // ----------------------------------------------------------- controls

  moveLeft() {
    return this.shift(-1);
  }
  moveRight() {
    return this.shift(1);
  }
  private shift(d: number) {
    if (!this.alive || !this.running) return false;
    const n = Math.max(0, Math.min(2, this.lane + d));
    if (n === this.lane) return false;
    this.lane = n;
    return true;
  }

  jump() {
    if (!this.alive || !this.running || this.y > 0.001) return false;
    this.vy = C.JUMP_V;
    this.slideT = 0;
    this.pendingSlide = false;
    this.play('jump', true, AIR_TIME);
    return true;
  }

  slide() {
    if (!this.alive || !this.running) return false;
    if (this.y > 0.001) {
      this.vy = -22; // fast fall, slide on landing
      this.pendingSlide = true;
      return true;
    }
    this.startSlide();
    return true;
  }

  private startSlide() {
    this.slideT = C.SLIDE_T;
    this.pendingSlide = false;
    this.play('slide', true, C.SLIDE_T);
  }

  die() {
    this.alive = false;
    this.slideT = 0;
    this.play('die', true);
  }

  setMenu() {
    this.running = false;
    this.alive = true;
    this.lane = 1;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.slideT = 0;
    this.yawTarget = 0.5;
    this.current = undefined;
    this.resetPose();
    if (this.actions.idle) this.play('idle');
    else if (this.actions.run) this.play('run');
  }

  startRun() {
    this.running = true;
    this.alive = true;
    this.yawTarget = Math.PI; // model faces +Z, game runs towards -Z
    this.current = undefined;
    this.resetPose();
    this.play('run');
  }

  private play(name: Anim, once = false, fitSeconds?: number) {
    if (!this.mixer) return;
    const a = this.actions[name];
    if (!a) return;
    if (this.current === name && !once) return;
    const prev = this.current ? this.actions[this.current] : undefined;
    a.reset();
    a.enabled = true;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    a.timeScale = fitSeconds ? a.getClip().duration / fitSeconds : 1;
    if (prev && prev !== a) prev.fadeOut(0.12);
    a.fadeIn(0.12).play();
    this.current = name;
  }

  // ------------------------------------------------------------- update

  update(dt: number, speed: number) {
    this.t += dt;
    const tx = C.LANES[this.lane];
    this.x += (tx - this.x) * (1 - Math.exp(-dt * 20));

    if (this.y > 0 || this.vy > 0) {
      this.vy -= C.GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        if (this.alive) {
          if (this.pendingSlide) this.startSlide();
          else this.play('run');
        }
      }
    }
    if (this.slideT > 0) {
      this.slideT -= dt;
      if (this.slideT <= 0) {
        this.slideT = 0;
        if (this.alive && this.y === 0) this.play('run');
      }
    }

    this.root.position.set(this.x, this.y, 0);
    this.visual.rotation.z = THREE.MathUtils.clamp((this.x - tx) * 0.1, -0.3, 0.3);
    this.visual.rotation.y += (this.yawTarget - this.visual.rotation.y) * (1 - Math.exp(-dt * 8));

    const sc = THREE.MathUtils.clamp(1 - this.y * 0.25, 0.5, 1);
    this.shadow.scale.setScalar(sc);
    this.shadow.position.set(this.x, 0.32, 0);

    if (this.mixer) {
      if (this.current === 'run') {
        const a = this.actions.run;
        if (a) a.timeScale = THREE.MathUtils.clamp(speed / 18, 0.8, 1.6);
      }
      this.mixer.update(dt);
    }
    if (!this.animated) this.proceduralPose(speed);
  }

  /** Simple pose animation used when no FBX animations are available */
  private proceduralPose(speed: number) {
    const v = this.visual;
    if (!this.running) {
      v.position.y = Math.sin(this.t * 2) * 0.01;
      v.rotation.x = 0;
      return;
    }
    if (!this.alive) {
      v.rotation.x += (-1.4 - v.rotation.x) * 0.2;
      return;
    }
    if (this.slideT > 0) {
      v.rotation.x += (-1.2 - v.rotation.x) * 0.3;
      v.position.y = -0.1;
      return;
    }
    v.rotation.x += (0.12 - v.rotation.x) * 0.2;
    v.position.y = this.y > 0 ? 0 : Math.abs(Math.sin(this.t * (6 + speed * 0.3))) * 0.08;
  }

  resetPose() {
    this.visual.rotation.x = 0;
    this.visual.position.y = 0;
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.root);
    scene.add(this.shadow);
  }
}
