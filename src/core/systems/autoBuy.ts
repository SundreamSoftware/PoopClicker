import { GENERATORS } from '../../content/generators'
import { ROYAL_FLUSH_BY_ID } from '../../content/royalFlush'
import { UPGRADES } from '../../content/upgrades'
import { geometricCost, maxAffordableCount } from '../economy/formulas'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import type { AutoBuyStrategy } from '../types/gameTypes'
import { scoreGeneratorBuy, scoreUpgradeBuy } from './shopAdvisor'

export interface AutoBuyDecision {
  kind: 'generator' | 'upgrade'
  id: string
  count: number
}

export const AUTO_BUY_SPEED_NODE_ID = 'rf_autobuy_speed'

export const AUTO_BUY = {
  baseIntervalMs: 15_000,
  intervalStepMs: 1_000,
  maxSpeedLevel: 10,
  minIntervalMs: 5_000,
  /** Legacy PP curve — speed is now Royal Flush / GTP. Kept for docs/tests. */
  speedBaseCost: 25_000,
  speedCostGrowth: 6,
} as const

export const AUTO_BUY_STRATEGIES: AutoBuyStrategy[] = ['balanced', 'production', 'tap', 'smart']

export function clampAutoBuySpeedLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(AUTO_BUY.maxSpeedLevel, Math.floor(level)))
}

export function autoBuySpeedLevelFromSave(save: PlayerSaveV2): number {
  const fromTree = save.royalFlushLevels[AUTO_BUY_SPEED_NODE_ID] ?? 0
  return clampAutoBuySpeedLevel(Math.max(fromTree, save.autoBuySpeedLevel ?? 0))
}

export function autoBuyIntervalMs(speedLevel: number): number {
  const level = clampAutoBuySpeedLevel(speedLevel)
  return Math.max(AUTO_BUY.minIntervalMs, AUTO_BUY.baseIntervalMs - level * AUTO_BUY.intervalStepMs)
}

export function autoBuyIntervalMsForSave(save: PlayerSaveV2): number {
  return autoBuyIntervalMs(autoBuySpeedLevelFromSave(save))
}

function resolveStrategy(save: PlayerSaveV2): AutoBuyStrategy {
  const raw = save.autoBuyStrategy
  return AUTO_BUY_STRATEGIES.includes(raw) ? raw : 'balanced'
}

function affordableGeneratorCount(save: PlayerSaveV2, genId: string): number {
  const gen = GENERATORS.find((g) => g.id === genId)
  if (!gen) return 0
  const balance = LargeNumber.deserialize(save.currentPP)
  const level = save.generators[gen.id] ?? 0
  return Math.min(
    1,
    maxAffordableCount(balance, LargeNumber.from(gen.baseCost), gen.costGrowth, level),
  )
}

/**
 * One purchase per decision. Strategy picks among affordable unlocked items.
 */
export function decideAutoBuy(save: PlayerSaveV2): AutoBuyDecision | null {
  if (!save.autoBuyUnlocked || !save.autoBuyEnabled) return null
  const balance = LargeNumber.deserialize(save.currentPP)
  if (balance.lte(0)) return null
  const strategy = resolveStrategy(save)

  type Candidate = AutoBuyDecision & { score: number; lane: 'tap' | 'idle' | 'other' }
  const candidates: Candidate[] = []

  if (save.autoBuyPreferences.generators) {
    for (const gen of GENERATORS) {
      if ((gen.unlockFlushCount ?? 0) > save.flushCount) continue
      const count = affordableGeneratorCount(save, gen.id)
      if (count <= 0) continue
      const scored = scoreGeneratorBuy(save, gen, 1)
      if (!scored) continue
      candidates.push({
        kind: 'generator',
        id: gen.id,
        count: 1,
        score: scored.value,
        lane: 'idle',
      })
    }
  }

  if (save.autoBuyPreferences.upgrades) {
    for (const up of UPGRADES) {
      const scored = scoreUpgradeBuy(save, up)
      if (!scored) continue
      if (balance.lt(scored.cost)) continue
      candidates.push({
        kind: 'upgrade',
        id: up.id,
        count: 1,
        score: scored.value,
        lane: scored.lane,
      })
    }
  }

  if (!candidates.length) return null

  const pick = (list: Candidate[]): Candidate =>
    list.reduce((best, next) => (next.score > best.score ? next : best))

  if (strategy === 'production') {
    const idle = candidates.filter((c) => c.lane === 'idle' || c.kind === 'generator')
    const chosen = idle.length ? pick(idle) : pick(candidates)
    return { kind: chosen.kind, id: chosen.id, count: 1 }
  }
  if (strategy === 'tap') {
    const tap = candidates.filter((c) => c.lane === 'tap')
    const chosen = tap.length ? pick(tap) : pick(candidates)
    return { kind: chosen.kind, id: chosen.id, count: 1 }
  }
  const chosen = pick(candidates)
  return { kind: chosen.kind, id: chosen.id, count: 1 }
}

/** @deprecated Speed is purchased with GTP via Royal Flush. */
export function autoBuySpeedCost(speedLevel: number): LargeNumber {
  const level = clampAutoBuySpeedLevel(speedLevel)
  return geometricCost(LargeNumber.from(AUTO_BUY.speedBaseCost), AUTO_BUY.speedCostGrowth, level)
}

export function autoBuySpeedGtpCost(speedLevel: number): number {
  const node = ROYAL_FLUSH_BY_ID[AUTO_BUY_SPEED_NODE_ID]
  const level = clampAutoBuySpeedLevel(speedLevel)
  if (!node) return Number.POSITIVE_INFINITY
  return Math.floor(node.baseCost * node.costGrowth ** level)
}
