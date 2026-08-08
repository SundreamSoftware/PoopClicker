/** Google AdMob official test IDs — safe for debug / CI builds. */
export const ADMOB_TEST_IDS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const

const env = import.meta.env

/** Production placeholders from Vite env (empty until Play Console units exist). */
export const ADMOB_PRODUCTION_IDS = {
  appId: (env.VITE_ADMOB_APP_ID as string | undefined) ?? '',
  banner: (env.VITE_ADMOB_BANNER_ID as string | undefined) ?? '',
  interstitial: (env.VITE_ADMOB_INTERSTITIAL_ID as string | undefined) ?? '',
  rewarded: (env.VITE_ADMOB_REWARDED_ID as string | undefined) ?? '',
} as const

export function getAdMobIds(): {
  appId: string
  banner: string
  interstitial: string
  rewarded: string
  isTesting: boolean
} {
  const useTest = Boolean(env.DEV) || !ADMOB_PRODUCTION_IDS.rewarded
  if (useTest) {
    return { ...ADMOB_TEST_IDS, isTesting: true }
  }
  return {
    appId: ADMOB_PRODUCTION_IDS.appId || ADMOB_TEST_IDS.appId,
    banner: ADMOB_PRODUCTION_IDS.banner || ADMOB_TEST_IDS.banner,
    interstitial: ADMOB_PRODUCTION_IDS.interstitial || ADMOB_TEST_IDS.interstitial,
    rewarded: ADMOB_PRODUCTION_IDS.rewarded || ADMOB_TEST_IDS.rewarded,
    isTesting: false,
  }
}

/** Interstitial frequency cap after a rewarded completion. */
export const INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS = 120_000
export const INTERSTITIAL_MIN_INTERVAL_MS = 90_000
export const INTERSTITIAL_MIN_SESSION_AGE_MS = 30_000
