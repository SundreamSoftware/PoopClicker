# Poop Clicker

Absurd casual / clicker / idle game focused on retention, Flush prestige, collection, and daily engagement.

## Stack

- TypeScript + React 19 + Vite
- Pure TS game engine (`src/core`) + data-driven content (`src/content`)
- Vitest, oxlint, Prettier, GitHub Actions CI

## Quick start

```bash
npm install
npm run dev
```

## Android APK

Debug APK for device testing:

- [`artifacts/PoopClicker-debug.apk`](artifacts/PoopClicker-debug.apk)

```bash
adb install -r artifacts/PoopClicker-debug.apk
```

Rebuild: `npm run cap:apk` (requires Android SDK). See [docs/ANDROID.md](docs/ANDROID.md).

## Validate

```bash
npm run ci
```

## Docs

- [Progression & economy](docs/PROGRESSION.md)
- [Testing](docs/TESTING.md)
- [Android APK](docs/ANDROID.md)

## Note on assets

Gameplay uses procedural/CSS character variants keyed by `ASSET_MANIFEST`. Final illustration art is not bundled; see `missingFinalArt` in the manifest.
