import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  clampFutureTimestamp,
  daysBetweenUtc,
  FixedClock,
  isNewUtcDay,
  safeElapsed,
  toUtcDateKey,
} from '../../src/core/time/TimeService'
import { canStartDailyDump } from '../../src/core/systems/dailyDump'
import { processStreak } from '../../src/core/systems/daily'
import { ECONOMY } from '../../src/core/economy/formulas'

describe('Time service', () => {
  it('handles UTC day rollover', () => {
    const a = Date.UTC(2026, 7, 7, 23, 30)
    const b = Date.UTC(2026, 7, 8, 0, 30)
    expect(isNewUtcDay(toUtcDateKey(a), b)).toBe(true)
    expect(daysBetweenUtc(toUtcDateKey(a), b)).toBe(1)
  })

  it('clamps future timestamps and treats clock rollback as zero elapsed', () => {
    const now = Date.UTC(2026, 7, 7, 12)
    expect(clampFutureTimestamp(now + 3_600_000, now)).toBe(now)
    expect(safeElapsed(now + 10_000, now, 1000)).toBe(0)
  })

  it('handles long absence for offline reward', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const engine = new GameEngine({
      clock,
      save: {
        ...createDefaultSave(clock.now()),
        generators: { plunger_intern: 50 },
        lastActiveTimestamp: clock.now(),
      },
      storage: null,
    })
    clock.advance(5 * 60 * 60 * 1000)
    engine.foreground()
    const snap = engine.getSnapshot()
    expect(snap.offlineReward).toBeTruthy()
  })
})

describe('Daily streak UTC rollover', () => {
  it('allows claim on next UTC day only once per day', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(clock.now()),
      storage: null,
    })
    expect(engine.claimStreak().ok).toBe(true)
    expect(engine.claimStreak().ok).toBe(false)
    clock.advance(2 * 60 * 60 * 1000)
    expect(engine.claimStreak().ok).toBe(false)
    clock.set(Date.UTC(2026, 7, 8, 12))
    expect(engine.claimStreak().ok).toBe(true)
    expect(engine.exportSave().dailyStreak).toBe(2)
  })

  it('resets streak after multi-day gap without saver', () => {
    const now = Date.UTC(2026, 7, 10, 12)
    const save = {
      ...createDefaultSave(now),
      dailyStreak: 4,
      lastDailyClaim: '2026-08-07',
      streakSaverCharges: 0,
    }
    const result = processStreak(save, now)
    expect(result.streakBroken).toBe(true)
    expect(result.save.dailyStreak).toBe(1)
  })
})

describe('Bathroom break timing', () => {
  it('generates charges on UTC elapsed intervals up to cap', () => {
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
    clock.advance(ECONOMY.bathroomBreakIntervalMs * 2 + 1000)
    engine.tick(0)
    engine.foreground()
    expect(engine.exportSave().bathroomBreakCharges).toBe(2)
    const claim = engine.claimBathroomBreak('tap_boost')
    expect(claim.ok).toBe(true)
    expect(engine.exportSave().bathroomBreakCharges).toBe(1)
    expect(engine.claimBathroomBreak('tap_boost').ok).toBe(true)
    expect(engine.exportSave().bathroomBreakCharges).toBe(0)
  })
})

describe('Daily dump once per UTC day', () => {
  it('blocks restart until next UTC day', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 8, 12))
    const save = createDefaultSave(clock.now())
    expect(canStartDailyDump(save, clock.now())).toBe(true)
    const played = {
      ...save,
      dailyDumpState: { ...save.dailyDumpState, lastPlayedDate: '2026-08-08' },
    }
    expect(canStartDailyDump(played, clock.now())).toBe(false)
    clock.set(Date.UTC(2026, 7, 9, 0, 1))
    expect(canStartDailyDump(played, clock.now())).toBe(true)
  })

  it('engine enforces one start per day', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 8, 12))
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(clock.now()),
      storage: null,
    })
    expect(engine.startDailyDump().ok).toBe(true)
    expect(engine.startDailyDump().reason).toBe('already_played')
    clock.advance(86_400_000)
    expect(engine.startDailyDump().ok).toBe(true)
  })
})

describe('Clock rollback safety', () => {
  it('does not inflate offline or streak when clock moves backward', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const engine = new GameEngine({
      clock,
      save: {
        ...createDefaultSave(clock.now()),
        lastActiveTimestamp: clock.now(),
        dailyStreak: 2,
        lastDailyClaim: '2026-08-06',
      },
      storage: null,
    })
    clock.set(Date.UTC(2026, 7, 6, 12))
    engine.foreground()
    expect(engine.getSnapshot().offlineReward).toBeNull()
    const streak = engine.claimStreak()
    expect(streak.ok).toBe(false)
  })
})
