# Karachi Dash — Mixamo Character Setup

The project now prefers the newly supplied Mixamo character and animation files.

## Asset layout

`public/models/mixamo/`
- `Running.fbx` — skinned character mesh, skeleton, and running clip
- `Idle.fbx` — idle animation clip
- `Jumping.fbx` — jump animation clip
- `Falling.fbx` — falling animation clip used during the downward part of a jump
- `Running_Slide.fbx` — slide animation clip
- `Dying.fbx` — death animation clip

The original `public/models/boy/` assets are preserved as a fallback.

## How the player loads

`src/player.ts` loads `Running.fbx` as the one character mesh and creates one Three.js `AnimationMixer` for that model. It then loads the other FBX files as animation sources and creates actions on that same mixer. This requires the animation files to use the same Mixamo skeleton/bone naming as `Running.fbx`.

Animation states:
- Menu: `idle` (falls back to `run` if idle fails to load)
- Running: `run`
- Jump ascent: `jump`
- Jump descent: `fall`
- Slide: `slide`
- Collision/game over: `die`

## Important testing note

The source update and asset paths have been checked, but a full Vite/TypeScript build could not be run in this environment because project dependencies were not installed and npm installation timed out. On your computer, run:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Then check the browser console for `[Player] Mixamo animations ready`. If any animation is missing or has a mismatched skeleton, the console will identify the FBX file. Keep the old assets until the new character has been visually tested in the game.
