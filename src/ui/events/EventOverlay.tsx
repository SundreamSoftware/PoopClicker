import type { CSSProperties } from 'react'
import type { ActiveEventRuntime } from '../../core/types/eventRuntime'
import { EVENT_BY_ID } from '../../content/events'
import { formatDuration } from '../../core/numbers/formatNumber'

export interface EventOverlayProps {
  runtime: ActiveEventRuntime | null
  rollingCps: number
  reducedMotion?: boolean
  onCatchTarget: (id: string) => void
  onMysteryPick: (option: 0 | 1 | 2) => void
  onDismiss?: () => void
  now?: number
}

const overlayRoot: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 20,
  pointerEvents: 'none',
  overflow: 'hidden',
}

const bannerStyle: CSSProperties = {
  position: 'absolute',
  left: 12,
  right: 12,
  top: 10,
  padding: '10px 12px',
  borderRadius: 14,
  background: 'rgba(20, 30, 40, 0.82)',
  color: '#fff',
  pointerEvents: 'none',
  boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
}

const targetBtn = (x: number, y: number, kind: 'golden' | 'tp_roll'): CSSProperties => ({
  position: 'absolute',
  left: `${x}%`,
  top: `${y}%`,
  transform: 'translate(-50%, -50%)',
  width: kind === 'golden' ? 56 : 48,
  height: kind === 'golden' ? 56 : 48,
  borderRadius: kind === 'golden' ? '45% 50% 48% 52%' : 10,
  border: 'none',
  cursor: 'pointer',
  pointerEvents: 'auto',
  background:
    kind === 'golden'
      ? 'radial-gradient(circle at 30% 30%, #fff3a0, #f1c40f 45%, #b7950b)'
      : 'linear-gradient(180deg, #f7f7f7, #d0d0d0)',
  boxShadow:
    kind === 'golden'
      ? '0 0 16px rgba(241, 196, 15, 0.75)'
      : '0 4px 10px rgba(0,0,0,0.25)',
  fontSize: kind === 'golden' ? 22 : 18,
  lineHeight: 1,
  zIndex: 21,
})

function remainingMs(runtime: ActiveEventRuntime, now: number): number {
  return Math.max(0, runtime.endsAt - now)
}

function BossBar({
  runtime,
  title,
  now,
}: {
  runtime: ActiveEventRuntime
  title: string
  now: number
}) {
  const progress = runtime.tapTarget > 0 ? Math.min(1, runtime.taps / runtime.tapTarget) : 0
  const phaseLabel =
    runtime.type === 'mega_clog' ? ` · Phase ${runtime.phase}/3` : ''
  return (
    <div style={{ ...bannerStyle, pointerEvents: 'none' }}>
      <div style={{ fontWeight: 800, letterSpacing: 0.03 }}>{title}{phaseLabel}</div>
      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
        {runtime.taps}/{runtime.tapTarget} · {formatDuration(remainingMs(runtime, now))}
      </div>
      <div
        style={{
          marginTop: 8,
          height: 10,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            background:
              runtime.type === 'mega_clog'
                ? 'linear-gradient(90deg, #e74c3c, #f39c12, #f1c40f)'
                : 'linear-gradient(90deg, #3498db, #2ecc71)',
            transition: 'width 80ms linear',
          }}
        />
      </div>
    </div>
  )
}

function PlumberMeter({
  rollingCps,
  runtime,
  now,
}: {
  rollingCps: number
  runtime: ActiveEventRuntime
  now: number
}) {
  const bandMin = 4
  const bandMax = 6
  const status =
    rollingCps < bandMin ? 'TOO SLOW' : rollingCps > bandMax ? 'TOO FAST' : 'PERFECT'
  const color =
    status === 'PERFECT' ? '#2ecc71' : status === 'TOO SLOW' ? '#f1c40f' : '#e74c3c'
  const meter = Math.min(1, rollingCps / 10)
  return (
    <div
      style={{
        ...overlayRoot,
        pointerEvents: 'auto',
        background: 'rgba(10, 16, 24, 0.35)',
      }}
    >
      <div style={{ ...bannerStyle, pointerEvents: 'none', top: '18%' }}>
        <div style={{ fontWeight: 800 }}>PLUMBER INSPECTION</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Hold CPS between {bandMin}–{bandMax} · {formatDuration(remainingMs(runtime, now))}
        </div>
        <div
          style={{
            marginTop: 12,
            height: 16,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${(bandMin / 10) * 100}%`,
              width: `${((bandMax - bandMin) / 10) * 100}%`,
              top: 0,
              bottom: 0,
              background: 'rgba(46, 204, 113, 0.28)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${meter * 100}% - 6px)`,
              top: 1,
              width: 12,
              height: 14,
              borderRadius: 4,
              background: color,
            }}
          />
        </div>
        <div
          style={{
            marginTop: 10,
            fontWeight: 800,
            fontSize: 22,
            color,
            textAlign: 'center',
          }}
        >
          {status}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.8 }}>
          CPS {rollingCps.toFixed(1)} · Band {Math.round(runtime.bandScore * 100)}%
        </div>
      </div>
    </div>
  )
}

