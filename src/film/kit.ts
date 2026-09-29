import { clamp, easeInOutCubic, easeOutCubic, hexToRgb, lerp, rgba, seg, TAU, type RGB } from './math'
import type { Chapter } from './timeline'
import type { Env } from './scene'
import { BEAT, INK } from './timeline'

/*
 * The reel's drawing kit — linework on paper. Everything draws on: lines,
 * rects, arcs and polylines take a progress value, so construction reads as
 * it happens. Hairlines are 1 CSS px; accents rarely exceed 2.
 */

export const SERIF = '"Instrument Serif", Georgia, serif'
export const SANS = 'Geist, system-ui, -apple-system, "Segoe UI", sans-serif'
export const MONO = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace'

export const font = (size: number, weight = 400, family = SANS, style = '') =>
  `${style ? style + ' ' : ''}${weight} ${Math.max(1, size).toFixed(1)}px ${family}`

export const B = BEAT

const RGB_CACHE = new Map<string, RGB>()
export function rgb(hex: string): RGB {
  let c = RGB_CACHE.get(hex)
  if (!c) {
    c = hexToRgb(hex)
    RGB_CACHE.set(hex, c)
  }
  return c
}
export const col = (hex: string, a = 1) => rgba(rgb(hex), a)

/** progress of local beat lb through [a, b] (beats), eased */
export const pb = (lb: number, a: number, b: number, ease: (x: number) => number = easeInOutCubic) => seg(lb, a, b, ease)

/* ------------------------------------------------------------ draw-on primitives */

export function line(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, p = 1) {
  if (p <= 0) return
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(lerp(x0, x1, p), lerp(y0, y1, p))
  g.stroke()
}

/** A line drawn outward from its midpoint. */
export function lineMid(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, p = 1) {
  if (p <= 0) return
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  g.beginPath()
  g.moveTo(lerp(mx, x0, p), lerp(my, y0, p))
  g.lineTo(lerp(mx, x1, p), lerp(my, y1, p))
  g.stroke()
}

export function poly(g: CanvasRenderingContext2D, pts: [number, number][], p = 1, closed = false) {
  if (p <= 0 || pts.length < 2) return
  const all = closed ? [...pts, pts[0]] : pts
  let total = 0
  for (let i = 1; i < all.length; i++) total += Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1])
  let left = total * clamp(p)
  g.beginPath()
  g.moveTo(all[0][0], all[0][1])
  for (let i = 1; i < all.length && left > 0; i++) {
    const [ax, ay] = all[i - 1]
    const [bx, by] = all[i]
    const l = Math.hypot(bx - ax, by - ay) || 1e-6
    const f = Math.min(1, left / l)
    g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f)
    left -= l
  }
  g.stroke()
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p = 1) {
  if (p >= 1) {
    g.strokeRect(x, y, w, h)
    return
  }
  poly(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], p, true)
}

export function arc(g: CanvasRenderingContext2D, x: number, y: number, r: number, a0: number, span: number, p = 1) {
  if (p <= 0 || r <= 0) return
  g.beginPath()
  g.arc(x, y, r, a0, a0 + span * clamp(p), span < 0)
  g.stroke()
}

export function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number, p = 1, a0 = -Math.PI / 2) {
  arc(g, x, y, r, a0, TAU, p)
}

export function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  if (r <= 0) return
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fill()
}

/** Registration mark: a small circle with a cross through it. */
export function reg(g: CanvasRenderingContext2D, x: number, y: number, r: number, p = 1) {
  if (p <= 0) return
  circle(g, x, y, r * 0.55, p)
  lineMid(g, x - r, y, x + r, y, p)
  lineMid(g, x, y - r, x, y + r, p)
}

/** Crop-mark corner. */
export function corner(g: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, len: number, p = 1) {
  if (p <= 0) return
  g.beginPath()
  g.moveTo(x + sx * len * p, y)
  g.lineTo(x, y)
  g.lineTo(x, y + sy * len * p)
  g.stroke()
}

