import { GENERATORS } from '../../content/generators'
import { UPGRADES } from '../../content/upgrades'
import { ROYAL_FLUSH_NODES } from '../../content/royalFlush'
import { WORLDS } from '../../content/worlds'
import { ACHIEVEMENTS } from '../../content/achievements'
import { ECONOMY, flushPowerMultiplier } from '../economy/formulas'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import type { EffectType, TapSpeedState } from '../types/gameTypes'

export const QUALITY = {
  splashEveryN: 5,
  critChainCap: 3,
  critChainChanceCap: 0.65,
  comboGenThreshold: 8,
  comboCritChanceCap: 0.2,
} as const

export interface ProductionContext {
  frenzyActive?: boolean
  tapState?: TapSpeedState
}

export interface ProductionBreakdown {
  tapPower: LargeNumber
  pps: LargeNumber
  critChance: number
  critMultiplier: number
  comboMax: number
  comboDecay: number
  frenzyThreshold: number
  frenzyDurationBonus: number
  offlineCapHoursBonus: number
  goldenChanceBonus: number
  eventRewardBonus: number
  globalMultiplier: number
  tapMultiplier: number
  idleMultiplier: number
  splashEveryN: number | null
  splashMultiplier: number
  critChainChance: number
  comboCritPerCombo: number
  tapFromPps: number
  milestoneTapPer: number
  frenzyIdleBonus: number
  bestGenAmp: number
  goldenFrenzySec: number
  overdriveCritBonus: number
  comboGenBonus: number
}

function sumEffect(
  save: PlayerSaveV2,
  type: EffectType,
  opts?: { fromUpgrades?: boolean; fromRoyal?: boolean; fromAchievements?: boolean },
): number {
  let total = 0
  const fromUpgrades = opts?.fromUpgrades ?? true
  const fromRoyal = opts?.fromRoyal ?? true
  const fromAchievements = opts?.fromAchievements ?? true

  if (fromUpgrades) {
    for (const upgrade of UPGRADES) {
      if (upgrade.effectType !== type) continue
      const level = save.purchasedRunUpgrades[upgrade.id] ?? 0
      total += level * upgrade.effectValue
    }
  }

  if (fromRoyal) {
    for (const node of ROYAL_FLUSH_NODES) {
      if (node.effectType !== type) continue
      const level = save.royalFlushLevels[node.id] ?? 0
      total += level * node.effectValue
    }
  }

  if (fromAchievements) {
    for (const def of ACHIEVEMENTS) {
      if (!def.permanentBonus || def.permanentBonus.type !== type) continue
      const state = save.achievements[def.id]
      if (state?.claimed) total += def.permanentBonus.value
    }
  }

  return total
}

export function generatorMilestoneMultiplier(save: PlayerSaveV2, generatorId: string): number {
  const def = GENERATORS.find((g) => g.id === generatorId)
  if (!def) return 1
  const level = save.generators[generatorId] ?? 0
  const claimed = new Set(save.claimedGeneratorMilestones[generatorId] ?? [])
  let mult = 1
  for (const milestone of def.milestones) {
    if (level >= milestone.level && claimed.has(milestone.level)) {
      mult *= milestone.productionMultiplier
    }
  }
  return mult
}

function claimedMilestoneCount(save: PlayerSaveV2): number {
  let count = 0
  for (const levels of Object.values(save.claimedGeneratorMilestones)) {
    count += levels.length
  }
  return count
}

