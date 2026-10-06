/*
 * FIG. C.03 — AFTERIMAGE. Three experiments the viewer performs on their
 * own eye. Each one asks for a steady gaze at a small cross while a
 * saturated stimulus adapts the cones beneath it; then the stimulus is
 * replaced by a neutral gray, and the color the viewer sees there is made
 * by their own retina.
 *
 *   I    Opposites        four saturated hues → gray discs; each leaves its complement
 *   II   A field at dusk  a landscape in complementary colors → a pale gray line
 *                         drawing, which the afterimage paints in its true colors
 *   III  Lilac chaser     twelve lilac dots, one missing in turn (after Jeremy
 *                         Hinton): a green dot runs round and the lilac fades
 *
 * The stimuli are computed, not picked: every true color is turned 180°
 * about the neutral axis in OKLab (a, b → −a, −b) at a mid lightness and the
 * largest chroma the sRGB gamut allows. During fixation nothing moves except
 * a slow countdown ring at the cross, so the gaze can stay still.
 *
 * Interaction (full mode): tap to restart the count (or, once the gray is
 * up, to go on to the next experiment); ← → choose an experiment; tap the
 * ruler to jump. Test route: &exp=1–3&at=seconds into that experiment.
 */

import { C, TAU, clamp, cropMarks, ease, lerp, rgba, rng, setFont, smoothstep, text } from '../kit'
import { css, inGamut, oklabToLinear, toSrgb, type Rgb } from '../color'
import type { CreatePiece } from '../types'

const DEG = Math.PI / 180

/** OKLCH (h in degrees) → gamma sRGB, keeping L and h and lowering chroma until it fits sRGB. */
function lch(L: number, Cc: number, hDeg: number): Rgb {
  const h = hDeg * DEG
  const at = (c: number) => oklabToLinear([L, c * Math.cos(h), c * Math.sin(h)])
  if (inGamut(at(Cc))) return toSrgb(at(Cc))
  let lo = 0
  let hi = Cc
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(at(mid))) lo = mid
    else hi = mid
  }
  return toSrgb(at(lo))
}

/** The plate's neutral gray (OKLab a = b = 0) — the gray the afterimages are seen on. */
const GRAY_L = 0.82
const GRAY = lch(GRAY_L, 0, 0)

type Lch = [number, number, number]

/** The stimulus for a true color: the opposite hue about the neutral axis, mid lightness, full chroma. */
function stimulusOf([L, Cc, h]: Lch): Rgb {
  const Ls = clamp(0.73 + 0.35 * (0.62 - L), 0.52, 0.9)
  return lch(Ls, Math.min(0.24, Cc * 1.3 + 0.05), h + 180)
}
/** The tone the gray line drawing gives a region: neutral, with a trace of its true lightness. */
const toneOf = ([L]: Lch): Rgb => lch(GRAY_L + (L - 0.62) * 0.16, 0, 0)

/* ------------------------------------------------------------- the scenes */

// Experiment I — four saturated hues, the stimulus itself (the afterimage is their complement)
const OPP: { name: string; c: Lch }[] = [
  { name: 'RED', c: [0.6, 0.22, 27] },
  { name: 'YELLOW', c: [0.88, 0.18, 100] },
  { name: 'BLUE', c: [0.5, 0.19, 262] },
  { name: 'GREEN', c: [0.66, 0.18, 146] },
]
const OPP_NAMES = ['CYAN', 'VIOLET', 'YELLOW', 'MAGENTA']

// Experiment II — the true colors of a field at dusk (the stimulus shows their complements)
const LAND: Record<string, Lch> = {
  skyTop: [0.52, 0.13, 262],
  skyLow: [0.8, 0.11, 55],
  sun: [0.93, 0.13, 95],
  sea: [0.5, 0.1, 235],
  glitter: [0.88, 0.12, 85],
  headland: [0.42, 0.08, 292],
  meadow: [0.62, 0.15, 138],
  cloud: [0.86, 0.06, 20],
  tree: [0.4, 0.1, 150],
  poppy: [0.56, 0.21, 28],
}
type Region = keyof typeof LAND

// Experiment III — the lilac, and the green the eye answers it with
const LILAC: Lch = [0.7, 0.15, 335]

interface Exp {
  num: string
  name: string
  count: number
  hold: number
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const ARRIVE = preview ? 1.2 : 2.6
  const LEAVE = preview ? 0.8 : 1.4
  const EXPS: Exp[] = [
    { num: 'I', name: 'Opposites', count: preview ? 6 : 12, hold: preview ? 5 : 9 },
    { num: 'II', name: 'A field at dusk', count: preview ? 7 : 20, hold: preview ? 7 : 13 },
    { num: 'III', name: 'Lilac chaser', count: preview ? 6 : 16, hold: preview ? 5 : 9 },
  ]
  const total = (e: Exp) => ARRIVE + e.count + e.hold + LEAVE

