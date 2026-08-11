import {
  CHEST_SHOP_OFFERS,
  rollChestReward,
  type ChestRewardRoll,
  type ChestShopOffer,
} from '../../content/chests'
import type { ChestTier } from '../types/gameTypes'
import type { PlayerSaveV2 } from '../save/saveSchema'
import { LargeNumber } from '../numbers/LargeNumber'
import type { ProductionBreakdown } from './production'

export function emptyChestInventory(): Record<ChestTier, number> {
  return { regular: 0, silver: 0, golden: 0 }
}

export function buyChestShopOffer(
  save: PlayerSaveV2,
  offer: ChestShopOffer,
): { save: PlayerSaveV2; ok: boolean; reason?: string } {
  if (save.gtp < offer.gtpCost) {
    return { save, ok: false, reason: 'insufficient_gtp' }
  }
  const chests = { ...save.inventoryChests }
  const keys = { ...save.inventoryKeys }
  if (offer.kind === 'chest') {
    chests[offer.tier] = (chests[offer.tier] ?? 0) + 1
  } else {
    keys[offer.tier] = (keys[offer.tier] ?? 0) + 1
  }
  return {
    save: {
      ...save,
      gtp: save.gtp - offer.gtpCost,
      inventoryChests: chests,
      inventoryKeys: keys,
    },
    ok: true,
  }
}

export function buyChestShopOfferByIndex(
  save: PlayerSaveV2,
  index: number,
): { save: PlayerSaveV2; ok: boolean; reason?: string } {
  const offer = CHEST_SHOP_OFFERS[index]
  if (!offer) return { save, ok: false, reason: 'missing' }
  return buyChestShopOffer(save, offer)
}

export function canOpenChest(save: PlayerSaveV2, tier: ChestTier): boolean {
  return (save.inventoryChests[tier] ?? 0) > 0 && (save.inventoryKeys[tier] ?? 0) > 0
}

export function openChest(
  save: PlayerSaveV2,
  tier: ChestTier,
  production: ProductionBreakdown,
  random = Math.random,
): {
  save: PlayerSaveV2
  ok: boolean
  reason?: string
  reward?: ChestRewardRoll
  startGoldenShower?: boolean
  ppGranted?: LargeNumber
} {
  if ((save.inventoryChests[tier] ?? 0) <= 0) {
    return { save, ok: false, reason: 'no_chest' }
  }
  if ((save.inventoryKeys[tier] ?? 0) <= 0) {
    return { save, ok: false, reason: 'no_key' }
  }

  const reward = rollChestReward(tier, random)
  let next: PlayerSaveV2 = {
    ...save,
    inventoryChests: {
      ...save.inventoryChests,
      [tier]: save.inventoryChests[tier] - 1,
    },
    inventoryKeys: {
      ...save.inventoryKeys,
      [tier]: save.inventoryKeys[tier] - 1,
    },
  }

  let ppGranted = LargeNumber.zero()
  let startGoldenShower = false

  if (reward.kind === 'gtp') {
    next = { ...next, gtp: next.gtp + reward.amount }
  } else if (reward.kind === 'pp_minutes') {
    ppGranted = production.pps.mul(reward.amount * 60)
    next = {
      ...next,
      currentPP: next.currentPP, // credit applied by caller via engine
    }
  } else if (reward.kind === 'golden_shower') {
    startGoldenShower = true
  }

  return {
    save: next,
    ok: true,
    reward,
    startGoldenShower,
    ppGranted: reward.kind === 'pp_minutes' ? ppGranted : undefined,
  }
}
