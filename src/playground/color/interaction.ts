/*
 * FIG. C.05 — INTERACTION. An homage to Josef Albers' Interaction of Color
 * (1963), set as four book plates that move:
 *
 *   I    One color as two   one inner color on a dark and a light ground looks
 *                           like two; the grounds slide away, the squares slide
 *                           together, and there is no seam
 *   II   Two colors as one  two different inner colors, each placed on the ground
 *                           that pushes it toward the other, look alike — until
 *                           they meet
 *   III  The Bezold effect  one red under a lattice of lines; turn half the lines
 *                           from black to white and the whole red seems to change
 *   IV   Homage             four nested squares in Albers' 1 : 2 : 3 proportions,
 *                           breathing through harmonies computed in OKLCH
 *
 * The colors are computed: plate II solves a simple contrast model in OKLab
 * (an inner color appears pushed away from its ground, P = X + k(X − G)) for
 * the two inner colors that should look identical. 70 s loop, a pure function
 * of time, held while you drag.
 *
 * Interaction (full mode): drag an inner square (or slide a ground) to
 * compare; tap to reveal; in III drag the boundary between black and white
 * lines; in IV drag to turn the harmony's hue, tap for the next one. ← → plates.
 * Test route: &at=seconds.
 */

import { C, TAU, clamp, cropMarks, damp, ease, lerp, rgba, setFont, smoothstep, text } from '../kit'
import { css, inGamut, linearToOklab, oklabToLinear, toLinear, toSrgb, type Rgb } from '../color'
import type { CreatePiece } from '../types'

const DEG = Math.PI / 180
type Lab = [number, number, number]

/** OKLCH (h in degrees) → OKLab. */
const lab = (L: number, Cc: number, h: number): Lab => [L, Cc * Math.cos(h * DEG), Cc * Math.sin(h * DEG)]
/** OKLab → gamma sRGB, lowering chroma (keeping L and hue) until it fits the gamut. */
function srgbOf([L, a, b]: Lab): Rgb {
  const at = (k: number) => oklabToLinear([L, a * k, b * k])
  if (inGamut(at(1))) return toSrgb(at(1))
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(at(mid))) lo = mid
    else hi = mid
  }
  return toSrgb(at(lo))
}
/** The OKLab a color actually has once it is on screen (after gamut fitting). */
const shown = (c: Lab): Lab => linearToOklab(toLinear(srgbOf(c)))
const cssOf = (c: Lab) => css(srgbOf(c))
const dE = (p: Lab, q: Lab) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
const lchStr = (c: Lab) => {
  const Cc = Math.hypot(c[1], c[2])
  const h = (((Math.atan2(c[2], c[1]) / DEG) % 360) + 360) % 360
  return `${c[0].toFixed(2)} ${Cc.toFixed(3)} ${Math.round(h)}°`
}
const mixLab = (p: Lab, q: Lab, t: number): Lab => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)]

/* --------------------------------------------------------------- the colors */

// Plate I: one inner color, a dark violet ground and a pale yellow one
const P1 = {
  inner: shown(lab(0.64, 0.06, 78)),
  g0: shown(lab(0.36, 0.12, 285)),
  g1: shown(lab(0.92, 0.1, 100)),
}
// Plate II: choose what both squares should look like, then solve P = X + k(X − G) for X on each ground
const K_L = 0.18
const K_AB = 0.1
const TARGET = lab(0.6, 0.05, 70)
const G2a = shown(lab(0.88, 0.07, 200))
const G2b = shown(lab(0.34, 0.1, 25))
const solve = (P: Lab, G: Lab): Lab => shown([(P[0] + K_L * G[0]) / (1 + K_L), (P[1] + K_AB * G[1]) / (1 + K_AB), (P[2] + K_AB * G[2]) / (1 + K_AB)])
const P2 = { a: solve(TARGET, G2a), b: solve(TARGET, G2b), g0: G2a, g1: G2b }
// Plate III: one red, black lines and white lines
const RED = shown(lab(0.55, 0.16, 30))
const BLACK = shown(lab(0.2, 0.015, 260))
const WHITE = shown(lab(0.97, 0.008, 95))
// Plate IV: harmonies for the four squares, outer → inner
const HARMONIES: { name: string; sq: Lab[] }[] = [
  { name: 'ANALOGOUS · OCHRE', sq: [lab(0.86, 0.1, 92), lab(0.8, 0.12, 82), lab(0.74, 0.135, 72), lab(0.68, 0.15, 60)] },
  { name: 'VALUE · BLUE-GRAY', sq: [lab(0.82, 0.02, 245), lab(0.72, 0.032, 248), lab(0.62, 0.045, 250), lab(0.52, 0.058, 252)] },
  { name: 'COMPLEMENTS THROUGH GRAY', sq: [lab(0.6, 0.12, 38), lab(0.68, 0, 0), lab(0.64, 0, 0), lab(0.6, 0.1, 218)] },
  { name: 'GLOW · DUSK', sq: [lab(0.32, 0.05, 268), lab(0.43, 0.075, 262), lab(0.56, 0.09, 250), lab(0.72, 0.1, 235)] },
  { name: 'ANALOGOUS · SPRING', sq: [lab(0.88, 0.06, 128), lab(0.8, 0.09, 134), lab(0.72, 0.115, 140), lab(0.64, 0.13, 146)] },
]

/* ----------------------------------------------------------------- timing */

