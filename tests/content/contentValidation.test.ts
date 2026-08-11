import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../../src/content/achievements'
import { CHALLENGE_TEMPLATES } from '../../src/content/challenges'
import { EVENTS } from '../../src/content/events'
import { FLUSH_MILESTONES } from '../../src/content/flushMilestones'
import { GENERATORS } from '../../src/content/generators'
import { ROYAL_FLUSH_NODES } from '../../src/content/royalFlush'
import { SKINS } from '../../src/content/skins'
import { getSkinVisual, SKINS_VISUAL } from '../../src/content/skinsVisual'
import { UPGRADES } from '../../src/content/upgrades'
import { WORLDS } from '../../src/content/worlds'
import { ASSET_MANIFEST } from '../../src/content/assetManifest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  EVENT_TYPES_BY_UI_PRESENTATION,
  EVENT_UI_PRESENTATIONS_SUPPORTED,
} from '../../src/core/systems/eventSystem'
import { milestoneEventBonus, performFlush } from '../../src/core/systems/flush'
import { isSkinUnlockRequirementMet } from '../../src/core/systems/skins'
import { ECONOMY } from '../../src/core/economy/formulas'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'

function assertUniqueIds(ids: string[], label: string) {
  expect(new Set(ids).size, `${label} duplicate ids`).toBe(ids.length)
}

