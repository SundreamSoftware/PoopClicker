import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS,
  INTERSTITIAL_MIN_SESSION_AGE_MS,
} from '../../src/config/monetization'
import { canShowInterstitial, StubAdService } from '../../src/services/ads'

describe('StubAdService rewarded', () => {
  let ads: StubAdService

  beforeEach(() => {
    ads = new StubAdService()
  })

  it('completes on success', async () => {
    const result = await ads.showRewarded('income_boost')
    expect(result).toEqual({ ok: true, reason: 'completed' })
  })

  it('returns no_fill when configured', async () => {
    ads.noFill = true
    const result = await ads.showRewarded('daily_reroll')
    expect(result).toEqual({ ok: false, reason: 'no_fill' })
  })

  it('returns load_failure when configured', async () => {
    ads.failNext = true
    const result = await ads.showRewarded('event_retry')
    expect(result).toEqual({ ok: false, reason: 'load_failure' })
  })

  it('returns duplicate while in flight', async () => {
    ;(ads as unknown as { inFlight: boolean }).inFlight = true
    const result = await ads.showRewarded('golden_spawn')
    expect(result).toEqual({ ok: false, reason: 'duplicate' })
  })
})

describe('StubAdService interstitial', () => {
  let ads: StubAdService

  beforeEach(() => {
    vi.useFakeTimers()
    ads = new StubAdService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows on valid context after cooldown', async () => {
    const first = await ads.showInterstitial('flush')
    expect(first.ok).toBe(true)
    const second = await ads.showInterstitial('flush')
    expect(second).toEqual({ ok: false, reason: 'cancel' })
  })

  it('returns duplicate while interstitial is in flight', async () => {
    ;(ads as unknown as { inFlight: boolean }).inFlight = true
    const result = await ads.showInterstitial('flush')
    expect(result).toEqual({ ok: false, reason: 'duplicate' })
  })
})

describe('canShowInterstitial guardrails', () => {
  const base = {
    sessionAgeMs: INTERSTITIAL_MIN_SESSION_AGE_MS + 1000,
    eventActive: false,
    frenzyActive: false,
    removeAds: false,
    now: 1_000_000,
  }

  it('allows when session is mature and no blockers', () => {
    expect(canShowInterstitial(base)).toBe(true)
  })

  it('blocks during active event', () => {
    expect(canShowInterstitial({ ...base, eventActive: true })).toBe(false)
  })

  it('blocks during frenzy', () => {
    expect(canShowInterstitial({ ...base, frenzyActive: true })).toBe(false)
  })

  it('blocks when removeAds entitlement is active', () => {
    expect(canShowInterstitial({ ...base, removeAds: true })).toBe(false)
  })

  it('blocks shortly after rewarded completion', () => {
    expect(
      canShowInterstitial({
        ...base,
        lastRewardedAt: base.now - INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS + 1000,
      }),
    ).toBe(false)
  })

  it('blocks before minimum session age', () => {
    expect(
      canShowInterstitial({ ...base, sessionAgeMs: INTERSTITIAL_MIN_SESSION_AGE_MS - 1 }),
    ).toBe(false)
  })
})
