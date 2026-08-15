import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { syncEntitlementsToEngine } from '../services/purchaseSync'
import { billing, engine } from '../state/gameSingleton'

/** Initialize native shell integrations when running inside Capacitor. */
export async function bootstrapNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1a3a4a' })
  } catch {
    // StatusBar may be unavailable on some devices; ignore.
  }

  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      engine.foreground()
      void syncEntitlementsToEngine(engine, billing)
      return
    }
    engine.background()
    engine.persistImmediate()
  })
}
