import { useMemo, useState } from 'react'
import { FLUSH_MILESTONES } from '../../content/flushMilestones'
import { UI_ASSETS } from '../../content/assetPaths'
import { ECONOMY } from '../../core/economy/formulas'
import { formatMultiplier, formatNumber } from '../../core/numbers/formatNumber'
import { LargeNumber } from '../../core/numbers/LargeNumber'
import { computeMultiplierBreakdown } from '../../core/systems/production'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { ModalHost } from '../overlays/ModalHost'

export type HudContext = 'play' | 'shop' | 'prestige' | 'other'

export function ContextualHud({
  context,
  onFlushProgressClick,
}: {
  context: HudContext
  onFlushProgressClick?: () => void
}) {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const breakdown = useMemo(() => computeMultiplierBreakdown(snap.save), [snap.save])
  const runPP = LargeNumber.deserialize(snap.save.runPPEarned)
  const flushProgress = Math.min(1, runPP.div(ECONOMY.firstFlushRequirement).toNumber())
  const nextMilestone = FLUSH_MILESTONES.find((m) => m.flushCount > snap.save.flushCount)

  return (
    <>
      <header className={`top-bar hud-${context}`}>
        <div className="currency-stack currency-stack-main">
          {(context === 'play' || context === 'shop' || context === 'other') && (
            <div className="currency-primary">
              <img className="currency-icon" src={UI_ASSETS.currency.pp} alt="" aria-hidden />
              <span className="pp-value">{formatNumber(snap.save.currentPP)}</span>
              <span className="pp-label">PP</span>
            </div>
          )}
          {(context === 'shop' || context === 'other') && (
            <div className="currency-gtp">
              <img src={UI_ASSETS.currency.gtp} alt="" aria-hidden />
              <span className="gtp-value">{snap.save.gtp}</span>
              <span className="gtp-label">GTP</span>
            </div>
          )}
          {context === 'prestige' && (
            <div className="currency-gtp">
              <img src={UI_ASSETS.currency.flushPower} alt="" aria-hidden />
              <span className="gtp-value">{snap.save.flushPower}</span>
              <span className="gtp-label">Flush Power</span>
            </div>
          )}
        </div>
        <div className="stat-stack">
          <div className="stat-row">
            {(context === 'play' || context === 'shop') && (
              <span className="stat-pill">{formatNumber(snap.production.pps)} /s</span>
            )}
            {context === 'play' && (
              <>
                <span className="stat-pill stat-cps">CPS {snap.rollingCps.toFixed(1)}</span>
                {snap.combo >= 2 && (
                  <span className="stat-pill">COMBO {Math.floor(snap.combo)}</span>
                )}
                <button
                  type="button"
                  className="stat-pill hud-flush-progress"
                  onClick={onFlushProgressClick}
                >
                  FLUSH {Math.round(flushProgress * 100)}%
                </button>
              </>
            )}
            {context === 'prestige' && (
              <>
                <span className="stat-pill">+{snap.flushPreview.flushPowerGain} FP</span>
                <span className="stat-pill">
                  {formatMultiplier(snap.flushPreview.newGlobalMultiplier)} next
                </span>
                {nextMilestone && (
                  <span className="stat-pill">
                    Next: {nextMilestone.name} @ {nextMilestone.flushCount}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="stat-row stat-row-secondary">
            <button
              type="button"
              className="hud-mult-btn"
              onClick={() => {
                setBreakdownOpen(true)
                engine.trackUi('multiplier_breakdown_opened', { context })
              }}
            >
              {formatMultiplier(snap.production.globalMultiplier)}
            </button>
          </div>
        </div>
      </header>
      <ModalHost
        open={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        title="TOTAL PRODUCTION"
        ariaLabel="Production multiplier breakdown"
      >
        <p className="goal-title">{formatMultiplier(breakdown.total)}</p>
        {breakdown.parts.map((part) => (
          <div className="list-row" key={part.id}>
            <span>{part.label}</span>
            <strong>{formatMultiplier(part.value)}</strong>
          </div>
        ))}
      </ModalHost>
    </>
  )
}
