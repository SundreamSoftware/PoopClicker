import { resolveP4Material } from '../../content/assetPaths'
import { COLLECTION_SKINS, SKINS, SKIN_BY_ID, isCollectionSkin } from '../../content/skins'
import type { PlayerSaveV2 } from '../save/saveSchema'
import { collectionPercent } from './achievements'

export type SkinStatus = 'owned' | 'equipped' | 'purchasable' | 'locked' | 'achievement_locked'

const COLLECTION_ID_BY_MATERIAL: Record<string, string> = Object.fromEntries(
  COLLECTION_SKINS.map((skin) => [resolveP4Material(skin.id), skin.id]),
)

/** Grant the P4 Collection row when any legacy costume of that material is owned. */
export function withCollectionMaterialSkins(owned: string[]): string[] {
  const next = new Set(owned)
  for (const id of owned) {
    const collectionId = COLLECTION_ID_BY_MATERIAL[resolveP4Material(id)]
    if (collectionId) next.add(collectionId)
  }
  return Array.from(next)
}

export function getSkinStatus(save: PlayerSaveV2, skinId: string): SkinStatus {
  const skin = SKIN_BY_ID[skinId]
  if (!skin) return 'locked'
  if (save.equippedSkinId === skinId) return 'equipped'
  if (
    isCollectionSkin(skinId) &&
    resolveP4Material(save.equippedSkinId) === resolveP4Material(skinId)
  ) {
    return 'equipped'
  }
  if (save.ownedSkins.includes(skinId)) return 'owned'
  if (skin.unlock.type === 'gtp' || skin.unlock.type === 'default') return 'purchasable'
  if (!isSkinUnlockRequirementMet(save, skinId)) {
    return skin.unlock.type === 'achievement' ? 'achievement_locked' : 'locked'
  }
  return 'owned'
}

export function isSkinUnlockRequirementMet(save: PlayerSaveV2, skinId: string): boolean {
  const skin = SKIN_BY_ID[skinId]
  if (!skin) return false
  if (save.ownedSkins.includes(skinId)) return true
  const unlock = skin.unlock
  switch (unlock.type) {
    case 'default':
      return true
    case 'gtp':
      return save.gtp >= unlock.amount
    case 'achievement':
      return Boolean(save.achievements[unlock.achievementId]?.completed)
    case 'flush':
    case 'milestone':
      return save.flushCount >= ('count' in unlock ? unlock.count : unlock.flushCount)
    case 'daily':
      return save.dailyChallengesCompletedTotal >= unlock.count
    case 'streak':
      return save.dailyStreak >= unlock.day || save.dailyStreakCycle > 1
    case 'world':
      return save.unlockedWorlds.includes(unlock.worldId)
    case 'collection':
      return collectionPercent(save) >= unlock.percent
    case 'event':
      return (save.eventCompletions[unlock.eventId] ?? 0) >= unlock.count
    default:
      return false
  }
}

export function purchaseSkin(
  save: PlayerSaveV2,
  skinId: string,
): { save: PlayerSaveV2; ok: boolean; reason?: string } {
  const skin = SKIN_BY_ID[skinId]
  if (!skin) return { save, ok: false, reason: 'missing' }
  if (save.ownedSkins.includes(skinId)) return { save, ok: false, reason: 'owned' }
  if (skin.unlock.type !== 'gtp') return { save, ok: false, reason: 'not_purchasable' }
  if (save.gtp < skin.unlock.amount) return { save, ok: false, reason: 'insufficient_gtp' }

  return {
    save: {
      ...save,
      gtp: save.gtp - skin.unlock.amount,
      ownedSkins: [...save.ownedSkins, skinId],
      tutorialFlags: { ...save.tutorialFlags, collection: true },
    },
    ok: true,
  }
}

export function equipSkin(
  save: PlayerSaveV2,
  skinId: string,
): { save: PlayerSaveV2; ok: boolean; reason?: string } {
  const granted = grantEligibleSkins(save)
  if (!SKIN_BY_ID[skinId]) return { save: granted, ok: false, reason: 'missing' }
  if (!granted.ownedSkins.includes(skinId)) return { save: granted, ok: false, reason: 'not_owned' }
  return { save: { ...granted, equippedSkinId: skinId }, ok: true }
}

export function grantEligibleSkins(save: PlayerSaveV2): PlayerSaveV2 {
  const owned = new Set(withCollectionMaterialSkins(save.ownedSkins))
  for (const skin of SKINS) {
    if (owned.has(skin.id)) continue
    if (skin.unlock.type === 'gtp' || skin.unlock.type === 'default') continue
    if (isSkinUnlockRequirementMet({ ...save, ownedSkins: Array.from(owned) }, skin.id)) {
      owned.add(skin.id)
    }
  }
  return { ...save, ownedSkins: withCollectionMaterialSkins(Array.from(owned)) }
}
