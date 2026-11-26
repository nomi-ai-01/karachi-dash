import Phaser from 'phaser';
import { CONFIG, PALETTE } from '../data/config';
import { loadSave } from '../data/save';
import { audio } from '../audio/AudioManager';
import { TextureFactory } from '../utils/TextureFactory';
import { ensureDailyMissions } from '../data/missions';
import { writeSave } from '../data/save';

export class MenuScene extends Phaser.Scene {
  private parallaxLayers: Phaser.GameObjects.Container[] = [];
  private roadOffset = 0;

  constructor() {
    super('Menu');
  }

  create() {
    TextureFactory.ensure(this);
    const save = loadSave();
    ensureDailyMissions(save);
    writeSave(save);

    this.cameras.main.setBackgroundColor(PALETTE.midnight);
    this.add
      .text(CONFIG.VIEW_WIDTH - 14, CONFIG.VIEW_HEIGHT - 26, 'v6', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#8fb3c9',
      })
      .setOrigin(1, 0.5)
      .setDepth(100);

    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x0b3d4c, 0x0b3d4c, 0x1a1a2e, 0x1a1a2e, 1);
    sky.fillRect(0, 0, CONFIG.VIEW_WIDTH, CONFIG.VIEW_HEIGHT);

    this.buildParallax();

    const frame = this.add.graphics().setDepth(90);
    frame.lineStyle(8, 0xffc857, 1);
    frame.strokeRoundedRect(8, 8, CONFIG.VIEW_WIDTH - 16, CONFIG.VIEW_HEIGHT - 16, 18);
    frame.lineStyle(3, 0xe63980, 0.85);
    frame.strokeRoundedRect(18, 18, CONFIG.VIEW_WIDTH - 36, CONFIG.VIEW_HEIGHT - 36, 14);

    this.add.text(CONFIG.VIEW_WIDTH / 2, 58, 'KARACHI', {
      fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffc857',
      stroke: '#0b1c2c', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(93);

    this.add.text(CONFIG.VIEW_WIDTH / 2, 102, 'DASH', {
      fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#e63946',
      stroke: '#0b1c2c', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(93);

    this.add.text(CONFIG.VIEW_WIDTH / 2, 140, 'One-thumb rickshaw runner', {
      fontFamily: 'Arial', fontSize: '13px', color: '#90e0ef',
    }).setOrigin(0.5).setDepth(93);

    // Hero preview
    const hero = this.buildHeroRickshaw();
    hero.setPosition(CONFIG.VIEW_WIDTH / 2, 250).setDepth(40).setScale(0.85);
    this.tweens.add({ targets: hero, y: 258, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(CONFIG.VIEW_WIDTH / 2, 330, `Best ${save.highScore}  ·  Coins ${save.coins}`, {
      fontFamily: 'Arial', fontSize: '15px', color: '#fefae0', stroke: '#0b1c2c', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(93);

    // PLAY
    const play = this.add.text(CONFIG.VIEW_WIDTH / 2, 380, '  PLAY  ', {
      fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#0b1c2c',
      backgroundColor: '#ffc857', padding: { x: 32, y: 12 },
    }).setOrigin(0.5).setDepth(95).setInteractive({ useHandCursor: true });
    play.on('pointerdown', () => {
      audio.unlock().then(() => { audio.playUI(); audio.startMusic(); });
      this.registry.set('worldId', 'saddar');
      this.scene.start('Game');
    });

    // Secondary buttons row
    const mkBtn = (x: number, y: number, label: string, scene: string) => {
      const t = this.add.text(x, y, label, {
        fontFamily: 'Arial', fontSize: '14px', color: '#fefae0',
        backgroundColor: '#1a2a3a', padding: { x: 12, y: 8 },
      }).setOrigin(0.5).setDepth(95).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => { audio.playUI(); this.scene.start(scene); });
      return t;
    };

    mkBtn(CONFIG.VIEW_WIDTH * 0.25, 450, 'Zones', 'LevelSelect');
    mkBtn(CONFIG.VIEW_WIDTH * 0.5, 450, 'Shop', 'Shop');
    mkBtn(CONFIG.VIEW_WIDTH * 0.75, 450, 'Missions', 'Missions');
    mkBtn(CONFIG.VIEW_WIDTH * 0.5, 500, 'Daily Reward', 'DailyReward');

    this.add.text(CONFIG.VIEW_WIDTH / 2, CONFIG.VIEW_HEIGHT - 36, 'Swipe ← → lanes  ·  ↑ jump  ·  ↓ slide', {
      fontFamily: 'Arial', fontSize: '12px', color: '#90e0ef',
    }).setOrigin(0.5).setDepth(93);
  }

  private buildParallax() {
    const far = this.add.container(0, 0).setDepth(5);
    for (let i = 0; i < 10; i++) {
      far.add(this.add.image(i * 55 - 20, 180, 'tex-building').setScale(0.6).setAlpha(0.4));
    }
    this.parallaxLayers.push(far);
    const mid = this.add.container(0, 0).setDepth(8);
    for (let i = 0; i < 8; i++) {
      mid.add(this.add.image(i * 70, 200, 'tex-building').setScale(0.9).setAlpha(0.65));
    }
    this.parallaxLayers.push(mid);
  }

  private buildHeroRickshaw(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    if (this.textures.exists('rickshaw_classic')) {
      const img = this.add.image(0, 42, 'rickshaw_classic').setOrigin(0.5, 1);
      img.setScale(130 / img.height);
      c.add(img);
      return c;
    }
    const g = this.add.graphics();
    g.fillStyle(0xe63946, 1);
    g.fillRoundedRect(-45, -60, 90, 55, 10);
    g.lineStyle(4, 0xffc857, 1);
    g.strokeRoundedRect(-45, -60, 90, 55, 10);
    g.fillStyle(0xffc857, 1);
    g.fillTriangle(0, -52, -10, -40, 10, -40);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(-40, -8, 80, 28, 5);
    for (const wx of [-28, 28]) {
      g.fillStyle(0x0a0a0a, 1);
      g.fillCircle(wx, 26, 14);
      g.fillStyle(0x555, 1);
      g.fillCircle(wx, 26, 5);
    }
    g.fillStyle(0xfff8e0, 1);
    g.fillCircle(-18, 6, 5);
    g.fillCircle(18, 6, 5);
    c.add(g);
    c.add(this.add.circle(0, -42, 10, 0xf4c7a1));
    return c;
  }

  update(_: number, delta: number) {
    this.roadOffset += delta * 0.03;
    if (this.parallaxLayers[0]) this.parallaxLayers[0].x = -((this.roadOffset * 0.2) % 55);
    if (this.parallaxLayers[1]) this.parallaxLayers[1].x = -((this.roadOffset * 0.4) % 70);
  }
}
