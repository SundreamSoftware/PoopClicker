import { describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { decideAutoBuy } from '../../src/core/systems/autoBuy'

describe('autoBuy', () => {
  it('returns null when disabled', () => {
    const save = createDefaultSave()
    expect(decideAutoBuy(save)).toBeNull()
  })

  it('returns null when unlocked but not enabled', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: false,
      currentPP: LargeNumber.from(10_000).serialize(),
    }
    expect(decideAutoBuy(save)).toBeNull()
  })

  it('picks one affordable generator purchase', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      currentPP: LargeNumber.from(100).serialize(),
    }
    const decision = decideAutoBuy(save)
    expect(decision).not.toBeNull()
    expect(decision?.kind).toBe('generator')
    expect(decision?.count).toBe(1)
  })

  it('falls back to cheapest upgrade when no generator affordable', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      currentPP: LargeNumber.from(50).serialize(),
      generators: { plunger_intern: 30 },
    }
    const decision = decideAutoBuy(save)
    expect(decision?.kind).toBe('upgrade')
    expect(decision?.id).toBe('more_fiber')
  })
})
