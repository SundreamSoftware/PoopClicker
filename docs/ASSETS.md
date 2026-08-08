# Assets

## Manifest

`src/content/assetManifest.ts` is the single registry for skin variants, animations, VFX slots, UI icons, events, and worlds.

Status vocabulary:

| Status             | Meaning                          |
| ------------------ | -------------------------------- |
| `PROCEDURAL_FINAL` | Shippable CSS/SVG procedural art |
| `FINAL`            | Raster final (none bundled yet)  |
| `TEMPORARY`        | Placeholder                      |
| `MISSING`          | Reserved slot                    |

## Skins

- Gameplay skins: `src/content/skins.ts` (stats, unlock rules)
- Visual composition: `src/content/skinsVisual.ts` → `getSkinVisual()`
- Rendering: `src/ui/character/PoopCharacter.tsx` (body shape, texture, aura, accessories)

`animationVariant` on skin defs maps to `data-anim` CSS; `vfx` aligns with visual `aura` / `texture`.

## Worlds

World backgrounds are CSS-driven (`src/ui/world/`). Unlock by flush count (see `src/content/worlds.ts`).

## Missing final art

`ASSET_MANIFEST.missingFinalArt` lists illustration packs not yet produced. Procedural stand-ins ship in production builds.

## Validation

`npm run validate:content` verifies:

- Every skin has manifest + `skinsVisual` entry
- `animationVariant` / `vfx` reference supported runtime keys
- Event / world ids referenced by content exist in manifest
