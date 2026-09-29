import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Reveal, { Lines } from './Reveal'

interface Role {
  period: string
  title: string
  org: string
  current?: boolean
  blurb: string
  tags: string[]
}

const ROLES: Role[] = [
  {
    period: 'Nov 2020 — Present',
    title: 'Software Engineer, Assistant Vice President',
    org: 'U.S. Bank · Hopkins, MN',
    current: true,
    blurb:
      'Architected SPARC, a microservices enterprise platform (React, a C#/.NET GraphQL API, and an Azure-hosted Liberty server) automating 80+ mainframe scripts and 14 manual processes. I own the front-end, API and DevOps layers across four CI/CD pipelines, and led GitHub Copilot adoption across the engineering org.',
    tags: ['React', 'C# / .NET', 'GraphQL', 'Azure DevOps', 'AI adoption lead'],
  },
  {
    period: 'Nov 2017 — Nov 2020',
    title: 'Business Systems Analyst II',
    org: 'U.S. Bank · Richfield, MN',
    blurb:
      'Translated Fannie Mae and Freddie Mac investor guidance into technical requirements for Loss Mitigation workout-option engines, keeping them aligned with regulation. Built automated workflows for solicited review of thousands of delinquent borrowers, directly supporting borrower retention.',
    tags: ['Requirements', 'Regulatory', 'Automation', 'Servicing'],
  },
  {
    period: 'Jun 2016 — Nov 2017',
    title: 'Systems Engineer IV',
    org: 'Wells Fargo · St. Louis Park, MN',
    blurb:
      'Developed a C#/ASP.NET migration automation tool that validated deployments across Dev, UAT, Staging and Production. Engineered a rule-based test-data conditioning system that let delegated users speed up functional and regression testing.',
    tags: ['C#', 'ASP.NET', 'Deployment automation', 'Testing'],
  },
  {
    period: '2012 — 2016',
    title: 'B.S. Computer Science',
    org: 'University of Minnesota · Minneapolis, MN',
    blurb:
      'Studied computer science while interning as a software developer at Midwest Family Mutual: building an API that translated auto-insurance records for LexisNexis, and monitoring nightly batch cycles.',
    tags: ['Computer science', 'Internship', 'APIs'],
  },
]

const STATS = [
  { value: 80, suffix: '+', label: 'mainframe scripts automated' },
  { value: 14, suffix: '', label: 'manual processes retired' },
  { value: 250, suffix: '+', label: 'FTE roles in projected savings' },
  { value: 4, suffix: '', label: 'CI/CD pipelines owned' },
]

/* ---- the career ruler: 2012 → now, one lane per role (same order as ROLES) ---- */

const SPANS = [
  { label: 'Software Engineer, AVP', org: 'U.S. Bank', from: 2020.84, to: null as number | null },
  { label: 'Business Systems Analyst II', org: 'U.S. Bank', from: 2017.84, to: 2020.84 },
  { label: 'Systems Engineer IV', org: 'Wells Fargo', from: 2016.42, to: 2017.84 },
  { label: 'B.S. Computer Science', org: 'University of Minnesota', from: 2012.67, to: 2016.42 },
]
const Y0 = 2012
const Y1 = 2027
const pct = (y: number) => `${(((y - Y0) / (Y1 - Y0)) * 100).toFixed(3)}%`

function CareerRuler({ hover, setHover }: { hover: number; setHover: (i: number) => void }) {
  // "now" is only known on the client; the server renders a fixed date
  const [now, setNow] = useState(2026.75)
  useEffect(() => {
    const d = new Date()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the current date is client-only
    setNow(d.getFullYear() + d.getMonth() / 12)
  }, [])
  return (
    <Reveal className="career" aria-label="Career timeline, 2012 to present">
      <div className="career-lanes">
        {SPANS.map((sp, i) => {
          const to = sp.to ?? now
          return (
            <div className="career-lane" key={sp.label}>
              <button
                type="button"
                className={`career-bar${sp.to === null ? ' is-current' : ''}${hover === i ? ' is-hover' : ''}${sp.from > (Y0 + Y1) / 2 ? ' is-end' : ''}`}
                style={{ left: pct(sp.from), width: `calc(${pct(to)} - ${pct(sp.from)})`, '--i': i } as CSSProperties}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(-1)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(-1)}
                onClick={() => document.querySelectorAll('.xp-row')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <span>
                  {sp.label} <em>· {sp.org}</em>
                </span>
                <i />
              </button>
            </div>
          )
        })}
        <span className="career-now" style={{ left: pct(now) }}>
          <b>Now</b>
        </span>
      </div>
      <div className="career-axis" aria-hidden="true">
        {Array.from({ length: Y1 - Y0 + 1 }, (_, k) => (
          <span key={k} style={{ left: pct(Y0 + k) }} className={k % 2 === 0 ? 'major' : undefined}>
            {k % 2 === 0 ? Y0 + k : ''}
          </span>
        ))}
      </div>
    </Reveal>
  )
}

