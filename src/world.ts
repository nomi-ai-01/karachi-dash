import * as THREE from 'three';
import { C } from './config';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  private armGeo = new THREE.BoxGeometry(10.8, 0.18, 0.18);
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

  private signImg!: CanvasImageSource;
  private wraps = 0;
  private cityIdx = 0;
  private readonly CITIES: [string, string][] = [
    ['KARACHI', 'کراچی'],
    ['HYDERABAD', 'حیدرآباد'],
    ['MULTAN', 'ملتان'],
    ['BAHAWALPUR', 'بہاولپور'],
    ['LAHORE', 'لاہور'],
    ['FAISALABAD', 'فیصل آباد'],
    ['RAWALPINDI', 'راولپنڈی'],
    ['ISLAMABAD', 'اسلام آباد'],
    ['PESHAWAR', 'پشاور'],
    ['QUETTA', 'کوئٹہ'],
    ['SUKKUR', 'سکھر'],
    ['SIALKOT', 'سیالکوٹ'],
  ];
  private bModel?: THREE.Group;
  private houses: THREE.Object3D[] = [];
  private palmCrown!: THREE.BufferGeometry;

  constructor(a: Assets) {
    this.bModel = a.buildingModel;
    this.houses = a.kit?.houses ?? [];
    a.gravel.wrapS = a.gravel.wrapT = THREE.RepeatWrapping;
    a.gravel.repeat.set(16, 12);
    a.building.wrapS = a.building.wrapT = THREE.MirroredRepeatWrapping;

    this.groundGeo = new THREE.PlaneGeometry(9.6, C.SEG_LEN);
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
    // merge the 10 palm leaves into ONE geometry (1 draw call instead of 10 per palm)
    const tr = new THREE.Object3D();
    tr.rotation.order = 'YXZ';
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 10; k++) {
      tr.position.set(0, 6.9, 0);
      tr.rotation.set(-(k % 2 === 0 ? 0.95 : 1.75), (k / 10) * Math.PI * 2, 0);
      tr.updateMatrix();
      parts.push(this.leafGeo.clone().applyMatrix4(tr.matrix));
    }
    this.palmCrown = mergeGeometries(parts)!;

    const L = C.SEG_LEN / 2;
    const pts: number[] = [];
    for (const x of C.LANES) {
      pts.push(x, 7.8, -L, x, 7.8, L);
      pts.push(x, 8.5, -L, x, 8.5, L);
    }
    this.wireGeo = new THREE.BufferGeometry();
    this.wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));

    this.signImg = a.sign.image as CanvasImageSource;
    for (let i = 0; i < C.SEG_COUNT; i++) {
      const seg = this.buildSegment(i);
      seg.position.z = 12 - i * C.SEG_LEN;
      this.segs.push(seg);
      this.root.add(seg);
    }
    this.showGantry(this.segs[1]); // the first sign: Karachi
  }

  update(dz: number) {
    if (dz === 0) return;
    const total = C.SEG_COUNT * C.SEG_LEN;
    for (const s of this.segs) {
      s.position.z += dz;
      if (s.position.z > C.SEG_LEN * 1.5) {
        s.position.z -= total;
        this.onWrap(s);
      }
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
      p.position.set(s * 7.2, 0.02, 0);
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
      if (this.houses.length) {
        // two light houses per side per segment; the door side faces the tracks
        for (const zz of [-6, 6]) {
          const b = this.houses[Math.floor(Math.random() * this.houses.length)].clone(true);
          const sc = 8.2 + Math.random();
          b.scale.set(sc, sc * (1.15 + Math.random() * 0.9), sc);
          b.position.set(s * 11, 0, zz);
          b.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
          g.add(b);
        }
        continue;
      }
      if (this.bModel) {
        const b = this.bModel.clone();
        // model is 24 wide x 14 high x 42 long: squeeze it to one track segment
        b.scale.set(0.55, 0.85 + Math.random() * 0.35, L / 42);
        b.position.set(s * 16.2, 0, 0);
        b.rotation.y = Math.random() < 0.5 ? 0 : Math.PI;
        g.add(b);
        continue;
      }
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
      b.position.set(s * 10.5, H / 2, 0);
      g.add(b);
    }

    // palms
    for (const s of [-1, 1]) {
      for (const z of [-6, 6]) {
        if (Math.random() < 0.25) continue;
        const p = this.makePalm();
        p.position.set(s * 6, 0, z + (Math.random() - 0.5) * 3);
        p.rotation.y = Math.random() * Math.PI * 2;
        g.add(p);
      }
    }

    // electric poles + overhead wires
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(this.poleGeo, this.darkMat);
      pole.position.set(s * 5.2, 4.5, 0);
      g.add(pole);
    }
    const arm = new THREE.Mesh(this.armGeo, this.darkMat);
    arm.position.set(0, 8.7, 0);
    g.add(arm);
    g.add(new THREE.LineSegments(this.wireGeo, this.wireMat));

    // landmark / props by segment index
    this.addGantry(g);
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
    palm.add(new THREE.Mesh(this.palmCrown, this.leafMats[0]));
    return palm;
  }

  /** Every segment owns a gantry, but only one is shown every ~430 m, each time with the next city name. */
  private addGantry(g: THREE.Group) {
    const gg = new THREE.Group();
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10.6, 0.6), this.grayMat);
      p.position.set(s * 5.4, 5.3, 0);
      gg.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.9, 0.7), this.grayMat);
    beam.position.set(0, 10.5, 0);
    gg.add(beam);
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 4.8),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
    );
    sign.position.set(0, 7.6, 0.5);
    gg.add(sign);
    gg.visible = false;
    g.add(gg);
    g.userData.gantry = gg;
    g.userData.signTex = tex;
  }

  private showGantry(seg: THREE.Group) {
    const gg = seg.userData.gantry as THREE.Group | undefined;
    const tex = seg.userData.signTex as THREE.CanvasTexture | undefined;
    if (!gg || !tex) return;
    const [en, ur] = this.CITIES[this.cityIdx++ % this.CITIES.length];
    const cv = tex.image as HTMLCanvasElement;
    const c = cv.getContext('2d')!;
    c.clearRect(0, 0, 512, 256);
    c.drawImage(this.signImg, 0, 0, 512, 256);
    c.fillStyle = '#0f5a2e';
    c.strokeStyle = '#f4e2b0';
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(150, 62, 212, 134, 14);
    c.fill();
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.direction = 'rtl';
    let fs = 64;
    c.font = `bold ${fs}px 'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Urdu Typesetting','Segoe UI',Arial,serif`;
    while (c.measureText(ur).width > 190 && fs > 24) {
      fs -= 4;
      c.font = `bold ${fs}px 'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Urdu Typesetting','Segoe UI',Arial,serif`;
    }
    c.fillText(ur, 256, 118);
    c.direction = 'ltr';
    c.fillStyle = '#ffd24a';
    c.font = "bold 22px system-ui, Arial, sans-serif";
    c.fillText(en, 256, 172);
    tex.needsUpdate = true;
    gg.visible = true;
  }

  private onWrap(seg: THREE.Group) {
    const gg = seg.userData.gantry as THREE.Group | undefined;
    if (!gg) return;
    gg.visible = false;
    if (++this.wraps % 18 === 0) this.showGantry(seg);
  }

  private addFootbridge(g: THREE.Group) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 3), this.grayMat);
    deck.position.set(0, 6.1, 0);
    g.add(deck);
    for (const z of [-1.4, 1.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 0.15), this.darkMat);
      rail.position.set(0, 6.85, z);
      g.add(rail);
    }
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), this.grayMat);
      p.position.set(s * 5.8, 3, 0);
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
    m.position.set(30, 0, 0);
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
    m.position.set(-30, 0, 0);
    g.add(m);
  }
}
