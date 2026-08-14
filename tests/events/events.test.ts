import { describe, expect, it } from 'vitest'
import { GOLDEN_SHOWER } from '../../src/content/events'
import { createTestEngine } from '../../src/core/GameEngine'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'

describe('Events', () => {
  it('spawns, completes, and rewards Golden Poop', () => {
    const engine = createTestEngine()
    expect(engine.spawnEvent('golden_poop')).toBe(true)
    const result = engine.catchGoldenPoop()
    expect(result.ok).toBe(true)
    expect(engine.exportSave().goldenPoopsCaught).toBe(1)
    expect(engine.exportSave().activeEvent).toBeNull()
  })

  it('completes mega clog on tap target', () => {
    const engine = createTestEngine({ flushCount: 3 })
    expect(engine.spawnEvent('mega_clog')).toBe(true)
    const target = engine.exportSave().activeEvent?.tapTarget ?? 120
    for (let i = 0; i < target; i++) engine.tap()
    expect(engine.exportSave().clogsCompleted).toBe(1)
  })

  it('respects cooldown via active event guard', () => {
    const engine = createTestEngine()
    engine.spawnEvent('golden_poop')
    expect(engine.spawnEvent('golden_rain')).toBe(false)
  })

  it('grants 40x tap value on golden shower catch', () => {
    const engine = createTestEngine({
      flushCount: 0,
      currentPP: LargeNumber.from(0).serialize(),
    })
    expect(engine.spawnEvent('golden_rain')).toBe(true)
    const tapPower = engine.getSnapshot().production.tapPower
    const before = LargeNumber.deserialize(engine.exportSave().currentPP)
    const target = engine.getSnapshot().eventRuntime!.targets[0]
    expect(engine.catchEventTarget(target.id).ok).toBe(true)
    const after = LargeNumber.deserialize(engine.exportSave().currentPP)
    const gained = after.sub(before)
    expect(gained.toNumber()).toBeCloseTo(tapPower.mul(GOLDEN_SHOWER.catchTapMultiplier).toNumber(), 5)
  })
})
