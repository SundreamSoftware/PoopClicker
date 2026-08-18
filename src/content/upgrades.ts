import type { UpgradeDef, UpgradeTier } from '../core/types/gameTypes'

const TIER_GROWTH: Record<UpgradeTier, number> = {
  bathroom_basics: 1.35,
  advanced_plumbing: 1.45,
  industrial_digestion: 1.55,
  nuclear_bathroom: 1.7,
  quantum_pooping: 1.85,
  multiversal_plumbing: 2.05,
}

function tap(
  id: string,
  name: string,
  description: string,
  tier: UpgradeTier,
  baseCost: number,
  effectValue: number,
  extras: Partial<UpgradeDef> = {},
): UpgradeDef {
  return {
    id,
    name,
    description,
    category: 'tap',
    tier,
    baseCost,
    costGrowth: TIER_GROWTH[tier],
    maxLevel: extras.maxLevel ?? 25,
    effectType: extras.effectType ?? 'tap_multiplier',
    effectValue,
    ...extras,
  }
}

export const UPGRADES: UpgradeDef[] = [
  // Tier 1 — Bathroom Basics
  tap(
    'more_fiber',
    'More Fiber',
    'A polite suggestion from your gut.',
    'bathroom_basics',
    50,
    0.15,
  ),
  tap('premium_fiber', 'Premium Fiber', 'Artisanal oats. Fancy.', 'bathroom_basics', 250, 0.2, {
    requiresUpgradeId: 'more_fiber',
  }),
  tap(
    'questionable_burrito',
    'Questionable Burrito',
    'Was that beef? Ambiguous.',
    'bathroom_basics',
    1_000,
    0.25,
    { requiresUpgradeId: 'premium_fiber' },
  ),
  tap(
    'emergency_espresso',
    'Emergency Espresso',
    'For deadlines and digestion.',
    'bathroom_basics',
    4_000,
    0.3,
  ),
  tap(
    'double_espresso',
    'Double Espresso',
    'Now with extra regret.',
    'bathroom_basics',
    12_000,
    0.35,
    {
      requiresUpgradeId: 'emergency_espresso',
    },
  ),

  // Tier 2
  tap(
    'chili_accelerator',
    'Chili Accelerator',
    'Every 5th tap splashes extra PP.',
    'advanced_plumbing',
    50_000,
    0.4,
    { effectType: 'splash_power' },
  ),
  tap(
    'triple_chili_disaster',
    'Triple Chili Disaster',
    'Splash hits even harder.',
    'advanced_plumbing',
    180_000,
    0.5,
    { requiresUpgradeId: 'chili_accelerator', effectType: 'splash_power' },
  ),
  tap(
    'reinforced_toilet_seat',
    'Reinforced Toilet Seat',
    'Each tap siphons a slice of current PPS.',
    'advanced_plumbing',
    500_000,
    0.006,
    { effectType: 'tap_from_pps' },
  ),
  tap(
    'titanium_toilet_seat',
    'Titanium Toilet Seat',
    'Generator milestones harden your tap.',
    'advanced_plumbing',
    1_500_000,
    0.02,
    { requiresUpgradeId: 'reinforced_toilet_seat', effectType: 'milestone_tap' },
  ),
  tap(
    'industrial_plunger',
    'Industrial Plunger',
    'HR has questions.',
    'advanced_plumbing',
    4_000_000,
    0.6,
  ),

  // Tier 3
  tap(
    'hydraulic_plunger',
    'Hydraulic Plunger',
    'Pressurized persuasion.',
    'industrial_digestion',
    15_000_000,
    0.7,
  ),
  tap(
    'diamond_plunger',
    'Diamond Plunger',
    'Bling for the bowl.',
    'industrial_digestion',
    60_000_000,
    0.8,
    { requiresUpgradeId: 'hydraulic_plunger' },
  ),
  tap(
    'turbo_digestion',
    'Turbo Digestion',
    'Vroom. Internally.',
    'industrial_digestion',
    200_000_000,
    0.9,
  ),
  tap(
    'military_grade_fiber',
    'Military Grade Fiber',
    'Classified bran.',
    'industrial_digestion',
    800_000_000,
    1.0,
  ),
  tap(
    'advanced_bathroom_physics',
    'Advanced Bathroom Physics',
    'Your best generator gets a swirl bonus.',
    'industrial_digestion',
    3_000_000_000,
    0.25,
    { effectType: 'best_gen_amp' },
  ),

  // Tier 4
  tap(
    'experimental_digestion',
    'Experimental Digestion',
    'Peer-reviewed panic.',
    'nuclear_bathroom',
    12_000_000_000,
    1.25,
    { requiresFlushCount: 1 },
  ),
  tap(
    'nasa_flush_technology',
    'NASA Flush Technology',
    'One small sit for man.',
    'nuclear_bathroom',
    50_000_000_000,
    1.4,
    { requiresFlushCount: 1, requiresUpgradeId: 'experimental_digestion' },
  ),
  tap(
    'nuclear_fiber',
    'Nuclear Fiber',
    'Glows in the dark. Probably fine.',
    'nuclear_bathroom',
    2e11,
    1.6,
    {
      requiresFlushCount: 3,
    },
  ),
  tap(
    'quantum_pooping',
    'Quantum Pooping',
    'Superposition of relief.',
    'quantum_pooping',
    8.5e14,
    2.0,
    {
      requiresFlushCount: 10,
      requiresWorldId: 'quantum_bathroom',
      maxLevel: 15,
    },
  ),
  tap(
    'dark_matter_digestion',
    'Dark Matter Digestion',
    '96% unexplained.',
    'quantum_pooping',
    4e15,
    2.2,
    { requiresFlushCount: 12, requiresUpgradeId: 'quantum_pooping', maxLevel: 15 },
  ),

  // Tier 5-6
  tap(
    'antimatter_burrito',
    'Antimatter Burrito',
    'Annihilates hunger and dignity.',
    'quantum_pooping',
    2e16,
    2.5,
    { requiresFlushCount: 15, maxLevel: 12 },
  ),
  tap(
    'relativistic_taco',
    'Relativistic Taco',
    'Time dilates near salsa.',
    'quantum_pooping',
    1e17,
    2.8,
    { requiresFlushCount: 18, maxLevel: 12 },
  ),
  tap(
    'temporal_digestion',
    'Temporal Digestion',
    'Finished before you started.',
    'multiversal_plumbing',
    8e17,
    3.2,
    { requiresFlushCount: 20, maxLevel: 10 },
  ),
  tap(
    'interdimensional_fiber',
    'Interdimensional Fiber',
    'Bran from realm B.',
    'multiversal_plumbing',
    5e18,
    3.6,
    { requiresFlushCount: 25, maxLevel: 10 },
  ),
  tap(
    'multiverse_metabolism',
    'Multiverse Metabolism',
    'Every you is digesting.',
    'multiversal_plumbing',
    3e19,
    4.0,
    { requiresFlushCount: 30, maxLevel: 10 },
  ),
  tap(
    'reality_bending_burrito',
    'Reality-Bending Burrito',
    'Plot armor optional.',
    'multiversal_plumbing',
    2e20,
    4.5,
    { requiresFlushCount: 40, maxLevel: 8 },
  ),
  tap(
    'infinite_digestion',
    'Infinite Digestion',
    'The gut that never quits.',
    'multiversal_plumbing',
    1.5e21,
    5.0,
    { requiresFlushCount: 50, maxLevel: 8 },
  ),
  tap(
    'forbidden_taco',
    'Forbidden Taco',
    'HR banned this twice.',
    'multiversal_plumbing',
    1e22,
    5.5,
    { requiresFlushCount: 60, maxLevel: 8 },
  ),
  tap(
    'the_brown_equation',
    'The Brown Equation',
    'E = mc², but brown.',
    'multiversal_plumbing',
    8e22,
    6.0,
    { requiresFlushCount: 75, maxLevel: 5 },
  ),
  tap(
    'ultimate_poop_theory',
    'Ultimate Poop Theory',
    'Unifies all bathroom forces.',
    'multiversal_plumbing',
    1e24,
    8.0,
    { requiresFlushCount: 100, maxLevel: 5 },
  ),

  // Combo upgrades
  {
    id: 'sticky_combo',
    name: 'Sticky Combo',
    description: 'Combo fades slower.',
    category: 'combo',
    tier: 'bathroom_basics',
    baseCost: 2_000,
    costGrowth: 1.5,
    maxLevel: 20,
    effectType: 'combo_decay',
    effectValue: -0.05,
  },
  {
    id: 'combo_ceiling',
    name: 'Combo Ceiling Raise',
    description: 'Higher combo cap.',
    category: 'combo',
    tier: 'advanced_plumbing',
    baseCost: 25_000,
    costGrowth: 1.55,
    maxLevel: 15,
    effectType: 'combo_max',
    effectValue: 2,
  },
  {
    id: 'frenzy_warmup',
    name: 'Frenzy Warm-Up',
    description: 'Enter Frenzy sooner.',
    category: 'combo',
    tier: 'advanced_plumbing',
    baseCost: 120_000,
    costGrowth: 1.6,
    maxLevel: 10,
    effectType: 'frenzy_threshold',
    effectValue: -0.3,
  },
  {
    id: 'frenzy_encore',
    name: 'Frenzy Encore',
    description: 'Frenzy lasts longer.',
    category: 'combo',
    tier: 'industrial_digestion',
    baseCost: 2_000_000,
    costGrowth: 1.65,
    maxLevel: 10,
    effectType: 'frenzy_duration',
    effectValue: 0.5,
  },
  {
    id: 'overdrive_gloves',
    name: 'Overdrive Gloves',
    description: 'Crits in Overdrive hit harder.',
    category: 'combo',
    tier: 'nuclear_bathroom',
    baseCost: 80_000_000,
    costGrowth: 1.7,
    maxLevel: 8,
    effectType: 'overdrive_crit',
    effectValue: 0.35,
    requiresFlushCount: 1,
  },
  {
    id: 'rhythm_plumbing',
    name: 'Rhythm Plumbing',
    description: 'High combo raises crit chance.',
    category: 'combo',
    tier: 'nuclear_bathroom',
    baseCost: 400_000_000,
    costGrowth: 1.75,
    maxLevel: 10,
    effectType: 'combo_crit',
    effectValue: 0.0025,
    requiresFlushCount: 2,
  },
  {
    id: 'combo_insurance',
    name: 'Combo Insurance',
    description: 'Decay takes a coffee break.',
    category: 'combo',
    tier: 'quantum_pooping',
    baseCost: 5e12,
    costGrowth: 1.8,
    maxLevel: 12,
    effectType: 'combo_decay',
    effectValue: -0.08,
    requiresFlushCount: 8,
  },
  {
    id: 'frenzy_festival',
    name: 'Frenzy Festival',
    description: 'Frenzy buffs generators, not just taps.',
    category: 'combo',
    tier: 'quantum_pooping',
    baseCost: 3e14,
    costGrowth: 1.85,
    maxLevel: 8,
    effectType: 'frenzy_idle',
    effectValue: 0.12,
    requiresFlushCount: 12,
  },
  {
    id: 'maximum_poopacity_prep',
    name: 'Maximum Poopacity Prep',
    description: 'Train for Overdrive.',
    category: 'combo',
    tier: 'multiversal_plumbing',
    baseCost: 2e18,
    costGrowth: 1.9,
    maxLevel: 6,
    effectType: 'frenzy_threshold',
    effectValue: -0.4,
    requiresFlushCount: 25,
  },
  {
    id: 'eternal_combo',
    name: 'Eternal Combo',
    description: 'Combo 8+ wakes the generators.',
    category: 'combo',
    tier: 'multiversal_plumbing',
    baseCost: 5e20,
    costGrowth: 2.0,
    maxLevel: 5,
    effectType: 'combo_gen',
    effectValue: 0.15,
    requiresFlushCount: 40,
  },

  // Critical upgrades
  {
    id: 'lucky_seat',
    name: 'Lucky Seat',
    description: 'Slightly more critical moments.',
    category: 'critical',
    tier: 'bathroom_basics',
    baseCost: 3_000,
    costGrowth: 1.55,
    maxLevel: 20,
    effectType: 'crit_chance',
    effectValue: 0.005,
  },
  {
    id: 'crit_plunger',
    name: 'Crit Plunger',
    description: 'Critical hits hit harder.',
    category: 'critical',
    tier: 'advanced_plumbing',
    baseCost: 40_000,
    costGrowth: 1.6,
    maxLevel: 15,
    effectType: 'crit_multiplier',
    effectValue: 0.5,
  },
  {
    id: 'precision_wipe',
    name: 'Precision Wipe',
    description: 'Accuracy matters.',
    category: 'critical',
    tier: 'advanced_plumbing',
    baseCost: 200_000,
    costGrowth: 1.65,
    maxLevel: 15,
    effectType: 'crit_chance',
    effectValue: 0.008,
  },
  {
    id: 'golden_flush_instinct',
    name: 'Golden Flush Instinct',
    description: 'Catching a Golden Poop extends Frenzy.',
    category: 'critical',
    tier: 'industrial_digestion',
    baseCost: 5_000_000,
    costGrowth: 1.7,
    maxLevel: 12,
    effectType: 'golden_frenzy',
    effectValue: 1.5,
  },
  {
    id: 'critical_mass',
    name: 'Critical Mass',
    description: 'Do not exceed recommended dosage.',
    category: 'critical',
    tier: 'nuclear_bathroom',
    baseCost: 100_000_000,
    costGrowth: 1.75,
    maxLevel: 10,
    effectType: 'crit_chance',
    effectValue: 0.01,
    requiresFlushCount: 1,
  },
  {
    id: 'chain_reaction_seat',
    name: 'Chain Reaction Seat',
    description: 'A crit can chain into another crit.',
    category: 'critical',
    tier: 'nuclear_bathroom',
    baseCost: 600_000_000,
    costGrowth: 1.8,
    maxLevel: 8,
    effectType: 'crit_chain',
    effectValue: 0.08,
    requiresFlushCount: 3,
  },
  {
    id: 'supernova_splat',
    name: 'Supernova Splat',
    description: 'Crit multiplier goes stellar.',
    category: 'critical',
    tier: 'quantum_pooping',
    baseCost: 8e12,
    costGrowth: 1.85,
    maxLevel: 10,
    effectType: 'crit_multiplier',
    effectValue: 1.0,
    requiresFlushCount: 10,
  },
  {
    id: 'probability_plunger',
    name: 'Probability Plunger',
    description: 'Luck, but engineered.',
    category: 'critical',
    tier: 'quantum_pooping',
    baseCost: 5e14,
    costGrowth: 1.9,
    maxLevel: 8,
    effectType: 'crit_chance',
    effectValue: 0.015,
    requiresFlushCount: 15,
  },
  {
    id: 'destiny_dump',
    name: 'Destiny Dump',
    description: 'The universe crits with you.',
    category: 'critical',
    tier: 'multiversal_plumbing',
    baseCost: 3e18,
    costGrowth: 2.0,
    maxLevel: 6,
    effectType: 'crit_multiplier',
    effectValue: 1.5,
    requiresFlushCount: 30,
  },
  {
    id: 'final_crit_form',
    name: 'Final Crit Form',
    description: 'Still not 100%. We have standards.',
    category: 'critical',
    tier: 'multiversal_plumbing',
    baseCost: 2e21,
    costGrowth: 2.1,
    maxLevel: 5,
    effectType: 'crit_chance',
    effectValue: 0.02,
    requiresFlushCount: 50,
  },

  // Idle
  {
    id: 'night_light_loo',
    name: 'Night Light Loo',
    description: 'Idle work while you sleep.',
    category: 'idle',
    tier: 'bathroom_basics',
    baseCost: 5_000,
    costGrowth: 1.5,
    maxLevel: 20,
    effectType: 'idle_multiplier',
    effectValue: 0.1,
  },
  {
    id: 'auto_flush_firmware',
    name: 'Auto-Flush Firmware',
    description: 'Generators feel motivated.',
    category: 'idle',
    tier: 'advanced_plumbing',
    baseCost: 80_000,
    costGrowth: 1.55,
    maxLevel: 15,
    effectType: 'generator_production',
    effectValue: 0.15,
  },
  {
    id: 'long_meeting_bladder',
    name: 'Long Meeting Bladder',
    description: 'Offline cap practice.',
    category: 'idle',
    tier: 'industrial_digestion',
    baseCost: 10_000_000,
    costGrowth: 1.7,
    maxLevel: 5,
    effectType: 'offline_cap',
    effectValue: 1,
  },
]

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]))

