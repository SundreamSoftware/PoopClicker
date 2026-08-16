import type { ReactNode } from 'react'
import { ECONOMY } from '../../core/economy/formulas'
import { ROYAL_FLUSH_BY_ID } from '../../content/royalFlush'
import {
  AUTO_BUY,
  AUTO_BUY_SPEED_NODE_ID,
  AUTO_BUY_STRATEGIES,
  autoBuyIntervalMsForSave,
  autoBuySpeedGtpCost,
  autoBuySpeedLevelFromSave,
} from '../../core/systems/autoBuy'
import type { ShopBadge } from '../../core/systems/shopAdvisor'
import type { AutoBuyStrategy } from '../../core/types/gameTypes'
import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'

export const SHOP_SECTIONS = ['production', 'upgrades', 'powerups', 'premium'] as const
export type ShopSection = (typeof SHOP_SECTIONS)[number]

export const UPGRADE_GROUP_LABEL: Record<'tap' | 'combo' | 'crit' | 'idle', string> = {
  tap: 'TAP',
  combo: 'COMBO / FRENZY',
  crit: 'CRIT',
  idle: 'IDLE / GENERATORS',
}

export function ProgressionBadge({ kind }: { kind: 'run' | 'permanent' }) {
  return (
    <span
      className={`prog-badge prog-badge-${kind}`}
      title={kind === 'run' ? 'Resets on Flush' : 'Keeps after Flush'}
    >
      {kind === 'run' ? '↻ RUN' : '∞ PERMANENT'}
    </span>
  )
}

export function ShopBadgeChip({ badge }: { badge: ShopBadge | null }) {
  if (!badge) return null
  const label =
    badge === 'BEST_VALUE'
      ? 'BEST VALUE'
      : badge === 'BEST_TAP'
        ? 'BEST TAP'
        : badge === 'BEST_IDLE'
          ? 'BEST IDLE'
          : badge === 'MILESTONE'
            ? 'MILESTONE'
            : 'RECOMMENDED'
  return <span className={`shop-badge shop-badge-${badge.toLowerCase()}`}>{label}</span>
}

export function BuyMultiplierControl() {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  return (
    <div className="shop-sticky-mult" role="group" aria-label="Buy multiplier">
      <span className="shop-sticky-label">BUY</span>
      {ECONOMY.buyMultipliers.map((mult, index) => (
        <button
          key={mult}
          type="button"
          className={snap.save.buyMultiplierIndex === index ? 'active' : ''}
          onClick={() => engine.setBuyMultiplierIndex(index)}
        >
          x{mult}
        </button>
      ))}
      <button
        type="button"
        className={snap.save.buyMultiplierIndex >= 3 ? 'active' : ''}
        onClick={() => engine.setBuyMultiplierIndex(3)}
      >
        MAX
      </button>
    </div>
  )
}

export function AutoBuyCompact({ onOpen }: { onOpen: () => void }) {
  const snap = useGameSnapshot()
  if (!snap.save.autoBuyUnlocked) {
    return (
      <button type="button" className="auto-compact locked" onClick={onOpen}>
        AUTO
      </button>
    )
  }
  return (
    <button
      type="button"
      className={`auto-compact ${snap.save.autoBuyEnabled ? 'on' : 'off'}`}
      onClick={onOpen}
      aria-pressed={snap.save.autoBuyEnabled}
    >
      AUTO: {snap.save.autoBuyEnabled ? 'ON' : 'OFF'}
    </button>
  )
}

const STRATEGY_LABEL: Record<AutoBuyStrategy, string> = {
  balanced: 'BALANCED',
  production: 'PRODUCTION',
  tap: 'TAP',
  smart: 'SMART',
}

