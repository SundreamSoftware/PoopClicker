import type { LargeNumber } from '../numbers/LargeNumber'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type UnlockType =
  | 'default'
  | 'gtp'
  | 'achievement'
  | 'flush'
  | 'daily'
  | 'streak'
  | 'world'
  | 'collection'
  | 'event'
  | 'milestone'

export type UpgradeTier =
  | 'bathroom_basics'
  | 'advanced_plumbing'
  | 'industrial_digestion'
  | 'nuclear_bathroom'
  | 'quantum_pooping'
  | 'multiversal_plumbing'

export type UpgradeCategory = 'tap' | 'combo' | 'critical' | 'idle' | 'special'
export type EffectType =
  | 'tap_power'
  | 'tap_multiplier'
  | 'crit_chance'
  | 'crit_multiplier'
  | 'combo_max'
  | 'combo_decay'
  | 'frenzy_threshold'
  | 'frenzy_duration'
  | 'idle_multiplier'
  | 'generator_production'
  | 'offline_cap'
  | 'golden_chance'
  | 'event_reward'
  | 'global_production'

export type TapSpeedState = 'idle' | 'slow' | 'active' | 'fast' | 'frenzy' | 'overdrive'

export type ChallengeCategory = 'activity' | 'economy' | 'event'
export type ChallengeMetric =
  | 'taps'
  | 'crit_taps'
  | 'cps'
  | 'combo'
  | 'frenzy'
  | 'tap_pp'
  | 'generator_levels'
  | 'upgrades'
  | 'idle_pp'
  | 'spend_pp'
  | 'generator_level'
  | 'golden_poops'
  | 'clogs'
  | 'events'
  | 'flush'
  | 'frenzy_complete'

export type AchievementCategory =
  | 'tapping'
  | 'pp'
  | 'cps'
  | 'flush'
  | 'golden'
  | 'clogs'
  | 'generators'
  | 'collection'
  | 'events'
  | 'hidden'

export type AchievementMetric =
  | 'tapCount'
  | 'lifetimePPEarned'
  | 'highestCPS'
  | 'flushCount'
  | 'goldenPoopsCaught'
  | 'clogsCompleted'
  | 'totalGeneratorLevels'
  | 'highestGeneratorLevel'
  | 'ownedSkins'
  | 'unlockedWorlds'
  | 'achievementsCompleted'
  | 'eventsCompleted'
  | 'sessionTapCount'
  | 'officeSessionMs'
  | 'flushWithSkin'
  | 'goldenInSession'
  | 'clogsFailed'
  | 'absenceMs'
  | 'highestPPS'
  | 'dailyChallengesCompleted'
  | 'collectionPercent'

export type RoyalFlushCategory = 'pressure' | 'plumbing' | 'combo' | 'idle' | 'luck'

export type EventType =
  | 'golden_poop'
  | 'clogged_toilet'
  | 'burrito_rush'
  | 'toilet_paper_storm'
  | 'plumber_inspection'
  | 'mega_clog'
  | 'toilet_quake'
  | 'golden_rain'
  | 'mystery_flush'

export type SkinUnlockRequirement =
  | { type: 'default' }
  | { type: 'gtp'; amount: number }
  | { type: 'achievement'; achievementId: string }
  | { type: 'flush'; count: number }
  | { type: 'daily'; count: number }
  | { type: 'streak'; day: number }
  | { type: 'world'; worldId: string }
  | { type: 'collection'; percent: number }
  | { type: 'event'; eventId: string; count: number }
  | { type: 'milestone'; flushCount: number }
  | { type: 'iap'; productId: string }

export interface GeneratorMilestoneDef {
  level: number
  productionMultiplier: number
  unlockUpgradeId?: string
  perkId?: string
}

export interface GeneratorDef {
  id: string
  name: string
  description: string
  baseCost: number
  costGrowth: number
  baseProduction: number
  unlockPP?: number
  unlockFlushCount?: number
  milestones: GeneratorMilestoneDef[]
}

export interface UpgradeDef {
  id: string
  name: string
  description: string
  category: UpgradeCategory
  tier: UpgradeTier
  baseCost: number
  costGrowth: number
  maxLevel: number
  effectType: EffectType
  effectValue: number
  requiresUpgradeId?: string
  requiresWorldId?: string
  requiresFlushCount?: number
  requiresAchievementId?: string
}

export interface SkinDef {
  id: string
  name: string
  description: string
  rarity: Rarity
  unlock: SkinUnlockRequirement
  asset: string
  animationVariant: string
  vfx: string
}

export interface WorldDef {
  id: string
  name: string
  description: string
  unlockFlushCount: number
  productionBonus: number
  asset: string
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  category: AchievementCategory
  hidden: boolean
  metric: AchievementMetric
  target: number
  tier: number
  rewardGtp: number
  rewardSkinId?: string
  permanentBonus?: { type: EffectType; value: number }
  icon: string
  meta?: Record<string, string | number>
}

export interface ChallengeTemplate {
  id: string
  category: ChallengeCategory
  metric: ChallengeMetric
  name: string
  description: string
  baseTarget: number
  scaling: 'none' | 'pps' | 'taps' | 'generators' | 'flush'
  rewardGtp: number
  rewardBoostMinutes?: number
}

export interface DailyChallengeInstance {
  templateId: string
  category: ChallengeCategory
  metric: ChallengeMetric
  name: string
  description: string
  target: number
  progress: number
  completed: boolean
  claimed: boolean
  rewardGtp: number
  rewardBoostMinutes: number
}

export interface RoyalFlushNodeDef {
  id: string
  category: RoyalFlushCategory
  name: string
  description: string
  maxLevel: number
  baseCost: number
  costGrowth: number
  effectType: EffectType
  effectValue: number
  requires: string[]
  unlockFlushCount: number
}

export interface EventDef {
  id: string
  type: EventType
  name: string
  description: string
  durationMs: number
  cooldownMs: number
  minFlushCount: number
  rewardGtp: number
  rewardPpMinutes: number
  tapTarget?: number
  uiPresentation: string
  analyticsId: string
}

export interface FlushMilestoneDef {
  flushCount: number
  id: string
  name: string
  description: string
  unlockRoyalFlush?: boolean
  startBonusPpMinutes?: number
  unlockAutoBuy?: boolean
  startGeneratorBonusLevel?: number
  eventBonusPercent?: number
  unlockSkinId?: string
  permanentProductionBonus?: number
  unlockWorldId?: string
}

export interface ActiveBoost {
  id: string
  label: string
  tapMultiplier: number
  idleMultiplier: number
  expiresAt: number
}

export interface ActiveEvent {
  defId: string
  type: EventType
  startedAt: number
  endsAt: number
  taps: number
  tapTarget: number
  completed: boolean
  failed: boolean
  rewardClaimed: boolean
}

export interface OfflineReward {
  awayMs: number
  earned: LargeNumber
  claimed: boolean
}

export interface NextGoal {
  kind: 'upgrade' | 'generator' | 'flush' | 'daily' | 'achievement'
  title: string
  subtitle: string
  progress: number
}

export interface ClaimResult {
  ok: boolean
  reason?: string
  gtp?: number
  pp?: LargeNumber
  skinId?: string
}
