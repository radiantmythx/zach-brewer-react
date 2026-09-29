import { Fragment, useEffect, useRef } from 'react'
import { subscribeScroll } from '../../lib/scroll'

/*
 * Two ruled bands moving in opposite directions — tools in mono, disciplines
 * in serif — that pick up speed with the reader's scroll velocity. Motion is
 * transform-only and pauses offscreen; reduced motion leaves them still.
 */

const TOOLS = ['C# / .NET', 'React', 'TypeScript', 'GraphQL', 'Azure DevOps', 'SQL Server', 'Node', 'Jenkins', 'Datadog', 'GitHub Copilot', 'Godot', 'Web Audio', 'Canvas 2D']
const DISCIPLINES = ['Engineering', 'Interface design', 'Game systems', 'Sound', 'Typography', 'Motion', 'Systems thinking', 'Accessibility']

function Row({ items, kind }: { items: string[]; kind: 'mono' | 'serif' }) {
  // three copies so the loop never shows a seam at wide viewports
  return (
    <div className={`ticker-row ticker-row--${kind}`}>
      {[0, 1, 2].map((copy) => (
        <div className="ticker-set" key={copy} aria-hidden={copy > 0 ? true : undefined}>
          {items.map((t, i) => (
            <Fragment key={t}>
              <span className="ticker-item">{t}</span>
              <span className="ticker-sep" aria-hidden="true">
                {kind === 'mono' ? '+' : i % 2 ? '◦' : '—'}
              </span>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Ticker() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rows = Array.from(el.querySelectorAll<HTMLDivElement>('.ticker-row'))
    const offsets = rows.map(() => 0)
    let boost = 0
    let raf = 0
    let last = 0
    let visible = false
    const unsub = subscribeScroll((s) => {
      boost = Math.min(900, Math.abs(s.velocity) * 0.35)
    })
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      rows.forEach((row, i) => {
        const set = row.firstElementChild as HTMLElement | null
        const w = set?.offsetWidth ?? 1
        const dir = i % 2 ? 1 : -1
        offsets[i] += dir * (38 + boost) * dt
        if (offsets[i] <= -w) offsets[i] += w
        if (offsets[i] > 0) offsets[i] -= w
        row.style.transform = `translate3d(${offsets[i].toFixed(2)}px, 0, 0)`
      })
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      cancelAnimationFrame(raf)
      last = 0
      if (visible) raf = requestAnimationFrame(frame)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      unsub()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="ticker" ref={ref} aria-label="Tools and disciplines">
      <Row items={TOOLS} kind="mono" />
      <Row items={DISCIPLINES} kind="serif" />
    </section>
  )
}
