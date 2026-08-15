/** Local weekly grade from Daily Dump score — not a live leaderboard. */

export type LeagueTier = 'Wood' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'

export interface WeeklyLeagueStanding {
  weekKey: string
  score: number
  /** 0–100, higher is better. */
  percentile: number
  tier: LeagueTier
  label: string
}

/** Deterministic 0..1 from week key (stable local grade noise). */
function weekSeed(weekKey: string): number {
  let h = 2166136261
  for (let i = 0; i < weekKey.length; i++) {
    h ^= weekKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

/**
 * Maps a Daily Dump weekly best score to a local grade.
 * Curve is soft-sigmoid so early scores feel rewarding without implying rivals.
 */
export function estimateWeeklyLeagueStanding(score: number, weekKey: string): WeeklyLeagueStanding {
  const safeScore = Math.max(0, Math.floor(score))
  const seed = weekSeed(weekKey || 'W00')
  // Soft curve: ~150 bronze-ish, ~400 gold, ~800 diamond edge
  const normalized = 1 - Math.exp(-safeScore / 280)
  const jitter = (seed - 0.5) * 0.06
  const percentile = Math.max(1, Math.min(99, Math.round((normalized + jitter) * 100)))

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
    label: `${tier} · Top ${100 - percentile + 1}%`,
  }
}

export function weeklyLeagueShareText(standing: WeeklyLeagueStanding): string {
  if (standing.score <= 0) {
    return 'Play Daily Dump in Poop Clicker and earn a local weekly grade!'
  }
  return `My local weekly grade ${standing.weekKey}: ${standing.score} pts → ${standing.tier}. Play Daily Dump in Poop Clicker!`
}
