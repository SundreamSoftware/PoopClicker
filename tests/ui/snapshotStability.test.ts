import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'

describe('EngineSnapshot stability', () => {
  it('returns the same object reference across repeated getSnapshot calls', () => {
    const engine = createTestEngine()
    const a = engine.getSnapshot()
    const b = engine.getSnapshot()
    expect(a).toBe(b)
  })

  it('changes reference after a mutating emit (tap)', () => {
    const engine = createTestEngine()
    const before = engine.getSnapshot()
    engine.tap()
    const after = engine.getSnapshot()
    expect(after).not.toBe(before)
    expect(engine.getSnapshot()).toBe(after)
  })
})
