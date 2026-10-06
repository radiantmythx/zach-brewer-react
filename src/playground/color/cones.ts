/*
 * FIG. C.10 — THREE CONES. How three kinds of cone build every color, and
 * how others see.
 *
 *   I    Three cones    the S, M and L cone fundamentals (Stockman & Sharpe,
 *                       2000, 2°) as hairlines over the spectrum; a probe
 *                       sweeps the wavelength and reads the three responses
 *   II   Metamers       a spectral yellow and a mix of green and red light give
 *                       the same L, M and S, so the same color (solved live)
 *   III  The garden     a painted garden as typical trichromats see it, then
 *                       simulated for deuteranopia, protanopia and tritanopia
 *                       (Brettel, Viénot & Mollon, 1997, computed from the
 *                       same cone fundamentals), and back
 *
 * Colors are rendered from cone space: LMS → XYZ by the CIE (2015) 2°
 * transform, XYZ → sRGB. 84 s loop, a pure function of time.
 *
 * Interaction (full mode): drag the probe along the spectrum (in II it sets
 * the yellow to be matched); in III tap to switch vision, drag to compare
 * with typical vision side by side; ← → chapters.
 * Test route: &at=seconds, &probe=nm, &vision=0–3, &div=0–1 (the compare divider).
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, rgba, rng, setFont, smoothstep, text } from '../kit'
import { css, toSrgb, xyzToLinear, type Rgb } from '../color'
import type { CreatePiece } from '../types'

/* ------------------------------------------------------------- cone data */

// Stockman & Sharpe (2000) 2° cone fundamentals (CIE 2006 LMS), linear energy units, each
// normalized to a peak of 1; 390–780 nm at 5 nm, as L, M, S. From the CVRL database, 4 s.f.
const SS = [
  0.000415, 0.0003683, 0.009547, 0.001052, 0.0009587, 0.02382, 0.002408, 0.00227, 0.05665, 0.004833, 0.0047, 0.1225,
  0.008721, 0.008794, 0.233, 0.01338, 0.01453, 0.3814, 0.01845, 0.02166, 0.5436, 0.02293, 0.02957, 0.6745,
  0.02819, 0.03946, 0.8026, 0.03411, 0.05182, 0.9036, 0.04026, 0.06478, 0.991, 0.04494, 0.07588, 0.9915,
  0.04986, 0.08705, 0.9554, 0.05534, 0.09819, 0.8602, 0.06472, 0.1163, 0.7867, 0.08069, 0.1445, 0.7383,
  0.09948, 0.1759, 0.6464, 0.1188, 0.2054, 0.5164, 0.1401, 0.2358, 0.3903, 0.164, 0.2681, 0.2903,
  0.1916, 0.3036, 0.2119, 0.2329, 0.3571, 0.1605, 0.289, 0.4278, 0.1228, 0.3597, 0.5156, 0.0889,
  0.4437, 0.6155, 0.06082, 0.5365, 0.7192, 0.04281, 0.6286, 0.8166, 0.0292, 0.7047, 0.8855, 0.01939,
  0.7706, 0.9357, 0.0126, 0.8257, 0.9689, 0.008095, 0.881, 0.9952, 0.005089, 0.9191, 0.9972, 0.003169,
  0.9402, 0.9772, 0.001959, 0.9657, 0.9566, 0.001203, 0.9814, 0.9177, 0.0007402, 0.9945, 0.8732, 0.000456,
  1, 0.8135, 0.0002818, 0.9923, 0.7403, 0.000175, 0.9694, 0.6533, 0.0001095, 0.9556, 0.5726, 0.000069,
  0.9277, 0.4926, 0.0000439, 0.886, 0.4112, 0.00002822, 0.834, 0.3344, 0.00001835, 0.7751, 0.2649, 0.00001207,
  0.7057, 0.2053, 0.000008035, 0.6308, 0.1562, 0.000005418, 0.5542, 0.1166, 0, 0.4799, 0.08559, 0,
  0.4007, 0.06211, 0, 0.3279, 0.04449, 0, 0.2658, 0.03143, 0, 0.2133, 0.0218, 0,
  0.1651, 0.01545, 0, 0.1247, 0.01071, 0, 0.09301, 0.007303, 0, 0.06851, 0.004972, 0,
  0.04987, 0.003437, 0, 0.03582, 0.002376, 0, 0.02538, 0.001637, 0, 0.01772, 0.001121, 0,
  0.01217, 0.0007611, 0, 0.008472, 0.0005255, 0, 0.005897, 0.0003653, 0, 0.004091, 0.0002534, 0,
  0.002804, 0.0001744, 0, 0.001921, 0.0001206, 0, 0.001327, 0.00008417, 0, 0.0009178, 0.00005893, 0,
  0.0006394, 0.0000416, 0, 0.000446, 0.00002944, 0, 0.0003109, 0.00002089, 0, 0.0002193, 0.00001505, 0,
  0.0001545, 0.00001082, 0, 0.0001095, 0.000007823, 0, 0.00007799, 0.000005691, 0, 0.00005563, 0.00000414, 0,
  0.00003993, 0.000003027, 0, 0.00002862, 0.000002211, 0, 0.00002073, 0.000001634, 0,
]
type V3 = [number, number, number]
/** L, M, S cone sensitivity at λ (nm), linearly interpolated; zero outside 390–780. */
function cones(nm: number): V3 {
  if (!(nm >= 390 && nm <= 780)) return [0, 0, 0]
  const f = (nm - 390) / 5
  const i = Math.min(77, Math.floor(f))
  const t = f - i
  const a = i * 3
  return [SS[a] + (SS[a + 3] - SS[a]) * t, SS[a + 1] + (SS[a + 4] - SS[a + 1]) * t, SS[a + 2] + (SS[a + 5] - SS[a + 2]) * t]
}

type M3 = [V3, V3, V3]
const mv = (m: M3, v: V3): V3 => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]]
const mm = (a: M3, b: M3): M3 => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j])) as M3
function inv(m: M3): M3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const Cc = d * h - e * g
  const det = a * A + b * B + c * Cc
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ]
}
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// CIE (2015) 2° XYZ from the CIE (2006) LMS fundamentals
const LMS2XYZ: M3 = [
  [1.94735469, -1.41445123, 0.36476327],
  [0.68990272, 0.34832189, 0],
  [0, 0, 1.93485343],
]
const RGB2XYZ: M3 = [
  [0.4124, 0.3576, 0.1805],
  [0.2126, 0.7152, 0.0722],
  [0.0193, 0.1192, 0.9505],
]
const RGB2LMS = mm(inv(LMS2XYZ), RGB2XYZ)
const LMS2RGB = inv(RGB2LMS)

/** The color of light with cone excitations q, as gamma sRGB at full brightness (out-of-gamut parts clipped). */
function colorOfLms(q: V3, brightness = 1): Rgb {
  const l = xyzToLinear(mv(LMS2XYZ, q))
  const c: Rgb = [Math.max(0, l[0]), Math.max(0, l[1]), Math.max(0, l[2])]
  const hi = Math.max(c[0], c[1], c[2]) || 1
  return toSrgb([(c[0] / hi) * brightness, (c[1] / hi) * brightness, (c[2] / hi) * brightness])
}
/** Monochromatic light at λ, its brightness eased toward the ends of the spectrum. */
const spec = (nm: number) => colorOfLms(cones(nm), 0.3 + 0.7 * clamp((nm - 395) / 45) * clamp((715 - nm) / 55))

/** Two lights, at p1 and p2 nm, mixed to give the same L and M as one at λ (S is near zero for all three). */
function metamer(nm: number, p1 = 545, p2 = 630) {
  const T = cones(nm)
  const A = cones(p1)
  const B = cones(p2)
  const det = A[0] * B[1] - B[0] * A[1]
  const a = (T[0] * B[1] - B[0] * T[1]) / det
  const b = (A[0] * T[1] - T[0] * A[1]) / det
  const q: V3 = [a * A[0] + b * B[0], a * A[1] + b * B[1], a * A[2] + b * B[2]]
  return { a, b, q, ok: a >= 0 && b >= 0 }
}

/* --------------------------------------------- dichromat simulation (Brettel) */

interface Sim {
  /** linear-RGB → linear-RGB for each half-plane */
  t1: Float32Array
  t2: Float32Array
  /** the side test, as a dot product in linear RGB, and the side anchor 1 lies on */
  w: V3
  s1: number
}
/**
 * Brettel, Viénot & Mollon (1997): a dichromat lacking cone k sees each color as its
 * projection, along the k axis, onto one of two half-planes through the white point and
 * an anchor wavelength that dichromats and trichromats name alike.
 */
