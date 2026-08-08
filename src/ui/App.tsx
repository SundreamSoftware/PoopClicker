import { useState } from 'react'
import { formatDuration, formatMultiplier, formatNumber } from '../core/numbers/formatNumber'
import { ECONOMY } from '../core/economy/formulas'
import { tapHaptic } from '../native/haptics'
import { GameProvider } from '../state/GameContext'
import { useAudioSync } from '../state/useAudioSync'
import { useFloatingNumbers } from '../state/useFloatingNumbers'
import { useGameContext } from '../state/useGameContext'
import { useGameLoop } from '../state/useGameLoop'
import { useGameSnapshot } from '../state/useGameSnapshot'
import AudioManager from '../audio/AudioManager'
import { maybePromptNotifications } from './notificationPrompt'
import { PoopCharacter, resolveFaceFromTapState } from './character/PoopCharacter'
import { DailyDumpModal } from './daily/DailyDumpModal'
import { EventOverlay } from './events/EventOverlay'
import { AchievementsPanel } from './panels/AchievementsPanel'
import { CollectionPanel } from './panels/CollectionPanel'
import { DailyPanel } from './panels/DailyPanel'
import { FlushPanel } from './panels/FlushPanel'
import { ShopPanel } from './panels/ShopPanel'
import { WorldStage } from './world/WorldStage'
import './styles.css'

type Tab = 'play' | 'shop' | 'daily' | 'achieve' | 'collection' | 'flush'

