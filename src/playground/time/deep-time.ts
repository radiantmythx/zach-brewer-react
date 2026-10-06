/*
 * FIG. T.05 — DEEP TIME
 *
 * The Earth's whole history, 4.54 billion years, set as one calendar year:
 * one day = 12.4 million years, one second = 144 years. A hairline spiral of
 * twelve turns (one per month, January at the centre) inks itself as the
 * year passes, coloured by eon, while a card shows each moment as a small
 * drawing: the Moon-forming impact on January 3, the first oceans, the first
 * life in March (hedged), the Great Oxidation at midsummer, complex cells in
 * August, Snowball Earth in November, then trilobites, land plants,
 * dinosaurs and the asteroid on December 26. On December 31 the spiral
 * hands over to a 24-hour dial (the first humans at 18:36, our species at
 * 23:25) and then to a ruler of the last two minutes: farming at 23:58:37,
 * writing at 23:59:24, the pyramids, the printing press four seconds before
 * midnight, and a whole human life in the last half-second.
 *
 * Six chapters over 90 s, a pure function of time (it dwells at each event;
 * the speed is always shown):
 *   I    One year        the spiral draws itself; the Earth forms
 *   II   Too small to see  Moon, oceans, life, oxygen, complex cells
 *   III  November        ice, animals, plants, dinosaurs, the asteroid
 *   IV   The last day    a 24-hour dial
 *   V    The last minute a ruler of the last 120 seconds
 *   VI   You             half a second; midnight; the year rewinds
 *
 * Interaction (full mode): drag (or hover) along the spiral, the dial or the
 * ruler to read any moment; tap an event's mark to go to it; ← → step
 * chapters; the ruler along the bottom seeks.
 */

