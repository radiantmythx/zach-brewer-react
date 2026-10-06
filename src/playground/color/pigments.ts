/*
 * FIG. C.09 — PIGMENTS. A history of color as a cabinet of specimens. Sixteen
 * pigments and dyes arrive in the order people first made or used them, from
 * ochre ground at Blombos Cave some 100,000 years ago to YInMn blue, pulled
 * from a furnace at Oregon State in 2009. Each is poured as a hand-ground
 * pile of grains (dyes are shown as a dyed swatch), pinned with a hairline
 * label (name, formula, date, source), told in one line, and filed in its
 * drawer; at the end the drawers open into one color chart, each color
 * with its price.
 *
 *   I    Earth                 red ochre, carbon black, yellow ochre
 *   II   Fire and trade        Egyptian blue … carmine: the precious colors
 *   III  Accidents, industry   Prussian blue … titanium white
 *   IV   A new blue            YInMn blue, 2009
 *   V    The cabinet           all sixteen as a chart → the drawers empty → loop
 *
 * The colors are approximate sRGB renderings of each pigment's masstone
 * (see the guide). The timeline is logarithmic in age, so 100,000 years and
 * the last two centuries both get room. 87 s loop, a pure function of time.
 *
 * Interaction (full mode): hover or tap a drawer to read its story (tap pins
 * it and holds the clock); drag or tap the timeline to travel; ← → step
 * one specimen. Test route: &at=seconds, &pin=1–16.
 */

import { C, TAU, clamp, cropMarks, ease, lerp, rgba, rng, setFont, smoothstep, text } from '../kit'
import { css, hex, linearToOklab, oklabToLinear, toLinear, toSrgb, fitGamut } from '../color'
import type { CreatePiece } from '../types'

interface Specimen {
  name: string
  formula: string
  /** representative year (negative = BCE / years before the present) */
  year: number
  when: string
  source: string
  kind: string
  color: string
  toxic?: boolean
  dye?: boolean
  story: string
  price: string
}

// Ordered by the date each was first made or used. Colors: approximate masstone, sRGB.
const SPECIMENS: Specimen[] = [
  { name: 'Red ochre', formula: 'Fe₂O₃ IN CLAY', year: -100000, when: '≈ 100,000 YEARS AGO', source: 'BLOMBOS CAVE, SOUTH AFRICA', kind: 'EARTH PIGMENT', color: '#9A4A2E', story: 'Iron oxide in clay. At Blombos Cave in South Africa, people ground it into a paint about 100,000 years ago.', price: 'DUG FROM THE EARTH' },
  { name: 'Carbon black', formula: 'C', year: -36000, when: '≈ 36,000 YEARS AGO', source: 'CHAUVET CAVE, FRANCE', kind: 'CARBON PIGMENT', color: '#262422', story: 'Soot and charcoal. The lions and horses on the walls of Chauvet Cave were drawn with it more than 30,000 years ago.', price: 'A BURNT STICK' },
  { name: 'Yellow ochre', formula: 'FeO(OH)·nH₂O', year: -17000, when: '≈ 17,000 YEARS AGO', source: 'LASCAUX, FRANCE', kind: 'EARTH PIGMENT', color: '#C79A45', story: 'Hydrated iron oxide. Heat it and it turns red. The horses of Lascaux, about 17,000 years old, are painted in it.', price: 'DUG FROM THE EARTH' },
  { name: 'Egyptian blue', formula: 'CaCuSi₄O₁₀', year: -2500, when: 'BY c. 2500 BCE', source: 'EGYPT', kind: 'SYNTHETIC PIGMENT', color: '#3A68A8', story: 'Sand, copper and lime, fired together: the first synthetic pigment. It glows in infrared light, which is how it is found today.', price: 'COPPER, SAND AND FIRE' },
  { name: 'Tyrian purple', formula: 'C₁₆H₈Br₂N₂O₂', year: -1500, when: 'BY c. 1500 BCE', source: 'THE LEVANT COAST', kind: 'DYE · FROM SEA SNAILS', color: '#6E2648', dye: true, story: 'A dye from murex sea snails, roughly ten thousand of them for a single gram. At times only an emperor was allowed to wear it.', price: '≈ 10,000 SNAILS A GRAM' },
  { name: 'Lead white', formula: '2PbCO₃·Pb(OH)₂', year: -350, when: '4TH C. BCE', source: 'GREECE', kind: 'SYNTHETIC PIGMENT', color: '#EDE8DB', toxic: true, story: 'Lead corroded by vinegar. For two thousand years the white of European painting, and a slow poison to the people who made it.', price: 'THE MAKERS’ HEALTH' },
  { name: 'Vermilion', formula: 'HgS', year: 50, when: '1ST C. CE (CINNABAR)', source: 'ALMADÉN, SPAIN', kind: 'MINERAL PIGMENT', color: '#D23C26', toxic: true, story: 'Mercury sulfide, mined as cinnabar and later made from mercury and sulfur. Brilliant, costly, poisonous, and apt to darken.', price: 'MERCURY' },
  { name: 'Ultramarine', formula: 'Na₇Al₆Si₆O₂₄S₃', year: 600, when: '6TH–7TH C. CE', source: 'BADAKHSHAN, AFGHANISTAN', kind: 'MINERAL PIGMENT', color: '#2A3F9C', story: 'Lapis lazuli from the mines of Badakhshan, ground and washed. In Renaissance Italy it could cost more than gold.', price: 'MORE THAN GOLD' },
  { name: 'Carmine', formula: 'C₂₂H₂₀O₁₃ · Al LAKE', year: 1520, when: '1520s IN EUROPE', source: 'COCHINEAL FROM MEXICO', kind: 'LAKE PIGMENT', color: '#9E1B36', story: 'Crushed cochineal insects from the prickly pears of Mexico. After silver, one of New Spain’s most valuable exports.', price: '≈ 70,000 INSECTS A POUND' },
  { name: 'Prussian blue', formula: 'Fe₄[Fe(CN)₆]₃', year: 1706, when: 'c. 1706', source: 'BERLIN', kind: 'SYNTHETIC PIGMENT', color: '#1F3653', story: 'An accident in Berlin: a red made with tainted potash came out blue. It became the blue of Hokusai’s Great Wave.', price: 'AN ACCIDENT' },
  { name: 'Scheele’s green', formula: 'CuHAsO₃', year: 1775, when: '1775', source: 'SWEDEN', kind: 'SYNTHETIC PIGMENT', color: '#5E9A3D', toxic: true, story: 'Copper arsenite. It colored Victorian wallpapers and dresses, and is thought to have poisoned some of the people who lived with it.', price: 'ARSENIC' },
  { name: 'Cobalt blue', formula: 'CoAl₂O₄', year: 1802, when: '1802', source: 'PARIS', kind: 'SYNTHETIC PIGMENT', color: '#2D5BB0', story: 'France wanted a cheaper ultramarine. In 1802 the chemist Louis Jacques Thénard fired cobalt with alumina and found one.', price: 'A STATE COMMISSION' },
  { name: 'Cadmium yellow', formula: 'CdS', year: 1840, when: '1840s', source: 'GERMANY AND FRANCE', kind: 'SYNTHETIC PIGMENT', color: '#F2B518', toxic: true, story: 'From cadmium, found in 1817 as an impurity in zinc ore. A fierce, lasting yellow, taken up by the Impressionists.', price: 'A HEAVY METAL' },
  { name: 'Mauveine', formula: 'C₂₆H₂₃N₄⁺', year: 1856, when: '1856', source: 'LONDON', kind: 'SYNTHETIC DYE', color: '#8B4A8D', dye: true, story: 'At 18, William Perkin tried to make quinine from coal tar and made a purple instead: the first synthetic dye made in industry.', price: 'COAL TAR' },
  { name: 'Titanium white', formula: 'TiO₂', year: 1916, when: 'c. 1916', source: 'NORWAY AND THE US', kind: 'SYNTHETIC PIGMENT', color: '#F6F6F3', story: 'Brighter than lead and far safer. Since the 1920s the white in paint, paper, plastics and toothpaste.', price: 'AN INDUSTRY' },
  { name: 'YInMn blue', formula: 'YIn₁₋ₓMnₓO₃', year: 2009, when: '2009', source: 'OREGON STATE UNIVERSITY', kind: 'SYNTHETIC PIGMENT', color: '#2E5090', story: 'Testing materials for electronics, a lab pulled a vivid blue from the furnace, often called the first new inorganic blue in two centuries.', price: 'A LUCKY FURNACE' },
]
const N = SPECIMENS.length

