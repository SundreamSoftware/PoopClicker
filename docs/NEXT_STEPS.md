# Next steps after merge to `main`

Current `main`: `2a56434` (2026-08-08)  
Fixed debug APK: [Release v1.0.1](https://github.com/SundreamSoftware/PoopClicker/releases/tag/v1.0.1)

## Verified on merge

| Check                                                        | Result       |
| ------------------------------------------------------------ | ------------ |
| `npm run ci` (format, lint, typecheck, 135 tests, web build) | PASS         |
| Capacitor sync + `assembleDebug`                             | PASS         |
| Emulator launch + Capacitor WebView smoke                    | PASS         |
| GitHub Release APK published                                 | PASS         |
| Physical device install / Play Store publish                 | **NOT DONE** |

---

## Priority backlog

### P0 — blocks store release

| ID  | Item                                      | Why                                                  | Action                                                             |
| --- | ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| N01 | Production AdMob app/unit IDs             | Debug uses Google test IDs when `VITE_ADMOB_*` unset | Create AdMob app; set env in CI/release                            |
| N02 | Play Console IAP products                 | Billing catalog IDs must match store                 | Create `remove_ads`, `gtp_*`, `toilet_tycoon_pack` in Play Console |
| N03 | Release signing keystore                  | Debug APK is not upload-ready                        | Add `ANDROID_KEYSTORE_*` secrets; run `android-release.yml` → AAB  |
| N04 | Privacy policy + Data safety              | Required for Play listing with ads/IAP               | Publish policy URL; fill Play Data safety form                     |
| N05 | UMP/consent on real EEA device            | Legal for ads                                        | Device QA in EEA/UK test account                                   |
| N06 | `google-services.json` + Firebase project | Analytics currently no-ops without config            | Add Firebase Android app; commit/config via CI secret              |

### P1 — quality / retention before wide launch

| ID  | Item                                      | Why                                                       | Action                                                                      |
| --- | ----------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| N10 | Physical device QA matrix                 | Web smoke ≠ device game feel                              | Install release APK; test taps, events, Daily Dump, flush, ads, IAP restore |
| N11 | Instrumented Android tests on emulator CI | **Implemented and green**                                 | Monitor scheduled/main native-change runs                                   |
| N12 | Store listing assets                      | Need screenshots, feature graphic, short/long description | Produce phone screenshots from device                                       |
| N13 | Content rating / target API checklist     | Play policy                                               | Complete questionnaire; verify `targetSdk`                                  |
| N14 | Offline + background lifecycle on device  | Battery/OEM killers                                       | Kill app mid-event / mid-Daily Dump; verify save                            |
| N15 | Notification permission UX on Android 13+ | Prompt timing already deferred in code                    | Verify POST_NOTIFICATIONS flow on API 33+                                   |

### P2 — meaningful polish

| ID  | Item                                                                                 |
| --- | ------------------------------------------------------------------------------------ |
| N20 | FINAL raster art for hero skins (currently `PROCEDURAL_FINAL`)                       |
| N21 | Auto-buy generator/upgrade category preferences — **implemented**                    |
| N22 | Browser E2E (Playwright) in addition to engine journey tests — **implemented**       |
| N23 | Main-branch CI on push — **implemented**                                             |
| N24 | Performance pass on mid-tier Android during TP Storm / Golden Rain                   |
| N25 | Settings: Privacy/consent, Restore purchases, Notifications toggle — **implemented** |
| N26 | Close/delete obsolete branch `cursor/monetization-architecture-e89a` (superseded)    |

### P3 — optional

| ID  | Item                                                   |
| --- | ------------------------------------------------------ |
| N30 | More music beds / recorded SFX instead of procedural   |
| N31 | A/B hooks for event frequency / Daily Dump tiers       |
| N32 | Crashlytics / Play Vitals integration                  |
| N33 | iOS Capacitor target (explicitly out of current scope) |

---

## Suggested release path

```text
1. Configure AdMob + Firebase + Play IAP products
2. Add signing secrets → workflow_dispatch android-release.yml → AAB
3. Internal testing track → device QA checklist (N10)
4. Closed testing → open testing
5. Production rollout
```

## Sideload now

```bash
# From GitHub Release v1.0.1
adb install -r PoopClicker-v1.0.1-debug.apk
```

Or rebuild locally from `main`:

```bash
npm ci && npm run cap:apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