  // precomputed colors
  const oppStim = OPP.map((o) => css(lch(o.c[0], o.c[1], o.c[2])))
  // what the eye adds: the opposite hue, faint, on the plate's gray
  const oppAfter = OPP.map((o) => css(lch(GRAY_L, 0.075, o.c[2] + 180)))
  const landStim = {} as Record<Region, string>
  const landTone = {} as Record<Region, string>
  const landTrue = {} as Record<Region, string>
  for (const k of Object.keys(LAND) as Region[]) {
    landStim[k] = css(stimulusOf(LAND[k]))
    landTone[k] = css(toneOf(LAND[k]))
    landTrue[k] = css(lch(LAND[k][0], LAND[k][1], LAND[k][2]))
  }
  const grayCss = css(GRAY)
  const lilacCss = css(lch(LILAC[0], LILAC[1], LILAC[2]))
  const greenCss = css(lch(GRAY_L - 0.02, 0.1, LILAC[2] + 180))

  /* ---------------------------------------------------------------- state */
  let ex = preview ? 1 : 0
  let et = 0
  {
    const pe = Number(env.params.get('exp'))
    if (env.params.has('exp') && pe >= 1 && pe <= 3) ex = Math.round(pe) - 1
    const pa = Number(env.params.get('at'))
    if (env.params.has('at') && Number.isFinite(pa)) et = Math.max(0, pa)
    // the card opens on a stimulus, not on an empty sheet
    else if (preview) et = ARRIVE + 0.4
  }
  let interacted = false
  let hoverRuler = -1
  let restartedAt = -10
  let clock = 0

