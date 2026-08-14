export const ASSET_ROOT = 'assets'

export function assetUrl(path: string): string {
  const normalized = path.replace(/^[/\\]+/, '').replaceAll('\\', '/')
  return `${import.meta.env.BASE_URL}${ASSET_ROOT}/${normalized}`
}

/** Material body ids under `public/assets/P4_skins/<id>.png`. */
export type P4MaterialId =
  | 'basic'
  | 'cosmic'
  | 'diamond'
  | 'gold'
  | 'lava'
  | 'obsidian'
  | 'ooze'
  | 'pink'
  | 'stone'
  | 'wood'

/** Shared face overlay step 1–6 from `public/assets/P4_expressions/`. */
export type SharedExpressionId =
  | 'expr_01'
  | 'expr_02'
  | 'expr_03'
  | 'expr_04'
  | 'expr_05'
  | 'expr_06'

/** Legacy P1 folder slug (SVG pack fallback). */
export type AuthoredSkinSlug = string

export type WorldLayer = 'background' | 'midground' | 'foreground' | 'vfx'

export const P4_MATERIAL_IDS: readonly P4MaterialId[] = [
  'basic',
  'cosmic',
  'diamond',
  'gold',
  'lava',
  'obsidian',
  'ooze',
  'pink',
  'stone',
  'wood',
] as const

/**
 * Map gameplay skins → P4 material bodies.
 * Multiple roster skins share a material until unique costume art lands.
 */
const P4_MATERIAL_BY_SKIN: Record<string, P4MaterialId> = {
  classic_poop: 'basic',
  corny_poop: 'wood',
  coffee_poop: 'wood',
  burrito_poop: 'basic',
  taco_poop: 'basic',
  office_poop: 'stone',
  gamer_poop: 'cosmic',
  construction_poop: 'stone',
  chef_poop: 'basic',
  doctor_poop: 'stone',
  cactus_poop: 'wood',
  cowboy_poop: 'wood',
  pirate_poop: 'wood',
  rainbow_poop: 'pink',
  disco_poop: 'cosmic',
  ghost_poop: 'obsidian',
  zombie_poop: 'ooze',
  vampire_poop: 'obsidian',
  pumpkin_poop: 'lava',
  santa_poop: 'basic',
  unicorn_poop: 'pink',
  alien_poop: 'ooze',
  astronaut_poop: 'cosmic',
  viking_poop: 'stone',
  samurai_poop: 'stone',
  knight_poop: 'stone',
  wizard_poop: 'cosmic',
  devil_poop: 'lava',
  angel_poop: 'pink',
  diamond_poop: 'diamond',
  cyber_poop: 'cosmic',
  pixel_poop: 'cosmic',
  glitch_poop: 'ooze',
  nuclear_poop: 'ooze',
  king_poop: 'gold',
  black_hole_poop: 'obsidian',
  holographic_poop: 'cosmic',
  time_traveller_poop: 'cosmic',
  multiverse_poop: 'cosmic',
  void_poop: 'obsidian',
  developer_poop: 'basic',
  ceo_poop: 'gold',
  '404_poop': 'stone',
  schrodingers_poop: 'cosmic',
  the_final_poop: 'gold',
  toilet_tycoon: 'gold',
}

/** Legacy P1 SVG folder map (fallback when P4 body missing). */
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

/** Full-bleed P4 environment art mapped by world id → L#. */
const P4_WORLD_LEVEL: Partial<Record<string, number>> = {
  home_bathroom: 1,
  office_toilet: 2,
  gas_station_restroom: 3,
  stadium_loo: 4,
  space_loo: 5,
  quantum_bathroom: 6,
  chrono_chamber: 7,
  neon_arcade_stall: 8,
  volcanic_spa_toilet: 9,
  cloud_restroom: 10,
  void_washroom: 10,
  omni_throne: 5,
}

export const SHARED_EXPRESSION_IDS: readonly SharedExpressionId[] = [
  'expr_01',
  'expr_02',
  'expr_03',
  'expr_04',
  'expr_05',
  'expr_06',
] as const

