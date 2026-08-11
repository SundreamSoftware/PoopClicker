import { describe, expect, it } from 'vitest'
import { createTestEngine, GameEngine } from '../../src/core/GameEngine'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { resolveTapSpeedState } from '../../src/core/systems/production'
import { FixedClock } from '../../src/core/time/TimeService'

describe('Rapid tapping', () => {
  it('counts every tap into PP/combo without loss', () => {
    const engine = createTestEngine()
    let total = LargeNumber.zero()
    for (let i = 0; i < 500; i++) {
      const result = engine.tap()
      total = total.add(result.gained)
    }
    const save = engine.exportSave()
    expect(save.tapCount).toBe(500)
    expect(save.sessionTapCount).toBe(500)
    expect(LargeNumber.deserialize(save.currentPP).gt(0)).toBe(true)
    expect(LargeNumber.deserialize(save.runPPEarned).gte(total.mul(0.99))).toBe(true)
  })

  it('state transitions use hysteresis aligned to expression CPS bands', () => {
    let state = resolveTapSpeedState(0, 'idle', 10)
    state = resolveTapSpeedState(7, state, 10)
    expect(state).toBe('fast') // 6–9 → lv3
    state = resolveTapSpeedState(5.5, state, 10)
    expect(state).toBe('fast')
    state = resolveTapSpeedState(4.5, state, 10)
    expect(['active', 'fast']).toContain(state)

    state = resolveTapSpeedState(11, 'fast', 10)
    expect(state).toBe('frenzy') // 10–16 → lv4/lv5
    state = resolveTapSpeedState(17, state, 10)
    expect(state).toBe('overdrive') // 16+ → lv6
  })

  it('returns to idle face/state after 3s without taps', () => {
    const now = 1_000_000
    const clock = new FixedClock(now)
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(now),
      storage: null,
    })

    for (let i = 0; i < 12; i++) engine.tap()
    expect(['active', 'fast', 'frenzy', 'overdrive', 'slow']).toContain(
      engine.getSnapshot().tapState,
    )

    clock.advance(3_100)
    engine.tick(16)
    expect(engine.getSnapshot().tapState).toBe('idle')
    expect(engine.getSnapshot().rollingCps).toBe(0)
  })
})
