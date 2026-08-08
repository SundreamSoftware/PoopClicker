# Release

## CI (no Play Console secrets required)

| Workflow                | Trigger                                      | Output                                                   |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `CI`                    | `pull_request` → `main`, `workflow_dispatch` | Web validate + `cap sync` + `assembleDebug` APK artifact |
| `Android Release Build` | `workflow_dispatch`                          | `bundleRelease` or `assembleRelease` AAB/APK artifact    |

Neither workflow publishes to Google Play.

## Optional signing secrets

For a signed release artifact, set repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

If absent, the release workflow still builds an unsigned / default-signed artifact suitable for internal testing — **not** for Play upload.

## Production checklist (manual, outside CI)

1. Create AdMob app + ad units; set `VITE_ADMOB_*` for production builds.
2. Configure UMP / GDPR messages in AdMob.
3. Create Play Console IAP products matching `src/content/iapProducts.ts` store IDs.
4. Add Firebase `google-services.json` for Analytics.
5. Sign with your upload keystore and upload the AAB via Play Console (or a separate publish pipeline).

Debug CI builds use Google test ad IDs and stub/fallback services when plugins or secrets are missing.
