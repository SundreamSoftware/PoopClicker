import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { deserializeSave } from '../../src/core/save/migrateSave'
import { FixedClock } from '../../src/core/time/TimeService'
import {
  claimSessionMission,
  createSessionMissions,
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

    const nextDay = ensureSessionMissionsForDay(state, '2026-08-09')
    expect(nextDay.dateKey).toBe('2026-08-09')
    const taps = nextDay.missions.find((m) => m.id === 'taps_50')
    expect(taps?.progress).toBe(0)
    expect(taps?.claimed).toBe(false)
  })

  it('same-day restore keeps claimed and progress', () => {
    let state = createSessionMissions('2026-08-08')
    state = progressSessionMission(state, 'taps_50', 50)
    state = claimSessionMission(state, 'taps_50').state
    state = progressSessionMission(state, 'crits_3', 2)

    const saved = serializeSessionMissions(state)
    const restored = restoreSessionMissions(saved)
    const ensured = ensureSessionMissionsForDay(restored, '2026-08-08')

    expect(ensured.dateKey).toBe('2026-08-08')
    expect(ensured.missions.find((m) => m.id === 'taps_50')?.claimed).toBe(true)
    expect(ensured.missions.find((m) => m.id === 'crits_3')?.progress).toBe(2)
    expect(ensured.missions.find((m) => m.id === 'events_1')?.progress).toBe(0)
  })

  it('engine relaunch same day cannot re-farm claimed mission GTP', () => {
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
    expect(
      engine.exportSave().sessionMissions.missions.find((m) => m.id === 'taps_50')?.claimed,
    ).toBe(true)

    const restarted = new GameEngine({
      clock,
      save: deserializeSave(storage.getItem('poop_clicker_save_v2')!, clock.now()),
      storage,
    })
    expect(
      restarted.getSnapshot().sessionMissions.missions.find((m) => m.id === 'taps_50')?.claimed,
    ).toBe(true)
    const gtpAfterReload = restarted.exportSave().gtp
    expect(restarted.claimSessionMission('taps_50').ok).toBe(false)
    expect(restarted.exportSave().gtp).toBe(gtpAfterReload)
  })

  it('engine day rollover resets missions after relaunch', () => {
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
    expect(taps?.claimed).toBe(false)
    expect(taps?.progress).toBe(0)
  })
})
