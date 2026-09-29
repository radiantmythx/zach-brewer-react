import { col, dot, font, glow, hits, kinetic, MONO, ring, slate, titleCard } from '../kit'
import { clamp, easeInCubic, easeOutCubic, hash, lerp, noise1, seg, springOut, TAU } from '../math'
import type { Env, Scene } from '../scene'
import { BEAT, NEON } from '../timeline'

/*
 * 04 MUSIC — beats 36–44.
 * The boss's shockwave becomes a radial EQ. Every beat throws a ring, a
 * mirrored waveform ribbons behind it, and a step sequencer plays the drum
 * pattern you're actually hearing (the score imports DRUMS). Then it all
 * implodes into a point for the logo.
 */

const B = BEAT

/** 16-step drum pattern, one bar. The soundtrack plays exactly this. */
export const DRUMS: { name: string; color: string; steps: number[] }[] = [
  { name: 'KICK', color: NEON.lime, steps: [0, 4, 8, 10, 12] },
  { name: 'SNARE', color: NEON.cyan, steps: [4, 12] },
  { name: 'HAT', color: NEON.blue, steps: [2, 6, 10, 14, 15] },
  { name: 'PERC', color: NEON.mint, steps: [3, 7, 9, 13] },
]

const CHORDS = [
  { at: 0, name: 'Am9' },
  { at: 4, name: 'Fmaj7' },
]

function eqColor(i: number, n: number) {
  const k = (i / n) * 4
  return [NEON.blue, NEON.cyan, NEON.mint, NEON.lime][Math.floor(k) % 4]
}

function layout(env: Env) {
  return env.portrait
    ? { r0: 120, seqY: 470, seqW: 660, cell: 40, shift: 50 }
    : { r0: 150, seqY: 318, seqW: 900, cell: 34, shift: 0 }
}

