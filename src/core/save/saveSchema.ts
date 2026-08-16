import type {
  ActiveBoost,
  ActiveEvent,
  AutoBuyStrategy,
  ChestInventory,
  DailyChallengeInstance,
} from '../types/gameTypes'

export const SAVE_SCHEMA_VERSION = 2
export const SAVE_STORAGE_KEY = 'poop_clicker_save_v2'
export const SAVE_BACKUP_KEY = 'poop_clicker_save_v2_bak'

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

/** Serializable Daily Dump runtime (no tapTimestamps / rollingCps). */
export interface DailyDumpActiveRuntime {
  phase: 'countdown' | 'running' | 'finished'
  startedAt: number
  endsAt: number
  countdownEndsAt: number
  score: number
  taps: number
  combo: number
  peakCombo: number
  rewardTier: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond'
  gtpReward: number
}

export interface DailyDumpState {
  lastPlayedDate: string | null
  bestScore: number
  lastScore: number
  lastTier: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond'
  rewardClaimed: boolean
  /** Persisted mid-run / finished-unclaimed dump so kill-app does not burn the day. */
  activeRuntime: DailyDumpActiveRuntime | null
  /** ISO week key `YYYY-Www` for weekly league tracking. */
  weeklyBestWeekKey: string | null
  weeklyBestScore: number
}

export interface SessionMissionSaveEntry {
  id: string
  progress: number
  claimed: boolean
}

export interface SessionMissionsSave {
  dateKey: string | null
  sessionId: number
  dailyClaimedGtp: number
  missions: SessionMissionSaveEntry[]
}

export interface RewardedCooldownsSave {
  incomeBoostAt: number
  instantPpsAt: number
  eventRetryAt: number
  goldenSpawnAt: number
}

export interface PlayerSaveV2 {
  schemaVersion: number
  saveRevision: number
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
  inventoryChests: ChestInventory
  inventoryKeys: ChestInventory
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
  sessionMissions: SessionMissionsSave
  rewardedCooldowns: RewardedCooldownsSave
  activeBoosts: ActiveBoost[]
  activeEvent: ActiveEvent | null
  lastEventEndedAt: Record<string, number>
  lastGoldenPoopAt: number
  nextGoldenPoopAt: number
  nextRandomEventAt: number
  lastEventActivityAt: number
  autoBuyUnlocked: boolean
  autoBuyEnabled: boolean
  autoBuyPreferences: {
    generators: boolean
    upgrades: boolean
  }
  autoBuyStrategy: AutoBuyStrategy
  /** Mirrored Royal Flush Turbo Servo level (0–10). Survives Flush. */
  autoBuySpeedLevel: number
  /** 1 = none. Legacy Convenience Pack owners may still have 2; new grants do not raise this. */
  paidProductionMultiplier: number
  /** Extra offline hours from Convenience Pack (0 if none). */
  paidOfflineCapHours: number
  /** Extra Bathroom Break charge slots from Convenience Pack (0 if none). */
  paidBathroomChargeBonus: number
  permanentProductionBonus: number
  tutorialFlags: Record<string, boolean>
  lastSaveTimestamp: number
  lastActiveTimestamp: number
  totalPlayTimeMs: number
  officeSessionMs: number
  buyMultiplierIndex: number
  sessionsCount: number
  bathroomBreakClaimsTotal: number
  settings: {
    reducedMotion: boolean
    haptics: boolean
    sfx: boolean
    music: boolean
    notifications: boolean
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
