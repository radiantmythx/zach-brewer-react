/*
 * C.06 — SOAP FILM
 *
 * The life of a soap film in a wire loop. Its colours are not pigment but
 * interference: light reflected from the film's front surface meets light
 * reflected from its back, half a wave out of step (the front reflection is
 * inverted), plus the extra path 2·n·d through the film. For every thickness
 * d the piece computes the reflectance at each wavelength with the Airy
 * formula for a water film (n ≈ 1.33, with dispersion) between air, lights
 * it with a 6,500 K daylight blackbody, integrates against the CIE 1931
 * observer (color.ts) and white-balances to sRGB: a lookup table of the
 * true colour of a film d nanometres thick, 0–2,000 nm. That table is
 * Newton's colour scale, drawn alongside as a ruler.
 *
 * The film drains under gravity: thick and pale at the bottom, thinning
 * from the top through the vivid orders, then silver, grey and the black
 * film (under ~30 nm, reflecting almost nothing), then it bursts. A
 * material-coordinate field is advected by slow curl noise (the Marangoni
 * swirls) and by the viewer's breath, and gravity re-stratifies it.
 *
 *   I    Drawn        the loop lifts out of the solution, the film pale and thick
 *   II   Draining     colour bands slide down from the top; swirls at the rim
 *   III  Black film   silver, grey, then black spreading down from the top
 *   IV   Burst        a hole opens in the black film and races outward (slowed)
 *   V    Again        droplets fall; the loop dips for the next film
 *
 * Full mode: drag across the film to blow on it; tap to burst it; hover to
 * read the thickness at any point. ← → step chapters; the ruler scrubs.
 */

import { C, TAU, clamp, ease, ground, lerp, makeNoise, rng, setFont, smoothstep, text } from '../kit'
import { cmf, planck, xyzToLinear } from '../color'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('italic 400 64px "Instrument Serif"'), document.fonts.load('500 12px "Geist Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. C.06'
const LOOP = 52
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Drawn' },
  { t: 6, num: 'II', name: 'Draining' },
  { t: 29, num: 'III', name: 'Black film' },
  { t: 40.5, num: 'IV', name: 'Burst' },
  { t: 45, num: 'V', name: 'Again' },
]
/** the automatic burst, if the viewer has not burst it first */
const POP_T = 40.6
/** the film is drawn (age 0) here */
const BORN = 3.2
const DMAX = 2000

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 7.2, t1: 15.6, lines: [{ s: 'Color without' }, { s: '', em: 'pigment.' }] },
  { t0: 18.4, t1: 27.2, lines: [{ s: 'A film a few hundred' }, { s: 'molecules ', em: 'thin.' }] },
  { t0: 31.2, t1: 39.4, lines: [{ s: 'Thinner than' }, { s: '', em: 'light can see.' }] },
  { t0: 41.4, t1: 46.8, lines: [{ s: 'Then, all at once,' }, { s: '', em: 'gone.' }] },
]

/* ---------------------------------------------- the colour of a film d nm thick */

/** refractive index of the soap solution (water, Cauchy fit), λ in nm */
const nFilm = (nm: number) => 1.324 + 3100 / (nm * nm)

/**
 * Reflectance at normal incidence of a free film (air | film | air), from the
 * Airy sum of all the internally reflected beams. r = (n−1)/(n+1) at each face,
 * opposite in sign: the half-wave shift. δ = 4πnd/λ is the round-trip phase.
 */
function reflectance(nm: number, d: number) {
  const n = nFilm(nm)
  const r = (n - 1) / (n + 1)
  const r2 = r * r
  const c = Math.cos((4 * Math.PI * n * d) / nm)
  return (2 * r2 * (1 - c)) / (1 + r2 * r2 - 2 * r2 * c)
}

/** The table: sRGB bytes for every whole nanometre 0…DMAX, plus the peak reflectance. */
function buildLut(exposure: number) {
  const lut = new Uint8ClampedArray((DMAX + 1) * 3)
  // daylight: a 6,500 K blackbody, sampled every 5 nm, with the observer's x̄ ȳ z̄
  const NS = 81
  const S = new Float64Array(NS)
  const X = new Float64Array(NS)
  const Y = new Float64Array(NS)
  const Z = new Float64Array(NS)
  for (let j = 0; j < NS; j++) {
    const nm = 380 + j * 5
    S[j] = planck(nm, 6504)
    const c = cmf(nm)
    X[j] = c[0] * S[j]
    Y[j] = c[1] * S[j]
    Z[j] = c[2] * S[j]
  }
  let wx = 0
  let wy = 0
  let wz = 0
  for (let j = 0; j < NS; j++) {
    wx += X[j]
    wy += Y[j]
    wz += Z[j]
  }
  // white balance: a perfect mirror would be (1, 1, 1)
  const W = xyzToLinear([wx / wy, 1, wz / wy])
  const enc = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)
  for (let d = 0; d <= DMAX; d++) {
    let x = 0
    let y = 0
    let z = 0
    for (let j = 0; j < NS; j++) {
      const R = reflectance(380 + j * 5, d)
      x += R * X[j]
      y += R * Y[j]
      z += R * Z[j]
    }
    const L = xyzToLinear([x / wy, y / wy, z / wy])
    let r = (L[0] / W[0]) * exposure
    let g = (L[1] / W[1]) * exposure
    let b = (L[2] / W[2]) * exposure
    // out of gamut: lift with white (as a display must), then scale under 1
    const lo = Math.min(r, g, b)
    if (lo < 0) {
      r -= lo
      g -= lo
      b -= lo
    }
    const hi = Math.max(r, g, b)
    if (hi > 1) {
      r /= hi
      g /= hi
      b /= hi
    }
    lut[d * 3] = Math.round(enc(r) * 255)
    lut[d * 3 + 1] = Math.round(enc(g) * 255)
    lut[d * 3 + 2] = Math.round(enc(b) * 255)
  }
  return lut
}
// the brightest a film can reflect: 4r²/(1+r²)² at a quarter wave, ≈ 7.7 %
const RPEAK = (() => {
  const r = (nFilm(550) - 1) / (nFilm(550) + 1)
  return (4 * r * r) / (1 + r * r) ** 2
})()

