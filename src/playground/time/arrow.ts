/*
 * FIG. T.03 — ARROW OF TIME
 *
 * Why time only runs one way. A drop of ink falls from a pipette into a
 * beaker of water and spreads: two thousand particles, each a Langevin
 * random walk (an Ornstein–Uhlenbeck velocity), carried by the drop's
 * vortex pair and stretched into filaments by the slow, area-preserving
 * currents of still water, while a coarse-grained entropy S = −Σ p ln p
 * over 8 × 10 cells climbs toward ln 80. Every frame is recorded, so the
 * film can then run backward: the ink gathers into a drop and leaps back
 * into the pipette. Each step of that film obeys the same laws; it is
 * simply never seen. Then a box of 360 hard disks (elastic collisions in a
 * time-reversible scheme) released from the left half fills the box; the
 * chance of all of them being back on the left at any moment is 2⁻³⁶⁰.
 * Reversing every velocity retraces the past for a moment, then the
 * smallest error grows at every collision and the gas spreads again.
 *
 * Five chapters over 72 s, looping:
 *   I    A drop        the drop swells, falls, and blooms into a mushroom
 *   II   Spreading     filaments, diffusion, entropy rising
 *   III  Backward      the same film, run backward to the pipette
 *   IV   A box of gas  2⁻ᴺ, a velocity reversal, and four disks that do return
 *   V    The arrow     the past was ordered; a fresh beaker for the next loop
 *
 * Interaction (full mode): drag in the water to stir (the stirring is
 * recorded, so running the film backward unstirs it); drag the film strip
 * under the beaker to run time either way; tap the water (or Space) to
 * reverse the film; in chapter IV tap the box (or Space) to reverse every
 * velocity. ← → step chapters; the ruler along the bottom seeks.
 */

import { C, TAU, clamp, ease, ground, lerp, makeNoise, rgba, setFont, smoothstep, text, type TextOpts } from '../kit'
import type { CreatePiece } from '../types'

/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces. Never blocks for long.
 */
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

const FIG = 'FIG. T.03'
const LOOP = 72
const CHAPTERS = [
  { t: 0, num: 'I', name: 'A drop' },
  { t: 5, num: 'II', name: 'Spreading' },
  { t: 24, num: 'III', name: 'The film, backward' },
  { t: 40, num: 'IV', name: 'A box of gas' },
  { t: 60, num: 'V', name: 'The arrow' },
]

/* ----------------------------------------------------------- the ink film */

/** film frames per second (the simulation step) */
const FPS = 20
const DT = 1 / FPS
/** water depth / width; positions are in water widths, y down from the surface */
const A = 1.25
/** highest point the film records (the pipette tip region, above the surface) */
const YMIN = -0.46
const PIP_X = 0.5
const TIP_Y = -0.42
const DROP_R = 0.042
const SWELL = 1.5
const FALL = 0.32
const F_IN = SWELL + FALL
const G_FALL = (2 * (-TIP_Y - DROP_R * 0.9)) / (FALL * FALL)
/** coarse-graining: 8 × 10 square cells */
const CGX = 8
const CGY = 10
const CELLS = CGX * CGY
const S_MAX = Math.log(CELLS)
/** stream-function grid for the currents and the stirring (square cells) */
const PGX = 16
const PGY = 20
/** Langevin: velocity relaxation time and molecular diffusion (water widths²/s) */
const TAU_V = 0.35
const D_MOL = 0.0016
const SIG_V = Math.sqrt(D_MOL / TAU_V)
/** amplitude of the slow convection currents' stream function */
const CONV = 0.02
/** the plume: depth reached (fraction of the water) and its time constant */
const PL_D = 0.6
const PL_T = 1.25

/* ------------------------------------------------------------ the gas box */

const GW = 1.6
const G_LIFT = 2.5
const G_REV = 5.6
const GDT = 1 / 480
const HIST_HZ = 30
const G_SPAN = 20

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}

