import { describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import {
  adviseShop,
  badgeForItem,
  nextGeneratorMilestone,
  quickShopPicks,
  visibleUpgrades,
} from '../../src/core/systems/shopAdvisor'
import { GENERATORS } from '../../src/content/generators'
import { UPGRADES } from '../../src/content/upgrades'

describe('shopAdvisor', () => {
  it('hides distant locked upgrades and keeps one teaser', () => {
    const save = { ...createDefaultSave(), flushCount: 2 }
    const view = visibleUpgrades(save)
    const shown = Object.values(view.groups).flat()
    expect(
      shown.every((up) => (up.requiresFlushCount ?? 0) <= 3 || up.id === view.teaser?.id),
    ).toBe(true)
    const far = UPGRADES.filter((up) => (up.requiresFlushCount ?? 0) >= 50)
    expect(far.length).toBeGreaterThan(0)
    expect(shown.some((up) => (up.requiresFlushCount ?? 0) >= 50)).toBe(false)
    if (view.teaser) {
      expect((view.teaser.requiresFlushCount ?? 0) > 2).toBe(true)
    }
  })

  it('assigns a single badge and prefers a near milestone as recommended', () => {
    const gen = GENERATORS[0]
    const save = {
      ...createDefaultSave(),
      currentPP: LargeNumber.from(1_000_000).serialize(),
      generators: { [gen.id]: 47 },
    }
    const next = nextGeneratorMilestone(gen, 47)
    expect(next?.level).toBe(50)
    const advice = adviseShop(save, 1)
    expect(advice.milestoneId).toBe(gen.id)
    expect(advice.recommendedId).toBe(gen.id)
    expect(badgeForItem(gen.id, advice)).toBe('MILESTONE')
    const other = GENERATORS[1]?.id
    if (other) {
      const otherBadge = badgeForItem(other, advice)
      expect(otherBadge === 'MILESTONE' || otherBadge === null || otherBadge === 'BEST_IDLE').toBe(
        true,
      )
    }
  })

  it('quick shop returns at most four distinct picks', () => {
    const save = {
      ...createDefaultSave(),
      currentPP: LargeNumber.from(5_000).serialize(),
      generators: { plunger_intern: 8 },
    }
    const picks = quickShopPicks(save)
    expect(picks.length).toBeLessThanOrEqual(4)
    expect(new Set(picks.map((p) => p.id)).size).toBe(picks.length)
  })
})
