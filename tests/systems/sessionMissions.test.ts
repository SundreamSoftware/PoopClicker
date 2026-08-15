import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { deserializeSave } from '../../src/core/save/migrateSave'
import { FixedClock } from '../../src/core/time/TimeService'
import {
  SESSION_MISSION_DAILY_GTP_CAP,
  claimSessionMission,
  createSessionMissions,
  ensureSessionMissions,
  ensureSessionMissionsForDay,
  progressSessionMission,
  restoreSessionMissions,
  serializeSessionMissions,
} from '../../src/core/systems/sessionMissions'

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

describe('sessionMissions', () => {
  it('resets progress and claimed flags on UTC day rollover', () => {
    let state = createSessionMissions('2026-08-08')
    state = progressSessionMission(state, 'taps_50', 50)
    const claimed = claimSessionMission(state, 'taps_50')
    expect(claimed.ok).toBe(true)
    state = claimed.state

    const rolledBack = ensureSessionMissionsForDay(state, '2026-08-07')
    expect(rolledBack.dateKey).toBe('2026-08-08')
    expect(rolledBack.dailyClaimedGtp).toBe(state.dailyClaimedGtp)

    const nextDay = ensureSessionMissionsForDay(state, '2026-08-09')
    expect(nextDay.dateKey).toBe('2026-08-09')
    expect(nextDay.dailyClaimedGtp).toBe(0)
    const taps = nextDay.missions.find((m) => m.id === 'taps_50')
    expect(taps?.progress).toBe(0)
    expect(taps?.claimed).toBe(false)
  })

  it('same-day restore keeps claimed and progress', () => {
    let state = createSessionMissions('2026-08-08', 1, 0)
    state = progressSessionMission(state, 'taps_50', 50)
    state = claimSessionMission(state, 'taps_50').state
    state = progressSessionMission(state, 'crits_3', 2)

    const saved = serializeSessionMissions(state)
    const restored = restoreSessionMissions(saved)
    const ensured = ensureSessionMissions(restored, '2026-08-08', 1)

    expect(ensured.dateKey).toBe('2026-08-08')
    expect(ensured.missions.find((m) => m.id === 'taps_50')?.claimed).toBe(true)
    expect(ensured.missions.find((m) => m.id === 'crits_3')?.progress).toBe(2)
    expect(ensured.missions.find((m) => m.id === 'events_1')?.progress).toBe(0)
  })

  it('new session same day resets missions but keeps the daily GTP cap', () => {
    let state = createSessionMissions('2026-08-08', 1, 0)
    state = progressSessionMission(state, 'taps_50', 50)
    state = claimSessionMission(state, 'taps_50').state
    expect(state.dailyClaimedGtp).toBe(2)

    const nextSession = ensureSessionMissions(state, '2026-08-08', 2)
    expect(nextSession.sessionId).toBe(2)
    expect(nextSession.dailyClaimedGtp).toBe(2)
    expect(nextSession.missions.find((m) => m.id === 'taps_50')?.claimed).toBe(false)
    expect(nextSession.missions.find((m) => m.id === 'taps_50')?.progress).toBe(0)
  })

  it('stops granting GTP after the daily cap', () => {
    let state = createSessionMissions('2026-08-08', 1, SESSION_MISSION_DAILY_GTP_CAP)
    state = progressSessionMission(state, 'taps_50', 50)
    const result = claimSessionMission(state, 'taps_50')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('daily_cap')
    expect(result.reward).toBe(0)
  })

  it('engine relaunch same day refreshes missions but cannot exceed the daily GTP cap', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const clock = new FixedClock(now)
    const storage = new MapStorage()
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(now),
      storage,
    })

    for (let i = 0; i < 50; i++) engine.tap()
    const before = engine.exportSave().gtp
    expect(engine.claimSessionMission('taps_50').ok).toBe(true)
    expect(engine.exportSave().gtp).toBe(before + 2)
    engine.persistImmediate()

    const restarted = new GameEngine({
      clock,
      save: deserializeSave(storage.getItem('poop_clicker_save_v2')!, clock.now()),
      storage,
    })
    const taps = restarted.getSnapshot().sessionMissions.missions.find((m) => m.id === 'taps_50')
    expect(taps?.claimed).toBe(false)
    expect(taps?.progress).toBe(0)
    expect(restarted.getSnapshot().sessionMissions.dailyClaimedGtp).toBe(2)

    for (let i = 0; i < 50; i++) restarted.tap()
    expect(restarted.claimSessionMission('taps_50').ok).toBe(true)
    expect(restarted.getSnapshot().sessionMissions.dailyClaimedGtp).toBe(4)
  })

  it('engine day rollover resets missions and the daily GTP cap after relaunch', () => {
    const day1 = Date.UTC(2026, 7, 8, 12)
    const clock = new FixedClock(day1)
    const storage = new MapStorage()
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(day1),
      storage,
    })
    for (let i = 0; i < 50; i++) engine.tap()
    expect(engine.claimSessionMission('taps_50').ok).toBe(true)
    engine.persistImmediate()

    const day2 = Date.UTC(2026, 7, 9, 12)
    clock.set(day2)
    const nextDay = new GameEngine({
      clock,
      save: deserializeSave(storage.getItem('poop_clicker_save_v2')!, clock.now()),
      storage,
    })
    const taps = nextDay.getSnapshot().sessionMissions.missions.find((m) => m.id === 'taps_50')
    expect(nextDay.exportSave().sessionMissions.dateKey).toBe('2026-08-09')
    expect(nextDay.getSnapshot().sessionMissions.dailyClaimedGtp).toBe(0)
    expect(taps?.claimed).toBe(false)
    expect(taps?.progress).toBe(0)
  })
})
