# Testing

## Commands

```bash
npm run test                 # all Vitest suites
npm run validate:content     # content graph + skin/event validation
npm run simulate:economy     # deterministic economy pacing sim
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run ci                   # full pipeline
```

Vitest config: `vite.config.ts` (`environment: node`, `tests/**/*.test.ts`).

## Suites

| Area                                   | File                                                               |
| -------------------------------------- | ------------------------------------------------------------------ |
| Large numbers / formatting             | `tests/numbers/LargeNumber.test.ts`                                |
| Economy formulas                       | `tests/economy/economy.test.ts`                                    |
| **Economy pacing simulation**          | `tests/economy/economySimulation.test.ts`                          |
| Flush / prestige / milestones          | `tests/flush/flush.test.ts`                                        |
| Daily / streak / bathroom              | `tests/daily/daily.test.ts`                                        |
| Daily dump runtime                     | `tests/systems/dailyDump.test.ts`                                  |
| Achievements                           | `tests/achievements/achievements.test.ts`                          |
| Skins                                  | `tests/skins/skins.test.ts`                                        |
| Generators                             | `tests/generators/generators.test.ts`                              |
| Events                                 | `tests/events/events.test.ts`, `tests/systems/eventSystem.test.ts` |
| **Time / UTC / rollback**              | `tests/time/time.test.ts`                                          |
| Rapid tapping                          | `tests/tapping/rapidTap.test.ts`                                   |
| Save/load / migration                  | `tests/save/saveLoad.test.ts`, `tests/save/migration.test.ts`      |
| Engine snapshot                        | `tests/ui/snapshotStability.test.ts`                               |
| **Daily panel / event catch UI paths** | `tests/ui/dailyPanel.test.ts`                                      |
| **Ads**                                | `tests/monetization/ads.test.ts`                                   |
| **Billing / IAP grants**               | `tests/monetization/billing.test.ts`                               |
| **Content validation**                 | `tests/content/contentValidation.test.ts`                          |

## Economy simulation

Profiles: new player, 10 min, 30 min, first-flush-ready, and flush counts 1/3/5/10/25/50/100.

Uses `FixedClock`, seeded RNG, and `GameEngine` to assert:

- Fast first purchase for active play
- First flush between 30s and 3h active time
- No late-game hard purchase walls
- Post-flush multiplier always improves

## Android instrumented tests

Package namespace: **`com.sundreamsoftware.poopclicker`** (not Capacitor template `com.getcapacitor.*`).

Run on device/emulator from Android Studio or:

```bash
cd android && ./gradlew connectedDebugAndroidTest
```

## Manual smoke

1. `npm run dev`
2. Rapid tap → Slow / Active / Fast / Frenzy states
3. Buy generator + upgrade; flush when ready
4. Daily challenge claim; streak; bathroom break
5. Daily Dump once per UTC day
6. Trigger and catch an event
7. Reload → save persists
8. Optional: rewarded ad reroll; stub IAP on web
