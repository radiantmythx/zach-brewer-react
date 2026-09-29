import { useEffect, useRef, useState } from 'react'
import DecodeText from './DecodeText'
import Reveal from './Reveal'
import { emitPetals } from '../era'

const EMAIL = 'zachary.brewer.professional@gmail.com'

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/radiantmythx' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zachary-brewer-88653269/' },
  { label: 'Email', href: `mailto:${EMAIL}` },
]

/* A cluster of five gradient petals — one blossom on the branch.
   The inner group carries the pop-in animation (staggered via delay). */
function Blossom({ x, y, r, spin = 0, o = 1, delay = 0 }: { x: number; y: number; r: number; spin?: number; o?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${spin})`} opacity={o}>
      <g className="bloom-pop" style={{ animationDelay: `${delay}s` }}>
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy={-r * 0.55}
            rx={r * 0.34}
            ry={r * 0.5}
            fill="url(#branchPetal)"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r={r * 0.16} fill="#ffe9a8" />
      </g>
    </g>
  )
}

/* Hand-drawn sakura branch anchoring the full-bloom finale */
function BlossomBranch() {
  return (
    <svg
      viewBox="0 0 420 300"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 'min(420px, 60vw)',
        height: 'auto',
        pointerEvents: 'none',
        animation: 'bloom-drift 9s ease-in-out infinite',
      }}
    >
      <defs>
        <radialGradient id="branchPetal" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffd9e6" />
          <stop offset="100%" stopColor="#e2578f" />
        </radialGradient>
      </defs>
      {/* branch */}
      <path
        d="M 425 10 C 340 26, 265 52, 185 118 C 150 148, 128 178, 118 214"
        stroke="#4a2c38"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M 300 42 C 276 68, 262 96, 258 128" stroke="#4a2c38" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 218 92 C 232 112, 238 134, 236 158" stroke="#4a2c38" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 158 142 C 140 152, 126 168, 118 186" stroke="#4a2c38" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* blossoms — staggered pop-in when the section scrolls into view */}
      <Blossom x={302} y={40} r={22} spin={14} delay={0.15} />
      <Blossom x={256} y={130} r={18} spin={-20} delay={0.4} />
      <Blossom x={236} y={160} r={13} spin={40} o={0.9} delay={0.65} />
      <Blossom x={184} y={116} r={24} spin={0} delay={0.25} />
      <Blossom x={150} y={146} r={16} spin={65} o={0.95} delay={0.55} />
      <Blossom x={116} y={214} r={20} spin={-8} delay={0.8} />
      <Blossom x={355} y={22} r={15} spin={30} o={0.9} delay={0} />
      {/* buds */}
      <circle cx={132} cy={182} r={5} fill="#e2578f" />
      <circle cx={272} cy={96} r={4.5} fill="#e2578f" />
      <circle cx={222} cy={142} r={4} fill="#c94b7f" />
    </svg>
  )
}

export default function Contact() {
  const year = new Date().getFullYear()
  const [isMobile, setIsMobile] = useState(false)
  const [bloomed, setBloomed] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 820px)')
    const handleViewportChange = () => setIsMobile(mediaQuery.matches)

    handleViewportChange()
    mediaQuery.addEventListener('change', handleViewportChange)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBloomed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    if (sectionRef.current) observer.observe(sectionRef.current)

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange)
      observer.disconnect()
    }
  }, [])

  return (
    <section
      id="contact"
      ref={sectionRef}
      className={bloomed ? 'bloom-ready' : undefined}
      style={{
        color: 'var(--color-text)',
        padding: '10rem 0 4rem',
        overflow: 'hidden',
        position: 'relative',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* Full-bloom glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(70% 55% at 50% 30%, rgba(226,87,143,0.13) 0%, rgba(226,87,143,0.04) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Giant wordmark watermark, back in the modern voice */}
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
          fontSize: 'clamp(5rem, 16vw, 16rem)',
          lineHeight: 1,
          letterSpacing: '-0.04em',
          background:
            'linear-gradient(120deg, rgba(255,143,184,0.07) 0%, rgba(226,87,143,0.04) 60%, rgba(201,160,255,0.05) 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        zachbrewer
      </div>

      <BlossomBranch />

      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 1.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* CTA block */}
        <Reveal style={{ marginBottom: '7rem', textAlign: isMobile ? 'center' : 'left' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              letterSpacing: '0.16em',
              color: 'var(--color-sakura)',
              marginBottom: '2rem',
            }}
          >
            STATUS ▸ MIGRATION COMPLETE — SYSTEM IN FULL BLOOM ❀
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
            <DecodeText text="Let's build something " />
            <DecodeText text="worth shipping." className="accent-gradient" />
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
              border: '1px solid rgba(255,143,184,0.4)',
              padding: '0.95rem 1.75rem',
              borderRadius: '99px',
              transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
              marginLeft: isMobile ? 'auto' : 0,
              marginRight: isMobile ? 'auto' : 0,
              maxWidth: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(226,87,143,0.14)'
              e.currentTarget.style.borderColor = 'var(--color-sakura)'
              e.currentTarget.style.boxShadow = '0 0 32px rgba(226,87,143,0.35)'
              // A little fountain of petals rises off the button
              const r = e.currentTarget.getBoundingClientRect()
              emitPetals(r.left + r.width / 2, r.top + r.height / 2, 8)
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255,143,184,0.4)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {EMAIL}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </Reveal>

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
            © {year} Zach Brewer — Hopkins, MN · mainframe → cloud → 🌸
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
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-sakura-bright)')}
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
