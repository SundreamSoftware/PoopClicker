import {
  type PointerEventHandler,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FLUSH_ANIM, UI_ASSETS, flushAnimFrameUrls } from '../content/assetPaths'
import { formatDuration, formatNumber } from '../core/numbers/formatNumber'
import { ECONOMY } from '../core/economy/formulas'
import { canStartDailyDump } from '../core/systems/dailyDump'
import { toUtcDateKey } from '../core/time/TimeService'
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
import { FrameSequencePlayer } from './assets/FrameSequencePlayer'
import { confirmAbandonDailyDump, DailyDumpModal } from './daily/DailyDumpModal'
import { ErrorBoundary } from './ErrorBoundary'
import { EventOverlay } from './events/EventOverlay'
import { TutorialOverlay } from './tutorial/TutorialOverlay'
import { AchievementsPanel } from './panels/AchievementsPanel'
import { CollectionPanel } from './panels/CollectionPanel'
import { DailyPanel } from './panels/DailyPanel'
import { FlushPanel } from './panels/FlushPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { ShopPanel } from './panels/ShopPanel'
import { ContextualHud } from './hud/ContextualHud'
import { BoostsList } from './shop/shopBits'
import { QuickShopSheet } from './shop/QuickShopSheet'
import { WorldStage } from './world/WorldStage'
import { decideAndroidBack } from './androidBack'
import { ModalHost } from './overlays/ModalHost'
import './styles.css'

