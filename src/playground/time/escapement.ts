/*
 * FIG. T.06 — ESCAPEMENT
 *
 * The heartbeat inside a regulator clock, drawn as a horological plate: a
 * Graham deadbeat escapement (a 30-tooth escape wheel and an anchor whose
 * pallets embrace 7½ teeth), the crutch and a seconds pendulum, the train up
 * to the centre wheel, the motion work, a weight on a barrel, and a regulator
 * dial (seconds above, minutes at the centre, hours below).
 *
 * Nothing is keyframed. The pendulum is integrated (θ'' = −ω₀² sin θ −
 * (ω₀/Q) θ' + τ) in eight substeps a frame, the anchor turns with it, and the
 * escape wheel, pulled forward by the weight, turns as far as the pallets
 * let it: every substep it advances (fast) until a tooth tip touches a pallet
 * face, found by bisection against the real pallet geometry. So the three
 * phases emerge on their own:
 *   LOCK     a tip rests on a locking face, an arc about the pallet arbor, so
 *            the wheel cannot move and gives no push (the "dead" beat);
 *   IMPULSE  the pallet slides off, the tip runs down the inclined impulse
 *            face and pushes the anchor — energy into the pendulum;
 *   DROP     the tip leaves the face; the wheel falls freely ~1.2° until a
 *            tooth lands on the other pallet's locking face: the tick.
 * One tooth per two beats, one turn a minute, one beat a second (3,600 BPH).
 *
 * Story (60 s, ← → step): I a controlled fall · II lock, impulse, drop (detail
 * A, 4:1) · III the parts, exploded along their arbors · IV energy back.
 *
 * Interaction (full mode): drag the bob sideways to set the amplitude, up or
 * down to move the rating nut (shorter runs fast); tap to stop or start;
 * hover a part to name it; ↑ ↓ rating nut, R reset, Space stop/start.
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, rgba, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. T.06'
const DEG = Math.PI / 180
const G = 9.81
const Q = 60
const AMP_EQ = 3.2 * DEG
/**
 * Rated length: a seconds pendulum (g/π² = 993.96 mm) shortened for its circular error at
 * this amplitude and for the escapement error (the impulses fall a little after the bottom
 * of the swing, which lengthens the period): found by running the model and rating it.
 */
const L_RATED = (G / (Math.PI * Math.PI)) * 1000 * (1 - (AMP_EQ * AMP_EQ) / 8) * 0.998545
/** the crutch, set in beat: tick and tock equally spaced */
const BEAT_SET = -0.036 * DEG
const L_MIN = 900
const L_MAX = 1100

/* ---------------------------------------------------------- escapement */

const NT = 30
const PITCH = TAU / NT
const R_TIP = 26
const R_ROOT = 22
const D_AW = R_TIP * Math.SQRT2
const PW = 2.18
const RO = R_TIP + PW / 2
const RI = R_TIP - PW / 2
const IMP = 2 * DEG
const LOCKA = 1 * DEG
const CC = LOCKA / 2

/** A-polar angle (about the pallet arbor) where the tip circle crosses radius ρ, on the left (−1) or right (+1). */
function tipCross(rho: number, side: number) {
  const y = (rho * rho - R_TIP * R_TIP + D_AW * D_AW) / (2 * D_AW)
  const x = side * Math.sqrt(Math.max(0, rho * rho - y * y))
  return Math.atan2(y, x)
}
const PSI_UE = -IMP / 2 + CC
const PSI_RE = IMP / 2 + CC
const PSI_UX = IMP / 2 - CC
const PSI_RX = -IMP / 2 - CC
const aC1 = tipCross(RO, -1) - PSI_UE
const aC2 = tipCross(RI, -1) - PSI_RE
const aC3 = tipCross(RI, 1) - PSI_UX
const aC4 = tipCross(RO, 1) - PSI_RX
const pol = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)]
const C1 = pol(RO, aC1)
const C2 = pol(RI, aC2)
const C3 = pol(RI, aC3)
const C4 = pol(RO, aC4)
const sideOf = (a: [number, number], b: [number, number], x: number, y: number) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])
const SE = Math.sign(sideOf(C1, C2, ...pol(R_TIP, aC1 + 3 * DEG)))
const SX = Math.sign(sideOf(C3, C4, ...pol(R_TIP, aC3 - 3 * DEG)))

function inEntry(x: number, y: number) {
  const r = Math.hypot(x, y)
  if (r <= RI || r >= RO) return false
  const a = Math.atan2(y, x)
  if (a > 152 * DEG || a < 110 * DEG) return false
  return Math.sign(sideOf(C1, C2, x, y)) === SE
}
function inExit(x: number, y: number) {
  const r = Math.hypot(x, y)
  if (r <= RI || r >= RO) return false
  const a = Math.atan2(y, x)
  if (a < 28 * DEG || a > 70 * DEG) return false
  return Math.sign(sideOf(C3, C4, x, y)) === SX
}
function segDist(a: [number, number], b: [number, number], x: number, y: number) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)
}

/* ---------------------------------------------------------- the train */

interface Gear {
  key: string
  name: string
  note: string
  x: number
  y: number
  z: number
  r: number
  m: number
  /** angle = ratio · θ_escape + phase */
  ratio: number
  phase: number
  spokes: number
  rim: number
  hub: number
  /** exploded-view depth level */
  level: number
  pinion?: { z: number; r: number; m: number; phase: number }
}

function meet(ax: number, ay: number, ra: number, bx: number, by: number, rb: number, side: number) {
  const dx = bx - ax
  const dy = by - ay
  const d = Math.hypot(dx, dy)
  const a = (ra * ra - rb * rb + d * d) / (2 * d)
  const hh = Math.sqrt(Math.max(0, ra * ra - a * a))
  const mx = ax + (dx * a) / d
  const my = ay + (dy * a) / d
  return { x: mx - (side * dy * hh) / d, y: my + (side * dx * hh) / d }
}

const W = { x: 0, y: D_AW }
const CW = { x: 0, y: D_AW + 50 }
const TW = meet(W.x, W.y, 2.8 + 16.8, CW.x, CW.y, 3.6 + 36, 1)
const BW = { x: CW.x + 58.3 * Math.sin(40 * DEG), y: CW.y + 58.3 * Math.cos(40 * DEG) }
const HW = { x: 0, y: CW.y + 36 }
const MW = meet(CW.x, CW.y, 4.8 + 14.4, HW.x, HW.y, 4 + 16, 1)

/** mesh phase: driver tooth on the line of centres, the driven gap on it */
const lineAng = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x)
const L_WT = lineAng(W, TW)
const L_CM = lineAng(CW, MW)
/** the wheel angle (about W) where the tip circle crosses radius ρ about the arbor, left side */
function wheelAt(rho: number) {
  const y = (rho * rho - R_TIP * R_TIP + D_AW * D_AW) / (2 * D_AW)
  const x = -Math.sqrt(Math.max(0, rho * rho - y * y))
  return Math.atan2(y - D_AW, x)
}
/** wheel rotation during one impulse, and the free drop that follows */
const IMPULSE_WHEEL = wheelAt(RI) - wheelAt(RO)
const DROP = PITCH / 2 - IMPULSE_WHEEL

const GEARS: Gear[] = (() => {
  const third: Gear = { key: 'third', name: 'Third wheel', note: '48 teeth · pinion of 8', x: TW.x, y: TW.y, z: 48, r: 16.8, m: 0.7, ratio: -8 / 48, phase: 0, spokes: 4, rim: 13.2, hub: 2.6, level: 1, pinion: { z: 8, r: 3.6, m: 0.9, phase: 0 } }
  const centre: Gear = { key: 'centre', name: 'Centre wheel', note: '80 teeth · one turn an hour', x: CW.x, y: CW.y, z: 80, r: 36, m: 0.9, ratio: 1 / 60, phase: 0, spokes: 5, rim: 31, hub: 4, level: 0, pinion: { z: 10, r: 5.5, m: 1.1, phase: 0 } }
  const great: Gear = { key: 'great', name: 'Great wheel and barrel', note: '96 teeth · the weight’s cord', x: BW.x, y: BW.y, z: 96, r: 52.8, m: 1.1, ratio: -(1 / 60) * (10 / 96), phase: 0, spokes: 5, rim: 47, hub: 13, level: -1 }
  const minute: Gear = { key: 'minute', name: 'Minute wheel', note: 'motion work · 36 and 10', x: MW.x, y: MW.y, z: 36, r: 14.4, m: 0.8, ratio: -(1 / 60) * (12 / 36), phase: 0, spokes: 4, rim: 11.4, hub: 2.2, level: 3, pinion: { z: 10, r: 4, m: 0.8, phase: 0 } }
  const hour: Gear = { key: 'hour', name: 'Hour wheel', note: '40 teeth · one turn in 12 hours', x: HW.x, y: HW.y, z: 40, r: 16, m: 0.8, ratio: (1 / 60) * (12 / 36) * (10 / 40), phase: 0, spokes: 4, rim: 12.8, hub: 2.4, level: 3.4 }
  // mesh phases: at the start, each driving leaf sits on the line of centres and the driven gap meets it
  const lTC = lineAng(TW, CW)
  third.phase = L_WT + Math.PI + Math.PI / 48
  third.pinion!.phase = lTC
  centre.phase = lTC + Math.PI + Math.PI / 80
  const lCB = lineAng(CW, BW)
  centre.pinion!.phase = lCB
  great.phase = lCB + Math.PI + Math.PI / 96
  minute.phase = L_CM + Math.PI + Math.PI / 36
  const lMH = lineAng(MW, HW)
  minute.pinion!.phase = lMH
  hour.phase = lMH + Math.PI + Math.PI / 40
  return [great, centre, third, minute, hour]
})()

/** Gear outline with rounded (clock) teeth, centred at 0 with tooth 0 at angle 0. */
function gearPath(z: number, r: number, m: number, hollow?: { rim: number; hub: number; spokes: number }) {
  const p = new Path2D()
  const ra = r + m * 0.95
  const rd = r - m * 1.2
  const step = TAU / z
  for (let i = 0; i < z; i++) {
    const a0 = i * step - step / 2
    const pts: [number, number][] = [
      [rd, a0 + step * 0.04],
      [rd, a0 + step * 0.25],
      [r, a0 + step * 0.3],
      [ra * 0.985, a0 + step * 0.38],
      [ra, a0 + step * 0.5],
      [ra * 0.985, a0 + step * 0.62],
      [r, a0 + step * 0.7],
      [rd, a0 + step * 0.75],
      [rd, a0 + step * 0.96],
    ]
    for (let k = 0; k < pts.length; k++) {
      const [rr, aa] = pts[k]
      const x = rr * Math.cos(aa)
      const y = rr * Math.sin(aa)
      if (i === 0 && k === 0) p.moveTo(x, y)
      else p.lineTo(x, y)
    }
  }
  p.closePath()
  if (hollow) addCrossings(p, hollow.rim, hollow.hub, hollow.spokes)
  return p
}

