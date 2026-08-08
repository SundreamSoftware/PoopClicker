export const ASSET_ROOT = 'assets'

export function assetUrl(path: string): string {
  const normalized = path.replace(/^[/\\]+/, '').replaceAll('\\', '/')
  return `${import.meta.env.BASE_URL}${ASSET_ROOT}/${normalized}`
}

export type AuthoredSkinSlug = 'classic' | 'corny' | 'diamond' | 'cyber' | 'blackhole' | '404'
export type AuthoredExpression = 'normal' | 'happy' | 'frenzy'
export type WorldLayer = 'background' | 'midground' | 'foreground' | 'vfx'

const SKIN_SLUGS: Partial<Record<string, AuthoredSkinSlug>> = {
  classic_poop: 'classic',
  corny_poop: 'corny',
  diamond_poop: 'diamond',
  cyber_poop: 'cyber',
  black_hole_poop: 'blackhole',
  '404_poop': '404',
}

export const AUTHORED_WORLD_IDS = new Set([
  'home_bathroom',
  'office_toilet',
  'space_loo',
  'quantum_bathroom',
  'omni_throne',
])

export function resolveSkinExpressionPath(skinId: string, face: string): string | null {
  const slug = SKIN_SLUGS[skinId]
  if (!slug) return null

  if (slug === 'classic' && ['effort', 'panic', 'overdrive', 'dizzy'].includes(face)) {
    return assetUrl(`P0_character/expressions/poop_classic_${face}.svg`)
  }

  const expression: AuthoredExpression =
    face === 'frenzy' || face === 'overdrive'
      ? 'frenzy'
      : face === 'happy' || face === 'event'
        ? 'happy'
        : 'normal'
  return assetUrl(`P1_skins/${slug}/poop_${slug}_${expression}.svg`)
}

export function resolveCharacterAuraPath(face: string): string | null {
  if (face === 'overdrive') {
    return assetUrl('P0_character/poop_classic_overdrive_aura.svg')
  }
  if (face === 'frenzy') {
    return assetUrl('P0_character/poop_classic_frenzy_aura.svg')
  }
  return null
}

export function resolveToiletPath(state: string): string {
  const file =
    state === 'clogged'
      ? 'toilet_clogged.svg'
      : state === 'flush'
        ? 'toilet_flush.svg'
        : state === 'shake'
          ? 'toilet_shake.svg'
          : state === 'bounce'
            ? 'toilet_bounce.svg'
            : 'toilet_idle.svg'
  return assetUrl(`P0_toilet/${file}`)
}

export function worldLayerPath(worldId: string, layer: WorldLayer): string | null {
  if (!AUTHORED_WORLD_IDS.has(worldId)) return null
  return assetUrl(`P1_worlds/${worldId}/layers/world_${worldId}_${layer}.webp`)
}

export const UI_ASSETS = {
  currency: {
    pp: assetUrl('P1_ui/currency/icon_pp.svg'),
    gtp: assetUrl('P1_ui/currency/icon_gtp.svg'),
    flushPower: assetUrl('P1_ui/currency/icon_flush_power.svg'),
  },
  nav: {
    play: assetUrl('P1_ui/nav/nav_home.svg'),
    shop: assetUrl('P1_ui/nav/nav_shop.svg'),
    collection: assetUrl('P1_ui/nav/nav_toilets.svg'),
  },
} as const

export const EVENT_ASSETS = {
  golden_poop: assetUrl('P1_events/golden_poop/golden_poop_target.svg'),
  golden_rain: assetUrl('P1_events/golden_rain/golden_rain_m.svg'),
  toilet_paper_storm: assetUrl('P1_events/toilet_paper/toilet_paper.svg'),
  burrito_rush: assetUrl('P1_events/burrito_rush/burrito_rush.svg'),
  toilet_quake: assetUrl('P1_events/toilet_quake/toilet_quake.svg'),
  mystery_flush: assetUrl('P1_events/mystery_flush/mystery_flush.svg'),
} as const
