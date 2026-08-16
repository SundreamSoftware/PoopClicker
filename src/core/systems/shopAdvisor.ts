import { GENERATORS } from '../../content/generators'
import { UPGRADES } from '../../content/upgrades'
import { geometricCost, geometricSeriesCost } from '../economy/formulas'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import type { GeneratorDef, UpgradeDef } from '../types/gameTypes'
import { computeProduction } from './production'

export type ShopBadge = 'BEST_VALUE' | 'BEST_TAP' | 'BEST_IDLE' | 'MILESTONE' | 'RECOMMENDED'
export type UpgradeGroupId = 'tap' | 'combo' | 'crit' | 'idle'

const TAP_RATE_FOR_VALUE = 5
const FLUSH_LOOKAHEAD = 1

export function upgradeGroup(upgrade: UpgradeDef): UpgradeGroupId {
  if (upgrade.category === 'critical') return 'crit'
  if (upgrade.category === 'combo') return 'combo'
  if (upgrade.category === 'idle') return 'idle'
  return 'tap'
}

export function nextGeneratorMilestone(
  def: GeneratorDef,
  level: number,
): { level: number; multiplier: number } | null {
  const next = def.milestones.find((m) => m.level > level)
  return next ? { level: next.level, multiplier: next.productionMultiplier } : null
}

export function generatorUnlocked(save: PlayerSaveV2, def: GeneratorDef): boolean {
  if ((def.unlockFlushCount ?? 0) > save.flushCount) return false
  if (!def.unlockPP) return true
  const level = save.generators[def.id] ?? 0
  if (level > 0) return true
  const balance = LargeNumber.deserialize(save.currentPP)
  const lifetime = LargeNumber.deserialize(save.lifetimePPEarned)
  return balance.gte(def.unlockPP) || lifetime.gte(def.unlockPP)
}

export function upgradeRequirementMet(save: PlayerSaveV2, def: UpgradeDef): boolean {
  if ((def.requiresFlushCount ?? 0) > save.flushCount) return false
  if (def.requiresWorldId && !save.unlockedWorlds.includes(def.requiresWorldId)) return false
  if (def.requiresUpgradeId && !(save.purchasedRunUpgrades[def.requiresUpgradeId] > 0)) return false
  if (def.requiresAchievementId && !save.achievements[def.requiresAchievementId]?.completed) {
    return false
  }
  return true
}

export function generatorPpsForLevel(
  save: PlayerSaveV2,
  def: GeneratorDef,
  level: number,
): LargeNumber {
  const isolated = computeProduction({
    ...save,
    generators: { ...save.generators, [def.id]: Math.max(0, level) },
  })
  const without = computeProduction({
    ...save,
    generators: { ...save.generators, [def.id]: 0 },
  })
  return isolated.pps.sub(without.pps)
}

export function scoreGeneratorBuy(
  save: PlayerSaveV2,
  def: GeneratorDef,
  count: number,
): { cost: LargeNumber; deltaPps: LargeNumber; value: number } | null {
  if (count <= 0 || !generatorUnlocked(save, def)) return null
  const level = save.generators[def.id] ?? 0
  const cost = geometricSeriesCost(LargeNumber.from(def.baseCost), def.costGrowth, level, count)
  if (cost.lte(0)) return null
  const before = generatorPpsForLevel(save, def, level)
  const after = generatorPpsForLevel(save, def, level + count)
  const deltaPps = after.sub(before)
  const value = deltaPps.toNumber() / Math.max(1e-9, cost.toNumber())
  return { cost, deltaPps, value }
}

function expectedTapIncome(save: PlayerSaveV2): number {
  const production = computeProduction(save)
  const critFactor = 1 + production.critChance * (production.critMultiplier - 1)
  return production.tapPower.toNumber() * TAP_RATE_FOR_VALUE * critFactor
}

export function scoreUpgradeBuy(
  save: PlayerSaveV2,
  def: UpgradeDef,
): { cost: LargeNumber; value: number; lane: 'tap' | 'idle' | 'other' } | null {
  const level = save.purchasedRunUpgrades[def.id] ?? 0
  if (level >= def.maxLevel || !upgradeRequirementMet(save, def)) return null
  const cost = geometricCost(LargeNumber.from(def.baseCost), def.costGrowth, level)
  if (cost.lte(0)) return null
  const before = computeProduction(save)
  const after = computeProduction({
    ...save,
    purchasedRunUpgrades: { ...save.purchasedRunUpgrades, [def.id]: level + 1 },
  })
  const tapDelta =
    after.tapPower.toNumber() *
      TAP_RATE_FOR_VALUE *
      (1 + after.critChance * (after.critMultiplier - 1)) -
    expectedTapIncome(save)
  const idleDelta = after.pps.toNumber() - before.pps.toNumber()
  const group = upgradeGroup(def)
  const lane =
    group === 'idle'
      ? 'idle'
      : group === 'tap' || group === 'combo' || group === 'crit'
        ? 'tap'
        : 'other'
  let extra = 0
  if (def.effectType === 'splash_power') {
    extra +=
      (after.tapPower.toNumber() * after.splashMultiplier * TAP_RATE_FOR_VALUE) /
      Math.max(1, after.splashEveryN ?? 5)
  }
  if (def.effectType === 'crit_chain') {
    extra +=
      after.tapPower.toNumber() *
      TAP_RATE_FOR_VALUE *
      after.critChance *
      after.critChainChance *
      (after.critMultiplier - 1)
  }
  if (def.effectType === 'golden_frenzy') {
    extra += after.pps.toNumber() * after.goldenFrenzySec * 0.15
  }
  const value = (tapDelta + idleDelta + extra) / Math.max(1e-9, cost.toNumber())
  return { cost, value, lane }
}

