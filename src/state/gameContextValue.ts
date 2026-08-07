import { createContext } from 'react'
import type { GameEngine } from '../core/GameEngine'
import type { StubAdService } from '../services/ads'

export const GameContext = createContext<{
  engine: GameEngine
  ads: StubAdService
} | null>(null)