const CAPTIONS: Caption[] = [
  { t0: 0.5, t1: 7.4, lines: [{ s: 'A drop of ink,' }, { s: '', em: 'falling.' }] },
  { t0: 11.2, t1: 21.6, lines: [{ s: 'Mixing is ', em: 'easy.' }] },
  { t0: 27.2, t1: 38.2, lines: [{ s: 'Unmixing' }, { s: '', em: 'never happens.' }] },
  { t0: 49.0, t1: 58.6, lines: [{ s: 'Possible. Just' }, { s: '', em: 'unimaginably unlikely.' }] },
  { t0: 61.4, t1: 67.8, lines: [{ s: 'Time has a direction because' }, { s: 'the past was ', em: 'ordered.' }] },
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Integer hash → [0, 1): the same noise for frame k of particle i, however often the film is re-recorded. */
function hash01(n: number) {
  let a = n | 0
  a = Math.imul(a ^ (a >>> 16), 0x7feb352d)
  a = Math.imul(a ^ (a >>> 15), 0x846ca68b)
  a ^= a >>> 16
  return (a >>> 0) / 4294967296
}

/** Story time → film time (s) when nobody intervenes: forward, a stop, then back to the first frame. */
function filmAt(T: number) {
  if (T <= 24) return T
  if (T <= 25.2) {
    const u = (T - 24) / 1.2
    return 24 + 1.2 * (u - (u * u) / 2)
  }
  if (T <= 37.5) return 24.6 * (1 - ease.inOutSine((T - 25.2) / 12.3))
  return 0
}
function filmRate(T: number) {
  if (T <= 24) return 1
  if (T <= 25.2) return 1 - (T - 24) / 1.2
  if (T <= 37.5) return (-24.6 * (Math.PI / 2) * Math.sin((Math.PI * (T - 25.2)) / 12.3)) / 12.3
  return 0
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const N = preview ? 900 : 2000
  const CAP = 32 * FPS
  const noise = makeNoise(31)

  /* ---------------------------------------------------- film storage */

  const film = new Uint16Array(CAP * N * 2)
  const entropy = new Float32Array(CAP)
  let frontier = -1
  const QY = 65535 / (A - YMIN)
  // simulation state at frame `frontier`
  const sx = new Float32Array(N)
  const sy = new Float32Array(N)
  const svx = new Float32Array(N)
  const svy = new Float32Array(N)
  // offsets inside the drop (unit disc)
  const ox = new Float32Array(N)
  const oy = new Float32Array(N)
  // displayed positions (interpolated between film frames)
  const dx = new Float32Array(N)
  const dy = new Float32Array(N)
  const counts = new Int32Array(CELLS)
  // the wash: a small offscreen density image, scaled up smoothly
  const WX = preview ? 24 : 36
  const WY = Math.round(WX * A)
  const washCount = new Float32Array(WX * WY)
  const washTmp = new Float32Array(WX * WY)
  const washTmp2 = new Float32Array(WX * WY)
  let washCtx: CanvasRenderingContext2D | null = null
  let washImg: ImageData | null = null
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = WX
    c.height = WY
    washCtx = c.getContext('2d')
    washImg = washCtx ? washCtx.createImageData(WX, WY) : null
  }
  const psi = new Float32Array((PGX + 1) * (PGY + 1))
  const stir = new Float32Array((PGX + 1) * (PGY + 1))
  const taper = new Float32Array((PGX + 1) * (PGY + 1))
  {
    const r = (Math.sqrt(5) - 1) / 2
    for (let i = 0; i < N; i++) {
      // a sunflower disc: even, deterministic
      const rr = Math.sqrt((i + 0.5) / N)
      const a = i * TAU * r
      ox[i] = Math.cos(a) * rr
      oy[i] = Math.sin(a) * rr
    }
    const sm = (v: number) => smoothstep(0, 0.07, v)
    for (let j = 0; j <= PGY; j++)
      for (let i = 0; i <= PGX; i++) {
        const x = i / PGX
        const y = j / PGY
        taper[j * (PGX + 1) + i] = sm(x) * sm(1 - x) * sm(y) * sm(1 - y)
      }
  }
  // three accent particles with visible random walks
  const ACC = [Math.floor(N * 0.31), Math.floor(N * 0.07), Math.floor(N * 0.62)]
  const ACC_COL = [C.ocean, C.lagoon, C.moss]

  function dropAt(f: number) {
    if (f < SWELL) {
      const r = DROP_R * Math.cbrt(clamp(f / SWELL))
      return { r, cy: TIP_Y + r * 0.9 }
    }
    if (f < F_IN) {
      const u = f - SWELL
      return { r: DROP_R, cy: TIP_Y + DROP_R * 0.9 + 0.5 * G_FALL * u * u }
    }
    return { r: DROP_R, cy: 0.03 }
  }

  function placeDrop(f: number) {
    const { r, cy } = dropAt(f)
    for (let i = 0; i < N; i++) {
      sx[i] = PIP_X + ox[i] * r
      sy[i] = cy + oy[i] * r
    }
  }

  function record(k: number) {
    const base = k * N * 2
    counts.fill(0)
    for (let i = 0; i < N; i++) {
      const x = clamp(sx[i], 0, 1)
      const y = clamp(sy[i], YMIN, A)
      film[base + i * 2] = Math.round(x * 65535)
      film[base + i * 2 + 1] = Math.round((y - YMIN) * QY)
      const cx = Math.min(CGX - 1, Math.floor(x * CGX))
      const cy = Math.max(0, Math.min(CGY - 1, Math.floor((y / A) * CGY)))
      counts[cy * CGX + cx]++
    }
    let s = 0
    for (let c = 0; c < CELLS; c++) {
      if (!counts[c]) continue
      const p = counts[c] / N
      s -= p * Math.log(p)
    }
    entropy[k] = s
  }

  /** The stream function: slow convection (noise) plus your stirring, tapered to zero at the walls. */
  function buildPsi(f: number) {
    const decay = Math.exp(-DT / 1.15)
    for (let j = 0; j <= PGY; j++)
      for (let i = 0; i <= PGX; i++) {
        const n = j * (PGX + 1) + i
        const x = i / PGX
        const y = (j / PGY) * A
        stir[n] *= decay
        const c = noise.n3(x * 1.25, y * 1.25, f * 0.035) + 0.45 * noise.n3(x * 2.7 + 7.1, y * 2.7, f * 0.06 + 3)
        psi[n] = (CONV * c + stir[n]) * taper[n]
      }
  }

  let gu = 0
  let gv = 0
  /** Velocity = curl of the bilinear stream function (area-preserving), plus the plume's vortex pair. */
  function vel(x: number, y: number, pk: number, pa: number, pyc: number, pc2: number) {
    const fx0 = clamp(x * PGX, 0, PGX - 1e-4)
    const fy0 = clamp((y / A) * PGY, 0, PGY - 1e-4)
    const i = fx0 | 0
    const j = fy0 | 0
    const fx = fx0 - i
    const fy = fy0 - j
    const n = j * (PGX + 1) + i
    const p00 = psi[n]
    const p10 = psi[n + 1]
    const p01 = psi[n + PGX + 1]
    const p11 = psi[n + PGX + 2]
    const dpx = ((1 - fy) * (p10 - p00) + fy * (p11 - p01)) * PGX
    const dpy = (((1 - fx) * (p01 - p00) + fx * (p11 - p10)) * PGY) / A
    gu = dpy
    gv = -dpx
    if (pk > 0) {
      // two counter-rotating vortices at PIP_X ± a: the fluid between them falls
      let ddx = x - (PIP_X - pa)
      const ddy = y - pyc
      let r2 = ddx * ddx + ddy * ddy + pc2
      gu += (-pk * ddy) / r2
      gv += (pk * ddx) / r2
      ddx = x - (PIP_X + pa)
      r2 = ddx * ddx + ddy * ddy + pc2
      gu -= (-pk * ddy) / r2
      gv -= (pk * ddx) / r2
    }
  }

  function stepWater(k: number, f: number) {
    buildPsi(f)
    const s0 = f - F_IN
    const sub = s0 < 4.5 ? 3 : 1
    const h = DT / sub
    for (let q = 0; q < sub; q++) {
      const s = s0 + q * h
      // the plume: a vortex pair that sinks and slows (its self-induced speed is Γ / 4πa)
      let pk = 0
      let pa = 0
      let pyc = 0
      let pc2 = 0
      if (s < 7) {
        const e = Math.exp(-s / PL_T)
        pyc = 0.06 + PL_D * A * (1 - e)
        const speed = ((PL_D * A) / PL_T) * e
        pa = 0.04 + 0.1 * (1 - Math.exp(-s / 1.6))
        pk = 2 * pa * speed
        const core = 0.038 + 0.03 * (1 - Math.exp(-s / 2))
        pc2 = core * core
      }
      for (let i = 0; i < N; i++) {
        const x = sx[i]
        const y = sy[i]
        vel(x, y, pk, pa, pyc, pc2)
        const mx = x + gu * h * 0.5
        const my = y + gv * h * 0.5
        vel(mx, my, pk, pa, pyc, pc2)
        sx[i] = x + gu * h
        sy[i] = y + gv * h
      }
    }
    // Langevin: an Ornstein–Uhlenbeck velocity, exact discretisation
    const al = Math.exp(-DT / TAU_V)
    const be = SIG_V * Math.sqrt(1 - al * al)
    for (let i = 0; i < N; i++) {
      const u1 = hash01(Math.imul(i, 0x9e3779b1) ^ Math.imul(k, 0x85ebca6b) ^ 0x27d4eb2f) || 1e-9
      const u2 = hash01(Math.imul(i, 0x632be5ab) ^ Math.imul(k, 0xc2b2ae35) ^ 0x165667b1)
      const m = Math.sqrt(-2 * Math.log(u1))
      svx[i] = al * svx[i] + be * m * Math.cos(TAU * u2)
      svy[i] = al * svy[i] + be * m * Math.sin(TAU * u2)
      let x = sx[i] + svx[i] * DT
      let y = sy[i] + svy[i] * DT
      // reflecting walls (and the surface)
      if (x < 0) {
        x = -x
        svx[i] = -svx[i]
      } else if (x > 1) {
        x = 2 - x
        svx[i] = -svx[i]
      }
      if (y < 0) {
        y = -y
        svy[i] = -svy[i]
      } else if (y > A) {
        y = 2 * A - y
        svy[i] = -svy[i]
      }
      sx[i] = clamp(x, 0, 1)
      sy[i] = clamp(y, 0, A)
    }
  }

  /** Simulate and record one more frame. */
  function advance() {
    const k = frontier + 1
    if (k >= CAP) return false
    const f = k * DT
    if (f < F_IN) placeDrop(f)
    else {
      if ((k - 1) * DT < F_IN) {
        placeDrop(F_IN)
        svx.fill(0)
        svy.fill(0)
      }
      stepWater(k, f)
    }
    frontier = k
    record(k)
    return true
  }

  /** Rewrite history from frame k: the future is simulated again (after a stir). */
  function truncateAt(k: number) {
    if (frontier <= k) return
    frontier = k
    const base = k * N * 2
    for (let i = 0; i < N; i++) {
      sx[i] = film[base + i * 2] / 65535
      sy[i] = film[base + i * 2 + 1] / QY + YMIN
    }
    svx.fill(0)
    svy.fill(0)
  }

  function resetFilm() {
    frontier = -1
    stir.fill(0)
    placeDrop(0)
    svx.fill(0)
    svy.fill(0)
  }

  function ensure(k: number, budget: number) {
    while (frontier < k && budget-- > 0) if (!advance()) break
  }

  /** Interpolate the displayed positions at film time tau (s). */
  function showFrame(tau: number) {
    const fk = clamp(tau * FPS, 0, Math.max(0, frontier))
    const k0 = Math.floor(fk)
    const k1 = Math.min(frontier, k0 + 1)
    const u = fk - k0
    const b0 = k0 * N * 2
    const b1 = k1 * N * 2
    for (let i = 0; i < N; i++) {
      const x0 = film[b0 + i * 2]
      const y0 = film[b0 + i * 2 + 1]
      dx[i] = (x0 + (film[b1 + i * 2] - x0) * u) / 65535
      dy[i] = (y0 + (film[b1 + i * 2 + 1] - y0) * u) / QY + YMIN
    }
    return entropy[k0] + (entropy[k1] - entropy[k0]) * u
  }

  /** Add the drag of a spoon at (x, y) moving by (mx, my), in water widths: a divergence-free dipole. */
  function addStir(x: number, y: number, mx: number, my: number, gain = 0.55) {
    const s2 = 0.085 * 0.085
    const k = gain / 1.15
    for (let j = 0; j <= PGY; j++)
      for (let i = 0; i <= PGX; i++) {
        const nx = i / PGX - x
        const ny = (j / PGY) * A - y
        const r2 = nx * nx + ny * ny
        if (r2 > s2 * 9) continue
        stir[j * (PGX + 1) + i] += k * (mx * ny - my * nx) * Math.exp(-r2 / s2)
      }
  }

  /* --------------------------------------------------------- gas box */

  const GN = preview ? 160 : 360
  const GR = Math.sqrt((0.055 * GW) / (Math.PI * GN))
  const gx = new Float64Array(GN)
  const gy = new Float64Array(GN)
  const gvx = new Float64Array(GN)
  const gvy = new Float64Array(GN)
  const g0 = { x: new Float64Array(GN), y: new Float64Array(GN), vx: new Float64Array(GN), vy: new Float64Array(GN) }
  const GCELL = 2 * GR
  const GCX = Math.max(1, Math.floor(GW / GCELL))
  const GCY = Math.max(1, Math.floor(1 / GCELL))
  const gHead = new Int32Array(GCX * GCY)
  const gNext = new Int32Array(GN)
  const pairI = new Int32Array(GN * 8)
  const pairJ = new Int32Array(GN * 8)
  let gT = 0
  let gDir = 1
  let gWall = true
  let gAutoDone = false
  const revs: number[] = []
  const hist = new Float32Array(G_SPAN * HIST_HZ + 2)
  let histN = 0
  const TRAIL = 90
  const trailX = new Float32Array(TRAIL)
  const trailY = new Float32Array(TRAIL)
  let trailN = 0
  let trailTick = 0

  // four disks in a small box: they do come back
  const IN = 4
  const IR = 0.085
  const ix = new Float64Array(IN)
  const iy = new Float64Array(IN)
  const ivx = new Float64Array(IN)
  const ivy = new Float64Array(IN)
  let inSteps = 0
  let inLeft = 0
  let inEvents = 0
  let inWas = false
  let inFlash = -10

  {
    const r = (() => {
      let a = 4242
      return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    })()
    const gauss = () => {
      let u = 0
      while (u === 0) u = r()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r())
    }
    for (let i = 0; i < GN; i++) {
      let ok = false
      let tries = 0
      while (!ok && tries++ < 400) {
        gx[i] = GR * 1.05 + r() * (GW / 2 - GR * 2.1)
        gy[i] = GR * 1.05 + r() * (1 - GR * 2.1)
        ok = true
        for (let j = 0; j < i; j++) {
          const ddx = gx[i] - gx[j]
          const ddy = gy[i] - gy[j]
          if (ddx * ddx + ddy * ddy < 4.4 * GR * GR) {
            ok = false
            break
          }
        }
      }
      gvx[i] = gauss() * 0.3
      gvy[i] = gauss() * 0.3
    }
    // a second of life behind the partition, so it is already a gas
    for (let s = 0; s < 480; s++) gasStep(false)
    g0.x.set(gx)
    g0.y.set(gy)
    g0.vx.set(gvx)
    g0.vy.set(gvy)
    for (let i = 0; i < IN; i++) {
      ix[i] = 0.2 + (i % 2) * 0.9 + r() * 0.2
      iy[i] = 0.25 + Math.floor(i / 2) * 0.5
      const a = r() * TAU
      ivx[i] = Math.cos(a) * 1.1
      ivy[i] = Math.sin(a) * 1.1
    }
  }

  function gasWalls() {
    for (let i = 0; i < GN; i++) {
      if (gx[i] < GR && gvx[i] < 0) gvx[i] = -gvx[i]
      if (gx[i] > GW - GR && gvx[i] > 0) gvx[i] = -gvx[i]
      if (gy[i] < GR && gvy[i] < 0) gvy[i] = -gvy[i]
      if (gy[i] > 1 - GR && gvy[i] > 0) gvy[i] = -gvy[i]
      if (gWall && gx[i] > GW / 2 - GR && gx[i] < GW / 2 && gvx[i] > 0) gvx[i] = -gvx[i]
    }
  }

  /**
   * The collision kick, applied after every drift. Walls, then pairs in a
   * fixed order; a reversed run applies them in the opposite order, so the
   * kick undoes itself and the scheme runs backward step for step.
   */
  function gasKick() {
    if (gDir > 0) gasWalls()
    gHead.fill(-1)
    for (let i = 0; i < GN; i++) {
      const cx = Math.min(GCX - 1, Math.max(0, Math.floor((gx[i] / GW) * GCX)))
      const cy = Math.min(GCY - 1, Math.max(0, Math.floor(gy[i] * GCY)))
      const c = cy * GCX + cx
      gNext[i] = gHead[c]
      gHead[c] = i
    }
    const D2 = 4 * GR * GR
    let np = 0
    for (let i = 0; i < GN; i++) {
      const cx = Math.min(GCX - 1, Math.max(0, Math.floor((gx[i] / GW) * GCX)))
      const cy = Math.min(GCY - 1, Math.max(0, Math.floor(gy[i] * GCY)))
      for (let oy2 = -1; oy2 <= 1; oy2++)
        for (let ox2 = -1; ox2 <= 1; ox2++) {
          const qx = cx + ox2
          const qy = cy + oy2
          if (qx < 0 || qy < 0 || qx >= GCX || qy >= GCY) continue
          for (let j = gHead[qy * GCX + qx]; j >= 0; j = gNext[j]) {
            if (j <= i) continue
            const ddx = gx[j] - gx[i]
            const ddy = gy[j] - gy[i]
            const d2 = ddx * ddx + ddy * ddy
            if (d2 >= D2 || d2 === 0 || np >= pairI.length) continue
            pairI[np] = i
            pairJ[np] = j
            np++
          }
        }
    }
    for (let q = 0; q < np; q++) {
      const p = gDir > 0 ? q : np - 1 - q
      const i = pairI[p]
      const j = pairJ[p]
      const ddx = gx[j] - gx[i]
      const ddy = gy[j] - gy[i]
      const d2 = ddx * ddx + ddy * ddy
      const dot = (gvx[j] - gvx[i]) * ddx + (gvy[j] - gvy[i]) * ddy
      if (dot >= 0) continue
      // equal masses, perfectly elastic: exchange the normal components
      const k = dot / d2
      gvx[i] += k * ddx
      gvy[i] += k * ddy
      gvx[j] -= k * ddx
      gvy[j] -= k * ddy
    }
    if (gDir < 0) gasWalls()
  }

  function gasStep(track = true) {
    for (let i = 0; i < GN; i++) {
      gx[i] += gvx[i] * GDT
      gy[i] += gvy[i] * GDT
    }
    gasKick()
    if (!track) return
    gT += GDT
    if (gWall && gT >= G_LIFT) gWall = false
    if (!gAutoDone && gT >= G_REV) {
      gAutoDone = true
      reverseGas()
    }
    const hk = Math.floor(gT * HIST_HZ)
    if (hk > histN - 1 && hk < hist.length) {
      let n = 0
      for (let i = 0; i < GN; i++) if (gx[i] < GW / 2) n++
      for (let q = histN; q <= hk; q++) hist[q] = n / GN
      histN = hk + 1
    }
    if (++trailTick % 12 === 0) {
      if (trailN < TRAIL) trailN++
      for (let q = trailN - 1; q > 0; q--) {
        trailX[q] = trailX[q - 1]
        trailY[q] = trailY[q - 1]
      }
      trailX[0] = gx[0]
      trailY[0] = gy[0]
    }
    insetStep()
  }

  /** Loschmidt's reversal: every velocity flips (and the last kick is undone at once). */
  function reverseGas() {
    for (let i = 0; i < GN; i++) {
      gvx[i] = -gvx[i]
      gvy[i] = -gvy[i]
    }
    gDir = -gDir
    gasKick()
    revs.push(gT)
    sfx.noise(1.4, { filter: 2400, to: 380, q: 0.7, gain: 0.035, room: 0.4 })
    sfx.tone(587.33, 1.6, { type: 'sine', gain: 0.03, to: 440, room: 0.5 })
  }

  function insetStep() {
    const W2 = GW
    for (let i = 0; i < IN; i++) {
      ix[i] += ivx[i] * GDT
      iy[i] += ivy[i] * GDT
      if (ix[i] < IR && ivx[i] < 0) ivx[i] = -ivx[i]
      if (ix[i] > W2 - IR && ivx[i] > 0) ivx[i] = -ivx[i]
      if (iy[i] < IR && ivy[i] < 0) ivy[i] = -ivy[i]
      if (iy[i] > 1 - IR && ivy[i] > 0) ivy[i] = -ivy[i]
    }
    for (let i = 0; i < IN; i++)
      for (let j = i + 1; j < IN; j++) {
        const ddx = ix[j] - ix[i]
        const ddy = iy[j] - iy[i]
        const d2 = ddx * ddx + ddy * ddy
        if (d2 >= 4 * IR * IR || d2 === 0) continue
        const dot = (ivx[j] - ivx[i]) * ddx + (ivy[j] - ivy[i]) * ddy
        if (dot >= 0) continue
        const k = dot / d2
        ivx[i] += k * ddx
        ivy[i] += k * ddy
        ivx[j] -= k * ddx
        ivy[j] -= k * ddy
      }
    let all = true
    for (let i = 0; i < IN; i++) if (ix[i] >= W2 / 2) all = false
    inSteps++
    if (all) inLeft++
    if (all && !inWas) {
      inEvents++
      inFlash = gT
      sfx.tone(1318.5, 1.6, { type: 'sine', gain: 0.03, room: 0.5 })
      sfx.tone(659.25, 1.9, { type: 'sine', gain: 0.022, room: 0.5, when: 0.02 })
    }
    inWas = all
  }

  function gasReset() {
    gx.set(g0.x)
    gy.set(g0.y)
    gvx.set(g0.vx)
    gvy.set(g0.vy)
    gT = 0
    gDir = 1
    gWall = true
    gAutoDone = false
    revs.length = 0
    histN = 0
    trailN = 0
    inSteps = 0
    inLeft = 0
    inEvents = 0
    inWas = false
    inFlash = -10
  }

  function gasTo(g: number, budget: number) {
    while (gT + GDT <= g && budget-- > 0) gasStep()
  }

  /* ---------------------------------------------------------- layout */

  let w = env.width
  let h = env.height
  let stacked = false
  let short = false
  let tiny = false
  let narrow = false
  let pad = 16
  let topY = 50
  let botY = 0
  let rulerY = -1
  const hero: Rect = { x: 0, y: 0, w: 0, h: 0 }
  const info: Rect = { x: 0, y: 0, w: 0, h: 0 }
  let capX = 0
  let capY = 0
  let capSize = 30
  let capTop = 0
  // beaker (px)
  let bx = 0
  let by = 0
  let bw = 100
  let bd = 125
  let pipTop = 0
  let stripY = 0
  let stripH = 0
  // gas box (px)
  const box: Rect = { x: 0, y: 0, w: 0, h: 0 }

  function layout() {
    w = env.width
    h = env.height
    stacked = h > w * 1.15
    short = !stacked && h < 440
    tiny = h < 260
    narrow = w < 520
    pad = clamp(Math.min(w, h) * 0.045, preview || short ? 10 : 14, 40)
    topY = pad + (tiny ? 30 : preview || short ? 36 : 48)
    rulerY = !preview && h >= 330 ? h - pad * 0.55 : -1
    botY = rulerY > 0 ? rulerY - (short ? 18 : 22) : h - pad
    const gap = clamp(w * 0.03, 12, 48)
    if (stacked) {
      capSize = clamp(Math.min(w * 0.068, h * 0.042), 17, 40)
      const capBlock = capSize * 2.35
      hero.x = pad
      hero.w = w - pad * 2
      hero.y = topY
      hero.h = (botY - topY - capBlock) * 0.6
      info.x = pad
      info.w = w - pad * 2
      info.y = hero.y + hero.h + 10
      info.h = botY - info.y
    } else {
      const ratio = short ? 0.4 : 0.5
      hero.x = pad
      hero.w = (w - pad * 2 - gap) * ratio
      hero.y = topY
      hero.h = botY - topY
      info.x = hero.x + hero.w + gap
      info.w = w - pad - info.x
      info.y = topY
      info.h = botY - topY
      capSize = clamp(Math.min(info.w * 0.072, h * (short ? 0.085 : 0.06)), tiny ? 14 : 15, 46)
    }
    capX = info.x
    const lines = 2
    capY = info.y + info.h - capSize * 1.04 * (lines - 1) - capSize * 0.28
    capTop = capY - capSize * 1.05

    // the beaker: pipette above, water, a glass base, the film strip below
    stripH = preview ? 0 : tiny ? 12 : 18
    const stripGap = preview ? 4 : tiny ? 8 : 14
    const full = 0.98 + A + 0.07
    const minU = 0.5 + A + 0.07
    const avail = hero.h - stripH - stripGap - (preview || tiny ? 0 : 14)
    // tall frames show the whole pipette; short ones cut it with a break line
    const bwPx = Math.min(avail / (h >= 500 || stacked ? full : minU), (hero.w * 0.8) / 1.06)
    bw = Math.max(30, bwPx)
    bd = bw * A
    const used = Math.min(full, avail / bw)
    const top = hero.y + (avail - used * bw) / 2
    by = top + (used - A - 0.07) * bw
    bx = hero.x + (hero.w - bw) / 2
    pipTop = Math.max(hero.y, by - 0.98 * bw)
    stripY = by + bd + bw * 0.07 + stripGap
    // the gas box
    const bxW = Math.min(hero.w, (hero.h - (preview ? 8 : 20)) * GW)
    box.w = bxW
    box.h = bxW / GW
    box.x = hero.x + (hero.w - box.w) / 2
    box.y = hero.y + (hero.h - box.h) / 2
  }
  layout()

  /* ----------------------------------------------------------- clock */

  const sfx = env.sfx
  const atP = Number(env.params.get('at'))
  // previews open on the drop entering the water
  let clock = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 3.4 : 0
  let prevT = -1
  let seekFlag = false
  // film: offset from the automatic schedule, and a manual direction
  let fOffset = 0
  let manual: number | null = null
  let tau = 0
  let shownS = 0
  let filmDirShown = 1
  // pointer state
  const ptr = { x: 0, y: 0, over: false, down: false, mode: '' as '' | 'water' | 'strip' | 'ruler' | 'box', sx: 0, sy: 0, ms: 0, moved: false, touch: false, lx: 0, ly: 0 }
  let stirredOnce = false
  let scrubbedOnce = false
  let tappedOnce = false
  let gasTapped = false
  let scrubTarget = -1
  let stirring = false
  let lastSwish = 0
  let gasEntered = false

  function chapterOf(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }

  function curT() {
    return (((prevT < 0 ? clock : prevT) % LOOP) + LOOP) % LOOP
  }

  /** Jump the story to T: the film and the gas are brought to where the schedule says. */
  function seek(target: number) {
    const T = curT()
    clock += target - T
    seekFlag = true
    fOffset = 0
    manual = null
    scrubTarget = -1
    if (target < 40) {
      const need = Math.ceil(Math.max(filmAt(target), target >= 24 ? 24.6 : 0) * FPS) + 1
      ensure(need, 100000)
    }
    if (target >= 40 && target < 60) {
      gasReset()
      gasEntered = true
      gasTo(target - 40, 1e9)
    }
  }

  function film01(x: number) {
    return (x - bx) / bw
  }

  function stripSpan() {
    return Math.max(25, frontier / FPS)
  }

  function onStrip(x: number, y: number) {
    if (preview || stripH <= 0) return false
    const pad2 = ptr.touch ? 14 : 8
    return x > bx - 16 && x < bx + bw + 16 && y > stripY - pad2 && y < stripY + stripH + pad2
  }
  function inWater(x: number, y: number) {
    return x > bx && x < bx + bw && y > by - 4 && y < by + bd
  }
  function inBox(x: number, y: number) {
    return x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h
  }
  function onRuler(x: number, y: number) {
    return !preview && rulerY > 0 && y > rulerY - 18 && y < h && x > pad - 8 && x < w - pad + 8
  }
  function seekRuler(x: number) {
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.2) target = c.t
    seek(Math.min(LOOP - 0.05, target))
  }

  /** Tap: reverse the film (glass chapters) or every velocity (the gas). */
  function tapAction(T: number) {
    if (T >= 40 && T < 60) {
      if (gT > G_LIFT) {
        reverseGas()
        gasTapped = true
      }
      return
    }
    if (T >= 60) return
    tappedOnce = true
    if (manual === null) {
      const r = filmRate(T)
      manual = r > 0.2 ? -1 : 1
    } else manual = null
    sfx.tone(manual === -1 ? 660 : 440, 0.5, { type: 'sine', gain: 0.03, to: manual === -1 ? 330 : 880, room: 0.3 })
  }

  /* --------------------------------------------------------- drawing */

  const k = {
    ink: C.ink,
    ink2: C.ink2,
    muted: C.muted,
    rule: C.rule,
    faint: 'rgba(18,38,48,0.07)',
  }

  /** Mono text with a paper halo, legible over ink. */
  function halo(str: string, x: number, y: number, o: TextOpts) {
    const lw0 = ctx.lineWidth
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.9)
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.lineJoin = 'miter'
    ctx.lineWidth = lw0
    text(ctx, str, x, y, o)
  }

  /** Width of mono text. */
  function tw(str: string, size: number, tracking = 0.12) {
    setFont(ctx, { size, tracking })
    const v = ctx.measureText(str).width
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    return v
  }

  /** "10" with a raised exponent, e.g. pow('1 in 10', '3806'). Returns the width drawn. */
  function pow(base: string, exp: string, x: number, y: number, o: TextOpts, align: 'left' | 'right' = 'left') {
    const size = o.size ?? 10
    const bwid = tw(base, size, o.tracking ?? 0.12)
    const ewid = tw(exp, size * 0.72, 0.06)
    const total = bwid + ewid + 1
    const x0 = align === 'right' ? x - total : x
    text(ctx, base, x0, y, { ...o, align: 'left' })
    text(ctx, exp, x0 + bwid + 1, y - size * 0.42, { ...o, size: size * 0.72, tracking: 0.06, align: 'left' })
    return total
  }

  function drawPipette(f: number, alpha: number) {
    const cx = bx + PIP_X * bw
    const tipY = by + TIP_Y * bw
    const tw0 = Math.max(1.2, bw * 0.009)
    const tw1 = bw * 0.034
    const cone = bw * 0.13
    const tubeTop = by - 0.8 * bw
    const bulbTop = by - 0.98 * bw
    const cut = pipTop > bulbTop + 1
    const yTop = cut ? pipTop + 2 : tubeTop
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = k.ink2
    // ink inside the tube: its level drops as the drop swells (and rises when the film runs back)
    const level = lerp(tipY - cone - bw * 0.16, tipY - cone - bw * 0.1, clamp(f / SWELL))
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(cx - tw0, tipY)
    ctx.lineTo(cx - tw1, tipY - cone)
    ctx.lineTo(cx - tw1, Math.max(yTop, level))
    ctx.lineTo(cx + tw1, Math.max(yTop, level))
    ctx.lineTo(cx + tw1, tipY - cone)
    ctx.lineTo(cx + tw0, tipY)
    ctx.closePath()
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.55)
    const gapH = Math.max(2.2, bw * 0.012)
    ctx.beginPath()
    for (let yy = tipY + 4; yy > Math.max(yTop, level) - 4; yy -= gapH) {
      ctx.moveTo(cx - tw1 - 2, yy)
      ctx.lineTo(cx + tw1 + 2, yy - tw1)
    }
    ctx.stroke()
    ctx.restore()
    // the glass
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    ctx.moveTo(cx - tw0, tipY)
    ctx.lineTo(cx - tw1, tipY - cone)
    ctx.lineTo(cx - tw1, yTop)
    ctx.moveTo(cx + tw0, tipY)
    ctx.lineTo(cx + tw1, tipY - cone)
    ctx.lineTo(cx + tw1, yTop)
    ctx.moveTo(cx - tw0, tipY)
    ctx.lineTo(cx + tw0, tipY)
    ctx.stroke()
    if (!cut) {
      // the rubber bulb, hatched
      ctx.beginPath()
      ctx.ellipse(cx, (tubeTop + bulbTop) / 2, tw1 * 1.9, (tubeTop - bulbTop) / 2, 0, 0, TAU)
      ctx.stroke()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = rgba(C.ink, 0.28)
      ctx.beginPath()
      for (let d = -tw1 * 6; d < tw1 * 6; d += 3) {
        ctx.moveTo(cx + d, tubeTop)
        ctx.lineTo(cx + d + (tubeTop - bulbTop), bulbTop)
      }
      ctx.stroke()
      ctx.restore()
    } else {
      // a break line: the drawing continues above
      ctx.beginPath()
      const yb = pipTop + 2
      ctx.moveTo(cx - tw1 - 4, yb + 2)
      ctx.lineTo(cx - tw1 * 0.3, yb - 1)
      ctx.lineTo(cx + tw1 * 0.3, yb + 3)
      ctx.lineTo(cx + tw1 + 4, yb)
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawBeaker(f: number, alpha: number, reveal = 1) {
    const t = Math.max(2.5, bw * 0.016)
    const lip = by - bw * 0.2
    const base = bw * 0.07
    ctx.save()
    if (reveal < 1) {
      ctx.beginPath()
      ctx.rect(0, lerp(by + bd + base + 4, pipTop - 4, ease.inOutCubic(reveal)), w, h)
      ctx.clip()
    }
    ctx.globalAlpha = alpha
    // water
    ctx.fillStyle = rgba(C.sky, 0.09)
    ctx.fillRect(bx, by, bw, bd)
    // walls: inner and outer lines, a rolled lip, a thick hatched base
    ctx.lineWidth = 1
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    ctx.moveTo(bx, lip)
    ctx.lineTo(bx, by + bd)
    ctx.lineTo(bx + bw, by + bd)
    ctx.lineTo(bx + bw, lip)
    ctx.moveTo(bx - t, lip + 2)
    ctx.lineTo(bx - t, by + bd + base)
    ctx.lineTo(bx + bw + t, by + bd + base)
    ctx.lineTo(bx + bw + t, lip + 2)
    ctx.stroke()
    // lip: a small roll on each side, a pour spout on the left
    ctx.beginPath()
    ctx.moveTo(bx + bw, lip)
    ctx.quadraticCurveTo(bx + bw + t * 0.5, lip - t * 1.2, bx + bw + t * 1.6, lip - t * 0.2)
    ctx.lineTo(bx + bw + t, lip + 2)
    ctx.moveTo(bx, lip)
    ctx.quadraticCurveTo(bx - t * 1.2, lip - t * 1.6, bx - t * 2.8, lip - t * 1.4)
    ctx.quadraticCurveTo(bx - t * 2.2, lip - t * 0.2, bx - t, lip + 2)
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.rect(bx - t, by + bd, bw + t * 2, base)
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.22)
    ctx.beginPath()
    for (let d = -base; d < bw + t * 2 + base; d += 4) {
      ctx.moveTo(bx - t + d, by + bd + base)
      ctx.lineTo(bx - t + d + base, by + bd)
    }
    ctx.stroke()
    ctx.restore()
    // graduations on the right wall
    if (bw > 70 && !preview) {
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.beginPath()
      const nG = 10
      for (let g = 1; g < nG; g++) {
        const yy = Math.round(by + bd - (bd * g) / nG) + 0.5
        const len = g % 2 === 0 ? bw * 0.08 : bw * 0.045
        ctx.moveTo(bx + bw - 1, yy)
        ctx.lineTo(bx + bw - 1 - len, yy)
      }
      ctx.stroke()
      if (bw > 120)
        for (let g = 2; g < 10; g += 2) {
          const yy = by + bd - (bd * g) / 10
          text(ctx, String(g * 50), bx + bw - bw * 0.1, yy + 3, { size: 8, color: k.muted, align: 'right', tracking: 0.06 })
        }
      if (bw > 120) text(ctx, 'ML', bx + bw - bw * 0.1, by + bd - bd * 0.9 + 3, { size: 8, color: k.muted, align: 'right', tracking: 0.1 })
    }
    // the surface: a meniscus, and ripples where the drop went in
    const s = f - F_IN
    const rip = s > 0 && s < 2.5 ? Math.exp(-s * 1.8) * Math.min(1, s * 20) : 0
    const cx = bx + PIP_X * bw
    ctx.strokeStyle = k.ink
    ctx.beginPath()
    const steps = Math.max(24, Math.floor(bw / 3))
    for (let q = 0; q <= steps; q++) {
      const x = bx + (bw * q) / steps
      const men = 3 * (Math.exp(-(x - bx) / 5) + Math.exp(-(bx + bw - x) / 5))
      const d = Math.abs(x - cx) / bw
      const wave = rip ? Math.sin(d * 46 - s * 16) * Math.exp(-d * 5) * rip * bw * 0.018 : 0
      const y = by - men + wave
      if (q) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  function drawInk(alpha: number, showGrid: number, accents: number, dir: number) {
    // coarse-graining grid
    if (showGrid > 0.01) {
      ctx.save()
      ctx.globalAlpha = alpha * showGrid
      ctx.strokeStyle = rgba(C.ink, 0.12)
      ctx.lineWidth = 1
      ctx.setLineDash([1, 3])
      ctx.beginPath()
      for (let i = 1; i < CGX; i++) {
        const x = Math.round(bx + (bw * i) / CGX) + 0.5
        ctx.moveTo(x, by + 2)
        ctx.lineTo(x, by + bd)
      }
      for (let j = 1; j < CGY; j++) {
        const y = Math.round(by + (bd * j) / CGY) + 0.5
        ctx.moveTo(bx, y)
        ctx.lineTo(bx + bw, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
    // the ink as a wash: particle density on a fine grid, blurred, set as a thin tint
    if (washCtx && washImg) {
      washCount.fill(0)
      for (let i = 0; i < N; i++) {
        if (dy[i] < 0) continue
        const cx = Math.min(WX - 1, Math.floor(dx[i] * WX))
        const cy = Math.min(WY - 1, Math.floor((dy[i] / A) * WY))
        washCount[cy * WX + cx]++
      }
      // two passes of a 3 × 3 box blur
      for (let pass = 0; pass < 2; pass++) {
        const src = pass === 0 ? washCount : washTmp2
        const dst = pass === 0 ? washTmp : washTmp2
        if (pass === 1) washTmp2.set(washTmp)
        for (let j = 0; j < WY; j++)
          for (let i = 0; i < WX; i++) {
            let sum = 0
            let n = 0
            for (let b = -1; b <= 1; b++) {
              const jj = j + b
              if (jj < 0 || jj >= WY) continue
              for (let a = -1; a <= 1; a++) {
                const ii = i + a
                if (ii < 0 || ii >= WX) continue
                sum += src[jj * WX + ii]
                n++
              }
            }
            dst[j * WX + i] = sum / n
          }
        if (pass === 1) washTmp.set(washTmp2)
      }
      const d = washImg.data
      const scale = (WX * WY) / N
      for (let c = 0; c < WX * WY; c++) {
        const v = washTmp[c] * scale
        d[c * 4] = 16
        d[c * 4 + 1] = 40
        d[c * 4 + 2] = 58
        d[c * 4 + 3] = Math.round(255 * 0.88 * (1 - Math.exp(-v / 9)))
      }
      washCtx.putImageData(washImg, 0, 0)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(washCtx.canvas, bx, by, bw, bd)
      ctx.restore()
    }
    // the drop itself, while it hangs and falls: dark, with a glint
    if (tau < F_IN + 0.02 && tau > 0.02) {
      const { r, cy } = dropAt(Math.min(tau, F_IN - 1e-3))
      const X = bx + PIP_X * bw
      const Y = by + cy * bw
      const R = r * bw * 1.08
      if (R > 0.6) {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#10283a'
        ctx.beginPath()
        ctx.arc(X, Y, R, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = rgba(C.paper, 0.75)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(X, Y, R * 0.62, -Math.PI * 0.85, -Math.PI * 0.55)
        ctx.stroke()
        ctx.restore()
      }
    }
    // the particles: fine grain over the wash
    const sz = preview ? 1.4 : bw > 300 ? 1.6 : 1.35
    ctx.save()
    ctx.globalAlpha = alpha * (preview ? 0.4 : 0.42) * clamp(bw / 260, 0.5, 1)
    ctx.fillStyle = '#10283a'
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      ctx.rect(bx + dx[i] * bw - sz / 2, by + dy[i] * bw - sz / 2, sz, sz)
    }
    ctx.fill()
    ctx.restore()
    // three walks, drawn from the film itself (the trail points into the film's past)
    if (accents > 0.01 && frontier > 2) {
      const fk = clamp(tau * FPS, 0, frontier)
      const span = 1.8 * FPS
      ctx.save()
      ctx.lineWidth = 1
      for (let a = 0; a < ACC.length; a++) {
        const i = ACC[a]
        ctx.strokeStyle = ACC_COL[a]
        ctx.globalAlpha = alpha * accents * 0.75
        ctx.beginPath()
        let first = true
        const kMin = Math.ceil((F_IN + 0.25) * FPS)
        for (let q = 0; q <= 26; q++) {
          const kk = Math.round(fk - dir * (span * q) / 26)
          if (kk < kMin || kk > frontier) break
          const b = kk * N * 2 + i * 2
          const x = bx + (film[b] / 65535) * bw
          const y = by + (film[b + 1] / QY + YMIN) * bw
          if (first) ctx.moveTo(bx + dx[i] * bw, by + dy[i] * bw)
          ctx.lineTo(x, y)
          first = false
        }
        ctx.stroke()
        ctx.globalAlpha = alpha * accents
        ctx.fillStyle = ACC_COL[a]
        ctx.beginPath()
        ctx.arc(bx + dx[i] * bw, by + dy[i] * bw, preview ? 1.8 : 2.4, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  function drawStrip(alpha: number, dir: number, T: number) {
    if (stripH <= 0) return
    const x0 = bx - 6
    const x1 = bx + bw + 6
    const span = stripSpan()
    const y0 = stripY
    const y1 = stripY + stripH
    const toX = (s: number) => lerp(x0, x1, clamp(s / span))
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    // recorded film: a faint wash
    ctx.fillStyle = rgba(C.ink, 0.06)
    ctx.fillRect(x0, y0, toX(frontier / FPS) - x0, stripH)
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.beginPath()
    ctx.moveTo(x0, Math.round(y0) + 0.5)
    ctx.lineTo(x1, Math.round(y0) + 0.5)
    ctx.moveTo(x0, Math.round(y1) + 0.5)
    ctx.lineTo(x1, Math.round(y1) + 0.5)
    // one frame per second of film
    for (let s = 0; s <= span; s += 1) {
      const x = Math.round(toX(s)) + 0.5
      ctx.moveTo(x, y0 + (stripH > 14 ? 4 : 2))
      ctx.lineTo(x, y1 - (stripH > 14 ? 4 : 2))
    }
    ctx.stroke()
    if (stripH > 14) {
      // sprocket holes
      ctx.strokeStyle = rgba(C.ink, 0.3)
      ctx.beginPath()
      for (let x = x0 + 3; x < x1 - 3; x += 7) {
        ctx.rect(Math.round(x) + 0.5, Math.round(y0 + 1.2) + 0.5, 2.5, 1.6)
        ctx.rect(Math.round(x) + 0.5, Math.round(y1 - 2.8) + 0.5, 2.5, 1.6)
      }
      ctx.stroke()
    }
    // playhead
    const px = toX(tau)
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(px, y0 - 4)
    ctx.lineTo(px, y1 + 4)
    ctx.stroke()
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    if (dir < 0) {
      ctx.moveTo(px - 5, y0 - 8)
      ctx.lineTo(px + 1, y0 - 11)
      ctx.lineTo(px + 1, y0 - 5)
    } else {
      ctx.moveTo(px + 5, y0 - 8)
      ctx.lineTo(px - 1, y0 - 11)
      ctx.lineTo(px - 1, y0 - 5)
    }
    ctx.fill()
    // time code
    if (!tiny) {
      const tc = `${dir < 0 ? '◀ ' : ''}${String(Math.floor(tau)).padStart(2, '0')}.${Math.floor((tau % 1) * 10)} S${dir > 0 ? ' ▶' : ''}`
      text(ctx, 'FILM', x0, y1 + 13, { size: 8, color: k.muted, tracking: 0.14 })
      text(ctx, tc, x1, y1 + 13, { size: 8.5, color: dir < 0 ? C.ocean : k.ink2, align: 'right', tracking: 0.1 })
    }
    // the ghost: a hand dragging the film back
    const g0 = 26.2
    const g1 = 30.6
    if (!preview && !scrubbedOnce && !tappedOnce && T > g0 && T < g1) {
      const u = (T - g0) / (g1 - g0)
      const ga = smoothstep(0, 0.12, u) * (1 - smoothstep(0.85, 1, u))
      const gx0 = x0 + (x1 - x0) * 0.86
      const gx1 = x0 + (x1 - x0) * 0.3
      const gxp = lerp(gx0, gx1, ease.inOutSine(clamp((u - 0.1) / 0.75)))
      const gy0 = (y0 + y1) / 2
      ctx.globalAlpha = alpha * ga
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.moveTo(gx0, gy0)
      ctx.lineTo(gxp, gy0)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(gxp, gy0, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(gxp, gy0, 9, 0, TAU)
      ctx.stroke()
      // beside the strip if there is room, otherwise just inside the water
      const label = 'DRAG THE FILM'
      const sub = 'OR TAP THE WATER'
      const lw = tw(label, 9, 0.14)
      if (x1 + 16 + lw < hero.x + hero.w) {
        halo(label, x1 + 16, gy0 - 2, { size: 9, color: C.ocean, tracking: 0.14 })
        halo(sub, x1 + 16, gy0 + 10, { size: 8.5, color: k.muted, tracking: 0.14 })
      } else if (x0 - 16 - lw > hero.x) {
        halo(label, x0 - 16, gy0 - 2, { size: 9, color: C.ocean, tracking: 0.14, align: 'right' })
        halo(sub, x0 - 16, gy0 + 10, { size: 8.5, color: k.muted, tracking: 0.14, align: 'right' })
      } else halo(label, bx + bw / 2, by + bd - 12, { size: 9, color: C.ocean, tracking: 0.14, align: 'center' })
    }
    ctx.restore()
  }

  function stirGhost(T: number) {
    const g0 = 8.6
    const g1 = 12.8
    if (preview || stirredOnce || T < g0 || T > g1) return null
    const u = (T - g0) / (g1 - g0)
    const a = -Math.PI * 0.6 + u * TAU * 1.05
    const cxn = 0.5
    const cyn = A * 0.55
    const rad = 0.2
    return { x: cxn + Math.cos(a) * rad, y: cyn + Math.sin(a) * rad, a, u, cxn, cyn, rad, s: smoothstep(0, 0.1, u) * (1 - smoothstep(0.88, 1, u)) }
  }

  function drawStirMarks(T: number, alpha: number) {
    const g = stirGhost(T)
    if (g) {
      ctx.save()
      ctx.globalAlpha = alpha * g.s
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.arc(bx + g.cxn * bw, by + g.cyn * bw, g.rad * bw, -Math.PI * 0.6, g.a)
      ctx.stroke()
      ctx.setLineDash([])
      const X = bx + g.x * bw
      const Y = by + g.y * bw
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(X, Y, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(X, Y, 10, 0, TAU)
      ctx.stroke()
      halo('DRAG TO STIR', bx + bw / 2, by + g.cyn * bw - g.rad * bw - 14, { size: 9.5, color: C.ocean, align: 'center', tracking: 0.14 })
      ctx.restore()
    }
    if (!preview && ptr.over && !ptr.touch && inWater(ptr.x, ptr.y) && !ptr.down) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = rgba(C.ocean, 0.6)
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.arc(ptr.x, ptr.y, 0.085 * bw * 1.4, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      if (!stirredOnce) halo('DRAG TO STIR · TAP TO REVERSE', clamp(ptr.x, bx + 40, bx + bw - 40), ptr.y - 0.085 * bw * 1.4 - 8, { size: 8.5, color: C.ocean, align: 'center', tracking: 0.12 })
      ctx.restore()
    }
    if (stirring) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      ctx.arc(ptr.x, ptr.y, 5, 0, TAU)
      ctx.moveTo(ptr.x - 12, ptr.y)
      ctx.lineTo(ptr.x - 7, ptr.y)
      ctx.moveTo(ptr.x + 7, ptr.y)
      ctx.lineTo(ptr.x + 12, ptr.y)
      ctx.stroke()
      ctx.restore()
    }
  }

  /** The entropy plot and the macrostate, in the info column. Returns the y below them. */
  function drawEntropyPanel(alpha: number, S: number, T: number, ch: number) {
    const r = info
    const capReserve = capSize * 2.4 + 12
    const avail = r.h - capReserve
    if (avail < 50) return
    const titleH = 16
    const plotH = Math.min(stacked ? avail * 0.62 : avail * (short ? 0.78 : 0.5), short ? 120 : clamp(h * 0.28, 230, 320))
    const plotW = Math.min(r.w - 30, clamp(w * 0.38, 560, 760))
    const x0 = r.x + 26
    const y0 = r.y + titleH + 6
    const x1 = x0 + plotW - 26
    const y1 = y0 + plotH
    const span = Math.max(25, Math.ceil(frontier / FPS / 5) * 5)
    const toX = (s: number) => lerp(x0, x1, s / span)
    const toY = (v: number) => lerp(y1, y0, v / (S_MAX * 1.08))
    ctx.save()
    ctx.globalAlpha = alpha
    text(ctx, 'COARSE-GRAINED ENTROPY', r.x, r.y + 8, { size: 9, color: k.ink2, tracking: 0.14 })
    if (!tiny && r.w > 300) text(ctx, 'S = −Σ p ln p', r.x + r.w, r.y + 8, { size: 9.5, color: k.ink2, align: 'right', tracking: 0.04 })
    // axes
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.beginPath()
    ctx.moveTo(x0, y0 - 4)
    ctx.lineTo(x0, y1)
    ctx.lineTo(x1 + 4, y1)
    for (let s = 0; s <= span; s += 5) {
      const x = Math.round(toX(s)) + 0.5
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y1 + 4)
    }
    ctx.stroke()
    for (let s = 0; s <= span; s += plotW < 260 ? 10 : 5) text(ctx, String(s), toX(s), y1 + 13, { size: 8, color: k.muted, align: 'center', tracking: 0.04 })
    if (!short) text(ctx, 'FILM TIME, S', x1, y1 + 26, { size: 8, color: k.muted, align: 'right', tracking: 0.14 })
    // the ceiling: every cell equally full
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x0, toY(S_MAX))
    ctx.lineTo(x1, toY(S_MAX))
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, `ln ${CELLS} = ${S_MAX.toFixed(2)}`, x0 + 4, toY(S_MAX) - 5, { size: 8, color: k.muted, tracking: 0.06 })
    text(ctx, 'S', x0 - 8, y0 + 4, { size: 9, color: k.muted, align: 'right' })
    text(ctx, '0', x0 - 8, y1 + 3, { size: 8, color: k.muted, align: 'right' })
    // the recorded curve
    if (frontier > 0) {
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      for (let q = 0; q <= frontier; q++) {
        const x = toX(q / FPS)
        const y = toY(entropy[q])
        if (q) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
    }
    // playhead
    const hx = toX(tau)
    const hy = toY(S)
    ctx.strokeStyle = C.ocean
    ctx.setLineDash([1.5, 3])
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(hx, y1)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(hx, hy, 3, 0, TAU)
    ctx.fill()
    ctx.restore()

    // the macrostate: the same particles, counted by cell
    let yb = y1 + (short ? 22 : 36)
    const room = r.y + r.h - capReserve - yb
    const cs = Math.floor(Math.min((room - 14) / CGY, (r.w * 0.34) / CGX, stacked ? 9 : 13))
    if (cs >= 4 && !tiny) {
      ctx.save()
      ctx.globalAlpha = alpha
      text(ctx, 'MACROSTATE', r.x, yb, { size: 8.5, color: k.ink2, tracking: 0.14 })
      yb += 8
      counts.fill(0)
      for (let i = 0; i < N; i++) {
        const cx = Math.min(CGX - 1, Math.max(0, Math.floor(dx[i] * CGX)))
        const cy = Math.max(0, Math.min(CGY - 1, Math.floor((dy[i] / A) * CGY)))
        counts[cy * CGX + cx]++
      }
      const mx = r.x
      for (let j = 0; j < CGY; j++)
        for (let i = 0; i < CGX; i++) {
          const p = counts[j * CGX + i] / N
          if (p <= 0) continue
          ctx.fillStyle = rgba(C.ink, clamp(p * CELLS * 0.32, 0.04, 0.92))
          ctx.fillRect(mx + i * cs + 0.5, yb + j * cs + 0.5, cs - 1, cs - 1)
        }
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(mx) + 0.5, Math.round(yb) + 0.5, cs * CGX, cs * CGY)
      // legend beside it
      const lx = mx + cs * CGX + 16
      const lw = r.x + r.w - lx
      if (lw > 150) {
        const lines: string[][] = [
          ['MICROSTATE', `where all ${N.toLocaleString('en-US')} particles are`],
          ['MACROSTATE', `how many in each of ${CELLS} cells`],
          ['S RISES BECAUSE', 'a mixed macrostate can be made', 'in vastly more ways'],
        ]
        let ly = yb + 8
        for (const [a, ...rest] of lines) {
          if (ly + 12 * rest.length > yb + cs * CGY + 6) break
          text(ctx, a, lx, ly, { size: 8, color: k.muted, tracking: 0.14 })
          rest.forEach((b, q) => text(ctx, b, lx, ly + 12 + q * 12, { size: 9, color: k.ink2, tracking: 0.04 }))
          ly += 18 + rest.length * 12
        }
      }
      ctx.restore()
      yb += cs * CGY + 8
    }
    // chapter III: the odds
    const odd = smoothstep(29.5, 30.8, T) * (1 - smoothstep(38, 39.5, T))
    if (ch === 2 && odd > 0 && !tiny) {
      const lg = N * Math.log10(CELLS)
      const yy = Math.min(yb + 16, r.y + r.h - capReserve + 2)
      ctx.save()
      ctx.globalAlpha = alpha * odd
      const lab = r.w > 330 ? `CHANCE THAT ALL ${N.toLocaleString('en-US')} SIT IN ONE CELL` : 'ALL IN ONE CELL'
      text(ctx, lab, r.x, yy, { size: 8.5, color: C.ocean, tracking: 0.12 })
      const a1 = pow(`(1/${CELLS})`, `${N}`, r.x, yy + 16, { size: 10, color: C.ocean, tracking: 0.06 })
      pow(' ≈ 10', `−${Math.floor(lg)}`, r.x + a1 + 2, yy + 16, { size: 10, color: C.ocean, tracking: 0.06 })
      ctx.restore()
    }
  }

  function drawGas(T: number, alpha: number) {
    const g = T - 40
    const s = box.h
    const ink = k.ink
    ctx.save()
    ctx.globalAlpha = alpha
    // the box draws itself on
    const on = ease.inOutCubic(clamp(g / 1.1))
    ctx.lineWidth = 1
    ctx.strokeStyle = k.ink2
    const per = (box.w + box.h) * 2
    ctx.setLineDash([per * on, per])
    ctx.strokeRect(Math.round(box.x) + 0.5, Math.round(box.y) + 0.5, Math.round(box.w), Math.round(box.h))
    ctx.setLineDash([])
    const t2 = Math.max(3, s * 0.018)
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.strokeRect(Math.round(box.x - t2) + 0.5, Math.round(box.y - t2) + 0.5, Math.round(box.w + t2 * 2), Math.round(box.h + t2 * 2))
    // the midline
    const mx = box.x + box.w / 2
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(mx, box.y)
    ctx.lineTo(mx, box.y + box.h)
    ctx.stroke()
    ctx.setLineDash([])
    if (!tiny && box.w > 220) {
      text(ctx, 'LEFT HALF', box.x + 6, box.y + box.h + 13, { size: 8, color: k.muted, tracking: 0.14 })
      text(ctx, 'RIGHT HALF', box.x + box.w - 6, box.y + box.h + 13, { size: 8, color: k.muted, tracking: 0.14, align: 'right' })
    }
    // the partition: a hatched gate that lifts out through the lid
    const lift = ease.inOutCubic(clamp((gT - G_LIFT + 0.6) / 0.6))
    if (lift < 1) {
      const pw = Math.max(3, s * 0.016)
      const py0 = box.y - lift * box.h
      ctx.save()
      ctx.beginPath()
      ctx.rect(mx - pw, box.y - box.h * 0.4, pw * 2, box.h * 1.4)
      ctx.clip()
      ctx.strokeStyle = k.ink2
      ctx.strokeRect(mx - pw / 2, py0, pw, box.h)
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.beginPath()
      for (let yy = py0; yy < py0 + box.h; yy += 4) {
        ctx.moveTo(mx - pw / 2, yy + pw)
        ctx.lineTo(mx + pw / 2, yy)
      }
      ctx.stroke()
      ctx.restore()
    }
    // the gas
    const rp = Math.max(1.2, GR * s)
    ctx.strokeStyle = ink
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 1; i < GN; i++) {
      const X = box.x + gx[i] * s
      const Y = box.y + gy[i] * s
      ctx.moveTo(X + rp, Y)
      ctx.arc(X, Y, rp, 0, TAU)
    }
    ctx.stroke()
    // one molecule's path: straight flights, sharp collisions
    if (trailN > 2) {
      ctx.strokeStyle = rgba(C.ocean, 0.6)
      ctx.beginPath()
      ctx.moveTo(box.x + gx[0] * s, box.y + gy[0] * s)
      for (let q = 0; q < trailN; q++) ctx.lineTo(box.x + trailX[q] * s, box.y + trailY[q] * s)
      ctx.stroke()
    }
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(box.x + gx[0] * s, box.y + gy[0] * s, rp + 0.6, 0, TAU)
    ctx.fill()
    // a reversal: an ocean ring at the moment every velocity flips
    const lastRev = revs.length ? revs[revs.length - 1] : -10
    const rk = (gT - lastRev) / 1.2
    if (rk >= 0 && rk < 1) {
      ctx.strokeStyle = rgba(C.ocean, 0.7 * (1 - rk))
      ctx.strokeRect(box.x - t2 - 4 - rk * 6, box.y - t2 - 4 - rk * 6, box.w + (t2 + 4 + rk * 6) * 2, box.h + (t2 + 4 + rk * 6) * 2)
    }
    if (gT - lastRev < 3.6 && !tiny) {
      const lab = box.w > 260 ? '◀ EVERY VELOCITY REVERSED' : '◀ VELOCITIES REVERSED'
      const lw = tw(lab, 9, 0.14)
      halo(lab, clamp(box.x + box.w / 2, lw / 2 + 6, w - lw / 2 - 6), box.y - t2 - 9, { size: 9, color: C.ocean, align: 'center', tracking: 0.14 })
    }
    // ghost: tap to reverse
    const gg0 = 9.5
    const gg1 = 13.5
    if (!preview && !gasTapped && g > gg0 && g < gg1) {
      const u = (g - gg0) / (gg1 - gg0)
      const ga = smoothstep(0, 0.1, u) * (1 - smoothstep(0.85, 1, u))
      const X = box.x + box.w * 0.62
      const Y = box.y + box.h * 0.45
      const pulse = (u * 2.4) % 1
      ctx.globalAlpha = alpha * ga
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      ctx.arc(X, Y, 4 + pulse * 18, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(X, Y, 3.5, 0, TAU)
      ctx.fill()
      halo(narrow ? 'TAP TO REVERSE' : 'TAP TO REVERSE EVERY VELOCITY', X, Y - 28, { size: 9, color: C.ocean, align: 'center', tracking: 0.14 })
    }
    ctx.restore()
  }

  function drawGasPanel(T: number, alpha: number) {
    const r = info
    const capReserve = capSize * 2.4 + 12
    const avail = r.h - capReserve
    if (avail < 50) return
    const g = T - 40
    const plotH = Math.min(stacked ? avail * 0.42 : avail * (short ? 0.55 : 0.36), short ? 90 : clamp(h * 0.24, 190, 270))
    const plotW = Math.min(r.w - 30, clamp(w * 0.38, 560, 760))
    const x0 = r.x + 26
    const y0 = r.y + 22
    const x1 = x0 + plotW - 26
    const y1 = y0 + plotH
    const toX = (s: number) => lerp(x0, x1, s / G_SPAN)
    const toY = (v: number) => lerp(y1, y0, (v - 0.3) / 0.75)
    ctx.save()
    ctx.globalAlpha = alpha
    text(ctx, 'FRACTION ON THE LEFT', r.x, r.y + 8, { size: 9, color: k.ink2, tracking: 0.14 })
    if (!tiny && r.w > 300) text(ctx, `N = ${GN}`, r.x + r.w, r.y + 8, { size: 9.5, color: k.ink2, align: 'right', tracking: 0.06 })
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.beginPath()
    ctx.moveTo(x0, y0 - 4)
    ctx.lineTo(x0, y1)
    ctx.lineTo(x1 + 4, y1)
    for (let s = 0; s <= G_SPAN; s += 5) {
      const x = Math.round(toX(s)) + 0.5
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y1 + 4)
    }
    ctx.stroke()
    for (let s = 0; s <= G_SPAN; s += 5) text(ctx, String(s), toX(s), y1 + 13, { size: 8, color: k.muted, align: 'center', tracking: 0.04 })
    // 1 and ½, with the expected fluctuation band ±1/(2√N)
    const sd = 1 / (2 * Math.sqrt(GN))
    ctx.fillStyle = rgba(C.ink, 0.05)
    ctx.fillRect(x0, toY(0.5 + sd), x1 - x0, toY(0.5 - sd) - toY(0.5 + sd))
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x0, toY(0.5))
    ctx.lineTo(x1, toY(0.5))
    ctx.moveTo(x0, toY(1))
    ctx.lineTo(x1, toY(1))
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, '1', x0 - 8, toY(1) + 3, { size: 8, color: k.muted, align: 'right' })
    text(ctx, '½', x0 - 8, toY(0.5) + 3, { size: 9, color: k.muted, align: 'right' })
    if (!short && plotW > 280) text(ctx, '± 1 / 2√N', x1, toY(0.5 - sd) + 11, { size: 8, color: k.muted, align: 'right', tracking: 0.06 })
    // the history
    if (histN > 1) {
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      for (let q = 0; q < histN; q++) {
        const x = toX(q / HIST_HZ)
        const y = toY(hist[q])
        if (q) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
    }
    for (const rv of revs) {
      const x = toX(rv)
      ctx.strokeStyle = rgba(C.ocean, 0.8)
      ctx.beginPath()
      ctx.moveTo(x, y0)
      ctx.lineTo(x, y1)
      ctx.stroke()
      text(ctx, '◀', x + 3, y0 + 8, { size: 8, color: C.ocean })
    }
    const lift = toX(G_LIFT)
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    ctx.moveTo(lift, y1)
    ctx.lineTo(lift, y1 - 8)
    ctx.stroke()
    if (!short) text(ctx, 'LIFT', lift, y1 - 11, { size: 7.5, color: k.muted, align: 'center', tracking: 0.12 })
    ctx.restore()

    // the odds, and four disks that do come back
    let yy = y1 + (short ? 26 : 40)
    const ann = smoothstep(4, 5.2, g)
    const lim = r.y + r.h - capReserve
    if (ann > 0 && yy + 30 < lim + 6) {
      ctx.save()
      ctx.globalAlpha = alpha * ann
      text(ctx, r.w > 330 ? `CHANCE ALL ${GN} ARE ON THE LEFT AT ONCE` : 'ALL ON THE LEFT', r.x, yy, { size: 8.5, color: k.ink2, tracking: 0.12 })
      const lg = GN * Math.log10(2)
      const mant = Math.pow(10, lg - Math.floor(lg))
      const a1 = pow('2', `−${GN}`, r.x, yy + 17, { size: 11, color: k.ink, tracking: 0.04 })
      pow(` ≈ 1 in ${mant.toFixed(1)} × 10`, `${Math.floor(lg)}`, r.x + a1 + 4, yy + 17, { size: 11, color: k.ink, tracking: 0.04 })
      yy += 34
      if (!short && r.w > 300 && yy + 24 < lim) {
        const looks = 13.8e9 * 3.156e7 * 1e9
        const le = Math.floor(Math.log10(looks))
        text(ctx, 'A BILLION LOOKS A SECOND SINCE THE BIG BANG:', r.x, yy, { size: 8, color: k.muted, tracking: 0.12 })
        pow(`${(looks / Math.pow(10, le)).toFixed(0)} × 10`, `${le}`, r.x, yy + 14, { size: 9.5, color: k.ink2, tracking: 0.04 })
        const wq = tw(`${(looks / Math.pow(10, le)).toFixed(0)} × 10`, 9.5, 0.04) + tw(`${le}`, 6.84, 0.06) + 6
        text(ctx, 'LOOKS. NOT ONE WOULD SEE IT.', r.x + wq, yy + 14, { size: 8, color: k.muted, tracking: 0.12 })
        yy += 30
      }
      ctx.restore()
    }
    // inset: N = 4
    const iw = Math.min(r.w * 0.42, 190, (lim - yy - 22) * GW)
    if (iw > 60 && !tiny) {
      const ih = iw / GW
      const ix0 = r.x
      const iy0 = yy + 4
      const ia = smoothstep(6.5, 7.6, g)
      if (ia > 0) {
        ctx.save()
        ctx.globalAlpha = alpha * ia
        const flash = clamp(1 - (gT - inFlash) / 0.9)
        if (flash > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(ix0, iy0, iw / 2, ih)
          ctx.clip()
          ctx.strokeStyle = rgba(C.moss, 0.5 * flash)
          ctx.beginPath()
          for (let d = -ih; d < iw / 2 + ih; d += 4) {
            ctx.moveTo(ix0 + d, iy0 + ih)
            ctx.lineTo(ix0 + d + ih, iy0)
          }
          ctx.stroke()
          ctx.restore()
        }
        ctx.strokeStyle = flash > 0 ? C.moss : k.ink2
        ctx.lineWidth = 1
        ctx.strokeRect(Math.round(ix0) + 0.5, Math.round(iy0) + 0.5, Math.round(iw), Math.round(ih))
        ctx.strokeStyle = rgba(C.ink, 0.25)
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.moveTo(ix0 + iw / 2, iy0)
        ctx.lineTo(ix0 + iw / 2, iy0 + ih)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle = k.ink
        ctx.beginPath()
        const sc = ih
        for (let i = 0; i < IN; i++) {
          const X = ix0 + ix[i] * sc
          const Y = iy0 + iy[i] * sc
          ctx.moveTo(X + IR * sc, Y)
          ctx.arc(X, Y, IR * sc, 0, TAU)
        }
        ctx.stroke()
        const tx = ix0 + iw + 12
        if (r.x + r.w - tx > 120) {
          text(ctx, 'N = 4', tx, iy0 + 9, { size: 9, color: k.ink, tracking: 0.12 })
          const pw2 = pow('2', '−4', tx, iy0 + 24, { size: 9.5, color: k.ink2, tracking: 0.04 })
          text(ctx, '= 1 in 16 of the time', tx + pw2 + 5, iy0 + 24, { size: 9, color: k.ink2, tracking: 0.04 })
          const frac = inSteps ? (100 * inLeft) / inSteps : 0
          text(ctx, `SEEN: ${frac.toFixed(1)}% · ${inEvents}×`, tx, iy0 + 40, { size: 8.5, color: flash > 0 ? C.moss : k.muted, tracking: 0.12 })
        }
        ctx.restore()
      }
    }
  }

  function drawArrowChapter(T: number, alpha: number) {
    const x0 = pad + w * 0.04
    const x1 = w - pad - w * 0.03
    const yTop = topY + 10
    const yBot = capTop - (stacked ? 30 : 24)
    const hS = Math.min((yBot - yTop - 50) * 0.62, (x1 - x0) * 0.3)
    const ya = (yTop + yBot) / 2 + hS / 2 - 6
    const on = ease.inOutCubic(clamp((T - 60.4) / 3.2))
    const cur = ease.inOutSine(clamp((T - 61.6) / 3.4))
    const lab = smoothstep(63, 64.2, T)
    const xNow = lerp(x0, x1, 0.34)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = k.ink
    // the arrow of time
    const xe = lerp(x0, x1, on)
    ctx.beginPath()
    ctx.moveTo(x0, ya)
    ctx.lineTo(xe, ya)
    if (on > 0.98) {
      ctx.moveTo(x1 - 10, ya - 5)
      ctx.lineTo(x1, ya)
      ctx.lineTo(x1 - 10, ya + 5)
    }
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    for (let q = 0; q <= 40; q++) {
      const x = lerp(x0, x1 - 12, q / 40)
      if (x > xe) break
      ctx.moveTo(x, ya)
      ctx.lineTo(x, ya + (q % 5 === 0 ? 6 : 3))
    }
    ctx.stroke()
    // entropy along it: low at the start, rising, levelling off
    const Su = (u: number) => (1 - Math.exp(-3.4 * u)) / (1 - Math.exp(-3.4))
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    for (let q = 0; q <= 80; q++) {
      const u = q / 80
      if (u > cur) break
      const x = lerp(x0, x1 - 12, u)
      const y = ya - 10 - (0.03 + 0.97 * Su(u)) * hS
      if (q) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    if (lab > 0) {
      ctx.globalAlpha = alpha * lab
      text(ctx, 'ENTROPY', lerp(x0, x1 - 12, 0.5) - 6, ya - 10 - (0.03 + 0.97 * Su(0.5)) * hS - 8, { size: 9, color: C.ocean, tracking: 0.14, align: 'right' })
      // the start: everything in one place; the end: everywhere
      const dot = Math.max(1, Math.min(w, h) * 0.003)
      ctx.fillStyle = k.ink
      for (let q = 0; q < 40; q++) {
        const a = q * 2.4
        const rr = Math.sqrt(q) * dot * 0.9
        ctx.fillRect(x0 + Math.cos(a) * rr - 0.7, ya - 26 + Math.sin(a) * rr - 0.7, 1.4, 1.4)
      }
      for (let q = 0; q < 60; q++) {
        const fx = hash01(q * 7 + 1)
        const fy = hash01(q * 13 + 5)
        ctx.fillRect(x1 - 70 + fx * 60, ya - 14 - fy * hS * 0.9, 1.4, 1.4)
      }
      text(ctx, 'BIG BANG', x0, ya + 20, { size: 9, color: k.ink, tracking: 0.14 })
      text(ctx, 'NOW', xNow, ya + 20, { size: 9, color: k.ink, tracking: 0.14, align: 'center' })
      text(ctx, 'FAR FUTURE', x1, ya + 20, { size: 9, color: k.ink, tracking: 0.14, align: 'right' })
      // the small print only where it fits between the marks
      const subs = tw('VERY LOW ENTROPY', 8, 0.14) + tw('13.8 BILLION YEARS LATER', 8, 0.14) / 2 + 16
      if (xNow - x0 > subs && x1 - xNow > tw('13.8 BILLION YEARS LATER', 8, 0.14) / 2 + tw('EQUILIBRIUM', 8, 0.14) + 16) {
        text(ctx, 'VERY LOW ENTROPY', x0, ya + 33, { size: 8, color: k.muted, tracking: 0.14 })
        text(ctx, '13.8 BILLION YEARS LATER', xNow, ya + 33, { size: 8, color: k.muted, tracking: 0.14, align: 'center' })
        text(ctx, 'EQUILIBRIUM', x1, ya + 33, { size: 8, color: k.muted, tracking: 0.14, align: 'right' })
      }
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      ctx.moveTo(xNow, ya - 4)
      ctx.lineTo(xNow, ya + 8)
      ctx.stroke()
      // a beaker, mid-mix, at "now"
      const bs = Math.min(26, hS * 0.4)
      const bxx = xNow - bs / 2
      const byy = ya - 14 - bs * 1.2
      ctx.strokeStyle = k.ink2
      ctx.beginPath()
      ctx.moveTo(bxx, byy)
      ctx.lineTo(bxx, byy + bs * 1.2)
      ctx.lineTo(bxx + bs, byy + bs * 1.2)
      ctx.lineTo(bxx + bs, byy)
      ctx.stroke()
      ctx.fillStyle = rgba(C.ink, 0.7)
      for (let q = 0; q < 46; q++) {
        const u = hash01(q * 31 + 3)
        const v = hash01(q * 17 + 11)
        const yy2 = byy + bs * 0.25 + Math.pow(v, 0.6) * bs * 0.9
        const xx2 = bxx + bs / 2 + (u - 0.5) * bs * (0.3 + 0.7 * v) * 0.95
        ctx.fillRect(xx2, yy2, 1.2, 1.2)
      }
      if (!short && !narrow) {
        const sub = 'THE PAST HYPOTHESIS: THE UNIVERSE BEGAN IN A STATE OF EXTRAORDINARILY LOW ENTROPY'
        const sub2 = 'EVERY ARROW WE KNOW — MIXING, COOLING, REMEMBERING, AGEING — POINTS AWAY FROM IT'
        const ys = ya + 62
        if (ys + 14 < capTop - 8) {
          text(ctx, w > 1100 ? sub : 'THE PAST HYPOTHESIS', x0, ys, { size: 8.5, color: k.ink2, tracking: 0.12 })
          if (w > 1100) text(ctx, sub2, x0, ys + 15, { size: 8.5, color: k.muted, tracking: 0.12 })
        }
      }
    }
    ctx.restore()
  }

  function captionAt(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.04
      const n = cap.lines.length
      // captions sit at the bottom of the info column, last line on capY + lineH
      const top = capY - capSize + (2 - n) * lineH
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = top + capSize + li * lineH
        // fit the line to the column
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        setFont(ctx, { font: 'serif', size: capSize, italic: true })
        const ew = ln.em ? ctx.measureText(ln.em).width : 0
        const maxW = (T >= 60 ? w - pad * 2 : info.w) - 4
        const sz = sw + ew > maxW ? (capSize * maxW) / (sw + ew) : capSize
        const sc = sz / capSize
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, w, capSize * 1.32)
        ctx.clip()
        const dyy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dyy, { font: 'serif', size: sz, color: k.ink })
        if (ln.em) text(ctx, ln.em, capX + sw * sc, y + dyy, { font: 'serif', size: sz, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, readouts: { label: string; value: string }[]) {
    const ch = chapterOf(T)
    const small = preview || short || narrow
    text(ctx, `${FIG} — Arrow of time`, pad, pad + 9, { size: small ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    if (!tiny) {
      const c = CHAPTERS[ch]
      const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
      ctx.save()
      ctx.globalAlpha = kIn
      text(ctx, `${c.num} — ${c.name}`, pad, pad + (small ? 23 : 27), { size: small ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true })
      ctx.restore()
    }
    // readouts, top right, label over value
    if (readouts.length) {
      setFont(ctx, { size: 8.5, tracking: 0.14 })
      const kick = tw(`${FIG} — ARROW OF TIME`, small ? 8.5 : 10, 0.16)
      let items = readouts
      const size = small ? 10.5 : 12.5
      const gapR = small ? 12 : 20
      const widthOf = (list: typeof readouts) =>
        list.reduce((s, it) => s + Math.max(tw(it.label.toUpperCase(), 8.5, 0.14), tw(it.value, size, 0.04)), 0) + gapR * (list.length - 1)
      while (items.length > 1 && widthOf(items) > w - pad * 2 - kick - 24) items = items.slice(0, -1)
      let x = w - pad - widthOf(items)
      for (const it of items) {
        const wi = Math.max(tw(it.label.toUpperCase(), 8.5, 0.14), tw(it.value, size, 0.04))
        text(ctx, it.label, x, pad + 7, { size: 8.5, color: k.muted, tracking: 0.14, upper: true })
        text(ctx, it.value, x, pad + 7 + size + 3, { size, color: it.label === 'Film' && filmDirShown < 0 ? C.ocean : k.ink, tracking: 0.04 })
        x += wi + gapR
      }
    }
    // chapter ruler
    if (rulerY > 0) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= LOOP / 2; i++) {
        const x = lerp(x0, x1, (i * 2) / LOOP)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 5 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360)
        CHAPTERS.forEach((cc, i) => {
          const x = lerp(x0, x1, cc.t / LOOP)
          text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
        })
      if (ptr.over && (ptr.mode === 'ruler' || (!ptr.down && onRuler(ptr.x, ptr.y)))) {
        const hx = clamp(ptr.x, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = chapterOf(ht)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12 })
      }
    }
  }

  /* ----------------------------------------------------------- sound */

  function crossedFilm(prev: number, now: number, at: number) {
    return (prev < at && now >= at) || (prev > at && now <= at)
  }

  /* ----------------------------------------------------------- frame */

  resetFilm()
  if (env.params.has('at') || preview) seek(((clock % LOOP) + LOOP) % LOOP)

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      ptr.touch = p.pointerType === 'touch'
      const T = curT()
      if (p.type === 'leave') {
        ptr.over = false
        ptr.down = false
        ptr.mode = ''
        stirring = false
        scrubTarget = -1
        env.setCursor('default')
        return
      }
      ptr.over = true
      const glass = T < 39 || T >= 70
      const gas = T >= 40 && T < 60
      if (p.type === 'down') {
        ptr.down = true
        ptr.sx = ptr.lx = p.x
        ptr.sy = ptr.ly = p.y
        ptr.ms = performance.now()
        ptr.moved = false
        if (onRuler(p.x, p.y)) {
          ptr.mode = 'ruler'
          seekRuler(p.x)
        } else if (glass && onStrip(p.x, p.y)) {
          ptr.mode = 'strip'
          scrubbedOnce = true
          scrubTarget = clamp(((p.x - bx + 6) / (bw + 12)) * stripSpan(), 0, (CAP - 1) / FPS)
        } else if (glass && inWater(p.x, p.y)) ptr.mode = 'water'
        else if (gas && inBox(p.x, p.y)) ptr.mode = 'box'
        else ptr.mode = ''
      } else if (p.type === 'move') {
        if (ptr.down) {
          if (Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > (ptr.touch ? 12 : 6)) ptr.moved = true
          if (ptr.mode === 'ruler') seekRuler(p.x)
          else if (ptr.mode === 'strip') scrubTarget = clamp(((p.x - bx + 6) / (bw + 12)) * stripSpan(), 0, (CAP - 1) / FPS)
          else if (ptr.mode === 'water' && ptr.moved) {
            if (!stirring) {
              stirring = true
              stirredOnce = true
              manual = null
            }
            const mx = (p.x - ptr.lx) / bw
            const my = (p.y - ptr.ly) / bw
            addStir(clamp(film01(p.x)), clamp((p.y - by) / bw, 0, A), mx, my)
            const sp = Math.hypot(mx, my)
            const now = performance.now()
            if (sp > 0.004 && now - lastSwish > 110) {
              lastSwish = now
              sfx.noise(0.3, { filter: 500 + sp * 9000, q: 0.6, gain: Math.min(0.03, sp * 0.6), room: 0.2 })
            }
          }
        }
        ptr.lx = p.x
        ptr.ly = p.y
      } else if (p.type === 'up') {
        if (ptr.down && !ptr.moved && performance.now() - ptr.ms < 400 && (ptr.mode === 'water' || ptr.mode === 'box')) tapAction(T)
        ptr.down = false
        ptr.mode = ''
        stirring = false
        scrubTarget = -1
      }
      ptr.x = p.x
      ptr.y = p.y
      const cur =
        ptr.mode === 'water' ? 'grabbing' : ptr.mode === 'strip' ? 'ew-resize' : onRuler(p.x, p.y) ? 'pointer' : glass && onStrip(p.x, p.y) ? 'ew-resize' : glass && inWater(p.x, p.y) ? 'grab' : gas && inBox(p.x, p.y) ? 'pointer' : 'default'
      env.setCursor(cur)
    },
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Space') {
        if (!down) return true
        const T = curT()
        if (code === 'Space') {
          tapAction(T)
          return true
        }
        if (code === 'ArrowRight') {
          const next = CHAPTERS.find((c) => c.t > T + 0.01)
          seek(next ? next.t : 0)
        } else {
          const i = chapterOf(T)
          seek(T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t)
        }
        return true
      }
      return false
    },
    frame(t, dt) {
      const T = ((((t + clock) % LOOP) + LOOP) % LOOP)
      if (prevT >= 0 && T < prevT - 1 && !seekFlag) {
        // a new loop: a fresh beaker, a fresh film
        resetFilm()
        fOffset = 0
        manual = null
        gasEntered = false
      }
      seekFlag = false
      const ch = chapterOf(T)
      const advancing = dt > 0

      /* --- the film */
      const prevTau = tau
      if (T < 40 || T >= 68) {
        const auto = T >= 68 ? 0 : filmAt(T)
        const rate = T >= 68 ? 0 : filmRate(T)
        if (T >= 68) {
          fOffset = 0
          manual = null
        } else if (scrubTarget >= 0) fOffset = scrubTarget - auto
        else if (advancing && stirring) fOffset += (1 - rate) * dt
        else if (advancing && manual !== null) fOffset += (manual - rate) * dt
        // the ghost stirs too, when the film is being made fresh
        const g = stirGhost(T)
        if (g && advancing && g.s > 0.05 && Math.abs(auto + fOffset - frontier / FPS) < 0.2) {
          const g2 = stirGhost(T - dt)
          if (g2) addStir(g.x, g.y, (g.x - g2.x) * g.s * 0.7, (g.y - g2.y) * g.s * 0.7)
        }
        let want = clamp(auto + fOffset, 0, (CAP - 1) / FPS)
        if (stirring && frontier > Math.ceil(want * FPS)) truncateAt(Math.ceil(want * FPS))
        ensure(Math.ceil(want * FPS), scrubTarget >= 0 ? 24 : 60)
        if (want * FPS > frontier) want = frontier / FPS
        fOffset = want - auto
        tau = want
        if (manual !== null && ((manual < 0 && tau <= 0) || (manual > 0 && tau >= (CAP - 1) / FPS))) manual = null
      } else if (T >= 60) {
        tau = 0
        fOffset = 0
        manual = null
      }
      const dirNow = tau < prevTau - 1e-6 ? -1 : tau > prevTau + 1e-6 ? 1 : filmDirShown
      filmDirShown = dirNow
      shownS = showFrame(tau)

      // sound for the film
      if (advancing && T < 40) {
        if (crossedFilm(prevTau, tau, F_IN)) {
          const back = tau < prevTau
          sfx.tone(back ? 360 : 980, 0.22, { type: 'sine', gain: 0.07, to: back ? 980 : 360, room: 0.35 })
          sfx.tone(back ? 520 : 1320, 0.16, { type: 'sine', gain: 0.03, to: back ? 1320 : 520, room: 0.35, when: 0.03 })
        }
        if (crossedFilm(prevTau, tau, SWELL)) sfx.tone(1760, 0.08, { type: 'sine', gain: 0.025, room: 0.2 })
        if (prevT < 24.6 && T >= 24.6) sfx.noise(2.2, { filter: 2600, to: 320, q: 0.6, gain: 0.03, room: 0.5 })
      }

      /* --- the gas */
      if (T >= 40 && T < 60) {
        if (!gasEntered) {
          gasReset()
          gasEntered = true
        }
        if (advancing) gasTo(T - 40, 4000)
        if (prevT < 40 + G_LIFT - 0.6 && T >= 40 + G_LIFT - 0.6) sfx.noise(0.9, { filter: 300, to: 1400, q: 0.8, gain: 0.03, room: 0.3 })
      } else if (T < 40) gasEntered = false

      /* --- paint */
      ground(ctx, w, h, 'paper')
      const readouts: { label: string; value: string }[] = []
      const glassA = T < 40 ? 1 - smoothstep(38.6, 40, T) : T >= 66.8 ? smoothstep(66.8, 68.2, T) : 0
      if (glassA > 0) {
        const reveal = T >= 66.8 ? smoothstep(66.8, 70.5, T) : 1
        const f = tau
        drawBeaker(f, glassA, reveal)
        drawPipette(f, glassA * (T >= 66.8 ? smoothstep(68.5, 70.8, T) : 1))
        const grid = T < 40 ? smoothstep(6, 8, T) * (1 - smoothstep(36, 38.5, T)) : 0
        const acc = T < 40 ? smoothstep(3.2, 4.4, T) : 0
        drawInk(glassA * (T >= 66.8 ? smoothstep(69.5, 71, T) : 1), grid, acc, dirNow)
        if (T >= 66.8) drawStrip(glassA * smoothstep(69, 71, T), 1, T)
        if (T < 40) {
          drawStirMarks(T, glassA)
          drawStrip(glassA, dirNow, T)
          // the reversed film: an ocean frame and a label
          const rev = dirNow < 0 && tau > 0.02 ? 1 : 0
          if (rev) {
            ctx.save()
            ctx.globalAlpha = glassA
            ctx.strokeStyle = C.ocean
            ctx.lineWidth = 1
            const m = 8
            const yT = pipTop - 4
            const xL = bx - m - bw * 0.06
            const xR = bx + bw + m + bw * 0.06
            const yB = by + bd + bw * 0.07 + m
            const L = 12
            ctx.beginPath()
            ctx.moveTo(xL, yT + L)
            ctx.lineTo(xL, yT)
            ctx.lineTo(xL + L, yT)
            ctx.moveTo(xR - L, yT)
            ctx.lineTo(xR, yT)
            ctx.lineTo(xR, yT + L)
            ctx.moveTo(xR, yB - L)
            ctx.lineTo(xR, yB)
            ctx.lineTo(xR - L, yB)
            ctx.moveTo(xL + L, yB)
            ctx.lineTo(xL, yB)
            ctx.lineTo(xL, yB - L)
            ctx.stroke()
            if (!tiny && (Math.floor(t * 1.6) % 2 === 0 || preview)) {
              let lab = manual === -1 ? '◀◀ REVERSED BY YOU' : '◀◀ THE SAME FILM, BACKWARD'
              if (tw(lab, 9, 0.14) > hero.w - 8) lab = '◀◀ BACKWARD'
              const lw = tw(lab, 9, 0.14)
              halo(lab, clamp(bx + bw / 2, hero.x + lw / 2 + 2, hero.x + hero.w - lw / 2 - 2), Math.max(pipTop + 10, by - bw * 0.3), { size: 9, color: C.ocean, align: 'center', tracking: 0.14 })
            }
            ctx.restore()
          }
          // a label for one random walk
          const lab2 = smoothstep(12.5, 13.5, T) * (1 - smoothstep(20.5, 21.5, T))
          if (lab2 > 0 && !tiny && !preview && bw > 110) {
            const i = ACC[0]
            const X = bx + dx[i] * bw
            const Y = by + dy[i] * bw
            const right = X < bx + bw * 0.55
            const lx = right ? bx + bw + 10 : bx - 10
            const ly = clamp(Y - 18, by + 12, by + bd - 10)
            if ((right && lx + 120 < info.x - 4) || (!right && lx - 120 > hero.x)) {
              ctx.save()
              ctx.globalAlpha = lab2
              ctx.strokeStyle = rgba(C.ocean, 0.7)
              ctx.beginPath()
              ctx.moveTo(X + (right ? 4 : -4), Y - 3)
              ctx.lineTo(lx, ly)
              ctx.stroke()
              halo('ONE PARTICLE', lx + (right ? 4 : -4), ly - 2, { size: 8.5, color: C.ocean, align: right ? 'left' : 'right', tracking: 0.12 })
              halo('A RANDOM WALK', lx + (right ? 4 : -4), ly + 10, { size: 8.5, color: k.muted, align: right ? 'left' : 'right', tracking: 0.12 })
              ctx.restore()
            }
          }
        }
        if (T < 40 || T >= 70) {
          readouts.push(
            { label: 'Entropy S', value: shownS.toFixed(2) },
            { label: 'S / Smax', value: (shownS / S_MAX).toFixed(2) },
            { label: 'Film', value: `${dirNow < 0 ? '◀ ' : ''}${tau.toFixed(1)} s` },
            { label: 'Particles', value: N.toLocaleString('en-US') },
          )
          const panelA = smoothstep(2.5, 4.5, T) * (1 - smoothstep(38.6, 40, T))
          if (panelA > 0) drawEntropyPanel(panelA, shownS, T, ch)
        }
      }
      if (T >= 40 && T < 60) {
        const a = smoothstep(40, 40.8, T) * (1 - smoothstep(58.8, 60, T))
        drawGas(T, a)
        drawGasPanel(T, a)
        let n = 0
        for (let i = 0; i < GN; i++) if (gx[i] < GW / 2) n++
        readouts.push({ label: 'Disks', value: String(GN) }, { label: 'On the left', value: `${Math.round((100 * n) / GN)}%` }, { label: 'Collisions', value: 'elastic' })
      }
      if (T >= 60 && T < 68) {
        const a = smoothstep(60, 60.8, T) * (1 - smoothstep(66.4, 67.6, T))
        drawArrowChapter(T, a)
        if (prevT < 60.5 && T >= 60.5) [146.83, 220, 293.66, 440].forEach((f, j) => sfx.tone(f, 6, { type: 'sine', gain: 0.025, attack: 1.4 + j * 0.2, room: 0.6, when: j * 0.08 }))
      }
      captionAt(T)
      chrome(T, readouts)
      prevT = T
    },
  }
}

export default create
