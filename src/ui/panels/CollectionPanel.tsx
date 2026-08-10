import { useMemo, useState } from 'react'
import { ACHIEVEMENTS } from '../../content/achievements'
import { ASSET_MANIFEST } from '../../content/assetManifest'
import {
  resolveSkinExpressionPath,
  resolveSkinThumbnailPath,
} from '../../content/assetPaths'
import { EVENTS } from '../../content/events'
import { GENERATORS } from '../../content/generators'
import { SKINS } from '../../content/skins'
import { WORLDS } from '../../content/worlds'
import { collectionPercent } from '../../core/systems/achievements'
import { getSkinStatus, isSkinUnlockRequirementMet } from '../../core/systems/skins'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { maybeShowInterstitial } from '../monetizationHelpers'

export function CollectionPanel() {
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const [tab, setTab] = useState<'overview' | 'skins' | 'worlds'>('overview')

  const stats = useMemo(() => {
    const skins = snap.save.ownedSkins.length
    const worlds = snap.save.unlockedWorlds.length
    const events = Object.values(snap.save.eventCompletions).filter((n) => n > 0).length
    const generators = Object.values(snap.save.generators).filter((n) => n > 0).length
    const achievements = Object.values(snap.save.achievements).filter((a) => a.completed).length
    return {
      skins,
      worlds,
      events,
      generators,
      achievements,
      total: collectionPercent(snap.save),
    }
  }, [snap.save])

  return (
    <div className="panel">
      <h2>Collection</h2>
      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'skins' ? 'active' : ''} onClick={() => setTab('skins')}>
          Skins
        </button>
        <button className={tab === 'worlds' ? 'active' : ''} onClick={() => setTab('worlds')}>
          Worlds
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="goal-card">
            <div className="goal-title">EQUIPPED SKIN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <img
                src={resolveSkinThumbnailPath(snap.save.equippedSkinId) || ''}
                alt={snap.save.equippedSkinId}
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain' }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>
                  {SKINS.find((s) => s.id === snap.save.equippedSkinId)?.name || 'Unknown'}
                </div>
                <div className="meta-line">
                  Collection {stats.total}% · {stats.skins}/{SKINS.length} skins
                </div>
              </div>
            </div>
          </div>
          <div className="list-row">
            <span>WORLDS</span>
            <strong>
              {stats.worlds} / {WORLDS.length}
            </strong>
          </div>
          <div className="list-row">
            <span>EVENTS</span>
            <strong>
              {stats.events} / {EVENTS.length}
            </strong>
          </div>
          <div className="list-row">
            <span>GENERATORS</span>
            <strong>
              {stats.generators} / {GENERATORS.length}
            </strong>
          </div>
          <div className="list-row">
            <span>ACHIEVEMENTS</span>
            <strong>
              {stats.achievements} / {ACHIEVEMENTS.length}
            </strong>
          </div>
        </>
      )}

      {tab === 'skins' &&
        SKINS.map((skin) => {
          const status = getSkinStatus(snap.save, skin.id)
          const met = isSkinUnlockRequirementMet(snap.save, skin.id)
          const color =
            ASSET_MANIFEST.skins[skin.id as keyof typeof ASSET_MANIFEST.skins]?.color ?? '#8B5A2B'
          const authoredPreview =
            resolveSkinThumbnailPath(skin.id) ?? resolveSkinExpressionPath(skin.id, 'happy')
          const unlockText =
            skin.unlock.type === 'gtp'
              ? `${skin.unlock.amount} GTP`
              : skin.unlock.type === 'flush'
                ? `${snap.save.flushCount} / ${skin.unlock.count} Flushes`
                : skin.unlock.type === 'achievement'
                  ? `Achievement: ${skin.unlock.achievementId}`
                  : skin.unlock.type === 'daily'
                    ? `${snap.save.dailyChallengesCompletedTotal} / ${skin.unlock.count} dailies`
                    : skin.unlock.type === 'default'
                      ? 'Starter'
                      : skin.unlock.type

          return (
            <div className="list-row" key={skin.id}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {authoredPreview ? (
                  <img
                    className="skin-swatch skin-swatch-authored"
                    src={authoredPreview}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    aria-hidden
                  />
                ) : (
                  <div
                    className={`skin-swatch skin-preview-${skin.id.replace(/[^a-z0-9_-]/gi, '_')}`}
                    style={{ ['--preview-color' as string]: color }}
                    aria-hidden
                  />
                )}
                <div>
                  <strong>{skin.name}</strong>{' '}
                  <span className={`badge ${skin.rarity}`}>{skin.rarity}</span>
                  <div className="meta-line">{skin.description}</div>
                  <div className="meta-line">
                    {status.replaceAll('_', ' ').toUpperCase()} · {unlockText}
                    {!met && status !== 'owned' && status !== 'equipped' ? ' (locked)' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {status === 'purchasable' && skin.unlock.type === 'gtp' && (
                  <button className="primary-btn" onClick={() => engine.buySkin(skin.id)}>
                    Buy
                  </button>
                )}
                {(status === 'owned' || status === 'equipped') && (
                  <button
                    className="ghost-btn"
                    disabled={status === 'equipped'}
                    onClick={() => engine.equipSkinId(skin.id)}
                  >
                    {status === 'equipped' ? 'Equipped' : 'Equip'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

      {tab === 'worlds' &&
        WORLDS.map((world) => {
          const unlocked = snap.save.unlockedWorlds.includes(world.id)
          return (
            <div className="list-row" key={world.id}>
              <div>
                <strong>{world.name}</strong>
                <div className="meta-line">{world.description}</div>
                <div className="meta-line">
                  {unlocked ? 'Unlocked' : `Requires ${world.unlockFlushCount} Flushes`}
                </div>
              </div>
              <button
                className="primary-btn"
                disabled={!unlocked || snap.save.currentWorldId === world.id}
                onClick={async () => {
                  const result = engine.setWorld(world.id)
                  if (!result.ok) return
                  await maybeShowInterstitial(ads, 'world_change', {
                    eventActive: Boolean(snap.eventRuntime),
                    frenzyActive: snap.frenzyActive,
                    removeAds: snap.save.removeAds,
                  })
                }}
              >
                {snap.save.currentWorldId === world.id ? 'Current' : unlocked ? 'Enter' : 'Locked'}
              </button>
            </div>
          )
        })}
    </div>
  )
}
