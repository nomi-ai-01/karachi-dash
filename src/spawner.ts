import * as THREE from 'three';
import { C } from './config';
import type { Assets, Kit } from './assets';
import { PASS_STYLES, LOCOS, CARS } from './assets';

export type ObstacleKind = 'train' | 'container' | 'low' | 'high';
export type TrainStyle = 'passenger' | 'freight' | 'poly' | 'hs';
const STYLES: TrainStyle[] = ['passenger', 'freight', 'passenger', 'freight', 'poly', 'hs'];

export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  z: number; // centre
  pz: number; // centre one frame ago (swept collision: no tunnelling at low fps)
  len: number;
  hw: number; // half width for collision
  vz: number; // extra speed towards the player (moving trains)
  horned?: boolean;
  y0: number;
  y1: number;
  obj: THREE.Object3D;
}

interface Ambient {
  obj: THREE.Object3D;
  z: number;
  len: number;
  vz: number;
  side: number;
}

interface Coin {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
}

const TRAIN_TEX_M = 11.2; // metres of train covered by one copy of the side texture

export class Spawner {
  obstacles: Obstacle[] = [];
  ambient: Ambient[] = [];
  onHorn: () => void = () => {};
  private ambT = [2, 5];
  coins: Coin[] = [];
  private pool: THREE.Mesh[] = [];
  private cursor = 45;
  private safeLane = 1;
  private trainGeos = new Map<number, THREE.BufferGeometry>();

  private matGreen: THREE.MeshBasicMaterial;
  private matRed: THREE.MeshBasicMaterial;
  private matFront: THREE.MeshBasicMaterial;
  private matContainer: THREE.MeshBasicMaterial;
  private matStripe: THREE.MeshBasicMaterial;
  private matSolidGreen = new THREE.MeshLambertMaterial({ color: 0x14683a, side: THREE.DoubleSide });
  private matRoof = new THREE.MeshLambertMaterial({ color: 0xaab4bb, side: THREE.DoubleSide });
  private matDark = new THREE.MeshLambertMaterial({ color: 0x25282c });
  private matPost = new THREE.MeshLambertMaterial({ color: 0x555b62 });
  private matLamp = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  private lowGeos = {
    post: new THREE.BoxGeometry(0.25, 1.15, 0.25),
    lamp: new THREE.SphereGeometry(0.15, 10, 8),
    bar: new THREE.BoxGeometry(2.6, 0.55, 0.3),
    hpost: new THREE.BoxGeometry(0.3, 3.6, 0.3),
    beam: new THREE.BoxGeometry(2.9, 0.55, 0.35),
    top: new THREE.BoxGeometry(2.9, 0.3, 0.3),
  };
  private contGeos = new Map<number, [THREE.BoxGeometry, THREE.BoxGeometry]>();
  private underGeo = new THREE.BoxGeometry(2.2, 0.5, 1);
  private bogieGeo = new THREE.BoxGeometry(2.1, 0.45, 2.6);
  private frontGeo = new THREE.PlaneGeometry(2.6, 3.0);
  private coinGeo: THREE.CylinderGeometry;
  private coinMats: THREE.Material[];

  private carVariant: THREE.Group[] = [];
  private baseCar?: THREE.Group;
  private kit?: Kit;
  private zl = new Map<string, number>();
  private xl = new Map<string, number>();

