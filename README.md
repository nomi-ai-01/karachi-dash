# Karachi Dash

Fast one-thumb endless runner through the streets of Karachi.

## Quick start

```bash
npm install
npm run dev
```

## Features

- 3-lane runner (swipe / keyboard)
- 5 zones ~90–100s with star ratings
- Police Chase boss, near-miss, revive
- Shop (8 skins), daily missions, reward wheel
- Share score, PWA-ready
- Procedural art; optional PNGs in `public/assets/` (see `SPRITE_LIST.md`)

## Docs

| File | Content |
|------|---------|
| `BALANCE.md` | Tunable numbers & star rules |
| `SPRITE_LIST.md` | Asset filenames + image prompts |
| `CAPACITOR.md` | Android / iOS wrapper steps |

## Build & deploy

```bash
npm run build
# deploy dist/ to Vercel / Netlify / GitHub Pages
```

## Android

See `CAPACITOR.md` — `npx cap add android` after build.

## Controls

Swipe ←→ lanes · ↑ jump · ↓ slide · P pause
