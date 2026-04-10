const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/radiantmythx' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zachary-brewer-88653269/' },
  { label: 'Email', href: 'mailto:zachary.brewer.professional@gmail.com' },
]

export default function Contact() {
  const year = new Date().getFullYear()

  return (
    <section
      id="contact"
      style={{
        background: 'var(--color-ink)',
        color: 'var(--color-white)',
        padding: '8rem 0 4rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Large background text */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-0.1em',
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(6rem, 18vw, 18rem)',
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        zachbrewer
      </div>

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* CTA block */}
        <div style={{ marginBottom: '7rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '2rem',
            }}
          >
            Get in touch
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(2.5rem, 7vw, 6rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: 'var(--color-white)',
              marginBottom: '2.5rem',
              maxWidth: '14ch',
            }}
          >
            Let’s ship something great.
          </h2>
          <a
            href="mailto:zachary.brewer.professional@gmail.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--color-white)',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '0.875rem 1.75rem',
              borderRadius: '99px',
              transition: 'background 0.25s, border-color 0.25s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
          >
            zachary.brewer.professional@gmail.com
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Footer row */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 400,
            }}
          >
            © {year} Zach Brewer — St. Louis Park, MN
          </span>

          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
            }}
          >
            {socialLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
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
