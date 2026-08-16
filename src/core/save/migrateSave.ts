import { ACHIEVEMENT_BY_ID } from '../../content/achievements'
import { withCollectionMaterialSkins } from '../systems/skins'
import { GENERATOR_BY_ID } from '../../content/generators'
import { IAP_BY_ID } from '../../content/iapProducts'
import { ROYAL_FLUSH_BY_ID } from '../../content/royalFlush'
import { UPGRADE_BY_ID } from '../../content/upgrades'
import {
  AUTO_BUY_SPEED_NODE_ID,
  AUTO_BUY_STRATEGIES,
  clampAutoBuySpeedLevel,
} from '../systems/autoBuy'
import { createDefaultSave } from './defaultSave'
import {
  SAVE_BACKUP_KEY,
  SAVE_SCHEMA_VERSION,
  SAVE_STORAGE_KEY,
  type AnySave,
  type DailyDumpActiveRuntime,
  type PlayerSaveV1,
  type PlayerSaveV2,
  type RewardedCooldownsSave,
  type SerializedLargeNumber,
  type SessionMissionsSave,
} from './saveSchema'
import type { ActiveBoost, ActiveEvent, ChestInventory, EventType } from '../types/gameTypes'

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

function asNonNegInt(value: unknown, fallback = 0): number {
  return Math.max(0, Math.floor(asNumber(value, fallback)))
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
    score: asNonNegInt(raw.score),
    taps: asNonNegInt(raw.taps),
    combo: asNonNegInt(raw.combo),
    peakCombo: asNonNegInt(raw.peakCombo),
    rewardTier: (DAILY_DUMP_TIERS.has(rewardTier)
      ? rewardTier
      : 'none') as DailyDumpActiveRuntime['rewardTier'],
    gtpReward: asNonNegInt(raw.gtpReward),
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
    sessionId: Math.max(0, Math.floor(asNumber(raw.sessionId))),
    dailyClaimedGtp: Math.max(0, Math.floor(asNumber(raw.dailyClaimedGtp))),
    missions,
  }
}

function sanitizeClaimedMilestones(value: unknown): Record<string, number[]> {
  const raw = asRecord(value)
  const out: Record<string, number[]> = {}
  for (const [id, levels] of Object.entries(raw)) {
    if (!GENERATOR_BY_ID[id] || !Array.isArray(levels)) continue
    const clean = Array.from(
      new Set(levels.map((level) => Math.max(0, Math.floor(asNumber(level)))).filter((n) => n > 0)),
    )
    if (clean.length > 0) out[id] = clean
  }
  return out
}

function sanitizeAchievements(value: unknown): PlayerSaveV2['achievements'] {
  const raw = asRecord(value)
  const out: PlayerSaveV2['achievements'] = {}
  for (const [id, state] of Object.entries(raw)) {
    if (!ACHIEVEMENT_BY_ID[id] || !state || typeof state !== 'object') continue
    const rec = state as Record<string, unknown>
    out[id] = {
      progress: asNonNegInt(rec.progress),
      completed: asBool(rec.completed),
      claimed: asBool(rec.claimed),
      completedAt: rec.completedAt == null ? null : asNumber(rec.completedAt),
      discovered: asBool(rec.discovered),
    }
  }
  return out
}

function sanitizeLevelMap(
  value: unknown,
  isValidId: (id: string) => boolean,
  maxLevel = 10_000,
): Record<string, number> {
  const raw = asRecord(value)
  const out: Record<string, number> = {}
  for (const [id, level] of Object.entries(raw)) {
    if (!isValidId(id)) continue
    const n = Math.min(maxLevel, Math.max(0, Math.floor(asNumber(level))))
    if (n > 0) out[id] = n
  }
  return out
}

