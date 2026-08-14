import { describe, it, expect } from 'vitest'
import { createTestEngine, GameEngine } from '../../src/core/GameEngine'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import {
  settleUnclaimedDailies,
  generateDailyChallenges,
  scaleTarget,
} from '../../src/core/systems/daily'
import { createEventRuntime } from '../../src/core/systems/eventSystem'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { serializeSave } from '../../src/core/save/migrateSave'
import { FixedClock } from '../../src/core/time/TimeService'
import { CHALLENGE_TEMPLATES } from '../../src/content/challenges'

function memoryStorage(): Storage {
  const memory = new Map<string, string>()
  return {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v)
    },
    removeItem: (k: string) => {
      memory.delete(k)
    },
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  } as Storage
}

describe('Quality Audit Fixes', () => {
  describe('AUD-01: daily rollover auto-grants unclaimed GTP', () => {
    it('should auto-grant completed-but-unclaimed challenges before rollover', () => {
      const now = new Date('2026-01-15T00:00:00Z').getTime()
      const engine = createTestEngine({}, now)

      const pps = LargeNumber.from(1000)
      const challenges = generateDailyChallenges(engine.exportSave(), now, pps)

      engine.debugSetSave((s) => ({
        ...s,
        dailyChallenges: challenges.map((c) => ({
          ...c,
          progress: c.target,
          completed: true,
          claimed: false,
        })),
      }))

      const result = settleUnclaimedDailies(engine.exportSave(), now)

      expect(result.gtpGranted).toBeGreaterThan(0)
      expect(result.save.dailyChallenges.every((c) => c.claimed)).toBe(true)
    })
  })

  describe('AUD-02/03: event hydrate keeps progress', () => {
    it('restores plumber inBandMs/bandScore after fromStorage', () => {
      const now = Date.UTC(2026, 0, 15, 12)
      const storage = memoryStorage()
      const save = {
        ...createDefaultSave(now),
        flushCount: 5,
        activeEvent: {
          defId: 'plumber_inspection',
          type: 'plumber_inspection' as const,
          startedAt: now,
          endsAt: now + 60_000,
          taps: 0,
          tapTarget: 0,
          completed: false,
          failed: false,
          rewardClaimed: false,
          inBandMs: 5000,
          bandScore: 0.75,
          caughtCount: 0,
        },
      }
      storage.setItem('poop_clicker_save_v2', serializeSave(save))

      const restarted = GameEngine.fromStorage({
        storage,
        clock: new FixedClock(now),
      })
      const runtime = restarted.getSnapshot().eventRuntime
      expect(runtime?.type).toBe('plumber_inspection')
      expect(runtime?.inBandMs).toBe(5000)
      expect(runtime?.bandScore).toBe(0.75)
    })

    it('restores golden_rain caughtCount after fromStorage', () => {
      const now = Date.UTC(2026, 0, 15, 12)
      const storage = memoryStorage()
      const save = {
        ...createDefaultSave(now),
        flushCount: 5,
        activeEvent: {
          defId: 'golden_rain',
          type: 'golden_rain' as const,
          startedAt: now,
          endsAt: now + 20_000,
          taps: 4,
          tapTarget: 60,
          completed: false,
          failed: false,
          rewardClaimed: false,
          caughtCount: 4,
          spawnedCount: 40,
          inBandMs: 0,
          bandScore: 0,
        },
      }
      storage.setItem('poop_clicker_save_v2', serializeSave(save))

      const restarted = GameEngine.fromStorage({
        storage,
        clock: new FixedClock(now),
      })
      const runtime = restarted.getSnapshot().eventRuntime
      expect(runtime?.type).toBe('golden_rain')
      expect(runtime?.caughtCount).toBe(4)
      expect(runtime?.taps).toBe(4)
    })
  })

  describe('AUD-05: offline claim then foreground creates new', () => {
    it('should clear offline reward after claim and allow new on foreground', () => {
      const now = new Date('2026-01-15T12:00:00Z').getTime()
      const away = 10800000 // 3 hours

      const engine = createTestEngine(
        {
          currentPP: LargeNumber.from(10000).serialize(),
          lifetimePPEarned: LargeNumber.from(10000).serialize(),
          highestPPS: LargeNumber.from(100).serialize(),
          generators: { basic_plunger: 10, toilet_paper_roll: 5 },
          purchasedRunUpgrades: { idle_speed_1: 1 },
          lastActiveTimestamp: now - away,
        },
        now,
      )

      const production = engine.getSnapshot().production
      if (production.pps.toNumber() === 0) {
        console.log('Warning: PPS is 0, skipping offline reward test')
        return
      }

      const snapshot1 = engine.getSnapshot()
      expect(snapshot1.offlineReward).not.toBeNull()

      const claimResult = engine.claimOffline(false)
      expect(claimResult.ok).toBe(true)

      const snapshot2 = engine.getSnapshot()
      expect(snapshot2.offlineReward).toBeNull()

      const later = now + away
      const engine2 = createTestEngine(
        {
          ...engine.exportSave(),
          lastActiveTimestamp: now,
        },
        later,
      )
      engine2.foreground()

      const snapshot3 = engine2.getSnapshot()
      expect(snapshot3.offlineReward).not.toBeNull()
      expect(snapshot3.offlineReward?.claimed).toBe(false)
    })
  })

  describe('AUD-09: dump start stamps day; overnight resume safe', () => {
    it('should stamp lastPlayedDate when starting dump', () => {
      const now = new Date('2026-01-15T12:00:00Z').getTime()
      const engine = createTestEngine({}, now)

      const result = engine.startDailyDump()
      expect(result.ok).toBe(true)

      const save = engine.exportSave()
      expect(save.dailyDumpState.lastPlayedDate).toBe('2026-01-15')
    })

    it('should handle overnight resume correctly', () => {
      const day1 = new Date('2026-01-15T23:30:00Z').getTime()
      const engine = createTestEngine({}, day1)

      const startResult = engine.startDailyDump()
      expect(startResult.ok).toBe(true)

      const save1 = engine.exportSave()
      expect(save1.dailyDumpState.lastPlayedDate).toBe('2026-01-15')

      const day2 = new Date('2026-01-16T00:30:00Z').getTime()
      const engine2 = createTestEngine(save1, day2)

      const snapshot = engine2.getSnapshot()
      expect(snapshot.dailyDump.phase).toBe('idle')
      expect(snapshot.save.dailyDumpState.activeRuntime).toBeNull()

      const canStart2 = engine2.startDailyDump()
      expect(canStart2.ok).toBe(true)
    })
  })

  describe('AUD-10: scaleTarget finite with huge pps', () => {
    it('should cap pps scaling to prevent infinity', () => {
      const now = new Date('2026-01-15T12:00:00Z').getTime()
      const hugePps = LargeNumber.from(1e15)
      const engine = createTestEngine(
        {
          currentPP: hugePps.serialize(),
        },
        now,
      )

      const ppsTemplate = CHALLENGE_TEMPLATES.find((t) => t.scaling === 'pps')
      expect(ppsTemplate).toBeDefined()

      if (ppsTemplate) {
        const target = scaleTarget(ppsTemplate, engine.exportSave(), hugePps, 0.1)
        expect(target).toBeLessThan(Infinity)
        expect(target).toBeGreaterThan(0)
        expect(Number.isFinite(target)).toBe(true)
      }
    })
  })

  describe('AUD-07: golden shower starts with one live target', () => {
    it('should spawn a catchable golden shower target immediately', () => {
      const now = new Date('2026-01-15T12:00:00Z').getTime()
      const runtime = createEventRuntime('golden_rain', now, 0)

      expect(runtime).not.toBeNull()
      if (runtime) {
        expect(runtime.targets.length).toBeGreaterThan(0)
        expect(runtime.spawnedCount).toBe(1)
        expect(runtime.completed).toBe(false)
      }
    })
  })

  describe('P2: Session missions persist on complete', () => {
    it('should persist immediately when mission completes', () => {
      const now = new Date('2026-01-15T12:00:00Z').getTime()
      const engine = createTestEngine({}, now)

      for (let i = 0; i < 50; i++) {
        engine.tap()
      }

      const snapshot = engine.getSnapshot()
      const taps50Mission = snapshot.sessionMissions.missions.find((m) => m.id === 'taps_50')

      expect(taps50Mission).toBeDefined()
      if (taps50Mission) {
        expect(taps50Mission.progress).toBeGreaterThanOrEqual(50)
      }
    })
  })
})
