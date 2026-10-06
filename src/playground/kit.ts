/*
 * The Playground kit: the site's drawing language as canvas helpers, so every
 * motion study and game reads as one family — ink hairlines on paper (or
 * paper hairlines on the night ground), technical annotation in Geist Mono,
 * display type in Instrument Serif, and a small earth-tone palette.
 *
 * Nothing here allocates per frame unless you ask it to.
 */

import type { Mode, PieceStore, PointerInfo } from './types'

/* ------------------------------------------------------------------ palette */

export const C = {
  paper: '#F3F6F2',
  paper2: '#E3EBE5',
  ink: '#122630',
  ink2: '#3A4F58',
  muted: '#6C7F86',
  rule: 'rgba(18, 38, 48, 0.13)',
  ocean: '#2B6A93',
  sky: '#7FB6D9',
  lagoon: '#1F8A86',
  moss: '#3F7A55',
  sage: '#9DB9A0',
  fern: '#6F952F',
  /** the night ground (the site's contact section) */
  night: '#0B1D24',
  night2: '#0E261D',
} as const

/** The four accents in the site's discipline order. */
export const ACCENTS = [C.ocean, C.lagoon, C.moss, C.fern] as const

export type Ground = 'paper' | 'night'

/** Line/text colours that read on a ground. */
export function inkOn(ground: Ground) {
  return ground === 'paper'
    ? { ink: C.ink, ink2: C.ink2, muted: C.muted, rule: C.rule, faint: 'rgba(18,38,48,0.07)' }
    : { ink: '#EEF4F1', ink2: 'rgba(238,244,241,0.78)', muted: 'rgba(238,244,241,0.5)', rule: 'rgba(238,244,241,0.14)', faint: 'rgba(238,244,241,0.06)' }
}

export const FONT = {
  serif: '"Instrument Serif", "Iowan Old Style", "Times New Roman", serif',
  sans: 'Geist, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"Geist Mono", ui-monospace, Menlo, Consolas, monospace',
} as const

/* --------------------------------------------------------------------- math */

export const TAU = Math.PI * 2
export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a))
export const remap = (v: number, a: number, b: number, c: number, d: number) => c + (d - c) * invLerp(a, b, v)
export const fract = (v: number) => v - Math.floor(v)
/** Positive modulo. */
export const mod = (a: number, n: number) => ((a % n) + n) % n
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp(invLerp(a, b, v))
  return t * t * (3 - 2 * t)
}
/** Frame-rate independent exponential approach: x += (target - x) * damp(k, dt). */
export const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay)
/** Shortest signed angle from a to b. */
export const angleDiff = (a: number, b: number) => mod(b - a + Math.PI, TAU) - Math.PI

export const ease = {
  linear: (t: number) => t,
  inSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t: number) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
} as const

/* ------------------------------------------------------------- randomness */

/** Seeded PRNG (mulberry32): rng() → [0, 1). */
export function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export type Rng = ReturnType<typeof rng>
export const range = (r: Rng, lo: number, hi: number) => lo + (hi - lo) * r()
export const pick = <T>(r: Rng, arr: readonly T[]) => arr[Math.floor(r() * arr.length)]
/** Approximately normal, mean 0, sd 1. */
export const gauss = (r: Rng) => {
  let u = 0
  let v = 0
  while (u === 0) u = r()
  while (v === 0) v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v)
}

/* ------------------------------------------------------------------ noise */

// Simplex noise (Gustavson), 2D and 3D, seeded permutation. Output ≈ [-1, 1].
const GRAD3 = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]

