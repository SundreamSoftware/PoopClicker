import { CHALLENGE_TEMPLATES } from '../../content/challenges'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import { daysBetweenUtc, toUtcDateKey } from '../time/TimeService'
import type {
  ChallengeCategory,
  ChallengeTemplate,
  DailyChallengeInstance,
} from '../types/gameTypes'
import { computeProduction } from './production'

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scaleTarget(
  template: ChallengeTemplate,
  save: PlayerSaveV2,
  pps: LargeNumber,
  critChance: number,
): number {
  const ppsNum = Math.max(1, pps.toNumber())
  const totalGenLevels = Object.values(save.generators).reduce((a, b) => a + b, 0)
  switch (template.scaling) {
    case 'pps':
      return Math.max(
        template.baseTarget,
        Math.floor(ppsNum * 60 * (template.metric === 'spend_pp' ? 2 : 1.5)),
      )
    case 'taps': {
      const expectedTaps = Math.max(
        template.baseTarget,
        150 + save.flushCount * 40 + Math.floor(save.highestCPS * 20),
      )
      if (template.metric === 'crit_taps') {
        const expectedCrits = expectedTaps * critChance
        return Math.max(template.baseTarget, Math.ceil(expectedCrits))
      }
      return expectedTaps
    }
    case 'generators':
      return Math.max(template.baseTarget, 3 + Math.floor(totalGenLevels / 20) + save.flushCount)
    case 'flush':
      return Math.max(template.baseTarget, 1 + Math.floor(save.flushCount / 10))
    default:
      if (template.metric === 'cps') {
        return Math.min(15, Math.max(5, Math.floor(4 + save.highestCPS * 0.5)))
      }
      if (template.metric === 'combo') {
        return Math.min(40, Math.max(10, 10 + save.flushCount))
      }
      if (template.metric === 'generator_level') {
        return Math.max(10, 10 + Math.floor(totalGenLevels / 15))
      }
      return template.baseTarget
  }
}

function pickByCategory(
  category: ChallengeCategory,
  rng: () => number,
  used: Set<string>,
  excludeTemplateIds: Set<string>,
): ChallengeTemplate {
  const pool = CHALLENGE_TEMPLATES.filter(
    (t) => t.category === category && !used.has(t.id) && !excludeTemplateIds.has(t.id),
  )
  const list =
    pool.length > 0
      ? pool
      : CHALLENGE_TEMPLATES.filter(
          (t) => t.category === category && !excludeTemplateIds.has(t.id),
        )
  const fallback = CHALLENGE_TEMPLATES.filter((t) => t.category === category)
  return list[Math.floor(rng() * list.length)] ?? fallback[0] ?? CHALLENGE_TEMPLATES[0]
}

export function generateDailyChallenges(
  save: PlayerSaveV2,
  now: number,
  pps: LargeNumber,
  excludeTemplateIds: string[] = [],
): DailyChallengeInstance[] {
  const dateKey = toUtcDateKey(now)
  const rng = mulberry32(hashSeed(`${dateKey}:${save.flushCount}:${Math.floor(pps.toNumber())}`))
  const used = new Set<string>()
  const excluded = new Set(excludeTemplateIds)
  const categories: ChallengeCategory[] = ['activity', 'economy', 'event']
  const rewards = [8, 10, 18]
  const critChance = computeProduction(save, 0, now).critChance

  return categories.map((category, index) => {
    const template = pickByCategory(category, rng, used, excluded)
    used.add(template.id)
    const target = scaleTarget(template, save, pps, critChance)
    return {
      templateId: template.id,
      category,
      metric: template.metric,
      name: template.name,
      description: `${template.description}: ${target.toLocaleString()}`,
      target,
      progress: 0,
      completed: false,
      claimed: false,
      rewardGtp: rewards[index] ?? template.rewardGtp,
      rewardBoostMinutes: index === 2 ? 10 : 0,
    }
  })
}

export function rerollChallengeAt(
  save: PlayerSaveV2,
  index: number,
  now: number,
  pps: LargeNumber,
): PlayerSaveV2 {
  const existing = save.dailyChallenges[index]
  if (!existing) return save
  const excludeTemplateIds = save.dailyChallenges.map((c) => c.templateId)
  const fresh = generateDailyChallenges(save, now, pps, excludeTemplateIds)
  const category = existing.category
  const replacement =
    fresh.find((c) => c.category === category && c.templateId !== existing.templateId) ??
    fresh.find((c) => c.category === category) ??
    fresh[index]
  if (!replacement) return save
  const dailyChallenges = save.dailyChallenges.map((c, i) => (i === index ? replacement : c))
  return { ...save, dailyChallenges }
}

export function ensureDailyState(save: PlayerSaveV2, now: number, pps: LargeNumber): PlayerSaveV2 {
  const today = toUtcDateKey(now)
  if (save.dailyChallengeDate === today && save.dailyChallenges.length === 3) return save
  return {
    ...save,
    dailyChallengeDate: today,
    dailyChallenges: generateDailyChallenges(save, now, pps),
    dailyChestClaimed: false,
    dailyRerollsUsed: 0,
  }
}

export function progressChallenge(
  save: PlayerSaveV2,
  metric: DailyChallengeInstance['metric'],
  amount: number,
): PlayerSaveV2 {
  if (amount <= 0) return save
  let changed = false
  const dailyChallenges = save.dailyChallenges.map((challenge) => {
    if (challenge.metric !== metric || challenge.completed) return challenge
    const nextProgress =
      metric === 'cps' || metric === 'combo' || metric === 'generator_level'
        ? Math.max(challenge.progress, amount)
        : challenge.progress + amount
    const completed = nextProgress >= challenge.target
    if (nextProgress !== challenge.progress || completed !== challenge.completed) changed = true
    return { ...challenge, progress: Math.min(nextProgress, challenge.target * 2), completed }
  })
  return changed ? { ...save, dailyChallenges } : save
}

