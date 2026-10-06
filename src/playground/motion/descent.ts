/*
 * FIG. M.07 — DESCENT. Three optimisers race down a loss landscape drawn as
 * a topographic plate: contour hairlines from marching squares (quadratic
 * contour interval, every fifth an index contour with a level label), the
 * lowest basin hatched like water. SGD, Momentum and Adam start from the
 * same θ₀ and are run for real on finite-difference gradients; each leaves
 * a trail of step markers (dense where it is slow) and draws its loss on
 * the chart below. When they settle, the minima get their rings — then the
 * contours flow into the next landscape and the race restarts.
 *
 *   A  local minimum — SGD and Adam settle in the first basin; Momentum
 *      carries through it to the global minimum
 *   B  saddle        — a flat ridge: SGD idles on the plateau, Adam escapes
 *   C  ravine        — an ill-conditioned curved valley: SGD zigzags
 *
 * Each landscape is a 12 s cycle (36 s loop).
 *
 * Interaction (full mode): click or tap the map to drop your own θ₀ — the
 * three optimisers rerun from there and the landscape holds while you
 * explore. ← → change landscape, Space or R reruns from the default start.
 */

import { angleDiff, C, clamp, cropMarks, ease, fract, inkOn, lerp, rgba, setFont, TAU, text } from '../kit'
import type { CreatePiece } from '../types'

/* -------------------------------------------------------------- landscapes */

const G = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((y - cy) ** 2) / (2 * sy * sy))

interface Land {
  key: string
  name: string
  note: string
  f: (x: number, y: number) => number
  start: [number, number]
  hp: { sgd: number; mom: number; beta: number; adam: number }
  /** extra annotated points (e.g. a saddle) */
  marks?: { x: number; y: number; label: string }[]
}

const LANDS: Land[] = [
  {
    key: 'A',
    name: 'Local minimum',
    note: 'SGD AND ADAM SETTLE IN THE FIRST BASIN · MOMENTUM CARRIES THROUGH',
    f: (x, y) =>
      0.9 * (y - (0.42 * x * x - 0.55)) ** 2 + 0.1 * (x - 1.25) ** 2 - 0.42 * G(x, y, -1.05, -0.09, 0.2, 0.2) + 0.35 * G(x, y, 0.25, 0.75, 0.45, 0.3) - 0.9 * G(x, y, 1.25, 0.1, 0.35, 0.3),
    start: [-1.75, 1.05],
    hp: { sgd: 0.12, mom: 0.03, beta: 0.9, adam: 0.04 },
  },
  {
    key: 'B',
    name: 'Saddle',
    note: 'A SADDLE POINT · SGD IDLES WHERE ∇L ≈ 0, ADAM NORMALISES ITS WAY OFF',
    f: (x, y) => 0.42 * (x * x - 1) ** 2 + 0.9 * y ** 2 - 0.012 * x + 0.18 * G(x, y, 0, -0.95, 0.6, 0.3),
    start: [0.0008, 1.15],
    hp: { sgd: 0.05, mom: 0.015, beta: 0.9, adam: 0.03 },
    marks: [{ x: 0, y: 0, label: 'SADDLE · ∇L = 0' }],
  },
  {
    key: 'C',
    name: 'Ravine',
    note: 'ILL-CONDITIONED · SGD ZIGZAGS ACROSS THE WALLS, MOMENTUM RUNS THE FLOOR',
    f: (x, y) => 0.06 * (x + 1.6) ** 2 + 1.8 * (y - 0.35 * Math.sin(1.4 * x)) ** 2,
    start: [1.8, -0.6],
    hp: { sgd: 0.42, mom: 0.03, beta: 0.9, adam: 0.06 },
  },
]

const OPT = [
  { key: 'sgd', name: 'SGD', color: C.ocean },
  { key: 'mom', name: 'MOMENTUM', color: C.lagoon },
  { key: 'adam', name: 'ADAM', color: C.moss },
] as const

const STEPS = 200
const CYCLE = 12
const RUN0 = 1.6
const RUN1 = 9.6
const MORPH = 1.4
/** loss below which the global basin is hatched, like water */
const HATCH = 0.035

interface Run {
  xs: Float32Array
  ys: Float32Array
  /** loss above the landscape's global minimum */
  loss: Float32Array
  gx: Float32Array
  gy: Float32Array
  settle: number
  outcome: 'global' | 'local' | 'moving'
}

const FD = 1e-4
function grad(f: Land['f'], x: number, y: number): [number, number] {
  return [(f(x + FD, y) - f(x - FD, y)) / (2 * FD), (f(x, y + FD) - f(x, y - FD)) / (2 * FD)]
}

/** The three optimisers, for real. */
function runAll(L: Land, fmin: number, start: [number, number] = L.start): Run[] {
  return OPT.map((o) => {
    const xs = new Float32Array(STEPS + 1)
    const ys = new Float32Array(STEPS + 1)
    const loss = new Float32Array(STEPS + 1)
    const gxs = new Float32Array(STEPS + 1)
    const gys = new Float32Array(STEPS + 1)
    let [x, y] = start
    let vx = 0
    let vy = 0
    let m1x = 0
    let m1y = 0
    let m2x = 0
    let m2y = 0
    for (let t = 0; t <= STEPS; t++) {
      const [gx, gy] = grad(L.f, x, y)
      xs[t] = x
      ys[t] = y
      loss[t] = Math.max(0, L.f(x, y) - fmin)
      gxs[t] = gx
      gys[t] = gy
      if (t === STEPS) break
      if (o.key === 'sgd') {
        x -= L.hp.sgd * gx
        y -= L.hp.sgd * gy
      } else if (o.key === 'mom') {
        vx = L.hp.beta * vx + gx
        vy = L.hp.beta * vy + gy
        x -= L.hp.mom * vx
        y -= L.hp.mom * vy
      } else {
        const k = t + 1
        m1x = 0.9 * m1x + 0.1 * gx
        m1y = 0.9 * m1y + 0.1 * gy
        m2x = 0.999 * m2x + 0.001 * gx * gx
        m2y = 0.999 * m2y + 0.001 * gy * gy
        const bc1 = 1 - Math.pow(0.9, k)
        const bc2 = 1 - Math.pow(0.999, k)
        x -= (L.hp.adam * (m1x / bc1)) / (Math.sqrt(m2x / bc2) + 1e-8)
        y -= (L.hp.adam * (m1y / bc1)) / (Math.sqrt(m2y / bc2) + 1e-8)
      }
    }
    // settled: the last step after which it never moves more than a hair
    let settle = STEPS
    for (let t = STEPS; t > 4; t--) {
      if (Math.hypot(xs[t] - xs[t - 4], ys[t] - ys[t - 4]) > 0.006) {
        settle = Math.min(STEPS, t + 1)
        break
      }
    }
    const outcome = loss[STEPS] < 0.01 ? 'global' : settle < STEPS - 2 ? 'local' : 'moving'
    return { xs, ys, loss, gx: gxs, gy: gys, settle, outcome }
  })
}

/* --------------------------------------------------------- marching squares */

/**
 * Contour every level of a (cols+1)×(rows+1) grid of values into per-level
 * Path2Ds (screen space: grid point (i, j) is at (x0 + i·cell, y0 + j·cell)).
 * Also collects segment midpoints/angles for `keep` levels (labels).
 */
