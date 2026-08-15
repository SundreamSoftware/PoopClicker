import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
import { loadLiveConfig } from './config/liveConfig'
import { bootstrapNativeShell } from './native/capacitorBootstrap'
import { setAnalyticsCollectionEnabled, trackProduct } from './services/analytics'
import { installCrashReporting } from './services/crashReporting'
import { ads, billing, consent, engine } from './state/gameSingleton'

installCrashReporting()
void loadLiveConfig().catch(() => undefined)
void bootstrapNativeShell().catch((error: unknown) => {
  console.warn('[native] shell bootstrap failed; continuing with web defaults', error)
})
void billing
  .init()
  .then(async () => {
    const restored = await billing.syncEntitlements()
    for (const result of restored) {
      if (result.ok && result.productId) {
        engine.applyIapGrant(result.productId, 'restore')
      }
    }
  })
  .catch((error: unknown) => {
    console.warn('[billing] initialization failed; store remains unavailable', error)
  })
void consent
  .init()
  .catch((error: unknown) => {
    console.warn('[consent] initialization failed; ads stay off', error)
    return 'error' as const
  })
  .then((outcome) => {
    trackProduct('consent_outcome', { outcome })
    if (outcome !== 'not_required') {
      console.warn(`[consent] ads not started (${outcome})`)
      return
    }
    setAnalyticsCollectionEnabled(true)
    return ads.init()
  })
  .catch((error: unknown) => {
    console.warn('[ads] initialization failed; ads remain unavailable', error)
  })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
