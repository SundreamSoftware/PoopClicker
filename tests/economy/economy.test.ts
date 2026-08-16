import { describe, expect, it } from 'vitest'
import {
  ECONOMY,
  flushPowerGain,
  flushPowerMultiplier,
  geometricSeriesCost,
  maxAffordableCount,
} from '../../src/core/economy/formulas'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { createTestEngine } from '../../src/core/GameEngine'
import { computeMultiplierBreakdown, computeProduction } from '../../src/core/systems/production'

describe('economy formulas', () => {
  it('computes geometric series cost', () => {
    const one = geometricSeriesCost(LargeNumber.from(10), 1.15, 0, 1)
    const ten = geometricSeriesCost(LargeNumber.from(10), 1.15, 0, 10)
    expect(one.toNumber()).toBeCloseTo(10)
    expect(ten.gt(one)).toBe(true)
  })

  it('BUY MAX is efficient and accurate', () => {
    const balance = LargeNumber.from(10_000)
    const count = maxAffordableCount(balance, LargeNumber.from(15), 1.12, 0)
    expect(count).toBeGreaterThan(0)
    const cost = geometricSeriesCost(LargeNumber.from(15), 1.12, 0, count)
    expect(cost.lte(balance)).toBe(true)
    const tooMuch = geometricSeriesCost(LargeNumber.from(15), 1.12, 0, count + 1)
    expect(tooMuch.gt(balance)).toBe(true)
  })

  it('flush power scales from run PP', () => {
    const gain = flushPowerGain(LargeNumber.from(ECONOMY.firstFlushRequirement))
    expect(gain).toBeGreaterThanOrEqual(10)
    expect(flushPowerMultiplier(gain)).toBeGreaterThan(1)
  })
})

describe('production & upgrades', () => {
  it('earns PP from taps and generators', () => {
    const engine = createTestEngine()
    engine.debugGrantPP(1000)
    engine.buyGenerator('plunger_intern', 1)
    const before = engine.exportSave()
    engine.tick(1000)
    const after = engine.exportSave()
    expect(
      LargeNumber.deserialize(after.currentPP).gt(LargeNumber.deserialize(before.currentPP)),
    ).toBe(true)
    const tap = engine.tap()
    expect(tap.gained.gt(0)).toBe(true)
  })

  it('flush power increases post-flush production', () => {
    const engine = createTestEngine({ flushPower: 0 })
    const before = computeProduction(engine.exportSave()).tapPower
    engine.debugSetSave((s) => ({ ...s, flushPower: 100 }))
    const after = computeProduction(engine.exportSave()).tapPower
    expect(after.gt(before)).toBe(true)
  })

  it('multiplier breakdown matches production global multiplier', () => {
    const save = createTestEngine({
      flushPower: 40,
      paidProductionMultiplier: 2,
      permanentProductionBonus: 0.1,
    }).exportSave()
    const production = computeProduction(save)
    const breakdown = computeMultiplierBreakdown(save)
    expect(breakdown.total).toBeCloseTo(production.globalMultiplier, 8)
    expect(breakdown.parts.some((part) => part.id === 'paid' && part.value === 2)).toBe(true)
  })

  it('upgrade cost curves grow', () => {
    const engine = createTestEngine()
    engine.debugGrantPP(1e12)
    const r1 = engine.buyUpgrade('more_fiber')
    expect(r1.ok).toBe(true)
    const level = engine.exportSave().purchasedRunUpgrades.more_fiber
    expect(level).toBe(1)
  })
})
