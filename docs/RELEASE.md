# Release

## Web / PWA

```bash
npm run ci      # format, lint, typecheck, test, build
npm run build   # dist/ for static hosting or Capacitor webDir
```

Deploy `dist/` to your static host. `base: './'` supports file:// and embedded WebView paths.

## Android debug APK

Package: **`com.sundreamsoftware.poopclicker`**

```bash
npm run cap:apk
# android/app/build/outputs/apk/debug/app-debug.apk
```

Prebuilt artifact for sideload: `artifacts/PoopClicker-debug.apk` (when present in repo).

Requirements: JDK 21+, Android SDK, `android/local.properties` pointing at SDK.

Instrumented tests live under `android/app/src/androidTest/java/com/sundreamsoftware/poopclicker/`.

## Play Store release (outline)

1. Create Play Console app with package `com.sundreamsoftware.poopclicker`
2. Create IAP products matching `src/content/iapProducts.ts` store IDs
3. Create AdMob ad units; set `VITE_ADMOB_*` env vars for production builds
4. Configure release keystore; run `./gradlew bundleRelease` in `android/`
5. Upload AAB; complete content rating, data safety, ads declaration

## Versioning

- `package.json` `version` — marketing version
- Android `versionCode` / `versionName` in `android/app/build.gradle` — bump per release

## Pre-release checklist

- [ ] `npm run ci` green
- [ ] Content validation passes (`npm run validate:content`)
- [ ] Economy simulation passes (`npm run simulate:economy`)
- [ ] Smoke test on device: tap, buy, flush, daily, event, persistence
- [ ] Verify Remove Ads / GTP grants on internal testing track
- [ ] Confirm AdMob test IDs not in production env
