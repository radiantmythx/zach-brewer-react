/*
 * FIG. S.01 — EQUAL AREAS
 *
 * Kepler's three laws drawn like a page from Astronomia Nova, and then
 * handed over: an orrery you can throw worlds into.
 *
 * Every orbit here is integrated, not drawn from a formula. The two lesson
 * planets are integrated once at load with the kick-drift-kick leapfrog
 * (Störmer–Verlet) under inverse-square gravity, GM = 4π² AU³/yr², and stored
 * as tables of position against time; the drawing then reads them as a pure
 * function of the story clock, so chapters are seekable. Leapfrog conserves
 * angular momentum exactly for a central force, so each step sweeps exactly
 * the same triangle: the hatched sectors of chapter II are equal to the
 * fourth decimal because the integrator obeys Kepler's second law by
 * construction (Newton's own proof in the Principia is this scheme).
 *
 *   I    The ellipse   the gardener's construction: a string of length 2a
 *                      around two pins; the Sun at one focus
 *   II   Equal areas   twelve sectors of equal time, hatched like petals;
 *                      then equal-time ticks, crowded at aphelion
 *   III  Harmonies     a second world farther out; T² = a³ on a log–log
 *                      plot with Kepler's six planets
 *   IV   Orrery        the planets gain mass; drag anywhere to launch a body
 *                      (tap for a circular orbit), with a live prediction
 *
 * Sound (optional): a soft note at every perihelion, a clock tick at every
 * sector boundary.
 */

import { C, TAU, clamp, cropMarks, ease, ground, hatch, lerp, mod, regMark, rgba, setFont, smoothstep, text } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces (on the Playground page they are
 * already loaded and this resolves at once).
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

const FIG = 'FIG. S.01'
const LOOP = 90
const CHAPTERS = [
  { t: 0, num: 'I', name: 'The ellipse', law: 'First law · 1609' },
  { t: 12, num: 'II', name: 'Equal areas', law: 'Second law · 1609' },
  { t: 36, num: 'III', name: 'Harmonies', law: 'Third law · 1619' },
  { t: 60, num: 'IV', name: 'Orrery', law: 'Newton · 1687' },
]
/** AU³/yr²: one AU, one year */
const GM = 4 * Math.PI * Math.PI
const EA = 0.6
const AB = 2
const EB = 0.1
const WB = 2.3
const NSECT = 12
const NTICK = 48
/** planet masses in the orrery, in Suns */
const MU_A = 0.001
const MU_B = 0.003
const HOLD_AT = 84
const OUTRO = 86.4
/** D major pentatonic, two octaves and a bit */
const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0]

const KEPLER: [string, number, number][] = [
  ['Mercury', 0.387, 0.241],
  ['Venus', 0.723, 0.615],
  ['Earth', 1.0, 1.0],
  ['Mars', 1.524, 1.881],
  ['Jupiter', 5.203, 11.862],
  ['Saturn', 9.537, 29.457],
]

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}

const CAPTIONS: Caption[] = [
  { t0: 1.0, t1: 10.6, lines: [{ s: 'Not a circle.' }, { s: '', em: 'An ellipse.' }] },
  { t0: 13.0, t1: 23.4, lines: [{ s: 'A planet sweeps equal areas' }, { s: 'in ', em: 'equal times.' }] },
  { t0: 24.2, t1: 34.6, lines: [{ s: 'Closer, it hurries.' }, { s: 'Far out, ', em: 'it lingers.' }] },
  { t0: 50.6, t1: 59.2, lines: [{ s: 'The same law' }, { s: 'for ', em: 'every world.' }] },
  { t0: 75.2, t1: 85.6, lines: [{ s: 'Now launch' }, { s: '', em: 'your own.' }] },
]

/* ------------------------------------------------------------- the tracks */

interface Track {
  x: Float64Array
  y: Float64Array
  vx: Float64Array
  vy: Float64Array
  h: number
  n: number
  /** the period, measured from the integration */
  T: number
  /** max relative energy error over the stored orbit */
  dE: number
  a: number
  e: number
  w: number
}

/**
 * One orbit around a fixed Sun by kick-drift-kick leapfrog, starting at
 * aphelion and moving anticlockwise; positions stored every step.
 */
function makeTrack(a: number, e: number, w: number, perOrbit: number): Track {
  const T0 = Math.sqrt(a * a * a)
  const h = T0 / perOrbit
  const n = Math.ceil(perOrbit * 1.04) + 2
  const X = new Float64Array(n)
  const Y = new Float64Array(n)
  const VX = new Float64Array(n)
  const VY = new Float64Array(n)
  const th = w + Math.PI
  const ra = a * (1 + e)
  const va = Math.sqrt((GM * (1 - e)) / (a * (1 + e)))
  let x = ra * Math.cos(th)
  let y = ra * Math.sin(th)
  let vx = -va * Math.sin(th)
  let vy = va * Math.cos(th)
  const E0 = 0.5 * (vx * vx + vy * vy) - GM / ra
  let prev = Math.atan2(y, x)
  let turned = 0
  let T = T0
  let found = false
  let dE = 0
  for (let i = 0; i < n; i++) {
    X[i] = x
    Y[i] = y
    VX[i] = vx
    VY[i] = vy
    let r2 = x * x + y * y
    let k = -GM / (r2 * Math.sqrt(r2))
    vx += 0.5 * h * k * x
    vy += 0.5 * h * k * y
    x += h * vx
    y += h * vy
    r2 = x * x + y * y
    k = -GM / (r2 * Math.sqrt(r2))
    vx += 0.5 * h * k * x
    vy += 0.5 * h * k * y
    const ang = Math.atan2(y, x)
    let d = ang - prev
    if (d > Math.PI) d -= TAU
    if (d < -Math.PI) d += TAU
    const before = turned
    turned += d
    prev = ang
    if (!found && turned >= TAU) {
      T = (i + (TAU - before) / (turned - before)) * h
      found = true
    }
    const E = 0.5 * (vx * vx + vy * vy) - GM / Math.sqrt(r2)
    dE = Math.max(dE, Math.abs((E - E0) / E0))
  }
  return { x: X, y: Y, vx: VX, vy: VY, h, n, T, dE, a, e, w }
}

interface State {
  x: number
  y: number
  vx: number
  vy: number
}

function sample(tr: Track, tau: number, o: State) {
  const f = mod(tau, tr.T) / tr.h
  const i = Math.min(tr.n - 2, Math.floor(f))
  const u = f - i
  o.x = tr.x[i] + (tr.x[i + 1] - tr.x[i]) * u
  o.y = tr.y[i] + (tr.y[i + 1] - tr.y[i]) * u
  o.vx = tr.vx[i] + (tr.vx[i + 1] - tr.vx[i]) * u
  o.vy = tr.vy[i] + (tr.vy[i + 1] - tr.vy[i]) * u
  return o
}

/* --------------------------------------------------------------- bodies */

const TRAIL = 720

interface Body {
  x: number
  y: number
  vx: number
  vy: number
  tx: Float32Array
  ty: Float32Array
  head: number
  count: number
  alive: boolean
  /** 1 → 0 after it is lost (escaped or swallowed) */
  fade: number
  bot: boolean
  label: string
  labelT: number
  prevRv: number
  born: number
  /** closest approach to B so far (for the slingshot label) */
  nearB: number
  assisted: boolean
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  const trA = makeTrack(1, EA, 0, preview ? 2048 : 4096)
  const trB = makeTrack(AB, EB, WB, preview ? 2048 : 4096)
  const TA = trA.T
  const TB = trB.T
  const bA = Math.sqrt(1 - EA * EA)

  // the story clock → years: 1 yr = 8 s through II, 4 s for the harmonies, 7 s in the orrery
  const rateAt = (T: number) => (T < 48 ? lerp(1 / 8, 1 / 4, smoothstep(36, 38.5, T)) : lerp(1 / 4, 1 / 7, smoothstep(60, 62, T)))
  const TT_DT = 0.01
  const TT = new Float64Array(Math.ceil(LOOP / TT_DT) + 2)
  for (let i = 1; i < TT.length; i++) {
    const T0 = (i - 1) * TT_DT
    TT[i] = TT[i - 1] + 0.5 * (rateAt(T0) + rateAt(T0 + TT_DT)) * TT_DT
  }
  const tauAt = (T: number) => {
    const f = clamp(T, 0, LOOP) / TT_DT
    const i = Math.min(TT.length - 2, Math.floor(f))
    return TT[i] + (TT[i + 1] - TT[i]) * (f - i)
  }
  /** story time at which τ is reached (τ < 4.5 yr: the 1/8 regime) */
  const tOfTau = (tau: number) => tau * 8

  // chapter II: twelve sectors centred so one straddles aphelion
  const SWEEP0 = 2 * TA - TA / (2 * NSECT)
  const SWEEP1 = SWEEP0 + TA
  const TICK1 = SWEEP1 + TA
  // chapter III: stopwatches
  const MEAS_B0 = tauAt(39)
  const MEAS_A0 = tauAt(44)

