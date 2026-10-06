/*
 * T.09 — TREE RINGS
 *
 * A life, read in cross-section. A conifer grows for two to three hundred
 * years (compressed into forty seconds) and its trunk, cut at breast height,
 * lays down one ring a year: pale earlywood, then a dark band of latewood.
 * Ring widths come from a simulated climate — a growth curve that slows with
 * age times rainfall to the power 1.15 — so wet years are wide and droughts
 * narrow. A fire scars one side and the rings roll over the wound; lightning
 * leaves a narrow strip; a late frost crumples one year's earlywood.
 *
 * Then the tree is cored, the core laid on the bench and skeleton-plotted
 * (A. E. Douglass's method: a line for every unusually narrow ring), and an
 * undated beam from an older tree is slid along until its pattern of narrow
 * rings locks onto the living tree's — cross-dating, the core idea of
 * dendrochronology — and the record reaches back centuries before either.
 *
 *   I    Growth          seedling to now; one ring a year; the climate below
 *   II   The core        an increment borer; the core; the skeleton plot
 *   III  Cross-dating    a beam of unknown age slides into its true place
 *   IV   The record      the chronology, end to end
 *
 * Full mode: hover or drag across the section to read any ring through a
 * loupe; tap for a new tree with a different climate. ← → chapters, N new tree.
 * Each loop grows the next tree.
 */

import { C, TAU, clamp, cropMarks, ease, gauss, lerp, makeNoise, mod, rgba, rng, setFont, smoothstep, text, type Noise } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. T.09'
const LOOP = 80
/** the year the tree is cored: the last complete ring is LAST */
const LAST = 2025
const CL0 = 1420
const GROW0 = 0.8
const GROW1 = 37.6

const CHAPTERS = [
  { t: 0, num: 'I', name: 'Growth' },
  { t: 38, num: 'II', name: 'The core' },
  { t: 52, num: 'III', name: 'Cross-dating' },
  { t: 71, num: 'IV', name: 'The record' },
]

/* ---------------------------------------------------------------- the data */

interface Ring {
  /** width, mm (mean around the stem) */
  w: number
  /** growth trend, mm, and the index w / trend */
  g: number
  rwi: number
  /** skeleton-plot score 0..10 (10 = the narrowest) */
  sk: number
}

interface Life {
  seed: number
  /** rainfall, % of normal, from CL0 to LAST */
  rain: Float32Array
  /** the living tree */
  y0: number
  n: number
  rings: Ring[]
  /** cumulative radius (mm) at ring boundary i (0 = pith) and angle j; (n + 1) × NA */
  R: Float32Array
  /** 1 where ring i grew at angle j */
  grew: Uint8Array
  fire: { year: number; ang: number; half: number; heal: number }
  light: { year: number; ang: number; half: number; heal: number }
  frost: number
  droughts: { y0: number; y1: number }[]
  major: { y0: number; y1: number }
  coreAng: number
  /** the beam: an older tree, undated until it is cross-dated */
  beam: { y0: number; n: number; rings: Ring[] }
  /** correlation of the two ring-width indices at each trial dating offset, −LAG..LAG */
  lagR: Float32Array
  /** correlation of the living tree's index with rainfall */
  rClim: number
  rays: { a: number; from: number }[]
  /** the side view: branch slots */
  branches: { q: number; side: number; len: number; tilt: number; bend: number; tufts: number }[]
}

const LAG = 60
const NA_FULL = 160
const NA_SMALL = 84

function corr(a: ArrayLike<number>, b: ArrayLike<number>, n: number) {
  let sa = 0
  let sb = 0
  for (let i = 0; i < n; i++) {
    sa += a[i]
    sb += b[i]
  }
  const ma = sa / n
  const mb = sb / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma
    const y = b[i] - mb
    num += x * y
    da += x * x
    db += y * y
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0
}

/** Douglass-style skeleton scores: how much narrower a ring is than its neighbours */
function skeleton(rings: Ring[]) {
  for (let i = 0; i < rings.length; i++) {
    let s = 0
    let c = 0
    for (let k = -5; k <= 5; k++) {
      if (k === 0) continue
      const j = i + k
      if (j < 0 || j >= rings.length) continue
      s += rings[j].rwi
      c++
    }
    const local = c ? s / c : 1
    const score = (local - rings[i].rwi) / local
    rings[i].sk = score > 0.24 ? clamp(Math.round(((score - 0.2) / 0.5) * 10), 1, 10) : 0
  }
}

function makeLife(seed: number, NA: number): Life {
  const r = rng(seed * 7919 + 17)
  const nz: Noise = makeNoise(seed * 31 + 5)
  const ncl = LAST - CL0 + 1
  // climate: red noise plus slow swings, a few droughts and sharp single dry years
  const z = new Float32Array(ncl)
  let ar = 0
  for (let i = 0; i < ncl; i++) {
    ar = 0.3 * ar + gauss(r) * 0.92
    z[i] = 0.68 * ar + 0.62 * nz.fbm2(i * 0.04, 2.7, 3)
  }
  const age = 236 + Math.floor(r() * 72)
  const y0 = LAST - age + 1
  const droughts: { y0: number; y1: number }[] = []
  const dry = (y: number, len: number, depth: number) => {
    for (let k = 0; k < len; k++) {
      const i = y + k - CL0
      if (i >= 0 && i < ncl) z[i] -= depth * (k === 0 || k === len - 1 ? 0.75 : 1)
    }
    if (len >= 3) droughts.push({ y0: y, y1: y + len - 1 })
  }
  // the hard years the caption waits for, in the middle of the tree's life
  const major = { y0: y0 + Math.floor(age * (0.44 + r() * 0.08)), y1: 0 }
  major.y1 = major.y0 + 4 + Math.floor(r() * 2)
  dry(major.y0, major.y1 - major.y0 + 1, 1.9)
  for (let d = 0; d < 7; d++) {
    const y = CL0 + 12 + Math.floor(r() * (ncl - 24))
    if (Math.abs(y - major.y0) < 14) continue
    dry(y, 3 + Math.floor(r() * 3), 1.2 + r() * 0.7)
  }
  for (let d = 0; d < 26; d++) dry(CL0 + 4 + Math.floor(r() * (ncl - 8)), 1, 2 + r() * 0.8)
  for (let d = 0; d < 6; d++) {
    const y = CL0 + Math.floor(r() * ncl)
    for (let k = 0; k < 2 + Math.floor(r() * 3); k++) if (y + k - CL0 < ncl) z[y + k - CL0] += 0.9 + r() * 0.5
  }
  const rain = new Float32Array(ncl)
  for (let i = 0; i < ncl; i++) rain[i] = clamp(100 * Math.exp(0.34 * z[i]), 22, 240)
  droughts.sort((a, b) => a.y0 - b.y0)

  // a tree's rings from its start year: a growth curve × rain^1.15 × a little noise
  const grow = (start: number, n: number, g0: number, tau: number, g1: number, noiseSd: number, fireYear = -1) => {
    const rings: Ring[] = []
    // the tree's own year-to-year memory (stored sugars, needle mass): red noise
    let e = 0
    for (let i = 0; i < n; i++) {
      const y = start + i
      const g = g0 * Math.exp(-i / tau) + g1
      const p = rain[y - CL0] / 100
      const pPrev = rain[Math.max(0, y - 1 - CL0)] / 100
      e = 0.5 * e + noiseSd * gauss(r)
      let wv = g * Math.pow(p, 1.0) * Math.pow(pPrev, 0.3) * Math.exp(e)
      if (y === fireYear + 1) wv *= 0.7
      rings.push({ w: Math.max(0.12, wv), g, rwi: 0, sk: 0 })
    }
    for (const rg of rings) rg.rwi = rg.w / rg.g
    skeleton(rings)
    return rings
  }

  const fire = { year: y0 + Math.floor(age * (0.26 + r() * 0.16)), ang: r() * TAU, half: 0.5 + r() * 0.2, heal: 22 + Math.floor(r() * 10) }
  const light = { year: y0 + Math.floor(age * (0.64 + r() * 0.14)), ang: mod(fire.ang + 2 + r() * 2.2, TAU), half: 0.06 + r() * 0.03, heal: 5 + Math.floor(r() * 3) }
  let frost = y0 + Math.floor(age * (0.12 + r() * 0.12))
  if (Math.abs(frost - fire.year) < 6) frost += 9
  const rings = grow(y0, age, 3.1 + r() * 1.1, 42 + r() * 26, 0.62 + r() * 0.28, 0.2, fire.year)

  // the cross-section: each ring an irregular positive loop, scars where the cambium died
  const R = new Float32Array((age + 1) * NA)
  const grew = new Uint8Array(age * NA)
  const cosT = new Float32Array(NA)
  const sinT = new Float32Array(NA)
  for (let j = 0; j < NA; j++) {
    cosT[j] = Math.cos((j / NA) * TAU)
    sinT[j] = Math.sin((j / NA) * TAU)
  }
  const eccA = r() * TAU
  const ecc = 0.08 + r() * 0.08
  for (let j = 0; j < NA; j++) R[j] = 0.7
  const angDist = (a: number, b: number) => Math.abs(mod(a - b + Math.PI, TAU) - Math.PI)
  for (let i = 0; i < age; i++) {
    const y = y0 + i
    const s = i * 0.018
    const a2 = 0.05 * nz.n2(s, 11.2)
    const b2 = 0.05 * nz.n2(s, 23.7)
    const a3 = 0.03 * nz.n2(s, 37.1)
    const b3 = 0.03 * nz.n2(s, 41.9)
    const e1 = ecc * (0.7 + 0.3 * nz.n2(s * 0.5, 3.3))
    for (let j = 0; j < NA; j++) {
      const th = (j / NA) * TAU
      const c1 = Math.cos(th - eccA)
      let f = 1 + e1 * c1 + a2 * Math.cos(2 * th) + b2 * Math.sin(2 * th) + a3 * Math.cos(3 * th) + b3 * Math.sin(3 * th)
      f += 0.025 * nz.n2(cosT[j] * 2.2 + s * 3, sinT[j] * 2.2)
      f = Math.max(0.3, f)
      let mask = 1
      for (const sc of [fire, light]) {
        if (y <= sc.year || y > sc.year + sc.heal) continue
        const k = (y - sc.year) / sc.heal
        const hw = sc.half * Math.pow(1 - k, 0.85)
        const d = angDist(th, sc.ang)
        if (d < hw) mask = 0
        // woundwood: the callus rolls thick at the edge of the closing wound
        else if (d < sc.half + 0.05) f *= 1 + 1.5 * Math.exp(-(((d - hw) / 0.07) ** 2))
      }
      grew[i * NA + j] = mask
      R[(i + 1) * NA + j] = R[i * NA + j] + rings[i].w * f * mask
    }
  }

  // the beam: an older tree that overlaps the living one by a century or so
  const bStart = y0 - 130 - Math.floor(r() * 50)
  const bN = Math.min(LAST - bStart - 40, y0 + 85 + Math.floor(r() * 40) - bStart)
  const beamRings = grow(bStart, bN, 2.6 + r() * 1.2, 50 + r() * 30, 0.7 + r() * 0.3, 0.22)
  const lagR = new Float32Array(LAG * 2 + 1)
  const ta = new Float32Array(400)
  const tb = new Float32Array(400)
  for (let L = -LAG; L <= LAG; L++) {
    // trial: the beam's ring k is the year bStart + k + L
    let m = 0
    for (let k = 0; k < bN; k++) {
      const yy = bStart + k + L
      const ia = yy - y0
      if (ia < 0 || ia >= age) continue
      ta[m] = rings[ia].rwi
      tb[m] = beamRings[k].rwi
      m++
    }
    lagR[L + LAG] = m > 30 ? corr(ta, tb, m) : 0
  }
  // the living tree against its rainfall
  const tr = new Float32Array(age)
  const tp = new Float32Array(age)
  for (let i = 0; i < age; i++) {
    tr[i] = Math.log(rings[i].rwi)
    tp[i] = Math.log(rain[y0 + i - CL0])
  }
  const rClim = corr(tr, tp, age)

  const rays = Array.from({ length: 64 }, () => ({ a: r() * TAU, from: Math.floor(Math.pow(r(), 1.4) * age * 0.8) }))
  const branches = Array.from({ length: 34 }, (_, k) => ({
    q: (k + 0.2 + r() * 0.6) / 34,
    side: r() < 0.5 ? -1 : 1,
    len: 0.65 + r() * 0.5,
    tilt: -0.1 + r() * 0.35,
    bend: (r() - 0.5) * 0.5,
    tufts: 2 + Math.floor(r() * 3),
  }))
  let coreAng = mod(fire.ang + Math.PI + (r() - 0.5) * 0.6, TAU)
  if (angDist(coreAng, light.ang) < 0.4) coreAng = mod(coreAng + 0.7, TAU)

  return { seed, rain, y0, n: age, rings, R, grew, fire, light, frost, droughts, major, coreAng, beam: { y0: bStart, n: bN, rings: beamRings }, lagR, rClim, rays, branches }
}

