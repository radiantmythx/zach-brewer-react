import { useEffect, useRef } from 'react'
import Reveal from './Reveal'

/*
 * One editorial statement, lit word by word as it scrolls through the
 * viewport — the reading pace is yours.
 */

const STATEMENT: { text: string; em?: boolean }[] = [
  { text: "I'm a software engineer who designs. For ten years I've built enterprise systems in financial services, most recently a platform that retires decades of mainframe scripts. After hours I make games and music. Different mediums, one obsession:" },
  { text: 'how things feel in motion.', em: true },
]

const FACTS = [
  { label: 'Based in', value: 'Hopkins, Minnesota' },
  { label: 'Currently', value: 'Software Engineer & AVP, U.S. Bank' },
  { label: 'Experience', value: '10 years: enterprise, web, AI' },
  { label: 'Off the clock', value: 'Godot games and music' },
]

export default function About() {
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const words = Array.from(el.querySelectorAll<HTMLSpanElement>('.w'))
    const n = words.length
    const update = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh * 0.88 - r.top) / (r.height + vh * 0.38)))
      const head = p * (n + 8) - 4
      words.forEach((w, i) => {
        w.style.opacity = (0.14 + 0.86 * Math.min(1, Math.max(0, (head - i) / 4))).toFixed(3)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section id="about" className="section">
      <div className="container about-grid">
        <Reveal>
          <p className="label">(01) About</p>
        </Reveal>
        <div>
          <p className="statement" ref={textRef}>
            {STATEMENT.map((part, pi) => {
              const words = part.text.split(' ').map((w, i) => (
                <span className="w" key={`${pi}-${i}`}>
                  {w}{' '}
                </span>
              ))
              return part.em ? <em key={pi}>{words}</em> : <span key={pi}>{words}</span>
            })}
          </p>
          <Reveal delay={0.1}>
            <dl className="facts">
              {FACTS.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
