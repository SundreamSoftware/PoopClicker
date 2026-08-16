# Monetization

Poop Clicker uses **optional** ads and IAP. Nothing in the core loop requires payment or rewarded ads.

## Architecture

| Layer         | Location                     | Notes                                                                 |
| ------------- | ---------------------------- | --------------------------------------------------------------------- |
| Config        | `src/config/monetization.ts` | AdMob test IDs, interstitial caps                                     |
| Ads           | `src/services/ads.ts`        | `StubAdService` (web/tests), `CapacitorAdMobService` (native Android) |
| Billing       | `src/services/billing.ts`    | `StubBillingService` (web/tests), `CapacitorBillingService` (native)  |
| Catalog       | `src/content/iapProducts.ts` | Product ids, grants, store SKUs                                       |
| Engine grants | `GameEngine.applyIapGrant()` | Idempotent via `ownedIapProducts`                                     |

## Rewarded placements

- `double_offline` — optional offline reward multiplier
- `income_boost`, `golden_spawn`, `instant_pps` — boost placements
- `daily_reroll` — one reroll per UTC day (Daily panel)
- `event_retry` — optional event retry

Rewarded ads never block progression rewards.

## Interstitials

Shown only when `canShowInterstitial()` returns true:

- Session age ≥ 30s (`INTERSTITIAL_MIN_SESSION_AGE_MS`)
- No active event or frenzy
- Not within 120s of a rewarded completion
- User does not have Remove Ads

Contexts: `flush`, `shop`, `world_change`.

## IAP catalog (stub / Play Console placeholders)

| Product                  | Kind           | Grant                                                                               |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------- |
| `remove_ads`             | non_consumable | Remove interstitials                                                                |
| `gtp_small` … `gtp_mega` | consumable     | GTP packs                                                                           |
| `toilet_tycoon_pack`     | bundle         | Remove ads + GTP + `toilet_tycoon` skin                                             |
| `convenience_pack`       | bundle         | Auto-Buy + ads off + 4h offline + 1 Bathroom Break (after 1 Flush). Legacy 2× kept. |

Store IDs use prefix `com.sundreamsoftware.poopclicker.*`.

## Testing

See `tests/monetization/ads.test.ts` and `tests/monetization/billing.test.ts`.

Native plugins (`@capacitor-community/admob`, `@capgo/native-purchases`) are optional; missing plugins fall back to stubs with a console warning.

## Consent

`src/services/consent.ts` holds UMP/consent hooks for future Play policy integration. No blocking consent UI on first launch today.
