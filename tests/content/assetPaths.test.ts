import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUTHORED_WORLD_IDS,
  P4_MATERIAL_IDS,
  SHARED_EXPRESSION_IDS,
  assetUrl,
  resolveP4Material,
  resolveSharedExpressionIdForPlay,
  resolveSharedExpressionIdFromCps,
  resolveSharedExpressionPathForPlay,
  resolveSkinBodyPath,
  resolveSkinThumbnailPath,
  resolveToiletPath,
  resolveWorldBackdropPath,
  worldLayerPath,
} from '../../src/content/assetPaths'
import { ASSET_MANIFEST } from '../../src/content/assetManifest'
import { SKINS } from '../../src/content/skins'
import { WORLDS } from '../../src/content/worlds'

function publicPath(runtimeUrl: string): string {
  return runtimeUrl.replace(/^(?:\.\/|\/)?assets\//, 'public/assets/')
}

describe('authored asset paths', () => {
  it('resolves stable Capacitor-safe URLs', () => {
    expect(assetUrl('/P0_toilet/toilet_idle.svg')).toMatch(
      /^(?:\.\/|\/)assets\/P0_toilet\/toilet_idle\.svg$/,
    )
  })

  it('maps CPS onto all six P4 expression levels (lv1–lv6)', () => {
    expect(resolveSharedExpressionIdFromCps(0)).toBe('expr_01')
    expect(resolveSharedExpressionIdFromCps(1)).toBe('expr_01')
    expect(resolveSharedExpressionIdFromCps(2)).toBe('expr_02')
    expect(resolveSharedExpressionIdFromCps(5)).toBe('expr_02')
    expect(resolveSharedExpressionIdFromCps(6)).toBe('expr_03')
    expect(resolveSharedExpressionIdFromCps(9)).toBe('expr_03')
    expect(resolveSharedExpressionIdFromCps(10)).toBe('expr_04')
    expect(resolveSharedExpressionIdFromCps(12)).toBe('expr_04')
    expect(resolveSharedExpressionIdFromCps(13)).toBe('expr_05')
    expect(resolveSharedExpressionIdFromCps(16)).toBe('expr_05')
    expect(resolveSharedExpressionIdFromCps(16.1)).toBe('expr_06')
    expect(resolveSharedExpressionIdFromCps(40)).toBe('expr_06')

    // Higher tap states floor to higher levels; CPS can raise further (lv5 inside frenzy).
    expect(resolveSharedExpressionIdForPlay(11, 'frenzy')).toBe('expr_04')
    expect(resolveSharedExpressionIdForPlay(14, 'frenzy')).toBe('expr_05')
    expect(resolveSharedExpressionIdForPlay(12, 'overdrive')).toBe('expr_06')
    expect(resolveSharedExpressionIdForPlay(20, 'fast')).toBe('expr_06')

    for (const id of SHARED_EXPRESSION_IDS) {
      expect(existsSync(`public/assets/P4_expressions/${id}.png`), id).toBe(true)
    }
    expect(existsSync(publicPath(resolveSharedExpressionPathForPlay(20, 'overdrive')))).toBe(true)
  })

  it('maps roster skins to P4 material body PNGs', () => {
    expect(resolveP4Material('classic_poop')).toBe('basic')
    expect(resolveP4Material('diamond_poop')).toBe('diamond')
    expect(resolveP4Material('king_poop')).toBe('gold')
    expect(resolveSkinBodyPath('classic_poop')).toContain('P4_skins/basic.png')
    expect(existsSync(publicPath(resolveSkinBodyPath('classic_poop')!))).toBe(true)

    for (const material of P4_MATERIAL_IDS) {
      expect(existsSync(`public/assets/P4_skins/${material}.png`), material).toBe(true)
      expect(existsSync(`public/assets/P4_skins/_thumbnails/${material}_192.png`), material).toBe(
        true,
      )
    }
  })

  it('backs every roster skin with a P4 body and thumbnail', () => {
    for (const skin of SKINS) {
      const body = resolveSkinBodyPath(skin.id)
      const thumb = resolveSkinThumbnailPath(skin.id)
      expect(body, skin.id).not.toBeNull()
      expect(thumb, skin.id).not.toBeNull()
      expect(existsSync(publicPath(body!)), `${skin.id} body`).toBe(true)
      expect(existsSync(publicPath(thumb!)), `${skin.id} thumb`).toBe(true)
    }
  })

  it('maps every world to a P4 environment backdrop', () => {
    for (const world of WORLDS) {
      const path = resolveWorldBackdropPath(world.id)
      expect(path, world.id).not.toBeNull()
      expect(existsSync(publicPath(path!)), world.id).toBe(true)
    }
  })

  it('still provides layered WebP sets for legacy authored worlds', () => {
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
