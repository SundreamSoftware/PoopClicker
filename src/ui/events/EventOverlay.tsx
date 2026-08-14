import type { CSSProperties } from 'react'
import type { ActiveEventRuntime } from '../../core/types/eventRuntime'
import { assetUrl, EVENT_ASSETS, goldenShowerFramePath } from '../../content/assetPaths'
import { EVENT_BY_ID } from '../../content/events'
import { formatDuration } from '../../core/numbers/formatNumber'

export interface EventOverlayProps {
  runtime: ActiveEventRuntime | null
  rollingCps: number
  reducedMotion?: boolean
  onCatchTarget: (id: string) => void
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
  pointerEvents: 'auto',
}

/** GPU-friendly catchables — no shadows / transitions (those stutter on phones). */
const targetStyle = (x: number, y: number, size: number): CSSProperties => ({
  position: 'absolute',
  left: `${x}%`,
  top: `${y}%`,
  width: size,
  height: size,
  transform: 'translate3d(-50%, -50%, 0)',
  border: 'none',
  cursor: 'pointer',
  pointerEvents: 'auto',
  padding: 0,
  margin: 0,
  background: 'transparent',
  WebkitTapHighlightColor: 'transparent',
  outline: 'none',
  zIndex: 21,
  willChange: 'transform',
  contain: 'layout style paint',
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
  const phaseLabel = runtime.type === 'mega_clog' ? ` · Phase ${runtime.phase}/3` : ''
  const artSrc = assetUrl(`P1_events/mega_clog/mega_clog_phase_${runtime.phase}.svg`)
  return (
    <div style={bannerStyle} className="event-banner-ui">
      <img
        src={artSrc}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          width: 74,
          height: 74,
          right: 8,
          top: 4,
          objectFit: 'contain',
        }}
      />
      <div style={{ fontWeight: 800, letterSpacing: 0.03 }}>
        {title}
        {phaseLabel}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, paddingRight: 72 }}>
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
            background: 'linear-gradient(90deg, #e74c3c, #f39c12, #f1c40f)',
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
  const status = rollingCps < bandMin ? 'TOO SLOW' : rollingCps > bandMax ? 'TOO FAST' : 'PERFECT'
  const color = status === 'PERFECT' ? '#2ecc71' : status === 'TOO SLOW' ? '#f1c40f' : '#e74c3c'
  const meter = Math.min(1, rollingCps / 10)
  return (
    <div
      style={{
        ...overlayRoot,
        background: 'rgba(10, 16, 24, 0.35)',
      }}
    >
      <div style={{ ...bannerStyle, pointerEvents: 'none', top: '18%' }} className="event-banner-ui">
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

export function EventOverlay({
  runtime,
  rollingCps,
  reducedMotion = false,
  onCatchTarget,
  now = Date.now(),
}: EventOverlayProps) {
  void reducedMotion
  if (!runtime || runtime.completed || runtime.failed || runtime.rewardClaimed) {
    return null
  }

  const def = EVENT_BY_ID[runtime.defId]
  const title = (def?.name ?? runtime.type).toUpperCase()

  if (runtime.type === 'plumber_inspection') {
    return <PlumberMeter rollingCps={rollingCps} runtime={runtime} now={now} />
  }

  if (runtime.type === 'mega_clog') {
    return (
      <div style={overlayRoot}>
        <BossBar runtime={runtime} title={title} now={now} />
      </div>
    )
  }

  if (runtime.type === 'golden_poop' || runtime.type === 'golden_rain') {
    const live = runtime.targets
    const isShower = runtime.type === 'golden_rain'
    return (
      <div style={overlayRoot} data-event={runtime.type}>
        <div style={bannerStyle}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
            Caught {runtime.caughtCount}
            {isShower ? `/${runtime.tapTarget}` : ''} · {formatDuration(remainingMs(runtime, now))}
          </div>
        </div>
        {live.map((target) => (
          <button
            key={target.id}
            type="button"
            aria-label="Catch golden poop"
            style={targetStyle(target.x, target.y, isShower ? 56 : 72)}
            onClick={(e) => {
              e.stopPropagation()
              onCatchTarget(target.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <img
              src={isShower ? goldenShowerFramePath(target.frame) : EVENT_ASSETS.golden_poop}
              alt=""
              draggable={false}
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                display: 'block',
              }}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={overlayRoot}>
      <div style={bannerStyle}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {formatDuration(remainingMs(runtime, now))}
        </div>
      </div>
    </div>
  )
}

export default EventOverlay
