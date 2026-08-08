import { Capacitor } from '@capacitor/core'
import { ECONOMY } from '../core/economy/formulas'
import type { PlayerSaveV2 } from '../core/save/saveSchema'

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

const KIND_TO_ID: Record<NotificationKind, number> = {
  bathroom_break_ready: 1001,
  daily_expiring: 1002,
  offline_reward: 1003,
  daily_streak: 1004,
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

type LocalNotificationsLike = {
  schedule: (opts: {
    notifications: Array<{
      id: number
      title: string
      body: string
      schedule: { at: Date }
    }>
  }) => Promise<unknown>
  cancel: (opts: { notifications: Array<{ id: number }> }) => Promise<unknown>
  requestPermissions?: () => Promise<{ display?: string }>
}

export class CapacitorLocalNotificationScheduler implements NotificationScheduler {
  private plugin: LocalNotificationsLike | null = null
  private readonly memory = new MemoryNotificationScheduler()
  private usingMemory = false
  private loadAttempted = false

  private async ensure(): Promise<boolean> {
    if (this.usingMemory) return false
    if (this.plugin) return true
    if (this.loadAttempted) return false
    this.loadAttempted = true
    try {
      const mod = await import('@capacitor/local-notifications')
      this.plugin = mod.LocalNotifications as unknown as LocalNotificationsLike
      const plugin = this.plugin
      try {
        await plugin.requestPermissions?.()
      } catch {
        // Permission denial is fine; schedule may still be a no-op on some OS versions.
      }
      return true
    } catch (err) {
      console.warn(
        '[notifications] @capacitor/local-notifications unavailable; memory scheduler',
        err,
      )
      this.usingMemory = true
      return false
    }
  }

  schedule(kind: NotificationKind, fireAtMs: number, body: string): void {
    this.memory.schedule(kind, fireAtMs, body)
    void this.ensure().then((ok) => {
      if (!ok || !this.plugin) return
      const at = new Date(fireAtMs)
      if (at.getTime() <= Date.now()) return
      void this.plugin
        .schedule({
          notifications: [
            {
              id: KIND_TO_ID[kind],
              title: 'Poop Clicker',
              body,
              schedule: { at },
            },
          ],
        })
        .catch(() => undefined)
    })
  }

  cancel(kind: NotificationKind): void {
    this.memory.cancel(kind)
    void this.ensure().then((ok) => {
      if (!ok || !this.plugin) return
      void this.plugin.cancel({ notifications: [{ id: KIND_TO_ID[kind] }] }).catch(() => undefined)
    })
  }
}

export function scheduleBathroomBreak(
  scheduler: NotificationScheduler,
  fireAtMs: number,
  body = 'Your Bathroom Break is ready. Tap in for a quick dump of rewards.',
): void {
  scheduler.schedule('bathroom_break_ready', fireAtMs, body)
}

export function scheduleStreakReminder(
  scheduler: NotificationScheduler,
  fireAtMs: number,
  body = 'Streak on the line — claim your daily before it flushes away.',
): void {
  scheduler.schedule('daily_streak', fireAtMs, body)
}

/**
 * Soft prompt gate: wait until the player has some sessions and bathroom claims
 * so we never ask in the first seconds of play.
 */
export function shouldPromptForNotifications(save: {
  sessionsCount: number
  bathroomBreakClaimsTotal: number
  tutorialFlags: Record<string, boolean>
}): boolean {
  if (save.tutorialFlags.notificationPromptShown) return false
  return save.sessionsCount >= 3 && save.bathroomBreakClaimsTotal >= 1
}

export async function requestNotificationPermission(): Promise<boolean> {
  const isTest =
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.MODE === 'test' || import.meta.env?.VITEST === 'true')
  if (isTest || !Capacitor.isNativePlatform()) return false

  try {
    const mod = await import('@capacitor/local-notifications')
    const plugin = mod.LocalNotifications as LocalNotificationsLike
    const result = await plugin.requestPermissions?.()
    return result?.display === 'granted'
  } catch {
    return false
  }
}

export function scheduleNotificationReminders(
  scheduler: NotificationScheduler,
  save: PlayerSaveV2,
  now: number,
): void {
  if (save.bathroomBreakCharges < ECONOMY.bathroomBreakMaxCharges) {
    const fireAt = save.lastBathroomBreakGeneration + ECONOMY.bathroomBreakIntervalMs
    if (fireAt > now) scheduleBathroomBreak(scheduler, fireAt)
  }

  const utc = new Date(now)
  const nextMidnightUtc = Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate() + 1)
  if (nextMidnightUtc > now) {
    scheduleStreakReminder(scheduler, nextMidnightUtc)
  }
}

export function createNotificationScheduler(): NotificationScheduler {
  const isTest =
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.MODE === 'test' || import.meta.env?.VITEST === 'true')
  try {
    if (isTest || !Capacitor.isNativePlatform()) {
      return new MemoryNotificationScheduler()
    }
  } catch {
    return new MemoryNotificationScheduler()
  }
  return new CapacitorLocalNotificationScheduler()
}

export const NOTIFICATION_RECOMMENDATION =
  'Wire platform notifications for Bathroom Break, daily expiry, offline reward, and streak — after onboarding, never on first launch seconds.'
