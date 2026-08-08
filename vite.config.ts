/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const runtimeAssetPruner = {
  name: 'runtime-asset-pruner',
  closeBundle() {
    const assetRoot = path.resolve(rootDir, 'dist/assets')
    for (const relativePath of [
      '_generator',
      'index.html',
      'README.md',
      'manifest.json',
      'P0_environment',
      'P0_vfx/frames',
      'P1_events/toilet_paper/frames',
      'P2_store',
      'P3_spritesheets/tap_burst_sheet.png',
      'P3_spritesheets/crit_burst_sheet.png',
      'P3_spritesheets/floating_pp_sheet.png',
      'P3_spritesheets/flush_vortex_sheet.png',
      'P3_spritesheets/toilet_paper_sheet.png',
    ]) {
      rmSync(path.resolve(assetRoot, relativePath), { recursive: true, force: true })
    }
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
