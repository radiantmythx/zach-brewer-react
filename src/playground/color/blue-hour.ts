/*
 * C.02 — BLUE HOUR
 *
 * A whole day over a quiet hill in a minute and a quarter. The sky is not
 * painted: every frame it is computed from the way air scatters sunlight.
 * Single scattering in a spherical, exponential atmosphere — Rayleigh (λ⁻⁴)
 * from the molecules, a little Mie from the haze, ozone absorbing in its
 * Chappuis band — integrated along view rays at twelve wavelengths,
 * weighted by the solar spectrum and the CIE 1931 observer, plus a cheap
 * isotropic estimate of the light scattered more than once. The sun's
 * colour is its own transmittance; the distant ridges take their colour
 * from the air in front of them (aerial perspective, computed the same way).
 *
 *   night → dawn: the glow before the sun, Earth's shadow and the Belt of
 *   Venus opposite → sunrise → white-blue noon → golden hour → sunset →
 *   the blue hour, tinted by ozone → the first star → night
 *
 * The plate faces south from 40° N on 6 October, so the sun rises on the
 * left, culminates at 44.6° and sets on the right. Drag anywhere in the sky
 * (or along the 24-hour ruler) to move the sun along its arc; ← → step
 * through the day.
 *
 * Numerics: a table of column densities (air, haze, ozone) from any height
 * in any direction is built once, and every view ray's own path is
 * precomputed, so a frame costs one table lookup and twelve exponentials
 * per ray step. The coarse sky grid (sun-relative azimuth × elevation,
 * dense near the sun and the horizon) is refined ×4 with Catmull–Rom,
 * resampled to a half- or third-resolution image with ordered dither, and
 * overlaid with fine horizontal hairlines.
 */

import { C, TAU, clamp, damp, ease, lerp, makeNoise, mixHex, mod, rgba, rng, setFont, smoothstep, text } from '../kit'
import { cmf, spectral, xyzToLinear, type Rgb } from '../color'
import type { CreatePiece } from '../types'

/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces. Never blocks for long.
 */
if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. C.02'
const DEG = Math.PI / 180

/* ------------------------------------------------------------ the atmosphere */

const RE = 6360e3
const RT = 6420e3
const H_OBS = 200
const HR = 8000
const HM = 1200
/** Mie (haze): scattering and extinction at sea level, m⁻¹; Cornette–Shanks asymmetry */
const BETA_MS = 3.996e-6
const BETA_ME = 4.44e-6
const MIE_G = 0.8
/** ozone: 300 Dobson units spread over a 15 km-equivalent tent from 10 to 40 km */
const OZONE_MAX = (300 * 2.687e20) / 15000
/** strength of the isotropic multiple-scattering estimate */
const F_MS = 1
/** exposure: key, adaptation floor (W·m⁻²·sr⁻¹), and the tone curve's exponent */
const KEY = 0.3
const ADAPT = 7e-4
const TONE_P = 0.75
/** the hills: dark vegetation, the faces we see turned away from the sun */
const ALBEDO = 0.07
const LAT = 40 * DEG
const DEC = -5.4 * DEG

// Extraterrestrial solar spectral irradiance (ASTM G-173, W·m⁻²·nm⁻¹) and the
// ozone absorption cross-section (m²), 360–830 nm in 10 nm bins, as tabulated
// in Bruneton's reference implementation of precomputed atmospheric scattering.
const SOLAR = [
  1.11776, 1.14259, 1.01249, 1.14716, 1.72765, 1.73054, 1.6887, 1.61253, 1.91198, 2.03474, 2.02042, 2.02212, 1.93377, 1.95809, 1.91686, 1.8298, 1.8685, 1.8931, 1.85149, 1.8504,
  1.8341, 1.8345, 1.8147, 1.78158, 1.7533, 1.6965, 1.68194, 1.64654, 1.6048, 1.52143, 1.55622, 1.5113, 1.474, 1.4482, 1.41018, 1.36775, 1.34188, 1.31429, 1.28303, 1.26758,
  1.2367, 1.2082, 1.18737, 1.14683, 1.12362, 1.1058, 1.07124, 1.04992,
]
const OZONE_XS = [
  1.18e-27, 2.182e-28, 2.818e-28, 6.636e-28, 1.527e-27, 2.763e-27, 5.52e-27, 8.451e-27, 1.582e-26, 2.316e-26, 3.669e-26, 4.924e-26, 7.752e-26, 9.016e-26, 1.48e-25, 1.602e-25,
  2.139e-25, 2.755e-25, 3.091e-25, 3.5e-25, 4.266e-25, 4.672e-25, 4.398e-25, 4.701e-25, 5.019e-25, 4.305e-25, 3.74e-25, 3.215e-25, 2.662e-25, 2.238e-25, 1.852e-25, 1.473e-25,
  1.209e-25, 9.423e-26, 7.455e-26, 6.566e-26, 5.105e-26, 4.15e-26, 4.228e-26, 3.237e-26, 2.451e-26, 2.801e-26, 2.534e-26, 1.624e-26, 1.465e-26, 2.078e-26, 1.383e-26, 7.105e-27,
]
const tab = (arr: number[], nm: number) => {
  const f = (nm - 360) / 10
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(f)))
  const u = clamp(f - i)
  return arr[i] * (1 - u) + arr[i + 1] * u
}

/** Twelve wavelength bins, 390–720 nm, 30 nm wide. */
const NB = 12
const LAMBDA = new Float32Array(NB)
const BR = new Float32Array(NB)
const BO = new Float32Array(NB)
const E0 = new Float32Array(NB)
const WX = new Float32Array(NB)
const WY = new Float32Array(NB)
const WZ = new Float32Array(NB)
for (let k = 0; k < NB; k++) {
  const lam = 390 + 30 * k
  LAMBDA[k] = lam
  let e = 0
  let o = 0
  let r = 0
  for (let s = 0; s < 6; s++) {
    const ls = lam - 12.5 + 5 * s
    const c = cmf(ls)
    WX[k] += c[0] * 5
    WY[k] += c[1] * 5
    WZ[k] += c[2] * 5
    e += tab(SOLAR, ls) / 6
    o += tab(OZONE_XS, ls) / 6
    r += Math.pow(ls / 1000, -4) / 6
  }
  E0[k] = e
  BO[k] = OZONE_MAX * o
  // Rayleigh scattering at sea level, m⁻¹ (λ in µm)
  BR[k] = 1.24062e-6 * r
}

const ozone = (h: number) => (h < 10000 || h > 40000 ? 0 : h < 25000 ? (h - 10000) / 15000 : (40000 - h) / 15000)

/*
 * The transmittance table: column densities (air, haze, ozone) from radius r
 * toward direction cosine μ to the top of the atmosphere. μ is parametrised
 * relative to the horizon at that height, so grazing rays are sampled finely;
 * rays below it meet the Earth (the point is in shadow).
 */
const NHL = 32
const NUL = 64
const LUT = new Float32Array(NHL * NUL * 3)
{
  for (let iv = 0; iv < NHL; iv++) {
    const h = 60000 * (iv / (NHL - 1)) ** 2
    const r = RE + h
    const md = -Math.sqrt(Math.max(0, 1 - (RE * RE) / (r * r)))
    for (let iu = 0; iu < NUL; iu++) {
      const u = iu / (NUL - 1)
      const mu = md + (1 - md) * u * u
      const d = -r * mu + Math.sqrt(Math.max(0, r * r * (mu * mu - 1) + RT * RT))
      const steps = 110
      const dt = d / steps
      let cR = 0
      let cM = 0
      let cO = 0
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) * dt
        const hh = Math.sqrt(t * t + 2 * r * mu * t + r * r) - RE
        cR += Math.exp(-hh / HR)
        cM += Math.exp(-hh / HM)
        cO += ozone(hh)
      }
      const o = (iv * NUL + iu) * 3
      LUT[o] = cR * dt
      LUT[o + 1] = cM * dt
      LUT[o + 2] = cO * dt
    }
  }
}

/** Column densities from (r, μ) toward the top; false if the ray meets the Earth. */
function column(r: number, mu: number, out: Float32Array) {
  const h = clamp(r - RE, 0, 60000)
  const rr = RE + h
  const md = -Math.sqrt(Math.max(0, 1 - (RE * RE) / (rr * rr)))
  if (mu < md) return false
  const fu = Math.sqrt(Math.min(1, (mu - md) / (1 - md))) * (NUL - 1)
  const fv = Math.sqrt(h / 60000) * (NHL - 1)
  const iv = Math.min(NHL - 2, fv | 0)
  const iu = Math.min(NUL - 2, fu | 0)
  const a = fv - iv
  const b = fu - iu
  const o00 = (iv * NUL + iu) * 3
  const o10 = o00 + NUL * 3
  for (let c = 0; c < 3; c++) {
    out[c] = (LUT[o00 + c] * (1 - b) + LUT[o00 + 3 + c] * b) * (1 - a) + (LUT[o10 + c] * (1 - b) + LUT[o10 + 3 + c] * b) * a
  }
  return true
}

/** Spectral transmittance along a column into `T` (per bin); `noOzone` leaves the ozone out. */
function transmit(col: Float32Array, T: Float32Array, noOzone = false) {
  for (let k = 0; k < NB; k++) T[k] = Math.exp(-(BR[k] * col[0] + BETA_ME * col[1] + (noOzone ? 0 : BO[k] * col[2])))
}

/** Integrate per-bin power against the observer → linear sRGB. */
function binsToLinear(P: ArrayLike<number>, o = 0): Rgb {
  let X = 0
  let Y = 0
  let Z = 0
  for (let k = 0; k < NB; k++) {
    X += P[o + k] * WX[k]
    Y += P[o + k] * WY[k]
    Z += P[o + k] * WZ[k]
  }
  return xyzToLinear([X, Y, Z])
}

/* ------------------------------------------------------------- the sun's day */

/** Sun elevation and azimuth (from south, + toward west) at hour angle H (radians). */
function sunAt(H: number) {
  const se = Math.sin(LAT) * Math.sin(DEC) + Math.cos(LAT) * Math.cos(DEC) * Math.cos(H)
  const el = Math.asin(clamp(se, -1, 1))
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(DEC) * Math.cos(LAT))
  return { el, az }
}
/** Hour angle (degrees, ≥ 0) at which the sun stands at elevation e (degrees). */
const hourOfElevation = (e: number) => Math.acos(clamp((Math.sin(e * DEG) - Math.sin(LAT) * Math.sin(DEC)) / (Math.cos(LAT) * Math.cos(DEC)), -1, 1)) / DEG

