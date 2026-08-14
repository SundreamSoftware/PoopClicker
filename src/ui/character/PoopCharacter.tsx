import { type CSSProperties, type PointerEventHandler, useEffect, useState } from 'react'
import {
  isMaskedFaceSkin,
  resolveSharedExpressionPathForPlay,
  resolveSkinBodyPath,
  resolveSkinExpressionPath,
} from '../../content/assetPaths'
import { ASSET_MANIFEST } from '../../content/assetManifest'
import { SKIN_BY_ID } from '../../content/skins'
import { getSkinVisual, type SkinAccessory, type Headwear } from '../../content/skinsVisual'
import type { TapSpeedState } from '../../core/types/gameTypes'
import './PoopCharacter.css'

export type CharacterFace =
  'normal' | 'happy' | 'effort' | 'panic' | 'frenzy' | 'overdrive' | 'dizzy' | 'event'

export type CharacterTapState = TapSpeedState

export interface PoopCharacterProps {
  skinId: string
  tapState: CharacterTapState
  face: CharacterFace
  /** Rolling taps/sec — drives P4 expression ladder. */
  rollingCps?: number
  squish: boolean
  reducedMotion: boolean
  /** Prestige suck-down animation (no toilet overlay; bowl is in the world art). */
  flushing?: boolean
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
}

/** Resolve a default face expression from tap speed state. */
export function resolveFaceFromTapState(
  tapState: CharacterTapState,
  opts?: { eventActive?: boolean; dizzy?: boolean },
): CharacterFace {
  if (opts?.dizzy) return 'dizzy'
  // Idle always wins — events must not keep a "happy"/excited face after tapping stops.
  if (tapState === 'idle') return 'normal'
  if (opts?.eventActive) return 'event'
  switch (tapState) {
    case 'overdrive':
      return 'overdrive'
    case 'frenzy':
      return 'frenzy'
    case 'fast':
      return 'effort'
    case 'active':
      return 'happy'
    case 'slow':
      return 'normal'
    default:
      return 'normal'
  }
}

