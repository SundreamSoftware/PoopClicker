import { createContext } from 'react'
import type { GameEngine } from '../core/GameEngine'
import type { AdService } from '../services/ads'

export const GameContext = createContext<{
  engine: GameEngine
  ads: AdService
} | null>(null)
