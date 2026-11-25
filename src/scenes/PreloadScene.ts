import Phaser from 'phaser';
import { CONFIG, PALETTE } from '../data/config';
import { TextureFactory } from '../utils/TextureFactory';

/**
 * Boot + preload.
 * Loads optional PNGs from public/assets/. Missing files are fine –
 * TextureFactory procedural art is always generated as fallback.
 *
 * Expected optional files (see SPRITE_LIST.md):
 *   atlas.png + atlas.json
 *   rickshaw_*.png, bus.png, bg_saddar.png, coin_chai.png, ...
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const W = CONFIG.VIEW_WIDTH;
    const H = CONFIG.VIEW_HEIGHT;
    this.cameras.main.setBackgroundColor(PALETTE.midnight);

    // Truck-art loading bar
    this.add
      .text(W / 2, H / 2 - 56, 'KARACHI DASH', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '28px',
        color: '#ffc857',
      })
      .setOrigin(0.5);

    this.add.rectangle(W / 2, H / 2, 280, 28, 0x1a1a2e, 1).setStrokeStyle(3, 0xffc857);
    const barFill = this.add.rectangle(W / 2 - 136, H / 2, 4, 18, 0xffc857, 1).setOrigin(0, 0.5);
    const status = this.add
      .text(W / 2, H / 2 + 44, 'Loading assets...', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#90e0ef',
      })
      .setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      barFill.width = Math.max(4, 272 * v);
    });

    // Don't fail the boot if a file is missing
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.info('[Preload] optional asset skipped:', file.key);
    });

    // Texture atlas (preferred)
    this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');

    // Individual sprites
    const sprites = [
      // Skins
      'rickshaw_classic', 'rickshaw_emerald', 'rickshaw_royal', 'rickshaw_sunset',
      'rickshaw_ocean', 'rickshaw_marigold', 'rickshaw_midnight', 'rickshaw_cream',
      // Obstacles
      'bus', 'minibus', 'cart', 'thela', 'manhole', 'wire_banner', 'cricket_ball',
      // Collectibles
      'coin_chai', 'coin_golden',
      'power_bat', 'power_chai', 'power_magnet', 'power_double', 'power_shield',
      // Backgrounds
      'bg_saddar', 'bg_clifton', 'bg_quaid', 'bg_keamari', 'bg_burns',
      // HUD
      'score_icon', 'coin_icon', 'combo_icon', 'pause_icon',
    ];
    for (const key of sprites) {
      this.load.image(key, `assets/${key}.png`);
    }
  }

  create() {
    TextureFactory.ensure(this);
    // Small delay so "Ready" is readable
    this.time.delayedCall(200, () => this.scene.start('Menu'));
  }
}

/** Helper: prefer loaded texture key, else null (caller uses procedural). */
export function spriteKey(scene: Phaser.Scene, key: string): string | null {
  if (scene.textures.exists(key)) return key;
  if (scene.textures.exists('atlas') && scene.textures.get('atlas').has(key)) return key;
  return null;
}
