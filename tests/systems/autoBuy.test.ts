import { describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { ECONOMY } from '../../src/core/economy/formulas'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { performFlush } from '../../src/core/systems/flush'
import {
  AUTO_BUY,
  autoBuyIntervalMs,
  autoBuySpeedCost,
  decideAutoBuy,
} from '../../src/core/systems/autoBuy'

describe('autoBuy', () => {
  it('returns null when PP cannot buy anything', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      currentPP: LargeNumber.from(0).serialize(),
    }
    expect(decideAutoBuy(save)).toBeNull()
  })

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

  it('picks one affordable purchase', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      currentPP: LargeNumber.from(100).serialize(),
    }
    const decision = decideAutoBuy(save)
    expect(decision).not.toBeNull()
    expect(decision?.count).toBe(1)
    expect(['generator', 'upgrade']).toContain(decision?.kind)
  })

  it('balanced strategy picks the highest value affordable item', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      autoBuyStrategy: 'balanced' as const,
      currentPP: LargeNumber.from(50).serialize(),
    }
    const decision = decideAutoBuy(save)
    expect(decision).not.toBeNull()
    expect(decision?.count).toBe(1)
    expect(['generator', 'upgrade']).toContain(decision?.kind)
  })

  it('production strategy prefers a generator when one is affordable', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      autoBuyStrategy: 'production' as const,
      currentPP: LargeNumber.from(100).serialize(),
    }
    const decision = decideAutoBuy(save)
    expect(decision?.kind).toBe('generator')
  })

  it('tap strategy prefers a tap-lane upgrade', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      autoBuyStrategy: 'tap' as const,
      currentPP: LargeNumber.from(500).serialize(),
    }
    const decision = decideAutoBuy(save)
    expect(decision?.kind).toBe('upgrade')
  })

  it('falls back to the highest affordable upgrade when no generator is affordable', () => {
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
    expect(decision?.count).toBe(1)
  })

  it('respects generator preference and buys an upgrade instead', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      autoBuyPreferences: { generators: false, upgrades: true },
      currentPP: LargeNumber.from(100).serialize(),
    }

    expect(decideAutoBuy(save)?.kind).toBe('upgrade')
  })

  it('does nothing when both categories are disabled', () => {
    const save = {
      ...createDefaultSave(),
      autoBuyUnlocked: true,
      autoBuyEnabled: true,
      autoBuyPreferences: { generators: false, upgrades: false },
      currentPP: LargeNumber.from(10_000).serialize(),
    }

    expect(decideAutoBuy(save)).toBeNull()
  })

  it('starts at 15s and reaches 5s after 10 speed levels', () => {
    expect(autoBuyIntervalMs(0)).toBe(15_000)
    expect(autoBuyIntervalMs(1)).toBe(14_000)
    expect(autoBuyIntervalMs(AUTO_BUY.maxSpeedLevel)).toBe(5_000)
    expect(autoBuyIntervalMs(99)).toBe(5_000)
  })

  it('makes each speed level significantly more expensive', () => {
    let previous = autoBuySpeedCost(0)
    expect(previous.toNumber()).toBe(AUTO_BUY.speedBaseCost)
    for (let level = 1; level < AUTO_BUY.maxSpeedLevel; level++) {
      const cost = autoBuySpeedCost(level)
      expect(cost.div(previous).toNumber()).toBeCloseTo(AUTO_BUY.speedCostGrowth, 8)
      previous = cost
    }
  })

  it('keeps Auto-Buy speed levels after a Flush', () => {
    const now = Date.UTC(2026, 0, 1)
    const save = {
      ...createDefaultSave(now),
      autoBuyUnlocked: true,
      autoBuySpeedLevel: 4,
      runPPEarned: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
      currentPP: LargeNumber.from(ECONOMY.firstFlushRequirement).serialize(),
    }
    const result = performFlush(save, now)
    expect(result.ok).toBe(true)
    expect(result.save.autoBuySpeedLevel).toBe(4)
    expect(result.save.autoBuyUnlocked).toBe(true)
    expect(result.save.autoBuyStrategy).toBe('balanced')
  })
})
