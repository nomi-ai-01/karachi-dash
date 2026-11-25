import Phaser from 'phaser';
import { PALETTE } from '../data/config';

/**
 * Pre-renders static art into textures once.
 * No per-frame Graphics allocations for repeated assets.
 */
export class TextureFactory {
  private static generated = new Set<string>();

  static ensure(scene: Phaser.Scene) {
    if (this.generated.has('kd-ready')) return;
    this.generated.add('kd-ready');

    this.makeRoadStripe(scene);
    this.makeCoin(scene);
    this.makeGoldenCoin(scene);
    this.makeParticleDot(scene);
    this.makeHeadlightGlow(scene);
    this.makeShadowEllipse(scene);
    this.makeBuildingSilhouette(scene);
    this.makePalm(scene);
    this.makeBanner(scene);
  }

  private static makeRoadStripe(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xf4a261, 0.95);
    g.fillRect(0, 0, 6, 36);
    g.generateTexture('tex-stripe', 6, 36);
    g.destroy();
  }

  private static makeCoin(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffc857, 1);
    g.fillCircle(14, 14, 13);
    g.lineStyle(2.5, 0xe9c46a, 1);
    g.strokeCircle(14, 14, 13);
    g.fillStyle(0xe9c46a, 1);
    g.fillCircle(14, 14, 6);
    // tiny chai swirl
    g.lineStyle(1.5, 0xc9a227, 0.8);
    g.beginPath();
    g.arc(14, 14, 4, 0.2, 4.5, false);
    g.strokePath();
    g.generateTexture('tex-coin', 28, 28);
    g.destroy();
  }

  private static makeGoldenCoin(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffc857, 1);
    g.fillCircle(18, 18, 17);
    g.fillStyle(0xe63946, 1);
    g.fillCircle(18, 18, 11);
    g.fillStyle(0xf4a261, 1);
    g.fillCircle(14, 15, 3.5);
    g.fillCircle(22, 20, 2.8);
    g.fillStyle(0xffe08a, 0.9);
    g.fillCircle(18, 12, 2);
    g.generateTexture('tex-golden', 36, 36);
    g.destroy();
  }

  private static makeParticleDot(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('tex-dot', 8, 8);
    g.destroy();
  }

  private static makeHeadlightGlow(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xfff3b0, 0.55);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(16, 16, 8);
    g.generateTexture('tex-glow', 32, 32);
    g.destroy();
  }

  private static makeShadowEllipse(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(40, 12, 80, 24);
    g.generateTexture('tex-shadow', 80, 24);
    g.destroy();
  }

  private static makeBuildingSilhouette(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    // simple blocky building with window grid
    g.fillStyle(0x1a2a3a, 1);
    g.fillRect(0, 20, 48, 80);
    g.fillStyle(0x0f1a24, 1);
    g.fillRect(4, 0, 40, 24);
    g.fillStyle(0xffc857, 0.25);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        g.fillRect(8 + col * 12, 28 + row * 16, 8, 10);
      }
    }
    g.generateTexture('tex-building', 48, 100);
    g.destroy();
  }

  private static makePalm(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x5c4033, 1);
    g.fillRect(14, 40, 8, 50);
    g.fillStyle(0x2a9d8f, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillTriangle(
        18,
        42,
        18 + Math.cos(a) * 22,
        42 + Math.sin(a) * 14 - 8,
        18 + Math.cos(a + 0.4) * 18,
        42 + Math.sin(a + 0.4) * 10 - 4,
      );
    }
    g.generateTexture('tex-palm', 36, 90);
    g.destroy();
  }

  private static makeBanner(scene: Phaser.Scene) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xe63980, 1);
    g.fillRoundedRect(0, 0, 70, 22, 4);
    g.lineStyle(2, 0xffc857, 1);
    g.strokeRoundedRect(0, 0, 70, 22, 4);
    g.fillStyle(0xffc857, 1);
    g.fillTriangle(8, 11, 14, 6, 14, 16);
    g.fillTriangle(62, 11, 56, 6, 56, 16);
    g.generateTexture('tex-banner', 70, 22);
    g.destroy();
  }
}