/** Atmospheric refraction (Sæmundsson), degrees, at elevation e in degrees. */
const refraction = (e: number) => (e < -1.5 ? 0 : 1.02 / Math.tan((e + 10.3 / (e + 5.11)) * DEG) / 60)

// The day as a function of piece time: hour-angle keyframes (degrees), slowed
// through the twilights and the golden hour, quick through midday and night.
const LOOP = 78
const KT = [0, 7, 11, 15, 20, 24, 29, 35, 41, 46, 50, 54, 57, 62.5, 66, 70, 78]
const KH = [-175.3, -109, -101, -93.3, -85.5, -72, -40, 0, 40, 72, 80.5, 85.5, 89.5, 95.5, 101, 109, 184.7]
const KM = (() => {
  const n = KT.length
  const sec: number[] = []
  for (let i = 0; i < n - 1; i++) sec.push((KH[i + 1] - KH[i]) / (KT[i + 1] - KT[i]))
  const hm = (a: number, b: number) => (a * b > 0 ? (2 * a * b) / (a + b) : 0)
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) m[i] = hm(sec[i - 1], sec[i])
  m[0] = m[n - 1] = hm(sec[0], sec[n - 2])
  return m
})()
/** Hour angle (degrees, −175…185) at loop time T: a monotone cubic through the keyframes. */
function hourAngle(T: number) {
  const t = mod(T, LOOP)
  let i = 0
  while (i < KT.length - 2 && t >= KT[i + 1]) i++
  const h = KT[i + 1] - KT[i]
  const u = (t - KT[i]) / h
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * KH[i] + (u3 - 2 * u2 + u) * h * KM[i] + (-2 * u3 + 3 * u2) * KH[i + 1] + (u3 - u2) * h * KM[i + 1]
}
/** Loop time at which the hour angle is H (degrees). */
function timeOfHour(H: number) {
  let Hd = H
  while (Hd < KH[0]) Hd += 360
  while (Hd > KH[KH.length - 1]) Hd -= 360
  let lo = 0
  let hi = LOOP
  for (let it = 0; it < 32; it++) {
    const mid = (lo + hi) / 2
    if (hourAngle(mid) < Hd) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
/** Hour angle (degrees) at which the sun stands at azimuth az (radians). */
function hourOfAzimuth(az: number) {
  let lo = -180
  let hi = 180
  for (let it = 0; it < 30; it++) {
    const mid = (lo + hi) / 2
    if (sunAt(mid * DEG).az < az) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const fmtClock = (H: number) => {
  const hrs = mod(12 + H / 15, 24)
  const hh = Math.floor(hrs)
  const mm = Math.floor((hrs - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
const signed = (v: number, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}°`

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 9.5, t1: 17.2, lines: [{ s: 'Light arrives' }, { s: '', em: 'before the sun.' }] },
  { t0: 25.5, t1: 34, lines: [{ s: 'Blue is the color' }, { s: 'air ', em: 'scatters best.' }] },
  { t0: 46.4, t1: 53.8, lines: [{ s: 'At sunset, the light' }, { s: 'has crossed ', em: 'more sky.' }] },
  { t0: 56.6, t1: 63.8, lines: [{ s: 'The blue hour belongs' }, { s: 'to ', em: 'the air itself.' }] },
  { t0: 65, t1: 71.8, lines: [{ s: 'The stars were there' }, { s: '', em: 'all day.' }] },
]
/** ← → stops */
const STOPS = [0, 7, 15, 20, 35, 46, 54, 57.5, 66]

const NIGHT_INK = '#EEF4F1'
/** the site's night ground, linear: the sky's floor (airglow and starlight) */
const FLOOR: Rgb = [0.0036, 0.0118, 0.0168]
/** the scotopic tint: luminance-neutral, bluish */
const SCOTO: Rgb = [0.62 / 0.8158, 0.82 / 0.8158, 1.35 / 0.8158]

const enc = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
const ENC = new Float32Array(4096)
for (let i = 0; i < 4096; i++) ENC[i] = enc(i / 4095) * 255
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5)
const encByte = (l: number, d = 0) => {
  const v = ENC[l <= 0 ? 0 : l >= 1 ? 4095 : (l * 4095) | 0] + d
  return v < 0 ? 0 : v > 255 ? 255 : v
}
const cssLin = (l: ArrayLike<number>, a = 1) => {
  const r = Math.round(encByte(l[0]))
  const g = Math.round(encByte(l[1]))
  const b = Math.round(encByte(l[2]))
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`
}
/** Catmull–Rom weights at t = 0, ¼, ½, ¾ */
const CR = [0, 0.25, 0.5, 0.75].map((t) => [(-t * t * t + 2 * t * t - t) / 2, (3 * t * t * t - 5 * t * t + 2) / 2, (-3 * t * t * t + 4 * t * t + t) / 2, (t * t * t - t * t) / 2])

interface Seg {
  x0: number
  y0: number
  x1: number
  y1: number
  d: number
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const debug = env.params.has('debug')
  const noise = makeNoise(42)

  /* ---------------------------------------------------- the sky grid (sun-relative) */
  const NAZ = preview ? 22 : 30
  const NEL = preview ? 20 : 28
  const NS = preview ? 10 : 16
  const gAz = new Float32Array(NAZ)
  const gEl = new Float32Array(NEL)
  for (let i = 0; i < NAZ; i++) gAz[i] = Math.PI * (i / (NAZ - 1)) ** 1.6
  for (let j = 0; j < NEL; j++) gEl[j] = (-1 + 91 * (j / (NEL - 1)) ** 2) * DEG
  const NSAMP = NAZ * NEL
  /** aerial perspective: one ray per azimuth toward the far (24 km) and middle (7 km) ridges */
  const AP_D = [24000, 7000]
  const NTOT = NSAMP + 2 * NAZ
  const VY = new Float32Array(NTOT)
  const VZ = new Float32Array(NTOT)
  const SR = new Float32Array(NTOT * NS)
  const SPY = new Float32Array(NTOT * NS)
  const SPZ = new Float32Array(NTOT * NS)
  const SWR = new Float32Array(NTOT * NS)
  const SWM = new Float32Array(NTOT * NS)
  const SVR = new Float32Array(NTOT * NS)
  const SVM = new Float32Array(NTOT * NS)
  const SVO = new Float32Array(NTOT * NS)
  /** total scattering columns along each ray (for the multiple-scattering estimate) */
  const TVR = new Float32Array(NTOT)
  const TVM = new Float32Array(NTOT)
  /** solid-angle weights for the mean sky */
  const SOLID = new Float32Array(NSAMP)
  /** RGB transmittance along the aerial-perspective rays */
  const apT = new Float32Array(2 * NAZ * 3)
  {
    const r0 = RE + H_OBS
    const dip = -Math.sqrt(1 - (RE * RE) / (r0 * r0))
    const Tq = new Float32Array(NB)
    const P = new Float32Array(NB)
    const white = binsToLinear(E0)
    for (let s = 0; s < NTOT; s++) {
      const ap = s >= NSAMP
      const i = ap ? (s - NSAMP) % NAZ : s % NAZ
      const el = ap ? 0.3 * DEG : gEl[(s / NAZ) | 0]
      const vx = Math.cos(el) * Math.sin(gAz[i])
      const vy = Math.sin(el)
      const vz = Math.cos(el) * Math.cos(gAz[i])
      VY[s] = vy
      VZ[s] = vz
      const mu = vy
      const d = ap ? AP_D[((s - NSAMP) / NAZ) | 0] : mu < dip ? -r0 * mu - Math.sqrt(Math.max(0, r0 * r0 * (mu * mu - 1) + RE * RE)) : -r0 * mu + Math.sqrt(r0 * r0 * (mu * mu - 1) + RT * RT)
      let aR = 0
      let aM = 0
      let aO = 0
      for (let n = 0; n < NS; n++) {
        // view rays: steps crowd toward the observer, where the air is dense; short ridge rays: even
        const u = (n + 0.5) / NS
        const t = ap ? d * u : d * u * u
        const dt = ap ? d / NS : (2 * d * u) / NS
        const px = vx * t
        const py = r0 + vy * t
        const pz = vz * t
        const r = Math.sqrt(px * px + py * py + pz * pz)
        const hh = r - RE
        const rR = Math.exp(-hh / HR) * dt
        const rM = Math.exp(-hh / HM) * dt
        const rO = ozone(hh) * dt
        const o = s * NS + n
        SR[o] = r
        SPY[o] = py / r
        SPZ[o] = pz / r
        SWR[o] = rR
        SWM[o] = rM
        SVR[o] = aR + rR / 2
        SVM[o] = aM + rM / 2
        SVO[o] = aO + rO / 2
        aR += rR
        aM += rM
        aO += rO
      }
      TVR[s] = aR
      TVM[s] = aM
      if (ap) {
        const c = new Float32Array([aR, aM, aO])
        transmit(c, Tq)
        for (let k = 0; k < NB; k++) P[k] = E0[k] * Tq[k]
        const l = binsToLinear(P)
        const q = (s - NSAMP) * 3
        for (let ch = 0; ch < 3; ch++) apT[q + ch] = clamp(l[ch] / Math.max(1e-9, white[ch]))
      } else if (el >= 0) {
        const j = (s / NAZ) | 0
        const dA = i === 0 ? gAz[1] / 2 : i === NAZ - 1 ? (gAz[i] - gAz[i - 1]) / 2 : (gAz[i + 1] - gAz[i - 1]) / 2
        const dE = j === 0 ? 0 : j === NEL - 1 ? (gEl[j] - gEl[j - 1]) / 2 : (gEl[j + 1] - gEl[j - 1]) / 2
        SOLID[s] = dA * dE * Math.cos(el)
      }
    }
  }
  /** single-scattered spectral radiance per ray */
  const Lss = new Float32Array(NTOT * NB)
  /** radiance, linear sRGB (unexposed), and luminance per ray */
  const gLin = new Float32Array(NTOT * 3)
  const gY = new Float32Array(NTOT)
  /** exposed, tone-mapped display colour, linear; and the ×4 refinement of it */
  const gDisp = new Float32Array(NSAMP * 3)
  const NAZF = (NAZ - 1) * 4 + 1
  const NELF = (NEL - 1) * 4 + 1
  const fTmp = new Float32Array(NAZF * NEL * 3)
  const gFine = new Float32Array(NAZF * NELF * 3)
  const Lbar = new Float32Array(NB)
  const Lk = new Float32Array(NB)
  const col = new Float32Array(3)
  const Tk = new Float32Array(NB)
  const Tk2 = new Float32Array(NB)
  let lastEs = 999

  let parity = 0
  /**
   * Single scattering for every ray (or, when `half`, for every other ray —
   * the sky changes slowly, so alternate frames share the work), then the
   * multiple-scattering estimate and the conversion to colour for all.
   */
  function computeSky(es: number, half: boolean) {
    const se = Math.sin(es)
    const ce = Math.cos(es)
    const g = MIE_G
    const kR = 3 / (16 * Math.PI)
    const kM = (3 / (8 * Math.PI)) * ((1 - g * g) / (2 + g * g))
    parity ^= 1
    for (let s = half ? parity : 0; s < NTOT; s += half ? 2 : 1) {
      const cth = VY[s] * se + VZ[s] * ce
      const pr = kR * (1 + cth * cth)
      const pm = (kM * (1 + cth * cth)) / Math.pow(1 + g * g - 2 * g * cth, 1.5)
      const L = s * NB
      for (let k = 0; k < NB; k++) Lss[L + k] = 0
      for (let n = 0; n < NS; n++) {
        const o = s * NS + n
        const mu = SPY[o] * se + SPZ[o] * ce
        if (!column(SR[o], mu, col)) continue
        const aR = SVR[o] + col[0]
        const aM = SVM[o] + col[1]
        const aO = SVO[o] + col[2]
        const wr = SWR[o] * pr
        const wm = SWM[o] * pm * BETA_MS
        const ext = BETA_ME * aM
        for (let k = 0; k < NB; k++) Lss[L + k] += Math.exp(-(BR[k] * aR + ext + BO[k] * aO)) * (BR[k] * wr + wm)
      }
      for (let k = 0; k < NB; k++) Lss[L + k] *= E0[k]
    }
    // the sky's downwelling light (cosine-weighted mean radiance), for light scattered more than once
    Lbar.fill(0)
    let wsum = 0
    for (let s = 0; s < NSAMP; s++) {
      const wgt = SOLID[s] * Math.max(0, VY[s])
      if (wgt <= 0) continue
      wsum += wgt
      for (let k = 0; k < NB; k++) Lbar[k] += Lss[s * NB + k] * wgt
    }
    for (let k = 0; k < NB; k++) Lbar[k] /= Math.max(1e-9, wsum)
    for (let s = 0; s < NTOT; s++) {
      const L = s * NB
      for (let k = 0; k < NB; k++) Lk[k] = Lss[L + k] + F_MS * Lbar[k] * (1 - Math.exp(-(BR[k] * TVR[s] + BETA_MS * TVM[s])))
      const lin = binsToLinear(Lk)
      gLin[s * 3] = Math.max(0, lin[0])
      gLin[s * 3 + 1] = Math.max(0, lin[1])
      gLin[s * 3 + 2] = Math.max(0, lin[2])
      gY[s] = 0.2126 * gLin[s * 3] + 0.7152 * gLin[s * 3 + 1] + 0.0722 * gLin[s * 3 + 2]
    }
  }

  /**
   * Exposure k, then a tone curve on luminance that keeps the hue; over-bright
   * colours bleach toward white. Below a few cd/m² the rods join in: the
   * colour drifts toward a bluish, desaturated scotopic rendering (the
   * Purkinje shift), as the dark-adapted eye sees it.
   */
  function tone(r: number, g: number, b: number, k: number, out: Float32Array | Rgb, o: number, floor = 1) {
    const Yl = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const Y = Yl * k
    let R = 0
    let G = 0
    let B = 0
    if (Y > 1e-12) {
      const s = (1 - Math.exp(-Math.pow(Y, TONE_P))) / Y
      R = r * k * s
      G = g * k * s
      B = b * k * s
      const mx = Math.max(R, G, B)
      if (mx > 1) {
        const wv = clamp((mx - 1) / mx) * 0.8
        R = R / mx + (1 - R / mx) * wv
        G = G / mx + (1 - G / mx) * wv
        B = B / mx + (1 - B / mx) * wv
      }
      // mesopic: rod weight from absolute luminance (cd/m²), 3 → 0.003
      const cd = 683 * Yl
      const rod = cd > 3 ? 0 : clamp(Math.log10(3 / Math.max(1e-6, cd)) / 3) * 0.75
      if (rod > 0) {
        const X = 0.4124 * r + 0.3576 * g + 0.1805 * b
        const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
        const V = Math.max(0, Yl * (1.33 * (1 + (Yl + Z) / Math.max(1e-12, X)) - 1.68)) * k
        const Vt = 1 - Math.exp(-Math.pow(V, TONE_P))
        R = R * (1 - rod) + Vt * SCOTO[0] * rod
        G = G * (1 - rod) + Vt * SCOTO[1] * rod
        B = B * (1 - rod) + Vt * SCOTO[2] * rod
      }
    }
    // the night ground shows through only where the sky is dark
    const f = floor * Math.exp(-(0.2126 * R + 0.7152 * G + 0.0722 * B) / 0.1)
    out[o] = R + FLOOR[0] * f
    out[o + 1] = G + FLOOR[1] * f
    out[o + 2] = B + FLOOR[2] * f
  }

  /** Refine gDisp ×4 in both directions (separable Catmull–Rom; azimuth mirrors at 0 and π). */
  function refine() {
    for (let j = 0; j < NEL; j++) {
      for (let fi = 0; fi < NAZF; fi++) {
        const i = fi >> 2
        const wts = CR[fi & 3]
        for (let c = 0; c < 3; c++) {
          let v = 0
          for (let q = 0; q < 4; q++) {
            let ii = i - 1 + q
            if (ii < 0) ii = -ii
            if (ii > NAZ - 1) ii = 2 * (NAZ - 1) - ii
            v += wts[q] * gDisp[(j * NAZ + ii) * 3 + c]
          }
          fTmp[(j * NAZF + fi) * 3 + c] = v
        }
      }
    }
    for (let fj = 0; fj < NELF; fj++) {
      const j = fj >> 2
      const wts = CR[fj & 3]
      for (let fi = 0; fi < NAZF; fi++) {
        for (let c = 0; c < 3; c++) {
          let v = 0
          for (let q = 0; q < 4; q++) {
            const jj = Math.max(0, Math.min(NEL - 1, j - 1 + q))
            v += wts[q] * fTmp[(jj * NAZF + fi) * 3 + c]
          }
          gFine[(fj * NAZF + fi) * 3 + c] = v < 0 ? 0 : v
        }
      }
    }
  }

  /* ---------------------------------------------------------------- state */
  let w = env.width
  let h = env.height
  let portrait = false
  let short = false
  let tiny = false
  let narrow = false
  let pad = 24
  let horizonY = 0
  let fov = 360
  let pxDeg = 4
  let capSize = 30
  let capX = 0
  let capY = 0
  let rulerY = 0
  let ds = 3
  let sky: HTMLCanvasElement | null = null
  let sctx: CanvasRenderingContext2D | null = null
  let img: ImageData | null = null
  let sw = 1
  let sh = 1
  let rowF = new Float32Array(1)
  let colF = new Float32Array(1)
  // land
  let farY = new Float32Array(1)
  let midY = new Float32Array(1)
  let nearY = new Float32Array(1)
  const LSTEP = 4
  let crestX = 0.88
  let treeX = 0
  let treeY = 0
  let treeH = 60
  let tree: Seg[] = []
  let leaves: { x: number; y: number; a: number }[] = []
  let figX = 0
  let figY = 0
  let figS = 10
  let figDir = -1

  /** elevation (radians) → y */
  function elToY(el: number) {
    const u = el / (Math.PI / 2)
    if (u <= 0) return horizonY - u * 90 * pxDeg
    return horizonY - horizonY * (1 - Math.pow(1 - Math.min(1, u), 1.5))
  }
  /** azimuth (radians, from south) → x */
  const azToX = (az: number) => w / 2 + (az / (fov * DEG)) * w

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    short = h < 380
    tiny = h < 260 || w < 330
    narrow = w < 560
    pad = Math.round(clamp(Math.min(w, h) * 0.045, 12, 34))
    horizonY = Math.round(portrait ? h * 0.66 : short ? h * 0.68 : h * 0.71)
    fov = clamp(lerp(180, 360, (w / h - 0.95) / (1.6 - 0.95)), 180, 360)
    pxDeg = (1.5 * horizonY) / 90
    capSize = portrait ? clamp(Math.min(w * 0.075, h * 0.042), 18, 40) : clamp(Math.min(w * 0.036, h * 0.06), short ? 14 : 20, 46)
    rulerY = h - (short ? 10 : pad * 0.7)
    capX = portrait ? pad : pad * 1.2
    capY = rulerY - (short ? 24 : 30) - capSize * 2.1
    ds = preview ? 2 : w * h > 1.8e6 ? 4 : w * h > 0.9e6 ? 3 : 2
    // the sky image covers the frame down to a little under the horizon
    sw = Math.max(2, Math.ceil(w / ds))
    sh = Math.max(2, Math.ceil((horizonY + pxDeg * 1.2) / ds))
    if (typeof document !== 'undefined') {
      if (!sky) sky = document.createElement('canvas')
      sky.width = sw
      sky.height = sh
      sctx = sky.getContext('2d')
      img = sctx ? sctx.createImageData(sw, sh) : null
    }
    rowF = new Float32Array(sh)
    for (let y = 0; y < sh; y++) {
      const py = (y + 0.5) * ds
      let el: number
      if (py >= horizonY) el = -((py - horizonY) / pxDeg) * DEG
      else {
        const g2 = 1 - py / horizonY
        el = (1 - Math.pow(1 - g2, 1 / 1.5)) * (Math.PI / 2)
      }
      rowF[y] = Math.sqrt(clamp((el / DEG + 1) / 91)) * (NELF - 1)
    }
    colF = new Float32Array(sw)
    buildLand()
    lastEs = 999
  }

  function buildLand() {
    const n = Math.ceil(w / LSTEP) + 2
    farY = new Float32Array(n)
    midY = new Float32Array(n)
    nearY = new Float32Array(n)
    const landH = h - horizonY
    // the hill and its tree stand clear of sunrise and sunset
    const riseX = 0.5 - sunAt(-hourOfElevation(0) * DEG).az / DEG / -fov
    const setX = 1 - riseX
    const right = setX + 0.13 <= 0.93
    crestX = right ? setX + 0.15 : Math.max(0.2, riseX + 0.26)
    figDir = right ? 1 : -1
    const sigma = portrait ? 0.18 : 0.09
    const crestUp = Math.min(pxDeg * 2.6, landH * 0.4, h * 0.045)
    for (let i = 0; i < n; i++) {
      const x = i * LSTEP
      const u = x / w
      farY[i] = horizonY - pxDeg * (0.2 + 0.6 * (0.5 + 0.5 * noise.fbm2(u * 5 + 1.3, 0.4, 3))) * (0.6 + 0.4 * Math.sin(u * 3.1 + 0.7))
      const bump = Math.exp(-(((u - (right ? 0.18 : 0.62)) / 0.15) ** 2)) * pxDeg * 1.5 + Math.exp(-(((u - (right ? 0.42 : 0.86)) / 0.1) ** 2)) * pxDeg * 0.6
      midY[i] = horizonY + pxDeg * 0.25 - bump * (0.8 + 0.2 * noise.n2(u * 9, 2.2))
      const du = u - crestX
      const hill = Math.exp(-((du / (du * (right ? -1 : 1) > 0 ? sigma : sigma * (portrait ? 1.6 : 2.2))) ** 2))
      const base = horizonY + Math.min(landH * (0.4 + 0.1 * (right ? -u : u)), h * 0.11)
      nearY[i] = base - (base - (horizonY - crestUp)) * hill + noise.fbm2(u * 14, 7.7, 2) * landH * 0.025
    }
    treeX = w * (crestX + (right ? 0.012 : -0.012))
    treeY = nearAt(treeX) + 1
    treeH = clamp(h * (portrait ? 0.085 : 0.12), short ? 24 : 32, 120)
    figS = treeH * 0.24
    figX = treeX - figDir * treeH * 0.36
    figY = nearAt(figX) + 1
    const r = rng(77)
    tree = []
    leaves = []
    const MAXD = 5
    const grow = (x: number, y: number, a: number, len: number, d: number) => {
      const x1 = x + Math.sin(a) * len
      const y1 = y - Math.cos(a) * len
      tree.push({ x0: x, y0: y, x1, y1, d })
      if (d >= MAXD) {
        for (let q = 0; q < 2; q++) leaves.push({ x: x1 + (r() - 0.5) * len * 0.9, y: y1 + (r() - 0.6) * len * 0.7, a: r() * TAU })
        return
      }
      const kids = d === 0 ? 3 : r() < 0.3 ? 3 : 2
      const spread = [0.62, 0.52, 0.46, 0.42, 0.4][d]
      for (let q = 0; q < kids; q++) {
        let na = a + (q - (kids - 1) / 2) * spread * (kids === 3 ? 1 : 1.25) + (r() - 0.5) * 0.3
        // limbs lift a little toward the light
        na = na * (d === 0 ? 1.15 : 0.9)
        grow(x1, y1, na, len * (d === 0 ? 0.6 : 0.74) * (0.85 + r() * 0.3), d + 1)
      }
    }
    grow(0, 0, 0.02, 0.31, 0)
  }
  function nearAt(x: number) {
    const f = clamp(x / LSTEP, 0, nearY.length - 1.001)
    const i = f | 0
    return lerp(nearY[i], nearY[i + 1], f - i)
  }

  /* ------------------------------------------------------------ the stars */
  const NSTAR = preview ? 160 : 420
  const starRA = new Float32Array(NSTAR)
  const starDec = new Float32Array(NSTAR)
  const starB = new Float32Array(NSTAR)
  {
    const r = rng(1871)
    for (let i = 0; i < NSTAR; i++) {
      starRA[i] = r() * TAU
      starDec[i] = Math.asin(r() * 1.7 - 0.7)
      starB[i] = 0.18 + 0.82 * Math.pow(r(), 5)
    }
  }

  /* ------------------------------------------------------------- clock */
  const at = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(at) ? at : preview ? 49 : 6
  let prevT = -1
  let curT = 0
  // dragging the sun
  let dragging: 'sun' | 'ruler' | null = null
  let dragTarget = -1
  let touched = false
  // test hook: ?hover=x,y (CSS px) shows the hover prompt in a frozen frame
  const hv = (env.params.get('hover') ?? '').split(',').map(Number)
  let hoverX = hv.length === 2 && Number.isFinite(hv[0]) ? hv[0] : -1
  let hoverY = hv.length === 2 && Number.isFinite(hv[1]) ? hv[1] : -1
  let pointerType = 'mouse'
  let glide = -1
  let inkK = 1
  let lastHourTick = -1

  /* ------------------------------------------------------------ sound */
  const sfx = env.sfx
  let nextWind = 0
  let nextBird = 0
  let nextCricket = 0
  function sound(elD: number, H: number, t: number) {
    if (!sfx.enabled) return
    if (t > nextWind) {
      nextWind = t + 3.2 + Math.random() * 2
      sfx.noise(6.5, { filter: 260 + Math.random() * 200, to: 380 + Math.random() * 300, q: 0.5, gain: 0.018, room: 0.4, pan: Math.random() * 1.2 - 0.6 })
    }
    if (H < 0 && elD > -5 && elD < 9 && t > nextBird) {
      // a dawn chorus: short falling and rising whistles
      nextBird = t + 0.35 + Math.random() * 1.4
      const f = 2400 + Math.random() * 2600
      const n = 1 + Math.floor(Math.random() * 3)
      const pan = Math.random() * 1.6 - 0.8
      for (let q = 0; q < n; q++) sfx.tone(f * (1 + q * 0.06), 0.09 + Math.random() * 0.08, { type: 'sine', gain: 0.012, to: f * (0.75 + Math.random() * 0.5), when: q * 0.12, pan, room: 0.35 })
    }
    if (H > 0 && elD < -1.5 && elD > -16 && t > nextCricket) {
      // crickets after sunset
      nextCricket = t + 0.9 + Math.random() * 0.8
      const pan = Math.random() * 1.4 - 0.7
      for (let q = 0; q < 3; q++) sfx.tone(4400, 0.035, { type: 'sine', gain: 0.007, when: q * 0.055, pan, room: 0.25 })
    }
  }

  /* --------------------------------------------------------------- ink */
  const inkHex = () => mixHex(C.ink, NIGHT_INK, inkK)
  const mutedHex = () => mixHex(C.muted, '#B4C4C0', inkK)
  const inkA = (a: number) => rgba(inkHex(), a)

  /* --------------------------------------------------------- the frame */

  function paintSky(sunAz: number) {
    if (!img || !sctx || !sky) return
    const fr = fov * DEG
    for (let x = 0; x < sw; x++) {
      const az = (((x + 0.5) * ds) / w - 0.5) * fr
      let rel = Math.abs(mod(az - sunAz + Math.PI, TAU) - Math.PI)
      if (rel > Math.PI) rel = Math.PI
      colF[x] = Math.pow(rel / Math.PI, 1 / 1.6) * (NAZF - 1)
    }
    const data = img.data
    let p = 0
    for (let y = 0; y < sh; y++) {
      const fj = rowF[y]
      const j = Math.min(NELF - 2, fj | 0)
      const b = fj - j
      const by = (y & 3) * 4
      for (let x = 0; x < sw; x++) {
        const fi = colF[x]
        const i = Math.min(NAZF - 2, fi | 0)
        const a = fi - i
        const o00 = (j * NAZF + i) * 3
        const o10 = o00 + NAZF * 3
        const w00 = (1 - a) * (1 - b)
        const w01 = a * (1 - b)
        const w10 = (1 - a) * b
        const w11 = a * b
        const d = BAYER[by + (x & 3)]
        data[p] = encByte(gFine[o00] * w00 + gFine[o00 + 3] * w01 + gFine[o10] * w10 + gFine[o10 + 3] * w11, d)
        data[p + 1] = encByte(gFine[o00 + 1] * w00 + gFine[o00 + 4] * w01 + gFine[o10 + 1] * w10 + gFine[o10 + 4] * w11, d)
        data[p + 2] = encByte(gFine[o00 + 2] * w00 + gFine[o00 + 5] * w01 + gFine[o10 + 2] * w10 + gFine[o10 + 5] * w11, d)
        data[p + 3] = 255
        p += 4
      }
    }
    sctx.putImageData(img, 0, 0)
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(sky, 0, 0, sw, sh, 0, 0, sw * ds, sh * ds)
    ctx.restore()
  }

  /** display colour (linear) of the sky at elevation el, sun-relative azimuth rel (radians) */
  function skyDisp(el: number, rel: number, out: Rgb) {
    const fj = Math.sqrt(clamp((el / DEG + 1) / 91)) * (NEL - 1)
    const fi = Math.pow(clamp(Math.abs(rel) / Math.PI), 1 / 1.6) * (NAZ - 1)
    const j = Math.min(NEL - 2, fj | 0)
    const i = Math.min(NAZ - 2, fi | 0)
    const a = fi - i
    const b = fj - j
    const o00 = (j * NAZ + i) * 3
    const o10 = o00 + NAZ * 3
    for (let c = 0; c < 3; c++) out[c] = (gDisp[o00 + c] * (1 - a) + gDisp[o00 + 3 + c] * a) * (1 - b) + (gDisp[o10 + c] * (1 - a) + gDisp[o10 + 3 + c] * a) * b
    return out
  }
  const tmpRgb: Rgb = [0, 0, 0]
  const lum = (c: ArrayLike<number>) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

  // per-frame values shared by the drawing helpers
  let kExp = 1
  let yRef = 0
  const ridgeLin = new Float32Array(2 * NAZ * 3)
  const nearLin = new Float32Array(3)
  let sunAzNow = 0

  function frameAt(t: number, dt: number) {
    // time: the piece clock, held while the sun is dragged
    if (dragging) {
      offset -= dt
      if (dragTarget >= 0) {
        const T0 = mod(t + offset, LOOP)
        const dT = mod(dragTarget - T0 + LOOP / 2, LOOP) - LOOP / 2
        offset += dT * damp(14, Math.max(dt, 1 / 60))
      }
    } else if (glide >= 0) {
      const T0 = mod(t + offset, LOOP)
      const dT = mod(glide - T0, LOOP)
      const step = Math.min(dT, Math.max(dt * 8, dT * damp(5, dt)))
      offset += step
      if (dT < 0.02) glide = -1
    }
    const T = mod(t + offset, LOOP)
    curT = T
    const advancing = dt > 0 && prevT >= 0 && T >= prevT && !dragging
    const crossed = (te: number) => advancing && prevT < te && te <= T
    const Hd = hourAngle(T)
    const sun = sunAt(Hd * DEG)
    sunAzNow = sun.az
    const es = sun.el
    const elD = es / DEG

    if (Math.abs(es - lastEs) > 0.004 * DEG) {
      // a big jump (first frame, a drag, a resize) computes everything at once
      computeSky(es, !preview && Math.abs(es - lastEs) < 0.25 * DEG && dt > 0)
      lastEs = es
      // exposure: the eye adapts, but not all the way (night stays night)
      let ySum = 0
      let wSum = 0
      for (let s = 0; s < NSAMP; s++) {
        if (gEl[(s / NAZ) | 0] < 6 * DEG) continue
        ySum += gY[s] * SOLID[s]
        wSum += SOLID[s]
      }
      yRef = ySum / Math.max(1e-12, wSum)
      kExp = KEY / Math.pow(yRef + ADAPT, 0.82)
      for (let s = 0; s < NSAMP; s++) tone(gLin[s * 3], gLin[s * 3 + 1], gLin[s * 3 + 2], kExp, gDisp, s * 3)
      refine()
      // the land: shaded slopes lit by the sky, seen through the air in front of them
      const r0 = RE + H_OBS
      for (let k = 0; k < NB; k++) Lk[k] = Lbar[k] * ALBEDO * 0.6
      const obj = binsToLinear(Lk)
      for (let q = 0; q < 2 * NAZ; q++) {
        const s = NSAMP + q
        tone(obj[0] * apT[q * 3] + gLin[s * 3], obj[1] * apT[q * 3 + 1] + gLin[s * 3 + 1], obj[2] * apT[q * 3 + 2] + gLin[s * 3 + 2], kExp, ridgeLin, q * 3, 0.8)
      }
      tone(obj[0] * 0.55, obj[1] * 0.55, obj[2] * 0.55, kExp, nearLin, 0, 0.6)
      void r0
    }

    // the sun: its disc colour is what the air lets through
    const r0 = RE + H_OBS
    let sunCol: Rgb | null = null
    let airMass = 0
    if (column(r0, Math.sin(es), col)) {
      transmit(col, Tk)
      for (let k = 0; k < NB; k++) Lk[k] = E0[k] * Tk[k]
      const l = binsToLinear(Lk)
      const mx = Math.max(l[0], l[1], l[2], 1e-9)
      sunCol = [Math.max(0, l[0] / mx), Math.max(0, l[1] / mx), Math.max(0, l[2] / mx)]
      const c0 = col[0]
      column(r0, 1, col)
      airMass = c0 / col[0]
    }

    // ink: light over a dark sky, dark over a bright one
    {
      const L = Math.max(lum(skyDisp(72 * DEG, Math.PI * 0.75, tmpRgb)), lum(skyDisp(72 * DEG, Math.PI * 0.25, tmpRgb)))
      const target = enc(clamp(L)) > 0.56 ? 0 : 1
      inkK = dt > 0 ? lerp(inkK, target, damp(3, dt)) : target
    }

    /* ------------------------------------------------------------ sky */
    paintSky(sun.az)

    // hairlines: the sky drawn as fine horizontal rules
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(4,12,22,0.075)'
    ctx.beginPath()
    for (let y = 1.5; y < horizonY; y += 3) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    ctx.restore()

    // stars, appearing where the sky grows darker than they are
    drawStars(Hd * DEG, sun.az)

    // the diurnal arc: the path the sun takes, with hour ticks
    if (!preview && !tiny) drawArc()

    // the sun
    const appEl = elD + refraction(elD)
    const sx = azToX(sun.az)
    const sy = elToY(appEl * DEG)
    const rs = clamp(Math.min(w, h) * 0.011, 3.5, 10)
    if (sunCol && appEl > -1) {
      const c = sunCol
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const ar = Math.min(w, h) * (preview ? 0.12 : 0.1)
      const g = ctx.createRadialGradient(sx, sy, rs * 0.5, sx, sy, ar)
      const strength = 0.3 * smoothstep(-1, 3, appEl)
      g.addColorStop(0, cssLin([c[0] * 0.9, c[1] * 0.85, c[2] * 0.8], strength))
      g.addColorStop(0.3, cssLin([c[0] * 0.6, c[1] * 0.5, c[2] * 0.4], strength * 0.3))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(sx - ar, sy - ar, ar * 2, ar * 2)
      ctx.restore()
      // the disc, flattened by refraction near the horizon
      const flat = 1 - 0.16 * Math.exp(-Math.max(0, elD) / 1.2)
      ctx.fillStyle = cssLin([0.06 + c[0] * 0.94, 0.04 + c[1] * 0.92, 0.02 + c[2] * 0.88])
      ctx.beginPath()
      ctx.ellipse(sx, sy, rs, rs * flat, 0, 0, TAU)
      ctx.fill()
    }

    /* ------------------------------------------------------------ land */
    drawLand(t)

    // the sun below the horizon: a dashed ring where it is, under the ground
    if (!preview && !tiny && elD < 0 && elD > -40) {
      const dep = -elD
      const yb = horizonY + Math.min((h - horizonY) * 0.62, Math.sqrt(dep) * (h - horizonY) * 0.11)
      const al = smoothstep(0, 1.5, dep) * (1 - smoothstep(30, 40, dep)) * 0.7
      const capTop = capY - 4
      const overCaption = sx < capX + capSize * 9 && yb > capTop
      if (yb < rulerY - 30 && al > 0.01 && !overCaption) {
        ctx.save()
        ctx.globalAlpha = al
        ctx.strokeStyle = rgba(NIGHT_INK, 0.55)
        ctx.lineWidth = 1
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.arc(sx, yb, rs + 2, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(sx, yb - rs - 4)
        ctx.lineTo(sx, Math.max(yb - rs - 4, horizonY + 3))
        ctx.stroke()
        text(ctx, `SUN ${signed(elD)}`, sx + rs + 8, yb + 3, { size: 9, color: rgba(NIGHT_INK, 0.7), tracking: 0.12 })
        ctx.restore()
      }
    }

    /* -------------------------------------------------------- annotation */
    if (!preview) shadowBelt(elD, sun.az)
    instruments(Hd, es, sunCol, airMass)
    captionAt(T)
    if (!preview) {
      ruler(Hd)
      prompts(t, rs)
    }

    // sound
    sound(elD, Hd, t)
    if (dragging && sfx.enabled) {
      const hour = Math.floor(mod(12 + Hd / 15, 24))
      if (hour !== lastHourTick) {
        if (lastHourTick >= 0) sfx.tone(hour % 6 === 0 ? 880 : 1320, 0.05, { type: 'sine', gain: 0.02, room: 0.2 })
        lastHourTick = hour
      }
    }
    if (crossed(20) || crossed(54)) sfx.tone(146.83, 3.2, { type: 'sine', gain: 0.03, attack: 0.6, room: 0.6 })

    if (debug) text(ctx, `T ${T.toFixed(2)} H ${Hd.toFixed(1)} el ${elD.toFixed(2)} sky ${(683 * yRef).toExponential(2)} cd/m²`, pad, h - 3, { size: 10, color: '#ff0' })
    prevT = T
  }

  /* --------------------------------------------------------- the land */
  function drawLand(t: number) {
    const fr = fov * DEG
    // aerial perspective: distant ridges take on the colour of the air in front of them
    const gradFor = (ridge: number) => {
      const g = ctx.createLinearGradient(0, 0, w, 0)
      const stops = 17
      const c = new Float32Array(3)
      for (let q = 0; q < stops; q++) {
        const u = q / (stops - 1)
        const az = (u - 0.5) * fr
        const rel = Math.abs(mod(az - sunAzNow + Math.PI, TAU) - Math.PI)
        const fi = Math.pow(clamp(rel / Math.PI), 1 / 1.6) * (NAZ - 1)
        const i = Math.min(NAZ - 2, fi | 0)
        const a = fi - i
        const o = (ridge * NAZ + i) * 3
        for (let ch = 0; ch < 3; ch++) c[ch] = ridgeLin[o + ch] * (1 - a) + ridgeLin[o + 3 + ch] * a
        g.addColorStop(u, cssLin(c))
      }
      return g
    }
    const fill = (ys: Float32Array, style: string | CanvasGradient) => {
      ctx.beginPath()
      ctx.moveTo(-2, h)
      for (let i = 0; i < ys.length; i++) ctx.lineTo(i * LSTEP, ys[i])
      ctx.lineTo(w + 2, h)
      ctx.closePath()
      ctx.fillStyle = style
      ctx.fill()
    }
    const rim = (ys: Float32Array, a: number) => {
      ctx.beginPath()
      for (let i = 0; i < ys.length; i++) {
        if (i === 0) ctx.moveTo(0, ys[i])
        else ctx.lineTo(i * LSTEP, ys[i])
      }
      ctx.strokeStyle = rgba(NIGHT_INK, a)
      ctx.lineWidth = 1
      ctx.stroke()
    }
    fill(farY, gradFor(0))
    rim(farY, 0.08)
    fill(midY, gradFor(1))
    rim(midY, 0.1)
    // the folds of the middle distance, closer together as they recede
    ctx.beginPath()
    for (let q = 1; q <= 4; q++) {
      const f = (q / 5) ** 1.5
      for (let i = 0; i < midY.length; i += 2) {
        const x = i * LSTEP
        const y = midY[i] + (nearY[i] - midY[i]) * f + noise.n2(x * 0.006, q * 3.1) * 3
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
    }
    ctx.strokeStyle = rgba(NIGHT_INK, 0.05)
    ctx.lineWidth = 1
    ctx.stroke()

    // the near hill
    const nearCol = cssLin(nearLin)
    fill(nearY, nearCol)
    if (!preview) {
      // hatching on the hill
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = rgba(NIGHT_INK, 0.05)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let d = -h; d < w + h; d += 6) {
        ctx.moveTo(d, horizonY - 60)
        ctx.lineTo(d + (h - horizonY + 60) * 0.9, h)
      }
      ctx.stroke()
      ctx.restore()
    }
    rim(nearY, 0.2)

    // grass along the near hill, leaning in the wind
    const gust = 0.5 + 0.5 * noise.n2(t * 0.15, 4.4)
    ctx.beginPath()
    const gs = preview ? 5 : 3.2
    const gscale = clamp(h / 700, 0.6, 1.3)
    for (let x = gs * 0.5; x < w; x += gs) {
      const y = nearAt(x)
      if (y > h - 4) continue
      const hgt = (3 + 6 * (0.5 + 0.5 * noise.n2(x * 0.11, 1.7))) * gscale
      const lean = (noise.n2(x * 0.012 - t * 0.9, t * 0.3) * 0.6 + gust * 0.7) * hgt * 0.55
      ctx.moveTo(x, y + 1)
      ctx.quadraticCurveTo(x + lean * 0.3, y - hgt * 0.55, x + lean, y - hgt)
    }
    ctx.strokeStyle = rgba(NIGHT_INK, 0.2)
    ctx.lineWidth = 0.8
    ctx.stroke()

    // the tree: a fine branching silhouette, swaying
    const sway = (noise.n2(t * 0.22, 9.1) * 0.5 + gust * 0.5) * 0.03
    const TX = (x: number, y: number) => treeX + x * treeH - sway * treeH * y * y * 1.2
    const TY = (y: number) => treeY + y * treeH
    ctx.save()
    ctx.lineCap = 'round'
    for (let d = 0; d <= 5; d++) {
      ctx.beginPath()
      for (const s of tree) {
        if (s.d !== d) continue
        ctx.moveTo(TX(s.x0, s.y0), TY(s.y0))
        ctx.lineTo(TX(s.x1, s.y1), TY(s.y1))
      }
      ctx.lineWidth = Math.max(0.6, (treeH / 80) * [3.6, 2.4, 1.6, 1.1, 0.85, 0.7][d])
      ctx.strokeStyle = nearCol
      ctx.stroke()
    }
    // leaves: tiny strokes
    ctx.beginPath()
    for (const l of leaves) {
      const lx = TX(l.x, l.y)
      const ly = TY(l.y)
      const a = l.a + sway * 8
      const L = treeH * 0.024
      ctx.moveTo(lx - Math.cos(a) * L, ly - Math.sin(a) * L)
      ctx.lineTo(lx + Math.cos(a) * L, ly + Math.sin(a) * L)
    }
    ctx.lineWidth = Math.max(1, treeH / 60)
    ctx.strokeStyle = nearCol
    ctx.stroke()
    // a hairline of sky-light along the outer twigs
    ctx.beginPath()
    for (const s of tree) {
      if (s.d < 3) continue
      ctx.moveTo(TX(s.x0, s.y0), TY(s.y0))
      ctx.lineTo(TX(s.x1, s.y1), TY(s.y1))
    }
    ctx.lineWidth = 0.5
    ctx.strokeStyle = rgba(NIGHT_INK, 0.08)
    ctx.stroke()
    ctx.restore()

    // the figure, sitting on the hill with knees drawn up, watching the sunset
    {
      const s = figS
      const d = figDir
      const P = (px: number, py: number): [number, number] => [figX + px * s * d, figY + py * s]
      const poly = (pts: number[][]) => {
        pts.forEach(([px, py], i) => {
          const [X, Y] = P(px, py)
          if (i === 0) ctx.moveTo(X, Y)
          else ctx.lineTo(X, Y)
        })
        ctx.closePath()
      }
      ctx.beginPath()
      // legs: hip, knee, foot
      poly([
        [0.16, 0.02],
        [0.04, -0.16],
        [-0.26, -0.5],
        [-0.36, -0.5],
        [-0.42, -0.3],
        [-0.5, 0],
        [-0.6, 0.02],
      ])
      // back and shoulders, the arm reaching around the knee
      poly([
        [0.24, 0.02],
        [0.26, -0.3],
        [0.2, -0.6],
        [0.1, -0.74],
        [-0.02, -0.72],
        [-0.12, -0.62],
        [-0.3, -0.5],
        [-0.28, -0.42],
        [-0.08, -0.5],
        [0.02, -0.3],
        [0.06, 0.02],
      ])
      const [hx, hy] = P(0.04, -0.88)
      ctx.moveTo(hx + s * 0.13, hy)
      ctx.arc(hx, hy, s * 0.13, 0, TAU)
      ctx.fillStyle = nearCol
      ctx.fill()
      ctx.strokeStyle = rgba(NIGHT_INK, 0.16)
      ctx.lineWidth = 0.75
      ctx.stroke()
    }
  }

  /* ------------------------------------------------------- the stars */
  const starPaths: Path2D[] = []
  function drawStars(lst: number, sunAz: number) {
    const sl = Math.sin(LAT)
    const cl = Math.cos(LAT)
    const fr = fov * DEG
    for (let q = 0; q < 4; q++) starPaths[q] = new Path2D()
    const alphas = [0.25, 0.45, 0.7, 0.95]
    let any = false
    const c: Rgb = [0, 0, 0]
    for (let i = 0; i < NSTAR + 1; i++) {
      const venus = i === NSTAR
      // Venus, the evening star, follows the sun about two and a half hours behind
      const Hs = venus ? lst - 37.5 * DEG : lst - starRA[i]
      const dec = venus ? DEC - 4 * DEG : starDec[i]
      const sd = Math.sin(dec)
      const cd = Math.cos(dec)
      const sel = sl * sd + cl * cd * Math.cos(Hs)
      if (sel < 0.02) continue
      const el = Math.asin(sel)
      const az = Math.atan2(Math.sin(Hs), Math.cos(Hs) * sl - (sd / cd) * cl)
      if (Math.abs(az) > fr / 2 + 0.02) continue
      const rel = Math.abs(mod(az - sunAz + Math.PI, TAU) - Math.PI)
      const sk = lum(skyDisp(el, rel, c))
      const b = venus ? 2.6 : starB[i]
      // contrast against the sky, and dimming toward the horizon (extinction)
      const vis = clamp((b * 0.07 - sk) / (b * 0.07)) * clamp(1 - Math.exp(-sel * 9))
      if (vis <= 0.03) continue
      const x = azToX(az)
      const y = elToY(el)
      if (y > horizonY - 2) continue
      const tw = 0.85 + 0.15 * Math.sin(i * 12.9898 + curT * (3 + (i % 5)))
      const lvl = Math.min(3, Math.floor(vis * Math.min(1, b) * tw * 4.2))
      const r = venus ? 1.7 : 0.55 + b * 0.9
      starPaths[lvl].moveTo(x + r, y)
      starPaths[lvl].arc(x, y, r, 0, TAU)
      any = true
      if (venus && !preview && !tiny && vis > 0.2) {
        ctx.save()
        ctx.globalAlpha = vis * 0.8 * smoothstep(55, 58, curT) * (1 - smoothstep(68, 71, curT))
        ctx.strokeStyle = rgba(NIGHT_INK, 0.5)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + 5, y - 5)
        ctx.lineTo(x + 16, y - 16)
        ctx.lineTo(x + 30, y - 16)
        ctx.stroke()
        text(ctx, 'VENUS · MAG −4', x + 34, y - 13, { size: 8.5, color: rgba(NIGHT_INK, 0.75), tracking: 0.14 })
        ctx.restore()
      }
    }
    if (!any) return
    for (let q = 0; q < 4; q++) {
      ctx.fillStyle = rgba('#F2F6F8', alphas[q])
      ctx.fill(starPaths[q])
    }
  }

  /* ----------------------------------------------- the sun's arc, with hours */
  function drawArc() {
    ctx.save()
    ctx.strokeStyle = inkA(0.2)
    ctx.lineWidth = 1
    ctx.setLineDash([1.5, 4])
    ctx.beginPath()
    let pen = false
    for (let Hd = -90; Hd <= 90; Hd += 1) {
      const s = sunAt(Hd * DEG)
      const e = s.el / DEG
      if (e < 0) {
        pen = false
        continue
      }
      const x = azToX(s.az)
      const y = elToY((e + refraction(e)) * DEG)
      if (!pen) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      pen = true
    }
    ctx.stroke()
    ctx.setLineDash([])
    // hour ticks
    ctx.beginPath()
    const labels: [string, number, number][] = []
    for (let hr = 6; hr <= 18; hr++) {
      const Hd = (hr - 12) * 15
      const s = sunAt(Hd * DEG)
      const e = s.el / DEG
      if (e < 0.5) continue
      const x = azToX(s.az)
      const y = elToY((e + refraction(e)) * DEG)
      const s2 = sunAt((Hd + 1) * DEG)
      const x2 = azToX(s2.az)
      const y2 = elToY(s2.el)
      const L = Math.hypot(x2 - x, y2 - y) || 1
      const nx = -(y2 - y) / L
      const ny = (x2 - x) / L
      const len = hr % 3 === 0 ? 5 : 3
      ctx.moveTo(x - nx * len, y - ny * len)
      ctx.lineTo(x + nx * len, y + ny * len)
      if (hr % 3 === 0) labels.push([String(hr).padStart(2, '0'), x - nx * 13, y - ny * 13])
    }
    ctx.strokeStyle = inkA(0.3)
    ctx.stroke()
    for (const [s, x, y] of labels) text(ctx, s, x, y + 3, { size: 8.5, color: inkA(0.42), align: 'center', tracking: 0.1 })
    ctx.restore()
  }

  /* ------------------------------------- Earth's shadow and the Belt of Venus */
  function shadowBelt(elD: number, sunAz: number) {
    const al = smoothstep(2.5, 0.2, elD) * smoothstep(-9.5, -5.5, elD)
    if (al <= 0.01 || short || tiny) return
    const anti = sunAz > 0 ? sunAz - Math.PI : sunAz + Math.PI
    const x = azToX(anti)
    if (x < pad + 40 || x > w - pad - 40) return
    const dep = Math.max(0, -elD)
    const eShadow = clamp(dep * 0.9 + 1, 1, 8)
    const eBelt = eShadow + 7
    const yS = elToY(eShadow * DEG)
    const yB = elToY(eBelt * DEG)
    const k = rgba(NIGHT_INK, 0.66)
    ctx.save()
    ctx.globalAlpha = al
    ctx.strokeStyle = k
    ctx.lineWidth = 1
    // the bracket sits on the side away from the hill
    const side = crestX > 0.5 ? (x > w * 0.4 ? -1 : 1) : x < w * 0.6 ? 1 : -1
    const bx = x + side * Math.min(w * 0.11, 130)
    ctx.beginPath()
    ctx.moveTo(bx, horizonY - 2)
    ctx.lineTo(bx, yS + 2)
    ctx.moveTo(bx - 3, horizonY - 2)
    ctx.lineTo(bx + 3, horizonY - 2)
    ctx.moveTo(bx - 3, yS + 2)
    ctx.lineTo(bx + 3, yS + 2)
    ctx.moveTo(bx, yS - 2)
    ctx.lineTo(bx, yB)
    ctx.moveTo(bx - 3, yS - 2)
    ctx.lineTo(bx + 3, yS - 2)
    ctx.moveTo(bx - 3, yB)
    ctx.lineTo(bx + 3, yB)
    ctx.stroke()
    const tx = bx + side * 8
    const align = side > 0 ? 'left' : 'right'
    text(ctx, 'EARTH’S SHADOW', tx, (horizonY + yS) / 2 + 3, { size: 8.5, color: k, align, tracking: 0.14 })
    text(ctx, 'BELT OF VENUS', tx, (yS + yB) / 2 + 3, { size: 8.5, color: k, align, tracking: 0.14 })
    // the antisolar point
    ctx.setLineDash([1.5, 3])
    ctx.beginPath()
    ctx.moveTo(x, horizonY - 2)
    ctx.lineTo(x, yB - 24)
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, 'ANTISOLAR POINT', x, yB - 30, { size: 8, color: k, align: 'center', tracking: 0.14 })
    ctx.restore()
  }

  /* ----------------------------------------------------------- the chrome */
  function phaseName(elD: number, Hd: number) {
    const am = Hd < 0
    if (elD > 6) return Math.abs(Hd) < 8 ? 'Solar noon' : am ? 'Morning' : 'Afternoon'
    if (elD > -0.83) return 'Golden hour'
    if (elD > -4) return am ? 'Civil dawn' : 'Civil dusk'
    if (elD > -6) return 'Blue hour · civil'
    if (elD > -8) return 'Blue hour · nautical'
    if (elD > -12) return am ? 'Nautical dawn' : 'Nautical dusk'
    if (elD > -18) return am ? 'Astronomical dawn' : 'Astronomical dusk'
    return 'Night'
  }

  function instruments(Hd: number, es: number, sunCol: Rgb | null, airMass: number) {
    const elD = es / DEG
    const small = preview || tiny
    const k = inkHex()
    const m = mutedHex()
    // kicker
    text(ctx, small ? FIG : `${FIG} — BLUE HOUR`, pad, pad + 8, { size: small ? 8.5 : 10, color: m, tracking: 0.16, upper: true })
    if (!small && !short) text(ctx, '40° N · 6 OCTOBER · FACING SOUTH', pad, pad + 24, { size: 9, color: inkA(0.45), tracking: 0.14 })

    // readouts, top right
    const rows: [string, string][] = [
      ['Sun', signed(elD)],
      ['Time', fmtClock(Hd)],
    ]
    if (!small) {
      rows.push(['Azimuth', `${String(Math.round(mod(sunAt(Hd * DEG).az / DEG + 180, 360))).padStart(3, '0')}°`])
      rows.push(['Air mass', sunCol ? (airMass > 99 ? '>99' : airMass.toFixed(airMass < 10 ? 2 : 1)) : '—'])
    }
    let y = pad + 8
    for (const [label, value] of rows) {
      setFont(ctx, { size: small ? 9 : 10.5, tracking: 0.06 })
      text(ctx, value, w - pad, y, { size: small ? 9 : 10.5, color: k, align: 'right', tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, label, w - pad - vw - 10, y, { size: small ? 8 : 9, color: m, align: 'right', tracking: 0.14, upper: true })
      y += small ? 13 : 16
    }
    if (!small) text(ctx, phaseName(elD, Hd), w - pad, y + 2, { size: 9, color: inkA(0.75), align: 'right', tracking: 0.14, upper: true })

    if (!small && !short && !narrow) gauge(elD, y + 24)
    if (!small && !short && (w >= 700 || (narrow && h > 600))) lightPath(es, sunCol, airMass, pad + 42)
  }

  /** The elevation gauge: the sun against the bands of twilight. */
  function gauge(elD: number, top: number) {
    const x = w - pad - 2
    const y0 = top
    const y1 = Math.min(horizonY - 30, top + Math.min(230, h * 0.3))
    if (y1 - y0 < 80) return
    const e0 = 50
    const e1 = -20
    const Y = (e: number) => lerp(y0, y1, (e0 - e) / (e0 - e1))
    const k = inkA(0.55)
    const kt = inkA(0.8)
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = k
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
    for (let e = e1; e <= e0; e += 5) {
      ctx.moveTo(x, Y(e))
      ctx.lineTo(x - (e % 10 === 0 ? 6 : 3), Y(e))
    }
    ctx.stroke()
    // twilight bands, hatched more densely as they darken
    const band = (a: number, b: number, gap: number) => {
      ctx.save()
      ctx.beginPath()
      ctx.rect(x - 14, Y(a), 7, Y(b) - Y(a))
      ctx.clip()
      ctx.beginPath()
      for (let yy = Y(a) - 10; yy < Y(b) + 10; yy += gap) {
        ctx.moveTo(x - 14, yy)
        ctx.lineTo(x - 7, yy - 6)
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.strokeStyle = inkA(0.38)
    band(0, -6, 6)
    band(-6, -12, 3.5)
    band(-12, -18, 2)
    ctx.strokeStyle = kt
    ctx.beginPath()
    ctx.moveTo(x - 16, Y(0))
    ctx.lineTo(x, Y(0))
    ctx.stroke()
    const lab = (s: string, e: number) => text(ctx, s, x - 20, Y(e) + 3, { size: 8, color: k, align: 'right', tracking: 0.12 })
    lab('HORIZON', 0)
    lab('CIVIL', -3)
    lab('NAUTICAL', -9)
    lab('ASTRONOMICAL', -15)
    lab('+50°', 50)
    lab('+25°', 25)
    // the sun's marker
    const ye = Y(clamp(elD, e1, e0))
    ctx.fillStyle = kt
    ctx.beginPath()
    ctx.moveTo(x + 1, ye)
    ctx.lineTo(x + 7, ye - 4)
    ctx.lineTo(x + 7, ye + 4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  /** The light's path through the air, and how much of each wavelength is left (log scale). */
  function lightPath(es: number, sunCol: Rgb | null, airMass: number, by: number) {
    const elD = es / DEG
    const bx = pad
    // beside the readouts on a narrow screen
    const bw = Math.min(250, w - pad * 2 - (narrow ? 128 : 0))
    if (bw < 190) return
    const bh = 96
    ctx.save()
    ctx.lineWidth = 1
    // which light: the direct sun by day; in twilight, the light still reaching the sky overhead
    let lit = false
    let note = ''
    let hP = 0
    const r0 = RE + H_OBS
    if (elD > -0.8) {
      lit = column(r0, Math.sin(es), col)
      note = lit ? `DIRECT SUN · AIR MASS ${airMass > 99 ? '>99' : airMass.toFixed(1)}` : ''
    } else {
      const dep = -es
      // the lowest point overhead still in sunlight, with the light grazing ~12 km up
      hP = clamp((RE + 12000) / Math.cos(dep) - RE, 12000, 58000)
      lit = column(RE + hP, Math.sin(es), col)
      const graze = (RE + hP) * Math.cos(dep) - RE
      note = lit ? `TO ${(hP / 1000).toFixed(0)} KM OVERHEAD · GRAZING ${(graze / 1000).toFixed(0)} KM UP` : 'THE AIR OVERHEAD IS IN SHADOW'
    }
    if (lit) {
      transmit(col, Tk)
      transmit(col, Tk2, true)
    }
    // the geometry sketch: Earth, an exaggerated shell of air, the ray
    const gw = 78
    const R = 120
    const shell = 30
    const cx = bx + gw / 2
    const cy = by + bh - 10 + R
    ctx.strokeStyle = inkA(0.55)
    ctx.beginPath()
    ctx.arc(cx, cy, R, -Math.PI / 2 - 0.36, -Math.PI / 2 + 0.36)
    ctx.stroke()
    ctx.strokeStyle = inkA(0.28)
    ctx.setLineDash([1.5, 2.5])
    ctx.beginPath()
    ctx.arc(cx, cy, R + shell, -Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3)
    ctx.stroke()
    ctx.setLineDash([])
    const ox = cx
    const oy = cy - R
    ctx.fillStyle = inkA(0.9)
    ctx.beginPath()
    ctx.arc(ox, oy, 1.8, 0, TAU)
    ctx.fill()
    const x0 = ox
    let y0 = oy
    if (elD <= -0.8) {
      y0 = oy - shell * clamp(hP / 60000, 0.25, 0.95)
      ctx.strokeStyle = inkA(0.45)
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ox, y0)
      ctx.stroke()
    }
    // ray toward the sun (angles exaggerated in twilight so the grazing path shows)
    const a = (elD > -0.8 ? Math.max(0, elD) : elD * 2.2) * DEG
    const dx = Math.cos(a)
    const dy = -Math.sin(a)
    const px = x0 - cx
    const py = y0 - cy
    const B = px * dx + py * dy
    const Cc = px * px + py * py - (R + shell) ** 2
    const tOut = -B + Math.sqrt(Math.max(0, B * B - Cc))
    if (lit) {
      ctx.strokeStyle = sunCol ? cssLin([0.3 + 0.7 * sunCol[0], 0.3 + 0.7 * sunCol[1], 0.3 + 0.7 * sunCol[2]]) : inkA(0.75)
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x0 + dx * tOut, y0 + dy * tOut)
      ctx.stroke()
      // arrowhead pointing back along the light, toward the observer
      ctx.beginPath()
      const hx = x0 + dx * 3
      const hy = y0 + dy * 3
      ctx.moveTo(hx + dx * 6 - dy * 3, hy + dy * 6 + dx * 3)
      ctx.lineTo(hx, hy)
      ctx.lineTo(hx + dx * 6 + dy * 3, hy + dy * 6 - dx * 3)
      ctx.stroke()
    }
    text(ctx, 'NOT TO SCALE', bx, by + 8, { size: 7.5, color: inkA(0.42), tracking: 0.14 })

    // the transmittance spectrum, log scale
    const px0 = bx + gw + 30
    const px1 = bx + bw
    const py0 = by + 18
    const py1 = by + bh - 14
    const X = (lam: number) => lerp(px0, px1, (lam - 380) / (730 - 380))
    const Yv = (v: number) => lerp(py1, py0, clamp(1 + Math.log10(Math.max(1e-6, v)) / 4))
    ctx.strokeStyle = inkA(0.35)
    ctx.beginPath()
    ctx.moveTo(px0, py0)
    ctx.lineTo(px0, py1)
    ctx.lineTo(px1, py1)
    for (const lam of [400, 500, 600, 700]) {
      ctx.moveTo(X(lam), py1)
      ctx.lineTo(X(lam), py1 + 3)
    }
    for (let e = 0; e <= 4; e++) {
      ctx.moveTo(px0 - (e % 2 === 0 ? 4 : 2), Yv(10 ** -e))
      ctx.lineTo(px0, Yv(10 ** -e))
    }
    ctx.stroke()
    text(ctx, '1', px0 - 7, Yv(1) + 3, { size: 7.5, color: inkA(0.5), align: 'right' })
    text(ctx, '10⁻²', px0 - 7, Yv(0.01) + 3, { size: 7.5, color: inkA(0.5), align: 'right' })
    text(ctx, '10⁻⁴', px0 - 7, Yv(1e-4) + 3, { size: 7.5, color: inkA(0.5), align: 'right' })
    for (const lam of [400, 500, 600, 700]) text(ctx, String(lam), X(lam), py1 + 12, { size: 7.5, color: inkA(0.5), align: 'center' })
    text(ctx, 'SUNLIGHT LEFT · T(λ)', px0, by + 8, { size: 7.5, color: inkA(0.62), tracking: 0.14 })
    if (lit) {
      // coloured hairlines, one per bin, as tall as the light that survives
      ctx.lineWidth = 2
      for (let kk = 0; kk < NB; kk++) {
        const c = spectral(LAMBDA[kk])
        const xx = X(LAMBDA[kk])
        ctx.strokeStyle = `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`
        ctx.beginPath()
        ctx.moveTo(xx, py1)
        ctx.lineTo(xx, Yv(Tk[kk]))
        ctx.stroke()
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = inkA(0.9)
      ctx.beginPath()
      for (let kk = 0; kk < NB; kk++) {
        const xx = X(LAMBDA[kk])
        const yy = Yv(Tk[kk])
        if (kk === 0) ctx.moveTo(xx, yy)
        else ctx.lineTo(xx, yy)
      }
      ctx.stroke()
      // without ozone: the gap is the Chappuis band
      let gapMax = 0
      for (let kk = 0; kk < NB; kk++) gapMax = Math.max(gapMax, Math.log10(Tk2[kk] / Math.max(1e-9, Tk[kk])))
      if (gapMax > 0.12) {
        ctx.strokeStyle = inkA(0.55)
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        for (let kk = 0; kk < NB; kk++) {
          const xx = X(LAMBDA[kk])
          const yy = Yv(Tk2[kk])
          if (kk === 0) ctx.moveTo(xx, yy)
          else ctx.lineTo(xx, yy)
        }
        ctx.stroke()
        ctx.setLineDash([])
        text(ctx, 'O₃', X(600) + 6, (Yv(Tk[7]) + Yv(Tk2[7])) / 2 + 3, { size: 8, color: inkA(0.85), tracking: 0.06 })
      }
    }
    text(ctx, note, bx, by + bh + 12, { size: 8, color: inkA(0.62), tracking: 0.12 })
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
        const sw2 = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: NIGHT_INK })
        if (ln.em) text(ctx, ln.em, capX + sw2, y + dy, { font: 'serif', size: capSize, italic: true, color: C.sky })
        ctx.restore()
      })
    }
  }

  /** The 24-hour ruler along the bottom: the twilights hatched, the hour marked. Tap or drag it. */
  function ruler(Hd: number) {
    const x0 = pad
    const x1 = w - pad
    const yb = rulerY
    const X = (hr: number) => lerp(x0, x1, hr / 24)
    ctx.save()
    ctx.lineWidth = 1
    const spans: [number, number, number][] = []
    for (const [a, b, gap] of [
      [0, -6, 5],
      [-6, -12, 3],
      [-12, -18, 2],
    ] as const) {
      spans.push([12 - hourOfElevation(b) / 15, 12 - hourOfElevation(a) / 15, gap], [12 + hourOfElevation(a) / 15, 12 + hourOfElevation(b) / 15, gap])
    }
    ctx.strokeStyle = rgba(NIGHT_INK, 0.24)
    for (const [a, b, gap] of spans) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(X(a), yb - 5, X(b) - X(a), 5)
      ctx.clip()
      ctx.beginPath()
      for (let xx = X(a) - 6; xx < X(b) + 6; xx += gap) {
        ctx.moveTo(xx, yb)
        ctx.lineTo(xx + 5, yb - 5)
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.strokeStyle = rgba(NIGHT_INK, 0.32)
    ctx.beginPath()
    ctx.moveTo(x0, yb)
    ctx.lineTo(x1, yb)
    for (let hr = 0; hr <= 24; hr++) {
      ctx.moveTo(X(hr), yb)
      ctx.lineTo(X(hr), yb - (hr % 6 === 0 ? 6 : 3))
    }
    ctx.stroke()
    if (w > 330) {
      for (let hr = 0; hr <= 24; hr += 6) {
        if ((hr === 0 || hr === 24) && w < 500) continue
        text(ctx, String(hr).padStart(2, '0'), X(hr), yb - 9, { size: 8, color: rgba(NIGHT_INK, 0.5), align: hr === 0 ? 'left' : hr === 24 ? 'right' : 'center', tracking: 0.1 })
      }
    }
    const now = mod(12 + Hd / 15, 24)
    ctx.strokeStyle = NIGHT_INK
    ctx.beginPath()
    ctx.moveTo(X(now), yb + 3)
    ctx.lineTo(X(now), yb - 9)
    ctx.stroke()
    if (hoverX >= 0 && hoverY > yb - 26) {
      const hx = clamp(hoverX, x0, x1)
      const hr = ((hx - x0) / (x1 - x0)) * 24
      ctx.strokeStyle = C.sky
      ctx.beginPath()
      ctx.moveTo(hx, yb + 3)
      ctx.lineTo(hx, yb - 13)
      ctx.stroke()
      text(ctx, fmtClock((hr - 12) * 15), clamp(hx, x0 + 18, x1 - 18), yb - 17, { size: 9, color: C.sky, align: 'center', tracking: 0.1 })
    }
    ctx.restore()
  }

  /** The ghost demonstration, and the hover prompt. */
  function prompts(t: number, rs: number) {
    const ink = inkHex()
    const G0 = 1.2
    const G1 = 6.4
    if (!touched && t > G0 && t < G1) {
      const u = (t - G0) / (G1 - G0)
      const a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.85, 1, u))
      // along the morning arc, from sunrise toward mid-morning
      const H0 = -hourOfElevation(0)
      const H1 = -40
      const k = ease.inOutSine(clamp(u * 1.15))
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(ink, 0.7)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      for (let q = 0; q <= 40; q++) {
        const s = sunAt(lerp(H0, H1, (q / 40) * k) * DEG)
        const x = azToX(s.az)
        const y = elToY(s.el)
        if (q === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      const s = sunAt(lerp(H0, H1, k) * DEG)
      const gx = azToX(s.az)
      const gy = elToY(Math.max(0, s.el))
      ctx.fillStyle = rgba(ink, 0.9)
      ctx.beginPath()
      ctx.arc(gx, gy, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(gx, gy, 10, 0, TAU)
      ctx.stroke()
      const label = tiny ? 'DRAG THE SUN' : 'DRAG THE SUN ALONG ITS ARC'
      text(ctx, label, gx + 18, gy - 12, { size: 9.5, color: ink, tracking: 0.14 })
      ctx.restore()
    }
    // hover: where the sun would go
    if (hoverX >= 0 && hoverY < rulerY - 26 && !dragging && pointerType !== 'touch') {
      const az = (hoverX / w - 0.5) * fov * DEG
      const Hh = hourOfAzimuth(az)
      const s = sunAt(Hh * DEG)
      const e = s.el / DEG
      ctx.save()
      ctx.strokeStyle = rgba(ink, 0.45)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      const yy = e > 0 ? elToY((e + refraction(e)) * DEG) : horizonY
      ctx.beginPath()
      ctx.moveTo(hoverX, horizonY)
      ctx.lineTo(hoverX, yy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(hoverX, yy, rs + 4, 0, TAU)
      ctx.stroke()
      const label = `${fmtClock(Hh)} · ${signed(e)}`
      setFont(ctx, { size: 9, tracking: 0.1 })
      const lw = ctx.measureText(label).width
      const right = hoverX + rs + 9 + lw < w - pad
      text(ctx, label, right ? hoverX + rs + 9 : hoverX - rs - 9, yy - 6, { size: 9, color: ink, tracking: 0.1, align: right ? 'left' : 'right' })
      ctx.restore()
    }
  }

  /* ----------------------------------------------------------- input */
  function setFromX(x: number) {
    const az = clamp(x / w - 0.5, -0.5, 0.5) * fov * DEG
    dragTarget = timeOfHour(hourOfAzimuth(az))
  }
  function setFromRuler(x: number) {
    const hr = clamp((x - pad) / (w - pad * 2)) * 24
    dragTarget = timeOfHour((hr - 12) * 15)
  }

  layout()

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      pointerType = p.pointerType
      if (p.type === 'leave') {
        hoverX = -1
        dragging = null
        dragTarget = -1
        env.setCursor('default')
        return
      }
      hoverX = p.x
      hoverY = p.y
      const onRuler = p.y > rulerY - (p.pointerType === 'touch' ? 36 : 26)
      if (p.type === 'down') {
        touched = true
        glide = -1
        dragging = onRuler ? 'ruler' : 'sun'
        if (dragging === 'ruler') setFromRuler(p.x)
        else setFromX(p.x)
      } else if (p.type === 'move' && dragging && p.pressed) {
        if (dragging === 'ruler') setFromRuler(p.x)
        else setFromX(p.x)
      } else if (p.type === 'up') {
        dragging = null
        dragTarget = -1
        lastHourTick = -1
      }
      env.setCursor(dragging ? 'grabbing' : onRuler ? 'pointer' : 'grab')
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      const T = glide >= 0 ? glide : curT
      if (code === 'ArrowRight') {
        const next = STOPS.find((s) => s > T + 0.3)
        glide = next ?? STOPS[0]
      } else {
        let prev = STOPS[STOPS.length - 1]
        for (const s of STOPS) if (s < T - 0.6) prev = s
        offset += prev - T
        glide = -1
      }
      return true
    },
    frame(t, dt) {
      frameAt(t, dt)
    },
    destroy() {
      sky = null
      sctx = null
      img = null
    },
  }
}

export default create