/** Names on Newton's scale for a soap film seen by reflection (thickness, nm), read off the computed table. */
const NAMES: [number, string][] = [
  [12, 'black'],
  [55, 'grey'],
  [100, 'white'],
  [135, 'straw'],
  [165, 'amber'],
  [195, 'purple'],
  [228, 'blue'],
  [278, 'green'],
  [318, 'yellow'],
  [360, 'red'],
  [400, 'magenta'],
  [448, 'blue'],
  [505, 'green'],
  [565, 'pink'],
  [680, 'green'],
  [780, 'pink'],
]

/** Thin-film order boundaries: where green (550 nm) is cancelled, d = m·λ/2n. */
const ORDERS = [1, 2, 3, 4].map((m) => (m * 550) / (2 * nFilm(550)))

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const k = { ink: '#EEF4F1', ink2: 'rgba(238,244,241,0.74)', muted: 'rgba(238,244,241,0.5)', rule: 'rgba(238,244,241,0.14)', faint: 'rgba(238,244,241,0.07)' }
  const ACC = C.sage
  const noise = makeNoise(53)
  const LUT = buildLut((1 / RPEAK) * 0.62)

  /* --------------------------------------------------------- the film */

  // material coordinate Z (0 at the top of the loop, 1 at the bottom), advected and re-stratified
  const G = preview ? 40 : 64
  const ZF = new Float32Array(G * G)
  const ZT = new Float32Array(G * G)
  // velocity on a coarser grid, units of loop diameters per second; user forcing decays
  const V = 20
  const VXn = new Float32Array(V * V)
  const VYn = new Float32Array(V * V)
  const UXf = new Float32Array(V * V)
  const UYf = new Float32Array(V * V)
  function resetFilm() {
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) ZF[j * G + i] = j / (G - 1)
    UXf.fill(0)
    UYf.fill(0)
  }
  resetFilm()

  /* --------------------------------------------------- the thickness model */

  /** thickness at the top and bottom of the film as it ages (nm) */
  const hTop = (age: number) => 1100 * Math.exp(-age / 6) + 6 - 6 * smoothstep(20, 30, age)
  const hBot = (age: number) => 760 + 1500 * Math.exp(-age / 7)
  /** how far down the black film has spread (fraction of the loop's height) */
  const blackFront = (age: number) => 0.4 * smoothstep(19, 37, age) * (0.6 + 0.4 * smoothstep(26, 37, age))
  /** draining profile: thin above, thick below (h grows like a power of depth below the black film) */
  function hAt(z: number, age: number) {
    const a = hTop(age)
    const b = hBot(age)
    const zb = blackFront(age)
    return a + (b - a) * Math.pow(clamp((z - zb) / (1 - zb)), 0.62)
  }
  /** the black film: once thinner than ~30 nm the film jumps to a few nanometres */
  const BLACK = 30
  const hTab = new Float32Array(257)
  let tabAge = -1
  function fillTab(age: number) {
    if (age === tabAge) return
    tabAge = age
    for (let i = 0; i <= 256; i++) {
      const h = hAt(i / 256, age)
      hTab[i] = h < BLACK ? 5 : h
    }
  }
  const hOf = (Z: number) => {
    const f = clamp(Z) * 256
    const i = Math.min(255, f | 0)
    return hTab[i] + (hTab[i + 1] - hTab[i]) * (f - i)
  }

  /* ------------------------------------------------------------ layout */

  let w = env.width
  let h = env.height
  let pad = 20
  let portrait = false
  let short = false
  let tiny = false
  let sideCap = false
  let cx = 0
  let cy = 0
  let R = 100
  let surfY = 0
  let rulX = 0
  let rulTop = 0
  let rulH = 100
  let capX = 0
  let capY = 0
  let capSize = 28
  let capW = 300
  let rulerOn = true
  let rowGap = 2.4

  /** names beside the scale need room: only with a large loop */
  let names = false
  /** how far right of the loop the scale sits */
  const scaleGap = () => (tiny ? 16 : names ? 84 : 26)
  /** the width taken by the scale and its labels, right of the loop */
  const scaleW = () => scaleGap() + (tiny ? 8 : 12) + (tiny ? 34 : 70)

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.1
    short = h < 440
    tiny = preview || Math.min(w, h) < 300
    sideCap = !portrait && w / h > 1.75 && h < 620
    const compact = !portrait && !sideCap && (short || w < 760)
    pad = clamp(Math.min(w, h) * 0.045, tiny ? 10 : 14, 38)
    rulerOn = !preview && h >= 280
    const rulerH = rulerOn ? 22 : 4
    const top = pad + (tiny ? 26 : 34)
    if (portrait) {
      capSize = clamp(w * 0.075, 18, 38)
      capX = pad
      capW = w - pad * 2
      capY = h - pad - rulerH - capSize * 2.4
      const avail = capY - top - 30
      names = false
      R = Math.min((w - pad * 2 - scaleW() - 8) / 2, avail * 0.36)
      cx = pad + R + 4
      // centre the loop, its trough and the scale's title in the space above the words
      cy = top + 30 + Math.max(0, (avail - 30 - R * 2.75) * 0.42) + R
      surfY = cy + R * 1.22
    } else if (sideCap) {
      // a wide, short frame: the loop and its scale on the left, the words to the right
      capSize = clamp(Math.min(h * 0.085, w * 0.034), 14, 34)
      capW = clamp(w * 0.3, 150, 330)
      const avail = h - top - pad - rulerH
      R = Math.min(avail * 0.42, (w - capW - pad * 3 - 120) / 2)
      names = R > 150
      const group = 2 * R + scaleW()
      const left = pad + Math.max(0, (w - capW - pad * 3 - group) * 0.45)
      cx = left + R
      cy = top + R
      surfY = cy + R * 1.14
      capX = Math.max(cx + R + scaleW() + 24, w - pad - capW)
      capW = w - capX - pad
      capY = h - pad - rulerH - capSize * 2.4
    } else if (compact) {
      // small or short squarish frames: the drawing centred, the words underneath
      capSize = clamp(Math.min(w * 0.05, h * 0.065), 14, 24)
      capX = pad
      capW = w - pad * 2
      capY = h - pad - rulerH - capSize * 2.3
      // the scale's top must clear the readouts in the corner above it
      const top2 = pad + (tiny ? 34 : 46)
      const avail = capY - top2 - 14
      names = false
      R = Math.min(avail / 2.32, (w - pad * 2 - scaleW()) / 2)
      const group = 2 * R + scaleW()
      cx = (w - group) / 2 + R
      cy = top2 + R
      surfY = cy + R * 1.13
    } else {
      capSize = clamp(Math.min(w * 0.038, h * 0.056), 19, 46)
      capX = pad * 1.3
      capW = w * 0.32
      capY = top + 2
      const avail = h - top - pad - rulerH
      R = Math.min(avail * 0.4, w * 0.23)
      names = R > 150
      cx = Math.max(w * 0.48, capX + capSize * 7.5 + R)
      cx = Math.min(cx, w - pad - scaleW() - 40 - R)
      cy = top + avail * 0.44
      surfY = cy + R * 1.2
    }
    rulX = cx + R + scaleGap()
    rulTop = cy - R
    rulH = 2 * R
    rowGap = R > 220 ? 2.6 : R > 120 ? 2.3 : 2.0
    buildRows()
  }

  // the hairline rows the film is drawn with
  let rows = 0
  let cols = 0
  let img: ImageData | null = null
  let imgCanvas: HTMLCanvasElement | null = null
  let imgCtx: CanvasRenderingContext2D | null = null
  function buildRows() {
    rows = Math.max(16, Math.floor((2 * R) / rowGap))
    cols = Math.max(24, Math.min(preview ? 90 : 220, Math.floor((2 * R) / 2.6)))
    if (typeof document === 'undefined') return
    imgCanvas = document.createElement('canvas')
    imgCanvas.width = cols
    imgCanvas.height = rows
    imgCtx = imgCanvas.getContext('2d')
    img = imgCtx ? imgCtx.createImageData(cols, rows) : null
  }
  layout()

  // the colour scale, as an image (one row per nanometre bucket)
  let scaleCanvas: HTMLCanvasElement | null = null
  function scaleImage() {
    if (scaleCanvas || typeof document === 'undefined') return scaleCanvas
    scaleCanvas = document.createElement('canvas')
    scaleCanvas.width = 1
    scaleCanvas.height = DMAX + 1
    const sc = scaleCanvas.getContext('2d')
    if (sc) {
      const im = sc.createImageData(1, DMAX + 1)
      for (let d = 0; d <= DMAX; d++) {
        im.data[d * 4] = LUT[d * 3]
        im.data[d * 4 + 1] = LUT[d * 3 + 1]
        im.data[d * 4 + 2] = LUT[d * 3 + 2]
        im.data[d * 4 + 3] = 255
      }
      sc.putImageData(im, 0, 0)
    }
    return scaleCanvas
  }
  /** the scale is drawn 0 → SCALE_MAX nm top to bottom, square-root spaced so the thin end has room */
  const SCALE_MAX = 1400
  const scaleY = (d: number) => rulTop + rulH * Math.sqrt(clamp(d / SCALE_MAX))

  /* ------------------------------------------------------- interaction */

  const at = Number(env.params.get('at'))
  let offset = Number.isFinite(at) && env.params.has('at') ? at : preview ? 21 : 0
  let lastT = 0
  let prevT = -1
  const ptr = { x: 0, y: 0, over: false, down: false, touch: false, sx: 0, sy: 0, ms: 0, moved: 0, vx: 0, vy: 0, lx: 0, ly: 0 }
  let touched = false
  let hoverRuler = false
  let hoverX = -1
  let scrubbing = false
  // the burst of this loop
  let popT = -1
  let popAge = 0
  let popU = 0.5
  let popV = 0.2
  let userPop = false
  let jumpPending = -1
  const drops = {
    n: 0,
    x: new Float32Array(preview ? 160 : 520),
    y: new Float32Array(preview ? 160 : 520),
    vx: new Float32Array(preview ? 160 : 520),
    vy: new Float32Array(preview ? 160 : 520),
    life: new Float32Array(preview ? 160 : 520),
    r: new Float32Array(preview ? 160 : 520),
  }
  const rr = rng(77)

  const curT = () => (((lastT + offset) % LOOP) + LOOP) % LOOP
  const rulerY = () => h - pad * 0.55 - 4
  const onRuler = (x: number, y: number) => rulerOn && y > rulerY() - 20 && y < h && x > pad - 8 && x < w - pad + 8
  function seekTo(x: number) {
    const T = curT()
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 1.6) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }

  /** where the loop is (its centre) at time T: rising out of the solution, dipping back */
  function loopY(T: number) {
    const down = surfY + R * 1.25
    if (T < BORN) return lerp(down, cy, ease.inOutCubic(clamp((T - 0.4) / (BORN - 0.4))))
    if (T > 47.6) return lerp(cy, down, ease.inOutCubic(clamp((T - 47.6) / 4)))
    return cy
  }

  /* ------------------------------------------------------------ sound */

  function popSound() {
    env.sfx.noise(0.06, { filter: 4200, q: 1.4, gain: 0.07, room: 0.2 })
    env.sfx.noise(0.5, { filter: 900, to: 300, q: 0.6, gain: 0.025, room: 0.5 })
    for (let i = 0; i < 6; i++) env.sfx.tone(1800 + rr() * 1600, 0.05, { type: 'sine', gain: 0.012, when: 0.08 + rr() * 0.6, room: 0.4 })
  }

  /* --------------------------------------------------------- helpers */

  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4] = {}) {
    ctx.save()
    setFont(ctx, o)
    const tw = ctx.measureText(o.upper ? str.toUpperCase() : str).width
    const al = o.align ?? 'left'
    const left = al === 'center' ? x - tw / 2 : al === 'right' ? x - tw : x
    x += left < 4 ? 4 - left : left + tw > w - 4 ? w - 4 - (left + tw) : 0
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(11,29,36,0.85)'
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }

  /** a label set on a small dark plate, for text over the film */
  function plate(str: string, x: number, y: number, o: Parameters<typeof text>[4] = {}) {
    setFont(ctx, o)
    const s2 = o.upper ? str.toUpperCase() : str
    const tw = ctx.measureText(s2).width
    const al = o.align ?? 'left'
    const left = al === 'center' ? x - tw / 2 : al === 'right' ? x - tw : x
    const size = o.size ?? 11
    ctx.save()
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha
    ctx.fillStyle = 'rgba(11,29,36,0.82)'
    ctx.fillRect(left - 6, y - size * 0.95, tw + 12, size * 1.45)
    ctx.restore()
    text(ctx, str, x, y, o)
  }

  /** film-local (u, v in 0…1 across the loop's square) ↔ screen, at the loop's current height */
  let ly = cy
  const toU = (x: number) => (x - (cx - R)) / (2 * R)
  const toV = (y: number) => (y - (ly - R)) / (2 * R)
  function zAt(u: number, v: number) {
    const fx = clamp(u) * (G - 1)
    const fy = clamp(v) * (G - 1)
    const i = Math.min(G - 2, fx | 0)
    const j = Math.min(G - 2, fy | 0)
    const tx = fx - i
    const ty = fy - j
    const a = ZF[j * G + i]
    const b = ZF[j * G + i + 1]
    const c = ZF[(j + 1) * G + i]
    const d = ZF[(j + 1) * G + i + 1]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
  }

  /* -------------------------------------------------------- simulate */

  function simulate(T: number, dt: number, age: number) {
    if (dt <= 0) return
    // velocity: slow curl noise, strongest near the wire, calmer as the film thins; plus breath
    const swirl = (0.05 + 0.07 * Math.exp(-age / 14)) * (T < BORN + 1.5 ? smoothstep(BORN - 0.5, BORN + 1.5, T) : 1)
    const zt = T * 0.07
    for (let j = 0; j < V; j++) {
      for (let i = 0; i < V; i++) {
        const u = i / (V - 1)
        const v = j / (V - 1)
        const dx = u - 0.5
        const dy = v - 0.5
        const r = Math.sqrt(dx * dx + dy * dy) * 2
        // stirring lives at the rim and in the thick lower film; the thin top stays calm and layered
        const edge = (0.3 + 0.9 * smoothstep(0.5, 0.95, r)) * (0.2 + 0.8 * smoothstep(0.08, 0.7, v))
        const wall = 1 - smoothstep(0.9, 1.0, r)
        const [cx2, cy2] = noise.curl2(u * 2.2, v * 2.2, zt, 0.02)
        const q = j * V + i
        VXn[q] = (cx2 * swirl * edge + UXf[q]) * wall
        VYn[q] = (cy2 * swirl * edge * 0.8 + UYf[q]) * wall
        const kd = Math.exp(-1.7 * dt)
        UXf[q] *= kd
        UYf[q] *= kd
      }
    }
    // semi-Lagrangian advection of Z, then gravity's re-stratification toward Z = v
    const kr = 1 - Math.exp(-0.42 * dt)
    for (let j = 0; j < G; j++) {
      const v = j / (G - 1)
      for (let i = 0; i < G; i++) {
        const u = i / (G - 1)
        const fx = u * (V - 1)
        const fy = v * (V - 1)
        const i0 = Math.min(V - 2, fx | 0)
        const j0 = Math.min(V - 2, fy | 0)
        const tx = fx - i0
        const ty = fy - j0
        const q = j0 * V + i0
        const vx = (VXn[q] * (1 - tx) + VXn[q + 1] * tx) * (1 - ty) + (VXn[q + V] * (1 - tx) + VXn[q + V + 1] * tx) * ty
        const vy = (VYn[q] * (1 - tx) + VYn[q + 1] * tx) * (1 - ty) + (VYn[q + V] * (1 - tx) + VYn[q + V + 1] * tx) * ty
        let z = zAt(u - vx * dt, v - vy * dt)
        z += (v - z) * kr
        ZT[j * G + i] = z
      }
    }
    ZF.set(ZT)
  }

  /** breath: push the film along the pointer's motion, a soft round footprint */
  function blow(x: number, y: number, vx: number, vy: number, strength: number) {
    const u0 = toU(x)
    const v0 = toV(y)
    const sig = ptr.touch ? 0.16 : 0.12
    for (let j = 0; j < V; j++) {
      for (let i = 0; i < V; i++) {
        const du = i / (V - 1) - u0
        const dv = j / (V - 1) - v0
        const wgt = Math.exp(-(du * du + dv * dv) / (2 * sig * sig)) * strength
        if (wgt < 0.002) continue
        const q = j * V + i
        UXf[q] = clamp(UXf[q] + (vx / (2 * R)) * wgt * 0.5, -0.6, 0.6)
        UYf[q] = clamp(UYf[q] + (vy / (2 * R)) * wgt * 0.5, -0.6, 0.6)
      }
    }
  }

  /* --------------------------------------------------------- the burst */

  function startPop(T: number, age: number, u: number, v: number, user: boolean, sound = true) {
    popT = T
    popAge = age
    popU = u
    popV = v
    userPop = user
    if (sound) popSound()
  }
  /** hole radius in loop diameters at time T (slowed enormously: really a few milliseconds) */
  const holeR = (T: number) => (popT < 0 || T < popT ? 0 : Math.pow((T - popT) / 0.55, 1.15) * 1.6)

  /* ------------------------------------------------------------ frame */

  function frame(t: number, dt: number) {
    lastT = t
    let T = curT()
    const crossed = (te: number) => dt > 0 && prevT >= 0 && prevT < te && te <= T
    if (prevT >= 0 && T < prevT - 1) {
      // a new loop
      popT = -1
      userPop = false
      drops.n = 0
      resetFilm()
    }
    // a burst the viewer caused early: once it has run, carry on from the auto-burst's aftermath
    if (jumpPending >= 0 && T > jumpPending) {
      const since = T - popT
      offset += POP_T + since - T
      T = curT()
      popT = POP_T
      jumpPending = -1
    }
    const age = Math.max(0, T - BORN)
    if (T < BORN) resetFilm()
    if (popT < 0 && T >= POP_T) {
      // burst near the top, in the black film (seeking past it lands in the aftermath)
      startPop(POP_T, POP_T - BORN, 0.46, 0.15, false, crossed(POP_T))
    }
    if (popT >= 0 && T < popT - 0.01) {
      popT = -1
      drops.n = 0
    }
    const filmAge = popT >= 0 ? Math.min(age, popAge) : age
    fillTab(filmAge)

    // the ghost: breath across the lower film, early in full mode
    let ghost = 0
    let gx = 0
    let gy = 0
    let gu = 0
    if (!preview && !touched && t < LOOP && T > 9.2 && T < 14.2) {
      gu = (T - 9.2) / 5
      ghost = smoothstep(0, 0.1, gu) * (1 - smoothstep(0.86, 1, gu))
      const a = lerp(-2.6, -0.5, ease.inOutSine(gu))
      gx = cx + Math.cos(a) * R * 0.62
      gy = cy + R * 0.28 + Math.sin(a) * -R * 0.28
    }

    ly = loopY(T)
    if (dt > 0 && popT < 0) {
      if (ghost > 0.05) {
        const a2 = lerp(-2.6, -0.5, ease.inOutSine(clamp(gu + 0.02)))
        const nx = cx + Math.cos(a2) * R * 0.62
        const ny = cy + R * 0.28 + Math.sin(a2) * -R * 0.28
        blow(gx, gy, (nx - gx) / (0.1), (ny - gy) / (0.1), 0.05 * ghost)
      }
      if (ptr.down && ptr.moved > 6) blow(ptr.x, ptr.y, ptr.vx, ptr.vy, 0.06)
    }
    simulate(T, popT >= 0 ? 0 : dt, filmAge)

    /* ---------------------------------------------------- paint */
    ground(ctx, w, h, 'night')
    const fadeIn = smoothstep(0.1, 0.9, T)

    // the solution in its trough
    const tw = Math.min(R * 1.45, cx - 4)
    ctx.save()
    ctx.globalAlpha = fadeIn
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - tw, surfY)
    ctx.lineTo(cx + tw, surfY)
    ctx.stroke()
    ctx.strokeStyle = k.faint
    ctx.beginPath()
    const deep = Math.min(h - surfY - (rulerOn ? 30 : 6), R * 0.5)
    for (let yy = surfY + 5; yy < surfY + deep; yy += 4) {
      const inset = (yy - surfY) * 0.3
      ctx.moveTo(cx - tw + inset, yy)
      ctx.lineTo(cx + tw - inset, yy)
    }
    ctx.stroke()
    if (!tiny && (capY < surfY - R || surfY + 15 < capY - 22)) halo('SOAP SOLUTION', cx - tw, surfY + 15, { size: 8.5, color: k.muted, tracking: 0.14 })
    ctx.restore()

    // the film, as hairline rows of computed colour, only above the surface and outside the hole
    const filmOn = T >= 0.6 && (popT < 0 || T < popT + 1.2)
    if (filmOn && img && imgCtx && imgCanvas) {
      const data = img.data
      const hr = holeR(T)
      const top = ly - R
      for (let r = 0; r < rows; r++) {
        const yy = top + ((r + 0.5) / rows) * 2 * R
        const v = (r + 0.5) / rows
        const dyc = (yy - ly) / R
        const half = Math.sqrt(Math.max(0, 1 - dyc * dyc))
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) / cols
          const dxc = u * 2 - 1
          const o = (r * cols + c) * 4
          if (Math.abs(dxc) > half * 0.995 || yy > surfY) {
            data[o + 3] = 0
            continue
          }
          const hh = hOf(zAt(u, v))
          if (hr > 0) {
            const du = u - popU
            const dv = v - popV
            // the hole races through the thin film and slows in the thick (rim speed ∝ 1/√h);
            // just outside it, the liquid the rim has gathered
            const q = Math.sqrt(du * du + dv * dv) - hr * Math.pow(30 / Math.max(30, hh), 0.18)
            if (q < 0) {
              data[o + 3] = 0
              continue
            }
            if (q < 0.014) {
              data[o] = data[o + 1] = data[o + 2] = 235
              data[o + 3] = 255
              continue
            }
          }
          const d = Math.min(DMAX, Math.round(hh))
          data[o] = LUT[d * 3]
          data[o + 1] = LUT[d * 3 + 1]
          data[o + 2] = LUT[d * 3 + 2]
          // the newly drawn film fades in from below as it leaves the solution
          data[o + 3] = 255
        }
      }
      imgCtx.putImageData(img, 0, 0)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = smoothstep(0.6, 1.6, T)
      ctx.imageSmoothingEnabled = true
      const lw = Math.max(1, rowGap * 0.48)
      for (let r = 0; r < rows; r++) {
        const yy = top + (r / rows) * 2 * R
        ctx.drawImage(imgCanvas, 0, r, cols, 1, cx - R, yy + (2 * R) / rows / 2 - lw / 2, 2 * R, lw)
      }
      ctx.restore()
    }

    // the burst's rim and its droplets
    if (popT >= 0) {
      const hr = holeR(T)
      if (crossed(popT + 0.001) || (dt > 0 && T - popT < 0.9)) {
        // shed droplets from the moving rim
        const px = cx - R + popU * 2 * R
        const py = ly - R + popV * 2 * R
        const nEmit = preview ? 6 : 16
        for (let e = 0; e < nEmit && hr < 1.4; e++) {
          const a = rr() * TAU
          const u1 = popU + Math.cos(a) * hr
          const v1 = popV + Math.sin(a) * hr
          const rad = hr * 2 * R * Math.pow(30 / Math.max(30, hOf(zAt(u1, v1))), 0.18)
          const ex = px + Math.cos(a) * rad
          const ey = py + Math.sin(a) * rad
          const dxc = (ex - cx) / R
          const dyc = (ey - ly) / R
          if (dxc * dxc + dyc * dyc > 0.98 || ey > surfY) continue
          // droplets live in loop units (radii from the centre), so a resize keeps them in place
          const i = drops.n < drops.x.length ? drops.n++ : Math.floor(rr() * drops.x.length)
          const sp = 0.15 + rr() * 0.75
          drops.x[i] = dxc
          drops.y[i] = dyc
          drops.vx[i] = Math.cos(a) * sp
          drops.vy[i] = Math.sin(a) * sp - 0.2
          drops.life[i] = 0.8 + rr() * 1.6
          drops.r[i] = 0.6 + rr() * 1.3
        }
      }
    }
    if (drops.n > 0) {
      if (dt > 0) {
        for (let i = 0; i < drops.n; i++) {
          drops.life[i] -= dt
          if (drops.life[i] <= 0 || ly + drops.y[i] * R > surfY) {
            const j = --drops.n
            drops.x[i] = drops.x[j]
            drops.y[i] = drops.y[j]
            drops.vx[i] = drops.vx[j]
            drops.vy[i] = drops.vy[j]
            drops.life[i] = drops.life[j]
            drops.r[i] = drops.r[j]
            i--
            continue
          }
          const kd = Math.exp(-2.4 * dt)
          drops.vx[i] *= kd
          drops.vy[i] = drops.vy[i] * kd + 2.6 * dt
          drops.x[i] += drops.vx[i] * dt
          drops.y[i] += drops.vy[i] * dt
        }
      }
      ctx.save()
      ctx.strokeStyle = 'rgba(238,244,241,0.85)'
      ctx.lineWidth = 1
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i < drops.n; i++) {
        const X = cx + drops.x[i] * R
        const Y = ly + drops.y[i] * R
        ctx.moveTo(X, Y)
        ctx.lineTo(X - drops.vx[i] * R * 0.018, Y - drops.vy[i] * R * 0.018)
      }
      ctx.stroke()
      ctx.restore()
    }

    // the wire loop and its handle
    {
      ctx.save()
      ctx.globalAlpha = fadeIn
      ctx.lineWidth = 1
      // above the surface solid, below it a faint dotted ghost
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, w, surfY)
      ctx.clip()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      ctx.arc(cx, ly, R, 0, TAU)
      ctx.stroke()
      ctx.strokeStyle = k.ink2
      ctx.beginPath()
      ctx.arc(cx, ly, R + 2.5, 0, TAU)
      ctx.stroke()
      // the handle: a twisted stem down from the bottom
      ctx.beginPath()
      ctx.moveTo(cx - 1.5, ly + R + 2)
      ctx.lineTo(cx - 1.5, ly + R * 1.9)
      ctx.moveTo(cx + 1.5, ly + R + 2)
      ctx.lineTo(cx + 1.5, ly + R * 1.9)
      ctx.stroke()
      ctx.restore()
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, surfY, w, h - surfY)
      ctx.clip()
      ctx.strokeStyle = k.faint
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.arc(cx, ly, R, 0, TAU)
      ctx.moveTo(cx, ly + R)
      ctx.lineTo(cx, ly + R * 1.9)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
      ctx.restore()
    }

    // the scale (Newton's colours), the probes, the readouts
    if (!tiny || w > 300) drawScale(T, filmOn)

    // interaction marks
    if (!preview) marks(T, ghost, gx, gy)

    // sound: a soft breath while blowing
    if (ptr.down && ptr.moved > 6 && dt > 0 && Math.random() < dt * 3) env.sfx.noise(0.5, { filter: 700, q: 0.5, gain: 0.018, room: 0.3 })
    if (crossed(BORN - 0.6)) env.sfx.tone(220, 2.2, { type: 'sine', gain: 0.03, attack: 0.4, room: 0.6 })

    captionAt(T)
    chrome(T, filmAge)
    prevT = T
  }

  function drawScale(T: number, filmOn: boolean) {
    const a = smoothstep(1.2, 2.4, T) * (1 - smoothstep(50.5, 51.8, T))
    if (a <= 0) return
    const sw = tiny ? 8 : 12
    const sc = scaleImage()
    ctx.save()
    ctx.globalAlpha = a
    if (sc) {
      // the strip in hairline rows, like the film
      ctx.imageSmoothingEnabled = true
      const step = 2
      for (let y = 0; y < rulH; y += step) {
        const d0 = SCALE_MAX * Math.pow(y / rulH, 2)
        ctx.drawImage(sc, 0, Math.min(DMAX, Math.round(d0)), 1, 1, rulX, rulTop + y, sw, 1)
      }
    }
    ctx.strokeStyle = k.rule
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(rulX) - 0.5, Math.round(rulTop) - 0.5, sw + 1, Math.round(rulH) + 1)
    // ticks: every 50 nm, labelled every 200 (and 100 near the top where there is room)
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    for (let d = 0; d <= SCALE_MAX; d += 50) {
      const y = Math.round(scaleY(d)) + 0.5
      const l = d % 200 === 0 ? 6 : 3
      ctx.moveTo(rulX + sw + 2, y)
      ctx.lineTo(rulX + sw + 2 + l, y)
    }
    ctx.stroke()
    const fs = tiny ? 7.5 : 8.5
    for (let d = 0; d <= SCALE_MAX; d += 100) {
      if (d > 600 && d % 200 !== 0) continue
      if (tiny && d % 400 !== 0) continue
      const y = scaleY(d)
      if (d > 0 && scaleY(d) - scaleY(d - 100) < 11 && d % 200 !== 0) continue
      text(ctx, d === 0 ? '0 NM' : String(d), rulX + sw + 12, y + 3, { size: fs, color: d % 200 === 0 ? k.ink2 : k.muted, tracking: 0.04 })
    }
    if (!tiny && !short) {
      text(ctx, 'THICKNESS', rulX, rulTop - 22, { size: 8.5, color: k.muted, tracking: 0.14 })
      text(ctx, "NEWTON'S SCALE", rulX, rulTop - 10, { size: 8.5, color: k.muted, tracking: 0.14 })
    }
    // the colour names, on the left of the strip
    if (names) {
      let last = -Infinity
      for (const [d, name] of NAMES) {
        const y = scaleY(d)
        if (y - last < 11) continue
        last = y
        text(ctx, name, rulX - 6, y + 3, { size: 8, color: k.muted, align: 'right', tracking: 0.08, upper: true })
      }
    }
    // order brackets
    if (!tiny) {
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      let prev = 0
      ORDERS.forEach((d) => {
        const y0 = scaleY(prev) + 2
        const y1 = scaleY(d) - 2
        const x = rulX + sw + 46
        ctx.moveTo(x, y0)
        ctx.lineTo(x + 3, y0)
        ctx.lineTo(x + 3, y1)
        ctx.lineTo(x, y1)
        prev = d
      })
      ctx.stroke()
      prev = 0
      ORDERS.forEach((d, i) => {
        const y = (scaleY(prev) + scaleY(d)) / 2
        if (scaleY(d) - scaleY(prev) > 16) text(ctx, ['I', 'II', 'III', 'IV'][i], rulX + sw + 54, y + 3, { size: 8.5, color: k.muted, tracking: 0.06 })
        prev = d
      })
    }
    ctx.restore()

    // probes: three points down the film's centre, joined to where their thickness sits on the scale
    if (filmOn && T > BORN + 0.8 && (popT < 0 || T < popT + 0.3)) {
      const pa = a * smoothstep(BORN + 0.8, BORN + 2.2, T) * (popT >= 0 ? 1 - smoothstep(popT, popT + 0.3, T) : 1)
      const probes = tiny ? [0.2, 0.75] : [0.12, 0.42, 0.8]
      ctx.save()
      ctx.globalAlpha = pa
      ctx.lineWidth = 1
      for (const v of probes) {
        const yy = ly - R + v * 2 * R
        if (yy > surfY) continue
        const d = hOf(zAt(0.5, v))
        const ys = scaleY(Math.min(SCALE_MAX, d))
        const xf = cx + R * 0.0
        ctx.strokeStyle = k.ink
        ctx.beginPath()
        ctx.arc(xf, yy, 2.2, 0, TAU)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(238,244,241,0.32)'
        ctx.setLineDash([1.5, 3])
        ctx.beginPath()
        const dyc = (yy - ly) / R
        const edge = cx + R * Math.sqrt(Math.max(0, 1 - dyc * dyc))
        ctx.moveTo(xf + 4, yy)
        ctx.lineTo(edge + 6, yy)
        ctx.lineTo(rulX - (names ? 52 : 4), ys)
        ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.restore()
    }
    // the hover probe
    if (ptr.over && !ptr.down && filmOn && !preview) {
      const dxc = (ptr.x - cx) / R
      const dyc = (ptr.y - ly) / R
      if (dxc * dxc + dyc * dyc < 0.96 && ptr.y < surfY) {
        const d = hOf(zAt(toU(ptr.x), toV(ptr.y)))
        const ys = scaleY(Math.min(SCALE_MAX, d))
        ctx.save()
        ctx.strokeStyle = k.ink
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(ptr.x, ptr.y, 5, 0, TAU)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(rulX - 3, ys)
        ctx.lineTo(rulX + sw + 3, ys)
        ctx.stroke()
        plate(d < BLACK ? `${Math.round(d)} NM · BLACK FILM` : `${Math.round(d)} NM`, ptr.x + 12, ptr.y - 10, { size: 9.5, color: k.ink, tracking: 0.1 })
        ctx.restore()
      }
    }
  }

  function marks(T: number, ghost: number, gx: number, gy: number) {
    if (ghost > 0) {
      ctx.save()
      ctx.globalAlpha = ghost
      ctx.strokeStyle = k.ink
      ctx.fillStyle = k.ink
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      for (let s = 0; s <= 30; s++) {
        const a = lerp(-2.6, -0.5, s / 30)
        const x = cx + Math.cos(a) * R * 0.62
        const y = cy + R * 0.28 + Math.sin(a) * -R * 0.28
        if (s === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(gx, gy, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(gx, gy, 9, 0, TAU)
      ctx.stroke()
      plate('DRAG TO BLOW · TAP TO BURST', cx, cy + R * 0.66, { size: 9.5, color: k.ink, align: 'center', tracking: 0.14 })
      ctx.restore()
    }
    // a second hint once the film is thin and black: it can be burst
    if (!userPop && popT < 0 && T > 33 && T < 39.6 && !touched && !tiny) {
      const a = smoothstep(33, 34, T) * (1 - smoothstep(38.8, 39.6, T))
      plate('TAP TO BURST', cx, ly - R * 0.62, { size: 9, color: k.ink2, align: 'center', tracking: 0.14, alpha: a })
    }
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
        ctx.rect(capX - 4, y - capSize * 1.02, capW + 60, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: k.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: ACC })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, age: number) {
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    const fs = tiny ? 8.5 : 10
    if (!preview) env.setCursor(hoverRuler || scrubbing ? 'pointer' : ptr.over && overFilm(ptr.x, ptr.y) ? (ptr.down ? 'grabbing' : 'crosshair') : 'default')
    text(ctx, `${FIG} — Soap film`, pad, pad + 10, { size: tiny ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
    if (!tiny || h > 260) text(ctx, `${c.num} — ${c.name}`, capX, capY - (tiny ? 2 : 6), { size: tiny ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true, alpha: kIn })
    // readouts
    const filmGone = popT >= 0 && T > popT + 0.6
    const rows2: [string, string][] = []
    if (T < BORN || filmGone) rows2.push(['film', filmGone ? 'burst' : 'drawing'], ['n', '1.33'])
    else {
      const top = hOf(zAt(0.5, 0.06))
      rows2.push(['age', `${age.toFixed(1)} s`], ['top', top < BLACK ? 'black' : `${Math.round(top)} nm`], ['bottom', `${Math.round(hOf(zAt(0.5, 0.94)))} nm`])
    }
    if ((tiny || (short && !sideCap) || w < 420) && rows2.length > 2) rows2.length = 2
    let y = pad + 10
    for (const [label, value] of rows2) {
      setFont(ctx, { size: fs, tracking: 0.06 })
      text(ctx, value, w - pad, y, { size: fs, color: k.ink, align: 'right', tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, label, w - pad - vw - 10, y, { size: fs - 1, color: k.muted, align: 'right', tracking: 0.14, upper: true })
      y += tiny ? 13 : 16
    }
    if (rulerOn) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY()
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 52; i++) {
        const x = lerp(x0, x1, i / 52)
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

  function overFilm(x: number, y: number) {
    const dx = (x - cx) / R
    const dy = (y - ly) / R
    return dx * dx + dy * dy < 1 && y < surfY
  }

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      ptr.touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        ptr.over = false
        ptr.down = false
        hoverRuler = false
        hoverX = -1
        scrubbing = false
        return
      }
      ptr.over = true
      if (scrubbing) {
        hoverX = p.x
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      hoverRuler = onRuler(p.x, p.y)
      hoverX = hoverRuler ? p.x : -1
      const now = performance.now()
      if (p.type === 'down') {
        if (hoverRuler) {
          scrubbing = true
          seekTo(p.x)
          return
        }
        ptr.down = true
        ptr.sx = p.x
        ptr.sy = p.y
        ptr.ms = now
        ptr.moved = 0
        ptr.lx = p.x
        ptr.ly = p.y
        ptr.vx = 0
        ptr.vy = 0
        if (overFilm(p.x, p.y)) touched = true
      } else if (p.type === 'move') {
        if (ptr.down) {
          const dx = p.x - ptr.lx
          const dy = p.y - ptr.ly
          ptr.moved += Math.hypot(dx, dy)
          const dts = Math.max(1 / 240, (now - ptr.ms) / 1000)
          ptr.vx = lerp(ptr.vx, dx / Math.max(1 / 120, dts), 0.5)
          ptr.vy = lerp(ptr.vy, dy / Math.max(1 / 120, dts), 0.5)
          ptr.ms = now
        }
        ptr.lx = p.x
        ptr.ly = p.y
      } else if (p.type === 'up') {
        const tap = ptr.down && ptr.moved < (ptr.touch ? 14 : 8) && overFilm(p.x, p.y)
        ptr.down = false
        const T = curT()
        if (tap && popT < 0 && T > BORN + 0.5 && T < POP_T) {
          touched = true
          startPop(T, Math.max(0, T - BORN), toU(p.x), toV(p.y), true)
          // once this burst has run its course, rejoin the loop after the automatic one
          jumpPending = T + 1.6
        }
      }
      ptr.x = p.x
      ptr.y = p.y
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
  }
}

export default create
