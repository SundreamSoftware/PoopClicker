import type { ReactNode } from 'react'
import { GameContext } from './gameContextValue'
import { ads, engine } from './gameSingleton'

export function GameProvider({ children }: { children: ReactNode }) {
  return <GameContext.Provider value={{ engine, ads }}>{children}</GameContext.Provider>
}
