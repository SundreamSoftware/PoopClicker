import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
import { bootstrapNativeShell } from './native/capacitorBootstrap'

void bootstrapNativeShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