/* ------------------------------------------------------------------ piece */

interface Layout {
  stack: boolean
  tight: boolean
  mini: boolean
  pad: number
  // the side view
  tx: number
  ty: number
  tw: number
  th: number
  // the section
  cx: number
  cy: number
  D: number
  // the bench / climate chart
  bx: number
  by: number
  bw: number
  bh: number
  // a column for notes (wide layouts)
  nx: number
  ny: number
  nw: number
  capX: number
  capY: number
  capSize: number
  capW: number
  oneLine: boolean
  rulerY: number
  hudRow: boolean
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  // ?perf (test route): the mean cost of a frame, printed at the bottom
  const perfOn = env.params.has('perf')
  let perfSum = 0
  let perfN = 0
  const preview = env.mode === 'preview'
  const sfx = env.sfx
  const NA = preview ? NA_SMALL : NA_FULL
  let w = env.width
  let h = env.height
  let L = layoutFor(w, h)

  const baseSeed = Number(env.params.get('seed')) || 3
  const cache = new Map<number, Life>()
  const lifeFor = (seed: number) => {
    let lf = cache.get(seed)
    if (!lf) {
      lf = makeLife(seed, NA)
      if (cache.size > 3) cache.delete(cache.keys().next().value as number)
      cache.set(seed, lf)
    }
    return lf
  }

  const at = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(at) ? at : preview ? 30 : 0
  let prevT = -1
  let prevLoop = 0
  let used = false
  const cursor = { x: 0, y: 0, on: false, down: false, touch: false }
  let downAt: { x: number; y: number; ms: number } | null = null
  let scrub = false
  let hoverX = -1
  // ?cursor=<radius 0..1>,<angle> (test route): a fixed reading
  const testCur = env.params.get('cursor')

  /* --------------------------------------------------------------- layout */

  function layoutFor(W: number, H: number): Layout {
    const stack = W < H * 1.1
    const mini = preview || H < 260 || W < 300
    const tight = mini || H < 480 || W < 720
    const pad = Math.round(clamp(Math.min(W, H) * 0.04, preview ? 10 : 12, 36))
    const rulerH = preview ? 0 : mini ? 12 : 18
    const lay = { stack, tight, mini, pad, hudRow: false } as Layout
    lay.rulerY = H - pad * 0.55
    if (!stack) {
      const short = H < 540
      const capSize = short ? clamp(H * 0.055, 13, 21) : clamp(Math.min(W * 0.028, H * 0.044), 22, 44)
      const headH = (mini ? 24 : tight ? 32 : 44) + (short && !preview ? capSize + 8 : 0)
      const top = pad + headH
      const bottom = H - pad - rulerH - (mini ? 0 : 4)
      lay.oneLine = short
      lay.capSize = capSize
      if (short) {
        // tree | section | bench, side by side
        const treeW = (W - pad * 2) * (W > H * 2.2 ? 0.13 : 0.15)
        lay.tx = pad
        lay.ty = top
        lay.tw = treeW
        lay.th = bottom - top
        const D = Math.min((bottom - top) / 2 - 4, (W - pad * 2) * 0.2)
        lay.D = D
        lay.cx = pad + treeW + (mini ? 8 : 14) + D
        lay.cy = top + (bottom - top) / 2
        lay.bx = lay.cx + D + (mini ? 16 : 26)
        lay.bw = W - pad - lay.bx
        lay.by = top + 22
        lay.bh = bottom - lay.by - 12
        lay.nx = lay.bx
        lay.ny = top
        lay.nw = 0
        lay.capX = pad
        lay.capY = pad + headH - capSize - 12
        lay.capW = W - pad * 2
        return lay
      }
      // tree | section | notes, with the bench across the bottom
      const bandH = clamp((bottom - top) * 0.27, 120, 250)
      const upperB = bottom - bandH - 26
      const treeW = (W - pad * 2) * 0.2
      lay.tx = pad
      lay.ty = top
      lay.tw = treeW
      lay.th = bottom - top
      const notesW = clamp(W * 0.22, 220, 360)
      const D = Math.min((upperB - top) / 2 - 8, (W - pad * 2 - treeW - notesW) / 2 - 16)
      lay.D = D
      lay.cx = pad + treeW + 16 + (W - pad * 2 - treeW - notesW - 16) / 2
      lay.cy = top + (upperB - top) / 2
      lay.nx = W - pad - notesW
      lay.ny = top + 6
      lay.nw = notesW
      lay.bx = pad + treeW + 30
      lay.bw = W - pad - lay.bx
      lay.by = upperB + 26
      lay.bh = bottom - lay.by - 14
      lay.capX = lay.nx
      lay.capY = lay.ny
      lay.capW = notesW
      return lay
    }
    // stacked: tree + section, the bench, the caption
    const short = H < 640
    lay.hudRow = !short
    const capSize = clamp(Math.min(W * 0.062, H * 0.034), 15, 30)
    const headH = short ? 34 : 70
    const top = pad + headH
    const bottom = H - pad - rulerH - 4
    const capBlock = capSize * 2.3 + 18
    const avail = bottom - top - capBlock
    const rowH = avail * (short ? 0.56 : 0.66)
    const treeW = (W - pad * 2) * 0.26
    lay.tx = pad
    lay.ty = top
    lay.tw = treeW
    lay.th = rowH
    const D = Math.min(rowH / 2 - 6, (W - pad * 2 - treeW) / 2 - 6)
    lay.D = D
    lay.cx = pad + treeW + (W - pad * 2 - treeW) / 2
    lay.cy = top + rowH / 2
    lay.bx = pad + 4
    lay.bw = W - pad * 2 - 4
    lay.by = top + rowH + 30
    lay.bh = top + avail - lay.by - 6
    lay.nx = 0
    lay.ny = 0
    lay.nw = 0
    lay.capSize = capSize
    lay.oneLine = false
    lay.capX = pad
    lay.capY = bottom - capSize * 2.2
    lay.capW = W - pad * 2
    return lay
  }

