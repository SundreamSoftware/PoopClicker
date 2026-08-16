import { useEffect, useMemo, useState } from 'react'
import { CHEST_SHOP_OFFERS, chestRewardOdds } from '../../content/chests'
import { formatUpgradeEffect, scoreBuildArchetypes, UPGRADE_BY_ID } from '../../content/upgrades'
import { formatIapGrantSummary, IAP_BY_ID } from '../../content/iapProducts'
import {
  assetUrl,
  CHEST_ASSETS,
  CHEST_OPEN_ANIM,
  chestOpenAnimFrameUrls,
  UI_ASSETS,
} from '../../content/assetPaths'
import {
  ECONOMY,
  geometricCost,
  geometricSeriesCost,
  maxAffordableCount,
} from '../../core/economy/formulas'
import { LargeNumber } from '../../core/numbers/LargeNumber'
import { formatNumber } from '../../core/numbers/formatNumber'
import type { ChestTier } from '../../core/types/gameTypes'
import type { UpgradeGroupId } from '../../core/systems/shopAdvisor'
import {
  adviseShop,
  badgeForItem,
  generatorPpsForLevel,
  generatorUnlocked,
  nextGeneratorMilestone,
  scoreGeneratorBuy,
  upgradeRequirementMet,
  visibleGenerators,
  visibleUpgrades,
} from '../../core/systems/shopAdvisor'
import { trackProduct } from '../../services/analytics'
import type { StoreProduct } from '../../services/billing'
import AudioManager from '../../audio/AudioManager'
import { billing } from '../../state/gameSingleton'
import { restorePurchasesToEngine } from '../../services/purchaseSync'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { FrameSequencePlayer } from '../assets/FrameSequencePlayer'
import { ModalHost } from '../overlays/ModalHost'
import {
  AutoBuyCompact,
  AutoBuySheetBody,
  BoostsList,
  BuyMultiplierControl,
  ProgressionBadge,
  ShopBadgeChip,
  SHOP_SECTIONS,
  UPGRADE_GROUP_LABEL,
  type ShopSection,
} from '../shop/shopBits'

interface ChestOpenShow {
  label: string
  startedShower: boolean
}

const CHEST_TIERS: ChestTier[] = ['regular', 'silver', 'golden']

