/*
 * C.01 — SPECTRUM
 *
 * Newton's prism, as a drawing that breathes. A paper-white hairline beam
 * leaves a hole in a window shutter and enters an equilateral prism of
 * dense flint glass (Schott N-SF11, refractive index from its Sellmeier
 * equation). Every ray is traced exactly: Snell's law in vector form at each
 * face, total internal reflection where it occurs, one ray per wavelength
 * from 396 to 704 nm, each drawn in its own spectral colour (color.ts) and
 * added with 'lighter' compositing, so where the rays overlap they really
 * do sum back towards white.
 *
 * Five chapters over 60 s, a pure function of time (seekable with ?at=…):
 *   I    White light        the beam arrives in darkness; the prism draws on
 *   II   Dispersion         the fan opens onto a screen; wavelength ticks and
 *                          Fraunhofer letters mark where each colour lands
 *   III  Deviation          dimension arcs measure the bend per colour; the
 *                          prism rocks through its minimum deviation
 *   IV   Experimentum crucis  a hole in the screen passes one colour to a
 *                          second prism, which bends it but cannot split it;
 *                          the first prism turns, as Newton turned his
 *   V    Recombination      an inverted prism undoes the first: white again
 *
 * Interaction (full mode): drag the prism to turn it, drag the shutter hole
 * to move the source; both drift home a few seconds after release. ← → step
 * chapters; the ruler along the bottom scrubs. Sound (optional): a chord of
 * seven voices, one per Newtonian colour, which thins to a single voice when
 * one colour is isolated and returns in unison when the colours recombine.
 */

import { C, TAU, clamp, ease, ground, lerp, rgba, setFont, smoothstep, text } from '../kit'
import { css, linearToOklab, oklch, spectral, toLinear, type Rgb } from '../color'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('italic 400 64px "Instrument Serif"'), document.fonts.load('500 12px "Geist Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. C.01'
const LOOP = 60
const CHAPTERS = [
  { t: 0, num: 'I', name: 'White light' },
  { t: 9, num: 'II', name: 'Dispersion' },
  { t: 21, num: 'III', name: 'Deviation' },
  { t: 31, num: 'IV', name: 'Experimentum crucis' },
  { t: 46, num: 'V', name: 'Recombination' },
]

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
  /** the italic word takes the colour passing the hole */
  pass?: boolean
}
const CAPTIONS: Caption[] = [
  { t0: 0.9, t1: 8.7, lines: [{ s: 'White light is' }, { s: 'every color ', em: 'at once.' }] },
  { t0: 10.2, t1: 19.9, lines: [{ s: 'Each color bends' }, { s: 'its ', em: 'own amount.' }] },
  { t0: 22.4, t1: 30.2, lines: [{ s: 'Violet bends the most,' }, { s: 'red ', em: 'the least.' }] },
  { t0: 35.2, t1: 45.2, lines: [{ s: 'One color' }, { s: 'stays ', em: 'one color.' }], pass: true },
  { t0: 49.6, t1: 56.6, lines: [{ s: 'And together,' }, { s: '', em: 'white again.' }] },
]

/* ------------------------------------------------------------- the glass */

// Schott N-SF11 dense flint: Sellmeier coefficients, λ in µm
const SB = [1.73759695, 0.313747346, 1.89878101]
const SC = [0.013188707, 0.0623068142, 155.23629]
function nGlass(nm: number) {
  const l2 = (nm / 1000) ** 2
  return Math.sqrt(1 + (SB[0] * l2) / (l2 - SC[0]) + (SB[1] * l2) / (l2 - SC[1]) + (SB[2] * l2) / (l2 - SC[2]))
}
const APEX = Math.PI / 3
const D_LINE = 589.3
/** deviation through a prism of apex APEX at incidence i (radians), or NaN past total internal reflection */
function deviation(n: number, i: number) {
  const r1 = Math.asin(Math.sin(i) / n)
  const s2 = n * Math.sin(APEX - r1)
  if (Math.abs(s2) > 1) return NaN
  return i + Math.asin(s2) - APEX
}
const dMin = (n: number) => 2 * Math.asin(n * Math.sin(APEX / 2)) - APEX

/** Fraunhofer's lines in sunlight that fall in the drawn band */
const FRAUNHOFER: [string, number][] = [
  ['C', 656.3],
  ['D', 589.3],
  ['E', 527.0],
  ['F', 486.1],
  ['G', 430.8],
  ['h', 410.2],
]

/** Newton's seven colours, centre wavelengths (nm), and a voice for each: D Dorian, D3 → C4 */
const VOICES: { name: string; nm: number; hz: number }[] = [
  { name: 'red', nm: 680, hz: 146.83 },
  { name: 'orange', nm: 612, hz: 164.81 },
  { name: 'yellow', nm: 582, hz: 174.61 },
  { name: 'green', nm: 532, hz: 196.0 },
  { name: 'blue', nm: 475, hz: 220.0 },
  { name: 'indigo', nm: 445, hz: 246.94 },
  { name: 'violet', nm: 412, hz: 261.63 },
]

const deg = (r: number) => (r * 180) / Math.PI
const rad = (d: number) => (d * Math.PI) / 180

/** A spectral colour lifted to a readable lightness on the night ground (same hue, OKLCH). */
const legCache = new Map<number, string>()
function legible(nm: number) {
  const key = Math.round(nm)
  let v = legCache.get(key)
  if (!v) {
    const [L, a, b] = linearToOklab(toLinear(spectral(key)))
    v = css(oklch(Math.max(L, 0.8), Math.hypot(a, b) * 0.9, Math.atan2(b, a)))
    legCache.set(key, v)
  }
  return v
}

/* ------------------------------------------------------------- geometry */

interface Prism {
  on: boolean
  cx: number
  cy: number
  rot: number
  vx: Float64Array
  vy: Float64Array
  nx: Float64Array
  ny: Float64Array
}
const makePrism = (): Prism => ({ on: false, cx: 0, cy: 0, rot: 0, vx: new Float64Array(3), vy: new Float64Array(3), nx: new Float64Array(3), ny: new Float64Array(3) })
const CIRC = 1 / Math.sqrt(3) // circumradius of a unit-side equilateral triangle
const INR = CIRC / 2 // inradius
const VA = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]
const NA = [-Math.PI / 6, Math.PI / 2, (7 * Math.PI) / 6]
function placePrism(p: Prism, cx: number, cy: number, rot: number) {
  p.cx = cx
  p.cy = cy
  p.rot = rot
  for (let k = 0; k < 3; k++) {
    p.vx[k] = cx + CIRC * Math.cos(VA[k] + rot)
    p.vy[k] = cy + CIRC * Math.sin(VA[k] + rot)
    p.nx[k] = Math.cos(NA[k] + rot)
    p.ny[k] = Math.sin(NA[k] + rot)
  }
}

/** an opaque board (a line with an optional hole between params h0 and h1) */
interface Board {
  on: boolean
  ax: number
  ay: number
  bx: number
  by: number
  h0: number
  h1: number
}
const makeBoard = (): Board => ({ on: false, ax: 0, ay: 0, bx: 0, by: 0, h0: -1, h1: -1 })

