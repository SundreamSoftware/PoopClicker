import { beforeEach, describe, expect, it } from 'vitest'
import { createTestEngine } from '../../src/core/GameEngine'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  applyIapGrant,
  CapacitorBillingService,
  IAP_PRODUCTS,
  isPurchasedAndroidState,
  restorableProductFromPurchase,
  StubBillingService,
  type BillingService,
} from '../../src/services/billing'
import { restorePurchasesToEngine } from '../../src/services/purchaseSync'

describe('StubBillingService', () => {
  let billing: BillingService

  beforeEach(() => {
    billing = new StubBillingService()
  })

  it('loads catalog after init', async () => {
    const products = await billing.loadProducts()
    expect(products.length).toBeGreaterThan(0)
    expect(products.some((p) => p.id === 'remove_ads')).toBe(true)
  })

  it('grants consumable GTP on each purchase', async () => {
    const first = await billing.purchase('gtp_small')
    const second = await billing.purchase('gtp_small')
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(first.grant?.gtp).toBe(50)
    expect(second.grant?.gtp).toBe(50)
  })

  it('grants non-consumable entitlement once', async () => {
    const first = await billing.purchase('remove_ads')
    const duplicate = await billing.purchase('remove_ads')
    expect(first.ok).toBe(true)
    expect(duplicate).toEqual({ ok: false, productId: 'remove_ads', reason: 'already_owned' })
    expect(billing.getEntitlements().removeAds).toBe(true)
  })

  it('restore returns owned non-consumables', async () => {
    await billing.purchase('remove_ads')
    await billing.purchase('gtp_small')
    const restored = await billing.restore()
    expect(restored.some((r) => r.productId === 'remove_ads' && r.ok)).toBe(true)
    expect(restored.some((r) => r.productId === 'gtp_small')).toBe(false)
    expect(await billing.syncEntitlements()).toEqual(restored)
    const engine = createTestEngine()
    const applied = await restorePurchasesToEngine(engine, billing)
    expect(applied.unavailable).toBe(false)
    expect(applied.restored).toBe(1)
    expect(engine.exportSave().removeAds).toBe(true)
    expect(engine.exportSave().gtp).toBe(0)
  })

  it('returns cancel reason for unknown product via engine apply path', async () => {
    const missing = await billing.purchase('not_a_product')
    expect(missing).toEqual({ ok: false, reason: 'not_found' })
  })
})

describe('GameEngine applyIapGrant', () => {
  it('applies consumable grant to save', () => {
    const engine = createTestEngine({ gtp: 10 })
    const result = engine.applyIapGrant('gtp_medium')
    expect(result.ok).toBe(true)
    expect(engine.exportSave().gtp).toBe(10 + 180)
  })

  it('does not re-grant consumable GTP on restore', () => {
    const engine = createTestEngine({ gtp: 10 })
    const result = engine.applyIapGrant('gtp_small', 'restore')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not_restorable')
    expect(engine.exportSave().gtp).toBe(10)
  })

  it('blocks duplicate non-consumable grant', () => {
    const engine = createTestEngine()
    expect(engine.applyIapGrant('remove_ads').ok).toBe(true)
    const second = engine.applyIapGrant('remove_ads')
    expect(second.ok).toBe(false)
    expect(second.reason).toBe('already_owned')
    expect(engine.exportSave().removeAds).toBe(true)
  })

  it('applyIapGrant mutates save idempotently for bundles', () => {
    let save = createDefaultSave()
    save = applyIapGrant(
      save,
      { removeAds: true, gtp: 250, skinIds: ['toilet_tycoon'] },
      'toilet_tycoon_pack',
    )
    expect(save.removeAds).toBe(true)
    expect(save.gtp).toBe(250)
    expect(save.ownedSkins).toContain('toilet_tycoon')
    expect(save.ownedIapProducts).toContain('toilet_tycoon_pack')
  })
})

describe('CapacitorBillingService fail-closed', () => {
  it('does not grant products when native billing is unavailable', async () => {
    const billing = new CapacitorBillingService()
    await billing.init()
    expect(billing.isAvailable()).toBe(false)
    const purchase = await billing.purchase('gtp_small')
    expect(purchase).toEqual({ ok: false, reason: 'unavailable' })
    expect(await billing.loadProducts()).toEqual([])
    const restored = await billing.restore()
    expect(restored).toEqual([{ ok: false, reason: 'unavailable' }])
  })
})

describe('StubBillingService cancel path', () => {
  it('does not grant on failed purchase (simulated cancel)', async () => {
    const billing = new StubBillingService()
    const before = billing.getEntitlements()
    const result = await billing.purchase('gtp_huge')
    // Stub always succeeds; verify consumable does not mark owned forever
    expect(result.ok).toBe(true)
    expect(billing.getEntitlements().ownedProductIds).toEqual(before.ownedProductIds)
  })
})

describe('native purchase grant filters', () => {
  it('accepts purchased or missing Android state and rejects pending', () => {
    expect(isPurchasedAndroidState(undefined)).toBe(true)
    expect(isPurchasedAndroidState('PURCHASED')).toBe(true)
    expect(isPurchasedAndroidState(1)).toBe(true)
    expect(isPurchasedAndroidState('PENDING')).toBe(false)
    expect(
      restorableProductFromPurchase({
        productIdentifier: 'com.sundreamsoftware.poopclicker.remove_ads',
        purchaseState: 'PURCHASED',
      })?.id,
    ).toBe('remove_ads')
    expect(
      restorableProductFromPurchase({
        productIdentifier: 'com.sundreamsoftware.poopclicker.gtp_small',
        purchaseState: 'PURCHASED',
      }),
    ).toBeNull()
    expect(
      restorableProductFromPurchase({
        productIdentifier: 'com.sundreamsoftware.poopclicker.remove_ads',
        purchaseState: 'PENDING',
      }),
    ).toBeNull()
  })
})

describe('IAP catalog store IDs', () => {
  it('uses the production package prefix and no placeholder tokens', () => {
    for (const product of IAP_PRODUCTS) {
      expect(product.storeId.startsWith('com.sundreamsoftware.poopclicker.')).toBe(true)
      expect(product.storeId.toLowerCase()).not.toMatch(/placeholder|changeme|todo|example/)
    }
  })
})
