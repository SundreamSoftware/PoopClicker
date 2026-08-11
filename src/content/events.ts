import type { EventDef } from '../core/types/gameTypes'

export const EVENTS: EventDef[] = [
  {
    id: 'golden_poop',
    type: 'golden_poop',
    name: 'Golden Poop',
    description: 'Catch it before it escapes dignity.',
    durationMs: 8_000,
    cooldownMs: 180_000,
    minFlushCount: 0,
    rewardGtp: 5,
    rewardPpMinutes: 3,
    uiPresentation: 'floating_target',
    analyticsId: 'event_golden_poop',
  },
  {
    id: 'plumber_inspection',
    type: 'plumber_inspection',
    name: 'Plumber Inspection',
    description: 'Hold a steady CPS.',
    durationMs: 12_000,
    cooldownMs: 300_000,
    minFlushCount: 1,
    rewardGtp: 12,
    rewardPpMinutes: 4,
    tapTarget: 8,
    uiPresentation: 'cps_meter',
    analyticsId: 'event_plumber_inspection',
  },
  {
    id: 'mega_clog',
    type: 'mega_clog',
    name: 'Mega Clog',
    description: 'Mini-boss of the pipes.',
    durationMs: 25_000,
    cooldownMs: 420_000,
    minFlushCount: 3,
    rewardGtp: 20,
    rewardPpMinutes: 10,
    tapTarget: 120,
    uiPresentation: 'boss_bar',
    analyticsId: 'event_mega_clog',
  },
  {
    id: 'golden_rain',
    type: 'golden_rain',
    name: 'Golden Poop Shower',
    description: '120 golden poops in 30s — each catch is worth 20 taps.',
    durationMs: 30_000,
    cooldownMs: 300_000,
    minFlushCount: 0,
    rewardGtp: 15,
    rewardPpMinutes: 2,
    tapTarget: 120,
    uiPresentation: 'multi_target',
    analyticsId: 'event_golden_rain',
  },
]

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]))

/** Shower spawn contract. */
export const GOLDEN_SHOWER = {
  totalSpawns: 120,
  durationMs: 30_000,
  maxLive: 18,
  catchTapMultiplier: 20,
  minRandomCooldownMs: 300_000,
  frameCount: 6,
} as const
