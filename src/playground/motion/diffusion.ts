/*
 * FIG. M.02 — DIFFUSION. Reverse diffusion, the way image generators sample:
 * a cloud of particles drawn from N(0, I) is denoised step by step, t = 1000
 * → 0, on the cosine noise schedule (Nichol & Dhariwal, s = 0.008) with a
 * DDIM sampler (η = 0.35, so a little fresh noise is injected every step):
 *
 *     x_{t−1} = √ᾱ_{t−1} x̂₀ + √(1 − ᾱ_{t−1} − σ²) ε̂ + σ z,
 *     ε̂ = (x_t − √ᾱ_t x̂₀) / √(1 − ᾱ_t)
 *
 * Each particle is one 2-D sample, denoised toward its own point on the
 * target shape, so the cloud always has the true marginal q(x_t) =
 * N(√ᾱ_t x₀, (1 − ᾱ_t) I). Steps are spaced evenly in log-SNR across the
 * reverse phase. The inset shows the optimal denoiser E[x₀ | x_t] for the
 * shape's distribution (a softmax over the shape's points): the mean at
 * high noise, unfolding into the shape as the signal rises.
 *
 * The shape crystallises at t = 0 (the peak), holds crisp, and the forward
 * process dissolves it back into noise for the next sample: the ZB monogram
 * (sampled along src/film/logo.ts), a flower, a bird in flight, and "Play"
 * set in Instrument Serif. Night ground; trails are the hairline each
 * particle moved this frame. 4 × 10.5 s = 42 s loop. ?sample=1…4 starts on
 * a given sample (test route).
 *
 * Interaction (full mode): drag left or right anywhere (or along the
 * schedule chart) to scrub the noise level t by hand; release and the
 * sampler carries on from there. ← → nudge t, N moves on to the next
 * sample, Space pauses.
 */

import { C, clamp, cropMarks, ease, FONT, gauss, ground, inkOn, mixHex, rgba, rng, setFont, text, TAU } from '../kit'
import { LOGO } from '../../film/logo'
import type { CreatePiece } from '../types'

/* -------------------------------------------------------------- schedule */

const T = 1000
const S_OFF = 0.008
const ETA = 0.35
/** the data scale: shapes span ±DATA against unit-variance noise */
const DATA = 1.6
const ABAR = new Float64Array(T + 1)
{
  const f = (t: number) => Math.cos(((t / T + S_OFF) / (1 + S_OFF)) * (Math.PI / 2)) ** 2
  const f0 = f(0)
  for (let t = 0; t <= T; t++) ABAR[t] = Math.max(1e-6, f(t) / f0)
  ABAR[0] = 1
}

const REVERSE = 6.0
const HOLD = 2.0
const FORWARD = 2.5
const CYCLE = REVERSE + HOLD + FORWARD

/** log signal-to-noise ratio per step, λ_t = log(ᾱ / (1 − ᾱ)) — decreasing in t */
const LSNR = new Float64Array(T + 1)
for (let t = 1; t <= T; t++) LSNR[t] = Math.log(ABAR[t] / (1 - ABAR[t]))
LSNR[0] = Infinity
/**
 * Wall-clock progress of the reverse phase → diffusion step, spaced evenly in
 * log-SNR (as samplers space their steps), so every decade of signal gets the
 * same screen time: noise, then emergence, then the last crisp refinement.
 */
const L_END = 8
function tOfReverse(p: number) {
  if (p >= 1) return 0
  // a quick pass through pure noise, then even log-SNR spacing
  const q = clamp(p)
  const g = 0.42 * (1 - Math.exp(-q / 0.07)) + 0.58 * q
  const target = LSNR[T] + (L_END - LSNR[T]) * g
  let lo = 1
  let hi = T
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (LSNR[mid] > target) lo = mid + 1
    else hi = mid
  }
  return p > 0.985 ? Math.round(lo * (1 - (p - 0.985) / 0.015)) : lo
}
const tOfForward = (p: number) => Math.round(T * ease.inSine(clamp(p)) * 0.35 + T * clamp(p) * 0.65)

/* ---------------------------------------------------------------- shapes */

type Pt = [number, number]

/** Flatten a subset of SVG path syntax (M L H V C A Z, absolute) into polylines. */
function flatten(d: string): Pt[][] {
  const toks = d.match(/[MLHVCAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []
  const out: Pt[][] = []
  let cur: Pt[] = []
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let i = 0
  let cmd = ''
  const num = () => Number(toks[i++])
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++].toUpperCase()
    if (cmd === 'M') {
      if (cur.length > 1) out.push(cur)
      x = num()
      y = num()
      sx = x
      sy = y
      cur = [[x, y]]
      cmd = 'L'
    } else if (cmd === 'L') {
      x = num()
      y = num()
      cur.push([x, y])
    } else if (cmd === 'H') {
      x = num()
      cur.push([x, y])
    } else if (cmd === 'V') {
      y = num()
      cur.push([x, y])
    } else if (cmd === 'C') {
      const x1 = num()
      const y1 = num()
      const x2 = num()
      const y2 = num()
      const x3 = num()
      const y3 = num()
      for (let k = 1; k <= 16; k++) {
        const u = k / 16
        const v = 1 - u
        cur.push([v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3])
      }
      x = x3
      y = y3
    } else if (cmd === 'A') {
      // endpoint → centre parameterisation (SVG implementation notes, F.6.5); rotation 0
      let rx = Math.abs(num())
      let ry = Math.abs(num())
      num()
      const large = num()
      const sweep = num()
      const x2 = num()
      const y2 = num()
      const dx = (x - x2) / 2
      const dy = (y - y2) / 2
      const lam = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
      if (lam > 1) {
        rx *= Math.sqrt(lam)
        ry *= Math.sqrt(lam)
      }
      const sign = large === sweep ? -1 : 1
      const num2 = rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx
      const co = sign * Math.sqrt(Math.max(0, num2 / (rx * rx * dy * dy + ry * ry * dx * dx)))
      const cxp = (co * rx * dy) / ry
      const cyp = (-co * ry * dx) / rx
      const cx = cxp + (x + x2) / 2
      const cy = cyp + (y + y2) / 2
      const a1 = Math.atan2((dy - cyp) / ry, (dx - cxp) / rx)
      let da = Math.atan2((-dy - cyp) / ry, (-dx - cxp) / rx) - a1
      if (sweep && da < 0) da += TAU
      if (!sweep && da > 0) da -= TAU
      for (let k = 1; k <= 20; k++) {
        const a = a1 + (da * k) / 20
        cur.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
      }
      x = x2
      y = y2
    } else if (cmd === 'Z') {
      cur.push([sx, sy])
      x = sx
      y = sy
      out.push(cur)
      cur = []
      cmd = ''
    } else i++
  }
  if (cur.length > 1) out.push(cur)
  return out
}

