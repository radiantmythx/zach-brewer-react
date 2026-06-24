const skills = [
  'C# / .NET', 'React', 'TypeScript', 'GraphQL',
  'Java', 'Python', 'SQL Server', 'Node.js',
  'Azure', 'Azure DevOps', 'Jenkins', 'Selenium',
  'Datadog', 'Splunk', 'GitHub Copilot', 'Godot',
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
        background: 'var(--color-bg-elev)',
        padding: '9rem 0',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div
        className="two-col"
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '5rem',
          alignItems: 'start',
        }}
      >
        {/* Left: text */}
        <div>
          <p className="eyebrow" style={{ marginBottom: '1.75rem' }}>
            About
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
            Craft-obsessed,
            <br />
            <span className="accent-gradient">end to end.</span>
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
        </div>

        {/* Right: skills + facts */}
        <div>
          <p className="eyebrow" style={{ marginBottom: '1.25rem' }}>
            Toolkit
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '3rem' }}>
            {skills.map((skill) => (
              <span
                key={skill}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.74rem',
                  letterSpacing: '0.02em',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '7px',
                  background: 'var(--color-bg-elev-2)',
                }}
              >
                {skill}
              </span>
            ))}
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
        </div>
      </div>
    </section>
  )
}
