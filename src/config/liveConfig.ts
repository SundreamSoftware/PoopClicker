/** Local / same-origin live config. Fail-closed to defaults when missing or invalid. */

export interface LiveSeason {
  id: string
  name: string
  startsAt: string
  endsAt: string
}

export interface LiveConfig {
  version: number
  season: LiveSeason | null
  features: {
    interstitialsEnabled: boolean
    iapEnabled: boolean
  }
}

export const DEFAULT_LIVE_CONFIG: LiveConfig = {
  version: 1,
  season: null,
  features: {
    interstitialsEnabled: true,
    iapEnabled: true,
  },
}

let current: LiveConfig = DEFAULT_LIVE_CONFIG

export function getLiveConfig(): LiveConfig {
  return current
}

export function setLiveConfigForTests(config: LiveConfig | null): void {
  current = config ?? DEFAULT_LIVE_CONFIG
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function parseLiveConfig(raw: unknown): LiveConfig {
  const rec = asRecord(raw)
  if (!rec) return DEFAULT_LIVE_CONFIG
  const features = asRecord(rec.features)
  const seasonRaw = rec.season == null ? null : asRecord(rec.season)
  const season =
    seasonRaw &&
    typeof seasonRaw.id === 'string' &&
    typeof seasonRaw.name === 'string' &&
    typeof seasonRaw.startsAt === 'string' &&
    typeof seasonRaw.endsAt === 'string'
      ? {
          id: seasonRaw.id,
          name: seasonRaw.name,
          startsAt: seasonRaw.startsAt,
          endsAt: seasonRaw.endsAt,
        }
      : null
  return {
    version: typeof rec.version === 'number' && Number.isFinite(rec.version) ? rec.version : 1,
    season,
    features: {
      interstitialsEnabled: features?.interstitialsEnabled !== false,
      iapEnabled: features?.iapEnabled !== false,
    },
  }
}

export function isSeasonActive(config: LiveConfig, now = Date.now()): boolean {
  if (!config.season) return false
  const start = Date.parse(config.season.startsAt)
  const end = Date.parse(config.season.endsAt)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  return now >= start && now < end
}

export async function loadLiveConfig(fetcher: typeof fetch = fetch): Promise<LiveConfig> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2_000)
  try {
    const response = await fetcher('/live-config.json', { signal: controller.signal })
    if (!response.ok) {
      current = DEFAULT_LIVE_CONFIG
      return current
    }
    current = parseLiveConfig(await response.json())
    return current
  } catch {
    current = DEFAULT_LIVE_CONFIG
    return current
  } finally {
    clearTimeout(timer)
  }
}
