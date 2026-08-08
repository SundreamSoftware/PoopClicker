import { GENERATOR_BY_ID } from '../content/generators'
import { UPGRADES, UPGRADE_BY_ID } from '../content/upgrades'
import { IAP_BY_ID } from '../content/iapProducts'
import { ROYAL_FLUSH_BY_ID } from '../content/royalFlush'
import { WORLDS } from '../content/worlds'
import {
  ECONOMY,
  geometricCost,
  geometricSeriesCost,
  maxAffordableCount,
  offlineCapMs,
} from './economy/formulas'
import { LargeNumber } from './numbers/LargeNumber'
import { createDefaultSave } from './save/defaultSave'
import { deserializeSave, migrateSave, serializeSave } from './save/migrateSave'
import type { PlayerSaveV2 } from './save/saveSchema'
import { FixedClock, SystemClock, TimeService, type Clock } from './time/TimeService'
import type { ClaimResult, NextGoal, OfflineReward, TapSpeedState } from './types/gameTypes'
import type { ActiveEventRuntime } from './types/eventRuntime'
import { scheduleNextRandomEventAt } from './types/eventRuntime'
import { claimAchievement, syncAchievements } from './systems/achievements'
import { decideAutoBuy } from './systems/autoBuy'
import {
  canStartDailyDump,
  createIdleDailyDumpRuntime,
  startDailyDumpRuntime,
  tapDailyDump,
  tickDailyDump,
  type DailyDumpRuntime,
} from './systems/dailyDump'
import {
  claimChallenge,
  claimDailyChest,
  ensureDailyState,
  generateBathroomBreakCharges,
  processStreak,
  progressChallenge,
  rerollChallengeAt,
} from './systems/daily'
import {
  afterEventSchedule,
  bossTap,
  catchTarget,
  computeEventRewards,
  createEventRuntime,
  evaluateEventCompletion,
  pickScheduledEvent,
  tickEventRuntime,
  totalEventRewardMultiplier,
} from './systems/eventSystem'
import { buildFlushPreview, canFlush, performFlush } from './systems/flush'
import { computeProduction, resolveTapSpeedState } from './systems/production'
import { equipSkin, grantEligibleSkins, purchaseSkin } from './systems/skins'
import type { AnalyticsSink } from '../services/analytics'
import { applyIapGrant as applyIapGrantToSave } from '../services/billing'

export interface TapResult {
  gained: LargeNumber
  crit: boolean
  combo: number
  state: TapSpeedState
}

export interface EngineSnapshot {
  save: PlayerSaveV2
  production: ReturnType<typeof computeProduction>
  combo: number
  rollingCps: number
  tapState: TapSpeedState
  offlineReward: OfflineReward | null
  nextGoals: NextGoal[]
  flushPreview: ReturnType<typeof buildFlushPreview>
  canFlush: boolean
  eventRuntime: ActiveEventRuntime | null
  dailyDump: DailyDumpRuntime
  frenzyActive: boolean
}

type Listener = () => void

export class GameEngine {
  private save: PlayerSaveV2
  private readonly time: TimeService
  private combo = 0
  private rollingCps = 0
  private tapState: TapSpeedState = 'idle'
  private tapTimestamps: number[] = []
  private offlineReward: OfflineReward | null = null
  private goldenInSession = 0
  private absenceMs = 0
  private flushWithCorny = 0
  private lastTickAt: number
  private dirty = false
  private readonly listeners = new Set<Listener>()
  private readonly analytics: AnalyticsSink
  private readonly storageKey: string
  private storage: Storage | null
  private eventRuntime: ActiveEventRuntime | null = null
  private dailyDumpRuntime = createIdleDailyDumpRuntime()
  private lastAutoBuyAt = 0
  private frenzyStartedAt = 0
  private frenzyActiveUntil = 0
  private firstTapTracked = false
  private lastPersistAt = 0
  private cachedSnapshot: EngineSnapshot | null = null
  private uiVersion = 0
  private lastUiEmitAt = 0

  constructor(
    options: {
      clock?: Clock
      save?: PlayerSaveV2
      analytics?: AnalyticsSink
      storageKey?: string
      storage?: Storage | null
    } = {},
  ) {
    this.time = new TimeService(options.clock ?? new SystemClock())
    const now = this.time.now()
    this.save = options.save ?? createDefaultSave(now)
    this.analytics = options.analytics ?? { track: () => undefined }
    this.storageKey = options.storageKey ?? 'poop_clicker_save_v2'
    this.storage =
      options.storage === undefined
        ? typeof localStorage !== 'undefined'
          ? localStorage
          : null
        : options.storage
    this.lastTickAt = now
    this.bootstrap(now)
    this.cachedSnapshot = this.buildSnapshot()
  }

