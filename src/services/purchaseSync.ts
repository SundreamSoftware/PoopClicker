import type { GameEngine } from '../core/GameEngine'
import type { BillingService } from './billing'

export async function restorePurchasesToEngine(
  engine: GameEngine,
  store: BillingService,
): Promise<{ restored: number; unavailable: boolean }> {
  const results = await store.restore()
  if (results.some((result) => result.reason === 'unavailable')) {
    return { restored: 0, unavailable: true }
  }
  let restored = 0
  for (const result of results) {
    if (result.ok && result.productId && engine.applyIapGrant(result.productId, 'restore').ok) {
      restored += 1
    }
  }
  return { restored, unavailable: false }
}

export async function syncEntitlementsToEngine(
  engine: GameEngine,
  store: BillingService,
): Promise<void> {
  try {
    const results = await store.syncEntitlements()
    for (const result of results) {
      if (result.ok && result.productId) {
        engine.applyIapGrant(result.productId, 'restore')
      }
    }
  } catch {
    // Store sync must never block gameplay.
  }
}