export function visibleGenerators(save: PlayerSaveV2): GeneratorDef[] {
  return GENERATORS.filter((g) => (g.unlockFlushCount ?? 0) <= save.flushCount + FLUSH_LOOKAHEAD)
}

export function visibleUpgrades(save: PlayerSaveV2): {
  groups: Record<UpgradeGroupId, UpgradeDef[]>
  teaser: UpgradeDef | null
} {
  const groups: Record<UpgradeGroupId, UpgradeDef[]> = {
    tap: [],
    combo: [],
    crit: [],
    idle: [],
  }
  const lockedFuture = UPGRADES.filter((u) => (u.requiresFlushCount ?? 0) > save.flushCount).sort(
    (a, b) => (a.requiresFlushCount ?? 0) - (b.requiresFlushCount ?? 0),
  )
  const teaser = lockedFuture[0] ?? null
  const teaserFlush = teaser?.requiresFlushCount ?? Number.POSITIVE_INFINITY

  for (const up of UPGRADES) {
    const need = up.requiresFlushCount ?? 0
    const available = upgradeRequirementMet(save, up)
    const nextStep = need <= save.flushCount + FLUSH_LOOKAHEAD
    const isTeaser = teaser?.id === up.id
    if (!available && !nextStep && !isTeaser) continue
    if (need > save.flushCount + FLUSH_LOOKAHEAD && need > teaserFlush) continue
    groups[upgradeGroup(up)].push(up)
  }
  return {
    groups,
    teaser: teaser && (teaser.requiresFlushCount ?? 0) > save.flushCount ? teaser : null,
  }
}

export interface ShopAdvice {
  bestValueId: string | null
  bestTapId: string | null
  bestIdleId: string | null
  milestoneId: string | null
  recommendedId: string | null
}

export function adviseShop(save: PlayerSaveV2, buyCount = 1): ShopAdvice {
  let bestValue: { id: string; value: number } | null = null
  let bestTap: { id: string; value: number } | null = null
  let bestIdle: { id: string; value: number } | null = null
  let milestone: { id: string; remaining: number } | null = null

  for (const gen of visibleGenerators(save)) {
    if (!generatorUnlocked(save, gen)) continue
    const level = save.generators[gen.id] ?? 0
    const scored = scoreGeneratorBuy(save, gen, buyCount)
    if (scored && Number.isFinite(scored.value)) {
      if (!bestValue || scored.value > bestValue.value)
        bestValue = { id: gen.id, value: scored.value }
      if (!bestIdle || scored.value > bestIdle.value) bestIdle = { id: gen.id, value: scored.value }
    }
    const next = nextGeneratorMilestone(gen, level)
    if (next) {
      const remaining = next.level - level
      if (remaining > 0 && remaining <= 10 && (!milestone || remaining < milestone.remaining)) {
        milestone = { id: gen.id, remaining }
      }
    }
  }

  for (const up of UPGRADES) {
    const scored = scoreUpgradeBuy(save, up)
    if (!scored || !Number.isFinite(scored.value)) continue
    if (!bestValue || scored.value > bestValue.value) bestValue = { id: up.id, value: scored.value }
    if (scored.lane === 'tap' && (!bestTap || scored.value > bestTap.value)) {
      bestTap = { id: up.id, value: scored.value }
    }
    if (scored.lane === 'idle' && (!bestIdle || scored.value > bestIdle.value)) {
      bestIdle = { id: up.id, value: scored.value }
    }
  }

  const recommended =
    milestone?.remaining && milestone.remaining <= 5 ? milestone.id : (bestValue?.id ?? null)
  return {
    bestValueId: bestValue?.id ?? null,
    bestTapId: bestTap?.id ?? null,
    bestIdleId: bestIdle?.id ?? null,
    milestoneId: milestone?.id ?? null,
    recommendedId: recommended,
  }
}

export function badgeForItem(id: string, advice: ShopAdvice): ShopBadge | null {
  if (advice.recommendedId === id && advice.milestoneId === id) return 'MILESTONE'
  if (advice.recommendedId === id) return 'RECOMMENDED'
  if (advice.bestValueId === id) return 'BEST_VALUE'
  if (advice.bestTapId === id) return 'BEST_TAP'
  if (advice.bestIdleId === id) return 'BEST_IDLE'
  if (advice.milestoneId === id) return 'MILESTONE'
  return null
}

export interface QuickShopPick {
  kind: 'generator' | 'upgrade'
  id: string
  reason: 'recommended' | 'milestone' | 'tap' | 'idle'
}

export function quickShopPicks(save: PlayerSaveV2): QuickShopPick[] {
  const advice = adviseShop(save, 1)
  const picks: QuickShopPick[] = []
  const used = new Set<string>()
  const push = (
    id: string | null,
    kind: QuickShopPick['kind'],
    reason: QuickShopPick['reason'],
  ) => {
    if (!id || used.has(id)) return
    used.add(id)
    picks.push({ kind, id, reason })
  }
  push(advice.recommendedId, GENERATOR_KIND(advice.recommendedId), 'recommended')
  push(advice.milestoneId, 'generator', 'milestone')
  push(advice.bestTapId, 'upgrade', 'tap')
  push(advice.bestIdleId, GENERATOR_KIND(advice.bestIdleId), 'idle')
  return picks.slice(0, 4)
}

function GENERATOR_KIND(id: string | null): 'generator' | 'upgrade' {
  return id && GENERATORS.some((g) => g.id === id) ? 'generator' : 'upgrade'
}
