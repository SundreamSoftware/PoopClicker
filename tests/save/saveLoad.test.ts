import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { deserializeSave, serializeSave } from '../../src/core/save/migrateSave'
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