export function makeNoise(seed = 1) {
  const r = rng(seed)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    const t = p[i]
    p[i] = p[j]
    p[j] = t
  }
  const perm = new Uint8Array(512)
  const pm12 = new Uint8Array(512)
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
    pm12[i] = perm[i] % 12
  }
  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6
  const F3 = 1 / 3
  const G3 = 1 / 6

  function n2(xin: number, yin: number) {
    const s = (xin + yin) * F2
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const t = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    let n = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      const g = pm12[ii + perm[jj]] * 3
      t0 *= t0
      n += t0 * t0 * (GRAD3[g] * x0 + GRAD3[g + 1] * y0)
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      const g = pm12[ii + i1 + perm[jj + j1]] * 3
      t1 *= t1
      n += t1 * t1 * (GRAD3[g] * x1 + GRAD3[g + 1] * y1)
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      const g = pm12[ii + 1 + perm[jj + 1]] * 3
      t2 *= t2
      n += t2 * t2 * (GRAD3[g] * x2 + GRAD3[g + 1] * y2)
    }
    return 70 * n
  }

  function n3(xin: number, yin: number, zin: number) {
    const s = (xin + yin + zin) * F3
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const k = Math.floor(zin + s)
    const t = (i + j + k) * G3
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const z0 = zin - (k - t)
    let i1, j1, k1, i2, j2, k2
    if (x0 >= y0) {
      if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0]
      else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1]
      else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1]
    } else {
      if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1]
      else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1]
      else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0]
    }
    const x1 = x0 - i1 + G3
    const y1 = y0 - j1 + G3
    const z1 = z0 - k1 + G3
    const x2 = x0 - i2 + 2 * G3
    const y2 = y0 - j2 + 2 * G3
    const z2 = z0 - k2 + 2 * G3
    const x3 = x0 - 1 + 3 * G3
    const y3 = y0 - 1 + 3 * G3
    const z3 = z0 - 1 + 3 * G3
    const ii = i & 255
    const jj = j & 255
    const kk = k & 255
    let n = 0
    const corner = (x: number, y: number, z: number, gi: number) => {
      let tt = 0.6 - x * x - y * y - z * z
      if (tt < 0) return 0
      const g = gi * 3
      tt *= tt
      return tt * tt * (GRAD3[g] * x + GRAD3[g + 1] * y + GRAD3[g + 2] * z)
    }
    n += corner(x0, y0, z0, pm12[ii + perm[jj + perm[kk]]])
    n += corner(x1, y1, z1, pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]])
    n += corner(x2, y2, z2, pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]])
    n += corner(x3, y3, z3, pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]])
    return 32 * n
  }

  /** Fractal sum of 2D noise. */
  function fbm2(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5) {
    let a = 1
    let f = 1
    let s = 0
    let norm = 0
    for (let o = 0; o < octaves; o++) {
      s += a * n2(x * f, y * f)
      norm += a
      a *= gain
      f *= lacunarity
    }
    return s / norm
  }

  /** Divergence-free 2D flow from a noise potential (curl noise). Returns [vx, vy]. */
  function curl2(x: number, y: number, z = 0, eps = 0.01): [number, number] {
    const a = n3(x, y + eps, z) - n3(x, y - eps, z)
    const b = n3(x + eps, y, z) - n3(x - eps, y, z)
    return [a / (2 * eps), -b / (2 * eps)]
  }

  return { n2, n3, fbm2, curl2 }
}
export type Noise = ReturnType<typeof makeNoise>

/* ------------------------------------------------------------------ colour */

const hexCache = new Map<string, [number, number, number]>()
/** '#2B6A93' / '#abc' / 'rgb(43,106,147)' → [43, 106, 147] */
export function hexRgb(hex: string): [number, number, number] {
  let v = hexCache.get(hex)
  if (!v) {
    if (hex.startsWith('rgb')) {
      const m = hex.match(/[\d.]+/g) ?? ['0', '0', '0']
      v = [Number(m[0]) | 0, Number(m[1]) | 0, Number(m[2]) | 0]
    } else {
      const h = hex.replace('#', '')
      const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
      v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    if (hexCache.size > 512) hexCache.clear()
    hexCache.set(hex, v)
  }
  return v
}
/** '#2B6A93', 0.4 → 'rgba(43,106,147,0.4)' */
export function rgba(hex: string, a: number) {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r},${g},${b},${clamp(a)})`
}
export function mixHex(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexRgb(a)
  const [r2, g2, b2] = hexRgb(b)
  const k = clamp(t)
  const hx = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  // hex, so the result can be fed back into rgba() / mixHex()
  return `#${hx(lerp(r1, r2, k))}${hx(lerp(g1, g2, k))}${hx(lerp(b1, b2, k))}`
}

/* ---------------------------------------------------------------- drawing */

type Ctx = CanvasRenderingContext2D

// The night ground is three full-frame gradients; render it once per size and blit it.
const nightCache = new Map<string, HTMLCanvasElement>()

