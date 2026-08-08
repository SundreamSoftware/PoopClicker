/**
 * Central asset manifest.
 * Runtime uses authored assets where a path exists and procedural/CSS fallback otherwise.
 * Status vocabulary: FINAL | PROCEDURAL_FINAL | TEMPORARY | MISSING
 * FINAL = authored file integrated at runtime; PROCEDURAL_FINAL = intentional runtime fallback.
 */

import { authoredSkinSlug } from './assetPaths'

export type AssetStatus = 'FINAL' | 'PROCEDURAL_FINAL' | 'TEMPORARY' | 'MISSING'

type SkinManifestEntry = {
  variant: string
  color: string
  status: AssetStatus
  path?: string
}

function skinEntry(variant: string, color: string, skinId: string): SkinManifestEntry {
  const slug = authoredSkinSlug(skinId)
  if (!slug) {
    return { variant, color, status: 'PROCEDURAL_FINAL' }
  }
  return {
    variant,
    color,
    status: 'FINAL',
    path: `P1_skins/${slug}/poop_${slug}_normal.svg`,
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
    clogged_toilet: { status: 'FINAL', path: 'P1_events/clogged_toilet/clogged_stage_0.svg' },
    burrito_rush: { status: 'FINAL', path: 'P1_events/burrito_rush/burrito_rush.svg' },
    toilet_paper_storm: {
      status: 'FINAL',
      path: 'P1_events/toilet_paper/toilet_paper.svg',
    },
    plumber_inspection: {
      status: 'FINAL',
      path: 'P1_events/plumber/plumber_cps_gauge.svg',
    },
    mega_clog: { status: 'FINAL', path: 'P1_events/mega_clog/mega_clog_phase_1.svg' },
    toilet_quake: { status: 'FINAL', path: 'P1_events/toilet_quake/toilet_quake.svg' },
    golden_rain: { status: 'FINAL', path: 'P1_events/golden_rain/golden_rain_m.svg' },
    mystery_flush: { status: 'FINAL', path: 'P1_events/mystery_flush/mystery_flush.svg' },
  },
  worlds: {
    home_bathroom: {
      status: 'FINAL',
      path: 'P1_worlds/home_bathroom/world_home_bathroom_full.webp',
    },
    office_toilet: {
      status: 'FINAL',
      path: 'P1_worlds/office_toilet/world_office_toilet_full.webp',
    },
    gas_station_restroom: { status: 'PROCEDURAL_FINAL' },
    stadium_loo: { status: 'PROCEDURAL_FINAL' },
    space_loo: { status: 'FINAL', path: 'P1_worlds/space_loo/world_space_loo_full.webp' },
    quantum_bathroom: {
      status: 'FINAL',
      path: 'P1_worlds/quantum_bathroom/world_quantum_bathroom_full.webp',
    },
    chrono_chamber: { status: 'PROCEDURAL_FINAL' },
    neon_arcade_stall: { status: 'PROCEDURAL_FINAL' },
    volcanic_spa_toilet: { status: 'PROCEDURAL_FINAL' },
    cloud_restroom: { status: 'PROCEDURAL_FINAL' },
    void_washroom: { status: 'PROCEDURAL_FINAL' },
    omni_throne: { status: 'FINAL', path: 'P1_worlds/omni_throne/world_omni_throne_full.webp' },
  },
  /** Raster/illustration finals still outstanding (procedural stand-ins ship). */
  missingFinalArt: [
    'chef_poop has no authored pack counterpart',
    '7 worlds still using procedural backgrounds',
    'Extra pack skins beyond the current 46-slot roster are not yet content entries',
  ],
  /** Explicit missing slots reserved for future art pipeline. */
  missingSlots: {
    chef_authored_skin: { status: 'MISSING' },
    remaining_world_illustrations: { status: 'MISSING' },
  },
} as const
