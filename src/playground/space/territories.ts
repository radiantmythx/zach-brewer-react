/*
 * S.08 — TERRITORIES
 *
 * How nature divides space. Scatter seeds and give every point of the plane
 * to its nearest seed: the result is a Voronoi diagram, convex cells whose
 * walls are the perpendicular bisectors between neighbors (its dual, the
 * Delaunay triangulation, joins the neighbors). The cells are grown here as
 * the "grassfire" construction: circles widening from every seed at one
 * speed, stopping where they meet. Then Lloyd's algorithm moves every seed
 * to the centroid of its own cell, again and again, and the ragged cells
 * settle toward the calm, near-hexagonal tiling — the centroidal Voronoi
 * tessellation, whose cells approach the hexagon's second moment, 5/(36√3).
 * Then the same rule in nature, as a plate of six specimens drawn from
 * Voronoi variants: a giraffe's coat, a dragonfly's wing, dry earth, a
 * leaf's areoles, soap foam, and the coverage of a city's cell towers.
 *
 * Cells are computed exactly by half-plane clipping: each cell starts as the
 * frame and is cut by the bisector of each neighbor in order of distance,
 * stopping once no farther seed can reach it.
 *
 * Four chapters over 66 s, a pure function of time (?at= seeks, ← → step) —
 * until you touch it: tap to add a seed, drag one to move it, hold to relax.
 * Then the field is yours until the loop begins again.
 */

import { C, TAU, clamp, damp, ease, ground, lerp, makeNoise, mod, rgba, rng, setFont, smoothstep, text } from '../kit'
import type { CreatePiece, PieceInstance, PointerInfo } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 24px "Instrument Serif"'), document.fonts.load('italic 400 24px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.08'
const LOOP = 66
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Seeds' },
  { t: 5, num: 'II', name: 'Territories' },
  { t: 15, num: 'III', name: 'Room' },
  { t: 38, num: 'IV', name: 'The same rule' },
]
const CAPTIONS = [
  { t0: 1.0, t1: 13.8, text: 'Every place belongs *to its nearest seed.*' },
  { t0: 16.6, t1: 31.5, text: 'Give them time and they make room *for each other.*' },
  { t0: 39.2, t1: 50.8, text: 'Honeycomb, giraffe, *dry earth, foam.*' },
  { t0: 52.6, t1: 63.2, text: 'One rule, *everywhere.*' },
]
const GROW0 = 5.2
const GROW1 = 10.6
const RX0 = 15.6
const RX1 = 33.4
const ITER = 56
/** the second moment of a regular hexagon, the best a plane cell can do */
const G_HEX = 5 / (36 * Math.sqrt(3))
const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88]
const MAXV = 64
const NMAX = 200

interface Word {
  w: string
  em: boolean
}
function parseWords(s: string): Word[] {
  const out: Word[] = []
  let em = false
  for (const part of s.split('*')) {
    for (const w of part.split(' ')) if (w) out.push({ w, em })
    em = !em
  }
  return out
}

/* ------------------------------------------------------------ Voronoi by half-plane clipping */

interface Cells {
  /** vertices of cell i at [i * MAXV + k]; CL is the label of the edge leaving vertex k: a neighbor's index, or −1 for the domain */
  CX: Float64Array
  CY: Float64Array
  CL: Int32Array
  CN: Int32Array
  /** area, centroid, second moment about the centroid, sides (−1 if the cell touches the domain) */
  A: Float64Array
  GX: Float64Array
  GY: Float64Array
  I2: Float64Array
  SD: Int32Array
}
function makeCells(nmax: number): Cells {
  return {
    CX: new Float64Array(nmax * MAXV),
    CY: new Float64Array(nmax * MAXV),
    CL: new Int32Array(nmax * MAXV),
    CN: new Int32Array(nmax),
    A: new Float64Array(nmax),
    GX: new Float64Array(nmax),
    GY: new Float64Array(nmax),
    I2: new Float64Array(nmax),
    SD: new Int32Array(nmax),
  }
}

const AX = new Float64Array(MAXV)
const AY = new Float64Array(MAXV)
const AL = new Int32Array(MAXV)
const BX = new Float64Array(MAXV)
const BY = new Float64Array(MAXV)
const BL = new Int32Array(MAXV)
const D2 = new Float64Array(NMAX * 4)
const IDX = new Int32Array(NMAX * 4)

/**
 * The Voronoi cells of n seeds inside a convex domain (flat [x0, y0, x1, y1, …]).
 * Each cell is the domain clipped by the bisector half-plane of every other
 * seed, nearest first; once a seed is more than twice as far as the cell's
 * farthest corner, no later bisector can touch the cell, so we stop.
 */
function voronoi(xs: Float64Array, ys: Float64Array, n: number, dom: number[], out: Cells) {
  const dn = dom.length / 2
  for (let i = 0; i < n; i++) {
    const sx = xs[i]
    const sy = ys[i]
    let m = dn
    for (let k = 0; k < dn; k++) {
      AX[k] = dom[k * 2]
      AY[k] = dom[k * 2 + 1]
      AL[k] = -1
    }
    let cnt = 0
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      const dx = xs[j] - sx
      const dy = ys[j] - sy
      D2[j] = dx * dx + dy * dy
      IDX[cnt++] = j
    }
    // insertion sort is fine at these sizes and allocation-free
    for (let a = 1; a < cnt; a++) {
      const v = IDX[a]
      const dv = D2[v]
      let b = a - 1
      while (b >= 0 && D2[IDX[b]] > dv) {
        IDX[b + 1] = IDX[b]
        b--
      }
      IDX[b + 1] = v
    }
    let r2 = 0
    for (let k = 0; k < m; k++) r2 = Math.max(r2, (AX[k] - sx) ** 2 + (AY[k] - sy) ** 2)
    for (let q = 0; q < cnt && m >= 3; q++) {
      const j = IDX[q]
      const d2 = D2[j]
      if (d2 > 4 * r2) break
      if (d2 < 1e-9) continue
      const nx = xs[j] - sx
      const ny = ys[j] - sy
      const half = d2 / 2
      // keep (x − s)·(sj − s) ≤ |sj − s|²/2
      let o = 0
      for (let k = 0; k < m; k++) {
        const k2 = k + 1 === m ? 0 : k + 1
        const fP = (AX[k] - sx) * nx + (AY[k] - sy) * ny - half
        const fQ = (AX[k2] - sx) * nx + (AY[k2] - sy) * ny - half
        if (fP <= 0) {
          BX[o] = AX[k]
          BY[o] = AY[k]
          BL[o++] = AL[k]
          if (fQ > 0 && o < MAXV) {
            const t = fP / (fP - fQ)
            BX[o] = AX[k] + (AX[k2] - AX[k]) * t
            BY[o] = AY[k] + (AY[k2] - AY[k]) * t
            BL[o++] = j
          }
        } else if (fQ <= 0 && o < MAXV) {
          const t = fP / (fP - fQ)
          BX[o] = AX[k] + (AX[k2] - AX[k]) * t
          BY[o] = AY[k] + (AY[k2] - AY[k]) * t
          BL[o++] = AL[k]
        }
        if (o >= MAXV - 1) break
      }
      m = o
      r2 = 0
      for (let k = 0; k < m; k++) {
        AX[k] = BX[k]
        AY[k] = BY[k]
        AL[k] = BL[k]
        r2 = Math.max(r2, (AX[k] - sx) ** 2 + (AY[k] - sy) ** 2)
      }
    }
    // store, with area, centroid and second moment (about the seed, then shifted)
    const base = i * MAXV
    let A2 = 0
    let cx = 0
    let cy = 0
    let Ixx = 0
    let Iyy = 0
    let sides = 0
    let touches = false
    for (let k = 0; k < m; k++) {
      out.CX[base + k] = AX[k]
      out.CY[base + k] = AY[k]
      out.CL[base + k] = AL[k]
      const k2 = k + 1 === m ? 0 : k + 1
      const x0 = AX[k] - sx
      const y0 = AY[k] - sy
      const x1 = AX[k2] - sx
      const y1 = AY[k2] - sy
      const cr = x0 * y1 - x1 * y0
      A2 += cr
      cx += (x0 + x1) * cr
      cy += (y0 + y1) * cr
      Ixx += (y0 * y0 + y0 * y1 + y1 * y1) * cr
      Iyy += (x0 * x0 + x0 * x1 + x1 * x1) * cr
      if (AL[k] < 0) touches = true
      else if (Math.hypot(x1 - x0, y1 - y0) > 0.6) sides++
    }
    out.CN[i] = m
    const A = A2 / 2
    if (Math.abs(A) > 1e-9) {
      const gx = cx / (6 * A)
      const gy = cy / (6 * A)
      out.A[i] = Math.abs(A)
      out.GX[i] = sx + gx
      out.GY[i] = sy + gy
      // ∫|x|² about the seed, then the parallel-axis shift to the centroid
      const I0 = Math.abs((Ixx + Iyy) / 12)
      out.I2[i] = Math.max(0, I0 - Math.abs(A) * (gx * gx + gy * gy))
    } else {
      out.A[i] = 0
      out.GX[i] = sx
      out.GY[i] = sy
      out.I2[i] = 0
    }
    out.SD[i] = touches ? -1 : sides
  }
}

