import { GENERATOR_BY_ID } from '../../content/generators'
import { formatUpgradeEffect, UPGRADE_BY_ID } from '../../content/upgrades'
import { ECONOMY, geometricCost, geometricSeriesCost } from '../../core/economy/formulas'
import { formatNumber } from '../../core/numbers/formatNumber'
import { LargeNumber } from '../../core/numbers/LargeNumber'
import { adviseShop, badgeForItem, quickShopPicks } from '../../core/systems/shopAdvisor'
import AudioManager from '../../audio/AudioManager'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { ProgressionBadge, ShopBadgeChip } from './shopBits'

const REASON_LABEL = {
  recommended: 'Recommended',
  milestone: 'Near milestone',
  tap: 'Best tap',
  idle: 'Best idle',
} as const

export function QuickShopSheet({ onFullShop }: { onFullShop: () => void }) {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const picks = quickShopPicks(snap.save)
  const advice = adviseShop(snap.save, 1)
  const balance = LargeNumber.deserialize(snap.save.currentPP)

  const playSfx = (kind: 'generator' | 'upgrade') => {
    if (!snap.save.settings.sfx) return
    AudioManager.play(kind === 'generator' ? 'generator_purchase' : 'upgrade')
  }

  return (
    <div className="quick-shop-sheet">
      <p className="meta-line">Fast buys without leaving Play.</p>
      {picks.length === 0 && <p className="meta-line">Earn a bit more PP to unlock a buy.</p>}
      {picks.map((pick) => {
        if (pick.kind === 'generator') {
          const gen = GENERATOR_BY_ID[pick.id]
          if (!gen) return null
          const level = snap.save.generators[gen.id] ?? 0
          const cost = geometricSeriesCost(LargeNumber.from(gen.baseCost), gen.costGrowth, level, 1)
          const badge = badgeForItem(gen.id, advice)
          return (
            <div className="list-row shop-card" key={`${pick.reason}-${gen.id}`}>
              <div>
                <ShopBadgeChip badge={badge} />
                <strong>{gen.name}</strong>
                <ProgressionBadge kind="run" />
                <div className="meta-line">
                  {REASON_LABEL[pick.reason]} · Lv {level}
                </div>
              </div>
              <button
                className="primary-btn"
                disabled={balance.lt(cost)}
                onClick={() => {
                  const result = engine.buyGenerator(gen.id, 1)
                  if (result.ok) {
                    playSfx('generator')
                    engine.trackUi('quick_shop_purchase', { id: gen.id, kind: 'generator' })
                    if (badge === 'RECOMMENDED' || badge === 'BEST_VALUE') {
                      engine.trackUi('recommended_purchase', { id: gen.id })
                    }
                  }
                }}
              >
                {formatNumber(cost)}
              </button>
            </div>
          )
        }
        const up = UPGRADE_BY_ID[pick.id]
        if (!up) return null
        const level = snap.save.purchasedRunUpgrades[up.id] ?? 0
        const cost = geometricCost(LargeNumber.from(up.baseCost), up.costGrowth, level)
        const badge = badgeForItem(up.id, advice)
        return (
          <div className="list-row shop-card" key={`${pick.reason}-${up.id}`}>
            <div>
              <ShopBadgeChip badge={badge} />
              <strong>{up.name}</strong>
              <ProgressionBadge kind="run" />
              <div className="meta-line">
                {REASON_LABEL[pick.reason]} · {formatUpgradeEffect(up)}
              </div>
            </div>
            <button
              className="primary-btn"
              disabled={level >= up.maxLevel || balance.lt(cost)}
              onClick={() => {
                const result = engine.buyUpgrade(up.id)
                if (result.ok) {
                  playSfx('upgrade')
                  engine.trackUi('quick_shop_purchase', { id: up.id, kind: 'upgrade' })
                  if (badge === 'RECOMMENDED' || badge === 'BEST_VALUE') {
                    engine.trackUi('recommended_purchase', { id: up.id })
                  }
                }
              }}
            >
              {level >= up.maxLevel ? 'MAX' : formatNumber(cost)}
            </button>
          </div>
        )
      })}
      <button className="ghost-btn" style={{ width: '100%', marginTop: 8 }} onClick={onFullShop}>
        FULL SHOP
      </button>
      <div className="meta-line" style={{ marginTop: 8 }}>
        Buy multiplier in shop: x{ECONOMY.buyMultipliers[Math.min(2, snap.save.buyMultiplierIndex)]}
      </div>
    </div>
  )
}
