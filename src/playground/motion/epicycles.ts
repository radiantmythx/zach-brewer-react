/*
 * EPICYCLES — a Fourier series drawn by hand.
 *
 * Each figure is one closed tour (separate strokes joined by pen-up
 * connectors), resampled by arc length and taken through a discrete Fourier
 * transform. Its terms, sorted by amplitude, become a chain of rotating
 * hairline circles whose tip carries the pen. The series starts with a single
 * term — a circle — and doubles: 1, 2, 4 … 128, each pass a visibly better
 * likeness, then holds the finished drawing and moves on to the next figure:
 * the ZB monogram, a treble clef, a heron, and a one-line profile.
 *
 * In the viewer the count is also in your hands: drag (anywhere, or along
 * the slider under the stepper) to scrub the series from one term to 128 and
 * watch the drawing sharpen or melt; tap to move on to the next figure.
 */

import { LOGO } from '../../film/logo'
import { C, TAU, clamp, cropMarks, ease, ground, hud, inkOn, lerp, rgba, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. M.10'
const STAGES = [1, 2, 4, 8, 16, 32, 64, 128]
/** seconds per traced revolution, per stage */
const DUR = [1.3, 1.3, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4]
/** the new circles grow in before each pass */
const GROW = 0.4
const HOLD = 3.2
const OUT = 1.1
/** samples along the tour (DFT length) and along each drawn approximation */
const M = 1024
const MC = 768
const KMAX = 160
/** the ghost demonstration of the slider, full mode only, until the viewer acts */
const GHOST_FROM = 1.4
const GHOST_TO = 6.2

type Pt = [number, number]
interface Stroke {
  pts: Pt[]
}
interface Figure {
  name: string
  note: string
  build: () => Stroke[]
}

/* ------------------------------------------------------------ figures */

/** Catmull–Rom through control points (closed or open), sampled densely. */
function spline(ctrl: Pt[], closed = false, per = 14): Pt[] {
  const out: Pt[] = []
  const n = ctrl.length
  const get = (i: number) => (closed ? ctrl[((i % n) + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))])
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    for (let k = 0; k < per; k++) {
      const t = k / per
      const t2 = t * t
      const t3 = t2 * t
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  out.push(closed ? [...ctrl[0]] as Pt : [...ctrl[n - 1]] as Pt)
  return out
}

/** Sample an SVG path string with a detached SVGPathElement (falls back to a tiny parser). */
function samplePath(d: string, step = 0.5): Pt[] {
  try {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    el.setAttribute('d', d)
    const L = el.getTotalLength()
    if (L > 0) {
      const n = Math.max(2, Math.ceil(L / step))
      const pts: Pt[] = []
      for (let i = 0; i <= n; i++) {
        const p = el.getPointAtLength((L * i) / n)
        pts.push([p.x, p.y])
      }
      return pts
    }
  } catch {
    /* fall through */
  }
  return parsePath(d)
}

/** Minimal M/L/H/V/A/Z parser (absolute only), for environments without SVG geometry. */
function parsePath(d: string): Pt[] {
  const tok = d.match(/[MLHVAZ]|-?\d*\.?\d+/gi) ?? []
  const pts: Pt[] = []
  let i = 0
  let cmd = 'M'
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  const num = () => Number(tok[i++])
  while (i < tok.length) {
    if (/[A-Z]/i.test(tok[i])) cmd = tok[i++].toUpperCase()
    if (cmd === 'Z') {
      pts.push([sx, sy])
      continue
    }
    if (cmd === 'M') {
      x = num()
      y = num()
      sx = x
      sy = y
      pts.push([x, y])
      cmd = 'L'
    } else if (cmd === 'L') {
      x = num()
      y = num()
      pts.push([x, y])
    } else if (cmd === 'H') {
      x = num()
      pts.push([x, y])
    } else if (cmd === 'V') {
      y = num()
      pts.push([x, y])
    } else if (cmd === 'A') {
      const r = num()
      num()
      num()
      num()
      num()
      const ex = num()
      const ey = num()
      // semicircle bulging to the right (the monogram's bowls)
      const cx = (x + ex) / 2
      const cy = (y + ey) / 2
      const a0 = Math.atan2(y - cy, x - cx)
      for (let k = 1; k <= 16; k++) {
        const a = a0 + (Math.PI * k) / 16
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
      }
      x = ex
      y = ey
    } else i++
  }
  return pts
}

const subpaths = (d: string) => d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean)

