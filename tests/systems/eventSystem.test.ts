import { describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import {
  bossTap,
  catchTarget,
  computeEventRewards,
  createEventRuntime,
  evaluateEventCompletion,
  pickScheduledEvent,
  tickEventRuntime,
  totalEventRewardMultiplier,
} from '../../src/core/systems/eventSystem'
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

  it('completes clog via bossTap', () => {
    const now = 1_000_000
    let runtime = createEventRuntime('clogged_toilet', now, 0)!
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

  it('enters awaiting_choice for mystery flush at timeout', () => {
    const now = 1_000_000
    let runtime = createEventRuntime('mystery_flush', now, 4)!
    runtime = tickEventRuntime(runtime, runtime.endsAt + 1, 0, 16)
    const status = evaluateEventCompletion(runtime, runtime.endsAt + 1)
    expect(status.awaitingChoice).toBe(true)
  })

  it('caps toilet paper storm pool at 12', () => {
    const now = 1_000_000
    let runtime = createEventRuntime('toilet_paper_storm', now, 1)!
    for (let i = 0; i < 20; i++) {
      runtime = tickEventRuntime(runtime, now + i * 200, 0, 200)
    }
    expect(runtime.targets.length).toBeLessThanOrEqual(12)
  })

  it('schedules golden when due', () => {
    const now = 1_000_000
    const save = {
      ...createDefaultSave(now),
      nextGoldenPoopAt: now - 1,
      nextRandomEventAt: now + 999_999,
    }
    expect(pickScheduledEvent(save, now)?.id).toBe('golden_poop')
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
    const rewards = computeEventRewards('clogged_toilet', save, production)
    expect(rewards.gtp).toBeGreaterThan(8)
    expect(rewards.pp.gt(0)).toBe(true)
  })
})
