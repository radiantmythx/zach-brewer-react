/*
 * S.03 — EVENT HORIZON
 *
 * Light falling past a black hole, computed rather than drawn. Rays are null
 * geodesics of the Schwarzschild metric (G = c = 1, lengths in units of the
 * mass M). In the orbit plane a photon obeys the Binet equation
 *
 *     d²u/dφ² = 3Mu² − u,      u = 1/r,
 *
 * which is the same orbit as a Newtonian particle under the force
 * −3L²r̂/r⁴ (M = 1), so the fan is integrated in Cartesian form with RK4 and
 * the conserved angular momentum L = b (the impact parameter). Schwarzschild
 * coordinate time dt = dλ / (1 − 2M/r) runs alongside, so the wavefronts are
 * true isochrones: they dent behind the hole (Shapiro delay) and freeze on the
 * horizon, where a distant clock never sees light cross.
 *
 * The second view is a thin disk seen nearly edge-on, ray-traced backwards by
 * inverse mapping: for every image point (b, ψ) the photon's own orbit plane
 * is solved once, in a table u(φ; b), and the disk is found where the orbit
 * crosses the disk plane (Luminet, 1979). The disk is drawn as isoradials,
 * hairline images of its rings, each segment coloured by the blackbody of its
 * Doppler- and gravitationally-shifted temperature and weighted by g⁴. The
 * view then tilts toward face-on, like M87* in the EHT image of 2019.
 *
 * Five chapters, 76 s, a pure function of time (seek with ?at=…):
 *   I    Light falls          a plane wave arrives; the fan bends
 *   II   The horizon          r = 2M; the band |b| < 3√3 M is captured
 *   III  The photon sphere    r = 3M; one ray circles once and escapes
 *   IV   A disk, edge-on      the far side lifted above and below the hole
 *   V    The shadow           tilted toward us: the shadow and photon ring
 */

import { C, TAU, clamp, cropMarks, dimension, ease, ground, hatch, lerp, rgba, setFont, smoothstep, text } from '../kit'
import { blackbody, css } from '../color'
import type { CreatePiece, PointerInfo } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.03'
const LOOP = 76
/** critical impact parameter, in M */
const BC = 3 * Math.sqrt(3)
/** innermost stable circular orbit */
const RIN = 6
const V2_IN = 37
const V2_OUT = 72.6

const INK = '#E4ECE8'
const INK2 = '#B9C8C2'
const MUTED = '#8FA39E'
const RULE = 'rgba(238,244,241,0.15)'
const ACC = C.sky
const ACC2 = C.sage
/** a tapped ray: sunlight */
const SUN = css(blackbody(5000))

const CHAPTERS = [
  { t: 0, num: 'I', name: 'Light falls' },
  { t: 13, num: 'II', name: 'The horizon' },
  { t: 24.5, num: 'III', name: 'The photon sphere' },
  { t: V2_IN, num: 'IV', name: 'A disk, edge-on' },
  { t: 55, num: 'V', name: 'The shadow' },
]

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 0.9, t1: 12.3, lines: [{ s: 'Here, light' }, { s: '', em: 'falls too.' }] },
  { t0: 13.6, t1: 23.9, lines: [{ s: 'Past this line,' }, { s: '', em: 'nothing comes back.' }] },
  { t0: 25.3, t1: 36.3, lines: [{ s: 'Around it, light circles' }, { s: 'once ', em: 'and escapes.' }] },
  { t0: 40.2, t1: 54.3, lines: [{ s: 'The far side' }, { s: 'is ', em: 'bent into view.' }] },
  { t0: 61, t1: 71.9, lines: [{ s: 'In 2019,' }, { s: '', em: 'we saw one.' }] },
]

/* ----------------------------------------------------------- the fan */

