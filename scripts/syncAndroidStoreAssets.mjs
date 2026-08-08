import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(root, 'public/assets/P2_store')
const androidRes = resolve(root, 'android/app/src/main/res')

const launcherSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

const copies = []
for (const [density, size] of Object.entries(launcherSizes)) {
  const source = resolve(sourceRoot, `png/ic_launcher_${size}.png`)
  copies.push([source, resolve(androidRes, `${density}/ic_launcher.png`)])
  copies.push([source, resolve(androidRes, `${density}/ic_launcher_round.png`)])
}

copies.push(
  [
    resolve(sourceRoot, 'png/ic_launcher_foreground_432.png'),
    resolve(androidRes, 'drawable-nodpi/ic_launcher_foreground_authored.png'),
  ],
  [
    resolve(sourceRoot, 'png/ic_launcher_background_432.png'),
    resolve(androidRes, 'drawable-nodpi/ic_launcher_background_authored.png'),
  ],
  [
    resolve(sourceRoot, 'webp/splash_1440x2560.webp'),
    resolve(androidRes, 'drawable-nodpi/splash_art.webp'),
  ],
)

for (const [source, destination] of copies) {
  if (!existsSync(source)) {
    throw new Error(`Missing authored Android asset: ${source}`)
  }
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(source, destination)
}

console.info(`Synced ${copies.length} authored Android resources.`)
