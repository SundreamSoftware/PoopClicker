# Poop Clicker

Absurd casual / clicker / idle game focused on retention, Flush prestige, collection, and daily engagement.

## Stack

- TypeScript + React 19 + Vite
- Pure TS game engine (`src/core`) + data-driven content (`src/content`)
- Capacitor Android shell
- Vitest, oxlint, Prettier, GitHub Actions CI

## Quick start

```bash
npm install
npm run dev
```

## Android APK

Debug APKs are produced by CI (see the **CI** workflow artifacts), not committed to the repo.

```bash
# Local rebuild (requires Android SDK)
npm run cap:apk
# output: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

See [docs/ANDROID.md](docs/ANDROID.md) and [docs/RELEASE.md](docs/RELEASE.md).

## Validate

```bash
npm run ci
```

## Docs

- [Progression & economy](docs/PROGRESSION.md)
- [Testing](docs/TESTING.md)
- [Android](docs/ANDROID.md)
- [Monetization](docs/MONETIZATION.md)
- [Analytics](docs/ANALYTICS.md)
- [Release](docs/RELEASE.md)

## Note on assets

Gameplay uses procedural/CSS character variants keyed by `ASSET_MANIFEST`. Final illustration art is not bundled; see `missingFinalArt` in the manifest.
