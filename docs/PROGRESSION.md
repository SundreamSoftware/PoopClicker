# Poop Clicker — Progression, Economy & Retention

## Core loop

```text
OPEN APP → OFFLINE REWARD → DAILY / STREAK / BATHROOM BREAK
→ TAP + IDLE → UPGRADES / GENERATORS → EVENTS → ACHIEVEMENTS
→ COLLECTION → FLUSH → FLUSH POWER → ROYAL FLUSH → FASTER NEXT RUN
```

## Currencies

| Currency        | Role                                                         |
| --------------- | ------------------------------------------------------------ |
| **PP**          | Soft run currency. Spent on generators/upgrades.             |
| **GTP**         | Meta currency (cosmetics, Royal Flush nodes, daily rewards). |
| **Flush Power** | Permanent prestige multiplier. Never spent.                  |

Legacy saves: `prestigeBonus` migrates into Flush Power; GTP stays spendable (`migrateSave.ts`).

## Flush model

- `currentPP` — decreases on purchases
- `runPPEarned` — never decreases on purchases (prestige basis)
- `lifetimePPEarned` — lifetime stat

```text
flushPowerGain = floor(10 * (runPPEarned / 1e6) ^ 0.33)
globalMult = 1 + flushPower * 0.05   (soft-caps after 500 FP)
```

First flush of the UTC day: **+25%** power gain once.

## Flush milestones

Defined in `src/content/flushMilestones.ts`, applied in `performFlush()`:

| Flushes | Effect                                     |
| ------- | ------------------------------------------ |
| 1       | Royal Flush tree                           |
| 3       | Start bonus PP (5 min idle)                |
| 5       | Auto-buy unlock                            |
| 10      | Start generator bonus + `king_poop` skin   |
| 15      | +25% event rewards (`milestoneEventBonus`) |
| 25      | `diamond_poop`                             |
| 50      | +25% permanent production                  |
| 100     | Omni Throne world + `the_final_poop`       |

## Royal Flush

Unlocked at 1 flush. Data-driven DAG (`src/content/royalFlush.ts`). Flush Power is a **threshold**; node costs are **GTP**. Graph must stay acyclic (validated in tests).

## Daily systems

- **3 Daily Challenges** / UTC day — scaled by production
- **Daily Toilet Chest** after all three claimed
- **Rewarded reroll** — 1/day, optional
- **Daily Streak** — 7-day cycles, Streak Saver
- **Bathroom Break** — charge every 4h, max 2
- **Daily Dump** — 60s local mini-game, one attempt per UTC day

## Economy pacing (simulated)

`npm run simulate:economy` runs deterministic profiles (new → 100 flushes) and asserts purchase/flush walls stay reasonable for active play.

## Save

`schemaVersion: 2` — `src/core/save/saveSchema.ts`. Batched persist ~2s; immediate on flush, claims, background.

## Content volumes

Targets enforced in `tests/content/contentValidation.test.ts`: 30+ tap upgrades, 20+ generators, 40+ skins, 80+ achievements, 9 events, 25+ Royal Flush nodes.
