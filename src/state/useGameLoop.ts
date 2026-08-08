import { useEffect, useEffectEvent } from 'react'
import { useGameContext } from './useGameContext'

export function useGameLoop() {
  const { engine } = useGameContext()
  const onVisible = useEffectEvent(() => engine.foreground())
  const onHidden = useEffectEvent(() => engine.background())

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = now - last
      last = now
      engine.tick(dt)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') onVisible()
      else onHidden()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      engine.persistImmediate()
    }
  }, [engine])
}
