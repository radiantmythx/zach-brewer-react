/*
 * FIG. S.06 — LAGRANGE
 *
 * The circular restricted three-body problem in the frame that turns with
 * the planet: a Sun, a Jupiter, and test particles too small to pull back.
 * In that frame gravity and the centrifugal effect combine into one
 * landscape, the Jacobi function 2Ω = x² + y² + 2(1 − μ)/r₁ + 2μ/r₂, drawn
 * here as topographic hairlines by marching squares on a polar grid that
 * crowds its rings near r = 1, where the interesting ground is. Its five
 * flat places are the Lagrange points: three saddles on the axis (L1–L3) and
 * two hilltops (L4, L5) at the corners of equilateral triangles.
 *
 * Particles are integrated in the inertial frame with kick-drift-kick
 * leapfrog under the two moving masses and drawn in the rotating frame;
 * their Jacobi constant is the check on the numerics.
 *
 *   I    Five places   the landscape draws on; L1–L5 are marked
 *   II   Knife edge    particles balanced on L1, L2, L3 slide away
 *   III  Trojans       swarms at L4 and L5 librate in tadpoles; horseshoes
 *                      wander round through L3
 *   IV   Webb          Sun–Earth: L1 and L2 1.5 million km from Earth, with
 *                      planar Lyapunov orbits found by differential correction
 *   V    Your turn     the Routh limit demonstrated, then free play
 *
 * Tap to drop a particle at rest anywhere: the region it can never enter
 * (2Ω < C) is hatched. Drag ← → to change the mass ratio μ.
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, mod, regMark, rgba, rng, setFont, smoothstep, text, gauss } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([
      document.fonts.load('400 40px "Instrument Serif"'),
      document.fonts.load('italic 400 40px "Instrument Serif"'),
      document.fonts.load('500 11px "Geist Mono"'),
    ]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.06'
const LOOP = 84
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Five places' },
  { t: 14, num: 'II', name: 'Knife edge' },
  { t: 30, num: 'III', name: 'Trojans' },
  { t: 52, num: 'IV', name: 'Webb' },
  { t: 66, num: 'V', name: 'Your turn' },
]
const MU_JUP = 9.537e-4
const MU_SE = 3.0035e-6
/** Gascheau–Routh: L4 and L5 are linearly stable while 27μ(1 − μ) < 1 */
const ROUTH = 0.5 * (1 - Math.sqrt(23 / 27))
const LOG_MU0 = Math.log10(1e-6)
const LOG_MU1 = Math.log10(0.5)
const PRESETS = [
  { mu: MU_SE, name: 'Sun–Earth' },
  { mu: MU_JUP, name: 'Sun–Jupiter' },
  { mu: 0.01215, name: 'Earth–Moon' },
  { mu: 0.1085, name: 'Pluto–Charon' },
]
const AU_KM = 1.495978707e8
const HOLD_AT = 80
const OUTRO = 82
const R_PLATE = 1.62
const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0]

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 1.6, t1: 12.6, lines: [{ s: 'Five places where' }, { s: 'a small thing ', em: 'can rest.' }] },
  { t0: 15.2, t1: 28.4, lines: [{ s: 'Three are balanced' }, { s: 'on ', em: 'a knife edge.' }] },
  { t0: 33.5, t1: 50.4, lines: [{ s: 'Two keep company' }, { s: '', em: 'forever.' }] },
  { t0: 54.6, t1: 64.6, lines: [{ s: 'We sent a telescope' }, { s: 'to ', em: 'the second.' }] },
  { t0: 67.4, t1: 73.4, lines: [{ s: 'Unless the planet' }, { s: 'grows ', em: 'too heavy.' }] },
  { t0: 74.4, t1: 81.6, lines: [{ s: 'Now drop' }, { s: '', em: 'your own.' }] },
]

/** Upper-case Latin letters only, so μ and λ survive in mono labels. */
const caps = (str: string) => str.replace(/[a-z]/g, (c) => c.toUpperCase())

/* ---------------------------------------------------------------- physics */

/** The Jacobi function 2Ω in the rotating frame (barycentre at the origin). */
function om2(x: number, y: number, mu: number) {
  const r1 = Math.sqrt((x + mu) * (x + mu) + y * y)
  const r2 = Math.sqrt((x - 1 + mu) * (x - 1 + mu) + y * y)
  return x * x + y * y + (2 * (1 - mu)) / Math.max(r1, 1e-9) + (2 * mu) / Math.max(r2, 1e-9)
}

interface LPoints {
  x: number[]
  y: number[]
  /** 2Ω at each point (the critical Jacobi constants) */
  c: number[]
  /** real growth rate at the collinear points (units⁻¹) */
  lam: number[]
}

function lagrangePoints(mu: number): LPoints {
  const f = (x: number) => {
    const d1 = x + mu
    const d2 = x - 1 + mu
    return x - ((1 - mu) * d1) / Math.abs(d1 * d1 * d1) - (mu * d2) / Math.abs(d2 * d2 * d2)
  }
  const solve = (x0: number, lo: number, hi: number) => {
    let x = x0
    for (let i = 0; i < 80; i++) {
      const hh = 1e-9
      const d = (f(x + hh) - f(x - hh)) / (2 * hh)
      let nx = x - f(x) / d
      if (!(nx > lo && nx < hi)) nx = (x + (nx > hi ? hi : lo)) / 2
      if (Math.abs(nx - x) < 1e-15) break
      x = nx
    }
    return x
  }
  const rh = Math.cbrt(mu / 3)
  const L1 = solve(1 - mu - rh * (1 - rh / 3), -mu + 1e-6, 1 - mu - 1e-9)
  const L2 = solve(1 - mu + rh * (1 + rh / 3), 1 - mu + 1e-9, 3)
  const L3 = solve(-1 - (5 * mu) / 12, -3, -mu - 1e-6)
  const xs = [L1, L2, L3, 0.5 - mu, 0.5 - mu]
  const ys = [0, 0, 0, Math.sqrt(3) / 2, -Math.sqrt(3) / 2]
  const lam = xs.slice(0, 3).map((x) => {
    const r1 = Math.abs(x + mu)
    const r2 = Math.abs(x - 1 + mu)
    const c2 = (1 - mu) / (r1 * r1 * r1) + mu / (r2 * r2 * r2)
    return Math.sqrt(Math.max(0, (c2 - 2 + Math.sqrt(9 * c2 * c2 - 8 * c2)) / 2))
  })
  return { x: xs, y: ys, c: xs.map((x, i) => om2(x, ys[i], mu)), lam }
}

/** Contour levels: dense between the critical values, sparser in the wells. */
function levelsFor(L: LPoints) {
  const [c1, c2, c3, c4] = L.c
  const out: { v: number; kind: 0 | 1 | 2 }[] = []
  const between = (a: number, b: number, n: number) => {
    for (let k = 1; k <= n; k++) out.push({ v: a + ((b - a) * k) / (n + 1), kind: 1 })
  }
  between(c4, c3, 3)
  out.push({ v: c3, kind: 2 })
  between(c3, c2, 2)
  out.push({ v: c2, kind: 2 })
  if (c1 - c2 > 1e-6) between(c2, c1, 1)
  out.push({ v: c1, kind: 2 })
  const span = Math.max(0.6, (c1 - c4) * 8)
  for (let k = 1; k <= 9; k++) out.push({ v: c1 + span * Math.pow(k / 9, 1.8), kind: 0 })
  return out
}

/* ------------------------------------------------------- marching squares */

class Segs {
  buf = new Float32Array(1 << 16)
  n = 0
  push(x1: number, y1: number, x2: number, y2: number) {
    if (this.n + 4 > this.buf.length) {
      const nb = new Float32Array(this.buf.length * 2)
      nb.set(this.buf)
      this.buf = nb
    }
    const b = this.buf
    b[this.n++] = x1
    b[this.n++] = y1
    b[this.n++] = x2
    b[this.n++] = y2
  }
}

/**
 * Contour of `level` on a structured grid (nx fast, ny slow) whose node
 * values are V and node screen positions PX/PY; segments appended to out.
 */
function march(nx: number, ny: number, V: Float64Array, PX: Float32Array, PY: Float32Array, level: number, out: Segs) {
  const ex = [0, 0, 0, 0]
  const ey = [0, 0, 0, 0]
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i
      const b = a + 1
      const c = a + nx + 1
      const d = a + nx
      const va = V[a]
      const vb = V[b]
      const vc = V[c]
      const vd = V[d]
      const k = (va > level ? 1 : 0) | (vb > level ? 2 : 0) | (vc > level ? 4 : 0) | (vd > level ? 8 : 0)
      if (k === 0 || k === 15) continue
      const edge = (e: number, p: number, q: number, vp: number, vq: number) => {
        const t = (level - vp) / (vq - vp)
        ex[e] = PX[p] + (PX[q] - PX[p]) * t
        ey[e] = PY[p] + (PY[q] - PY[p]) * t
      }
      // compute only the edges this case needs
      const need = [0, 9, 3, 10, 6, 15, 5, 12, 12, 5, 15, 6, 10, 3, 9, 0][k]
      if (need & 1) edge(0, a, b, va, vb)
      if (need & 2) edge(1, b, c, vb, vc)
      if (need & 4) edge(2, c, d, vc, vd)
      if (need & 8) edge(3, d, a, vd, va)
      switch (k) {
        case 1:
        case 14:
          out.push(ex[3], ey[3], ex[0], ey[0])
          break
        case 2:
        case 13:
          out.push(ex[0], ey[0], ex[1], ey[1])
          break
        case 3:
        case 12:
          out.push(ex[3], ey[3], ex[1], ey[1])
          break
        case 4:
        case 11:
          out.push(ex[1], ey[1], ex[2], ey[2])
          break
        case 6:
        case 9:
          out.push(ex[0], ey[0], ex[2], ey[2])
          break
        case 7:
        case 8:
          out.push(ex[3], ey[3], ex[2], ey[2])
          break
        case 5:
        case 10: {
          const mid = (va + vb + vc + vd) / 4 > level
          if ((k === 5) === mid) {
            out.push(ex[0], ey[0], ex[1], ey[1])
            out.push(ex[2], ey[2], ex[3], ey[3])
          } else {
            out.push(ex[3], ey[3], ex[0], ey[0])
            out.push(ex[1], ey[1], ex[2], ey[2])
          }
          break
        }
      }
    }
  }
}

/* -------------------------------------------- rotating-frame RK4 (Webb) */

