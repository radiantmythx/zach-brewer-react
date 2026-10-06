import { useEffect, useRef, useState } from 'react'
import { PAGE_SECTIONS, subscribeScroll } from '../../lib/scroll'

/*
 * A fixed vertical ruler on the right edge: fine ticks, a major tick and
 * label at each section, and a playhead with a percentage readout. Labels
 * are buttons — the ruler doubles as navigation. Pages pass their own
 * sections (the home page uses PAGE_SECTIONS).
 */

const TICKS = 48

export interface RulerSection {
  id: string
  label: string
  index: string
}

interface ScrollRulerProps {
  sections?: readonly RulerSection[]
}

export default function ScrollRuler({ sections = PAGE_SECTIONS }: ScrollRulerProps) {
  const headRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const [marks, setMarks] = useState(() => sections.map((s, i) => ({ id: s.id, at: i / sections.length })))
  const [active, setActive] = useState<string>(sections[0]?.id ?? '')

  useEffect(
    () =>
      subscribeScroll((s) => {
        if (headRef.current) headRef.current.style.top = `${(s.progress * 100).toFixed(3)}%`
        if (pctRef.current) pctRef.current.textContent = `${String(Math.round(s.progress * 100)).padStart(2, '0')}%`
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        const probe = s.y + window.innerHeight * 0.4
        let current = sections[0]?.id ?? ''
        const next = sections.map((sec) => {
          const el = document.getElementById(sec.id)
          if (el && el.offsetTop <= probe) current = sec.id
          return { id: sec.id, at: el ? Math.min(1, el.offsetTop / max) : 0 }
        })
        setActive(current)
        setMarks((m) => (m.length === next.length && m.every((x, i) => Math.abs(x.at - next[i].at) < 0.001) ? m : next))
      }),
    [sections],
  )

  const go = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: id === 'top' ? 0 : el.offsetTop, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <nav className="ruler" aria-label="Page sections">
      <div className="ruler-track" aria-hidden="true">
        {Array.from({ length: TICKS + 1 }, (_, i) => (
          <i key={i} style={{ top: `${(i / TICKS) * 100}%` }} className={i % 4 === 0 ? 'mid' : undefined} />
        ))}
      </div>
      {marks.map((m, i) => {
        const s = sections[i]
        if (!s) return null
        return (
          <button
            type="button"
            key={m.id}
            className={`ruler-mark${active === m.id ? ' is-active' : ''}`}
            style={{ top: `${(m.at * 100).toFixed(3)}%` }}
            onClick={() => go(s.id)}
            aria-current={active === m.id ? 'location' : undefined}
          >
            <span>
              {s.index} {s.label}
            </span>
          </button>
        )
      })}
      <div className="ruler-head" ref={headRef} aria-hidden="true">
        <span ref={pctRef}>00%</span>
      </div>
    </nav>
  )
}
