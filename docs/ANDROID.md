# Android APK

Poop Clicker is packaged with **Capacitor** as a native Android WebView shell.

## Debug APK (sideload testing)

Built artifact:

- `artifacts/PoopClicker-debug.apk`

Install on a device/emulator:

```bash
adb install -r artifacts/PoopClicker-debug.apk
```

Or copy the file to the phone and open it (enable **Install unknown apps** for your file manager).

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
```

## Notes

- This is a **debug** APK (not Play Store release-signed).
- For a release AAB/APK, configure a keystore and run `./gradlew assembleRelease` / `bundleRelease`.
