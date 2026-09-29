import { clamp, hash, hexToRgb, lerp, rgba, TAU, type RGB } from './math'
import type { Env } from './scene'
import { BEAT, NEON } from './timeline'

/*
 * The reel's drawing kit: kinetic type, vector shapes, deterministic
 * particles and impulse envelopes. The glow comes from the engine's bloom
 * pass, so everything here draws crisp and bright.
 */

export const DISPLAY = 'Unbounded, "Arial Black", "Segoe UI Black", system-ui, sans-serif'
export const SERIF = '"Instrument Serif", Georgia, serif'
export const MONO = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace'
export const SANS = 'Geist, system-ui, -apple-system, "Segoe UI", sans-serif'

export const font = (size: number, weight = 800, family = DISPLAY, style = '') =>
  `${style ? style + ' ' : ''}${weight} ${Math.max(1, size).toFixed(1)}px ${family}`

export const beats = (t: number) => t / BEAT

/** Font size at which `text` spans `width` px. */
export function fit(g: CanvasRenderingContext2D, text: string, width: number, weight = 800, family = DISPLAY, style = '') {
  g.font = font(100, weight, family, style)
  const w = g.measureText(text).width || 1
  return (100 * width) / w
}

/** Exponential decay impulse fired at `at` (seconds). */
export const decay = (t: number, at: number, amp: number, k = 9) => (t < at ? 0 : amp * Math.exp(-k * (t - at)))

/** Sum of impulses at a list of beat times (local beats). */
export function hits(lb: number, at: number[], amp: number, k = 9) {
  let s = 0
  for (const b of at) if (lb >= b) s += amp * Math.exp(-k * (lb - b) * BEAT)
  return s
}

export const RGB_CACHE = new Map<string, RGB>()
export function rgb(hex: string): RGB {
  let c = RGB_CACHE.get(hex)
  if (!c) {
    c = hexToRgb(hex)
    RGB_CACHE.set(hex, c)
  }
  return c
}
export const col = (hex: string, a = 1) => rgba(rgb(hex), a)

/* ------------------------------------------------------------ kinetic type */

export interface LetterXf {
  x?: number
  y?: number
  sx?: number
  sy?: number
  rot?: number
  a?: number
}

export interface KineticOpts {
  size: number
  weight?: number
  family?: string
  style?: string
  align?: 'left' | 'center' | 'right'
  /** extra letter spacing, in em */
  tracking?: number
  fill?: string | CanvasGradient | null
  stroke?: string | null
  lineWidth?: number
  /** RGB split distance in px (0 = off) */
  split?: number
  alpha?: number
  letter?: (i: number, n: number, ch: string) => LetterXf
}

/** Draw text letter by letter with per-letter transforms. Returns letter centres. */
export function kinetic(g: CanvasRenderingContext2D, text: string, x: number, y: number, o: KineticOpts) {
  const chars = [...text]
  g.font = font(o.size, o.weight ?? 800, o.family ?? DISPLAY, o.style)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const track = (o.tracking ?? 0) * o.size
  const ws = chars.map((c) => g.measureText(c).width)
  const total = ws.reduce((a, b) => a + b, 0) + track * (chars.length - 1)
  let pos = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2
  const centers: number[] = []
  for (let i = 0; i < chars.length; i++) {
    centers.push(pos + ws[i] / 2)
    pos += ws[i] + track
  }
  const split = o.split ?? 0
  const passes: [number, string | CanvasGradient | null][] =
    split > 0.4
      ? [
          [-split, '#FF2E63'],
          [0, '#2EFF8E'],
          [split, '#2E6BFF'],
        ]
      : [[0, o.fill ?? null]]
  const prevOp = g.globalCompositeOperation
  const alpha = o.alpha ?? 1
  for (const [off, fill] of passes) {
    if (split > 0.4) g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === ' ') continue
      const xf = o.letter?.(i, chars.length, chars[i]) ?? {}
      const a = alpha * (xf.a ?? 1)
      if (a <= 0.003) continue
      g.save()
      g.globalAlpha = a
      g.translate(centers[i] + (xf.x ?? 0) + off, y + (xf.y ?? 0))
      if (xf.rot) g.rotate(xf.rot)
      if (xf.sx !== undefined || xf.sy !== undefined) g.scale(xf.sx ?? 1, xf.sy ?? 1)
      // outlined type splits its stroke; filled type splits its fill
      const splitStroke = split > 0.4 && !!o.stroke
      if (fill && !splitStroke) {
        g.fillStyle = fill
        g.fillText(chars[i], 0, 0)
      }
      if (o.stroke) {
        g.strokeStyle = splitStroke && fill ? fill : o.stroke
        g.lineWidth = o.lineWidth ?? 2
        g.lineJoin = 'round'
        g.strokeText(chars[i], 0, 0)
      }
      g.restore()
    }
  }
  g.globalCompositeOperation = prevOp
  return { centers, width: total }
}

/* ------------------------------------------------------------ shapes */

