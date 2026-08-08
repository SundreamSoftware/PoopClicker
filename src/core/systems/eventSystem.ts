import { EVENT_BY_ID, EVENTS } from '../../content/events'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import type { ActiveEventRuntime, FloatingTarget } from '../types/eventRuntime'
import { scheduleNextGoldenAt, scheduleNextRandomEventAt } from '../types/eventRuntime'
import type { EventType } from '../types/gameTypes'
import { milestoneEventBonus } from './flush'
import type { ProductionBreakdown } from './production'

const TP_STORM_POOL_MAX = 12
const PLUMBER_BAND_MIN = 4
const PLUMBER_BAND_MAX = 6
const PLUMBER_SUCCESS_RATIO = 0.55

/** uiPresentation values with runtime handling in eventSystem + EventOverlay. */
export const EVENT_UI_PRESENTATIONS_SUPPORTED = [
  'floating_target',
  'boss_bar',
  'banner_boost',
  'falling_objects',
  'cps_meter',
  'screen_shake_boost',
  'multi_target',
  'choice_cards',
] as const

export type EventUiPresentation = (typeof EVENT_UI_PRESENTATIONS_SUPPORTED)[number]

/** Maps content uiPresentation strings to event types that implement them. */
export const EVENT_TYPES_BY_UI_PRESENTATION: Record<EventUiPresentation, EventType[]> = {
  floating_target: ['golden_poop'],
  boss_bar: ['clogged_toilet', 'mega_clog'],
  banner_boost: ['burrito_rush'],
  falling_objects: ['toilet_paper_storm'],
  cps_meter: ['plumber_inspection'],
  screen_shake_boost: ['toilet_quake'],
  multi_target: ['golden_rain'],
  choice_cards: ['mystery_flush'],
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function spawnFloating(
  kind: FloatingTarget['kind'],
  now: number,
  lifeMs: number,
  index = 0,
): FloatingTarget {
  return {
    id: uid(kind),
    kind,
    x: 12 + ((index * 17 + Math.random() * 40) % 76),
    y: kind === 'tp_roll' ? -8 - Math.random() * 20 : 18 + Math.random() * 55,
    vx: (Math.random() - 0.5) * 0.08,
    vy: kind === 'tp_roll' ? 0.04 + Math.random() * 0.05 : (Math.random() - 0.5) * 0.03,
    bornAt: now,
    expiresAt: now + lifeMs,
    caught: false,
  }
}

function trimTargetPool(targets: FloatingTarget[], max: number, now: number): FloatingTarget[] {
  const live = targets.filter((t) => !t.caught && t.expiresAt > now)
  if (live.length <= max) return targets
  return [...targets.filter((t) => t.caught), ...live.slice(0, max)]
}

export function createEventRuntime(
  eventId: string,
  now: number,
  flushCount: number,
): ActiveEventRuntime | null {
  const def = EVENT_BY_ID[eventId]
  if (!def || flushCount < def.minFlushCount) return null

  const base: ActiveEventRuntime = {
    defId: def.id,
    type: def.type,
    startedAt: now,
    endsAt: now + def.durationMs,
    taps: 0,
    tapTarget: def.tapTarget ?? 0,
    completed: false,
    failed: false,
    rewardClaimed: false,
    targets: [],
    caughtCount: 0,
    inBandMs: 0,
    lastCpsSampleAt: now,
    phase: 1,
    phaseTapTarget: def.tapTarget ?? 0,
    mysteryRevealed: false,
    awaitingChoice: false,
    bandScore: 0,
  }

  switch (def.type) {
    case 'golden_poop':
      return { ...base, targets: [spawnFloating('golden', now, def.durationMs)] }
    case 'golden_rain':
      return {
        ...base,
        tapTarget: def.tapTarget ?? 5,
        targets: Array.from({ length: 5 }, (_, i) =>
          spawnFloating('golden', now, 5_000 + i * 800, i),
        ),
      }
    case 'toilet_paper_storm':
      return {
        ...base,
        tapTarget: def.tapTarget ?? 20,
        targets: Array.from({ length: 6 }, (_, i) =>
          spawnFloating('tp_roll', now, 4_000 + i * 500, i),
        ),
      }
    case 'mega_clog': {
      const total = def.tapTarget ?? 120
      return { ...base, phase: 1, phaseTapTarget: Math.ceil(total / 3), tapTarget: total }
    }
    case 'plumber_inspection':
    case 'mystery_flush':
      return { ...base, tapTarget: 0 }
    default:
      return base
  }
}

export function tickEventRuntime(
  runtime: ActiveEventRuntime,
  now: number,
  rollingCps: number,
  dtMs: number,
): ActiveEventRuntime {
  let next: ActiveEventRuntime = {
    ...runtime,
    targets: runtime.targets.map((t) => ({ ...t })),
  }

  next.targets = next.targets.map((t) => {
    if (t.caught) return t
    return {
      ...t,
      x: Math.min(92, Math.max(4, t.x + t.vx * dtMs)),
      y: Math.min(92, Math.max(-10, t.y + t.vy * dtMs)),
    }
  })

  if (next.type === 'toilet_paper_storm') {
    const live = next.targets.filter((t) => !t.caught && t.expiresAt > now)
    const spawnCount = Math.min(TP_STORM_POOL_MAX - live.length, Math.max(0, 5 - live.length))
    next.targets = trimTargetPool(
      [
        ...live,
        ...Array.from({ length: spawnCount }, (_, i) =>
          spawnFloating('tp_roll', now, 3_500, i + live.length),
        ),
      ],
      TP_STORM_POOL_MAX,
      now,
    )
  }

  if (next.type === 'golden_rain') {
    const live = next.targets.filter((t) => !t.caught && t.expiresAt > now)
    next.targets = [
      ...live,
      ...Array.from({ length: Math.max(0, 4 - live.length) }, (_, i) =>
        spawnFloating('golden', now, 3_500, i + live.length),
      ),
    ]
  }

  if (next.type === 'plumber_inspection' && !next.completed && !next.failed) {
    const inBand = rollingCps >= PLUMBER_BAND_MIN && rollingCps <= PLUMBER_BAND_MAX
    const inBandMs = next.inBandMs + (inBand ? dtMs : 0)
    const elapsed = Math.max(1, now - next.startedAt)
    next = { ...next, inBandMs, lastCpsSampleAt: now, bandScore: Math.min(1, inBandMs / elapsed) }
  }

  if (
    next.type === 'mega_clog' &&
    next.phase < 3 &&
    next.taps >= next.phase * next.phaseTapTarget
  ) {
    next = { ...next, phase: next.phase + 1 }
  }

  if (next.type === 'mystery_flush' && now >= next.endsAt && !next.mysteryRevealed) {
    next = { ...next, awaitingChoice: true }
  }

  return next
}

export function catchTarget(
  runtime: ActiveEventRuntime,
  targetId: string,
  now: number,
): { runtime: ActiveEventRuntime; caught: boolean } {
  const idx = runtime.targets.findIndex((t) => t.id === targetId && !t.caught && t.expiresAt > now)
  if (idx < 0) return { runtime, caught: false }
  const targets = runtime.targets.map((t, i) => (i === idx ? { ...t, caught: true } : t))
  const caughtCount = runtime.caughtCount + 1
  const taps = runtime.taps + 1
  let completed = runtime.completed
  if (
    (runtime.type === 'golden_poop' && caughtCount >= 1) ||
    (runtime.type === 'golden_rain' && caughtCount >= runtime.tapTarget) ||
    (runtime.type === 'toilet_paper_storm' && caughtCount >= runtime.tapTarget)
  ) {
    completed = true
  }
  return { runtime: { ...runtime, targets, caughtCount, taps, completed }, caught: true }
}

export function bossTap(runtime: ActiveEventRuntime): ActiveEventRuntime {
  if (runtime.type !== 'clogged_toilet' && runtime.type !== 'mega_clog') return runtime
  const taps = runtime.taps + 1
  let next: ActiveEventRuntime = { ...runtime, taps }
  if (next.type === 'mega_clog' && next.phase < 3 && taps >= next.phase * next.phaseTapTarget) {
    next = { ...next, phase: next.phase + 1 }
  }
  if (taps >= next.tapTarget) next = { ...next, completed: true }
  return next
}

export function evaluateEventCompletion(
  runtime: ActiveEventRuntime,
  now: number,
): { completed: boolean; failed: boolean; awaitingChoice: boolean } {
  if (runtime.rewardClaimed) return { completed: true, failed: false, awaitingChoice: false }

  const succeeded = (() => {
    switch (runtime.type) {
      case 'golden_poop':
      case 'golden_rain':
      case 'toilet_paper_storm':
        return runtime.completed
      case 'clogged_toilet':
      case 'mega_clog':
        return runtime.taps >= runtime.tapTarget
      case 'plumber_inspection':
        return now >= runtime.endsAt && runtime.bandScore >= PLUMBER_SUCCESS_RATIO
      case 'burrito_rush':
      case 'toilet_quake':
        return now >= runtime.endsAt
      case 'mystery_flush':
        return runtime.mysteryRevealed && runtime.rewardClaimed
      default:
        return runtime.completed
    }
  })()

  if (succeeded) return { completed: true, failed: false, awaitingChoice: false }
  if (runtime.type === 'mystery_flush' && now >= runtime.endsAt && !runtime.mysteryRevealed) {
    return { completed: false, failed: false, awaitingChoice: true }
  }
  if (now < runtime.endsAt) {
    return { completed: false, failed: false, awaitingChoice: runtime.awaitingChoice }
  }

  const failTypes: EventType[] = [
    'clogged_toilet',
    'mega_clog',
    'plumber_inspection',
    'golden_poop',
    'golden_rain',
    'toilet_paper_storm',
  ]
  return { completed: false, failed: failTypes.includes(runtime.type), awaitingChoice: false }
}

export function pickScheduledEvent(
  save: PlayerSaveV2,
  now: number,
): { kind: 'golden' | 'random'; id: string } | null {
  if (save.activeEvent) return null
  if (now >= save.nextGoldenPoopAt) return { kind: 'golden', id: 'golden_poop' }
  if (now >= save.nextRandomEventAt) {
    const candidates = EVENTS.filter(
      (e) =>
        e.type !== 'golden_poop' &&
        save.flushCount >= e.minFlushCount &&
        now - (save.lastEventEndedAt[e.id] ?? 0) >= e.cooldownMs,
    )
    if (!candidates.length) return null
    return { kind: 'random', id: candidates[Math.floor(Math.random() * candidates.length)].id }
  }
  return null
}

export function totalEventRewardMultiplier(
  save: PlayerSaveV2,
  productionEventBonus: number,
): number {
  return 1 + productionEventBonus + milestoneEventBonus(save)
}

export function computeEventRewards(
  defId: string,
  save: PlayerSaveV2,
  production: ProductionBreakdown,
): { pp: LargeNumber; gtp: number } {
  const def = EVENT_BY_ID[defId]
  if (!def) return { pp: LargeNumber.zero(), gtp: 0 }
  const mult = totalEventRewardMultiplier(save, production.eventRewardBonus)
  return {
    pp: production.pps.mul(def.rewardPpMinutes * 60).mul(mult),
    gtp: Math.floor(def.rewardGtp * mult),
  }
}

export function afterEventSchedule(
  save: PlayerSaveV2,
  now: number,
  type: EventType,
  goldenChanceBonus: number,
  luckBonus: number,
): PlayerSaveV2 {
  if (type === 'golden_poop') {
    return { ...save, nextGoldenPoopAt: scheduleNextGoldenAt(now, goldenChanceBonus) }
  }
  return { ...save, nextRandomEventAt: scheduleNextRandomEventAt(now, luckBonus, save.flushCount) }
}

export { scheduleNextGoldenAt, scheduleNextRandomEventAt }
