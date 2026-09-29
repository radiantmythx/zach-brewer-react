import { useEffect, useRef } from 'react'
import { era, onPetalEmit, onPetalStorm } from '../era'

/*
 * Sakura petals fall through every era of the site — but they render at the
 * fidelity of the era you're scrolled into:
 *
 *   mainframe era  →  green ASCII `*` glyphs
 *   on-prem era    →  amber `❀` outline glyphs
 *   modern era     →  soft-pink drawn petals with sway and spin
 *
 * Each petal carries a personal offset, and fidelity also blends in the
 * petal's own screen position — so during the transition eras you can watch
 * individual petals "compile" from ASCII into blossoms as they fall.
 *
 * The field is alive: moving the mouse throws wind at nearby petals, and any
 * click bursts a handful of petals from the pointer.
 */

interface Petal {
  x: number // 0..1 viewport fraction
  y: number // px
  size: number
  vy: number // fall speed px/s
  wx: number // wind velocity px/s (decays)
  sway: number // horizontal sway amplitude
  phase: number
  spin: number
  rot: number
  offset: number // per-petal era offset
  storm?: boolean // storm/burst petals die on exit instead of respawning
}

/* Tiny particles that trail the cursor — pixels early, petals late */
interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  fid: number // era fidelity captured at spawn
}

const GLYPH_ASCII = ['*', '+', '.']
const GLYPH_OUTLINE = ['❀', '✿', '*']

/* Smoothstep: 0 below `a`, 1 above `b`, eased in between */
function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function makePetal(h: number, seedTop = false, storm = false): Petal {
  return {
    x: Math.random(),
    y: seedTop ? -20 - Math.random() * 80 : Math.random() * h,
    size: 5 + Math.random() * 7,
    vy: (storm ? 90 : 28) + Math.random() * (storm ? 160 : 34),
    wx: 0,
    sway: 14 + Math.random() * 30,
    phase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2.4,
    rot: Math.random() * Math.PI * 2,
    offset: (Math.random() - 0.5) * 0.16,
    storm,
  }
}

function makeBurstPetal(x: number, y: number, w: number): Petal {
  const angle = Math.random() * Math.PI * 2
  const speed = 60 + Math.random() * 160
  return {
    x: x / w,
    y,
    size: 4 + Math.random() * 6,
    vy: Math.sin(angle) * speed * 0.4 + 50,
    wx: Math.cos(angle) * speed,
    sway: 8 + Math.random() * 16,
    phase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 6,
    rot: Math.random() * Math.PI * 2,
    offset: (Math.random() - 0.5) * 0.16,
    storm: true,
  }
}

function drawPetalShape(ctx: CanvasRenderingContext2D, size: number) {
  // A single sakura petal: rounded teardrop with the classic notched tip
  const s = size
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.bezierCurveTo(s * 0.9, -s * 0.7, s * 0.75, s * 0.55, 0, s)
  ctx.bezierCurveTo(-s * 0.12, s * 0.72, s * 0.12, s * 0.72, 0, s) // notch
  ctx.bezierCurveTo(-s * 0.75, s * 0.55, -s * 0.9, -s * 0.7, 0, -s)
  ctx.closePath()
}

