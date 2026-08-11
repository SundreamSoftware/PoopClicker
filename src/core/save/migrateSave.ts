import { createDefaultSave } from './defaultSave'
import {
  SAVE_SCHEMA_VERSION,
  type AnySave,
  type DailyDumpActiveRuntime,
  type PlayerSaveV1,
  type PlayerSaveV2,
  type RewardedCooldownsSave,
  type SerializedLargeNumber,
  type SessionMissionsSave,
} from './saveSchema'
import type { ActiveEvent, ChestInventory, EventType } from '../types/gameTypes'

const VALID_EVENT_TYPES = new Set<EventType>([
  'golden_poop',
  'plumber_inspection',
  'mega_clog',
  'golden_rain',
])

function sanitizeChestInventory(value: unknown): ChestInventory {
  const raw = asRecord(value)
  return {
    regular: Math.max(0, Math.floor(asNumber(raw.regular))),
    silver: Math.max(0, Math.floor(asNumber(raw.silver))),
    golden: Math.max(0, Math.floor(asNumber(raw.golden))),
  }
}

function sanitizeActiveEvent(value: unknown): ActiveEvent | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const type = asString(raw.type) as EventType
  if (!VALID_EVENT_TYPES.has(type)) return null
  return {
    defId: asString(raw.defId, type),
    type,
    startedAt: asNumber(raw.startedAt),
    endsAt: asNumber(raw.endsAt),
    taps: asNumber(raw.taps),
    tapTarget: asNumber(raw.tapTarget),
    completed: asBool(raw.completed),
    failed: asBool(raw.failed),
    rewardClaimed: asBool(raw.rewardClaimed),
    caughtCount: asNumber(raw.caughtCount),
    spawnedCount: asNumber(raw.spawnedCount),
    inBandMs: asNumber(raw.inBandMs),
    bandScore: asNumber(raw.bandScore),
  }
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function toSerialized(value: unknown): SerializedLargeNumber {
  if (value && typeof value === 'object' && 'm' in value && 'e' in value) {
    const v = value as SerializedLargeNumber
    return {
      m: asNumber(v.m),
      e: asNumber(v.e),
    }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 0) return { m: 0, e: 0 }
    const e = Math.floor(Math.log10(Math.abs(value)))
    return { m: value / 10 ** e, e }
  }
  return { m: 0, e: 0 }
}

const DAILY_DUMP_PHASES = new Set(['countdown', 'running', 'finished'])
const DAILY_DUMP_TIERS = new Set(['none', 'bronze', 'silver', 'gold', 'diamond'])

function sanitizeDailyDumpActiveRuntime(value: unknown): DailyDumpActiveRuntime | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const phase = asString(raw.phase)
  if (!DAILY_DUMP_PHASES.has(phase)) return null
  const rewardTier = asString(raw.rewardTier, 'none')
  return {
    phase: phase as DailyDumpActiveRuntime['phase'],
    startedAt: asNumber(raw.startedAt),
    endsAt: asNumber(raw.endsAt),
    countdownEndsAt: asNumber(raw.countdownEndsAt),
    score: asNumber(raw.score),
    taps: asNumber(raw.taps),
    combo: asNumber(raw.combo),
    peakCombo: asNumber(raw.peakCombo),
    rewardTier: (DAILY_DUMP_TIERS.has(rewardTier)
      ? rewardTier
      : 'none') as DailyDumpActiveRuntime['rewardTier'],
    gtpReward: asNumber(raw.gtpReward),
  }
}

function sanitizeSessionMissions(value: unknown): SessionMissionsSave {
  const raw = asRecord(value)
  const missions = Array.isArray(raw.missions)
    ? raw.missions
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .map((entry) => ({
          id: asString(entry.id),
          progress: Math.max(0, asNumber(entry.progress)),
          claimed: asBool(entry.claimed),
        }))
        .filter((entry) => entry.id.length > 0)
    : []
  return {
    dateKey: raw.dateKey == null ? null : asString(raw.dateKey),
    missions,
  }
}

function sanitizeRewardedCooldowns(value: unknown): RewardedCooldownsSave {
  const raw = asRecord(value)
  return {
    incomeBoostAt: asNumber(raw.incomeBoostAt),
    instantPpsAt: asNumber(raw.instantPpsAt),
    eventRetryAt: asNumber(raw.eventRetryAt),
    goldenSpawnAt: asNumber(raw.goldenSpawnAt),
  }
}

