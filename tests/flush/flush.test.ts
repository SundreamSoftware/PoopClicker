import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { ECONOMY } from '../../src/core/economy/formulas'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { buildFlushPreview, milestoneEventBonus, performFlush } from '../../src/core/systems/flush'
import { computeProduction } from '../../src/core/systems/production'

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

  it('does not reapply first-flush bonus when the clock rolls back', () => {
    const day = Date.UTC(2026, 7, 8, 12)
    const save = {
      ...createDefaultSave(day),
      firstFlushOfDayClaimedDate: '2026-08-08',
      runPPEarned: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
    }
    const rolledBack = Date.UTC(2026, 7, 7, 12)
    const preview = buildFlushPreview(save, rolledBack)
    expect(preview.firstFlushBonusApplied).toBe(false)
  })

  it('applies start bonus from post-flush production', () => {
    const now = Date.UTC(2026, 7, 7, 12)
    const save = {
      ...createDefaultSave(now),
      flushCount: 2,
      runPPEarned: LargeNumber.from(1_000_000).serialize(),
      currentPP: LargeNumber.from(1_000_000).serialize(),
      generators: { plunger_intern: 10 },
    }
    const result = performFlush(save, now)
    expect(result.ok).toBe(true)
    const production = computeProduction(result.save, 0, now)
    const bonus = production.pps.mul(5 * 60)
    expect(LargeNumber.deserialize(result.save.currentPP).toNumber()).toBeCloseTo(
      bonus.toNumber(),
      -1,
    )
  })

  it('exports milestone event bonus at flush 15', () => {
    const save = { ...createDefaultSave(), flushCount: 15 }
    expect(milestoneEventBonus(save)).toBe(0.25)
    expect(milestoneEventBonus({ ...save, flushCount: 10 })).toBe(0)
  })
})
