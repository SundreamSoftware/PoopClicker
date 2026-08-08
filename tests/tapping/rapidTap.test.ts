import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { resolveTapSpeedState } from '../../src/core/systems/production'

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

  it('state transitions use hysteresis', () => {
    let state = resolveTapSpeedState(0, 'idle', 10)
    state = resolveTapSpeedState(7, state, 10)
    expect(state).toBe('fast')
    state = resolveTapSpeedState(5.5, state, 10)
    expect(state).toBe('fast')
    state = resolveTapSpeedState(4.5, state, 10)
    expect(['active', 'fast']).toContain(state)
  })
})