function migrateV1(raw: PlayerSaveV1, now: number): PlayerSaveV2 {
  const base = createDefaultSave(now)
  const prestige = asNumber(raw.prestigeBonus)
  const gtp = asNumber(raw.gtp)
  // Split legacy GTP prestige into Flush Power; keep spendable GTP.
  const flushPower = Math.max(0, Math.floor(prestige > 0 ? prestige : gtp * 0.1))

  return {
    ...base,
    currentPP: toSerialized(raw.pp),
    runPPEarned: toSerialized(raw.pp),
    lifetimePPEarned: toSerialized(raw.pp),
    tapCount: asNumber(raw.tapCount),
    generators: (raw.generators as Record<string, number>) ?? {},
    purchasedRunUpgrades: (raw.upgrades as Record<string, number>) ?? {},
    flushCount: asNumber(raw.flushCount),
    flushPower,
    gtp,
    ownedSkins: Array.isArray(raw.ownedSkins)
      ? Array.from(new Set(['classic_poop', ...raw.ownedSkins.map(String)]))
      : ['classic_poop'],
    equippedSkinId: asString(raw.equippedSkin, 'classic_poop') || 'classic_poop',
    lastSaveTimestamp: asNumber(raw.lastSave, now),
    lastActiveTimestamp: asNumber(raw.lastSave, now),
  }
}

