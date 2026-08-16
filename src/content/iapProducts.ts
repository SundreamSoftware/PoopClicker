export type IapProductKind = 'non_consumable' | 'consumable' | 'bundle'

export interface IapGrant {
  removeAds?: boolean
  gtp?: number
  skinIds?: string[]
  autoBuy?: boolean
  /** Permanent production multiplier (1 = none, 2 = double). */
  productionMultiplier?: number
}

export interface IapProductDef {
  id: string
  /** Store product identifier (Play Console / App Store Connect). */
  storeId: string
  title: string
  description: string
  kind: IapProductKind
  /** Display price fallback when store metadata is unavailable (web/stub). */
  displayPrice: string
  /** Hidden / locked in Shop until this many Flushes. */
  unlockFlushCount?: number
  grants: IapGrant
}

/**
 * Data-driven IAP catalog.
 * Store IDs are placeholders until Play Console products are created.
 */
export const IAP_PRODUCTS: IapProductDef[] = [
  {
    id: 'remove_ads',
    storeId: 'com.sundreamsoftware.poopclicker.remove_ads',
    title: 'Remove Ads',
    description: 'Grants: Remove interstitial ads. Rewarded ads stay optional.',
    kind: 'non_consumable',
    displayPrice: '$2.99',
    grants: { removeAds: true },
  },
  {
    id: 'gtp_small',
    storeId: 'com.sundreamsoftware.poopclicker.gtp_small',
    title: 'Small GTP Pack',
    description: 'Grants: 50 Golden Toilet Paper.',
    kind: 'consumable',
    displayPrice: '$0.99',
    grants: { gtp: 50 },
  },
  {
    id: 'gtp_medium',
    storeId: 'com.sundreamsoftware.poopclicker.gtp_medium',
    title: 'Medium GTP Pack',
    description: 'Grants: 180 Golden Toilet Paper.',
    kind: 'consumable',
    displayPrice: '$2.99',
    grants: { gtp: 180 },
  },
  {
    id: 'gtp_large',
    storeId: 'com.sundreamsoftware.poopclicker.gtp_large',
    title: 'Large GTP Pack',
    description: 'Grants: 350 Golden Toilet Paper.',
    kind: 'consumable',
    displayPrice: '$4.99',
    grants: { gtp: 350 },
  },
  {
    id: 'gtp_huge',
    storeId: 'com.sundreamsoftware.poopclicker.gtp_huge',
    title: 'Huge GTP Pack',
    description: 'Grants: 800 Golden Toilet Paper.',
    kind: 'consumable',
    displayPrice: '$9.99',
    grants: { gtp: 800 },
  },
  {
    id: 'gtp_mega',
    storeId: 'com.sundreamsoftware.poopclicker.gtp_mega',
    title: 'Mega GTP Pack',
    description: 'Grants: 2000 Golden Toilet Paper.',
    kind: 'consumable',
    displayPrice: '$19.99',
    grants: { gtp: 2000 },
  },
  {
    id: 'toilet_tycoon_pack',
    storeId: 'com.sundreamsoftware.poopclicker.toilet_tycoon_pack',
    title: 'Toilet Tycoon Pack',
    description: 'Grants: Remove Ads, 250 GTP, Toilet Tycoon skin.',
    kind: 'bundle',
    displayPrice: '$6.99',
    grants: {
      removeAds: true,
      gtp: 250,
      skinIds: ['toilet_tycoon'],
    },
  },
  {
    id: 'convenience_pack',
    storeId: 'com.sundreamsoftware.poopclicker.convenience_pack',
    title: 'Convenience Pack',
    description: 'Grants: Auto-Buy, permanent 2× tap & idle production, Remove Ads.',
    kind: 'bundle',
    displayPrice: '$29.99',
    unlockFlushCount: 1,
    grants: {
      removeAds: true,
      autoBuy: true,
      productionMultiplier: 2,
    },
  },
]

export const IAP_BY_ID: Record<string, IapProductDef> = Object.fromEntries(
  IAP_PRODUCTS.map((p) => [p.id, p]),
)

export const IAP_BY_STORE_ID: Record<string, IapProductDef> = Object.fromEntries(
  IAP_PRODUCTS.map((p) => [p.storeId, p]),
)

export function formatIapGrantSummary(def: IapProductDef): string {
  const parts: string[] = []
  if (def.grants.autoBuy) parts.push('Auto-Buy')
  if ((def.grants.productionMultiplier ?? 1) > 1) {
    parts.push(`permanent ${def.grants.productionMultiplier}× production`)
  }
  if (def.grants.removeAds) parts.push('Remove Ads')
  if (def.grants.gtp) parts.push(`${def.grants.gtp} GTP`)
  if (def.grants.skinIds?.length) parts.push(def.grants.skinIds.join(', '))
  return parts.length ? `Grants: ${parts.join(', ')}.` : def.description
}
