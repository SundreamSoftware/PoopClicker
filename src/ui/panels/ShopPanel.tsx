import { useEffect, useMemo, useState } from 'react'
import { GENERATORS } from '../../content/generators'
import { UPGRADES } from '../../content/upgrades'
import {
  ECONOMY,
  geometricCost,
  geometricSeriesCost,
  maxAffordableCount,
} from '../../core/economy/formulas'
import { LargeNumber } from '../../core/numbers/LargeNumber'
import { formatNumber } from '../../core/numbers/formatNumber'
import type { StoreProduct } from '../../services/billing'
import AudioManager from '../../audio/AudioManager'
import { billing } from '../../state/gameSingleton'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

export function ShopPanel() {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const [section, setSection] = useState<'generators' | 'upgrades' | 'iap'>('generators')
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [iapLoading, setIapLoading] = useState(false)
  const [iapBusy, setIapBusy] = useState<string | null>(null)
  const balance = LargeNumber.deserialize(snap.save.currentPP)
  const multLabel =
    snap.save.buyMultiplierIndex >= ECONOMY.buyMultipliers.length
      ? 'MAX'
      : `x${ECONOMY.buyMultipliers[snap.save.buyMultiplierIndex]}`

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
        <label className="list-row" style={{ cursor: 'pointer', marginBottom: 8 }}>
          <span>Auto-Buy (best affordable upgrade/generator)</span>
          <input
            type="checkbox"
            checked={snap.save.autoBuyEnabled}
            onChange={(e) => engine.setAutoBuyEnabled(e.target.checked)}
          />
        </label>
      )}

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
        <button className={section === 'iap' ? 'active' : ''} onClick={() => setSection('iap')}>
          Store
        </button>
        <button
          onClick={() => engine.setBuyMultiplierIndex((snap.save.buyMultiplierIndex + 1) % 4)}
        >
          BUY {multLabel}
        </button>
      </div>

      {section === 'generators' &&
        visibleGenerators.map((gen) => {
          const level = snap.save.generators[gen.id] ?? 0
          const locked = (gen.unlockFlushCount ?? 0) > snap.save.flushCount
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
          return (
            <div className="list-row" key={gen.id}>
              <div>
                <strong>
                  {gen.name} · Lv {level}
                </strong>
                <div className="meta-line">{gen.description}</div>
                <div className="meta-line">{formatNumber(gen.baseProduction)}/s each</div>
              </div>
              <button
                className="primary-btn"
                disabled={locked || balance.lt(cost)}
                onClick={() => {
                  const result = engine.buyGenerator(gen.id)
                  if (result.ok) playPurchaseSfx('generator')
                }}
              >
                {locked ? `Flush ${gen.unlockFlushCount}` : formatNumber(cost)}
              </button>
            </div>
          )
        })}

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
