import type { EventType } from './gameTypes'

export interface FloatingTarget {
  id: string
  kind: 'golden'
  x: number
  y: number
  /** Spawn position — overlay interpolates from this + velocity. */
  originX: number
  originY: number
  vx: number
  vy: number
  bornAt: number
  expiresAt: number
  caught: boolean
  /** Golden shower sprite frame 1–6. */
  frame: number
}

export interface EventRuntime {
  active: ActiveEventRuntime | null
  nextGoldenAt: number
  nextRandomEventAt: number
}

export interface ActiveEventRuntime {
  defId: string
  type: EventType
  startedAt: number
  endsAt: number
  taps: number
  tapTarget: number
  completed: boolean
  failed: boolean
  rewardClaimed: boolean
  /** Floating catchables for Golden / Golden Rain */
  targets: FloatingTarget[]
  caughtCount: number
  /** How many shower poops have been spawned so far. */
  spawnedCount: number
  /** Plumber Inspection: ms spent in CPS band */
  inBandMs: number
  lastCpsSampleAt: number
  /** Mega Clog phase 1..3 */
  phase: number
  phaseTapTarget: number
  /** Perfect-band ratio for plumber (0..1) */
  bandScore: number
}

/** Global event pacing: at most one event per minute; next gap is random 1–4 minutes. */
export const EVENT_SCHEDULER = {
  minIntervalMs: 60_000,
  maxIntervalMs: 240_000,
  /** Guaranteed golden spawn after this idle gap with no event activity. */
  pityMs: 10 * 60_000,
} as const

/** Uniform random delay in [1 min, 4 min]. */
export function scheduleNextEventGapMs(random = Math.random): number {
  const { minIntervalMs, maxIntervalMs } = EVENT_SCHEDULER
  return minIntervalMs + random() * (maxIntervalMs - minIntervalMs)
}

export function scheduleNextRandomEventAt(
  now: number,
  _luckBonus = 0,
  _flushCount = 0,
  random = Math.random,
): number {
  void _luckBonus
  void _flushCount
  return now + scheduleNextEventGapMs(random)
}

export function scheduleNextGoldenAt(
  now: number,
  _goldenChanceBonus = 0,
  random = Math.random,
): number {
  void _goldenChanceBonus
  return now + scheduleNextEventGapMs(random)
}
