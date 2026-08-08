import { describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  canStartDailyDump,
  createIdleDailyDumpRuntime,
  DAILY_DUMP,
  gtpForTier,
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
    expect(tierFromScore(24)).toBe('none')
    expect(tierFromScore(25)).toBe('bronze')
    expect(tierFromScore(120)).toBe('diamond')
    expect(gtpForTier('gold')).toBe(25)
  })

  it('allows one attempt per UTC day', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const save = createDefaultSave(now)
    expect(canStartDailyDump(save, now)).toBe(true)
    const blocked = {
      ...save,
      dailyDumpState: { ...save.dailyDumpState, lastPlayedDate: '2026-08-08' },
    }
    expect(canStartDailyDump(blocked, now)).toBe(false)
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
})