function deriv(s: Float64Array, o: Float64Array, mu: number) {
  const x = s[0]
  const y = s[1]
  const r1 = Math.hypot(x + mu, y)
  const r2 = Math.hypot(x - 1 + mu, y)
  const k1 = (1 - mu) / (r1 * r1 * r1)
  const k2 = mu / (r2 * r2 * r2)
  o[0] = s[2]
  o[1] = s[3]
  o[2] = 2 * s[3] + x - k1 * (x + mu) - k2 * (x - 1 + mu)
  o[3] = -2 * s[2] + y - k1 * y - k2 * y
}
const rkA = new Float64Array(4)
const rkB = new Float64Array(4)
const rkC = new Float64Array(4)
const rkD = new Float64Array(4)
const rkT = new Float64Array(4)
function rk4(s: Float64Array, h: number, mu: number) {
  deriv(s, rkA, mu)
  for (let i = 0; i < 4; i++) rkT[i] = s[i] + 0.5 * h * rkA[i]
  deriv(rkT, rkB, mu)
  for (let i = 0; i < 4; i++) rkT[i] = s[i] + 0.5 * h * rkB[i]
  deriv(rkT, rkC, mu)
  for (let i = 0; i < 4; i++) rkT[i] = s[i] + h * rkC[i]
  deriv(rkT, rkD, mu)
  for (let i = 0; i < 4; i++) s[i] += (h / 6) * (rkA[i] + 2 * rkB[i] + 2 * rkC[i] + rkD[i])
}

/**
 * A planar Lyapunov orbit about a collinear point: start on the axis at
 * xL − ax with velocity (0, vy), and correct vy (secant) until the orbit
 * crosses the axis again perpendicularly. Returns the half orbit (the other
 * half is its mirror image) and the full period.
 */
function lyapunov(mu: number, xL: number, ax: number) {
  const g = Math.abs(xL - (1 - mu))
  const c2 = (1 - mu) / Math.pow(Math.abs(xL + mu), 3) + mu / (g * g * g)
  const B = c2 - 2
  const wsq = (-B + Math.sqrt(B * B - 4 * (1 + 2 * c2) * (1 - c2))) / 2
  const wl = Math.sqrt(wsq)
  const kappa = (wsq + 1 + 2 * c2) / (2 * wl)
  const h = 2e-3
  const s = new Float64Array(4)
  const shoot = (vy: number, keep: number[] | null) => {
    s[0] = xL - ax
    s[1] = 0
    s[2] = 0
    s[3] = vy
    let t = 0
    for (let i = 0; i < 6000; i++) {
      const px = s[0]
      const py = s[1]
      const pvx = s[2]
      rk4(s, h, mu)
      t += h
      if (keep && i % 4 === 0) keep.push(s[0], s[1])
      if (i > 20 && py !== 0 && Math.sign(s[1]) !== Math.sign(py)) {
        const f = py / (py - s[1])
        if (keep) keep.push(px + (s[0] - px) * f, 0)
        return { vx: pvx + (s[2] - pvx) * f, t: t - h + f * h }
      }
    }
    return { vx: 1, t: 1 }
  }
  let a = kappa * ax * wl
  let b = a * 1.02
  let fa = shoot(a, null).vx
  let fb = shoot(b, null).vx
  for (let it = 0; it < 24 && Math.abs(fb) > 1e-13 && fb !== fa; it++) {
    const c = b - (fb * (b - a)) / (fb - fa)
    a = b
    fa = fb
    b = c
    fb = shoot(b, null).vx
  }
  const pts: number[] = [xL - ax, 0]
  const r = shoot(b, pts)
  return { pts: Float32Array.from(pts), period: 2 * r.t }
}

/* -------------------------------------------------------------- particles */

/** trail points kept per particle, one per TRAIL_STEP of travel (frame units) */
const TRAIL = 300
const TRAIL_STEP2 = 0.011 * 0.011

interface Particle {
  X: number
  Y: number
  VX: number
  VY: number
  ax: number
  ay: number
  tx: Float32Array
  ty: Float32Array
  head: number
  count: number
  alive: boolean
  fade: number
  group: number
  c0: number
  /** rotating-frame position, refreshed each frame */
  x: number
  y: number
  left: boolean
  /** trail capacity */
  cap: number
  /** how it was lost: 0 not yet, 1 the Sun, 2 the planet, 3 far away */
  lost: number
}

