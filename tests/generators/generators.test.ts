import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { geometricCost } from '../../src/core/economy/formulas'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { GENERATOR_BY_ID } from '../../src/content/generators'

describe('Generators', () => {
  it('scales cost with level', () => {
    const def = GENERATOR_BY_ID.plunger_intern
    const l0 = geometricCost(LargeNumber.from(def.baseCost), def.costGrowth, 0)
    const l10 = geometricCost(LargeNumber.from(def.baseCost), def.costGrowth, 10)
    expect(l10.gt(l0)).toBe(true)
  })

  it('supports bulk buy and milestones once', () => {
    const engine = createTestEngine()
    engine.debugGrantPP(1e9)
    engine.setBuyMultiplierIndex(1) // x10
    expect(engine.buyGenerator('plunger_intern').ok).toBe(true)
    expect(engine.exportSave().generators.plunger_intern).toBe(10)
    const claimed = engine.exportSave().claimedGeneratorMilestones.plunger_intern
    expect(claimed).toContain(10)
    // buying more should not duplicate milestone entry
    engine.buyGenerator('plunger_intern')
    const claimed2 = engine.exportSave().claimedGeneratorMilestones.plunger_intern
    expect(claimed2.filter((x) => x === 10)).toHaveLength(1)
  })
})
