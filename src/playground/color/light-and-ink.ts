/*
 * C.04 — LIGHT AND INK
 *
 * Two halves of one plate. On the night half, three lights — the sRGB
 * primaries — are added: where two overlap you see cyan, magenta and yellow,
 * where all three do, white (canvas 'lighter' is exactly this sum). On the
 * paper half, three inks — cyan, magenta, yellow — take light away: each is a
 * filter, its colour derived here from an absorbance spectrum by the Beer–
 * Lambert law (R = 10^−A, integrated under daylight against the CIE 1931
 * observer); overlapping, they multiply (canvas 'multiply'), to blue, green
 * and red, and to a near-black where all three meet — which is why printers
 * add a fourth, black, ink: K.
 *
 * The inks are not flat: they are halftone screens, dots at the classic
 * angles (C 15°, M 75°, Y 0°, K 45°), whose overlap makes the rosette. A
 * loupe magnifies whatever is under it — the dots on paper, or, on the night
 * half, the red, green and blue subpixels any screen is made of.
 *
 *   the lights arrive → they mix → the inks arrive → they mix (and K) →
 *   one picture shown as light (a subpixel screen, scanned in) and as print
 *   (progressive proofs, Y M C K) → again
 *
 * Drag any light or ink disc; drag the loupe across the halftone.
 */

import { C, TAU, clamp, cropMarks, ease, lerp, mod, regMark, rgba, setFont, smoothstep, text } from '../kit'
import { cmf, planck, toSrgb, toLinear, xyzToLinear, type Rgb } from '../color'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. C.04'
const NIGHT_INK = '#EEF4F1'
const DEG = Math.PI / 180

/* ------------------------------------------------------------- the inks */