const LOOP = 70
const PLATES = [
  { t: 0, num: 'I', name: 'One color as two', dur: 17 },
  { t: 17, num: 'II', name: 'Two colors as one', dur: 16 },
  { t: 33, num: 'III', name: 'The Bezold effect', dur: 15 },
  { t: 48, num: 'IV', name: 'Homage to the square', dur: 22 },
]
const REV0 = 8
const REV1 = 13.4
const IV_STEP = 22 / HARMONIES.length

interface Cap {
  t0: number
  t1: number
  a: string
  b: string
  em: string
}
const CAPS: Cap[] = [
  { t0: 1.4, t1: 15.8, a: 'The same color,', b: '', em: 'twice.' },
  { t0: 18.4, t1: 31.8, a: 'Two colors,', b: 'made ', em: 'one.' },
  { t0: 34.4, t1: 46.8, a: 'Change one line,', b: 'change ', em: 'the whole.' },
  { t0: 49.2, t1: 58.6, a: 'Color is the most', b: '', em: 'relative medium.' },
  { t0: 59.4, t1: 69.2, a: 'We almost never see', b: 'a color ', em: 'as it is.' },
]

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const at = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(at) ? at : preview ? 3 : 0
  let interacted = false

  // layout
  let w = env.width
  let h = env.height
  let pad = 16
  let small = false
  let tiny = false
  let stacked = false
  let px = 0
  let py = 0
  let pw = 100
  let ph = 100
  let capX = 0
  let capY = 0
  let capSize = 24
  let rx = 0
  let rw = 0
  let noteY = 0
  let rulerY = 0

  const CAP_LINES = ['The same color,', 'Two colors,', 'Change one line,', 'change the whole.', 'Color is the most', 'relative medium.', 'We almost never see', 'a color as it is.']

  let FM = 14
  function layout() {
    w = env.width
    h = env.height
    small = preview || Math.min(w, h) < 440
    tiny = h < 260
    FM = small ? 8 : 14
    const portrait = h > w * 1.05
    stacked = portrait || w < 560 || w / h < 1.3
    pad = clamp(Math.min(w, h) * 0.045, 12, 40)
    const top = pad + (tiny ? 22 : small ? 30 : 46)
    rulerY = h - pad * 0.7
    const bottom = rulerY - (tiny ? 18 : small ? 22 : 30)
    const noteH = (tiny ? 14 : small ? 18 : 24) + FM
    const top2 = top + FM
    setFont(ctx, { font: 'serif', size: 100 })
    let widest = 0
    for (const s of CAP_LINES) widest = Math.max(widest, ctx.measureText(s).width / 100)
    if (stacked) {
      capSize = clamp(Math.min(w * 0.066, h * 0.04), 15, 32)
      capSize = Math.min(capSize, (w - pad * 2) / widest)
      const capBlock = capSize * 2.3
      const gapC = small ? 8 : 16
      const availH = bottom - top2 - noteH - capBlock - gapC
      pw = w - pad * 2 - FM * 2
      ph = Math.min(portrait ? pw * 1.4 : pw / 1.5, availH)
      if (pw > ph * 1.8) pw = ph * 1.8
      px = (w - pw) / 2
      const blockH = ph + noteH + gapC + capBlock
      py = top2 + Math.max(0, (bottom - top2 - blockH) * 0.4)
      noteY = py + ph + noteH * 0.78
      capX = pad
      capY = noteY + gapC
      rw = 0
    } else {
      const sideW = clamp(w * 0.19, 120, 310)
      const availH = bottom - top2 - noteH
      pw = Math.min(w - pad * 2 - sideW * 2, availH * 1.75)
      ph = Math.min(availH, pw / 1.5)
      pw = Math.min(pw, ph * 1.8)
      px = (w - pw) / 2
      py = top2 + (availH - ph) / 2
      noteY = py + ph + noteH * 0.78
      const gap = clamp(w * 0.02, 12, 30) + FM
      const capW = px - pad - gap
      capSize = clamp(Math.min(w * 0.03, h * 0.055), 14, 40)
      capSize = Math.min(capSize, capW / widest)
      capX = pad
      capY = py + ph + FM - capSize * 2.15
      rx = px + pw + gap
      rw = w - pad - rx
      if (rw < 120 || tiny) rw = 0
    }
  }
  layout()

  /* ------------------------------------------------------------ interaction */
  interface Drag {
    kind: 'square' | 'ground' | 'divider' | 'hue'
    i: number
    sx: number
    sy: number
    ox: number
    oy: number
    moved: boolean
  }
  let drag: Drag | null = null
  // user offsets that spring back after release
  const sqOff = [
    [0, 0],
    [0, 0],
  ]
  const gOff = [0, 0]
  let divU = -1 // plate III: the user's boundary (0–1 of the panel), −1 = follow the timeline
  let divHold = 0
  let hueOff = 0
  let hover: { kind: string; i: number } | null = null

  const Tnow = () => ((clock % LOOP) + LOOP) % LOOP
  const plateAt = (T: number) => PLATES.reduce((acc, p, i) => (T >= p.t ? i : acc), 0)

  /* ---------------------------------------------------------------- geometry */
  function pairGeom() {
    const horiz = pw >= ph * 1.2
    const cx = px + pw / 2
    const cy = py + ph / 2
    const gap = Math.min(pw, ph) * 0.035
    const gs = horiz ? Math.min((pw - gap) / 2, ph) : Math.min(pw, (ph - gap) / 2)
    const is = gs * 0.26
    const ax = horiz ? 1 : 0
    const ay = horiz ? 0 : 1
    const c0 = [cx - ax * (gap / 2 + gs / 2), cy - ay * (gap / 2 + gs / 2)]
    const c1 = [cx + ax * (gap / 2 + gs / 2), cy + ay * (gap / 2 + gs / 2)]
    return { horiz, cx, cy, gap, gs, is, ax, ay, c0, c1 }
  }

  /** Reveal progress for plates I and II at local time u: grounds away, squares together, and back. */
  function revealAt(u: number) {
    const g = ease.inOutCubic(clamp((u - REV0) / 1.2)) * (1 - ease.inOutCubic(clamp((u - REV1 - 0.6) / 1.2)))
    const s = ease.inOutCubic(clamp((u - REV0 - 0.6) / 1.4)) * (1 - ease.inOutCubic(clamp((u - REV1) / 1.3)))
    return { g, s }
  }

  function squarePositions(u: number) {
    const G = pairGeom()
    const { s } = revealAt(u)
    const meet0 = [G.cx - G.ax * G.is * 0.5, G.cy - G.ay * G.is * 0.5]
    const meet1 = [G.cx + G.ax * G.is * 0.5, G.cy + G.ay * G.is * 0.5]
    return [
      [lerp(G.c0[0], meet0[0], s) + sqOff[0][0], lerp(G.c0[1], meet0[1], s) + sqOff[0][1]],
      [lerp(G.c1[0], meet1[0], s) + sqOff[1][0], lerp(G.c1[1], meet1[1], s) + sqOff[1][1]],
    ]
  }

  /* ----------------------------------------------------------------- drawing */
  const k = { ink: C.ink, ink2: C.ink2, muted: C.muted, rule: C.rule }

  function plateFrame(alpha: number, num: string, name: string) {
    ctx.save()
    ctx.globalAlpha = alpha
    const m = FM
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.strokeRect(Math.round(px - m) + 0.5, Math.round(py - m) + 0.5, Math.round(pw + m * 2), Math.round(ph + m * 2))
    ctx.strokeStyle = rgba(C.ink, 0.4)
    cropMarks(ctx, px - m - 6, py - m - 6, pw + m * 2 + 12, ph + m * 2 + 12, small ? 6 : 9)
    // plate number, set above the frame like a book plate
    const sz = small ? 8.5 : 9.5
    text(ctx, `PLATE ${num}`, px - m, py - m - (small ? 6 : 9), { size: sz, color: C.ocean, tracking: 0.16 })
    setFont(ctx, { size: sz, tracking: 0.16 })
    const nw = ctx.measureText(`PLATE ${num}`).width
    if (pw > 200) text(ctx, name.toUpperCase(), px - m + nw + sz, py - m - (small ? 6 : 9), { size: sz, color: k.muted, tracking: 0.16 })
    ctx.restore()
  }

  function drawPair(u: number, alpha: number, which: 0 | 1) {
    const G = pairGeom()
    const { g } = revealAt(u)
    const cols = which === 0 ? { g0: P1.g0, g1: P1.g1, a: P1.inner, b: P1.inner } : { g0: P2.g0, g1: P2.g1, a: P2.a, b: P2.b }
    const appear = ease.outCubic(clamp(u / 1.1))
    ctx.save()
    ctx.globalAlpha = alpha
    // the grounds: slide out from under the squares (timeline) or by hand
    for (let i = 0; i < 2; i++) {
      const dir = i === 0 ? -1 : 1
      const off = g * G.gs * 0.62 * dir + gOff[i]
      const c = i === 0 ? G.c0 : G.c1
      const x = c[0] - G.gs / 2 + G.ax * off
      const y = c[1] - G.gs / 2 + G.ay * off
      ctx.globalAlpha = alpha * (1 - g) * appear
      ctx.fillStyle = cssOf(i === 0 ? cols.g0 : cols.g1)
      // drawn on from the top, like a print pulled from the press
      ctx.fillRect(x, y, G.gs, G.gs * clamp(appear * 1.05))
    }
    ctx.globalAlpha = alpha
    // the inner squares
    const pos = squarePositions(u)
    const sa = smoothstep(0.5, 1.3, u)
    for (let i = 0; i < 2; i++) {
      ctx.globalAlpha = alpha * sa
      ctx.fillStyle = cssOf(i === 0 ? cols.a : cols.b)
      ctx.fillRect(pos[i][0] - G.is / 2, pos[i][1] - G.is / 2, G.is, G.is)
      if (hover && hover.kind === 'square' && hover.i === i && !drag) {
        ctx.strokeStyle = rgba(C.ink, 0.55)
        ctx.lineWidth = 1
        ctx.setLineDash([2, 3])
        ctx.strokeRect(pos[i][0] - G.is / 2 - 4.5, pos[i][1] - G.is / 2 - 4.5, G.is + 9, G.is + 9)
        ctx.setLineDash([])
      }
    }
    // the meeting: ticks at the join, and the verdict
    const { s } = revealAt(u)
    if (s > 0.96 && !drag) {
      const jx = G.cx
      const jy = G.cy
      const la = smoothstep(0.96, 1, s)
      ctx.globalAlpha = alpha * la
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      if (G.horiz) {
        ctx.moveTo(jx, jy - G.is / 2 - 14)
        ctx.lineTo(jx, jy - G.is / 2 - 5)
        ctx.moveTo(jx, jy + G.is / 2 + 5)
        ctx.lineTo(jx, jy + G.is / 2 + 14)
      } else {
        ctx.moveTo(jx - G.is / 2 - 14, jy)
        ctx.lineTo(jx - G.is / 2 - 5, jy)
        ctx.moveTo(jx + G.is / 2 + 5, jy)
        ctx.lineTo(jx + G.is / 2 + 14, jy)
      }
      ctx.stroke()
      const verdict = which === 0 ? 'NO SEAM · ONE COLOR' : `A SEAM · ΔE ${dE(P2.a, P2.b).toFixed(3)}`
      const ty = G.horiz ? jy + G.is / 2 + 30 : jy + G.is + 22
      text(ctx, verdict, jx, ty, { size: small ? 8.5 : 10, color: which === 0 ? C.moss : C.ocean, align: 'center', tracking: 0.16, alpha: la })
      if (!small) {
        text(ctx, 'A', jx + (G.horiz ? -G.is / 2 : -G.is / 2 - 24), jy + (G.horiz ? -G.is / 2 - 20 : 4), { size: 9, color: k.muted, align: 'center', tracking: 0.1, alpha: la })
        text(ctx, 'B', jx + (G.horiz ? G.is / 2 : G.is / 2 + 24), jy + (G.horiz ? -G.is / 2 - 20 : 4), { size: 9, color: k.muted, align: 'center', tracking: 0.1, alpha: la })
      }
    }
    // letters on the grounds before the reveal
    if (g < 0.05 && sa > 0.5 && !small) {
      for (let i = 0; i < 2; i++) {
        const c = i === 0 ? G.c0 : G.c1
        const lum = (i === 0 ? cols.g0 : cols.g1)[0]
        text(ctx, i === 0 ? 'A' : 'B', c[0] - G.gs / 2 + 10, c[1] - G.gs / 2 + 18, { size: 9, color: lum > 0.6 ? rgba(C.ink, 0.55) : 'rgba(238,244,241,0.6)', tracking: 0.1, alpha: sa })
      }
    }
    ctx.restore()
  }

  /** Plate III geometry: the patterned panel. */
  function bezGeom() {
    const bw = pw
    const bh = ph
    const sp = clamp(Math.min(bw, bh) / 30, 6, 13)
    return { bx: px, by: py, bw, bh, sp, lw: Math.max(1, sp * 0.13) }
  }
  function bezDivAt(u: number) {
    if (divU >= 0) return divU
    // the change sweeps in from the right, then holds at the middle
    return 1 - 0.5 * ease.inOutCubic(clamp((u - 2.2) / 3.2))
  }
  const bezStripAt = (u: number) => ease.inOutCubic(clamp((u - 7) / 1.1)) * (1 - ease.inOutCubic(clamp((u - 11.4) / 1.1)))

  function drawBezold(u: number, alpha: number) {
    const B = bezGeom()
    const appear = ease.outCubic(clamp(u / 1.2))
    const div = B.bx + B.bw * bezDivAt(u)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.rect(B.bx, B.by, B.bw, B.bh * appear)
    ctx.clip()
    ctx.fillStyle = cssOf(RED)
    ctx.fillRect(B.bx, B.by, B.bw, B.bh)
    // the lattice: two families of diagonals and a small diamond in every cell, one path
    const path = new Path2D()
    const s = B.sp * 1.7
    // diagonals through x − y ≡ 0 and x + y ≡ 0 (mod s), measured from the panel's corner
    for (let d = -Math.ceil(B.bh / s) * s; d <= B.bw + s; d += s) {
      path.moveTo(B.bx + d, B.by)
      path.lineTo(B.bx + d + B.bh, B.by + B.bh)
    }
    for (let d = 0; d <= B.bw + B.bh + s; d += s) {
      path.moveTo(B.bx + d, B.by)
      path.lineTo(B.bx + d - B.bh, B.by + B.bh)
    }
    // a small diamond at the center of every other cell
    const r = s * 0.17
    for (let j = 1; j * s * 0.5 < B.bh; j += 2) {
      for (let i = 0; i * s * 0.5 < B.bw; i += 2) {
        const xx = B.bx + i * s * 0.5
        const yy = B.by + j * s * 0.5
        path.moveTo(xx, yy - r)
        path.lineTo(xx + r, yy)
        path.lineTo(xx, yy + r)
        path.lineTo(xx - r, yy)
        path.closePath()
      }
    }
    ctx.lineWidth = B.lw
    ctx.lineJoin = 'miter'
    for (let side = 0; side < 2; side++) {
      ctx.save()
      ctx.beginPath()
      if (side === 0) ctx.rect(B.bx, B.by, div - B.bx, B.bh)
      else ctx.rect(div, B.by, B.bx + B.bw - div, B.bh)
      ctx.clip()
      ctx.strokeStyle = cssOf(side === 0 ? BLACK : WHITE)
      ctx.stroke(path)
      ctx.restore()
    }
    // the reveal: a band with no lines, so the red runs straight across
    const strip = bezStripAt(u)
    if (strip > 0) {
      const sh = B.bh * 0.15
      const sy = B.by + B.bh / 2 - sh / 2
      ctx.fillStyle = cssOf(RED)
      ctx.fillRect(B.bx + B.bw * 0.5 * (1 - strip), sy, B.bw * strip, sh)
      ctx.strokeStyle = rgba(C.paper, 0.7 * strip)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(B.bx, sy - 0.5)
      ctx.lineTo(B.bx + B.bw, sy - 0.5)
      ctx.moveTo(B.bx, sy + sh + 0.5)
      ctx.lineTo(B.bx + B.bw, sy + sh + 0.5)
      ctx.stroke()
    }
    ctx.restore()
    // the boundary handle
    ctx.save()
    ctx.globalAlpha = alpha * appear
    const hot = (hover && hover.kind === 'divider') || (drag && drag.kind === 'divider')
    ctx.strokeStyle = hot ? C.ink : rgba(C.ink, 0.6)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(div, B.by - (small ? 6 : 10))
    ctx.lineTo(div, B.by)
    ctx.moveTo(div, B.by + B.bh)
    ctx.lineTo(div, B.by + B.bh + (small ? 6 : 10))
    ctx.stroke()
    if (!preview && div < B.bx + B.bw - 2) {
      ctx.fillStyle = hot ? C.ink : rgba(C.ink, 0.7)
      ctx.beginPath()
      ctx.moveTo(div, B.by + B.bh + 2)
      ctx.lineTo(div - 4, B.by + B.bh + 8)
      ctx.lineTo(div + 4, B.by + B.bh + 8)
      ctx.closePath()
      ctx.fill()
    }
    const sa = strip
    if (sa > 0.6) {
      const sh = B.bh * 0.15
      const sy = B.by + B.bh / 2 + sh / 2
      text(ctx, 'THE SAME RED, BOTH SIDES', B.bx + B.bw / 2, sy - sh / 2 + 4, { size: small ? 8.5 : 10, color: 'rgba(255,250,240,0.92)', align: 'center', baseline: 'middle', tracking: 0.18, alpha: smoothstep(0.6, 1, sa) })
    }
    ctx.restore()
  }

  /** Plate IV: the squares' colors at local time u. */
  function homageAt(u: number) {
    const step = IV_STEP
    const i = Math.min(HARMONIES.length - 1, Math.floor(u / step))
    const f = u - i * step
    const nxt = (i + 1) % HARMONIES.length
    // hold, then breathe into the next
    const m = i === HARMONIES.length - 1 ? 0 : ease.inOutSine(clamp((f - (step - 1.6)) / 1.6))
    const sq = HARMONIES[i].sq.map((c, j) => {
      const q = mixLab(c, HARMONIES[nxt].sq[j], m)
      if (hueOff === 0) return q
      const Cc = Math.hypot(q[1], q[2])
      const hh = Math.atan2(q[2], q[1]) + hueOff
      return [q[0], Cc * Math.cos(hh), Cc * Math.sin(hh)] as Lab
    })
    return { sq, i, m, name: m > 0.5 ? HARMONIES[nxt].name : HARMONIES[i].name }
  }
  function homageGeom() {
    const S = Math.min(pw, ph) * 0.94
    return { x: px + (pw - S) / 2, y: py + (ph - S) / 2, S, u: S / 10 }
  }
  function drawHomage(u: number, alpha: number) {
    const H = homageGeom()
    const { sq } = homageAt(u)
    ctx.save()
    ctx.globalAlpha = alpha
    for (let j = 0; j < 4; j++) {
      // Albers' four-square format: margins below : beside : above = 1 : 2 : 3 (half-units)
      const a = ease.outCubic(clamp((u - j * 0.35) / 1.1))
      if (a <= 0) continue
      const side = (10 - 2 * j) * H.u
      const x = H.x + j * H.u
      const y = H.y + H.S - 0.5 * j * H.u - side
      ctx.fillStyle = cssOf(sq[j])
      ctx.globalAlpha = alpha * a
      ctx.fillRect(x, y + side * (1 - a) * 0.04, side, side)
    }
    ctx.restore()
    // proportions, dimensioned on the left of the outer square (wide screens)
    if (!small && pw > ph * 1.15) {
      const la = smoothstep(1.6, 2.6, u) * (1 - smoothstep(PLATES[3].dur - 1, PLATES[3].dur, u))
      ctx.save()
      ctx.globalAlpha = alpha * la
      ctx.strokeStyle = rgba(C.ink, 0.55)
      ctx.lineWidth = 1
      const x0 = H.x - 16
      const tick = (y: number) => {
        ctx.moveTo(x0 - 4, y)
        ctx.lineTo(x0 + 4, y)
      }
      ctx.beginPath()
      ctx.moveTo(x0, H.y)
      ctx.lineTo(x0, H.y + H.S)
      tick(H.y)
      tick(H.y + 1.5 * 3 * H.u)
      tick(H.y + H.S - 0.5 * 3 * H.u)
      tick(H.y + H.S)
      ctx.stroke()
      text(ctx, '3', x0 - 8, H.y + 0.75 * 3 * H.u + 3, { size: 9, color: k.ink2, align: 'right' })
      text(ctx, '1', x0 - 8, H.y + H.S - 0.25 * 3 * H.u + 3, { size: 9, color: k.ink2, align: 'right' })
      text(ctx, 'MARGINS', x0 - 8, H.y + H.S * 0.5 - 4, { size: 8.5, color: k.muted, align: 'right', tracking: 0.12 })
      text(ctx, '3 : 2 : 1', x0 - 8, H.y + H.S * 0.5 + 9, { size: 8.5, color: k.ink2, align: 'right', tracking: 0.12 })
      ctx.restore()
    }
  }

  /* ------------------------------------------------------------- annotation */
  function readouts(T: number, alpha: number) {
    if (rw <= 0) return
    const pi = plateAt(T)
    const u = T - PLATES[pi].t
    const rows: [string, string, Lab | null][] = []
    if (pi === 0) {
      rows.push(['INNER A', lchStr(P1.inner), P1.inner], ['INNER B', lchStr(P1.inner), P1.inner], ['ΔE OKLAB', '0.000', null], ['GROUND A', lchStr(P1.g0), P1.g0], ['GROUND B', lchStr(P1.g1), P1.g1])
    } else if (pi === 1) {
      rows.push(['INNER A', lchStr(P2.a), P2.a], ['INNER B', lchStr(P2.b), P2.b], ['ΔE OKLAB', dE(P2.a, P2.b).toFixed(3), null], ['BOTH LOOK LIKE', lchStr(TARGET), null], ['MODEL', `P = X + k(X − G) · k ${K_L}`, null])
    } else if (pi === 2) {
      const B = bezGeom()
      rows.push(['FILL', lchStr(RED), RED], ['LINES', 'BLACK | WHITE', null], ['LINE', `${B.lw.toFixed(1)} PX EVERY ${(B.sp * 1.7).toFixed(0)} PX`, null], ['EFFECT', 'ASSIMILATION', null])
    } else {
      const { sq, name } = homageAt(u)
      rows.push(['HARMONY', name, null])
      sq.forEach((c, j) => rows.push([`SQUARE ${j + 1}`, lchStr(c), c]))
    }
    const sz = small ? 8 : 9
    const lh = small ? 13 : 15.5
    let y = py + sz
    ctx.save()
    ctx.globalAlpha = alpha
    for (const [l, v, c] of rows) {
      text(ctx, l, rx, y, { size: sz - 0.5, color: k.muted, tracking: 0.14 })
      let vx = rx
      if (c) {
        ctx.fillStyle = cssOf(c)
        ctx.fillRect(rx, y + lh * 0.82 - sz * 0.8, sz * 1.1, sz * 0.9)
        ctx.strokeStyle = rgba(C.ink, 0.25)
        ctx.lineWidth = 1
        ctx.strokeRect(Math.round(rx) + 0.5, Math.round(y + lh * 0.82 - sz * 0.8) + 0.5, Math.round(sz * 1.1) - 1, Math.round(sz * 0.9) - 1)
        vx = rx + sz * 1.6
      }
      setFont(ctx, { size: sz, tracking: 0.08 })
      let s = v
      while (s.length > 4 && ctx.measureText(s).width > rw - (vx - rx)) s = s.slice(0, -1)
      text(ctx, s, vx, y + lh * 0.82, { size: sz, color: k.ink, tracking: 0.08 })
      y += lh * 2
      if (y > py + ph) break
    }
    ctx.restore()
  }

  function note(T: number, alpha: number) {
    const pi = plateAt(T)
    const u = T - PLATES[pi].t
    let s = ''
    if (pi === 0) s = revealAt(u).s > 0.5 ? 'THE SQUARES ARE ONE COLOR' : 'TWO GROUNDS · ONE INNER COLOR'
    else if (pi === 1) s = revealAt(u).s > 0.5 ? 'THEY WERE TWO COLORS ALL ALONG' : 'TWO GROUNDS · TWO INNER COLORS?'
    else if (pi === 2) s = bezStripAt(u) > 0.5 ? 'ONE FILL UNDER BOTH' : 'ONE FILL · BLACK LINES | WHITE LINES'
    else s = w < 520 ? 'HOMAGE TO THE SQUARE' : 'AFTER ALBERS’ HOMAGE TO THE SQUARE, 1950–1976'
    text(ctx, s, px + pw / 2, noteY, { size: small ? 8.5 : 9.5, color: k.ink2, align: 'center', tracking: 0.16, alpha })
  }

  function captions(T: number) {
    for (const c of CAPS) {
      if (T < c.t0 - 0.1 || T > c.t1 + 0.1) continue
      const lineH = capSize * 1.08
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
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: C.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: C.moss })
        ctx.restore()
      })
    }
  }

  function header() {
    const hs = small ? 8.5 : 10
    const hy = pad + (small ? 2 : 6)
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, 'FIG. C.05', pad + 26, hy, { size: hs, color: C.ocean, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const fw = ctx.measureText('FIG. C.05').width
    text(ctx, w < 560 ? 'INTERACTION' : 'INTERACTION · AFTER JOSEF ALBERS, 1963', pad + 26 + fw + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    const T = Tnow()
    const lt = T
    if (w > 420) text(ctx, `T ${String(Math.floor(lt / 60)).padStart(2, '0')}:${(lt % 60).toFixed(1).padStart(4, '0')} / 01:10`, w - pad, hy, { size: hs, color: k.muted, align: 'right', tracking: 0.12 })
  }

  let hoverRuler = -1
  function ruler(T: number) {
    if (tiny && w < 500) return
    const x0 = pad
    const x1 = w - pad
    const yb = rulerY
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.18)
    ctx.beginPath()
    ctx.moveTo(x0, yb)
    ctx.lineTo(x1, yb)
    for (let i = 0; i <= 35; i++) {
      const x = lerp(x0, x1, i / 35)
      ctx.moveTo(x, yb)
      ctx.lineTo(x, yb - (i % 5 === 0 ? 4 : 2))
    }
    ctx.stroke()
    const pi = plateAt(T)
    PLATES.forEach((p, i) => {
      const x = lerp(x0, x1, p.t / LOOP)
      const sw = ((x1 - x0) * p.dur) / LOOP
      const label = sw > 150 ? `${p.num} · ${p.name.toUpperCase()}` : p.num
      text(ctx, label, x + 4, yb - 7, { size: small ? 8 : 8.5, color: i === pi ? C.ink : hoverRuler === i ? C.ocean : k.muted, tracking: 0.12 })
    })
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    const xp = lerp(x0, x1, T / LOOP)
    ctx.moveTo(xp, yb + 3)
    ctx.lineTo(xp, yb - 7)
    ctx.stroke()
  }

  /** A contextual prompt, and the ghost demonstration of a drag in the first plate. */
  function hints(T: number, alpha: number) {
    if (preview) return
    const pi = plateAt(T)
    const u = T - PLATES[pi].t
    const narrow = w < 560
    const prompts = [
      narrow ? 'DRAG A SQUARE · TAP TO REVEAL' : 'DRAG A SQUARE ACROSS · SLIDE A GROUND · TAP TO REVEAL',
      narrow ? 'DRAG A SQUARE · TAP TO REVEAL' : 'DRAG A SQUARE ACROSS · SLIDE A GROUND · TAP TO REVEAL',
      narrow ? 'DRAG THE BOUNDARY · TAP TO REVEAL' : 'DRAG THE BOUNDARY BETWEEN BLACK AND WHITE · TAP TO REVEAL',
      narrow ? 'DRAG TO TURN THE HUE · TAP: NEXT' : 'DRAG TO TURN THE HUE · TAP FOR THE NEXT HARMONY',
    ]
    if (!tiny) {
      const y = stacked ? Math.min(rulerY - (small ? 20 : 26), capY + capSize * 2.3 + 18) : rulerY - (small ? 20 : 26)
      // keep clear of the note under the plate
      setFont(ctx, { size: small ? 8 : 9, tracking: 0.14 })
      const hw = ctx.measureText(prompts[pi]).width
      setFont(ctx, { size: small ? 8.5 : 9.5, tracking: 0.16 })
      const noteRight = px + pw / 2 + 170
      const clash = Math.abs(y - noteY) < 13 && w - pad - hw < noteRight
      const room = !stacked || capY + capSize * 2.3 + 14 < rulerY - 24
      if (room && !clash) text(ctx, prompts[pi], w - pad, y, { size: small ? 8 : 9, color: k.muted, align: 'right', tracking: 0.14, alpha: alpha * (interacted ? 0.55 : 1) })
    }
    // the ghost: a dotted path from square A across to ground B, a dot travelling it
    if (interacted || pi !== 0 || clock > LOOP || u < 2.4 || u > 6.8) return
    const G = pairGeom()
    const g = clamp((u - 2.4) / 4.4)
    const a = smoothstep(0, 0.12, g) * (1 - smoothstep(0.85, 1, g))
    const x0 = G.c0[0]
    const y0 = G.c0[1] + G.is * 0.9
    const x1 = G.c1[0]
    const y1 = G.c1[1] + G.is * 0.9
    const e = ease.inOutSine(clamp((g - 0.1) / 0.75))
    ctx.save()
    ctx.globalAlpha = a
    // drawn over paper-colored strokes so it reads on the dark ground as well as the light one
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? rgba(C.ink, 0.7) : rgba(C.paper, 0.7)
      ctx.lineWidth = pass ? 1 : 3
      ctx.setLineDash(pass ? [1.5, 3.5] : [])
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + G.is * 0.8, x1, y1)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.lineWidth = 1
    const qx = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * ((x0 + x1) / 2) + e * e * x1
    const qy = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * (Math.max(y0, y1) + G.is * 0.8) + e * e * y1
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(qx, qy, 5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.arc(qx, qy, 3.5, 0, TAU)
    ctx.fill()
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? C.ink : rgba(C.paper, 0.8)
      ctx.lineWidth = pass ? 1 : 3
      ctx.beginPath()
      ctx.arc(qx, qy, 9, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  /* -------------------------------------------------------------- hit tests */
  function hitTest(x: number, y: number, touch: boolean): { kind: Drag['kind']; i: number } | null {
    const T = Tnow()
    const pi = plateAt(T)
    const u = T - PLATES[pi].t
    const slop = touch ? 14 : 4
    if (pi <= 1) {
      const G = pairGeom()
      const pos = squarePositions(u)
      for (let i = 0; i < 2; i++) {
        if (Math.abs(x - pos[i][0]) <= G.is / 2 + slop && Math.abs(y - pos[i][1]) <= G.is / 2 + slop) return { kind: 'square', i }
      }
      const { g } = revealAt(u)
      if (g < 0.5) {
        for (let i = 0; i < 2; i++) {
          const c = i === 0 ? G.c0 : G.c1
          if (Math.abs(x - c[0]) <= G.gs / 2 && Math.abs(y - c[1]) <= G.gs / 2) return { kind: 'ground', i }
        }
      }
      return null
    }
    if (pi === 2) {
      const B = bezGeom()
      if (x >= B.bx - slop && x <= B.bx + B.bw + slop && y >= B.by - 14 && y <= B.by + B.bh + 14) return { kind: 'divider', i: 0 }
      return null
    }
    const H = homageGeom()
    if (x >= H.x && x <= H.x + H.S && y >= H.y && y <= H.y + H.S) return { kind: 'hue', i: 0 }
    return null
  }

  function tap() {
    const T = Tnow()
    const pi = plateAt(T)
    const u = T - PLATES[pi].t
    const base = clock - u
    if (pi <= 1) {
      // reveal now, or put it back
      const { s } = revealAt(u)
      clock = s > 0.5 || (u > REV0 && u < REV1 + 2) ? base + REV1 : base + REV0
    } else if (pi === 2) {
      divU = -1
      clock = bezStripAt(u) > 0.5 ? base + 11.4 : base + 6.9
    } else {
      // the next harmony
      const i = Math.min(HARMONIES.length - 1, Math.floor(u / IV_STEP))
      clock = i === HARMONIES.length - 1 ? base + PLATES[3].dur - 0.01 : base + (i + 1) * IV_STEP - 1.6
    }
    env.sfx.tone(523.25, 0.25, { type: 'sine', gain: 0.03, room: 0.3 })
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
      // the clock holds while you hold something
      if (!drag) clock += dt
      const T = Tnow()
      const pi = plateAt(T)
      const P = PLATES[pi]
      const u = T - P.t
      // springs: offsets relax once released
      if (!drag || drag.kind !== 'square') {
        for (const o of sqOff) {
          o[0] *= 1 - damp(9, dt)
          o[1] *= 1 - damp(9, dt)
        }
      }
      if (!drag || drag.kind !== 'ground') {
        gOff[0] *= 1 - damp(8, dt)
        gOff[1] *= 1 - damp(8, dt)
      }
      if (divU >= 0 && !drag) {
        divHold += dt
        if (divHold > 6 || pi !== 2) divU = -1
      }
      if (pi !== 3 && !drag) hueOff *= 1 - damp(3, dt)
      if (prevT >= 0 && T < prevT - 1) {
        hueOff = 0
        divU = -1
      }

      // sound: the click when the squares meet, a breath at each harmony
      const crossed = (te: number) => dt > 0 && prevT >= 0 && prevT < te && te <= T
      for (const base of [0, 17]) {
        if (crossed(base + REV0 + 1.95)) {
          env.sfx.noise(0.05, { filter: 2400, q: 3, gain: 0.08, room: 0.2 })
          env.sfx.tone(base === 0 ? 659.25 : 587.33, 0.9, { type: 'sine', gain: 0.04, room: 0.4 })
        }
      }
      if (crossed(33 + 2.3)) env.sfx.noise(3, { filter: 900, to: 2600, q: 0.6, gain: 0.025, room: 0.4 })
      for (let i = 0; i < HARMONIES.length; i++) {
        if (crossed(48 + i * IV_STEP + 0.05)) [196, 246.94, 293.66].forEach((f, j) => env.sfx.tone(f * (1 + i * 0.06), 3.5, { type: 'sine', gain: 0.025, attack: 0.6, room: 0.6, when: j * 0.08 }))
      }

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, w, h)
      const alpha = smoothstep(0, 0.7, u) * (1 - smoothstep(P.dur - 0.7, P.dur, u))
      if (pi <= 1) drawPair(u, alpha, pi as 0 | 1)
      else if (pi === 2) drawBezold(u, alpha)
      else drawHomage(u, alpha)
      plateFrame(Math.max(0.25, alpha), P.num, P.name)
      note(T, alpha)
      readouts(T, alpha)
      captions(T)
      header()
      ruler(T)
      hints(T, alpha)
      if (!preview) {
        const cur = drag ? 'grabbing' : hoverRuler >= 0 ? 'pointer' : hover ? (hover.kind === 'divider' ? 'ew-resize' : 'grab') : 'pointer'
        env.setCursor(cur)
      }
      prevT = T
    },
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hover = null
        hoverRuler = -1
        if (drag) drag = null
        return
      }
      const onRuler = !drag && p.y > rulerY - 20 && p.y < h && p.x > pad - 6 && p.x < w - pad + 6 && !(tiny && w < 500)
      hoverRuler = onRuler ? PLATES.reduce((acc, pl, i) => (p.x >= lerp(pad, w - pad, pl.t / LOOP) ? i : acc), 0) : -1
      if (p.type === 'down') {
        if (onRuler) {
          interacted = true
          const T = Tnow()
          clock += PLATES[hoverRuler].t + 0.01 - T
          return
        }
        const hit = hitTest(p.x, p.y, touch)
        if (hit) {
          const T = Tnow()
          const pi = plateAt(T)
          const u = T - PLATES[pi].t
          let ox = 0
          let oy = 0
          if (hit.kind === 'square') {
            ox = sqOff[hit.i][0]
            oy = sqOff[hit.i][1]
          } else if (hit.kind === 'ground') ox = gOff[hit.i]
          else if (hit.kind === 'divider') ox = bezDivAt(u)
          else ox = hueOff
          drag = { kind: hit.kind, i: hit.i, sx: p.x, sy: p.y, ox, oy, moved: false }
        } else {
          drag = { kind: 'hue', i: -1, sx: p.x, sy: p.y, ox: hueOff, oy: 0, moved: false }
        }
        return
      }
      if (p.type === 'move') {
        if (drag && p.pressed) {
          const dx = p.x - drag.sx
          const dy = p.y - drag.sy
          if (Math.hypot(dx, dy) > 6) drag.moved = true
          if (!drag.moved) return
          interacted = true
          if (drag.kind === 'square') {
            sqOff[drag.i][0] = drag.ox + dx
            sqOff[drag.i][1] = drag.oy + dy
          } else if (drag.kind === 'ground') {
            const G = pairGeom()
            const along = G.horiz ? dx : dy
            gOff[drag.i] = clamp(drag.ox + along, -G.gs * 1.2, G.gs * 1.2)
          } else if (drag.kind === 'divider') {
            const B = bezGeom()
            divU = clamp((p.x - B.bx) / B.bw)
            divHold = 0
          } else if (drag.i === 0) hueOff = drag.ox + (dx / Math.max(200, pw)) * Math.PI
        } else {
          const hit = hitTest(p.x, p.y, touch)
          hover = hit ? { kind: hit.kind, i: hit.i } : null
        }
        return
      }
      if (p.type === 'up') {
        if (drag && !drag.moved) {
          interacted = true
          tap()
        }
        drag = null
        if (touch) hover = null
      }
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight' && code !== 'Space' && code !== 'Enter') return false
      if (!down) return true
      interacted = true
      const T = Tnow()
      const pi = plateAt(T)
      if (code === 'ArrowRight') clock += (pi === PLATES.length - 1 ? LOOP : PLATES[pi + 1].t) - T
      else if (code === 'ArrowLeft') {
        const target = T - PLATES[pi].t < 1.5 && pi > 0 ? PLATES[pi - 1].t : PLATES[pi].t
        clock += target - T
      } else tap()
      return true
    },
  }
}

export default create
