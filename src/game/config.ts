export const GAME_CONFIG = {
  width: 420,
  height: 780,

  lanes: 3,

  road: {
    topWidth: 115,
    bottomWidth: 355,
    horizonY: 160,
    bottomY: 780
  },

  player: {
    startLane: 1,
    width: 66,
    height: 100,
    baseY: 650,
    laneChangeSpeed: 13,
    jumpDuration: 0.72,
    slideDuration: 0.65
  },

  movement: {
    initialSpeed: 330,
    maximumSpeed: 720,
    acceleration: 4.5,
    obstacleSpawnMin: 0.75,
    obstacleSpawnMax: 1.45
  },

  scoring: {
    distanceMultiplier: 0.08,
    coinValue: 1,
    nearMissBonus: 5
  },

  coins: {
    magnetRadius: 125,
    pickupRadius: 38
  },

  powerups: {
    duration: 8,
    spawnChance: 0.12,
    magnetRadius: 230,
    shieldDuration: 8,
    boostMultiplier: 1.55
  },

  difficulty: {
    startEasySeconds: 20,
    speedIncreaseInterval: 12,
    obstacleDensityIncrease: 0.04
  },

  effects: {
    particleLimit: 150,
    shakeDuration: 0.22,
    flashDuration: 0.15
  },

  colors: {
    background: "#092d35",
    road: "#26383a",
    roadEdge: "#d9a83e",
    teal: "#087e80",
    gold: "#ffc247",
    red: "#ed5547",
    pink: "#ed6a91",
    green: "#3caa78",
    blue: "#173f64",
    cream: "#fff0cf",
    white: "#ffffff",
    dark: "#142b30"
  }
} as const;

export type GameConfig = typeof GAME_CONFIG;