const FIGURES: Figure[] = [
  {
    name: 'ZB monogram',
    note: 'SVG PATHS · 7 STROKES',
    build() {
      const hex = subpaths(LOGO.hex)
      const bars = subpaths(LOGO.bars)
      const diag = subpaths(LOGO.diag)
      const bowls = subpaths(LOGO.bowls)
      // one tour: the hexagon, the Z in a single zig-zag, then the B from the foot of its stem
      return [
        { pts: samplePath(hex[0]) },
        { pts: samplePath(bars[0]) },
        { pts: samplePath(diag[0]) },
        { pts: samplePath(bars[1]) },
        { pts: samplePath(bowls[0]).reverse() },
        { pts: samplePath(bowls[1]) },
        { pts: samplePath(bowls[2]) },
      ]
    },
  },
  {
    name: 'Treble clef',
    note: 'CATMULL–ROM · ONE STROKE',
    build() {
      // drawn on a 20-unit staff (G line at y = 110): spiral out, up through the loop, down the stem, into the hook
      const c: Pt[] = [
        [52, 110], [59.5, 104.5], [58, 94.5], [48, 89.5], [37, 93], [29.5, 104.5], [29.5, 119.5], [38, 132], [52, 138], [67, 135.5],
        [78, 125.5], [83, 110.5], [80.5, 93], [72, 79.5], [62, 69], [54, 59], [48.5, 47], [46.5, 35], [48, 24], [52, 15], [57.5, 9.5],
        [62.5, 11.5], [64, 20], [62, 32], [59, 45], [57, 62], [56, 82], [55, 102], [54, 122], [53, 140], [51, 152], [46, 159],
        [39, 158], [35, 152], [37, 146], [43, 145], [45, 150],
      ]
      return [{ pts: spline(c, false, 16) }]
    },
  },
  {
    name: 'Grey heron',
    note: 'ARDEA CINEREA · OUTLINE',
    build() {
      const c: Pt[] = [
        [6, 35], [6, 35], [20, 31.5], [31, 28], [37, 25], [44, 24.5], [56, 27], [56, 27], [45, 30], [45.5, 37], [41, 47], [38.5, 57],
        [41.5, 66.5], [50, 72], [61, 72.5], [73, 77], [83, 85], [90, 96], [94, 105], [94, 105], [86, 103.5], [76, 102.5], [66, 104.5],
        [63, 112], [62, 126], [61, 140], [61, 140], [52, 144], [52, 144], [61.5, 143], [66, 146], [66, 146], [63.5, 140], [64, 126],
        [65, 112], [65.5, 106], [57, 104], [49, 99], [43.5, 90.5], [39, 81], [34.5, 72], [31.5, 62], [32.5, 52], [35.5, 44.5],
        [36, 39], [31, 37], [20, 36.5],
      ]
      return [{ pts: spline(c, true, 12) }]
    },
  },
  {
    name: 'Profile',
    note: 'ONE LINE · NO LIFT',
    build() {
      // nape → crown → brow → eye → nose → lips → chin → jaw → ear → throat, without lifting the pen
      const c: Pt[] = [
        [34, 132], [33, 112], [28, 98], [20, 80], [16, 60], [18, 40], [26, 24], [38, 12], [52, 7], [64, 9], [73, 18], [77, 30],
        [78, 40], [78.5, 46], [75, 48.5], [71, 50.5], [75.5, 51.5], [79, 51], [80.5, 57], [84, 66], [89, 75], [89, 75], [84.5, 78.5],
        [81, 80], [84, 84], [82, 87], [84.5, 90.5], [80, 94], [82, 100], [79, 107], [72, 110], [62, 108], [54, 102], [50, 94],
        [49, 86], [47, 78], [43, 72.5], [39.5, 75], [39.5, 83], [43, 89], [47.5, 91], [52, 102], [59, 113], [62.5, 122], [64, 134],
      ]
      return [{ pts: spline(c, false, 12) }]
    },
  },
]

/* ------------------------------------------------------------ the transform */

interface Term {
  k: number
  re: number
  im: number
  amp: number
  phase: number
}

interface Built {
  /** target, resampled, normalised: x,y interleaved */
  target: Float32Array
  pen: Uint8Array
  c0: [number, number]
  terms: Term[]
  /** |c_k| by k + KMAX for the spectrum */
  spectrum: Float32Array
  rank: Int16Array
  curves: Float32Array[]
  err: number[]
}

