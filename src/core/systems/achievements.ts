import { ACHIEVEMENTS } from '../../content/achievements'
import { SKINS } from '../../content/skins'
import { WORLDS } from '../../content/worlds'
import { EVENTS } from '../../content/events'
import { GENERATORS } from '../../content/generators'
import { LargeNumber } from '../numbers/LargeNumber'
import type { AchievementSaveState, PlayerSaveV2 } from '../save/saveSchema'
import type { AchievementMetric } from '../types/gameTypes'

export function collectionPercent(save: PlayerSaveV2): number {
  const skinPct = save.ownedSkins.length / SKINS.length
  const worldPct = save.unlockedWorlds.length / WORLDS.length
  const eventPct =
    Object.keys(save.eventCompletions).filter((id) => (save.eventCompletions[id] ?? 0) > 0).length /
    EVENTS.length
  const genPct =
    Object.values(save.generators).filter((level) => level > 0).length / GENERATORS.length
  const achPct =
    Object.values(save.achievements).filter((a) => a.completed).length / ACHIEVEMENTS.length
  const total = ((skinPct + worldPct + eventPct + genPct + achPct) / 5) * 100
  return Math.min(100, Math.floor(total))
}

function metricValue(
  save: PlayerSaveV2,
  metric: AchievementMetric,
  session: { goldenInSession: number; absenceMs: number; flushWithCorny: number },
): number {
  switch (metric) {
    case 'tapCount':
      return save.tapCount
    case 'lifetimePPEarned':
      return save.lifetimePPEarned ? LargeNumber.deserialize(save.lifetimePPEarned).toNumber() : 0
    case 'highestCPS':
      return save.highestCPS
    case 'flushCount':
      return save.flushCount
    case 'goldenPoopsCaught':
      return save.goldenPoopsCaught
    case 'clogsCompleted':
      return save.clogsCompleted
    case 'totalGeneratorLevels':
      return Object.values(save.generators).reduce((a, b) => a + b, 0)
    case 'highestGeneratorLevel':
      return Math.max(0, ...Object.values(save.generators), 0)
    case 'ownedSkins':
      return save.ownedSkins.length
    case 'unlockedWorlds':
      return save.unlockedWorlds.length
    case 'achievementsCompleted':
      return Object.values(save.achievements).filter((a) => a.completed).length
    case 'eventsCompleted':
      return save.eventsCompleted
    case 'sessionTapCount':
      return save.sessionTapCount
    case 'officeSessionMs':
      return save.officeSessionMs
    case 'flushWithSkin':
      return session.flushWithCorny
    case 'goldenInSession':
      return session.goldenInSession
    case 'clogsFailed':
      return save.clogsFailed
    case 'absenceMs':
      return session.absenceMs
    case 'highestPPS':
      return LargeNumber.deserialize(save.highestPPS).toNumber()
    case 'dailyChallengesCompleted':
      return save.dailyChallengesCompletedTotal
    case 'collectionPercent':
      return collectionPercent(save)
    default:
      return 0
  }
}

function defaultAchievementState(): AchievementSaveState {
  return {
    progress: 0,
    completed: false,
    claimed: false,
    completedAt: null,
    discovered: false,
  }
}

export function syncAchievements(
  save: PlayerSaveV2,
  now: number,
  session = { goldenInSession: 0, absenceMs: 0, flushWithCorny: 0 },
): { save: PlayerSaveV2; newlyCompleted: string[] } {
  const achievements = { ...save.achievements }
  const newlyCompleted: string[] = []
  let ownedSkins = [...save.ownedSkins]

  for (const def of ACHIEVEMENTS) {
    const prev = achievements[def.id] ?? defaultAchievementState()
    const value = metricValue(save, def.metric, session)
    const progress = Math.max(prev.progress, value)
    const completed = prev.completed || progress >= def.target
    const discovered = prev.discovered || completed || !def.hidden
    if (completed && !prev.completed) newlyCompleted.push(def.id)
    achievements[def.id] = {
      ...prev,
      progress,
      completed,
      discovered,
      completedAt: completed ? (prev.completedAt ?? now) : null,
    }
  }

  // Auto-grant achievement skins on completion (ownership), rewards claimed separately
  for (const id of newlyCompleted) {
    const def = ACHIEVEMENTS.find((a) => a.id === id)
    if (def?.rewardSkinId && !ownedSkins.includes(def.rewardSkinId)) {
      ownedSkins.push(def.rewardSkinId)
    }
  }

  // Unlock skins gated by achievements
  for (const skin of SKINS) {
    if (skin.unlock.type === 'achievement') {
      const state = achievements[skin.unlock.achievementId]
      if (state?.completed && !ownedSkins.includes(skin.id)) ownedSkins.push(skin.id)
    }
  }

  return {
    save: {
      ...save,
      achievements,
      ownedSkins: Array.from(new Set(ownedSkins)),
    },
    newlyCompleted,
  }
}

export function claimAchievement(
  save: PlayerSaveV2,
  achievementId: string,
): { save: PlayerSaveV2; ok: boolean; gtp: number; reason?: string } {
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId)
  if (!def) return { save, ok: false, gtp: 0, reason: 'missing' }
  const state = save.achievements[achievementId]
  if (!state?.completed) return { save, ok: false, gtp: 0, reason: 'incomplete' }
  if (state.claimed) return { save, ok: false, gtp: 0, reason: 'already_claimed' }

  let ownedSkins = [...save.ownedSkins]
  if (def.rewardSkinId && !ownedSkins.includes(def.rewardSkinId)) {
    ownedSkins.push(def.rewardSkinId)
  }

  return {
    save: {
      ...save,
      gtp: save.gtp + def.rewardGtp,
      ownedSkins,
      achievements: {
        ...save.achievements,
        [achievementId]: { ...state, claimed: true, discovered: true },
      },
    },
    ok: true,
    gtp: def.rewardGtp,
  }
}