function contour(v: Float32Array, cols: number, rows: number, x0: number, y0: number, cell: number, levels: number[], keep?: Set<number>, segs?: Map<number, number[]>) {
  const paths = levels.map(() => new Path2D())
  const W = cols + 1
  const nl = levels.length
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = v[j * W + i]
      const b = v[j * W + i + 1]
      const c = v[(j + 1) * W + i + 1]
      const d = v[(j + 1) * W + i]
      let lo = a
      let hi = a
      if (b < lo) lo = b
      else if (b > hi) hi = b
      if (c < lo) lo = c
      else if (c > hi) hi = c
      if (d < lo) lo = d
      else if (d > hi) hi = d
      if (hi < levels[0] || lo > levels[nl - 1]) continue
      const X = x0 + i * cell
      const Y = y0 + j * cell
      for (let k = 0; k < nl; k++) {
        const L = levels[k]
        if (L < lo || L >= hi) continue
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0)
        if (idx === 0 || idx === 15) continue
        const p = paths[k]
        // edge points
        const tx = X + ((L - a) / (b - a)) * cell
        const ry = Y + ((L - b) / (c - b)) * cell
        const bx = X + ((L - d) / (c - d)) * cell
        const ly = Y + ((L - a) / (d - a)) * cell
        const seg = (x1: number, y1: number, x2: number, y2: number) => {
          p.moveTo(x1, y1)
          p.lineTo(x2, y2)
          if (keep?.has(k)) segs?.get(k)?.push((x1 + x2) / 2, (y1 + y2) / 2, Math.atan2(y2 - y1, x2 - x1))
        }
        switch (idx) {
          case 1:
          case 14:
            seg(X, ly, bx, Y + cell)
            break
          case 2:
          case 13:
            seg(bx, Y + cell, X + cell, ry)
            break
          case 3:
          case 12:
            seg(X, ly, X + cell, ry)
            break
          case 4:
          case 11:
            seg(tx, Y, X + cell, ry)
            break
          case 6:
          case 9:
            seg(tx, Y, bx, Y + cell)
            break
          case 7:
          case 8:
            seg(X, ly, tx, Y)
            break
          case 5:
          case 10: {
            const centre = (a + b + c + d) / 4 > L
            // 5: b,d above · 10: a,c above
            if ((idx === 5) === centre) {
              seg(X, ly, tx, Y)
              seg(bx, Y + cell, X + cell, ry)
            } else {
              seg(tx, Y, X + cell, ry)
              seg(X, ly, bx, Y + cell)
            }
            break
          }
        }
      }
    }
  }
  return paths
}

/** Hatch where the grid value is below `th`: 45° scanlines, sampled along their length. */
function hatchBelow(v: Float32Array, cols: number, rows: number, x0: number, y0: number, cell: number, th: number, gap: number, box: [number, number, number, number]) {
  const p = new Path2D()
  const W = cols + 1
  const val = (x: number, y: number) => {
    const fi = clamp((x - x0) / cell, 0, cols - 0.001)
    const fj = clamp((y - y0) / cell, 0, rows - 0.001)
    const i = Math.floor(fi)
    const j = Math.floor(fj)
    const u = fi - i
    const w = fj - j
    const a = v[j * W + i]
    const b = v[j * W + i + 1]
    const c = v[(j + 1) * W + i + 1]
    const d = v[(j + 1) * W + i]
    return (a * (1 - u) + b * u) * (1 - w) + (d * (1 - u) + c * u) * w
  }
  const [bx0, by0, bx1, by1] = box
  if (bx1 <= bx0 || by1 <= by0) return p
  const step = cell * 0.6
  // lines x - y = k
  for (let k = bx0 - by1; k <= bx1 - by0; k += gap) {
    const sx = Math.max(bx0, by0 + k)
    const ex = Math.min(bx1, by1 + k)
    let inside = false
    let px = 0
    let pv = 0
    for (let x = sx; x <= ex + 0.001; x += step) {
      const y = x - k
      const cv = val(x, y)
      const now = cv < th
      if (now !== inside) {
        // refine the crossing linearly
        const f = x > sx ? (th - pv) / (cv - pv) : 0
        const cx = x > sx ? px + (x - px) * f : x
        if (now) p.moveTo(cx, cx - k)
        else p.lineTo(cx, cx - k)
        inside = now
      }
      px = x
      pv = cv
    }
    if (inside) p.lineTo(px, px - k)
  }
  return p
}

/* ------------------------------------------------------------------ piece */

interface Prepared {
  vals: Float32Array
  fmin: number
  /** the current race (default, or from a θ₀ the viewer dropped) */
  runs: Run[]
  start: [number, number]
  /** the default race from the landscape's own θ₀ */
  base: Run[]
  /** an open spot for the ghost demonstration of the click (screen px) */
  ghost: [number, number]
  minima: { x: number; y: number; loss: number; global: boolean }[]
  paths: Path2D[]
  hatch: Path2D
  labels: { x: number; y: number; ang: number; s: string }[]
  hatchBox: [number, number, number, number]
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const NLEV = preview ? 17 : 26
  // ?land=A|B|C starts the loop on that landscape (for the test route)
  const landOffset = Math.max(0, LANDS.findIndex((l) => l.key === (env.params.get('land') ?? 'A').toUpperCase())) * CYCLE

  let W = env.width
  let H = env.height
  let rot = false
  let s = 100
  let cx = 0
  let cy = 0
  let pad = 20
  let small = false
  let cell = 8
  let cols = 1
  let rows = 1
  let topBand = 0
  let chart = { x: 0, y: 0, w: 0, h: 0 }
  let legend = { x: 0, y: 0, w: 0, colW: 0, rows: false }
  let levels: number[] = []
  let maxLevel = 1
  let preps: Prepared[] = []
  let mixVals = new Float32Array(1)
  let layer: HTMLCanvasElement | null = null
  let layerCtx: CanvasRenderingContext2D | null = null
  let layerFor = -1
  const userStart: ([number, number] | null)[] = LANDS.map(() => null)
  let morphPaths: Path2D[] | null = null
  let morphAt = -1
  let morphCi = -1

  /* ---------------------------------------------------------- interaction */
  // the piece keeps its own clock: switching landscape, rerunning and holding move it
  const LOOPLEN = CYCLE * LANDS.length
  let clock = landOffset
  let lastCi = -1
  let morphFrom = LANDS.length - 1
  let switched = false
  let holdUntil = -1
  let lastT = 0
  let interacted = false
  let hover: { x: number; y: number } | null = null
  let down: { x: number; y: number } | null = null

  /** Screen → θ (inverse of toX / toY). */
  const fromScreen = (X: number, Y: number): [number, number] => (rot ? [(Y - cy) / s, (X - cx) / s] : [(X - cx) / s, (cy - Y) / s])

  /** Is (X, Y) on the map itself, clear of the chart and the header? */
  function onMap(X: number, Y: number) {
    if (X < pad * 0.6 || X > W - pad * 0.6 || Y < topBand - 18 || Y > H - pad * 0.62 - 14) return false
    if (X > chart.x - 10 && X < chart.x + chart.w + 10 && Y > chart.y - 20 && Y < chart.y + chart.h + 16) return false
    if (legend.rows && !small && X > legend.x - 6 && Y < legend.y + 60) return false
    const [x, y] = fromScreen(X, Y)
    return Math.abs(x) < 2.4 && Math.abs(y) < 1.5
  }

  const cycleBase = () => Math.floor(clock / LOOPLEN) * LOOPLEN

