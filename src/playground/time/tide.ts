/*
 * T.02 — TIDE
 *
 * A lunar month at the shore, in two views on one plate. Above, the Earth,
 * Moon and Sun from over the north pole: the equilibrium tide drawn as a
 * hairline ellipse around the Earth (exaggerated about three million times),
 * pointing at the Moon, with the Sun's smaller bulge adding to it at new and
 * full moon (spring tides) and working against it at the quarters (neaps).
 * Below, one shore in section: the water climbing and leaving the beach twice
 * a lunar day, a wet-sand line, a tidepool, a boat swinging on its mooring,
 * and a tide gauge drawing the month on paper.
 *
 * The model is Newton's equilibrium tide in the equatorial plane:
 *   η = (3/4)[A☾ cos 2(ψ − φ☾) + A☉ cos 2(ψ − φ☉)]   (at the shore)
 * with A☾ = 0.357 m and A☉ = 0.164 m from M/d³. One synodic month
 * (29.53 days) passes in 78 s on a warped clock: an hour a second at first,
 * four hours a second, then most of a day, then slow again.
 *
 *   I    The pull           dawn to dusk, slowly; the tidal force drawn
 *   II   Twice a day        two highs per lunar day, measured
 *   III  Spring and neap    the month: the Sun's bulge adds, then opposes
 *   IV   Slack water        the record complete; the Moon recedes
 *
 * Full mode: drag the Moon around its orbit (time holds while you do) and
 * the bulge, the beach and the readouts follow; tap anywhere else to take the
 * Sun's tide away and give it back. ← → step chapters, S toggles the Sun.
 * Sound (optional): surf, rising and falling with the tide.
 */

