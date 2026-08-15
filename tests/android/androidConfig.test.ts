import { existsSync, readFileSync } from 'node:fs'
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

  it('minifies release APKs with Capacitor keep rules', () => {
    const gradle = readFileSync(gradlePath, 'utf8')
    const proguard = readFileSync('android/app/proguard-rules.pro', 'utf8')
    expect(gradle).toMatch(/minifyEnabled\s+true/)
    expect(proguard).toContain('com.getcapacitor')
    expect(proguard).toContain('JavascriptInterface')
  })

  it('rejects Google sample AdMob IDs in the production release workflow', () => {
    const workflow = readFileSync('.github/workflows/android-release.yml', 'utf8')
    expect(workflow).toContain('3940256099942544')
    expect(workflow).toContain('Production builds cannot use Google sample AdMob IDs')
  })

  it('ships the authored adaptive icon and splash resources', () => {
    expect(
      existsSync('android/app/src/main/res/drawable-nodpi/ic_launcher_foreground_authored.png'),
    ).toBe(true)
    expect(
      existsSync('android/app/src/main/res/drawable-nodpi/ic_launcher_background_authored.png'),
    ).toBe(true)
    expect(existsSync('android/app/src/main/res/drawable-nodpi/splash_art.webp')).toBe(true)
  })
})
