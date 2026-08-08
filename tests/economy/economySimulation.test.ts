import { describe, expect, it, vi } from 'vitest'
import { GENERATORS } from '../../src/content/generators'
import { UPGRADES } from '../../src/content/upgrades'
import {
  ECONOMY,
  flushPowerGain,
  flushPowerMultiplier,
  geometricCost,
} from '../../src/core/economy/formulas'
import { GameEngine } from '../../src/core/GameEngine'
import { LargeNumber } from '../../src/core/numbers/LargeNumber'
import { createDefaultSave } from '../../src/core/save/defaultSave'
import { buildFlushPreview } from '../../src/core/systems/flush'
import { FixedClock } from '../../src/core/time/TimeService'

/** Deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const ACTIVE_TAPS_PER_SEC = 5
const TAP_INTERVAL_MS = Math.round(1000 / ACTIVE_TAPS_PER_SEC)
const PURCHASE_CHECK_MS = 2_000
const SIM_SEED = 0x7a1c2026

interface SimMetrics {
  profile: string
  tapPower: number
  pps: number
  nextGeneratorCost: number
  nextUpgradeCost: number
  timeToNextPurchaseSec: number
  estTimeToFlushSec: number
  flushPowerGain: number
  postFlushImprovement: number
  gtpPerHour: number
  unlockPacing: number
}

function effectiveIncome(tapPower: number, pps: number): number {
  return pps + tapPower * ACTIVE_TAPS_PER_SEC
}

function nextGeneratorCost(save: ReturnType<GameEngine['exportSave']>): number {
  let best = Number.POSITIVE_INFINITY
  for (const gen of GENERATORS) {
    if ((gen.unlockFlushCount ?? 0) > save.flushCount) continue
    const level = save.generators[gen.id] ?? 0
    const cost = geometricCost(LargeNumber.from(gen.baseCost), gen.costGrowth, level).toNumber()
    if (cost < best) best = cost
  }
  return Number.isFinite(best) ? best : 0
}

function nextUpgradeCost(save: ReturnType<GameEngine['exportSave']>): number {
  const next = UPGRADES.find((u) => {
    const level = save.purchasedRunUpgrades[u.id] ?? 0
    if (level >= u.maxLevel) return false
    if ((u.requiresFlushCount ?? 0) > save.flushCount) return false
    if (u.requiresWorldId && !save.unlockedWorlds.includes(u.requiresWorldId)) return false
    if (u.requiresUpgradeId && !(save.purchasedRunUpgrades[u.requiresUpgradeId] > 0)) return false
    if (u.requiresAchievementId && !save.achievements[u.requiresAchievementId]?.completed) {
      return false
    }
    return true
  })
  if (!next) return 0
  const level = save.purchasedRunUpgrades[next.id] ?? 0
  return geometricCost(LargeNumber.from(next.baseCost), next.costGrowth, level).toNumber()
}

function unlockPacing(save: ReturnType<GameEngine['exportSave']>): number {
  const unlocked = GENERATORS.filter((g) => (g.unlockFlushCount ?? 0) <= save.flushCount)
  if (unlocked.length === 0) return 0
  const owned = unlocked.filter((g) => (save.generators[g.id] ?? 0) > 0).length
  return owned / unlocked.length
}

function collectMetrics(engine: GameEngine, profile: string): SimMetrics {
  const snap = engine.getSnapshot()
  const save = snap.save
  const production = snap.production
  const tapPower = production.tapPower.toNumber()
  const pps = production.pps.toNumber()
  const income = effectiveIncome(tapPower, pps)
  const genCost = nextGeneratorCost(save)
  const upCost = nextUpgradeCost(save)
  const nextCost = Math.min(genCost || Number.POSITIVE_INFINITY, upCost || Number.POSITIVE_INFINITY)
  const runEarned = LargeNumber.deserialize(save.runPPEarned).toNumber()
  const flushRemaining = Math.max(0, ECONOMY.firstFlushRequirement - runEarned)
  const preview = buildFlushPreview(save, engine.getSnapshot().save.lastSaveTimestamp || Date.now())
  const postGlobal = flushPowerMultiplier(save.flushPower + preview.flushPowerGain)
  const preGlobal = flushPowerMultiplier(save.flushPower)
  const playHours = Math.max(1 / 3600, save.totalPlayTimeMs / 3_600_000)

  return {
    profile,
    tapPower,
    pps,
    nextGeneratorCost: genCost,
    nextUpgradeCost: upCost,
    timeToNextPurchaseSec: income > 0 ? nextCost / income : Number.POSITIVE_INFINITY,
    estTimeToFlushSec: income > 0 ? flushRemaining / income : Number.POSITIVE_INFINITY,
    flushPowerGain: preview.flushPowerGain,
    postFlushImprovement: preGlobal > 0 ? postGlobal / preGlobal : 1,
    gtpPerHour: save.gtp / playHours,
    unlockPacing: unlockPacing(save),
  }
}

function tryPurchases(engine: GameEngine): void {
  for (const up of UPGRADES) {
    const result = engine.buyUpgrade(up.id)
    if (result.ok) return
  }
  for (const gen of GENERATORS) {
    const result = engine.buyGenerator(gen.id)
    if (result.ok) return
  }
}

function simulateActivePlay(
  clock: FixedClock,
  engine: GameEngine,
  durationMs: number,
  tapIntervalMs = TAP_INTERVAL_MS,
): void {
  const endAt = clock.now() + durationMs
  let nextPurchaseCheck = clock.now() + PURCHASE_CHECK_MS
  while (clock.now() < endAt) {
    engine.tap()
    clock.advance(tapIntervalMs)
    engine.tick(tapIntervalMs)
    if (clock.now() >= nextPurchaseCheck) {
      tryPurchases(engine)
      nextPurchaseCheck = clock.now() + PURCHASE_CHECK_MS
    }
  }
}

function createSimEngine(now = Date.UTC(2026, 0, 15, 12)): GameEngine {
  const clock = new FixedClock(now)
  const save = {
    ...createDefaultSave(now),
    nextRandomEventAt: now + 7 * 24 * 60 * 60 * 1000,
  }
  return new GameEngine({ clock, save, storage: null })
}

function installDeterministicRng(seed = SIM_SEED): () => void {
  const rng = mulberry32(seed)
  const spy = vi.spyOn(Math, 'random').mockImplementation(rng)
  return () => spy.mockRestore()
}

function engineAtFlushCount(flushCount: number, now = Date.UTC(2026, 0, 15, 12)): GameEngine {
  const clock = new FixedClock(now)
  let flushPower = 0
  for (let i = 0; i < flushCount; i++) {
    flushPower += flushPowerGain(LargeNumber.from(ECONOMY.firstFlushRequirement * (1 + i * 0.12)))
  }
  const save = {
    ...createDefaultSave(now),
    flushCount,
    flushPower,
    autoBuyUnlocked: flushCount >= 5,
    permanentProductionBonus: flushCount >= 100 ? 0.5 : flushCount >= 50 ? 0.25 : 0,
    generators: {
      plunger_intern: 12 + flushCount * 6,
      fiber_farmer: Math.max(0, flushCount * 2 - 2),
      bathroom_bard: flushCount >= 10 ? Math.floor(flushCount * 1.5) : 0,
      portapotty_fleet: flushCount >= 25 ? Math.floor(flushCount * 0.8) : 0,
    },
    purchasedRunUpgrades: {
      more_fiber: Math.min(20, 3 + Math.floor(flushCount / 2)),
      premium_fiber: flushCount >= 3 ? Math.min(10, Math.floor(flushCount / 3)) : 0,
      questionable_burrito: flushCount >= 8 ? 2 : 0,
    },
    gtp: flushCount * 4,
    totalPlayTimeMs: flushCount * 45 * 60 * 1000,
    nextRandomEventAt: now + 7 * 24 * 60 * 60 * 1000,
  }
  return new GameEngine({ clock, save, storage: null })
}

function simulateUntilFirstFlush(engine: GameEngine, clock: FixedClock): number {
  const start = clock.now()
  const maxMs = 3 * 60 * 60 * 1000
  let elapsed = 0
  while (!engine.getSnapshot().canFlush && elapsed < maxMs) {
    const chunk = Math.min(60_000, maxMs - elapsed)
    simulateActivePlay(clock, engine, chunk, 400)
    elapsed += chunk
  }
  return (clock.now() - start) / 1000
}

describe('Economy simulation (deterministic)', () => {
  it('profiles pacing metrics with conscious ranges', () => {
    const restore = installDeterministicRng()
    const now = Date.UTC(2026, 0, 15, 12)
    const profiles: Array<{ name: string; engine: GameEngine }> = []

    profiles.push({ name: 'new_player', engine: createSimEngine(now) })

    const tenMinClock = new FixedClock(now)
    const tenMinEngine = createSimEngine(now)
    simulateActivePlay(tenMinClock, tenMinEngine, 10 * 60 * 1000)
    profiles.push({ name: '10min', engine: tenMinEngine })

    const thirtyMinClock = new FixedClock(now)
    const thirtyMinEngine = createSimEngine(now)
    simulateActivePlay(thirtyMinClock, thirtyMinEngine, 30 * 60 * 1000)
    profiles.push({ name: '30min', engine: thirtyMinEngine })

    const firstFlushClock = new FixedClock(now)
    const firstFlushEngine = createSimEngine(now)
    const secondsToFirstFlush = simulateUntilFirstFlush(firstFlushEngine, firstFlushClock)
    profiles.push({ name: 'first_flush_ready', engine: firstFlushEngine })

    for (const count of [1, 3, 5, 10, 25, 50, 100] as const) {
      profiles.push({ name: `flush_${count}`, engine: engineAtFlushCount(count, now) })
    }

    const results = Object.fromEntries(
      profiles.map(({ name, engine }) => [name, collectMetrics(engine, name)]),
    ) as Record<string, SimMetrics>

    // New player can tap immediately
    expect(results.new_player.tapPower).toBeGreaterThan(0)

    // First purchase should arrive quickly for active new player (≤ ~2 min)
    expect(results['10min'].timeToNextPurchaseSec).toBeLessThan(120)
    expect(results['10min'].nextGeneratorCost).toBeGreaterThan(0)

    // First flush wall: not trivial (<30s) and not a 3+ hour wall for active play
    expect(secondsToFirstFlush).toBeGreaterThanOrEqual(30)
    expect(secondsToFirstFlush).toBeLessThan(3 * 60 * 60)

    // First flush preview gain is meaningful
    expect(results.first_flush_ready.flushPowerGain).toBeGreaterThanOrEqual(
      flushPowerGain(LargeNumber.from(ECONOMY.firstFlushRequirement)),
    )

    // Post-flush always improves global multiplier
    for (const key of Object.keys(results)) {
      expect(results[key].postFlushImprovement).toBeGreaterThanOrEqual(1)
    }

    // Mid/late production beats early idle
    expect(results.flush_25.pps).toBeGreaterThan(results['10min'].pps)
    expect(results.flush_100.pps).toBeGreaterThan(results.flush_10.pps)

    // Late game: no hard wall — next purchase within ~30 min active income
    expect(results.flush_100.timeToNextPurchaseSec).toBeLessThan(30 * 60)
    expect(results.flush_50.timeToNextPurchaseSec).toBeLessThan(45 * 60)

    // Unlock pacing rises with flushes (more generators owned vs new player)
    expect(results.flush_10.unlockPacing).toBeGreaterThan(results.new_player.unlockPacing)
    expect(results.flush_50.unlockPacing).toBeGreaterThan(results.new_player.unlockPacing)

    // GTP accrual stays finite (no runaway hourly rates in sim profiles)
    for (const key of Object.keys(results)) {
      expect(results[key].gtpPerHour).toBeLessThan(5000)
    }

    // Sanity: est time to flush decreases after 30 min vs new
    expect(results['30min'].estTimeToFlushSec).toBeLessThan(results.new_player.estTimeToFlushSec)
    restore()
  }, 120_000)

  it('is reproducible with fixed seed and clock', () => {
    const run = () => {
      const restore = installDeterministicRng()
      const clock = new FixedClock(Date.UTC(2026, 0, 15, 12))
      const engine = createSimEngine(clock.now())
      simulateActivePlay(clock, engine, 5 * 60 * 1000)
      const m = collectMetrics(engine, '5min')
      restore()
      return {
        tapPower: Number(m.tapPower.toFixed(4)),
        pps: Number(m.pps.toFixed(4)),
        nextGeneratorCost: m.nextGeneratorCost,
        nextUpgradeCost: m.nextUpgradeCost,
        timeToNextPurchaseSec: Math.round(m.timeToNextPurchaseSec),
        estTimeToFlushSec: Math.round(m.estTimeToFlushSec),
        flushPowerGain: m.flushPowerGain,
        postFlushImprovement: Number(m.postFlushImprovement.toFixed(4)),
      }
    }
    expect(run()).toEqual(run())
  })
})
