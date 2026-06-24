import { useEffect, useRef } from 'react'

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf: number

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Glowing accent orbs over the dark background
    const orbs = [
      { x: 0.78, y: 0.28, r: 0.42, color: 'rgba(124, 107, 255, 0.22)' },
      { x: 0.18, y: 0.72, r: 0.34, color: 'rgba(34, 211, 238, 0.10)' },
      { x: 0.52, y: 0.9, r: 0.28, color: 'rgba(124, 107, 255, 0.10)' },
    ]

    let tick = 0

    const draw = () => {
      const cw = canvas.offsetWidth
      const ch = canvas.offsetHeight

      ctx.clearRect(0, 0, cw, ch)

      // Fine grid
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'
      ctx.lineWidth = 0.5
      const gridSize = 56
      for (let x = 0; x < cw; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, ch)
        ctx.stroke()
      }
      for (let y = 0; y < ch; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(cw, y)
        ctx.stroke()
      }
      ctx.restore()

      // Glowing orbs
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      orbs.forEach((orb, i) => {
        const px = (orb.x + Math.sin(tick * 0.0006 + i * 2.1) * 0.05) * cw
        const py = (orb.y + Math.cos(tick * 0.0008 + i * 1.4) * 0.04) * ch
        const pr = orb.r * Math.max(cw, ch)

        const grad = ctx.createRadialGradient(px, py, 0, px, py, pr)
        grad.addColorStop(0, orb.color)
        grad.addColorStop(1, 'transparent')

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(px, py, pr, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()

      // Concentric ring accent
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 0.75
      const cx = cw * 0.8
      const cy = ch * 0.32
      const cr = ch * 0.55
      const wob = reduceMotion ? 0 : 1
      for (const m of [1, 0.66, 0.32]) {
        ctx.beginPath()
        ctx.arc(cx + Math.sin(tick * 0.0005) * 8 * wob, cy + Math.cos(tick * 0.0005) * 6 * wob, cr * m, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()

      if (!reduceMotion) {
        tick++
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        background: 'var(--color-bg)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Vignette to anchor text */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% 100%, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0) 60%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '6rem 2rem 6rem',
          width: '100%',
        }}
      >
        <p className="eyebrow" style={{ marginBottom: '2rem' }}>
          Software Engineer · AI · Craft
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(3.25rem, 10vw, 8.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: 'var(--color-text)',
            marginBottom: '2.25rem',
          }}
        >
          Zach Brewer
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <p
            style={{
              fontSize: '1.15rem',
              fontWeight: 300,
              color: 'var(--color-text-muted)',
              maxWidth: '42ch',
              lineHeight: 1.65,
            }}
          >
            A software engineer with 10+ years building across enterprise finance,
            full-stack web, and game development —{' '}
            <span className="accent-gradient" style={{ fontWeight: 500 }}>
              obsessed with the craft
            </span>{' '}
            and what's now possible with modern AI.
          </p>

          <a
            href="#experience"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-text)',
              textDecoration: 'none',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '99px',
              padding: '0.7rem 1.25rem',
              transition: 'border-color 0.25s, background 0.25s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.background = 'rgba(124,107,255,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            View experience
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'var(--color-border)',
        }}
      />
    </section>
  )
}
