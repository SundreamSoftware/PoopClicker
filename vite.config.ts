/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function removeIfExists(target: string) {
  rmSync(target, { recursive: true, force: true })
}

function pruneSkinExportPngs(skinsRoot: string) {
  if (!statSync(skinsRoot, { throwIfNoEntry: false })?.isDirectory()) return
  for (const entry of readdirSync(skinsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name === 'png' || entry.name.endsWith('/png')) {
      removeIfExists(path.join(skinsRoot, entry.name))
      continue
    }
    removeIfExists(path.join(skinsRoot, entry.name, 'png'))
  }
}

const runtimeAssetPruner = {
  name: 'runtime-asset-pruner',
  closeBundle() {
    const assetRoot = path.resolve(rootDir, 'dist/assets')
    for (const relativePath of [
      '_generator',
      'index.html',
      'README.md',
      'P4_README.md',
      'manifest.json',
      'P4-skins',
      'P4-expressions',
      'P4_environment',
      'P0_environment',
      'P0_vfx/frames',
      'P1_events/toilet_paper/frames',
      'P2_store',
      'P1_skins/README_SKINY.md',
      'P1_skins/skins_atlas.png',
      'P1_skins/skins_atlas.webp',
      'P1_skins/skins_atlas.json',
      'P1_skins/skins_manifest.json',
      'P3_spritesheets/tap_burst_sheet.png',
      'P3_spritesheets/crit_burst_sheet.png',
      'P3_spritesheets/floating_pp_sheet.png',
      'P3_spritesheets/flush_vortex_sheet.png',
      'P3_spritesheets/toilet_paper_sheet.png',
    ]) {
      removeIfExists(path.resolve(assetRoot, relativePath))
    }
    pruneSkinExportPngs(path.resolve(assetRoot, 'P1_skins'))
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), runtimeAssetPruner],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/core/**/*.ts', 'src/content/**/*.ts'],
    },
  },
})