const MAXP = 14
const END_NONE = 0
const END_SCREEN = 1
const END_WALL = 2
const END_FINAL = 3

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  // a fine wash of wavelengths (the light's energy), plus a comb of brighter hairlines
  // chosen so that, at minimum deviation, they leave the prism at evenly spaced angles
  const NW = preview ? 70 : 170
  const NRULE = preview ? 22 : 40
  const NR = NW + NRULE
  const NM = new Float32Array(NR)
  const NIDX = new Float32Array(NR)
  const RULE = new Uint8Array(NR)
  const COL: string[] = []
  const COLV: Rgb[] = []
  {
    const d400 = dMin(nGlass(400))
    const d700 = dMin(nGlass(700))
    for (let i = 0; i < NR; i++) {
      const rule = i >= NW
      let nm = 396 + (308 * i) / (NW - 1)
      if (rule) {
        // invert δmin(λ) by bisection for an evenly spaced deviation
        const target = lerp(d700, d400, (i - NW) / (NRULE - 1))
        let lo = 400
        let hi = 700
        for (let it = 0; it < 30; it++) {
          const mid = (lo + hi) / 2
          if (dMin(nGlass(mid)) > target) lo = mid
          else hi = mid
        }
        nm = (lo + hi) / 2
      }
      NM[i] = nm
      NIDX[i] = nGlass(nm)
      RULE[i] = rule ? 1 : 0
      const c = spectral(nm)
      COLV.push(c)
      COL.push(css(c, rule ? (preview ? 0.66 : 0.52) : preview ? 0.12 : 0.065))
    }
    // balance the wash so that, added together on screen, it sums to a neutral white
    let sr = 0
    let sg = 0
    let sb = 0
    for (let i = 0; i < NW; i++) {
      sr += COLV[i][0]
      sg += COLV[i][1]
      sb += COLV[i][2]
    }
    const m = Math.min(sr, sg, sb)
    for (let i = 0; i < NW; i++) {
      const c = COLV[i]
      COL[i] = css([(c[0] * m) / sr, (c[1] * m) / sg, (c[2] * m) / sb], preview ? 0.17 : 0.095)
    }
  }
  const k = { ink: '#EEF4F1', ink2: 'rgba(238,244,241,0.74)', muted: 'rgba(238,244,241,0.5)', rule: 'rgba(238,244,241,0.14)', faint: 'rgba(238,244,241,0.07)' }
  const WHITE = '#F3F6F2'
  const ACC = C.sage

  /* ------------------------------------------- the canonical apparatus */
  // units: prism side = 1; prism 1's centroid at the origin; y down
  const n589 = nGlass(D_LINE)
  const DMIN = dMin(n589)
  const ALPHA0 = DMIN / 2
  const Y_IN = -0.04
  // entry on the left face at height Y_IN (the left face runs from the base-left vertex up to the apex)
  const blx = CIRC * Math.cos(VA[2])
  const bly = CIRC * Math.sin(VA[2])
  const apy = -CIRC
  const fEntry = (bly - Y_IN) / (bly - apy)
  const ENTRY = { x: blx + (0 - blx) * fEntry, y: Y_IN }
  const EXIT = { x: -ENTRY.x, y: Y_IN }
  const UIN = { x: Math.cos(-ALPHA0), y: Math.sin(-ALPHA0) }
  const SRC = { x: ENTRY.x - UIN.x * 1.4, y: ENTRY.y - UIN.y * 1.4 }
  // the screen (board 2): perpendicular to the fan's middle, 2.35 out; it lengthens for IV
  const TH_C = -ALPHA0 + rad(70.5)
  const L2 = 2.5
  const SCR_C = { x: EXIT.x + Math.cos(TH_C) * L2, y: EXIT.y + Math.sin(TH_C) * L2 }
  const SCR_T = { x: -Math.sin(TH_C), y: Math.cos(TH_C) }
  /** distance along the screen from its centre where a ray leaving EXIT with deviation d lands */
  function uOf(d: number) {
    const th = -ALPHA0 + d
    const dx = Math.cos(th)
    const dy = Math.sin(th)
    const den = dx * SCR_T.y - dy * SCR_T.x
    const qx = SCR_C.x - EXIT.x
    const qy = SCR_C.y - EXIT.y
    return (qx * dy - qy * dx) / den
  }
  const U0 = uOf(rad(62.5))
  const U1A = uOf(rad(77.5))
  const U1B = uOf(rad(87.5))
  const scr = makeBoard()
  scr.on = true
  function placeScreen(ext: number) {
    const u1 = lerp(U1A, U1B, ext)
    scr.ax = SCR_C.x + SCR_T.x * U0
    scr.ay = SCR_C.y + SCR_T.y * U0
    scr.bx = SCR_C.x + SCR_T.x * u1
    scr.by = SCR_C.y + SCR_T.y * u1
    return u1
  }
  placeScreen(0)
  // the hole for the experimentum crucis: just past violet's least deviation
  const D_HOLE = dMin(nGlass(397)) + rad(0.9)
  const TH_H = -ALPHA0 + D_HOLE
  const U_HOLE = uOf(D_HOLE)
  const HOLE_HALF = 0.0065
  const HX = SCR_C.x + SCR_T.x * U_HOLE
  const HY = SCR_C.y + SCR_T.y * U_HOLE
  // prism 2, inverted, at minimum deviation for the ray through the hole
  // (prism 1's own path, run backwards and turned to meet the ray through the hole)
  const ROT2 = Math.PI + (TH_H - ALPHA0)
  const rot2 = (p: { x: number; y: number }) => ({ x: p.x * Math.cos(ROT2) - p.y * Math.sin(ROT2), y: p.x * Math.sin(ROT2) + p.y * Math.cos(ROT2) })
  const P2C = (() => {
    const e = rot2(EXIT)
    return { x: HX + Math.cos(TH_H) * 0.42 - e.x, y: HY + Math.sin(TH_H) * 0.42 - e.y }
  })()
  const TH_O = TH_H - DMIN
  const P2OUT = (() => {
    const e = rot2(ENTRY)
    return { x: P2C.x + e.x, y: P2C.y + e.y }
  })()
  const wall = makeBoard()
  {
    const cx = P2OUT.x + Math.cos(TH_O) * 1.3
    const cy = P2OUT.y + Math.sin(TH_O) * 1.3
    const tx = -Math.sin(TH_O)
    const ty = Math.cos(TH_O)
    wall.ax = cx - tx * 0.34
    wall.ay = cy - ty * 0.34
    wall.bx = cx + tx * 0.34
    wall.by = cy + ty * 0.34
  }
  // prism 3, the recombiner: inverted, its first face parallel to prism 1's second, a narrow gap between
  const GAP = 0.075
  const NR1 = { x: Math.cos(NA[0]), y: Math.sin(NA[0]) }
  const TR1 = { x: -NR1.y, y: NR1.x }
  const TAU3 = (() => {
    const u = { x: Math.cos(ALPHA0), y: Math.sin(ALPHA0) }
    const dn = u.x * NR1.x + u.y * NR1.y
    const hx = EXIT.x + (u.x * GAP) / dn
    const hy = EXIT.y + (u.y * GAP) / dn
    return hx * TR1.x + hy * TR1.y
  })()
  const p3At = (slide: number) => ({ x: NR1.x * (2 * INR + GAP) + TR1.x * (TAU3 + slide), y: NR1.y * (2 * INR + GAP) + TR1.y * (TAU3 + slide) })

  const P1 = makePrism()
  const P2 = makePrism()
  const P3 = makePrism()
  P1.on = true
  placePrism(P1, 0, 0, 0)
  placePrism(P2, P2C.x, P2C.y, ROT2)

  /* ----------------------------------------------------------- tracing */

  // in V the beam widens into a bundle of parallel rays: BK per wash wavelength
  const BK = preview ? 4 : 6
  const NT = NR + NW * (BK - 1)
  const BW_V = 0.12
  const RX = new Float32Array(NT * MAXP)
  const RY = new Float32Array(NT * MAXP)
  const RO = new Float32Array(NT * MAXP)
  const RN = new Uint8Array(NT)
  const REND = new Uint8Array(NT)
  const RS = new Float32Array(NT)
  const RPASS = new Uint8Array(NR)
  // scratch ray for single traces (ticks, readouts)
  const SXa = new Float32Array(MAXP)
  const SYa = new Float32Array(MAXP)
  const SOa = new Float32Array(MAXP)
  const single = { n: 0, end: 0, s: 0, pass: 0, tir: 0, dx: 0, dy: 0, firstHit: -1, firstEdge: -1, cosi: 0 }
  const prisms = [P1, P2, P3]
  // V's last screen, where the recombined light lands white
  const fin = makeBoard()
  const boards = [scr, wall, fin]

  /** Trace one ray through the active prisms and boards. Writes points + optical path. */
  function traceInto(px: number, py: number, dx: number, dy: number, n: number, X: Float32Array, Y: Float32Array, O: Float32Array, off: number) {
    let x = px
    let y = py
    let inside = -1
    let opl = 0
    let cnt = 0
    X[off] = x
    Y[off] = y
    O[off] = 0
    cnt = 1
    single.end = END_NONE
    single.pass = 0
    single.tir = 0
    single.firstHit = -1
    let lastBoard = -1
    for (let bounce = 0; bounce < MAXP - 2; bounce++) {
      let best = 1e9
      let hp = -1
      let he = -1
      let hb = -1
      let hs = 0
      for (let pi = 0; pi < 3; pi++) {
        const p = prisms[pi]
        if (!p.on) continue
        for (let e = 0; e < 3; e++) {
          const ax = p.vx[e]
          const ay = p.vy[e]
          const ex = p.vx[(e + 1) % 3] - ax
          const ey = p.vy[(e + 1) % 3] - ay
          const den = dx * ey - dy * ex
          if (Math.abs(den) < 1e-12) continue
          const qx = ax - x
          const qy = ay - y
          const t = (qx * ey - qy * ex) / den
          if (t < 1e-7 || t >= best) continue
          const s = (qx * dy - qy * dx) / den
          if (s < 0 || s > 1) continue
          best = t
          hp = pi
          he = e
          hb = -1
        }
      }
      for (let bi = 0; bi < 3; bi++) {
        const b = boards[bi]
        if (!b.on || bi === lastBoard) continue
        const ex = b.bx - b.ax
        const ey = b.by - b.ay
        const den = dx * ey - dy * ex
        if (Math.abs(den) < 1e-12) continue
        const qx = b.ax - x
        const qy = b.ay - y
        const t = (qx * ey - qy * ex) / den
        if (t < 1e-7 || t >= best) continue
        const s = (qx * dy - qy * dx) / den
        if (s < 0 || s > 1) continue
        best = t
        hb = bi
        hp = -1
        hs = s
      }
      if (hp < 0 && hb < 0) {
        const far = 14
        x += dx * far
        y += dy * far
        opl += far
        X[off + cnt] = x
        Y[off + cnt] = y
        O[off + cnt] = opl
        cnt++
        break
      }
      x += dx * best
      y += dy * best
      opl += best * (inside >= 0 ? n : 1)
      X[off + cnt] = x
      Y[off + cnt] = y
      O[off + cnt] = opl
      cnt++
      if (hb >= 0) {
        const b = boards[hb]
        if (b.h0 >= 0 && hs >= b.h0 && hs <= b.h1) {
          if (hb === 0) single.pass = 1
          lastBoard = hb
          continue
        }
        single.end = hb === 0 ? END_SCREEN : hb === 1 ? END_WALL : END_FINAL
        single.s = hs
        break
      }
      lastBoard = -1
      // refraction (or total internal reflection) at a glass face
      const p = prisms[hp]
      const exiting = inside === hp
      const Nx = exiting ? -p.nx[he] : p.nx[he]
      const Ny = exiting ? -p.ny[he] : p.ny[he]
      const eta = exiting ? n : 1 / n
      let cosi = -(dx * Nx + dy * Ny)
      if (cosi < 0) cosi = 0
      if (single.firstHit < 0) {
        single.firstHit = hp
        single.firstEdge = he
        single.cosi = cosi
      }
      const kk = 1 - eta * eta * (1 - cosi * cosi)
      if (kk < 0) {
        dx += 2 * cosi * Nx
        dy += 2 * cosi * Ny
        single.tir = 1
      } else {
        const c = eta * cosi - Math.sqrt(kk)
        dx = eta * dx + c * Nx
        dy = eta * dy + c * Ny
        inside = exiting ? -1 : hp
      }
      const l = Math.hypot(dx, dy)
      dx /= l
      dy /= l
    }
    single.n = cnt
    single.dx = dx
    single.dy = dy
    return cnt
  }

  // centre V's last screen on the recombined D-line ray, 1.1 beyond the inverted prism
  {
    const c3 = p3At(0)
    placePrism(P3, c3.x, c3.y, Math.PI)
    P3.on = true
    const was = scr.on
    scr.on = false
    traceInto(SRC.x, SRC.y, UIN.x, UIN.y, n589, SXa, SYa, SOa, 0)
    scr.on = was
    P3.on = false
    const n = single.n
    const qx = SXa[n - 2]
    const qy = SYa[n - 2]
    const cx = qx + single.dx * 1.15
    const cy = qy + single.dy * 1.15
    fin.ax = cx + single.dy * 0.3
    fin.ay = cy - single.dx * 0.3
    fin.bx = cx - single.dy * 0.3
    fin.by = cy + single.dx * 0.3
  }

  /* ----------------------------------------------------------- layout */

  let w = env.width
  let h = env.height
  let pad = 20
  let portrait = false
  let short = false
  let tiny = false
  let sideCap = false
  let phi = 0
  // target rect for the apparatus
  let rx0 = 0
  let ry0 = 0
  let rx1 = 1
  let ry1 = 1
  let capX = 20
  let capY = 20
  let capSize = 30
  let capW = 400
  let rulerOn = true
  // framings (canonical bboxes) for the chapters
  interface Frame {
    s: number
    mx: number
    my: number
    /** the screen rect this chapter's drawing is fitted into */
    x0: number
    y0: number
    x1: number
    y1: number
  }
  const F: Frame[] = [
    { s: 1, mx: 0, my: 0, x0: 0, y0: 0, x1: 1, y1: 1 },
    { s: 1, mx: 0, my: 0, x0: 0, y0: 0, x1: 1, y1: 1 },
    { s: 1, mx: 0, my: 0, x0: 0, y0: 0, x1: 1, y1: 1 },
  ]
  const FPTS: number[][] = [
    // I–III: shutter, prism, fan, screen
    [SRC.x - 0.22, SRC.y + 0.05, SRC.x - 0.05, SRC.y - 0.28, 0, -CIRC - 0.12, 0.62, 0.4, -0.62, 0.42, scr.ax, scr.ay, scr.bx, scr.by, scr.ax + 0.3, scr.ay - 0.12, scr.bx + 0.32, scr.by + 0.12],
    // IV: prism, boards, prism 2, wall
    [-0.62, 0.32, 0, -CIRC - 0.1, scr.ax, scr.ay, SCR_C.x + SCR_T.x * U1B, SCR_C.y + SCR_T.y * U1B, P2.vx[0], P2.vy[0] + 0.16, P2.vx[1], P2.vy[1], P2.vx[2], P2.vy[2], wall.ax + 0.2, wall.ay - 0.1, wall.bx + 0.25, wall.by + 0.08, P2C.x, P2C.y - 0.55],
    // V: the beam's last stretch, prism, recombiner, the white beam out
    [SRC.x - 0.1, SRC.y + 0.12, SRC.x - 0.1, SRC.y - 0.22, 0, -CIRC - 0.14, -0.6, 0.45, p3At(0).x + 0.55, p3At(0).y + 0.5, fin.ax + 0.12, fin.ay - 0.1, fin.bx + 0.12, fin.by + 0.06, p3At(0).x + 0.2, p3At(0).y - 0.6],
  ]

  function fitFrames(ph: number) {
    const c = Math.cos(ph)
    const s = Math.sin(ph)
    let worst = Infinity
    for (let f = 0; f < 3; f++) {
      const p = FPTS[f]
      let x0 = Infinity
      let x1 = -Infinity
      let y0 = Infinity
      let y1 = -Infinity
      for (let i = 0; i < p.length; i += 2) {
        const X = p[i] * c - p[i + 1] * s
        const Y = p[i] * s + p[i + 1] * c
        x0 = Math.min(x0, X)
        x1 = Math.max(x1, X)
        y0 = Math.min(y0, Y)
        y1 = Math.max(y1, Y)
      }
      // V's beam arrives from the lower left, where the caption sits: lift it clear
      const fr = F[f]
      fr.x0 = rx0
      fr.x1 = rx1
      fr.y0 = ry0
      fr.y1 = f === 2 && !portrait && !sideCap ? Math.min(ry1, capY - 44) : ry1
      const sc = Math.min((fr.x1 - fr.x0) / (x1 - x0), (fr.y1 - fr.y0) / (y1 - y0))
      F[f].s = sc
      F[f].mx = (x0 + x1) / 2
      F[f].my = (y0 + y1) / 2
      worst = Math.min(worst, sc)
    }
    return worst
  }

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.08
    short = h < 440
    tiny = Math.min(w, h) < 300 || preview
    sideCap = !portrait && short && w / h > 1.6
    pad = clamp(Math.min(w, h) * 0.045, tiny ? 10 : 14, 38)
    rulerOn = !preview && h >= 280
    const rulerH = rulerOn ? 22 : 4
    const top = pad + (tiny ? 30 : 44)
    if (portrait) {
      capSize = clamp(Math.min(w * 0.075, h * 0.042), 18, 40)
      capX = pad
      capW = w - pad * 2
      capY = h - pad - rulerH - capSize * 2.3
      rx0 = pad
      rx1 = w - pad
      ry0 = top + (tiny ? 18 : 34)
      ry1 = capY - capSize * 0.6
    } else if (sideCap) {
      capSize = clamp(Math.min(h * 0.085, w * 0.035), 14, 30)
      capW = clamp(w * 0.3, 140, 300)
      capX = pad
      capY = h - pad - rulerH - capSize * 2.3
      rx0 = pad + capW
      rx1 = w - pad
      ry0 = top
      ry1 = h - pad - rulerH
    } else {
      capSize = clamp(Math.min(w * 0.04, h * 0.058), tiny ? 15 : 20, 50)
      capX = pad * 1.3
      capW = w * 0.45
      capY = h - pad - rulerH - capSize * 2.3
      rx0 = pad
      rx1 = w - pad
      ry0 = top + (short ? 0 : 10)
      // squarish or short frames keep the drawing above the caption; wide ones let it share the corner
      ry1 = short || w < h * 1.45 ? capY - (tiny ? 12 : 20) : h - pad - rulerH - 6
    }
    // pick the orientation that frames all three chapters largest (reading left to right)
    const cands = portrait ? [Math.PI / 2 - 0.25, Math.PI / 2, Math.PI / 2 - 0.55, Math.PI / 3] : sideCap ? [0, -0.2] : [0]
    let best = -1
    let bestPh = 0
    for (const ph of cands) {
      const sc = fitFrames(ph)
      if (sc > best * 1.04) {
        best = sc
        bestPh = ph
      }
    }
    phi = bestPh
    fitFrames(phi)
  }
  layout()

  /* ----------------------------------------------------------- camera */

  let cs = 1
  let cmx = 0
  let cmy = 0
  let cc = 1
  let csn = 0
  let rcx = 0
  let rcy = 0
  function camera(T: number) {
    // which framing, and the blend into the next
    let a = 0
    let b = 0
    let u = 0
    if (T < 31) {
      a = 0
      b = 1
      u = ease.inOutCubic(clamp((T - 30.6) / 2.6))
      if (T < 30.6) u = 0
    } else if (T < 46) {
      a = 1
      b = 2
      u = ease.inOutCubic(clamp((T - 46.6) / 2.4))
      if (T >= 30.6 && T < 33.2) {
        a = 0
        b = 1
        u = ease.inOutCubic(clamp((T - 30.6) / 2.6))
      }
    } else {
      a = 1
      b = 2
      u = ease.inOutCubic(clamp((T - 46.6) / 2.4))
      if (T > 56.8) {
        a = 2
        b = 0
        u = ease.inOutCubic(clamp((T - 56.8) / 3))
      }
    }
    const fa = F[a]
    const fb = F[b]
    cs = Math.exp(lerp(Math.log(fa.s), Math.log(fb.s), u))
    cmx = lerp(fa.mx, fb.mx, u)
    cmy = lerp(fa.my, fb.my, u)
    cc = Math.cos(phi)
    csn = Math.sin(phi)
    rcx = lerp((fa.x0 + fa.x1) / 2, (fb.x0 + fb.x1) / 2, u)
    rcy = lerp((fa.y0 + fa.y1) / 2, (fb.y0 + fb.y1) / 2, u)
  }
  const sx = (x: number, y: number) => rcx + cs * (x * cc - y * csn - cmx)
  const sy = (x: number, y: number) => rcy + cs * (x * csn + y * cc - cmy)
  function toCanon(X: number, Y: number) {
    const ux = (X - rcx) / cs + cmx
    const uy = (Y - rcy) / cs + cmy
    return { x: ux * cc + uy * csn, y: -ux * csn + uy * cc }
  }
  function enterCanon() {
    const d = env.dpr
    ctx.setTransform(d * cs * cc, d * cs * csn, -d * cs * csn, d * cs * cc, d * (rcx - cs * cmx), d * (rcy - cs * cmy))
  }
  const exitCanon = () => ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)

  /* ------------------------------------------------------ interaction */

  const at = Number(env.params.get('at'))
  let offset = Number.isFinite(at) && env.params.has('at') ? at : preview ? 12.5 : 0
  let prevT = -1
  let lastT = 0
  // user offsets that drift home after release
  // ?turn=… (test route) starts with the prism turned by that many degrees
  let uRot = env.params.has('turn') ? rad(Number(env.params.get('turn')) || 0) : 0
  let uSx = 0
  let uSy = 0
  let release = 1e9
  let drag: 'none' | 'prism' | 'source' | 'ruler' = 'none'
  let grabA = 0
  let grabRot = 0
  let grabSx = 0
  let grabSy = 0
  let grabUx = 0
  let grabUy = 0
  let hover: 'none' | 'prism' | 'source' | 'ruler' = 'none'
  let hoverX = -1
  let touched = false
  let touch = false
  let used = 0
  // the wall's memory of landed colours (IV)
  const WB = 64
  const wallMem = new Float32Array(WB).fill(-1)

  const rulerY = () => h - pad * 0.55 - 4
  const onRuler = (x: number, y: number) => rulerOn && y > rulerY() - 20 && y < h && x > pad - 8 && x < w - pad + 8
  function curT() {
    return (((lastT + offset) % LOOP) + LOOP) % LOOP
  }
  function seekTo(x: number) {
    const T = curT()
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 1.6) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }

  /* -------------------------------------------------------- the state */

  // live geometry, recomputed each frame
  const src = { x: SRC.x, y: SRC.y }
  let dirx = UIN.x
  let diry = UIN.y
  let rho = 0
  let passNm = 0
  let passOn = 0
  let iNow = 0
  let dNow = 0
  let simple = true

  /** The authored prism rotation (radians, positive = more incidence). */
  let ROT_SIGN = 1
  {
    // which way round increases the angle of incidence?
    placePrism(P1, 0, 0, 0.05)
    const c1 = -(UIN.x * P1.nx[2] + UIN.y * P1.ny[2])
    placePrism(P1, 0, 0, 0)
    const c0 = -(UIN.x * P1.nx[2] + UIN.y * P1.ny[2])
    ROT_SIGN = c1 < c0 ? 1 : -1
  }
  // how far to turn the first prism in IV so that each end of the spectrum reaches the hole,
  // found with the tracer itself (turning the prism also moves the face the light leaves by)
  function landingU(rot: number, nm: number) {
    placePrism(P1, 0, 0, ROT_SIGN * rot)
    const was = scr.on
    scr.on = false
    traceInto(SRC.x, SRC.y, UIN.x, UIN.y, nGlass(nm), SXa, SYa, SOa, 0)
    scr.on = was
    placePrism(P1, 0, 0, 0)
    if (single.n < 4) return NaN
    // the segment leaving prism 1, extended to the screen's line
    const qx = SXa[2]
    const qy = SYa[2]
    const dx = SXa[3] - qx
    const dy = SYa[3] - qy
    const den = dx * SCR_T.y - dy * SCR_T.x
    return ((SCR_C.x - qx) * dy - (SCR_C.y - qy) * dx) / den
  }
  // turning one way the exit face first slides back, then the growing deviation wins: search
  // only the monotonic stretch, on whichever side of zero carries red past the hole
  const CRUX_SIGN = (() => {
    const up = landingU(rad(16), 700)
    return Number.isFinite(up) && up > U_HOLE && up < 5 ? 1 : -1
  })()
  function rotFor(nm: number) {
    let lo = rad(3)
    let hi = rad(17.5)
    for (let it = 0; it < 34; it++) {
      const mid = (lo + hi) / 2
      const u = landingU(CRUX_SIGN * mid, nm)
      if (!Number.isFinite(u) || u < -2 || u > U_HOLE) hi = mid
      else lo = mid
    }
    return CRUX_SIGN * (lo + hi) / 2
  }
  /** the turn that brings each wavelength (400–700 nm, every 10) to the hole */
  const CRUX = Float32Array.from({ length: 31 }, (_, j) => rotFor(400 + j * 10))
  const cruxRot = (nm: number) => {
    const f = clamp((nm - 400) / 10, 0, 30)
    const j = Math.min(29, Math.floor(f))
    return lerp(CRUX[j], CRUX[j + 1], f - j)
  }

  function authoredRot(T: number) {
    if (T >= 22.8 && T < 30.8) {
      // rock through the minimum: more incidence first, then less
      const u = (T - 22.8) / 8
      const env1 = smoothstep(0, 0.12, u) * (1 - smoothstep(0.86, 1, u))
      const s = Math.sin(u * TAU)
      return (s > 0 ? rad(9.5) : rad(5)) * s * env1
    }
    if (T >= 34.0 && T < 47.6) {
      // Newton turns the first prism: violet first through the hole, then each colour in turn to red
      const down = ease.inOutCubic(clamp((T - 45.2) / 2.4))
      if (T < 35.4) return ease.inOutSine(clamp((T - 34.0) / 1.4)) * cruxRot(400) * (1 - down)
      return cruxRot(lerp(402, 698, ease.inOutSine(clamp((T - 35.4) / 8.6)))) * (1 - down)
    }
    return 0
  }

  /* ------------------------------------------------------------ sound */

  let chord: { osc: OscillatorNode[]; g: GainNode[]; master: GainNode } | null = null
  function chordSet(levels: number[]) {
    const ac = env.sfx.context()
    const out = env.sfx.output()
    if (!ac || !out) {
      stopChord()
      return
    }
    if (!chord) {
      const master = ac.createGain()
      master.gain.value = 0.0001
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1400
      master.connect(lp)
      lp.connect(out)
      const osc: OscillatorNode[] = []
      const g: GainNode[] = []
      VOICES.forEach((v, i) => {
        const o = ac.createOscillator()
        o.type = i % 2 ? 'triangle' : 'sine'
        o.frequency.value = v.hz
        o.detune.value = (i - 3) * 2
        const gg = ac.createGain()
        gg.gain.value = 0
        const pan = ac.createStereoPanner()
        pan.pan.value = (i / 6 - 0.5) * 0.9
        o.connect(gg)
        gg.connect(pan)
        pan.connect(master)
        o.start()
        osc.push(o)
        g.push(gg)
      })
      chord = { osc, g, master }
    }
    const now = ac.currentTime
    chord.master.gain.setTargetAtTime(0.05, now, 0.3)
    levels.forEach((l, i) => chord!.g[i].gain.setTargetAtTime(l * 0.55, now, 0.25))
  }
  function stopChord() {
    if (!chord) return
    try {
      chord.osc.forEach((o) => o.stop())
    } catch {
      /* already stopped */
    }
    chord = null
  }
  const voiceOf = (nm: number) => {
    let best = 0
    for (let i = 1; i < VOICES.length; i++) if (Math.abs(VOICES[i].nm - nm) < Math.abs(VOICES[best].nm - nm)) best = i
    return best
  }
  const levels = new Array(VOICES.length).fill(0)

  /* ------------------------------------------------------- drawing aids */

  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4] = {}) {
    ctx.save()
    setFont(ctx, o)
    // keep every label inside the frame
    const tw = ctx.measureText(o.upper ? str.toUpperCase() : str).width
    const al = o.align ?? 'left'
    const left = al === 'center' ? x - tw / 2 : al === 'right' ? x - tw : x
    const shift = left < 4 ? 4 - left : left + tw > w - 4 ? w - 4 - (left + tw) : 0
    x += shift
    y = clamp(y, 10, h - 4)
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(11,29,36,0.85)'
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }

  function strokePrism(p: Prism, prog: number, alpha: number, hatching: boolean) {
    if (prog <= 0 || alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = alpha
    // faint hatching for glass
    if (hatching && prog >= 1) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(p.vx[0], p.vy[0])
      ctx.lineTo(p.vx[1], p.vy[1])
      ctx.lineTo(p.vx[2], p.vy[2])
      ctx.closePath()
      ctx.clip()
      ctx.strokeStyle = 'rgba(238,244,241,0.06)'
      ctx.lineWidth = 1 / cs
      const gap = Math.max(4.5, cs * 0.035) / cs
      const a = p.rot - Math.PI / 4
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      ctx.beginPath()
      for (let d = -0.7; d <= 0.7; d += gap) {
        const px = p.cx - sa * d
        const py = p.cy + ca * d
        ctx.moveTo(px - ca, py - sa)
        ctx.lineTo(px + ca, py + sa)
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.strokeStyle = k.ink
    ctx.lineWidth = 1.1 / cs
    ctx.lineJoin = 'round'
    // draw on, edge by edge
    const total = 3 * prog
    ctx.beginPath()
    ctx.moveTo(p.vx[2], p.vy[2])
    for (let e = 0; e < 3; e++) {
      const f = clamp(total - e)
      if (f <= 0) break
      const a0 = (e + 2) % 3
      const a1 = e
      ctx.lineTo(lerp(p.vx[a0], p.vx[a1], f), lerp(p.vy[a0], p.vy[a1], f))
    }
    ctx.stroke()
    ctx.restore()
  }

  function strokeBoard(b: Board, prog: number, alpha: number, holeOpen: number) {
    if (prog <= 0 || alpha <= 0) return
    const ex = b.bx - b.ax
    const ey = b.by - b.ay
    const L = Math.hypot(ex, ey)
    const tx = ex / L
    const ty = ey / L
    // the board's thickness lies behind its face (away from the light)
    const th = 8 / cs
    const nx = ty
    const ny = -tx
    // which side faces the prism?
    const side = (0 - b.ax) * nx + (0 - b.ay) * ny > 0 ? -1 : 1
    const bx = nx * th * side
    const by = ny * th * side
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1 / cs
    const segs: [number, number][] = []
    const half = prog / 2
    const s0 = 0.5 - half
    const s1 = 0.5 + half
    if (b.h0 >= 0 && holeOpen > 0) {
      const hc = (b.h0 + b.h1) / 2
      const hw = ((b.h1 - b.h0) / 2) * holeOpen + (holeOpen > 0 ? 2.5 / cs / L : 0)
      if (hc - hw > s0) segs.push([s0, Math.min(s1, hc - hw)])
      if (hc + hw < s1) segs.push([Math.max(s0, hc + hw), s1])
    } else segs.push([s0, s1])
    for (const [a, c] of segs) {
      if (c <= a) continue
      const x0 = b.ax + ex * a
      const y0 = b.ay + ey * a
      const x1 = b.ax + ex * c
      const y1 = b.ay + ey * c
      // a solid night fill so the board hides what is behind it, then hatching
      ctx.fillStyle = 'rgba(11,29,36,0.96)'
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 + bx, y1 + by)
      ctx.lineTo(x0 + bx, y0 + by)
      ctx.closePath()
      ctx.fill()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = 'rgba(238,244,241,0.22)'
      ctx.beginPath()
      const step = 4 / cs
      const len = Math.hypot(x1 - x0, y1 - y0)
      for (let d = -th; d < len + th; d += step) {
        const px = x0 + tx * d
        const py = y0 + ty * d
        ctx.moveTo(px, py)
        ctx.lineTo(px + bx + tx * th, py + by + ty * th)
      }
      ctx.stroke()
      ctx.restore()
      ctx.strokeStyle = k.ink2
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 + bx, y1 + by)
      ctx.lineTo(x0 + bx, y0 + by)
      ctx.closePath()
      ctx.stroke()
    }
    ctx.restore()
  }

  /** the board's outward (away-from-prism) unit normal in screen space */
  function boardBack(b: Board) {
    const ex = b.bx - b.ax
    const ey = b.by - b.ay
    const L = Math.hypot(ex, ey)
    const nx = ey / L
    const ny = -ex / L
    const side = (0 - b.ax) * nx + (0 - b.ay) * ny > 0 ? -1 : 1
    const cx = (nx * cc - ny * csn) * side
    const cy = (nx * csn + ny * cc) * side
    return { x: cx, y: cy }
  }

  function captionAt(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.06
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = capY + capSize + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, capW + 40, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: k.ink })
        if (ln.em) {
          const col = cap.pass && passOn > 0.2 ? legible(passNm) : ACC
          text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: col })
        }
        ctx.restore()
      })
    }
  }

  /* ------------------------------------------------------------ frame */

  function frame(t: number, dt: number) {
    lastT = t
    const T = curT()
    const advancing = dt > 0 && prevT >= 0 && T >= prevT
    const crossed = (te: number) => advancing && prevT < te && te <= T
    if (prevT >= 0 && T < prevT - 1) wallMem.fill(-1)
    if (T < 34) wallMem.fill(-1)

    // drift the user's offsets home a few seconds after release
    if (drag === 'none' && dt > 0) {
      const since = t - release
      if (since > 2.6) {
        const kk = 1 - Math.exp(-1.6 * dt)
        uRot -= uRot * kk
        uSx -= uSx * kk
        uSy -= uSy * kk
      }
    }
    if (dt > 0) used = Math.max(0, used - dt * 0.15)

    // the ghost: a hand turning the prism, early in full mode
    let ghost = 0
    let ghostU = 0
    if (!preview && !touched && t < LOOP && T > 10.6 && T < 15.4) {
      ghostU = (T - 10.6) / 4.8
      ghost = smoothstep(0, 0.12, ghostU) * (1 - smoothstep(0.88, 1, ghostU))
    }
    const ghostRot = ghost * rad(9) * Math.sin(ghostU * Math.PI)

    rho = ROT_SIGN * (authoredRot(T) + ghostRot) + uRot
    placePrism(P1, 0, 0, rho)
    src.x = SRC.x + uSx
    src.y = SRC.y + uSy
    {
      const ax = ENTRY.x - src.x
      const ay = ENTRY.y - src.y
      const l = Math.hypot(ax, ay) || 1
      dirx = ax / l
      diry = ay / l
    }

    // which apparatus is in place
    const scrIn = smoothstep(5.2, 6.6, T) * (1 - smoothstep(46.4, 47.8, T))
    const holeOpen = smoothstep(33.0, 33.9, T) * (1 - smoothstep(46.0, 46.8, T))
    const crucis = smoothstep(32.6, 34.2, T) * (1 - smoothstep(46.2, 47.6, T))
    const p2Prog = ease.inOutCubic(clamp((T - 33.4) / 1.6))
    const p3Slide = T >= 48 ? ease.outCubic(clamp((T - 48.2) / 2.6)) : 0
    const p3Alpha = smoothstep(48.0, 48.8, T)
    const fadeAll = 1 - smoothstep(56.6, 59.2, T)
    scr.on = scrIn > 0.02
    const u1 = placeScreen(ease.inOutCubic(smoothstep(31.2, 33.4, T) * (1 - smoothstep(46.4, 47.6, T))))
    const sHole = (U_HOLE - U0) / (u1 - U0)
    const hw = HOLE_HALF / (u1 - U0)
    scr.h0 = holeOpen > 0.5 ? sHole - hw : -1
    scr.h1 = holeOpen > 0.5 ? sHole + hw : -1
    wall.on = crucis > 0.3
    P2.on = crucis > 0.3 && p2Prog > 0.6
    P3.on = p3Alpha > 0.5 && T < 59.5
    fin.on = T > 47.5 && T < 59.5
    if (P3.on) {
      const c3 = p3At((1 - p3Slide) * 1.9)
      placePrism(P3, c3.x, c3.y, Math.PI)
    }

    camera(T)

    // trace every wavelength
    passNm = 0
    let passCount = 0
    const bundle = smoothstep(47.0, 48.6, T) * (1 - smoothstep(58.4, 59.6, T))
    const bw = BW_V * bundle
    for (let i = 0; i < NR; i++) {
      // in V the wash rays spread across the widened beam (the comb stays on the axis)
      const off = i < NW && bw > 0 ? ((i * 0.6180339 + 0.5 / BK) % 1 - 0.5) * bw : 0
      traceInto(src.x - diry * off, src.y + dirx * off, dirx, diry, NIDX[i], RX, RY, RO, i * MAXP)
      RN[i] = single.n
      REND[i] = single.end
      RS[i] = single.s
      RPASS[i] = single.pass
      if (single.pass) {
        passNm += NM[i]
        passCount++
      }
    }
    // the widened beam (V): parallel sub-rays either side of the centre
    if (bw > 0.0005) {
      const px = -diry
      const py = dirx
      for (let i = 0; i < NW; i++) {
        for (let e = 0; e < BK - 1; e++) {
          // stratified, and staggered by wavelength, so that together the sub-rays fill the beam evenly
          const off = ((((e + 1) / BK + 0.5 / BK + i * 0.6180339) % 1) - 0.5) * bw
          const ri = NR + i * (BK - 1) + e
          traceInto(src.x + px * off, src.y + py * off, dirx, diry, NIDX[i], RX, RY, RO, ri * MAXP)
          RN[ri] = single.n
          REND[ri] = single.end
          RS[ri] = single.s
        }
      }
    }
    passOn = lerp(passOn, passCount > 0 ? 1 : 0, dt > 0 ? 1 - Math.exp(-10 * dt) : 1)
    if (passCount) passNm /= passCount
    else passNm = passNm || 560

    // the D line, for the readouts and the deviation curve
    traceInto(src.x, src.y, dirx, diry, n589, SXa, SYa, SOa, 0)
    simple = single.firstHit === 0 && single.firstEdge === 2 && !single.tir
    iNow = Math.acos(clamp(single.cosi, -1, 1))
    {
      // deviation after prism 1 only: the direction of the segment leaving it
      const n = single.n
      let ox = 0
      let oy = 0
      if (n >= 3) {
        ox = SXa[2 + (n > 3 ? 1 : 0)] - SXa[2]
        oy = SYa[2 + (n > 3 ? 1 : 0)] - SYa[2]
        if (n > 3) {
          ox = SXa[3] - SXa[2]
          oy = SYa[3] - SYa[2]
        }
      }
      const a0 = Math.atan2(diry, dirx)
      const a1 = Math.atan2(oy, ox)
      dNow = Math.abs(((a1 - a0 + Math.PI * 3) % TAU) - Math.PI)
    }

    /* ---------------------------------------------------- paint */
    ground(ctx, w, h, 'night')

    const beamOn = smoothstep(0.2, 1.0, T)
    const frontOpl = T < 2.6 ? -1 : (T - 2.6) * 1.18
    const prismProg = ease.inOutCubic(clamp((T - 0.9) / 2.2))
    const barA = Math.max(smoothstep(11.2, 12.6, T) * (1 - smoothstep(30.2, 31.2, T)), smoothstep(34.6, 35.6, T) * (1 - smoothstep(45.4, 46.4, T))) * fadeAll

    // keep the light out from under the header text (and the enlarged strip, while it shows)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    setFont(ctx, { size: tiny ? 8.5 : 10, tracking: 0.16 })
    const kw = ctx.measureText(`${FIG} — SPECTRUM`).width
    ctx.rect(pad - 6, pad - 4, kw + 12, 20)
    ctx.rect(w - pad - 200, pad - 4, 206, (tiny ? 13 : 16) * 3 + 6)
    if (barA > 0.01 && barRoom()) {
      const br = barRect()
      ctx.rect(br.x - 8, br.y - 36, br.W + 16, 92)
    }
    ctx.clip('evenodd')
    enterCanon()
    // prisms (under the light)
    strokePrism(P1, prismProg, fadeAll, true)
    if (P2.on || (crucis > 0 && p2Prog > 0)) {
      placePrism(P2, P2C.x, P2C.y, ROT2)
      strokePrism(P2, p2Prog, crucis * fadeAll, true)
    }
    if (p3Alpha > 0 && T < 59.5) strokePrism(P3, 1, p3Alpha * fadeAll, true)

    // the light: the white beam to the first face, then one hairline per wavelength
    const lw = 1 / cs
    ctx.globalCompositeOperation = 'lighter'
    const beamA = beamOn * fadeAll
    if (frontOpl > 0 && beamA > 0) {
      const ex = RX[1]
      const ey = RY[1]
      const L0 = RO[1]
      const f = clamp(frontOpl / L0)
      ctx.strokeStyle = rgba(WHITE, 0.92 * beamA)
      ctx.lineWidth = 1.25 * lw
      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      ctx.lineTo(lerp(src.x, ex, f), lerp(src.y, ey, f))
      ctx.stroke()
      if (bw > 0.0005) {
        // the widened beam: its edges and lines between, to the first face
        ctx.lineWidth = lw
        ctx.strokeStyle = rgba(WHITE, 0.62 * beamA * bundle)
        ctx.beginPath()
        for (let q = 0; q < 7; q++) {
          if (q === 3) continue
          const off = (q / 6 - 0.5) * bw
          const ox = src.x - diry * off
          const oy = src.y + dirx * off
          traceInto(ox, oy, dirx, diry, n589, SXa, SYa, SOa, 0)
          ctx.moveTo(ox, oy)
          ctx.lineTo(SXa[1], SYa[1])
        }
        ctx.stroke()
        ctx.lineWidth = 1.25 * lw
      }
      // the leading spark of the arriving beam
      if (f < 1) {
        ctx.fillStyle = rgba(WHITE, 0.9 * beamA)
        ctx.beginPath()
        ctx.arc(lerp(src.x, ex, f), lerp(src.y, ey, f), 1.8 * lw, 0, TAU)
        ctx.fill()
      }
      // the partial reflection at the first face (Fresnel, unpolarised)
      if (f >= 1 && single.firstHit >= 0) {
        const ci = single.cosi
        const n = n589
        const st = Math.sqrt(Math.max(0, 1 - ci * ci)) / n
        const ct = Math.sqrt(Math.max(0, 1 - st * st))
        const rs = (ci - n * ct) / (ci + n * ct)
        const rp = (n * ci - ct) / (n * ci + ct)
        const R = (rs * rs + rp * rp) / 2
        const p = P1
        const e = single.firstEdge
        const nx = p.nx[e]
        const ny = p.ny[e]
        const dd = dirx * nx + diry * ny
        const rxv = dirx - 2 * dd * nx
        const ryv = diry - 2 * dd * ny
        const grow = clamp((frontOpl - L0) / 0.5) * 0.5
        ctx.strokeStyle = rgba(WHITE, clamp(R * 2.6) * beamA * 0.7)
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex + rxv * grow, ey + ryv * grow)
        ctx.stroke()
      }
    }
    // the dispersed rays
    if (frontOpl > 0 && beamA > 0) {
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      const subs = bw > 0.0005 ? BK - 1 : 0
      for (let i = 0; i < NR; i++) {
        const rule = RULE[i] === 1
        const al = rule ? beamA * (1 - bundle) : beamA * (1 + bundle * 0.55)
        if (al <= 0.003) continue
        ctx.strokeStyle = RPASS[i] ? css(COLV[i], 0.8) : COL[i]
        ctx.globalAlpha = al
        ctx.beginPath()
        for (let e = -1; e < (rule ? 0 : subs); e++) {
          const ri = e < 0 ? i : NR + i * (BK - 1) + e
          const o = ri * MAXP
          const n = RN[ri]
          if (n < 3 || RO[o + 1] >= frontOpl) continue
          ctx.moveTo(RX[o + 1], RY[o + 1])
          for (let q = 2; q < n; q++) {
            const a = RO[o + q - 1]
            const b = RO[o + q]
            if (b <= frontOpl) ctx.lineTo(RX[o + q], RY[o + q])
            else {
              const f = (frontOpl - a) / (b - a)
              ctx.lineTo(lerp(RX[o + q - 1], RX[o + q], f), lerp(RY[o + q - 1], RY[o + q], f))
              break
            }
          }
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // the image on the screen: a strip of colour where the rays land, Fraunhofer lines dark in it
    const landed = frontOpl > 0 ? clamp((frontOpl - 5.6) / 0.6) : 0
    if (scrIn > 0 && landed > 0) {
      const ex = scr.bx - scr.ax
      const ey = scr.by - scr.ay
      const L = Math.hypot(ex, ey)
      const nx = ey / L
      const ny = -ex / L
      const side = (0 - scr.ax) * nx + (0 - scr.ay) * ny > 0 ? 1 : -1
      const fx = nx * side
      const fy = ny * side
      const depth = 7 / cs
      ctx.lineWidth = 1.6 / cs
      for (let i = 0; i < NR; i++) {
        if (REND[i] !== END_SCREEN) continue
        const s = RS[i]
        const px = scr.ax + ex * s
        const py = scr.ay + ey * s
        ctx.strokeStyle = css(COLV[i], 0.85 * landed * scrIn * fadeAll)
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px + fx * depth, py + fy * depth)
        ctx.stroke()
      }
    }
    // the wall's spots (IV)
    if (crucis > 0) {
      ctx.lineWidth = 2 / cs
      const ex = wall.bx - wall.ax
      const ey = wall.by - wall.ay
      for (let i = 0; i < NR; i++) {
        if (REND[i] !== END_WALL) continue
        const s = RS[i]
        const b = clamp(Math.floor(((NM[i] - 396) / 308) * WB), 0, WB - 1)
        if (advancing) wallMem[b] = s
        const px = wall.ax + ex * s
        const py = wall.ay + ey * s
        ctx.fillStyle = css(COLV[i], 0.9 * crucis)
        ctx.beginPath()
        ctx.arc(px, py, 2.4 / cs, 0, TAU)
        ctx.fill()
      }
    }
    ctx.globalCompositeOperation = 'source-over'

    // the light landing on V's last screen: short strokes into it, added together
    const finIn = smoothstep(47.6, 49.0, T) * fadeAll
    if (finIn > 0) {
      const ex = fin.bx - fin.ax
      const ey = fin.by - fin.ay
      ctx.lineWidth = 1.4 / cs
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < NT; i++) {
        if (REND[i] !== END_FINAL || (i < NR && RULE[i])) continue
        const px = fin.ax + ex * RS[i]
        const py = fin.ay + ey * RS[i]
        const li = i < NR ? i : Math.floor((i - NR) / (BK - 1))
        ctx.strokeStyle = COL[li]
        ctx.globalAlpha = finIn * 0.8
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px - UIN.x * (7 / cs), py - UIN.y * (7 / cs))
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
    // boards over the ray ends
    if (finIn > 0) strokeBoard(fin, ease.inOutCubic(clamp((T - 47.6) / 1.6)), finIn, 0)
    if (scrIn > 0) strokeBoard(scr, ease.inOutCubic(scrIn), fadeAll, holeOpen)
    if (crucis > 0) {
      strokeBoard(wall, ease.inOutCubic(clamp((T - 33.9) / 1.4)), crucis * fadeAll, 0)
      // the wall's memory: one short tick per colour that has landed
      const ex = wall.bx - wall.ax
      const ey = wall.by - wall.ay
      const L = Math.hypot(ex, ey)
      const nx = ey / L
      const ny = -ex / L
      const side = (P2C.x - wall.ax) * nx + (P2C.y - wall.ay) * ny > 0 ? 1 : -1
      ctx.lineWidth = 1.4 / cs
      for (let b = 0; b < WB; b++) {
        if (wallMem[b] < 0) continue
        const nm = 396 + ((b + 0.5) / WB) * 308
        const px = wall.ax + ex * wallMem[b]
        const py = wall.ay + ey * wallMem[b]
        ctx.strokeStyle = css(spectral(nm), 0.8 * crucis * fadeAll)
        ctx.beginPath()
        ctx.moveTo(px + nx * side * 2 / cs, py + ny * side * 2 / cs)
        ctx.lineTo(px + nx * side * 9 / cs, py + ny * side * 9 / cs)
        ctx.stroke()
      }
    }
    exitCanon()
    ctx.restore()

    /* ------------------------------------------------- annotation */
    const fs = tiny ? 8 : 9
    const showLabels = !tiny
    // the shutter: a hairline bar with the hole
    {
      const X = sx(src.x, src.y)
      const Y = sy(src.x, src.y)
      const a = beamOn * fadeAll
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = k.ink2
      ctx.lineWidth = 1
      // the shutter is perpendicular to the beam
      const bx = -diry * cc - dirx * csn
      const by = -diry * csn + dirx * cc
      const gapH = Math.max(4, (BW_V * smoothstep(47.0, 48.6, T) * (1 - smoothstep(58.4, 59.6, T)) * cs) / 2 + 3)
      const len = (tiny ? 16 : 26) + gapH - 4
      ctx.beginPath()
      ctx.moveTo(X + bx * gapH, Y + by * gapH)
      ctx.lineTo(X + bx * len, Y + by * len)
      ctx.moveTo(X - bx * gapH, Y - by * gapH)
      ctx.lineTo(X - bx * len, Y - by * len)
      ctx.stroke()
      ctx.strokeStyle = hover === 'source' || drag === 'source' ? k.ink : k.ink2
      ctx.beginPath()
      ctx.arc(X, Y, hover === 'source' || drag === 'source' ? 6 : 3.2, 0, TAU)
      ctx.stroke()
      if (showLabels && X > 0 && X < w && Y > 0 && Y < h) {
        // try spots round the shutter: inside the frame, clear of the caption and the header, away from the beam
        setFont(ctx, { size: fs - 0.5, tracking: 0.12 })
        const tw = ctx.measureText('HOLE IN THE SHUTTER').width
        const bdx = dirx * cc - diry * csn
        const bdy = dirx * csn + diry * cc
        let best = -Infinity
        let lx = X
        let ly = Y
        for (let q = 0; q < 12; q++) {
          const a2 = (q / 12) * TAU
          const cx2 = X + Math.cos(a2) * (tw / 2 + 12)
          const cy2 = Y + Math.sin(a2) * 22
          let score = 0
          if (cx2 - tw / 2 < 4 || cx2 + tw / 2 > w - 4 || cy2 - 10 < pad + 26 || cy2 + 16 > h - 4) score -= 100
          if (cx2 + tw / 2 > capX - 6 && cx2 - tw / 2 < capX + capW && cy2 + 16 > capY - 16) score -= 100
          // distance from the beam's line, and being behind the shutter rather than along the light
          const along = (cx2 - X) * bdx + (cy2 - Y) * bdy
          const off = Math.abs((cx2 - X) * -bdy + (cy2 - Y) * bdx)
          score += Math.min(off, 30) - Math.max(0, along) * 0.6
          if (score > best) {
            best = score
            lx = cx2
            ly = cy2
          }
        }
        if (best > -50) {
          halo('SUNLIGHT', lx, ly, { size: fs, color: k.muted, align: 'center', tracking: 0.14 })
          halo('HOLE IN THE SHUTTER', lx, ly + 12, { size: fs - 0.5, color: k.muted, align: 'center', tracking: 0.12 })
        }
      }
      ctx.restore()
    }

    // prism label and apex angle
    if (prismProg >= 1 && showLabels) {
      const al = fadeAll * (1 - smoothstep(30.6, 31.6, T) * 0.6)
      const ax = sx(P1.vx[0], P1.vy[0])
      const ay = sy(P1.vx[0], P1.vy[0])
      const bx = sx(P1.vx[1], P1.vy[1])
      const by = sy(P1.vx[1], P1.vy[1])
      const cx2 = sx(P1.vx[2], P1.vy[2])
      const cy2 = sy(P1.vx[2], P1.vy[2])
      const a1 = Math.atan2(by - ay, bx - ax)
      const a2 = Math.atan2(cy2 - ay, cx2 - ax)
      ctx.save()
      ctx.globalAlpha = al * 0.9
      ctx.strokeStyle = k.ink2
      ctx.lineWidth = 1
      ctx.beginPath()
      const ra = Math.max(10, cs * 0.12)
      let da = a2 - a1
      while (da > Math.PI) da -= TAU
      while (da < -Math.PI) da += TAU
      ctx.arc(ax, ay, ra, a1, a1 + da, da < 0)
      ctx.stroke()
      const am = a1 + da / 2
      halo('60°', ax + Math.cos(am) * (ra + 11), ay + Math.sin(am) * (ra + 11) + 3, { size: fs, color: k.ink2, align: 'center' })
      // name under the base
      const mx = (bx + cx2) / 2
      const my = (by + cy2) / 2
      const ux = mx - sx(P1.cx, P1.cy)
      const uy = my - sy(P1.cx, P1.cy)
      const ul = Math.hypot(ux, uy) || 1
      if (T < 31) {
        halo('N-SF11 FLINT', mx + (ux / ul) * 18, my + (uy / ul) * 18 + 3, { size: fs, color: k.muted, align: 'center', tracking: 0.14 })
      }
      ctx.restore()
    }

    // screen ticks behind the screen; the dark Fraunhofer lines in the image itself
    if (scrIn > 0.3 && landed > 0) {
      const tk = smoothstep(8.4, 10.6, T) * fadeAll * (1 - smoothstep(31, 32.2, T) * 0.75)
      const fl = smoothstep(11.6, 13.4, T) * fadeAll * (1 - smoothstep(31, 32.2, T))
      const back = boardBack(scr)
      const ex = scr.bx - scr.ax
      const ey = scr.by - scr.ay
      const thick = 11
      ctx.save()
      ctx.lineWidth = 1
      if (tk > 0) {
        for (let nm = 400; nm <= 700; nm += 50) {
          traceInto(src.x, src.y, dirx, diry, nGlass(nm), SXa, SYa, SOa, 0)
          if (single.end !== END_SCREEN) continue
          const px = scr.ax + ex * single.s
          const py = scr.ay + ey * single.s
          const X = sx(px, py) + back.x * thick
          const Y = sy(px, py) + back.y * thick
          const end = nm === 400 || nm === 700
          const len = end ? 8 : 4
          const a = tk * clamp((T - 8.4 - ((nm - 400) / 300) * 1.6) / 0.5)
          if (a <= 0) continue
          ctx.globalAlpha = a
          ctx.strokeStyle = end ? k.ink2 : k.muted
          ctx.beginPath()
          ctx.moveTo(X, Y)
          ctx.lineTo(X + back.x * len, Y + back.y * len)
          ctx.stroke()
          if (end && !tiny) halo(String(nm), X + back.x * 20, Y + back.y * 20 + 3, { size: fs, color: k.ink2, align: 'center', tracking: 0.02 })
        }
      }
      if (fl > 0) {
        const front = { x: -back.x, y: -back.y }
        for (const [, nm] of FRAUNHOFER) {
          traceInto(src.x, src.y, dirx, diry, nGlass(nm), SXa, SYa, SOa, 0)
          if (single.end !== END_SCREEN) continue
          const X = sx(scr.ax + ex * single.s, scr.ay + ey * single.s)
          const Y = sy(scr.ax + ex * single.s, scr.ay + ey * single.s)
          ctx.globalAlpha = fl
          ctx.strokeStyle = 'rgba(8,20,26,0.95)'
          ctx.lineWidth = 1.1
          ctx.beginPath()
          ctx.moveTo(X + front.x * 0.6, Y + front.y * 0.6)
          ctx.lineTo(X + front.x * 7.5, Y + front.y * 7.5)
          ctx.stroke()
        }
      }
      ctx.restore()
      if (showLabels && T < 31) {
        const a = smoothstep(8.4, 9.6, T) * fadeAll * (1 - smoothstep(30.4, 31.2, T))
        const ux = sx(scr.ax, scr.ay) - sx(scr.bx, scr.by)
        const uy = sy(scr.ax, scr.ay) - sy(scr.bx, scr.by)
        const ul = Math.hypot(ux, uy) || 1
        const X = sx(scr.ax, scr.ay) + (ux / ul) * 12 + back.x * 4
        const Y = sy(scr.ax, scr.ay) + (uy / ul) * 12 + back.y * 4
        halo('SCREEN', X, Y + 3, { size: fs, color: k.muted, tracking: 0.14, align: ux > 0.3 * ul ? 'left' : ux < -0.3 * ul ? 'right' : 'center', alpha: a })
      }
    }
    // the image on the screen, enlarged, as a printer's colour bar
    if (barA > 0.01 && barRoom()) drawBar(barA, T)

    // III: the deviation, dimensioned per colour
    const devA = smoothstep(21.4, 22.6, T) * (1 - smoothstep(30.2, 31.2, T)) * fadeAll
    if (devA > 0 && frontOpl > 6) {
      ctx.save()
      ctx.globalAlpha = devA
      ctx.lineWidth = 1
      // the undeviated direction, dashed, from the entry point
      const ex0 = RX[1]
      const ey0 = RY[1]
      const X0 = sx(ex0, ey0)
      const Y0 = sy(ex0, ey0)
      const dsx = dirx * cc - diry * csn
      const dsy = dirx * csn + diry * cc
      const reach = cs * 1.55
      ctx.strokeStyle = k.ink2
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(X0, Y0)
      ctx.lineTo(X0 + dsx * reach, Y0 + dsy * reach)
      ctx.stroke()
      ctx.setLineDash([])
      const pickNm = [656.3, 434.0]
      let devLx = -1
      let devLy = -1
      const devLab = ['', '']
      pickNm.forEach((nm, j) => {
        traceInto(src.x, src.y, dirx, diry, nGlass(nm), SXa, SYa, SOa, 0)
        if (single.n < 4 || single.tir) return
        // outgoing ray after prism 1: from point 2 toward point 3
        const qx = SXa[2]
        const qy = SYa[2]
        const ox = SXa[3] - qx
        const oy = SYa[3] - qy
        const ol = Math.hypot(ox, oy) || 1
        // vertex: intersection of the incoming line and the outgoing line (extended back)
        const den = dirx * (oy / ol) - diry * (ox / ol)
        if (Math.abs(den) < 1e-6) return
        const tt = ((qx - src.x) * (oy / ol) - (qy - src.y) * (ox / ol)) / den
        const vx = src.x + dirx * tt
        const vy = src.y + diry * tt
        const VX = sx(vx, vy)
        const VY = sy(vx, vy)
        const r = cs * (0.78 + j * 0.2) * (short ? 0.72 : 1)
        const aIn = Math.atan2(dsy, dsx)
        const osx = (ox / ol) * cc - (oy / ol) * csn
        const osy = (ox / ol) * csn + (oy / ol) * cc
        const aOut = Math.atan2(osy, osx)
        let da = aOut - aIn
        while (da > Math.PI) da -= TAU
        while (da < -Math.PI) da += TAU
        const col = legible(nm)
        ctx.strokeStyle = col
        ctx.beginPath()
        ctx.arc(VX, VY, r, aIn, aIn + da, da < 0)
        ctx.stroke()
        // arrowhead
        const ae = aIn + da
        const hx = VX + Math.cos(ae) * r
        const hy = VY + Math.sin(ae) * r
        const sgn = da < 0 ? -1 : 1
        ctx.beginPath()
        ctx.moveTo(hx + Math.cos(ae - sgn * 2.4) * 5, hy + Math.sin(ae - sgn * 2.4) * 5)
        ctx.lineTo(hx, hy)
        ctx.lineTo(hx + Math.cos(ae - sgn * 0.75) * 5, hy + Math.sin(ae - sgn * 0.75) * 5)
        ctx.stroke()
        // labels stack beside the outer arc's middle
        if (j === 1) {
          const am = aIn + da * 0.5
          devLx = VX + Math.cos(am) * (r + 12)
          devLy = VY + Math.sin(am) * (r + 12)
        }
        devLab[j] = `δ ${Math.round(nm)} NM  ${deg(Math.abs(da)).toFixed(1)}°`
      })
      if (devLx >= 0 && !tiny) {
        halo(devLab[0], devLx, devLy - 4, { size: fs, color: legible(656.3), tracking: 0.06 })
        halo(devLab[1], devLx, devLy + 9, { size: fs, color: legible(434), tracking: 0.06 })
      }
      ctx.restore()
    }

    // the deviation curve, δ(i), shown in III and whenever the prism is being turned
    const curveA = Math.max(devA, drag === 'prism' ? 1 : 0, used > 0 ? clamp(used * 3) : 0) * fadeAll
    if (curveA > 0.01 && curveRoom()) drawCurve(curveA)

    // IV annotations: the hole, the second prism, the wall
    if (crucis > 0.05 && showLabels) {
      const a = crucis * fadeAll
      const X = sx(HX, HY)
      const Y = sy(HX, HY)
      const back = boardBack(scr)
      const lx = X + back.x * 30
      const ly = Y + back.y * 30
      halo(passOn > 0.3 ? `HOLE · ${Math.round(passNm)} NM` : 'HOLE', lx, ly + 3, { size: fs, color: passOn > 0.3 ? legible(passNm) : k.ink2, align: back.x > 0.3 ? 'left' : back.x < -0.3 ? 'right' : 'center', tracking: 0.12, alpha: a })
      const p2x = sx(P2C.x, P2C.y)
      let p2b = -Infinity
      for (let q = 0; q < 3; q++) p2b = Math.max(p2b, sy(P2.vx[q], P2.vy[q]))
      halo('SECOND PRISM', p2x, p2b + 15, { size: fs, color: k.muted, align: 'center', tracking: 0.14, alpha: a * smoothstep(34.4, 35.4, T) })
      const wx = sx((wall.ax + wall.bx) / 2, (wall.ay + wall.by) / 2)
      const wy = sy((wall.ax + wall.bx) / 2, (wall.ay + wall.by) / 2)
      const wb = boardBack(wall)
      halo('WALL', wx + wb.x * 26, wy + wb.y * 26 + 3, { size: fs, color: k.muted, align: 'center', tracking: 0.14, alpha: a * smoothstep(34.8, 35.8, T) })
      if (passOn > 0.3) {
        halo(`${Math.round(passNm)} NM IN · ${Math.round(passNm)} NM OUT`, wx + wb.x * 26, wy + wb.y * 26 + 16, { size: fs - 0.5, color: legible(passNm), align: 'center', tracking: 0.1, alpha: a * passOn })
      }
    }
    // V: the recombined beam
    if (P3.on && p3Slide > 0.95 && showLabels) {
      const a = smoothstep(50.6, 51.6, T) * fadeAll
      const X = sx(P3.cx, P3.cy)
      let p3b = -Infinity
      for (let q = 0; q < 3; q++) p3b = Math.max(p3b, sy(P3.vx[q], P3.vy[q]))
      halo('INVERTED PRISM', X, p3b + 15, { size: fs, color: k.muted, align: 'center', tracking: 0.14, alpha: a })
      // beside the screen's lower end
      const lowA = sy(fin.ax, fin.ay) > sy(fin.bx, fin.by)
      const ex = lowA ? fin.ax : fin.bx
      const ey = lowA ? fin.ay : fin.by
      const ox = lowA ? fin.bx : fin.ax
      const oy = lowA ? fin.by : fin.ay
      const X1 = sx(ex, ey)
      const Y1 = sy(ex, ey)
      const ux = X1 - sx(ox, oy)
      const uy = Y1 - sy(ox, oy)
      const ul = Math.hypot(ux, uy) || 1
      halo('WHITE AGAIN', X1 + (ux / ul) * 14 + 4, Y1 + (uy / ul) * 14 + 4, { size: fs, color: k.ink2, align: 'left', tracking: 0.14, alpha: a })
    }

    // interaction marks: the turning handle, the ghost
    if (!preview) handles(T, ghost, ghostU)

    // sound
    if (env.sfx.enabled || chord) {
      if (!env.sfx.enabled) stopChord()
      else {
        for (let i = 0; i < VOICES.length; i++) {
          let l = 0
          if (T < 31) l = smoothstep(6.6 + i * 0.32, 7.6 + i * 0.32, T) * (1 - smoothstep(30.2, 32.4, T)) * 0.8
          if (T >= 33 && T < 47) l = passOn > 0.2 && voiceOf(passNm) === i ? 1 : 0
          if (T >= 50) l = smoothstep(50.4, 51.6, T) * 0.9
          levels[i] = l * fadeAll
        }
        chordSet(levels)
      }
    }
    if (crossed(4.05)) env.sfx.tone(1318.5, 1.6, { type: 'sine', gain: 0.05, room: 0.6 })
    if (crossed(33.4)) env.sfx.noise(0.08, { filter: 2400, q: 2, gain: 0.05 })

    captionAt(T)
    chrome(T)
    prevT = T
  }

  /** where the bar sits: free corner opposite the fan */
  function barRect() {
    const W = clamp(w * 0.24, 200, 420)
    return { x: w - pad - W, y: pad + 92, W }
  }
  /** the enlarged strip needs a free corner: wide, tall-enough landscape frames only */
  const barRoom = () => !portrait && !tiny && h >= 520 && w >= 760
  const D400 = dMin(nGlass(400))
  const D700 = dMin(nGlass(700))
  const barX = (nm: number) => (D400 - dMin(nGlass(nm))) / (D400 - D700)
  let barImg: HTMLCanvasElement | null = null
  let barW = 0
  function drawBar(a: number, T: number) {
    const r = barRect()
    const H = 16
    if (!barImg || barW !== Math.round(r.W * env.dpr)) {
      // render the strip once: one device-pixel column per position, coloured by the wavelength there
      barW = Math.round(r.W * env.dpr)
      barImg = document.createElement('canvas')
      barImg.width = Math.max(1, barW)
      barImg.height = 1
      const bc = barImg.getContext('2d')
      if (bc) {
        const img = bc.createImageData(barImg.width, 1)
        let nm = 400
        for (let x = 0; x < barImg.width; x++) {
          const target = x / Math.max(1, barImg.width - 1)
          while (nm < 700 && barX(nm + 0.25) < target) nm += 0.25
          const c = spectral(nm)
          img.data[x * 4] = Math.round(c[0] * 255)
          img.data[x * 4 + 1] = Math.round(c[1] * 255)
          img.data[x * 4 + 2] = Math.round(c[2] * 255)
          img.data[x * 4 + 3] = 255
        }
        bc.putImageData(img, 0, 0)
      }
    }
    ctx.save()
    ctx.globalAlpha = a
    text(ctx, 'THE SCREEN, ENLARGED · λ IN NM', r.x, r.y - 22, { size: 8.5, color: k.muted, tracking: 0.14 })
    // the strip, drawn as fine hairlines with gaps
    ctx.imageSmoothingEnabled = false
    for (let row = 0; row < H; row += 2) ctx.drawImage(barImg, 0, 0, barImg.width, 1, r.x, r.y + row, r.W, 1)
    ctx.imageSmoothingEnabled = true
    // Fraunhofer's dark lines and letters
    ctx.lineWidth = 1
    for (const [name, nm] of FRAUNHOFER) {
      const x = Math.round(r.x + barX(nm) * r.W) + 0.5
      ctx.strokeStyle = 'rgba(8,20,26,1)'
      ctx.beginPath()
      ctx.moveTo(x, r.y - 0.5)
      ctx.lineTo(x, r.y + H)
      ctx.stroke()
      ctx.strokeStyle = k.muted
      ctx.beginPath()
      ctx.moveTo(x, r.y - 3)
      ctx.lineTo(x, r.y - 6)
      ctx.stroke()
      text(ctx, name, x, r.y - 9, { size: 9, color: k.ink, align: 'center', tracking: 0 })
    }
    // the wavelength scale beneath: even in nanometres, uneven on the screen
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    for (let nm = 400; nm <= 700; nm += 10) {
      const x = Math.round(r.x + barX(nm) * r.W) + 0.5
      const l = nm % 100 === 0 ? 6 : nm % 50 === 0 ? 4 : 2
      ctx.moveTo(x, r.y + H + 1)
      ctx.lineTo(x, r.y + H + 1 + l)
    }
    ctx.stroke()
    for (const nm of [400, 450, 500, 550, 600, 700]) text(ctx, String(nm), r.x + barX(nm) * r.W, r.y + H + 17, { size: 8.5, color: nm % 100 === 0 ? k.ink2 : k.muted, align: 'center', tracking: 0.02 })
    // in IV: where the hole sits on this scale, and what passes
    if (T > 33 && T < 46.5 && passOn > 0.05) {
      const x = r.x + clamp(barX(passNm)) * r.W
      ctx.globalAlpha = a * passOn
      ctx.fillStyle = css(spectral(passNm, 1.15))
      ctx.beginPath()
      ctx.moveTo(x, r.y + H + 26)
      ctx.lineTo(x - 4, r.y + H + 33)
      ctx.lineTo(x + 4, r.y + H + 33)
      ctx.closePath()
      ctx.fill()
      text(ctx, `${Math.round(passNm)} NM THROUGH THE HOLE`, clamp(x, r.x + 70, r.x + r.W - 70), r.y + H + 46, { size: 8.5, color: legible(passNm), align: 'center', tracking: 0.12 })
    } else if (T < 31) {
      text(ctx, 'THE PRISM CROWDS THE RED', r.x + r.W, r.y + H + 32, { size: 8, color: k.muted, align: 'right', tracking: 0.12 })
    }
    ctx.restore()
  }

  /** the δ(i) plot needs a free corner */
  const curveRoom = () => !tiny && (sideCap ? h >= 280 && capW >= 150 : portrait ? false : w >= 900 && h >= 560)
  function drawCurve(a: number) {
    // a small plot of deviation against incidence for the D line, 589 nm
    const W = sideCap ? Math.min(capW - 34, 200) : clamp(w * 0.18, 150, 240)
    const H = W * (sideCap ? 0.5 : 0.6)
    const x0 = pad + 24
    const y0 = pad + (sideCap ? 34 : 44)
    const iLo = rad(48)
    const iHi = rad(90)
    const dLo = rad(64)
    const dHi = rad(84)
    const X = (i: number) => x0 + ((i - iLo) / (iHi - iLo)) * W
    const Y = (d: number) => y0 + H - ((d - dLo) / (dHi - dLo)) * H
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0, y0 + H)
    ctx.lineTo(x0 + W, y0 + H)
    for (let d = 50; d <= 90; d += 10) {
      const xx = X(rad(d))
      ctx.moveTo(xx, y0 + H)
      ctx.lineTo(xx, y0 + H + 3)
    }
    for (let d = 65; d <= 80; d += 5) {
      const yy = Y(rad(d))
      ctx.moveTo(x0 - 3, yy)
      ctx.lineTo(x0, yy)
    }
    ctx.stroke()
    text(ctx, 'DEVIATION δ AGAINST INCIDENCE i', x0 - 22, y0 - 10, { size: 8.5, color: k.muted, tracking: 0.12 })
    text(ctx, 'i', x0 + W + 6, y0 + H + 3, { size: 9, color: k.muted, tracking: 0 })
    for (const d of [50, 70, 90]) text(ctx, `${d}°`, X(rad(d)), y0 + H + 14, { size: 8, color: k.muted, align: 'center' })
    text(ctx, '70°', x0 - 6, Y(rad(70)) + 3, { size: 8, color: k.muted, align: 'right' })
    // curves for red, the D line and violet
    const curves: [number, string][] = [
      [656.3, css(spectral(656.3), 0.85)],
      [D_LINE, rgba(WHITE, 0.85)],
      [434, css(spectral(434, 1.15), 0.85)],
    ]
    for (const [nm, col] of curves) {
      const n = nGlass(nm)
      ctx.strokeStyle = col
      ctx.beginPath()
      let started = false
      for (let s = 0; s <= 60; s++) {
        const i = lerp(iLo, iHi, s / 60)
        const d = deviation(n, i)
        if (!Number.isFinite(d)) {
          started = false
          continue
        }
        const xx = X(i)
        const yy = Y(Math.min(dHi, d))
        if (!started) ctx.moveTo(xx, yy)
        else ctx.lineTo(xx, yy)
        started = true
      }
      ctx.stroke()
    }
    // the minimum, and where we are now
    const iMin = DMIN / 2 + APEX / 2
    ctx.strokeStyle = k.ink2
    ctx.setLineDash([1.5, 3])
    ctx.beginPath()
    ctx.moveTo(X(iMin), Y(DMIN))
    ctx.lineTo(X(iMin), y0 + H)
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, `MIN ${deg(DMIN).toFixed(1)}°`, X(iMin) + 5, Y(DMIN) + 12, { size: 8.5, color: k.ink2, tracking: 0.08 })
    if (simple && Number.isFinite(dNow)) {
      const xx = X(clamp(iNow, iLo, iHi))
      const yy = Y(clamp(dNow, dLo, dHi))
      ctx.fillStyle = WHITE
      ctx.beginPath()
      ctx.arc(xx, yy, 2.6, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = WHITE
      ctx.beginPath()
      ctx.arc(xx, yy, 5.5, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  function handles(T: number, ghost: number, ghostU: number) {
    const px = sx(P1.cx, P1.cy)
    const py = sy(P1.cx, P1.cy)
    const R = cs * CIRC + (touch ? 22 : 14)
    // a faint turning arc above the prism, once it has drawn
    const show = smoothstep(4, 5, T) * (1 - smoothstep(56.6, 58, T))
    if (show > 0) {
      const hot = hover === 'prism' || drag === 'prism'
      ctx.save()
      ctx.globalAlpha = show * (hot ? 0.95 : 0.4)
      ctx.strokeStyle = hot ? k.ink : k.ink2
      ctx.lineWidth = 1
      const a0 = -Math.PI / 2 - 0.5 + phi
      const a1 = -Math.PI / 2 + 0.5 + phi
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(px, py, R, a0, a1)
      ctx.stroke()
      ctx.setLineDash([])
      for (const [aa, sg] of [
        [a0, -1],
        [a1, 1],
      ] as const) {
        const hx = px + Math.cos(aa) * R
        const hy = py + Math.sin(aa) * R
        const ta = aa + (sg * Math.PI) / 2
        ctx.beginPath()
        ctx.moveTo(hx - Math.cos(ta - 0.5) * 4, hy - Math.sin(ta - 0.5) * 4)
        ctx.lineTo(hx, hy)
        ctx.lineTo(hx - Math.cos(ta + 0.5) * 4, hy - Math.sin(ta + 0.5) * 4)
        ctx.stroke()
      }
      if (hot && !tiny) halo(drag === 'prism' ? `i ${deg(iNow).toFixed(1)}° · δ ${deg(dNow).toFixed(1)}°` : 'DRAG TO TURN', px, py - R - 10, { size: 9, color: k.ink, align: 'center', tracking: 0.12 })
      ctx.restore()
    }
    if (ghost > 0) {
      const a = -Math.PI / 2 + phi + Math.sin(ghostU * Math.PI) * 0.75
      const gx = px + Math.cos(a) * R
      const gy = py + Math.sin(a) * R
      ctx.save()
      ctx.globalAlpha = ghost
      ctx.strokeStyle = k.ink
      ctx.fillStyle = k.ink
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.arc(px, py, R, -Math.PI / 2 + phi - 0.8, -Math.PI / 2 + phi + 0.8)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(gx, gy, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(gx, gy, 9, 0, TAU)
      ctx.stroke()
      halo(touch ? 'DRAG TO TURN THE PRISM' : 'DRAG TO TURN THE PRISM', px, py - R - 16, { size: 9.5, color: k.ink, align: 'center', tracking: 0.14 })
      ctx.restore()
    }
    // Newton's own gesture, offered in IV
    if (T > 35.2 && T < 44.8 && !touched && !tiny && !short && !portrait) {
      const a = smoothstep(35.2, 36.2, T) * (1 - smoothstep(43.8, 44.8, T))
      halo('TURN THE PRISM TO CHOOSE A COLOR', px, py - R - 12, { size: 9, color: k.ink2, align: 'center', tracking: 0.14, alpha: a })
    }
  }

  function chrome(T: number) {
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    const fs = tiny ? 8.5 : 10
    if (!preview) env.setCursor(drag === 'prism' || drag === 'source' ? 'grabbing' : hover === 'prism' || hover === 'source' ? 'grab' : hover === 'ruler' ? 'pointer' : 'default')
    text(ctx, `${FIG} — Spectrum`, pad, pad + 10, { size: tiny ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    // chapter label above the caption
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(57, 58.5, T) : 1)
    if (!preview || h > 260) text(ctx, `${c.num} — ${c.name}`, capX, capY - (tiny ? 2 : 6), { size: tiny ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true, alpha: kIn })
    // readouts, top right
    const rows: [string, string][] = []
    if (T < 9) rows.push(['light', 'white'], ['glass', 'N-SF11'])
    else if (T < 21) rows.push(['n 400 nm', nGlass(400).toFixed(4)], ['n 700 nm', nGlass(700).toFixed(4)], ['spread', `${deg(dMin(nGlass(400)) - dMin(nGlass(700))).toFixed(1)}°`])
    else if (T < 31 || T >= 46) rows.push(['i', simple ? `${deg(iNow).toFixed(1)}°` : '—'], ['δ 589 nm', simple ? `${deg(dNow).toFixed(2)}°` : '—'], ['δ min', `${deg(DMIN).toFixed(2)}°`])
    else rows.push(['hole', passOn > 0.3 ? `${Math.round(passNm)} nm` : '—'], ['turned', `${deg(Math.abs(rho)).toFixed(1)}°`], ['out', passOn > 0.3 ? `${Math.round(passNm)} nm` : '—'])
    if (tiny && rows.length > 2) rows.length = 2
    let y = pad + 10
    for (const [label, value] of rows) {
      setFont(ctx, { size: fs, tracking: 0.06 })
      text(ctx, value, w - pad, y, { size: fs, color: k.ink, align: 'right', tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, label, w - pad - vw - 10, y, { size: fs - 1, color: k.muted, align: 'right', tracking: 0.14, upper: true })
      y += tiny ? 13 : 16
    }
    // the chapter ruler
    if (rulerOn) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY()
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 60; i++) {
        const x = lerp(x0, x1, i / 60)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 5 === 0 ? 4 : 2))
      }
      ctx.stroke()
      // the visible band as a hairline strip under the ruler, the playhead over it
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360) {
        CHAPTERS.forEach((cc2, i) => {
          const x = lerp(x0, x1, cc2.t / LOOP)
          text(ctx, cc2.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
        })
      }
      if (hoverX >= 0) {
        const hx = clamp(hoverX, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c2, i) => (ht >= c2.t ? i : acc), 0)
        ctx.strokeStyle = C.sky
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: C.sky, align: 'center', tracking: 0.12 })
      }
    }
  }

  /* --------------------------------------------------------- hit tests */

  function overPrism(X: number, Y: number) {
    const px = sx(P1.cx, P1.cy)
    const py = sy(P1.cx, P1.cy)
    return Math.hypot(X - px, Y - py) < cs * CIRC + (touch ? 34 : 20)
  }
  function overSource(X: number, Y: number) {
    return Math.hypot(X - sx(src.x, src.y), Y - sy(src.x, src.y)) < (touch ? 30 : 16)
  }

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hover = 'none'
        hoverX = -1
        if (drag !== 'none') release = lastT
        drag = 'none'
        return
      }
      if (drag === 'ruler') {
        hoverX = p.x
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') {
          drag = 'none'
          hoverX = onRuler(p.x, p.y) ? p.x : -1
        }
        return
      }
      if (drag === 'prism') {
        if (p.type === 'move') {
          const a = Math.atan2(p.y - sy(P1.cx, P1.cy), p.x - sx(P1.cx, P1.cy))
          let d = a - grabA
          while (d > Math.PI) d -= TAU
          while (d < -Math.PI) d += TAU
          uRot = grabRot + d
          used = 1
        }
        if (p.type === 'up') {
          drag = 'none'
          release = lastT
        }
        return
      }
      if (drag === 'source') {
        if (p.type === 'move') {
          const q = toCanon(p.x, p.y)
          const q0 = toCanon(grabSx, grabSy)
          uSx = grabUx + (q.x - q0.x)
          uSy = grabUy + (q.y - q0.y)
          // keep the shutter to the left of the first face
          const nx = SRC.x + uSx
          if (nx > ENTRY.x - 0.25) uSx = ENTRY.x - 0.25 - SRC.x
          used = 1
        }
        if (p.type === 'up') {
          drag = 'none'
          release = lastT
        }
        return
      }
      const ruler = onRuler(p.x, p.y)
      const os = overSource(p.x, p.y)
      const op = !os && overPrism(p.x, p.y)
      hover = ruler ? 'ruler' : os ? 'source' : op ? 'prism' : 'none'
      hoverX = ruler ? p.x : -1
      if (p.type === 'down') {
        if (ruler) {
          drag = 'ruler'
          seekTo(p.x)
        } else if (os) {
          drag = 'source'
          touched = true
          grabSx = p.x
          grabSy = p.y
          grabUx = uSx
          grabUy = uSy
        } else if (op) {
          drag = 'prism'
          touched = true
          grabA = Math.atan2(p.y - sy(P1.cx, P1.cy), p.x - sx(P1.cx, P1.cy))
          grabRot = uRot
        }
      }
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      const T = curT()
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
    frame,
    destroy() {
      stopChord()
    },
  }
}

export default create
