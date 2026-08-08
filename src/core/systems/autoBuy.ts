import { GENERATORS } from '../../content/generators'
import { UPGRADES } from '../../content/upgrades'
import { geometricCost, geometricSeriesCost, maxAffordableCount } from '../economy/formulas'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'

export interface AutoBuyDecision {
  kind: 'generator' | 'upgrade'
  id: string
  count: number
}

/**
 * Conservative auto-buy: prefer cheapest affordable generator level, else cheapest upgrade.
 * At most one purchase decision per tick.
 */
export function decideAutoBuy(save: PlayerSaveV2): AutoBuyDecision | null {
  if (!save.autoBuyUnlocked || !save.autoBuyEnabled) return null
  const balance = LargeNumber.deserialize(save.currentPP)
  if (balance.lte(0)) return null

  let bestGen: { id: string; cost: LargeNumber; count: number } | null = null
  for (const gen of GENERATORS) {
    if ((gen.unlockFlushCount ?? 0) > save.flushCount) continue
    const level = save.generators[gen.id] ?? 0
    const count = Math.min(
      1,
      maxAffordableCount(balance, LargeNumber.from(gen.baseCost), gen.costGrowth, level),
    )
    if (count <= 0) continue
    const cost = geometricSeriesCost(LargeNumber.from(gen.baseCost), gen.costGrowth, level, count)
    if (!bestGen || cost.lt(bestGen.cost)) bestGen = { id: gen.id, cost, count }
  }
  if (bestGen) return { kind: 'generator', id: bestGen.id, count: bestGen.count }

  let bestUp: { id: string; cost: LargeNumber } | null = null
  for (const up of UPGRADES) {
    const level = save.purchasedRunUpgrades[up.id] ?? 0
    if (level >= up.maxLevel) continue
    if ((up.requiresFlushCount ?? 0) > save.flushCount) continue
    if (up.requiresWorldId && !save.unlockedWorlds.includes(up.requiresWorldId)) continue
    if (up.requiresUpgradeId && !(save.purchasedRunUpgrades[up.requiresUpgradeId] > 0)) continue
    const cost = geometricCost(LargeNumber.from(up.baseCost), up.costGrowth, level)
    if (balance.lt(cost)) continue
    if (!bestUp || cost.lt(bestUp.cost)) bestUp = { id: up.id, cost }
  }
  if (bestUp) return { kind: 'upgrade', id: bestUp.id, count: 1 }
  return null
}
