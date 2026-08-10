import { useMemo, useState } from 'react'
import { ACHIEVEMENTS } from '../../content/achievements'
import type { AchievementCategory } from '../../core/types/gameTypes'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

const FILTERS: Array<AchievementCategory | 'all'> = [
  'all',
  'tapping',
  'pp',
  'cps',
  'flush',
  'generators',
  'golden',
  'clogs',
  'events',
  'collection',
  'hidden',
]

const FILTER_LABELS: Record<AchievementCategory | 'all', string> = {
  all: 'All',
  tapping: 'Tapping',
  pp: 'PP',
  cps: 'CPS',
  flush: 'Flush',
  golden: 'Golden',
  clogs: 'Clogs',
  generators: 'Gens',
  collection: 'Collection',
  events: 'Events',
  hidden: 'Hidden',
}

export function AchievementsPanel() {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')

  const list = useMemo(
    () => ACHIEVEMENTS.filter((a) => filter === 'all' || a.category === filter),
    [filter],
  )

  return (
    <div className="panel">
      <h2>Awards</h2>
      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {FILTER_LABELS[f] || f}
          </button>
        ))}
      </div>
      {list.map((def) => {
        const state = snap.save.achievements[def.id]
        const hiddenLocked = def.hidden && !state?.discovered && !state?.completed
        const progress = state?.progress ?? 0
        const pct = Math.min(100, Math.round((progress / def.target) * 100))
        return (
          <div className="list-row" key={def.id}>
            <div>
              <strong>{hiddenLocked ? '???' : def.name}</strong>
              <div className="meta-line">
                {hiddenLocked ? 'Secret achievement' : def.description}
              </div>
              {!hiddenLocked && (
                <>
                  <div className="progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="meta-line">
                    Tier {def.tier} · {Math.min(progress, def.target)}/{def.target} · +
                    {def.rewardGtp} GTP
                  </div>
                </>
              )}
            </div>
            <button
              className="primary-btn"
              disabled={!state?.completed || state.claimed || hiddenLocked}
              onClick={() => engine.claimAchievementReward(def.id)}
            >
              {state?.claimed ? 'Claimed' : state?.completed ? 'Claim' : 'Locked'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
