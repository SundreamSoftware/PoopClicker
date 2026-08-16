import { LargeNumber } from '../numbers/LargeNumber'

export const ECONOMY = {
  tapBase: 1,
  firstFlushRequirement: 25_000,
  flushPowerBase: 10,
  flushPowerExponent: 0.33,
  flushPowerProductionBonus: 0.05,
  flushPowerSoftCapStart: 500,
  flushPowerSoftCapFactor: 0.5,
  offlineCapHoursBase: 8,
  bathroomBreakIntervalMs: 4 * 60 * 60 * 1000,
  bathroomBreakMaxCharges: 2,
  firstFlushOfDayBonus: 0.25,
  goldenPoopBaseIntervalMs: 180_000,
  goldenPoopIntervalJitterMs: 60_000,
  critBaseChance: 0.02,
  critBaseMultiplier: 5,
  comboDecayPerSecond: 1.2,
  comboMaxBase: 25,
  frenzyCpsThreshold: 10,
  overdriveCpsThreshold: 15,
  buyMultipliers: [1, 10, 25] as const,
  /** GTP price for Auto-Buy — matches the $19.99 Mega GTP pack. */
  autoBuyGtpCost: 2_000,
} as const

export function geometricCost(baseCost: LargeNumber, growth: number, level: number): LargeNumber {
  if (level <= 0) return baseCost
  return baseCost.mul(LargeNumber.from(growth).pow(level))
}

/** Sum of geometric series: base * (r^n - 1) / (r - 1) */
export function geometricSeriesCost(
  baseCost: LargeNumber,
  growth: number,
  fromLevel: number,
  count: number,
): LargeNumber {
  if (count <= 0) return LargeNumber.zero()
  const first = geometricCost(baseCost, growth, fromLevel)
  if (Math.abs(growth - 1) < 1e-9) return first.mul(count)
  const rN = LargeNumber.from(growth).pow(count)
  return first.mul(rN.sub(1)).div(growth - 1)
}

export function maxAffordableCount(
  balance: LargeNumber,
  baseCost: LargeNumber,
  growth: number,
  fromLevel: number,
  hardCap = 10_000,
): number {
  if (balance.lte(0) || baseCost.lte(0)) return 0
  let lo = 0
  let hi = 1
  while (hi < hardCap && geometricSeriesCost(baseCost, growth, fromLevel, hi).lte(balance)) {
    lo = hi
    hi = Math.min(hardCap, hi * 2)
  }
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (geometricSeriesCost(baseCost, growth, fromLevel, mid).lte(balance)) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function flushPowerGain(runPPEarned: LargeNumber, firstFlushBonus = 0): number {
  const ratio = runPPEarned.div(ECONOMY.firstFlushRequirement).toNumber()
  if (!Number.isFinite(ratio) || ratio <= 0) return 0
  const raw = Math.floor(ECONOMY.flushPowerBase * ratio ** ECONOMY.flushPowerExponent)
  const withDaily = Math.floor(raw * (1 + firstFlushBonus))
  return Math.max(1, withDaily)
}

export function flushPowerMultiplier(flushPower: number): number {
  if (!Number.isFinite(flushPower) || flushPower <= 0) return 1
  if (flushPower <= ECONOMY.flushPowerSoftCapStart) {
    return 1 + flushPower * ECONOMY.flushPowerProductionBonus
  }
  const soft =
    ECONOMY.flushPowerSoftCapStart * ECONOMY.flushPowerProductionBonus +
    (flushPower - ECONOMY.flushPowerSoftCapStart) *
      ECONOMY.flushPowerProductionBonus *
      ECONOMY.flushPowerSoftCapFactor
  return 1 + soft
}

export function offlineCapMs(royalFlushIdleHoursBonus: number): number {
  const hours = Math.min(24, ECONOMY.offlineCapHoursBase + royalFlushIdleHoursBonus)
  return hours * 60 * 60 * 1000
}
