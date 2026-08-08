import { describe, expect, it } from 'vitest'
import { ECONOMY } from '../../src/core/economy/formulas'
import { createTestEngine, GameEngine } from '../../src/core/GameEngine'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { FixedClock } from '../../src/core/time/TimeService'
import { MemoryAnalytics } from '../../src/services/analytics'
import { DAILY_DUMP } from '../../src/core/systems/dailyDump'

/**
 * Lightweight end-to-end journey through the pure engine (no browser).
 * Covers: launch → tap → earn → buy generator/upgrade → daily → skin → flush → restore.
 */
describe('e2e core journey', () => {
  it('plays a full early-game loop and restores after persist', () => {
    const now = Date.UTC(2026, 7, 8, 12, 0, 0)
    const clock = new FixedClock(now)
    const analytics = new MemoryAnalytics()
    const storage = new MapStorage()
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(now),
      analytics,
      storage,
    })

    for (let i = 0; i < 40; i++) engine.tap()
    expect(engine.getSnapshot().save.tapCount).toBe(40)
    expect(analytics.events.some((e) => e.event === 'first_tap')).toBe(true)

    engine.debugGrantPP(5_000)
    expect(engine.buyGenerator('plunger_intern', 1).ok).toBe(true)
    expect(analytics.events.some((e) => e.event === 'first_generator')).toBe(true)

    engine.debugGrantPP(2_000)
    expect(engine.buyUpgrade('more_fiber').ok).toBe(true)
    expect(analytics.events.some((e) => e.event === 'first_upgrade')).toBe(true)

    expect(engine.getSnapshot().save.dailyChallenges.length).toBe(3)

    engine.debugSetSave((s) => ({ ...s, gtp: s.gtp + 200 }))
    const skinBuy = engine.buySkin('corny_poop')
    if (skinBuy.ok) {
      expect(engine.equipSkinId('corny_poop').ok).toBe(true)
      expect(engine.getSnapshot().save.equippedSkinId).toBe('corny_poop')
    }

    const completed = Object.entries(engine.getSnapshot().save.achievements).find(
      ([, a]) => a.completed && !a.claimed,
    )
    if (completed) {
      expect(engine.claimAchievementReward(completed[0]).ok).toBe(true)
    }

    engine.debugGrantPP(ECONOMY.firstFlushRequirement)
    const beforeFlush = engine.getSnapshot().save.flushCount
    expect(engine.flush().ok).toBe(true)
    expect(engine.getSnapshot().save.flushCount).toBe(beforeFlush + 1)
    expect(analytics.events.some((e) => e.event === 'first_flush')).toBe(true)
    expect(
      LargeNumber.deserialize(engine.getSnapshot().save.runPPEarned).toNumber(),
    ).toBeGreaterThanOrEqual(0)

    engine.persistImmediate()

    const restored = GameEngine.fromStorage({ storage, clock, analytics })
    const save = restored.exportSave()
    expect(save.flushCount).toBe(beforeFlush + 1)
    expect(save.tapCount).toBeGreaterThanOrEqual(40)
  })

  it('daily dump is one real attempt per day with claim idempotency', () => {
    const now = Date.UTC(2026, 7, 8, 15, 0, 0)
    const clock = new FixedClock(now)
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(now),
      storage: null,
    })

    expect(engine.startDailyDump().ok).toBe(true)
    clock.advance(DAILY_DUMP.countdownMs + 10)
    engine.tick(DAILY_DUMP.countdownMs)

    for (let i = 0; i < 80; i++) {
      clock.advance(20)
      engine.tapDailyDumpChallenge()
    }

    clock.advance(DAILY_DUMP.durationMs)
    engine.tick(100)
    expect(engine.getSnapshot().dailyDump.phase).toBe('finished')
    expect(engine.claimDailyDumpReward().ok).toBe(true)
    expect(engine.startDailyDump().ok).toBe(false)
    expect(engine.claimDailyDumpReward().ok).toBe(false)
  })

  it('createTestEngine smoke remains usable', () => {
    const engine = createTestEngine()
    engine.tap()
    expect(engine.getSnapshot().save.tapCount).toBe(1)
  })
})

class MapStorage implements Storage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}
