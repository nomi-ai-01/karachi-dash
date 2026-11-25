import Phaser from 'phaser';

export class Coin {
  container: Phaser.GameObjects.Container;
  active = true;
  golden: boolean;
  depth = 0;
  lane = 0;
  private spin = 0;
  private baseScale = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, golden = false) {
    this.golden = golden;
    this.container = scene.add.container(x, y);
    const key = golden ? 'tex-golden' : 'tex-coin';
    if (scene.textures.exists(key)) {
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
    this.spin += dt * 4;
    const pulse = 1 + Math.sin(this.spin) * 0.08;
    this.container.setScale(this.baseScale * pulse);
  }

  applyDepth(scale: number) {
    this.baseScale = scale;
    this.container.setScale(scale);
  }

  getBounds(): Phaser.Geom.Circle {
    const r = (this.golden ? 16 : 12) * this.baseScale;
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
