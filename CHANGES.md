# Karachi Dash – is update mein kya badla

## Fixes
- **Pao zameen mein dhans rahe the** -> `player.ts` ab har animation (run/jump/slide/idle/die) ko sample kar ke character ko itna uthata hai ke sabse neecha point (jutay ka talwa) sleepers (`C.FLOOR_Y` in config.ts) par ho. Console mein `[Player] Foot offsets:` likha aayega.
- **Train se takra kar game over nahi hota tha**
  - Collision ab "swept" hai: har frame mein obstacle ka poora raasta check hota hai (slow phone par barrier ke andar se guzar jana band).
  - Train/barrier ke SAAMNE se takrao = hamesha game over. Sirf side se ragarna (lane badalte waqt) = stumble (pehli dafa), 5 sec mein doosri dafa = game over.
  - Hit-box ki chorai ab asal model ki chorai se aati hai.
  - Stumble ke baad ki invulnerability 0.9s se 0.4s.
- `audio.horn()` exist hi nahi karta tha -> jab bhi chalti train aati thi to error aa kar frame ruk jata tha. Ab horn bajta hai.

## Buildings
- Pehle sirf 7 segment bante the aur wahi baar baar dohrate the. Ab har lap par **nayi buildings** aati hain.
- 21 Kenney ghar + 6 naye (Big Building, Brown, Green, Red, Kay Lousberg, Kenney Small). Shuffle-bag: har model aane ke baad hi dobara aata hai, lagataar ek jaisi nahi.
- Mazar / masjid ab har lap par nahi, kabhi kabhi aate hain.

## Trains
- Naye types: double-decker electric, diesel-box, passenger locomotive, flatbed, large tank, **Poly railway carriage**, **High Speed Front (bullet train)**.
- Zyada trains khadi (parked) rehti hain, kam chalti hain (`spawner.ts` -> `moving` probability).

## Character
- Daudte waqt aage ki taraf jhukao (Subway Surfers jaisa), `player.ts` mein `-0.14`.

## Nahi use huay (bohat bhari)
low_poly_town (1M tris, 68 MB), bombardier (380k tris), train_car_56 (229k tris, 43 MB), game_low_poly_buildings (50 MB), dragon_attack, Highway (4000 unit scene), Dining car (train nahi, ek bara block hai).