  /** Rerun the race on the current landscape from θ₀ (or its default start). */
  function rerun(start: [number, number] | null) {
    const ci = Math.floor((clock % LOOPLEN) / CYCLE)
    const p = preps[ci]
    const L = LANDS[ci]
    if (start) {
      p.start = [clamp(start[0], -2.3, 2.3), clamp(start[1], -1.45, 1.45)]
      p.runs = runAll(L, p.fmin, p.start)
      userStart[ci] = p.start
      // the race takes ~9.8 s from here; then hold the settled result for 8 s more
      holdUntil = lastT + (RUN1 + 1.4 - RUN0 + 0.35) + 8
    } else {
      p.start = [L.start[0], L.start[1]]
      p.runs = p.base
      userStart[ci] = null
    }
    clock = cycleBase() + ci * CYCLE + RUN0 - 0.35
    if (lastCi < 0) lastCi = ci
    env.sfx.tone(392, 0.25, { type: 'sine', gain: 0.05, room: 0.3 })
  }

  function switchLand(dir: number) {
    const ci = Math.floor((clock % LOOPLEN) / CYCLE)
    const next = (ci + dir + LANDS.length) % LANDS.length
    clock = cycleBase() + next * CYCLE
    switched = true
    holdUntil = -1
  }

  const toX = (x: number, y: number) => (rot ? cx + y * s : cx + x * s)
  const toY = (x: number, y: number) => (rot ? cy + x * s : cy - y * s)

  function layout(w: number, h: number) {
    W = w
    H = h
    rot = h > w * 1.08
    small = preview || Math.min(w, h) < 380 || (!rot && w < 600)
    pad = clamp(Math.min(w, h) * 0.05, 14, 44)
    const capBand = small ? 22 : 34
    // short frames: the map runs under the (haloed) header to use the height
    const short = !preview && !rot && h < 360
    if (!rot) {
      topBand = pad + (short ? 22 : small ? 46 : 84)
      const chartW = small ? 120 : clamp(w * 0.22, 220, 320)
      const chartH = small ? 46 : clamp(h * 0.15, 90, 140)
      chart = { x: w - pad - chartW, y: h - pad * 0.62 - chartH - (small ? 4 : 10), w: chartW, h: chartH }
      if (small) legend = { x: w - pad, y: pad + 6, w: 0, colW: 0, rows: true }
      else if (w >= 1100) {
        // three columns between the title and the timecode
        const lx = Math.max(pad + 440, w * 0.42)
        legend = { x: lx, y: pad + 6, w: 0, colW: Math.min(200, (w - pad - 130 - lx) / 3), rows: false }
      } else {
        // narrower: rows under the timecode
        const lw = Math.min(330, w * 0.42)
        legend = { x: w - pad - lw, y: pad + 30, w: lw, colW: 0, rows: true }
        topBand = Math.max(topBand, pad + 104)
      }
      const bottom = h - (short ? 14 : capBand + pad * 0.62)
      const coreH = Math.max(60, bottom - topBand)
      const coreW = w - pad * 2
      s = Math.min(coreW / 4.3, coreH / 2.65)
      cx = pad + coreW / 2
      cy = topBand + coreH / 2
    } else {
      topBand = pad + (small ? 46 : 150)
      const chartW = w - pad * 2 - (small ? 0 : 26)
      const chartH = small ? 50 : clamp(h * 0.12, 70, 120)
      chart = { x: pad + (small ? 0 : 26), y: h - pad * 0.62 - capBand - chartH, w: chartW, h: chartH }
      const bottom = chart.y - 26
      const coreH = Math.max(60, bottom - topBand)
      const coreW = w - pad * 2
      s = Math.min(coreW / 2.65, coreH / 4.3)
      cx = pad + coreW / 2
      cy = topBand + coreH / 2
      legend = { x: pad, y: pad + 74, w: w - pad * 2, colW: 0, rows: true }
    }
    // the contour grid covers the whole frame
    cell = preview ? 7 : clamp(Math.round(Math.max(w, h) / 165), 6, 10)
    cols = Math.ceil(w / cell)
    rows = Math.ceil(h / cell)
    mixVals = new Float32Array((cols + 1) * (rows + 1))
    preps = LANDS.map((L) => prepare(L))
    // a θ₀ the viewer dropped survives a resize
    preps.forEach((p, i) => {
      const u = userStart[i]
      if (u) {
        p.start = [u[0], u[1]]
        p.runs = runAll(LANDS[i], p.fmin, p.start)
      }
    })
    layerFor = -1
  }

