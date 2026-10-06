/*
 * S.10 — STAR TRAILS
 *
 * A night of patience: a long exposure, drawn analytically. Each star has a
 * fixed declination δ and right ascension α; as the Earth turns, its hour
 * angle H = LST − α grows at 15.041° per hour of clock time (the sidereal
 * rate), and its direction in the local sky is
 *
 *     N = cos φ sin δ − sin φ cos δ cos H
 *     E = −cos δ sin H
 *     U = sin φ sin δ + cos φ cos δ cos H        (φ = latitude)
 *
 * The camera is a stereographic lens, which maps every circle on the sky to
 * a circle on the picture. So every trail — the arc a star sweeps while the
 * shutter is open — is an exact circular arc: three projected points give
 * its circle, and the exposure gives its two ends. That makes any exposure,
 * at any latitude, instant to draw, so dragging the latitude re-photographs
 * the whole night live: the pole's altitude equals the latitude.
 *
 * About a hundred bright stars from memory of the standard catalogues
 * (J2000, precessed to 2026) plus ~1,500 faint ones placed at random with a
 * Milky Way bias, each coloured by its temperature (a blackbody) and
 * weighted, like a real trail, by how slowly it moves.
 *
 * Six chapters, 84 s, a pure function of time plus anything you add:
 *   I    The turning sky   45° N, facing north; the shutter opens at dusk
 *   II   The pole star     Polaris, 0.6° from the pole, in a loupe
 *   III  Polar night       north to 78° N; 24 hours make full circles
 *   IV   The equator       facing east: trails rise straight up
 *   V    The south         34° S: around the south pole, the other way
 *   VI   Home              back north for the next night
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, makeNoise, rgba, rng, setFont, smoothstep, text } from '../kit'
import { blackbody, css } from '../color'
import type { CreatePiece, PointerInfo } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.10'
const LOOP = 84
const D2R = Math.PI / 180
/** degrees of sky rotation per hour of clock time */
const SIDEREAL = 15.041
const INK = '#E4ECE8'
const INK2 = '#B9C8C2'
const MUTED = '#8FA39E'
const RULE = 'rgba(238,244,241,0.15)'
const ACC = C.sky
const ACC2 = C.sage
const EARTH = '#050e12'

const CHAPTERS = [
  { t: 0, num: 'I', name: 'The turning sky' },
  { t: 16, num: 'II', name: 'The pole star' },
  { t: 28, num: 'III', name: 'Polar night' },
  { t: 45, num: 'IV', name: 'The equator' },
  { t: 61, num: 'V', name: 'The south' },
  { t: 77, num: 'VI', name: 'Home' },
]
interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 1.6, t1: 14.6, lines: [{ s: 'The sky turns' }, { s: '', em: 'once a day.' }] },
  { t0: 17, t1: 27.2, lines: [{ s: 'Polaris' }, { s: '', em: 'barely moves.' }] },
  { t0: 32, t1: 43.6, lines: [{ s: 'Stay a while' }, { s: 'and the stars ', em: 'draw circles.' }] },
  { t0: 50.5, t1: 59.6, lines: [{ s: 'At the equator,' }, { s: 'they ', em: 'rise straight up.' }] },
  { t0: 66.5, t1: 75.6, lines: [{ s: 'In the south,' }, { s: 'they turn ', em: 'the other way.' }] },
  { t0: 78.6, t1: 83.4, lines: [{ s: 'Every night,' }, { s: 'the ', em: 'same circles.' }] },
]

/** The exposure legs: where, which way the sky is set, and how long the shutter stays open. */
interface Leg {
  t0: number
  t1: number
  /** latitude, degrees (south negative) */
  lat: number
  /** local sidereal time when the shutter opens, hours */
  lst: number
  place: string
  /** clock time when the shutter opens, hours */
  clock: number
}
const LEGS: Leg[] = [
  { t0: 0, t1: 45, lat: 45, lst: 9.6, place: '45° N', clock: 20 },
  { t0: 45, t1: 61, lat: 0, lst: 21.0, place: 'THE EQUATOR', clock: 21 },
  { t0: 61, t1: 77, lat: -34, lst: 6.0, place: '34° S', clock: 20.5 },
  { t0: 77, t1: LOOP, lat: 45, lst: 9.6, place: '45° N', clock: 20 },
]

/* ------------------------------------------------------------ catalogue */
// name, RA (hours, J2000), Dec (deg), V magnitude, effective temperature (K)
const BRIGHT: [string, number, number, number, number][] = [
  ['Polaris', 2.530, 89.264, 1.98, 6000], ['Kochab', 14.845, 74.156, 2.08, 4030], ['Pherkad', 15.345, 71.834, 3.0, 8600],
  ['Yildun', 17.537, 86.586, 4.35, 9000], ['ε Ursae Minoris', 16.766, 82.037, 4.21, 5300], ['ζ Ursae Minoris', 15.734, 77.794, 4.29, 8400],
  ['η Ursae Minoris', 16.292, 75.755, 4.95, 6600], ['Dubhe', 11.062, 61.751, 1.79, 4660], ['Merak', 11.031, 56.383, 2.37, 9400],
  ['Phecda', 11.897, 53.695, 2.44, 9300], ['Megrez', 12.257, 57.033, 3.31, 9000], ['Alioth', 12.9, 55.96, 1.77, 9000],
  ['Mizar', 13.399, 54.925, 2.27, 9000], ['Alkaid', 13.792, 49.313, 1.86, 15500], ['Schedar', 0.675, 56.537, 2.24, 4530],
  ['Caph', 0.153, 59.15, 2.28, 6700], ['γ Cassiopeiae', 0.945, 60.717, 2.15, 25000], ['Ruchbah', 1.43, 60.235, 2.68, 8400],
  ['Segin', 1.907, 63.67, 3.37, 15000], ['Alderamin', 21.31, 62.585, 2.45, 7700], ['Errai', 23.655, 77.632, 3.21, 4800],
  ['Eltanin', 17.943, 51.489, 2.23, 3930], ['Thuban', 14.073, 64.376, 3.65, 10000], ['Rastaban', 17.507, 52.301, 2.79, 5160],
  ['Vega', 18.616, 38.784, 0.03, 9600], ['Deneb', 20.69, 45.28, 1.25, 8500], ['Altair', 19.846, 8.868, 0.77, 7700],
  ['Arcturus', 14.261, 19.182, -0.05, 4290], ['Capella', 5.278, 45.998, 0.08, 5000], ['Aldebaran', 4.599, 16.509, 0.85, 3910],
  ['Betelgeuse', 5.919, 7.407, 0.5, 3500], ['Rigel', 5.242, -8.202, 0.13, 12100], ['Bellatrix', 5.419, 6.35, 1.64, 22000],
  ['Alnitak', 5.679, -1.943, 1.77, 29500], ['Alnilam', 5.604, -1.202, 1.69, 27000], ['Mintaka', 5.533, -0.299, 2.23, 29500],
  ['Saiph', 5.796, -9.67, 2.09, 26000], ['Sirius', 6.752, -16.716, -1.46, 9940], ['Procyon', 7.655, 5.225, 0.34, 6530],
  ['Pollux', 7.755, 28.026, 1.14, 4670], ['Castor', 7.577, 31.888, 1.58, 10000], ['Regulus', 10.14, 11.967, 1.35, 12500],
  ['Spica', 13.42, -11.161, 0.97, 22400], ['Antares', 16.49, -26.432, 1.0, 3500], ['Fomalhaut', 22.961, -29.622, 1.16, 8600],
  ['Mirfak', 3.405, 49.861, 1.79, 6350], ['Algol', 3.136, 40.956, 2.1, 13000], ['Hamal', 2.12, 23.462, 2.0, 4480],
  ['Alpheratz', 0.14, 29.09, 2.06, 13800], ['Mirach', 1.162, 35.621, 2.05, 3840], ['Almach', 2.065, 42.33, 2.1, 4250],
  ['Denebola', 11.818, 14.572, 2.14, 8500], ['Alphecca', 15.578, 26.715, 2.23, 9700], ['Rasalhague', 17.582, 12.56, 2.08, 8000],
  ['Sadr', 20.37, 40.257, 2.23, 6100], ['Albireo', 19.512, 27.96, 3.1, 4400], ['Enif', 21.736, 9.875, 2.38, 4400],
  ['Markab', 23.08, 15.205, 2.48, 9800], ['Scheat', 23.063, 28.083, 2.42, 3700], ['Menkalinan', 5.992, 44.947, 1.9, 9200],
  ['Elnath', 5.438, 28.608, 1.65, 13600], ['Alhena', 6.629, 16.399, 1.93, 9300], ['Adhara', 6.977, -28.972, 1.5, 22000],
  ['Wezen', 7.14, -26.393, 1.83, 6100], ['Shaula', 17.56, -37.104, 1.62, 25000], ['Kaus Australis', 18.403, -34.385, 1.85, 9960],
  ['Nunki', 18.921, -26.297, 2.05, 18900], ['Peacock', 20.427, -56.735, 1.94, 17700], ['Alnair', 22.137, -46.961, 1.74, 13900],
  ['β Gruis', 22.711, -46.885, 2.1, 3500], ['Canopus', 6.399, -52.696, -0.74, 7400], ['Achernar', 1.629, -57.237, 0.46, 15000],
  ['Rigil Kentaurus', 14.66, -60.834, -0.27, 5790], ['Hadar', 14.064, -60.373, 0.61, 25000], ['Acrux', 12.443, -63.099, 0.76, 28000],
  ['Mimosa', 12.795, -59.689, 1.25, 27000], ['Gacrux', 12.519, -57.113, 1.64, 3400], ['Imai', 12.252, -58.749, 2.8, 22000],
  ['ε Crucis', 12.356, -60.401, 3.6, 4300], ['Miaplacidus', 9.22, -69.717, 1.68, 8900], ['Avior', 8.375, -59.509, 1.86, 4000],
  ['Atria', 16.811, -69.028, 1.91, 4150], ['Suhail', 9.133, -43.433, 2.2, 4000], ['Aspidiske', 9.285, -59.275, 2.25, 7400],
  ['β Hydri', 0.429, -77.254, 2.8, 5900], ['α Hydri', 1.98, -61.57, 2.86, 7000], ['σ Octantis', 21.146, -88.956, 5.45, 7400],
  ['α Tucanae', 22.308, -60.26, 2.86, 4300], ['Muhlifain', 12.692, -48.96, 2.2, 9000], ['ε Centauri', 13.665, -53.466, 2.3, 23000],
  ['Menkent', 14.111, -36.37, 2.06, 4980], ['α Lupi', 14.699, -47.388, 2.3, 21600], ['ε Scorpii', 16.836, -34.293, 2.29, 4560],
  ['Sargas', 17.622, -42.998, 1.86, 7300], ['α Arae', 17.531, -49.876, 2.95, 18000], ['β Trianguli Australis', 15.919, -63.43, 2.85, 7000],
  ['γ Trianguli Australis', 15.315, -68.679, 2.9, 10000], ['Alcyone', 3.791, 24.105, 2.87, 13000], ['Atlas', 3.819, 24.053, 3.62, 12000],
  ['Electra', 3.748, 24.113, 3.7, 13400], ['Maia', 3.763, 24.368, 3.87, 12600], ['Merope', 3.772, 23.948, 4.18, 14000],
  ['Taygeta', 3.754, 24.467, 4.3, 13700],
]