/* ---- small data figures under each SPARC stat ---- */

function StatFigure({ kind }: { kind: number }) {
  const el: React.ReactNode[] = []
  if (kind === 0)
    for (let i = 0; i < 80; i++) {
      const x = 1 + (i % 40) * 3
      const y = i < 40 ? 2 : 14
      el.push(<line key={i} x1={x} y1={y} x2={x} y2={y + 8} style={{ '--i': i } as CSSProperties} />)
    }
  if (kind === 1)
    for (let i = 0; i < 14; i++) {
      const x = 1 + i * 8.5
      el.push(
        <g key={i} style={{ '--i': i * 5 } as CSSProperties}>
          <rect x={x} y="8" width="7" height="7" />
          <line x1={x} y1="15" x2={x + 7} y2="8" />
        </g>,
      )
    }
  if (kind === 2)
    for (let i = 0; i < 250; i++) {
      const x = 1.5 + (i % 50) * 2.4
      const y = 3 + Math.floor(i / 50) * 4.4
      el.push(<circle key={i} cx={x} cy={y} r="0.8" style={{ '--i': Math.floor(i / 3) } as CSSProperties} />)
    }
  if (kind === 3)
    for (let i = 0; i < 4; i++) {
      const y = 3 + i * 6
      el.push(
        <g key={i} style={{ '--i': i * 12 } as CSSProperties}>
          <line x1="1" y1={y} x2="119" y2={y} className="pipe" />
          <line x1="1" y1={y} x2="119" y2={y} className="packet" style={{ animationDelay: `${-i * 0.4}s` }} />
        </g>,
      )
    }
  return (
    <svg className={`statfig statfig--${kind}`} viewBox="0 0 120 24" aria-hidden="true">
      {el}
    </svg>
  )
}

/** Counts up once when scrolled into view. Server-renders the final value. */
function CountUp({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLElement>(null)
  const [v, setV] = useState(to)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / 1600)
          setV(Math.round(to * (1 - Math.pow(2, -10 * p))))
          if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.6 },
    )
    // start from zero only if it's still offscreen, so nothing visibly resets
    if (el.getBoundingClientRect().top > window.innerHeight) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- rewind from the SSR value before counting up
      setV(0)
      io.observe(el)
    }
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])
  return (
    <dd ref={ref}>
      {v}
      {suffix}
    </dd>
  )
}

export default function Experience() {
  const listRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(-1)

  // A single line draws down the timeline as you read; each role lights as it's reached.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const rows = Array.from(list.querySelectorAll<HTMLLIElement>('.xp-row'))
    const update = () => {
      const r = list.getBoundingClientRect()
      const mark = window.innerHeight * 0.72
      const p = Math.min(1, Math.max(0, (mark - r.top) / r.height))
      list.style.setProperty('--xp', p.toFixed(4))
      rows.forEach((row) => {
        row.classList.toggle('is-lit', row.getBoundingClientRect().top + 48 < mark)
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
    <section id="experience" className="section">
      <div className="container">
        <header className="section-head">
          <Reveal>
            <p className="label">(03) Experience</p>
          </Reveal>
          <Reveal as="h2" variant="lines" className="display">
            <Lines lines={['Ten years in', <em key="s">enterprise engineering.</em>]} />
          </Reveal>
        </header>

        <Reveal className="xp-feature">
          <div>
            <p className="xp-feature-kicker">Currently building · U.S. Bank</p>
            <h3 className="xp-feature-title">SPARC</h3>
            <p className="xp-feature-copy">
              A microservices platform that consolidates decades of mainframe scripts and manual processes into a
              single modern, observable system.
            </p>
          </div>
          <dl className="stats">
            {STATS.map((s, i) => (
              <div key={s.label}>
                <CountUp to={s.value} suffix={s.suffix} />
                <StatFigure kind={i} />
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>

        <CareerRuler hover={hover} setHover={setHover} />

        <div className="xp-list" ref={listRef}>
          <span className="xp-rail" aria-hidden="true">
            <i />
          </span>
          <ol>
          {ROLES.map((r, i) => (
            <Reveal
              as="li"
              key={r.title}
              className={`xp-row${hover === i ? ' is-hover' : ''}`}
              delay={i * 0.04}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
            >
              <p className="xp-period">
                {r.period}
                {r.current && (
                  <>
                    <br />
                    <b>Now</b>
                  </>
                )}
              </p>
              <div>
                <h3 className="xp-title">{r.title}</h3>
                <p className="xp-org">{r.org}</p>
                <p className="xp-blurb">{r.blurb}</p>
                <ul className="tags" aria-label="Skills">
                  {r.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
