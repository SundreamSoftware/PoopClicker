import { useEffect, useEffectEvent } from 'react'
import { scheduleNotificationReminders } from '../services/notifications'
import { syncEntitlementsToEngine } from '../services/purchaseSync'
import { billing } from './gameSingleton'
import { useGameContext } from './useGameContext'

export function useGameLoop() {
  const { engine, notifications } = useGameContext()
  const onVisible = useEffectEvent(() => {
    engine.foreground()
    void syncEntitlementsToEngine(engine, billing)
  })
  const onHidden = useEffectEvent(() => {
    engine.background()
    const save = engine.getSnapshot().save
    if (save.settings.notifications) {
      scheduleNotificationReminders(notifications, save, Date.now())
    }
  })

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = now - last
      last = now
      engine.tick(dt)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') onVisible()
      else onHidden()
    }
    const persistHidden = () => onHidden()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', persistHidden)
    document.addEventListener('freeze', persistHidden)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', persistHidden)
      document.removeEventListener('freeze', persistHidden)
      engine.persistImmediate()
    }
  }, [engine])
}
