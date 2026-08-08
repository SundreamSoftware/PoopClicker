import type { ReactNode } from 'react'
import { GameContext } from './gameContextValue'
import { ads, consent, engine, notifications } from './gameSingleton'

export function GameProvider({ children }: { children: ReactNode }) {
  return (
    <GameContext.Provider value={{ engine, ads, consent, notifications }}>
      {children}
    </GameContext.Provider>
  )
}
