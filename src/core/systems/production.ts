import { GENERATORS } from '../../content/generators'
import { UPGRADES } from '../../content/upgrades'
import { ROYAL_FLUSH_NODES } from '../../content/royalFlush'
import { WORLDS } from '../../content/worlds'
import { ACHIEVEMENTS } from '../../content/achievements'
import { ECONOMY, flushPowerMultiplier } from '../economy/formulas'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import type { EffectType, TapSpeedState } from '../types/gameTypes'

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

export function computeProduction(
  save: PlayerSaveV2,
  combo = 0,
  now = Date.now(),
): ProductionBreakdown {
  const flushMult = flushPowerMultiplier(save.flushPower)
  const world = WORLDS.find((w) => w.id === save.currentWorldId)
  const worldBonus = 1 + (world?.productionBonus ?? 0)
  const permanent = 1 + save.permanentProductionBonus

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

  let boostTap = 1
  let boostIdle = 1
  for (const boost of save.activeBoosts) {
    if (boost.expiresAt > now) {
      boostTap *= boost.tapMultiplier
      boostIdle *= boost.idleMultiplier
    }
  }

  if (save.activeEvent?.type === 'burrito_rush' && save.activeEvent.endsAt > now) {
    boostTap *= 3
  }
  if (save.activeEvent?.type === 'toilet_quake' && save.activeEvent.endsAt > now) {
    boostTap *= 1.5
    boostIdle *= 2
  }

  const globalMultiplier = flushMult * worldBonus * permanent * (1 + globalBonus) * boostIdle

  let generatorPps = LargeNumber.zero()
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
  }

  const comboMult = 1 + combo * 0.05
  const tapMultiplier =
    (1 + tapMultBonus + tapPowerBonus) * boostTap * flushMult * worldBonus * permanent
  const tapPower = LargeNumber.from(ECONOMY.tapBase).mul(tapMultiplier).mul(comboMult)

  const critChance = Math.min(0.75, ECONOMY.critBaseChance + critChanceBonus)
  const critMultiplier = ECONOMY.critBaseMultiplier + critMultBonus
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
  }
}

export function resolveTapSpeedState(
  rollingCps: number,
  previous: TapSpeedState,
  frenzyThreshold: number,
): TapSpeedState {
  // Hysteresis bands to avoid flicker
  const enter = {
    slow: 0.5,
    active: 2.5,
    fast: 6,
    frenzy: frenzyThreshold,
    overdrive: Math.max(frenzyThreshold + 3, ECONOMY.overdriveCpsThreshold),
  }
  const exit = {
    slow: 0.2,
    active: 1.8,
    fast: 5,
    frenzy: frenzyThreshold - 1,
    overdrive: Math.max(frenzyThreshold + 2, ECONOMY.overdriveCpsThreshold - 1),
  }

  const order: TapSpeedState[] = ['idle', 'slow', 'active', 'fast', 'frenzy', 'overdrive']
  const idx = order.indexOf(previous)

  if (rollingCps >= enter.overdrive) return 'overdrive'
  if (rollingCps >= enter.frenzy)
    return previous === 'overdrive' && rollingCps >= exit.overdrive ? 'overdrive' : 'frenzy'
  if (rollingCps >= enter.fast)
    return idx >= order.indexOf('frenzy') && rollingCps >= exit.frenzy
      ? previous === 'overdrive'
        ? 'frenzy'
        : 'frenzy'
      : 'fast'
  if (rollingCps >= enter.active)
    return idx >= order.indexOf('fast') && rollingCps >= exit.fast ? 'fast' : 'active'
  if (rollingCps >= enter.slow)
    return idx >= order.indexOf('active') && rollingCps >= exit.active ? 'active' : 'slow'
  if (idx >= order.indexOf('slow') && rollingCps >= exit.slow) return 'slow'
  return 'idle'
}
