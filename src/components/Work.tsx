import { useState, useRef, useEffect } from 'react'

type Category = 'games' | 'demos' | 'extensions'

interface Project {
  id: number
  title: string
  tags: string[]
  description: string
  year: string
  link?: string
  demo?: string
  comingSoon?: boolean
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'demos', label: 'Demo Sites' },
  { id: 'games', label: 'Games' },
  { id: 'extensions', label: 'Browser Extensions' },
]

const ACCENT: Record<Category, string> = {
  games: 'var(--color-accent)',
  demos: 'var(--color-ink)',
  extensions: 'var(--color-accent-violet)',
}

const ACCENT_BG: Record<Category, string> = {
  games: 'rgba(10,10,255,0.07)',
  demos: 'rgba(8,8,8,0.05)',
  extensions: 'rgba(102,0,255,0.07)',
}

const PROJECTS: Record<Category, Project[]> = {
  games: [
    {
      id: 1,
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
      title: 'Nitro Type Trainer',
      tags: ['React', 'TypeScript', 'Vite', 'Zustand'],
      description:
        'A fast typing practice app with multiple training modes, modifier challenges, and deep visual customization for repeatable skill growth.',
      year: '2026',
      link: 'https://github.com/radiantmythx/nitro-type',
      demo: '/demo-nitro-type/index.html',
    },
    {
      id: 3,
      title: 'Timing Trainer',
      tags: ['React', 'TypeScript', 'Vite', 'Web Audio API'],
      description:
        'A browser rhythm trainer for keyboard and microphone timing with metronome controls, offset scoring, and calibration tooling.',
      year: '2026',
      link: 'https://github.com/radiantmythx/timing-trainer',
      demo: '/demo-timing-trainer/index.html',
    },
    {
      id: 4,
      title: 'Godot Projects',
      tags: ['Godot', 'GDScript', 'Game Dev'],
      description:
        'A collection of personal game projects exploring mechanics, procedural generation, and interactive storytelling. More to be unveiled soon.',
      year: 'Ongoing',
    },
  ],
  demos: [
    {
      id: 5,
      title: 'zachbrewer.com',
      tags: ['React', 'TypeScript', 'Vite', 'Tailwind'],
      description:
        'This site. Designed and built from scratch — no templates, no component libraries. A personal brand identity as a living codebase.',
      year: '2026',
    },
    {
      id: 6,
      title: 'Artistic Portfolio',
      tags: ['React', 'Vite'],
      description:
        'A clean, minimal portfolio template for artists and creatives — featuring gallery layouts, project showcases, and a focus on visual storytelling.',
      year: '2026',
      demo: '/demo-sites/artistic-portfolio-site/index.html',
    },
  ],
  extensions: [
    {
      id: 7,
      title: 'Equalization Anywhere',
      tags: ['Chrome Extension', 'Web Audio API', 'Audio Tools'],
      description:
        'A Chrome Web Store extension for in-browser audio shaping with a full 10-band EQ, plus extra effects for quick listening tweaks across sites.',
      year: '2026',
      link: 'https://github.com/radiantmythx/equalization-anywhere-plugin',
      demo: '/demo-equalization-anywhere/index.html',
    },
  ],
}

