/**
 * Notification hooks. Full OS permission UX is intentionally deferred:
 * do not prompt in the first seconds of play.
 */
export type NotificationKind =
  'bathroom_break_ready' | 'daily_expiring' | 'offline_reward' | 'daily_streak'

export interface NotificationScheduler {
  schedule(kind: NotificationKind, fireAtMs: number, body: string): void
  cancel(kind: NotificationKind): void
}

export class MemoryNotificationScheduler implements NotificationScheduler {
  readonly scheduled: Array<{ kind: NotificationKind; fireAtMs: number; body: string }> = []

  schedule(kind: NotificationKind, fireAtMs: number, body: string): void {
    this.cancel(kind)
    this.scheduled.push({ kind, fireAtMs, body })
  }

  cancel(kind: NotificationKind): void {
    const next = this.scheduled.filter((n) => n.kind !== kind)
    this.scheduled.length = 0
    this.scheduled.push(...next)
  }
}

export const NOTIFICATION_RECOMMENDATION =
  'Wire platform notifications for Bathroom Break, daily expiry, offline reward, and streak — after onboarding, never on first launch seconds.'
