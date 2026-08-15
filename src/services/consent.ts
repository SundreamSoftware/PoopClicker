import { Capacitor } from '@capacitor/core'

export type ConsentOutcome = 'required' | 'not_required' | 'unavailable' | 'error'

export interface ConsentService {
  init(): Promise<ConsentOutcome>
  /** @deprecated alias of init */
  ensureConsent(): Promise<ConsentOutcome>
  showPrivacyOptions(): Promise<ConsentOutcome>
}

/** Always reports consent not required — used on web/tests and as safe fallback. */
export class StubConsentService implements ConsentService {
  async init(): Promise<ConsentOutcome> {
    return 'not_required'
  }

  async ensureConsent(): Promise<ConsentOutcome> {
    return this.init()
  }

  async showPrivacyOptions(): Promise<ConsentOutcome> {
    return 'not_required'
  }
}

/**
 * Wraps AdMob UMP APIs when `@capacitor-community/admob` is present.
 * Never throws; never hard-blocks the app.
 */
export class CapacitorUmpConsentService implements ConsentService {
  async init(): Promise<ConsentOutcome> {
    return this.ensureConsent()
  }

  async ensureConsent(): Promise<ConsentOutcome> {
    try {
      const mod = await import('@capacitor-community/admob')
      const { AdMob } = mod

      const info = await AdMob.requestConsentInfo()
      const status = String(info?.status ?? '').toUpperCase()

      if (info?.isConsentFormAvailable && (status === 'REQUIRED' || !info?.canRequestAds)) {
        try {
          await AdMob.showConsentForm()
        } catch {
          return 'error'
        }
        const after = await AdMob.requestConsentInfo()
        return after?.canRequestAds ? 'not_required' : 'required'
      }

      if (info?.canRequestAds) return 'not_required'
      if (status === 'REQUIRED') return 'required'
      if (status === 'NOT_REQUIRED' || status === 'OBTAINED') return 'not_required'
      return 'unavailable'
    } catch (err) {
      console.warn('[consent] UMP unavailable', err)
      return 'unavailable'
    }
  }

  async showPrivacyOptions(): Promise<ConsentOutcome> {
    try {
      const mod = await import('@capacitor-community/admob')
      await mod.AdMob.showPrivacyOptionsForm()
      return 'required'
    } catch (err) {
      console.warn('[consent] privacy options unavailable', err)
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
