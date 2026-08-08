import type { ReactNode } from 'react'
import { WORLD_BY_ID } from '../../content/worlds'
import './worlds.css'

export interface WorldStageProps {
  worldId: string
  children?: ReactNode
  reducedMotion?: boolean
}

const WORLD_FX: Record<string, { className: string; count: number }[]> = {
  home_bathroom: [{ className: 'fx-drip', count: 2 }],
  office_toilet: [{ className: 'fx-steam', count: 2 }],
  gas_station_restroom: [{ className: 'fx-flicker', count: 1 }],
  stadium_loo: [{ className: 'fx-float', count: 1 }],
  space_loo: [{ className: 'fx-star', count: 3 }],
  quantum_bathroom: [{ className: 'fx-pulse', count: 1 }],
  chrono_chamber: [{ className: 'fx-scan', count: 1 }],
  neon_arcade_stall: [{ className: 'fx-spark', count: 3 }],
  volcanic_spa_toilet: [{ className: 'fx-ember', count: 3 }],
  cloud_restroom: [{ className: 'fx-cloud', count: 2 }],
  void_washroom: [{ className: 'fx-void', count: 1 }],
  omni_throne: [{ className: 'fx-crown', count: 1 }],
}

export function WorldStage({ worldId, children, reducedMotion = false }: WorldStageProps) {
  const world = WORLD_BY_ID[worldId] ?? WORLD_BY_ID.home_bathroom
  const fx = WORLD_FX[worldId] ?? WORLD_FX.home_bathroom!
  const safeId = world?.id ?? 'home_bathroom'

  return (
    <section
      className={`world-stage world-${safeId} ${reducedMotion ? 'reduced' : ''}`}
      data-world={safeId}
      aria-label={world?.name ?? 'Bathroom'}
    >
      <div className="world-label">{world?.name ?? 'Home Bathroom'}</div>
      <div className="world-fx" aria-hidden>
        {fx.flatMap((group) =>
          Array.from({ length: group.count }, (_, i) => (
            <span key={`${group.className}-${i}`} className={group.className} />
          )),
        )}
      </div>
      <div className="world-children">{children}</div>
    </section>
  )
}

export default WorldStage
