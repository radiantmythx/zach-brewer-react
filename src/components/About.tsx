import { useEffect, useRef } from 'react'
import Reveal from './Reveal'
import Callout from './ux/Callout'

/*
 * One editorial statement, lit word by word as it scrolls through the
 * viewport, then four facts on hairline rules.
 */

interface Seg {
  text: string
  em?: boolean
  note?: { title: string; body: string }
}

// Phrases with a note get a technical-drawing callout on hover / focus.
const STATEMENT: Seg[] = [
  { text: "I'm a software engineer and designer. For ten years I've built enterprise systems in financial services, most recently" },
  { text: 'SPARC', note: { title: 'SPARC', body: 'React · C#/.NET GraphQL · Azure. 80+ mainframe scripts automated.' } },
  { text: ', a platform that replaces decades of mainframe automation at' },
  { text: 'U.S. Bank', note: { title: 'U.S. Bank', body: 'Software Engineer & AVP since 2020; systems analyst from 2017.' } },
  { text: '. Alongside that work I' },
  { text: 'design interfaces', note: { title: 'Fig. 02', body: 'Type, grid and motion, designed with intent.' } },
  { text: ', build' },
  { text: 'game systems', note: { title: 'Fig. 03', body: 'Godot, and a browser-based action RPG engine.' } },
  { text: 'and' },
  { text: 'compose music', note: { title: 'Fig. 04', body: 'The reel’s score is synthesized live — turn the sound on.' } },
  { text: ', held to one standard throughout:' },
  { text: 'clear, precise, and built to last.', em: true },
]
const startsWithPunct = (s: string) => /^[,.;:]/.test(s)

const FACTS = [
  { label: 'Based in', value: 'Hopkins, Minnesota' },
  { label: 'Currently', value: 'Software Engineer & AVP, U.S. Bank' },
  { label: 'Experience', value: '10 years across enterprise, web and AI' },
  { label: 'Also', value: 'Game systems in Godot, sound design' },
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
            {STATEMENT.map((seg, si) => {
              const words = seg.text.split(' ').filter(Boolean)
              const glue = si < STATEMENT.length - 1 && !startsWithPunct(STATEMENT[si + 1].text) ? ' ' : ''
              const spans = words.map((w, i) => (
                <span className="w" key={i}>
                  {w}
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              ))
              const body = seg.note ? (
                <Callout title={seg.note.title} note={seg.note.body}>
                  {spans}
                </Callout>
              ) : seg.em ? (
                <em>{spans}</em>
              ) : (
                spans
              )
              return (
                <span key={si}>
                  {body}
                  {glue}
                </span>
              )
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
