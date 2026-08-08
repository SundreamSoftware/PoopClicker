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
  })

  it('handles null save', () => {
    const migrated = migrateSave(null)
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
  })
})
