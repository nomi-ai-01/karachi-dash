/**
 * All tunable values. Change these to rebalance without touching logic.
 * BALANCE PASS – tuned for ~90s zones, mid-range phones, kids→adults.
 */
export const CONFIG = {
  LANE_COUNT: 3,
  LANE_WIDTH: 115,
  ROAD_WIDTH: 480,
  VIEW_HEIGHT: 780,
  VIEW_WIDTH: 420,

  PLAYER_Y: 0.72,
  LANE_SWITCH_MS: 130,
  JUMP_MS: 400,
  SLIDE_MS: 360,
  INVULN_MS: 1400,

  // Speed: gentler start, smooth ramp, cap before chaos
  BASE_SPEED: 300,
  MAX_SPEED: 720,
  SPEED_RAMP_PER_SEC: 3.6,
  START_GENTLE_SEC: 22,

  // Spawning: more breathing room early, denser late
  SPAWN_BASE_GAP: 460,
  SPAWN_MIN_GAP: 230,
  OBSTACLE_CHANCE: 0.5,
  COIN_CHANCE: 0.78,
  POWERUP_CHANCE: 0.055,

  DISTANCE_SCORE_RATE: 0.11,
  COIN_VALUE: 1,
  GOLDEN_VALUE: 12,
  NEAR_MISS_BONUS: 30,
  NEAR_MISS_DIST: 58,
  COMBO_WINDOW_MS: 2000,

  REVIVE_COST: 60,
  STARTING_COINS: 25,

  // Star thresholds (end of zone)
  STAR2_COINS: 35,
  STAR2_SCORE: 700,
  STAR3_COINS: 55,
  STAR3_SCORE: 1100,
  CLEAR_BONUS_BASE: 50,
  CLEAR_BONUS_PER_STAR: 35,

  SHAKE_INTENSITY: 0.01,
  HIT_STOP_MS: 80,
  NEAR_MISS_SLOWMO: 0.55,
  NEAR_MISS_DURATION: 280,

  PERSPECTIVE_SPAWN_SCALE: 0.32,
  PERSPECTIVE_PLAYER_SCALE: 1.0,
  COLLISION_Y_MIN: 0.55,
  COLLISION_Y_MAX: 0.88,

  // Boss
  BOSS_MIN_ELAPSED: 35,
  BOSS_CHANCE_PER_FRAME: 0.0012,
  BOSS_DURATION: 9,
  BOSS_SPEED_MULT: 1.28,
  BOSS_ESCAPE_BONUS: 120,
} as const;

export type Config = typeof CONFIG;

export const PALETTE = {
  deepTeal: 0x0b3d4c,
  midnight: 0x0b1c2c,
  marigold: 0xf4a261,
  hotPink: 0xe63980,
  vermilion: 0xe63946,
  emerald: 0x2a9d8f,
  cream: 0xfefae0,
  gold: 0xffc857,
  skyDay: 0x87ceeb,
  skySunset: 0xff7e5f,
  skyNight: 0x1a1a2e,
  road: 0x2c2c2c,
  roadLine: 0xf4a261,
  white: 0xffffff,
  black: 0x111111,
} as const;

export const WORLDS = [
  {
    id: 'saddar',
    name: 'Saddar Bazaar',
    durationSec: 90,
    skyTop: 0x5ba3c9,
    skyBot: 0xf4a261,
    weather: 'dust' as const,
    musicPace: 1.0,
  },
  {
    id: 'clifton',
    name: 'Clifton Beach',
    durationSec: 90,
    skyTop: 0x3d7ab5,
    skyBot: 0xffd9a0,
    weather: 'clear' as const,
    musicPace: 1.05,
  },
  {
    id: 'quaid',
    name: "Quaid's Mausoleum",
    durationSec: 95,
    skyTop: 0x6aa8d8,
    skyBot: 0xe8f0d8,
    weather: 'clear' as const,
    musicPace: 0.95,
  },
  {
    id: 'keamari',
    name: 'Keamari Port',
    durationSec: 95,
    skyTop: 0x2a4a6a,
    skyBot: 0x8ab0c8,
    weather: 'evening' as const,
    musicPace: 1.1,
  },
  {
    id: 'burns',
    name: 'Burns Road',
    durationSec: 100,
    skyTop: 0x4a6a8a,
    skyBot: 0xf0c8a0,
    weather: 'evening' as const,
    musicPace: 1.15,
  },
] as const;

export type WorldId = (typeof WORLDS)[number]['id'];
