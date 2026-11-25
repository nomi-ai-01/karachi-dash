import Phaser from 'phaser';
import { CONFIG } from '../data/config';
import { lerp, easeOutCubic } from '../utils/math';

export type Lane = 0 | 1 | 2;

const SKINS: Record<string, { main: number; accent: number; trim: number }> = {
  classic: { main: 0xe63946, accent: 0xffc857, trim: 0xffe08a },
  emerald: { main: 0x2a9d8f, accent: 0xf4a261, trim: 0xffc857 },
  royal: { main: 0x4a3f8c, accent: 0xffc857, trim: 0xe9c46a },
  sunset: { main: 0xe76f51, accent: 0xf4a261, trim: 0xffc857 },
  ocean: { main: 0x0077b6, accent: 0x90e0ef, trim: 0xcaf0f8 },
  marigold: { main: 0xf4a261, accent: 0xe63980, trim: 0xffc857 },
  midnight: { main: 0x1d3557, accent: 0xe63980, trim: 0xffc857 },
  cream: { main: 0xfefae0, accent: 0xe63946, trim: 0xffc857 },
};

export class Rickshaw {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Image;
  private glowL: Phaser.GameObjects.Image;
  private glowR: Phaser.GameObjects.Image;
  private tasselGroup: Phaser.GameObjects.Container;
  private lane: Lane = 1;
  private targetLane: Lane = 1;
  private laneT = 1;
  private fromX = 0;
  private jumping = false;
  private sliding = false;
  private jumpT = 0;
  private slideT = 0;
  private invuln = 0;
  private lean = 0;
  private tasselPhase = 0;

  constructor(scene: Phaser.Scene, skin = 'classic') {
    const colors = SKINS[skin] || SKINS.classic;
    this.container = scene.add.container(0, 0);
    this.shadow = scene.add.image(0, 34, 'tex-shadow').setAlpha(0.45).setScale(1.1, 1);
    this.body = scene.add.container(0, 0);
    this.tasselGroup = scene.add.container(0, 0);
    this.drawRickshaw(scene, colors);
    this.glowL = scene.add.image(-20, 6, 'tex-glow').setScale(0.7).setAlpha(0.7);
    this.glowR = scene.add.image(20, 6, 'tex-glow').setScale(0.7).setAlpha(0.7);
    this.container.add([this.shadow, this.body, this.glowL, this.glowR]);
    this.container.setDepth(50);
  }

  private drawRickshaw(scene: Phaser.Scene, c: { main: number; accent: number; trim: number }) {
    const g = scene.add.graphics();
    g.fillStyle(c.main, 1);
    g.fillRoundedRect(-42, -58, 84, 52, 10);
    g.lineStyle(4, c.accent, 1);
    g.strokeRoundedRect(-42, -58, 84, 52, 10);
    g.lineStyle(2, c.trim, 0.9);
    g.strokeRoundedRect(-37, -53, 74, 42, 7);
    g.fillStyle(c.accent, 0.95);
    g.fillTriangle(0, -50, -10, -38, 10, -38);
    g.fillTriangle(0, -26, -10, -38, 10, -38);
    for (const sx of [-26, 26]) {
      g.fillCircle(sx, -42, 7);
      g.fillStyle(c.main, 1);
      g.fillCircle(sx, -42, 3.5);
      g.fillStyle(c.accent, 0.95);
    }
    g.fillStyle(c.trim, 0.85);
    g.fillCircle(-32, -50, 3);
    g.fillCircle(32, -50, 3);
    g.fillCircle(-32, -30, 3);
    g.fillCircle(32, -30, 3);
    g.fillStyle(c.accent, 1);
    for (let i = -3; i <= 3; i++) g.fillCircle(i * 11, -8, 5);
    g.fillStyle(Phaser.Display.Color.IntegerToColor(c.main).darken(25).color, 1);
    g.fillRoundedRect(-46, -12, 20, 38, 5);
    g.fillRoundedRect(26, -12, 20, 38, 5);
    g.lineStyle(2, c.accent, 0.8);
    g.strokeRoundedRect(-46, -12, 20, 38, 5);
    g.strokeRoundedRect(26, -12, 20, 38, 5);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(-40, -6, 80, 30, 6);
    g.fillStyle(0xcccccc, 0.7);
    g.fillRect(-38, 2, 76, 3);
    g.fillStyle(0x111111, 1);
    g.fillRect(-22, -30, 44, 22);
    for (const wx of [-30, 30]) {
      g.fillStyle(0x0a0a0a, 1);
      g.fillCircle(wx, 26, 15);
      g.fillStyle(0x333333, 1);
      g.fillCircle(wx, 26, 9);
      g.fillStyle(0x666666, 1);
      g.fillCircle(wx, 26, 4);
    }
    g.fillStyle(0xfff8e0, 1);
    g.fillCircle(-20, 8, 6);
    g.fillCircle(20, 8, 6);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-20, 8, 2.5);
    g.fillCircle(20, 8, 2.5);
    g.fillStyle(c.accent, 1);
    g.fillCircle(0, -4, 5);
    g.fillStyle(0x01411c, 1);
    g.fillRect(36, -78, 16, 12);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(44, -72, 3.5);
    g.lineStyle(2, 0x888888, 1);
    g.lineBetween(36, -78, 36, -58);
    this.body.add(g);

