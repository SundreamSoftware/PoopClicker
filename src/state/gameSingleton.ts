import { GameEngine } from '../core/GameEngine'
import { createAdService } from '../services/ads'
import { createAnalytics } from '../services/analytics'
import { createBillingService } from '../services/billing'
import { createConsentService } from '../services/consent'
import { createNotificationScheduler } from '../services/notifications'

export const analytics = createAnalytics()

export const engine = GameEngine.fromStorage({
  analytics,
  storage: typeof localStorage !== 'undefined' ? localStorage : null,
})

export const ads = createAdService()
export const consent = createConsentService()
export const billing = createBillingService()
export const notifications = createNotificationScheduler()

/** Session start for interstitial age gating. */
export const sessionStartMs = Date.now()

export { createAdService, createAnalytics, createBillingService, createConsentService }
