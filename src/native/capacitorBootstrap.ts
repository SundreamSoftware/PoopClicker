import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

/** Initialize native shell integrations when running inside Capacitor. */
export async function bootstrapNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1a3a4a' })
  } catch {
    // StatusBar may be unavailable on some devices; ignore.
  }

  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
  })
}
