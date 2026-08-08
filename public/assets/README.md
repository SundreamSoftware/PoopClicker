# Poop Clicker — Asset Pack v1.0.0

Generated vector-first pack. Every asset is authored as SVG; large backgrounds, sprite sheets
and store deliverables are additionally exported to WebP/PNG at target resolutions.

## Directory map

```
P0_character/          master character, 7 expressions, aura variants
P0_toilet/             5 toilet states + 5 separated parts
P0_environment/        Home Bathroom, full + 4 separated layers (SVG + WebP 1440x2560)
P0_vfx/                8 core effects + 4 frame sequences (8 frames each)
P1_skins/              6 benchmark skins x 3 expressions
P1_worlds/             5 benchmark worlds, full + 4 layers each (SVG + WebP 1440x2560)
P1_events/             golden poop, golden rain, paper roll, clog stages, mega clog,
                       plumber CPS gauge, burrito rush, toilet quake, mystery flush
P1_ui/                 currencies, nav, category icons, rarity/achievement frames,
                       utility icons, button surfaces, modal ornaments
P1_accessories/        modular kit: hats, eyewear, body, gear, horns/halo/aura,
                       texture overlays, particle presets
P2_store/              adaptive icon, splash, feature graphic, screenshots, key art
P3_spritesheets/       packed PNG/WebP strips + JSON metadata
manifest.json          machine-readable index of every file
index.html             visual contact sheet (open in a browser)
```

## Coordinate spaces and anchors

| Group | Canvas | Pivot / anchor |
|---|---|---|
| Character, skins, accessories | 512 x 512 | body base `(256, 402)`, floor contact `(256, 470)` |
| Toilet | 512 x 512 | floor contact `(256, 428)`, water plane `(256, 254)` |
| VFX and frame sequences | 512 x 512 | centre `(256, 256)` |
| Icons | 128 x 128 | centre |
| Rarity / achievement frames | 256 x 256 | centre |
| Buttons | 360 x 120 | centre |
| Backgrounds | 1440 x 2560 | horizon at `y = 1720` |

Every animatable group carries `id` and `data-anchor="x,y"`. Character rig ids:
`shadow`, `arm_left`, `arm_right`, `body`, `top_swirl`, `highlight`, `eyes`, `mouth`,
plus `skin_*` overlays and optional `aura`.

Accessories are authored in the same 512 rig space, so they composite with no
repositioning:

```xml
<svg viewBox="0 0 512 512">
  <use href="poop_classic_normal.svg#poop_character"/>
  <use href="body_cape.svg#body_cape"/>      <!-- draw BEFORE the character -->
  <use href="hats_crown.svg#hats_crown"/>    <!-- draw AFTER the character -->
</svg>
```

Draw order: `aura_ring` / `body_cape` behind the character; everything else in front.

## The 46 remaining skins

Do not author them individually. Each remaining skin is a data row combining:

```json
{
  "id": "skin_pirate",
  "base": "classic",
  "palette": { "mid": "#8B5A24", "light": "#A9712F" },
  "accessories": ["hats_pirate", "eyew_eyepatch"],
  "texture": "texture_stripes",
  "particles": "particles_sparkle"
}
```

8 hats x 5 eyewear x 5 body x 2 gear x 3 aura x 5 textures x 6 particle presets covers
far more than 46 combinations with 34 source files.

## Animation

Sprite strips in `P3_spritesheets/` are horizontal, 8 frames, 256 x 256 per cell, with a
JSON sidecar (`frames`, `frame_width`, `fps_suggested`, `loop`). Sources for every frame
remain in `P0_vfx/frames/` and `P1_events/toilet_paper/frames/` if you want to re-export at
another resolution.

Suggested runtime animations driven from the layered SVG instead of frames:

- idle: `body` scale `1.00 -> 1.03` over 900 ms, `top_swirl` lag 80 ms
- tap: `body` squash `1.08 / 0.92` for 90 ms, `arm_*` rotate `+-12deg`
- frenzy: swap `eyes`/`mouth` to the frenzy expression, enable `aura_frenzy`
- flush: `water` opacity down, `flush_vortex` sheet on top, toilet `shake` state

## Re-export

Backgrounds were rasterised with `cairosvg` at 1440 x 2560 and saved as WebP q92. Change the
resolution by re-running the source SVG through any renderer; nothing is bitmap-locked
except the packed sheets.

## Notes

- Fonts are not embedded. Text in store art uses a generic sans stack; replace with your
  licensed display font before publishing.
- Store screenshots are mockups composed from real kit pieces; regenerate them from real
  captures before submission if the UI diverges.
- Play Store feature graphic is exactly 1024 x 500 PNG; adaptive icon layers are 432 x 432
  with the character inside the 66% safe zone.
