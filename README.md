# Karachi Dash

Fast one-thumb endless runner through the streets of Karachi.

Drive a colourful truck-art rickshaw, dodge buses, carts and manholes, collect chai-cup coins, and chase high scores.

## Quick start

```bash
npm install
npm run dev
```

Open the local URL on your phone or desktop.  
On first tap, audio unlocks and the street beat starts.

## Controls

| Action       | Touch / Swipe     | Keyboard    |
|-------------|-------------------|-------------|
| Change lane | Swipe left / right| ← → or A D |
| Jump        | Swipe up          | ↑ or W / Space |
| Slide       | Swipe down        | ↓ or S     |
| Pause       | ❚❚ button         | P / Esc    |

## Features (Version 1)

- 3-lane endless runner with increasing speed
- Jump (manholes, cricket balls) and slide (wires, banners)
- Buses, minibuses, donkey carts, thelas, manholes, wires
- Coins + rare golden biryani plates
- Power-ups: Cricket Bat, Chai Boost, Magnet, Double Coins, Shield
- Combo system + near-miss flair (“Bal Bal Bacha!”)
- Milestone cheers every 500 m
- Game over → one-tap Retry
- High score & coins saved in localStorage
- Procedural truck-art visuals (no external images)
- Synthesised audio (Web Audio API)
- PWA-ready (installable, offline after first load)

## Build & deploy

```bash
npm run build
```

Upload the `dist/` folder to Vercel / Netlify / GitHub Pages.

```bash
# Vercel
npx vercel --prod
```

## Project structure

```
src/
  main.ts
  data/          config, save
  entities/      Rickshaw, Obstacle, Coin, PowerUp
  systems/       InputManager
  scenes/        MenuScene, GameScene
  audio/         AudioManager (synthesised)
  utils/
```

## Balancing

All tunables live in `src/data/config.ts`:

- `BASE_SPEED` / `MAX_SPEED` / `SPEED_RAMP_PER_SEC`
- `SPAWN_BASE_GAP` / `SPAWN_MIN_GAP`
- Power-up durations inside `GameScene.activatePower`
- Coin values, revive cost, etc.

## Future hooks (ready to extend)

- Shop skins (8 colour variants already coded in Rickshaw)
- Daily missions + login wheel
- Share score card
- Cricket Mode / new city worlds
- Capacitor Android wrapper

## Licence

Original game. Personal / educational use.
