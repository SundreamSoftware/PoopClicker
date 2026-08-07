/** Single source of truth for calendar-day and clock-safe daily systems. */
export interface Clock {
  now(): number
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now()
  }
}

export class FixedClock implements Clock {
  constructor(private timestamp: number) {}

  now(): number {
    return this.timestamp
  }

  set(timestamp: number): void {
    this.timestamp = timestamp
  }

  advance(ms: number): void {
    this.timestamp += ms
  }
}

export function toUtcDateKey(timestampMs: number): string {
  const d = new Date(timestampMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isNewUtcDay(previousKey: string | null | undefined, nowMs: number): boolean {
  if (!previousKey) return true
  return toUtcDateKey(nowMs) !== previousKey
}

export function daysBetweenUtc(previousKey: string, nowMs: number): number {
  const prev = Date.parse(`${previousKey}T00:00:00.000Z`)
  const next = Date.parse(`${toUtcDateKey(nowMs)}T00:00:00.000Z`)
  if (!Number.isFinite(prev) || !Number.isFinite(next)) return 0
  return Math.round((next - prev) / 86_400_000)
}

export function clampFutureTimestamp(
  timestampMs: number,
  nowMs: number,
  maxSkewMs = 5 * 60_000,
): number {
  if (!Number.isFinite(timestampMs)) return nowMs
  if (timestampMs > nowMs + maxSkewMs) return nowMs
  return timestampMs
}

export function safeElapsed(lastMs: number, nowMs: number, maxMs: number): number {
  const safeLast = clampFutureTimestamp(lastMs, nowMs)
  const elapsed = Math.max(0, nowMs - safeLast)
  return Math.min(elapsed, maxMs)
}

export class TimeService {
  constructor(private readonly clock: Clock = new SystemClock()) {}

  now(): number {
    return this.clock.now()
  }

  todayKey(): string {
    return toUtcDateKey(this.now())
  }

  isNewDay(previousKey: string | null | undefined): boolean {
    return isNewUtcDay(previousKey, this.now())
  }

  daysSince(previousKey: string): number {
    return daysBetweenUtc(previousKey, this.now())
  }
}
