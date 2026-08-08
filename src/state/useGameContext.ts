import { useContext } from 'react'
import { GameContext } from './gameContextValue'

export function useGameContext() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('GameProvider missing')
  return ctx
}