/** Wheel crossings: windows between the rim and the hub, leaving `n` spokes. */
function addCrossings(p: Path2D, rim: number, hub: number, n: number) {
  const sw = Math.max(1, rim * 0.09)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const b = ((i + 1) / n) * TAU
    const da = Math.asin(Math.min(0.9, sw / 2 / rim))
    const dh = Math.asin(Math.min(0.9, sw / 2 / (hub * 1.6)))
    p.moveTo(rim * Math.cos(a + da), rim * Math.sin(a + da))
    p.arc(0, 0, rim, a + da, b - da)
    p.lineTo(hub * 1.6 * Math.cos(b - dh), hub * 1.6 * Math.sin(b - dh))
    p.arc(0, 0, hub * 1.6, b - dh, a + dh, true)
    p.closePath()
  }
  p.moveTo(hub * 0.45, 0)
  p.arc(0, 0, hub * 0.45, 0, TAU)
}

/** The Graham escape wheel: 30 slender teeth leaning forward, crossed out with four spokes. */
function escapePath() {
  const p = new Path2D()
  const lean = 2.2 * DEG
  for (let i = 0; i < NT; i++) {
    const a = i * PITCH
    const dep = R_TIP - R_ROOT
    const pts: [number, number][] = [
      [R_ROOT, a - PITCH * 0.58],
      [R_ROOT + dep * 0.18, a - PITCH * 0.42],
      [R_ROOT + dep * 0.45, a - PITCH * 0.27],
      [R_ROOT + dep * 0.75, a - PITCH * 0.14],
      [R_TIP, a - 0.8 * DEG],
      [R_TIP, a],
      [R_ROOT + dep * 0.5, a - lean * 0.55],
      [R_ROOT, a - lean],
      [R_ROOT, a + PITCH * 0.21],
    ]
    for (let k = 0; k < pts.length; k++) {
      const [rr, aa] = pts[k]
      const x = rr * Math.cos(aa)
      const y = rr * Math.sin(aa)
      if (i === 0 && k === 0) p.moveTo(x, y)
      else p.lineTo(x, y)
    }
  }
  p.closePath()
  addCrossings(p, 17.6, 3, 4)
  return p
}

/** The anchor, in its own frame (arbor at 0, ψ = 0): slender arms, the pallets arcs about the arbor. */
function anchorPath() {
  const p = new Path2D()
  const arc = (r: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) / DEG) * 1.5))
    for (let i = 1; i <= n; i++) p.lineTo(...pol(r, lerp(a0, a1, i / n)))
  }
  const A1 = 147 * DEG
  const A2 = 33 * DEG
  const po = pol(RO, A1)
  const pi = pol(RI, A1)
  p.moveTo(...C2)
  p.lineTo(...C1)
  arc(RO, aC1, A1)
  p.bezierCurveTo(po[0] - 3.4, po[1] - 5.2, -15.5, -3.2, -6.1, -2.2)
  for (let i = 1; i <= 18; i++) {
    const a = lerp(200 * DEG, 340 * DEG, i / 18)
    p.lineTo(6.5 * Math.cos(a), 6.5 * Math.sin(a))
  }
  p.bezierCurveTo(15.5, -3.2, -po[0] + 3.4, po[1] - 5.2, -po[0], po[1])
  arc(RO, A2, aC4)
  p.lineTo(...C4)
  p.lineTo(...C3)
  arc(RI, aC3, A2)
  p.bezierCurveTo(-pi[0] - 1.6, pi[1] - 4.6, 9.5, 3.4, 4.4, 4.6)
  p.quadraticCurveTo(0, 7.6, -4.4, 4.6)
  p.bezierCurveTo(-9.5, 3.4, pi[0] + 1.6, pi[1] - 4.6, pi[0], pi[1])
  arc(RI, A1, aC2)
  p.closePath()
  p.moveTo(1.6, 0)
  p.arc(0, 0, 1.6, 0, TAU)
  return p
}

/** The two pallets (the working nibs), for hatching. */
function nibPaths() {
  const band = (aFace0: number, c0: [number, number], c1: [number, number], aFace1: number, aEnd: number) => {
    const p = new Path2D()
    p.moveTo(...c0)
    p.lineTo(...c1)
    const n = 12
    for (let i = 1; i <= n; i++) p.lineTo(...pol(RO, lerp(aFace1, aEnd, i / n)))
    for (let i = 0; i <= n; i++) p.lineTo(...pol(RI, lerp(aEnd, aFace0, i / n)))
    p.closePath()
    return p
  }
  return [band(aC2, C2, C1, aC1, 147 * DEG), band(aC3, C3, C4, aC4, 33 * DEG)]
}

/* ------------------------------------------------------------- story */

const LOOP = 60
const CHAPTERS = [
  { t: 0, num: 'I', name: 'A controlled fall' },
  { t: 13, num: 'II', name: 'Lock, impulse, drop' },
  { t: 31, num: 'III', name: 'The parts' },
  { t: 45, num: 'IV', name: 'Energy back' },
]
interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 1.4, t1: 11.2, lines: [{ s: 'A clock is a' }, { s: '', em: 'controlled fall.' }] },
  { t0: 14.6, t1: 26.5, lines: [{ s: 'Lock. Impulse.' }, { s: '', em: 'Drop.' }] },
  { t0: 33.6, t1: 41.6, lines: [{ s: 'Each part' }, { s: 'turns the ', em: 'next.' }] },
  { t0: 46.4, t1: 57.6, lines: [{ s: 'Every tick, a little' }, { s: '', em: 'energy back.' }] },
]

