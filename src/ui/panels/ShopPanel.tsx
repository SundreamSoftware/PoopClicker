import { useMemo, useState } from 'react'
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
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

export function ShopPanel() {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const [section, setSection] = useState<'generators' | 'upgrades'>('generators')
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

  return (
    <div className="panel">
      <h2>Shop</h2>
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
                onClick={() => engine.buyGenerator(gen.id)}
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
                onClick={() => engine.buyUpgrade(up.id)}
              >
                {level >= up.maxLevel ? 'MAX' : locked ? 'Locked' : formatNumber(cost)}
              </button>
            </div>
          )
        })}
    </div>
  )
}