export function formatUpgradeEffect(upgrade: UpgradeDef): string {
  const value = upgrade.effectValue
  const pct = `${Math.round(Math.abs(value) * 1000) / 10}%`
  switch (upgrade.effectType) {
    case 'tap_multiplier':
    case 'tap_power':
      return `+${pct} tap power / level`
    case 'idle_multiplier':
      return `+${pct} idle production / level`
    case 'generator_production':
      return `+${pct} generator production / level`
    case 'global_production':
      return `+${pct} all production / level`
    case 'crit_chance':
      return `+${pct} crit chance / level`
    case 'crit_multiplier':
      return `+${value}× crit multiplier / level`
    case 'combo_max':
      return `+${value} max combo / level`
    case 'combo_decay':
      return `${value > 0 ? '+' : ''}${value} combo decay / level`
    case 'frenzy_threshold':
      return `${value > 0 ? '+' : ''}${value} frenzy CPS threshold / level`
    case 'frenzy_duration':
      return `+${value}s frenzy duration / level`
    case 'offline_cap':
      return `+${value}h offline cap / level`
    case 'golden_chance':
      return `+${pct} golden chance / level`
    case 'event_reward':
      return `+${pct} event rewards / level`
    case 'auto_buy_interval':
      return `${value}s Auto-Buy interval / level`
    case 'splash_power':
      return `+${pct} splash on every 5th tap / level`
    case 'crit_chain':
      return `+${pct} chance a crit chains / level`
    case 'combo_crit':
      return `+${pct} crit chance per combo / level`
    case 'tap_from_pps':
      return `+${pct} of PPS added to each tap / level`
    case 'milestone_tap':
      return `+${pct} tap per generator milestone / level`
    case 'frenzy_idle':
      return `+${pct} generator PPS during Frenzy / level`
    case 'best_gen_amp':
      return `+${pct} to your best generator / level`
    case 'golden_frenzy':
      return `+${value}s Frenzy when you catch a Golden Poop / level`
    case 'overdrive_crit':
      return `+${value}× crit multiplier in Overdrive / level`
    case 'combo_gen':
      return `+${pct} generator PPS at combo 8+ / level`
    default:
      return upgrade.effectType
  }
}