  static fromStorage(
    storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null,
    clock?: Clock,
  ): GameEngine {
    const key = 'poop_clicker_save_v2'
    const raw = storage?.getItem(key)
    const now = (clock ?? new SystemClock()).now()
    const save = raw ? deserializeSave(raw, now) : createDefaultSave(now)
    return new GameEngine({ clock, save, storage })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(force = true): void {
    this.cachedSnapshot = this.buildSnapshot()
    this.uiVersion += 1
    if (force) this.lastUiEmitAt = this.time.now()
    for (const listener of this.listeners) listener()
  }

  /** Throttled UI notify for high-frequency ticks (keeps getSnapshot referentially stable between emits). */
  private emitUiThrottled(now: number, minIntervalMs = 100): void {
    if (now - this.lastUiEmitAt < minIntervalMs) return
    this.emit(true)
  }

  private bootstrap(now: number): void {
    if (this.save.nextRandomEventAt === 0) {
      this.save = {
        ...this.save,
        nextRandomEventAt: scheduleNextRandomEventAt(now, 0, this.save.flushCount),
      }
    }
    this.save = { ...this.save, sessionsCount: this.save.sessionsCount + 1 }

    const away = Math.max(0, now - this.save.lastActiveTimestamp)
    this.absenceMs = away
    this.save = generateBathroomBreakCharges(
      this.save,
      now,
      ECONOMY.bathroomBreakIntervalMs,
      ECONOMY.bathroomBreakMaxCharges,
    )
    const production = computeProduction(this.save, 0, now)
    this.save = ensureDailyState(this.save, now, production.pps)

    if (away > 5_000) {
      const capped = Math.min(away, offlineCapMs(production.offlineCapHoursBonus))
      const earned = production.pps.mul(capped / 1000)
      if (earned.gt(0)) {
        this.offlineReward = { awayMs: capped, earned, claimed: false }
      }
    }

    if (this.save.activeEvent && !this.eventRuntime) {
      const hydrated = createEventRuntime(
        this.save.activeEvent.defId,
        this.save.activeEvent.startedAt,
        this.save.flushCount,
      )
      if (hydrated) {
        this.eventRuntime = {
          ...hydrated,
          taps: this.save.activeEvent.taps,
          tapTarget: this.save.activeEvent.tapTarget,
          completed: this.save.activeEvent.completed,
          failed: this.save.activeEvent.failed,
          rewardClaimed: this.save.activeEvent.rewardClaimed,
          endsAt: this.save.activeEvent.endsAt,
        }
      }
    }

    this.syncMeta(now)
  }

  getSnapshot(): EngineSnapshot {
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = this.buildSnapshot()
    }
    return this.cachedSnapshot
  }

  private buildSnapshot(): EngineSnapshot {
    const now = this.time.now()
    const production = computeProduction(this.save, this.combo, now)
    const frenzyActive = now < this.frenzyActiveUntil
    return {
      save: this.save,
      production,
      combo: this.combo,
      rollingCps: this.rollingCps,
      tapState: this.tapState,
      offlineReward: this.offlineReward,
      nextGoals: this.computeNextGoals(production),
      flushPreview: buildFlushPreview(this.save, now),
      canFlush: canFlush(this.save),
      eventRuntime: this.eventRuntime,
      dailyDump: this.dailyDumpRuntime,
      frenzyActive,
    }
  }

  tick(dtMs?: number): void {
    const now = this.time.now()
    const dt = dtMs ?? Math.min(1000, Math.max(0, now - this.lastTickAt))
    this.lastTickAt = now
    if (dt <= 0) return

    this.combo = Math.max(0, this.combo - (this.getProduction().comboDecay * dt) / 1000)
    this.updateCps(now)
    this.save = generateBathroomBreakCharges(
      this.save,
      now,
      ECONOMY.bathroomBreakIntervalMs,
      ECONOMY.bathroomBreakMaxCharges,
    )

    const production = this.getProduction()
    if (production.pps.gt(0)) {
      this.creditPP(production.pps.mul(dt / 1000), 'idle')
    }

    if (this.save.currentWorldId === 'office_toilet') {
      this.save = { ...this.save, officeSessionMs: this.save.officeSessionMs + dt }
    }

    this.save = {
      ...this.save,
      totalPlayTimeMs: this.save.totalPlayTimeMs + dt,
      lastActiveTimestamp: now,
      activeBoosts: this.save.activeBoosts.filter((b) => b.expiresAt > now),
    }

    this.dailyDumpRuntime = tickDailyDump(this.dailyDumpRuntime, now, dt)

    if (this.save.autoBuyUnlocked && this.save.autoBuyEnabled && now - this.lastAutoBuyAt >= 1500) {
      this.lastAutoBuyAt = now
      const decision = decideAutoBuy(this.save)
      if (decision) {
        if (decision.kind === 'generator') {
          this.buyGenerator(decision.id, decision.count)
        } else {
          this.buyUpgrade(decision.id)
        }
      }
    }

    this.processScheduledEvents(now, dt)
    this.syncMeta(now)
    this.maybePersist(now)
    // Invalidate cache so next forced read is fresh; notify React at ~10Hz.
    this.emitUiThrottled(now)
  }

