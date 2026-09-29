import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/*
 * Slide-and-fade entrance for section content the first time it scrolls into
 * view. Server renders fully visible (SEO/no-JS safe); the client hides on
 * mount and reveals on intersection, with a failsafe so content can never
 * stay hidden. Reduced motion skips the whole dance.
 */

interface RevealProps {
  children: ReactNode
  delay?: number
  style?: CSSProperties
}

export default function Reveal({ children, delay = 0, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(false)
  const shown = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional rewind: SSR is visible, client hides before observing
    setHidden(true)

    const reveal = () => {
      if (shown.current) return
      shown.current = true
      observer.disconnect()
      clearTimeout(failsafe)
      setHidden(false)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal()
      },
      { threshold: 0.12 },
    )
    observer.observe(el)
    const failsafe = window.setTimeout(reveal, 10000)

    return () => {
      observer.disconnect()
      clearTimeout(failsafe)
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(30px)' : 'none',
        transition: `opacity 0.7s var(--ease-out) ${delay}s, transform 0.9s var(--ease-expo) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}
