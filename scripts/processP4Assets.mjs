/**
 * Normalize P4 pack assets via scripts/processP4Assets.py (Pillow).
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const py = join(root, 'scripts', 'processP4Assets.py')

const result = spawnSync('py', [py], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
})
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
if (result.status !== 0) {
  throw new Error(`processP4Assets.py failed with code ${result.status}`)
}
console.info('P4 asset processing complete.')
