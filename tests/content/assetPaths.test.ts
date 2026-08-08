import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUTHORED_WORLD_IDS,
  assetUrl,
  resolveSkinExpressionPath,
  resolveToiletPath,
  worldLayerPath,
} from '../../src/content/assetPaths'
import { ASSET_MANIFEST } from '../../src/content/assetManifest'

function publicPath(runtimeUrl: string): string {
  return runtimeUrl.replace(/^(?:\.\/|\/)?assets\//, 'public/assets/')
}

describe('authored asset paths', () => {
  it('resolves stable Capacitor-safe URLs', () => {
    expect(assetUrl('/P0_toilet/toilet_idle.svg')).toMatch(
      /^(?:\.\/|\/)assets\/P0_toilet\/toilet_idle\.svg$/,
    )
  })

  it('maps benchmark skins and preserves procedural fallback for others', () => {
    const classic = resolveSkinExpressionPath('classic_poop', 'panic')
    const cyber = resolveSkinExpressionPath('cyber_poop', 'frenzy')

    expect(classic).not.toBeNull()
    expect(cyber).not.toBeNull()
    expect(existsSync(publicPath(classic!))).toBe(true)
    expect(existsSync(publicPath(cyber!))).toBe(true)
    expect(resolveSkinExpressionPath('coffee_poop', 'normal')).toBeNull()
  })

  it('provides every layer for each authored world', () => {
    for (const worldId of AUTHORED_WORLD_IDS) {
      for (const layer of ['background', 'midground', 'foreground', 'vfx'] as const) {
        const path = worldLayerPath(worldId, layer)
        expect(path, `${worldId}/${layer}`).not.toBeNull()
        expect(existsSync(publicPath(path!)), `${worldId}/${layer}`).toBe(true)
      }
    }
  })

  it('provides authored toilet states', () => {
    for (const state of ['idle', 'bounce', 'flush', 'shake', 'clogged']) {
      expect(existsSync(publicPath(resolveToiletPath(state))), state).toBe(true)
    }
  })

  it('keeps every FINAL manifest path backed by a file', () => {
    const groups = [
      ASSET_MANIFEST.skins,
      ASSET_MANIFEST.vfx,
      ASSET_MANIFEST.events,
      ASSET_MANIFEST.worlds,
    ]
    for (const group of groups) {
      for (const [id, entry] of Object.entries(group)) {
        if (entry.status !== 'FINAL' || !('path' in entry)) continue
        expect(existsSync(`public/assets/${entry.path}`), id).toBe(true)
      }
    }
  })
})
