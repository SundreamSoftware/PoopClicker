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

## Validate

```bash
npm run ci
```

## Docs

- [Progression & economy](docs/PROGRESSION.md)
- [Testing](docs/TESTING.md)

## Note on assets

Gameplay uses procedural/CSS character variants keyed by `ASSET_MANIFEST`. Final illustration art is not bundled; see `missingFinalArt` in the manifest.
