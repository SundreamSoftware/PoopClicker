import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const distAssets = resolve(import.meta.dirname, '../dist/assets')
const forbidden = [
  '_generator',
  'index.html',
  'P0_environment',
  'P0_vfx/frames',
  'P1_events/toilet_paper/frames',
  'P2_store',
]
const required = [
  'P0_character/expressions/poop_classic_normal.svg',
  'P0_toilet/toilet_idle.svg',
  'P1_worlds/home_bathroom/layers/world_home_bathroom_background.webp',
  'P1_events/golden_poop/golden_poop_target.svg',
  'P1_ui/currency/icon_pp.svg',
  'P3_spritesheets/tap_burst_sheet.webp',
]

const failures = []
for (const path of forbidden) {
  if (existsSync(resolve(distAssets, path))) failures.push(`forbidden runtime asset: ${path}`)
}
for (const path of required) {
  if (!existsSync(resolve(distAssets, path))) failures.push(`missing runtime asset: ${path}`)
}

if (failures.length) {
  throw new Error(`Runtime asset validation failed:\n${failures.join('\n')}`)
}

console.info(
  `Runtime asset validation passed (${required.length} required, ${forbidden.length} pruned).`,
)
