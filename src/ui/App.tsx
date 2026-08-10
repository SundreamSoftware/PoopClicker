import { type ReactNode, useEffect, useRef, useState } from 'react'
import { UI_ASSETS } from '../content/assetPaths'
import { formatDuration, formatMultiplier, formatNumber } from '../core/numbers/formatNumber'
import { ECONOMY } from '../core/economy/formulas'
import { canStartDailyDump } from '../core/systems/dailyDump'
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
import { TutorialOverlay } from './tutorial/TutorialOverlay'
import { AchievementsPanel } from './panels/AchievementsPanel'
import { CollectionPanel } from './panels/CollectionPanel'
import { DailyPanel } from './panels/DailyPanel'
import { FlushPanel } from './panels/FlushPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { ShopPanel } from './panels/ShopPanel'
import { WorldStage } from './world/WorldStage'
import { ModalHost } from './overlays/ModalHost'
import './styles.css'

type Tab = 'play' | 'shop' | 'daily' | 'achieve' | 'collection' | 'flush' | 'settings'

function NavIcon({ id }: { id: Exclude<Tab, 'flush' | 'settings'> }) {
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

  const paths: Record<Exclude<Tab, 'flush' | 'settings'>, ReactNode> = {
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dumpModalOpen, setDumpModalOpen] = useState(false)
  const [objectivesExpanded, setObjectivesExpanded] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  const reducedMotion = snap.save.settings.reducedMotion
  const eventActive = Boolean(snap.eventRuntime)
  const face = resolveFaceFromTapState(snap.tapState, { eventActive })
  // Global mystery UI when awaiting a pick off-Play, or anytime awaitingChoice (blocks event pipeline).
  const showMysteryOverlay =
    snap.eventRuntime?.type === 'mystery_flush' &&
    !snap.eventRuntime.rewardClaimed &&
    (snap.eventRuntime.awaitingChoice || tab !== 'play')

  const stateLabel =
    snap.tapState === 'frenzy'
      ? 'POOP FRENZY!'
      : snap.tapState === 'overdrive'
        ? 'MAXIMUM POOPACITY'
        : snap.tapState.toUpperCase()

  const showDumpModal = snap.dailyDump.phase !== 'idle' || dumpModalOpen
  const showFrenzyBanner = snap.tapState === 'frenzy' || snap.tapState === 'overdrive'

  // Escape key handling for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      
      if (settingsOpen) {
        setSettingsOpen(false)
      } else if (showDumpModal && snap.dailyDump.phase === 'idle') {
        setDumpModalOpen(false)
      } else if (flushOpen) {
        setFlushOpen(false)
      } else if (snap.offlineReward && !snap.offlineReward.claimed) {
        engine.claimOffline(false)
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [settingsOpen, showDumpModal, flushOpen, snap.dailyDump.phase, snap.offlineReward, engine])

  // Capacitor back button handling
  useEffect(() => {
    const loadApp = async () => {
      try {
        const { App } = await import('@capacitor/app')
        const listener = await App.addListener('backButton', () => {
          const activeTutorial = 
            !suppressTutorial &&
            ['core', 'generators', 'flush', 'daily', 'collection'].find(
              flag => !snap.save.tutorialFlags[flag]
            )
          
          if (activeTutorial) {
            engine.acknowledgeTutorial(activeTutorial)
          } else if (settingsOpen) {
            setSettingsOpen(false)
          } else if (showDumpModal) {
            if (snap.dailyDump.phase === 'idle') {
              setDumpModalOpen(false)
            } else if (snap.dailyDump.phase === 'finished') {
              const result = engine.claimDailyDumpReward()
              if (result.ok) {
                showToast(`Daily Dump complete! +${result.gtp} GTP`)
              }
              setDumpModalOpen(false)
            } else if (snap.dailyDump.phase === 'countdown' || snap.dailyDump.phase === 'running') {
              engine.abandonDailyDump()
              setDumpModalOpen(false)
            }
          } else if (flushOpen) {
            setFlushOpen(false)
          } else if (snap.offlineReward && !snap.offlineReward.claimed) {
            // Block back on offline reward modal
          } else if (tab !== 'play') {
            setTab('play')
          }
        })
        return () => {
          listener.remove()
        }
      } catch {
        // @capacitor/app not available
      }
    }
    void loadApp()
  }, [settingsOpen, flushOpen, showDumpModal, snap.offlineReward, snap.dailyDump.phase, tab, engine])

  // Toast helper
  const showToast = (message: string) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    setToast(message)
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 3000)
  }

  // Streak claim logic
  const handleStreakClaim = async () => {
    const result = engine.claimStreak()
    if (result.ok) {
      if (snap.save.settings.sfx) AudioManager.play('streak_claim')
      showToast(`Daily streak claimed! +${result.gtp} GTP`)
      await maybePromptNotifications()
    } else if (result.reason === 'already_claimed') {
      showToast('Streak already claimed today')
    } else {
      showToast('Streak claim failed')
    }
  }

  const todayKey = new Date().toISOString().split('T')[0]
  const streakClaimed = snap.save.lastDailyClaim === todayKey

  const prevCanFlush = useRef(snap.canFlush)
  useEffect(() => {
    if (snap.canFlush && !prevCanFlush.current) {
      if (snap.save.settings.sfx) {
        AudioManager.play('flush_ready')
      }
      showToast('Flush ready!')
    }
    prevCanFlush.current = snap.canFlush
  }, [snap.canFlush, snap.save.settings.sfx])

  const onTap = () => {
    const result = engine.tap()
    push(`+${formatNumber(result.gained)}`, result.crit)
    setTapFx({ id: Date.now(), crit: result.crit })
    setSquish(true)
    window.setTimeout(() => setSquish(false), 230)
    if (snap.save.settings.haptics) void tapHaptic(result.crit)
    if (snap.save.settings.sfx) {
      AudioManager.play('tap_fart')
      if (result.crit) AudioManager.play('crit')
    }
  }

  const suppressTutorial = 
    (snap.offlineReward && !snap.offlineReward.claimed) || 
    settingsOpen || 
    showDumpModal

  return (
    <div className={`app-shell ${reducedMotion ? 'reduced' : ''}`}>
      {!suppressTutorial && <TutorialOverlay />}

      {showMysteryOverlay && (
        <EventOverlay
          runtime={snap.eventRuntime}
          rollingCps={snap.rollingCps}
          reducedMotion={reducedMotion}
          onCatchTarget={(id) => engine.catchEventTarget(id)}
          onMysteryPick={(option) => engine.chooseMysteryReward(option)}
          onSkip={() => engine.skipMysteryReward()}
        />
      )}

      <header className="top-bar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden>
            PC
          </div>
          <div>
            <div className="brand">Poop Clicker</div>
            <div className="tempo-line">
              <span>{formatNumber(snap.production.pps)} / SEC</span>
              {showFrenzyBanner && (
                <>
                  <span>CPS {snap.rollingCps.toFixed(1)}</span>
                  <span>COMBO {Math.floor(snap.combo)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="currency-stack">
          <div className="currency-primary">
            <img className="currency-icon" src={UI_ASSETS.currency.pp} alt="" aria-hidden />
            <span className="pp-value">{formatNumber(snap.save.currentPP)}</span>
            <span className="pp-label">PP</span>
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
        <button className="ghost-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </button>
      </header>

      <ModalHost
        open={Boolean(snap.offlineReward && !snap.offlineReward.claimed)}
        onClose={() => undefined}
        title="WHILE YOU WERE GONE"
        layerClass="modal-layer-offline"
        closeOnBackdrop={false}
        dismissible={false}
      >
        {snap.offlineReward && !snap.offlineReward.claimed && (
          <>
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
          </>
        )}
      </ModalHost>

      {snap.save.bathroomBreakCharges > 0 && tab === 'play' && (
        <div className="bathroom-badge" role="status">
          <strong>
            Break ×{snap.save.bathroomBreakCharges}/{ECONOMY.bathroomBreakMaxCharges}
          </strong>
          <button
            className="primary-btn"
            onClick={() => {
              const result = engine.claimBathroomBreak('pp')
              if (result.ok) void maybePromptNotifications()
            }}
          >
            +15m PP
          </button>
          <button
            className="ghost-btn"
            onClick={() => {
              const result = engine.claimBathroomBreak('tap_boost')
              if (result.ok) void maybePromptNotifications()
            }}
          >
            ×2 Tap
          </button>
        </div>
      )}

      {tab === 'play' && (
        <>
          <WorldStage worldId={snap.save.currentWorldId} reducedMotion={reducedMotion}>
            <div className="hero-stage">
              {showFrenzyBanner && <div className="state-banner">{stateLabel}</div>}
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
              {snap.eventRuntime && !showMysteryOverlay && (
                <EventOverlay
                  runtime={snap.eventRuntime}
                  rollingCps={snap.rollingCps}
                  reducedMotion={reducedMotion}
                  onCatchTarget={(id) => engine.catchEventTarget(id)}
                  onMysteryPick={(option) => engine.chooseMysteryReward(option)}
                  onSkip={() => engine.skipMysteryReward()}
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

          <button 
            className="objectives-chip" 
            onClick={() => setObjectivesExpanded(!objectivesExpanded)}
            aria-expanded={objectivesExpanded}
          >
            <strong>OBJECTIVES {objectivesExpanded ? '▼' : '▶'}</strong>
            {objectivesExpanded && (
              <div className="goals-row" style={{ marginTop: 8 }}>
                {snap.nextGoals.slice(0, 3).map((goal) => (
                  <div className="goal-card" key={`${goal.kind}-${goal.title}`}>
                    <div className="goal-title">{goal.title}</div>
                    <div className="goal-sub">{goal.subtitle}</div>
                    <div className="progress">
                      <span style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </button>

          {(() => {
            const open = snap.sessionMissions.missions.filter((m) => !m.claimed)
            if (!open.length) return null
            const claimable = open.filter((m) => m.progress >= m.target)
            const inProgress = open
              .filter((m) => m.progress < m.target)
              .sort((a, b) => b.progress / b.target - a.progress / a.target)[0]
            const claimedCount = snap.sessionMissions.missions.filter((m) => m.claimed).length
            const total = snap.sessionMissions.missions.length
            return (
              <div className="session-missions-strip">
                <div className="missions-chip">
                  Missions {claimedCount}/{total}
                  {claimable.length > 0
                    ? ` · ${claimable.length} ready`
                    : inProgress
                      ? ` · ${inProgress.title} ${inProgress.progress}/${inProgress.target}`
                      : ''}
                </div>
                {claimable.map((mission) => (
                  <div key={mission.id} className="mission-card">
                    <div>
                      <strong>{mission.title}</strong>
                      <div className="meta-line">
                        {mission.progress}/{mission.target}
                      </div>
                    </div>
                    <button
                      className="ghost-btn"
                      onClick={() => {
                        const result = engine.claimSessionMission(mission.id)
                        if (result.ok) showToast(`+${result.gtp} GTP`)
                      }}
                    >
                      Claim
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}

          <div className="play-actions">
            <button
              className={`primary-btn ${snap.canFlush ? 'flush-ready-pulse' : ''}`}
              onClick={() => setFlushOpen(true)}
            >
              {snap.canFlush
                ? 'FLUSH'
                : `Flush ${Math.min(100, Math.round((snap.flushPreview.runPPEarned.toNumber() / ECONOMY.firstFlushRequirement) * 100))}%`}
            </button>
            {(() => {
              const claimableChallenges = snap.save.dailyChallenges.filter(
                (c) => c.completed && !c.claimed,
              ).length
              const streakReady = !streakClaimed
              const dumpReady = canStartDailyDump(snap.save, Date.now())
              const claimableCount =
                claimableChallenges + (streakReady ? 1 : 0) + (dumpReady ? 1 : 0)
              if (claimableCount > 0) {
                return (
                  <button className="ghost-btn" onClick={() => setTab('daily')}>
                    Daily · {claimableCount} ready
                  </button>
                )
              }
              return (
                <button
                  className="ghost-btn"
                  onClick={handleStreakClaim}
                  disabled={streakClaimed}
                >
                  {streakClaimed ? 'Claimed' : `Streak Day ${snap.save.dailyStreak || 0}`}
                </button>
              )
            })()}
          </div>
        </>
      )}

      {tab === 'shop' && <ShopPanel />}
      {tab === 'daily' && (
        <DailyPanel onOpenDailyDump={() => setDumpModalOpen(true)} onToast={showToast} />
      )}
      {tab === 'achieve' && <AchievementsPanel />}
      {tab === 'collection' && <CollectionPanel />}
      
      {flushOpen && (
        <div className="modal-backdrop modal-layer-sheet" role="dialog" aria-modal="true">
          <FlushPanel
            canFlush={snap.canFlush}
            onClose={() => {
              setFlushOpen(false)
            }}
          />
        </div>
      )}
      
      <ModalHost
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        layerClass="modal-layer-settings"
      >
        <SettingsPanel />
      </ModalHost>

      {showDumpModal && (
        <DailyDumpModal
          runtime={snap.dailyDump}
          onStart={() => {
            const result = engine.startDailyDump()
            if (result.ok) setDumpModalOpen(true)
          }}
          onTap={() => {
            engine.tapDailyDumpChallenge()
            if (snap.save.settings.sfx) AudioManager.play('tap_fart')
          }}
          onClaim={() => {
            const result = engine.claimDailyDumpReward()
            if (result.ok) {
              showToast(`Daily Dump complete! +${result.gtp} GTP`)
              setDumpModalOpen(false)
            }
          }}
          onClose={() => {
            if (snap.dailyDump.phase === 'idle') setDumpModalOpen(false)
            else if (snap.dailyDump.phase === 'finished') {
              const result = engine.claimDailyDumpReward()
              if (result.ok) {
                showToast(`Daily Dump complete! +${result.gtp} GTP`)
              }
              setDumpModalOpen(false)
            }
          }}
          onAbandon={() => {
            engine.abandonDailyDump()
            setDumpModalOpen(false)
          }}
          onToast={showToast}
          weeklyBestScore={snap.save.dailyDumpState.weeklyBestScore}
        />
      )}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}

      <nav className="nav-dock" aria-label="Main">
        {(
          [
            ['play', 'Play'],
            ['shop', 'Shop'],
            ['daily', 'Daily'],
            ['achieve', 'Awards'],
            ['collection', 'Collection'],
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