const sig = (x: number) => 1 / (1 + Math.exp(-x))
const gau = (l: number, c: number, wd: number) => Math.exp(-0.5 * ((l - c) / wd) ** 2)
/** absorbance (optical density, light passing in and out) of a solid film of each process ink */
const ABS: Record<'c' | 'm' | 'y' | 'k', (l: number) => number> = {
  c: (l) => 1.5 * sig((l - 590) / 16) + 0.25 * gau(l, 540, 38) + 0.04,
  m: (l) => 1.5 * Math.exp(-0.5 * ((l - 545) / (l < 545 ? 44 : 24)) ** 2) + 0.4 * gau(l, 450, 32) + 0.02,
  y: (l) => 1.55 * sig((485 - l) / 12) + 0.06 * gau(l, 530, 30) + 0.03,
  k: () => 1.6,
}
type InkKey = keyof typeof ABS
const PAPER = toLinear([0xf3 / 255, 0xf6 / 255, 0xf2 / 255])
/** Beer–Lambert: the colour of ink layers on paper under daylight (≈ 6504 K), relative to bare paper. */
function inkColour(inks: InkKey[]): Rgb {
  let X = 0
  let Y = 0
  let Z = 0
  let X0 = 0
  let Y0 = 0
  let Z0 = 0
  for (let nm = 380; nm <= 730; nm += 5) {
    const E = planck(nm, 6504)
    let a = 0
    for (const k of inks) a += ABS[k](nm)
    const R = Math.pow(10, -a)
    const c = cmf(nm)
    X += E * R * c[0]
    Y += E * R * c[1]
    Z += E * R * c[2]
    X0 += E * c[0]
    Y0 += E * c[1]
    Z0 += E * c[2]
  }
  const l = xyzToLinear([X, Y, Z])
  const p = xyzToLinear([X0, Y0, Z0])
  return toSrgb([Math.max(0, l[0] / p[0]) * PAPER[0], Math.max(0, l[1] / p[1]) * PAPER[1], Math.max(0, l[2] / p[2]) * PAPER[2]])
}
const INK: Record<InkKey, Rgb> = { c: inkColour(['c']), m: inkColour(['m']), y: inkColour(['y']), k: inkColour(['k']) }
const css = (c: Rgb, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`
const PAPER_S = toSrgb(PAPER)
/** what the plate shows where inks overlap: the filters multiply, channel by channel */
const over = (...inks: InkKey[]): Rgb => {
  const out: Rgb = [PAPER_S[0], PAPER_S[1], PAPER_S[2]]
  for (const k of inks) for (let i = 0; i < 3; i++) out[i] *= INK[k][i] / PAPER_S[i]
  return out
}
/** screen angles, degrees */
const ANGLE: Record<InkKey, number> = { c: 15, m: 75, y: 0, k: 45 }
const INK_NAME: Record<InkKey, string> = { c: 'Cyan', m: 'Magenta', y: 'Yellow', k: 'Key (black)' }
/** the black disc is smaller: it is there to make a point, not a fourth Venn circle */
const K_SCALE = 0.62

/* ------------------------------------------------------------ the lights */

type LightKey = 'r' | 'g' | 'b'
const LIGHT: Record<LightKey, Rgb> = { r: [1, 0, 0], g: [0, 1, 0], b: [0, 0, 1] }
/** sRGB primaries' CIE xy, and roughly their dominant wavelengths */
const LIGHT_XY: Record<LightKey, string> = { r: 'x .640 y .330', g: 'x .300 y .600', b: 'x .150 y .060' }
/** a chord of light: each primary's dominant frequency, forty octaves down */
const LIGHT_HZ: Record<LightKey, number> = { r: 446, g: 497, b: 588 }

/** CIE xy of a linear-sRGB colour */
function xyOf(r: number, g: number, b: number): [number, number] {
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
  const S = X + Y + Z || 1
  return [X / S, Y / S]
}
/** the spectral locus, 380–700 nm */
const LOCUS: [number, number, number][] = []
for (let nm = 380; nm <= 700; nm += 5) {
  const c = cmf(nm)
  const S = c[0] + c[1] + c[2] || 1
  LOCUS.push([nm, c[0] / S, c[1] / S])
}

/* ------------------------------------------------------------- timeline */

const LOOP = 50
const T_LIGHT: Record<LightKey, number> = { r: 0.8, g: 2.0, b: 3.2 }
const T_INK: Record<InkKey, number> = { c: 5.0, m: 6.2, y: 7.4, k: 12.6 }
const L_GLIDE = [4.4, 6.8]
const I_GLIDE = [8.8, 11.2]
const DISCS_OUT = [20.6, 23]
const SCREEN_IN = [23.8, 26.4]
const PLATES: [InkKey, number][] = [
  ['y', 28.6],
  ['m', 30.0],
  ['c', 31.4],
  ['k', 32.8],
]
const IMAGES_OUT = [45.6, 48.4]
const LOUPE_IN = [13.4, 14.2]
const STOPS = [0, 5, 23.8, 28.6]

interface Caption {
  t0: number
  t1: number
  half: 0 | 1
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 5.6, t1: 21, half: 0, lines: [{ s: 'Light ', em: 'adds.' }] },
  { t0: 10.4, t1: 21, half: 1, lines: [{ s: 'Ink ', em: 'takes away.' }] },
  { t0: 25.2, t1: 46.4, half: 0, lines: [{ s: 'Every screen is' }, { s: '', em: 'three colors.' }] },
  { t0: 33.4, t1: 46.4, half: 1, lines: [{ s: 'Every print' }, { s: 'is ', em: 'four.' }] },
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  /* ---------------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let stacked = false
  let tiny = false
  let short = false
  let pad = 16
  const L: Rect = { x: 0, y: 0, w: 1, h: 1 }
  const P: Rect = { x: 0, y: 0, w: 1, h: 1 }
  let R = 60
  let capSize = 24
  let cell = 5
  let pitch = 4
  let imgS = 200
  let loupeR = 70
  const MAG = 4

  function layout() {
    w = env.width
    h = env.height
    stacked = h > w * 1.05
    short = h < 380
    tiny = Math.min(w, h) < 300 || (stacked ? h < 600 : w < 520)
    pad = Math.round(clamp(Math.min(w, h) * 0.04, 10, 30))
    if (stacked) {
      Object.assign(L, { x: 0, y: 0, w, h: Math.round(h / 2) })
      Object.assign(P, { x: 0, y: Math.round(h / 2), w, h: h - Math.round(h / 2) })
    } else {
      Object.assign(L, { x: 0, y: 0, w: Math.round(w / 2), h })
      Object.assign(P, { x: Math.round(w / 2), y: 0, w: w - Math.round(w / 2), h })
    }
    R = Math.min(L.w * (stacked ? 0.17 : short ? 0.18 : 0.19), L.h * (short ? 0.2 : stacked ? 0.19 : 0.2))
    capSize = clamp(Math.min(L.w * 0.07, L.h * 0.075), short ? 13 : 16, 40)
    cell = clamp(Math.round(Math.min(w, h) / 140), 3.2, 6.5)
    pitch = 3
    imgS = Math.floor(Math.min(L.w * (stacked ? 0.5 : 0.56), L.h * (short ? 0.5 : stacked ? 0.46 : 0.52)) / pitch) * pitch
    loupeR = clamp(Math.min(w, h) * 0.11, 38, 104)
    buildSprites()
    buildImage()
  }

  /** Venn centres for the night half (lights) and the paper half (inks). */
  const venn = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h * (short ? 0.44 : stacked ? 0.47 : 0.46) })
  const LIGHT_ANG: Record<LightKey, number> = { r: -90, g: 30, b: 150 }
  const INK_ANG: Record<'c' | 'm' | 'y', number> = { c: -90, m: 150, y: 30 }
  const user: Record<string, { x: number; y: number }> = {}
  const off = (k: string) => user[k] ?? { x: 0, y: 0 }

  function lightPos(k: LightKey, T: number) {
    const c = venn(L)
    const g = ease.inOutCubic(clamp((T - L_GLIDE[0]) / (L_GLIDE[1] - L_GLIDE[0])))
    const d = lerp(R * 1.32, R * 0.6, g)
    const a = LIGHT_ANG[k] * DEG + (1 - g) * 0.12
    const o = off(k)
    return { x: c.x + Math.cos(a) * d + o.x, y: c.y + Math.sin(a) * d * (stacked ? 0.92 : 1) + o.y }
  }
  function inkPos(k: InkKey, T: number) {
    const c = venn(P)
    const o = off(k)
    if (k === 'k') return { x: c.x + R * (stacked || short ? 1.42 : 1.3) + o.x, y: c.y + R * (stacked ? 0.55 : short ? 0.15 : 0.95) + o.y }
    const g = ease.inOutCubic(clamp((T - I_GLIDE[0]) / (I_GLIDE[1] - I_GLIDE[0])))
    const d = lerp(R * 1.32, R * 0.6, g)
    const a = INK_ANG[k] * DEG - (1 - g) * 0.12
    return { x: c.x + Math.cos(a) * d + o.x, y: c.y + Math.sin(a) * d * (stacked ? 0.92 : 1) + o.y }
  }

  /* -------------------------------------------------------- halftone sprites */
  /** coverage → dot radius (round dots that touch at 78.5 %, then close the gaps) */
  const dotR = (a: number, c: number) => (a <= 0.785 ? c * Math.sqrt(a / Math.PI) : c * (0.5 + ((a - 0.785) / 0.215) * 0.2071))
  /** a disc of ink: solid toward the middle, the dots shrinking to nothing at the rim */
  const discTone = (rho: number) => (rho >= 1 ? 0 : rho < 0.58 ? 0.84 : 0.84 * (0.5 + 0.5 * Math.cos(((rho - 0.58) / 0.42) * Math.PI)))
  const sprites: Partial<Record<InkKey, HTMLCanvasElement>> = {}
  let spriteDpr = 1

  /** Visit every halftone cell of a screen (angle a, cell c) whose centre lies within (qx, qy, qr) of a grid anchored at (ox, oy). */
  function cells(a: number, c: number, ox: number, oy: number, qx: number, qy: number, qr: number, fn: (x: number, y: number) => void) {
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const dx = qx - ox
    const dy = qy - oy
    // the query center in grid units
    const u0 = (dx * ca + dy * sa) / c
    const v0 = (-dx * sa + dy * ca) / c
    const n = Math.ceil(qr / c) + 1
    for (let i = Math.floor(u0 - n); i <= Math.ceil(u0 + n); i++) {
      for (let j = Math.floor(v0 - n); j <= Math.ceil(v0 + n); j++) {
        const x = ox + (i * ca - j * sa) * c
        const y = oy + (i * sa + j * ca) * c
        if ((x - qx) ** 2 + (y - qy) ** 2 > qr * qr) continue
        fn(x, y)
      }
    }
  }

  function buildSprites() {
    if (typeof document === 'undefined') return
    spriteDpr = Math.min(2, env.dpr || 1)
    for (const k of ['c', 'm', 'y', 'k'] as InkKey[]) {
      const rr = k === 'k' ? R * K_SCALE : R
      const size = Math.ceil((rr * 2 + cell * 2) * spriteDpr)
      const cv = sprites[k] ?? document.createElement('canvas')
      cv.width = size
      cv.height = size
      const g = cv.getContext('2d')
      if (!g) continue
      g.setTransform(spriteDpr, 0, 0, spriteDpr, 0, 0)
      g.clearRect(0, 0, size, size)
      const o = size / spriteDpr / 2
      const p = new Path2D()
      cells(ANGLE[k] * DEG, cell, o, o, o, o, rr, (x, y) => {
        const a = discTone(Math.hypot(x - o, y - o) / rr)
        if (a <= 0.01) return
        const r = dotR(a, cell)
        p.moveTo(x + r, y)
        p.arc(x, y, r, 0, TAU)
      })
      g.fillStyle = css(INK[k])
      g.fill(p)
      sprites[k] = cv
    }
  }

  /* ----------------------------------------------------------- the picture */
  // One small illustration, an apple with a leaf, drawn procedurally and sampled two ways.
  let nPix = 40
  let pic: Uint8ClampedArray | null = null
  let screenImg: HTMLCanvasElement | null = null
  /** the same picture unstriped: what an eye at arm's length integrates the stripes into */
  let softImg: HTMLCanvasElement | null = null
  const plateCv: Partial<Record<InkKey, HTMLCanvasElement>> = {}
  let sepC = new Float32Array(1)
  let sepM = new Float32Array(1)
  let sepY = new Float32Array(1)
  let sepK = new Float32Array(1)

  function drawApple(g: CanvasRenderingContext2D, s: number) {
    g.save()
    g.scale(s, s)
    // a soft shadow
    g.save()
    g.translate(0.5, 0.93)
    g.scale(1, 0.13)
    const sh = g.createRadialGradient(0, 0, 0, 0, 0, 0.36)
    sh.addColorStop(0, 'rgba(30,36,40,0.45)')
    sh.addColorStop(1, 'rgba(30,36,40,0)')
    g.fillStyle = sh
    g.beginPath()
    g.arc(0, 0, 0.36, 0, TAU)
    g.fill()
    g.restore()
    // the body
    const body = new Path2D()
    body.moveTo(0.5, 0.3)
    body.bezierCurveTo(0.38, 0.19, 0.11, 0.21, 0.11, 0.49)
    body.bezierCurveTo(0.11, 0.74, 0.29, 0.93, 0.42, 0.91)
    body.bezierCurveTo(0.47, 0.9, 0.53, 0.9, 0.58, 0.91)
    body.bezierCurveTo(0.71, 0.93, 0.89, 0.74, 0.89, 0.49)
    body.bezierCurveTo(0.89, 0.21, 0.62, 0.19, 0.5, 0.3)
    const rg = g.createRadialGradient(0.36, 0.42, 0.02, 0.45, 0.52, 0.52)
    rg.addColorStop(0, '#ff7a55')
    rg.addColorStop(0.35, '#e8312c')
    rg.addColorStop(0.75, '#a5121f')
    rg.addColorStop(1, '#5e0a17')
    g.fillStyle = rg
    g.fill(body)
    g.save()
    g.clip(body)
    const blush = g.createRadialGradient(0.74, 0.66, 0, 0.74, 0.66, 0.3)
    blush.addColorStop(0, 'rgba(250,196,60,0.75)')
    blush.addColorStop(1, 'rgba(250,196,60,0)')
    g.fillStyle = blush
    g.fillRect(0, 0, 1, 1)
    const hl = g.createRadialGradient(0.33, 0.39, 0, 0.33, 0.39, 0.1)
    hl.addColorStop(0, 'rgba(255,255,255,0.9)')
    hl.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = hl
    g.fillRect(0, 0, 1, 1)
    g.restore()
    // stem and leaf
    g.strokeStyle = '#5b3a1e'
    g.lineWidth = 0.028
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(0.5, 0.3)
    g.quadraticCurveTo(0.49, 0.18, 0.55, 0.09)
    g.stroke()
    const leaf = new Path2D()
    leaf.moveTo(0.53, 0.17)
    leaf.bezierCurveTo(0.6, 0.04, 0.75, 0.04, 0.84, 0.08)
    leaf.bezierCurveTo(0.76, 0.18, 0.62, 0.22, 0.53, 0.17)
    const lg = g.createLinearGradient(0.53, 0.17, 0.84, 0.08)
    lg.addColorStop(0, '#2f7a2a')
    lg.addColorStop(1, '#8fca46')
    g.fillStyle = lg
    g.fill(leaf)
    g.strokeStyle = 'rgba(220,240,170,0.8)'
    g.lineWidth = 0.008
    g.beginPath()
    g.moveTo(0.55, 0.165)
    g.quadraticCurveTo(0.68, 0.11, 0.82, 0.085)
    g.stroke()
    g.restore()
  }

  function buildImage() {
    if (typeof document === 'undefined') return
    nPix = Math.max(16, Math.round(imgS / pitch))
    const src = document.createElement('canvas')
    src.width = nPix
    src.height = nPix
    const g = src.getContext('2d')
    if (!g) return
    drawApple(g, nPix)
    pic = g.getImageData(0, 0, nPix, nPix).data
    softImg = softImg ?? document.createElement('canvas')
    softImg.width = nPix
    softImg.height = nPix
    const so = softImg.getContext('2d')
    if (so) {
      so.fillStyle = '#000'
      so.fillRect(0, 0, nPix, nPix)
      so.drawImage(src, 0, 0)
    }
    // as light: each pixel three stripes, red, green, blue, with a thin dark row between pixels (3 × 4 source pixels)
    screenImg = screenImg ?? document.createElement('canvas')
    screenImg.width = nPix * 3
    screenImg.height = nPix * 4
    const sg = screenImg.getContext('2d')
    if (sg) {
      const id = sg.createImageData(nPix * 3, nPix * 4)
      const d = id.data
      for (let j = 0; j < nPix; j++) {
        for (let i = 0; i < nPix; i++) {
          const o = (j * nPix + i) * 4
          const al = pic[o + 3] / 255
          for (let yy = 0; yy < 4; yy++) {
            for (let c = 0; c < 3; c++) {
              const q = ((j * 4 + yy) * nPix * 3 + i * 3 + c) * 4
              const v = yy === 3 ? 0 : pic[o + c] * al
              d[q] = c === 0 ? v : 0
              d[q + 1] = c === 1 ? v : 0
              d[q + 2] = c === 2 ? v : 0
              d[q + 3] = 255
            }
          }
        }
      }
      sg.putImageData(id, 0, 0)
    }
    // as print: separations with gray-component replacement (most of the gray goes to K)
    sepC = new Float32Array(nPix * nPix)
    sepM = new Float32Array(nPix * nPix)
    sepY = new Float32Array(nPix * nPix)
    sepK = new Float32Array(nPix * nPix)
    for (let q = 0; q < nPix * nPix; q++) {
      const al = pic[q * 4 + 3] / 255
      const r = 1 - al + (al * pic[q * 4]) / 255
      const gg = 1 - al + (al * pic[q * 4 + 1]) / 255
      const b = 1 - al + (al * pic[q * 4 + 2]) / 255
      const K = 1 - Math.max(r, gg, b)
      const k = K * 0.75
      sepK[q] = k
      sepC[q] = clamp((1 - r - k) / (1 - k))
      sepM[q] = clamp((1 - gg - k) / (1 - k))
      sepY[q] = clamp((1 - b - k) / (1 - k))
    }
    // each plate as its own film of dots
    const dpr = Math.min(2, env.dpr || 1)
    const ic = cell * 0.9
    for (const k of ['c', 'm', 'y', 'k'] as InkKey[]) {
      const cv = plateCv[k] ?? document.createElement('canvas')
      cv.width = Math.ceil((imgS + 4) * dpr)
      cv.height = Math.ceil((imgS + 4) * dpr)
      const pg = cv.getContext('2d')
      if (!pg) continue
      pg.setTransform(dpr, 0, 0, dpr, 0, 0)
      pg.clearRect(0, 0, imgS + 4, imgS + 4)
      const p = new Path2D()
      const half = imgS / 2
      cells(ANGLE[k] * DEG, ic, 2 + half, 2 + half, 2 + half, 2 + half, half * 1.45, (x, y) => {
        if (x < 2 || y < 2 || x > imgS + 2 || y > imgS + 2) return
        const a = sepAt(k, x - 2, y - 2)
        if (a <= 0.02) return
        const r = dotR(a, ic)
        p.moveTo(x + r, y)
        p.arc(x, y, r, 0, TAU)
      })
      pg.fillStyle = css(INK[k])
      pg.fill(p)
      plateCv[k] = cv
    }
  }
  /** separation value of a plate at image-local CSS px (bilinear) */
  function sepAt(k: InkKey, x: number, y: number) {
    const s = k === 'c' ? sepC : k === 'm' ? sepM : k === 'y' ? sepY : sepK
    const fx = clamp((x / imgS) * nPix - 0.5, 0, nPix - 1.001)
    const fy = clamp((y / imgS) * nPix - 0.5, 0, nPix - 1.001)
    const i = fx | 0
    const j = fy | 0
    const a = fx - i
    const b = fy - j
    const o = j * nPix + i
    return (s[o] * (1 - a) + s[o + 1] * a) * (1 - b) + (s[o + nPix] * (1 - a) + s[o + nPix + 1] * a) * b
  }
  const imgPos = (r: Rect) => {
    const c = venn(r)
    const cy = stacked ? r.y + r.h * 0.44 : c.y + imgS * 0.02
    return { x: Math.round(c.x - imgS / 2), y: Math.round(cy - imgS / 2) }
  }

  /* --------------------------------------------------------------- state */
  const at = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(at) ? at : preview ? 12 : 0
  let prevT = -1
  let curT = 0
  let drag: { key: string; dx: number; dy: number } | null = null
  let hover = ''
  let touchedDisc = false
  let touchedLoupe = false
  let loupeUser: { x: number; y: number } | null = null
  let px = -1
  let py = -1
  let ptrTouch = false

  /* ------------------------------------------------------------- drawing */
  /** light from the pools at a point (sum of the primaries, each with a soft edge) */
  function lightAt(x: number, y: number, T: number, out: Rgb) {
    out[0] = out[1] = out[2] = 0
    for (const k of ['r', 'g', 'b'] as LightKey[]) {
      const a = lightAlpha(k, T)
      if (a <= 0) continue
      const p = lightPos(k, T)
      const d = Math.hypot(x - p.x, y - p.y) / R
      const f = d < 0.84 ? 1 : d > 1 ? 0 : (1 - d) / 0.16
      for (let c = 0; c < 3; c++) out[c] += LIGHT[k][c] * f * a
    }
    return out
  }
  const lightAlpha = (k: LightKey, T: number) => smoothstep(T_LIGHT[k] + 0.3, T_LIGHT[k] + 1.1, T) * (1 - smoothstep(DISCS_OUT[0], DISCS_OUT[1], T))
  const inkReveal = (k: InkKey, T: number) => clamp((T - T_INK[k]) / 0.75)
  const inkFade = (T: number) => 1 - smoothstep(DISCS_OUT[0], DISCS_OUT[1], T)
  const screenAlpha = (T: number) => (T < SCREEN_IN[0] ? 0 : 1 - smoothstep(IMAGES_OUT[0], IMAGES_OUT[1], T))
  const plateReveal = (k: InkKey, T: number) => {
    const t0 = PLATES.find((p) => p[0] === k)?.[1] ?? 99
    return clamp((T - t0) / 0.9)
  }

  function drawNight(T: number) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(L.x, L.y, L.w, L.h)
    ctx.clip()
    // the dark room
    const g = ctx.createRadialGradient(L.x + L.w * 0.5, L.y + L.h * 0.45, 0, L.x + L.w * 0.5, L.y + L.h * 0.45, Math.max(L.w, L.h) * 0.75)
    g.addColorStop(0, '#0f2a30')
    g.addColorStop(1, C.night)
    ctx.fillStyle = g
    ctx.fillRect(L.x, L.y, L.w, L.h)
    const ink = NIGHT_INK
    // the lights: lamps above, beams, pools that add
    for (const k of ['r', 'g', 'b'] as LightKey[]) {
      const a = lightAlpha(k, T)
      const beam = clamp((T - T_LIGHT[k]) / 0.7) * (1 - smoothstep(DISCS_OUT[0], DISCS_OUT[1], T))
      if (beam <= 0) continue
      const p = lightPos(k, T)
      const lx = L.x + L.w * (k === 'r' ? 0.5 : k === 'g' ? 0.64 : 0.36)
      const ly = L.y + pad + (tiny ? 22 : 34)
      // the beam: two hairlines tangent to the pool, drawn on from the lamp
      const dx = p.x - lx
      const dy = p.y - ly
      const dl = Math.hypot(dx, dy) || 1
      const nx = -dy / dl
      const ny = dx / dl
      const e = ease.outCubic(beam)
      ctx.strokeStyle = css(LIGHT[k], (0.28 - 0.16 * smoothstep(L_GLIDE[0], L_GLIDE[1], T)) * beam)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const s of [-1, 1]) {
        ctx.moveTo(lx, ly)
        ctx.lineTo(lerp(lx, p.x + nx * R * s, e), lerp(ly, p.y + ny * R * s, e))
      }
      ctx.stroke()
      // the lamp
      ctx.strokeStyle = css(LIGHT[k], 0.85 * beam)
      ctx.save()
      ctx.translate(lx, ly)
      ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(-5, -9)
      ctx.lineTo(5, -9)
      ctx.lineTo(7, 0)
      ctx.lineTo(-7, 0)
      ctx.closePath()
      ctx.moveTo(-3, -9)
      ctx.lineTo(-3, -13)
      ctx.moveTo(3, -9)
      ctx.lineTo(3, -13)
      ctx.stroke()
      ctx.restore()
      if (a > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
        pg.addColorStop(0, css(LIGHT[k], a))
        pg.addColorStop(0.84, css(LIGHT[k], a))
        pg.addColorStop(1, css(LIGHT[k], 0))
        ctx.fillStyle = pg
        ctx.beginPath()
        ctx.arc(p.x, p.y, R, 0, TAU)
        ctx.fill()
        ctx.restore()
        // a hairline at the pool's edge, and its name
        ctx.strokeStyle = css(LIGHT[k], 0.5 * a)
        ctx.beginPath()
        ctx.arc(p.x, p.y, R + 3, 0, TAU)
        ctx.stroke()
        if (!tiny) {
          const ang = LIGHT_ANG[k] * DEG
          const lx2 = p.x + Math.cos(ang) * (R + 14)
          const ly2 = p.y + Math.sin(ang) * (R + 14) + (k === 'r' ? 0 : 6)
          if (ly2 < L.y + pad + 40) continue
          text(ctx, k.toUpperCase(), lx2, ly2, { size: 10, color: css(LIGHT[k], 0.95 * a), align: 'center', tracking: 0.1 })
          if (!short) text(ctx, LIGHT_XY[k].toUpperCase(), lx2, ly2 + 11, { size: 7.5, color: rgba(ink, 0.45 * a), align: 'center', tracking: 0.1 })
        }
      }
    }
    // what the sums make
    const lab = smoothstep(L_GLIDE[1] - 0.4, L_GLIDE[1] + 0.6, T) * (1 - smoothstep(DISCS_OUT[0] - 1, DISCS_OUT[0], T))
    if (lab > 0.01 && !drag) {
      const pr = lightPos('r', T)
      const pg2 = lightPos('g', T)
      const pb = lightPos('b', T)
      const c = { x: (pr.x + pg2.x + pb.x) / 3, y: (pr.y + pg2.y + pb.y) / 3 }
      const pair = (p1: { x: number; y: number }, p2: { x: number; y: number }, s: string) => {
        const mx = (p1.x + p2.x) / 2
        const my = (p1.y + p2.y) / 2
        text(ctx, s, mx + (mx - c.x) * 0.95, my + (my - c.y) * 0.95 + 3, { size: 10, color: `rgba(10,20,24,${0.85 * lab})`, align: 'center', tracking: 0.08 })
      }
      pair(pr, pg2, 'Y')
      pair(pg2, pb, 'C')
      pair(pr, pb, 'M')
      text(ctx, 'W', c.x, c.y + 3, { size: 10, color: `rgba(10,20,24,${0.85 * lab})`, align: 'center', tracking: 0.08 })
      if (!tiny && !short && L.h >= 400) text(ctx, 'R + G = Y   G + B = C   B + R = M   R + G + B = W', L.x + L.w / 2, Math.min(L.y + L.h - pad - capSize * 1.6 - 18, venn(L).y + R * 1.95), { size: 8.5, color: rgba(ink, 0.6 * lab), align: 'center', tracking: 0.1 })
    }
    // the screen: the picture scanned in, three stripes to a pixel
    const sa = screenAlpha(T)
    if (sa > 0 && screenImg) {
      const ip = imgPos(L)
      const scan = clamp((T - SCREEN_IN[0]) / (SCREEN_IN[1] - SCREEN_IN[0]))
      const rows = Math.floor(scan * nPix)
      ctx.save()
      ctx.globalAlpha = sa
      ctx.imageSmoothingEnabled = false
      ctx.beginPath()
      ctx.rect(ip.x, ip.y, imgS, rows * pitch)
      ctx.clip()
      ctx.drawImage(screenImg, ip.x, ip.y, imgS, imgS)
      if (softImg) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = sa * 0.38
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(softImg, ip.x, ip.y, imgS, imgS)
      }
      ctx.restore()
      if (scan > 0 && scan < 1) {
        ctx.strokeStyle = rgba(ink, 0.6)
        ctx.beginPath()
        ctx.moveTo(ip.x - 8, ip.y + rows * pitch + 0.5)
        ctx.lineTo(ip.x + imgS + 8, ip.y + rows * pitch + 0.5)
        ctx.stroke()
      }
      // the bezel, and the pixel pitch
      ctx.globalAlpha = sa
      ctx.strokeStyle = rgba(ink, 0.35)
      ctx.strokeRect(ip.x - 6.5, ip.y - 6.5, imgS + 13, imgS + 13)
      if (!tiny) {
        text(ctx, `${nPix} × ${nPix} PIXELS · R G B STRIPES`, ip.x - 6, ip.y + imgS + 20, { size: 8.5, color: rgba(ink, 0.55), tracking: 0.12 })
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  function drawPaper(T: number) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(P.x, P.y, P.w, P.h)
    ctx.clip()
    ctx.fillStyle = C.paper
    ctx.fillRect(P.x, P.y, P.w, P.h)
    const fade = inkFade(T)
    // the inks: films of dots, multiplied onto the paper
    ctx.globalCompositeOperation = 'multiply'
    for (const k of ['c', 'm', 'y', 'k'] as InkKey[]) {
      const rv = inkReveal(k, T)
      const sp = sprites[k]
      if (rv <= 0 || fade <= 0 || !sp) continue
      const p = inkPos(k, T)
      const s = sp.width / spriteDpr
      ctx.save()
      ctx.globalAlpha = fade
      ctx.beginPath()
      // printed by a roller: revealed top to bottom
      ctx.rect(p.x - s / 2, p.y - s / 2, s, s * ease.inOutSine(rv))
      ctx.clip()
      ctx.drawImage(sp, p.x - s / 2, p.y - s / 2, s, s)
      ctx.restore()
    }
    // the print: progressive proofs, plate by plate
    const ip = imgPos(P)
    const ia = 1 - smoothstep(IMAGES_OUT[0], IMAGES_OUT[1], T)
    for (const [k] of PLATES) {
      const rv = plateReveal(k, T)
      const cv = plateCv[k]
      if (rv <= 0 || ia <= 0 || !cv) continue
      ctx.save()
      ctx.globalAlpha = ia
      ctx.beginPath()
      ctx.rect(ip.x - 2, ip.y - 2, (imgS + 4) * ease.inOutSine(rv), imgS + 4)
      ctx.clip()
      ctx.drawImage(cv, ip.x - 2, ip.y - 2, imgS + 4, imgS + 4)
      ctx.restore()
    }
    ctx.globalCompositeOperation = 'source-over'
    // roller lines while a plate or disc is being laid down
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.lineWidth = 1
    for (const k of ['c', 'm', 'y', 'k'] as InkKey[]) {
      const rv = inkReveal(k, T)
      if (rv <= 0 || rv >= 1) continue
      const p = inkPos(k, T)
      const rr = k === 'k' ? R * K_SCALE : R
      const y = p.y - rr + rr * 2 * ease.inOutSine(rv)
      ctx.beginPath()
      ctx.moveTo(p.x - rr - 10, y)
      ctx.lineTo(p.x + rr + 10, y)
      ctx.stroke()
    }
    for (const [k] of PLATES) {
      const rv = plateReveal(k, T)
      if (rv <= 0 || rv >= 1 || ia <= 0) continue
      const x = ip.x + imgS * ease.inOutSine(rv)
      ctx.beginPath()
      ctx.moveTo(x, ip.y - 10)
      ctx.lineTo(x, ip.y + imgS + 10)
      ctx.stroke()
    }
    // labels: the inks, what the overlaps make, and K
    const ink = C.ink
    for (const k of ['c', 'm', 'y'] as const) {
      const a = inkReveal(k, T) * fade
      if (a <= 0 || tiny) continue
      const p = inkPos(k, T)
      const ang = INK_ANG[k] * DEG
      const lx = p.x + Math.cos(ang) * (R + 14)
      const ly = p.y + Math.sin(ang) * (R + 14) + (k === 'c' ? 0 : 6)
      text(ctx, k.toUpperCase(), lx, ly, { size: 10, color: rgba(ink, 0.9 * a), align: 'center', tracking: 0.1 })
      if (!short) text(ctx, `${ANGLE[k]}°`, lx, ly + 11, { size: 7.5, color: rgba(ink, 0.5 * a), align: 'center', tracking: 0.1 })
    }
    const lab = smoothstep(I_GLIDE[1] - 0.4, I_GLIDE[1] + 0.6, T) * (1 - smoothstep(DISCS_OUT[0] - 1, DISCS_OUT[0], T))
    if (lab > 0.01 && !drag) {
      const pc = inkPos('c', T)
      const pm = inkPos('m', T)
      const py2 = inkPos('y', T)
      const c = { x: (pc.x + pm.x + py2.x) / 3, y: (pc.y + pm.y + py2.y) / 3 }
      const pair = (p1: { x: number; y: number }, p2: { x: number; y: number }, s: string) => {
        const mx = (p1.x + p2.x) / 2
        const my = (p1.y + p2.y) / 2
        text(ctx, s, mx + (mx - c.x) * 0.95, my + (my - c.y) * 0.95 + 3, { size: 10, color: `rgba(243,246,242,${0.95 * lab})`, align: 'center', tracking: 0.08 })
      }
      pair(pc, pm, 'B')
      pair(pc, py2, 'G')
      pair(pm, py2, 'R')
      if (!tiny && !short && P.h >= 400) text(ctx, 'C × M = B   C × Y = G   M × Y = R   C × M × Y ≈ BLACK', P.x + P.w / 2, Math.min(P.y + P.h - pad - capSize * 1.6 - 18, venn(P).y + R * 1.95), { size: 8.5, color: rgba(ink, 0.62 * lab), align: 'center', tracking: 0.1 })
    }
    const ka = inkReveal('k', T) * fade
    if (ka > 0 && !tiny) {
      const p = inkPos('k', T)
      const kr = R * K_SCALE
      const lx = p.x
      const ly = p.y + kr + 16
      text(ctx, 'K · 45°', lx, ly, { size: 10, color: rgba(ink, 0.9 * ka), align: 'center', tracking: 0.1 })
      if (!short) text(ctx, 'ONE INK, A TRUE BLACK', lx, ly + 11, { size: 7.5, color: rgba(ink, 0.5 * ka), align: 'center', tracking: 0.1 })
    }
    // the progressive proof label and the screen angles
    if (ia > 0 && T > PLATES[0][1] - 0.2) {
      let n = 0
      for (const [, t0] of PLATES) if (T >= t0) n++
      const k = PLATES[Math.max(0, n - 1)][0]
      ctx.globalAlpha = ia
      if (!tiny) text(ctx, `PLATE ${n} / 4 · ${INK_NAME[k].toUpperCase()} · ${ANGLE[k]}°`, ip.x - 2, ip.y + imgS + 20, { size: 8.5, color: rgba(ink, 0.62), tracking: 0.12 })
      if (!tiny && !short) angles(ip.x + imgS + 26, ip.y + 18, 16, n)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  /** The CIE 1931 chromaticity diagram: every colour the eye sees, and the triangle a screen can make. */
  function chromaticity(T: number) {
    const cw = clamp(L.w * 0.2, 92, 140)
    const chh = cw * 1.08
    const x0 = L.x + L.w - pad - cw
    const y0 = L.y + pad + 2
    const X = (x: number) => x0 + (x / 0.8) * cw
    const Y = (y: number) => y0 + chh - (y / 0.9) * chh
    const ink = NIGHT_INK
    const show = 1 - (stacked ? screenAlpha(T) * 0.85 : 0)
    ctx.save()
    ctx.globalAlpha = show
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(ink, 0.18)
    ctx.beginPath()
    ctx.moveTo(X(0), Y(0.9))
    ctx.lineTo(X(0), Y(0))
    ctx.lineTo(X(0.8), Y(0))
    ctx.stroke()
    // the horseshoe of pure wavelengths, closed by the line of purples
    ctx.strokeStyle = rgba(ink, 0.55)
    ctx.beginPath()
    LOCUS.forEach(([, x, y], i) => {
      if (i === 0) ctx.moveTo(X(x), Y(y))
      else ctx.lineTo(X(x), Y(y))
    })
    ctx.closePath()
    ctx.stroke()
    for (const [nm, x, y] of LOCUS) {
      if (nm !== 460 && nm !== 500 && nm !== 520 && nm !== 560 && nm !== 600) continue
      text(ctx, String(nm), X(x) + (nm < 510 ? -4 : 4), Y(y) + (nm === 520 ? -4 : 3), { size: 6.5, color: rgba(ink, 0.42), align: nm < 510 ? 'right' : 'left' })
    }
    // the sRGB gamut: what three lights can add up to
    const prim: Record<LightKey, [number, number]> = { r: [0.64, 0.33], g: [0.3, 0.6], b: [0.15, 0.06] }
    ctx.strokeStyle = rgba(ink, 0.7)
    ctx.beginPath()
    ctx.moveTo(X(prim.r[0]), Y(prim.r[1]))
    ctx.lineTo(X(prim.g[0]), Y(prim.g[1]))
    ctx.lineTo(X(prim.b[0]), Y(prim.b[1]))
    ctx.closePath()
    ctx.stroke()
    for (const k of ['r', 'g', 'b'] as LightKey[]) {
      const a = lightAlpha(k, T)
      ctx.fillStyle = css(LIGHT[k], 0.3 + 0.7 * a)
      ctx.beginPath()
      ctx.arc(X(prim[k][0]), Y(prim[k][1]), 2.5, 0, TAU)
      ctx.fill()
    }
    // the mixtures land on the triangle's edges, and white at its heart
    const lab = smoothstep(L_GLIDE[1] - 0.4, L_GLIDE[1] + 0.6, T) * (1 - smoothstep(DISCS_OUT[0] - 1, DISCS_OUT[0], T))
    if (lab > 0.01) {
      const mixes: [string, Rgb][] = [
        ['Y', [1, 1, 0]],
        ['C', [0, 1, 1]],
        ['M', [1, 0, 1]],
        ['W', [1, 1, 1]],
      ]
      for (const [n, c] of mixes) {
        const [x, y] = xyOf(c[0], c[1], c[2])
        ctx.fillStyle = css(c, lab)
        ctx.beginPath()
        ctx.arc(X(x), Y(y), 2, 0, TAU)
        ctx.fill()
        text(ctx, n, X(x) + 5, Y(y) + 3, { size: 7, color: rgba(ink, 0.7 * lab) })
      }
    }
    text(ctx, 'CIE 1931 xy · sRGB', x0, y0 + chh + 11, { size: 7, color: rgba(ink, 0.5), tracking: 0.12 })
    ctx.restore()
  }

  /** The inks as filters: reflectance spectra, each taking away about a third of the light. */
  function reflectance(T: number) {
    const pw = clamp(P.w * 0.27, 120, 180)
    const ph = clamp(P.h * 0.11, 40, 64)
    const x0 = P.x + P.w - pad - pw
    const y0 = P.y + pad + 4
    const X = (nm: number) => x0 + ((nm - 400) / 300) * pw
    const Y = (v: number) => y0 + ph - v * ph
    const ink = C.ink
    const a = 0.55 + 0.45 * smoothstep(T_INK.c - 0.5, T_INK.c + 0.5, T) * (1 - smoothstep(DISCS_OUT[0], DISCS_OUT[1], T))
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(ink, 0.3)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0, Y(0))
    ctx.lineTo(x0 + pw, Y(0))
    for (const nm of [400, 500, 600, 700]) {
      ctx.moveTo(X(nm), Y(0))
      ctx.lineTo(X(nm), Y(0) + 3)
    }
    ctx.stroke()
    for (const nm of [400, 500, 600, 700]) text(ctx, String(nm), X(nm), Y(0) + 11, { size: 6.5, color: rgba(ink, 0.5), align: 'center' })
    const cols: Record<'c' | 'm' | 'y', Rgb> = { c: INK.c, m: INK.m, y: [0.78, 0.66, 0.05] }
    for (const k of ['c', 'm', 'y'] as const) {
      ctx.strokeStyle = css(cols[k])
      ctx.beginPath()
      for (let nm = 400; nm <= 700; nm += 5) {
        const v = Math.pow(10, -ABS[k](nm))
        if (nm === 400) ctx.moveTo(X(nm), Y(v))
        else ctx.lineTo(X(nm), Y(v))
      }
      ctx.stroke()
    }
    text(ctx, 'REFLECTANCE · R(λ) = 10^−A(λ)', x0, y0 - 4, { size: 7, color: rgba(ink, 0.55), tracking: 0.12 })
    ctx.restore()
  }

  /** the screen angles, drawn as rays from one point */
  function angles(x: number, y: number, len: number, n: number) {
    if (x + len + 30 > P.x + P.w - pad) return
    ctx.lineWidth = 1
    PLATES.forEach(([k], i) => {
      if (i >= n) return
      const a = -ANGLE[k] * DEG
      ctx.strokeStyle = css(k === 'y' ? [0.75, 0.62, 0] : INK[k])
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      ctx.stroke()
      text(ctx, k.toUpperCase(), x + Math.cos(a) * (len + 7), y + Math.sin(a) * (len + 7) + 3, { size: 7.5, color: rgba(C.ink, 0.7), align: 'center' })
    })
    text(ctx, 'SCREEN ANGLES', x - 4, y + len + 18, { size: 7, color: rgba(C.ink, 0.5), tracking: 0.12 })
  }

  /* ----------------------------------------------------------- the loupe */
  function loupePos(T: number) {
    if (loupeUser) return loupeUser
    // an auto path: across the rosettes, later across the print and then the screen
    const cP = venn(P)
    const ip = imgPos(P)
    const il = imgPos(L)
    if (T < 19) {
      const u = ease.inOutSine(clamp((T - 14) / 5))
      return { x: cP.x + lerp(-R * 0.95, R * 0.45, u), y: cP.y + lerp(-R * 0.5, R * 0.3, u) }
    }
    if (T < 34.5) {
      const u = ease.inOutCubic(clamp((T - 26.5) / 2))
      return { x: lerp(cP.x + R * 0.45, ip.x + imgS * 0.36, u), y: lerp(cP.y + R * 0.3, ip.y + imgS * 0.5, u) }
    }
    if (T < 39.5) {
      const u = ease.inOutSine(clamp((T - 34.5) / 5))
      return { x: ip.x + lerp(imgS * 0.36, imgS * 0.7, u), y: ip.y + lerp(imgS * 0.5, imgS * 0.2, u) }
    }
    const u = ease.inOutCubic(clamp((T - 39.6) / 2.4))
    return { x: lerp(ip.x + imgS * 0.7, il.x + imgS * 0.4, u), y: lerp(ip.y + imgS * 0.2, il.y + imgS * 0.45, u) }
  }
  const loupeAlpha = (T: number) => (loupeUser || drag?.key === 'loupe' ? 1 : smoothstep(LOUPE_IN[0], LOUPE_IN[1], T) * (1 - smoothstep(IMAGES_OUT[0] + 0.4, IMAGES_OUT[1], T)))

  function drawLoupe(T: number) {
    const a = loupeAlpha(T)
    if (a <= 0.01) return
    const p = loupePos(T)
    const r = loupeR
    const src = r / MAG
    ctx.save()
    ctx.globalAlpha = a
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, TAU)
    ctx.save()
    ctx.clip()
    // what lies under each part of the lens
    for (const half of [L, P]) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(p.x + (half.x - p.x) * MAG, p.y + (half.y - p.y) * MAG, half.w * MAG, half.h * MAG)
      ctx.clip()
      if (half === P) magPaper(p.x, p.y, src, T)
      else magNight(p.x, p.y, src, T)
      ctx.restore()
    }
    ctx.restore()
    // the lens: a double rim, a reticle, a handle
    ctx.lineWidth = 1
    const overNight = p.x < L.x + L.w && p.y < L.y + L.h
    const rimInk = overNight ? NIGHT_INK : C.ink
    ctx.strokeStyle = rgba(rimInk, 0.9)
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(rimInk, 0.35)
    ctx.beginPath()
    ctx.arc(p.x, p.y, r + 4, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    for (let q = 0; q < 24; q++) {
      const an = (q / 24) * TAU
      const l = q % 6 === 0 ? 7 : 3
      ctx.moveTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r)
      ctx.lineTo(p.x + Math.cos(an) * (r - l), p.y + Math.sin(an) * (r - l))
    }
    ctx.stroke()
    const ha = Math.PI * 0.25
    ctx.strokeStyle = rgba(rimInk, 0.8)
    ctx.beginPath()
    ctx.moveTo(p.x + Math.cos(ha) * (r + 4), p.y + Math.sin(ha) * (r + 4))
    ctx.lineTo(p.x + Math.cos(ha) * (r + 26), p.y + Math.sin(ha) * (r + 26))
    ctx.stroke()
    if (!tiny && !short && !stacked) text(ctx, `${MAG}×`, p.x + Math.cos(ha) * (r + 30) + 2, p.y + Math.sin(ha) * (r + 30) + 8, { size: 9, color: rgba(rimInk, 0.75), tracking: 0.1 })
    ctx.restore()
  }

  /** magnified halftone: re-draw the dots under the lens as vectors, multiplied */
  function magPaper(lx: number, ly: number, src: number, T: number) {
    ctx.fillStyle = C.paper
    ctx.fillRect(lx - loupeR, ly - loupeR, loupeR * 2, loupeR * 2)
    ctx.globalCompositeOperation = 'multiply'
    const M = (x: number, y: number) => [lx + (x - lx) * MAG, ly + (y - ly) * MAG] as const
    const fade = inkFade(T)
    for (const k of ['c', 'm', 'y', 'k'] as InkKey[]) {
      const rv = inkReveal(k, T)
      if (rv <= 0 || fade <= 0) continue
      const c = inkPos(k, T)
      const rr = k === 'k' ? R * K_SCALE : R
      if (Math.hypot(c.x - lx, c.y - ly) > rr + src + cell) continue
      const yCut = c.y - rr + rr * 2 * ease.inOutSine(rv)
      const p = new Path2D()
      cells(ANGLE[k] * DEG, cell, c.x, c.y, lx, ly, src + cell, (x, y) => {
        if (y > yCut) return
        const a = discTone(Math.hypot(x - c.x, y - c.y) / rr)
        if (a <= 0.01) return
        const [X, Y] = M(x, y)
        const r = dotR(a, cell) * MAG
        p.moveTo(X + r, Y)
        p.arc(X, Y, r, 0, TAU)
      })
      ctx.globalAlpha = fade * loupeAlpha(T)
      ctx.fillStyle = css(INK[k])
      ctx.fill(p)
    }
    const ip = imgPos(P)
    const ia = 1 - smoothstep(IMAGES_OUT[0], IMAGES_OUT[1], T)
    const ic = cell * 0.9
    if (ia > 0 && lx + src > ip.x && lx - src < ip.x + imgS && ly + src > ip.y && ly - src < ip.y + imgS) {
      for (const [k] of PLATES) {
        const rv = plateReveal(k, T)
        if (rv <= 0) continue
        const xCut = ip.x + imgS * ease.inOutSine(rv)
        const p = new Path2D()
        cells(ANGLE[k] * DEG, ic, ip.x + imgS / 2, ip.y + imgS / 2, lx, ly, src + ic, (x, y) => {
          if (x < ip.x || y < ip.y || x > ip.x + imgS || y > ip.y + imgS || x > xCut) return
          const a = sepAt(k, x - ip.x, y - ip.y)
          if (a <= 0.02) return
          const [X, Y] = M(x, y)
          const r = dotR(a, ic) * MAG
          p.moveTo(X + r, Y)
          p.arc(X, Y, r, 0, TAU)
        })
        ctx.globalAlpha = ia * loupeAlpha(T)
        ctx.fillStyle = css(INK[k])
        ctx.fill(p)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = loupeAlpha(T)
  }

  /** magnified screen: every pixel as its red, green and blue subpixels */
  function magNight(lx: number, ly: number, src: number, T: number) {
    ctx.fillStyle = '#05090b'
    ctx.fillRect(lx - loupeR, ly - loupeR, loupeR * 2, loupeR * 2)
    const ip = imgPos(L)
    const sa = screenAlpha(T)
    const scanRows = Math.floor(clamp((T - SCREEN_IN[0]) / (SCREEN_IN[1] - SCREEN_IN[0])) * nPix)
    const c: Rgb = [0, 0, 0]
    // the subpixel grid is the screen's own: anchored where the picture is
    const i0 = Math.floor((lx - src - ip.x) / pitch) - 1
    const i1 = Math.ceil((lx + src - ip.x) / pitch) + 1
    const j0 = Math.floor((ly - src - ip.y) / pitch) - 1
    const j1 = Math.ceil((ly + src - ip.y) / pitch) + 1
    const cw = pitch * MAG
    const sw = cw / 3
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = ip.x + (i + 0.5) * pitch
        const y = ip.y + (j + 0.5) * pitch
        lightAt(x, y, T, c)
        if (sa > 0 && pic && i >= 0 && j >= 0 && i < nPix && j < scanRows) {
          const o = (j * nPix + i) * 4
          const al = (pic[o + 3] / 255) * sa
          c[0] = Math.min(1, c[0] + (pic[o] / 255) * al)
          c[1] = Math.min(1, c[1] + (pic[o + 1] / 255) * al)
          c[2] = Math.min(1, c[2] + (pic[o + 2] / 255) * al)
        }
        const X = lx + (ip.x + i * pitch - lx) * MAG
        const Y = ly + (ip.y + j * pitch - ly) * MAG
        for (let q = 0; q < 3; q++) {
          const v = c[q]
          if (v <= 0.01) continue
          ctx.fillStyle = q === 0 ? `rgb(${Math.round(v * 255)},0,0)` : q === 1 ? `rgb(0,${Math.round(v * 255)},0)` : `rgb(0,0,${Math.round(v * 255)})`
          ctx.fillRect(X + q * sw + 0.75, Y + 0.75, sw - 1.5, cw * 0.75 - 1)
        }
      }
    }
  }

  /* ----------------------------------------------------------- chrome */
  function chrome(t: number, T: number) {
    // the divider: a hairline with registration marks
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.5)
    if (stacked) {
      ctx.beginPath()
      ctx.moveTo(0, P.y + 0.5)
      ctx.lineTo(w, P.y + 0.5)
      ctx.stroke()
    }
    // crop and registration marks on the paper plate
    ctx.strokeStyle = rgba(C.ink, 0.55)
    cropMarks(ctx, P.x + pad * 0.5, P.y + pad * 0.5, P.w - pad, P.h - pad, tiny ? 7 : 10)
    if (!tiny) {
      regMark(ctx, P.x + P.w - pad - 4, P.y + P.h / 2, 6)
      regMark(ctx, P.x + P.w / 2, P.y + P.h - pad - 4, 6)
    }
    ctx.strokeStyle = rgba(NIGHT_INK, 0.4)
    cropMarks(ctx, L.x + pad * 0.5, L.y + pad * 0.5, L.w - pad, L.h - pad, tiny ? 7 : 10)

    // headers
    const kx = L.x + pad
    const ky = L.y + pad + 8
    text(ctx, tiny ? FIG : `${FIG} — LIGHT AND INK`, kx, ky, { size: tiny ? 8.5 : 10, color: rgba(NIGHT_INK, 0.55), tracking: 0.16, upper: true })
    const roomy = L.w >= 560
    if (!tiny) text(ctx, roomy ? 'LIGHT · ADDITIVE · sRGB PRIMARIES' : 'LIGHT · ADDITIVE', kx, ky + 15, { size: 8.5, color: rgba(NIGHT_INK, 0.4), tracking: 0.14 })
    text(ctx, tiny ? 'INK' : roomy ? 'INK · SUBTRACTIVE · PROCESS INKS ON PAPER' : 'INK · SUBTRACTIVE', P.x + pad, P.y + pad + 8, { size: tiny ? 8.5 : 9, color: rgba(C.ink, 0.55), tracking: 0.14 })
    if (!tiny && !short && L.h >= 300 && L.w >= 300) chromaticity(T)
    if (!tiny && !short && P.h >= 300 && P.w >= 300) reflectance(T)

    // colour bars, set like a printer's control strip
    if (!short || w > 700) {
      const sw = tiny ? 9 : 12
      const by = (r: Rect) => r.y + r.h - pad - sw - 4
      const lightBar: [string, Rgb][] = [
        ['R', [1, 0, 0]],
        ['G', [0, 1, 0]],
        ['B', [0, 0, 1]],
        ['C', [0, 1, 1]],
        ['M', [1, 0, 1]],
        ['Y', [1, 1, 0]],
        ['W', [1, 1, 1]],
      ]
      const inkBar: [string, Rgb][] = [
        ['C', INK.c],
        ['M', INK.m],
        ['Y', INK.y],
        ['K', INK.k],
        ['B', over('c', 'm')],
        ['G', over('c', 'y')],
        ['R', over('m', 'y')],
        ['CMY', over('c', 'm', 'y')],
      ]
      const bar = (r: Rect, items: [string, Rgb][], ink: string) => {
        const x1 = r.x + r.w - pad - 4
        const x0 = x1 - items.length * (sw + 2)
        const y = by(r)
        items.forEach(([s, c], i) => {
          const x = x0 + i * (sw + 2)
          ctx.fillStyle = css(c)
          ctx.fillRect(x, y, sw, sw)
          ctx.strokeStyle = rgba(ink, 0.35)
          ctx.strokeRect(x + 0.5, y + 0.5, sw - 1, sw - 1)
          if (!tiny) text(ctx, s, x + sw / 2, y + sw + 9, { size: 6.5, color: rgba(ink, 0.6), align: 'center' })
        })
      }
      bar(L, lightBar, NIGHT_INK)
      bar(P, inkBar, C.ink)
    }
    captions(T)
    if (!preview) prompts(t, T)
  }

  function captions(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const r = cap.half === 0 ? L : P
      const ink = cap.half === 0 ? NIGHT_INK : C.ink
      const em = cap.half === 0 ? C.sky : C.moss
      const lineH = capSize * 1.04
      const x = r.x + pad
      const top = r.y + r.h - pad - (short ? 4 : 18) - cap.lines.length * lineH - (short ? 0 : 6)
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = top + capSize + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(x - 4, y - capSize * 1.02, r.w * 0.66, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, x, y + dy, { font: 'serif', size: capSize, color: ink })
        if (ln.em) text(ctx, ln.em, x + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: em })
        ctx.restore()
      })
    }
  }

  /** the ghost demonstrations, and the hover affordance */
  function prompts(t: number, T: number) {
    // first: a light can be moved
    if (!touchedDisc && t > 2 && t < 6.2 && lightAlpha('r', T) > 0.5) {
      const u = (t - 2) / 4.2
      const a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.85, 1, u))
      const p = lightPos('r', T)
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(NIGHT_INK, 0.75)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(p.x, p.y, R * 0.45, -Math.PI * 0.9, -Math.PI * 0.1)
      ctx.stroke()
      ctx.setLineDash([])
      const ga = lerp(-Math.PI * 0.9, -Math.PI * 0.1, ease.inOutSine(clamp(u * 1.2)))
      const gx = p.x + Math.cos(ga) * R * 0.45
      const gy = p.y + Math.sin(ga) * R * 0.45
      ctx.fillStyle = NIGHT_INK
      ctx.beginPath()
      ctx.arc(gx, gy, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(gx, gy, 10, 0, TAU)
      ctx.stroke()
      const label = 'DRAG A LIGHT OR AN INK'
      setFont(ctx, { size: 9.5, tracking: 0.14 })
      const lw = ctx.measureText(label).width
      text(ctx, label, clamp(p.x - lw / 2, L.x + pad, L.x + L.w - pad - lw), p.y - R * 0.45 - 16, { size: 9.5, color: NIGHT_INK, tracking: 0.14 })
      ctx.restore()
    }
    // then: the loupe
    if (!touchedLoupe && !loupeUser && T > LOUPE_IN[0] && T < LOUPE_IN[0] + 4.5) {
      const a = smoothstep(LOUPE_IN[0], LOUPE_IN[1], T) * (1 - smoothstep(LOUPE_IN[0] + 3.6, LOUPE_IN[0] + 4.5, T))
      const p = loupePos(T)
      ctx.save()
      ctx.globalAlpha = a
      const label = 'DRAG THE LOUPE'
      setFont(ctx, { size: 9.5, tracking: 0.14 })
      const lw = ctx.measureText(label).width
      const lx = clamp(p.x - lw / 2, P.x + pad, P.x + P.w - pad - lw)
      text(ctx, label, lx, p.y - loupeR - 14, { size: 9.5, color: C.ink, tracking: 0.14 })
      ctx.restore()
    }
    // hover: a ring around what can be dragged
    if (hover && !drag && !ptrTouch) {
      const T2 = T
      let x = 0
      let y = 0
      let r = R
      if (hover === 'loupe') {
        const p = loupePos(T2)
        x = p.x
        y = p.y
        r = loupeR
      } else if (hover === 'r' || hover === 'g' || hover === 'b') {
        const p = lightPos(hover, T2)
        x = p.x
        y = p.y
      } else {
        const p = inkPos(hover as InkKey, T2)
        x = p.x
        y = p.y
        if (hover === 'k') r = R * K_SCALE
      }
      const night = x < L.x + L.w && y < L.y + L.h
      ctx.save()
      ctx.strokeStyle = rgba(night ? NIGHT_INK : C.ink, 0.5)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(x, y, r + 9, 0, TAU)
      ctx.stroke()
      ctx.restore()
    }
  }

  /* -------------------------------------------------------------- input */
  function hit(x: number, y: number, T: number): string {
    const touchPad = ptrTouch ? 14 : 0
    if (loupeAlpha(T) > 0.3) {
      const p = loupePos(T)
      const d = Math.hypot(x - p.x, y - p.y)
      if (d < loupeR + 8 + touchPad) return 'loupe'
    }
    // the topmost disc under the point
    if (x >= P.x && y >= P.y && inkFade(T) > 0.3) {
      for (const k of ['k', 'y', 'm', 'c'] as InkKey[]) {
        if (inkReveal(k, T) < 1) continue
        const p = inkPos(k, T)
        if (Math.hypot(x - p.x, y - p.y) < (k === 'k' ? R * K_SCALE : R) + touchPad) return k
      }
    }
    if (x < L.x + L.w && y < L.y + L.h) {
      for (const k of ['b', 'g', 'r'] as LightKey[]) {
        if (lightAlpha(k, T) < 0.5) continue
        const p = lightPos(k, T)
        if (Math.hypot(x - p.x, y - p.y) < R + touchPad) return k
      }
    }
    return ''
  }
  function keyPos(k: string, T: number) {
    if (k === 'loupe') return loupePos(T)
    if (k === 'r' || k === 'g' || k === 'b') return lightPos(k, T)
    return inkPos(k as InkKey, T)
  }

  layout()

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      ptrTouch = p.pointerType === 'touch'
      px = p.x
      py = p.y
      const T = curT
      if (p.type === 'leave') {
        hover = ''
        drag = null
        env.setCursor('default')
        return
      }
      if (p.type === 'down') {
        const k = hit(p.x, p.y, T)
        if (k) {
          const q = keyPos(k, T)
          drag = { key: k, dx: q.x - p.x, dy: q.y - p.y }
          if (k === 'loupe') {
            touchedLoupe = true
            loupeUser = { x: q.x, y: q.y }
            sfx.tone(1800, 0.04, { type: 'sine', gain: 0.02 })
          } else {
            touchedDisc = true
            if (k === 'r' || k === 'g' || k === 'b') sfx.tone(LIGHT_HZ[k], 0.5, { type: 'sine', gain: 0.03, room: 0.4 })
            else sfx.noise(0.12, { filter: 300, q: 0.8, gain: 0.04 })
          }
        }
      } else if (p.type === 'move' && drag && p.pressed) {
        const tx = p.x + drag.dx
        const ty = p.y + drag.dy
        if (drag.key === 'loupe') loupeUser = { x: clamp(tx, 0, w), y: clamp(ty, 0, h) }
        else {
          // keep each disc on its own half
          const half = drag.key === 'r' || drag.key === 'g' || drag.key === 'b' ? L : P
          const base = drag.key === 'r' || drag.key === 'g' || drag.key === 'b' ? lightPos(drag.key, T) : inkPos(drag.key as InkKey, T)
          const o = off(drag.key)
          const bx = base.x - o.x
          const by = base.y - o.y
          user[drag.key] = { x: clamp(tx, half.x + R * 0.4, half.x + half.w - R * 0.4) - bx, y: clamp(ty, half.y + R * 0.4, half.y + half.h - R * 0.4) - by }
        }
      } else if (p.type === 'up') {
        drag = null
      }
      hover = drag ? drag.key : hit(p.x, p.y, T)
      env.setCursor(drag ? 'grabbing' : hover ? 'grab' : 'default')
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      const T = curT
      if (code === 'ArrowRight') {
        const next = STOPS.find((s) => s > T + 0.3)
        offset += (next ?? LOOP) - T
      } else {
        let prev = 0
        for (const s of STOPS) if (s < T - 1.2) prev = s
        offset += prev - T
      }
      return true
    },
    frame(t, dt) {
      const T = mod(t + offset, LOOP)
      curT = T
      // a new loop (or the discs gone): moved things go home
      if (prevT >= 0 && (T < prevT - 1 || (prevT < DISCS_OUT[1] && T >= DISCS_OUT[1]))) {
        for (const k of Object.keys(user)) delete user[k]
      }
      const advancing = dt > 0 && prevT >= 0 && T >= prevT
      const crossed = (te: number) => advancing && prevT < te && te <= T
      // sound: a chord of light; the press laying ink
      for (const k of ['r', 'g', 'b'] as LightKey[]) if (crossed(T_LIGHT[k] + 0.3)) sfx.tone(LIGHT_HZ[k], 2.6, { type: 'sine', gain: 0.035, attack: 0.25, room: 0.5 })
      if (crossed(L_GLIDE[1])) for (const k of ['r', 'g', 'b'] as LightKey[]) sfx.tone(LIGHT_HZ[k] * 2, 3.2, { type: 'sine', gain: 0.025, attack: 0.4, room: 0.6 })
      for (const k of ['c', 'm', 'y', 'k'] as InkKey[]) if (crossed(T_INK[k])) sfx.noise(0.5, { filter: k === 'k' ? 180 : 320, to: 120, q: 0.9, gain: 0.05, room: 0.3 })
      for (const [, t0] of PLATES) if (crossed(t0)) sfx.noise(0.6, { filter: 260, to: 110, q: 0.9, gain: 0.04, room: 0.3 })
      if (crossed(SCREEN_IN[0])) sfx.tone(LIGHT_HZ.g * 4, 1.8, { type: 'sine', gain: 0.012, to: LIGHT_HZ.g * 4.02, room: 0.4 })

      drawNight(T)
      drawPaper(T)
      chrome(t, T)
      drawLoupe(T)
      void px
      void py
      prevT = T
    },
  }
}

export default create