function shade(hex: string, amount: number): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return hex
  const num = parseInt(raw, 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount))
  const b = Math.min(255, Math.max(0, (num & 255) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function mouthPath(face: CharacterFace): string {
  switch (face) {
    case 'happy':
    case 'frenzy':
      return 'M76 118 Q100 138 124 118'
    case 'effort':
    case 'overdrive':
      return 'M78 122 Q100 132 122 122'
    case 'panic':
    case 'dizzy':
      return 'M78 124 Q100 110 122 124'
    case 'event':
      return 'M80 120 Q100 134 120 120'
    case 'normal':
    default:
      return 'M80 118 Q100 130 120 118'
  }
}

function eyeOffsets(face: CharacterFace): { open: number; brow: number } {
  switch (face) {
    case 'frenzy':
    case 'overdrive':
      return { open: 1.25, brow: -4 }
    case 'effort':
      return { open: 0.85, brow: -2 }
    case 'panic':
      return { open: 1.35, brow: 2 }
    case 'dizzy':
      return { open: 0.7, brow: 0 }
    case 'happy':
      return { open: 0.9, brow: -1 }
    default:
      return { open: 1, brow: 0 }
  }
}

function HeadwearLayer({ headwear, accent }: { headwear: Headwear; accent: string }) {
  switch (headwear) {
    case 'cowboy_hat':
      return (
        <g className="layer-headwear">
          <ellipse cx="100" cy="48" rx="62" ry="10" fill="#5c3310" />
          <path d="M68 48 Q100 10 132 48" fill="#8b5a2b" stroke="#3e220a" />
          <rect x="86" y="40" width="28" height="8" rx="2" fill="#c9a227" />
        </g>
      )
    case 'pirate_hat':
      return (
        <g className="layer-headwear">
          <path d="M55 55 Q100 5 145 55 Q100 40 55 55Z" fill="#1a1a1a" />
          <circle cx="100" cy="32" r="6" fill="#c0392b" />
        </g>
      )
    case 'chef_hat':
      return (
        <g className="layer-headwear">
          <rect x="78" y="42" width="44" height="16" rx="4" fill="#f5f5f5" />
          <ellipse cx="86" cy="38" rx="14" ry="12" fill="#fff" />
          <ellipse cx="100" cy="32" rx="16" ry="14" fill="#fff" />
          <ellipse cx="114" cy="38" rx="14" ry="12" fill="#fff" />
        </g>
      )
    case 'hard_hat':
      return (
        <g className="layer-headwear">
          <ellipse cx="100" cy="50" rx="48" ry="12" fill="#e67e22" />
          <path d="M70 50 Q100 18 130 50Z" fill="#f39c12" />
        </g>
      )
    case 'crown':
      return (
        <g className="layer-headwear">
          <path
            d="M70 52 L78 28 L90 44 L100 22 L110 44 L122 28 L130 52Z"
            fill="#f4d03f"
            stroke="#b7950b"
          />
          <circle cx="100" cy="30" r="4" fill="#e74c3c" />
        </g>
      )
    case 'santa_hat':
      return (
        <g className="layer-headwear">
          <path d="M70 55 Q110 10 140 48 L120 58Z" fill="#c0392b" />
          <ellipse cx="70" cy="56" rx="18" ry="8" fill="#fff" />
          <circle cx="142" cy="46" r="8" fill="#fff" />
        </g>
      )
    case 'viking_helm':
      return (
        <g className="layer-headwear">
          <ellipse cx="100" cy="50" rx="46" ry="14" fill="#7f8c8d" />
          <path d="M60 48 L48 18 L72 42Z" fill="#ecf0f1" />
          <path d="M140 48 L152 18 L128 42Z" fill="#ecf0f1" />
        </g>
      )
    case 'samurai_helm':
      return (
        <g className="layer-headwear">
          <path d="M60 55 Q100 20 140 55 L130 62 Q100 40 70 62Z" fill="#2c3e50" />
          <rect x="96" y="18" width="8" height="28" fill="#c0392b" />
        </g>
      )
    case 'knight_helm':
      return (
        <g className="layer-headwear">
          <path d="M72 40 Q100 18 128 40 L124 70 Q100 78 76 70Z" fill="#95a5a6" />
          <rect x="90" y="48" width="20" height="6" fill="#2c3e50" />
        </g>
      )
    case 'wizard_hat':
      return (
        <g className="layer-headwear">
          <path d="M70 55 L100 8 L130 55Z" fill="#5b2c6f" />
          <ellipse cx="100" cy="56" rx="36" ry="8" fill="#4a235a" />
          <circle cx="108" cy="30" r="3" fill="#f4d03f" />
        </g>
      )
    case 'devil_horns':
      return (
        <g className="layer-headwear">
          <path d="M70 55 Q62 20 78 48" fill="none" stroke="#922b21" strokeWidth="8" />
          <path d="M130 55 Q138 20 122 48" fill="none" stroke="#922b21" strokeWidth="8" />
        </g>
      )
    case 'halo':
      return (
        <g className="layer-headwear">
          <ellipse
            cx="100"
            cy="28"
            rx="34"
            ry="10"
            fill="none"
            stroke="#f7dc6f"
            strokeWidth="5"
            opacity="0.9"
          />
        </g>
      )
    case 'astronaut_helm':
      return (
        <g className="layer-headwear">
          <ellipse cx="100" cy="78" rx="58" ry="62" fill="none" stroke="#bdc3c7" strokeWidth="8" />
          <rect x="70" y="60" width="60" height="36" rx="12" fill="#5dade2" opacity="0.35" />
        </g>
      )
    case 'unicorn_horn':
      return (
        <g className="layer-headwear">
          <path d="M100 10 L108 52 L92 52Z" fill="#f8c8dc" stroke="#e8a0bc" />
          <path d="M100 10 L104 52" stroke="#fff" strokeWidth="1.5" />
        </g>
      )
    case 'pumpkin_stem':
      return (
        <g className="layer-headwear">
          <rect x="96" y="22" width="10" height="22" rx="3" fill="#1e8449" />
          <path d="M106 28 Q118 20 120 30" fill="none" stroke="#27ae60" strokeWidth="3" />
        </g>
      )
    case 'party_visor':
      return (
        <g className="layer-headwear">
          <rect x="68" y="72" width="64" height="14" rx="4" fill="#00f5ff" opacity="0.75" />
          <rect x="72" y="62" width="10" height="12" fill="#7b2cbf" />
          <rect x="118" y="62" width="10" height="12" fill="#7b2cbf" />
        </g>
      )
    case 'ceo_hat':
      return (
        <g className="layer-headwear">
          <ellipse cx="100" cy="48" rx="40" ry="8" fill="#1a5276" />
          <rect x="82" y="28" width="36" height="22" rx="3" fill="#154360" />
        </g>
      )
    case 'dev_beanie':
      return (
        <g className="layer-headwear">
          <path d="M68 58 Q100 20 132 58Z" fill="#273746" />
          <rect x="68" y="52" width="64" height="10" fill="#1abc9c" />
        </g>
      )
    case 'chrono_goggles':
      return (
        <g className="layer-headwear">
          <circle cx="82" cy="82" r="16" fill="none" stroke="#5dade2" strokeWidth="4" />
          <circle cx="118" cy="82" r="16" fill="none" stroke="#5dade2" strokeWidth="4" />
          <rect x="96" y="78" width="8" height="6" fill="#5dade2" />
        </g>
      )
    case 'error_404':
      return (
        <g className="layer-headwear">
          <rect x="60" y="24" width="80" height="22" rx="4" fill="#2c3e50" />
          <text
            x="100"
            y="40"
            textAnchor="middle"
            fontSize="12"
            fill="#e74c3c"
            fontFamily="monospace"
          >
            404
          </text>
        </g>
      )
    case 'none':
    default:
      void accent
      return null
  }
}

function AccessoryLayer({ accessories, color }: { accessories: SkinAccessory[]; color: string }) {
  return (
    <g className="layer-accessories">
      {accessories.includes('tie') && (
        <path d="M100 130 L90 170 L100 160 L110 170Z" fill="#c0392b" />
      )}
      {accessories.includes('stethoscope') && (
        <g>
          <path
            d="M70 100 Q60 140 90 150 Q100 155 110 150 Q140 140 130 100"
            fill="none"
            stroke="#3498db"
            strokeWidth="4"
          />
          <circle cx="100" cy="158" r="6" fill="#2980b9" />
        </g>
      )}
      {accessories.includes('eyepatch') && (
        <g>
          <rect x="68" y="74" width="28" height="18" rx="4" fill="#1a1a1a" />
          <line x1="96" y1="80" x2="130" y2="70" stroke="#1a1a1a" strokeWidth="3" />
        </g>
      )}
      {accessories.includes('cape') && (
        <path
          d="M60 110 Q40 170 70 185 Q100 160 130 185 Q160 170 140 110"
          fill="#6c1d45"
          opacity="0.85"
        />
      )}
      {accessories.includes('headset') && (
        <g>
          <path d="M60 80 Q100 50 140 80" fill="none" stroke="#7b2cbf" strokeWidth="5" />
          <rect x="52" y="78" width="14" height="22" rx="4" fill="#9b59b6" />
          <rect x="134" y="78" width="14" height="22" rx="4" fill="#9b59b6" />
        </g>
      )}
      {accessories.includes('controller') && (
        <rect x="78" y="150" width="44" height="22" rx="8" fill="#2c3e50" />
      )}
      {accessories.includes('katana') && (
        <g>
          <rect x="148" y="70" width="6" height="80" rx="2" fill="#bdc3c7" />
          <rect x="144" y="145" width="14" height="10" fill="#c0392b" />
        </g>
      )}
      {accessories.includes('staff') && (
        <g>
          <rect x="150" y="60" width="6" height="100" fill="#5b2c6f" />
          <circle cx="153" cy="54" r="10" fill="#af7ac5" />
        </g>
      )}
      {accessories.includes('shield') && (
        <path d="M40 100 L55 90 L70 100 L70 130 L55 145 L40 130Z" fill="#7f8c8d" stroke="#34495e" />
      )}
      {accessories.includes('wings') && (
        <g opacity="0.85">
          <ellipse cx="40" cy="110" rx="28" ry="18" fill="#fcf3cf" />
          <ellipse cx="160" cy="110" rx="28" ry="18" fill="#fcf3cf" />
        </g>
      )}
      {accessories.includes('circuit') && (
        <g stroke="#00f5ff" strokeWidth="2" fill="none" opacity="0.8">
          <path d="M60 90 H80 V110 H100" />
          <path d="M120 70 H140 V100" />
          <circle cx="80" cy="90" r="3" fill="#00f5ff" />
          <circle cx="140" cy="100" r="3" fill="#00f5ff" />
        </g>
      )}
      {accessories.includes('error_badge') && (
        <g>
          <rect x="120" y="130" width="40" height="18" rx="3" fill="#e74c3c" />
          <text x="140" y="143" textAnchor="middle" fontSize="9" fill="#fff" fontFamily="monospace">
            ERR
          </text>
        </g>
      )}
      {accessories.includes('diamond_shard') && (
        <g className="sparkle">
          <polygon points="150,60 158,80 150,90 142,80" fill="#d6eaf8" stroke="#5dade2" />
        </g>
      )}
      {accessories.includes('radiation') && (
        <g>
          <circle cx="100" cy="150" r="14" fill="none" stroke="#a8ff3e" strokeWidth="3" />
          <path
            d="M100 150 L100 138 M100 150 L110 156 M100 150 L90 156"
            stroke="#a8ff3e"
            strokeWidth="3"
          />
        </g>
      )}
      {accessories.includes('wrap') && (
        <path d="M55 100 Q100 130 145 100" fill="none" stroke="#f5cba7" strokeWidth="10" />
      )}
      {accessories.includes('shell') && (
        <path
          d="M55 95 L100 70 L145 95 L130 130 L70 130Z"
          fill="none"
          stroke="#d4a017"
          strokeWidth="5"
        />
      )}
      {accessories.includes('money') && (
        <text x="150" y="100" fontSize="16" fill="#27ae60">
          $
        </text>
      )}
      {accessories.includes('terminal') && (
        <rect x="130" y="120" width="36" height="24" rx="3" fill="#1e8449" opacity="0.9" />
      )}
      {accessories.includes('coffee') && (
        <g>
          <rect x="40" y="120" width="18" height="22" rx="3" fill="#6e2c00" />
          <path d="M58 126 Q68 130 58 138" fill="none" stroke="#6e2c00" strokeWidth="3" />
        </g>
      )}
      {accessories.includes('clock') && (
        <circle cx="150" cy="90" r="12" fill="#5dade2" opacity="0.8" />
      )}
      {accessories.includes('portals') && (
        <g>
          <ellipse cx="40" cy="100" rx="12" ry="20" fill="#af7ac5" opacity="0.55" />
          <ellipse cx="160" cy="120" rx="12" ry="20" fill="#5dade2" opacity="0.55" />
        </g>
      )}
      {accessories.includes('finale_ring') && (
        <ellipse
          cx="100"
          cy="120"
          rx="70"
          ry="28"
          fill="none"
          stroke={color}
          strokeWidth="3"
          opacity="0.5"
        />
      )}
      {accessories.includes('quantum_dot') && (
        <rect
          x="72"
          y="48"
          width="56"
          height="40"
          rx="4"
          fill="none"
          stroke="#abb2b9"
          strokeWidth="3"
        />
      )}
      {accessories.includes('beans') && (
        <g>
          <ellipse cx="70" cy="120" rx="6" ry="4" fill="#6e2c00" />
          <ellipse cx="130" cy="125" rx="6" ry="4" fill="#6e2c00" />
        </g>
      )}
    </g>
  )
}

function TextureOverlay({ texture, color }: { texture: string; color: string }) {
  switch (texture) {
    case 'kernels':
      return (
        <g className="layer-texture">
          {[
            [70, 100],
            [90, 115],
            [115, 105],
            [125, 125],
            [80, 130],
            [105, 140],
          ].map(([x, y], i) => (
            <ellipse
              key={i}
              className="kernel"
              cx={x}
              cy={y}
              rx="5"
              ry="3.5"
              fill="#f4d03f"
              stroke="#b7950b"
              opacity="0.9"
            />
          ))}
        </g>
      )
    case 'facets':
      return (
        <g className="layer-texture" opacity="0.55">
          <polygon points="70,90 95,70 110,100" fill="#fff" />
          <polygon points="110,85 140,95 120,120" fill="#d4e6f1" />
          <polygon points="80,120 100,110 95,145" fill="#aed6f1" />
        </g>
      )
    case 'circuit':
      return (
        <g className="layer-texture" stroke="#00f5ff" strokeWidth="1.5" fill="none" opacity="0.65">
          <path d="M65 95 H90 V120 H115" />
          <path d="M120 80 V110 H145" />
          <circle cx="90" cy="95" r="2.5" fill="#00f5ff" />
        </g>
      )
    case 'pixels':
      return (
        <g className="layer-texture" opacity="0.4">
          {Array.from({ length: 20 }, (_, i) => (
            <rect
              key={i}
              x={60 + (i % 5) * 16}
              y={80 + Math.floor(i / 5) * 16}
              width="12"
              height="12"
              fill={i % 2 ? color : shade(color, 40)}
            />
          ))}
        </g>
      )
    case 'glitch':
    case 'error':
      return (
        <g className="layer-texture" opacity="0.5">
          <rect x="60" y="90" width="40" height="6" fill="#1abc9c" />
          <rect x="110" y="110" width="30" height="6" fill="#e74c3c" />
          <rect x="75" y="130" width="50" height="4" fill="#f1c40f" />
        </g>
      )
    case 'holo':
      return (
        <g className="layer-texture" opacity="0.35">
          <path d="M60 100 Q100 70 140 100 Q100 140 60 100" fill="url(#holoGrad)" />
        </g>
      )
    case 'rainbow':
      return (
        <g className="layer-texture" opacity="0.35">
          <path d="M55 110 Q100 70 145 110" fill="none" stroke="#ff6bcb" strokeWidth="6" />
          <path d="M58 118 Q100 82 142 118" fill="none" stroke="#5dade2" strokeWidth="6" />
          <path d="M62 126 Q100 94 138 126" fill="none" stroke="#58d68d" strokeWidth="6" />
        </g>
      )
    case 'radiation':
      return (
        <g className="layer-texture" opacity="0.35">
          <circle cx="100" cy="115" r="28" fill="#a8ff3e" />
        </g>
      )
    case 'void_noise':
      return (
        <g className="layer-texture" opacity="0.5">
          <circle cx="100" cy="115" r="20" fill="#000" />
          <circle cx="100" cy="115" r="10" fill="#4a0080" />
        </g>
      )
    case 'ghost':
      return (
        <g className="layer-texture" opacity="0.25">
          <ellipse cx="100" cy="120" rx="40" ry="30" fill="#fff" />
        </g>
      )
    case 'moss':
      return (
        <g className="layer-texture">
          <ellipse cx="75" cy="125" rx="10" ry="6" fill="#3d6b4f" opacity="0.7" />
          <ellipse cx="125" cy="110" rx="8" ry="5" fill="#3d6b4f" opacity="0.7" />
        </g>
      )
    case 'stripes':
      return (
        <g className="layer-texture" opacity="0.25" stroke={shade(color, -40)} strokeWidth="4">
          <path d="M65 90 Q100 100 135 90" fill="none" />
          <path d="M60 110 Q100 122 140 110" fill="none" />
          <path d="M65 130 Q100 142 135 130" fill="none" />
        </g>
      )
    case 'neon':
      return (
        <g className="layer-texture" opacity="0.45">
          <ellipse cx="100" cy="115" rx="45" ry="35" fill="none" stroke="#00f5ff" strokeWidth="3" />
        </g>
      )
    default:
      return null
  }
}

function AuraLayer({ aura, color }: { aura: string; color: string }) {
  if (aura === 'none') return null
  return (
    <g className="layer-aura">
      {(aura === 'diamond' ||
        aura === 'glitter' ||
        aura === 'sparkle_food' ||
        aura === 'holo' ||
        aura === 'finale') && (
        <g>
          <circle className="sparkle" cx="50" cy="70" r="3" fill="#fff" />
          <circle className="sparkle" cx="150" cy="60" r="2.5" fill="#fff" />
          <circle className="sparkle" cx="160" cy="110" r="3" fill="#f9e79f" />
          <circle className="sparkle" cx="45" cy="120" r="2" fill="#f9e79f" />
        </g>
      )}
      {(aura === 'event_horizon' || aura === 'void') && (
        <ellipse
          cx="100"
          cy="115"
          rx="78"
          ry="60"
          fill="none"
          stroke="#7d3c98"
          strokeWidth="4"
          opacity="0.45"
        />
      )}
      {aura === 'radiation' && <circle cx="100" cy="115" r="72" fill="#a8ff3e" opacity="0.12" />}
      {aura === 'flame' && (
        <g opacity="0.55">
          <ellipse cx="70" cy="150" rx="10" ry="18" fill="#e67e22" />
          <ellipse cx="130" cy="150" rx="10" ry="18" fill="#e74c3c" />
        </g>
      )}
      {aura === 'steam' && (
        <g opacity="0.4" stroke="#ddd" strokeWidth="3" fill="none">
          <path d="M70 55 Q75 40 70 30" />
          <path d="M100 48 Q105 32 100 22" />
          <path d="M130 55 Q135 40 130 30" />
        </g>
      )}
      {aura === 'circuit' && (
        <circle
          cx="100"
          cy="115"
          r="70"
          fill="none"
          stroke="#00f5ff"
          strokeWidth="2"
          opacity="0.3"
        />
      )}
      {aura === '404' && (
        <text
          x="100"
          y="175"
          textAnchor="middle"
          fontSize="10"
          fill="#e74c3c"
          opacity="0.7"
          fontFamily="monospace"
        >
          NOT FOUND
        </text>
      )}
      {aura === 'royalty' && (
        <ellipse
          cx="100"
          cy="115"
          rx="74"
          ry="56"
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.35"
        />
      )}
      {aura === 'frenzy' || aura === 'pixels' ? (
        <g opacity="0.4">
          <rect x="40" y="80" width="6" height="6" fill="#ff00aa" />
          <rect x="155" y="95" width="6" height="6" fill="#00f5ff" />
          <rect x="48" y="140" width="6" height="6" fill="#f1c40f" />
        </g>
      ) : null}
    </g>
  )
}

function BodyPath({
  bodyShape,
  color,
  dark,
  light,
}: {
  bodyShape: string
  color: string
  dark: string
  light: string
}) {
  const swirl = (
    <g className="body-main layer-body">
      <ellipse cx="100" cy="128" rx="62" ry="48" fill="url(#skinBodyGradient)" />
      <ellipse cx="100" cy="95" rx="50" ry="40" fill="url(#skinBodyGradient)" />
      <ellipse cx="100" cy="68" rx="34" ry="28" fill="url(#skinBodyLightGradient)" />
      <ellipse cx="88" cy="60" rx="10" ry="7" fill={shade(light, 30)} opacity="0.55" />
      <path d="M78 88 Q100 100 122 88" fill="none" stroke={dark} strokeWidth="3" opacity="0.25" />
    </g>
  )

  switch (bodyShape) {
    case 'chunky':
      return (
        <g className="body-main layer-body">
          <ellipse cx="100" cy="125" rx="68" ry="52" fill="url(#skinBodyGradient)" />
          <ellipse cx="100" cy="90" rx="54" ry="42" fill="url(#skinBodyGradient)" />
          <ellipse cx="100" cy="62" rx="36" ry="28" fill="url(#skinBodyLightGradient)" />
        </g>
      )
    case 'crystal':
      return (
        <g className="body-main layer-body">
          <polygon
            points="100,40 145,85 130,155 70,155 55,85"
            fill={color}
            stroke={light}
            strokeWidth="2"
          />
          <polygon points="100,40 120,90 100,120 80,90" fill={light} opacity="0.55" />
        </g>
      )
    case 'pixel':
      return (
        <g className="body-main layer-body">
          {[
            [88, 48],
            [100, 48],
            [76, 60],
            [88, 60],
            [100, 60],
            [112, 60],
            [64, 84],
            [76, 84],
            [88, 84],
            [100, 84],
            [112, 84],
            [124, 84],
            [64, 108],
            [76, 108],
            [88, 108],
            [100, 108],
            [112, 108],
            [124, 108],
            [76, 132],
            [88, 132],
            [100, 132],
            [112, 132],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="12" height="12" fill={i % 3 === 0 ? light : color} />
          ))}
        </g>
      )
    case 'glitch':
      return (
        <g className="body-main layer-body">
          <ellipse cx="100" cy="120" rx="60" ry="48" fill={color} />
          <ellipse cx="104" cy="90" rx="48" ry="38" fill={light} />
          <ellipse cx="96" cy="64" rx="32" ry="26" fill={color} />
          <rect x="55" y="100" width="30" height="8" fill="#1abc9c" opacity="0.7" />
          <rect x="120" y="80" width="24" height="6" fill="#e74c3c" opacity="0.7" />
        </g>
      )
    case 'singularity':
    case 'void':
      return (
        <g className="body-main layer-body">
          <ellipse cx="100" cy="115" rx="64" ry="52" fill="#0d0d0d" />
          <ellipse cx="100" cy="115" rx="36" ry="28" fill="#1a0030" />
          <ellipse cx="100" cy="115" rx="14" ry="12" fill="#000" />
          <ellipse cx="100" cy="70" rx="28" ry="22" fill="#1c1c1c" />
        </g>
      )
    case 'ghost':
      return (
        <g className="body-main layer-body" opacity="0.85">
          <ellipse cx="100" cy="100" rx="50" ry="55" fill={light} />
          <path
            d="M50 120 Q60 150 70 130 Q85 155 100 130 Q115 155 130 130 Q140 150 150 120"
            fill={light}
          />
        </g>
      )
    case 'box':
      return (
        <g className="body-main layer-body">
          <rect x="55" y="70" width="90" height="90" rx="8" fill={color} stroke={dark} />
          <ellipse cx="100" cy="95" rx="28" ry="22" fill={light} />
        </g>
      )
    case 'armor':
      return (
        <g className="body-main layer-body">
          <ellipse cx="100" cy="125" rx="60" ry="48" fill={color} />
          <ellipse cx="100" cy="92" rx="48" ry="38" fill={shade(color, 20)} />
          <ellipse cx="100" cy="66" rx="32" ry="26" fill={light} />
          <path d="M70 110 H130" stroke={dark} strokeWidth="3" opacity="0.4" />
        </g>
      )
    case 'final':
      return (
        <g className="body-main layer-body">
          <ellipse cx="100" cy="128" rx="64" ry="50" fill={color} />
          <ellipse cx="100" cy="95" rx="52" ry="40" fill={light} />
          <ellipse cx="100" cy="66" rx="36" ry="28" fill={shade(light, 25)} />
          <ellipse
            cx="100"
            cy="115"
            rx="70"
            ry="55"
            fill="none"
            stroke="#f5b041"
            strokeWidth="3"
            opacity="0.5"
          />
        </g>
      )
    case 'soft':
      return (
        <g className="body-main layer-body">
          <ellipse cx="100" cy="120" rx="64" ry="50" fill="url(#skinBodyGradient)" />
          <ellipse cx="100" cy="88" rx="52" ry="40" fill="url(#skinBodyGradient)" />
          <ellipse cx="100" cy="62" rx="36" ry="28" fill="url(#skinBodyLightGradient)" />
        </g>
      )
    case 'swirl':
    default:
      return swirl
  }
}

function ParticlesOverlay({
  tapState,
  reducedMotion,
}: {
  tapState: CharacterTapState
  reducedMotion: boolean
}) {
  if (reducedMotion) return null
  if (tapState !== 'frenzy' && tapState !== 'overdrive' && tapState !== 'fast') return null
  return (
    <g className="layer-particles">
      <circle cx="40" cy="90" r="3" fill="#f4c95f" opacity="0.7">
        {!reducedMotion && (
          <animate attributeName="cy" values="90;60;90" dur="0.6s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="160" cy="100" r="2.5" fill="#e07a3d" opacity="0.7">
        {!reducedMotion && (
          <animate attributeName="cy" values="100;70;100" dur="0.5s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="100" cy="40" r="2" fill="#fff" opacity="0.6">
        {!reducedMotion && (
          <animate
            attributeName="opacity"
            values="0.6;0.1;0.6"
            dur="0.4s"
            repeatCount="indefinite"
          />
        )}
      </circle>
    </g>
  )
}

export function PoopCharacter({
  skinId,
  tapState,
  face,
  rollingCps = 0,
  squish,
  reducedMotion,
  flushing = false,
  onPointerDown,
}: PoopCharacterProps) {
  const manifest =
    ASSET_MANIFEST.skins[skinId as keyof typeof ASSET_MANIFEST.skins] ??
    ASSET_MANIFEST.skins.classic_poop
  const skinDef = SKIN_BY_ID[skinId]
  const visual = getSkinVisual(skinId)
  const color = manifest.color
  const dark = shade(color, -40)
  const light = shade(color, 35)
  const eyes = eyeOffsets(face)
  const skinClass = `skin-${skinId.replace(/[^a-z0-9_]/gi, '_')}`
  const animVariant = skinDef?.animationVariant ?? manifest.variant
  const authoredBody = resolveSkinBodyPath(skinId)
  const authoredExpression = resolveSharedExpressionPathForPlay(rollingCps, tapState)
  const authoredLegacy = resolveSkinExpressionPath(skinId, face)
  const maskedFace = isMaskedFaceSkin(skinId)
  const [failedAsset, setFailedAsset] = useState<string | null>(null)

  useEffect(() => {
    setFailedAsset(null)
  }, [authoredBody, authoredExpression, authoredLegacy])

  const layeredOk =
    authoredBody != null && failedAsset !== authoredBody && failedAsset !== authoredExpression
  const legacyOk = !layeredOk && authoredLegacy != null && failedAsset !== authoredLegacy

  if (layeredOk || legacyOk) {
    return (
      <button
        type="button"
        className={`poop-stage authored-poop-stage no-toilet ${reducedMotion ? 'reduced' : ''}`}
        onPointerDown={onPointerDown}
        aria-label={`Tap ${skinDef?.name ?? 'poop'}`}
        data-anim={animVariant}
      >
        {layeredOk ? (
          <div
            className={`authored-character-stack state-${tapState} ${squish ? 'squish' : ''} ${flushing ? 'flushing' : ''} ${skinClass}`}
          >
            <img
              className="authored-character-body"
              src={authoredBody!}
              alt=""
              draggable={false}
              aria-hidden
              onError={() => setFailedAsset(authoredBody!)}
            />
            <img
              className={`authored-character-expr p4-expr${maskedFace ? ' masked-face' : ''}`}
              src={authoredExpression}
              alt=""
              draggable={false}
              aria-hidden
              onError={() => setFailedAsset(authoredExpression)}
            />
          </div>
        ) : (
          <img
            className={`authored-character state-${tapState} ${squish ? 'squish' : ''} ${flushing ? 'flushing' : ''} ${skinClass}`}
            src={authoredLegacy!}
            alt=""
            draggable={false}
            aria-hidden
            onError={() => setFailedAsset(authoredLegacy!)}
          />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`poop-stage no-toilet ${reducedMotion ? 'reduced' : ''}`}
      style={
        {
          ['--skin' as string]: color,
          ['--skin-dark' as string]: dark,
          ['--skin-light' as string]: light,
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      aria-label={`Tap ${skinDef?.name ?? 'poop'}`}
      data-anim={animVariant}
    >
      <div
        className={`character-root state-${tapState} ${squish ? 'squish' : ''} ${reducedMotion ? 'reduced' : ''} ${skinClass}`}
      >
        <svg className="character-svg" viewBox="0 0 200 200" role="img">
          <defs>
            <radialGradient id="skinBodyGradient" cx="34%" cy="22%" r="78%">
              <stop offset="0%" stopColor={shade(light, 34)} />
              <stop offset="38%" stopColor={light} />
              <stop offset="72%" stopColor={color} />
              <stop offset="100%" stopColor={dark} />
            </radialGradient>
            <radialGradient id="skinBodyLightGradient" cx="32%" cy="20%" r="82%">
              <stop offset="0%" stopColor={shade(light, 48)} />
              <stop offset="48%" stopColor={light} />
              <stop offset="100%" stopColor={color} />
            </radialGradient>
            <linearGradient id="holoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#85c1e9" />
              <stop offset="50%" stopColor="#f8c8dc" />
              <stop offset="100%" stopColor="#aed6f1" />
            </linearGradient>
          </defs>

          <AuraLayer aura={visual.aura} color={color} />
          <BodyPath bodyShape={visual.bodyShape} color={color} dark={dark} light={light} />
          <TextureOverlay texture={visual.texture} color={color} />
          <g className="layer-body-details" aria-hidden>
            <path
              d="M54 107 Q39 104 31 116 Q38 124 47 119"
              fill="none"
              stroke={dark}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M146 107 Q161 104 169 116 Q162 124 153 119"
              fill="none"
              stroke={dark}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <ellipse cx="71" cy="101" rx="10" ry="5" fill="#ff9a88" opacity="0.2" />
            <ellipse cx="129" cy="101" rx="10" ry="5" fill="#ff9a88" opacity="0.2" />
            <path
              d="M72 51 Q87 37 102 45"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.25"
            />
          </g>

          <g className={`layer-eyes face-${face}`}>
            {face === 'dizzy' ? (
              <>
                <text x="78" y="90" fontSize="14" fill="var(--ink, #1d2a32)">
                  ×
                </text>
                <text x="114" y="90" fontSize="14" fill="var(--ink, #1d2a32)">
                  ×
                </text>
              </>
            ) : (
              <>
                <ellipse
                  className="eye"
                  cx="80"
                  cy="84"
                  rx={7 * eyes.open}
                  ry={8 * eyes.open}
                  fill="#1d2a32"
                />
                <ellipse
                  className="eye"
                  cx="120"
                  cy="84"
                  rx={7 * eyes.open}
                  ry={8 * eyes.open}
                  fill="#1d2a32"
                />
                <circle cx="82" cy={82 - eyes.brow * 0.2} r="2" fill="#fff" opacity="0.85" />
                <circle cx="122" cy={82 - eyes.brow * 0.2} r="2" fill="#fff" opacity="0.85" />
              </>
            )}
            {(face === 'effort' || face === 'panic' || face === 'overdrive') && (
              <g stroke="#1d2a32" strokeWidth="2.5" fill="none">
                <path d={`M70 ${72 + eyes.brow} Q80 ${68 + eyes.brow} 90 ${72 + eyes.brow}`} />
                <path d={`M110 ${72 + eyes.brow} Q120 ${68 + eyes.brow} 130 ${72 + eyes.brow}`} />
              </g>
            )}
          </g>

          <g className={`layer-mouth face-${face}`}>
            <path
              className="mouth-path"
              d={mouthPath(face)}
              fill="none"
              stroke="#1d2a32"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {(face === 'frenzy' || face === 'overdrive') && (
              <ellipse cx="100" cy="128" rx="8" ry="5" fill="#5a3516" opacity="0.7" />
            )}
          </g>

          <AccessoryLayer accessories={visual.accessories} color={color} />
          <HeadwearLayer headwear={visual.headwear} accent={color} />
          <ParticlesOverlay tapState={tapState} reducedMotion={reducedMotion} />
        </svg>
      </div>
    </button>
  )
}

export default PoopCharacter
