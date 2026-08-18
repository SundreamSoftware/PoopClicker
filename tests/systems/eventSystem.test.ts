import { describe, expect, it } from 'vitest'
import { GOLDEN_SHOWER } from '../../src/content/events'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import {
  afterEventSchedule,
  bossTap,
  catchTarget,
  computeEventRewards,
  createEventRuntime,
  evaluateEventCompletion,
  pickScheduledEvent,
  tickEventRuntime,
  totalEventRewardMultiplier,
} from '../../src/core/systems/eventSystem'
import {
  EVENT_SCHEDULER,
  scheduleNextEventGapMs,
  scheduleNextRandomEventAt,
} from '../../src/core/types/eventRuntime'
import { milestoneEventBonus } from '../../src/core/systems/flush'
import { computeProduction } from '../../src/core/systems/production'

describe('eventSystem', () => {
  it('creates golden poop with floating target', () => {
    const now = 1_000_000
    const runtime = createEventRuntime('golden_poop', now, 0)
    expect(runtime?.type).toBe('golden_poop')
    expect(runtime?.targets).toHaveLength(1)
    expect(runtime?.targets[0].kind).toBe('golden')
  })

  it('completes golden poop on catch', () => {
    const now = 1_000_000
    const runtime = createEventRuntime('golden_poop', now, 0)!
    const targetId = runtime.targets[0].id
    const { runtime: next, caught } = catchTarget(runtime, targetId, now + 100)
    expect(caught).toBe(true)
    expect(next.completed).toBe(true)
    const status = evaluateEventCompletion(next, now + 100)
    expect(status.completed).toBe(true)
  })

  it('completes mega clog via bossTap', () => {
    const now = 1_000_000
    let runtime = createEventRuntime('mega_clog', now, 3)!
    for (let i = 0; i < runtime.tapTarget; i++) {
      runtime = bossTap(runtime)
    }
    expect(runtime.completed).toBe(true)
    expect(evaluateEventCompletion(runtime, now).completed).toBe(true)
  })

  it('tracks plumber band score', () => {
    const now = 1_000_000
    let runtime = createEventRuntime('plumber_inspection', now, 1)!
    runtime = tickEventRuntime(runtime, now + 5_000, 5, 5_000)
    expect(runtime.bandScore).toBeGreaterThan(0)
  })

  it('spawns golden shower over 15s with 3 live and 30 total', () => {
    const start = 1_000_000
    let runtime = createEventRuntime('golden_rain', start, 0)!
    expect(runtime.spawnedCount).toBe(GOLDEN_SHOWER.maxLive)
    expect(runtime.targets).toHaveLength(GOLDEN_SHOWER.maxLive)
    for (let t = 200; t <= GOLDEN_SHOWER.durationMs; t += 200) {
      runtime = tickEventRuntime(runtime, start + t, 0, 200)
    }
    expect(runtime.spawnedCount).toBeGreaterThan(GOLDEN_SHOWER.maxLive)
    expect(runtime.spawnedCount).toBeLessThanOrEqual(GOLDEN_SHOWER.totalSpawns)
    expect(runtime.targets.length).toBeLessThanOrEqual(GOLDEN_SHOWER.maxLive)
    expect(runtime.targets.every((t) => t.y < GOLDEN_SHOWER.despawnY)).toBe(true)

    const mid = createEventRuntime('golden_rain', start, 0)!
    let midRt = mid
    for (let t = 200; t <= 8_000; t += 200) {
      midRt = tickEventRuntime(midRt, start + t, 0, 200)
    }
    const catchable = midRt.targets.find((t) => !t.caught)!
    const { runtime: afterCatch } = catchTarget(midRt, catchable.id, start + 8_000)
    expect(afterCatch.completed).toBe(false)
    expect(afterCatch.targets.length).toBeLessThanOrEqual(GOLDEN_SHOWER.maxLive)
    expect(evaluateEventCompletion(afterCatch, start + 8_000).completed).toBe(false)
    expect(evaluateEventCompletion(afterCatch, afterCatch.endsAt + 1).completed).toBe(true)
  })

  it('refills a caught shower slot immediately', () => {
    const start = 1_000_000
    const runtime = createEventRuntime('golden_rain', start, 0)!
    const firstId = runtime.targets[0].id
    const { runtime: afterCatch } = catchTarget(runtime, firstId, start + 50)
    const refilled = tickEventRuntime(afterCatch, start + 50, 0, 16)
    expect(refilled.targets).toHaveLength(GOLDEN_SHOWER.maxLive)
    expect(refilled.targets.some((t) => t.id === firstId)).toBe(false)
    expect(refilled.spawnedCount).toBe(GOLDEN_SHOWER.maxLive + 1)
  })

  it('removes shower targets that fall past the bottom', () => {
    const start = 1_000_000
    let runtime = createEventRuntime('golden_rain', start, 0)!
    runtime = {
      ...runtime,
      spawnedCount: GOLDEN_SHOWER.totalSpawns,
      targets: [
        {
          ...runtime.targets[0],
          originY: GOLDEN_SHOWER.despawnY - 0.1,
          y: GOLDEN_SHOWER.despawnY - 0.1,
          vy: 1,
          bornAt: start,
        },
      ],
    }
    runtime = tickEventRuntime(runtime, start + 16, 0, 16)
    expect(runtime.targets.every((t) => t.y < GOLDEN_SHOWER.despawnY)).toBe(true)
    expect(runtime.targets).toHaveLength(0)
  })

  it('fails golden shower with zero catches at timeout', () => {
    const now = 1_000_000
    const runtime = createEventRuntime('golden_rain', now, 0)!
    const status = evaluateEventCompletion(runtime, runtime.endsAt + 1)
    expect(status.failed).toBe(true)
    expect(status.completed).toBe(false)
  })

  it('keeps leftover shower poops falling after the timer ends', () => {
    const start = 1_000_000
    const runtime = createEventRuntime('golden_rain', start, 0)!
    const leftover = {
      ...runtime.targets[0],
      bornAt: runtime.endsAt - 200,
      originY: 24,
      y: 24,
      vy: 0.03,
      expiresAt: runtime.endsAt - 50,
    }
    const timedOut = {
      ...runtime,
      spawnedCount: GOLDEN_SHOWER.totalSpawns,
      caughtCount: 2,
      targets: [leftover],
    }
    const justAfter = timedOut.endsAt + 1
    expect(evaluateEventCompletion(timedOut, justAfter)).toEqual({
      completed: false,
      failed: false,
    })

    const stillFalling = tickEventRuntime(timedOut, justAfter, 0, 16)
    expect(stillFalling.targets).toHaveLength(1)
    expect(stillFalling.spawnedCount).toBe(GOLDEN_SHOWER.totalSpawns)

    const earlyCutoff = { ...timedOut, spawnedCount: 5 }
    const noNewSpawns = tickEventRuntime(earlyCutoff, justAfter, 0, 16)
    expect(noNewSpawns.spawnedCount).toBe(5)
    expect(noNewSpawns.targets).toHaveLength(1)

    const { runtime: afterCatch, caught } = catchTarget(timedOut, leftover.id, justAfter)
    expect(caught).toBe(true)
    expect(afterCatch.targets).toHaveLength(0)
    expect(evaluateEventCompletion(afterCatch, justAfter).completed).toBe(true)

    const fallen = tickEventRuntime(timedOut, leftover.bornAt + 10_000, 0, 16)
    expect(fallen.targets).toHaveLength(0)
    expect(evaluateEventCompletion(fallen, leftover.bornAt + 10_000).completed).toBe(true)
  })

  it('schedules golden when due', () => {
    const now = 1_000_000
    const save = {
      ...createDefaultSave(now),
      lastEventActivityAt: now - EVENT_SCHEDULER.minIntervalMs,
      nextGoldenPoopAt: now - 1,
      nextRandomEventAt: now + 999_999,
    }
    expect(pickScheduledEvent(save, now)?.id).toBe('golden_poop')
  })

  it('prefers golden over random when both are due', () => {
    const now = 1_000_000
    const save = {
      ...createDefaultSave(now),
      flushCount: 3,
      lastEventActivityAt: now - EVENT_SCHEDULER.minIntervalMs,
      nextGoldenPoopAt: now - 1,
      nextRandomEventAt: now - 1,
    }
    expect(pickScheduledEvent(save, now)?.id).toBe('golden_poop')
  })

  it('blocks events within one minute of last activity', () => {
    const now = 1_000_000
    const save = {
      ...createDefaultSave(now),
      lastEventActivityAt: now - 30_000,
      nextGoldenPoopAt: now - 1,
      nextRandomEventAt: now - 1,
    }
    expect(pickScheduledEvent(save, now)).toBeNull()
  })

  it('uses a random 1–4 minute gap for the next event', () => {
    const gaps = [0, 0.25, 0.5, 0.75, 1].map((r) => scheduleNextEventGapMs(() => r))
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(EVENT_SCHEDULER.minIntervalMs)
      expect(gap).toBeLessThanOrEqual(EVENT_SCHEDULER.maxIntervalMs)
    }
    expect(scheduleNextRandomEventAt(1_000_000, 0, 0, () => 0)).toBe(
      1_000_000 + EVENT_SCHEDULER.minIntervalMs,
    )
    expect(scheduleNextRandomEventAt(1_000_000, 0, 0, () => 1)).toBe(
      1_000_000 + EVENT_SCHEDULER.maxIntervalMs,
    )
  })

  it('after an event delays both golden and random lanes', () => {
    const now = 1_000_000
    const save = createDefaultSave(now)
    const next = afterEventSchedule(save, now, 'mega_clog', 0, 0)
    expect(next.nextGoldenPoopAt - now).toBeGreaterThanOrEqual(EVENT_SCHEDULER.minIntervalMs)
    expect(next.nextGoldenPoopAt - now).toBeLessThanOrEqual(EVENT_SCHEDULER.maxIntervalMs)
    expect(next.nextRandomEventAt - now).toBeGreaterThanOrEqual(EVENT_SCHEDULER.minIntervalMs)
    expect(next.nextRandomEventAt - now).toBeLessThanOrEqual(EVENT_SCHEDULER.maxIntervalMs)
  })

  it('includes flush milestone event bonus in rewards', () => {
    const save = {
      ...createDefaultSave(),
      flushCount: 15,
      generators: { plunger_intern: 5 },
      currentPP: LargeNumber.from(1_000).serialize(),
    }
    expect(milestoneEventBonus(save)).toBe(0.25)
    const production = computeProduction(save, 0, Date.now())
    const mult = totalEventRewardMultiplier(save, production.eventRewardBonus)
    expect(mult).toBeGreaterThanOrEqual(1.25)
    const rewards = computeEventRewards('mega_clog', save, production)
    expect(rewards.gtp).toBeGreaterThan(8)
    expect(rewards.pp.gt(0)).toBe(true)
  })

  it('enforces golden rain cooldown of at least 5 minutes', () => {
    expect(GOLDEN_SHOWER.minRandomCooldownMs).toBeGreaterThanOrEqual(300_000)
  })
})
