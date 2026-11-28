import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { C } from './config';
import type { Assets } from './assets';

type Anim = 'run' | 'idle' | 'jump' | 'fall' | 'slide' | 'die';
const MODEL_DIR = 'models/boy/';
const MIXAMO_DIR = 'models/mixamo/';
const KID_DIR = 'models/kid/';

interface CharacterSet {
  dir: string;
  main: string; // skinned character file
  mainHasRun: boolean; // true: main file also holds the run clip
  clips: Array<[Anim, string]>; // animation-only files (same Mixamo rig)
  texture?: string; // forced diffuse texture (file inside dir)
  jumpLand?: number; // fraction of the jump clip at which the feet touch down
  dieStart?: number; // seconds to skip in the die clip (skip the walking part)
  flattenJump?: boolean; // remove hips rise from the jump clip (game moves the body)
}

// Ch46 (Mixamo) is tried first, then the kid, then the old Mixamo character.
const SETS: CharacterSet[] = [
  {
    dir: 'models/ch46/',
    main: 'Character.fbx',
    mainHasRun: false,
    texture: 'diffuse.jpg',
    jumpLand: 0.73,
    dieStart: 1.0,
    flattenJump: true,
    clips: [
      ['run', 'Run.fbx'],
      ['idle', 'Idle.fbx'],
      ['jump', 'Jump.fbx'],
      ['slide', 'Slide.fbx'],
      ['die', 'Die.fbx'],
    ],
  },
  {
    dir: KID_DIR,
    main: 'Running.fbx',
    mainHasRun: true,
    texture: 'kid_atlas.jpg',
    dieStart: 1.0,
    clips: [
      ['idle', 'Idle.fbx'],
      ['jump', 'Running_Jump.fbx'],
      ['slide', 'Running_Slide.fbx'],
      ['die', 'Walking_To_Dying.fbx'],
    ],
  },
  {
    dir: MIXAMO_DIR,
    main: 'Running.fbx',
    mainHasRun: true,
    clips: [
      ['idle', 'Idle.fbx'],
      ['jump', 'Jumping.fbx'],
      ['fall', 'Falling.fbx'],
      ['slide', 'Running_Slide.fbx'],
      ['die', 'Dying.fbx'],
    ],
  },
];
const AIR_TIME = (2 * C.JUMP_V) / C.GRAVITY;

