import { useEffect, useRef, useState, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react'

/*
 * Entrance on first scroll into view. The server renders content visible
 * (SEO / no-JS safe); the client hides on mount and reveals on intersection,
 * with a failsafe so nothing can stay hidden. Reduced motion skips it all.
 *
 * variant="lines" leaves the block in place and slides each `.line > span`
 * up from behind a mask instead — see <Lines>.
 */

interface RevealProps extends Omit<HTMLAttributes<HTMLElement>, 'style' | 'className' | 'children'> {
  children: ReactNode
  as?: ElementType
  delay?: number
  variant?: 'fade' | 'lines'
  className?: string
  style?: CSSProperties
}

export default function Reveal({ children, as: Tag = 'div', delay = 0, variant = 'fade', className, style, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useState<'ssr' | 'hidden' | 'shown'>('ssr')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional rewind: SSR is visible, client hides before observing
    setState('hidden')
    let done = false
    const reveal = () => {
      if (done) return
      done = true
      observer.disconnect()
      clearTimeout(failsafe)
      setState('shown')
    }
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && reveal(), {
      threshold: 0.12,
      rootMargin: '0px 0px -6% 0px',
    })
    observer.observe(el)
    const failsafe = window.setTimeout(reveal, 12000)
    return () => {
      observer.disconnect()
      clearTimeout(failsafe)
    }
  }, [])

  const cls = ['reveal', variant === 'lines' ? 'reveal-lines' : '', className].filter(Boolean).join(' ')
  return (
    <Tag {...rest} ref={ref} className={cls} data-reveal={state} style={{ ...style, '--delay': `${delay}s` } as CSSProperties}>
      {children}
    </Tag>
  )
}

/** Masked lines for a display heading. Each entry is one visual line. */
export function Lines({ lines }: { lines: ReactNode[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <span className="line" key={i}>
          <span style={{ '--i': i } as CSSProperties}>{l}</span>
        </span>
      ))}
    </>
  )
}