/** Clip a convex polygon (flat array) to stay `d` inside every edge of itself: an inset. */
function inset(pts: number[], d: number): number[] {
  const n = pts.length / 2
  if (n < 3) return []
  let cx = 0
  let cy = 0
  for (let k = 0; k < n; k++) {
    cx += pts[k * 2]
    cy += pts[k * 2 + 1]
  }
  cx /= n
  cy /= n
  let poly = pts.slice()
  for (let k = 0; k < n; k++) {
    const px = pts[k * 2]
    const py = pts[k * 2 + 1]
    const qx = pts[((k + 1) % n) * 2]
    const qy = pts[((k + 1) % n) * 2 + 1]
    let nx = -(qy - py)
    let ny = qx - px
    const L = Math.hypot(nx, ny)
    if (L < 1e-6) continue
    nx /= L
    ny /= L
    if ((cx - px) * nx + (cy - py) * ny < 0) {
      nx = -nx
      ny = -ny
    }
    const next: number[] = []
    const m = poly.length / 2
    for (let a = 0; a < m; a++) {
      const ax = poly[a * 2]
      const ay = poly[a * 2 + 1]
      const bx = poly[((a + 1) % m) * 2]
      const by = poly[((a + 1) % m) * 2 + 1]
      const fa = (ax - px) * nx + (ay - py) * ny - d
      const fb = (bx - px) * nx + (by - py) * ny - d
      if (fa >= 0) next.push(ax, ay)
      if (fa >= 0 !== fb >= 0) {
        const t = fa / (fa - fb)
        next.push(ax + (bx - ax) * t, ay + (by - ay) * t)
      }
    }
    poly = next
    if (poly.length < 6) return []
  }
  return poly
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx
  const noise = makeNoise(808)

  /* ------------------------------------------------------------ layout */

  let w = 1
  let h = 1
  let pad = 20
  let portrait = false
  let stacked = false
  let short = false
  let tiny = false
  let capSize = 30
  let capX = 0
  let capW = 300
  let capBottom = 0
  let rulerY = 0
  let lab = 9.5
  // the field
  let fx = 0
  let fy = 0
  let fw = 1
  let fh = 1
  let spacing = 40
  let N = 60

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.25
    stacked = portrait || w < h * 1.45
    short = h < 440
    tiny = h < 260 || w < 380
    pad = clamp(Math.min(w, h) * 0.05, preview || tiny ? 11 : 14, 38)
    lab = tiny || preview ? 8 : short ? 8.5 : 9.5
    rulerY = h - pad * 0.55
    const rulerRoom = preview || tiny ? 4 : 16
    capSize = portrait ? clamp(w * 0.072, 18, 38) : clamp(Math.min(w * 0.038, h * 0.066), tiny ? 13 : 15, 48)
    capX = pad * (stacked ? 1 : 1.3)
    capW = stacked ? w - pad * 2 : clamp(w * 0.33, 160, 540)
    capBottom = h - pad - rulerRoom
    if (stacked) {
      fx = pad
      fy = pad + (tiny ? 18 : 28)
      fw = w - pad * 2
      fh = capBottom - capSize * (w < 520 ? 3.3 : 2.3) - (preview ? 18 : 34) - fy
      // a phone held upright: leave a band under the field for the instruments
      if (portrait && !preview) fh -= 92
    } else {
      fx = Math.max(capX + capW + 24, w * 0.36)
      fy = pad + (tiny ? 2 : 4)
      fw = w - pad - fx
      fh = h - fy - pad - rulerRoom - 6
    }
    fw = Math.max(40, fw)
    fh = Math.max(40, fh)
    spacing = Math.max(preview ? 30 : tiny ? 24 : 30, Math.min(fw, fh) / (preview ? 6.5 : 8.6))
    N = Math.round(clamp((fw * fh) / (spacing * spacing * 0.866), 16, 150))
    seedField()
    plateLayout()
  }

  /* ------------------------------------------------------------ the field and its history */

  const cells = makeCells(NMAX)
  const SXs = new Float64Array(NMAX)
  const SYs = new Float64Array(NMAX)
  let history: Float64Array[] = []
  let born = new Float32Array(NMAX)
  let dom: number[] = []
  // the viewer's field, once they touch it
  let live = false
  let nLive = 0
  const LX = new Float64Array(NMAX)
  const LY = new Float64Array(NMAX)

  function seedField() {
    dom = [fx, fy, fx + fw, fy, fx + fw, fy + fh, fx, fy + fh]
    const r = rng(2024)
    const x0 = new Float64Array(N * 2)
    const minD = spacing * 0.3
    let n = 0
    let tries = 0
    while (n < N && tries < N * 60) {
      tries++
      const x = fx + r() * fw
      const y = fy + r() * fh
      let ok = true
      for (let j = 0; j < n && ok; j++) if ((x0[j * 2] - x) ** 2 + (x0[j * 2 + 1] - y) ** 2 < minD * minD) ok = false
      if (!ok) continue
      x0[n * 2] = x
      x0[n * 2 + 1] = y
      n++
    }
    N = n
    history = [x0]
    born = new Float32Array(NMAX)
    // seeds appear in a scattered order over chapter I
    for (let i = 0; i < N; i++) born[i] = 0.3 + Math.pow(r(), 0.8) * 3.4
    live = false
    nLive = 0
  }
  /** Lloyd iteration k (computed once, kept). */
  function iterate(k: number) {
    while (history.length <= k) {
      const prev = history[history.length - 1]
      for (let i = 0; i < N; i++) {
        SXs[i] = prev[i * 2]
        SYs[i] = prev[i * 2 + 1]
      }
      voronoi(SXs, SYs, N, dom, cells)
      const next = new Float64Array(N * 2)
      for (let i = 0; i < N; i++) {
        next[i * 2] = cells.GX[i]
        next[i * 2 + 1] = cells.GY[i]
      }
      history.push(next)
    }
    return history[k]
  }
  /** The scripted relaxation: iterations as a function of time, slow first (the big moves), quick last. */
  const iterAt = (T: number) => (T < RX0 ? 0 : T >= RX1 ? ITER : ITER * Math.pow((T - RX0) / (RX1 - RX0), 1.7))

  /** Fill SXs/SYs with the seeds to draw at time T; returns the count. */
  function seedsAt(T: number) {
    if (live) {
      for (let i = 0; i < nLive; i++) {
        SXs[i] = LX[i]
        SYs[i] = LY[i]
      }
      return nLive
    }
    const c = iterAt(T)
    const k = Math.floor(c)
    const a = iterate(Math.min(ITER, k))
    const b = iterate(Math.min(ITER, k + 1))
    const u = c - k
    for (let i = 0; i < N; i++) {
      SXs[i] = lerp(a[i * 2], b[i * 2], u)
      SYs[i] = lerp(a[i * 2 + 1], b[i * 2 + 1], u)
    }
    return N
  }
  function goLive(T: number) {
    if (live) return
    const n = seedsAt(T)
    for (let i = 0; i < n; i++) {
      LX[i] = SXs[i]
      LY[i] = SYs[i]
    }
    nLive = n
    live = true
  }

  /* ------------------------------------------------------------ the plate: six specimens */

  interface Spec {
    key: string
    name: string
    sub: string
    seed: number
    x: number
    y: number
    w: number
    h: number
    img: HTMLCanvasElement | null
    t0: number
  }
  const SPECS: Spec[] = [
    { key: 'giraffe', name: 'Giraffe', sub: 'Reticulated coat', seed: 11, x: 0, y: 0, w: 0, h: 0, img: null, t0: 0 },
    { key: 'wing', name: 'Dragonfly', sub: 'Wing cells', seed: 21, x: 0, y: 0, w: 0, h: 0, img: null, t0: 0 },
    { key: 'mud', name: 'Dry earth', sub: 'Shrinkage cracks', seed: 31, x: 0, y: 0, w: 0, h: 0, img: null, t0: 0 },
    { key: 'leaf', name: 'Leaf', sub: 'Areoles between veins', seed: 41, x: 0, y: 0, w: 0, h: 0, img: null, t0: 0 },
    { key: 'foam', name: 'Soap foam', sub: 'Films at 120°', seed: 51, x: 0, y: 0, w: 0, h: 0, img: null, t0: 0 },
    { key: 'towers', name: 'City', sub: 'Nearest-tower coverage', seed: 61, x: 0, y: 0, w: 0, h: 0, img: null, t0: 0 },
  ]
  let plateCols = 3
  let platePages = 1
  let perPage = 6
  const PLATE0 = 38.8
  const PLATE1 = 64.2

  function plateLayout() {
    const labH = tiny || preview ? 14 : 30
    const gap = tiny || preview ? 8 : 16
    let best = { cols: 3, rows: 2, s: 0, per: 6 }
    for (const per of [6, 3]) {
      for (let cols = 1; cols <= per; cols++) {
        const rows = Math.ceil(per / cols)
        const pw = (fw - gap * (cols - 1)) / cols
        const ph = (fh - gap * (rows - 1) - labH * rows) / rows
        if (pw < 40 || ph < 40) continue
        // prefer large, squarish panels, and all six at once when that is not much smaller
        const s = Math.min(pw, ph) * (Math.min(pw, ph) / Math.max(pw, ph)) ** 0.35 * (per === 6 ? 1.25 : 1)
        if (s > best.s) best = { cols, rows, s, per }
      }
      if (best.s > 0 && per === 6 && best.s / 1.25 > 110) break
    }
    plateCols = best.cols
    perPage = best.per
    platePages = Math.ceil(6 / perPage)
    const rows = Math.ceil(perPage / plateCols)
    const pw = (fw - gap * (plateCols - 1)) / plateCols
    const ph = (fh - gap * (rows - 1) - labH * rows) / rows
    SPECS.forEach((s, i) => {
      const j = i % perPage
      const c = j % plateCols
      const r = Math.floor(j / plateCols)
      s.x = fx + c * (pw + gap)
      s.y = fy + r * (ph + gap + labH)
      s.w = pw
      s.h = ph
      s.img = null
    })
  }

  function renderSpec(s: Spec) {
    if (typeof document === 'undefined') return
    const dpr = Math.min(2, env.dpr)
    const cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round(s.w * dpr))
    cv.height = Math.max(1, Math.round(s.h * dpr))
    const c2 = cv.getContext('2d')
    if (!c2) return
    c2.scale(dpr, dpr)
    c2.fillStyle = C.paper
    c2.fillRect(0, 0, s.w, s.h)
    c2.save()
    c2.beginPath()
    c2.rect(0, 0, s.w, s.h)
    c2.clip()
    const r = rng(s.seed)
    if (s.key === 'giraffe') giraffe(c2, s.w, s.h, r)
    else if (s.key === 'wing') wing(c2, s.w, s.h, r)
    else if (s.key === 'mud') mud(c2, s.w, s.h, r)
    else if (s.key === 'leaf') leaf(c2, s.w, s.h, r)
    else if (s.key === 'foam') foam(c2, s.w, s.h, r)
    else towers(c2, s.w, s.h, r)
    c2.restore()
    s.img = cv
  }

  /* specimen helpers */
  const VC = makeCells(NMAX)
  const VX = new Float64Array(NMAX)
  const VY = new Float64Array(NMAX)
  type R = () => number
  /** Poisson-ish seeds in a domain (by rejection), with an optional density 0–1. */
  function scatter(n: number, x0: number, y0: number, ww: number, hh: number, r: R, minD: number, inside: (x: number, y: number) => boolean = () => true, density: (x: number, y: number) => number = () => 1) {
    let k = 0
    let tries = 0
    n = Math.min(n, NMAX)
    while (k < n && tries < n * 80) {
      tries++
      const x = x0 + r() * ww
      const y = y0 + r() * hh
      if (!inside(x, y) || r() > density(x, y)) continue
      const md = minD * (0.55 + 0.45 / Math.sqrt(Math.max(0.15, density(x, y))))
      let ok = true
      for (let j = 0; j < k && ok; j++) if ((VX[j] - x) ** 2 + (VY[j] - y) ** 2 < md * md * 0.5) ok = false
      if (!ok) continue
      VX[k] = x
      VY[k] = y
      k++
    }
    return k
  }
  function lloyd(n: number, d: number[], times: number) {
    for (let t = 0; t < times; t++) {
      voronoi(VX, VY, n, d, VC)
      for (let i = 0; i < n; i++) {
        VX[i] = VC.GX[i]
        VY[i] = VC.GY[i]
      }
    }
    voronoi(VX, VY, n, d, VC)
  }
  const cellPts = (cs: Cells, i: number) => {
    const out: number[] = []
    for (let k = 0; k < cs.CN[i]; k++) out.push(cs.CX[i * MAXV + k], cs.CY[i * MAXV + k])
    return out
  }
  function pathPoly(c2: CanvasRenderingContext2D, p: number[], round = 0) {
    const n = p.length / 2
    if (n < 3) return
    if (!round) {
      c2.moveTo(p[0], p[1])
      for (let k = 1; k < n; k++) c2.lineTo(p[k * 2], p[k * 2 + 1])
      c2.closePath()
      return
    }
    const mx = (p[0] + p[(n - 1) * 2]) / 2
    const my = (p[1] + p[(n - 1) * 2 + 1]) / 2
    c2.moveTo(mx, my)
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n
      c2.arcTo(p[k * 2], p[k * 2 + 1], (p[k * 2] + p[k2 * 2]) / 2, (p[k * 2 + 1] + p[k2 * 2 + 1]) / 2, round)
    }
    c2.closePath()
  }
  function hatchIn(c2: CanvasRenderingContext2D, x: number, y: number, ww: number, hh: number, gap: number, angle: number) {
    const cx = x + ww / 2
    const cy = y + hh / 2
    const R2 = Math.hypot(ww, hh) / 2 + gap
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    c2.beginPath()
    for (let d = -R2; d <= R2; d += gap) {
      const px = cx - sa * d
      const py = cy + ca * d
      c2.moveTo(px - ca * R2, py - sa * R2)
      c2.lineTo(px + ca * R2, py + sa * R2)
    }
    c2.stroke()
  }
  const box = (ww: number, hh: number, m: number) => [m, m, ww - m, m, ww - m, hh - m, m, hh - m]

  /** a. Reticulated giraffe: semi-regular cells, rounded and inset, densely hatched; the gaps are the pale lines. */
  function giraffe(c2: CanvasRenderingContext2D, ww: number, hh: number, r: R) {
    const sp = Math.min(ww, hh) / 3.6
    const d = box(ww, hh, -sp)
    const n = scatter(Math.round(((ww + 2 * sp) * (hh + 2 * sp)) / (sp * sp * 0.9)), -sp, -sp, ww + 2 * sp, hh + 2 * sp, r, sp * 0.7)
    lloyd(n, d, 2)
    c2.lineWidth = 1
    for (let i = 0; i < n; i++) {
      const p = inset(cellPts(VC, i), sp * (0.07 + r() * 0.045))
      if (!p.length) continue
      // round the corners no more than the shortest side allows
      let short = Infinity
      const m = p.length / 2
      for (let q = 0; q < m; q++) short = Math.min(short, Math.hypot(p[((q + 1) % m) * 2] - p[q * 2], p[((q + 1) % m) * 2 + 1] - p[q * 2 + 1]))
      const round = Math.min(sp * 0.18, short * 0.42)
      c2.save()
      c2.beginPath()
      pathPoly(c2, p, round)
      c2.clip()
      c2.strokeStyle = rgba(C.ink2, 0.55)
      hatchIn(c2, 0, 0, ww, hh, 2.4, 1.05 + (r() - 0.5) * 0.3)
      c2.restore()
      c2.strokeStyle = rgba(C.ink, 0.85)
      c2.beginPath()
      pathPoly(c2, p, round)
      c2.stroke()
    }
  }

  /** b. Dragonfly wings, laid along the panel's diagonal: cells finer toward the trailing edge and tip, long veins, the pterostigma. */
  function wing(c2: CanvasRenderingContext2D, ww: number, hh: number, r: R) {
    const diag = Math.hypot(ww, hh)
    const ang = -Math.atan2(hh, ww) * 0.62
    const L = Math.min(diag * 0.8, (ww / Math.abs(Math.cos(ang))) * 0.86)
    const a = L / 2
    c2.save()
    c2.translate(ww / 2, hh / 2)
    c2.rotate(ang)
    // a forewing and a broader hindwing, joined at the root on the left
    for (const [off, b1f, b2f, seedOff] of [
      [-0.14, 0.05, 0.13, 0],
      [0.17, 0.04, 0.2, 7],
    ] as const) {
      const cx = 0
      const cy = off * a * 1.4
      const b1 = a * b1f * 1.4
      const b2 = a * b2f * 1.4
      const aw = a * (seedOff ? 0.92 : 1)
      const ax0 = cx - a + (a - aw)
      const ccx = ax0 + aw
      const poly: number[] = []
      const M = 18
      for (let q = 0; q <= M; q++) {
        const t = Math.PI - (q / M) * Math.PI
        poly.push(ccx + Math.cos(t) * aw, cy - Math.sin(t) * b1)
      }
      for (let q = 1; q < M; q++) {
        const t = (q / M) * Math.PI
        poly.push(ccx + Math.cos(t) * aw, cy + Math.sin(t) * b2)
      }
      const inside = (x: number, y: number) => {
        const u = (x - ccx) / aw
        if (Math.abs(u) >= 1) return false
        const s = Math.sqrt(1 - u * u)
        return y > cy - s * b1 && y < cy + s * b2
      }
      const dens = (x: number, y: number) => {
        const u = (x - ccx) / aw
        const s = Math.sqrt(Math.max(0, 1 - u * u))
        const v = clamp((y - (cy - s * b1)) / Math.max(1, s * (b1 + b2)))
        return clamp(0.2 + 0.65 * Math.pow(v, 1.3) + 0.3 * smoothstep(0.1, 0.95, u))
      }
      const sp = Math.max(4.2, L / 30)
      const rr = rng(Math.floor(r() * 1e6) + seedOff)
      const n = scatter(Math.round((Math.PI * aw * (b1 + b2)) / 2 / (sp * sp * 0.5)), ccx - aw, cy - b1, 2 * aw, b1 + b2, rr, sp, inside, dens)
      lloyd(n, poly, 1)
      c2.lineWidth = 0.75
      c2.strokeStyle = rgba(C.ink, 0.6)
      c2.beginPath()
      for (let i = 0; i < n; i++) {
        for (let q = 0; q < VC.CN[i]; q++) {
          const j = VC.CL[i * MAXV + q]
          if (j < 0 || j < i) continue
          const q2 = (q + 1) % VC.CN[i]
          c2.moveTo(VC.CX[i * MAXV + q], VC.CY[i * MAXV + q])
          c2.lineTo(VC.CX[i * MAXV + q2], VC.CY[i * MAXV + q2])
        }
      }
      c2.stroke()
      // long veins sweeping to the tip, then the outline (the costa leads)
      c2.strokeStyle = C.ink
      c2.lineWidth = 1
      for (const f of [0.14, 0.33, 0.56]) {
        c2.beginPath()
        for (let q = 0; q <= 30; q++) {
          const u = -0.97 + (q / 30) * 1.8
          const s = Math.sqrt(Math.max(0, 1 - u * u))
          const y = cy - s * b1 + f * s * (b1 + b2) * (1 - 0.3 * Math.max(0, u))
          if (q === 0) c2.moveTo(ccx + u * aw, y)
          else c2.lineTo(ccx + u * aw, y)
        }
        c2.stroke()
      }
      c2.lineWidth = 1.3
      c2.beginPath()
      pathPoly(c2, poly)
      c2.stroke()
      // the pterostigma: a dark cell on the leading edge near the tip
      const pu = 0.74
      const pu2 = 0.83
      const yA = cy - Math.sqrt(1 - pu * pu) * b1
      const yB = cy - Math.sqrt(1 - pu2 * pu2) * b1
      c2.fillStyle = rgba(C.ink, 0.8)
      c2.beginPath()
      c2.moveTo(ccx + pu * aw, yA)
      c2.lineTo(ccx + pu2 * aw, yB)
      c2.lineTo(ccx + pu2 * aw, yB + b2 * 0.16)
      c2.lineTo(ccx + pu * aw, yA + b2 * 0.16)
      c2.closePath()
      c2.fill()
    }
    // the thorax the wings hang from, as a short hairline stub
    c2.lineWidth = 1.2
    c2.beginPath()
    c2.moveTo(-a - a * 0.02, -a * 0.2)
    c2.lineTo(-a - a * 0.02, a * 0.3)
    c2.stroke()
    c2.restore()
  }

  /** c. Dry earth: random plates, shrunk apart; the cracks between them are hatched dark. */
  function mud(c2: CanvasRenderingContext2D, ww: number, hh: number, r: R) {
    c2.strokeStyle = rgba(C.ink, 0.55)
    c2.lineWidth = 1
    hatchIn(c2, 0, 0, ww, hh, 2.2, -0.75)
    const sp = Math.min(ww, hh) / 3.4
    const d = box(ww, hh, -sp)
    const n = scatter(Math.round(((ww + 2 * sp) * (hh + 2 * sp)) / (sp * sp * 0.85)), -sp, -sp, ww + 2 * sp, hh + 2 * sp, r, sp * 0.5)
    voronoi(VX, VY, n, d, VC)
    for (let i = 0; i < n; i++) {
      const p = inset(cellPts(VC, i), sp * (0.045 + r() * 0.05))
      if (!p.length) continue
      // a ragged edge: subdivide and nudge each run along its normal
      const q: number[] = []
      const m = p.length / 2
      for (let k = 0; k < m; k++) {
        const x0 = p[k * 2]
        const y0 = p[k * 2 + 1]
        const x1 = p[((k + 1) % m) * 2]
        const y1 = p[((k + 1) % m) * 2 + 1]
        const L = Math.hypot(x1 - x0, y1 - y0)
        const steps = Math.max(1, Math.round(L / 6))
        const nx = -(y1 - y0) / (L || 1)
        const ny = (x1 - x0) / (L || 1)
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          const j = s === 0 ? 0 : noise.n2((x0 + t * (x1 - x0)) * 0.09 + i, (y0 + t * (y1 - y0)) * 0.09) * sp * 0.035
          q.push(x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j)
        }
      }
      c2.fillStyle = C.paper
      c2.beginPath()
      pathPoly(c2, q, 1.5)
      c2.fill()
      c2.strokeStyle = C.ink
      c2.stroke()
      // a hairline of secondary cracking, sometimes
      if (r() < 0.35 && q.length > 8) {
        const a0 = Math.floor(r() * (q.length / 2))
        const gx = VC.GX[i]
        const gy = VC.GY[i]
        c2.strokeStyle = rgba(C.ink, 0.5)
        c2.beginPath()
        c2.moveTo(q[a0 * 2], q[a0 * 2 + 1])
        c2.quadraticCurveTo(lerp(q[a0 * 2], gx, 0.4) + (r() - 0.5) * 6, lerp(q[a0 * 2 + 1], gy, 0.4) + (r() - 0.5) * 6, lerp(q[a0 * 2], gx, 0.7), lerp(q[a0 * 2 + 1], gy, 0.7))
        c2.stroke()
      }
    }
  }

  /** d. A leaf: midrib, pinnate secondary veins, and the small areoles between them. */
  function leaf(c2: CanvasRenderingContext2D, ww: number, hh: number, r: R) {
    const ang = -Math.atan2(hh, ww) * 0.9
    const L = Math.min(Math.hypot(ww, hh) * 0.8, (ww / Math.abs(Math.cos(ang))) * 0.95)
    const Wd = L * 0.32
    const cx = ww / 2
    const cy = hh / 2
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const P = (u: number, v: number): [number, number] => [cx + u * ca - v * sa, cy + u * sa + v * ca]
    // outline: widest a little below the middle, pointed at both ends (convex)
    const poly: number[] = []
    const M = 48
    for (let k = 0; k < M; k++) {
      const t = (k / M) * TAU
      const u = Math.cos(t) * L * 0.5
      const s = Math.sin(t)
      const v = s * Wd * 0.5 * (1 - 0.12 * Math.cos(t))
      const [x, y] = P(u, v)
      poly.push(x, y)
    }
    const inside = (x: number, y: number) => {
      const dx = x - cx
      const dy = y - cy
      const u = (dx * ca + dy * sa) / (L * 0.5)
      const v = (-dx * sa + dy * ca) / (Wd * 0.5)
      return u * u + v * v < 0.97
    }
    const sp = Math.max(4, L / 26)
    const n = scatter(Math.min(NMAX, Math.round((Math.PI * L * Wd) / 4 / (sp * sp * 0.75))), cx - L / 2, cy - L / 2, L, L, r, sp, inside)
    lloyd(n, poly, 1)
    c2.lineWidth = 0.75
    c2.strokeStyle = rgba(C.moss, 0.75)
    c2.beginPath()
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < VC.CN[i]; k++) {
        const j = VC.CL[i * MAXV + k]
        if (j < 0 || j < i) continue
        const k2 = (k + 1) % VC.CN[i]
        c2.moveTo(VC.CX[i * MAXV + k], VC.CY[i * MAXV + k])
        c2.lineTo(VC.CX[i * MAXV + k2], VC.CY[i * MAXV + k2])
      }
    }
    c2.stroke()
    // secondary veins, curving toward the tip, then the midrib and the margin
    c2.strokeStyle = C.fern
    c2.lineWidth = 1.1
    for (let s = 1; s <= 7; s++) {
      const u0 = -L * 0.42 + (s / 8) * L * 0.8
      for (const side of [-1, 1]) {
        c2.beginPath()
        const [x0, y0] = P(u0, 0)
        c2.moveTo(x0, y0)
        const reach = Wd * 0.46 * Math.sqrt(Math.max(0, 1 - (u0 / (L * 0.5)) ** 2))
        const [x1, y1] = P(u0 + reach * 0.55, side * reach * 0.55)
        const [x2, y2] = P(u0 + reach * 1.05, side * reach * 0.93)
        c2.quadraticCurveTo(x1, y1, x2, y2)
        c2.stroke()
      }
    }
    c2.lineWidth = 1.6
    c2.beginPath()
    const [mx0, my0] = P(-L * 0.5 - L * 0.08, 0)
    const [mx1, my1] = P(L * 0.47, 0)
    c2.moveTo(mx0, my0)
    c2.lineTo(mx1, my1)
    c2.stroke()
    c2.strokeStyle = C.ink
    c2.lineWidth = 1.1
    c2.beginPath()
    pathPoly(c2, poly)
    c2.stroke()
  }

  /** e. Soap foam: bubbles of many sizes; each film bows into the larger bubble (Laplace), three films at each junction. */
  function foam(c2: CanvasRenderingContext2D, ww: number, hh: number, r: R) {
    const sp = Math.min(ww, hh) / 5.2
    const d = box(ww, hh, -sp * 0.6)
    const blob = (x: number, y: number) => 0.25 + 0.75 * (0.5 + 0.5 * noise.n2(x / (sp * 3.2) + 3, y / (sp * 3.2)))
    const n = scatter(Math.min(NMAX, Math.round(((ww + sp) * (hh + sp)) / (sp * sp * 0.55))), -sp * 0.6, -sp * 0.6, ww + sp * 1.2, hh + sp * 1.2, r, sp * 0.62, () => true, blob)
    lloyd(n, d, 2)
    const rad = new Float64Array(n)
    for (let i = 0; i < n; i++) rad[i] = Math.sqrt(VC.A[i] / Math.PI)
    c2.strokeStyle = C.ink
    c2.lineWidth = 1
    c2.beginPath()
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < VC.CN[i]; k++) {
        const j = VC.CL[i * MAXV + k]
        if (j < 0 || j < i) continue
        const k2 = (k + 1) % VC.CN[i]
        const x0 = VC.CX[i * MAXV + k]
        const y0 = VC.CY[i * MAXV + k]
        const x1 = VC.CX[i * MAXV + k2]
        const y1 = VC.CY[i * MAXV + k2]
        const L = Math.hypot(x1 - x0, y1 - y0)
        if (L < 0.5) continue
        // bow toward the larger bubble: sagitta ∝ L² (1/r_small − 1/r_large)
        const big = rad[j] > rad[i] ? j : i
        const dk = Math.abs(1 / rad[i] - 1 / rad[j])
        const sag = clamp(0.5 * L * L * dk * 0.35, 0, L * 0.18)
        let nx = -(y1 - y0) / L
        let ny = (x1 - x0) / L
        if ((VX[big] - (x0 + x1) / 2) * nx + (VY[big] - (y0 + y1) / 2) * ny < 0) {
          nx = -nx
          ny = -ny
        }
        c2.moveTo(x0, y0)
        c2.quadraticCurveTo((x0 + x1) / 2 + nx * sag * 2, (y0 + y1) / 2 + ny * sag * 2, x1, y1)
      }
    }
    c2.stroke()
    // Plateau borders: a small dark fillet at each three-way junction, and a glint in each bubble
    c2.fillStyle = rgba(C.ink, 0.8)
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < VC.CN[i]; k++) {
        const kp = (k + VC.CN[i] - 1) % VC.CN[i]
        if (VC.CL[i * MAXV + k] < i || VC.CL[i * MAXV + kp] < i) continue
        c2.beginPath()
        c2.arc(VC.CX[i * MAXV + k], VC.CY[i * MAXV + k], 1.5, 0, TAU)
        c2.fill()
      }
      if (rad[i] > 6) {
        c2.strokeStyle = rgba(C.ink2, 0.5)
        c2.beginPath()
        c2.arc(VX[i] - rad[i] * 0.25, VY[i] - rad[i] * 0.25, rad[i] * 0.45, Math.PI * 1.05, Math.PI * 1.45)
        c2.stroke()
      }
    }
  }

  /** f. A city's towers: streets, a river, and the cells that tell each phone which tower is nearest. */
  function towers(c2: CanvasRenderingContext2D, ww: number, hh: number, r: R) {
    // streets: a slightly turned grid and two avenues
    c2.strokeStyle = rgba(C.ink, 0.12)
    c2.lineWidth = 1
    const g = Math.max(9, Math.min(ww, hh) / 11)
    c2.save()
    c2.translate(ww / 2, hh / 2)
    c2.rotate(0.12)
    c2.beginPath()
    for (let x = -ww; x <= ww; x += g) {
      c2.moveTo(x, -hh)
      c2.lineTo(x, hh)
    }
    for (let y = -hh; y <= hh; y += g) {
      c2.moveTo(-ww, y)
      c2.lineTo(ww, y)
    }
    c2.stroke()
    c2.restore()
    c2.strokeStyle = rgba(C.ink, 0.28)
    c2.lineWidth = 1.4
    c2.beginPath()
    c2.moveTo(0, hh * 0.9)
    c2.lineTo(ww, hh * 0.15)
    c2.moveTo(ww * 0.08, 0)
    c2.lineTo(ww * 0.62, hh)
    c2.stroke()
    // the river
    c2.strokeStyle = rgba(C.ocean, 0.55)
    c2.lineWidth = 1
    for (const off of [-4, 4]) {
      c2.beginPath()
      for (let k = 0; k <= 40; k++) {
        const x = (k / 40) * ww
        const y = hh * 0.62 + Math.sin(k * 0.22 + 1) * hh * 0.1 + off
        if (k === 0) c2.moveTo(x, y)
        else c2.lineTo(x, y)
      }
      c2.stroke()
    }
    // towers: denser downtown
    const sp = Math.min(ww, hh) / 3.3
    const downtown = (x: number, y: number) => clamp(0.3 + 0.9 * Math.exp(-(((x - ww * 0.4) / (ww * 0.38)) ** 2 + ((y - hh * 0.38) / (hh * 0.4)) ** 2)))
    const n = scatter(Math.round((ww * hh) / (sp * sp * 0.6)), 0, 0, ww, hh, r, sp * 0.55, () => true, downtown)
    voronoi(VX, VY, n, box(ww, hh, 0), VC)
    c2.strokeStyle = C.ocean
    c2.lineWidth = 1
    c2.setLineDash([3, 2.5])
    c2.beginPath()
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < VC.CN[i]; k++) {
        const j = VC.CL[i * MAXV + k]
        if (j < 0 || j < i) continue
        const k2 = (k + 1) % VC.CN[i]
        c2.moveTo(VC.CX[i * MAXV + k], VC.CY[i * MAXV + k])
        c2.lineTo(VC.CX[i * MAXV + k2], VC.CY[i * MAXV + k2])
      }
    }
    c2.stroke()
    c2.setLineDash([])
    // each tower: a mast and two arcs of signal
    c2.strokeStyle = C.ink
    for (let i = 0; i < n; i++) {
      const x = VX[i]
      const y = VY[i]
      c2.beginPath()
      c2.moveTo(x - 3, y + 4)
      c2.lineTo(x, y - 4)
      c2.lineTo(x + 3, y + 4)
      c2.moveTo(x - 1.5, y)
      c2.lineTo(x + 1.5, y)
      c2.stroke()
      c2.beginPath()
      c2.arc(x, y - 4, 4, -Math.PI * 0.8, -Math.PI * 0.2)
      c2.stroke()
      c2.beginPath()
      c2.arc(x, y - 4, 7, -Math.PI * 0.75, -Math.PI * 0.25)
      c2.stroke()
    }
  }

  /* ------------------------------------------------------------ clock + input */

  const at = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(at) ? at : preview ? 22 : 0
  let wall = 0
  let rate = 1
  let prevT = -1
  let curT = 0
  let holdUntil = -1
  let touched = false
  let pressed = false
  let touch = false
  let pointerIn = false
  let px = 0
  let py = 0
  let downX = 0
  let downY = 0
  let downWall = 0
  let moved = 0
  let grab = -1
  let relaxing = false
  let spaceHeld = false
  let hoverSeed = -1
  let scrubbing = false
  let hoverRuler = -1
  const rings: { x: number; y: number; t: number }[] = []

  layout()

  const onRuler = (x: number, y: number) => !preview && !tiny && y > rulerY - 18 && y < h && x > pad - 8 && x < w - pad + 8
  const inField = (x: number, y: number) => x >= fx && x <= fx + fw && y >= fy && y <= fy + fh
  function seekTo(x: number) {
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2) target = c.t
    clock = Math.min(LOOP - 0.05, target)
    live = false
  }
  function chapterAt(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }
  function nearestSeed(x: number, y: number, n: number) {
    let best = -1
    let bd = (touch ? 24 : 13) ** 2
    for (let i = 0; i < n; i++) {
      const d = (SXs[i] - x) ** 2 + (SYs[i] - y) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }

  /* ------------------------------------------------------------ drawing helpers */

  const k = { ink: C.ink, ink2: C.ink2, muted: C.muted, rule: C.rule }

  function wrap(words: Word[], size: number, maxW: number) {
    const lines: Word[][] = [[]]
    const width = (ws: Word[]) => {
      let t = 0
      for (const wd of ws) {
        setFont(ctx, { font: 'serif', size, italic: wd.em })
        t += ctx.measureText(wd.w + ' ').width
      }
      return t
    }
    const emStart = words.findIndex((wd) => wd.em)
    const emW = emStart >= 0 ? width(words.slice(emStart)) : 0
    let x = 0
    words.forEach((wd, i) => {
      setFont(ctx, { font: 'serif', size, italic: wd.em })
      const ww = ctx.measureText(wd.w).width
      const sp = ctx.measureText(' ').width
      const breakEm = i === emStart && emW <= maxW && x + emW - sp > maxW
      if (x > 0 && (x + ww > maxW || breakEm)) {
        lines.push([])
        x = 0
      }
      lines[lines.length - 1].push(wd)
      x += ww + sp
    })
    return lines
  }
  function captionLines(cap: { text: string }) {
    let size = capSize
    let lines: Word[][] = []
    const maxLines = stacked && w < 520 ? 3 : 2
    for (let iter = 0; iter < 8; iter++) {
      lines = wrap(parseWords(cap.text), size, capW)
      if (lines.length <= maxLines) break
      size *= 0.9
    }
    return { lines, size }
  }
  function caption(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const { lines, size } = captionLines(cap)
      const lineH = size * 1.06
      const top = capBottom - lines.length * lineH
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = top + (li + 1) * lineH - size * 0.2
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - size * 1.02, w, size * 1.32)
        ctx.clip()
        const dy = (1 - pr) * size * 1.15 - pe * size * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        let x = capX
        for (const wd of ln) {
          text(ctx, wd.w, x, y + dy, { font: 'serif', size, italic: wd.em, color: wd.em ? C.moss : k.ink })
          setFont(ctx, { font: 'serif', size, italic: wd.em })
          x += ctx.measureText(wd.w + ' ').width
        }
        ctx.restore()
      })
    }
  }
  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    setFont(ctx, o)
    ctx.save()
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.92)
    ctx.globalAlpha *= o?.alpha ?? 1
    ctx.strokeText(o?.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }

  /** The frame of the field: a hairline and corner marks. */
  function fieldFrame(a: number) {
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(fx) + 0.5, Math.round(fy) + 0.5, Math.round(fw), Math.round(fh))
    const m = 6
    const s = 9
    ctx.strokeStyle = k.muted
    ctx.beginPath()
    for (const [x, y, dx, dy] of [
      [fx - m, fy - m, 1, 1],
      [fx + fw + m, fy - m, -1, 1],
      [fx - m, fy + fh + m, 1, -1],
      [fx + fw + m, fy + fh + m, -1, -1],
    ]) {
      ctx.moveTo(x, y + dy * s)
      ctx.lineTo(x, y)
      ctx.lineTo(x + dx * s, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  /* ------------------------------------------------------------ the field, drawn */

  let meanG = 0
  let hexFrac = 0
  const hist = new Int32Array(10)

  function fieldStats(n: number) {
    let g = 0
    let cnt = 0
    hist.fill(0)
    let interior = 0
    let hex = 0
    for (let i = 0; i < n; i++) {
      const sd = cells.SD[i]
      if (sd < 0 || cells.A[i] <= 0) continue
      interior++
      if (sd === 6) hex++
      hist[clamp(sd, 3, 9)]++
      g += cells.I2[i] / (2 * cells.A[i] * cells.A[i])
      cnt++
    }
    meanG = cnt ? g / cnt : 0
    hexFrac = interior ? hex / interior : 0
  }

  function drawField(T: number, n: number, alpha: number) {
    if (alpha <= 0.01) return
    const grow = T < GROW0 ? 0 : T < GROW1 ? ease.inOutSine((T - GROW0) / (GROW1 - GROW0)) : 1
    // before and during the growth only what the circles have reached is drawn (nothing in chapter I)
    const growing = !live && T < GROW1
    const rMax = spacing * 1.15
    const R = grow * rMax
    const settled = T >= RX0 - 0.5 || live
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    // defects and honeycomb wash, under the walls
    const defA = live ? 0.9 : smoothstep(RX0 - 0.4, RX0 + 1.2, T) * (1 - smoothstep(RX1 - 0.4, RX1 + 1.4, T))
    if (defA > 0.01 && !preview) {
      for (let i = 0; i < n; i++) {
        const sd = cells.SD[i]
        if (sd < 0 || sd === 6) continue
        ctx.fillStyle = sd < 6 ? rgba(C.ocean, 0.13 * defA) : rgba(C.moss, 0.15 * defA)
        ctx.beginPath()
        const b = i * MAXV
        ctx.moveTo(cells.CX[b], cells.CY[b])
        for (let q = 1; q < cells.CN[i]; q++) ctx.lineTo(cells.CX[b + q], cells.CY[b + q])
        ctx.closePath()
        ctx.fill()
      }
    }
    // the honeycomb: walls doubled, each cell drawn a little inside itself
    const comb = live ? 0 : smoothstep(RX1 + 0.2, RX1 + 2.2, T)
    // walls (the Voronoi edges), each once; during the growth only the parts the circles have reached
    ctx.strokeStyle = k.ink
    ctx.globalAlpha = alpha * (1 - comb)
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const b = i * MAXV
      const m = cells.CN[i]
      for (let q = 0; q < m; q++) {
        const j = cells.CL[b + q]
        if (j >= 0 && j < i) continue
        if (j < 0) continue
        const q2 = q + 1 === m ? 0 : q + 1
        const x0 = cells.CX[b + q]
        const y0 = cells.CY[b + q]
        const x1 = cells.CX[b + q2]
        const y1 = cells.CY[b + q2]
        if (!growing) {
          ctx.moveTo(x0, y0)
          ctx.lineTo(x1, y1)
          continue
        }
        // the part of this wall within R of the seed (both seeds are equally far from every point on it)
        const dx = x1 - x0
        const dy = y1 - y0
        const ex = x0 - SXs[i]
        const ey = y0 - SYs[i]
        const A2 = dx * dx + dy * dy
        const B = ex * dx + ey * dy
        const Cc = ex * ex + ey * ey - R * R
        const disc = B * B - A2 * Cc
        if (A2 < 1e-9 || disc <= 0) continue
        const sq = Math.sqrt(disc)
        const t0 = Math.max(0, (-B - sq) / A2)
        const t1 = Math.min(1, (-B + sq) / A2)
        if (t1 <= t0) continue
        ctx.moveTo(x0 + dx * t0, y0 + dy * t0)
        ctx.lineTo(x0 + dx * t1, y0 + dy * t1)
      }
    }
    ctx.stroke()
    if (comb > 0.01) {
      ctx.globalAlpha = alpha * comb
      const t = spacing * 0.075
      ctx.fillStyle = rgba(C.fern, 0.06)
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const p = inset(cellPts(cells, i), t)
        if (p.length) pathPoly(ctx, p, t * 0.8)
      }
      ctx.fill()
      ctx.stroke()
    }
    // the growing fronts: each seed's circle, where it is still inside its own cell
    if (growing && R > 0.5) {
      ctx.globalAlpha = alpha
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      const M = clamp(Math.round(R * 0.6), 14, 56)
      for (let i = 0; i < n; i++) {
        const b = i * MAXV
        const m = cells.CN[i]
        let pen = false
        for (let s = 0; s <= M; s++) {
          const a = (s / M) * TAU
          const x = SXs[i] + Math.cos(a) * R
          const y = SYs[i] + Math.sin(a) * R
          let ins = x >= fx && x <= fx + fw && y >= fy && y <= fy + fh
          for (let q = 0; q < m && ins; q++) {
            const j = cells.CL[b + q]
            if (j < 0) continue
            const nx = SXs[j] - SXs[i]
            const ny = SYs[j] - SYs[i]
            if ((x - SXs[i]) * nx + (y - SYs[i]) * ny > (nx * nx + ny * ny) / 2) ins = false
          }
          if (ins) {
            if (pen) ctx.lineTo(x, y)
            else ctx.moveTo(x, y)
            pen = true
          } else pen = false
        }
      }
      ctx.stroke()
    }
    // Delaunay, the dual: faint, after the walls are up
    const del = live ? 0.55 : smoothstep(12.2, 13.6, T) * (1 - smoothstep(RX1 - 1, RX1 + 1, T))
    if (del > 0.01) {
      ctx.globalAlpha = alpha * del
      ctx.strokeStyle = rgba(C.ocean, 0.42)
      ctx.setLineDash([1.5, 3])
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const b = i * MAXV
        for (let q = 0; q < cells.CN[i]; q++) {
          const j = cells.CL[b + q]
          if (j <= i) continue
          ctx.moveTo(SXs[i], SYs[i])
          ctx.lineTo(SXs[j], SYs[j])
        }
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    // Lloyd: from each seed to its cell's centroid, where it will go next
    const arrows = live ? (relaxing || (T > RX0 && T < RX1 && rate > 0.5) ? 0.9 : 0) : smoothstep(RX0 - 0.6, RX0 + 0.6, T) * (1 - smoothstep(RX1 - 2.4, RX1 - 0.6, T))
    if (arrows > 0.01 && !tiny) {
      ctx.globalAlpha = alpha * arrows
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const dx = cells.GX[i] - SXs[i]
        const dy = cells.GY[i] - SYs[i]
        const L = Math.hypot(dx, dy)
        if (L < 2.5) continue
        // drawn at twice the length, so the small last moves still read
        const ex = SXs[i] + dx * 2
        const ey = SYs[i] + dy * 2
        ctx.moveTo(SXs[i], SYs[i])
        ctx.lineTo(ex, ey)
        const ux = dx / L
        const uy = dy / L
        ctx.moveTo(ex - ux * 3.5 - uy * 2, ey - uy * 3.5 + ux * 2)
        ctx.lineTo(ex, ey)
        ctx.lineTo(ex - ux * 3.5 + uy * 2, ey - uy * 3.5 - ux * 2)
      }
      ctx.stroke()
      // the centroids, as small crosses
      ctx.strokeStyle = rgba(C.ocean, 0.7)
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const gx = cells.GX[i]
        const gy = cells.GY[i]
        ctx.moveTo(gx - 2, gy)
        ctx.lineTo(gx + 2, gy)
        ctx.moveTo(gx, gy - 2)
        ctx.lineTo(gx, gy + 2)
      }
      ctx.stroke()
    }
    // seeds
    ctx.globalAlpha = alpha
    ctx.fillStyle = k.ink
    const sr = clamp(spacing * 0.045, 1.4, 2.6)
    for (let i = 0; i < n; i++) {
      const pop = live ? 1 : ease.outBack(clamp((T - born[i]) / 0.35))
      if (pop <= 0.01) continue
      ctx.beginPath()
      ctx.arc(SXs[i], SYs[i], sr * pop * (i === grab ? 1.6 : 1), 0, TAU)
      ctx.fill()
      if (!settled && T < GROW0 + 0.3 && pop < 1.2) {
        // a small ring as it lands
        const age = T - born[i]
        if (age > 0 && age < 0.9) {
          ctx.strokeStyle = rgba(C.ink, 0.5 * (1 - age / 0.9))
          ctx.beginPath()
          ctx.arc(SXs[i], SYs[i], sr + age * 14, 0, TAU)
          ctx.stroke()
        }
      }
    }
    if (hoverSeed >= 0 && hoverSeed < n && grab < 0) {
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      ctx.arc(SXs[hoverSeed], SYs[hoverSeed], sr + 6, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  /** II: why the walls are straight — one pair, its bisector; one corner, its empty circle. */
  function geometryNotes(T: number, n: number) {
    const a = live ? 0 : smoothstep(10.6, 11.6, T) * (1 - smoothstep(14.4, 15.4, T))
    if (a <= 0.01 || preview) return
    // the pair nearest the field's center that share a wall long enough to annotate
    const mx = fx + fw / 2
    const my = fy + fh / 2
    let bi = -1
    let bq = -1
    let bd = Infinity
    for (let i = 0; i < n; i++) {
      const b = i * MAXV
      const m = cells.CN[i]
      for (let q = 0; q < m; q++) {
        const j = cells.CL[b + q]
        if (j <= i) continue
        const q2 = q + 1 === m ? 0 : q + 1
        const L = Math.hypot(cells.CX[b + q2] - cells.CX[b + q], cells.CY[b + q2] - cells.CY[b + q])
        if (L < spacing * 0.45) continue
        const d = Math.hypot((SXs[i] + SXs[j]) / 2 - mx, (SYs[i] + SYs[j]) / 2 - my)
        if (d < bd) {
          bd = d
          bi = i
          bq = q
        }
      }
    }
    if (bi < 0) return
    const b = bi * MAXV
    const j = cells.CL[b + bq]
    const q2 = bq + 1 === cells.CN[bi] ? 0 : bq + 1
    const ax = SXs[bi]
    const ay = SYs[bi]
    const bx = SXs[j]
    const by = SYs[j]
    const ex0 = cells.CX[b + bq]
    const ey0 = cells.CY[b + bq]
    const ex1 = cells.CX[b + q2]
    const ey1 = cells.CY[b + q2]
    const ux = (bx - ax) / Math.hypot(bx - ax, by - ay)
    const uy = (by - ay) / Math.hypot(bx - ax, by - ay)
    const mxp = (ax + bx) / 2
    const myp = (ay + by) / 2
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // the segment between the two seeds, with equal-length ticks
    ctx.strokeStyle = C.moss
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    for (const t of [0.25, 0.75]) {
      const cx = lerp(ax, bx, t)
      const cy = lerp(ay, by, t)
      for (const o of [-1.5, 1.5]) {
        ctx.moveTo(cx + ux * o - uy * 4, cy + uy * o + ux * 4)
        ctx.lineTo(cx + ux * o + uy * 4, cy + uy * o - ux * 4)
      }
    }
    ctx.stroke()
    // the wall itself, emphasized, and the right angle where it crosses
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(ex0, ey0)
    ctx.lineTo(ex1, ey1)
    ctx.stroke()
    ctx.lineWidth = 1
    const s = 6
    ctx.beginPath()
    ctx.moveTo(mxp + ux * s, myp + uy * s)
    ctx.lineTo(mxp + ux * s - uy * s, myp + uy * s + ux * s)
    ctx.lineTo(mxp - uy * s, myp + ux * s)
    ctx.stroke()
    halo('EQUIDISTANT', (ex0 + ex1) / 2 + 10, (ey0 + ey1) / 2 - 8, { size: lab, color: C.moss, tracking: 0.14 })
    // a corner shared by three cells: the circle through their seeds holds no other seed
    const m = cells.CN[bi]
    for (let q = 0; q < m; q++) {
      const qp = (q + m - 1) % m
      const j1 = cells.CL[b + q]
      const j0 = cells.CL[b + qp]
      if (j1 < 0 || j0 < 0 || j1 === j || j0 === j) continue
      const vx = cells.CX[b + q]
      const vy = cells.CY[b + q]
      const rr = Math.hypot(vx - ax, vy - ay)
      if (vx - rr < fx || vx + rr > fx + fw || vy - rr < fy || vy + rr > fy + fh) continue
      ctx.strokeStyle = C.ocean
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(vx, vy, rr, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(vx, vy, 2.2, 0, TAU)
      ctx.fill()
      halo('EMPTY CIRCLE', vx - rr * 0.72 - 4, vy - rr * 0.72 - 6, { size: lab, color: C.ocean, tracking: 0.14, align: 'right' })
      break
    }
    ctx.restore()
  }

  /** III: sides per cell, as a small bar chart, and the second moment against the hexagon's. */
  function statsPanel(T: number) {
    const a = live ? 1 : smoothstep(RX0 - 0.4, RX0 + 1, T) * (1 - smoothstep(RX1 + 2.6, RX1 + 4, T))
    if (a <= 0.01 || preview || tiny || short) return
    let x0 = capX
    let y0 = pad + 36 + 3 * 16 + 18
    if (stacked && !portrait) return
    if (portrait) {
      x0 = fx
      y0 = fy + fh + 26
    }
    const bw = 22
    const bh = portrait ? 34 : 54
    ctx.save()
    ctx.globalAlpha = a
    let total = 0
    for (let s = 3; s <= 9; s++) total += hist[s]
    text(ctx, 'SIDES PER CELL', x0, y0, { size: 8.5, color: k.muted, tracking: 0.14 })
    for (let s = 4; s <= 8; s++) {
      const v = total ? hist[s] / total : 0
      const x = x0 + (s - 4) * (bw + 8)
      const y = y0 + 12 + bh
      ctx.strokeStyle = k.rule
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y - bh) + 0.5, bw, bh)
      ctx.fillStyle = s === 6 ? k.ink : s < 6 ? rgba(C.ocean, 0.6) : rgba(C.moss, 0.6)
      const hh2 = v * bh
      ctx.fillRect(x + 0.5, y - hh2 + 0.5, bw, hh2)
      text(ctx, String(s), x + bw / 2, y + 12, { size: 9, color: s === 6 ? k.ink : k.muted, align: 'center', tracking: 0.04 })
    }
    // the second moment: a needle on a short scale from scattered seeds (≈0.096) to the hexagon; the long tick is the square, 1/12
    const sx0 = portrait ? x0 + 5 * (bw + 8) + 18 : x0
    const sx1 = portrait ? Math.min(fx + fw, sx0 + 5 * (bw + 8) - 8) : x0 + 5 * (bw + 8) - 8
    const sy = portrait ? y0 + 34 : y0 + bh + 46
    const g0 = 0.096
    const xg = (g: number) => lerp(sx0, sx1, clamp((g0 - g) / (g0 - G_HEX)))
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    ctx.moveTo(sx0, sy)
    ctx.lineTo(sx1, sy)
    for (let q = 0; q <= 10; q++) {
      const x = lerp(sx0, sx1, q / 10)
      ctx.moveTo(x, sy)
      ctx.lineTo(x, sy - (q % 5 === 0 ? 5 : 3))
    }
    const xs = xg(1 / 12)
    ctx.moveTo(xs, sy + 3)
    ctx.lineTo(xs, sy - 8)
    ctx.stroke()
    if (meanG > 0) {
      const x = xg(meanG)
      ctx.fillStyle = k.ink
      ctx.beginPath()
      ctx.moveTo(x, sy + 1)
      ctx.lineTo(x - 3.5, sy + 7)
      ctx.lineTo(x + 3.5, sy + 7)
      ctx.closePath()
      ctx.fill()
    }
    text(ctx, 'SCATTERED', sx0, sy + 18, { size: 8, color: k.muted, tracking: 0.14 })
    text(ctx, 'HEXAGON', sx1, sy + 18, { size: 8, color: k.ink, tracking: 0.14, align: 'right' })
    text(ctx, `G ${meanG.toFixed(4)}`, sx0, sy - 12, { size: 9, color: k.ink, tracking: 0.06 })
    text(ctx, G_HEX.toFixed(4), sx1, sy - 12, { size: 9, color: k.muted, tracking: 0.06, align: 'right' })
    ctx.restore()
  }

  /* ------------------------------------------------------------ the plate */

  function drawPlate(T: number, alpha: number) {
    if (alpha <= 0.01) return
    const span = (PLATE1 - PLATE0) / platePages
    const page = Math.min(platePages - 1, Math.floor(Math.max(0, T - PLATE0) / span))
    const pT0 = PLATE0 + page * span
    const fadePage = platePages > 1 ? smoothstep(pT0, pT0 + 0.6, T) * (page < platePages - 1 ? 1 - smoothstep(pT0 + span - 0.7, pT0 + span, T) : 1) : 1
    ctx.save()
    for (let j = 0; j < perPage; j++) {
      const i = page * perPage + j
      const s = SPECS[i]
      if (!s) continue
      const t0 = Math.max(s.t0, pT0 + j * 0.75)
      const reveal = ease.inOutSine(clamp((T - t0) / 2.4))
      if (reveal <= 0) continue
      if (!s.img) renderSpec(s)
      const a = alpha * fadePage
      ctx.globalAlpha = a
      const cx = s.x + s.w / 2
      const cy = s.y + s.h / 2
      const R = Math.hypot(s.w, s.h) / 2
      ctx.save()
      ctx.beginPath()
      ctx.rect(s.x, s.y, s.w, s.h)
      ctx.clip()
      ctx.beginPath()
      ctx.arc(cx, cy, R * reveal + 0.01, 0, TAU)
      ctx.clip()
      if (s.img) ctx.drawImage(s.img, s.x, s.y, s.w, s.h)
      ctx.restore()
      if (reveal < 1) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(s.x, s.y, s.w, s.h)
        ctx.clip()
        ctx.strokeStyle = rgba(C.ink, 0.5)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx, cy, R * reveal, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }
      ctx.strokeStyle = k.ink2
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(s.x) + 0.5, Math.round(s.y) + 0.5, Math.round(s.w), Math.round(s.h))
      const la = smoothstep(t0 + 0.6, t0 + 1.4, T)
      const letter = String.fromCharCode(97 + i)
      if (tiny || preview) text(ctx, `${letter} ${s.name}`, s.x, s.y + s.h + 11, { size: 8, color: k.ink, tracking: 0.12, upper: true, alpha: la })
      else {
        text(ctx, `${letter} — ${s.name}`, s.x, s.y + s.h + 14, { size: 9.5, color: k.ink, tracking: 0.14, upper: true, alpha: la })
        if (s.w > 150) text(ctx, s.sub, s.x, s.y + s.h + 26, { size: 8.5, color: k.muted, tracking: 0.12, upper: true, alpha: la })
      }
    }
    ctx.restore()
  }

  /* ------------------------------------------------------------ chrome */

  function readouts(T: number) {
    const rows: [string, string][] = []
    const ch = chapterAt(T)
    const n = live ? nLive : N
    if (live) {
      rows.push(['SEEDS', String(n)], ['HEXAGONS', `${Math.round(hexFrac * 100)}%`], ['G', meanG.toFixed(4)])
    } else if (ch <= 1) {
      rows.push(['SEEDS', String(n)], ['RULE', 'NEAREST WINS'])
      if (ch === 1) rows.push(['CELLS', T < GROW1 ? `${Math.round(clamp((T - GROW0) / (GROW1 - GROW0)) * 100)}%` : String(n)])
    } else if (ch === 2) {
      rows.push(['ITERATION', String(Math.floor(iterAt(T)))], ['HEXAGONS', `${Math.round(hexFrac * 100)}%`], ['G', meanG.toFixed(4)])
    } else rows.push(['PLATE', 'II'], ['SPECIMENS', '6'])
    if (preview) rows.length = Math.min(rows.length, 2)
    const small = preview || tiny || short
    if (!stacked) {
      // a block in the left column, under the title: the field has the whole right side
      let y = pad + 36
      for (const [label, value] of rows) {
        text(ctx, label, capX, y, { size: small ? 8 : 9.5, color: k.muted, tracking: 0.14 })
        text(ctx, value, capX + (small ? 74 : 92), y, { size: small ? 9 : 10.5, color: k.ink, tracking: 0.06 })
        y += small ? 13 : 16
      }
      return
    }
    // stacked: one line, top right, as much as fits beside the title
    setFont(ctx, { size: small ? 8.5 : 10, tracking: 0.16 })
    const room = w - pad * 2 - ctx.measureText(`${FIG} — TERRITORIES`).width - 18
    let line = rows.map(([l, v]) => `${l} ${v}`).join(' · ')
    setFont(ctx, { size: small ? 8.5 : 9.5, tracking: 0.1 })
    while (rows.length > 1 && ctx.measureText(line).width > room) {
      rows.pop()
      line = rows.map(([l, v]) => `${l} ${v}`).join(' · ')
    }
    if (ctx.measureText(line).width <= room) text(ctx, line, w - pad, pad + 10, { size: small ? 8.5 : 9.5, color: k.ink, align: 'right', tracking: 0.1 })
  }

  function chrome(T: number) {
    const ch = chapterAt(T)
    const small = preview || tiny
    text(ctx, `${FIG} — Territories`, pad, pad + 10, { size: small ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(64.2, 65.4, T) : 1)
    const capOn = CAPTIONS.find((cc) => T > cc.t0 - 0.3 && T < cc.t1 + 0.3)
    const lines = capOn ? captionLines(capOn) : { lines: [[], []], size: capSize }
    const capTop = capBottom - lines.lines.length * lines.size * 1.06
    if (!tiny) text(ctx, live ? 'YOUR FIELD' : `${c.num} — ${c.name}`, capX, capTop - (small ? 6 : 10), { size: small ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true, alpha: live ? 1 : kIn })
    if (!preview && !tiny) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 33; i++) {
        const x = lerp(x0, x1, i / 33)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 3 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      CHAPTERS.forEach((cc, i) => {
        const x = lerp(x0, x1, cc.t / LOOP)
        text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
      })
      if (hoverRuler >= 0) {
        const hx = clamp(hoverRuler, x0, x1)
        const hc = chapterAt(((hx - x0) / (x1 - x0)) * LOOP)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${CHAPTERS[hc].name}`, clamp(hx, x0 + 50, x1 - 50), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12, upper: true })
      }
    }
  }

  /* the ghost: a dot that taps, then drags, early in full mode */
  const G0 = 2.2
  const G1 = 7.4
  function ghostDraw() {
    if (preview || touched || wall < G0 || wall > G1) return
    const u = (wall - G0) / (G1 - G0)
    const a = smoothstep(0, 0.08, u) * (1 - smoothstep(0.9, 1, u))
    const gx = fx + fw * 0.66
    const gy = fy + fh * 0.5
    const r = Math.min(fw, fh) * 0.12
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    // first a tap (a ring that closes), then a drag along a dotted arc
    if (u < 0.35) {
      const v = u / 0.35
      ctx.fillStyle = k.ink
      ctx.beginPath()
      ctx.arc(gx, gy, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(gx, gy, 16 * (1 - v) + 6, 0, TAU)
      ctx.stroke()
    } else {
      const v = ease.inOutSine((u - 0.35) / 0.55)
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.arc(gx - r, gy, r, -0.05, -Math.PI * 0.85, true)
      ctx.stroke()
      ctx.setLineDash([])
      const ang = lerp(-0.05, -Math.PI * 0.85, v)
      const dx = gx - r + Math.cos(ang) * r
      const dy = gy + Math.sin(ang) * r
      ctx.fillStyle = k.ink
      ctx.beginPath()
      ctx.arc(dx, dy, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(dx, dy, 9, 0, TAU)
      ctx.stroke()
    }
    const label = tiny ? 'TAP · DRAG · HOLD' : u < 0.35 ? 'TAP TO ADD A SEED' : 'DRAG ONE · HOLD TO RELAX'
    halo(label, gx, gy + 34, { size: 9, color: k.ink, tracking: 0.14, align: 'center' })
    ctx.restore()
  }

  function hints(T: number) {
    if (preview || tiny) return
    let msg = ''
    if (relaxing) msg = 'RELAXING · EACH SEED TO ITS CENTROID'
    else if (grab >= 0) msg = 'MOVING A SEED · ITS NEIGHBORS ANSWER'
    else if (live) msg = 'TAP · DRAG · HOLD TO RELAX'
    else if (!touched && wall > G1 && T < 37) msg = 'TAP TO ADD A SEED · DRAG ONE · HOLD TO RELAX'
    else if (T >= PLATE0 && T < PLATE1 - 1) msg = 'TAP A SPECIMEN TO GROW ANOTHER'
    if (!msg) return
    halo(msg, fx + fw, fy + fh + (stacked ? 16 : 18), { size: 9, color: k.muted, align: 'right', tracking: 0.14 })
  }

  /* ------------------------------------------------------------ sound: a chord that beats until the cells settle */

  let drone: { o1: OscillatorNode; o2: OscillatorNode; o3: OscillatorNode; g: GainNode } | null = null
  function droneSet(level: number, beat: number) {
    const ac = sfx.context()
    const outN = sfx.output()
    if (!ac || !outN) {
      if (drone) {
        try {
          drone.o1.stop()
          drone.o2.stop()
          drone.o3.stop()
        } catch {
          /* stopped */
        }
        drone = null
      }
      return
    }
    if (!drone) {
      const g = ac.createGain()
      g.gain.value = 0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      g.connect(lp)
      lp.connect(outN)
      const mk = (f: number, type: OscillatorType, gain: number) => {
        const o = ac.createOscillator()
        o.type = type
        o.frequency.value = f
        const gg = ac.createGain()
        gg.gain.value = gain
        o.connect(gg)
        gg.connect(g)
        o.start()
        return o
      }
      drone = { o1: mk(146.83, 'sine', 0.5), o2: mk(220, 'sine', 0.35), o3: mk(220, 'triangle', 0.18), g }
    }
    const t = ac.currentTime
    drone.g.gain.setTargetAtTime(level * 0.07, t, 0.5)
    // the third voice is detuned by how far the cells are from hexagons: the beating slows as they settle
    drone.o3.frequency.setTargetAtTime(220 + beat, t, 0.3)
  }

  /* ------------------------------------------------------------ frame */

  function frame(_t: number, dt: number) {
    wall += dt
    simulate()
    const interacting = pressed || spaceHeld || wall < holdUntil
    const want = interacting ? 0 : 1
    rate = lerp(rate, want, damp(want > rate ? 1.4 : 7, dt))
    if (rate > 0.999) rate = 1
    clock += dt * rate
    const T = mod(clock, LOOP)
    curT = T
    const advancing = dt > 0 && prevT >= 0 && T >= prevT && T - prevT < 1
    const crossed = (te: number) => advancing && prevT < te && te <= T
    if (prevT >= 0 && T < prevT - 1) {
      // a new loop: the field returns to the script, specimens to their first seeds
      live = false
      SPECS.forEach((s, i) => {
        if (s.seed !== 11 + i * 10) {
          s.seed = 11 + i * 10
          s.img = null
        }
        s.t0 = 0
      })
    }

    // the live field relaxes while held, and during chapter III once the clock runs again
    if (live && dt > 0) {
      const relaxRate = relaxing || spaceHeld ? 2.6 : T > RX0 && T < RX1 ? 1.1 * rate : 0
      if (relaxRate > 0) {
        voronoi(LX, LY, nLive, dom, cells)
        const kk = damp(relaxRate, dt)
        for (let i = 0; i < nLive; i++) {
          if (i === grab) continue
          LX[i] += (cells.GX[i] - LX[i]) * kk
          LY[i] += (cells.GY[i] - LY[i]) * kk
        }
      }
    }
    // a press that stays put becomes a hold
    if (pressed && grab < 0 && !relaxing && moved < (touch ? 14 : 8) && wall - downWall > 0.38 && inField(downX, downY)) {
      relaxing = true
      goLive(T)
    }

    ground(ctx, w, h, 'paper')

    // draw the specimens ahead of time, one per frame, while the field relaxes
    if (T > 28 && T < PLATE1) {
      const s = SPECS.find((q) => !q.img)
      if (s) renderSpec(s)
    }

    // your field is yours until the plate: then it fades like the script's, and the script takes over again
    if (live && T >= 38.8 && T < 60) live = false
    const fieldA = 1 - smoothstep(37.4, 38.8, T)
    const n = seedsAt(T)
    if (fieldA > 0.01) {
      voronoi(SXs, SYs, n, dom, cells)
      fieldStats(n)
      fieldFrame(fieldA)
      drawField(T, n, fieldA)
      geometryNotes(T, n)
      statsPanel(T)
    }
    drawPlate(T, smoothstep(PLATE0 - 0.4, PLATE0 + 0.2, T) * (1 - smoothstep(64.4, 65.6, T)))

    // pointer: the relax ring
    if (relaxing) {
      const p = clamp((wall - downWall - 0.38) / 1.5)
      ctx.save()
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(px, py, 18, -Math.PI / 2, -Math.PI / 2 + TAU * (0.15 + 0.85 * p))
      ctx.stroke()
      ctx.restore()
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const rr = rings[i]
      const age = wall - rr.t
      if (age > 0.8) {
        rings.splice(i, 1)
        continue
      }
      ctx.strokeStyle = rgba(C.ink, 0.6 * (1 - age / 0.8))
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(rr.x, rr.y, 4 + age * 30, 0, TAU)
      ctx.stroke()
    }

    // sound
    for (let i = 0; i < N && !live; i++) if (crossed(born[i]) && i % 3 === 0) sfx.tone(SCALE[i % 5] * (i % 2 ? 1 : 2), 0.9, { type: 'sine', gain: 0.03, room: 0.4, pan: clamp(((SXs[i] - fx) / fw) * 1.6 - 0.8, -0.8, 0.8) })
    if (crossed(GROW0 + 0.1)) sfx.noise(5.4, { filter: 400, to: 1400, q: 0.5, gain: 0.025, room: 0.6 })
    if (crossed(PLATE0 + 0.2)) [293.66, 369.99, 440, 587.33].forEach((f, j) => sfx.tone(f, 3.4, { type: 'sine', gain: 0.03, attack: 0.3, room: 0.6, when: j * 0.12 }))
    const relaxOn = live ? (relaxing || spaceHeld ? 1 : 0) : smoothstep(RX0 - 0.4, RX0 + 1, T) * (1 - smoothstep(RX1 + 1, RX1 + 3, T))
    if (sfx.enabled || drone) droneSet(sfx.enabled ? relaxOn : 0, clamp((meanG - G_HEX) * 900, 0.2, 9))

    readouts(T)
    caption(T)
    chrome(T)
    ghostDraw()
    hints(T)
    if (!preview) {
      const over = inField(px, py) && pointerIn
      env.setCursor(scrubbing || hoverRuler >= 0 ? 'pointer' : grab >= 0 ? 'grabbing' : hoverSeed >= 0 ? 'grab' : over && fieldA > 0.5 ? 'crosshair' : over ? 'pointer' : 'default')
    }
    prevT = T
  }

  /* ------------------------------------------------------------ instance */

  /* ------------------------------------------------------------ test hook: ?sim=tap | drag | hold replays a gesture */

  const sim = preview ? '' : env.params.get('sim') ?? ''
  let simApi: PieceInstance | null = null
  let simStage = 0
  let simX = 0
  let simY = 0
  function simulate() {
    if (!sim || !simApi?.pointer) return
    const P = (type: PointerInfo['type'], x: number, y: number, pressed: boolean) => simApi?.pointer?.({ type, x, y, id: 1, pointerType: 'mouse', pressed })
    if (sim === 'tap') {
      const spots = [
        [0.3, 0.3],
        [0.62, 0.55],
        [0.45, 0.8],
      ]
      const i = Math.floor(simStage / 2)
      if (i >= spots.length) return
      const x = fx + fw * spots[i][0]
      const y = fy + fh * spots[i][1]
      if (simStage % 2 === 0 && wall >= 0.2 + i * 0.25) {
        P('down', x, y, true)
        simStage++
      } else if (simStage % 2 === 1 && wall >= 0.3 + i * 0.25) {
        P('up', x, y, false)
        simStage++
      }
      return
    }
    if (sim === 'drag') {
      if (simStage === 0 && wall >= 0.2) {
        // the seed nearest the middle of the field
        let best = 0
        let bd = Infinity
        const n = live ? nLive : N
        for (let i = 0; i < n; i++) {
          const d = (SXs[i] - (fx + fw / 2)) ** 2 + (SYs[i] - (fy + fh / 2)) ** 2
          if (d < bd) {
            bd = d
            best = i
          }
        }
        simX = SXs[best]
        simY = SYs[best]
        P('down', simX, simY, true)
        simStage = 1
      } else if (simStage === 1) {
        const u = clamp((wall - 0.2) / 0.7)
        P('move', simX + u * spacing * 1.6, simY + u * spacing * 0.6, true)
        if (u >= 1) simStage = 2
      }
      return
    }
    if (sim === 'hold') {
      if (simStage === 0 && wall >= 0.2) {
        simX = fx + fw * 0.5
        simY = fy + fh * 0.5
        P('down', simX, simY, true)
        simStage = 1
      }
    }
  }

  const api: PieceInstance = {
    resize() {
      const oldFx = fx
      const oldFy = fy
      const oldFw = fw
      const oldFh = fh
      const wasLive = live
      const keepN = nLive
      layout()
      if (wasLive) {
        for (let i = 0; i < keepN; i++) {
          LX[i] = fx + ((LX[i] - oldFx) / oldFw) * fw
          LY[i] = fy + ((LY[i] - oldFy) / oldFh) * fh
        }
        nLive = keepN
        live = true
      }
    },
    frame,
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      px = p.x
      py = p.y
      if (p.type === 'leave') {
        pointerIn = false
        if (pressed) holdUntil = wall + 3
        pressed = false
        grab = -1
        relaxing = false
        hoverSeed = -1
        scrubbing = false
        hoverRuler = -1
        return
      }
      pointerIn = true
      const ruler = onRuler(p.x, p.y)
      hoverRuler = ruler || scrubbing ? p.x : -1
      const T = curT
      const fieldOn = T < 37.4
      if (p.type === 'down') {
        touched = true
        if (ruler) {
          scrubbing = true
          seekTo(p.x)
          return
        }
        pressed = true
        downX = p.x
        downY = p.y
        downWall = wall
        moved = 0
        if (fieldOn && inField(p.x, p.y)) {
          const n = seedsAt(T)
          const hit = nearestSeed(p.x, p.y, n)
          if (hit >= 0) {
            goLive(T)
            grab = hit
          }
        }
        return
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      if (p.type === 'move') {
        if (pressed) moved = Math.max(moved, Math.hypot(p.x - downX, p.y - downY))
        if (grab >= 0 && pressed) {
          LX[grab] = clamp(p.x, fx + 1, fx + fw - 1)
          LY[grab] = clamp(p.y, fy + 1, fy + fh - 1)
        } else if (!pressed && fieldOn) hoverSeed = inField(p.x, p.y) ? nearestSeed(p.x, p.y, seedsAt(T)) : -1
        return
      }
      if (p.type === 'up' && pressed) {
        pressed = false
        const tap = moved < (touch ? 14 : 8) && wall - downWall < 0.38
        if (grab >= 0) {
          grab = -1
          holdUntil = wall + 3
        } else if (relaxing) {
          relaxing = false
          holdUntil = wall + 3
        } else if (tap && fieldOn && inField(p.x, p.y)) {
          goLive(T)
          if (nLive < NMAX - 1) {
            LX[nLive] = p.x
            LY[nLive] = p.y
            nLive++
            rings.push({ x: p.x, y: p.y, t: wall })
            sfx.tone(SCALE[Math.floor(((p.x - fx) / fw) * 5) % 5] * 2, 1.2, { type: 'sine', gain: 0.05, room: 0.5 })
          }
          holdUntil = wall + 3
        } else if (tap && !fieldOn) {
          // the plate: a tap on a specimen grows a new one
          for (const s of SPECS) {
            if (p.x < s.x || p.x > s.x + s.w || p.y < s.y || p.y > s.y + s.h || !s.img) continue
            s.seed += 101
            s.img = null
            s.t0 = T
            sfx.tone(440, 1, { type: 'sine', gain: 0.04, room: 0.5 })
          }
        }
      }
    },
    key(code, down) {
      if (code === 'Space') {
        spaceHeld = down
        if (down) {
          touched = true
          goLive(curT)
        } else holdUntil = wall + 3
        return true
      }
      if (!down) return code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyR'
      const T = curT
      if (code === 'KeyR') {
        live = false
        return true
      }
      if (code === 'ArrowRight') {
        const next = CHAPTERS.find((c) => c.t > T + 0.01)
        clock += (next ? next.t : LOOP) - T
        live = false
        return true
      }
      if (code === 'ArrowLeft') {
        const i = chapterAt(T)
        const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
        clock += target - T
        live = false
        return true
      }
      return false
    },
    destroy() {
      if (drone) {
        try {
          drone.o1.stop()
          drone.o2.stop()
          drone.o3.stop()
        } catch {
          /* stopped */
        }
        drone = null
      }
    },
  }
  simApi = api
  return api
}

export default create
