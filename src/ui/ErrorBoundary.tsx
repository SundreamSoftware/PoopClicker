import { Component, type ErrorInfo, type ReactNode } from 'react'
import { SAVE_BACKUP_KEY, SAVE_STORAGE_KEY } from '../core/save/saveSchema'
import { trackProduct } from '../services/analytics'

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the payload free of save data and user information.
    console.error('[ui] render failure', { name: error.name, componentStack: info.componentStack })
    trackProduct('app_error', { name: error.name, source: 'error_boundary' })
  }

  private restoreBackup = (): void => {
    const backup = localStorage.getItem(SAVE_BACKUP_KEY)
    if (!backup) {
      window.alert('No backup save was found.')
      return
    }
    if (!window.confirm('Restore the previous backup save and reload?')) return
    localStorage.setItem(SAVE_STORAGE_KEY, backup)
    window.location.reload()
  }

  private resetLocalSave = (): void => {
    if (
      !window.confirm(
        'Reset local save? This cannot be undone and will erase your current progress.',
      )
    ) {
      return
    }
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY)
      localStorage.removeItem(SAVE_BACKUP_KEY)
    } finally {
      window.location.reload()
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <main className="app-shell" role="alert">
        <div className="modal" style={{ margin: '15vh auto', maxWidth: 420 }}>
          <h1>THE TOILET HAD A PROBLEM</h1>
          <p>The game UI could not start. Restart first; reset only if the problem continues.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="primary-btn" onClick={() => window.location.reload()}>
              RESTART
            </button>
            <button className="ghost-btn" onClick={this.restoreBackup}>
              RESTORE BACKUP
            </button>
            <button className="ghost-btn" onClick={this.resetLocalSave}>
              RESET LOCAL SAVE
            </button>
          </div>
        </div>
      </main>
    )
  }
}
