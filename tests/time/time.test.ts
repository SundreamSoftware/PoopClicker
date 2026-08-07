import { describe, expect, it } from 'vitest'
import {
  clampFutureTimestamp,
  daysBetweenUtc,
  FixedClock,
  isNewUtcDay,
  safeElapsed,
  toUtcDateKey,
} from '../../src/core/time/TimeService'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'

describe('Time service', () => {
  it('handles day rollover', () => {
    const a = Date.UTC(2026, 7, 7, 23, 30)
    const b = Date.UTC(2026, 7, 8, 0, 30)
    expect(isNewUtcDay(toUtcDateKey(a), b)).toBe(true)
    expect(daysBetweenUtc(toUtcDateKey(a), b)).toBe(1)
  })

  it('clamps future timestamps and clock rollback elapsed', () => {
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
