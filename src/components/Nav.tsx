import { useEffect, useRef, useState } from 'react'
import { subscribeEra } from '../era'

interface NavProps {
  onResumeClick?: () => void
}

/*
 * The nav rides the era engine: its accent dot and hover color follow
 * --era-accent, migrating green → amber → sakura as the visitor scrolls.
 */
const links = [
  { label: './experience', target: 'Experience', href: '#experience' },
  { label: './about', target: 'About', href: '#about' },
  { label: './contact', target: 'Contact', href: '#contact' },
  { label: './resume', target: 'Resume', href: '#resume' },
]

export default function Nav({ onResumeClick }: NavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  // Era progress bar width is driven outside React to avoid per-scroll renders
  useEffect(
    () =>
      subscribeEra((p) => {
        if (progressRef.current) progressRef.current.style.width = `${p * 100}%`
      }),
    [],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 820px)')

    const handleViewportChange = () => {
      const mobile = mediaQuery.matches
      setIsMobile(mobile)
      if (!mobile) {
        setMenuOpen(false)
      }
    }

    handleViewportChange()
    mediaQuery.addEventListener('change', handleViewportChange)

    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const handleLinkClick = (target: string) => {
    if (target === 'Resume') {
      onResumeClick?.()
    }
    if (isMobile) {
      setMenuOpen(false)
    }
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'background 0.4s var(--ease-expo), border-color 0.4s var(--ease-expo)',
        background: scrolled ? 'rgba(4, 4, 6, 0.65)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--era-accent-soft)' : '1px solid transparent',
      }}
    >
      {/* Migration progress bar: fills green → amber → sakura as you scroll */}
      <div
        ref={progressRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '2px',
          width: '0%',
          background: 'linear-gradient(90deg, #46f78f 0%, #ffb454 45%, #ff8fb8 100%)',
          boxShadow: '0 0 10px var(--era-accent-soft)',
          pointerEvents: 'none',
        }}
      />
      <nav
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: isMobile ? '0 1.25rem' : '0 2rem',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Wordmark */}
        <a
          href="#hero"
          aria-label="Zach Brewer — home"
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '0.95rem',
            letterSpacing: '0.03em',
            color: 'var(--color-text)',
            textDecoration: 'none',
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <span
            aria-hidden="true"
            className="cursor-blink"
            style={{
              width: '9px',
              height: '15px',
              background: 'var(--era-accent)',
              boxShadow: '0 0 12px var(--era-accent-soft)',
              transition: 'background 0.2s linear',
            }}
          />
          zach_brewer
        </a>

        {isMobile ? (
          <>
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                border: '1px solid var(--era-accent-soft)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '1.1rem',
              }}
            >
              {menuOpen ? '✕' : '≡'}
            </button>

            {menuOpen && (
              <ul
                style={{
                  listStyle: 'none',
                  position: 'absolute',
                  top: '60px',
                  right: '0',
                  width: 'min(260px, calc(100vw - 2.5rem))',
                  margin: 0,
                  padding: '0.5rem',
                  borderRadius: '10px',
                  border: '1px solid var(--era-accent-soft)',
                  background: 'rgba(8, 8, 12, 0.96)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.target === 'Resume') {
                          e.preventDefault()
                        }
                        handleLinkClick(link.target)
                      }}
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        letterSpacing: '0.02em',
                        color: 'var(--color-text-muted)',
                        textDecoration: 'none',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '7px',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--era-accent-soft)'
                        e.currentTarget.style.color = 'var(--color-text)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-muted)'
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              gap: '2.5rem',
              alignItems: 'center',
            }}
          >
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => {
                    if (link.target === 'Resume') {
                      e.preventDefault()
                    }
                    handleLinkClick(link.target)
                  }}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--era-accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  )
}
