/*
 * KINETIC TYPE — typography in motion, scored at 120 BPM.
 *
 * Forty-four beats, seven sequences, every one of them on the grid:
 *   I    REVEAL   four disciplines rise out of their masks; a selection box hops between them
 *   II   BUILD    "Designer", each glyph standing up from its baseline on sixteenths
 *   III  ECHO     "Play" as a stack of outlines that cascade and fold back
 *   IV   TRACK    "Sound", its tracking struck like a drum and decaying
 *   V    ANATOMY  a type specimen: cap height, x-height, ascender, descender on "Ag"
 *   VI   GRID     twelve columns draw in and the words snap into a layout
 *   VII  HOLD     the finished poster, then a wipe back to the top
 * Display type is Instrument Serif with moss italics; labels are Geist Mono.
 * In the viewer a tap moves on to the next sequence, and the score along the
 * foot is a map: tap a section there to go straight to it.
 * Everything is measured every frame, so the layout settles when the web
 * fonts arrive (the first frames may use the fallback faces).
 */

import { C, FONT, clamp, cropMarks, ease, ground, lerp, rgba, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. M.06'
const BPM = 120
const BEAT = 60 / BPM
const LOOP_BEATS = 44

interface Section {
  from: number
  to: number
  name: string
}
const SECTIONS: Section[] = [
  { from: 0, to: 8, name: 'Reveal' },
  { from: 8, to: 12, name: 'Build' },
  { from: 12, to: 16, name: 'Echo' },
  { from: 16, to: 20, name: 'Track' },
  { from: 20, to: 28, name: 'Anatomy' },
  { from: 28, to: 36, name: 'Grid' },
  { from: 36, to: 44, name: 'Hold' },
]
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
/** the ghost hint, full mode only, until the viewer acts (seconds) */
const GHOST_FROM = 1.4
const GHOST_TO = 3.9

const WORDS = [
  { word: 'Engineer', italic: false, note: 'C# / .NET · GRAPHQL · REACT' },
  { word: 'Designer', italic: true, note: 'TYPE · GRID · MOTION' },
  { word: 'Game systems', italic: false, note: 'SIMULATION · GAME FEEL' },
  { word: 'Sound', italic: false, note: 'SYNTHESIS · SEQUENCING · SIGNAL' },
]

/** progress of beat lb through [a, b], eased */
const seg = (lb: number, a: number, b: number, e: (x: number) => number = ease.outExpo) => e(clamp((lb - a) / (b - a)))


/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces (on the Playground page they are
 * already loaded and this resolves at once). Never blocks for long.
 */
if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('italic 400 64px "Instrument Serif"'), document.fonts.load('500 12px "Geist Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const hasTracking = 'letterSpacing' in ctx

  let w = 1
  let h = 1
  let portrait = false
  let m = 20
  // content box
  let x0 = 0
  let x1 = 1
  let y0 = 0
  let y1 = 1
  let colW = 10
  let gut = 10
  let lastBeat = -1
  // short frames (a phone on its side) condense the chrome and rebalance the layouts
  let short = false
  let tiny = false
  let wide = false
  let narrow = false
  // the piece's own clock in beats, so a tap can move it; equals t / BEAT until the viewer acts
  let clk = 0
  let acted = false
  // the score along the foot doubles as a map of the sections
  const score = { y: 0, x0: 0, x1: 1 }
  let hoverSection = -1
  let downAt: { x: number; y: number; ms: number } | null = null

  function layout() {
    portrait = h > w * 1.1
    short = !preview && !portrait && h < 380
    tiny = short && h < 260
    wide = short && w > h * 1.9
    narrow = !preview && !portrait && w < 640
    m = preview || short ? 10 : Math.max(18, Math.min(w, h) * 0.035)
    x0 = m + (preview ? 8 : short ? 10 : Math.max(14, w * 0.03))
    x1 = w - x0
    y0 = m + (preview ? 22 : short ? 24 : portrait ? 62 : 46)
    y1 = h - m - (preview ? 24 : short ? 26 : 54)
    gut = Math.max(preview ? 4 : 8, (x1 - x0) * 0.016)
    colW = (x1 - x0 - gut * 11) / 12
  }
  const colX = (i: number) => x0 + i * (colW + gut)
  const spanW = (a: number, b: number) => colX(b) + colW - colX(a)

  /* ------------------------------------------------------------ type helpers */

  const serif = (size: number, italic = false) => `${italic ? 'italic ' : ''}400 ${Math.max(1, size).toFixed(2)}px ${FONT.serif}`
  function plain() {
    if (hasTracking) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
  }
  function measure(str: string, size: number, italic = false) {
    ctx.font = serif(size, italic)
    plain()
    return ctx.measureText(str).width
  }
  /** the size at which str spans width wd */
  const fit = (str: string, wd: number, italic = false) => (100 * wd) / Math.max(1, measure(str, 100, italic))

  /** serif word rising into (p) and out of (q) a mask; returns its width */
  function maskWord(str: string, x: number, y: number, size: number, p: number, q = 0, o: { italic?: boolean; color?: string; align?: CanvasTextAlign } = {}) {
    const wd = measure(str, size, o.italic)
    if (p <= 0 || q >= 1) return wd
    const left = o.align === 'center' ? x - wd / 2 : o.align === 'right' ? x - wd : x
    ctx.save()
    ctx.beginPath()
    ctx.rect(left - size * 0.15, y - size * 1.02, wd + size * 0.4, size * 1.3)
    ctx.clip()
    ctx.fillStyle = o.color ?? C.ink
    ctx.textAlign = o.align ?? 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(str, x, y + (1 - p) * size * 1.1 - q * size * 1.15)
    ctx.restore()
    return wd
  }

  /** mono label typed out by p */
  function typed(str: string, x: number, y: number, p: number, o: { size?: number; color?: string; align?: CanvasTextAlign; alpha?: number } = {}) {
    if (p <= 0) return
    const n = Math.ceil(str.length * clamp(p))
    text(ctx, str.slice(0, n), x, y, { size: o.size ?? (preview ? 8 : 9.5), color: o.color ?? C.muted, align: o.align, tracking: 0.14, alpha: o.alpha })
  }

  /** the section's footnotes: left and right in landscape, stacked in portrait */
  function footer(left: string, right: string, p: number) {
    if (preview || short) return
    if (portrait || narrow) {
      typed(left, x0, y1 - 20, p)
      typed(right, x0, y1 - 6, p)
    } else {
      typed(left, x0, y1 - 6, p)
      typed(right, x1, y1 - 6, p, { align: 'right' })
    }
  }

  function hline(xa: number, xb: number, y: number, p: number, color: string) {
    if (p <= 0) return
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(xa, Math.round(y) + 0.5)
    ctx.lineTo(lerp(xa, xb, p), Math.round(y) + 0.5)
    ctx.stroke()
  }

  /** a vertical dimension with arrow ticks and a label to its right */
  function vdim(x: number, ya: number, yb: number, p: number, label: string, color: string) {
    if (p <= 0) return
    const mid = (ya + yb) / 2
    const a = lerp(mid, ya, p)
    const b = lerp(mid, yb, p)
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + 0.5, a)
    ctx.lineTo(Math.round(x) + 0.5, b)
    const s = ya < yb ? 1 : -1
    ctx.moveTo(x - 3, a + 5 * s)
    ctx.lineTo(x + 0.5, a)
    ctx.lineTo(x + 4, a + 5 * s)
    ctx.moveTo(x - 3, b - 5 * s)
    ctx.lineTo(x + 0.5, b)
    ctx.lineTo(x + 4, b - 5 * s)
    ctx.moveTo(x - 5, Math.round(ya) + 0.5)
    ctx.lineTo(x + 6, Math.round(ya) + 0.5)
    ctx.moveTo(x - 5, Math.round(yb) + 0.5)
    ctx.lineTo(x + 6, Math.round(yb) + 0.5)
    ctx.stroke()
    if (p > 0.6) text(ctx, label, x + 8, mid + 3, { size: preview ? 7.5 : 9, color, tracking: 0.1, alpha: clamp((p - 0.6) / 0.4) })
  }

  /** a design-tool selection box with handles and a size readout */
  function selection(x: number, y: number, wd: number, hd: number, a: number, label: string, below = false) {
    if (a <= 0) return
    ctx.globalAlpha = a
    ctx.strokeStyle = C.moss
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(wd), Math.round(hd))
    ctx.fillStyle = C.paper
    for (const [hx, hy] of [
      [x, y],
      [x + wd / 2, y],
      [x + wd, y],
      [x, y + hd / 2],
      [x + wd, y + hd / 2],
      [x, y + hd],
      [x + wd / 2, y + hd],
      [x + wd, y + hd],
    ]) {
      ctx.fillRect(Math.round(hx) - 2.5, Math.round(hy) - 2.5, 6, 6)
      ctx.strokeRect(Math.round(hx) - 2.5, Math.round(hy) - 2.5, 6, 6)
    }
    const tw = label.length * 6.4 + 10
    const lx = below ? x : x + wd + 12
    const ly = below ? y + hd + 6 : y + hd / 2 - 7.5
    ctx.fillStyle = C.moss
    ctx.fillRect(Math.round(lx), Math.round(ly), Math.round(tw), 15)
    text(ctx, label, lx + tw / 2, ly + 11, { size: 8.5, color: C.paper, align: 'center', tracking: 0.08 })
    ctx.globalAlpha = 1
  }

  /* ------------------------------------------------------------ I · REVEAL */

  function reveal(lb: number) {
    const H = y1 - y0
    // one list, or (on a wide, short frame) two columns of two
    const twoCol = wide
    const left0 = portrait ? colX(0) : twoCol ? colX(0) : colX(1)
    const right0 = portrait ? x1 : twoCol ? colX(5) + colW : colX(11) + colW
    let size = twoCol ? H / 2.75 : Math.min(H / 4.9, (right0 - left0) / 6.2)
    size = Math.min(size, ...WORDS.map((d) => fit(d.word, right0 - left0 - (portrait || twoCol ? 0 : colW), d.italic)))
    const lead = size * (portrait ? 1.7 : twoCol ? 1.2 : narrow ? 1.62 : 1.12)
    const lines = twoCol ? 2 : 4
    const top = y0 + (H - (size * 0.78 + lead * (lines - 1) + size * 0.28)) / 2 + size * 0.78
    const at = (i: number) => {
      const c = twoCol ? Math.floor(i / 2) : 0
      return { left: left0 + c * (colX(6) - colX(0)), right: right0 + c * (colX(6) - colX(0)), y: top + (twoCol ? i % 2 : i) * lead }
    }
    WORDS.forEach((d, i) => {
      const { left, right, y } = at(i)
      const p = seg(lb, i * 0.5, i * 0.5 + 1.1)
      const q = seg(lb, 6.4 + i * 0.25, 7.3 + i * 0.25, ease.inExpo)
      // 'Game systems' carries its accent on the second word
      if (d.word === 'Game systems') {
        const w1 = maskWord('Game ', left, y, size, p, q)
        maskWord('systems', left + w1, y, size, p, q, { italic: true, color: C.moss })
      } else maskWord(d.word, left, y, size, p, q, { italic: d.italic, color: d.italic ? C.moss : C.ink })
      // rule, index and note
      const rp = seg(lb, 1.2 + i * 0.25, 2.6 + i * 0.25, ease.inOutCubic) * (1 - seg(lb, 6.2 + i * 0.25, 7.2 + i * 0.25, ease.inOutCubic))
      hline(portrait || twoCol ? left : colX(0), right, y + size * 0.3, rp, rgba(C.ink, 0.22))
      const tp = seg(lb, 1.6 + i * 0.25, 2.6 + i * 0.25, (v) => v) * (1 - seg(lb, 6.3, 6.6, (v) => v))
      if (twoCol) typed(`0${i + 1}`, right, y + size * 0.3 - 6, tp, { color: C.ink2, align: 'right' })
      else if (!portrait) typed(`0${i + 1}`, colX(0), y - size * 0.62, tp, { color: C.ink2 })
      if (!preview && !short) {
        if (portrait || narrow) typed(d.note, portrait ? x0 : left, y + size * 0.3 + 15, tp)
        else typed(d.note, right, y + size * 0.3 - 7, tp, { align: 'right' })
      }
    })
    // a selection box hops down the list on the beat
    if (!preview) {
      const hop = lb < 3 ? -1 : lb < 4 ? 1 : lb < 5 ? 2 : lb < 6 ? 3 : -1
      if (hop >= 0) {
        const d = WORDS[hop]
        const { left, y } = at(hop)
        const wd = measure(d.word, size, d.italic)
        const local = lb - Math.floor(lb)
        const a = clamp(local / 0.08) * (lb >= 5.85 ? 1 - clamp((lb - 5.85) / 0.15) : 1)
        selection(left - 6, y - size * 0.8, wd + 12, size * 1.06, a, `W ${Math.round(wd)}  H ${Math.round(size * 1.06)}`, twoCol && hop < 2)
      }
    }
  }

  /* ------------------------------------------------------------ II · BUILD */

  function build(lb: number) {
    const word = 'Designer'
    const H = y1 - y0
    const size = Math.min(fit(word, (x1 - x0) * (portrait ? 0.96 : 0.74)), H * 0.5)
    const wd = measure(word, size)
    const left = (x0 + x1) / 2 - wd / 2
    const base = y0 + H * 0.5 + size * 0.3
    const asc = size * 0.72
    // baseline + cap guide
    const gp = seg(lb, 0, 0.8, ease.inOutCubic) * (1 - seg(lb, 3.45, 3.95, ease.inOutCubic))
    hline(x0, x1, base, gp, C.lagoon)
    hline(x0, x1, base - asc, gp * 0.9, rgba(C.lagoon, 0.35))
    if (!preview) {
      typed('BASELINE', x0, base + 14, gp)
      typed('CAP HEIGHT', x0, base - asc - 7, gp)
    }
    ctx.font = serif(size)
    plain()
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    let active = -1
    for (let i = 0; i < word.length; i++) {
      const gx = left + ctx.measureText(word.slice(0, i)).width
      const gw = ctx.measureText(word[i]).width
      const tIn = 0.35 + i * 0.25
      const pin = clamp((lb - tIn) / 0.9)
      const pout = clamp((lb - (3.35 + i * 0.07)) / 0.45)
      if (pin <= 0 || pout >= 1) continue
      const ang = (1 - ease.outBack(pin)) * (Math.PI / 2) + ease.inExpo(pout) * (Math.PI / 2)
      if (pin < 1) active = i
      // metric box, once standing
      if (!preview && pin >= 1 && pout <= 0) {
        ctx.strokeStyle = rgba(C.ink, 0.16)
        ctx.lineWidth = 1
        ctx.strokeRect(Math.round(gx) + 0.5, Math.round(base - asc) + 0.5, Math.round(gw), Math.round(asc))
      }
      ctx.save()
      ctx.translate(gx, base)
      ctx.rotate(ang)
      ctx.globalAlpha = clamp(pin * 3) * (1 - pout)
      ctx.fillStyle = C.ink
      ctx.font = serif(size)
      ctx.fillText(word[i], 0, 0)
      ctx.restore()
      ctx.font = serif(size)
    }
    // the protractor on the glyph that is still standing up
    if (active >= 0 && !preview) {
      const gx = left + ctx.measureText(word.slice(0, active)).width
      const pin = clamp((lb - (0.35 + active * 0.25)) / 0.9)
      const ang = (1 - ease.outBack(pin)) * (Math.PI / 2)
      const r = size * 0.42
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(gx, base, r, -Math.PI / 2, -Math.PI / 2 + ang, ang < 0)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(gx, base)
      ctx.lineTo(gx + Math.cos(-Math.PI / 2 + ang) * r * 1.1, base + Math.sin(-Math.PI / 2 + ang) * r * 1.1)
      ctx.stroke()
      ctx.fillStyle = C.moss
      ctx.fillRect(gx - 2, base - 2, 4, 4)
      text(ctx, `θ ${String(Math.round((ang * 180) / Math.PI)).padStart(2, '0')}°`, gx + r * 0.32, base - r * 1.05, { size: 9.5, color: C.moss, tracking: 0.08 })
    }
    // readout
    if (!preview) {
      const n = Math.min(word.length, Math.max(0, Math.floor((lb - 0.35) / 0.25) + 1))
      footer(`INSTRUMENT SERIF · ${Math.round(size)} PX`, `GLYPHS ${n}/${word.length} · ROTATE FROM BASELINE · 1/16 NOTES`, gp)
    }
  }

  /* ------------------------------------------------------------ III · ECHO */

  function echo(lb: number) {
    const word = 'Play'
    const H = y1 - y0
    const size = Math.min(fit(word, (x1 - x0) * (portrait ? 0.62 : 0.36), true), H * 0.62)
    const wd = measure(word, size, true)
    const layers = 9
    const stepX = size * 0.06
    const stepY = -size * 0.05
    const left = (x0 + x1) / 2 - wd / 2 - (stepX * (layers - 1)) / 2
    const base = y0 + H * 0.5 + size * 0.28 - (stepY * (layers - 1)) / 2
    const collapse = seg(lb, 3.25, 3.75, ease.inExpo)
    const out = seg(lb, 3.7, 4, ease.inExpo)
    ctx.font = serif(size, true)
    plain()
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.lineJoin = 'round'
    // back to front so the front copy sits on top
    for (let k = layers - 1; k >= 0; k--) {
      const appear = seg(lb, 0.1 + k * 0.25, 0.6 + k * 0.25)
      if (appear <= 0) continue
      const wave = lb > 1.5 ? 1 + 0.55 * Math.sin(((lb - 1.5) / 2) * Math.PI * 2 - k * 0.55) * clamp((lb - 1.5) / 0.5) : 1
      const off = k * appear * wave * (1 - collapse)
      const x = left + stepX * off
      const y = base + stepY * off + out * size * 0.2
      ctx.globalAlpha = (1 - out) * (k === 0 ? 1 : lerp(0.85, 0.25, k / (layers - 1)))
      if (k === 0) {
        // the front copy fills with moss from the baseline up
        const fill = seg(lb, 2.0, 2.6, ease.inOutCubic)
        if (fill > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(x - size * 0.2, y + size * 0.3 - fill * size * 1.35, wd + size * 0.4, fill * size * 1.35)
          ctx.clip()
          ctx.fillStyle = C.moss
          ctx.fillText(word, x, y)
          ctx.restore()
        }
        ctx.strokeStyle = C.moss
        ctx.lineWidth = 1.4
      } else {
        ctx.strokeStyle = C.ink
        ctx.lineWidth = 1
      }
      ctx.fillStyle = C.paper
      if (k > 0) ctx.fillText(word, x, y)
      ctx.strokeText(word, x, y)
    }
    ctx.globalAlpha = 1
    ctx.lineJoin = 'miter'
    // the offset vector
    if (!preview) {
      const vp = seg(lb, 2.4, 3.0, ease.inOutCubic) * (1 - seg(lb, 3.2, 3.5, (v) => v))
      if (vp > 0) {
        const ax = left - size * 0.08
        const ay = base + size * 0.16
        const bx = ax + stepX * (layers - 1) * vp
        const by = ay + stepY * (layers - 1) * vp
        ctx.strokeStyle = C.ink2
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
        ctx.fillStyle = C.ink2
        ctx.fillRect(ax - 2, ay - 2, 4, 4)
        ctx.fillRect(bx - 2, by - 2, 4, 4)
      }
      const lp = seg(lb, 0.4, 1.2, (v) => v) * (1 - seg(lb, 3.6, 3.9, (v) => v))
      const n = Math.min(layers, Math.max(0, Math.floor((lb - 0.1) / 0.25) + 1))
      footer(`LAYERS ${String(n).padStart(2, '0')} · OFFSET (${(stepX / size).toFixed(2)}, ${(stepY / size).toFixed(2)}) EM`, 'STROKETEXT · 1 PX · 1/8 NOTES', lp)
    }
  }

  /* ------------------------------------------------------------ IV · TRACK */

  /** tracking (em) is struck on each beat and decays, like a drum */
  function trackAt(lb: number) {
    const hits = [0.95, 0.35, 0.7, 0.2]
    let tr = 0.04
    for (let j = 0; j < 4; j++) if (lb >= j) tr += hits[j] * Math.exp(-(lb - j) * 3.2) * (1 - Math.exp(-(lb - j) * 40))
    return tr
  }

  function track(lb: number) {
    const word = 'Sound'
    const H = y1 - y0
    const outP = seg(lb, 3.5, 4, ease.inExpo)
    const tr = lerp(trackAt(lb), -0.06, outP)
    const base0 = fit(word, (x1 - x0) * (portrait ? 0.5 : 0.34))
    const size = Math.min(base0, H * 0.46)
    ctx.font = serif(size)
    plain()
    const adv: number[] = []
    let total = 0
    for (let i = 0; i < word.length; i++) {
      const a = ctx.measureText(word[i]).width
      adv.push(a)
      total += a + (i < word.length - 1 ? tr * size : 0)
    }
    const cx = (x0 + x1) / 2
    const base = y0 + H * 0.46 + size * 0.3
    let x = cx - total / 2
    const inP = seg(lb, 0, 0.5)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    const centres: number[] = []
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 - 20, base - size * 1.05, x1 - x0 + 40, size * 1.32)
    ctx.clip()
    for (let i = 0; i < word.length; i++) {
      ctx.fillStyle = i === 0 ? C.ink : C.ink
      ctx.globalAlpha = 1 - outP
      ctx.fillText(word[i], x, base + (1 - inP) * size * 1.1)
      centres.push(x + adv[i] / 2)
      x += adv[i] + tr * size
    }
    ctx.restore()
    ctx.globalAlpha = 1
    const ap = seg(lb, 0.3, 0.9, ease.inOutCubic) * (1 - outP)
    if (ap <= 0) return
    // ticks over each glyph, on a ruler
    const ry = base - size * 0.92
    ctx.strokeStyle = rgba(C.ink, 0.35 * ap)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - total / 2, ry + 0.5)
    ctx.lineTo(cx + total / 2, ry + 0.5)
    for (const c of centres) {
      ctx.moveTo(Math.round(c) + 0.5, ry - 6)
      ctx.lineTo(Math.round(c) + 0.5, ry + 0.5)
    }
    ctx.stroke()
    // width dimension below
    const dy = base + size * 0.2
    ctx.strokeStyle = rgba(C.moss, ap)
    ctx.beginPath()
    const xa = cx - total / 2
    const xb = cx + total / 2
    ctx.moveTo(xa, dy - 5)
    ctx.lineTo(xa, dy + 5)
    ctx.moveTo(xb, dy - 5)
    ctx.lineTo(xb, dy + 5)
    ctx.moveTo(xa, dy + 0.5)
    ctx.lineTo(xb, dy + 0.5)
    ctx.moveTo(xa + 5, dy - 2.5)
    ctx.lineTo(xa, dy + 0.5)
    ctx.lineTo(xa + 5, dy + 3.5)
    ctx.moveTo(xb - 5, dy - 2.5)
    ctx.lineTo(xb, dy + 0.5)
    ctx.lineTo(xb - 5, dy + 3.5)
    ctx.stroke()
    const lbl = `W ${Math.round(total)} PX`
    const lw2 = lbl.length * 6.4 + 10
    ctx.fillStyle = C.paper
    ctx.fillRect(cx - lw2 / 2, dy - 7, lw2, 14)
    text(ctx, lbl, cx, dy + 3.5, { size: 9, color: C.moss, align: 'center', tracking: 0.1, alpha: ap })
    // an oscilloscope under it, amplitude = tracking
    const oy = dy + Math.min(56, H * 0.12)
    const amp = Math.min(H * 0.07, 34) * clamp(tr / 0.9)
    ctx.strokeStyle = rgba(C.ink, 0.7 * ap)
    ctx.beginPath()
    const n = 160
    for (let k = 0; k <= n; k++) {
      const u = k / n
      const px = lerp(x0, x1, u)
      const env2 = Math.sin(u * Math.PI)
      const py = oy + Math.sin(u * 46 + lb * 9) * amp * env2 * (0.7 + 0.3 * Math.sin(u * 7 - lb * 3))
      if (k) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    ctx.stroke()
    if (!preview) {
      text(ctx, `TRACKING ${tr >= 0 ? '+' : '−'}${Math.abs(tr).toFixed(2)} EM`, x0, portrait ? ry - 16 : ry + 3, { size: 9.5, color: C.ink2, tracking: 0.12, alpha: ap })
      text(ctx, `${(lb + 1).toFixed(0)} / 4`, x1, portrait ? ry - 16 : ry + 3, { size: 9.5, color: C.muted, align: 'right', tracking: 0.12, alpha: ap })
      // the envelope that drives it, plotted over the bar
      const ew = Math.min(spanW(0, 3), 300)
      const eh = Math.min(46, H * 0.09)
      const ex = x0
      const ey = y1 - 22
      if (ey - eh > oy + 40) {
        ctx.strokeStyle = rgba(C.ink, 0.25 * ap)
        ctx.beginPath()
        ctx.moveTo(ex, Math.round(ey) + 0.5)
        ctx.lineTo(ex + ew, Math.round(ey) + 0.5)
        for (let j = 0; j <= 4; j++) {
          const x = Math.round(ex + (j / 4) * ew) + 0.5
          ctx.moveTo(x, ey)
          ctx.lineTo(x, ey + 4)
        }
        ctx.stroke()
        ctx.strokeStyle = rgba(C.moss, ap)
        ctx.beginPath()
        for (let k = 0; k <= 120; k++) {
          const u = (k / 120) * 4
          const x = ex + (u / 4) * ew
          const y = ey - clamp(trackAt(u) / 1.0) * eh
          if (k) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
        }
        ctx.stroke()
        const nx = ex + (Math.min(lb, 4) / 4) * ew
        const ny = ey - clamp(trackAt(lb) / 1.0) * eh
        ctx.fillStyle = C.moss
        ctx.fillRect(nx - 2, ny - 2, 4, 4)
        text(ctx, 'TRACKING ENVELOPE · 4 BEATS', ex, ey - eh - 8, { size: 8.5, color: C.muted, tracking: 0.14, alpha: ap })
      }
      text(ctx, 'ATTACK · DECAY', x1, oy + 3.5 + amp + 14, { size: 8.5, color: C.muted, align: 'right', tracking: 0.14, alpha: ap })
    }
  }

  /* ------------------------------------------------------------ V · ANATOMY */

  function anatomy(lb: number) {
    const H = y1 - y0
    const W = x1 - x0
    ctx.font = serif(100)
    plain()
    const m100 = (s: string) => {
      ctx.font = serif(100)
      plain()
      return ctx.measureText(s)
    }
    const capR = m100('H').actualBoundingBoxAscent / 100 || 0.7
    const xR = m100('x').actualBoundingBoxAscent / 100 || 0.46
    const ascR = Math.max(m100('d').actualBoundingBoxAscent, m100('l').actualBoundingBoxAscent) / 100 || 0.76
    const descR = Math.max(m100('g').actualBoundingBoxDescent, m100('p').actualBoundingBoxDescent) / 100 || 0.24
    const wR = m100('Ag').width / 100 || 1.1
    const size = Math.min((H * (portrait ? 0.62 : 0.8)) / (ascR + descR), (W * (portrait ? 0.64 : 0.5)) / wR)
    const gx = portrait ? x0 : colX(1)
    const base = y0 + (H - (ascR + descR) * size) / 2 + ascR * size + (portrait ? -H * 0.06 : 0)
    const outP = seg(lb, 7.2, 7.9, ease.inExpo)
    const inP = seg(lb, 0, 1.0)
    // the specimen
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 - 10, base - (ascR + 0.12) * size, W + 20, (ascR + descR + 0.24) * size)
    ctx.clip()
    ctx.fillStyle = C.ink
    ctx.font = serif(size)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Ag', gx, base + (1 - inP) * size * 1.1 + outP * size * 1.2)
    ctx.restore()
    const metrics: [string, number, string][] = [
      ['BASELINE', 0, C.lagoon],
      ['X-HEIGHT', xR, C.ink2],
      ['CAP HEIGHT', capR, C.ink2],
      ['ASCENDER', ascR, C.ink2],
      ['DESCENDER', -descR, C.ink2],
    ]
    const lineR = portrait ? x1 : x1
    // the guides draw on in order; their labels are placed by priority, above the line,
    // else below it, else not at all, so they never collide (ascender and cap height are close)
    const placed: number[] = []
    const fits = (y: number) => placed.every((q) => Math.abs(q - y) > 11)
    const order = [0, 1, 3, 2, 4]
    const labelY: (number | null)[] = metrics.map(() => null)
    for (const i of order) {
      const y = base - metrics[i][1] * size
      const ya = y - 6
      const yb = y + 13
      const pick = fits(ya) ? ya : fits(yb) ? yb : null
      if (pick !== null) placed.push(pick)
      labelY[i] = pick
    }
    metrics.forEach(([label, r], i) => {
      const p = seg(lb, 1 + i * 0.5, 1.9 + i * 0.5, ease.inOutCubic) * (1 - seg(lb, 7 - i * 0.1, 7.6 - i * 0.1, ease.inOutCubic))
      const y = base - r * size
      hline(x0, lineR, y, p, i === 0 ? C.lagoon : rgba(C.ink, 0.3))
      const ly = labelY[i]
      if (p > 0.5 && ly !== null) {
        const val = i === 0 ? '0' : `${(Math.abs(r) * (r < 0 ? -1 : 1)).toFixed(2)} EM`
        text(ctx, `${label}  ${val}`, lineR, ly, { size: preview || short ? 7.5 : 9, color: i === 0 ? C.lagoon : C.muted, align: 'right', tracking: 0.12, alpha: clamp((p - 0.5) * 2) })
      }
    })
    // vertical dimensions to the right of the glyphs
    if (!preview && !portrait && !short && !narrow) {
      const dx = gx + wR * size + Math.min(60, W * 0.05)
      const dims: [number, string][] = [
        [xR, `${Math.round(xR * size)}`],
        [capR, `${Math.round(capR * size)}`],
        [ascR, `${Math.round(ascR * size)}`],
      ]
      dims.forEach(([r, l], i) => {
        const p = seg(lb, 2.4 + i * 0.5, 3.2 + i * 0.5, ease.inOutCubic) * (1 - outP)
        vdim(dx + i * 44, base, base - r * size, p, l, C.moss)
      })
      const p = seg(lb, 3.9, 4.7, ease.inOutCubic) * (1 - outP)
      vdim(dx + 3 * 44, base, base + descR * size, p, `${Math.round(descR * size)}`, C.moss)
      // anatomy callouts
      const wA = m100('A').width / 100
      const wAg = wR
      const callouts: [string, number, number, number, number][] = [
        ['APEX', gx + wA * size * 0.5, base - capR * size, -1, -1],
        ['CROSSBAR', gx + wA * size * 0.52, base - capR * size * 0.33, -1, 1],
        ['EAR', gx + wAg * size * 0.97, base - xR * size * 1.0, 1, -1],
        ['LOOP', gx + (wA + (wAg - wA) * 0.45) * size, base + descR * size * 0.82, 1, 1],
      ]
      callouts.forEach(([label, cx, cy, sx, sy], i) => {
        const cp = seg(lb, 4.6 + i * 0.4, 5.2 + i * 0.4, ease.inOutCubic) * (1 - seg(lb, 6.8, 7.3, (v) => v))
        if (cp <= 0) return
        const lx = cx + sx * Math.min(70, size * 0.22)
        const ly = cy + sy * Math.min(40, size * 0.12)
        ctx.strokeStyle = C.moss
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2)
        ctx.moveTo(cx + sx * 3.5 * 0.7, cy + sy * 3.5 * 0.7)
        ctx.lineTo(lerp(cx, lx, cp), lerp(cy, ly, cp))
        if (cp >= 1) ctx.lineTo(lx + sx * 22, ly)
        ctx.stroke()
        if (cp >= 1) text(ctx, label, lx + sx * 26, ly + 3, { size: 9, color: C.moss, align: sx > 0 ? 'left' : 'right', tracking: 0.14 })
      })
    }
    const fp = seg(lb, 0.5, 1.5, (v) => v) * (1 - seg(lb, 7.3, 7.6, (v) => v))
    footer(`INSTRUMENT SERIF · REGULAR · ${Math.round(size)} PX`, 'METRICS MEASURED LIVE FROM THE FACE', fp)
  }

  /* ------------------------------------------------------------ VI–VII · GRID */

  interface Placed {
    str: string
    italic: boolean
    color: string
    x: number
    y: number
    size: number
    a: number
    b: number
    label: string
  }

  function composition(): Placed[] {
    const H = y1 - y0
    const list: Placed[] = []
    if (wide) {
      // two rows across the full measure
      const s1 = Math.min(fit('Engineer', spanW(0, 5)), fit('Designer', spanW(6, 11), true))
      const s2 = Math.min(fit('Game systems', spanW(0, 5)), fit('Sound', spanW(6, 8)), fit('Play.', spanW(9, 11), true))
      const lab = tiny ? 6 : 16
      const total = lab + s1 * 0.98 + lab + s2 * 0.98
      const k = Math.min(1, (H - 6) / total)
      let y = y0 + Math.max(2, (H - total * k) / 2) + lab * k + s1 * k * 0.74
      list.push({ str: 'Engineer', italic: false, color: C.ink, x: colX(0), y, size: s1 * k, a: 0, b: 5, label: '01 — ENGINEERING' })
      list.push({ str: 'Designer', italic: true, color: C.moss, x: colX(6), y, size: s1 * k, a: 6, b: 11, label: '02 — INTERFACE DESIGN' })
      y += s1 * k * 0.24 + lab * k + s2 * k * 0.74
      list.push({ str: 'Game systems', italic: false, color: C.ink, x: colX(0), y, size: s2 * k, a: 0, b: 5, label: '03 — GAME SYSTEMS' })
      list.push({ str: 'Sound', italic: false, color: C.ink, x: colX(6), y, size: s2 * k, a: 6, b: 8, label: '04 — SOUND' })
      list.push({ str: 'Play.', italic: true, color: C.moss, x: colX(9), y, size: s2 * k, a: 9, b: 11, label: '05 — PLAY' })
      return list
    }
    if (portrait) {
      const sA = fit('Engineer', spanW(0, 11))
      const sB = fit('Designer', spanW(0, 11), true)
      const s3 = Math.min(fit('Game systems', spanW(0, 11)), sA * 0.62)
      const s4 = Math.min(fit('Sound', spanW(0, 5)), fit('Play.', spanW(6, 11), true)) * 0.88
      const lab = 26
      const total = lab + sA * 0.98 + lab + sB * 0.98 + lab + s3 * 0.98 + lab + s4 * 0.98
      const k = Math.min(1, (H - 20) / total)
      let y = y0 + Math.max(10, (H - total * k) / 2)
      const push = (str: string, italic: boolean, color: string, a: number, b: number, size: number, label: string, newline = true) => {
        size *= k
        if (newline) y += lab * k + size * 0.74
        list.push({ str, italic, color, x: colX(a), y, size, a, b, label })
        return size
      }
      let s = push('Engineer', false, C.ink, 0, 11, sA, '01 — ENGINEERING')
      y += s * 0.24
      s = push('Designer', true, C.moss, 0, 11, sB, '02 — INTERFACE DESIGN')
      y += s * 0.24
      s = push('Game systems', false, C.ink, 0, 11, s3, '03 — GAME SYSTEMS')
      y += s * 0.24
      push('Sound', false, C.ink, 0, 5, s4, '04 — SOUND')
      push('Play.', true, C.moss, 6, 11, s4, '05 — PLAY', false)
      return list
    }
    const sA = fit('Engineer', spanW(0, 8))
    const sB = fit('Designer', spanW(3, 11), true)
    const s3 = Math.min(fit('Game systems', spanW(0, 5)), fit('Sound', spanW(6, 8)), fit('Play.', spanW(9, 11), true))
    const lab = 24
    const total = lab + sA * 0.98 + lab + sB * 0.98 + lab + s3 * 0.98
    const k = Math.min(1, (H - 10) / total)
    let y = y0 + Math.max(4, (H - total * k) / 2)
    y += lab * k + sA * k * 0.74
    list.push({ str: 'Engineer', italic: false, color: C.ink, x: colX(0), y, size: sA * k, a: 0, b: 8, label: '01 — ENGINEERING · C# / .NET · GRAPHQL' })
    y += sA * k * 0.24 + lab * k + sB * k * 0.74
    list.push({ str: 'Designer', italic: true, color: C.moss, x: colX(3), y, size: sB * k, a: 3, b: 11, label: '02 — INTERFACE DESIGN · TYPE, GRID, MOTION' })
    y += sB * k * 0.24 + lab * k + s3 * k * 0.74
    list.push({ str: 'Game systems', italic: false, color: C.ink, x: colX(0), y, size: s3 * k, a: 0, b: 5, label: '03 — GAME SYSTEMS' })
    list.push({ str: 'Sound', italic: false, color: C.ink, x: colX(6), y, size: s3 * k, a: 6, b: 8, label: '04 — SOUND' })
    list.push({ str: 'Play.', italic: true, color: C.moss, x: colX(9), y, size: s3 * k, a: 9, b: 11, label: '05 — PLAY' })
    return list
  }

  function drawWordAt(pl: Placed, dx: number, alpha: number) {
    if (alpha <= 0) return
    ctx.globalAlpha = alpha
    ctx.font = serif(pl.size, pl.italic)
    plain()
    ctx.fillStyle = pl.color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    if (pl.str === 'Game systems') {
      const w1 = ctx.measureText('Game ').width
      ctx.fillText('Game ', pl.x + dx, pl.y)
      ctx.font = serif(pl.size, true)
      ctx.fillStyle = C.moss
      ctx.fillText('systems', pl.x + dx + w1, pl.y)
    } else ctx.fillText(pl.str, pl.x + dx, pl.y)
    ctx.globalAlpha = 1
  }

  function gridSection(lb: number, hold: boolean) {
    // lb runs 0–16 across GRID and HOLD
    const H = y1 - y0
    const gridIn = seg(lb, 0, 1.2, ease.inOutCubic)
    const gridFade = hold ? 1 - 0.75 * seg(lb, 8, 9.5, ease.inOutCubic) : 1
    const wipe = seg(lb, 15, 15.9, ease.inOutCubic)
    // columns
    for (let c = 0; c < 12; c++) {
      const p = seg(lb, c * 0.05, 0.7 + c * 0.05, ease.inOutCubic) * gridFade
      if (p <= 0) continue
      const x = colX(c)
      ctx.fillStyle = rgba(C.lagoon, 0.045 * p)
      ctx.fillRect(x, y0, colW, H * p)
      ctx.strokeStyle = rgba(C.lagoon, 0.3 * p)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(x) + 0.5, y0)
      ctx.lineTo(Math.round(x) + 0.5, y0 + H * p)
      ctx.moveTo(Math.round(x + colW) + 0.5, y1)
      ctx.lineTo(Math.round(x + colW) + 0.5, y1 - H * p)
      ctx.stroke()
      if (!preview && !portrait && !short) text(ctx, String(c + 1).padStart(2, '0'), x + 3, y0 - 6, { size: 8.5, color: C.lagoon, tracking: 0.08, alpha: p })
    }
    if (!preview && !short && gridIn > 0) typed(`12 COLUMNS · ${Math.round(gut)} PX GUTTER · ${Math.round(colW)} PX COLUMN`, x0, y1 + 14, gridIn, { color: C.lagoon, alpha: 0.4 + 0.6 * gridFade })
    // words snap in on eighth notes
    const comp = composition()
    comp.forEach((pl, i) => {
      const t0 = 1.25 + i * 0.75
      const p = seg(lb, t0, t0 + 0.45, ease.outExpo)
      if (p <= 0) return
      const from = (i % 2 === 0 ? -1 : 1) * (colW + gut) * 2
      const dx = (1 - p) * from
      drawWordAt(pl, dx, clamp(p * 1.6))
      // snap guides: the target span and the baseline flash
      const g = clamp(1 - (lb - t0 - 0.2) / 0.9) * (p > 0.05 ? 1 : 0)
      if (g > 0 && !hold) {
        const xa = colX(pl.a)
        const xb = colX(pl.b) + colW
        ctx.fillStyle = rgba(C.moss, 0.07 * g)
        ctx.fillRect(xa, y0, xb - xa, H)
        ctx.strokeStyle = rgba(C.moss, 0.9 * g)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(Math.round(xa) + 0.5, y0)
        ctx.lineTo(Math.round(xa) + 0.5, y1)
        ctx.moveTo(Math.round(xb) - 0.5, y0)
        ctx.lineTo(Math.round(xb) - 0.5, y1)
        ctx.moveTo(x0, Math.round(pl.y) + 0.5)
        ctx.lineTo(x1, Math.round(pl.y) + 0.5)
        ctx.stroke()
        if (!preview) text(ctx, `COL ${pl.a + 1}–${pl.b + 1}`, xa + 4, y1 - 6, { size: 8.5, color: C.moss, tracking: 0.12, alpha: g })
      }
      // labels type in after the word lands
      const lp = seg(lb, t0 + 0.4, t0 + 1.4, (v) => v)
      // a label keeps its first clause when the full one would run off the measure
      ctx.font = `500 ${preview || short ? 7.5 : portrait ? 8.5 : 9.5}px ${FONT.mono}`
      const fullW = ctx.measureText(pl.label).width * 1.14
      const label = pl.x + fullW > x1 ? pl.label.split(' · ')[0] : pl.label
      if ((!preview || i < 2) && !tiny) typed(label, pl.x, pl.y - pl.size * 0.74 - (portrait ? 8 : short ? 6 : 9), lp, { color: C.ink2, size: preview || short ? 7.5 : portrait ? 8.5 : 9.5 })
    })
    // the colophon
    const cp = seg(lb, 5.5, 6.5, (v) => v)
    if (!preview && !short && !narrow && cp > 0) {
      const A = comp[0]
      const cy = portrait ? y1 - 40 : A.y - A.size * 0.42
      const cx = portrait ? x0 : x1
      const al: CanvasTextAlign = portrait ? 'left' : 'right'
      typed('ZACH BREWER', cx, cy, cp, { align: al, color: C.ink })
      typed('SOFTWARE ENGINEER & DESIGNER', cx, cy + 15, seg(lb, 5.8, 6.8, (v) => v), { align: al })
      typed('HOPKINS, MN — 2026', cx, cy + 30, seg(lb, 6.1, 7.1, (v) => v), { align: al })
    }
    // hold: a caret blinks after the last word on the beat
    if (hold && lb > 8 && lb < 15) {
      const last = comp[comp.length - 1]
      const wd = measure(last.str, last.size, last.italic)
      if ((lb % 1) < 0.5) {
        ctx.fillStyle = C.moss
        ctx.fillRect(last.x + wd + last.size * 0.06, last.y - last.size * 0.68, Math.max(2, last.size * 0.035), last.size * 0.8)
      }
    }
    // the wipe back to the top
    if (wipe > 0) {
      const wx = lerp(0, w, wipe)
      ctx.fillStyle = C.paper
      ctx.fillRect(0, y0 - 30, wx, H + 44)
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(wx) + 0.5, y0 - 30)
      ctx.lineTo(Math.round(wx) + 0.5, y1 + 14)
      ctx.stroke()
    }
  }

  /* ------------------------------------------------------------ chrome */

  function chrome(b: number, si: number) {
    // the sheet
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.lineWidth = 1
    cropMarks(ctx, m * 0.5, m * 0.5, w - m, h - m, preview ? 6 : 10)
    // a faint 12-column ground under every section
    ctx.strokeStyle = 'rgba(31,138,134,0.06)'
    ctx.beginPath()
    for (let c = 0; c < 12; c++) {
      const x = Math.round(colX(c)) + 0.5
      const xr = Math.round(colX(c) + colW) + 0.5
      ctx.moveTo(x, y0)
      ctx.lineTo(x, y1)
      ctx.moveTo(xr, y0)
      ctx.lineTo(xr, y1)
    }
    ctx.stroke()
    const hy = m + (preview || short ? 10 : 16)
    const fz = preview ? 7.5 : short || narrow ? 8.5 : 9.5
    text(ctx, preview || portrait || short || narrow ? `${FIG.replace('FIG. ', '')} — KINETIC TYPE` : `${FIG} — KINETIC TYPE`, x0, hy, { size: fz, color: C.muted, tracking: 0.14 })
    const sec = SECTIONS[si]
    if (!preview && (!(short || narrow) || w > 520)) text(ctx, `${ROMAN[si]} — ${sec.name.toUpperCase()}`, portrait ? x0 : (x0 + x1) / 2, portrait ? hy + 15 : hy, { size: fz, color: C.ink, align: portrait ? 'left' : 'center', tracking: 0.16 })
    // beat counter
    const bar = Math.floor(b / 4) + 1
    const beat = Math.floor(b % 4)
    const sq = preview || short ? 5 : 7
    for (let i = 0; i < 4; i++) {
      const bx = x1 - (3 - i) * (sq + 4) - sq
      const by = hy - sq + 1
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, sq, sq)
      if (i === beat) {
        const flash = 1 - clamp((b % 1) / 0.6)
        ctx.fillStyle = i === 0 ? C.moss : rgba(C.ink, 0.35 + 0.65 * flash)
        ctx.fillRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, sq, sq)
      }
    }
    if (!preview && (!(short || narrow) || w > 700)) text(ctx, `${BPM} BPM · BAR ${String(bar).padStart(2, '0')}.${beat + 1}`, portrait ? x1 : x1 - 4 * (sq + 4) - 6, portrait ? hy + 15 : hy, { size: fz, color: C.muted, align: 'right', tracking: 0.14 })
    // the score along the foot
    const ty = h - m - (preview ? 8 : short ? 12 : 18)
    const tw = x1 - x0
    score.y = ty
    score.x0 = x0
    score.x1 = x1
    // the section under the pointer is underlined, as a place to jump to
    if (hoverSection >= 0) {
      const sa = x0 + (SECTIONS[hoverSection].from / LOOP_BEATS) * tw
      const sb = x0 + (SECTIONS[hoverSection].to / LOOP_BEATS) * tw
      ctx.fillStyle = rgba(C.moss, 0.08)
      ctx.fillRect(sa, ty - 9, sb - sa, short ? 20 : 26)
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sa, Math.round(ty) + 2.5)
      ctx.lineTo(sb, Math.round(ty) + 2.5)
      ctx.stroke()
    }
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    ctx.moveTo(x0, Math.round(ty) + 0.5)
    ctx.lineTo(x1, Math.round(ty) + 0.5)
    for (let k = 0; k <= LOOP_BEATS; k++) {
      const x = Math.round(x0 + (k / LOOP_BEATS) * tw) + 0.5
      ctx.moveTo(x, ty)
      ctx.lineTo(x, ty - (k % 4 === 0 ? 6 : 3))
    }
    ctx.stroke()
    if (!preview) {
      SECTIONS.forEach((s, i) => {
        const x = x0 + (s.from / LOOP_BEATS) * tw
        text(ctx, portrait || short || narrow ? ROMAN[i] : `${ROMAN[i]} ${s.name.toUpperCase()}`, x + 3, ty + (short ? 10 : 13), { size: short ? 7.5 : 8, color: i === si || i === hoverSection ? C.ink : C.muted, tracking: 0.12 })
      })
    }
    const px = x0 + (b / LOOP_BEATS) * tw
    ctx.strokeStyle = C.moss
    ctx.beginPath()
    ctx.moveTo(Math.round(px) + 0.5, ty - 10)
    ctx.lineTo(Math.round(px) + 0.5, ty + 3)
    ctx.stroke()
    ctx.fillStyle = C.moss
    ctx.beginPath()
    ctx.moveTo(px - 4, ty - 14)
    ctx.lineTo(px + 4, ty - 14)
    ctx.lineTo(px, ty - 9)
    ctx.closePath()
    ctx.fill()
  }

  /** the ghost: a dotted run from the playhead to the next section, and the instruction */
  function ghostHint(t: number, b: number, si: number) {
    if (preview || acted || t < GHOST_FROM || t > GHOST_TO) return
    const u = (t - GHOST_FROM) / (GHOST_TO - GHOST_FROM)
    const a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.85, 1, u))
    const tw = score.x1 - score.x0
    const px = score.x0 + (b / LOOP_BEATS) * tw
    const nx = score.x0 + ((SECTIONS[si].to % LOOP_BEATS) / LOOP_BEATS) * tw
    const y = score.y - (short ? 16 : 22)
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = C.moss
    ctx.lineWidth = 1
    ctx.setLineDash([1.5, 3])
    ctx.beginPath()
    ctx.moveTo(px, y)
    ctx.lineTo(nx, y)
    ctx.stroke()
    ctx.setLineDash([])
    const dx = lerp(px, nx, ease.inOutSine((u * 2.2) % 1))
    ctx.fillStyle = C.moss
    ctx.beginPath()
    ctx.arc(dx, y, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(nx, y - 4)
    ctx.lineTo(nx + 5, y)
    ctx.lineTo(nx, y + 4)
    ctx.stroke()
    text(ctx, short ? 'TAP ▸ NEXT' : 'TAP ▸ NEXT SEQUENCE · OR TAP THE SCORE', nx + 10, y + 3, { size: 8.5, color: C.moss, tracking: 0.14 })
    ctx.restore()
  }

  /** jump to section i (in the current pass of the loop, or the next) */
  function jump(i: number) {
    const loop = Math.floor(clk / LOOP_BEATS)
    const n = SECTIONS.length
    const k = ((i % n) + n) % n
    const wrap = i >= n ? 1 : i < 0 ? -1 : 0
    clk = Math.max(0, (loop + wrap) * LOOP_BEATS + SECTIONS[k].from)
    lastBeat = -1
    acted = true
  }

  function currentSection() {
    const b = ((clk % LOOP_BEATS) + LOOP_BEATS) % LOOP_BEATS
    let si = 0
    for (let i = 0; i < SECTIONS.length; i++) if (b >= SECTIONS[i].from) si = i
    return { si, lb: b - SECTIONS[si].from }
  }

  const sectionAt = (x: number, y: number, touch: boolean) => {
    if (Math.abs(y - score.y) > (touch ? 22 : 14) || x < score.x0 - 4 || x > score.x1 + 4) return -1
    const beat = ((x - score.x0) / (score.x1 - score.x0)) * LOOP_BEATS
    let si = 0
    for (let i = 0; i < SECTIONS.length; i++) if (beat >= SECTIONS[i].from) si = i
    return si
  }

  return {
    resize(width, height) {
      w = width
      h = height
      layout()
    },
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hoverSection = -1
        downAt = null
        env.setCursor('default')
        return
      }
      hoverSection = touch ? -1 : sectionAt(p.x, p.y, touch)
      env.setCursor('pointer')
      if (p.type === 'down') downAt = { x: p.x, y: p.y, ms: performance.now() }
      if (p.type === 'up' && downAt) {
        const tap = Math.hypot(p.x - downAt.x, p.y - downAt.y) < (touch ? 16 : 10) && performance.now() - downAt.ms < 450
        downAt = null
        if (!tap) return
        const at = sectionAt(p.x, p.y, touch)
        // the score is a map; anywhere else moves on to the next sequence
        jump(at >= 0 ? at : currentSection().si + 1)
      }
    },
    key(code, down) {
      const digit = /^Digit([1-7])$/.exec(code)
      if (digit) {
        if (down) jump(Number(digit[1]) - 1)
        return true
      }
      if (code === 'ArrowRight' || code === 'Space' || code === 'Enter') {
        if (down) jump(currentSection().si + 1)
        return true
      }
      if (code === 'ArrowLeft') {
        if (down) {
          const { si, lb } = currentSection()
          jump(lb > 1 ? si : si - 1)
        }
        return true
      }
      return false
    },
    frame(t, dt) {
      clk += dt / BEAT
      const b = ((clk % LOOP_BEATS) + LOOP_BEATS) % LOOP_BEATS
      let si = 0
      for (let i = 0; i < SECTIONS.length; i++) if (b >= SECTIONS[i].from) si = i
      const lb = b - SECTIONS[si].from
      // a soft tick on each downbeat, a low tone on each section
      const whole = Math.floor(b)
      if (whole !== lastBeat) {
        if (lastBeat !== -1) {
          if (SECTIONS.some((s) => s.from === whole)) env.sfx.tone(196, 0.35, { type: 'sine', gain: 0.06, room: 0.3 })
          else if (whole % 4 === 0) env.sfx.tone(784, 0.05, { type: 'sine', gain: 0.025 })
        }
        lastBeat = whole
      }

      ground(ctx, w, h, 'paper')
      chrome(b, si)
      switch (si) {
        case 0:
          reveal(lb)
          break
        case 1:
          build(lb)
          break
        case 2:
          echo(lb)
          break
        case 3:
          track(lb)
          break
        case 4:
          anatomy(lb)
          break
        case 5:
          gridSection(lb, false)
          break
        default:
          gridSection(lb + 8, true)
      }
      ghostHint(t, b, si)
      plain()
    },
  }
}

export default create