function detectRoyalFlushCycle(): string[] | null {
  const graph = new Map<string, string[]>()
  for (const node of ROYAL_FLUSH_NODES) {
    graph.set(node.id, node.requires)
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const stack: string[] = []

  const dfs = (id: string): boolean => {
    if (visiting.has(id)) {
      const idx = stack.indexOf(id)
      return idx >= 0
    }
    if (visited.has(id)) return false
    visiting.add(id)
    stack.push(id)
    for (const req of graph.get(id) ?? []) {
      if (dfs(req)) return true
    }
    stack.pop()
    visiting.delete(id)
    visited.add(id)
    return false
  }

  for (const node of ROYAL_FLUSH_NODES) {
    if (dfs(node.id)) return [...stack]
  }
  return null
}

const MANIFEST_VARIANTS = new Set<string>(
  Object.values(ASSET_MANIFEST.skins).map((entry) => entry.variant),
)

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

  it('royal flush graph is acyclic with valid requires', () => {
    const ids = new Set(ROYAL_FLUSH_NODES.map((n) => n.id))
    for (const node of ROYAL_FLUSH_NODES) {
      for (const req of node.requires) {
        expect(ids.has(req)).toBe(true)
        expect(req).not.toBe(node.id)
      }
    }
    expect(detectRoyalFlushCycle()).toBeNull()
  })

  it('skins reference known rarities, manifest keys, and visual defs', () => {
    for (const skin of SKINS) {
      expect(['common', 'rare', 'epic', 'legendary', 'mythic']).toContain(skin.rarity)
      expect(ASSET_MANIFEST.skins[skin.id as keyof typeof ASSET_MANIFEST.skins]).toBeTruthy()
      expect(SKINS_VISUAL[skin.id], `missing skinsVisual for ${skin.id}`).toBeTruthy()
    }
  })

  it('every skin animationVariant and vfx is supported by manifest / visual runtime', () => {
    for (const skin of SKINS) {
      const manifest =
        ASSET_MANIFEST.skins[skin.id as keyof typeof ASSET_MANIFEST.skins] ??
        ASSET_MANIFEST.skins.classic_poop
      const visual = getSkinVisual(skin.id)

      expect(
        MANIFEST_VARIANTS.has(skin.animationVariant) || manifest.variant === skin.animationVariant,
        `${skin.id} animationVariant ${skin.animationVariant}`,
      ).toBe(true)

      if (skin.vfx === 'none') {
        expect(['none', 'smooth'].includes(visual.aura) || visual.aura === 'none').toBe(true)
      } else {
        expect(
          visual.aura === skin.vfx || visual.texture === skin.vfx,
          `${skin.id} vfx ${skin.vfx} vs aura ${visual.aura} texture ${visual.texture}`,
        ).toBe(true)
      }
    }
  })

  it('every event uiPresentation has runtime handling', () => {
    for (const event of EVENTS) {
      expect(EVENT_UI_PRESENTATIONS_SUPPORTED as readonly string[]).toContain(event.uiPresentation)
      const types =
        EVENT_TYPES_BY_UI_PRESENTATION[
          event.uiPresentation as (typeof EVENT_UI_PRESENTATIONS_SUPPORTED)[number]
        ]
      expect(types, event.id).toContain(event.type)
    }
  })

  it('skin unlock dependencies reference valid content', () => {
    const achievementIds = new Set(ACHIEVEMENTS.map((a) => a.id))
    const worldIds = new Set(WORLDS.map((w) => w.id))
    const eventIds = new Set(EVENTS.map((e) => e.id))

    for (const skin of SKINS) {
      const unlock = skin.unlock
      switch (unlock.type) {
        case 'achievement':
          expect(achievementIds.has(unlock.achievementId)).toBe(true)
          break
        case 'world':
          expect(worldIds.has(unlock.worldId)).toBe(true)
          break
        case 'event':
          expect(eventIds.has(unlock.eventId)).toBe(true)
          expect(unlock.count).toBeGreaterThan(0)
          break
        case 'gtp':
          expect(unlock.amount).toBeGreaterThan(0)
          break
        case 'daily':
          expect(unlock.count).toBeGreaterThan(0)
          break
        case 'streak':
          expect(unlock.day).toBeGreaterThan(0)
          break
        case 'flush':
          expect(unlock.count).toBeGreaterThan(0)
          break
        case 'collection':
          expect(unlock.percent).toBeGreaterThan(0)
          break
        default:
          break
      }
    }
  })

  it('flush milestone content effects are implemented in flush system', () => {
    const now = Date.UTC(2026, 0, 1)
    let save = createDefaultSave(now)

    for (const milestone of FLUSH_MILESTONES) {
      if (milestone.eventBonusPercent != null) {
        save = { ...save, flushCount: milestone.flushCount }
        expect(milestoneEventBonus(save)).toBe(milestone.eventBonusPercent)
      }
    }

    save = {
      ...createDefaultSave(now),
      flushCount: 4,
      runPPEarned: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
      currentPP: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
    }
    const toFive = performFlush(save, now)
    expect(toFive.save.flushCount).toBe(5)
    expect(toFive.save.autoBuyUnlocked).toBe(true)

    const startBonusMilestone = FLUSH_MILESTONES.find((m) => m.startBonusPpMinutes)
    expect(startBonusMilestone).toBeTruthy()
    save = {
      ...createDefaultSave(now),
      flushCount: 2,
      generators: { plunger_intern: 20 },
      runPPEarned: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
      currentPP: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
    }
    const withBonus = performFlush(save, now)
    expect(withBonus.ok).toBe(true)
    expect(withBonus.save.flushCount).toBe(3)
    expect(startBonusMilestone!.startBonusPpMinutes).toBe(5)

    save = {
      ...withBonus.save,
      flushCount: 9,
      generators: { plunger_intern: 15 },
      runPPEarned: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
      currentPP: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
    }
    const atTen = performFlush(save, now)
    expect(atTen.save.generators.plunger_intern).toBeGreaterThanOrEqual(5)
  })

  it('default skin unlock requirements are satisfiable at game start', () => {
    const save = createDefaultSave()
    for (const skin of SKINS.filter((s) => s.unlock.type === 'default')) {
      expect(isSkinUnlockRequirementMet(save, skin.id)).toBe(true)
    }
  })

  it('meets content volume targets', () => {
    expect(UPGRADES.filter((u) => u.category === 'tap').length).toBeGreaterThanOrEqual(30)
    expect(UPGRADES.filter((u) => u.category === 'combo').length).toBeGreaterThanOrEqual(10)
    expect(UPGRADES.filter((u) => u.category === 'critical').length).toBeGreaterThanOrEqual(10)
    expect(GENERATORS.length).toBeGreaterThanOrEqual(20)
    expect(SKINS.length).toBeGreaterThanOrEqual(40)
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(80)
    expect(EVENTS.length).toBeGreaterThanOrEqual(4)
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
