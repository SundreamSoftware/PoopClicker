import { FLUSH_MILESTONES } from '../../content/flushMilestones'
import { WORLDS } from '../../content/worlds'
import { ECONOMY, flushPowerGain, flushPowerMultiplier } from '../economy/formulas'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import { isUtcDateInFuture, toUtcDateKey } from '../time/TimeService'
import { computeProduction } from './production'

export interface FlushPreview {
  runPPEarned: LargeNumber
  flushPowerGain: number
  firstFlushBonusApplied: boolean
  newFlushPower: number
  newGlobalMultiplier: number
  nextTapBonusPercent: number
  nextIdleBonusPercent: number
}

export function milestoneEventBonus(save: PlayerSaveV2): number {
  return FLUSH_MILESTONES.filter(
    (m) => save.flushCount >= m.flushCount && m.eventBonusPercent != null,
  ).reduce((max, m) => Math.max(max, m.eventBonusPercent ?? 0), 0)
}

export function buildFlushPreview(save: PlayerSaveV2, now: number): FlushPreview {
  const runPPEarned = LargeNumber.deserialize(save.runPPEarned)
  const today = toUtcDateKey(now)
  const claimed = save.firstFlushOfDayClaimedDate
  const firstFlushBonusApplied = claimed !== today && !isUtcDateInFuture(claimed, now)
  const gain = flushPowerGain(
    runPPEarned,
    firstFlushBonusApplied ? ECONOMY.firstFlushOfDayBonus : 0,
  )
  const newFlushPower = save.flushPower + gain
  const newGlobalMultiplier = flushPowerMultiplier(newFlushPower)
  const bonus = newGlobalMultiplier - 1
  return {
    runPPEarned,
    flushPowerGain: gain,
    firstFlushBonusApplied,
    newFlushPower,
    newGlobalMultiplier,
    nextTapBonusPercent: bonus,
    nextIdleBonusPercent: bonus,
  }
}

export function canFlush(save: PlayerSaveV2): boolean {
  return LargeNumber.deserialize(save.runPPEarned).gte(ECONOMY.firstFlushRequirement)
}

function applyFlushMilestones(save: PlayerSaveV2, newFlushCount: number): PlayerSaveV2 {
  let next = { ...save, flushCount: newFlushCount }
  const ownedSkins = new Set(next.ownedSkins)
  const unlockedWorlds = new Set(next.unlockedWorlds)

  for (const milestone of FLUSH_MILESTONES) {
    if (newFlushCount < milestone.flushCount) continue
    if (milestone.unlockAutoBuy) next.autoBuyUnlocked = true
    if (milestone.permanentProductionBonus) {
      next.permanentProductionBonus = Math.max(
        next.permanentProductionBonus,
        milestone.permanentProductionBonus,
      )
    }
    if (milestone.unlockSkinId) ownedSkins.add(milestone.unlockSkinId)
    if (milestone.unlockWorldId) unlockedWorlds.add(milestone.unlockWorldId)
  }

  for (const world of WORLDS) {
    if (newFlushCount >= world.unlockFlushCount) unlockedWorlds.add(world.id)
  }

  next.ownedSkins = Array.from(ownedSkins)
  next.unlockedWorlds = Array.from(unlockedWorlds)
  return next
}

export function performFlush(
  save: PlayerSaveV2,
  now: number,
): {
  save: PlayerSaveV2
  preview: FlushPreview
  ok: boolean
  reason?: string
} {
  if (!canFlush(save)) {
    return { save, preview: buildFlushPreview(save, now), ok: false, reason: 'requirement' }
  }

  const preview = buildFlushPreview(save, now)
  const today = toUtcDateKey(now)
  let next: PlayerSaveV2 = {
    ...save,
    currentPP: { m: 0, e: 0 },
    runPPEarned: { m: 0, e: 0 },
    purchasedRunUpgrades: {},
    generators: {},
    claimedGeneratorMilestones: {},
    flushPower: preview.newFlushPower,
    flushCount: save.flushCount + 1,
    firstFlushOfDayClaimedDate: preview.firstFlushBonusApplied
      ? today
      : save.firstFlushOfDayClaimedDate,
    activeBoosts: [],
    activeEvent: null,
    sessionTapCount: 0,
    tutorialFlags: { ...save.tutorialFlags, flush: true },
  }

  next = applyFlushMilestones(next, next.flushCount)

  const startBonusMinutes = FLUSH_MILESTONES.filter(
    (m) => next.flushCount >= m.flushCount && m.startBonusPpMinutes,
  ).reduce((max, m) => Math.max(max, m.startBonusPpMinutes ?? 0), 0)
  const startGenLevel = FLUSH_MILESTONES.filter(
    (m) => next.flushCount >= m.flushCount && m.startGeneratorBonusLevel,
  ).reduce((max, m) => Math.max(max, m.startGeneratorBonusLevel ?? 0), 0)

  if (startGenLevel > 0) {
    next.generators = { ...next.generators, plunger_intern: startGenLevel }
  }

  if (startBonusMinutes > 0) {
    const production = computeProduction(next, 0, now)
    const bonus = production.pps.mul(startBonusMinutes * 60)
    next = {
      ...next,
      currentPP: bonus.serialize(),
      runPPEarned: bonus.serialize(),
      lifetimePPEarned: LargeNumber.deserialize(save.lifetimePPEarned).add(bonus).serialize(),
    }
  }

  return { save: next, preview, ok: true }
}
