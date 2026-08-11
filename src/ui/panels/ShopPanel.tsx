import { useEffect, useMemo, useState } from 'react'
import { CHEST_SHOP_OFFERS } from '../../content/chests'
import { GENERATORS } from '../../content/generators'
import { UPGRADES } from '../../content/upgrades'
import { assetUrl, CHEST_ASSETS, UI_ASSETS } from '../../content/assetPaths'
import {
  ECONOMY,
  geometricCost,
  geometricSeriesCost,
  maxAffordableCount,
} from '../../core/economy/formulas'
import { LargeNumber } from '../../core/numbers/LargeNumber'
import { formatNumber } from '../../core/numbers/formatNumber'
import type { ChestTier } from '../../core/types/gameTypes'
import type { StoreProduct } from '../../services/billing'
import AudioManager from '../../audio/AudioManager'
import { billing } from '../../state/gameSingleton'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { maybeShowInterstitial } from '../monetizationHelpers'

const CHEST_TIERS: ChestTier[] = ['regular', 'silver', 'golden']

function formatCooldown(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes}m`
}

export function ShopPanel() {
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const [section, setSection] = useState<
    'generators' | 'upgrades' | 'boosts' | 'chests' | 'iap'
  >('generators')
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [iapLoading, setIapLoading] = useState(false)
  const [iapBusy, setIapBusy] = useState<string | null>(null)
  const [chestToast, setChestToast] = useState<string | null>(null)
  const balance = LargeNumber.deserialize(snap.save.currentPP)
  const lifetimePP = LargeNumber.deserialize(snap.save.lifetimePPEarned)
  const multLabel =
    snap.save.buyMultiplierIndex >= ECONOMY.buyMultipliers.length
      ? 'MAX'
      : `x${ECONOMY.buyMultipliers[snap.save.buyMultiplierIndex]}`
  
  const incomeBoostCooldown = engine.getRewardedCooldownRemaining('income_boost')
  const instantPpsCooldown = engine.getRewardedCooldownRemaining('instant_pps')
  const goldenSpawnCooldown = engine.getRewardedCooldownRemaining('golden_spawn')
  const eventRetryCooldown = engine.getRewardedCooldownRemaining('event_retry')

  const visibleGenerators = useMemo(
    () =>
      GENERATORS.filter((g) => (g.unlockFlushCount ?? 0) <= snap.save.flushCount + 1).slice(0, 22),
    [snap.save.flushCount],
  )

  useEffect(() => {
    if (section !== 'iap') return
    setIapLoading(true)
    void billing
      .loadProducts()
      .then(setProducts)
      .finally(() => setIapLoading(false))
  }, [section])

  const playPurchaseSfx = (kind: 'generator' | 'upgrade') => {
    if (!snap.save.settings.sfx) return
    AudioManager.play(kind === 'generator' ? 'generator_purchase' : 'upgrade')
  }

  const handlePurchase = async (productId: string) => {
    setIapBusy(productId)
    try {
      const result = await billing.purchase(productId)
      if (result.ok && result.productId) {
        engine.applyIapGrant(result.productId)
      }
    } finally {
      setIapBusy(null)
    }
  }

  const handleRestore = async () => {
    setIapBusy('restore')
    try {
      const results = await billing.restore()
      for (const result of results) {
        if (result.ok && result.productId) {
          engine.applyIapGrant(result.productId)
        }
      }
    } finally {
      setIapBusy(null)
    }
  }

  return (
    <div className="panel">
      <h2>Shop</h2>

      {snap.save.autoBuyUnlocked && (
        <div className="goal-card" style={{ marginBottom: 8 }}>
          <label className="list-row" style={{ cursor: 'pointer' }}>
            <strong>Auto-Buy</strong>
            <input
              type="checkbox"
              checked={snap.save.autoBuyEnabled}
              onChange={(e) => engine.setAutoBuyEnabled(e.target.checked)}
            />
          </label>
          <div className="meta-line">One predictable purchase every 1.5 seconds.</div>
          <label className="list-row" style={{ cursor: 'pointer' }}>
            <span>Generators</span>
            <input
              type="checkbox"
              checked={snap.save.autoBuyPreferences.generators}
              onChange={(e) => engine.setAutoBuyPreferences({ generators: e.target.checked })}
            />
          </label>
          <label className="list-row" style={{ cursor: 'pointer' }}>
            <span>Upgrades</span>
            <input
              type="checkbox"
              checked={snap.save.autoBuyPreferences.upgrades}
              onChange={(e) => engine.setAutoBuyPreferences({ upgrades: e.target.checked })}
            />
          </label>
        </div>
      )}
      
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>Buy Multiplier:</strong>
        <button
          className="ghost-btn"
          onClick={() => engine.setBuyMultiplierIndex((snap.save.buyMultiplierIndex + 1) % 4)}
        >
          {multLabel}
        </button>
      </div>

      <div className="tabs">
        <button
          className={section === 'generators' ? 'active' : ''}
          onClick={() => setSection('generators')}
        >
          Generators
        </button>
        <button
          className={section === 'upgrades' ? 'active' : ''}
          onClick={() => setSection('upgrades')}
        >
          Upgrades
        </button>
        <button
          className={section === 'boosts' ? 'active' : ''}
          onClick={() => setSection('boosts')}
        >
          Boosts
        </button>
        <button
          className={section === 'chests' ? 'active' : ''}
          onClick={() => setSection('chests')}
        >
          Chests
        </button>
        <button className={section === 'iap' ? 'active' : ''} onClick={() => setSection('iap')}>
          Store
        </button>
      </div>

      {section === 'boosts' && (
        <>
          <h3 style={{ marginTop: 16, marginBottom: 8 }}>Quick Boosts</h3>
          <div className="list-row">
            <div>
              <strong>Income Boost (Ad)</strong>
              <div className="meta-line">2x idle income for 5 minutes</div>
            </div>
            <button
              className="ghost-btn"
              disabled={incomeBoostCooldown > 0}
              onClick={async () => {
                const canApply = engine.canApplyRewarded('income_boost')
                if (!canApply.ok) return
                const ad = await ads.showRewarded('income_boost')
                if (ad.ok) engine.applyRewardedIncomeBoost()
              }}
            >
              {incomeBoostCooldown > 0 ? `Ready in ${formatCooldown(incomeBoostCooldown)}` : 'Watch Ad'}
            </button>
          </div>
          <div className="list-row">
            <div>
              <strong>Instant PPS Burst (Ad)</strong>
              <div className="meta-line">Gain 1 minute of idle PP instantly</div>
            </div>
            <button
              className="ghost-btn"
              disabled={instantPpsCooldown > 0}
              onClick={async () => {
                const canApply = engine.canApplyRewarded('instant_pps')
                if (!canApply.ok) return
                const ad = await ads.showRewarded('instant_pps')
                if (ad.ok) engine.applyRewardedInstantPps()
              }}
            >
              {instantPpsCooldown > 0 ? `Ready in ${formatCooldown(instantPpsCooldown)}` : 'Watch Ad'}
            </button>
          </div>
          <div className="list-row">
            <div>
              <strong>Golden Poop Shower (Ad)</strong>
              <div className="meta-line">120 golden poops in 30s — each catch is 20× tap</div>
              {snap.eventRuntime && (
                <div className="meta-line" style={{ color: '#ff6b6b' }}>
                  Event busy
                </div>
              )}
            </div>
            <button
              className="ghost-btn"
              disabled={goldenSpawnCooldown > 0 || Boolean(snap.eventRuntime)}
              onClick={async () => {
                const canApply = engine.canApplyRewarded('golden_spawn')
                if (!canApply.ok) return
                const ad = await ads.showRewarded('golden_spawn')
                if (ad.ok) engine.spawnEvent('golden_rain', { rewarded: true })
              }}
            >
              {goldenSpawnCooldown > 0 ? `Ready in ${formatCooldown(goldenSpawnCooldown)}` : 'Watch Ad'}
            </button>
          </div>
          <div className="list-row">
            <div>
              <strong>Event Retry (Ad)</strong>
              <div className="meta-line">Force the next random event soon</div>
            </div>
            <button
              className="ghost-btn"
              disabled={eventRetryCooldown > 0}
              onClick={async () => {
                const canApply = engine.canApplyRewarded('event_retry')
                if (!canApply.ok) return
                const ad = await ads.showRewarded('event_retry')
                if (ad.ok) engine.applyRewardedEventRetry()
              }}
            >
              {eventRetryCooldown > 0 ? `Ready in ${formatCooldown(eventRetryCooldown)}` : 'Watch Ad'}
            </button>
          </div>
        </>
      )}

      {section === 'chests' && (
        <>
          <h3 style={{ marginTop: 16, marginBottom: 8 }}>Your stash</h3>
          {chestToast && <div className="meta-line" style={{ marginBottom: 8 }}>{chestToast}</div>}
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
                    <strong style={{ textTransform: 'capitalize' }}>{tier} chest</strong>
                    <div className="meta-line">
                      {chests} chest · {keys} key
                    </div>
                  </div>
                </div>
                <button
                  className="ghost-btn"
                  disabled={!canOpen}
                  onClick={() => {
                    const result = engine.openInventoryChest(tier)
                    if (result.ok) {
                      setChestToast(
                        result.startedShower
                          ? `${result.label ?? 'Reward'} — shower started!`
                          : (result.label ?? 'Opened!'),
                      )
                    } else if (result.reason === 'event_busy') {
                      setChestToast('Finish the current event first')
                    }
                  }}
                >
                  Open
                </button>
              </div>
            )
          })}

          <h3 style={{ marginTop: 20, marginBottom: 8 }}>
            Buy with GTP{' '}
            <img
              src={UI_ASSETS.currency.gtp}
              alt=""
              width={18}
              height={18}
              style={{ verticalAlign: 'middle' }}
            />
          </h3>
          <div className="meta-line" style={{ marginBottom: 8 }}>
            Chests are cheap. Keys are the real cost.
          </div>
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
                    <strong>{offer.name}</strong>
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

      {section === 'generators' && (
        <>
          <h3 style={{ marginTop: 16, marginBottom: 8 }}>Generators</h3>
          {visibleGenerators.map((gen) => {
            const level = snap.save.generators[gen.id] ?? 0
            const flushLocked = (gen.unlockFlushCount ?? 0) > snap.save.flushCount
            const ppLocked =
              gen.unlockPP &&
              level === 0 &&
              lifetimePP.lt(gen.unlockPP) &&
              balance.lt(gen.unlockPP)
            const locked = flushLocked || ppLocked
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
            let lockReason = ''
            if (flushLocked) lockReason = `Needs ${gen.unlockFlushCount} flushes`
            else if (ppLocked) lockReason = `Needs ${formatNumber(gen.unlockPP!)} lifetime PP`
            
            return (
              <div
                className={`list-row shop-card ${canAfford && !locked ? 'can-afford' : 'cannot-afford'}`}
                key={gen.id}
              >
                <div>
                  <strong>
                    {gen.name} · Lv {level}
                  </strong>
                  <div className="meta-line">{gen.description}</div>
                  <div className="meta-line">{formatNumber(gen.baseProduction)}/s each</div>
                  {lockReason && (
                    <div className="meta-line" style={{ color: '#ff6b6b' }}>
                      {lockReason}
                    </div>
                  )}
                </div>
                <button
                  className="primary-btn"
                  disabled={locked || !canAfford}
                  onClick={async () => {
                    const result = engine.buyGenerator(gen.id)
                    if (result.ok) {
                      playPurchaseSfx('generator')
                      await maybeShowInterstitial(ads, 'shop', {
                        eventActive: Boolean(snap.eventRuntime),
                        frenzyActive: snap.frenzyActive,
                        removeAds: snap.save.removeAds,
                      })
                    }
                  }}
                >
                  {locked ? 'Locked' : formatNumber(cost)}
                </button>
              </div>
            )
          })}
        </>
      )}

      {section === 'upgrades' &&
        UPGRADES.map((up) => {
          const level = snap.save.purchasedRunUpgrades[up.id] ?? 0
          const locked =
            (up.requiresFlushCount ?? 0) > snap.save.flushCount ||
            (up.requiresWorldId ? !snap.save.unlockedWorlds.includes(up.requiresWorldId) : false)
          const cost = geometricCost(LargeNumber.from(up.baseCost), up.costGrowth, level)
          return (
            <div className="list-row" key={up.id}>
              <div>
                <strong>
                  {up.name} · {level}/{up.maxLevel}
                </strong>
                <div className="meta-line">
                  {up.description} · {up.tier.replaceAll('_', ' ')}
                </div>
              </div>
              <button
                className="primary-btn"
                disabled={locked || level >= up.maxLevel || balance.lt(cost)}
                onClick={() => {
                  const result = engine.buyUpgrade(up.id)
                  if (result.ok) playPurchaseSfx('upgrade')
                }}
              >
                {level >= up.maxLevel ? 'MAX' : locked ? 'Locked' : formatNumber(cost)}
              </button>
            </div>
          )
        })}

      {section === 'iap' && (
        <>
          <div className="list-row">
            <span>Remove Ads</span>
            <strong>{snap.save.removeAds ? 'Active' : 'Not owned'}</strong>
          </div>
          {iapLoading && <p className="meta-line">Loading products…</p>}
          {!iapLoading &&
            products.map((product) => {
              const owned =
                product.kind !== 'consumable' && snap.save.ownedIapProducts.includes(product.id)
              return (
                <div className="list-row" key={product.id}>
                  <div>
                    <strong>{product.title}</strong>
                    <div className="meta-line">{product.description}</div>
                    <div className="meta-line">{product.priceString}</div>
                  </div>
                  <button
                    className="primary-btn"
                    disabled={owned || iapBusy !== null}
                    onClick={() => void handlePurchase(product.id)}
                  >
                    {iapBusy === product.id
                      ? '…'
                      : owned
                        ? 'Owned'
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
            disabled={iapBusy !== null}
            onClick={() => void handleRestore()}
          >
            {iapBusy === 'restore' ? 'Restoring…' : 'Restore Purchases'}
          </button>
        </>
      )}
    </div>
  )
}
