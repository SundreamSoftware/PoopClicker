import { describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { computeNextBestGoals } from '../../src/core/systems/nextGoals'
import { GENERATORS } from '../../src/content/generators'

describe('nextBestGoals', () => {
  it('prefers a nearby generator milestone over a distant flush', () => {
    const gen = GENERATORS[0]
    const save = {
      ...createDefaultSave(),
      generators: { [gen.id]: 47 },
      currentPP: LargeNumber.from(1_000).serialize(),
      runPPEarned: LargeNumber.from(100).serialize(),
    }
    const goals = computeNextBestGoals(save, Date.UTC(2026, 0, 1))
    expect(goals[0]?.kind).toBe('milestone')
    expect(goals[0]?.subtitle).toContain(gen.name)
  })

  it('surfaces claimable dailies first', () => {
    const save = {
      ...createDefaultSave(),
      dailyChallenges: [
        {
          templateId: 'tap',
          category: 'activity' as const,
          metric: 'taps' as const,
          name: 'Tap',
          description: 'Tap',
          target: 1,
          progress: 1,
          completed: true,
          claimed: false,
          rewardGtp: 1,
          rewardBoostMinutes: 0,
        },
      ],
    }
    const goals = computeNextBestGoals(save, Date.UTC(2026, 0, 1))
    expect(goals[0]?.kind).toBe('claim')
  })
})