function buildFigure(fig: Figure): Built {
  const strokes = fig.build()
  // join strokes into one closed tour with pen-up connectors
  const tour: Pt[] = []
  const flag: number[] = []
  const push = (p: Pt, f: number) => {
    tour.push(p)
    flag.push(f)
  }
  for (const s of strokes) {
    s.pts.forEach((p, i) => push(p, i === 0 && tour.length ? 0 : 1))
  }
  push(tour[0], 0)
  // arc length
  const L = new Float64Array(tour.length)
  for (let i = 1; i < tour.length; i++) L[i] = L[i - 1] + Math.hypot(tour[i][0] - tour[i - 1][0], tour[i][1] - tour[i - 1][1])
  const total = L[tour.length - 1] || 1
  // bounds → normalise into [-1, 1] by the larger half-extent
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of tour) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const half = Math.max(x1 - x0, y1 - y0) / 2 || 1
  const target = new Float32Array(M * 2)
  const pen = new Uint8Array(M)
  let j = 1
  for (let n = 0; n < M; n++) {
    const d = (total * n) / M
    while (j < tour.length - 1 && L[j] < d) j++
    const seg = L[j] - L[j - 1] || 1
    const u = (d - L[j - 1]) / seg
    target[n * 2] = (lerp(tour[j - 1][0], tour[j][0], u) - mx) / half
    target[n * 2 + 1] = (lerp(tour[j - 1][1], tour[j][1], u) - my) / half
    pen[n] = flag[j]
  }
  // DFT for k in [-KMAX, KMAX]
  const terms: Term[] = []
  const spectrum = new Float32Array(KMAX * 2 + 1)
  let c0: [number, number] = [0, 0]
  for (let k = -KMAX; k <= KMAX; k++) {
    let re = 0
    let im = 0
    for (let n = 0; n < M; n++) {
      const a = (-TAU * k * n) / M
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const x = target[n * 2]
      const y = target[n * 2 + 1]
      re += x * ca - y * sa
      im += x * sa + y * ca
    }
    re /= M
    im /= M
    const amp = Math.hypot(re, im)
    spectrum[k + KMAX] = amp
    if (k === 0) c0 = [re, im]
    else terms.push({ k, re, im, amp, phase: Math.atan2(im, re) })
  }
  terms.sort((a, b) => b.amp - a.amp)
  terms.length = STAGES[STAGES.length - 1]
  const rank = new Int16Array(KMAX * 2 + 1).fill(-1)
  terms.forEach((t, i) => (rank[t.k + KMAX] = i))
  // the approximation for each stage, and its error
  const curves: Float32Array[] = []
  const err: number[] = []
  for (const N of STAGES) {
    const cv = new Float32Array(MC * 2)
    let e2 = 0
    for (let n = 0; n < MC; n++) {
      let x = c0[0]
      let y = c0[1]
      const s = n / MC
      for (let q = 0; q < N; q++) {
        const t = terms[q]
        const a = t.phase + TAU * t.k * s
        x += t.amp * Math.cos(a)
        y += t.amp * Math.sin(a)
      }
      cv[n * 2] = x
      cv[n * 2 + 1] = y
      const m = Math.floor((n * M) / MC)
      e2 += (x - target[m * 2]) ** 2 + (y - target[m * 2 + 1]) ** 2
    }
    curves.push(cv)
    err.push(Math.sqrt(e2 / MC) / 2)
  }
  return { target, pen, c0, terms, spectrum, rank, curves, err }
}

/* ------------------------------------------------------------ timeline */

const STAGE_START: number[] = []
let acc = 0
for (let i = 0; i < STAGES.length; i++) {
  STAGE_START.push(acc)
  acc += GROW + DUR[i]
}
const TRACE_END = acc
const FIG_LEN = TRACE_END + HOLD + OUT

const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2]


/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces (on the Playground page they are
 * already loaded and this resolves at once). Never blocks for long.
 */
