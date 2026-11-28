import * as THREE from 'three';
import { C } from './config';
import type { Assets } from './assets';

/** Endless scrolling Karachi: railway tracks, buildings, palms, wires, gantry sign, landmarks. */
export class World {
  readonly root = new THREE.Group();
  private segs: THREE.Group[] = [];

  private groundGeo: THREE.PlaneGeometry;
  private groundMat: THREE.MeshLambertMaterial;
  private paveGeo: THREE.PlaneGeometry;
  private paveMat = new THREE.MeshLambertMaterial({ color: 0x9a8f80 });
  private sleeperGeo = new THREE.BoxGeometry(2.3, 0.18, 0.5);
  private sleeperMat: THREE.MeshLambertMaterial;
  private railGeo = new THREE.BoxGeometry(0.14, 0.22, C.SEG_LEN);
  private railMat = new THREE.MeshStandardMaterial({ color: 0xc3c8ce, metalness: 0.85, roughness: 0.3 });
  private plainWall = new THREE.MeshBasicMaterial({ color: 0xd4c19a });
  private facadeMat: THREE.MeshBasicMaterial;
  private darkMat = new THREE.MeshLambertMaterial({ color: 0x3b3f45 });
  private grayMat = new THREE.MeshLambertMaterial({ color: 0x7c8187 });
  private poleGeo = new THREE.CylinderGeometry(0.14, 0.2, 9, 6);
  private armGeo = new THREE.BoxGeometry(18.8, 0.18, 0.18);
  private wireMat = new THREE.LineBasicMaterial({ color: 0x1d1d1d });
  private wireGeo: THREE.BufferGeometry;
  private signMat: THREE.MeshBasicMaterial;
  private trunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 7, 7);
  private trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  private leafGeo: THREE.ShapeGeometry;
  private leafMats = [
    new THREE.MeshLambertMaterial({ color: 0x2e8b3a, side: THREE.DoubleSide }),
    new THREE.MeshLambertMaterial({ color: 0x3fa64a, side: THREE.DoubleSide }),
  ];
  private whiteMat = new THREE.MeshLambertMaterial({ color: 0xf1ede2 });
  private archMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });

  constructor(a: Assets) {
    a.gravel.wrapS = a.gravel.wrapT = THREE.RepeatWrapping;
    a.gravel.repeat.set(16, 12);
    a.building.wrapS = a.building.wrapT = THREE.MirroredRepeatWrapping;

    this.groundGeo = new THREE.PlaneGeometry(17, C.SEG_LEN);
    this.groundMat = new THREE.MeshLambertMaterial({ map: a.gravel });
    this.paveGeo = new THREE.PlaneGeometry(6, C.SEG_LEN);
    this.sleeperMat = new THREE.MeshLambertMaterial({ map: a.sleeper });
    this.facadeMat = new THREE.MeshBasicMaterial({ map: a.building });
    this.signMat = new THREE.MeshBasicMaterial({
      map: a.sign,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.55, 1.7, 0, 3.5);
    shape.quadraticCurveTo(-0.55, 1.7, 0, 0);
    this.leafGeo = new THREE.ShapeGeometry(shape);

    const L = C.SEG_LEN / 2;
    const pts: number[] = [];
    for (const x of C.LANES) {
      pts.push(x, 7.8, -L, x, 7.8, L);
      pts.push(x, 8.5, -L, x, 8.5, L);
    }
    this.wireGeo = new THREE.BufferGeometry();
    this.wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));

    for (let i = 0; i < C.SEG_COUNT; i++) {
      const seg = this.buildSegment(i);
      seg.position.z = 12 - i * C.SEG_LEN;
      this.segs.push(seg);
      this.root.add(seg);
    }
  }

  update(dz: number) {
    if (dz === 0) return;
    const total = C.SEG_COUNT * C.SEG_LEN;
    for (const s of this.segs) {
      s.position.z += dz;
      if (s.position.z > C.SEG_LEN * 1.5) s.position.z -= total;
    }
  }

  private buildSegment(i: number) {
    const g = new THREE.Group();
    const L = C.SEG_LEN;

    // ballast + side pavements
    const ground = new THREE.Mesh(this.groundGeo, this.groundMat);
    ground.receiveShadow = true;
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(this.paveGeo, this.paveMat);
      p.receiveShadow = true;
      p.rotation.x = -Math.PI / 2;
      p.position.set(s * 11.5, 0.02, 0);
      g.add(p);
    }

    // sleepers (instanced) + rails
    const tracks: number[] = C.OUTER_TRACKS ? [...C.LANES, -C.OUTER_X, C.OUTER_X] : [...C.LANES];
    const count = tracks.length * L;
    const inst = new THREE.InstancedMesh(this.sleeperGeo, this.sleeperMat, count);
    inst.receiveShadow = true;
    inst.castShadow = true;
    const m = new THREE.Matrix4();
    let n = 0;
    for (const x of tracks) {
      for (let k = 0; k < L; k++) {
        m.makeTranslation(x, 0.09, -L / 2 + k + 0.5);
        inst.setMatrixAt(n++, m);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    g.add(inst);
    for (const x of tracks) {
      for (const s of [-1, 1]) {
        const r = new THREE.Mesh(this.railGeo, this.railMat);
        r.position.set(x + s * 0.72, 0.29, 0);
        g.add(r);
      }
    }

    // buildings on both sides (painted facade faces the tracks)
    for (const s of [-1, 1]) {
      const H = 12 + Math.random() * 6;
      const geo = new THREE.BoxGeometry(8, H, L);
      const face = s > 0 ? 1 : 0; // inner face: -x for right side, +x for left side
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      const off = Math.random();
      for (let v = face * 4; v < face * 4 + 4; v++) {
        uv.setXY(v, uv.getX(v) + off, uv.getY(v) * (H / 12));
      }
      const mats = [0, 1, 2, 3, 4, 5].map((k) => (k === face ? this.facadeMat : this.plainWall));
      const b = new THREE.Mesh(geo, mats);
      b.position.set(s * 16, H / 2, 0);
      g.add(b);
    }

    // palms
    for (const s of [-1, 1]) {
      for (const z of [-6, 6]) {
        if (Math.random() < 0.25) continue;
        const p = this.makePalm();
        p.position.set(s * 10.6, 0, z + (Math.random() - 0.5) * 3);
        p.rotation.y = Math.random() * Math.PI * 2;
        g.add(p);
      }
    }

    // electric poles + overhead wires
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(this.poleGeo, this.darkMat);
      pole.position.set(s * 9.4, 4.5, 0);
      g.add(pole);
    }
    const arm = new THREE.Mesh(this.armGeo, this.darkMat);
    arm.position.set(0, 8.7, 0);
    g.add(arm);
    g.add(new THREE.LineSegments(this.wireGeo, this.wireMat));

    // landmark / props by segment index
    if (i % 4 === 1) this.addGantry(g);
    if (i % 4 === 3) this.addFootbridge(g);
    if (i === 2) this.addMazar(g);
    if (i === 6) this.addMosque(g);
    return g;
  }

  private makePalm() {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(this.trunkGeo, this.trunkMat);
    trunk.position.y = 3.5;
    palm.add(trunk);
    const crown = new THREE.Group();
    crown.position.y = 6.9;
    for (let k = 0; k < 10; k++) {
      const leaf = new THREE.Mesh(this.leafGeo, this.leafMats[k % 2]);
      leaf.rotation.order = 'YXZ';
      leaf.rotation.y = (k / 10) * Math.PI * 2;
      leaf.rotation.x = -(k % 2 === 0 ? 0.95 : 1.75);
      crown.add(leaf);
    }
    palm.add(crown);
    return palm;
  }

  private addGantry(g: THREE.Group) {
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10.6, 0.6), this.grayMat);
      p.position.set(s * 9.8, 5.3, 0);
      g.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.9, 0.7), this.grayMat);
    beam.position.set(0, 10.5, 0);
    g.add(beam);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.5), this.signMat);
    sign.position.set(0, 7.5, 0.5);
    g.add(sign);
  }

  private addFootbridge(g: THREE.Group) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(21, 0.5, 3), this.grayMat);
    deck.position.set(0, 6.1, 0);
    g.add(deck);
    for (const z of [-1.4, 1.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(21, 1, 0.15), this.darkMat);
      rail.position.set(0, 6.85, z);
      g.add(rail);
    }
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), this.grayMat);
      p.position.set(s * 10, 3, 0);
      g.add(p);
    }
  }

  /** Simplified Mazar-e-Quaid: white cube, dark arches, big dome */
  private addMazar(g: THREE.Group) {
    const m = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(18, 20, 18), this.whiteMat);
    base.position.y = 10;
    m.add(base);
    for (let k = -1; k <= 1; k++) {
      const arch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 9, 0.4), this.archMat);
      arch.position.set(k * 5.2, 6.5, -9.1);
      m.add(arch);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 14, 1, false, 0, Math.PI), this.archMat);
      top.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      top.position.set(k * 5.2, 11, -9.1);
      m.add(top);
    }
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8, 3, 28), this.whiteMat);
    drum.position.y = 21.5;
    m.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), this.whiteMat);
    dome.position.y = 23;
    m.add(dome);
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 3, 6), this.grayMat);
    fin.position.y = 31;
    m.add(fin);
    m.position.set(36, 0, 0);
    m.rotation.y = Math.PI / 2 + 0.25;
    g.add(m);
  }

  /** Mosque with minaret (left side skyline) */
  private addMosque(g: THREE.Group) {
    const m = new THREE.Group();
    const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 16), this.whiteMat);
    hall.position.y = 6;
    m.add(hall);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.whiteMat);
    dome.position.y = 12;
    m.add(dome);
    for (const s of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 26, 10), this.whiteMat);
      tower.position.set(s * 9.5, 13, 8);
      m.add(tower);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3, 10), new THREE.MeshLambertMaterial({ color: 0x2e8b57 }));
      cap.position.set(s * 9.5, 27.5, 8);
      m.add(cap);
    }
    m.position.set(-34, 0, 0);
    g.add(m);
  }
}
