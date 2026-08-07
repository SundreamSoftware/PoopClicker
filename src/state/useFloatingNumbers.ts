import { useRef, useState } from 'react'

export function useFloatingNumbers() {
  const [items, setItems] = useState<Array<{ id: number; text: string; crit: boolean }>>([])
  const idRef = useRef(0)

  const push = (text: string, crit = false) => {
    const id = ++idRef.current
    setItems((prev) => {
      const next = [...prev, { id, text, crit }]
      return next.length > 12 ? next.slice(next.length - 12) : next
    })
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, 700)
  }

  return { items, push }
}
