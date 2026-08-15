import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { deserializeSave } from '../../src/core/save/migrateSave'
import { FixedClock } from '../../src/core/time/TimeService'
import {
  canStartDailyDump,
  createIdleDailyDumpRuntime,
  DAILY_DUMP,
  gtpForTier,
  nextDumpTierProgress,
  restoreDailyDumpRuntime,
  serializeDailyDumpRuntime,
  startDailyDumpRuntime,
  tapDailyDump,
  tickDailyDump,
  tierFromScore,
} from '../../src/core/systems/dailyDump'

describe('dailyDump', () => {
  it('creates idle runtime', () => {
    const runtime = createIdleDailyDumpRuntime()
    expect(runtime.phase).toBe('idle')
    expect(runtime.score).toBe(0)
  })

  it('runs countdown then 60s challenge', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    let runtime = startDailyDumpRuntime(now)
    expect(runtime.phase).toBe('countdown')
    runtime = tickDailyDump(runtime, now + DAILY_DUMP.countdownMs)
    expect(runtime.phase).toBe('running')
    expect(runtime.endsAt - (now + DAILY_DUMP.countdownMs)).toBe(DAILY_DUMP.durationMs)
  })

  it('scores normalized taps with combo bonus', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    let runtime = startDailyDumpRuntime(now)
    runtime = tickDailyDump(runtime, now + DAILY_DUMP.countdownMs)
    runtime = tapDailyDump(runtime, now + DAILY_DUMP.countdownMs + 100)
    expect(runtime.score).toBeGreaterThan(0)
    expect(runtime.taps).toBe(1)
  })

  it('maps tiers and gtp rewards', () => {
    expect(tierFromScore(59)).toBe('none')
    expect(tierFromScore(60)).toBe('bronze')
    expect(tierFromScore(240)).toBe('diamond')
    expect(gtpForTier('gold')).toBe(25)
    expect(nextDumpTierProgress(0)).toEqual({ current: 'none', next: 'bronze', remaining: 60 })
    expect(nextDumpTierProgress(60).current).toBe('bronze')
    expect(nextDumpTierProgress(240)).toEqual({ current: 'diamond', next: null, remaining: 0 })
  })

  it('allows one attempt per UTC day unless resumable runtime exists', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const save = createDefaultSave(now)
    expect(canStartDailyDump(save, now)).toBe(true)
    const blocked = {
      ...save,
      dailyDumpState: { ...save.dailyDumpState, lastPlayedDate: '2026-08-08', activeRuntime: null },
    }
    expect(canStartDailyDump(blocked, now)).toBe(false)

    const rolledBack = Date.UTC(2026, 7, 7, 12)
    expect(canStartDailyDump(blocked, rolledBack)).toBe(false)

    const runtime = startDailyDumpRuntime(now)
    const resumable = {
      ...save,
      dailyDumpState: {
        ...save.dailyDumpState,
        lastPlayedDate: null,
        activeRuntime: serializeDailyDumpRuntime(runtime),
      },
    }
    expect(canStartDailyDump(resumable, now)).toBe(true)

    const finishedToday = {
      ...save,
      dailyDumpState: {
        ...save.dailyDumpState,
        lastPlayedDate: '2026-08-08',
        activeRuntime: serializeDailyDumpRuntime({
          ...runtime,
          phase: 'finished',
          rewardTier: 'bronze',
          gtpReward: 8,
        }),
      },
    }
    expect(canStartDailyDump(finishedToday, now)).toBe(true)
  })

  it('serializes without tapTimestamps and restores empty taps', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    let runtime = startDailyDumpRuntime(now)
    runtime = tickDailyDump(runtime, now + DAILY_DUMP.countdownMs)
    runtime = tapDailyDump(runtime, now + DAILY_DUMP.countdownMs + 50)
    const saved = serializeDailyDumpRuntime(runtime)
    expect(saved).not.toBeNull()
    expect(saved).not.toHaveProperty('tapTimestamps')
    const restored = restoreDailyDumpRuntime(saved)
    expect(restored.phase).toBe('running')
    expect(restored.score).toBe(runtime.score)
    expect(restored.tapTimestamps).toEqual([])
  })

  it('finishes with tier reward after duration', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    let runtime = startDailyDumpRuntime(now)
    runtime = tickDailyDump(runtime, now + DAILY_DUMP.countdownMs)
    for (let i = 0; i < 200; i++) {
      runtime = tapDailyDump(runtime, now + DAILY_DUMP.countdownMs + i * 250)
    }
    runtime = tickDailyDump(runtime, runtime.endsAt + 1)
    expect(runtime.phase).toBe('finished')
    expect(runtime.gtpReward).toBeGreaterThan(0)
  })

  it('start stamps the day immediately; kill/resume via serialize', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const clock = new FixedClock(now)
    const storage = new MapStorage()
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(now),
      storage,
    })

    expect(engine.startDailyDump().ok).toBe(true)
    expect(engine.exportSave().dailyDumpState.lastPlayedDate).toBe('2026-08-08')
    expect(engine.exportSave().dailyDumpState.activeRuntime?.phase).toBe('countdown')

    const midJson = storage.getItem('poop_clicker_save_v2')
    expect(midJson).toBeTruthy()

    const resumed = new GameEngine({
      clock,
      save: deserializeSave(midJson!, clock.now()),
      storage,
    })
    expect(resumed.getSnapshot().dailyDump.phase).toBe('countdown')
    expect(resumed.startDailyDump().ok).toBe(true)
    expect(resumed.exportSave().dailyDumpState.lastPlayedDate).toBe('2026-08-08')

    clock.advance(DAILY_DUMP.countdownMs + DAILY_DUMP.durationMs + 50)
    resumed.tick(DAILY_DUMP.countdownMs + DAILY_DUMP.durationMs + 50)
    expect(resumed.getSnapshot().dailyDump.phase).toBe('finished')
    expect(resumed.exportSave().dailyDumpState.lastPlayedDate).toBe('2026-08-08')
    expect(resumed.exportSave().dailyDumpState.activeRuntime?.phase).toBe('finished')

    expect(resumed.claimDailyDumpReward().ok).toBe(true)
    expect(resumed.exportSave().dailyDumpState.activeRuntime).toBeNull()
    expect(resumed.exportSave().dailyDumpState.lastPlayedDate).toBe('2026-08-08')
    expect(resumed.exportSave().dailyDumpState.rewardClaimed).toBe(true)
    expect(resumed.startDailyDump().ok).toBe(false)
    expect(resumed.startDailyDump().reason).toBe('already_played')
  })

  it('abandon burns the day without granting GTP and keeps bestScore', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const clock = new FixedClock(now)
    const save = {
      ...createDefaultSave(now),
      gtp: 10,
      dailyDumpState: {
        ...createDefaultSave(now).dailyDumpState,
        bestScore: 99,
      },
    }
    const engine = new GameEngine({ clock, save, storage: null })

    expect(engine.startDailyDump().ok).toBe(true)
    engine.abandonDailyDump()

    const after = engine.exportSave()
    expect(after.gtp).toBe(10)
    expect(after.dailyDumpState.lastPlayedDate).toBe('2026-08-08')
    expect(after.dailyDumpState.rewardClaimed).toBe(true)
    expect(after.dailyDumpState.activeRuntime).toBeNull()
    expect(after.dailyDumpState.bestScore).toBe(99)
    expect(engine.getSnapshot().dailyDump.phase).toBe('idle')
    expect(engine.startDailyDump().ok).toBe(false)
    expect(canStartDailyDump(after, now)).toBe(false)
  })
})

class MapStorage implements Storage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear(): void {
    this.data.clear()
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}
