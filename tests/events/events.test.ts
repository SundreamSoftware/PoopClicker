import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'

describe('Events', () => {
  it('spawns, completes, and rewards Golden Poop', () => {
    const engine = createTestEngine()
    expect(engine.spawnEvent('golden_poop')).toBe(true)
    const result = engine.catchGoldenPoop()
    expect(result.ok).toBe(true)
    expect(engine.exportSave().goldenPoopsCaught).toBe(1)
    expect(engine.exportSave().activeEvent).toBeNull()
  })

  it('completes clog on tap target and fails on timeout', () => {
    const engine = createTestEngine()
    expect(engine.spawnEvent('clogged_toilet')).toBe(true)
    const target = engine.exportSave().activeEvent?.tapTarget ?? 40
    for (let i = 0; i < target; i++) engine.tap()
    expect(engine.exportSave().clogsCompleted).toBe(1)
  })

  it('respects cooldown via active event guard', () => {
    const engine = createTestEngine()
    engine.spawnEvent('burrito_rush')
    expect(engine.spawnEvent('toilet_quake')).toBe(false)
  })
})
