export const C = {
  LANES: [-2.6, 0, 2.6],
  LANE_W: 2.6,
  OUTER_X: 5.2, // x of the decorative outer tracks

  SEG_LEN: 24,
  SEG_COUNT: 7,
  SPAWN_DIST: 110,

  BASE_SPEED: 20,
  MAX_SPEED: 42,
  RAMP: 0.2,  // m/s gained per second

  GRAVITY: 26,
  JUMP_V: 10.2,
  SLIDE_T: 1.0,

  PLAYER_H: 1.7,
  VISUAL_H: 1.85, // drawn height of the boy (hitbox stays PLAYER_H)
  OUTER_TRACKS: false, // decorative side tracks + trains (reference uses 3 tracks only)
  SLIDE_H: 0.75,
  PLAYER_HW: 0.3,
  PLAYER_HD: 0.3,
} as const;
