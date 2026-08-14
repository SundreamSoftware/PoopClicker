import { useEffect, useRef, type CSSProperties } from 'react'
import './frameSequence.css'

export interface FrameSequencePlayerProps {
  /** Absolute or asset URLs in playback order (frame 1 … N). */
  frames: readonly string[]
  fps?: number
  /** Overrides fps-based length when set. */
  durationMs?: number
  loop?: boolean
  reducedMotion?: boolean
  /** Entrance motion — keep subtle so art stays readable. */
  motion?: 'none' | 'soft'
  className?: string
  alt?: string
  onComplete?: () => void
}

/** Smoothstep — soft accelerate/decelerate without overshoot. */
function easeInOutSmooth(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * Plays discrete PNG/WebP frames with continuous crossfades (rAF-driven).
 * Opacity is written directly to the DOM to stay smooth on mobile WebViews.
 */
export function FrameSequencePlayer({
  frames,
  fps = 10,
  durationMs: durationOverride,
  loop = false,
  reducedMotion = false,
  motion = 'soft',
  className = '',
  alt = '',
  onComplete,
}: FrameSequencePlayerProps) {
  const count = frames.length
  const durationMs = durationOverride ?? frameSequenceDurationMs(count, fps)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const framesKey = frames.join('|')
  const layerRefs = useRef<Array<HTMLImageElement | null>>([])
  const useMotion = !reducedMotion && motion === 'soft'

  useEffect(() => {
    for (const src of frames) {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
    }
  }, [framesKey, frames])

  useEffect(() => {
    if (count <= 0) return

    const applyPos = (pos: number) => {
      const maxIndex = count - 1
      const clamped = Math.min(maxIndex, Math.max(0, pos))
      const indexA = Math.floor(clamped)
      const indexB = Math.min(maxIndex, indexA + 1)
      const mix = indexA === indexB ? 0 : easeInOutSmooth(clamped - indexA)
      for (let i = 0; i < count; i += 1) {
        const el = layerRefs.current[i]
        if (!el) continue
        let opacity = 0
        if (indexA === indexB) opacity = i === indexA ? 1 : 0
        else if (i === indexA) opacity = 1 - mix
        else if (i === indexB) opacity = mix
        el.style.opacity = String(opacity)
      }
    }

    if (reducedMotion) {
      applyPos(count - 1)
      onCompleteRef.current?.()
      return
    }

    if (count === 1) {
      applyPos(0)
      onCompleteRef.current?.()
      return
    }

    let raf = 0
    let start = performance.now()
    let finished = false
    applyPos(0)

    const tick = (now: number) => {
      const raw = (now - start) / Math.max(1, durationMs)
      if (raw >= 1) {
        if (loop) {
          start = now
          applyPos(0)
          raf = requestAnimationFrame(tick)
          return
        }
        applyPos(count - 1)
        if (!finished) {
          finished = true
          onCompleteRef.current?.()
        }
        return
      }
      // Mostly linear pacing so each art frame gets similar time; slight ease.
      const paced = raw * 0.78 + easeInOutSmooth(raw) * 0.22
      applyPos(paced * (count - 1))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [count, durationMs, loop, reducedMotion, framesKey])

  if (count <= 0) return null

  return (
    <div
      className={['frame-sequence-stage', useMotion ? 'frame-sequence-stage--soft' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--fs-duration': `${durationMs}ms` } as CSSProperties}
    >
      {frames.map((src, i) => (
        <img
          key={src}
          ref={(el) => {
            layerRefs.current[i] = el
          }}
          className="frame-sequence-layer"
          src={src}
          alt={i === 0 ? alt : ''}
          draggable={false}
          aria-hidden={alt === '' || i !== 0}
          decoding="async"
          style={{ opacity: i === 0 ? 1 : 0 }}
        />
      ))}
    </div>
  )
}

export function frameSequenceDurationMs(frameCount: number, fps: number): number {
  if (frameCount <= 0) return 0
  return Math.round((frameCount / Math.max(0.1, fps)) * 1000)
}