  constructor(private scene: THREE.Scene, a: Assets) {
    this.baseCar = a.trainModel;
    this.kit = a.kit;
    a.sideGreen.wrapS = a.sideRed.wrapS = THREE.RepeatWrapping;
    this.matGreen = new THREE.MeshBasicMaterial({ map: a.sideGreen, side: THREE.DoubleSide });
    this.matRed = new THREE.MeshBasicMaterial({ map: a.sideRed, side: THREE.DoubleSide });
    this.matFront = new THREE.MeshBasicMaterial({ map: a.front, transparent: true, alphaTest: 0.5 });
    this.matContainer = new THREE.MeshBasicMaterial({ map: a.container });
    this.matStripe = new THREE.MeshBasicMaterial({ map: a.stripe });
    this.coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24);
    this.coinGeo.rotateX(Math.PI / 2); // cap now faces +Z (towards camera)
    this.coinMats = [
      new THREE.MeshBasicMaterial({ color: 0xd68a00 }),
      new THREE.MeshBasicMaterial({ map: a.coin }),
      new THREE.MeshBasicMaterial({ map: a.coin }),
    ];
  }

  /** Build one of everything off-screen so shaders/geometry upload before the run starts. */
  prewarm() {
    this.addTrain(0, -30, 12, 'passenger', 0);
    this.addTrain(3, -30, 12, 'freight', 0);
    this.addTrain(6, -30, 19.2, 'hs', 0);
    this.addTrain(9, -30, 14.4, 'poly', 0);
    this.addContainer(-3, -30, 6.6);
    this.addLow(0, -50);
    this.addHigh(3, -50);
    this.addCoin(-3, 1, -50);
  }

  reset() {
    for (const o of this.obstacles) this.scene.remove(o.obj);
    for (const c of this.coins) this.freeCoin(c);
    for (const m of this.ambient) this.scene.remove(m.obj);
    this.ambient = [];
    this.ambT = [2, 5];
    this.obstacles = [];
    this.coins = [];
    this.cursor = 45;
    this.safeLane = 1;
  }

  update(dz: number, dt: number, dist: number, speed: number) {
    if (dist >= this.cursor) this.spawnRow(dist, speed);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.pz = o.z;
      o.z += dz + o.vz * dt;
      o.obj.position.z = o.z;
      if (o.vz > 0 && !o.horned && o.z - o.len / 2 > -70) {
        o.horned = true;
        this.onHorn();
      }
      if (o.z - o.len / 2 > 16) {
        this.scene.remove(o.obj);
        this.obstacles.splice(i, 1);
      }
    }
    this.updateAmbient(dz, dt);
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z += dz;
      c.mesh.position.z = c.z;
      c.mesh.rotation.y += dt * 4;
      if (c.z > 12) {
        this.freeCoin(c);
        this.coins.splice(i, 1);
      }
    }
  }

  /** First obstacle that overlaps the player's box (or null). The obstacle's whole path since last frame is tested. */
  collides(px: number, py: number, h: number): Obstacle | null {
    const pHW = C.PLAYER_HW;
    const pHD = C.PLAYER_HD;
    for (const o of this.obstacles) {
      if (Math.abs(px - o.x) >= pHW + o.hw) continue;
      if (py + h <= o.y0 || py >= o.y1) continue;
      const near = Math.max(o.z, o.pz) + o.len / 2;
      const far = Math.min(o.z, o.pz) - o.len / 2;
      if (near <= -pHD || far >= pHD) continue;
      return o;
    }
    return null;
  }

  /** Collect coins touching the player; returns how many were collected */
  collect(px: number, py: number, h: number): number {
    let n = 0;
    const cy = py + h * 0.5;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (Math.abs(c.z) < 0.9 && Math.abs(c.x - px) < 0.9 && Math.abs(c.y - cy) < 1.1) {
        this.freeCoin(c);
        this.coins.splice(i, 1);
        n++;
      }
    }
    return n;
  }

  // ---------------------------------------------------------------- rows

  private spawnRow(dist: number, speed: number) {
    const diff = Math.min(1, dist / 2500);
    const early = dist < 120;
    const r = Math.random();
    const z0 = -C.SPAWN_DIST;
    const lanes = this.shuffle([0, 1, 2]);
    let rowLen = 4;

    if (early ? r < 0.5 : r < 0.16) {
      // plain coin line
      const l = lanes[0];
      this.coinLine(C.LANES[l], 0.9, 8, 2.2, z0);
      rowLen = 8 * 2.2;
    } else if (early ? true : r < 0.3) {
      // low barriers (jump)
      const n = diff > 0.3 && Math.random() < 0.4 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = C.LANES[lanes[k]];
        this.addLow(x, z0 - 0.3);
        this.coinArc(x, z0 - 0.3);
      }
      this.coinLine(C.LANES[lanes[2]], 0.9, 5, 2.2, z0);
      rowLen = 8;
    } else if (r < 0.38) {
      // high barriers (slide)
      const n = diff > 0.3 && Math.random() < 0.4 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = C.LANES[lanes[k]];
        this.addHigh(x, z0 - 0.3);
        this.coinLine(x, 0.6, 4, 1.6, z0 + 3);
      }
      rowLen = 8;
    } else {
      // blocking trains / containers: always leave one reachable free lane
      const isContainer = r >= 0.93;
      const n = diff > 0.1 && Math.random() < 0.6 ? 2 : 1;
      const cand = [0, 1, 2].filter((l) => Math.abs(l - this.safeLane) <= 1);
      const free = cand[Math.floor(Math.random() * cand.length)];
      let blocked = [0, 1, 2].filter((l) => l !== free);
      if (n === 1) blocked = [blocked[Math.floor(Math.random() * 2)]];
      rowLen = 0;
      for (const l of blocked) {
        const style = STYLES[Math.floor(Math.random() * STYLES.length)];
        const len = isContainer ? 6.6 : this.lenFor(style, false);
        rowLen = Math.max(rowLen, len);
        const lx = C.LANES[l];
        if (isContainer) this.addContainer(lx, z0 - len / 2, len);
        else {
          // moving trains rush towards the player, only in lanes with nothing ahead
          // (a lot of trains just stand still, only some rush at the player)
          const vz = 11 + Math.random() * 5 + diff * 6;
          const moving = dist > 50 && this.canRush(lx, vz, speed) && Math.random() < Math.min(0.5, 0.25 + diff * 0.25);
          if (moving) {
            const mlen = this.lenFor(style, true);
            this.addTrain(lx, z0 - mlen / 2, mlen, style, vz);
          } else this.addTrain(lx, z0 - len / 2, len, style, 0);
        }
      }
      const freeLanes = [0, 1, 2].filter((l) => !blocked.includes(l));
      const coinLane = freeLanes.includes(free) ? free : freeLanes[0];
      this.coinLine(C.LANES[coinLane], 0.9, Math.max(6, Math.floor(rowLen / 2.2)), 2.2, z0);
      this.safeLane = coinLane;
    }

    const gap = Math.max(14, speed * (0.9 - 0.25 * diff));
    this.cursor = dist + rowLen + gap;
  }

  /** A rushing train may only spawn if it can never catch an obstacle ahead of it in the same lane */
  private canRush(lx: number, vz: number, speed: number) {
    for (const o of this.obstacles) {
      if (o.x !== lx) continue;
      const farEnd = o.z - o.len / 2;
      const closing = vz - o.vz;
      if (closing <= 0) continue;
      const tCatch = (farEnd + C.SPAWN_DIST) / closing;
      const tLeave = (16 - farEnd) / (speed + o.vz);
      if (tCatch <= tLeave) return false;
    }
    return true;
  }

  private shuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ------------------------------------------------------------ builders

  /** Train body with chamfered (rounded-looking) roof corners, like the painted engine front */
  private trainGeo(len: number) {
    let g = this.trainGeos.get(len);
    if (g) return g;
    const prof: [number, number][] = [
      [1.3, 0],
      [1.3, 2.55],
      [1.0, 2.85],
      [0.8, 3.0],
      [-0.8, 3.0],
      [-1.0, 2.85],
      [-1.3, 2.55],
      [-1.3, 0],
    ];
    const rep = Math.max(1, Math.round(len / TRAIN_TEX_M));
    const h = len / 2;
    const pos: number[] = [];
    const uv: number[] = [];
    const quad = (a: [number, number], b: [number, number]) => {
      const va = a[1] / 3.0;
      const vb = b[1] / 3.0;
      pos.push(a[0], a[1], -h, b[0], b[1], -h, b[0], b[1], h, a[0], a[1], -h, b[0], b[1], h, a[0], a[1], h);
      uv.push(0, va, 0, vb, rep, vb, 0, va, rep, vb, rep, va);
    };
    for (const i of [0, 1, 2, 4, 5, 6]) quad(prof[i], prof[i + 1]); // painted walls + chamfers
    quad(prof[3], prof[4]); // roof
    const cap = (z: number) => {
      for (let i = 0; i < prof.length; i++) {
        const p = prof[i];
        const q = prof[(i + 1) % prof.length];
        pos.push(0, 1.5, z, p[0], p[1], z, q[0], q[1], z);
        uv.push(0, 0, 0, 0, 0, 0);
      }
    };
    cap(h);
    cap(-h);
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.addGroup(0, 36, 0); // walls
    g.addGroup(36, 6, 1); // roof
    g.addGroup(42, 24, 2); // front cap
    g.addGroup(66, 24, 3); // back cap
    g.computeVertexNormals();
    this.trainGeos.set(len, g);
    return g;
  }

  /** Green or red version of the carriage model (only the body paint changes). */
  private carOf(red: boolean): THREE.Group | undefined {
    if (!this.baseCar) return undefined;
    const key = red ? 1 : 0;
    if (this.carVariant[key]) return this.carVariant[key];
    const v = this.baseCar.clone(true);
    const cache = new Map<THREE.Material, THREE.Material>();
    v.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const list = Array.isArray(m.material) ? m.material : [m.material];
      const out = list.map((mt) => {
        let c = cache.get(mt);
        if (!c) {
          c = mt.clone();
          if (c.name === 'Cream') (c as THREE.MeshStandardMaterial).color.set(red ? 0xc23b2e : 0x1f8a4c);
          cache.set(mt, c);
        }
        return c;
      });
      m.material = Array.isArray(m.material) ? out : out[0];
    });
    this.carVariant[key] = v;
    return v;
  }

  private dims(name: string) {
    let v = this.zl.get(name);
    if (v === undefined) {
      const bb = new THREE.Box3().setFromObject(this.kit!.parts[name]);
      v = Math.max(0.1, bb.max.z - bb.min.z);
      this.zl.set(name, v);
      this.xl.set(name, Math.max(0.1, bb.max.x - bb.min.x));
    }
    return { z: v, x: this.xl.get(name)! };
  }

  private zLen(name: string) {
    return this.dims(name).z;
  }

  private has(name: string) {
    return !!this.kit?.parts[name];
  }

  /** train lengths that look right for each style (unit = one 4.8 m kit carriage) */
  private lenFor(style: TrainStyle, moving: boolean) {
    const U = 4.8;
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    if (style === 'hs' && this.has('x-hs')) return pick(moving ? [3 + 1, 3 + 2] : [3 + 1, 3 + 2, 3 + 3]) * U; // nose = 3 units
    if (style === 'poly' && this.has('x-poly')) return pick(moving ? [3, 5] : [3, 5, 7]) * U; // loco 1 + cars of 2
    return moving ? pick([10, 12, 14]) : pick([12, 16, 20]);
  }

  /** Train built from light pieces. Pieces are listed rear -> front (the front faces +z, towards the player). */
  private kitTrain(len: number, style: TrainStyle) {
    const k = this.kit!;
    const U = 4.8;
    const pieces: { name: string; w: number }[] = [];
    const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const ok = (names: string[]) => names.filter((n) => k.parts[n]);

    if (style === 'hs' && this.has('x-hs')) {
      const n = Math.max(1, Math.round(len / U - 3));
      const cars = ok(['train-electric-bullet-b', 'train-electric-bullet-c']);
      for (let i = 0; i < n; i++) pieces.push({ name: rnd(cars) ?? 'x-hs', w: 1 });
      pieces.push({ name: 'x-hs', w: 3 });
    } else if (style === 'poly' && this.has('x-poly')) {
      const n = Math.max(1, Math.round((len / U - 1) / 2));
      for (let i = 0; i < n; i++) pieces.push({ name: 'x-poly', w: 2 });
      pieces.push({ name: rnd(ok(['train-locomotive-passenger-a', 'train-locomotive-passenger-b', 'train-diesel-box-a'])) ?? 'x-poly', w: 1 });
    } else {
      const n = Math.max(2, Math.round(len / U));
      const passenger = style === 'passenger' || style === 'hs' || style === 'poly';
      const st = rnd(PASS_STYLES.filter((x) => k.parts[`train-electric-${x}-a`]));
      for (let i = 0; i < n; i++) {
        const last = i === n - 1;
        const name = passenger
          ? `train-electric-${st}-${last ? 'a' : i === 0 ? 'c' : 'b'}`
          : last
            ? `train-${rnd(ok(LOCOS.map((x) => `train-${x}`)).map((x) => x.slice(6)))}`
            : `train-carriage-${rnd(ok(CARS.map((x) => `train-carriage-${x}`)).map((x) => x.slice(15)))}`;
        pieces.push({ name, w: 1 });
      }
    }

    const W = pieces.reduce((a, p) => a + p.w, 0);
    const unit = len / W;
    const g = new THREE.Group();
    let z = -len / 2;
    let hw = 0;
    for (const p of pieces) {
      const src = k.parts[p.name];
      if (!src) {
        z += p.w * unit;
        continue;
      }
      const d = this.dims(p.name);
      const c = src.clone(true);
      c.scale.z = (p.w * unit) / d.z;
      c.position.set(0, 0.3, z + (p.w * unit) / 2);
      g.add(c);
      z += p.w * unit;
      hw = Math.max(hw, d.x / 2);
    }
    g.userData.hw = THREE.MathUtils.clamp(hw, 1.0, 1.35);
    return g;
  }

  private makeTrainObj(len: number, style: TrainStyle) {
    const red = style === 'passenger' || style === 'hs';
    if (this.kit) return this.kitTrain(len, style);
    const car = this.carOf(red);
    if (car) {
      const CAR_LEN = 13.96;
      const g = new THREE.Group();
      const n = Math.max(1, Math.round(len / CAR_LEN));
      for (let i = 0; i < n; i++) {
        const c = car.clone();
        c.scale.z = len / (n * CAR_LEN);
        c.position.set(0, 0.35, -len / 2 + ((i + 0.5) * len) / n);
        g.add(c);
      }
      const under = new THREE.Mesh(this.underGeo, this.matDark);
      under.scale.z = len - 1;
      under.position.y = 0.3;
      g.add(under);
      for (const zz of [len / 2 - 3, -len / 2 + 3]) {
        const b = new THREE.Mesh(this.bogieGeo, this.matDark);
        b.position.set(0, 0.25, zz);
        g.add(b);
      }
      return g;
    }
    const g = new THREE.Group();
    const side = red ? this.matRed : this.matGreen;
    const body = new THREE.Mesh(this.trainGeo(len), [side, this.matRoof, this.matSolidGreen, this.matDark]);
    body.position.y = 0.5;
    g.add(body);
    const under = new THREE.Mesh(this.underGeo, this.matDark);
    under.scale.z = len - 1;
    under.position.y = 0.3;
    g.add(under);
    for (const zz of [len / 2 - 3, -len / 2 + 3]) {
      const b = new THREE.Mesh(this.bogieGeo, this.matDark);
      b.position.set(0, 0.25, zz);
      g.add(b);
    }
    const front = new THREE.Mesh(this.frontGeo, this.matFront);
    front.position.set(0, 2.0, len / 2 + 0.03);
    g.add(front);
    return g;
  }

  private addTrain(x: number, z: number, len: number, style: TrainStyle, vz: number) {
    const g = this.makeTrainObj(len, style);
    this.place(g, x, z);
    // hit-box width follows the model that is really drawn
    const hw = (g.userData.hw as number | undefined) ?? 1.15;
    this.obstacles.push({ kind: 'train', x, z, pz: z, len, hw, y0: 0.4, y1: 3.6, vz, obj: g });
  }

  /** Decorative trains on the two outer tracks: parked/slow ones and fast oncoming ones */
  private updateAmbient(dz: number, dt: number) {
    for (let i = this.ambient.length - 1; i >= 0; i--) {
      const m = this.ambient[i];
      m.z += dz + m.vz * dt;
      m.obj.position.z = m.z;
      if (m.z - m.len / 2 > 18) {
        this.scene.remove(m.obj);
        this.ambient.splice(i, 1);
      }
    }
    if (!C.OUTER_TRACKS) return;
    for (let s = 0; s < 2; s++) {
      this.ambT[s] -= dt;
      if (this.ambT[s] > 0) continue;
      const side = s === 0 ? -1 : 1;
      if (this.ambient.some((m) => m.side === side)) continue;
      const oncoming = Math.random() < 0.45;
      const len = oncoming ? [12, 24][Math.floor(Math.random() * 2)] : [12, 24, 36][Math.floor(Math.random() * 3)];
      const g = this.makeTrainObj(len, STYLES[Math.floor(Math.random() * STYLES.length)]);
      const z = -C.SPAWN_DIST - len / 2;
      this.place(g, side * C.OUTER_X, z);
      this.ambient.push({ obj: g, z, len, vz: oncoming ? 22 + Math.random() * 8 : 0, side });
      this.ambT[s] = 2 + Math.random() * 5;
    }
  }

  private addContainer(x: number, z: number, len: number) {
    const g = new THREE.Group();
    let cg = this.contGeos.get(len);
    if (!cg) {
      cg = [new THREE.BoxGeometry(2.6, 0.4, len), new THREE.BoxGeometry(2.4, 2.6, len - 0.6)];
      this.contGeos.set(len, cg);
    }
    const flat = new THREE.Mesh(cg[0], this.matDark);
    flat.position.y = 0.3;
    g.add(flat);
    const box = new THREE.Mesh(cg[1], this.matContainer);
    box.position.y = 0.5 + 1.3;
    g.add(box);
    this.place(g, x, z);
    this.obstacles.push({ kind: 'container', x, z, pz: z, len, hw: 1.1, y0: 0.1, y1: 3.2, vz: 0, obj: g });
  }

  private addLow(x: number, z: number) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(this.lowGeos.post, this.matPost);
      p.position.set(s * 1.15, 0.58, 0);
      g.add(p);
      const lamp = new THREE.Mesh(this.lowGeos.lamp, this.matLamp);
      lamp.position.set(s * 1.15, 1.25, 0);
      g.add(lamp);
    }
    const bar = new THREE.Mesh(this.lowGeos.bar, this.matStripe);
    bar.position.y = 0.75;
    g.add(bar);
    this.place(g, x, z);
    this.obstacles.push({ kind: 'low', x, z, pz: z, len: 0.6, hw: 1.3, y0: 0, y1: 1.05, vz: 0, obj: g });
  }

  private addHigh(x: number, z: number) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(this.lowGeos.hpost, this.matPost);
      p.position.set(s * 1.3, 1.8, 0);
      g.add(p);
    }
    const beam = new THREE.Mesh(this.lowGeos.beam, this.matStripe);
    beam.position.y = 1.5;
    g.add(beam);
    const top = new THREE.Mesh(this.lowGeos.top, this.matPost);
    top.position.y = 3.5;
    g.add(top);
    this.place(g, x, z);
    this.obstacles.push({ kind: 'high', x, z, pz: z, len: 0.6, hw: 1.3, y0: 1.15, y1: 3.7, vz: 0, obj: g });
  }

  private place(g: THREE.Object3D, x: number, z: number) {
    g.position.set(x, 0, z);
    this.scene.add(g);
  }

  // --------------------------------------------------------------- coins

  private coinLine(x: number, y: number, count: number, spacing: number, z0: number) {
    for (let i = 0; i < count; i++) this.addCoin(x, y, z0 - i * spacing);
  }

  private coinArc(x: number, zc: number) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.addCoin(x, 0.7 + 1.5 * Math.sin(Math.PI * t), zc + 3.2 - t * 6.4);
    }
  }

  private addCoin(x: number, y: number, z: number) {
    const mesh = this.pool.pop() ?? new THREE.Mesh(this.coinGeo, this.coinMats);
    mesh.visible = true;
    mesh.position.set(x, y, z);
    mesh.rotation.set(0, Math.random() * 6, 0);
    this.scene.add(mesh);
    this.coins.push({ mesh, x, y, z });
  }

  private freeCoin(c: Coin) {
    this.scene.remove(c.mesh);
    this.pool.push(c.mesh);
  }
}
