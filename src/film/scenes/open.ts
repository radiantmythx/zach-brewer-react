import { burst, col, decay, fit, glow, hits, kinetic, ring, SERIF } from '../kit'
import { clamp, easeInCubic, easeInOutCubic, easeOutCubic, easeOutExpo, hash, lerp, ring as wobble, seg, springOut, TAU } from '../math'
import type { Scene } from '../scene'
import { BEAT, NEON } from '../timeline'

/*
 * COLD OPEN — beats 0–8.
 * A point ignites, detonates, and four words slam in, one per beat:
 * I BUILD / THINGS / that / MOVE. Each letter of MOVE. gets its own move
 * on the following beats, then the word whips off screen into the code.
 */

const B = BEAT

export const openScene: Scene = {
  id: 'open',

  fx(t, _env, fx) {
    const lb = t / B
    if (lb < -0.2 || lb > 8.4) return
    fx.flash += hits(lb, [1], 0.5, 14) + hits(lb, [2, 3], 0.22, 18) + hits(lb, [3.5], 0.75, 9)
    fx.shake += hits(lb, [1, 2, 3], 7, 10) + hits(lb, [3.5], 18, 6) + hits(lb, [4, 5, 6, 7], 5, 12)
    fx.zoom *= 1 + hits(lb, [1], 0.07, 8) + hits(lb, [3.5], 0.12, 6) + hits(lb, [4, 5, 6, 7], 0.025, 10)
    fx.glitch += (lb >= 2 && lb < 2.14 ? 1 : 0) + (lb >= 3 && lb < 3.1 ? 0.7 : 0) + (lb >= 7.7 && lb < 8 ? 0.9 : 0)
    fx.bloom += hits(lb, [3.5], 0.7, 5)
  },

  draw(g, t, env) {
    const lb = t / B
    if (lb < 0 || lb >= 8) return
    const { cx, cy, U, W } = env

    // --- ignition: a point, a hairline, closing crosshairs -------------------
    if (lb < 1) {
      const r = 5 * U * springOut(t, 2.5, 0.4) * (1 - seg(lb, 0.78, 1, easeInCubic))
      glow(g, cx, cy, 60 * U, NEON.cyan, 0.5 * clamp(lb * 2))
      g.fillStyle = NEON.white
      g.beginPath()
      g.arc(cx, cy, Math.max(0, r), 0, TAU)
      g.fill()
      const hair = seg(lb, 0.1, 0.9, easeOutExpo)
      g.fillStyle = col(NEON.white, 0.28 * hair)
      g.fillRect(cx - (W / 2) * hair, cy - 0.5, W * hair, 1)
      const d = lerp(110 * U, 22 * U, seg(lb, 0, 0.95, easeInOutCubic))
      const rot = lb * 1.4
      g.strokeStyle = col(NEON.white, 0.8)
      g.lineWidth = 1.5
      g.beginPath()
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * TAU) / 4
        g.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d)
        g.lineTo(cx + Math.cos(a) * (d + 14 * U), cy + Math.sin(a) * (d + 14 * U))
      }
      g.stroke()
    }

    // --- detonation ------------------------------------------------------------
    const dt1 = t - 1 * B
    if (dt1 >= 0 && dt1 < 1.2) {
      burst(g, cx, cy, dt1, { n: 30, seed: 1, speed: 2600 * U, life: 0.7, size: 3, kind: 'streak', drag: 5, color: (i) => (i % 3 ? NEON.white : NEON.cyan) })
      const p = easeOutCubic(clamp(dt1 / 0.9))
      ring(g, cx, cy, p * 820 * U, 3 * (1 - p) + 0.5, col(NEON.cyan, 1 - p))
      ring(g, cx, cy, p * 520 * U, 1.5, col(NEON.white, 0.6 * (1 - p)))
    }

    // --- I BUILD ------------------------------------------------------------------
    if (lb >= 1 && lb < 2) {
      const size = fit(g, 'I BUILD', (env.portrait ? 800 : 1100) * U)
      const split = decay(t, 1 * B, 14, 12)
      kinetic(g, 'I BUILD', cx, cy, {
        size,
        fill: NEON.white,
        split,
        letter: (i) => {
          const p = springOut(t - B - i * 0.028, 3.2, 0.45)
          return { y: lerp(-190 * U, 0, p), rot: (1 - clamp(p)) * (i % 2 ? 0.3 : -0.3), a: clamp(p * 3) }
        },
      })
      const grow = seg(lb, 1, 1.35, easeOutExpo)
      const shrink = seg(lb, 1.55, 1.95, easeInCubic)
      const y = cy + size * 0.62
      g.fillStyle = NEON.cyan
      g.fillRect(lerp(0, W, shrink), y, W * (grow - shrink), 3)
    }

    // --- THINGS ----------------------------------------------------------------------
    if (lb >= 2 && lb < 3) {
      const size = fit(g, 'THINGS', (env.portrait ? 820 : 1200) * U)
      const k = seg(lb, 2, 2.6, easeOutExpo)
      g.save()
      g.translate(cx, cy)
      g.rotate((lb - 2) * 1.5)
      g.setLineDash([10 * U, 14 * U])
      ring(g, 0, 0, 360 * U, 2, col(NEON.blue, 0.55))
      g.setLineDash([])
      g.restore()
      kinetic(g, 'THINGS', cx, cy, {
        size,
        tracking: lerp(0.5, 0.03, k),
        stroke: NEON.cyan,
        lineWidth: 2.5,
        fill: col(NEON.cyan, 0.08),
        split: decay(t, 2 * B, 10, 14),
        letter: (i, n) => ({ sy: lerp(1.35, 1, k), a: clamp((lb - 2) * 12 - i / n) }),
      })
      const scan = seg(lb, 2, 2.7)
      if (scan > 0 && scan < 1) {
        const sy = cy - size * 0.6 + scan * size * 1.2
        g.fillStyle = col(NEON.white, 0.9)
        g.fillRect(cx - (env.portrait ? 440 : 660) * U, sy, (env.portrait ? 880 : 1320) * U, 2)
      }
    }

    // --- that --------------------------------------------------------------------------
    if (lb >= 3 && lb < 3.5) {
      const p = seg(lb, 3, 3.3, easeOutExpo)
      g.save()
      g.translate(cx, cy)
      g.rotate(lerp(-0.14, 0, p))
      g.scale(lerp(1.7, 1, p), lerp(1.7, 1, p))
      kinetic(g, 'that', 0, 0, { size: (env.portrait ? 200 : 260) * U, weight: 400, family: SERIF, style: 'italic', fill: NEON.white })
      g.restore()
    }

    // --- MOVE. ---------------------------------------------------------------------------
    if (lb >= 3.5) {
      const size = fit(g, 'MOVE.', (env.portrait ? 840 : 1420) * U)
      const whip = seg(lb, 7.25, 8, easeInCubic)

      // speed lines
      const lines = 46
      const speedK = 1 + whip * 5
      for (let i = 0; i < lines; i++) {
        const h1 = hash(i * 3.3)
        const h2 = hash(i * 9.1)
        const len = (80 + h2 * 340) * U * speedK
        const span = W + len
        const x = W - ((((h1 * span + (t - 3.5 * B) * (900 + h2 * 1600) * U * speedK) % span) + span) % span)
        const y = env.top + h2 * (env.bottom - env.top)
        g.fillStyle = col(i % 3 === 0 ? NEON.mint : i % 3 === 1 ? NEON.blue : NEON.white, (0.08 + 0.2 * h1) * clamp((lb - 3.5) * 3))
        g.fillRect(x, y, len, i % 5 === 0 ? 2 : 1)
      }

      glow(g, cx, cy, 760 * U, NEON.blue, 0.16)
      glow(g, cx + 240 * U, cy, 520 * U, NEON.mint, 0.1)

      // drawn inside a transform whose origin is the word centre
      const grad = g.createLinearGradient(-size * 1.8, 0, size * 1.8, 0)
      const sweep = (lb * 0.35) % 1
      grad.addColorStop(0, NEON.white)
      grad.addColorStop(clamp(sweep - 0.12), NEON.white)
      grad.addColorStop(clamp(sweep), NEON.cyan)
      grad.addColorStop(clamp(sweep + 0.12), NEON.white)
      grad.addColorStop(1, NEON.mint)

      const pulse = 1 + hits(lb, [4, 5, 6, 7], 0.06, 10)
      const split = hits(lb, [3.5], 20, 8) + hits(lb, [4, 5, 6, 7], 7, 14) + whip * 16
      const letter = (i: number) => {
        const p = springOut(t - 3.5 * B - i * 0.03, 3, 0.42)
        const xf = { x: 0, y: 0, sx: p, sy: p, rot: (1 - clamp(p)) * (i % 2 ? 0.5 : -0.5), a: clamp(p * 4) }
        if (i === 0) {
          const w = Math.max(0, wobble(t - 4 * B, 3, 7))
          xf.sy *= 1 - 0.32 * w
          xf.sx *= 1 + 0.18 * w
        }
        if (i === 1) {
          const k = hits(lb, [5], 1, 7)
          xf.sx *= 1 + 0.35 * k
          xf.sy *= 1 + 0.35 * k
        }
        if (i === 2) xf.y = -110 * U * Math.sin(Math.PI * seg(lb, 6, 6.55))
        if (i === 3) xf.x = 70 * U * Math.sin(Math.PI * seg(lb, 7, 7.4))
        if (i === 4) {
          const k = hits(lb, [4, 4.5, 5, 5.5, 6, 6.5, 7], 0.6, 12)
          xf.sx *= 1 + k
          xf.sy *= 1 + k
        }
        return xf
      }

      // the O throws a ring on beat 5
      const dO = t - 5 * B
      if (dO >= 0 && dO < 0.8) {
        const p = easeOutCubic(dO / 0.8)
        ring(g, cx - size * 0.28, cy, size * (0.3 + p * 1.4), 3 * (1 - p), col(NEON.cyan, 1 - p))
      }

      g.save()
      g.translate(cx - whip * W * 1.25, cy)
      g.transform(1, 0, -0.35 * whip, 1, 0, 0)
      g.scale(pulse * (1 + whip * 2.2), pulse)
      // smear copies during the whip
      if (whip > 0) {
        for (let k = 5; k >= 1; k--) {
          kinetic(g, 'MOVE.', k * whip * 90 * U, 0, { size, fill: col(NEON.cyan, 0.12 * (1 - k / 6)), letter })
        }
      }
      kinetic(g, 'MOVE.', 0, 0, { size, fill: grad, split, letter })
      g.restore()
    }
  },
}
