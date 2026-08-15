import type { SessionMissionsSave } from '../save/saveSchema'

export interface SessionMission {
  id: string
  title: string
  description: string
  progress: number
  target: number
  reward: number
  claimed: boolean
}

export interface SessionMissionsState {
  dateKey: string | null
  sessionId: number
  dailyClaimedGtp: number
  missions: SessionMission[]
}

export const SESSION_MISSION_DAILY_GTP_CAP = 20

const MISSION_TEMPLATES = [
  { id: 'taps_50', title: 'Tap 50 times', target: 50, reward: 2 },
  { id: 'crits_3', title: 'Land 3 crits', target: 3, reward: 3 },
  { id: 'events_1', title: 'Complete 1 event', target: 1, reward: 5 },
]

function missionsFromTemplates(
  progressById?: Map<string, { progress: number; claimed: boolean }>,
): SessionMission[] {
  return MISSION_TEMPLATES.map((t) => {
    const saved = progressById?.get(t.id)
    const progress = saved ? Math.min(t.target, Math.max(0, Number(saved.progress) || 0)) : 0
    const claimed = Boolean(saved?.claimed)
    return {
      ...t,
      description: '',
      progress: claimed ? Math.max(progress, t.target) : progress,
      claimed,
    }
  })
}

export function createSessionMissions(
  dateKey: string | null = null,
  sessionId = 0,
  dailyClaimedGtp = 0,
): SessionMissionsState {
  return {
    dateKey,
    sessionId,
    dailyClaimedGtp,
    missions: missionsFromTemplates(),
  }
}

/** Persist only id/progress/claimed; templates supply titles/targets/rewards. */
export function serializeSessionMissions(state: SessionMissionsState): SessionMissionsSave {
  return {
    dateKey: state.dateKey,
    sessionId: state.sessionId,
    dailyClaimedGtp: state.dailyClaimedGtp,
    missions: state.missions.map((m) => ({
      id: m.id,
      progress: m.progress,
      claimed: m.claimed,
    })),
  }
}

/** Restore runtime missions from save entries, merging onto templates. */
export function restoreSessionMissions(
  saved: SessionMissionsSave | null | undefined,
): SessionMissionsState {
  if (!saved) return createSessionMissions(null)
  const byId = new Map(
    (Array.isArray(saved.missions) ? saved.missions : []).map((m) => [
      String(m.id),
      { progress: m.progress, claimed: m.claimed },
    ]),
  )
  return {
    dateKey: saved.dateKey == null ? null : String(saved.dateKey),
    sessionId: Math.max(0, Number(saved.sessionId) || 0),
    dailyClaimedGtp: Math.max(0, Number(saved.dailyClaimedGtp) || 0),
    missions: missionsFromTemplates(byId),
  }
}

/**
 * Reset missions on a new UTC day (and clear the daily GTP cap) or a new session
 * (keep the daily cap so relaunch farming stays bounded).
 */
export function ensureSessionMissions(
  state: SessionMissionsState,
  dateKey: string,
  sessionId: number,
): SessionMissionsState {
  if (state.dateKey && dateKey < state.dateKey) {
    return { ...state }
  }
  if (state.dateKey !== dateKey) {
    return createSessionMissions(dateKey, sessionId, 0)
  }
  if (state.sessionId !== sessionId) {
    return createSessionMissions(dateKey, sessionId, state.dailyClaimedGtp)
  }
  return { ...state, dateKey, sessionId }
}

/** @deprecated Prefer ensureSessionMissions — kept for day-only callers/tests. */
export function ensureSessionMissionsForDay(
  state: SessionMissionsState,
  dateKey: string,
): SessionMissionsState {
  return ensureSessionMissions(state, dateKey, state.sessionId)
}

export function progressSessionMission(
  state: SessionMissionsState,
  missionId: string,
  amount: number,
): SessionMissionsState {
  return {
    ...state,
    missions: state.missions.map((m) =>
      m.id === missionId && !m.claimed
        ? { ...m, progress: Math.min(m.target, m.progress + amount) }
        : m,
    ),
  }
}

export function claimSessionMission(
  state: SessionMissionsState,
  missionId: string,
): { state: SessionMissionsState; reward: number; ok: boolean; reason?: string } {
  const mission = state.missions.find((m) => m.id === missionId)
  if (!mission || mission.claimed || mission.progress < mission.target) {
    return { state, reward: 0, ok: false, reason: 'not_ready' }
  }
  if (state.dailyClaimedGtp >= SESSION_MISSION_DAILY_GTP_CAP) {
    return { state, reward: 0, ok: false, reason: 'daily_cap' }
  }
  const reward = Math.min(mission.reward, SESSION_MISSION_DAILY_GTP_CAP - state.dailyClaimedGtp)
  return {
    state: {
      ...state,
      dailyClaimedGtp: state.dailyClaimedGtp + reward,
      missions: state.missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
    },
    reward,
    ok: true,
  }
}
