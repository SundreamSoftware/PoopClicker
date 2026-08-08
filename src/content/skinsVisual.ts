/**
 * Visual composition map for procedural PoopCharacter layers.
 * Keys cover every skin in SKINS content.
 */

export type BodyShape =
  | 'swirl'
  | 'chunky'
  | 'soft'
  | 'crystal'
  | 'pixel'
  | 'glitch'
  | 'void'
  | 'singularity'
  | 'box'
  | 'final'
  | 'ghost'
  | 'armor'

export type SkinAccessory =
  | 'tie'
  | 'stapler'
  | 'headset'
  | 'controller'
  | 'stethoscope'
  | 'needles'
  | 'eyepatch'
  | 'cape'
  | 'bat'
  | 'scarf'
  | 'katana'
  | 'shield'
  | 'staff'
  | 'wings'
  | 'circuit'
  | 'money'
  | 'terminal'
  | 'coffee'
  | 'wrap'
  | 'shell'
  | 'spurs'
  | 'clock'
  | 'portals'
  | 'error_badge'
  | 'beans'
  | 'salsa'
  | 'moss'
  | 'leaves'
  | 'snow'
  | 'glitter'
  | 'ufo'
  | 'stars'
  | 'frost'
  | 'flame'
  | 'halo_ring'
  | 'diamond_shard'
  | 'radiation'
  | 'mirrorball'
  | 'ectoplasm'
  | 'quantum_dot'
  | 'finale_ring'

export type Headwear =
  | 'none'
  | 'cowboy_hat'
  | 'pirate_hat'
  | 'chef_hat'
  | 'hard_hat'
  | 'crown'
  | 'santa_hat'
  | 'viking_helm'
  | 'samurai_helm'
  | 'knight_helm'
  | 'wizard_hat'
  | 'devil_horns'
  | 'halo'
  | 'astronaut_helm'
  | 'unicorn_horn'
  | 'pumpkin_stem'
  | 'party_visor'
  | 'ceo_hat'
  | 'dev_beanie'
  | 'chrono_goggles'
  | 'error_404'

export type SkinTexture =
  | 'smooth'
  | 'kernels'
  | 'facets'
  | 'circuit'
  | 'pixels'
  | 'glitch'
  | 'holo'
  | 'stripes'
  | 'spots'
  | 'scales'
  | 'moss'
  | 'stone'
  | 'void_noise'
  | 'error'
  | 'rainbow'
  | 'radiation'
  | 'ghost'
  | 'neon'

export type SkinAura =
  | 'none'
  | 'steam'
  | 'kernels'
  | 'beans'
  | 'salsa'
  | 'stapler'
  | 'pixels'
  | 'dust'
  | 'sparkle_food'
  | 'cross'
  | 'needles'
  | 'dust_trail'
  | 'waves'
  | 'rainbow'
  | 'mirrorball'
  | 'ectoplasm'
  | 'moss'
  | 'bat'
  | 'leaves'
  | 'snow'
  | 'glitter'
  | 'ufo'
  | 'stars'
  | 'frost'
  | 'slash'
  | 'shine'
  | 'arcane'
  | 'flame'
  | 'light'
  | 'diamond'
  | 'circuit'
  | 'pixel_burst'
  | 'glitch'
  | 'radiation'
  | 'royalty'
  | 'event_horizon'
  | 'holo'
  | 'clock'
  | 'portals'
  | 'void'
  | 'terminal'
  | 'money'
  | '404'
  | 'quantum'
  | 'finale'

export type FaceStyle =
  | 'default'
  | 'happy'
  | 'jitter'
  | 'pixel'
  | 'glitch'
  | 'error'
  | 'ghost'
  | 'fierce'
  | 'sleepy'
  | 'royal'
  | 'void'
  | 'quantum'

export interface SkinVisualDef {
  bodyShape: BodyShape
  accessories: SkinAccessory[]
  headwear: Headwear
  texture: SkinTexture
  aura: SkinAura
  faceStyle: FaceStyle
}

const base = (
  partial: Partial<SkinVisualDef> & Pick<SkinVisualDef, 'bodyShape'>,
): SkinVisualDef => ({
  accessories: [],
  headwear: 'none',
  texture: 'smooth',
  aura: 'none',
  faceStyle: 'default',
  ...partial,
})

