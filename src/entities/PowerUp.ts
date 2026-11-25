import Phaser from 'phaser';

export type PowerUpKind = 'bat' | 'chai' | 'magnet' | 'double' | 'shield';

const LABELS: Record<PowerUpKind, string> = {
  bat: 'BAT',
  chai: 'CHAI',
  magnet: 'MAG',
  double: 'x2',
  shield: 'SHD',
};

const COLORS: Record<PowerUpKind, number> = {
  bat: 0xe63946,
  chai: 0xf4a261,
  magnet: 0x2a9d8f,
  double: 0xffc857,
  shield: 0x4a90d9,
};

export class PowerUp {
  container: Phaser.GameObjects.Container;
  kind: PowerUpKind;
  active = true;
  depth = 0;
  lane = 0;
  private bob = 0;

  constructor(scene: Phaser.Scene, kind: PowerUpKind, x: number, y: number) {
    this.kind = kind;
    this.container = scene.add.container(x, y);

    const g = scene.add.graphics();
    g.fillStyle(COLORS[kind], 1);
    g.fillRoundedRect(-22, -22, 44, 44, 10);
    g.lineStyle(3, 0xffffff, 0.85);
    g.strokeRoundedRect(-22, -22, 44, 44, 10);

    const label = scene.add
      .text(0, 0, LABELS[kind], {
        fontFamily: 'Arial Black, Arial',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.container.add([g, label]);
    this.container.setDepth(28);
  }

  update(dt: number) {
    this.bob += dt * 5;
    // slight bob without breaking depth position – applied as offset in scene if needed
  }

  getBounds(): Phaser.Geom.Rectangle {
    const s = this.container.scaleX;
    return new Phaser.Geom.Rectangle(
      this.container.x - 22 * s,
      this.container.y - 22 * s,
      44 * s,
      44 * s,
    );
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

export function randomPowerUp(): PowerUpKind {
  const kinds: PowerUpKind[] = ['bat', 'chai', 'magnet', 'double', 'shield'];
  return kinds[Math.floor(Math.random() * kinds.length)];
}
