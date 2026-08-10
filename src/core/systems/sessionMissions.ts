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
  missions: SessionMission[]
}

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
    const progress = saved
      ? Math.min(t.target, Math.max(0, Number(saved.progress) || 0))
      : 0
    const claimed = Boolean(saved?.claimed)
    return {
      ...t,
      description: '',
      progress: claimed ? Math.max(progress, t.target) : progress,
      claimed,
    }
  })
}

export function createSessionMissions(dateKey: string | null = null): SessionMissionsState {
  return {
    dateKey,
    missions: missionsFromTemplates(),
  }
}

/** Persist only id/progress/claimed; templates supply titles/targets/rewards. */
export function serializeSessionMissions(state: SessionMissionsState): SessionMissionsSave {
  return {
    dateKey: state.dateKey,
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
    missions: missionsFromTemplates(byId),
  }
}

/**
 * Ensure missions match the given UTC day key. When the day changes, progress
 * and claimed flags reset so GTP cannot be re-farmed across launches.
 */
export function ensureSessionMissionsForDay(
  state: SessionMissionsState,
  dateKey: string,
): SessionMissionsState {
  if (state.dateKey === dateKey) {
    return { ...state, dateKey }
  }
  return createSessionMissions(dateKey)
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
): { state: SessionMissionsState; reward: number; ok: boolean } {
  const mission = state.missions.find((m) => m.id === missionId)
  if (!mission || mission.claimed || mission.progress < mission.target) {
    return { state, reward: 0, ok: false }
  }
  return {
    state: {
      ...state,
      missions: state.missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
    },
    reward: mission.reward,
    ok: true,
  }
}
