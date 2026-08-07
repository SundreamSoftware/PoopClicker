# Testing

## Commands

```bash
npm run test
npm run validate:content
npm run simulate:economy
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run ci
```

## Suites

| Area                       | File                                      |
| -------------------------- | ----------------------------------------- |
| Large numbers / formatting | `tests/numbers/LargeNumber.test.ts`       |
| Economy / production       | `tests/economy/economy.test.ts`           |
| Economy pacing simulation  | `tests/economy/economySimulation.test.ts` |
| Flush / prestige           | `tests/flush/flush.test.ts`               |
| Daily / streak / bathroom  | `tests/daily/daily.test.ts`               |
| Achievements               | `tests/achievements/achievements.test.ts` |
| Skins ownership            | `tests/skins/skins.test.ts`               |
| Generators / milestones    | `tests/generators/generators.test.ts`     |
| Events                     | `tests/events/events.test.ts`             |
| Time / offline             | `tests/time/time.test.ts`                 |
| Rapid tapping              | `tests/tapping/rapidTap.test.ts`          |
| Save/load                  | `tests/save/saveLoad.test.ts`             |
| Migration                  | `tests/save/migration.test.ts`            |
| Content validation         | `tests/content/contentValidation.test.ts` |

## Manual smoke

1. Launch `npm run dev`
2. Rapid tap → observe Slow/Active/Fast/Frenzy states
3. Buy generator + upgrade
4. Progress daily challenge / claim
5. Unlock/equip skin
6. Reload page → persistence
7. Grant enough PP (debug) / play to Flush → verify stronger next run
8. Trigger event catch
9. Background tab → return → offline modal