/** Worlds that still have layered P1 WebP sets. */
export const AUTHORED_WORLD_IDS = new Set([
  'home_bathroom',
  'office_toilet',
  'space_loo',
  'quantum_bathroom',
  'omni_throne',
])

export function authoredSkinSlug(skinId: string): AuthoredSkinSlug | null {
  return SKIN_SLUGS[skinId] ?? null
}

export function resolveP4Material(skinId: string): P4MaterialId {
  return P4_MATERIAL_BY_SKIN[skinId] ?? 'basic'
}

export function isMaskedFaceSkin(_skinId: string): boolean {
  // P4 pack has no separate masked-face variants yet.
  return false
}

/** Preferred faceless body: P4 material PNG. */
export function resolveSkinBodyPath(skinId: string): string | null {
  const material = resolveP4Material(skinId)
  return assetUrl(`P4_skins/${material}.png`)
}

/** Legacy P1 SVG body (fallback). */
export function resolveP1SkinBodyPath(skinId: string): string | null {
  const slug = SKIN_SLUGS[skinId]
  if (!slug) return null
  return assetUrl(`P1_skins/${slug}/poop_${slug}_body.svg`)
}

/**
 * Fixed CPS → expression level (P4 `expression lvN` / `expr_0N`):
 * | CPS   | level | file     |
 * | 0–1   | lv1   | expr_01  |
 * | 2–5   | lv2   | expr_02  |
 * | 6–9   | lv3   | expr_03  |
 * | 10–12 | lv4   | expr_04  |
 * | 13–16 | lv5   | expr_05  |
 * | 16+   | lv6   | expr_06  |
 */
export function resolveSharedExpressionIdFromCps(cpsInput: number): SharedExpressionId {
  const cps = Number.isFinite(cpsInput) ? Math.max(0, cpsInput) : 0
  if (cps < 2) return 'expr_01'
  if (cps < 6) return 'expr_02'
  if (cps < 10) return 'expr_03'
  if (cps < 13) return 'expr_04'
  if (cps <= 16) return 'expr_05'
  return 'expr_06'
}

/**
 * Map tap-speed state onto the same lv1–lv6 ladder.
 * Frenzy covers 10–16 CPS (lv4–lv5 differentiated by CPS); overdrive is lv6.
 */
export function resolveSharedExpressionIdFromTapState(tapState: string): SharedExpressionId {
  switch (tapState) {
    case 'overdrive':
      return 'expr_06'
    case 'frenzy':
      return 'expr_04'
    case 'fast':
      return 'expr_03'
    case 'active':
      return 'expr_02'
    case 'slow':
    case 'idle':
    default:
      return 'expr_01'
  }
}

const EXPR_RANK: Record<SharedExpressionId, number> = {
  expr_01: 1,
  expr_02: 2,
  expr_03: 3,
  expr_04: 4,
  expr_05: 5,
  expr_06: 6,
}

/** Prefer the higher of CPS band and tap-state floor so lv4–lv6 actually appear while tapping hard. */
export function resolveSharedExpressionIdForPlay(
  cps: number,
  tapState: string,
): SharedExpressionId {
  if (tapState === 'idle') return 'expr_01'
  const fromCps = resolveSharedExpressionIdFromCps(cps)
  const fromState = resolveSharedExpressionIdFromTapState(tapState)
  return EXPR_RANK[fromCps] >= EXPR_RANK[fromState] ? fromCps : fromState
}

/** @deprecated Prefer resolveSharedExpressionIdFromCps — kept for procedural face labels. */
export function resolveSharedExpressionId(face: string): SharedExpressionId {
  switch (face) {
    case 'overdrive':
      return 'expr_06'
    case 'frenzy':
      return 'expr_05'
    case 'panic':
    case 'dizzy':
      return 'expr_04'
    case 'effort':
      return 'expr_03'
    case 'happy':
    case 'event':
      return 'expr_02'
    case 'normal':
    default:
      return 'expr_01'
  }
}

export function resolveSharedExpressionPathFromCps(cps: number): string {
  return assetUrl(`P4_expressions/${resolveSharedExpressionIdFromCps(cps)}.png`)
}

export function resolveSharedExpressionPathForPlay(cps: number, tapState: string): string {
  return assetUrl(`P4_expressions/${resolveSharedExpressionIdForPlay(cps, tapState)}.png`)
}

