import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { FixedClock } from '../../src/core/time/TimeService'
import { StubAdService } from '../../src/services/ads'

describe('DailyPanel expectations', () => {
  it('does not expose demo score copy in panel source', () => {
    const src = readFileSync(resolve('src/ui/panels/DailyPanel.tsx'), 'utf8')
    expect(src).not.toMatch(/demo\s*score/i)
    expect(src).not.toMatch(/placeholder.*score/i)
  })

  it('daily dump reward claims once per finished run', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 8, 12))
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(clock.now()),
      storage: null,
    })
    expect(engine.startDailyDump().ok).toBe(true)
    for (let i = 0; i < 70; i++) {
      clock.advance(1000)
      engine.tick()
    }
    expect(engine.getSnapshot().dailyDump.phase).toBe('finished')
    const first = engine.claimDailyDumpReward()
    expect(first.ok).toBe(true)
    expect(engine.exportSave().dailyDumpState.rewardClaimed).toBe(true)
    const second = engine.claimDailyDumpReward()
    expect(second.ok).toBe(false)
    expect(second.reason).toBe('not_finished')
  })

  it('blocks second daily dump start same UTC day', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 8, 12))
    const engine = new GameEngine({
      clock,
      save: createDefaultSave(clock.now()),
      storage: null,
    })
    expect(engine.startDailyDump().ok).toBe(true)
    expect(engine.startDailyDump().ok).toBe(false)
  })
})

describe('Event overlay catch path', () => {
  it('catchEventTarget completes golden rain target flow', () => {
    const engine = createTestEngine({ flushCount: 5 })
    expect(engine.spawnEvent('golden_rain')).toBe(true)
    const runtime = engine.getSnapshot().eventRuntime
    expect(runtime?.targets.length).toBeGreaterThan(0)
    const target = runtime!.targets.find((t) => t.kind === 'golden' && !t.caught)
    expect(target).toBeTruthy()
    const result = engine.catchEventTarget(target!.id)
    expect(result.ok).toBe(true)
    expect(engine.getSnapshot().eventRuntime?.caughtCount).toBeGreaterThan(0)
  })

  it('catchEventTarget rejects invalid target id', () => {
    const engine = createTestEngine({ flushCount: 1 })
    engine.spawnEvent('toilet_paper_storm')
    expect(engine.catchEventTarget('missing_target').ok).toBe(false)
  })
})

describe('DailyPanel ad reroll wiring', () => {
  it('uses rewarded ad before reroll', async () => {
    const ads = new StubAdService()
    const engine = createTestEngine()
    const before = engine.exportSave().dailyChallenges[0]?.templateId
    const ad = await ads.showRewarded('daily_reroll')
    expect(ad.ok).toBe(true)
    if (ad.ok) {
      const reroll = engine.rerollDailyChallenge(0, true)
      expect(reroll.ok).toBe(true)
      expect(engine.exportSave().dailyChallenges[0]?.templateId).not.toBe(before)
    }
  })
})
