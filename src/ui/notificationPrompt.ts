import { engine, notifications } from '../state/gameSingleton'
import {
  requestNotificationPermission,
  scheduleNotificationReminders,
  shouldPromptForNotifications,
} from '../services/notifications'

/** Prompt for notification permission once after a positive retention moment. */
export async function maybePromptNotifications(): Promise<void> {
  const save = engine.getSnapshot().save
  if (!shouldPromptForNotifications(save)) return

  engine.markNotificationPromptShown()
  const granted = await requestNotificationPermission()
  if (granted) {
    scheduleNotificationReminders(notifications, engine.getSnapshot().save, Date.now())
  }
}
