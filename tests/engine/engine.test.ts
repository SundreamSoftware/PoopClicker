import { describe, expect, it, vi } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { MemoryAnalytics } from '../../src/services/analytics'
import { FixedClock } from '../../src/core/time/TimeService'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { GameEngine } from '../../src/core/GameEngine'
import { DAILY_DUMP } from '../../src/core/systems/dailyDump'

describe('GameEngine integration', () => {
  it('does not spam random events per tick (scheduler uses timestamps only)', () => {
    const analytics = new MemoryAnalytics()
    const now = 1_000_000
    const clock = new FixedClock(now)
    const save = {
      ...createDefaultSave(now),
      flushCount: 5,
      nextGoldenPoopAt: now + 999_999,
      nextRandomEventAt: now + 999_999,
    }
    const engine = new GameEngine({ clock, save, analytics, storage: null })
    const randomSpy = vi.spyOn(Math, 'random')

    for (let i = 0; i < 200; i++) {
      clock.advance(16)
      engine.tick(16)
    }

    expect(engine.exportSave().activeEvent).toBeNull()
    expect(randomSpy).not.toHaveBeenCalled()
    randomSpy.mockRestore()
  })

  it('spawns golden poop when nextGoldenPoopAt is due', () => {
    const now = 2_000_000
    const clock = new FixedClock(now)
    const save = {
      ...createDefaultSave(now),
      nextGoldenPoopAt: now - 1,
      nextRandomEventAt: now + 999_999,
    }
    const engine = new GameEngine({ clock, save, storage: null })
    engine.tick(16)
    expect(engine.getSnapshot().eventRuntime?.type).toBe('golden_poop')
  })

  it('claims daily dump reward only once', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const clock = new FixedClock(now)
    const engine = new GameEngine({ clock, save: createDefaultSave(now), storage: null })
    expect(engine.startDailyDump().ok).toBe(true)

    const snap = engine.getSnapshot()
    expect(snap.dailyDump.phase).toBe('countdown')

    const afterCountdown = DAILY_DUMP.countdownMs + 1
    clock.advance(afterCountdown)
    engine.tick(afterCountdown)
    expect(engine.getSnapshot().dailyDump.phase).toBe('running')

    clock.advance(DAILY_DUMP.durationMs + 100)
    engine.tick(DAILY_DUMP.durationMs + 100)
    expect(engine.getSnapshot().dailyDump.phase).toBe('finished')

    const first = engine.claimDailyDumpReward()
    expect(first.ok).toBe(true)
    expect(first.gtp).toBeGreaterThanOrEqual(0)

    const second = engine.claimDailyDumpReward()
    expect(second.ok).toBe(false)
    expect(engine.exportSave().dailyDumpState.rewardClaimed).toBe(true)
  })

  it('completes mystery flush after player choice', () => {
    const now = 3_000_000
    const clock = new FixedClock(now)
    const engine = new GameEngine({
      clock,
      save: { ...createDefaultSave(now), flushCount: 5 },
      storage: null,
    })
    engine.spawnEvent('mystery_flush')
    const endsAt = engine.getSnapshot().eventRuntime!.endsAt
    clock.set(endsAt + 1)
    engine.tick(16)

    const runtime = engine.getSnapshot().eventRuntime
    expect(runtime?.awaitingChoice || runtime?.type === 'mystery_flush').toBeTruthy()

    const beforeGtp = engine.exportSave().gtp
    const result = engine.chooseMysteryReward(1)
    expect(result.ok).toBe(true)
    expect(engine.exportSave().gtp).toBeGreaterThan(beforeGtp)
    expect(engine.getSnapshot().eventRuntime).toBeNull()
    expect(engine.exportSave().eventsCompleted).toBe(1)
  })

  it('applyIapGrant is idempotent for non-consumables', () => {
    const engine = createTestEngine()
    expect(engine.applyIapGrant('remove_ads').ok).toBe(true)
    expect(engine.exportSave().removeAds).toBe(true)
    expect(engine.applyIapGrant('remove_ads').ok).toBe(false)
  })

  it('increments sessionsCount on bootstrap', () => {
    const now = Date.now()
    const engine = new GameEngine({
      save: createDefaultSave(now),
      storage: null,
    })
    expect(engine.exportSave().sessionsCount).toBe(1)
  })
})
