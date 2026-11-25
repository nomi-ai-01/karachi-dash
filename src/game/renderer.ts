import { GAME_CONFIG } from "./config";

import type {
  Player,
  Obstacle,
  Coin,
  PowerUp,
  Particle,
  ActivePowerUp,
  GameState
} from "./types";

export interface RenderFrame {
  time: number;
  distance: number;
  score: number;
  coins: number;
  highScore: number;
  speed: number;

  player: Player;

  obstacles: Obstacle[];
  coinItems: Coin[];
  powerups: PowerUp[];
  particles: Particle[];

  activePowerUps: ActivePowerUp[];

  state: GameState;
  message: string;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private readonly W = 420;
  private readonly H = 780;

  private animationTime = 0;
  private pixelRatio = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const context = canvas.getContext("2d", {
      alpha: false
    });

    if (!context) {
      throw new Error("Canvas 2D is not supported.");
    }

    this.ctx = context;

    this.resize();

    window.addEventListener("resize", this.resize);
  }

  private resize = (): void => {
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    this.pixelRatio = ratio;

    this.canvas.width = this.W * ratio;
    this.canvas.height = this.H * ratio;

    this.ctx.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );

    this.ctx.imageSmoothingEnabled = true;
  };

  render(frame: RenderFrame): void {
    const ctx = this.ctx;

    this.animationTime = frame.time;

    ctx.clearRect(0, 0, this.W, this.H);

    this.drawSky();
    this.drawSun();
    this.drawFarBuildings();
    this.drawRoad(frame);
    this.drawSideBuildings(frame);
    this.drawRoadsideProps(frame);

    this.drawObstacles(frame.obstacles);
    this.drawCoins(frame.coinItems);
    this.drawPowerUps(frame.powerups);

    this.drawRickshaw(frame.player);

    this.drawParticles(frame.particles);

    this.drawHUD(frame);

    if (frame.message) {
      this.drawMessage(frame.message);
    }
  }

  private drawSky(): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(
      0,
      0,
      0,
      270
    );

    gradient.addColorStop(0, "#102e49");
    gradient.addColorStop(0.55, "#287b86");
    gradient.addColorStop(1, "#f3ad66");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.W, this.H);

    // Soft atmospheric clouds.
    for (let i = 0; i < 5; i++) {
      const x =
        ((i * 117 + this.animationTime * 4) % 550) - 60;

      const y = 55 + (i % 3) * 40;

      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#fff0cf";

      this.ellipse(x, y, 38, 10);
      this.ellipse(x + 25, y - 6, 28, 12);
      this.ellipse(x + 45, y, 35, 9);
    }

    ctx.globalAlpha = 1;
  }

  private drawSun(): void {
    const ctx = this.ctx;

    const glow = ctx.createRadialGradient(
      320, 115, 5,
      320, 115, 75
    );

    glow.addColorStop(0, "rgba(255,220,150,0.95)");
    glow.addColorStop(0.4, "rgba(255,190,100,0.35)");
    glow.addColorStop(1, "rgba(255,190,100,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(230, 25, 180, 180);

    ctx.fillStyle = "#ffe0a1";
    this.ellipse(320, 115, 28, 28);
  }

  private drawFarBuildings(): void {
    const ctx = this.ctx;

    for (let i = 0; i < 12; i++) {
      const x = i * 39 - 10;
      const height = 60 + (i % 4) * 17;
      const y = 175 - height;

      ctx.fillStyle = i % 2
        ? "#295563"
        : "#315f68";

      ctx.fillRect(x, y, 43, height);

      ctx.fillStyle = "#d5b67b";

      for (let j = 0; j < 3; j++) {
        ctx.fillRect(
          x + 8 + j * 12,
          y + 14,
          5,
          8
        );
      }
    }

    ctx.fillStyle = "#e4ae68";
    ctx.fillRect(0, 171, this.W, 5);
  }

  private roadEdges(y: number): {
    left: number;
    right: number;
  } {
    const t = Math.max(
      0,
      Math.min(1, (y - 160) / 620)
    );

    const half =
      57.5 + t * 120;

    const center = 210;

    return {
      left: center - half,
      right: center + half
    };
  }

  private laneX(lane: number, y: number): number {
    const t = Math.max(
      0,
      Math.min(1, (y - 160) / 620)
    );

    const edges = this.roadEdges(y);

    const laneWidth =
      (edges.right - edges.left) / 3;

    return edges.left +
      laneWidth * (lane + 0.5);
  }

  private drawRoad(frame: RenderFrame): void {
    const ctx = this.ctx;

    const top = this.roadEdges(160);
    const bottom = this.roadEdges(780);

    ctx.beginPath();

    ctx.moveTo(top.left, 160);
    ctx.lineTo(top.right, 160);
    ctx.lineTo(bottom.right, 780);
    ctx.lineTo(bottom.left, 780);
    ctx.closePath();

    const roadGradient = ctx.createLinearGradient(
      0,
      160,
      0,
      780
    );

    roadGradient.addColorStop(0, "#40504a");
    roadGradient.addColorStop(1, "#202f31");

    ctx.fillStyle = roadGradient;
    ctx.fill();

    // Decorative road borders.
    ctx.strokeStyle = "#e7b34b";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(top.left, 160);
    ctx.lineTo(bottom.left, 780);
    ctx.moveTo(top.right, 160);
    ctx.lineTo(bottom.right, 780);
    ctx.stroke();

    // Lane markings.
    const offset =
      (frame.distance * 0.7) % 90;

    for (let lane = 1; lane <= 2; lane++) {
      for (let y = 170; y < 780; y += 90) {
        const actualY = y + offset;

        if (actualY > 780) continue;

        const t = (actualY - 160) / 620;

        const x = this.roadEdges(actualY);

        const laneX =
          x.left +
          (x.right - x.left) * lane / 3;

        const scale = 0.25 + t * 0.85;

        ctx.fillStyle = "#fff0cf";
        ctx.globalAlpha = 0.65;

        ctx.fillRect(
          laneX - 1.5 * scale,
          actualY,
          3 * scale,
          19 * scale
        );
      }
    }

    ctx.globalAlpha = 1;

    // Subtle road texture.
    for (let i = 0; i < 20; i++) {
      const y =
        190 + ((i * 57 + frame.distance * 1.4) % 590);

      const edges = this.roadEdges(y);

      const x =
        edges.left +
        ((i * 43) % 100) / 100 *
        (edges.right - edges.left);

      ctx.fillStyle = "rgba(255,255,255,0.045)";
      this.ellipse(x, y, 1.5, 1);
    }
  }

  private drawSideBuildings(frame: RenderFrame): void {
    const ctx = this.ctx;

    const scroll = frame.distance * 0.18;

    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 8; i++) {
        const y =
          190 + ((i * 88 + scroll) % 550);

        const t = (y - 160) / 620;

        const scale = 0.3 + t * 0.9;

        const road = this.roadEdges(y);

        const width = 34 * scale;
        const height = 64 * scale;

        const x = side === 0
          ? road.left - width - 9
          : road.right + 9;

        const palette = [
          "#b95c47",
          "#d89b53",
          "#147879",
          "#375b70",
          "#9b6658"
        ];

        ctx.fillStyle = palette[i % palette.length];

        ctx.fillRect(
          x,
          y - height,
          width,
          height
        );

        // Shop signboards.
        ctx.fillStyle = "#ffe1a0";

        ctx.fillRect(
          x - 2 * scale,
          y - height + 11 * scale,
          width + 4 * scale,
          12 * scale
        );

        ctx.fillStyle = "#803e38";

        ctx.font = `bold ${Math.max(5, 7 * scale)}px Arial`;

        ctx.textAlign = "center";

        ctx.fillText(
          i % 2 === 0 ? "CHAI" : "KARACHI",
          x + width / 2,
          y - height + 20 * scale
        );

        // Windows.
        ctx.fillStyle = "#f4ca84";

        for (let j = 0; j < 2; j++) {
          ctx.fillRect(
            x + 6 * scale + j * 15 * scale,
            y - height + 33 * scale,
            7 * scale,
            13 * scale
          );
        }
      }
    }
  }

  private drawRoadsideProps(frame: RenderFrame): void {
    const ctx = this.ctx;

    const scroll = frame.distance * 0.55;

    for (let i = 0; i < 8; i++) {
      const y =
        200 + ((i * 110 + scroll) % 550);

      const t = (y - 160) / 620;
      const scale = 0.35 + t * 0.8;

      const road = this.roadEdges(y);

      for (let side = 0; side < 2; side++) {
        const x = side === 0
          ? road.left - 15 * scale
          : road.right + 15 * scale;

        // Decorative roadside poles.
        ctx.fillStyle = "#453f36";

        ctx.fillRect(
          x,
          y - 42 * scale,
          3 * scale,
          42 * scale
        );

        // Truck-art banners.
        ctx.fillStyle = i % 2 === 0
          ? "#e95148"
          : "#087e80";

        ctx.fillRect(
          x - 11 * scale,
          y - 38 * scale,
          25 * scale,
          12 * scale
        );

        ctx.strokeStyle = "#ffc247";
        ctx.lineWidth = 1.5 * scale;

        ctx.strokeRect(
          x - 11 * scale,
          y - 38 * scale,
          25 * scale,
          12 * scale
        );
      }
    }
  }

  private drawRickshaw(player: Player): void {
    const ctx = this.ctx;

    const x = this.laneX(
      player.visualLane,
      player.y
    );

    const jumping = player.jumpTimer > 0;
    const sliding = player.slideTimer > 0;

    const jumpHeight = jumping
      ? Math.sin(
          (1 - player.jumpTimer / 0.72) * Math.PI
        ) * 110
      : 0;

    const y = player.y - jumpHeight;

    const bodyWidth = sliding ? 82 : 68;
    const bodyHeight = sliding ? 54 : 93;

    const bob =
      Math.sin(this.animationTime * 14) * 2;

    ctx.save();

    ctx.translate(x, y + bob);

    if (player.invulnerable > 0) {
      ctx.globalAlpha =
        Math.floor(this.animationTime * 12) % 2
          ? 0.4
          : 1;
    }

    // Shadow.
    ctx.fillStyle = "rgba(0,0,0,0.35)";

    this.ellipse(
      0,
      jumping ? 55 : 49,
      jumping ? 36 : 42,
      9
    );

    if (sliding) {
      ctx.rotate(-0.1);
    }

    // Wheels.
    ctx.fillStyle = "#111c20";

    this.roundRect(
      -31,
      24,
      17,
      31,
      7,
      true
    );

    this.roundRect(
      14,
      24,
      17,
      31,
      7,
      true
    );

    ctx.fillStyle = "#c8a35d";

    this.ellipse(-22.5, 39, 5, 5);
    this.ellipse(22.5, 39, 5, 5);

    // Main body.
    const bodyGradient = ctx.createLinearGradient(
      -34,
      0,
      34,
      0
    );

    bodyGradient.addColorStop(0, "#c73832");
    bodyGradient.addColorStop(0.5, "#ed5547");
    bodyGradient.addColorStop(1, "#a52d36");

    ctx.fillStyle = bodyGradient;

    this.roundRect(
      -bodyWidth / 2,
      -5,
      bodyWidth,
      bodyHeight,
      13,
      true
    );

    // Roof.
    ctx.fillStyle = "#087e80";

    this.roundRect(
      -35,
      -40,
      70,
      40,
      12,
      true
    );

    ctx.strokeStyle = "#ffc247";
    ctx.lineWidth = 4;

    this.roundRect(
      -33,
      -38,
      66,
      35,
      10,
      false
    );

    // Windshield.
    const glass = ctx.createLinearGradient(
      0,
      -34,
      0,
      -4
    );

    glass.addColorStop(0, "#b7e5d7");
    glass.addColorStop(1, "#356c71");

    ctx.fillStyle = glass;

    this.roundRect(
      -25,
      -32,
      50,
      26,
      6,
      true
    );

    // Driver face.
    ctx.fillStyle = "#d99161";

    this.ellipse(0, -20, 9, 10);

    // Hair.
    ctx.fillStyle = "#282324";

    this.ellipse(0, -27, 9, 5);

    // Eyes.
    ctx.fillStyle = "#222";

    this.ellipse(-3, -21, 1.4, 1.7);
    this.ellipse(3, -21, 1.4, 1.7);

    // Smile.
    ctx.strokeStyle = "#743c32";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.arc(0, -18, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Truck-art body decoration.
    this.drawFloralPattern(-19, 14, 38, 21);

    // Headlights.
    ctx.fillStyle = "#fff2b4";

    this.ellipse(-25, 38, 6, 7);
    this.ellipse(25, 38, 6, 7);

    ctx.fillStyle = "#ffcc59";

    this.ellipse(-25, 38, 3, 4);
    this.ellipse(25, 38, 3, 4);

    // Pakistani flag.
    ctx.fillStyle = "#147a49";

    this.roundRect(
      26,
      -49,
      12,
      9,
      1,
      true
    );

    ctx.fillStyle = "#fff";

    ctx.fillRect(26, -49, 3, 9);

    // Tassels.
    ctx.strokeStyle = "#ffc247";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(-29, -39);
    ctx.lineTo(-36, -28);

    ctx.moveTo(29, -39);
    ctx.lineTo(36, -28);

    ctx.stroke();

    ctx.fillStyle = "#ffc247";

    this.ellipse(-36, -27, 3, 4);
    this.ellipse(36, -27, 3, 4);

    ctx.restore();
  }

  private drawFloralPattern(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const ctx = this.ctx;

    ctx.save();

    ctx.translate(x + width / 2, y + height / 2);

    ctx.strokeStyle = "#ffc247";
    ctx.lineWidth = 1.5;

    ctx.strokeRect(
      -width / 2,
      -height / 2,
      width,
      height
    );

    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;

      ctx.save();

      ctx.rotate(angle);

      ctx.fillStyle = i % 2 === 0
        ? "#ffc247"
        : "#fff0cf";

      ctx.beginPath();
      ctx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.fillStyle = "#ffc247";
    this.ellipse(0, 0, 3, 3);

    ctx.restore();
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    for (const obstacle of obstacles) {
      if (obstacle.y < 150 || obstacle.y > 800) {
        continue;
      }

      const x = this.laneX(
        obstacle.lane,
        obstacle.y
      );

      const scale = Math.max(
        0.3,
        (obstacle.y - 130) / 550
      );

      this.ctx.save();

      this.ctx.translate(x, obstacle.y);
      this.ctx.scale(scale, scale);

      switch (obstacle.type) {
        case "bus":
          this.drawBus();
          break;

        case "cart":
          this.drawCart();
          break;

        case "manhole":
          this.drawManhole();
          break;

        case "wire":
          this.drawWire();
          break;

        case "cricket":
          this.drawCricket();
          break;
      }

      this.ctx.restore();
    }
  }

  private drawBus(): void {
    const ctx = this.ctx;

    ctx.fillStyle = "#087e80";

    this.roundRect(
      -37,
      -60,
      74,
      105,
      10,
      true
    );

    ctx.fillStyle = "#ffc247";

    this.roundRect(
      -32,
      -53,
      64,
      29,
      5,
      true
    );

    ctx.fillStyle = "#b9e2dc";

    for (let i = 0; i < 3; i++) {
      ctx.fillRect(
        -27 + i * 20,
        -48,
        14,
        18
      );
    }

    ctx.fillStyle = "#ed5547";

    ctx.fillRect(-34, -12, 68, 18);

    ctx.strokeStyle = "#ffc247";
    ctx.lineWidth = 3;

    ctx.strokeRect(-34, -12, 68, 18);

    ctx.fillStyle = "#fff0cf";

    this.ellipse(-25, 34, 5, 6);
    this.ellipse(25, 34, 5, 6);

    ctx.fillStyle = "#ffc247";

    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";

    ctx.fillText("KARACHI", 0, 1);

    ctx.fillStyle = "#172a30";

    this.roundRect(-31, 43, 15, 9, 3, true);
    this.roundRect(16, 43, 15, 9, 3, true);
  }

  private drawCart(): void {
    const ctx = this.ctx;

    ctx.fillStyle = "#70462e";

    ctx.fillRect(-29, -14, 58, 30);

    ctx.fillStyle = "#c88b45";

    this.roundRect(-35, -27, 70, 20, 5, true);

    ctx.strokeStyle = "#493326";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(-23, 15);
    ctx.lineTo(-30, 36);
    ctx.moveTo(23, 15);
    ctx.lineTo(30, 36);
    ctx.stroke();

    ctx.fillStyle = "#222";

    this.ellipse(-28, 37, 9, 9);
    this.ellipse(28, 37, 9, 9);

    ctx.fillStyle = "#ffc247";

    this.ellipse(-28, 37, 4, 4);
    this.ellipse(28, 37, 4, 4);
  }

  private drawManhole(): void {
    const ctx = this.ctx;

    ctx.fillStyle = "#101c20";
    this.ellipse(0, 0, 39, 24);

    ctx.strokeStyle = "#9b9990";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.ellipse(0, 0, 39, 24, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#565b58";
    ctx.lineWidth = 2;

    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10, -15);
      ctx.lineTo(i * 10, 15);
      ctx.stroke();
    }
  }

  private drawWire(): void {
    const ctx = this.ctx;

    ctx.strokeStyle = "#282326";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(-45, -48);
    ctx.quadraticCurveTo(0, -25, 45, -48);
    ctx.stroke();

    ctx.fillStyle = "#ffc247";

    this.ellipse(-38, -45, 4, 4);
    this.ellipse(38, -45, 4, 4);

    ctx.fillStyle = "#ed5547";

    ctx.fillRect(-12, -32, 24, 8);
  }

  private drawCricket(): void {
    const ctx = this.ctx;

    ctx.fillStyle = "#ffc247";

    this.ellipse(0, 0, 13, 13);

    ctx.fillStyle = "#ed5547";

    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI);
    ctx.strokeStyle = "#ed5547";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff0cf";
    this.ellipse(-3, -4, 2, 2);
    this.ellipse(4, -4, 2, 2);
  }

  private drawCoins(coins: Coin[]): void {
    const ctx = this.ctx;

    for (const coin of coins) {
      if (coin.collected) continue;

      if (coin.y < 150 || coin.y > 800) {
        continue;
      }

      const x = this.laneX(coin.lane, coin.y);

      const scale = Math.max(
        0.3,
        (coin.y - 130) / 550
      );

      const spin = Math.abs(
        Math.cos(this.animationTime * 6 + coin.rotation)
      );

      ctx.save();

      ctx.translate(x, coin.y);

      ctx.scale(
        scale * Math.max(0.18, spin),
        scale
      );

      ctx.fillStyle = "#e39a26";

      this.ellipse(0, 0, 15, 17);

      ctx.strokeStyle = "#fff0a0";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#fff3bd";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.fillText("₨", 0, 5);

      ctx.restore();
    }
  }

  private drawPowerUps(powerups: PowerUp[]): void {
    const ctx = this.ctx;

    for (const item of powerups) {
      if (item.collected) continue;

      if (item.y < 150 || item.y > 800) {
        continue;
      }

      const x = this.laneX(item.lane, item.y);

      const scale = Math.max(
        0.3,
        (item.y - 130) / 550
      );

      const color = {
        magnet: "#ed6a91",
        shield: "#58b6e4",
        boost: "#ffc247",
        double: "#a98cff"
      }[item.type];

      ctx.save();

      ctx.translate(x, item.y);
      ctx.scale(scale, scale);

      const pulse =
        1 + Math.sin(this.animationTime * 6) * 0.08;

      ctx.scale(pulse, pulse);

      ctx.shadowColor = color;
      ctx.shadowBlur = 16;

      ctx.fillStyle = color;

      this.ellipse(0, 0, 22, 22);

      ctx.shadowBlur = 0;

      ctx.fillStyle = "#142b30";

      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const symbol = {
        magnet: "M",
        shield: "S",
        boost: "B",
        double: "2×"
      }[item.type];

      ctx.fillText(symbol, 0, 1);

      ctx.restore();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;

    for (const particle of particles) {
      const alpha = Math.max(
        0,
        particle.life / particle.maxLife
      );

      ctx.globalAlpha = alpha;

      ctx.fillStyle = "#ffc247";

      this.ellipse(
        particle.x,
        particle.y,
        particle.size,
        particle.size
      );
    }

    ctx.globalAlpha = 1;
  }

  private drawHUD(frame: RenderFrame): void {
    const ctx = this.ctx;

    // Top panel.
    ctx.fillStyle = "rgba(8,35,42,0.82)";

    this.roundRect(
      14,
      15,
      392,
      75,
      16,
      true
    );

    ctx.strokeStyle = "#d9a83e";
    ctx.lineWidth = 2;

    this.roundRect(
      14,
      15,
      392,
      75,
      16,
      false
    );

    // Score.
    ctx.textAlign = "left";

    ctx.fillStyle = "#fff0cf";
    ctx.font = "bold 11px Arial";
    ctx.fillText("DISTANCE SCORE", 28, 37);

    ctx.fillStyle = "#ffc247";
    ctx.font = "bold 25px Arial";
    ctx.fillText(
      Math.floor(frame.score).toString(),
      28,
      66
    );

    // Coins.
    ctx.fillStyle = "#fff0cf";
    ctx.font = "bold 11px Arial";
    ctx.fillText("COINS", 235, 37);

    ctx.fillStyle = "#ffc247";
    ctx.font = "bold 22px Arial";
    ctx.fillText(
      `₨ ${frame.coins}`,
      235,
      66
    );

    // Best score.
    ctx.textAlign = "right";

    ctx.fillStyle = "#fff0cf";
    ctx.font = "10px Arial";
    ctx.fillText("BEST", 392, 36);

    ctx.fillStyle = "#fff0cf";
    ctx.font = "bold 16px Arial";
    ctx.fillText(
      frame.highScore.toString(),
      392,
      63
    );

    // Power-up timers.
    let powerX = 18;

    for (const power of frame.activePowerUps) {
      ctx.fillStyle = "#ffc247";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "left";

      ctx.fillText(
        `${power.type.toUpperCase()} ${power.remaining.toFixed(1)}s`,
        powerX,
        111
      );

      powerX += 105;
    }

    ctx.textAlign = "left";
  }

  private drawMessage(message: string): void {
    const ctx = this.ctx;

    ctx.save();

    ctx.fillStyle = "rgba(8,35,42,0.85)";

    this.roundRect(
      65,
      300,
      290,
      60,
      18,
      true
    );

    ctx.strokeStyle = "#ffc247";
    ctx.lineWidth = 2;

    this.roundRect(
      65,
      300,
      290,
      60,
      18,
      false
    );

    ctx.fillStyle = "#fff0cf";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 22px Arial";

    ctx.fillText(message, 210, 330);

    ctx.restore();
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean
  ): void {
    const ctx = this.ctx;

    ctx.beginPath();

    ctx.roundRect(
      x,
      y,
      width,
      height,
      radius
    );

    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  private ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number
  ): void {
    this.ctx.beginPath();

    this.ctx.ellipse(
      x,
      y,
      rx,
      ry,
      0,
      0,
      Math.PI * 2
    );

    this.ctx.fill();
  }

  destroy(): void {
    window.removeEventListener(
      "resize",
      this.resize
    );
  }
}
