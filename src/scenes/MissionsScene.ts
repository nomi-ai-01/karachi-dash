import Phaser from 'phaser';
import { CONFIG, PALETTE } from '../data/config';
import { loadSave, writeSave } from '../data/save';
import { ensureDailyMissions, getMissionDef } from '../data/missions';
import { audio } from '../audio/AudioManager';

export class MissionsScene extends Phaser.Scene {
  constructor() {
    super('Missions');
  }

  create() {
    const save = loadSave();
    ensureDailyMissions(save);
    writeSave(save);

    this.cameras.main.setBackgroundColor(PALETTE.midnight);

    this.add
      .text(CONFIG.VIEW_WIDTH / 2, 40, 'DAILY MISSIONS', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#ffc857',
        stroke: '#0b1c2c',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(CONFIG.VIEW_WIDTH / 2, 75, 'Resets every day', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#90e0ef',
      })
      .setOrigin(0.5);

    save.missions.daily.forEach((m, i) => {
      const def = getMissionDef(m.id);
      const y = 130 + i * 130;
      const pct = Math.min(1, m.progress / m.target);

      this.add
        .rectangle(CONFIG.VIEW_WIDTH / 2, y, CONFIG.VIEW_WIDTH - 40, 110, 0x15202b, 1)
        .setStrokeStyle(2, m.claimed ? 0x2a9d8f : 0x334455);

      this.add
        .text(36, y - 28, def?.label ?? m.id, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#fefae0',
        })
        .setOrigin(0, 0.5);

      // Progress bar
      this.add.rectangle(CONFIG.VIEW_WIDTH / 2, y + 8, CONFIG.VIEW_WIDTH - 80, 16, 0x0b1c2c, 1);
      this.add
        .rectangle(
          40 + ((CONFIG.VIEW_WIDTH - 80) * pct) / 2,
          y + 8,
          (CONFIG.VIEW_WIDTH - 80) * pct,
          16,
          0xffc857,
          1,
        )
        .setOrigin(0, 0.5);

      this.add
        .text(CONFIG.VIEW_WIDTH / 2, y + 8, `${Math.min(m.progress, m.target)} / ${m.target}`, {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#0b1c2c',
        })
        .setOrigin(0.5);

      const canClaim = !m.claimed && m.progress >= m.target;
      const btnLabel = m.claimed ? 'Claimed ✓' : canClaim ? `Claim +${def?.rewardCoins ?? 0}` : 'In progress';
      const btn = this.add
        .text(CONFIG.VIEW_WIDTH / 2, y + 38, btnLabel, {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: canClaim ? '#0b1c2c' : '#888899',
          backgroundColor: canClaim ? '#ffc857' : '#1a1a2e',
          padding: { x: 14, y: 6 },
        })
        .setOrigin(0.5);

      if (canClaim) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          audio.playPowerup();
          const s = loadSave();
          const mission = s.missions.daily.find((x) => x.id === m.id);
          if (mission && !mission.claimed && mission.progress >= mission.target) {
            mission.claimed = true;
            s.coins += def?.rewardCoins ?? 30;
            if (def?.rewardGems) s.gems += def.rewardGems;
            writeSave(s);
            this.scene.restart();
          }
        });
      }
    });

    const back = this.add
      .text(CONFIG.VIEW_WIDTH / 2, CONFIG.VIEW_HEIGHT - 45, '← Back', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#90e0ef',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      audio.playUI();
      this.scene.start('Menu');
    });
  }
}