export const musicScene: Scene = {
  id: 'music',

  fx(t, _env, fx) {
    const lb = t / B
    if (lb < -0.2 || lb > 8.2) return
    const beatsIn = [0, 1, 2, 3, 4, 5, 6]
    fx.flash += hits(lb, [0], 0.35, 12) + hits(lb, [4], 0.15, 14)
    fx.zoom *= 1 + hits(lb, beatsIn, 0.025, 10) - 0.05 * seg(lb, 6.5, 7.9, easeInCubic)
    fx.shake += hits(lb, beatsIn, 3, 12)
    fx.bloom += 0.5 * seg(lb, 7, 7.9)
  },

  draw(g, t, env) {
    const lb = t / B
    if (lb < 0 || lb >= 8) return
    const { cx, cy, U } = env
    const L = layout(env)
    const kick = Math.exp(-6 * (lb % 1))
    const enter = springOut(t, 2.4, 0.5)
    const implode = seg(lb, 6.4, 7.8, easeInCubic)
    const live = clamp(enter) * (1 - implode)

    titleCard(g, env, lb, 'SOUND', NEON.lime)
    glow(g, cx, cy, 720 * U, NEON.mint, 0.1 + 0.08 * kick)
    glow(g, cx, cy, 420 * U, NEON.blue, 0.12)

    // --- waveform ribbons, mirrored -----------------------------------------------
    const wa = seg(lb, 0.4, 1.2) * (1 - implode)
    if (wa > 0.003) {
      for (const [k, c, amp] of [
        [0, NEON.blue, 1],
        [1, NEON.mint, 0.7],
      ] as const) {
        for (const sign of [1, -1]) {
          g.strokeStyle = col(c, 0.55 * wa)
          g.lineWidth = k ? 1.5 : 2
          g.beginPath()
          for (let x = 0; x <= env.W; x += 6) {
            const s = x / env.W
            const w = Math.pow(Math.sin(Math.PI * s), 1.2)
            const y =
              (Math.sin(s * 22 + lb * 5 + k) * 0.6 + Math.sin(s * 57 - lb * 7) * 0.25 + noise1(s * 30 + lb * 4 + k * 9) * 0.35) *
              (60 + 60 * kick) *
              U *
              amp *
              w
            const yy = cy + sign * Math.abs(y)
            if (x === 0) g.moveTo(x, yy)
            else g.lineTo(x, yy)
          }
          g.stroke()
        }
      }
    }

    // --- beat rings -------------------------------------------------------------------------
    for (let b = 0; b < 7; b++) {
      const dt = (lb - b) * B
      if (dt < 0 || dt > 1.1) continue
      const p = easeOutCubic(dt / 1.1)
      ring(g, cx, cy, (L.r0 + p * 620) * U, 3 * (1 - p) + 0.5, col(b % 2 ? NEON.cyan : NEON.lime, 0.7 * (1 - p) * (1 - implode)))
    }

    // --- radial EQ ----------------------------------------------------------------------------------
    const n = 72
    const r0 = L.r0 * U * (1 - implode)
    g.lineCap = 'round'
    for (let i = 0; i < n; i++) {
      const j = Math.min(i, n - i)
      const a = (i / n) * TAU - Math.PI / 2 + lb * 0.12
      const shape = Math.pow(Math.abs(Math.sin(j * 0.23 + lb * 1.7)), 2) * 0.6 + noise1(j * 0.7 + lb * 3) * 0.25 + 0.3
      const len = (26 + 190 * shape * (0.45 + 0.55 * kick)) * U * live
      if (len <= 0.5) continue
      g.strokeStyle = eqColor(i, n)
      g.lineWidth = Math.max(1.5, 5 * U)
      g.beginPath()
      g.moveTo(cx + Math.cos(a) * (r0 + 6 * U), cy + Math.sin(a) * (r0 + 6 * U))
      g.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len))
      g.stroke()
    }
    ring(g, cx, cy, r0, 2, col(NEON.white, 0.7 * live))

    // --- centre: BPM, chord names ---------------------------------------------------------------------
    if (live > 0.01) {
      const s = (1 + 0.08 * kick) * live
      g.save()
      g.translate(cx, cy)
      g.scale(s, s)
      kinetic(g, '128', 0, -8 * U, { size: 78 * U, weight: 900, fill: NEON.white })
      g.font = font(Math.max(9, 13 * U), 500, MONO)
      g.textAlign = 'center'
      g.fillStyle = NEON.lime
      g.fillText('BPM', 0, 44 * U)
      g.restore()
      for (const c of CHORDS) {
        const dt = lb - c.at
        if (dt < 0 || dt >= 4) continue
        const p = springOut(dt * B, 3, 0.45)
        kinetic(g, c.name, cx, cy - (L.r0 + 250) * U, {
          size: 56 * U,
          weight: 800,
          fill: NEON.white,
          alpha: clamp(p * 2) * (1 - seg(dt, 3.3, 4)) * (1 - implode),
          split: 8 * Math.exp(-dt * 6),
          letter: (i) => {
            const q = springOut(dt * B - i * 0.03, 3.5, 0.45)
            return { y: (1 - q) * -60 * U, sx: q, sy: q }
          },
        })
      }
    }

    // --- note heads thrown off the ring on melody notes ---------------------------------------------------
    for (let k = 0; k < 14; k++) {
      const at = 0.5 + k * 0.5 + (k % 3 === 1 ? 0.25 : 0)
      const dt = (lb - at) * B
      if (dt < 0 || dt > 1.2) continue
      const a = hash(k * 3.3) * TAU
      const d = (L.r0 + 40 + easeOutCubic(dt / 1.2) * 420) * U
      const x = cx + Math.cos(a) * d
      const y = cy + Math.sin(a) * d
      g.globalAlpha = (1 - dt / 1.2) * (1 - implode)
      dot(g, x, y, 7 * U, NEON.white)
      g.strokeStyle = NEON.white
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(x + 6 * U, y)
      g.lineTo(x + 6 * U, y - 34 * U)
      g.stroke()
      g.globalAlpha = 1
    }

    // --- step sequencer ---------------------------------------------------------------------------------------
    const cell = L.cell * U
    const gap = cell * 0.28
    const gridW = 16 * cell + 15 * gap
    const scale = Math.min(1, (L.seqW * U) / gridW)
    const cw = cell * scale
    const gw = gap * scale
    const x0 = cx - (16 * cw + 15 * gw) / 2 + L.shift * U
    const y0 = cy + L.seqY * U - (4 * cw + 3 * gw) / 2
    const step = Math.floor(lb * 4) % 16
    const seqIn = seg(lb, 1, 1.8)
    if (seqIn > 0) {
      g.font = font(9, 500, MONO)
      g.textAlign = 'right'
      g.textBaseline = 'middle'
      DRUMS.forEach((row, r) => {
        const y = y0 + r * (cw + gw)
        g.fillStyle = col(row.color, 0.7 * seqIn * (1 - implode))
        g.fillText(row.name, x0 - 12, y + cw / 2)
        for (let s = 0; s < 16; s++) {
          const appear = clamp((seqIn * 1.6 - (s + r) / 22) * 3)
          if (appear <= 0) continue
          let x = x0 + s * (cw + gw)
          let y2 = y
          if (implode > 0) {
            x = lerp(x, cx - cw / 2, implode)
            y2 = lerp(y2, cy - cw / 2, implode)
          }
          const on = row.steps.includes(s)
          const lit = on && s === step && lb < 6.6
          const sz = cw * appear * (1 - implode * 0.8)
          g.fillStyle = lit ? NEON.white : on ? col(row.color, 0.55) : col(NEON.white, 0.07)
          g.fillRect(x + (cw - sz) / 2, y2 + (cw - sz) / 2, sz, sz)
          if (lit) glow(g, x + cw / 2, y2 + cw / 2, cw * 2.2, row.color, 0.8)
        }
      })
      // playhead
      if (lb < 6.6) {
        const px = x0 + step * (cw + gw) + cw / 2
        g.fillStyle = col(NEON.white, 0.5 * seqIn)
        g.fillRect(px - 1, y0 - 10, 2, 4 * cw + 3 * gw + 20)
      }
    }

    // --- implosion point ----------------------------------------------------------------------------------------
    if (implode > 0) {
      glow(g, cx, cy, 200 * U * implode, NEON.white, 0.7 * implode)
      dot(g, cx, cy, lerp(2, 10, implode) * U, NEON.white)
    }
  },

  hud(g, t, env) {
    slate(g, env, t / B, '04', 'Music', NEON.lime)
  },
}