  /* -------------------------------------------------------------- helpers */

  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    ctx.save()
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.92)
    ctx.strokeText(o?.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }
  const measure = (str: string, size: number, font: 'mono' | 'serif' = 'mono', italic = false) => {
    setFont(ctx, { size, font, italic, tracking: font === 'mono' ? 0.14 : 0 })
    return ctx.measureText(str).width
  }
  function hatchBox(gap: number, angle: number, x: number, y: number, ww: number, hh: number) {
    const cx = x + ww / 2
    const cy = y + hh / 2
    const Rr = Math.hypot(ww, hh) / 2 + gap
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    ctx.beginPath()
    for (let d = -Rr; d <= Rr; d += gap) {
      const qx = cx - sa * d
      const qy = cy + ca * d
      ctx.moveTo(qx - ca * Rr, qy - sa * Rr)
      ctx.lineTo(qx + ca * Rr, qy + sa * Rr)
    }
    ctx.stroke()
  }

  /* ---------------------------------------------------------- the clock */

  /** rings completed (float) at piece time T */
  const ringsAt = (T: number, n: number) => n * Math.pow(clamp((T - GROW0) / (GROW1 - GROW0)), 1.08)
  const tOfRing = (i: number, n: number) => GROW0 + Math.pow(clamp(i / n), 1 / 1.08) * (GROW1 - GROW0)

  /* ------------------------------------------------------- the section */

  /** radius (mm) of ring boundary i at angle a, interpolated */
  function radAt(lf: Life, i: number, a: number) {
    const f = (mod(a, TAU) / TAU) * NA
    const j = Math.floor(f) % NA
    const j2 = (j + 1) % NA
    const t = f - Math.floor(f)
    return lerp(lf.R[i * NA + j], lf.R[i * NA + j2], t)
  }
  const meanR = (lf: Life, x: number) => {
    const i = clamp(Math.floor(x), 0, lf.n)
    const i2 = Math.min(lf.n, i + 1)
    const t = x - i
    let s1 = 0
    let s2 = 0
    for (let j = 0; j < NA; j += 4) {
      s1 += lf.R[i * NA + j]
      s2 += lf.R[i2 * NA + j]
    }
    return lerp(s1, s2, clamp(t)) / (NA / 4)
  }
  /** px per mm: the disc grows on screen, but slower than the tree, so the first rings are readable */
  function scaleFor(lf: Life, x: number) {
    const rf = meanR(lf, lf.n) + barkMM(lf, lf.n)
    const rc = Math.max(0.7, meanR(lf, x)) + barkMM(lf, x)
    const sFinal = (L.D * 0.98) / rf
    return Math.min(sFinal * 16, (L.D * 0.98 * Math.pow(rc / rf, 0.56)) / rc)
  }
  const barkMM = (lf: Life, x: number) => 0.6 + 0.045 * meanR(lf, x)

  const xsBuf = new Float32Array(NA + 1)
  const ysBuf = new Float32Array(NA + 1)
  const cosA = new Float32Array(NA)
  const sinA = new Float32Array(NA)
  for (let j = 0; j < NA; j++) {
    cosA[j] = Math.cos((j / NA) * TAU)
    sinA[j] = Math.sin((j / NA) * TAU)
  }
  /** fewer points for small rings: a ring of radius r px needs about r/2 of them */
  const stepFor = (rpx: number) => (rpx < 26 ? 4 : rpx < 70 ? 2 : 1)

  function drawSection(lf: Life, A: number, k: number, focus: number) {
    const s = scaleFor(lf, k)
    const { cx, cy } = L
    const ki = Math.floor(k)
    const frac = k - ki
    ctx.save()
    ctx.globalAlpha = A
    ctx.lineWidth = 1

    // the bark: outside the cambium, furrowed, radially hatched; open where a wound is open
    const cambium = (j: number) => (ki < lf.n ? lerp(lf.R[ki * NA + j], lf.R[(ki + 1) * NA + j], frac) : lf.R[lf.n * NA + j])
    const open = (j: number) => ki > 0 && ki < lf.n && lf.grew[Math.min(ki, lf.n - 1) * NA + j] === 0 && lf.grew[Math.max(0, ki - 1) * NA + j] === 0
    const bt = barkMM(lf, k)
    ctx.fillStyle = C.paper
    ctx.beginPath()
    for (let j = 0; j <= NA; j++) {
      const jj = j % NA
      const a = (jj / NA) * TAU
      const furrow = 0.55 + 0.45 * Math.abs(Math.sin(a * 23 + Math.sin(a * 7) * 2))
      const rr = (cambium(jj) + (open(jj) ? 0 : bt * furrow)) * s
      const x = cx + Math.cos(a) * rr
      const y = cy - Math.sin(a) * rr
      xsBuf[j] = x
      ysBuf[j] = y
      if (j) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.stroke()
    // bark plates: short radial strokes
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.beginPath()
    for (let j = 0; j < NA; j += 1) {
      if (open(j)) continue
      const a = (j / NA) * TAU
      const r0 = cambium(j) * s
      const r1 = Math.hypot(xsBuf[j] - cx, ysBuf[j] - cy)
      if (r1 - r0 < 1.5) continue
      ctx.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0)
      ctx.lineTo(cx + Math.cos(a) * (r1 - 0.5), cy - Math.sin(a) * (r1 - 0.5))
    }
    ctx.stroke()
    // the cambium line
    ctx.strokeStyle = rgba(C.ink, 0.6)
    ctx.beginPath()
    for (let j = 0; j <= NA; j++) {
      const jj = j % NA
      if (open(jj)) {
        continue
      }
      const a = (jj / NA) * TAU
      const rr = cambium(jj) * s
      if (j === 0 || open((jj + NA - 1) % NA)) ctx.moveTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
      else ctx.lineTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
    }
    ctx.stroke()

    // latewood: a soft band at the outer edge of each ring, bucketed by width
    const buckets = new Map<number, Path2D>()
    for (let i = 0; i < Math.min(ki, lf.n); i++) {
      const lw = lf.rings[i].w * 0.32 * s
      if (lw < 0.55) continue
      const key = Math.min(14, Math.round(lw * 2) / 2)
      let p = buckets.get(key)
      if (!p) {
        p = new Path2D()
        buckets.set(key, p)
      }
      let pen = false
      const st = stepFor(lf.R[(i + 1) * NA] * s)
      for (let j = 0; j <= NA; j += st) {
        const jj = j % NA
        if (!lf.grew[i * NA + jj]) {
          pen = false
          continue
        }
        const rr = lf.R[(i + 1) * NA + jj] * s - key / 2
        const x = cx + cosA[jj] * rr
        const y = cy - sinA[jj] * rr
        if (pen) p.lineTo(x, y)
        else p.moveTo(x, y)
        pen = true
      }
    }
    ctx.strokeStyle = rgba(C.ink, 0.13)
    for (const [lw, p] of buckets) {
      ctx.lineWidth = lw
      ctx.stroke(p)
    }
    ctx.lineWidth = 1

    // ring boundaries: every ring a hairline, fainter where they crowd; each tenth a touch darker
    const tiers = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]
    const tierA = [0.16, 0.3, 0.5, 0.72]
    for (let i = 0; i < Math.min(ki, lf.n); i++) {
      const px = lf.rings[i].w * s
      // where rings crowd below a pixel apart, draw every second or third (the loupe shows them all)
      if (px < 0.62 && i % (px < 0.34 ? 3 : 2) !== 0 && ki - i > 1) continue
      let tier = px < 1.2 ? 0 : px < 2.4 ? 1 : 2
      if ((lf.y0 + i) % 10 === 9 && px > 1.6) tier = Math.min(3, tier + 1)
      const p = tiers[tier]
      let pen = false
      const st = stepFor(lf.R[(i + 1) * NA] * s)
      for (let j = 0; j <= NA; j += st) {
        const jj = j % NA
        if (!lf.grew[i * NA + jj]) {
          pen = false
          continue
        }
        const rr = lf.R[(i + 1) * NA + jj] * s
        const x = cx + cosA[jj] * rr
        const y = cy - sinA[jj] * rr
        if (pen) p.lineTo(x, y)
        else p.moveTo(x, y)
        pen = true
      }
    }
    tiers.forEach((p, i) => {
      ctx.strokeStyle = rgba(C.ink, tierA[i])
      ctx.stroke(p)
    })

    // the frost ring: crumpled earlywood partway through that year
    const fi = lf.frost - lf.y0
    if (fi < ki) {
      ctx.strokeStyle = rgba(C.ink, 0.8)
      ctx.beginPath()
      for (let j = 0; j <= NA * 3; j++) {
        const jj = Math.floor(j / 3) % NA
        const a = (j / (NA * 3)) * TAU
        const r0 = lf.R[fi * NA + jj]
        const r1 = lf.R[(fi + 1) * NA + jj]
        const rr = (r0 + (r1 - r0) * (0.38 + 0.12 * Math.sin(j * 2.3))) * s
        if (j) ctx.lineTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
        else ctx.moveTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
      }
      ctx.stroke()
    }

    // scar faces: charcoal on the fire year's last ring across the wound, finer for lightning
    for (const [sc, heavy] of [
      [lf.fire, true],
      [lf.light, false],
    ] as const) {
      const si = sc.year - lf.y0 + 1
      if (si > ki) continue
      ctx.strokeStyle = C.ink
      ctx.lineWidth = heavy ? 1.8 : 1.2
      ctx.beginPath()
      const steps = 30
      for (let q = 0; q <= steps; q++) {
        const a = sc.ang - sc.half + (q / steps) * sc.half * 2
        const rr = radAt(lf, si, a) * s
        if (q) ctx.lineTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
        else ctx.moveTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
      }
      ctx.stroke()
      ctx.lineWidth = 1
      if (heavy) {
        // char ticks along the face
        ctx.strokeStyle = rgba(C.ink, 0.7)
        ctx.beginPath()
        for (let q = 1; q < steps; q += 2) {
          const a = sc.ang - sc.half + (q / steps) * sc.half * 2
          const rr = radAt(lf, si, a) * s
          ctx.moveTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
          ctx.lineTo(cx + Math.cos(a) * (rr - 2.5), cy - Math.sin(a) * (rr - 2.5))
        }
        ctx.stroke()
      }
    }

    // rays, from where they began to the cambium
    ctx.strokeStyle = rgba(C.ink, 0.1)
    ctx.beginPath()
    for (const ray of lf.rays) {
      if (ray.from >= ki) continue
      const r0 = radAt(lf, ray.from, ray.a) * s
      const r1 = Math.max(r0, (ki < lf.n ? radAt(lf, ki, ray.a) : radAt(lf, lf.n, ray.a)) * s)
      ctx.moveTo(cx + Math.cos(ray.a) * r0, cy - Math.sin(ray.a) * r0)
      ctx.lineTo(cx + Math.cos(ray.a) * r1, cy - Math.sin(ray.a) * r1)
    }
    ctx.stroke()

    // the pith
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.arc(cx, cy, Math.max(1.4, 0.7 * s), 0, TAU)
    ctx.fill()

    // the cursor's ring, highlighted
    if (focus >= 0 && focus < ki) {
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1.6
      ctx.beginPath()
      let pen = false
      for (let j = 0; j <= NA; j++) {
        const jj = j % NA
        if (!lf.grew[focus * NA + jj]) {
          pen = false
          continue
        }
        const a = (jj / NA) * TAU
        const rr = lf.R[(focus + 1) * NA + jj] * s
        if (pen) ctx.lineTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
        else ctx.moveTo(cx + Math.cos(a) * rr, cy - Math.sin(a) * rr)
        pen = true
      }
      ctx.stroke()
      ctx.lineWidth = 1
    }
    ctx.restore()
    return s
  }

  /** the ring under a screen point: index, or -1 (pith side), n (bark), -2 (outside) */
  function ringUnder(lf: Life, k: number, x: number, y: number) {
    const s = scaleFor(lf, k)
    const dx = x - L.cx
    const dy = -(y - L.cy)
    const rmm = Math.hypot(dx, dy) / s
    const a = Math.atan2(dy, dx)
    const ki = Math.min(lf.n, Math.floor(k))
    if (rmm > radAt(lf, ki, a) + barkMM(lf, k) * 1.05) return { i: -2, a, rmm }
    if (rmm > radAt(lf, ki, a)) return { i: lf.n, a, rmm }
    let lo = 0
    let hi = ki
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (radAt(lf, mid + 1, a) < rmm) lo = mid + 1
      else hi = mid
    }
    return { i: lo, a, rmm }
  }

  /* ------------------------------------------------------ the side view */

  function drawTree(lf: Life, T: number, A: number, k: number) {
    const { tx, ty, tw, th } = L
    const ground = ty + th - (L.mini ? 4 : 10)
    const age = k
    const Hf = th * 0.9
    const Hn = (a: number) => Math.pow(1 - Math.exp(-a / 70), 1.25)
    const H = (Hf * Hn(Math.max(0.4, age))) / Hn(lf.n)
    const x0 = tx + tw * 0.52
    const rmm = meanR(lf, age) + barkMM(lf, age)
    // the trunk, exaggerated ×1.7 in width
    const half = Math.max(0.8, (rmm / 1000) * (Hf / 32) * 1.7)
    ctx.save()
    ctx.globalAlpha = A
    ctx.lineWidth = 1
    // ground
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(tx, ground)
    ctx.lineTo(tx + tw, ground)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    for (let i = 0; i < 9; i++) {
      const gx = tx + ((i + 0.5) / 9) * tw
      ctx.moveTo(gx, ground + 3)
      ctx.lineTo(gx - 3, ground + 7)
    }
    ctx.stroke()
    // fire on the ground in its year, and the scorch fading after
    const fT = tOfRing(lf.fire.year - lf.y0 + 0.5, lf.n)
    const burning = smoothstep(fT - 0.1, fT, T) * (1 - smoothstep(fT + 1.1, fT + 1.6, T))
    const scorch = smoothstep(fT, fT + 0.4, T) * (1 - smoothstep(fT + 3, fT + 9, T))
    if (scorch > 0.01) {
      ctx.save()
      ctx.globalAlpha = A * scorch
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.beginPath()
      ctx.rect(tx, ground - 1, tw, 5)
      ctx.clip()
      hatchBox(2.5, -Math.PI / 4, tx, ground - 1, tw, 5)
      ctx.restore()
    }
    // crown first (behind), then trunk. Young trees are cones; old ones lift and round their crowns.
    const mature = clamp((age - 40) / 180)
    const crownBase = H * clamp((age - 25) / 260, 0, 0.48)
    const maxLen = H * lerp(0.3, 0.24, mature)
    const limbs = new Path2D()
    const tufts = new Path2D()
    const tuft = (px: number, py: number, dirA: number, tl: number) => {
      for (let f = -3; f <= 3; f++) {
        const fa = dirA + f * 0.34
        const l2 = tl * (0.7 + 0.3 * Math.cos(f * 0.8))
        tufts.moveTo(px, py)
        tufts.lineTo(px + Math.cos(fa) * l2, py + Math.sin(fa) * l2)
      }
    }
    const hash = (n: number) => {
      const v = Math.sin(n * 12.9898 + lf.seed * 78.233) * 43758.5453
      return v - Math.floor(v)
    }
    lf.branches.forEach((b, bi) => {
      const hAt = crownBase + (H - crownBase) * b.q
      if (hAt > H - 3) return
      const q = (hAt - crownBase) / Math.max(1, H - crownBase)
      const born = clamp((H - hAt) / Math.max(4, H * 0.08))
      const profile = lerp(1 - q * 0.92, Math.pow(Math.sin(Math.PI * (1 - q) * 0.8 + 0.18), 0.8), mature)
      let len = maxLen * profile * b.len * born
      if (len < 1.5) return
      len = Math.min(len, tw * 0.47)
      const by = ground - hAt
      // mostly level, the lower limbs of an old tree drooping, the top ones reaching up
      const el = lerp(lerp(0.25, 0.75, q), lerp(-0.25, 0.45, q), mature) + b.tilt * 0.3
      const ex = x0 + b.side * Math.cos(el) * len
      const ey = by - Math.sin(el) * len
      const mx = x0 + b.side * Math.cos(el) * len * 0.5
      const my = by - Math.sin(el) * len * 0.5 + len * 0.08 * (1 + mature)
      limbs.moveTo(x0, by)
      limbs.quadraticCurveTo(mx, my, ex, ey - len * 0.05 * mature)
      // a pad of needle tufts over the outer part of the limb, opening up and out
      const tl = Math.max(2.2, len * 0.15)
      const nT = 2 + b.tufts + Math.round(mature * 2)
      for (let t2 = 0; t2 < nT; t2++) {
        const u = 0.42 + (t2 / Math.max(1, nT - 1)) * 0.58
        const px = lerp(lerp(x0, mx, u), lerp(mx, ex, u), u)
        const py = lerp(lerp(by, my, u), lerp(my, ey, u), u)
        const jx = (hash(bi * 17 + t2) - 0.5) * tl * 1.2
        const jy = -hash(bi * 31 + t2 * 3) * tl * 0.9
        tuft(px + jx, py + jy, -Math.PI / 2 + b.side * (0.35 + 0.4 * hash(bi + t2 * 7)), tl * (0.75 + 0.4 * hash(bi * 5 + t2)))
      }
    })
    // dead stubs on the cleared trunk of an old tree
    if (mature > 0.2) {
      for (let q2 = 0; q2 < 6; q2++) {
        const hAt = crownBase * (0.3 + q2 * 0.11)
        const sd = q2 % 2 ? 1 : -1
        const wv = half * (1 - hAt / H)
        limbs.moveTo(x0 + sd * wv, ground - hAt)
        limbs.lineTo(x0 + sd * (wv + 4 + (q2 % 3) * 2), ground - hAt - 2)
      }
    }
    ctx.strokeStyle = C.ink
    ctx.stroke(limbs)
    ctx.strokeStyle = rgba(C.moss, 0.85)
    ctx.stroke(tufts)
    // the leader
    ctx.beginPath()
    for (let f = -3; f <= 3; f++) {
      const fa = -Math.PI / 2 + f * 0.3
      const tl = Math.max(2.4, H * 0.03)
      ctx.moveTo(x0, ground - H + 1)
      ctx.lineTo(x0 + Math.cos(fa) * tl, ground - H + 1 + Math.sin(fa) * tl)
    }
    ctx.stroke()
    // trunk: two hairlines tapering to the leader, paper between
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(x0 - half * 1.25, ground)
    ctx.quadraticCurveTo(x0 - half, ground - H * 0.3, x0 - 0.4, ground - H)
    ctx.lineTo(x0 + 0.4, ground - H)
    ctx.quadraticCurveTo(x0 + half, ground - H * 0.3, x0 + half * 1.25, ground)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // bark texture on a thick trunk
    if (half > 3) {
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = rgba(C.ink, 0.25)
      ctx.beginPath()
      for (let yy = ground - 4; yy > ground - H * 0.85; yy -= 5) {
        const wv = half * (1 - (ground - yy) / H)
        ctx.moveTo(x0 - wv * 0.8, yy)
        ctx.lineTo(x0 - wv * 0.2, yy - 3)
        ctx.moveTo(x0 + wv * 0.1, yy - 1)
        ctx.lineTo(x0 + wv * 0.7, yy - 4)
      }
      ctx.stroke()
      ctx.restore()
    }
    // the fire's cat face at the base, once it has burned
    if (T > fT) {
      const ch = Math.min(H * 0.12, 18) * (1 - 0.6 * smoothstep(fT, fT + 25, T))
      ctx.fillStyle = rgba(C.ink, 0.7)
      ctx.beginPath()
      ctx.moveTo(x0 - half * 0.9, ground)
      ctx.lineTo(x0 - half * 0.35, ground - ch)
      ctx.lineTo(x0 + half * 0.15, ground)
      ctx.closePath()
      ctx.fill()
    }
    // the lightning: a bolt in its year, then a scar down the trunk
    const lT = tOfRing(lf.light.year - lf.y0 + 0.5, lf.n)
    if (T > lT) {
      const scar = 1 - 0.7 * smoothstep(lT, lT + 15, T)
      ctx.strokeStyle = rgba(C.ink, 0.6 * scar)
      ctx.beginPath()
      for (let q = 0; q <= 20; q++) {
        const yy = ground - H * (0.95 - q * 0.042)
        const wv = half * (1 - (ground - yy) / H)
        const xx = x0 + Math.sin(q * 0.7) * wv * 0.6
        if (q) ctx.lineTo(xx, yy)
        else ctx.moveTo(xx, yy)
      }
      ctx.stroke()
      const flash = smoothstep(lT, lT + 0.04, T) * (1 - smoothstep(lT + 0.22, lT + 0.4, T))
      if (flash > 0.01) {
        ctx.save()
        ctx.globalAlpha = A * flash
        ctx.strokeStyle = C.ink
        ctx.lineWidth = 1.4
        ctx.beginPath()
        let bx = x0 + tw * 0.2
        let byy = ty
        ctx.moveTo(bx, byy)
        const rr = rng(lf.seed + 99)
        while (byy < ground - H) {
          byy += (ground - H - ty) / 7
          bx = lerp(bx, x0, 0.3) + (rr() - 0.5) * tw * 0.18
          ctx.lineTo(bx, Math.min(byy, ground - H))
        }
        ctx.stroke()
        ctx.restore()
      }
    }
    // flames at the base during the fire
    if (burning > 0.01) {
      ctx.save()
      ctx.globalAlpha = A * burning
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      for (let f = 0; f < 7; f++) {
        const fx = tx + tw * (0.12 + f * 0.13)
        const fh = (6 + 6 * Math.abs(Math.sin(T * 9 + f * 1.7))) * (L.mini ? 0.6 : 1)
        ctx.moveTo(fx - 3, ground)
        ctx.quadraticCurveTo(fx - 3.5, ground - fh * 0.5, fx + Math.sin(T * 12 + f) * 1.5, ground - fh)
        ctx.quadraticCurveTo(fx + 3.5, ground - fh * 0.5, fx + 3, ground)
      }
      ctx.stroke()
      ctx.restore()
    }
    // section A–A at breast height, and the borer in chapter II
    const yA = ground - Math.max(6, (1.3 / 32) * Hf * 1.5)
    if (!L.mini) {
      const ext = Math.max(half * 1.6 + 8, 14)
      ctx.strokeStyle = rgba(C.ocean, 0.85)
      ctx.setLineDash([6, 2, 1, 2])
      ctx.beginPath()
      ctx.moveTo(x0 - ext, yA)
      ctx.lineTo(x0 + ext, yA)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      for (const sx of [-1, 1]) {
        const ax = x0 + sx * ext
        ctx.moveTo(ax, yA)
        ctx.lineTo(ax, yA - 7)
        ctx.moveTo(ax - 2.5, yA - 4.5)
        ctx.lineTo(ax, yA - 7.5)
        ctx.lineTo(ax + 2.5, yA - 4.5)
      }
      ctx.stroke()
      text(ctx, 'A', x0 - ext - 3, yA + 3, { size: 8.5, color: C.ocean, align: 'right' })
      text(ctx, 'A', x0 + ext + 3, yA + 3, { size: 8.5, color: C.ocean })
    }
    const bore = smoothstep(38.6, 41.8, T) * (1 - smoothstep(48, 50, T))
    if (bore > 0.01) {
      ctx.save()
      ctx.globalAlpha = A * Math.min(1, bore * 3)
      ctx.strokeStyle = C.ink
      const bx2 = x0 + half * 1.2
      const len = 14 + bore * 6
      ctx.beginPath()
      ctx.moveTo(bx2 - bore * half, yA)
      ctx.lineTo(bx2 + len, yA)
      ctx.moveTo(bx2 + len, yA - 7)
      ctx.lineTo(bx2 + len, yA + 7)
      ctx.stroke()
      ctx.restore()
    }
    // a 10 m scale bar
    if (!L.mini && th > 200) {
      const m10 = (10 / 32) * Hf
      const sx2 = tx + 2
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.beginPath()
      ctx.moveTo(sx2, ground)
      ctx.lineTo(sx2, ground - m10)
      ctx.moveTo(sx2, ground - m10)
      ctx.lineTo(sx2 + 4, ground - m10)
      ctx.moveTo(sx2, ground - m10 / 2)
      ctx.lineTo(sx2 + 3, ground - m10 / 2)
      ctx.stroke()
      text(ctx, '10 M', sx2 + 6, ground - m10 + 3, { size: 7.5, color: C.muted, tracking: 0.1 })
    }
    ctx.restore()
  }

  /* ------------------------------------------------------- the bench */

  /** the core along `ang`, drawn as a strip from (x0,y0) heading `dir` for `len` px; returns ring positions */
  function drawCore(lf: Life, x0: number, y0: number, dir: number, len: number, thick: number, highlightSk: boolean) {
    const rb = radAt(lf, lf.n, lf.coreAng) + barkMM(lf, lf.n)
    const ux = Math.cos(dir)
    const uy = Math.sin(dir)
    const nx = -uy
    const ny = ux
    ctx.save()
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(x0 + nx * thick, y0 + ny * thick)
    ctx.lineTo(x0 + ux * len + nx * thick, y0 + uy * len + ny * thick)
    ctx.lineTo(x0 + ux * len - nx * thick, y0 + uy * len - ny * thick)
    ctx.lineTo(x0 - nx * thick, y0 - ny * thick)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    const lines = new Path2D()
    const narrow = new Path2D()
    for (let i = 0; i < lf.n; i++) {
      const p = (radAt(lf, i + 1, lf.coreAng) / rb) * len
      const pl = (radAt(lf, i, lf.coreAng) / rb) * len
      // latewood band
      const lw = (p - pl) * 0.32
      if (lw > 0.6) {
        ctx.fillStyle = rgba(C.ink, 0.14)
        const qx = x0 + ux * (p - lw)
        const qy = y0 + uy * (p - lw)
        ctx.beginPath()
        ctx.moveTo(qx + nx * thick, qy + ny * thick)
        ctx.lineTo(qx + ux * lw + nx * thick, qy + uy * lw + ny * thick)
        ctx.lineTo(qx + ux * lw - nx * thick, qy + uy * lw - ny * thick)
        ctx.lineTo(qx - nx * thick, qy - ny * thick)
        ctx.closePath()
        ctx.fill()
      }
      const tgt = highlightSk && lf.rings[i].sk >= 4 ? narrow : lines
      tgt.moveTo(x0 + ux * p + nx * thick, y0 + uy * p + ny * thick)
      tgt.lineTo(x0 + ux * p - nx * thick, y0 + uy * p - ny * thick)
    }
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.stroke(lines)
    ctx.strokeStyle = C.ocean
    ctx.stroke(narrow)
    // the bark end
    const pb = (radAt(lf, lf.n, lf.coreAng) / rb) * len
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.beginPath()
    for (let q = pb; q < len; q += 2) {
      ctx.moveTo(x0 + ux * q + nx * thick, y0 + uy * q + ny * thick)
      ctx.lineTo(x0 + ux * (q + 1.5) - nx * thick, y0 + uy * (q + 1.5) - ny * thick)
    }
    ctx.stroke()
    ctx.restore()
    return { rb }
  }

  /** a beam's core: rings evenly scaled by their own widths */
  function drawBeamCore(rings: Ring[], x0: number, y0: number, len: number, thick: number) {
    let tot = 0
    for (const rg of rings) tot += rg.w
    ctx.save()
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.fillRect(x0, y0 - thick, len, thick * 2)
    ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0 - thick) + 0.5, Math.round(len), Math.round(thick * 2))
    let acc = 0
    const lines = new Path2D()
    const narrow = new Path2D()
    ctx.fillStyle = rgba(C.ink, 0.14)
    for (const rg of rings) {
      acc += rg.w
      const p = x0 + (acc / tot) * len
      const lw = (rg.w / tot) * len * 0.32
      if (lw > 0.6) ctx.fillRect(p - lw, y0 - thick, lw, thick * 2)
      const tgt = rg.sk >= 4 ? narrow : lines
      tgt.moveTo(p, y0 - thick)
      tgt.lineTo(p, y0 + thick)
    }
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.stroke(lines)
    ctx.strokeStyle = C.lagoon
    ctx.stroke(narrow)
    ctx.restore()
  }

  /** a skeleton plot: a line per narrow ring, up (dir -1) or down (dir 1) from the baseline */
  function skeletonPlot(rings: Ring[], start: number, xOf: (y: number) => number, base: number, hh: number, dir: number, color: string, upTo = Infinity) {
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    ctx.moveTo(xOf(start), base)
    ctx.lineTo(xOf(start + Math.min(rings.length, upTo)), base)
    for (let i = 0; i < Math.min(rings.length, upTo); i++) {
      const y = start + i
      if (y % 10 !== 0) continue
      ctx.moveTo(xOf(y), base)
      ctx.lineTo(xOf(y), base + dir * (y % 50 === 0 ? 5 : 3))
    }
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.beginPath()
    for (let i = 0; i < Math.min(rings.length, upTo); i++) {
      const sk = rings[i].sk
      if (!sk) continue
      const x = xOf(start + i + 0.5)
      ctx.moveTo(x, base)
      ctx.lineTo(x, base + dir * (sk / 10) * hh)
    }
    ctx.stroke()
  }

  function drawBench(lf: Life, T: number, A: number, k: number, focusYear: number) {
    const { bx, by, bw, bh } = L
    const benchIn = smoothstep(44.5, 47, T)
    const climA = 1 - smoothstep(43, 45.5, T)
    const beamIn = smoothstep(52, 55, T)
    const yMin = lerp(lf.y0, Math.min(lf.y0, lf.beam.y0) - 2, ease.inOutCubic(beamIn))
    const yMax = LAST + 1
    const xOf = (y: number) => bx + ((y - yMin) / (yMax - yMin)) * bw
    ctx.save()
    ctx.globalAlpha = A
    ctx.lineWidth = 1
    // the year axis
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    ctx.moveTo(bx, by + bh)
    ctx.lineTo(bx + bw, by + bh)
    const step = (yMax - yMin) / bw > 0.8 ? 50 : 25
    for (let y = Math.ceil(yMin / 10) * 10; y <= LAST; y += 10) {
      ctx.moveTo(xOf(y), by + bh)
      ctx.lineTo(xOf(y), by + bh - (y % step === 0 ? 5 : 2.5))
    }
    ctx.stroke()
    if (bh > 50) {
      for (let y = Math.ceil(yMin / step) * step; y <= LAST; y += step) {
        const x = xOf(y)
        if (x < bx + 12 || x > bx + bw - 12) continue
        text(ctx, String(y), x, by + bh + 11, { size: 7.5, color: C.muted, align: 'center', tracking: 0.06 })
      }
    }
    const ki = Math.min(lf.n, Math.floor(k))

    // chapter I: rainfall bars and the ring-width index over them
    if (climA > 0.01) {
      ctx.save()
      ctx.globalAlpha = A * climA
      const mid = by + bh * 0.52
      const amp = bh * 0.4
      const yOf = (pct: number) => mid - clamp(Math.log(pct / 100) / Math.log(2.3), -1, 1) * amp
      ctx.strokeStyle = rgba(C.ink, 0.25)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(xOf(lf.y0), mid)
      ctx.lineTo(xOf(LAST + 1), mid)
      ctx.stroke()
      ctx.setLineDash([])
      // bars, a year each (or, where years are under a pixel wide, every second year)
      const perYearB = bw / (yMax - yMin)
      const every = perYearB < 0.9 ? 2 : 1
      const wet = new Path2D()
      const dryP = new Path2D()
      for (let i = 0; i < ki; i += every) {
        const y = lf.y0 + i
        let pct = lf.rain[y - CL0]
        if (every > 1 && i + 1 < ki) pct = Math.sqrt(pct * lf.rain[y + 1 - CL0])
        const x = xOf(y + every / 2)
        const p = pct >= 100 ? wet : dryP
        p.moveTo(x, mid)
        p.lineTo(x, yOf(pct))
      }
      ctx.strokeStyle = rgba(C.ocean, every > 1 ? 0.4 : 0.55)
      ctx.stroke(wet)
      ctx.strokeStyle = rgba(C.fern, every > 1 ? 0.55 : 0.75)
      ctx.stroke(dryP)
      // ring-width index (lighter where the years crowd)
      const perYear = bw / (yMax - yMin)
      ctx.strokeStyle = rgba(C.ink, perYear < 2.2 ? 0.62 : 0.9)
      ctx.lineWidth = perYear < 2.2 ? 0.8 : 1.1
      ctx.beginPath()
      // where a year is narrower than a pixel or so, the line follows a five-year mean
      const sm = perYear < 1.4 ? 2 : 0
      for (let i = 0; i < ki; i++) {
        let v = 0
        let c = 0
        for (let q = -sm; q <= sm; q++) {
          const j = i + q
          if (j < 0 || j >= ki) continue
          v += lf.rings[j].rwi
          c++
        }
        const x = xOf(lf.y0 + i + 0.5)
        const yv = yOf((100 * v) / c)
        if (i) ctx.lineTo(x, yv)
        else ctx.moveTo(x, yv)
      }
      ctx.stroke()
      ctx.lineWidth = 1
      // droughts so far
      if (!L.mini) {
        for (const d of lf.droughts) {
          if (d.y0 < lf.y0 || d.y0 - lf.y0 > ki - 1) continue
          const x0 = xOf(d.y0)
          const x1 = xOf(d.y1 + 1)
          ctx.strokeStyle = rgba(C.fern, 0.9)
          ctx.beginPath()
          ctx.moveTo(x0, by + 2)
          ctx.lineTo(x1, by + 2)
          ctx.stroke()
        }
      }
      // labels
      const lab1 = L.tight ? 'RAIN % · RING INDEX' : 'RAINFALL, % OF NORMAL (BARS) · RING-WIDTH INDEX (LINE) · SIMULATED'
      text(ctx, lab1, bx, by - 8, { size: 7.5, color: C.muted, tracking: 0.14 })
      if (ki > 30 && !L.mini) {
        const tr = new Float32Array(ki)
        const tp = new Float32Array(ki)
        for (let i = 0; i < ki; i++) {
          tr[i] = Math.log(lf.rings[i].rwi)
          tp[i] = Math.log(lf.rain[lf.y0 + i - CL0])
        }
        const rr = corr(tr, tp, ki)
        text(ctx, `r = ${rr.toFixed(2)}`, bx + bw, by - 8, { size: 8, color: C.ink, align: 'right', tracking: 0.1 })
      }
      if (focusYear >= lf.y0 && focusYear < lf.y0 + ki) {
        const x = xOf(focusYear + 0.5)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(x, by)
        ctx.lineTo(x, by + bh)
        ctx.stroke()
      }
      ctx.restore()
    }

    // chapters II–IV: the cores and their skeleton plots
    if (benchIn > 0.01) {
      ctx.save()
      ctx.globalAlpha = A * benchIn
      const thick = L.mini ? 3 : bh > 150 ? 6 : 4.5
      const rowA = by + thick + 2
      const baseA = by + bh * 0.48
      const baseB = baseA + 3
      const skH = bh * 0.26
      const rowB = by + bh - thick - 6
      // core A, laid along its own years
      drawCore(lf, xOf(lf.y0), rowA, 0, xOf(LAST + 1) - xOf(lf.y0), thick, T > 49)
      if (!L.mini) {
        if (xOf(lf.y0) - 4 - measure('PITH', 7) > 2) text(ctx, 'PITH', xOf(lf.y0) - 4, rowA + 3, { size: 7, color: C.muted, align: 'right', tracking: 0.1 })
        if (bw > 420) {
          const lab = `CORE A · LIVING TREE · ${lf.y0}–${LAST}`
          const lw = measure(lab, 7.5)
          if (xOf(lf.y0) - bx > lw + 44) text(ctx, lab, xOf(lf.y0) - 34, rowA + 3, { size: 7.5, color: C.ink2, align: 'right', tracking: 0.12 })
          else text(ctx, lab, xOf(lf.y0), rowA - thick - 5, { size: 7.5, color: C.ink2, tracking: 0.12, alpha: 1 - beamIn })
        }
      }
      // skeleton plot A, drawn on from the pith out
      const skA = smoothstep(47.5, 51.5, T)
      const upToA = Math.floor(lf.n * skA)
      skeletonPlot(lf.rings, lf.y0, xOf, baseA, skH, -1, C.ocean, upToA)
      // pencil lines from the core's narrow rings to their years
      if (skA > 0.1) {
        const rb = radAt(lf, lf.n, lf.coreAng) + barkMM(lf, lf.n)
        const len = xOf(LAST + 1) - xOf(lf.y0)
        ctx.strokeStyle = rgba(C.ocean, 0.35)
        ctx.beginPath()
        for (let i = 0; i < upToA; i++) {
          if (lf.rings[i].sk < 6) continue
          const p = xOf(lf.y0) + (radAt(lf, i + 1, lf.coreAng) / rb) * len
          ctx.moveTo(p, rowA + thick + 1)
          ctx.lineTo(xOf(lf.y0 + i + 0.5), baseA - (lf.rings[i].sk / 10) * skH - 2)
        }
        ctx.stroke()
      }
      if (!L.mini && skA > 0.2 && bw > 360) text(ctx, 'SKELETON PLOT · A LINE FOR EVERY NARROW RING', bx + bw, baseA - skH - 6, { size: 7.5, color: C.ocean, align: 'right', tracking: 0.12, alpha: skA })

      // the beam: undated, then searched, then locked
      if (beamIn > 0.01) {
        const lag = lagAt(T)
        const bStart = lf.beam.y0 + lag
        ctx.save()
        ctx.globalAlpha = A * benchIn * beamIn
        const slideIn = (1 - ease.outCubic(beamIn)) * bw * 0.3
        const xb = (y: number) => xOf(y) - slideIn
        skeletonPlot(lf.beam.rings, bStart, xb, baseB, skH, 1, C.lagoon)
        drawBeamCore(lf.beam.rings, xb(bStart), rowB, xb(bStart + lf.beam.n) - xb(bStart), thick)
        const locked = smoothstep(62.6, 63.4, T)
        if (!L.mini && bw > 420) {
          const dated = locked > 0.5
          const lab = dated ? `CORE B · BEAM · DATED ${lf.beam.y0}–${lf.beam.y0 + lf.beam.n - 1}` : 'CORE B · A BEAM FROM AN OLD BARN · UNDATED'
          const xe = xb(bStart + lf.beam.n) + 8
          if (xe + measure(lab, 7.5) < bx + bw) text(ctx, lab, xe, rowB + 3, { size: 7.5, color: dated ? C.lagoon : C.ink2, tracking: 0.12 })
          else text(ctx, lab, xb(bStart), rowB - thick - 5, { size: 7.5, color: dated ? C.lagoon : C.ink2, tracking: 0.12 })
        }
        // matched narrow rings, joined once locked
        if (locked > 0.01) {
          ctx.globalAlpha = A * benchIn * locked
          ctx.strokeStyle = rgba(C.moss, 0.9)
          ctx.beginPath()
          for (let i = 0; i < lf.beam.n; i++) {
            const y = lf.beam.y0 + i
            const ia = y - lf.y0
            if (ia < 0 || ia >= lf.n) continue
            if (lf.beam.rings[i].sk < 3 || lf.rings[ia].sk < 3) continue
            const x = xOf(y + 0.5)
            ctx.moveTo(x, baseA - (lf.rings[ia].sk / 10) * skH)
            ctx.lineTo(x, baseB + (lf.beam.rings[i].sk / 10) * skH)
          }
          ctx.stroke()
        }
        ctx.restore()
        // the correlation at each trial date
        drawLagTrace(lf, T, lag)
        // the master chronology
        const chron = smoothstep(65.5, 67.5, T) * (1 - smoothstep(78.6, 79.6, T))
        if (chron > 0.01 && !L.mini) {
          ctx.save()
          ctx.globalAlpha = A * chron
          const x0 = xOf(lf.beam.y0)
          const x1 = xOf(LAST + 1)
          const yy = by - 4
          ctx.strokeStyle = C.moss
          ctx.beginPath()
          ctx.moveTo(x0, yy + 5)
          ctx.lineTo(x0, yy)
          ctx.lineTo(x1, yy)
          ctx.lineTo(x1, yy + 5)
          ctx.stroke()
          halo(`MASTER CHRONOLOGY · ${lf.beam.y0}–${LAST} · ${LAST - lf.beam.y0 + 1} YEARS`, (x0 + x1) / 2, yy - 5, { size: 8, color: C.moss, align: 'center', tracking: 0.14 })
          ctx.restore()
        }
      }
      if (focusYear > 0) {
        const x = xOf(focusYear + 0.5)
        if (x > bx && x < bx + bw) {
          ctx.strokeStyle = C.ocean
          ctx.beginPath()
          ctx.moveTo(x, rowA - thick - 2)
          ctx.lineTo(x, by + bh)
          ctx.stroke()
        }
      }
      ctx.restore()
    }
    ctx.restore()
  }

  /** the beam's trial dating offset over chapter III: a search that settles at the true date */
  function lagAt(T: number) {
    if (T < 55) return -46
    if (T > 63) return 0
    const keys = [-46, 31, -19, 12, -6, 3, 0]
    const u = ((T - 55) / 8) * (keys.length - 1)
    const i = Math.min(keys.length - 2, Math.floor(u))
    return Math.round(lerp(keys[i], keys[i + 1], ease.inOutSine(u - i)))
  }

  function drawLagTrace(lf: Life, T: number, lag: number) {
    if (L.mini) return
    const a = smoothstep(55, 56, T) * (1 - smoothstep(69, 70.5, T))
    if (a <= 0.01) return
    if (!L.nw) {
      // no room for the trace: one line of figures above the year axis
      const rv = lf.lagR[lag + LAG]
      const done = lag === 0 && T > 63
      const chron = smoothstep(65.5, 67.5, T)
      halo(`TRIAL DATE ${lag > 0 ? '+' : lag < 0 ? '−' : '±'}${Math.abs(lag)} YR · r = ${rv.toFixed(2)}${done ? ' · DATED' : ''}`, L.bx + L.bw, L.by - 8, { size: 8, color: done ? C.moss : C.ink, align: 'right', tracking: 0.1, alpha: a * (1 - chron) })
      return
    }
    // in the notes column if there is one, else in the bench's top-right
    const ww = L.nw ? Math.min(L.nw, 260) : Math.min(200, L.bw * 0.34)
    const hh = 34
    const x0 = L.nw ? L.nx : L.bx + L.bw - ww
    const y0 = L.nw ? L.cy + L.D * 0.55 : L.by + L.bh * 0.5 + 8
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    ctx.moveTo(x0, y0 + hh)
    ctx.lineTo(x0 + ww, y0 + hh)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.beginPath()
    for (let L2 = -LAG; L2 <= LAG; L2++) {
      const x = x0 + ((L2 + LAG) / (LAG * 2)) * ww
      const v = Math.max(0, lf.lagR[L2 + LAG])
      ctx.moveTo(x, y0 + hh)
      ctx.lineTo(x, y0 + hh - v * hh)
    }
    ctx.stroke()
    const xc = x0 + ((lag + LAG) / (LAG * 2)) * ww
    ctx.strokeStyle = C.lagoon
    ctx.beginPath()
    ctx.moveTo(xc, y0 - 2)
    ctx.lineTo(xc, y0 + hh + 3)
    ctx.stroke()
    const rv = lf.lagR[lag + LAG]
    text(ctx, 'CORRELATION AT EACH TRIAL DATE', x0, y0 - 8, { size: 7.5, color: C.muted, tracking: 0.12 })
    text(ctx, `${lag > 0 ? '+' : lag < 0 ? '−' : '±'}${Math.abs(lag)} YR · r = ${rv.toFixed(2)}${lag === 0 && T > 63 ? ' · DATED' : ''}`, x0, y0 + hh + 13, { size: 8, color: lag === 0 && T > 63 ? C.moss : C.ink, tracking: 0.1 })
    ctx.restore()
  }

  /* -------------------------------------------------------- the borer */

  function drawBorer(lf: Life, T: number, A: number) {
    const drill = smoothstep(38.6, 42, T)
    const pull = smoothstep(42.4, 44.6, T)
    if (drill <= 0 || T > 47.5) return
    const s = scaleFor(lf, lf.n)
    const a = lf.coreAng
    const rb = radAt(lf, lf.n, a) + barkMM(lf, lf.n)
    const ux = Math.cos(a)
    const uy = -Math.sin(a)
    const nx = -uy
    const ny = ux
    const half = Math.max(2.2, 2.5 * s)
    ctx.save()
    ctx.globalAlpha = A * (1 - smoothstep(46.5, 47.5, T))
    // the drilled channel, from the bark inward
    const inner = rb * (1 - drill) * s
    const outer = rb * s
    ctx.fillStyle = rgba(C.paper, 0.9)
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(L.cx + ux * inner + nx * half, L.cy + uy * inner + ny * half)
    ctx.lineTo(L.cx + ux * outer + nx * half, L.cy + uy * outer + ny * half)
    ctx.lineTo(L.cx + ux * outer - nx * half, L.cy + uy * outer - ny * half)
    ctx.lineTo(L.cx + ux * inner - nx * half, L.cy + uy * inner - ny * half)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // the borer's handle outside the bark, while drilling
    if (pull < 0.05) {
      const hx = L.cx + ux * (outer + 14)
      const hy = L.cy + uy * (outer + 14)
      ctx.beginPath()
      ctx.moveTo(L.cx + ux * outer, L.cy + uy * outer)
      ctx.lineTo(hx, hy)
      ctx.moveTo(hx + nx * 14, hy + ny * 14)
      ctx.lineTo(hx - nx * 14, hy - ny * 14)
      ctx.stroke()
      if (!L.mini) halo('INCREMENT BORER', hx + ux * 8, hy + uy * 8 + 3, { size: 8, color: C.ink2, align: ux > 0 ? 'left' : 'right', tracking: 0.12 })
    }
    // the core sliding out, then flying to the bench
    if (pull > 0) {
      const fly = ease.inOutCubic(smoothstep(44.6, 46.8, T))
      const out = pull * rb * s * 1.05
      const sx0 = L.cx + ux * out
      const sy0 = L.cy + uy * out
      const dirA = Math.atan2(uy, ux)
      const benchLen = L.bw * 0.9
      const thick = lerp(half, L.mini ? 3 : 5, fly)
      const x0 = lerp(sx0, L.bx, fly)
      const y0 = lerp(sy0, L.by + 6, fly)
      const dir = lerp(dirA, 0, fly)
      const len = lerp(rb * s, benchLen, fly)
      if (fly < 0.98) drawCore(lf, x0, y0, dir, len, thick, false)
    }
    ctx.restore()
  }

  /* ----------------------------------------------------- annotations */

  function callouts(lf: Life, T: number, k: number) {
    if (L.mini) return
    const s = scaleFor(lf, k)
    const ki = Math.floor(k)
    const items: { year: number; ang: number; label: string; color: string }[] = [
      { year: lf.frost, ang: lf.coreAng + 1.2, label: `FROST RING · ${lf.frost}`, color: C.ink },
      { year: lf.fire.year, ang: lf.fire.ang, label: `FIRE SCAR · ${lf.fire.year}`, color: C.ink },
      { year: lf.light.year, ang: lf.light.ang, label: `LIGHTNING · ${lf.light.year}`, color: C.ink },
      { year: lf.major.y0, ang: lf.coreAng - 0.9, label: `DROUGHT · ${lf.major.y0}–${String(lf.major.y1).slice(2)}`, color: C.fern },
    ]
    for (const it of items) {
      const i = it.year - lf.y0
      if (i >= ki || i < 0) continue
      const tA = tOfRing(i + 1, lf.n)
      const al = smoothstep(tA, tA + 0.5, T) * (T < 38 ? 1 - smoothstep(tA + 6, tA + 7.5, T) : smoothstep(68, 70, T) * (1 - smoothstep(78.5, 79.5, T)))
      if (al <= 0.01) continue
      const rr = radAt(lf, i + 1, it.ang) * s
      const x = L.cx + Math.cos(it.ang) * rr
      const y = L.cy - Math.sin(it.ang) * rr
      const out = radAt(lf, ki, it.ang) * s + barkMM(lf, k) * s + 16
      const lx = L.cx + Math.cos(it.ang) * out
      const ly = L.cy - Math.sin(it.ang) * out
      const right = Math.cos(it.ang) >= 0
      ctx.save()
      ctx.globalAlpha = al
      ctx.strokeStyle = rgba(it.color, 0.75)
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, TAU)
      ctx.moveTo(x + Math.cos(it.ang) * 3, y - Math.sin(it.ang) * 3)
      ctx.lineTo(lx, ly)
      ctx.lineTo(lx + (right ? 10 : -10), ly)
      ctx.stroke()
      const lw2 = measure(it.label, 8)
      let tx2 = lx + (right ? 13 : -13)
      // keep clear of the notes column, or of the bench when it sits to the right
      const limit = L.nw ? L.nx - 8 : L.bx > L.cx + L.D ? L.bx - 8 : w - L.pad
      if (right && tx2 + lw2 > limit) tx2 = limit - lw2
      if (!right) tx2 = Math.max(tx2, L.tx + L.tw + lw2 + 6)
      halo(it.label, tx2, ly + (right && tx2 < lx + 13 ? -6 : 3), { size: 8, color: it.color, align: right ? 'left' : 'right', tracking: 0.12 })
      ctx.restore()
    }
  }

  /** the loupe and the ring readout under the cursor */
  function loupe(lf: Life, k: number, px: number, py: number) {
    const u = ringUnder(lf, k, px, py)
    if (u.i === -2) return -1
    const s = scaleFor(lf, k)
    const mag = clamp(14 / Math.max(0.6, s * meanR(lf, k) / Math.max(1, k)), 4, 9)
    const R = clamp(L.D * 0.9, 30, L.tight ? 44 : 64)
    // the loupe sits up and away from the pointer, inside the frame
    let lx = px + (px < L.cx ? -R - 22 : R + 22)
    let ly = py - R - 18
    lx = clamp(lx, R + 8, w - R - 8)
    ly = clamp(ly, R + 8, h - R - 8)
    ctx.save()
    // leader
    ctx.strokeStyle = rgba(C.ocean, 0.6)
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, TAU)
    const dx = lx - px
    const dy = ly - py
    const dd = Math.hypot(dx, dy) || 1
    ctx.moveTo(px + (dx / dd) * 5, py + (dy / dd) * 5)
    ctx.lineTo(lx - (dx / dd) * R, ly - (dy / dd) * R)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(lx, ly, R, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.save()
    ctx.clip()
    // magnified: rings near the pointer, earlywood with fine cell rows, latewood hatched dark
    const S = s * mag
    const ox = lx - (px - L.cx) * mag
    const oy = ly - (py - L.cy) * mag
    const span = (R / S) / Math.max(1, u.rmm) + 0.02
    const a0 = u.a - span
    const a1 = u.a + span
    const ki = Math.min(lf.n, Math.floor(k))
    const steps = 18
    const rLo = u.rmm - R / S - 1
    const rHi = u.rmm + R / S + 1
    for (let i = 0; i < ki; i++) {
      const rIn = radAt(lf, i, u.a)
      const rOut = radAt(lf, i + 1, u.a)
      if (rOut < rLo || rIn > rHi) continue
      // the latewood band
      ctx.beginPath()
      for (let q = 0; q <= steps; q++) {
        const a = lerp(a0, a1, q / steps)
        const ri = radAt(lf, i, a)
        const ro = radAt(lf, i + 1, a)
        const rr = (ro - (ro - ri) * 0.32) * S
        if (q) ctx.lineTo(ox + Math.cos(a) * rr, oy - Math.sin(a) * rr)
        else ctx.moveTo(ox + Math.cos(a) * rr, oy - Math.sin(a) * rr)
      }
      for (let q = steps; q >= 0; q--) {
        const a = lerp(a0, a1, q / steps)
        const rr = radAt(lf, i + 1, a) * S
        ctx.lineTo(ox + Math.cos(a) * rr, oy - Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.save()
      ctx.fillStyle = rgba(C.ink, i === u.i ? 0.2 : 0.12)
      ctx.fill()
      ctx.clip()
      ctx.strokeStyle = rgba(C.ink, 0.45)
      hatchBox(2.2, -Math.PI / 4, lx - R, ly - R, R * 2, R * 2)
      ctx.restore()
      // ring boundary
      ctx.strokeStyle = i === u.i ? C.ocean : rgba(C.ink, 0.8)
      ctx.lineWidth = i === u.i ? 1.5 : 1
      ctx.beginPath()
      for (let q = 0; q <= steps; q++) {
        const a = lerp(a0, a1, q / steps)
        const rr = radAt(lf, i + 1, a) * S
        if (q) ctx.lineTo(ox + Math.cos(a) * rr, oy - Math.sin(a) * rr)
        else ctx.moveTo(ox + Math.cos(a) * rr, oy - Math.sin(a) * rr)
      }
      ctx.stroke()
      ctx.lineWidth = 1
    }
    // cell rows: faint radial lines across everything
    ctx.strokeStyle = rgba(C.ink, 0.08)
    ctx.beginPath()
    for (let q = 0; q <= 40; q++) {
      const a = lerp(a0, a1, q / 40)
      ctx.moveTo(ox + Math.cos(a) * rLo * S, oy - Math.sin(a) * rLo * S)
      ctx.lineTo(ox + Math.cos(a) * rHi * S, oy - Math.sin(a) * rHi * S)
    }
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    ctx.arc(lx, ly, R, 0, TAU)
    ctx.stroke()
    // the readout under the loupe
    const lines: string[] = []
    if (u.i >= lf.n || u.i >= ki) lines.push('BARK')
    else {
      const rg = lf.rings[u.i]
      const year = lf.y0 + u.i
      const rain = lf.rain[year - CL0]
      const tags: string[] = []
      if (year === lf.fire.year) tags.push('FIRE')
      if (year === lf.light.year) tags.push('LIGHTNING')
      if (year === lf.frost) tags.push('FROST')
      if (rain < 70) tags.push('DROUGHT')
      else if (rain > 130) tags.push('WET YEAR')
      lines.push(`${year} · RING ${u.i + 1}`)
      lines.push(`${rg.w.toFixed(2)} MM · RAIN ${Math.round(rain)}%`)
      if (tags.length) lines.push(tags.join(' · '))
    }
    lines.push(`×${mag.toFixed(0)}`)
    lines.forEach((ln, i) => halo(ln, lx, ly + R + 14 + i * 12, { size: i === 0 ? 9 : 8, color: i === 0 ? C.ocean : C.ink2, align: 'center', tracking: 0.12 }))
    ctx.restore()
    return u.i < ki ? u.i : -1
  }

  /* ------------------------------------------------------------ chrome */

  function captionAt(T: number, lf: Life) {
    if (preview) return
    const tD = tOfRing(lf.major.y0 - lf.y0, lf.n)
    const caps = [
      { t0: 1.6, t1: 11.5, a: 'One ring ', em: 'for every year.' },
      { t0: Math.max(13, tD - 1.2), t1: Math.max(13, tD - 1.2) + 10, a: 'Hard years ', em: 'are written small.' },
      { t0: 64, t1: 74.5, a: 'Trees keep the record ', em: 'we forgot.' },
    ]
    for (const cap of caps) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lines = L.oneLine ? [{ s: cap.a, em: cap.em }] : [{ s: cap.a.trim(), em: '' }, { s: '', em: cap.em }]
      let fs = L.capSize
      for (const ln of lines) {
        const wd = measure(ln.s, fs, 'serif') + measure(ln.em, fs, 'serif', true)
        if (wd > L.capW) fs = Math.max(11, (fs * L.capW) / wd)
      }
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = L.capY + fs + li * fs * 1.04
        ctx.save()
        ctx.beginPath()
        ctx.rect(L.capX - 4, y - fs * 1.02, w, fs * 1.32)
        ctx.clip()
        const dy = (1 - pr) * fs * 1.15 - pe * fs * 0.9
        setFont(ctx, { font: 'serif', size: fs })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, L.capX, y + dy, { font: 'serif', size: fs, color: C.ink })
        if (ln.em) text(ctx, ln.em, L.capX + sw, y + dy, { font: 'serif', size: fs, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function notes(lf: Life, T: number, k: number) {
    if (!L.nw || L.mini) return
    // a quiet key in the notes column, below the caption
    const y0 = L.ny + L.capSize * 2.4 + 34
    const x = L.nx
    const ki = Math.min(lf.n, Math.floor(k))
    const rows: [string, string][] = [
      ['GERMINATED', String(lf.y0)],
      ['RINGS', String(ki)],
      ['DIAMETER', `${((meanR(lf, k) * 2) / 10).toFixed(1)} CM`],
    ]
    if (T > 30) rows.push(['RAIN ↔ RINGS', `r = ${lf.rClim.toFixed(2)}`])
    if (T > 63) rows.push(['DATED BY', `r = ${lf.lagR[LAG].toFixed(2)}`])
    rows.forEach(([l, v], i) => {
      text(ctx, l, x, y0 + i * 15, { size: 8, color: C.muted, tracking: 0.14 })
      text(ctx, v, x + L.nw, y0 + i * 15, { size: 8.5, color: C.ink, align: 'right', tracking: 0.08 })
    })
    // legend
    const ly = y0 + rows.length * 15 + 14
    if (ly + 50 < L.cy + L.D * 0.5) {
      ctx.strokeStyle = rgba(C.ink, 0.14)
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x, ly)
      ctx.lineTo(x + 18, ly)
      ctx.stroke()
      ctx.lineWidth = 1
      text(ctx, 'LATEWOOD, EACH SUMMER’S END', x + 26, ly + 3, { size: 7.5, color: C.muted, tracking: 0.12 })
      ctx.strokeStyle = rgba(C.ink, 0.8)
      ctx.beginPath()
      for (let q = 0; q <= 18; q += 2) ctx.lineTo(x + q, ly + 14 + (q % 4 === 0 ? -1.5 : 1.5))
      ctx.stroke()
      text(ctx, 'FROST-DAMAGED EARLYWOOD', x + 26, ly + 17, { size: 7.5, color: C.muted, tracking: 0.12 })
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(x, ly + 28)
      ctx.lineTo(x + 18, ly + 28)
      ctx.stroke()
      ctx.lineWidth = 1
      text(ctx, 'SCAR FACE, CHARRED', x + 26, ly + 31, { size: 7.5, color: C.muted, tracking: 0.12 })
    }
  }

  function chrome(lf: Life, T: number, k: number, focus: number) {
    const { pad } = L
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    const ks = L.mini ? 8.5 : L.tight ? 9 : 10
    text(ctx, `${FIG} — TREE RINGS`, pad, pad + 9, { size: ks, color: C.muted, tracking: 0.16 })
    if (!preview) {
      const c = CHAPTERS[ch]
      const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
      text(ctx, `${c.num} — ${c.name}`, pad, pad + 9 + (L.mini ? 12 : 15), { size: ks, color: C.ink2, tracking: 0.16, upper: true, alpha: kIn })
    }
    const ki = Math.min(lf.n, Math.floor(k))
    const year = focus >= 0 ? lf.y0 + focus : lf.y0 + Math.max(0, ki - 1)
    const rain = lf.rain[clamp(year - CL0, 0, lf.rain.length - 1)]
    const items: [string, string][] = [
      [focus >= 0 ? 'Ring' : 'Year', String(year)],
      ['Age', `${focus >= 0 ? focus + 1 : ki} yr`],
      ['Rain', `${Math.round(rain)}%`],
      ['Width', `${lf.rings[clamp(year - lf.y0, 0, lf.n - 1)].w.toFixed(2)} mm`],
    ]
    if (preview) items.splice(2)
    const size = L.mini ? 10 : L.tight ? 11 : 13
    const kickW = Math.max(measure(`${FIG} — TREE RINGS`, ks), preview ? 0 : measure(`${CHAPTERS[ch].num} — ${CHAPTERS[ch].name}`.toUpperCase(), ks)) + 24
    const avail = L.hudRow ? w - pad * 2 : w - pad * 2 - kickW
    const gap = L.tight ? 14 : 22
    const widthOf = (its: [string, string][]) => its.reduce((acc, [l, v]) => acc + Math.max(measure(l.toUpperCase(), 8.5), measure(v, size)) + gap, -gap)
    let shown = items.slice()
    while (shown.length > 1 && widthOf(shown) > avail) shown = shown.slice(0, -1)
    let x = L.hudRow ? pad : w - pad - widthOf(shown)
    const hy = L.hudRow ? pad + 40 : pad + 7
    for (const [l, v] of shown) {
      const wd = Math.max(measure(l.toUpperCase(), 8.5), measure(v, size))
      text(ctx, l, x, hy, { size: 8.5, color: C.muted, tracking: 0.14, upper: true })
      text(ctx, v, x, hy + size + 3, { size, color: focus >= 0 ? C.ocean : C.ink, tracking: 0.04 })
      x += wd + gap
    }
    if (!preview) {
      const x0 = pad
      const x1 = w - pad
      const yb = L.rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = C.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 40; i++) {
        const xx = lerp(x0, x1, i / 40)
        ctx.moveTo(xx, yb)
        ctx.lineTo(xx, yb - (i % 5 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360) CHAPTERS.forEach((cc, i) => text(ctx, cc.num, lerp(x0, x1, cc.t / LOOP) + 4, yb - 7, { size: 8.5, color: i === ch ? C.ink : C.muted, tracking: 0.1 }))
      if (hoverX >= 0) {
        const hx = clamp(hoverX, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c, i) => (ht >= c.t ? i : acc), 0)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        const yr = ht < GROW1 ? ` · ${lf.y0 + Math.floor(ringsAt(ht, lf.n))}` : ''
        text(ctx, `${CHAPTERS[hc].num}${yr}`, clamp(hx, x0 + 40, x1 - 40), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12 })
      }
    }
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.lineWidth = 1
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, L.mini ? 6 : 9)
  }

  /** the ghost: drag across the rings, early in full mode */
  function ghostAt(T: number) {
    if (preview || used) return null
    const g0 = 6.5
    const g1 = 11.5
    if (T < g0 || T > g1) return null
    const u = (T - g0) / (g1 - g0)
    const a = -0.65
    const rr = L.D * lerp(0.08, 0.85, ease.inOutSine(clamp((u - 0.1) / 0.8)))
    return { x: L.cx + Math.cos(a) * rr, y: L.cy - Math.sin(a) * rr, al: smoothstep(0, 0.1, u) * (1 - smoothstep(0.88, 1, u)), a }
  }

  /* ---------------------------------------------------------------- sound */

  let lastRing = -1
  const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0]
  function soundFor(lf: Life, T: number, ki: number, dt: number) {
    if (!sfx.enabled || dt <= 0) {
      lastRing = ki
      return
    }
    if (T < GROW1 + 0.2 && ki !== lastRing && ki > lastRing) {
      for (let i = Math.max(0, lastRing); i < ki; i++) {
        const y = lf.y0 + i
        // a soft note every decade, pitched by its rainfall
        if (y % 10 === 0) {
          let s = 0
          for (let q = 0; q < 10; q++) s += lf.rain[clamp(y - 9 + q - CL0, 0, lf.rain.length - 1)]
          const deg = clamp(Math.round(((s / 10 - 70) / 70) * (SCALE.length - 1)), 0, SCALE.length - 1)
          sfx.tone(SCALE[deg], 1.6, { type: 'sine', gain: 0.03, attack: 0.02, room: 0.5 })
        }
        if (y === lf.fire.year) sfx.noise(1.6, { filter: 2600, to: 900, q: 0.6, gain: 0.05, room: 0.3 })
        if (y === lf.light.year) {
          sfx.noise(0.12, { filter: 4000, q: 0.5, gain: 0.08, room: 0.2 })
          sfx.noise(2.8, { filter: 240, to: 70, q: 0.7, gain: 0.12, room: 0.6, when: 0.25 })
        }
      }
    }
    lastRing = ki
  }

  /* ------------------------------------------------------------ interaction */

  const onRuler = (x: number, y: number) => !preview && y > L.rulerY - 20 && y < h && x > L.pad - 8 && x < w - L.pad + 8
  function seekRuler(x: number) {
    const T = prevT < 0 ? 0 : prevT
    let target = clamp((x - L.pad) / (w - L.pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }
  function newTree() {
    used = true
    const T = prevT < 0 ? 0 : prevT
    offset += LOOP - T
    sfx.tone(196, 1.2, { type: 'sine', gain: 0.05, room: 0.5 })
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      L = layoutFor(w, h)
    },
    pointer(p) {
      if (preview) return
      cursor.touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        cursor.on = false
        cursor.down = false
        hoverX = -1
        scrub = false
        downAt = null
        env.setCursor('default')
        return
      }
      const ruler = onRuler(p.x, p.y)
      hoverX = ruler || scrub ? p.x : -1
      cursor.x = p.x
      cursor.y = p.y
      if (p.type === 'down') {
        if (ruler) {
          scrub = true
          seekRuler(p.x)
          env.setCursor('pointer')
          return
        }
        downAt = { x: p.x, y: p.y, ms: performance.now() }
        cursor.down = true
      }
      if (scrub) {
        if (p.type === 'move' && p.pressed) seekRuler(p.x)
        if (p.type === 'up') scrub = false
        return
      }
      const inDisc = Math.hypot(p.x - L.cx, p.y - L.cy) < L.D * 1.04
      // a mouse reads on hover; a finger reads while it drags
      cursor.on = inDisc && (!cursor.touch || p.pressed)
      if (cursor.on) used = true
      if (p.type === 'up') {
        if (downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < (cursor.touch ? 14 : 8) && performance.now() - downAt.ms < 380) newTree()
        downAt = null
        cursor.down = false
        if (cursor.touch) cursor.on = false
      }
      env.setCursor(inDisc ? 'crosshair' : 'pointer')
    },
    key(code, down) {
      if (code === 'KeyN') {
        if (down) newTree()
        return true
      }
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      const T = prevT < 0 ? 0 : prevT
      if (code === 'ArrowRight') {
        const next = CHAPTERS.find((c) => c.t > T + 0.01)
        offset += (next ? next.t : LOOP) - T
      } else {
        const i = CHAPTERS.reduce((acc, c, idx) => (T >= c.t ? idx : acc), 0)
        const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
        offset += target - T
      }
      return true
    },
    frame(t, dt) {
      const perf0 = perfOn ? performance.now() : 0
      const tt = t + offset
      const T = mod(tt, LOOP)
      const loopN = Math.floor(tt / LOOP)
      if (loopN !== prevLoop) {
        prevLoop = loopN
        lastRing = -1
      }
      const lf = lifeFor(baseSeed + loopN)
      const k = Math.min(lf.n, ringsAt(T, lf.n))
      const A = smoothstep(0, 0.6, T) * (1 - smoothstep(LOOP - 1.2, LOOP - 0.05, T))

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, w, h)

      // what the cursor (or the ghost, or the test route) is reading
      let fx = -1
      let fy = -1
      const g = ghostAt(T)
      if (cursor.on) {
        fx = cursor.x
        fy = cursor.y
      } else if (g) {
        fx = g.x
        fy = g.y
      } else if (testCur) {
        const [rf, af] = testCur.split(',').map(Number)
        fx = L.cx + Math.cos(af) * rf * L.D
        fy = L.cy - Math.sin(af) * rf * L.D
      }
      let focus = -1
      if (fx >= 0) {
        const u = ringUnder(lf, k, fx, fy)
        focus = u.i >= 0 && u.i < Math.min(lf.n, Math.floor(k)) ? u.i : -1
      }

      drawTree(lf, T, A, k)
      drawSection(lf, A, k, focus)
      drawBorer(lf, T, A)
      callouts(lf, T, k)
      drawBench(lf, T, A, k, focus >= 0 ? lf.y0 + focus : -1)
      captionAt(T, lf)
      notes(lf, T, k)
      if (fx >= 0 && !preview) {
        ctx.save()
        ctx.globalAlpha = g && !cursor.on ? g.al : 1
        loupe(lf, k, fx, fy)
        if (g && !cursor.on) {
          // the ghost's path
          ctx.strokeStyle = rgba(C.ocean, 0.7)
          ctx.setLineDash([1.5, 3.5])
          ctx.beginPath()
          ctx.moveTo(L.cx + Math.cos(g.a) * L.D * 0.08, L.cy - Math.sin(g.a) * L.D * 0.08)
          ctx.lineTo(L.cx + Math.cos(g.a) * L.D * 0.85, L.cy - Math.sin(g.a) * L.D * 0.85)
          ctx.stroke()
          ctx.setLineDash([])
          const lab = cursor.touch || L.tight ? 'DRAG ACROSS THE RINGS' : 'DRAG ACROSS THE RINGS · TAP FOR A NEW TREE'
          const ex = L.cx + Math.cos(g.a) * L.D * 0.85
          const ey = L.cy - Math.sin(g.a) * L.D * 0.85
          const lw3 = measure(lab, 9)
          halo(lab, clamp(ex + 12, 8, w - 8 - lw3), Math.min(h - L.pad - 24, ey + 22), { size: 9, color: C.ocean, tracking: 0.14 })
        }
        ctx.restore()
      }
      chrome(lf, T, k, focus)
      soundFor(lf, T, Math.floor(k), dt)
      if (dt > 0 && prevT >= 0 && prevT < 63 && T >= 63) [146.83, 220, 293.66, 369.99].forEach((f, j) => sfx.tone(f, 3.2, { type: 'sine', gain: 0.035, attack: 0.25 + j * 0.05, room: 0.6 }))
      if (dt > 0 && prevT >= 0 && prevT < 39 && T >= 39) sfx.noise(2.6, { filter: 700, to: 1400, q: 1.5, gain: 0.03, room: 0.2 })
      prevT = T
      if (perfOn) {
        perfSum += performance.now() - perf0
        perfN++
        text(ctx, `${(perfSum / perfN).toFixed(2)} MS / FRAME · ${perfN}`, w / 2, h - 4, { size: 10, color: C.ocean, align: 'center' })
      }
    },
  }
}

export default create
