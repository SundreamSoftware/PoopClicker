# Analytics

## Wiring

`src/state/gameSingleton.ts` creates a real `AnalyticsSink` via `createAnalytics()` and passes it into `GameEngine.fromStorage({ analytics })`. The engine must receive this sink — do not construct a silent no-op in production.

## Providers

| Provider                | When                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `ConsoleAnalytics`      | Dev (`import.meta.env.DEV`)                                        |
| `FirebaseAnalyticsSink` | Native Capacitor (`@capacitor-firebase/analytics`, dynamic import) |
| `MemoryAnalytics`       | Unit tests                                                         |
| `AggregatingAnalytics`  | Always wraps the composite sink                                    |

`createAnalytics()` builds `AggregatingAnalytics(CompositeAnalytics([...]))`. Missing Firebase / plugin failures are swallowed so gameplay never blocks.

## Retention / product events (engine)

Emitted from gameplay (not every tap):

- `session_start` / `session_end` (bootstrap / background when wired)
- `first_tap`, `first_generator`, `first_upgrade`, `first_flush`
- `flush`, `flush_power_gain`
- `daily_open`, `daily_challenge_complete`, `daily_challenge_claim`, `daily_chest`
- `streak_claim`, `streak_break` / `streak_broken`, `streak_saver`
- `bathroom_break_claim`
- `daily_dump_start`, `daily_dump_complete`
- `achievement_unlock`, `achievement_claim`
- `skin_unlock`, `skin_equip`
- `world_unlock`, `world_enter` (when wired)
- `event_start`, `event_complete`, `event_fail`
- `frenzy_started`, `frenzy_completed`
- `rewarded_ad_complete` / `rewarded_*` from UI placements
- `iap_*` from shop purchase flow

High-frequency taps use `track('tap')` which is aggregated to `taps_aggregated` every 50 taps.

## Privacy

- No PII in payloads
- No per-tap network events
- Consent / UMP must complete before ad-related analytics where required by policy