function MysteryCards({
  runtime,
  onMysteryPick,
  now,
}: {
  runtime: ActiveEventRuntime
  onMysteryPick: (option: 0 | 1 | 2) => void
  now: number
}) {
  const labels = ['???', '???', '???']
  const revealed = ['PP Bundle', 'GTP Cache', 'Boost']
  return (
    <div
      style={{
        ...overlayRoot,
        pointerEvents: 'auto',
        background: 'rgba(12, 18, 28, 0.55)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div style={{ width: 'min(360px, 92%)', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>MYSTERY FLUSH</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 14 }}>
          Pick a door · {formatDuration(remainingMs(runtime, now))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {([0, 1, 2] as const).map((option) => {
            const picked = runtime.mysteryOption === option
            const show = runtime.mysteryRevealed && picked
            return (
              <button
                key={option}
                type="button"
                disabled={runtime.mysteryRevealed || runtime.rewardClaimed}
                onClick={() => onMysteryPick(option)}
                style={{
                  pointerEvents: 'auto',
                  minHeight: 110,
                  borderRadius: 14,
                  border: picked ? '2px solid #f4c95f' : '2px solid rgba(255,255,255,0.2)',
                  background: show
                    ? 'linear-gradient(180deg, #3d6b5c, #1a3a4a)'
                    : 'linear-gradient(180deg, #3a2f55, #1d2440)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: runtime.mysteryRevealed ? 'default' : 'pointer',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{show ? '✓' : '?'}</div>
                <div style={{ fontSize: 13 }}>{show ? revealed[option] : labels[option]}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function EventOverlay({
  runtime,
  rollingCps,
  reducedMotion = false,
  onCatchTarget,
  onMysteryPick,
  onDismiss,
  now = Date.now(),
}: EventOverlayProps) {
  if (!runtime || runtime.completed || runtime.failed || runtime.rewardClaimed) {
    return null
  }

  const def = EVENT_BY_ID[runtime.defId]
  const title = (def?.name ?? runtime.type).toUpperCase()

  if (runtime.type === 'plumber_inspection') {
    return <PlumberMeter rollingCps={rollingCps} runtime={runtime} now={now} />
  }

  if (runtime.type === 'mystery_flush') {
    return <MysteryCards runtime={runtime} onMysteryPick={onMysteryPick} now={now} />
  }

  if (runtime.type === 'burrito_rush' || runtime.type === 'toilet_quake') {
    return (
      <div style={overlayRoot} data-reduced={reducedMotion ? '1' : '0'}>
        <div
          style={{
            ...bannerStyle,
            background:
              runtime.type === 'burrito_rush'
                ? 'linear-gradient(90deg, rgba(192,57,43,0.9), rgba(230,126,34,0.9))'
                : 'linear-gradient(90deg, rgba(41,128,185,0.9), rgba(52,73,94,0.9))',
            animation: reducedMotion ? undefined : 'none',
          }}
        >
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
            {def?.description} · {formatDuration(remainingMs(runtime, now))}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              style={{
                marginTop: 8,
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 12,
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    )
  }

  if (runtime.type === 'clogged_toilet' || runtime.type === 'mega_clog') {
    return (
      <div style={overlayRoot}>
        <BossBar runtime={runtime} title={title} now={now} />
      </div>
    )
  }

  // Floating / falling catch targets
  if (
    runtime.type === 'golden_poop' ||
    runtime.type === 'golden_rain' ||
    runtime.type === 'toilet_paper_storm'
  ) {
    const live = runtime.targets.filter((t) => !t.caught && t.expiresAt > now)
    return (
      <div style={overlayRoot} data-event={runtime.type}>
        <div style={bannerStyle}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
            Caught {runtime.caughtCount}
            {runtime.tapTarget > 0 ? `/${runtime.tapTarget}` : ''} ·{' '}
            {formatDuration(remainingMs(runtime, now))}
          </div>
        </div>
        {live.map((target) => (
          <button
            key={target.id}
            type="button"
            aria-label={target.kind === 'golden' ? 'Catch golden poop' : 'Catch toilet paper'}
            style={{
              ...targetBtn(target.x, target.y, target.kind),
              transition: reducedMotion ? undefined : 'transform 80ms ease',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onCatchTarget(target.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {target.kind === 'golden' ? '★' : '🧻'}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={overlayRoot}>
      <div style={bannerStyle}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{formatDuration(remainingMs(runtime, now))}</div>
      </div>
    </div>
  )
}

export default EventOverlay
