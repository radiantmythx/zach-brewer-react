import { B, caption, col, dim, font, line, maskText, MONO, pb, rect, SANS, SERIF, typeText } from '../kit'
import { bez, clamp, cubicBezierEase, easeInOutSine, easeOutCubic, lerp, TAU } from '../math'
import type { Env, Scene } from '../scene'
import { CHAPTERS, INK } from '../timeline'

/*
 * FIG. 02 INTERFACE DESIGN — beats 16–24.
 * A 12-column grid sweeps in. A wireframe card assembles on it and gets its
 * redlines; a bezier editor tunes an easing curve (the readout updates
 * live); a type specimen sets its metric lines above a type scale; the
 * palette lands last.
 */

export const DESIGN_EVENT_BEATS = [0.7, 1.1, 1.7, 2.4, 2.8, 3.2, 3.6, 4.0, 4.8, 5.0, 5.2, 5.4, 5.6]

type R = { x: number; y: number; w: number; h: number }

function layout(env: Env) {
  if (env.portrait)
    return {
      grid: { x: -330, w: 660, cols: 6 },
      card: { x: -330, y: -390, w: 310, h: 360 },
      curve: { x: 20, y: -390, w: 310, h: 230 },
      spec: { x: -330, y: 150, w: 660, size: 140 },
      swatch: { x: 22, y: -120 },
    }
  return {
    grid: { x: -580, w: 1160, cols: 12 },
    card: { x: -580, y: -250, w: 373, h: 470 },
    curve: { x: -88, y: -210, w: 373, h: 300 },
    spec: { x: 305, y: -10, w: 275, size: 170 },
    swatch: { x: -88, y: 185 },
  }
}

function ctrl(lb: number) {
  const a = easeInOutSine(clamp((lb - 2.6) / 1.6))
  const b = easeInOutSine(clamp((lb - 4.4) / 1.6))
  return {
    x1: lerp(0.65, 0.82, a) - 0.1 * b,
    y1: lerp(0, -0.18, a) + 0.18 * b,
    x2: lerp(0.35, 0.18, a) + 0.17 * b,
    y2: lerp(1, 1.22, a) - 0.22 * b,
  }
}

const f2 = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2)