/** Rotate J2000 equatorial unit vectors to epoch 2026 (IAU 1976 precession angles). */
function precess(ra: number, dec: number): [number, number] {
  const T = 0.26
  const zeta = (2306.2181 * T + 0.30188 * T * T) / 3600 * D2R
  const z = (2306.2181 * T + 1.09468 * T * T) / 3600 * D2R
  const th = (2004.3109 * T - 0.42665 * T * T) / 3600 * D2R
  const x = Math.cos(dec) * Math.cos(ra)
  const y = Math.cos(dec) * Math.sin(ra)
  const w = Math.sin(dec)
  const cz = Math.cos(zeta)
  const sz = Math.sin(zeta)
  const cZ = Math.cos(z)
  const sZ = Math.sin(z)
  const ct = Math.cos(th)
  const st = Math.sin(th)
  const X = (cZ * ct * cz - sZ * sz) * x + (-cZ * ct * sz - sZ * cz) * y + -cZ * st * w
  const Y = (sZ * ct * cz + cZ * sz) * x + (-sZ * ct * sz + cZ * cz) * y + -sZ * st * w
  const W = st * cz * x - st * sz * y + ct * w
  return [Math.atan2(Y, X), Math.asin(clamp(W, -1, 1))]
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const noise = makeNoise(31)

  /* ------------------------------------------------------- the stars */
  const NF = preview ? 520 : 1550
  const NM = preview ? 40 : 110 // Magellanic Cloud members
  const N = BRIGHT.length + NF + NM
  const RA = new Float64Array(N)
  const SD = new Float64Array(N)
  const CD = new Float64Array(N)
  const MAG = new Float32Array(N)
  const TK = new Float32Array(N)
  const names: string[] = []
  {
    let i = 0
    for (const [nm, ra, dec, m, T] of BRIGHT) {
      const [a, d] = precess(ra * 15 * D2R, dec * D2R)
      RA[i] = a
      SD[i] = Math.sin(d)
      CD[i] = Math.cos(d)
      MAG[i] = m
      TK[i] = T
      names[i] = nm
      i++
    }
    const r = rng(1977)
    // the north galactic pole, J2000: RA 12h 51.4m, Dec +27.13°
    const gpa = 192.86 * D2R
    const gpd = 27.13 * D2R
    const gx = Math.cos(gpd) * Math.cos(gpa)
    const gy = Math.cos(gpd) * Math.sin(gpa)
    const gz = Math.sin(gpd)
    while (i < BRIGHT.length + NF) {
      const z = r() * 2 - 1
      const a = r() * TAU
      const c = Math.sqrt(1 - z * z)
      const x = c * Math.cos(a)
      const y = c * Math.sin(a)
      // more stars toward the Milky Way
      const sb = Math.abs(x * gx + y * gy + z * gz)
      if (r() > 0.32 + 0.68 * Math.exp(-sb / 0.22)) continue
      RA[i] = Math.atan2(y, x)
      SD[i] = z
      CD[i] = c
      // N(<m) ∝ 10^(0.5 m) between magnitude 3.4 and 6.2
      MAG[i] = 3.4 + Math.log10(1 + r() * (Math.pow(10, 0.5 * 2.8) - 1)) / 0.5
      const k = r()
      TK[i] = k < 0.12 ? 3300 + r() * 600 : k < 0.4 ? 4000 + r() * 900 : k < 0.7 ? 5200 + r() * 1900 : k < 0.92 ? 7500 + r() * 3500 : 11000 + r() * 12000
      names[i] = ''
      i++
    }
    // the Large and Small Magellanic Clouds: faint swarms that trail into soft bands
    const clouds: [number, number, number][] = [
      [5.392, -69.756, 4.2],
      [0.879, -72.829, 2.4],
    ]
    for (let k = 0; k < NM; k++) {
      const [ra, dec, rad] = clouds[k < NM * 0.68 ? 0 : 1]
      const rr = Math.sqrt(r()) * rad
      const an = r() * TAU
      const d = (dec + rr * Math.sin(an) * 0.8) * D2R
      const a = ra * 15 * D2R + (rr * Math.cos(an) * D2R) / Math.cos(d)
      RA[i] = a
      SD[i] = Math.sin(d)
      CD[i] = Math.cos(d)
      MAG[i] = 5.4 + r() * 1.2
      TK[i] = 5000 + r() * 9000
      names[i] = ''
      i++
    }
  }
  // colour and weight bins
  const TBIN = 14
  const ABIN = 5
  const binCol: string[] = []
  for (let b = 0; b < TBIN; b++) binCol.push(css(blackbody(2900 * Math.pow(26000 / 2900, b / (TBIN - 1)))))
  const SBIN = new Uint8Array(N)
  const SLUM = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const tb = Math.round((Math.log(TK[i] / 2900) / Math.log(26000 / 2900)) * (TBIN - 1))
    // a trail's surface brightness: flux, divided by how fast the star sweeps (∝ cos δ)
    const flux = Math.pow(10, -0.4 * (MAG[i] - 1))
    const slow = 1 / Math.pow(Math.max(0.12, CD[i]), 0.45)
    const lum = Math.pow(flux, 0.42) * slow
    SLUM[i] = lum
    const ab = clamp(Math.round(clamp(lum * 0.7) * (ABIN - 1)), 0, ABIN - 1)
    SBIN[i] = clamp(tb, 0, TBIN - 1) * ABIN + ab
  }

  /* ------------------------------------------------------- the view */
  let w = env.width
  let h = env.height
  let portrait = false
  let short = false
  let tiny = false
  let pad = 20
  let capSize = 28
  let capX = 0
  let capY = 0
  let hy0 = 0
  let topM = 40
  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    short = h < 380
    tiny = h < 250
    pad = clamp(Math.min(w, h) * 0.045, short ? 12 : 16, 40)
    capSize = portrait ? clamp(Math.min(w * 0.072, h * 0.04), 18, 40) : clamp(Math.min(w * 0.04, h * 0.058), short ? 14 : 20, 46)
    if (preview) capSize = 16
    hy0 = Math.round(h * (portrait ? 0.79 : short ? 0.74 : 0.765))
    topM = pad * 2.2 + (short ? 4 : 18)
    capX = pad * (portrait ? 1 : 1.4)
    capY = h - pad * (short ? 1.15 : 1.6) - capSize * 2.1 - (preview ? 0 : 10)
    camKey = ''
  }

  // camera
  const cam = { phi: 45, az: 0, hc: 0, f: 400, cx: 0, cy: 0, face: 1 }
  // basis (N, E, U)
  let Fx = 1
  let Fy = 0
  let Fz = 0
  let Rx = 0
  let Ry = 1
  let Ux = 0
  let Uy = 0
  let Uz = 1
  let camKey = ''
  let sphi = 0
  let cphi = 1
  function setCamera(phi: number) {
    const sm = smoothstep(-18, 18, phi)
    const face = Math.abs(2 * sm - 1)
    const az = lerp(180, 0, sm) * D2R
    const p = Math.abs(phi) * face
    const altTop = clamp(p + (p > 60 ? 13 : 20), 38, 94)
    const hc = Math.max(0, p - 50)
    // on a short screen the polar sky needs the horizon lower, so the pole stays in frame
    const hyE = short ? lerp(hy0, h * 0.94, smoothstep(55, 75, p)) : hy0
    let f = (hyE - topM) / (2 * (Math.tan((hc / 2) * D2R) + Math.tan(((altTop - hc) / 2) * D2R)))
    // a wide lens, wider still for the polar sky (a fisheye's curved horizon)
    f = clamp(f, w / 2 / lerp(1.6, 2.05, smoothstep(55, 75, p)), w / 2 / 0.62)
    cam.phi = phi
    cam.az = az
    cam.hc = hc
    cam.f = f
    cam.face = face
    cam.cx = w / 2
    cam.cy = hyE - 2 * f * Math.tan((hc / 2) * D2R)
    const ch = Math.cos(hc * D2R)
    const shh = Math.sin(hc * D2R)
    Fx = ch * Math.cos(az)
    Fy = ch * Math.sin(az)
    Fz = shh
    Rx = -Math.sin(az)
    Ry = Math.cos(az)
    Ux = -shh * Math.cos(az)
    Uy = -shh * Math.sin(az)
    Uz = ch
    sphi = Math.sin(phi * D2R)
    cphi = Math.cos(phi * D2R)
  }
  const P = { x: 0, y: 0, z: 0, up: 0 }
  /** project a local-sky direction (N, E, U) */
  function projNEU(n: number, e: number, u: number) {
    const x = n * Rx + e * Ry
    const y = n * Ux + e * Uy + u * Uz
    const z = n * Fx + e * Fy + u * Fz
    const k = 2 / Math.max(1e-4, 1 + z)
    P.x = cam.cx + cam.f * k * x
    P.y = cam.cy - cam.f * k * y
    P.z = z
    P.up = u
  }
  /** project star i at hour angle H */
  function projStar(i: number, H: number) {
    const sd = SD[i]
    const cd = CD[i]
    const ch = Math.cos(H)
    projNEU(cphi * sd - sphi * cd * ch, -cd * Math.sin(H), sphi * sd + cphi * cd * ch)
  }

  // each star's diurnal circle on the picture
  const CCX = new Float64Array(N)
  const CCY = new Float64Array(N)
  const CCR = new Float64Array(N)
  /** 0 arc, 1 sampled polyline (the circle passes near the lens's far point) */
  const CMODE = new Uint8Array(N)
  function buildCircles() {
    const key = `${cam.phi.toFixed(3)},${w},${h}`
    if (key === camKey) return
    camKey = key
    for (let i = 0; i < N; i++) {
      let ok = false
      for (let tr = 0; tr < 4 && !ok; tr++) {
        const h0 = 0.3 + tr * 0.9
        projStar(i, h0)
        const ax = P.x
        const ay = P.y
        const az1 = P.z
        projStar(i, h0 + TAU / 3)
        const bx = P.x
        const by = P.y
        const bz = P.z
        projStar(i, h0 + (2 * TAU) / 3)
        const cx = P.x
        const cy = P.y
        if (Math.min(az1, bz, P.z) < -0.96) continue
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
        if (Math.abs(d) < 1e-6) break
        const a2 = ax * ax + ay * ay
        const b2 = bx * bx + by * by
        const c2 = cx * cx + cy * cy
        const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d
        const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d
        const R = Math.hypot(ax - ux, ay - uy)
        if (R > 40 * Math.max(w, h)) break
        CCX[i] = ux
        CCY[i] = uy
        CCR[i] = R
        ok = true
      }
      CMODE[i] = ok ? 0 : 1
    }
    buildSkyline()
  }

  // the skyline (a few low hills), the sky clip and the ground
  const SKN = 161
  const SKX = new Float32Array(SKN)
  const SKY = new Float32Array(SKN)
  let skyN = 0
  function buildSkyline() {
    skyN = 0
    for (let k = 0; k < SKN; k++) {
      const da = lerp(-120, 120, k / (SKN - 1))
      const hill = (0.55 + 0.9 * Math.max(0, noise.fbm2(da * 0.018 + 3, 1.7, 3)) + 0.35 * noise.n2(da * 0.07, 9)) * (portrait ? 1.3 : 1)
      const a = cam.az + da * D2R
      const alt = Math.max(0.15, hill) * D2R
      projNEU(Math.cos(alt) * Math.cos(a), Math.cos(alt) * Math.sin(a), Math.sin(alt))
      if (P.z < -0.9) continue
      SKX[skyN] = P.x
      SKY[skyN] = P.y
      skyN++
    }
  }
  /** skyline height at screen x */
  function skyAt(x: number) {
    for (let k = 1; k < skyN; k++) {
      if (SKX[k] >= x) {
        const f = (x - SKX[k - 1]) / (SKX[k] - SKX[k - 1] || 1)
        return lerp(SKY[k - 1], SKY[k], f)
      }
    }
    return hy0
  }

  // a bare winter tree, grown once
  const TREE: number[] = [] // x0, y0, x1, y1, width (unit: tree height)
  {
    const r = rng(2026)
    const grow = (x: number, y: number, ang: number, len: number, wid: number, depth: number) => {
      const bend = (r() - 0.5) * 0.18
      const x1 = x + Math.sin(ang + bend) * len
      const y1 = y - Math.cos(ang + bend) * len
      TREE.push(x, y, x1, y1, wid)
      if (depth <= 0 || len < 0.018) return
      const n = depth > 5 ? 2 : r() < 0.7 ? 2 : 3
      for (let k = 0; k < n; k++) {
        const spread = (0.32 + r() * 0.34) * (k === 0 ? -1 : 1) * (n === 3 && k === 2 ? 0.2 : 1)
        grow(x1, y1, ang + bend + spread + (r() - 0.5) * 0.2, len * (0.66 + r() * 0.16), wid * 0.66, depth - 1)
      }
    }
    TREE.push(0, 0, 0.006, -0.26, 0.05)
    grow(0.006, -0.26, -0.04, 0.2, 0.034, 8)
  }

  /* ------------------------------------------------------ the clock */
  const atP = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 12 : 0
  let prevT = -1
  let paused = false
  let interacted = false
  let latUser: number | null = null
  let boost = 0
  let holding = false
  let holdKey = false
  let lastLeg = -1
  let lastChapter = 0
  let down: { x: number; y: number; ms: number; moved: boolean; ruler: boolean; lat0: number } | null = null
  let touch = false
  let scrubX = -1
  let picked: { i: number; t0: number } | null = null
  let readoutBottom = 60
  let testTap: [number, number] | null = null
  {
    const tp = env.params.get('tap')?.split(',').map(Number)
    if (tp && tp.length === 2 && tp.every(Number.isFinite)) testTap = [tp[0], tp[1]]
    const lp = Number(env.params.get('lat'))
    if (env.params.has('lat') && Number.isFinite(lp)) latUser = clamp(lp, -89, 89)
  }

  function legAt(T: number) {
    for (let k = 0; k < LEGS.length; k++) if (T < LEGS[k].t1) return k
    return LEGS.length - 1
  }
  /** autopilot latitude */
  function latAuto(T: number) {
    if (T < 28) return 45
    if (T < 33.5) return lerp(45, 78, ease.inOutCubic((T - 28) / 5.5))
    if (T < 45) return 78
    if (T < 50.5) return lerp(78, 0, ease.inOutCubic((T - 45) / 5.5))
    if (T < 61) return 0
    if (T < 66) return lerp(0, -34, ease.inOutCubic((T - 61) / 5))
    if (T < 77.5) return -34
    if (T < 83.5) return lerp(-34, 45, ease.inOutCubic((T - 77.5) / 6))
    return 45
  }
  /** autopilot exposure, hours since the shutter opened */
  function expAuto(T: number) {
    if (T < 1.2) return 0
    if (T < 16) return 5.6 * Math.pow((T - 1.2) / 14.8, 1.35)
    if (T < 28) return lerp(5.6, 9.8, (T - 16) / 12)
    if (T < 43) return lerp(9.8, 24, ease.inOutSine((T - 28) / 15))
    if (T < 45) return 24
    if (T < 51) return 0
    if (T < 60) return 7.5 * Math.pow((T - 51) / 9, 1.15)
    if (T < 61) return 7.5
    if (T < 66.4) return 0
    if (T < 76) return 9.5 * Math.pow((T - 66.4) / 9.6, 1.15)
    if (T < 77) return 9.5
    return 0
  }
  /** the shutter: trails fade when it closes, before the next leg */
  function shutter(T: number) {
    if (T < 45.4) return 1 - smoothstep(44.2, 45.4, T)
    if (T < 61.2) return smoothstep(50.6, 51.2, T) * (1 - smoothstep(60.2, 61.2, T))
    if (T < 77.2) return smoothstep(66, 66.6, T) * (1 - smoothstep(76.2, 77.2, T))
    return 0
  }
  function lstOpen(T: number) {
    const k = legAt(T)
    const L = LEGS[k]
    // while travelling between legs (shutter closed) the sky eases to the next setting
    if (k === 0 && T > 44.2) return lerp(L.lst, LEGS[1].lst, smoothstep(45, 50.5, T))
    if (k === 1 && T > 60.2) return lerp(L.lst, LEGS[2].lst, smoothstep(61, 66, T))
    if (k === 2 && T > 76.2) return lerp(L.lst, LEGS[3].lst, smoothstep(77.5, 83.5, T))
    return L.lst
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
  const chapterAt = (T: number) => CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)

  /* ------------------------------------------------------- meteors */
  interface Streak {
    leg: number
    /** exposure hour it happened */
    e: number
    da: number
    alt: number
    dir: number
    len: number
    sat?: boolean
  }
  const STREAKS: Streak[] = []
  {
    const r = rng(812)
    for (let leg = 0; leg < 3; leg++) {
      const count = leg === 0 ? 5 : 3
      for (let k = 0; k < count; k++) STREAKS.push({ leg, e: 0.6 + r() * (leg === 0 ? 20 : 7), da: (r() - 0.5) * 80, alt: 18 + r() * 34, dir: (r() - 0.5) * 2.4 + (r() < 0.5 ? Math.PI : 0), len: 6 + r() * 9 })
    }
    // one satellite per leg: a long, steady line that stops where it enters the Earth's shadow
    STREAKS.push({ leg: 0, e: 1.9, da: -75, alt: 21, dir: -0.05, len: 64, sat: true })
    STREAKS.push({ leg: 2, e: 2.6, da: 60, alt: 30, dir: Math.PI + 0.2, len: 70, sat: true })
  }

  /* -------------------------------------------------------- drawing */
  function haloText(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    const lw = ctx.lineWidth
    const ss = ctx.strokeStyle
    setFont(ctx, o)
    const s2 = o?.upper ? str.toUpperCase() : str
    if (o?.font === 'serif') {
      ctx.lineWidth = 5
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(5,14,18,0.7)'
      ctx.strokeText(s2, x, y)
      ctx.lineJoin = 'miter'
    } else {
      const tw = ctx.measureText(s2).width
      const sz = o?.size ?? 11
      const x0 = o?.align === 'right' ? x - tw : o?.align === 'center' ? x - tw / 2 : x
      const fs = ctx.fillStyle
      ctx.fillStyle = 'rgba(5,14,18,0.78)'
      ctx.fillRect(x0 - 3, y - sz * 0.92, tw + 6, sz * 1.3)
      ctx.fillStyle = fs
    }
    text(ctx, str, x, y, o)
    ctx.lineWidth = lw
    ctx.strokeStyle = ss
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
        if (ln.s) haloText(ln.s, capX, y + dy, { font: 'serif', size: capSize, color: INK })
        if (ln.em) haloText(ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: ACC2 })
        ctx.restore()
      })
    }
  }

  const sortedStart = new Int32Array(TBIN * ABIN + 1)
  const sortedFill = new Int32Array(TBIN * ABIN)
  const order = new Int32Array(N)
  {
    for (let i = 0; i < N; i++) sortedStart[SBIN[i] + 1]++
    for (let b = 0; b < TBIN * ABIN; b++) sortedStart[b + 1] += sortedStart[b]
    for (let b = 0; b < TBIN * ABIN; b++) sortedFill[b] = sortedStart[b]
    for (let i = 0; i < N; i++) order[sortedFill[SBIN[i]]++] = i
  }

  /** Append star i's trail between hour angles h0 and h1 to the current path. */
  function trail(i: number, h0: number, h1: number) {
    const span = h1 - h0
    if (span <= 1e-4) return
    if (CMODE[i] === 1 || span > TAU - 0.002) {
      if (CMODE[i] === 0) {
        ctx.moveTo(CCX[i] + CCR[i], CCY[i])
        ctx.arc(CCX[i], CCY[i], CCR[i], 0, TAU)
        return
      }
      const steps = Math.max(4, Math.ceil(span / 0.04))
      for (let k = 0; k <= steps; k++) {
        projStar(i, h0 + (span * k) / steps)
        if (k === 0) ctx.moveTo(P.x, P.y)
        else ctx.lineTo(P.x, P.y)
      }
      return
    }
    projStar(i, h0)
    const xs = P.x
    const ys = P.y
    projStar(i, h0 + span * 0.5)
    const xm = P.x
    const ym = P.y
    projStar(i, h1)
    const cx = CCX[i]
    const cy = CCY[i]
    const a0 = Math.atan2(ys - cy, xs - cx)
    const am = Math.atan2(ym - cy, xm - cx)
    const a1 = Math.atan2(P.y - cy, P.x - cx)
    const dE = (((a1 - a0) % TAU) + TAU) % TAU
    const dM = (((am - a0) % TAU) + TAU) % TAU
    ctx.moveTo(xs, ys)
    ctx.arc(cx, cy, CCR[i], a0, a1, dM > dE)
  }

  function drawSky(T: number, lstO: number, lstN: number, open: number) {
    // a faint airglow over the skyline
    const g = ctx.createLinearGradient(0, hy0 - h * 0.5, 0, hy0)
    g.addColorStop(0, 'rgba(43,106,147,0)')
    g.addColorStop(1, 'rgba(70,120,140,0.16)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, hy0 + 4)
    ctx.save()
    // clip to the sky above the skyline
    ctx.beginPath()
    ctx.moveTo(-10, -10)
    ctx.lineTo(w + 10, -10)
    ctx.lineTo(w + 10, skyN ? SKY[skyN - 1] : hy0)
    for (let k = skyN - 1; k >= 0; k--) ctx.lineTo(SKX[k], SKY[k])
    ctx.lineTo(-10, skyN ? SKY[0] : hy0)
    ctx.closePath()
    ctx.clip()
    const lo = lstO * 15 * D2R
    const ln = lstN * 15 * D2R
    // the trails, additive: light accumulates on the sensor
    if (open > 0.002 && ln - lo > 1e-4) {
      ctx.globalCompositeOperation = 'lighter'
      for (let b = 0; b < TBIN * ABIN; b++) {
        const st = sortedStart[b]
        const e = sortedStart[b + 1]
        if (st === e) continue
        const tb = Math.floor(b / ABIN)
        const ab = b % ABIN
        ctx.strokeStyle = binCol[tb]
        ctx.globalAlpha = open * [0.16, 0.26, 0.4, 0.6, 0.86][ab] * (preview ? 1.15 : 1)
        ctx.lineWidth = [0.7, 0.8, 1, 1.25, 1.6][ab]
        ctx.beginPath()
        for (let q = st; q < e; q++) {
          const i = order[q]
          trail(i, lo - RA[i], ln - RA[i])
        }
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    // the stars where they are now
    ctx.globalAlpha = 1
    for (let b = 0; b < TBIN * ABIN; b++) {
      const st = sortedStart[b]
      const e = sortedStart[b + 1]
      if (st === e) continue
      const tb = Math.floor(b / ABIN)
      const ab = b % ABIN
      ctx.fillStyle = binCol[tb]
      ctx.globalAlpha = [0.35, 0.5, 0.7, 0.9, 1][ab]
      ctx.beginPath()
      const rr = [0.7, 0.85, 1.05, 1.35, 1.8][ab]
      for (let q = st; q < e; q++) {
        const i = order[q]
        projStar(i, ln - RA[i])
        if (P.up < -0.02 || P.z < -0.5 || P.x < -4 || P.x > w + 4 || P.y < -4) continue
        const r = MAG[i] < 0.6 ? 2.2 : MAG[i] < 1.6 ? Math.max(rr, 1.6) : rr
        ctx.moveTo(P.x + r, P.y)
        ctx.arc(P.x, P.y, r, 0, TAU)
      }
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // meteors and a satellite, fixed in the frame (they are in the atmosphere, not the sky)
    const leg = legAt(T)
    const expNow = expTotal
    for (const s of STREAKS) {
      if (s.leg !== (leg === 3 ? 0 : leg) || leg === 3) continue
      if (expNow < s.e) continue
      const flash = 1 - clamp((expNow - s.e) / 0.5)
      const prog = s.sat ? clamp((expNow - s.e) / 0.09) : 1
      ctx.strokeStyle = s.sat ? rgba(INK, 0.32 * open) : rgba('#DDF3E2', (0.5 + 0.5 * flash) * open)
      ctx.lineWidth = s.sat ? 0.9 : 1 + flash * 0.8
      ctx.beginPath()
      const steps = s.sat ? 30 : 6
      for (let k = 0; k <= steps * prog; k++) {
        const u = (k / steps) * s.len
        const alt = (s.alt + Math.sin(s.dir) * u) * D2R
        const a = cam.az + (s.da + Math.cos(s.dir) * u) * D2R
        projNEU(Math.cos(alt) * Math.cos(a), Math.cos(alt) * Math.sin(a), Math.sin(alt))
        if (k === 0) ctx.moveTo(P.x, P.y)
        else ctx.lineTo(P.x, P.y)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawGround(T: number, open: number) {
    // the earth: a dark silhouette under the skyline
    ctx.fillStyle = EARTH
    ctx.beginPath()
    ctx.moveTo(-10, h + 10)
    ctx.lineTo(-10, skyN ? SKY[0] : hy0)
    for (let k = 0; k < skyN; k++) ctx.lineTo(SKX[k], SKY[k])
    ctx.lineTo(w + 10, skyN ? SKY[skyN - 1] : hy0)
    ctx.lineTo(w + 10, h + 10)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgba(INK, 0.32)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let k = 0; k < skyN; k++) {
      if (k === 0) ctx.moveTo(SKX[k], SKY[k])
      else ctx.lineTo(SKX[k], SKY[k])
    }
    ctx.stroke()
    // furrows of the field, in perspective
    ctx.strokeStyle = rgba(INK, 0.06)
    ctx.beginPath()
    for (let k = 1; k <= 5; k++) {
      const y = hy0 + (h - hy0) * Math.pow(k / 5.5, 1.8)
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    // the tree
    const tx = portrait ? w * 0.74 : w * 0.76
    const ty = skyAt(tx) + 3
    const th = Math.min(h * (portrait ? 0.26 : short ? 0.36 : 0.34), w * 0.4)
    ctx.strokeStyle = EARTH
    ctx.lineCap = 'round'
    for (let k = 0; k < TREE.length; k += 5) {
      ctx.lineWidth = Math.max(0.7, TREE[k + 4] * th)
      ctx.beginPath()
      ctx.moveTo(tx + TREE[k] * th, ty + TREE[k + 1] * th)
      ctx.lineTo(tx + TREE[k + 2] * th, ty + TREE[k + 3] * th)
      ctx.stroke()
    }
    // a hairline edge so the silhouette reads against the dark
    ctx.strokeStyle = rgba(INK, 0.16)
    ctx.lineWidth = 0.6
    ctx.beginPath()
    for (let k = 0; k < TREE.length; k += 5) {
      if (TREE[k + 4] * th < 1.6) continue
      const nx = TREE[k + 3] - TREE[k + 1]
      const ny = -(TREE[k + 2] - TREE[k])
      const l = Math.hypot(nx, ny) || 1
      const o = (TREE[k + 4] * th) / 2
      ctx.moveTo(tx + TREE[k] * th + (nx / l) * o, ty + TREE[k + 1] * th + (ny / l) * o)
      ctx.lineTo(tx + TREE[k + 2] * th + (nx / l) * o * 0.66, ty + TREE[k + 3] * th + (ny / l) * o * 0.66)
    }
    ctx.stroke()
    ctx.lineCap = 'butt'
    // the photographer: seated, beside a tripod
    if (!tiny) {
      const fx = portrait ? w * 0.2 : w * 0.3
      const fy = skyAt(fx) + 2
      const s = Math.max(0.65, Math.min(w, h) / 820) * (short ? 0.85 : 1)
      ctx.fillStyle = EARTH
      ctx.strokeStyle = rgba(INK, 0.3)
      ctx.lineWidth = 0.8
      const body = new Path2D()
      // a seated figure, knees up, head tilted back to the sky
      body.moveTo(fx - 9 * s, fy)
      body.quadraticCurveTo(fx - 10 * s, fy - 14 * s, fx - 5 * s, fy - 22 * s)
      body.lineTo(fx - 1 * s, fy - 22 * s)
      body.quadraticCurveTo(fx + 4 * s, fy - 14 * s, fx + 10 * s, fy - 13 * s)
      body.lineTo(fx + 13 * s, fy)
      body.closePath()
      body.moveTo(fx - 0.5 * s, fy - 27.5 * s)
      body.arc(fx - 3 * s, fy - 27.5 * s, 3.6 * s, 0, TAU)
      ctx.fill(body)
      ctx.stroke(body)
      // tripod and camera, lens raised toward the pole
      const px = fx + 24 * s
      const py = fy - 20 * s
      ctx.strokeStyle = rgba(INK, 0.42)
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px - 7 * s, fy + 1)
      ctx.moveTo(px, py)
      ctx.lineTo(px + 8 * s, fy + 1)
      ctx.moveTo(px, py)
      ctx.lineTo(px + 1 * s, fy + 1)
      ctx.stroke()
      ctx.save()
      ctx.translate(px, py - 2 * s)
      ctx.rotate(-0.55)
      ctx.fillStyle = EARTH
      ctx.fillRect(-4 * s, -3 * s, 8 * s, 6 * s)
      ctx.strokeRect(-4 * s, -3 * s, 8 * s, 6 * s)
      ctx.strokeRect(4 * s, -1.8 * s, 3.6 * s, 3.6 * s)
      ctx.restore()
      // the recording light, on while the shutter is open
      if (open > 0.5 && Math.floor(T * 1.2) % 2 === 0) {
        ctx.fillStyle = css(blackbody(1900))
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(px - 3 * s, py - 3 * s, 1.1, 0, TAU)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }

  /** the celestial pole: a cross, the altitude dimension, and Polaris in a loupe */
  function drawPole(T: number, lstO: number, lstN: number) {
    const north = cam.phi >= 0
    const pv = north ? 1 : -1
    // pole direction in (N, E, U): (cos φ, 0, sin φ) for the north pole
    projNEU(pv * cphi, 0, pv * sphi)
    const visible = P.up > 0.14 && P.z > 0.2 && cam.face > 0.85
    if (!visible) return
    const px = P.x
    const py = P.y
    const a = smoothstep(0.85, 0.97, cam.face) * smoothstep(0.14, 0.24, P.up)
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = rgba(ACC, 0.85)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px - 6, py)
    ctx.lineTo(px - 2, py)
    ctx.moveTo(px + 2, py)
    ctx.lineTo(px + 6, py)
    ctx.moveTo(px, py - 6)
    ctx.lineTo(px, py - 2)
    ctx.moveTo(px, py + 2)
    ctx.lineTo(px, py + 6)
    ctx.stroke()
    if (!preview && !tiny) {
      // the pole's altitude, dimensioned from the skyline straight below it
      const alt = Math.abs(cam.phi)
      const dx = px + (portrait ? -26 : -38)
      const yb = skyAt(dx)
      ctx.strokeStyle = rgba(ACC, 0.5)
      ctx.beginPath()
      ctx.moveTo(dx, yb)
      ctx.lineTo(dx, py)
      ctx.moveTo(dx - 4, py)
      ctx.lineTo(dx + 4, py)
      ctx.moveTo(dx - 4, yb)
      ctx.lineTo(dx + 4, yb)
      // ticks every 10° of altitude
      for (let t = 10; t < alt; t += 10) {
        projNEU(pv * Math.cos(t * D2R), 0, Math.sin(t * D2R))
        ctx.moveTo(dx - 2.5, P.y)
        ctx.lineTo(dx + 2.5, P.y)
      }
      ctx.stroke()
      const label = short ? `${alt.toFixed(0)}°` : `POLE ALTITUDE ${alt.toFixed(0)}° = LATITUDE`
      ctx.save()
      ctx.translate(dx - 7, (yb + py) / 2)
      ctx.rotate(-Math.PI / 2)
      haloText(label, 0, 0, { size: 8.5, color: ACC, align: 'center', tracking: 0.14 })
      ctx.restore()
      haloText(north ? (short ? 'NCP' : 'NORTH CELESTIAL POLE') : short ? 'SCP' : 'SOUTH CELESTIAL POLE', px + 10, py - 8, { size: 8.5, color: ACC, tracking: 0.14 })
    }
    ctx.restore()
    // chapter II: Polaris in a loupe
    const la = smoothstep(18, 19.4, T) * (1 - smoothstep(27, 28.4, T))
    if (la > 0 && north && !preview) {
      const iP = 0
      // local scale near the pole: px per degree
      projNEU(cphi, 0, sphi)
      const x0 = P.x
      const y0 = P.y
      projNEU(Math.cos((cam.phi - 1) * D2R), 0, Math.sin((cam.phi - 1) * D2R))
      const pxDeg = Math.hypot(P.x - x0, P.y - y0)
      const R = clamp(Math.min(w, h) * 0.09, 34, 62)
      const mag = (R * 0.62) / pxDeg
      const below = portrait || w < 700 || y0 - R * 1.2 - R - 20 < readoutBottom
      const lx = clamp(x0 + R * 2.3, R + pad, w - R - pad)
      const ly = clamp(below ? y0 + R * 1.7 : y0 - R * 1.2, topM + R + 14, hy0 - R - 22)
      ctx.save()
      ctx.globalAlpha = la
      ctx.fillStyle = 'rgba(5,14,18,0.9)'
      ctx.beginPath()
      ctx.arc(lx, ly, R, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = rgba(INK, 0.55)
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x0 + (lx - x0) * (6 / Math.hypot(lx - x0, ly - y0)), y0 + (ly - y0) * (6 / Math.hypot(lx - x0, ly - y0)))
      ctx.lineTo(lx - ((lx - x0) / Math.hypot(lx - x0, ly - y0)) * R, ly - ((ly - y0) / Math.hypot(lx - x0, ly - y0)) * R)
      ctx.strokeStyle = rgba(INK, 0.3)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(lx, ly, R, 0, TAU)
      ctx.clip()
      // the true pole and Polaris's tiny circle, magnified
      ctx.strokeStyle = rgba(ACC, 0.9)
      ctx.beginPath()
      ctx.moveTo(lx - 5, ly)
      ctx.lineTo(lx + 5, ly)
      ctx.moveTo(lx, ly - 5)
      ctx.lineTo(lx, ly + 5)
      ctx.stroke()
      ctx.strokeStyle = rgba(INK, 0.16)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(lx, ly, (R * 0.62) * (Math.acos(SD[iP]) / D2R), 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      const lo = lstO * 15 * D2R - RA[iP]
      const lnn = lstN * 15 * D2R - RA[iP]
      ctx.strokeStyle = binCol[Math.round((Math.log(6000 / 2900) / Math.log(26000 / 2900)) * (TBIN - 1))]
      ctx.lineWidth = 2
      ctx.beginPath()
      const steps = 60
      for (let k = 0; k <= steps; k++) {
        projStar(iP, lo + ((lnn - lo) * k) / steps)
        const X = lx + (P.x - x0) * mag
        const Y = ly + (P.y - y0) * mag
        if (k === 0) ctx.moveTo(X, Y)
        else ctx.lineTo(X, Y)
      }
      ctx.stroke()
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = la
      const sep = Math.acos(SD[iP]) / D2R
      const lab = short || w < 560 ? `POLARIS · ${sep.toFixed(2)}° · × ${Math.round(mag)}` : `POLARIS · ${sep.toFixed(2)}° FROM THE POLE · × ${Math.round(mag)}`
      setFont(ctx, { size: 8.5, tracking: 0.14 })
      const lw2 = ctx.measureText(lab).width
      haloText(lab, clamp(lx, pad + lw2 / 2 + 4, w - pad - lw2 / 2 - 4), below ? ly + R + 14 : ly - R - 8, { size: 8.5, color: INK, align: 'center', tracking: 0.14 })
      ctx.restore()
    }
  }

  function drawDial(clock: number, expH: number, rateK: number) {
    if (tiny) return
    const R = preview ? 0 : clamp(Math.min(w, h) * 0.05, 18, 34)
    if (R <= 0) return
    const dx = w - pad - R - 6
    const dy = Math.min(h - pad * 1.8 - R - 12, Math.max(hy0 + R + 10, h - pad * 2.4 - R - 14))
    ctx.save()
    ctx.fillStyle = EARTH
    ctx.beginPath()
    ctx.arc(dx, dy, R + 3, 0, TAU)
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.5)
    ctx.beginPath()
    ctx.arc(dx, dy, R, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.beginPath()
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU - Math.PI / 2
      const l = k % 6 === 0 ? 5 : 2.5
      ctx.moveTo(dx + Math.cos(a) * R, dy + Math.sin(a) * R)
      ctx.lineTo(dx + Math.cos(a) * (R - l), dy + Math.sin(a) * (R - l))
    }
    ctx.stroke()
    // the exposure, as a sector of the day
    const a0 = (((clock - expH) % 24) / 24) * TAU - Math.PI / 2
    const a1 = ((clock % 24) / 24) * TAU - Math.PI / 2
    if (expH > 0.01) {
      ctx.fillStyle = rgba(ACC, 0.16)
      ctx.beginPath()
      ctx.moveTo(dx, dy)
      if (expH >= 23.99) ctx.arc(dx, dy, R - 6, 0, TAU)
      else ctx.arc(dx, dy, R - 6, a0, a1)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = rgba(ACC, 0.8)
      ctx.beginPath()
      if (expH >= 23.99) ctx.arc(dx, dy, R - 6, 0, TAU)
      else ctx.arc(dx, dy, R - 6, a0, a1)
      ctx.stroke()
    }
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(dx, dy)
    ctx.lineTo(dx + Math.cos(a1) * (R - 3), dy + Math.sin(a1) * (R - 3))
    ctx.stroke()
    text(ctx, '0', dx, dy - R - 4, { size: 7.5, color: MUTED, align: 'center' })
    text(ctx, '12', dx, dy + R + 10, { size: 7.5, color: MUTED, align: 'center' })
    const hh = Math.floor(((clock % 24) + 24) % 24)
    const mm = Math.floor((((clock % 24) + 24) % 24 - hh) * 60)
    text(ctx, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, dx - R - 10, dy - 2, { size: 10, color: INK, align: 'right', tracking: 0.08 })
    text(ctx, rateK > 1.5 ? `SHUTTER × ${Math.round(rateK)}` : '24-HOUR DIAL', dx - R - 10, dy + 11, { size: 8, color: rateK > 1.5 ? ACC : MUTED, align: 'right', tracking: 0.14 })
    ctx.restore()
  }

  function chrome(T: number, readouts: [string, string][], place: string) {
    const small = preview || Math.min(w, h) < 420
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.4)
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, small ? 7 : 10)
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
    text(ctx, w < 620 || small ? 'STAR TRAILS' : `STAR TRAILS · ${place}`, pad + 26 + fw + hs * 0.9, hy, { size: hs, color: MUTED, tracking: 0.14 })
    const ch = chapterAt(T)
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (1 - smoothstep(LOOP - 1.2, LOOP - 0.2, T))
    if (!tiny) text(ctx, `${c.num} — ${c.name}`, capX, capY - (small ? 4 : 8), { size: small ? 9 : 10.5, color: INK2, tracking: 0.16, upper: true, alpha: kIn })
    let y = hy
    const rs = small ? 9 : 10.5
    const maxR = tiny ? 2 : short || portrait ? 4 : 5
    for (const [label, value] of readouts.slice(0, maxR)) {
      setFont(ctx, { size: rs, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      haloText(value, w - pad, y, { size: rs, color: INK, align: 'right', tracking: 0.06 })
      haloText(label, w - pad - vw - 10, y, { size: small ? 8.5 : 9.5, color: MUTED, align: 'right', tracking: 0.14, upper: true })
      y += small ? 14 : 17
    }
    readoutBottom = y
    if (preview || tiny) return
    const x0 = pad
    const x1 = w - pad
    const yb = rulerY()
    ctx.strokeStyle = RULE
    ctx.beginPath()
    ctx.moveTo(x0, yb)
    ctx.lineTo(x1, yb)
    for (let i = 0; i <= 42; i++) {
      const x = lerp(x0, x1, i / 42)
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
    if (w > 360) CHAPTERS.forEach((cc, i) => text(ctx, cc.num, lerp(x0, x1, cc.t / LOOP) + 4, yb - 7, { size: 8.5, color: i === ch ? INK : MUTED, tracking: 0.1 }))
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

  function hints(T: number, first: boolean) {
    if (preview || tiny) return
    const yH = readoutBottom + 4
    const narrow = touch || w < 700
    if (!interacted && first && T > 3 && T < 10) {
      const a = smoothstep(3, 3.8, T) * (1 - smoothstep(9.2, 10, T))
      const gx = w - pad - 12
      const gy0 = yH + 26
      const span = Math.min(90, (hy0 - gy0) * 0.6)
      const u = (((T - 3.6) % 2.6) + 2.6) % 2.6 / 2.6
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(ACC, 0.55)
      ctx.setLineDash([1.5, 4])
      ctx.beginPath()
      ctx.moveTo(gx, gy0)
      ctx.lineTo(gx, gy0 + span)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = ACC
      ctx.beginPath()
      ctx.arc(gx, gy0 + span * (1 - ease.inOutSine(u < 0.5 ? u * 2 : 2 - u * 2)), 3, 0, TAU)
      ctx.fill()
      haloText(narrow ? 'DRAG ↑↓ TO TRAVEL · HOLD TO WAIT' : 'DRAG UP OR DOWN TO TRAVEL NORTH OR SOUTH · HOLD TO EXPOSE FASTER', w - pad, yH + 8, { size: 8.5, color: ACC, align: 'right', tracking: 0.14 })
      ctx.restore()
      return
    }
    if (latUser !== null) {
      haloText(narrow ? 'TAP A STAR TO NAME IT' : 'YOUR LATITUDE · TAP A STAR TO NAME IT · ← → CHAPTERS', w - pad, yH + 8, { size: 8.5, color: MUTED, align: 'right', tracking: 0.14 })
    } else if (T > 10) {
      ctx.save()
      ctx.globalAlpha = 0.85
      haloText(narrow ? 'DRAG ↑↓ TO TRAVEL · HOLD TO WAIT' : 'DRAG ↑↓ TO TRAVEL · HOLD TO EXPOSE FASTER · TAP A STAR', w - pad, yH + 8, { size: 8.5, color: MUTED, align: 'right', tracking: 0.14 })
      ctx.restore()
    }
  }

  let lstOpenNow = 0
  function drawPicked(T: number, lstN: number) {
    if (!picked) return
    const age = T - picked.t0
    if (age < 0 || age > 6) {
      picked = null
      return
    }
    const i = picked.i
    projStar(i, lstN * 15 * D2R - RA[i])
    if (P.up < 0) return
    const a = smoothstep(0, 0.25, age) * (1 - smoothstep(5, 6, age))
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = rgba(INK, 0.7)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(P.x, P.y, 7, 0, TAU)
    ctx.stroke()
    const tK = TK[i]
    const cls = tK > 30000 ? 'O' : tK > 10000 ? 'B' : tK > 7500 ? 'A' : tK > 6000 ? 'F' : tK > 5200 ? 'G' : tK > 3700 ? 'K' : 'M'
    const kStr = `${(Math.round(tK / 100) * 100).toLocaleString('en-US')} K`
    const label = names[i] ? `${names[i].toUpperCase()} · ${cls} · ${kStr}` : `A ${cls}-TYPE STAR · ${kStr}`
    // its whole trail, picked out
    const lo = lstOpenNow * 15 * D2R - RA[i]
    const ln2 = lstN * 15 * D2R - RA[i]
    if (ln2 - lo > 1e-3) {
      ctx.strokeStyle = INK
      ctx.lineWidth = 2
      ctx.beginPath()
      trail(i, lo, ln2)
      ctx.stroke()
    }
    setFont(ctx, { size: 9, tracking: 0.14 })
    const tw = ctx.measureText(label).width
    const right = P.x + 14 + tw + 18 < w - pad
    const lx = right ? P.x + 12 : P.x - 12
    const ly = clamp(P.y - 12, topM, hy0 - 8)
    haloText(label, right ? lx + 14 : lx - 14, ly, { size: 9, color: INK, align: right ? 'left' : 'right', tracking: 0.14 })
    // its colour, as a swatch
    ctx.fillStyle = css(blackbody(tK))
    ctx.fillRect(right ? lx : lx - 10, ly - 7, 10, 8)
    ctx.restore()
  }

  /* -------------------------------------------------------- sound */
  const sfx = env.sfx
  let nextChirp = 0
  let nextWind = 0

  let expTotal = 0
  layout()

  /** a tap: name the star whose trail (or current position) is under the finger */
  function pick(x: number, y: number) {
    const T = curT()
    const lo = lstOpen(T) * 15 * D2R
    const ln = (lstOpen(T) + (expTotal * SIDEREAL) / 15) * 15 * D2R
    const tol = touch ? 16 : 10
    let best = -1
    let bd = Infinity
    for (let i = 0; i < N; i++) {
      if (MAG[i] > 4.6 && !names[i]) continue
      const bonus = names[i] ? 4 : 0
      // the star itself
      projStar(i, ln - RA[i])
      if (P.up > 0) {
        const d = Math.hypot(P.x - x, P.y - y) - bonus
        if (d < tol * 1.6 && d < bd) {
          bd = d
          best = i
        }
      }
      // anywhere along its arc
      if (CMODE[i] !== 0 || ln - lo < 0.01) continue
      const dr = Math.abs(Math.hypot(x - CCX[i], y - CCY[i]) - CCR[i]) - bonus
      if (dr > tol || dr >= bd) continue
      projStar(i, lo - RA[i])
      const a0 = Math.atan2(P.y - CCY[i], P.x - CCX[i])
      projStar(i, 0.5 * (lo + ln) - RA[i])
      const am = Math.atan2(P.y - CCY[i], P.x - CCX[i])
      projStar(i, ln - RA[i])
      const a1 = Math.atan2(P.y - CCY[i], P.x - CCX[i])
      const at = Math.atan2(y - CCY[i], x - CCX[i])
      const m = (v: number) => ((v % TAU) + TAU) % TAU
      const dE = m(a1 - a0)
      const ccw = m(am - a0) > dE
      const inside = ln - lo > TAU - 0.01 || (ccw ? m(a0 - at) <= m(a0 - a1) : m(at - a0) <= dE)
      if (inside) {
        bd = dr
        best = i
      }
    }
    if (best >= 0) {
      picked = { i: best, t0: T }
      sfx.tone(320 + Math.min(900, TK[best] / 20), 1.2, { type: 'sine', gain: 0.04, room: 0.5 })
    }
  }

  return {
    resize() {
      layout()
    },
    pointer(p: PointerInfo) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        scrubX = -1
        down = null
        holding = false
        env.setCursor('default')
        return
      }
      const ruler = onRuler(p.x, p.y)
      if (p.type === 'down') {
        interacted = true
        down = { x: p.x, y: p.y, ms: performance.now(), moved: false, ruler, lat0: latUser ?? cam.phi }
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
          if (Math.hypot(p.x - down.x, p.y - down.y) > (touch ? 10 : 6)) {
            down.moved = true
            holding = false
          }
          if (down.moved) latUser = clamp(down.lat0 - ((p.y - down.y) / (hy0 * 0.9)) * 90, -89, 89)
        } else scrubX = ruler ? p.x : -1
        env.setCursor(ruler ? 'pointer' : down?.moved ? 'grabbing' : 'ns-resize')
        return
      }
      if (p.type === 'up') {
        if (down && !down.ruler && !down.moved && performance.now() - down.ms < 300) pick(p.x, p.y)
        if (down?.ruler) scrubX = -1
        down = null
        holding = false
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
        latUser = clamp((latUser ?? cam.phi) + (code === 'ArrowUp' ? 5 : -5), -89, 89)
        return true
      }
      if (code === 'Space') {
        holdKey = isDown
        if (isDown) interacted = true
        return true
      }
      if (code === 'KeyP') {
        if (isDown) paused = !paused
        return true
      }
      return false
    },
    frame(t, dt) {
      if (paused && dt > 0) offset -= dt
      const T = (((t + offset) % LOOP) + LOOP) % LOOP
      const first = t + offset < LOOP
      // a press held still opens the shutter faster
      if (down && !down.moved && !down.ruler && performance.now() - down.ms > 260) holding = true
      const leg = legAt(T)
      const ch = chapterAt(T)
      if (prevT < 0) {
        lastLeg = leg
        lastChapter = ch
      }
      if (prevT >= 0 && T < prevT - 1) {
        boost = 0
        latUser = null
      }
      if (leg !== lastLeg) {
        boost = 0
        lastLeg = leg
      }
      if (ch !== lastChapter) {
        latUser = null
        lastChapter = ch
      }
      if (testTap && prevT >= 0) {
        pick(testTap[0], testTap[1])
        interacted = true
        testTap = null
      }
      const open = shutter(T)
      const rateK = holding || holdKey ? 6 : 1
      if (dt > 0 && rateK > 1 && open > 0.5) boost += dt * 0.55 * (rateK - 1)
      const eAuto = expAuto(T)
      expTotal = Math.min(24, eAuto + (open > 0.5 ? boost : 0))
      const phi = latUser ?? latAuto(T)
      setCamera(phi)
      buildCircles()
      const lstO = lstOpen(T)
      lstOpenNow = lstO
      const lstN = lstO + (expTotal * SIDEREAL) / 15
      const L = LEGS[leg]

      ground(ctx, w, h, 'night')
      // a deeper sky than the page's night, so starlight keeps its colour
      ctx.fillStyle = 'rgba(2,8,11,0.46)'
      ctx.fillRect(0, 0, w, h)
      drawSky(T, lstO, lstN, open)
      drawGround(T, open)
      if (!preview || T > 16) drawPole(T, lstO, lstN)
      drawPicked(T, lstN)
      captionAt(T)

      const hh = Math.floor(expTotal)
      const mm = Math.floor((expTotal - hh) * 60)
      const turned = expTotal * SIDEREAL
      const latStr = `${Math.abs(phi).toFixed(1)}° ${phi >= 0 ? 'N' : 'S'}`
      const settled = Math.abs(latAuto(T) - latAuto(T + 0.2)) < 1e-3
      const place = latUser !== null ? latStr : !settled ? 'TRAVELLING' : T >= 33.5 && T < 45 ? '78° N · POLAR NIGHT' : L.place
      const readouts: [string, string][] = [
        ['Latitude', latStr],
        ['Exposure', open > 0.5 || expTotal > 0 ? `${hh} H ${String(mm).padStart(2, '0')} M` : 'SHUTTER CLOSED'],
        ['Sky turned', `${turned.toFixed(1)}°`],
        ['Rate', `${SIDEREAL}° / H`],
        ['Stars', N.toLocaleString('en-US')],
      ]
      if (cam.face > 0.6) readouts.splice(1, 0, ['Pole altitude', `${Math.abs(phi).toFixed(1)}°`])
      chrome(T, readouts, place)
      drawDial(L.clock + expTotal, expTotal, rateK)
      hints(T, first)

      // sound: a soft night (no crickets in the polar night)
      if (sfx.enabled && dt > 0) {
        const polar = Math.abs(phi) > 60
        if (!polar && t > nextChirp) {
          const f0 = 4200 + Math.random() * 500
          for (let k = 0; k < 3; k++) sfx.tone(f0, 0.045, { type: 'sine', gain: 0.006, when: k * 0.07, pan: Math.random() * 1.4 - 0.7, room: 0.3 })
          nextChirp = t + 0.9 + Math.random() * 2.4
        }
        if (t > nextWind) {
          sfx.noise(6 + Math.random() * 3, { filter: polar ? 520 : 340, to: polar ? 900 : 520, q: 0.5, gain: polar ? 0.03 : 0.018, room: 0.5 })
          nextWind = t + 6 + Math.random() * 5
        }
        const crossed = (te: number) => prevT >= 0 && prevT < te && te <= T
        for (const te of [1.2, 51, 66.4]) if (crossed(te)) sfx.noise(0.07, { filter: 2600, q: 2, gain: 0.05, room: 0.2 })
        for (const te of [44.4, 60.4, 76.4]) if (crossed(te)) sfx.noise(0.06, { filter: 1800, q: 2, gain: 0.045, room: 0.2 })
      }
      prevT = T
    },
  }
}

export default create
