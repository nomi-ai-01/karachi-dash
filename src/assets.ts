import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/** A model re-centred so its origin is the middle of its footprint and its feet sit on y = 0. */
export interface Prepped {
  obj: THREE.Group;
  w: number; // size along x
  h: number; // size along y
  d: number; // size along z
}
export interface BuildingTpl extends Prepped {
  kind: 'house' | 'city';
}

export function prep(scene: THREE.Object3D, scale = 1, yaw = 0): Prepped {
  const inner = new THREE.Group();
  inner.add(scene);
  inner.scale.setScalar(scale);
  inner.rotation.y = yaw;
  const wrap = new THREE.Group();
  wrap.add(inner);
  wrap.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(wrap);
  inner.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  wrap.updateMatrixWorld(true);
  return { obj: wrap, w: b.max.x - b.min.x, h: b.max.y - b.min.y, d: b.max.z - b.min.z };
}

export interface Kit {
  parts: Record<string, THREE.Object3D>;
  houses: THREE.Object3D[];
}
export const PASS_STYLES = ['city', 'subway', 'bullet', 'double'];
export const LOCOS = [
  'locomotive-a',
  'locomotive-b',
  'locomotive-c',
  'diesel-a',
  'diesel-b',
  'diesel-c',
  'diesel-box-a',
  'diesel-box-b',
  'diesel-box-c',
  'locomotive-passenger-a',
  'locomotive-passenger-b',
];
export const CARS = [
  'box',
  'container-red',
  'container-green',
  'container-blue',
  'tank',
  'tank-large',
  'coal',
  'wood',
  'lumber',
  'dirt',
  'flatbed-wood',
  'flatbed',
];
const HOUSES = 'abcdefghijklmnopqrstu'.split('').map((c) => `building-type-${c}`);
const KIT_PARTS = [
  ...PASS_STYLES.flatMap((k) => ['a', 'b', 'c'].map((x) => `train-electric-${k}-${x}`)),
  ...LOCOS.map((n) => `train-${n}`),
  ...CARS.map((n) => `train-carriage-${n}`),
  ...HOUSES,
];
// Models added later come straight from the Kenney pack (1.8x smaller than the ones already in the game)
const isSmallKit = (n: string) => /double|diesel-box|locomotive-passenger|tank-large/.test(n) || n === 'train-carriage-flatbed';
// Extra single models (public/models/extra/)
const EXTRA_BUILDINGS: [string, 'city'][] = [
  ['city-big', 'city'],
  ['city-brown', 'city'],
  ['city-green', 'city'],
  ['city-red', 'city'],
  ['kay-building', 'city'],
  ['kenney-small', 'city'],
];

// Kenney City Kit (Commercial + Industrial) buildings: public/models/commercial/ and public/models/industrial/
const CITY_KIT_BUILDINGS: string[] = [
  ...['a', 'b', 'd', 'e', 'g', 'i', 'k', 'm', 'skyscraper-a', 'skyscraper-c'].map((n) => `commercial/building-${n}`),
  ...['a', 'c', 'e', 'g', 'i', 'k', 'm', 'o'].map((n) => `industrial/building-${n}`),
];

/** Roadside trees (public/models/trees/): two from tree.glb + one fir. Any file that fails is skipped. */
async function loadTrees(gl: GLTFLoader): Promise<Prepped[]> {
  const out: Prepped[] = [];
  try {
    const g = await gl.loadAsync('models/trees/tree.glb');
    // the file holds two trees side by side: split them into two models
    for (const drop of ['Tree 2', 'Tree 1']) {
      const s = g.scene.clone(true);
      s.getObjectByName(drop)?.removeFromParent();
      const h0 = prep(s, 1).h;
      out.push(prep(s, 5.5 / h0));
    }
  } catch (e) {
    console.warn('[Assets] tree.glb missing', e);
  }
  try {
    const tl = new THREE.TextureLoader();
    const [bark, branch] = await Promise.all([tl.loadAsync('models/trees/bark.jpg'), tl.loadAsync('models/trees/branch.png')]);
    bark.colorSpace = branch.colorSpace = THREE.SRGBColorSpace;
    const obj = await new OBJLoader().loadAsync('models/trees/fir.obj');
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const fixed = mats.map((mt) =>
        /bark|trunk/i.test(mt.name)
          ? new THREE.MeshLambertMaterial({ map: bark })
          : new THREE.MeshLambertMaterial({ map: branch, alphaTest: 0.4, side: THREE.DoubleSide }),
      );
      m.material = Array.isArray(m.material) ? fixed : fixed[0];
    });
    const h0 = prep(obj, 1).h;
    out.push(prep(obj, 5.5 / h0));
  } catch (e) {
    console.warn('[Assets] fir missing', e);
  }
  return out;
}

