# Karachi Dash 3D

Endless runner (Three.js + Vite + TypeScript) set on Karachi's railway tracks.

## Run
```
npm install
npm run dev        # phone: open the Network URL printed in the terminal
npm run build      # production build in dist/
npm run typecheck  # optional TypeScript check
```

## Controls
Phone: swipe left/right (lane), up (jump), down (slide). Keyboard: arrows/WASD, Space = jump, P/Esc = pause.

## Trains
- Parked trains: just steer around them.
- Moving trains rush at you (horn sounds first), shorter and faster.
- Side tracks: decorative trains pass by (parked or fast oncoming).

## Character animations (Mixamo)
Put the files in `public/models/boy/` with exactly these names:

| file        | Mixamo animation                          | download setting                      |
|-------------|-------------------------------------------|---------------------------------------|
| run.fbx     | Running                                   | FBX Binary, **With Skin**, In Place   |
| jump.fbx    | Jump / Running Jump                       | FBX Binary, Without Skin, In Place    |
| slide.fbx   | Running Slide                             | FBX Binary, Without Skin, In Place    |
| die.fbx     | Stumble Backwards / Falling Back Death    | FBX Binary, Without Skin              |
| idle.fbx    | Idle (menu)                               | FBX Binary, Without Skin              |

`run.fbx` is required for animation; the others are optional (missing ones are skipped).
Until `run.fbx` exists the game shows the static `boy.obj` with a simple procedural pose (arms stay in T-pose).

If the boy looks inside-out/has wrong texture after adding FBX, tell the developer: texture flip can be tuned in `src/player.ts`.

## Files
- `src/world.ts` tracks, Karachi buildings, palms, wires, gantry sign, Mazar, mosque
- `src/spawner.ts` trains, containers, barriers, coins, difficulty
- `src/player.ts` boy, lanes, jump, slide, animations
- `src/game.ts` state, camera, HUD, input
