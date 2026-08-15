import { Capacitor } from '@capacitor/core'
import {
  IAP_BY_ID,
  IAP_BY_STORE_ID,
  IAP_PRODUCTS,
  type IapGrant,
  type IapProductDef,
} from '../content/iapProducts'
import { getLiveConfig } from '../config/liveConfig'
import type { PlayerSaveV2 } from '../core/save/saveSchema'
import { trackProduct } from './analytics'

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

export interface Entitlements {
  removeAds: boolean
  ownedProductIds: string[]
}

export type IapGrantSource = 'purchase' | 'restore'

export interface BillingService {
  init(): Promise<void>
  /** False when native store failed to initialize. Web/test stubs stay available. */
  isAvailable(): boolean
  loadProducts(): Promise<StoreProduct[]>
  /** @deprecated alias of loadProducts */
  getCatalog(): Promise<StoreProduct[]>
  purchase(productId: string): Promise<PurchaseResult>
  restore(): Promise<PurchaseResult[]>
  /** Silent Play entitlement sync — getPurchases only, no restore dialog. */
  syncEntitlements(): Promise<PurchaseResult[]>
  getEntitlements(): Entitlements
}

/**
 * Expected GameEngine grant hooks (idempotent via `ownedIapProducts` on save).
 * Prefer `applyIapGrant` for concrete mutations.
 */
