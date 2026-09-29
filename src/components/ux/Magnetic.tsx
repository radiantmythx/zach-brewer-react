import { useEffect } from 'react'

/*
 * Buttons lean toward the cursor. One delegated listener for the page;
 * whichever pill is under the pointer gets a small translate, and springs
 * back when the pointer leaves. Fine pointers only, never with reduced motion.
 */

const SELECTOR = '.pill, .nav-cta, .backtop'

export default function Magnetic() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let current: HTMLElement | null = null
    const release = (el: HTMLElement | null) => {
      if (el) el.style.transform = ''
    }
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null
      if (el !== current) {
        release(current)
        current = el
      }
      if (!el) return
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate3d(${(dx * 0.22).toFixed(2)}px, ${(dy * 0.32).toFixed(2)}px, 0)`
    }
    const onLeave = () => {
      release(current)
      current = null
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      release(current)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])
  return null
}