/** Fill the whole frame with a ground. 'night' gets the contact section's two soft glows. */
export function ground(ctx: Ctx, w: number, h: number, g: Ground = 'paper') {
  if (g === 'paper') {
    ctx.fillStyle = C.paper
    ctx.fillRect(0, 0, w, h)
    return
  }
  if (typeof document === 'undefined') return paintNight(ctx, w, h)
  const res = Math.min(2, Math.max(0.5, ctx.getTransform().a || 1))
  const key = `${Math.round(w)}x${Math.round(h)}@${res}`
  let img = nightCache.get(key)
  if (!img) {
    img = document.createElement('canvas')
    img.width = Math.max(1, Math.round(w * res))
    img.height = Math.max(1, Math.round(h * res))
    const c2 = img.getContext('2d')
    if (!c2) return paintNight(ctx, w, h)
    c2.scale(res, res)
    paintNight(c2, w, h)
    if (nightCache.size >= 8) nightCache.delete(nightCache.keys().next().value as string)
    nightCache.set(key, img)
  }
  ctx.drawImage(img, 0, 0, w, h)
}

function paintNight(ctx: Ctx, w: number, h: number) {
  const lg = ctx.createLinearGradient(0, 0, w * 0.4, h)
  lg.addColorStop(0, '#0a1822')
  lg.addColorStop(0.5, '#0c2226')
  lg.addColorStop(1, '#0e261d')
  ctx.fillStyle = lg
  ctx.fillRect(0, 0, w, h)
  const r = Math.max(w, h)
  const g1 = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, r * 0.7)
  g1.addColorStop(0, 'rgba(43,106,147,0.32)')
  g1.addColorStop(1, 'rgba(43,106,147,0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, w, h)
  const g2 = ctx.createRadialGradient(w * 0.1, h, 0, w * 0.1, h, r * 0.6)
  g2.addColorStop(0, 'rgba(63,122,85,0.3)')
  g2.addColorStop(1, 'rgba(63,122,85,0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)
}

/** Hairline width that stays ~1 device pixel crisp. */
export const hair = (dpr: number) => Math.max(0.6, 1 / Math.min(dpr, 2)) * 1

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

/** Stroke a polyline from a flat [x0,y0,x1,y1,…] array or point list. */
export function poly(ctx: Ctx, pts: ArrayLike<number> | { x: number; y: number }[], close = false) {
  ctx.beginPath()
  if (pts.length && typeof (pts as { x: number }[])[0] === 'object') {
    const p = pts as { x: number; y: number }[]
    ctx.moveTo(p[0].x, p[0].y)
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
  } else {
    const p = pts as ArrayLike<number>
    ctx.moveTo(p[0], p[1])
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
  }
  if (close) ctx.closePath()
}

export function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, TAU)
}

/** Draw the first `t` (0–1) of a polyline's length — the site's "draw-on" stroke. */
export function drawOn(ctx: Ctx, pts: { x: number; y: number }[], t: number) {
  if (pts.length < 2 || t <= 0) return
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  let left = total * clamp(t)
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length && left > 0; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (seg <= left) ctx.lineTo(b.x, b.y)
    else {
      const k = left / seg
      ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)
    }
    left -= seg
  }
  ctx.stroke()
}

/** Parallel hatching clipped to a rectangle (or to the current path if `clipToPath`). */
export function hatch(ctx: Ctx, x: number, y: number, w: number, h: number, gap = 5, angle = -Math.PI / 4, clipToPath = false) {
  ctx.save()
  if (!clipToPath) {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
  }
  ctx.clip()
  const cx = x + w / 2
  const cy = y + h / 2
  const R = Math.hypot(w, h) / 2 + gap
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  ctx.beginPath()
  for (let d = -R; d <= R; d += gap) {
    const px = cx - sa * d
    const py = cy + ca * d
    ctx.moveTo(px - ca * R, py - sa * R)
    ctx.lineTo(px + ca * R, py + sa * R)
  }
  ctx.stroke()
  ctx.restore()
}

/** Corner crop marks around a rectangle, like the site's sheet corners. */
export function cropMarks(ctx: Ctx, x: number, y: number, w: number, h: number, size = 10, inset = 0) {
  const x0 = x + inset
  const y0 = y + inset
  const x1 = x + w - inset
  const y1 = y + h - inset
  ctx.beginPath()
  ctx.moveTo(x0, y0 + size)
  ctx.lineTo(x0, y0)
  ctx.lineTo(x0 + size, y0)
  ctx.moveTo(x1 - size, y0)
  ctx.lineTo(x1, y0)
  ctx.lineTo(x1, y0 + size)
  ctx.moveTo(x1, y1 - size)
  ctx.lineTo(x1, y1)
  ctx.lineTo(x1 - size, y1)
  ctx.moveTo(x0 + size, y1)
  ctx.lineTo(x0, y1)
  ctx.lineTo(x0, y1 - size)
  ctx.stroke()
}

