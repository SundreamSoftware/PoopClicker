import { describe, expect, it } from 'vitest'
import {
  estimateWeeklyLeagueStanding,
  weeklyLeagueShareText,
} from '../../src/core/systems/weeklyLeague'

describe('weeklyLeague', () => {
  it('returns wood/low tier for zero score', () => {
    const standing = estimateWeeklyLeagueStanding(0, '2026-W32')
    expect(standing.score).toBe(0)
    expect(standing.percentile).toBeGreaterThanOrEqual(1)
    expect(standing.percentile).toBeLessThan(30)
    expect(standing.tier).toBe('Wood')
  })

  it('is stable for the same week key', () => {
    const a = estimateWeeklyLeagueStanding(420, '2026-W32')
    const b = estimateWeeklyLeagueStanding(420, '2026-W32')
    expect(a).toEqual(b)
  })

  it('ranks high scores near the top', () => {
    const standing = estimateWeeklyLeagueStanding(1200, '2026-W32')
    expect(standing.percentile).toBeGreaterThanOrEqual(85)
    expect(['Platinum', 'Diamond']).toContain(standing.tier)
  })

  it('builds a share string with week and score', () => {
    const standing = estimateWeeklyLeagueStanding(300, '2026-W32')
    const text = weeklyLeagueShareText(standing)
    expect(text).toContain('2026-W32')
    expect(text).toContain('300')
    expect(text).toContain('Poop Clicker')
  })
})
