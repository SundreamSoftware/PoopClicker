# Poop Clicker — P4 PNG pack

Runtime uses the normalized folders (web-safe names + transparent skins):

```
P4_skins/<material>.png
P4_skins/_thumbnails/<material>_192.png
P4_expressions/expr_01.png … expr_06.png
P4_environments/L1.png … L10.png
```

Source drops (spaces / Polish names) live in `P4-skins`, `P4-expressions`, `P4_environment`.
Re-process after replacing sources:

```bash
py scripts/processP4Assets.py
```

## Layer model

1. Body: material PNG (no face), transparent background  
2. Face: `expr_0N.png` overlay (already transparent), pinned to mid/upper coils  
3. World: full-bleed `L#.png` cover background (includes the toilet — no separate toilet sprite)

CPS → expression level (all six wired):

| CPS | level | file |
| --- | --- | --- |
| 0–1 | lv1 | `expr_01.png` |
| 2–5 | lv2 | `expr_02.png` |
| 6–9 | lv3 | `expr_03.png` |
| 10–12 | lv4 | `expr_04.png` |
| 13–16 | lv5 | `expr_05.png` |
| 16+ | lv6 | `expr_06.png` |

## Materials

`basic` `cosmic` `diamond` `gold` `lava` `obsidian` `ooze` `pink` `stone` `wood`

Gameplay skins map onto these 10 materials until unique costume art arrives.
