import type { CSSProperties } from 'react'
import { formatDuration } from '../../core/numbers/formatNumber'
import { DAILY_DUMP, type DailyDumpRuntime } from '../../core/systems/dailyDump'

export interface DailyDumpModalProps {
  runtime: DailyDumpRuntime
  onStart: () => void
  onTap: () => void
  onClaim: () => void
  onClose: () => void
  onAbandon: () => void
  onToast?: (message: string) => void
  weeklyBestScore?: number
  now?: number
}

const primaryBtn: CSSProperties = {
  background: '#e07a3d',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 800,
  cursor: 'pointer',
}

const ghostBtn: CSSProperties = {
  background: 'transparent',
  color: '#1d2a32',
  border: '2px solid rgba(29,42,50,0.2)',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
}

function countdownValue(runtime: DailyDumpRuntime, now: number): number {
  const left = Math.max(0, runtime.countdownEndsAt - now)
  return Math.max(1, Math.ceil(left / 1000))
}

function tierLabel(tier: DailyDumpRuntime['rewardTier']): string {
  if (tier === 'none') return 'No tier'
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

export function DailyDumpModal({
  runtime,
  onStart,
  onTap,
  onClaim,
  onClose,
  onAbandon,
  onToast,
  weeklyBestScore = 0,
  now = Date.now(),
}: DailyDumpModalProps) {
  const timeLeft =
    runtime.phase === 'running' ? Math.max(0, runtime.endsAt - now) : DAILY_DUMP.durationMs

  const handleShare = async () => {
    const text = `My Daily Dump: ${runtime.score} (${tierLabel(runtime.rewardTier)}) in Poop Clicker!`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // User cancelled or error
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        if (onToast) onToast('Score copied to clipboard!')
      } catch {
        // Clipboard API failed
      }
    }
  }

  return (
    <div
      className="modal-backdrop modal-layer-dump"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Dump"
    >
      <div className="modal modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 24, fontWeight: 700 }}>
              Daily Dump
            </div>
            <div style={{ fontSize: 13, color: '#5d6d76' }}>60s local tap trial</div>
          </div>
          {runtime.phase === 'idle' && (
            <button type="button" style={ghostBtn} onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
          {(runtime.phase === 'countdown' || runtime.phase === 'running') && (
            <button
              type="button"
              style={ghostBtn}
              onClick={() => {
                if (
                  window.confirm(
                    'Abandon this Daily Dump run? You cannot retry until tomorrow. Your progress will be lost.',
                  )
                ) {
                  onAbandon()
                }
              }}
              aria-label="Abandon"
            >
              ✕
            </button>
          )}
        </div>

        {runtime.phase === 'idle' && (
          <div style={{ marginTop: 18 }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.4 }}>
              Tap as fast as you can for one minute. Combos boost your score. Tiers: Bronze{' '}
              {DAILY_DUMP.tiers.bronze}+ · Silver {DAILY_DUMP.tiers.silver}+ · Gold{' '}
              {DAILY_DUMP.tiers.gold}+ · Diamond {DAILY_DUMP.tiers.diamond}+.
            </p>
            {weeklyBestScore > 0 && (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#5d6d76' }}>
                This week&apos;s best: {weeklyBestScore}
              </p>
            )}
            <button type="button" style={{ ...primaryBtn, width: '100%' }} onClick={onStart}>
              START DAILY DUMP
            </button>
          </div>
        )}

        {runtime.phase === 'countdown' && (
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#5d6d76', marginBottom: 8 }}>Get ready</div>
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 96,
                lineHeight: 1,
                fontWeight: 700,
                color: '#e07a3d',
              }}
            >
              {countdownValue(runtime, now)}
            </div>
            <button
              type="button"
              style={{ ...ghostBtn, marginTop: 16 }}
              onClick={() => {
                if (
                  window.confirm(
                    'Abandon this Daily Dump run? You cannot retry until tomorrow. Your progress will be lost.',
                  )
                ) {
                  onAbandon()
                }
              }}
            >
              Abandon
            </button>
          </div>
        )}

        {runtime.phase === 'running' && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Stat label="Time" value={formatDuration(timeLeft)} />
              <Stat label="Score" value={String(runtime.score)} />
              <Stat label="CPS" value={runtime.rollingCps.toFixed(0)} />
            </div>
            <div style={{ fontSize: 13, color: '#5d6d76', marginBottom: 10 }}>
              Combo {Math.floor(runtime.combo)} · Peak {Math.floor(runtime.peakCombo)} · Taps{' '}
              {runtime.taps}
            </div>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                onTap()
              }}
              style={{
                width: '100%',
                minHeight: 180,
                borderRadius: 22,
                border: 'none',
                cursor: 'pointer',
                touchAction: 'manipulation',
                userSelect: 'none',
                background: 'radial-gradient(circle at 35% 30%, #c8894d, #8b5a2b 55%, #5a3516)',
                boxShadow: '0 12px 28px rgba(20,30,40,0.28)',
                color: '#fff8e6',
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 28,
                fontWeight: 700,
              }}
              aria-label="Tap for Daily Dump points"
            >
              TAP!
            </button>
            <button
              type="button"
              style={{ ...ghostBtn, width: '100%', marginTop: 8 }}
              onClick={() => {
                if (
                  window.confirm(
                    'Abandon this Daily Dump run? You cannot retry until tomorrow. Your progress will be lost.',
                  )
                ) {
                  onAbandon()
                }
              }}
            >
              Abandon
            </button>
          </div>
        )}

        {runtime.phase === 'finished' && (
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#5d6d76' }}>Run complete</div>
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: 36,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {tierLabel(runtime.rewardTier)}
            </div>
            <div style={{ marginTop: 8, fontSize: 15 }}>
              Score {runtime.score} · Peak combo {Math.floor(runtime.peakCombo)}
            </div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#5d6d76' }}>
              Reward +{runtime.gtpReward} GTP
            </div>
            <button
              type="button"
              style={{ ...primaryBtn, width: '100%', marginTop: 16 }}
              onClick={onClaim}
            >
              CLAIM & CLOSE
            </button>
            <button
              type="button"
              style={{ ...ghostBtn, width: '100%', marginTop: 8 }}
              onClick={handleShare}
            >
              Share Score
            </button>
            <button
              type="button"
              style={{ ...ghostBtn, width: '100%', marginTop: 8 }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.55)',
        borderRadius: 12,
        padding: '8px 10px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 11, color: '#5d6d76', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: 20, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  )
}

export default DailyDumpModal
