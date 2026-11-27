export const C = {
  LANES: [-3, 0, 3],
  LANE_W: 3,
  OUTER_X: 8, // x of the decorative outer tracks

  SEG_LEN: 24,
  SEG_COUNT: 9,
  SPAWN_DIST: 125,

  BASE_SPEED: 14,
  MAX_SPEED: 32,
  RAMP: 0.15, // m/s gained per second

  GRAVITY: 26,
  JUMP_V: 10.2,
  SLIDE_T: 0.75,

  PLAYER_H: 1.7,
  VISUAL_H: 2.05, // drawn height of the boy (hitbox stays PLAYER_H)
  OUTER_TRACKS: false, // decorative side tracks + trains (reference uses 3 tracks only)
  SLIDE_H: 0.75,
  PLAYER_HW: 0.3,
  PLAYER_HD: 0.3,
} as const;
