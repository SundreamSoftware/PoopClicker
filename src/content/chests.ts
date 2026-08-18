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

export type ChestRewardKind = 'gtp' | 'pp_minutes' | 'combo' | 'idle_boost' | 'golden_shower'

export interface ChestRewardRoll {
  kind: ChestRewardKind
  gtp: number
  ppMinutes: number
  idleBoostMinutes: number
  goldenShower: boolean
  label: string
}

/** Share of opens that return only GTP below chest+key cost. */
export const CHEST_GTP_LOSS_WEIGHT = 40
/** Share of opens that return only GTP above chest+key cost. */
export const CHEST_GTP_WIN_WEIGHT = 20

const PP_MINUTES: Record<ChestTier, [number, number]> = {
  regular: [10, 20],
  silver: [20, 30],
  golden: [20, 30],
}

const LOSS_GTP: Record<ChestTier, [number, number]> = {
  regular: [12, 25],
  silver: [35, 70],
  golden: [80, 160],
}

const WIN_GTP: Record<ChestTier, [number, number]> = {
  regular: [60, 90],
  silver: [150, 220],
  golden: [350, 500],
}

const COMBO: Record<ChestTier, { gtp: number; ppMinutes: number }> = {
  regular: { gtp: 20, ppMinutes: 10 },
  silver: { gtp: 50, ppMinutes: 10 },
  golden: { gtp: 120, ppMinutes: 20 },
}

export function chestOpenCostGtp(tier: ChestTier): number {
  const chest = CHEST_SHOP_OFFERS.find((offer) => offer.kind === 'chest' && offer.tier === tier)
  const key = CHEST_SHOP_OFFERS.find((offer) => offer.kind === 'key' && offer.tier === tier)
  return (chest?.gtpCost ?? 0) + (key?.gtpCost ?? 0)
}

function gtpOnly(amount: number): ChestRewardRoll {
  return {
    kind: 'gtp',
    gtp: amount,
    ppMinutes: 0,
    idleBoostMinutes: 0,
    goldenShower: false,
    label: `+${amount} GTP`,
  }
}

function ppOnly(minutes: number): ChestRewardRoll {
  return {
    kind: 'pp_minutes',
    gtp: 0,
    ppMinutes: minutes,
    idleBoostMinutes: 0,
    goldenShower: false,
    label: `+${minutes} min PP`,
  }
}

function combo(gtp: number, ppMinutes: number): ChestRewardRoll {
  return {
    kind: 'combo',
    gtp,
    ppMinutes,
    idleBoostMinutes: 0,
    goldenShower: false,
    label: `+${gtp} GTP + ${ppMinutes} min PP`,
  }
}

function idleBoost(): ChestRewardRoll {
  return {
    kind: 'idle_boost',
    gtp: 0,
    ppMinutes: 0,
    idleBoostMinutes: 5,
    goldenShower: false,
    label: '2× Idle 5 min',
  }
}

function shower(): ChestRewardRoll {
  return {
    kind: 'golden_shower',
    gtp: 0,
    ppMinutes: 0,
    idleBoostMinutes: 0,
    goldenShower: true,
    label: 'Golden Shower!',
  }
}

interface RewardRow {
  weight: number
  label: string
  roll: () => ChestRewardRoll
}

function tierRewardTable(tier: ChestTier): RewardRow[] {
  const [lossLow, lossHigh] = LOSS_GTP[tier]
  const [winLow, winHigh] = WIN_GTP[tier]
  const [ppLow, ppHigh] = PP_MINUTES[tier]
  const mix = COMBO[tier]
  return [
    { weight: 25, label: `+${lossLow} GTP`, roll: () => gtpOnly(lossLow) },
    { weight: 15, label: `+${lossHigh} GTP`, roll: () => gtpOnly(lossHigh) },
    { weight: 14, label: `+${winLow} GTP`, roll: () => gtpOnly(winLow) },
    { weight: 6, label: `+${winHigh} GTP`, roll: () => gtpOnly(winHigh) },
    { weight: 12, label: `+${ppLow} min PP`, roll: () => ppOnly(ppLow) },
    { weight: 8, label: `+${ppHigh} min PP`, roll: () => ppOnly(ppHigh) },
    {
      weight: 8,
      label: `+${mix.gtp} GTP + ${mix.ppMinutes} min PP`,
      roll: () => combo(mix.gtp, mix.ppMinutes),
    },
    { weight: 8, label: '2× Idle 5 min', roll: () => idleBoost() },
    { weight: 4, label: 'Golden Shower!', roll: () => shower() },
  ]
}

const TIER_REWARD_TABLE: Record<ChestTier, RewardRow[]> = {
  regular: tierRewardTable('regular'),
  silver: tierRewardTable('silver'),
  golden: tierRewardTable('golden'),
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

export function chestRewardOddsSummary(tier: ChestTier): string {
  const [ppLow, ppHigh] = PP_MINUTES[tier]
  return `40% GTP below cost · 20% GTP above cost · ${ppLow}–${ppHigh} min PP · combo · 2× idle 5m · shower`
}

export function rollChestReward(tier: ChestTier, random = Math.random): ChestRewardRoll {
  const table = TIER_REWARD_TABLE[tier]
  const total = table.reduce((sum, row) => sum + row.weight, 0)
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
