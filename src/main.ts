import Phaser from 'phaser';
import { CONFIG } from './data/config';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ShopScene } from './scenes/ShopScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MissionsScene } from './scenes/MissionsScene';
import { DailyRewardScene } from './scenes/DailyRewardScene';

// Render at 2x so sprites and text stay sharp on phone screens.
// All game code keeps working in the logical 420x780 space.
const S = 2;

const camProto = (Phaser.Cameras.Scene2D.CameraManager as any).prototype;
const origCamStart = camProto.start;
camProto.start = function (this: any) {
  origCamStart.call(this);
  if (this.main) this.main.setOrigin(0, 0).setZoom(S);
};

const factoryProto = (Phaser.GameObjects.GameObjectFactory as any).prototype;
const origText = factoryProto.text;
factoryProto.text = function (this: any, ...args: unknown[]) {
  const t = origText.apply(this, args);
  t.setResolution(S);
  return t;
};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.VIEW_WIDTH * S,
  height: CONFIG.VIEW_HEIGHT * S,
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
