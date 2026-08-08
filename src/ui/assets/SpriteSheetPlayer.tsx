import type { CSSProperties } from 'react'
import { assetUrl } from '../../content/assetPaths'
import './assets.css'

interface SpriteSheetPlayerProps {
  name: 'tap_burst' | 'crit_burst' | 'floating_pp' | 'flush_vortex' | 'toilet_paper'
  frames?: number
  fps?: number
  loop?: boolean
  className?: string
  reducedMotion?: boolean
}

export function SpriteSheetPlayer({
  name,
  frames = 8,
  fps = 24,
  loop = false,
  className = '',
  reducedMotion = false,
}: SpriteSheetPlayerProps) {
  const durationMs = Math.round((frames / fps) * 1000)
  return (
    <span
      className={`sprite-sheet-player ${loop ? 'loop' : ''} ${reducedMotion ? 'reduced' : ''} ${className}`}
      style={
        {
          '--sprite-url': `url("${assetUrl(`P3_spritesheets/${name}_sheet.webp`)}")`,
          '--sprite-frames': frames,
          '--sprite-duration': `${durationMs}ms`,
        } as CSSProperties
      }
      aria-hidden
    />
  )
}
