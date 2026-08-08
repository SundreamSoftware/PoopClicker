import { createContext } from 'react'
import type { GameEngine } from '../core/GameEngine'
import type { AdService } from '../services/ads'
import type { ConsentService } from '../services/consent'
import type { NotificationScheduler } from '../services/notifications'

export const GameContext = createContext<{
  engine: GameEngine
  ads: AdService
  consent: ConsentService
  notifications: NotificationScheduler
} | null>(null)