  tap(): TapResult {
    const now = this.time.now()
    this.tapTimestamps.push(now)
    this.updateCps(now)
    const production = this.getProduction()
    this.combo = Math.min(production.comboMax, this.combo + 1)
    const crit = Math.random() < production.critChance
    let gained = production.tapPower
    if (crit) {
      gained = gained.mul(production.critMultiplier)
      this.save = { ...this.save, critCount: this.save.critCount + 1 }
      this.save = progressChallenge(this.save, 'crit_taps', 1)
    }

    if (
      this.eventRuntime &&
      (this.eventRuntime.type === 'clogged_toilet' || this.eventRuntime.type === 'mega_clog')
    ) {
      this.eventRuntime = bossTap(this.eventRuntime)
      this.syncActiveEventFromRuntime()
      if (this.eventRuntime.completed && !this.eventRuntime.rewardClaimed) {
        this.grantEventSuccess()
      }
    }

    this.creditPP(gained, 'tap')
    this.save = {
      ...this.save,
      tapCount: this.save.tapCount + 1,
      sessionTapCount: this.save.sessionTapCount + 1,
      highestCPS: Math.max(this.save.highestCPS, this.rollingCps),
    }
    this.save = progressChallenge(this.save, 'taps', 1)
    this.save = progressChallenge(this.save, 'tap_pp', gained.toNumber())
    this.save = progressChallenge(this.save, 'cps', this.rollingCps)
    this.save = progressChallenge(this.save, 'combo', this.combo)

    const wasFrenzy = now < this.frenzyActiveUntil
    if (this.rollingCps >= production.frenzyThreshold) {
      if (!wasFrenzy) {
        this.frenzyStartedAt = now
        this.analytics.track('frenzy_started', {})
      }
      this.frenzyActiveUntil = Math.max(
        this.frenzyActiveUntil,
        now + (8_000 + production.frenzyDurationBonus * 1000),
      )
      this.save = progressChallenge(this.save, 'frenzy', 1)
    }

    if (!this.firstTapTracked) {
      this.firstTapTracked = true
      this.analytics.track('first_tap', {})
    }
    this.analytics.track('tap', {})

    this.tapState = resolveTapSpeedState(this.rollingCps, this.tapState, production.frenzyThreshold)
    this.syncMeta(now)
    this.dirty = true
    this.emit()
    return { gained, crit, combo: this.combo, state: this.tapState }
  }

  private creditPP(amount: LargeNumber, source: 'tap' | 'idle' | 'reward'): void {
    if (amount.lte(0)) return
    const currentPP = LargeNumber.deserialize(this.save.currentPP).add(amount)
    const runPPEarned = LargeNumber.deserialize(this.save.runPPEarned).add(amount)
    const lifetimePPEarned = LargeNumber.deserialize(this.save.lifetimePPEarned).add(amount)
    this.save = {
      ...this.save,
      currentPP: currentPP.serialize(),
      runPPEarned: runPPEarned.serialize(),
      lifetimePPEarned: lifetimePPEarned.serialize(),
      highestPPS: LargeNumber.max(
        LargeNumber.deserialize(this.save.highestPPS),
        this.getProduction().pps,
      ).serialize(),
    }
    if (source === 'idle') {
      this.save = progressChallenge(this.save, 'idle_pp', amount.toNumber())
    }
  }

  private updateCps(now: number): void {
    const windowMs = 1000
    this.tapTimestamps = this.tapTimestamps.filter((t) => now - t <= windowMs)
    const instant = this.tapTimestamps.length
    this.rollingCps = this.rollingCps * 0.7 + instant * 0.3
  }

  private getProduction() {
    return computeProduction(this.save, this.combo, this.time.now())
  }

