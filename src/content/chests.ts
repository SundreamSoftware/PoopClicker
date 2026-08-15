import type { ChestTier } from '../core/types/gameTypes'

export interface ChestShopOffer {
  tier: ChestTier
  kind: 'chest' | 'key'
  name: string
  description: string
  gtpCost: number
  asset: string
}

/** Chests cheap, keys expensive (GTP). */
export const CHEST_SHOP_OFFERS: ChestShopOffer[] = [
  {
    tier: 'regular',
    kind: 'chest',
    name: 'Regular Chest',
    description: 'A plain bathroom stash. Needs a regular key.',
    gtpCost: 8,
    asset: 'P4_misc/regular_chest.png',
  },
  {
    tier: 'silver',
    kind: 'chest',
    name: 'Silver Chest',
    description: 'Polished lid, mysterious rattle. Needs a silver key.',
    gtpCost: 20,
    asset: 'P4_misc/silver_chest.png',
  },
  {
    tier: 'golden',
    kind: 'chest',
    name: 'Golden Chest',
    description: 'Suspect dignity inside. Needs a golden key.',
    gtpCost: 45,
    asset: 'P4_misc/golden_chest.png',
  },
  {
    tier: 'regular',
    kind: 'key',
    name: 'Regular Key',
    description: 'Opens regular chests.',
    gtpCost: 35,
    asset: 'P4_misc/regular_key.png',
  },
  {
    tier: 'silver',
    kind: 'key',
    name: 'Silver Key',
    description: 'Opens silver chests.',
    gtpCost: 90,
    asset: 'P4_misc/silver_key.png',
  },
  {
    tier: 'golden',
    kind: 'key',
    name: 'Golden Key',
    description: 'Opens golden chests.',
    gtpCost: 220,
    asset: 'P4_misc/golden_key.png',
  },
]

export type ChestRewardKind = 'gtp' | 'pp_minutes' | 'golden_shower'

export interface ChestRewardRoll {
  kind: ChestRewardKind
  /** GTP amount, or PP minutes worth of current PPS, or shower flag (1). */
  amount: number
  label: string
}

const TIER_REWARD_TABLE: Record<
  ChestTier,
  Array<{ weight: number; label: string; roll: () => ChestRewardRoll }>
> = {
  regular: [
    { weight: 50, label: '+5 GTP', roll: () => ({ kind: 'gtp', amount: 5, label: '+5 GTP' }) },
    { weight: 35, label: '+10 GTP', roll: () => ({ kind: 'gtp', amount: 10, label: '+10 GTP' }) },
    {
      weight: 12,
      label: '+2 min PP',
      roll: () => ({ kind: 'pp_minutes', amount: 2, label: '+2 min PP' }),
    },
    {
      weight: 3,
      label: 'Golden Shower!',
      roll: () => ({ kind: 'golden_shower', amount: 1, label: 'Golden Shower!' }),
    },
  ],
  silver: [
    { weight: 40, label: '+20 GTP', roll: () => ({ kind: 'gtp', amount: 20, label: '+20 GTP' }) },
    { weight: 30, label: '+35 GTP', roll: () => ({ kind: 'gtp', amount: 35, label: '+35 GTP' }) },
    {
      weight: 20,
      label: '+5 min PP',
      roll: () => ({ kind: 'pp_minutes', amount: 5, label: '+5 min PP' }),
    },
    {
      weight: 10,
      label: 'Golden Shower!',
      roll: () => ({ kind: 'golden_shower', amount: 1, label: 'Golden Shower!' }),
    },
  ],
  golden: [
    { weight: 35, label: '+60 GTP', roll: () => ({ kind: 'gtp', amount: 60, label: '+60 GTP' }) },
    {
      weight: 25,
      label: '+100 GTP',
      roll: () => ({ kind: 'gtp', amount: 100, label: '+100 GTP' }),
    },
    {
      weight: 20,
      label: '+12 min PP',
      roll: () => ({ kind: 'pp_minutes', amount: 12, label: '+12 min PP' }),
    },
    {
      weight: 20,
      label: 'Golden Shower!',
      roll: () => ({ kind: 'golden_shower', amount: 1, label: 'Golden Shower!' }),
    },
  ],
}

export interface ChestOddsRow {
  label: string
  percent: number
}

export function chestRewardOdds(tier: ChestTier): ChestOddsRow[] {
  const table = TIER_REWARD_TABLE[tier]
  const total = table.reduce((sum, row) => sum + row.weight, 0)
  return table.map((row) => ({
    label: row.label,
    percent: Math.round((row.weight / total) * 1000) / 10,
  }))
}

export function rollChestReward(tier: ChestTier, random = Math.random): ChestRewardRoll {
  const table = TIER_REWARD_TABLE[tier]
  const total = table.reduce((s, row) => s + row.weight, 0)
  let pick = random() * total
  for (const row of table) {
    pick -= row.weight
    if (pick <= 0) return row.roll()
  }
  return table[table.length - 1].roll()
}

export const CHEST_ASSET: Record<ChestTier, string> = {
  regular: 'P4_misc/regular_chest.png',
  silver: 'P4_misc/silver_chest.png',
  golden: 'P4_misc/golden_chest.png',
}

export const KEY_ASSET: Record<ChestTier, string> = {
  regular: 'P4_misc/regular_key.png',
  silver: 'P4_misc/silver_key.png',
  golden: 'P4_misc/golden_key.png',
}