  function prepare(L: Land): Prepared {
    const n = (cols + 1) * (rows + 1)
    const vals = new Float32Array(n)
    // global minimum over a fine core search
    let fmin = Infinity
    for (let i = 0; i <= 200; i++)
      for (let j = 0; j <= 125; j++) {
        const v = L.f(-2.1 + (4.2 * i) / 200, -1.3 + (2.6 * j) / 125)
        if (v < fmin) fmin = v
      }
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const X = i * cell
        const Y = j * cell
        const x = rot ? (Y - cy) / s : (X - cx) / s
        const y = rot ? (X - cx) / s : (cy - Y) / s
        vals[j * (cols + 1) + i] = L.f(x, y) - fmin
      }
    const runs = runAll(L, fmin)
    // minima: grid points lower than a 5×5 neighbourhood, refined by descent
    const minima: Prepared['minima'] = []
    const Wd = cols + 1
    for (let j = 2; j < rows - 1; j++)
      for (let i = 2; i < cols - 1; i++) {
        const v = vals[j * Wd + i]
        let isMin = true
        for (let dj = -2; dj <= 2 && isMin; dj++) for (let di = -2; di <= 2; di++) if ((di || dj) && vals[(j + dj) * Wd + i + di] <= v) isMin = false
        if (!isMin) continue
        let x = rot ? (j * cell - cy) / s : (i * cell - cx) / s
        let y = rot ? (i * cell - cx) / s : (cy - j * cell) / s
        if (Math.abs(x) > 2.2 || Math.abs(y) > 1.4) continue
        for (let k = 0; k < 400; k++) {
          const [gx, gy] = grad(L.f, x, y)
          x -= 0.05 * gx
          y -= 0.05 * gy
        }
        const loss = L.f(x, y) - fmin
        if (!minima.some((m) => Math.hypot(m.x - x, m.y - y) < 0.05)) minima.push({ x, y, loss, global: false })
      }
    minima.sort((a, b) => a.loss - b.loss)
    if (minima.length) minima[0].global = true
    // levels: quadratic interval up to the frame's core
    const keep = new Set<number>()
    levels.forEach((_, k) => (k + 1) % 5 === 0 && keep.add(k))
    const segs = new Map<number, number[]>()
    keep.forEach((k) => segs.set(k, []))
    const paths = contour(vals, cols, rows, 0, 0, cell, levels, keep, segs)
    // labels: on each index contour, the segment nearest a ray from the global minimum
    const labels: Prepared['labels'] = []
    if (minima.length && !small) {
      const g = minima[0]
      const gx = toX(g.x, g.y)
      const gy = toY(g.x, g.y)
      // the ray that keeps clearest of the three trails
      let ray = rot ? Math.PI * 0.62 : -Math.PI * 0.3
      let bestPen = Infinity
      for (let q = 0; q < 24; q++) {
        const ang = (q / 24) * TAU
        const ux = Math.cos(ang)
        const uy = Math.sin(ang)
        let pen = Math.abs(angleDiff(ang, ray)) * 2
        for (const r of runs)
          for (let i = 0; i <= STEPS; i += 2) {
            const dx = toX(r.xs[i], r.ys[i]) - gx
            const dy = toY(r.xs[i], r.ys[i]) - gy
            const along = dx * ux + dy * uy
            if (along < 10 || along > 360) continue
            if (Math.abs(dx * uy - dy * ux) < 26) pen += 1
          }
        // stay inside the plate, away from the chart
        for (let d = 40; d <= 320; d += 40) {
          const px = gx + ux * d
          const py = gy + uy * d
          if (px < pad * 2 || px > W - pad * 2 || py < topBand || py > H - pad * 2.5) pen += 3
          else if (px > chart.x - 20 && py > chart.y - 20) pen += 3
        }
        if (pen < bestPen) {
          bestPen = pen
          ray = ang
        }
      }
      const rx = Math.cos(ray)
      const ry = Math.sin(ray)
      keep.forEach((k) => {
        const arr = segs.get(k) ?? []
        let best = -1
        let bestD = Infinity
        for (let q = 0; q < arr.length; q += 3) {
          const dx = arr[q] - gx
          const dy = arr[q + 1] - gy
          const along = dx * rx + dy * ry
          if (along < 20) continue
          if (arr[q] < pad * 2 || arr[q] > W - pad * 2 || arr[q + 1] < topBand || arr[q + 1] > H - pad * 2.5) continue
          if (arr[q] > chart.x - 30 && arr[q + 1] > chart.y - 46) continue
          const perp = Math.abs(dx * ry - dy * rx)
          if (perp < bestD) {
            bestD = perp
            best = q
          }
        }
        if (best >= 0 && bestD < 40) {
          let ang = arr[best + 2]
          if (ang > Math.PI / 2) ang -= Math.PI
          if (ang < -Math.PI / 2) ang += Math.PI
          labels.push({ x: arr[best], y: arr[best + 1], ang, s: levels[k] < 1 ? levels[k].toFixed(2) : levels[k].toFixed(1) })
        }
      })
    }
    // hatch the lowest basin(s)
    let bx0 = Infinity
    let by0 = Infinity
    let bx1 = -Infinity
    let by1 = -Infinity
    const th = HATCH
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++)
        if (vals[j * Wd + i] < th) {
          bx0 = Math.min(bx0, i * cell)
          bx1 = Math.max(bx1, i * cell)
          by0 = Math.min(by0, j * cell)
          by1 = Math.max(by1, j * cell)
        }
    const hatchBox: [number, number, number, number] = [bx0 - cell, by0 - cell, bx1 + cell, by1 + cell]
    const hatch = hatchBelow(vals, cols, rows, 0, 0, cell, th, small ? 4 : 5, hatchBox)
    // the ghost demo's spot: the open point farthest from every trail
    let ghost: [number, number] = [W * 0.5, H * 0.5]
    let best = -1
    const blocked = staticRects()
    for (let gy = 0; gy <= 8; gy++)
      for (let gx = 0; gx <= 12; gx++) {
        const X = pad * 2 + ((W - pad * 4) * gx) / 12
        const Y = topBand + 20 + ((H - topBand - pad * 3 - 40) * gy) / 8
        if (blocked.some((b) => X > b[0] - 30 && X < b[0] + b[2] + 30 && Y > b[1] - 30 && Y < b[1] + b[3] + 30)) continue
        if (X > W - pad - 230) continue
        let d = Infinity
        for (const r of runs) for (let i = 0; i <= STEPS; i += 4) d = Math.min(d, Math.hypot(toX(r.xs[i], r.ys[i]) - X, toY(r.xs[i], r.ys[i]) - Y))
        for (const m of minima) d = Math.min(d, Math.hypot(toX(m.x, m.y) - X, toY(m.x, m.y) - Y))
        if (d > best) {
          best = d
          ghost = [X, Y]
        }
      }
    return { vals, fmin, runs, start: [L.start[0], L.start[1]], base: runs, ghost, minima, paths, hatch, labels, hatchBox }
  }

  function setLevels() {
    // a quadratic contour interval: evenly spaced rings in a bowl
    maxLevel = 4.6
    levels = Array.from({ length: NLEV }, (_, k) => maxLevel * Math.pow((k + 1) / NLEV, 2))
  }
  setLevels()
  layout(env.width, env.height)
  // test route: &drop=x,y reruns from that θ₀; &hover=X,Y shows the pointer readout at those CSS px
  {
    const d = env.params.get('drop')?.split(',').map(Number)
    if (d && d.length === 2 && d.every(Number.isFinite)) {
      interacted = true
      rerun([d[0], d[1]])
    }
    const h = env.params.get('hover')?.split(',').map(Number)
    if (h && h.length === 2 && h.every(Number.isFinite)) {
      interacted = true
      hover = { x: h[0], y: h[1] }
    }
  }

  /* ------------------------------------------------------------ drawing */

  function drawContours(paths: Path2D[], alpha: number, reveal: number, g: CanvasRenderingContext2D = ctx) {
    g.lineCap = 'round'
    for (let k = 0; k < paths.length; k++) {
      const a = alpha * clamp(reveal * (NLEV + 4) - k)
      if (a <= 0) continue
      const index = (k + 1) % 5 === 0
      g.lineWidth = index ? 1.15 : 1
      g.strokeStyle = rgba(C.ink, (index ? 0.4 : 0.17) * a)
      g.stroke(paths[k])
    }
    g.lineCap = 'butt'
  }

  // the settled contours are cached in an offscreen layer (one blit per frame)
  function blitContours(ci: number) {
    const dpr = env.dpr || 1
    const pw = Math.max(1, Math.round(W * dpr))
    const ph = Math.max(1, Math.round(H * dpr))
    if (!layer) {
      try {
        layer = document.createElement('canvas')
        layerCtx = layer.getContext('2d')
      } catch {
        layer = null
      }
    }
    if (!layer || !layerCtx) {
      drawContours(preps[ci].paths, 1, 1)
      return
    }
    if (layer.width !== pw || layer.height !== ph || layerFor !== ci) {
      layer.width = pw
      layer.height = ph
      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      layerCtx.clearRect(0, 0, W, H)
      drawContours(preps[ci].paths, 1, 1, layerCtx)
      layerFor = ci
    }
    ctx.drawImage(layer, 0, 0, W, H)
  }

  function marker(kind: number, x: number, y: number, r: number) {
    if (kind === 0) {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, TAU)
    } else if (kind === 1) {
      ctx.moveTo(x + r * 1.25, y)
      ctx.arc(x, y, r * 1.25, 0, TAU)
    } else ctx.rect(x - r, y - r, r * 2, r * 2)
  }

  function drawRun(run: Run, o: number, step: number, alpha: number) {
    const col = OPT[o].color
    const k = Math.floor(step)
    const f = step - k
    const hx = lerp(toX(run.xs[k], run.ys[k]), toX(run.xs[Math.min(STEPS, k + 1)], run.ys[Math.min(STEPS, k + 1)]), f)
    const hy = lerp(toY(run.xs[k], run.ys[k]), toY(run.xs[Math.min(STEPS, k + 1)], run.ys[Math.min(STEPS, k + 1)]), f)
    // trail
    ctx.globalAlpha = alpha
    ctx.strokeStyle = col
    ctx.lineWidth = small ? 1 : 1.25
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(toX(run.xs[0], run.ys[0]), toY(run.xs[0], run.ys[0]))
    for (let i = 1; i <= k; i++) ctx.lineTo(toX(run.xs[i], run.ys[i]), toY(run.xs[i], run.ys[i]))
    ctx.lineTo(hx, hy)
    ctx.stroke()
    ctx.lineJoin = 'miter'
    // step markers
    const r = small ? 1.2 : 1.6
    ctx.beginPath()
    for (let i = 1; i <= k; i++) marker(o, toX(run.xs[i], run.ys[i]), toY(run.xs[i], run.ys[i]), r)
    if (o === 1) {
      ctx.lineWidth = 1
      ctx.stroke()
    } else {
      ctx.fillStyle = col
      ctx.fill()
    }
    // head + −∇ arrow
    ctx.beginPath()
    marker(o, hx, hy, r * 2)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.stroke()
    const gx = run.gx[k]
    const gy = run.gy[k]
    const gn = Math.hypot(gx, gy)
    if (gn > 1e-3 && step < run.settle) {
      // screen direction of −∇
      const ex = toX(run.xs[k] - gx, run.ys[k] - gy) - toX(run.xs[k], run.ys[k])
      const ey = toY(run.xs[k] - gx, run.ys[k] - gy) - toY(run.xs[k], run.ys[k])
      const el = Math.hypot(ex, ey) || 1
      const len = clamp(gn * 30, 10, small ? 18 : 30)
      const ux = ex / el
      const uy = ey / el
      const sx = hx + ux * (r * 2 + 3)
      const sy = hy + uy * (r * 2 + 3)
      const tx = sx + ux * len
      const ty = sy + uy * len
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(tx, ty)
      ctx.moveTo(tx - ux * 5 - uy * 2.6, ty - uy * 5 + ux * 2.6)
      ctx.lineTo(tx, ty)
      ctx.lineTo(tx - ux * 5 + uy * 2.6, ty - uy * 5 - ux * 2.6)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    return [hx, hy]
  }

  function formula(x: number, y: number, size: number, alpha: number) {
    ctx.globalAlpha = alpha
    let px = x
    const put = (str: string, italic = false) => {
      setFont(ctx, { font: 'serif', size, italic })
      ctx.fillStyle = C.ink
      ctx.fillText(str, px, y)
      px += ctx.measureText(str).width
    }
    put('θ', true)
    put(' ← ')
    put('θ', true)
    put(' − ')
    put('η', true)
    px += size * 0.08
    // a drawn nabla
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, y - size * 0.66)
    ctx.lineTo(px + size * 0.5, y - size * 0.66)
    ctx.lineTo(px + size * 0.25, y)
    ctx.closePath()
    ctx.stroke()
    px += size * 0.58
    put('L', true)
    put('(')
    put('θ', true)
    put(')')
    ctx.globalAlpha = 1
  }

  // label placement: rectangles already taken this frame
  const occupied: [number, number, number, number][] = []
  function staticRects(): [number, number, number, number][] {
    const r: [number, number, number, number][] = [
      [0, 0, W, pad + 8],
      [chart.x - 10, chart.y - 20, chart.w + 20, chart.h + 40],
      [0, H - pad - 30, W * 0.55, pad + 30],
      // the formula and landscape name
      [0, 0, pad + (small ? 150 : 260), pad + (small ? 46 : 80)],
    ]
    if (legend.rows) r.push([legend.x - 4, legend.y - 14, legend.w + 8, 72])
    else r.push([legend.x - 4, legend.y - 14, legend.colW * 3, 64])
    return r
  }
  const hit = (a: [number, number, number, number]) => occupied.some((b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1])
  /** A leader line and a mono label off a point, in the first quadrant that is free. */
  function annot(x: number, y: number, r: number, label: string, color: string, alpha: number, prefer: [number, number], size = 9) {
    setFont(ctx, { size, tracking: 0.14 })
    const tw = ctx.measureText(label).width
    const cands: [number, number][] = [prefer, [-prefer[0], prefer[1]], [prefer[0], -prefer[1]], [-prefer[0], -prefer[1]]]
    let pick = cands[0]
    let rect: [number, number, number, number] = [0, 0, 0, 0]
    for (const c of cands) {
      const lx = x + c[0] * 44
      const ly = y + c[1] * 30
      const rr: [number, number, number, number] = [c[0] > 0 ? lx + 2 : lx - 2 - tw, ly - 9, tw + 4, 14]
      if (rr[0] < pad * 0.6 || rr[0] + rr[2] > W - pad * 0.6 || rr[1] < pad || rr[1] + rr[3] > H - pad * 0.6) continue
      if (!hit(rr)) {
        pick = c
        rect = rr
        break
      }
      if (c === cands[0]) rect = rr
    }
    occupied.push(rect)
    const [dx, dy] = pick
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + dx * r * 0.72, y + dy * r * 0.72)
    ctx.lineTo(x + dx * 34, y + dy * 30)
    ctx.lineTo(x + dx * 42, y + dy * 30)
    ctx.stroke()
    ctx.fillStyle = rgba(C.paper, 0.8)
    ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
    text(ctx, label, x + dx * 46, y + dy * 30 + 3.5, { size, color, align: dx > 0 ? 'left' : 'right', tracking: 0.14 })
    ctx.globalAlpha = 1
  }

  function frame(t: number, dt: number) {
    const k = inkOn('paper')
    ctx.fillStyle = C.paper
    ctx.fillRect(0, 0, W, H)
    lastT = t
    // after a dropped θ₀, hold the settled race for a while instead of moving on
    const tau0 = (clock % LOOPLEN) % CYCLE
    if (!(t < holdUntil && tau0 >= RUN1 + 1.4)) clock += dt
    const loopT = clock % LOOPLEN
    const ci = Math.floor(loopT / CYCLE)
    const tau = loopT - ci * CYCLE
    if (ci !== lastCi) {
      if (lastCi >= 0) morphFrom = lastCi
      lastCi = ci
      // a landscape always arrives with its own start
      preps[ci].start = [LANDS[ci].start[0], LANDS[ci].start[1]]
      preps[ci].runs = preps[ci].base
      userStart[ci] = null
    }
    const P = preps[ci]
    const prev = preps[morphFrom]
    const first = !switched && clock - landOffset < CYCLE
    const morph = first ? 1 : ease.inOutCubic(clamp(tau / MORPH))
    const reveal = first ? ease.outCubic(clamp(tau / 1.3)) : 1

    /* ------------------------------------------------------- landscape */
    if (morph < 1) {
      const a = prev.vals
      const b = P.vals
      if (!morphPaths || Math.abs(morph - morphAt) > 0.025 || morphCi !== ci) for (let i = 0; i < mixVals.length; i++) mixVals[i] = a[i] + (b[i] - a[i]) * morph
      // re-contour the blend at most every ~1/40 of the morph (about 30 Hz)
      if (!morphPaths || Math.abs(morph - morphAt) > 0.025 || morphCi !== ci) {
        morphPaths = contour(mixVals, cols, rows, 0, 0, cell, levels)
        morphAt = morph
        morphCi = ci
      }
      drawContours(morphPaths, 1, 1)
    } else if (reveal < 1) drawContours(P.paths, 1, reveal)
    else blitContours(ci)
    // basin hatch
    const settledIn = clamp((tau - MORPH) / 0.6)
    const hatchA = Math.min(settledIn, 1 - clamp((tau - (CYCLE - 0.4)) / 0.4))
    if (hatchA > 0) {
      ctx.strokeStyle = rgba(C.lagoon, 0.32 * hatchA)
      ctx.lineWidth = 1
      ctx.stroke(P.hatch)
    }
    // contour labels, knocked out of the paper
    const labA = Math.min(clamp((tau - MORPH - 0.1) / 0.5), 1 - clamp((tau - (CYCLE - 0.5)) / 0.5))
    if (labA > 0) {
      for (const l of P.labels) {
        ctx.save()
        ctx.translate(l.x, l.y)
        ctx.rotate(l.ang)
        setFont(ctx, { size: 8.5, tracking: 0.06 })
        const tw = ctx.measureText(l.s).width + 6
        ctx.globalAlpha = labA
        ctx.fillStyle = C.paper
        ctx.fillRect(-tw / 2, -6, tw, 12)
        text(ctx, l.s, 0, 0.5, { size: 8.5, color: k.ink2, align: 'center', baseline: 'middle', tracking: 0.06 })
        ctx.restore()
      }
      ctx.globalAlpha = 1
    }

    /* ------------------------------------------------------- the race */
    const L = LANDS[ci]
    const runP = clamp((tau - RUN0) / (RUN1 - RUN0))
    const step = runP * STEPS
    const runA = 1 - clamp((tau - (CYCLE - 0.8)) / 0.6)
    const [sx0, sy0] = [toX(P.start[0], P.start[1]), toY(P.start[0], P.start[1])]
    // θ₀
    const startA = Math.min(clamp((tau - 1.0) / 0.4), runA)
    if (startA > 0) {
      ctx.globalAlpha = startA
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      const rr = 7 * ease.outBack(clamp((tau - 1.0) / 0.5))
      ctx.beginPath()
      ctx.arc(sx0, sy0, rr * 0.55, 0, TAU)
      ctx.moveTo(sx0 - rr * 1.5, sy0)
      ctx.lineTo(sx0 - rr * 0.8, sy0)
      ctx.moveTo(sx0 + rr * 0.8, sy0)
      ctx.lineTo(sx0 + rr * 1.5, sy0)
      ctx.moveTo(sx0, sy0 - rr * 1.5)
      ctx.lineTo(sx0, sy0 - rr * 0.8)
      ctx.moveTo(sx0, sy0 + rr * 0.8)
      ctx.lineTo(sx0, sy0 + rr * 1.5)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    const heads: [number, number][] = []
    if (tau >= RUN0 && runA > 0) {
      for (let o = OPT.length - 1; o >= 0; o--) heads[o] = drawRun(P.runs[o], o, step, runA) as [number, number]
      // settle rings
      for (let o = 0; o < OPT.length; o++) {
        const run = P.runs[o]
        if (step < run.settle) continue
        const since = (step - run.settle) / (STEPS / (RUN1 - RUN0))
        const x = toX(run.xs[STEPS], run.ys[STEPS])
        const y = toY(run.xs[STEPS], run.ys[STEPS])
        ctx.globalAlpha = runA
        ctx.strokeStyle = OPT[o].color
        ctx.lineWidth = 1
        const g = ease.outCubic(clamp(since / 0.6))
        ctx.beginPath()
        ctx.arc(x, y, 6 + 4 * o + 10 * (1 - g), 0, TAU)
        ctx.globalAlpha = runA * (0.4 + 0.6 * g)
        ctx.stroke()
        if (since < 0.8) {
          ctx.globalAlpha = runA * (1 - since / 0.8)
          ctx.beginPath()
          ctx.arc(x, y, 6 + 4 * o + 34 * ease.outCubic(since / 0.8), 0, TAU)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      // head labels
      if (!small) {
        const offs: [number, number][] = [
          [-1, -1],
          [1, -1],
          [1, 1],
        ]
        for (let o = 0; o < OPT.length; o++) {
          const [hx, hy] = heads[o]
          const [ox, oy] = offs[o]
          ctx.globalAlpha = runA * clamp((tau - RUN0) / 0.4) * (1 - clamp((step - P.runs[o].settle) / 12))
          if (ctx.globalAlpha <= 0.01) continue
          ctx.strokeStyle = OPT[o].color
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(hx + ox * 6, hy + oy * 6)
          ctx.lineTo(hx + ox * 16, hy + oy * 16)
          ctx.stroke()
          text(ctx, OPT[o].name, hx + ox * 19, hy + oy * 19 + (oy > 0 ? 7 : 0), { size: 8.5, color: OPT[o].color, align: ox > 0 ? 'left' : 'right', tracking: 0.14 })
        }
        ctx.globalAlpha = 1
      }
    }

    // annotations, each placed in the first free quadrant
    occupied.length = 0
    occupied.push(...staticRects())
    if (startA > 0) annot(sx0, sy0, 9, `θ₀ (${P.start[0].toFixed(2)}, ${P.start[1].toFixed(2)})`, k.ink, startA, [1, -1], small ? 8 : 9.5)
    // annotated points (saddles), shown from the start of the run
    const markA = Math.min(clamp((tau - RUN0) / 0.6), runA)
    if (markA > 0 && L.marks && !small) {
      for (const m of L.marks) {
        const mx = toX(m.x, m.y)
        const my = toY(m.x, m.y)
        ctx.globalAlpha = markA
        ctx.strokeStyle = k.ink2
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(mx - 5, my - 5)
        ctx.lineTo(mx + 5, my + 5)
        ctx.moveTo(mx + 5, my - 5)
        ctx.lineTo(mx - 5, my + 5)
        ctx.stroke()
        annot(mx, my, 7, m.label, k.ink2, markA, [-1, -1])
      }
      ctx.globalAlpha = 1
    }
    // minima marks during the hold
    const holdA = Math.min(clamp((tau - RUN1 + 1.2) / 0.6), runA)
    if (holdA > 0 && !small) {
      for (const m of P.minima.slice(0, 3)) {
        const mx = toX(m.x, m.y)
        const my = toY(m.x, m.y)
        if (mx < pad || mx > W - pad || my < topBand || my > H - pad) continue
        ctx.globalAlpha = holdA
        ctx.strokeStyle = m.global ? C.ink : k.ink2
        ctx.lineWidth = 1
        ctx.setLineDash(m.global ? [] : [2, 3])
        ctx.beginPath()
        ctx.arc(mx, my, m.global ? 16 : 12, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
        annot(mx, my, m.global ? 16 : 12, m.global ? 'GLOBAL MINIMUM' : `LOCAL MINIMUM · ${m.loss.toFixed(3)}`, m.global ? k.ink : k.ink2, holdA, [1, 1])
      }
      ctx.globalAlpha = 1
    }

    /* --------------------------------------------------------- chrome */
    chrome(t, tau, ci, step)
    drawLegend(P, step, tau, runA)
    drawChart(P, step, tau, runA)
    drawPointer(P, ci, tau)
  }

  /** The hovered spot (a ghost θ₀ with its loss and −∇L), and the ghost demo of the click. */
  function drawPointer(P: Prepared, ci: number, tau: number) {
    if (preview) return
    const k = inkOn('paper')
    const L = LANDS[ci]
    const marker = (X: number, Y: number, r: number, a: number, dashed: boolean) => {
      ctx.globalAlpha = a
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      if (dashed) ctx.setLineDash([2, 2.5])
      ctx.beginPath()
      ctx.arc(X, Y, r * 0.55, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(X - r * 1.5, Y)
      ctx.lineTo(X - r * 0.8, Y)
      ctx.moveTo(X + r * 0.8, Y)
      ctx.lineTo(X + r * 1.5, Y)
      ctx.moveTo(X, Y - r * 1.5)
      ctx.lineTo(X, Y - r * 0.8)
      ctx.moveTo(X, Y + r * 0.8)
      ctx.lineTo(X, Y + r * 1.5)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    const label = (X: number, Y: number, lines: string[], a: number) => {
      setFont(ctx, { size: 9, tracking: 0.12 })
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width))
      const left = X + 16 + tw > W - pad ? X - 16 - tw : X + 16
      ctx.globalAlpha = a
      ctx.fillStyle = rgba(C.paper, 0.86)
      ctx.fillRect(left - 4, Y - 20, tw + 8, 13 * lines.length + 6)
      lines.forEach((l, i) => text(ctx, l, left, Y - 9 + i * 13, { size: 9, color: i === 0 ? k.ink : k.ink2, tracking: 0.12 }))
      ctx.globalAlpha = 1
    }
    if (hover && onMap(hover.x, hover.y)) {
      const [x, y] = fromScreen(hover.x, hover.y)
      const l = L.f(x, y) - P.fmin
      const [gx, gy] = grad(L.f, x, y)
      marker(hover.x, hover.y, 7, 0.9, true)
      // −∇L at the pointer: where all three would take their first step
      const ex = toX(x - gx, y - gy) - hover.x
      const ey = toY(x - gx, y - gy) - hover.y
      const el = Math.hypot(ex, ey)
      if (el > 1e-6) {
        const ux = ex / el
        const uy = ey / el
        const len = clamp(Math.hypot(gx, gy) * 30, 10, 34)
        const sx = hover.x + ux * 10
        const sy = hover.y + uy * 10
        const tx = sx + ux * len
        const ty = sy + uy * len
        ctx.strokeStyle = C.ink
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(tx, ty)
        ctx.moveTo(tx - ux * 5 - uy * 2.6, ty - uy * 5 + ux * 2.6)
        ctx.lineTo(tx, ty)
        ctx.lineTo(tx - ux * 5 + uy * 2.6, ty - uy * 5 - ux * 2.6)
        ctx.stroke()
      }
      label(hover.x, hover.y, [`θ (${x.toFixed(2)}, ${y.toFixed(2)})  L ${l.toFixed(3)}`, 'CLICK TO START HERE'], 1)
      return
    }
    // the ghost: once per landscape until the viewer has tried it, while the racers settle
    if (interacted || tau < RUN1 - 1.6 || tau > CYCLE - 1.0) return
    const a = Math.min(clamp((tau - (RUN1 - 1.6)) / 0.4), 1 - clamp((tau - (CYCLE - 1.4)) / 0.4))
    const [gx, gy] = P.ghost
    const u = clamp((tau - (RUN1 - 1.6)) / 1.2)
    const e = ease.inOutCubic(u)
    const X = gx + (1 - e) * 46
    const Y = gy + (1 - e) * 26
    marker(X, Y, 7, 0.7 * a, true)
    if (u >= 1) {
      // the click: a ring that releases from the marker, once a second
      const ph = fract(tau - (RUN1 - 0.4))
      ctx.globalAlpha = a * (1 - ph)
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(gx, gy, 4 + 18 * ease.outCubic(ph), 0, TAU)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    label(X, Y, [env.width < 700 ? 'TAP THE MAP' : 'CLICK THE MAP', 'TO DROP YOUR OWN θ₀'], a)
  }

  function chrome(t: number, tau: number, ci: number, step: number) {
    const k = inkOn('paper')
    const chromeIn = ease.outCubic(clamp(t / 0.9))
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.5 * chromeIn)
    cropMarks(ctx, pad * 0.45, pad * 0.45, W - pad * 0.9, H - pad * 0.9, small ? 7 : 10)
    const hs = small ? 8.5 : 10
    const hy = pad + (small ? 4 : 6)
    ctx.globalAlpha = chromeIn
    // paper halo behind the header so contours never fight the type
    ctx.fillStyle = rgba(C.paper, 0.86)
    setFont(ctx, { size: hs, tracking: 0.14 })
    const figW = ctx.measureText('FIG. M.07').width
    const title = small || W < 560 ? 'DESCENT' : 'GRADIENT DESCENT · 3 OPTIMISERS'
    const titleW = ctx.measureText(title).width
    ctx.fillRect(pad - 4, hy - hs - 3, 26 + figW + hs * 0.9 + titleW + 8, hs + 8)
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, 'FIG. M.07', pad + 26, hy, { size: hs, color: C.ocean, tracking: 0.14 })
    text(ctx, title, pad + 26 + figW + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    void t
    const lt = clock % LOOPLEN
    const tc = `T ${String(Math.floor(lt / 60)).padStart(2, '0')}:${(lt % 60).toFixed(2).padStart(5, '0')}`
    if (!rot || small) {
      setFont(ctx, { size: hs, tracking: 0.12 })
      const tw = ctx.measureText(tc).width
      ctx.fillStyle = rgba(C.paper, 0.86)
      ctx.fillRect(W - pad - tw - 4, hy - hs - 3, tw + 8, hs + 8)
      text(ctx, tc, W - pad, hy, { size: hs, color: k.muted, align: 'right', tracking: 0.12 })
    }
    // formula + landscape name
    const fs = small ? 15 : clamp(W * 0.016, 17, 24)
    const fy = hy + fs + (small ? 6 : 12)
    ctx.fillStyle = rgba(C.paper, 0.86)
    ctx.fillRect(pad - 4, fy - fs * 0.9, fs * 5.6, fs * 1.25)
    formula(pad, fy, fs, chromeIn)
    if (!small) {
      const L = LANDS[ci]
      const na = Math.min(clamp((tau - 0.6) / 0.5), 1 - clamp((tau - (CYCLE - 0.5)) / 0.5))
      const ny = fy + 20
      ctx.globalAlpha = na
      setFont(ctx, { size: 9.5, tracking: 0.14 })
      const nm = `LANDSCAPE ${L.key} · ${L.name.toUpperCase()}`
      ctx.fillStyle = rgba(C.paper, 0.86)
      ctx.fillRect(pad - 4, ny - 12, ctx.measureText(nm).width + 8, 16)
      text(ctx, nm, pad, ny, { size: 9.5, color: k.ink, tracking: 0.14 })
      ctx.globalAlpha = 1
    }
    // caption
    const capY = H - pad * 0.62
    const mine = !!userStart[ci]
    const cap = small
      ? `FIG. M.07 — LANDSCAPE ${LANDS[ci].key} · STEP ${String(Math.floor(step)).padStart(3, '0')}`
      : mine
        ? `FIG. M.07 — LANDSCAPE ${LANDS[ci].key} FROM YOUR θ₀ · ← → CHANGE LANDSCAPE · R FOR THE DEFAULT START`
        : `FIG. M.07 — ${LANDS[ci].note}`
    setFont(ctx, { size: small ? 8 : 9.5, tracking: 0.14 })
    const cw = ctx.measureText(cap).width
    const maxW = rot ? W - pad * 2 : chart.x - pad - 20
    const fits = cw < maxW
    const capS = fits ? cap : `FIG. M.07 — LANDSCAPE ${LANDS[ci].key} · ${LANDS[ci].name.toUpperCase()}`
    ctx.globalAlpha = chromeIn
    ctx.fillStyle = rgba(C.paper, 0.86)
    setFont(ctx, { size: small ? 8 : 9.5, tracking: 0.14 })
    ctx.fillRect(pad - 4, capY - 11, ctx.measureText(capS).width + 8, 15)
    text(ctx, capS, pad, capY, { size: small ? 8 : 9.5, color: k.muted, tracking: 0.14 })
    // scale bar: one θ unit
    if (!small && !rot) {
      const sbx = pad
      const sby = capY - 22
      ctx.fillStyle = rgba(C.paper, 0.86)
      ctx.fillRect(sbx - 4, sby - 14, s + 70, 22)
      ctx.strokeStyle = k.ink2
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sbx, sby - 4)
      ctx.lineTo(sbx, sby + 3)
      ctx.lineTo(sbx + s, sby + 3)
      ctx.lineTo(sbx + s, sby - 4)
      ctx.moveTo(sbx + s / 2, sby)
      ctx.lineTo(sbx + s / 2, sby + 3)
      ctx.stroke()
      text(ctx, '1.0 θ', sbx + s + 8, sby + 4, { size: 8.5, color: k.ink2, tracking: 0.1 })
      text(ctx, 'CONTOURS ∝ k²', sbx + 2, sby - 7, { size: 8, color: k.muted, tracking: 0.14 })
    }
    ctx.globalAlpha = 1
  }

  function drawLegend(P: Prepared, step: number, tau: number, runA: number) {
    const k = inkOn('paper')
    const a = Math.min(clamp((tau - 1.2) / 0.5), Math.max(0.35, runA))
    const st = Math.floor(step)
    const lr = (o: number, ld: Land) => (o === 0 ? `η ${ld.hp.sgd}` : o === 1 ? `η ${ld.hp.mom} · β ${ld.hp.beta}` : `η ${ld.hp.adam} · β 0.9, 0.999`)
    const ld = LANDS[preps.indexOf(P)]
    ctx.globalAlpha = a
    if (small) {
      // preview: three compact rows, right-aligned under the timecode
      let y = legend.y + 16
      for (let o = 0; o < OPT.length; o++) {
        const run = P.runs[o]
        const s0 = `${OPT[o].name} ${run.loss[st].toFixed(3)}`
        setFont(ctx, { size: 8, tracking: 0.08 })
        const tw = ctx.measureText(s0).width
        ctx.fillStyle = rgba(C.paper, 0.86)
        ctx.fillRect(W - pad - tw - 14, y - 9, tw + 18, 12)
        text(ctx, s0, W - pad, y, { size: 8, color: OPT[o].color, align: 'right', tracking: 0.08 })
        ctx.beginPath()
        marker(o, W - pad - tw - 7, y - 3, 1.8)
        if (o === 1) {
          ctx.strokeStyle = OPT[o].color
          ctx.stroke()
        } else {
          ctx.fillStyle = OPT[o].color
          ctx.fill()
        }
        y += 12
      }
      ctx.globalAlpha = 1
      return
    }
    const rowsMode = legend.rows
    const colW = rowsMode ? legend.w : legend.colW
    for (let o = 0; o < OPT.length; o++) {
      const run = P.runs[o]
      const x = rowsMode ? legend.x : legend.x + o * colW
      const y = rowsMode ? legend.y + o * 22 : legend.y
      ctx.fillStyle = rgba(C.paper, 0.86)
      ctx.fillRect(x - 4, y - 12, colW - 6, rowsMode ? 20 : 54)
      ctx.beginPath()
      marker(o, x + 3, y - 4, 2.2)
      ctx.strokeStyle = OPT[o].color
      ctx.fillStyle = OPT[o].color
      ctx.lineWidth = 1
      if (o === 1) ctx.stroke()
      else ctx.fill()
      text(ctx, OPT[o].name, x + 12, y, { size: 9.5, color: OPT[o].color, tracking: 0.14 })
      const settled = st >= run.settle
      const tag = settled ? (run.outcome === 'global' ? 'GLOBAL MIN' : run.outcome === 'local' ? 'LOCAL MIN' : '') : ''
      if (rowsMode) {
        text(ctx, `${String(st).padStart(3, '0')}  ${run.loss[st].toFixed(4)}`, x + legend.w - 12, y, { size: 9.5, color: k.ink, align: 'right', tracking: 0.06 })
        if (tag) text(ctx, tag, x + 96, y, { size: 8.5, color: k.ink2, tracking: 0.14 })
        else text(ctx, lr(o, ld), x + 96, y, { size: 8.5, color: k.muted, tracking: 0.06 })
      } else {
        text(ctx, lr(o, ld), x + 12, y + 14, { size: 8.5, color: k.muted, tracking: 0.06 })
        text(ctx, `STEP ${String(st).padStart(3, '0')}`, x + 12, y + 30, { size: 9.5, color: k.ink, tracking: 0.06 })
        text(ctx, `LOSS ${run.loss[st].toFixed(4)}`, x + 88, y + 30, { size: 9.5, color: k.ink, tracking: 0.06 })
        if (tag) text(ctx, tag, x + 12, y + 44, { size: 8.5, color: OPT[o].color, tracking: 0.14 })
      }
    }
    ctx.globalAlpha = 1
  }

  function drawChart(P: Prepared, step: number, tau: number, runA: number) {
    const k = inkOn('paper')
    const { x, y, w, h } = chart
    const a = Math.min(clamp((tau - 1.2) / 0.5), Math.max(0.3, runA))
    if (a <= 0) return
    ctx.globalAlpha = a
    ctx.fillStyle = rgba(C.paper, 0.9)
    ctx.fillRect(x - 6, y - 16, w + 12, h + 30)
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.lineWidth = 1
    // axes
    ctx.beginPath()
    ctx.moveTo(x + 0.5, y)
    ctx.lineTo(x + 0.5, y + h + 0.5)
    ctx.lineTo(x + w, y + h + 0.5)
    ctx.stroke()
    // log scale
    let lo = Infinity
    let hi = -Infinity
    for (const r of P.runs)
      for (let i = 0; i <= STEPS; i++) {
        const v = Math.log10(r.loss[i] + 1e-4)
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    lo = Math.floor(lo)
    hi = Math.ceil(hi * 2) / 2
    const Y = (v: number) => y + h - ((Math.log10(v + 1e-4) - lo) / (hi - lo)) * h
    const X = (i: number) => x + (i / STEPS) * w
    // decade ticks
    ctx.strokeStyle = rgba(C.ink, 0.1)
    ctx.beginPath()
    for (let d = lo; d <= hi; d++) {
      const yy = Math.round(y + h - ((d - lo) / (hi - lo)) * h) + 0.5
      ctx.moveTo(x, yy)
      ctx.lineTo(x + w, yy)
    }
    ctx.stroke()
    if (!small)
      for (let d = lo; d <= hi; d++) {
        const yy = y + h - ((d - lo) / (hi - lo)) * h
        text(ctx, `1e${d}`, x - 4, yy + 3, { size: 7.5, color: k.muted, align: 'right', tracking: 0.04 })
      }
    text(ctx, small ? 'LOSS' : 'LOSS · LOG', x, y - 6, { size: small ? 7.5 : 8.5, color: k.muted, tracking: 0.14 })
    text(ctx, `STEP ${STEPS}`, x + w, y + h + 12, { size: small ? 7.5 : 8.5, color: k.muted, align: 'right', tracking: 0.14 })
    // series
    const st = Math.min(STEPS, step)
    for (let o = 0; o < OPT.length; o++) {
      const r = P.runs[o]
      ctx.strokeStyle = OPT[o].color
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.moveTo(X(0), Y(r.loss[0]))
      for (let i = 1; i <= st; i++) ctx.lineTo(X(i), Y(r.loss[i]))
      ctx.stroke()
      if (tau >= RUN0) {
        ctx.beginPath()
        marker(o, X(st), Y(r.loss[Math.floor(st)]), 2)
        if (o === 1) ctx.stroke()
        else {
          ctx.fillStyle = OPT[o].color
          ctx.fill()
        }
      }
    }
    ctx.globalAlpha = 1
  }

  return {
    resize(w, h) {
      layout(w, h)
    },
    frame,
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hover = null
        down = null
        env.setCursor('default')
        return
      }
      const on = onMap(p.x, p.y)
      hover = touch && !p.pressed ? null : { x: p.x, y: p.y }
      env.setCursor(on ? 'crosshair' : 'default')
      if (p.type === 'down') down = { x: p.x, y: p.y }
      if (p.type === 'up') {
        if (down && on && Math.hypot(p.x - down.x, p.y - down.y) < 14) {
          interacted = true
          rerun(fromScreen(p.x, p.y))
        }
        down = null
        if (touch) hover = null
      }
    },
    key(code, isDown) {
      if (!['ArrowLeft', 'ArrowRight', 'Space', 'KeyR'].includes(code)) return false
      if (!isDown) return true
      interacted = true
      if (code === 'ArrowLeft') switchLand(-1)
      else if (code === 'ArrowRight') switchLand(1)
      else rerun(null)
      return true
    },
  }
}

export default create