/** A registration mark: circle + crosshair. */
export function regMark(ctx: Ctx, x: number, y: number, r = 6) {
  ctx.beginPath()
  ctx.arc(x, y, r * 0.55, 0, TAU)
  ctx.moveTo(x - r, y)
  ctx.lineTo(x + r, y)
  ctx.moveTo(x, y - r)
  ctx.lineTo(x, y + r)
  ctx.stroke()
}

/** A ruler of ticks along a line; every `major`th tick is longer. */
export function ticks(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, n: number, len = 4, major = 5) {
  const dx = x2 - x1
  const dy = y2 - y1
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const px = x1 + dx * k
    const py = y1 + dy * k
    const l = i % major === 0 ? len * 1.8 : len
    ctx.moveTo(px, py)
    ctx.lineTo(px + nx * l, py + ny * l)
  }
  ctx.stroke()
}

/** Faint square grid. */
export function grid(ctx: Ctx, x: number, y: number, w: number, h: number, step: number) {
  ctx.beginPath()
  for (let gx = x; gx <= x + w + 0.01; gx += step) {
    ctx.moveTo(Math.round(gx) + 0.5, y)
    ctx.lineTo(Math.round(gx) + 0.5, y + h)
  }
  for (let gy = y; gy <= y + h + 0.01; gy += step) {
    ctx.moveTo(x, Math.round(gy) + 0.5)
    ctx.lineTo(x + w, Math.round(gy) + 0.5)
  }
  ctx.stroke()
}

export interface TextOpts {
  font?: keyof typeof FONT
  size?: number
  weight?: number
  italic?: boolean
  color?: string
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  /** letter spacing in em (mono labels use 0.14) */
  tracking?: number
  upper?: boolean
  alpha?: number
}

const supportsTracking = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype

/** Set ctx.font etc. from options (also used before measureText). */
export function setFont(ctx: Ctx, o: TextOpts = {}) {
  const size = o.size ?? 11
  const fam = FONT[o.font ?? 'mono']
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? (o.font === 'serif' ? 400 : 500)} ${size}px ${fam}`
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.baseline ?? 'alphabetic'
  if (supportsTracking) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${(o.tracking ?? (o.font === 'mono' || !o.font ? 0.12 : 0)) * size}px`
}

/** Draw text. Defaults to the site's mono label: 11px, 500, tracked, as given. */
export function text(ctx: Ctx, str: string, x: number, y: number, o: TextOpts = {}) {
  setFont(ctx, o)
  if (o.color) ctx.fillStyle = o.color
  const prev = ctx.globalAlpha
  if (o.alpha !== undefined) ctx.globalAlpha = prev * o.alpha
  ctx.fillText(o.upper ? str.toUpperCase() : str, x, y)
  ctx.globalAlpha = prev
  if (supportsTracking) (ctx as Ctx & { letterSpacing: string }).letterSpacing = '0px'
}

/**
 * A technical dimension line between two points: end ticks, the line offset
 * perpendicular by `offset`, and a mono label at the middle.
 */
export function dimension(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, label: string, offset = 10, color?: string) {
  const dx = x2 - x1
  const dy = y2 - y1
  const L = Math.hypot(dx, dy) || 1
  const nx = (-dy / L) * offset
  const ny = (dx / L) * offset
  if (color) ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 + nx * 1.3, y1 + ny * 1.3)
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 + nx * 1.3, y2 + ny * 1.3)
  ctx.moveTo(x1 + nx, y1 + ny)
  ctx.lineTo(x2 + nx, y2 + ny)
  // small arrowheads as ticks
  const ux = dx / L
  const uy = dy / L
  for (const [px, py, s] of [
    [x1 + nx, y1 + ny, 1],
    [x2 + nx, y2 + ny, -1],
  ] as const) {
    ctx.moveTo(px + (ux * 5 + -uy * 2.5) * s, py + (uy * 5 + ux * 2.5) * s)
    ctx.lineTo(px, py)
    ctx.lineTo(px + (ux * 5 - -uy * 2.5) * s, py + (uy * 5 - ux * 2.5) * s)
  }
  ctx.stroke()
  if (label) {
    const mx = (x1 + x2) / 2 + nx * 1.9
    const my = (y1 + y2) / 2 + ny * 1.9
    text(ctx, label, mx, my, { size: 9, align: 'center', baseline: 'middle', color: color ?? (ctx.strokeStyle as string) })
  }
}

