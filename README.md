# Karachi Dash — 3-Lane Runner

A mobile-first, three-lane endless runner set in a colorful, stylized Karachi railway world.

## Run locally

```bash
npm install
npm run dev
```

## Gameplay

- Three perspective railway lanes with sleepers and polished rails
- Original cartoon runner character (rear view), running animation, lane switching, jump and slide
- Stylized oncoming train obstacles, carts, barriers and track hazards
- Collectible gold coins and power-ups
- Five Karachi-inspired zones, missions, daily rewards, shop outfits and score saving
- Swipe controls on phones; keyboard controls on desktop
- 60 FPS Phaser rendering target and PWA support

## Art direction

This browser project is built with Phaser 3 (2D Canvas/WebGL) and uses a pseudo-3D perspective effect. It is not a true 3D model-based game engine build. The old photorealistic PNG props are no longer loaded; the runner, railway tracks, coins, trains and city scenery are drawn as consistent stylized game art.

## Controls

- Swipe left/right or arrow keys: change lane
- Swipe up / Space / Up arrow: jump
- Swipe down / Down arrow: slide
- P / Escape: pause

## Build

```bash
npm run typecheck
npm run build
```

Deploy the generated `dist/` folder to GitHub Pages, Netlify or Vercel. See `CAPACITOR.md` for Android/iOS packaging.
