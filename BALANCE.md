# Balance reference

All numbers live in `src/data/config.ts`.

## Feel

| Setting | Value | Why |
|---------|-------|-----|
| BASE_SPEED | 300 | Readable first 20s |
| MAX_SPEED | 720 | Hard but not unfair |
| START_GENTLE_SEC | 22 | Learn jump/slide |
| SPAWN_BASE_GAP | 460 | Gaps early |
| SPAWN_MIN_GAP | 230 | Dense late |
| OBSTACLE_CHANCE | 0.5 | Not every row |
| COIN_CHANCE | 0.78 | Reward good runs |
| POWERUP_CHANCE | 0.055 | ~every 15–20s |
| REVIVE_COST | 60 | Affordable after 1–2 runs |
| STARTING_COINS | 25 | First shop peek |

## Stars (end of ~90s zone)

| Stars | Condition |
|-------|-----------|
| 1 | Finish zone |
| 2 | 35+ coins **or** score ≥ 700 |
| 3 | No crash **and** 55+ coins **and** score ≥ 1100 |

Clear bonus = 50 + stars × 35 coins.

## Boss (Police Chase)

- After 35s, small chance per frame
- Duration 9s, speed ×1.28
- Extra buses in other lanes
- Escape bonus +120 score

## Tweaking

1. Too hard early → raise `SPAWN_BASE_GAP` or `START_GENTLE_SEC`
2. Too easy → lower `SPAWN_MIN_GAP` or raise `SPEED_RAMP_PER_SEC`
3. Stars too rare → lower `STAR3_COINS` / `STAR3_SCORE`
4. Economy slow → lower skin prices in `save.ts` `SKIN_CATALOG`
