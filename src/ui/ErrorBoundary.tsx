import { Component, type ErrorInfo, type ReactNode } from 'react'

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
  }

  private resetLocalSave = (): void => {
    try {
      localStorage.removeItem('poop_clicker_save_v2')
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
            <button className="ghost-btn" onClick={this.resetLocalSave}>
              RESET LOCAL SAVE
            </button>
          </div>
        </div>
      </main>
    )
  }
}
