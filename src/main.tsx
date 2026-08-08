import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
import { bootstrapNativeShell } from './native/capacitorBootstrap'
import { ads, consent } from './state/gameSingleton'

void bootstrapNativeShell().catch((error: unknown) => {
  console.warn('[native] shell bootstrap failed; continuing with web defaults', error)
})
void consent
  .init()
  .catch((error: unknown) => {
    console.warn('[consent] initialization failed; continuing without blocking gameplay', error)
    return 'error' as const
  })
  .then(() => ads.init())
  .catch((error: unknown) => {
    console.warn('[ads] initialization failed; ads remain unavailable', error)
  })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
