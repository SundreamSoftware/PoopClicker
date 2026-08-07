import { GameEngine } from '../core/GameEngine'
import { AggregatingAnalytics, ConsoleAnalytics } from '../services/analytics'
import { StubAdService } from '../services/ads'

export const engine = GameEngine.fromStorage()
export const ads = new StubAdService()
export const analytics = new AggregatingAnalytics(new ConsoleAnalytics())