function GameScreen() {
  useGameLoop()
  useAudioSync()
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const { items, push } = useFloatingNumbers()
  const [tab, setTab] = useState<Tab>('play')
  const [squish, setSquish] = useState(false)
  const [flushOpen, setFlushOpen] = useState(false)
  const [dumpModalOpen, setDumpModalOpen] = useState(false)

  const reducedMotion = snap.save.settings.reducedMotion
  const eventActive = Boolean(snap.eventRuntime)
  const face = resolveFaceFromTapState(snap.tapState, { eventActive })

  const stateLabel =
    snap.tapState === 'frenzy'
      ? 'POOP FRENZY!'
      : snap.tapState === 'overdrive'
        ? 'MAXIMUM POOPACITY'
        : snap.tapState.toUpperCase()

  const showDumpModal = snap.dailyDump.phase !== 'idle' || dumpModalOpen

  const onTap = () => {
    const result = engine.tap()
    push(`+${formatNumber(result.gained)}`, result.crit)
    setSquish(true)
    window.setTimeout(() => setSquish(false), 80)
    if (snap.save.settings.haptics) void tapHaptic(result.crit)
    if (snap.save.settings.sfx) {
      AudioManager.play(result.crit ? 'crit' : 'tap_plop')
    }
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div>
          <div className="brand">Poop Clicker</div>
          <div className="meta-line">
            {formatNumber(snap.production.pps)}/s · CPS {snap.rollingCps.toFixed(1)} · Combo{' '}
            {Math.floor(snap.combo)}
          </div>
        </div>
        <div className="currency-stack">
          <div className="pp-value">{formatNumber(snap.save.currentPP)} PP</div>
          <div className="meta-line">
            {snap.save.gtp} GTP · FP {snap.save.flushPower} ·{' '}
            {formatMultiplier(snap.production.globalMultiplier)}
          </div>
        </div>
      </div>

      {snap.offlineReward && !snap.offlineReward.claimed && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>WHILE YOU WERE GONE</h2>
            <p>Away: {formatDuration(snap.offlineReward.awayMs)}</p>
            <p>Earned: {formatNumber(snap.offlineReward.earned)} PP</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="primary-btn" onClick={() => engine.claimOffline(false)}>
                CLAIM
              </button>
              <button
                className="ghost-btn"
                onClick={async () => {
                  const ad = await ads.showRewarded('double_offline')
                  if (ad.ok) engine.claimOffline(true)
                  else engine.claimOffline(false)
                }}
              >
                WATCH AD → DOUBLE
              </button>
            </div>
          </div>
        </div>
      )}

      {snap.save.bathroomBreakCharges > 0 && tab === 'play' && (
        <div className="event-banner">
          <strong>BATHROOM BREAK READY</strong>
          <div className="meta-line" style={{ color: '#ddd' }}>
            Charges: {snap.save.bathroomBreakCharges}/{ECONOMY.bathroomBreakMaxCharges}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="primary-btn"
              onClick={async () => {
                const result = engine.claimBathroomBreak('pp')
                if (result.ok) void maybePromptNotifications()
              }}
            >
              +15 min PP
            </button>
            <button
              className="ghost-btn"
              onClick={async () => {
                const result = engine.claimBathroomBreak('tap_boost')
                if (result.ok) void maybePromptNotifications()
              }}
            >
              x2 Tap 10m
            </button>
          </div>
        </div>
      )}

      {tab === 'play' && (
        <>
          <WorldStage worldId={snap.save.currentWorldId} reducedMotion={reducedMotion}>
            <div className="hero-stage">
              {(snap.tapState === 'frenzy' || snap.tapState === 'overdrive') && (
                <div className="state-banner">{stateLabel}</div>
              )}
              <PoopCharacter
                skinId={snap.save.equippedSkinId}
                tapState={snap.tapState}
                face={face}
                squish={squish}
                reducedMotion={reducedMotion}
                onPointerDown={onTap}
              />
              {snap.eventRuntime && (
                <EventOverlay
                  runtime={snap.eventRuntime}
                  rollingCps={snap.rollingCps}
                  reducedMotion={reducedMotion}
                  onCatchTarget={(id) => engine.catchEventTarget(id)}
                  onMysteryPick={(option) => engine.chooseMysteryReward(option)}
                />
              )}
              <div className="float-layer">
                {items.map((item) => (
                  <div key={item.id} className={`float-num ${item.crit ? 'crit' : ''}`}>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </WorldStage>

          {snap.nextGoals.map((goal) => (
            <div className="goal-card" key={`${goal.kind}-${goal.title}`}>
              <div className="goal-title">{goal.title}</div>
              <div className="goal-sub">{goal.subtitle}</div>
              <div className="progress">
                <span style={{ width: `${Math.round(goal.progress * 100)}%` }} />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              className="primary-btn"
              onClick={() => setFlushOpen(true)}
              disabled={!snap.canFlush}
            >
              {snap.canFlush ? 'FLUSH' : 'Flush locked'}
            </button>
            <button
              className="ghost-btn"
              onClick={async () => {
                const result = engine.claimStreak()
                if (result.ok) void maybePromptNotifications()
              }}
            >
              Streak Day {snap.save.dailyStreak || 0}
            </button>
          </div>
        </>
      )}

      {tab === 'shop' && <ShopPanel />}
      {tab === 'daily' && <DailyPanel onOpenDailyDump={() => setDumpModalOpen(true)} />}
      {tab === 'achieve' && <AchievementsPanel />}
      {tab === 'collection' && <CollectionPanel />}
      {(tab === 'flush' || flushOpen) && (
        <FlushPanel
          onClose={() => {
            setFlushOpen(false)
            setTab('play')
          }}
        />
      )}

      {showDumpModal && (
        <DailyDumpModal
          runtime={snap.dailyDump}
          onStart={() => {
            const result = engine.startDailyDump()
            if (result.ok) setDumpModalOpen(true)
          }}
          onTap={() => engine.tapDailyDumpChallenge()}
          onClaim={() => engine.claimDailyDumpReward()}
          onClose={() => {
            if (snap.dailyDump.phase === 'idle') setDumpModalOpen(false)
          }}
        />
      )}

      <nav className="nav-dock" aria-label="Main">
        {(
          [
            ['play', 'Play'],
            ['shop', 'Shop'],
            ['daily', 'Daily'],
            ['achieve', 'Badges'],
            ['collection', 'Dex'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <GameScreen />
    </GameProvider>
  )
}
