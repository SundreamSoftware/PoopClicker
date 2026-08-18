import type { WorldDef } from '../core/types/gameTypes'

export const WORLDS: WorldDef[] = [
  {
    id: 'home_bathroom',
    name: 'Grimy Bathroom',
    description: 'Peeling paint, stained tiles, and a very tired duck.',
    unlockFlushCount: 0,
    productionBonus: 0,
    asset: 'worlds/home_bathroom',
  },
  {
    id: 'office_toilet',
    name: 'Castle Keep',
    description: 'Stone throne, wooden seat, lantern lighting.',
    unlockFlushCount: 1,
    productionBonus: 0.05,
    asset: 'worlds/office_toilet',
  },
  {
    id: 'gas_station_restroom',
    name: 'Haunted Stall',
    description: 'Skull planters, green candles, and a very full moon.',
    unlockFlushCount: 2,
    productionBonus: 0.08,
    asset: 'worlds/gas_station',
  },
  {
    id: 'stadium_loo',
    name: 'Brassworks',
    description: 'Rivets, gauges, and a sky-high porthole.',
    unlockFlushCount: 3,
    productionBonus: 0.1,
    asset: 'worlds/stadium',
  },
  {
    id: 'space_loo',
    name: 'Neon Sprawl',
    description: 'Pink-blue city glow. No up, only neon.',
    unlockFlushCount: 5,
    productionBonus: 0.15,
    asset: 'worlds/space_loo',
  },
  {
    id: 'quantum_bathroom',
    name: 'Ice Chamber',
    description: 'Icicles, snowflakes, and a frozen swirl.',
    unlockFlushCount: 6,
    productionBonus: 0.2,
    asset: 'worlds/quantum_bathroom',
  },
  {
    id: 'chrono_chamber',
    name: 'Renovated Bathroom',
    description: 'Same layout as the start. Someone finally cleaned.',
    unlockFlushCount: 7,
    productionBonus: 0.25,
    asset: 'worlds/chrono_chamber',
  },
  {
    id: 'neon_arcade_stall',
    name: 'Bamboo Spa',
    description: 'Palms, reeds, and a woven mat.',
    unlockFlushCount: 8,
    productionBonus: 0.3,
    asset: 'worlds/neon_arcade',
  },
  {
    id: 'volcanic_spa_toilet',
    name: 'Marble Suite',
    description: 'Veined marble. Gold optional, but present.',
    unlockFlushCount: 9,
    productionBonus: 0.35,
    asset: 'worlds/volcanic_spa',
  },
  {
    id: 'cloud_restroom',
    name: 'Royal Chamber',
    description: 'Fleur-de-lis, red velvet, chandelier.',
    unlockFlushCount: 10,
    productionBonus: 0.4,
    asset: 'worlds/cloud_restroom',
  },
  {
    id: 'void_washroom',
    name: 'Palace Vault',
    description: 'The same throne room. More echo.',
    unlockFlushCount: 15,
    productionBonus: 0.5,
    asset: 'worlds/void_washroom',
  },
  {
    id: 'omni_throne',
    name: 'Royal Throne',
    description: 'The seat at the end of plumbing.',
    unlockFlushCount: 25,
    productionBonus: 0.75,
    asset: 'worlds/omni_throne',
  },
]

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w]))

/** One Collection row per P4 environment (L1–L10). Extra IDs stay for saves. */
export const COLLECTION_WORLD_IDS = [
  'home_bathroom',
  'office_toilet',
  'gas_station_restroom',
  'stadium_loo',
  'space_loo',
  'quantum_bathroom',
  'chrono_chamber',
  'neon_arcade_stall',
  'volcanic_spa_toilet',
  'cloud_restroom',
] as const

export const COLLECTION_WORLDS = COLLECTION_WORLD_IDS.map((id) => {
  const world = WORLD_BY_ID[id]
  if (!world) {
    throw new Error(`Missing collection world: ${id}`)
  }
  return world
})
