import type { PlayerSaveV2 } from '../save/saveSchema'
import type { DailyDumpState } from '../save/saveSchema'
import { toUtcDateKey } from '../time/TimeService'

export const DAILY_DUMP = {
  durationMs: 60_000,
  countdownMs: 3_000,
  /** Normalized points per tap — independent of run power for fairness */
  pointsPerTap: 1,
  comboBonusPerStack: 0.05,
  maxCombo: 30,
  tiers: {
    bronze: 25,
    silver: 50,
    gold: 80,
    diamond: 120,
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

/** One attempt per UTC day. */
export function canStartDailyDump(save: PlayerSaveV2, now: number): boolean {
  const today = toUtcDateKey(now)
  return save.dailyDumpState.lastPlayedDate !== today
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
  if (runtime.phase === 'countdown' && now >= runtime.countdownEndsAt) {
    return {
      ...runtime,
      phase: 'running',
      endsAt: now + DAILY_DUMP.durationMs,
      tapTimestamps: [],
    }
  }
  if (runtime.phase === 'running') {
    const taps = runtime.tapTimestamps.filter((t) => now - t <= 1000)
    const rollingCps = taps.length
    const combo = Math.max(0, runtime.combo - (0.02 * dtMs) / 16)
    if (now >= runtime.endsAt) {
      const rewardTier = tierFromScore(runtime.score)
      return {
        ...runtime,
        phase: 'finished',
        rollingCps,
        combo,
        rewardTier,
        gtpReward: gtpForTier(rewardTier),
        tapTimestamps: taps,
      }
    }
    return { ...runtime, rollingCps, combo, tapTimestamps: taps }
  }
  return runtime
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
