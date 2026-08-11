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

## Authored pack — P4 PNG skins & environments

See `public/assets/P4_README.md`. Re-process source drops with `py scripts/processP4Assets.py`.

- **Layer model:** `P4_skins/<material>.png` (transparent body) + shared
  `P4_expressions/expr_01.png` … `expr_06.png` on the upper coils.
- **FINAL (runtime):** 46 roster skins map onto 10 materials; face follows the CPS ladder
  (`idle` → `overdrive`).
- **FINAL:** all 12 worlds use full-bleed `P4_environments/L1.png` … `L10.png`
  (void/omni reuse levels until unique art lands).
- **FINAL:** event target/boss/banner art, toilet states, currency/nav icons, sprite sheets.
- **Fallback:** procedural SVG character if a PNG fails to load; legacy P1 WebP layers remain
  as secondary world fallback.

Runtime paths are centralized in `src/content/assetPaths.ts`. Characters/events/UI load through
`<img>`. Poopdex uses `P4_skins/_thumbnails/<material>_192.png`.

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

`ASSET_MANIFEST.missingFinalArt` notes that P4 currently ships **10 shared materials** (not
unique costumes per roster skin) and that two worlds reuse environment levels.

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