function brettel(k: 0 | 1 | 2, a1: number, a2: number): Sim {
  const E = mv(RGB2LMS, [1, 1, 1])
  const [i, j] = [0, 1, 2].filter((x) => x !== k)
  const A1 = cones(a1)
  const A2 = cones(a2)
  const proj = (A: V3): M3 => {
    const n = cross(E, A)
    const p: M3 = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    p[k] = [0, 0, 0]
    p[k][i] = -n[i] / n[k]
    p[k][j] = -n[j] / n[k]
    return p
  }
  const flat = (m: M3) => Float32Array.from([...m[0], ...m[1], ...m[2]])
  // which half-plane: the color's j/i cone ratio against white's
  const c: V3 = [0, 0, 0]
  c[j] = E[i]
  c[i] = -E[j]
  const w: V3 = [0, 1, 2].map((m) => c[0] * RGB2LMS[0][m] + c[1] * RGB2LMS[1][m] + c[2] * RGB2LMS[2][m]) as V3
  return {
    t1: flat(mm(LMS2RGB, mm(proj(A1), RGB2LMS))),
    t2: flat(mm(LMS2RGB, mm(proj(A2), RGB2LMS))),
    w,
    s1: Math.sign(A1[j] * E[i] - A1[i] * E[j]),
  }
}
const SIMS = [null, brettel(1, 475, 575), brettel(0, 475, 575), brettel(2, 485, 660)]

interface Vision {
  name: string
  em: string
  missing: number
  lines: string[]
  short: string
}
const VISIONS: Vision[] = [
  { name: 'Typical', em: 'trichromat', missing: -1, lines: ['L, M AND S CONES', 'ABOUT 92% OF MEN, 99.5% OF WOMEN'], short: 'TRICHROMAT' },
  { name: 'Deuteran', em: 'opia', missing: 1, lines: ['NO WORKING M CONES', '≈ 1% OF MEN · X-LINKED'], short: 'DEUTERANOPIA' },
  { name: 'Protan', em: 'opia', missing: 0, lines: ['NO WORKING L CONES', '≈ 1% OF MEN · X-LINKED'], short: 'PROTANOPIA' },
  { name: 'Tritan', em: 'opia', missing: 2, lines: ['NO WORKING S CONES', 'RARE · NOT X-LINKED'], short: 'TRITANOPIA' },
]

/* ----------------------------------------------------------------- timing */

const LOOP = 84
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Three cones' },
  { t: 22, num: 'II', name: 'Metamers' },
  { t: 42, num: 'III', name: 'The garden' },
]
// the garden's visions: [start, vision], each crossfading in over 1.5 s
const VSEQ: [number, number][] = [
  [42, 0],
  [50, 1],
  [58, 2],
  [66, 3],
  [74, 0],
]
const CAPS = [
  { t0: 1.5, t1: 20.6, a: 'Three kinds of cone,', b: 'and ', em: 'every color.' },
  { t0: 25, t1: 40.6, a: 'Different light,', b: '', em: 'the same color.' },
  { t0: 51, t1: 57.6, a: 'This is', b: '', em: 'the same garden.' },
  { t0: 59, t1: 65.6, a: 'One in twelve men sees', b: 'this garden ', em: 'differently.' },
  { t0: 75.5, t1: 81.5, a: 'No two eyes', b: 'see ', em: 'quite alike.' },
]
const CONE_COL = ['#E58A6E', '#86C79A', '#8AAEF0']
const CONE_NAME = ['L', 'M', 'S']
const PEAKS = [570, 545, 445]
const NM0 = 390
const NM1 = 720
const NIGHT_INK = '#E4ECE8'

const colorName = (nm: number) => (nm < 450 ? 'VIOLET' : nm < 485 ? 'BLUE' : nm < 500 ? 'CYAN' : nm < 560 ? 'GREEN' : nm < 575 ? 'YELLOW-GREEN' : nm < 590 ? 'YELLOW' : nm < 625 ? 'ORANGE' : 'RED')

