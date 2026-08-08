import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
const gradlePath = 'android/app/build.gradle'
const activityPath = 'android/app/src/main/java/com/sundreamsoftware/poopclicker/MainActivity.java'

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

  it('uses transient immersive navigation so system buttons do not cover the dock', () => {
    const activity = readFileSync(activityPath, 'utf8')

    expect(activity).toContain('WindowInsetsCompat.Type.navigationBars()')
    expect(activity).toContain('BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE')
    expect(activity).toContain('onWindowFocusChanged')
  })
})
