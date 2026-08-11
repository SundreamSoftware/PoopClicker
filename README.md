# Poop Clicker

Absurd casual / clicker / idle game focused on retention, Flush prestige, collection, and daily engagement.

## Stack

- TypeScript + React 19 + Vite
- Pure TS game engine (`src/core`) + data-driven content (`src/content`)
- Capacitor Android shell (`com.sundreamsoftware.poopclicker`)
- Vitest, oxlint, Prettier, GitHub Actions CI

## Quick start

```bash
npm install
npm run dev
```

## Android APK

Debug APKs are produced by CI (`PoopClicker-debug` artifact on PR validation) or locally:

```bash
npm run cap:apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

See [docs/ANDROID.md](docs/ANDROID.md) and [docs/RELEASE.md](docs/RELEASE.md). Binaries are not committed to git.

## Validate

```bash
npm run ci
```

Focused suites:

```bash
npm run validate:content
npm run simulate:economy
```

## Docs

| Doc | Topic |
| --- | ----- |
| [PROGRESSION.md](docs/PROGRESSION.md) | Economy, flush, dailies |
| [TESTING.md](docs/TESTING.md) | Vitest, sim, Android tests |
| [ANDROID.md](docs/ANDROID.md) | APK build & package id |
| [MONETIZATION.md](docs/MONETIZATION.md) | Ads & IAP |
| [EVENTS.md](docs/EVENTS.md) | Live events & UI |
| [ASSETS.md](docs/ASSETS.md) | Manifest & procedural art |
| [ANALYTICS.md](docs/ANALYTICS.md) | Event tracking |
| [RELEASE.md](docs/RELEASE.md) | Ship checklist |

## Assets

Play uses P4 PNG materials + shared face expressions and full-bleed environments
(`public/assets/P4_README.md`). Details: [docs/ASSETS.md](docs/ASSETS.md).
