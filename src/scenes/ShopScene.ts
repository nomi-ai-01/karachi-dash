import Phaser from 'phaser';
import { CONFIG, PALETTE } from '../data/config';
import { loadSave, writeSave, SKIN_CATALOG } from '../data/save';
import { audio } from '../audio/AudioManager';
import { TextureFactory } from '../utils/TextureFactory';

const SKIN_COLORS: Record<string, number> = {
  classic: 0xe63946,
  emerald: 0x2a9d8f,
  royal: 0x4a3f8c,
  sunset: 0xe76f51,
  ocean: 0x0077b6,
  marigold: 0xf4a261,
  midnight: 0x1d3557,
  cream: 0xfefae0,
};

/**
 * Shop – 8 truck-art rickshaw skins.
 * Buy with coins, equip, preview colour swatch.
 */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    TextureFactory.ensure(this);
    const save = loadSave();
    this.cameras.main.setBackgroundColor(PALETTE.midnight);

    // Frame
    const frame = this.add.graphics();
    frame.lineStyle(6, 0xffc857, 1);
    frame.strokeRoundedRect(10, 10, CONFIG.VIEW_WIDTH - 20, CONFIG.VIEW_HEIGHT - 20, 14);

    this.add
      .text(CONFIG.VIEW_WIDTH / 2, 40, 'SHOP', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '32px',
        color: '#ffc857',
        stroke: '#0b1c2c',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const coinsTxt = this.add
      .text(CONFIG.VIEW_WIDTH / 2, 78, `Coins  ${save.coins}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#fefae0',
      })
      .setOrigin(0.5);

    // Skin grid 2 columns
    const startY = 120;
    const colW = CONFIG.VIEW_WIDTH / 2;
    SKIN_CATALOG.forEach((skin, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = colW * col + colW / 2;
      const y = startY + row * 100;

      const owned = save.unlockedSkins.includes(skin.id);
      const selected = save.selectedSkin === skin.id;
      const color = SKIN_COLORS[skin.id] ?? 0xe63946;

      const bg = this.add
        .rectangle(x, y, colW - 24, 88, selected ? 0x1a3a4a : 0x15202b, 1)
        .setStrokeStyle(2, selected ? 0xffc857 : 0x334455)
        .setInteractive({ useHandCursor: true });

      // Colour swatch (mini rickshaw canopy)
      this.add.rectangle(x - 50, y, 36, 28, color, 1).setStrokeStyle(2, 0xffc857);

      this.add
        .text(x + 10, y - 16, skin.name, {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#fefae0',
        })
        .setOrigin(0.5, 0.5);

      let status = '';
      if (selected) status = 'EQUIPPED';
      else if (owned) status = 'OWNED';
      else status = `${skin.price} coins`;

      const statusTxt = this.add
        .text(x + 10, y + 14, status, {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: selected ? '#ffc857' : owned ? '#90e0ef' : '#e63980',
        })
        .setOrigin(0.5, 0.5);

      bg.on('pointerdown', () => {
        audio.playUI();
        const s = loadSave();
        if (s.unlockedSkins.includes(skin.id)) {
          s.selectedSkin = skin.id;
          writeSave(s);
          this.scene.restart();
          return;
        }
        if (s.coins >= skin.price) {
          s.coins -= skin.price;
          s.unlockedSkins.push(skin.id);
          s.selectedSkin = skin.id;
          writeSave(s);
          audio.playPowerup();
          this.scene.restart();
        } else {
          statusTxt.setText('Not enough!');
          this.time.delayedCall(800, () => statusTxt.setText(`${skin.price} coins`));
        }
      });
    });

    // Back
    const back = this.add
      .text(CONFIG.VIEW_WIDTH / 2, CONFIG.VIEW_HEIGHT - 50, '← Back', {
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
