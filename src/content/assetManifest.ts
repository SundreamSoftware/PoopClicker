/**
 * Central asset manifest.
 * Runtime uses authored assets where a path exists and procedural/CSS fallback otherwise.
 * Status vocabulary: FINAL | PROCEDURAL_FINAL | TEMPORARY | MISSING
 * FINAL = authored file integrated at runtime; PROCEDURAL_FINAL = intentional runtime fallback.
 */

export type AssetStatus = 'FINAL' | 'PROCEDURAL_FINAL' | 'TEMPORARY' | 'MISSING'

export const ASSET_MANIFEST = {
  skins: {
    classic_poop: {
      variant: 'default',
      color: '#8B5A2B',
      status: 'FINAL',
      path: 'P1_skins/classic/poop_classic_normal.svg',
    },
    corny_poop: {
      variant: 'chunky',
      color: '#C4A35A',
      status: 'FINAL',
      path: 'P1_skins/corny/poop_corny_normal.svg',
    },
    coffee_poop: { variant: 'jitter', color: '#4B2E1E', status: 'PROCEDURAL_FINAL' },
    burrito_poop: { variant: 'soft', color: '#A67C52', status: 'PROCEDURAL_FINAL' },
    taco_poop: { variant: 'crunch', color: '#D4A017', status: 'PROCEDURAL_FINAL' },
    office_poop: { variant: 'tie', color: '#5C4033', status: 'PROCEDURAL_FINAL' },
    gamer_poop: { variant: 'rgb', color: '#7B2CBF', status: 'PROCEDURAL_FINAL' },
    construction_poop: { variant: 'helmet', color: '#E67E22', status: 'PROCEDURAL_FINAL' },
    chef_poop: { variant: 'hat', color: '#F5F5F5', status: 'PROCEDURAL_FINAL' },
    doctor_poop: { variant: 'stethoscope', color: '#ECF0F1', status: 'PROCEDURAL_FINAL' },
    cactus_poop: { variant: 'spiky', color: '#2E8B57', status: 'PROCEDURAL_FINAL' },
    cowboy_poop: { variant: 'hat_tip', color: '#A0522D', status: 'PROCEDURAL_FINAL' },
    pirate_poop: { variant: 'eyepatch', color: '#2C3E50', status: 'PROCEDURAL_FINAL' },
    rainbow_poop: { variant: 'prism', color: '#FF6BCB', status: 'PROCEDURAL_FINAL' },
    disco_poop: { variant: 'disco', color: '#9B59B6', status: 'PROCEDURAL_FINAL' },
    ghost_poop: { variant: 'fade', color: '#D5DBDB', status: 'PROCEDURAL_FINAL' },
    zombie_poop: { variant: 'lurch', color: '#7D8F69', status: 'PROCEDURAL_FINAL' },
    vampire_poop: { variant: 'cape', color: '#6C1D45', status: 'PROCEDURAL_FINAL' },
    pumpkin_poop: { variant: 'carve', color: '#E67E22', status: 'PROCEDURAL_FINAL' },
    santa_poop: { variant: 'jolly', color: '#C0392B', status: 'PROCEDURAL_FINAL' },
    unicorn_poop: { variant: 'sparkle', color: '#F8C8DC', status: 'PROCEDURAL_FINAL' },
    alien_poop: { variant: 'float', color: '#2ECC71', status: 'PROCEDURAL_FINAL' },
    astronaut_poop: { variant: 'zero_g', color: '#BDC3C7', status: 'PROCEDURAL_FINAL' },
    viking_poop: { variant: 'horn', color: '#7F8C8D', status: 'PROCEDURAL_FINAL' },
    samurai_poop: { variant: 'katana', color: '#34495E', status: 'PROCEDURAL_FINAL' },
    knight_poop: { variant: 'armor', color: '#95A5A6', status: 'PROCEDURAL_FINAL' },
    wizard_poop: { variant: 'staff', color: '#5B2C6F', status: 'PROCEDURAL_FINAL' },
    devil_poop: { variant: 'horns', color: '#922B21', status: 'PROCEDURAL_FINAL' },
    angel_poop: { variant: 'halo', color: '#FCF3CF', status: 'PROCEDURAL_FINAL' },
    diamond_poop: {
      variant: 'crystal',
      color: '#AED6F1',
      status: 'FINAL',
      path: 'P1_skins/diamond/poop_diamond_normal.svg',
    },
    cyber_poop: {
      variant: 'neon',
      color: '#00F5FF',
      status: 'FINAL',
      path: 'P1_skins/cyber/poop_cyber_normal.svg',
    },
    pixel_poop: { variant: 'pixel', color: '#E74C3C', status: 'PROCEDURAL_FINAL' },
    glitch_poop: { variant: 'glitch', color: '#1ABC9C', status: 'PROCEDURAL_FINAL' },
    nuclear_poop: { variant: 'glow', color: '#A8FF3E', status: 'PROCEDURAL_FINAL' },
    king_poop: { variant: 'crown', color: '#F4D03F', status: 'PROCEDURAL_FINAL' },
    black_hole_poop: {
      variant: 'singularity',
      color: '#1C1C1C',
      status: 'FINAL',
      path: 'P1_skins/blackhole/poop_blackhole_normal.svg',
    },
    holographic_poop: { variant: 'holo', color: '#85C1E9', status: 'PROCEDURAL_FINAL' },
    time_traveller_poop: { variant: 'chrono', color: '#5DADE2', status: 'PROCEDURAL_FINAL' },
    multiverse_poop: { variant: 'split', color: '#AF7AC5', status: 'PROCEDURAL_FINAL' },
    void_poop: { variant: 'void', color: '#2C003E', status: 'PROCEDURAL_FINAL' },
    developer_poop: { variant: 'coffee_code', color: '#273746', status: 'PROCEDURAL_FINAL' },
    ceo_poop: { variant: 'suit', color: '#1A5276', status: 'PROCEDURAL_FINAL' },
    '404_poop': {
      variant: 'error',
      color: '#E74C3C',
      status: 'FINAL',
      path: 'P1_skins/404/poop_404_normal.svg',
    },
    schrodingers_poop: { variant: 'box', color: '#ABB2B9', status: 'PROCEDURAL_FINAL' },
    the_final_poop: { variant: 'final', color: '#F5B041', status: 'PROCEDURAL_FINAL' },
    toilet_tycoon: { variant: 'tycoon', color: '#C0C0C0', status: 'PROCEDURAL_FINAL' },
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
    '40 procedural skin compositions without authored benchmark SVGs',
    '7 worlds still using procedural backgrounds',
  ],
  /** Explicit missing slots reserved for future art pipeline. */
  missingSlots: {
    remaining_skin_compositions: { status: 'MISSING' },
    remaining_world_illustrations: { status: 'MISSING' },
  },
} as const
