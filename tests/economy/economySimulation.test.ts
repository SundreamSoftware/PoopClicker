import { describe, expect, it } from 'vitest'
import { GENERATORS } from '../../src/content/generators'
import { UPGRADES } from '../../src/content/upgrades'
import {
  ECONOMY,
  flushPowerGain,
  flushPowerMultiplier,
  geometricCost,
} from '../../src/core/economy/formulas'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { computeProduction } from '../../src/core/systems/production'

interface Profile {
  name: string
  flushCount: number
  flushPower: number
  generatorLevels: number
  tapUpgradeLevels: number
}

function simulate(profile: Profile) {
  const save = createDefaultSave()
  save.flushCount = profile.flushCount
  save.flushPower = profile.flushPower
  for (const [index, gen] of GENERATORS.entries()) {
    if (index > 8) break
    if ((gen.unlockFlushCount ?? 0) <= profile.flushCount) {
      save.generators[gen.id] = profile.generatorLevels
      save.claimedGeneratorMilestones[gen.id] = gen.milestones
        .filter((m) => m.level <= profile.generatorLevels)
        .map((m) => m.level)
    }
  }
  for (const up of UPGRADES.filter((u) => u.category === 'tap').slice(0, 8)) {
    if ((up.requiresFlushCount ?? 0) <= profile.flushCount) {
      save.purchasedRunUpgrades[up.id] = Math.min(up.maxLevel, profile.tapUpgradeLevels)
    }
  }
  const production = computeProduction(save)
  const nextUpgrade = UPGRADES.find((u) => (save.purchasedRunUpgrades[u.id] ?? 0) < 3)
  const upgradeCost = nextUpgrade
    ? geometricCost(
        LargeNumber.from(nextUpgrade.baseCost),
        nextUpgrade.costGrowth,
        save.purchasedRunUpgrades[nextUpgrade.id] ?? 0,
      )
    : LargeNumber.from(1)
  const secondsToUpgrade = production.pps.gt(0)
    ? upgradeCost.div(production.pps).toNumber()
    : Number.POSITIVE_INFINITY
  const runNeeded = LargeNumber.from(ECONOMY.firstFlushRequirement)
  const secondsToFlush = production.pps.gt(0)
    ? runNeeded.div(production.pps).toNumber()
    : Number.POSITIVE_INFINITY
  const powerGain = flushPowerGain(runNeeded)
  return {
    pps: production.pps.toNumber(),
    tap: production.tapPower.toNumber(),
    global: production.globalMultiplier,
    secondsToUpgrade,
    secondsToFlush,
    powerGain,
    postFlushGlobal: flushPowerMultiplier(profile.flushPower + powerGain),
  }
}

describe('Economy simulation', () => {
  const profiles: Profile[] = [
    { name: 'new', flushCount: 0, flushPower: 0, generatorLevels: 0, tapUpgradeLevels: 0 },
    { name: 'early', flushCount: 0, flushPower: 0, generatorLevels: 5, tapUpgradeLevels: 2 },
    {
      name: 'first_flush',
      flushCount: 1,
      flushPower: 15,
      generatorLevels: 10,
      tapUpgradeLevels: 4,
    },
    { name: 'mid', flushCount: 5, flushPower: 80, generatorLevels: 25, tapUpgradeLevels: 8 },
    {
      name: '10_flush',
      flushCount: 10,
      flushPower: 200,
      generatorLevels: 40,
      tapUpgradeLevels: 10,
    },
    {
      name: '25_flush',
      flushCount: 25,
      flushPower: 600,
      generatorLevels: 80,
      tapUpgradeLevels: 12,
    },
    { name: 'late', flushCount: 50, flushPower: 1500, generatorLevels: 120, tapUpgradeLevels: 15 },
  ]

  it('keeps early game fast and late game prestige-gated', () => {
    const results = Object.fromEntries(profiles.map((p) => [p.name, simulate(p)]))
    // New player can tap immediately
    expect(results.new.tap).toBeGreaterThan(0)
    // After first flush, global multiplier rises
    expect(results.first_flush.global).toBeGreaterThan(results.new.global)
    // Late game production dwarfs early
    expect(results.late.pps).toBeGreaterThan(results.early.pps)
    // Post-flush always stronger
    for (const p of profiles) {
      expect(results[p.name].postFlushGlobal).toBeGreaterThanOrEqual(results[p.name].global)
    }
    // Mid/late should not trivially buy everything in seconds from idle alone
    expect(results.late.secondsToUpgrade).toBeGreaterThan(results.early.secondsToUpgrade * 0.01)
  })
})
