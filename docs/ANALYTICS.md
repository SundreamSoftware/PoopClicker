# Analytics

Analytics are **opt-in at the sink level** — the game ships with in-memory / dev-console sinks; wire a network sink for production.

## API

`AnalyticsSink` (`src/services/analytics.ts`):

```typescript
track(event: string, payload?: Record<string, unknown>): void
```

Implementations:

- `MemoryAnalytics` — test assertions
- `ConsoleAnalytics` — dev logging (`import.meta.env.DEV`)
- `AggregatingAnalytics` — wraps another sink; batches high-frequency `tap` into `taps_aggregated` every 50 taps

## Event naming

Feature events use snake_case prefixes:

| Prefix                                        | Examples              |
| --------------------------------------------- | --------------------- |
| `tap`, `first_tap`, `taps_aggregated`         | Input                 |
| `flush`, `frenzy_started`, `frenzy_completed` | Prestige / tempo      |
| `daily_*`, `streak_*`, `daily_dump_*`         | Retention             |
| `achievement_unlock`                          | Meta                  |
| `event_start`, `event_complete`               | Live events           |
| `skin_*`, `offline_reward_claim`              | Collection / sessions |
| `iap_*` (when wired)                          | Monetization          |

Content events reference `analyticsId` on `EventDef` where applicable.

## Privacy / volume

- Do not send raw tap streams; use aggregation or session summaries.
- Avoid PII in payloads; prefer ids and counts.
- High-frequency engine paths call `track('tap')` — always wrap production sinks with `AggregatingAnalytics` or equivalent.

## Testing

Engine tests can inject `MemoryAnalytics` via `GameEngine` constructor options (when needed). Most tests rely on side-effect-free default no-op sink.