interface Shape {
  key: string
  label: string
  /** n points: x, y in [-1, 1] (y up) */
  xy: Float32Array
  /** colour group: 0 paper, 1 sky, 2 sage, 3 fern */
  g: Uint8Array
}

/** Evenly sample n points along polylines (by length), with a little stroke width. */
function alongLines(lines: { pts: Pt[]; g: number }[], n: number, r: () => number, width: number) {
  const lens = lines.map((l) => {
    let s = 0
    for (let i = 1; i < l.pts.length; i++) s += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1])
    return s
  })
  const total = lens.reduce((a, b) => a + b, 0) || 1
  const out: { x: number; y: number; g: number }[] = []
  lines.forEach((l, li) => {
    const m = Math.round((n * lens[li]) / total)
    for (let k = 0; k < m; k++) {
      let at = ((k + r()) / m) * lens[li]
      for (let i = 1; i < l.pts.length; i++) {
        const [ax, ay] = l.pts[i - 1]
        const [bx, by] = l.pts[i]
        const sl = Math.hypot(bx - ax, by - ay)
        if (at <= sl || i === l.pts.length - 1) {
          const f = sl > 0 ? Math.min(1, at / sl) : 0
          const nx = sl > 0 ? -(by - ay) / sl : 0
          const ny = sl > 0 ? (bx - ax) / sl : 0
          const off = gauss(r) * width
          out.push({ x: ax + (bx - ax) * f + nx * off, y: ay + (by - ay) * f + ny * off, g: l.g })
          break
        }
        at -= sl
      }
    }
  })
  return out
}

/** Pixels of a filled drawing on an offscreen canvas, as points (canvas y down). */
function fillPixels(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, stride = 2): { x: number; y: number }[] {
  try {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d', { willReadFrequently: true })
    if (!g) return []
    g.fillStyle = '#000'
    draw(g)
    const data = g.getImageData(0, 0, w, h).data
    const out: { x: number; y: number }[] = []
    for (let y = 0; y < h; y += stride) for (let x = 0; x < w; x += stride) if (data[(y * w + x) * 4 + 3] > 140) out.push({ x, y })
    return out
  } catch {
    return []
  }
}

function finish(key: string, label: string, raw: { x: number; y: number; g: number }[], n: number, r: () => number): Shape {
  // pad / trim to n by resampling, then shuffle so particle ↔ point pairing is random
  const pts = raw.length ? raw : Array.from({ length: n }, (_, i) => ({ x: Math.cos((i / n) * TAU), y: Math.sin((i / n) * TAU), g: 0 }))
  const pick: { x: number; y: number; g: number }[] = []
  for (let i = 0; i < n; i++) pick.push(pts[i < pts.length && pts.length >= n ? i : Math.floor(r() * pts.length)])
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    const t = pick[i]
    pick[i] = pick[j]
    pick[j] = t
  }
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of pick) {
    x0 = Math.min(x0, p.x)
    x1 = Math.max(x1, p.x)
    y0 = Math.min(y0, p.y)
    y1 = Math.max(y1, p.y)
  }
  const sc = 2 / Math.max(x1 - x0, y1 - y0, 1e-6)
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const xy = new Float32Array(n * 2)
  const g = new Uint8Array(n)
  pick.forEach((p, i) => {
    xy[i * 2] = (p.x - mx) * sc * DATA
    xy[i * 2 + 1] = (p.y - my) * sc * DATA
    g[i] = p.g
  })
  return { key, label, xy, g }
}

/** SVG-space (y down) polylines → y-up */
const flipY = (lines: Pt[][]): Pt[][] => lines.map((l) => l.map(([x, y]) => [x, -y] as Pt))

function monogram(n: number, r: () => number): Shape {
  const lines = [
    ...flipY(flatten(LOGO.hex)).map((pts) => ({ pts, g: 0 })),
    ...flipY(flatten(LOGO.bars)).map((pts) => ({ pts, g: 1 })),
    ...flipY(flatten(LOGO.diag)).map((pts) => ({ pts, g: 1 })),
    ...flipY(flatten(LOGO.bowls)).map((pts) => ({ pts, g: 2 })),
  ]
  return finish('monogram', 'The ZB monogram', alongLines(lines, n, r, 0.22), n, r)
}

