# Release checklist — Poop Clicker (Android)

Code baseline: `main` @ `ebb4d32` (audit hardening).  
Local game/code audit is landed. The items below are what still blocks a Play Store release.

Do not invent Play product IDs, AdMob unit IDs, or a receipt backend in the repo. Create them in the consoles, then put the real values in GitHub secrets.

---

## 0. Confirm the build on `main`

- [ ] GitHub Actions **CI** on `ebb4d32` (or later) is green: https://github.com/SundreamSoftware/PoopClicker/actions
- [ ] Download the **PoopClicker-debug** artifact from that run and sideload it (`adb install -r`)
- [ ] Cold start reaches Play (character + toilet visible, no crash)

---

## 1. Accounts and legal (do these first)

- [ ] Play Console app exists for `pl.sundreamsoftware.poopclicker`
- [ ] Privacy policy URL is live (ads + IAP + analytics)
- [ ] Play **Data safety** form matches: ads, purchases, analytics, local save, notifications
- [ ] Content rating questionnaire completed
- [ ] Target audience / store listing age rating matches 18–35 casual (no child-directed ads)

---

## 2. Firebase + Analytics

- [ ] Firebase Android app for `pl.sundreamsoftware.poopclicker`
- [ ] `google-services.json` downloaded
- [ ] GitHub secret `GOOGLE_SERVICES_JSON_BASE64` = base64 of that file
- [ ] Analytics events appear in DebugView after a consent-allowed session (`not_required`)

Without this, Firebase stays a no-op. In-app `app_error` breadcrumbs still fire locally.

---

## 3. AdMob (production IDs)

Create a real AdMob app and units. **Do not** ship Google sample IDs (`3940256099942544`). The release workflow rejects them when `production=true`.

| Secret                       | What it is                                                |
| ---------------------------- | --------------------------------------------------------- |
| `ADMOB_APP_ID`               | `ca-app-pub-xxxx~yyyy` (also used as `VITE_ADMOB_APP_ID`) |
| `VITE_ADMOB_BANNER_ID`       | Banner unit (optional if unused)                          |
| `VITE_ADMOB_INTERSTITIAL_ID` | Interstitial unit                                         |
| `VITE_ADMOB_REWARDED_ID`     | Rewarded unit                                             |

- [ ] All four IDs created in AdMob
- [ ] Secrets set on the GitHub repo
- [ ] Debug/CI can keep sample IDs; only production release uses the secrets
- [ ] UMP / consent tested on an **EEA or UK** account: ads start only after `not_required` (or after the user allows ads, if you later add that path)

---

## 4. Play Billing products

Create **one-time** in-app products whose IDs match the catalog exactly. Store SKUs use the same prefix as applicationId: `pl.sundreamsoftware.poopclicker.*`:

| Play product ID                                      | Type in game    | Grant                                                                         |
| ---------------------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `pl.sundreamsoftware.poopclicker.remove_ads`         | non-consumable  | Remove interstitials                                                          |
| `pl.sundreamsoftware.poopclicker.gtp_small`          | consumable      | 50 GTP                                                                        |
| `pl.sundreamsoftware.poopclicker.gtp_medium`         | consumable      | 180 GTP                                                                       |
| `pl.sundreamsoftware.poopclicker.gtp_large`          | consumable      | 350 GTP                                                                       |
| `pl.sundreamsoftware.poopclicker.gtp_huge`           | consumable      | 800 GTP                                                                       |
| `pl.sundreamsoftware.poopclicker.gtp_mega`           | consumable      | 2000 GTP                                                                      |
| `pl.sundreamsoftware.poopclicker.toilet_tycoon_pack` | one-time bundle | Remove ads + 250 GTP + `toilet_tycoon` skin                                   |
| `pl.sundreamsoftware.poopclicker.convenience_pack`   | one-time bundle | Auto-Buy + Remove Ads + 4h offline + 1 Bathroom Break ($29.99, after 1 Flush) |

- [ ] Every ID above exists and is **active**
- [ ] License testers added
- [ ] Device: purchase, cancel, pending, restore (Settings + Shop)
- [ ] Consumable GTP does **not** come back on Restore
- [ ] Remove Ads survives reinstall via Restore / silent sync

**Still missing for a serious store:** server receipt validation + Play RTDN refunds. Client acknowledge/consume is in place; a cheater can still grant locally. Add a backend before paid scale, not before internal testing.

---

## 5. Signing

- [ ] Upload keystore created and backed up offline
- [ ] GitHub secrets:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS` (workflow default `upload` if unset)
  - `ANDROID_KEY_PASSWORD`
- [ ] Play App Signing accepted (upload key → Play)

---

## 6. Build the signed AAB

GitHub → Actions → **Android Release Build** → Run workflow:

- `build_type`: `bundleRelease`
- `production`: **true**

- [ ] Workflow is green
- [ ] Artifact `PoopClicker-release` contains an `.aab`
- [ ] Upload AAB to an **internal testing** track

---

## 7. Device QA (internal track)

Install the Play internal build (not the debug APK).

### Session

- [ ] First session: tap → Shop generator → Flush in about 6–12 min at a casual pace
- [ ] Tutorial does not block taps
- [ ] Next-goal card visible on Play
- [ ] Android Back: Dump confirm / Flush close / offline block / return to Play
- [ ] Kill app mid-Daily Dump and mid-event; progress resumes or the day is not stolen
- [ ] Offline reward after 5+ minutes background
- [ ] Notifications prompt only after a claim; Android 13+ permission works

### Monetization

- [ ] Interstitial only after Flush; max 2 / session; 90s session age; 180s gap
- [ ] Rewarded: grant only after the reward callback (dismiss ≠ reward)
- [ ] Store hidden / unavailable toast when Billing is down
- [ ] IAP and restore as in section 4
- [ ] Consent: no ads / Firebase until UMP allows

### Save

- [ ] Settings Export / Import
- [ ] Error screen: Restart, Restore Backup, confirmed Reset

---

## 8. Store listing

- [ ] Phone screenshots from the **release** build
- [ ] Feature graphic
- [ ] Short and long description
- [ ] App icon (authored adaptive icon is already in the Android project)

---

## 9. After internal, before production

- [ ] Closed testing → open testing
- [ ] Crash-free sessions acceptable on Play Vitals
- [ ] Optional: Crashlytics SDK + receipt backend + server time
- [ ] Production rollout (staged %)

---

## Suggested order

```text
1. Privacy policy + Play listing forms
2. Firebase app + google-services.json secret
3. AdMob units + secrets
4. Play IAP products (IDs above) + license testers
5. Keystore secrets
6. workflow_dispatch android-release.yml (production=true) → AAB
7. Internal track → device QA
8. Listing assets → closed → open → production
```
