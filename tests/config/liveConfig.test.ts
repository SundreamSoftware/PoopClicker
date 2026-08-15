import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_LIVE_CONFIG,
  isSeasonActive,
  loadLiveConfig,
  parseLiveConfig,
  setLiveConfigForTests,
} from '../../src/config/liveConfig'

describe('liveConfig', () => {
  afterEach(() => {
    setLiveConfigForTests(null)
  })

  it('fails closed on invalid payloads', () => {
    expect(parseLiveConfig(null)).toEqual(DEFAULT_LIVE_CONFIG)
    expect(parseLiveConfig('nope')).toEqual(DEFAULT_LIVE_CONFIG)
    expect(parseLiveConfig({ features: { iapEnabled: false } }).features.iapEnabled).toBe(false)
    expect(parseLiveConfig({ features: { interstitialsEnabled: false } }).features.interstitialsEnabled).toBe(
      false,
    )
  })

  it('detects an active season window', () => {
    const config = parseLiveConfig({
      version: 1,
      season: {
        id: 'test',
        name: 'Test Season',
        startsAt: '2026-08-01T00:00:00.000Z',
        endsAt: '2026-08-31T00:00:00.000Z',
      },
    })
    expect(isSeasonActive(config, Date.parse('2026-08-15T00:00:00.000Z'))).toBe(true)
    expect(isSeasonActive(config, Date.parse('2026-09-01T00:00:00.000Z'))).toBe(false)
    expect(isSeasonActive(DEFAULT_LIVE_CONFIG, Date.now())).toBe(false)
  })

  it('loads same-origin config and falls back on network failure', async () => {
    const ok = await loadLiveConfig(
      async () =>
        new Response(JSON.stringify({ version: 2, features: { iapEnabled: false } }), {
          status: 200,
        }),
    )
    expect(ok.version).toBe(2)
    expect(ok.features.iapEnabled).toBe(false)

    const failed = await loadLiveConfig(async () => {
      throw new Error('offline')
    })
    expect(failed).toEqual(DEFAULT_LIVE_CONFIG)
  })
})
