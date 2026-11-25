# Karachi Dash – Sprite Asset List

All sprites: transparent PNG or WebP, max 512px on longest side, total atlas < 5 MB.
Style: realistic Pakistani truck-art, rear 3/4 view where relevant, bold outlines optional, saturated colour.

## Player Rickshaw Skins (8) — 256×256 each
| Filename | Prompt |
|----------|--------|
| rickshaw_classic.png | Rear 3/4 view of a Pakistani auto-rickshaw, red canopy with gold floral truck-art patterns, tassels, glowing headlights, small Pakistani flag, cheerful driver visible, transparent background |
| rickshaw_emerald.png | Same rickshaw, emerald green canopy, gold and orange floral patterns, transparent background |
| rickshaw_royal.png | Same, deep purple/royal blue canopy, gold trim, transparent background |
| rickshaw_sunset.png | Same, orange-coral sunset canopy, marigold patterns, transparent background |
| rickshaw_ocean.png | Same, ocean blue canopy, cyan accents, transparent background |
| rickshaw_marigold.png | Same, bright marigold yellow canopy, hot pink accents, transparent background |
| rickshaw_midnight.png | Same, dark navy canopy, pink and gold trim, transparent background |
| rickshaw_cream.png | Same, cream white canopy, red and gold truck-art, transparent background |

## Obstacles — 256×256 or 128×128
| Filename | Size | Prompt |
|----------|------|--------|
| bus.png | 256×256 | Pakistani bus with colourful truck-art, side view slightly angled, transparent background |
| minibus.png | 192×192 | Small Pakistani minibus, truck-art, transparent background |
| cart.png | 192×128 | Wooden donkey cart loaded with goods, side view, transparent background |
| thela.png | 128×128 | Street fruit thela / chai stall cart, colourful, transparent background |
| manhole.png | 128×64 | Open road manhole, top-down slightly angled, dark, transparent background |
| wire_banner.png | 256×128 | Low hanging electrical wires and a colourful street banner, transparent background |
| cricket_ball.png | 64×64 | Red cricket ball, transparent background |

## Collectibles & Power-ups — 64×64 or 96×96
| Filename | Prompt |
|----------|--------|
| coin_chai.png | Small gold coin shaped like a chai cup, transparent background |
| coin_golden.png | Golden biryani plate icon, top view, transparent background |
| power_bat.png | Cricket bat icon, colourful, transparent background |
| power_chai.png | Steaming chai cup icon, transparent background |
| power_magnet.png | Horseshoe magnet icon, transparent background |
| power_double.png | x2 gold badge icon, transparent background |
| power_shield.png | Protective shield icon, transparent background |

## Backgrounds per world — 512×256 or full-bleed strips
| Filename | Prompt |
|----------|--------|
| bg_saddar.png | Karachi Saddar bazaar street, crowded shops, hanging signs, warm daylight, painterly |
| bg_clifton.png | Clifton beach Karachi, palm trees, sea horizon, golden hour |
| bg_quaid.png | Quaid-e-Azam mausoleum distant, open road, clear sky |
| bg_keamari.png | Keamari port Karachi, cranes, containers, evening light |
| bg_burns.png | Burns Road food street at night, neon, steam, crowds |

## Characters (idle + 2-3 frames) — 128×128
| Filename | Prompt |
|----------|--------|
| driver_a_idle.png | Pakistani rickshaw driver, outfit A, idle pose, transparent |
| driver_a_f1.png / f2.png | Same driver, slight animation frames |
| driver_b_*, driver_c_* | Two more outfit variants |
| pedestrian_*.png | Pedestrians crossing, 2-3 frames |
| vendor_*.png | Street vendor, idle + gesture |
| police_*.png | Traffic police officer, idle + whistle pose |

## HUD icons — 48×48
score_icon.png, coin_icon.png, combo_icon.png, pause_icon.png

---

After generating, pack into a single texture atlas (e.g. with TexturePacker or free-tex-packer) named `atlas.png` + `atlas.json`, place in `public/assets/`, load in PreloadScene.
