import { EVENT_BY_ID, EVENTS, GOLDEN_SHOWER } from '../../content/events'
import { LargeNumber } from '../numbers/LargeNumber'
import type { PlayerSaveV2 } from '../save/saveSchema'
import type { ActiveEventRuntime, FloatingTarget } from '../types/eventRuntime'
import {
  EVENT_SCHEDULER,
  scheduleNextGoldenAt,
  scheduleNextRandomEventAt,
} from '../types/eventRuntime'
import type { EventType } from '../types/gameTypes'
import { milestoneEventBonus } from './flush'
import type { ProductionBreakdown } from './production'

const PLUMBER_BAND_MIN = 4
const PLUMBER_BAND_MAX = 6
const PLUMBER_SUCCESS_RATIO = 0.55

/** uiPresentation values with runtime handling in eventSystem + EventOverlay. */
export const EVENT_UI_PRESENTATIONS_SUPPORTED = [
  'floating_target',
  'boss_bar',
  'cps_meter',
  'multi_target',
] as const

export type EventUiPresentation = (typeof EVENT_UI_PRESENTATIONS_SUPPORTED)[number]

/** Maps content uiPresentation strings to event types that implement them. */
export const EVENT_TYPES_BY_UI_PRESENTATION: Record<EventUiPresentation, EventType[]> = {
  floating_target: ['golden_poop'],
  boss_bar: ['mega_clog'],
  cps_meter: ['plumber_inspection'],
  multi_target: ['golden_rain'],
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function spawnFloating(now: number, lifeMs: number, index = 0): FloatingTarget {
  return {
    id: uid('golden'),
    kind: 'golden',
    x: 12 + ((index * 17 + Math.random() * 40) % 76),
    y: -8 - Math.random() * 18,
    vx: (Math.random() - 0.5) * 0.06,
    vy: 0.035 + Math.random() * 0.045,
    bornAt: now,
    expiresAt: now + lifeMs,
    caught: false,
    frame: 1 + Math.floor(Math.random() * GOLDEN_SHOWER.frameCount),
  }
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
    spawnedCount: 0,
    inBandMs: 0,
    lastCpsSampleAt: now,
    phase: 1,
    phaseTapTarget: def.tapTarget ?? 0,
    bandScore: 0,
  }

  switch (def.type) {
    case 'golden_poop':
      return {
        ...base,
        spawnedCount: 1,
        targets: [spawnFloating(now, def.durationMs)],
      }
    case 'golden_rain': {
      const first = spawnFloating(now, 4_500, 0)
      return {
        ...base,
        tapTarget: GOLDEN_SHOWER.totalSpawns,
        spawnedCount: 1,
        targets: [first],
      }
    }
    case 'mega_clog': {
      const total = def.tapTarget ?? 120
      return { ...base, phase: 1, phaseTapTarget: Math.ceil(total / 3), tapTarget: total }
    }
    case 'plumber_inspection':
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
      y: Math.min(105, Math.max(-12, t.y + t.vy * dtMs)),
    }
  })

  if (next.type === 'golden_rain' && !next.completed && !next.failed) {
    const elapsed = Math.max(0, now - next.startedAt)
    const desired = Math.min(
      GOLDEN_SHOWER.totalSpawns,
      1 + Math.floor((elapsed / GOLDEN_SHOWER.durationMs) * (GOLDEN_SHOWER.totalSpawns - 1)),
    )
    let spawnedCount = next.spawnedCount
    let live = next.targets.filter((t) => !t.caught && t.expiresAt > now)
    const additions: FloatingTarget[] = []
    while (spawnedCount < desired && live.length + additions.length < GOLDEN_SHOWER.maxLive) {
      additions.push(spawnFloating(now, 4_200, spawnedCount))
      spawnedCount += 1
    }
    next = {
      ...next,
      spawnedCount,
      targets: [...live, ...additions],
    }
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
  // Golden shower runs full duration; completion is evaluated at endsAt.
  if (runtime.type === 'golden_poop' && caughtCount >= 1) {
    completed = true
  }
  return { runtime: { ...runtime, targets, caughtCount, taps, completed }, caught: true }
}

export function bossTap(runtime: ActiveEventRuntime): ActiveEventRuntime {
  if (runtime.type !== 'mega_clog') return runtime
  const taps = runtime.taps + 1
  let next: ActiveEventRuntime = { ...runtime, taps }
  if (next.phase < 3 && taps >= next.phase * next.phaseTapTarget) {
    next = { ...next, phase: next.phase + 1 }
  }
  if (taps >= next.tapTarget) next = { ...next, completed: true }
  return next
}

export function evaluateEventCompletion(
  runtime: ActiveEventRuntime,
  now: number,
): { completed: boolean; failed: boolean } {
  if (runtime.rewardClaimed) return { completed: true, failed: false }

  if (runtime.type === 'golden_rain') {
    if (now < runtime.endsAt) return { completed: false, failed: false }
    return { completed: runtime.caughtCount >= 1, failed: runtime.caughtCount < 1 }
  }

  const succeeded = (() => {
    switch (runtime.type) {
      case 'golden_poop':
        return runtime.completed
      case 'mega_clog':
        return runtime.taps >= runtime.tapTarget
      case 'plumber_inspection':
        return now >= runtime.endsAt && runtime.bandScore >= PLUMBER_SUCCESS_RATIO
      default:
        return runtime.completed
    }
  })()

  if (succeeded) return { completed: true, failed: false }
  if (now < runtime.endsAt) return { completed: false, failed: false }

  const failTypes: EventType[] = ['mega_clog', 'plumber_inspection', 'golden_poop']
  return { completed: false, failed: failTypes.includes(runtime.type) }
}

export function pickScheduledEvent(
  save: PlayerSaveV2,
  now: number,
): { kind: 'golden' | 'random'; id: string; reschedule?: boolean } | null {
  if (save.activeEvent) return null
  if (now - save.lastEventActivityAt < EVENT_SCHEDULER.minIntervalMs) return null
  if (now >= save.nextGoldenPoopAt) return { kind: 'golden', id: 'golden_poop' }
  if (now >= save.nextRandomEventAt) {
    const candidates = EVENTS.filter(
      (e) =>
        e.type !== 'golden_poop' &&
        save.flushCount >= e.minFlushCount &&
        now - (save.lastEventEndedAt[e.id] ?? 0) >= e.cooldownMs,
    )
    if (!candidates.length) {
      return { kind: 'random', id: '', reschedule: true }
    }
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
  void type
  return {
    ...save,
    nextGoldenPoopAt: scheduleNextGoldenAt(now, goldenChanceBonus),
    nextRandomEventAt: scheduleNextRandomEventAt(now, luckBonus, save.flushCount),
  }
}

export { scheduleNextGoldenAt, scheduleNextRandomEventAt }