export type BuildArchetype = 'tapper' | 'idler' | 'hybrid'

/** Quality + spine IDs that define the three readable builds. */
export const ARCHETYPE_UPGRADE_IDS: Record<BuildArchetype, readonly string[]> = {
  tapper: [
    'more_fiber',
    'chili_accelerator',
    'triple_chili_disaster',
    'chain_reaction_seat',
    'rhythm_plumbing',
    'overdrive_gloves',
    'lucky_seat',
    'sticky_combo',
  ],
  idler: [
    'night_light_loo',
    'auto_flush_firmware',
    'long_meeting_bladder',
    'frenzy_festival',
    'advanced_bathroom_physics',
  ],
  hybrid: [
    'reinforced_toilet_seat',
    'titanium_toilet_seat',
    'eternal_combo',
    'golden_flush_instinct',
  ],
}

export function scoreBuildArchetypes(
  levels: Record<string, number>,
): Record<BuildArchetype, number> {
  const score = (ids: readonly string[]) =>
    ids.reduce((sum, id) => sum + Math.max(0, levels[id] ?? 0), 0)
  return {
    tapper: score(ARCHETYPE_UPGRADE_IDS.tapper),
    idler: score(ARCHETYPE_UPGRADE_IDS.idler),
    hybrid: score(ARCHETYPE_UPGRADE_IDS.hybrid),
  }
}