  /* --------------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let pad = 16
  let stacked = false
  let tiny = false
  let small = false
  // plate
  let px = 0
  let py = 0
  let pw = 100
  let ph = 100
  // caption
  let capX = 0
  let capY = 0
  let capSize = 24
  let capW = 200
  // readout column (0 width when there is no room)
  let rx = 0
  let rw = 0
  let labelY = 0
  let rulerY = 0
  // scene geometry (rebuilt with the layout)
  let paths: Record<Region, Path2D> = {} as Record<Region, Path2D>
  let outline = new Path2D()
  let details = new Path2D()
  let horizonY = 0
  let dot: HTMLCanvasElement | null = null
  let dotG: HTMLCanvasElement | null = null
  let dotR = 10

  const CAPTION_LINES = ['Each color leaves', 'its opposite.', 'Now — the color', 'Your eye keeps a record', 'of what it saw.', 'What never changes,', 'Look at the cross.']

  function layout() {
    w = env.width
    h = env.height
    small = preview || Math.min(w, h) < 440
    tiny = h < 260
    const portrait = h > w * 1.05
    stacked = portrait || w < 560 || w / h < 1.3
    pad = clamp(Math.min(w, h) * 0.045, 12, 40)
    const top = pad + (tiny ? 18 : small ? 24 : 34)
    rulerY = h - pad * 0.7
    const bottom = rulerY - (tiny ? 16 : small ? 20 : 30)
    const labelH = tiny ? 14 : small ? 18 : 24
    // caption size: fit the widest caption line into the space available
    setFont(ctx, { font: 'serif', size: 100 })
    let widest = 0
    for (const s of CAPTION_LINES) widest = Math.max(widest, ctx.measureText(s).width / 100)
    if (stacked) {
      capSize = clamp(Math.min(w * 0.068, h * 0.042), 15, 34)
      capSize = Math.min(capSize, (w - pad * 2) / widest)
      const capBlock = capSize * 2.3
      const hintH = tiny || h < 360 ? 0 : 22
      const gapC = small ? 8 : 18
      const availH = bottom - top - labelH - capBlock - gapC - hintH
      pw = w - pad * 2
      ph = Math.min(portrait ? pw * 1.25 : pw / 1.45, availH)
      if (pw > ph * 1.75) pw = ph * 1.75
      px = (w - pw) / 2
      // the plate, its label and the caption sit together, a little above the middle
      const blockH = ph + labelH + gapC + capBlock + hintH
      py = top + Math.max(0, (bottom - top - blockH) * 0.42)
      labelY = py + ph + labelH * 0.78
      capX = pad
      capY = labelY + (small ? 10 : 18)
      capW = w - pad * 2
      rw = 0
      rx = 0
    } else {
      const sideW = clamp(w * 0.18, 120, 300)
      const availH = bottom - top - labelH
      pw = Math.min(w - pad * 2 - sideW * 2, availH * 1.5)
      ph = Math.min(availH, pw / 1.42)
      pw = Math.min(pw, ph * 1.6)
      px = (w - pw) / 2
      py = top + (availH - ph) / 2
      labelY = py + ph + labelH * 0.78
      const gap = clamp(w * 0.02, 12, 30)
      capW = px - pad - gap
      capSize = clamp(Math.min(w * 0.03, h * 0.055), 14, 40)
      capSize = Math.min(capSize, capW / widest)
      capX = pad
      capY = py + ph - capSize * 2.15
      rx = px + pw + gap
      rw = w - pad - rx
      if (rw < 110 || tiny) rw = 0
    }
    buildScene()
    buildDots()
  }

  function buildScene() {
    const m = Math.min(pw, ph)
    const X = (u: number) => px + pw * u
    const Y = (v: number) => py + ph * v
    horizonY = Y(0.53)
    const p = {} as Record<Region, Path2D>
    // sky: a deep upper band and a warm band above the horizon, with a soft edge between
    p.skyTop = new Path2D()
    p.skyTop.rect(px, py, pw, ph * 0.53)
    p.skyLow = new Path2D()
    p.skyLow.moveTo(px, Y(0.36))
    p.skyLow.bezierCurveTo(X(0.3), Y(0.31), X(0.62), Y(0.38), px + pw, Y(0.3))
    p.skyLow.lineTo(px + pw, horizonY)
    p.skyLow.lineTo(px, horizonY)
    p.skyLow.closePath()
    // a long evening cloud
    p.cloud = new Path2D()
    const lens = (path: Path2D, x0: number, x1: number, y: number, t: number) => {
      path.moveTo(x0, y)
      path.bezierCurveTo(X(lerp(x0u(x0), x0u(x1), 0.3)), y - t, X(lerp(x0u(x0), x0u(x1), 0.7)), y - t * 0.7, x1, y)
      path.bezierCurveTo(X(lerp(x0u(x0), x0u(x1), 0.6)), y + t * 0.45, X(lerp(x0u(x0), x0u(x1), 0.25)), y + t * 0.4, x0, y)
      path.closePath()
    }
    const x0u = (x: number) => (x - px) / pw
    lens(p.cloud, X(0.5), X(0.93), Y(0.17), m * 0.07)
    lens(p.cloud, X(0.08), X(0.36), Y(0.23), m * 0.045)
    // the sun, sitting on the sea
    p.sun = new Path2D()
    p.sun.arc(X(0.66), horizonY - m * 0.035, m * 0.105, 0, TAU)
    p.sea = new Path2D()
    p.sea.rect(px, horizonY, pw, py + ph - horizonY)
    p.glitter = new Path2D()
    for (let i = 0; i < 5; i++) {
      const gy = horizonY + ph * (0.035 + i * 0.03)
      const gw = m * (0.16 - i * 0.018)
      const gx = X(0.66) + (i % 2 ? 1 : -1) * m * 0.012
      p.glitter.moveTo(gx - gw, gy)
      p.glitter.quadraticCurveTo(gx, gy - m * 0.012, gx + gw, gy)
      p.glitter.quadraticCurveTo(gx, gy + m * 0.012, gx - gw, gy)
      p.glitter.closePath()
    }
    // a headland on the left, its foot on the horizon
    p.headland = new Path2D()
    p.headland.moveTo(px, horizonY)
    p.headland.lineTo(px, Y(0.44))
    p.headland.bezierCurveTo(X(0.08), Y(0.4), X(0.14), Y(0.37), X(0.2), Y(0.385))
    p.headland.bezierCurveTo(X(0.27), Y(0.4), X(0.33), Y(0.47), X(0.44), horizonY)
    p.headland.closePath()
    // the meadow in front
    p.meadow = new Path2D()
    p.meadow.moveTo(px, Y(0.73))
    p.meadow.bezierCurveTo(X(0.16), Y(0.68), X(0.34), Y(0.655), X(0.52), Y(0.7))
    p.meadow.bezierCurveTo(X(0.7), Y(0.745), X(0.86), Y(0.77), px + pw, Y(0.79))
    p.meadow.lineTo(px + pw, py + ph)
    p.meadow.lineTo(px, py + ph)
    p.meadow.closePath()
    // a tree on the meadow: trunk and a round crown
    p.tree = new Path2D()
    const tx = X(0.24)
    const tr = m * 0.095
    const ty = Y(0.69) - tr * 1.75
    p.tree.rect(tx - m * 0.008, ty + tr * 0.6, m * 0.016, Y(0.69) - ty - tr * 0.6 + m * 0.01)
    p.tree.moveTo(tx + tr, ty)
    p.tree.arc(tx, ty, tr, 0, TAU)
    // poppies, larger toward the front
    p.poppy = new Path2D()
    const POP: [number, number, number][] = [
      [0.06, 0.86, 1.2],
      [0.13, 0.94, 1.5],
      [0.36, 0.8, 0.95],
      [0.44, 0.9, 1.3],
      [0.55, 0.83, 1.0],
      [0.63, 0.95, 1.55],
      [0.74, 0.87, 1.1],
      [0.84, 0.93, 1.35],
      [0.93, 0.85, 0.9],
      [0.28, 0.9, 1.15],
    ]
    for (const [u, v, s] of POP) {
      const r = m * 0.022 * s
      p.poppy.moveTo(X(u) + r, Y(v))
      p.poppy.arc(X(u), Y(v), r, 0, TAU)
    }
    paths = p
    // drawing details, in both phases: grass, poppy stems, ripples, birds, the crown's leaves
    const d = new Path2D()
    const rr = rng(1804)
    for (let i = 0; i < 70; i++) {
      const u = rr()
      const v = 0.74 + rr() * 0.24
      const meadowTop = u < 0.52 ? lerp(0.715, 0.66, u / 0.52) : lerp(0.7, 0.79, (u - 0.52) / 0.48)
      if (v < meadowTop + 0.02) continue
      const gh = m * (0.012 + 0.03 * (v - 0.7))
      const lean = (rr() - 0.5) * gh * 0.8
      d.moveTo(X(u), Y(v))
      d.quadraticCurveTo(X(u) + lean * 0.3, Y(v) - gh * 0.6, X(u) + lean, Y(v) - gh)
    }
    for (const [u, v, sc] of POP) {
      const r = m * 0.022 * sc
      d.moveTo(X(u), Y(v) + r)
      d.quadraticCurveTo(X(u) + r * 0.4, Y(v) + r * 2.2, X(u) - r * 0.1, Y(v) + r * 3.4)
      d.moveTo(X(u) + r * 0.32, Y(v))
      d.arc(X(u), Y(v), r * 0.32, 0, TAU)
    }
    const RIPPLES: [number, number, number][] = [
      [0.31, 0.035, 0.12],
      [0.37, 0.085, 0.09],
      [0.84, 0.05, 0.1],
      [0.88, 0.11, 0.07],
      [0.06, 0.06, 0.06],
    ]
    for (const [u, dv, len] of RIPPLES) {
      d.moveTo(X(u), horizonY + ph * dv)
      d.lineTo(X(u) + m * len, horizonY + ph * dv)
    }
    const BIRDS: [number, number, number][] = [
      [0.38, 0.12, 1],
      [0.43, 0.09, 0.8],
      [0.47, 0.135, 0.65],
    ]
    for (const [u, v, sc] of BIRDS) {
      const bw2 = m * 0.022 * sc
      d.moveTo(X(u) - bw2, Y(v) - bw2 * 0.35)
      d.quadraticCurveTo(X(u) - bw2 * 0.4, Y(v) - bw2 * 0.55, X(u), Y(v))
      d.quadraticCurveTo(X(u) + bw2 * 0.4, Y(v) - bw2 * 0.55, X(u) + bw2, Y(v) - bw2 * 0.35)
    }
    for (let i = 0; i < 4; i++) {
      const a = -2.4 + i * 0.75
      d.moveTo(tx + Math.cos(a) * tr * 0.55, ty + Math.sin(a) * tr * 0.55)
      d.arc(tx, ty, tr * 0.55, a, a + 0.6)
    }
    details = d
    // the line drawing: every boundary once
    const o = new Path2D()
    o.moveTo(px, Y(0.36))
    o.bezierCurveTo(X(0.3), Y(0.31), X(0.62), Y(0.38), px + pw, Y(0.3))
    o.moveTo(px, horizonY)
    o.lineTo(px + pw, horizonY)
    o.addPath(p.headland)
    o.moveTo(px, Y(0.73))
    o.bezierCurveTo(X(0.16), Y(0.68), X(0.34), Y(0.655), X(0.52), Y(0.7))
    o.bezierCurveTo(X(0.7), Y(0.745), X(0.86), Y(0.77), px + pw, Y(0.79))
    o.addPath(p.tree)
    o.addPath(p.poppy)
    o.addPath(p.glitter)
    o.addPath(p.cloud)
    outline = o
  }

  /** A soft dot (a Gaussian, drawn once as a sprite) for the lilac chaser. */
  function sprite(color: string, r: number) {
    if (typeof document === 'undefined') return null
    const res = Math.min(2, env.dpr || 1)
    const c = document.createElement('canvas')
    const s = Math.max(4, Math.ceil(r * 2 * res))
    c.width = c.height = s
    const g = c.getContext('2d')
    if (!g) return null
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    // exp(−x²/2σ²) with σ = r/2.6, sampled at the stops
    const [cr, cg, cb] = color.match(/\d+/g)!.map(Number)
    for (let k = 0; k <= 8; k++) {
      const x = k / 8
      const a = Math.exp(-(x * 2.6) * (x * 2.6) / 2) * (1 - x * x * 0.15)
      grd.addColorStop(x, `rgba(${cr},${cg},${cb},${k === 8 ? 0 : a.toFixed(3)})`)
    }
    g.fillStyle = grd
    g.fillRect(0, 0, s, s)
    return c
  }
  function buildDots() {
    dotR = Math.min(pw, ph) * 0.085
    dot = sprite(lilacCss, dotR)
    dotG = sprite(greenCss, dotR)
  }

