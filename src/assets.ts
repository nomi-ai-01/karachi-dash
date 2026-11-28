import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface Assets {
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
  const [tm, bm] = await Promise.allSettled([
    gl.loadAsync('tex/train.glb'),
    gl.loadAsync('tex/building.glb'),
  ]);
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
