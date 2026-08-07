export type RewardedPlacement =
  | 'double_offline'
  | 'income_boost'
  | 'golden_spawn'
  | 'instant_pps'
  | 'daily_reroll'
  | 'event_retry'

export interface AdResult {
  ok: boolean
  reason?: 'no_fill' | 'load_failure' | 'cancel' | 'duplicate' | 'offline' | 'completed'
}

export interface AdService {
  showRewarded(placement: RewardedPlacement): Promise<AdResult>
  showInterstitial(context: 'flush' | 'shop' | 'world_change'): Promise<AdResult>
}

/**
 * Deterministic stub ad service for local/dev/tests.
 * Never required for progression rewards.
 */
export class StubAdService implements AdService {
  private lastInterstitialAt = 0
  private inFlight = false
  failNext = false
  noFill = false

  async showRewarded(_placement: RewardedPlacement): Promise<AdResult> {
    if (this.inFlight) return { ok: false, reason: 'duplicate' }
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
    const now = Date.now()
    // Frequency cap: 90s, never right after launch (< 30s session handled by caller)
    if (now - this.lastInterstitialAt < 90_000) return { ok: false, reason: 'cancel' }
    if (context === 'flush' || context === 'world_change' || context === 'shop') {
      this.lastInterstitialAt = now
      return { ok: true, reason: 'completed' }
    }
    return { ok: false, reason: 'cancel' }
  }
}

export function canShowInterstitial(opts: {
  sessionAgeMs: number
  eventActive: boolean
  frenzyActive: boolean
}): boolean {
  if (opts.sessionAgeMs < 30_000) return false
  if (opts.eventActive) return false
  if (opts.frenzyActive) return false
  return true
}
