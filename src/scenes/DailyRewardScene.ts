import Phaser from 'phaser';
import { CONFIG, PALETTE } from '../data/config';
import { loadSave, writeSave } from '../data/save';
import { todayKey } from '../data/missions';
import { audio } from '../audio/AudioManager';

const WHEEL_REWARDS = [
  { label: '20 coins', coins: 20, gems: 0 },
  { label: '40 coins', coins: 40, gems: 0 },
  { label: '10 coins', coins: 10, gems: 0 },
  { label: '1 gem', coins: 0, gems: 1 },
  { label: '60 coins', coins: 60, gems: 0 },
  { label: '30 coins', coins: 30, gems: 0 },
  { label: '2 gems', coins: 0, gems: 2 },
  { label: '100 coins', coins: 100, gems: 0 },
];

/**
 * Daily login reward – spin wheel, once per day.
 */
export class DailyRewardScene extends Phaser.Scene {
  private spinning = false;
  private wheel!: Phaser.GameObjects.Container;

  constructor() {
    super('DailyReward');
  }

  create() {
    const save = loadSave();
    this.cameras.main.setBackgroundColor(PALETTE.midnight);

    this.add
      .text(CONFIG.VIEW_WIDTH / 2, 40, 'DAILY REWARD', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#ffc857',
        stroke: '#0b1c2c',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const already = save.dailyReward.lastClaim === todayKey();
    this.add
      .text(CONFIG.VIEW_WIDTH / 2, 78, already ? 'Already claimed today' : `Streak: ${save.dailyReward.streak} days`, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: already ? '#e63980' : '#90e0ef',
      })
      .setOrigin(0.5);

    // Wheel
    this.wheel = this.add.container(CONFIG.VIEW_WIDTH / 2, 320);
    const r = 130;
    const seg = (Math.PI * 2) / WHEEL_REWARDS.length;
    const colors = [0xe63946, 0xffc857, 0x2a9d8f, 0x4a3f8c, 0xe76f51, 0x0077b6, 0xf4a261, 0x1d3557];

    WHEEL_REWARDS.forEach((reward, i) => {
      const g = this.add.graphics();
      g.fillStyle(colors[i % colors.length], 1);
      g.slice(0, 0, r, i * seg - Math.PI / 2, (i + 1) * seg - Math.PI / 2, false);
      g.fillPath();
      g.lineStyle(2, 0x0b1c2c, 0.8);
      g.slice(0, 0, r, i * seg - Math.PI / 2, (i + 1) * seg - Math.PI / 2, false);
      g.strokePath();
      this.wheel.add(g);

      const mid = i * seg + seg / 2 - Math.PI / 2;
      const lx = Math.cos(mid) * (r * 0.62);
      const ly = Math.sin(mid) * (r * 0.62);
      const t = this.add
        .text(lx, ly, reward.label, {
          fontFamily: 'Arial',
          fontSize: '11px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setRotation(mid + Math.PI / 2);
      this.wheel.add(t);
    });

    // Center hub
    this.add.circle(CONFIG.VIEW_WIDTH / 2, 320, 22, 0xffc857, 1).setStrokeStyle(3, 0x0b1c2c);
    // Pointer
    this.add.triangle(CONFIG.VIEW_WIDTH / 2, 175, 0, 0, -12, -24, 12, -24, 0xe63946).setDepth(10);

    const resultTxt = this.add
      .text(CONFIG.VIEW_WIDTH / 2, 480, '', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffc857',
      })
      .setOrigin(0.5);

    if (!already) {
      const spinBtn = this.add
        .text(CONFIG.VIEW_WIDTH / 2, 520, '  SPIN  ', {
          fontFamily: 'Arial Black, Arial',
          fontSize: '24px',
          color: '#0b1c2c',
          backgroundColor: '#ffc857',
          padding: { x: 28, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      spinBtn.on('pointerdown', () => {
        if (this.spinning) return;
        this.spinning = true;
        audio.playUI();
        const winIndex = Math.floor(Math.random() * WHEEL_REWARDS.length);
        const segAngle = 360 / WHEEL_REWARDS.length;
        // Land pointer on segment: rotate so segment center is at top
        const targetRot =
          360 * 5 + (360 - winIndex * segAngle - segAngle / 2);

        this.tweens.add({
          targets: this.wheel,
          angle: targetRot,
          duration: 3200,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            const reward = WHEEL_REWARDS[winIndex];
            resultTxt.setText(`You won ${reward.label}!`);
            audio.playPowerup();
            const s = loadSave();
            s.coins += reward.coins;
            s.gems += reward.gems;
            const today = todayKey();
            if (s.dailyReward.lastClaim) {
              // simple streak: if yesterday-ish just increment; else reset
              s.dailyReward.streak += 1;
            } else {
              s.dailyReward.streak = 1;
            }
            s.dailyReward.lastClaim = today;
            writeSave(s);
            spinBtn.setVisible(false);
            this.spinning = false;
          },
        });
      });
    } else {
      resultTxt.setText('Come back tomorrow!');
    }

    const back = this.add
      .text(CONFIG.VIEW_WIDTH / 2, CONFIG.VIEW_HEIGHT - 40, '← Back', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#90e0ef',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      if (this.spinning) return;
      audio.playUI();
      this.scene.start('Menu');
    });
  }
}
