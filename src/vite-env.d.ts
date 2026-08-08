/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMOB_APP_ID?: string
  readonly VITE_ADMOB_BANNER_ID?: string
  readonly VITE_ADMOB_INTERSTITIAL_ID?: string
  readonly VITE_ADMOB_REWARDED_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
  readonly VITE_ADMOB_APP_ID?: string
  readonly VITE_ADMOB_BANNER_ID?: string
  readonly VITE_ADMOB_INTERSTITIAL_ID?: string
  readonly VITE_ADMOB_REWARDED_ID?: string
  readonly DEV: boolean
  readonly MODE: string
  readonly VITEST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
