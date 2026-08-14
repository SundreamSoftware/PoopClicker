/**
 * Central asset manifest.
 * Runtime uses authored assets where a path exists and procedural/CSS fallback otherwise.
 * Status vocabulary: FINAL | PROCEDURAL_FINAL | TEMPORARY | MISSING
 * FINAL = authored file integrated at runtime; PROCEDURAL_FINAL = intentional runtime fallback.
 */

import { resolveP4Material } from './assetPaths'

export type AssetStatus = 'FINAL' | 'PROCEDURAL_FINAL' | 'TEMPORARY' | 'MISSING'

type SkinManifestEntry = {
  variant: string
  color: string
  status: AssetStatus
  path?: string
}

function skinEntry(variant: string, color: string, skinId: string): SkinManifestEntry {
  const material = resolveP4Material(skinId)
  return {
    variant,
    color,
    status: 'FINAL',
    path: `P4_skins/${material}.png`,
  }
}

export const ASSET_MANIFEST = {
  skins: {
    classic_poop: skinEntry('default', '#8B5A2B', 'classic_poop'),
    corny_poop: skinEntry('chunky', '#C4A35A', 'corny_poop'),
    coffee_poop: skinEntry('jitter', '#4B2E1E', 'coffee_poop'),
    burrito_poop: skinEntry('soft', '#A67C52', 'burrito_poop'),
    taco_poop: skinEntry('crunch', '#D4A017', 'taco_poop'),
    office_poop: skinEntry('tie', '#5C4033', 'office_poop'),
    gamer_poop: skinEntry('rgb', '#7B2CBF', 'gamer_poop'),
    construction_poop: skinEntry('helmet', '#E67E22', 'construction_poop'),
    chef_poop: skinEntry('hat', '#F5F5F5', 'chef_poop'),
    doctor_poop: skinEntry('stethoscope', '#ECF0F1', 'doctor_poop'),
    cactus_poop: skinEntry('spiky', '#2E8B57', 'cactus_poop'),
    cowboy_poop: skinEntry('hat_tip', '#A0522D', 'cowboy_poop'),
    pirate_poop: skinEntry('eyepatch', '#2C3E50', 'pirate_poop'),
    rainbow_poop: skinEntry('prism', '#FF6BCB', 'rainbow_poop'),
    disco_poop: skinEntry('disco', '#9B59B6', 'disco_poop'),
    ghost_poop: skinEntry('fade', '#D5DBDB', 'ghost_poop'),
    zombie_poop: skinEntry('lurch', '#7D8F69', 'zombie_poop'),
    vampire_poop: skinEntry('cape', '#6C1D45', 'vampire_poop'),
    pumpkin_poop: skinEntry('carve', '#E67E22', 'pumpkin_poop'),
    santa_poop: skinEntry('jolly', '#C0392B', 'santa_poop'),
    unicorn_poop: skinEntry('sparkle', '#F8C8DC', 'unicorn_poop'),
    alien_poop: skinEntry('float', '#2ECC71', 'alien_poop'),
    astronaut_poop: skinEntry('zero_g', '#BDC3C7', 'astronaut_poop'),
    viking_poop: skinEntry('horn', '#7F8C8D', 'viking_poop'),
    samurai_poop: skinEntry('katana', '#34495E', 'samurai_poop'),
    knight_poop: skinEntry('armor', '#95A5A6', 'knight_poop'),
    wizard_poop: skinEntry('staff', '#5B2C6F', 'wizard_poop'),
    devil_poop: skinEntry('horns', '#922B21', 'devil_poop'),
    angel_poop: skinEntry('halo', '#FCF3CF', 'angel_poop'),
    diamond_poop: skinEntry('crystal', '#AED6F1', 'diamond_poop'),
    cyber_poop: skinEntry('neon', '#00F5FF', 'cyber_poop'),
    pixel_poop: skinEntry('pixel', '#E74C3C', 'pixel_poop'),
    glitch_poop: skinEntry('glitch', '#1ABC9C', 'glitch_poop'),
    nuclear_poop: skinEntry('glow', '#A8FF3E', 'nuclear_poop'),
    king_poop: skinEntry('crown', '#F4D03F', 'king_poop'),
    black_hole_poop: skinEntry('singularity', '#1C1C1C', 'black_hole_poop'),
    holographic_poop: skinEntry('holo', '#85C1E9', 'holographic_poop'),
    time_traveller_poop: skinEntry('chrono', '#5DADE2', 'time_traveller_poop'),
    multiverse_poop: skinEntry('split', '#AF7AC5', 'multiverse_poop'),
    void_poop: skinEntry('void', '#2C003E', 'void_poop'),
    developer_poop: skinEntry('coffee_code', '#273746', 'developer_poop'),
    ceo_poop: skinEntry('suit', '#1A5276', 'ceo_poop'),
    '404_poop': skinEntry('error', '#E74C3C', '404_poop'),
    schrodingers_poop: skinEntry('box', '#ABB2B9', 'schrodingers_poop'),
    the_final_poop: skinEntry('final', '#F5B041', 'the_final_poop'),
    toilet_tycoon: skinEntry('tycoon', '#C0C0C0', 'toilet_tycoon'),
  },
  animations: {
    idle: { status: 'PROCEDURAL_FINAL' },
    slow: { status: 'PROCEDURAL_FINAL' },
    active: { status: 'PROCEDURAL_FINAL' },
    fast: { status: 'PROCEDURAL_FINAL' },
    frenzy: { status: 'PROCEDURAL_FINAL' },
    overdrive: { status: 'PROCEDURAL_FINAL' },
    flush: { status: 'PROCEDURAL_FINAL' },
    unlock: { status: 'PROCEDURAL_FINAL' },
    event: { status: 'PROCEDURAL_FINAL' },
  },
  vfx: {
    tap_particles: { status: 'FINAL', path: 'P3_spritesheets/tap_burst_sheet.webp' },
    crit_burst: { status: 'FINAL', path: 'P3_spritesheets/crit_burst_sheet.webp' },
    golden_glow: { status: 'FINAL', path: 'P1_events/golden_poop/golden_poop_target.svg' },
    frenzy_aura: { status: 'FINAL', path: 'P0_vfx/aura_frenzy.svg' },
    overdrive_aura: { status: 'FINAL', path: 'P0_vfx/aura_overdrive.svg' },
  },
  uiIcons: {
    daily: { status: 'PROCEDURAL_FINAL' },
    achievements: { status: 'PROCEDURAL_FINAL' },
    collection: { status: 'PROCEDURAL_FINAL' },
    flush: { status: 'PROCEDURAL_FINAL' },
    royal: { status: 'PROCEDURAL_FINAL' },
  },
  events: {
    golden_poop: { status: 'FINAL', path: 'P1_events/golden_poop/golden_poop_target.svg' },
    plumber_inspection: {
      status: 'FINAL',
      path: 'P1_events/plumber/plumber_cps_gauge.svg',
    },
    mega_clog: { status: 'FINAL', path: 'P1_events/mega_clog/mega_clog_phase_1.svg' },
    golden_rain: {
      status: 'FINAL',
      path: 'P4_misc/golden_poop_shower/golden_poop_01.png',
    },
  },
  chests: {
    regular_chest: { status: 'FINAL', path: 'P4_misc/regular_chest.png' },
    silver_chest: { status: 'FINAL', path: 'P4_misc/silver_chest.png' },
    golden_chest: { status: 'FINAL', path: 'P4_misc/golden_chest.png' },
    regular_key: { status: 'FINAL', path: 'P4_misc/regular_key.png' },
    silver_key: { status: 'FINAL', path: 'P4_misc/silver_key.png' },
    golden_key: { status: 'FINAL', path: 'P4_misc/golden_key.png' },
    gtp: { status: 'FINAL', path: 'P4_misc/golden_toilet_paper.png' },
    flush_anim: { status: 'FINAL', path: 'P4_misc/flush/flush_1.png' },
    chest_open_anim: {
      status: 'FINAL',
      path: 'P4_misc/chest_reward_animation/chest_animation1.png',
    },
  },
  worlds: {
    home_bathroom: { status: 'FINAL', path: 'P4_environments/L1.png' },
    office_toilet: { status: 'FINAL', path: 'P4_environments/L2.png' },
    gas_station_restroom: { status: 'FINAL', path: 'P4_environments/L3.png' },
    stadium_loo: { status: 'FINAL', path: 'P4_environments/L4.png' },
    space_loo: { status: 'FINAL', path: 'P4_environments/L5.png' },
    quantum_bathroom: { status: 'FINAL', path: 'P4_environments/L6.png' },
    chrono_chamber: { status: 'FINAL', path: 'P4_environments/L7.png' },
    neon_arcade_stall: { status: 'FINAL', path: 'P4_environments/L8.png' },
    volcanic_spa_toilet: { status: 'FINAL', path: 'P4_environments/L9.png' },
    cloud_restroom: { status: 'FINAL', path: 'P4_environments/L10.png' },
    void_washroom: { status: 'FINAL', path: 'P4_environments/L10.png' },
    omni_throne: { status: 'FINAL', path: 'P4_environments/L5.png' },
  },
  /** Raster/illustration finals still outstanding (procedural stand-ins ship). */
  missingFinalArt: [
    'P4 has 10 material bodies shared across the 46-slot roster (not unique costumes yet)',
    'void_washroom / omni_throne reuse P4 environment levels until unique art lands',
    'Extra costume pack skins beyond material set are not yet content entries',
  ],
  /** Explicit missing slots reserved for future art pipeline. */
  missingSlots: {
    remaining_world_illustrations: { status: 'MISSING' },
  },
} as const
