import type { EventType } from './gameTypes'

export interface FloatingTarget {
  id: string
  kind: 'golden' | 'tp_roll'
  x: number
  y: number
  vx: number
  vy: number
  bornAt: number
  expiresAt: number
  caught: boolean
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
  /** Floating catchables for Golden / Golden Rain / TP Storm */
  targets: FloatingTarget[]
  caughtCount: number
  /** Plumber Inspection: ms spent in CPS band */
  inBandMs: number
  lastCpsSampleAt: number
  /** Mega Clog phase 1..3 */
  phase: number
  phaseTapTarget: number
  /** Mystery Flush reveal state */
  mysteryRevealed: boolean
  mysteryOption?: 0 | 1 | 2
  /** True when event ended and player must pick a reward */
  awaitingChoice: boolean
  /** Perfect-band ratio for plumber (0..1) */
  bandScore: number
}

export const EVENT_SCHEDULER = {
  baseIntervalMs: 180_000,
  jitterMs: 90_000,
  minIntervalMs: 90_000,
  goldenBaseIntervalMs: 180_000,
  goldenJitterMs: 60_000,
} as const

export function scheduleNextRandomEventAt(
  now: number,
  luckBonus = 0,
  flushCount = 0,
): number {
  const shrink = Math.min(0.45, luckBonus * 0.5 + flushCount * 0.005)
  const base = EVENT_SCHEDULER.baseIntervalMs * (1 - shrink)
  const jitter = (Math.random() * 2 - 1) * EVENT_SCHEDULER.jitterMs
  return now + Math.max(EVENT_SCHEDULER.minIntervalMs, base + jitter)
}

export function scheduleNextGoldenAt(now: number, goldenChanceBonus = 0): number {
  const shrink = Math.min(0.6, goldenChanceBonus)
  const base = EVENT_SCHEDULER.goldenBaseIntervalMs * (1 - shrink)
  const jitter = (Math.random() * 2 - 1) * EVENT_SCHEDULER.goldenJitterMs
  return now + Math.max(60_000, base + jitter)
}
