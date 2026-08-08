import { GameEngine } from '../core/GameEngine'
import { AggregatingAnalytics, ConsoleAnalytics } from '../services/analytics'
import { createAdService } from '../services/ads'
import { createBillingService } from '../services/billing'
import { createConsentService } from '../services/consent'
import { createNotificationScheduler } from '../services/notifications'

export const analytics = new AggregatingAnalytics(new ConsoleAnalytics())

export const engine = GameEngine.fromStorage(
  typeof localStorage !== 'undefined' ? localStorage : null,
)

export const ads = createAdService()
export const consent = createConsentService()
export const billing = createBillingService()
export const notifications = createNotificationScheduler()

export { createAdService, createBillingService, createConsentService }
