# Events

Nine data-driven live events (`src/content/events.ts`) orchestrated by `src/core/systems/eventSystem.ts` and rendered in `src/ui/events/EventOverlay.tsx`.

## Scheduling

- Random events: `nextRandomEventAt` on save, weighted by `pickScheduledEvent()`
- Golden poop: separate golden spawn schedule
- Minimum flush counts gate late events

Only one active event at a time.

## UI presentations

Each event declares `uiPresentation`. Supported values (see `EVENT_UI_PRESENTATIONS_SUPPORTED` in `eventSystem.ts`):

| uiPresentation       | Event types                   | UX                         |
| -------------------- | ----------------------------- | -------------------------- |
| `floating_target`    | `golden_poop`                 | Catch single golden target |
| `multi_target`       | `golden_rain`                 | Multiple golden targets    |
| `falling_objects`    | `toilet_paper_storm`          | Catch TP rolls             |
| `boss_bar`           | `clogged_toilet`, `mega_clog` | Tap progress bar           |
| `cps_meter`          | `plumber_inspection`          | Hold CPS band              |
| `banner_boost`       | `burrito_rush`                | Banner + passive boost     |
| `screen_shake_boost` | `toilet_quake`                | Banner + screen shake      |
| `choice_cards`       | `mystery_flush`               | Pick 1 of 3 rewards        |

Engine catch API: `GameEngine.catchEventTarget(id)` (overlay uses `onCatchTarget`).

## Rewards

`computeEventRewards()` applies base GTP / PP minutes scaled by:

- Production event bonus upgrades
- Flush milestone **Event Magnet** (+25% via `milestoneEventBonus()` at 15 flushes)

## Testing

- `tests/events/events.test.ts` — spawn, tap boss, cooldown
- `tests/systems/eventSystem.test.ts` — runtime unit tests
- `tests/ui/dailyPanel.test.ts` — golden rain catch path
- Content cross-check: `tests/content/contentValidation.test.ts`