const BEATS = [
  { i0: 0, num: 'I', name: 'Earth' },
  { i0: 3, num: 'II', name: 'Fire and trade' },
  { i0: 9, num: 'III', name: 'Accidents and industry' },
  { i0: 15, num: 'IV', name: 'A new blue' },
]

/** Log-age axis: 2030 − year, so 2009 is 21 years and Blombos 102,030. */
const YREF = 2030
const ageLog = (year: number) => Math.log10(YREF - year)
const AXIS0 = ageLog(-160000)
const AXIS1 = ageLog(2016)
const AXIS_TICKS: [number, string][] = [
  [-100000, '100,000 YEARS AGO'],
  [-10000, '10,000'],
  [-1000, '1000 BCE'],
  [1, '1 CE'],
  [1500, '1500'],
  [1800, '1800'],
  [1900, '1900'],
  [2000, '2000'],
]

/** The heap's profile: a rounded cone with a spreading foot, height 0–1 over x in −1…1. */
const heap = (x: number) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x), 1.6)), 1.25)

/** Shades of a pigment for its grains: OKLab lightness steps around the masstone. */
function shades(hx: string) {
  const lab = linearToOklab(toLinear(hex(hx)))
  return [-0.13, -0.065, 0, 0.05, 0.1].map((d) => {
    const L = clamp(lab[0] + d * (lab[0] > 0.85 ? 0.6 : 1), 0.08, 0.99)
    const c = d < 0 ? 1 + d * 0.6 : 1 - d * 0.8
    return css(toSrgb(fitGamut(oklabToLinear([L, lab[1] * c, lab[2] * c]))))
  })
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const INTRO = preview ? 1.2 : 3
  const STEP = preview ? 3 : 4.2
  const CHART0 = INTRO + N * STEP + 0.4
  const CHART1 = CHART0 + (preview ? 7 : 14)
  const LOOP = CHART1 + 2.4
  const arrive = (i: number) => INTRO + i * STEP

  const at = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(at) ? at : preview ? INTRO + STEP * 7 + 1.8 : 0
  let interacted = false
  let pinned = -1
  let hoverCell = -1
  {
    const pp = Number(env.params.get('pin'))
    if (env.params.has('pin') && pp >= 1 && pp <= N) {
      pinned = Math.round(pp) - 1
      if (!env.params.has('at')) clock = CHART0 - 0.5
    }
  }

  /* --------------------------------------------------------------- grains */
  const NG = preview ? 900 : 2400
  const r = rng(0x9161)
  const gx = new Float32Array(NG)
  const gy = new Float32Array(NG)
  const gl = new Uint8Array(NG)
  const gd = new Float32Array(NG)
  {
    let n = 0
    while (n < NG) {
      const x = r() * 2 - 1
      const hmax = heap(x)
      const y = r()
      if (y > hmax) continue
      gx[n] = x
      gy[n] = y
      // lit from the upper left: the left flank bright, the right in shade, with grain-to-grain scatter
      const surf = 1 - (hmax - y) / Math.max(0.05, hmax)
      const v = 0.52 - 0.42 * x * (0.35 + 0.65 * surf) + (r() - 0.5) * 0.42
      gl[n] = Math.max(0, Math.min(4, Math.floor(v * 5)))
      gd[n] = 0.7 * y + 0.3 * r()
      n++
    }
  }
  const SHADES = SPECIMENS.map((s) => shades(s.color))
  const DARK = SPECIMENS.map((s) => linearToOklab(toLinear(hex(s.color)))[0] < 0.6)

  /* --------------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let pad = 16
  let small = false
  let tiny = false
  let mode: 'wide' | 'short' | 'compact' | 'tall' = 'wide'
  // stage: the featured specimen
  const stage = { x: 0, y: 0, w: 100, h: 100, pileX: 0, baseY: 0, halfW: 40, H: 40, labX: 0, labY: 0, labW: 200, storyY: 0, storyW: 200, storyOn: true, brief: false, labMin: 0, labBottom: 0 }
  // cabinet
  const cab = { x: 0, y: 0, cols: 4, rows: 4, cw: 40, ch: 40, gap: 6 }
  // chart
  const chart = { x: 0, y: 0, cols: 8, rows: 2, cw: 60, ch: 60, gap: 8 }
  let capX = 0
  let capY = 0
  let capSize = 24
  let axisY = 0
  let axisX0 = 0
  let axisX1 = 100

  function layout() {
    w = env.width
    h = env.height
    small = preview || Math.min(w, h) < 440
    tiny = h < 260
    pad = clamp(Math.min(w, h) * 0.045, 12, 40)
    const top = pad + (tiny ? 16 : small ? 24 : 38)
    axisY = h - pad - (tiny ? 12 : small ? 16 : 22)
    axisX0 = pad + 4
    axisX1 = w - pad - 4
    const bottom = axisY - (tiny ? 26 : small ? 34 : 48)
    const portrait = h > w * 1.05
    mode = portrait || w / h < 1.2 ? 'tall' : h < 440 ? (w / h > 1.7 ? 'short' : 'compact') : 'wide'
    if (mode === 'wide') {
      capSize = clamp(Math.min(w * 0.028, h * 0.05), 18, 40)
      const cabW = Math.min(w * 0.38, (bottom - top) * 1.0)
      cab.cols = 4
      cab.rows = 4
      cab.gap = clamp(w * 0.006, 4, 10)
      const cs = Math.floor(Math.min((cabW - cab.gap * 3) / 4, (bottom - top - cab.gap * 3) / 4))
      cab.cw = cab.ch = cs
      cab.x = w - pad - (cs * 4 + cab.gap * 3)
      cab.y = top + (bottom - top - (cs * 4 + cab.gap * 3)) / 2
      stage.x = pad
      stage.y = top
      stage.w = cab.x - pad - clamp(w * 0.04, 20, 60)
      stage.h = bottom - top
      capX = pad
      capY = top + 6
      const pileTop = capY + capSize * 2.6 + 30
      const storyH = 58
      const cabBottom = cab.y + cab.ch * 4 + cab.gap * 3
      stage.halfW = Math.min(stage.w * 0.22, (cabBottom - storyH - pileTop) * 0.62)
      stage.H = stage.halfW * 1.05
      stage.pileX = stage.x + stage.halfW * 1.45
      // the story's last line lines up with the bottom of the cabinet
      stage.baseY = Math.max(pileTop + stage.H, cabBottom - storyH - 6)
      stage.labX = stage.pileX + stage.halfW * 1.35 + clamp(stage.w * 0.05, 20, 50)
      stage.labY = stage.baseY - stage.H * 1.05
      stage.labW = Math.min(320, cab.x - 18 - stage.labX)
      stage.storyY = stage.baseY + 30
      stage.storyW = Math.min(stage.w, 560)
      chart.cols = 8
      chart.rows = 2
    } else if (mode === 'compact') {
      // a small landscape frame: the stage across the top, the cabinet as two rows of eight beneath
      capSize = clamp(h * 0.052, 14, 20)
      cab.cols = 8
      cab.rows = 2
      cab.gap = 4
      const cs = Math.floor(Math.min((w - pad * 2 - cab.gap * 7) / 8, ((bottom - top) * 0.4 - cab.gap) / 2))
      cab.cw = cab.ch = cs
      cab.x = (w - (cs * 8 + cab.gap * 7)) / 2
      cab.y = bottom - (cs * 2 + cab.gap)
      stage.x = pad
      stage.y = top
      stage.w = w - pad * 2
      capX = pad
      capY = top + 2
      const storyH = preview || tiny ? 0 : 18
      const pileTop = capY + capSize * 2.3 + 8
      stage.baseY = cab.y - 12 - storyH
      stage.h = stage.baseY - top
      stage.halfW = Math.max(16, Math.min(stage.w * 0.13, (stage.baseY - pileTop) * 0.6))
      stage.H = stage.halfW * 1.05
      stage.pileX = stage.x + stage.halfW * 1.3
      stage.labX = stage.pileX + stage.halfW * 1.35 + 10
      stage.labY = pileTop - 2
      stage.labW = stage.x + stage.w - stage.labX
      stage.storyY = stage.baseY + 15
      stage.storyW = stage.w
      chart.cols = 8
      chart.rows = 2
    } else if (mode === 'short') {
      capSize = clamp(h * 0.06, 13, 22)
      cab.cols = 8
      cab.rows = 2
      cab.gap = 4
      const cabW = w * 0.46
      const cs = Math.floor(Math.min((cabW - cab.gap * 7) / 8, (bottom - top - cab.gap) / 2 - 2))
      cab.cw = cab.ch = cs
      cab.x = w - pad - (cs * 8 + cab.gap * 7)
      cab.y = top + (bottom - top - (cs * 2 + cab.gap)) / 2
      stage.x = pad
      stage.y = top
      stage.w = cab.x - pad - 16
      stage.h = bottom - top
      capX = pad
      capY = top + 2
      const storyH = tiny ? 0 : 26
      const pileTop = tiny ? top + 4 : capY + capSize * 2.4 + 10
      stage.halfW = Math.max(16, Math.min(stage.w * 0.2, (bottom - storyH - pileTop) * 0.55))
      stage.H = stage.halfW * 1.05
      stage.pileX = stage.x + stage.halfW * 1.3
      stage.baseY = bottom - storyH
      stage.labX = stage.pileX + stage.halfW * 1.35 + 8
      stage.labY = stage.baseY - stage.H * 1.1
      stage.labW = Math.max(60, stage.x + stage.w - stage.labX)
      stage.storyY = stage.baseY + 18
      stage.storyW = stage.w
      chart.cols = 8
      chart.rows = 2
    } else {
      capSize = clamp(Math.min(w * 0.062, h * 0.036), 16, 30)
      cab.cols = 4
      cab.rows = 4
      cab.gap = clamp(w * 0.012, 4, 8)
      capX = pad
      capY = top + 2
      const cabAvailW = w - pad * 2
      const stageH = clamp((bottom - top) * 0.42, 110, 360)
      const cs = Math.floor(Math.min((cabAvailW - cab.gap * 3) / 4, (bottom - top - stageH - 10 - cab.gap * 3) / 4))
      cab.cw = cab.ch = cs
      cab.x = (w - (cs * 4 + cab.gap * 3)) / 2
      cab.y = bottom - (cs * 4 + cab.gap * 3)
      stage.x = pad
      stage.y = top
      stage.w = w - pad * 2
      stage.h = cab.y - top - 10
      const storyH = small ? 30 : 46
      const pileTop0 = capY + capSize * 2.4 + 12
      const base0 = cab.y - 14 - storyH
      stage.halfW = Math.max(18, Math.min(stage.w * 0.22, (base0 - pileTop0) * 0.62))
      stage.H = stage.halfW * 1.05
      // a tall frame: caption, specimen and story sit together in the middle of the space above the cabinet
      const block = capSize * 2.4 + 12 + Math.max(stage.H * 1.1, small ? 70 : 96) + 14 + storyH
      const shift = Math.max(0, (cab.y - 10 - top - block) * 0.5)
      capY = top + 2 + shift
      stage.baseY = Math.min(base0, capY + capSize * 2.4 + 12 + Math.max(stage.H * 1.1, small ? 70 : 96))
      stage.pileX = stage.x + stage.halfW * 1.3
      stage.labX = stage.pileX + stage.halfW * 1.35 + 8
      stage.labY = stage.baseY - stage.H * 1.1
      stage.labW = stage.x + stage.w - stage.labX
      stage.storyY = stage.baseY + 18
      stage.storyW = stage.w
      chart.cols = 4
      chart.rows = 4
    }
    stage.labMin = capY + capSize * 2.3 + 4
    // the chart fills the whole content area
    chart.gap = clamp(w * 0.008, 4, 12)
    const cw = (w - pad * 2 - chart.gap * (chart.cols - 1)) / chart.cols
    const chH = (bottom - top - (small ? 4 : 30) - chart.gap * (chart.rows - 1)) / chart.rows
    chart.cw = cw
    chart.ch = Math.min(chH, cw * (mode === 'tall' ? 1.55 : 1.6))
    chart.x = pad
    chart.y = top + (small ? 2 : 26) + (bottom - top - (small ? 4 : 30) - (chart.ch * chart.rows + chart.gap * (chart.rows - 1))) / 2
    stage.storyOn = !tiny && !(mode === 'compact' && preview)
    // small landscape frames get a shorter label: formula, date, kind
    stage.brief = tiny || (small && (mode === 'compact' || mode === 'short'))
    storyCache.clear()
  }

  const storyCache = new Map<string, string[]>()
  function wrap(s: string, maxW: number, size: number) {
    const key = `${s}|${Math.round(maxW)}|${size}`
    const hit = storyCache.get(key)
    if (hit) return hit
    setFont(ctx, { font: 'sans', size, weight: 400, tracking: 0 })
    const words = s.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const wd of words) {
      const tryS = cur ? cur + ' ' + wd : wd
      if (ctx.measureText(tryS).width > maxW && cur) {
        lines.push(cur)
        cur = wd
      } else cur = tryS
    }
    if (cur) lines.push(cur)
    storyCache.set(key, lines)
    return lines
  }

  layout()

  /* ---------------------------------------------------------------- timing */
  const Tnow = () => ((clock % LOOP) + LOOP) % LOOP
  const featuredAt = (T: number) => (T < INTRO || T >= CHART0 - 0.4 ? -1 : Math.min(N - 1, Math.floor((T - INTRO) / STEP)))
  const cellRect = (i: number) => {
    const c = i % cab.cols
    const rr = Math.floor(i / cab.cols)
    return { x: cab.x + c * (cab.cw + cab.gap), y: cab.y + rr * (cab.ch + cab.gap), w: cab.cw, h: cab.ch }
  }
  const chartRect = (i: number) => {
    const c = i % chart.cols
    const rr = Math.floor(i / chart.cols)
    return { x: chart.x + c * (chart.cw + chart.gap), y: chart.y + rr * (chart.ch + chart.gap), w: chart.cw, h: chart.ch }
  }
  const axisX = (year: number) => lerp(axisX0, axisX1, (AXIS0 - ageLog(year)) / (AXIS0 - AXIS1))

  /* -------------------------------------------------------------- drawing */
  const k = { ink: C.ink, ink2: C.ink2, muted: C.muted }

  /** A hand-ground pile: grains pour in bottom first and settle into a heap lit from the upper left. */
  function pile(i: number, cx: number, baseY: number, halfW: number, H: number, progress: number, every = 1, alpha = 1) {
    if (progress <= 0) return
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()]
    const g = Math.max(1, halfW * 0.019) * (every > 1 ? Math.min(2.4, Math.sqrt(every) * 0.85) : 1)
    for (let n = 0; n < NG; n += every) {
      const d = gd[n] * 0.82
      if (progress < d) continue
      const f = ease.outCubic(clamp((progress - d) / 0.18))
      const x = cx + gx[n] * halfW
      const y = baseY - gy[n] * H - (1 - f) * H * 0.6
      paths[gl[n]].rect(x - g / 2, y - g, g, g)
    }
    ctx.save()
    ctx.globalAlpha = alpha
    // the body of the heap: a mid-tone fill with its shaded flank, laid down as the grains settle
    const body = clamp((progress - 0.35) / 0.65)
    if (body > 0) {
      const hp = new Path2D()
      for (let k2 = 0; k2 <= 40; k2++) {
        const x = -1 + k2 / 20
        const yy = baseY - heap(x) * H * (0.6 + 0.4 * body)
        if (k2 === 0) hp.moveTo(cx + x * halfW, yy)
        else hp.lineTo(cx + x * halfW, yy)
      }
      hp.closePath()
      ctx.globalAlpha = alpha * body * 0.9
      ctx.fillStyle = SHADES[i][2]
      ctx.fill(hp)
      ctx.save()
      ctx.clip(hp)
      // the shaded flank, in two soft steps away from the light
      for (const [x0, x1, al] of [
        [-0.08, 0.2, 0.4],
        [0.06, 0.42, 0.55],
      ]) {
        ctx.fillStyle = SHADES[i][1]
        ctx.globalAlpha = alpha * body * al
        ctx.beginPath()
        ctx.moveTo(cx + halfW * x0, baseY - H * 1.1)
        ctx.lineTo(cx + halfW * 1.1, baseY - H * 1.1)
        ctx.lineTo(cx + halfW * 1.1, baseY + 1)
        ctx.lineTo(cx + halfW * x1, baseY + 1)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      ctx.globalAlpha = alpha
    }
    for (let l = 0; l < 5; l++) {
      ctx.fillStyle = SHADES[i][l]
      ctx.fill(paths[l])
    }
    // the heap's contour in hairline (it is what shows a white pile on paper), and the slab it sits on
    const settled = clamp((progress - 0.55) / 0.45)
    ctx.lineWidth = 1
    if (settled > 0 && every < 4) {
      ctx.strokeStyle = rgba(C.ink, 0.22 * settled)
      ctx.beginPath()
      for (let k2 = 0; k2 <= 40; k2++) {
        const x = -1 + k2 / 20
        const yy = baseY - heap(x) * H - g * 0.6
        if (k2 === 0) ctx.moveTo(cx + x * halfW, yy)
        else ctx.lineTo(cx + x * halfW, yy)
      }
      ctx.stroke()
    }
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    ctx.moveTo(cx - halfW * 1.25, baseY + 0.5)
    ctx.lineTo(cx + halfW * 1.25, baseY + 0.5)
    ctx.stroke()
    ctx.restore()
  }

  /** A dyed swatch of cloth: weave lines and a fringe, drawn down from the top. */
  function swatch(i: number, cx: number, baseY: number, halfW: number, H: number, progress: number, alpha = 1, detail = true) {
    if (progress <= 0) return
    const sw = halfW * 1.5
    const sh = H * 1.08
    const x = cx - sw / 2
    const y = baseY - sh
    const shown = sh * ease.outCubic(clamp(progress / 0.9))
    const S = SHADES[i]
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = S[2]
    ctx.fillRect(x, y, sw, shown * 0.9)
    if (detail) {
      // the weave: fine horizontal threads, alternately lighter and darker
      ctx.lineWidth = 1
      for (let t = 0; t < 2; t++) {
        ctx.strokeStyle = t ? S[3] : S[1]
        ctx.beginPath()
        for (let yy = y + 2 + t * 2; yy < y + shown * 0.9; yy += 4) {
          ctx.moveTo(x, Math.round(yy) + 0.5)
          ctx.lineTo(x + sw, Math.round(yy) + 0.5)
        }
        ctx.stroke()
      }
      // a fold: one darker diagonal wash
      ctx.fillStyle = S[0]
      ctx.globalAlpha = alpha * 0.35
      ctx.beginPath()
      ctx.moveTo(x + sw * 0.62, y)
      ctx.lineTo(x + sw * 0.78, y)
      ctx.lineTo(x + sw * 0.5, y + shown * 0.9)
      ctx.lineTo(x + sw * 0.36, y + shown * 0.9)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = alpha
    }
    // the fringe
    if (progress > 0.7) {
      const fa = clamp((progress - 0.7) / 0.3)
      ctx.strokeStyle = S[1]
      ctx.lineWidth = 1
      ctx.beginPath()
      const fy = y + sh * 0.9
      for (let xx = x + 1.5; xx < x + sw; xx += 3) {
        ctx.moveTo(xx, fy)
        ctx.lineTo(xx + Math.sin(xx * 1.7) * 1.2, fy + sh * 0.1 * fa)
      }
      ctx.stroke()
    }
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    ctx.moveTo(cx - halfW * 1.25, baseY + 0.5)
    ctx.lineTo(cx + halfW * 1.25, baseY + 0.5)
    ctx.stroke()
    ctx.restore()
  }

  function specimenArt(i: number, cx: number, baseY: number, halfW: number, H: number, progress: number, every = 1, alpha = 1) {
    if (SPECIMENS[i].dye) swatch(i, cx, baseY, halfW, H, progress, alpha, every === 1)
    else pile(i, cx, baseY, halfW, H, progress, every, alpha)
  }

  /** The hairline label: pin, string to the specimen, name, formula, date, source, kind. */
  function label(i: number, u: number, alpha: number) {
    const s = SPECIMENS[i]
    const a = alpha * smoothstep(0.45, 1.0, u)
    if (a <= 0) return
    const x = stage.labX
    const y0 = stage.labY
    const lw = stage.labW
    let nameSize = tiny ? 15 : small ? 18 : clamp(stage.halfW * 0.24, 20, 34)
    let ms = tiny ? 7.5 : small ? 8 : 9.5
    // shrink the type until the card fits the room beside the specimen
    for (let g = 0; g < 6 && measureLabel(i, nameSize, ms) + 20 > lw; g++) {
      nameSize *= 0.92
      ms = Math.max(6.5, ms * 0.94)
    }
    const lh = ms + (small ? 5 : 7)
    const fullH = nameSize * 1.25 + 4 * lh + (small ? 8 : 14)
    // the card never hangs below the slab, nor rises into the caption: if it must, it drops the source
    const brief = stage.brief || stage.baseY - fullH < stage.labMin
    const lines = brief ? [s.formula, s.when, s.kind] : [s.formula, s.when, s.source, s.kind]
    const boxH = nameSize * 1.25 + lines.length * lh + (small ? 8 : 14)
    const y = Math.max(stage.labMin, Math.min(y0, stage.baseY - boxH))
    stage.labBottom = y + boxH
    ctx.save()
    ctx.globalAlpha = a
    // the string from the pin to the top of the pile
    const pinX = x + 6
    const pinY = y - 6
    const draw = ease.outCubic(smoothstep(0.45, 1.1, u))
    const ax = stage.pileX + stage.halfW * 0.25
    const ay = stage.baseY - stage.H * 0.82
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pinX, pinY)
    ctx.lineTo(lerp(pinX, ax, draw), lerp(pinY, ay, draw))
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(ax, ay, 1.6, 0, TAU)
    ctx.fillStyle = rgba(C.ink, 0.6 * draw)
    ctx.fill()
    // the card
    ctx.strokeStyle = rgba(C.ink, 0.6)
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(Math.min(lw, measureLabel(i, nameSize, ms) + 20)), Math.round(boxH))
    ctx.beginPath()
    ctx.arc(pinX, pinY, 3, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.arc(pinX, pinY, 1, 0, TAU)
    ctx.fill()
    let yy = y + nameSize * 1.05 + (small ? 4 : 8)
    text(ctx, s.name, x + 10, yy, { font: 'serif', size: nameSize, color: C.ink })
    yy += lh * 0.4
    for (let li = 0; li < lines.length; li++) {
      yy += lh
      const col = li === 0 ? k.ink : li === lines.length - 1 ? C.ocean : k.muted
      text(ctx, lines[li], x + 10, yy - 2, { size: ms, color: col, tracking: li === 0 ? 0.06 : 0.12 })
    }
    if (s.toxic) {
      setFont(ctx, { size: ms, tracking: 0.12 })
      const kw = ctx.measureText(s.kind).width
      const tx = x + 10 + kw + 10
      text(ctx, 'TOXIC', tx + 4, yy - 2, { size: ms - 0.5, color: '#9A3324', tracking: 0.14 })
      setFont(ctx, { size: ms - 0.5, tracking: 0.14 })
      const tw = ctx.measureText('TOXIC').width
      ctx.strokeStyle = 'rgba(154,51,36,0.7)'
      ctx.strokeRect(Math.round(tx) + 0.5, Math.round(yy - 2 - ms) + 0.5, Math.round(tw + 8), Math.round(ms + 4))
    }
    ctx.restore()
  }
  function measureLabel(i: number, nameSize: number, ms: number) {
    const s = SPECIMENS[i]
    setFont(ctx, { font: 'serif', size: nameSize })
    let m = ctx.measureText(s.name).width
    setFont(ctx, { size: ms, tracking: 0.12 })
    for (const l of [s.formula, s.when, s.source]) m = Math.max(m, ctx.measureText(l).width)
    m = Math.max(m, ctx.measureText(s.kind).width + (s.toxic ? ctx.measureText('TOXIC').width + 26 : 0))
    return m
  }

  function story(i: number, alpha: number) {
    if (!stage.storyOn || alpha <= 0) return
    const size = small ? 11 : 13
    const lines = wrap(SPECIMENS[i].story, stage.storyW, size)
    let maxL = mode === 'short' || mode === 'compact' ? 1 : small ? 2 : 3
    // below the label if the label had to hang low, and never into the cabinet
    const sy = Math.max(stage.storyY, stage.labBottom + size + 6)
    const room = mode === 'wide' || mode === 'short' ? axisY - 30 : cab.y - 6
    maxL = Math.min(maxL, Math.floor((room - sy + size) / (size * 1.45)))
    if (maxL <= 0) return
    ctx.save()
    ctx.globalAlpha = alpha
    lines.slice(0, maxL).forEach((ln, li) => {
      const last = li === maxL - 1 && lines.length > maxL
      text(ctx, last ? ln.replace(/[ ,.;:]*$/, '') + '…' : ln, stage.x, sy + li * size * 1.45, { font: 'sans', size, weight: 400, color: k.ink2, tracking: 0 })
    })
    ctx.restore()
  }

  function featured(i: number, u: number) {
    // pour, label, story, then fly into the drawer
    const fly = smoothstep(STEP - 0.85, STEP, u)
    const pour = clamp(u / 1.4)
    if (fly < 1) {
      const fa = 1 - fly
      if (fly <= 0) {
        specimenArt(i, stage.pileX, stage.baseY, stage.halfW, stage.H, pour)
      } else {
        const cr = cellRect(i)
        const e = ease.inOutCubic(fly)
        const tHalf = cr.w * 0.3
        const cx = lerp(stage.pileX, cr.x + cr.w / 2, e)
        const by = lerp(stage.baseY, cr.y + cr.h * 0.78, e)
        const hw = lerp(stage.halfW, tHalf, e)
        specimenArt(i, cx, by, hw, hw * 1.05, 1, e > 0.6 ? 6 : 1)
      }
      label(i, u, fa)
      story(i, fa * smoothstep(0.9, 1.5, u))
    }
  }

  /** A filed drawer: hairline frame, number, a small pile or swatch, the name. */
  function drawer(i: number, filled: number, hi: boolean) {
    const c = cellRect(i)
    ctx.lineWidth = 1
    ctx.strokeStyle = hi ? C.ink : rgba(C.ink, 0.22)
    ctx.strokeRect(Math.round(c.x) + 0.5, Math.round(c.y) + 0.5, Math.round(c.w), Math.round(c.h))
    const ns = c.w > 70 ? 8 : 7
    if (c.w > 26) text(ctx, String(i + 1).padStart(2, '0'), c.x + 4, c.y + ns + 3, { size: ns, color: hi ? C.ink : k.muted, tracking: 0.1 })
    if (filled <= 0) return
    specimenArt(i, c.x + c.w / 2, c.y + c.h * (c.w > 70 ? 0.74 : 0.82), c.w * 0.3, c.w * 0.3 * 1.05, 1, NG > 1000 ? 8 : 4, filled)
    if (c.w > 84 && !small) {
      setFont(ctx, { size: 7.5, tracking: 0.1 })
      let nm = SPECIMENS[i].name.toUpperCase()
      while (nm.length > 3 && ctx.measureText(nm).width > c.w - 8) nm = nm.slice(0, -1)
      text(ctx, nm, c.x + 4, c.y + c.h - 5, { size: 7.5, color: k.ink2, tracking: 0.1, alpha: filled })
    }
  }

  function cabinet(T: number, alpha: number) {
    const drawIn = clamp(T / (INTRO * 0.9))
    ctx.save()
    ctx.globalAlpha = alpha
    for (let i = 0; i < N; i++) {
      const a = smoothstep(i / N * 0.6, i / N * 0.6 + 0.4, drawIn)
      if (a <= 0) continue
      ctx.globalAlpha = alpha * a
      const filled = smoothstep(arrive(i) + STEP - 0.15, arrive(i) + STEP + 0.1, T)
      drawer(i, filled, i === pinned || i === hoverCell)
    }
    ctx.restore()
    if (!small && mode !== 'short') {
      text(ctx, `THE CABINET · ${N} DRAWERS`, cab.x, cab.y - 9, { size: 8.5, color: k.muted, tracking: 0.14, alpha })
    }
  }

  /** The chart: the cabinet opened out into flat swatches, each with its date and its price. */
  function chartView(T: number) {
    const open = ease.inOutCubic(smoothstep(CHART0, CHART0 + 1.6, T))
    const close = smoothstep(CHART1, CHART1 + 1.8, T)
    const ns = small ? 7.5 : 9
    for (let i = 0; i < N; i++) {
      const a = cellRect(i)
      const b = chartRect(i)
      const st = clamp((open - (i / N) * 0.25) / 0.75)
      const e = ease.inOutCubic(st)
      const x = lerp(a.x, b.x, e)
      const y = lerp(a.y, b.y, e)
      const cw = lerp(a.w, b.w, e)
      const ch = lerp(a.h, b.h, e)
      const fade = 1 - clamp((close - (1 - i / N) * 0.3) / 0.7)
      if (fade <= 0) continue
      ctx.save()
      ctx.globalAlpha = fade
      const swH = ch * (small ? 0.62 : 0.56)
      ctx.fillStyle = SPECIMENS[i].color
      ctx.fillRect(x, y, cw, swH * e + (1 - e) * 0)
      ctx.lineWidth = 1
      ctx.strokeStyle = i === hoverCell || i === pinned ? C.ink : rgba(C.ink, 0.25)
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(cw), Math.round(ch))
      if (e < 0.5) {
        ctx.globalAlpha = fade * (1 - e * 2)
        specimenArt(i, x + cw / 2, y + ch * 0.78, cw * 0.3, cw * 0.31, 1, NG > 1000 ? 8 : 4)
      }
      const ta = smoothstep(0.75, 1, st) * fade
      if (ta > 0) {
        ctx.globalAlpha = ta
        let ty = y + swH + ns + 5
        const fitS = (s: string, size: number) => {
          setFont(ctx, { size, tracking: 0.08 })
          let q = s
          while (q.length > 3 && ctx.measureText(q).width > cw - 8) q = q.slice(0, -1)
          return q
        }
        text(ctx, String(i + 1).padStart(2, '0'), x + 4, y + ns + 3, { size: ns - 1, color: DARK[i] ? 'rgba(255,255,255,0.75)' : rgba(C.ink, 0.6), tracking: 0.1 })
        text(ctx, fitS(SPECIMENS[i].name.toUpperCase(), ns), x + 4, ty, { size: ns, color: C.ink, tracking: 0.08 })
        if (ch - swH > ns * 3.2) {
          ty += ns + 5
          text(ctx, fitS(SPECIMENS[i].when, ns - 1), x + 4, ty, { size: ns - 1, color: k.muted, tracking: 0.08 })
        }
        if (ch - swH > ns * 4.8) {
          ty += ns + 5
          text(ctx, fitS(SPECIMENS[i].price, ns - 1), x + 4, ty, { size: ns - 1, color: '#9A3324', tracking: 0.08 })
        }
      }
      ctx.restore()
    }
    if (!small) {
      const ta = smoothstep(CHART0 + 1.2, CHART0 + 2, T) * (1 - close)
      text(ctx, 'A COLOR CHART · MASSTONES, APPROXIMATE sRGB · EACH WITH ITS PRICE', chart.x, chart.y - 10, { size: 8.5, color: k.muted, tracking: 0.14, alpha: ta })
    }
  }

  /** The log-age timeline along the bottom, with a mark for every specimen. */
  function timeline(T: number, fi: number) {
    if (tiny && w < 500) return
    const yb = axisY
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    ctx.moveTo(axisX0, yb)
    ctx.lineTo(axisX1, yb)
    ctx.stroke()
    const labelEvery = w < 520 ? 2 : 1
    AXIS_TICKS.forEach(([yr, lab], ti) => {
      const x = axisX(yr)
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.beginPath()
      ctx.moveTo(x, yb - 3)
      ctx.lineTo(x, yb + 3)
      ctx.stroke()
      if (ti % labelEvery === 0 && !(tiny && ti > 0)) text(ctx, w < 700 && ti === 0 ? '100,000 YA' : lab, x, yb + (small ? 12 : 15), { size: small ? 7 : 8, color: k.muted, align: ti === 0 ? 'left' : 'center', tracking: 0.1 })
    })
    // specimens: a colored tick each, once arrived
    for (let i = 0; i < N; i++) {
      const x = axisX(SPECIMENS[i].year)
      const here = T >= arrive(i) || T >= CHART0
      const s = small ? 4 : 5
      ctx.fillStyle = here ? SPECIMENS[i].color : 'rgba(0,0,0,0)'
      ctx.strokeStyle = rgba(C.ink, here ? 0.45 : 0.25)
      ctx.fillRect(x - s / 2, yb - s - 4, s, s)
      ctx.strokeRect(Math.round(x - s / 2) + 0.5, Math.round(yb - s - 4) + 0.5, s, s)
    }
    // the playhead rides between specimens' dates as the clock runs
    let px = axisX0
    if (T >= CHART0 - 0.4) px = axisX1
    else if (fi >= 0) {
      const u = clamp((T - arrive(fi)) / STEP)
      const a = axisX(SPECIMENS[fi].year)
      const b = fi < N - 1 ? axisX(SPECIMENS[fi + 1].year) : axisX1
      px = lerp(a, b, smoothstep(0.75, 1, u))
    }
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(px, yb - 13)
    ctx.lineTo(px, yb + 2)
    ctx.stroke()
    if (scrubbing || hoverAxis) {
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      ctx.moveTo(axisHoverX, yb - 16)
      ctx.lineTo(axisHoverX, yb + 4)
      ctx.stroke()
    }
    ctx.restore()
  }

  function captions(T: number) {
    const caps = [
      { t0: 0.8, t1: arrive(3) - 0.4, a: 'The first colors came', b: '', em: 'from the ground.' },
      { t0: arrive(6) + 0.6, t1: arrive(9) - 0.4, a: 'Some were worth', b: '', em: 'more than gold.' },
      { t0: arrive(9) + 0.6, t1: arrive(15) - 0.4, a: 'Many were found', b: '', em: 'by accident.' },
      { t0: arrive(15) + 0.5, t1: CHART0 - 0.3, a: 'And the search', b: '', em: 'goes on.' },
      { t0: CHART0 + 1.4, t1: CHART1 + 1, a: 'Every color', b: 'has ', em: 'a price.' },
    ]
    for (const c of caps) {
      if (T < c.t0 - 0.1 || T > c.t1 + 0.1) continue
      const lineH = capSize * 1.06
      const lines = [
        { s: c.a, em: c.b ? '' : '' },
        { s: c.b, em: c.em },
      ]
      // the chart takes the whole frame; its caption sits over the bottom band instead
      const inChart = T >= CHART0
      const chartBottom = chart.y + chart.rows * chart.ch + (chart.rows - 1) * chart.gap
      let cy0 = capY
      if (inChart) {
        cy0 = mode === 'tall' ? chartBottom + 8 : axisY - (tiny ? 20 : 34) - capSize * 2.2
        if ((small && mode !== 'tall') || cy0 + capSize * 2.2 > axisY - 16 || (mode !== 'tall' && cy0 < chartBottom - 4)) continue
      }
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - c.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (c.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = cy0 + capSize + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, w, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (inChart) {
          ctx.fillStyle = rgba(C.paper, 0.86)
          setFont(ctx, { font: 'serif', size: capSize, italic: true })
          const ew = ctx.measureText(ln.em).width
          ctx.fillRect(capX - 6, y - capSize * 0.9, sw + ew + 14, capSize * 1.2)
        }
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: C.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function header(T: number, fi: number) {
    const hs = small ? 8.5 : 10
    const hy = pad + (small ? 2 : 6)
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, 'FIG. C.09', pad + 26, hy, { size: hs, color: C.ocean, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const fw = ctx.measureText('FIG. C.09').width
    text(ctx, w < 560 ? 'PIGMENTS' : 'PIGMENTS · A CABINET OF COLOR', pad + 26 + fw + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    const shownI = pinned >= 0 ? pinned : hoverCell >= 0 ? hoverCell : fi
    let right = ''
    if (T >= CHART0 - 0.4 && pinned < 0 && hoverCell < 0) right = 'V — THE CABINET'
    else if (shownI >= 0) {
      const b = BEATS.reduce((acc, bb) => (shownI >= bb.i0 ? bb : acc), BEATS[0])
      right = w < 640 ? `${String(shownI + 1).padStart(2, '0')} / ${N}` : `${b.num} — ${b.name.toUpperCase()} · SPECIMEN ${String(shownI + 1).padStart(2, '0')} / ${N}`
    } else right = w < 640 ? '' : 'I — EARTH'
    if (right && w > 360) text(ctx, right, w - pad, hy, { size: hs, color: k.ink2, align: 'right', tracking: 0.14 })
  }

  /** In the chart (or while inspecting a drawer there), one line of story above the timeline. */
  function storyBar(i: number) {
    if (tiny) return
    const size = small ? 10.5 : 12.5
    const y = axisY - (small ? 22 : 30)
    const s = SPECIMENS[i]
    setFont(ctx, { font: 'serif', size: size * 1.3 })
    const nw = ctx.measureText(s.name + '  ').width
    const lines = wrap(s.story, w - pad * 2 - nw, size)
    ctx.fillStyle = rgba(C.paper, 0.92)
    ctx.fillRect(pad - 4, y - size * 1.4, w - pad * 2 + 8, size * 2)
    text(ctx, s.name, pad, y, { font: 'serif', size: size * 1.3, color: C.ink })
    text(ctx, lines[0] + (lines.length > 1 ? '…' : ''), pad + nw, y, { font: 'sans', size, weight: 400, color: k.ink2, tracking: 0 })
  }

  function hints(T: number) {
    if (preview || tiny) return
    // a contextual prompt above the timeline: what the pointer does, or why the clock is waiting
    if (mode === 'wide' || mode === 'tall') {
      const narrow = w < 560
      let s = narrow ? 'TAP A DRAWER · DRAG THE TIMELINE' : 'HOVER OR TAP A DRAWER TO READ IT · DRAG THE TIMELINE · ← → STEP'
      let col: string = k.muted
      if (pinned >= 0) {
        s = narrow ? 'PINNED · TAP AGAIN TO LET GO' : `PINNED · ${SPECIMENS[pinned].name.toUpperCase()} · TAP IT AGAIN TO LET GO`
        col = C.ink
      } else if (hoverCell >= 0) {
        s = 'READING · MOVE AWAY TO RESUME'
        col = C.ink2
      }
      // under the cabinet, clear of the timeline and its ghost
      const yy = Math.min(axisY - 24, cab.y + cab.ch * cab.rows + cab.gap * (cab.rows - 1) + 18)
      text(ctx, s, w - pad, yy, { size: small ? 8 : 9, color: col, align: 'right', tracking: 0.14, alpha: interacted && pinned < 0 && hoverCell < 0 ? 0.55 : 1 })
    }
    if (interacted || clock > LOOP) return
    // the ghost: a dot sliding along the timeline, then a ring around the first drawer
    if (T > 3.6 && T < 8.4) {
      const g = clamp((T - 3.6) / 4.8)
      const a = smoothstep(0, 0.1, g) * (1 - smoothstep(0.85, 1, g))
      const x = lerp(axisX(-60000), axisX(1700), ease.inOutSine(clamp((g - 0.1) / 0.75)))
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.moveTo(axisX(-60000), axisY - 22)
      ctx.lineTo(axisX(1700), axisY - 22)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(x, axisY - 22, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, axisY - 22, 9, 0, TAU)
      ctx.stroke()
      text(ctx, 'DRAG THE TIMELINE TO TRAVEL', axisX(1700) + 14, axisY - 19, { size: 9, color: C.ink, tracking: 0.14 })
      ctx.restore()
    }
    if (T > arrive(2) + 0.5 && T < arrive(3) + 2.5) {
      const c = cellRect(0)
      const a = smoothstep(arrive(2) + 0.5, arrive(2) + 1, T) * (1 - smoothstep(arrive(3) + 2, arrive(3) + 2.5, T))
      const pulse = 0.5 + 0.5 * Math.sin(T * 5)
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(C.ink, 0.35 + 0.35 * pulse)
      ctx.setLineDash([2, 3])
      ctx.strokeRect(c.x - 4.5, c.y - 4.5, c.w + 9, c.h + 9)
      ctx.setLineDash([])
      const lx = mode === 'tall' ? c.x : c.x
      const ly = c.y - 10
      text(ctx, mode === 'wide' ? 'TAP A DRAWER TO READ IT' : 'TAP A DRAWER', lx, ly - (mode === 'wide' ? 8 : 0), { size: 9, color: C.ink, tracking: 0.14 })
      ctx.restore()
    }
  }

  /* ------------------------------------------------------------ interaction */
  let scrubbing = false
  let hoverAxis = false
  let axisHoverX = 0
  const onAxis = (x: number, y: number) => !preview && !(tiny && w < 500) && y > axisY - 26 && y < h && x > axisX0 - 10 && x < axisX1 + 10
  function seekAxis(x: number) {
    // between two specimens’ dates, go to whichever is nearer
    const xs = SPECIMENS.map((s) => axisX(s.year))
    let T: number
    if (x <= xs[0]) T = arrive(0) + 1.6
    else if (x >= xs[N - 1] + 30) T = CHART0 + 2
    else {
      let i = 0
      while (i < N - 1 && x > xs[i + 1]) i++
      const f = i < N - 1 ? clamp((x - xs[i]) / (xs[i + 1] - xs[i])) : 0
      T = lerp(arrive(i) + 1.6, i < N - 1 ? arrive(i + 1) + 1.6 : arrive(i) + 1.6, f < 0.5 ? 0 : 1)
    }
    clock += T - Tnow()
  }
  function cellAt(x: number, y: number, touch: boolean) {
    const T = Tnow()
    const slop = touch ? 6 : 0
    const inChart = T >= CHART0 + 1.6 && T < CHART1
    for (let i = 0; i < N; i++) {
      const c = inChart ? chartRect(i) : cellRect(i)
      if (x >= c.x - slop && x <= c.x + c.w + slop && y >= c.y - slop && y <= c.y + c.h + slop) {
        const filled = inChart || T >= arrive(i) + STEP - 0.1
        return filled ? i : -1
      }
    }
    return -1
  }

  /* ------------------------------------------------------------------ frame */
  let prevT = -1
  const fontsLoaded = () => {
    try {
      return typeof document === 'undefined' || !document.fonts || document.fonts.check('40px "Instrument Serif"')
    } catch {
      return true
    }
  }
  let fontsReady = fontsLoaded()

  return {
    resize() {
      layout()
    },
    frame(_t, dt) {
      if (!fontsReady && fontsLoaded()) {
        fontsReady = true
        layout()
      }
      // inspecting a drawer holds the clock
      const holding = pinned >= 0 || (hoverCell >= 0 && !preview) || scrubbing
      if (!holding) clock += dt
      const T = Tnow()
      const fi = featuredAt(T)
      const crossed = (te: number) => dt > 0 && prevT >= 0 && prevT < te && te <= T
      for (let i = 0; i < N; i++) {
        if (crossed(arrive(i) + 0.05)) env.sfx.noise(1.2, { filter: 2600, to: 900, q: 0.8, gain: 0.018, room: 0.25 })
        if (crossed(arrive(i) + 0.9)) env.sfx.tone(1318.5, 0.08, { type: 'sine', gain: 0.03, room: 0.2 })
        if (crossed(arrive(i) + STEP - 0.05)) env.sfx.tone([392, 440, 493.88, 587.33][i % 4], 0.6, { type: 'triangle', gain: 0.025, room: 0.35 })
      }
      if (crossed(CHART0 + 0.2)) [261.63, 329.63, 392, 493.88, 587.33].forEach((f, j) => env.sfx.tone(f, 4, { type: 'sine', gain: 0.025, attack: 0.3, room: 0.6, when: j * 0.12 }))

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, w, h)
      const inspect = pinned >= 0 ? pinned : hoverCell
      const inChart = T >= CHART0 - 0.2

      if (!inChart) {
        cabinet(T, 1)
        if (inspect >= 0) {
          // a filed specimen, brought back to the stage
          specimenArt(inspect, stage.pileX, stage.baseY, stage.halfW, stage.H, 1)
          label(inspect, 2, 1)
          story(inspect, 1)
        } else if (fi >= 0) featured(fi, T - arrive(fi))
        // the stage's frame: crop marks around the specimen
        ctx.strokeStyle = rgba(C.ink, 0.35)
        ctx.lineWidth = 1
        if (!tiny) cropMarks(ctx, stage.pileX - stage.halfW * 1.4, stage.baseY - stage.H * 1.25, stage.halfW * 2.8, stage.H * 1.25 + 8, small ? 6 : 9)
      } else {
        chartView(T)
        if (inspect >= 0) storyBar(inspect)
      }
      captions(T)
      header(T, fi)
      timeline(T, fi)
      hints(T)
      if (!preview) env.setCursor(scrubbing ? 'grabbing' : hoverAxis ? 'ew-resize' : hoverCell >= 0 ? 'pointer' : 'default')
      prevT = T
    },
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hoverCell = -1
        hoverAxis = false
        scrubbing = false
        return
      }
      hoverAxis = onAxis(p.x, p.y)
      axisHoverX = clamp(p.x, axisX0, axisX1)
      if (p.type === 'down') {
        if (hoverAxis) {
          interacted = true
          scrubbing = true
          pinned = -1
          seekAxis(p.x)
          return
        }
        const c = cellAt(p.x, p.y, touch)
        interacted = interacted || c >= 0
        pinned = c >= 0 && pinned !== c ? c : -1
        hoverCell = touch ? -1 : c
        return
      }
      if (p.type === 'move') {
        if (scrubbing && p.pressed) {
          seekAxis(p.x)
          return
        }
        hoverCell = touch ? -1 : cellAt(p.x, p.y, touch)
        if (hoverCell >= 0) interacted = true
      }
      if (p.type === 'up') scrubbing = false
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      interacted = true
      const T = Tnow()
      const base = pinned >= 0 ? pinned : featuredAt(T)
      pinned = -1
      if (code === 'ArrowRight') {
        if (T >= CHART0 - 0.4) clock += LOOP - T + arrive(0) + 0.01
        else if (base >= N - 1) clock += CHART0 - T
        else clock += arrive(base + 1) + 0.01 - T
      } else {
        if (T >= CHART0 - 0.4) clock += arrive(N - 1) + 0.01 - T
        else if (base <= 0) clock += -T
        else {
          const u = T - arrive(base)
          clock += arrive(u < 1.2 ? base - 1 : base) + 0.01 - T
        }
      }
      return true
    },
  }
}

export default create