export function AutoBuySheetBody() {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()
  const speed = autoBuySpeedLevelFromSave(snap.save)
  const interval = autoBuyIntervalMsForSave(snap.save) / 1000
  const gtpCost = autoBuySpeedGtpCost(speed)

  return (
    <div className="auto-buy-sheet">
      <p className="meta-line">
        Buys one unlocked affordable item every {interval}s. Survives Flush.
      </p>
      {!snap.save.autoBuyUnlocked ? (
        <div className="list-row">
          <div>
            <strong>Unlock Auto-Buy</strong>
            <div className="meta-line">
              {ECONOMY.autoBuyGtpCost} GTP, or Convenience Pack after first Flush.
            </div>
          </div>
          <button
            className="primary-btn"
            disabled={snap.save.gtp < ECONOMY.autoBuyGtpCost}
            onClick={() => engine.buyAutoBuy()}
          >
            {ECONOMY.autoBuyGtpCost} GTP
          </button>
        </div>
      ) : (
        <>
          <label className="list-row">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={snap.save.autoBuyEnabled}
              onChange={(e) => engine.setAutoBuyEnabled(e.target.checked)}
            />
          </label>
          <label className="list-row">
            <span>Generators</span>
            <input
              type="checkbox"
              checked={snap.save.autoBuyPreferences.generators}
              onChange={(e) => engine.setAutoBuyPreferences({ generators: e.target.checked })}
            />
          </label>
          <label className="list-row">
            <span>Upgrades</span>
            <input
              type="checkbox"
              checked={snap.save.autoBuyPreferences.upgrades}
              onChange={(e) => engine.setAutoBuyPreferences({ upgrades: e.target.checked })}
            />
          </label>
          <div className="shop-sticky-mult" role="group" aria-label="Auto-Buy strategy">
            {AUTO_BUY_STRATEGIES.map((strategy) => (
              <button
                key={strategy}
                type="button"
                className={snap.save.autoBuyStrategy === strategy ? 'active' : ''}
                onClick={() => engine.setAutoBuyStrategy(strategy)}
              >
                {STRATEGY_LABEL[strategy]}
              </button>
            ))}
          </div>
          <div className="list-row">
            <div>
              <strong>Turbo Servo</strong>
              <ProgressionBadge kind="permanent" />
              <div className="meta-line">
                Lv {speed}/{AUTO_BUY.maxSpeedLevel} · {interval}s
                {speed < AUTO_BUY.maxSpeedLevel ? ` → ${interval - 1}s` : ' · maxed'}
              </div>
            </div>
            {speed < AUTO_BUY.maxSpeedLevel && (
              <button
                className="primary-btn"
                disabled={
                  snap.save.flushCount < 1 ||
                  snap.save.flushPower <
                    (ROYAL_FLUSH_BY_ID[AUTO_BUY_SPEED_NODE_ID]?.baseCost ?? 20) ||
                  snap.save.gtp < gtpCost
                }
                onClick={() => engine.buyAutoBuySpeed()}
              >
                {gtpCost} GTP
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function formatCooldown(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.ceil(seconds / 60)}m`
}

export function BoostsList({ heading }: { heading?: ReactNode }) {
  const { engine, ads } = useGameContext()
  const snap = useGameSnapshot()
  const incomeBoostCooldown = engine.getRewardedCooldownRemaining('income_boost')
  const instantPpsCooldown = engine.getRewardedCooldownRemaining('instant_pps')
  const goldenSpawnCooldown = engine.getRewardedCooldownRemaining('golden_spawn')
  const eventRetryCooldown = engine.getRewardedCooldownRemaining('event_retry')

  return (
    <div>
      {heading}
      <div className="list-row">
        <div>
          <strong>2× Idle</strong>
          <div className="meta-line">5 minutes</div>
        </div>
        <button
          className="ghost-btn"
          disabled={incomeBoostCooldown > 0}
          onClick={async () => {
            if (!engine.canApplyRewarded('income_boost').ok) return
            const ad = await ads.showRewarded('income_boost')
            if (ad.ok) engine.applyRewardedIncomeBoost()
          }}
        >
          {incomeBoostCooldown > 0 ? formatCooldown(incomeBoostCooldown) : 'Watch Ad'}
        </button>
      </div>
      <div className="list-row">
        <div>
          <strong>Instant PPS</strong>
          <div className="meta-line">1 minute of idle PP</div>
        </div>
        <button
          className="ghost-btn"
          disabled={instantPpsCooldown > 0}
          onClick={async () => {
            if (!engine.canApplyRewarded('instant_pps').ok) return
            const ad = await ads.showRewarded('instant_pps')
            if (ad.ok) engine.applyRewardedInstantPps()
          }}
        >
          {instantPpsCooldown > 0 ? formatCooldown(instantPpsCooldown) : 'Watch Ad'}
        </button>
      </div>
      <div className="list-row">
        <div>
          <strong>Golden Poop Shower</strong>
          <div className="meta-line">30 poops · 15s</div>
        </div>
        <button
          className="ghost-btn"
          disabled={goldenSpawnCooldown > 0 || Boolean(snap.eventRuntime)}
          onClick={async () => {
            if (!engine.canApplyRewarded('golden_spawn').ok) return
            const ad = await ads.showRewarded('golden_spawn')
            if (ad.ok) engine.spawnEvent('golden_rain', { rewarded: true })
          }}
        >
          {goldenSpawnCooldown > 0 ? formatCooldown(goldenSpawnCooldown) : 'Watch Ad'}
        </button>
      </div>
      <div className="list-row">
        <div>
          <strong>Event Retry</strong>
          <div className="meta-line">Force the next event soon</div>
        </div>
        <button
          className="ghost-btn"
          disabled={eventRetryCooldown > 0}
          onClick={async () => {
            if (!engine.canApplyRewarded('event_retry').ok) return
            const ad = await ads.showRewarded('event_retry')
            if (ad.ok) engine.applyRewardedEventRetry()
          }}
        >
          {eventRetryCooldown > 0 ? formatCooldown(eventRetryCooldown) : 'Watch Ad'}
        </button>
      </div>
    </div>
  )
}
