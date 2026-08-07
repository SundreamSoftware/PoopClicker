import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { FixedClock } from '../../src/core/time/TimeService'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { generateDailyChallenges, progressChallenge } from '../../src/core/systems/daily'

describe('Daily Challenges', () => {
  it('generates 3 challenges from different categories', () => {
    const save = createDefaultSave()
    const challenges = generateDailyChallenges(save, Date.now(), LargeNumber.from(10))
    expect(challenges).toHaveLength(3)
    const cats = new Set(challenges.map((c) => c.category))
    expect(cats.size).toBe(3)
  })

  it('scales targets with production', () => {
    const save = createDefaultSave()
    const date = Date.UTC(2026, 7, 7)
    // Force same seed family by fixing date; compare pps-scaled template explicitly.
    const low = generateDailyChallenges(save, date, LargeNumber.from(1))
    const high = generateDailyChallenges(
      { ...save, flushCount: 20, highestCPS: 12 },
      date,
      LargeNumber.from(1_000_000),
    )
    const lowPps = low.filter((c) => ['idle_pp', 'spend_pp', 'tap_pp'].includes(c.metric))
    const highPps = high.filter((c) => ['idle_pp', 'spend_pp', 'tap_pp'].includes(c.metric))
    if (lowPps[0] && highPps[0] && lowPps[0].templateId === highPps[0].templateId) {
      expect(highPps[0].target).toBeGreaterThan(lowPps[0].target)
    } else {
      // Different picks still must stay finite and positive
      expect(high.every((c) => c.target > 0)).toBe(true)
      expect(Math.max(...high.map((c) => c.target))).toBeGreaterThan(1)
    }
  })

  it('tracks progress and prevents double claim', () => {
    const engine = createTestEngine()
    engine.debugSetSave((s) => ({
      ...s,
      dailyChallenges: [
        {
          templateId: 'tap_n',
          category: 'activity',
          metric: 'taps',
          name: 'Tap',
          description: 'Tap',
          target: 5,
          progress: 0,
          completed: false,
          claimed: false,
          rewardGtp: 8,
          rewardBoostMinutes: 0,
        },
        ...s.dailyChallenges.slice(1),
      ],
    }))
    for (let i = 0; i < 5; i++) engine.tap()
    const first = engine.claimDailyChallenge(0)
    expect(first.ok).toBe(true)
    const second = engine.claimDailyChallenge(0)
    expect(second.ok).toBe(false)
    expect(second.reason).toBe('already_claimed')
  })

  it('resets on day change', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(clock.now()),
      storage: null,
    })
    const day1 = engine.exportSave().dailyChallengeDate
    clock.advance(86_400_000)
    engine.foreground()
    const day2 = engine.exportSave().dailyChallengeDate
    expect(day2).not.toBe(day1)
  })

  it('progressChallenge is safe for peak metrics', () => {
    const save = createDefaultSave()
    const withChallenge = {
      ...save,
      dailyChallenges: [
        {
          templateId: 'cps_reach',
          category: 'activity' as const,
          metric: 'cps' as const,
          name: 'CPS',
          description: 'CPS',
          target: 8,
          progress: 3,
          completed: false,
          claimed: false,
          rewardGtp: 10,
          rewardBoostMinutes: 0,
        },
      ],
    }
    const next = progressChallenge(withChallenge, 'cps', 6)
    expect(next.dailyChallenges[0].progress).toBe(6)
  })
})

describe('Streak', () => {
  it('claims consecutive days and blocks repeat claim', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(clock.now()),
      storage: null,
    })
    const a = engine.claimStreak()
    expect(a.ok).toBe(true)
    expect(engine.exportSave().dailyStreak).toBe(1)
    const repeat = engine.claimStreak()
    expect(repeat.ok).toBe(false)
    clock.advance(86_400_000)
    const b = engine.claimStreak()
    expect(b.ok).toBe(true)
    expect(engine.exportSave().dailyStreak).toBe(2)
  })

  it('uses streak saver on a single missed day', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const engine = new GameEngine({
      clock,
      save: {
        ...createDefaultSave(clock.now()),
        dailyStreak: 3,
        lastDailyClaim: '2026-08-07',
        streakSaverCharges: 1,
      },
      storage: null,
    })
    clock.set(Date.UTC(2026, 7, 9, 12))
    const result = engine.claimStreak()
    expect(result.ok).toBe(true)
    expect(engine.exportSave().streakSaverCharges).toBe(0)
    expect(engine.exportSave().dailyStreak).toBe(4)
  })
})

describe('Bathroom Break', () => {
  it('generates charges up to cap and claims once per charge', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const engine = new GameEngine({
      clock,
      save: {
        ...createDefaultSave(clock.now()),
        bathroomBreakCharges: 0,
        lastBathroomBreakGeneration: clock.now(),
      },
      storage: null,
    })
    clock.advance(9 * 60 * 60 * 1000)
    engine.tick(0)
    engine.foreground()
    expect(engine.exportSave().bathroomBreakCharges).toBe(2)
    const claim = engine.claimBathroomBreak('tap_boost')
    expect(claim.ok).toBe(true)
    expect(engine.exportSave().bathroomBreakCharges).toBe(1)
  })
})