function flower(n: number, r: () => number): Shape {
  const lines: { pts: Pt[]; g: number }[] = []
  const cx = 0
  const cy = 0.36
  // five petals: a rose curve r = R cos(5θ), one petal up
  const petals: Pt[] = []
  for (let k = 0; k <= 400; k++) {
    const th = (k / 400) * Math.PI
    const rr = 0.6 * Math.cos(5 * th)
    petals.push([cx + rr * Math.cos(th + Math.PI / 2), cy + rr * Math.sin(th + Math.PI / 2)])
  }
  lines.push({ pts: petals, g: 0 })
  // inner veins: a smaller rose, offset
  const veins: Pt[] = []
  for (let k = 0; k <= 300; k++) {
    const th = (k / 300) * Math.PI
    const rr = 0.34 * Math.cos(5 * th)
    veins.push([cx + rr * Math.cos(th + Math.PI / 2 + Math.PI / 5), cy + rr * Math.sin(th + Math.PI / 2 + Math.PI / 5)])
  }
  lines.push({ pts: veins, g: 0 })
  const ring = (rad: number): Pt[] => Array.from({ length: 64 }, (_, k) => [cx + rad * Math.cos((k / 63) * TAU), cy + rad * Math.sin((k / 63) * TAU)] as Pt)
  lines.push({ pts: ring(0.1), g: 3 }, { pts: ring(0.05), g: 3 })
  // stem and two leaves
  const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt[] =>
    Array.from({ length: 40 }, (_, k) => {
      const u = k / 39
      const v = 1 - u
      return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]] as Pt
    })
  lines.push({ pts: bez([0, cy - 0.62], [0.12, -0.45], [-0.12, -0.75], [0.04, -1.1]), g: 2 })
  const leaf = (a: Pt, b: Pt, bulge: number) => {
    const mx = (a[0] + b[0]) / 2
    const my = (a[1] + b[1]) / 2
    const nx = -(b[1] - a[1])
    const ny = b[0] - a[0]
    lines.push({ pts: bez(a, [mx + nx * bulge, my + ny * bulge], [mx + nx * bulge * 0.6, my + ny * bulge * 0.6], b), g: 2 })
    lines.push({ pts: bez(a, [mx - nx * bulge, my - ny * bulge], [mx - nx * bulge * 0.6, my - ny * bulge * 0.6], b), g: 2 })
    lines.push({ pts: [a, b], g: 2 })
  }
  leaf([0.03, -0.6], [0.46, -0.38], 0.32)
  leaf([0.0, -0.84], [-0.4, -0.68], 0.32)
  return finish('flower', 'A flower', alongLines(lines, n, r, 0.006), n, r)
}

const BIRD =
  'M100 62 C90 44 76 16 58 14 C40 12 20 26 2 46 C22 40 42 38 58 44 C72 50 86 66 96 76 C98 84 102 84 104 76 C114 66 128 50 142 44 C158 38 178 40 198 46 C180 26 160 12 142 14 C124 16 110 44 100 62 Z'

function bird(n: number, r: () => number): Shape {
  const outline = flipY(flatten(BIRD)).map((pts) => ({ pts, g: 0 }))
  const edge = alongLines(outline, Math.round(n * 0.42), r, 0.5)
  // interior: rasterise the silhouette and sample its pixels
  const px = fillPixels(400, 240, (g) => {
    g.scale(2, 2)
    g.fill(new Path2D(BIRD))
  })
  const inner: { x: number; y: number; g: number }[] = []
  const m = n - edge.length
  for (let i = 0; i < m && px.length; i++) {
    const p = px[Math.floor(r() * px.length)]
    const x = p.x / 2 + (r() - 0.5)
    const y = -(p.y / 2 + (r() - 0.5))
    inner.push({ x, y, g: Math.abs(x - 100) > 62 ? 1 : 0 })
  }
  for (const e of edge) if (Math.abs(e.x - 100) > 62) e.g = 1
  return finish('bird', 'A bird in flight', [...edge, ...inner], n, r)
}

function word(n: number, r: () => number): Shape {
  const size = 220
  let pW = 0
  const px = fillPixels(640, 300, (g) => {
    g.font = `italic 400 ${size}px ${FONT.serif}`
    g.textBaseline = 'alphabetic'
    pW = g.measureText('P').width
    g.fillText('Play', 40, 220)
  })
  const raw = []
  for (let i = 0; i < n && px.length; i++) {
    const p = px[Math.floor(r() * px.length)]
    raw.push({ x: p.x + r() * 2, y: -(p.y + r() * 2), g: p.x < 40 + pW * 0.86 ? 2 : 0 })
  }
  return finish('play', '“Play”, in Instrument Serif', raw, n, r)
}