function sanitizeActiveBoosts(value: unknown): ActiveBoost[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const raw = item as Record<string, unknown>
    const id = asString(raw.id)
    if (!id) return []
    return [
      {
        id,
        label: asString(raw.label, id),
        tapMultiplier: Math.max(0, asNumber(raw.tapMultiplier, 1)),
        idleMultiplier: Math.max(0, asNumber(raw.idleMultiplier, 1)),
        expiresAt: asNumber(raw.expiresAt),
      },
    ]
  })
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
    tapCount: asNonNegInt(raw.tapCount),
    generators: sanitizeLevelMap(raw.generators, (id) => Boolean(GENERATOR_BY_ID[id])),
    purchasedRunUpgrades: sanitizeLevelMap(raw.upgrades, (id) => Boolean(UPGRADE_BY_ID[id])),
    flushCount: asNonNegInt(raw.flushCount),
    flushPower,
    gtp: asNonNegInt(gtp),
    ownedSkins: withCollectionMaterialSkins(
      Array.isArray(raw.ownedSkins)
        ? Array.from(new Set(['classic_poop', ...raw.ownedSkins.map(String)]))
        : ['classic_poop'],
    ),
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
  const royalFlushLevels = sanitizeLevelMap(raw.royalFlushLevels, (id) =>
    Boolean(ROYAL_FLUSH_BY_ID[id]),
  )
  const legacySpeed = clampAutoBuySpeedLevel(asNonNegInt(raw.autoBuySpeedLevel))
  const treeSpeed = royalFlushLevels[AUTO_BUY_SPEED_NODE_ID] ?? 0
  const mergedSpeed = clampAutoBuySpeedLevel(Math.max(treeSpeed, legacySpeed))
  if (mergedSpeed > 0) {
    royalFlushLevels[AUTO_BUY_SPEED_NODE_ID] = mergedSpeed
  }

  return {
    ...base,
    schemaVersion: SAVE_SCHEMA_VERSION,
    saveRevision: asNonNegInt(raw.saveRevision, 0),
    currentPP: toSerialized(raw.currentPP ?? raw.pp),
    runPPEarned: toSerialized(raw.runPPEarned ?? raw.currentPP ?? raw.pp),
    lifetimePPEarned: toSerialized(raw.lifetimePPEarned ?? raw.runPPEarned ?? raw.pp),
    tapCount: asNonNegInt(raw.tapCount),
    sessionTapCount: asNonNegInt(raw.sessionTapCount),
    critCount: asNonNegInt(raw.critCount),
    highestCPS: asNonNegInt(raw.highestCPS),
    highestPPS: toSerialized(raw.highestPPS),
    generators: sanitizeLevelMap(raw.generators, (id) => Boolean(GENERATOR_BY_ID[id])),
    purchasedRunUpgrades: sanitizeLevelMap(raw.purchasedRunUpgrades ?? raw.upgrades, (id) =>
      Boolean(UPGRADE_BY_ID[id]),
    ),
    claimedGeneratorMilestones: sanitizeClaimedMilestones(raw.claimedGeneratorMilestones),
    flushCount: asNonNegInt(raw.flushCount),
    flushPower: asNonNegInt(raw.flushPower),
    royalFlushLevels,
    gtp: asNonNegInt(raw.gtp),
    inventoryChests: sanitizeChestInventory(raw.inventoryChests),
    inventoryKeys: sanitizeChestInventory(raw.inventoryKeys),
    removeAds: asBool(raw.removeAds),
    ownedIapProducts: Array.isArray(raw.ownedIapProducts)
      ? Array.from(new Set(raw.ownedIapProducts.map(String).filter((id) => Boolean(IAP_BY_ID[id]))))
      : [],
    ownedSkins: withCollectionMaterialSkins(
      Array.isArray(raw.ownedSkins)
        ? Array.from(new Set(['classic_poop', ...raw.ownedSkins.map(String)]))
        : ['classic_poop'],
    ),
    equippedSkinId:
      asString(raw.equippedSkinId ?? raw.equippedSkin, 'classic_poop') || 'classic_poop',
    unlockedWorlds: Array.isArray(raw.unlockedWorlds)
      ? Array.from(new Set(['home_bathroom', ...raw.unlockedWorlds.map(String)]))
      : ['home_bathroom'],
    currentWorldId: asString(raw.currentWorldId, 'home_bathroom') || 'home_bathroom',
    achievements: sanitizeAchievements(raw.achievements),
    dailyChallenges: Array.isArray(raw.dailyChallenges)
      ? (raw.dailyChallenges as PlayerSaveV2['dailyChallenges'])
      : [],
    dailyChallengeDate: raw.dailyChallengeDate == null ? null : asString(raw.dailyChallengeDate),
    dailyChestClaimed: asBool(raw.dailyChestClaimed),
    dailyRerollsUsed: asNonNegInt(raw.dailyRerollsUsed),
    dailyChallengesCompletedTotal: asNonNegInt(raw.dailyChallengesCompletedTotal),
    dailyStreak: asNonNegInt(raw.dailyStreak),
    dailyStreakCycle: Math.max(1, asNonNegInt(raw.dailyStreakCycle, 1)),
    lastDailyClaim: raw.lastDailyClaim == null ? null : asString(raw.lastDailyClaim),
    streakSaverCharges: asNonNegInt(raw.streakSaverCharges, 1),
    lastStreakSaverEarnDate:
      raw.lastStreakSaverEarnDate == null ? null : asString(raw.lastStreakSaverEarnDate),
    bathroomBreakCharges: asNonNegInt(raw.bathroomBreakCharges),
    lastBathroomBreakGeneration: asNumber(raw.lastBathroomBreakGeneration, now),
    firstFlushOfDayClaimedDate:
      raw.firstFlushOfDayClaimedDate == null ? null : asString(raw.firstFlushOfDayClaimedDate),
    goldenPoopsCaught: asNonNegInt(raw.goldenPoopsCaught),
    clogsCompleted: asNonNegInt(raw.clogsCompleted),
    clogsFailed: asNonNegInt(raw.clogsFailed),
    eventsCompleted: asNonNegInt(raw.eventsCompleted),
    eventCompletions: (raw.eventCompletions as Record<string, number>) ?? {},
    dailyDumpState: {
      lastPlayedDate: dump.lastPlayedDate == null ? null : asString(dump.lastPlayedDate),
      bestScore: asNonNegInt(dump.bestScore),
      lastScore: asNonNegInt(dump.lastScore),
      lastTier: (['none', 'bronze', 'silver', 'gold', 'diamond'] as const).includes(
        dump.lastTier as PlayerSaveV2['dailyDumpState']['lastTier'],
      )
        ? (dump.lastTier as PlayerSaveV2['dailyDumpState']['lastTier'])
        : 'none',
      rewardClaimed: asBool(dump.rewardClaimed),
      activeRuntime: sanitizeDailyDumpActiveRuntime(dump.activeRuntime),
      weeklyBestWeekKey: dump.weeklyBestWeekKey == null ? null : asString(dump.weeklyBestWeekKey),
      weeklyBestScore: asNonNegInt(dump.weeklyBestScore),
    },
    sessionMissions: sanitizeSessionMissions(raw.sessionMissions),
    rewardedCooldowns: sanitizeRewardedCooldowns(raw.rewardedCooldowns),
    activeBoosts: sanitizeActiveBoosts(raw.activeBoosts),
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
    autoBuyStrategy: AUTO_BUY_STRATEGIES.includes(
      raw.autoBuyStrategy as (typeof AUTO_BUY_STRATEGIES)[number],
    )
      ? (raw.autoBuyStrategy as (typeof AUTO_BUY_STRATEGIES)[number])
      : 'balanced',
    autoBuySpeedLevel: mergedSpeed,
    paidProductionMultiplier: Math.max(1, asNumber(raw.paidProductionMultiplier, 1)),
    permanentProductionBonus: Math.max(0, asNumber(raw.permanentProductionBonus)),
    tutorialFlags: {
      ...base.tutorialFlags,
      ...(raw.tutorialFlags as Record<string, boolean>),
    },
    lastSaveTimestamp: asNumber(raw.lastSaveTimestamp ?? raw.lastSave, now),
    lastActiveTimestamp: asNumber(raw.lastActiveTimestamp ?? raw.lastSaveTimestamp, now),
    totalPlayTimeMs: asNonNegInt(raw.totalPlayTimeMs),
    officeSessionMs: asNonNegInt(raw.officeSessionMs),
    buyMultiplierIndex: asNonNegInt(raw.buyMultiplierIndex),
    sessionsCount: asNonNegInt(raw.sessionsCount),
    bathroomBreakClaimsTotal: asNonNegInt(raw.bathroomBreakClaimsTotal),
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

export function parseSaveJson(json: string, now = Date.now()): PlayerSaveV2 | null {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    return migrateSave(parsed as AnySave, now)
  } catch {
    return null
  }
}

