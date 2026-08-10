export const ASSET_ROOT = 'assets'

export function assetUrl(path: string): string {
  const normalized = path.replace(/^[/\\]+/, '').replaceAll('\\', '/')
  return `${import.meta.env.BASE_URL}${ASSET_ROOT}/${normalized}`
}

/** Folder slug under `public/assets/P1_skins/<slug>/`. */
export type AuthoredSkinSlug = string
export type AuthoredExpression = 'normal' | 'happy'
export type WorldLayer = 'background' | 'midground' | 'foreground' | 'vfx'

/**
 * Maps gameplay skin ids → authored pack folder ids.
 * Exact matches prefer the same name; close thematic aliases fill remaining roster slots.
 */
const SKIN_SLUGS: Partial<Record<string, AuthoredSkinSlug>> = {
  classic_poop: 'classic',
  corny_poop: 'corny',
  coffee_poop: 'coffee',
  burrito_poop: 'burrito',
  taco_poop: 'taco',
  office_poop: 'business',
  gamer_poop: 'gamer',
  construction_poop: 'plumber',
  doctor_poop: 'doctor',
  cactus_poop: 'cactus',
  cowboy_poop: 'cowboy',
  pirate_poop: 'pirate',
  rainbow_poop: 'rainbow',
  disco_poop: 'disco',
  ghost_poop: 'ghost',
  zombie_poop: 'zombie',
  vampire_poop: 'vampire',
  pumpkin_poop: 'pumpkin',
  santa_poop: 'santa',
  unicorn_poop: 'unicorn',
  alien_poop: 'alien',
  astronaut_poop: 'astronaut',
  viking_poop: 'viking',
  samurai_poop: 'samurai',
  knight_poop: 'knight',
  wizard_poop: 'witch',
  devil_poop: 'demon',
  angel_poop: 'angel',
  diamond_poop: 'diamond',
  cyber_poop: 'cyber',
  pixel_poop: 'rgb',
  glitch_poop: 'hacker',
  nuclear_poop: 'radioactive',
  king_poop: 'king',
  black_hole_poop: 'blackhole',
  holographic_poop: 'cosmic',
  time_traveller_poop: 'scientist',
  multiverse_poop: 'infinity',
  void_poop: 'obsidian',
  developer_poop: 'hacker',
  ceo_poop: 'ceo',
  '404_poop': '404',
  schrodingers_poop: 'cat',
  the_final_poop: 'god',
  toilet_tycoon: 'prestige',
  chef_poop: 'spicy',
}

export const AUTHORED_WORLD_IDS = new Set([
  'home_bathroom',
  'office_toilet',
  'space_loo',
  'quantum_bathroom',
  'omni_throne',
])

const CLASSIC_EXTRA_EXPRESSIONS = new Set(['effort', 'panic', 'overdrive', 'dizzy', 'frenzy'])

export function authoredSkinSlug(skinId: string): AuthoredSkinSlug | null {
  return SKIN_SLUGS[skinId] ?? null
}

export function resolveSkinExpressionPath(skinId: string, face: string): string | null {
  const slug = SKIN_SLUGS[skinId]
  if (!slug) return null

  if (slug === 'classic' && CLASSIC_EXTRA_EXPRESSIONS.has(face)) {
    return assetUrl(`P0_character/expressions/poop_classic_${face}.svg`)
  }

  // Pack ships normal + happy only; intense faces use happy + aura overlays.
  const expression: AuthoredExpression =
    face === 'happy' ||
    face === 'event' ||
    face === 'frenzy' ||
    face === 'overdrive' ||
    face === 'effort'
      ? 'happy'
      : 'normal'

  return assetUrl(`P1_skins/${slug}/poop_${slug}_${expression}.svg`)
}

export function resolveSkinThumbnailPath(skinId: string): string | null {
  const slug = SKIN_SLUGS[skinId]
  if (!slug) return null
  return assetUrl(`P1_skins/_thumbnails/${slug}_192.png`)
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