export default function Work() {
  const [active, setActive] = useState<Category>('demos')
  const [fading, setFading] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const updateIndicator = () => {
      const idx = CATEGORIES.findIndex((c) => c.id === active)
      const el = tabRefs.current[idx]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [active])

  const switchTab = (cat: Category) => {
    if (cat === active || fading) return
    setFading(true)
    setTimeout(() => {
      setActive(cat)
      setHoveredCard(null)
      setFading(false)
    }, 180)
  }

  const accent = ACCENT[active]
  const accentBg = ACCENT_BG[active]
  const projects = PROJECTS[active]
  const isSingle = projects.length === 1

  return (
    <section id="work" style={{ background: 'var(--color-off-white)', padding: '8rem 0' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '3.5rem' }}>
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

        {/* Tab navigation */}
        <div style={{ position: 'relative', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '3rem' }}>
          <div
            role="tablist"
            aria-label="Project categories"
            style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}
          >
            {CATEGORIES.map((cat, i) => {
              const isActive = cat.id === active
              return (
                <button
                  key={cat.id}
                  ref={(el) => { tabRefs.current[i] = el }}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchTab(cat.id)}
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.25s',
                    color: isActive ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 500 : 400,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {cat.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      color: isActive ? accent : 'var(--color-ink-subtle)',
                      background: isActive ? accentBg : 'transparent',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '99px',
                      transition: 'color 0.25s, background 0.25s',
                      minWidth: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    {PROJECTS[cat.id].length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Sliding tab indicator */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '-1px',
              height: '2px',
              borderRadius: '2px 2px 0 0',
              background: accent,
              transition:
                'left 0.35s cubic-bezier(0.16,1,0.3,1), width 0.35s cubic-bezier(0.16,1,0.3,1), background 0.25s',
              left: indicator.left,
              width: indicator.width,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Project grid */}
        <div
          className="work-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isSingle ? '1fr' : 'repeat(2, 1fr)',
            maxWidth: isSingle ? '560px' : 'none',
            margin: isSingle ? '0 auto' : undefined,
            gap: '1.25rem',
            opacity: fading ? 0 : 1,
            transform: fading ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
        >
          {projects.map((project) => {
            const isHovered = hoveredCard === project.id
            return (
              <div
                key={project.id}
                onMouseEnter={() => !project.comingSoon && setHoveredCard(project.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  position: 'relative',
                  background: 'var(--color-white)',
                  border: '1px solid',
                  borderColor: isHovered ? accent : 'rgba(0,0,0,0.08)',
                  borderRadius: '10px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition:
                    'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.25s',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? '0 16px 48px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                  opacity: project.comingSoon ? 0.5 : 1,
                  overflow: 'hidden',
                }}
              >
                {/* Accent strip on hover */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: accent,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.25s',
                    borderRadius: '10px 10px 0 0',
                  }}
                />

                {/* Title + year */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontWeight: 700,
                      fontSize: 'clamp(1.05rem, 1.8vw, 1.3rem)',
                      letterSpacing: '-0.01em',
                      color: 'var(--color-ink)',
                      lineHeight: 1.2,
                    }}
                  >
                    {project.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-ink-subtle)',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      paddingTop: '0.2rem',
                      flexShrink: 0,
                    }}
                  >
                    {project.year}
                  </span>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 300,
                    color: 'var(--color-ink-muted)',
                    lineHeight: 1.7,
                    flex: 1,
                  }}
                >
                  {project.description}
                </p>

                {/* Footer: tags + links */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    paddingTop: '0.875rem',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    marginTop: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 500,
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          color: 'var(--color-ink-subtle)',
                          background: 'var(--color-surface)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '2px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {project.comingSoon ? (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--color-ink-subtle)',
                        }}
                      >
                        Coming Soon
                      </span>
                    ) : (
                      <>
                        {project.demo && (
                          <a
                            href={project.demo}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: isHovered ? 'var(--color-white)' : accent,
                              background: isHovered ? accent : 'transparent',
                              border: `1px solid ${accent}`,
                              padding: '0.3rem 0.7rem',
                              borderRadius: '99px',
                              textDecoration: 'none',
                              transition: 'background 0.25s, color 0.25s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <svg width="8" height="8" viewBox="0 0 9 9" fill="currentColor">
                              <path d="M2 1.5l5 3-5 3V1.5z" />
                            </svg>
                            Demo
                          </a>
                        )}
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`View ${project.title} on GitHub`}
                            style={{
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid',
                              borderColor: isHovered ? 'var(--color-ink)' : 'rgba(0,0,0,0.12)',
                              borderRadius: '50%',
                              transition: 'border-color 0.25s, background 0.25s',
                              background: isHovered ? 'var(--color-ink)' : 'transparent',
                              color: isHovered ? 'white' : 'var(--color-ink)',
                              textDecoration: 'none',
                              flexShrink: 0,
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 10L10 2M10 2H4M10 2v6"
                                stroke="currentColor"
                                strokeWidth="1.25"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