export function deserializeSave(json: string, now = Date.now()): PlayerSaveV2 {
  return parseSaveJson(json, now) ?? createDefaultSave(now)
}

/** User imports must look like a save — not a random JSON object. */
export function isImportableSave(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const rec = raw as Record<string, unknown>
  if (rec.schemaVersion === 1 || rec.schemaVersion === 2) return true
  return (
    rec.currentPP != null ||
    rec.pp != null ||
    rec.tapCount != null ||
    rec.gtp != null ||
    rec.flushCount != null
  )
}

export function backupKeyFor(storageKey: string): string {
  return storageKey === SAVE_STORAGE_KEY ? SAVE_BACKUP_KEY : `${storageKey}_bak`
}

export function loadSaveFromStorage(
  storage: Storage | null | undefined,
  now = Date.now(),
  storageKey = SAVE_STORAGE_KEY,
): PlayerSaveV2 {
  if (!storage) return createDefaultSave(now)
  const primary = storage.getItem(storageKey)
  const fromPrimary = primary ? parseSaveJson(primary, now) : null
  if (fromPrimary) return fromPrimary
  const backup = storage.getItem(backupKeyFor(storageKey))
  const fromBackup = backup ? parseSaveJson(backup, now) : null
  if (fromBackup) return fromBackup
  return createDefaultSave(now)
}

export function writeSaveRecord(
  storage: Storage,
  json: string,
  storageKey = SAVE_STORAGE_KEY,
): void {
  const previous = storage.getItem(storageKey)
  if (previous && previous !== json) {
    try {
      storage.setItem(backupKeyFor(storageKey), previous)
    } catch (error) {
      console.warn('[save] backup write failed', error)
    }
  }
  storage.setItem(storageKey, json)
}
