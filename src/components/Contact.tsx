import { useEffect, useRef, useState } from 'react'
import { pluck, setSoundOn, subscribeSound } from '../film/sound'
import Reveal, { Lines } from './Reveal'

const EMAIL = 'zachary.brewer.professional@gmail.com'

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/radiantmythx' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zachary-brewer-88653269/' },
]

const HUES = ['#5CA8FF', '#3DE3F5', '#3DFFA8', '#B8FF5C']

/*
 * The film's line, handed to the visitor: a 1-D wave-equation string you can
 * pluck by sweeping across it. With sound on, each pluck is a Karplus-Strong
 * note drawn from whatever chord the score is currently playing.
 */
function PluckString({ sound }: { sound: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const M = 160
    const y = new Float32Array(M)
    const v = new Float32Array(M)
    let W = 1
    let H = 1
    let dpr = 1
    let raf = 0
    let running = false
    let lastWall = 0
    let acc = 0
    let lastPluck = 0
    let prev: { x: number; y: number } | null = null

    const resize = () => {
      W = canvas.clientWidth || 1
      H = canvas.clientHeight || 1
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      if (!running) draw(0)
    }

    const impulse = (x: number, strength: number) => {
      const ix = (x / W) * (M - 1)
      for (let i = 1; i < M - 1; i++) v[i] += strength * Math.exp(-(((i - ix) / 5) ** 2))
    }

    const step = () => {
      for (let i = 1; i < M - 1; i++) v[i] += 0.24 * (y[i - 1] + y[i + 1] - 2 * y[i]) - 0.018 * v[i]
      for (let i = 1; i < M - 1; i++) {
        y[i] += v[i]
        y[i] = Math.max(-H * 0.45, Math.min(H * 0.45, y[i]))
      }
    }

    function draw(t: number) {
      if (!g || !canvas) return
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      const mid = H / 2
      const path = new Path2D()
      for (let i = 0; i < M; i++) {
        const s = i / (M - 1)
        const idle = reduce ? 0 : Math.sin(Math.PI * s) * 4 * Math.sin(t * 0.9 + i * 0.05)
        const px = s * W
        const py = mid + y[i] + idle
        if (i) path.lineTo(px, py)
        else path.moveTo(px, py)
      }
      g.globalCompositeOperation = 'lighter'
      g.lineCap = 'round'
      g.lineJoin = 'round'
      for (const [w, a, white] of [
        [24, 0.05, 0],
        [8, 0.14, 0],
        [2.4, 0.9, 0.35],
        [1, 0.75, 0.85],
      ]) {
        const gr = g.createLinearGradient(0, 0, W, 0)
        HUES.forEach((c, i) => {
          gr.addColorStop(0.06 + (i / 3) * 0.88, white > 0.5 ? `rgba(255,255,255,${a})` : hexA(c, a, white))
        })
        gr.addColorStop(0, 'rgba(0,0,0,0)')
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        g.strokeStyle = gr
        g.lineWidth = w
        g.stroke(path)
      }
      g.globalCompositeOperation = 'source-over'
    }

    const frame = (wall: number) => {
      raf = requestAnimationFrame(frame)
      const dt = lastWall ? Math.min(0.05, (wall - lastWall) / 1000) : 1 / 60
      lastWall = wall
      acc += dt * 240
      while (acc >= 1) {
        step()
        acc -= 1
      }
      draw(wall / 1000)
    }

    const start = () => {
      if (running) return
      running = true
      lastWall = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onMove = (e: PointerEvent) => {
      const p = local(e)
      if (prev) {
        const ix = Math.max(0, Math.min(M - 1, Math.round((p.x / W) * (M - 1))))
        const lineY = H / 2 + y[ix]
        const a = prev.y - lineY
        const b = p.y - lineY
        if (a * b < 0) {
          const vel = Math.min(40, Math.max(2, Math.abs(p.y - prev.y)))
          impulse(p.x, Math.sign(p.y - prev.y) * vel * 0.1)
          const now = performance.now()
          if (now - lastPluck > 70) {
            pluck(p.x / W, vel / 40)
            lastPluck = now
          }
        }
      }
      prev = p
    }
    const onLeave = () => {
      prev = null
    }
    const onDown = (e: PointerEvent) => {
      const p = local(e)
      impulse(p.x, p.y < H / 2 ? 3.2 : -3.2)
      pluck(p.x / W, 0.7)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()))
    io.observe(canvas)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointerdown', onDown)
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return (
    <div className="pluck">
      <p className="pluck-hint">Pluck the line{sound ? '' : ' · turn sound on to hear it'}</p>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}

function hexA(hex: string, a: number, white: number) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * white)
  return `rgba(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)},${a})`
}

export default function Contact({ onOpenResume }: { onOpenResume: () => void }) {
  const [copied, setCopied] = useState(false)
  const [sound, setSound] = useState(false)
  const year = new Date().getFullYear()

  useEffect(() => subscribeSound(setSound), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  return (
    <section id="contact" className="contact">
      <div className="container">
        <Reveal>
          <p className="label">(04) Contact</p>
        </Reveal>
        <Reveal as="h2" variant="lines" className="contact-title">
          <Lines lines={["Let's make something", <em key="m">that moves.</em>]} />
        </Reveal>
        <Reveal delay={0.12}>
          <div className="contact-row">
            <a className="contact-email link-u" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
            <button type="button" className="pill" onClick={copy} aria-live="polite">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <ul className="contact-links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <a className="pill" href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3.5 8.5 L8.5 3.5 M4.5 3.5 H8.5 V7.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </a>
              </li>
            ))}
            <li>
              <button type="button" className="pill" onClick={onOpenResume}>
                Résumé
              </button>
            </li>
            <li>
              <button type="button" className="pill" onClick={() => setSoundOn(!sound)} aria-pressed={sound}>
                <span className={`eq${sound ? ' is-on' : ''}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {sound ? 'Sound on' : 'Sound off'}
              </button>
            </li>
          </ul>
        </Reveal>
      </div>

      <PluckString sound={sound} />

      <footer className="footer container">
        <span>© {year} Zach Brewer</span>
        <span>Designed and built by hand. The film up top is drawn live, frame by frame, with no video files.</span>
        <a className="link-u" href="#top">
          Back to top ↑
        </a>
      </footer>
    </section>
  )
}
