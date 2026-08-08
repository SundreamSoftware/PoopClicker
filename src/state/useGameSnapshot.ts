import { useSyncExternalStore } from 'react'
import type { EngineSnapshot } from '../core/GameEngine'
import { useGameContext } from './useGameContext'

export function useGameSnapshot(): EngineSnapshot {
  const { engine } = useGameContext()
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getSnapshot(),
    () => engine.getSnapshot(),
  )
}