/** groups: 0 L1, 1 L2, 2 L3, 3 L4, 4 L5, 5 horseshoe, 6 dropped */
const GROUP_COL = [C.ocean, C.ocean, C.lagoon, C.moss, C.moss, C.ocean, C.ocean]

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  /* ----------------------------------------------------------- state */
  let mu = MU_JUP
  let muUser: number | null = null
  let L = lagrangePoints(mu)
  let levels = levelsFor(L)

  /* ---------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let pad = 16
  let portrait = false
  let wide = false
  let short = false
  let tiny = false
  let small = false
  let capX = 0
  let capY = 0
  let capSize = 24
  let rulerOn = true
  /** the map plate: centre and px per unit */
  const map = { x: 0, y: 0, s: 100 }
  /** the detail inset around the planet */
  const inset = { on: false, x: 0, y: 0, r: 0 }
  /** the μ ruler */
  const mr = { x0: 0, x1: 0, y: 0, on: false }

  function captionWidth(size: number) {
    let mw = 0
    for (const c of CAPTIONS)
      for (const ln of c.lines) {
        setFont(ctx, { font: 'serif', size })
        let lw = ln.s ? ctx.measureText(ln.s).width : 0
        if (ln.em) {
          setFont(ctx, { font: 'serif', size, italic: true })
          lw += ctx.measureText(ln.em).width
        }
        mw = Math.max(mw, lw)
      }
    return mw
  }

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    wide = !portrait && w >= h * 1.2
    short = h < 420
    tiny = h < 260
    small = preview || Math.min(w, h) < 480
    pad = preview ? 12 : clamp(Math.min(w, h) * 0.045, 12, 36)
    rulerOn = !preview && h >= 200
    const rulerSpace = rulerOn ? (tiny ? 12 : 16) : 0
    capSize = portrait ? clamp(Math.min(w * 0.072, h * 0.04), 17, 40) : clamp(Math.min(w * 0.036, h * (short ? 0.085 : 0.06)), tiny ? 13 : 15, 46)
    if (preview) capSize = 16
    const top = pad + (tiny ? 18 : 26) + (portrait && !preview ? 66 : 0)
    if (wide) {
      // the plate on the right; the left column holds the caption and the μ ruler
      const leftW = clamp(w * (short ? 0.34 : 0.3), 150, 400)
      while (capSize > 12 && captionWidth(capSize) > leftW) capSize -= 1
      capX = pad * (preview ? 1 : 1.25)
      capY = h - pad - rulerSpace - capSize * 2.12
      const availW = w - pad - (pad + leftW + 10)
      const availH = h - top - pad - rulerSpace + (short ? 6 : 0)
      map.s = Math.max(20, Math.min(availH, availW * 0.86) / (2 * (R_PLATE + 0.1)))
      const plateR = (R_PLATE + 0.1) * map.s
      map.x = pad + leftW + 10 + plateR + Math.max(0, (availW - plateR * 2) * 0.35)
      map.y = top + availH / 2
      // μ ruler: in the left column, above the caption
      mr.on = !preview
      mr.x0 = capX + 4
      mr.x1 = capX + leftW - 18
      mr.y = capY - (tiny ? 26 : short ? 52 : 66)
    } else {
      while (capSize > 12 && captionWidth(capSize) > w - pad * 2) capSize -= 1
      capX = pad * (preview ? 1 : 1.25)
      capY = h - pad - rulerSpace - capSize * 2.12
      mr.on = !preview
      mr.x0 = pad + 6
      mr.x1 = w - pad - 6
      mr.y = capY - (tiny ? 26 : small ? 56 : 66)
      const bottom = (mr.on ? mr.y - 30 : capY - 24) - (portrait ? 10 : 0)
      const availH = bottom - top
      const availW = w - pad * 2
      const tall = availH - availW > 150
      map.s = Math.max(16, Math.min(availW, availH - (tall ? 150 : 0)) / (2 * (R_PLATE + 0.1)))
      map.x = w / 2
      map.y = top + (R_PLATE + 0.1) * map.s + (tall ? 0 : Math.max(0, (availH - (R_PLATE + 0.1) * 2 * map.s) / 2))
    }
    placeInset(top)
    buildGrid()
    gridDirty = true
    forbidDirty = true
  }

  /**
   * The detail inset: the largest circle that fits in the paper left over
   * (outside the plate, clear of caption, readouts and μ ruler), as near
   * the planet as possible.
   */
  function placeInset(top: number) {
    inset.on = false
    if (preview || tiny) return
    const plateR = (R_PLATE + 0.1) * map.s + 16
    const px = map.x + (1 - mu) * map.s
    const py = map.y
    setFont(ctx, { font: 'serif', size: capSize })
    const capW = captionWidth(capSize)
    const boxes = [
      [capX - 6, capY - 26, capW + 12, h - capY + 26],
      [w - pad - 270, 0, 270, pad + 10 + 6 * 16],
      [mr.x0 - 14, mr.y - 32, mr.x1 - mr.x0 + 28, 78],
      [0, h - pad - 22, w, pad + 22],
      [0, 0, w * 0.4, top],
    ]
    for (let r = Math.min(130, Math.min(w, h) * 0.2); r >= 44; r -= 6) {
      let best = -1
      let bx = 0
      let by = 0
      for (let y = top + r + 6; y <= h - pad - 40 - r; y += 10)
        for (let x = pad + r + 6; x <= w - pad - r - 6; x += 10) {
          if (Math.hypot(x - map.x, y - map.y) < plateR + r) continue
          let hit = false
          for (const [qx, qy, qw, qh] of boxes) {
            // circle (with its label line below) against the rectangle
            const cx = clamp(x, qx, qx + qw)
            const cy = clamp(y, qy, qy + qh)
            if (Math.hypot(x - cx, y - cy) < r + 4 || (y + r + 20 > qy && y + r < qy + qh && x + r > qx && x - r < qx + qw)) {
              hit = true
              break
            }
          }
          if (hit) continue
          const d = Math.hypot(x - px, y - py)
          if (best < 0 || d < best) {
            best = d
            bx = x
            by = y
          }
        }
      if (best >= 0) {
        inset.on = true
        inset.r = r
        inset.x = bx
        inset.y = by
        return
      }
    }
  }

  /* ------------------------------------------------- the polar grid */
  let NR = 0
  let NT = 0
  let gR = new Float64Array(0)
  let gT = new Float64Array(0)
  let gV = new Float64Array(0)
  let gX = new Float32Array(0)
  let gY = new Float32Array(0)
  let gridDirty = true
  let gridLo = false
  const segs = new Segs()
  /** level ranges into segs: [start, end, kind] */
  let lvRange: number[] = []
  // detail inset grid (Cartesian, around the planet)
  const NI = preview ? 40 : 84
  const iV = new Float64Array(NI * NI)
  const iX = new Float32Array(NI * NI)
  const iY = new Float32Array(NI * NI)
  const isegs = new Segs()
  let ilvRange: number[] = []
  let insetHalf = 0.1

  function buildGrid(lo = false) {
    NR = lo ? 70 : preview ? 90 : 170
    NT = lo ? 200 : preview ? 240 : 520
    gR = new Float64Array(NR)
    gT = new Float64Array(NT)
    gV = new Float64Array(NR * NT)
    gX = new Float32Array(NR * NT)
    gY = new Float32Array(NR * NT)
    // radii crowd towards r = 1 from both sides
    const rIn = 0.22
    const rOut = R_PLATE
    const half = Math.floor(NR * 0.55)
    for (let i = 0; i < NR; i++) {
      if (i < half) {
        const t = 1 - i / (half - 1)
        gR[i] = 1 - (1 - rIn) * (0.22 * t + 0.78 * t * t * t)
      } else {
        const t = (i - half + 1) / (NR - half)
        gR[i] = 1 + (rOut - 1) * (0.22 * t + 0.78 * t * t * t)
      }
    }
    // angles crowd towards the planet (θ = 0)
    for (let j = 0; j < NT; j++) {
      const v = (j / (NT - 1)) * 2 - 1
      gT[j] = Math.PI * Math.sign(v) * (0.24 * Math.abs(v) + 0.76 * Math.abs(v) * Math.abs(v) * Math.abs(v))
    }
    for (let j = 0; j < NT; j++) {
      const c = Math.cos(gT[j])
      const s = Math.sin(gT[j])
      for (let i = 0; i < NR; i++) {
        gX[j * NR + i] = map.x + gR[i] * c * map.s
        gY[j * NR + i] = map.y - gR[i] * s * map.s
      }
    }
    gridLo = lo
  }

  function computeContours() {
    for (let j = 0; j < NT; j++) {
      const c = Math.cos(gT[j])
      const s = Math.sin(gT[j])
      for (let i = 0; i < NR; i++) gV[j * NR + i] = Math.min(1e6, om2(gR[i] * c, gR[i] * s, mu))
    }
    segs.n = 0
    lvRange = []
    for (const lv of levels) {
      const s0 = segs.n
      march(NR, NT, gV, gX, gY, lv.v, segs)
      lvRange.push(s0, segs.n, lv.kind)
    }
    // the inset: a Cartesian grid around the planet
    if (inset.on) {
      const rh = Math.cbrt(mu / 3)
      insetHalf = clamp(rh * 2.6, 0.02, 0.4)
      const x2 = 1 - mu
      const k = inset.r / insetHalf
      for (let j = 0; j < NI; j++)
        for (let i = 0; i < NI; i++) {
          const wx = x2 + (i / (NI - 1) * 2 - 1) * insetHalf
          const wy = (j / (NI - 1) * 2 - 1) * insetHalf
          iV[j * NI + i] = Math.min(1e6, om2(wx, wy, mu))
          iX[j * NI + i] = inset.x + (wx - x2) * k
          iY[j * NI + i] = inset.y - wy * k
        }
      isegs.n = 0
      ilvRange = []
      const [c1, c2, c3] = L.c
      const il = [
        { v: c3, kind: 1 },
        { v: (c3 + c2) / 2, kind: 1 },
        { v: c2, kind: 2 },
        { v: (c2 + c1) / 2, kind: 1 },
        { v: c1, kind: 2 },
      ]
      const sp = Math.max(0.02, (c1 - c3) * 3)
      for (let q = 1; q <= 6; q++) il.push({ v: c1 + sp * Math.pow(q / 6, 1.6), kind: 0 })
      for (const lv of il) {
        const s0 = isegs.n
        march(NI, NI, iV, iX, iY, lv.v, isegs)
        ilvRange.push(s0, isegs.n, lv.kind)
      }
    }
    gridDirty = false
    mapDirty = true
  }

  /* ------------------------------------------- the forbidden region */
  let dropC = 0
  let dropOn = false
  let forbidDirty = true
  let forbidCan: HTMLCanvasElement | null = null
  let maskCan: HTMLCanvasElement | null = null
  let patCan: HTMLCanvasElement | null = null
  const dsegs = new Segs()
  function buildForbid() {
    forbidDirty = false
    mapDirty = true
    if (!dropOn || typeof document === 'undefined') return
    const MW = Math.max(8, Math.ceil(w / 4))
    const MH = Math.max(8, Math.ceil(h / 4))
    if (!maskCan) maskCan = document.createElement('canvas')
    maskCan.width = MW
    maskCan.height = MH
    const mc = maskCan.getContext('2d')
    if (!mc) return
    const img = mc.createImageData(MW, MH)
    const Rp = R_PLATE * map.s
    for (let j = 0; j < MH; j++)
      for (let i = 0; i < MW; i++) {
        const sx = ((i + 0.5) / MW) * w
        const sy = ((j + 0.5) / MH) * h
        if ((sx - map.x) * (sx - map.x) + (sy - map.y) * (sy - map.y) > Rp * Rp) continue
        const wx = (sx - map.x) / map.s
        const wy = (map.y - sy) / map.s
        if (om2(wx, wy, mu) < dropC) img.data[(j * MW + i) * 4 + 3] = 255
      }
    mc.putImageData(img, 0, 0)
    if (!patCan) {
      patCan = document.createElement('canvas')
      patCan.width = 7
      patCan.height = 7
      const pc = patCan.getContext('2d')
      if (pc) {
        pc.strokeStyle = rgba(C.ocean, 0.5)
        pc.lineWidth = 1
        pc.beginPath()
        pc.moveTo(-1, 8)
        pc.lineTo(8, -1)
        pc.stroke()
      }
    }
    if (!forbidCan) forbidCan = document.createElement('canvas')
    forbidCan.width = Math.max(1, Math.round(w))
    forbidCan.height = Math.max(1, Math.round(h))
    const fc = forbidCan.getContext('2d')
    if (!fc) return
    fc.imageSmoothingEnabled = true
    fc.drawImage(maskCan, 0, 0, forbidCan.width, forbidCan.height)
    fc.globalCompositeOperation = 'source-in'
    const pat = fc.createPattern(patCan, 'repeat')
    if (pat) fc.fillStyle = pat
    fc.fillRect(0, 0, forbidCan.width, forbidCan.height)
    fc.globalCompositeOperation = 'source-over'
    // the zero-velocity curve itself
    dsegs.n = 0
    march(NR, NT, gV, gX, gY, dropC, dsegs)
    mapDirty = true
  }

  /* -------------------------------------------------------- particles */
  const parts: Particle[] = []
  let st = 0 // sim time, units (one turn of the frame = 2π)
  const MAXP = preview ? 140 : 260

  function addParticle(x: number, y: number, vx: number, vy: number, group: number) {
    if (parts.length >= MAXP) {
      const i = parts.findIndex((p) => !p.alive || p.group !== 6)
      parts.splice(i >= 0 ? i : 0, 1)
    }
    // rotating → inertial at the current sim time
    const c = Math.cos(st)
    const s = Math.sin(st)
    const ivx = vx - y
    const ivy = vy + x
    const p: Particle = {
      X: c * x - s * y,
      Y: s * x + c * y,
      VX: c * ivx - s * ivy,
      VY: s * ivx + c * ivy,
      ax: 0,
      ay: 0,
      tx: new Float32Array(group === 6 ? TRAIL * 4 : group === 5 ? TRAIL * 2 : TRAIL),
      ty: new Float32Array(group === 6 ? TRAIL * 4 : group === 5 ? TRAIL * 2 : TRAIL),
      head: 0,
      count: 1,
      alive: true,
      fade: 1,
      group,
      c0: om2(x, y, mu) - vx * vx - vy * vy,
      x,
      y,
      left: false,
      cap: group === 6 ? TRAIL * 4 : group === 5 ? TRAIL * 2 : TRAIL,
      lost: 0,
    }
    p.tx[0] = x
    p.ty[0] = y
    parts.push(p)
    return p
  }

  function jacobi(p: Particle) {
    const c = Math.cos(st)
    const s = Math.sin(st)
    const x = c * p.X + s * p.Y
    const y = -s * p.X + c * p.Y
    const ivx = c * p.VX + s * p.VY
    const ivy = -s * p.VX + c * p.VY
    const vx = ivx + y
    const vy = ivy - x
    return om2(x, y, mu) - vx * vx - vy * vy
  }

  function accelAt(p: Particle, t: number) {
    const c = Math.cos(t)
    const s = Math.sin(t)
    const dx1 = p.X + mu * c
    const dy1 = p.Y + mu * s
    const dx2 = p.X - (1 - mu) * c
    const dy2 = p.Y - (1 - mu) * s
    const r1s = dx1 * dx1 + dy1 * dy1 + 1e-9
    const r2s = dx2 * dx2 + dy2 * dy2 + 1e-9
    const k1 = (1 - mu) / (r1s * Math.sqrt(r1s))
    const k2 = mu / (r2s * Math.sqrt(r2s))
    p.ax = -k1 * dx1 - k2 * dx2
    p.ay = -k1 * dy1 - k2 * dy2
    return r2s
  }

  const ripples: { x: number; y: number; t: number; col: string; r: number }[] = []

  /** advance all particles by dT units (kick-drift-kick) */
  function stepParticles(dT: number) {
    if (dT <= 0) return
    const hMax = 0.005
    const n = Math.max(1, Math.ceil(dT / hMax))
    const hh = dT / n
    const rLost2 = Math.max(2.5e-5, Math.pow(Math.cbrt(mu / 3) * 0.08, 2))
    for (const p of parts) {
      if (!p.alive) continue
      let t = st
      let r2s = accelAt(p, t)
      for (let k = 0; k < n; k++) {
        // close to the planet: subdivide this step
        const sub = r2s < 0.0025 ? 10 : r2s < 0.01 ? 4 : 1
        const hs = hh / sub
        for (let q = 0; q < sub; q++) {
          p.VX += 0.5 * hs * p.ax
          p.VY += 0.5 * hs * p.ay
          p.X += hs * p.VX
          p.Y += hs * p.VY
          t += hs
          r2s = accelAt(p, t)
          p.VX += 0.5 * hs * p.ax
          p.VY += 0.5 * hs * p.ay
        }
        // the trail, sampled by distance travelled in the turning frame
        const ct = Math.cos(t)
        const stt = Math.sin(t)
        const rx = ct * p.X + stt * p.Y
        const ry = -stt * p.X + ct * p.Y
        const lx = p.tx[p.head]
        const ly = p.ty[p.head]
        if ((rx - lx) * (rx - lx) + (ry - ly) * (ry - ly) > TRAIL_STEP2) {
          p.head = (p.head + 1) % p.cap
          p.tx[p.head] = rx
          p.ty[p.head] = ry
          p.count = Math.min(p.cap, p.count + 1)
        }
        const r1s = (p.X + mu * ct) ** 2 + (p.Y + mu * stt) ** 2
        if (r2s < rLost2 || r1s < 0.0016 || p.X * p.X + p.Y * p.Y > 7) {
          p.alive = false
          p.lost = r1s < 0.0016 ? 1 : r2s < rLost2 ? 2 : 3
          break
        }
      }
    }
    st += dT
  }

  function refreshRotating() {
    const c = Math.cos(st)
    const s = Math.sin(st)
    for (const p of parts) {
      p.x = c * p.X + s * p.Y
      p.y = -s * p.X + c * p.Y
      if (!p.alive) {
        if ((p.lost === 1 || p.lost === 2) && p.fade >= 1 && ripples.length < 10) {
          // swallowed by the Sun or the planet: a small ring where it went
          ripples.push({ x: map.x + p.x * map.s, y: map.y - p.y * map.s, t: 0, col: C.ink2, r: p.group === 6 ? 22 : 10 })
          if (p.group === 6) sfx.noise(0.4, { filter: 320, q: 0.8, gain: 0.03, room: 0.4 })
        }
        p.fade -= 0.02
        continue
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) if (!parts[i].alive && parts[i].fade <= 0) parts.splice(i, 1)
    // the hatch belongs to the last dropped particle; it goes when that particle goes
    if (dropOn && !parts.some((p) => p.group === 6)) {
      dropOn = false
      forbidDirty = true
    }
  }

  /** the story's particles, created as their chapter begins */
  function seedGroup(g: number) {
    const r = rng(100 + g * 17)
    if (g <= 2) {
      const n = preview ? 6 : 10
      for (let k = 0; k < n; k++) {
        const sc = g === 2 ? 0.012 : 2e-6
        addParticle(L.x[g] + gauss(r) * sc, gauss(r) * sc, 0, 0, g)
      }
    } else if (g === 3 || g === 4) {
      const n = preview ? 22 : 36
      const base = g === 3 ? Math.PI / 3 : -Math.PI / 3
      for (let k = 0; k < n; k++) {
        // nested tadpoles: a spread of angular offsets from the point, a little radial scatter
        const da = (r() * 2 - 1) * 0.5 * Math.pow(r(), 0.6)
        const rr = 1 + gauss(r) * 0.003
        const a = base + da
        addParticle(-mu + rr * Math.cos(a), rr * Math.sin(a), 0, 0, g)
      }
    } else if (g === 5) {
      const n = preview ? 8 : 18
      for (let k = 0; k < n; k++) {
        // horseshoes: near-circular orbits a little inside or outside r = 1, spread round the whole shoe
        const dr = (k % 2 ? 1 : -1) * (0.008 + 0.014 * r())
        const rr = 1 + dr
        const a = Math.PI + ((k + 0.5) / n * 2 - 1) * 2.55
        const vt = Math.sqrt((1 - mu) / rr) - rr
        addParticle(-mu + rr * Math.cos(a), rr * Math.sin(a), -vt * Math.sin(a), vt * Math.cos(a), 5)
      }
    }
  }

  function clearGroups(keepDropped: boolean) {
    for (let i = parts.length - 1; i >= 0; i--) if (!keepDropped || parts[i].group !== 6) parts.splice(i, 1)
  }

  /* --------------------------------------------------- Webb (lazy) */
  let webb: { L1: number; L2: number; o1: ReturnType<typeof lyapunov>; o2: ReturnType<typeof lyapunov>; segs: Segs; ranges: number[]; key: string } | null = null
  const wv = { x: 0, y: 0, s: 1 }
  function webbView() {
    // centred on Earth, ±2.3 million km across the narrow side
    const half = 2.35e6 / AU_KM
    const top = pad + 40
    const bottom = wide ? h - pad - (rulerOn ? 20 : 0) - 10 : capY - 40
    const left = wide ? pad + clamp(w * 0.3, 150, 400) + 20 : pad
    const right = w - pad
    wv.s = Math.min((right - left) / (2 * half), (bottom - top) / (2 * half * 0.62))
    wv.x = (left + right) / 2
    wv.y = (top + bottom) / 2
  }
  function ensureWebb() {
    webbView()
    const key = `${w}x${h}`
    if (webb && webb.key === key) return webb
    const Lse = webb ? { x: [webb.L1, webb.L2] } : lagrangePoints(MU_SE)
    const L1 = Lse.x[0]
    const L2 = Lse.x[1]
    const o1 = webb ? webb.o1 : lyapunov(MU_SE, L1, -206000 / AU_KM)
    const o2 = webb ? webb.o2 : lyapunov(MU_SE, L2, 250000 / AU_KM)
    // contours of the close-up
    const NX = preview ? 70 : 150
    const NY = preview ? 44 : 96
    const V = new Float64Array(NX * NY)
    const PX = new Float32Array(NX * NY)
    const PY = new Float32Array(NX * NY)
    const xE = 1 - MU_SE
    const hx = (w * 0.6) / wv.s
    const hy = (h * 0.6) / wv.s
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const wx = xE + (i / (NX - 1) * 2 - 1) * hx
        const wy = (j / (NY - 1) * 2 - 1) * hy
        V[j * NX + i] = Math.min(1e7, om2(wx, wy, MU_SE))
        PX[j * NX + i] = wv.x + (wx - xE) * wv.s
        PY[j * NX + i] = wv.y - wy * wv.s
      }
    const c1 = om2(L1, 0, MU_SE)
    const c2 = om2(L2, 0, MU_SE)
    const segs2 = new Segs()
    const ranges: number[] = []
    const lv = [c2 - (c1 - c2) * 1.5, c2 - (c1 - c2) * 0.6, c2, (c1 + c2) / 2, c1, c1 + (c1 - c2) * 0.8, c1 + (c1 - c2) * 2.2, c1 + (c1 - c2) * 5]
    lv.forEach((v, i) => {
      const s0 = segs2.n
      march(NX, NY, V, PX, PY, v, segs2)
      ranges.push(s0, segs2.n, i === 2 || i === 4 ? 2 : 1)
    })
    webb = { L1, L2, o1, o2, segs: segs2, ranges, key }
    return webb
  }

  /* ------------------------------------------------------------ clock */
  const atP = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? (env.reducedMotion ? 46 : 30.2) : 0
  let prevT = -1
  let clock = 0
  let acted = false
  let lastAct = -1e9
  let holding = false
  let routhFlash = 0
  // test route: when stepping to a fixed ?t=, only the final frame needs drawing
  const tFixed = env.params.has('t') ? Number(env.params.get('t')) : NaN
  const dropQ = (env.params.get('drop') ?? '').split(',').map(Number)
  let dropPending = dropQ.length === 2 && dropQ.every(Number.isFinite)
  if (env.params.has('mu') && Number(env.params.get('mu')) > 0) muUser = Number(env.params.get('mu'))

  /* ---------------------------------------------------------- pointer */
  const ptr = { down: false, sx: 0, sy: 0, x: 0, y: 0, moved: false, touch: false, mu0: mu, onRuler: false }
  let hoverRuler = -1
  let scrubbing = false
  let hover = { x: -1, y: -1, touch: false }
  const rulerY = () => h - pad * 0.55
  const onTimeline = (x: number, y: number, touch: boolean) => rulerOn && y > rulerY() - (touch ? 26 : 16) && x > pad - 8 && x < w - pad + 8
  const muX = (m: number) => lerp(mr.x0, mr.x1, (Math.log10(m) - LOG_MU0) / (LOG_MU1 - LOG_MU0))
  const muAtX = (x: number) => Math.pow(10, lerp(LOG_MU0, LOG_MU1, clamp((x - mr.x0) / (mr.x1 - mr.x0))))
  const onMuRuler = (x: number, y: number, touch: boolean) => mr.on && Math.abs(y - mr.y) < (touch ? 26 : 16) && x > mr.x0 - 10 && x < mr.x1 + 10
  function seekTo(x: number) {
    const T = mod(prevT < 0 ? 0 : prevT, LOOP)
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.4) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }
  function setMu(m: number) {
    const nm = clamp(m, 1e-6, 0.5)
    if (nm === mu) return
    const wasStable = mu < ROUTH
    mu = nm
    L = lagrangePoints(mu)
    levels = levelsFor(L)
    gridDirty = true
    forbidDirty = true
    for (const p of parts) p.c0 = jacobi(p)
    if (wasStable !== mu < ROUTH) {
      routhFlash = 1
      sfx.tone(mu < ROUTH ? SCALE[9] : SCALE[2], 0.9, { type: 'sine', gain: 0.04, room: 0.4 })
    }
  }
  function storyT() {
    return mod(prevT < 0 ? 0 : prevT, LOOP)
  }
  function drop(x: number, y: number) {
    const wx = (x - map.x) / map.s
    const wy = (map.y - y) / map.s
    if (Math.hypot(wx, wy) > R_PLATE) return
    addParticle(wx, wy, 0, 0, 6)
    dropC = om2(wx, wy, mu)
    dropOn = true
    forbidDirty = true
    ripples.push({ x, y, t: 0, col: C.ocean, r: 22 })
    sfx.tone(SCALE[clamp(Math.round(8 + (dropC - 3) * 20), 0, SCALE.length - 1)], 0.7, { type: 'triangle', gain: 0.045, room: 0.4 })
  }

  /* ---------------------------------------------------------- drawing */

  function halo(str: string, x: number, y: number, o: TextOpts) {
    ctx.save()
    setFont(ctx, o)
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.92)
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }

  function strokeSegs(sg: Segs, s0: number, s1: number, reveal: number, cx: number, cy: number, g: CanvasRenderingContext2D = ctx) {
    const b = sg.buf
    g.beginPath()
    if (reveal >= 1) {
      for (let k = s0; k < s1; k += 4) {
        g.moveTo(b[k], b[k + 1])
        g.lineTo(b[k + 2], b[k + 3])
      }
    } else {
      // the reveal sweeps anticlockwise from the planet
      const lim = reveal * TAU
      for (let k = s0; k < s1; k += 4) {
        const a = mod(Math.atan2(cy - b[k + 1], b[k] - cx), TAU)
        if (a > lim) continue
        g.moveTo(b[k], b[k + 1])
        g.lineTo(b[k + 2], b[k + 3])
      }
    }
    g.stroke()
  }

  function drawContours(alpha: number, reveal: number, g: CanvasRenderingContext2D = ctx) {
    if (alpha <= 0) return
    g.save()
    g.globalAlpha = alpha
    g.beginPath()
    g.arc(map.x, map.y, R_PLATE * map.s, 0, TAU)
    g.clip()
    for (let q = 0; q < lvRange.length; q += 3) {
      const kind = lvRange[q + 2]
      g.lineWidth = kind === 2 ? 1.1 : 1
      g.strokeStyle = kind === 2 ? rgba(C.ink, 0.78) : kind === 1 ? rgba(C.lagoon, 0.62) : rgba(C.ocean, 0.3)
      strokeSegs(segs, lvRange[q], lvRange[q + 1], reveal, map.x, map.y, g)
    }
    g.restore()
  }

  /*
   * The static layer — plate, forbidden hatch, contours — cached in an
   * offscreen canvas and redrawn only when μ, the layout or the dropped
   * particle changes (twenty thousand hairlines are not free every frame).
   */
  let mapCan: HTMLCanvasElement | null = null
  let mapDirty = true
  function renderMapLayer() {
    mapDirty = false
    if (typeof document === 'undefined') return
    if (!mapCan) mapCan = document.createElement('canvas')
    const W = Math.max(1, Math.round(w * env.dpr))
    const H = Math.max(1, Math.round(h * env.dpr))
    if (mapCan.width !== W || mapCan.height !== H) {
      mapCan.width = W
      mapCan.height = H
    }
    const g = mapCan.getContext('2d')
    if (!g) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, W, H)
    g.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
    drawPlateTo(g, 1)
    if (dropOn && forbidCan) {
      g.globalAlpha = 0.9
      g.drawImage(forbidCan, 0, 0, w, h)
      g.globalAlpha = 1
    }
    drawContours(1, 1, g)
    if (dropOn && dsegs.n) {
      g.save()
      g.strokeStyle = C.ocean
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(map.x, map.y, R_PLATE * map.s, 0, TAU)
      g.clip()
      strokeSegs(dsegs, 0, dsegs.n, 1, 0, 0, g)
      g.restore()
    }
  }

  function drawPlate(alpha: number) {
    drawPlateTo(ctx, alpha)
  }

  function drawPlateTo(g: CanvasRenderingContext2D, alpha: number) {
    if (alpha <= 0) return
    const R = R_PLATE * map.s
    const ctx = g
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    ctx.arc(map.x, map.y, R, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    for (let d = 0; d < 360; d += 5) {
      const a = (d * Math.PI) / 180
      const l = d % 30 === 0 ? 7 : 3
      ctx.moveTo(map.x + Math.cos(a) * R, map.y - Math.sin(a) * R)
      ctx.lineTo(map.x + Math.cos(a) * (R + l), map.y - Math.sin(a) * (R + l))
    }
    ctx.stroke()
    // the circle r = 1 (the planet's orbit), faint
    ctx.strokeStyle = rgba(C.ink, 0.12)
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.arc(map.x, map.y, map.s, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    // the frame turns: an arrow on the rim
    if (!small) {
      const a0 = 0.32
      const a1 = 0.62
      ctx.strokeStyle = rgba(C.ink, 0.45)
      ctx.beginPath()
      ctx.arc(map.x, map.y, R + 14, -a1, -a0)
      ctx.stroke()
      const ex = map.x + Math.cos(a1) * (R + 14)
      const ey = map.y - Math.sin(a1) * (R + 14)
      const ta = -a1 - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(ex + Math.cos(ta + 2.6) * 5, ey + Math.sin(ta + 2.6) * 5)
      ctx.lineTo(ex, ey)
      ctx.lineTo(ex + Math.cos(ta - 2.6) * 5, ey + Math.sin(ta - 2.6) * 5)
      ctx.stroke()
      const lx = map.x + Math.cos(0.47) * (R + 24)
      const ly = map.y - Math.sin(0.47) * (R + 24)
      if (lx < w - pad - 90) text(ctx, 'the frame turns', lx + 4, ly, { size: 8.5, color: C.muted, upper: true, tracking: 0.14 })
    }
    ctx.restore()
  }

  function sunGlyph(x: number, y: number, r: number) {
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.arc(x, y, 1.3, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.beginPath()
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      ctx.moveTo(x + Math.cos(a) * (r + 2.5), y + Math.sin(a) * (r + 2.5))
      ctx.lineTo(x + Math.cos(a) * (r + (i % 2 ? 4.5 : 7)), y + Math.sin(a) * (r + (i % 2 ? 4.5 : 7)))
    }
    ctx.stroke()
  }

  function planetGlyph(x: number, y: number, r: number) {
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - r * 0.86, y - r * 0.32)
    ctx.lineTo(x + r * 0.86, y - r * 0.32)
    ctx.moveTo(x - r * 0.86, y + r * 0.32)
    ctx.lineTo(x + r * 0.86, y + r * 0.32)
    ctx.stroke()
  }

  const LNAME = ['L1', 'L2', 'L3', 'L4', 'L5']
  function drawLPoints(T: number, alpha: number) {
    if (alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = alpha
    const tri = smoothstep(7, 8.4, T)
    if (tri > 0) {
      // the equilateral triangles: Sun, planet and L4 / L5
      ctx.save()
      ctx.globalAlpha *= tri * 0.8
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.setLineDash([3, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      const sx = map.x - mu * map.s
      const px = map.x + (1 - mu) * map.s
      for (const k of [3, 4]) {
        const lx = map.x + L.x[k] * map.s
        const ly = map.y - L.y[k] * map.s
        ctx.moveTo(sx, map.y)
        ctx.lineTo(lx, ly)
        ctx.lineTo(px, map.y)
      }
      ctx.moveTo(sx, map.y)
      ctx.lineTo(px, map.y)
      ctx.stroke()
      ctx.setLineDash([])
      if (!small) {
        const lx = map.x + L.x[3] * map.s
        const ly = map.y - L.y[3] * map.s
        halo('60°', lerp(sx, lx, 0.18) + 10, lerp(map.y, ly, 0.18) + 2, { size: 9, color: C.muted, tracking: 0.06 })
      }
      ctx.restore()
    }
    for (let k = 0; k < 5; k++) {
      const a = smoothstep(4 + k * 0.7, 4.5 + k * 0.7, T)
      if (a <= 0) continue
      const x = map.x + L.x[k] * map.s
      const y = map.y - L.y[k] * map.s
      ctx.save()
      ctx.globalAlpha *= a
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      const near = k < 2 && Math.abs(L.x[k] - (1 - mu)) * map.s < 18
      regMark(ctx, x, y, near ? 4 : small ? 5.5 : 7.5)
      const sz = small ? 9 : 10.5
      if (k < 2 && near) {
        // crowded next to the planet: leader lines up and down
        const ly = y + (k === 0 ? -1 : 1) * (small ? 20 : 30)
        const lx = x + (k === 0 ? -1 : 1) * (small ? 10 : 16)
        ctx.strokeStyle = rgba(C.ink, 0.5)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(lx, ly)
        ctx.stroke()
        halo(LNAME[k], lx + (k === 0 ? -3 : 3), ly + (k === 0 ? -3 : 11), { size: sz, color: C.ink, align: k === 0 ? 'right' : 'left', tracking: 0.08 })
      } else {
        const dx = k === 2 ? -12 : k < 2 ? (k === 0 ? -10 : 10) : 12
        const dy = k === 3 ? -10 : k === 4 ? 18 : -10
        halo(LNAME[k], x + dx, y + dy, { size: sz, color: C.ink, align: dx < 0 ? 'right' : 'left', tracking: 0.08 })
        if (!small && T < 13.5 && T > 5) {
          const kind = k < 3 ? 'saddle' : 'hilltop'
          halo(kind, x + dx, y + dy + 12, { size: 8, color: C.muted, align: dx < 0 ? 'right' : 'left', upper: true, tracking: 0.14, alpha: 1 - smoothstep(12.6, 13.5, T) })
        }
      }
      ctx.restore()
    }
    ctx.restore()
  }

  const COLS = [C.ocean, C.lagoon, C.moss]
  function drawParticles(alpha: number, viewX: (x: number) => number, viewY: (y: number) => number, clipR = 0, cx = 0, cy = 0, win: number[] | null = null) {
    if (alpha <= 0 || !parts.length) return
    ctx.save()
    if (clipR > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, clipR, 0, TAU)
      ctx.clip()
    }
    ctx.lineWidth = 1
    // trails, batched by colour and age: the older half fainter and thinned
    for (const col of COLS) {
      for (let band = 0; band < 2; band++) {
        let any = false
        ctx.beginPath()
        for (const p of parts) {
          if (GROUP_COL[p.group] !== col || p.fade < 0.5) continue
          if (win && !(Math.abs(p.x - win[0]) < win[2] * 1.6 && Math.abs(p.y - win[1]) < win[2] * 1.6)) continue
          const n = p.count
          const i0 = band === 0 ? 0 : Math.floor(n / 2)
          const i1 = band === 0 ? Math.floor(n / 2) : n - 1
          if (i1 - i0 < 1) continue
          const step = band === 0 ? 2 : 1
          for (let i = i0; i <= i1; i += step) {
            const j = (p.head - (n - 1) + i + p.cap * 4) % p.cap
            const sx = viewX(p.tx[j])
            const sy = viewY(p.ty[j])
            if (i === i0) ctx.moveTo(sx, sy)
            else ctx.lineTo(sx, sy)
          }
          if (band === 1) ctx.lineTo(viewX(p.x), viewY(p.y))
          any = true
        }
        if (!any) continue
        ctx.strokeStyle = rgba(col, (band ? 0.6 : 0.22) * alpha)
        ctx.stroke()
      }
    }
    // heads
    for (const p of parts) {
      const a = alpha * clamp(p.fade)
      if (a <= 0.01) continue
      if (win && !(Math.abs(p.x - win[0]) < win[2] * 1.2 && Math.abs(p.y - win[1]) < win[2] * 1.2)) continue
      ctx.globalAlpha = a
      ctx.fillStyle = GROUP_COL[p.group]
      ctx.beginPath()
      ctx.arc(viewX(p.x), viewY(p.y), p.group === 6 ? 2.8 : small ? 1.5 : 1.9, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawInset(alpha: number) {
    if (!inset.on || alpha <= 0) return
    const { x: ix, y: iy, r: ir } = inset
    const x2s = map.x + (1 - mu) * map.s
    ctx.save()
    ctx.globalAlpha = alpha
    // the callout: a circle round the planet, lettered; a leader only when it is short
    const ang = Math.atan2(iy - map.y, ix - x2s)
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.lineWidth = 1
    const lr = Math.max(9, Math.cbrt(mu / 3) * 1.4 * map.s)
    ctx.setLineDash([3, 2])
    ctx.beginPath()
    ctx.arc(x2s, map.y, lr, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    const lead = Math.hypot(ix - x2s, iy - map.y) - ir - lr
    if (lead < 170) {
      ctx.beginPath()
      ctx.moveTo(x2s + Math.cos(ang) * lr, map.y + Math.sin(ang) * lr)
      ctx.lineTo(ix - Math.cos(ang) * ir, iy - Math.sin(ang) * ir)
      ctx.stroke()
    }
    halo('A', x2s + lr * 0.75 + 3, map.y - lr * 0.75 - 3, { size: 9.5, color: C.ink, tracking: 0.06 })
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(ix, iy, ir, 0, TAU)
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.arc(ix, iy, ir - 1, 0, TAU)
    ctx.clip()
    for (let q = 0; q < ilvRange.length; q += 3) {
      const kind = ilvRange[q + 2]
      ctx.lineWidth = kind === 2 ? 1.1 : 1
      ctx.strokeStyle = kind === 2 ? rgba(C.ink, 0.78) : kind === 1 ? rgba(C.lagoon, 0.6) : rgba(C.ocean, 0.32)
      strokeSegs(isegs, ilvRange[q], ilvRange[q + 1], 1, ix, iy)
    }
    ctx.restore()
    const k = ir / insetHalf
    const ivx = (x: number) => ix + (x - (1 - mu)) * k
    const ivy = (y: number) => iy - y * k
    drawParticles(alpha, ivx, ivy, ir - 1, ix, iy, [1 - mu, 0, insetHalf])
    planetGlyph(ix, iy, small ? 3.5 : 4.5)
    for (const q of [0, 1]) {
      const x = ivx(L.x[q])
      if (Math.abs(x - ix) > ir - 6) continue
      ctx.strokeStyle = C.ink
      regMark(ctx, x, iy, 5)
      halo(LNAME[q], x, iy - 9, { size: 9, color: C.ink, align: 'center', tracking: 0.08 })
    }
    const rh = Math.cbrt(mu / 3)
    if (ir > 125) {
      text(ctx, `Detail A · ×${Math.round(k / map.s)}`, ix - ir, iy + ir + 14, { size: 8.5, color: C.muted, upper: true, tracking: 0.14 })
      text(ctx, `Hill radius ${rh.toFixed(3)}`, ix + ir, iy + ir + 14, { size: 8.5, color: C.muted, upper: true, tracking: 0.14, align: 'right' })
    } else {
      text(ctx, `Detail A · ×${Math.round(k / map.s)}`, ix, iy + ir + 13, { size: 8, color: C.muted, upper: true, tracking: 0.14, align: 'center' })
      text(ctx, `Hill radius ${rh.toFixed(3)}`, ix, iy + ir + 24, { size: 8, color: C.muted, upper: true, tracking: 0.14, align: 'center' })
    }
    ctx.restore()
  }

  function drawMuRuler(ghostU: number) {
    if (!mr.on) return
    const { x0, x1, y } = mr
    const sz = small ? 8 : 8.5
    const lean = tiny || x1 - x0 < 200
    ctx.save()
    ctx.lineWidth = 1
    // the unstable side, hatched
    const xr = muX(ROUTH)
    ctx.save()
    ctx.beginPath()
    ctx.rect(xr, y - 6, x1 - xr, 6)
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.beginPath()
    for (let x = xr - 10; x < x1 + 10; x += 3.5) {
      ctx.moveTo(x, y)
      ctx.lineTo(x + 6, y - 6)
    }
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    for (let e = -6; e <= -1; e++) {
      const x = muX(Math.pow(10, e))
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + 5)
      for (let m = 2; m < 10; m++) {
        const xm = muX(m * Math.pow(10, e))
        if (xm > x1) break
        ctx.moveTo(xm, y)
        ctx.lineTo(xm, y + 2.5)
      }
    }
    ctx.stroke()
    // the Routh limit
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(xr, y - 9)
    ctx.lineTo(xr, y + 6)
    ctx.stroke()
    if (!lean) for (let e = -6; e <= -1; e += x1 - x0 < 300 ? 2 : 1) text(ctx, `10${['⁻⁶', '⁻⁵', '⁻⁴', '⁻³', '⁻²', '⁻¹'][e + 6]}`, muX(Math.pow(10, e)), y + 15, { size: sz, color: C.muted, align: 'center', tracking: 0.04 })
    // title and value
    const val = mu < 1e-3 ? fmtE(mu) : mu.toFixed(mu < 0.01 ? 5 : 4)
    const stable = mu < ROUTH
    setFont(ctx, { size: sz, tracking: 0.14 })
    const tw = ctx.measureText('MASS RATIO μ = ').width
    text(ctx, 'MASS RATIO μ = ', x0, y - 18, { size: sz, color: C.muted, tracking: 0.14 })
    text(ctx, val, x0 + tw, y - 18, { size: sz + 1.5, color: stable ? C.ocean : C.ink, tracking: 0.06 })
    if (ghostU <= 0 && !lean) text(ctx, stable ? 'UNSTABLE →' : 'L4 · L5 UNSTABLE', x1, y - 18, { size: sz, color: stable ? C.muted : C.ink, align: 'right', tracking: 0.14 })
    // presets: ticks above, names below in two rows
    const lastEnd = [-1e9, -1e9]
    PRESETS.forEach((pr, i) => {
      const x = muX(pr.mu)
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.moveTo(x, y - 2)
      ctx.lineTo(x, y - 8)
      ctx.stroke()
      if (lean) return
      const row = i % 2
      const lab = caps(pr.name)
      setFont(ctx, { size: 7.5, tracking: 0.1 })
      const lw = ctx.measureText(lab).width
      const lx = clamp(x, x0 + lw / 2, x1 - lw / 2)
      if (lx - lw / 2 < lastEnd[row] + 6) return
      lastEnd[row] = lx + lw / 2
      text(ctx, lab, lx, y + 27 + row * 10, { size: 7.5, color: C.muted, align: 'center', tracking: 0.1 })
    })
    // the handle
    const hx = muX(mu)
    const live = ptr.down && ptr.moved
    ctx.fillStyle = C.paper
    ctx.strokeStyle = stable ? C.ocean : C.ink
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(hx, y, live ? 7 : 5.5, 0, TAU)
    ctx.fill()
    ctx.stroke()
    // the ghost: the handle's own drag, dotted
    if (ghostU > 0) {
      const a = Math.sin(Math.PI * clamp(ghostU))
      ctx.globalAlpha = a
      ctx.strokeStyle = C.ocean
      ctx.setLineDash([2, 3])
      ctx.lineWidth = 1
      const gx = hx + Math.sin(ghostU * TAU) * (x1 - x0) * 0.18
      ctx.beginPath()
      ctx.moveTo(hx, y)
      ctx.lineTo(gx, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(gx, y, 5.5, 0, TAU)
      ctx.stroke()
      if (!lean) text(ctx, 'DRAG ← → TO CHANGE μ', x1, y - 18, { size: sz, color: C.ocean, align: 'right', tracking: 0.14 })
    }
    ctx.restore()
  }

  function drawWebb(T: number, alpha: number) {
    if (alpha <= 0) return
    const W = ensureWebb()
    const xE = 1 - MU_SE
    const X = (x: number) => wv.x + (x - xE) * wv.s
    const Y = (y: number) => wv.y - y * wv.s
    const tIV = (T - 52) * 0.34
    ctx.save()
    ctx.globalAlpha = alpha
    // contours
    for (let q = 0; q < W.ranges.length; q += 3) {
      const kind = W.ranges[q + 2]
      ctx.lineWidth = kind === 2 ? 1.1 : 1
      ctx.strokeStyle = kind === 2 ? rgba(C.ink, 0.7) : rgba(C.lagoon, 0.5)
      strokeSegs(W.segs, W.ranges[q], W.ranges[q + 1], 1, 0, 0)
    }
    // the Moon's orbit
    const rm = 384400 / AU_KM
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.setLineDash([2, 3])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(X(xE), Y(0), rm * wv.s, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    const ma = (tIV / (2 * Math.PI)) * (365.25 / 29.53) * TAU
    ctx.fillStyle = C.ink2
    ctx.beginPath()
    ctx.arc(X(xE) + Math.cos(ma) * rm * wv.s, Y(0) - Math.sin(ma) * rm * wv.s, 2, 0, TAU)
    ctx.fill()
    // the two Lyapunov orbits
    const orbitPath = (o: { pts: Float32Array }) => {
      ctx.beginPath()
      const p = o.pts
      for (let i = 0; i < p.length; i += 2) {
        if (i) ctx.lineTo(X(p[i]), Y(p[i + 1]))
        else ctx.moveTo(X(p[i]), Y(p[i + 1]))
      }
      for (let i = p.length - 2; i >= 0; i -= 2) ctx.lineTo(X(p[i]), Y(-p[i + 1]))
      ctx.stroke()
    }
    ctx.strokeStyle = rgba(C.ocean, 0.75)
    ctx.setLineDash([3, 3])
    const draw = ease.inOutSine(smoothstep(54, 57, T))
    if (draw > 0) {
      ctx.save()
      ctx.globalAlpha *= draw
      orbitPath(W.o2)
      orbitPath(W.o1)
      ctx.restore()
    }
    ctx.setLineDash([])
    /** position along an orbit at phase u (0–1): first half forward, second half mirrored */
    const along = (o: { pts: Float32Array }, u: number) => {
      const p = o.pts
      const n = p.length / 2
      const f = mod(u, 1) * 2
      const k = f < 1 ? f : 2 - f
      const idx = Math.min(n - 1.001, k * (n - 1))
      const i = Math.floor(idx)
      const g = idx - i
      const x = p[i * 2] + (p[i * 2 + 2] - p[i * 2]) * g
      const y = p[i * 2 + 1] + (p[i * 2 + 3] - p[i * 2 + 1]) * g
      return [x, f < 1 ? y : -y] as const
    }
    // Earth
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.1
    const er = small ? 5 : 7
    ctx.beginPath()
    ctx.arc(X(xE), Y(0), er, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(X(xE) - er, Y(0))
    ctx.lineTo(X(xE) + er, Y(0))
    ctx.moveTo(X(xE), Y(0) - er)
    ctx.lineTo(X(xE), Y(0) + er)
    ctx.stroke()
    // L1 and L2
    const sz = small ? 8.5 : 9.5
    for (const [xl, name, craft] of [
      [W.L1, 'L1', 'SOHO · since 1996'],
      [W.L2, 'L2', 'Webb · since 2022'],
    ] as const) {
      ctx.strokeStyle = C.ink
      regMark(ctx, X(xl), Y(0), small ? 5 : 7)
      halo(name, X(xl), Y(0) + (small ? 18 : 22), { size: sz + 1, color: C.ink, align: 'center', tracking: 0.08 })
      if (!tiny) halo(craft, X(xl), Y(0) + (small ? 30 : 36), { size: sz - 1, color: C.muted, align: 'center', upper: true, tracking: 0.14 })
    }
    // the spacecraft
    const ph = smoothstep(55, 57, T)
    if (ph > 0) {
      const [jx, jy] = along(W.o2, tIV / W.o2.period + 0.25)
      const [sx2, sy2] = along(W.o1, tIV / W.o1.period + 0.6)
      ctx.globalAlpha = alpha * ph
      // Webb: a hexagon (its mirror) on a sunshield line
      const hx = X(jx)
      const hy = Y(jy)
      const hr = small ? 3.6 : 5
      ctx.fillStyle = C.paper
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * TAU + Math.PI / 6
        if (k) ctx.lineTo(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr)
        else ctx.moveTo(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr)
      }
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(hx - hr * 1.5, hy + hr * 1.4)
      ctx.lineTo(hx + hr * 1.5, hy + hr * 1.4)
      ctx.stroke()
      // SOHO: a small square with panels
      const qx = X(sx2)
      const qy = Y(sy2)
      ctx.strokeStyle = C.ocean
      ctx.strokeRect(qx - 2.5, qy - 2.5, 5, 5)
      ctx.beginPath()
      ctx.moveTo(qx - 8, qy)
      ctx.lineTo(qx - 2.5, qy)
      ctx.moveTo(qx + 2.5, qy)
      ctx.lineTo(qx + 8, qy)
      ctx.stroke()
      ctx.globalAlpha = alpha
    }
    // dimensions: 1.5 million km each way
    const dimA = smoothstep(55.5, 57, T)
    if (dimA > 0 && !tiny) {
      ctx.globalAlpha = alpha * dimA
      ctx.strokeStyle = C.ink2
      ctx.lineWidth = 1
      const yb = Y(0) - Math.min(h * 0.2, 0.56e6 / AU_KM * wv.s)
      for (const xl of [W.L1, W.L2]) {
        const xa = X(xE)
        const xb = X(xl)
        ctx.beginPath()
        ctx.moveTo(xa, Y(0) - er - 4)
        ctx.lineTo(xa, yb - 4)
        ctx.moveTo(xb, Y(0) - 10)
        ctx.lineTo(xb, yb - 4)
        ctx.moveTo(xa, yb)
        ctx.lineTo(xb, yb)
        const sgn = Math.sign(xb - xa)
        ctx.moveTo(xa + sgn * 5, yb - 2.5)
        ctx.lineTo(xa, yb)
        ctx.lineTo(xa + sgn * 5, yb + 2.5)
        ctx.moveTo(xb - sgn * 5, yb - 2.5)
        ctx.lineTo(xb, yb)
        ctx.lineTo(xb - sgn * 5, yb + 2.5)
        ctx.stroke()
        const km = Math.abs(xl - xE) * AU_KM
        halo(`${(km / 1e6).toFixed(2)} million km`, (xa + xb) / 2, yb - 6, { size: sz, color: C.ink2, align: 'center', tracking: 0.08 })
      }
      // the Moon, for scale
      halo('Moon · 384,400 km', X(xE), Y(0) + rm * wv.s + 14, { size: 8.5, color: C.muted, align: 'center', upper: true, tracking: 0.12 })
      // the Sun, far off to the left
      const ax = wide ? pad + clamp(w * 0.3, 150, 400) + 24 : pad + 4
      const ay = Math.min(Y(0) + Math.max(70, 0.95e6 / AU_KM * wv.s), h - pad - 60)
      ctx.strokeStyle = C.ink2
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ax + 80, ay)
      ctx.lineTo(ax, ay)
      ctx.moveTo(ax + 6, ay - 3)
      ctx.lineTo(ax, ay)
      ctx.lineTo(ax + 6, ay + 3)
      ctx.stroke()
      halo('Sun · 150 million km', ax, ay - 8, { size: 8.5, color: C.muted, upper: true, tracking: 0.12 })
      if (!small) halo('the frame turns with Earth', ax, ay + 16, { size: 8, color: C.muted, upper: true, tracking: 0.12 })
    }
    ctx.restore()
  }

  function captionAt(T: number) {
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
        if (ln.s) halo(ln.s, capX, y + dy, { font: 'serif', size: capSize, color: C.ink })
        if (ln.em) halo(ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, readouts: [string, string][]) {
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    text(ctx, `${FIG} — Lagrange`, pad, pad + 10, { size: small ? 9 : 10, color: C.muted, tracking: 0.16, upper: true })
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(OUTRO, OUTRO + 1.2, T) : 1)
    halo(`${c.num} — ${c.name}`, capX, capY - (small ? 4 : 9), { size: small ? 9 : 10.5, color: C.ink2, tracking: 0.16, upper: true, alpha: kIn })
    let y = pad + 10
    const rs = small ? 9 : 10.5
    const maxRows = tiny ? 2 : short ? 3 : 6
    for (const [label, value] of readouts.slice(0, maxRows)) {
      setFont(ctx, { size: rs, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      halo(value, w - pad, y, { size: rs, color: C.ink, align: 'right', tracking: 0.06 })
      if (label) halo(caps(label), w - pad - vw - 10, y, { size: small ? 8.5 : 9.5, color: C.muted, align: 'right', tracking: 0.14 })
      y += small ? 13 : 16
    }
    if (rulerOn) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY()
      ctx.lineWidth = 1
      ctx.strokeStyle = C.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 42; i++) {
        const x = lerp(x0, x1, i / 42)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 6 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360) {
        CHAPTERS.forEach((cc, i) => {
          const x = lerp(x0, x1, cc.t / LOOP)
          text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? C.ink : C.muted, tracking: 0.1 })
        })
        if (holding) text(ctx, 'Free play', xp + 8, yb - 7, { size: 8.5, color: C.ocean, tracking: 0.14, upper: true })
      }
      if (hoverRuler >= 0) {
        const hx = clamp(hoverRuler, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c2, i) => (ht >= c2.t ? i : acc), 0)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${CHAPTERS[hc].name}`, clamp(hx, x0 + 50, x1 - 50), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12, upper: true })
      }
    }
    if (!preview) {
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.lineWidth = 1
      cropMarks(ctx, pad * 0.4, pad * 0.4, w - pad * 0.8, h - pad * 0.8, 8)
    }
  }

  const fmtE = (v: number) => {
    if (v === 0) return '0'
    const e = Math.floor(Math.log10(Math.abs(v)))
    const m = v / Math.pow(10, e)
    const sup = String(e).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])
    return `${m.toFixed(1)} × 10${sup}`
  }

  layout()

  /* ------------------------------------------------------------ frame */

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hoverRuler = -1
        scrubbing = false
        hover = { x: -1, y: -1, touch }
        if (ptr.down && !p.pressed) ptr.down = false
        if (gridLo && !ptr.down) {
          // a drag that left the canvas: back to the fine grid
          buildGrid(false)
          gridDirty = true
          forbidDirty = true
        }
        env.setCursor('default')
        return
      }
      hover = { x: p.x, y: p.y, touch }
      const tl = onTimeline(p.x, p.y, touch)
      hoverRuler = (tl && !ptr.down) || scrubbing ? p.x : -1
      if (p.type === 'down') {
        acted = true
        lastAct = clock
        if (tl) {
          scrubbing = true
          seekTo(p.x)
          return
        }
        ptr.down = true
        ptr.sx = ptr.x = p.x
        ptr.sy = ptr.y = p.y
        ptr.moved = false
        ptr.touch = touch
        ptr.mu0 = mu
        ptr.onRuler = onMuRuler(p.x, p.y, touch)
        if (ptr.onRuler) {
          ptr.moved = true
          muUser = muAtX(p.x)
          setMu(muUser)
        }
        env.setCursor(ptr.onRuler ? 'grabbing' : 'crosshair')
        return
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      if (ptr.down) {
        ptr.x = p.x
        ptr.y = p.y
        if (!ptr.moved && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > (touch ? 12 : 7)) ptr.moved = true
        if (ptr.moved) {
          lastAct = clock
          const T = storyT()
          if (T >= 52 && T < 66) {
            // the close-up is Sun–Earth: drag returns to the landscape
            offset += 66 - T
          }
          muUser = ptr.onRuler ? muAtX(p.x) : clamp(ptr.mu0 * Math.pow(10, ((p.x - ptr.sx) / Math.max(120, mr.x1 - mr.x0)) * (LOG_MU1 - LOG_MU0)), 1e-6, 0.5)
          setMu(muUser)
          if (!gridLo) buildGrid(true)
          env.setCursor('grabbing')
        }
        if (p.type === 'up') {
          if (!ptr.moved) {
            const T = storyT()
            if (T >= 52 && T < 66) offset += 66 - T
            else drop(p.x, p.y)
          }
          ptr.down = false
          if (gridLo) {
            buildGrid(false)
            gridDirty = true
            forbidDirty = true
          }
          env.setCursor('crosshair')
        }
        return
      }
      env.setCursor(tl ? 'pointer' : onMuRuler(p.x, p.y, touch) ? 'grab' : 'crosshair')
    },
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (!down) return true
        const T = storyT()
        if (code === 'ArrowRight') {
          const next = CHAPTERS.find((c) => c.t > T + 0.01)
          offset += (next ? next.t : LOOP) - T
        } else {
          const i = CHAPTERS.reduce((acc, c, idx) => (T >= c.t ? idx : acc), 0)
          const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
          offset += target - T
        }
        acted = true
        return true
      }
      if (code === 'ArrowUp' || code === 'ArrowDown') {
        if (!down) return true
        const marks = [...PRESETS.map((p) => p.mu), ROUTH].sort((a, b) => a - b)
        const i = marks.findIndex((m) => m > mu * 1.0001)
        const next = code === 'ArrowUp' ? (i < 0 ? marks[marks.length - 1] : marks[i]) : [...marks].reverse().find((m) => m < mu * 0.9999) ?? marks[0]
        muUser = next
        setMu(next)
        acted = true
        lastAct = clock
        return true
      }
      if (code === 'KeyC' || code === 'Backspace') {
        if (down) {
          for (let i = parts.length - 1; i >= 0; i--) if (parts[i].group === 6) parts.splice(i, 1)
          dropOn = false
        }
        return true
      }
      return false
    },
    destroy() {
      parts.length = 0
    },
    frame(t, dt) {
      clock = t
      let T = mod(t + offset, LOOP)
      holding = !preview && T >= HOLD_AT && T < OUTRO && clock - lastAct < 15
      if (holding && prevT >= 0 && dt > 0) {
        offset -= dt
        T = mod(t + offset, LOOP)
      }
      const jumped = prevT >= 0 && Math.abs(T - prevT) > 0.5
      const advancing = dt > 0 && prevT >= 0 && !jumped && T >= prevT
      const crossed = (te: number) => advancing && prevT < te && te <= T
      const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)

      // loop / seek: a fresh landscape and the right particles for the moment
      if (prevT < 0 || jumped) {
        const looped = prevT > LOOP - 3 && T < 3
        if (looped) muUser = null
        clearGroups(!looped)
        if (looped) dropOn = false
        if (ch === 1 || (ch === 0 && T > 13)) [0, 1, 2].forEach(seedGroup)
        if (ch === 2) [3, 4, 5].forEach(seedGroup)
        if (ch === 4) [3, 4, 5].forEach(seedGroup)
      }
      if (crossed(14.4)) {
        clearGroups(true)
        ;[0, 1, 2].forEach(seedGroup)
      }
      if (crossed(30.4)) {
        clearGroups(true)
        ;[3, 4, 5].forEach(seedGroup)
      }
      if (crossed(66.2)) {
        clearGroups(true)
        ;[3, 4, 5].forEach(seedGroup)
      }

      // μ: the story's own, unless the viewer has set it; V demonstrates the Routh limit
      if (muUser === null) {
        let m = MU_JUP
        const demo = T >= 67 && T < 73.5 && !acted
        if (demo) {
          const up = ease.inOutCubic(smoothstep(67, 69, T))
          const back = ease.inOutCubic(smoothstep(71.5, 73.5, T))
          m = Math.pow(10, lerp(Math.log10(MU_JUP), Math.log10(0.06), up * (1 - back)))
        }
        const moving = Math.abs(m - mu) > mu * 1e-9
        // while μ glides, contour on the coarse grid (as during a drag); sharpen when it settles
        if (moving && !gridLo && demo) buildGrid(true)
        else if (!moving && gridLo && !ptr.down) {
          buildGrid(false)
          gridDirty = true
          forbidDirty = true
        }
        if (moving) setMu(m)
      } else if (Math.abs(muUser - mu) > mu * 1e-9) setMu(muUser)
      if (crossed(73.6) && muUser === null && !acted) {
        clearGroups(true)
        ;[3, 4, 5].forEach(seedGroup)
      }

      // the sim rate (frame turns per second of story)
      const rate = T < 14 ? 0.6 : T < 30 ? lerp(1.0, 7, smoothstep(21, 26, T)) : T < 52 ? 14 : T < 66 ? 0 : 10
      if (dt > 0 && rate > 0) {
        stepParticles(rate * Math.min(dt, 1 / 20))
      }
      refreshRotating()

      // departures from the saddles: a soft falling note, rate-limited
      if (advancing && T >= 14 && T < 30) {
        let rung = 0
        for (const p of parts) {
          if (p.left || p.group > 2 || !p.alive) continue
          if (Math.hypot(p.x - L.x[p.group], p.y - L.y[p.group]) > (p.group === 2 ? 0.08 : Math.cbrt(mu / 3) * 0.5)) {
            p.left = true
            if (rung++ < 1) sfx.tone(SCALE[p.group === 2 ? 4 : 8 + p.group], 1.2, { type: 'sine', gain: 0.03, to: SCALE[p.group === 2 ? 1 : 4 + p.group], room: 0.5 })
          }
        }
      }

      if (dropPending) {
        dropPending = false
        drop(dropQ[0], dropQ[1])
      }
      if (Number.isFinite(tFixed) && t + 0.5 / 60 < tFixed) {
        prevT = T
        return
      }
      if (gridDirty) computeContours()
      if (forbidDirty) buildForbid()

      /* ------------------------------------------------------ draw */
      ground(ctx, w, h, 'paper')
      const fadeAll = 1 - smoothstep(OUTRO, LOOP - 0.3, T)
      const mapA = (1 - smoothstep(52, 54, T) + smoothstep(64.5, 66.5, T)) * fadeAll * (T < 0.3 ? 0 : 1)
      const mapOn = T < 54 || T >= 64.5
      const reveal = T < 4.4 ? ease.inOutSine(clamp((T - 0.3) / 4)) : 1
      ctx.save()
      if (mapOn && mapA > 0) {
        if (reveal < 1 || T < 1.1) {
          // the opening: drawn live as it sweeps on
          drawPlate(mapA * smoothstep(0.2, 1, T))
          drawContours(mapA, reveal)
        } else {
          if (mapDirty) renderMapLayer()
          if (mapCan) {
            ctx.save()
            ctx.globalAlpha = mapA
            ctx.drawImage(mapCan, 0, 0, w, h)
            ctx.restore()
          }
        }
        drawLPoints(T < 52 ? T : 99, mapA)
        const mx = (x: number) => map.x + x * map.s
        const my = (y: number) => map.y - y * map.s
        ctx.save()
        ctx.globalAlpha = mapA
        drawParticles(1, mx, my, R_PLATE * map.s, map.x, map.y)
        // the masses
        const sIn = smoothstep(0.8, 1.6, T < 52 ? T : 99)
        if (sIn > 0) {
          ctx.globalAlpha = mapA * sIn
          sunGlyph(mx(-mu), map.y, small ? 5 : 7)
          planetGlyph(mx(1 - mu), map.y, small ? 3.2 : 4.4)
          if (!small && T < 13 && T > 1.6) {
            const la = smoothstep(1.6, 2.4, T) * (1 - smoothstep(12, 13, T))
            halo('Sun', mx(-mu), map.y + 22, { size: 9, color: C.ink2, align: 'center', upper: true, tracking: 0.14, alpha: la })
            halo('Jupiter', mx(1 - mu) - 14, map.y + 26, { size: 9, color: C.ink2, align: 'right', upper: true, tracking: 0.14, alpha: la })
          }
        }
        ctx.restore()
        // labels on the story
        const lab = (str: string, x: number, y: number, a: number, align: CanvasTextAlign = 'left') => {
          if (a > 0 && !small) halo(caps(str), x, y, { size: small ? 8 : 9, color: C.ocean, tracking: 0.14, alpha: a * mapA, align })
        }
        if (T >= 15 && T < 30) {
          const a = smoothstep(16, 17, T) * (1 - smoothstep(28.5, 29.6, T))
          lab(`λ ${L.lam[2].toFixed(3)} · slow`, mx(L.x[2]) + 10, my(0) + 34, a)
          if (!inset.on) lab(`λ ${L.lam[0].toFixed(1)} · fast`, mx(L.x[1]) + 10, my(0) + 34, a)
        }
        if (T >= 31 && T < 52 && mu < ROUTH) {
          const a = smoothstep(36, 37.5, T) * (1 - smoothstep(50.5, 51.8, T))
          lab('Tadpoles', mx(L.x[3]) + 16, my(L.y[3]) - 22, a)
          lab('Horseshoes', mx(-1.06), my(0.36), a, 'right')
        }
        if (routhFlash > 0 || (T >= 68 && T < 73.5 && muUser === null && !acted)) {
          const a = Math.max(routhFlash, smoothstep(68.6, 69.2, T) * (1 - smoothstep(72, 73, T)))
          if (mu >= ROUTH) lab('μ > 0.0385 · L4 and L5 no longer hold', mx(L.x[3]), my(L.y[3]) - 30, a, 'center')
          else if (routhFlash > 0) lab('μ < 0.0385 · stable again', mx(L.x[3]), my(L.y[3]) - 30, a, 'center')
        }
        if (dropOn && T >= 0) {
          const last = parts.filter((p) => p.group === 6).pop()
          if (last) {
            const lx = clamp(mx(last.tx[0]) + 12, pad, w - pad - 250)
            lab(`zero-velocity curve · C = ${dropC.toFixed(4)}`, lx, my(last.ty[0]) - 12, 0.95)
            if (!small) lab('it can never cross into the hatching', lx, my(last.ty[0]) + 2, 0.7)
          }
        }
        drawInset(mapA * smoothstep(8, 9.5, T < 52 ? T : 99))
      }
      if (T >= 52 && T < 66.5) drawWebb(T, smoothstep(53, 55, T) * (1 - smoothstep(64.5, 66, T)))
      ctx.restore()

      // ripples
      for (const r of ripples) r.t += dt
      for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].t > 0.8) ripples.splice(i, 1)
      for (const r of ripples) {
        ctx.save()
        ctx.globalAlpha = 1 - r.t / 0.8
        ctx.strokeStyle = r.col
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(r.x, r.y, 3 + ease.outCubic(r.t / 0.8) * r.r, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }
      routhFlash = Math.max(0, routhFlash - dt * 0.4)

      // the μ ruler and the early ghost
      let ghostMu = 0
      if (!preview) {
        if (!acted && T > 5.6 && T < 9.2) ghostMu = (T - 5.6) / 3.6
        if (T < 52 || T >= 65) {
          ctx.save()
          ctx.globalAlpha = fadeAll * smoothstep(0.6, 1.6, T < 52 ? T : 99)
          drawMuRuler(ghostMu)
          ctx.restore()
        }
        if (!acted && T > 2.4 && T < 5.8) {
          // the tap: a ripple near L4, a label
          const gx = map.x + 0.56 * map.s
          const gy = map.y - 0.42 * map.s
          const u = (T - 2.4) / 3.4
          const a = Math.sin(Math.PI * clamp(u))
          ctx.save()
          ctx.globalAlpha = a
          ctx.strokeStyle = C.ocean
          ctx.lineWidth = 1
          for (const d of [0, 0.35]) {
            const k = mod(u * 2.2 - d, 1)
            ctx.globalAlpha = a * (1 - k)
            ctx.beginPath()
            ctx.arc(gx, gy, 3 + k * 18, 0, TAU)
            ctx.stroke()
          }
          ctx.globalAlpha = a
          ctx.fillStyle = C.ocean
          ctx.beginPath()
          ctx.arc(gx, gy, 2.5, 0, TAU)
          ctx.fill()
          halo('Tap to drop a particle', gx + 16, gy + 4, { size: 9, color: C.ocean, upper: true, tracking: 0.14 })
          ctx.restore()
        }
        if (T >= 74 && T < OUTRO && clock - lastAct > 6 && !tiny) {
          const al = smoothstep(74, 75, T) * (1 - smoothstep(OUTRO - 1, OUTRO, T))
          const msg = portrait || w < 640 ? 'Tap to drop · drag ← → for μ' : 'Tap anywhere to drop a particle · drag ← → to change μ · ↑ ↓ presets'
          text(ctx, caps(msg), w - pad, rulerOn ? rulerY() - 24 : h - pad, { size: 9.5, color: C.muted, align: 'right', tracking: 0.14, alpha: al })
        }
        if (hover.x >= 0 && !hover.touch && !ptr.down && hoverRuler < 0 && !onMuRuler(hover.x, hover.y, false) && (T < 52 || T >= 66)) {
          const wx = (hover.x - map.x) / map.s
          const wy = (map.y - hover.y) / map.s
          if (Math.hypot(wx, wy) < R_PLATE) {
            const cv = om2(wx, wy, mu)
            halo(`C ${cv.toFixed(4)}`, hover.x + 10, hover.y - 8, { size: 8.5, color: C.ocean, tracking: 0.08 })
          }
        }
      }

      /* ---------------------------------------------------- readouts */
      const readouts: [string, string][] = []
      const muS = mu < 1e-3 ? fmtE(mu) : mu.toFixed(4)
      if (T >= 52 && T < 66) {
        const W = ensureWebb()
        readouts.push(['system', 'Sun–Earth'], ['μ', fmtE(MU_SE)], ['L2', `${((W.L2 - (1 - MU_SE)) * AU_KM / 1e6).toFixed(2)} million km`], ['orbit period', `${Math.round((W.o2.period / TAU) * 365.25)} days`], ['Webb at L2', 'since Jan 2022'])
      } else {
        const sys = Math.abs(mu - MU_JUP) < 1e-9 ? 'Sun–Jupiter' : PRESETS.find((p) => Math.abs(p.mu - mu) / p.mu < 1e-6)?.name ?? 'custom'
        readouts.push(['system', sys], ['μ', muS])
        if (T < 14) readouts.push(['C₁ · C₂', `${L.c[0].toFixed(4)} · ${L.c[1].toFixed(4)}`], ['C₃ · C₄,₅', `${L.c[2].toFixed(4)} · ${L.c[3].toFixed(4)}`])
        else if (T < 30) readouts.push(['λ L1 · L2', `${L.lam[0].toFixed(2)} · ${L.lam[1].toFixed(2)}`], ['λ L3', L.lam[2].toFixed(4)], ['e-fold L1', `${(1 / L.lam[0] / TAU * 11.862).toFixed(2)} yr`])
        else {
          const k = 27 * mu * (1 - mu)
          readouts.push(['27μ(1 − μ)', `${k.toFixed(3)} ${k < 1 ? '< 1 · stable' : '> 1 · unstable'}`])
          if (mu < ROUTH) readouts.push(['libration', `${Math.round((TAU / Math.sqrt((27 * mu) / 4) / TAU) * 11.862)} yr`])
          let worst = 0
          for (const p of parts) if (p.alive && (p.group === 3 || p.group === 4)) worst = Math.max(worst, Math.abs(jacobi(p) - p.c0))
          if (worst > 0) readouts.push(['Jacobi drift', fmtE(worst)])
          readouts.push(['time', `${Math.round((st / TAU) * 11.862)} yr`])
        }
      }

      captionAt(T)
      chrome(T, readouts)

      // sound: the five points
      for (let k = 0; k < 5; k++) if (crossed(4 + k * 0.7)) sfx.tone(SCALE[[10, 11, 5, 8, 9][k]], 1.6, { type: 'sine', gain: 0.04, attack: 0.01, room: 0.55, pan: [0.5, 0.6, -0.6, 0.1, 0.1][k] })
      if (crossed(30.5)) [0, 4, 7].forEach((d, i) => sfx.tone(SCALE[d], 5, { type: 'sine', gain: 0.035, attack: 1.2, room: 0.6, when: i * 0.2 }))
      if (crossed(55)) sfx.tone(SCALE[12], 2.6, { type: 'sine', gain: 0.03, attack: 0.4, room: 0.6 })

      prevT = T
    },
  }
}

export default create