function sanitizeV2(raw: Record<string, unknown>, now: number): PlayerSaveV2 {
  const base = createDefaultSave(now)
  const settings = asRecord(raw.settings)
  const dump = asRecord(raw.dailyDumpState)
  const autoBuyPreferences = asRecord(raw.autoBuyPreferences)

  return {
    ...base,
    ...raw,
    schemaVersion: SAVE_SCHEMA_VERSION,
    saveRevision: asNumber(raw.saveRevision, 0),
    currentPP: toSerialized(raw.currentPP ?? raw.pp),
    runPPEarned: toSerialized(raw.runPPEarned ?? raw.currentPP ?? raw.pp),
    lifetimePPEarned: toSerialized(raw.lifetimePPEarned ?? raw.runPPEarned ?? raw.pp),
    tapCount: asNumber(raw.tapCount),
    sessionTapCount: asNumber(raw.sessionTapCount),
    critCount: asNumber(raw.critCount),
    highestCPS: asNumber(raw.highestCPS),
    highestPPS: toSerialized(raw.highestPPS),
    generators: (raw.generators as Record<string, number>) ?? {},
    purchasedRunUpgrades:
      (raw.purchasedRunUpgrades as Record<string, number>) ??
      (raw.upgrades as Record<string, number>) ??
      {},
    claimedGeneratorMilestones: (raw.claimedGeneratorMilestones as Record<string, number[]>) ?? {},
    flushCount: asNumber(raw.flushCount),
    flushPower: asNumber(raw.flushPower),
    royalFlushLevels: (raw.royalFlushLevels as Record<string, number>) ?? {},
    gtp: asNumber(raw.gtp),
    inventoryChests: sanitizeChestInventory(raw.inventoryChests),
    inventoryKeys: sanitizeChestInventory(raw.inventoryKeys),
    removeAds: asBool(raw.removeAds),
    ownedIapProducts: Array.isArray(raw.ownedIapProducts) ? raw.ownedIapProducts.map(String) : [],
    ownedSkins: Array.isArray(raw.ownedSkins)
      ? Array.from(new Set(['classic_poop', ...raw.ownedSkins.map(String)]))
      : ['classic_poop'],
    equippedSkinId:
      asString(raw.equippedSkinId ?? raw.equippedSkin, 'classic_poop') || 'classic_poop',
    unlockedWorlds: Array.isArray(raw.unlockedWorlds)
      ? Array.from(new Set(['home_bathroom', ...raw.unlockedWorlds.map(String)]))
      : ['home_bathroom'],
    currentWorldId: asString(raw.currentWorldId, 'home_bathroom') || 'home_bathroom',
    achievements: (raw.achievements as PlayerSaveV2['achievements']) ?? {},
    dailyChallenges: Array.isArray(raw.dailyChallenges)
      ? (raw.dailyChallenges as PlayerSaveV2['dailyChallenges'])
      : [],
    dailyChallengeDate: raw.dailyChallengeDate == null ? null : asString(raw.dailyChallengeDate),
    dailyChestClaimed: asBool(raw.dailyChestClaimed),
    dailyRerollsUsed: asNumber(raw.dailyRerollsUsed),
    dailyChallengesCompletedTotal: asNumber(raw.dailyChallengesCompletedTotal),
    dailyStreak: asNumber(raw.dailyStreak),
    dailyStreakCycle: Math.max(1, asNumber(raw.dailyStreakCycle, 1)),
    lastDailyClaim: raw.lastDailyClaim == null ? null : asString(raw.lastDailyClaim),
    streakSaverCharges: asNumber(raw.streakSaverCharges, 1),
    lastStreakSaverEarnDate:
      raw.lastStreakSaverEarnDate == null ? null : asString(raw.lastStreakSaverEarnDate),
    bathroomBreakCharges: asNumber(raw.bathroomBreakCharges),
    lastBathroomBreakGeneration: asNumber(raw.lastBathroomBreakGeneration, now),
    firstFlushOfDayClaimedDate:
      raw.firstFlushOfDayClaimedDate == null ? null : asString(raw.firstFlushOfDayClaimedDate),
    goldenPoopsCaught: asNumber(raw.goldenPoopsCaught),
    clogsCompleted: asNumber(raw.clogsCompleted),
    clogsFailed: asNumber(raw.clogsFailed),
    eventsCompleted: asNumber(raw.eventsCompleted),
    eventCompletions: (raw.eventCompletions as Record<string, number>) ?? {},
    dailyDumpState: {
      lastPlayedDate: dump.lastPlayedDate == null ? null : asString(dump.lastPlayedDate),
      bestScore: asNumber(dump.bestScore),
      lastScore: asNumber(dump.lastScore),
      lastTier: (['none', 'bronze', 'silver', 'gold', 'diamond'] as const).includes(
        dump.lastTier as PlayerSaveV2['dailyDumpState']['lastTier'],
      )
        ? (dump.lastTier as PlayerSaveV2['dailyDumpState']['lastTier'])
        : 'none',
      rewardClaimed: asBool(dump.rewardClaimed),
      activeRuntime: sanitizeDailyDumpActiveRuntime(dump.activeRuntime),
      weeklyBestWeekKey:
        dump.weeklyBestWeekKey == null ? null : asString(dump.weeklyBestWeekKey),
      weeklyBestScore: asNumber(dump.weeklyBestScore),
    },
    sessionMissions: sanitizeSessionMissions(raw.sessionMissions),
    rewardedCooldowns: sanitizeRewardedCooldowns(raw.rewardedCooldowns),
    activeBoosts: Array.isArray(raw.activeBoosts)
      ? (raw.activeBoosts as PlayerSaveV2['activeBoosts'])
      : [],
    activeEvent: sanitizeActiveEvent(raw.activeEvent),
    lastEventEndedAt: (raw.lastEventEndedAt as Record<string, number>) ?? {},
    lastGoldenPoopAt: asNumber(raw.lastGoldenPoopAt),
    nextGoldenPoopAt: asNumber(raw.nextGoldenPoopAt, now + 180_000),
    nextRandomEventAt: asNumber(raw.nextRandomEventAt, now + 270_000),
    lastEventActivityAt: asNumber(raw.lastEventActivityAt, now),
    autoBuyUnlocked: asBool(raw.autoBuyUnlocked),
    autoBuyEnabled: asBool(raw.autoBuyEnabled),
    autoBuyPreferences: {
      generators: asBool(autoBuyPreferences.generators, true),
      upgrades: asBool(autoBuyPreferences.upgrades, true),
    },
    permanentProductionBonus: asNumber(raw.permanentProductionBonus),
    tutorialFlags: {
      ...base.tutorialFlags,
      ...(raw.tutorialFlags as Record<string, boolean>),
    },
    lastSaveTimestamp: asNumber(raw.lastSaveTimestamp ?? raw.lastSave, now),
    lastActiveTimestamp: asNumber(raw.lastActiveTimestamp ?? raw.lastSaveTimestamp, now),
    totalPlayTimeMs: asNumber(raw.totalPlayTimeMs),
    officeSessionMs: asNumber(raw.officeSessionMs),
    buyMultiplierIndex: asNumber(raw.buyMultiplierIndex),
    sessionsCount: asNumber(raw.sessionsCount),
    bathroomBreakClaimsTotal: asNumber(raw.bathroomBreakClaimsTotal),
    settings: {
      reducedMotion: asBool(settings.reducedMotion),
      haptics: asBool(settings.haptics, true),
      sfx: asBool(settings.sfx, true),
      music: asBool(settings.music, true),
      notifications: asBool(settings.notifications, true),
    },
  }
}

export function migrateSave(raw: AnySave | null | undefined, now = Date.now()): PlayerSaveV2 {
  if (!raw || typeof raw !== 'object') return createDefaultSave(now)
  const record = raw as Record<string, unknown>
  const version = asNumber(record.schemaVersion, 1)

  try {
    if (version <= 1 && !('runPPEarned' in record) && !('flushPower' in record)) {
      return migrateV1(record as PlayerSaveV1, now)
    }
    return sanitizeV2(record, now)
  } catch {
    return createDefaultSave(now)
  }
}

export function serializeSave(save: PlayerSaveV2): string {
  return JSON.stringify(save)
}

export function deserializeSave(json: string, now = Date.now()): PlayerSaveV2 {
  try {
    return migrateSave(JSON.parse(json) as AnySave, now)
  } catch {
    return createDefaultSave(now)
  }
}
