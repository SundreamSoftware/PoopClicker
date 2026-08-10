import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUTHORED_WORLD_IDS,
  assetUrl,
  authoredSkinSlug,
  resolveSkinExpressionPath,
  resolveSkinThumbnailPath,
  resolveToiletPath,
  worldLayerPath,
} from '../../src/content/assetPaths'
import { ASSET_MANIFEST } from '../../src/content/assetManifest'
import { SKINS } from '../../src/content/skins'

function publicPath(runtimeUrl: string): string {
  return runtimeUrl.replace(/^(?:\.\/|\/)?assets\//, 'public/assets/')
}

describe('authored asset paths', () => {
  it('resolves stable Capacitor-safe URLs', () => {
    expect(assetUrl('/P0_toilet/toilet_idle.svg')).toMatch(
      /^(?:\.\/|\/)assets\/P0_toilet\/toilet_idle\.svg$/,
    )
  })

  it('maps roster skins to the authored pack with happy/normal expressions', () => {
    const classic = resolveSkinExpressionPath('classic_poop', 'panic')
    const cyberHappy = resolveSkinExpressionPath('cyber_poop', 'frenzy')
    const coffee = resolveSkinExpressionPath('coffee_poop', 'normal')

    expect(classic).not.toBeNull()
    expect(cyberHappy).not.toBeNull()
    expect(coffee).not.toBeNull()
    expect(existsSync(publicPath(classic!))).toBe(true)
    expect(existsSync(publicPath(cyberHappy!))).toBe(true)
    expect(existsSync(publicPath(coffee!))).toBe(true)
    expect(cyberHappy).toContain('poop_cyber_happy.svg')
    expect(resolveSkinExpressionPath('chef_poop', 'normal')).toContain('poop_spicy_normal.svg')
  })

  it('backs every mapped roster skin with normal/happy SVG and a thumbnail', () => {
    for (const skin of SKINS) {
      const slug = authoredSkinSlug(skin.id)
      if (!slug) continue
      const normal = resolveSkinExpressionPath(skin.id, 'normal')
      const happy = resolveSkinExpressionPath(skin.id, 'happy')
      const thumb = resolveSkinThumbnailPath(skin.id)
      expect(normal, skin.id).not.toBeNull()
      expect(happy, skin.id).not.toBeNull()
      expect(thumb, skin.id).not.toBeNull()
      expect(existsSync(publicPath(normal!)), `${skin.id} normal`).toBe(true)
      expect(existsSync(publicPath(happy!)), `${skin.id} happy`).toBe(true)
      expect(existsSync(publicPath(thumb!)), `${skin.id} thumb`).toBe(true)
    }
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
        if (entry.status !== 'FINAL' || !('path' in entry) || !entry.path) continue
        expect(existsSync(`public/assets/${entry.path}`), id).toBe(true)
      }
    }
  })
})