/** Light Kenney models (1 mesh each, ~1000 triangles). Any single file that fails is simply skipped. */
async function loadKit(gl: GLTFLoader): Promise<Kit | undefined> {
  const parts: Record<string, THREE.Object3D> = {};
  await Promise.all(
    KIT_PARTS.map(async (n) => {
      try {
        const g = await gl.loadAsync(`models/kit/${n}.glb`);
        if (isSmallKit(n)) {
          const w = new THREE.Group();
          g.scene.scale.setScalar(1.8);
          w.add(g.scene);
          parts[n] = w;
        } else parts[n] = g.scene;
      } catch (e) {
        console.warn('[Assets] kit model missing:', n, e);
      }
    }),
  );
  const houses = HOUSES.map((n) => parts[n]).filter(Boolean);
  if (!houses.length || !parts['train-locomotive-a']) {
    console.warn('[Assets] kit models failed, using old models');
    return undefined;
  }
  // long trains built from other models (poly carriage, high speed nose)
  try {
    const poly = await gl.loadAsync('models/extra/poly-carriage.glb');
    const p0 = prep(poly.scene, 1);
    parts['x-poly'] = prep(poly.scene, 2.3 / p0.w).obj;
  } catch (e) {
    console.warn('[Assets] poly carriage missing', e);
  }
  try {
    const hs = await gl.loadAsync('models/extra/highspeed-front.glb');
    // the model is long along x with its nose at -x: turn it so the nose points to +z
    const h0 = prep(hs.scene, 1, Math.PI / 2);
    parts['x-hs'] = prep(hs.scene, 2.4 / h0.w, Math.PI / 2).obj;
  } catch (e) {
    console.warn('[Assets] high speed front missing', e);
  }
  return { parts, houses };
}

async function loadBuildings(gl: GLTFLoader, kit?: Kit): Promise<BuildingTpl[]> {
  const out: BuildingTpl[] = [];
  for (const h of kit?.houses ?? []) out.push({ ...prep(h), kind: 'house' });
  await Promise.all(
    EXTRA_BUILDINGS.map(async ([n, kind]) => {
      try {
        const g = await gl.loadAsync(`models/extra/${n}.glb`);
        g.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.frustumCulled = true;
        });
        out.push({ ...prep(g.scene), kind });
      } catch (e) {
        console.warn('[Assets] building missing:', n, e);
      }
    }),
  );
  for (const n of CITY_KIT_BUILDINGS) {
    try {
      const g = await gl.loadAsync(`models/${n}.glb`);
      out.push({ ...prep(g.scene), kind: 'city' });
    } catch (e) {
      console.warn('[Assets] city kit building missing:', n, e);
    }
  }
  return out;
}

export interface Assets {
  kit?: Kit;
  buildings: BuildingTpl[];
  trees: Prepped[];
  sideGreen: THREE.Texture;
  sideRed: THREE.Texture;
  front: THREE.Texture;
  container: THREE.Texture;
  building: THREE.Texture;
  gravel: THREE.Texture;
  sleeper: THREE.Texture;
  sign: THREE.Texture;
  boy: THREE.Texture;
  coin: THREE.Texture;
  stripe: THREE.Texture;
  trainModel?: THREE.Group; // one train carriage (public/tex/train.glb)
  buildingModel?: THREE.Group; // roadside building (public/tex/building.glb)
}

