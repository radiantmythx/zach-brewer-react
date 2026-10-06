import { useEffect, useRef, useState } from 'react'
import { pluck, setSoundOn, subscribeSound } from '../film/sound'
import Reveal, { Lines } from './Reveal'
import Colophon from './ux/Colophon'

const EMAIL = 'zachary.brewer.professional@gmail.com'

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/radiantmythx' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zachary-brewer-88653269/' },
]

/*
 * Six hairline strings, handed to the visitor. Each is a 1-D wave equation;
 * sweep across them to pluck. With sound on, each string plays a note from
 * whatever chord the score is currently on (Karplus–Strong synthesis).
 */
const STRINGS = 6
const NAMES = ['E', 'A', 'D', 'G', 'B', 'E']

function PluckString({ sound }: { sound: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    const M = 120
    const ys = Array.from({ length: STRINGS }, () => new Float32Array(M))
    const vs = Array.from({ length: STRINGS }, () => new Float32Array(M))
    const energy = new Float32Array(STRINGS)
    let W = 1
    let H = 1
    let dpr = 1
    let raf = 0
    let running = false
    let lastWall = 0
    let acc = 0
    const lastPluck = new Float64Array(STRINGS)
    let prev: { x: number; y: number } | null = null

    const gap = () => Math.min(18, H / (STRINGS + 3))
    const baseY = (i: number) => H / 2 + (i - (STRINGS - 1) / 2) * gap()
    const x0 = () => Math.max(20, W * 0.04)
    const x1 = () => W - Math.max(20, W * 0.04)

    const resize = () => {
      W = canvas.clientWidth || 1
      H = canvas.clientHeight || 1
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      if (!running) draw()
    }

    const impulse = (i: number, x: number, strength: number) => {
      const ix = ((x - x0()) / (x1() - x0())) * (M - 1)
      const v = vs[i]
      for (let k = 1; k < M - 1; k++) v[k] += strength * Math.exp(-(((k - ix) / 4) ** 2))
      energy[i] = 1
    }

    const step = () => {
      for (let i = 0; i < STRINGS; i++) {
        const y = ys[i]
        const v = vs[i]
        for (let k = 1; k < M - 1; k++) v[k] += 0.24 * (y[k - 1] + y[k + 1] - 2 * y[k]) - 0.014 * v[k]
        let e = 0
        for (let k = 1; k < M - 1; k++) {
          y[k] = Math.max(-gap() * 1.6, Math.min(gap() * 1.6, y[k] + v[k]))
          e += Math.abs(y[k])
        }
        energy[i] = Math.min(1, e / (M * 1.5))
      }
    }

    function draw() {
      if (!g) return
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      const a = x0()
      const b = x1()
      g.lineWidth = 1
      for (let i = 0; i < STRINGS; i++) {
        const y0 = baseY(i)
        g.strokeStyle = `rgba(238,244,241,${(0.4 + 0.5 * energy[i]).toFixed(3)})`
        g.beginPath()
        for (let k = 0; k < M; k++) {
          const x = a + ((b - a) * k) / (M - 1)
          const y = y0 + ys[i][k]
          if (k) g.lineTo(x, y)
          else g.moveTo(x, y)
        }
        g.stroke()
        g.fillStyle = 'rgba(238,244,241,0.4)'
        g.font = '500 9px "Geist Mono", monospace'
        g.textAlign = 'right'
        g.textBaseline = 'middle'
        g.fillText(NAMES[i], a - 8, y0)
      }
      // nut and bridge
      g.strokeStyle = 'rgba(238,244,241,0.55)'
      const top = baseY(0) - 8
      const bot = baseY(STRINGS - 1) + 8
      g.beginPath()
      g.moveTo(a, top)
      g.lineTo(a, bot)
      g.moveTo(b, top)
      g.lineTo(b, bot)
      g.stroke()
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
      draw()
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
    const strike = (i: number, x: number, vel: number, dir: number) => {
      impulse(i, x, dir * (0.8 + vel * 0.12))
      const now = performance.now()
      if (now - lastPluck[i] > 60) {
        pluck((i + 0.5) / STRINGS, Math.min(1, vel / 30))
        lastPluck[i] = now
      }
    }
    const onMove = (e: PointerEvent) => {
      const p = local(e)
      if (prev && p.x > x0() && p.x < x1()) {
        const ix = Math.round(((p.x - x0()) / (x1() - x0())) * (M - 1))
        for (let i = 0; i < STRINGS; i++) {
          const ly = baseY(i) + (ys[i][Math.max(0, Math.min(M - 1, ix))] ?? 0)
          if ((prev.y - ly) * (p.y - ly) < 0) strike(i, p.x, Math.min(40, Math.abs(p.y - prev.y)), Math.sign(p.y - prev.y))
        }
      }
      prev = p
    }
    const onLeave = () => {
      prev = null
    }
    const onDown = (e: PointerEvent) => {
      const p = local(e)
      let best = 0
      for (let i = 1; i < STRINGS; i++) if (Math.abs(baseY(i) - p.y) < Math.abs(baseY(best) - p.y)) best = i
      strike(best, p.x, 14, p.y < baseY(best) ? 1 : -1)
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
      <p className="pluck-hint">Six strings — sweep across to play{sound ? '' : ' · sound is off'}</p>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
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
          <Lines lines={["Let's build something", <em key="m">considered.</em>]} />
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
              <a className="pill" href="/playground/">
                Playground
              </a>
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

      <Colophon />

      <footer className="footer container">
        <span>© {year} Zach Brewer</span>
        <span>Designed and built by Zach Brewer. The reel is rendered live in the browser.</span>
        <a className="link-u" href="#top">
          Back to top ↑
        </a>
      </footer>
    </section>
  )
}