  /* ------------------------------------------------------------ layout */

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
  /** room for PERIHELION / APHELION beside the ellipse */
  let endLabels = true
  /** a narrow frame: fewer, condensed readouts */
  let narrow = false
  const V = { x: 0, y: 0, w: 1, h: 1 }
  const V3 = { x: 0, y: 0, w: 1, h: 1 }
  const P = { x: 0, y: 0, s: 0, on: false }
  const LOG = { x: 0, y: 0, h: 0, row: 14, on: false, compact: false }
  // view (world AU → screen px): X = vx + x·s, Y = vy − y·s
  const view = { x: 0, y: 0, s: 1 }
  const viewA = { x: 0, y: 0, s: 1 }
  const viewB = { x: 0, y: 0, s: 1 }
  const R3 = 2.6

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
    wide = !portrait && w >= h * 1.25
    short = h < 420
    tiny = h < 260
    small = preview || Math.min(w, h) < 480
    narrow = w < 520
    pad = preview ? 12 : clamp(Math.min(w, h) * 0.045, 12, 36)
    rulerOn = !preview && h >= 200
    const rulerSpace = rulerOn ? (tiny ? 12 : 16) : 0
    capSize = portrait ? clamp(Math.min(w * 0.072, h * 0.04), 17, 40) : clamp(Math.min(w * 0.04, h * (short ? 0.085 : 0.064)), tiny ? 13 : short ? 15 : 20, 48)
    if (preview) capSize = 17
    // the left column (wide) or the full width bounds the caption
    const leftW = wide ? clamp(w * (short ? 0.36 : 0.31), 150, 420) : w - pad * 2
    while (capSize > 12 && captionWidth(capSize) > leftW + (wide ? pad * 0.5 : 0)) capSize -= 1
    capX = pad * (preview ? 1 : 1.25)
    capY = h - pad - rulerSpace - capSize * 2.12
    const top = pad + (tiny ? 18 : 26)
    if (wide) {
      V.x = pad + leftW + (short ? 6 : 14)
      V.y = top
      V.w = w - pad - V.x
      V.h = h - top - pad - rulerSpace
      V3.x = V.x
      V3.y = V.y
      V3.w = V.w
      V3.h = V.h
      // the left column: the sector log (II) and the log–log plot (III), above the caption
      const colTop = top + (tiny ? 6 : 16)
      const colBot = capY - (small ? 22 : 30)
      const avail = colBot - colTop
      LOG.x = capX
      LOG.y = colTop
      LOG.row = short ? 11 : 15
      LOG.h = avail
      LOG.on = !preview && !tiny && avail > LOG.row * 6
      LOG.compact = leftW < 225
      P.s = Math.min(leftW - 46, avail - 34)
      P.x = capX + 34
      P.y = colTop + 4
      P.on = !tiny && P.s >= 84
    } else {
      V.x = pad
      V.y = top + (preview ? 0 : narrow ? 30 : 12)
      V.w = w - pad * 2
      V.h = Math.max(60, capY - (small ? 26 : 34) - V.y)
      LOG.on = false
      // III: the plot below the orbit if there is room
      const ps = Math.min(w - pad * 2 - 60, V.h * 0.4)
      P.on = !preview && ps >= 96
      if (P.on) {
        P.s = ps
        V3.x = V.x
        V3.y = V.y
        V3.w = V.w
        V3.h = V.h - ps - 40
        P.x = (w - ps) / 2 + 14
        P.y = V3.y + V3.h + 14
      } else {
        V3.x = V.x
        V3.y = V.y
        V3.w = V.w
        V3.h = V.h
      }
    }
    // fit A's ellipse with room for its end labels and dimension lines, and B's whole system
    setFont(ctx, { size: small ? 8 : 9, tracking: 0.14 })
    const labW = ctx.measureText('PERIHELION').width
    endLabels = !tiny && !preview && V.w - (labW + 14) * 2 > 220
    const px = endLabels ? Math.max(small ? 34 : 60, labW + 14) : 16
    const py = tiny ? 12 : small ? 26 : 40
    viewA.s = Math.max(10, Math.min((V.w - px * 2) / 2, (V.h - py * 2) / (2 * bA), h * 0.39))
    let vhA = V.h
    if (!wide && !preview) {
      // a tall frame: the ellipse on top, the sector log beneath it
      const need = 2 * bA * viewA.s + py * 2
      const rows = 15
      if (V.h - need > rows * 14 + 30) {
        vhA = need + 10
        LOG.on = true
        LOG.row = 14
        LOG.x = capX
        LOG.y = V.y + vhA + 6
        LOG.h = Math.min(rows * 14 + 24, V.h - vhA - 10)
      }
    }
    viewA.x = V.x + V.w / 2 + 0.6 * viewA.s
    viewA.y = V.y + vhA / 2
    viewB.s = Math.max(8, Math.min(V3.w, V3.h) / (2 * R3))
    viewB.x = V3.x + V3.w / 2
    viewB.y = V3.y + V3.h / 2
  }
  layout()

  const X = (x: number) => view.x + x * view.s
  const Y = (y: number) => view.y - y * view.s

  /* ------------------------------------------------------------ clock */

  const atP = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? (env.reducedMotion ? 23.5 : 15) : 0
  let prevT = -1
  let simTau = 0
  let lastT = -1
  let acted = false
  let lastLaunch = -1e9
  let holding = false
  let clock = 0
  // test route: when stepping to a fixed ?t=, only the final frame needs drawing
  const tFixed = env.params.has('t') ? Number(env.params.get('t')) : NaN

  /* ------------------------------------------------------------ bodies */

  const bodies: Body[] = []
  const MAX_BODIES = preview ? 6 : 34
  const sA: State = { x: 0, y: 0, vx: 0, vy: 0 }
  const sB: State = { x: 0, y: 0, vx: 0, vy: 0 }
  const tmp: State = { x: 0, y: 0, vx: 0, vy: 0 }

  /** gravity weights of A and B on the bodies (0 while a planet is only a lesson) */
  let wA = 0
  let wB = 0

  function addBody(x: number, y: number, vx: number, vy: number, bot: boolean, label: string) {
    if (bodies.length >= MAX_BODIES) {
      // retire the oldest (prefer lost ones)
      const lost = bodies.findIndex((b) => !b.alive)
      bodies.splice(lost >= 0 ? lost : 0, 1)
    }
    const b: Body = {
      x,
      y,
      vx,
      vy,
      tx: new Float32Array(TRAIL),
      ty: new Float32Array(TRAIL),
      head: 0,
      count: 0,
      alive: true,
      fade: 1,
      bot,
      label,
      labelT: 0,
      prevRv: x * vx + y * vy,
      born: clock,
      nearB: 99,
      assisted: false,
    }
    b.tx[0] = x
    b.ty[0] = y
    b.count = 1
    bodies.push(b)
    return b
  }

  function accel(x: number, y: number, tau: number, out: { ax: number; ay: number; dS: number; dA: number; dB: number }) {
    const r2 = x * x + y * y + 1e-5
    const r = Math.sqrt(r2)
    let ax = (-GM * x) / (r2 * r)
    let ay = (-GM * y) / (r2 * r)
    out.dS = r
    out.dA = 99
    out.dB = 99
    if (wA > 0) {
      sample(trA, tau, tmp)
      const dx = x - tmp.x
      const dy = y - tmp.y
      const d2 = dx * dx + dy * dy + 4e-4
      const d = Math.sqrt(d2)
      const k = (-GM * MU_A * wA) / (d2 * d)
      ax += k * dx
      ay += k * dy
      out.dA = d
    }
    if (wB > 0) {
      sample(trB, tau, tmp)
      const dx = x - tmp.x
      const dy = y - tmp.y
      const d2 = dx * dx + dy * dy + 4e-4
      const d = Math.sqrt(d2)
      const k = (-GM * MU_B * wB) / (d2 * d)
      ax += k * dx
      ay += k * dy
      out.dB = d
    }
    out.ax = ax
    out.ay = ay
    return out
  }
  const acc = { ax: 0, ay: 0, dS: 0, dA: 0, dB: 0 }

  /** Advance one body by dtau years with leapfrog, refining near the Sun. Returns false if it is lost. */
  function advance(b: Body, tau0: number, dtau: number) {
    const r0 = Math.hypot(b.x, b.y)
    const hMax = r0 < 0.12 ? 1 / 24000 : r0 < 0.35 ? 1 / 6000 : 1 / 1600
    const n = Math.max(1, Math.ceil(dtau / hMax))
    const hh = dtau / n
    let tau = tau0
    accel(b.x, b.y, tau, acc)
    for (let k = 0; k < n; k++) {
      b.vx += 0.5 * hh * acc.ax
      b.vy += 0.5 * hh * acc.ay
      b.x += hh * b.vx
      b.y += hh * b.vy
      tau += hh
      accel(b.x, b.y, tau, acc)
      b.vx += 0.5 * hh * acc.ax
      b.vy += 0.5 * hh * acc.ay
      if (acc.dS < 0.035 || acc.dA < 0.022 || acc.dB < 0.03) {
        burst(b.x, b.y)
        return false
      }
      if (acc.dB < b.nearB) b.nearB = acc.dB
    }
    return acc.dS < 14
  }

  /* ---------------------------------------------------- the slingshot */

  // chapter IV's demonstration launches: [story time, launch point, velocity, label]
  interface Demo {
    T: number
    x: number
    y: number
    vx: number
    vy: number
    label: string
    done: boolean
  }
  const demos: Demo[] = []
  function planDemos() {
    const tangent = (ang: number, r: number, f: number, tilt = 0): Demo => {
      const v = Math.sqrt(GM / r) * f
      const a = ang + Math.PI / 2 - tilt
      return { T: 0, x: r * Math.cos(ang), y: r * Math.sin(ang), vx: v * Math.cos(a), vy: v * Math.sin(a), label: '', done: false }
    }
    const d1 = tangent(3.6, 1.25, 0.82)
    d1.T = 61.6
    d1.label = 'Bound · ellipse'
    const d2 = tangent(1.5, 0.75, Math.SQRT2 * 0.9)
    d2.T = 65.2
    d2.label = 'Near escape · returns'
    const d3 = tangent(5.2, 1.0, Math.SQRT2 * 1.1, 0.25)
    d3.T = 68.8
    d3.label = 'Escape · hyperbola'
    demos.push(d1, d2, d3)
    // a gravity assist past B: search launches for the largest energy gain
    const TL = 72.4
    const tauL = tauAt(TL)
    sample(trB, tauL, sB)
    const thB = Math.atan2(sB.y, sB.x)
    let best: Demo | null = null
    let bestGain = -1e9
    const saveA = wA
    const saveB = wB
    wA = 1
    wB = 1
    const probe = { x: 0, y: 0, vx: 0, vy: 0 } as Body
    for (let ia = 0; ia < 9; ia++)
      for (let iv = 0; iv < 5; iv++)
        for (let it = 0; it < 3; it++) {
          const ang = thB - 0.5 + ia * 0.2
          const cand = tangent(ang, 1.2, 1.1 + iv * 0.05, 0.05 + it * 0.22)
          probe.x = cand.x
          probe.y = cand.y
          probe.vx = cand.vx
          probe.vy = cand.vy
          probe.nearB = 99
          const E0 = 0.5 * (cand.vx * cand.vx + cand.vy * cand.vy) - GM / 1.2
          let ok = true
          let tau = tauL
          for (let s = 0; s < 120 && ok; s++) {
            ok = advance(probe, tau, 1 / 60)
            tau += 1 / 60
          }
          if (!ok && Math.hypot(probe.x, probe.y) < 13) continue
          if (probe.nearB > 0.2 || probe.nearB < 0.05) continue
          const E1 = 0.5 * (probe.vx * probe.vx + probe.vy * probe.vy) - GM / Math.max(0.05, Math.hypot(probe.x, probe.y))
          if (E1 - E0 > bestGain) {
            bestGain = E1 - E0
            best = cand
          }
        }
    wA = saveA
    wB = saveB
    if (best) {
      best.T = TL
      best.label = 'Slingshot past B'
      demos.push(best)
    }
  }
  // the bursts made while probing are not real
  let probing = true
  const bursts: { x: number; y: number; t: number }[] = []
  function burst(x: number, y: number) {
    if (probing) return
    bursts.push({ x, y, t: 0 })
    sfx.noise(0.5, { filter: 260, q: 0.7, gain: 0.03, room: 0.4 })
  }
  planDemos()
  probing = false

  /* ---------------------------------------------------------- pointer */

  const drag = { on: false, sx: 0, sy: 0, x: 0, y: 0, touch: false, ms: 0 }
  {
    // test hook (solo route): ?drag=sx,sy,ex,ey holds a launch gesture on screen
    const dq = (env.params.get('drag') ?? '').split(',').map(Number)
    if (dq.length === 4 && dq.every(Number.isFinite)) Object.assign(drag, { on: true, sx: dq[0], sy: dq[1], x: dq[2], y: dq[3] })
  }
  let hoverRuler = -1
  let scrubbing = false
  let hover = { x: -1, y: -1 }
  let hoverTouch = false
  let launchedOnce = false
  const rulerY = () => h - pad * 0.55
  const onRuler = (x: number, y: number, touch: boolean) => rulerOn && y > rulerY() - (touch ? 28 : 18) && x > pad - 8 && x < w - pad + 8
  function seekTo(x: number) {
    const T = mod(prevT < 0 ? 0 : prevT, LOOP)
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.4) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }

  /** world velocity per px of drag */
  const vPerPx = () => Math.min((TAU * 4) / view.s, TAU / 40)

  /** predicted path for a launch (world), into a preallocated buffer */
  const PRED = 900
  const predX = new Float32Array(PRED)
  const predY = new Float32Array(PRED)
  let predN = 0
  let predEnd: 'sun' | 'escape' | 'bound' = 'bound'
  const pb = { x: 0, y: 0, vx: 0, vy: 0, nearB: 99 } as Body
  function predict(x: number, y: number, vx: number, vy: number) {
    pb.x = x
    pb.y = y
    pb.vx = vx
    pb.vy = vy
    let tau = simTau
    predN = 0
    predEnd = 'bound'
    const wasProbing = probing
    probing = true
    for (let k = 0; k < PRED; k++) {
      predX[predN] = pb.x
      predY[predN] = pb.y
      predN++
      const ok = advance(pb, tau, 1 / 400)
      tau += 1 / 400
      if (!ok) {
        predEnd = Math.hypot(pb.x, pb.y) > 10 ? 'escape' : 'sun'
        break
      }
      if (Math.hypot(pb.x, pb.y) > 6) {
        predEnd = 'escape'
        break
      }
    }
    probing = wasProbing
  }

  function launchFromDrag() {
    const s = view.s
    const wx = (drag.sx - view.x) / s
    const wy = (view.y - drag.sy) / s
    const r = Math.hypot(wx, wy)
    if (r < 0.06 || r > 8) return
    const dx = drag.x - drag.sx
    const dy = drag.y - drag.sy
    let vx = dx * vPerPx()
    let vy = -dy * vPerPx()
    let label = ''
    if (Math.hypot(dx, dy) < (drag.touch ? 12 : 6)) {
      // a tap: a circular orbit, anticlockwise like the planets
      const vc = Math.sqrt(GM / r)
      vx = (-wy / r) * vc
      vy = (wx / r) * vc
      label = 'Circular'
    }
    const b = addBody(wx, wy, vx, vy, false, label)
    b.labelT = label ? 2.5 : 0
    lastLaunch = clock
    launchedOnce = true
    sfx.tone(SCALE[clamp(Math.round(10 - Math.log2(r) * 3), 0, SCALE.length - 1)], 0.6, { type: 'triangle', gain: 0.045, attack: 0.004, room: 0.35, pan: clamp(wx / 3, -0.8, 0.8) })
  }

  /* ---------------------------------------------------------- drawing */

  function halo(str: string, x: number, y: number, o: TextOpts) {
    ctx.save()
    setFont(ctx, o)
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.9)
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }

  /** A left-aligned label at x (or right-aligned at xAlt when it would leave the frame). */
  function sideLabel(str: string, x: number, xAlt: number, y: number, o: TextOpts) {
    setFont(ctx, o)
    const lw = ctx.measureText(o.upper ? str.toUpperCase() : str).width
    if (x + lw > w - pad * 0.6) halo(str, xAlt, y, { ...o, align: 'right' })
    else halo(str, x, y, { ...o, align: 'left' })
  }

  /** A dimension line with arrowheads, extension ticks and a centred label. */
  function dim(x1: number, y1: number, x2: number, y2: number, label: string, off: number, color: string, alpha: number) {
    if (alpha <= 0.01) return
    const dx = x2 - x1
    const dy = y2 - y1
    const L = Math.hypot(dx, dy) || 1
    const ux = dx / L
    const uy = dy / L
    const nx = -uy * off
    const ny = ux * off
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    const ext = Math.sign(off) * 4
    ctx.moveTo(x1 - uy * ext * 0.5, y1 + ux * ext * 0.5)
    ctx.lineTo(x1 + nx - uy * ext, y1 + ny + ux * ext)
    ctx.moveTo(x2 - uy * ext * 0.5, y2 + ux * ext * 0.5)
    ctx.lineTo(x2 + nx - uy * ext, y2 + ny + ux * ext)
    ctx.moveTo(x1 + nx, y1 + ny)
    ctx.lineTo(x2 + nx, y2 + ny)
    for (const [px, py, sg] of [
      [x1 + nx, y1 + ny, 1],
      [x2 + nx, y2 + ny, -1],
    ] as const) {
      ctx.moveTo(px + (ux * 5 - uy * 2.2) * sg, py + (uy * 5 + ux * 2.2) * sg)
      ctx.lineTo(px, py)
      ctx.lineTo(px + (ux * 5 + uy * 2.2) * sg, py + (uy * 5 - ux * 2.2) * sg)
    }
    ctx.stroke()
    if (label) {
      const mx = (x1 + x2) / 2 + nx
      const my = (y1 + y2) / 2 + ny
      const horiz = Math.abs(ux) > 0.7
      halo(label, mx + (horiz ? 0 : off > 0 ? 6 : -6), my + (horiz ? (off > 0 ? 12 : -5) : 3), { size: 9, color, align: horiz ? 'center' : off > 0 ? 'left' : 'right', tracking: 0.1 })
    }
    ctx.restore()
  }

  function arrow(x1: number, y1: number, x2: number, y2: number, head = 6) {
    const a = Math.atan2(y2 - y1, x2 - x1)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.moveTo(x2 + Math.cos(a + 2.65) * head, y2 + Math.sin(a + 2.65) * head)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x2 + Math.cos(a - 2.65) * head, y2 + Math.sin(a - 2.65) * head)
    ctx.stroke()
  }

  /** The Sun: a hairline disc with a centre dot and short rays (the old symbol ☉). */
  function sun(x: number, y: number, k: number, T: number) {
    if (k <= 0) return
    const r = (small ? 4.5 : 6) * ease.outBack(clamp(k))
    ctx.save()
    ctx.globalAlpha *= clamp(k)
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
      const a = (i / 12) * TAU + T * 0.05
      const r1 = r + 2.5
      const r2 = r + (i % 2 ? 4.5 : 7.5)
      ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1)
      ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2)
    }
    ctx.stroke()
    ctx.restore()
  }

  function planet(x: number, y: number, kind: 'A' | 'B', k: number) {
    if (k <= 0) return
    const r = (small ? 3.6 : 4.6) * ease.outBack(clamp(k)) * (wA > 0.5 && kind === 'A' ? 1.15 : 1) * (wB > 0.5 && kind === 'B' ? 1.35 : 1)
    ctx.save()
    ctx.globalAlpha *= clamp(k)
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
    ctx.stroke()
    if (kind === 'A') {
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(x, y, r * 0.42, 0, TAU)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(x - r, y)
      ctx.lineTo(x + r, y)
      ctx.moveTo(x, y - r)
      ctx.lineTo(x, y + r)
      ctx.stroke()
    }
    ctx.restore()
  }

  /** an ellipse outline (world), optionally drawn on from aphelion, anticlockwise */
  function ellipsePath(a: number, e: number, wv: number, u = 1) {
    const b = a * Math.sqrt(1 - e * e)
    const c = a * e
    const cw = Math.cos(wv)
    const sw = Math.sin(wv)
    const n = Math.max(2, Math.ceil(160 * u))
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const E = Math.PI + (i / n) * TAU * u
      const ex = -c + a * Math.cos(E)
      const ey = b * Math.sin(E)
      const px = X(ex * cw - ey * sw)
      const py = Y(ex * sw + ey * cw)
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
  }

  /** chapter I: the gardener's construction, then axes, foci, dimensions (`full` adds pins, pen and string) */
  function drawConstruction(T: number, fade: number, full: boolean, dims = 1) {
    if (fade <= 0) return
    const c = EA
    const a = 1
    const b = bA
    ctx.save()
    ctx.globalAlpha = fade
    ctx.lineWidth = 1
    if (full) {
      // the pins
      const pins = smoothstep(0.5, 1.2, T) * (1 - smoothstep(7.4, 8.2, T))
      if (pins > 0) {
        ctx.save()
        ctx.globalAlpha *= pins
        ctx.fillStyle = C.ink
        for (const fx of [0, -2 * c]) {
          ctx.beginPath()
          ctx.arc(X(fx), Y(0), 2.2, 0, TAU)
          ctx.fill()
        }
        if (!tiny && T < 2.6) {
          halo('Two pins, a loop of string', X(-c), Y(0) - 12, { size: small ? 8.5 : 9.5, color: C.muted, align: 'center', upper: true, tracking: 0.14, alpha: smoothstep(0.8, 1.2, T) * (1 - smoothstep(1.8, 2.5, T)) })
        }
        ctx.restore()
      }
      // the pen and the string
      const u = ease.inOutSine(clamp((T - 1.4) / 4.0))
      if (u > 0) {
        ctx.strokeStyle = C.ink
        ellipsePath(a, EA, 0, u)
        ctx.stroke()
        const E = Math.PI + u * TAU
        const qx = -c + a * Math.cos(E)
        const qy = b * Math.sin(E)
        const str = 1 - smoothstep(5.5, 6.4, T)
        if (str > 0) {
          ctx.save()
          ctx.globalAlpha *= str
          ctx.strokeStyle = C.ocean
          ctx.beginPath()
          ctx.moveTo(X(0), Y(0))
          ctx.lineTo(X(qx), Y(qy))
          ctx.lineTo(X(-2 * c), Y(0))
          ctx.stroke()
          ctx.fillStyle = C.ocean
          ctx.beginPath()
          ctx.arc(X(qx), Y(qy), 2.6, 0, TAU)
          ctx.fill()
          if (!tiny) {
            const r1 = Math.hypot(qx, qy)
            const r2 = Math.hypot(qx + 2 * c, qy)
            const up = qy >= 0
            const lab = `r₁ + r₂ = ${(r1 + r2).toFixed(2)} = 2a`
            const o = { size: small ? 8.5 : 9.5, color: C.ocean, tracking: 0.08 }
            setFont(ctx, o)
            const lw = ctx.measureText(lab).width
            const right = qx > -c ? X(qx) + 10 + lw < w - pad * 0.6 : X(qx) - 10 - lw < pad * 0.6
            halo(lab, X(qx) + (right ? 10 : -10), Y(qy) + (up ? -10 : 18), { ...o, align: right ? 'left' : 'right' })
          }
          ctx.restore()
        }
      }
    }
    // axes, centre, foci
    const ax = smoothstep(5.6, 6.6, T)
    if (ax > 0) {
      ctx.strokeStyle = rgba(C.ink, 0.42)
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      const ext = 0.1
      ctx.moveTo(X(lerp(-c, -c - a - ext, ax)), Y(0))
      ctx.lineTo(X(lerp(-c, -c + a + ext, ax)), Y(0))
      const ay = smoothstep(6.0, 7.0, T)
      ctx.moveTo(X(-c), Y(-(b + ext) * ay))
      ctx.lineTo(X(-c), Y((b + ext) * ay))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.moveTo(X(-c) - 4, Y(0) - 4)
      ctx.lineTo(X(-c) + 4, Y(0) + 4)
      ctx.moveTo(X(-c) + 4, Y(0) - 4)
      ctx.lineTo(X(-c) - 4, Y(0) + 4)
      ctx.stroke()
      ctx.strokeStyle = C.ink2
      regMark(ctx, X(-2 * c), Y(0), small ? 5 : 7)
    }
    // dimensions: 2a below, 2b along the minor axis, c above the major axis
    const dm = smoothstep(6.6, 7.8, T) * dims
    if (dm > 0) {
      const s = view.s
      const off = b * s + (tiny ? 8 : small ? 14 : 22)
      dim(X(-c - a), Y(0), X(-c + a), Y(0), tiny ? '2a' : '2a = 2.00 AU', off, C.ink2, dm)
      if (!tiny) {
        dim(X(-c), Y(b), X(-c), Y(-b), '', 0, C.ink2, dm)
        halo(small ? '2b' : '2b = 1.60', X(-c) - 7, Y(b * 0.55), { size: 9, color: C.ink2, align: 'right', tracking: 0.1, alpha: dm })
        dim(X(-c), Y(0), X(0), Y(0), small ? 'c' : 'c = ae', -(small ? 12 : 18), C.ink2, dm)
      }
    }
    // labels
    const lb = smoothstep(7.2, 8.2, T)
    if (lb > 0 && !tiny && !preview) {
      const sz = small ? 8 : 9
      ctx.save()
      ctx.globalAlpha *= lb
      if (endLabels) {
        sideLabel('Perihelion', X(-c + a) + 8, X(-c + a) - 8, Y(0) - 7, { size: sz, color: C.ink2, upper: true, tracking: 0.14 })
        if (!small) halo('q = a(1 − e)', X(-c + a) + 8, Y(0) + 13, { size: sz, color: C.muted, tracking: 0.08 })
        halo('Aphelion', X(-c - a) - 8, Y(0) - 7, { size: sz, color: C.ink2, upper: true, tracking: 0.14, align: 'right' })
        if (!small) halo('Q = a(1 + e)', X(-c - a) - 8, Y(0) + 13, { size: sz, color: C.muted, tracking: 0.08, align: 'right' })
      }
      ctx.globalAlpha *= dims
      halo(small ? 'F₂' : 'F₂ · empty focus', X(-2 * c), Y(0) + (small ? 15 : 20), { size: sz, color: C.muted, upper: !small, tracking: 0.12, align: 'center' })
      halo(small ? 'F₁' : 'F₁ · Sun', X(0), Y(0) + (small ? 18 : 24), { size: sz, color: C.ink2, upper: !small, tracking: 0.12, align: 'center' })
      ctx.restore()
    }
    ctx.restore()
  }

  /** chapter II: the swept sectors, hatched like petals */
  const secArea = new Float64Array(NSECT)
  let secDone = 0

  /** one sector, from τ0 to τ1, into a context; returns its area (AU²) */
  function sectorTo(g: CanvasRenderingContext2D, k: number, t0: number, t1: number, full: boolean) {
    const n = Math.max(2, Math.ceil((t1 - t0) / trA.h))
    const path = new Path2D()
    path.moveTo(X(0), Y(0))
    let area = 0
    let px0 = 0
    let py0 = 0
    let minX = X(0)
    let minY = Y(0)
    let maxX = minX
    let maxY = minY
    for (let i = 0; i <= n; i++) {
      sample(trA, t0 + ((t1 - t0) * i) / n, tmp)
      if (i) area += 0.5 * (px0 * tmp.y - tmp.x * py0)
      px0 = tmp.x
      py0 = tmp.y
      const sx = X(tmp.x)
      const sy = Y(tmp.y)
      path.lineTo(sx, sy)
      if (sx < minX) minX = sx
      if (sx > maxX) maxX = sx
      if (sy < minY) minY = sy
      if (sy > maxY) maxY = sy
    }
    path.closePath()
    // hatching, alternating like the petals of a rose window
    g.save()
    g.clip(path)
    g.strokeStyle = k % 2 ? rgba(C.ocean, 0.55) : rgba(C.lagoon, 0.6)
    g.lineWidth = 1
    hatch(g, minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4, small ? 3.6 : 4.4, k % 2 ? Math.PI / 4 : -Math.PI / 4)
    g.restore()
    g.strokeStyle = rgba(C.ink, full ? 0.55 : 0.8)
    g.lineWidth = 1
    g.stroke(path)
    return area
  }

  // completed sectors are cached: they change twelve times an orbit, not sixty times a second
  let secCan: HTMLCanvasElement | null = null
  let secKey = ''
  function drawSectors(tau: number, T: number, alpha: number) {
    secDone = 0
    if (alpha <= 0 || tau < SWEEP0) return
    const dS = TA / NSECT
    const nFull = clamp(Math.floor((tau - SWEEP0) / dS + 1e-9), 0, NSECT)
    secDone = nFull
    ctx.save()
    ctx.globalAlpha = alpha
    if (nFull > 0) {
      const key = `${nFull}|${w}x${h}@${env.dpr}|${view.s.toFixed(3)},${view.x.toFixed(2)},${view.y.toFixed(2)}`
      if (typeof document !== 'undefined' && key !== secKey) {
        if (!secCan) secCan = document.createElement('canvas')
        const W = Math.max(1, Math.round(w * env.dpr))
        const H = Math.max(1, Math.round(h * env.dpr))
        if (secCan.width !== W || secCan.height !== H) {
          secCan.width = W
          secCan.height = H
        }
        const g = secCan.getContext('2d')
        if (g) {
          g.setTransform(1, 0, 0, 1, 0, 0)
          g.clearRect(0, 0, W, H)
          g.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
          for (let k = 0; k < nFull; k++) secArea[k] = sectorTo(g, k, SWEEP0 + k * dS, SWEEP0 + (k + 1) * dS, true)
          secKey = key
        }
      }
      if (secCan && secKey === key) ctx.drawImage(secCan, 0, 0, w, h)
      else for (let k = 0; k < nFull; k++) secArea[k] = sectorTo(ctx, k, SWEEP0 + k * dS, SWEEP0 + (k + 1) * dS, true)
    }
    // the sector being swept, live
    if (nFull < NSECT) {
      const t0 = SWEEP0 + nFull * dS
      if (tau > t0) sectorTo(ctx, nFull, t0, Math.min(tau, t0 + dS), false)
    }
    // the numbers, outside the arcs
    if (!small && T < 34.5) {
      for (let k = 0; k < nFull; k++) {
        sample(trA, SWEEP0 + (k + 0.5) * dS, tmp)
        const r = Math.hypot(tmp.x, tmp.y)
        const lx = X(tmp.x * (1 + 0.13 / r))
        const ly = Y(tmp.y * (1 + 0.13 / r))
        text(ctx, String(k + 1).padStart(2, '0'), lx, ly + 3, { size: 8.5, color: C.muted, align: 'center', alpha: 1 - smoothstep(23.6, 25, T) * 0.6 })
      }
    }
    ctx.restore()
  }

  /** chapter II, second orbit: a tick every 1/48 of a year, laid down as the planet passes */
  function drawTimeTicks(tau: number, alpha: number) {
    if (alpha <= 0 || tau < SWEEP1) return
    const dT = TA / NTICK
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let k = 0; k < NTICK; k++) {
      const tk = SWEEP1 + (k + 0.5) * dT
      if (tk > tau) break
      sample(trA, tk, tmp)
      const v = Math.hypot(tmp.vx, tmp.vy)
      // outward normal: (vy, -vx) for an anticlockwise orbit
      const nx = tmp.vy / v
      const ny = -tmp.vx / v
      const L = (k % 4 === 0 ? 9 : 5) * (small ? 0.75 : 1)
      ctx.moveTo(X(tmp.x), Y(tmp.y))
      ctx.lineTo(X(tmp.x) + nx * L, Y(tmp.y) - ny * L)
    }
    ctx.stroke()
    ctx.restore()
  }

  /** velocity arrows at perihelion and aphelion */
  function drawSpeeds(T: number, alpha: number) {
    if (alpha <= 0) return
    const kv = 0.42 / (TAU * 2)
    const vp = TAU * Math.sqrt((1 + EA) / (1 - EA))
    const va = TAU * Math.sqrt((1 - EA) / (1 + EA))
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.2
    const xp = 1 - EA
    const xa = -1 - EA
    const gp = ease.outCubic(smoothstep(24.4, 25.6, T))
    const ga = ease.outCubic(smoothstep(25.0, 26.2, T))
    if (gp > 0) arrow(X(xp), Y(0), X(xp), Y(vp * kv * gp), small ? 4.5 : 6)
    if (ga > 0) arrow(X(xa), Y(0), X(xa), Y(-va * kv * ga), small ? 4.5 : 6)
    if (!tiny) {
      const sz = small ? 8.5 : 9.5
      if (gp > 0.5) sideLabel(`v = ${vp.toFixed(1)} AU/yr`, X(xp) + 8, X(xp) - 8, Y(vp * kv) + 4, { size: sz, color: C.ocean, tracking: 0.06, alpha: smoothstep(0.5, 1, gp) })
      if (ga > 0.5) halo(`v = ${va.toFixed(1)}`, X(xa) - 8, Y(-va * kv) + 16, { size: sz, color: C.ocean, tracking: 0.06, align: 'right', alpha: smoothstep(0.5, 1, ga) })
    }
    ctx.restore()
  }

  /** the degree ring of III–IV: a protractor around the Sun */
  function drawRing(alpha: number) {
    if (alpha <= 0) return
    const R = 2.42 * view.s
    const cx = X(0)
    const cy = Y(0)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.14)
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.28)
    ctx.beginPath()
    for (let d = 0; d < 360; d += 5) {
      const a = (d * Math.PI) / 180
      const l = d % 30 === 0 ? 8 : 3.5
      ctx.moveTo(cx + Math.cos(a) * R, cy - Math.sin(a) * R)
      ctx.lineTo(cx + Math.cos(a) * (R - l), cy - Math.sin(a) * (R - l))
    }
    ctx.stroke()
    if (!small && R > 160) {
      for (let d = 0; d < 360; d += 30) {
        const a = (d * Math.PI) / 180
        text(ctx, `${d}°`, cx + Math.cos(a) * (R + 13), cy - Math.sin(a) * (R + 13) + 3, { size: 8, color: C.muted, align: 'center', tracking: 0.06 })
      }
    }
    ctx.restore()
  }

  /** III: T² = a³ on log–log axes, with Kepler's six and the two drawn worlds */
  const LX0 = Math.log10(0.25)
  const LX1 = Math.log10(14)
  const LY0 = Math.log10(0.12)
  const LY1 = Math.log10(52)
  function drawPlot(T: number, alpha: number) {
    if (!P.on || alpha <= 0) return
    const s = P.s
    const x0 = P.x
    const y0 = P.y
    const px = (a: number) => x0 + ((Math.log10(a) - LX0) / (LX1 - LX0)) * s
    const py = (t: number) => y0 + s - ((Math.log10(t) - LY0) / (LY1 - LY0)) * s
    const sz = small ? 8 : 9
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    // frame and decades
    const fr = smoothstep(40, 41, T)
    ctx.strokeStyle = rgba(C.ink, 0.5 * fr)
    ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(s), Math.round(s))
    ctx.strokeStyle = rgba(C.ink, 0.1 * fr)
    ctx.beginPath()
    for (const a of [0.3, 0.5, 1, 2, 3, 5, 10]) {
      ctx.moveTo(Math.round(px(a)) + 0.5, y0)
      ctx.lineTo(Math.round(px(a)) + 0.5, y0 + s)
    }
    for (const t of [0.2, 0.5, 1, 2, 5, 10, 20, 50]) {
      if (t > 52) continue
      ctx.moveTo(x0, Math.round(py(t)) + 0.5)
      ctx.lineTo(x0 + s, Math.round(py(t)) + 0.5)
    }
    ctx.stroke()
    ctx.globalAlpha = alpha * fr
    for (const a of [0.3, 1, 3, 10]) text(ctx, String(a), px(a), y0 + s + 12, { size: 8, color: C.muted, align: 'center', tracking: 0.04 })
    for (const t of [0.2, 1, 5, 20]) text(ctx, String(t), x0 - 5, py(t) + 3, { size: 8, color: C.muted, align: 'right', tracking: 0.04 })
    text(ctx, 'a · AU', x0 + s, y0 + s + 24, { size: 8, color: C.muted, align: 'right', upper: true, tracking: 0.14 })
    text(ctx, 'T · yr', x0, y0 - 7, { size: 8, color: C.muted, upper: true, tracking: 0.14 })
    // the law: T = a^(3/2)
    const ln = ease.inOutSine(smoothstep(44.4, 46.4, T))
    if (ln > 0) {
      const a0 = 0.25
      const a1 = lerp(a0, 14, ln)
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.beginPath()
      const steps = 24
      for (let i = 0; i <= steps; i++) {
        const a = a0 * Math.pow(a1 / a0, i / steps)
        const t = Math.pow(a, 1.5)
        const yy = Math.max(y0, py(t))
        if (i) ctx.lineTo(px(a), yy)
        else ctx.moveTo(px(a), yy)
      }
      ctx.stroke()
      if (ln > 0.9) {
        const la = smoothstep(0.9, 1, ln)
        halo('T² = a³', x0 + 8, y0 + 18, { size: small ? 10 : 12, color: C.moss, tracking: 0.06, alpha: la })
        if (s > 130) halo('slope 3/2', x0 + 8, y0 + 32, { size: 8.5, color: C.muted, upper: true, tracking: 0.14, alpha: la })
      }
    }
    // Kepler's six
    KEPLER.forEach(([name, a, t], i) => {
      const k = smoothstep(41 + i * 0.5, 41.4 + i * 0.5, T)
      if (k <= 0) return
      ctx.globalAlpha = alpha * k
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(px(a), py(t), 2.2, 0, TAU)
      ctx.fill()
      const right = i < 5
      if (s > 120 || i % 2 === 0) text(ctx, s > 150 ? name : name.slice(0, 2), px(a) + (right ? 6 : -6), py(t) + (i === 2 ? 11 : 3), { size: sz, color: C.ink2, align: right ? 'left' : 'right', tracking: 0.06 })
    })
    // the two measured worlds
    const marks: [string, number, number, number, string][] = [
      ['A', 1, TA, MEAS_A0 + TA, C.ocean],
      ['B', AB, TB, MEAS_B0 + TB, C.lagoon],
    ]
    const tau = tauAt(T)
    for (const [nm, a, per, done, col] of marks) {
      const k = clamp((tau - done) / 0.12)
      if (k <= 0) continue
      ctx.globalAlpha = alpha * k
      ctx.strokeStyle = col
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(px(a), py(per), 5.5, 0, TAU)
      ctx.stroke()
      const ring = clamp((tau - done) / 0.5)
      if (ring < 1) {
        ctx.globalAlpha = alpha * (1 - ring)
        ctx.beginPath()
        ctx.arc(px(a), py(per), 5.5 + ring * 16, 0, TAU)
        ctx.stroke()
      }
      ctx.globalAlpha = alpha * k
      text(ctx, nm, px(a) - 9, py(per) - 7, { size: sz + 1, color: col, align: 'right', tracking: 0.06 })
    }
    ctx.restore()
  }

  /** II: the observation log — each sector's time and area */
  function drawLog(T: number, alpha: number) {
    if (!LOG.on || alpha <= 0) return
    const rh = LOG.row
    const sz = LOG.row < 13 ? 8 : 9
    const rowsFit = Math.floor((LOG.h - rh * 2.4) / rh)
    const n = secDone
    const first = Math.max(0, n - rowsFit)
    ctx.save()
    ctx.globalAlpha = alpha
    let y = LOG.y + 8
    const cA = LOG.compact ? 46 : 150
    const wL = LOG.compact ? 112 : 214
    text(ctx, LOG.compact ? 'Sect' : 'Sector', LOG.x, y, { size: sz, color: C.muted, upper: true, tracking: 0.14 })
    if (!LOG.compact) text(ctx, 'Δt · yr', LOG.x + 78, y, { size: sz, color: C.muted, upper: true, tracking: 0.14 })
    text(ctx, 'ΔA · AU²', LOG.x + cA, y, { size: sz, color: C.muted, upper: true, tracking: 0.14 })
    ctx.strokeStyle = rgba(C.ink, 0.2)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(LOG.x, y + 6.5)
    ctx.lineTo(LOG.x + wL, y + 6.5)
    ctx.stroke()
    y += rh + 4
    for (let k = first; k < n; k++) {
      const age = T - tOfTau(SWEEP0 + (k + 1) * (TA / NSECT))
      const a = clamp(age / 0.4)
      text(ctx, String(k + 1).padStart(2, '0'), LOG.x, y, { size: sz, color: C.ink2, tracking: 0.08, alpha: a })
      if (!LOG.compact) text(ctx, (TA / NSECT).toFixed(4), LOG.x + 78, y, { size: sz, color: C.ink2, tracking: 0.04, alpha: a })
      text(ctx, secArea[k].toFixed(4), LOG.x + cA, y, { size: sz, color: k % 2 ? C.ocean : C.lagoon, tracking: 0.04, alpha: a })
      y += rh
    }
    if (n === NSECT) {
      let sum = 0
      for (let k = 0; k < NSECT; k++) sum += secArea[k]
      const a = smoothstep(23.8, 24.6, T)
      ctx.strokeStyle = rgba(C.ink, 0.2 * a)
      ctx.beginPath()
      ctx.moveTo(LOG.x, y - rh + 6.5)
      ctx.lineTo(LOG.x + wL, y - rh + 6.5)
      ctx.stroke()
      y += 4
      text(ctx, LOG.compact ? 'Σ' : 'Σ = πab', LOG.x, y, { size: sz, color: C.ink, tracking: 0.08, alpha: a })
      text(ctx, sum.toFixed(4), LOG.x + cA, y, { size: sz, color: C.ink, tracking: 0.04, alpha: a })
    }
    ctx.restore()
  }

  function drawBodies(alpha: number) {
    if (!bodies.length || alpha <= 0) return
    ctx.save()
    ctx.lineWidth = 1
    for (const b of bodies) {
      const a = alpha * b.fade
      if (a <= 0.01) continue
      const col = b.bot ? C.lagoon : C.ocean
      // trail in three bands, oldest faintest
      const n = b.count
      const bands = 3
      for (let band = 0; band < bands; band++) {
        const i0 = Math.floor((n * band) / bands)
        const i1 = Math.floor((n * (band + 1)) / bands)
        if (i1 - i0 < 1) continue
        ctx.strokeStyle = rgba(col, [0.18, 0.4, 0.75][band] * a)
        ctx.beginPath()
        for (let i = i0; i <= Math.min(i1, n - 1); i++) {
          const j = (b.head - (n - 1) + i + TRAIL * 4) % TRAIL
          const sx = X(b.tx[j])
          const sy = Y(b.ty[j])
          if (i === i0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
      }
      if (b.alive) {
        const sx = X(b.x)
        const sy = Y(b.y)
        ctx.globalAlpha = a
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(sx, sy, small ? 2.2 : 2.8, 0, TAU)
        ctx.fill()
        if (b.label && b.labelT > 0 && !tiny) {
          const la = clamp(b.labelT / 0.6)
          halo(b.label, sx + 8, sy - 7, { size: small ? 8 : 9, color: col, upper: true, tracking: 0.12, alpha: la })
        }
        ctx.globalAlpha = 1
      }
    }
    // swallowed bodies: a small collapsing ring
    for (const bu of bursts) {
      const k = bu.t / 0.7
      ctx.globalAlpha = alpha * (1 - k)
      ctx.strokeStyle = C.ink2
      ctx.beginPath()
      ctx.arc(X(bu.x), Y(bu.y), 3 + (1 - k) * 10, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  /** the launch instrument: the drag arrow, circular/escape rings, prediction */
  function drawLauncher(sx: number, sy: number, ex: number, ey: number, alpha: number, label: boolean, ghost: boolean) {
    const s = view.s
    const wx = (sx - view.x) / s
    const wy = (view.y - sy) / s
    const r = Math.max(0.05, Math.hypot(wx, wy))
    const vc = Math.sqrt(GM / r)
    const rc = vc / vPerPx()
    const re = rc * Math.SQRT2
    const dx = ex - sx
    const dy = ey - sy
    const vx = dx * vPerPx()
    const vy = -dy * vPerPx()
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    // the rings: inside the inner ring the body falls inward; beyond the outer it escapes
    ctx.setLineDash([1.5, 3.5])
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.beginPath()
    ctx.arc(sx, sy, rc, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    ctx.arc(sx, sy, re, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    if (!tiny) {
      // ring names on their tops, unless the arrow points up through them
      const up = ey < sy - rc * 0.6 && Math.abs(ex - sx) < rc
      const ly = up ? sy + 1 : sy
      if (up) {
        halo('circular', sx, ly + rc + 10, { size: 8, color: C.muted, upper: true, tracking: 0.12, align: 'center' })
        halo('escape', sx, ly + re + 10, { size: 8, color: C.muted, upper: true, tracking: 0.12, align: 'center' })
      } else {
        halo('circular', sx, sy - rc - 3, { size: 8, color: C.muted, upper: true, tracking: 0.12, align: 'center' })
        halo('escape', sx, sy - re - 3, { size: 8, color: C.muted, upper: true, tracking: 0.12, align: 'center' })
      }
    }
    // the prediction
    if (Math.hypot(dx, dy) > 3) {
      predict(wx, wy, vx, vy)
      ctx.strokeStyle = rgba(C.ocean, 0.75)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      const lim = ghost ? Math.min(predN, 80) : predN
      for (let i = 0; i < lim; i += 2) {
        const px = X(predX[i])
        const py = Y(predY[i])
        if (i) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    // the arrow
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.3
    if (Math.hypot(dx, dy) > 3) arrow(sx, sy, ex, ey, 7)
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(sx, sy, 3, 0, TAU)
    ctx.fill()
    if (label) {
      const v = Math.hypot(vx, vy)
      const E = 0.5 * v * v - GM / r
      let kind: string
      if (Math.hypot(dx, dy) <= 3) kind = 'Tap: circular orbit'
      else if (predEnd === 'sun') kind = 'Falls into the Sun'
      else if (E >= 0) kind = `Escapes · ${(v / (vc * Math.SQRT2)).toFixed(2)} v esc`
      else {
        const hh = wx * vy - wy * vx
        const ecc = Math.sqrt(Math.max(0, 1 + (2 * E * hh * hh) / (GM * GM)))
        kind = predEnd === 'escape' ? `Slung out · e ${ecc.toFixed(2)}` : `Ellipse · e ${ecc.toFixed(2)}`
      }
      const first = ghost ? 'Drag to launch a world' : kind
      const second = ghost ? (Math.hypot(dx, dy) > 3 ? kind : 'or tap for a circular orbit') : ''
      setFont(ctx, { size: 9.5, tracking: 0.14 })
      const lw = Math.max(ctx.measureText(first.toUpperCase()).width, ctx.measureText(second.toUpperCase()).width * 0.92)
      const lx = clamp(ex + 12, pad, w - pad - lw)
      const ly = clamp(ey + (dy > -4 ? 22 : -14), pad + 30, h - pad - 30)
      halo(first, lx, ly, { size: 9.5, color: C.ocean, upper: true, tracking: 0.14 })
      if (second && !tiny) halo(second, lx, ly + 14, { size: 8.5, color: C.muted, upper: true, tracking: 0.14 })
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
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: C.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, readouts: [string, string][]) {
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    text(ctx, `${FIG} — Equal areas`, pad, pad + 10, { size: small ? 9 : 10, color: C.muted, tracking: 0.16, upper: true })
    // chapter label above the caption
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(OUTRO, OUTRO + 1.2, T) : 1)
    if (!preview || h > 200) {
      const lab = small ? `${c.num} — ${c.name}` : `${c.num} — ${c.name} · ${c.law}`
      text(ctx, lab, capX, capY - (small ? 4 : 9), { size: small ? 9 : 10.5, color: C.ink2, tracking: 0.16, upper: true, alpha: kIn })
    }
    // readouts, top right
    let y = pad + 10
    const rs = small ? 9 : 10.5
    const maxRows = tiny ? 2 : short || narrow ? 3 : 6
    for (const [label, value] of readouts.slice(0, maxRows)) {
      setFont(ctx, { size: rs, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      halo(value, w - pad, y, { size: rs, color: C.ink, align: 'right', tracking: 0.06 })
      if (label) halo(label, w - pad - vw - 10, y, { size: small ? 8.5 : 9.5, color: C.muted, align: 'right', tracking: 0.14, upper: true })
      y += small ? 13 : 16
    }
    // the chapter ruler
    if (rulerOn) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY()
      ctx.lineWidth = 1
      ctx.strokeStyle = C.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 45; i++) {
        const x = lerp(x0, x1, i / 45)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 5 === 0 ? 4 : 2))
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

  /** where the early ghost demonstrates the launch: an empty corner of the view */
  function ghostSpot() {
    // wide frames: the empty left column; otherwise beneath the ellipse
    if (wide) return { x: clamp(V.x * 0.62, pad + 60, V.x - 30), y: clamp(h * 0.34, pad + 90, capY - 120) }
    return { x: clamp(X(-0.6) + view.s * 0.35, pad + 40, w - pad - 150), y: clamp(Y(-bA) + 60, V.y + 40, capY - 60) }
  }

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
        hover = { x: -1, y: -1 }
        if (drag.on && p.pressed === false) drag.on = false
        env.setCursor('default')
        return
      }
      const ruler = onRuler(p.x, p.y, touch)
      hoverRuler = (ruler && !drag.on) || scrubbing ? p.x : -1
      hover = { x: p.x, y: p.y }
      hoverTouch = touch
      if (p.type === 'down') {
        acted = true
        if (ruler) {
          scrubbing = true
          seekTo(p.x)
          return
        }
        drag.on = true
        drag.sx = drag.x = p.x
        drag.sy = drag.y = p.y
        drag.touch = touch
        drag.ms = performance.now()
        env.setCursor('grabbing')
        return
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      if (drag.on) {
        drag.x = p.x
        drag.y = p.y
        if (p.type === 'up') {
          launchFromDrag()
          drag.on = false
        }
        env.setCursor(p.type === 'up' ? 'crosshair' : 'grabbing')
        return
      }
      env.setCursor(ruler ? 'pointer' : 'crosshair')
    },
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (!down) return true
        const T = mod(prevT < 0 ? 0 : prevT, LOOP)
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
      if (code === 'KeyC' || code === 'Backspace') {
        if (down) bodies.length = 0
        return true
      }
      return false
    },
    frame(t, dt) {
      clock = t
      let T = mod(t + offset, LOOP)
      // free play: hold the end of the orrery while the viewer is launching
      holding = !preview && T >= HOLD_AT && T < OUTRO && clock - lastLaunch < 14
      if (holding && prevT >= 0 && dt > 0) {
        offset -= dt
        T = mod(t + offset, LOOP)
      }
      const jumped = prevT >= 0 && (T < prevT - 0.5 || T > prevT + 0.5)
      const advancing = dt > 0 && prevT >= 0 && !jumped && T >= prevT
      if (prevT >= 0 && T < prevT - 1 && prevT > LOOP - 2) {
        // looped: a clean page
        bodies.length = 0
        bursts.length = 0
        for (const d of demos) d.done = false
      }
      if (jumped) for (const d of demos) d.done = T > d.T + 0.5
      const crossed = (te: number) => advancing && prevT < te && te <= T

      // the clocks: τ for the lesson; free-running in the orrery
      const tauPrev = simTau
      if (T < 60 || !advancing || lastT < 60) simTau = tauAt(T)
      else simTau += rateAt(T) * dt
      lastT = T

      // the view: A's ellipse through II, the whole system from III
      const vm = ease.inOutCubic(smoothstep(35.6, 39.4, T))
      view.s = lerp(viewA.s, viewB.s, vm)
      view.x = lerp(viewA.x, viewB.x, vm)
      view.y = lerp(viewA.y, viewB.y, vm)
      const fadeAll = 1 - smoothstep(OUTRO, LOOP - 0.4, T)

      ground(ctx, w, h, 'paper')

      // planets' gravity on the bodies: A once it exists, B once it is drawn
      wA = smoothstep(8, 9, T) * (T < 60 ? 0.3 : 1)
      wB = smoothstep(38, 40, T)

      /* ---------------------------------------------------- dynamics */
      if (dt > 0 && bodies.length) {
        const dtau = rateAt(T) * Math.min(dt, 1 / 20)
        const tau0 = advancing && T >= 60 ? tauPrev : simTau - dtau
        for (const b of bodies) {
          if (b.labelT > 0) b.labelT -= dt
          if (!b.alive) {
            b.fade -= dt * 0.8
            continue
          }
          const ok = advance(b, tau0, dtau)
          // trail: one point per frame
          b.head = (b.head + 1) % TRAIL
          b.tx[b.head] = b.x
          b.ty[b.head] = b.y
          b.count = Math.min(TRAIL, b.count + 1)
          if (!ok) {
            b.alive = false
            continue
          }
          // perihelion: radial velocity turns from in to out
          const rv = b.x * b.vx + b.y * b.vy
          if (b.prevRv < 0 && rv >= 0) {
            const q = Math.hypot(b.x, b.y)
            if (q < 5) sfx.tone(SCALE[clamp(Math.round(10 - Math.log2(q) * 3), 0, SCALE.length - 1)], 1.4, { type: 'sine', gain: 0.035, attack: 0.01, room: 0.5, pan: clamp(b.x / 3, -0.8, 0.8) })
          }
          b.prevRv = rv
          // a close pass by B, now receding: name what it did
          if (!b.assisted && b.nearB < 0.22 && acc.dB > b.nearB + 0.12) {
            b.assisted = true
            const E = 0.5 * (b.vx * b.vx + b.vy * b.vy) - GM / Math.hypot(b.x, b.y)
            b.label = E >= 0 ? 'Slingshot · flung out' : 'Gravity assist'
            b.labelT = 3
          }
        }
        for (let i = bodies.length - 1; i >= 0; i--) if (!bodies[i].alive && bodies[i].fade <= 0) bodies.splice(i, 1)
      }
      for (const bu of bursts) bu.t += dt
      for (let i = bursts.length - 1; i >= 0; i--) if (bursts[i].t > 0.7) bursts.splice(i, 1)

      // chapter IV: the demonstration launches
      for (const d of demos) {
        if (!d.done && T >= d.T && T < d.T + 0.6 && (advancing || prevT < 0)) {
          d.done = true
          const b = addBody(d.x, d.y, d.vx, d.vy, true, d.label)
          b.labelT = 3.2
          sfx.tone(SCALE[6], 0.6, { type: 'triangle', gain: 0.035, room: 0.35 })
        }
      }

      if (Number.isFinite(tFixed) && t + 0.5 / 60 < tFixed) {
        prevT = T
        return
      }

      /* ---------------------------------------------------- drawing */
      ctx.save()
      ctx.globalAlpha = fadeAll
      const readouts: [string, string][] = []
      sample(trA, simTau, sA)
      sample(trB, simTau, sB)

      // III–IV: the protractor
      drawRing(smoothstep(37, 40, T))

      // A's ellipse: drawn by the construction in I, then a plain outline
      const lessonFade = 1 - smoothstep(35, 37, T)
      if (T < 12) drawConstruction(T, 1, true)
      else {
        ctx.save()
        ctx.strokeStyle = rgba(C.ink, T < 36 ? 1 : lerp(1, 0.5, smoothstep(36, 38, T)) * (T >= 60 ? lerp(1, 0.6, smoothstep(60, 62, T)) : 1))
        ctx.lineWidth = 1
        if (T >= 60) ctx.setLineDash([2, 3])
        ellipsePath(1, EA, 0)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
        if (lessonFade > 0) drawConstruction(12, lessonFade * lerp(1, 0.6, smoothstep(12.5, 14, T)), false, 1 - smoothstep(12.2, 13.6, T))
      }
      // B's ellipse, drawn on as it arrives
      const bIn = smoothstep(38, 41, T)
      if (bIn > 0) {
        ctx.save()
        ctx.strokeStyle = rgba(C.ink, T >= 60 ? 0.45 : 0.75)
        if (T >= 60) ctx.setLineDash([2, 3])
        ellipsePath(AB, EB, WB, ease.inOutSine(bIn))
        ctx.stroke()
        ctx.restore()
      }

      // II: sectors, ticks, speeds
      const secAlpha = (T < 23.8 ? 1 : lerp(1, 0.62, smoothstep(23.8, 25, T))) * (1 - smoothstep(34.8, 36.6, T))
      if (T >= 12 && T < 37) drawSectors(Math.min(simTau, SWEEP1), T, secAlpha)
      if (T >= 23 && T < 37) drawTimeTicks(Math.min(simTau, TICK1), 1 - smoothstep(34.8, 36.6, T))
      if (T >= 24 && T < 37) drawSpeeds(T, 1 - smoothstep(34.4, 36, T))

      // the radius vector, Sun to planet (II)
      const rvA = smoothstep(13, 14.5, T) * (1 - smoothstep(34.8, 36, T))
      const aOn = smoothstep(7.9, 8.4, T)
      if (rvA > 0) {
        ctx.save()
        ctx.globalAlpha *= rvA
        ctx.strokeStyle = C.ocean
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(X(0), Y(0))
        ctx.lineTo(X(sA.x), Y(sA.y))
        ctx.stroke()
        ctx.restore()
      }
      // the live velocity arrow (II, second orbit)
      const vArrow = smoothstep(26, 27, T) * (1 - smoothstep(34.4, 36, T))
      if (vArrow > 0) {
        const kv = 0.42 / (TAU * 2)
        ctx.save()
        ctx.globalAlpha *= vArrow
        ctx.strokeStyle = C.ocean
        ctx.lineWidth = 1
        arrow(X(sA.x), Y(sA.y), X(sA.x + sA.vx * kv), Y(sA.y + sA.vy * kv), 5)
        ctx.restore()
      }

      // III: stopwatches — each world's measured lap, drawn as it goes
      if (T >= 38.5 && T < 61) {
        const laps: [Track, number, string][] = [
          [trB, MEAS_B0, C.lagoon],
          [trA, MEAS_A0, C.ocean],
        ]
        for (const [tr, t0, col] of laps) {
          if (simTau < t0) continue
          const done = simTau >= t0 + tr.T
          const t1 = Math.min(simTau, t0 + tr.T)
          const fadeL = done ? 1 - clamp((simTau - t0 - tr.T) / 0.6) : 1
          if (fadeL <= 0) continue
          ctx.save()
          ctx.globalAlpha *= fadeL * (1 - smoothstep(58, 60, T))
          ctx.strokeStyle = col
          ctx.lineWidth = 2
          ctx.beginPath()
          const n = Math.max(2, Math.ceil(((t1 - t0) / tr.T) * 200))
          for (let i = 0; i <= n; i++) {
            sample(tr, t0 + ((t1 - t0) * i) / n, tmp)
            if (i) ctx.lineTo(X(tmp.x), Y(tmp.y))
            else ctx.moveTo(X(tmp.x), Y(tmp.y))
          }
          ctx.stroke()
          sample(tr, t0, tmp)
          ctx.lineWidth = 1
          ctx.beginPath()
          const sx = X(tmp.x)
          const sy = Y(tmp.y)
          const r = Math.hypot(tmp.x, tmp.y)
          ctx.moveTo(sx - (tmp.x / r) * 6, sy + (tmp.y / r) * 6)
          ctx.lineTo(sx + (tmp.x / r) * 6, sy - (tmp.y / r) * 6)
          ctx.stroke()
          ctx.restore()
        }
      }

      // IV: Hill spheres, where the planets' own pull wins
      const hill = smoothstep(60.5, 62, T)
      if (hill > 0 && !tiny) {
        ctx.save()
        ctx.globalAlpha *= hill * 0.8
        ctx.strokeStyle = rgba(C.ink, 0.4)
        ctx.setLineDash([1.5, 3])
        ctx.lineWidth = 1
        const rA = Math.hypot(sA.x, sA.y) * Math.cbrt(MU_A / 3)
        const rB = Math.hypot(sB.x, sB.y) * Math.cbrt(MU_B / 3)
        ctx.beginPath()
        ctx.arc(X(sA.x), Y(sA.y), rA * view.s, 0, TAU)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(X(sB.x), Y(sB.y), rB * view.s, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
        if (!small && T < 72) halo('Hill sphere', X(sB.x) + rB * view.s + 6, Y(sB.y) + 3, { size: 8.5, color: C.muted, upper: true, tracking: 0.12, alpha: 1 - smoothstep(70, 72, T) })
        ctx.restore()
      }

      // bodies
      drawBodies(1)

      // the Sun and the worlds
      sun(X(0), Y(0), T < 12 ? smoothstep(7.4, 8.2, T) : 1, T)
      planet(X(sA.x), Y(sA.y), 'A', aOn)
      if (bIn > 0) planet(X(sB.x), Y(sB.y), 'B', smoothstep(38, 39, T))
      if (!small && T >= 38.5 && T < 60) {
        const la = smoothstep(39, 40, T) * (1 - smoothstep(58, 60, T))
        halo('A', X(sA.x) + 8, Y(sA.y) - 8, { size: 10, color: C.ocean, alpha: la })
        halo('B', X(sB.x) + 9, Y(sB.y) - 9, { size: 10, color: C.lagoon, alpha: la })
      }

      // III: the plot; II: the log
      if (T >= 39 && T < 62) drawPlot(T, smoothstep(39.6, 40.6, T) * (1 - smoothstep(60, 61.6, T)))
      if (T >= 15 && T < 37) drawLog(T, smoothstep(15.6, 16.4, T) * (1 - smoothstep(34.6, 36, T)))

      /* ---------------------------------------------------- readouts */
      const r = Math.hypot(sA.x, sA.y)
      const v = Math.hypot(sA.vx, sA.vy)
      if (T < 12) {
        readouts.push(['a', '1.000 AU'], ['e', EA.toFixed(3)], ['b', `${bA.toFixed(3)} AU`], ['c = ae', '0.600 AU'])
      } else if (T < 36) {
        const sec = clamp(Math.floor((simTau - SWEEP0) / (TA / NSECT)) + 1, 0, NSECT)
        if (T < 23.7 && simTau >= SWEEP0) readouts.push(['sector', `${String(sec).padStart(2, '0')} / 12`])
        readouts.push(['r', `${r.toFixed(3)} AU`], ['v', `${v.toFixed(2)} AU/yr`], ['r × v', `${Math.abs(sA.x * sA.vy - sA.y * sA.vx).toFixed(4)}`])
        if (T >= 24.5) readouts.push(['v peri / v aph', '4.00'], ['(1 + e)/(1 − e)', '4.00'])
        else readouts.push(['ΔA', `${((Math.PI * bA) / NSECT).toFixed(4)} AU²`])
        if (!LOG.on && secDone === NSECT && T < 30) readouts.push(['12 × ΔA', 'πab'])
      } else if (T < 60) {
        const k3 = (tr: Track) => (tr.T * tr.T) / (tr.a * tr.a * tr.a)
        const lapA = clamp((simTau - MEAS_A0) / TA, 0, 1)
        const lapB = clamp((simTau - MEAS_B0) / TB, 0, 1)
        const tA = simTau >= MEAS_A0 + TA ? `${TA.toFixed(4)} yr` : simTau >= MEAS_A0 ? `${(lapA * TA).toFixed(2)} yr …` : '—'
        const tB = simTau >= MEAS_B0 + TB ? `${TB.toFixed(4)} yr` : `${(lapB * TB).toFixed(2)} yr …`
        const both = simTau >= MEAS_B0 + TB
        if (short || tiny || narrow) {
          // condensed: the law, then the periods
          if (both) readouts.push(['T² / a³', `A ${k3(trA).toFixed(3)} · B ${k3(trB).toFixed(3)}`])
          readouts.push(['T', `A ${tA.replace(' yr', '')} · B ${tB}`])
        } else {
          readouts.push(['A · a', '1.000 AU'], ['A · T', tA], ['B · a', `${AB.toFixed(3)} AU`], ['B · T', tB])
          if (both) readouts.push(['T² / a³', `${k3(trA).toFixed(4)} · ${k3(trB).toFixed(4)}`])
        }
        if (!P.on && T > 44 && !both) readouts.push(['law', 'T² = a³'])
      } else {
        const alive = bodies.filter((b) => b.alive).length
        readouts.push(['bodies', String(alive)], ['mass / Sun', 'A 0.001 · B 0.003'], ['integrator', 'leapfrog'], ['ΔE / E', trA.dE.toExponential(1)])
      }

      ctx.restore()

      /* ---------------------------------------------------- interaction */
      if (!preview) {
        // the early ghost: the launch gesture, demonstrated once
        if (!acted && T > 2.4 && T < 7.8) {
          const g = ghostSpot()
          const u = ease.inOutCubic(clamp((T - 3.0) / 1.4))
          const a = smoothstep(2.4, 3.0, T) * (1 - smoothstep(7.0, 7.8, T))
          const gx = (g.x - view.x) / view.s
          const gy = (view.y - g.y) / view.s
          const rr = Math.max(0.2, Math.hypot(gx, gy))
          const vlen = (Math.sqrt(GM / rr) * 0.86) / vPerPx()
          // anticlockwise tangent (world) is (−y, x)/r; screen y is flipped
          drawLauncher(g.x, g.y, g.x + (-gy / rr) * vlen * u, g.y - (gx / rr) * vlen * u, a * 0.9, true, true)
        }
        // IV: each demonstration shows the gesture before its launch
        for (const d of demos) {
          const u = clamp((T - (d.T - 1.3)) / 1.1)
          if (u <= 0 || T >= d.T) continue
          const sx = X(d.x)
          const sy = Y(d.y)
          const e = ease.inOutCubic(u)
          drawLauncher(sx, sy, sx + (d.vx / vPerPx()) * e, sy - (d.vy / vPerPx()) * e, smoothstep(0, 0.2, u) * fadeAll, true, false)
        }
        if (drag.on) drawLauncher(drag.sx, drag.sy, drag.x, drag.y, 1, true, false)
        else if (hover.x >= 0 && hoverRuler < 0 && !hoverTouch) {
          // hovering: the instrument waits under the pointer
          const wx = (hover.x - view.x) / view.s
          const wy = (view.y - hover.y) / view.s
          const rr = Math.hypot(wx, wy)
          if (rr > 0.08 && rr < 6) drawLauncher(hover.x, hover.y, hover.x, hover.y, 0.32, !launchedOnce && !tiny, true)
        }
        // a quiet reminder in the orrery
        if (T >= 74 && T < OUTRO && !drag.on && clock - lastLaunch > 6 && !tiny) {
          const al = smoothstep(74, 75, T) * (1 - smoothstep(OUTRO - 1, OUTRO, T))
          const msg = portrait || w < 600 ? 'Drag to launch · tap for a circle' : 'Drag anywhere to launch a world · tap for a circular orbit'
          text(ctx, msg, w - pad, rulerOn ? rulerY() - 24 : h - pad, { size: 9.5, color: C.muted, align: 'right', tracking: 0.14, upper: true, alpha: al })
        }
      }

      captionAt(T)
      chrome(T, readouts)

      /* ---------------------------------------------------- sound */
      if (sfx.enabled && advancing) {
        // perihelion notes for the two worlds
        const tp = tauPrev
        const tn = simTau
        if (tn > tp && tn - tp < 0.2) {
          const kA = Math.floor((tn - TA / 2) / TA)
          if (Math.floor((tp - TA / 2) / TA) < kA && T > 8.5) sfx.tone(SCALE[10], 1.8, { type: 'sine', gain: 0.05, attack: 0.012, room: 0.55, pan: 0.3 })
          const kB = Math.floor((tn - TB / 2) / TB)
          if (T > 38 && Math.floor((tp - TB / 2) / TB) < kB) sfx.tone(SCALE[5], 2.2, { type: 'sine', gain: 0.05, attack: 0.02, room: 0.6, pan: -0.3 })
          // II: a clock tick at every sector boundary — equal times, audibly
          if (T >= 15 && T < 24) {
            const dS = TA / NSECT
            const k1 = Math.floor((tn - SWEEP0) / dS)
            if (Math.floor((tp - SWEEP0) / dS) < k1 && k1 >= 0 && k1 <= NSECT) sfx.tone(1760, 0.07, { type: 'sine', gain: 0.02, attack: 0.002, room: 0.15 })
          }
        }
        KEPLER.forEach((_, i) => {
          if (crossed(41 + i * 0.5)) sfx.tone(SCALE[13 - i * 2], 1.2, { type: 'sine', gain: 0.03, room: 0.5 })
        })
        if (crossed(46.2)) sfx.tone(SCALE[0], 2.8, { type: 'sine', gain: 0.04, attack: 0.3, room: 0.6 })
      }

      prevT = T
    },
  }
}

export default create
