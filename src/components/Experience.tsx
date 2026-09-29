import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import DecodeText from './DecodeText'
import Reveal from './Reveal'

interface Role {
  period: string
  title: string
  org: string
  location: string
  current?: boolean
  blurb: string
  tags: string[]
}

/*
 * Chronological — the visitor scrolls forward through time, and each entry is
 * rendered in the UI language of its era: green terminal → amber CRT →
 * flat web → modern glass. The petal glyph in each card gains rendering
 * fidelity along the way.
 */
const ROLES: Role[] = [
  {
    period: '2012 — 2016',
    title: 'B.S. Computer Science',
    org: 'University of Minnesota',
    location: 'Minneapolis, MN',
    blurb:
      'Studied computer science while interning as a Software Developer at Midwest Family Mutual — building an API to translate auto-insurance records for LexisNexis and monitoring nightly batch cycles.',
    tags: ['COMPUTER SCIENCE', 'INTERNSHIP', 'APIS'],
  },
  {
    period: 'Jun 2016 — Nov 2017',
    title: 'Systems Engineer IV',
    org: 'Wells Fargo',
    location: 'St. Louis Park, MN',
    blurb:
      'Developed a C#/ASP.NET migration automation tool that validated deployments across Dev, UAT, Staging, and Production. Engineered a rule-based test-data conditioning system that let delegated users expedite functional and regression testing cycles.',
    tags: ['C#', 'ASP.NET', 'DEPLOYMENT AUTOMATION', 'TESTING'],
  },
  {
    period: 'Nov 2017 — Nov 2020',
    title: 'Business Systems Analyst II',
    org: 'U.S. Bank',
    location: 'Richfield, MN',
    blurb:
      'Translated Fannie Mae and Freddie Mac investor guidance into technical requirements for Loss Mitigation workout-option engines, ensuring regulatory alignment. Built automated workflows enabling solicited review of thousands of delinquent borrowers, directly supporting borrower retention.',
    tags: ['Requirements', 'Regulatory', 'Automation', 'Servicing'],
  },
  {
    period: 'Nov 2020 — Present',
    title: 'Software Engineer, Assistant Vice President',
    org: 'U.S. Bank',
    location: 'Hopkins, MN',
    current: true,
    blurb:
      'Architected SPARC, a microservices enterprise platform (React, C#/.NET GraphQL API, Azure-hosted Liberty server) automating 80+ mainframe scripts and 14 manual processes — projected to save 250+ FTE roles at launch. Own the front-end, API, and DevOps layers across four CI/CD pipelines, and led GitHub Copilot adoption across the engineering org.',
    tags: ['React', 'C#/.NET', 'GraphQL', 'Azure DevOps', 'AI Adoption Lead'],
  },
]

const ERA_LABELS = [
  'ERA 01 · MAINFRAME',
  'ERA 02 · ON-PREM',
  'ERA 03 · WEB PLATFORM',
  'ERA 04 · CLOUD',
]

const MIGRATION_STEPS = [
  '▸ EXPORT DATASET ... OK — MIGRATING TO ON-PREM',
  '▸ LIFT & SHIFT ... OK — MIGRATING TO WEB PLATFORM',
  '▸ DEPLOY PIPELINE GREEN — MIGRATING TO CLOUD ☁',
]

/* ---- the petal motif, at each era's rendering fidelity ---- */

function FlatFlower() {
  const petals = [0, 72, 144, 216, 288]
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      {petals.map((deg) => (
        <circle
          key={deg}
          cx={11 + 6 * Math.cos((deg * Math.PI) / 180)}
          cy={11 + 6 * Math.sin((deg * Math.PI) / 180)}
          r="4"
          fill="#f472b6"
        />
      ))}
      <circle cx="11" cy="11" r="2.6" fill="#fbbf24" />
    </svg>
  )
}

function BloomFlower() {
  const petals = [0, 72, 144, 216, 288]
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <defs>
        <radialGradient id="petalGrad" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffd3e3" />
          <stop offset="100%" stopColor="#e2578f" />
        </radialGradient>
      </defs>
      {petals.map((deg) => (
        <ellipse
          key={deg}
          cx="13"
          cy="6.2"
          rx="4.1"
          ry="6"
          fill="url(#petalGrad)"
          transform={`rotate(${deg} 13 13)`}
          opacity="0.95"
        />
      ))}
      <circle cx="13" cy="13" r="2.4" fill="#ffe9a8" />
    </svg>
  )
}

const PETAL_MOTIF: ReactNode[] = [
  <span key="0" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>*</span>,
  <span key="1" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>❀</span>,
  <FlatFlower key="2" />,
  <BloomFlower key="3" />,
]

