import Phaser from 'phaser';

export type ObstacleKind =
  | 'bus'
  | 'minibus'
  | 'cart'
  | 'manhole'
  | 'wire'
  | 'thela'
  | 'cricket';

export interface ObstacleDef {
  kind: ObstacleKind;
  lane: number;
  action: 'jump' | 'slide' | 'block';
  width: number;
  height: number;
}

export class Obstacle {
  container: Phaser.GameObjects.Container;
  def: ObstacleDef;
  active = true;
  depth = 0;
  lane = 0;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, def: ObstacleDef, x: number, y: number) {
    this.def = def;
    this.lane = def.lane;
    this.container = scene.add.container(x, y);
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);
    this.draw();
    this.container.setDepth(30);
  }

  private draw() {
    const g = this.graphics;
    g.clear();
    switch (this.def.kind) {
      case 'bus':
        this.drawBus(g, 0xe63946);
        break;
      case 'minibus':
        this.drawBus(g, 0x2a9d8f, 0.75);
        break;
      case 'cart':
        this.drawCart(g);
        break;
      case 'manhole':
        this.drawManhole(g);
        break;
      case 'wire':
        this.drawWire(g);
        break;
      case 'thela':
        this.drawThela(g);
        break;
      case 'cricket':
        this.drawCricket(g);
        break;
    }
  }

  private drawBus(g: Phaser.GameObjects.Graphics, color: number, scale = 1) {
    const w = 70 * scale;
    const h = 90 * scale;
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.lineStyle(2.5, 0xffc857, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.fillStyle(0x87ceeb, 0.7);
    g.fillRect(-w / 2 + 6, -h / 2 + 8, w - 12, 18);
    g.fillStyle(0xffc857, 1);
    g.fillRect(-w / 2, 5, w, 6);
    g.fillStyle(0x111111, 1);
    g.fillCircle(-w / 3, h / 2 - 4, 10 * scale);
    g.fillCircle(w / 3, h / 2 - 4, 10 * scale);
  }

  private drawCart(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(-28, -10, 56, 24);
    g.fillStyle(0x5c4033, 1);
    g.fillCircle(-22, 16, 10);
    g.fillCircle(22, 16, 10);
    g.fillStyle(0xf4a261, 1);
    g.fillCircle(-10, -18, 12);
    g.fillCircle(8, -20, 10);
  }

  private drawManhole(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x1a1a1a, 1);
    g.fillEllipse(0, 0, 52, 22);
    g.lineStyle(3, 0x444444, 1);
    g.strokeEllipse(0, 0, 52, 22);
    g.lineStyle(1.5, 0x666666, 1);
    g.strokeEllipse(0, 0, 36, 12);
  }

  private drawWire(g: Phaser.GameObjects.Graphics) {
    g.lineStyle(4, 0x333333, 1);
    g.lineBetween(-55, -30, 55, -30);
    g.fillStyle(0xe63980, 1);
    g.fillRoundedRect(-40, -48, 80, 22, 4);
    g.lineStyle(2, 0xffc857, 1);
    g.strokeRoundedRect(-40, -48, 80, 22, 4);
  }

  private drawThela(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xf4a261, 1);
    g.fillRoundedRect(-20, -25, 40, 40, 4);
    g.fillStyle(0xe63946, 1);
    g.fillCircle(-8, -10, 7);
    g.fillStyle(0x2a9d8f, 1);
    g.fillCircle(8, -12, 6);
    g.fillStyle(0xffc857, 1);
    g.fillCircle(0, 0, 5);
  }

  private drawCricket(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xfefae0, 1);
    g.fillCircle(0, 0, 12);
    g.lineStyle(2, 0x333333, 1);
    g.strokeCircle(0, 0, 12);
    g.lineBetween(-6, -4, 6, 4);
    g.lineBetween(-6, 4, 6, -4);
  }

  getBounds(): Phaser.Geom.Rectangle {
    const { width, height, action } = this.def;
    let yOff = 0;
    if (action === 'slide') yOff = -20;
    if (action === 'jump') yOff = 15;
    const s = this.container.scaleX;
    return new Phaser.Geom.Rectangle(
      this.container.x - (width * s) / 2,
      this.container.y - (height * s) / 2 + yOff * s,
      width * s,
      height * s,
    );
  }

  destroy() {
    this.container.destroy(true);
    this.active = false;
  }
}

export function randomObstacle(lane: number): ObstacleDef {
  const roll = Math.random();
  if (roll < 0.22) return { kind: 'bus', lane, action: 'block', width: 70, height: 90 };
  if (roll < 0.38) return { kind: 'minibus', lane, action: 'block', width: 55, height: 70 };
  if (roll < 0.52) return { kind: 'cart', lane, action: 'block', width: 56, height: 40 };
  if (roll < 0.68) return { kind: 'manhole', lane, action: 'jump', width: 52, height: 24 };
  if (roll < 0.82) return { kind: 'wire', lane, action: 'slide', width: 100, height: 50 };
  if (roll < 0.92) return { kind: 'thela', lane, action: 'block', width: 42, height: 50 };
  return { kind: 'cricket', lane, action: 'jump', width: 28, height: 28 };
}
