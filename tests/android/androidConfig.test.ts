import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const APP_ID = 'pl.sundreamsoftware.poopclicker'
const FORBIDDEN_APP_ID = 'com.sundreamsoftware.poopclicker'
const manifestPath = 'android/app/src/main/AndroidManifest.xml'
const gradlePath = 'android/app/build.gradle'
const activityPath = 'android/app/src/main/java/pl/sundreamsoftware/poopclicker/MainActivity.java'
const leftoverComJavaPaths = [
  'android/app/src/main/java/com/sundreamsoftware/poopclicker/MainActivity.java',
  'android/app/src/test/java/com/sundreamsoftware/poopclicker/ExampleUnitTest.java',
  'android/app/src/androidTest/java/com/sundreamsoftware/poopclicker/ExampleInstrumentedTest.java',
] as const

describe('Android startup configuration', () => {
  it('uses the Play applicationId as Capacitor appId and Gradle namespace', () => {
    const capacitorConfig = readFileSync('capacitor.config.ts', 'utf8')
    const gradle = readFileSync(gradlePath, 'utf8')

    expect(capacitorConfig).toContain(`appId: '${APP_ID}'`)
    expect(gradle).toContain(`namespace = "${APP_ID}"`)
    expect(gradle).toContain(`applicationId "${APP_ID}"`)
    expect(existsSync(activityPath)).toBe(true)
  })

  it('rejects leftover com.sundreamsoftware.poopclicker identity and IAP store IDs', () => {
    const capacitorConfig = readFileSync('capacitor.config.ts', 'utf8')
    const gradle = readFileSync(gradlePath, 'utf8')
    const iapCatalog = readFileSync('src/content/iapProducts.ts', 'utf8')

    expect(capacitorConfig).not.toContain(FORBIDDEN_APP_ID)
    expect(gradle).not.toContain(FORBIDDEN_APP_ID)
    expect(iapCatalog).not.toContain(FORBIDDEN_APP_ID)

    for (const leftoverPath of leftoverComJavaPaths) {
      expect(existsSync(leftoverPath), leftoverPath).toBe(false)
    }
  })

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
