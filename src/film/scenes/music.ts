import { B, caption, circle, col, line, lineMid, maskText, pb, typeText } from '../kit'
import { clamp, easeOutCubic, noise1 } from '../math'
import type { Env, Scene } from '../scene'
import { CHAPTERS, INK } from '../timeline'

/*
 * FIG. 04 SOUND — beats 32–40.
 * A two-bar staff whose notes appear as the playhead reaches them — the
 * same melody the synth plays — over a hairline waveform, beat rings, a
 * step sequencer (the drum pattern you hear) and a spectrum of 96 lines.
 */

/** 16-step drum pattern, one bar. The soundtrack plays exactly this. */
export const DRUMS: { name: string; steps: number[] }[] = [
  { name: 'KICK', steps: [0, 4, 8, 10, 12] },
  { name: 'SNARE', steps: [4, 12] },
  { name: 'HAT', steps: [2, 6, 10, 14, 15] },
  { name: 'PERC', steps: [3, 7, 9, 13] },
]

/** melody: [local beat, midi, length in beats] */
export const MELODY: [number, number, number][] = [
  [0.5, 76, 0.5], [1, 79, 0.5], [1.75, 81, 0.75], [2.5, 84, 0.5], [3, 81, 0.5], [3.5, 79, 0.5],
  [4, 76, 0.5], [4.5, 74, 0.5], [5, 76, 0.5], [5.75, 79, 0.75], [6.5, 83, 0.5], [7, 81, 0.5], [7.5, 79, 0.5],
]

const STEP_OF: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }
/** diatonic staff step (C major / A minor) relative to E4 on the bottom line */
const staffStep = (m: number) => Math.floor(m / 12) * 7 + (STEP_OF[m % 12] ?? 0) - (5 * 7 + 2)

function layout(env: Env) {
  return env.portrait
    ? { x0: -330, x1: 330, staffY: -290, waveY: -125, seqY: -30, specY: 370, ringR: 110 }
    : { x0: -580, x1: 580, staffY: -160, waveY: 5, seqY: 78, specY: 250, ringR: 150 }
}

