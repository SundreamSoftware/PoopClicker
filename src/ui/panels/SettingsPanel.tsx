import { useRef, useState } from 'react'
import { maybePromptNotifications } from '../notificationPrompt'
import {
  cancelNotificationReminders,
  scheduleNotificationReminders,
} from '../../services/notifications'
import { serializeSave } from '../../core/save/migrateSave'
import { billing } from '../../state/gameSingleton'
import { restorePurchasesToEngine } from '../../services/purchaseSync'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

export function SettingsPanel() {
  const { engine, consent, notifications } = useGameContext()
  const snap = useGameSnapshot()
  const [privacyStatus, setPrivacyStatus] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

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

      <div className="list-row">
        <div>
          <span>Purchases</span>
          {restoreStatus && <div className="meta-line">{restoreStatus}</div>}
        </div>
        <button
          className="ghost-btn"
          disabled={restoreBusy || !billing.isAvailable()}
          onClick={async () => {
            setRestoreBusy(true)
            try {
              const { restored, unavailable } = await restorePurchasesToEngine(engine, billing)
              if (unavailable) setRestoreStatus('Store unavailable.')
              else if (restored > 0) setRestoreStatus(`Restored ${restored} purchase(s).`)
              else setRestoreStatus('No purchases to restore.')
            } finally {
              setRestoreBusy(false)
            }
          }}
        >
          {restoreBusy ? 'Restoring…' : 'Restore'}
        </button>
      </div>

      <div className="goal-card" style={{ marginTop: 16 }}>
        <div className="goal-title">SAVE</div>
        <div className="goal-sub">Export a backup or restore from a file.</div>
        {saveStatus && <div className="meta-line">{saveStatus}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button
            className="ghost-btn"
            onClick={async () => {
              const json = serializeSave(engine.exportSave())
              try {
                if (navigator.clipboard) await navigator.clipboard.writeText(json)
                const blob = new Blob([json], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'poop-clicker-save.json'
                link.click()
                URL.revokeObjectURL(url)
                setSaveStatus('Save exported.')
              } catch {
                setSaveStatus('Could not export save.')
              }
            }}
          >
            Export save
          </button>
          <button className="ghost-btn" onClick={() => importRef.current?.click()}>
            Import save
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              if (file.size > 512_000) {
                setSaveStatus('Import failed — file is too large.')
                return
              }
              if (!window.confirm('Replace the current save with this file?')) return
              try {
                const text = await file.text()
                const parsed = JSON.parse(text) as unknown
                const imported = engine.importSave(parsed)
                setSaveStatus(
                  imported.ok ? 'Save imported.' : 'Import failed — file was not a valid save.',
                )
              } catch {
                setSaveStatus('Import failed — file was not a valid save.')
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
