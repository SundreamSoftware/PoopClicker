# Assets

## Manifest

`src/content/assetManifest.ts` is the single registry for skin variants, animations, VFX slots, UI icons, events, and worlds.

Status vocabulary:

| Status             | Meaning                                      |
| ------------------ | -------------------------------------------- |
| `PROCEDURAL_FINAL` | Shippable procedural fallback                |
| `FINAL`            | Authored asset integrated at runtime         |
| `TEMPORARY`        | Placeholder                                  |
| `MISSING`          | Reserved slot without authored runtime asset |

## Authored pack v1.0

`public/assets/` has been technically audited and integrated with procedural fallback:

- **FINAL:** 45/46 roster skins mapped to `P1_skins/<slug>/` (normal + happy SVG; classic extra
  faces from `P0_character/expressions/`). Only `chef_poop` remains procedural.
- **FINAL:** Home, Office, Space, Quantum and Omni world layer sets.
- **FINAL:** event target/boss/banner art for all runtime event types.
- **FINAL:** Classic expressions, toilet states, currency/nav icons and core sprite sheets.
- **PROCEDURAL_FINAL:** 7 worlds without authored files.

Runtime paths are centralized in `src/content/assetPaths.ts`. Large worlds use WebP layers;
characters/events/UI use SVG through `<img>`, avoiding inline gradient/filter id collisions.
Poopdex uses `_thumbnails/<slug>_192.png` when present.

## Skins

- Gameplay skins: `src/content/skins.ts` (stats, unlock rules)
- Visual composition: `src/content/skinsVisual.ts` → `getSkinVisual()`
- Rendering: `src/ui/character/PoopCharacter.tsx` (authored benchmark assets with procedural
  composition fallback)

`animationVariant` on skin defs maps to `data-anim` CSS; `vfx` aligns with visual `aura` / `texture`.

## Worlds

Five benchmark worlds use authored WebP layers in `src/ui/world/WorldStage.tsx`. Seven worlds
without authored files retain the CSS renderer. Unlocks still use `src/content/worlds.ts`.

## Missing final art

`ASSET_MANIFEST.missingFinalArt` lists `chef_poop`, unused extra pack skins beyond the current
roster, and 7 world illustrations. Procedural stand-ins remain intentional fallbacks.

## Production bundle and Android

The Vite build prunes authoring-only content: generator source, contact sheet, store sources,
source frames and duplicate P0 environment assets. `scripts/verifyDistAssets.mjs` checks that
required runtime assets remain.

Android launcher/splash resources are synchronized from `P2_store` with:

```bash
npm run android:assets
```

Store screenshot files are mockups; regenerate them from the real UI before Play submission.

## Validation

`npm run validate:content` verifies:

- Every skin has manifest + `skinsVisual` entry
- `animationVariant` / `vfx` reference supported runtime keys
- Event / world ids referenced by content exist in manifest
- Every `FINAL` manifest path exists
- Every authored world has all four WebP layers
- Production `dist/` excludes authoring-only files