export const designScene: Scene = {
  id: 'design',

  fx(t, _env, fx) {
    fx.zoom *= 1 + 0.018 * clamp(t / (8 * B))
  },

  draw(g, t, env) {
    const lb = t / B
    const { U, cx, cy, fig } = env
    const L = layout(env)
    const X = (x: number) => cx + x * U
    const Y = (y: number) => cy + y * U
    g.lineWidth = 1

    // --- the grid -----------------------------------------------------------------
    const gutter = 20
    const colW = (L.grid.w - gutter * (L.grid.cols - 1)) / L.grid.cols
    g.strokeStyle = col(INK.lagoon, 0.2)
    for (let c = 0; c < L.grid.cols; c++) {
      const x0 = L.grid.x + c * (colW + gutter)
      const p = pb(lb, c * 0.05, 0.5 + c * 0.05)
      line(g, X(x0), fig.y, X(x0), fig.y + fig.h, p)
      line(g, X(x0 + colW), fig.y + fig.h, X(x0 + colW), fig.y, p)
      g.fillStyle = col(INK.lagoon, 0.035 * p)
      g.fillRect(X(x0), fig.y, colW * U, fig.h * p)
    }
    const baseline = 16 * U
    g.strokeStyle = col(INK.ink, 0.045)
    g.beginPath()
    const bp = pb(lb, 0.3, 1.2)
    for (let y = fig.y; y < fig.y + fig.h; y += baseline) {
      g.moveTo(fig.x, y)
      g.lineTo(fig.x + fig.w * bp, y)
    }
    g.stroke()
    typeText(g, `${L.grid.cols} COL · ${gutter} GUTTER`, X(L.grid.x), fig.y + fig.h - 10, pb(lb, 0.4, 0.9, (v) => v), 9, INK.lagoon)

    // --- wireframe card -------------------------------------------------------------
    const card: R = { x: X(L.card.x), y: Y(L.card.y), w: L.card.w * U, h: L.card.h * U }
    const pad = 16 * U
    const cp = pb(lb, 0.7, 1.4)
    g.fillStyle = INK.paper
    g.fillRect(card.x, card.y, card.w * clamp(cp * 1.4), card.h)
    g.strokeStyle = INK.ink
    rect(g, card.x, card.y, card.w, card.h, cp)
    const img: R = { x: card.x + pad, y: card.y + pad, w: card.w - pad * 2, h: card.h * 0.42 }
    const ip = pb(lb, 1.1, 1.8)
    g.strokeStyle = col(INK.ink, 0.5)
    rect(g, img.x, img.y, img.w, img.h, ip)
    g.strokeStyle = col(INK.ink, 0.18)
    line(g, img.x, img.y, img.x + img.w, img.y + img.h, pb(lb, 1.4, 1.9))
    line(g, img.x + img.w, img.y, img.x, img.y + img.h, pb(lb, 1.5, 2.0))
    const ty = img.y + img.h + 26 * U
    typeText(g, 'CASE STUDY — 2026', img.x, ty, pb(lb, 1.6, 2.0, (v) => v), Math.max(8.5, 9.5 * U), INK.muted)
    maskText(g, 'Considered interfaces', img.x, ty + 36 * U, Math.max(16, 28 * U), pb(lb, 1.7, 2.3))
    g.strokeStyle = col(INK.ink, 0.14)
    g.lineWidth = Math.max(3, 5 * U)
    ;[0.92, 0.97, 0.58].forEach((w, i) => line(g, img.x, ty + (62 + i * 17) * U, img.x + img.w * w, ty + (62 + i * 17) * U, pb(lb, 1.9 + i * 0.12, 2.4 + i * 0.12)))
    g.lineWidth = 1
    const btn: R = { x: img.x, y: ty + 122 * U, w: 118 * U, h: 34 * U }
    const bpp = pb(lb, 2.4, 2.9)
    g.strokeStyle = INK.ink
    rect(g, btn.x, btn.y, btn.w, btn.h, bpp)
    if (bpp > 0.6) {
      g.font = font(Math.max(9, 12 * U), 500, SANS)
      g.fillStyle = INK.ink
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.globalAlpha = clamp((bpp - 0.6) / 0.4)
      g.fillText('View project →', btn.x + btn.w / 2, btn.y + btn.h / 2)
      g.globalAlpha = 1
    }
    // redlines
    dim(g, card.x, card.y - 12, card.x + card.w, card.y - 12, `${Math.round(L.card.w)}`, pb(lb, 2.8, 3.4))
    dim(g, card.x + 3, img.y + img.h * 0.5, img.x - 3, img.y + img.h * 0.5, '16', pb(lb, 3.2, 3.7))
    dim(g, img.x + img.w * 0.7, img.y + img.h + 3, img.x + img.w * 0.7, ty - 8, '24', pb(lb, 3.6, 4.1))
    dim(g, btn.x + btn.w + 12, btn.y, btn.x + btn.w + 12, btn.y + btn.h, '36', pb(lb, 4.0, 4.5))

    // --- bezier editor ----------------------------------------------------------------
    const cv: R = { x: X(L.curve.x), y: Y(L.curve.y), w: L.curve.w * U, h: L.curve.h * U }
    const ax = cv.x + 34 * U
    const ay = cv.y + cv.h - 30 * U
    const aw = cv.w - 60 * U
    const ah = cv.h - 70 * U
    g.fillStyle = INK.paper
    g.fillRect(cv.x, cv.y, cv.w * pb(lb, 1.4, 2.0), cv.h)
    g.strokeStyle = col(INK.ink, 0.6)
    line(g, ax, ay, ax + aw, ay, pb(lb, 1.5, 2.1))
    line(g, ax, ay, ax, ay - ah, pb(lb, 1.5, 2.0))
    g.strokeStyle = col(INK.ink, 0.12)
    g.setLineDash([2, 4])
    line(g, ax, ay - ah, ax + aw, ay - ah, pb(lb, 1.8, 2.3))
    line(g, ax + aw, ay, ax + aw, ay - ah, pb(lb, 1.8, 2.3))
    g.setLineDash([])
    for (let k = 0; k <= 10; k++) {
      g.strokeStyle = col(INK.ink, 0.3)
      line(g, ax + (aw * k) / 10, ay, ax + (aw * k) / 10, ay + (k % 5 ? 3 : 6), pb(lb, 1.8, 2.1))
    }
    typeText(g, 'PROGRESS', ax + aw, ay + 16, pb(lb, 1.9, 2.2, (v) => v), 9, INK.muted, 'right')
    typeText(g, 'VALUE', ax, ay - ah - 14, pb(lb, 1.9, 2.2, (v) => v), 9, INK.muted)
    const c = ctrl(lb)
    const P0 = [ax, ay]
    const P3 = [ax + aw, ay - ah]
    const K1 = [ax + c.x1 * aw, ay - c.y1 * ah]
    const K2 = [ax + c.x2 * aw, ay - c.y2 * ah]
    const kp = pb(lb, 2.0, 2.8)
    if (kp > 0) {
      g.strokeStyle = INK.lagoon
      g.lineWidth = 1.5
      g.beginPath()
      const n = Math.ceil(60 * kp)
      for (let i = 0; i <= n; i++) {
        const s = i / 60
        const x = bez(P0[0], K1[0], K2[0], P3[0], s)
        const y = bez(P0[1], K1[1], K2[1], P3[1], s)
        if (i) g.lineTo(x, y)
        else g.moveTo(x, y)
      }
      g.stroke()
      g.lineWidth = 1
      g.strokeStyle = col(INK.ink, 0.55)
      line(g, P0[0], P0[1], K1[0], K1[1], clamp(kp * 1.5 - 0.3))
      line(g, P3[0], P3[1], K2[0], K2[1], clamp(kp * 1.5 - 0.3))
      for (const [x, y, fill] of [
        [K1[0], K1[1], false],
        [K2[0], K2[1], true],
      ] as const) {
        g.fillStyle = fill ? INK.lagoon : INK.paper
        g.beginPath()
        g.arc(x, y, 3.5, 0, TAU)
        g.fill()
        g.strokeStyle = INK.lagoon
        g.stroke()
      }
      for (const [x, y] of [P0, P3]) {
        g.fillStyle = INK.paper
        g.fillRect(x - 3.5, y - 3.5, 7, 7)
        g.strokeStyle = INK.ink
        g.strokeRect(x - 3.5, y - 3.5, 7, 7)
      }
      // live readout + preview
      const readout = env.portrait ? `(${f2(c.x1)}, ${f2(c.y1)}, ${f2(c.x2)}, ${f2(c.y2)})` : `cubic-bezier(${f2(c.x1)}, ${f2(c.y1)}, ${f2(c.x2)}, ${f2(c.y2)})`
      typeText(g, readout, cv.x + 34 * U, cv.y + 12, clamp(kp * 2), Math.max(8.5, 10 * U), INK.lagoon)
      const cyc = (lb % 1.5) / 1.5
      const e = cubicBezierEase(c.x1, c.y1, c.x2, c.y2, clamp(cyc / 0.8))
      const py = ay + 16
      g.strokeStyle = col(INK.ink, 0.12)
      line(g, ax, py, ax + aw * 0.55, py)
      g.fillStyle = INK.lagoon
      g.fillRect(ax + aw * 0.55 * e - 3, py - 3, 6, 6)
    }

    // --- type specimen -------------------------------------------------------------------
    const sx = X(L.spec.x)
    const size = L.spec.size * U
    const base = Y(L.spec.y) + size * 0.3
    const sw = L.spec.w * U
    const sp = pb(lb, 3.2, 3.9)
    const metrics = [
      ['ASCENDER', 0.8],
      ['CAP HEIGHT', 0.7],
      ['X-HEIGHT', 0.45],
      ['BASELINE', 0],
      ['DESCENDER', -0.22],
    ] as const
    metrics.forEach(([label, k], i) => {
      const y = base - k * size
      g.strokeStyle = i === 3 ? INK.lagoon : col(INK.ink, 0.25)
      line(g, sx, y, sx + sw, y, pb(lb, 3.2 + i * 0.08, 3.7 + i * 0.08))
      typeText(g, label, sx + sw, y - 7, pb(lb, 3.4 + i * 0.08, 3.8 + i * 0.08, (v) => v), 8.5, INK.muted, 'right')
    })
    maskText(g, 'Aa', sx + 4, base, size, sp)
    const scale = [
      ['Display', 30, SERIF],
      ['Title', 20, SERIF],
      ['Body copy', 13, SANS],
      ['CAPTION', 9.5, MONO],
    ] as const
    let yy = base + size * 0.42
    scale.forEach(([label, s, fam], i) => {
      const px = Math.max(8, s * U)
      yy += px * 1.35
      maskText(g, label, sx, yy, px, pb(lb, 4.1 + i * 0.12, 4.6 + i * 0.12), { family: fam, color: INK.ink2 })
      typeText(g, `${s}`, sx + sw, yy - px * 0.35, pb(lb, 4.2 + i * 0.12, 4.5 + i * 0.12, (v) => v), 8.5, INK.muted, 'right')
    })

    // --- palette ---------------------------------------------------------------------------
    const swatches = [INK.ink, INK.ocean, INK.lagoon, INK.moss, INK.fern, INK.paper2]
    const s0x = X(L.swatch.x)
    const s0y = Y(L.swatch.y)
    swatches.forEach((c2, i) => {
      const p = pb(lb, 4.8 + i * 0.12, 5.2 + i * 0.12, easeOutCubic)
      if (p <= 0) return
      const s = 26 * U
      const x = s0x + i * (s + 26 * U)
      g.fillStyle = c2
      g.fillRect(x, s0y + s * (1 - p), s, s * p)
      g.strokeStyle = col(INK.ink, 0.35)
      g.strokeRect(x, s0y, s, s)
      if (!env.portrait) typeText(g, c2.slice(1).toUpperCase(), x, s0y + s + 11, clamp(p * 2 - 1), 8, INK.muted)
    })
  },

  hud(g, t, env) {
    caption(g, env, t / B, 2, CHAPTERS[1])
  },
}