export function polyPath(g: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, rot = 0) {
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU - Math.PI / 2
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
}

export function ring(g: CanvasRenderingContext2D, x: number, y: number, r: number, width: number, color: string) {
  if (r <= 0) return
  g.strokeStyle = color
  g.lineWidth = width
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.stroke()
}

export function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  if (r <= 0) return
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fill()
}

/** Soft radial glow (for spots the bloom alone doesn't sell). */
export function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string, a: number) {
  if (a <= 0.003 || r <= 0) return
  const c = rgb(hex)
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, rgba(c, a))
  gr.addColorStop(0.35, rgba(c, a * 0.35))
  gr.addColorStop(1, rgba(c, 0))
  g.fillStyle = gr
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

/* ------------------------------------------------------------ particles */

export interface BurstOpts {
  n: number
  seed: number
  speed: number
  life: number
  size?: number
  color: string | ((i: number) => string)
  drag?: number
  gravity?: number
  /** radians; default full circle */
  spread?: number
  dir?: number
  kind?: 'dot' | 'streak' | 'shard'
}

/** Deterministic particle burst, `dt` seconds after it fired. */
export function burst(g: CanvasRenderingContext2D, x: number, y: number, dt: number, o: BurstOpts) {
  if (dt < 0 || dt > o.life) return
  const drag = o.drag ?? 4
  const life = dt / o.life
  const spread = o.spread ?? TAU
  const dir = o.dir ?? 0
  const kind = o.kind ?? 'dot'
  const fall = ((o.gravity ?? 0) * dt * dt) / 2
  for (let i = 0; i < o.n; i++) {
    const h1 = hash(o.seed * 13.1 + i * 7.3)
    const h2 = hash(o.seed * 5.7 + i * 3.9)
    const a = dir + (spread >= TAU ? (i / o.n) * TAU + h1 * 0.5 : (h1 - 0.5) * spread)
    const sp = o.speed * (0.45 + 0.9 * h2)
    const d = (sp * (1 - Math.exp(-drag * dt))) / drag
    const px = x + Math.cos(a) * d
    const py = y + Math.sin(a) * d + fall
    const c = typeof o.color === 'function' ? o.color(i) : o.color
    const s = (o.size ?? 3) * (1 - life * 0.7) * (0.6 + h1 * 0.8)
    g.globalAlpha = clamp(1 - life) * (0.7 + 0.3 * h2)
    if (kind === 'dot') {
      g.fillStyle = c
      g.fillRect(px - s / 2, py - s / 2, s, s)
    } else if (kind === 'streak') {
      const v = sp * Math.exp(-drag * dt)
      const len = Math.min(60, v * 0.05) + s
      g.strokeStyle = c
      g.lineWidth = Math.max(1, s * 0.5)
      g.beginPath()
      g.moveTo(px, py)
      g.lineTo(px - Math.cos(a) * len, py - Math.sin(a) * len)
      g.stroke()
    } else {
      g.save()
      g.translate(px, py)
      g.rotate(h1 * TAU + dt * (6 + h2 * 10))
      g.fillStyle = c
      g.beginPath()
      g.moveTo(0, -s)
      g.lineTo(s * 0.6, s * 0.7)
      g.lineTo(-s * 0.6, s * 0.5)
      g.closePath()
      g.fill()
      g.restore()
    }
  }
  g.globalAlpha = 1
}

/* ------------------------------------------------------------ slates */

/** Small chapter slate: "01 — PROGRAMMING", typed in with a rule. */
export function slate(g: CanvasRenderingContext2D, env: Env, lb: number, num: string, label: string, color: string, len = 8) {
  const a = clamp(lb / 0.25) * (1 - clamp((lb - (len - 1.2)) / 0.8))
  if (a <= 0.003) return
  const x = Math.max(24, env.W * 0.04)
  const y = env.top + 26
  g.font = font(11, 500, MONO)
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  const text = `${num} — ${label.toUpperCase()}`
  const shown = text.slice(0, Math.floor(clamp(lb / 0.6) * text.length))
  g.globalAlpha = a
  g.fillStyle = color
  g.fillRect(x, y - 1, lerp(0, 36, clamp(lb / 0.4)), 2)
  g.fillStyle = NEON.white
  g.fillText(shown, x + 48, y)
  g.globalAlpha = 1
}

/** Giant outlined section word behind the action. */
export function titleCard(g: CanvasRenderingContext2D, env: Env, lb: number, word: string, color: string, len = 8) {
  const a = clamp(lb / 0.15) * (1 - clamp((lb - (len - 1.2)) / 1))
  if (a <= 0.003) return
  const size = (env.portrait ? 300 : 380) * env.U
  const s = lerp(1.18, 1, 1 - Math.exp(-lb * 0.9))
  g.save()
  g.translate(env.cx, env.cy)
  g.scale(s, s)
  kinetic(g, word, 0, 0, {
    size,
    weight: 900,
    stroke: col(color, 0.22 * a),
    lineWidth: 1.5,
    fill: null,
    tracking: 0.02,
  })
  g.restore()
}
