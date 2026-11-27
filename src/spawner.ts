import * as THREE from 'three';
import { C } from './config';
import type { Assets } from './assets';

export type ObstacleKind = 'train' | 'container' | 'low' | 'high';

export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  z: number; // centre
  len: number;
  hw: number; // half width for collision
  y0: number;
  y1: number;
  obj: THREE.Object3D;
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
  coins: Coin[] = [];
  private pool: THREE.Mesh[] = [];
  private cursor = 45;
  private safeLane = 1;
  private trainGeos = new Map<number, THREE.BoxGeometry>();

  private matGreen: THREE.MeshBasicMaterial;
  private matRed: THREE.MeshBasicMaterial;
  private matFront: THREE.MeshBasicMaterial;
  private matContainer: THREE.MeshBasicMaterial;
  private matStripe: THREE.MeshBasicMaterial;
  private matSolidGreen = new THREE.MeshLambertMaterial({ color: 0x14683a });
  private matRoof = new THREE.MeshLambertMaterial({ color: 0xaab4bb });
  private matDark = new THREE.MeshLambertMaterial({ color: 0x25282c });
  private matPost = new THREE.MeshLambertMaterial({ color: 0x555b62 });
  private matLamp = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  private underGeo = new THREE.BoxGeometry(2.2, 0.5, 1);
  private bogieGeo = new THREE.BoxGeometry(2.1, 0.45, 2.6);
  private frontGeo = new THREE.PlaneGeometry(2.6, 3.0);
  private coinGeo: THREE.CylinderGeometry;
  private coinMats: THREE.Material[];

  constructor(private scene: THREE.Scene, a: Assets) {
    a.sideGreen.wrapS = a.sideRed.wrapS = THREE.RepeatWrapping;
    this.matGreen = new THREE.MeshBasicMaterial({ map: a.sideGreen });
    this.matRed = new THREE.MeshBasicMaterial({ map: a.sideRed });
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

  reset() {
    for (const o of this.obstacles) this.scene.remove(o.obj);
    for (const c of this.coins) this.freeCoin(c);
    this.obstacles = [];
    this.coins = [];
    this.cursor = 45;
    this.safeLane = 1;
  }

  update(dz: number, dt: number, dist: number, speed: number) {
    if (dist >= this.cursor) this.spawnRow(dist, speed);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.z += dz;
      o.obj.position.z = o.z;
      if (o.z - o.len / 2 > 16) {
        this.scene.remove(o.obj);
        this.obstacles.splice(i, 1);
      }
    }
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

  /** First obstacle that overlaps the player's box (or null) */
  collides(px: number, py: number, h: number): Obstacle | null {
    const pHW = C.PLAYER_HW;
    const pHD = C.PLAYER_HD;
    for (const o of this.obstacles) {
      if (Math.abs(o.z) > o.len / 2 + 1) continue;
      if (Math.abs(px - o.x) >= pHW + o.hw) continue;
      if (py + h <= o.y0 || py >= o.y1) continue;
      if (o.z + o.len / 2 <= -pHD || o.z - o.len / 2 >= pHD) continue;
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

    if (early ? r < 0.5 : r < 0.26) {
      // plain coin line
      const l = lanes[0];
      this.coinLine(C.LANES[l], 0.9, 8, 2.2, z0);
      rowLen = 8 * 2.2;
    } else if (early ? true : r < 0.48) {
      // low barriers (jump)
      const n = diff > 0.3 && Math.random() < 0.4 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = C.LANES[lanes[k]];
        this.addLow(x, z0 - 0.3);
        this.coinArc(x, z0 - 0.3);
      }
      this.coinLine(C.LANES[lanes[2]], 0.9, 5, 2.2, z0);
      rowLen = 8;
    } else if (r < 0.6) {
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
      const isContainer = r >= 0.9;
      const n = diff > 0.25 && Math.random() < 0.5 ? 2 : 1;
      const cand = [0, 1, 2].filter((l) => Math.abs(l - this.safeLane) <= 1);
      const free = cand[Math.floor(Math.random() * cand.length)];
      let blocked = [0, 1, 2].filter((l) => l !== free);
      if (n === 1) blocked = [blocked[Math.floor(Math.random() * 2)]];
      const lens = [12, 16, 20];
      rowLen = 0;
      for (const l of blocked) {
        const len = isContainer ? 6.6 : lens[Math.floor(Math.random() * lens.length)];
        rowLen = Math.max(rowLen, len);
        if (isContainer) this.addContainer(C.LANES[l], z0 - len / 2, len);
        else this.addTrain(C.LANES[l], z0 - len / 2, len, Math.random() < 0.5);
      }
      const freeLanes = [0, 1, 2].filter((l) => !blocked.includes(l));
      const coinLane = freeLanes.includes(free) ? free : freeLanes[0];
      this.coinLine(C.LANES[coinLane], 0.9, Math.max(6, Math.floor(rowLen / 2.2)), 2.2, z0);
      this.safeLane = coinLane;
    }

    const gap = Math.max(16, speed * (1.05 - 0.3 * diff));
    this.cursor = dist + rowLen + gap;
  }

  private shuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ------------------------------------------------------------ builders

  private trainGeo(len: number) {
    let g = this.trainGeos.get(len);
    if (!g) {
      g = new THREE.BoxGeometry(2.6, 3.0, len);
      const rep = Math.max(1, Math.round(len / TRAIN_TEX_M));
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let v = 0; v < 8; v++) uv.setX(v, uv.getX(v) * rep); // faces +x and -x
      this.trainGeos.set(len, g);
    }
    return g;
  }

  private addTrain(x: number, z: number, len: number, red: boolean) {
    const g = new THREE.Group();
    const side = red ? this.matRed : this.matGreen;
    const body = new THREE.Mesh(this.trainGeo(len), [
      side,
      side,
      this.matRoof,
      this.matDark,
      this.matSolidGreen,
      this.matDark,
    ]);
    body.position.y = 2.0;
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
    this.place(g, x, z);
    this.obstacles.push({ kind: 'train', x, z, len, hw: 1.15, y0: 0.4, y1: 3.6, obj: g });
  }

  private addContainer(x: number, z: number, len: number) {
    const g = new THREE.Group();
    const flat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, len), this.matDark);
    flat.position.y = 0.3;
    g.add(flat);
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, len - 0.6), this.matContainer);
    box.position.y = 0.5 + 1.3;
    g.add(box);
    this.place(g, x, z);
    this.obstacles.push({ kind: 'container', x, z, len, hw: 1.1, y0: 0.1, y1: 3.2, obj: g });
  }

  private addLow(x: number, z: number) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.15, 0.25), this.matPost);
      p.position.set(s * 1.15, 0.58, 0);
      g.add(p);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), this.matLamp);
      lamp.position.set(s * 1.15, 1.25, 0);
      g.add(lamp);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 0.3), this.matStripe);
    bar.position.y = 0.75;
    g.add(bar);
    this.place(g, x, z);
    this.obstacles.push({ kind: 'low', x, z, len: 0.6, hw: 1.3, y0: 0, y1: 1.05, obj: g });
  }

  private addHigh(x: number, z: number) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 0.3), this.matPost);
      p.position.set(s * 1.3, 1.8, 0);
      g.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.55, 0.35), this.matStripe);
    beam.position.y = 1.5;
    g.add(beam);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.3, 0.3), this.matPost);
    top.position.y = 3.5;
    g.add(top);
    this.place(g, x, z);
    this.obstacles.push({ kind: 'high', x, z, len: 0.6, hw: 1.3, y0: 1.15, y1: 3.7, obj: g });
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
