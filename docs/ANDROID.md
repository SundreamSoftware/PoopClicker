# Android APK

Poop Clicker ships as a **Capacitor** WebView shell (`com.sundreamsoftware.poopclicker`).

## Debug APK (sideload)

Prefer CI artifacts from the PR `validate` job (`PoopClicker-debug`) or a local rebuild. Do not commit APK binaries.

## Rebuild locally

Requirements: JDK 21+, Android SDK (API 34+ per Capacitor config).

```bash
export ANDROID_HOME=/path/to/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

npm install
npm run cap:apk
# output: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Package & tests

| Item               | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Application ID     | `com.sundreamsoftware.poopclicker`                                   |
| Main activity      | `com.sundreamsoftware.poopclicker.MainActivity`                      |
| Instrumented tests | `android/app/src/androidTest/java/com/sundreamsoftware/poopclicker/` |
| Unit tests         | `android/app/src/test/java/com/sundreamsoftware/poopclicker/`        |

Instrumented smoke test asserts the runtime package name matches `com.sundreamsoftware.poopclicker` (not the Capacitor template `com.getcapacitor.app`).

## Native integrations

Optional Gradle dependencies (loaded dynamically):

- `@capacitor-community/admob` — ads on native Android
- `@capgo/native-purchases` — Play Billing

Web/stub services are used when plugins are unavailable (including Vitest).

## Release builds

Debug APK is unsigned for sideload QA. For Play Store, configure a release keystore and run `./gradlew bundleRelease`. See [RELEASE.md](RELEASE.md).
