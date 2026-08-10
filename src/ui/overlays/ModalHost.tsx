import { type ReactNode, useEffect, useId, useRef } from 'react'

export interface ModalHostProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Extra classes for backdrop, e.g. modal-layer-settings */
  layerClass?: string
  closeOnBackdrop?: boolean
  /** When false, Escape / backdrop do not close (e.g. offline claim soft-block). */
  dismissible?: boolean
  ariaLabel?: string
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  return Array.from(nodes).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
}

/**
 * Shared dialog shell: Escape, optional backdrop dismiss, focus trap + restore.
 */
export function ModalHost({
  open,
  onClose,
  title,
  children,
  layerClass = '',
  closeOnBackdrop = true,
  dismissible = true,
  ariaLabel,
}: ModalHostProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    if (panel) {
      const focusable = getFocusable(panel)
      ;(focusable[0] ?? panel).focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = getFocusable(panelRef.current)
      if (focusable.length === 0) {
        e.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      restoreFocusRef.current?.focus?.()
    }
  }, [open, onClose, dismissible])

  if (!open) return null

  return (
    <div
      className={`modal-backdrop ${layerClass}`.trim()}
      role="presentation"
      onClick={() => {
        if (closeOnBackdrop && dismissible) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
            <h2 id={titleId} style={{ margin: 0 }}>
              {title}
            </h2>
            {dismissible && (
              <button type="button" className="ghost-btn" onClick={onClose} aria-label="Close">
                ✕
              </button>
            )}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
