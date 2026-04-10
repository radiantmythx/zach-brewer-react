import { useState } from 'react'

interface Project {
  id: number
  index: string
  title: string
  tags: string[]
  description: string
  year: string
  link?: string
  demo?: string
}

const projects: Project[] = [
  {
    id: 1,
    index: '01',
    title: 'ARPG React Engine',
    tags: ['React', 'TypeScript', 'Tailwind', 'PostCSS'],
    description:
      'A fully browser-based ARPG engine built entirely in React — no modern game engines or graphics processors. Inspired by modern ARPGs, running entirely client-side.',
    year: '2026',
    link: 'https://github.com/radiantmythx/arpg-react-engine',
    demo: '/demo/index.html',
  },
  {
    id: 2,
    index: '02',
    title: 'zachbrewer.com',
    tags: ['React', 'TypeScript', 'Vite', 'Tailwind'],
    description:
      'This site. Designed and built from scratch — no templates, no component libraries. A personal brand identity as a living codebase.',
    year: '2026',
  },
  {
    id: 3,
    index: '03',
    title: 'Godot Projects',
    tags: ['Godot', 'GDScript', 'Game Dev'],
    description:
      'A collection of personal game projects exploring mechanics, procedural generation, and interactive storytelling. More to be unveiled soon.',
    year: 'Ongoing',
  },
]

export default function Work() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section
      id="work"
      style={{
        background: 'var(--color-white)',
        padding: '8rem 0',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 2rem',
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '5rem',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            paddingBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-subtle)',
              }}
            >
              Selected Work
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                letterSpacing: '-0.01em',
                color: 'var(--color-ink)',
              }}
            >
              Projects
            </h2>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-ink-subtle)',
              fontWeight: 400,
            }}
          >
            {projects.length} projects
          </span>
        </div>

        {/* Project list */}
        <ul style={{ listStyle: 'none' }}>
          {projects.map((project, i) => {
            const isHovered = hovered === project.id
            const isDimmed = hovered !== null && !isHovered

            return (
              <li
                key={project.id}
                onMouseEnter={() => setHovered(project.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderBottom: i < projects.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1)',
                  opacity: isDimmed ? 0.35 : 1,
                  cursor: 'default',
                }}
              >
                <div
                  className="project-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3rem 1fr auto',
                    alignItems: 'center',
                    gap: '2.5rem',
                    padding: '2.25rem 0',
                    transition: 'padding 0.3s cubic-bezier(0.16,1,0.3,1)',
                    paddingLeft: isHovered ? '0.5rem' : '0',
                  }}
                >
                  {/* Index */}
                  <span
                    className="project-index"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'var(--color-ink-subtle)',
                      letterSpacing: '0.04em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {project.index}
                  </span>

                  {/* Main content */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '1.25rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontStyle: 'italic',
                          fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                          letterSpacing: '-0.01em',
                          color: 'var(--color-ink)',
                        }}
                      >
                        {project.title}
                      </h3>
                      <div className="project-tags" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: 'var(--color-ink-subtle)',
                              background: 'var(--color-surface)',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '2px',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 300,
                        color: 'var(--color-ink-muted)',
                        lineHeight: 1.6,
                        maxWidth: '56ch',
                      }}
                    >
                      {project.description}
                    </p>
                  </div>

                  {/* Year + actions */}
                  <div
                    className="project-actions"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                    }}
                  >
                    <span
                      className="project-year"
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-ink-subtle)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {project.year}
                    </span>

                    {/* Demo button */}
                    {project.demo && (
                      <a
                        href={project.demo}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: isHovered ? 'var(--color-white)' : 'var(--color-accent)',
                          background: isHovered ? 'var(--color-accent)' : 'transparent',
                          border: '1px solid var(--color-accent)',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '99px',
                          textDecoration: 'none',
                          transition: 'background 0.25s, color 0.25s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                          <path d="M2 1.5l5 3-5 3V1.5z"/>
                        </svg>
                        Play Demo
                      </a>
                    )}
                    {project.link ? (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid',
                          borderColor: isHovered ? 'var(--color-ink)' : 'rgba(0,0,0,0.12)',
                          borderRadius: '50%',
                          transition: 'border-color 0.25s, background 0.25s, transform 0.3s cubic-bezier(0.16,1,0.3,1)',
                          background: isHovered ? 'var(--color-ink)' : 'transparent',
                          transform: isHovered ? 'rotate(-45deg)' : 'rotate(0deg)',
                          textDecoration: 'none',
                          color: isHovered ? 'white' : 'var(--color-ink)',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 10L10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid',
                          borderColor: isHovered ? 'var(--color-ink)' : 'rgba(0,0,0,0.12)',
                          borderRadius: '50%',
                          transition: 'border-color 0.25s, background 0.25s, transform 0.3s cubic-bezier(0.16,1,0.3,1)',
                          background: isHovered ? 'var(--color-ink)' : 'transparent',
                          transform: isHovered ? 'rotate(45deg)' : 'rotate(0deg)',
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          style={{
                            color: isHovered ? 'white' : 'var(--color-ink)',
                            transition: 'color 0.25s',
                          }}
                        >
                          <path
                            d="M2 6h8M6 2l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
