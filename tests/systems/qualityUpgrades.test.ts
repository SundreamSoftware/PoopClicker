import { describe, expect, it, vi } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { QUALITY, computeProduction } from '../../src/core/systems/production'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { scoreBuildArchetypes } from '../../src/content/upgrades'

describe('quality upgrades', () => {
  it('splashes extra PP on every 5th tap', () => {
    const engine = createTestEngine({
      purchasedRunUpgrades: { chili_accelerator: 1 },
      currentPP: LargeNumber.from(1).serialize(),
    })
    const taps = [engine.tap(), engine.tap(), engine.tap(), engine.tap(), engine.tap()]
    expect(taps.slice(0, 4).every((t) => !t.splash)).toBe(true)
    expect(taps[4]?.splash).toBe(true)
    expect(taps[4]!.gained.gt(taps[0]!.gained)).toBe(true)
  })

  it('adds a fraction of PPS onto tap power', () => {
    const save = {
      ...createDefaultSave(),
      generators: { plunger_intern: 20 },
      claimedGeneratorMilestones: { plunger_intern: [10] },
      purchasedRunUpgrades: { reinforced_toilet_seat: 5 },
    }
    const withSiphon = computeProduction(save)
    const without = computeProduction({ ...save, purchasedRunUpgrades: {} })
    expect(withSiphon.tapFromPps).toBeCloseTo(0.03)
    expect(withSiphon.tapPower.gt(without.tapPower)).toBe(true)
    expect(withSiphon.pps.gt(0)).toBe(true)
  })

  it('boosts tap from claimed generator milestones', () => {
    const base = {
      ...createDefaultSave(),
      purchasedRunUpgrades: { titanium_toilet_seat: 2 },
    }
    const plain = computeProduction(base)
    const milestoned = computeProduction({
      ...base,
      claimedGeneratorMilestones: { plunger_intern: [10, 25] },
    })
    expect(milestoned.tapPower.gt(plain.tapPower)).toBe(true)
  })

  it('amplifies only the best generator and Frenzy idle', () => {
    const save = {
      ...createDefaultSave(),
      generators: { plunger_intern: 10, fiber_farmer: 10 },
      purchasedRunUpgrades: { advanced_bathroom_physics: 2, frenzy_festival: 2 },
    }
    const calm = computeProduction(save, 0, Date.now(), { frenzyActive: false })
    const frenzy = computeProduction(save, 0, Date.now(), { frenzyActive: true })
    expect(calm.bestGenAmp).toBeCloseTo(0.5)
    expect(frenzy.pps.gt(calm.pps)).toBe(true)
  })

  it('wakes generators at combo 8+', () => {
    const save = {
      ...createDefaultSave(),
      generators: { plunger_intern: 15 },
      purchasedRunUpgrades: { eternal_combo: 2 },
    }
    const low = computeProduction(save, 3)
    const high = computeProduction(save, QUALITY.comboGenThreshold)
    expect(high.pps.gt(low.pps)).toBe(true)
  })

  it('raises Overdrive crit multiplier', () => {
    const save = {
      ...createDefaultSave(),
      purchasedRunUpgrades: { overdrive_gloves: 2 },
    }
    const normal = computeProduction(save, 0, Date.now(), { tapState: 'fast' })
    const over = computeProduction(save, 0, Date.now(), { tapState: 'overdrive' })
    expect(over.critMultiplier).toBeGreaterThan(normal.critMultiplier)
  })

  it('can chain a crit into another crit', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const engine = createTestEngine({
      flushCount: 3,
      purchasedRunUpgrades: { chain_reaction_seat: 8 },
    })
    const result = engine.tap()
    random.mockRestore()
    expect(result.crit).toBe(true)
    expect(result.critChains).toBe(QUALITY.critChainCap)
  })

  it('scores TAPPER / IDLER / HYBRID from owned quality upgrades', () => {
    const scores = scoreBuildArchetypes({
      chili_accelerator: 2,
      night_light_loo: 3,
      reinforced_toilet_seat: 1,
    })
    expect(scores.tapper).toBe(2)
    expect(scores.idler).toBe(3)
    expect(scores.hybrid).toBe(1)
  })

  it('keeps purchased chili levels after the effect remap', () => {
    const engine = createTestEngine({
      purchasedRunUpgrades: { chili_accelerator: 4 },
    })
    expect(engine.exportSave().purchasedRunUpgrades.chili_accelerator).toBe(4)
    expect(computeProduction(engine.exportSave()).splashEveryN).toBe(QUALITY.splashEveryN)
  })
})
