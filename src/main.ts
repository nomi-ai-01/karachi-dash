import Phaser from 'phaser';
import { CONFIG } from './data/config';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

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
  input: {
    activePointers: 2,
  },
  scene: [MenuScene, GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
};

// Prevent pull-to-refresh / overscroll on mobile
document.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

new Phaser.Game(config);
