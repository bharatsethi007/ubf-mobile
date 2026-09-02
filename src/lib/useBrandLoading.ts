import { useEffect, useRef, useState } from 'react'

const SHOW_AFTER_MS = 250 // don't flash the brand for fast loads
const MIN_VISIBLE_MS = 500 // once shown, hold it briefly so it doesn't flicker

/**
 * Returns true only when a load is genuinely slow: shows the brand screen after
 * a short delay, and keeps it up for a minimum so it never flickers. Fast loads
 * never show it.
 */
export function useBrandLoading(loading: boolean): boolean {
  const [show, setShow] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    if (loading) {
      showTimer = setTimeout(() => {
        shownAt.current = Date.now()
        setShow(true)
      }, SHOW_AFTER_MS)
    } else if (show) {
      const elapsed = Date.now() - shownAt.current
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)
      hideTimer = setTimeout(() => setShow(false), wait)
    }

    return () => {
      if (showTimer) clearTimeout(showTimer)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [loading, show])

  return show
}
