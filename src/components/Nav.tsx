import { useEffect, useState } from 'react'

interface NavProps {
  onResumeClick?: () => void
}

const links = [
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
  { label: 'Resume', href: '#resume' },
]

export default function Nav({ onResumeClick }: NavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const handleLinkClick = (label: string) => {
    if (label === 'Resume') {
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
        transition: 'background 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.4s cubic-bezier(0.16,1,0.3,1)',
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
      }}
    >
      <nav
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: isMobile ? '0 1rem' : '0 2rem',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Wordmark */}
        <a
          href="#hero"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: '1.25rem',
            letterSpacing: '0.01em',
            color: 'var(--color-ink)',
            textDecoration: 'none',
            userSelect: 'none',
          }}
        >
          ZB
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
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(255,255,255,0.9)',
                color: 'var(--color-ink)',
                cursor: 'pointer',
              }}
            >
              {menuOpen ? 'x' : '≡'}
            </button>

            {menuOpen && (
              <ul
                style={{
                  listStyle: 'none',
                  position: 'absolute',
                  top: '56px',
                  right: '0',
                  width: 'min(260px, calc(100vw - 2rem))',
                  margin: 0,
                  padding: '0.5rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: '0 16px 30px rgba(0,0,0,0.12)',
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
                        if (link.label === 'Resume') {
                          e.preventDefault()
                        }
                        handleLinkClick(link.label)
                      }}
                      style={{
                        display: 'block',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--color-ink-muted)',
                        textDecoration: 'none',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '10px',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
                        e.currentTarget.style.color = 'var(--color-ink)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-ink-muted)'
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
                    if (link.label === 'Resume') {
                      e.preventDefault()
                    }
                    handleLinkClick(link.label)
                  }}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-ink-muted)')}
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