export const musicScene: Scene = {
  id: 'music',

  fx(t, _env, fx) {
    const lb = t / B
    fx.zoom *= 1 + 0.006 * Math.exp(-6 * (lb % 1)) + 0.015 * clamp(lb / 8)
  },

  draw(g, t, env) {
    const lb = t / B
    const { U, cx, cy } = env
    const L = layout(env)
    const X = (x: number) => cx + x * U
    const Y = (y: number) => cy + y * U
    const kick = Math.exp(-6 * (lb % 1))
    g.lineWidth = 1
    const width = L.x1 - L.x0
    const xAt = (beat: number) => X(L.x0 + 40 + (beat / 8) * (width - 50))

    // --- beat rings behind everything ---------------------------------------------------
    for (let b = 0; b < 8; b++) {
      const dt = (lb - b) * B
      if (dt < 0 || dt > 1) continue
      const p = easeOutCubic(dt)
      g.strokeStyle = col(INK.fern, 0.25 * (1 - p))
      circle(g, cx, Y(L.waveY), (L.ringR + p * 260) * U)
    }

    // --- staff ---------------------------------------------------------------------------
    const gap = 15 * U
    const bottom = Y(L.staffY)
    g.strokeStyle = col(INK.ink, 0.45)
    for (let k = 0; k < 5; k++) lineMid(g, X(L.x0), bottom - k * gap, X(L.x1), bottom - k * gap, pb(lb, k * 0.06, 0.6 + k * 0.06))
    g.strokeStyle = col(INK.ink, 0.6)
    for (const b of [0, 4, 8]) {
      const x = b === 0 ? X(L.x0) : xAt(b) - 8
      line(g, x, bottom, x, bottom - gap * 4, pb(lb, 0.5, 0.8))
    }
    maskText(g, '4', X(L.x0) + 10, bottom - gap * 2 + 2, gap * 2.6, pb(lb, 0.5, 0.9))
    maskText(g, '4', X(L.x0) + 10, bottom + 2, gap * 2.6, pb(lb, 0.6, 1.0))

    // notes
    for (const [b, m] of MELODY) {
      if (lb < b) continue
      const step = staffStep(m)
      const x = xAt(b)
      const y = bottom - (step * gap) / 2
      const pop = easeOutCubic(clamp((lb - b) / 0.18))
      const playing = lb - b < 0.5
      // ledger lines above the staff
      g.strokeStyle = col(INK.ink, 0.45)
      for (let s = 10; s <= step; s += 2) line(g, x - 10 * U, bottom - (s * gap) / 2, x + 10 * U, bottom - (s * gap) / 2)
      g.save()
      g.translate(x, y)
      g.rotate(-0.35)
      g.scale(pop, pop)
      g.fillStyle = playing ? INK.fern : INK.ink
      g.beginPath()
      g.ellipse(0, 0, 6.5 * U + 1.5, 4.6 * U + 1, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
      g.strokeStyle = playing ? INK.fern : INK.ink
      const up = step < 4
      line(g, x + (up ? 6 : -6) * U, y, x + (up ? 6 : -6) * U, y + (up ? -1 : 1) * 36 * U, pop)
    }
    // playhead
    if (lb < 8) {
      const px = xAt(lb)
      g.strokeStyle = INK.fern
      line(g, px, bottom + 12, px, bottom - gap * 4 - 12, pb(lb, 0.3, 0.6))
    }

    // --- waveform -----------------------------------------------------------------------------
    const wa = pb(lb, 0.5, 1.5)
    if (wa > 0) {
      const wy = Y(L.waveY)
      for (const [c, a, amp, ph] of [
        [INK.ink, 0.9, 1, 0],
        [INK.sage, 0.9, -0.6, 1.7],
      ] as const) {
        g.strokeStyle = col(c, a)
        g.beginPath()
        const n = 220
        for (let i = 0; i <= n * wa; i++) {
          const s = i / n
          const x = X(L.x0) + s * width * U
          const win = Math.pow(Math.sin(Math.PI * s), 1.4)
          const v =
            Math.sin(s * 34 + lb * 6 + ph) * 0.55 + Math.sin(s * 81 - lb * 9) * 0.25 + noise1(s * 40 + lb * 5 + ph) * 0.3
          const y = wy + v * (26 + 34 * kick) * U * amp * win
          if (i === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.stroke()
      }
      g.strokeStyle = col(INK.ink, 0.15)
      line(g, X(L.x0), wy, X(L.x1), wy, wa)
    }

    // --- sequencer --------------------------------------------------------------------------------
    const sq = pb(lb, 1.2, 2.0)
    if (sq > 0) {
      const cell = (env.portrait ? 21 : 15) * U
      const gp = cell * 0.35
      const sx = X(L.x0) + (env.portrait ? 44 : 60)
      const sy = Y(L.seqY)
      const step = Math.floor(lb * 4) % 16
      DRUMS.forEach((row, r) => {
        const y = sy + r * (cell + gp)
        typeText(g, row.name, sx - 12, y + cell / 2, sq, 8.5, INK.muted, 'right')
        for (let s = 0; s < 16; s++) {
          const appear = clamp(sq * 1.5 - (s + r) / 24)
          if (appear <= 0) continue
          const x = sx + s * (cell + gp) + Math.floor(s / 4) * gp
          const on = row.steps.includes(s)
          const lit = on && s === step && lb < 7.8
          g.strokeStyle = col(INK.ink, 0.35)
          g.strokeRect(x, y, cell, cell * appear)
          if (on) {
            g.fillStyle = lit ? INK.fern : col(INK.ink, 0.75)
            g.fillRect(x + 2, y + 2, cell - 4, (cell - 4) * appear)
          }
        }
      })
      // chord notes to the right
      const ax = env.portrait ? X(L.x0) + 60 : X(120)
      const ay = env.portrait ? sy + 4 * (cell + gp) + 24 : sy + 6
      const chord = lb < 4 ? ['Am9', 'A · C · E · G · B'] : ['Fmaj7', 'F · A · C · E']
      maskText(g, chord[0], ax, ay + 18, 26 * U + 6, pb(lb % 4, 0.05, 0.4))
      typeText(g, chord[1], ax, ay + 34, pb(lb % 4, 0.2, 0.6, (v) => v), 9.5, INK.muted)
      typeText(g, '128 BPM · 4/4 · A MINOR', ax, ay + 50, pb(lb, 1.6, 2.2, (v) => v), 9.5, INK.fern)
    }

    // --- spectrum ------------------------------------------------------------------------------------
    const spc = pb(lb, 1.0, 1.8)
    if (spc > 0) {
      const base = Y(L.specY)
      const n = 96
      g.beginPath()
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1)
        const x = X(L.x0) + s * width * U
        const shape = Math.pow(1 - s, 0.6) * (0.55 + 0.45 * noise1(i * 0.45 + lb * 3.5)) + 0.08
        const h = (8 + (env.portrait ? 70 : 100) * shape * (0.5 + 0.5 * kick)) * U * spc
        g.moveTo(x, base)
        g.lineTo(x, base - h)
      }
      g.strokeStyle = col(INK.moss, 0.85)
      g.stroke()
      g.strokeStyle = col(INK.ink, 0.4)
      line(g, X(L.x0), base + 0.5, X(L.x1), base + 0.5, spc)
      typeText(g, '20 HZ', X(L.x0), base + 12, spc, 8.5, INK.muted)
      typeText(g, '20 KHZ', X(L.x1), base + 12, spc, 8.5, INK.muted, 'right')
    }
  },

  hud(g, t, env) {
    caption(g, env, t / B, 4, CHAPTERS[3])
  },
}
