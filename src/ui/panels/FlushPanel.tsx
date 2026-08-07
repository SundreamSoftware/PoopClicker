import { ROYAL_FLUSH_NODES } from '../../content/royalFlush'
import { formatMultiplier, formatNumber, formatPercent } from '../../core/numbers/formatNumber'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

export function FlushPanel({ onClose }: { onClose: () => void }) {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const preview = snap.flushPreview
  const royalUnlocked = snap.save.flushCount >= 1

  return (
    <div className="panel">
      <h2>Flush & Royal Flush</h2>
      <div className="goal-card">
        <div className="goal-title">CURRENT RUN</div>
        <div className="goal-sub">{formatNumber(preview.runPPEarned)} PP earned</div>
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
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            className="primary-btn"
            disabled={!snap.canFlush}
            onClick={() => {
              if (
                window.confirm(
                  'Flush resets run progress (upgrades/generators/PP). Meta progress stays. Continue?',
                )
              ) {
                engine.flush()
                onClose()
              }
            }}
          >
            CONFIRM FLUSH
          </button>
          <button className="ghost-btn" onClick={onClose}>
            Back
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 16 }}>Royal Flush</h2>
      {!royalUnlocked && <p className="meta-line">Unlocks after your first Flush.</p>}
      {royalUnlocked &&
        ROYAL_FLUSH_NODES.map((node) => {
          const level = snap.save.royalFlushLevels[node.id] ?? 0
          const cost = Math.floor(node.baseCost * node.costGrowth ** level)
          const locked =
            snap.save.flushCount < node.unlockFlushCount ||
            node.requires.some((r) => (snap.save.royalFlushLevels[r] ?? 0) <= 0)
          return (
            <div className="list-row" key={node.id}>
              <div>
                <strong>
                  [{node.category}] {node.name} · {level}/{node.maxLevel}
                </strong>
                <div className="meta-line">{node.description}</div>
                <div className="meta-line">
                  Needs FP {node.baseCost}+ · Costs {cost} GTP
                </div>
              </div>
              <button
                className="primary-btn"
                disabled={locked || level >= node.maxLevel || snap.save.gtp < cost}
                onClick={() => engine.buyRoyalFlush(node.id)}
              >
                {level >= node.maxLevel ? 'MAX' : locked ? 'Locked' : `Buy ${cost}`}
              </button>
            </div>
          )
        })}
    </div>
  )
}
