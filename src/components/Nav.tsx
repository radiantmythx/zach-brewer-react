import { useEffect, useState } from 'react'

interface NavProps {
  onResumeClick?: () => void
}

const links = [
  { label: 'Experience', href: '#experience' },
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
        transition: 'background 0.4s var(--ease-expo), border-color 0.4s var(--ease-expo)',
        background: scrolled ? 'rgba(8,8,10,0.72)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
      }}
    >
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
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '0.02em',
            color: 'var(--color-text)',
            textDecoration: 'none',
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'linear-gradient(120deg, var(--color-accent-bright), var(--color-accent-cyan))',
              boxShadow: '0 0 12px rgba(124,107,255,0.7)',
            }}
          />
          Zach Brewer
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
                border: '1px solid var(--color-border-strong)',
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
                  borderRadius: '14px',
                  border: '1px solid var(--color-border)',
                  background: 'rgba(16,16,19,0.96)',
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
                        if (link.label === 'Resume') {
                          e.preventDefault()
                        }
                        handleLinkClick(link.label)
                      }}
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        letterSpacing: '0.02em',
                        color: 'var(--color-text-muted)',
                        textDecoration: 'none',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '10px',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
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
                    if (link.label === 'Resume') {
                      e.preventDefault()
                    }
                    handleLinkClick(link.label)
                  }}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
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
