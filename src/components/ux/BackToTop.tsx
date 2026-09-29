import { useEffect, useRef } from 'react'
import { scrollToSection, subscribeScroll } from '../../lib/scroll'

/* A registration mark whose ring fills as you read; press it to return to the reel. */

const R = 17
const C = 2 * Math.PI * R

export default function BackToTop() {
  const ref = useRef<HTMLButtonElement>(null)
  const arcRef = useRef<SVGCircleElement>(null)

  useEffect(
    () =>
      subscribeScroll((s) => {
        // step aside at the very end, where the footer has its own link
        const atEnd = document.documentElement.scrollHeight - window.innerHeight - s.y < 140
        ref.current?.classList.toggle('is-on', s.progress > 0.06 && !atEnd)
        arcRef.current?.setAttribute('stroke-dashoffset', (C * (1 - s.progress)).toFixed(2))
      }),
    [],
  )

  return (
    <button type="button" ref={ref} className="backtop" onClick={() => scrollToSection('top')} aria-label="Back to top">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={R} fill="none" stroke="currentColor" strokeOpacity="0.25" />
        <circle
          ref={arcRef}
          cx="22"
          cy="22"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={C.toFixed(2)}
          strokeDashoffset={C.toFixed(2)}
          transform="rotate(-90 22 22)"
        />
        <path d="M22 9 V35 M9 22 H35" stroke="currentColor" strokeOpacity="0.35" />
        <path d="M17 24 L22 18.5 L27 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
