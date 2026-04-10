const skills = [
  'C#', 'React', 'TypeScript', 'JavaScript',
  'Azure DevOps', 'Tailwind CSS', 'PostCSS', 'Godot',
]

export default function About() {
  return (
    <section
      id="about"
      style={{
        background: 'var(--color-off-white)',
        padding: '8rem 0',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))',
          gap: '5rem',
          alignItems: 'start',
        }}
      >
        {/* Left: text */}
        <div>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-subtle)',
              marginBottom: '1.75rem',
            }}
          >
            About
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: 'var(--color-ink)',
              marginBottom: '2rem',
            }}
          >
            Spirited.
            <br />
            Craft-obsessed.
          </h2>
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 300,
              color: 'var(--color-ink-muted)',
              lineHeight: 1.75,
              marginBottom: '1.25rem',
              maxWidth: '48ch',
            }}
          >
            I’m Zach Brewer — a software engineer with 10 years of experience
            across enterprise finance, full-stack web, and game development.
            Currently a Software Engineer and Assistant Vice President at U.S. Bank.
          </p>
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 300,
              color: 'var(--color-ink-muted)',
              lineHeight: 1.75,
              maxWidth: '48ch',
            }}
          >
            I’m deeply passionate about mastering every craft I touch — from
            production-grade C# and cloud infrastructure to React game engines
            and modern AI solutions. If it’s interesting, I’m all in.
          </p>
        </div>

        {/* Right: skills + details */}
        <div style={{ paddingTop: '3.5rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-subtle)',
              marginBottom: '1.25rem',
            }}
          >
            Toolkit
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '3.5rem',
            }}
          >
            {skills.map((skill) => (
              <span
                key={skill}
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 400,
                  color: 'var(--color-ink)',
                  border: '1px solid rgba(0,0,0,0.12)',
                  padding: '0.35rem 0.875rem',
                  borderRadius: '99px',
                  background: 'white',
                }}
              >
                {skill}
              </span>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem 3rem',
            }}
          >
            {[
              { label: 'Based in', value: 'St. Louis Park, MN' },
              { label: 'Currently', value: 'U.S. Bank — AVP' },
              { label: 'Experience', value: '10+ years' },
              { label: 'Focus', value: 'Enterprise · Web · AI' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink-subtle)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 400,
                    color: 'var(--color-ink)',
                  }}
                >
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
