import type { AdService } from '../services/ads'
import { canShowInterstitial, getAdLastRewardedAt } from '../services/ads'
import { sessionStartMs } from '../state/gameSingleton'

export async function maybeShowInterstitial(
  ads: AdService,
  context: 'flush' | 'world_change' | 'shop',
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

  if (context === 'flush') {
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }

  await ads.showInterstitial(context)
}