import { C, TAU, clamp, ease, ground, lerp, rgba, rng, setFont, smoothstep, text, type TextOpts } from '../kit'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([
      document.fonts.load('400 40px "Instrument Serif"'),
      document.fonts.load('italic 400 40px "Instrument Serif"'),
      document.fonts.load('500 11px "Geist Mono"'),
      document.fonts.load('400 13px Geist'),
    ]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. T.05'
const LOOP = 90
const AGE = 4.54e9
const YEAR_DAYS = 365
/** years of Earth history per second of the calendar */
const YR_PER_S = AGE / (YEAR_DAYS * 86400)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const CUM = DIM.map((_, i) => DIM.slice(0, i).reduce((a, b) => a + b, 0))

const CHAPTERS = [
  { t: 0, num: 'I', name: 'One year' },
  { t: 11.4, num: 'II', name: 'Too small to see' },
  { t: 34, num: 'III', name: 'November, December' },
  { t: 47.8, num: 'IV', name: 'The last day' },
  { t: 57.8, num: 'V', name: 'The last minutes' },
  { t: 72, num: 'VI', name: 'You' },
]

interface Ev {
  title: string
  short: string
  /** years ago */
  age: number
  /** how the age is said, e.g. '3.7 billion years ago (debated)' */
  said: string
  note: string
}

const EVENTS: Ev[] = [
  { title: 'The Earth forms', short: 'EARTH', age: 4.54e9, said: '4.54 billion years ago', note: 'Dust and rock circling the young Sun gather into a molten planet.' },
  { title: 'The Moon-forming impact', short: 'MOON', age: 4.51e9, said: 'about 4.5 billion years ago', note: 'A body the size of Mars strikes the young Earth. The debris becomes the Moon.' },
  { title: 'The first oceans', short: 'OCEANS', age: 4.4e9, said: 'by 4.4 billion years ago', note: 'Zircon crystals from Jack Hills, Australia, record liquid water on the surface.' },
  { title: 'The first life', short: 'FIRST LIFE', age: 3.7e9, said: 'by about 3.7 billion years ago', note: 'Single cells, far too small to see. The oldest traces are debated; life may be older still.' },
  { title: 'The Great Oxidation', short: 'OXYGEN', age: 2.4e9, said: 'about 2.4 billion years ago', note: 'Cyanobacteria fill the air with oxygen. Iron rusts out of the seas in bands.' },
  { title: 'Complex cells', short: 'COMPLEX CELLS', age: 1.8e9, said: 'by about 1.8 billion years ago', note: 'Cells with a nucleus, and mitochondria that were once free-living bacteria.' },
  { title: 'Snowball Earth', short: 'SNOWBALL', age: 7.2e8, said: '720 to 635 million years ago', note: 'Twice, ice reaches the tropics and the planet turns almost white.' },
  { title: 'The Cambrian explosion', short: 'CAMBRIAN', age: 5.388e8, said: '539 million years ago', note: 'Shells, eyes and legs appear in a geological instant. Trilobites walk the sea floor.' },
  { title: 'Plants on land', short: 'LAND PLANTS', age: 4.7e8, said: 'about 470 million years ago', note: 'Small, moss-like plants leave their spores in the rock. The land begins to turn green.' },
  { title: 'The first dinosaurs', short: 'DINOSAURS', age: 2.33e8, said: 'about 233 million years ago', note: 'Small, quick and two-legged. Their reign lasts more than 160 million years.' },
  { title: 'The asteroid', short: 'ASTEROID', age: 6.6e7, said: '66 million years ago', note: 'A rock about 10 km across strikes Chicxulub, Mexico. The great dinosaurs end; the birds remain.' },
  { title: 'The first humans', short: 'HOMO', age: 2.8e6, said: 'about 2.8 million years ago', note: 'The earliest members of our genus, Homo, in East Africa. Stone tools are older still.' },
  { title: 'Our own species', short: 'HOMO SAPIENS', age: 3.0e5, said: 'about 300,000 years ago', note: 'Homo sapiens, at Jebel Irhoud in Morocco. People like us.' },
  { title: 'Farming', short: 'FARMING', age: 1.2e4, said: 'about 12,000 years ago', note: 'Wheat, barley and lentils in the Fertile Crescent. The ice has only just retreated.' },
  { title: 'Writing', short: 'WRITING', age: 5200, said: 'about 5,200 years ago', note: 'Wedges pressed into clay in Sumer: accounts first, then laws, letters and poems.' },
  { title: 'The pyramids', short: 'PYRAMIDS', age: 4580, said: 'about 2560 BCE', note: 'The Great Pyramid of Giza. Already, by now, most of history has been written.' },
  { title: 'The printing press', short: 'PRINTING', age: 576, said: 'about 1450', note: 'Gutenberg, in Mainz. Four seconds before midnight.' },
  { title: 'You', short: 'YOU', age: 80, said: 'one lifetime', note: 'A whole human life of eighty years: the last 0.56 seconds of the year.' },
]

const cOf = (age: number) => YEAR_DAYS * (1 - age / AGE)
const EC = EVENTS.map((e) => cOf(e.age))
const S = 1 / 86400

/** The story: [T, calendar day] knots. It dwells at every event; between them it eases. */
const KNOTS: [number, number][] = [
  [0, 0],
  [5, 0],
  [7, EC[1]],
  [8.4, EC[1] + 0.2],
  [10, EC[2]],
  [11.4, EC[2] + 0.25],
  [16, EC[3]],
  [17.4, EC[3] + 0.45],
  [24.5, EC[4]],
  [25.9, EC[4] + 0.45],
  [29, EC[5]],
  [30.4, EC[5] + 0.45],
  [34, EC[6]],
  [35.4, EC[6] + 0.4],
  [37, EC[7]],
  [38.4, EC[7] + 0.3],
  [39.6, EC[8]],
  [41, EC[8] + 0.3],
  [43, EC[9]],
  [44.4, EC[9] + 0.22],
  [46.4, EC[10]],
  [47.8, EC[10] + 0.2],
  [50.4, 364],
  [53, EC[11]],
  [54.4, EC[11] + 0.012],
  [56.4, EC[12]],
  [57.8, EC[12] + 0.0008],
  [59.6, YEAR_DAYS - 120 * S],
  [61.4, EC[13]],
  [62.8, EC[13] + 3 * S],
  [64.6, EC[14]],
  [66, EC[14] + 1.2 * S],
  [67, EC[15]],
  [68.4, EC[15] + 1.2 * S],
  [70.6, EC[16]],
  [72, EC[16] + 0.6 * S],
  [74.5, EC[17]],
  [80, YEAR_DAYS],
  [86, YEAR_DAYS],
]
/** the moment the pointer reaches each event (for taps and seeking) */
const ARRIVE = EVENTS.map((_, i) => {
  if (i === 0) return 0.6
  const k = KNOTS.findIndex(([, c]) => Math.abs(c - EC[i]) < 1e-9)
  return k >= 0 ? KNOTS[k][0] : 0
})

function calAt(T: number) {
  if (T >= 86) return YEAR_DAYS * (1 - ease.inOutCubic(clamp((T - 86) / 3.4)))
  for (let i = 1; i < KNOTS.length; i++) {
    const [t1, c1] = KNOTS[i]
    if (T <= t1) {
      const [t0, c0] = KNOTS[i - 1]
      return lerp(c0, c1, ease.inOutSine(clamp((T - t0) / (t1 - t0))))
    }
  }
  return YEAR_DAYS
}

/** Eons, as calendar days, with the house colours. */
const EONS = [
  { name: 'Hadean', from: 0, to: cOf(4.0e9), color: C.ink2 },
  { name: 'Archean', from: cOf(4.0e9), to: cOf(2.5e9), color: C.ocean },
  { name: 'Proterozoic', from: cOf(2.5e9), to: cOf(5.388e8), color: C.lagoon },
  { name: 'Phanerozoic', from: cOf(5.388e8), to: YEAR_DAYS, color: C.moss },
]
const eonOf = (c: number) => EONS.find((e) => c < e.to) ?? EONS[3]

interface Seg {
  s: string
  em?: string
  tail?: string
}
interface Caption {
  t0: number
  t1: number
  lines: Seg[]
  /** 'a': the info column of the spiral view; 'b': the bottom of the dial view */
  at: 'a' | 'b'
}
const CAPTIONS: Caption[] = [
  { t0: 0.8, t1: 9.6, at: 'a', lines: [{ s: 'Imagine the Earth’s whole life' }, { s: 'as ', em: 'one year.' }] },
  { t0: 17.8, t1: 29.4, at: 'a', lines: [{ s: 'For most of it, the only life' }, { s: 'was ', em: 'too small to see.' }] },
  { t0: 63.6, t1: 72.4, at: 'b', lines: [{ s: 'Everything we have ever written' }, { s: 'fits in ', em: 'the last minute.' }] },
  { t0: 75.4, t1: 85.2, at: 'b', lines: [{ s: 'And a whole human life:' }, { s: '', em: 'half a second.' }] },
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function fmtAgo(y: number) {
  if (y >= 1e9) return `${(y / 1e9).toFixed(2)} billion years ago`
  if (y >= 1e7) return `${Math.round(y / 1e6)} million years ago`
  if (y >= 1e6) return `${(y / 1e6).toFixed(1)} million years ago`
  if (y >= 1e4) return `${(Math.round(y / 100) * 100).toLocaleString('en-US')} years ago`
  if (y >= 1) return `${Math.round(y).toLocaleString('en-US')} years ago`
  return 'now'
}
function fmtDate(c: number) {
  const d = Math.min(YEAR_DAYS - 1e-9, Math.max(0, c))
  let m = 11
  for (let i = 0; i < 12; i++)
    if (d < CUM[i] + DIM[i]) {
      m = i
      break
    }
  const day = Math.floor(d - CUM[m]) + 1
  const secs = (d - Math.floor(d)) * 86400
  const hh = Math.floor(secs / 3600)
  const mm = Math.floor((secs % 3600) / 60)
  const ss = secs % 60
  return { m, day, hh, mm, ss, date: `${MONTHS[m].slice(0, 3).toUpperCase()} ${day}`, time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(Math.floor(ss)).padStart(2, '0')}` }
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const k = { ink: C.ink, ink2: C.ink2, muted: C.muted, rule: C.rule }

  /* ---------------------------------------------------------- layout */

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
  // view A: the spiral, large; and its card
  let aCx = 0
  let aCy = 0
  let aR = 100
  const cardA: Rect = { x: 0, y: 0, w: 0, h: 0 }
  // view B: the spiral small, the day dial, the ruler; and its card
  let bCx = 0
  let bCy = 0
  let bR = 50
  let dCx = 0
  let dCy = 0
  let dR = 50
  const cardB: Rect = { x: 0, y: 0, w: 0, h: 0 }
  let rX0 = 0
  let rX1 = 0
  let rY = 0
  let rTop = 0
  let capSizeA = 30
  let capSizeB = 30
  let capAX = 0
  let capAY = 0
  /** the top of each caption block (its first line's ascenders): nothing else may come below this */
  let capTopA = 0
  let capTopB = 0
  let capAW = 0
  let capBX = 0
  let capBY = 0
  let capBW = 0

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
    const gap = clamp(w * 0.035, 12, 56)
    if (stacked) {
      capSizeA = capSizeB = clamp(Math.min(w * 0.066, h * 0.04), 17, 38)
      const capBlock = capSizeA * 2.35
      aR = Math.min(w / 2 - pad - 10, (botY - topY - capBlock) * 0.32)
      aCx = w / 2
      aCy = topY + 14 + aR
      cardA.x = pad
      cardA.w = w - pad * 2
      capAX = capBX = pad
      capAW = capBW = w - pad * 2
      capAY = capBY = botY - capSizeA * 1.04 - capSizeA * 0.25
      capTopA = capTopB = capAY - capSizeA * 1.86
      cardA.y = aCy + aR + 26
      cardA.h = capTopA - 12 - cardA.y
      bR = Math.min(w * 0.21, (botY - topY) * 0.13)
      bCx = pad + bR + 6
      bCy = topY + 12 + bR
      dR = bR
      dCx = w - pad - dR - 6
      dCy = bCy
      cardB.x = pad
      cardB.w = w - pad * 2
      // the ruler right under the dials, the card under the ruler
      rTop = bCy + bR + 16
      rY = rTop + 70
      cardB.y = rY + 56
      cardB.h = capTopB - 12 - cardB.y
      rX0 = pad + 4
      rX1 = w - pad - 4
    } else {
      const heroW = (w - pad * 2 - gap) * (short ? 0.44 : 0.5)
      const heroH = botY - topY
      aR = Math.max(30, Math.min(heroW, heroH) / 2 - 8)
      aCx = pad + heroW / 2
      aCy = topY + heroH / 2
      cardA.x = pad + heroW + gap
      cardA.w = w - pad - cardA.x
      capSizeA = clamp(Math.min(cardA.w * 0.068, h * (short ? 0.08 : 0.056)), tiny ? 14 : 15, 44)
      capAX = cardA.x
      capAW = cardA.w
      capAY = botY - capSizeA * 1.04 - capSizeA * 0.25
      capTopA = capAY - capSizeA * 1.86
      // the card, then the eon key (14 px above the caption), then the caption
      cardA.y = topY
      cardA.h = capTopA - 40 - topY
      // view B: a top band (small spiral, the day dial, the card) over the ruler and the caption
      capSizeB = clamp(Math.min(w * 0.04, h * (short ? 0.075 : 0.054)), tiny ? 14 : 15, 44)
      const capBlock = capSizeB * 2.35
      const band = (botY - topY - capBlock) * (short ? 0.62 : 0.6)
      bR = Math.max(22, Math.min(band / 2 - 6, w * 0.125))
      bCx = pad + bR + 4
      bCy = topY + band / 2
      dR = bR
      dCx = bCx + bR + gap + dR + 8
      dCy = bCy
      cardB.x = dCx + dR + gap
      cardB.w = w - pad - cardB.x
      cardB.y = topY
      cardB.h = band
      if (short) {
        // short frames: in the last minutes the ruler has the stage to itself
        rTop = topY + 4
        rY = topY + (botY - capBlock - topY) * 0.66
      } else {
        rTop = topY + band + 8
        rY = topY + band + (botY - capBlock - topY - band) * 0.62
      }
      rX0 = pad + 4
      rX1 = w - pad - 4
      capBX = pad
      capBW = w - pad * 2
      capBY = botY - capSizeB * 1.04 - capSizeB * 0.25
      capTopB = capBY - capSizeB * 1.86
      // the ruler's labels, dimension and note reach about 44 px below it: keep them above the caption
      rY = Math.min(rY, capTopB - 48)
    }
  }
  layout()

  /* ----------------------------------------------------------- clock */

  const sfx = env.sfx
  const atP = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 39.7 : 0
  let prevT = -1
  let seekFlag = false
  let looped = false
  let readOnce = false
  const ptr = { x: 0, y: 0, over: false, down: false, touch: false, mode: '' as '' | 'read' | 'ruler', sx: 0, sy: 0, ms: 0 }
  let reader: { c: number; x: number; y: number; where: 'spiral' | 'dial' | 'ruler' } | null = null

  function chapterOf(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }
  function curT() {
    return (((prevT < 0 ? clock : prevT) % LOOP) + LOOP) % LOOP
  }
  function seek(target: number) {
    clock += target - curT()
    seekFlag = true
  }

  /* --------------------------------------------------- the spiral map */

  /** calendar day → spiral parameter u ∈ [0, 1] (one turn per month) */
  function uOf(c: number) {
    const d = clamp(c, 0, YEAR_DAYS)
    let m = 11
    for (let i = 0; i < 12; i++)
      if (d < CUM[i] + DIM[i]) {
        m = i
        break
      }
    return (m + Math.min(1, (d - CUM[m]) / DIM[m])) / 12
  }
  function cOfU(u: number) {
    const m = Math.min(11, Math.floor(u * 12))
    return CUM[m] + (u * 12 - m) * DIM[m]
  }
  function spiralXY(u: number, cx: number, cy: number, R: number) {
    const r0 = R * 0.1
    const r = r0 + (R - r0) * u
    const th = u * 12 * TAU
    return [cx + r * Math.sin(th), cy - r * Math.cos(th)] as const
  }
  /** nearest spiral point to (x, y): returns u, or -1 if too far */
  function spiralHit(x: number, y: number, cx: number, cy: number, R: number) {
    const dx = x - cx
    const dy = y - cy
    const r = Math.hypot(dx, dy)
    if (r > R + 14) return -1
    const r0 = R * 0.1
    let th = Math.atan2(dx, -dy)
    if (th < 0) th += TAU
    const f = th / TAU
    const m = clamp(Math.round(((r - r0) / (R - r0)) * 12 - f), 0, 11)
    return clamp((m + f) / 12)
  }

  /* --------------------------------------------------------- drawing */

  function halo(str: string, x: number, y: number, o: TextOpts) {
    const lw0 = ctx.lineWidth
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.92)
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.lineJoin = 'miter'
    ctx.lineWidth = lw0
    text(ctx, str, x, y, o)
  }
  function tw(str: string, size: number, tracking = 0.12, font: 'mono' | 'serif' | 'sans' = 'mono', italic = false) {
    setFont(ctx, { size, tracking, font, italic })
    const v = ctx.measureText(str).width
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    return v
  }
  function wrap(str: string, size: number, maxW: number, font: 'mono' | 'sans' = 'sans') {
    const words = str.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const wd of words) {
      const next = cur ? `${cur} ${wd}` : wd
      if (tw(next, size, font === 'mono' ? 0.08 : 0, font) > maxW && cur) {
        lines.push(cur)
        cur = wd
      } else cur = next
    }
    if (cur) lines.push(cur)
    return lines
  }

  /** The small drawings, in a unit box [−1, 1]², hairline at any scale. */
  function vignette(i: number, cx: number, cy: number, s: number, T: number) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(s, s)
    ctx.lineWidth = 1 / s
    ctx.strokeStyle = k.ink
    ctx.fillStyle = k.ink
    const P = () => ctx.beginPath()
    const st = () => ctx.stroke()
    const circ = (x: number, y: number, r: number) => {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, TAU)
    }
    const hatchIn = (gap: number, ang = -0.7) => {
      ctx.save()
      ctx.clip()
      ctx.globalAlpha *= 0.45
      P()
      const ca = Math.cos(ang)
      const sa = Math.sin(ang)
      for (let d = -1.6; d <= 1.6; d += gap) {
        ctx.moveTo(-sa * d - ca * 2, ca * d - sa * 2)
        ctx.lineTo(-sa * d + ca * 2, ca * d + sa * 2)
      }
      st()
      ctx.restore()
    }
    const spin = T * 0.3
    switch (i) {
      case 0: {
        // accretion: a planet gathering its rocks
        P()
        circ(0, 0, 0.5)
        st()
        P()
        for (let q = 0; q < 26; q++) {
          const a = q * 0.85 + spin
          const r = 0.6 + (q / 26) * 0.38
          circ(Math.cos(a) * r, Math.sin(a) * r * 0.9, 0.025 + (q % 3) * 0.012)
        }
        st()
        break
      }
      case 1: {
        // Theia strikes
        P()
        circ(-0.18, 0.12, 0.55)
        st()
        P()
        circ(0.52, -0.42, 0.24)
        st()
        P()
        for (const d of [-0.1, 0, 0.1]) {
          ctx.moveTo(0.78 + d, -0.72 + d)
          ctx.lineTo(0.98 + d, -0.92 + d)
        }
        for (let q = 0; q < 7; q++) {
          const a = -2.3 + q * 0.32
          ctx.moveTo(0.28 + Math.cos(a) * 0.12, -0.24 + Math.sin(a) * 0.12)
          ctx.lineTo(0.28 + Math.cos(a) * 0.32, -0.24 + Math.sin(a) * 0.32)
        }
        st()
        break
      }
      case 2: {
        // a planet with water: waves across its lower half
        P()
        circ(0, 0, 0.62)
        st()
        ctx.save()
        P()
        circ(0, 0, 0.62)
        ctx.clip()
        P()
        for (let r2 = 0; r2 < 5; r2++) {
          const y = 0.0 + r2 * 0.13
          for (let x = -0.7; x <= 0.7; x += 0.05) {
            const yy = y + Math.sin(x * 9 + r2 + T * 1.2) * 0.025
            if (x === -0.7) ctx.moveTo(x, yy)
            else ctx.lineTo(x, yy)
          }
        }
        st()
        ctx.restore()
        break
      }
      case 3: {
        // single cells, some dividing
        const cells: [number, number, number][] = [
          [-0.4, -0.2, 0.17],
          [-0.05, -0.35, 0.13],
          [0.3, -0.15, 0.18],
          [-0.2, 0.2, 0.14],
          [0.15, 0.28, 0.16],
          [0.5, 0.3, 0.11],
          [-0.55, 0.38, 0.1],
        ]
        P()
        for (const [x, y, r] of cells) circ(x, y, r)
        circ(0.62, -0.5, 0.08)
        circ(0.74, -0.43, 0.08)
        st()
        P()
        for (const [x, y, r] of cells) circ(x + r * 0.2, y - r * 0.15, r * 0.18)
        ctx.fill()
        break
      }
      case 4: {
        // banded iron and rising oxygen
        P()
        ctx.rect(-0.75, -0.2, 1.5, 0.85)
        st()
        for (let b = 0; b < 4; b++) {
          P()
          ctx.rect(-0.75, -0.2 + b * 0.22, 1.5, 0.1)
          hatchIn(0.06)
        }
        P()
        for (let q = 0; q < 8; q++) {
          const x = -0.6 + q * 0.17
          const y = -0.35 - ((q * 0.37 + T * 0.25) % 0.6)
          circ(x, y, 0.035 + (q % 3) * 0.015)
        }
        st()
        break
      }
      case 5: {
        // a eukaryote: nucleus and mitochondria
        P()
        ctx.ellipse(0, 0, 0.82, 0.58, -0.2, 0, TAU)
        st()
        P()
        circ(-0.18, -0.02, 0.24)
        st()
        P()
        circ(-0.18, -0.02, 0.07)
        ctx.fill()
        for (const [x, y, a] of [
          [0.38, -0.18, 0.4],
          [0.28, 0.28, -0.3],
        ] as const) {
          P()
          ctx.ellipse(x, y, 0.17, 0.08, a, 0, TAU)
          st()
          P()
          for (let q = -2; q <= 2; q++) {
            ctx.moveTo(x + Math.cos(a) * q * 0.05 - Math.sin(a) * 0.05, y + Math.sin(a) * q * 0.05 + Math.cos(a) * 0.05)
            ctx.lineTo(x + Math.cos(a) * q * 0.05 + Math.sin(a) * 0.05, y + Math.sin(a) * q * 0.05 - Math.cos(a) * 0.05)
          }
          st()
        }
        break
      }
      case 6: {
        // ice to the tropics
        P()
        circ(0, 0, 0.62)
        st()
        P()
        ctx.rect(-0.7, -0.7, 1.4, 0.63)
        ctx.rect(-0.7, 0.07, 1.4, 0.63)
        ctx.save()
        ctx.beginPath()
        circ(0, 0, 0.62)
        ctx.clip()
        ctx.beginPath()
        ctx.rect(-0.7, -0.7, 1.4, 0.63)
        ctx.rect(-0.7, 0.07, 1.4, 0.63)
        hatchIn(0.07, -0.7)
        ctx.beginPath()
        ctx.rect(-0.7, -0.7, 1.4, 0.63)
        ctx.rect(-0.7, 0.07, 1.4, 0.63)
        hatchIn(0.07, 0.7)
        ctx.restore()
        break
      }
      case 7: {
        // a trilobite
        P()
        ctx.moveTo(-0.5, -0.38)
        ctx.quadraticCurveTo(-0.52, -0.78, 0, -0.8)
        ctx.quadraticCurveTo(0.52, -0.78, 0.5, -0.38)
        ctx.lineTo(0.62, -0.1)
        ctx.moveTo(-0.5, -0.38)
        ctx.lineTo(-0.62, -0.1)
        st()
        P()
        for (let q = 0; q < 8; q++) {
          const y = -0.38 + q * 0.1
          const half = 0.5 - q * 0.035
          ctx.moveTo(-half, y)
          ctx.quadraticCurveTo(0, y + 0.05, half, y)
        }
        ctx.moveTo(-0.22, 0.42)
        ctx.quadraticCurveTo(0, 0.72, 0.22, 0.42)
        ctx.moveTo(-0.13, -0.66)
        ctx.lineTo(-0.11, 0.5)
        ctx.moveTo(0.13, -0.66)
        ctx.lineTo(0.11, 0.5)
        st()
        P()
        circ(-0.28, -0.5, 0.05)
        circ(0.28, -0.5, 0.05)
        st()
        P()
        ctx.moveTo(-0.5, -0.38)
        for (let q = 0; q < 8; q++) ctx.lineTo(-(0.5 - q * 0.035), -0.38 + q * 0.1)
        ctx.lineTo(-0.22, 0.42)
        ctx.moveTo(0.5, -0.38)
        for (let q = 0; q < 8; q++) ctx.lineTo(0.5 - q * 0.035, -0.38 + q * 0.1)
        ctx.lineTo(0.22, 0.42)
        st()
        break
      }
      case 8: {
        // Cooksonia: forking stems with spore cases
        P()
        ctx.moveTo(-0.8, 0.7)
        ctx.lineTo(0.8, 0.7)
        st()
        const tips: [number, number][] = []
        const branch = (x: number, y: number, a: number, len: number, d: number) => {
          const x2 = x + Math.sin(a) * len
          const y2 = y - Math.cos(a) * len
          ctx.moveTo(x, y)
          ctx.quadraticCurveTo(x + Math.sin(a) * len * 0.3, y - len * 0.6, x2, y2)
          if (d > 0) {
            branch(x2, y2, a - 0.35, len * 0.7, d - 1)
            branch(x2, y2, a + 0.35, len * 0.7, d - 1)
          } else tips.push([x2, y2])
        }
        P()
        branch(-0.25, 0.7, -0.05, 0.55, 2)
        branch(0.35, 0.7, 0.1, 0.4, 1)
        st()
        P()
        for (const [x, y] of tips) {
          ctx.moveTo(x + 0.07, y - 0.04)
          ctx.ellipse(x, y - 0.04, 0.07, 0.05, 0, 0, TAU)
        }
        st()
        break
      }
      case 9: {
        // a sauropod: one outline, four columns of legs
        P()
        ctx.moveTo(0.98, 0.26)
        ctx.quadraticCurveTo(0.7, 0.02, 0.38, -0.1)
        ctx.quadraticCurveTo(0.08, -0.26, -0.22, -0.1)
        ctx.quadraticCurveTo(-0.4, -0.3, -0.58, -0.62)
        ctx.quadraticCurveTo(-0.66, -0.74, -0.78, -0.72)
        ctx.quadraticCurveTo(-0.9, -0.7, -0.86, -0.62)
        ctx.quadraticCurveTo(-0.76, -0.6, -0.68, -0.58)
        ctx.quadraticCurveTo(-0.5, -0.3, -0.36, 0.06)
        ctx.quadraticCurveTo(-0.3, 0.16, -0.18, 0.16)
        ctx.lineTo(0.28, 0.16)
        ctx.quadraticCurveTo(0.45, 0.14, 0.62, 0.14)
        ctx.quadraticCurveTo(0.8, 0.16, 0.98, 0.26)
        st()
        P()
        for (const x of [-0.28, -0.13, 0.14, 0.29]) {
          ctx.moveTo(x, 0.12)
          ctx.lineTo(x - 0.005, 0.58)
          ctx.lineTo(x + 0.08, 0.58)
          ctx.lineTo(x + 0.075, 0.13)
        }
        ctx.moveTo(-0.95, 0.58)
        ctx.lineTo(0.95, 0.58)
        st()
        P()
        circ(-0.76, -0.66, 0.018)
        ctx.fill()
        break
      }
      case 10: {
        // the impact
        P()
        ctx.ellipse(-0.1, 0.48, 0.62, 0.16, 0, 0, TAU)
        st()
        P()
        ctx.ellipse(-0.1, 0.48, 0.36, 0.08, 0, 0, TAU)
        st()
        P()
        ctx.moveTo(0.9, -0.8)
        ctx.lineTo(0.02, 0.32)
        ctx.moveTo(0.82, -0.86)
        ctx.lineTo(0.1, 0.06)
        st()
        P()
        circ(0.04, 0.3, 0.07)
        ctx.fill()
        P()
        for (let q = 0; q < 9; q++) {
          const a = Math.PI + 0.2 + q * 0.34
          ctx.moveTo(-0.1 + Math.cos(a) * 0.4, 0.42 + Math.sin(a) * 0.2)
          ctx.lineTo(-0.1 + Math.cos(a) * 0.7, 0.42 + Math.sin(a) * 0.42)
        }
        st()
        break
      }
      case 11: {
        // a hand axe: a teardrop with flake scars
        P()
        ctx.moveTo(0, -0.85)
        ctx.bezierCurveTo(0.5, -0.4, 0.55, 0.45, 0, 0.75)
        ctx.bezierCurveTo(-0.55, 0.45, -0.5, -0.4, 0, -0.85)
        st()
        P()
        const scars: [number, number, number][] = [
          [-0.25, -0.2, 0.2],
          [0.22, -0.05, 0.22],
          [-0.18, 0.3, 0.2],
          [0.12, 0.45, 0.16],
          [0.05, -0.5, 0.15],
        ]
        for (const [x, y, r] of scars) {
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, Math.PI * 1.1)
        }
        st()
        break
      }
      case 12: {
        // a hand stencil: spray around a hand, the hand left bare
        ctx.save()
        P()
        const sr = rng(1312)
        for (let q = 0; q < 900; q++) {
          const a = sr() * TAU
          const r = Math.sqrt(sr()) * 0.95
          const x = Math.cos(a) * r
          const y = Math.sin(a) * r
          ctx.moveTo(x + 0.014, y)
          ctx.arc(x, y, 0.014, 0, TAU)
        }
        ctx.globalAlpha *= 0.6
        ctx.fill()
        ctx.restore()
        ctx.fillStyle = C.paper
        P()
        ctx.ellipse(0.02, 0.28, 0.3, 0.34, 0, 0, TAU)
        const finger = (x: number, y: number, a: number, len: number, wd: number) => {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(a)
          ctx.moveTo(-wd, 0)
          ctx.lineTo(-wd, -len)
          ctx.arc(0, -len, wd, Math.PI, 0)
          ctx.lineTo(wd, 0)
          ctx.closePath()
          ctx.restore()
        }
        ctx.fill()
        P()
        finger(-0.2, 0.05, -0.18, 0.42, 0.065)
        finger(-0.06, 0.0, -0.05, 0.56, 0.068)
        finger(0.09, 0.0, 0.06, 0.52, 0.066)
        finger(0.22, 0.06, 0.18, 0.4, 0.06)
        finger(-0.26, 0.4, -1.05, 0.38, 0.07)
        ctx.fill()
        break
      }
      case 13: {
        // an ear of wheat
        P()
        ctx.moveTo(0.05, 0.95)
        ctx.quadraticCurveTo(0.02, 0.3, -0.02, -0.2)
        st()
        P()
        for (let q = 0; q < 7; q++) {
          const y = 0.2 - q * 0.15
          for (const sd of [-1, 1]) {
            const x = -0.02 + sd * 0.09
            ctx.moveTo(x + 0.08 * sd, y)
            ctx.ellipse(x, y, 0.08, 0.13, sd * 0.45, 0, TAU)
            ctx.moveTo(x + sd * 0.04, y - 0.12)
            ctx.lineTo(x + sd * 0.16, y - 0.42)
          }
        }
        st()
        break
      }
      case 14: {
        // a clay tablet with cuneiform
        P()
        ctx.moveTo(-0.6, -0.75)
        ctx.lineTo(0.6, -0.75)
        ctx.quadraticCurveTo(0.7, -0.75, 0.7, -0.65)
        ctx.lineTo(0.7, 0.65)
        ctx.quadraticCurveTo(0.7, 0.75, 0.6, 0.75)
        ctx.lineTo(-0.6, 0.75)
        ctx.quadraticCurveTo(-0.7, 0.75, -0.7, 0.65)
        ctx.lineTo(-0.7, -0.65)
        ctx.quadraticCurveTo(-0.7, -0.75, -0.6, -0.75)
        st()
        P()
        for (let row = 0; row < 5; row++) {
          const y = -0.52 + row * 0.26
          ctx.moveTo(-0.6, y + 0.1)
          ctx.lineTo(0.6, y + 0.1)
          for (let q = 0; q < 6; q++) {
            const x = -0.5 + q * 0.2 + ((row * 3 + q) % 3) * 0.02
            const vertical = (row + q) % 3 === 0
            if (vertical) {
              ctx.moveTo(x - 0.04, y - 0.06)
              ctx.lineTo(x + 0.04, y - 0.06)
              ctx.lineTo(x, y + 0.01)
              ctx.closePath()
              ctx.moveTo(x, y + 0.01)
              ctx.lineTo(x, y + 0.07)
            } else {
              ctx.moveTo(x - 0.06, y - 0.03)
              ctx.lineTo(x - 0.06, y + 0.03)
              ctx.lineTo(x, y)
              ctx.closePath()
              ctx.moveTo(x, y)
              ctx.lineTo(x + 0.06, y)
            }
          }
        }
        st()
        break
      }
      case 15: {
        // the pyramids at Giza
        P()
        ctx.moveTo(-0.95, 0.55)
        ctx.lineTo(0.95, 0.55)
        st()
        const pyr = (x: number, wd: number, ht: number) => {
          P()
          ctx.moveTo(x - wd, 0.55)
          ctx.lineTo(x, 0.55 - ht)
          ctx.lineTo(x + wd, 0.55)
          st()
          P()
          ctx.moveTo(x, 0.55 - ht)
          ctx.lineTo(x + wd * 0.35, 0.55)
          ctx.lineTo(x + wd, 0.55)
          ctx.closePath()
          hatchIn(0.06, 1.1)
        }
        pyr(0.42, 0.34, 0.5)
        pyr(-0.2, 0.55, 0.88)
        break
      }
      case 16: {
        // an open book
        P()
        ctx.moveTo(0, -0.5)
        ctx.quadraticCurveTo(-0.45, -0.62, -0.9, -0.5)
        ctx.lineTo(-0.9, 0.55)
        ctx.quadraticCurveTo(-0.45, 0.43, 0, 0.55)
        ctx.quadraticCurveTo(0.45, 0.43, 0.9, 0.55)
        ctx.lineTo(0.9, -0.5)
        ctx.quadraticCurveTo(0.45, -0.62, 0, -0.5)
        ctx.lineTo(0, 0.55)
        st()
        P()
        for (let q = 0; q < 7; q++) {
          const y = -0.36 + q * 0.12
          ctx.moveTo(-0.78, y)
          ctx.quadraticCurveTo(-0.45, y - 0.08, -0.12, y)
          if (q !== 3) {
            ctx.moveTo(0.12, y)
            ctx.quadraticCurveTo(0.45, y - 0.08, 0.78, y)
          }
        }
        st()
        break
      }
      default: {
        // you: here, now
        const pulse = (T * 0.6) % 1
        P()
        circ(0, 0, 0.07)
        ctx.fill()
        P()
        circ(0, 0, 0.25)
        st()
        ctx.globalAlpha *= 1 - pulse
        P()
        circ(0, 0, 0.25 + pulse * 0.6)
        st()
      }
    }
    ctx.restore()
  }

  function drawSpiral(T: number, c: number, cx: number, cy: number, R: number, a: number, full: boolean, drawOn: number) {
    if (a <= 0.01) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const N = 12 * 90
    const uNow = uOf(c)
    // the year to come, faint
    ctx.strokeStyle = rgba(C.ink, 0.16)
    ctx.beginPath()
    const uMax = drawOn
    for (let q = 0; q <= N; q++) {
      const u = q / N
      if (u > uMax) break
      const [x, y] = spiralXY(u, cx, cy, R)
      if (q) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    // the year so far, coloured by eon
    for (const eon of EONS) {
      const u0 = uOf(eon.from)
      const u1 = Math.min(uOf(eon.to), uNow)
      if (u1 <= u0) continue
      ctx.strokeStyle = eon.color
      ctx.lineWidth = full ? 1.4 : 1.2
      ctx.beginPath()
      const q0 = Math.floor(u0 * N)
      const q1 = Math.ceil(u1 * N)
      for (let q = q0; q <= q1; q++) {
        const u = clamp(q / N, u0, u1)
        const [x, y] = spiralXY(u, cx, cy, R)
        if (q === q0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.lineWidth = 1
    // the month spine
    const r0 = R * 0.1
    ctx.strokeStyle = rgba(C.ink, 0.22)
    ctx.beginPath()
    ctx.moveTo(cx, cy - r0 + 4)
    ctx.lineTo(cx, cy - R - 6)
    ctx.stroke()
    if (full && R > 120) {
      for (let m = 0; m < 12; m++) {
        const r = r0 + ((R - r0) * m) / 12
        if (m % (R > 220 ? 1 : 2) !== 0 && m !== 11) continue
        text(ctx, MONTHS[m].slice(0, 3).toUpperCase(), cx - 4, cy - r - 2, { size: 7.5, color: k.muted, align: 'right', tracking: 0.1 })
      }
    }
    // events on the spiral (December 31's belong to the dial)
    const marks: { x: number; y: number; i: number }[] = []
    for (let i = 0; i < 11; i++) {
      const u = uOf(EC[i])
      const [x, y] = spiralXY(u, cx, cy, R)
      marks.push({ x, y, i })
    }
    const placed: Rect[] = []
    for (const mk of marks) {
      const past = EC[mk.i] <= c + 1e-9
      ctx.strokeStyle = past ? k.ink : rgba(C.ink, 0.35)
      ctx.fillStyle = C.paper
      ctx.beginPath()
      ctx.arc(mk.x, mk.y, full ? 3 : 2.2, 0, TAU)
      ctx.fill()
      ctx.stroke()
      if (past) {
        ctx.fillStyle = k.ink
        ctx.beginPath()
        ctx.arc(mk.x, mk.y, full ? 1.4 : 1, 0, TAU)
        ctx.fill()
      }
      // labels outside the spiral, at the event's angle, if they fit
      if (full && past && R > 110 && !tiny) {
        const th = Math.atan2(mk.x - cx, -(mk.y - cy))
        const lr = R + 12
        const lx = cx + Math.sin(th) * lr
        const ly = cy - Math.cos(th) * lr
        const right = Math.sin(th) >= 0
        const lab = EVENTS[mk.i].short
        const lw = tw(lab, 7.5, 0.12)
        const box = { x: right ? lx + 2 : lx - 2 - lw, y: ly - 6, w: lw, h: 10 }
        if (box.x < 2 || box.x + box.w > w - 2) continue
        if (placed.some((p) => !(box.x > p.x + p.w + 3 || box.x + box.w < p.x - 3 || box.y > p.y + p.h + 1 || box.y + box.h < p.y - 1))) continue
        placed.push(box)
        ctx.strokeStyle = rgba(C.ink, 0.25)
        ctx.beginPath()
        ctx.moveTo(mk.x, mk.y)
        ctx.lineTo(cx + Math.sin(th) * (R + 8), cy - Math.cos(th) * (R + 8))
        ctx.stroke()
        text(ctx, lab, right ? lx + 2 : lx - 2, ly + 3, { size: 7.5, color: k.ink2, align: right ? 'left' : 'right', tracking: 0.12 })
      }
    }
    // the pointer
    if (c > 0 || T < 86) {
      const [px, py] = spiralXY(uNow, cx, cy, R)
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.setLineDash([1.5, 3])
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(px, py)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = k.ink
      ctx.beginPath()
      ctx.arc(px, py, full ? 4 : 3, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      ctx.arc(px, py, full ? 8 : 6, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  /** December 31 as a 24-hour dial. */
  function drawDial(c: number, a: number) {
    if (a <= 0.01) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const cx = dCx
    const cy = dCy
    const R = dR
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    for (let hh = 0; hh < 24; hh++) {
      const th = (hh / 24) * TAU
      const l = hh % 6 === 0 ? 7 : 3.5
      ctx.moveTo(cx + Math.sin(th) * R, cy - Math.cos(th) * R)
      ctx.lineTo(cx + Math.sin(th) * (R - l), cy - Math.cos(th) * (R - l))
    }
    ctx.stroke()
    if (R > 44) for (const hh of [0, 6, 12, 18]) text(ctx, String(hh).padStart(2, '0'), cx + Math.sin((hh / 24) * TAU) * (R - 15), cy - Math.cos((hh / 24) * TAU) * (R - 15) + 3, { size: 7.5, color: k.muted, align: 'center', tracking: 0.04 })
    text(ctx, 'DECEMBER 31', cx, cy - R - 10, { size: 8.5, color: k.ink2, align: 'center', tracking: 0.14 })
    // our genus and our species, as arcs to midnight
    for (const [i, rr, col] of [
      [11, 0.82, C.fern],
      [12, 0.7, C.moss],
    ] as const) {
      const hh = (EC[i] - 364) * 24
      if (c < EC[i]) continue
      ctx.strokeStyle = col
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, R * rr, -Math.PI / 2 + (hh / 24) * TAU, -Math.PI / 2 + TAU)
      ctx.stroke()
      ctx.lineWidth = 1
      const th = (hh / 24) * TAU
      if (R > 44) text(ctx, i === 11 ? 'HOMO 18:36' : 'H. SAPIENS 23:25', cx + Math.sin(th) * R * rr - 6, cy - Math.cos(th) * R * rr - 6, { size: 7.5, color: col, align: 'right', tracking: 0.1 })
    }
    // the hand
    if (c >= 364) {
      const hh = (c - 364) * 24
      const th = (hh / 24) * TAU
      ctx.strokeStyle = k.ink
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.sin(th) * R * 0.92, cy - Math.cos(th) * R * 0.92)
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.fillStyle = k.ink
      ctx.beginPath()
      ctx.arc(cx, cy, 2.2, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  /** The last two minutes, as a ruler: a second is 144 years. */
  function drawRuler(T: number, c: number, a: number) {
    if (a <= 0.01) return
    const x0 = rX0
    const x1 = rX1
    const y = rY
    const W = x1 - x0
    const toX = (s: number) => x1 - (s / 120) * W
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.6)
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    for (let s = 0; s <= 120; s++) {
      const x = Math.round(toX(s)) + 0.5
      const l = s % 60 === 0 ? 9 : s % 10 === 0 ? 6 : s % 5 === 0 ? 4 : 2
      if (W < 400 && l === 2) continue
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + l)
    }
    ctx.stroke()
    text(ctx, '23:58:00', x0, y + 20, { size: 8, color: k.muted, tracking: 0.08 })
    text(ctx, '23:59:00', toX(60), y + 20, { size: 8, color: k.muted, align: 'center', tracking: 0.08 })
    text(ctx, 'MIDNIGHT', x1, y + 20, { size: 8, color: k.ink2, align: 'right', tracking: 0.12 })
    // the last minute, dimensioned
    const dy = y + (short ? 30 : 34)
    if (!tiny) {
      ctx.strokeStyle = rgba(C.ink, 0.4)
      ctx.beginPath()
      ctx.moveTo(toX(60), dy - 4)
      ctx.lineTo(toX(60), dy + 4)
      ctx.moveTo(toX(0), dy - 4)
      ctx.lineTo(toX(0), dy + 4)
      ctx.moveTo(toX(60), dy)
      ctx.lineTo(toX(0), dy)
      ctx.stroke()
      const lab = W > 520 ? `THE LAST MINUTE = ${Math.round(60 * YR_PER_S).toLocaleString('en-US')} YEARS · 1 S = ${Math.round(YR_PER_S)} YEARS` : `LAST MINUTE = ${Math.round(60 * YR_PER_S).toLocaleString('en-US')} YR`
      const lw = tw(lab, 8, 0.12)
      ctx.fillStyle = C.paper
      ctx.fillRect((toX(60) + toX(0)) / 2 - lw / 2 - 6, dy - 6, lw + 12, 12)
      text(ctx, lab, (toX(60) + toX(0)) / 2, dy + 3, { size: 8, color: k.ink2, align: 'center', tracking: 0.12 })
    }
    // events: farming, writing, pyramids, printing, you
    const iconS = clamp(Math.min(W * 0.02, (y - rTop - 18) / 5.4), 5, 22)
    const placed: number[] = []
    for (let i = 13; i < EVENTS.length; i++) {
      const s = (YEAR_DAYS - EC[i]) * 86400
      const x = toX(s)
      if (c < EC[i] - 1e-12) {
        ctx.fillStyle = rgba(C.ink, 0.25)
        ctx.beginPath()
        ctx.arc(x, y, 1.8, 0, TAU)
        ctx.fill()
        continue
      }
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y - iconS * 1.4)
      ctx.stroke()
      if (i < 17 && !tiny) {
        const near = placed.some((p) => Math.abs(p - x) < iconS * 2.4)
        if (!near) {
          vignette(i, x, y - iconS * 2.6, iconS, T)
          placed.push(x)
        }
        const lab = EVENTS[i].short
        const tt = `−${s.toFixed(s < 10 ? 1 : 0)} S`
        const lift = i === 15 ? 12 : i === 16 && x1 - x < 90 ? 14 : 0
        halo(lab, x, y - iconS * 4.2 - lift, { size: 7.5, color: k.ink2, align: 'center', tracking: 0.12 })
        if (W > 500) halo(tt, x, y - iconS * 4.2 - 10 - lift, { size: 7.5, color: k.muted, align: 'center', tracking: 0.08 })
      }
    }
    // you: the last 0.56 s, a sliver
    const s17 = (YEAR_DAYS - EC[17]) * 86400
    if (c >= EC[17]) {
      const xa = toX(s17)
      ctx.fillStyle = rgba(C.moss, 0.9)
      ctx.fillRect(xa, y - 7, Math.max(1.5, x1 - xa), 14)
      halo('YOU', x1, y - 12, { size: 9, color: C.moss, align: 'right', tracking: 0.16 })
    }
    // the hand on the ruler
    const sNow = (YEAR_DAYS - c) * 86400
    if (sNow <= 120) {
      const x = toX(sNow)
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(x, y - 10)
      ctx.lineTo(x, y + 10)
      ctx.stroke()
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.moveTo(x - 4, y + 15)
      ctx.lineTo(x + 4, y + 15)
      ctx.lineTo(x, y + 10)
      ctx.fill()
    }
    ctx.restore()
  }

  /** Detail-view leaders: the spiral's last day to the dial, the dial's last minutes to the ruler. */
  function drawLeaders(aDial: number, aRuler: number) {
    ctx.save()
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    if (aDial > 0.01) {
      const [ex, ey] = spiralXY(1, bCx, bCy, bR)
      ctx.globalAlpha = aDial
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.beginPath()
      ctx.arc(ex, ey, 7, 0, TAU)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ex + 7, ey)
      ctx.lineTo(dCx - dR - 3, dCy)
      ctx.stroke()
    }
    if (aRuler > 0.01) {
      ctx.globalAlpha = aRuler
      ctx.setLineDash([1, 4])
      ctx.strokeStyle = rgba(C.ink, 0.3)
      // the last two minutes of the dial: a sliver at the top
      const th = TAU * (1 - 120 / 86400)
      const px = dCx + Math.sin(th) * dR
      const py = dCy - Math.cos(th) * dR
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, TAU)
      ctx.stroke()
      if (stacked) {
        ctx.beginPath()
        ctx.moveTo(px - 4, py + 4)
        ctx.lineTo(rX0, rY - 4)
        ctx.moveTo(px + 4, py + 4)
        ctx.lineTo(rX1, rY - 4)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(px, py + 5)
        ctx.lineTo(rX0, rY - 4)
        ctx.moveTo(px, py + 5)
        ctx.lineTo(rX1, rY - 4)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  function drawCard(T: number, c: number, r: Rect, a: number) {
    if (a <= 0.01 || r.h < 40 || r.w < 120) return
    let idx = 0
    for (let i = 0; i < EVENTS.length; i++) if (EC[i] <= c + 1e-12) idx = i
    if (T >= 86) idx = 0
    const ev = EVENTS[idx]
    // fade in each new card from the moment it arrives
    const since = T - ARRIVE[idx]
    const ca = T >= 86 ? 1 - smoothstep(86, 87.4, T) : idx === 0 ? 1 : smoothstep(-0.25, 0.45, since)
    ctx.save()
    ctx.globalAlpha = a * ca
    const side = r.w > 380 && r.h < 380
    const vs = Math.min(side ? r.h * 0.6 : r.h * 0.36, side ? r.w * 0.28 : r.w * 0.4, 130) / 2
    const vx = r.x + vs
    const vy = r.y + vs + 6
    if (vs > 12) {
      ctx.strokeStyle = rgba(C.ink, 0.15)
      ctx.strokeRect(Math.round(vx - vs - 4) + 0.5, Math.round(vy - vs - 4) + 0.5, Math.round(vs * 2 + 8), Math.round(vs * 2 + 8))
      vignette(idx, vx, vy, vs * 0.86, T)
    }
    const tx = side ? r.x + vs * 2 + 20 : r.x
    let ty = side ? r.y + 12 : vy + vs + 22
    const tWidth = side ? r.x + r.w - tx : r.w
    const d = fmtDate(EC[idx])
    const dateStr = idx >= 11 ? `DECEMBER 31 · ${d.time}` : `${MONTHS[d.m].toUpperCase()} ${d.day}`
    text(ctx, dateStr, tx, ty, { size: 9, color: k.ink2, tracking: 0.14 })
    ty += 8
    const tsize = clamp(Math.min(tWidth * 0.075, r.h * 0.11), 16, 32)
    let ts = tsize
    if (tw(ev.title, ts, 0, 'serif') > tWidth) ts = (tsize * tWidth) / tw(ev.title, tsize, 0, 'serif')
    ty += ts
    text(ctx, ev.title, tx, ty, { font: 'serif', size: ts, color: k.ink })
    ty += 16
    text(ctx, ev.said.toUpperCase(), tx, ty, { size: 8.5, color: k.muted, tracking: 0.12 })
    ty += 8
    const ns = tWidth > 300 ? 12.5 : 11.5
    const lines = wrap(ev.note, ns, tWidth)
    for (const ln of lines) {
      ty += ns * 1.45
      if (ty > r.y + r.h) break
      text(ctx, ln, tx, ty, { font: 'sans', size: ns, color: k.ink2, tracking: 0 })
    }
    ctx.restore()
  }

  function drawEonKey(x: number, y: number, a: number) {
    if (a <= 0.01) return
    ctx.save()
    ctx.globalAlpha = a
    let xx = x
    for (const e of EONS) {
      ctx.strokeStyle = e.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(xx, y - 3)
      ctx.lineTo(xx + 12, y - 3)
      ctx.stroke()
      text(ctx, e.name.toUpperCase(), xx + 17, y, { size: 7.5, color: k.muted, tracking: 0.12 })
      xx += 17 + tw(e.name.toUpperCase(), 7.5, 0.12) + 14
    }
    ctx.restore()
  }

  function captionAt(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const size = cap.at === 'a' ? capSizeA : capSizeB
      const cx0 = cap.at === 'a' ? capAX : capBX
      const cy0 = cap.at === 'a' ? capAY : capBY
      const maxW = (cap.at === 'a' ? capAW : capBW) - 4
      const lineH = size * 1.04
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = cy0 - lineH + li * lineH
        const sw = ln.s ? tw(ln.s, size, 0, 'serif') : 0
        const ew = ln.em ? tw(ln.em, size, 0, 'serif', true) : 0
        const tl = ln.tail ? tw(ln.tail, size, 0, 'serif') : 0
        const sz = sw + ew + tl > maxW ? (size * maxW) / (sw + ew + tl) : size
        const sc = sz / size
        ctx.save()
        ctx.beginPath()
        ctx.rect(cx0 - 4, y - size * 1.02, w, size * 1.32)
        ctx.clip()
        const dyy = (1 - pr) * size * 1.15 - pe * size * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, cx0, y + dyy, { font: 'serif', size: sz, color: k.ink })
        if (ln.em) text(ctx, ln.em, cx0 + sw * sc, y + dyy, { font: 'serif', size: sz, italic: true, color: C.moss })
        if (ln.tail) text(ctx, ln.tail, cx0 + (sw + ew) * sc, y + dyy, { font: 'serif', size: sz, color: k.ink })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, readouts: { label: string; value: string }[]) {
    const ch = chapterOf(T)
    const small = preview || short || narrow
    text(ctx, `${FIG} — Deep time`, pad, pad + 9, { size: small ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    if (!tiny) {
      const c = CHAPTERS[ch]
      const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
      ctx.save()
      ctx.globalAlpha = kIn
      text(ctx, `${c.num} — ${c.name}`, pad, pad + (small ? 23 : 27), { size: small ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true })
      ctx.restore()
    }
    if (readouts.length) {
      const kick = tw(`${FIG} — DEEP TIME`, small ? 8.5 : 10, 0.16)
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
      if (ptr.over && (ptr.mode === 'ruler' || (!ptr.down && onChapterRuler(ptr.x, ptr.y)))) {
        const hx = clamp(ptr.x, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[chapterOf(ht)].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12 })
      }
    }
  }

  /* --------------------------------------------------------- reading */

  function viewB(T: number) {
    return smoothstep(47.8, 50.4, T) * (1 - smoothstep(86, 89, T))
  }
  /** the spiral's current centre and radius (it shrinks into the corner for the last day) */
  function spiralNow(T: number) {
    const p = ease.inOutCubic(viewB(T))
    return { cx: lerp(aCx, bCx, p), cy: lerp(aCy, bCy, p), R: lerp(aR, bR, p), p }
  }
  function onChapterRuler(x: number, y: number) {
    return !preview && rulerY > 0 && y > rulerY - 18 && y < h && x > pad - 8 && x < w - pad + 8
  }
  function seekChapterRuler(x: number) {
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.2) target = c.t
    seek(Math.min(LOOP - 0.05, target))
  }
  /** What is under the pointer: a calendar moment on the spiral, the dial or the ruler. */
  function readAt(x: number, y: number, T: number) {
    const sp = spiralNow(T)
    const u = spiralHit(x, y, sp.cx, sp.cy, sp.R)
    if (u >= 0) {
      const [px, py] = spiralXY(u, sp.cx, sp.cy, sp.R)
      if (Math.hypot(px - x, py - y) < (ptr.touch ? 26 : 16)) return { c: cOfU(u), x: px, y: py, where: 'spiral' as const }
    }
    const db = viewB(T)
    if (db > 0.5) {
      const dd = Math.hypot(x - dCx, y - dCy)
      if (dd < dR + 10 && dd > dR * 0.25) {
        let th = Math.atan2(x - dCx, -(y - dCy))
        if (th < 0) th += TAU
        return { c: 364 + th / TAU, x: dCx + Math.sin(th) * dR, y: dCy - Math.cos(th) * dR, where: 'dial' as const }
      }
      if (T >= 57.8 && y > rY - 40 && y < rY + 30 && x > rX0 - 6 && x < rX1 + 6) {
        const s = clamp((rX1 - x) / (rX1 - rX0)) * 120
        return { c: YEAR_DAYS - s * S, x: clamp(x, rX0, rX1), y: rY, where: 'ruler' as const }
      }
    }
    return null
  }
  /** an event mark near the pointer, for taps */
  function eventAt(x: number, y: number, T: number) {
    const sp = spiralNow(T)
    const rad = ptr.touch ? 18 : 11
    for (let i = 0; i < 11; i++) {
      const [px, py] = spiralXY(uOf(EC[i]), sp.cx, sp.cy, sp.R)
      if (Math.hypot(px - x, py - y) < rad) return i
    }
    if (viewB(T) > 0.5) {
      for (const i of [11, 12]) {
        const th = ((EC[i] - 364) * 24 * TAU) / 24
        const rr = dR * (i === 11 ? 0.82 : 0.7)
        if (Math.hypot(dCx + Math.sin(th) * rr - x, dCy - Math.cos(th) * rr - y) < rad) return i
      }
      if (T >= 57.8)
        for (let i = 13; i < EVENTS.length; i++) {
          const s = (YEAR_DAYS - EC[i]) * 86400
          const px = rX1 - (s / 120) * (rX1 - rX0)
          if (Math.abs(px - x) < rad && Math.abs(rY - y) < 30) return i
        }
    }
    return -1
  }

  function drawReader(T: number) {
    if (preview) return
    // the ghost: a dot sliding along the outer turns
    if (!readOnce && T > 12 && T < 16) {
      const u0 = 0.66
      const u1 = 0.9
      const g = (T - 12) / 4
      const ga = smoothstep(0, 0.12, g) * (1 - smoothstep(0.86, 1, g))
      const sp = spiralNow(T)
      const uu = lerp(u0, u1, ease.inOutSine(clamp((g - 0.08) / 0.8)))
      ctx.save()
      ctx.globalAlpha = ga
      ctx.strokeStyle = C.ocean
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      for (let q = 0; q <= 40; q++) {
        const [x, y] = spiralXY(lerp(u0, uu, q / 40), sp.cx, sp.cy, sp.R)
        if (q) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      const [gx, gy] = spiralXY(uu, sp.cx, sp.cy, sp.R)
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(gx, gy, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(gx, gy, 10, 0, TAU)
      ctx.stroke()
      const lab = 'DRAG ALONG THE SPIRAL TO READ ANY DAY'
      const lw = tw(lab, 9, 0.14)
      halo(narrow ? 'DRAG ALONG THE SPIRAL' : lab, clamp(gx, pad + lw / 2, w - pad - lw / 2), gy + 24, { size: 9, color: C.ocean, align: 'center', tracking: 0.14 })
      ctx.restore()
    }
    if (!reader) return
    const r = reader
    const d = fmtDate(r.c)
    const ago = AGE * (1 - r.c / YEAR_DAYS)
    const eon = eonOf(r.c)
    let near = -1
    for (let i = 0; i < EVENTS.length; i++) {
      const tol = r.where === 'spiral' ? 2.5 : r.where === 'dial' ? 0.01 : 3 * S
      if (Math.abs(EC[i] - r.c) < tol) near = i
    }
    ctx.save()
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(r.x, r.y, 4, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(r.x, r.y, 9, 0, TAU)
    ctx.stroke()
    const lines = [r.where === 'spiral' ? `${MONTHS[d.m].toUpperCase()} ${d.day}` : `DEC 31 · ${d.time}`, fmtAgo(ago).toUpperCase(), r.c < 364 ? eon.name.toUpperCase() + ' EON' : '']
    if (near >= 0) lines.push(EVENTS[near].title.toUpperCase())
    const shown = lines.filter(Boolean)
    const bw = Math.max(...shown.map((s) => tw(s, 8.5, 0.12))) + 16
    const bh = shown.length * 13 + 10
    let bx = r.x + 16
    let by = r.y - bh - 10
    if (bx + bw > w - 6) bx = r.x - 16 - bw
    if (by < topY - 10) by = r.y + 14
    ctx.fillStyle = rgba(C.paper, 0.95)
    ctx.fillRect(bx, by, bw, bh)
    ctx.strokeStyle = rgba(C.ocean, 0.8)
    ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw), Math.round(bh))
    shown.forEach((s, q) => text(ctx, s, bx + 8, by + 16 + q * 13, { size: 8.5, color: q === 0 ? C.ocean : q === 3 ? k.ink : k.ink2, tracking: 0.12 }))
    ctx.restore()
  }

  /* ----------------------------------------------------------- frame */

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
        reader = null
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
        if (onChapterRuler(p.x, p.y)) {
          ptr.mode = 'ruler'
          seekChapterRuler(p.x)
        } else ptr.mode = 'read'
      } else if (p.type === 'move' && ptr.down && ptr.mode === 'ruler') seekChapterRuler(p.x)
      else if (p.type === 'up') {
        if (ptr.mode === 'read' && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) < (ptr.touch ? 16 : 9) && performance.now() - ptr.ms < 450) {
          const i = eventAt(p.x, p.y, T)
          if (i >= 0) {
            seek(Math.max(0, ARRIVE[i] - 0.7))
            sfx.tone(587.33, 0.6, { type: 'sine', gain: 0.03, room: 0.3 })
          }
        }
        ptr.down = false
        ptr.mode = ''
      }
      // a mouse reads on hover; a finger while it is down
      const r = ptr.mode === 'ruler' ? null : !ptr.touch || ptr.down ? readAt(p.x, p.y, T) : null
      reader = r
      if (r) readOnce = true
      if (ptr.touch && p.type === 'up') reader = null
      const ev = eventAt(p.x, p.y, T)
      env.setCursor(onChapterRuler(p.x, p.y) || ev >= 0 ? 'pointer' : r ? 'crosshair' : 'default')
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      const T = curT()
      if (code === 'ArrowRight') {
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
      if (prevT >= 0 && T < prevT - 1 && !seekFlag) looped = true
      const jumped = seekFlag || prevT < 0 || T < prevT - 1
      seekFlag = false
      const c = calAt(T)
      const cPrev = prevT >= 0 ? calAt(prevT) : c

      // sound: a soft bell at each arrival, rising through the year; a last tick at midnight
      if (dt > 0 && !jumped) {
        for (let i = 1; i < EVENTS.length; i++)
          if (cPrev < EC[i] && c >= EC[i]) {
            const scale = [146.83, 164.81, 185.0, 220.0, 246.94]
            const f = scale[i % 5] * Math.pow(2, Math.floor(i / 5))
            sfx.tone(f, 2.4, { type: 'sine', gain: 0.045, attack: 0.01, room: 0.5 })
            sfx.tone(f * 2, 1.6, { type: 'sine', gain: 0.015, attack: 0.01, room: 0.5, when: 0.02 })
          }
        if (prevT < 80 && T >= 80) sfx.tone(1760, 3, { type: 'sine', gain: 0.03, room: 0.7 })
      }

      ground(ctx, w, h, 'paper')
      const sp = spiralNow(T)
      const pB = sp.p
      const aDial = smoothstep(48.6, 50.2, T) * (1 - smoothstep(86, 87.6, T))
      const aRuler = smoothstep(57.8, 59.4, T) * (1 - smoothstep(86, 87.6, T))
      const drawOn = !looped && !env.params.has('at') ? ease.inOutCubic(clamp((T - 0.2) / 4.2)) : 1
      // short frames: the spiral, the dial and the card step aside for the ruler
      const ctxA = short ? 1 - smoothstep(57.6, 59, T) * (1 - smoothstep(86, 87.4, T)) : 1
      drawSpiral(T, c, sp.cx, sp.cy, sp.R, ctxA, pB < 0.5, drawOn)
      if (ctxA > 0.99) drawLeaders(aDial, aRuler)
      drawDial(c, aDial * ctxA)
      drawRuler(T, c, aRuler)
      // cards: the spiral view's on the right, the dial view's in its top band
      drawCard(T, c, cardA, 1 - smoothstep(0, 0.35, pB))
      drawCard(T, c, cardB, smoothstep(0.65, 1, pB) * ctxA)
      if (!stacked && !short && pB < 0.5) drawEonKey(cardA.x, capTopA - 14, (1 - pB * 2) * smoothstep(3, 5, T))
      else if (stacked && pB < 0.5) drawEonKey(pad, aCy + aR + 14, (1 - pB * 2) * smoothstep(3, 5, T))

      // the final quiet
      const quiet = smoothstep(80.4, 82, T) * (1 - smoothstep(85.4, 86.4, T))
      if (quiet > 0 && !tiny) {
        const lab = 'ALL OF RECORDED HISTORY: THE LAST 36 SECONDS · A LIFETIME: THE LAST HALF-SECOND'
        const lab2 = 'RECORDED HISTORY: THE LAST 36 S'
        const room = (rX1 - rX0) / 2 - 10
        const s = tw(lab, 8.5, 0.12) < room ? lab : tw(lab2, 8.5, 0.12) < room ? lab2 : ''
        if (s) text(ctx, s, rX0, rY + (short ? 33 : 37), { size: 8.5, color: k.ink2, tracking: 0.12, alpha: quiet })
      }

      const d = fmtDate(c)
      const ago = AGE * (1 - c / YEAR_DAYS)
      const dc = (calAt(T + 0.05) - calAt(T - 0.05)) / 0.1
      const yps = Math.abs(dc) * (AGE / YEAR_DAYS)
      const speed = yps >= 1e6 ? `${(yps / 1e6).toFixed(yps < 1e7 ? 1 : 0)} Myr/s` : yps >= 1e3 ? `${(yps / 1e3).toFixed(1)} kyr/s` : yps > 0.5 ? `${yps.toFixed(0)} yr/s` : '—'
      drawReader(T)
      captionAt(T)
      chrome(T, [
        { label: 'Date', value: d.date },
        { label: 'Time', value: c >= 364 ? d.time : `${String(d.hh).padStart(2, '0')}:${String(d.mm).padStart(2, '0')}` },
        { label: 'Ago', value: fmtAgo(ago).replace(' years ago', ' yr').replace(' billion yr', ' Gyr').replace(' million yr', ' Myr') },
        { label: 'Speed', value: speed },
      ])
      prevT = T
    },
  }
}

export default create
