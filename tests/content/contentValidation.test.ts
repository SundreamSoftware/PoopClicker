import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../../src/content/achievements'
import { CHALLENGE_TEMPLATES } from '../../src/content/challenges'
import { EVENTS } from '../../src/content/events'
import { GENERATORS } from '../../src/content/generators'
import { ROYAL_FLUSH_NODES } from '../../src/content/royalFlush'
import { SKINS } from '../../src/content/skins'
import { UPGRADES } from '../../src/content/upgrades'
import { WORLDS } from '../../src/content/worlds'
import { ASSET_MANIFEST } from '../../src/content/assetManifest'

function assertUniqueIds(ids: string[], label: string) {
  expect(new Set(ids).size, `${label} duplicate ids`).toBe(ids.length)
}

describe('Content validation', () => {
  it('has unique ids across content packs', () => {
    assertUniqueIds(
      GENERATORS.map((x) => x.id),
      'generators',
    )
    assertUniqueIds(
      UPGRADES.map((x) => x.id),
      'upgrades',
    )
    assertUniqueIds(
      SKINS.map((x) => x.id),
      'skins',
    )
    assertUniqueIds(
      ACHIEVEMENTS.map((x) => x.id),
      'achievements',
    )
    assertUniqueIds(
      EVENTS.map((x) => x.id),
      'events',
    )
    assertUniqueIds(
      WORLDS.map((x) => x.id),
      'worlds',
    )
    assertUniqueIds(
      ROYAL_FLUSH_NODES.map((x) => x.id),
      'royal',
    )
    assertUniqueIds(
      CHALLENGE_TEMPLATES.map((x) => x.id),
      'challenges',
    )
  })

  it('rejects negative costs and invalid deps', () => {
    for (const g of GENERATORS) {
      expect(g.baseCost).toBeGreaterThan(0)
      expect(g.costGrowth).toBeGreaterThan(1)
      expect(g.baseProduction).toBeGreaterThan(0)
      const levels = g.milestones.map((m) => m.level)
      expect([...levels].sort((a, b) => a - b)).toEqual(levels)
    }
    for (const u of UPGRADES) {
      expect(u.baseCost).toBeGreaterThan(0)
      if (u.requiresUpgradeId) {
        expect(UPGRADES.some((x) => x.id === u.requiresUpgradeId)).toBe(true)
      }
    }
  })

  it('royal flush graph has no missing requires / cycles one-level', () => {
    const ids = new Set(ROYAL_FLUSH_NODES.map((n) => n.id))
    for (const node of ROYAL_FLUSH_NODES) {
      for (const req of node.requires) {
        expect(ids.has(req)).toBe(true)
        expect(req).not.toBe(node.id)
      }
    }
  })

  it('skins reference known rarities and asset keys', () => {
    for (const skin of SKINS) {
      expect(['common', 'rare', 'epic', 'legendary', 'mythic']).toContain(skin.rarity)
      expect(ASSET_MANIFEST.skins[skin.id as keyof typeof ASSET_MANIFEST.skins]).toBeTruthy()
    }
  })

  it('meets content volume targets', () => {
    expect(UPGRADES.filter((u) => u.category === 'tap').length).toBeGreaterThanOrEqual(30)
    expect(UPGRADES.filter((u) => u.category === 'combo').length).toBeGreaterThanOrEqual(10)
    expect(UPGRADES.filter((u) => u.category === 'critical').length).toBeGreaterThanOrEqual(10)
    expect(GENERATORS.length).toBeGreaterThanOrEqual(20)
    expect(SKINS.length).toBeGreaterThanOrEqual(40)
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(80)
    expect(EVENTS.length).toBeGreaterThanOrEqual(8)
    expect(ROYAL_FLUSH_NODES.length).toBeGreaterThanOrEqual(25)
  })

  it('achievement thresholds unique per metric family', () => {
    const map = new Map<string, number>()
    for (const a of ACHIEVEMENTS) {
      if (a.hidden) continue
      const key = `${a.metric}:${a.target}`
      expect(map.has(key), `duplicate ${key}`).toBe(false)
      map.set(key, 1)
    }
  })
})
