import { useEffect, useRef } from 'react'
import AudioManager from '../audio/AudioManager'
import { useGameSnapshot } from './useGameSnapshot'

/** Sync save audio settings and reactive music/SFX layers to AudioManager. */
export function useAudioSync(): void {
  const snap = useGameSnapshot()
  const prevEventRef = useRef(snap.eventRuntime)
  const prevFrenzyRef = useRef(snap.frenzyActive)
  const prevEventsCompletedRef = useRef(snap.save.eventsCompleted)
  const prevClogsFailedRef = useRef(snap.save.clogsFailed)

  useEffect(() => {
    AudioManager.setSfxEnabled(snap.save.settings.sfx)
    AudioManager.setMusicEnabled(snap.save.settings.music)
  }, [snap.save.settings.sfx, snap.save.settings.music])

  useEffect(() => {
    AudioManager.setFrenzyLayer(snap.frenzyActive)
    if (snap.save.settings.sfx && snap.frenzyActive && !prevFrenzyRef.current) {
      AudioManager.play('frenzy_start')
    }
    prevFrenzyRef.current = snap.frenzyActive
  }, [snap.frenzyActive, snap.save.settings.sfx])

  useEffect(() => {
    AudioManager.setEventLayer(Boolean(snap.eventRuntime))
    const prev = prevEventRef.current
    const curr = snap.eventRuntime
    if (snap.save.settings.sfx) {
      if (curr && !prev) {
        AudioManager.play('event_start')
      }
    }
    prevEventRef.current = curr
  }, [snap.eventRuntime, snap.save.settings.sfx])

  useEffect(() => {
    if (!snap.save.settings.sfx) {
      prevEventsCompletedRef.current = snap.save.eventsCompleted
      prevClogsFailedRef.current = snap.save.clogsFailed
      return
    }
    if (snap.save.eventsCompleted > prevEventsCompletedRef.current) {
      AudioManager.play('event_success')
    } else if (
      snap.save.clogsFailed > prevClogsFailedRef.current &&
      snap.save.eventsCompleted === prevEventsCompletedRef.current
    ) {
      AudioManager.play('event_fail')
    }
    prevEventsCompletedRef.current = snap.save.eventsCompleted
    prevClogsFailedRef.current = snap.save.clogsFailed
  }, [snap.save.eventsCompleted, snap.save.clogsFailed, snap.save.settings.sfx])
}