type Tab = 'play' | 'shop' | 'daily' | 'achieve' | 'collection' | 'settings' | 'flush'

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
    settings: (
      <>
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),
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
  const [flushOpen, setFlushOpen] = useState(false)
  const [quickShopOpen, setQuickShopOpen] = useState(false)
  const [boostsOpen, setBoostsOpen] = useState(false)
  const [flushAnimating, setFlushAnimating] = useState(false)
  const [dumpModalOpen, setDumpModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const flushAnimTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!flushOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [flushOpen])

  const reducedMotion = snap.save.settings.reducedMotion
  const eventActive = Boolean(snap.eventRuntime)
  const face = resolveFaceFromTapState(snap.tapState, { eventActive })

  const flushFrames = useMemo(() => flushAnimFrameUrls(), [])
  const playFlushAnimation = () => {
    setTab('play')
    setFlushOpen(false)
    setFlushAnimating(true)
    if (flushAnimTimeoutRef.current !== null) {
      window.clearTimeout(flushAnimTimeoutRef.current)
    }
    const duration = reducedMotion ? 400 : FLUSH_ANIM.durationMs + 150
    flushAnimTimeoutRef.current = window.setTimeout(() => {
      setFlushAnimating(false)
      flushAnimTimeoutRef.current = null
    }, duration)
  }
  const showDumpModal = snap.dailyDump.phase !== 'idle' || dumpModalOpen
  const suppressTutorial = (snap.offlineReward && !snap.offlineReward.claimed) || showDumpModal

  const applyAndroidBackRef = useRef(() => undefined as void)
  applyAndroidBackRef.current = () => {
    const pendingTutorialFlag = !suppressTutorial
      ? ['core', 'generators', 'flush', 'daily', 'collection'].find(
          (flag) => !snap.save.tutorialFlags[flag],
        )
      : undefined
    const action = decideAndroidBack({
      pendingTutorialFlag,
      dumpOpen: showDumpModal,
      dumpPhase: snap.dailyDump.phase,
      flushOpen,
      playSheetOpen: quickShopOpen || boostsOpen,
      offlineUnclaimed: Boolean(snap.offlineReward && !snap.offlineReward.claimed),
      tab,
    })
    if (action.type === 'ack_tutorial') {
      engine.acknowledgeTutorial(action.flag)
      return
    }
    if (action.type === 'close_dump') {
      setDumpModalOpen(false)
      return
    }
    if (action.type === 'claim_dump') {
      const result = engine.claimDailyDumpReward()
      if (result.ok) showToast(`Daily Dump complete! +${result.gtp} GTP`)
      setDumpModalOpen(false)
      return
    }
    if (action.type === 'confirm_abandon_dump') {
      if (!confirmAbandonDailyDump()) return
      engine.abandonDailyDump()
      setDumpModalOpen(false)
      return
    }
    if (action.type === 'close_flush') {
      setFlushOpen(false)
      return
    }
    if (action.type === 'close_play_sheet') {
      setQuickShopOpen(false)
      setBoostsOpen(false)
      return
    }
    if (action.type === 'go_play') setTab('play')
  }

  // Escape key handling for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      if (showDumpModal && snap.dailyDump.phase === 'idle') {
        setDumpModalOpen(false)
      } else if (flushOpen) {
        setFlushOpen(false)
      } else if (quickShopOpen || boostsOpen) {
        setQuickShopOpen(false)
        setBoostsOpen(false)
      } else if (snap.offlineReward && !snap.offlineReward.claimed) {
        engine.claimOffline(false)
      } else if (tab !== 'play') {
        setTab('play')
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [
    showDumpModal,
    flushOpen,
    quickShopOpen,
    boostsOpen,
    snap.dailyDump.phase,
    snap.offlineReward,
    engine,
    tab,
  ])

  useEffect(() => {
    let cancelled = false
    let handle: { remove: () => void | Promise<void> } | null = null
    void import('@capacitor/app')
      .then(({ App }) => {
        if (cancelled) return undefined
        return App.addListener('backButton', () => applyAndroidBackRef.current())
      })
      .then((listener) => {
        if (!listener) return
        if (cancelled) {
          void listener.remove()
          return
        }
        handle = listener
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [])

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

  useEffect(() => {
    if (flushOpen) engine.trackUi('prestige_viewed', {})
  }, [flushOpen, engine])

  const todayKey = toUtcDateKey(Date.now())
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

  const onTap: PointerEventHandler<HTMLButtonElement> = (event) => {
    const result = engine.tap()
    push(`+${formatNumber(result.gained)}`, result.crit)
    setSquish(true)
    window.setTimeout(() => setSquish(false), 230)
    if (snap.save.settings.haptics) void tapHaptic(result.crit)
    if (snap.save.settings.sfx) {
      AudioManager.play('tap_fart')
      if (result.crit) AudioManager.play('crit')
    }
    event.currentTarget.blur()
  }

  return (
    <div className={`app-shell ${reducedMotion ? 'reduced' : ''}`}>
      {!suppressTutorial && <TutorialOverlay onGoToShop={() => setTab('shop')} />}

      <ContextualHud
        context={
          flushOpen ? 'prestige' : tab === 'shop' ? 'shop' : tab === 'play' ? 'play' : 'other'
        }
        onFlushProgressClick={() => setFlushOpen(true)}
      />

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

      {tab === 'play' && (
        <>
          <WorldStage worldId={snap.save.currentWorldId} reducedMotion={reducedMotion}>
            <div className="hero-stage">
              <PoopCharacter
                skinId={snap.save.equippedSkinId}
                tapState={flushAnimating ? 'idle' : snap.tapState}
                face={flushAnimating ? 'normal' : face}
                rollingCps={flushAnimating ? 0 : snap.instantCps}
                squish={squish}
                flushing={flushAnimating}
                reducedMotion={reducedMotion}
                onPointerDown={flushAnimating ? undefined : onTap}
              />
              {flushAnimating && (
                <div className="flush-vfx-layer" aria-hidden>
                  <FrameSequencePlayer
                    className="flush-frame-sequence"
                    frames={flushFrames}
                    durationMs={FLUSH_ANIM.durationMs}
                    reducedMotion={reducedMotion}
                  />
                </div>
              )}
              {snap.eventRuntime && !flushAnimating && (
                <EventOverlay
                  runtime={snap.eventRuntime}
                  rollingCps={snap.rollingCps}
                  reducedMotion={reducedMotion}
                  onCatchTarget={(id) => engine.catchEventTarget(id)}
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

          {snap.nextGoals[0] && (
            <div className="goal-card play-next-goal" aria-label="Next objective">
              <div className="goal-title">{snap.nextGoals[0].title}</div>
              <div className="goal-sub">{snap.nextGoals[0].subtitle}</div>
              <div className="progress" aria-hidden>
                <span style={{ width: `${Math.round(snap.nextGoals[0].progress * 100)}%` }} />
              </div>
            </div>
          )}

          <div className="play-actions play-actions-wide">
            <button
              className="ghost-btn"
              onClick={() => {
                setQuickShopOpen(true)
                engine.trackUi('quick_shop_opened', {})
              }}
            >
              UPGRADE ↑
            </button>
            <button className="ghost-btn" onClick={() => setBoostsOpen(true)}>
              BOOSTS
            </button>
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
                    Missions · {claimableCount} ready
                  </button>
                )
              }
              return (
                <button className="ghost-btn" onClick={handleStreakClaim} disabled={streakClaimed}>
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
      {tab === 'settings' && <SettingsPanel />}

      <ModalHost
        open={flushOpen}
        onClose={() => setFlushOpen(false)}
        ariaLabel="Flush & Royal Flush"
        hideChrome
        closeOnBackdrop={false}
        layerClass="modal-layer-sheet"
        panelClassName="modal-sheet"
      >
        <FlushPanel
          canFlush={snap.canFlush}
          onClose={() => {
            setFlushOpen(false)
          }}
          onFlushed={playFlushAnimation}
        />
      </ModalHost>

      <ModalHost
        open={quickShopOpen}
        onClose={() => setQuickShopOpen(false)}
        title="Quick Shop"
        ariaLabel="Quick Shop"
        layerClass="modal-layer-sheet"
        panelClassName="modal-sheet"
      >
        <QuickShopSheet
          onFullShop={() => {
            setQuickShopOpen(false)
            setTab('shop')
          }}
        />
      </ModalHost>

      <ModalHost
        open={boostsOpen}
        onClose={() => setBoostsOpen(false)}
        title="Boosts"
        ariaLabel="Play boosts"
        layerClass="modal-layer-sheet"
        panelClassName="modal-sheet"
      >
        <BoostsList
          heading={<p className="meta-line">Rewarded boosts stay in the gameplay loop.</p>}
        />
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
            if (snap.save.settings.haptics) void tapHaptic(false)
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

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <nav className="nav-dock" aria-label="Main">
        {(
          [
            ['play', 'Play'],
            ['shop', 'Shop'],
            ['daily', 'Missions'],
            ['achieve', 'Awards'],
            ['collection', 'Collection'],
            ['settings', 'Settings'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
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
