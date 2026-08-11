import { useState } from 'react'
import { maybePromptNotifications } from '../notificationPrompt'
import { cancelNotificationReminders, scheduleNotificationReminders } from '../../services/notifications'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

export function SettingsPanel() {
  const { engine, consent, notifications } = useGameContext()
  const snap = useGameSnapshot()
  const [privacyStatus, setPrivacyStatus] = useState<string | null>(null)

  return (
    <div className="panel settings-sheet">
      <h2>Settings</h2>
      <div className="meta-line" style={{ marginBottom: 16 }}>
        Audio, haptics, motion, and notification preferences
      </div>
      
      {(
        [
          ['sfx', 'Sound effects'],
          ['music', 'Music'],
          ['haptics', 'Haptics'],
          ['reducedMotion', 'Reduced motion'],
          ['notifications', 'Notifications'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="list-row" style={{ cursor: 'pointer' }}>
          <span>{label}</span>
          <input
            type="checkbox"
            checked={snap.save.settings[key]}
            onChange={async (e) => {
              engine.updateSettings({ [key]: e.target.checked })
              if (key === 'notifications') {
                if (e.target.checked) {
                  scheduleNotificationReminders(notifications, snap.save, Date.now())
                  await maybePromptNotifications()
                } else {
                  cancelNotificationReminders(notifications)
                }
              }
            }}
          />
        </label>
      ))}
      
      <div className="list-row">
        <div>
          <span>Privacy choices</span>
          {privacyStatus && <div className="meta-line">{privacyStatus}</div>}
        </div>
        <button
          className="ghost-btn"
          onClick={async () => {
            const outcome = await consent.showPrivacyOptions()
            setPrivacyStatus(
              outcome === 'unavailable'
                ? 'Privacy form is not required or unavailable.'
                : 'Privacy choices updated.',
            )
          }}
        >
          Manage
        </button>
      </div>
    </div>
  )
}
