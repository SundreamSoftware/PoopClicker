# Android APK

Poop Clicker is packaged with **Capacitor** as a native Android WebView shell.

## Debug APK

Debug APKs are **CI artifacts**, not committed binaries.

- GitHub Actions **CI** workflow builds `assembleDebug` and uploads the APK.
- Download from the workflow run’s Artifacts section (`PoopClicker-debug`).

Package id: `com.sundreamsoftware.poopclicker`

## Rebuild locally

Requirements: JDK 21+, Android SDK (platform 34+/36 as configured by Capacitor).

```bash
export ANDROID_HOME=/path/to/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

npm install
npm run cap:apk
# output: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Notes

- Debug APKs are not Play Store release-signed.
- For release AAB/APK, use the `Android Release Build` workflow or configure a keystore locally. See [RELEASE.md](RELEASE.md).
- Production AdMob / billing / Firebase need Play Console + Firebase project secrets; CI debug builds use test IDs / stubs. See [MONETIZATION.md](MONETIZATION.md).
