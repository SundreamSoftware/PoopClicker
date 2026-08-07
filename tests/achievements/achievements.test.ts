import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { claimAchievement, syncAchievements } from '../../src/core/systems/achievements'
import { createDefaultSave } from '../../src/core/save/defaultSave'

describe('Achievements', () => {
  it('progresses, unlocks at threshold, and blocks duplicate claims', () => {
    const engine = createTestEngine()
    for (let i = 0; i < 100; i++) engine.tap()
    engine.tick(0)
    const save = engine.exportSave()
    expect(save.achievements.taps_100?.completed).toBe(true)
    const first = engine.claimAchievementReward('taps_100')
    expect(first.ok).toBe(true)
    const second = engine.claimAchievementReward('taps_100')
    expect(second.ok).toBe(false)
  })

  it('handles overshoot thresholds', () => {
    const save = createDefaultSave()
    const synced = syncAchievements({ ...save, tapCount: 25_000 }, Date.now())
    expect(synced.save.achievements.taps_10000?.completed).toBe(true)
    expect(synced.save.achievements.taps_1000?.completed).toBe(true)
  })

  it('persists claimed state', () => {
    let save = createDefaultSave()
    save = syncAchievements({ ...save, flushCount: 1 }, Date.now()).save
    const claimed = claimAchievement(save, 'flush_1')
    expect(claimed.ok).toBe(true)
    expect(claimed.save.achievements.flush_1?.claimed).toBe(true)
  })
})
