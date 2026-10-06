/*
 * S.02 — SCALE
 *
 * A continuous zoom through powers of ten, after Charles and Ray Eames’s
 * film Powers of Ten (1977) and Kees Boeke’s book Cosmic View (1957), drawn
 * as a technical plate: from two hands almost touching on a blanket in a
 * park, out to the edge of the observable universe (10²⁷ m), back in through
 * the skin to a carbon atom and the protons of its nucleus (10⁻¹⁵ m), and
 * out to the hands again.
 *
 * The camera holds one number, the exponent E: the square for 10ⁿ metres is
 * drawn S₀·10ⁿ⁻ᴱ pixels wide. Every level is a procedural layer in its own
 * frame of reference — the hand, the Earth, the Sun, the Galaxy, the Local
 * Group — and the camera glides between their origins as E passes through
 * them, so each layer is computed relative to the camera in exact double
 * precision across 42 orders of magnitude. Layers fade in and out by their
 * apparent size; the coastline is a fractal whose octaves fade in as you
 * approach, so it keeps getting longer. Real numbers throughout: planetary
 * orbits, the heliosphere and the Voyagers, the nearest stars at their real
 * galactic positions and temperatures, the Milky Way’s arms, the Local
 * Group, the carbon atom’s orbitals sampled from |ψ|².
 *
 * One loop of ≈ 118 s (seek with ?at=…). Drag to take over the exponent,
 * tap to hold on a level, ← → step a power of ten.
 */

import { C, TAU, clamp, cropMarks, ease, ground, hatch, lerp, makeNoise, rgba, rng, setFont, smoothstep, text } from '../kit'
import { blackbody, css } from '../color'
import type { CreatePiece, PointerInfo } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.02'
const LN10 = Math.LN10
const p10 = (x: number) => Math.exp(x * LN10)
const AU = 1.495978707e11
const LY = 9.4607304725808e15
const PC = 3.0857e16
const KPC = 1e3 * PC
const R_E = 6.371e6
const C_LIGHT = 299792458
const E_MIN = -15
const E_MAX = 27.1

/* --------------------------------------------------------- the journey */
// (time, exponent) keyframes, joined by a monotone cubic
const KEYS: [number, number][] = [
  [0, -0.6], [1.5, -0.6], [11.5, 0.4],
  [14.2, 2.3], [17, 4.9], [19.3, 6.5], [21.3, 7.12], [26.3, 7.38],
  [28.6, 8.6], [31.3, 11], [34, 13.4], [36.4, 15.5], [39, 17.25], [41.5, 19.3], [44, 20.75], [46.8, 21.6], [49.2, 23.2], [51.6, 24.9], [54, 26.3], [56, 26.86], [61, 27.02],
  [63, 25.9], [65.4, 21.6], [67.8, 15.5], [70.2, 9.6], [72.2, 4.6], [74, 1.1], [76, 0.02],
  [77.2, -0.45], [79.4, -2.2], [81.8, -4.2], [84.2, -6.3], [86.6, -8.4], [88.6, -9.7], [90.6, -10.4], [95.6, -12.7], [98, -13.9], [100.4, -14.7], [104, -14.86],
  [106, -14.0], [108.6, -10.6], [111.2, -6.1], [113.8, -2.1], [116.2, -0.75], [118, -0.6],
]
const LOOP = 118

/** monotone cubic (Fritsch–Carlson) through KEYS */
const KT = KEYS.map((k) => k[0])
const KE = KEYS.map((k) => k[1])
const KM: number[] = (() => {
  const n = KEYS.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((KE[i + 1] - KE[i]) / (KT[i + 1] - KT[i]))
  // tangents: the harmonic mean of the neighbouring slopes, zero at an extremum
  const m: number[] = [d[0]]
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]))
  m.push(d[n - 2])
  return m
})()
function eAuto(T: number) {
  let i = 0
  while (i < KT.length - 2 && T > KT[i + 1]) i++
  const h = KT[i + 1] - KT[i]
  const u = clamp((T - KT[i]) / h)
  const h00 = 2 * u * u * u - 3 * u * u + 1
  const h10 = u * u * u - 2 * u * u + u
  const h01 = -2 * u * u * u + 3 * u * u
  const h11 = u * u * u - u * u
  return h00 * KE[i] + h10 * h * KM[i] + h01 * KE[i + 1] + h11 * h * KM[i + 1]
}

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 1.8, t1: 11.4, lines: [{ s: 'Every ten seconds,' }, { s: '', em: 'ten times farther.' }] },
  { t0: 21.4, t1: 27.4, lines: [{ s: 'Here is everyone' }, { s: 'you have ', em: 'ever known.' }] },
  { t0: 55.4, t1: 61.6, lines: [{ s: 'As far as light' }, { s: 'has ', em: 'had time to come.' }] },
  { t0: 90.6, t1: 98.2, lines: [{ s: 'And inside you,' }, { s: 'the same ', em: 'emptiness.' }] },
]

/** what lives at each power of ten */
const LEVELS: Record<number, [string, string]> = {
  [-15]: ['A proton', 'THREE QUARKS, HELD BY GLUONS'],
  [-14]: ['A carbon nucleus', 'SIX PROTONS, SIX NEUTRONS · 5 FM'],
  [-13]: ['Empty space', 'INSIDE THE ATOM'],
  [-12]: ['Empty space', 'AN ATOM IS TENS OF THOUSANDS OF NUCLEI WIDE'],
  [-11]: ['The inner electrons', 'THE 1s ORBITAL · 20 PM'],
  [-10]: ['A carbon atom', 'ITS ELECTRON CLOUD · ABOUT 0.3 NM'],
  [-9]: ['DNA', 'THE DOUBLE HELIX · 2 NM WIDE'],
  [-8]: ['Between two nucleosomes', 'DNA WOUND ON HISTONES · 11 NM'],
  [-7]: ['Chromatin', 'TWO METRES OF DNA, FOLDED'],
  [-6]: ['A cell nucleus', '8 MICROMETRES ACROSS'],
  [-5]: ['A skin cell', 'ABOUT 15 MICROMETRES'],
  [-4]: ['Skin', 'CELLS OF THE EPIDERMIS'],
  [-3]: ['A fingerprint', 'RIDGES HALF A MILLIMETRE APART'],
  [-2]: ['A fingertip', 'ONE CENTIMETRE'],
  [-1]: ['Two hands', 'ALMOST TOUCHING'],
  [0]: ['Two people', 'ONE METRE'],
  [1]: ['On a blanket', 'TEN METRES'],
  [2]: ['A park', 'A HUNDRED METRES'],
  [3]: ['A city', 'ONE KILOMETRE'],
  [4]: ['A city by the water', 'TEN KILOMETRES'],
  [5]: ['A coast', 'A HUNDRED KILOMETRES'],
  [6]: ['A continent', 'A THOUSAND KILOMETRES'],
  [7]: ['The Earth', '12,742 KM ACROSS'],
  [8]: ['Near space', 'THE MOON IS 384,400 KM AWAY'],
  [9]: ['The Moon’s orbit', '1.3 LIGHT-SECONDS TO THE MOON'],
  [10]: ['Along Earth’s orbit', '30 KM EVERY SECOND'],
  [11]: ['The inner planets', 'EIGHT LIGHT-MINUTES TO THE SUN'],
  [12]: ['Jupiter and Saturn', 'THE GIANT PLANETS'],
  [13]: ['The planets', 'NEPTUNE, 30 AU OUT'],
  [14]: ['The heliosphere', 'THE SUN’S WIND MEETS THE GALAXY’S'],
  [15]: ['The Oort cloud', 'COMETS, LOOSELY HELD'],
  [16]: ['One light-year', '9.46 TRILLION KM'],
  [17]: ['The nearest stars', 'ALPHA CENTAURI, 4.37 LIGHT-YEARS'],
  [18]: ['Our neighbourhood', 'A HUNDRED LIGHT-YEARS'],
  [19]: ['The Orion Arm', 'A THOUSAND LIGHT-YEARS'],
  [20]: ['The Milky Way, near us', 'TEN THOUSAND LIGHT-YEARS'],
  [21]: ['The Milky Way', 'A HUNDRED BILLION STARS'],
  [22]: ['Our satellite galaxies', 'THE MAGELLANIC CLOUDS'],
  [23]: ['The Local Group', 'ANDROMEDA, 2.5 MILLION LIGHT-YEARS'],
  [24]: ['The Virgo Supercluster', 'A HUNDRED MILLION LIGHT-YEARS'],
  [25]: ['The cosmic web', 'A BILLION LIGHT-YEARS'],
  [26]: ['The observable universe', 'TEN BILLION LIGHT-YEARS'],
  [27]: ['The edge of what we can see', '93 BILLION LIGHT-YEARS ACROSS'],
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '.': '·' }
const sup = (s: string) =>
  s
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('')

