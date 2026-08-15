import { describe, expect, it } from 'vitest'
import { CHEST_SHOP_OFFERS, chestRewardOdds } from '../../src/content/chests'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  buyChestShopOffer,
  buyChestShopOfferByIndex,
  emptyChestInventory,
  openChest,
} from '../../src/core/systems/chestSystem'
import { computeProduction } from '../../src/core/systems/production'
import { createTestEngine } from '../../src/core/GameEngine'

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
    // Force shower reward via deterministic open path through engine with mocked roll:
    // open until we get a non-shower reward is flaky; instead call openChest with fixed random.
    const save = engine.exportSave()
    const production = engine.getSnapshot().production
    const result = openChest(save, 'regular', production, () => 0.999)
    expect(result.ok).toBe(true)
    expect(result.reward?.kind).toBe('golden_shower')
    expect(result.startGoldenShower).toBe(true)
  })

  it('buys a shop offer by catalog index and rejects a missing index', () => {
    const chestIndex = CHEST_SHOP_OFFERS.findIndex((o) => o.kind === 'chest' && o.tier === 'regular')
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

  it('grants PP minutes from a chest roll', () => {
    const save = {
      ...createDefaultSave(),
      inventoryChests: { regular: 1, silver: 0, golden: 0 },
      inventoryKeys: { regular: 1, silver: 0, golden: 0 },
    }
    const production = computeProduction(save, 0, Date.now())
    const result = openChest(save, 'regular', production, () => 0.86)
    expect(result.ok).toBe(true)
    expect(result.reward?.kind).toBe('pp_minutes')
    expect(result.ppGranted).toBeDefined()
  })

  it('exposes chest reward odds that sum to 100%', () => {
    for (const tier of ['regular', 'silver', 'golden'] as const) {
      const rows = chestRewardOdds(tier)
      expect(rows.length).toBeGreaterThan(0)
      const total = rows.reduce((sum, row) => sum + row.percent, 0)
      expect(total).toBeCloseTo(100, 5)
    }
  })
})