export function claimChallenge(
  save: PlayerSaveV2,
  index: number,
  now = Date.now(),
): { save: PlayerSaveV2; gtp: number; ok: boolean; reason?: string } {
  const challenge = save.dailyChallenges[index]
  if (!challenge) return { save, gtp: 0, ok: false, reason: 'missing' }
  if (!challenge.completed) return { save, gtp: 0, ok: false, reason: 'incomplete' }
  if (challenge.claimed) return { save, gtp: 0, ok: false, reason: 'already_claimed' }

  const dailyChallenges = save.dailyChallenges.map((c, i) =>
    i === index ? { ...c, claimed: true } : c,
  )
  let next: PlayerSaveV2 = {
    ...save,
    dailyChallenges,
    gtp: save.gtp + challenge.rewardGtp,
    dailyChallengesCompletedTotal: save.dailyChallengesCompletedTotal + 1,
  }
  if (challenge.rewardBoostMinutes > 0) {
    const expiresAt = now + challenge.rewardBoostMinutes * 60_000
    next = {
      ...next,
      activeBoosts: [
        ...next.activeBoosts,
        {
          id: `daily_boost_${index}_${expiresAt}`,
          label: 'Daily Boost',
          tapMultiplier: 2,
          idleMultiplier: 1.5,
          expiresAt,
        },
      ],
    }
  }
  return { save: next, gtp: challenge.rewardGtp, ok: true }
}

export function claimDailyChest(save: PlayerSaveV2): {
  save: PlayerSaveV2
  gtp: number
  ok: boolean
  reason?: string
} {
  if (save.dailyChestClaimed) return { save, gtp: 0, ok: false, reason: 'already_claimed' }
  const allClaimed =
    save.dailyChallenges.length === 3 && save.dailyChallenges.every((c) => c.claimed)
  if (!allClaimed) return { save, gtp: 0, ok: false, reason: 'incomplete' }
  const gtp = 40 + save.dailyStreakCycle * 5
  return {
    save: {
      ...save,
      dailyChestClaimed: true,
      gtp: save.gtp + gtp,
    },
    gtp,
    ok: true,
  }
}

export function processStreak(
  save: PlayerSaveV2,
  now: number,
): {
  save: PlayerSaveV2
  claimed: boolean
  rewardGtp: number
  streakBroken: boolean
  saverUsed: boolean
} {
  const today = toUtcDateKey(now)
  if (save.lastDailyClaim === today) {
    return { save, claimed: false, rewardGtp: 0, streakBroken: false, saverUsed: false }
  }

  let streak = save.dailyStreak
  let cycle = save.dailyStreakCycle
  let saverCharges = save.streakSaverCharges
  let saverUsed = false
  let streakBroken = false

  if (!save.lastDailyClaim) {
    streak = 1
  } else {
    const gap = daysBetweenUtc(save.lastDailyClaim, now)
    if (gap === 1) {
      streak += 1
    } else if (gap > 1) {
      if (saverCharges > 0 && gap === 2) {
        saverCharges -= 1
        saverUsed = true
        streak += 1
      } else {
        streakBroken = true
        streak = 1
      }
    } else if (gap <= 0) {
      return { save, claimed: false, rewardGtp: 0, streakBroken: false, saverUsed: false }
    }
  }

  if (streak > 7) {
    streak = 1
    cycle = Math.min(cycle + 1, 5)
  }

  const rewardTable = [5, 8, 0, 12, 0, 20, 50]
  let rewardGtp = Math.floor((rewardTable[streak - 1] ?? 5) * (1 + (cycle - 1) * 0.15))
  const activeBoosts = [...save.activeBoosts]
  if (streak === 3) {
    activeBoosts.push({
      id: `streak_boost_${today}`,
      label: 'Streak Boost',
      tapMultiplier: 2,
      idleMultiplier: 1,
      expiresAt: now + 15 * 60_000,
    })
  }
  if (streak === 5) {
    rewardGtp += 15
  }

  let lastStreakSaverEarnDate = save.lastStreakSaverEarnDate
  if (streak === 7 && save.lastStreakSaverEarnDate !== today) {
    saverCharges = Math.min(2, saverCharges + 1)
    lastStreakSaverEarnDate = today
  }

  return {
    save: {
      ...save,
      dailyStreak: streak,
      dailyStreakCycle: cycle,
      lastDailyClaim: today,
      streakSaverCharges: saverCharges,
      lastStreakSaverEarnDate,
      gtp: save.gtp + rewardGtp,
      activeBoosts,
    },
    claimed: true,
    rewardGtp,
    streakBroken,
    saverUsed,
  }
}

export function generateBathroomBreakCharges(
  save: PlayerSaveV2,
  now: number,
  intervalMs: number,
  maxCharges: number,
): PlayerSaveV2 {
  const elapsed = Math.max(0, now - save.lastBathroomBreakGeneration)
  const gained = Math.floor(elapsed / intervalMs)
  if (gained <= 0) return save
  const charges = Math.min(maxCharges, save.bathroomBreakCharges + gained)
  const consumedIntervals = Math.min(gained, maxCharges - save.bathroomBreakCharges)
  return {
    ...save,
    bathroomBreakCharges: charges,
    lastBathroomBreakGeneration:
      save.lastBathroomBreakGeneration + Math.max(1, consumedIntervals) * intervalMs,
  }
}
