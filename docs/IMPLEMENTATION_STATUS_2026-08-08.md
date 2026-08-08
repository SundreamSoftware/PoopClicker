# Implementation status — 2026-08-08

## Outcome

Poop Clicker is a working React/TypeScript/Capacitor Android game with real progression,
retention systems, native service adapters, automated web/native validation, and a bootable
debug APK.

The Android startup incident in v1.0.0 is resolved in
[v1.0.1](https://github.com/SundreamSoftware/PoopClicker/releases/tag/v1.0.1).

## Completed

### Gameplay and retention

- Real 60-second Daily Dump with normalized scoring and idempotent reward claim.
- Nine event mechanics with a save-safe timestamp scheduler (no per-frame spawn RNG).
- Flush/Royal Flush progression, fixed post-flush production bonus, milestone effects.
- Correct streak-cycle behavior, daily challenge scaling/rerolls, Bathroom Break.
- Achievements, Poopdex, modular skins, world environments, Next Goal.
- Auto-Buy with explicit ON/OFF and generator/upgrade category preferences.

### Presentation

- Modular character + toilet, face/CPS states, procedural skin layers, world stages.
- Pooled/limited event targets and tap feedback.
- Procedural SFX and layered music with persisted settings.
- Reduced-motion, haptics, privacy choices, notification preferences.

### Monetization and platform

- Native AdMob adapter with safe Google test IDs in debug.
- UMP consent and reopenable privacy choices.
- Play Billing adapter, restore, entitlement/grant idempotency.
- Firebase Analytics adapter, aggregated tap events.
- Deferred local-notification permission and scheduling.
- Required AdMob Android manifest metadata; release configuration gates.

### Verification

- 135 deterministic Vitest tests.
- Playwright Pixel 7 browser journeys: launch/tap/persist/navigation, Daily Dump, store.
- Android app and instrumented-test APK assembly.
- Emulator smoke: MainActivity, Capacitor bridge, visible JavaScript WebView.
- PR and main CI, scheduled/native-change emulator CI, browser E2E workflow.

## This iteration started and implemented

1. Auto-Buy category controls (`generators`, `upgrades`) with migration and tests.
2. Playwright mobile-browser E2E journeys and CI workflow.
3. Updated implementation and next-step reporting.

## Next plan

### Phase 1 — external release configuration (blocked on account assets)

1. Create production AdMob app/units and configure `ADMOB_APP_ID` plus `VITE_ADMOB_*`.
2. Create Play Console IAP products matching `src/content/iapProducts.ts`.
3. Supply upload keystore secrets and generate signed release AAB.
4. Add Firebase `google-services.json`.
5. Publish privacy policy; complete Data Safety/content rating.

### Phase 2 — physical-device release QA

1. Install signed internal-track build on API 24, 33, and 36 devices.
2. Verify EEA UMP, rewarded/interstitial callbacks, purchases/pending/restore.
3. Kill/background during Daily Dump/events and verify persistence.
4. Profile TP Storm/Golden Rain frame time and memory on a mid-tier device.
5. Verify Android 13+ notification permission and scheduled delivery.

### Phase 3 — launch assets and operations

1. Produce Play Store screenshots/feature graphic/copy.
2. Add Crashlytics after Firebase configuration exists.
3. Establish internal → closed → open → production rollout gates.
4. Replace selected procedural assets with FINAL art based on measured player value.

## Remaining blockers

| Priority | Blocker                    | Required input                                    |
| -------- | -------------------------- | ------------------------------------------------- |
| P0       | Signed Play AAB            | Upload keystore and passwords                     |
| P0       | Live ads                   | AdMob app and unit IDs                            |
| P0       | Live billing               | Products created/activated in Play Console        |
| P0       | Store compliance           | Public privacy-policy URL and Play Console access |
| P1       | Native analytics           | Firebase Android config                           |
| P1       | Physical-device confidence | Android devices/internal testing track            |

No code can safely fabricate these credentials or account-side products.