const MAXR = 104
const FIRE0 = 96 // pool slots 96–103 hold rays fired by a tap
const MAXP = 1500

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'

  /* ------------------------------------------------------- ray pool */
  const RX = new Float32Array(MAXR * MAXP)
  const RY = new Float32Array(MAXR * MAXP)
  const RT = new Float32Array(MAXR * MAXP)
  const RN = new Int32Array(MAXR)
  /** 1 captured, 0 escaped */
  const RF = new Uint8Array(MAXR)
  const RB = new Float32Array(MAXR)
  /** total turning of the velocity (radians, signed) */
  const RD = new Float32Array(MAXR)
  const RMIN = new Float32Array(MAXR)
  let nRays = 0
  let ringClosed = false
  let rayEsc = 0
  let rayCap = 0

  /**
   * Trace one photon from (x0, y0) heading (dx, dy), in units of M, into
   * pool slot i. Returns nothing; fills RX/RY/RT/RN/RF/RB/RD.
   */
  function trace(i: number, x0: number, y0: number, dx: number, dy: number, rmax: number) {
    const base = i * MAXP
    let x = x0
    let y = y0
    let r = Math.hypot(x, y)
    const dl = Math.hypot(dx, dy) || 1
    const nx = dx / dl
    const ny = dy / dl
    // Euclidean speed for unit energy: |v|² (1 − (2/r) sin²α) = 1
    const sinA = (x * ny - y * nx) / r
    const sp = 1 / Math.sqrt(Math.max(1e-6, 1 - (2 / r) * sinA * sinA))
    let vx = nx * sp
    let vy = ny * sp
    const L = x * vy - y * vx
    const k = 3 * L * L
    RB[i] = L
    let t = 0
    let n = 0
    let turn = 0
    let head = Math.atan2(vy, vx)
    let rmin = r
    RX[base] = x
    RY[base] = y
    RT[base] = 0
    n = 1
    let fate = 0
    const ax = (px: number, py: number) => {
      const r2 = px * px + py * py
      return -k / (r2 * r2 * Math.sqrt(r2))
    }
    while (n < MAXP) {
      let h = Math.min(1, 0.035 * r)
      if (r < 3) h = Math.min(h, Math.max(2e-5, 0.3 * (r - 2)))
      // RK4 on (x, y, vx, vy)
      const f1 = ax(x, y)
      const k1x = vx
      const k1y = vy
      const k1vx = f1 * x
      const k1vy = f1 * y
      const x2 = x + 0.5 * h * k1x
      const y2 = y + 0.5 * h * k1y
      const f2 = ax(x2, y2)
      const k2x = vx + 0.5 * h * k1vx
      const k2y = vy + 0.5 * h * k1vy
      const k2vx = f2 * x2
      const k2vy = f2 * y2
      const x3 = x + 0.5 * h * k2x
      const y3 = y + 0.5 * h * k2y
      const f3 = ax(x3, y3)
      const k3x = vx + 0.5 * h * k2vx
      const k3y = vy + 0.5 * h * k2vy
      const k3vx = f3 * x3
      const k3vy = f3 * y3
      const x4 = x + h * k3x
      const y4 = y + h * k3y
      const f4 = ax(x4, y4)
      const k4x = vx + h * k3vx
      const k4y = vy + h * k3vy
      const k4vx = f4 * x4
      const k4vy = f4 * y4
      const nxp = x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x)
      const nyp = y + (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y)
      vx += (h / 6) * (k1vx + 2 * k2vx + 2 * k3vx + k4vx)
      vy += (h / 6) * (k1vy + 2 * k2vy + 2 * k3vy + k4vy)
      const rn = Math.hypot(nxp, nyp)
      // Schwarzschild coordinate time: dt = dλ / (1 − 2/r), midpoint rule
      const rm = Math.max(2.00001, 0.5 * (r + rn))
      t += h / (1 - 2 / rm)
      x = nxp
      y = nyp
      r = rn
      const hd = Math.atan2(vy, vx)
      let dh = hd - head
      if (dh > Math.PI) dh -= TAU
      if (dh < -Math.PI) dh += TAU
      turn += dh
      head = hd
      if (r < rmin) rmin = r
      RX[base + n] = x
      RY[base + n] = y
      RT[base + n] = t
      n++
      if (r < 2.0002) {
        fate = 1
        break
      }
      if (r > rmax && x * vx + y * vy > 0) break
      if (t > 600) break
    }
    RN[i] = n
    RF[i] = fate
    RD[i] = turn
    RMIN[i] = rmin
  }

  /* ---------------------------------------------------- the disk table */
  // u(φ; b) for the photon's backward orbit from the observer (u = 0, u' = 1/b)
  const NB = preview ? 120 : 210
  const DPHI = preview ? 0.009 : 0.0042
  const NPHI = Math.ceil((3 * Math.PI + 0.05) / DPHI) + 2
  const BT = new Float64Array(NB)
  const UT = new Float32Array(NB * NPHI)
  const UEND = new Int32Array(NB)
  /** 1 if captured at the end of its table, 0 if escaped, 2 if still orbiting at 3π */
  const UCAP = new Uint8Array(NB)
  {
    // dense near the critical curve on both sides
    const nIn = Math.round(NB * 0.3)
    for (let k = 0; k < nIn; k++) {
      const q = lerp(0.04, 4.5, Math.pow(k / (nIn - 1), 0.9))
      BT[k] = BC * (1 - Math.pow(10, -q))
    }
    for (let k = nIn; k < NB; k++) {
      const q = lerp(5, -0.92, (k - nIn) / (NB - nIn - 1))
      BT[k] = BC * (1 + Math.pow(10, -q))
    }
    for (let k = 0; k < NB; k++) {
      const b = BT[k]
      let u = 0
      let du = 1 / b
      const base = k * NPHI
      UT[base] = 0
      let j = 1
      let cap = 2
      const f = (uu: number) => 3 * uu * uu - uu
      for (; j < NPHI; j++) {
        const h = DPHI
        const a1 = du
        const b1 = f(u)
        const a2 = du + 0.5 * h * b1
        const b2 = f(u + 0.5 * h * a1)
        const a3 = du + 0.5 * h * b2
        const b3 = f(u + 0.5 * h * a2)
        const a4 = du + h * b3
        const b4 = f(u + h * a3)
        u += (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4)
        du += (h / 6) * (b1 + 2 * b2 + 2 * b3 + b4)
        UT[base + j] = u
        if (u >= 0.5) {
          cap = 1
          break
        }
        if (u <= 0 && du < 0) {
          cap = 0
          break
        }
      }
      UEND[k] = Math.min(j, NPHI - 1)
      UCAP[k] = cap
    }
  }

  /** u of photon k at orbit angle φ: 0.5 if it fell in before, 0 if it escaped before. */
  function uAt(k: number, phi: number) {
    const f = phi / DPHI
    const j = Math.floor(f)
    const e = UEND[k]
    if (j >= e) return UCAP[k] === 1 ? 0.5 : UCAP[k] === 0 ? 0 : UT[k * NPHI + e]
    const a = UT[k * NPHI + j]
    const b = UT[k * NPHI + j + 1]
    const u = a + (b - a) * (f - j)
    return u < 0 ? 0 : u > 0.5 ? 0.5 : u
  }

  /**
   * The impact parameter b at which the order-n image of the ring u = ut
   * lies, for orbit angle φ (the disk-plane crossing). −1 if none.
   */
  function solveB(phi: number, ut: number) {
    // uAt(k, φ) falls from 0.5 (captured) to 0 (escaped) as b grows
    let lo = 0
    let hi = NB - 1
    if (uAt(hi, phi) > ut) return -1
    if (uAt(lo, phi) <= ut) return -1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (uAt(mid, phi) > ut) lo = mid
      else hi = mid
    }
    const ua = uAt(lo, phi)
    const ub = uAt(hi, phi)
    const f = ua === ub ? 0 : (ua - ut) / (ua - ub)
    return BT[lo] + (BT[hi] - BT[lo]) * f
  }

  /** the disk crossing u for order n at (b between table rows k−1, k) */
  function crossU(b: number, phi: number) {
    let lo = 0
    let hi = NB - 1
    if (b <= BT[0]) return uAt(0, phi)
    if (b >= BT[hi]) return uAt(hi, phi)
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (BT[mid] < b) lo = mid
      else hi = mid
    }
    const f = (b - BT[lo]) / (BT[hi] - BT[lo])
    return lerp(uAt(lo, phi), uAt(hi, phi), f)
  }

  /* --------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let portrait = false
  let short = false
  let tiny = false
  let pad = 20
  let capSize = 30
  let capX = 0
  let capY = 0
  let cx = 0
  let cy = 0
  let s = 30
  /** half-extent of the view-1 field, in M */
  let XL = 18
  let YL = 11
  let BMAX = 11
  // view 2
  let dcx = 0
  let dcy = 0
  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    short = h < 380
    tiny = h < 250
    pad = clamp(Math.min(w, h) * 0.045, short ? 12 : 16, 40)
    capSize = portrait ? clamp(Math.min(w * 0.072, h * 0.042), 18, 40) : clamp(Math.min(w * 0.04, h * 0.06), short ? 14 : 20, 48)
    if (preview) capSize = 16
    capX = pad * (portrait ? 1 : 1.4)
    capY = h - pad * (short ? 1.15 : 1.6) - capSize * 2.1 - (preview ? 0 : 10)
    if (portrait) {
      cx = w / 2
      cy = h * 0.42
      s = Math.min((w / 2 - pad) / 7.5, (h * 0.3) / 10)
    } else {
      const wide = w / h
      cx = wide > 2.2 ? w * 0.6 : w * 0.58
      cy = h * (short ? 0.47 : 0.47)
      s = Math.min((h / 2 - pad * 1.6) / (short ? 8.5 : 10.5), (w * 0.4) / 13)
    }
    XL = (cx + 4) / s + 1
    YL = cy / s
    BMAX = Math.min(13, Math.max(7.5, (h * (portrait ? 0.3 : 0.44)) / s))
    dcx = portrait ? w / 2 : w * (short ? 0.62 : 0.6)
    dcy = portrait ? h * 0.42 : h * 0.47
  }
  layout()

  const W2S = (x: number) => cx + x * s
  const W2Sy = (y: number) => cy - y * s

  /* ------------------------------------------------------- the fan */
  let lamp: { x: number; y: number } | null = null
  let fanKey = ''
  let hlSlot = -1
  let bLoop = BC * 1.0012

  /** The height at x0 for a ray heading +x whose impact parameter is exactly b (unit energy). */
  function startY(b: number, x0: number) {
    let y = b
    for (let k = 0; k < 5; k++) {
      const r = Math.hypot(x0, y)
      y = b / Math.sqrt(1 + (2 * b * b) / (r * r * r))
    }
    return y
  }

  function buildFan() {
    const key = lamp ? `${lamp.x.toFixed(3)},${lamp.y.toFixed(3)},${w},${h}` : `pw,${w},${h}`
    if (key === fanKey) return
    fanKey = key
    const rmax = Math.hypot(Math.max(XL, (w - cx) / s), Math.max(YL, (h - cy) / s)) + 3
    const N = preview ? 27 : 47
    const list: number[] = []
    rayEsc = 0
    rayCap = 0
    if (!lamp) {
      ringClosed = false
      // a plane wave from a distant star: parallel rays, dense near ±b_c
      for (let i = 0; i < N; i++) list.push(lerp(-BMAX, BMAX, i / (N - 1)))
      const extra = preview ? [0.03, 0.004] : [0.025, 0.003]
      for (const d of extra) list.push(BC * (1 + d), -BC * (1 + d), BC * (1 - d), -BC * (1 - d))
      list.sort((a, b) => b - a)
      const x0 = -XL
      list.forEach((b, i) => trace(i, x0, startY(b, x0), 1, 0, rmax))
      nRays = list.length
    } else {
      // a lamp: a cone aimed across the hole, wide enough to cover |b| < BMAX
      const d = Math.hypot(lamp.x, lamp.y)
      const base = Math.atan2(-lamp.y, -lamp.x)
      const full = d < BMAX * 1.05
      ringClosed = full
      const half = full ? Math.PI : Math.asin(Math.min(1, BMAX / d)) * 1.04
      const M = full ? N + 12 : N
      for (let i = 0; i < M; i++) {
        const a = full ? base - Math.PI + (TAU * i) / M : base + lerp(half, -half, i / (M - 1))
        trace(i, lamp.x, lamp.y, Math.cos(a), Math.sin(a), rmax)
      }
      nRays = M
    }
    for (let i = 0; i < nRays; i++) {
      if (RF[i]) rayCap++
      else rayEsc++
    }
    // the ray that circles once: deflection 2π, found by bisection
    if (!lamp) {
      hlSlot = nRays
      let lo = BC * (1 + 1e-7)
      let hi = BC * 1.05
      for (let it = 0; it < 44; it++) {
        const mid = 0.5 * (lo + hi)
        trace(hlSlot, -XL, startY(mid, -XL), 1, 0, rmax)
        if (RF[hlSlot] || Math.abs(RD[hlSlot]) > TAU) lo = mid
        else hi = mid
      }
      bLoop = hi
      trace(hlSlot, -XL, startY(bLoop, -XL), 1, 0, rmax)
    } else hlSlot = -1
  }

  // wavefront segments, binned by distance from the hole
  const WCAP = 24000
  const wX0 = new Float32Array(WCAP)
  const wY0 = new Float32Array(WCAP)
  const wX1 = new Float32Array(WCAP)
  const wY1 = new Float32Array(WCAP)
  const wBin = new Uint8Array(WCAP)

  /** The point where ray i is at coordinate time τ (into out). false if not there. */
  const pt = { x: 0, y: 0, end: false }
  function rayAt(i: number, tau: number) {
    const base = i * MAXP
    const n = RN[i]
    if (tau <= 0) {
      pt.x = RX[base]
      pt.y = RY[base]
      pt.end = false
      return true
    }
    if (tau >= RT[base + n - 1]) {
      if (!RF[i]) return false
      // frozen on the horizon, as seen from far away
      pt.x = RX[base + n - 1]
      pt.y = RY[base + n - 1]
      pt.end = true
      return true
    }
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (RT[base + mid] < tau) lo = mid
      else hi = mid
    }
    const f = (tau - RT[base + lo]) / (RT[base + hi] - RT[base + lo] || 1)
    pt.x = RX[base + lo] + (RX[base + hi] - RX[base + lo]) * f
    pt.y = RY[base + lo] + (RY[base + hi] - RY[base + lo]) * f
    pt.end = false
    return true
  }

  /** Stroke ray i up to coordinate time τ (append to the current path). */
  function pathRay(i: number, tau: number) {
    const base = i * MAXP
    const n = RN[i]
    ctx.moveTo(W2S(RX[base]), W2Sy(RY[base]))
    for (let j = 1; j < n; j++) {
      if (RT[base + j] > tau) {
        if (rayAt(i, tau)) ctx.lineTo(W2S(pt.x), W2Sy(pt.y))
        return
      }
      ctx.lineTo(W2S(RX[base + j]), W2Sy(RY[base + j]))
    }
  }

  /* -------------------------------------------------------- the disk */
  const NPSI = preview ? 150 : 260
  const NRING = preview ? 18 : 32
  const RINGS = new Float32Array(NRING)
  for (let k = 0; k < NRING; k++) RINGS[k] = RIN * Math.pow(24 / RIN, k / (NRING - 1))
  // isoradial points: [order][ring][psi] → image (α, β) in M, plus g; NaN when absent
  const ORD = 3
  const IA = new Float32Array(ORD * NRING * NPSI)
  const IB = new Float32Array(ORD * NRING * NPSI)
  const IG = new Float32Array(ORD * NRING * NPSI)
  const COS_PSI = new Float32Array(NPSI)
  const SIN_PSI = new Float32Array(NPSI)
  for (let j = 0; j < NPSI; j++) {
    COS_PSI[j] = Math.cos((TAU * j) / NPSI)
    SIN_PSI[j] = Math.sin((TAU * j) / NPSI)
  }
  let diskKey = ''
  const fluxMax = (1 / Math.pow(8.17, 3)) * (1 - Math.sqrt(RIN / 8.17))
  const flux = (r: number) => Math.max(0, (1 / (r * r * r)) * (1 - Math.sqrt(RIN / r)))

  function buildDisk(incDeg: number, rv: number) {
    const key = `${incDeg.toFixed(2)},${rv.toFixed(1)}`
    if (key === diskKey) return
    diskKey = key
    const inc = (Math.max(0.5, Math.min(89.6, incDeg)) * Math.PI) / 180
    const ci = Math.cos(inc)
    const si = Math.sin(inc)
    for (let j = 0; j < NPSI; j++) {
      const sp = SIN_PSI[j]
      // first crossing of the disk plane: cos φ cos i + sin φ sin ψ sin i = 0
      const phi0 = Math.atan2(-ci, sp * si) + Math.PI
      for (let n = 0; n < ORD; n++) {
        const phi = phi0 + n * Math.PI
        for (let k = 0; k < NRING; k++) {
          const idx = (n * NRING + k) * NPSI + j
          const r = RINGS[k]
          const b = solveB(phi, 1 / r)
          if (b < 0) {
            IA[idx] = NaN
            continue
          }
          // an opaque disk hides the higher-order images behind it
          if (n > 0) {
            const u0 = crossU(b, phi0)
            const r0 = u0 > 0 ? 1 / u0 : 1e9
            if (r0 >= RIN && r0 <= rv + 1) {
              IA[idx] = NaN
              continue
            }
          }
          const al = b * COS_PSI[j]
          const be = b * sp
          IA[idx] = al
          IB[idx] = be
          // redshift of a Keplerian emitter: g = √(1 − 3/r) / (1 + Ω α sin i)
          IG[idx] = Math.sqrt(1 - 3 / r) / (1 + Math.pow(r, -1.5) * al * si)
        }
      }
    }
  }

  // colour bins for disk segments: observed temperature × brightness
  const TB = 20
  const AB = 7
  const binCol: string[] = []
  for (let a = 0; a < TB; a++) {
    const T = 2400 * Math.pow(14000 / 2400, a / (TB - 1))
    binCol.push(css(blackbody(T)))
  }
  const SEGCAP = ORD * NRING * NPSI
  const segX0 = new Float32Array(SEGCAP)
  const segY0 = new Float32Array(SEGCAP)
  const segX1 = new Float32Array(SEGCAP)
  const segY1 = new Float32Array(SEGCAP)
  const segBin = new Int32Array(SEGCAP)
  const segI = new Float32Array(SEGCAP)
  const sortIdx = new Int32Array(SEGCAP)
  const binStart = new Int32Array(TB * AB + 1)
  const binFill = new Int32Array(TB * AB)

  /* ------------------------------------------------------ clock & UI */
  const atP = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 40.5 : 0
  let prevT = -1
  let paused = false
  let interacted = false
  let incUser: number | null = null
  let rotUser = 0
  let incShown = 84
  let readoutBottom = 60
  let testTap: [number, number] | null = null
  {
    const lp = env.params.get('lamp')?.split(',').map(Number)
    if (lp && lp.length === 2 && lp.every(Number.isFinite)) lamp = { x: lp[0], y: lp[1] }
    const tp = env.params.get('tap')?.split(',').map(Number)
    if (tp && tp.length === 2 && tp.every(Number.isFinite)) testTap = [tp[0], tp[1]]
  }
  let lastChapter = 0
  // pointer
  let down: { x: number; y: number; ms: number; id: number; moved: boolean; ruler: boolean; inc0: number; rot0: number } | null = null
  let touch = false
  let scrubX = -1
  // tap-fired rays (view 1) and the inset ray (view 2)
  const fired: { slot: number; t0: number; label: string; ex: number; ey: number }[] = []
  let nextFire = 0
  let inset: { b: number; psi: number; n: number; r: number; g: number; t0: number } | null = null

  const sfx = env.sfx
  let drone: { o: OscillatorNode[]; g: GainNode } | null = null
  function droneSet(level: number) {
    const ac = sfx.context()
    const out = sfx.output()
    if (!ac || !out) {
      if (drone) {
        try {
          drone.o.forEach((o) => o.stop())
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
      lp.frequency.value = 420
      g.connect(lp)
      lp.connect(out)
      const o = [41.2, 61.7, 82.4].map((f, i) => {
        const osc = ac.createOscillator()
        osc.type = i === 1 ? 'triangle' : 'sine'
        osc.frequency.value = f
        osc.detune.value = (i - 1) * 5
        const gg = ac.createGain()
        gg.gain.value = [0.6, 0.25, 0.3][i]
        osc.connect(gg)
        gg.connect(g)
        osc.start()
        return osc
      })
      drone = { o, g }
    }
    drone.g.gain.setTargetAtTime(level * 0.08, ac.currentTime, 0.8)
  }

  const rulerY = () => h - pad * 0.55
  const onRuler = (x: number, y: number) => !preview && !tiny && y > rulerY() - (touch ? 30 : 20) && y < h && x > pad - 8 && x < w - pad + 8
  function curT() {
    return (((prevT < 0 ? 0 : prevT) % LOOP) + LOOP) % LOOP
  }
  function seekTo(target: number) {
    offset += target - curT()
    prevT = target
  }
  function seekX(x: number) {
    let target = clamp((x - pad) / (w - 2 * pad)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 1.6) target = c.t
    seekTo(Math.min(LOOP - 0.05, target))
  }
  function chapterAt(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }
  const view2Mix = (T: number) => smoothstep(V2_IN, V2_IN + 2.4, T) * (1 - smoothstep(V2_OUT, V2_OUT + 2.6, T))

  /** the screen → world (M) map for view 1 */
  const toWorld = (x: number, y: number) => ({ x: (x - cx) / s, y: (cy - y) / s })

  function fire(px: number, py: number, T: number) {
    const p = toWorld(px, py)
    const slot = FIRE0 + (nextFire++ % (MAXR - FIRE0))
    const rmax = Math.hypot(Math.max(XL, (w - cx) / s), Math.max(YL, (h - cy) / s)) + 3
    if (!lamp) trace(slot, -XL, p.y, 1, 0, rmax)
    else trace(slot, lamp.x, lamp.y, p.x - lamp.x, p.y - lamp.y, rmax)
    for (let i = fired.length - 1; i >= 0; i--) if (fired[i].slot === slot) fired.splice(i, 1)
    const loops = Math.abs(RD[slot]) / TAU
    const bent = (Math.abs(RD[slot]) * 180) / Math.PI
    const label = RF[slot] ? 'FELL IN' : loops >= 0.9 ? `CIRCLED ${loops.toFixed(1)}× · ESCAPED` : `ESCAPED · BENT ${bent < 10 ? bent.toFixed(1) : Math.round(bent)}°`
    const base = slot * MAXP + RN[slot] - 1
    fired.push({ slot, t0: T, label, ex: RX[base], ey: RY[base] })
    if (fired.length > MAXR - FIRE0) fired.shift()
    if (RF[slot]) sfx.tone(660, 1.6, { type: 'sine', gain: 0.05, to: 70, room: 0.45 })
    else sfx.tone(440, 1.1, { type: 'sine', gain: 0.045, to: 520 + Math.min(400, bent * 2), room: 0.4 })
  }

  /* -------------------------------------------------------- drawing */

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
        // a soft ground behind the words so rays never cut through them
        if (ln.s) haloText(ln.s, capX, y + dy, { font: 'serif', size: capSize, color: INK })
        if (ln.em) haloText(ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: ACC2 })
        ctx.restore()
      })
    }
  }

  function haloText(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    const lw = ctx.lineWidth
    const ss = ctx.strokeStyle
    setFont(ctx, o)
    const s2 = o?.upper ? str.toUpperCase() : str
    if (o?.font === 'serif') {
      ctx.lineWidth = 5
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(11,29,36,0.82)'
      ctx.strokeText(s2, x, y)
      ctx.lineJoin = 'miter'
    } else {
      // mono labels sit on a small dark plate, so lines never read as underscores
      const tw = ctx.measureText(s2).width
      const sz = o?.size ?? 11
      const x0 = o?.align === 'right' ? x - tw : o?.align === 'center' ? x - tw / 2 : x
      const fs = ctx.fillStyle
      ctx.fillStyle = 'rgba(6,16,21,0.78)'
      ctx.fillRect(x0 - 3, y - sz * 0.92, tw + 6, sz * 1.3)
      ctx.fillStyle = fs
    }
    text(ctx, str, x, y, o)
    ctx.lineWidth = lw
    ctx.strokeStyle = ss
  }

  /** A leader line from a point to a mono label, flipped to stay on screen. */
  function callout(px: number, py: number, dx: number, dy: number, str: string, col: string = INK) {
    setFont(ctx, { size: 9, tracking: 0.14 })
    const tw = ctx.measureText(str).width
    let sx = dx >= 0 ? 1 : -1
    if (sx > 0 && px + dx + 14 + tw > w - pad * 0.6) sx = -1
    else if (sx < 0 && px - Math.abs(dx) - 14 - tw < pad * 0.6) sx = 1
    const ex = px + sx * Math.abs(dx)
    const ey = clamp(py + dy, pad * 2.2 + 10, h - pad * 1.2)
    ctx.strokeStyle = rgba(col, 0.55)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(ex, ey)
    ctx.lineTo(ex + sx * 10, ey)
    ctx.stroke()
    haloText(str, ex + sx * 14, ey + 3, { size: 9, color: col, align: sx > 0 ? 'left' : 'right', tracking: 0.14 })
  }

  function chrome(T: number, readouts: [string, string][]) {
    const small = preview || Math.min(w, h) < 420
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.4)
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, small ? 7 : 10)
    // header
    const hy = pad + (small ? 5 : 8)
    const hs = small ? 8.5 : 10
    ctx.strokeStyle = ACC
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, FIG, pad + 26, hy, { size: hs, color: ACC, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const fw = ctx.measureText(FIG).width
    text(ctx, w < 620 || small ? 'EVENT HORIZON' : 'EVENT HORIZON · SCHWARZSCHILD, 1916', pad + 26 + fw + hs * 0.9, hy, { size: hs, color: MUTED, tracking: 0.14 })
    // chapter kicker above the caption
    const ch = chapterAt(T)
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (1 - smoothstep(LOOP - 1.2, LOOP - 0.2, T))
    if (!tiny) text(ctx, `${c.num} — ${c.name}`, capX, capY - (small ? 4 : 8), { size: small ? 9 : 10.5, color: INK2, tracking: 0.16, upper: true, alpha: kIn })
    // readouts, top right
    let y = hy
    const rs = small ? 9 : 10.5
    const maxR = tiny ? 2 : short || portrait ? 4 : 6
    for (const [label, value] of readouts.slice(0, maxR)) {
      setFont(ctx, { size: rs, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, value, w - pad, y, { size: rs, color: INK, align: 'right', tracking: 0.06 })
      text(ctx, label, w - pad - vw - 10, y, { size: small ? 8.5 : 9.5, color: MUTED, align: 'right', tracking: 0.14, upper: true })
      y += small ? 14 : 17
    }
    readoutBottom = y
    // chapter ruler
    if (preview || tiny) return
    const x0 = pad
    const x1 = w - pad
    const yb = rulerY()
    ctx.strokeStyle = RULE
    ctx.beginPath()
    ctx.moveTo(x0, yb)
    ctx.lineTo(x1, yb)
    for (let i = 0; i <= 38; i++) {
      const x = lerp(x0, x1, i / 38)
      ctx.moveTo(x, yb)
      ctx.lineTo(x, yb - (i % 2 === 0 ? 4 : 2))
    }
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.beginPath()
    const xp = lerp(x0, x1, T / LOOP)
    ctx.moveTo(xp, yb + 3)
    ctx.lineTo(xp, yb - 8)
    ctx.stroke()
    if (w > 360)
      CHAPTERS.forEach((cc, i) => {
        text(ctx, cc.num, lerp(x0, x1, cc.t / LOOP) + 4, yb - 7, { size: 8.5, color: i === ch ? INK : MUTED, tracking: 0.1 })
      })
    if (scrubX >= 0) {
      const hx = clamp(scrubX, x0, x1)
      const ht = ((hx - x0) / (x1 - x0)) * LOOP
      ctx.strokeStyle = ACC
      ctx.beginPath()
      ctx.moveTo(hx, yb + 3)
      ctx.lineTo(hx, yb - 12)
      ctx.stroke()
      text(ctx, `${CHAPTERS[chapterAt(ht)].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: ACC, align: 'center', tracking: 0.12 })
    }
    if (paused) text(ctx, 'PAUSED · SPACE', w - pad, yb - 9, { size: 8.5, color: INK2, align: 'right', tracking: 0.14 })
  }

  /** The lamp: a small hairline sun with its emission ticks. */
  function lampGlyph(x: number, y: number, r: number, col: string, a = 1) {
    ctx.save()
    ctx.globalAlpha *= a
    ctx.strokeStyle = col
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    for (let k = 0; k < 8; k++) {
      const an = (k / 8) * TAU + 0.2
      ctx.moveTo(x + Math.cos(an) * r * 1.6, y + Math.sin(an) * r * 1.6)
      ctx.lineTo(x + Math.cos(an) * r * 2.4, y + Math.sin(an) * r * 2.4)
    }
    ctx.stroke()
    ctx.restore()
  }

  function drawHole(alpha: number, T: number) {
    const hr = 2 * s
    ctx.save()
    ctx.globalAlpha = alpha
    // the horizon: a hairline circle, hatched inside
    ctx.strokeStyle = 'rgba(238,244,241,0.22)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, hr, 0, TAU)
    hatch(ctx, cx - hr, cy - hr, hr * 2, hr * 2, Math.max(3, s * 0.16), -Math.PI / 4, true)
    ctx.fillStyle = 'rgba(8,20,26,0.55)'
    ctx.beginPath()
    ctx.arc(cx, cy, hr * 0.999, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(238,244,241,0.2)'
    ctx.beginPath()
    ctx.arc(cx, cy, hr, 0, TAU)
    hatch(ctx, cx - hr, cy - hr, hr * 2, hr * 2, Math.max(3, s * 0.16), -Math.PI / 4, true)
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(cx, cy, hr, 0, TAU)
    ctx.stroke()
    ctx.lineWidth = 1
    // photon sphere, dashed
    const ps = 0.35 + 0.65 * smoothstep(24.6, 26.2, T) * (1 - smoothstep(35.6, 37, T))
    ctx.strokeStyle = rgba(ACC, 0.75 * ps)
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.arc(cx, cy, 3 * s, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  function drawView1(T: number, alpha: number, readouts: [string, string][]) {
    if (alpha <= 0.002) return
    buildFan()
    ctx.save()
    ctx.globalAlpha = alpha
    // centre lines: a technical drawing's chain-dotted axes
    ctx.strokeStyle = RULE
    ctx.setLineDash([14, 3, 2, 3])
    ctx.beginPath()
    ctx.moveTo(pad, cy)
    ctx.lineTo(w - pad, cy)
    ctx.moveTo(cx, Math.max(pad * 2.4, cy - YL * s))
    ctx.lineTo(cx, Math.min(capY - capSize * 0.4, cy + 7 * s))
    ctx.stroke()
    ctx.setLineDash([])

    // the arrival: rays are drawn on with Schwarzschild coordinate time
    const speed = preview ? 4.8 : 4.4
    const tauFront = T > V2_OUT ? 0 : T < 13 ? Math.max(0, (T - 0.5) * speed) : 1e9
    // the captured band (chapter II)
    const band = smoothstep(14.6, 16.4, T) * (1 - smoothstep(23.4, 25, T))
    if (band > 0 && !lamp) {
      const xb0 = Math.max(pad * 0.6, W2S(-XL) + 2)
      const xb1 = W2S(-BC * 1.9)
      ctx.save()
      ctx.globalAlpha = alpha * band
      ctx.strokeStyle = rgba(ACC2, 0.5)
      hatch(ctx, xb0, W2Sy(BC), xb1 - xb0, BC * 2 * s, 5, Math.PI / 4)
      ctx.strokeStyle = rgba(ACC2, 0.85)
      ctx.beginPath()
      ctx.moveTo(xb0, W2Sy(BC))
      ctx.lineTo(xb1, W2Sy(BC))
      ctx.moveTo(xb0, W2Sy(-BC))
      ctx.lineTo(xb1, W2Sy(-BC))
      ctx.stroke()
      if (!tiny) haloText(short ? 'FALLS IN' : 'EVERY RAY IN THIS BAND FALLS IN', Math.max(pad + 4, xb0 + 6), W2Sy(BC) - 7, { size: short ? 8 : 9, color: ACC2, tracking: 0.14 })
      ctx.restore()
    }

    // rays
    const hlOn = !lamp ? smoothstep(25.2, 26, T) * (1 - smoothstep(35.6, 37, T)) : 0
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, preview ? 0.48 : 0.36)
    ctx.beginPath()
    for (let i = 0; i < nRays; i++) if (!RF[i] && Math.abs(RD[i]) < 1.1) pathRay(i, tauFront)
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, preview ? 0.26 : 0.17)
    ctx.beginPath()
    for (let i = 0; i < nRays; i++) if (!RF[i] && Math.abs(RD[i]) >= 1.1) pathRay(i, tauFront)
    ctx.stroke()
    const capA = 0.42 + 0.4 * band
    ctx.strokeStyle = rgba(band > 0 ? ACC2 : INK, capA)
    ctx.beginPath()
    for (let i = 0; i < nRays; i++) if (RF[i]) pathRay(i, tauFront)
    ctx.stroke()

    // wavefronts: isochrones of Schwarzschild time, flowing
    const dTau = 3
    const phase = (((T * speed) % dTau) + dTau) % dTau
    const tauMax = Math.min(tauFront, 140)
    const gap = 3.2
    let nw = 0
    for (let tau = phase; tau < tauMax; tau += dTau) {
      let pen = false
      let px = 0
      let py = 0
      const total = ringClosed ? nRays + 1 : nRays
      for (let q = 0; q < total; q++) {
        const i = q % nRays
        if (!rayAt(i, tau)) {
          pen = false
          continue
        }
        const x = pt.x
        const y = pt.y
        if (pen && (x - px) * (x - px) + (y - py) * (y - py) < gap * gap && nw < WCAP) {
          const rr = Math.hypot(x, y)
          wX0[nw] = W2S(px)
          wY0[nw] = W2Sy(py)
          wX1[nw] = W2S(x)
          wY1[nw] = W2Sy(y)
          wBin[nw] = rr < 6.5 ? 0 : rr < 12 ? 1 : 2
          nw++
        }
        pen = true
        px = x
        py = y
      }
    }
    for (let bin = 0; bin < 3; bin++) {
      ctx.strokeStyle = rgba(ACC, (preview ? 1.25 : 1) * [0.4, 0.24, 0.11][bin])
      ctx.beginPath()
      for (let q = 0; q < nw; q++) {
        if (wBin[q] !== bin) continue
        ctx.moveTo(wX0[q], wY0[q])
        ctx.lineTo(wX1[q], wY1[q])
      }
      ctx.stroke()
    }
    // photon heads during the arrival
    if (tauFront < 1e8) {
      ctx.fillStyle = INK
      ctx.beginPath()
      for (let i = 0; i < nRays; i++) {
        if (!rayAt(i, tauFront) || pt.end) continue
        const X = W2S(pt.x)
        const Y = W2Sy(pt.y)
        ctx.moveTo(X + 1.3, Y)
        ctx.arc(X, Y, 1.3, 0, TAU)
      }
      ctx.fill()
    }

    drawHole(1, T)

    // III: the ray that circles once
    if (hlOn > 0 && hlSlot >= 0) {
      const tau = (T - 25.6) * 9.5
      ctx.save()
      ctx.globalAlpha = alpha * hlOn
      ctx.strokeStyle = ACC
      ctx.lineWidth = 1.5
      ctx.beginPath()
      pathRay(hlSlot, tau)
      ctx.stroke()
      if (rayAt(hlSlot, tau)) {
        ctx.fillStyle = ACC
        ctx.beginPath()
        ctx.arc(W2S(pt.x), W2Sy(pt.y), 2.6, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }

    // annotation
    const a2 = smoothstep(14, 15.6, T) * (1 - smoothstep(35.6, 37, T))
    const a3 = smoothstep(26.4, 27.8, T) * (1 - smoothstep(35.6, 37, T))
    ctx.lineWidth = 1
    if (a2 > 0 && !preview) {
      ctx.save()
      ctx.globalAlpha = alpha * a2
      const an = -Math.PI * 0.27
      ctx.strokeStyle = INK2
      dimension(ctx, cx, cy, cx + Math.cos(an) * 2 * s, cy - Math.sin(an) * 2 * s, '', 0)
      haloText('r = 2M', cx + Math.cos(an) * 2.3 * s + 4, cy - Math.sin(an) * 2.3 * s + 10, { size: 9.5, color: INK, tracking: 0.08 })
      if (!short) callout(cx - 2 * s * 0.71, cy + 2 * s * 0.71, -22, 22, 'EVENT HORIZON')
      ctx.restore()
    }
    if (a3 > 0 && !lamp) {
      ctx.save()
      ctx.globalAlpha = alpha * a3
      // photon sphere label
      const an = Math.PI * 0.22
      const px = cx + Math.cos(an) * 3 * s
      const py = cy - Math.sin(an) * 3 * s
      callout(px, py, 20, -20, short || w < 640 ? 'r = 3M' : 'PHOTON SPHERE · r = 3M', ACC)
      // b_c, dimensioned at the left where the light comes in
      const dx = W2S(-XL * 0.72)
      ctx.strokeStyle = INK2
      dimension(ctx, dx, cy, dx, W2Sy(bLoop), '', 0)
      haloText('b꜀ = 3√3 M', dx + 8, W2Sy(BC * 0.5) + 3, { size: 9.5, color: INK, tracking: 0.06 })
      ctx.restore()
    }

    // lamp
    if (lamp && !preview) {
      lampGlyph(W2S(lamp.x), W2Sy(lamp.y), 4.5, ACC)
      haloText('LIGHT', W2S(lamp.x) + 14, W2Sy(lamp.y) - 10, { size: 8.5, color: ACC, tracking: 0.14 })
    } else if (!preview && !tiny) {
      const lx = Math.max(pad + 4, W2S(-XL) + 6)
      const ty = Math.max(pad * 2.6 + 26, W2Sy(BMAX) - 6)
      ctx.save()
      ctx.globalAlpha *= smoothstep(0.6, 1.6, T)
      haloText(short ? 'STARLIGHT →' : 'LIGHT FROM A DISTANT STAR →', lx, ty, { size: 8.5, color: MUTED, tracking: 0.14 })
      ctx.restore()
    }

    // tap-fired rays
    for (const f of fired) {
      const age = T - f.t0
      if (age < 0 || age > 14) continue
      const a = alpha * (1 - smoothstep(10, 14, age))
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = SUN
      ctx.lineWidth = 1.6
      ctx.beginPath()
      pathRay(f.slot, age * 16)
      ctx.stroke()
      const n = RN[f.slot]
      const tDone = RF[f.slot] ? RT[f.slot * MAXP + Math.max(0, n - 26)] : RT[f.slot * MAXP + n - 1]
      if (age * 16 < tDone && rayAt(f.slot, age * 16)) {
        ctx.fillStyle = SUN
        ctx.beginPath()
        ctx.arc(W2S(pt.x), W2Sy(pt.y), 2.6, 0, TAU)
        ctx.fill()
      } else {
        const ex = clamp(W2S(f.ex), pad + 70, w - pad - 70)
        const ey = clamp(W2Sy(f.ey), pad * 3, h - pad * 3)
        haloText(f.label, ex, ey - 10, { size: 9, color: SUN, align: 'center', tracking: 0.14 })
      }
      ctx.restore()
    }

    // readouts
    const T1 = T
    if (lamp) {
      readouts.push(['Lamp r', `${Math.hypot(lamp.x, lamp.y).toFixed(1)} M`], ['Rays', String(nRays)], ['Fell in', String(rayCap)], ['Escaped', String(rayEsc)])
    } else if (T1 < 24.5 || T1 > V2_OUT) {
      readouts.push(['Horizon', 'r = 2M'], ['Rays', String(nRays)], ['Fell in', String(rayCap)], ['Escaped', String(rayEsc)], ['Clock', 'Schwarzschild t'])
    } else {
      const eps = Math.abs(RB[hlSlot >= 0 ? hlSlot : 0]) / BC - 1
      const ex = Math.floor(Math.log10(eps))
      readouts.push(['Impact', `b꜀(1 + ${(eps / Math.pow(10, ex)).toFixed(1)}·10${sup(ex)})`], ['Loops', (Math.abs(RD[hlSlot >= 0 ? hlSlot : 0]) / TAU).toFixed(2)], ['r min', `${RMIN[hlSlot >= 0 ? hlSlot : 0].toFixed(3)} M`], ['Photon sphere', 'r = 3M'])
    }
  }

  const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
  const sup = (n: number) =>
    String(n)
      .split('')
      .map((c) => SUP[c] ?? c)
      .join('')

  /** inclination and image rotation, autopilot or the viewer's */
  function diskPose(T: number) {
    const tilt = ease.inOutCubic(clamp((T - 55.6) / 5.4))
    const autoInc = lerp(84, 17, tilt)
    const autoRot = lerp(0, Math.PI / 2, tilt)
    const inc = incUser ?? autoInc
    const rot = autoRot + rotUser
    // the outer disk fades as the view becomes the EHT ring
    const rv = lerp(24, 11, tilt)
    return { inc, rot, rv, tilt }
  }

  /** px per M for the disk view: the image's rotated bounding box, fitted to the free area */
  function diskScale(rv: number, cr: number, sr: number) {
    let ex = BC + 1
    let ey = BC + 1
    for (let n = 0; n < 2; n++)
      for (let k = 0; k < NRING; k++) {
        if (RINGS[k] > rv + 0.5) continue
        for (let j = 0; j < NPSI; j += 2) {
          const idx = (n * NRING + k) * NPSI + j
          const a = IA[idx]
          if (Number.isNaN(a)) continue
          const b = IB[idx]
          const X = Math.abs(a * cr - b * sr)
          const Y = Math.abs(a * sr + b * cr)
          if (X > ex) ex = X
          if (Y > ey) ey = Y
        }
      }
    const halfW = portrait ? w / 2 - pad : Math.min(w - pad - dcx, dcx - pad)
    const halfH = portrait ? h * 0.27 : Math.min(dcy - pad * 2.6, h - pad * 2.6 - dcy)
    return Math.min(halfW / (ex + 1), halfH / (ey + 1))
  }

  function drawView2(T: number, alpha: number, readouts: [string, string][]) {
    if (alpha <= 0.002) return
    const { inc, rot, rv, tilt } = diskPose(T)
    incShown = inc
    buildDisk(inc, rv)
    const cr = Math.cos(rot)
    const sr = Math.sin(rot)
    // scale: fit the visible disk
    // the camera eases between the two views: the shadow grows out of the horizon and back
    const mt = Math.max(1 - smoothstep(V2_IN, V2_IN + 2.6, T), smoothstep(V2_OUT, V2_OUT + 2.8, T))
    const s0 = diskScale(rv, cr, sr)
    const s2 = lerp(s0, (2.4 * s) / BC, ease.inOutCubic(mt))
    const ox = lerp(dcx, cx, ease.inOutCubic(mt))
    const oy = lerp(dcy, cy, ease.inOutCubic(mt))
    const X = (a: number, b: number) => ox + (a * cr - b * sr) * s2
    const Y = (a: number, b: number) => oy - (a * sr + b * cr) * s2
    const grow = smoothstep(V2_IN + 0.6, V2_IN + 4.5, T) * (T > V2_OUT ? 1 : 1)
    ctx.save()
    ctx.globalAlpha = alpha

    // the shadow: hatched inside the critical curve, except where the disk passes in front
    const shR = BC * s2
    ctx.save()
    ctx.beginPath()
    ctx.arc(ox, oy, shR, 0, TAU)
    ctx.clip()
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    for (const kRing of [0, NRING - 1]) {
      let first = true
      for (let j = 0; j <= NPSI; j++) {
        const idx = kRing * NPSI + (j % NPSI)
        const a = IA[idx]
        if (Number.isNaN(a)) continue
        if (first) ctx.moveTo(X(a, IB[idx]), Y(a, IB[idx]))
        else ctx.lineTo(X(a, IB[idx]), Y(a, IB[idx]))
        first = false
      }
      ctx.closePath()
    }
    ctx.clip('evenodd')
    ctx.strokeStyle = 'rgba(238,244,241,0.13)'
    ctx.lineWidth = 1
    hatch(ctx, ox - shR, oy - shR, shR * 2, shR * 2, Math.max(3, s2 * 0.32), -Math.PI / 4)
    ctx.restore()

    // build segments: every isoradial of every order, binned by colour and brightness
    let nSeg = 0
    let iMax = 0
    const ringMax = rv
    for (let n = ORD - 1; n >= 0; n--) {
      for (let k = 0; k < NRING; k++) {
        const r = RINGS[k]
        const ringA = smoothstep(V2_IN + 0.4 + (k / NRING) * 3.2, V2_IN + 1.6 + (k / NRING) * 3.2, T) * (1 - smoothstep(ringMax - 1.5, ringMax + 1, r))
        if (ringA <= 0.01) continue
        const T0 = 4500 * Math.pow(Math.max(0.05, flux(r) / fluxMax), 0.25)
        for (let j = 0; j < NPSI; j++) {
          const i0 = (n * NRING + k) * NPSI + j
          const i1 = (n * NRING + k) * NPSI + ((j + 1) % NPSI)
          const a0 = IA[i0]
          const a1 = IA[i1]
          if (Number.isNaN(a0) || Number.isNaN(a1)) continue
          const b0 = IB[i0]
          const b1 = IB[i1]
          if ((a0 - a1) * (a0 - a1) + (b0 - b1) * (b0 - b1) > 9) continue
          const g = 0.5 * (IG[i0] + IG[i1])
          // bolometric beaming: I ∝ g⁴ times the disk's own flux profile
          const I = g * g * g * g * Math.max(flux(r), fluxMax * 0.05) * ringA * (n === 0 ? 1 : n === 1 ? 0.42 : 0.24)
          if (I > iMax) iMax = I
          segX0[nSeg] = X(a0, b0)
          segY0[nSeg] = Y(a0, b0)
          segX1[nSeg] = X(a1, b1)
          segY1[nSeg] = Y(a1, b1)
          segI[nSeg] = I
          segBin[nSeg] = clamp(Math.round((Math.log((g * T0) / 2400) / Math.log(14000 / 2400)) * (TB - 1)), 0, TB - 1)
          nSeg++
        }
      }
    }
    // brightness relative to the brightest segment in view, gently compressed
    {
      let keep = 0
      for (let i = 0; i < nSeg; i++) {
        const lum = Math.pow(segI[i] / (iMax || 1), 0.52)
        if (lum < 0.035) continue
        const ab = clamp(Math.round(lum * (AB - 1)), 0, AB - 1)
        segX0[keep] = segX0[i]
        segY0[keep] = segY0[i]
        segX1[keep] = segX1[i]
        segY1[keep] = segY1[i]
        segBin[keep] = segBin[i] * AB + ab
        keep++
      }
      nSeg = keep
    }
    // counting sort by bin
    binStart.fill(0)
    for (let i = 0; i < nSeg; i++) binStart[segBin[i] + 1]++
    for (let b = 0; b < TB * AB; b++) binStart[b + 1] += binStart[b]
    for (let b = 0; b < TB * AB; b++) binFill[b] = binStart[b]
    for (let i = 0; i < nSeg; i++) sortIdx[binFill[segBin[i]]++] = i
    ctx.lineWidth = 1
    ctx.globalCompositeOperation = 'lighter'
    for (let b = 0; b < TB * AB; b++) {
      const e = binStart[b + 1]
      const st = binStart[b]
      if (e === st) continue
      const tb = Math.floor(b / AB)
      const ab = b % AB
      ctx.strokeStyle = binCol[tb]
      ctx.globalAlpha = alpha * (0.07 + 0.93 * (ab / (AB - 1)))
      ctx.lineWidth = ab >= AB - 2 ? 1.25 : 1
      ctx.beginPath()
      for (let q = st; q < e; q++) {
        const i = sortIdx[q]
        ctx.moveTo(segX0[i], segY0[i])
        ctx.lineTo(segX1[i], segY1[i])
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = alpha * grow

    // the critical curve: where the shadow begins
    ctx.strokeStyle = rgba(INK, 0.32 + 0.3 * tilt)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.arc(ox, oy, shR, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])

    // annotation: edge-on (IV)
    const aIV = smoothstep(V2_IN + 4.2, V2_IN + 5.6, T) * (1 - smoothstep(55.2, 56.4, T)) * (incUser === null || Math.abs(incUser - 84) < 20 ? 1 : 0.4)
    if (aIV > 0 && !preview && !tiny) {
      ctx.globalAlpha = alpha * aIV
      // the far side, above the hole: the ψ = 90° point of a mid ring, n = 0
      const kMid = Math.floor(NRING * 0.42)
      const top = kMid * NPSI + Math.round(NPSI * 0.25)
      const bot = (NRING + kMid) * NPSI + Math.round(NPSI * 0.75)
      const near = kMid * NPSI + Math.round(NPSI * 0.75)
      const right = (NRING - 1) * NPSI
      const left = (NRING - 1) * NPSI + Math.round(NPSI * 0.5)
      const label = (idx: number, str: string, dx: number, dy: number) => {
        const a = IA[idx]
        if (Number.isNaN(a)) return
        callout(X(a, IB[idx]), Y(a, IB[idx]), dx, dy, str)
      }
      const narrow = short || w < 640
      label(top, narrow ? 'FAR SIDE' : 'FAR SIDE · BENT OVER THE TOP', Math.max(18, s2 * 3), -Math.max(14, s2 * 2.6))
      label(bot, narrow ? 'FAR SIDE, BELOW' : 'FAR SIDE · SEEN UNDERNEATH', Math.max(18, s2 * 4.2), Math.max(16, s2 * 3.2))
      if (!short) label(near, 'NEAR SIDE', -Math.max(18, s2 * 3.5), Math.max(14, s2 * 2.5))
      if (!short && !portrait && w >= 900) {
        label(left, 'APPROACHING · BRIGHTER, BLUER', 14, -30)
        label(right, 'RECEDING · DIMMER, REDDER', -14, -30)
      }
    }
    // annotation: the shadow (V)
    const aV = smoothstep(61.2, 62.6, T) * (1 - smoothstep(V2_OUT - 0.4, V2_OUT + 0.6, T))
    if (aV > 0 && !preview) {
      ctx.globalAlpha = alpha * aV
      const dy = Math.min(h - pad * 2.2 - 16, oy + (rv + 2.4) * s2)
      ctx.strokeStyle = rgba(INK, 0.22)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(ox - shR, oy)
      ctx.lineTo(ox - shR, dy + 5)
      ctx.moveTo(ox + shR, oy)
      ctx.lineTo(ox + shR, dy + 5)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = INK2
      dimension(ctx, ox - shR, dy, ox + shR, dy, '', 0)
      haloText(short ? '2√27 M ≈ 40 µas' : 'SHADOW Ø 2√27 M · ≈ 40 µas FOR M87*', ox, dy + 16, { size: 9, color: INK, align: 'center', tracking: 0.12 })
      if (!short && !tiny) callout(ox + shR * 0.72, oy - shR * 0.72, Math.max(24, s2 * 5), -Math.max(20, s2 * 4), w < 640 ? 'PHOTON RING' : 'PHOTON RING · b = 3√3 M')
    }

    // inset: the path of a tapped ray, in its own orbit plane
    if (inset && !preview) drawInset(T, alpha)

    ctx.restore()
    readouts.push(['Inclination', `${Math.round(inc)}°`], ['Disk', `r = ${RIN}–${Math.round(rv)} M`], ['Shadow', 'b < 3√3 M'], ['Beaming', 'I ∝ g⁴'])
    if (tilt > 0.6) readouts.splice(1, 0, ['M87*', '6.5 × 10⁹ M☉'])
  }

  function drawInset(T: number, alpha: number) {
    if (!inset) return
    const age = T - inset.t0
    if (age < 0 || age > 12) return
    const a = alpha * (1 - smoothstep(9, 12, age)) * smoothstep(0, 0.4, age)
    const iw = Math.min(260, w * 0.34)
    const ih = iw * 0.62
    const ix = portrait ? pad : pad
    const iy = portrait ? h * 0.66 : pad * 2.4 + 34
    if (short) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgba(9,22,28,0.9)'
    ctx.fillRect(ix, iy, iw, ih)
    ctx.strokeStyle = rgba(INK, 0.5)
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw, ih)
    text(ctx, 'THE PATH OF THIS RAY', ix + 8, iy + 14, { size: 8.5, color: MUTED, tracking: 0.14 })
    const sc = (ih * 0.42) / 13
    const ocx = ix + iw * 0.42
    const ocy = iy + ih * 0.56
    // hole and photon sphere
    ctx.strokeStyle = INK
    ctx.beginPath()
    ctx.arc(ocx, ocy, 2 * sc, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(ACC, 0.6)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.arc(ocx, ocy, 3 * sc, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    // the disk plane in this orbit plane
    const inc = (incShown * Math.PI) / 180
    const phi0 = Math.atan2(-Math.cos(inc), Math.sin(inset.psi) * Math.sin(inc)) + Math.PI
    ctx.strokeStyle = rgba(INK2, 0.8)
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const ang of [phi0, phi0 + Math.PI]) {
      ctx.moveTo(ocx + Math.cos(ang) * RIN * sc, ocy - Math.sin(ang) * RIN * sc)
      ctx.lineTo(ocx + Math.cos(ang) * 13 * sc, ocy - Math.sin(ang) * 13 * sc)
    }
    ctx.stroke()
    ctx.lineWidth = 1
    // the ray, from the observer (right) back to its disk crossing
    const end = phi0 + inset.n * Math.PI
    const draw = Math.min(end, (age / 2.2) * end)
    ctx.strokeStyle = ACC2
    ctx.beginPath()
    let started = false
    for (let p = 0.02; p <= draw; p += 0.02) {
      const u = crossU(inset.b, p)
      if (u <= 0.0005) continue
      const r = 1 / u
      const X2 = ocx + Math.cos(p) * r * sc
      const Y2 = ocy - Math.sin(p) * r * sc
      if (X2 > ix + iw - 4 || X2 < ix + 2 || Y2 < iy + 18 || Y2 > iy + ih - 2) {
        started = false
        continue
      }
      if (!started) ctx.moveTo(X2, Y2)
      else ctx.lineTo(X2, Y2)
      started = true
    }
    ctx.stroke()
    if (draw >= end) {
      const X2 = ocx + Math.cos(end) * inset.r * sc
      const Y2 = ocy - Math.sin(end) * inset.r * sc
      ctx.fillStyle = ACC2
      ctx.beginPath()
      ctx.arc(X2, Y2, 2.5, 0, TAU)
      ctx.fill()
    }
    text(ctx, 'TO YOU →', ix + iw - 8, ocy - 6, { size: 8, color: MUTED, align: 'right', tracking: 0.14 })
    const ord = inset.n === 0 ? 'DIRECT IMAGE' : inset.n === 1 ? 'SECOND IMAGE' : 'THIRD IMAGE'
    text(ctx, `${ord} · r = ${inset.r.toFixed(1)} M · g = ${inset.g.toFixed(2)}`, ix + 8, iy + ih - 8, { size: 8, color: ACC2, tracking: 0.1 })
    ctx.restore()
  }

  /** Map a tap on view 2 to the disk point it sees. */
  function probeDisk(x: number, y: number, T: number) {
    const { inc, rot, rv } = diskPose(T)
    buildDisk(inc, rv)
    const s2 = diskScale(rv, Math.cos(rot), Math.sin(rot))
    const dx = (x - dcx) / s2
    const dy = -(y - dcy) / s2
    const cr = Math.cos(rot)
    const sr = Math.sin(rot)
    const al = dx * cr + dy * sr
    const be = -dx * sr + dy * cr
    const b = Math.hypot(al, be)
    const psi = Math.atan2(be, al)
    const ir = (inc * Math.PI) / 180
    const phi0 = Math.atan2(-Math.cos(ir), Math.sin(psi) * Math.sin(ir)) + Math.PI
    for (let n = 0; n < ORD; n++) {
      const u = crossU(b, phi0 + n * Math.PI)
      if (u <= 0 || u >= 0.5) continue
      const r = 1 / u
      if (r >= RIN && r <= rv + 1) {
        const g = Math.sqrt(1 - 3 / r) / (1 + Math.pow(r, -1.5) * al * Math.sin(ir))
        inset = { b, psi, n, r, g, t0: T }
        sfx.tone(330 * g, 1.2, { type: 'sine', gain: 0.05, room: 0.5 })
        return
      }
    }
  }

  /** Contextual hints and the ghost demonstration. */
  function hints(T: number, first: boolean) {
    if (preview || tiny) return
    const v2 = view2Mix(T) > 0.5
    const yH = short || portrait || w < 700 ? readoutBottom + 4 : rulerY() - 24
    // ghost: view 1, first loop, until the viewer acts
    if (!interacted && first && T > 2.2 && T < 8.6 && !v2) {
      const u = clamp((T - 2.6) / 5.2)
      const a = smoothstep(2.2, 3, T) * (1 - smoothstep(7.8, 8.6, T))
      const x0 = W2S(-XL * 0.82)
      const y0 = W2Sy(BMAX * 0.7)
      const x1 = W2S(-XL * 0.4)
      const y1 = W2Sy(BMAX * 0.2)
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(ACC, 0.55)
      ctx.setLineDash([1.5, 4])
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.1, y1, x1, y1)
      ctx.stroke()
      ctx.setLineDash([])
      const e = ease.inOutSine(u)
      const gx = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * (x0 + (x1 - x0) * 0.1) + e * e * x1
      const gy = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * y1 + e * e * y1
      lampGlyph(gx, gy, 4.5, ACC, 0.9)
      const msg = touch || w < 700 ? 'DRAG THE LIGHT · TAP TO FIRE' : 'DRAG TO MOVE THE LIGHT · CLICK TO FIRE ONE RAY'
      setFont(ctx, { size: 9, tracking: 0.14 })
      const mw = ctx.measureText(msg).width
      haloText(msg, Math.min(gx + 16, w - pad - mw), gy - 12, { size: 9, color: ACC, tracking: 0.14 })
      ctx.restore()
      return
    }
    if (!v2 && T > 9 && T < 36 && lamp === null && fired.length === 0) {
      ctx.save()
      ctx.globalAlpha = smoothstep(9, 10, T)
      haloText(touch || w < 700 ? 'DRAG THE LIGHT · TAP TO FIRE' : 'DRAG TO MOVE THE LIGHT · CLICK TO FIRE', w - pad, yH, { size: 8.5, color: MUTED, align: 'right', tracking: 0.14 })
      ctx.restore()
    }
    if (v2 && T > V2_IN + 4 && T < V2_OUT - 1) {
      const a = smoothstep(V2_IN + 4, V2_IN + 5, T)
      const msg = inset ? 'DRAG TO TILT · TAP THE DISK AGAIN' : touch || w < 900 || short ? 'DRAG TO TILT · TAP TO TRACE A RAY' : 'DRAG TO TILT · CLICK THE DISK TO TRACE A RAY'
      ctx.save()
      ctx.globalAlpha = a
      haloText(msg, w - pad, yH, { size: 8.5, color: MUTED, align: 'right', tracking: 0.14 })
      ctx.restore()
      // a ghost vertical drag, once
      if (!interacted && first && T < V2_IN + 9) {
        const u = fractional(T - (V2_IN + 4.4), 2.2)
        const gx = w - pad - 14
        const gy0 = yH - 70
        ctx.save()
        ctx.globalAlpha = a * (1 - smoothstep(V2_IN + 8, V2_IN + 9, T))
        ctx.strokeStyle = rgba(ACC, 0.55)
        ctx.setLineDash([1.5, 4])
        ctx.beginPath()
        ctx.moveTo(gx, gy0)
        ctx.lineTo(gx, gy0 + 46)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = ACC
        ctx.beginPath()
        ctx.arc(gx, gy0 + 46 * ease.inOutSine(u < 0.5 ? u * 2 : 2 - u * 2), 3, 0, TAU)
        ctx.fill()
        ctx.restore()
      }
    }
  }
  const fractional = (v: number, p: number) => ((v % p) + p) % p / p

  /* --------------------------------------------------------- the API */
  return {
    resize() {
      layout()
      fanKey = ''
      diskKey = ''
    },
    pointer(p: PointerInfo) {
      if (preview) return
      touch = p.pointerType === 'touch'
      const T = curT()
      const v2 = view2Mix(T) > 0.5
      if (p.type === 'leave') {
        scrubX = -1
        down = null
        env.setCursor('default')
        return
      }
      const ruler = onRuler(p.x, p.y)
      if (p.type === 'down') {
        interacted = true
        down = { x: p.x, y: p.y, ms: performance.now(), id: p.id, moved: false, ruler, inc0: diskPose(T).inc, rot0: rotUser }
        if (ruler) {
          scrubX = p.x
          seekX(p.x)
        }
        return
      }
      if (p.type === 'move') {
        if (down && p.pressed) {
          if (down.ruler) {
            scrubX = p.x
            seekX(p.x)
            return
          }
          const d = Math.hypot(p.x - down.x, p.y - down.y)
          if (d > (touch ? 10 : 5)) down.moved = true
          if (down.moved) {
            if (v2) {
              incUser = clamp(down.inc0 - ((p.y - down.y) / h) * 120, 2, 89.5)
              rotUser = down.rot0 + ((p.x - down.x) / w) * Math.PI
            } else {
              const wp = toWorld(p.x, p.y)
              const r = Math.hypot(wp.x, wp.y)
              const k = r < 2.25 ? 2.25 / Math.max(r, 1e-3) : 1
              lamp = { x: wp.x * k, y: wp.y * k }
            }
          }
        } else scrubX = ruler ? p.x : -1
        env.setCursor(ruler ? 'pointer' : down?.moved ? 'grabbing' : v2 ? 'grab' : 'crosshair')
        return
      }
      if (p.type === 'up') {
        if (down && !down.ruler && !down.moved && performance.now() - down.ms < 400) {
          if (v2) probeDisk(p.x, p.y, T)
          else fire(p.x, p.y, T)
        }
        if (down?.ruler) scrubX = -1
        down = null
      }
    },
    key(code, isDown) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (!isDown) return true
        interacted = true
        const T = curT()
        if (code === 'ArrowRight') {
          const next = CHAPTERS.find((c) => c.t > T + 0.01)
          seekTo(next ? next.t : 0)
        } else {
          const i = chapterAt(T)
          seekTo(T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t)
        }
        return true
      }
      if (code === 'ArrowUp' || code === 'ArrowDown') {
        if (!isDown) return true
        interacted = true
        const base = incUser ?? diskPose(curT()).inc
        incUser = clamp(base + (code === 'ArrowUp' ? 5 : -5), 2, 89.5)
        return true
      }
      if (code === 'Space') {
        if (isDown) paused = !paused
        return true
      }
      return false
    },
    destroy() {
      if (drone) {
        try {
          drone.o.forEach((o) => o.stop())
        } catch {
          /* stopped */
        }
        drone = null
      }
    },
    frame(t, dt) {
      if (paused && dt > 0) offset -= dt
      const T = (((t + offset) % LOOP) + LOOP) % LOOP
      const first = t + offset < LOOP
      if (prevT >= 0 && T < prevT - 1) {
        // looped or jumped back: reset the viewer's adjustments
        lamp = null
        fired.length = 0
        inset = null
      }
      const ch = chapterAt(T)
      if (prevT < 0) lastChapter = ch
      if (testTap && prevT >= 0) {
        if (view2Mix(T) > 0.5) probeDisk(testTap[0], testTap[1], T)
        else fire(testTap[0], testTap[1], T)
        interacted = true
        testTap = null
      }
      if (ch !== lastChapter) {
        if ((ch === 3 || ch === 4) && lastChapter < 3) {
          lamp = null
          fired.length = 0
        }
        if (ch === 4) {
          incUser = null
          rotUser = 0
        }
        if (ch < 3) {
          incUser = null
          rotUser = 0
          inset = null
        }
        lastChapter = ch
      }
      const advancing = dt > 0 && prevT >= 0 && T >= prevT
      const crossed = (te: number) => advancing && prevT < te && te <= T

      ground(ctx, w, h, 'night')
      const m2 = view2Mix(T)
      if (m2 > 0) {
        // deeper dark for the disk, so the warm light reads true
        ctx.fillStyle = `rgba(3,9,12,${(0.62 * m2).toFixed(3)})`
        ctx.fillRect(0, 0, w, h)
      }
      const readouts: [string, string][] = []
      const r1: [string, string][] = []
      const r2: [string, string][] = []
      drawView1(T, 1 - m2, r1)
      drawView2(T, m2, r2)
      readouts.push(...(m2 > 0.5 ? r2 : r1))
      captionAt(T)
      chrome(T, readouts)
      hints(T, first)

      // sound
      if (sfx.enabled || drone) droneSet(sfx.enabled ? 0.35 + 0.65 * m2 : 0)
      if (crossed(13.4)) sfx.tone(98, 3.5, { type: 'sine', gain: 0.06, attack: 0.3, room: 0.5, to: 49 })
      if (crossed(25.8)) for (let j = 0; j < 6; j++) sfx.tone(392 * Math.pow(1.122, j), 0.9, { type: 'sine', gain: 0.03, when: j * 0.32, room: 0.5 })
      if (crossed(61)) [196, 293.66, 392, 587.33].forEach((f, j) => sfx.tone(f, 5, { type: 'sine', gain: 0.04, attack: 0.5 + j * 0.1, room: 0.6, when: j * 0.08 }))

      prevT = T
    },
  }
}

export default create
