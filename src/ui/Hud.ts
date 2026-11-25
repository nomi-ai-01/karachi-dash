import Phaser from 'phaser';
import { CONFIG, PALETTE } from '../data/config';

/**
 * Professional in-game HUD – score, coins, combo, timer, power-ups, zone.
 * All elements outside thumb zone; high contrast.
 */
export class Hud {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private scoreText: Phaser.GameObjects.Text;
  private coinText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private powerText: Phaser.GameObjects.Text;
  private zoneText: Phaser.GameObjects.Text;
  private topBar: Phaser.GameObjects.Rectangle;
  private comboBg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, zoneName: string) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(100);

    // Semi-transparent top bar
    this.topBar = scene.add
      .rectangle(CONFIG.VIEW_WIDTH / 2, 28, CONFIG.VIEW_WIDTH, 56, 0x0b1c2c, 0.55)
      .setStrokeStyle(1, 0xffc857, 0.25);
    this.root.add(this.topBar);

    // Score (left)
    this.scoreText = scene.add
      .text(16, 16, '0', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#fefae0',
        stroke: '#0b1c2c',
        strokeThickness: 4,
      })
      .setOrigin(0, 0);
    this.root.add(this.scoreText);

    // Zone name
    this.zoneText = scene.add
      .text(16, 44, zoneName, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#90e0ef',
      })
      .setOrigin(0, 0);
    this.root.add(this.zoneText);

    // Coins (right)
    this.coinText = scene.add
      .text(CONFIG.VIEW_WIDTH - 16, 16, '0', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffc857',
        stroke: '#0b1c2c',
        strokeThickness: 3,
      })
      .setOrigin(1, 0);
    this.root.add(this.coinText);

    // Timer
    this.timerText = scene.add
      .text(CONFIG.VIEW_WIDTH - 16, 42, '90s', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#fefae0',
      })
      .setOrigin(1, 0);
    this.root.add(this.timerText);

    // Combo (center, hidden until active)
    this.comboBg = scene.add
      .rectangle(CONFIG.VIEW_WIDTH / 2, 72, 100, 26, 0xe63980, 0.85)
      .setVisible(false);
    this.comboText = scene.add
      .text(CONFIG.VIEW_WIDTH / 2, 72, '', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.root.add([this.comboBg, this.comboText]);

    // Active powers
    this.powerText = scene.add
      .text(CONFIG.VIEW_WIDTH / 2, 98, '', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#90e0ef',
      })
      .setOrigin(0.5, 0);
    this.root.add(this.powerText);
  }

  update(opts: {
    score: number;
    coins: number;
    combo: number;
    timeLeft: number;
    powers: string;
  }) {
    this.scoreText.setText(Math.floor(opts.score).toLocaleString());
    this.coinText.setText(`🪙 ${opts.coins}`);
    this.timerText.setText(`${Math.max(0, opts.timeLeft)}s`);
    // Timer turns red when low
    this.timerText.setColor(opts.timeLeft <= 15 ? '#e63946' : '#fefae0');

    if (opts.combo > 1) {
      this.comboText.setText(`x${opts.combo} COMBO`);
      this.comboText.setVisible(true);
      this.comboBg.setVisible(true);
      this.comboBg.width = 70 + String(opts.combo).length * 14;
    } else {
      this.comboText.setVisible(false);
      this.comboBg.setVisible(false);
    }

    this.powerText.setText(opts.powers);
  }

  flashScore() {
    this.scene.tweens.add({
      targets: this.scoreText,
      scale: 1.15,
      duration: 80,
      yoyo: true,
    });
  }

  destroy() {
    this.root.destroy(true);
  }
}
