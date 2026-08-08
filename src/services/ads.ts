import { Capacitor } from '@capacitor/core'
import {
  getAdMobIds,
  INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS,
  INTERSTITIAL_MIN_INTERVAL_MS,
  INTERSTITIAL_MIN_SESSION_AGE_MS,
} from '../config/monetization'

export type RewardedPlacement =
  | 'double_offline'
  | 'income_boost'
  | 'golden_spawn'
  | 'instant_pps'
  | 'daily_reroll'
  | 'event_retry'

export interface AdResult {
  ok: boolean
  reason?: 'no_fill' | 'load_failure' | 'cancel' | 'duplicate' | 'offline' | 'completed' | 'not_ready'
}

export interface AdService {
  init(): Promise<void>
  showRewarded(placement: RewardedPlacement): Promise<AdResult>
  showInterstitial(context: 'flush' | 'shop' | 'world_change'): Promise<AdResult>
}

/**
 * Deterministic stub ad service for local/dev/tests/web.
 * Never required for progression rewards.
 */
export class StubAdService implements AdService {
  private lastInterstitialAt = 0
  private inFlight = false
  private ready = true
  failNext = false
  noFill = false

  async init(): Promise<void> {
    this.ready = true
  }

  async showRewarded(_placement: RewardedPlacement): Promise<AdResult> {
    if (this.inFlight) return { ok: false, reason: 'duplicate' }
    if (!this.ready) return { ok: false, reason: 'not_ready' }
    this.inFlight = true
    try {
      if (this.noFill) return { ok: false, reason: 'no_fill' }
      if (this.failNext) {
        this.failNext = false
        return { ok: false, reason: 'load_failure' }
      }
      return { ok: true, reason: 'completed' }
    } finally {
      this.inFlight = false
    }
  }

  async showInterstitial(context: 'flush' | 'shop' | 'world_change'): Promise<AdResult> {
    if (this.inFlight) return { ok: false, reason: 'duplicate' }
    if (!this.ready) return { ok: false, reason: 'not_ready' }
    const now = Date.now()
    if (now - this.lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) {
      return { ok: false, reason: 'cancel' }
    }
    if (context === 'flush' || context === 'world_change' || context === 'shop') {
      this.lastInterstitialAt = now
      return { ok: true, reason: 'completed' }
    }
    return { ok: false, reason: 'cancel' }
  }
}

type AdMobLike = {
  initialize: (opts?: { initializeForTesting?: boolean }) => Promise<void>
  prepareRewardVideoAd: (opts: { adId: string; isTesting?: boolean }) => Promise<unknown>
  showRewardVideoAd: () => Promise<unknown>
  prepareInterstitial: (opts: { adId: string; isTesting?: boolean }) => Promise<unknown>
  showInterstitial: () => Promise<unknown>
}

/**
 * Native AdMob wrapper. Dynamically imports the plugin; falls back to stub if missing.
 */
export class CapacitorAdMobService implements AdService {
  private admob: AdMobLike | null = null
  private ready = false
  private inFlight = false
  private lastInterstitialAt = 0
  private lastRewardedAt = 0
  private readonly stub = new StubAdService()
  private usingStub = false

  async init(): Promise<void> {
    try {
      const mod = await import('@capacitor-community/admob')
      this.admob = mod.AdMob as unknown as AdMobLike
      const ids = getAdMobIds()
      await this.admob.initialize({
        initializeForTesting: ids.isTesting,
      })
      this.ready = true
      this.usingStub = false
    } catch (err) {
      console.warn('[ads] @capacitor-community/admob unavailable; using StubAdService', err)
      this.usingStub = true
      await this.stub.init()
      this.ready = true
    }
  }

  async showRewarded(placement: RewardedPlacement): Promise<AdResult> {
    if (this.usingStub || !this.admob) return this.stub.showRewarded(placement)
    if (this.inFlight) return { ok: false, reason: 'duplicate' }
    if (!this.ready) return { ok: false, reason: 'not_ready' }

    this.inFlight = true
    try {
      const ids = getAdMobIds()
      await this.admob.prepareRewardVideoAd({
        adId: ids.rewarded,
        isTesting: ids.isTesting,
      })
      await this.admob.showRewardVideoAd()
      this.lastRewardedAt = Date.now()
      return { ok: true, reason: 'completed' }
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
      if (message.includes('cancel') || message.includes('dismiss')) {
        return { ok: false, reason: 'cancel' }
      }
      if (message.includes('no fill') || message.includes('nofill') || message.includes('no_fill')) {
        return { ok: false, reason: 'no_fill' }
      }
      return { ok: false, reason: 'load_failure' }
    } finally {
      this.inFlight = false
    }
  }

  async showInterstitial(context: 'flush' | 'shop' | 'world_change'): Promise<AdResult> {
    if (this.usingStub || !this.admob) return this.stub.showInterstitial(context)
    if (this.inFlight) return { ok: false, reason: 'duplicate' }
    if (!this.ready) return { ok: false, reason: 'not_ready' }

    const now = Date.now()
    if (now - this.lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) {
      return { ok: false, reason: 'cancel' }
    }
    if (now - this.lastRewardedAt < INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS) {
      return { ok: false, reason: 'cancel' }
    }

    this.inFlight = true
    try {
      const ids = getAdMobIds()
      await this.admob.prepareInterstitial({
        adId: ids.interstitial,
        isTesting: ids.isTesting,
      })
      await this.admob.showInterstitial()
      this.lastInterstitialAt = Date.now()
      return { ok: true, reason: 'completed' }
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
      if (message.includes('cancel') || message.includes('dismiss')) {
        return { ok: false, reason: 'cancel' }
      }
      if (message.includes('no fill') || message.includes('nofill') || message.includes('no_fill')) {
        return { ok: false, reason: 'no_fill' }
      }
      return { ok: false, reason: 'load_failure' }
    } finally {
      this.inFlight = false
    }
  }

  getLastRewardedAt(): number {
    return this.lastRewardedAt
  }
}

export function canShowInterstitial(opts: {
  sessionAgeMs: number
  eventActive: boolean
  frenzyActive: boolean
  lastRewardedAt?: number
  removeAds?: boolean
  now?: number
}): boolean {
  if (opts.removeAds) return false
  if (opts.sessionAgeMs < INTERSTITIAL_MIN_SESSION_AGE_MS) return false
  if (opts.eventActive) return false
  if (opts.frenzyActive) return false
  const now = opts.now ?? Date.now()
  if (
    opts.lastRewardedAt != null &&
    now - opts.lastRewardedAt < INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS
  ) {
    return false
  }
  return true
}

function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  } catch {
    return false
  }
}

/** Stub on web/test; Capacitor AdMob on native Android. */
export function createAdService(): AdService {
  const isTest =
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.MODE === 'test' || import.meta.env?.VITEST === 'true')
  if (isTest || !isNativeAndroid()) {
    return new StubAdService()
  }
  return new CapacitorAdMobService()
}
