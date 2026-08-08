import type { AdService } from '../services/ads'
import { canShowInterstitial, getAdLastRewardedAt } from '../services/ads'
import { sessionStartMs } from '../state/gameSingleton'

export async function maybeShowInterstitial(
  ads: AdService,
  context: 'flush' | 'world_change',
  opts: {
    eventActive: boolean
    frenzyActive: boolean
    removeAds: boolean
  },
): Promise<void> {
  const now = Date.now()
  if (
    !canShowInterstitial({
      sessionAgeMs: now - sessionStartMs,
      eventActive: opts.eventActive,
      frenzyActive: opts.frenzyActive,
      removeAds: opts.removeAds,
      lastRewardedAt: getAdLastRewardedAt(ads),
      now,
    })
  ) {
    return
  }
  await ads.showInterstitial(context)
}