export function ShopPanel({ initialSection = 'production' }: { initialSection?: ShopSection }) {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const [section, setSection] = useState<ShopSection>(initialSection)
  const [autoOpen, setAutoOpen] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<UpgradeGroupId | null>(null)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [iapLoading, setIapLoading] = useState(false)
  const [iapBusy, setIapBusy] = useState<string | null>(null)
  const [storeAvailable, setStoreAvailable] = useState(billing.isAvailable())
  const [chestToast, setChestToast] = useState<string | null>(null)
  const [chestOpenShow, setChestOpenShow] = useState<ChestOpenShow | null>(null)
  const [chestRewardVisible, setChestRewardVisible] = useState(false)
  const chestOpenFrames = useMemo(() => chestOpenAnimFrameUrls(), [])
  const balance = LargeNumber.deserialize(snap.save.currentPP)
  const lifetimePP = LargeNumber.deserialize(snap.save.lifetimePPEarned)
  const buyCount =
    snap.save.buyMultiplierIndex >= 3 ? 0 : ECONOMY.buyMultipliers[snap.save.buyMultiplierIndex]
  const advice = useMemo(
    () => adviseShop(snap.save, Math.max(1, buyCount || 1)),
    [snap.save, buyCount],
  )
  const gens = useMemo(() => visibleGenerators(snap.save), [snap.save])
  const upgradeView = useMemo(() => visibleUpgrades(snap.save), [snap.save])

  useEffect(() => {
    if (!chestOpenShow || !chestRewardVisible) return
    const id = window.setTimeout(() => {
      setChestToast(chestOpenShow.label)
      setChestOpenShow(null)
      setChestRewardVisible(false)
    }, 2_200)
    return () => window.clearTimeout(id)
  }, [chestOpenShow, chestRewardVisible])

  useEffect(() => {
    if (section !== 'premium') return
    setIapLoading(true)
    void billing
      .init()
      .then(() => billing.loadProducts())
      .then((loaded) => {
        setStoreAvailable(billing.isAvailable())
        setProducts(loaded)
        if (loaded.length > 0) {
          trackProduct('iap_impression', { count: loaded.length })
        }
      })
      .finally(() => setIapLoading(false))
  }, [section])

  const playPurchaseSfx = (kind: 'generator' | 'upgrade') => {
    if (!snap.save.settings.sfx) return
    AudioManager.play(kind === 'generator' ? 'generator_purchase' : 'upgrade')
  }

  const handlePurchase = async (productId: string) => {
    const def = IAP_BY_ID[productId]
    if ((def?.unlockFlushCount ?? 0) > snap.save.flushCount) {
      setChestToast(
        (def?.unlockFlushCount ?? 0) === 1
          ? 'Unlocks after your first Flush'
          : `Unlocks after ${def?.unlockFlushCount} Flushes`,
      )
      return
    }
    setIapBusy(productId)
    try {
      const result = await billing.purchase(productId)
      if (result.ok && result.productId) {
        engine.applyIapGrant(result.productId)
        setChestToast('Purchase complete')
        return
      }
      const reason = result.reason
      if (reason === 'cancel') setChestToast('Purchase cancelled')
      else if (reason === 'pending') setChestToast('Purchase pending — check Play Store')
      else if (reason === 'already_owned') setChestToast('Already owned')
      else if (reason === 'unavailable') setChestToast('Store unavailable')
      else setChestToast('Purchase failed')
    } finally {
      setIapBusy(null)
    }
  }

  const handleRestore = async () => {
    setIapBusy('restore')
    try {
      const { restored, unavailable } = await restorePurchasesToEngine(engine, billing)
      if (unavailable) {
        setChestToast('Store unavailable')
        return
      }
      setChestToast(restored > 0 ? `Restored ${restored} purchase(s)` : 'No purchases to restore')
    } finally {
      setIapBusy(null)
    }
  }

  return (
    <div className="panel shop-panel">
      <ModalHost
        open={Boolean(chestOpenShow)}
        onClose={() => {
          if (!chestOpenShow || !chestRewardVisible) return
          setChestToast(chestOpenShow.label)
          setChestOpenShow(null)
          setChestRewardVisible(false)
        }}
        ariaLabel="Opening chest"
        hideChrome
        dismissible={chestRewardVisible}
        closeOnBackdrop={chestRewardVisible}
        layerClass="chest-open-overlay"
        panelClassName="chest-open-stage"
      >
        {chestOpenShow && (
          <>
            <FrameSequencePlayer
              frames={chestOpenFrames}
              durationMs={CHEST_OPEN_ANIM.durationMs}
              reducedMotion={snap.save.settings.reducedMotion}
              onComplete={() => setChestRewardVisible(true)}
            />
            {chestRewardVisible && <div className="chest-open-reward">{chestOpenShow.label}</div>}
          </>
        )}
      </ModalHost>
      <ModalHost
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        title="Auto-Buy"
        ariaLabel="Auto-Buy settings"
      >
        <AutoBuySheetBody />
      </ModalHost>

      <div className="shop-sticky">
        <div className="shop-sticky-top">
          <h2>Shop</h2>
          <AutoBuyCompact onOpen={() => setAutoOpen(true)} />
        </div>
        <div className="tabs">
          {SHOP_SECTIONS.map((id) => (
            <button
              key={id}
              type="button"
              className={section === id ? 'active' : ''}
              onClick={() => setSection(id)}
            >
              {id === 'production'
                ? 'Production'
                : id === 'upgrades'
                  ? 'Upgrades'
                  : id === 'powerups'
                    ? 'Power-Ups'
                    : 'Premium'}
            </button>
          ))}
        </div>
        {section === 'production' && <BuyMultiplierControl />}
      </div>

      {section === 'production' &&
        gens.map((gen) => {
          const level = snap.save.generators[gen.id] ?? 0
          const unlocked = generatorUnlocked(snap.save, gen)
          const flushLocked = (gen.unlockFlushCount ?? 0) > snap.save.flushCount
          const ppLocked =
            Boolean(gen.unlockPP) &&
            level === 0 &&
            lifetimePP.lt(gen.unlockPP!) &&
            balance.lt(gen.unlockPP!)
          const locked = flushLocked || ppLocked || !unlocked
          const count =
            snap.save.buyMultiplierIndex >= 3
              ? Math.max(
                  1,
                  maxAffordableCount(
                    balance,
                    LargeNumber.from(gen.baseCost),
                    gen.costGrowth,
                    level,
                  ),
                )
              : ECONOMY.buyMultipliers[snap.save.buyMultiplierIndex]
          const cost = geometricSeriesCost(
            LargeNumber.from(gen.baseCost),
            gen.costGrowth,
            level,
            count,
          )
          const canAfford = balance.gte(cost)
          const scored = scoreGeneratorBuy(snap.save, gen, count)
          const currentPps = generatorPpsForLevel(snap.save, gen, level)
          const next = nextGeneratorMilestone(gen, level)
          const remaining = next ? next.level - level : 0
          const near = Boolean(next && remaining <= 5)
          const crosses = Boolean(next && level + count >= next.level)
          const badge = badgeForItem(gen.id, advice)
          let lockReason = ''
          if (flushLocked) lockReason = `Needs ${gen.unlockFlushCount} Flushes`
          else if (ppLocked) lockReason = `Needs ${formatNumber(gen.unlockPP!)} lifetime PP`

          return (
            <div
              className={`list-row shop-card generator-card ${canAfford && !locked ? 'can-afford' : 'cannot-afford'} ${near ? 'near-milestone' : ''}`}
              key={gen.id}
            >
              <div>
                <div className="card-title-row">
                  <strong>
                    {gen.name} · Lv {level}
                  </strong>
                  <ProgressionBadge kind="run" />
                  <ShopBadgeChip badge={badge} />
                </div>
                <div className="meta-line">{formatNumber(currentPps)} PP/s</div>
                {scored && <div className="meta-line">+{formatNumber(scored.deltaPps)} PP/s</div>}
                {next && (
                  <div className={`meta-line ${near ? 'milestone-hot' : ''}`}>
                    NEXT: Lv. {next.level} → ×{next.multiplier}
                    {remaining > 0 ? ` · ${remaining} left` : ''}
                    {crosses ? ' · this buy hits it' : ''}
                  </div>
                )}
                {lockReason && (
                  <div className="meta-line" style={{ color: '#ff6b6b' }}>
                    {lockReason}
                  </div>
                )}
              </div>
              <button
                className="primary-btn"
                disabled={locked || !canAfford}
                onClick={() => {
                  const result = engine.buyGenerator(gen.id)
                  if (result.ok) {
                    playPurchaseSfx('generator')
                    if (badge === 'RECOMMENDED' || badge === 'BEST_VALUE') {
                      engine.trackUi('recommended_purchase', { id: gen.id })
                    }
                  }
                }}
              >
                {locked ? 'Locked' : formatNumber(cost)}
              </button>
            </div>
          )
        })}

      {section === 'upgrades' && (
        <>
          {(() => {
            const build = scoreBuildArchetypes(snap.save.purchasedRunUpgrades)
            const lead =
              build.tapper >= build.idler && build.tapper >= build.hybrid
                ? 'TAPPER'
                : build.idler >= build.hybrid
                  ? 'IDLER'
                  : 'HYBRID'
            return (
              <div className="build-card" aria-label="Build archetype">
                <strong>Build · {lead}</strong>
                <div className="meta-line">
                  TAPPER {build.tapper} · IDLER {build.idler} · HYBRID {build.hybrid}
                </div>
              </div>
            )
          })()}
          {(Object.keys(UPGRADE_GROUP_LABEL) as UpgradeGroupId[]).map((groupId) => {
            const items = upgradeView.groups[groupId]
            if (items.length === 0) return null
            const levels = items.reduce(
              (sum, up) => sum + (snap.save.purchasedRunUpgrades[up.id] ?? 0),
              0,
            )
            const max = items.reduce((sum, up) => sum + up.maxLevel, 0)
            const next = items.find((up) => {
              const level = snap.save.purchasedRunUpgrades[up.id] ?? 0
              return level < up.maxLevel && upgradeRequirementMet(snap.save, up)
            })
            const summary =
              groupId === 'tap'
                ? `Tap ${formatNumber(snap.production.tapPower)}`
                : groupId === 'idle'
                  ? `Idle ${formatNumber(snap.production.pps)}/s`
                  : groupId === 'crit'
                    ? `Crit ${(snap.production.critChance * 100).toFixed(0)}% · ×${snap.production.critMultiplier.toFixed(1)}`
                    : `Combo max ${snap.production.comboMax}`
            const open = expandedGroup === groupId
            return (
              <section key={groupId} className="upgrade-group">
                <button
                  type="button"
                  className="upgrade-summary"
                  onClick={() => {
                    const nextOpen = open ? null : groupId
                    setExpandedGroup(nextOpen)
                    if (nextOpen) engine.trackUi('upgrade_category_opened', { group: groupId })
                  }}
                >
                  <div>
                    <strong>{UPGRADE_GROUP_LABEL[groupId]}</strong>
                    <ProgressionBadge kind="run" />
                    <div className="meta-line">
                      Lv {levels}/{max} · {summary}
                    </div>
                    {next && <div className="meta-line">Next: {next.name}</div>}
                  </div>
                  <span>{open ? '▾' : '▸'}</span>
                </button>
                {open &&
                  items.map((up) => {
                    const def = UPGRADE_BY_ID[up.id] ?? up
                    const level = snap.save.purchasedRunUpgrades[def.id] ?? 0
                    const reqMet = upgradeRequirementMet(snap.save, def)
                    const cost = geometricCost(
                      LargeNumber.from(def.baseCost),
                      def.costGrowth,
                      level,
                    )
                    const badge = badgeForItem(def.id, advice)
                    const lockLabel =
                      (def.requiresFlushCount ?? 0) > snap.save.flushCount
                        ? `Needs Flush ${def.requiresFlushCount}`
                        : def.requiresWorldId &&
                            !snap.save.unlockedWorlds.includes(def.requiresWorldId)
                          ? 'Needs world'
                          : def.requiresUpgradeId &&
                              !(snap.save.purchasedRunUpgrades[def.requiresUpgradeId] > 0)
                            ? 'Needs upgrade'
                            : !reqMet
                              ? 'Locked'
                              : ''
                    return (
                      <div className="list-row shop-card" key={def.id}>
                        <div>
                          <div className="card-title-row">
                            <strong>
                              {def.name} · {level}/{def.maxLevel}
                            </strong>
                            <ShopBadgeChip badge={badge} />
                          </div>
                          <div className="meta-line">{formatUpgradeEffect(def)}</div>
                        </div>
                        {lockLabel ? (
                          <span className="badge">{lockLabel}</span>
                        ) : (
                          <button
                            className="primary-btn"
                            disabled={level >= def.maxLevel || balance.lt(cost)}
                            onClick={() => {
                              const result = engine.buyUpgrade(def.id)
                              if (result.ok) {
                                playPurchaseSfx('upgrade')
                                if (badge === 'RECOMMENDED' || badge === 'BEST_VALUE') {
                                  engine.trackUi('recommended_purchase', { id: def.id })
                                }
                              }
                            }}
                          >
                            {level >= def.maxLevel ? 'MAX' : formatNumber(cost)}
                          </button>
                        )}
                      </div>
                    )
                  })}
              </section>
            )
          })}
          {upgradeView.teaser && (
            <div className="list-row shop-card teaser-card">
              <div>
                <strong>NEXT UNLOCK</strong>
                <div className="meta-line">{upgradeView.teaser.name}</div>
                <div className="meta-line">
                  Requires Flush {upgradeView.teaser.requiresFlushCount}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {section === 'powerups' && (
        <>
          <h3>Boosts</h3>
          <BoostsList />
          <h3 style={{ marginTop: 16 }}>Inventory</h3>
          {chestToast && <div className="meta-line">{chestToast}</div>}
          {CHEST_TIERS.map((tier) => {
            const chests = snap.save.inventoryChests[tier] ?? 0
            const keys = snap.save.inventoryKeys[tier] ?? 0
            const canOpen = chests > 0 && keys > 0 && !snap.eventRuntime
            const chestSrc =
              tier === 'regular'
                ? CHEST_ASSETS.regular_chest
                : tier === 'silver'
                  ? CHEST_ASSETS.silver_chest
                  : CHEST_ASSETS.golden_chest
            const keySrc =
              tier === 'regular'
                ? CHEST_ASSETS.regular_key
                : tier === 'silver'
                  ? CHEST_ASSETS.silver_key
                  : CHEST_ASSETS.golden_key
            return (
              <div className="list-row" key={tier}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <img src={chestSrc} alt="" width={40} height={40} />
                  <img src={keySrc} alt="" width={28} height={28} />
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {tier} Chest ×{chests}
                    </strong>
                    <ProgressionBadge kind="permanent" />
                    <div className="meta-line">Keys ×{keys}</div>
                    <div className="meta-line">
                      Odds:{' '}
                      {chestRewardOdds(tier)
                        .map((row) => `${row.label} ${row.percent}%`)
                        .join(' · ')}
                    </div>
                  </div>
                </div>
                <button
                  className="ghost-btn"
                  disabled={!canOpen || Boolean(chestOpenShow)}
                  onClick={() => {
                    const result = engine.openInventoryChest(tier)
                    if (result.ok) {
                      const label = result.startedShower
                        ? `${result.label ?? 'Reward'} — shower started!`
                        : (result.label ?? 'Opened!')
                      setChestRewardVisible(false)
                      setChestOpenShow({ label, startedShower: Boolean(result.startedShower) })
                      setChestToast(null)
                    } else if (result.reason === 'event_busy') {
                      setChestToast('Finish the current event first')
                    }
                  }}
                >
                  OPEN
                </button>
              </div>
            )
          })}
          <h3 style={{ marginTop: 20 }}>
            Acquisition{' '}
            <img
              src={UI_ASSETS.currency.gtp}
              alt=""
              width={18}
              height={18}
              style={{ verticalAlign: 'middle' }}
            />
          </h3>
          {CHEST_SHOP_OFFERS.map((offer, index) => {
            const src = assetUrl(offer.asset)
            const afford = snap.save.gtp >= offer.gtpCost
            return (
              <div
                className={`list-row shop-card ${afford ? 'can-afford' : 'cannot-afford'}`}
                key={`${offer.kind}-${offer.tier}`}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <img src={src} alt="" width={40} height={40} />
                  <div>
                    <strong>
                      {offer.kind === 'key'
                        ? `GET KEY · ${offer.name}`
                        : `GET CHEST · ${offer.name}`}
                    </strong>
                    <div className="meta-line">{offer.description}</div>
                  </div>
                </div>
                <button
                  className="ghost-btn"
                  disabled={!afford}
                  onClick={() => {
                    const result = engine.buyChestShopOffer(index)
                    if (result.ok) setChestToast(`Bought ${offer.name}`)
                  }}
                >
                  {offer.gtpCost} GTP
                </button>
              </div>
            )
          })}
        </>
      )}

      {section === 'premium' && (
        <>
          <div className="list-row">
            <span>
              Remove Ads <ProgressionBadge kind="permanent" />
            </span>
            <strong>{snap.save.removeAds ? 'Active' : 'Not owned'}</strong>
          </div>
          {iapLoading && <p className="meta-line">Loading products…</p>}
          {!iapLoading && !storeAvailable && (
            <p className="meta-line">Store unavailable on this device.</p>
          )}
          {!iapLoading && storeAvailable && products.length === 0 && (
            <p className="meta-line">No store products available right now.</p>
          )}
          {!iapLoading &&
            storeAvailable &&
            products.map((product) => {
              const def = IAP_BY_ID[product.id]
              const owned =
                product.kind !== 'consumable' && snap.save.ownedIapProducts.includes(product.id)
              const flushLocked = (def?.unlockFlushCount ?? 0) > snap.save.flushCount
              return (
                <div className="list-row" key={product.id}>
                  <div>
                    <strong>{product.title}</strong>
                    <ProgressionBadge kind="permanent" />
                    <div className="meta-line">
                      {def ? formatIapGrantSummary(def) : product.description}
                    </div>
                    <div className="meta-line">{product.priceString}</div>
                    {flushLocked && (
                      <div className="meta-line" style={{ color: '#ff6b6b' }}>
                        Unlocks after {def?.unlockFlushCount} Flush
                        {(def?.unlockFlushCount ?? 0) === 1 ? '' : 'es'}
                      </div>
                    )}
                  </div>
                  <button
                    className="primary-btn"
                    disabled={owned || flushLocked || iapBusy !== null || !storeAvailable}
                    onClick={() => void handlePurchase(product.id)}
                  >
                    {iapBusy === product.id
                      ? '…'
                      : owned
                        ? 'Owned'
                        : flushLocked
                          ? 'Locked'
                          : product.kind === 'consumable'
                            ? 'Buy'
                            : 'Purchase'}
                  </button>
                </div>
              )
            })}
          <button
            className="ghost-btn"
            style={{ marginTop: 12 }}
            disabled={iapBusy !== null || !storeAvailable}
            onClick={() => void handleRestore()}
          >
            {iapBusy === 'restore' ? 'Restoring…' : 'Restore Purchases'}
          </button>
        </>
      )}
    </div>
  )
}
