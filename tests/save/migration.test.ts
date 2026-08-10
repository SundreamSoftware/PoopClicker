import { describe, expect, it } from 'vitest'
import { migrateSave } from '../../src/core/save/migrateSave'
import { SAVE_SCHEMA_VERSION } from '../../src/core/save/saveSchema'

describe('Save migration', () => {
  it('migrates legacy v1 save without losing progress', () => {
    const legacy = {
      schemaVersion: 1 as const,
      pp: 12_500,
      gtp: 300,
      tapCount: 999,
      generators: { plunger_intern: 7 },
      upgrades: { more_fiber: 2 },
      flushCount: 2,
      ownedSkins: ['coffee_poop'],
      equippedSkin: 'coffee_poop',
      lastSave: Date.UTC(2026, 1, 1),
      prestigeBonus: 40,
    }
    const migrated = migrateSave(legacy, Date.UTC(2026, 7, 7))
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.tapCount).toBe(999)
    expect(migrated.generators.plunger_intern).toBe(7)
    expect(migrated.purchasedRunUpgrades.more_fiber).toBe(2)
    expect(migrated.ownedSkins).toContain('classic_poop')
    expect(migrated.ownedSkins).toContain('coffee_poop')
    expect(migrated.equippedSkinId).toBe('coffee_poop')
    expect(migrated.gtp).toBe(300)
    expect(migrated.flushPower).toBe(40)
    expect(migrated.runPPEarned).toBeTruthy()
    expect(migrated.lifetimePPEarned).toBeTruthy()
  })

  it('handles corrupt/partial saves with defaults', () => {
    const migrated = migrateSave({ schemaVersion: 2, gtp: 'nope' } as never)
    expect(migrated.gtp).toBe(0)
    expect(migrated.ownedSkins).toContain('classic_poop')
    expect(migrated.sessionMissions).toEqual({ dateKey: null, missions: [] })
    expect(migrated.rewardedCooldowns).toEqual({
      incomeBoostAt: 0,
      instantPpsAt: 0,
      eventRetryAt: 0,
      goldenSpawnAt: 0,
    })
  })

  it('preserves session missions and rewarded cooldowns when present', () => {
    const migrated = migrateSave({
      schemaVersion: 2,
      sessionMissions: {
        dateKey: '2026-08-08',
        missions: [{ id: 'taps_50', progress: 12, claimed: false }],
      },
      rewardedCooldowns: {
        incomeBoostAt: 1_000,
        instantPpsAt: 2_000,
        eventRetryAt: 3_000,
        goldenSpawnAt: 4_000,
      },
    } as never)
    expect(migrated.sessionMissions.dateKey).toBe('2026-08-08')
    expect(migrated.sessionMissions.missions[0]).toEqual({
      id: 'taps_50',
      progress: 12,
      claimed: false,
    })
    expect(migrated.rewardedCooldowns.incomeBoostAt).toBe(1_000)
    expect(migrated.rewardedCooldowns.goldenSpawnAt).toBe(4_000)
  })

  it('handles null save', () => {
    const migrated = migrateSave(null)
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
  })

  it('defaults missing dailyDump activeRuntime to null and sanitizes valid runtime', () => {
    const withoutRuntime = migrateSave({
      schemaVersion: 2,
      dailyDumpState: {
        lastPlayedDate: '2026-08-08',
        bestScore: 10,
        lastScore: 5,
        lastTier: 'bronze',
        rewardClaimed: false,
      },
    } as never)
    expect(withoutRuntime.dailyDumpState.activeRuntime).toBeNull()

    const withRuntime = migrateSave({
      schemaVersion: 2,
      dailyDumpState: {
        lastPlayedDate: null,
        bestScore: 0,
        lastScore: 0,
        lastTier: 'none',
        rewardClaimed: false,
        activeRuntime: {
          phase: 'countdown',
          startedAt: 1000,
          endsAt: 64_000,
          countdownEndsAt: 4000,
          score: 0,
          taps: 0,
          combo: 0,
          peakCombo: 0,
          rewardTier: 'none',
          gtpReward: 0,
        },
      },
    } as never)
    expect(withRuntime.dailyDumpState.activeRuntime?.phase).toBe('countdown')
    expect(withRuntime.dailyDumpState.activeRuntime?.endsAt).toBe(64_000)

    const corruptRuntime = migrateSave({
      schemaVersion: 2,
      dailyDumpState: {
        lastPlayedDate: null,
        bestScore: 0,
        lastScore: 0,
        lastTier: 'none',
        rewardClaimed: false,
        activeRuntime: { phase: 'idle', score: 1 },
      },
    } as never)
    expect(corruptRuntime.dailyDumpState.activeRuntime).toBeNull()
  })
})