export default function PetalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.matchMedia('(max-width: 820px)').matches

    let raf = 0
    let last = performance.now()
    let petals: Petal[] = []
    const BASE = isMobile ? 16 : 26
    const FULL_BLOOM = isMobile ? 34 : 64

    // Pointer wind state
    const pointer = { x: -9999, y: -9999, vx: 0, t: 0 }

    // Cursor aura particles
    const sparks: Spark[] = []
    let sparkDist = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const targetCount = () => Math.round(BASE + (FULL_BLOOM - BASE) * era.progress)

    const seed = () => {
      petals = Array.from({ length: targetCount() }, () => makePetal(window.innerHeight))
    }

    const drawOne = (p: Petal, w: number, h: number, now: number) => {
      // Fidelity blends global scroll progress, the petal's personal offset,
      // and its screen height — petals visibly upgrade as they fall.
      const fidelity = Math.min(1, Math.max(0, era.progress + p.offset + (p.y / h) * 0.14 - 0.07))
      const px = p.x * w + Math.sin(now * 0.001 + p.phase) * p.sway
      const py = p.y

      // The three renderings crossfade through smoothstep bands instead of
      // hard-switching, so petals melt from ASCII into blossoms.
      const wPetal = smooth(0.52, 0.68, fidelity)
      const wOutline = smooth(0.24, 0.36, fidelity) * (1 - wPetal)
      const wAscii = 1 - smooth(0.24, 0.36, fidelity)

      if (wAscii > 0.03) {
        // Mainframe era: petals are ASCII, phosphor green
        ctx.font = `${Math.round(p.size + 5)}px "JetBrains Mono", monospace`
        ctx.fillStyle = `rgba(70, 247, 143, ${0.4 * wAscii})`
        ctx.fillText(GLYPH_ASCII[Math.floor(p.phase * 10) % GLYPH_ASCII.length], px, py)
      }
      if (wOutline > 0.03) {
        // On-prem era: outline flowers, amber phosphor
        ctx.font = `${Math.round(p.size + 6)}px "JetBrains Mono", monospace`
        ctx.fillStyle = `rgba(255, 180, 84, ${0.45 * wOutline})`
        ctx.fillText(GLYPH_OUTLINE[Math.floor(p.phase * 10) % GLYPH_OUTLINE.length], px, py)
      }
      if (wPetal > 0.03) {
        // Modern era: real petals, growing to full size as they materialize
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(p.rot)
        ctx.globalAlpha = wPetal
        const grad = ctx.createLinearGradient(0, -p.size, 0, p.size)
        grad.addColorStop(0, 'rgba(255, 179, 207, 0.85)')
        grad.addColorStop(1, 'rgba(226, 87, 143, 0.55)')
        ctx.fillStyle = grad
        drawPetalShape(ctx, p.size * 0.75 * (0.55 + 0.45 * wPetal))
        ctx.fill()
        ctx.restore()
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = window.innerWidth
      const h = window.innerHeight

      ctx.clearRect(0, 0, w, h)

      // Maintain population (storm petals die off when they exit)
      const want = targetCount()
      const regular = petals.filter((p) => !p.storm).length
      if (regular < want) petals.push(makePetal(h, true))

      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i]

        // Mouse wind: petals near the pointer catch its horizontal velocity
        const px = p.x * w
        const dx = px - pointer.x
        const dy = p.y - pointer.y
        const dist2 = dx * dx + dy * dy
        if (dist2 < 140 * 140) {
          const falloff = 1 - Math.sqrt(dist2) / 140
          p.wx += pointer.vx * falloff * dt * 5
          p.spin += pointer.vx * falloff * dt * 0.02
        }

        p.wx *= Math.exp(-2.2 * dt)
        p.y += p.vy * dt
        p.rot += p.spin * dt
        p.x += (p.wx * dt) / w + Math.sin(now * 0.0004 + p.phase) * 0.0001 + 0.00002
        if (p.x > 1.05) p.x = -0.05
        if (p.x < -0.05) p.x = 1.05

        // Burst petals thrown upward drift back into a fall
        if (p.storm && p.vy < 20) p.vy += 140 * dt

        if (p.y > h + 30) {
          if (p.storm || petals.filter((q) => !q.storm).length > want) {
            petals.splice(i, 1)
          } else {
            petals[i] = makePetal(h, true)
          }
          continue
        }
        drawOne(p, w, h, now)
      }

      // Cursor aura: short-lived sparks trailing the pointer
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life -= dt * 1.6
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        s.x += s.vx * dt
        s.y += s.vy * dt
        if (s.fid < 0.45) {
          // Digital era: crisp phosphor pixels
          ctx.fillStyle = `rgba(70, 247, 143, ${0.55 * s.life})`
          ctx.fillRect(s.x, s.y, s.size, s.size)
        } else {
          // Bloom era: tiny petals spiraling off the cursor
          ctx.save()
          ctx.translate(s.x, s.y)
          ctx.rotate(s.life * 4 + s.size)
          ctx.fillStyle = `rgba(255, 160, 195, ${0.6 * s.life})`
          drawPetalShape(ctx, s.size * 1.4)
          ctx.fill()
          ctx.restore()
        }
      }

      // Wind decays when the mouse rests
      pointer.vx *= Math.exp(-4 * dt)

      raf = requestAnimationFrame(frame)
    }

    resize()
    seed()

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now()
      const dtm = Math.max(8, now - pointer.t)
      if (pointer.x > -9000) {
        const vx = ((e.clientX - pointer.x) / dtm) * 1000
        pointer.vx = pointer.vx * 0.7 + vx * 0.3
        // Spawn an aura spark every ~22px of travel
        sparkDist += Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y)
        if (sparkDist > 22 && sparks.length < 40) {
          sparkDist = 0
          sparks.push({
            x: e.clientX + (Math.random() - 0.5) * 10,
            y: e.clientY + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 30,
            vy: 12 + Math.random() * 24,
            life: 0.7 + Math.random() * 0.3,
            size: 2 + Math.random() * 3,
            fid: era.progress,
          })
        }
      }
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.t = now
    }

    const onPointerDown = (e: PointerEvent) => {
      const burst = 10 + Math.floor(Math.random() * 5)
      for (let i = 0; i < burst; i++) {
        petals.push(makeBurstPetal(e.clientX, e.clientY, window.innerWidth))
      }
    }

    if (reduceMotion) {
      // Static scattering, no animation
      const w = window.innerWidth
      const h = window.innerHeight
      petals.forEach((p) => drawOne(p, w, h, 0))
    } else {
      raf = requestAnimationFrame(frame)
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerdown', onPointerDown, { passive: true })
    }

    const unsubStorm = onPetalStorm((intensity) => {
      if (reduceMotion) return
      const burst = Math.round((isMobile ? 90 : 180) * intensity)
      for (let i = 0; i < burst; i++) {
        petals.push(makePetal(window.innerHeight, true, true))
      }
    })

    const unsubEmit = onPetalEmit((x, y, count) => {
      if (reduceMotion) return
      for (let i = 0; i < count; i++) {
        petals.push(makeBurstPetal(x, y, window.innerWidth))
      }
    })

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      unsubStorm()
      unsubEmit()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    />
  )
}
