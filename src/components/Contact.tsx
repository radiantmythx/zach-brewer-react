import { useEffect, useState } from 'react'

const EMAIL = 'zachary.brewer.professional@gmail.com'

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/radiantmythx' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zachary-brewer-88653269/' },
  { label: 'Email', href: `mailto:${EMAIL}` },
]

export default function Contact() {
  const year = new Date().getFullYear()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 820px)')
    const handleViewportChange = () => setIsMobile(mediaQuery.matches)

    handleViewportChange()
    mediaQuery.addEventListener('change', handleViewportChange)

    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  return (
    <section
      id="contact"
      style={{
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        padding: '9rem 0 4rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Large background wordmark */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-0.08em',
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(5rem, 17vw, 17rem)',
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: 'rgba(255,255,255,0.025)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        zachbrewer
      </div>

      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* CTA block */}
        <div style={{ marginBottom: '7rem', textAlign: isMobile ? 'center' : 'left' }}>
          <p className="eyebrow" style={{ marginBottom: '2rem' }}>
            Get in touch
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
              lineHeight: 0.98,
              letterSpacing: '-0.03em',
              color: 'var(--color-text)',
              marginBottom: '2.5rem',
              maxWidth: '15ch',
              marginLeft: isMobile ? 'auto' : 0,
              marginRight: isMobile ? 'auto' : 0,
            }}
          >
            Let's build something{' '}
            <span className="accent-gradient">worth shipping.</span>
          </h2>
          <a
            href={`mailto:${EMAIL}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 500,
              color: 'var(--color-text)',
              textDecoration: 'none',
              border: '1px solid var(--color-border-strong)',
              padding: '0.95rem 1.75rem',
              borderRadius: '99px',
              transition: 'background 0.25s, border-color 0.25s',
              marginLeft: isMobile ? 'auto' : 0,
              marginRight: isMobile ? 'auto' : 0,
              maxWidth: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(124,107,255,0.12)'
              e.currentTarget.style.borderColor = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
            }}
          >
            {EMAIL}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Footer row */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            textAlign: isMobile ? 'center' : 'left',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--color-text-subtle)' }}>
            © {year} Zach Brewer — Hopkins, MN
          </span>

          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-start',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            {socialLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.76rem',
                    letterSpacing: '0.04em',
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
        </div>
      </div>
    </section>
  )
}
