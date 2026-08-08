import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
const gradlePath = 'android/app/build.gradle'

describe('Android startup configuration', () => {
  it('declares the Google Mobile Ads application id metadata', () => {
    const manifest = readFileSync(manifestPath, 'utf8')

    expect(manifest).toContain('com.google.android.gms.ads.APPLICATION_ID')
    expect(manifest).toContain('${ADMOB_APP_ID}')
  })

  it('provides a safe test app id when no release id is configured', () => {
    const gradle = readFileSync(gradlePath, 'utf8')

    expect(gradle).toContain('manifestPlaceholders')
    expect(gradle).toContain('ca-app-pub-3940256099942544~3347511713')
  })
})
