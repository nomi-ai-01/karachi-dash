export type GameState =
  | "menu"
  | "playing"
  | "paused"
  | "gameover";

export type ObstacleType =
  | "bus"
  | "cart"
  | "manhole"
  | "wire"
  | "cricket";

export type PowerUpType =
  | "magnet"
  | "shield"
  | "boost"
  | "double";

export interface Player {
  lane: number;
  visualLane: number;
  y: number;
  jumpTimer: number;
  slideTimer: number;
  invulnerable: number;
}

export interface Obstacle {
  lane: number;
  y: number;
  type: ObstacleType;
  width: number;
  height: number;
  passed: boolean;
}

export interface Coin {
  lane: number;
  y: number;
  collected: boolean;
  rotation: number;
}

export interface PowerUp {
  lane: number;
  y: number;
  type: PowerUpType;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface GameData {
  highScore: number;
  totalCoins: number;
  bestDistance: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  remaining: number;
}
