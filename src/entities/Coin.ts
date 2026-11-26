import Phaser from 'phaser';

export class Coin {
  container: Phaser.GameObjects.Container;
  active = true;
  golden: boolean;
  depth = 0;
  lane = 0;
  private spin = 0;
  private baseScale = 1;
  private img?: Phaser.GameObjects.Image;
  private size = 44;

  constructor(scene: Phaser.Scene, x: number, y: number, golden = false) {
    this.golden = golden;
    this.container = scene.add.container(x, y);
    const realKey = golden ? 'coin_golden' : 'coin_chai';
    const key = golden ? 'tex-golden' : 'tex-coin';
    if (scene.textures.exists(realKey)) {
      this.size = golden ? 56 : 46;
      this.img = scene.add.image(0, 0, realKey).setDisplaySize(this.size, this.size);
      this.container.add(this.img);
    } else if (scene.textures.exists(key)) {
      this.container.add(scene.add.image(0, 0, key));
    } else {
      const g = scene.add.graphics();
      if (golden) {
        g.fillStyle(0xffc857, 1);
        g.fillCircle(0, 0, 16);
        g.fillStyle(0xe63946, 1);
        g.fillCircle(0, 0, 10);
      } else {
        g.fillStyle(0xffc857, 1);
        g.fillCircle(0, 0, 12);
        g.lineStyle(2, 0xe9c46a, 1);
        g.strokeCircle(0, 0, 12);
        g.fillStyle(0xe9c46a, 1);
        g.fillCircle(0, 0, 5);
      }
      this.container.add(g);
    }
    this.container.setDepth(25);
  }

  update(dt: number) {
    this.spin += dt * 5;
    this.container.setScale(this.baseScale);
    if (this.img) {
      // spin around the vertical axis like a real coin
      const w = Math.max(0.12, Math.abs(Math.cos(this.spin)));
      this.img.setDisplaySize(this.size * w, this.size);
    } else {
      this.container.setScale(this.baseScale * (1 + Math.sin(this.spin) * 0.08));
    }
  }

  applyDepth(scale: number) {
    this.baseScale = scale;
    this.container.setScale(scale);
  }

  getBounds(): Phaser.Geom.Circle {
    const r = (this.golden ? 24 : 20) * this.baseScale;
    return new Phaser.Geom.Circle(this.container.x, this.container.y, r);
  }

  collect() {
    this.active = false;
    this.container.destroy(true);
  }

  destroy() {
    this.container.destroy(true);
    this.active = false;
  }
}