/* ----------------------------------------------------------------- piece */

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const at = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(at) ? at : preview ? 9 : 0
  let interacted = false
  const k = { ink: NIGHT_INK, ink2: 'rgba(228,236,232,0.78)', muted: 'rgba(228,236,232,0.5)', rule: 'rgba(228,236,232,0.16)', faint: 'rgba(228,236,232,0.07)' }

  // interaction state
  let userNm = -1
  let userW = 0
  let dragProbe = false
  let pinnedVision = -1
  let divX = -1
  let divHold = 0
  let divFrac = -1
  let dragDiv = false
  let downAt: { x: number; y: number } | null = null
  let hoverRuler = -1
  {
    const pn = Number(env.params.get('probe'))
    if (env.params.has('probe') && pn >= NM0 && pn <= NM1) {
      userNm = pn
      userW = 1
    }
    const pv = Number(env.params.get('vision'))
    if (env.params.has('vision') && pv >= 0 && pv <= 3) pinnedVision = Math.round(pv)
    const pd = Number(env.params.get('div'))
    if (env.params.has('div') && pd > 0 && pd < 1) divFrac = pd
  }

  /* ------------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let pad = 16
  let small = false
  let tiny = false
  let tall = false
  const plot = { x: 0, y: 0, w: 100, h: 100 }
  const ro = { x: 0, y: 0, w: 100, h: 100 }
  const gd = { x: 0, y: 0, w: 100, h: 100 }
  let capX = 0
  let capY = 0
  let capSize = 24
  let rulerY = 0
  let strip: HTMLCanvasElement | null = null
  let stripH = 10

  function layout() {
    w = env.width
    h = env.height
    small = preview || Math.min(w, h) < 440
    tiny = h < 260
    tall = h > w * 1.05 || w / h < 1.2
    pad = clamp(Math.min(w, h) * 0.045, 12, 40)
    const top = pad + (tiny ? 18 : small ? 26 : 40)
    rulerY = h - pad * 0.7
    const bottom = rulerY - (tiny ? 16 : small ? 22 : 30)
    stripH = tiny ? 6 : small ? 8 : 12
    if (!tall) {
      const short = h < 440
      capSize = short ? clamp(h * 0.06, 13, 22) : clamp(Math.min(w * 0.028, h * 0.05), 18, 38)
      const rightW = clamp(w * (short ? 0.3 : 0.27), 150, 400)
      plot.x = pad + (small ? 24 : 34)
      plot.w = w - pad - rightW - clamp(w * 0.04, 18, 60) - plot.x
      plot.y = top + (small ? 6 : 12)
      // captions: under the plot on tall-enough frames, in the right column on short ones
      if (short) {
        plot.h = bottom - plot.y - stripH - (small ? 22 : 30)
        ro.x = w - pad - rightW
        ro.w = rightW
        ro.y = top
        ro.h = bottom - top - capSize * 2.3 - 8
        capX = ro.x
        capY = bottom - capSize * 2.2
      } else {
        capY = bottom - capSize * 2.3
        capX = pad
        plot.h = capY - 26 - plot.y - stripH - 30
        ro.x = w - pad - rightW
        ro.w = rightW
        ro.y = top
        ro.h = bottom - top
      }
      gd.x = pad
      gd.y = top
      gd.w = plot.x + plot.w - pad
      gd.h = (short ? bottom : capY - 18) - top
    } else {
      capSize = clamp(Math.min(w * 0.064, h * 0.038), 15, 30)
      capX = pad
      capY = bottom - capSize * 2.3
      plot.x = pad + (small ? 22 : 30)
      plot.w = w - pad - plot.x
      plot.y = top + 8
      const avail = capY - 14 - top
      plot.h = Math.max(60, avail * (h > 700 ? 0.52 : 0.48) - stripH - 26)
      ro.x = pad
      ro.w = w - pad * 2
      ro.y = plot.y + plot.h + stripH + 34
      ro.h = capY - 12 - ro.y
      gd.x = pad
      gd.y = top
      gd.w = w - pad * 2
      gd.h = Math.min(gd.w * 1.0, avail * 0.6)
    }
    buildStrip()
    // repaint the garden only when its size changes (not, say, when the fonts arrive)
    const key = `${Math.round(gd.w)}x${Math.round(gd.h)}@${env.dpr}`
    if (key !== gardenKey) {
      gardenKey = key
      gardenDirty = true
    }
  }

  function buildStrip() {
    if (typeof document === 'undefined') return
    const res = Math.min(2, env.dpr || 1)
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(plot.w * res))
    c.height = Math.max(1, Math.round(stripH * res))
    const g = c.getContext('2d')
    if (!g) return
    for (let x = 0; x < c.width; x++) {
      const nm = lerp(NM0, NM1, (x + 0.5) / c.width)
      g.fillStyle = css(spec(nm))
      g.fillRect(x, 0, 1, c.height)
    }
    strip = c
  }

  /* -------------------------------------------------------------- garden */
  let gardenDirty = true
  let gardenKey = ''
  let garden: HTMLCanvasElement | null = null
  const simCanvas: (HTMLCanvasElement | null)[] = [null, null, null, null]
  let simQueue: number[] = []

  function paintGarden(g: CanvasRenderingContext2D, W: number, H: number) {
    const R = rng(1866)
    const line = 'rgba(28,40,28,0.5)'
    const sky = g.createLinearGradient(0, 0, 0, H * 0.5)
    sky.addColorStop(0, '#C9DFEC')
    sky.addColorStop(1, '#EEF0E2')
    g.fillStyle = sky
    g.fillRect(0, 0, W, H)
    const S = Math.min(W, H)
    // far trees: two rows of soft crowns
    for (const [col, y0, amp] of [
      ['#7FA676', 0.37, 0.07],
      ['#5F8D5A', 0.43, 0.06],
    ] as [string, number, number][]) {
      g.fillStyle = col
      g.beginPath()
      g.moveTo(0, H * 0.6)
      let x = -S * 0.05
      g.lineTo(x, H * y0)
      while (x < W + S * 0.1) {
        const step = S * (0.06 + R() * 0.05)
        g.quadraticCurveTo(x + step / 2, H * (y0 - amp * (0.5 + R() * 0.6)), x + step, H * y0 + (R() - 0.5) * S * 0.02)
        x += step
      }
      g.lineTo(W, H * 0.6)
      g.closePath()
      g.fill()
      g.strokeStyle = 'rgba(28,40,28,0.25)'
      g.lineWidth = 1
      g.stroke()
    }
    // the lawn, with mowing stripes
    g.fillStyle = '#86AE5E'
    g.fillRect(0, H * 0.52, W, H * 0.48)
    g.fillStyle = 'rgba(255,255,240,0.07)'
    for (let i = 0; i < 7; i += 2) {
      g.beginPath()
      g.moveTo(W * (i / 7), H * 0.52)
      g.lineTo(W * ((i + 1) / 7), H * 0.52)
      g.lineTo(W * ((i + 1) / 7) * 1.4 - W * 0.2, H)
      g.lineTo(W * (i / 7) * 1.4 - W * 0.2, H)
      g.closePath()
      g.fill()
    }
    g.strokeStyle = 'rgba(28,40,28,0.3)'
    g.beginPath()
    g.moveTo(0, H * 0.52)
    g.lineTo(W, H * 0.52)
    g.stroke()

    const leaf = (x: number, y: number, ang: number, L: number, Wd: number, fill: string) => {
      const ux = Math.cos(ang)
      const uy = Math.sin(ang)
      const tx = x + ux * L
      const ty = y + uy * L
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + ux * L * 0.5 - uy * Wd, y + uy * L * 0.5 + ux * Wd, tx, ty)
      g.quadraticCurveTo(x + ux * L * 0.5 + uy * Wd, y + uy * L * 0.5 - ux * Wd, x, y)
      g.fillStyle = fill
      g.fill()
      g.strokeStyle = line
      g.lineWidth = 1
      g.stroke()
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + ux * L * 0.85, y + uy * L * 0.85)
      g.strokeStyle = 'rgba(28,50,28,0.35)'
      g.stroke()
    }
    const LEAVES = ['#4E8C3A', '#5E9A44', '#3F7A35']

    // the rose bush, left
    {
      const cx = W * 0.16
      const cy = H * 0.6
      for (let i = 0; i < 46; i++) {
        const a = R() * TAU
        const rr = Math.sqrt(R()) * S * 0.14
        leaf(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.75, R() * TAU, S * (0.035 + R() * 0.02), S * 0.014, LEAVES[i % 3])
      }
      for (let i = 0; i < 8; i++) {
        const a = R() * TAU
        const rr = Math.sqrt(R()) * S * 0.11
        const x = cx + Math.cos(a) * rr
        const y = cy + Math.sin(a) * rr * 0.7
        const r = S * (0.02 + R() * 0.008)
        g.fillStyle = '#E8849E'
        g.beginPath()
        g.arc(x, y, r, 0, TAU)
        g.fill()
        g.strokeStyle = 'rgba(110,30,50,0.55)'
        g.stroke()
        g.beginPath()
        for (let s = 0; s < 3; s++) g.arc(x, y, r * (0.75 - s * 0.22), a + s * 1.7, a + s * 1.7 + 3.6)
        g.stroke()
        g.fillStyle = '#C24F6E'
        g.beginPath()
        g.arc(x, y, r * 0.22, 0, TAU)
        g.fill()
      }
    }
    // a robin on the lawn, right
    {
      const x = W * 0.74
      const y = H * 0.66
      const s = S * 0.07
      g.lineWidth = 1
      g.strokeStyle = 'rgba(40,30,20,0.6)'
      g.beginPath()
      g.moveTo(x - s * 0.15, y + s * 0.55)
      g.lineTo(x - s * 0.2, y + s * 1.0)
      g.moveTo(x + s * 0.15, y + s * 0.55)
      g.lineTo(x + s * 0.12, y + s * 1.0)
      g.stroke()
      g.fillStyle = '#7E6145'
      g.beginPath()
      g.ellipse(x, y, s * 0.75, s * 0.55, -0.15, 0, TAU)
      g.fill()
      g.stroke()
      g.beginPath()
      g.moveTo(x + s * 0.6, y - s * 0.05)
      g.lineTo(x + s * 1.35, y + s * 0.15)
      g.lineTo(x + s * 0.7, y + s * 0.3)
      g.closePath()
      g.fill()
      g.fillStyle = '#EDE6D6'
      g.beginPath()
      g.ellipse(x - s * 0.25, y + s * 0.22, s * 0.38, s * 0.3, 0.2, 0, TAU)
      g.fill()
      g.fillStyle = '#D9622B'
      g.beginPath()
      g.ellipse(x - s * 0.45, y - s * 0.05, s * 0.36, s * 0.38, 0, 0, TAU)
      g.fill()
      g.stroke()
      g.fillStyle = '#7E6145'
      g.beginPath()
      g.arc(x - s * 0.62, y - s * 0.45, s * 0.3, 0, TAU)
      g.fill()
      g.stroke()
      g.fillStyle = '#D9622B'
      g.beginPath()
      g.arc(x - s * 0.7, y - s * 0.36, s * 0.2, 0.6, 3.4)
      g.fill()
      g.fillStyle = '#1C140E'
      g.beginPath()
      g.arc(x - s * 0.72, y - s * 0.5, s * 0.05, 0, TAU)
      g.fill()
      g.beginPath()
      g.moveTo(x - s * 0.9, y - s * 0.48)
      g.lineTo(x - s * 1.08, y - s * 0.42)
      g.lineTo(x - s * 0.9, y - s * 0.38)
      g.fill()
    }
    // the berry branch, arching in from the top right
    {
      const p0 = [W * 1.02, H * 0.06]
      const p1 = [W * 0.62, H * 0.04]
      const p2 = [W * 0.34, H * 0.3]
      const at2 = (t: number) => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]
      g.strokeStyle = '#6B5136'
      g.lineWidth = Math.max(2, S * 0.008)
      g.beginPath()
      g.moveTo(p0[0], p0[1])
      g.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1])
      g.stroke()
      g.lineWidth = 1
      for (let i = 0; i < 16; i++) {
        const t = 0.06 + i * 0.058
        const [x, y] = at2(t)
        const side = i % 2 ? 1 : -1
        leaf(x, y, Math.PI * (0.5 + side * 0.3) + (R() - 0.5) * 0.4, S * (0.07 + R() * 0.03), S * 0.022, LEAVES[i % 3])
      }
      for (const t of [0.18, 0.37, 0.55, 0.72, 0.93]) {
        const [bx, by] = at2(t)
        const n = 6 + Math.floor(R() * 4)
        for (let b = 0; b < n; b++) {
          const a = R() * TAU
          const rr = Math.sqrt(R()) * S * 0.028
          const x = bx + Math.cos(a) * rr
          const y = by + S * 0.03 + Math.sin(a) * rr
          const r = S * 0.0125
          g.strokeStyle = 'rgba(90,60,30,0.6)'
          g.beginPath()
          g.moveTo(bx, by)
          g.lineTo(x, y)
          g.stroke()
          g.fillStyle = '#C4232B'
          g.beginPath()
          g.arc(x, y, r, 0, TAU)
          g.fill()
          g.strokeStyle = 'rgba(80,12,16,0.7)'
          g.stroke()
          g.fillStyle = 'rgba(255,220,215,0.75)'
          g.beginPath()
          g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU)
          g.fill()
        }
      }
    }
    // the border along the bottom: grass, cornflowers, buttercups, poppies
    {
      const kinds = ['corn', 'butter', 'poppy', 'corn', 'butter', 'corn', 'poppy', 'butter']
      for (let i = 0; i < 70; i++) {
        const x = R() * W
        const y0 = H * (0.82 + R() * 0.2)
        g.strokeStyle = LEAVES[i % 3]
        g.lineWidth = Math.max(1, S * 0.003)
        g.beginPath()
        g.moveTo(x, H + 2)
        g.quadraticCurveTo(x + (R() - 0.5) * S * 0.04, y0, x + (R() - 0.5) * S * 0.05, y0 - S * 0.05)
        g.stroke()
      }
      g.lineWidth = 1
      const n = Math.round(W / (S * 0.07))
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5 + (R() - 0.5) * 0.6) * (W / n)
        const y = H * (0.8 + R() * 0.12)
        const r = S * (0.022 + R() * 0.01)
        const kind = kinds[i % kinds.length]
        g.strokeStyle = '#4E8C3A'
        g.lineWidth = Math.max(1, S * 0.004)
        g.beginPath()
        g.moveTo(x, y)
        g.quadraticCurveTo(x + r * 0.5, y + (H - y) * 0.5, x - r * 0.2, H + 2)
        g.stroke()
        g.lineWidth = 1
        if (kind === 'corn') {
          g.fillStyle = '#4F72D6'
          g.beginPath()
          for (let p = 0; p < 9; p++) {
            const a = (p / 9) * TAU
            g.moveTo(x, y)
            g.lineTo(x + Math.cos(a - 0.2) * r, y + Math.sin(a - 0.2) * r)
            g.lineTo(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15)
            g.lineTo(x + Math.cos(a + 0.2) * r, y + Math.sin(a + 0.2) * r)
            g.closePath()
          }
          g.fill()
          g.strokeStyle = 'rgba(30,40,90,0.55)'
          g.stroke()
          g.fillStyle = '#2E3F8F'
          g.beginPath()
          g.arc(x, y, r * 0.25, 0, TAU)
          g.fill()
        } else if (kind === 'butter') {
          g.fillStyle = '#F4C430'
          g.strokeStyle = 'rgba(120,80,10,0.55)'
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * TAU - Math.PI / 2
            g.beginPath()
            g.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.5, r * 0.36, a, 0, TAU)
            g.fill()
            g.stroke()
          }
          g.fillStyle = '#C9921A'
          g.beginPath()
          g.arc(x, y, r * 0.22, 0, TAU)
          g.fill()
        } else {
          g.fillStyle = '#D93A2B'
          g.strokeStyle = 'rgba(90,15,10,0.6)'
          for (let p = 0; p < 4; p++) {
            const a = (p / 4) * TAU + 0.4
            g.beginPath()
            g.arc(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.62, 0, TAU)
            g.fill()
            g.stroke()
          }
          g.fillStyle = '#2A1E1A'
          g.beginPath()
          g.arc(x, y, r * 0.22, 0, TAU)
          g.fill()
        }
      }
    }
  }

  function buildGarden() {
    gardenDirty = false
    if (typeof document === 'undefined') return
    const res = Math.min(1.5, env.dpr || 1)
    const c = document.createElement('canvas')
    c.width = Math.max(2, Math.round(gd.w * res))
    c.height = Math.max(2, Math.round(gd.h * res))
    const g = c.getContext('2d')
    if (!g) return
    g.scale(res, res)
    paintGarden(g, gd.w, gd.h)
    garden = c
    simCanvas[0] = c
    simCanvas[1] = simCanvas[2] = simCanvas[3] = null
    simQueue = [1, 2, 3]
  }

  // sRGB ↔ linear lookup tables for the per-pixel simulation
  const DEC = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const c = i / 255
    DEC[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const ENC = new Uint8Array(4097)
  for (let i = 0; i <= 4096; i++) {
    const c = i / 4096
    ENC[i] = Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255)
  }
  const enc = (v: number) => ENC[v <= 0 ? 0 : v >= 1 ? 4096 : Math.round(v * 4096)]

  function buildSim(v: number) {
    const sim = SIMS[v]
    if (!garden || !sim || typeof document === 'undefined') return
    const g0 = garden.getContext('2d')
    if (!g0) return
    const src = g0.getImageData(0, 0, garden.width, garden.height)
    const out = new ImageData(garden.width, garden.height)
    const d = src.data
    const o = out.data
    const { t1, t2, w: sw, s1 } = sim
    for (let p = 0; p < d.length; p += 4) {
      const r = DEC[d[p]]
      const gg = DEC[d[p + 1]]
      const b = DEC[d[p + 2]]
      const T = (sw[0] * r + sw[1] * gg + sw[2] * b) * s1 >= 0 ? t1 : t2
      o[p] = enc(T[0] * r + T[1] * gg + T[2] * b)
      o[p + 1] = enc(T[3] * r + T[4] * gg + T[5] * b)
      o[p + 2] = enc(T[6] * r + T[7] * gg + T[8] * b)
      o[p + 3] = d[p + 3]
    }
    const c = document.createElement('canvas')
    c.width = garden.width
    c.height = garden.height
    c.getContext('2d')?.putImageData(out, 0, 0)
    simCanvas[v] = c
  }

  layout()

  /* -------------------------------------------------------------- timing */
  const Tnow = () => ((clock % LOOP) + LOOP) % LOOP
  const chapterAt = (T: number) => CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)

  /** The probe's wavelength on the timeline (before any drag). */
  function probeAt(T: number) {
    if (T < 6) return 400
    if (T < 19) return 400 + 300 * ease.inOutSine((T - 6) / 13)
    if (T < 22) return lerp(700, 580, ease.inOutCubic((T - 19) / 3))
    if (T < 33) return 580
    if (T < 39) return 580 + 26 * Math.sin(((T - 33) / 6) * TAU)
    return 580
  }
  const probeNow = (T: number) => (userW > 0 ? lerp(probeAt(T), userNm, userW) : probeAt(T))

  function visionAt(T: number) {
    if (pinnedVision >= 0) return { from: pinnedVision, to: pinnedVision, mix: 1 }
    let idx = 0
    for (let i = 0; i < VSEQ.length; i++) if (T >= VSEQ[i][0]) idx = i
    const [t0, v] = VSEQ[idx]
    const prev = idx > 0 ? VSEQ[idx - 1][1] : 0
    return { from: prev, to: v, mix: idx === 0 ? 1 : smoothstep(t0, t0 + 1.5, T) }
  }

  /* ------------------------------------------------------------- drawing */
  const xOf = (nm: number) => plot.x + ((nm - NM0) / (NM1 - NM0)) * plot.w
  const nmOf = (x: number) => clamp(NM0 + ((x - plot.x) / plot.w) * (NM1 - NM0), NM0, NM1)
  const yOf = (v: number) => plot.y + plot.h * (1 - v)

  function drawPlot(T: number, alpha: number) {
    const ch = chapterAt(T)
    const lt = ch === 0 ? T : 99
    ctx.save()
    ctx.globalAlpha = alpha
    // axes, ticks and the spectrum strip
    const axIn = ease.outCubic(clamp(lt / 1.6))
    ctx.lineWidth = 1
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    ctx.moveTo(plot.x, plot.y)
    ctx.lineTo(plot.x, plot.y + plot.h)
    ctx.lineTo(plot.x + plot.w * axIn, plot.y + plot.h)
    for (const v of [0.25, 0.5, 0.75, 1]) {
      ctx.moveTo(plot.x - 4, yOf(v))
      ctx.lineTo(plot.x, yOf(v))
    }
    ctx.stroke()
    ctx.strokeStyle = k.faint
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    for (const v of [0.5, 1]) {
      ctx.moveTo(plot.x, yOf(v))
      ctx.lineTo(plot.x + plot.w * axIn, yOf(v))
    }
    ctx.stroke()
    ctx.setLineDash([])
    const sy = plot.y + plot.h + 6
    if (strip) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(plot.x, sy, plot.w * ease.inOutCubic(clamp((lt - 0.8) / 1.6)), stripH)
      ctx.clip()
      ctx.drawImage(strip, plot.x, sy, plot.w, stripH)
      ctx.restore()
    }
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    for (let nm = 400; nm <= NM1; nm += 10) {
      const x = xOf(nm)
      const major = nm % 50 === 0
      ctx.moveTo(x, sy + stripH)
      ctx.lineTo(x, sy + stripH + (major ? 6 : 3))
    }
    ctx.stroke()
    const ts = small ? 7.5 : 8.5
    for (let nm = 400; nm <= 700; nm += 50) {
      if (small && w < 520 && nm % 100 !== 0) continue
      text(ctx, String(nm), xOf(nm), sy + stripH + 8 + ts, { size: ts, color: k.muted, align: 'center', tracking: 0.08 })
    }
    if (!small) {
      text(ctx, 'WAVELENGTH · nm', plot.x + plot.w, sy + stripH + 8 + ts * 2.6, { size: 8, color: k.muted, align: 'right', tracking: 0.14 })
      text(ctx, 'RELATIVE SENSITIVITY', plot.x, plot.y - 10, { size: 8, color: k.muted, tracking: 0.14 })
    }
    text(ctx, '1', plot.x - 8, yOf(1) + 3, { size: ts, color: k.muted, align: 'right' })
    text(ctx, '0', plot.x - 8, yOf(0) + 3, { size: ts, color: k.muted, align: 'right' })
    // the three cone fundamentals, drawn on in turn: S, M, L
    for (const c of [2, 1, 0]) {
      const t0 = 1.8 + (2 - c) * 0.9
      const p = ease.inOutSine(clamp((lt - t0) / 2.2))
      if (p <= 0) continue
      ctx.strokeStyle = CONE_COL[c]
      ctx.lineWidth = small ? 1.2 : 1.5
      ctx.beginPath()
      const n = Math.ceil(((NM1 - NM0) / 2) * p)
      for (let s = 0; s <= n; s++) {
        const nm = NM0 + s * 2
        const v = cones(nm)[c]
        if (s === 0) ctx.moveTo(xOf(nm), yOf(v))
        else ctx.lineTo(xOf(nm), yOf(v))
      }
      ctx.stroke()
      const la = smoothstep(t0 + 1.4, t0 + 2.2, lt)
      if (la > 0) {
        const px = xOf(PEAKS[c])
        text(ctx, plot.w < 300 ? CONE_NAME[c] : `${CONE_NAME[c]} ${PEAKS[c]}`, px + (c === 1 ? -6 : 6), yOf(1) - 6, { size: small ? 8.5 : 10, color: CONE_COL[c], align: c === 1 ? 'right' : 'left', tracking: 0.08, alpha: la })
      }
    }
    ctx.lineWidth = 1
    ctx.restore()
  }

  /** The probe: a hairline at λ, a dot on each curve, a handle on the spectrum. */
  function drawProbe(nm: number, alpha: number, hot: boolean) {
    if (alpha <= 0) return
    const x = xOf(nm)
    const q = cones(nm)
    const sy = plot.y + plot.h + 6
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = hot ? k.ink : k.ink2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, plot.y - 2)
    ctx.lineTo(x, sy + stripH)
    ctx.stroke()
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = CONE_COL[c]
      ctx.beginPath()
      ctx.arc(x, yOf(q[c]), small ? 2.5 : 3.2, 0, TAU)
      ctx.fill()
    }
    // the handle
    ctx.fillStyle = css(spec(nm))
    ctx.strokeStyle = k.ink
    ctx.beginPath()
    ctx.arc(x, sy + stripH / 2, hot ? 7 : 5.5, 0, TAU)
    ctx.fill()
    ctx.stroke()
    // its wavelength, beside the line just under the top of the plot, on a dark backing
    const ls = small ? 8.5 : 10
    const lab = `${nm.toFixed(0)} nm`
    setFont(ctx, { size: ls, tracking: 0.08 })
    const lw = ctx.measureText(lab).width
    const right = x + 8 + lw < plot.x + plot.w
    const lx = right ? x + 7 : x - 7 - lw
    const ly = plot.y + plot.h * 0.12 + ls
    ctx.fillStyle = 'rgba(11,29,36,0.82)'
    ctx.fillRect(lx - 3, ly - ls, lw + 6, ls + 5)
    text(ctx, lab, lx, ly, { size: ls, color: k.ink, tracking: 0.08 })
    ctx.restore()
  }

  /** Three bars, L M S, with values. */
  function bars(q: V3, x: number, y: number, bw: number, alpha: number, rowH: number) {
    ctx.save()
    ctx.globalAlpha = alpha
    const sz = small ? 8.5 : 9.5
    for (let c = 0; c < 3; c++) {
      const yy = y + c * rowH
      text(ctx, CONE_NAME[c], x, yy + sz * 0.4, { size: sz, color: CONE_COL[c], baseline: 'middle', tracking: 0.1 })
      const bx = x + sz * 1.6
      const bl = bw - sz * 1.6 - sz * 4.4
      ctx.strokeStyle = k.rule
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(bx) + 0.5, Math.round(yy - 3) + 0.5, Math.round(bl), 6)
      ctx.fillStyle = CONE_COL[c]
      ctx.fillRect(Math.round(bx) + 0.5, Math.round(yy - 3) + 0.5, Math.max(0, bl * clamp(q[c])), 6)
      text(ctx, q[c].toFixed(3), bx + bl + 8, yy + sz * 0.4, { size: sz, color: k.ink, baseline: 'middle', tracking: 0.04 })
    }
    ctx.restore()
  }

  function readoutI(nm: number, alpha: number) {
    if (alpha <= 0) return
    const q = cones(nm)
    const col = css(spec(nm))
    ctx.save()
    ctx.globalAlpha = alpha
    if (!tall) {
      const big = clamp(ro.w * 0.2, 26, 64)
      const sw = clamp(ro.w * 0.28, 40, 110)
      let y = ro.y + (h < 440 ? 4 : 30)
      text(ctx, 'THE PROBE', ro.x, y, { size: 8.5, color: k.muted, tracking: 0.14 })
      y += big * 0.95 + 6
      text(ctx, `${nm.toFixed(0)}`, ro.x, y, { font: 'serif', size: big, color: k.ink })
      setFont(ctx, { font: 'serif', size: big })
      const nw = ctx.measureText(nm.toFixed(0)).width
      text(ctx, 'nm', ro.x + nw + 6, y, { font: 'serif', size: big * 0.5, italic: true, color: k.ink2 })
      // the color it makes
      const cx = ro.x + ro.w - sw / 2
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(cx, y - big * 0.32, sw / 2, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = k.rule
      ctx.stroke()
      y += 18
      text(ctx, colorName(nm), ro.x, y, { size: 9, color: k.ink2, tracking: 0.14 })
      y += h < 440 ? 18 : 30
      bars(q, ro.x, y, ro.w, 1, h < 440 ? 15 : 20)
      y += (h < 440 ? 15 : 20) * 3 + 8
      if (h >= 440 && !small) {
        text(ctx, 'THREE NUMBERS PER WAVELENGTH', ro.x, y + 6, { size: 8, color: k.muted, tracking: 0.14 })
        text(ctx, 'ARE ALL THE EYE KEEPS', ro.x, y + 19, { size: 8, color: k.muted, tracking: 0.14 })
      }
    } else {
      const sw = clamp(ro.h * 0.5, 30, 90)
      const big = clamp(sw * 0.55, 20, 44)
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(ro.x + sw / 2, ro.y + sw / 2, sw / 2, 0, TAU)
      ctx.fill()
      const tx = ro.x + sw + 16
      text(ctx, `${nm.toFixed(0)}`, tx, ro.y + big * 0.9, { font: 'serif', size: big, color: k.ink })
      setFont(ctx, { font: 'serif', size: big })
      const nw = ctx.measureText(nm.toFixed(0)).width
      text(ctx, 'nm', tx + nw + 5, ro.y + big * 0.9, { font: 'serif', size: big * 0.5, italic: true, color: k.ink2 })
      text(ctx, colorName(nm), tx, ro.y + big * 0.9 + 16, { size: 8.5, color: k.ink2, tracking: 0.14 })
      const by = ro.y + Math.max(sw, big + 20) + 18
      if (by + 40 < ro.y + ro.h + 10) bars(q, ro.x, by, ro.w, 1, 16)
      if (by + 100 < ro.y + ro.h) text(ctx, 'THREE NUMBERS PER WAVELENGTH ARE ALL THE EYE KEEPS', ro.x, by + 72, { size: 8, color: k.muted, tracking: 0.12 })
    }
    ctx.restore()
  }

  /** Chapter II: light A (one wavelength) and light B (two), with their cone catches and colors. */
  function readoutII(nm: number, alpha: number, T: number) {
    if (alpha <= 0) return
    const m = metamer(nm)
    const qa = cones(nm)
    const showB = smoothstep(26.4, 27.4, T)
    const verdict = smoothstep(27.6, 28.6, T)
    const colA = css(spec(nm))
    const colB = m.ok ? css(colorOfLms(m.q, 0.3 + 0.7 * clamp((nm - 395) / 45) * clamp((715 - nm) / 55))) : 'rgba(0,0,0,0)'
    const sz = small ? 8 : 9
    const rowH = small ? 13 : 16
    const y0 = ro.y + (tall ? 0 : h < 440 ? 4 : 30)
    const bottom = ro.y + ro.h
    const disc = (x: number, y: number, r: number, col: string) => {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = k.rule
      ctx.stroke()
    }
    const noMix = (x: number, y: number) => {
      text(ctx, 'NO POSITIVE MIX', x, y, { size: sz, color: '#E58A6E', tracking: 0.12 })
      text(ctx, 'OF 545 + 630 nm', x, y + sz + 5, { size: sz, color: '#E58A6E', tracking: 0.12 })
      text(ctx, 'MATCHES IT', x, y + sz * 2 + 10, { size: sz, color: '#E58A6E', tracking: 0.12 })
    }
    ctx.save()
    ctx.globalAlpha = alpha
    if (ro.w >= 260) {
      // two columns: A and B, each with its color and its three cone catches
      const colW = (ro.w - 20) / 2
      const sw = clamp(Math.min(colW * 0.42, bottom - y0 - (sz * 2 + 14) - 16 - rowH * 3 - 26), 16, 84)
      const cy = y0 + sz * 2 + 14 + sw / 2
      const col = (x: number, title: string, sub: string, q: V3, c: string, a: number, ok: boolean) => {
        ctx.globalAlpha = alpha * a
        text(ctx, title, x, y0, { size: sz, color: k.muted, tracking: 0.14 })
        text(ctx, sub, x, y0 + sz + 6, { size: sz, color: k.ink, tracking: 0.06 })
        if (!ok) return noMix(x, cy - sz)
        disc(x + sw / 2, cy, sw / 2, c)
        bars(q, x, cy + sw / 2 + 16, colW, alpha * a, rowH)
      }
      col(ro.x, 'LIGHT A', `${nm.toFixed(0)} nm ALONE`, qa, colA, 1, true)
      col(ro.x + colW + 20, 'LIGHT B', m.ok ? `${m.a.toFixed(2)} × 545 + ${m.b.toFixed(2)} × 630` : '545 + 630 nm', m.q, colB, showB, m.ok)
      if (m.ok && verdict > 0) {
        ctx.globalAlpha = alpha * verdict
        text(ctx, '=', ro.x + colW + 10, cy + 8, { font: 'serif', size: clamp(sw * 0.5, 16, 34), color: k.ink, align: 'center' })
        const ly = cy + sw / 2 + 16 + rowH * 3 + 10
        if (ly < bottom + 6) text(ctx, 'SAME L, M, S · METAMERS', ro.x, ly, { size: sz, color: '#86C79A', tracking: 0.14 })
      }
    } else {
      // a narrow column: the two colors side by side, then one set of bars
      const sw = clamp(Math.min(ro.w * 0.3, bottom - y0 - 3 * (sz + 7) - rowH * 3 - 30), 14, 60)
      const cy = y0 + sw / 2
      disc(ro.x + sw / 2, cy, sw / 2, colA)
      text(ctx, 'A', ro.x + sw / 2, cy + sw / 2 + sz + 4, { size: sz, color: k.muted, align: 'center', tracking: 0.1 })
      ctx.globalAlpha = alpha * showB
      if (m.ok) {
        disc(ro.x + sw * 2.1, cy, sw / 2, colB)
        text(ctx, 'B', ro.x + sw * 2.1, cy + sw / 2 + sz + 4, { size: sz, color: k.muted, align: 'center', tracking: 0.1 })
        ctx.globalAlpha = alpha * verdict
        text(ctx, '=', ro.x + sw * 1.3, cy + 6, { font: 'serif', size: clamp(sw * 0.55, 14, 28), color: k.ink, align: 'center' })
      } else noMix(ro.x + sw * 1.4, cy - sz)
      ctx.globalAlpha = alpha
      let y = cy + sw / 2 + sz * 2 + 12
      text(ctx, `A · ${nm.toFixed(0)} nm`, ro.x, y, { size: sz, color: k.ink, tracking: 0.06 })
      y += sz + 6
      ctx.globalAlpha = alpha * showB
      if (m.ok) text(ctx, `B · ${m.a.toFixed(2)}×545 + ${m.b.toFixed(2)}×630`, ro.x, y, { size: sz - 0.5, color: k.ink, tracking: 0.02 })
      ctx.globalAlpha = alpha
      y += sz + 14
      if (y + rowH * 2 < bottom) bars(qa, ro.x, y, ro.w, 1, rowH)
    }
    ctx.restore()
  }

  /** Chapter II on the plot: the lights themselves, as spectral lines. */
  function spikes(nm: number, T: number, alpha: number) {
    const m = metamer(nm)
    const sa = smoothstep(24, 24.8, T) * alpha
    const sb = smoothstep(26.4, 27.4, T) * alpha
    const scale = 0.62 / Math.max(1, m.ok ? Math.max(m.a, m.b) : 1)
    ctx.save()
    ctx.lineWidth = 2.5
    if (sa > 0) {
      ctx.globalAlpha = sa
      ctx.strokeStyle = css(spec(nm))
      ctx.beginPath()
      ctx.moveTo(xOf(nm), yOf(0))
      ctx.lineTo(xOf(nm), yOf(scale))
      ctx.stroke()
      if (!small) text(ctx, 'A', xOf(nm) + 6, yOf(scale) + 4, { size: 9, color: k.ink, tracking: 0.1 })
    }
    if (sb > 0 && m.ok) {
      ctx.globalAlpha = sb
      ctx.setLineDash([3, 3])
      for (const [p, amt] of [
        [545, m.a],
        [630, m.b],
      ]) {
        ctx.strokeStyle = css(spec(p))
        ctx.beginPath()
        ctx.moveTo(xOf(p), yOf(0))
        ctx.lineTo(xOf(p), yOf(amt * scale))
        ctx.stroke()
        if (!small) text(ctx, 'B', xOf(p) + 6, yOf(amt * scale) + 4, { size: 9, color: k.ink2, tracking: 0.1 })
      }
      ctx.setLineDash([])
    }
    ctx.restore()
  }

  function drawGarden(T: number, alpha: number) {
    if (gardenDirty) buildGarden()
    const { from, to, mix } = visionAt(T)
    // the visions on screen now are built at once; the rest, one per frame
    const need = [from, to, divX >= 0 ? 1 : 0].filter((v) => v > 0 && !simCanvas[v])
    for (const v of need) {
      buildSim(v)
      simQueue = simQueue.filter((q) => q !== v)
    }
    if (!need.length && simQueue.length) {
      const v = simQueue.shift()
      if (v !== undefined) buildSim(v)
    }
    if (!garden) return
    const img = (v: number) => simCanvas[v] ?? garden
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.drawImage(img(from) as HTMLCanvasElement, gd.x, gd.y, gd.w, gd.h)
    if (mix < 1 || from !== to) {
      ctx.globalAlpha = alpha * mix
      ctx.drawImage(img(to) as HTMLCanvasElement, gd.x, gd.y, gd.w, gd.h)
    }
    // compare: typical vision to the left of the divider
    if (divFrac > 0) {
      divX = gd.x + gd.w * divFrac
      divHold = 0
    }
    const dv = divX >= 0 ? divX : -1
    if (dv >= 0) {
      const cur = mix > 0.5 ? to : from
      const shown = cur === 0 ? 1 : cur
      ctx.globalAlpha = alpha
      ctx.save()
      ctx.beginPath()
      ctx.rect(gd.x, gd.y, dv - gd.x, gd.h)
      ctx.clip()
      ctx.drawImage(garden, gd.x, gd.y, gd.w, gd.h)
      ctx.restore()
      if (cur === 0) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(dv, gd.y, gd.x + gd.w - dv, gd.h)
        ctx.clip()
        ctx.drawImage(img(shown) as HTMLCanvasElement, gd.x, gd.y, gd.w, gd.h)
        ctx.restore()
      }
      ctx.strokeStyle = C.paper
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(dv + 0.5, gd.y)
      ctx.lineTo(dv + 0.5, gd.y + gd.h)
      ctx.stroke()
      ctx.fillStyle = C.paper
      ctx.beginPath()
      ctx.arc(dv, gd.y + gd.h / 2, 6, 0, TAU)
      ctx.fill()
      const sz = 8
      if (dv - gd.x > 90) text(ctx, 'TYPICAL', dv - 8, gd.y + 14, { size: sz, color: C.paper, align: 'right', tracking: 0.14 })
      if (gd.x + gd.w - dv > 110) text(ctx, VISIONS[shown].short, dv + 8, gd.y + 14, { size: sz, color: C.paper, tracking: 0.14 })
    }
    ctx.restore()
    // the plate's frame
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = k.rule
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(gd.x) - 0.5, Math.round(gd.y) - 0.5, Math.round(gd.w) + 1, Math.round(gd.h) + 1)
    ctx.strokeStyle = k.ink2
    cropMarks(ctx, gd.x - 6, gd.y - 6, gd.w + 12, gd.h + 12, small ? 6 : 9)
    ctx.restore()
  }

  /** The vision panel: name, what is missing, prevalence, and the three curves with the missing one dashed. */
  function visionPanel(T: number, alpha: number) {
    const { from, to, mix } = visionAt(T)
    const v = mix > 0.5 ? to : from
    const V = VISIONS[v]
    const a = alpha * (from === to ? 1 : Math.abs(mix - 0.5) * 2)
    let x: number
    let y: number
    let pw: number
    if (!tall) {
      x = ro.x
      y = ro.y + (h < 440 ? 4 : 30)
      pw = ro.w
    } else {
      x = pad
      y = gd.y + gd.h + 22
      pw = w - pad * 2
    }
    const avail = (tall ? capY - 10 : h < 440 ? capY - 8 : ro.y + ro.h) - y
    const y0p = y
    ctx.save()
    ctx.globalAlpha = a
    const ts = clamp(pw * 0.11, 18, 34)
    text(ctx, pinnedVision >= 0 ? 'VISION · PINNED' : 'VISION', x, y, { size: 8.5, color: k.muted, tracking: 0.14 })
    y += ts + 6
    setFont(ctx, { font: 'serif', size: ts })
    const nw = ctx.measureText(V.name + (v === 0 ? ' ' : '')).width
    text(ctx, V.name + (v === 0 ? ' ' : ''), x, y, { font: 'serif', size: ts, color: k.ink })
    text(ctx, V.em, x + nw, y, { font: 'serif', size: ts, italic: true, color: '#9DB9A0' })
    y += 18
    for (const ln of V.lines) {
      if (y > y0p + avail) break
      text(ctx, ln, x, y, { size: small ? 8 : 9, color: k.ink2, tracking: 0.12 })
      y += small ? 13 : 15
    }
    // the mini plot
    const mh = Math.min(70, avail - (y - (tall ? gd.y + gd.h + 22 : ro.y)) - 40)
    if (mh > 30 && !tiny) {
      const mx = x
      const my = y + 10
      const mw = Math.min(pw, 240)
      ctx.strokeStyle = k.rule
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(mx, my + mh)
      ctx.lineTo(mx + mw, my + mh)
      ctx.stroke()
      for (const c of [2, 1, 0]) {
        const gone = c === V.missing
        ctx.strokeStyle = gone ? rgba('#E4ECE8', 0.3) : CONE_COL[c]
        ctx.setLineDash(gone ? [2, 3] : [])
        ctx.beginPath()
        for (let s = 0; s <= 66; s++) {
          const nm = NM0 + s * 5
          const xx = mx + ((nm - NM0) / (NM1 - NM0)) * mw
          const yy = my + mh * (1 - cones(nm)[c])
          if (s === 0) ctx.moveTo(xx, yy)
          else ctx.lineTo(xx, yy)
        }
        ctx.stroke()
      }
      ctx.setLineDash([])
      y = my + mh + 16
      if (V.missing >= 0) text(ctx, `${CONE_NAME[V.missing]} — MISSING`, mx, y, { size: 8, color: k.muted, tracking: 0.14 })
      else text(ctx, 'L · M · S', mx, y, { size: 8, color: k.muted, tracking: 0.14 })
      y += 16
    }
    if (!small && y + 40 < (tall ? capY - 10 : ro.y + ro.h)) {
      text(ctx, 'ALL RED–GREEN TYPES TOGETHER', x, y + 8, { size: 8, color: k.muted, tracking: 0.14 })
      text(ctx, '≈ 8% OF MEN · 0.5% OF WOMEN', x, y + 21, { size: 8, color: k.ink2, tracking: 0.14 })
      text(ctx, 'NORTHERN EUROPEAN ANCESTRY', x, y + 34, { size: 8, color: k.muted, tracking: 0.14 })
      if (y + 70 < (tall ? capY - 10 : ro.y + ro.h)) text(ctx, 'SIMULATION · BRETTEL, VIÉNOT & MOLLON 1997', x, y + 56, { size: 8, color: k.muted, tracking: 0.14 })
    }
    ctx.restore()
  }

  function captions(T: number) {
    for (const c of CAPS) {
      if (T < c.t0 - 0.1 || T > c.t1 + 0.1) continue
      const lineH = capSize * 1.06
      const lines = [
        { s: c.a, em: '' },
        { s: c.b, em: c.em },
      ]
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - c.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (c.t1 - 0.7 + li * 0.08)) / 0.6))
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
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: k.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: '#9DB9A0' })
        ctx.restore()
      })
    }
  }

  function header(T: number) {
    const hs = small ? 8.5 : 10
    const hy = pad + (small ? 2 : 6)
    ctx.strokeStyle = '#7FB6D9'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, 'FIG. C.10', pad + 26, hy, { size: hs, color: '#7FB6D9', tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const fw = ctx.measureText('FIG. C.10').width
    text(ctx, w < 560 ? 'THREE CONES' : 'THREE CONES · STOCKMAN & SHARPE 2°', pad + 26 + fw + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    const c = CHAPTERS[chapterAt(T)]
    if (w > 400) text(ctx, `${c.num} — ${c.name.toUpperCase()}`, w - pad, hy, { size: hs, color: k.ink2, align: 'right', tracking: 0.14 })
  }

  function ruler(T: number) {
    if (tiny && w < 500) return
    const x0 = pad
    const x1 = w - pad
    const yb = rulerY
    ctx.lineWidth = 1
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    ctx.moveTo(x0, yb)
    ctx.lineTo(x1, yb)
    for (let i = 0; i <= 42; i++) {
      const x = lerp(x0, x1, i / 42)
      ctx.moveTo(x, yb)
      ctx.lineTo(x, yb - (i % 5 === 0 ? 4 : 2))
    }
    ctx.stroke()
    const ci = chapterAt(T)
    CHAPTERS.forEach((cc, i) => {
      const x = lerp(x0, x1, cc.t / LOOP)
      const label = w > 640 ? `${cc.num} · ${cc.name.toUpperCase()}` : cc.num
      text(ctx, label, x + 4, yb - 7, { size: small ? 8 : 8.5, color: i === ci ? k.ink : hoverRuler === i ? '#7FB6D9' : k.muted, tracking: 0.12 })
    })
    ctx.strokeStyle = k.ink
    ctx.beginPath()
    const xp = lerp(x0, x1, T / LOOP)
    ctx.moveTo(xp, yb + 3)
    ctx.lineTo(xp, yb - 7)
    ctx.stroke()
  }

  function hints(T: number) {
    if (preview || tiny) return
    const ch = chapterAt(T)
    const sz = small ? 8 : 9
    const y = rulerY - (small ? 18 : 24)
    const narrow = w < 560
    let s = ''
    if (ch < 2) s = narrow ? 'DRAG THE PROBE' : ch === 0 ? 'DRAG THE PROBE ALONG THE SPECTRUM · ← → CHAPTERS' : 'DRAG THE PROBE TO CHOOSE THE YELLOW · B RE-SOLVES'
    else s = narrow ? 'TAP: VISION · DRAG: COMPARE' : pinnedVision >= 0 ? 'TAP TO SWITCH VISION · BACK TO TYPICAL TO RESUME' : 'TAP TO SWITCH VISION · DRAG TO COMPARE WITH TYPICAL'
    const clash = !tall && h < 440 && capY + capSize * 2.3 > y - 10
    if (!clash && !(tall && capY + capSize * 2.3 > y - 6)) text(ctx, s, w - pad, y, { size: sz, color: k.muted, align: 'right', tracking: 0.14, alpha: interacted ? 0.55 : 1 })
    if (interacted || clock > LOOP) return
    // ghosts: a ring pulsing on the probe's handle; a tap ripple on the garden
    if (T > 6.5 && T < 11) {
      const a = smoothstep(6.5, 7, T) * (1 - smoothstep(10.5, 11, T))
      const x = xOf(probeAt(T))
      const yy = plot.y + plot.h + 6 + stripH / 2
      const pulse = 0.5 + 0.5 * Math.sin(T * 6)
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = k.ink
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(x, yy, 11 + pulse * 4, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, 'DRAG ME', x, yy + 26, { size: 8.5, color: k.ink, align: 'center', tracking: 0.14 })
      ctx.restore()
    }
    if (T > 44.5 && T < 49) {
      const g = (T - 44.5) % 1.5 / 1.5
      const a = smoothstep(44.5, 45, T) * (1 - smoothstep(48.5, 49, T))
      const gx = gd.x + gd.w * 0.62
      const gy = gd.y + gd.h * 0.3
      ctx.save()
      ctx.globalAlpha = a * (1 - g)
      ctx.strokeStyle = C.paper
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(gx, gy, 6 + g * 24, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.paper
      ctx.beginPath()
      ctx.arc(gx, gy, 3, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
  }

  /* --------------------------------------------------------------- frame */
  let prevT = -1
  const fontsLoaded = () => {
    try {
      return typeof document === 'undefined' || !document.fonts || document.fonts.check('40px "Instrument Serif"')
    } catch {
      return true
    }
  }
  let fontsReady = fontsLoaded()

  function nextVision() {
    const T = Tnow()
    const { from, to, mix } = visionAt(T)
    const cur = mix > 0.5 ? to : from
    const nxt = (cur + 1) % 4
    pinnedVision = nxt === 0 ? -1 : nxt
    env.sfx.tone([392, 440, 493.88, 587.33][nxt], 0.9, { type: 'sine', gain: 0.035, room: 0.4 })
  }

  return {
    resize() {
      layout()
    },
    frame(_t, dt) {
      if (!fontsReady && fontsLoaded()) {
        fontsReady = true
        layout()
      }
      const holding = dragProbe || pinnedVision >= 0 || dragDiv
      if (!holding) clock += dt
      const T = Tnow()
      const ch = chapterAt(T)
      // the probe returns to the timeline after a drag
      if (!dragProbe && userW > 0 && dt > 0) userW = Math.max(0, userW - dt / (ch === 1 ? 6 : 2.5))
      if (divX >= 0 && !dragDiv && dt > 0) {
        divHold += dt
        if (divHold > 6 || ch !== 2) divX = -1
      }
      if (ch !== 2 && pinnedVision >= 0 && !env.params.has('vision')) pinnedVision = -1

      // sound
      const crossed = (te: number) => dt > 0 && prevT >= 0 && prevT < te && te <= T
      if (crossed(27.6)) {
        env.sfx.tone(523.25, 1.8, { type: 'sine', gain: 0.03, to: 587.33, room: 0.5 })
        env.sfx.tone(659.25, 1.8, { type: 'sine', gain: 0.03, to: 587.33, room: 0.5 })
      }
      for (const [t0, v] of VSEQ) if (crossed(t0 + 0.2) && t0 > 42) [261.63, 329.63, 392].forEach((f, j) => env.sfx.tone(f * [1, 1.12, 1.06, 0.94][v], 2.5, { type: 'sine', gain: 0.022, attack: 0.3, room: 0.6, when: j * 0.07 }))
      if (ch === 0 && dt > 0) {
        const a = probeAt(prevT)
        const b = probeAt(T)
        for (let c = 0; c < 3; c++) if ((a - PEAKS[c]) * (b - PEAKS[c]) < 0) env.sfx.tone([392, 523.25, 659.25][c], 0.7, { type: 'sine', gain: 0.03, room: 0.4 })
      }

      ground(ctx, w, h, 'night')
      // chapters I–II: the plot; III: the garden (crossfading at the seams)
      const plotA = 1 - smoothstep(41.2, 42.6, T) + smoothstep(80.5, 83.5, T)
      const gardenA = smoothstep(41.6, 43.2, T) * (1 - smoothstep(80.2, 82.2, T))
      const nm = probeNow(T)
      if (plotA > 0.01) {
        const pA = Math.min(1, plotA)
        drawPlot(T >= 80 ? T - 80 + 0.01 : T, pA)
        if (ch === 1 || (T > 22 && T < 42)) spikes(nm, T, pA)
        const probeA = (T < 80 ? smoothstep(5.2, 6.2, T) : 0) * pA
        drawProbe(nm, probeA, dragProbe)
        const iA = smoothstep(5.2, 6.4, T) * (1 - smoothstep(22.2, 23.2, T)) * pA
        readoutI(nm, iA)
        readoutII(nm, smoothstep(23.4, 24.4, T) * (1 - smoothstep(40.6, 41.6, T)) * pA, T)
      }
      if (gardenA > 0.01) {
        drawGarden(T, gardenA)
        visionPanel(T, gardenA)
      } else if (T > 36 && gardenDirty) buildGarden()
      else if (T > 36 && simQueue.length) {
        const v = simQueue.shift()
        if (v !== undefined) buildSim(v)
      }
      captions(T)
      header(T)
      ruler(T)
      hints(T)
      if (!preview) {
        const cur = hoverRuler >= 0 ? 'pointer' : ch < 2 ? (dragProbe ? 'grabbing' : 'ew-resize') : dragDiv ? 'ew-resize' : 'pointer'
        env.setCursor(cur)
      }
      prevT = T
    },
    pointer(p) {
      if (preview) return
      const T = Tnow()
      const ch = chapterAt(T)
      if (p.type === 'leave') {
        hoverRuler = -1
        dragProbe = false
        dragDiv = false
        downAt = null
        return
      }
      const onRuler = p.y > rulerY - 20 && p.y < h && !(tiny && w < 500)
      hoverRuler = onRuler && !dragProbe && !dragDiv ? CHAPTERS.reduce((acc, c, i) => (p.x >= lerp(pad, w - pad, c.t / LOOP) ? i : acc), 0) : -1
      if (p.type === 'down') {
        downAt = { x: p.x, y: p.y }
        if (onRuler) {
          interacted = true
          pinnedVision = -1
          clock += CHAPTERS[hoverRuler].t + 0.01 - T
          downAt = null
          return
        }
        if (ch < 2 && p.x > plot.x - 20 && p.x < plot.x + plot.w + 20 && p.y > plot.y - 30 && p.y < plot.y + plot.h + stripH + 40) {
          interacted = true
          dragProbe = true
          userNm = nmOf(p.x)
          userW = 1
        }
        return
      }
      if (p.type === 'move' && p.pressed) {
        if (dragProbe) {
          userNm = nmOf(p.x)
          userW = 1
          return
        }
        if (ch === 2 && downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) > 6 && p.x >= gd.x && p.x <= gd.x + gd.w) dragDiv = true
        if (dragDiv) {
          interacted = true
          divX = clamp(p.x, gd.x, gd.x + gd.w)
          divHold = 0
        }
        return
      }
      if (p.type === 'up') {
        if (ch === 2 && downAt && !dragDiv && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 8 && p.y < rulerY - 20) {
          interacted = true
          nextVision()
        }
        dragProbe = false
        dragDiv = false
        downAt = null
      }
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight' && code !== 'Space' && code !== 'Enter') return false
      if (!down) return true
      interacted = true
      const T = Tnow()
      const ch = chapterAt(T)
      if (code === 'Space' || code === 'Enter') {
        if (ch === 2) nextVision()
        return true
      }
      pinnedVision = -1
      if (code === 'ArrowRight') clock += (ch === CHAPTERS.length - 1 ? LOOP : CHAPTERS[ch + 1].t) + 0.01 - T
      else {
        const target = T - CHAPTERS[ch].t < 1.5 && ch > 0 ? CHAPTERS[ch - 1].t : CHAPTERS[ch].t
        clock += target + 0.01 - T
      }
      return true
    },
  }
}

export default create
