import { useState } from 'react'

interface Role {
  period: string
  title: string
  org: string
  location: string
  current?: boolean
  blurb: string
  tags: string[]
}

const ROLES: Role[] = [
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
    period: 'Jun 2016 — Nov 2017',
    title: 'Systems Engineer IV',
    org: 'Wells Fargo',
    location: 'St. Louis Park, MN',
    blurb:
      'Developed a C#/ASP.NET migration automation tool that validated deployments across Dev, UAT, Staging, and Production. Engineered a rule-based test-data conditioning system that let delegated users expedite functional and regression testing cycles.',
    tags: ['C#', 'ASP.NET', 'Deployment Automation', 'Testing'],
  },
  {
    period: '2012 — 2016',
    title: 'B.S. Computer Science',
    org: 'University of Minnesota',
    location: 'Minneapolis, MN',
    blurb:
      'Studied computer science while interning as a Software Developer at Midwest Family Mutual — building an API to translate auto-insurance records for LexisNexis and monitoring nightly batch cycles.',
    tags: ['Computer Science', 'Internship', 'APIs'],
  },
]

export default function Experience() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section id="experience" style={{ background: 'var(--color-bg)', padding: '9rem 0' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '4.5rem' }}>
          <span className="eyebrow">Experience</span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text)',
            }}
          >
            10 years, mainframe to cloud.
          </h2>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: '1px',
              background:
                'linear-gradient(to bottom, var(--color-accent) 0%, var(--color-border) 60%, transparent 100%)',
            }}
          />

          <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {ROLES.map((role, i) => {
              const isHovered = hovered === i
              return (
                <li
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ position: 'relative', paddingLeft: '2.75rem' }}
                >
                  {/* Node */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '6px',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: role.current || isHovered ? 'var(--color-accent-bright)' : 'var(--color-border-strong)',
                      background: 'var(--color-bg)',
                      boxShadow: role.current || isHovered ? '0 0 16px rgba(124,107,255,0.6)' : 'none',
                      transition: 'border-color 0.3s, box-shadow 0.3s',
                    }}
                  />

                  <div
                    style={{
                      border: '1px solid',
                      borderColor: isHovered ? 'var(--color-border-strong)' : 'var(--color-border)',
                      background: isHovered ? 'var(--color-bg-elev)' : 'transparent',
                      borderRadius: '14px',
                      padding: '1.5rem 1.75rem',
                      transition: 'border-color 0.3s, background 0.3s, transform 0.3s var(--ease-expo)',
                      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                    }}
                  >
                    {/* Period + location */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          letterSpacing: '0.06em',
                          color: role.current ? 'var(--color-accent-bright)' : 'var(--color-text-subtle)',
                        }}
                      >
                        {role.period}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
                        {role.location}
                      </span>
                    </div>

                    {/* Title + org */}
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                        letterSpacing: '-0.01em',
                        color: 'var(--color-text)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      {role.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'var(--color-accent-bright)',
                        marginBottom: '1rem',
                      }}
                    >
                      {role.org}
                    </p>

                    {/* Blurb */}
                    <p
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 300,
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.7,
                        marginBottom: '1.25rem',
                        maxWidth: '70ch',
                      }}
                    >
                      {role.blurb}
                    </p>

                    {/* Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {role.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.66rem',
                            letterSpacing: '0.04em',
                            color: 'var(--color-text-muted)',
                            background: 'var(--color-bg-elev-2)',
                            border: '1px solid var(--color-border)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
