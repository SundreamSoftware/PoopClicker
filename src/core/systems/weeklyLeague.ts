/** Local Weekly Toilet League — percentile estimate from dump score (no backend). */

export type LeagueTier = 'Wood' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'

export interface WeeklyLeagueStanding {
  weekKey: string
  score: number
  /** 0–100, higher is better (top of field). */
  percentile: number
  tier: LeagueTier
  /** Approximate rank among a synthetic weekly field. */
  approxRank: number
  fieldSize: number
  label: string
}

const FIELD_SIZE = 10_000

/** Deterministic 0..1 from week key (stable faux population noise). */
function weekSeed(weekKey: string): number {
  let h = 2166136261
  for (let i = 0; i < weekKey.length; i++) {
    h ^= weekKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

/**
 * Maps a Daily Dump weekly best score to a local league standing.
 * Curve is soft-sigmoid so early scores feel rewarding without needing multiplayer.
 */
export function estimateWeeklyLeagueStanding(score: number, weekKey: string): WeeklyLeagueStanding {
  const safeScore = Math.max(0, Math.floor(score))
  const seed = weekSeed(weekKey || 'W00')
  // Soft curve: ~150 bronze-ish, ~400 gold, ~800 diamond edge
  const normalized = 1 - Math.exp(-safeScore / 280)
  const jitter = (seed - 0.5) * 0.06
  const percentile = Math.max(1, Math.min(99, Math.round((normalized + jitter) * 100)))
  const approxRank = Math.max(1, Math.round(((100 - percentile) / 100) * FIELD_SIZE))

  let tier: LeagueTier = 'Wood'
  if (percentile >= 95) tier = 'Diamond'
  else if (percentile >= 85) tier = 'Platinum'
  else if (percentile >= 70) tier = 'Gold'
  else if (percentile >= 50) tier = 'Silver'
  else if (percentile >= 25) tier = 'Bronze'

  return {
    weekKey,
    score: safeScore,
    percentile,
    tier,
    approxRank,
    fieldSize: FIELD_SIZE,
    label: `${tier} · Top ${100 - percentile + 1}%`,
  }
}

export function weeklyLeagueShareText(standing: WeeklyLeagueStanding): string {
  if (standing.score <= 0) {
    return 'Join me in Poop Clicker Weekly Toilet League!'
  }
  return `Weekly Toilet League ${standing.weekKey}: ${standing.score} pts → ${standing.tier} (≈#${standing.approxRank}/${standing.fieldSize}). Beat me in Poop Clicker!`
}
