import Phaser from 'phaser';
import { CONFIG, PALETTE, WORLDS } from '../data/config';
import { loadSave } from '../data/save';
import { audio } from '../audio/AudioManager';

/**
 * Level / world select – 5 Karachi zones.
 * Stars from save.worldStars. Tap to play (Version 1 runs same GameScene; zone tint applied).
 */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create() {
    const save = loadSave();
    this.cameras.main.setBackgroundColor(PALETTE.midnight);

    this.add
      .text(CONFIG.VIEW_WIDTH / 2, 36, 'SELECT ZONE', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#ffc857',
        stroke: '#0b1c2c',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    WORLDS.forEach((world, i) => {
      const y = 90 + i * 110;
      const stars = save.worldStars[world.id] ?? 0;
      const unlocked = i === 0 || (save.worldStars[WORLDS[i - 1].id] ?? 0) >= 1;

      const card = this.add
        .rectangle(CONFIG.VIEW_WIDTH / 2, y, CONFIG.VIEW_WIDTH - 40, 96, unlocked ? 0x15202b : 0x0f151c, 1)
        .setStrokeStyle(2, unlocked ? 0xffc857 : 0x333344)
        .setInteractive({ useHandCursor: unlocked });

      // Sky preview strip
      this.add.rectangle(60, y, 48, 72, world.skyTop, 1).setStrokeStyle(1, 0xffffff, 0.3);

      this.add
        .text(100, y - 18, world.name, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: unlocked ? '#fefae0' : '#555566',
        })
        .setOrigin(0, 0.5);

      const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      this.add
        .text(100, y + 12, unlocked ? starStr : '🔒 Locked', {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: unlocked ? '#ffc857' : '#555566',
        })
        .setOrigin(0, 0.5);

      this.add
        .text(CONFIG.VIEW_WIDTH - 50, y, `${world.durationSec}s`, {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#90e0ef',
        })
        .setOrigin(0.5);

      if (unlocked) {
        card.on('pointerdown', () => {
          audio.playUI();
          // Pass world id via registry
          this.registry.set('worldId', world.id);
          this.scene.start('Game');
        });
      }
    });

    const back = this.add
      .text(CONFIG.VIEW_WIDTH / 2, CONFIG.VIEW_HEIGHT - 40, '← Back', {
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
