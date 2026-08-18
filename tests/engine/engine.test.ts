import { describe, expect, it, vi } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { MemoryAnalytics } from '../../src/services/analytics'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { FixedClock } from '../../src/core/time/TimeService'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { GameEngine } from '../../src/core/GameEngine'
import { DAILY_DUMP } from '../../src/core/systems/dailyDump'

function purchasedItemCount(save: ReturnType<GameEngine['exportSave']>): number {
  const generators = Object.values(save.generators).reduce((sum, level) => sum + level, 0)
  const upgrades = Object.values(save.purchasedRunUpgrades).reduce((sum, level) => sum + level, 0)
  return generators + upgrades
}

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
      lastEventActivityAt: now - 60_000,
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

  it('completes golden shower after duration with at least one catch', () => {
    const now = 3_000_000
    const clock = new FixedClock(now)
    const engine = new GameEngine({
      clock,
      save: { ...createDefaultSave(now), flushCount: 0 },
      storage: null,
    })
    expect(engine.spawnEvent('golden_rain')).toBe(true)
    const target = engine.getSnapshot().eventRuntime!.targets[0]
    expect(engine.catchEventTarget(target.id).ok).toBe(true)

    const endsAt = engine.getSnapshot().eventRuntime!.endsAt
    const beforeGtp = engine.exportSave().gtp
    clock.set(endsAt + 1)
    engine.tick(16)

    expect(engine.getSnapshot().eventRuntime).toBeNull()
    expect(engine.exportSave().gtp).toBeGreaterThan(beforeGtp)
    expect(engine.exportSave().eventsCompleted).toBe(1)
    const eventsMission = engine
      .getSnapshot()
      .sessionMissions.missions.find((m) => m.id === 'events_1')
    expect(eventsMission?.progress).toBeGreaterThanOrEqual(1)
  })

  it('forces golden via pity after long event inactivity', () => {
    const now = 5_000_000
    const clock = new FixedClock(now)
    const engine = new GameEngine({
      clock,
      save: {
        ...createDefaultSave(now),
        flushCount: 2,
        lastEventActivityAt: now - 11 * 60_000,
        nextGoldenPoopAt: now + 999_999,
        nextRandomEventAt: now + 999_999,
      },
      storage: null,
    })
    engine.tick(16)
    expect(engine.getSnapshot().eventRuntime?.type).toBe('golden_poop')
  })

  it('buys Auto-Buy for Mega-pack GTP and rejects a second purchase', () => {
    const engine = createTestEngine({ gtp: 2000 })
    expect(engine.buyAutoBuy().ok).toBe(true)
    expect(engine.exportSave().autoBuyUnlocked).toBe(true)
    expect(engine.exportSave().autoBuyEnabled).toBe(true)
    expect(engine.exportSave().gtp).toBe(0)
    expect(engine.buyAutoBuy()).toEqual({ ok: false, reason: 'owned' })
  })

  it('buys Auto-Buy speed via Royal Flush GTP and refuses past max', () => {
    const engine = createTestEngine({
      autoBuyUnlocked: true,
      flushCount: 1,
      flushPower: 20,
      gtp: 20,
    })
    expect(engine.buyAutoBuySpeed().ok).toBe(true)
    expect(engine.exportSave().autoBuySpeedLevel).toBe(1)
    expect(engine.exportSave().royalFlushLevels.rf_autobuy_speed).toBe(1)
    expect(engine.buyAutoBuySpeed()).toEqual({ ok: false, reason: 'insufficient_gtp' })

    const maxed = createTestEngine({
      autoBuyUnlocked: true,
      autoBuySpeedLevel: 10,
      royalFlushLevels: { rf_autobuy_speed: 10 },
      flushCount: 1,
      flushPower: 20,
      gtp: 9_999,
    })
    expect(maxed.buyAutoBuySpeed()).toEqual({ ok: false, reason: 'maxed' })
    expect(createTestEngine().buyAutoBuySpeed()).toEqual({ ok: false, reason: 'locked' })
  })

  it('auto-buys only one item every 15 seconds', () => {
    const now = 1_000_000
    const clock = new FixedClock(now)
    const engine = new GameEngine({
      clock,
      save: {
        ...createDefaultSave(now),
        autoBuyUnlocked: true,
        autoBuyEnabled: true,
        currentPP: LargeNumber.from(10_000).serialize(),
      },
      storage: null,
    })

    engine.tick(100)
    expect(purchasedItemCount(engine.exportSave())).toBe(1)

    clock.advance(14_000)
    engine.tick(100)
    expect(purchasedItemCount(engine.exportSave())).toBe(1)

    clock.advance(1_000)
    engine.tick(100)
    expect(purchasedItemCount(engine.exportSave())).toBe(2)
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

  it('persists rewarded ad cooldowns across serialize/deserialize', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const clock = new FixedClock(now)
    const memory = new Map<string, string>()
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    } as Storage

    const engine = new GameEngine({
      clock,
      save: createDefaultSave(now),
      storage,
    })
    expect(engine.canApplyRewarded('income_boost').ok).toBe(true)
    expect(engine.applyRewardedIncomeBoost().ok).toBe(true)
    expect(engine.canApplyRewarded('income_boost').ok).toBe(false)
    expect(engine.getRewardedCooldownRemaining('income_boost')).toBeGreaterThan(0)
    expect(engine.applyRewardedEventRetry().ok).toBe(true)
    expect(engine.exportSave().rewardedCooldowns.eventRetryAt).toBe(now)

    const restarted = GameEngine.fromStorage({ storage, clock })
    expect(restarted.canApplyRewarded('income_boost').ok).toBe(false)
    expect(restarted.canApplyRewarded('event_retry').ok).toBe(false)
    expect(restarted.exportSave().rewardedCooldowns.incomeBoostAt).toBe(now)
    expect(restarted.getRewardedCooldownRemaining('income_boost')).toBe(600_000)

    clock.advance(600_000)
    expect(restarted.canApplyRewarded('income_boost').ok).toBe(true)
    expect(restarted.getRewardedCooldownRemaining('income_boost')).toBe(0)
  })
})