/* ------------------------------------------------------------- particles */

/** Hairline sparks: short streaks that fly, drag and fade. */
export class Sparks {
  private x: Float32Array
  private y: Float32Array
  private vx: Float32Array
  private vy: Float32Array
  private life: Float32Array
  private max: Float32Array
  private col: string[]
  private n = 0
  private cap: number
  constructor(cap = 400) {
    this.cap = cap
    this.x = new Float32Array(cap)
    this.y = new Float32Array(cap)
    this.vx = new Float32Array(cap)
    this.vy = new Float32Array(cap)
    this.life = new Float32Array(cap)
    this.max = new Float32Array(cap)
    this.col = new Array(cap).fill(C.ink)
  }
  /** Burst of `count` sparks at (x, y). speed in px/s; spread in radians around `dir` (default all round). */
  emit(x: number, y: number, count: number, o: { speed?: number; life?: number; color?: string; dir?: number; spread?: number; r?: Rng } = {}) {
    const r = o.r ?? Math.random
    for (let k = 0; k < count; k++) {
      const i = this.n < this.cap ? this.n++ : Math.floor(r() * this.cap)
      const a = o.dir === undefined ? r() * TAU : o.dir + (r() - 0.5) * (o.spread ?? 1)
      const s = (o.speed ?? 160) * (0.35 + r() * 0.85)
      this.x[i] = x
      this.y[i] = y
      this.vx[i] = Math.cos(a) * s
      this.vy[i] = Math.sin(a) * s
      this.max[i] = this.life[i] = (o.life ?? 0.6) * (0.5 + r() * 0.8)
      this.col[i] = o.color ?? C.ink
    }
  }
  update(dt: number, gravity = 0, drag = 3) {
    const k = Math.exp(-drag * dt)
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt
      if (this.life[i] <= 0) {
        // swap-remove
        const j = --this.n
        this.x[i] = this.x[j]
        this.y[i] = this.y[j]
        this.vx[i] = this.vx[j]
        this.vy[i] = this.vy[j]
        this.life[i] = this.life[j]
        this.max[i] = this.max[j]
        this.col[i] = this.col[j]
        i--
        continue
      }
      this.vx[i] *= k
      this.vy[i] = this.vy[i] * k + gravity * dt
      this.x[i] += this.vx[i] * dt
      this.y[i] += this.vy[i] * dt
    }
  }
  draw(ctx: Ctx, width = 1, streak = 0.035) {
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    for (let i = 0; i < this.n; i++) {
      const a = this.life[i] / this.max[i]
      ctx.globalAlpha = a
      ctx.strokeStyle = this.col[i]
      ctx.beginPath()
      ctx.moveTo(this.x[i], this.y[i])
      ctx.lineTo(this.x[i] - this.vx[i] * streak, this.y[i] - this.vy[i] * streak)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  get count() {
    return this.n
  }
  clear() {
    this.n = 0
  }
}

/** Expanding hairline rings (impacts, pickups, sonar). */
export class Rings {
  private items: { x: number; y: number; r0: number; r1: number; t: number; dur: number; color: string }[] = []
  add(x: number, y: number, r1 = 30, dur = 0.5, color: string = C.ink, r0 = 0) {
    this.items.push({ x, y, r0, r1, t: 0, dur, color })
  }
  update(dt: number) {
    for (const it of this.items) it.t += dt
    this.items = this.items.filter((it) => it.t < it.dur)
  }
  draw(ctx: Ctx, width = 1) {
    ctx.lineWidth = width
    for (const it of this.items) {
      const k = it.t / it.dur
      ctx.globalAlpha = 1 - k
      ctx.strokeStyle = it.color
      circle(ctx, it.x, it.y, lerp(it.r0, it.r1, ease.outCubic(k)))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  clear() {
    this.items = []
  }
}

/* ------------------------------------------------------------ game layout */

export interface Fit {
  /** scale from playfield units to CSS px */
  s: number
  /** CSS px offset of the playfield's top-left */
  ox: number
  oy: number
  /** playfield size in its own units */
  lw: number
  lh: number
  /** a short or small canvas: smaller HUD, no caption or ruler */
  compact?: boolean
  /** a wide, short canvas (landscape phone): the HUD sits in the side margins */
  side?: boolean
}

/**
 * Letterbox a fixed logical playfield (lw × lh units) into the canvas,
 * centred, leaving `pad` CSS px (top/bottom reserve extra room for the HUD).
 */
export function fit(w: number, h: number, lw: number, lh: number, pad = 16, hud = 0): Fit {
  const aw = Math.max(1, w - pad * 2)
  const ah = Math.max(1, h - pad * 2 - hud * 2)
  const s = Math.min(aw / lw, ah / lh)
  return { s, ox: (w - lw * s) / 2, oy: (h - lh * s) / 2, lw, lh }
}

/**
 * The standard game layout: the playfield letterboxed with room above for
 * the HUD and below for the caption. Use this rather than fit() in games.
 */
export function gameFit(w: number, h: number, mode: Mode, lw: number, lh: number): Fit {
  if (mode === 'preview') return { ...fit(w, h, lw, lh, 8, 22), compact: true }
  // a wide, short screen (a phone on its side): use the full height, HUD in the margins
  const sideFit = fit(w, h, lw, lh, 6, 0)
  if (h < 440 && w - sideFit.lw * sideFit.s > 220) return { ...sideFit, compact: true, side: true }
  if (h < 440 || w < 380) return { ...fit(w, h, lw, lh, 8, 24), compact: true }
  return fit(w, h, lw, lh, 16, 40)
}

/** The standard HUD for a gameFit layout: `left` items from the left edge, `right` items right-aligned. */
export function gameHud(ctx: Ctx, f: Fit, mode: Mode, left: HudItem[], right: HudItem[] = [], g: Ground = 'paper') {
  const small = mode === 'preview' || !!f.compact
  if (f.side) {
    // stacked readouts in the side margins, aligned to the playfield's edges
    const k = inkOn(g)
    const col = (items: HudItem[], x: number, align: 'left' | 'right') => {
      let y = f.oy + 14
      for (const it of items) {
        text(ctx, it.label, x, y, { size: 8.5, color: k.muted, tracking: 0.14, upper: true, align })
        text(ctx, it.value, x, y + 15, { size: 12, color: k.ink, weight: 500, tracking: 0.04, align })
        y += 36
      }
    }
    col(left, f.ox - 14, 'right')
    col(right, f.ox + f.lw * f.s + 14, 'left')
    return
  }
  const y = f.oy - (small ? 20 : 29)
  const o = { ground: g, size: small ? 10.5 : 13, gap: small ? 14 : 22 }
  if (left.length) hud(ctx, left, f.ox, y, o)
  if (right.length) hud(ctx, right, f.ox + f.lw * f.s, y, { ...o, align: 'right' })
}

/** Apply a Fit so you can draw in playfield units. Pair with ctx.restore(). */
export function enterFit(ctx: Ctx, f: Fit) {
  ctx.save()
  ctx.translate(f.ox, f.oy)
  ctx.scale(f.s, f.s)
}

/** Screen (CSS px) → playfield units. */
export const toField = (f: Fit, x: number, y: number) => ({ x: (x - f.ox) / f.s, y: (y - f.oy) / f.s })

/**
 * The shared game frame, drawn in CSS px around a Fit: hairline border, crop
 * marks just outside it, a tick ruler along the top, and a mono caption
 * (e.g. 'FIG. G.03 — AFTER PAC-MAN, 1980') under the bottom-left corner.
 */
export function gameFrame(ctx: Ctx, f: Fit, o: { ground?: Ground; caption?: string; ruler?: boolean } = {}) {
  const k = inkOn(o.ground ?? 'paper')
  const x = f.ox
  const y = f.oy
  const w = f.lw * f.s
  const h = f.lh * f.s
  ctx.lineWidth = 1
  ctx.strokeStyle = k.rule
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h))
  ctx.strokeStyle = k.ink2
  // compact frames keep the corner marks tight so the HUD above can't touch them
  const cm = f.compact ? 4 : 7
  cropMarks(ctx, x - cm, y - cm, w + cm * 2, h + cm * 2, f.compact ? 6 : 9)
  if (o.ruler !== false && w > 160 && !f.side) {
    ctx.strokeStyle = k.rule
    ticks(ctx, x, y - 1, x + w, y - 1, 40, -3, 5)
  }
  if (o.caption && h > 90 && !f.compact) text(ctx, o.caption, x, y + h + 19, { size: 9.5, color: k.muted, tracking: 0.14 })
}

export interface HudItem {
  label: string
  value: string
}

/**
 * A row of label/value readouts (mono label over a value), laid out from
 * (x, y) to the right — or right-aligned ending at x when align='right'.
 */
export function hud(ctx: Ctx, items: HudItem[], x: number, y: number, o: { ground?: Ground; align?: 'left' | 'right'; gap?: number; size?: number } = {}) {
  const k = inkOn(o.ground ?? 'paper')
  const size = o.size ?? 13
  const gap = o.gap ?? 22
  const widths = items.map((it) => {
    setFont(ctx, { size: 8.5, tracking: 0.14 })
    const a = ctx.measureText(it.label.toUpperCase()).width
    setFont(ctx, { size, weight: 500, tracking: 0.04 })
    const b = ctx.measureText(it.value).width
    return Math.max(a, b)
  })
  const total = widths.reduce((s, v) => s + v, 0) + gap * Math.max(0, items.length - 1)
  let cx = o.align === 'right' ? x - total : x
  items.forEach((it, i) => {
    text(ctx, it.label, cx, y, { size: 8.5, color: k.muted, tracking: 0.14, upper: true })
    text(ctx, it.value, cx, y + size + 3, { size, color: k.ink, weight: 500, tracking: 0.04 })
    cx += widths[i] + gap
  })
}

/** Zero-padded score. */
export const fmtScore = (n: number, digits = 6) => String(Math.max(0, Math.floor(n))).padStart(digits, '0')

/** Blink on/off at `hz`. */
export const blink = (t: number, hz = 1.4) => fract(t * hz) < 0.6

export interface CardOpts {
  ground?: Ground
  /** e.g. 'AFTER ASTEROIDS · ATARI, 1979' */
  kicker?: string
  /** big serif title */
  title: string
  /** italic second word/phrase in the accent colour, appended to the title */
  titleEm?: string
  accent?: string
  /** small lines under the title: controls, score… */
  lines?: string[]
  /** blinking call to action, e.g. 'PRESS ENTER · TAP TO START' */
  prompt?: string
  t: number
  /** 0–1 entrance */
  appear?: number
}

/**
 * The shared title / game-over card, centred in a rect: a paper (or night)
 * panel with crop marks, kicker, serif title, mono lines and a blinking
 * prompt. Use it for every game's title screen and game-over screen.
 */
export function card(ctx: Ctx, x: number, y: number, w: number, h: number, o: CardOpts) {
  const g = o.ground ?? 'paper'
  const k = inkOn(g)
  const appear = ease.outExpo(clamp(o.appear ?? 1))
  // fit the card to short frames too: shrink the title, then drop the small lines
  const scale = Math.min(1, w / 420, h / 330)
  const titleSize = Math.round(46 * scale + 8)
  const lineH = h < 260 ? 14 : 17
  let nLines = o.lines?.length ?? 0
  const base = (h < 260 ? 40 : 54) + titleSize + 18 + (o.prompt ? (h < 260 ? 26 : 34) : 0)
  while (nLines > 0 && base + nLines * lineH > h - 18) nLines--
  const lines = o.lines?.slice(0, nLines)
  const ph = base + nLines * lineH
  const pw = Math.min(w - 24, Math.max(250, 380 * scale + 40))
  const px = x + (w - pw) / 2
  const py = y + (h - ph) / 2 + (1 - appear) * 14
  ctx.save()
  ctx.globalAlpha = appear
  ctx.fillStyle = g === 'paper' ? 'rgba(243,246,242,0.94)' : 'rgba(11,29,36,0.9)'
  ctx.fillRect(px, py, pw, ph)
  ctx.lineWidth = 1
  ctx.strokeStyle = k.ink
  ctx.strokeRect(Math.round(px) + 0.5, Math.round(py) + 0.5, Math.round(pw), Math.round(ph))
  ctx.strokeStyle = k.ink2
  cropMarks(ctx, px - 6, py - 6, pw + 12, ph + 12, 8)
  const cx = px + pw / 2
  let cy = py + (h < 260 ? 22 : 30)
  if (o.kicker) text(ctx, o.kicker, cx, cy, { size: 9, color: k.muted, align: 'center', tracking: 0.16, upper: true })
  cy += titleSize + 10
  setFont(ctx, { font: 'serif', size: titleSize })
  const tw = ctx.measureText(o.title).width
  setFont(ctx, { font: 'serif', size: titleSize, italic: true })
  const ew = o.titleEm ? ctx.measureText(' ' + o.titleEm).width : 0
  const tx = cx - (tw + ew) / 2
  text(ctx, o.title, tx, cy, { font: 'serif', size: titleSize, color: k.ink })
  if (o.titleEm) text(ctx, ' ' + o.titleEm, tx + tw, cy, { font: 'serif', size: titleSize, italic: true, color: o.accent ?? (g === 'paper' ? C.moss : C.sage) })
  cy += 20
  lines?.forEach((l) => {
    cy += lineH
    text(ctx, l, cx, cy, { size: 10, color: k.ink2, align: 'center', tracking: 0.1 })
  })
  if (o.prompt) {
    cy += h < 260 ? 22 : 30
    if (blink(o.t)) text(ctx, o.prompt, cx, cy, { size: 10.5, color: o.accent ?? (g === 'paper' ? C.moss : C.sage), align: 'center', tracking: 0.16, upper: true })
  }
  ctx.restore()
}

/** High score persistence via the piece store. */
export function highScore(store: PieceStore) {
  const read = () => {
    const v = Number(store.get('hi'))
    return Number.isFinite(v) ? v : 0
  }
  return {
    get: read,
    /** Saves if higher; returns true when it's a new record. */
    submit(score: number) {
      if (score > read()) {
        store.set('hi', String(Math.floor(score)))
        return true
      }
      return false
    },
  }
}

/* ------------------------------------------------------------------ input */

/** Held + just-pressed keyboard state. Call key() from PieceInstance.key and endFrame() after each frame. */
export class Keys {
  private held = new Set<string>()
  private hits = new Set<string>()
  /** Returns true if the code is one of `watch` (so you can return it from PieceInstance.key). */
  key(code: string, down: boolean, watch?: readonly string[]) {
    if (down) {
      if (!this.held.has(code)) this.hits.add(code)
      this.held.add(code)
    } else this.held.delete(code)
    return watch ? watch.includes(code) : true
  }
  /** Any of these codes currently held. */
  down(...codes: string[]) {
    return codes.some((c) => this.held.has(c))
  }
  /** Any of these codes pressed since the last endFrame(). */
  hit(...codes: string[]) {
    return codes.some((c) => this.hits.has(c))
  }
  endFrame() {
    this.hits.clear()
  }
  reset() {
    this.held.clear()
    this.hits.clear()
  }
}

export type Dir = 'up' | 'down' | 'left' | 'right'

/**
 * Pointer/touch state for games: position, pressed, taps and swipes.
 * Call pointer() from PieceInstance.pointer and endFrame() after each frame.
 */
export class Touch {
  x = 0
  y = 0
  pressed = false
  /** a quick press-and-release without much movement, since last endFrame */
  tapped = false
  /** a swipe direction completed (or crossed while held) since last endFrame */
  swipe: Dir | null = null
  /** where the current press started */
  sx = 0
  sy = 0
  private st = 0
  private swiped = false
  private threshold: number
  constructor(threshold = 26) {
    this.threshold = threshold
  }
  pointer(p: PointerInfo) {
    this.x = p.x
    this.y = p.y
    if (p.type === 'down') {
      this.pressed = true
      this.sx = p.x
      this.sy = p.y
      this.st = performance.now()
      this.swiped = false
    } else if (p.type === 'move' && this.pressed && !this.swiped) {
      const dx = p.x - this.sx
      const dy = p.y - this.sy
      if (Math.hypot(dx, dy) > this.threshold) {
        this.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
        this.swiped = true
      }
    } else if (p.type === 'up' || p.type === 'leave') {
      if (this.pressed && !this.swiped && performance.now() - this.st < 320 && Math.hypot(p.x - this.sx, p.y - this.sy) < 14) this.tapped = true
      this.pressed = false
    }
  }
  endFrame() {
    this.tapped = false
    this.swipe = null
  }
}

/** Arrow keys + WASD → direction, if one was pressed this frame. */
export function keyDir(keys: Keys): Dir | null {
  if (keys.hit('ArrowUp', 'KeyW')) return 'up'
  if (keys.hit('ArrowDown', 'KeyS')) return 'down'
  if (keys.hit('ArrowLeft', 'KeyA')) return 'left'
  if (keys.hit('ArrowRight', 'KeyD')) return 'right'
  return null
}

export const DIRV: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
export const START_KEYS = ['Enter', 'Space', 'NumpadEnter'] as const