  buyGenerator(generatorId: string, count?: number): ClaimResult {
    const def = GENERATOR_BY_ID[generatorId]
    if (!def) return { ok: false, reason: 'missing' }
    const level = this.save.generators[generatorId] ?? 0
    const balance = LargeNumber.deserialize(this.save.currentPP)
    if (
      def.unlockPP &&
      balance.lt(def.unlockPP) &&
      level === 0 &&
      LargeNumber.deserialize(this.save.lifetimePPEarned).lt(def.unlockPP)
    ) {
      // soft gate using lifetime for unlock visibility
    }
    if ((def.unlockFlushCount ?? 0) > this.save.flushCount) {
      return { ok: false, reason: 'flush_locked' }
    }

    const requested =
      count ??
      (ECONOMY.buyMultipliers[this.save.buyMultiplierIndex] === undefined
        ? 1
        : ECONOMY.buyMultipliers[this.save.buyMultiplierIndex])
    const buyCount =
      this.save.buyMultiplierIndex >= ECONOMY.buyMultipliers.length
        ? maxAffordableCount(balance, LargeNumber.from(def.baseCost), def.costGrowth, level)
        : Math.min(
            requested,
            maxAffordableCount(balance, LargeNumber.from(def.baseCost), def.costGrowth, level),
          )

    if (buyCount <= 0) return { ok: false, reason: 'insufficient_pp' }
    const cost = geometricSeriesCost(
      LargeNumber.from(def.baseCost),
      def.costGrowth,
      level,
      buyCount,
    )
    if (balance.lt(cost)) return { ok: false, reason: 'insufficient_pp' }

    this.save = {
      ...this.save,
      currentPP: balance.sub(cost).serialize(),
      generators: { ...this.save.generators, [generatorId]: level + buyCount },
      tutorialFlags: { ...this.save.tutorialFlags, generators: true },
    }
    this.save = progressChallenge(this.save, 'generator_levels', buyCount)
    this.save = progressChallenge(this.save, 'spend_pp', cost.toNumber())
    this.save = progressChallenge(this.save, 'generator_level', level + buyCount)
    this.applyGeneratorMilestones(generatorId)
    this.syncMeta(this.time.now())
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  private applyGeneratorMilestones(generatorId: string): void {
    const def = GENERATOR_BY_ID[generatorId]
    if (!def) return
    const level = this.save.generators[generatorId] ?? 0
    const claimed = new Set(this.save.claimedGeneratorMilestones[generatorId] ?? [])
    let changed = false
    for (const milestone of def.milestones) {
      if (level >= milestone.level && !claimed.has(milestone.level)) {
        claimed.add(milestone.level)
        changed = true
      }
    }
    if (changed) {
      this.save = {
        ...this.save,
        claimedGeneratorMilestones: {
          ...this.save.claimedGeneratorMilestones,
          [generatorId]: Array.from(claimed).sort((a, b) => a - b),
        },
      }
    }
  }

  buyUpgrade(upgradeId: string): ClaimResult {
    const def = UPGRADE_BY_ID[upgradeId]
    if (!def) return { ok: false, reason: 'missing' }
    const level = this.save.purchasedRunUpgrades[upgradeId] ?? 0
    if (level >= def.maxLevel) return { ok: false, reason: 'maxed' }
    if ((def.requiresFlushCount ?? 0) > this.save.flushCount) {
      return { ok: false, reason: 'flush_locked' }
    }
    if (def.requiresWorldId && !this.save.unlockedWorlds.includes(def.requiresWorldId)) {
      return { ok: false, reason: 'world_locked' }
    }
    if (def.requiresUpgradeId && !(this.save.purchasedRunUpgrades[def.requiresUpgradeId] > 0)) {
      return { ok: false, reason: 'upgrade_locked' }
    }
    if (
      def.requiresAchievementId &&
      !this.save.achievements[def.requiresAchievementId]?.completed
    ) {
      return { ok: false, reason: 'achievement_locked' }
    }

    const cost = geometricCost(LargeNumber.from(def.baseCost), def.costGrowth, level)
    const balance = LargeNumber.deserialize(this.save.currentPP)
    if (balance.lt(cost)) return { ok: false, reason: 'insufficient_pp' }

    this.save = {
      ...this.save,
      currentPP: balance.sub(cost).serialize(),
      purchasedRunUpgrades: {
        ...this.save.purchasedRunUpgrades,
        [upgradeId]: level + 1,
      },
    }
    this.save = progressChallenge(this.save, 'upgrades', 1)
    this.save = progressChallenge(this.save, 'spend_pp', cost.toNumber())
    this.syncMeta(this.time.now())
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  setBuyMultiplierIndex(index: number): void {
    this.save = { ...this.save, buyMultiplierIndex: Math.max(0, Math.min(3, index)) }
    this.emit()
  }

  flush(): ClaimResult {
    const result = performFlush(this.save, this.time.now())
    if (!result.ok) return { ok: false, reason: result.reason }
    if (this.save.equippedSkinId === 'corny_poop') this.flushWithCorny += 1
    this.save = result.save
    this.combo = 0
    this.save = progressChallenge(this.save, 'flush', 1)
    this.analytics.track('flush', {
      flushPowerGain: result.preview.flushPowerGain,
      flushCount: this.save.flushCount,
    })
    this.analytics.track('flush_power_gain', { amount: result.preview.flushPowerGain })
    this.syncMeta(this.time.now())
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  claimOffline(double = false): ClaimResult {
    if (!this.offlineReward || this.offlineReward.claimed) {
      return { ok: false, reason: 'nothing' }
    }
    const earned = double ? this.offlineReward.earned.mul(2) : this.offlineReward.earned
    this.creditPP(earned, 'reward')
    this.offlineReward = { ...this.offlineReward, claimed: true }
    this.analytics.track('offline_reward_claim', { double, amount: earned.toNumber() })
    this.persistImmediate()
    this.emit()
    return { ok: true, pp: earned }
  }

  claimStreak(): ClaimResult {
    const result = processStreak(this.save, this.time.now())
    this.save = result.save
    if (result.streakBroken) this.analytics.track('streak_broken', {})
    if (result.saverUsed) this.analytics.track('streak_saver_used', {})
    if (result.claimed)
      this.analytics.track('streak_claim', { day: this.save.dailyStreak, gtp: result.rewardGtp })
    this.persistImmediate()
    this.emit()
    return {
      ok: result.claimed,
      gtp: result.rewardGtp,
      reason: result.claimed ? undefined : 'already_claimed',
    }
  }

  claimDailyChallenge(index: number): ClaimResult {
    const result = claimChallenge(this.save, index, this.time.now())
    this.save = result.save
    if (result.ok) {
      this.analytics.track('daily_challenge_claim', { index, gtp: result.gtp })
      if (this.save.dailyChallenges.every((c) => c.claimed)) {
        this.analytics.track('daily_all_complete', {})
      }
    }
    this.save = grantEligibleSkins(this.save)
    this.persistImmediate()
    this.emit()
    return { ok: result.ok, gtp: result.gtp, reason: result.reason }
  }

  claimDailyChestReward(): ClaimResult {
    const result = claimDailyChest(this.save)
    this.save = result.save
    this.persistImmediate()
    this.emit()
    return { ok: result.ok, gtp: result.gtp, reason: result.reason }
  }

  rerollDailyChallenge(index: number, fromRewardedAd = false): ClaimResult {
    if (!fromRewardedAd) return { ok: false, reason: 'ad_required' }
    if (this.save.dailyRerollsUsed >= 1) return { ok: false, reason: 'limit' }
    const production = this.getProduction()
    this.save = rerollChallengeAt(this.save, index, this.time.now(), production.pps)
    this.save = { ...this.save, dailyRerollsUsed: this.save.dailyRerollsUsed + 1 }
    this.analytics.track('rewarded_ad_complete', { placement: 'daily_reroll' })
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  claimBathroomBreak(choice: 'pp' | 'tap_boost'): ClaimResult {
    if (this.save.bathroomBreakCharges <= 0) return { ok: false, reason: 'empty' }
    const now = this.time.now()
    this.save = {
      ...this.save,
      bathroomBreakCharges: this.save.bathroomBreakCharges - 1,
      bathroomBreakClaimsTotal: this.save.bathroomBreakClaimsTotal + 1,
    }
    if (choice === 'pp') {
      const amount = this.getProduction().pps.mul(15 * 60)
      this.creditPP(amount, 'reward')
      this.analytics.track('bathroom_break_claim', { choice })
      this.persistImmediate()
      this.emit()
      return { ok: true, pp: amount }
    }
    this.save = {
      ...this.save,
      activeBoosts: [
        ...this.save.activeBoosts,
        {
          id: `bathroom_tap_${now}`,
          label: 'Bathroom Break Tap',
          tapMultiplier: 2,
          idleMultiplier: 1,
          expiresAt: now + 10 * 60_000,
        },
      ],
    }
    this.analytics.track('bathroom_break_claim', { choice })
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  claimAchievementReward(id: string): ClaimResult {
    const result = claimAchievement(this.save, id)
    this.save = result.save
    if (result.ok) this.analytics.track('achievement_claim', { id, gtp: result.gtp })
    this.persistImmediate()
    this.emit()
    return { ok: result.ok, gtp: result.gtp, reason: result.reason }
  }

  buySkin(skinId: string): ClaimResult {
    const result = purchaseSkin(this.save, skinId)
    this.save = result.save
    if (result.ok) this.analytics.track('skin_unlock', { skinId, method: 'gtp' })
    this.persistImmediate()
    this.emit()
    return { ok: result.ok, reason: result.reason, skinId: result.ok ? skinId : undefined }
  }

  equipSkinId(skinId: string): ClaimResult {
    const result = equipSkin(this.save, skinId)
    this.save = result.save
    if (result.ok) this.analytics.track('skin_equip', { skinId })
    this.persistImmediate()
    this.emit()
    return { ok: result.ok, reason: result.reason }
  }

  buyRoyalFlush(nodeId: string): ClaimResult {
    const node = ROYAL_FLUSH_BY_ID[nodeId]
    if (!node) return { ok: false, reason: 'missing' }
    if (this.save.flushCount < 1) return { ok: false, reason: 'locked' }
    if (this.save.flushCount < node.unlockFlushCount) return { ok: false, reason: 'flush_locked' }
    // Flush Power is permanent prestige — required as threshold, never spent.
    if (this.save.flushPower < node.baseCost)
      return { ok: false, reason: 'insufficient_flush_power' }
    for (const req of node.requires) {
      if ((this.save.royalFlushLevels[req] ?? 0) <= 0) return { ok: false, reason: 'requires' }
    }
    const level = this.save.royalFlushLevels[nodeId] ?? 0
    if (level >= node.maxLevel) return { ok: false, reason: 'maxed' }
    const cost = Math.floor(node.baseCost * node.costGrowth ** level)
    // Spendable meta currency only; Flush Power remains permanent.
    if (this.save.gtp < cost) return { ok: false, reason: 'insufficient_gtp' }
    this.save = {
      ...this.save,
      gtp: this.save.gtp - cost,
      royalFlushLevels: { ...this.save.royalFlushLevels, [nodeId]: level + 1 },
    }
    this.analytics.track('royal_flush_upgrade', { nodeId, level: level + 1 })
    this.syncMeta(this.time.now())
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  setWorld(worldId: string): ClaimResult {
    if (!this.save.unlockedWorlds.includes(worldId)) return { ok: false, reason: 'locked' }
    this.save = { ...this.save, currentWorldId: worldId }
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  startDailyDump(): ClaimResult {
    const now = this.time.now()
    if (!canStartDailyDump(this.save, now)) {
      return { ok: false, reason: 'already_played' }
    }
    this.dailyDumpRuntime = startDailyDumpRuntime(now)
    this.save = {
      ...this.save,
      dailyDumpState: {
        ...this.save.dailyDumpState,
        lastPlayedDate: this.time.todayKey(),
        lastScore: 0,
        lastTier: 'none',
        rewardClaimed: false,
      },
    }
    this.analytics.track('daily_dump_start', {})
    this.emit()
    return { ok: true }
  }

  tapDailyDumpChallenge(): void {
    const now = this.time.now()
    this.dailyDumpRuntime = tickDailyDump(this.dailyDumpRuntime, now)
    if (this.dailyDumpRuntime.phase === 'running') {
      this.dailyDumpRuntime = tapDailyDump(this.dailyDumpRuntime, now)
    }
    this.dirty = true
    this.emit()
  }

  claimDailyDumpReward(): ClaimResult {
    if (this.dailyDumpRuntime.phase !== 'finished') {
      return { ok: false, reason: 'not_finished' }
    }
    if (this.save.dailyDumpState.rewardClaimed) {
      return { ok: false, reason: 'already_claimed' }
    }
    const { score, rewardTier: tier, gtpReward: gtp } = this.dailyDumpRuntime
    this.save = {
      ...this.save,
      gtp: this.save.gtp + gtp,
      dailyDumpState: {
        ...this.save.dailyDumpState,
        bestScore: Math.max(this.save.dailyDumpState.bestScore, score),
        lastScore: score,
        lastTier: tier,
        rewardClaimed: true,
      },
    }
    this.dailyDumpRuntime = createIdleDailyDumpRuntime()
    this.analytics.track('daily_dump_complete', { score, tier, gtp })
    this.persistImmediate()
    this.emit()
    return { ok: true, gtp }
  }

  catchEventTarget(targetId: string): ClaimResult {
    if (!this.eventRuntime) return { ok: false, reason: 'inactive' }
    const now = this.time.now()
    const { runtime, caught } = catchTarget(this.eventRuntime, targetId, now)
    if (!caught) return { ok: false, reason: 'miss' }
    this.eventRuntime = runtime
    this.syncActiveEventFromRuntime()

    if (runtime.type === 'golden_poop' || runtime.type === 'golden_rain') {
      this.save = progressChallenge(this.save, 'golden_poops', 1)
    }

    if (runtime.completed && !runtime.rewardClaimed) {
      return this.grantEventSuccess()
    }

    this.dirty = true
    this.emit()
    return { ok: true }
  }

  catchGoldenPoop(): ClaimResult {
    if (!this.eventRuntime) return { ok: false, reason: 'inactive' }
    const now = this.time.now()
    const target = this.eventRuntime.targets.find(
      (t) => t.kind === 'golden' && !t.caught && t.expiresAt > now,
    )
    if (!target) return { ok: false, reason: 'miss' }
    return this.catchEventTarget(target.id)
  }

  chooseMysteryReward(option: 0 | 1 | 2): ClaimResult {
    const runtime = this.eventRuntime
    if (!runtime || runtime.type !== 'mystery_flush' || runtime.rewardClaimed) {
      return { ok: false, reason: 'inactive' }
    }
    if (!runtime.awaitingChoice && this.time.now() < runtime.endsAt) {
      return { ok: false, reason: 'not_ready' }
    }

    const production = this.getProduction()
    const mult = totalEventRewardMultiplier(this.save, production.eventRewardBonus)
    const now = this.time.now()

    if (option === 0) {
      const pp = production.pps.mul(10 * 60).mul(mult)
      this.creditPP(pp, 'reward')
      this.eventRuntime = {
        ...runtime,
        mysteryRevealed: true,
        mysteryOption: option,
        rewardClaimed: true,
        completed: true,
      }
      this.syncActiveEventFromRuntime()
      this.recordEventCompletion()
      this.finishEvent(true)
      this.persistImmediate()
      this.emit()
      return { ok: true, pp }
    }
    if (option === 1) {
      const gtp = Math.floor(25 * mult)
      this.save = { ...this.save, gtp: this.save.gtp + gtp }
      this.eventRuntime = {
        ...runtime,
        mysteryRevealed: true,
        mysteryOption: option,
        rewardClaimed: true,
        completed: true,
      }
      this.syncActiveEventFromRuntime()
      this.recordEventCompletion()
      this.finishEvent(true)
      this.persistImmediate()
      this.emit()
      return { ok: true, gtp }
    }

    this.save = {
      ...this.save,
      activeBoosts: [
        ...this.save.activeBoosts,
        {
          id: `mystery_${now}`,
          label: 'Mystery Boost',
          tapMultiplier: 3,
          idleMultiplier: 2,
          expiresAt: now + 10 * 60_000,
        },
      ],
    }
    this.eventRuntime = {
      ...runtime,
      mysteryRevealed: true,
      mysteryOption: option,
      rewardClaimed: true,
      completed: true,
    }
    this.syncActiveEventFromRuntime()
    this.recordEventCompletion()
    this.finishEvent(true)
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  setAutoBuyEnabled(enabled: boolean): void {
    this.save = { ...this.save, autoBuyEnabled: enabled }
    this.persistImmediate()
    this.emit()
  }

  updateSettings(partial: Partial<PlayerSaveV2['settings']>): void {
    this.save = { ...this.save, settings: { ...this.save.settings, ...partial } }
    this.persistImmediate()
    this.emit()
  }

  markNotificationPromptShown(): void {
    this.save = {
      ...this.save,
      tutorialFlags: { ...this.save.tutorialFlags, notificationPromptShown: true },
    }
    this.persistImmediate()
    this.emit()
  }

  applyIapGrant(productId: string): ClaimResult {
    const def = IAP_BY_ID[productId]
    if (!def) return { ok: false, reason: 'missing' }
    if (def.kind !== 'consumable' && this.save.ownedIapProducts.includes(productId)) {
      return { ok: false, reason: 'already_owned' }
    }
    this.save = applyIapGrantToSave(this.save, def.grants, productId)
    this.syncMeta(this.time.now())
    this.persistImmediate()
    this.emit()
    return { ok: true }
  }

  private syncActiveEventFromRuntime(): void {
    if (!this.eventRuntime) {
      if (this.save.activeEvent) {
        this.save = { ...this.save, activeEvent: null }
      }
      return
    }
    const r = this.eventRuntime
    this.save = {
      ...this.save,
      activeEvent: {
        defId: r.defId,
        type: r.type,
        startedAt: r.startedAt,
        endsAt: r.endsAt,
        taps: r.taps,
        tapTarget: r.tapTarget,
        completed: r.completed,
        failed: r.failed,
        rewardClaimed: r.rewardClaimed,
      },
    }
  }

  private recordEventCompletion(): void {
    const runtime = this.eventRuntime
    if (!runtime) return
    this.save = {
      ...this.save,
      eventsCompleted: this.save.eventsCompleted + 1,
      eventCompletions: {
        ...this.save.eventCompletions,
        [runtime.defId]: (this.save.eventCompletions[runtime.defId] ?? 0) + 1,
      },
    }
    this.save = progressChallenge(this.save, 'events', 1)
    this.analytics.track('event_complete', { id: runtime.defId })
  }

  private grantEventSuccess(): ClaimResult {
    const runtime = this.eventRuntime
    if (!runtime || runtime.rewardClaimed) return { ok: false, reason: 'inactive' }

    const production = this.getProduction()
    const rewards = computeEventRewards(runtime.defId, this.save, production)
    this.creditPP(rewards.pp, 'reward')

    this.save = {
      ...this.save,
      gtp: this.save.gtp + rewards.gtp,
      eventsCompleted: this.save.eventsCompleted + 1,
      eventCompletions: {
        ...this.save.eventCompletions,
        [runtime.defId]: (this.save.eventCompletions[runtime.defId] ?? 0) + 1,
      },
    }

    if (runtime.type === 'golden_poop' || runtime.type === 'golden_rain') {
      this.goldenInSession += 1
      this.save = {
        ...this.save,
        goldenPoopsCaught: this.save.goldenPoopsCaught + 1,
        lastGoldenPoopAt: this.time.now(),
      }
    }
    if (runtime.type === 'clogged_toilet' || runtime.type === 'mega_clog') {
      this.save = { ...this.save, clogsCompleted: this.save.clogsCompleted + 1 }
      this.save = progressChallenge(this.save, 'clogs', 1)
    }
    this.save = progressChallenge(this.save, 'events', 1)
    this.analytics.track('event_complete', { id: runtime.defId })

    this.eventRuntime = { ...runtime, completed: true, rewardClaimed: true }
    this.syncActiveEventFromRuntime()
    this.finishEvent(true)
    this.syncMeta(this.time.now())
    this.persistImmediate()
    this.emit()
    return { ok: true, gtp: rewards.gtp, pp: rewards.pp }
  }

  private finishEvent(success: boolean): void {
    const runtime = this.eventRuntime
    if (!runtime) return
    const now = this.time.now()
    const production = this.getProduction()

    if (!success) {
      if (runtime.type === 'clogged_toilet' || runtime.type === 'mega_clog') {
        this.save = { ...this.save, clogsFailed: this.save.clogsFailed + 1 }
      }
      this.analytics.track('event_fail', { id: runtime.defId })
    }

    this.save = afterEventSchedule(this.save, now, runtime.type, production.goldenChanceBonus, 0)
    this.save = {
      ...this.save,
      lastEventEndedAt: { ...this.save.lastEventEndedAt, [runtime.defId]: now },
      activeEvent: null,
    }
    this.eventRuntime = null
  }

  private completeEventRuntime(success: boolean): void {
    if (success) {
      this.grantEventSuccess()
    } else {
      this.finishEvent(false)
      this.syncMeta(this.time.now())
      this.persistImmediate()
      this.emit()
    }
  }

  private processScheduledEvents(now: number, dt: number): void {
    this.updateFrenzyLifecycle(now)

    if (this.eventRuntime) {
      this.eventRuntime = tickEventRuntime(this.eventRuntime, now, this.rollingCps, dt)
      this.syncActiveEventFromRuntime()
      const status = evaluateEventCompletion(this.eventRuntime, now)
      if (status.awaitingChoice) {
        this.eventRuntime = { ...this.eventRuntime, awaitingChoice: true }
        return
      }
      if (status.completed && !this.eventRuntime.rewardClaimed) {
        this.completeEventRuntime(true)
      } else if (status.failed) {
        this.completeEventRuntime(false)
      }
      return
    }

    const pick = pickScheduledEvent(this.save, now)
    if (!pick) return

    const runtime = createEventRuntime(pick.id, now, this.save.flushCount)
    if (!runtime) return

    this.eventRuntime = runtime
    this.syncActiveEventFromRuntime()
    this.save = {
      ...this.save,
      tutorialFlags: { ...this.save.tutorialFlags, events: true },
    }
    this.analytics.track('event_start', { id: pick.id })
    this.dirty = true
    this.emit(true)
  }

  spawnEvent(eventId: string): boolean {
    if (this.eventRuntime || this.save.activeEvent) return false
    const now = this.time.now()
    const runtime = createEventRuntime(eventId, now, this.save.flushCount)
    if (!runtime) return false
    this.eventRuntime = runtime
    this.syncActiveEventFromRuntime()
    this.save = {
      ...this.save,
      tutorialFlags: { ...this.save.tutorialFlags, events: true },
    }
    this.analytics.track('event_start', { id: eventId })
    this.emit()
    return true
  }

  private updateFrenzyLifecycle(now: number): void {
    if (this.frenzyActiveUntil > 0 && now >= this.frenzyActiveUntil && this.frenzyStartedAt > 0) {
      const duration = this.frenzyActiveUntil - this.frenzyStartedAt
      if (duration >= 3_000) {
        this.save = progressChallenge(this.save, 'frenzy_complete', 1)
        this.analytics.track('frenzy_completed', { durationMs: duration })
      }
      this.frenzyStartedAt = 0
      this.frenzyActiveUntil = 0
    }
  }

  private syncMeta(now: number): void {
    const synced = syncAchievements(this.save, now, {
      goldenInSession: this.goldenInSession,
      absenceMs: this.absenceMs,
      flushWithCorny: this.flushWithCorny,
    })
    this.save = grantEligibleSkins(synced.save)
    for (const id of synced.newlyCompleted) {
      this.analytics.track('achievement_unlock', { id })
    }
    // Unlock worlds by flush count
    const unlocked = new Set(this.save.unlockedWorlds)
    for (const world of WORLDS) {
      if (this.save.flushCount >= world.unlockFlushCount) unlocked.add(world.id)
    }
    this.save = { ...this.save, unlockedWorlds: Array.from(unlocked) }
  }

  private computeNextGoals(_production: ReturnType<typeof computeProduction>): NextGoal[] {
    const goals: NextGoal[] = []
    const dailyDone = this.save.dailyChallenges.filter((c) => c.completed).length
    if (this.save.dailyChallenges.length > 0 && dailyDone < 3) {
      goals.push({
        kind: 'daily',
        title: 'DAILY',
        subtitle: `${dailyDone} / 3`,
        progress: dailyDone / 3,
      })
    }

    const runPP = LargeNumber.deserialize(this.save.runPPEarned)
    if (!canFlush(this.save)) {
      goals.push({
        kind: 'flush',
        title: 'NEXT FLUSH',
        subtitle: `+${buildFlushPreview(this.save, this.time.now()).flushPowerGain} Flush Power`,
        progress: Math.min(1, runPP.div(ECONOMY.firstFlushRequirement).toNumber()),
      })
    } else {
      goals.push({
        kind: 'flush',
        title: 'FLUSH READY',
        subtitle: `+${buildFlushPreview(this.save, this.time.now()).flushPowerGain} Flush Power`,
        progress: 1,
      })
    }

    const balance = LargeNumber.deserialize(this.save.currentPP)
    const nextUpgrade = UPGRADES.find((u) => {
      const level = this.save.purchasedRunUpgrades[u.id] ?? 0
      if (level >= u.maxLevel) return false
      if ((u.requiresFlushCount ?? 0) > this.save.flushCount) return false
      return true
    })
    if (nextUpgrade) {
      const level = this.save.purchasedRunUpgrades[nextUpgrade.id] ?? 0
      const cost = geometricCost(
        LargeNumber.from(nextUpgrade.baseCost),
        nextUpgrade.costGrowth,
        level,
      )
      goals.push({
        kind: 'upgrade',
        title: 'NEXT UPGRADE',
        subtitle: nextUpgrade.name,
        progress: Math.min(1, balance.div(cost).toNumber()),
      })
    }

    return goals.slice(0, 2)
  }

  foreground(): void {
    const now = this.time.now()
    const away = Math.max(0, now - this.save.lastActiveTimestamp)
    this.absenceMs = Math.max(this.absenceMs, away)
    this.save = ensureDailyState(this.save, now, this.getProduction().pps)
    this.save = generateBathroomBreakCharges(
      this.save,
      now,
      ECONOMY.bathroomBreakIntervalMs,
      ECONOMY.bathroomBreakMaxCharges,
    )
    if (away > 5_000 && !this.offlineReward) {
      const production = this.getProduction()
      const capped = Math.min(away, offlineCapMs(production.offlineCapHoursBonus))
      const earned = production.pps.mul(capped / 1000)
      if (earned.gt(0)) this.offlineReward = { awayMs: capped, earned, claimed: false }
    }
    this.syncMeta(now)
    this.emit()
  }

  background(): void {
    const now = this.time.now()
    if (this.dailyDumpRuntime.phase !== 'idle') {
      const dt = Math.max(0, now - this.lastTickAt)
      this.dailyDumpRuntime = tickDailyDump(this.dailyDumpRuntime, now, dt)
    }
    this.save = { ...this.save, lastActiveTimestamp: now }
    this.syncActiveEventFromRuntime()
    this.persistImmediate()
  }

  private maybePersist(now: number): void {
    if (!this.dirty) return
    if (now - this.lastPersistAt < 2_000) return
    this.persistImmediate()
  }

  persistImmediate(): void {
    const now = this.time.now()
    this.syncActiveEventFromRuntime()
    this.save = { ...this.save, lastSaveTimestamp: now, lastActiveTimestamp: now }
    this.storage?.setItem(this.storageKey, serializeSave(this.save))
    this.lastPersistAt = now
    this.dirty = false
  }

  exportSave(): PlayerSaveV2 {
    return structuredClone(this.save)
  }

  importSave(raw: unknown): void {
    this.save = migrateSave(raw as PlayerSaveV2, this.time.now())
    this.bootstrap(this.time.now())
    this.persistImmediate()
    this.emit()
  }

  /** Test helper */
  debugSetSave(mutator: (save: PlayerSaveV2) => PlayerSaveV2): void {
    this.save = mutator(this.save)
    this.emit()
  }

  debugGrantPP(amount: number | LargeNumber): void {
    this.creditPP(LargeNumber.from(amount), 'reward')
    this.emit()
  }

  debugSetClock?(clock: FixedClock): void {
    void clock
  }
}

export function createTestEngine(save?: Partial<PlayerSaveV2>, now = Date.now()): GameEngine {
  const clock = new FixedClock(now)
  const base = createDefaultSave(now)
  return new GameEngine({
    clock,
    save: { ...base, ...save, schemaVersion: base.schemaVersion },
    storage: null,
  })
}
