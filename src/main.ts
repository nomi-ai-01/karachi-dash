import Phaser from 'phaser';
import { CONFIG } from './data/config';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ShopScene } from './scenes/ShopScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MissionsScene } from './scenes/MissionsScene';
import { DailyRewardScene } from './scenes/DailyRewardScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.VIEW_WIDTH,
  height: CONFIG.VIEW_HEIGHT,
  backgroundColor: '#0b1c2c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [
    PreloadScene,
    MenuScene,
    GameScene,
    ShopScene,
    LevelSelectScene,
    MissionsScene,
    DailyRewardScene,
  ],
  fps: { target: 60, forceSetTimeOut: false },
  render: { antialias: true, pixelArt: false, roundPixels: false },
};

document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
new Phaser.Game(config);
