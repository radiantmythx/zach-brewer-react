/*
 * FIG. T.04 — HALF-LIFE
 *
 * Chance, by the thousand, becomes a clock. A lattice of up to 2,500 atoms,
 * each with its own decay time drawn once from the exponential distribution
 * (t = −log₂ u half-lives, u uniform): nothing tells an atom when to go, and
 * an atom that has waited is no more likely to go next. Each decay flashes a
 * small ring and leaves a hatched daughter. Beside the lattice the count of
 * survivors is drawn exactly, step by step, over the smooth law N₀ 2^(−t/t½)
 * and its binomial spread, so the sample-size slider shows randomness
 * smoothing out as 1/√N. Then the same law as a clock: charcoal from a hearth
 * with 61.6 % of its carbon-14 left is 4,000 years old, and a zircon with
 * 49.4 % of its uranium-238 left is as old as the Earth, 4.54 billion years.
 *
 * Five chapters over 78 s, a pure function of time and the sample:
 *   I    One atom       "this one?" — no atom knows when it will go
 *   II   Many atoms     the curve, ½ ¼ ⅛, and the sample size swept 1,600 → 25
 *   III  Carbon-14      a fresh sample fast-forwarded 4,000 years: a cold hearth
 *   IV   The Earth      uranium-238 in a zircon, fast-forwarded 4.54 Gyr
 *   V    Begin again    a fresh lattice
 *
 * Sound: a soft Geiger click per decay (thinned when they crowd), a chime
 * when the marked atom goes. Interaction: drag the slider to change the
 * sample size; tap the lattice (or Space) for a new isotope and a fresh
 * sample (in III–IV, a fresh piece to date). ← → step chapters; the ruler
 * along the bottom seeks.
 */

import { C, TAU, clamp, ease, ground, inkOn, lerp, makeNoise, rgba, rng, setFont, smoothstep, text, type TextOpts } from '../kit'
import type { CreatePiece } from '../types'

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

const FIG = 'FIG. T.04'
const LOOP = 78
const CHAPTERS = [
  { t: 0, num: 'I', name: 'One atom' },
  { t: 14, num: 'II', name: 'Many atoms' },
  { t: 40, num: 'III', name: 'Carbon-14' },
  { t: 58, num: 'IV', name: 'The age of the Earth' },
  { t: 72, num: 'V', name: 'Begin again' },
]
/** display seconds per half-life in chapters I–II */
const DHL = 6.5
const NMAX = 2500
const NMIN = 16
const N_DEFAULT = 1600
const YEAR = 365.25 * 86400

interface Iso {
  name: string
  short: string
  daughter: string
  /** seconds */
  half: number
  shown: string
}

const ISOTOPES: Iso[] = [
  { name: 'Protactinium-234m', short: 'Pa-234m', daughter: 'uranium-234', half: 69.5, shown: '1.16 min' },
  { name: 'Barium-137m', short: 'Ba-137m', daughter: 'barium-137', half: 153.1, shown: '2.55 min' },
  { name: 'Radon-220', short: 'Rn-220', daughter: 'polonium-216', half: 55.6, shown: '55.6 s' },
  { name: 'Iodine-131', short: 'I-131', daughter: 'xenon-131', half: 8.0252 * 86400, shown: '8.02 days' },
  { name: 'Carbon-14', short: 'C-14', daughter: 'nitrogen-14', half: 5730 * YEAR, shown: '5,730 yr' },
  { name: 'Uranium-238', short: 'U-238', daughter: 'lead-206', half: 4.468e9 * YEAR, shown: '4.47 Gyr' },
]
const C14 = 4
const U238 = 5
/** the charcoal: 4,000 years; the Earth: 4.54 billion years (in half-lives) */
const H_HEARTH = 4000 / 5730
const H_EARTH = 4.54 / 4.468
const FF0 = 1.6
const FF1 = 5.6

interface Seg {
  s: string
  em?: string
  tail?: string
}
interface Caption {
  t0: number
  t1: number
  lines: Seg[]
}

