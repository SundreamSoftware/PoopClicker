import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

export interface DailyPanelProps {
  onOpenDailyDump?: () => void
}

export function DailyPanel({ onOpenDailyDump }: DailyPanelProps) {
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const completed = snap.save.dailyChallenges.filter((c) => c.completed).length
  const claimed = snap.save.dailyChallenges.filter((c) => c.claimed).length
  const dump = snap.save.dailyDumpState
  const dumpStatus =
    dump.rewardClaimed && dump.lastPlayedDate
      ? `Claimed · ${dump.lastTier} (${dump.lastScore} pts)`
      : dump.lastPlayedDate && !dump.rewardClaimed
        ? 'In progress — finish in modal'
        : 'Ready to play'

  return (
    <div className="panel">
      <h2>Daily Challenges</h2>
      <div className="meta-line">
        {completed} / 3 · Streak Day {snap.save.dailyStreak} · Saver {snap.save.streakSaverCharges}
      </div>

      {snap.save.dailyChallenges.map((challenge, index) => {
        const pct = Math.min(100, Math.round((challenge.progress / challenge.target) * 100))
        const status = challenge.claimed
          ? 'CLAIMED'
          : challenge.completed
            ? 'READY TO CLAIM'
            : 'INCOMPLETE'
        return (
          <div
            className="list-row"
            key={`${challenge.templateId}-${index}`}
            style={{ alignItems: 'stretch' }}
          >
            <div style={{ flex: 1 }}>
              <strong>{challenge.name}</strong>
              <div className="meta-line">{challenge.description}</div>
              <div className="progress">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="meta-line">
                {Math.min(challenge.progress, challenge.target)} / {challenge.target} · {status}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <button
                className="primary-btn"
                disabled={!challenge.completed || challenge.claimed}
                onClick={() => engine.claimDailyChallenge(index)}
              >
                {challenge.claimed ? 'Done' : `+${challenge.rewardGtp} GTP`}
              </button>
              <button
                className="ghost-btn"
                disabled={snap.save.dailyRerollsUsed >= 1 || challenge.claimed}
                onClick={async () => {
                  const ad = await ads.showRewarded('daily_reroll')
                  if (ad.ok) engine.rerollDailyChallenge(index, true)
                }}
              >
                Ad Reroll
              </button>
            </div>
          </div>
        )
      })}

      <div className="goal-card" style={{ marginTop: 12 }}>
        <div className="goal-title">DAILY TOILET CHEST</div>
        <div className="goal-sub">{claimed} / 3 claimed</div>
        <button
          className="primary-btn"
          style={{ marginTop: 8 }}
          disabled={
            !snap.save.dailyChallenges.every((c) => c.claimed) || snap.save.dailyChestClaimed
          }
          onClick={() => engine.claimDailyChestReward()}
        >
          {snap.save.dailyChestClaimed ? 'Chest Claimed' : 'Open Chest'}
        </button>
      </div>

      <div className="goal-card" style={{ marginTop: 12 }}>
        <div className="goal-title">DAILY DUMP</div>
        <div className="goal-sub">60s tap trial · {dumpStatus}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            className="primary-btn"
            onClick={() => {
              const result = engine.startDailyDump()
              if (result.ok) onOpenDailyDump?.()
            }}
          >
            Start
          </button>
        </div>
        <div className="meta-line">
          Best {dump.bestScore} · Last tier {dump.lastTier}
          {dump.lastScore > 0 ? ` · ${dump.lastScore} pts` : ''}
        </div>
      </div>
    </div>
  )
}
