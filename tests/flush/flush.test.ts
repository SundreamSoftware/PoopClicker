import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { ECONOMY } from '../../src/core/economy/formulas'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { buildFlushPreview } from '../../src/core/systems/flush'

describe('Flush', () => {
  it('rewards based on runPPEarned not currentPP', () => {
    const engine = createTestEngine()
    engine.debugGrantPP(ECONOMY.firstFlushRequirement * 10)
    // Spend most PP so current << run
    engine.debugSetSave((s) => ({
      ...s,
      currentPP: LargeNumber.from(ECONOMY.firstFlushRequirement * 0.2).serialize(),
    }))
    const save = engine.exportSave()
    const runPP = LargeNumber.deserialize(save.runPPEarned)
    const currentPP = LargeNumber.deserialize(save.currentPP)
    expect(runPP.gt(currentPP)).toBe(true)
    const preview = buildFlushPreview(save, Date.now())
    const ifCurrent = buildFlushPreview(
      {
        ...save,
        runPPEarned: currentPP.serialize(),
      },
      Date.now(),
    )
    expect(preview.flushPowerGain).toBeGreaterThan(ifCurrent.flushPowerGain)
  })

  it('spending before flush does not reduce prestige reward', () => {
    const engine = createTestEngine()
    engine.debugGrantPP(ECONOMY.firstFlushRequirement * 3)
    const beforeSpend = buildFlushPreview(engine.exportSave(), Date.now()).flushPowerGain
    engine.buyGenerator('plunger_intern', 10)
    const afterSpend = buildFlushPreview(engine.exportSave(), Date.now()).flushPowerGain
    expect(afterSpend).toBe(beforeSpend)
  })

  it('resets run state and retains meta', () => {
    const engine = createTestEngine({ gtp: 50, ownedSkins: ['classic_poop', 'coffee_poop'] })
    engine.debugGrantPP(ECONOMY.firstFlushRequirement * 2)
    engine.buyGenerator('plunger_intern', 3)
    engine.buyUpgrade('more_fiber')
    const result = engine.flush()
    expect(result.ok).toBe(true)
    const save = engine.exportSave()
    expect(save.flushCount).toBe(1)
    expect(save.flushPower).toBeGreaterThan(0)
    expect(save.gtp).toBe(50)
    expect(save.ownedSkins).toContain('coffee_poop')
    expect(LargeNumber.deserialize(save.currentPP).toNumber()).toBeGreaterThanOrEqual(0)
    expect(Object.keys(save.purchasedRunUpgrades)).toHaveLength(0)
  })

  it('cannot flush below requirement', () => {
    const engine = createTestEngine()
    expect(engine.flush().ok).toBe(false)
  })

  it('first flush of day bonus is idempotent per day', () => {
    const now = Date.UTC(2026, 7, 7, 12)
    const engine = createTestEngine({}, now)
    engine.debugGrantPP(ECONOMY.firstFlushRequirement)
    const first = buildFlushPreview(engine.exportSave(), now).flushPowerGain
    engine.flush()
    engine.debugGrantPP(ECONOMY.firstFlushRequirement)
    const secondPreview = buildFlushPreview(engine.exportSave(), now)
    expect(secondPreview.firstFlushBonusApplied).toBe(false)
    expect(secondPreview.flushPowerGain).toBeLessThanOrEqual(first)
  })
})
