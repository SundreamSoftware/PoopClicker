import { describe, expect, it } from 'vitest'
import { StubConsentService } from '../../src/services/consent'

describe('consent service', () => {
  it('never blocks web/test startup', async () => {
    const service = new StubConsentService()

    await expect(service.init()).resolves.toBe('not_required')
    await expect(service.ensureConsent()).resolves.toBe('not_required')
  })

  it('exposes privacy choices safely where UMP is not required', async () => {
    const service = new StubConsentService()

    await expect(service.showPrivacyOptions()).resolves.toBe('not_required')
  })
})
