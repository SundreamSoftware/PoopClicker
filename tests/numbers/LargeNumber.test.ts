import { describe, expect, it } from 'vitest'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import {
  formatDuration,
  formatMultiplier,
  formatNumber,
  formatPercent,
} from '../../src/core/numbers/formatNumber'

describe('LargeNumber', () => {
  it('adds and compares large values', () => {
    const a = LargeNumber.from(1e15)
    const b = LargeNumber.from(2e15)
    expect(a.add(b).toNumber()).toBeCloseTo(3e15, -8)
    expect(b.gt(a)).toBe(true)
  })

  it('handles geometric pow for costs', () => {
    const base = LargeNumber.from(100)
    const cost = base.mul(LargeNumber.from(1.15).pow(50))
    expect(cost.gt(100)).toBe(true)
    expect(cost.isFinite()).toBe(true)
  })

  it('serializes and deserializes', () => {
    const n = LargeNumber.from(123456789)
    const again = LargeNumber.deserialize(n.serialize())
    expect(again.toNumber()).toBeCloseTo(n.toNumber(), -2)
  })

  it('guards NaN/Infinity inputs', () => {
    expect(LargeNumber.from(Number.NaN).isZero()).toBe(true)
    expect(LargeNumber.from(Number.POSITIVE_INFINITY).isZero()).toBe(true)
  })
})

describe('formatNumber', () => {
  it('uses suffixes', () => {
    expect(formatNumber(1500)).toContain('K')
    expect(formatNumber(2_500_000)).toContain('M')
    expect(formatNumber(LargeNumber.from(1e15))).toContain('Qa')
  })

  it('formats small values, percents, multipliers, and durations', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(7.25)).toBe('7.25')
    expect(formatNumber(42)).toBe('42')
    expect(formatNumber(150)).toBe('150')
    expect(formatPercent(0.25)).toBe('25%')
    expect(formatPercent(Number.NaN)).toBe('0%')
    expect(formatMultiplier(1.5)).toBe('x1.50')
    expect(formatMultiplier(Number.POSITIVE_INFINITY)).toBe('x1')
    expect(formatDuration(1_500)).toBe('1s')
    expect(formatDuration(65_000)).toBe('1m 5s')
    expect(formatDuration(3_600_000 + 120_000)).toBe('1h 2m')
  })
})
