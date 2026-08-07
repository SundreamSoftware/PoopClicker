import { describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { deserializeSave, serializeSave } from '../../src/core/save/migrateSave'

describe('Skins', () => {
  it('purchases with GTP and keeps ownership after spending GTP', () => {
    const engine = createTestEngine({ gtp: 40 })
    const buy = engine.buySkin('coffee_poop')
    expect(buy.ok).toBe(true)
    expect(engine.exportSave().ownedSkins).toContain('coffee_poop')
    engine.debugSetSave((s) => ({ ...s, gtp: 0 }))
    expect(engine.exportSave().ownedSkins).toContain('coffee_poop')
    const equip = engine.equipSkinId('coffee_poop')
    expect(equip.ok).toBe(true)
    expect(engine.exportSave().equippedSkinId).toBe('coffee_poop')
  })

  it('rejects insufficient GTP', () => {
    const engine = createTestEngine({ gtp: 1 })
    expect(engine.buySkin('coffee_poop').ok).toBe(false)
  })

  it('survives restart', () => {
    const engine = createTestEngine({ gtp: 40 })
    engine.buySkin('coffee_poop')
    engine.equipSkinId('coffee_poop')
    const raw = serializeSave(engine.exportSave())
    const loaded = deserializeSave(raw)
    expect(loaded.ownedSkins).toContain('coffee_poop')
    expect(loaded.equippedSkinId).toBe('coffee_poop')
  })

  it('unlocks achievement skins', () => {
    const engine = createTestEngine()
    for (let i = 0; i < 1000; i++) engine.tap()
    engine.tick(0)
    expect(engine.exportSave().ownedSkins).toContain('corny_poop')
  })

  it('default save owns classic only', () => {
    expect(createDefaultSave().ownedSkins).toEqual(['classic_poop'])
  })
})
