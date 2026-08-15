import type { DailyDumpActiveRuntime, DailyDumpState, PlayerSaveV2 } from '../save/saveSchema'
import { isUtcDateInFuture, toUtcDateKey } from '../time/TimeService'

export const DAILY_DUMP = {
  durationMs: 60_000,
  countdownMs: 3_000,
  /** Normalized points per tap — independent of run power for fairness */
  pointsPerTap: 1,
  comboBonusPerStack: 0.05,
  maxCombo: 30,
  tiers: {
    bronze: 60,
    silver: 120,
    gold: 180,
    diamond: 240,
  },
  rewards: {
    none: 0,
    bronze: 8,
    silver: 15,
    gold: 25,
    diamond: 40,
  },
} as const

export type DailyDumpPhase = 'idle' | 'countdown' | 'running' | 'finished'
export type DailyDumpTier = DailyDumpState['lastTier']

export interface DailyDumpRuntime {
  phase: DailyDumpPhase
  startedAt: number
  endsAt: number
  countdownEndsAt: number
  score: number
  taps: number
  combo: number
  peakCombo: number
  rollingCps: number
  tapTimestamps: number[]
  rewardTier: DailyDumpTier
  gtpReward: number
}

export function createIdleDailyDumpRuntime(): DailyDumpRuntime {
  return {
    phase: 'idle',
    startedAt: 0,
    endsAt: 0,
    countdownEndsAt: 0,
    score: 0,
    taps: 0,
    combo: 0,
    peakCombo: 0,
    rollingCps: 0,
    tapTimestamps: [],
    rewardTier: 'none',
    gtpReward: 0,
  }
}

export function isResumableDailyDumpRuntime(
  runtime: Pick<DailyDumpRuntime, 'phase'> | DailyDumpActiveRuntime | null | undefined,
): boolean {
  if (!runtime) return false
  return (
    runtime.phase === 'countdown' || runtime.phase === 'running' || runtime.phase === 'finished'
  )
}

export function serializeDailyDumpRuntime(
  runtime: DailyDumpRuntime,
): DailyDumpActiveRuntime | null {
  if (!isResumableDailyDumpRuntime(runtime)) return null
  return {
    phase: runtime.phase as 'countdown' | 'running' | 'finished',
    startedAt: runtime.startedAt,
    endsAt: runtime.endsAt,
    countdownEndsAt: runtime.countdownEndsAt,
    score: runtime.score,
    taps: runtime.taps,
    combo: runtime.combo,
    peakCombo: runtime.peakCombo,
    rewardTier: runtime.rewardTier,
    gtpReward: runtime.gtpReward,
  }
}

export function restoreDailyDumpRuntime(
  active: DailyDumpActiveRuntime | null | undefined,
): DailyDumpRuntime {
  if (!active || !isResumableDailyDumpRuntime(active)) return createIdleDailyDumpRuntime()
  return {
    phase: active.phase,
    startedAt: active.startedAt,
    endsAt: active.endsAt,
    countdownEndsAt: active.countdownEndsAt,
    score: active.score,
    taps: active.taps,
    combo: active.combo,
    peakCombo: active.peakCombo,
    rollingCps: 0,
    tapTimestamps: [],
    rewardTier: active.rewardTier,
    gtpReward: active.gtpReward,
  }
}

/**
 * One attempt per UTC day. An unfinished/finished-unclaimed `activeRuntime`
 * for today (or with no day mark yet) can be resumed without burning a new day.
 */
export function canStartDailyDump(save: PlayerSaveV2, now: number): boolean {
  const today = toUtcDateKey(now)
  const { lastPlayedDate, activeRuntime } = save.dailyDumpState
  const resumable = isResumableDailyDumpRuntime(activeRuntime)

  if (resumable && (lastPlayedDate === today || lastPlayedDate === null)) {
    return true
  }
  if (isUtcDateInFuture(lastPlayedDate, now)) {
    return false
  }

  return lastPlayedDate !== today
}

export function tierFromScore(score: number): DailyDumpTier {
  if (score >= DAILY_DUMP.tiers.diamond) return 'diamond'
  if (score >= DAILY_DUMP.tiers.gold) return 'gold'
  if (score >= DAILY_DUMP.tiers.silver) return 'silver'
  if (score >= DAILY_DUMP.tiers.bronze) return 'bronze'
  return 'none'
}

export function gtpForTier(tier: DailyDumpTier): number {
  return DAILY_DUMP.rewards[tier]
}

const TIER_ORDER: DailyDumpTier[] = ['none', 'bronze', 'silver', 'gold', 'diamond']

export function nextDumpTierProgress(score: number): {
  current: DailyDumpTier
  next: DailyDumpTier | null
  remaining: number
} {
  const current = tierFromScore(score)
  const index = TIER_ORDER.indexOf(current)
  const next = index >= 0 && index < TIER_ORDER.length - 1 ? TIER_ORDER[index + 1] : null
  if (!next || next === 'none') {
    return { current, next: null, remaining: 0 }
  }
  const threshold = DAILY_DUMP.tiers[next]
  return { current, next, remaining: Math.max(0, threshold - score) }
}

/** UTC ISO-week key, e.g. `2026-W32`. */
export function utcWeekKey(now: number): string {
  const date = new Date(now)
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function startDailyDumpRuntime(now: number): DailyDumpRuntime {
  return {
    ...createIdleDailyDumpRuntime(),
    phase: 'countdown',
    startedAt: now,
    countdownEndsAt: now + DAILY_DUMP.countdownMs,
    endsAt: now + DAILY_DUMP.countdownMs + DAILY_DUMP.durationMs,
  }
}

export function tickDailyDump(runtime: DailyDumpRuntime, now: number, dtMs = 16): DailyDumpRuntime {
  let next = runtime

  if (next.phase === 'countdown' && now >= next.countdownEndsAt) {
    next = {
      ...next,
      phase: 'running',
      // Anchor the run to countdown end so large dt jumps can finish in one tick.
      endsAt: next.countdownEndsAt + DAILY_DUMP.durationMs,
      tapTimestamps: [],
    }
  }

  if (next.phase === 'running') {
    const taps = next.tapTimestamps.filter((t) => now - t <= 1000)
    const rollingCps = taps.length
    const combo = Math.max(0, next.combo - (0.02 * dtMs) / 16)
    if (now >= next.endsAt) {
      const rewardTier = tierFromScore(next.score)
      return {
        ...next,
        phase: 'finished',
        rollingCps,
        combo,
        rewardTier,
        gtpReward: gtpForTier(rewardTier),
        tapTimestamps: taps,
      }
    }
    return { ...next, rollingCps, combo, tapTimestamps: taps }
  }

  return next
}

export function tapDailyDump(runtime: DailyDumpRuntime, now: number): DailyDumpRuntime {
  if (runtime.phase !== 'running') return runtime
  const combo = Math.min(DAILY_DUMP.maxCombo, runtime.combo + 1)
  const mult = 1 + combo * DAILY_DUMP.comboBonusPerStack
  const gained = Math.floor(DAILY_DUMP.pointsPerTap * mult)
  const tapTimestamps = [...runtime.tapTimestamps.filter((t) => now - t <= 1000), now]
  return {
    ...runtime,
    taps: runtime.taps + 1,
    combo,
    peakCombo: Math.max(runtime.peakCombo, combo),
    score: runtime.score + gained,
    rollingCps: tapTimestamps.length,
    tapTimestamps,
  }
}
