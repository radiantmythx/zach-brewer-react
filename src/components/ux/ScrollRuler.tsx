import { useEffect, useRef, useState } from 'react'
import { PAGE_SECTIONS, scrollToSection, subscribeScroll, type ScrollState } from '../../lib/scroll'

/*
 * A fixed vertical ruler on the right edge: fine ticks, a major tick and
 * label at each section, and a playhead with a percentage readout. Labels
 * are buttons — the ruler doubles as navigation.
 */

const TICKS = 48

export default function ScrollRuler() {
  const headRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const [marks, setMarks] = useState<ScrollState['marks']>(() => PAGE_SECTIONS.map((s, i) => ({ id: s.id, at: i / PAGE_SECTIONS.length })))
  const [active, setActive] = useState<string>('top')

  useEffect(
    () =>
      subscribeScroll((s) => {
        if (headRef.current) headRef.current.style.top = `${(s.progress * 100).toFixed(3)}%`
        if (pctRef.current) pctRef.current.textContent = `${String(Math.round(s.progress * 100)).padStart(2, '0')}%`
        setActive(s.active)
        setMarks((m) => (m.every((x, i) => Math.abs(x.at - s.marks[i].at) < 0.001) ? m : s.marks))
      }),
    [],
  )

  return (
    <nav className="ruler" aria-label="Page sections">
      <div className="ruler-track" aria-hidden="true">
        {Array.from({ length: TICKS + 1 }, (_, i) => (
          <i key={i} style={{ top: `${(i / TICKS) * 100}%` }} className={i % 4 === 0 ? 'mid' : undefined} />
        ))}
      </div>
      {marks.map((m, i) => {
        const s = PAGE_SECTIONS[i]
        return (
          <button
            type="button"
            key={m.id}
            className={`ruler-mark${active === m.id ? ' is-active' : ''}`}
            style={{ top: `${(m.at * 100).toFixed(3)}%` }}
            onClick={() => scrollToSection(s.id)}
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
