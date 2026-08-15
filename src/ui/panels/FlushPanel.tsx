import { useState } from 'react'
import { FLUSH_MILESTONES } from '../../content/flushMilestones'
import {
  ROYAL_FLUSH_BY_ID,
  ROYAL_FLUSH_CATEGORY_LABEL,
  ROYAL_FLUSH_CATEGORY_ORDER,
  ROYAL_FLUSH_NODES,
  royalFlushMissingPrerequisiteNames,
} from '../../content/royalFlush'
import { ECONOMY } from '../../core/economy/formulas'
import { formatMultiplier, formatNumber, formatPercent } from '../../core/numbers/formatNumber'
import { LargeNumber } from '../../core/numbers/LargeNumber'
import AudioManager from '../../audio/AudioManager'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { maybeShowInterstitial } from '../monetizationHelpers'

export function FlushPanel({
  onClose,
  onFlushed,
  canFlush,
}: {
  onClose: () => void
  onFlushed?: () => void
  canFlush: boolean
}) {
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const preview = snap.flushPreview
  const royalUnlocked = snap.save.flushCount >= 1
  const [confirmStep, setConfirmStep] = useState(false)

  const confirmFlush = async () => {
    const result = engine.flush()
    if (!result.ok) return
    if (snap.save.settings.sfx) {
      AudioManager.play('flush')
      if (result.reason === 'milestone') AudioManager.play('milestone')
    }
    setConfirmStep(false)
    onFlushed?.()
    onClose()
    await maybeShowInterstitial(ads, 'flush', {
      eventActive: Boolean(snap.eventRuntime),
      frenzyActive: snap.frenzyActive,
      removeAds: snap.save.removeAds,
    })
  }

  const runPP = LargeNumber.deserialize(snap.save.runPPEarned)
  const flushProgress = Math.min(1, runPP.div(ECONOMY.firstFlushRequirement).toNumber())

  return (
    <div className="panel modal-sheet">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Flush & Royal Flush</h2>
        <button type="button" className="ghost-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="goal-card">
        <div className="goal-title">CURRENT RUN</div>
        <div className="goal-sub">{formatNumber(preview.runPPEarned)} PP earned</div>
        {!canFlush && (
          <>
            <div className="goal-title" style={{ marginTop: 8 }}>
              PROGRESS TO FLUSH
            </div>
            <div className="progress" style={{ marginTop: 4 }}>
              <span style={{ width: `${Math.round(flushProgress * 100)}%` }} />
            </div>
            <div className="meta-line" style={{ marginTop: 4 }}>
              {formatPercent(flushProgress)} of {formatNumber(ECONOMY.firstFlushRequirement)} PP
              required
            </div>
          </>
        )}
        <div className="goal-title" style={{ marginTop: 8 }}>
          FLUSH REWARD
        </div>
        <div className="goal-sub">
          +{preview.flushPowerGain} Flush Power
          {preview.firstFlushBonusApplied ? ' (First Flush of the Day +25%)' : ''}
        </div>
        <div className="goal-title" style={{ marginTop: 8 }}>
          NEW GLOBAL BONUS
        </div>
        <div className="goal-sub">{formatMultiplier(preview.newGlobalMultiplier)}</div>
        <div className="goal-title" style={{ marginTop: 8 }}>
          NEXT RUN BONUS
        </div>
        <div className="goal-sub">
          +{formatPercent(preview.nextTapBonusPercent)} Tap · +
          {formatPercent(preview.nextIdleBonusPercent)} Idle
        </div>

        {!confirmStep && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="primary-btn"
              disabled={!canFlush}
              onClick={() => setConfirmStep(true)}
            >
              {canFlush ? 'FLUSH' : 'Need More PP'}
            </button>
            <button className="ghost-btn" onClick={onClose}>
              Back
            </button>
          </div>
        )}

        {confirmStep && (
          <div style={{ marginTop: 12 }}>
            <div className="meta-line" style={{ marginBottom: 8, color: '#ff6b6b' }}>
              Warning: Flush resets run progress (upgrades/generators/PP). Meta progress stays.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="primary-btn"
                disabled={!canFlush}
                onClick={() => void confirmFlush()}
              >
                CONFIRM FLUSH
              </button>
              <button className="ghost-btn" onClick={() => setConfirmStep(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: 16 }}>Flush Milestones</h2>
      {FLUSH_MILESTONES.map((milestone) => {
        const reached = snap.save.flushCount >= milestone.flushCount
        return (
          <div className="list-row" key={milestone.id}>
            <div>
              <strong>
                {reached ? '✓' : ''} Flush {milestone.flushCount}: {milestone.name}
              </strong>
              <div className="meta-line">{milestone.description}</div>
            </div>
            <span className="badge">{reached ? 'Complete' : 'Locked'}</span>
          </div>
        )
      })}

      <h2 style={{ marginTop: 16 }}>Royal Flush</h2>
      {!royalUnlocked && <p className="meta-line">Unlocks after your first Flush.</p>}
      {royalUnlocked &&
        ROYAL_FLUSH_CATEGORY_ORDER.map((category) => {
          const nodes = ROYAL_FLUSH_NODES.filter((node) => node.category === category)
          if (nodes.length === 0) return null
          return (
            <section key={category} aria-label={`Royal Flush ${ROYAL_FLUSH_CATEGORY_LABEL[category]}`}>
              <h3 style={{ margin: '12px 0 8px', fontSize: 16 }}>
                {ROYAL_FLUSH_CATEGORY_LABEL[category]}
              </h3>
              {nodes.map((node) => {
                const level = snap.save.royalFlushLevels[node.id] ?? 0
                const cost = Math.floor(node.baseCost * node.costGrowth ** level)
                const missingPrereqs = royalFlushMissingPrerequisiteNames(
                  node.id,
                  snap.save.royalFlushLevels,
                )
                const requiresLocked = missingPrereqs.length > 0
                const flushCountLocked = snap.save.flushCount < node.unlockFlushCount
                const fpLocked = snap.save.flushPower < node.baseCost
                const gtpLocked = snap.save.gtp < cost
                const locked = flushCountLocked || requiresLocked || fpLocked || gtpLocked

                let lockReason = ''
                if (fpLocked) lockReason = `Needs ${node.baseCost} FP`
                else if (flushCountLocked) lockReason = `Needs ${node.unlockFlushCount} flushes`
                else if (requiresLocked) lockReason = `Needs ${missingPrereqs.join(', ')}`
                else if (gtpLocked) lockReason = `Needs ${cost} GTP`

                return (
                  <div className="list-row" key={node.id}>
                    <div>
                      <strong>
                        {node.name} · {level}/{node.maxLevel}
                      </strong>
                      <div className="meta-line">{node.description}</div>
                      <div className="meta-line">
                        Requires {node.baseCost} FP · Costs {cost} GTP
                        {node.requires.length > 0 && (
                          <>
                            {' · '}
                            After{' '}
                            {node.requires
                              .map((id) => ROYAL_FLUSH_BY_ID[id]?.name ?? id)
                              .join(', ')}
                          </>
                        )}
                        {lockReason && <span style={{ color: '#ff6b6b' }}> · {lockReason}</span>}
                      </div>
                    </div>
                    <button
                      className="primary-btn"
                      disabled={locked || level >= node.maxLevel}
                      onClick={() => engine.buyRoyalFlush(node.id)}
                    >
                      {level >= node.maxLevel ? 'MAX' : locked ? 'Locked' : `Buy ${cost}`}
                    </button>
                  </div>
                )
              })}
            </section>
          )
        })}
    </div>
  )
}
