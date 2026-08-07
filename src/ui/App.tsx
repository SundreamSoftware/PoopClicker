import { useMemo, useState } from 'react'
import { ASSET_MANIFEST } from '../content/assetManifest'
import { formatDuration, formatMultiplier, formatNumber } from '../core/numbers/formatNumber'
import { ECONOMY } from '../core/economy/formulas'
import { GameProvider } from '../state/GameContext'
import { useFloatingNumbers } from '../state/useFloatingNumbers'
import { useGameContext } from '../state/useGameContext'
import { useGameLoop } from '../state/useGameLoop'
import { useGameSnapshot } from '../state/useGameSnapshot'
import { AchievementsPanel } from './panels/AchievementsPanel'
import { CollectionPanel } from './panels/CollectionPanel'
import { DailyPanel } from './panels/DailyPanel'
import { FlushPanel } from './panels/FlushPanel'
import { ShopPanel } from './panels/ShopPanel'
import './styles.css'

type Tab = 'play' | 'shop' | 'daily' | 'achieve' | 'collection' | 'flush'

function GameScreen() {
  useGameLoop()
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const { items, push } = useFloatingNumbers()
  const [tab, setTab] = useState<Tab>('play')
  const [squish, setSquish] = useState(false)
  const [flushOpen, setFlushOpen] = useState(false)

  const skinColor = useMemo(() => {
    const entry =
      ASSET_MANIFEST.skins[snap.save.equippedSkinId as keyof typeof ASSET_MANIFEST.skins]
    return entry?.color ?? '#8B5A2B'
  }, [snap.save.equippedSkinId])

  const stateLabel =
    snap.tapState === 'frenzy'
      ? 'POOP FRENZY!'
      : snap.tapState === 'overdrive'
        ? 'MAXIMUM POOPACITY'
        : snap.tapState.toUpperCase()

  const onTap = () => {
    const result = engine.tap()
    push(`+${formatNumber(result.gained)}`, result.crit)
    setSquish(true)
    window.setTimeout(() => setSquish(false), 80)
    if (snap.save.settings.haptics && 'vibrate' in navigator) {
      navigator.vibrate(result.crit ? 20 : 8)
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
            <button className="primary-btn" onClick={() => engine.claimBathroomBreak('pp')}>
              +15 min PP
            </button>
            <button className="ghost-btn" onClick={() => engine.claimBathroomBreak('tap_boost')}>
              x2 Tap 10m
            </button>
          </div>
        </div>
      )}

      {snap.save.activeEvent && (
        <div className="event-banner">
          <strong>{snap.save.activeEvent.type.replaceAll('_', ' ').toUpperCase()}</strong>
          <div>
            {snap.save.activeEvent.tapTarget > 0
              ? `${snap.save.activeEvent.taps}/${snap.save.activeEvent.tapTarget}`
              : 'Event active!'}
          </div>
          {(snap.save.activeEvent.type === 'golden_poop' ||
            snap.save.activeEvent.type === 'golden_rain') && (
            <button
              className="primary-btn"
              style={{ marginTop: 8 }}
              onClick={() => engine.catchGoldenPoop()}
            >
              CATCH
            </button>
          )}
          {snap.save.activeEvent.type === 'mystery_flush' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="ghost-btn" onClick={() => engine.chooseMysteryReward(0)}>
                PP
              </button>
              <button className="ghost-btn" onClick={() => engine.chooseMysteryReward(1)}>
                GTP
              </button>
              <button className="ghost-btn" onClick={() => engine.chooseMysteryReward(2)}>
                Boost
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'play' && (
        <>
          <div className="hero-stage">
            {(snap.tapState === 'frenzy' || snap.tapState === 'overdrive') && (
              <div className="state-banner">{stateLabel}</div>
            )}
            <button
              className={`character state-${snap.tapState} ${squish ? 'squish' : ''}`}
              style={{ ['--character' as string]: skinColor }}
              onPointerDown={onTap}
              aria-label="Tap the poop"
            >
              <span className="smile" />
            </button>
            <div className="float-layer">
              {items.map((item) => (
                <div key={item.id} className={`float-num ${item.crit ? 'crit' : ''}`}>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

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
            <button className="ghost-btn" onClick={() => engine.claimStreak()}>
              Streak Day {snap.save.dailyStreak || 0}
            </button>
          </div>
        </>
      )}

      {tab === 'shop' && <ShopPanel />}
      {tab === 'daily' && <DailyPanel />}
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
