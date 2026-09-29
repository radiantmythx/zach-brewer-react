import { B, col, line, lineMid, maskText, pb, reg, SANS, typeText } from '../kit'
import { clamp, easeInOutCubic, easeOutCubic, lerp } from '../math'
import type { Env, Scene } from '../scene'
import { BEAT, CHAPTERS, INK } from '../timeline'

/*
 * INDEX — beats 0–8.
 * A registration mark, then a field of ruled hairlines draws out from the
 * centre. A lens-shaped wave travels through it while the contents set
 * themselves — each chapter with its timecode for a page number — and the
 * field collapses into a single rule for the first wipe.
 */

const ROWS = 31

const tc = (beats: number) => {
  const s = beats * BEAT
  return `00:${s.toFixed(2).padStart(5, '0')}`
}

function field(g: CanvasRenderingContext2D, env: Env, lb: number) {
  const { fig, cy, U } = env
  const spacing = Math.min(18 * U, fig.h / (ROWS + 1))
  const collapse = pb(lb, 5.4, 7.2)
  const lens = pb(lb, 0.9, 4.6, (v) => v)
  const lensX = lerp(fig.x - fig.w * 0.2, fig.x + fig.w * 1.2, lens)
  const sigma = fig.w * 0.09
  const amp = 26 * U * Math.sin(Math.PI * lens) * (1 - collapse)
  const samples = 90
  for (let i = 0; i < ROWS; i++) {
    const k = i - (ROWS - 1) / 2
    const draw = pb(lb, 0.25 + Math.abs(k) * 0.035, 1.1 + Math.abs(k) * 0.035, easeOutCubic)
    if (draw <= 0) continue
    const base = cy + k * spacing * (1 - collapse)
    const accent = i === (ROWS - 1) / 2
    g.strokeStyle = accent ? col(INK.ink, 0.9) : col(INK.ink, 0.1 + 0.12 * (1 - Math.abs(k) / ROWS))
    g.lineWidth = 1
    const x0 = lerp(env.cx, fig.x, draw)
    const x1 = lerp(env.cx, fig.x + fig.w, draw)
    g.beginPath()
    for (let s = 0; s <= samples; s++) {
      const x = lerp(x0, x1, s / samples)
      const d = Math.exp(-((x - lensX) ** 2) / (2 * sigma * sigma))
      const y = base + amp * d * Math.sin(k * 0.55 + lb * 5) + (k * spacing * 0.35 * d * (1 - collapse) * Math.sin(Math.PI * lens))
      if (s === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  // the lens itself: a thin vertical measure riding the wave
  if (lens > 0 && lens < 1 && collapse < 1) {
    g.strokeStyle = col(INK.ocean, 0.7)
    lineMid(g, lensX, cy - fig.h * 0.46, lensX, cy + fig.h * 0.46, pb(lb, 0.9, 1.3))
    typeText(g, `λ ${(lens * 100).toFixed(1)}`, lensX + 6, cy - fig.h * 0.44, 1, 9.5, INK.ocean)
  }
}

function contents(g: CanvasRenderingContext2D, env: Env, lb: number) {
  const { U, fig } = env
  const out = 1 - pb(lb, 5.6, 6.4)
  if (out <= 0) return
  const w = env.portrait ? fig.w * 0.86 : Math.min(460 * U, fig.w * 0.42)
  const x = env.portrait ? env.cx - w / 2 : fig.x + fig.w - w - 30 * U
  const rowH = Math.max(34, 44 * U)
  const y0 = env.cy - rowH * 2.4
  g.globalAlpha = out
  // knock the ruled field out behind the table
  g.fillStyle = INK.paper
  g.fillRect(x - 16, y0 - rowH * 0.9, w + 32, rowH * 5.2 * clamp(pb(lb, 2.6, 3.1) * 1.2))
  typeText(g, 'CONTENTS', x, y0 - rowH * 0.45, pb(lb, 2.7, 3.1, (v) => v), 10, INK.muted)
  CHAPTERS.forEach((c, i) => {
    const at = 3.0 + i * 0.25
    const y = y0 + (i + 1) * rowH
    g.strokeStyle = col(INK.ink, 0.25)
    g.lineWidth = 1
    line(g, x, y + 8, x + w, y + 8, pb(lb, at, at + 0.5))
    typeText(g, `0${i + 1}`, x, y - 6, pb(lb, at, at + 0.2, (v) => v), 10, c.color)
    maskText(g, c.label, x + 36, y, Math.max(20, 28 * U), pb(lb, at + 0.05, at + 0.5))
    typeText(g, tc(c.from), x + w, y - 6, pb(lb, at + 0.15, at + 0.45, (v) => v), 10, INK.muted, 'right')
  })
  g.globalAlpha = 1
}

export const openScene: Scene = {
  id: 'open',

  fx(t, _env, fx) {
    fx.zoom *= 1 + 0.02 * easeInOutCubic(clamp(t / (6 * B)))
  },

  draw(g, t, env) {
    const lb = t / B
    g.strokeStyle = col(INK.ink, 0.8)
    g.lineWidth = 1
    reg(g, env.cx, env.cy, 16, pb(lb, 0, 0.5) * (1 - pb(lb, 1.2, 1.6)))
    field(g, env, lb)
    contents(g, env, lb)
  },

  hud(g, t, env) {
    const lb = t / B
    const out = 1 - pb(lb, 6.9, 7.6)
    if (out <= 0) return
    const x = env.pad
    const base = env.bottom - 8
    const size = env.portrait ? 42 : Math.min(76, Math.max(52, env.W * 0.05))
    g.globalAlpha = out
    typeText(g, 'ZACH BREWER — SELECTED WORK, 2016–2026', x, base, pb(lb, 2.2, 3.0, (v) => v), 10, INK.muted)
    maskText(g, 'Selected work across engineering, design, games and sound.', x, base - 24, 15, pb(lb, 1.9, 2.5), { family: SANS, color: INK.ink2 })
    const titleY = base - 46
    maskText(g, 'Four disciplines.', x - size * 0.02, titleY - size * 1.02, size, pb(lb, 1.1, 1.8))
    maskText(g, 'One practice.', x - size * 0.02, titleY, size, pb(lb, 1.45, 2.15), { style: 'italic', color: INK.moss })
    g.strokeStyle = INK.ink
    g.lineWidth = 1
    const figY = titleY - size * 2.02 - 14
    line(g, x, figY, x + 28, figY, pb(lb, 0.9, 1.3))
    typeText(g, 'FIG. 00 — INDEX', x + 38, figY, pb(lb, 1.0, 1.5, (v) => v), 10, INK.ink)
    g.globalAlpha = 1
  },
}
