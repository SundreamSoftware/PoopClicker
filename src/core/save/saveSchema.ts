import type { ActiveBoost, ActiveEvent, DailyChallengeInstance } from '../types/gameTypes'

export const SAVE_SCHEMA_VERSION = 2

export interface SerializedLargeNumber {
  m: number
  e: number
}

export interface AchievementSaveState {
  progress: number
  completed: boolean
  claimed: boolean
  completedAt: number | null
  discovered: boolean
}

export interface DailyDumpState {
  lastPlayedDate: string | null
  bestScore: number
  lastScore: number
  lastTier: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond'
  rewardClaimed: boolean
}

export interface PlayerSaveV2 {
  schemaVersion: number
  currentPP: SerializedLargeNumber
  runPPEarned: SerializedLargeNumber
  lifetimePPEarned: SerializedLargeNumber
  tapCount: number
  sessionTapCount: number
  critCount: number
  highestCPS: number
  highestPPS: SerializedLargeNumber
  generators: Record<string, number>
  purchasedRunUpgrades: Record<string, number>
  claimedGeneratorMilestones: Record<string, number[]>
  flushCount: number
  flushPower: number
  royalFlushLevels: Record<string, number>
  gtp: number
  removeAds: boolean
  ownedIapProducts: string[]
  ownedSkins: string[]
  equippedSkinId: string
  unlockedWorlds: string[]
  currentWorldId: string
  achievements: Record<string, AchievementSaveState>
  dailyChallenges: DailyChallengeInstance[]
  dailyChallengeDate: string | null
  dailyChestClaimed: boolean
  dailyRerollsUsed: number
  dailyChallengesCompletedTotal: number
  dailyStreak: number
  dailyStreakCycle: number
  lastDailyClaim: string | null
  streakSaverCharges: number
  lastStreakSaverEarnDate: string | null
  bathroomBreakCharges: number
  lastBathroomBreakGeneration: number
  firstFlushOfDayClaimedDate: string | null
  goldenPoopsCaught: number
  clogsCompleted: number
  clogsFailed: number
  eventsCompleted: number
  eventCompletions: Record<string, number>
  dailyDumpState: DailyDumpState
  activeBoosts: ActiveBoost[]
  activeEvent: ActiveEvent | null
  lastEventEndedAt: Record<string, number>
  lastGoldenPoopAt: number
  nextGoldenPoopAt: number
  nextRandomEventAt: number
  autoBuyUnlocked: boolean
  autoBuyEnabled: boolean
  permanentProductionBonus: number
  tutorialFlags: Record<string, boolean>
  lastSaveTimestamp: number
  lastActiveTimestamp: number
  totalPlayTimeMs: number
  officeSessionMs: number
  buyMultiplierIndex: number
  settings: {
    reducedMotion: boolean
    haptics: boolean
    sfx: boolean
    music: boolean
  }
}

/** Legacy v1 shape — GTP also acted as prestige multiplier. */
export interface PlayerSaveV1 {
  schemaVersion?: 1
  pp?: number | SerializedLargeNumber
  gtp?: number
  tapCount?: number
  generators?: Record<string, number>
  upgrades?: Record<string, number>
  flushCount?: number
  ownedSkins?: string[]
  equippedSkin?: string
  lastSave?: number
  prestigeBonus?: number
}

export type AnySave = PlayerSaveV1 | PlayerSaveV2 | Record<string, unknown>
