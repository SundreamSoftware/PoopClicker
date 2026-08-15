import { canStartDailyDump, utcWeekKey } from '../../core/systems/dailyDump'
import { SESSION_MISSION_DAILY_GTP_CAP } from '../../core/systems/sessionMissions'
import {
  estimateWeeklyLeagueStanding,
  weeklyLeagueShareText,
} from '../../core/systems/weeklyLeague'
import { toUtcDateKey } from '../../core/time/TimeService'
import AudioManager from '../../audio/AudioManager'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { maybePromptNotifications } from '../notificationPrompt'

export interface DailyPanelProps {
  onOpenDailyDump?: () => void
  onToast?: (message: string) => void
}

export function DailyPanel({ onOpenDailyDump, onToast }: DailyPanelProps) {
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const completed = snap.save.dailyChallenges.filter((c) => c.completed).length
  const claimed = snap.save.dailyChallenges.filter((c) => c.claimed).length
  const dump = snap.save.dailyDumpState
  const weekKey = dump.weeklyBestWeekKey ?? utcWeekKey(Date.now())
  const league = estimateWeeklyLeagueStanding(dump.weeklyBestScore, weekKey)
  const dumpStatus =
    dump.rewardClaimed && dump.lastPlayedDate
      ? `Claimed · ${dump.lastTier} (${dump.lastScore} pts)`
      : dump.lastPlayedDate && !dump.rewardClaimed
        ? 'In progress — finish in modal'
        : 'Ready to play'
  const canStart = canStartDailyDump(snap.save, Date.now())

  const shareLeague = async () => {
    const text = weeklyLeagueShareText(league)
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // cancelled
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        onToast?.('Grade card copied!')
      } catch {
        onToast?.('Could not share grade card')
      }
    }
  }

  const streakClaimed = snap.save.lastDailyClaim === toUtcDateKey(Date.now())
  const nextStreakDay = !snap.save.lastDailyClaim
    ? 1
    : snap.save.dailyStreak >= 7
      ? 1
      : snap.save.dailyStreak + 1
  const claimStreak = async () => {
    const result = engine.claimStreak()
    if (result.ok) {
      if (snap.save.settings.sfx) AudioManager.play('streak_claim')
      onToast?.(`Daily streak claimed! +${result.gtp} GTP`)
      await maybePromptNotifications()
    } else if (result.reason === 'already_claimed') {
      onToast?.('Streak already claimed today')
    } else {
      onToast?.('Streak claim failed')
    }
  }

  const missions = snap.sessionMissions.missions
  const claimedMissions = missions.filter((m) => m.claimed).length
  const remainingMissionGtp = Math.max(
    0,
    SESSION_MISSION_DAILY_GTP_CAP - snap.sessionMissions.dailyClaimedGtp,
  )

  return (
    <div className="panel">
      <h2>Daily Challenges</h2>
      <div className="meta-line">
        {completed} / 3 · Streak Day {snap.save.dailyStreak} · Saver {snap.save.streakSaverCharges}
      </div>

      <div className="goal-card" style={{ marginTop: 12 }}>
        <div className="goal-title">DAILY STREAK</div>
        <div className="goal-sub">
          Day {Math.max(1, snap.save.dailyStreak || 1)} · Saver {snap.save.streakSaverCharges}
        </div>
        <button
          className="primary-btn"
          style={{ marginTop: 8 }}
          disabled={streakClaimed}
          onClick={() => void claimStreak()}
        >
          {streakClaimed ? 'Claimed today' : `Claim Day ${nextStreakDay}`}
        </button>
      </div>

      <div className="goal-card session-missions-panel" style={{ marginTop: 12 }}>
        <div className="goal-title">SESSION MISSIONS</div>
        <div className="goal-sub">
          {claimedMissions} / {missions.length} claimed · {remainingMissionGtp} /{' '}
          {SESSION_MISSION_DAILY_GTP_CAP} GTP left today
        </div>
        {missions.length === 0 ? (
          <div className="meta-line" style={{ marginTop: 6 }}>
            Keep tapping — missions refresh each session.
          </div>
        ) : (
          <div className="session-missions-list" style={{ marginTop: 8 }}>
            {missions.map((mission) => {
              const ready = !mission.claimed && mission.progress >= mission.target
              const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100))
              return (
                <div className="list-row" key={mission.id} style={{ alignItems: 'stretch' }}>
                  <div style={{ flex: 1 }}>
                    <strong>{mission.title}</strong>
                    <div className="progress">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <div className="meta-line">
                      {Math.min(mission.progress, mission.target)} / {mission.target}
                      {mission.claimed ? ' · CLAIMED' : ready ? ' · READY' : ''}
                    </div>
                  </div>
                  <button
                    className="primary-btn"
                    disabled={!ready}
                    onClick={() => {
                      const result = engine.claimSessionMission(mission.id)
                      if (result.ok) onToast?.(`+${result.gtp} GTP`)
                      else if (result.reason === 'daily_cap') {
                        onToast?.('Daily mission GTP cap reached')
                      }
                    }}
                  >
                    {mission.claimed ? 'Done' : ready ? `+${mission.reward} GTP` : 'In progress'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {snap.nextGoals.length > 0 && (
        <div className="objectives-list" aria-label="Next objectives">
          <div className="goal-title" style={{ marginBottom: 8 }}>
            NEXT OBJECTIVES
          </div>
          <ul className="objectives-list-items">
            {snap.nextGoals.slice(0, 3).map((goal) => (
              <li key={`${goal.kind}-${goal.title}`} className="objectives-list-item">
                <div>
                  <strong>{goal.title}</strong>
                  <div className="meta-line">{goal.subtitle}</div>
                </div>
                <div className="progress" aria-hidden>
                  <span style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
            disabled={!canStart}
            onClick={() => {
              if (canStart) {
                onOpenDailyDump?.()
              }
            }}
          >
            {canStart ? 'Start' : 'Already Played'}
          </button>
        </div>
        <div className="meta-line">
          Best {dump.bestScore} · Last tier {dump.lastTier}
          {dump.lastScore > 0 ? ` · ${dump.lastScore} pts` : ''}
        </div>
      </div>

      <div className="goal-card weekly-league-card" style={{ marginTop: 12 }}>
        <div className="goal-title">LOCAL WEEKLY GRADE</div>
        <div className="goal-sub">{weekKey} · your score, not a live ranking</div>
        {dump.weeklyBestScore > 0 ? (
          <>
            <div className="meta-line" style={{ marginTop: 6 }}>
              Week best {league.score} · {league.label}
            </div>
            <div className="progress" style={{ marginTop: 8 }}>
              <span style={{ width: `${league.percentile}%` }} />
            </div>
          </>
        ) : (
          <div className="meta-line" style={{ marginTop: 6 }}>
            Play Daily Dump this week to earn a local grade.
          </div>
        )}
        <button
          className="ghost-btn"
          style={{ marginTop: 8 }}
          disabled={dump.weeklyBestScore <= 0}
          onClick={() => void shareLeague()}
        >
          Share grade
        </button>
      </div>
    </div>
  )
}