export function resolveSharedExpressionPath(face: string): string {
  return assetUrl(`P4_expressions/${resolveSharedExpressionId(face)}.png`)
}

/**
 * Legacy single-file skin path (normal/happy with baked face).
 * Prefer `resolveSkinBodyPath` + `resolveSharedExpressionPath` for Play.
 */
export function resolveSkinExpressionPath(skinId: string, face: string): string | null {
  const slug = SKIN_SLUGS[skinId]
  if (!slug) return null

  const expression =
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
  const material = resolveP4Material(skinId)
  return assetUrl(`P4_skins/_thumbnails/${material}_192.png`)
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

/** Full-bleed P4 environment PNG when present. */
export function resolveWorldBackdropPath(worldId: string): string | null {
  const level = P4_WORLD_LEVEL[worldId]
  if (level == null) return null
  return assetUrl(`P4_environments/L${level}.png`)
}

export function worldLayerPath(worldId: string, layer: WorldLayer): string | null {
  if (!AUTHORED_WORLD_IDS.has(worldId)) return null
  return assetUrl(`P1_worlds/${worldId}/layers/world_${worldId}_${layer}.webp`)
}

export const UI_ASSETS = {
  currency: {
    pp: assetUrl('P1_ui/currency/icon_pp.svg'),
    gtp: assetUrl('P4_misc/golden_toilet_paper.png'),
    flushPower: assetUrl('P1_ui/currency/icon_flush_power.svg'),
  },
  nav: {
    play: assetUrl('P1_ui/nav/nav_home.svg'),
    shop: assetUrl('P1_ui/nav/nav_shop.svg'),
    collection: assetUrl('P1_ui/nav/nav_toilets.svg'),
  },
} as const

export const CHEST_ASSETS = {
  regular_chest: assetUrl('P4_misc/regular_chest.png'),
  silver_chest: assetUrl('P4_misc/silver_chest.png'),
  golden_chest: assetUrl('P4_misc/golden_chest.png'),
  regular_key: assetUrl('P4_misc/regular_key.png'),
  silver_key: assetUrl('P4_misc/silver_key.png'),
  golden_key: assetUrl('P4_misc/golden_key.png'),
} as const

export function goldenShowerFramePath(frame: number): string {
  const n = Math.min(6, Math.max(1, Math.floor(frame)))
  return assetUrl(`P4_misc/golden_poop_shower/golden_poop_0${n}.png`)
}

/** P4 flush VFX frames (`flush_1.png` …). Currently 5 authored frames. */
export const FLUSH_ANIM = {
  frameCount: 5,
  durationMs: 2_500,
  /** Kept for helpers; playback uses durationMs. */
  fps: 2,
} as const

export function flushAnimFramePath(frame: number): string {
  const n = Math.min(FLUSH_ANIM.frameCount, Math.max(1, Math.floor(frame)))
  return assetUrl(`P4_misc/flush/flush_${n}.png`)
}

export function flushAnimFrameUrls(): string[] {
  return Array.from({ length: FLUSH_ANIM.frameCount }, (_, i) => flushAnimFramePath(i + 1))
}

/** Chest open reward VFX (`chest_animation1.png` … `6`). */
export const CHEST_OPEN_ANIM = {
  frameCount: 6,
  durationMs: 3_000,
  /** Kept for helpers; playback uses durationMs. */
  fps: 2,
} as const

export function chestOpenAnimFramePath(frame: number): string {
  const n = Math.min(CHEST_OPEN_ANIM.frameCount, Math.max(1, Math.floor(frame)))
  return assetUrl(`P4_misc/chest_reward_animation/chest_animation${n}.png`)
}

export function chestOpenAnimFrameUrls(): string[] {
  return Array.from({ length: CHEST_OPEN_ANIM.frameCount }, (_, i) => chestOpenAnimFramePath(i + 1))
}

export const EVENT_ASSETS = {
  golden_poop: assetUrl('P1_events/golden_poop/golden_poop_target.svg'),
  golden_rain: assetUrl('P4_misc/golden_poop_shower/golden_poop_01.png'),
} as const
