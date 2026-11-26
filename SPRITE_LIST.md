# Art system

The current cartoon runner mode intentionally does not load the old photographic PNG sprites.

Runtime art is generated in code:
- `src/entities/Rickshaw.ts`: original rear-view runner character and running animation
- `src/entities/Obstacle.ts`: stylized oncoming trains, carts, barriers and hazards
- `src/entities/Coin.ts` and `src/entities/PowerUp.ts`: arcade collectibles
- `src/scenes/GameScene.ts`: three perspective railway tracks and city scenery
- `src/utils/TextureFactory.ts`: reusable procedural textures

Future art upgrades can replace these vector drawings with original 3D-rendered spritesheets while preserving the existing gameplay interfaces.