export function computeProduction(
  save: PlayerSaveV2,
  combo = 0,
  now = Date.now(),
  context: ProductionContext = {},
): ProductionBreakdown {
  const flushMult = flushPowerMultiplier(save.flushPower)
  const world = WORLDS.find((w) => w.id === save.currentWorldId)
  const worldBonus = 1 + (world?.productionBonus ?? 0)
  const permanent = 1 + save.permanentProductionBonus
  const paid = save.paidProductionMultiplier > 0 ? save.paidProductionMultiplier : 1

  const tapMultBonus = sumEffect(save, 'tap_multiplier')
  const tapPowerBonus = sumEffect(save, 'tap_power')
  const idleBonus = sumEffect(save, 'idle_multiplier')
  const genBonus = sumEffect(save, 'generator_production')
  const globalBonus = sumEffect(save, 'global_production')
  const critChanceBonus = sumEffect(save, 'crit_chance')
  const critMultBonus = sumEffect(save, 'crit_multiplier')
  const comboMaxBonus = sumEffect(save, 'combo_max')
  const comboDecayBonus = sumEffect(save, 'combo_decay')
  const frenzyThresholdBonus = sumEffect(save, 'frenzy_threshold')
  const frenzyDurationBonus = sumEffect(save, 'frenzy_duration')
  const offlineCapHoursBonus = sumEffect(save, 'offline_cap')
  const goldenChanceBonus = sumEffect(save, 'golden_chance')
  const eventRewardBonus = sumEffect(save, 'event_reward')
  const splashPower = sumEffect(save, 'splash_power')
  const critChainChance = Math.min(QUALITY.critChainChanceCap, sumEffect(save, 'crit_chain'))
  const comboCritPerCombo = sumEffect(save, 'combo_crit')
  const tapFromPps = sumEffect(save, 'tap_from_pps')
  const milestoneTapPer = sumEffect(save, 'milestone_tap')
  const frenzyIdleBonus = sumEffect(save, 'frenzy_idle')
  const bestGenAmp = sumEffect(save, 'best_gen_amp')
  const goldenFrenzySec = sumEffect(save, 'golden_frenzy')
  const overdriveCritBonus = sumEffect(save, 'overdrive_crit')
  const comboGenBonus = sumEffect(save, 'combo_gen')

  let boostTap = 1
  let boostIdle = 1
  for (const boost of save.activeBoosts) {
    if (boost.expiresAt > now) {
      boostTap *= boost.tapMultiplier
      boostIdle *= boost.idleMultiplier
    }
  }

  const globalMultiplier = flushMult * worldBonus * permanent * paid * (1 + globalBonus) * boostIdle

  let generatorPps = LargeNumber.zero()
  let bestProd = LargeNumber.zero()
  for (const def of GENERATORS) {
    const level = save.generators[def.id] ?? 0
    if (level <= 0) continue
    const milestoneMult = generatorMilestoneMultiplier(save, def.id)
    const prod = LargeNumber.from(def.baseProduction)
      .mul(level)
      .mul(1 + genBonus)
      .mul(milestoneMult)
      .mul(1 + idleBonus)
      .mul(globalMultiplier)
    generatorPps = generatorPps.add(prod)
    if (prod.gt(bestProd)) bestProd = prod
  }
  if (bestGenAmp > 0 && bestProd.gt(0)) {
    generatorPps = generatorPps.add(bestProd.mul(bestGenAmp))
  }
  if (context.frenzyActive && frenzyIdleBonus > 0) {
    generatorPps = generatorPps.mul(1 + frenzyIdleBonus)
  }
  if (combo >= QUALITY.comboGenThreshold && comboGenBonus > 0) {
    generatorPps = generatorPps.mul(1 + comboGenBonus)
  }

  const comboMult = 1 + combo * 0.05
  const milestoneTap = 1 + claimedMilestoneCount(save) * milestoneTapPer
  const tapMultiplier =
    (1 + tapMultBonus + tapPowerBonus) *
    boostTap *
    flushMult *
    worldBonus *
    permanent *
    paid *
    (1 + globalBonus) *
    milestoneTap
  let tapPower = LargeNumber.from(ECONOMY.tapBase).mul(tapMultiplier).mul(comboMult)
  if (tapFromPps > 0 && generatorPps.gt(0)) {
    tapPower = tapPower.add(generatorPps.mul(tapFromPps))
  }

  const critChance = Math.min(
    0.75,
    ECONOMY.critBaseChance +
      critChanceBonus +
      Math.min(QUALITY.comboCritChanceCap, combo * comboCritPerCombo),
  )
  const critMultiplier =
    ECONOMY.critBaseMultiplier +
    critMultBonus +
    (context.tapState === 'overdrive' ? overdriveCritBonus : 0)
  const comboMax = Math.max(5, ECONOMY.comboMaxBase + comboMaxBonus)
  const comboDecay = Math.max(0.2, ECONOMY.comboDecayPerSecond + comboDecayBonus)
  const frenzyThreshold = Math.max(4, ECONOMY.frenzyCpsThreshold + frenzyThresholdBonus)

  return {
    tapPower,
    pps: generatorPps,
    critChance,
    critMultiplier,
    comboMax,
    comboDecay,
    frenzyThreshold,
    frenzyDurationBonus,
    offlineCapHoursBonus,
    goldenChanceBonus,
    eventRewardBonus,
    globalMultiplier,
    tapMultiplier,
    idleMultiplier: (1 + idleBonus) * globalMultiplier,
    splashEveryN: splashPower > 0 ? QUALITY.splashEveryN : null,
    splashMultiplier: splashPower > 0 ? 1 + splashPower : 0,
    critChainChance,
    comboCritPerCombo,
    tapFromPps,
    milestoneTapPer,
    frenzyIdleBonus,
    bestGenAmp,
    goldenFrenzySec,
    overdriveCritBonus,
    comboGenBonus,
  }
}

