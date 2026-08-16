import { FLUSH_MILESTONES } from '../../content/flushMilestones'
import { GENERATORS } from '../../content/generators'
import { UPGRADES } from '../../content/upgrades'
import { WORLDS } from '../../content/worlds'
import { ECONOMY, geometricCost } from '../economy/formulas'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import type { NextGoal } from '../types/gameTypes'
import { canFlush, buildFlushPreview } from './flush'
import { nextGeneratorMilestone, upgradeRequirementMet } from './shopAdvisor'

export function computeNextBestGoals(save: PlayerSaveV2, now: number): NextGoal[] {
  const goals: NextGoal[] = []
  const balance = LargeNumber.deserialize(save.currentPP)

  const claimable = save.dailyChallenges.filter((c) => c.completed && !c.claimed).length
  if (claimable > 0) {
    goals.push({
      kind: 'claim',
      title: 'CLAIM REWARD',
      subtitle: `${claimable} daily ready`,
      progress: 1,
    })
  }

  const dailyDone = save.dailyChallenges.filter((c) => c.completed).length
  if (save.dailyChallenges.length > 0 && dailyDone < 3 && claimable === 0) {
    goals.push({
      kind: 'daily',
      title: 'DAILY',
      subtitle: `${dailyDone} / 3`,
      progress: dailyDone / 3,
    })
  }

  let nearMilestone: NextGoal | null = null
  for (const gen of GENERATORS) {
    if ((gen.unlockFlushCount ?? 0) > save.flushCount) continue
    const level = save.generators[gen.id] ?? 0
    if (level <= 0) continue
    const next = nextGeneratorMilestone(gen, level)
    if (!next) continue
    const remaining = next.level - level
    if (remaining > 8) continue
    const cost = geometricCost(LargeNumber.from(gen.baseCost), gen.costGrowth, level)
    nearMilestone = {
      kind: 'milestone',
      title: `NEXT GOAL`,
      subtitle: `${gen.name} to Lv. ${next.level} · ${remaining} left · ×${next.multiplier}`,
      progress: Math.min(1, level / next.level),
    }
    if (remaining <= 5 || balance.gte(cost)) break
  }
  if (nearMilestone) goals.push(nearMilestone)

  const runPP = LargeNumber.deserialize(save.runPPEarned)
  const nextFlushMilestone = FLUSH_MILESTONES.find((m) => m.flushCount > save.flushCount)
  if (canFlush(save)) {
    goals.push({
      kind: 'flush',
      title: 'FLUSH READY',
      subtitle: `+${buildFlushPreview(save, now).flushPowerGain} Flush Power`,
      progress: 1,
    })
  } else if (runPP.toNumber() > ECONOMY.firstFlushRequirement * 0.35) {
    goals.push({
      kind: 'flush',
      title: 'NEXT FLUSH',
      subtitle: `+${buildFlushPreview(save, now).flushPowerGain} Flush Power`,
      progress: Math.min(1, runPP.div(ECONOMY.firstFlushRequirement).toNumber()),
    })
  }

  const nextWorld = WORLDS.find(
    (w) => w.unlockFlushCount > save.flushCount && !save.unlockedWorlds.includes(w.id),
  )
  if (nextWorld && save.flushCount + 1 >= nextWorld.unlockFlushCount) {
    goals.push({
      kind: 'world',
      title: 'NEXT WORLD',
      subtitle: `${nextWorld.name} at ${nextWorld.unlockFlushCount} Flushes`,
      progress: Math.min(1, save.flushCount / nextWorld.unlockFlushCount),
    })
  }

  if (!nearMilestone) {
    const nextUpgrade = UPGRADES.find(
      (u) => (save.purchasedRunUpgrades[u.id] ?? 0) < u.maxLevel && upgradeRequirementMet(save, u),
    )
    if (nextUpgrade) {
      const level = save.purchasedRunUpgrades[nextUpgrade.id] ?? 0
      const cost = geometricCost(
        LargeNumber.from(nextUpgrade.baseCost),
        nextUpgrade.costGrowth,
        level,
      )
      goals.push({
        kind: 'upgrade',
        title: 'NEXT UPGRADE',
        subtitle: nextUpgrade.name,
        progress: Math.min(1, balance.div(cost).toNumber()),
      })
    }
  }

  if (nextFlushMilestone && canFlush(save)) {
    goals.push({
      kind: 'flush',
      title: 'NEXT MILESTONE',
      subtitle: nextFlushMilestone.name,
      progress: Math.min(1, save.flushCount / nextFlushMilestone.flushCount),
    })
  }

  return goals.slice(0, 3)
}
