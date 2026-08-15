import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  deserializeSave,
  isImportableSave,
  loadSaveFromStorage,
  serializeSave,
  writeSaveRecord,
} from '../../src/core/save/migrateSave'
import { SAVE_BACKUP_KEY, SAVE_STORAGE_KEY } from '../../src/core/save/saveSchema'
import { ECONOMY } from '../../src/core/economy/formulas'
import { FixedClock } from '../../src/core/time/TimeService'

describe('Save/Load vertical slice', () => {
  it('restores taps, generators, upgrades, achievements, skins, daily, flush power', () => {
    const clock = new FixedClock(Date.UTC(2026, 7, 7, 12))
    const memory = new Map<string, string>()
    const storage = {
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

    const engine = new GameEngine({
      clock,
      save: createDefaultSave(clock.now()),
      storage,
    })
    for (let i = 0; i < 120; i++) engine.tap()
    engine.debugGrantPP(50_000)
    engine.buyGenerator('plunger_intern', 3)
    engine.buyUpgrade('more_fiber')
    engine.debugSetSave((s) => ({ ...s, gtp: 100 }))
    engine.buySkin('coffee_poop')
    engine.equipSkinId('coffee_poop')
    engine.debugSetSave((s) => progressDaily(s))
    engine.debugGrantPP(ECONOMY.firstFlushRequirement)
    engine.flush()
    engine.persistImmediate()

    const restarted = GameEngine.fromStorage({ storage, clock })
    const save = restarted.exportSave()
    expect(save.tapCount).toBeGreaterThanOrEqual(120)
    expect(save.flushCount).toBe(1)
    expect(save.flushPower).toBeGreaterThan(0)
    expect(save.ownedSkins).toContain('coffee_poop')
    expect(save.equippedSkinId).toBe('coffee_poop')
    expect(save.achievements.taps_100?.completed).toBe(true)
  })

  it('roundtrips JSON', () => {
    const save = createDefaultSave()
    const again = deserializeSave(serializeSave(save))
    expect(again.schemaVersion).toBe(save.schemaVersion)
    expect(again.ownedSkins).toEqual(save.ownedSkins)
  })

  it('restores from backup when the primary save is corrupt', () => {
    const now = Date.UTC(2026, 7, 8, 12)
    const memory = new Map<string, string>()
    const storage = {
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

    const first = createDefaultSave(now)
    first.gtp = 70
    writeSaveRecord(storage, serializeSave(first), SAVE_STORAGE_KEY)
    const good = { ...first, gtp: 77, saveRevision: first.saveRevision + 1 }
    writeSaveRecord(storage, serializeSave(good), SAVE_STORAGE_KEY)
    storage.setItem(SAVE_STORAGE_KEY, '{not-json')
    expect(storage.getItem(SAVE_BACKUP_KEY)).toBeTruthy()

    const restored = loadSaveFromStorage(storage, now, SAVE_STORAGE_KEY)
    expect(restored.gtp).toBe(70)
  })

  it('rejects imports that are not save documents', () => {
    const engine = new GameEngine({
      clock: new FixedClock(Date.UTC(2026, 7, 8, 12)),
      save: { ...createDefaultSave(), gtp: 40 },
      storage: null,
    })
    expect(isImportableSave(null)).toBe(false)
    expect(isImportableSave([])).toBe(false)
    expect(isImportableSave({ foo: 1 })).toBe(false)
    expect(isImportableSave({ schemaVersion: 2, gtp: 9 })).toBe(true)
    expect(engine.importSave({ foo: 1 }).ok).toBe(false)
    expect(engine.exportSave().gtp).toBe(40)
    expect(engine.importSave({ schemaVersion: 2, gtp: 9 }).ok).toBe(true)
    expect(engine.exportSave().gtp).toBe(9)
  })
})

function progressDaily(s: ReturnType<typeof createDefaultSave>) {
  if (s.dailyChallenges[0]) {
    s.dailyChallenges[0] = {
      ...s.dailyChallenges[0],
      progress: s.dailyChallenges[0].target,
      completed: true,
    }
  }
  return s
}
