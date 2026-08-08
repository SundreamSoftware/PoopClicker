# Monetization

Production-ready service layer for ads, consent, and IAP. **Web and Vitest always use stubs.** Native Android uses Capacitor plugins when present.

## Architecture

| Layer         | Web / tests                           | Native Android                                         |
| ------------- | ------------------------------------- | ------------------------------------------------------ |
| Ads           | `StubAdService`                       | `CapacitorAdMobService` → `@capacitor-community/admob` |
| Consent (UMP) | `StubConsentService` (`not_required`) | `CapacitorUmpConsentService`                           |
| Billing       | `StubBillingService` (in-memory)      | `CapacitorBillingService` → `@capgo/native-purchases`  |

Factories: `createAdService()`, `createConsentService()`, `createBillingService()` in `src/services/*` and re-exported from `src/state/gameSingleton.ts`.

## AdMob IDs

- Debug (`import.meta.env.DEV` or missing production rewarded id): **Google official test IDs** from `src/config/monetization.ts`.
- Production placeholders: `VITE_ADMOB_APP_ID`, `VITE_ADMOB_BANNER_ID`, `VITE_ADMOB_INTERSTITIAL_ID`, `VITE_ADMOB_REWARDED_ID`.

You need a real AdMob app + ad units in Play Console / AdMob before shipping production ads. CI and local debug builds intentionally do **not** require those secrets.

## Consent

`ensureConsent()` returns `'required' | 'not_required' | 'unavailable' | 'error'`. It never throws and never hard-blocks the app. Configure GDPR/UMP messages in AdMob before relying on the form in production.

## IAP catalog

Data-driven in `src/content/iapProducts.ts`:

- `remove_ads` — non-consumable
- `gtp_small` … `gtp_mega` — consumable GTP packs
- `toilet_tycoon_pack` — bundle (remove ads + GTP + exclusive skin `toilet_tycoon`)

Store product IDs are placeholders (`com.sundreamsoftware.poopclicker.*`) until created in Play Console.

### Expected engine grant hooks

Idempotent grants should key off `PlayerSaveV2.ownedIapProducts`:

1. Non-consumables / bundles: if `productId` already in `ownedIapProducts`, skip re-grant.
2. Apply `removeAds`, union `skinIds` into `ownedSkins`, add `gtp`.
3. Consumables always grant GTP and are not locked in `ownedIapProducts`.

See `describeExpectedGrantHooks()` in `src/services/billing.ts`.

## Interstitials

`canShowInterstitial` blocks when:

- `removeAds` entitlement is true
- session age < 30s
- event / frenzy active
- rewarded ad completed within the last 120s
