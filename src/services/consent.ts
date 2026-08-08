import { Capacitor } from '@capacitor/core'

export type ConsentOutcome = 'required' | 'not_required' | 'unavailable' | 'error'

export interface ConsentService {
  ensureConsent(): Promise<ConsentOutcome>
}

/** Always reports consent not required — used on web/tests and as safe fallback. */
export class StubConsentService implements ConsentService {
  async ensureConsent(): Promise<ConsentOutcome> {
    return 'not_required'
  }
}

/**
 * Wraps AdMob UMP APIs when `@capacitor-community/admob` is present.
 * Never throws; never hard-blocks the app.
 */
export class CapacitorUmpConsentService implements ConsentService {
  async ensureConsent(): Promise<ConsentOutcome> {
    try {
      const mod = await import('@capacitor-community/admob')
      const { AdMob } = mod

      const info = await AdMob.requestConsentInfo()
      const status = String(info?.status ?? '').toUpperCase()

      if (info?.canRequestAds && status !== 'REQUIRED') {
        return 'not_required'
      }

      if (info?.isConsentFormAvailable) {
        try {
          await AdMob.showConsentForm()
          return 'required'
        } catch {
          return 'error'
        }
      }

      if (status === 'REQUIRED') return 'required'
      if (status === 'NOT_REQUIRED' || status === 'OBTAINED') return 'not_required'
      return 'unavailable'
    } catch (err) {
      console.warn('[consent] UMP unavailable', err)
      return 'unavailable'
    }
  }
}

export function createConsentService(): ConsentService {
  const isTest =
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.MODE === 'test' || import.meta.env?.VITEST === 'true')
  try {
    if (isTest || !Capacitor.isNativePlatform()) {
      return new StubConsentService()
    }
  } catch {
    return new StubConsentService()
  }
  return new CapacitorUmpConsentService()
}
