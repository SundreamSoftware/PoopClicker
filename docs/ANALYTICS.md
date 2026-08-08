# Analytics

## Sinks

- `MemoryAnalytics` — tests
- `ConsoleAnalytics` — DEV console only
- `AggregatingAnalytics` — batches high-frequency `tap` into `taps_aggregated` every 50 taps
- `FirebaseAnalyticsSink` — dynamic import of `@capacitor-firebase/analytics` on native; no-op if missing
- `CompositeAnalytics` — fan-out used by the factory

## Factory

`createAnalytics()` (wired in `gameSingleton`) returns `AggregatingAnalytics` wrapping:

- `ConsoleAnalytics` when `import.meta.env.DEV`
- `FirebaseAnalyticsSink` when Capacitor reports a native platform

## Firebase setup (not required for CI)

Native Firebase Analytics needs:

1. A Firebase project with the Android app `com.sundreamsoftware.poopclicker`
2. `android/app/google-services.json` (gitignored / secret — not committed here)
3. The `firebase` JS peer (if required by your Capacitor Firebase version) and a successful `npx cap sync`

Without those, the Firebase sink silently no-ops. Web/dev builds never require Firebase secrets.
