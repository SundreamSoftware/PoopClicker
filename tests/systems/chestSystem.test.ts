import { describe, expect, it } from 'vitest'
import {
  CHEST_GTP_LOSS_WEIGHT,
  CHEST_GTP_WIN_WEIGHT,
  CHEST_SHOP_OFFERS,
  chestOpenCostGtp,
  chestRewardOdds,
  chestRewardOddsSummary,
  rollChestReward,
} from '../../src/content/chests'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  buyChestShopOffer,
  buyChestShopOfferByIndex,
  emptyChestInventory,
  openChest,
} from '../../src/core/systems/chestSystem'
import { computeProduction } from '../../src/core/systems/production'
import { createTestEngine } from '../../src/core/GameEngine'
import type { ChestTier } from '../../src/core/types/gameTypes'

const TIERS: ChestTier[] = ['regular', 'silver', 'golden']

function unitInRange(startExclusiveOfPrev: number, endInclusive: number): number {
  return (startExclusiveOfPrev + endInclusive) / 2 / 100
}

describe('chestSystem', () => {
  it('buys cheap chests and expensive keys for GTP', () => {
    const chest = CHEST_SHOP_OFFERS.find((o) => o.kind === 'chest' && o.tier === 'regular')!
    const key = CHEST_SHOP_OFFERS.find((o) => o.kind === 'key' && o.tier === 'regular')!
    expect(key.gtpCost).toBeGreaterThan(chest.gtpCost)

    let save = { ...createDefaultSave(), gtp: 500 }
    const boughtChest = buyChestShopOffer(save, chest)
    expect(boughtChest.ok).toBe(true)
    save = boughtChest.save
    expect(save.inventoryChests.regular).toBe(1)

    const boughtKey = buyChestShopOffer(save, key)
    expect(boughtKey.ok).toBe(true)
    expect(boughtKey.save.inventoryKeys.regular).toBe(1)
    expect(boughtKey.save.gtp).toBe(500 - chest.gtpCost - key.gtpCost)
  })

  it('requires matching key to open a chest', () => {
    const save = {
      ...createDefaultSave(),
      inventoryChests: { regular: 1, silver: 0, golden: 0 },
      inventoryKeys: { regular: 0, silver: 0, golden: 0 },
    }
    const production = computeProduction(save, 0, Date.now())
    expect(openChest(save, 'regular', production).ok).toBe(false)
  })

  it('opens chest and can start golden shower reward', () => {
    const engine = createTestEngine({
      gtp: 0,
      inventoryChests: { regular: 1, silver: 0, golden: 0 },
      inventoryKeys: { regular: 1, silver: 0, golden: 0 },
    })
    const save = engine.exportSave()
    const production = engine.getSnapshot().production
    const result = openChest(save, 'regular', production, () => 0.999)
    expect(result.ok).toBe(true)
    expect(result.reward?.kind).toBe('golden_shower')
    expect(result.startGoldenShower).toBe(true)
  })

  it('buys a shop offer by catalog index and rejects a missing index', () => {
    const chestIndex = CHEST_SHOP_OFFERS.findIndex(
      (o) => o.kind === 'chest' && o.tier === 'regular',
    )
    expect(chestIndex).toBeGreaterThanOrEqual(0)
    const bought = buyChestShopOfferByIndex({ ...createDefaultSave(), gtp: 500 }, chestIndex)
    expect(bought.ok).toBe(true)
    expect(bought.save.inventoryChests.regular).toBe(1)
    expect(buyChestShopOfferByIndex(bought.save, 99).ok).toBe(false)
    expect(buyChestShopOfferByIndex(bought.save, 99).reason).toBe('missing')
  })

  it('starts with an empty chest inventory and reports no_chest', () => {
    expect(emptyChestInventory()).toEqual({ regular: 0, silver: 0, golden: 0 })
    const save = createDefaultSave()
    const production = computeProduction(save, 0, Date.now())
    const result = openChest(save, 'regular', production)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('no_chest')
  })

  it('grants 10–30 min PP, combo GTP+PP, and a 2× idle boost', () => {
    const save = {
      ...createDefaultSave(),
      inventoryChests: { regular: 1, silver: 0, golden: 0 },
      inventoryKeys: { regular: 1, silver: 0, golden: 0 },
    }
    const production = computeProduction(save, 0, Date.now())

    const pp = openChest(save, 'regular', production, () => unitInRange(60, 72))
    expect(pp.reward?.kind).toBe('pp_minutes')
    expect([10, 20, 30]).toContain(pp.reward?.ppMinutes)
    expect(pp.ppGranted).toBeDefined()

    const mix = openChest(save, 'regular', production, () => unitInRange(80, 88))
    expect(mix.reward?.kind).toBe('combo')
    expect(mix.reward?.gtp).toBeGreaterThan(0)
    expect(mix.reward?.ppMinutes).toBeGreaterThan(0)
    expect(mix.save.gtp).toBe(save.gtp + (mix.reward?.gtp ?? 0))

    const boost = openChest(
      save,
      'regular',
      production,
      () => unitInRange(88, 96),
      1_700_000_000_000,
    )
    expect(boost.reward?.kind).toBe('idle_boost')
    expect(boost.reward?.idleBoostMinutes).toBe(5)
    expect(boost.save.activeBoosts.some((item) => item.idleMultiplier === 2)).toBe(true)
  })

  it('gives a 40% chance of below-cost GTP and 20% chance of above-cost GTP', () => {
    for (const tier of TIERS) {
      const cost = chestOpenCostGtp(tier)
      let lossWeight = 0
      let winWeight = 0
      let cursor = 0
      for (const row of chestRewardOdds(tier)) {
        const mid = (cursor + row.percent / 2) / 100
        const roll = rollChestReward(tier, () => mid)
        if (roll.kind === 'gtp' && roll.gtp < cost && roll.ppMinutes === 0) {
          lossWeight += row.percent
        }
        if (roll.kind === 'gtp' && roll.gtp > cost && roll.ppMinutes === 0) {
          winWeight += row.percent
        }
        cursor += row.percent
      }
      expect(lossWeight).toBe(CHEST_GTP_LOSS_WEIGHT)
      expect(winWeight).toBe(CHEST_GTP_WIN_WEIGHT)
    }
  })

  it('exposes chest reward odds that sum to 100%', () => {
    for (const tier of TIERS) {
      const rows = chestRewardOdds(tier)
      expect(rows.length).toBeGreaterThan(0)
      const total = rows.reduce((sum, row) => sum + row.percent, 0)
      expect(total).toBeCloseTo(100, 5)
      expect(chestRewardOddsSummary(tier)).toMatch(/GTP above cost/)
    }
  })
})
