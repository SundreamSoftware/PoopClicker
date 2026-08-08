# Poop Clicker — Progression, Economy & Retention

## Repository status

This repository previously contained only a README. The game was implemented as a **TypeScript + React + Vite** mobile-first PWA with a pure TypeScript game engine (`src/core`) separated from UI (`src/ui`).

## Core loop

```text
OPEN APP → OFFLINE REWARD → DAILY / STREAK / BATHROOM BREAK
→ TAP + IDLE → UPGRADES / GENERATORS → EVENTS → ACHIEVEMENTS
→ COLLECTION → FLUSH → FLUSH POWER → ROYAL FLUSH → FASTER NEXT RUN
```

## Currencies

| Currency        | Role                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| **PP**          | Soft run currency. Spent on generators/upgrades.                                    |
| **GTP**         | Spendable meta/premium currency (cosmetics, Royal Flush node costs, daily rewards). |
| **Flush Power** | Permanent prestige power. Never spent. Multiplies tap + idle.                       |

Legacy saves that used GTP as prestige are migrated: `prestigeBonus` (or 10% of GTP) becomes Flush Power; GTP remains spendable.

## Flush model

Tracked separately:

- `currentPP` — decreases on purchases
- `runPPEarned` — never decreases on purchases
- `lifetimePPEarned` — permanent statistic

Flush reward uses **`runPPEarned`**:

```text
flushPowerGain = floor(10 * (runPPEarned / 1e6) ^ 0.33)
```

First Flush of the Day applies **+25%** once per UTC day.

Global multiplier:

```text
1 + flushPower * 0.05   (soft-caps after 500 FP)
```

## Royal Flush

Unlocked at 1 Flush. Data-driven nodes (`src/content/royalFlush.ts`) in categories:

Pressure · Plumbing · Combo · Idle · Luck

Flush Power is a **threshold** (not spent). Node levels cost **GTP**.

## Daily systems

- **3 Daily Challenges** / UTC day from activity / economy / event categories, dynamically scaled
- **Daily Toilet Chest** after claiming all three
- Optional rewarded-ad **reroll** (1/day) — never required
- **Daily Streak** with 7-day cycles + Streak Saver
- **Bathroom Break** charge every 4h, max 2
- **Daily Dump** local 60s activity with bronze→diamond thresholds

## Content volumes

See `npm run validate:content`. Targets include ~30 tap upgrades, 10+ combo, 10+ crit, 20+ generators, 40+ skins, 80+ achievement tiers, 9 events, 30 Royal Flush nodes.

## Save schema

`schemaVersion: 3` — see `src/core/save/saveSchema.ts` and `migrateSave.ts`.

Persistence batches about every 2s during play and immediately on purchases / flush / claims / background.

## Ads

See [MONETIZATION.md](MONETIZATION.md). Stubs on web/tests; AdMob test IDs in DEV on native. Interstitials respect removeAds, session age, events/frenzy, and rewarded cooldown.

## Analytics

See [ANALYTICS.md](ANALYTICS.md). High-frequency taps are aggregated; feature events tracked via `AnalyticsSink` / Firebase on native.

## Assets

Procedural/CSS skin variants are wired through `ASSET_MANIFEST`. Final illustration art is documented as missing under `ASSET_MANIFEST.missingFinalArt`.

## Notifications

Scheduler hooks exist (`src/services/notifications.ts`). Full OS permission UX is intentionally not prompted on first launch (`shouldPromptForNotifications`).