import { C, TAU, clamp, cropMarks, damp, ease, lerp, makeNoise, mod, rgba, rng, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. T.02'
const LOOP = 78
/** synodic month, days */
const MONTH = 29.530589
/** equilibrium bulge heights above the sphere at the sub-body point, metres: μ (R/d)³ R */
const AM = 0.3568
const AS = 0.1638
/** the lunar day (Moon overhead to Moon overhead), days */
const LUNAR_DAY = MONTH / (MONTH - 1)

const CHAPTERS = [
  { t: 0, num: 'I', name: 'The pull' },
  { t: 15, num: 'II', name: 'Twice a day' },
  { t: 33, num: 'III', name: 'Spring and neap' },
  { t: 66, num: 'IV', name: 'Slack water' },
]

interface Caption {
  t0: number
  t1: number
  a: string
  em: string
}
const CAPTIONS: Caption[] = [
  { t0: 1.6, t1: 13.4, a: 'The Moon pulls on ', em: 'the whole ocean.' },
  { t0: 17.2, t1: 30.6, a: 'Twice a day, ', em: 'the sea comes home.' },
  { t0: 44.5, t1: 54, a: 'When Sun and Moon agree, ', em: 'the tides are highest.' },
  { t0: 68.4, t1: 76.4, a: 'And slowly, the tides ', em: 'push the Moon away.' },
]

/* ---------------------------------------------------------------- the clock */

// The month runs on a warped clock: τ (days) as a function of piece time T.
// The rate is a smooth blend of four speeds; the fast one is solved so the
// loop holds exactly one synodic month.
const DT = 1 / 60
function rateParts(T: number): [number, number] {
  const r0 = 1 / 24
  const r1 = 1 / 6
  const r3 = 1 / 12
  const u1 = smoothstep(14, 18, T)
  const u2 = smoothstep(31, 37, T)
  const u3 = smoothstep(62, 68, T)
  return [(1 - u3) * (1 - u2) * lerp(r0, r1, u1) + u3 * r3, (1 - u3) * u2]
}
const CLOCK = (() => {
  const n = Math.ceil(LOOP / DT) + 2
  const base = new Float64Array(n)
  const fast = new Float64Array(n)
  let a = 0
  let b = 0
  for (let i = 0; i < n; i++) {
    base[i] = a
    fast[i] = b
    const [r, wf] = rateParts((i + 0.5) * DT)
    a += r * DT
    b += wf * DT
  }
  const nLoop = LOOP / DT
  const ia = Math.floor(nLoop)
  const aL = lerp(base[ia], base[ia + 1], nLoop - ia)
  const bL = lerp(fast[ia], fast[ia + 1], nLoop - ia)
  const rF = (MONTH - aL) / bL
  const tau = new Float64Array(n)
  for (let i = 0; i < n; i++) tau[i] = base[i] + rF * fast[i]
  return { tau, rF }
})()
const tauAt = (T: number) => {
  const f = clamp(T, 0, LOOP) / DT
  const i = Math.min(CLOCK.tau.length - 2, Math.floor(f))
  return lerp(CLOCK.tau[i], CLOCK.tau[i + 1], f - i)
}
/** days per second of piece time */
const rateAt = (T: number) => {
  const [r, wf] = rateParts(T)
  return r + wf * CLOCK.rF
}

/* ---------------------------------------------------------------- the model */

const SUN = Math.PI
/** the shore's longitude angle in the Sun-fixed frame: sunrise at τ = 0 */
const psiAt = (tau: number) => Math.PI / 2 + TAU * tau
/** the Moon's direction: new moon at τ = 0, then counter-clockwise */
const moonAt = (tau: number) => Math.PI + (TAU * tau) / MONTH
/** height of the equilibrium tide at the shore, metres, relative to its own mean */
const etaShore = (psi: number, moon: number, k: number) => 0.75 * (AM * Math.cos(2 * (psi - moon)) + k * AS * Math.cos(2 * (psi - SUN)))
/** semi-amplitude of the semi-diurnal tide for a Sun–Moon angle */
const ampFor = (moon: number, k: number) => 0.75 * Math.sqrt(AM * AM + k * k * AS * AS + 2 * k * AM * AS * Math.cos(2 * (moon - SUN)))
/** height of the equilibrium surface above the sphere at angle φ (the bulge drawing) */
const P2 = (c: number) => (3 * c * c - 1) / 2
const bulgeAt = (phi: number, moon: number, k: number) => AM * P2(Math.cos(phi - moon)) + k * AS * P2(Math.cos(phi - SUN))

const SPRING_RANGE = 1.5 * (AM + AS)
const NEAP_RANGE = 1.5 * (AM - AS)
const QUARTERS = [0, 0.25, 0.5, 0.75, 1].map((q) => q * MONTH)

function phaseName(elong: number) {
  const e = mod(elong, TAU) / TAU
  const near = (x: number) => Math.abs(mod(e - x + 0.5, 1) - 0.5) < 0.034
  if (near(0)) return 'NEW MOON'
  if (near(0.25)) return 'FIRST QUARTER'
  if (near(0.5)) return 'FULL MOON'
  if (near(0.75)) return 'LAST QUARTER'
  if (e < 0.25) return 'WAXING CRESCENT'
  if (e < 0.5) return 'WAXING GIBBOUS'
  if (e < 0.75) return 'WANING GIBBOUS'
  return 'WANING CRESCENT'
}
const fmtClock = (tau: number) => {
  const hrs = mod(6 + 24 * tau, 24)
  const hh = Math.floor(hrs)
  const mm = Math.floor((hrs - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
const fmtDur = (days: number) => {
  const mins = Math.round(days * 1440)
  return `${Math.floor(mins / 60)} H ${String(mins % 60).padStart(2, '0')} MIN`
}
const signed = (v: number, d = 0) => {
  const r = Number(v.toFixed(d))
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toFixed(d)
}

/* ------------------------------------------------------------------- piece */

interface Layout {
  stack: boolean
  tight: boolean
  tiny: boolean
  pad: number
  // orbit view
  ox: number
  oy: number
  Ro: number
  rE: number
  rM: number
  sunX: number
  // the beach section
  bx: number
  by: number
  bw: number
  bh: number
  // the tide chart
  gx: number
  gy: number
  gw: number
  gh: number
  // caption
  capX: number
  capY: number
  capSize: number
  capW: number
  oneLine: boolean
  rulerY: number
  hudSize: number
  /** the smallest frames: preview cards and very short stages */
  mini: boolean
  /** readouts on their own row under the heading (portrait) */
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
  const noise = makeNoise(29)
  let w = env.width
  let h = env.height
  let L: Layout = layoutFor(w, h)

  // sand grains and wrack, in normalised beach coordinates (u across, v down from the profile)
  const r = rng(2953)
  const GRAINS = preview ? 220 : 520
  const grainU = new Float32Array(GRAINS)
  const grainV = new Float32Array(GRAINS)
  for (let i = 0; i < GRAINS; i++) {
    grainU[i] = r()
    grainV[i] = Math.pow(r(), 0.8)
  }
  const WET = 170
  const wetU = new Float32Array(WET)
  const wetV = new Float32Array(WET)
  for (let i = 0; i < WET; i++) {
    wetU[i] = r()
    wetV[i] = r()
  }
  const grass = Array.from({ length: 16 }, () => ({ u: 0.02 + r() * 0.2, h: 0.5 + r() * 0.6, lean: (r() - 0.5) * 0.5, ph: r() * TAU }))
  const gulls = Array.from({ length: 3 }, () => ({ u: 0.45 + r() * 0.4, v: 0.08 + r() * 0.12, s: 0.7 + r() * 0.5, ph: r() * TAU }))

  /** the beach profile: height (metres, from mean sea level) at u ∈ [0, 1] */
  function sand(u: number) {
    if (u < 0.2) return 0.62 + 0.36 * Math.sin(clamp(u / 0.2) * Math.PI) * (u < 0.1 ? 1 : 0.94)
    if (u < 0.72) return 0.62 - 2.1 * (u - 0.2) + 0.03 * Math.sin(u * 40)
    return Math.max(-0.56, 0.62 - 2.1 * 0.52 - 0.6 * (u - 0.72))
  }
  /** the beach profile with the rock ledge (and its pool) on it */
  function ground(u: number) {
    const z = sand(u)
    const rk = rock(u)
    return rk > -9 ? Math.max(z, rk) : z
  }
  const ROCK0 = 0.4
  const ROCK1 = 0.6
  const POOL0 = 0.465
  const POOL1 = 0.535
  const RIM = 0.035
  function rock(u: number) {
    if (u < ROCK0 || u > ROCK1) return -10
    const k = (u - ROCK0) / (ROCK1 - ROCK0)
    let z = 0.2 - 0.32 * k + 0.07 * Math.sin(k * Math.PI) + 0.012 * Math.sin(k * 31)
    if (u > POOL0 && u < POOL1) {
      const p = (u - POOL0) / (POOL1 - POOL0)
      z = Math.min(z, RIM + 0.004 - 0.15 * Math.sin(p * Math.PI) ** 0.7)
    }
    // round the ends down into the sand
    const edge = Math.min(k, 1 - k)
    return z - 0.25 * (1 - smoothstep(0, 0.12, edge))
  }
  const MOOR_U = 0.86

  // clock, interaction
  const at = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(at) ? at : preview ? 47 : 0
  let prevT = -1
  let sunOn = env.params.get('sun') !== '0'
  let sunK = sunOn ? 1 : 0
  // ?drag=<radians> (test route) shows the Moon held that far from its true place
  let moonOff = Number(env.params.get('drag')) || 0
  let dragging = env.params.has('drag')
  let dragId = -1
  let hoverMoon = false
  let used = false
  let sunUsed = false
  let downAt: { x: number; y: number; ms: number; moon: boolean } | null = null
  let scrubbing = false
  let hoverX = -1
  let ptrX = -1
  let ptrY = -1
  let touch = false
  let lastHigh = -1

  /* --------------------------------------------------------------- layout */

  function layoutFor(W: number, H: number): Layout {
    const stack = W < H * 1.2
    const tiny = H < 260 || W < 300
    const mini = preview || tiny
    const tight = mini || H < 470 || W < 700
    const pad = Math.round(clamp(Math.min(W, H) * 0.04, preview ? 10 : 12, 36))
    const hudSize = mini ? 10 : tight ? 11 : 13
    const rulerH = preview ? 0 : tiny ? 12 : 18
    const lay = { stack, tight, tiny, mini, pad, hudSize, hudRow: false } as Layout
    lay.rulerY = H - pad * 0.55
    const lab = tiny ? 10 : 13
    const gut = mini ? 6 : 26
    /** split a column into the beach (above) and the tide chart (below) */
    const column = (x0: number, x1: number, top: number, bottom: number, gap2: number) => {
      const total = bottom - top
      const gh = Math.min(total * (H < 480 ? 0.36 : 0.4), Math.max(52, (x1 - x0 - gut) * 0.3))
      lay.bx = x0
      lay.bw = x1 - x0
      lay.by = top
      lay.bh = total - gh - gap2 - lab
      lay.gx = x0 + gut
      lay.gw = x1 - x0 - gut
      lay.gy = top + lay.bh + gap2
      lay.gh = gh
    }
    if (!stack) {
      // side by side: the orbit on the left, the beach over the chart on the right
      const capTop = H < 540
      const capSize = capTop ? clamp(H * 0.055, 13, 21) : clamp(Math.min(W * 0.03, H * 0.046), 22, 46)
      const headH = (tiny ? 24 : tight ? 32 : 44) + (capTop && !preview ? capSize + 8 : 0)
      const top = pad + headH
      const bottom = H - pad - rulerH - (tiny ? 0 : 4)
      const leftW = (W - pad * 2) * (W > H * 2.2 ? 0.36 : 0.42)
      const capBlock = capTop ? 0 : capSize * 2.3 + 30
      const availH = bottom - top - capBlock
      const sunSpace = tiny ? 22 : tight ? 30 : 46
      const m1 = tiny ? 6 : 14
      const Ro = Math.max(24, Math.min((availH / 2 - m1) / 1.081, (leftW - sunSpace - m1 * 2) / 2.162))
      lay.Ro = Ro
      lay.rE = Ro * 0.3
      lay.rM = Ro * 0.081
      lay.ox = pad + sunSpace + (leftW - sunSpace) / 2
      lay.oy = top + availH / 2
      lay.sunX = lay.ox - Ro - lay.rM - (tiny ? 10 : 18)
      column(pad + leftW + (tight ? 14 : 30), W - pad, top, bottom, tiny ? 16 : tight ? 24 : 32)
      lay.capSize = capSize
      lay.oneLine = capTop
      if (capTop) {
        lay.capX = pad
        lay.capY = pad + headH - capSize - 12
        lay.capW = W - pad * 2
      } else {
        lay.capX = pad
        lay.capY = bottom - capSize * 2.2
        lay.capW = leftW
      }
      return lay
    }
    // stacked: orbit, beach, chart, caption
    const short = H < 640
    const capSize = clamp(Math.min(W * 0.062, H * 0.034), 15, 30)
    lay.hudRow = !short
    const headH = short ? 34 : 70
    const top = pad + headH
    const bottom = H - pad - rulerH - 4
    lay.oneLine = false
    if (short) {
      // squarish and short: the orbit sits beside the caption
      const rowH = (bottom - top) * 0.4
      const Ro = Math.max(24, Math.min((rowH / 2 - 8) / 1.081, (W * 0.5 - 30) / 2.162))
      lay.Ro = Ro
      lay.rE = Ro * 0.3
      lay.rM = Ro * 0.081
      lay.ox = pad + 24 + Ro * 1.081
      lay.oy = top + rowH / 2
      lay.sunX = lay.ox - Ro - lay.rM - 12
      lay.capSize = clamp(capSize * 0.9, 14, 22)
      lay.capX = lay.ox + Ro * 1.081 + 16
      lay.capW = W - pad - lay.capX
      lay.capY = lay.oy - lay.capSize * 1.1
      column(pad, W - pad, top + rowH + 8, bottom, 22)
      return lay
    }
    const capBlock = capSize * 2.3 + 26
    const avail = bottom - top - capBlock
    const orbitH = avail * 0.42
    const Ro = Math.max(30, Math.min((orbitH / 2 - 10) / 1.081, (W - pad * 2 - 40) / 2.162))
    lay.Ro = Ro
    lay.rE = Ro * 0.3
    lay.rM = Ro * 0.081
    lay.ox = W / 2 + 12
    lay.oy = top + orbitH / 2
    lay.sunX = lay.ox - Ro - lay.rM - 14
    column(pad, W - pad, top + orbitH + 10, top + avail, 28)
    lay.capSize = capSize
    lay.capX = pad
    lay.capY = bottom - capSize * 2.3 - 4
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
  function arrow(x1: number, y1: number, x2: number, y2: number, head = 4) {
    const a = Math.atan2(y2 - y1, x2 - x1)
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.moveTo(x2 + Math.cos(a + 2.6) * head, y2 + Math.sin(a + 2.6) * head)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x2 + Math.cos(a - 2.6) * head, y2 + Math.sin(a - 2.6) * head)
  }
  /** a disc hatched with `gap`-spaced lines, clipped */
  function hatchClip(gap: number, angle: number, x: number, y: number, ww: number, hh: number) {
    const cx = x + ww / 2
    const cy = y + hh / 2
    const R = Math.hypot(ww, hh) / 2 + gap
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    ctx.beginPath()
    for (let d = -R; d <= R; d += gap) {
      const px = cx - sa * d
      const py = cy + ca * d
      ctx.moveTo(px - ca * R, py - sa * R)
      ctx.lineTo(px + ca * R, py + sa * R)
    }
    ctx.stroke()
  }

  /** The Moon's face as seen from Earth: lit limb + terminator; the dark part hatched. */
  function moonGlyph(x: number, y: number, rr: number, elong: number, ink: string) {
    const e = mod(elong, TAU)
    const s = e < Math.PI ? 1 : -1
    const k = Math.cos(e)
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, TAU)
    ctx.save()
    ctx.clip()
    ctx.globalAlpha *= 0.55
    hatchClip(Math.max(1.6, rr * 0.28), -Math.PI / 4, x - rr, y - rr, rr * 2, rr * 2)
    ctx.restore()
    // the lit part
    ctx.beginPath()
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI
      const px = x + s * rr * Math.sin(a)
      const py = y - rr * Math.cos(a)
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    for (let i = 20; i >= 0; i--) {
      const a = (i / 20) * Math.PI
      ctx.lineTo(x + s * k * rr * Math.sin(a), y - rr * Math.cos(a))
    }
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  /* ------------------------------------------------------------ the state */

  interface State {
    T: number
    tau: number
    rate: number
    psi: number
    moon: number
    moonTrue: number
    eta: number
    amp: number
    detadt: number
  }
  function stateAt(T: number): State {
    const tau = tauAt(T)
    const moonTrue = moonAt(tau)
    const moon = moonTrue + moonOff
    const psi = psiAt(tau)
    const eta = etaShore(psi, moon, sunK)
    const e2 = etaShore(psiAt(tau + 0.002), moon + (TAU * 0.002) / MONTH, sunK)
    return { T, tau, rate: rateAt(T), psi, moon, moonTrue, eta, amp: ampFor(moon, sunK), detadt: (e2 - eta) / 0.002 }
  }
  /** highest water over the last `span` days (the wet-sand line), and the highest so far this month */
  function highWater(s: State, span: number) {
    let hi = -1
    const n = 30
    for (let i = 0; i <= n; i++) {
      const tt = s.tau - (span * i) / n
      if (tt < 0) break
      hi = Math.max(hi, etaShore(psiAt(tt), moonAt(tt) + (i === 0 ? moonOff : 0), sunK))
    }
    return hi
  }
  /** the next high and low water after τ (local clock strings) */
  function nextTides(s: State) {
    let hw = -1
    let lw = -1
    let prev = etaShore(psiAt(s.tau), moonAt(s.tau), sunK)
    let dir = Math.sign(etaShore(psiAt(s.tau + 0.002), moonAt(s.tau + 0.002), sunK) - prev)
    for (let i = 1; i <= 160 && (hw < 0 || lw < 0); i++) {
      const tt = s.tau + i * 0.0035
      const v = etaShore(psiAt(tt), moonAt(tt), sunK)
      const d = Math.sign(v - prev)
      if (d !== dir && d !== 0) {
        if (dir > 0 && hw < 0) hw = tt
        if (dir < 0 && lw < 0) lw = tt
        dir = d
      }
      prev = v
    }
    return { hw, lw }
  }

  /* ---------------------------------------------------------- orbit view */

  function drawOrbit(s: State, A: number) {
    const { ox, oy, Ro, rE, rM } = L
    const T = s.T
    const fastness = smoothstep(0.22, 0.6, s.rate)
    const ink = C.ink
    ctx.save()
    ctx.globalAlpha = A
    ctx.lineWidth = 1

    // the Sun, far to the left: a limb and parallel light
    const sunA = ease.outCubic(clamp((T - 0.4) / 1.6))
    const sunI = 0.35 + 0.65 * sunK
    if (sunA > 0) {
      ctx.save()
      ctx.globalAlpha = A * sunA
      const big = Ro * 2.4
      const span = Math.asin(Math.min(0.9, (Ro * 0.62) / big))
      ctx.strokeStyle = rgba(C.ink, 0.25 + 0.55 * sunI)
      ctx.beginPath()
      ctx.arc(L.sunX - big, oy, big, -span, span)
      ctx.stroke()
      // corona ticks
      ctx.beginPath()
      for (let i = -3; i <= 3; i++) {
        const a = (i / 3.4) * span
        const x0 = L.sunX - big + Math.cos(a) * (big + 4)
        const y0 = oy + Math.sin(a) * (big + 4)
        ctx.moveTo(x0, y0)
        ctx.lineTo(x0 + Math.cos(a) * (L.tiny ? 3 : 5), y0 + Math.sin(a) * (L.tiny ? 3 : 5))
      }
      ctx.stroke()
      // sunlight, stopping at the Earth's limb
      ctx.strokeStyle = rgba(C.ink, 0.12 + 0.18 * sunK)
      ctx.setLineDash([1, 4])
      ctx.beginPath()
      for (const f of [-0.75, 0, 0.75]) {
        const yy = oy + f * rE
        const xEnd = ox - Math.sqrt(Math.max(0, rE * rE - (f * rE) ** 2)) - 3
        ctx.moveTo(L.sunX + 10, yy)
        ctx.lineTo(xEnd, yy)
      }
      ctx.stroke()
      ctx.setLineDash([])
      if (!L.mini) {
        const lab = sunK > 0.5 ? 'SUN' : 'SUN · TIDE OFF'
        text(ctx, lab, L.sunX + 8, oy - Ro * 0.32 - 8, { size: 8.5, color: sunK > 0.5 ? C.ink2 : C.muted, tracking: 0.14 })
        if (!L.tight) text(ctx, '150 M KM →', L.sunX + 8, oy - Ro * 0.32 + 5, { size: 8, color: C.muted, tracking: 0.12, alpha: 0.8 })
      }
      ctx.restore()
    }

    // the Moon's orbit
    const orbA = ease.inOutCubic(clamp((T - 0.3) / 1.8))
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.arc(ox, oy, Ro, -Math.PI / 2, -Math.PI / 2 + TAU * orbA)
    ctx.stroke()
    ctx.setLineDash([])

    // the Moon's daily steps around the orbit, a tick for every day gone
    {
      const days = Math.floor(s.tau)
      if (days > 0) {
        ctx.strokeStyle = rgba(C.ink, 0.45)
        ctx.beginPath()
        for (let d = 1; d <= days; d++) {
          const a = moonAt(d)
          const len = d % 7 === 0 ? 7 : 4
          ctx.moveTo(ox + Math.cos(a) * (Ro - len), oy - Math.sin(a) * (Ro - len))
          ctx.lineTo(ox + Math.cos(a) * (Ro + len), oy - Math.sin(a) * (Ro + len))
        }
        ctx.stroke()
      }
    }

    // the Earth: paper disc, night side hatched, latitude rings, meridians turning
    const eA = ease.outCubic(clamp((T - 0.1) / 1.2))
    ctx.save()
    ctx.globalAlpha = A * eA
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(ox, oy, rE, 0, TAU)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.rect(ox, oy - rE - 1, rE + 1, rE * 2 + 2)
    ctx.clip()
    ctx.beginPath()
    ctx.arc(ox, oy, rE, 0, TAU)
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.22)
    hatchClip(L.tiny ? 2.6 : 3.4, -Math.PI / 4, ox - rE, oy - rE, rE * 2, rE * 2)
    ctx.restore()
    ctx.strokeStyle = rgba(C.ink, 0.18)
    ctx.setLineDash([1.5, 3])
    for (const lat of [30, 60]) {
      ctx.beginPath()
      ctx.arc(ox, oy, rE * Math.cos((lat * Math.PI) / 180), 0, TAU)
      ctx.stroke()
    }
    ctx.setLineDash([])
    const merA = 1 - fastness
    if (merA > 0.02) {
      ctx.strokeStyle = rgba(C.ink, 0.2 * merA)
      ctx.beginPath()
      for (let k = 0; k < 12; k++) {
        const a = s.psi + (k * TAU) / 12
        ctx.moveTo(ox + Math.cos(a) * rE * 0.5, oy - Math.sin(a) * rE * 0.5)
        ctx.lineTo(ox + Math.cos(a) * rE, oy - Math.sin(a) * rE)
      }
      ctx.stroke()
    }
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.arc(ox, oy, rE, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(ox, oy, 1.6, 0, TAU)
    ctx.fill()
    if (!L.tiny && rE > 34) text(ctx, 'N', ox + 4, oy - 4, { size: 8, color: C.muted })
    ctx.restore()

    // the tidal bulge: the lunar part dashed, the solar part dotted, the sum solid
    const bA = ease.inOutCubic(clamp((T - 1.6) / 2.2))
    const g = (rE * 0.17) / AM
    const compA = Math.max(smoothstep(34, 37, T) * (1 - smoothstep(63, 66, T)), dragging ? 0.8 : 0, Math.abs(sunK - (sunOn ? 1 : 0)) > 0.01 ? 0.8 : 0)
    const N = 120
    const bulgePath = (f: (phi: number) => number, upTo: number) => {
      ctx.beginPath()
      const n = Math.max(2, Math.round(N * upTo))
      for (let i = 0; i <= n; i++) {
        const phi = s.moon + (i / N) * TAU
        const rr = rE + g * f(phi)
        const x = ox + Math.cos(phi) * rr
        const y = oy - Math.sin(phi) * rr
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
    }
    if (bA > 0) {
      if (compA > 0.01) {
        ctx.save()
        ctx.globalAlpha = A * compA * 0.9
        ctx.strokeStyle = C.ocean
        ctx.setLineDash([4, 3])
        bulgePath((phi) => AM * P2(Math.cos(phi - s.moon)), 1)
        ctx.stroke()
        ctx.strokeStyle = C.fern
        ctx.setLineDash([1, 2.5])
        ctx.globalAlpha = A * compA * 0.9 * (0.25 + 0.75 * sunK)
        bulgePath((phi) => AS * P2(Math.cos(phi - SUN)), 1)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1.25
      bulgePath((phi) => bulgeAt(phi, s.moon, sunK), bA)
      ctx.stroke()
      ctx.lineWidth = 1
    }

    // the tidal force: the difference between the pull here and the pull at the centre
    const fA = Math.max(smoothstep(2.4, 4, T) * (1 - smoothstep(12.5, 14.5, T)), dragging ? 1 : 0)
    if (fA > 0.01 && rE > 18) {
      ctx.save()
      ctx.globalAlpha = A * fA
      ctx.strokeStyle = C.ink2
      ctx.beginPath()
      const len = rE * (L.tight ? 0.16 : 0.18)
      for (let k = 0; k < 16; k++) {
        const a = s.moon + (k * TAU) / 16
        const c = Math.cos(a - s.moon)
        // a = (GM/d³)(3 cosθ û − r̂)
        const vx = 3 * c * Math.cos(s.moon) - Math.cos(a)
        const vy = 3 * c * Math.sin(s.moon) - Math.sin(a)
        const x0 = ox + Math.cos(a) * rE
        const y0 = oy - Math.sin(a) * rE
        arrow(x0, y0, x0 + vx * len, y0 - vy * len, 3)
      }
      ctx.stroke()
      ctx.restore()
    }

    // the shore, turning with the Earth
    const shA = (1 - fastness * 0.85) * eA
    {
      const a = s.psi
      const x = ox + Math.cos(a) * rE
      const y = oy - Math.sin(a) * rE
      ctx.save()
      ctx.globalAlpha = A * shA
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * 6, y - Math.sin(a) * 6)
      ctx.lineTo(x + Math.cos(a + 1.9) * 3.5, y - Math.sin(a + 1.9) * 3.5)
      ctx.lineTo(x + Math.cos(a - 1.9) * 3.5, y - Math.sin(a - 1.9) * 3.5)
      ctx.closePath()
      ctx.fill()
      if (!L.mini && fastness < 0.5) {
        const lx = ox + Math.cos(a) * (rE + g * bulgeAt(a, s.moon, sunK) + 14)
        const ly = oy - Math.sin(a) * (rE + g * bulgeAt(a, s.moon, sunK) + 14)
        halo('A', lx, ly + 3, { size: 9, color: C.ink, align: 'center' })
      }
      ctx.restore()
    }

    // the Moon (lit towards the Sun) with its drag handle
    const mA = ease.outBack(clamp((T - 0.9) / 0.8))
    const mx = ox + Math.cos(s.moon) * Ro
    const my = oy - Math.sin(s.moon) * Ro
    if (mA > 0) {
      const rr = rM * mA
      ctx.fillStyle = C.paper
      ctx.beginPath()
      ctx.arc(mx, my, rr, 0, TAU)
      ctx.fill()
      ctx.save()
      ctx.beginPath()
      ctx.rect(mx, my - rr - 1, rr + 1, rr * 2 + 2)
      ctx.clip()
      ctx.beginPath()
      ctx.arc(mx, my, rr, 0, TAU)
      ctx.clip()
      ctx.strokeStyle = rgba(C.ink, 0.45)
      hatchClip(2, -Math.PI / 4, mx - rr, my - rr, rr * 2, rr * 2)
      ctx.restore()
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.arc(mx, my, rr, 0, TAU)
      ctx.stroke()
      if (!preview && (hoverMoon || dragging)) {
        ctx.strokeStyle = rgba(C.ocean, 0.8)
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.arc(mx, my, rr + (touch ? 12 : 7), 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
      }
      // the Earth–Moon line, faint
      ctx.strokeStyle = rgba(C.ocean, 0.22)
      ctx.beginPath()
      ctx.moveTo(ox + Math.cos(s.moon) * (rE + g * 0.42), oy - Math.sin(s.moon) * (rE + g * 0.42))
      ctx.lineTo(mx - Math.cos(s.moon) * (rr + 3), my + Math.sin(s.moon) * (rr + 3))
      ctx.stroke()
      if (!L.mini && Ro > 80) {
        const lab = dragging ? 'MOON · DRAGGING' : 'MOON'
        const sn = Math.sin(s.moon)
        if (Math.abs(sn) > 0.55) {
          const ly = my - Math.sign(sn) * (rr + 12)
          halo(lab, mx, ly + 3, { size: 8.5, color: C.ink, align: 'center', tracking: 0.14 })
        } else halo(lab, mx, my - rr - 8, { size: 8.5, color: C.ink, align: 'center', tracking: 0.14 })
      }
    }

    // annotation by chapter
    if (!L.mini) annotateOrbit(s, A, g)
    ctx.restore()
  }

  /** two short labels beside the Earth–Moon line, at its middle, clear of both bodies */
  function lineLabel(moon: number, lines: string[], colors: string[]) {
    const { ox, oy, Ro, rE } = L
    const rMid = (rE * 1.25 + Ro - L.rM) / 2
    const mx = ox + Math.cos(moon) * rMid
    const my = oy - Math.sin(moon) * rMid
    const horiz = Math.abs(Math.cos(moon)) > 0.6
    lines.forEach((ln, i) => {
      if (!ln) return
      const o = { size: i === 0 ? 9 : 8, color: colors[i], tracking: i === 0 ? 0.08 : 0.12 }
      if (horiz) halo(ln, mx, my - 9 + i * 22, { ...o, align: 'center' })
      else halo(ln, mx + 10, my - 2 + i * 12, { ...o, align: 'left' })
    })
  }

  function annotateOrbit(s: State, A: number, g: number) {
    const { ox, oy, Ro, rE } = L
    const T = s.T
    // I: the bulge, its exaggeration, the distance
    const a1 = smoothstep(3.6, 4.6, T) * (1 - smoothstep(13, 14.5, T))
    if (a1 > 0.01 && Ro > 80) {
      ctx.save()
      ctx.globalAlpha = A * a1
      const tipR = rE + g * bulgeAt(s.moon + Math.PI, s.moon, sunK)
      const tx = ox + Math.cos(s.moon + Math.PI) * tipR
      const ty = oy - Math.sin(s.moon + Math.PI) * tipR
      ctx.strokeStyle = rgba(C.ocean, 0.7)
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      const lx = ox - rE * 1.15
      const ly = oy + rE * 1.25
      ctx.lineTo(lx, ly)
      ctx.lineTo(lx - 10, ly)
      ctx.stroke()
      halo('TIDAL BULGE', lx - 14, ly + 3, { size: 8.5, color: C.ocean, align: 'right', tracking: 0.14 })
      if (!L.tight) halo('HEIGHT × 3 MILLION', lx - 14, ly + 15, { size: 8, color: C.muted, align: 'right', tracking: 0.12 })
      // F ∝ M / d³ on the Earth–Moon line
      if (Ro > 95) lineLabel(s.moon, ['F ∝ M / d³', L.tight ? '' : '384,400 KM · NOT TO SCALE'], [C.ink, C.muted])
      ctx.restore()
    }
    // III: the angle between Sun and Moon
    const a3 = smoothstep(35, 37, T) * (1 - smoothstep(63.5, 65.5, T))
    if (a3 > 0.01 || dragging) {
      const el = mod(s.moon - SUN, TAU)
      const near = Math.min(Math.abs(mod(el + Math.PI / 2, Math.PI) - Math.PI / 2), Math.PI / 2)
      const tag = near < 0.3 ? 'SPRING' : near > Math.PI / 2 - 0.3 ? 'NEAP' : ''
      ctx.save()
      ctx.globalAlpha = A * Math.max(a3, dragging ? 1 : 0)
      ctx.strokeStyle = rgba(C.ink, 0.45)
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(ox - Ro * 0.98, oy)
      ctx.lineTo(ox + Ro * 0.98, oy)
      ctx.stroke()
      ctx.setLineDash([])
      const ra = rE * 1.75
      ctx.strokeStyle = C.lagoon
      ctx.beginPath()
      // from the Sun's direction to the Moon's, the short way
      const d = mod(s.moon - SUN + Math.PI, TAU) - Math.PI
      ctx.arc(ox, oy, ra, -SUN, -(SUN + d), d > 0)
      ctx.stroke()
      const am = SUN + d / 2
      const deg = Math.round(Math.abs((d * 180) / Math.PI))
      const lx = ox + Math.cos(am) * (ra + 14)
      const ly = oy - Math.sin(am) * (ra + 14)
      if (Ro > 60) halo(`${deg}°${tag && Ro > 80 ? ' · ' + tag : ''}`, lx, ly + 3, { size: 9, color: C.lagoon, align: Math.cos(am) < 0 ? 'right' : 'left', tracking: 0.12 })
      if (!L.tight && a3 > 0.01) {
        const y0 = oy + Ro + L.rM + 18
        const limit = L.oneLine ? L.rulerY - 16 : L.capY - 4
        if (!L.stack && y0 + 14 < limit) {
          ctx.globalAlpha = A * a3
          text(ctx, 'SUN: 27 MILLION × THE MASS, 389 × THE DISTANCE', ox, y0, { size: 8, color: C.muted, align: 'center', tracking: 0.12 })
          text(ctx, 'M / d³ → 0.46 × THE MOON’S TIDE', ox, y0 + 12, { size: 8, color: C.muted, align: 'center', tracking: 0.12 })
        }
      }
      ctx.restore()
    }
    // IV: the Moon recedes
    const a4 = smoothstep(68.5, 70, T) * (1 - smoothstep(76, 77, T))
    if (a4 > 0.01) {
      ctx.save()
      ctx.globalAlpha = A * a4
      const mx = ox + Math.cos(s.moon) * Ro
      const my = oy - Math.sin(s.moon) * Ro
      const ux = Math.cos(s.moon)
      const uy = -Math.sin(s.moon)
      const p = L.rM + 6
      ctx.strokeStyle = C.lagoon
      ctx.beginPath()
      arrow(mx + ux * p, my + uy * p, mx + ux * (p + 14), my + uy * (p + 14), 3.5)
      ctx.stroke()
      if (Ro > 95) lineLabel(s.moon, ['RECEDING', '3.8 CM A YEAR'], [C.lagoon, C.lagoon])
      else halo('3.8 CM / YR', mx, my - L.rM - 9, { size: 8, color: C.lagoon, align: 'center', tracking: 0.12 })
      ctx.restore()
    }
  }

  /* ------------------------------------------------------------ the beach */

  function drawBeach(s: State, A: number, T: number, rt: number) {
    const { bx, by, bw, bh } = L
    const yMSL = by + bh * 0.6
    const S = bh * 0.36
    const yOf = (z: number) => yMSL - z * S
    const xOf = (u: number) => bx + u * bw
    const eta = s.eta
    const yW = yOf(eta)
    const n = Math.max(60, Math.round(bw / 4))
    const reveal = ease.inOutCubic(clamp((T - 0.2) / 2.2))
    ctx.save()
    ctx.globalAlpha = A
    ctx.lineWidth = 1
    ctx.save()
    ctx.beginPath()
    ctx.rect(bx, by, bw * reveal + 1, bh)
    ctx.clip()

    // water: a pale wash and the draughtsman's horizontal dashes
    const swell = surfEnv(rt)
    ctx.fillStyle = rgba(C.sky, 0.1)
    ctx.fillRect(bx, yW, bw, by + bh - yW)
    ctx.strokeStyle = rgba(C.ocean, 0.22)
    ctx.setLineDash([6, 7])
    ctx.beginPath()
    const step = L.tight ? 7 : 9
    for (let y = yW + step; y < by + bh; y += step) {
      const off = ((y * 7.3) % 13) + rt * 4
      ctx.lineDashOffset = -off
      ctx.moveTo(bx, y)
      ctx.lineTo(bx + bw, y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0

    // the ground: cover the water under the sand, stipple, rock hatching
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.moveTo(bx, by + bh)
    for (let i = 0; i <= n; i++) {
      const u = i / n
      ctx.lineTo(xOf(u), yOf(ground(u)))
    }
    ctx.lineTo(bx + bw, by + bh)
    ctx.closePath()
    ctx.fill()
    // sand grains below the profile
    ctx.fillStyle = rgba(C.ink, 0.35)
    for (let i = 0; i < GRAINS; i++) {
      const u = grainU[i]
      if (u > ROCK0 + 0.01 && u < ROCK1 - 0.01) continue
      const gy = yOf(ground(u))
      const y = gy + 2 + grainV[i] * (by + bh - gy - 2)
      if (y > by + bh - 1) continue
      ctx.fillRect(xOf(u), y, 0.9, 0.9)
    }
    // the rock ledge, hatched
    ctx.save()
    ctx.beginPath()
    for (let i = 0; i <= 40; i++) {
      const u = lerp(ROCK0, ROCK1, i / 40)
      const y = yOf(Math.max(rock(u), sand(u) - 0.14))
      if (i) ctx.lineTo(xOf(u), y)
      else ctx.moveTo(xOf(u), y)
    }
    for (let i = 40; i >= 0; i--) {
      const u = lerp(ROCK0, ROCK1, i / 40)
      ctx.lineTo(xOf(u), yOf(sand(u) - 0.14 - 0.05 * Math.sin((i / 40) * Math.PI)))
    }
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.3)
    hatchClip(L.tight ? 3.5 : 4.5, -Math.PI / 4, xOf(ROCK0), yOf(0.4), bw * (ROCK1 - ROCK0), bh)
    ctx.restore()

    // wet sand: between the water's edge and the last high water
    const hiRecent = highWater(s, 0.55)
    if (hiRecent > eta + 0.005) {
      ctx.fillStyle = rgba(C.ink, 0.5)
      for (let i = 0; i < WET; i++) {
        const u = 0.2 + wetU[i] * 0.55
        const z = ground(u)
        if (z > hiRecent || z < eta) continue
        if (rock(u) > -9 && rock(u) >= z - 0.001) continue
        const y = yOf(z) + 1.5 + wetV[i] * 5
        ctx.fillRect(xOf(u), y, 1.1, 1.1)
      }
      // the damp surface, a second hairline just under the profile
      ctx.strokeStyle = rgba(C.ink, 0.3)
      ctx.beginPath()
      let on = false
      for (let i = 0; i <= n; i++) {
        const u = i / n
        const z = ground(u)
        if (u < 0.2 || u > 0.75 || z > hiRecent || z < eta || (rock(u) > -9 && rock(u) >= sand(u))) {
          on = false
          continue
        }
        const y = yOf(z) + 2
        if (on) ctx.lineTo(xOf(u), y)
        else ctx.moveTo(xOf(u), y)
        on = true
      }
      ctx.stroke()
      // the line itself: where the last high water reached the beach
      const uHi = 0.2 + (0.62 - hiRecent) / 2.1
      if (uHi > 0.2 && uHi < 0.72) {
        const x = xOf(uHi)
        const y = yOf(ground(uHi))
        ctx.strokeStyle = rgba(C.ink, 0.65)
        ctx.beginPath()
        ctx.moveTo(x, y - 1)
        ctx.lineTo(x, y + 6)
        ctx.stroke()
        if (!L.mini && bh > 140 && s.rate < 0.4) {
          ctx.strokeStyle = rgba(C.ink, 0.35)
          ctx.setLineDash([1, 2.5])
          ctx.beginPath()
          ctx.moveTo(x, y - 2)
          ctx.lineTo(x, y - (L.tight ? 16 : 24))
          ctx.stroke()
          ctx.setLineDash([])
          halo(L.tight ? 'WET LINE' : 'LAST HIGH WATER', x + 4, y - (L.tight ? 16 : 24), { size: 8, color: C.ink2, tracking: 0.12 })
        }
      }
    }
    // the strandline: wrack left by the highest water so far this month
    {
      let hiMonth = -1
      for (let i = 0; i <= 60; i++) {
        const tt = (s.tau * i) / 60
        hiMonth = Math.max(hiMonth, etaShore(psiAt(tt), moonAt(tt), sunK))
      }
      hiMonth = Math.max(hiMonth, hiRecent)
      const uS = 0.2 + (0.62 - hiMonth) / 2.1
      if (uS > 0.2 && uS < 0.5) {
        ctx.strokeStyle = rgba(C.moss, 0.8)
        ctx.beginPath()
        for (let k = -3; k <= 3; k++) {
          const uu = uS + k * 0.004
          const x = xOf(uu)
          const y = yOf(ground(uu)) - 0.5
          ctx.moveTo(x - 2, y)
          ctx.quadraticCurveTo(x, y - 2.5 - (k % 2) * 1.2, x + 2, y)
        }
        ctx.stroke()
      }
    }

    // the profile line
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const x = xOf(u)
      const y = yOf(ground(u))
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()

    // the tidepool: full to its rim when the sea is below it
    if (eta < RIM) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(xOf(POOL0), yOf(RIM))
      for (let i = 0; i <= 24; i++) {
        const u = lerp(POOL0, POOL1, i / 24)
        ctx.lineTo(xOf(u), yOf(Math.min(RIM, ground(u))))
      }
      ctx.closePath()
      ctx.fillStyle = rgba(C.sky, 0.16)
      ctx.fill()
      ctx.clip()
      ctx.strokeStyle = rgba(C.ocean, 0.3)
      ctx.beginPath()
      for (let y = yOf(RIM) + 3; y < yOf(RIM - 0.2); y += 3) {
        ctx.moveTo(xOf(POOL0), y)
        ctx.lineTo(xOf(POOL1), y)
      }
      ctx.stroke()
      ctx.restore()
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      ctx.moveTo(xOf(POOL0 + 0.004), yOf(RIM))
      ctx.lineTo(xOf(POOL1 - 0.004), yOf(RIM))
      ctx.stroke()
    }
    // an anemone and a periwinkle in the pool
    {
      const ax = xOf(0.5)
      const ay = yOf(ground(0.5))
      ctx.strokeStyle = C.moss
      ctx.beginPath()
      for (let k = -3; k <= 3; k++) {
        const a = -Math.PI / 2 + k * 0.32 + Math.sin(rt * 1.3 + k) * (eta > RIM ? 0.12 : 0.04)
        ctx.moveTo(ax, ay - 1)
        ctx.lineTo(ax + Math.cos(a) * 5, ay - 1 + Math.sin(a) * 5)
      }
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(xOf(0.485), yOf(ground(0.485)) - 1.6, 1.6, Math.PI, 0)
      ctx.stroke()
    }

    // the water surface, only where it is above the ground
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.2
    ctx.beginPath()
    let pen = false
    let shore = -1
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const ripple = Math.sin(u * 60 - rt * 2.2) * 0.6 + noise.n2(u * 9, rt * 0.4) * 0.8
      const y = yW + ripple * (u > 0.75 ? 1 : 0.7)
      const gz = yOf(ground(u))
      if (y < gz - 0.5) {
        if (!pen) {
          ctx.moveTo(xOf(u), Math.min(y, gz))
          if (shore < 0 && u < 0.75) shore = u
          pen = true
        } else ctx.lineTo(xOf(u), y)
      } else pen = false
    }
    ctx.stroke()
    ctx.lineWidth = 1

    // swash: the broken wave running up the beach and back
    {
      const uS = 0.2 + (0.62 - eta) / 2.1
      if (uS > 0.2 && uS < 0.72) {
        const run = swell * (L.tight ? 0.028 : 0.035)
        ctx.strokeStyle = rgba(C.ocean, 0.55)
        ctx.beginPath()
        const k0 = Math.round(uS * n)
        const k1 = Math.round((uS - run) * n)
        for (let k = k0; k >= k1; k--) {
          const u = k / n
          const x = xOf(u)
          const y = yOf(ground(u)) - 0.8
          if (k === k0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        // foam dots at the leading edge
        ctx.fillStyle = rgba(C.ocean, 0.6)
        for (let k = 0; k < 5; k++) {
          const u = uS - run + k * 0.004
          ctx.fillRect(xOf(u), yOf(ground(u)) - 2.2 - (k % 2), 1, 1)
        }
        // a wave crest coming in
        ctx.strokeStyle = rgba(C.ocean, 0.5)
        ctx.beginPath()
        for (let q = 0; q < 2; q++) {
          const ph = mod(rt / 7.3 + q * 0.5, 1)
          const u = lerp(0.98, uS + 0.03, ph)
          if (u < uS + 0.02) continue
          const x = xOf(u)
          const hh = 2.4 * (1 - ph * 0.5)
          ctx.moveTo(x - 7, yW)
          ctx.quadraticCurveTo(x - 2, yW - hh * 1.5, x + 3, yW - 0.3)
        }
        ctx.stroke()
      }
    }

    // the boat on its mooring
    drawBoat(s, yOf, xOf, rt)

    // the tide staff
    {
      const u = 0.72
      const x = xOf(u)
      const y0 = yOf(ground(u))
      const yTop = yOf(0.5)
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(x, y0)
      ctx.lineTo(x, yTop)
      ctx.moveTo(x + 3, y0)
      ctx.lineTo(x + 3, yTop)
      ctx.stroke()
      ctx.strokeStyle = rgba(C.ink, 0.7)
      ctx.beginPath()
      for (let cm = -40; cm <= 40; cm += 10) {
        const y = yOf(cm / 100)
        if (y > y0 - 1) continue
        const major = cm % 20 === 0
        ctx.moveTo(x + 3, y)
        ctx.lineTo(x + 3 + (major ? 6 : 3), y)
      }
      ctx.stroke()
      if (!L.mini) {
        for (const cm of [40, 20, 0, -20]) {
          const y = yOf(cm / 100)
          if (y > y0 - 6) continue
          halo(cm === 0 ? '0' : String(cm), x + 12, y + 3, { size: 7.5, color: C.muted, tracking: 0.06 })
        }
      }
      // the reading
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.moveTo(x - 1, yW)
      ctx.lineTo(x - 7, yW - 3.5)
      ctx.lineTo(x - 7, yW + 3.5)
      ctx.closePath()
      ctx.fill()
      if (!L.mini) halo(`${signed(eta * 100)} CM`, x - 10, yW - 6, { size: 8.5, color: C.ocean, align: 'right', tracking: 0.08 })
    }

    // marram on the dune, a fence post, a few gulls
    {
      ctx.strokeStyle = rgba(C.moss, 0.75)
      ctx.beginPath()
      for (const gr of grass) {
        const x = xOf(gr.u)
        const y = yOf(ground(gr.u))
        const hh = bh * 0.07 * gr.h
        const sw = Math.sin(rt * 0.9 + gr.ph) * 0.12
        for (let k = -1; k <= 1; k++) {
          const a = -Math.PI / 2 + gr.lean + k * 0.22 + sw
          ctx.moveTo(x, y)
          ctx.quadraticCurveTo(x + Math.cos(a) * hh * 0.5, y + Math.sin(a) * hh * 0.6, x + Math.cos(a + sw) * hh, y + Math.sin(a) * hh)
        }
      }
      ctx.stroke()
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      for (const gu of gulls) {
        if (L.tiny) break
        const x = xOf(gu.u + Math.sin(rt * 0.07 + gu.ph) * 0.05)
        const y = by + bh * gu.v + Math.sin(rt * 0.5 + gu.ph) * 2
        const s2 = 4 * gu.s
        const flap = Math.sin(rt * 3 + gu.ph) * 0.35
        ctx.moveTo(x - s2, y - s2 * (0.3 + flap))
        ctx.quadraticCurveTo(x - s2 * 0.4, y - s2 * 0.5, x, y)
        ctx.quadraticCurveTo(x + s2 * 0.4, y - s2 * 0.5, x + s2, y - s2 * (0.3 + flap))
      }
      ctx.stroke()
    }

    ctx.restore()

    // panel frame, labels, the Moon's phase in the sky
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw), Math.round(bh))
    if (!L.mini) {
      text(ctx, bw < 520 ? 'SECTION · SHORE A' : 'SECTION AT SHORE A · EQUILIBRIUM TIDE', bx + 8, by + 14, { size: 8, color: C.muted, tracking: 0.14 })
      if (!L.tight) text(ctx, 'HEIGHTS EXAGGERATED', bx + 8, by + 26, { size: 7.5, color: C.muted, tracking: 0.14, alpha: 0.75 })
    }
    {
      const el = s.moon - SUN
      const rr = L.tiny ? 6 : L.tight ? 8 : 11
      const mx = bx + bw - rr - (L.tiny ? 8 : 14)
      const my = by + rr + (L.tiny ? 8 : 12)
      moonGlyph(mx, my, rr, el, C.ink)
      if (!L.mini && bw > 300) {
        const illum = Math.round(((1 - Math.cos(el)) / 2) * 100)
        text(ctx, phaseName(el), mx - rr - 8, my - 1, { size: 8, color: C.ink2, align: 'right', tracking: 0.14 })
        text(ctx, `${illum}% LIT`, mx - rr - 8, my + 10, { size: 8, color: C.muted, align: 'right', tracking: 0.12 })
      }
    }
    // the next tides (when time runs slow enough to read them)
    if (!L.mini && bh > 150 && s.rate < 0.3 && !dragging) {
      const nt = nextTides(s)
      const a2 = 1 - smoothstep(0.18, 0.3, s.rate)
      const yy = by + bh - 10
      const lines = [nt.hw > 0 ? `NEXT HIGH WATER ${fmtClock(nt.hw)}` : '', nt.lw > 0 ? `NEXT LOW WATER ${fmtClock(nt.lw)}` : '']
      ctx.save()
      ctx.globalAlpha = A * a2
      if (lines[0]) halo(lines[0], bx + bw - 10, yy - 12, { size: 8, color: C.ink2, align: 'right', tracking: 0.12 })
      if (lines[1]) halo(lines[1], bx + bw - 10, yy, { size: 8, color: C.ink2, align: 'right', tracking: 0.12 })
      ctx.restore()
    }
    ctx.restore()
  }

  function drawBoat(s: State, yOf: (z: number) => number, xOf: (u: number) => number, rt: number) {
    const S = L.bh * 0.36
    const ax = xOf(MOOR_U)
    const ay = yOf(ground(MOOR_U))
    const surf = yOf(s.eta)
    const depth = (ay - surf) / S
    const rope = 1.05
    const draft = 0.17
    // the current: flooding shoreward (left) while the tide rises
    const cur = Math.tanh((s.detadt / (TAU * 2 * 0.75 * AM)) * 3)
    const horiz = Math.sqrt(Math.max(0, rope * rope - (depth - draft * 0.4) ** 2)) * S * 0.25
    const bowX = ax - cur * horiz
    const len = Math.max(18, L.bw * 0.06)
    const hullH = Math.max(5, S * 0.12)
    // the bow points into the current, toward the mooring; at slack water the boat swings
    // through end-on, so in section it foreshortens
    const facing = cur >= 0 ? 1 : -1
    const fore = 0.28 + 0.72 * Math.abs(cur)
    const lenA = len * fore
    // afloat or aground
    const bottomAtBoat = (x: number) => yOf(ground(clamp((x - L.bx) / L.bw)))
    let keelY = surf + draft * S * 0.6
    const cx = bowX - facing * lenA * 0.5
    const floor = Math.min(bottomAtBoat(cx - lenA * 0.3), bottomAtBoat(cx), bottomAtBoat(cx + lenA * 0.3))
    let tilt = 0
    const aground = keelY > floor
    if (aground) {
      tilt = clamp((keelY - floor) / (hullH * 2), 0, 1) * 0.12 * facing
      keelY = floor
    }
    const bob = aground ? 0 : Math.sin(rt * 1.4) * 0.6
    ctx.save()
    ctx.translate(cx, keelY - hullH + bob)
    ctx.rotate(tilt)
    ctx.save()
    ctx.scale(facing * fore, 1)
    // hull: deck, raked bow, keel, transom
    ctx.strokeStyle = C.ink
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.moveTo(-len / 2, 0)
    ctx.lineTo(len / 2, 0)
    ctx.quadraticCurveTo(len * 0.42, hullH * 0.85, len * 0.27, hullH)
    ctx.lineTo(-len * 0.34, hullH)
    ctx.quadraticCurveTo(-len * 0.47, hullH * 0.6, -len / 2, 0)
    ctx.closePath()
    ctx.fill()
    ctx.lineWidth = 1 / Math.max(0.3, fore)
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.3)
    hatchClip(2.5, -Math.PI / 4, -len / 2, 0, len, hullH)
    ctx.restore()
    ctx.restore()
    // mast, boom and forestay (the mast stays upright as she swings)
    const mast = hullH * 4.2
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(facing * lenA * 0.02, 0)
    ctx.lineTo(facing * lenA * 0.02, -mast)
    ctx.moveTo(facing * lenA * 0.02, -mast * 0.18)
    ctx.lineTo(-facing * lenA * 0.4, -mast * 0.12)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.beginPath()
    ctx.moveTo(facing * lenA * 0.02, -mast)
    ctx.lineTo(facing * lenA * 0.48, 0)
    ctx.stroke()
    ctx.restore()
    // the mooring rope, sagging when slack, and the mooring block
    const bx = cx + facing * lenA * 0.5
    const byy = keelY - hullH * 0.9 + bob
    const dist = Math.hypot(bx - ax, byy - ay)
    const sag = Math.min(S * 0.25, Math.max(0, rope * S - dist) * 0.5)
    ctx.strokeStyle = rgba(C.ink, 0.7)
    ctx.beginPath()
    ctx.moveTo(ax, ay - 2)
    ctx.quadraticCurveTo((ax + bx) / 2 + sag * 0.2 * facing, Math.min((ay + byy) / 2 + sag, ay - 2), bx, byy)
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.fillRect(ax - 3, ay - 3, 6, 3)
  }

  /* ------------------------------------------------------------ the chart */

  function chartRange(T: number) {
    const a = ease.inOutCubic(smoothstep(15, 21, T))
    const b = ease.inOutCubic(smoothstep(31.5, 39.5, T))
    return lerp(lerp(1.25, 3.5, a), MONTH, b)
  }

  function drawChart(s: State, A: number, T: number) {
    const { gx, gy, gw, gh } = L
    const X = Math.max(chartRange(T), s.tau * 1.02)
    const yMid = gy + gh / 2
    const glyphR = L.tiny ? 3.5 : L.tight ? 4.5 : 5.5
    const margin = glyphR * 2 + 6
    const sy = (gh / 2 - margin) / 0.4
    const xOf = (tau: number) => gx + (tau / X) * gw
    const yOf = (eta: number) => yMid - eta * sy
    const reveal = ease.inOutCubic(clamp((T - 0.6) / 1.6))
    ctx.save()
    ctx.globalAlpha = A
    ctx.lineWidth = 1
    // frame: baseline (mean level), the paper edges
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    ctx.moveTo(gx, gy + 0.5)
    ctx.lineTo(gx + gw * reveal, gy + 0.5)
    ctx.moveTo(gx, gy + gh + 0.5)
    ctx.lineTo(gx + gw * reveal, gy + gh + 0.5)
    ctx.stroke()
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(gx, yMid)
    ctx.lineTo(gx + gw * reveal, yMid)
    ctx.stroke()
    ctx.setLineDash([])
    // time ticks
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    const hourly = X < 5
    const tickStep = hourly ? 0.125 : 1
    for (let tt = 0; tt <= X + 1e-6; tt += tickStep) {
      const x = xOf(tt)
      if (x > gx + gw * reveal) break
      const major = hourly ? Math.abs(tt - Math.round(tt)) < 1e-6 : Math.round(tt) % 7 === 0
      ctx.moveTo(x, gy + gh)
      ctx.lineTo(x, gy + gh - (major ? 6 : 3))
    }
    ctx.stroke()
    if (!L.tiny) {
      if (hourly) {
        for (let tt = 0; tt <= X + 1e-6; tt += X < 2 ? 0.25 : 0.5) {
          const x = xOf(tt)
          if (x > gx + gw - 20) break
          text(ctx, fmtClock(tt), x, gy + gh + 11, { size: 7.5, color: C.muted, align: 'center', tracking: 0.08 })
        }
      } else {
        for (let d = 0; d <= X; d += 7) {
          const x = xOf(d)
          text(ctx, d === 0 ? 'DAY 0' : String(d), x, gy + gh + 11, { size: 7.5, color: C.muted, align: d === 0 ? 'left' : 'center', tracking: 0.08 })
        }
      }
      // vertical scale
      if (!L.mini) for (const cm of [30, -30]) text(ctx, signed(cm), gx - 4, yOf(cm / 100) + 3, { size: 7.5, color: C.muted, align: 'right', tracking: 0.06 })
    }
    const head = L.mini || gw < 420 ? 'TIDE GAUGE' : `TIDE GAUGE · SHORE A · ${hourly ? 'HOURS' : 'DAYS'} →`
    text(ctx, head, gx, gy - (L.tiny ? 5 : 8), { size: L.tiny ? 7.5 : 8, color: C.muted, tracking: 0.14 })
    const headW = measure(head, L.tiny ? 7.5 : 8)

    // the Moon's quarters along the top
    for (let q = 0; q < QUARTERS.length; q++) {
      const tq = QUARTERS[q]
      if (tq > X + 0.01) continue
      const x = xOf(tq)
      const seen = s.tau >= tq - 0.3
      ctx.save()
      ctx.globalAlpha = A * (seen ? 1 : 0.35)
      moonGlyph(clamp(x, gx + glyphR + 1, gx + gw - glyphR - 1), gy + margin / 2, glyphR, (q * Math.PI) / 2, C.ink)
      ctx.restore()
    }

    // spring/neap envelope, faint
    const n = Math.round(clamp(gw * 1.6, 200, 1600))
    const tauEnd = s.tau
    ctx.strokeStyle = rgba(C.lagoon, 0.5)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    const envN = 80
    for (let sign = -1; sign <= 1; sign += 2) {
      for (let i = 0; i <= envN; i++) {
        const tt = (tauEnd * i) / envN
        const amp = ampFor(moonAt(tt), sunK)
        const x = xOf(tt)
        const y = yOf(sign * amp)
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
    }
    ctx.stroke()
    ctx.setLineDash([])
    // without the Sun: the lunar tide alone, for comparison
    if (sunK < 0.98 || !sunOn) {
      ctx.save()
      ctx.globalAlpha = A * 0.6 * (1 - sunK)
      ctx.strokeStyle = C.fern
      ctx.setLineDash([1, 3])
      ctx.beginPath()
      for (let i = 0; i <= envN; i++) {
        const tt = (tauEnd * i) / envN
        const amp = ampFor(moonAt(tt), 1)
        if (i) ctx.lineTo(xOf(tt), yOf(amp))
        else ctx.moveTo(xOf(tt), yOf(amp))
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // the trace
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    const m = Math.max(2, Math.ceil((n * tauEnd) / X))
    for (let i = 0; i <= m; i++) {
      const tt = (tauEnd * i) / m
      const v = etaShore(psiAt(tt), moonAt(tt), sunK)
      if (i) ctx.lineTo(xOf(tt), yOf(v))
      else ctx.moveTo(xOf(tt), yOf(v))
    }
    ctx.stroke()
    // the pen
    const px = xOf(tauEnd)
    const pv = etaShore(psiAt(tauEnd), moonAt(tauEnd), sunK)
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    ctx.moveTo(px, gy)
    ctx.lineTo(px, gy + gh)
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.arc(px, yOf(pv), 2.2, 0, TAU)
    ctx.fill()
    if (dragging || Math.abs(moonOff) > 0.01) {
      // where the dragged Moon would put the water
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      ctx.arc(px, yOf(s.eta), 4, 0, TAU)
      ctx.stroke()
    }

    // spring and neap, labelled as the pen passes them
    const roomQ = (gw * (MONTH / 4)) / X
    if (!L.tiny && X > 8 && roomQ > measure('SPRING', 7.5) + glyphR * 2 + 12) {
      for (let q = 0; q < QUARTERS.length; q++) {
        const tq = QUARTERS[q]
        if (tq > tauEnd + 0.01) continue
        const spring = q % 2 === 0
        const x = clamp(xOf(tq), gx + glyphR + 1, gx + gw - glyphR - 1)
        const al = clamp((tauEnd - tq) / 0.8 + 0.4) * sunK
        if (al <= 0.01) continue
        const lab = spring ? 'SPRING' : 'NEAP'
        const right = x + glyphR + 5 + measure(lab, 7.5) < gx + gw
        ctx.save()
        ctx.globalAlpha = A * al
        halo(lab, right ? x + glyphR + 5 : x - glyphR - 5, gy + margin / 2 + 3, { size: 7.5, color: C.lagoon, align: right ? 'left' : 'right', tracking: 0.14 })
        ctx.restore()
      }
    }
    // the two extremes of the month, once the month is in view
    const rlab = sunK > 0.5 ? `SPRINGS ${SPRING_RANGE.toFixed(2)} M · NEAPS ${NEAP_RANGE.toFixed(2)} M` : `MOON ALONE ${(3 * AM * 0.5).toFixed(2)} M EVERY DAY`
    if (!L.tiny && X > 20 && measure(rlab, 8) + headW + 24 < gw) {
      const al = smoothstep(37, 39, T)
      const lab = rlab
      text(ctx, lab, gx + gw, gy - (L.tiny ? 5 : 8), { size: 8, color: C.lagoon, align: 'right', tracking: 0.12, alpha: al })
    }
    // chapter II: the interval between two high waters, measured from the record
    const a2 = smoothstep(19, 21, T) * (1 - smoothstep(30.5, 32.5, T))
    if (a2 > 0.01 && !L.mini) {
      const hws: number[] = []
      let pv0 = etaShore(psiAt(0), moonAt(0), sunK)
      let up = true
      for (let i = 1; i <= 2000 && hws.length < 6; i++) {
        const tt = (i / 2000) * 3.4
        if (tt > tauEnd) break
        const v = etaShore(psiAt(tt), moonAt(tt), sunK)
        if (up && v < pv0) hws.push(tt - 3.4 / 2000)
        up = v >= pv0
        pv0 = v
      }
      if (hws.length >= 3) {
        const i0 = hws.length - 3
        const t0 = hws[i0]
        const t1 = hws[i0 + 1]
        const t2 = hws[i0 + 2]
        ctx.save()
        ctx.globalAlpha = A * a2
        ctx.strokeStyle = C.ocean
        const yTop = gy + 10
        dimLine(xOf(t0), xOf(t1), yTop, fmtDur(t1 - t0))
        ctx.restore()
        if (!L.tight) {
          ctx.save()
          ctx.globalAlpha = A * a2 * 0.8
          ctx.strokeStyle = C.ink2
          dimLine(xOf(t0), xOf(t2), gy + gh - 12, `TWO TIDES ${fmtDur(t2 - t0)}`)
          ctx.restore()
        }
      }
    }
    ctx.restore()
  }

  function dimLine(x0: number, x1: number, y: number, label: string) {
    ctx.beginPath()
    ctx.moveTo(x0, y - 4)
    ctx.lineTo(x0, y + 4)
    ctx.moveTo(x1, y - 4)
    ctx.lineTo(x1, y + 4)
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    ctx.moveTo(x0 + 4, y - 2.5)
    ctx.lineTo(x0, y)
    ctx.lineTo(x0 + 4, y + 2.5)
    ctx.moveTo(x1 - 4, y - 2.5)
    ctx.lineTo(x1, y)
    ctx.lineTo(x1 - 4, y + 2.5)
    ctx.stroke()
    halo(label, (x0 + x1) / 2, y - 5, { size: 8, color: ctx.strokeStyle as string, align: 'center', tracking: 0.1 })
  }

  /* -------------------------------------------------------------- chrome */

  function captionAt(T: number) {
    if (preview) return
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const size = L.capSize
      const lines: { s: string; em: string }[] = L.oneLine ? [{ s: cap.a, em: cap.em }] : [{ s: cap.a.trim(), em: '' }, { s: '', em: cap.em }]
      // shrink to fit the width
      let fs = size
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

  function chrome(s: State, T: number) {
    const { pad } = L
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    const ks = L.tiny ? 8.5 : L.tight ? 9 : 10
    text(ctx, `${FIG} — TIDE`, pad, pad + 9, { size: ks, color: C.muted, tracking: 0.16 })
    if (!preview) {
      const c = CHAPTERS[ch]
      const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
      text(ctx, `${c.num} — ${c.name}`, pad, pad + 9 + (L.tiny ? 12 : 15), { size: ks, color: C.ink2, tracking: 0.16, upper: true, alpha: kIn })
    }
    // readouts, top right
    const items: [string, string][] = [
      ['Day', s.tau.toFixed(1)],
      ['Shore time', fmtClock(s.tau)],
      ['Level', `${signed(s.eta * 100)} cm`],
      ['Range', `${(s.amp * 2).toFixed(2)} m`],
      ['Sun', sunK > 0.5 ? 'on' : 'off'],
    ]
    if (T >= 15 && T < 33) items.splice(2, 0, ['Lunar day', fmtDur(LUNAR_DAY).toLowerCase()])
    if (preview) items.splice(1, 1)
    if (L.mini) items.splice(-1, 1)
    const kickW = Math.max(measure(`${FIG} — TIDE`, ks), preview ? 0 : measure(`${CHAPTERS[ch].num} — ${CHAPTERS[ch].name}`.toUpperCase(), ks)) + 24
    const avail = L.hudRow ? w - pad * 2 : w - pad * 2 - kickW
    const size = L.hudSize
    const gap = L.tight ? 14 : 22
    const widthOf = (its: [string, string][]) =>
      its.reduce((acc, [l, v]) => acc + Math.max(measure(l.toUpperCase(), 8.5), measure(v, size)) + gap, -gap)
    let shown = items.slice()
    while (shown.length > 1 && widthOf(shown) > avail) shown = shown.slice(0, -1)
    let x = L.hudRow ? pad : w - pad - widthOf(shown)
    const hy = L.hudRow ? pad + 40 : pad + 7
    for (const [l, v] of shown) {
      const wd = Math.max(measure(l.toUpperCase(), 8.5), measure(v, size))
      text(ctx, l, x, hy, { size: 8.5, color: C.muted, tracking: 0.14, upper: true })
      text(ctx, v, x, hy + size + 3, { size, color: C.ink, tracking: 0.04 })
      x += wd + gap
    }

    // chapter ruler, bottom
    if (!preview) {
      const x0 = pad
      const x1 = w - pad
      const yb = L.rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = C.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 39; i++) {
        const xx = lerp(x0, x1, i / 39)
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
      if (w > 360) {
        CHAPTERS.forEach((cc, i) => {
          const xx = lerp(x0, x1, cc.t / LOOP)
          text(ctx, cc.num, xx + 4, yb - 7, { size: 8.5, color: i === ch ? C.ink : C.muted, tracking: 0.1 })
        })
      }
      if (hoverX >= 0) {
        const hx = clamp(hoverX, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c, i) => (ht >= c.t ? i : acc), 0)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · DAY ${tauAt(ht).toFixed(1)}`, clamp(hx, x0 + 40, x1 - 40), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12 })
      }
    }
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.lineWidth = 1
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, L.tiny ? 6 : 9)
  }

  /** the ghost: how to drag the Moon, early in full mode */
  function ghost(s: State, T: number) {
    if (preview || used) return
    const g0 = 4.2
    const g1 = 9.4
    if (T < g0 || T > g1) return
    const u = (T - g0) / (g1 - g0)
    const a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.86, 1, u))
    const { ox, oy, Ro } = L
    const start = s.moon
    const end = s.moon + 1.6
    const cur = lerp(start, end, ease.inOutSine(clamp((u - 0.1) / 0.75)))
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = rgba(C.ocean, 0.7)
    ctx.setLineDash([1.5, 3.5])
    ctx.beginPath()
    ctx.arc(ox, oy, Ro + (L.tiny ? 8 : 12), -start, -cur, true)
    ctx.stroke()
    ctx.setLineDash([])
    const gx = ox + Math.cos(cur) * (Ro + (L.tiny ? 8 : 12))
    const gy = oy - Math.sin(cur) * (Ro + (L.tiny ? 8 : 12))
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(gx, gy, 3.5, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    ctx.arc(gx, gy, 9, 0, TAU)
    ctx.stroke()
    const label = touch || L.tight ? 'DRAG THE MOON' : 'DRAG THE MOON · TAP FOR THE SUN'
    const right = Math.cos(cur) > -0.3
    halo(L.tiny ? 'DRAG' : label, gx + (right ? 14 : -14), gy + 3, { size: 9, color: C.ocean, align: right ? 'left' : 'right', tracking: 0.14 })
    ctx.restore()
  }

  /** a prompt for the Sun, in chapter III, until it has been tried */
  function sunHint(T: number) {
    if (preview || sunUsed || L.tiny) return
    const a = smoothstep(41, 42, T) * (1 - smoothstep(55, 56, T))
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    const small = L.Ro < 90
    const lab = small ? 'TAP · SUN' : touch ? 'TAP · SUN ON / OFF' : 'CLICK · TAKE THE SUN AWAY'
    halo(lab, L.sunX + 8, L.oy + L.Ro * (small ? 0.75 : 0.32) + 14, { size: 8.5, color: C.ocean, tracking: 0.14 })
    ctx.restore()
  }

  /* ---------------------------------------------------------------- sound */

  let surf: { src: AudioBufferSourceNode; hi: BiquadFilterNode; g: GainNode; lo: GainNode; ctx: AudioContext } | null = null
  /** a breaking wave's envelope over real time, 0..1 */
  function surfEnv(rt: number) {
    const p = mod(rt / 7.3 + 0.08 * Math.sin(rt * 0.21), 1)
    return p < 0.2 ? ease.inOutSine(p / 0.2) : Math.exp(-(p - 0.2) * 4.2)
  }
  function surfStop() {
    if (!surf) return
    try {
      surf.src.stop()
    } catch {
      /* already stopped */
    }
    surf = null
  }
  function surfUpdate(s: State, rt: number, A: number) {
    const ac = sfx.context()
    const out = sfx.output()
    if (!ac || !out) {
      surfStop()
      return
    }
    if (!surf || surf.ctx !== ac) {
      surfStop()
      const len = ac.sampleRate * 3
      const buf = ac.createBuffer(1, len, ac.sampleRate)
      const d = buf.getChannelData(0)
      // pinkish noise (Kellet's economy filter)
      let b0 = 0
      let b1 = 0
      let b2 = 0
      for (let i = 0; i < len; i++) {
        const wn = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + wn * 0.099046
        b1 = 0.963 * b1 + wn * 0.2965164
        b2 = 0.57 * b2 + wn * 1.0526913
        d[i] = (b0 + b1 + b2 + wn * 0.1848) * 0.18
      }
      const src = ac.createBufferSource()
      src.buffer = buf
      src.loop = true
      const hi = ac.createBiquadFilter()
      hi.type = 'lowpass'
      hi.frequency.value = 900
      hi.Q.value = 0.4
      const g = ac.createGain()
      g.gain.value = 0
      const loF = ac.createBiquadFilter()
      loF.type = 'lowpass'
      loF.frequency.value = 160
      const lo = ac.createGain()
      lo.gain.value = 0
      src.connect(hi)
      hi.connect(g)
      g.connect(out)
      src.connect(loF)
      loF.connect(lo)
      lo.connect(out)
      src.start()
      surf = { src, hi, g, lo, ctx: ac }
    }
    // the surf comes closer as the water rises; in a fast time-lapse it follows the range instead
    const fast = smoothstep(0.15, 0.5, s.rate)
    const level = lerp(clamp((s.eta + 0.39) / 0.78), clamp((s.amp - 0.14) / 0.25), fast)
    const e = surfEnv(rt)
    const now = ac.currentTime
    const gain = (0.05 + 0.2 * e) * (0.35 + 0.65 * level) * A
    surf.g.gain.setTargetAtTime(gain, now, 0.08)
    surf.hi.frequency.setTargetAtTime(500 + 1500 * level * (0.4 + 0.6 * e), now, 0.15)
    surf.lo.gain.setTargetAtTime((0.12 + 0.25 * e) * (0.4 + 0.6 * level) * A, now, 0.2)
  }

  /* -------------------------------------------------------------- the loop */

  const loopT = (t: number) => mod(t + offset, LOOP)
  const onRuler = (x: number, y: number) => !preview && y > L.rulerY - 20 && y < h && x > L.pad - 8 && x < w - L.pad + 8
  const onMoon = (x: number, y: number, T: number) => {
    const s = stateAt(T)
    const mx = L.ox + Math.cos(s.moon) * L.Ro
    const my = L.oy - Math.sin(s.moon) * L.Ro
    return Math.hypot(x - mx, y - my) < Math.max(L.rM * 1.9, touch ? 30 : 18)
  }
  function seek(x: number) {
    const T = prevT < 0 ? 0 : prevT
    let target = clamp((x - L.pad) / (w - L.pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }
  function toggleSun() {
    sunOn = !sunOn
    sunUsed = true
    used = true
    sfx.tone(sunOn ? 523.25 : 392, 0.5, { type: 'sine', gain: 0.05, room: 0.4 })
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      L = layoutFor(w, h)
    },
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      const T = prevT < 0 ? 0 : prevT
      if (p.type === 'leave') {
        hoverMoon = false
        hoverX = -1
        scrubbing = false
        if (dragging && p.id === dragId) dragging = false
        downAt = null
        env.setCursor('default')
        return
      }
      ptrX = p.x
      ptrY = p.y
      const ruler = onRuler(p.x, p.y)
      hoverX = ruler || scrubbing ? p.x : -1
      if (p.type === 'down') {
        if (ruler) {
          scrubbing = true
          seek(p.x)
          return
        }
        const moon = onMoon(p.x, p.y, T)
        downAt = { x: p.x, y: p.y, ms: performance.now(), moon }
        if (moon) {
          dragging = true
          dragId = p.id
          used = true
        }
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seek(p.x)
        if (p.type === 'up') scrubbing = false
        env.setCursor('pointer')
        return
      }
      if (dragging && (p.type === 'move' || p.type === 'down')) {
        const ang = Math.atan2(-(p.y - L.oy), p.x - L.ox)
        const s0 = stateAt(T)
        moonOff = mod(ang - s0.moonTrue + Math.PI, TAU) - Math.PI
      }
      if (p.type === 'up') {
        if (downAt && !downAt.moon && Math.hypot(p.x - downAt.x, p.y - downAt.y) < (touch ? 16 : 10) && performance.now() - downAt.ms < 400) toggleSun()
        dragging = false
        downAt = null
      }
      hoverMoon = !dragging && onMoon(p.x, p.y, T)
      env.setCursor(dragging ? 'grabbing' : hoverMoon ? 'grab' : ruler ? 'pointer' : 'pointer')
    },
    key(code, down) {
      if (code === 'KeyS') {
        if (down) toggleSun()
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
    destroy() {
      surfStop()
    },
    frame(t, dt) {
      const perf0 = perfOn ? performance.now() : 0
      // time holds while the Moon is being dragged
      if (dragging) offset -= dt
      const T = loopT(t)
      if (!dragging && dt > 0) moonOff = Math.abs(moonOff) < 0.002 ? 0 : moonOff * (1 - damp(2.2, dt))
      sunK += ((sunOn ? 1 : 0) - sunK) * (dt > 0 ? damp(3.2, dt) : 0)
      if (dt === 0 && prevT < 0) sunK = sunOn ? 1 : 0
      const s = stateAt(T)
      const A = smoothstep(0, 0.6, T) * (1 - smoothstep(LOOP - 1.4, LOOP - 0.1, T))

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, w, h)
      drawOrbit(s, A)
      drawBeach(s, A, T, t)
      drawChart(s, A, T)
      captionAt(T)
      chrome(s, T)
      ghost(s, T)
      sunHint(T)
      if (hoverMoon && !dragging && !L.tiny && ptrX >= 0) {
        halo('DRAG', ptrX + 14, ptrY + 4, { size: 8.5, color: C.ocean, tracking: 0.14 })
      }

      // sound: surf, and a soft bell at each high water while time runs slowly
      if (sfx.enabled || surf) surfUpdate(s, t, sfx.enabled ? A : 0)
      if (sfx.enabled && dt > 0 && s.rate < 0.2) {
        const hiNow = s.detadt < 0 && lastHigh >= 0
        if (hiNow) sfx.tone(392, 2.4, { type: 'sine', gain: 0.035, attack: 0.25, room: 0.6 })
      }
      lastHigh = s.detadt >= 0 ? 1 : -1
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
