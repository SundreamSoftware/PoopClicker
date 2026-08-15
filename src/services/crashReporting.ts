import { trackProduct } from './analytics'

let installed = false

/** Window-level crash breadcrumbs without save data or user text. */
export function installCrashReporting(target: Window = window): void {
  if (installed) return
  installed = true
  target.addEventListener('error', (event) => {
    const name = event.error instanceof Error ? event.error.name : 'Error'
    trackProduct('app_error', { name, source: 'window_error' })
  })
  target.addEventListener('unhandledrejection', () => {
    trackProduct('app_error', { name: 'UnhandledRejection', source: 'unhandled_rejection' })
  })
}

export function resetCrashReportingForTests(): void {
  installed = false
}
