# Authored asset integration audit

Date: 2026-08-08
Pack: `public/assets/` v1.0.0

## Inventory and quality

- 289 files, approximately 6.2 MB source size.
- 214 SVGs: all well-formed, all include `viewBox`, no scripts/external references/base64.
- 36 WebPs, 20 PNGs, 6 JSON files and 11 Python generator files.
- Character/toilet assets use consistent 512×512 rig anchors and named groups.
- World WebPs are 1440×2560 and visually consistent.
- Sprite strips are 2048×256 (8×256 frames) with matching metadata.

Assessment: cohesive generator-authored production kit. It is a significant quality improvement
over the procedural runtime, but not fully hand-painted final art. Store screenshots remain
mockups and must be regenerated from the real application.

## Integrated

### Character and toilet

- Full Classic expression set (normal, happy, effort, panic, frenzy, overdrive, dizzy).
- Authored benchmark skins: Classic, Corny, Diamond, Cyber, 404, Black Hole.
- Authored toilet idle/bounce/shake state selection.
- Authored frenzy/overdrive aura overlays.
- Procedural fallback remains for the other 40 skins or load failures.

### Worlds

Authored four-layer WebP scenes:

- Home Bathroom
- Office Toilet
- Space Loo
- Quantum Bathroom
- Omni Throne

The other seven worlds retain the current CSS renderer.

### Events and VFX

- Golden Poop / Golden Rain targets
- Toilet Paper target
- Clogged Toilet damage stages
- Mega Clog phases
- Burrito Rush / Toilet Quake banners
- Mystery Flush backdrop
- Authored tap/crit sprite strips

### UI and Android

- PP/GTP/Flush Power and available navigation icons.
- Authored benchmark thumbnails in Poopdex.
- Authored legacy/adaptive launcher resources and splash artwork.
- `npm run android:assets` provides deterministic Android resource synchronization.

## Runtime safeguards

- Centralized URL resolution in `src/content/assetPaths.ts`.
- Components preserve procedural fallback when an image fails.
- Composite SVGs load through `<img>` rather than inline DOM, preventing SVG id collisions.
- Reduced Motion disables authored VFX animation.
- CI verifies every `FINAL` manifest path and all authored world layers.

## Bundle policy

The source pack remains intact in the repository, except `_generator/` and its contact sheet are
ignored as local authoring tools. The production build prunes:

- Python generator/contact sheet
- store-only assets
- source animation frames
- duplicate P0 Home environment
- duplicate PNG sprite strips when WebP is used

`scripts/verifyDistAssets.mjs` verifies the allowlist after every production build.

## Known limitations

| Priority | Finding                                                   | Status                            |
| -------- | --------------------------------------------------------- | --------------------------------- |
| P1       | Seven worlds have no authored layer set                   | CSS fallback                      |
| P1       | Forty skins rely on procedural composition                | Fallback; accessory kit available |
| P2       | Non-Classic benchmark skins only have normal/happy/frenzy | Mapped fallback expression        |
| P2       | Some SVGs contain baked placeholder text                  | Dynamic numbers remain DOM text   |
| P2       | Store screenshots are mockups                             | Regenerate from final app         |
| P3       | Many decorative SVGs lack `<title>/<desc>`                | App supplies accessible labels    |

## Validation

- Unit/content tests: authored path existence and fallback coverage.
- Playwright: natural dimensions for authored character and all four world layers.
- Manual Pixel 7 review: no broken images, no horizontal overflow, no console errors.
- Android app/test APK: validated in CI; local Windows build may require JDK 17+ and a trusted
  corporate proxy certificate.
