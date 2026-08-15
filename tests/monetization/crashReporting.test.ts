import { afterEach, describe, expect, it } from 'vitest'
import { setAnalyticsTracker } from '../../src/services/analytics'
import { installCrashReporting, resetCrashReportingForTests } from '../../src/services/crashReporting'

describe('crashReporting', () => {
  afterEach(() => {
    resetCrashReportingForTests()
    setAnalyticsTracker(() => undefined)
  })

  it('records window errors without message text', () => {
    const events: Array<{ event: string; payload: Record<string, unknown> }> = []
    setAnalyticsTracker((event, payload = {}) => {
      events.push({ event, payload })
    })
    const listeners = new Map<string, EventListener>()
    const target = {
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener)
      },
    } as unknown as Window
    installCrashReporting(target)
    listeners.get('error')?.(
      { error: new TypeError('secret') } as ErrorEvent,
    )
    expect(events).toEqual([
      { event: 'app_error', payload: { name: 'TypeError', source: 'window_error' } },
    ])
  })
})