if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('italic 400 64px "Instrument Serif"'), document.fonts.load('500 12px "Geist Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const k = inkOn('night')
  const cache = new Map<number, Built>()
  const get = (i: number) => {
    let b = cache.get(i)
    if (!b) {
      b = buildFigure(FIGURES[i])
      cache.set(i, b)
    }
    return b
  }
  get(0)

  let w = 1
  let h = 1
  let portrait = false
  let m = 20
  // drawing
  let cx = 0
  let cy = 0
  let S = 100
  // info column
  let ix = 0
  let iy = 0
  let iw = 300
  let lastStage = -1
  // ?fig=n starts on figure n (a testing hook for the solo route)
  const startFig = Math.max(0, Math.min(FIGURES.length - 1, Number(env.params.get('fig')) || 0))
  // the timeline: a figure and the time into it; or, by hand, a count of terms u = log2 N
  let fig = startFig
  let ft = 0
  let manual = false
  let mU = 0
  let mClock = 0
  let idle = 0
  // ?terms=n opens by hand at n terms (a testing hook for the solo route)
  if (Number(env.params.get('terms')) > 0) {
    manual = true
    mU = Math.log2(Math.min(128, Number(env.params.get('terms'))))
    idle = -1e9
  }

  function layout() {
    portrait = h > w * 1.1
    m = preview || h < 380 ? 12 : Math.max(18, Math.min(w, h) * 0.035)
    if (portrait) {
      const R = Math.min(w / 2 - m - 8, h * 0.26)
      cx = w / 2
      cy = m + 26 + R
      S = R * 0.8
      ix = m + 6
      iy = cy + R + 52
      iw = w - 2 * m - 12
    } else {
      const short = !preview && h < 380
      iw = Math.min(w * (preview ? 0.36 : short ? 0.34 : 0.32), 400)
      ix = m + (preview ? 6 : short ? 8 : 14)
      iy = m + (preview ? 16 : short ? 12 : 26)
      const left = ix + iw + (preview ? 6 : short ? 12 : 24)
      const R = Math.min((w - left - m) / 2, (h - 2 * m) / 2 - 6)
      cx = left + (w - left - m) / 2
      cy = h / 2 + (preview ? 2 : 6)
      S = R * 0.82
    }
  }

  const X = (v: number) => cx + v * S
  const Y = (v: number) => cy + v * S

  /** stroke a range [a, b) of a closed curve (indices into MC samples), split into pen/connector paths */
  function strokeCurve(cv: Float32Array, pen: Uint8Array | null, a: number, b: number, penStyle: string, gapStyle: string, width: number) {
    if (b <= a) return
    for (let pass = 0; pass < (pen ? 2 : 1); pass++) {
      const want = pass === 0 ? 1 : 0
      ctx.strokeStyle = want ? penStyle : gapStyle
      ctx.lineWidth = want ? width : 1
      if (!want) ctx.setLineDash([2, 4])
      ctx.beginPath()
      let down = false
      const end = Math.floor(b)
      for (let n = Math.floor(a); n <= end; n++) {
        const i = n % MC
        const f = pen ? pen[Math.floor((i * M) / MC)] : 1
        const x = X(cv[i * 2])
        const y = Y(cv[i * 2 + 1])
        if (f === want || !pen) {
          if (!down) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          down = true
        } else if (down) {
          ctx.lineTo(x, y)
          down = false
        }
      }
      // the exact fractional tip
      if (b < end + 1 && down) {
        const i0 = end % MC
        const i1 = (end + 1) % MC
        const u = b - end
        ctx.lineTo(X(lerp(cv[i0 * 2], cv[i1 * 2], u)), Y(lerp(cv[i0 * 2 + 1], cv[i1 * 2 + 1], u)))
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  function drawChain(B: Built, N: number, grow: number, s: number, alpha: number) {
    if (alpha <= 0.01) return
    let x = B.c0[0]
    let y = B.c0[1]
    const n = Math.min(N, B.terms.length)
    const prevN = N > 1 ? N / 2 : 0
    // circles in three weights
    const big: number[] = []
    const mid: number[] = []
    const small: number[] = []
    const joints: number[] = [x, y]
    for (let q = 0; q < n; q++) {
      const t = B.terms[q]
      const g = q < prevN ? 1 : grow
      const r = t.amp * g
      const rp = r * S
      ;(rp > 26 ? big : rp > 6 ? mid : small).push(x, y, rp)
      const a = t.phase + TAU * t.k * s
      x += r * Math.cos(a)
      y += r * Math.sin(a)
      joints.push(x, y)
    }
    ctx.lineWidth = 1
    const buckets: [number[], number][] = [
      [big, 0.34],
      [mid, 0.22],
      [small, 0.13],
    ]
    for (const [list, a] of buckets) {
      if (!list.length) continue
      ctx.strokeStyle = rgba(C.paper, a * alpha)
      ctx.beginPath()
      for (let i = 0; i < list.length; i += 3) {
        const px = X(list[i])
        const py = Y(list[i + 1])
        ctx.moveTo(px + list[i + 2], py)
        ctx.arc(px, py, list[i + 2], 0, TAU)
      }
      ctx.stroke()
    }
    // arms
    ctx.strokeStyle = rgba(C.paper, 0.72 * alpha)
    ctx.beginPath()
    for (let i = 0; i < joints.length; i += 2) {
      const px = X(joints[i])
      const py = Y(joints[i + 1])
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    ctx.stroke()
    // joints on the larger links
    ctx.fillStyle = rgba(C.paper, 0.8 * alpha)
    for (let i = 2; i < Math.min(joints.length, 2 * 12); i += 2) {
      ctx.fillRect(X(joints[i]) - 1, Y(joints[i + 1]) - 1, 2, 2)
    }
    // anchor
    ctx.strokeStyle = rgba(C.paper, 0.5 * alpha)
    const ax = X(B.c0[0])
    const ay = Y(B.c0[1])
    ctx.beginPath()
    ctx.moveTo(ax - 6, ay)
    ctx.lineTo(ax + 6, ay)
    ctx.moveTo(ax, ay - 6)
    ctx.lineTo(ax, ay + 6)
    ctx.stroke()
    // the pen
    const tx = X(x)
    const ty = Y(y)
    ctx.strokeStyle = rgba(C.sky, alpha)
    ctx.beginPath()
    ctx.arc(tx, ty, 4, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = rgba(C.sky, alpha)
    ctx.beginPath()
    ctx.arc(tx, ty, 1.6, 0, TAU)
    ctx.fill()
  }

  function bigNumber(prev: number, cur: number, p: number, x: number, base: number, size: number) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x - 4, base - size * 0.92, size * 3, size * 1.08)
    ctx.clip()
    const e = ease.outCubic(clamp(p))
    if (p < 1 && prev !== cur) text(ctx, String(prev), x, base - e * size * 0.95, { font: 'serif', size, color: k.ink, alpha: 1 - e })
    text(ctx, String(cur), x, base + (1 - e) * size * 0.95, { font: 'serif', size, color: k.ink })
    ctx.restore()
    setFont(ctx, { font: 'serif', size })
    return ctx.measureText(String(cur)).width
  }

  /* ------------------------------------------------------------ the viewer's hand */

  /** an approximation with any number of terms (the slider is continuous), cached */
  const manualCache = new Map<number, { cv: Float32Array; err: number }>()
  function curveFor(fi: number, B: Built, N: number) {
    const key = fi * 1000 + N
    let c = manualCache.get(key)
    if (!c) {
      const cv = new Float32Array(MC * 2)
      let e2 = 0
      for (let n = 0; n < MC; n++) {
        let x = B.c0[0]
        let y = B.c0[1]
        const s = n / MC
        for (let q = 0; q < N; q++) {
          const t = B.terms[q]
          const a = t.phase + TAU * t.k * s
          x += t.amp * Math.cos(a)
          y += t.amp * Math.sin(a)
        }
        cv[n * 2] = x
        cv[n * 2 + 1] = y
        const mm = Math.floor((n * M) / MC)
        e2 += (x - B.target[mm * 2]) ** 2 + (y - B.target[mm * 2 + 1]) ** 2
      }
      c = { cv, err: Math.sqrt(e2 / MC) / 2 }
      manualCache.set(key, c)
    }
    return c
  }

  // the slider under the stepper: u = log2(N) in [0, 7], laid out by drawInfo each frame
  const track = { x0: 0, x1: 1, y: 0, shown: false }
  const uToX = (u: number) => lerp(track.x0, track.x1, clamp(u / 7))
  const xToU = (x: number) => clamp(((x - track.x0) / Math.max(1, track.x1 - track.x0)) * 7, 0, 7)
  const onTrack = (x: number, y: number, touch: boolean) => track.shown && x > track.x0 - 16 && x < track.x1 + 16 && Math.abs(y - track.y) < (touch ? 22 : 13)

  let drag: { x0: number; u0: number; ms: number; slider: boolean; moved: boolean; touch: boolean } | null = null
  let hoverTrack = false
  let acted = false
  const IDLE = 6

  function nextFigure(step = 1) {
    fig = (fig + step + FIGURES.length) % FIGURES.length
    ft = 0
    manual = false
    acted = true
    get(fig)
  }

  function enterManual(u: number) {
    if (!manual) mClock = 0
    manual = true
    mU = clamp(u, 0, 7)
    idle = 0
    acted = true
  }

  /** u for the current auto stage, gliding as the new circles grow in */
  function autoU() {
    let stage = STAGES.length - 1
    for (let i = 0; i < STAGES.length; i++) if (ft >= STAGE_START[i]) stage = i
    const grow = clamp((ft - STAGE_START[stage]) / GROW)
    return stage > 0 && ft < TRACE_END ? stage - 1 + ease.inOutCubic(grow) : stage
  }

  /* ------------------------------------------------------------ info column */

  function drawInfo(B: Built, fi: number, stage: number, sp: number, grow: number, fadeIn: number, N: number, err: number, u: number, ghost: number) {
    const prevN = stage > 0 ? STAGES[stage - 1] : 1
    const short = !preview && h < 380
    const tiny = !preview && h < 260
    const inline = !portrait && (preview || short)
    // kicker at the head of the column; the block below is centred in what's left
    text(ctx, `${FIG} — EPICYCLES`, ix, iy, { size: preview || short ? 8.5 : 9.5, color: k.muted, tracking: 0.14 })
    const fs = portrait ? 18 : Math.min(26, Math.max(18, w * 0.016))
    const showFormula = !preview && !short
    const showNote = !preview && !short
    let size = preview ? Math.min(64, h * 0.2) : portrait ? Math.min(92, h * 0.11) : short ? h * 0.24 : Math.min(150, Math.max(80, h * 0.17))
    size = Math.min(size, (iw - 46) / 1.55)
    const chartH = preview ? Math.min(38, h * 0.12) : portrait ? 56 : short ? (h >= 300 ? 34 : 0) : Math.min(96, Math.max(54, h * 0.11))
    const blockH = (showFormula ? fs + 22 : 0) + size * 0.78 + (showNote ? 64 : 30) + (preview || short ? 22 : 34) + (chartH > 0 ? chartH + (preview || short ? 4 : 26) : 0)
    const top = iy + (preview || short ? 12 : 22)
    const bottom = preview || short ? h - m : h - m - 80
    let y = portrait ? top : Math.max(top, top + (bottom - top - blockH) * 0.42)
    // the series, set in the serif
    if (showFormula) {
      const base = y + fs
      let xx = ix
      const put = (s: string, o: { italic?: boolean; size?: number; dy?: number; color?: string } = {}) => {
        const size = o.size ?? fs
        text(ctx, s, xx, base + (o.dy ?? 0), { font: 'serif', size, italic: o.italic, color: o.color ?? k.ink2 })
        setFont(ctx, { font: 'serif', size, italic: o.italic })
        xx += ctx.measureText(s).width
      }
      put('z', { italic: true })
      put('(')
      put('t', { italic: true })
      put(') = Σ ')
      put('c', { italic: true })
      put('k', { italic: true, size: fs * 0.62, dy: fs * 0.18 })
      put(' e', { italic: true })
      put('ikt', { italic: true, size: fs * 0.62, dy: -fs * 0.42, color: C.sage })
      y = base + (portrait ? 14 : 22)
    }
    // the count
    const base = y + size * 0.78
    const rolling = !manual && stage > 0 && grow < 1
    const nw = bigNumber(rolling ? prevN : N, N, rolling ? grow : 1, ix - size * 0.03, base, size)
    text(ctx, N === 1 ? 'TERM' : 'TERMS', ix + nw + size * 0.08, base - size * 0.05, { size: preview || tiny ? 8.5 : 10.5, color: C.sky, tracking: 0.16 })
    y = base + (preview || short ? 15 : 26)
    const name = `${String(fi + 1).padStart(2, '0')} / ${String(FIGURES.length).padStart(2, '0')} — ${FIGURES[fi].name.toUpperCase()}`
    text(ctx, inline && iw < 170 ? FIGURES[fi].name.toUpperCase() : name, ix, y, { size: preview || short ? 8.5 : 9.5, color: k.ink2, tracking: 0.14, alpha: fadeIn })
    if (showNote) text(ctx, FIGURES[fi].note, ix, y + 14, { size: 9, color: k.muted, tracking: 0.14, alpha: fadeIn })
    y += showNote ? 40 : 20

    // the stepper as a slider: 1 2 4 … 128 on a log scale, with a handle at the current count
    const fz = preview || short ? 8.5 : 10
    const cw = Math.min(iw, preview ? 170 : 300)
    setFont(ctx, { size: fz, tracking: 0.08 })
    const w0 = ctx.measureText('1').width
    const w7 = ctx.measureText('128').width
    track.x0 = ix + w0 / 2
    track.x1 = ix + cw - w7 / 2
    track.y = y + (preview || short ? 7 : 9)
    track.shown = !preview
    const spacing = (track.x1 - track.x0) / 7
    STAGES.forEach((v, i) => {
      if (spacing < 22 && i !== 0 && i !== 2 && i !== 4 && i !== 7) return
      const lit = Math.abs(u - i) < 0.5
      const col = lit ? C.sky : i < u ? k.ink2 : k.muted
      text(ctx, String(v), uToX(i), y, { size: fz, color: col, align: 'center', tracking: 0.08, alpha: i > u + 0.5 ? 0.6 : 1 })
    })
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.paper, 0.3)
    ctx.beginPath()
    ctx.moveTo(track.x0, Math.round(track.y) + 0.5)
    ctx.lineTo(track.x1, Math.round(track.y) + 0.5)
    for (let i = 0; i <= 7; i++) {
      const x = Math.round(uToX(i)) + 0.5
      ctx.moveTo(x, track.y - 2)
      ctx.lineTo(x, track.y + 3)
    }
    ctx.stroke()
    // the travelled part of the track, and this pass's progress
    ctx.strokeStyle = rgba(C.sky, 0.85)
    ctx.beginPath()
    ctx.moveTo(track.x0, Math.round(track.y) + 0.5)
    ctx.lineTo(uToX(u), Math.round(track.y) + 0.5)
    ctx.stroke()
    const hx = uToX(u)
    const big = drag?.slider || hoverTrack
    ctx.fillStyle = drag?.slider ? C.sky : C.night
    ctx.beginPath()
    ctx.arc(hx, track.y + 0.5, big ? 5.5 : 4, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = C.sky
    ctx.stroke()
    if (!manual && sp > 0 && sp < 1 && !preview) {
      ctx.strokeStyle = rgba(C.sky, 0.5)
      ctx.beginPath()
      ctx.arc(hx, track.y + 0.5, 8, -Math.PI / 2, -Math.PI / 2 + TAU * sp)
      ctx.stroke()
    }
    // the ghost: a hollow handle sweeping the track, with the instruction
    if (ghost > 0) {
      const gu = 3.5 + 3.5 * Math.sin((ghost * 1.15 - 0.25) * TAU)
      ctx.globalAlpha = smoothstep(0, 0.12, ghost) * (1 - smoothstep(0.85, 1, ghost))
      ctx.strokeStyle = C.sky
      ctx.setLineDash([1.5, 2.5])
      ctx.beginPath()
      ctx.arc(uToX(gu), track.y + 0.5, 7, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, short ? 'DRAG ↔ TERMS · TAP: NEXT' : 'DRAG ↔ FOR TERMS · TAP FOR THE NEXT FIGURE', ix, track.y + 18, { size: 8.5, color: C.sky, tracking: 0.14 })
      ctx.globalAlpha = 1
    } else if (manual && !drag && !preview && idle >= 0) {
      const left = Math.ceil(IDLE - idle)
      text(ctx, `BY HAND · PLAYS ON IN ${left} S`, ix, track.y + 18, { size: 8.5, color: k.muted, tracking: 0.14 })
    }
    y = track.y + (preview || short ? 14 : 38)

    // spectrum: |c_k| for k in ±KD, the terms in use lit
    const KD = 96
    if (chartH > 0) {
      if (!preview && !short) {
        text(ctx, '|cₖ|  SPECTRUM', ix, y, { size: 8.5, color: k.muted, tracking: 0.14 })
        y += 10
      }
      const by = Math.min(y + chartH, h - m - (preview || short ? 2 : 0))
      const chH = by - y
      let mx = 0
      for (let q = -KD; q <= KD; q++) if (q !== 0) mx = Math.max(mx, B.spectrum[q + KMAX])
      const bw = cw / (KD * 2 + 1)
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? C.sky : rgba(C.paper, 0.22)
        ctx.lineWidth = Math.max(1, Math.min(2, bw * 0.6))
        ctx.beginPath()
        for (let q = -KD; q <= KD; q++) {
          if (q === 0) continue
          const r = B.rank[q + KMAX]
          const on = manual ? r >= 0 && r < N : r >= 0 && (r < prevN || (r < N && (stage === 0 || grow >= 0.5)))
          if (on !== !!pass) continue
          const v = Math.sqrt(B.spectrum[q + KMAX] / (mx || 1))
          const xx = ix + (q + KD + 0.5) * bw
          ctx.moveTo(xx, by)
          ctx.lineTo(xx, by - Math.max(1, v * chH))
        }
        ctx.stroke()
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(C.paper, 0.45)
      ctx.beginPath()
      ctx.moveTo(ix, by + 0.5)
      ctx.lineTo(ix + cw, by + 0.5)
      for (const q of [-KD, -KD / 2, 0, KD / 2, KD]) {
        const xx = Math.round(ix + (q + KD + 0.5) * bw) + 0.5
        ctx.moveTo(xx, by)
        ctx.lineTo(xx, by + 4)
      }
      ctx.stroke()
      if (!preview && !short) {
        text(ctx, `−${KD}`, ix, by + 15, { size: 8.5, color: k.muted })
        text(ctx, 'k = 0', ix + cw / 2, by + 15, { size: 8.5, color: k.muted, align: 'center' })
        text(ctx, `+${KD}`, ix + cw, by + 15, { size: 8.5, color: k.muted, align: 'right' })
      }
    }

    // readouts along the bottom of the column
    if (!preview && !short) {
      const items = [
        { label: 'Error', value: `${(err * 100).toFixed(2)}%` },
        { label: 'Samples', value: String(M) },
        { label: 'Largest r', value: B.terms[0].amp.toFixed(3) },
      ]
      if (!portrait && iw > 300) items.push({ label: 'Period', value: (manual ? 2.4 : DUR[stage]).toFixed(1) + ' s' })
      hud(ctx, items, ix, h - m - (portrait ? 26 : 30), { ground: 'night', size: portrait ? 11 : 12, gap: portrait ? 16 : 20 })
    } else if (short && !tiny && iw > 150) {
      text(ctx, `ERROR ${(err * 100).toFixed(2)}%`, ix + cw, iy, { size: 8.5, color: k.muted, align: 'right', tracking: 0.12 })
    }
  }

  /* ------------------------------------------------------------ frame */

  function drawFrame(t: number) {
    ground(ctx, w, h, 'night')
    const fi = fig
    const B = get(fi)
    // where are we in this figure?
    let stage = STAGES.length - 1
    for (let i = 0; i < STAGES.length; i++) if (ft >= STAGE_START[i]) stage = i
    const st = ft - STAGE_START[stage]
    let grow = clamp(st / GROW)
    let sp = ft >= TRACE_END ? 1 : clamp((st - GROW) / DUR[stage])
    let N = STAGES[stage]
    let holding = ft >= TRACE_END
    let outP = clamp((ft - TRACE_END - HOLD) / OUT)
    const fadeIn = manual ? 1 : smoothstep(0, 0.6, ft)
    let err = B.err[stage]
    let u = autoU()
    if (manual) {
      N = Math.max(1, Math.min(STAGES[STAGES.length - 1], Math.round(Math.pow(2, mU))))
      stage = Math.min(STAGES.length - 1, Math.round(mU))
      grow = 1
      sp = 1
      holding = false
      outP = 0
      err = curveFor(fi, B, N).err
      u = mU
    }
    const key = fi * 100 + stage
    if (key !== lastStage) {
      if (lastStage !== -1 && !holding) env.sfx.tone(196 * PENTA[stage], 0.5, { type: 'sine', gain: 0.05, attack: 0.01, room: 0.4 })
      lastStage = key
    }

    // frame chrome
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.paper, 0.35)
    cropMarks(ctx, m * 0.5, m * 0.5, w - m, h - m, preview ? 7 : 10)

    // the drawing area: a faint polar grid
    const R = S / 0.82
    ctx.strokeStyle = k.faint
    ctx.beginPath()
    for (const f of [0.25, 0.5, 0.75, 1]) {
      ctx.moveTo(cx + R * f, cy)
      ctx.arc(cx, cy, R * f, 0, TAU)
    }
    for (let a = 0; a < 12; a++) {
      const an = (a / 12) * TAU
      ctx.moveTo(cx + Math.cos(an) * R * 0.25, cy + Math.sin(an) * R * 0.25)
      ctx.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R)
    }
    ctx.stroke()
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    for (let a = 0; a < 72; a++) {
      const an = (a / 72) * TAU
      const l = a % 6 === 0 ? 7 : 3
      ctx.moveTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R)
      ctx.lineTo(cx + Math.cos(an) * (R + l), cy + Math.sin(an) * (R + l))
    }
    ctx.stroke()

    // the target, as a faint dotted guide
    ctx.strokeStyle = rgba(C.paper, 0.16 * fadeIn * (1 - outP))
    ctx.setLineDash([1, 3])
    ctx.beginPath()
    let down = false
    for (let n = 0; n <= M; n++) {
      const i = n % M
      if (!B.pen[i]) {
        down = false
        continue
      }
      const x = X(B.target[i * 2])
      const y = Y(B.target[i * 2 + 1])
      if (down) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      down = true
    }
    ctx.stroke()
    ctx.setLineDash([])

    const penW = preview ? 1.4 : 1.8
    if (manual) {
      // by hand: the whole approximation at once, the chain spinning through it
      strokeCurve(curveFor(fi, B, N).cv, N >= 16 ? B.pen : null, 0, MC, C.sky, rgba(C.sky, 0.35), penW)
      drawChain(B, N, 1, (mClock / 2.4) % 1, 1)
    } else {
      // the previous pass as a ghost
      const penFlags = N >= 16 ? B.pen : null
      if (stage > 0 && !holding) {
        const ghostA = lerp(0.6, 0.3, ease.outCubic(grow))
        strokeCurve(B.curves[stage - 1], stage - 1 >= 4 ? B.pen : null, 0, MC, rgba(C.sage, ghostA), rgba(C.sage, ghostA * 0.4), 1)
      }
      // the pass in progress / the finished drawing
      if (!holding) {
        if (sp > 0) strokeCurve(B.curves[stage], penFlags, 0, sp * MC, C.sky, rgba(C.sky, 0.35), penW)
      } else {
        const from = ease.inOutCubic(outP) * MC
        strokeCurve(B.curves[stage], B.pen, from, MC, C.sky, rgba(C.sky, 0.3 * (1 - outP)), penW)
      }
      // the chain
      const chainA = holding ? 1 - smoothstep(0.2, 1.2, ft - TRACE_END) : fadeIn
      const s = holding ? (ft - TRACE_END) / DUR[stage] : sp
      drawChain(B, N, stage === 0 ? ease.outCubic(grow) : ease.inOutCubic(grow), s, chainA)

      // the finished figure gets its caption in the hold, where there is room for it
      if (holding) {
        const cap = smoothstep(0.4, 1.0, ft - TRACE_END) * (1 - outP)
        const ty = portrait ? cy + R + 24 : Math.min(h - m - 6, cy + R + 22)
        if (cap > 0 && (portrait || ty - (cy + R) > 12)) {
          text(ctx, `${FIGURES[fi].name} — ${N} terms, ${(B.err[stage] * 100).toFixed(2)}% error`, cx, ty, {
            font: 'serif',
            italic: true,
            size: preview || h < 380 ? 12 : 17,
            color: C.sage,
            align: 'center',
            alpha: cap,
          })
        }
      }
    }

    const ghost = !preview && !acted && t > GHOST_FROM && t < GHOST_TO ? (t - GHOST_FROM) / (GHOST_TO - GHOST_FROM) : 0
    drawInfo(B, fi, stage, sp, grow, fadeIn, N, err, u, ghost)
  }

  return {
    resize(width, height) {
      w = width
      h = height
      layout()
    },
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'down') {
        const slider = onTrack(p.x, p.y, touch)
        drag = { x0: p.x, u0: manual ? mU : Math.round(autoU()), ms: performance.now(), slider, moved: false, touch }
        if (slider) enterManual(xToU(p.x))
        env.setCursor(slider ? 'grabbing' : 'pointer')
        return
      }
      if (p.type === 'move') {
        if (drag) {
          if (drag.slider) enterManual(xToU(p.x))
          else if (drag.moved || Math.abs(p.x - drag.x0) > (drag.touch ? 12 : 8)) {
            // a drag anywhere scrubs the series: one octave of terms per 70 px
            drag.moved = true
            enterManual(drag.u0 + (p.x - drag.x0) / 70)
            env.setCursor('grabbing')
          }
          return
        }
        hoverTrack = onTrack(p.x, p.y, touch)
        env.setCursor(hoverTrack ? 'grab' : 'pointer')
        return
      }
      if (p.type === 'up' && drag) {
        // a tap (no drag) moves on to the next figure
        if (!drag.slider && !drag.moved && performance.now() - drag.ms < 400) nextFigure()
        drag = null
        idle = 0
        env.setCursor(onTrack(p.x, p.y, touch) ? 'grab' : 'pointer')
        return
      }
      if (p.type === 'leave') {
        drag = null
        hoverTrack = false
        env.setCursor('default')
      }
    },
    key(code, down) {
      const handled = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(code)
      if (!down || !handled) return handled
      if (code === 'ArrowRight' || code === 'Space' || code === 'Enter') nextFigure(1)
      else if (code === 'ArrowLeft') nextFigure(-1)
      else enterManual(Math.round(manual ? mU : autoU()) + (code === 'ArrowUp' ? 1 : -1))
      return true
    },
    frame(t, dt) {
      if (manual) {
        mClock += dt
        if (!drag) {
          idle += dt
          // let go for a while and the series plays on from the next doubling
          if (idle > IDLE) {
            manual = false
            const i = Math.min(STAGES.length - 1, Math.ceil(mU - 1e-3))
            ft = STAGE_START[i]
          }
        }
      } else {
        ft += dt
        if (ft >= FIG_LEN) {
          ft -= FIG_LEN
          fig = (fig + 1) % FIGURES.length
        }
      }
      drawFrame(t)
    },
  }
}

export default create