/** a length, said the way a person would */
function sayLength(m: number) {
  const f = (v: number, unit: string) => {
    const s = v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(0) : v.toFixed(1)
    return `${s} ${unit}`
  }
  if (m < 1e-12) return f(m / 1e-15, 'FM')
  if (m < 1e-9) return f(m / 1e-12, 'PM')
  if (m < 1e-6) return f(m / 1e-9, 'NM')
  if (m < 1e-3) return f(m / 1e-6, 'µM')
  if (m < 1e-2) return f(m / 1e-3, 'MM')
  if (m < 1) return f(m / 1e-2, 'CM')
  if (m < 1e3) return f(m, 'M')
  if (m < 1e9) return f(m / 1e3, 'KM')
  if (m < 0.1 * LY) return f(m / AU, 'AU')
  if (m < 1e6 * LY) return f(m / LY, 'LY')
  if (m < 1e9 * LY) return f(m / (1e6 * LY), 'MILLION LY')
  return f(m / (1e9 * LY), 'BILLION LY')
}
/** a duration, for light crossing a frame */
function sayTime(s: number) {
  if (s < 1e-10) {
    const e = Math.floor(Math.log10(s))
    return `${(s / p10(e)).toFixed(1)} × 10${sup(String(e))} S`
  }
  if (s < 1e-6) return `${(s * 1e9).toFixed(1)} NS`
  if (s < 1e-3) return `${(s * 1e6).toFixed(1)} µS`
  if (s < 1) return `${(s * 1e3).toFixed(1)} MS`
  if (s < 60) return `${s.toFixed(1)} S`
  if (s < 3600) return `${(s / 60).toFixed(1)} MIN`
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)} H`
  if (s < 3.156e7) return `${(s / 86400).toFixed(0)} DAYS`
  const y = s / 3.156e7
  if (y < 1e6) return `${y < 10 ? y.toFixed(1) : Math.round(y).toLocaleString('en-US')} YEARS`
  if (y < 1e9) return `${(y / 1e6).toFixed(y < 1e7 ? 1 : 0)} MILLION YEARS`
  return `${(y / 1e9).toFixed(1)} BILLION YEARS`
}

/* ------------------------------------------------------------ frames */
// anchors in the hand’s plan frame (metres, y down on the page, north up)
const SUN = { x: -AU * Math.cos(0.52), y: AU * Math.sin(0.52) } // Sun, from the Earth
const GC = { x: 0, y: -8.2 * KPC } // the galactic centre, from the Sun (up the page)
const LG = { x: 0.6 * 1.05e6 * LY, y: -0.8 * 1.05e6 * LY } // Local Group barycentre, from the Galactic centre

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const noise = makeNoise(7)
  const PAPER = C.paper
  const INK = C.ink
  const INK2 = C.ink2
  const MUTED = C.muted

  /* ---------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let portrait = false
  let short = false
  let tiny = false
  let pad = 20
  let capSize = 28
  let capX = 0
  let capY = 0
  let S0 = 400
  let zx = 0
  let zy = 0
  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    short = h < 380
    tiny = h < 250
    pad = clamp(Math.min(w, h) * 0.045, short ? 12 : 16, 40)
    capSize = portrait ? clamp(Math.min(w * 0.072, h * 0.04), 18, 40) : clamp(Math.min(w * 0.04, h * 0.058), short ? 14 : 20, 46)
    if (preview) capSize = 16
    capX = pad * (portrait ? 1 : 1.4)
    capY = h - pad * (short ? 1.15 : 1.6) - capSize * 2.1 - (preview ? 0 : 16)
    if (portrait) {
      S0 = Math.min(w * 0.7, h * 0.4)
      zx = w / 2
      zy = h * 0.4
    } else {
      S0 = Math.min(h * (short ? 0.6 : 0.6), w * 0.42)
      zx = w * (short ? 0.6 : 0.58)
      zy = h * 0.46
    }
  }
  layout()

  /* --------------------------------------------------------- the hand */
  // a right hand, palm up, reaching: the index finger extended, the others gently curled
  // (so shorter in plan). Centimetres about the palm’s centre, y toward the fingers.
  interface Finger {
    bx: number
    by: number
    len: number
    wid: number
    ang: number
  }
  // from the little finger (x > 0) to the index; the thumb lies on the left
  const FINGERS: Finger[] = [
    { bx: 3.15, by: 3.1, len: 4.0, wid: 1.62, ang: 13 },
    { bx: 1.27, by: 3.8, len: 4.9, wid: 1.92, ang: 7 },
    { bx: -0.72, by: 4.05, len: 5.7, wid: 2.0, ang: 2.5 },
    { bx: -2.72, by: 3.6, len: 7.3, wid: 1.95, ang: -1 },
  ]
  const THUMB: Finger = { bx: -4.55, by: -1.0, len: 5.6, wid: 2.05, ang: -52 }
  const handPts: number[] = [] // the outline, cm, as a polyline
  const handCreases: number[][] = []
  const frame = (f: Finger) => {
    const a = (f.ang * Math.PI) / 180
    return { ux: Math.sin(a), uy: Math.cos(a), nx: Math.cos(a), ny: -Math.sin(a) }
  }
  {
    const out: [number, number][] = []
    /** up the +n side, over the tip, down the −n side */
    const finger = (f: Finger, from = 0, to = 1) => {
      const { ux, uy, nx, ny } = frame(f)
      const hw = f.wid / 2
      const ht = hw * 0.9
      const pts: [number, number][] = []
      for (let q = 0; q <= 4; q++) {
        const t = q / 4
        const hh = lerp(hw, ht, t)
        const al = t * (f.len - ht)
        pts.push([f.bx + ux * al + nx * hh, f.by + uy * al + ny * hh])
      }
      const cx = f.bx + ux * (f.len - ht)
      const cy = f.by + uy * (f.len - ht)
      for (let q = 1; q < 8; q++) {
        const th = (q / 8) * Math.PI
        pts.push([cx + (nx * Math.cos(th) + ux * Math.sin(th)) * ht, cy + (ny * Math.cos(th) + uy * Math.sin(th)) * ht])
      }
      for (let q = 4; q >= 0; q--) {
        const t = q / 4
        const hh = lerp(hw, ht, t)
        const al = t * (f.len - ht)
        pts.push([f.bx + ux * al - nx * hh, f.by + uy * al - ny * hh])
      }
      const n = pts.length
      return pts.slice(Math.round(from * (n - 1)), Math.round(to * (n - 1)) + 1)
    }
    // the little-finger edge of the palm, from the wrist
    out.push([3.45, -7.2], [3.85, -5.0], [4.2, -2.4], [4.25, 0.2], [3.95, 2.3])
    FINGERS.forEach((f, i) => {
      out.push(...finger(f))
      if (i < FINGERS.length - 1) {
        const g = FINGERS[i + 1]
        const a = frame(f)
        const b = frame(g)
        const lx = f.bx - a.nx * (f.wid / 2)
        const ly = f.by - a.ny * (f.wid / 2)
        const rx = g.bx + b.nx * (g.wid / 2)
        const ry = g.by + b.ny * (g.wid / 2)
        out.push([(lx + rx) / 2, (ly + ry) / 2 - 0.12])
      }
    })
    // the web to the thumb, the thumb, its ball, the wrist
    out.push([-3.95, 2.3], [-4.2, 1.1])
    out.push(...finger(THUMB, 0.12, 0.92))
    out.push([-5.15, -3.4], [-4.45, -5.1], [-3.75, -7.2])
    // smooth it (Catmull–Rom)
    const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    for (let i = 0; i < out.length - 1; i++) {
      const p0 = out[Math.max(0, i - 1)]
      const p1 = out[i]
      const p2 = out[i + 1]
      const p3 = out[Math.min(out.length - 1, i + 2)]
      for (let q = 0; q < 4; q++) {
        const t = q / 4
        handPts.push(cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t))
      }
    }
    handPts.push(out[out.length - 1][0], out[out.length - 1][1])
    // the three great creases of the palm
    handCreases.push([4.05, 1.4, 2.6, 2.0, 0.6, 2.35, -1.2, 2.75])
    handCreases.push([-4.0, 0.9, -2.0, 0.55, 0.4, -0.15, 2.6, -1.05])
    handCreases.push([-3.95, 0.75, -2.6, -0.9, -2.15, -3.2, -2.35, -5.6])
    // and the folds of the fingers
    for (const f of [...FINGERS, THUMB]) {
      const { ux, uy, nx, ny } = frame(f)
      const hw = (f.wid / 2) * 0.72
      for (const q of f === THUMB ? [0.5] : [0.28, 0.6]) {
        const cx = f.bx + ux * f.len * q
        const cy = f.by + uy * f.len * q
        handCreases.push([cx - nx * hw, cy - ny * hw, cx + ux * 0.08, cy + uy * 0.08, cx + nx * hw, cy + ny * hw])
      }
    }
  }
  const IDX = FINGERS[3]
  const IDXF = frame(IDX)
  /** the pad of the index finger, cm */
  const tipIndex = { x: IDX.bx + IDXF.ux * (IDX.len - 1.15), y: IDX.by + IDXF.uy * (IDX.len - 1.15) }
  // the hand on the page: fingers pointing up and to the right
  const HAND_ROT = -0.62
  const hcr = Math.cos(HAND_ROT)
  const hsr = Math.sin(HAND_ROT)
  /** hand cm (y up) → plan metres (y down) */
  const handX = (x: number, y: number) => (x * hcr - y * hsr) * 0.01
  const handY = (x: number, y: number) => -(x * hsr + y * hcr) * 0.01
  // the second hand: a mirror image across a line just beyond our index finger
  const ARM = { x: -hsr, y: -hcr } // unit vector from wrist to fingers, plan frame
  const MIRROR = (() => {
    let far = 0
    for (let i = 0; i < handPts.length; i += 2) far = Math.max(far, handX(handPts[i], handPts[i + 1]) * ARM.x + handY(handPts[i], handPts[i + 1]) * ARM.y)
    return far + 0.011 // a gap of 2.2 cm between the fingertips
  })()
  const mirX = (x: number, y: number) => {
    const d = x * ARM.x + y * ARM.y
    return x + 2 * (MIRROR - d) * ARM.x
  }
  const mirY = (x: number, y: number) => {
    const d = x * ARM.x + y * ARM.y
    return y + 2 * (MIRROR - d) * ARM.y
  }
  /** the point we zoom into: the pad of the index finger (plan metres) */
  const M = { x: handX(tipIndex.x, tipIndex.y), y: handY(tipIndex.x, tipIndex.y) }
  /** halfway between the two palms */
  const Q = { x: ARM.x * MIRROR, y: ARM.y * MIRROR }
  /** the index finger’s direction on the page (F) and across it (G), for the whorl */
  const FD = { x: IDXF.ux * hcr - IDXF.uy * hsr, y: -(IDXF.ux * hsr + IDXF.uy * hcr) }
  const GD = { x: -FD.y, y: FD.x }
  const IDX_ROT = Math.atan2(FD.y, FD.x)

  /* ------------------------------------------------------- the lawn */
  const r0 = rng(1977)
  const TUFTS = new Float64Array((preview ? 700 : 1800) * 2)
  for (let i = 0; i < TUFTS.length; i += 2) {
    const rad = 0.9 + Math.pow(r0(), 0.8) * 28
    const an = r0() * TAU
    TUFTS[i] = Math.cos(an) * rad
    TUFTS[i + 1] = Math.sin(an) * rad
  }
  // park trees (canopy centres and radii, metres)
  const TREES: [number, number, number][] = []
  for (let i = 0; i < 70; i++) {
    const x = (r0() - 0.5) * 680
    const y = (r0() - 0.5) * 420
    if (Math.hypot(x, y) < 18) continue
    if (Math.abs(y - 40 * Math.sin(x / 90)) < 9) continue
    TREES.push([x, y, 3 + r0() * 5])
  }

  /* ------------------------------------------------------ the land */
  // an imaginary planet’s continents: 3D noise on the unit sphere, octaves faded by zoom
  const NO = 15
  const LFQ = new Float64Array(NO)
  const LAM = new Float64Array(NO)
  const LOX = new Float64Array(NO)
  for (let o = 0; o < NO; o++) {
    LFQ[o] = 1.55 * Math.pow(2.08, o)
    LAM[o] = Math.pow(0.54, o)
    LOX[o] = o * 17.31
  }
  const WT = new Float64Array(NO)
  // Perlin’s improved noise, without allocation (the land is sampled tens of thousands of times a frame)
  const PERM = new Uint8Array(512)
  {
    const r = rng(1957)
    const pp = Array.from({ length: 256 }, (_, i) => i)
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      const t = pp[i]
      pp[i] = pp[j]
      pp[j] = t
    }
    for (let i = 0; i < 512; i++) PERM[i] = pp[i & 255]
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const grad = (hh: number, x: number, y: number, z: number) => {
    const g = hh & 15
    const u = g < 8 ? x : y
    const v = g < 4 ? y : g === 12 || g === 14 ? x : z
    return (g & 1 ? -u : u) + (g & 2 ? -v : v)
  }
  function pnoise(x: number, y: number, z: number) {
    const X = Math.floor(x)
    const Y = Math.floor(y)
    const Z = Math.floor(z)
    x -= X
    y -= Y
    z -= Z
    const xi = X & 255
    const yi = Y & 255
    const zi = Z & 255
    const u = fade(x)
    const v = fade(y)
    const ww = fade(z)
    const A0 = PERM[xi] + yi
    const AA = PERM[A0] + zi
    const AB = PERM[A0 + 1] + zi
    const B0 = PERM[xi + 1] + yi
    const BA = PERM[B0] + zi
    const BB = PERM[B0 + 1] + zi
    const x1 = lerp(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u)
    const x2 = lerp(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u)
    const x3 = lerp(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u)
    const x4 = lerp(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u)
    return lerp(lerp(x1, x2, v), lerp(x3, x4, v), ww)
  }
  // a small rise keeps the hands dry at every resolution
  const RISE = 1.3e3 / 6.371e6
  let ax0 = 0
  let ay0 = 0
  let az0 = 1
  function land(px: number, py: number, pz: number) {
    const dx = px - ax0
    const dy = py - ay0
    const dz = pz - az0
    let v = 0.06 + 0.08 * Math.exp(-(dx * dx + dy * dy + dz * dz) / (RISE * RISE))
    for (let o = 0; o < NO; o++) {
      const wt = WT[o]
      if (wt <= 0) continue
      v += wt * LAM[o] * 1.1 * pnoise(px * LFQ[o] + LOX[o], py * LFQ[o] - LOX[o], pz * LFQ[o] + LOX[o] * 0.5)
    }
    return v
  }
  // the hand’s place on the planet: on a continent’s coast, the sea a few kilometres away
  const A = { x: 0, y: 0, z: 1 }
  const EN = { x: 0, y: 1, z: 0 }
  const EE = { x: 1, y: 0, z: 0 }
  const basis = (ax: number, ay: number, az: number) => {
    const nx = -az * ax
    const ny = -az * ay
    const nz = 1 - az * az
    const nl = Math.hypot(nx, ny, nz) || 1
    const N = { x: nx / nl, y: ny / nl, z: nz / nl }
    const Ev = { x: N.y * az - N.z * ay, y: N.z * ax - N.x * az, z: N.x * ay - N.y * ax }
    return { N, E: Ev }
  }
  {
    const r = rng(42)
    let bestScore = -Infinity
    for (let tries = 0; tries < 30000; tries++) {
      const z = r() * 1.6 - 0.8
      const an = r() * TAU
      const c = Math.sqrt(1 - z * z)
      const ax = c * Math.cos(an)
      const ay = c * Math.sin(an)
      // a continent at the coarse scale
      for (let o = 0; o < NO; o++) WT[o] = o <= 3 ? 1 : 0
      if (land(ax, ay, z) < 0.04) continue
      WT.fill(1)
      const v = land(ax, ay, z)
      if (v < 0.01) continue
      const { N, E: Ev } = basis(ax, ay, z)
      const at = (d: number, th: number) => {
        const dd = d / R_E
        return land(ax + dd * (Math.cos(th) * Ev.x + Math.sin(th) * N.x), ay + dd * (Math.cos(th) * Ev.y + Math.sin(th) * N.y), z + dd * (Math.cos(th) * Ev.z + Math.sin(th) * N.z))
      }
      let near = 0
      for (let q = 0; q < 16; q++) if (at(1800, (q / 16) * TAU) > 0) near++
      if (near < 15) continue
      let sea4 = 0
      let sea7 = 0
      for (let q = 0; q < 16; q++) {
        if (at(4200, (q / 16) * TAU) < 0) sea4++
        if (at(7000, (q / 16) * TAU) < 0) sea7++
      }
      const score = (sea4 >= 2 ? 1 : 0) + (sea7 >= 4 && sea7 <= 9 ? 1 : 0) - Math.abs(sea7 - 6) * 0.04
      if (score > bestScore) {
        bestScore = score
        A.x = ax
        A.y = ay
        A.z = z
      }
      if (score >= 1.95) break
    }
    const { N, E: Ev } = basis(A.x, A.y, A.z)
    EN.x = N.x
    EN.y = N.y
    EN.z = N.z
    EE.x = Ev.x
    EE.y = Ev.y
    EE.z = Ev.z
    ax0 = A.x
    ay0 = A.y
    az0 = A.z
  }
  // the Sun lights the near side; night creeps over the upper right
  const SUNDIR = (() => {
    const v = { x: -0.5 * EE.x + 0.28 * EN.x + 0.82 * A.x, y: -0.5 * EE.y + 0.28 * EN.y + 0.82 * A.y, z: -0.5 * EE.z + 0.28 * EN.z + 0.82 * A.z }
    const l = Math.hypot(v.x, v.y, v.z)
    return { x: v.x / l, y: v.y / l, z: v.z / l }
  })()

  /* ----------------------------------------------- the cosmic layers */
  const rs = rng(808)
  // planets: name, semi-major axis (AU), radius (m)
  const PLANETS: [string, number, number, number][] = [
    ['MERCURY', 0.387, 2.44e6, rs() * TAU],
    ['VENUS', 0.723, 6.05e6, rs() * TAU],
    ['EARTH', 1, 6.371e6, Math.atan2(-SUN.y, -SUN.x)],
    ['MARS', 1.524, 3.39e6, rs() * TAU],
    ['JUPITER', 5.203, 6.99e7, rs() * TAU],
    ['SATURN', 9.537, 5.82e7, rs() * TAU],
    ['URANUS', 19.19, 2.54e7, rs() * TAU],
    ['NEPTUNE', 30.07, 2.46e7, rs() * TAU],
  ]
  const nAst = preview ? 260 : 700
  const AST = new Float64Array(nAst * 2)
  for (let i = 0; i < nAst; i++) {
    const rr = (2.15 + rs() * 1.15) * AU
    const an = rs() * TAU
    AST[i * 2] = Math.cos(an) * rr
    AST[i * 2 + 1] = Math.sin(an) * rr
  }
  const nKui = preview ? 200 : 520
  const KUI = new Float64Array(nKui * 2)
  for (let i = 0; i < nKui; i++) {
    const rr = (30 + Math.pow(rs(), 1.4) * 22) * AU
    const an = rs() * TAU
    KUI[i * 2] = Math.cos(an) * rr
    KUI[i * 2 + 1] = Math.sin(an) * rr
  }
  const nOort = preview ? 360 : 1100
  const OORT = new Float64Array(nOort * 2)
  for (let i = 0; i < nOort; i++) {
    const rr = Math.exp(lerp(Math.log(2000), Math.log(100000), rs())) * AU
    const an = rs() * TAU
    const fl = Math.sqrt(1 - Math.pow(rs() * 2 - 1, 2))
    OORT[i * 2] = Math.cos(an) * rr * fl
    OORT[i * 2 + 1] = Math.sin(an) * rr * fl
  }
  // the nearest stars: name, galactic longitude, latitude (deg), distance (ly), temperature (K)
  const NEAR: [string, number, number, number, number][] = [
    ['α CENTAURI A · B', 315.7, -0.7, 4.37, 5600],
    ['PROXIMA', 313.9, -1.9, 4.24, 3040],
    ['BARNARD’S STAR', 31.0, 14.1, 5.96, 3130],
    ['WOLF 359', 244.1, 56.1, 7.86, 2800],
    ['LALANDE 21185', 185.1, 65.4, 8.31, 3500],
    ['SIRIUS', 227.2, -8.9, 8.6, 9940],
    ['ROSS 154', 11.3, -10.3, 9.7, 3300],
    ['ε ERIDANI', 195.8, -48.1, 10.47, 5080],
    ['PROCYON', 213.7, 13.0, 11.46, 6530],
    ['61 CYGNI', 82.3, -5.8, 11.4, 4400],
    ['ε INDI', 336.2, -48.0, 11.87, 4630],
    ['τ CETI', 173.1, -73.4, 11.91, 5340],
    ['ALTAIR', 47.7, -8.9, 16.7, 7700],
    ['VEGA', 67.4, 19.2, 25.0, 9600],
    ['ARCTURUS', 15.1, 69.1, 36.7, 4290],
  ]
  const NEARXY = NEAR.map(([, l, b, d]) => {
    const lr = (l * Math.PI) / 180
    const br = (b * Math.PI) / 180
    // plan of the galactic plane: the Galactic centre (l = 0) up the page
    return [d * LY * Math.cos(br) * Math.sin(lr), -d * LY * Math.cos(br) * Math.cos(lr)] as const
  })
  const NEARCOL = NEAR.map((s) => css(blackbody(s[4])))
  // farther landmarks of the neighbourhood: name, l, b (deg), distance (ly), temperature (0 = a nebula)
  const FAR: [string, number, number, number, number][] = [
    ['CANOPUS', 261.2, -25.3, 310, 7400],
    ['POLARIS', 123.3, 26.5, 433, 6000],
    ['THE PLEIADES', 166.6, -23.5, 444, 13000],
    ['BETELGEUSE', 199.8, -9.0, 550, 3500],
    ['ANTARES', 351.9, 15.1, 550, 3500],
    ['RIGEL', 209.2, -25.2, 860, 12100],
    ['THE ORION NEBULA', 209.0, -19.4, 1344, 0],
    ['DENEB', 84.3, 2.0, 2600, 8500],
  ]
  const FARXY = FAR.map(([, l, b, d]) => {
    const lr = (l * Math.PI) / 180
    const br = (b * Math.PI) / 180
    return [d * LY * Math.cos(br) * Math.sin(lr), -d * LY * Math.cos(br) * Math.cos(lr)] as const
  })
  // the solar neighbourhood: a few thousand stars
  const nHood = preview ? 1300 : 4200
  const HOOD = new Float64Array(nHood * 2)
  const HOODT = new Uint8Array(nHood)
  {
    // the spur runs at about 1.35 rad from the Sun–centre line (see the galaxy below)
    const da = Math.PI / 2 + 1.35
    for (let i = 0; i < nHood; i++) {
      if (rs() < 0.6) {
        const t = (rs() * 2 - 1) * 4200 * LY
        const g = Math.sqrt(-2 * Math.log(rs() || 1e-9)) * Math.cos(TAU * rs()) * 520 * LY
        HOOD[i * 2] = Math.cos(da) * t - Math.sin(da) * g
        HOOD[i * 2 + 1] = Math.sin(da) * t + Math.cos(da) * g
      } else {
        const rr = Math.sqrt(rs()) * 3200 * LY
        const an = rs() * TAU
        HOOD[i * 2] = Math.cos(an) * rr
        HOOD[i * 2 + 1] = Math.sin(an) * rr
      }
      HOODT[i] = rs() < 0.75 ? 0 : rs() < 0.7 ? 1 : 2
    }
  }
  // the Milky Way: two major arms and two minor ones, a bar, a bulge, a disk, the Orion spur
  const nGal = preview ? 4200 : 12000
  const GAL = new Float64Array(nGal * 2)
  {
    const pitch = (14 * Math.PI) / 180
    const kk = 1 / Math.tan(pitch)
    const sunTh = Math.PI / 2
    const gauss1 = () => Math.sqrt(-2 * Math.log(rs() || 1e-9)) * Math.cos(TAU * rs())
    let i = 0
    while (i < nGal) {
      const u = rs()
      let x = 0
      let y = 0
      if (u < 0.07) {
        // the bulge
        const rr = Math.abs(gauss1()) * 0.9 * KPC
        const an = rs() * TAU
        x = Math.cos(an) * rr
        y = Math.sin(an) * rr * 0.85
      } else if (u < 0.13) {
        // the bar, about 27° from the Sun–centre line
        const t = gauss1() * 1.9 * KPC
        const wv = gauss1() * 0.45 * KPC
        const ba = sunTh + 0.47
        x = Math.cos(ba) * t - Math.sin(ba) * wv
        y = Math.sin(ba) * t + Math.cos(ba) * wv
      } else if (u < 0.3) {
        // the disk between the arms
        const rr = -Math.log((rs() || 1e-9) * (rs() || 1e-9)) * 2.6 * KPC
        if (rr > 17 * KPC) continue
        const an = rs() * TAU
        x = Math.cos(an) * rr
        y = Math.sin(an) * rr
      } else if (u < 0.97) {
        // arms: 0 and 2 are the major ones (Scutum–Centaurus, Perseus), 1 and 3 minor
        const arm = rs() < 0.78 ? (rs() < 0.5 ? 0 : 2) : rs() < 0.5 ? 1 : 3
        const rr = (3.6 + Math.pow(rs(), 1.1) * 12) * KPC
        const th0 = sunTh + 0.42 + (arm * Math.PI) / 2
        const th = th0 + kk * Math.log(rr / (8.2 * KPC))
        const spread = gauss1() * (arm % 2 === 0 ? 0.42 : 0.3) * KPC * (0.7 + rr / (14 * KPC))
        x = Math.cos(th) * (rr + spread)
        y = Math.sin(th) * (rr + spread)
      } else {
        // the Orion spur, through the Sun
        const t = (rs() - 0.5) * 6 * KPC
        const sx = Math.cos(sunTh) * 8.2 * KPC
        const sy = Math.sin(sunTh) * 8.2 * KPC
        const da = sunTh + 1.35
        const g = gauss1() * 0.18 * KPC
        x = sx + Math.cos(da) * t - Math.sin(da) * g
        y = sy + Math.sin(da) * t + Math.cos(da) * g
      }
      GAL[i * 2] = x
      GAL[i * 2 + 1] = y
      i++
    }
  }
  // the Local Group, relative to the Milky Way’s centre (metres): name, x, y, size (ly), kind (0 spiral, 1 dwarf)
  const MLY = 1e6 * LY
  const LGAL: [string, number, number, number, number][] = [
    ['MILKY WAY', 0, 0, 100000, 0],
    ['ANDROMEDA', 0.6 * 2.54 * MLY, -0.8 * 2.54 * MLY, 160000, 0],
    ['TRIANGULUM', 0.6 * 2.54 * MLY + 0.62 * MLY, -0.8 * 2.54 * MLY + 0.5 * MLY, 60000, 0],
    ['LMC', 0.11 * MLY, 0.12 * MLY, 14000, 1],
    ['SMC', 0.16 * MLY, 0.12 * MLY, 7000, 1],
    ['M32', 0.6 * 2.54 * MLY + 0.03 * MLY, -0.8 * 2.54 * MLY + 0.02 * MLY, 6500, 1],
    ['M110', 0.6 * 2.54 * MLY - 0.04 * MLY, -0.8 * 2.54 * MLY - 0.03 * MLY, 16000, 1],
    ['NGC 6822', -1.3 * MLY, -0.9 * MLY, 7000, 1],
    ['IC 1613', 0.9 * MLY, -2.2 * MLY, 10000, 1],
    ['LEO I', -0.55 * MLY, 0.6 * MLY, 2000, 1],
    ['FORNAX', 0.3 * MLY, 0.35 * MLY, 3000, 1],
    ['SCULPTOR', -0.18 * MLY, 0.22 * MLY, 3000, 1],
    ['WLM', 2.0 * MLY, -2.0 * MLY, 8000, 1],
  ]
  // the cosmic web, about the Local Group: galaxies along filaments, near and far
  const nWeb = preview ? 3000 : 8000
  const WEB = new Float64Array(nWeb * 2)
  const nWeb2 = preview ? 3600 : 12000
  const WEB2 = new Float64Array(nWeb2 * 2)
  {
    const fill = (arr: Float64Array, n: number, rMax: number, lam: number, hole: number, knot: boolean) => {
      let i = 0
      let guard = 0
      while (i < n && guard < 400000) {
        guard++
        const rr = Math.sqrt(rs()) * rMax
        const an = rs() * TAU
        let x = Math.cos(an) * rr
        let y = Math.sin(an) * rr
        if (knot && i < n * 0.06) {
          // the Virgo cluster: a knot 54 million light-years away
          const g1 = Math.sqrt(-2 * Math.log(rs() || 1e-9)) * Math.cos(TAU * rs())
          const g2 = Math.sqrt(-2 * Math.log(rs() || 1e-9)) * Math.sin(TAU * rs())
          x = -0.55 * 54 * 1e6 * LY + g1 * 3.5e6 * LY
          y = -0.83 * 54 * 1e6 * LY + g2 * 3.5e6 * LY
        } else {
          const v = 1 - Math.abs(noise.n2(x / lam, y / lam))
          const v2 = 1 - Math.abs(noise.n2(x / (lam * 0.45) + 9, y / (lam * 0.45) - 4))
          const edge = Math.exp(-Math.pow(rr / (rMax * 0.8), 4))
          const inner = hole > 0 ? 1 - Math.exp(-Math.pow(rr / hole, 2)) : 1
          if (rs() > (Math.pow(v, 9) * 0.85 + Math.pow(v2, 12) * 0.35 + 0.015) * edge * inner) continue
        }
        arr[i * 2] = x
        arr[i * 2 + 1] = y
        i++
      }
    }
    fill(WEB, nWeb, 1.1e25, 1.1e24, 0, true)
    fill(WEB2, nWeb2, 1.5e26, 7e24, 9e24, false)
  }
  // the observable universe: statistically even at this scale
  const R_OBS = 46.5e9 * LY
  const nUni = preview ? 2400 : 7000
  const UNI = new Float64Array(nUni * 2)
  {
    let i = 0
    while (i < nUni) {
      const rr = Math.sqrt(rs()) * R_OBS * 0.995
      const an = rs() * TAU
      const x = Math.cos(an) * rr
      const y = Math.sin(an) * rr
      const v = 1 - Math.abs(noise.n2(x / 3e25 + 31, y / 3e25 - 7))
      if (rs() > 0.35 + 0.65 * Math.pow(v, 4)) continue
      UNI[i * 2] = x
      UNI[i * 2 + 1] = y
      i++
    }
  }
  const CMB = new Float32Array(360)
  for (let i = 0; i < 360; i++) CMB[i] = noise.fbm2(i * 0.11, 3.3, 3)

  /* -------------------------------------------- the microscopic layers */
  // a skin of cells: a jittered honeycomb about the point M (micrometres), built as a brick wall
  const CELL = 15
  const NUC_C = { x: -1.2, y: 0.8 } // the nucleus we enter, µm from M
  const BW = CELL * 0.5
  const BH = CELL * 0.86
  const jit = (i: number, j: number, s: number) => {
    const r = rng(((i * 73856093) ^ (j * 19349663) ^ s) >>> 0)
    return [(r() - 0.5) * 0.5, (r() - 0.5) * 0.3] as const
  }
  /** vertex (i, j) of the wall, µm, relative to M; brick (0, 0) is centred on the nucleus we enter */
  function hexVert(i: number, j: number) {
    const [jx, jy] = jit(i, j, 11)
    return [NUC_C.x + (i - 1 + jx) * BW, NUC_C.y + (j - 0.5 + jy) * BH] as const
  }
  // chromatin inside the nucleus: random walks (µm, relative to M)
  const CHROMA: number[][] = []
  {
    const r = rng(91)
    for (let c = 0; c < (preview ? 70 : 220); c++) {
      let x = NUC_C.x + (r() - 0.5) * 6
      let y = NUC_C.y + (r() - 0.5) * 6
      let an = r() * TAU
      const pts = [x, y]
      for (let k = 0; k < 110; k++) {
        an += (r() - 0.5) * 2.1
        x += Math.cos(an) * 0.05
        y += Math.sin(an) * 0.05
        const dx = x - NUC_C.x
        const dy = y - NUC_C.y
        if (dx * dx + dy * dy > 3.6 * 3.6) an += Math.PI * 0.8
        pts.push(x, y)
      }
      CHROMA.push(pts)
    }
  }
  // the carbon atom’s electrons, sampled from |ψ|² (picometres)
  const nE1 = preview ? 300 : 700
  const nE2 = preview ? 900 : 2200
  const ELEC = new Float32Array((nE1 + nE2) * 2)
  {
    const r = rng(6)
    const a0 = 52.92
    let i = 0
    // 1s, Z_eff ≈ 5.67: radial density r² e^(−2Zr/a0), a Gamma(3) variate
    for (let k = 0; k < nE1; k++) {
      const rr = (-a0 / (2 * 5.67)) * Math.log((r() || 1e-9) * (r() || 1e-9) * (r() || 1e-9))
      const ct = r() * 2 - 1
      const an = r() * TAU
      const st = Math.sqrt(1 - ct * ct)
      ELEC[i++] = rr * st * Math.cos(an)
      ELEC[i++] = rr * st * Math.sin(an)
    }
    // 2s and 2p, Z_eff ≈ 3.22
    for (let k = 0; k < nE2; k++) {
      const Z = 3.22
      if (k % 3 === 0) {
        // 2s: r² (2 − ρ)² e^(−ρ), by rejection
        let rho = 0
        for (;;) {
          rho = r() * 14
          const f = rho * rho * (2 - rho) * (2 - rho) * Math.exp(-rho)
          if (r() * 2.2 < f) break
        }
        const rr = (rho * a0) / Z
        const ct = r() * 2 - 1
        const an = r() * TAU
        const st = Math.sqrt(1 - ct * ct)
        ELEC[i++] = rr * st * Math.cos(an)
        ELEC[i++] = rr * st * Math.sin(an)
      } else {
        // 2p (x or y): ρ⁴ e^(−ρ) radially, cos² about its axis
        const rho = -Math.log((r() || 1e-9) * (r() || 1e-9) * (r() || 1e-9) * (r() || 1e-9) * (r() || 1e-9))
        const rr = (rho * a0) / Z
        let ct = 0
        for (;;) {
          ct = r() * 2 - 1
          if (r() < ct * ct) break
        }
        const an = r() * TAU
        const st = Math.sqrt(1 - ct * ct)
        const ax = ct
        const bx = st * Math.cos(an)
        if (k % 3 === 1) {
          ELEC[i++] = rr * ax
          ELEC[i++] = rr * bx
        } else {
          ELEC[i++] = rr * bx
          ELEC[i++] = rr * ax
        }
      }
    }
  }
  // the carbon-12 nucleus: twelve nucleons on an icosahedron (femtometres, 3D)
  const NUCL: { x: number; y: number; z: number; p: boolean }[] = []
  {
    const t = (1 + Math.sqrt(5)) / 2
    const v: [number, number, number][] = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ]
    const s = 1.62 / Math.hypot(1, t)
    const ry = 0.5
    const rx = 0.3
    v.forEach(([x, y, z], i) => {
      // tilt it so no two nucleons line up exactly
      const x1 = x * Math.cos(ry) + z * Math.sin(ry)
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry)
      const y2 = y * Math.cos(rx) - z1 * Math.sin(rx)
      const z2 = y * Math.sin(rx) + z1 * Math.cos(rx)
      NUCL.push({ x: x1 * s, y: y2 * s, z: z2 * s, p: [0, 3, 4, 7, 9, 10].includes(i) })
    })
    NUCL.sort((a, b) => a.z - b.z)
  }
  // we enter the front-most proton: it sits at M
  const FRONT = NUCL.filter((n) => n.p).reduce((a, b) => (b.z > a.z ? b : a))
  const NUC0 = { x: -FRONT.x, y: -FRONT.y } // the nucleus centre, fm from M

  /* ------------------------------------------------------- the camera */
  let E = 0
  let k = S0 // px per metre
  const cam = { x: 0, y: 0 } // plan metres, macro frame
  const camM = { x: 0, y: 0 } // camera − M (metres), for the microscopic layers
  function setCamera(e: number) {
    E = clamp(e, E_MIN, E_MAX)
    k = S0 / p10(E)
    const c1 = smoothstep(10.55, 11.55, E)
    const c2 = smoothstep(19.75, 20.85, E)
    const c3 = smoothstep(22.35, 23.25, E)
    const c4 = smoothstep(24.8, 25.9, E)
    // at the human scale the camera sits between the two hands; below it, on the fingertip
    const wq = smoothstep(-1.5, -0.9, E) * (1 - smoothstep(0.5, 1.4, E))
    const wm = 1 - smoothstep(-1.75, -0.95, E)
    const hx = lerp(Q.x * wq, M.x, wm)
    const hy = lerp(Q.y * wq, M.y, wm)
    cam.x = (1 - c4) * (SUN.x * c1 + GC.x * c2 + LG.x * c3) + hx
    cam.y = (1 - c4) * (SUN.y * c1 + GC.y * c2 + LG.y * c3) + hy
    camM.x = (wm - 1) * M.x + (1 - wm) * Q.x * wq
    camM.y = (wm - 1) * M.y + (1 - wm) * Q.y * wq
  }
  /** visibility of a layer that lives between exponents lo and hi */
  const vis = (lo: number, hi: number, f = 0.5) => smoothstep(lo, lo + f, E) * (1 - smoothstep(hi - f, hi, E))
  // the screen position of a point given as (anchor − camera) + local, all in metres
  let ox = 0
  let oy = 0
  function origin(ax: number, ay: number) {
    ox = zx + (ax - cam.x) * k
    oy = zy + (ay - cam.y) * k
  }
  function originM() {
    ox = zx - camM.x * k
    oy = zy - camM.y * k
  }

  /* -------------------------------------------------------- drawing */
  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    const lw = ctx.lineWidth
    const ss = ctx.strokeStyle
    setFont(ctx, o)
    ctx.lineWidth = o?.font === 'serif' ? 6 : 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(243,246,242,0.92)'
    ctx.strokeText(o?.upper ? str.toUpperCase() : str, x, y)
    ctx.lineJoin = 'miter'
    text(ctx, str, x, y, o)
    ctx.lineWidth = lw
    ctx.strokeStyle = ss
  }

  function dots(arr: Float64Array | Float32Array, n: number, sc: number, r: number, color: string, alpha: number, every = 1) {
    if (alpha <= 0.01) return
    ctx.fillStyle = color
    ctx.globalAlpha = alpha
    ctx.beginPath()
    const pad2 = 4
    for (let i = 0; i < n; i += every) {
      const X = ox + arr[i * 2] * sc
      const Y = oy + arr[i * 2 + 1] * sc
      if (X < -pad2 || X > w + pad2 || Y < -pad2 || Y > h + pad2) continue
      ctx.rect(X - r, Y - r, r * 2, r * 2)
    }
    ctx.fill()
    ctx.globalAlpha = 1
  }

  function circ(x: number, y: number, r: number) {
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, Math.max(0.01, r), 0, TAU)
  }

  /* 10⁻¹⁵: inside a proton */
  function drawProton(a: number) {
    if (a <= 0.01) return
    originM()
    const s = k * 1e-15
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = INK
    ctx.lineWidth = 1
    ctx.beginPath()
    circ(ox, oy, 0.84 * s)
    ctx.stroke()
    // its field, as faint contours
    ctx.strokeStyle = rgba(C.ocean, 0.35)
    ctx.beginPath()
    for (const q of [0.25, 0.45, 0.65]) circ(ox, oy, 0.84 * s * q)
    ctx.stroke()
    // three valence quarks and the gluon strings between them
    const qs = [
      [0.32, -0.12, 'u'],
      [-0.2, -0.24, 'u'],
      [-0.06, 0.3, 'd'],
    ] as const
    ctx.strokeStyle = rgba(C.moss, 0.85)
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      const [x1, y1] = qs[i]
      const [x2, y2] = qs[(i + 1) % 3]
      const n = 22
      for (let j = 0; j <= n; j++) {
        const t = j / n
        const px = lerp(x1, x2, t) * s
        const py = lerp(y1, y2, t) * s
        const nx = -(y2 - y1)
        const ny = x2 - x1
        const l = Math.hypot(nx, ny) || 1
        const wv = Math.sin(t * Math.PI * 12) * 0.025 * s * Math.sin(t * Math.PI)
        const X = ox + px + (nx / l) * wv
        const Y = oy + py + (ny / l) * wv
        if (j === 0) ctx.moveTo(X, Y)
        else ctx.lineTo(X, Y)
      }
    }
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.beginPath()
    for (const [x, y] of qs) circ(ox + x * s, oy + y * s, Math.max(2, 0.035 * s))
    ctx.fill()
    if (!tiny && s > 120) for (const [x, y, nm] of qs) halo(nm, ox + x * s + 7, oy + y * s - 6, { font: 'serif', size: clamp(s * 0.05, 12, 22), italic: true, color: INK })
    ctx.restore()
  }

  /* 10⁻¹⁴: the carbon nucleus */
  function drawNucleus(a: number) {
    if (a <= 0.01) return
    originM()
    const s = k * 1e-15
    const cx = ox + NUC0.x * s
    const cy = oy + NUC0.y * s
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    for (const n of NUCL) {
      const X = cx + n.x * s
      const Y = cy + n.y * s
      const R = 0.84 * s
      ctx.fillStyle = PAPER
      ctx.beginPath()
      circ(X, Y, R)
      ctx.fill()
      ctx.strokeStyle = n === FRONT ? INK : rgba(INK, 0.4 + 0.3 * (n.z / 2 + 0.5))
      ctx.stroke()
      if (n.p && R > 4 && R < 160) {
        ctx.save()
        ctx.beginPath()
        circ(X, Y, R * 0.98)
        ctx.strokeStyle = rgba(C.ocean, 0.32)
        hatch(ctx, X - R, Y - R, R * 2, R * 2, Math.max(2.5, R * 0.16), -Math.PI / 4, true)
        ctx.restore()
      }
    }
    if (!tiny && s * 5 > 90 && a > 0.3) {
      halo('PROTON', cx + 2.6 * s, cy - 1.9 * s, { size: 9, color: C.ocean, tracking: 0.14 })
      halo('NEUTRON', cx - 2.7 * s, cy + 2.6 * s, { size: 9, color: INK2, tracking: 0.14, align: 'right' })
    }
    ctx.restore()
  }

  /* 10⁻¹¹ – 10⁻¹⁰: the carbon atom */
  function drawAtom(a: number) {
    if (a <= 0.01) return
    originM()
    const s = k * 1e-12 // px per pm
    // the nucleus, a point (sub-pixel for most of this range)
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = INK
    ctx.beginPath()
    circ(ox, oy, Math.max(1.3, 2.7e-3 * s))
    ctx.fill()
    ctx.restore()
    const r = clamp(s * 0.55, 0.5, 1.3)
    dots(ELEC, nE1, s, r, INK, a * 0.8)
    // the outer cloud, with the 1s skipped
    ctx.fillStyle = INK
    ctx.globalAlpha = a * 0.55
    ctx.beginPath()
    for (let i = nE1; i < nE1 + nE2; i++) {
      const X = ox + ELEC[i * 2] * s
      const Y = oy + ELEC[i * 2 + 1] * s
      if (X < -2 || X > w + 2 || Y < -2 || Y > h + 2) continue
      ctx.rect(X - r, Y - r, r * 2, r * 2)
    }
    ctx.fill()
    ctx.globalAlpha = 1
  }

  /* 10⁻⁹: the double helix */
  function drawDNA(a: number) {
    if (a <= 0.01) return
    originM()
    const s = k * 1e-9 // px per nm
    const R = 1
    const P = 3.4
    const x0 = Math.max(-90, (-ox - 20) / s)
    const x1 = Math.min(90, (w - ox + 20) / s)
    if (x1 <= x0) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const step = Math.max(0.02, 2 / s)
    for (const ph of [0, 2.25]) {
      ctx.strokeStyle = ph === 0 ? INK : INK2
      ctx.beginPath()
      let first = true
      for (let x = x0; x <= x1; x += step) {
        const y = R * Math.sin((TAU * x) / P + ph)
        if (first) ctx.moveTo(ox + x * s, oy + y * s)
        else ctx.lineTo(ox + x * s, oy + y * s)
        first = false
      }
      ctx.stroke()
    }
    // base pairs, every 0.34 nm
    if (s > 9) {
      ctx.strokeStyle = rgba(C.moss, 0.6)
      ctx.beginPath()
      for (let j = Math.ceil(x0 / 0.34); j * 0.34 < x1; j++) {
        const x = j * 0.34
        const y1 = R * Math.sin((TAU * x) / P)
        const y2 = R * Math.sin((TAU * x) / P + 2.25)
        ctx.moveTo(ox + x * s, oy + y1 * s)
        ctx.lineTo(ox + x * s, oy + y2 * s)
      }
      ctx.stroke()
    }
    // the backbone's atoms, one of which we will enter
    if (s > 60) {
      ctx.strokeStyle = rgba(INK, 0.8)
      ctx.beginPath()
      for (let j = Math.ceil(x0 / 0.34); j * 0.34 < x1; j++) {
        const x = j * 0.34
        circ(ox + x * s, oy + R * Math.sin((TAU * x) / P) * s, Math.min(0.07 * s, 26))
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /* 10⁻⁸ – 10⁻⁷: beads on a string */
  function chromPath(sn: number) {
    // the fibre's centreline (nm), straight through M, meandering away from it
    const m = smoothstep(14, 70, Math.abs(sn))
    return [sn, 46 * noise.n2(sn / 140, 2.2) * m]
  }
  function drawBeads(a: number) {
    if (a <= 0.01) return
    originM()
    const s = k * 1e-9
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = INK
    ctx.beginPath()
    const span = Math.min(900, Math.max(w, h) / s + 40)
    for (let sn = -span; sn <= span; sn += Math.max(0.5, 2 / s)) {
      const [x, y] = chromPath(sn)
      if (sn === -span) ctx.moveTo(ox + x * s, oy + y * s)
      else ctx.lineTo(ox + x * s, oy + y * s)
    }
    ctx.stroke()
    // nucleosomes: histone discs every ~20 nm, DNA wrapped 1.65 turns
    ctx.beginPath()
    for (let j = -Math.ceil(span / 17); j <= Math.ceil(span / 17); j++) {
      if (j === 0) continue
      const sn = j * 17 + (j > 0 ? 2 : -2)
      const [x, y] = chromPath(sn)
      const X = ox + x * s
      const Y = oy + y * s
      if (X < -40 || X > w + 40 || Y < -40 || Y > h + 40) continue
      ctx.fillStyle = PAPER
      ctx.moveTo(X + 5.5 * s, Y)
      ctx.arc(X, Y, 5.5 * s, 0, TAU)
    }
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = rgba(C.moss, 0.7)
    ctx.beginPath()
    for (let j = -Math.ceil(span / 17); j <= Math.ceil(span / 17); j++) {
      if (j === 0) continue
      const sn = j * 17 + (j > 0 ? 2 : -2)
      const [x, y] = chromPath(sn)
      const X = ox + x * s
      const Y = oy + y * s
      if (X < -40 || X > w + 40 || Y < -40 || Y > h + 40) continue
      ctx.moveTo(X + 4.4 * s, Y)
      ctx.ellipse(X, Y, 4.4 * s, 3.2 * s, 0.6, 0, TAU)
    }
    ctx.stroke()
    ctx.restore()
  }

  /* 10⁻⁷ – 10⁻⁶: the cell nucleus */
  function drawCellNucleus(a: number) {
    if (a <= 0.01) return
    originM()
    const s = k * 1e-6 // px per µm
    const cx = ox + NUC_C.x * s
    const cy = oy + NUC_C.y * s
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // a double membrane with pores
    ctx.strokeStyle = INK
    for (const rr of [4, 4.03]) {
      ctx.beginPath()
      for (let g = 0; g < 48; g++) {
        const a0 = (g / 48) * TAU + 0.02
        const a1 = ((g + 0.82) / 48) * TAU
        ctx.moveTo(cx + Math.cos(a0) * rr * s, cy + Math.sin(a0) * rr * s)
        ctx.arc(cx, cy, rr * s, a0, a1)
      }
      ctx.stroke()
    }
    // the nucleolus
    ctx.beginPath()
    circ(cx + 1.2 * s, cy - 1.0 * s, 1.05 * s)
    ctx.strokeStyle = INK2
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.25)
    ctx.beginPath()
    circ(cx + 1.2 * s, cy - 1.0 * s, 1.03 * s)
    hatch(ctx, cx + 0.1 * s, cy - 2.1 * s, 2.2 * s, 2.2 * s, Math.max(2.5, s * 0.12), -Math.PI / 4, true)
    // chromatin, inside the envelope
    ctx.beginPath()
    circ(cx, cy, 3.95 * s)
    ctx.clip()
    ctx.strokeStyle = rgba(C.moss, 0.42)
    ctx.beginPath()
    for (const pts of CHROMA) {
      ctx.moveTo(ox + pts[0] * s, oy + pts[1] * s)
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(ox + pts[i] * s, oy + pts[i + 1] * s)
    }
    ctx.stroke()
    ctx.restore()
  }

  /* 10⁻⁵ – 10⁻⁴: cells of the skin */
  function drawCells(a: number) {
    if (a <= 0.01) return
    originM()
    const sc = k * 1e-6
    if (BW * sc < 2) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = INK2
    const iMin = Math.floor((-ox / sc - NUC_C.x) / BW) - 2
    const iMax = Math.ceil(((w - ox) / sc - NUC_C.x) / BW) + 2
    const jMin = Math.floor((-oy / sc - NUC_C.y) / BH) - 2
    const jMax = Math.ceil(((h - oy) / sc - NUC_C.y) / BH) + 2
    if ((iMax - iMin) * (jMax - jMin) > 9000) {
      ctx.restore()
      return
    }
    ctx.beginPath()
    for (let j = jMin; j <= jMax; j++)
      for (let i = iMin; i <= iMax; i++) {
        const [x, y] = hexVert(i, j)
        const [x2, y2] = hexVert(i + 1, j)
        ctx.moveTo(ox + x * sc, oy + y * sc)
        ctx.lineTo(ox + x2 * sc, oy + y2 * sc)
        // a wall between bricks on alternate vertices
        if ((((i + j) % 2) + 2) % 2 === 0) {
          const [x3, y3] = hexVert(i, j + 1)
          ctx.moveTo(ox + x * sc, oy + y * sc)
          ctx.lineTo(ox + x3 * sc, oy + y3 * sc)
        }
      }
    ctx.stroke()
    // a nucleus in every cell; the one we enter is exactly where the next layer draws it
    if (sc > 0.6) {
      ctx.strokeStyle = rgba(INK, 0.7)
      ctx.beginPath()
      for (let j = jMin; j <= jMax; j++)
        for (let i = iMin; i <= iMax; i++) {
          if ((((i + j) % 2) + 2) % 2 !== 0) continue
          if (i === 0 && j === 0) continue
          const [x, y] = hexVert(i, j)
          const [x2] = hexVert(i + 2, j)
          const [, y3] = hexVert(i, j + 1)
          const [jx, jy] = jit(i, j, 5)
          circ(ox + ((x + x2) / 2 + jx * 3) * sc, oy + ((y + y3) / 2 + jy * 3) * sc, 3.3 * sc)
        }
      circ(ox + NUC_C.x * sc, oy + NUC_C.y * sc, 4 * sc)
      ctx.stroke()
    }
    ctx.restore()
  }

  /* 10⁻³ – 10⁻²: the fingerprint */
  // the whorl's core, metres from M, a little toward the tip
  const CORE = { x: FD.x * 0.8e-3, y: FD.y * 0.8e-3 }
  function ridgePt(cx: number, cy: number, q: number, th: number, spacing: number, sc: number) {
    const wob = 1 + 0.07 * Math.sin(2 * th + q * 0.21) + 0.03 * noise.n2(Math.cos(th) * 2 + q * 0.13, Math.sin(th) * 2)
    const rr = (q * spacing + 0.15 * spacing * Math.sin(th * 3 + q)) * wob
    const g = Math.cos(th) * rr // across the finger
    const f = Math.sin(th) * rr * 1.3 // along it
    P2.x = cx + (g * GD.x + f * FD.x) * sc
    P2.y = cy + (g * GD.y + f * FD.y) * sc
  }
  const P2 = { x: 0, y: 0 }
  function drawRidges(a: number) {
    if (a <= 0.01) return
    originM()
    const sc = k
    const spacing = 0.47e-3
    if (spacing * sc < 2.2) return
    ctx.save()
    ctx.globalAlpha = a
    // the pad of the finger, as a clip
    ctx.beginPath()
    ctx.ellipse(ox + FD.x * 1e-3 * sc, oy + FD.y * 1e-3 * sc, 10.5e-3 * sc, 7.6e-3 * sc, IDX_ROT, 0, TAU)
    ctx.clip()
    ctx.strokeStyle = rgba(INK, 0.75)
    ctx.lineWidth = 1
    ctx.beginPath()
    const cx = ox + CORE.x * sc
    const cy = oy + CORE.y * sc
    const n = Math.min(26, Math.ceil(Math.hypot(w, h) / sc / spacing) + 2)
    for (let q = 1; q <= n; q++) {
      const steps = Math.min(160, 24 + q * 6)
      for (let i = 0; i <= steps; i++) {
        ridgePt(cx, cy, q, (i / steps) * TAU, spacing, sc)
        if (i === 0) ctx.moveTo(P2.x, P2.y)
        else ctx.lineTo(P2.x, P2.y)
      }
    }
    ctx.stroke()
    // sweat pores along the ridges
    if (spacing * sc > 26) {
      ctx.strokeStyle = rgba(INK, 0.6)
      ctx.beginPath()
      for (let q = 1; q <= n; q++) {
        const m = Math.max(6, Math.round((TAU * q * spacing) / 0.5e-3))
        for (let i = 0; i < m; i++) {
          ridgePt(cx, cy, q, (i / m) * TAU + q * 0.37, spacing, sc)
          if (P2.x < -10 || P2.x > w + 10 || P2.y < -10 || P2.y > h + 10) continue
          circ(P2.x, P2.y, 0.045e-3 * sc)
        }
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /* 10⁻² – 10⁰: the hands */
  function strokeHand(mirror: boolean, detail: number) {
    ctx.beginPath()
    for (let i = 0; i < handPts.length; i += 2) {
      let x = handX(handPts[i], handPts[i + 1])
      let y = handY(handPts[i], handPts[i + 1])
      if (mirror) {
        const mx = mirX(x, y)
        y = mirY(x, y)
        x = mx
      }
      const X = ox + x * k
      const Y = oy + y * k
      if (i === 0) ctx.moveTo(X, Y)
      else ctx.lineTo(X, Y)
    }
    ctx.stroke()
    if (detail <= 0) return
    ctx.save()
    ctx.globalAlpha *= detail
    ctx.strokeStyle = INK2
    ctx.beginPath()
    for (const c of handCreases) {
      for (let i = 0; i < c.length; i += 2) {
        let x = handX(c[i], c[i + 1])
        let y = handY(c[i], c[i + 1])
        if (mirror) {
          const mx = mirX(x, y)
          y = mirY(x, y)
          x = mx
        }
        if (i === 0) ctx.moveTo(ox + x * k, oy + y * k)
        else ctx.lineTo(ox + x * k, oy + y * k)
      }
    }
    ctx.stroke()
    ctx.restore()
  }
  function drawHands(a: number) {
    if (a <= 0.01) return
    origin(0, 0)
    const handPx = 0.2 * k
    if (handPx < 3) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = handPx > 2000 ? 1.4 : 1
    ctx.strokeStyle = INK
    const detail = smoothstep(40, 110, handPx) * (1 - smoothstep(3000, 9000, handPx))
    strokeHand(false, detail)
    ctx.strokeStyle = INK2
    strokeHand(true, detail * 0.8)
    // the arms, out to the shoulders: a forearm tapering to the wrist, an elbow, an upper arm
    for (const mirror of [false, true]) {
      ctx.strokeStyle = mirror ? INK2 : INK
      ctx.beginPath()
      for (const side of [-1, 1]) {
        const pts: [number, number][] = [
          [side < 0 ? -3.75 : 3.45, -7.2],
          [side * 3.6, -14],
          [side * 4.3, -26],
          [side * 4.6, -31],
          [side * 5.0, -45],
          [side * 5.6, -56],
        ]
        pts.forEach(([hx, hy], i) => {
          let x = handX(hx, hy)
          let y = handY(hx, hy)
          if (mirror) {
            const a1 = mirX(x, y)
            y = mirY(x, y)
            x = a1
          }
          if (i === 0) ctx.moveTo(ox + x * k, oy + y * k)
          else ctx.lineTo(ox + x * k, oy + y * k)
        })
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /* 10⁰ – 10²: two people on a blanket in the grass */
  function figurePath(mirror: boolean) {
    // a plan-view scale figure lying on its back, right arm out to the hand
    const wr = { x: handX(0, -7.2), y: handY(0, -7.2) }
    const shoulder = { x: wr.x - ARM.x * 0.56, y: wr.y - ARM.y * 0.56 }
    const b = { x: ARM.y, y: -ARM.x } // toward the head
    const pts: [number, number, number][] = [] // x, y, radius of capsule circles
    const P = (u: number, v: number) => [shoulder.x - ARM.x * u + b.x * v, shoulder.y - ARM.y * u + b.y * v] as const
    // head, torso, hips, legs, other arm
    const segs: [number, number, number, number, number][] = [
      [0.21, 0.24, 0.21, 0.24, 0.1],
      [0.04, 0, 0.38, 0, 0.065],
      [0.21, 0.02, 0.21, -0.5, 0.17],
      [0.12, -0.55, 0.1, -1.38, 0.07],
      [0.3, -0.55, 0.33, -1.38, 0.07],
      [0.42, -0.02, 0.5, -0.6, 0.05],
      [0.0, 0.0, -0.05, 0.0, 0.055],
    ]
    for (const [u1, v1, u2, v2, rr] of segs) {
      const [x1, y1] = P(u1, v1)
      const [x2, y2] = P(u2, v2)
      pts.push([x1, y1, rr], [x2, y2, rr])
    }
    if (mirror)
      for (const p of pts) {
        const mx = mirX(p[0], p[1])
        p[1] = mirY(p[0], p[1])
        p[0] = mx
      }
    return pts
  }
  const FIG_A = figurePath(false)
  const FIG_B = figurePath(true)
  function drawLawn(a: number) {
    if (a <= 0.01) return
    origin(0, 0)
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // the blanket: a check, hatched
    const q = { x: ARM.x * MIRROR, y: ARM.y * MIRROR }
    const b = { x: ARM.y, y: -ARM.x }
    const corner = (u: number, v: number) => [ox + (q.x + ARM.x * u + b.x * v) * k, oy + (q.y + ARM.y * u + b.y * v) * k] as const
    const bl = 1.25
    const v0 = -1.55
    const v1 = 0.62
    ctx.strokeStyle = rgba(INK, 0.55)
    ctx.beginPath()
    const c1 = corner(-bl, v0)
    const c2 = corner(bl, v0)
    const c3 = corner(bl, v1)
    const c4 = corner(-bl, v1)
    ctx.moveTo(c1[0], c1[1])
    ctx.lineTo(c2[0], c2[1])
    ctx.lineTo(c3[0], c3[1])
    ctx.lineTo(c4[0], c4[1])
    ctx.closePath()
    ctx.stroke()
    if (0.12 * k > 5) {
      ctx.strokeStyle = rgba(C.ocean, 0.16)
      ctx.beginPath()
      for (let u = -bl + 0.125; u < bl; u += 0.125) {
        const p1 = corner(u, v0)
        const p2 = corner(u, v1)
        ctx.moveTo(p1[0], p1[1])
        ctx.lineTo(p2[0], p2[1])
      }
      for (let v = v0 + 0.125; v < v1; v += 0.125) {
        const p1 = corner(-bl, v)
        const p2 = corner(bl, v)
        ctx.moveTo(p1[0], p1[1])
        ctx.lineTo(p2[0], p2[1])
      }
      ctx.stroke()
    }
    // the two figures, as linked capsules (the outstretched arms belong to the hands)
    ctx.globalAlpha = a * smoothstep(0.15, 0.7, E)
    for (const [fig, col] of [
      [FIG_A, INK],
      [FIG_B, INK2],
    ] as const) {
      ctx.strokeStyle = col
      ctx.fillStyle = PAPER
      for (let i = 0; i < fig.length; i += 2) {
        const [x1, y1, ra] = fig[i]
        const [x2, y2, rb] = fig[i + 1]
        const X1 = ox + x1 * k
        const Y1 = oy + y1 * k
        const X2 = ox + x2 * k
        const Y2 = oy + y2 * k
        const an = Math.atan2(Y2 - Y1, X2 - X1)
        const nx = -Math.sin(an)
        const ny = Math.cos(an)
        ctx.beginPath()
        ctx.moveTo(X1 + nx * ra * k, Y1 + ny * ra * k)
        ctx.lineTo(X2 + nx * rb * k, Y2 + ny * rb * k)
        ctx.arc(X2, Y2, rb * k, an + Math.PI / 2, an - Math.PI / 2, true)
        ctx.lineTo(X1 - nx * ra * k, Y1 - ny * ra * k)
        ctx.arc(X1, Y1, ra * k, an - Math.PI / 2, an + Math.PI / 2, true)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
    ctx.globalAlpha = a
    // grass
    const tuft = 0.045 * k
    if (tuft > 0.9) {
      ctx.strokeStyle = rgba(C.moss, 0.55 * clamp((tuft - 0.9) / 2))
      ctx.beginPath()
      const every = tuft < 2 ? 3 : 1
      for (let i = 0; i < TUFTS.length; i += 2 * every) {
        const x = TUFTS[i]
        const y = TUFTS[i + 1]
        // not on the blanket
        const du = (x - q.x) * ARM.x + (y - q.y) * ARM.y
        const dv = (x - q.x) * b.x + (y - q.y) * b.y
        if (Math.abs(du) < bl + 0.05 && dv > v0 - 0.05 && dv < v1 + 0.05) continue
        const X = ox + x * k
        const Y = oy + y * k
        if (X < -10 || X > w + 10 || Y < -10 || Y > h + 10) continue
        ctx.moveTo(X - tuft * 0.5, Y + tuft * 0.3)
        ctx.lineTo(X - tuft * 0.15, Y - tuft * 0.5)
        ctx.moveTo(X, Y + tuft * 0.3)
        ctx.lineTo(X + tuft * 0.05, Y - tuft * 0.7)
        ctx.moveTo(X + tuft * 0.45, Y + tuft * 0.3)
        ctx.lineTo(X + tuft * 0.25, Y - tuft * 0.45)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /* 10² – 10³: the park */
  function drawPark(a: number) {
    if (a <= 0.01) return
    origin(0, 0)
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // the park's edge
    ctx.strokeStyle = INK2
    ctx.strokeRect(ox - 350 * k, oy - 215 * k, 700 * k, 430 * k)
    // paths: two crossing curves, as double lines
    ctx.strokeStyle = rgba(INK, 0.5)
    for (const off of [-1.6, 1.6]) {
      ctx.beginPath()
      for (let x = -350; x <= 350; x += 6) {
        const y = 40 * Math.sin(x / 90) + off
        if (x === -350) ctx.moveTo(ox + x * k, oy + y * k)
        else ctx.lineTo(ox + x * k, oy + y * k)
      }
      for (let y = -215; y <= 215; y += 6) {
        const x = 120 + 30 * Math.sin(y / 60) + off
        if (y === -215) ctx.moveTo(ox + x * k, oy + y * k)
        else ctx.lineTo(ox + x * k, oy + y * k)
      }
      ctx.stroke()
    }
    // a pond
    ctx.strokeStyle = rgba(C.ocean, 0.8)
    ctx.beginPath()
    for (let i = 0; i <= 60; i++) {
      const th = (i / 60) * TAU
      const rr = 52 * (1 + 0.22 * Math.sin(th * 3 + 1) + 0.1 * Math.sin(th * 5))
      const X = ox + (-190 + Math.cos(th) * rr * 1.4) * k
      const Y = oy + (95 + Math.sin(th) * rr) * k
      if (i === 0) ctx.moveTo(X, Y)
      else ctx.lineTo(X, Y)
    }
    ctx.stroke()
    if (6 * k > 2) {
      ctx.strokeStyle = rgba(C.ocean, 0.25)
      ctx.save()
      ctx.beginPath()
      for (let i = 0; i <= 60; i++) {
        const th = (i / 60) * TAU
        const rr = 52 * (1 + 0.22 * Math.sin(th * 3 + 1) + 0.1 * Math.sin(th * 5))
        const X = ox + (-190 + Math.cos(th) * rr * 1.4) * k
        const Y = oy + (95 + Math.sin(th) * rr) * k
        if (i === 0) ctx.moveTo(X, Y)
        else ctx.lineTo(X, Y)
      }
      hatch(ctx, ox - 270 * k, oy + 30 * k, 160 * k, 130 * k, Math.max(3, 6 * k), 0, true)
      ctx.restore()
    }
    // trees: canopies with a ring
    ctx.strokeStyle = rgba(C.moss, 0.75)
    ctx.beginPath()
    for (const [x, y, r] of TREES) {
      const X = ox + x * k
      const Y = oy + y * k
      if (X < -40 || X > w + 40 || Y < -40 || Y > h + 40) continue
      circ(X, Y, r * k)
      if (r * k > 6) circ(X, Y, r * k * 0.55)
    }
    ctx.stroke()
    ctx.restore()
  }

  /* 10³ – 10⁵: the city, on land */
  function drawCity(a: number) {
    if (a <= 0.01) return
    origin(0, 0)
    sampleLand()
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const fadeMinor = smoothstep(4, 9, 100 * k)
    // the part of the city on screen (metres)
    const xa = Math.max(-9000, Math.floor((-ox / k) / 100) * 100 - 100)
    const xb = Math.min(9000, Math.ceil(((w - ox) / k) / 100) * 100 + 100)
    const ya = Math.max(-9000, Math.floor((-oy / k) / 100) * 100 - 100)
    const yb = Math.min(9000, Math.ceil(((h - oy) / k) / 100) * 100 + 100)
    const inPark = (x: number, y: number) => Math.abs(x) < 350 && Math.abs(y) < 215
    const dry = (x: number, y: number) => {
      if (Math.hypot(x, y) > 8800 * (0.62 + 0.38 * (0.5 + 0.5 * noise.n2(x / 2600, y / 2600)))) return false
      // keep clear of the river
      const rx = 1500 + 600 * Math.sin(y / 1800) + 220 * Math.sin(y / 530)
      if (Math.abs(x - rx) < 60) return false
      return landScreen(ox + x * k, oy + y * k) > 0.015
    }
    for (const major of [false, true]) {
      if (!major && fadeMinor <= 0.01) continue
      ctx.strokeStyle = major ? rgba(INK, 0.6) : rgba(INK, 0.32 * fadeMinor)
      ctx.beginPath()
      const stepM = major ? 400 : 100
      for (let gx = Math.ceil(xa / stepM) * stepM; gx <= xb; gx += stepM) {
        if (!major && gx % 400 === 0) continue
        for (let gy = Math.floor(ya / 100) * 100; gy < yb; gy += 100) {
          const my2 = gy + 50
          if (inPark(gx, my2) || !dry(gx, my2)) continue
          ctx.moveTo(ox + gx * k, oy + gy * k)
          ctx.lineTo(ox + gx * k, oy + (gy + 100) * k)
        }
      }
      for (let gy = Math.ceil(ya / stepM) * stepM; gy <= yb; gy += stepM) {
        if (!major && gy % 400 === 0) continue
        for (let gx = Math.floor(xa / 100) * 100; gx < xb; gx += 100) {
          const mx2 = gx + 50
          if (inPark(mx2, gy) || !dry(mx2, gy)) continue
          ctx.moveTo(ox + gx * k, oy + gy * k)
          ctx.lineTo(ox + (gx + 100) * k, oy + gy * k)
        }
      }
      ctx.stroke()
    }
    // the park, as a block
    ctx.strokeStyle = rgba(C.moss, 0.8)
    ctx.strokeRect(ox - 350 * k, oy - 215 * k, 700 * k, 430 * k)
    if (700 * k > 20) {
      ctx.strokeStyle = rgba(C.moss, 0.3)
      hatch(ctx, ox - 350 * k, oy - 215 * k, 700 * k, 430 * k, 3, Math.PI / 4)
    }
    // a river, crossing the city to the sea
    ctx.strokeStyle = rgba(C.ocean, 0.85)
    for (const off of [-45, 45]) {
      ctx.beginPath()
      let pen = false
      for (let y = -9000; y <= 9000; y += 100) {
        const x = 1500 + 600 * Math.sin(y / 1800) + 220 * Math.sin(y / 530) + off
        const X = ox + x * k
        const Y = oy + y * k
        if (landScreen(X, Y) < -0.02) {
          pen = false
          continue
        }
        if (pen) ctx.lineTo(X, Y)
        else ctx.moveTo(X, Y)
        pen = true
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /** land height at a plan point (metres from the hand), with the current octave weights */
  function landAtPlan(x: number, y: number) {
    const rr = x * x + y * y
    if (rr >= R_E * R_E) return -1
    const zc = Math.sqrt(R_E * R_E - rr)
    const px = (x * EE.x - y * EN.x + zc * A.x) / R_E
    const py = (x * EE.y - y * EN.y + zc * A.y) / R_E
    const pz = (x * EE.z - y * EN.z + zc * A.z) / R_E
    return land(px, py, pz)
  }

  /* 10⁴ – 10⁸: coast, continent and globe */
  // a coarse sample of the land over the screen, refined only where the coast might run
  const CG = preview ? 30 : 24
  let cgx = 0
  let cgy = 0
  let cnx = 0
  let cny = 0
  let coarse: Float32Array = new Float32Array(0)
  let landMargin = 0
  let sampledKey = ''
  function sampleLand() {
    const g = preview ? 10 : 8
    const key = `${E},${w},${h},${ox},${oy}`
    if (key === sampledKey) return g
    sampledKey = key
    const mPerNode = g / k
    let fine = 0
    for (let o = 0; o < NO; o++) {
      const lam = R_E / LFQ[o]
      WT[o] = smoothstep(2.8 * mPerNode, 5.6 * mPerNode, lam)
      // octaves whose wavelength is under ~three coarse cells can hide inside one
      if (lam < (3 * CG) / k) fine += WT[o] * LAM[o]
    }
    landMargin = fine * 0.9 + 0.03
    const Rp = R_E * k
    cgx = Math.max(-CG, Math.floor((ox - Rp) / CG) * CG)
    cgy = Math.max(-CG, Math.floor((oy - Rp) / CG) * CG)
    const ex = Math.min(w + CG, ox + Rp + CG)
    const ey = Math.min(h + CG, oy + Rp + CG)
    cnx = Math.max(0, Math.ceil((ex - cgx) / CG) + 1)
    cny = Math.max(0, Math.ceil((ey - cgy) / CG) + 1)
    if (coarse.length < cnx * cny) coarse = new Float32Array(cnx * cny)
    for (let j = 0; j < cny; j++)
      for (let i = 0; i < cnx; i++) coarse[j * cnx + i] = landAtPlan((cgx + i * CG - ox) / k, (cgy + j * CG - oy) / k)
    return g
  }
  /** land at a screen point, from the coarse sample */
  function landScreen(X: number, Y: number) {
    const fx = (X - cgx) / CG
    const fy = (Y - cgy) / CG
    const i = Math.floor(fx)
    const j = Math.floor(fy)
    if (i < 0 || j < 0 || i >= cnx - 1 || j >= cny - 1) return -1
    const u = fx - i
    const v = fy - j
    const a0 = coarse[j * cnx + i]
    const a1 = coarse[j * cnx + i + 1]
    const a2 = coarse[(j + 1) * cnx + i + 1]
    const a3 = coarse[(j + 1) * cnx + i]
    return lerp(lerp(a0, a1, u), lerp(a3, a2, u), v)
  }
  const SUB = new Float32Array(64)
  function drawLand(a: number) {
    if (a <= 0.01) return
    origin(0, 0)
    const g = sampleLand()
    const sub = Math.max(2, Math.round(CG / g))
    const sg = CG / sub
    ctx.save()
    ctx.globalAlpha = a
    // the globe's disk, when it is in view
    if (R_E * k < Math.hypot(w, h)) {
      ctx.beginPath()
      circ(ox, oy, R_E * k)
      ctx.clip()
    }
    ctx.strokeStyle = rgba(C.ocean, 0.9)
    ctx.lineWidth = 1
    const sea = new Path2D()
    ctx.beginPath()
    const seg = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    const cell = (X: number, Y: number, gg: number, v0: number, v1: number, v2: number, v3: number) => {
      const code = (v0 > 0 ? 8 : 0) | (v1 > 0 ? 4 : 0) | (v2 > 0 ? 2 : 0) | (v3 > 0 ? 1 : 0)
      if (code === 15 || code === 0) return
      const tX = X + (v0 / (v0 - v1)) * gg
      const rY = Y + (v1 / (v1 - v2)) * gg
      const bX = X + (v3 / (v3 - v2)) * gg
      const lY = Y + (v0 / (v0 - v3)) * gg
      switch (code) {
        case 1:
        case 14:
          seg(X, lY, bX, Y + gg)
          break
        case 2:
        case 13:
          seg(bX, Y + gg, X + gg, rY)
          break
        case 3:
        case 12:
          seg(X, lY, X + gg, rY)
          break
        case 4:
        case 11:
          seg(tX, Y, X + gg, rY)
          break
        case 6:
        case 9:
          seg(tX, Y, bX, Y + gg)
          break
        case 7:
        case 8:
          seg(X, lY, tX, Y)
          break
        case 5:
          seg(X, lY, tX, Y)
          seg(bX, Y + gg, X + gg, rY)
          break
        case 10:
          seg(tX, Y, X + gg, rY)
          seg(X, lY, bX, Y + gg)
          break
      }
    }
    const m = landMargin
    for (let j = 0; j < cny - 1; j++)
      for (let i = 0; i < cnx - 1; i++) {
        const X = cgx + i * CG
        const Y = cgy + j * CG
        if (X > w || Y > h || X + CG < 0 || Y + CG < 0) continue
        const v0 = coarse[j * cnx + i]
        const v1 = coarse[j * cnx + i + 1]
        const v2 = coarse[(j + 1) * cnx + i + 1]
        const v3 = coarse[(j + 1) * cnx + i]
        const mn = Math.min(v0, v1, v2, v3)
        const mx = Math.max(v0, v1, v2, v3)
        if (mn > m) continue // inland
        if (mx < -m) {
          // open sea: a few strokes of hatching
          if (mx > -0.95)
            for (let q = 0; q < sub; q += 3) {
              sea.moveTo(X, Y + q * sg + sg * 0.5)
              sea.lineTo(X + CG, Y + q * sg + sg * 0.5)
            }
          continue
        }
        // refine this cell
        for (let jj = 0; jj <= sub; jj++)
          for (let ii = 0; ii <= sub; ii++) SUB[jj * (sub + 1) + ii] = landAtPlan((X + ii * sg - ox) / k, (Y + jj * sg - oy) / k)
        for (let jj = 0; jj < sub; jj++)
          for (let ii = 0; ii < sub; ii++) {
            const s0 = SUB[jj * (sub + 1) + ii]
            const s1 = SUB[jj * (sub + 1) + ii + 1]
            const s2 = SUB[(jj + 1) * (sub + 1) + ii + 1]
            const s3 = SUB[(jj + 1) * (sub + 1) + ii]
            if (s0 < 0 && s1 < 0 && s2 < 0 && s3 < 0) {
              if (jj % 3 === 0) {
                sea.moveTo(X + ii * sg, Y + jj * sg + sg * 0.5)
                sea.lineTo(X + (ii + 1) * sg, Y + jj * sg + sg * 0.5)
              }
              continue
            }
            cell(X + ii * sg, Y + jj * sg, sg, s0, s1, s2, s3)
          }
      }
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ocean, 0.2)
    ctx.stroke(sea)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = a
    const Rp = R_E * k
    // the globe: limb, a thin atmosphere, a graticule and the night side
    const globe = smoothstep(5.7, 6.7, E)
    if (globe > 0.01) {
      ctx.globalAlpha = a * globe
      ctx.strokeStyle = INK
      ctx.beginPath()
      circ(ox, oy, Rp)
      ctx.stroke()
      ctx.strokeStyle = rgba(C.sky, 0.9)
      ctx.beginPath()
      circ(ox, oy, (R_E + 1e5) * k)
      ctx.stroke()
      // graticule every 30°
      ctx.strokeStyle = rgba(INK, 0.16)
      ctx.beginPath()
      const proj = (lat: number, lon: number) => {
        const cl = Math.cos(lat)
        const P = { x: cl * Math.cos(lon), y: cl * Math.sin(lon), z: Math.sin(lat) }
        const up = P.x * A.x + P.y * A.y + P.z * A.z
        if (up < 0) return null
        const ex = P.x * EE.x + P.y * EE.y + P.z * EE.z
        const ny2 = P.x * EN.x + P.y * EN.y + P.z * EN.z
        return [ox + ex * Rp, oy - ny2 * Rp] as const
      }
      for (let lon = 0; lon < 360; lon += 30) {
        let pen = false
        for (let lat = -88; lat <= 88; lat += 4) {
          const p = proj((lat * Math.PI) / 180, (lon * Math.PI) / 180)
          if (!p) {
            pen = false
            continue
          }
          if (pen) ctx.lineTo(p[0], p[1])
          else ctx.moveTo(p[0], p[1])
          pen = true
        }
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        let pen = false
        for (let lon = 0; lon <= 360; lon += 4) {
          const p = proj((lat * Math.PI) / 180, (lon * Math.PI) / 180)
          if (!p) {
            pen = false
            continue
          }
          if (pen) ctx.lineTo(p[0], p[1])
          else ctx.moveTo(p[0], p[1])
          pen = true
        }
      }
      ctx.stroke()
      // night: hatching where the Sun is below the horizon
      ctx.strokeStyle = rgba(INK, 0.3)
      ctx.beginPath()
      const gap = Math.max(4, Rp * 0.035)
      for (let d = -Rp * 1.5; d <= Rp * 1.5; d += gap) {
        let pen = false
        for (let t = -1; t <= 1.0001; t += 1 / 30) {
          const X = ox + d * 0.707 + t * Rp * 0.707
          const Y = oy - d * 0.707 + t * Rp * 0.707
          const x = (X - ox) / Rp
          const y = (Y - oy) / Rp
          const rr = x * x + y * y
          let night = false
          if (rr < 1) {
            const zc = Math.sqrt(1 - rr)
            const px = x * EE.x - y * EN.x + zc * A.x
            const py = x * EE.y - y * EN.y + zc * A.y
            const pz = x * EE.z - y * EN.z + zc * A.z
            night = px * SUNDIR.x + py * SUNDIR.y + pz * SUNDIR.z < 0
          }
          if (night) {
            if (pen) ctx.lineTo(X, Y)
            else ctx.moveTo(X, Y)
            pen = true
          } else pen = false
        }
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /* 10⁸ – 10¹⁰: the Moon */
  function drawMoon(a: number) {
    if (a <= 0.01) return
    origin(0, 0)
    const Rm = 3.844e8
    const ma = -0.75
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.5)
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    circ(ox, oy, Rm * k)
    ctx.stroke()
    ctx.setLineDash([])
    // the Earth, when the globe has gone
    ctx.strokeStyle = INK
    ctx.beginPath()
    circ(ox, oy, Math.max(2, R_E * k))
    ctx.stroke()
    // the Moon, half lit from the Sun's side
    const mx = ox + Math.cos(ma) * Rm * k
    const my = oy + Math.sin(ma) * Rm * k
    const mr = Math.max(2.2, 1.737e6 * k)
    ctx.beginPath()
    circ(mx, my, mr)
    ctx.stroke()
    if (mr > 5) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(mx, my, mr * 0.98, Math.atan2(-SUN.y, -SUN.x) - Math.PI / 2, Math.atan2(-SUN.y, -SUN.x) + Math.PI / 2)
      ctx.closePath()
      ctx.strokeStyle = rgba(INK, 0.35)
      hatch(ctx, mx - mr, my - mr, mr * 2, mr * 2, Math.max(2.5, mr * 0.18), Math.PI / 4, true)
      ctx.restore()
    }
    if (!tiny && Rm * k > 60 && Rm * k < w * 2) {
      halo('THE MOON', mx + mr + 6, my - 6, { size: 9, color: INK, tracking: 0.14 })
      if (Rm * k < w * 0.7) halo('THE EARTH', ox + Math.max(2, R_E * k) + 6, oy + 12, { size: 9, color: INK, tracking: 0.14 })
    }
    ctx.restore()
  }

  /* 10¹⁰ – 10¹⁴: the solar system */
  function drawSolar(a: number) {
    if (a <= 0.01) return
    origin(SUN.x, SUN.y)
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // the Sun
    ctx.strokeStyle = INK
    ctx.beginPath()
    circ(ox, oy, Math.max(2.5, 6.96e8 * k))
    ctx.stroke()
    if (6.96e8 * k < 3 && AU * k > 30) {
      ctx.strokeStyle = rgba(INK, 0.5)
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * TAU
        ctx.moveTo(ox + Math.cos(an) * 4.5, oy + Math.sin(an) * 4.5)
        ctx.lineTo(ox + Math.cos(an) * 7.5, oy + Math.sin(an) * 7.5)
      }
      ctx.stroke()
    }
    // orbits and planets
    for (const [nm, sa, pr, an] of PLANETS) {
      const R = sa * AU * k
      if (R < 3) continue
      const isEarth = nm === 'EARTH'
      ctx.strokeStyle = isEarth ? rgba(C.ocean, 0.9) : rgba(INK, R > 4000 ? 0.15 : 0.45)
      ctx.beginPath()
      if (R > 8000) {
        // a huge circle: draw only the visible chord as a polyline
        const c = Math.atan2(zy - oy, zx - ox)
        for (let i = -40; i <= 40; i++) {
          const t = c + (i / 40) * Math.min(Math.PI, (Math.hypot(w, h) / R) * 1.2)
          if (i === -40) ctx.moveTo(ox + Math.cos(t) * R, oy + Math.sin(t) * R)
          else ctx.lineTo(ox + Math.cos(t) * R, oy + Math.sin(t) * R)
        }
      } else circ(ox, oy, R)
      ctx.stroke()
      const px = ox + Math.cos(an) * R
      const py = oy + Math.sin(an) * R
      ctx.fillStyle = isEarth ? C.ocean : INK
      ctx.beginPath()
      circ(px, py, Math.max(isEarth ? 2.4 : 1.8, pr * k))
      ctx.fill()
      if (!tiny && R > 26 && R < Math.max(w, h) * 3 && px > -20 && px < w + 20 && py > -20 && py < h + 20) halo(nm, px + 6, py - 5, { size: 8.5, color: isEarth ? C.ocean : INK2, tracking: 0.14 })
    }
    dots(AST, nAst, k, 0.6, INK, 0.45 * smoothstep(40, 120, 3 * AU * k))
    dots(KUI, nKui, k, 0.6, INK, 0.4 * smoothstep(40, 120, 40 * AU * k))
    ctx.restore()
  }

  /* 10¹³ – 10¹⁵: the heliosphere, the Voyagers, one light-day */
  function drawHelio(a: number) {
    if (a <= 0.01) return
    origin(SUN.x, SUN.y)
    const s = AU * k
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const nose = -2.2 // the interstellar wind blows from up and to the left
    const shape = (r0: number, tail: number) => {
      ctx.beginPath()
      for (let i = 0; i <= 120; i++) {
        const th = (i / 120) * TAU
        const d = th - nose
        const rr = r0 * (1 + tail * Math.pow((1 - Math.cos(d)) / 2, 1.6))
        const X = ox + Math.cos(th) * rr * s
        const Y = oy + Math.sin(th) * rr * s
        if (i === 0) ctx.moveTo(X, Y)
        else ctx.lineTo(X, Y)
      }
      ctx.closePath()
    }
    ctx.strokeStyle = rgba(C.lagoon, 0.7)
    shape(88, 0.7)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ocean, 0.9)
    shape(121, 1.5)
    ctx.stroke()
    // one light-day
    ctx.strokeStyle = rgba(INK, 0.4)
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    circ(ox, oy, 173.1 * s)
    ctx.stroke()
    ctx.setLineDash([])
    // the Voyagers
    const vs: [string, number, number][] = [
      ['VOYAGER 1', 172, nose + 0.62],
      ['VOYAGER 2', 145, nose - 0.75],
    ]
    for (const [nm, d, an] of vs) {
      const X = ox + Math.cos(an) * d * s
      const Y = oy + Math.sin(an) * d * s
      ctx.fillStyle = INK
      ctx.beginPath()
      circ(X, Y, 2)
      ctx.fill()
      ctx.strokeStyle = rgba(INK, 0.4)
      ctx.beginPath()
      ctx.moveTo(ox + Math.cos(an) * 1.5 * s, oy + Math.sin(an) * 1.5 * s)
      ctx.lineTo(X, Y)
      ctx.setLineDash([1, 3])
      ctx.stroke()
      ctx.setLineDash([])
      if (!tiny && s * 120 > 70) halo(`${nm} · ${d} AU`, X + 6, Y - 6, { size: 8.5, color: INK, tracking: 0.12 })
    }
    if (!tiny && s * 120 > 90) {
      const lx = ox + Math.cos(nose + 0.15) * 121 * s
      const ly = oy + Math.sin(nose + 0.15) * 121 * s
      halo('HELIOPAUSE', lx + 8, ly, { size: 8.5, color: C.ocean, tracking: 0.14 })
      const tx = ox + Math.cos(Math.PI / 2 + 0.2) * 173.1 * s
      const ty = oy + Math.sin(Math.PI / 2 + 0.2) * 173.1 * s
      halo('ONE LIGHT-DAY', tx + 6, ty + 12, { size: 8.5, color: INK2, tracking: 0.14 })
    }
    ctx.restore()
  }

  /* 10¹⁴ – 10¹⁷: the Oort cloud and a light-year */
  function drawOort(a: number) {
    if (a <= 0.01) return
    origin(SUN.x, SUN.y)
    dots(OORT, nOort, k, 0.6, INK, a * 0.55)
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = rgba(INK, 0.45)
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    circ(ox, oy, LY * k)
    ctx.stroke()
    ctx.setLineDash([])
    if (!tiny && LY * k > 40 && LY * k < w) halo('ONE LIGHT-YEAR', ox + LY * k * 0.71 + 6, oy - LY * k * 0.71 - 4, { size: 8.5, color: INK2, tracking: 0.14 })
    ctx.fillStyle = INK
    ctx.beginPath()
    circ(ox, oy, 2)
    ctx.fill()
    ctx.restore()
  }

  /* 10¹⁶ – 10¹⁹: the nearest stars and our neighbourhood */
  function drawStars(a: number, ah: number) {
    origin(SUN.x, SUN.y)
    if (ah > 0.01) {
      ctx.save()
      for (let t = 0; t < 3; t++) {
        const col = [INK, css(blackbody(4200)), css(blackbody(9000))][t]
        ctx.fillStyle = col
        ctx.globalAlpha = ah * (t === 0 ? 0.62 : 0.85)
        ctx.beginPath()
        for (let i = 0; i < nHood; i++) {
          if (HOODT[i] !== t) continue
          const X = ox + HOOD[i * 2] * k
          const Y = oy + HOOD[i * 2 + 1] * k
          if (X < -3 || X > w + 3 || Y < -3 || Y > h + 3) continue
          ctx.rect(X - 0.75, Y - 0.75, 1.5, 1.5)
        }
        ctx.fill()
      }
      // the Sun, a scale ring, and some stars you know
      const ly1 = LY * k
      ctx.globalAlpha = ah
      ctx.strokeStyle = rgba(INK, 0.22)
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      for (const rr of [100, 1000]) if (rr * ly1 > 40 && rr * ly1 < Math.max(w, h)) circ(ox, oy, rr * ly1)
      ctx.stroke()
      ctx.setLineDash([])
      if (!tiny)
        for (const rr of [100, 1000])
          if (rr * ly1 > 40 && rr * ly1 < Math.max(w, h) * 0.8) text(ctx, `${rr.toLocaleString('en-US')} LY`, ox + rr * ly1 * 0.71 + 4, oy - rr * ly1 * 0.71 - 4, { size: 7.5, color: MUTED, tracking: 0.1 })
      ctx.fillStyle = css(blackbody(5772))
      ctx.strokeStyle = INK
      ctx.beginPath()
      circ(ox, oy, 2.6)
      ctx.fill()
      ctx.stroke()
      if (!tiny && ly1 < 0.4) halo('THE SUN', ox + 6, oy + 12, { size: 8.5, color: INK, tracking: 0.14 })
      FAR.forEach(([nm, , , d, tk], i) => {
        const X = ox + FARXY[i][0] * k
        const Y = oy + FARXY[i][1] * k
        if (X < -20 || X > w + 20 || Y < -20 || Y > h + 20 || d * ly1 < 14) return
        ctx.strokeStyle = rgba(INK, 0.8)
        ctx.beginPath()
        if (tk === 0) ctx.ellipse(X, Y, 5, 3.4, 0.5, 0, TAU)
        else {
          ctx.fillStyle = css(blackbody(tk))
          circ(X, Y, 2.8)
          ctx.fill()
        }
        ctx.stroke()
        if (!tiny && d * ly1 < Math.max(w, h)) halo(`${nm} · ${d.toLocaleString('en-US')} LY`, X + 6, Y - 5, { size: 8, color: INK2, tracking: 0.1 })
      })
      ctx.restore()
    }
    if (a <= 0.01) return
    ctx.save()
    ctx.globalAlpha = a
    // the Sun at the centre
    ctx.fillStyle = css(blackbody(5772))
    ctx.strokeStyle = INK
    ctx.lineWidth = 1
    ctx.beginPath()
    circ(ox, oy, 3.2)
    ctx.fill()
    ctx.stroke()
    if (!tiny) halo('THE SUN', ox + 7, oy + 12, { size: 8.5, color: INK, tracking: 0.14 })
    const rings = [5, 10, 15]
    ctx.strokeStyle = rgba(INK, 0.16)
    ctx.beginPath()
    for (const rr of rings) circ(ox, oy, rr * LY * k)
    ctx.stroke()
    if (!tiny && 5 * LY * k > 40) for (const rr of rings) text(ctx, `${rr} LY`, ox + rr * LY * k * 0.71 + 3, oy + rr * LY * k * 0.71 + 10, { size: 7.5, color: MUTED, tracking: 0.1 })
    NEAR.forEach(([nm, , , d], i) => {
      const X = ox + NEARXY[i][0] * k
      const Y = oy + NEARXY[i][1] * k
      if (X < -20 || X > w + 20 || Y < -20 || Y > h + 20) return
      ctx.fillStyle = NEARCOL[i]
      ctx.strokeStyle = rgba(INK, 0.8)
      ctx.beginPath()
      circ(X, Y, d < 13 ? 3 : 3.6)
      ctx.fill()
      ctx.stroke()
      if (!tiny && LY * k > 6 && (d < 13 || LY * k < 30)) halo(`${nm} · ${d} LY`, X + 6, Y - 5, { size: 8, color: INK2, tracking: 0.1 })
    })
    ctx.restore()
  }

  /* 10¹⁹ – 10²²: the Milky Way */
  function drawGalaxy(a: number) {
    if (a <= 0.01) return
    origin(SUN.x + GC.x, SUN.y + GC.y)
    const sz = clamp(KPC * k * 0.06, 0.45, 1.1)
    dots(GAL, nGal, k, sz, INK, a * 0.62)
    ctx.save()
    ctx.globalAlpha = a
    // the Sun's place
    const sx = ox - GC.x * k
    const sy = oy - GC.y * k
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1
    ctx.beginPath()
    circ(sx, sy, 7)
    ctx.stroke()
    if (!tiny && KPC * k > 4) {
      halo(KPC * k > 30 ? 'THE SUN · 26,000 LIGHT-YEARS FROM THE CENTRE' : 'THE SUN', sx + 10, sy + 14, { size: 8.5, color: C.ocean, tracking: 0.12 })
      if (KPC * k < 60) halo('GALACTIC CENTRE', ox + 8, oy - 8, { size: 8.5, color: INK2, tracking: 0.12 })
    }
    ctx.restore()
  }

  /* 10²² – 10²⁴: the Local Group */
  function drawLocalGroup(a: number) {
    if (a <= 0.01) return
    origin(SUN.x + GC.x, SUN.y + GC.y)
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    for (const [nm, x, y, size, kind] of LGAL) {
      const X = ox + x * k
      const Y = oy + y * k
      const R = Math.max(kind === 0 ? 3.5 : 1.6, (size / 2) * LY * k)
      ctx.strokeStyle = kind === 0 ? INK : INK2
      ctx.beginPath()
      if (kind === 0) {
        const inc = nm === 'ANDROMEDA' ? 0.3 : nm === 'TRIANGULUM' ? 0.6 : 1
        ctx.ellipse(X, Y, R, R * inc, nm === 'ANDROMEDA' ? -0.6 : 0.3, 0, TAU)
        if (R > 8) {
          // two arms
          for (let arm = 0; arm < 2; arm++)
            for (let i = 0; i <= 16; i++) {
              const th = (i / 16) * Math.PI * 1.4 + arm * Math.PI
              const rr = R * 0.18 * Math.exp(0.39 * (i / 16) * Math.PI * 1.4)
              const ex = Math.cos(th) * rr
              const ey = Math.sin(th) * rr * inc
              const rot = nm === 'ANDROMEDA' ? -0.6 : 0.3
              const px = X + ex * Math.cos(rot) - ey * Math.sin(rot)
              const py = Y + ex * Math.sin(rot) + ey * Math.cos(rot)
              if (i === 0) ctx.moveTo(px, py)
              else ctx.lineTo(px, py)
            }
        }
      } else circ(X, Y, R)
      ctx.stroke()
      const show = kind === 0 || 0.5 * MLY * k > 60
      if (!tiny && show && X > -40 && X < w + 40 && Y > -20 && Y < h + 20) halo(nm, X + R + 5, Y - 4, { size: kind === 0 ? 8.5 : 7.5, color: kind === 0 ? INK : MUTED, tracking: 0.12 })
    }
    // the group's extent
    const gx = ox + LG.x * k
    const gy = oy + LG.y * k
    ctx.strokeStyle = rgba(INK, 0.25)
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    circ(gx, gy, 5 * MLY * k)
    ctx.stroke()
    ctx.setLineDash([])
    if (!tiny && 5 * MLY * k > 60 && 5 * MLY * k < w) halo('THE LOCAL GROUP · 10 MILLION LIGHT-YEARS', gx + 5 * MLY * k * 0.7, gy - 5 * MLY * k * 0.72, { size: 8.5, color: INK2, tracking: 0.12 })
    ctx.restore()
  }

  /* 10²³ – 10²⁶: the cosmic web */
  function drawWeb(a: number, a2: number) {
    if (a <= 0.01 && a2 <= 0.01) return
    origin(SUN.x + GC.x + LG.x, SUN.y + GC.y + LG.y)
    // each population fades once it is too small on screen to read as a web
    dots(WEB, nWeb, k, clamp(1e23 * k * 0.03, 0.6, 1.1), INK, a * 0.75 * smoothstep(110, 300, 1.1e25 * k))
    dots(WEB2, nWeb2, k, 0.8, INK, a2 * 0.85 * smoothstep(110, 320, 1.5e26 * k))
    if (a <= 0.01) return
    if (!tiny && 54 * MLY * k > 50 && 54 * MLY * k < w) {
      ctx.save()
      ctx.globalAlpha = a
      halo('VIRGO CLUSTER', ox - 0.55 * 54 * MLY * k + 10, oy - 0.83 * 54 * MLY * k - 10, { size: 8.5, color: INK2, tracking: 0.12 })
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      circ(ox, oy, 2.2)
      ctx.fill()
      halo('US', ox + 6, oy + 12, { size: 8.5, color: C.ocean, tracking: 0.14 })
      ctx.restore()
    }
  }

  /* 10²⁵ – 10²⁷: the observable universe and its edge */
  function drawUniverse(a: number) {
    if (a <= 0.01) return
    origin(0, 0)
    const R = R_OBS * k
    dots(UNI, nUni, k, clamp(R * 0.0022, 0.6, 1), INK, a * 0.62)
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = INK
    ctx.beginPath()
    circ(ox, oy, R)
    ctx.stroke()
    // the oldest light, a ring of tiny differences
    ctx.strokeStyle = rgba(css(blackbody(3000)), 0.9)
    ctx.beginPath()
    for (let i = 0; i < 360; i++) {
      const an = (i / 360) * TAU
      const l = (3 + CMB[i] * 5) * clamp(R / 300, 0.6, 1.6)
      ctx.moveTo(ox + Math.cos(an) * R, oy + Math.sin(an) * R)
      ctx.lineTo(ox + Math.cos(an) * (R + l), oy + Math.sin(an) * (R + l))
    }
    ctx.stroke()
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    circ(ox, oy, 2.4)
    ctx.fill()
    if (!tiny && R > 60) {
      halo('YOU ARE HERE', ox + 7, oy + 13, { size: 8.5, color: C.ocean, tracking: 0.14 })
      const lab = R > 200 && w > 700 ? 'THE OLDEST LIGHT · 46.5 BILLION LIGHT-YEARS AWAY' : 'THE OLDEST LIGHT'
      setFont(ctx, { size: 8.5, tracking: 0.12 })
      const lw2 = ctx.measureText(lab).width
      const lx = ox + R * 0.71 + 10
      if (lx + lw2 < w - pad) halo(lab, lx, oy - R * 0.71 - 6, { size: 8.5, color: INK2, tracking: 0.12 })
      else halo(lab, ox - R * 0.71 - 10, oy - R * 0.71 - 6, { size: 8.5, color: INK2, tracking: 0.12, align: 'right' })
    }
    ctx.restore()
  }

  /* the plate: nested frames, one per power of ten */
  function drawFrames() {
    const nLo = Math.floor(E) - 1
    const nHi = Math.floor(E) + 2
    const minD = Math.min(w, h)
    for (let n = nLo; n <= nHi; n++) {
      const side = S0 * p10(n - E)
      if (side < S0 * 0.06 || side > minD * 1.4) continue
      // a frame leaves before it is cut by the edges of the screen
      const cut = Math.min(2 * Math.min(zy, h - zy), 2 * Math.min(zx, w - zx))
      const al = smoothstep(S0 * 0.06, S0 * 0.2, side) * (1 - smoothstep(cut * 0.8, cut * 0.97, side))
      if (al <= 0.01) continue
      const x0 = zx - side / 2
      const y0 = zy - side / 2
      ctx.save()
      ctx.globalAlpha = al
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(INK, 0.7)
      ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(side), Math.round(side))
      // ten divisions along the top and left edges: the next power down
      if (side > 120) {
        ctx.strokeStyle = rgba(INK, 0.45)
        ctx.beginPath()
        for (let i = 1; i < 10; i++) {
          const t = (side * i) / 10
          const l = i === 5 ? 6 : 3.5
          ctx.moveTo(x0 + t, y0)
          ctx.lineTo(x0 + t, y0 + l)
          ctx.moveTo(x0, y0 + t)
          ctx.lineTo(x0 + l, y0 + t)
        }
        ctx.stroke()
      }
      // the exponent, in serif, at the corner
      const fs = clamp(side * 0.07, 13, preview ? 18 : 30)
      // (not where it would run into the readouts)
      const clash = y0 - 7 - fs < readBottom && x0 + fs * 2.4 > readLeft - 8
      if (side > 70 && y0 - 6 > pad * 2.2 && x0 > pad * 0.5 && !clash) {
        const base = '10'
        setFont(ctx, { font: 'serif', size: fs })
        const bw = ctx.measureText(base).width
        halo(base, x0, y0 - 7, { font: 'serif', size: fs, color: INK })
        halo(String(n).replace('-', '−'), x0 + bw + 1, y0 - 7 - fs * 0.42, { font: 'serif', size: fs * 0.58, color: INK })
        setFont(ctx, { font: 'serif', size: fs * 0.58 })
        const ew = ctx.measureText(String(n).replace('-', '−')).width
        halo('m', x0 + bw + ew + 5, y0 - 7, { font: 'serif', size: fs * 0.8, italic: true, color: INK2 })
        // what lives here, set along the top of the frame when there is room
        const lv = LEVELS[n]
        if (lv && side > S0 * 0.5 && !tiny) {
          const used = bw + ew + fs * 0.8 + 20
          const full = `${lv[0].toUpperCase()} · ${lv[1]}`
          setFont(ctx, { size: 8.5, tracking: 0.12 })
          const lab = ctx.measureText(full).width < side - used ? full : ctx.measureText(lv[1]).width < side - used ? lv[1] : ''
          if (lab) halo(lab, x0 + side, y0 - 8, { size: 8.5, color: INK2, align: 'right', tracking: 0.12 })
        }
      }
      // its width, dimensioned along the bottom
      if (side > S0 * 0.45 && side < minD * 0.98 && !preview) {
        const yb = y0 + side + 12
        if (yb < h - pad * 3) {
          ctx.strokeStyle = rgba(INK, 0.5)
          ctx.beginPath()
          ctx.moveTo(x0, yb)
          ctx.lineTo(x0 + side, yb)
          ctx.moveTo(x0, yb - 4)
          ctx.lineTo(x0, yb + 4)
          ctx.moveTo(x0 + side, yb - 4)
          ctx.lineTo(x0 + side, yb + 4)
          ctx.stroke()
          halo(sayLength(p10(n)), x0 + side / 2, yb + 13, { size: 8.5, color: INK2, align: 'center', tracking: 0.12 })
        }
      }
      ctx.restore()
    }
  }

  /* --------------------------------------------------- clock & input */
  const atP = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 19.6 : 0
  let prevT = -1
  let paused = false
  let interacted = false
  let eUser: number | null = null
  let eVel = 0
  let idle = 0
  let lastDir = 1
  let hold: { target: number } | null = null
  let down: { x: number; y: number; ms: number; moved: boolean; ruler: boolean; e0: number; lx: number; ly: number; lt: number } | null = null
  let touch = false
  let rulerHover = -1
  let eNow = 0
  let readLeft = 0
  let readBottom = 0
  let testHold = env.params.get('hold') === '1'
  let lastTickE = 0
  {
    const ep = Number(env.params.get('e'))
    if (env.params.has('e') && Number.isFinite(ep)) eUser = clamp(ep, E_MIN, E_MAX)
  }
  const curT = () => (((prevT < 0 ? 0 : prevT) % LOOP) + LOOP) % LOOP

  // the exponent ruler along the bottom
  const rulerY = () => h - pad * 0.55
  const rx0 = () => pad
  const rx1 = () => w - pad
  const eToX = (e: number) => lerp(rx0(), rx1(), (e - E_MIN) / (E_MAX - E_MIN))
  const xToE = (x: number) => E_MIN + clamp((x - rx0()) / (rx1() - rx0())) * (E_MAX - E_MIN)
  const onRuler = (x: number, y: number) => !preview && !tiny && y > rulerY() - (touch ? 34 : 24) && y < h && x > rx0() - 8 && x < rx1() + 8

  /** after a pause of the hands, rejoin the film where it passes this exponent */
  function rejoin(e: number) {
    let bestT = 0
    let bd = Infinity
    const T0 = curT()
    for (let T = 0; T < LOOP; T += 0.05) {
      const ea = eAuto(T)
      const d = Math.abs(ea - e)
      const dir = Math.sign(eAuto(T + 0.2) - ea) || 1
      const cost = d + (dir === lastDir ? 0 : 0.6) + Math.abs(T - T0) * 0.0005
      if (cost < bd) {
        bd = cost
        bestT = T
      }
    }
    offset += bestT - T0
    prevT = bestT
  }

  /* -------------------------------------------------------- sound */
  const sfx = env.sfx

  function captionAt(T: number) {
    if (eUser !== null || hold) return
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.04
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = capY + capSize + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, w, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) halo(ln.s, capX, y + dy, { font: 'serif', size: capSize, color: INK })
        if (ln.em) halo(ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function chrome(rate: number) {
    const small = preview || Math.min(w, h) < 420
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.45)
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, small ? 7 : 10)
    const hy = pad + (small ? 5 : 8)
    const hs = small ? 8.5 : 10
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    halo(FIG, pad + 26, hy, { size: hs, color: C.ocean, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const fw = ctx.measureText(FIG).width
    halo(w < 700 || small ? 'SCALE' : 'SCALE · AFTER CHARLES AND RAY EAMES, 1977', pad + 26 + fw + hs * 0.9, hy, { size: hs, color: MUTED, tracking: 0.14 })
    // readouts
    const frame = p10(E)
    const rows: [string, string][] = [
      ['Power', `10${sup(E.toFixed(1))} M`],
      ['Frame', sayLength(frame)],
      ['Light crosses it in', sayTime(frame / C_LIGHT)],
      ['Pace', hold ? 'HOLDING' : eUser !== null ? 'YOURS' : Math.abs(rate) < 0.004 ? 'STILL' : `10× EVERY ${Math.abs(1 / rate).toFixed(1)} S ${rate > 0 ? 'OUT' : 'IN'}`],
    ]
    let y = hy
    const rs2 = small ? 9 : 10.5
    const maxR = tiny ? 2 : short || portrait ? 3 : 4
    let left = w
    for (const [label, value] of rows.slice(0, maxR)) {
      setFont(ctx, { size: rs2, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      halo(value, w - pad, y, { size: rs2, color: INK, align: 'right', tracking: 0.06 })
      setFont(ctx, { size: small ? 8.5 : 9.5, tracking: 0.14 })
      const lw2 = ctx.measureText(label.toUpperCase()).width
      halo(label, w - pad - vw - 10, y, { size: small ? 8.5 : 9.5, color: MUTED, align: 'right', tracking: 0.14, upper: true })
      left = Math.min(left, w - pad - vw - 10 - lw2)
      y += small ? 14 : 17
    }
    readLeft = left
    readBottom = y - (small ? 14 : 17) + 4
    // the level, as a title under the header: the largest frame that is wholly in view
    const n = Math.floor(E + 0.2)
    const lv = LEVELS[clamp(n, -15, 27)]
    if (lv && !tiny && !preview && !(short && w < 480)) {
      const ty = hy + (short ? 20 : 30)
      let tsz = short ? 15 : clamp(Math.min(w, h) * 0.03, 16, 26)
      setFont(ctx, { font: 'serif', size: tsz })
      const tw = ctx.measureText(lv[0]).width
      // keep clear of the readouts
      if (ty + tsz * 0.4 - tsz < y && pad + tw > left - 12) tsz *= Math.max(0.6, (left - 12 - pad) / tw)
      setFont(ctx, { font: 'serif', size: tsz })
      if (!(ty + tsz * 0.4 - tsz < y && pad + ctx.measureText(lv[0]).width > left - 12)) halo(lv[0], pad, ty + tsz * 0.4, { font: 'serif', size: tsz, color: INK })
    }
    if (preview || tiny) return
    // the exponent ruler
    const yb = rulerY()
    const x0 = rx0()
    const x1 = rx1()
    ctx.strokeStyle = rgba(INK, 0.3)
    ctx.beginPath()
    ctx.moveTo(x0, yb)
    ctx.lineTo(x1, yb)
    for (let e = E_MIN; e <= 27; e++) {
      const x = eToX(e)
      ctx.moveTo(x, yb)
      ctx.lineTo(x, yb - (e % 5 === 0 ? 6 : 3))
    }
    ctx.stroke()
    const marks: [number, string][] = [
      [-14.3, 'NUCLEUS'],
      [-10, 'ATOM'],
      [-5.2, 'CELL'],
      [-0.6, 'YOU'],
      [6.9, 'EARTH'],
      [11.2, 'SUN'],
      [16.9, 'STARS'],
      [21, 'GALAXY'],
      [26.9, 'EDGE'],
    ]
    const tight = w < 760 || short
    for (let e = E_MIN; e <= 25; e += 5) text(ctx, String(e).replace('-', '−'), eToX(e), yb - 9, { size: 8, color: MUTED, align: 'center' })
    if (!tight)
      for (const [e, nm] of marks) {
        const x = eToX(e)
        text(ctx, nm, x, yb - 19, { size: 7.5, color: Math.abs(E - e) < 1.5 ? INK : MUTED, align: 'center', tracking: 0.12 })
      }
    // the playhead, and which way we are going
    const xp = eToX(E)
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(xp, yb + 3)
    ctx.lineTo(xp, yb - 11)
    ctx.stroke()
    ctx.lineWidth = 1
    if (Math.abs(rate) > 0.01 && !hold && eUser === null) {
      const dir = rate > 0 ? 1 : -1
      ctx.beginPath()
      ctx.moveTo(xp + dir * 4, yb - 8)
      ctx.lineTo(xp + dir * 9, yb - 5.5)
      ctx.lineTo(xp + dir * 4, yb - 3)
      ctx.stroke()
    }
    if (rulerHover >= 0) {
      const e = xToE(rulerHover)
      halo(`10${sup(String(Math.round(e)))} M`, clamp(rulerHover, x0 + 20, x1 - 20), yb - 30, { size: 9, color: C.ocean, align: 'center', tracking: 0.1 })
    }
    if (paused) halo('PAUSED · SPACE', x1, yb - 30, { size: 8.5, color: INK2, align: 'right', tracking: 0.14 })
  }

  function hints(T: number, first: boolean) {
    if (preview || tiny) return
    const narrow = touch || w < 700
    if (!interacted && first && T > 2.2 && T < 9) {
      const a = smoothstep(2.2, 3, T) * (1 - smoothstep(8.2, 9, T))
      const gx = Math.min(w - pad - 16, zx + S0 * 0.62)
      const gy1 = zy + S0 * 0.18
      const gy0 = zy - S0 * 0.22
      const u = (((T - 2.6) % 2.4) + 2.4) % 2.4 / 2.4
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(C.ocean, 0.55)
      ctx.setLineDash([1.5, 4])
      ctx.beginPath()
      ctx.moveTo(gx, gy0)
      ctx.lineTo(gx, gy1)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(gx, gy1 + (gy0 - gy1) * ease.inOutSine(u < 0.5 ? u * 2 : 2 - u * 2), 3, 0, TAU)
      ctx.fill()
      const msg = narrow ? 'DRAG TO ZOOM · TAP TO HOLD' : 'DRAG UP TO ZOOM OUT, DOWN TO ZOOM IN · TAP TO HOLD ON A LEVEL'
      setFont(ctx, { size: 8.5, tracking: 0.14 })
      const tw = ctx.measureText(msg).width
      halo(msg, Math.min(gx + 10, w - pad - tw), gy0 - 10, { size: 8.5, color: C.ocean, tracking: 0.14 })
      ctx.restore()
      return
    }
    const yH = rulerY() - (w < 760 ? 22 : 32)
    if (hold) halo(narrow ? 'HOLDING · TAP TO GO ON' : 'HOLDING ON THIS POWER OF TEN · TAP TO GO ON · ← → STEP', w - pad, yH, { size: 8.5, color: C.ocean, align: 'right', tracking: 0.14 })
    else if (eUser !== null) halo(narrow ? 'YOURS · THE FILM RESUMES WHEN YOU LET GO' : 'YOUR EXPONENT · THE FILM PICKS UP AGAIN WHEN YOU LET GO', w - pad, yH, { size: 8.5, color: C.ocean, align: 'right', tracking: 0.14 })
  }

  /* --------------------------------------------------------- the API */
  return {
    resize() {
      layout()
    },
    pointer(p: PointerInfo) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        rulerHover = -1
        env.setCursor('default')
        if (down) down = null
        return
      }
      const ruler = onRuler(p.x, p.y)
      if (p.type === 'down') {
        interacted = true
        down = { x: p.x, y: p.y, ms: performance.now(), moved: false, ruler, e0: eNow, lx: p.x, ly: p.y, lt: performance.now() }
        idle = 0
        if (ruler) {
          hold = null
          eUser = xToE(p.x)
          rulerHover = p.x
        }
        return
      }
      if (p.type === 'move') {
        if (down && p.pressed) {
          if (down.ruler) {
            eUser = xToE(p.x)
            rulerHover = p.x
            idle = 0
            return
          }
          if (Math.hypot(p.x - down.x, p.y - down.y) > (touch ? 10 : 6)) down.moved = true
          if (down.moved) {
            hold = null
            idle = 0
            const unit = Math.min(w, h) * 0.24
            const ne = clamp(down.e0 + (-(p.y - down.y) + (p.x - down.x) * 0.6) / unit, E_MIN, E_MAX)
            const now = performance.now()
            const dtm = Math.max(1, now - down.lt) / 1000
            eVel = lerp(eVel, (ne - (eUser ?? ne)) / dtm, 0.5)
            if (eUser !== null && ne !== eUser) lastDir = ne > eUser ? 1 : -1
            eUser = ne
            down.lt = now
            idle = 0
          }
        } else rulerHover = ruler ? p.x : -1
        env.setCursor(ruler ? 'pointer' : down?.moved ? 'grabbing' : 'ns-resize')
        return
      }
      if (p.type === 'up') {
        if (down && !down.ruler && !down.moved && performance.now() - down.ms < 350) {
          // a tap: hold on the nearest power of ten, or let go
          if (hold) {
            hold = null
            eUser = null
            rejoin(eNow)
          } else {
            hold = { target: Math.round(E) }
            eUser = null
          }
          sfx.tone(hold ? 523.25 : 392, 0.8, { type: 'sine', gain: 0.05, room: 0.4 })
        }
        if (down?.ruler) rulerHover = -1
        if (!down?.moved) eVel = 0
        down = null
      }
    },
    key(code, isDown) {
      if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown') {
        if (!isDown) return true
        interacted = true
        const dir = code === 'ArrowRight' || code === 'ArrowUp' ? 1 : -1
        const base = hold ? hold.target : Math.round(E)
        hold = { target: clamp(base + dir, -15, 27) }
        eUser = null
        lastDir = dir
        return true
      }
      if (code === 'Space') {
        if (isDown) paused = !paused
        return true
      }
      return false
    },
    frame(t, dt) {
      if ((paused || hold || eUser !== null) && dt > 0) offset -= dt
      const T = (((t + offset) % LOOP) + LOOP) % LOOP
      const first = t + offset < LOOP + 2
      if (testHold && prevT >= 0) {
        hold = { target: Math.round(eNow) }
        interacted = true
        testHold = false
      }
      // the exponent: the film's, the viewer's (with a little inertia), or a held level
      if (hold) eNow = lerp(eNow, hold.target, dt > 0 ? 1 - Math.exp(-5 * dt) : 0)
      else if (eUser !== null) {
        if (!down && dt > 0) {
          eUser = clamp(eUser + eVel * dt, E_MIN, E_MAX)
          eVel *= Math.exp(-4 * dt)
          idle += dt
        }
        eNow = eUser
        if (idle > 4.5) {
          eUser = null
          rejoin(eNow)
        }
      } else eNow = eAuto(T)
      if (prevT < 0 && !hold && eUser === null) eNow = eAuto(T)
      const e = eNow
      setCamera(e)
      const rate = eUser !== null || hold ? 0 : (eAuto(T + 0.05) - eAuto(T)) / 0.05

      ground(ctx, w, h, 'paper')
      // the layers, smallest to largest
      drawProton(vis(-15.6, -13.9, 0.45))
      drawNucleus(vis(-15.2, -12.7, 0.5) * (1 - smoothstep(-15.2, -14.75, E) * 0.65))
      drawAtom(vis(-13.4, -9.3, 0.6))
      drawDNA(vis(-9.75, -7.3, 0.45))
      drawBeads(vis(-8.6, -6.4, 0.5))
      drawCellNucleus(vis(-6.7, -4.9, 0.5))
      drawCells(vis(-5.8, -3.4, 0.5))
      drawRidges(vis(-4.0, -1.5, 0.45))
      drawHands(vis(-2.7, 1.25, 0.45))
      drawLawn(vis(-0.6, 2.4, 0.5))
      drawPark(vis(1.3, 3.8, 0.5))
      drawCity(vis(2.6, 5.0, 0.5))
      drawLand(vis(3.7, 8.7, 0.5))
      drawMoon(vis(7.5, 10.6, 0.5))
      drawSolar(vis(9.5, 14.3, 0.6))
      drawHelio(vis(12.8, 15.7, 0.5))
      drawOort(vis(14.5, 17.4, 0.5))
      drawStars(vis(15.9, 18.9, 0.5), vis(17.4, 20.3, 0.6))
      drawGalaxy(vis(19.3, 22.8, 0.5))
      drawLocalGroup(vis(21.8, 24.4, 0.5))
      drawWeb(vis(23.1, 26.6, 0.5), vis(24.4, 27.0, 0.6))
      drawUniverse(vis(25.5, 27.6, 0.5))

      drawFrames()
      captionAt(T)
      chrome(rate)
      hints(T, first)

      // sound: a soft tick for every power of ten crossed, pitched by the exponent
      if (sfx.enabled && dt > 0 && prevT >= 0) {
        const a0 = Math.floor(lastTickE)
        const a1 = Math.floor(E)
        if (a0 !== a1) {
          const n = Math.max(a0, a1)
          const f = 880 * Math.pow(2, -((n + 15) / 42) * 3)
          sfx.tone(f, 0.9, { type: 'sine', gain: 0.035, room: 0.45, pan: clamp((n - 6) / 20, -0.6, 0.6) })
        }
      }
      lastTickE = E
      prevT = T
    },
  }
}

export default create