    const head = scene.add.circle(0, -40, 11, 0xf4c7a1);
    const hair = scene.add.graphics();
    hair.fillStyle(0x1a120c, 1);
    hair.fillEllipse(0, -48, 20, 10);
    const eyeL = scene.add.circle(-4, -41, 2.2, 0x1a120c);
    const eyeR = scene.add.circle(4, -41, 2.2, 0x1a120c);
    const smile = scene.add.graphics();
    smile.lineStyle(1.8, 0x333333, 1);
    smile.beginPath();
    smile.arc(0, -37, 4, 0.15, Math.PI - 0.15, false);
    smile.strokePath();
    this.body.add([hair, head, eyeL, eyeR, smile]);

    for (let i = -4; i <= 4; i++) {
      const tassel = scene.add.graphics();
      tassel.lineStyle(2.2, c.accent, 0.95);
      tassel.lineBetween(0, 0, (i % 2) * 2, 14);
      tassel.fillStyle(c.trim, 1);
      tassel.fillCircle((i % 2) * 2, 15, 2.5);
      tassel.x = i * 9;
      tassel.y = -58;
      this.tasselGroup.add(tassel);
    }
    this.body.add(this.tasselGroup);
  }

  getLane(): Lane { return this.lane; }

  /** Allow retarget mid-move; starts from current visual x. Allowed while jumping/sliding. */
  setLane(lane: Lane) {
    if (lane === this.targetLane) return;
    this.fromX = this.container.x;
    this.lane = this.lane; // keep logical until complete
    this.targetLane = lane;
    this.laneT = 0;
  }

  jump() {
    if (this.jumping || this.sliding) return false;
    this.jumping = true;
    this.jumpT = 0;
    return true;
  }

  slide() {
    if (this.jumping || this.sliding) return false;
    this.sliding = true;
    this.slideT = 0;
    return true;
  }

  isAirborne() { return this.jumping; }
  isSliding() { return this.sliding; }
  isInvulnerable() { return this.invuln > 0; }
  grantInvuln(ms: number) { this.invuln = Math.max(this.invuln, ms); }

  static laneToX(lane: number, centerX: number): number {
    return centerX + (lane - 1) * CONFIG.LANE_WIDTH;
  }

  update(dt: number, centerX: number, speedFactor: number) {
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / (CONFIG.LANE_SWITCH_MS / 1000));
      const t = easeOutCubic(this.laneT);
      const toX = Rickshaw.laneToX(this.targetLane, centerX);
      this.container.x = lerp(this.fromX, toX, t);
      this.lean = (toX - this.fromX) * 0.002 * (1 - t);
      if (this.laneT >= 1) {
        this.lane = this.targetLane;
        this.lean = 0;
        this.container.x = toX;
      }
    } else {
      this.container.x = Rickshaw.laneToX(this.lane, centerX);
    }

    let yOff = 0;
    if (this.jumping) {
      this.jumpT += dt / (CONFIG.JUMP_MS / 1000);
      const jt = Math.min(1, this.jumpT);
      yOff = -Math.sin(jt * Math.PI) * 98;
      if (this.jumpT >= 1) { this.jumping = false; this.jumpT = 0; }
    }

    let scaleY = 1, scaleX = 1;
    if (this.sliding) {
      this.slideT += dt / (CONFIG.SLIDE_MS / 1000);
      const st = Math.min(1, this.slideT);
      scaleY = 0.52 + 0.48 * Math.abs(st - 0.5) * 2;
      scaleX = 1.18 - 0.18 * Math.abs(st - 0.5) * 2;
      yOff = 14;
      if (this.slideT >= 1) { this.sliding = false; this.slideT = 0; }
    }

    const bounce = Math.sin(Date.now() / 160) * 2.2 * (this.jumping ? 0 : 1);
    this.container.y = CONFIG.VIEW_HEIGHT * CONFIG.PLAYER_Y + yOff + bounce * 0.35;
    this.body.setScale(scaleX, scaleY);
    this.body.rotation = this.lean;
    this.shadow.setScale(scaleX * (1 - Math.abs(yOff) / 220), 1);
    this.shadow.y = 34 + Math.abs(yOff) * 0.18;
    this.shadow.setAlpha(0.45 - Math.abs(yOff) / 280);

    const glowA = 0.45 + speedFactor * 0.4;
    this.glowL.setAlpha(glowA);
    this.glowR.setAlpha(glowA);

    this.tasselPhase += dt * (4 + speedFactor * 6);
    this.tasselGroup.iterate((child) => {
      (child as Phaser.GameObjects.Graphics).rotation =
        Math.sin(this.tasselPhase + (child as Phaser.GameObjects.Graphics).x * 0.08) * 0.25;
      return true;
    });

    if (this.invuln > 0) {
      this.invuln -= dt * 1000;
      this.body.setAlpha(Math.sin(Date.now() / 35) > 0 ? 1 : 0.35);
    } else {
      this.body.setAlpha(1);
    }
    this.body.y = -speedFactor * 4;
  }

  getBounds(): Phaser.Geom.Rectangle {
    const h = this.sliding ? 30 : this.jumping ? 42 : 58;
    return new Phaser.Geom.Rectangle(this.container.x - 26, this.container.y - h / 2, 52, h);
  }

  destroy() { this.container.destroy(true); }
}