const FILES: Record<string, string> = {
  sideGreen: 'tex/train_green_side.jpg',
  sideRed: 'tex/train_red_side.jpg',
  front: 'tex/train_front.png',
  container: 'tex/container.jpg',
  building: 'tex/building.jpg',
  gravel: 'tex/gravel.jpg',
  sleeper: 'tex/sleeper.jpg',
  sign: 'tex/sign_karachi.png',
  boy: 'models/boy/boy_tex.png',
};

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Gold coin face with a star (like the reference screenshot) */
function makeCoin() {
  return canvasTex(256, 256, (c) => {
    const g = c.createRadialGradient(110, 100, 20, 128, 128, 128);
    g.addColorStop(0, '#fff3a0');
    g.addColorStop(0.6, '#ffc61a');
    g.addColorStop(1, '#d68a00');
    c.fillStyle = g;
    c.beginPath();
    c.arc(128, 128, 126, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#b86e00';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(128, 128, 104, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#ffe35a';
    c.strokeStyle = '#c07800';
    c.lineWidth = 6;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 74 : 32;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = 128 + Math.cos(a) * r;
      const y = 132 + Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
    c.stroke();
  });
}

/** Red/white warning stripes for barriers */
function makeStripe() {
  return canvasTex(256, 64, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#d62828';
    for (let i = -2; i < 10; i++) {
      c.beginPath();
      c.moveTo(i * 32, 0);
      c.lineTo(i * 32 + 16, 0);
      c.lineTo(i * 32 + 16 + 32, 64);
      c.lineTo(i * 32 + 32, 64);
      c.closePath();
      c.fill();
    }
    c.strokeStyle = '#222';
    c.lineWidth = 6;
    c.strokeRect(0, 0, 256, 64);
  });
}

export async function loadAssets(onProgress: (p: number) => void): Promise<Assets> {
  const loader = new THREE.TextureLoader();
  const keys = Object.keys(FILES);
  let done = 0;
  const loaded: Record<string, THREE.Texture> = {};
  await Promise.all(
    keys.map(async (k) => {
      let t: THREE.Texture;
      try {
        t = await loader.loadAsync(FILES[k]);
      } catch (err) {
        console.warn('[Assets] texture failed, using placeholder:', FILES[k], err);
        t = canvasTex(8, 8, (c) => {
          c.fillStyle = '#8a8a8a';
          c.fillRect(0, 0, 8, 8);
        });
      }
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      loaded[k] = t;
      done++;
      onProgress(done / keys.length);
    }),
  );
  // 3D models (optional: the game falls back to the old textured boxes)
  const gl = new GLTFLoader();
  const kit = await loadKit(gl);
  const buildings = await loadBuildings(gl, kit);
  const skip = { status: 'rejected', reason: 'using kit models' } as PromiseRejectedResult;
  const [tm, bm] = kit
    ? [skip, skip]
    : await Promise.allSettled([gl.loadAsync('tex/train.glb'), gl.loadAsync('tex/building.glb')]);
  const prep = (r: PromiseSettledResult<{ scene: THREE.Group }>, name: string) => {
    if (r.status !== 'fulfilled') {
      console.warn('[Assets] model failed:', name, r.reason);
      return undefined;
    }
    r.value.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mt of mats as THREE.MeshStandardMaterial[]) if (mt.map) mt.map.anisotropy = 8;
    });
    return r.value.scene;
  };
  return {
    kit,
    buildings,
    trees: await loadTrees(gl),
    trainModel: prep(tm, 'train'),
    buildingModel: prep(bm, 'building'),
    sideGreen: loaded.sideGreen,
    sideRed: loaded.sideRed,
    front: loaded.front,
    container: loaded.container,
    building: loaded.building,
    gravel: loaded.gravel,
    sleeper: loaded.sleeper,
    sign: loaded.sign,
    boy: loaded.boy,
    coin: makeCoin(),
    stripe: makeStripe(),
  };
}
