import { type ReactNode, useState } from 'react'
import { UI_ASSETS } from '../content/assetPaths'
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
import { SpriteSheetPlayer } from './assets/SpriteSheetPlayer'
import { DailyDumpModal } from './daily/DailyDumpModal'
import { ErrorBoundary } from './ErrorBoundary'
import { EventOverlay } from './events/EventOverlay'
import { AchievementsPanel } from './panels/AchievementsPanel'
import { CollectionPanel } from './panels/CollectionPanel'
import { DailyPanel } from './panels/DailyPanel'
import { FlushPanel } from './panels/FlushPanel'
import { ShopPanel } from './panels/ShopPanel'
import { WorldStage } from './world/WorldStage'
import './styles.css'

type Tab = 'play' | 'shop' | 'daily' | 'achieve' | 'collection' | 'flush'

function NavIcon({ id }: { id: Exclude<Tab, 'flush'> }) {
  const authored =
    id === 'play'
      ? UI_ASSETS.nav.play
      : id === 'shop'
        ? UI_ASSETS.nav.shop
        : id === 'collection'
          ? UI_ASSETS.nav.collection
          : null
  if (authored) {
    return <img className="nav-icon nav-icon-authored" src={authored} alt="" aria-hidden />
  }

  const paths: Record<Exclude<Tab, 'flush'>, ReactNode> = {
    play: (
      <path d="M8 4.5c2-3 8-1 6 2.5 3-.5 5 4 2 5.5 2 4-1 7-5.5 7S3 17 4.5 13C1 11 3 6.5 6 7c-.5-1 .2-2 2-2.5Z" />
    ),
    shop: <path d="M4 7h16l-1.5 11h-13L4 7Zm3-3h10l2 3H5l2-3Zm1 7h8M9 21h.01M16 21h.01" />,
    daily: <path d="M5 5h14v15H5V5Zm3-3v5m8-5v5M5 10h14m-10 4h2m2 0h2m-6 3h2m2 0h2" />,
    achieve: (
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3Z" />
    ),
    collection: <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm3 0v16m3-12h5m-5 4h5" />,
  }
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden>
      {paths[id]}
    </svg>
  )
}

function GameScreen() {
  useGameLoop()
  useAudioSync()
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const { items, push } = useFloatingNumbers()
  const [tab, setTab] = useState<Tab>('play')
  const [squish, setSquish] = useState(false)
  const [tapFx, setTapFx] = useState<{ id: number; crit: boolean } | null>(null)
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
    setTapFx({ id: Date.now(), crit: result.crit })
    setSquish(true)
    window.setTimeout(() => setSquish(false), 230)
    if (snap.save.settings.haptics) void tapHaptic(result.crit)
    if (snap.save.settings.sfx) {
      AudioManager.play(result.crit ? 'crit' : 'tap_plop')
    }
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden>
            PC
          </div>
          <div>
            <div className="brand">Poop Clicker</div>
            <div className="tempo-line">
              <span>{formatNumber(snap.production.pps)} / SEC</span>
              <span>CPS {snap.rollingCps.toFixed(1)}</span>
              <span>COMBO {Math.floor(snap.combo)}</span>
            </div>
          </div>
        </div>
        <div className="currency-stack">
          <div className="currency-primary">
            <img className="currency-icon" src={UI_ASSETS.currency.pp} alt="" aria-hidden />
            <span className="pp-value">{formatNumber(snap.save.currentPP)}</span>
          </div>
          <div className="currency-meta">
            <span>
              <img src={UI_ASSETS.currency.gtp} alt="" aria-hidden />
              {snap.save.gtp} GTP
            </span>
            <span>
              <img src={UI_ASSETS.currency.flushPower} alt="" aria-hidden />
              {snap.save.flushPower} FP
            </span>
            <span>{formatMultiplier(snap.production.globalMultiplier)}</span>
          </div>
        </div>
      </header>

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
              {tapFx && (
                <div className="authored-tap-vfx" key={tapFx.id}>
                  <SpriteSheetPlayer
                    name={tapFx.crit ? 'crit_burst' : 'tap_burst'}
                    reducedMotion={reducedMotion}
                  />
                </div>
              )}
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

          <div className="goals-row">
            {snap.nextGoals.map((goal) => (
              <div className="goal-card" key={`${goal.kind}-${goal.title}`}>
                <div className="goal-title">{goal.title}</div>
                <div className="goal-sub">{goal.subtitle}</div>
                <div className="progress">
                  <span style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="play-actions">
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
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <NavIcon id={id} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </ErrorBoundary>
  )
}
