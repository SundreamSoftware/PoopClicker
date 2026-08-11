# Poop Clicker — P1 skins & expressions

87 skin bodies (no face) + 6 shared face overlays. Everything on a 512 × 512 viewBox.

## Layer model

Render `poop_<skin>_body.svg`, then overlay one `expr_XX.svg` on top — **same viewBox, no offset, no scaling**.

- Face anchor: `cx = 256` (50% width), eye line `y = 174` (34% height)
- Face box: `x 116–396`, `y 120–326`
- Skins with `maskedFace: true` in `manifest.json` (ninja, mummy, ghost, skeleton, mecha, robot, astronaut, knight, samurai, blackhole) should render **eyes only** from the overlay

## Structure

```
P1_skins/<skin>/poop_<skin>_body.svg
P1_expressions/expr_01_idle.svg … expr_06_overdrive.svg
manifest.json
```

## Expressions → CPS

| file | trigger |
|---|---|
| `expr_01_idle` | 0 CPS — neutral, blinking |
| `expr_02_focus` | 1–2 CPS — brows raised |
| `expr_03_effort` | 2–5 CPS — sweat drop, wider eyes |
| `expr_04_strain` | 5–8 CPS — blush, open mouth |
| `expr_05_max` | 8–12 CPS — full strain |
| `expr_06_overdrive` | 12+ CPS — frenzy peak, two sweat drops |

## Notes for the illustrator

Every shape carries an id (`lobe-bottom`, `lobe-mid`, `lobe-top`, `tip`, `arm-l`, `arm-r`, `accessory`, `face`), so geometry can be redrawn while the rig — anchor, face box, layer split — stays intact. `manifest.json` holds each skin's tone, outline colour, accessory type and masked-face flag.

These files are a **rig reference**, not final art: correct proportions, anchors and naming, placeholder illustration.