export const SKINS_VISUAL: Record<string, SkinVisualDef> = {
  classic_poop: base({ bodyShape: 'swirl', texture: 'smooth', faceStyle: 'default' }),
  corny_poop: base({
    bodyShape: 'chunky',
    texture: 'kernels',
    aura: 'kernels',
    accessories: ['beans'],
    faceStyle: 'happy',
  }),
  coffee_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'steam',
    accessories: ['coffee'],
    faceStyle: 'jitter',
  }),
  burrito_poop: base({
    bodyShape: 'soft',
    texture: 'stripes',
    aura: 'beans',
    accessories: ['wrap', 'beans'],
    faceStyle: 'happy',
  }),
  taco_poop: base({
    bodyShape: 'chunky',
    texture: 'stripes',
    aura: 'salsa',
    accessories: ['shell', 'salsa'],
    faceStyle: 'happy',
  }),
  office_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'stapler',
    accessories: ['tie', 'stapler'],
    faceStyle: 'default',
  }),
  gamer_poop: base({
    bodyShape: 'swirl',
    texture: 'neon',
    aura: 'pixels',
    accessories: ['headset', 'controller'],
    headwear: 'party_visor',
    faceStyle: 'happy',
  }),
  construction_poop: base({
    bodyShape: 'chunky',
    texture: 'stone',
    aura: 'dust',
    headwear: 'hard_hat',
    faceStyle: 'fierce',
  }),
  chef_poop: base({
    bodyShape: 'soft',
    texture: 'smooth',
    aura: 'sparkle_food',
    headwear: 'chef_hat',
    faceStyle: 'happy',
  }),
  doctor_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'cross',
    accessories: ['stethoscope'],
    faceStyle: 'default',
  }),
  cactus_poop: base({
    bodyShape: 'chunky',
    texture: 'spots',
    aura: 'needles',
    accessories: ['needles'],
    faceStyle: 'fierce',
  }),
  cowboy_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'dust_trail',
    headwear: 'cowboy_hat',
    accessories: ['spurs'],
    faceStyle: 'happy',
  }),
  pirate_poop: base({
    bodyShape: 'swirl',
    texture: 'spots',
    aura: 'waves',
    headwear: 'pirate_hat',
    accessories: ['eyepatch'],
    faceStyle: 'fierce',
  }),
  rainbow_poop: base({
    bodyShape: 'swirl',
    texture: 'rainbow',
    aura: 'rainbow',
    faceStyle: 'happy',
  }),
  disco_poop: base({
    bodyShape: 'swirl',
    texture: 'facets',
    aura: 'mirrorball',
    accessories: ['mirrorball'],
    faceStyle: 'happy',
  }),
  ghost_poop: base({
    bodyShape: 'ghost',
    texture: 'ghost',
    aura: 'ectoplasm',
    accessories: ['ectoplasm'],
    faceStyle: 'ghost',
  }),
  zombie_poop: base({
    bodyShape: 'chunky',
    texture: 'moss',
    aura: 'moss',
    accessories: ['moss'],
    faceStyle: 'sleepy',
  }),
  vampire_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'bat',
    accessories: ['cape', 'bat'],
    faceStyle: 'fierce',
  }),
  pumpkin_poop: base({
    bodyShape: 'chunky',
    texture: 'stripes',
    aura: 'leaves',
    headwear: 'pumpkin_stem',
    accessories: ['leaves'],
    faceStyle: 'fierce',
  }),
  santa_poop: base({
    bodyShape: 'soft',
    texture: 'smooth',
    aura: 'snow',
    headwear: 'santa_hat',
    accessories: ['scarf', 'snow'],
    faceStyle: 'happy',
  }),
  unicorn_poop: base({
    bodyShape: 'swirl',
    texture: 'holo',
    aura: 'glitter',
    headwear: 'unicorn_horn',
    accessories: ['glitter'],
    faceStyle: 'happy',
  }),
  alien_poop: base({
    bodyShape: 'soft',
    texture: 'spots',
    aura: 'ufo',
    accessories: ['ufo'],
    faceStyle: 'happy',
  }),
  astronaut_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'stars',
    headwear: 'astronaut_helm',
    accessories: ['stars'],
    faceStyle: 'default',
  }),
  viking_poop: base({
    bodyShape: 'chunky',
    texture: 'stone',
    aura: 'frost',
    headwear: 'viking_helm',
    accessories: ['frost'],
    faceStyle: 'fierce',
  }),
  samurai_poop: base({
    bodyShape: 'swirl',
    texture: 'scales',
    aura: 'slash',
    headwear: 'samurai_helm',
    accessories: ['katana'],
    faceStyle: 'fierce',
  }),
  knight_poop: base({
    bodyShape: 'armor',
    texture: 'stone',
    aura: 'shine',
    headwear: 'knight_helm',
    accessories: ['shield'],
    faceStyle: 'fierce',
  }),
  wizard_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'arcane',
    headwear: 'wizard_hat',
    accessories: ['staff'],
    faceStyle: 'default',
  }),
  devil_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'flame',
    headwear: 'devil_horns',
    accessories: ['flame'],
    faceStyle: 'fierce',
  }),
  angel_poop: base({
    bodyShape: 'soft',
    texture: 'smooth',
    aura: 'light',
    headwear: 'halo',
    accessories: ['wings', 'halo_ring'],
    faceStyle: 'happy',
  }),
  diamond_poop: base({
    bodyShape: 'crystal',
    texture: 'facets',
    aura: 'diamond',
    accessories: ['diamond_shard'],
    faceStyle: 'happy',
  }),
  cyber_poop: base({
    bodyShape: 'swirl',
    texture: 'circuit',
    aura: 'circuit',
    accessories: ['circuit'],
    faceStyle: 'glitch',
  }),
  pixel_poop: base({
    bodyShape: 'pixel',
    texture: 'pixels',
    aura: 'pixel_burst',
    faceStyle: 'pixel',
  }),
  glitch_poop: base({
    bodyShape: 'glitch',
    texture: 'glitch',
    aura: 'glitch',
    faceStyle: 'glitch',
  }),
  nuclear_poop: base({
    bodyShape: 'swirl',
    texture: 'radiation',
    aura: 'radiation',
    accessories: ['radiation'],
    faceStyle: 'fierce',
  }),
  king_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'royalty',
    headwear: 'crown',
    faceStyle: 'royal',
  }),
  black_hole_poop: base({
    bodyShape: 'singularity',
    texture: 'void_noise',
    aura: 'event_horizon',
    faceStyle: 'void',
  }),
  holographic_poop: base({
    bodyShape: 'swirl',
    texture: 'holo',
    aura: 'holo',
    faceStyle: 'happy',
  }),
  time_traveller_poop: base({
    bodyShape: 'swirl',
    texture: 'circuit',
    aura: 'clock',
    headwear: 'chrono_goggles',
    accessories: ['clock'],
    faceStyle: 'default',
  }),
  multiverse_poop: base({
    bodyShape: 'glitch',
    texture: 'holo',
    aura: 'portals',
    accessories: ['portals'],
    faceStyle: 'quantum',
  }),
  void_poop: base({
    bodyShape: 'void',
    texture: 'void_noise',
    aura: 'void',
    faceStyle: 'void',
  }),
  developer_poop: base({
    bodyShape: 'swirl',
    texture: 'pixels',
    aura: 'terminal',
    headwear: 'dev_beanie',
    accessories: ['terminal', 'coffee'],
    faceStyle: 'jitter',
  }),
  ceo_poop: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'money',
    headwear: 'ceo_hat',
    accessories: ['tie', 'money'],
    faceStyle: 'royal',
  }),
  '404_poop': base({
    bodyShape: 'glitch',
    texture: 'error',
    aura: '404',
    headwear: 'error_404',
    accessories: ['error_badge'],
    faceStyle: 'error',
  }),
  schrodingers_poop: base({
    bodyShape: 'box',
    texture: 'spots',
    aura: 'quantum',
    accessories: ['quantum_dot'],
    faceStyle: 'quantum',
  }),
  the_final_poop: base({
    bodyShape: 'final',
    texture: 'facets',
    aura: 'finale',
    accessories: ['finale_ring', 'diamond_shard'],
    headwear: 'crown',
    faceStyle: 'royal',
  }),
  toilet_tycoon: base({
    bodyShape: 'swirl',
    texture: 'smooth',
    aura: 'money',
    headwear: 'ceo_hat',
    accessories: ['tie', 'money'],
    faceStyle: 'royal',
  }),
}

export function getSkinVisual(skinId: string): SkinVisualDef {
  return SKINS_VISUAL[skinId] ?? SKINS_VISUAL.classic_poop!
}