export interface MultiplierPart {
  id: string
  label: string
  value: number
}

export interface MultiplierBreakdown {
  total: number
  parts: MultiplierPart[]
}

/** Same factors as `computeProduction` globalMultiplier — UI must not re-derive these. */
export function computeMultiplierBreakdown(
  save: PlayerSaveV2,
  now = Date.now(),
): MultiplierBreakdown {
  const flushPower = flushPowerMultiplier(save.flushPower)
  const world = WORLDS.find((w) => w.id === save.currentWorldId)
  const worldBonus = 1 + (world?.productionBonus ?? 0)
  const permanentMilestone = 1 + save.permanentProductionBonus
  const paid = save.paidProductionMultiplier > 0 ? save.paidProductionMultiplier : 1
  const royalFlushGlobal = 1 + sumEffect(save, 'global_production')
  let boostIdle = 1
  for (const boost of save.activeBoosts) {
    if (boost.expiresAt > now) boostIdle *= boost.idleMultiplier
  }
  const total = flushPower * worldBonus * permanentMilestone * paid * royalFlushGlobal * boostIdle
  return {
    total,
    parts: [
      { id: 'flush', label: 'Flush Power', value: flushPower },
      { id: 'world', label: world?.name ?? 'World', value: worldBonus },
      { id: 'permanent', label: 'Permanent milestone', value: permanentMilestone },
      { id: 'royal', label: 'Royal Flush / bonuses', value: royalFlushGlobal },
      { id: 'paid', label: 'Convenience Pack', value: paid },
      { id: 'boost', label: 'Active boost', value: boostIdle },
    ],
  }
}

/**
 * Visual tap-speed bands aligned with P4 expression levels (lv1–lv6):
 * 0–1 slow, 2–5 active, 6–9 fast, 10–12 frenzy, 13–16 frenzy (expr_05), 16+ overdrive.
 * `frenzyThreshold` is kept for API compatibility (gameplay frenzy uses production separately).
 */
export function resolveTapSpeedState(
  rollingCps: number,
  previous: TapSpeedState,
  _frenzyThreshold = 10,
): TapSpeedState {
  void _frenzyThreshold
  // Hysteresis bands to avoid flicker — edges match expression CPS ladder.
  const enter = {
    slow: 0.5,
    active: 2,
    fast: 6,
    frenzy: 10,
    overdrive: 16.05,
  }
  const exit = {
    slow: 0.2,
    active: 1.5,
    fast: 5,
    frenzy: 9,
    overdrive: 15.5,
  }

  const order: TapSpeedState[] = ['idle', 'slow', 'active', 'fast', 'frenzy', 'overdrive']
  const idx = order.indexOf(previous)

  if (rollingCps >= enter.overdrive) return 'overdrive'
  if (rollingCps >= enter.frenzy)
    return previous === 'overdrive' && rollingCps >= exit.overdrive ? 'overdrive' : 'frenzy'
  if (rollingCps >= enter.fast)
    return idx >= order.indexOf('frenzy') && rollingCps >= exit.frenzy ? 'frenzy' : 'fast'
  if (rollingCps >= enter.active)
    return idx >= order.indexOf('fast') && rollingCps >= exit.fast ? 'fast' : 'active'
  if (rollingCps >= enter.slow)
    return idx >= order.indexOf('active') && rollingCps >= exit.active ? 'active' : 'slow'
  if (idx >= order.indexOf('slow') && rollingCps >= exit.slow) return 'slow'
  return 'idle'
}
