import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export async function tapHaptic(crit = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if ('vibrate' in navigator) navigator.vibrate(crit ? 20 : 8)
    return
  }
  try {
    await Haptics.impact({ style: crit ? ImpactStyle.Medium : ImpactStyle.Light })
  } catch {
    // no-op
  }
}
