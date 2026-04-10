import { useEffect, useRef } from 'react'

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    // Animated gradient orbs
    const orbs = [
      { x: 0.78, y: 0.22, r: 0.38, color: 'rgba(100, 0, 255, 0.10)' },
      { x: 0.12, y: 0.70, r: 0.32, color: 'rgba(10, 10, 255, 0.07)' },
      { x: 0.55, y: 0.85, r: 0.25, color: 'rgba(100, 0, 255, 0.06)' },
    ]

    let tick = 0

    const draw = () => {
      const cw = canvas.offsetWidth
      const ch = canvas.offsetHeight

      ctx.clearRect(0, 0, cw, ch)

      // Draw noise/grid lines
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.04)'
      ctx.lineWidth = 0.5
      const gridSize = 48
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

      // Draw diagonal accent lines
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.035)'
      ctx.lineWidth = 0.5
      for (let i = -10; i < 30; i++) {
        ctx.beginPath()
        ctx.moveTo(i * gridSize * 2, 0)
        ctx.lineTo(i * gridSize * 2 + ch, ch)
        ctx.stroke()
      }
      ctx.restore()

      // Draw animated orbs
      orbs.forEach((orb, i) => {
        const px = (orb.x + Math.sin(tick * 0.0007 + i * 2.1) * 0.05) * cw
        const py = (orb.y + Math.cos(tick * 0.0009 + i * 1.4) * 0.04) * ch
        const pr = orb.r * Math.max(cw, ch)

        const grad = ctx.createRadialGradient(px, py, 0, px, py, pr)
        grad.addColorStop(0, orb.color)
        grad.addColorStop(1, 'transparent')

        ctx.save()
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(px, py, pr, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Draw a large geometric circle outline
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.05)'
      ctx.lineWidth = 0.75
      const cx = cw * 0.78
      const cy = ch * 0.3
      const cr = ch * 0.55
      ctx.beginPath()
      ctx.arc(cx + Math.sin(tick * 0.0005) * 8, cy + Math.cos(tick * 0.0005) * 6, cr, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx + Math.sin(tick * 0.0005) * 8, cy + Math.cos(tick * 0.0005) * 6, cr * 0.65, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx + Math.sin(tick * 0.0005) * 8, cy + Math.cos(tick * 0.0005) * 6, cr * 0.3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      tick++
      raf = requestAnimationFrame(draw)
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
        background: 'var(--color-white)',
      }}
    >
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '5rem 2rem 6rem',
          width: '100%',
        }}
      >
        {/* Label */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.75rem',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
            marginBottom: '2rem',
          }}
        >
          Software Engineer · AI Enthusiast · Craftsman
        </p>

        {/* Main heading */}
        <h1
          style={{
            fontFamily: 'var(--font-display-alt)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(4rem, 11vw, 10rem)',
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
            marginBottom: '2.5rem',
            maxWidth: '12ch',
          }}
        >
          Zach
          <br />
          Brewer
        </h1>

        {/* Subline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <p
            style={{
              fontSize: '1.125rem',
              fontWeight: 300,
              color: 'var(--color-ink-muted)',
              maxWidth: '38ch',
              lineHeight: 1.6,
            }}
          >
            Software engineer with 10 years of experience — passionate about crafting elegant solutions and pushing what’s possible with modern AI.
          </p>

          <a
            href="#work"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.02em',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-ink)',
              paddingBottom: '2px',
              transition: 'color 0.2s, border-color 0.2s',
              alignSelf: 'flex-end',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-accent)'
              e.currentTarget.style.borderColor = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-ink)'
              e.currentTarget.style.borderColor = 'var(--color-ink)'
            }}
          >
            View work
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Bottom border line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'rgba(0,0,0,0.08)',
        }}
      />
    </section>
  )
}
