import { useEffect, useRef, useState } from 'react'

/*
 * A construction divider between sections: a tick-ruled hairline that
 * draws out from a registration mark, with the section's index and name.
 * Server-rendered drawn; the client rewinds it and draws it on arrival.
 */

export default function Divider({ index, label }: { index: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'ssr' | 'hidden' | 'shown'>('ssr')

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rewind from the SSR state before observing
    setState('hidden')
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setState('shown')
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="divider container" ref={ref} data-draw={state} aria-hidden="true">
      <span className="divider-index">§ {index}</span>
      <span className="divider-rule divider-rule--l" />
      <svg className="divider-reg" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" />
        <path d="M0 12 H24 M12 0 V24" stroke="currentColor" />
      </svg>
      <span className="divider-rule divider-rule--r" />
      <span className="divider-name">{label}</span>
    </div>
  )
}