/** Dimension line with end ticks and a centred mono label. */
export function dim(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, label: string, p: number, color = INK.fern) {
  if (p <= 0.001) return
  const a = Math.atan2(y1 - y0, x1 - x0)
  const nx = -Math.sin(a) * 4
  const ny = Math.cos(a) * 4
  g.strokeStyle = color
  g.lineWidth = 1
  lineMid(g, x0, y0, x1, y1, easeOutCubic(p))
  const tp = clamp(p * 3 - 1)
  if (tp > 0) {
    line(g, x0 - nx, y0 - ny, x0 + nx, y0 + ny, tp)
    line(g, x1 - nx, y1 - ny, x1 + nx, y1 + ny, tp)
  }
  if (p > 0.6) {
    g.globalAlpha = clamp((p - 0.6) / 0.4)
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    g.font = font(9.5, 500, MONO)
    const w = g.measureText(label).width + 6
    g.fillStyle = INK.paper
    g.fillRect(mx - w / 2, my - 7, w, 14)
    g.fillStyle = color
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(label, mx, my + 0.5)
    g.globalAlpha = 1
  }
}

/** Parallel hatching inside a rect, swept in by p. */
export function hatch(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gap: number, p = 1) {
  if (p <= 0) return
  g.save()
  g.beginPath()
  g.rect(x, y, w * clamp(p), h)
  g.clip()
  g.beginPath()
  for (let k = -h; k < w; k += gap) {
    g.moveTo(x + k, y + h)
    g.lineTo(x + k + h, y)
  }
  g.stroke()
  g.restore()
}

/* ------------------------------------------------------------ type */

/** Serif line that rises out of a mask; returns its width. */
export function maskText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  p: number,
  o: { family?: string; weight?: number; style?: string; color?: string; align?: CanvasTextAlign } = {},
) {
  g.font = font(size, o.weight ?? 400, o.family ?? SERIF, o.style)
  g.textAlign = o.align ?? 'left'
  g.textBaseline = 'alphabetic'
  const w = g.measureText(text).width
  if (p <= 0) return w
  const left = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x
  g.save()
  g.beginPath()
  g.rect(left - size * 0.1, y - size * 1.05, w + size * 0.3, size * 1.5)
  g.clip()
  g.fillStyle = o.color ?? INK.ink
  g.fillText(text, x, y + (1 - easeOutCubic(clamp(p))) * size * 1.1)
  g.restore()
  return w
}

/** Mono text typed character by character. */
export function typeText(g: CanvasRenderingContext2D, text: string, x: number, y: number, p: number, size = 10, color = INK.muted, align: CanvasTextAlign = 'left') {
  if (p <= 0) return
  g.font = font(size, 500, MONO)
  g.textAlign = align
  g.textBaseline = 'middle'
  g.fillStyle = color
  g.fillText(text.slice(0, Math.ceil(text.length * clamp(p))), x, y)
}

export const upper = (s: string) => s.toUpperCase()

/* ------------------------------------------------------------ the figure caption */

/**
 * Editorial caption for a section: "FIG. 01", the title in serif, a line of
 * caption and a mono annotation — sitting where the hero copy later lands.
 */
export function caption(g: CanvasRenderingContext2D, env: Env, lb: number, index: number, ch: Chapter, len = 8) {
  const out = 1 - pb(lb, len - 0.9, len - 0.3)
  if (out <= 0 || lb < 0) return
  const x = env.pad
  const base = env.bottom - 8
  const title = env.portrait ? 44 : Math.min(76, Math.max(52, env.W * 0.05))
  g.globalAlpha = out
  const noteY = base
  const capY = noteY - 24
  const titleY = capY - 22
  typeText(g, upper(ch.note), x, noteY, pb(lb, 0.9, 1.6, (v) => v), 10, INK.muted)
  maskText(g, ch.caption, x, capY, 15, pb(lb, 0.55, 1.1), { family: SANS, color: INK.ink2 })
  maskText(g, ch.label, x - title * 0.02, titleY, title, pb(lb, 0.25, 0.95))
  const figY = titleY - title - 14
  g.strokeStyle = ch.color
  g.lineWidth = 1
  line(g, x, figY, x + 28, figY, pb(lb, 0.1, 0.5))
  typeText(g, `FIG. 0${index}`, x + 38, figY, pb(lb, 0.2, 0.6, (v) => v), 10, ch.color)
  g.globalAlpha = 1
}