export function describeExpectedGrantHooks(): string {
  return [
    'Idempotent grants via PlayerSaveV2.ownedIapProducts + removeAds + ownedSkins + gtp.',
    'Non-consumables/bundles: skip re-grant when productId already in ownedIapProducts.',
    'Consumable GTP packs: always add grants.gtp; do not mark as owned forever.',
    'Engine should expose applyIapGrant(productId) / restoreEntitlements(productIds).',
  ].join(' ')
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

export function isPurchasedAndroidState(state: string | number | undefined | null): boolean {
  if (state == null || state === '') return true
  const normalized = String(state).toUpperCase()
  return normalized === 'PURCHASED' || normalized === '1'
}

export function restorableProductFromPurchase(purchase: {
  productIdentifier: string
  purchaseState?: string | number
}): IapProductDef | null {
  if (!isPurchasedAndroidState(purchase.purchaseState)) return null
  const def = IAP_BY_STORE_ID[purchase.productIdentifier]
  if (!def || def.kind === 'consumable') return null
  return def
}

/** Deterministic billing for web/dev/tests. */
export class StubBillingService implements BillingService {
  private ready = false
  readonly ownedStoreIds = new Set<string>()

  async init(): Promise<void> {
    this.ready = true
  }

  isAvailable(): boolean {
    return true
  }

  async loadProducts(): Promise<StoreProduct[]> {
    if (!this.ready) await this.init()
    return IAP_PRODUCTS.map((def) => toStoreProduct(def))
  }

  async getCatalog(): Promise<StoreProduct[]> {
    return this.loadProducts()
  }

  getEntitlements(): Entitlements {
    const ownedProductIds = IAP_PRODUCTS.filter((d) => this.ownedStoreIds.has(d.storeId)).map(
      (d) => d.id,
    )
    const removeAds = ownedProductIds.some((id) => Boolean(IAP_BY_ID[id]?.grants.removeAds))
    return { removeAds, ownedProductIds }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    trackProduct('iap_start', { productId })
    if (!getLiveConfig().features.iapEnabled) {
      trackProduct('iap_fail', { productId, reason: 'unavailable' })
      return { ok: false, reason: 'unavailable' }
    }
    const def = IAP_BY_ID[productId]
    if (!def) {
      trackProduct('iap_fail', { productId, reason: 'not_found' })
      return { ok: false, reason: 'not_found' }
    }
    if (isNonConsumable(def.kind) && this.ownedStoreIds.has(def.storeId)) {
      trackProduct('iap_fail', { productId, reason: 'already_owned' })
      return { ok: false, productId, reason: 'already_owned' }
    }
    if (isNonConsumable(def.kind)) {
      this.ownedStoreIds.add(def.storeId)
    }
    trackProduct('iap_success', { productId })
    return { ok: true, productId, grant: def.grants }
  }

  async restore(): Promise<PurchaseResult[]> {
    return this.syncEntitlements()
  }

  async syncEntitlements(): Promise<PurchaseResult[]> {
    return IAP_PRODUCTS.filter(
      (def) => isNonConsumable(def.kind) && this.ownedStoreIds.has(def.storeId),
    ).map((def) => ({
      ok: true,
      productId: def.id,
      grant: def.grants,
    }))
  }
}

type NativePurchase = {
  productIdentifier: string
  purchaseState?: string | number
  isAcknowledged?: boolean
  purchaseToken?: string
}

type NativePurchasesLike = {
  isBillingSupported: () => Promise<{ isBillingSupported: boolean }>
  getProducts: (opts: { productIdentifiers: string[]; productType?: string }) => Promise<{
    products: Array<{ identifier: string; title: string; description: string; priceString: string }>
  }>
  purchaseProduct: (opts: {
    productIdentifier: string
    isConsumable?: boolean
  }) => Promise<NativePurchase>
  getPurchases: () => Promise<{ purchases: NativePurchase[] }>
  restorePurchases: () => Promise<void>
  acknowledgePurchase?: (opts: { purchaseToken: string }) => Promise<void>
  consumePurchase?: (opts: { purchaseToken: string }) => Promise<void>
}

export class CapacitorBillingService implements BillingService {
  private native: NativePurchasesLike | null = null
  private initialized = false
  private available = false
  private cachedEntitlements: Entitlements | null = null

  async init(): Promise<void> {
    try {
      const mod = await import('@capgo/native-purchases')
      this.native = mod.NativePurchases as unknown as NativePurchasesLike
      const supported = await this.native.isBillingSupported()
      if (!supported.isBillingSupported) {
        throw new Error('billing unsupported')
      }
      this.available = true
    } catch (err) {
      console.warn('[billing] native purchases unavailable; store locked closed', err)
      this.native = null
      this.available = false
    } finally {
      this.initialized = true
    }
  }

  isAvailable(): boolean {
    return this.available
  }

  private async ensureReady(): Promise<boolean> {
    if (!this.initialized) await this.init()
    return this.available && this.native != null
  }

  async loadProducts(): Promise<StoreProduct[]> {
    if (!(await this.ensureReady()) || !this.native) {
      return []
    }

    try {
      const { products } = await this.native.getProducts({
        productIdentifiers: IAP_PRODUCTS.map((p) => p.storeId),
        productType: 'inapp',
      })
      const byStoreId = new Map(products.map((p) => [p.identifier, p]))
      return IAP_PRODUCTS.flatMap((def) => {
        const store = byStoreId.get(def.storeId)
        if (!store) return []
        return [toStoreProduct(def, store.priceString)]
      })
    } catch (err) {
      console.warn('[billing] getProducts failed', err)
      return []
    }
  }

  async getCatalog(): Promise<StoreProduct[]> {
    return this.loadProducts()
  }

  getEntitlements(): Entitlements {
    return this.cachedEntitlements ?? { removeAds: false, ownedProductIds: [] }
  }

  private updateEntitlements(productIds: string[]): void {
    const uniqueIds = Array.from(new Set(productIds))
    const removeAds = uniqueIds.some((id) => Boolean(IAP_BY_ID[id]?.grants.removeAds))
    this.cachedEntitlements = { removeAds, ownedProductIds: uniqueIds }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    trackProduct('iap_start', { productId })
    if (!getLiveConfig().features.iapEnabled) {
      trackProduct('iap_fail', { productId, reason: 'unavailable' })
      return { ok: false, reason: 'unavailable' }
    }
    if (!(await this.ensureReady()) || !this.native) {
      trackProduct('iap_fail', { productId, reason: 'unavailable' })
      return { ok: false, reason: 'unavailable' }
    }

    const def = IAP_BY_ID[productId]
    if (!def) {
      trackProduct('iap_fail', { productId, reason: 'not_found' })
      return { ok: false, reason: 'not_found' }
    }

    try {
      const txn = await this.native.purchaseProduct({
        productIdentifier: def.storeId,
        isConsumable: def.kind === 'consumable',
      })
      if (!isPurchasedAndroidState(txn.purchaseState)) {
        trackProduct('iap_fail', { productId, reason: 'pending' })
        return { ok: false, productId, reason: 'pending' }
      }
      await this.finishNativeTransaction(txn, def)

      if (isNonConsumable(def.kind)) {
        const current = this.cachedEntitlements?.ownedProductIds ?? []
        this.updateEntitlements([...current, productId])
      }

      trackProduct('iap_success', { productId })
      return { ok: true, productId, grant: def.grants }
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
      if (message.includes('cancel') || message.includes('user')) {
        trackProduct('iap_fail', { productId, reason: 'cancel' })
        return { ok: false, productId, reason: 'cancel' }
      }
      if (message.includes('already') || message.includes('owned')) {
        trackProduct('iap_fail', { productId, reason: 'already_owned' })
        return { ok: false, productId, reason: 'already_owned' }
      }
      if (message.includes('pending')) {
        trackProduct('iap_fail', { productId, reason: 'pending' })
        return { ok: false, productId, reason: 'pending' }
      }
      trackProduct('iap_fail', { productId, reason: 'error' })
      return { ok: false, productId, reason: 'error' }
    }
  }

  async restore(): Promise<PurchaseResult[]> {
    if (!(await this.ensureReady()) || !this.native) {
      return [{ ok: false, reason: 'unavailable' }]
    }

    try {
      await this.native.restorePurchases()
      return this.collectRestorablePurchases()
    } catch (err) {
      console.warn('[billing] restore failed', err)
      return []
    }
  }

  async syncEntitlements(): Promise<PurchaseResult[]> {
    if (!(await this.ensureReady()) || !this.native) {
      return []
    }
    try {
      return this.collectRestorablePurchases()
    } catch (err) {
      console.warn('[billing] entitlement sync failed', err)
      return []
    }
  }

  private async collectRestorablePurchases(): Promise<PurchaseResult[]> {
    if (!this.native) return []
    const { purchases } = await this.native.getPurchases()
    const results: PurchaseResult[] = []
    const productIds: string[] = []
    for (const purchase of purchases) {
      const def = restorableProductFromPurchase(purchase)
      if (!def) continue
      await this.finishNativeTransaction(purchase, def)
      results.push({ ok: true, productId: def.id, grant: def.grants })
      productIds.push(def.id)
    }
    this.updateEntitlements(productIds)
    return results
  }

  private async finishNativeTransaction(
    txn: NativePurchase,
    def: IapProductDef,
  ): Promise<void> {
    const token = txn.purchaseToken
    if (!token || !this.native) return
    try {
      if (def.kind === 'consumable' && this.native.consumePurchase) {
        await this.native.consumePurchase({ purchaseToken: token })
        return
      }
      if (txn.isAcknowledged === false && this.native.acknowledgePurchase) {
        await this.native.acknowledgePurchase({ purchaseToken: token })
      }
    } catch (err) {
      console.warn('[billing] finish transaction failed', err)
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
