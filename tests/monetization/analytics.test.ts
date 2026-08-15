import { describe, expect, it } from 'vitest'
import {
  FirebaseAnalyticsSink,
  isAnalyticsCollectionEnabled,
  setAnalyticsCollectionEnabled,
  setAnalyticsTracker,
  trackProduct,
} from '../../src/services/analytics'

describe('analytics consent gate', () => {
  it('records product events through the bound tracker', () => {
    const events: Array<{ event: string; payload: Record<string, unknown> }> = []
    setAnalyticsTracker((event, payload = {}) => {
      events.push({ event, payload })
    })
    trackProduct('iap_start', { productId: 'gtp_small' })
    expect(events).toEqual([{ event: 'iap_start', payload: { productId: 'gtp_small' } }])
  })

  it('keeps Firebase collection off until consent enables it', () => {
    setAnalyticsCollectionEnabled(false)
    expect(isAnalyticsCollectionEnabled()).toBe(false)
    const sink = new FirebaseAnalyticsSink()
    sink.track('session_start', { sessionsCount: 1 })
    setAnalyticsCollectionEnabled(true)
    expect(isAnalyticsCollectionEnabled()).toBe(true)
    setAnalyticsCollectionEnabled(false)
  })
})