type Phase = 'lock' | 'impulse' | 'drop' | 'none'
const PHASE_COL: Record<Phase, string> = { lock: C.ocean, impulse: C.moss, drop: C.fern, none: C.muted }

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  /* ----------------------------------------------------------- physics */

  let ell = L_RATED
  let w0 = Math.sqrt(G / (ell / 1000))
  let th = -AMP_EQ * 1.05
  let om = 0
  let tw = 0
  let psi = th
  let held = true // the opening: a hand holds the pendulum aside, then lets go
  let stopped = false
  let dragging = false
  let contactNow: Phase = 'none'
  let contactSide: 'E' | 'X' | '' = ''
  let lastLock: 'E' | 'X' | '' = ''
  let dropping = 0
  const TORQUE_K = 1.18
  // measured period from interpolated upward zero crossings
  let lastZc = -1
  let period = 2
  let ampMeas = AMP_EQ
  let ampRun = 0
  let simT = 0
  // beat flashes
  let flash = 0
  let flashX = 0
  let flashY = 0
  // history for the strip chart
  const HN = 420
  const hPsi = new Float32Array(HN)
  const hE = new Float32Array(HN)
  const hPh = new Uint8Array(HN)
  let hHead = 0
  let hCount = 0
  let hAcc = 0

  function blocked(theta: number) {
    const c = Math.cos(psi)
    const s = Math.sin(psi)
    for (let side = 0; side < 2; side++) {
      const base = side === 0 ? -135 * DEG : -45 * DEG
      const i0 = Math.round((base - theta) / PITCH)
      for (let j = -2; j <= 2; j++) {
        const ph = theta + (i0 + j) * PITCH
        const x = R_TIP * Math.cos(ph)
        const y = D_AW + R_TIP * Math.sin(ph)
        const lx = c * x + s * y
        const ly = -s * x + c * y
        if (side === 0 ? inEntry(lx, ly) : inExit(lx, ly)) return true
      }
    }
    return false
  }

  /** Which face the wheel rests on, and where (world mm). */
  function classify(): { ph: Phase; side: 'E' | 'X' | ''; x: number; y: number } {
    const c = Math.cos(psi)
    const s = Math.sin(psi)
    let best: Phase = 'none'
    let bs: 'E' | 'X' | '' = ''
    let bd = 0.03
    let bx = 0
    let by = 0
    for (let side = 0; side < 2; side++) {
      const base = side === 0 ? -135 * DEG : -45 * DEG
      const i0 = Math.round((base - tw) / PITCH)
      for (let j = -1; j <= 1; j++) {
        const ph = tw + (i0 + j) * PITCH
        const x = R_TIP * Math.cos(ph)
        const y = D_AW + R_TIP * Math.sin(ph)
        const lx = c * x + s * y
        const ly = -s * x + c * y
        const r = Math.hypot(lx, ly)
        const a = Math.atan2(ly, lx)
        if (side === 0) {
          const dl = Math.abs(r - RO)
          if (a >= aC1 - 0.2 * DEG && a < 150 * DEG && dl < bd) [bd, best, bs, bx, by] = [dl, 'lock', 'E', x, y]
          const di = segDist(C1, C2, lx, ly)
          if (di < bd) [bd, best, bs, bx, by] = [di, 'impulse', 'E', x, y]
        } else {
          const dl = Math.abs(r - RI)
          if (a <= aC3 + 0.2 * DEG && a > 30 * DEG && dl < bd) [bd, best, bs, bx, by] = [dl, 'lock', 'X', x, y]
          const di = segDist(C3, C4, lx, ly)
          if (di < bd) [bd, best, bs, bx, by] = [di, 'impulse', 'X', x, y]
        }
      }
    }
    return { ph: best, side: bs, x: bx, y: by }
  }

  function solveWheel(maxAdv: number) {
    if (blocked(tw)) {
      // the anchor moved into a tip: push the wheel back (recoil) just enough
      let lo = tw - 0.5 * DEG
      let hi = tw
      let k = 0
      while (blocked(lo) && k++ < 12) lo -= 0.5 * DEG
      if (blocked(lo)) return 0
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2
        if (blocked(mid)) hi = mid
        else lo = mid
      }
      const d = lo - tw
      tw = lo
      return d
    }
    const target = tw + maxAdv
    if (!blocked(target)) {
      tw = target
      return maxAdv
    }
    let lo = tw
    let hi = target
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2
      if (blocked(mid)) hi = mid
      else lo = mid
    }
    const d = lo - tw
    tw = lo
    return d
  }

  // the wheel comes to rest on the entry pallet's locking face, the pendulum held aside
  psi = th + BEAT_SET
  for (let i = 0; i < 4000; i++) if (solveWheel(0.4 * DEG) < 0.39 * DEG) break
  const tw0 = tw
  // the dial is set to the viewer's time
  const now = new Date()
  const clock0 = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000

  function step(dt: number) {
    const SUB = 8
    const h = dt / SUB
    const wmax = 600 * DEG
    for (let i = 0; i < SUB; i++) {
      simT += h
      const torque = !held && !stopped && !dragging && contactNow === 'impulse' ? (contactSide === 'E' ? 1 : -1) * TORQUE_K * ((Math.PI * w0 * w0 * AMP_EQ * AMP_EQ) / (2 * Q * IMP)) : 0
      if (!dragging) {
        let acc = -w0 * w0 * Math.sin(th) - (w0 / Q) * om + torque
        if (held) acc = -60 * (th + AMP_EQ * 1.05) - 14 * om
        else if (stopped) acc += -6 * om - 4 * th
        const prev = th
        om += acc * h
        th += om * h
        if (prev < 0 && th >= 0 && !held && !stopped) {
          const tz = simT - h + h * (-prev / (th - prev))
          if (lastZc > 0) {
            const p = tz - lastZc
            if (p > 0.5 && p < 4) period = p
          }
          lastZc = tz
          ampMeas = ampRun
          ampRun = 0
        }
        ampRun = Math.max(ampRun, Math.abs(th))
      }
      psi = th + BEAT_SET
      const adv = solveWheel(wmax * h)
      const c = classify()
      if (adv > 0.25 * DEG) dropping = 1
      if (c.ph === 'lock' && dropping && c.side !== lastLock) {
        // the tick: a tooth lands on a locking face
        flash = 1
        flashX = c.x
        flashY = c.y
        if (simT > 0.3) tick(c.side === 'E')
        lastLock = c.side as 'E' | 'X'
      }
      if (c.ph !== 'none') dropping = 0
      contactNow = c.ph === 'none' ? 'drop' : c.ph
      contactSide = c.side
    }
  }

  function tick(entry: boolean) {
    if (!sfx.enabled) return
    // a soft wooden click: a resonant band of noise and a short knock, lower for the tock
    const f = entry ? 2500 : 1650
    sfx.noise(0.045, { filter: f, q: 7, gain: 0.07, room: 0.22 })
    sfx.tone(entry ? 1180 : 820, 0.05, { type: 'triangle', gain: 0.035, room: 0.2 })
    sfx.tone(entry ? 330 : 247, 0.09, { type: 'sine', gain: 0.03, room: 0.25 })
  }

  const energy = () => (0.5 * om * om + w0 * w0 * (1 - Math.cos(th))) / (0.5 * w0 * w0 * AMP_EQ * AMP_EQ)

  /* ------------------------------------------------------------ layout */

  let w = env.width
  let h = env.height
  let m = 24
  let mode: 'wide' | 'portrait' | 'compact' = 'wide'
  let small = false
  let tiny = false
  // the movement view: world (mm) → screen
  let S = 2
  let vx = 0
  let vy = 0
  let mvL = 0
  let mvR = 0
  let mvT = 0
  let mvB = 0
  // the drawn pendulum (mm below the arbor to the bob's centre) and the break
  let dRod = 262
  let brk = 206
  // right column: dial, strip, detail
  const dial = { x: 0, y: 0, r: 80 }
  const strip = { x: 0, y: 0, w: 200, h: 60, on: true }
  const detail = { x: 0, y: 0, r: 150 }
  let capX = 0
  let capY = 0
  let capSize = 30
  let capW = 280
  let specOn = false
  let specY = 0
  let headerH = 44

  function layout() {
    w = env.width
    h = env.height
    small = preview || Math.min(w, h) < 520
    tiny = h < 260 || w < 360
    m = preview ? 12 : tiny ? 10 : small ? 14 : Math.round(clamp(Math.min(w, h) * 0.035, 18, 40))
    headerH = preview ? 20 : tiny ? 22 : small ? 30 : 46
    specOn = false
    if (preview) mode = 'compact'
    else if (h > w * 1.15) mode = 'portrait'
    else if (w >= 960 && h >= 560) mode = 'wide'
    else mode = 'compact'
    // world extent of the drawing (mm)
    const full = { x0: -66, x1: 106, y0: -34, y1: 322 }
    if (mode === 'wide') {
      dRod = 262
      brk = 206
      const lc = Math.round(clamp(w * 0.24, 250, 440))
      const rc = Math.round(clamp(w * 0.3, 300, 560))
      mvL = lc + m
      mvR = w - rc - m
      mvT = m + headerH
      mvB = h - m - 8
      S = Math.min((mvR - mvL) / (full.x1 - full.x0), (mvB - mvT) / (full.y1 - full.y0))
      vx = (mvL + mvR) / 2 - ((full.x0 + full.x1) / 2) * S
      vy = mvT + (mvB - mvT - (full.y1 - full.y0) * S) / 2 - full.y0 * S
      const rx0 = w - rc
      const rw = rc - m
      strip.x = rx0 + 12
      strip.w = rw - 16
      strip.h = clamp(h * 0.085, 44, 90)
      strip.y = h - m - 40 - strip.h * 1.8
      const top = m + 98
      dial.r = Math.min(rw * 0.47, (strip.y - 44 - top) / 2)
      dial.x = rx0 + rw / 2
      dial.y = top + dial.r
      detail.r = Math.min(rw * 0.49, (strip.y - 74 - top) / 2)
      detail.x = rx0 + rw / 2
      detail.y = top + detail.r
      strip.on = true
      capSize = Math.round(clamp(Math.min(w * 0.03, h * 0.05), 24, 50))
      capX = m + 4
      capW = lc - m - 8
      capY = m + headerH + h * 0.12
      specOn = h >= 640
      specY = Math.max(capY + capSize * 2.6 + 70, h * 0.5)
    } else if (mode === 'portrait') {
      dRod = 240
      brk = 196
      const fy1 = 298
      capSize = Math.round(clamp(w * 0.066, 18, 34))
      const bottomH = capSize * 2.3 + 30
      const dialH = clamp(w * 0.4, 110, 220)
      mvL = m
      mvR = w - m
      mvT = m + headerH
      mvB = h - m - bottomH - dialH - 20
      S = Math.min((mvR - mvL) / (full.x1 - full.x0), (mvB - mvT) / (fy1 - full.y0))
      vx = (mvL + mvR) / 2 - ((full.x0 + full.x1) / 2) * S
      vy = mvT - full.y0 * S
      dial.r = dialH / 2 - 6
      dial.x = m + dial.r + 4
      dial.y = mvB + 14 + dial.r
      detail.r = Math.min((w - m * 2) / 2, (mvB - mvT) / 2) * 0.96
      detail.x = w / 2
      detail.y = mvT + detail.r + 4
      strip.x = dial.x + dial.r + 18
      strip.w = w - m - strip.x
      strip.h = dial.r * 0.62
      strip.y = dial.y - dial.r + 16
      strip.on = strip.w > 90
      capX = m + 2
      capW = w - m * 2
      capY = h - m - bottomH + 8
    } else {
      // short or small: the movement on the left (pendulum shortened further), the dial at right
      dRod = 214
      brk = 194
      const fy1 = 250
      const fw = full.x1 - full.x0
      const fh = fy1 - full.y0
      capSize = Math.round(clamp(Math.min(w * 0.045, h * 0.075), 13, 26))
      mvT = headerH + 2
      mvB = h - m
      if (!preview && w / h >= 1.9) {
        // wide and short: movement · caption · dial
        S = (mvB - mvT) / fh
        mvL = m
        mvR = m + fw * S
        vx = mvL - full.x0 * S
        vy = mvT - full.y0 * S
        dial.r = Math.max(20, Math.min(w * 0.19, (h - headerH - m * 2) / 2 - (tiny ? 2 : 10)))
        dial.x = w - m - dial.r - 4
        dial.y = headerH + 4 + dial.r
        capX = mvR + m * 1.5
        capW = dial.x - dial.r - m - capX
        capY = headerH + (h - headerH) * (tiny ? 0.18 : 0.24)
        // the strip chart under the caption, when there is room
        strip.x = capX + 22
        strip.w = capW - 26
        strip.y = capY + capSize * 2.3 + 34
        strip.h = Math.min(70, (h - m - 40 - strip.y) / 1.8)
        strip.on = strip.h > 26 && strip.w > 120
      } else {
        const rc = preview ? w * 0.36 : Math.min(w * 0.4, h * 1.05)
        mvL = m
        mvR = w - rc - m * 0.5
        S = Math.min((mvR - mvL) / fw, (mvB - mvT) / fh)
        vx = mvL + (mvR - mvL - fw * S) / 2 - full.x0 * S
        vy = mvT - full.y0 * S
        const rx0 = w - rc
        const capH = preview ? 0 : capSize * 2.2 + 26
        dial.r = Math.max(20, Math.min(rc / 2 - 8, (h - headerH - m - capH) / 2 - 4))
        dial.x = rx0 + rc / 2 - m * 0.3
        dial.y = headerH + 6 + dial.r
        capX = rx0 + 2
        capW = rc - m
        capY = dial.y + dial.r + 22
      }
      detail.r = Math.min((mvR - mvL) / 2, (mvB - mvT) / 2)
      detail.x = (mvL + mvR) / 2
      detail.y = (mvT + mvB) / 2
      if (preview || w / h < 1.9) strip.on = false
    }
  }
  layout()

  // screen ↔ world for the movement view (before any exploded offset)
  const sx = (x: number) => vx + x * S
  const sy = (y: number) => vy + y * S

  /* ------------------------------------------------------------ paths */

  const escP = escapePath()
  const ancP = anchorPath()
  const nibs = nibPaths()
  const gearP = GEARS.map((g) => ({ g, wheel: gearPath(g.z, g.r, g.m, { rim: g.rim, hub: g.hub, spokes: g.spokes }), pin: g.pinion ? gearPath(g.pinion.z, g.pinion.r, g.pinion.m) : null }))
  const escPin = gearPath(8, 2.8, 0.7)
  const canP = gearPath(12, 4.8, 0.8)

  /* ------------------------------------------------------------ story clock */

  const at = Number(env.params.get('at'))
  let storyOff = env.params.has('at') && Number.isFinite(at) ? at : preview ? 16 : 0
  let lastT = 0
  let acted = false
  const storyT = (t: number) => (((t + storyOff) % LOOP) + LOOP) % LOOP
  // the exploded amount and the detail view, from the story clock
  const explodeAt = (T: number) => (preview ? 0 : ease.inOutCubic(smoothstep(31.6, 34.2, T)) * (1 - ease.inOutCubic(smoothstep(41.4, 44, T))))
  const detailAt = (T: number) => (preview ? 0 : smoothstep(13, 14.3, T) * (1 - smoothstep(29.6, 31, T)))

  /* ------------------------------------------------------------ drawing */

  const OBL = { x: Math.cos(35 * DEG) * 0.62, y: -Math.sin(35 * DEG) * 0.62 }
  const LEVEL_MM = 26
  let ex = 0 // explode 0..1
  const off = (level: number) => ({ x: OBL.x * level * LEVEL_MM * ex, y: OBL.y * level * LEVEL_MM * ex })

  /** world transform for the movement view, with an extra offset (mm) for the exploded view */
  function enterWorld(dx = 0, dy = 0, k = S, cx = vx, cy = vy) {
    ctx.save()
    const d = env.dpr
    ctx.setTransform(d * k, 0, 0, d * k, d * (cx + dx * k), d * (cy + dy * k))
    ctx.lineWidth = 1 / k
  }

  function drawGear(path: Path2D, x: number, y: number, a: number, ink: string, fill = true) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    if (fill) {
      ctx.fillStyle = C.paper
      ctx.fill(path, 'evenodd')
    }
    ctx.strokeStyle = ink
    ctx.stroke(path)
    ctx.restore()
  }

  const gearAngle = (g: Gear) => g.ratio * (tw - tw0) + g.phase
  const pinAngle = (g: Gear) => g.ratio * (tw - tw0) + (g.pinion?.phase ?? 0)

  let hoverKey = ''

  /** The pendulum: suspension, rod (broken), crutch, bob, rating nut, beat scale. */
  function drawPendulum(k: number, dx: number, dy: number, alpha: number) {
    enterWorld(dx, dy, k)
    ctx.globalAlpha = alpha
    const hot = hoverKey === 'bob' || hoverKey === 'rod' || dragging
    const ink = hot ? C.ocean : C.ink
    const st = Math.sin(th)
    const ct = Math.cos(th)
    // suspension cock and spring
    ctx.strokeStyle = rgba(C.ink, 0.8)
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.rect(-9, -33, 18, 9)
    ctx.fill()
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.rect(-9, -33, 18, 9)
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    for (let d = -20; d < 20; d += 2.2) {
      ctx.moveTo(d, -24)
      ctx.lineTo(d + 9, -33)
    }
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.moveTo(-1.2, -24)
    ctx.lineTo(-1.2, -3)
    ctx.moveTo(1.2, -24)
    ctx.lineTo(1.2, -3)
    ctx.stroke()
    // the rod, as two hairlines, with a break
    const rodAt = (d: number, side: number): [number, number] => [st * d + ct * side * 1.6, ct * d - st * side * 1.6]
    ctx.strokeStyle = ink
    ctx.beginPath()
    for (const sd of [-1, 1]) {
      ctx.moveTo(...rodAt(-2, sd))
      ctx.lineTo(...rodAt(brk - 4, sd))
      ctx.moveTo(...rodAt(brk + 4, sd))
      ctx.lineTo(...rodAt(dRod - 13, sd))
    }
    ctx.stroke()
    // break symbol: two zigzags across the rod
    ctx.beginPath()
    for (const d0 of [brk - 4, brk + 4]) {
      const [ax, ay] = rodAt(d0, -3)
      const [bx2, by2] = rodAt(d0 + 1.6, -1)
      const [cx2, cy2] = rodAt(d0 - 1.6, 1)
      const [ddx, ddy] = rodAt(d0, 3)
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx2, by2)
      ctx.lineTo(cx2, cy2)
      ctx.lineTo(ddx, ddy)
    }
    ctx.stroke()
    // the bob: a lenticular disc seen edge-on, hatched
    const bxc = st * dRod
    const byc = ct * dRod
    ctx.save()
    ctx.translate(bxc, byc)
    ctx.rotate(-th)
    ctx.beginPath()
    ctx.ellipse(0, 0, 25, 12.5, 0, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = rgba(hot ? C.ocean : C.ink, 0.38)
    ctx.beginPath()
    for (let d = -40; d < 40; d += 2.6) {
      ctx.moveTo(d, 13)
      ctx.lineTo(d + 13, -13)
    }
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.ellipse(0, 0, 25, 12.5, 0, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-25, 0)
    ctx.lineTo(25, 0)
    ctx.stroke()
    // rod through the bob, the rating nut beneath, the pointer
    ctx.beginPath()
    ctx.moveTo(-1.6, 12.5)
    ctx.lineTo(-1.6, 22)
    ctx.moveTo(1.6, 12.5)
    ctx.lineTo(1.6, 22)
    ctx.rect(-4.5, 22, 9, 6)
    ctx.moveTo(0, 28)
    ctx.lineTo(0, 40)
    ctx.stroke()
    ctx.restore()
    // the beat scale: degrees either side of the bottom
    const rs = dRod + 42
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.beginPath()
    ctx.arc(0, 0, rs, Math.PI / 2 - 6 * DEG, Math.PI / 2 + 6 * DEG)
    for (let d = -6; d <= 6; d++) {
      const a = Math.PI / 2 - d * DEG
      const l = d % 5 === 0 ? 5 : 2.6
      ctx.moveTo(Math.cos(a) * rs, Math.sin(a) * rs)
      ctx.lineTo(Math.cos(a) * (rs + l), Math.sin(a) * (rs + l))
    }
    ctx.stroke()
    // the crutch: from the arbor down to a fork around the rod
    const cl = 78
    ctx.strokeStyle = hoverKey === 'crutch' ? C.ocean : rgba(C.ink, 0.85)
    ctx.beginPath()
    const [c0x, c0y] = [st * 4, ct * 4]
    const [c1x, c1y] = [st * cl, ct * cl]
    ctx.moveTo(c0x - ct * 2.2, c0y + st * 2.2)
    ctx.lineTo(c1x - ct * 1.4, c1y + st * 1.4)
    ctx.moveTo(c0x + ct * 2.2, c0y - st * 2.2)
    ctx.lineTo(c1x + ct * 1.4, c1y - st * 1.4)
    ctx.moveTo(c1x - ct * 4.4, c1y + st * 4.4)
    ctx.lineTo(c1x + ct * 4.4, c1y - st * 4.4)
    ctx.moveTo(c1x - ct * 4.4 + st * 5, c1y + st * 4.4 + ct * 5)
    ctx.lineTo(c1x - ct * 4.4, c1y + st * 4.4)
    ctx.moveTo(c1x + ct * 4.4 + st * 5, c1y - st * 4.4 + ct * 5)
    ctx.lineTo(c1x + ct * 4.4, c1y - st * 4.4)
    ctx.stroke()

    ctx.restore()
  }

  /** The weight on its cord from the barrel. */
  function drawWeight(k: number, dx: number, dy: number, alpha: number) {
    enterWorld(dx, dy, k)
    ctx.globalAlpha = alpha
    const hot = hoverKey === 'weight'
    const xc = BW.x + 13
    // the weight falls as the barrel unwinds (imperceptibly: 8.5 mm an hour)
    const fall = ((tw - tw0) / TAU) * (1 / 60) * (10 / 96) * TAU * 13
    const top = 214 + fall
    ctx.strokeStyle = hot ? C.ocean : rgba(C.ink, 0.8)
    ctx.beginPath()
    ctx.moveTo(xc, BW.y)
    ctx.lineTo(xc, top)
    ctx.stroke()
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.rect(xc - 9, top + 6, 18, 52)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(xc, top + 3, 3, Math.PI, 0)
    ctx.moveTo(xc - 9, top + 10)
    ctx.lineTo(xc + 9, top + 10)
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.rect(xc - 9, top + 10, 18, 48)
    ctx.clip()
    ctx.strokeStyle = rgba(hot ? C.ocean : C.ink, 0.32)
    ctx.beginPath()
    for (let d = -20; d < 60; d += 2.6) {
      ctx.moveTo(xc - 9, top + 10 + d)
      ctx.lineTo(xc + 9, top + d - 8)
    }
    ctx.stroke()
    ctx.restore()
    ctx.restore()
  }

  /** The plates, the train, the escapement. dk: scale override (detail view). */
  function drawMovement(k: number, cx: number, cy: number, alpha: number, forDetail: boolean) {
    const o = (lv: number) => (forDetail ? { x: 0, y: 0 } : off(lv))
    // back plate outline (dashed phantom line, as if glass)
    if (!forDetail) {
      const ob = o(-2)
      enterWorld(ob.x, ob.y, k, cx, cy)
      ctx.globalAlpha = alpha * (0.55 + 0.45 * ex)
      ctx.strokeStyle = hoverKey === 'plate' ? C.ocean : rgba(C.ink, 0.5)
      ctx.setLineDash([3 / k, 2.5 / k])
      ctx.beginPath()
      ctx.roundRect(-50, -18, 152, 212, 7)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      for (const [px, py] of [
        [-42, -10],
        [94, -10],
        [-42, 186],
        [94, 186],
      ]) {
        ctx.moveTo(px + 3, py)
        ctx.arc(px, py, 3, 0, TAU)
      }
      ctx.stroke()
      ctx.restore()
    }
    // the train, back to front
    for (const { g, wheel, pin } of gearP) {
      if (forDetail) continue
      const ov = o(g.level)
      enterWorld(ov.x, ov.y, k, cx, cy)
      ctx.globalAlpha = alpha
      const hot = hoverKey === g.key
      const motion = g.level >= 3
      if (motion && ex < 0.02) {
        ctx.restore()
        continue
      }
      if (motion) ctx.globalAlpha = alpha * smoothstep(0.02, 0.5, ex)
      const depth = g.level <= -1 ? 0.42 : g.level === 0 ? 0.56 : g.level === 1 ? 0.72 : 0.62
      const ink = hot ? C.ocean : rgba(C.ink, lerp(depth, 0.9, ex))
      if (g.key === 'great') {
        // the barrel drum, behind its wheel, with the cord's turns
        ctx.strokeStyle = ink
        ctx.beginPath()
        ctx.arc(g.x, g.y, 13, 0, TAU)
        ctx.stroke()
      }
      drawGear(wheel, g.x, g.y, gearAngle(g), ink)
      if (pin) drawGear(pin, g.x, g.y, pinAngle(g), ink)
      if (g.key === 'centre' && ex > 0.02) drawGear(canP, g.x, g.y, g.ratio * (tw - tw0) + L_CM, rgba(C.ink, 0.6 * ex))
      ctx.restore()
    }
    // the escape wheel and its pinion
    const ow = o(1.8)
    enterWorld(ow.x, ow.y, k, cx, cy)
    ctx.globalAlpha = alpha
    const hotW = hoverKey === 'escape'
    drawGear(escPin, W.x, W.y, tw - tw0 + L_WT, hotW ? C.ocean : rgba(C.ink, 0.88))
    drawGear(escP, W.x, W.y, tw, hotW ? C.ocean : C.ink)
    ctx.restore()
    // the anchor
    const oa = o(2.6)
    enterWorld(oa.x, oa.y, k, cx, cy)
    ctx.globalAlpha = alpha
    ctx.save()
    ctx.rotate(psi)
    ctx.fillStyle = C.paper
    ctx.fill(ancP, 'evenodd')
    // the pallets' working faces in colour while they work
    ctx.strokeStyle = hoverKey === 'anchor' ? C.ocean : C.ink
    ctx.stroke(ancP)
    if (k > 3) {
      // the pallets: hatched, the working faces drawn in the colour of their phase
      for (let i = 0; i < 2; i++) {
        ctx.save()
        ctx.clip(nibs[i])
        ctx.strokeStyle = rgba(C.ink, 0.4)
        ctx.beginPath()
        const cxn = i === 0 ? -19 : 19
        for (let d = -14; d < 14; d += 0.9) {
          ctx.moveTo(cxn + d - 6, 24)
          ctx.lineTo(cxn + d + 6, 8)
        }
        ctx.stroke()
        ctx.restore()
      }
    }
    ctx.restore()
    ctx.restore()
  }

  /** Detail A: the escapement at 4:1 with its phases named. */
  function drawDetail(a: number) {
    if (a <= 0.01) return
    const R0 = detail.r
    const k = (R0 * 0.92) / 33
    const cxw = detail.x - 0 * k
    const cyw = detail.y - 22 * k
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(detail.x, detail.y, R0, 0, TAU)
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = C.ink
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(detail.x, detail.y, R0 - 4, 0, TAU)
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(detail.x, detail.y, R0 - 1, 0, TAU)
    ctx.clip()
    // dead faces: arcs about the arbor through both locking faces
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
    ctx.strokeStyle = rgba(C.ocean, 0.35)
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.arc(cxw, cyw, RO * k, 100 * DEG, 170 * DEG)
    ctx.moveTo(cxw + RI * k * Math.cos(10 * DEG), cyw + RI * k * Math.sin(10 * DEG))
    ctx.arc(cxw, cyw, RI * k, 10 * DEG, 80 * DEG)
    ctx.stroke()
    ctx.setLineDash([])
    // the tangent construction: lines of centres
    ctx.strokeStyle = rgba(C.ink, 0.16)
    ctx.beginPath()
    ctx.moveTo(cxw, cyw)
    ctx.lineTo(cxw + W.x * k, cyw + W.y * k)
    ctx.moveTo(cxw, cyw)
    ctx.lineTo(cxw - 18.385 * k * 1.6, cyw + 18.385 * k * 1.6)
    ctx.moveTo(cxw, cyw)
    ctx.lineTo(cxw + 18.385 * k * 1.6, cyw + 18.385 * k * 1.6)
    ctx.stroke()
    drawMovement(k, cxw, cyw, 1, true)
    // the crutch stub and rod, behind, faint
    enterWorld(0, 0, k, cxw, cyw)
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    ctx.moveTo(Math.sin(th) * 5, Math.cos(th) * 5)
    ctx.lineTo(Math.sin(th) * 80, Math.cos(th) * 80)
    ctx.stroke()
    ctx.restore()
    // highlight the working face
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
    const c = classify()
    const col = PHASE_COL[contactNow]
    if (c.ph !== 'none') {
      const X0 = cxw + c.x * k
      const Y0 = cyw + c.y * k
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(X0, Y0, 3.4, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = col
      ctx.beginPath()
      ctx.arc(X0, Y0, 9, 0, TAU)
      ctx.stroke()
    }
    if (flash > 0.02) {
      ctx.strokeStyle = rgba(C.fern, flash)
      ctx.beginPath()
      ctx.arc(cxw + flashX * k, cyw + flashY * k, 9 + (1 - flash) * 26, 0, TAU)
      ctx.stroke()
    }
    // labels inside the circle
    const fs = R0 > 170 ? 9.5 : 8.5
    const labelAt = (str: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left') => {
      setFont(ctx, { size: fs, tracking: 0.12 })
      const lw = ctx.measureText(str).width
      const lx = align === 'right' ? x - lw : align === 'center' ? x - lw / 2 : x
      ctx.fillStyle = rgba(C.paper, 0.88)
      ctx.fillRect(lx - 3, y - fs, lw + 6, fs + 4)
      text(ctx, str, x, y, { size: fs, color, align, tracking: 0.12 })
    }
    if (R0 > 110) {
      labelAt('ENTRY PALLET', cxw - 19 * k, cyw + 33 * k, contactSide === 'E' ? col : C.ink2, 'center')
      labelAt('EXIT PALLET', cxw + 19 * k, cyw + 33 * k, contactSide === 'X' ? col : C.ink2, 'center')
      labelAt('PALLET ARBOR', cxw, cyw - 8.5 * k, C.ink2, 'center')
      labelAt('ESCAPE WHEEL · 30 TEETH', detail.x, cyw + 52 * k, C.ink2, 'center')
    }
    ctx.restore()
    // phase word under the circle
    const pw = contactNow === 'lock' ? 'LOCK' : contactNow === 'impulse' ? 'IMPULSE' : 'DROP'
    const yb = detail.y + R0 + (small ? 16 : 22)
    ctx.save()
    ctx.globalAlpha = a
    const words: [string, Phase][] = [
      ['LOCK', 'lock'],
      ['IMPULSE', 'impulse'],
      ['DROP', 'drop'],
    ]
    setFont(ctx, { size: small ? 9.5 : 11, tracking: 0.16 })
    const gap = small ? 14 : 22
    const total = words.reduce((s2, [wd]) => s2 + ctx.measureText(wd).width, 0) + gap * 2
    let xw = detail.x - total / 2
    for (const [wd, ph] of words) {
      const on = contactNow === ph || (ph === 'drop' && flash > 0.6)
      text(ctx, wd, xw, yb, { size: small ? 9.5 : 11, color: on ? PHASE_COL[ph] : C.muted, tracking: 0.16 })
      if (on) {
        ctx.strokeStyle = PHASE_COL[ph]
        ctx.lineWidth = 1
        ctx.beginPath()
        setFont(ctx, { size: small ? 9.5 : 11, tracking: 0.16 })
        ctx.moveTo(xw, yb + 5)
        ctx.lineTo(xw + ctx.measureText(wd).width, yb + 5)
        ctx.stroke()
      }
      setFont(ctx, { size: small ? 9.5 : 11, tracking: 0.16 })
      xw += ctx.measureText(wd).width + gap
    }
    if (!small) {
      text(ctx, 'DETAIL A · SCALE 4:1', detail.x - R0, detail.y - R0 - 6, { size: 9, color: C.muted, tracking: 0.14 })
      ctx.strokeStyle = rgba(C.ocean, 0.6)
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.moveTo(detail.x - R0 + 2, yb + 22)
      ctx.lineTo(detail.x - R0 + 26, yb + 22)
      ctx.stroke()
      ctx.setLineDash([])
      setFont(ctx, { size: 8.5, tracking: 0.1 })
      const room = w - m - (detail.x - R0 + 32)
      const legend = ctx.measureText('LOCKING FACES: ARCS ABOUT THE ARBOR, SO NO RECOIL').width < room ? 'LOCKING FACES: ARCS ABOUT THE ARBOR, SO NO RECOIL' : 'LOCKING FACES: ARCS ABOUT THE ARBOR'
      text(ctx, legend, detail.x - R0 + 32, yb + 25, { size: 8.5, color: C.ocean, tracking: 0.1 })
    }
    void pw
    ctx.restore()
  }

  /** The regulator dial: seconds above, minutes at the centre, hours below (each on its arbor). */
  function drawDial(a: number) {
    if (a <= 0.01 || dial.r < 18) return
    const R0 = dial.r
    const k = R0 / 106
    const X0 = dial.x
    const Y0 = dial.y
    const secs = clock0 + (tw - tw0) / (6 * DEG)
    const big = R0 > 95
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const hot = hoverKey === 'dial'
    ctx.fillStyle = C.paper
    ctx.strokeStyle = hot ? C.ocean : C.ink
    ctx.beginPath()
    ctx.arc(X0, Y0, R0, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.beginPath()
    ctx.arc(X0, Y0, 102 * k, 0, TAU)
    ctx.moveTo(X0 + 92 * k, Y0)
    ctx.arc(X0, Y0, 92 * k, 0, TAU)
    ctx.stroke()
    // the minute track
    ctx.strokeStyle = rgba(C.ink, 0.72)
    ctx.beginPath()
    for (let i = 0; i < 60; i++) {
      const an = (i / 60) * TAU - Math.PI / 2
      const r1 = i % 5 === 0 ? 92 : 97
      ctx.moveTo(X0 + Math.cos(an) * r1 * k, Y0 + Math.sin(an) * r1 * k)
      ctx.lineTo(X0 + Math.cos(an) * 102 * k, Y0 + Math.sin(an) * 102 * k)
    }
    ctx.stroke()
    if (R0 > 54) {
      const fs = clamp(9 * k, 7.5, 12)
      for (let i = 5; i <= 60; i += big ? 5 : 15) {
        const an = (i / 60) * TAU - Math.PI / 2
        text(ctx, String(i), X0 + Math.cos(an) * 83 * k, Y0 + Math.sin(an) * 83 * k + fs * 0.36, { size: fs, color: C.ink2, align: 'center', tracking: 0.02 })
      }
    }
    // subdials
    const sub = (cy: number, n: number, labels: [number, string][], serif: boolean) => {
      const sy0 = Y0 + cy * k
      ctx.strokeStyle = rgba(C.ink, 0.62)
      ctx.beginPath()
      ctx.arc(X0, sy0, 18 * k, 0, TAU)
      for (let i = 0; i < n; i++) {
        const an = (i / n) * TAU - Math.PI / 2
        const r1 = n === 60 ? (i % 5 === 0 ? 13.5 : 15.8) : 14
        ctx.moveTo(X0 + Math.cos(an) * r1 * k, sy0 + Math.sin(an) * r1 * k)
        ctx.lineTo(X0 + Math.cos(an) * 18 * k, sy0 + Math.sin(an) * 18 * k)
      }
      ctx.stroke()
      if (R0 > 110)
        for (const [v, str] of labels) {
          const an = (v / n) * TAU - Math.PI / 2
          const fs = clamp(5.6 * k, 6.5, 9)
          text(ctx, str, X0 + Math.cos(an) * 9.2 * k, sy0 + Math.sin(an) * 9.2 * k + fs * 0.36, { size: fs, font: serif ? 'serif' : 'mono', color: C.muted, align: 'center', tracking: 0 })
        }
    }
    sub(W.y - CW.y, 60, [
      [0, '60'],
      [15, '15'],
      [30, '30'],
      [45, '45'],
    ], false)
    sub(HW.y - CW.y, 12, [
      [0, 'XII'],
      [3, 'III'],
      [6, 'VI'],
      [9, 'IX'],
    ], true)
    // hands
    const hand = (cx: number, cy: number, an: number, len: number, tail: number, wdt: number, color: string) => {
      const ux = Math.sin(an)
      const uy = -Math.cos(an)
      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.moveTo(cx - ux * tail * k, cy - uy * tail * k)
      ctx.lineTo(cx + ux * len * k, cy + uy * len * k)
      ctx.stroke()
      if (wdt > 0) {
        ctx.beginPath()
        ctx.moveTo(cx - uy * wdt * k, cy + ux * wdt * k)
        ctx.lineTo(cx + ux * len * 0.7 * k, cy + uy * len * 0.7 * k)
        ctx.lineTo(cx + uy * wdt * k, cy - ux * wdt * k)
        ctx.stroke()
      }
      ctx.fillStyle = C.paper
      ctx.beginPath()
      ctx.arc(cx, cy, 2 * k + 1.2, 0, TAU)
      ctx.fill()
      ctx.stroke()
    }
    const sAng = ((secs % 60) / 60) * TAU
    const mAng = ((secs / 3600) % 1) * TAU
    const hAng = ((secs / 43200) % 1) * TAU
    hand(X0, Y0 + (HW.y - CW.y) * k, hAng, 13, 3.5, 1.8, C.ink)
    hand(X0, Y0, mAng, 99, 14, 2.6, C.ink)
    hand(X0, Y0 + (W.y - CW.y) * k, sAng, 16.5, 5, 0, C.ocean)
    if (!tiny) {
      const lbl = big && w - (X0 - R0) > 300 ? 'VIEW ON DIAL · SECONDS ON THE ESCAPE ARBOR' : 'VIEW ON DIAL'
      text(ctx, lbl, X0 - R0, Y0 + R0 + 16, { size: 8.5, color: C.muted, tracking: 0.14 })
    }
    ctx.restore()
  }

  /** The strip chart: the anchor's angle (and, in IV, the pendulum's energy) over the last seconds. */
  function drawStrip(T: number) {
    if (!strip.on || hCount < 2) return
    const { x, y, w: sw, h: sh } = strip
    const energyOn = smoothstep(45.2, 46.4, T) * (1 - smoothstep(59, 60, T))
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    ctx.moveTo(x, y + sh / 2)
    ctx.lineTo(x + sw, y + sh / 2)
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + sh)
    ctx.stroke()
    // lift bands: where the escapement acts (± lift)
    const k = sh / 2 / (5 * DEG)
    ctx.fillStyle = rgba(C.moss, 0.07)
    ctx.fillRect(x, y + sh / 2 - (IMP / 2 + CC) * k, sw, (IMP + LOCKA) * k)
    // the trace, coloured by phase
    const n = hCount
    const dxs = sw / (HN - 1)
    for (const ph of [0, 1, 2] as const) {
      ctx.strokeStyle = [C.ocean, C.moss, C.fern][ph]
      ctx.beginPath()
      let pen = false
      for (let i = 0; i < n; i++) {
        const idx = (hHead - n + i + HN) % HN
        const xx = x + sw - (n - 1 - i) * dxs
        const yy = y + sh / 2 + hPsi[idx] * k
        if (hPh[idx] === ph) {
          if (!pen) {
            const pi = (idx - 1 + HN) % HN
            if (i > 0) ctx.moveTo(xx - dxs, y + sh / 2 + hPsi[pi] * k)
            else ctx.moveTo(xx, yy)
          }
          ctx.lineTo(xx, yy)
          pen = true
        } else pen = false
      }
      ctx.stroke()
    }
    if (energyOn > 0.01) {
      // the pendulum's energy (relative to its running level): a sawtooth, down with friction, up at each impulse
      const ey0 = y + sh + 22
      const eh = sh * 0.8
      let mean = 0
      for (let i = 0; i < n; i++) mean += hE[(hHead - n + i + HN) % HN]
      mean = mean / n || 1
      const eY = (e: number) => ey0 + eh - clamp((e / mean - 0.94) / 0.12) * eh
      ctx.globalAlpha = energyOn
      ctx.strokeStyle = rgba(C.ink, 0.3)
      ctx.beginPath()
      ctx.moveTo(x, ey0)
      ctx.lineTo(x, ey0 + eh)
      ctx.stroke()
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(x, eY(1))
      ctx.lineTo(x + sw, eY(1))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineWidth = 1.2
      for (const ph of [0, 1, 2] as const) {
        ctx.strokeStyle = [C.ink, C.moss, C.fern][ph]
        ctx.beginPath()
        let pen = false
        for (let i = 1; i < n; i++) {
          const idx = (hHead - n + i + HN) % HN
          const pi = (idx - 1 + HN) % HN
          const xx = x + sw - (n - 1 - i) * dxs
          if (hPh[idx] === ph) {
            if (!pen) ctx.moveTo(xx - dxs, eY(hE[pi]))
            ctx.lineTo(xx, eY(hE[idx]))
            pen = true
          } else pen = false
        }
        ctx.stroke()
      }
      ctx.lineWidth = 1
      if (mode === 'wide') text(ctx, 'E / E₀', x - 4, eY(1) + 3, { size: 8, color: C.muted, align: 'right' })
      const lost = ((100 * Math.PI) / Q).toFixed(1)
      text(ctx, sw >= 400 ? `ENERGY: ${lost}% LOST EACH SWING, GIVEN BACK BY EACH IMPULSE` : sw >= 280 ? `ENERGY · −${lost}% A SWING · + EACH IMPULSE` : `ENERGY · −${lost}% A SWING`, x + 4, ey0 + eh + 13, { size: 8.5, color: C.ink, tracking: 0.1 })
      ctx.globalAlpha = 1
    }
    text(ctx, 'ANCHOR ANGLE ψ, LAST 7 S', x + 4, y + sh + 13, { size: 8.5, color: C.muted, tracking: 0.12 })
    const inside = mode === 'portrait'
    text(ctx, '+5°', inside ? x + 4 : x - 4, y + (inside ? 9 : 4), { size: 8, color: C.muted, align: inside ? 'left' : 'right' })
    text(ctx, '−5°', inside ? x + 4 : x - 4, y + sh - (inside ? 2 : 0), { size: 8, color: C.muted, align: inside ? 'left' : 'right' })
    // legend
    let lx = x + sw
    for (const [lbl, col] of [
      ['DROP', C.fern],
      ['IMPULSE', C.moss],
      ['LOCK', C.ocean],
    ] as const) {
      setFont(ctx, { size: 8, tracking: 0.12 })
      const lw = ctx.measureText(lbl).width
      text(ctx, lbl, lx, y - 6, { size: 8, color: col, align: 'right', tracking: 0.12 })
      lx -= lw + 12
    }
    ctx.restore()
  }

  /** Labels for the exploded view, each on a leader to its part. */
  function explodedLabels() {
    if (ex < 0.4 || tiny) return
    if (mode === 'compact') {
      // no room for leaders: a few names set beside their parts
      const a2 = smoothstep(0.4, 0.9, ex)
      ctx.save()
      ctx.globalAlpha = a2
      for (const [lbl, x, y, lv] of [
        ['ANCHOR', 8, -6, 2.6],
        ['ESCAPE WHEEL', 28, W.y, 1.8],
        ['CENTRE WHEEL', 30, CW.y - 10, 0],
        ['GREAT WHEEL', BW.x - 10, BW.y + 40, -1],
      ] as [string, number, number, number][]) {
        const o = off(lv)
        const X0 = sx(x + o.x)
        const Y0 = sy(y + o.y)
        setFont(ctx, { size: 8, tracking: 0.12 })
        const lw = ctx.measureText(lbl).width
        const lx = clamp(X0, m, w - m - lw)
        ctx.fillStyle = rgba(C.paper, 0.9)
        ctx.fillRect(lx - 2, Y0 - 8, lw + 4, 11)
        text(ctx, lbl, lx, Y0, { size: 8, color: C.ocean, tracking: 0.12 })
      }
      ctx.restore()
      return
    }
    const a = smoothstep(0.4, 0.9, ex)
    const items: { key: string; x: number; y: number; lv: number; label: string; note: string; side: number }[] = [
      { key: 'anchor', x: -24, y: 10, lv: 2.6, label: 'ANCHOR', note: 'pallets span 7½ teeth', side: -1 },
      { key: 'escape', x: 26, y: W.y - 10, lv: 1.8, label: 'ESCAPE WHEEL', note: '30 teeth · 1 turn a minute', side: 1 },
      { key: 'third', x: TW.x + 17, y: TW.y, lv: 1, label: 'THIRD WHEEL', note: '48 · pinion 8', side: 1 },
      { key: 'centre', x: -36, y: CW.y, lv: 0, label: 'CENTRE WHEEL', note: '80 · 1 turn an hour', side: -1 },
      { key: 'great', x: BW.x + 50, y: BW.y + 20, lv: -1, label: 'GREAT WHEEL', note: '96 · barrel and cord', side: 1 },
      { key: 'hour', x: -14, y: HW.y + 14, lv: 3.4, label: 'MOTION WORK', note: '12 : 1 to the hour hand', side: -1 },
      { key: 'plate', x: -50, y: 150, lv: -2, label: 'BACK PLATE', note: '', side: -1 },
    ]
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    for (const it of items) {
      const o = off(it.lv)
      const X0 = sx(it.x + o.x)
      const Y0 = sy(it.y + o.y)
      const lx = it.side < 0 ? Math.max(m, mvL - 6) : Math.min(w - m, mvR + 6)
      const ly = Y0 - 12
      ctx.strokeStyle = rgba(C.ocean, 0.6)
      ctx.beginPath()
      ctx.moveTo(X0, Y0)
      ctx.lineTo(X0 + it.side * 10, ly)
      ctx.lineTo(lx, ly)
      ctx.stroke()
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(X0, Y0, 2, 0, TAU)
      ctx.fill()
      text(ctx, it.label, lx, ly - 4, { size: 9, color: C.ocean, align: it.side < 0 ? 'right' : 'left', tracking: 0.14 })
      if (it.note && !small) text(ctx, it.note, lx, ly + 10, { size: 8.5, color: C.muted, align: it.side < 0 ? 'right' : 'left', tracking: 0.08 })
    }
    ctx.restore()
  }

  /** Arbor guides: dashed lines along which the exploded parts slide. */
  function arborGuides() {
    if (ex < 0.02) return
    ctx.save()
    ctx.globalAlpha = Math.min(1, ex * 1.5) * 0.6
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    for (const p of [
      { x: 0, y: 0, a: -2, b: 3 },
      { x: W.x, y: W.y, a: -2, b: 2.4 },
      { x: TW.x, y: TW.y, a: -2, b: 1.4 },
      { x: CW.x, y: CW.y, a: -2, b: 3.8 },
      { x: BW.x, y: BW.y, a: -2, b: 0.4 },
      { x: HW.x, y: HW.y, a: -2, b: 3.8 },
    ]) {
      const o1 = off(p.a)
      const o2 = off(p.b)
      ctx.moveTo(sx(p.x + o1.x), sy(p.y + o1.y))
      ctx.lineTo(sx(p.x + o2.x), sy(p.y + o2.y))
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  function captionAt(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      let size = capSize
      let widest = 0
      for (const ln of cap.lines) {
        setFont(ctx, { font: 'serif', size })
        let wv = ln.s ? ctx.measureText(ln.s).width : 0
        setFont(ctx, { font: 'serif', size, italic: true })
        wv += ln.em ? ctx.measureText(ln.em).width : 0
        widest = Math.max(widest, wv)
      }
      if (widest > capW) size = Math.max(11, Math.floor((size * capW) / widest))
      const lineH = size * 1.06
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = capY + size + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - size * 1.02, w, size * 1.32)
        ctx.clip()
        const dy = (1 - pr) * size * 1.15 - pe * size * 0.9
        setFont(ctx, { font: 'serif', size })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size, color: C.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function chrome(T: number) {
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    text(ctx, small ? `${FIG} — ESCAPEMENT` : `${FIG} — ESCAPEMENT · GRAHAM DEADBEAT, c. 1715`, m + 2, m + (small ? 8 : 10), { size: small ? 8.5 : 10, color: C.muted, tracking: 0.16 })
    if (!small) text(ctx, `${CHAPTERS[ch].num} — ${CHAPTERS[ch].name.toUpperCase()}`, m + 2, m + 26, { size: 9, color: C.ink2, tracking: 0.14 })
    // readouts, top right
    const bph = Math.round(7200 / period)
    const rate = 86400 * (2 / period - 1)
    // no honest period while the pendulum is held, stopped, or has just been let go
    const live = !stopped && !dragging && !held && lastZc > 0
    const items: [string, string][] = [['BPH', live ? bph.toLocaleString('en-US') : '—']]
    if (!tiny && w >= 420) items.push(['BEAT', live ? `${(period / 2).toFixed(3)} S` : '—'])
    items.push(['AMPL.', `${(ampMeas / DEG).toFixed(1)}°`])
    if (!small) items.push(['RATE', live ? `${rate >= 0 ? '+' : '−'}${Math.abs(rate).toFixed(1)} S/DAY` : '—'])
    if (!small) items.push(['ℓ', `${ell.toFixed(1)} MM`])
    const vs = small ? 9 : 10.5
    if (small && !preview) {
      let x = w - m - 2
      const y = m + 8
      for (let i = items.length - 1; i >= 0; i--) {
        const [l, v] = items[i]
        setFont(ctx, { size: vs, tracking: 0.06 })
        const vw = ctx.measureText(v).width
        text(ctx, v, x, y, { size: vs, color: C.ink, align: 'right', tracking: 0.06 })
        setFont(ctx, { size: 8.5, tracking: 0.14 })
        const lw = ctx.measureText(l).width
        text(ctx, l, x - vw - 6, y, { size: 8.5, color: C.muted, align: 'right', tracking: 0.14 })
        x -= vw + lw + 16
      }
    } else if (!preview) {
      let y = m + 10
      for (const [l, v] of items) {
        setFont(ctx, { size: vs, tracking: 0.06 })
        const vw = ctx.measureText(v).width
        text(ctx, v, w - m - 2, y, { size: vs, color: C.ink, align: 'right', tracking: 0.06 })
        text(ctx, l, w - m - 2 - vw - 10, y, { size: 9, color: C.muted, align: 'right', tracking: 0.14 })
        y += 16
      }
    } else {
      text(ctx, `${bph.toLocaleString('en-US')} BPH`, w - m - 2, m + 8, { size: 9, color: C.ink, align: 'right', tracking: 0.08 })
    }
    // status
    if (!preview && (stopped || (!held && ampMeas < IMP / 2 + CC + 0.2 * DEG && simT > 6))) {
      const lbl = stopped ? (small ? 'STOPPED · TAP TO START' : 'STOPPED · TAP OR SPACE TO START') : 'AMPLITUDE BELOW THE LIFT · THE CLOCK STOPS'
      text(ctx, lbl, (mvL + mvR) / 2, Math.max(m + 36, mvT - 4), { size: 9, color: C.ocean, align: 'center', tracking: 0.14 })
    }
  }

  function specBlock() {
    if (!specOn) return
    const rows: [string, string][] = [
      ['ESCAPE WHEEL', '30 TEETH · 26 MM'],
      ['PALLETS SPAN', '7½ TEETH (90°)'],
      ['LOCK · IMPULSE', `${(LOCKA / DEG).toFixed(1)}° · ${(IMP / DEG).toFixed(1)}°`],
      ['IMPULSE · DROP', `${(IMPULSE_WHEEL / DEG).toFixed(1)}° · ${(DROP / DEG).toFixed(1)}° OF WHEEL`],
      ['PENDULUM', `${ell.toFixed(1)} MM · T 2 S`],
      ['TRAIN', '8/48 · 8/80 → 1 : 60'],
      ['MOTION WORK', '12/36 · 10/40 → 1 : 12'],
      ['Q (THIS MODEL)', `${Q}`],
    ]
    const x = capX
    let y = specY
    const rowH = 17
    text(ctx, 'SPECIFICATION', x, y, { size: 9, color: C.muted, tracking: 0.14 })
    y += 8
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, Math.round(y) + 0.5)
    ctx.lineTo(x + Math.min(capW, 250), Math.round(y) + 0.5)
    ctx.stroke()
    y += rowH
    for (const [l, v] of rows) {
      if (y > h - m - 6) break
      text(ctx, l, x, y, { size: 8.5, color: C.muted, tracking: 0.12 })
      text(ctx, v, x + 108, y, { size: 8.5, color: C.ink, tracking: 0.08 })
      y += rowH
    }
  }

  /** Part names on hover. */
  function hoverLabel() {
    if (!hoverKey || preview || ex > 0.3) return
    const names: Record<string, [string, string]> = {
      escape: ['ESCAPE WHEEL', '30 teeth · turns once a minute · carries the seconds hand'],
      anchor: ['ANCHOR (PALLETS)', 'locks the wheel, takes its push, lets one tooth go per beat'],
      crutch: ['CRUTCH', 'couples the anchor to the pendulum rod'],
      rod: ['PENDULUM ROD', 'shown broken: true length ' + ell.toFixed(1) + ' mm'],
      bob: ['BOB AND RATING NUT', 'drag ↔ to swing it · drag ↕ to move the nut'],
      third: ['THIRD WHEEL', '48 teeth on a pinion of 8'],
      centre: ['CENTRE WHEEL', '80 teeth · turns once an hour · minute hand'],
      great: ['GREAT WHEEL AND BARREL', '96 teeth · the weight’s cord winds here'],
      minute: ['MINUTE WHEEL', 'motion work: 36 teeth on a pinion of 10'],
      hour: ['HOUR WHEEL', '40 teeth · once round in twelve hours'],
      weight: ['DRIVING WEIGHT', 'falls 8.5 mm an hour · the clock’s only energy'],
      dial: ['REGULATOR DIAL', 'seconds above · minutes at the centre · hours below'],
      plate: ['PLATES', 'shown as glass, in phantom line'],
    }
    const nm = names[hoverKey]
    if (!nm) return
    const x = hoverPt.x + 14
    const y = hoverPt.y - 12
    setFont(ctx, { size: 9.5, tracking: 0.14 })
    const w1 = ctx.measureText(nm[0]).width
    setFont(ctx, { size: 8.5, tracking: 0.06 })
    const w2 = ctx.measureText(nm[1]).width
    const bw = Math.max(w1, w2) + 12
    const bx = clamp(x, m, w - m - bw)
    const by = clamp(y - 14, m, h - m - 34)
    ctx.fillStyle = rgba(C.paper, 0.94)
    ctx.fillRect(bx - 2, by - 2, bw + 4, 34)
    ctx.strokeStyle = rgba(C.ocean, 0.6)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(bx - 2) + 0.5, Math.round(by - 2) + 0.5, Math.round(bw + 4), 34)
    text(ctx, nm[0], bx + 5, by + 12, { size: 9.5, color: C.ocean, tracking: 0.14 })
    text(ctx, nm[1], bx + 5, by + 26, { size: 8.5, color: C.ink2, tracking: 0.06 })
  }

  /* -------------------------------------------------------------- input */

  const hoverPt = { x: 0, y: 0 }
  let touch = false
  let downAt: { x: number; y: number; ms: number; onBob: boolean; ell: number } | null = null
  let dragThPrev = 0
  let dragTPrev = 0

  /** The pendulum's screen geometry, for hit tests. */
  function bobScreen() {
    return { x: sx(Math.sin(th) * dRod), y: sy(Math.cos(th) * dRod) }
  }

  function hitPart(x: number, y: number): string {
    const dialShown = mode !== 'wide' || detailAt(storyT(lastT)) < 0.5
    if (dialShown && Math.hypot(x - dial.x, y - dial.y) < dial.r) return 'dial'
    if (x < mvL - 10 || x > mvR + 10) return ''
    const wx = (x - vx) / S
    const wy = (y - vy) / S
    const b = bobScreen()
    const pad = touch ? 16 : 7
    const ca = Math.cos(th)
    const sa = Math.sin(th)
    const ux = (x - b.x) * ca - (y - b.y) * sa
    const uy = (x - b.x) * sa + (y - b.y) * ca
    if (Math.abs(ux) < 25 * S + pad && Math.abs(uy) < 13 * S + pad + 4) return 'bob'
    if (Math.abs(wx - (BW.x + 13)) < 12 && wy > 212 && wy < 276) return 'weight'
    // along the rod below the plate
    const along = wx * Math.sin(th) + wy * Math.cos(th)
    const across = wx * Math.cos(th) - wy * Math.sin(th)
    if (along > 192 && along < dRod && Math.abs(across) * S < (touch ? 16 : 9)) return 'rod'
    const dA = Math.hypot(wx, wy)
    if (dA < 31 && wy > -8 && wy < 26 && Math.abs(Math.hypot(wx, wy) - R_TIP) < 6) return 'anchor'
    if (dA < 8) return 'anchor'
    if (Math.hypot(wx - W.x, wy - W.y) < R_TIP + 1) return 'escape'
    if (along > 26 && along < 82 && Math.abs(across) < 5) return 'crutch'
    if (Math.hypot(wx - HW.x, wy - HW.y) < 17) return 'hour'
    if (Math.hypot(wx - MW.x, wy - MW.y) < 15) return 'minute'
    if (Math.hypot(wx - TW.x, wy - TW.y) < 17.5) return 'third'
    if (Math.hypot(wx - CW.x, wy - CW.y) < 37) return 'centre'
    if (Math.hypot(wx - BW.x, wy - BW.y) < 54) return 'great'
    if (wx > -50 && wx < 102 && wy > -18 && wy < 194) return 'plate'
    return ''
  }

  function toggleStop() {
    if (held) {
      held = false
      return
    }
    stopped = !stopped
    lastZc = -1
    if (!stopped) {
      // a push to start it again
      om = (th > 0 ? -1 : 1) * AMP_EQ * w0 * 1.1
      if (Math.abs(th) > 0.5 * DEG) om = 0
      if (Math.abs(om) < 1e-6 && Math.abs(th) < 0.5 * DEG) om = AMP_EQ * w0
    }
    sfx.tone(stopped ? 196 : 294, 0.3, { type: 'sine', gain: 0.04, room: 0.3 })
  }

  function setLength(v: number) {
    ell = clamp(v, L_MIN, L_MAX)
    w0 = Math.sqrt(G / (ell / 1000))
  }

  /* -------------------------------------------------------------- frame */

  let prevStory = -1

  /** Chapter IV: at each impulse, a small arrow at the bob in the direction the push goes. */
  function impulseMark(T: number) {
    const on = smoothstep(45.2, 46.4, T) * (1 - smoothstep(58.5, 60, T))
    if (on <= 0.01 || contactNow !== 'impulse' || preview) return
    const b = bobScreen()
    const dir = contactSide === 'E' ? 1 : -1
    const ax = sx(0)
    const ay = sy(0)
    const R2 = Math.hypot(b.x - ax, b.y - ay) + 24 * S + 10
    const a0 = Math.PI / 2 - th
    const a1 = a0 - dir * 4 * DEG
    ctx.save()
    ctx.globalAlpha = on
    ctx.strokeStyle = C.moss
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(ax, ay, R2, Math.min(a0, a1), Math.max(a0, a1))
    ctx.stroke()
    const ex2 = ax + Math.cos(a1) * R2
    const ey2 = ay + Math.sin(a1) * R2
    const tx = -Math.sin(a1) * -dir
    const ty = Math.cos(a1) * -dir
    ctx.beginPath()
    ctx.moveTo(ex2 - tx * 6 + ty * 3, ey2 - ty * 6 - tx * 3)
    ctx.lineTo(ex2, ey2)
    ctx.lineTo(ex2 - tx * 6 - ty * 3, ey2 - ty * 6 + tx * 3)
    ctx.stroke()
    if (!small) text(ctx, '+ IMPULSE', ex2 + dir * 10, ey2 + 14, { size: 9, color: C.moss, align: dir > 0 ? 'left' : 'right', tracking: 0.14 })
    ctx.restore()
  }

  function record(dt: number) {
    hAcc += dt
    const every = 1 / 60
    while (hAcc >= every) {
      hAcc -= every
      hPsi[hHead] = psi
      hE[hHead] = energy()
      hPh[hHead] = contactNow === 'lock' ? 0 : contactNow === 'impulse' ? 1 : 2
      hHead = (hHead + 1) % HN
      if (hCount < HN) hCount++
    }
  }

  function ghost(t: number, T: number) {
    if (preview || acted || t < 4.2 || t > 10.2) return
    const u = (t - 4.2) / 6
    const al = smoothstep(0, 0.1, u) * (1 - smoothstep(0.88, 1, u))
    const b = bobScreen()
    const rr = Math.max(14, 30 * S)
    ctx.save()
    ctx.globalAlpha = al
    ctx.strokeStyle = rgba(C.ocean, 0.75)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(b.x, b.y, rr, 0, TAU)
    ctx.stroke()
    // a dotted arc along the swing, and a dot that pulls out along it
    const ax = sx(0)
    const ay = sy(0)
    const R2 = Math.hypot(b.x - ax, b.y - ay)
    ctx.setLineDash([1.5, 3.5])
    ctx.beginPath()
    ctx.arc(ax, ay, R2, Math.PI / 2 - 8 * DEG, Math.PI / 2 + 8 * DEG)
    ctx.stroke()
    ctx.setLineDash([])
    const pulse = (u * 2) % 1
    const e = ease.inOutSine(clamp(pulse * 1.25))
    const an = Math.PI / 2 - th - e * 7 * DEG
    ctx.globalAlpha = al * (1 - smoothstep(0.85, 1, pulse))
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(ax + Math.cos(an) * R2, ay + Math.sin(an) * R2, 3.2, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = al
    const label = small ? 'DRAG THE BOB · TAP TO STOP' : touch ? 'DRAG THE BOB ↔ SWING · ↕ RATE · TAP TO STOP' : 'DRAG THE BOB ↔ TO SWING, ↕ TO RATE · CLICK TO STOP'
    setFont(ctx, { size: 9, tracking: 0.14 })
    if (mode === 'compact') {
      // no room under the drawing: set the hint in the caption's column, clear of the mechanism
      const full = ctx.measureText(label).width
      const lines = full <= capW ? [label] : label.split(' · ')
      const lh = 13
      const sideBySide = w / h >= 1.9
      const y0 = sideBySide ? capY - 8 - (lines.length - 1) * lh : capY + capSize * 2.3 + 16
      lines.forEach((ln, i) => {
        const lw2 = ctx.measureText(ln).width
        const yy = y0 + i * lh
        if (yy > h - m - 2) return
        ctx.fillStyle = rgba(C.paper, 0.9)
        ctx.fillRect(capX - 3, yy - 10, lw2 + 6, 13)
        text(ctx, ln, capX, yy, { size: 9, color: C.ocean, tracking: 0.14 })
        setFont(ctx, { size: 9, tracking: 0.14 })
      })
    } else {
      const lw = ctx.measureText(label).width
      const lx = clamp(b.x - lw / 2, m, w - m - lw)
      const ly = Math.min(h - m - 4, Math.max(b.y + rr + 16, sy(Math.cos(th) * (dRod + 52)) + 12))
      ctx.fillStyle = rgba(C.paper, 0.88)
      ctx.fillRect(lx - 3, ly - 10, lw + 6, 14)
      text(ctx, label, lx, ly, { size: 9, color: C.ocean, tracking: 0.14 })
    }
    ctx.restore()
    void T
  }


  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      hoverPt.x = p.x
      hoverPt.y = p.y
      if (p.type === 'leave') {
        hoverKey = ''
        if (dragging) {
          dragging = false
          om = 0
        }
        downAt = null
        env.setCursor('default')
        return
      }
      if (p.type === 'down') {
        const part = hitPart(p.x, p.y)
        const onBob = part === 'bob' || part === 'rod'
        downAt = { x: p.x, y: p.y, ms: performance.now(), onBob, ell }
        if (onBob) {
          dragging = true
          held = false
          stopped = false
          acted = true
          dragThPrev = th
          dragTPrev = performance.now()
          env.setCursor('grabbing')
        }
        return
      }
      if (p.type === 'move') {
        if (dragging && downAt) {
          // ↔ the angle about the arbor; ↕ the rating nut (bob only)
          const ax = sx(0)
          const ay = sy(0)
          const ang = Math.atan2(p.x - ax, Math.max(20, p.y - ay))
          const nt = clamp(ang, -9 * DEG, 9 * DEG)
          const nowMs = performance.now()
          const dtm = Math.max(1, nowMs - dragTPrev) / 1000
          om = lerp(om, (nt - dragThPrev) / dtm, 0.3)
          dragThPrev = nt
          dragTPrev = nowMs
          th = nt
          if (hoverKey === 'bob' || downAt.onBob) {
            const dyp = p.y - downAt.y
            if (Math.abs(dyp) > 6 && hoverKey !== 'rod') setLength(downAt.ell + (dyp / S) * 1.6)
          }
          env.setCursor('grabbing')
          return
        }
        hoverKey = hitPart(p.x, p.y)
        env.setCursor(hoverKey === 'bob' || hoverKey === 'rod' ? 'grab' : 'pointer')
        return
      }
      if (p.type === 'up') {
        if (dragging) {
          dragging = false
          lastZc = -1
          ampRun = 0
          // let go from rest if it was held still
          if (performance.now() - dragTPrev > 80) om = 0
          om = clamp(om, -0.5, 0.5)
          env.setCursor('grab')
        } else if (downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < (touch ? 16 : 10) && performance.now() - downAt.ms < 450) {
          acted = true
          toggleStop()
        }
        downAt = null
      }
    },
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (down) {
          const T = storyT(lastT)
          if (code === 'ArrowRight') {
            const next = CHAPTERS.find((c) => c.t > T + 0.01)
            storyOff += (next ? next.t : LOOP) - T
          } else {
            const i = CHAPTERS.reduce((acc, c, idx) => (T >= c.t ? idx : acc), 0)
            const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
            storyOff += target - T
          }
        }
        return true
      }
      if (code === 'ArrowUp' || code === 'ArrowDown') {
        if (down) {
          setLength(ell + (code === 'ArrowUp' ? -0.5 : 0.5))
          acted = true
        }
        return true
      }
      if (code === 'KeyR') {
        if (down) setLength(L_RATED)
        return true
      }
      if (code === 'Space' || code === 'Enter') {
        if (down) {
          acted = true
          toggleStop()
        }
        return true
      }
      return false
    },
    frame(t, dt) {
      lastT = t
      if (env.params.has('hover')) {
        hoverKey = env.params.get('hover') ?? ''
        hoverPt.x = w * 0.5
        hoverPt.y = h * 0.4
      }
      if (prevStory < 0 && env.params.has('at') && Number.isFinite(at)) {
        // a seek: run the clock up to the requested moment
        for (let i = 0; i < Math.min(at, 120) * 60; i++) {
          if (held && simT > 1.3) held = false
          step(1 / 60)
          record(1 / 60)
        }
      }
      if (held && (simT > 1.3 || preview)) held = false
      if (dt > 0) {
        step(dt)
        record(dt)
      }
      flash = Math.max(0, flash - dt * 2.2)
      const T = storyT(t)
      ex = explodeAt(T)
      const det = detailAt(T)

      ground(ctx, w, h, 'paper')
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(C.ink, 0.5)
      cropMarks(ctx, m * 0.5, m * 0.5, w - m, h - m, preview ? 7 : 10)

      const appear = preview || env.params.has('at') ? 1 : ease.outCubic(clamp(t / 1.4))
      // compact layouts zoom the movement onto the escapement for chapter II
      const zoom = mode === 'compact' && !preview ? ease.inOutCubic(det) : 0
      const kz = lerp(S, Math.min((mvR - mvL) / 66, (mvB - mvT) / 74), zoom)
      const czx = lerp(vx, (mvL + mvR) / 2 - W.x * kz, zoom)
      const czy = lerp(vy, (mvT + mvB) / 2 - 26 * kz, zoom)
      ctx.save()
      ctx.beginPath()
      if (mode === 'compact') ctx.rect(mvL - 4, mvT - 4, mvR - mvL + 8, mvB - mvT + 8)
      else ctx.rect(0, 0, w, h)
      ctx.clip()
      arborGuides()
      const op = off(-3)
      const savedS = S
      const savedVx = vx
      const savedVy = vy
      S = kz
      vx = czx
      vy = czy
      drawPendulum(S, op.x, op.y, appear)
      drawWeight(S, off(-1).x, off(-1).y, appear)
      drawMovement(S, vx, vy, appear, false)
      S = savedS
      vx = savedVx
      vy = savedVy
      ctx.restore()
      explodedLabels()
      impulseMark(T)

      // right column: the dial, or detail A during chapter II
      const dialA = mode === 'compact' ? 1 : 1 - det
      if (mode === 'portrait') {
        drawDial(1)
        drawDetail(det)
      } else {
        drawDial(dialA * appear * (mode === 'wide' ? 1 - 0.88 * ex : 1))
        if (mode === 'wide') drawDetail(det)
      }
      if (mode === 'compact' && zoom > 0.6 && !tiny) {
        const pw2 = contactNow === 'lock' ? 'LOCK' : contactNow === 'impulse' ? 'IMPULSE' : 'DROP'
        text(ctx, pw2, (mvL + mvR) / 2, mvB - 6, { size: 11, color: PHASE_COL[contactNow], align: 'center', tracking: 0.18 })
      }
      drawStrip(T)
      if (!preview) captionAt(T)
      specBlock()
      chrome(T)
      hoverLabel()
      ghost(t, T)
      prevStory = T
    },
  }

}

export default create
