import DecodeText from './DecodeText'
import Reveal from './Reveal'

/*
 * By this point in the scroll the migration is nearly complete — the section
 * is fully modern, but the toolkit keeps its terminal DNA: skills presented
 * as an installed-package manifest.
 */

/* Giant background blossom: half wireframe (digital), half filled (nature) */
function BlossomWatermark() {
  const petals = [0, 72, 144, 216, 288]
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '2rem',
        right: 'clamp(-6rem, -4vw, -2rem)',
        width: 'min(30rem, 55vw)',
        height: 'auto',
        pointerEvents: 'none',
        userSelect: 'none',
        animation: 'bloom-drift 12s ease-in-out infinite',
      }}
    >
      <defs>
        <radialGradient id="wmPetal" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="rgba(255, 211, 227, 0.09)" />
          <stop offset="100%" stopColor="rgba(226, 87, 143, 0.05)" />
        </radialGradient>
      </defs>
      {petals.map((deg, i) =>
        i < 2 ? (
          // Digital half: wireframe petals with dashed strokes
          <ellipse
            key={deg}
            cx="100"
            cy="52"
            rx="30"
            ry="46"
            fill="none"
            stroke="rgba(255, 143, 184, 0.12)"
            strokeWidth="1"
            strokeDasharray="5 4"
            transform={`rotate(${deg} 100 100)`}
          />
        ) : (
          // Nature half: soft filled petals
          <ellipse
            key={deg}
            cx="100"
            cy="52"
            rx="30"
            ry="46"
            fill="url(#wmPetal)"
            transform={`rotate(${deg} 100 100)`}
          />
        ),
      )}
      <circle cx="100" cy="100" r="7" fill="rgba(255, 233, 168, 0.1)" />
    </svg>
  )
}

const PACKAGES: { name: string; note: string }[] = [
  { name: 'csharp-dotnet', note: 'daily driver' },
  { name: 'react', note: 'daily driver' },
  { name: 'typescript', note: 'daily driver' },
  { name: 'graphql', note: 'production' },
  { name: 'azure + devops', note: 'production' },
  { name: 'sql-server', note: 'production' },
  { name: 'node', note: 'production' },
  { name: 'jenkins / selenium', note: 'production' },
  { name: 'datadog / splunk', note: 'production' },
  { name: 'java / python', note: 'as needed' },
  { name: 'github-copilot', note: 'org evangelist' },
  { name: 'godot', note: 'nights & weekends' },
]

const facts = [
  { label: 'Based in', value: 'Hopkins, MN' },
  { label: 'Currently', value: 'U.S. Bank — AVP' },
  { label: 'Experience', value: '10 years' },
  { label: 'Focus', value: 'Enterprise · Web · AI' },
]

export default function About() {
  return (
    <section
      id="about"
      style={{
        padding: '8rem 0',
        position: 'relative',
        borderTop: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      <BlossomWatermark />

      <div
        className="two-col"
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: '5rem',
          alignItems: 'start',
          position: 'relative',
        }}
      >
        {/* Left: text */}
        <Reveal>
          <p className="eyebrow" style={{ color: 'var(--era-accent)', marginBottom: '1.75rem' }}>
            ❀ About
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(1.9rem, 4vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--color-text)',
              marginBottom: '2rem',
            }}
          >
            <DecodeText text="Craft-obsessed," />
            <br />
            <DecodeText text="end to end." className="accent-gradient" />
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              fontWeight: 300,
              color: 'var(--color-text-muted)',
              lineHeight: 1.75,
              marginBottom: '1.25rem',
              maxWidth: '52ch',
            }}
          >
            I'm a software engineer with 10 years of experience designing,
            building, and automating enterprise-scale systems across financial
            services — from mainframe-to-cloud migrations to full-stack platforms.
            Currently a Software Engineer and Assistant Vice President at U.S. Bank.
          </p>
          <p
            style={{
              fontSize: '1.05rem',
              fontWeight: 300,
              color: 'var(--color-text-muted)',
              lineHeight: 1.75,
              maxWidth: '52ch',
            }}
          >
            I led GitHub Copilot adoption across our engineering org and care
            deeply about every layer I touch — production C# and cloud
            infrastructure, modern React, and the new frontier of AI-assisted
            development. If it's interesting, I'm all in.
          </p>
        </Reveal>

        {/* Right: package manifest + facts */}
        <Reveal delay={0.12}>
          <div
            style={{
              border: '1px solid rgba(255,143,184,0.22)',
              borderRadius: '14px',
              background: 'rgba(20, 12, 22, 0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              overflow: 'hidden',
              marginBottom: '3rem',
              boxShadow: '0 0 40px rgba(226,87,143,0.07)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderBottom: '1px solid rgba(255,143,184,0.15)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.66rem',
                letterSpacing: '0.1em',
                color: 'var(--color-sakura)',
              }}
            >
              <span aria-hidden="true" style={{ display: 'flex', gap: '0.3rem' }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,143,184,0.5)' }} />
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,143,184,0.28)' }} />
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,143,184,0.14)' }} />
              </span>
              zb — toolkit manifest
            </div>
            <div
              style={{
                padding: '1rem 1.15rem 1.15rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                lineHeight: 2,
              }}
            >
              <div style={{ color: 'var(--color-text-subtle)' }}>$ zb list --installed</div>
              {PACKAGES.map((pkg, i) => (
                <div key={pkg.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--color-sakura)' }}>
                      {i === PACKAGES.length - 1 ? '└─' : '├─'}
                    </span>{' '}
                    {pkg.name}
                  </span>
                  <span style={{ color: 'var(--color-text-subtle)', textAlign: 'right' }}>[{pkg.note}]</span>
                </div>
              ))}
              <div style={{ color: 'var(--color-sakura)', marginTop: '0.35rem' }}>
                ✓ 12 packages, 0 vulnerabilities, 1 craftsman
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem 2.5rem' }}>
            {facts.map(({ label, value }) => (
              <div key={label}>
                <p className="eyebrow" style={{ fontSize: '0.66rem', marginBottom: '0.4rem' }}>
                  {label}
                </p>
                <p style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--color-text)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
