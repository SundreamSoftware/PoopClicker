import { Capacitor } from '@capacitor/core'

export interface AnalyticsSink {
  track(event: string, payload?: Record<string, unknown>): void
}

let productTracker: AnalyticsSink['track'] = () => undefined
let firebaseCollectionEnabled = false

/** Wire GameEngine/UI analytics into ads/billing without import cycles. */
export function setAnalyticsTracker(track: AnalyticsSink['track']): void {
  productTracker = track
}

export function trackProduct(event: string, payload: Record<string, unknown> = {}): void {
  try {
    productTracker(event, payload)
  } catch {
    // Monetization telemetry must never break a purchase or ad.
  }
}

/** Firebase / network analytics stay off until UMP allows ads (AUD-003). */
export function setAnalyticsCollectionEnabled(enabled: boolean): void {
  firebaseCollectionEnabled = enabled
}

export function isAnalyticsCollectionEnabled(): boolean {
  return firebaseCollectionEnabled
}

export class MemoryAnalytics implements AnalyticsSink {
  readonly events: Array<{ event: string; payload: Record<string, unknown>; at: number }> = []

  track(event: string, payload: Record<string, unknown> = {}): void {
    this.events.push({ event, payload, at: Date.now() })
  }
}

export class ConsoleAnalytics implements AnalyticsSink {
  track(event: string, payload: Record<string, unknown> = {}): void {
    if (import.meta.env.DEV) {
      console.info('[analytics]', event, payload)
    }
  }
}

/** Fan-out sink used by createAnalytics(). */
export class CompositeAnalytics implements AnalyticsSink {
  constructor(private readonly sinks: AnalyticsSink[]) {}

  track(event: string, payload: Record<string, unknown> = {}): void {
    for (const sink of this.sinks) {
      try {
        sink.track(event, payload)
      } catch {
        // Individual sink failures must not break gameplay.
      }
    }
  }
}

/** High-frequency metrics should be aggregated before network send. */
export class AggregatingAnalytics implements AnalyticsSink {
  private tapCount = 0
  private readonly inner: AnalyticsSink

  constructor(inner: AnalyticsSink) {
    this.inner = inner
  }

  track(event: string, payload: Record<string, unknown> = {}): void {
    if (event === 'tap') {
      this.tapCount += 1
      if (this.tapCount % 50 === 0) {
        this.inner.track('taps_aggregated', { count: this.tapCount, ...payload })
      }
      return
    }
    this.inner.track(event, payload)
  }
}

/**
 * Firebase Analytics via `@capacitor-firebase/analytics`.
 * Dynamic import on native; no-op if the plugin or Firebase config is missing.
 */
export class FirebaseAnalyticsSink implements AnalyticsSink {
  private plugin: {
    logEvent: (opts: { name: string; params?: Record<string, unknown> }) => Promise<void>
  } | null = null
  private loadAttempted = false
  private disabled = false

  private async ensure(): Promise<boolean> {
    if (this.disabled) return false
    if (this.plugin) return true
    if (this.loadAttempted) return false
    this.loadAttempted = true
    try {
      const mod = await import('@capacitor-firebase/analytics')
      this.plugin = mod.FirebaseAnalytics
      return true
    } catch {
      this.disabled = true
      return false
    }
  }

  track(event: string, payload: Record<string, unknown> = {}): void {
    if (!firebaseCollectionEnabled) return
    void this.ensure().then((ok) => {
      if (!ok || !this.plugin) return
      const name = event.slice(0, 40)
      void this.plugin.logEvent({ name, params: payload }).catch(() => {
        // Swallow network / native errors.
      })
    })
  }
}

function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/**
 * AggregatingAnalytics wrapping Console in DEV and Firebase on native.
 * Memory sink is intentionally omitted in production (use MemoryAnalytics in tests).
 */
export function createAnalytics(): AggregatingAnalytics {
  const sinks: AnalyticsSink[] = []
  if (import.meta.env.DEV) {
    sinks.push(new ConsoleAnalytics())
  }
  if (isNativePlatform()) {
    sinks.push(new FirebaseAnalyticsSink())
  }
  if (sinks.length === 0) {
    sinks.push({ track: () => undefined })
  }
  return new AggregatingAnalytics(new CompositeAnalytics(sinks))
}
