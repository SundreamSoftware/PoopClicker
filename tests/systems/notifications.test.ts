import { describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import {
  MemoryNotificationScheduler,
  cancelNotificationReminders,
  scheduleNotificationReminders,
} from '../../src/services/notifications'

describe('notification preferences', () => {
  it('does not schedule reminders when notifications are disabled', () => {
    const now = Date.UTC(2026, 7, 8)
    const scheduler = new MemoryNotificationScheduler()
    const save = createDefaultSave(now)
    save.settings.notifications = false

    scheduleNotificationReminders(scheduler, save, now)

    expect(scheduler.scheduled).toHaveLength(0)
  })

  it('cancels every retention reminder', () => {
    const scheduler = new MemoryNotificationScheduler()
    const now = Date.now()
    scheduler.schedule('bathroom_break_ready', now + 1_000, 'Bathroom')
    scheduler.schedule('daily_streak', now + 2_000, 'Streak')

    cancelNotificationReminders(scheduler)

    expect(scheduler.scheduled).toHaveLength(0)
  })
})
