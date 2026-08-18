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
  now = Date.now(),
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

  if (reward.gtp > 0) {
    next = { ...next, gtp: next.gtp + reward.gtp }
  }

  let ppGranted: LargeNumber | undefined
  if (reward.ppMinutes > 0) {
    ppGranted = production.pps.mul(reward.ppMinutes * 60)
  }

  if (reward.idleBoostMinutes > 0) {
    next = {
      ...next,
      activeBoosts: [
        ...next.activeBoosts,
        {
          id: `chest_idle_${now}`,
          label: 'Chest 2× Idle',
          tapMultiplier: 1,
          idleMultiplier: 2,
          expiresAt: now + reward.idleBoostMinutes * 60_000,
        },
      ],
    }
  }

  return {
    save: next,
    ok: true,
    reward,
    startGoldenShower: reward.goldenShower,
    ppGranted,
  }
}
