# Android startup incident — 2026-08-08

## Impact

The v1.0.0 debug APK could terminate before `MainActivity` and the React UI appeared.

## Root cause

`@capacitor-community/admob` includes Google Mobile Ads. Android starts
`MobileAdsInitProvider` before the application activity. The required manifest value
`com.google.android.gms.ads.APPLICATION_ID` was absent, causing process-level startup failure.

The web build, TypeScript checks, unit tests, and `assembleDebug` did not detect this because
Android manifest validity is not equivalent to provider runtime configuration.

## Fix

- Added `com.google.android.gms.ads.APPLICATION_ID` metadata to `AndroidManifest.xml`.
- Added an `ADMOB_APP_ID` Gradle placeholder.
- Debug/CI defaults to Google's official sample app id.
- Production release can override it with `-PADMOB_APP_ID` / `ADMOB_APP_ID`.
- Added automated tests that require the metadata and safe debug fallback.
- Added an instrumented launch test that opens `MainActivity` and verifies Capacitor's WebView.
- Added scheduled/manual emulator CI for `connectedDebugAndroidTest`.
- Added a React error boundary and non-blocking native service initialization.

## Secondary finding

Building the instrumented test APK initially failed because Kotlin stdlib 1.8.22 was resolved
alongside legacy split `kotlin-stdlib-jdk7/jdk8` 1.6.21 artifacts. All Kotlin stdlib variants
are now aligned to 1.8.22 through the root Gradle resolution strategy.

## Verification

Required:

1. `npm run ci`
2. `npx cap sync android`
3. `./gradlew clean assembleDebug assembleDebugAndroidTest`
4. Verify the merged manifest contains the Google sample app id.
5. Run `connectedDebugAndroidTest` on emulator CI.
6. Install the rebuilt APK on a physical Android device.

Physical-device verification remains separate from compile/emulator verification.
