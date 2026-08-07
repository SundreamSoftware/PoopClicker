export interface AnalyticsSink {
  track(event: string, payload?: Record<string, unknown>): void
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