/**
 * The player character. Loads the Ch46 Mixamo character (public/models/ch46/) with separate animation-only FBX clips;
 * falls back to the kid (public/models/kid/) and then the old Mixamo character.
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
  private jumpLand = 1;
  private dieStart = 0;

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

    for (const set of SETS) {
      let main: THREE.Group;
      try {
        main = await fbx.loadAsync(`${set.dir}${set.main}`);
        console.info(`[Player] Loaded character: ${set.dir}${set.main}`);
      } catch (err) {
        console.warn(`[Player] Character set ${set.dir} unavailable, trying next`, err);
        continue;
      }

      try {
        let tex: THREE.Texture | undefined;
        if (set.texture) {
          try {
            tex = await new THREE.TextureLoader().loadAsync(`${set.dir}${set.texture}`);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 16;
          } catch (texErr) {
            console.warn('[Player] Character texture failed to load', texErr);
          }
        }

        this.setupFbx(main, tex);
        this.mixer = new THREE.AnimationMixer(main);
        this.jumpLand = set.jumpLand ?? 1;
        this.dieStart = set.dieStart ?? 0;

        const register = (name: Anim, clip: THREE.AnimationClip) => {
          clip.name = name;
          // Mixamo clips can carry forward root motion; keep the body in place.
          this.lockRoot(clip, name !== 'idle', name === 'jump' && !!set.flattenJump);
          this.actions[name] = this.mixer!.clipAction(clip);
        };

        // Older sets: the main file also contains the run clip.
        if (set.mainHasRun) {
          const runClip = this.pickClip(main.animations);
          if (runClip) register('run', runClip);
        }

        // Every other clip comes from its own file and must share the same Mixamo rig.
        const loaded = await Promise.allSettled(
          set.clips.map(async ([name, file]) => {
            const animationModel = await fbx.loadAsync(`${set.dir}${file}`);
            const clip = this.pickClip(animationModel.animations);
            if (!clip || !this.mixer) {
              throw new Error(`No animation clip found in ${file}`);
            }
            register(name, clip);
            return name;
          }),
        );

        loaded.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`[Player] Animation failed: ${set.clips[index][1]}`, result.reason);
          }
        });

        if (!this.actions.run) throw new Error('run animation missing');

        this.animated = !!this.actions.run;
        console.info('[Player] Animations ready:', Object.keys(this.actions).join(', '));
        this.setMenu();
        return;
      } catch (err) {
        console.error(`[Player] Setup of ${set.dir} failed; trying next set`, err);
        this.visual.clear();
        this.mixer = undefined;
        this.actions = {};
        this.animated = false;
      }
    }

    // Nothing worked: static boy.obj / capsule fallback
    await this.loadFallback();
    this.setMenu();
  }

  /** Mixamo exports contain a dummy "Take 001" stack: use the clip that really has motion. */
  private pickClip(clips: THREE.AnimationClip[]): THREE.AnimationClip | undefined {
    let best: THREE.AnimationClip | undefined;
    for (const c of clips) {
      if (!best || c.tracks.length > best.tracks.length) best = c;
    }
    return best && best.tracks.length > 0 ? best : undefined;
  }

  /**
   * Keep the Hips in place: remove forward/sideways drift (root motion) from a clip.
   * flattenY also removes the hips rise (used for jump, the game moves the body itself).
   */
  private lockRoot(clip: THREE.AnimationClip, lockXZ = true, flattenY = false) {
    for (const tr of clip.tracks) {
      if (!tr.name.endsWith('.position') || !/Hips/i.test(tr.name)) continue;
      const v = tr.values;
      const x0 = v[0];
      const y0 = v[1];
      const z0 = v[2];
      for (let i = 0; i < v.length; i += 3) {
        if (lockXZ) {
          v[i] = x0;
          v[i + 2] = z0;
        }
        if (flattenY) v[i + 1] = y0;
      }
    }
  }

  private setupFbx(obj: THREE.Group, forceMap?: THREE.Texture) {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const h = Math.max(0.001, box.max.y - box.min.y);
    const s = C.VISUAL_H / h;
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
        if (forceMap) {
          m.map = forceMap;
          m.normalMap = null;
          m.specularMap = null;
          m.specular?.set(0x111111);
          m.shininess = 8;
        } else if (!m.map) m.map = this.assets.boy;
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
    this.play('jump', true, AIR_TIME / this.jumpLand);
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
    this.mixer?.stopAllAction();
    this.resetPose();
    if (this.actions.idle) this.play('idle');
    else if (this.actions.run) this.play('run');
  }

  startRun() {
    this.running = true;
    this.alive = true;
    this.yawTarget = Math.PI; // model faces +Z, game runs towards -Z
    this.current = undefined;
    this.mixer?.stopAllAction();
    this.resetPose();
    this.play('run');
  }

  private play(name: Anim, once = false, fitSeconds?: number) {
    if (!this.mixer) return;
    const a = this.actions[name];
    if (!a) return;
    if (this.current === name && !once) return;
    a.reset();
    a.enabled = true;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    a.timeScale = fitSeconds ? a.getClip().duration / fitSeconds : name === 'die' ? 1.15 : 1;
    if (name === 'die' && this.dieStart > 0) a.time = this.dieStart;
    for (const k of Object.keys(this.actions) as Anim[]) {
      const other = this.actions[k];
      if (other && other !== a) other.fadeOut(0.12);
    }
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
      if (this.y > 0.15 && this.vy < -1 && this.alive && this.current !== 'fall') {
        this.play('fall');
      }
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
        if (a) a.timeScale = THREE.MathUtils.clamp(speed / 20, 1.0, 1.5);
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