  layout()

  /* --------------------------------------------------------------- timing */
  const phaseOf = () => {
    const e = EXPS[ex]
    const f0 = ARRIVE
    const f1 = ARRIVE + e.count
    const end = f1 + e.hold
    return { e, f0, f1, end, fixing: et >= f0 && et < f1, revealed: et >= f1, u: et - f1 }
  }

  function goTo(i: number) {
    ex = (i + EXPS.length) % EXPS.length
    et = 0
  }
  function restart() {
    const { f0 } = phaseOf()
    et = f0 * 0.6
    restartedAt = clock
    env.sfx.tone(196, 0.5, { type: 'sine', gain: 0.04, attack: 0.01, room: 0.3 })
  }
  function act() {
    interacted = true
    const { revealed } = phaseOf()
    if (revealed) goTo(ex + 1)
    else restart()
  }

  /* -------------------------------------------------------------- drawing */
  const k = { ink: C.ink, ink2: C.ink2, muted: C.muted, rule: C.rule }

  function plateFrame(alpha: number) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.strokeRect(Math.round(px) - 0.5, Math.round(py) - 0.5, Math.round(pw) + 1, Math.round(ph) + 1)
    ctx.strokeStyle = rgba(C.ink, 0.45)
    const cm = small ? 5 : 8
    cropMarks(ctx, px - cm, py - cm, pw + cm * 2, ph + cm * 2, small ? 6 : 10)
    ctx.restore()
  }

  function cross(alpha: number, ring: number, ringIn: number) {
    const cx = px + pw / 2
    const cy = py + ph / 2
    const arm = clamp(Math.min(pw, ph) * 0.028, 4.5, 9)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = C.ink
    ctx.lineWidth = arm > 6 ? 1.6 : 1.3
    ctx.beginPath()
    ctx.moveTo(cx - arm, cy)
    ctx.lineTo(cx + arm, cy)
    ctx.moveTo(cx, cy - arm)
    ctx.lineTo(cx, cy + arm)
    ctx.stroke()
    if (ringIn > 0) {
      // the countdown ring: what is left of the count, clockwise from the top
      const rr = arm * 2.1
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(C.ink, 0.22 * ringIn)
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, TAU)
      ctx.stroke()
      if (ring > 0) {
        ctx.strokeStyle = rgba(C.ink, 0.8 * ringIn)
        ctx.beginPath()
        ctx.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + TAU * ring * ringIn)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  function drawOpposites(revealed: boolean, u: number, alpha: number) {
    const cx = px + pw / 2
    const cy = py + ph / 2
    const r = Math.min(pw * 0.2, ph * 0.215)
    const dx = Math.min(pw * 0.235, r * 1.18)
    const dy = Math.min(ph * 0.25, r * 1.16)
    const pos = [
      [cx - dx, cy - dy],
      [cx + dx, cy - dy],
      [cx - dx, cy + dy],
      [cx + dx, cy + dy],
    ]
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = grayCss
    ctx.fillRect(px, py, pw, ph)
    if (!revealed) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = oppStim[i]
        ctx.beginPath()
        ctx.arc(pos[i][0], pos[i][1], r, 0, TAU)
        ctx.fill()
      }
    } else {
      // the screen is gray; only hairline circles remain, so the eye can place its colors
      ctx.strokeStyle = rgba(C.ink, 0.32)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(pos[i][0] + r, pos[i][1])
        ctx.arc(pos[i][0], pos[i][1], r, 0, TAU)
      }
      ctx.stroke()
      ctx.setLineDash([])
      // after a while, name what the eye added, inside each circle
      const la = smoothstep(4, 5.5, u)
      if (la > 0 && r > 28) {
        const sz = r > 60 ? 9 : 8
        for (let i = 0; i < 4; i++) {
          text(ctx, OPP[i].name, pos[i][0], pos[i][1] - 4, { size: sz, color: k.muted, align: 'center', tracking: 0.14, alpha: la })
          text(ctx, `→ ${OPP_NAMES[i]}`, pos[i][0], pos[i][1] + sz + 4, { size: sz, color: k.ink2, align: 'center', tracking: 0.14, alpha: la })
        }
      }
    }
    ctx.restore()
  }

  function drawLandscape(mode: 'stim' | 'tone', alpha: number, washIn = 0) {
    const order: Region[] = ['skyTop', 'cloud', 'skyLow', 'headland', 'sun', 'sea', 'glitter', 'meadow', 'tree', 'poppy']
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.rect(px, py, pw, ph)
    ctx.clip()
    const fills = mode === 'stim' ? landStim : landTone
    for (const r of order) {
      ctx.fillStyle = fills[r]
      ctx.fill(paths[r])
    }
    if (washIn > 0) {
      // the true colors, washed in at the end
      ctx.globalAlpha = alpha * washIn
      for (const r of order) {
        ctx.fillStyle = landTrue[r]
        ctx.fill(paths[r])
      }
      ctx.globalAlpha = alpha
    }
    ctx.lineWidth = 1
    if (mode === 'tone') {
      ctx.strokeStyle = rgba(C.ink, 0.42 * (1 - washIn * 0.4))
      ctx.stroke(outline)
      ctx.strokeStyle = rgba(C.ink, 0.3 * (1 - washIn * 0.4))
      ctx.stroke(details)
    } else {
      ctx.strokeStyle = 'rgba(30,30,30,0.16)'
      ctx.stroke(outline)
      ctx.strokeStyle = 'rgba(30,30,30,0.22)'
      ctx.stroke(details)
    }
    ctx.restore()
  }

  function drawChaser(revealed: boolean, u: number, alpha: number, tt: number) {
    const cx = px + pw / 2
    const cy = py + ph / 2
    const R = Math.min(pw, ph) * 0.34
    // one dot missing in turn, clockwise from the top, about 0.1 s each
    const gap = Math.floor(tt / 0.1) % 12
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = grayCss
    ctx.fillRect(px, py, pw, ph)
    const lilacA = revealed ? 1 - smoothstep(2.2, 4.2, u) : 1
    const greenA = revealed ? smoothstep(0.4, 1.4, u) : 0
    const ringA = revealed ? smoothstep(2.6, 4.2, u) : 0
    const s = dotR * 2
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * TAU
      const x = cx + Math.cos(a) * R
      const y = cy + Math.sin(a) * R
      if (i === gap) {
        if (greenA > 0 && dotG) {
          ctx.globalAlpha = alpha * greenA
          ctx.drawImage(dotG, x - dotR, y - dotR, s, s)
          ctx.globalAlpha = alpha
        }
        continue
      }
      if (lilacA > 0 && dot) {
        ctx.globalAlpha = alpha * lilacA
        ctx.drawImage(dot, x - dotR, y - dotR, s, s)
        ctx.globalAlpha = alpha
      }
    }
    if (ringA > 0) {
      // where the lilac was: hairline circles
      ctx.globalAlpha = alpha * ringA
      ctx.strokeStyle = rgba(C.ink, 0.3)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (i / 12) * TAU
        const x = cx + Math.cos(a) * R
        const y = cy + Math.sin(a) * R
        ctx.moveTo(x + dotR * 0.45, y)
        ctx.arc(x, y, dotR * 0.45, 0, TAU)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = alpha
    }
    // the reading of what happened: leaders to the ring on a wide plate, two lines under it on a narrow one
    const la = revealed ? smoothstep(3.2, 4.4, u) : 0
    const sz = small ? 8 : 9
    if (la > 0 && !tiny && pw > 460) {
      const lab = (str: string, str2: string, ang: number, right: boolean, col: string) => {
        const x0 = cx + Math.cos(ang) * (R + dotR * 0.6)
        const y0 = cy + Math.sin(ang) * (R + dotR * 0.6)
        const x1 = right ? px + pw - 10 : px + 10
        ctx.strokeStyle = rgba(C.ink, 0.45 * la)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x0 + (right ? 12 : -12), y0)
        ctx.lineTo(right ? x1 - 4 : x1 + 4, y0)
        ctx.stroke()
        text(ctx, str, x1, y0 - 5, { size: sz, color: col, align: right ? 'right' : 'left', tracking: 0.12, alpha: la })
        text(ctx, str2, x1, y0 + sz + 4, { size: sz, color: k.muted, align: right ? 'right' : 'left', tracking: 0.12, alpha: la })
      }
      lab('GREEN', 'NEVER ON SCREEN', -0.28, true, C.moss)
      lab('LILAC', 'FADED WHILE YOU LOOKED', Math.PI + 0.28, false, C.ink2)
    } else if (la > 0 && cy + R + dotR + sz * 3.2 < py + ph) {
      const y0 = cy + R + dotR * 0.9 + sz + 4
      text(ctx, 'GREEN · NEVER ON SCREEN', cx, y0, { size: sz, color: C.moss, align: 'center', tracking: 0.12, alpha: la })
      text(ctx, 'LILAC · FADED WHILE YOU LOOKED', cx, y0 + sz + 6, { size: sz, color: k.ink2, align: 'center', tracking: 0.12, alpha: la })
    }
    ctx.restore()
  }

  /* ------------------------------------------------------------ captions */
  interface Cap {
    a: string
    b: string
    em: string
  }
  function captionFor(): { cap: Cap; t0: number } | null {
    const { e, f1, revealed, u } = phaseOf()
    if (!revealed) return { cap: { a: 'Hold still.', b: 'Look at the ', em: 'cross.' }, t0: 0.3 }
    if (ex === 0) return { cap: { a: 'Each color leaves', b: 'its ', em: 'opposite.' }, t0: f1 + 0.4 }
    if (ex === 1) {
      if (u < e.hold - 5.4) return { cap: { a: 'Now — the color', b: 'is ', em: 'in you.' }, t0: f1 + 0.5 }
      return { cap: { a: 'Your eye keeps a record', b: 'of ', em: 'what it saw.' }, t0: f1 + e.hold - 5.4 }
    }
    return { cap: { a: 'What never changes,', b: '', em: 'fades.' }, t0: f1 + 2.4 }
  }

  function drawCaption(fade: number) {
    const c = captionFor()
    if (!c) return
    const lineH = capSize * 1.08
    const { fixing } = phaseOf()
    // captions settle in before the count and never move during it
    const pr = fixing ? 1 : ease.outExpo(clamp((et - c.t0) / 0.9))
    if (pr <= 0) return
    ctx.save()
    ctx.globalAlpha = fade * clamp(pr * 1.4)
    const lines = [
      { s: c.cap.a, em: '' },
      { s: c.cap.b, em: c.cap.em },
    ]
    lines.forEach((ln, i) => {
      const y = capY + capSize + i * lineH + (1 - pr) * capSize * 0.4
      setFont(ctx, { font: 'serif', size: capSize })
      const sw = ln.s ? ctx.measureText(ln.s).width : 0
      if (ln.s) text(ctx, ln.s, capX, y, { font: 'serif', size: capSize, color: C.ink })
      if (ln.em) text(ctx, ln.em, capX + sw, y, { font: 'serif', size: capSize, italic: true, color: C.moss })
    })
    ctx.restore()
  }

  /* ------------------------------------------------------------- chrome */
  function header(alpha: number) {
    const hs = small ? 8.5 : 10
    const hy = pad + (small ? 2 : 6)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, 'FIG. C.03', pad + 26, hy, { size: hs, color: C.ocean, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const fw = ctx.measureText('FIG. C.03').width
    text(ctx, w < 520 ? 'AFTERIMAGE' : 'AFTERIMAGE · AN EXPERIMENT ON YOUR EYE', pad + 26 + fw + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    const e = EXPS[ex]
    if (w > 380) text(ctx, w < 700 ? `${e.num} / III` : `EXPERIMENT ${e.num} / III — ${e.name.toUpperCase()}`, w - pad, hy, { size: hs, color: k.ink2, align: 'right', tracking: 0.14 })
    ctx.restore()
  }

  function readouts(alpha: number) {
    if (rw <= 0) return
    const { e, revealed, u } = phaseOf()
    const rows: [string, string][] = []
    if (ex === 0) {
      rows.push(['STIMULUS', '4 HUES · OKLCH'], ['ADAPT', `${e.count} S AT THE CROSS`])
      if (revealed) rows.push(['SCREEN', 'GRAY · C 0.000'], ['YOU SEE', 'THE OPPOSITE HUES'])
    } else if (ex === 1) {
      rows.push(['STIMULUS', 'a, b → −a, −b'], ['ABOUT', 'NEUTRAL L 0.82'], ['ADAPT', `${e.count} S AT THE CROSS`])
      if (revealed) rows.push(['SCREEN', 'GRAY LINES · C 0.000'], ['COLOR', u > e.hold - 5.4 ? 'TRUE, WASHED IN' : 'YOURS'])
    } else {
      rows.push(['DOTS', '12 · ONE GONE AT A TIME'], ['STEP', '≈ 0.1 S · 1.2 S A TURN'], ['ADAPT', `${e.count} S AT THE CROSS`])
      if (revealed) rows.push(['LILAC', 'h 335°'], ['GREEN', 'h 155° · PREDICTED'])
    }
    const sz = small ? 8 : 9
    const lh = small ? 13 : 16
    let y = py + sz
    ctx.save()
    ctx.globalAlpha = alpha
    setFont(ctx, { size: sz, tracking: 0.14 })
    for (const [l, v] of rows) {
      text(ctx, l, rx, y, { size: sz - 0.5, color: k.muted, tracking: 0.14 })
      text(ctx, v, rx, y + lh * 0.82, { size: sz, color: k.ink, tracking: 0.08 })
      y += lh * 2
      if (y > py + ph - lh * 2) break
    }
    // the colour bar of experiment I: what was shown, and what the eye adds
    if (ex === 0 && revealed && y + 60 < py + ph + 10) {
      const ka = smoothstep(4.5, 6, u)
      if (ka > 0) {
        ctx.globalAlpha = alpha * ka
        const sw = Math.min(22, (rw - 6) / 4 - 4)
        const y0 = Math.max(y, py + ph - sw * 2 - lh * 2.4)
        text(ctx, 'SHOWN', rx, y0, { size: sz - 0.5, color: k.muted, tracking: 0.14 })
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = oppStim[i]
          ctx.fillRect(rx + i * (sw + 4), y0 + 5, sw, sw)
        }
        text(ctx, 'YOUR EYE ADDS ≈', rx, y0 + sw + lh + 4, { size: sz - 0.5, color: k.muted, tracking: 0.14 })
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = oppAfter[i]
          ctx.fillRect(rx + i * (sw + 4), y0 + sw + lh + 9, sw, sw)
          ctx.strokeStyle = rgba(C.ink, 0.25)
          ctx.lineWidth = 1
          ctx.strokeRect(Math.round(rx + i * (sw + 4)) + 0.5, Math.round(y0 + sw + lh + 9) + 0.5, Math.round(sw) - 1, Math.round(sw) - 1)
        }
      }
    }
    ctx.restore()
  }

  function countLabel(alpha: number) {
    const { e, f0, f1, fixing, revealed, u } = phaseOf()
    let s: string
    let col: string = k.ink2
    if (!revealed) {
      const left = fixing ? Math.ceil(f1 - et - 1e-6) : e.count
      s = w < 420 ? `LOOK AT THE CROSS · ${left}` : `LOOK AT THE CROSS · ${left}`
      if (clock - restartedAt < 1.2) s = `AGAIN — LOOK AT THE CROSS · ${left}`
      if (et < f0 * 0.5) col = k.muted
    } else {
      if (ex === 0) s = u < 4 ? 'KEEP LOOKING · THE GRAY IS NEUTRAL' : 'EACH CIRCLE HOLDS ITS OPPOSITE'
      else if (ex === 1) s = u < e.hold - 5.4 ? (w < 460 ? 'KEEP LOOKING · BLINK TO RENEW' : 'KEEP LOOKING AT THE CROSS · BLINK TO RENEW IT') : 'THE TRUE COLORS'
      else s = u < 3.2 ? 'THE GREEN WAS YOURS' : 'THIS IS WHAT YOUR EYE DID'
      col = C.moss
    }
    text(ctx, s, px + pw / 2, labelY, { size: small ? 8.5 : 10, color: col, align: 'center', tracking: 0.16, alpha })
  }

  /** The experiment ruler: three segments, no moving playhead (nothing should move during a count). */
  function ruler(alpha: number) {
    if (tiny && w < 500) return
    const x0 = pad
    const x1 = w - pad
    const tot = EXPS.reduce((s, e) => s + total(e), 0)
    const { f1, revealed } = phaseOf()
    let x = x0
    ctx.save()
    ctx.globalAlpha = alpha
    EXPS.forEach((e, i) => {
      const sw = ((x1 - x0) * total(e)) / tot
      const cur = i === ex
      ctx.lineWidth = 1
      ctx.strokeStyle = cur ? C.ink : hoverRuler === i ? C.ocean : rgba(C.ink, 0.2)
      ctx.beginPath()
      ctx.moveTo(x + 2, rulerY)
      ctx.lineTo(x + sw - 2, rulerY)
      ctx.moveTo(x + 2, rulerY - 3)
      ctx.lineTo(x + 2, rulerY + 3)
      ctx.stroke()
      if (cur) {
        // the phase reached, in steps: arrive → count → gray
        const fx = x + 2 + (sw - 4) * ((revealed ? f1 : ARRIVE) / total(e))
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + 2, rulerY)
        ctx.lineTo(fx, rulerY)
        ctx.stroke()
      }
      const label = sw > 150 ? `${e.num} · ${e.name.toUpperCase()}` : e.num
      text(ctx, label, x + 6, rulerY - 6, { size: small ? 8 : 9, color: cur ? C.ink : hoverRuler === i ? C.ocean : k.muted, tracking: 0.14 })
      x += sw
    })
    ctx.restore()
  }

  function hint(alpha: number) {
    if (preview || tiny) return
    const { revealed, f0 } = phaseOf()
    const narrow = w < 560
    let s = ''
    if (revealed) s = narrow ? 'TAP · NEXT EXPERIMENT' : 'TAP FOR THE NEXT EXPERIMENT · ← → CHOOSE'
    else s = narrow ? 'TAP TO START THE COUNT AGAIN' : 'TAP TO START THE COUNT AGAIN · ← → CHOOSE'
    const y = stacked ? Math.min(rulerY - (small ? 18 : 24), capY + capSize * 2.3 + 16) : rulerY - (small ? 18 : 24)
    const a = alpha * (interacted ? 0.55 : 1)
    if (stacked && capY + capSize * 2.3 + 10 > rulerY - 24) return
    text(ctx, s, w - pad, y, { size: small ? 8 : 9, color: k.muted, align: 'right', tracking: 0.14, alpha: a })
    // the ghost: one tap ripple on the plate, in the first experiment's arrival only
    if (!interacted && ex === 0 && et < f0 && clock < 8) {
      const g = clamp(et / f0)
      const gx = px + pw * 0.82
      const gy = py + ph * 0.8
      ctx.save()
      ctx.globalAlpha = alpha * (1 - g) * 0.9
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(gx, gy, 6 + g * 22, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(gx, gy, 3, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
  }

  /* -------------------------------------------------------------- frame */
  let lastTickSec = -1
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
      clock += dt
      if (!fontsReady && fontsLoaded()) {
        fontsReady = true
        layout()
      }
      const before = phaseOf()
      et += dt
      if (et >= total(EXPS[ex])) {
        et -= total(EXPS[ex])
        ex = (ex + 1) % EXPS.length
      }
      const ph2 = phaseOf()
      const { e, f0, f1, end, fixing, revealed, u } = ph2
      // sound: soft ticks for the last five seconds, a chord when the gray comes up
      if (dt > 0 && fixing) {
        const left = Math.ceil(f1 - et)
        if (left !== lastTickSec && left <= 5 && left >= 1) env.sfx.tone(left === 1 ? 880 : 660, 0.06, { type: 'sine', gain: 0.018, attack: 0.003, room: 0.15 })
        lastTickSec = left
      }
      if (dt > 0 && !before.revealed && revealed && before.e === e) {
        ;[392, 493.88, 587.33, 739.99].forEach((f, i) => env.sfx.tone(f, 3.2, { type: 'sine', gain: 0.03, attack: 0.03 + i * 0.02, room: 0.55, when: i * 0.05 }))
      }

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, w, h)
      const inA = ease.outCubic(smoothstep(0, ARRIVE * 0.55, et))
      const outA = 1 - smoothstep(end, end + LEAVE, et)
      const plateA = inA * outA
      const chromeA = preview ? 1 : Math.max(0.35, plateA)

      // the plate
      if (ex === 0) drawOpposites(revealed, u, plateA)
      else if (ex === 1) {
        if (!revealed) drawLandscape('stim', plateA)
        else drawLandscape('tone', plateA, ease.inOutSine(smoothstep(e.hold - 5.4, e.hold - 2.4, u)))
      } else drawChaser(revealed, u, plateA, et)
      plateFrame(Math.max(0.3, plateA))
      const ring = fixing ? clamp((f1 - et) / e.count) : revealed ? 0 : 1
      const ringIn = revealed ? 0 : smoothstep(f0 * 0.3, f0 * 0.9, et)
      cross(plateA, ring, ringIn)

      countLabel(plateA)
      drawCaption(outA)
      readouts(plateA)
      header(chromeA)
      ruler(chromeA)
      hint(plateA)
      if (!preview) env.setCursor('pointer')
    },
    pointer(p) {
      if (preview) return
      const onRuler = p.y > rulerY - 22 && p.y < h && p.x > pad - 6 && p.x < w - pad + 6 && !(tiny && w < 500)
      if (p.type === 'leave') {
        hoverRuler = -1
        return
      }
      if (onRuler) {
        const tot = EXPS.reduce((s, e) => s + total(e), 0)
        let x = pad
        hoverRuler = -1
        EXPS.forEach((e, i) => {
          const sw = ((w - pad * 2) * total(e)) / tot
          if (p.x >= x && p.x < x + sw) hoverRuler = i
          x += sw
        })
      } else hoverRuler = -1
      if (p.type === 'down') {
        if (hoverRuler >= 0) {
          interacted = true
          goTo(hoverRuler)
          return
        }
        act()
      }
    },
    key(code, down) {
      if (!['ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(code)) return false
      if (!down) return true
      interacted = true
      if (code === 'ArrowRight') goTo(ex + 1)
      else if (code === 'ArrowLeft') goTo(ex - 1)
      else act()
      return true
    },
  }
}

export default create