/* ----------------------------------------------------------------- piece */

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const N = preview ? 760 : 2200
  const k = inkOn('night')
  const GROUPS = [k.ink, C.sky, C.sage, mixHex(C.fern, '#EEF4F1', 0.25)]

  // particle state
  const x = new Float32Array(N)
  const y = new Float32Array(N)
  const ox = new Float32Array(N)
  const oy = new Float32Array(N)
  const hx = new Float32Array(N)
  const hy = new Float32Array(N)
  const ex = new Float32Array(N)
  const ey = new Float32Array(N)
  const r0 = rng(9)
  for (let i = 0; i < N; i++) {
    x[i] = gauss(r0)
    y[i] = gauss(r0)
    ox[i] = x[i]
    oy[i] = y[i]
  }
  const noise = rng(31337)

  const makers = [monogram, flower, bird, word]
  const shapes: (Shape | null)[] = [null, null, null, null]
  let fontsOk = false
  function shapeFor(i: number): Shape {
    if (i === 3) {
      // the word needs Instrument Serif; resample once it has loaded
      let ok = true
      try {
        ok = typeof document !== 'undefined' && !!document.fonts && document.fonts.check(`italic 200px ${FONT.serif}`)
      } catch {
        ok = true
      }
      if (ok && !fontsOk) {
        fontsOk = true
        shapes[3] = null
      }
    }
    let s = shapes[i]
    if (!s) {
      s = makers[i](N, rng(500 + i * 7))
      shapes[i] = s
    }
    return s
  }

  // ?sample=1…4 starts the loop on that sample (for the test route)
  let ci = Math.min(3, Math.max(0, Math.floor(Number(env.params.get('sample') ?? 1) - 1) || 0))
  let cycT = 0
  let tStep = T
  let phase: 'reverse' | 'hold' | 'forward' = 'reverse'
  let cur = shapeFor(ci)
  let crystal = -1
  let lastTick = -1

  /* ---------------------------------------------------------- interaction */
  // scrubbing: t is set by hand and each particle sits at √ᾱ x₀ + √(1 − ᾱ) ε with its ε held fixed
  let scrub = false
  let scrubT = 0
  let dragging = false
  let dragFrom = { x: 0, t: 0, chart: false }
  let manual = 0
  let paused = false
  let interacted = false
  let hoverChart = false

  /** Freeze each particle's noise ε so x_t can be set for any t. */
  function captureNoise() {
    const a = Math.sqrt(ABAR[tStep])
    const b = Math.sqrt(1 - ABAR[tStep])
    const xy = cur.xy
    for (let i = 0; i < N; i++) {
      if (tStep > 0 && b > 1e-6) {
        ex[i] = (x[i] - a * xy[i * 2]) / b
        ey[i] = (y[i] - a * xy[i * 2 + 1]) / b
      } else if (phase !== 'hold' && phase !== 'forward') {
        ex[i] = gauss(noise)
        ey[i] = gauss(noise)
      }
    }
  }

  function startScrub(t0: number) {
    if (!scrub) {
      captureNoise()
      scrub = true
    }
    scrubT = t0
    interacted = true
  }

  /** Hand the particles back to the sampler at the current t. */
  function release() {
    scrub = false
    if (tStep <= 0) {
      phase = 'hold'
      cycT = REVERSE + 0.001
      crystal = cycT
      return
    }
    // find the point in the reverse phase whose step matches, and carry on denoising from it
    let lo = 0
    let hi = 1
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2
      if (tOfReverse(mid) > tStep) lo = mid
      else hi = mid
    }
    phase = 'reverse'
    cycT = lo * REVERSE
    crystal = -1
  }

  /** Move on: diffuse forward from the current t, then the next sample. */
  function skip() {
    if (scrub) scrub = false
    captureNoise()
    // the forward phase starts where its step matches the current t
    let lo = 0
    let hi = 1
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2
      if (tOfForward(mid) < tStep) lo = mid
      else hi = mid
    }
    phase = 'forward'
    cycT = REVERSE + HOLD + hi * FORWARD
    interacted = true
  }

  function step(dt: number) {
    if (scrub) {
      for (let i = 0; i < N; i++) {
        ox[i] = x[i]
        oy[i] = y[i]
      }
      tStep = Math.round(clamp(scrubT, 0, T))
      const a = Math.sqrt(ABAR[tStep])
      const b = Math.sqrt(1 - ABAR[tStep])
      const xy = cur.xy
      for (let i = 0; i < N; i++) {
        x[i] = a * xy[i * 2] + b * ex[i]
        y[i] = a * xy[i * 2 + 1] + b * ey[i]
      }
      if (!dragging) {
        manual -= dt
        if (manual <= 0) release()
      }
      return
    }
    if (paused) {
      for (let i = 0; i < N; i++) {
        ox[i] = x[i]
        oy[i] = y[i]
      }
      return
    }
    cycT += dt
    if (cycT >= CYCLE) {
      cycT -= CYCLE
      ci = (ci + 1) % makers.length
      cur = shapeFor(ci)
      phase = 'reverse'
      tStep = T
      crystal = -1
    }
    for (let i = 0; i < N; i++) {
      ox[i] = x[i]
      oy[i] = y[i]
    }
    if (cycT < REVERSE) {
      phase = 'reverse'
      const target = tOfReverse(cycT / REVERSE)
      while (tStep > target) {
        denoise(tStep)
        tStep--
      }
      if (tStep === 0 && crystal < 0) crystal = cycT
    } else if (cycT < REVERSE + HOLD) {
      if (phase === 'reverse') {
        while (tStep > 0) {
          denoise(tStep)
          tStep--
        }
        // fresh noise for the forward process
        for (let i = 0; i < N; i++) {
          ex[i] = gauss(noise)
          ey[i] = gauss(noise)
        }
        if (crystal < 0) crystal = cycT
      } else if (cycT - REVERSE > 0.8 && !shapes[(ci + 1) % makers.length]) {
        // sample the next target while this one holds still (moves the cost off the transition)
        shapeFor((ci + 1) % makers.length)
      }
      phase = 'hold'
      tStep = 0
    } else {
      phase = 'forward'
      tStep = tOfForward((cycT - REVERSE - HOLD) / FORWARD)
      const a = Math.sqrt(ABAR[tStep])
      const b = Math.sqrt(1 - ABAR[tStep])
      const xy = cur.xy
      for (let i = 0; i < N; i++) {
        x[i] = a * xy[i * 2] + b * ex[i]
        y[i] = a * xy[i * 2 + 1] + b * ey[i]
      }
    }
  }

  /** One DDIM step t → t−1 with the denoiser estimate x̂₀. */
  function denoise(t: number) {
    const at = ABAR[t]
    const ap = ABAR[t - 1]
    const sa = Math.sqrt(at)
    const s1 = Math.sqrt(1 - at)
    const sig = ETA * Math.sqrt((1 - ap) / (1 - at)) * Math.sqrt(Math.max(0, 1 - at / ap))
    const dirC = Math.sqrt(Math.max(0, 1 - ap - sig * sig))
    const sap = Math.sqrt(ap)
    const xy = cur.xy
    for (let i = 0; i < N; i++) {
      // each particle is denoised toward its own sample of the shape
      const px0 = xy[i * 2]
      const py0 = xy[i * 2 + 1]
      const epx = (x[i] - sa * px0) / s1
      const epy = (y[i] - sa * py0) / s1
      x[i] = sap * px0 + dirC * epx + (sig > 0 ? sig * gauss(noise) : 0)
      y[i] = sap * py0 + dirC * epy + (sig > 0 ? sig * gauss(noise) : 0)
    }
  }

  /**
   * The optimal denoiser for the shape's distribution, E[x₀ | xₜ], for the
   * first K particles against M of the shape's points: a softmax over
   * −‖xₜ − √ᾱ x₀ʲ‖² / 2(1 − ᾱ). What a perfect network would predict.
   */
  const K = preview ? 0 : 260
  const M = 280
  const wts = new Float64Array(M)
  let hatT = -1
  function predict() {
    // refresh when the step has moved on (at most every few steps: it is an inset)
    if (!K || hatT === tStep || (hatT >= 0 && Math.abs(hatT - tStep) < 3 && tStep > 0)) return
    hatT = tStep
    const at = ABAR[tStep]
    const xy = cur.xy
    if (tStep === 0 || at > 0.99995) {
      for (let i = 0; i < K; i++) {
        hx[i] = x[i]
        hy[i] = y[i]
      }
      return
    }
    const sa = Math.sqrt(at)
    const inv = 1 / (2 * (1 - at))
    for (let i = 0; i < K; i++) {
      let mx = -Infinity
      for (let j = 0; j < M; j++) {
        const dx = x[i] - sa * xy[j * 2]
        const dy = y[i] - sa * xy[j * 2 + 1]
        const l = -(dx * dx + dy * dy) * inv
        wts[j] = l
        if (l > mx) mx = l
      }
      let sw = 0
      let sx = 0
      let sy = 0
      for (let j = 0; j < M; j++) {
        const e = Math.exp(wts[j] - mx)
        sw += e
        sx += e * xy[j * 2]
        sy += e * xy[j * 2 + 1]
      }
      hx[i] = sx / sw
      hy[i] = sy / sw
    }
  }

  /* ------------------------------------------------------------ layout */
  let W = env.width
  let H = env.height
  let pad = 20
  let small = false
  let portrait = false
  let S = 100
  let cx = 0
  let cy = 0
  let sched = { x: 0, y: 0, w: 100, h: 50 }
  let inset = { x: 0, y: 0, s: 80 }
  let groundLayer: HTMLCanvasElement | null = null
  let groundKey = ''

  function layout(w: number, h: number) {
    W = w
    H = h
    portrait = h > w * 1.08
    small = preview || Math.min(w, h) < 380 || (!portrait && w < 600)
    pad = clamp(Math.min(w, h) * 0.05, 14, 44)
    if (!portrait) {
      S = Math.min(w * 0.3, h * 0.34) / DATA
      cx = w * (small ? 0.5 : 0.47)
      cy = h * 0.52
      const sw = small ? 92 : clamp(w * 0.2, 200, 300)
      const sh = small ? 30 : clamp(h * 0.13, 70, 120)
      sched = { x: w - pad - sw, y: h - pad * 0.62 - 22 - sh, w: sw, h: sh }
      const is = small ? 0 : clamp(h * 0.16, 90, 150)
      inset = { x: w - pad - is, y: pad + 74, s: is }
      // shrink the sample until its frame (and label) clears the readouts, inset and chart
      {
        const readR = pad + (small ? 120 : 250)
        const readB = pad + (small ? 54 : 180)
        for (let k = 0; k < 30; k++) {
          const half = S * DATA * 1.08
          const x0 = cx - half
          const x1 = cx + half
          const y0 = cy - half
          const y1 = cy + half + (small ? 0 : 24)
          const hitRead = x0 < readR && y0 < readB
          const hitChart = x1 > sched.x - 10 && y1 > sched.y - 22
          const hitInset = x1 > inset.x - 10 && y0 < inset.y + inset.s + 22
          if (!hitRead && !hitChart && !hitInset) break
          S *= 0.96
        }
      }
    } else {
      const sh = small ? 40 : clamp(h * 0.09, 50, 100)
      sched = { x: pad + 24, y: h - pad * 0.62 - 26 - sh, w: w - pad * 2 - 24, h: sh }
      // the readouts block (formula, t, three lines) and, when tall, the inset beside it
      const readB = pad + (small ? 62 : 170)
      const is = !small && h >= 640 ? clamp(w * 0.22, 70, 110) : 0
      inset = { x: w - pad - is, y: pad + 70, s: is }
      const top = Math.max(readB, is ? inset.y + is + 22 : 0) + 8
      const bottom = sched.y - (small ? 22 : 46)
      const half = Math.max(30, Math.min((w - pad * 2) / 2, (bottom - top) / 2))
      S = half / (DATA * 1.08)
      cx = w / 2
      cy = (top + bottom) / 2
    }
  }

  function drawGround() {
    const dpr = env.dpr || 1
    const key = `${W}x${H}@${dpr}`
    if (key !== groundKey) {
      groundKey = key
      try {
        groundLayer = groundLayer ?? document.createElement('canvas')
        groundLayer.width = Math.max(1, Math.round(W * dpr))
        groundLayer.height = Math.max(1, Math.round(H * dpr))
        const g = groundLayer.getContext('2d')
        if (g) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0)
          ground(g, W, H, 'night')
        } else groundLayer = null
      } catch {
        groundLayer = null
      }
    }
    if (groundLayer) ctx.drawImage(groundLayer, 0, 0, W, H)
    else ground(ctx, W, H, 'night')
  }

  const SX = (v: number) => cx + v * S
  const SY = (v: number) => cy - v * S

  function frame(t: number, dt: number) {
    if (dt > 0) step(dt)
    drawGround()
    const ab = ABAR[tStep]
    const clarity = ab
    const isNew = crystal >= 0 && phase !== 'forward'

    /* ------------------------------------------------------- particles */
    const trailA = small ? 0.5 : 0.42
    const dot = small ? 1.3 : clamp((S * DATA) / 210, 1.15, 1.8)
    for (let gi = 0; gi < GROUPS.length; gi++) {
      const colour = mixHex('#EEF4F1', GROUPS[gi], clamp(clarity * 1.2))
      const trails = new Path2D()
      const long = new Path2D()
      const dots = new Path2D()
      let any = false
      const g = cur.g
      for (let i = 0; i < N; i++) {
        if (g[i] !== gi) continue
        const X = SX(x[i])
        const Y = SY(y[i])
        if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue
        const PX = SX(ox[i])
        const PY = SY(oy[i])
        const m = Math.abs(X - PX) + Math.abs(Y - PY)
        if (m > 0.4) {
          // long jumps (the noisy early steps) are drawn fainter
          const p = m > 26 ? long : trails
          p.moveTo(PX, PY)
          p.lineTo(X, Y)
        }
        dots.rect(X - dot / 2, Y - dot / 2, dot, dot)
        any = true
      }
      if (!any) continue
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(hexOf(colour), trailA * 0.45)
      ctx.stroke(long)
      ctx.strokeStyle = rgba(hexOf(colour), trailA)
      ctx.stroke(trails)
      ctx.fillStyle = colour
      ctx.globalAlpha = 0.55 + 0.45 * clarity
      ctx.fill(dots)
      ctx.globalAlpha = 1
    }

    /* ---------------------------------------------- crystallisation mark */
    if (isNew) {
      const since = phase === 'hold' ? cycT - crystal : 0
      const ap = ease.outCubic(clamp(since / 0.7)) * (1 - clamp((cycT - (REVERSE + HOLD - 0.3)) / 0.3))
      if (ap > 0 && !small) {
        const bw = S * DATA * 2.16
        const bx = cx - bw / 2
        const by = cy - bw / 2
        ctx.strokeStyle = rgba('#EEF4F1', 0.55 * ap)
        ctx.lineWidth = 1
        cropMarks(ctx, bx, by, bw, bw, 12 * ap)
        // a ring that releases from the shape at the moment it lands
        if (since < 1.2) {
          ctx.strokeStyle = rgba(C.sky, 0.5 * (1 - since / 1.2))
          ctx.beginPath()
          ctx.arc(cx, cy, S * DATA * (1.1 + 0.5 * ease.outCubic(since / 1.2)), 0, TAU)
          ctx.stroke()
        }
        const lab = `SAMPLE ${String(ci + 1).padStart(2, '0')} · x₀ ~ p(x)`
        setFont(ctx, { size: 9.5, tracking: 0.14 })
        const lw = ctx.measureText(lab).width
        setFont(ctx, { font: 'serif', size: 15, italic: true })
        const nw = ctx.measureText(cur.label).width
        if (lw + nw + 24 < bw) {
          text(ctx, lab, bx, by + bw + 18, { size: 9.5, color: k.ink, tracking: 0.14, alpha: ap })
          text(ctx, cur.label, bx + bw, by + bw + 18, { font: 'serif', size: 15, italic: true, color: C.sage, align: 'right', alpha: ap })
        } else {
          // too narrow for one line: centred, the name over the label
          text(ctx, cur.label, cx, by + bw + 14, { font: 'serif', size: 15, italic: true, color: C.sage, align: 'center', alpha: ap })
          text(ctx, lab, cx, by + bw + 30, { size: 9, color: k.ink, tracking: 0.14, align: 'center', alpha: ap })
        }
      }
    }

    drawChrome(t)
    drawSchedule()
    drawInset()
    drawHint(t)
    if (!preview) env.setCursor(dragging ? 'grabbing' : hoverChart ? 'grab' : 'ew-resize')

    // a soft tick each hundred steps, a chord when the sample lands
    if (env.mode === 'full') {
      const tick = Math.floor(tStep / 100)
      if (tick !== lastTick && phase === 'reverse' && dt > 0) env.sfx.tone(220 * Math.pow(2, (10 - tick) / 12), 0.12, { type: 'sine', gain: 0.025, room: 0.3 })
      lastTick = tick
      if (crystal >= 0 && Math.abs(cycT - crystal) < dt * 0.5 + 1e-6 && dt > 0) {
        env.sfx.tone(392, 0.9, { type: 'sine', gain: 0.05, room: 0.5 })
        env.sfx.tone(587.33, 1.1, { type: 'sine', gain: 0.035, room: 0.5, when: 0.06 })
      }
    }
  }

  const hexCache = new Map<string, string>()
  /** 'rgb(r,g,b)' → '#rrggbb' (for rgba()) */
  function hexOf(c: string) {
    if (c.startsWith('#')) return c
    let h = hexCache.get(c)
    if (!h) {
      const m = c.match(/\d+/g) ?? ['0', '0', '0']
      h = '#' + m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('')
      hexCache.set(c, h)
    }
    return h
  }

  function drawChrome(t: number) {
    const chromeIn = ease.outCubic(clamp(t / 0.9))
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba('#EEF4F1', 0.45 * chromeIn)
    cropMarks(ctx, pad * 0.45, pad * 0.45, W - pad * 0.9, H - pad * 0.9, small ? 7 : 10)
    const hs = small ? 8.5 : 10
    const hy = pad + (small ? 4 : 6)
    ctx.globalAlpha = chromeIn
    ctx.strokeStyle = C.sky
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, 'FIG. M.02', pad + 26, hy, { size: hs, color: C.sky, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const figW = ctx.measureText('FIG. M.02').width
    text(ctx, small || W < 560 ? 'DIFFUSION' : 'REVERSE DIFFUSION · DDIM SAMPLER', pad + 26 + figW + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    const lt = t % (CYCLE * 4)
    const tc = `T ${String(Math.floor(lt / 60)).padStart(2, '0')}:${(lt % 60).toFixed(2).padStart(5, '0')}`
    text(ctx, tc, W - pad, hy, { size: hs, color: k.muted, align: 'right', tracking: 0.12 })
    // the formula
    const fs = small ? 14 : clamp(W * 0.016, 17, 24)
    formula(pad, hy + fs + (small ? 6 : 12), fs)
    // the step counter
    const big = small ? 20 : clamp(W * 0.03, 28, 46)
    const cyy = hy + fs + (small ? 6 : 12) + big + (small ? 4 : 16)
    if (!small || !portrait) {
      setFont(ctx, { size: big, weight: 400, tracking: 0.02 })
      text(ctx, 't', pad, cyy, { font: 'serif', size: big, italic: true, color: k.ink2 })
      setFont(ctx, { font: 'serif', size: big, italic: true })
      const tW = ctx.measureText('t ').width
      text(ctx, String(tStep).padStart(4, '0'), pad + tW, cyy, { size: big * 0.82, weight: 400, color: tStep === 0 ? C.sky : k.ink, tracking: 0.04 })
      if (!small) {
        const lines = [
          scrub ? 'SCRUB  ε HELD FIXED (DDIM, η = 0)' : paused ? 'PAUSED · SPACE TO RESUME' : phase === 'forward' ? 'FORWARD  q(xₜ | x₀)' : phase === 'hold' ? 'SAMPLE  t = 0' : 'REVERSE  pθ(xₜ₋₁ | xₜ)',
          `ᾱ ${ABAR[tStep].toFixed(4)}   SNR ${tStep === 0 ? '∞' : (ABAR[tStep] / Math.max(1e-6, 1 - ABAR[tStep])).toFixed(ABAR[tStep] > 0.99 ? 0 : 3)}`,
          `η ${ETA} · ${N} PARTICLES · T ${T}`,
        ]
        lines.forEach((l, i) => text(ctx, l, pad, cyy + 22 + i * 15, { size: 9, color: i === 0 ? k.ink : k.muted, tracking: 0.12 }))
      }
    }
    // caption
    const capY = H - pad * 0.62
    const cap = small ? `FIG. M.02 — SAMPLE ${String(ci + 1).padStart(2, '0')} / 04` : `FIG. M.02 — REVERSE DIFFUSION, COSINE SCHEDULE · SAMPLE ${String(ci + 1).padStart(2, '0')} OF 04 — ${shapeName()}`
    setFont(ctx, { size: small ? 8 : 9.5, tracking: 0.14 })
    const maxW = portrait ? W - pad * 2 : sched.x - pad - 16
    const capS = ctx.measureText(cap).width < maxW ? cap : `FIG. M.02 — SAMPLE ${String(ci + 1).padStart(2, '0')} OF 04`
    text(ctx, capS, pad, capY, { size: small ? 8 : 9.5, color: k.muted, tracking: 0.14 })
    ctx.globalAlpha = 1
  }

  function shapeName() {
    return ['MONOGRAM', 'FLOWER', 'BIRD IN FLIGHT', 'WORDMARK'][ci]
  }

  function formula(x0: number, y0: number, size: number) {
    let px = x0
    const col = k.ink
    const put = (s: string, o: { italic?: boolean; sub?: boolean } = {}) => {
      const sz = o.sub ? size * 0.6 : size
      setFont(ctx, { font: 'serif', size: sz, italic: o.italic })
      ctx.fillStyle = col
      ctx.fillText(s, px, y0 + (o.sub ? size * 0.2 : 0))
      px += ctx.measureText(s).width
    }
    const radical = (inner: () => void) => {
      const r0 = px
      px += size * 0.5
      inner()
      const end = px
      ctx.strokeStyle = col
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(r0, y0 - size * 0.36)
      ctx.lineTo(r0 + size * 0.1, y0 - size * 0.42)
      ctx.lineTo(r0 + size * 0.26, y0 + size * 0.04)
      ctx.lineTo(r0 + size * 0.44, y0 - size * 0.8)
      ctx.lineTo(end + size * 0.06, y0 - size * 0.8)
      ctx.stroke()
      px += size * 0.1
    }
    put('x', { italic: true })
    put('t', { italic: true, sub: true })
    put(' = ')
    radical(() => {
      put('ᾱ', { italic: true })
      put('t', { italic: true, sub: true })
    })
    put('x', { italic: true })
    put('0', { sub: true })
    put(' + ')
    radical(() => {
      put('1 − ')
      put('ᾱ', { italic: true })
      put('t', { italic: true, sub: true })
    })
    put('ε', { italic: true })
  }

  /** Until the viewer has tried it: a ghost of the drag along the time axis, during the hold. */
  function drawHint(t: number) {
    if (preview || interacted || phase !== 'hold') return
    const a = Math.min(clamp((cycT - REVERSE - 0.5) / 0.4), 1 - clamp((cycT - REVERSE - HOLD + 0.3) / 0.3))
    if (a <= 0) return
    const { x: sx, y: sy, w, h } = sched
    if (w < 60) return
    const yy = sy + h + 8
    const u = 0.5 + 0.5 * Math.sin(t * 2.2)
    ctx.globalAlpha = a
    ctx.strokeStyle = rgba('#EEF4F1', 0.6)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(sx, yy)
    ctx.lineTo(sx + w * 0.6, yy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = C.sky
    ctx.beginPath()
    ctx.arc(sx + w * 0.6 * u, yy, 2.6, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    const s = W < 700 ? 'DRAG ← → TO SCRUB t' : 'DRAG ← → ANYWHERE TO SCRUB THE NOISE LEVEL'
    text(ctx, s, sx + w, sy - (small ? 8 : 24), { size: 8.5, color: k.ink2, align: 'right', tracking: 0.14, alpha: a })
  }

  function drawSchedule() {
    const { x: sx, y: sy, w, h } = sched
    if (w < 60) return
    ctx.strokeStyle = rgba('#EEF4F1', 0.35)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(sx) + 0.5, sy)
    ctx.lineTo(Math.round(sx) + 0.5, Math.round(sy + h) + 0.5)
    ctx.lineTo(sx + w, Math.round(sy + h) + 0.5)
    ctx.stroke()
    const X = (t: number) => sx + (t / T) * w
    const Y = (v: number) => sy + h - v * h
    // √ᾱ (signal) and √(1 − ᾱ) (noise)
    ctx.lineWidth = 1.25
    ctx.strokeStyle = C.sky
    ctx.beginPath()
    for (let t = 0; t <= T; t += 10) (t ? ctx.lineTo : ctx.moveTo).call(ctx, X(t), Y(Math.sqrt(ABAR[t])))
    ctx.stroke()
    ctx.strokeStyle = rgba('#EEF4F1', 0.6)
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    for (let t = 0; t <= T; t += 10) (t ? ctx.lineTo : ctx.moveTo).call(ctx, X(t), Y(Math.sqrt(1 - ABAR[t])))
    ctx.stroke()
    ctx.setLineDash([])
    // playhead
    const px = X(tStep)
    ctx.strokeStyle = rgba('#EEF4F1', 0.8)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(px) + 0.5, sy - 4)
    ctx.lineTo(Math.round(px) + 0.5, sy + h + 4)
    ctx.stroke()
    ctx.fillStyle = C.sky
    ctx.beginPath()
    ctx.arc(px, Y(Math.sqrt(ABAR[tStep])), 2.6, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#EEF4F1'
    ctx.beginPath()
    ctx.arc(px, Y(Math.sqrt(1 - ABAR[tStep])), 2.2, 0, TAU)
    ctx.fill()
    // the playhead's handle: drag it (full mode)
    if (!preview) {
      const hyy = sy + h + 4
      const r = hoverChart || dragging ? 5 : 4
      ctx.beginPath()
      ctx.moveTo(px, hyy)
      ctx.lineTo(px + r, hyy + r)
      ctx.lineTo(px, hyy + r * 2)
      ctx.lineTo(px - r, hyy + r)
      ctx.closePath()
      ctx.fillStyle = dragging ? C.sky : '#0E222A'
      ctx.fill()
      ctx.strokeStyle = rgba('#EEF4F1', hoverChart || dragging ? 0.95 : 0.7)
      ctx.lineWidth = 1
      ctx.stroke()
    }
    if (!small) {
      setFont(ctx, { size: 8.5, tracking: 0.14 })
      const title = ctx.measureText('COSINE SCHEDULE · s 0.008').width + ctx.measureText('√ᾱ SIGNAL').width + 16 < w ? 'COSINE SCHEDULE · s 0.008' : 'COSINE SCHEDULE'
      text(ctx, title, sx, sy - 8, { size: 8.5, color: k.muted, tracking: 0.14 })
      text(ctx, '√ᾱ SIGNAL', sx + w, sy - 8, { size: 8.5, color: C.sky, align: 'right', tracking: 0.12 })
      text(ctx, '√(1−ᾱ) NOISE', sx + w, sy + 12, { size: 8.5, color: k.ink2, align: 'right', tracking: 0.12 })
      text(ctx, '0', sx, sy + h + 15, { size: 8, color: k.muted, tracking: 0.04 })
      text(ctx, 't 1000', sx + w, sy + h + 15, { size: 8, color: k.muted, align: 'right', tracking: 0.08 })
    }
  }

  function drawInset() {
    const { x: ix, y: iy, s } = inset
    if (s < 40) return
    ctx.strokeStyle = rgba('#EEF4F1', 0.4)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(ix) + 0.5, Math.round(iy) + 0.5, Math.round(s), Math.round(s))
    predict()
    const label = phase === 'reverse' || scrub ? 'x̂₀ = E[x₀ | xₜ]' : 'SAMPLE x₀'
    text(ctx, label, ix, iy - 7, { size: 8.5, color: k.muted, tracking: 0.14 })
    const sc = (s * 0.42) / DATA
    const mx = ix + s / 2
    const my = iy + s / 2
    const p = new Path2D()
    const useHat = phase === 'reverse' || scrub
    for (let i = 0; i < K; i++) {
      const vx = useHat ? hx[i] : cur.xy[i * 2]
      const vy = useHat ? hy[i] : cur.xy[i * 2 + 1]
      const X = mx + vx * sc
      const Y = my - vy * sc
      if (X < ix || X > ix + s || Y < iy || Y > iy + s) continue
      p.rect(X - 0.75, Y - 0.75, 1.5, 1.5)
    }
    ctx.fillStyle = rgba('#EEF4F1', 0.85)
    ctx.fill(p)
    text(ctx, 'IDEAL DENOISER', ix + s, iy + s + 13, { size: 8, color: k.muted, align: 'right', tracking: 0.12 })
  }

  layout(env.width, env.height)
  // test route: &scrub=t holds the particles at that noise level
  {
    const v = Number(env.params.get('scrub'))
    if (env.params.get('scrub') !== null && Number.isFinite(v)) {
      startScrub(clamp(v, 0, T))
      dragging = true
    }
  }

  const onChart = (X: number, Y: number, touch: boolean) => {
    const m = touch ? 16 : 8
    return X > sched.x - m && X < sched.x + sched.w + m && Y > sched.y - m && Y < sched.y + sched.h + 16 + m
  }
  const KEYS = ['ArrowLeft', 'ArrowRight', 'KeyN', 'Space']

  return {
    resize(w, h) {
      layout(w, h)
    },
    frame,
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      hoverChart = !touch && onChart(p.x, p.y, touch)
      if (p.type === 'down') {
        const chart = onChart(p.x, p.y, touch)
        dragFrom = { x: p.x, t: chart ? clamp(((p.x - sched.x) / sched.w) * T, 0, T) : tStep, chart }
        dragging = true
        startScrub(dragFrom.t)
        if (!chart) scrubT = tStep
      } else if (p.type === 'move' && dragging && p.pressed) {
        scrubT = dragFrom.chart ? clamp(((p.x - sched.x) / sched.w) * T, 0, T) : clamp(dragFrom.t + ((p.x - dragFrom.x) / (W * 0.7)) * T, 0, T)
      } else if (p.type === 'up' || p.type === 'leave') {
        if (dragging) {
          dragging = false
          manual = 0.35
        }
        if (p.type === 'leave') hoverChart = false
      }
    },
    key(code, isDown) {
      if (!KEYS.includes(code)) return false
      if (!isDown) return true
      interacted = true
      if (code === 'Space') paused = !paused
      else if (code === 'KeyN') skip()
      else {
        startScrub(scrub ? scrubT : tStep)
        scrubT = clamp(scrubT + (code === 'ArrowRight' ? 25 : -25), 0, T)
        manual = 2.5
      }
      return true
    },
  }
}

export default create
