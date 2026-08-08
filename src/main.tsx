import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
import { bootstrapNativeShell } from './native/capacitorBootstrap'
import { ads, consent } from './state/gameSingleton'

void bootstrapNativeShell()
void consent.init().then(() => ads.init())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