const CAPTIONS: Caption[] = [
  { t0: 1.2, t1: 12.2, lines: [{ s: 'No atom knows' }, { s: 'when it will ', em: 'go.' }] },
  { t0: 16.0, t1: 26.4, lines: [{ s: 'Together they keep' }, { s: '', em: 'perfect time.' }] },
  { t0: 46.6, t1: 56.6, lines: [{ s: 'Someone sat by this fire' }, { s: '', em: 'four thousand years ago.' }] },
  { t0: 64.2, t1: 71.4, lines: [{ s: 'And the Earth is' }, { s: '', em: 'one half-life', tail: ' of uranium old.' }] },
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** "1 s here = …" in a human unit */
function fmtDur(sec: number) {
  if (sec < 120) return `${sec < 10 ? sec.toFixed(1) : Math.round(sec)} s`
  if (sec < 7200) return `${(sec / 60).toFixed(sec < 600 ? 1 : 0)} min`
  if (sec < 172800) return `${(sec / 3600).toFixed(1)} hours`
  if (sec < 2 * YEAR) return `${(sec / 86400).toFixed(1)} days`
  const y = sec / YEAR
  if (y < 1e6) return `${Math.round(y).toLocaleString('en-US')} years`
  if (y < 1e9) return `${(y / 1e6).toFixed(0)} million years`
  return `${(y / 1e9).toFixed(2)} billion years`
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const k = inkOn('night')
  const INK = '#E4ECE8'
  const noise = makeNoise(7)

  /* --------------------------------------------------------- the sample */

  const hAll = new Float64Array(NMAX)
  const sorted = new Float64Array(NMAX)
  let sampleKey = ''
  let N = preview ? 900 : N_DEFAULT
  let iso = 0
  let resets = 0
  let marked = -1

  /** Draw every atom's decay time once: t = −log₂ u half-lives (exponential, memoryless). */
  function sample(seed: number, n: number) {
    const key = `${seed}:${n}`
    if (key === sampleKey) return
    sampleKey = key
    const r = rng(seed * 2654435761)
    for (let i = 0; i < NMAX; i++) {
      let u = r()
      while (u === 0) u = r()
      hAll[i] = -Math.log2(u)
    }
    for (let i = 0; i < n; i++) sorted[i] = hAll[i]
    sorted.subarray(0, n).sort()
    marked = -1
  }
  /** decays up to h half-lives (binary search in the sorted times) */
  function decayedBy(h: number) {
    let lo = 0
    let hi = N
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (sorted[m] <= h) lo = m + 1
      else hi = m
    }
    return lo
  }

  /* --------------------------------------------------------- layout */

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
  // the lattice square and the slider (px)
  let lx = 0
  let ly = 0
  let L = 100
  let slX0 = 0
  let slX1 = 0
  let slY = 0

  function layout() {
    w = env.width
    h = env.height
    stacked = h > w * 1.15
    short = !stacked && h < 440
    tiny = h < 260
    narrow = w < 520
    pad = clamp(Math.min(w, h) * 0.045, preview || short ? 10 : 14, 40)
    topY = pad + (tiny ? 30 : preview || short ? 36 : 50)
    rulerY = !preview && h >= 330 ? h - pad * 0.55 : -1
    botY = rulerY > 0 ? rulerY - (short ? 18 : 24) : h - pad
    const gap = clamp(w * 0.035, 14, 56)
    if (stacked) {
      capSize = clamp(Math.min(w * 0.068, h * 0.042), 17, 40)
      hero.x = pad
      hero.w = w - pad * 2
      hero.y = topY
      hero.h = Math.min(hero.w + 40, (botY - topY - capSize * 2.4) * 0.56)
      info.x = pad
      info.w = w - pad * 2
      info.y = hero.y + hero.h + 14
      info.h = botY - info.y
    } else {
      const ratio = short ? 0.42 : 0.47
      hero.x = pad
      hero.w = (w - pad * 2 - gap) * ratio
      hero.y = topY
      hero.h = botY - topY
      info.x = hero.x + hero.w + gap
      info.w = w - pad - info.x
      info.y = topY
      info.h = botY - topY
      capSize = clamp(Math.min(info.w * 0.07, h * (short ? 0.085 : 0.058)), tiny ? 14 : 15, 46)
    }
    capX = info.x
    capY = info.y + info.h - capSize * 1.04 - capSize * 0.28
    const slH = preview ? 0 : tiny ? 22 : 34
    L = Math.max(40, Math.min(hero.w * (stacked ? 0.78 : 0.9), hero.h - slH - 8))
    lx = hero.x + (hero.w - L) / 2
    ly = hero.y + (hero.h - slH - L) / 2
    slX0 = lx + (tiny ? 34 : 70)
    slX1 = lx + L - 6
    slY = ly + L + (tiny ? 14 : 22)
  }
  layout()

  /* ---------------------------------------------------------- clock */

  const sfx = env.sfx
  const atP = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 4 : 0
  let prevT = -1
  let seekFlag = false
  let lat0 = 0
  let sliderTouched = false
  let tappedOnce = false
  let draggingSlider = false
  let tapsIII = 0
  let tapsIV = 0
  let prevTl = 0
  let looped = false
  let lastClick = 0
  const ptr = { x: 0, y: 0, over: false, down: false, mode: '' as '' | 'slider' | 'ruler' | 'lattice', sx: 0, sy: 0, ms: 0, touch: false }

  function chapterOf(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }
  function curT() {
    return (((prevT < 0 ? clock : prevT) % LOOP) + LOOP) % LOOP
  }
  function seek(target: number) {
    const T = curT()
    clock += target - T
    seekFlag = true
    if (target < 40) lat0 = 0
  }

  /** which isotope, which sample, and how many half-lives have passed, at story time T */
  function stateAt(T: number) {
    if (T < 40) return { iso, seed: 1 + resets, hl: Math.max(0, (T - lat0) / DHL), rate: 1 / DHL }
    if (T < 58) {
      const u = clamp((T - 40 - FF0) / (FF1 - FF0))
      return { iso: C14, seed: 101 + tapsIII, hl: H_HEARTH * ease.inOutCubic(u), rate: u > 0 && u < 1 ? H_HEARTH / (FF1 - FF0) : 0 }
    }
    if (T < 72) {
      const u = clamp((T - 58 - FF0) / (FF1 - FF0))
      return { iso: U238, seed: 202 + tapsIV, hl: H_EARTH * ease.inOutCubic(u), rate: u > 0 && u < 1 ? H_EARTH / (FF1 - FF0) : 0 }
    }
    return { iso, seed: 1, hl: 0, rate: 0 }
  }

  /** The sample size: the slider, or (until you touch it) a sweep that shows chance at work. */
  /** a default sample that keeps each atom at least ~7 px across */
  function nDefault() {
    const fit = Math.floor((L / 7.2) ** 2)
    for (const v of [N_DEFAULT, 1225, 900, 625, 400, 256, 144]) if (v <= fit) return v
    return 100
  }
  function nAt(T: number) {
    if (preview) return Math.min(900, nDefault())
    if (sliderTouched) return N
    const nd = nDefault()
    if (T >= 27.4 && T < 36) {
      const steps: [number, number][] = [
        [27.4, Math.min(400, nd)],
        [28.8, 100],
        [30.2, 25],
        [33.2, 100],
        [34.4, Math.min(400, nd)],
      ]
      let n = nd
      for (const [t0, v] of steps) if (T >= t0) n = v
      return n
    }
    return nd
  }

  const sliderV = (n: number) => Math.log(n / NMIN) / Math.log(NMAX / NMIN)
  const sliderN = (v: number) => Math.round(NMIN * Math.pow(NMAX / NMIN, clamp(v)))

  function onSlider(x: number, y: number) {
    if (preview) return false
    const m = ptr.touch ? 18 : 11
    return x > slX0 - 14 && x < slX1 + 14 && y > slY - m && y < slY + m
  }
  function inLattice(x: number, y: number) {
    return x > lx - 6 && x < lx + L + 6 && y > ly - 6 && y < ly + L + 6
  }
  function onRuler(x: number, y: number) {
    return !preview && rulerY > 0 && y > rulerY - 18 && y < h && x > pad - 8 && x < w - pad + 8
  }
  function seekRuler(x: number) {
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.2) target = c.t
    seek(Math.min(LOOP - 0.05, target))
  }

  function tapAction(T: number) {
    tappedOnce = true
    if (T < 40 || T >= 72) {
      iso = (iso + 1) % ISOTOPES.length
      resets++
      lat0 = T < 40 ? T : 0
      sfx.tone(587.33, 0.9, { type: 'sine', gain: 0.04, room: 0.4 })
      sfx.tone(880, 0.9, { type: 'sine', gain: 0.025, room: 0.4, when: 0.06 })
    } else {
      // a fresh piece to date: same clock, different atoms
      if (T < 58) tapsIII++
      else tapsIV++
      sfx.tone(440, 0.7, { type: 'sine', gain: 0.035, room: 0.4 })
    }
  }

  /* ---------------------------------------------------------- shapes */

  // the charcoal lump (III) and the zircon (IV), as polygons in the unit square
  const lump: number[] = []
  {
    const r = rng(77)
    const n = 13
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2
      const rad = 0.43 + (r() - 0.5) * 0.09 + (i % 3 === 0 ? -0.04 : 0)
      lump.push(0.5 + Math.cos(a) * rad * 1.04, 0.53 + Math.sin(a) * rad * 0.86)
    }
  }
  const zircon = [0.5, 0.02, 0.8, 0.2, 0.8, 0.8, 0.5, 0.98, 0.2, 0.8, 0.2, 0.2]
  function inPoly(poly: number[], x: number, y: number) {
    let inside = false
    for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      const xi = poly[i]
      const yi = poly[i + 1]
      const xj = poly[j]
      const yj = poly[j + 1]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  function polyPath(poly: number[], s = 1, cx = 0.5, cy = 0.5) {
    ctx.beginPath()
    for (let i = 0; i < poly.length; i += 2) {
      const X = lx + (cx + (poly[i] - cx) * s) * L
      const Y = ly + (cy + (poly[i + 1] - cy) * s) * L
      if (i) ctx.lineTo(X, Y)
      else ctx.moveTo(X, Y)
    }
    ctx.closePath()
  }

  /* ---------------------------------------------------------- drawing */

  function halo(str: string, x: number, y: number, o: TextOpts) {
    const lw0 = ctx.lineWidth
    setFont(ctx, o)
    ctx.lineWidth = 5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.night, 0.92)
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.lineJoin = 'miter'
    ctx.lineWidth = lw0
    text(ctx, str, x, y, o)
  }
  function tw(str: string, size: number, tracking = 0.12, font: 'mono' | 'serif' = 'mono', italic = false) {
    setFont(ctx, { size, tracking, font, italic })
    const v = ctx.measureText(str).width
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    return v
  }
  /** Which atoms are drawn: the lattice square, or (III, IV) only those inside the charcoal or the crystal. */
  function maskAt(T: number) {
    if (T >= 40 && T < 58) return { poly: lump, a: smoothstep(40, 41.2, T) * (1 - smoothstep(57, 58, T)) }
    if (T >= 58 && T < 72) return { poly: zircon, a: smoothstep(58, 59.2, T) * (1 - smoothstep(71, 72, T)) }
    return { poly: null, a: 0 }
  }

  function drawLattice(T: number, hl: number, rate: number, appear: number) {
    const n = Math.ceil(Math.sqrt(N))
    const s = L / n
    const rows = Math.ceil(N / n)
    const oy = ly + (L - rows * s) / 2
    const r = s * 0.34
    const { poly, a: ma } = maskAt(T)
    const flashH = 0.42 * Math.max(rate, 0.02)
    const parents = new Path2D()
    const daughters = new Path2D()
    const hatch = new Path2D()
    const fading = new Path2D()
    const rings = new Path2D()
    for (let i = 0; i < N; i++) {
      const c = i % n
      const row = (i / n) | 0
      const lastRow = row === rows - 1 ? N - row * n : n
      const X = lx + (c + 0.5 + (n - lastRow) / 2) * s
      const Y = oy + (row + 0.5) * s
      // the sweep-in: atoms appear in reading order
      if (appear < 1 && (c + row) / (2 * n) > appear) continue
      let inside = true
      if (poly && ma > 0) inside = inPoly(poly, (X - lx) / L, (Y - ly) / L)
      const target = inside ? parents : fading
      const hi = hAll[i]
      if (hi > hl) {
        target.moveTo(X + r, Y)
        target.arc(X, Y, r, 0, TAU)
      } else {
        if (inside || !poly || ma < 1) {
          const rd = r * 0.7
          daughters.moveTo(X + rd, Y)
          daughters.arc(X, Y, rd, 0, TAU)
          if (rd > 1.6 && inside) {
            for (const d of [-0.45, 0, 0.45]) {
              const half = Math.sqrt(1 - d * d) * rd * 0.9
              const ox = d * rd * 0.7071
              const oyy = -d * rd * 0.7071
              hatch.moveTo(X + ox - half * 0.7071, Y + oyy - half * 0.7071)
              hatch.lineTo(X + ox + half * 0.7071, Y + oyy + half * 0.7071)
            }
          }
        }
        const age = hl - hi
        if (age < flashH && inside) {
          const u = age / flashH
          rings.moveTo(X + r * (1 + 2 * u), Y)
          rings.arc(X, Y, r * (1 + 2 * u), 0, TAU)
        }
      }
    }
    ctx.lineWidth = s > 14 ? 1.2 : 1
    ctx.strokeStyle = rgba(INK, 0.92)
    ctx.stroke(parents)
    if (poly && ma > 0) {
      ctx.strokeStyle = rgba(INK, 0.92 * (1 - ma))
      ctx.stroke(fading)
    }
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.sage, 0.4)
    ctx.stroke(daughters)
    ctx.strokeStyle = rgba(C.sage, 0.5)
    ctx.stroke(hatch)
    ctx.strokeStyle = rgba(C.sky, 0.95)
    ctx.stroke(rings)
    return { n, s, rows, oy, r }
  }

  function atomXY(i: number, g: { n: number; s: number; rows: number; oy: number }) {
    const c = i % g.n
    const row = (i / g.n) | 0
    const lastRow = row === g.rows - 1 ? N - row * g.n : g.n
    return { X: lx + (c + 0.5 + (g.n - lastRow) / 2) * g.s, Y: g.oy + (row + 0.5) * g.s }
  }

  function drawSlider(T: number, alpha: number) {
    if (preview || alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    text(ctx, tiny ? 'N' : 'SAMPLE', lx, slY + 3, { size: 8.5, color: k.muted, tracking: 0.14 })
    ctx.strokeStyle = rgba(INK, 0.4)
    ctx.beginPath()
    ctx.moveTo(slX0, slY)
    ctx.lineTo(slX1, slY)
    for (const v of [16, 25, 100, 400, 1600, 2500]) {
      const x = lerp(slX0, slX1, sliderV(v))
      ctx.moveTo(Math.round(x) + 0.5, slY - 3)
      ctx.lineTo(Math.round(x) + 0.5, slY + 3)
    }
    ctx.stroke()
    if (!tiny && slX1 - slX0 > 170)
      for (const v of [16, 100, 400, 2500]) text(ctx, v.toLocaleString('en-US'), lerp(slX0, slX1, sliderV(v)), slY + 14, { size: 7.5, color: k.muted, align: 'center', tracking: 0.04 })
    const hx = lerp(slX0, slX1, sliderV(N))
    ctx.fillStyle = C.night
    ctx.strokeStyle = C.sky
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(hx, slY, draggingSlider ? 7 : 5.5, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.lineWidth = 1
    const lab = `N = ${N.toLocaleString('en-US')}`
    halo(lab, clamp(hx, slX0 + tw(lab, 9) / 2, slX1 - tw(lab, 9) / 2), slY - 10, { size: 9, color: C.sky, align: 'center', tracking: 0.1 })
    // the ghost: a hand on the handle while the sweep runs
    if (!sliderTouched && T >= 27 && T < 36) {
      const ga = smoothstep(27, 27.5, T) * (1 - smoothstep(35.4, 36, T))
      ctx.globalAlpha = alpha * ga
      ctx.strokeStyle = C.sky
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.arc(hx, slY, 12, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      if (!tiny) {
        // under the slider if there is room above the chapter ruler, otherwise just above it
        const lab = 'DRAG TO CHANGE THE SAMPLE'
        const lw = tw(lab, 8.5)
        const floor = rulerY > 0 ? rulerY - 14 : h - 6
        const gy = slY + 27 < floor ? slY + 27 : slY - 24
        halo(lab, clamp((slX0 + slX1) / 2, lw / 2 + 4, w - lw / 2 - 4), gy, { size: 8.5, color: C.sky, align: 'center', tracking: 0.14 })
      }
    }
    ctx.restore()
  }

  /** III, behind the atoms: soil strata, the charcoal's outline and cracks, and a fire that is only a memory. */
  function drawHearth(T: number, a: number) {
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // soil laid down since: wavy strata above and below the hearth layer
    ctx.strokeStyle = rgba(INK, 0.18)
    ctx.beginPath()
    const bands = [ly + L * 1.0, ly + L * 1.04, ly + L * 1.09]
    for (let q = 0; q < bands.length; q++) {
      const yy = bands[q]
      if (yy > hero.y + hero.h + 2) break
      for (let x = hero.x; x <= hero.x + hero.w; x += 6) {
        const y = yy + noise.n2(x * 0.02, q * 3.1) * 2.2
        if (x === hero.x) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.9)
    polyPath(lump)
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.28)
    ctx.beginPath()
    ctx.moveTo(lx + L * 0.3, ly + L * 0.3)
    ctx.lineTo(lx + L * 0.42, ly + L * 0.46)
    ctx.lineTo(lx + L * 0.4, ly + L * 0.62)
    ctx.moveTo(lx + L * 0.66, ly + L * 0.24)
    ctx.lineTo(lx + L * 0.6, ly + L * 0.42)
    ctx.lineTo(lx + L * 0.72, ly + L * 0.58)
    ctx.stroke()
    // the fire that was: dashed flames and smoke on the charcoal, fading in and out like a memory
    const mem = smoothstep(46, 48.5, T) * (1 - smoothstep(55, 57, T)) * (0.6 + 0.4 * Math.sin(T * 0.9))
    if (mem > 0.01) {
      ctx.globalAlpha = a * mem * 0.8
      ctx.strokeStyle = C.sage
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      const base = ly + L * 0.24
      for (let f = 0; f < 4; f++) {
        const bx = lx + L * (0.3 + f * 0.13)
        const fh = Math.min(L * (0.2 + (f === 1 || f === 2 ? 0.12 : 0)), (base - hero.y) * 0.92)
        const sway = noise.n2(T * 0.6, f * 4) * L * 0.025
        ctx.moveTo(bx - L * 0.06, base)
        ctx.quadraticCurveTo(bx - L * 0.07 + sway, base - fh * 0.55, bx + sway * 2, base - fh)
        ctx.quadraticCurveTo(bx + L * 0.06 + sway, base - fh * 0.5, bx + L * 0.06, base)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = rgba(INK, 0.45)
      ctx.beginPath()
      for (let f = 0; f < 3; f++) {
        let X = lx + L * (0.4 + f * 0.1)
        let Y = Math.max(hero.y + 4, base - L * 0.34)
        ctx.moveTo(X, Y)
        for (let q = 0; q < 14; q++) {
          Y -= L * 0.016
          X += noise.n2(q * 0.25 + f * 9, T * 0.25) * L * 0.02
          if (Y < hero.y + 2) break
          ctx.lineTo(X, Y)
        }
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /** III, in front of the atoms: the hearth stones, cut in section and hatched. */
  function drawStones(a: number) {
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const st = rng(12)
    const spots: [number, number, number][] = [
      [0.07, 0.55, 0.075],
      [0.1, 0.78, 0.085],
      [0.28, 0.93, 0.075],
      [0.5, 0.97, 0.07],
      [0.71, 0.93, 0.08],
      [0.9, 0.76, 0.085],
      [0.94, 0.52, 0.07],
    ]
    for (let q = 0; q < spots.length; q++) {
      const [ux, uy, ur] = spots[q]
      const cx = lx + L * ux
      const cy = ly + L * uy
      const rr = L * ur * (0.9 + st() * 0.2)
      ctx.beginPath()
      for (let p = 0; p <= 16; p++) {
        const aa = (p / 16) * TAU
        const rad = rr * (1 + 0.14 * Math.sin(aa * 3 + q) + 0.07 * Math.cos(aa * 5 + q * 2))
        const X = cx + Math.cos(aa) * rad * 1.2
        const Y = cy + Math.sin(aa) * rad * 0.82
        if (p) ctx.lineTo(X, Y)
        else ctx.moveTo(X, Y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(12,32,36,0.96)'
      ctx.fill()
      ctx.strokeStyle = rgba(INK, 0.75)
      ctx.stroke()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = rgba(INK, 0.16)
      ctx.beginPath()
      for (let d = -rr * 2; d < rr * 2; d += 4) {
        ctx.moveTo(cx + d - rr, cy - rr)
        ctx.lineTo(cx + d + rr, cy + rr)
      }
      ctx.stroke()
      ctx.restore()
    }
    if (!tiny && L > 160 && ly - 10 > pad + 40) text(ctx, 'HEARTH · CHARCOAL, ENLARGED', lx, ly - 10, { size: 8.5, color: k.muted, tracking: 0.14 })
    ctx.restore()
  }

  /** IV: a zircon — the crystal outline with its growth zoning. */
  function drawZircon(a: number) {
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.9)
    polyPath(zircon)
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.2)
    ctx.setLineDash([2, 4])
    for (const s of [0.82, 0.62, 0.42]) {
      polyPath(zircon, s)
      ctx.stroke()
    }
    ctx.setLineDash([])
    // facet edges on the pyramids
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.beginPath()
    ctx.moveTo(lx + L * 0.5, ly + L * 0.02)
    ctx.lineTo(lx + L * 0.5, ly + L * 0.2)
    ctx.moveTo(lx + L * 0.5, ly + L * 0.98)
    ctx.lineTo(lx + L * 0.5, ly + L * 0.8)
    ctx.moveTo(lx + L * 0.2, ly + L * 0.2)
    ctx.lineTo(lx + L * 0.8, ly + L * 0.2)
    ctx.moveTo(lx + L * 0.2, ly + L * 0.8)
    ctx.lineTo(lx + L * 0.8, ly + L * 0.8)
    ctx.stroke()
    if (!tiny && L > 160) {
      text(ctx, 'ZIRCON', lx + L * 0.84, ly + L * 0.24, { size: 8.5, color: k.muted, tracking: 0.14 })
      text(ctx, 'ZrSiO4', lx + L * 0.84, ly + L * 0.24 + 12, { size: 8.5, color: k.muted, tracking: 0.06 })
      // a scale bar
      const bw = L * 0.25
      const bx = lx + L * 0.84
      const by = ly + L * 0.86
      if (bx + bw < hero.x + hero.w + 4) {
        ctx.strokeStyle = rgba(INK, 0.6)
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + bw, by)
        ctx.moveTo(bx, by - 3)
        ctx.lineTo(bx, by + 3)
        ctx.moveTo(bx + bw, by - 3)
        ctx.lineTo(bx + bw, by + 3)
        ctx.stroke()
        text(ctx, '50 µm', bx + bw / 2, by - 6, { size: 8, color: k.muted, align: 'center', tracking: 0.08 })
      }
    }
    ctx.restore()
  }

  /** The survivors against the law, in half-lives. */
  function drawPlot(T: number, st: { iso: number; hl: number }, alpha: number) {
    const r = info
    const capReserve = capSize * 3.2 + 14
    const avail = r.h - capReserve
    if (avail < 60) return r.y
    const plotH = Math.min(stacked ? avail * 0.6 : avail * (short ? 0.74 : 0.5), short ? 130 : clamp(h * 0.3, 250, 340))
    const plotW = Math.min(r.w - 30, clamp(w * 0.38, 560, 760))
    const x0 = r.x + 26
    const y0 = r.y + 22
    const x1 = x0 + plotW - 26
    const y1 = y0 + plotH
    const HMAX = 6
    const toX = (v: number) => lerp(x0, x1, v / HMAX)
    const toY = (v: number) => lerp(y1, y0, v / 1.06)
    const I = ISOTOPES[st.iso]
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    text(ctx, 'ATOMS REMAINING', r.x, r.y + 8, { size: 9, color: k.ink2, tracking: 0.14 })
    if (!tiny && r.w > 320) text(ctx, 'N(t) = N₀ · 2^(−t / t½)', r.x + r.w, r.y + 8, { size: 9.5, color: k.ink2, align: 'right', tracking: 0.02 })
    ctx.strokeStyle = rgba(INK, 0.45)
    ctx.beginPath()
    ctx.moveTo(x0, y0 - 4)
    ctx.lineTo(x0, y1)
    ctx.lineTo(x1 + 4, y1)
    for (let v = 0; v <= HMAX; v++) {
      const x = Math.round(toX(v)) + 0.5
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y1 + 4)
    }
    ctx.stroke()
    for (let v = 0; v <= HMAX; v++) text(ctx, String(v), toX(v), y1 + 13, { size: 8, color: k.muted, align: 'center', tracking: 0.04 })
    if (!short) text(ctx, `HALF-LIVES · 1 = ${I.shown.toUpperCase()}`, x1, y1 + 27, { size: 8, color: k.muted, align: 'right', tracking: 0.12 })
    // ½ ¼ ⅛: dashed to the curve, with dimension ticks
    const fr = ['1', '½', '¼', '⅛']
    ctx.strokeStyle = rgba(INK, 0.22)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    for (let q = 1; q <= 3; q++) {
      const y = toY(Math.pow(2, -q))
      ctx.moveTo(x0, y)
      ctx.lineTo(toX(q), y)
      ctx.lineTo(toX(q), y1)
    }
    ctx.stroke()
    ctx.setLineDash([])
    for (let q = 0; q <= 3; q++) text(ctx, fr[q], x0 - 7, toY(Math.pow(2, -q)) + 3, { size: q ? 10 : 8, color: k.muted, align: 'right' })
    if (plotW > 260 && !short)
      for (let q = 1; q <= 3; q++) text(ctx, q === 1 ? 't½' : `${q} t½`, (x0 + toX(q)) / 2 + (q === 1 ? 12 : 0), toY(Math.pow(2, -q)) - 4, { size: 8.5, color: k.muted, align: 'center', tracking: 0.04 })
    // the binomial spread around the law: ±1σ = √(N p (1 − p)) / N
    ctx.fillStyle = rgba(C.sky, 0.09)
    ctx.beginPath()
    for (let q = 0; q <= 90; q++) {
      const v = (q / 90) * HMAX
      const p = Math.pow(2, -v)
      const sd = Math.sqrt((p * (1 - p)) / N)
      if (q) ctx.lineTo(toX(v), toY(p + sd))
      else ctx.moveTo(toX(v), toY(p + sd))
    }
    for (let q = 90; q >= 0; q--) {
      const v = (q / 90) * HMAX
      const p = Math.pow(2, -v)
      const sd = Math.sqrt((p * (1 - p)) / N)
      ctx.lineTo(toX(v), toY(Math.max(0, p - sd)))
    }
    ctx.closePath()
    ctx.fill()
    // the law
    ctx.strokeStyle = C.sky
    ctx.beginPath()
    for (let q = 0; q <= 120; q++) {
      const v = (q / 120) * HMAX
      const y = toY(Math.pow(2, -v))
      if (q) ctx.lineTo(toX(v), y)
      else ctx.moveTo(toX(v), y)
    }
    ctx.stroke()
    // the count, exactly: one step down per decay
    const hl = Math.min(st.hl, HMAX)
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(1))
    let alive = N
    for (let q = 0; q < N && sorted[q] <= hl; q++) {
      const x = toX(sorted[q])
      ctx.lineTo(x, toY(alive / N))
      alive--
      ctx.lineTo(x, toY(alive / N))
    }
    ctx.lineTo(toX(hl), toY(alive / N))
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(toX(hl), toY(alive / N), 2.8, 0, TAU)
    ctx.fill()
    // the dating marks
    const dating = T >= 40 && T < 72 ? smoothstep(T < 58 ? 45.6 : 63.6, T < 58 ? 46.6 : 64.6, T) : 0
    if (dating > 0) {
      const H = T < 58 ? H_HEARTH : H_EARTH
      const p = Math.pow(2, -H)
      ctx.globalAlpha = alpha * dating
      ctx.strokeStyle = C.sage
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(x0, toY(p))
      ctx.lineTo(toX(H), toY(p))
      ctx.lineTo(toX(H), y1)
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, `${(p * 100).toFixed(1)}%`, x0 + 5, toY(p) + 12, { size: 9, color: C.sage, tracking: 0.06 })
      text(ctx, T < 58 ? '4,000 YEARS' : '4.54 BILLION YEARS', toX(H) + 5, y1 - 7, { size: 8.5, color: C.sage, tracking: 0.12 })
    }
    ctx.restore()
    return y1 + (short ? 22 : 38)
  }

  function drawNotes(T: number, y: number, st: { iso: number; hl: number }, alpha: number) {
    const r = info
    const lim = r.y + r.h - capSize * 3.2 - 14
    if (tiny || y + 20 > lim) return
    const ch = chapterOf(T)
    const I = ISOTOPES[st.iso]
    const lines: { a: string; b?: string; c?: string }[] = []
    if (ch <= 1 || ch === 4) {
      lines.push({ a: `${I.name.toUpperCase()} → ${I.daughter.toUpperCase()}`, b: `half-life ${I.shown} · shown here at 1 s = ${fmtDur(I.half / DHL)}` })
      if (ch === 0) lines.push({ a: 'EVERY ATOM, EVERY MOMENT', b: 'the same small chance λ dt, however long it has waited' })
      else lines.push({ a: 'THE SPREAD', b: `±1σ = √(N p (1 − p)) — relative error falls as 1 / √N` })
      if (r.w > 380) lines.push({ a: 'λ = ln 2 / t½', b: `${(Math.LN2 / I.half).toExponential(2)} per second` })
    } else if (ch === 2) {
      lines.push({ a: 'A LIVING TREE', b: 'about 1 carbon atom in 10¹² is carbon-14' })
      lines.push({ a: 'WHEN IT DIES, THE CLOCK STARTS', b: 'no new carbon-14 comes in; what is there decays' })
      lines.push({ a: 'THIS CHARCOAL: 61.6% LEFT', b: 't = (t½ / ln 2) · ln(N₀ / N) = 4,000 years' })
    } else if (ch === 3) {
      lines.push({ a: 'URANIUM-238 → LEAD-206', b: 'a chain of 14 decays · t½ = 4.468 billion years' })
      lines.push({ a: 'A ZIRCON TRAPS URANIUM', b: 'and refuses lead as it grows: all its lead is a clock' })
      lines.push({ a: 'METEORITES · PATTERSON, 1956', b: 'the Earth: 4.54 ± 0.05 billion years' })
    }
    ctx.save()
    ctx.globalAlpha = alpha
    for (const ln of lines) {
      if (y + 24 > lim) break
      text(ctx, ln.a, r.x, y, { size: 8.5, color: k.muted, tracking: 0.14 })
      if (ln.b) {
        const sz = 9.5
        let str = ln.b
        while (str.length > 8 && tw(str, sz, 0.02) > r.w) str = str.slice(0, -2)
        if (str !== ln.b) str = str.trimEnd() + '…'
        text(ctx, str, r.x, y + 13, { size: sz, color: k.ink2, tracking: 0.02 })
      }
      y += 32
    }
    ctx.restore()
  }

  function captionAt(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.04
      const n = cap.lines.length
      const top = capY - capSize + (2 - n) * lineH - lineH
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = top + capSize + li * lineH
        const sw = ln.s ? tw(ln.s, capSize, 0, 'serif') : 0
        const ew = ln.em ? tw(ln.em, capSize, 0, 'serif', true) : 0
        const tw2 = ln.tail ? tw(ln.tail, capSize, 0, 'serif') : 0
        const maxW = info.w - 4
        const sz = sw + ew + tw2 > maxW ? (capSize * maxW) / (sw + ew + tw2) : capSize
        const sc = sz / capSize
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, w, capSize * 1.32)
        ctx.clip()
        const dyy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dyy, { font: 'serif', size: sz, color: k.ink })
        if (ln.em) text(ctx, ln.em, capX + sw * sc, y + dyy, { font: 'serif', size: sz, italic: true, color: C.sage })
        if (ln.tail) text(ctx, ln.tail, capX + (sw + ew) * sc, y + dyy, { font: 'serif', size: sz, color: k.ink })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, readouts: { label: string; value: string }[]) {
    const ch = chapterOf(T)
    const small = preview || short || narrow
    text(ctx, `${FIG} — Half-life`, pad, pad + 9, { size: small ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    if (!tiny) {
      const c = CHAPTERS[ch]
      const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
      ctx.save()
      ctx.globalAlpha = kIn
      text(ctx, `${c.num} — ${c.name}`, pad, pad + (small ? 23 : 27), { size: small ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true })
      ctx.restore()
    }
    if (readouts.length) {
      const kick = tw(`${FIG} — HALF-LIFE`, small ? 8.5 : 10, 0.16)
      const size = small ? 10.5 : 12.5
      const gapR = small ? 12 : 20
      const widthOf = (list: typeof readouts) =>
        list.reduce((s, it) => s + Math.max(tw(it.label.toUpperCase(), 8.5, 0.14), tw(it.value, size, 0.04)), 0) + gapR * (list.length - 1)
      let items = readouts
      while (items.length > 1 && widthOf(items) > w - pad * 2 - kick - 24) items = items.slice(0, -1)
      let x = w - pad - widthOf(items)
      for (const it of items) {
        const wi = Math.max(tw(it.label.toUpperCase(), 8.5, 0.14), tw(it.value, size, 0.04))
        text(ctx, it.label, x, pad + 7, { size: 8.5, color: k.muted, tracking: 0.14, upper: true })
        text(ctx, it.value, x, pad + 7 + size + 3, { size, color: k.ink, tracking: 0.04 })
        x += wi + gapR
      }
    }
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
        ctx.strokeStyle = C.sky
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[chapterOf(ht)].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: C.sky, align: 'center', tracking: 0.12 })
      }
    }
  }

  /* ------------------------------------------------------------ frame */

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
        draggingSlider = false
        env.setCursor('default')
        return
      }
      ptr.over = true
      ptr.x = p.x
      ptr.y = p.y
      if (p.type === 'down') {
        ptr.down = true
        ptr.sx = p.x
        ptr.sy = p.y
        ptr.ms = performance.now()
        if (onRuler(p.x, p.y)) {
          ptr.mode = 'ruler'
          seekRuler(p.x)
        } else if (onSlider(p.x, p.y)) {
          ptr.mode = 'slider'
          draggingSlider = true
          sliderTouched = true
          N = sliderN((p.x - slX0) / (slX1 - slX0))
        } else if (inLattice(p.x, p.y)) ptr.mode = 'lattice'
        else ptr.mode = ''
      } else if (p.type === 'move' && ptr.down) {
        if (ptr.mode === 'ruler') seekRuler(p.x)
        else if (ptr.mode === 'slider') N = sliderN((p.x - slX0) / (slX1 - slX0))
      } else if (p.type === 'up') {
        if (ptr.mode === 'lattice' && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) < (ptr.touch ? 16 : 9) && performance.now() - ptr.ms < 450) tapAction(T)
        ptr.down = false
        ptr.mode = ''
        draggingSlider = false
      }
      env.setCursor(ptr.mode === 'slider' ? 'grabbing' : onSlider(p.x, p.y) ? 'grab' : onRuler(p.x, p.y) || inLattice(p.x, p.y) ? 'pointer' : 'default')
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight' && code !== 'Space') return false
      if (!down) return true
      const T = curT()
      if (code === 'Space') tapAction(T)
      else if (code === 'ArrowRight') {
        const next = CHAPTERS.find((c) => c.t > T + 0.01)
        seek(next ? next.t : 0)
      } else {
        const i = chapterOf(T)
        seek(T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t)
      }
      return true
    },
    frame(t, dt) {
      const T = (((t + clock) % LOOP) + LOOP) % LOOP
      if (prevT >= 0 && T < prevT - 1 && !seekFlag) {
        looped = true
        resets = 0
        lat0 = 0
        tapsIII = 0
        tapsIV = 0
      }
      const jumped = seekFlag || (prevT >= 0 && T < prevT - 1)
      seekFlag = false
      const st = stateAt(T)
      N = nAt(T)
      sample(st.seed, N)

      // the marked atom: one whose time will come in a few seconds, near the middle
      if (marked < 0 && T < 40) {
        const n = Math.ceil(Math.sqrt(N))
        let best = -1
        let bestD = 1e9
        const want = Math.max(T - lat0 + 3.5, 9.2) / DHL
        for (let i = 0; i < N; i++) {
          const c = i % n
          const row = (i / n) | 0
          if (c < n * 0.25 || c > n * 0.75 || row < n * 0.25 || row > n * 0.75) continue
          const d = Math.abs(hAll[i] - want)
          if (d < bestD) {
            bestD = d
            best = i
          }
        }
        marked = best
      }

      // sound: a soft click per decay, thinned when they crowd
      if (dt > 0 && !jumped && st.hl > prevTl) {
        const nNew = decayedBy(st.hl) - decayedBy(prevTl)
        const now = performance.now()
        // at most one click a frame and about 25 a second: a crackle early, sparse ticks late
        if (nNew > 0 && now - lastClick > 38) {
          sfx.noise(0.02, { filter: 2600 + Math.random() * 1600, q: 1.4, gain: 0.045, room: 0.06, when: Math.random() * dt, pan: (Math.random() - 0.5) * 0.6 })
          lastClick = now
        }
        if (T < 40 && marked >= 0 && hAll[marked] > prevTl && hAll[marked] <= st.hl) {
          sfx.tone(1174.66, 1.6, { type: 'sine', gain: 0.04, room: 0.5 })
          sfx.tone(1760, 1.2, { type: 'sine', gain: 0.02, room: 0.5, when: 0.04 })
        }
      }
      prevTl = st.hl

      ground(ctx, w, h, 'night')
      const readouts: { label: string; value: string }[] = []
      const I = ISOTOPES[st.iso]
      const remain = N - decayedBy(st.hl)

      // the lattice (and its vignettes)
      // atoms sweep in on the very first frame only; later loops arrive from chapter V's fresh lattice
      const appear = T < 1.4 && !looped && !env.params.has('at') ? ease.inOutSine(clamp(T / 1.4)) : 1
      ctx.save()
      const mk = maskAt(T)
      if (T >= 40 && T < 58) drawHearth(T, mk.a)
      if (T >= 58 && T < 72) drawZircon(mk.a)
      const g = drawLattice(T, st.hl, st.rate, appear)
      if (T >= 40 && T < 58) drawStones(mk.a)
      ctx.restore()
      if (!tiny && !preview && T >= 40 && T < 72 && ly - 10 > pad + 40) {
        // the year counter while the sample is fast-forwarded
        const years = (st.hl * I.half) / YEAR
        const lab = T < 58 ? `${Math.round(years).toLocaleString('en-US')} YEARS` : `${(years / 1e9).toFixed(2)} BILLION YEARS`
        const ffA = smoothstep(40 + FF0 - 0.6, 40 + FF0, T < 58 ? T : T - 18) * (1 - smoothstep(55.5, 57, T < 58 ? T : T - 14))
        if (ffA > 0) halo(lab, T >= 58 ? lx + L / 2 : lx + L, ly - 10, { size: 10, color: C.sky, align: T >= 58 ? 'center' : 'right', tracking: 0.14, alpha: ffA })
      }
      // the marked atom
      if (T < 40 && marked >= 0 && !preview) {
        const ma = smoothstep(2.2, 3.2, T) * (1 - smoothstep(13, 14.5, T))
        if (ma > 0) {
          const { X, Y } = atomXY(marked, g)
          const gone = hAll[marked] <= st.hl
          ctx.save()
          ctx.globalAlpha = ma
          ctx.strokeStyle = C.sky
          ctx.lineWidth = 1
          ctx.setLineDash([2, 3])
          ctx.beginPath()
          ctx.arc(X, Y, g.r + 6, 0, TAU)
          ctx.stroke()
          ctx.setLineDash([])
          if (L >= 200) {
            const right = X < lx + L * 0.6
            const ex = right ? X + g.r + 30 : X - g.r - 30
            const ey = Y - 26
            ctx.beginPath()
            ctx.moveTo(X + (right ? 1 : -1) * (g.r + 6) * 0.72, Y - (g.r + 6) * 0.7)
            ctx.lineTo(ex, ey)
            ctx.lineTo(ex + (right ? 14 : -14), ey)
            ctx.stroke()
            const tx = ex + (right ? 18 : -18)
            halo(gone ? 'THIS ONE. NOW.' : 'THIS ONE — WHEN?', tx, ey + 3, { size: 10, color: C.sky, align: right ? 'left' : 'right', tracking: 0.14 })
            if (!tiny) halo(gone ? 'NO REASON, NO WARNING' : 'NOBODY CAN SAY', tx, ey + 17, { size: 9, color: k.ink2, align: right ? 'left' : 'right', tracking: 0.14 })
          }
          ctx.restore()
        }
      }
      // the hint to tap
      if (!preview && !tappedOnce && T > 8 && T < 13.5 && !tiny && ly - 14 > pad + 36) {
        const ha = smoothstep(8, 8.8, T) * (1 - smoothstep(12.8, 13.5, T))
        const lab = L > 260 ? 'TAP THE ATOMS FOR A NEW ISOTOPE' : 'TAP FOR A NEW ISOTOPE'
        const lw = tw(lab, 8.5, 0.14)
        halo(lab, clamp(lx + L / 2, hero.x + lw / 2, hero.x + hero.w - lw / 2), ly - 12, { size: 8.5, color: k.muted, align: 'center', tracking: 0.14, alpha: ha })
      }
      drawSlider(T, T >= 40 && T < 72 ? 1 - smoothstep(40, 41, T) * (1 - smoothstep(71, 72, T)) : 1)

      const plotA = smoothstep(2, 4, T) * (T >= 72 ? 1 - smoothstep(72, 74, T) : 1)
      let y = info.y
      if (plotA > 0) y = drawPlot(T, st, plotA)
      if (plotA > 0) drawNotes(T, y, st, plotA)

      if (T < 40 || T >= 72) {
        readouts.push(
          { label: 'Isotope', value: I.short },
          { label: 'Half-life', value: I.shown },
          { label: 'Remaining', value: `${remain.toLocaleString('en-US')}` },
          { label: 'Elapsed', value: fmtDur(st.hl * I.half) },
        )
      } else {
        const years = (st.hl * I.half) / YEAR
        readouts.push(
          { label: 'Isotope', value: I.short },
          { label: 'Half-life', value: I.shown },
          { label: 'Counted', value: `${((100 * remain) / N).toFixed(1)}%` },
          { label: 'Age', value: T < 58 ? `${Math.round(years).toLocaleString('en-US')} yr` : `${(years / 1e9).toFixed(2)} Gyr` },
        )
      }
      captionAt(T)
      chrome(T, readouts)
      prevT = T
    },
  }
}

export default create
