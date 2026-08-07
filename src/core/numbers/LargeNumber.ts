/**
 * Decimal floating-point for clicker-scale values.
 * Represented as mantissa * 10^exponent with normalized mantissa in [1, 10).
 */
export class LargeNumber {
  readonly mantissa: number
  readonly exponent: number

  constructor(mantissa = 0, exponent = 0) {
    if (!Number.isFinite(mantissa) || !Number.isFinite(exponent)) {
      this.mantissa = 0
      this.exponent = 0
      return
    }
    if (mantissa === 0) {
      this.mantissa = 0
      this.exponent = 0
      return
    }
    const sign = mantissa < 0 ? -1 : 1
    let m = Math.abs(mantissa)
    let e = Math.floor(exponent)
    const log10 = Math.floor(Math.log10(m))
    m = m / 10 ** log10
    e += log10
    this.mantissa = sign * m
    this.exponent = e
  }

  static zero(): LargeNumber {
    return new LargeNumber(0, 0)
  }

  static from(value: number | LargeNumber | string): LargeNumber {
    if (value instanceof LargeNumber) return value
    if (typeof value === 'string') {
      const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?)(?:e([+-]?\d+))?$/i)
      if (!match) return LargeNumber.zero()
      return new LargeNumber(Number(match[1]), match[2] ? Number(match[2]) : 0)
    }
    if (!Number.isFinite(value)) return LargeNumber.zero()
    if (value === 0) return LargeNumber.zero()
    return new LargeNumber(value, 0)
  }

  static max(a: LargeNumber, b: LargeNumber): LargeNumber {
    return a.gte(b) ? a : b
  }

  static min(a: LargeNumber, b: LargeNumber): LargeNumber {
    return a.lte(b) ? a : b
  }

  isZero(): boolean {
    return this.mantissa === 0
  }

  isFinite(): boolean {
    return Number.isFinite(this.mantissa) && Number.isFinite(this.exponent)
  }

  toNumber(): number {
    if (this.isZero()) return 0
    if (this.exponent > 308)
      return this.mantissa > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
    if (this.exponent < -308) return 0
    return this.mantissa * 10 ** this.exponent
  }

  abs(): LargeNumber {
    return new LargeNumber(Math.abs(this.mantissa), this.exponent)
  }

  neg(): LargeNumber {
    return new LargeNumber(-this.mantissa, this.exponent)
  }

  add(other: LargeNumber | number): LargeNumber {
    const b = LargeNumber.from(other)
    if (this.isZero()) return b
    if (b.isZero()) return this
    const expDiff = this.exponent - b.exponent
    if (expDiff >= 15) return this
    if (expDiff <= -15) return b
    if (expDiff >= 0) {
      return new LargeNumber(this.mantissa + b.mantissa / 10 ** expDiff, this.exponent)
    }
    return new LargeNumber(b.mantissa + this.mantissa / 10 ** -expDiff, b.exponent)
  }

  sub(other: LargeNumber | number): LargeNumber {
    return this.add(LargeNumber.from(other).neg())
  }

  mul(other: LargeNumber | number): LargeNumber {
    const b = LargeNumber.from(other)
    if (this.isZero() || b.isZero()) return LargeNumber.zero()
    return new LargeNumber(this.mantissa * b.mantissa, this.exponent + b.exponent)
  }

  div(other: LargeNumber | number): LargeNumber {
    const b = LargeNumber.from(other)
    if (b.isZero()) return LargeNumber.zero()
    if (this.isZero()) return LargeNumber.zero()
    return new LargeNumber(this.mantissa / b.mantissa, this.exponent - b.exponent)
  }

  pow(power: number): LargeNumber {
    if (!Number.isFinite(power)) return LargeNumber.zero()
    if (this.isZero()) return power > 0 ? LargeNumber.zero() : LargeNumber.from(1)
    if (power === 0) return LargeNumber.from(1)
    const log10 = Math.log10(Math.abs(this.mantissa)) + this.exponent
    const resultLog = log10 * power
    const exp = Math.floor(resultLog)
    const mant = 10 ** (resultLog - exp)
    const sign = this.mantissa < 0 && Math.abs(power % 2) === 1 ? -1 : 1
    return new LargeNumber(sign * mant, exp)
  }

  floor(): LargeNumber {
    if (this.exponent < 0) return LargeNumber.zero()
    if (this.exponent >= 15) return this
    return LargeNumber.from(Math.floor(this.toNumber()))
  }

  cmp(other: LargeNumber | number): number {
    const b = LargeNumber.from(other)
    if (this.isZero() && b.isZero()) return 0
    if (this.mantissa === 0) return b.mantissa > 0 ? -1 : 1
    if (b.mantissa === 0) return this.mantissa > 0 ? 1 : -1
    if (Math.sign(this.mantissa) !== Math.sign(b.mantissa)) {
      return this.mantissa > 0 ? 1 : -1
    }
    if (this.exponent !== b.exponent) {
      const expCmp = this.exponent > b.exponent ? 1 : -1
      return this.mantissa > 0 ? expCmp : -expCmp
    }
    if (this.mantissa === b.mantissa) return 0
    return this.mantissa > b.mantissa ? 1 : -1
  }

  gt(other: LargeNumber | number): boolean {
    return this.cmp(other) > 0
  }

  gte(other: LargeNumber | number): boolean {
    return this.cmp(other) >= 0
  }

  lt(other: LargeNumber | number): boolean {
    return this.cmp(other) < 0
  }

  lte(other: LargeNumber | number): boolean {
    return this.cmp(other) <= 0
  }

  eq(other: LargeNumber | number): boolean {
    return this.cmp(other) === 0
  }

  serialize(): { m: number; e: number } {
    return { m: this.mantissa, e: this.exponent }
  }

  static deserialize(
    value: { m?: number; e?: number } | number | string | null | undefined,
  ): LargeNumber {
    if (value == null) return LargeNumber.zero()
    if (typeof value === 'number' || typeof value === 'string') return LargeNumber.from(value)
    return new LargeNumber(value.m ?? 0, value.e ?? 0)
  }

  clone(): LargeNumber {
    return new LargeNumber(this.mantissa, this.exponent)
  }
}
