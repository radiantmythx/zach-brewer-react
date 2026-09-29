import { useEffect, useRef, useState } from 'react'
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
            {STATS.map((s) => (
              <div key={s.label}>
                <CountUp to={s.value} suffix={s.suffix} />
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="xp-list" ref={listRef}>
          <span className="xp-rail" aria-hidden="true">
            <i />
          </span>
          <ol>
          {ROLES.map((r, i) => (
            <Reveal as="li" key={r.title} className="xp-row" delay={i * 0.04}>
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
