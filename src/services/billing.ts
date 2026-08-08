import { Capacitor } from '@capacitor/core'
import {
  IAP_BY_ID,
  IAP_BY_STORE_ID,
  IAP_PRODUCTS,
  type IapGrant,
  type IapProductDef,
} from '../content/iapProducts'
import type { PlayerSaveV2 } from '../core/save/saveSchema'

export type { IapGrant, IapProductDef }
export { IAP_PRODUCTS, IAP_BY_ID, IAP_BY_STORE_ID }

export interface StoreProduct {
  id: string
  storeId: string
  title: string
  description: string
  priceString: string
  kind: IapProductDef['kind']
}

export type PurchaseFailureReason =
  'cancel' | 'unavailable' | 'already_owned' | 'error' | 'pending' | 'not_found'

export interface PurchaseResult {
  ok: boolean
  productId?: string
  grant?: IapGrant
  reason?: PurchaseFailureReason
}

export interface BillingService {
  init(): Promise<void>
  getCatalog(): Promise<StoreProduct[]>
  purchase(productId: string): Promise<PurchaseResult>
  restore(): Promise<PurchaseResult[]>
}

export function applyIapGrant(
  save: PlayerSaveV2,
  grant: IapGrant,
  productId?: string,
): PlayerSaveV2 {
  const ownedSkins = new Set(save.ownedSkins)
  if (grant.skinIds) {
    for (const skinId of grant.skinIds) ownedSkins.add(skinId)
  }

  const ownedIapProducts = new Set(save.ownedIapProducts)
  if (productId && (grant.removeAds || IAP_BY_ID[productId]?.kind !== 'consumable')) {
    ownedIapProducts.add(productId)
  }

  return {
    ...save,
    removeAds: save.removeAds || Boolean(grant.removeAds),
    gtp: save.gtp + (grant.gtp ?? 0),
    ownedSkins: Array.from(ownedSkins),
    ownedIapProducts: Array.from(ownedIapProducts),
  }
}

function toStoreProduct(def: IapProductDef, priceString = def.displayPrice): StoreProduct {
  return {
    id: def.id,
    storeId: def.storeId,
    title: def.title,
    description: def.description,
    priceString,
    kind: def.kind,
  }
}

function isNonConsumable(kind: IapProductDef['kind']): boolean {
  return kind === 'non_consumable' || kind === 'bundle'
}

/** Deterministic billing for web/dev/tests. */
export class StubBillingService implements BillingService {
  private ready = false
  readonly ownedStoreIds = new Set<string>()

  async init(): Promise<void> {
    this.ready = true
  }

  async getCatalog(): Promise<StoreProduct[]> {
    if (!this.ready) await this.init()
    return IAP_PRODUCTS.map((def) => toStoreProduct(def))
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    const def = IAP_BY_ID[productId]
    if (!def) return { ok: false, reason: 'not_found' }
    if (isNonConsumable(def.kind) && this.ownedStoreIds.has(def.storeId)) {
      return { ok: false, productId, reason: 'already_owned' }
    }
    if (isNonConsumable(def.kind)) {
      this.ownedStoreIds.add(def.storeId)
    }
    return { ok: true, productId, grant: def.grants }
  }

  async restore(): Promise<PurchaseResult[]> {
    return IAP_PRODUCTS.filter((def) => this.ownedStoreIds.has(def.storeId)).map((def) => ({
      ok: true,
      productId: def.id,
      grant: def.grants,
    }))
  }
}

type NativePurchasesLike = {
  isBillingSupported: () => Promise<{ isBillingSupported: boolean }>
  getProducts: (opts: { productIdentifiers: string[]; productType?: string }) => Promise<{
    products: Array<{ identifier: string; title: string; description: string; priceString: string }>
  }>
  purchaseProduct: (opts: {
    productIdentifier: string
    isConsumable?: boolean
  }) => Promise<{ productIdentifier: string }>
  getPurchases: () => Promise<{ purchases: Array<{ productIdentifier: string }> }>
  restorePurchases: () => Promise<void>
}

export class CapacitorBillingService implements BillingService {
  private native: NativePurchasesLike | null = null
  private usingStub = false
  private readonly stub = new StubBillingService()

  async init(): Promise<void> {
    try {
      const mod = await import('@capgo/native-purchases')
      this.native = mod.NativePurchases as unknown as NativePurchasesLike
      const supported = await this.native.isBillingSupported()
      if (!supported.isBillingSupported) {
        throw new Error('billing unsupported')
      }
      this.usingStub = false
    } catch (err) {
      console.warn('[billing] native purchases unavailable; using StubBillingService', err)
      this.usingStub = true
      await this.stub.init()
    }
  }

  async getCatalog(): Promise<StoreProduct[]> {
    if (this.usingStub || !this.native) {
      return this.stub.getCatalog()
    }

    try {
      const { products } = await this.native.getProducts({
        productIdentifiers: IAP_PRODUCTS.map((p) => p.storeId),
        productType: 'inapp',
      })
      const byStoreId = new Map(products.map((p) => [p.identifier, p]))
      return IAP_PRODUCTS.map((def) => {
        const store = byStoreId.get(def.storeId)
        return toStoreProduct(def, store?.priceString ?? def.displayPrice)
      })
    } catch (err) {
      console.warn('[billing] getProducts failed', err)
      return IAP_PRODUCTS.map((def) => toStoreProduct(def))
    }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    if (this.usingStub || !this.native) {
      return this.stub.purchase(productId)
    }

    const def = IAP_BY_ID[productId]
    if (!def) return { ok: false, reason: 'not_found' }

    try {
      await this.native.purchaseProduct({
        productIdentifier: def.storeId,
        isConsumable: def.kind === 'consumable',
      })
      return { ok: true, productId, grant: def.grants }
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
      if (message.includes('cancel') || message.includes('user')) {
        return { ok: false, productId, reason: 'cancel' }
      }
      if (message.includes('already') || message.includes('owned')) {
        return { ok: false, productId, reason: 'already_owned' }
      }
      if (message.includes('pending')) {
        return { ok: false, productId, reason: 'pending' }
      }
      return { ok: false, productId, reason: 'error' }
    }
  }

  async restore(): Promise<PurchaseResult[]> {
    if (this.usingStub || !this.native) {
      return this.stub.restore()
    }

    try {
      await this.native.restorePurchases()
      const { purchases } = await this.native.getPurchases()
      const results: PurchaseResult[] = []
      for (const purchase of purchases) {
        const def = IAP_BY_STORE_ID[purchase.productIdentifier]
        if (!def) continue
        results.push({ ok: true, productId: def.id, grant: def.grants })
      }
      return results
    } catch (err) {
      console.warn('[billing] restore failed', err)
      return []
    }
  }
}

function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  } catch {
    return false
  }
}

export function createBillingService(): BillingService {
  const isTest =
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.MODE === 'test' || import.meta.env?.VITEST === 'true')
  if (isTest || !isNativeAndroid()) {
    return new StubBillingService()
  }
  return new CapacitorBillingService()
}