/* ---- per-era card styling ---- */

interface EraStyle {
  card: CSSProperties
  glow: string
  heading: CSSProperties
  meta: CSSProperties
  org: CSSProperties
  body: CSSProperties
  tag: CSSProperties
  chrome?: ReactNode
  tagFormat?: (t: string) => string
}

/*
 * Cards tilt in 3D toward the cursor with an era-tinted spotlight following
 * it. Transform + spotlight position are driven outside React state so
 * mousemove never re-renders.
 */
function TiltCard({ style, glow, children }: { style: CSSProperties; glow: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-py * 3.5).toFixed(2)}deg) rotateY(${(px * 4.5).toFixed(2)}deg)`
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      className="tilt-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        ...style,
        position: 'relative',
        transition: 'transform 0.18s var(--ease-out)',
        willChange: 'transform',
      }}
    >
      {children}
      <div
        className="tilt-glow"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          background: `radial-gradient(320px at var(--mx, 50%) var(--my, 50%), ${glow}, transparent 70%)`,
          opacity: 0,
          transition: 'opacity 0.35s',
        }}
      />
    </div>
  )
}

const ERA_STYLES: EraStyle[] = [
  // ERA 01 — green phosphor terminal
  {
    card: {
      border: '1px solid rgba(70,247,143,0.35)',
      borderRadius: 0,
      background: 'rgba(0, 14, 6, 0.5)',
      padding: '1.5rem 1.6rem',
      fontFamily: 'var(--font-mono)',
      boxShadow: '0 0 24px rgba(70,247,143,0.06) inset',
    },
    glow: 'rgba(70, 247, 143, 0.09)',
    heading: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 'clamp(1rem, 2vw, 1.2rem)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--color-phosphor)',
      textShadow: '0 0 10px rgba(70,247,143,0.4)',
    },
    meta: { color: 'var(--color-phosphor-dim)', fontFamily: 'var(--font-mono)' },
    org: { color: 'var(--color-phosphor)', fontFamily: 'var(--font-mono)', opacity: 0.85 },
    body: { color: 'rgba(160, 235, 190, 0.8)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: 1.8 },
    tag: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--color-phosphor)',
      border: '1px solid rgba(70,247,143,0.3)',
      borderRadius: 0,
      background: 'transparent',
    },
    tagFormat: (t) => `[${t}]`,
    chrome: (
      <div
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.12em',
          color: 'var(--color-phosphor-dim)',
          marginBottom: '0.9rem',
        }}
      >
        ┌─[ JOB 0001 · UNIV-MN.EDU ]─────────────
      </div>
    ),
  },
  // ERA 02 — amber CRT / early client-server
  {
    card: {
      border: '1px solid rgba(255,180,84,0.35)',
      borderRadius: '2px',
      background: 'rgba(18, 11, 3, 0.55)',
      padding: 0,
      fontFamily: 'var(--font-mono)',
      overflow: 'hidden',
    },
    glow: 'rgba(255, 180, 84, 0.09)',
    heading: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 'clamp(1rem, 2vw, 1.2rem)',
      letterSpacing: '0.03em',
      color: 'var(--color-amber)',
      textShadow: '0 0 10px rgba(255,180,84,0.35)',
    },
    meta: { color: 'rgba(255,180,84,0.55)', fontFamily: 'var(--font-mono)' },
    org: { color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', opacity: 0.85 },
    body: { color: 'rgba(240, 205, 150, 0.78)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: 1.8 },
    tag: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--color-amber)',
      border: '1px solid rgba(255,180,84,0.3)',
      borderRadius: '2px',
      background: 'rgba(255,180,84,0.06)',
    },
    tagFormat: (t) => `<${t}>`,
    chrome: (
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,180,84,0.12)',
          borderBottom: '1px solid rgba(255,180,84,0.3)',
          padding: '0.35rem 0.8rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.1em',
          color: 'var(--color-amber)',
        }}
      >
        <span>MIGRATION_TOOL.EXE — WELLS FARGO</span>
        <span>─ □ ✕</span>
      </div>
    ),
  },
  // ERA 03 — flat web
  {
    card: {
      border: '1px solid rgba(148, 163, 253, 0.22)',
      borderRadius: '10px',
      background: 'rgba(22, 24, 38, 0.55)',
      padding: '1.6rem 1.75rem',
    },
    glow: 'rgba(148, 163, 253, 0.11)',
    heading: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 'clamp(1.05rem, 2vw, 1.3rem)',
      letterSpacing: '-0.01em',
      color: '#e3e6ff',
    },
    meta: { color: '#8b93c9', fontFamily: 'var(--font-mono)' },
    org: { color: '#9aa8ff', fontFamily: 'var(--font-sans)', fontWeight: 500 },
    body: { color: '#aab1d6', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 300, lineHeight: 1.75 },
    tag: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      color: '#c2c9f7',
      border: 'none',
      borderRadius: '99px',
      background: 'rgba(148, 163, 253, 0.14)',
    },
    chrome: (
      <div
        aria-hidden="true"
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.66rem',
          letterSpacing: '0.06em',
          color: '#8b93c9',
          marginBottom: '0.9rem',
        }}
      >
        usbank.internal › loss-mitigation › workout-engine
      </div>
    ),
  },
  // ERA 04 — modern glass, sakura
  {
    card: {
      border: '1px solid rgba(255, 143, 184, 0.35)',
      borderRadius: '18px',
      background:
        'linear-gradient(150deg, rgba(255,143,184,0.09) 0%, rgba(20,12,22,0.65) 45%, rgba(20,12,22,0.65) 100%)',
      padding: '1.75rem 1.9rem',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: '0 0 60px rgba(226,87,143,0.12), 0 24px 48px rgba(0,0,0,0.4)',
    },
    glow: 'rgba(255, 143, 184, 0.13)',
    heading: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'clamp(1.15rem, 2.2vw, 1.45rem)',
      letterSpacing: '-0.015em',
      color: 'var(--color-text)',
    },
    meta: { color: 'var(--color-sakura)', fontFamily: 'var(--font-mono)' },
    org: { color: 'var(--color-sakura-bright)', fontFamily: 'var(--font-sans)', fontWeight: 500 },
    body: { color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.92rem', fontWeight: 300, lineHeight: 1.75 },
    tag: {
      fontFamily: 'var(--font-mono)',
      color: '#ffd3e3',
      border: '1px solid rgba(255,143,184,0.3)',
      borderRadius: '8px',
      background: 'rgba(226,87,143,0.12)',
    },
    chrome: (
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.14em',
          color: 'var(--color-sakura)',
          marginBottom: '1rem',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 10px rgba(74,222,128,0.8)',
          }}
        />
        LIVE · SPARC PLATFORM · AZURE
      </div>
    ),
  },
]

export default function Experience() {
  return (
    <section id="experience" style={{ padding: '8rem 0 6rem', position: 'relative' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <p className="eyebrow" style={{ color: 'var(--era-accent)', marginBottom: '0.9rem' }}>
            ❀ Migration Log
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(1.75rem, 4.5vw, 3rem)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text)',
            }}
          >
            <DecodeText text="10 years, mainframe to cloud." />
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              color: 'var(--color-text-subtle)',
              marginTop: '1rem',
              marginBottom: '3.5rem',
            }}
          >
            $ tail -f /var/log/career.log
          </p>
        </div>

        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {ROLES.map((role, i) => {
            const es = ERA_STYLES[i]
            const inner = (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', ...es.meta }}>
                    {role.period} · {role.location}
                  </div>
                  <div style={{ flexShrink: 0, lineHeight: 1, color: 'inherit' }}>{PETAL_MOTIF[i]}</div>
                </div>

                <h3 style={{ marginBottom: '0.25rem', ...es.heading }}>{role.title}</h3>
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem', ...es.org }}>{role.org}</p>
                <p style={{ marginBottom: '1.25rem', maxWidth: '72ch', ...es.body }}>{role.blurb}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {role.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.64rem',
                        letterSpacing: '0.05em',
                        padding: '0.28rem 0.65rem',
                        ...es.tag,
                      }}
                    >
                      {es.tagFormat ? es.tagFormat(tag) : tag}
                    </span>
                  ))}
                </div>
              </>
            )

            return (
              <li key={i}>
                <Reveal delay={0.05}>
                  {/* Era chip */}
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.2em',
                      color: 'var(--color-text-subtle)',
                      margin: '0 0 0.7rem 0.25rem',
                    }}
                  >
                    {ERA_LABELS[i]}
                  </div>

                  <TiltCard style={es.card} glow={es.glow}>
                    {es.chrome}
                    {/* Era 02's title bar sits flush; its body padding lives inside */}
                    {i === 1 ? <div style={{ padding: '1.4rem 1.6rem' }}>{inner}</div> : inner}
                  </TiltCard>
                </Reveal>

                {/* Migration connector */}
                {i < ROLES.length - 1 && (
                  <div
                    aria-hidden="true"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.12em',
                      color: 'var(--color-text-subtle)',
                      padding: '1.6rem 0 1.6rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                    }}
                  >
                    <span style={{ display: 'inline-block', width: '1px', height: '2.2rem', background: 'var(--era-accent-soft)', flexShrink: 0 }} />
                    {MIGRATION_STEPS[i]}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
