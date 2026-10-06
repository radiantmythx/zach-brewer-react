/*
 * S.07 — FOURTH DIMENSION
 *
 * Seeing a shape we cannot see. A point slides and leaves a line; the line
 * slides at right angles and leaves a square; the square, a cube; the cube,
 * slid in a fourth direction at right angles to the other three, leaves a
 * tesseract: 16 vertices, 32 edges, 24 squares, 8 cubes. We can only draw its
 * shadow, so it is rotated in 4D (the XW and YW planes) and projected with
 * perspective from 4D to 3D and then from 3D to the page — and the inner
 * cube turns itself inside out through the outer one.
 *
 * Then Flatland, after Abbott: a sphere passing through a plane is, to the
 * plane, a circle that grows and shrinks; a cube passing corner-first is a
 * triangle that becomes a hexagon. In the same way a hypersphere passing
 * through our space would be a sphere that grows and shrinks, and a
 * tesseract passing corner-first is a tetrahedron that becomes an
 * octahedron. Every slice is computed exactly from the 24 square faces.
 * Last, the tesseract unfolds — eight cubes hinged about their shared
 * squares, rotated in 4D into our space — into the cross Dalí painted in
 * 1954, then folds up and collapses back to a point.
 *
 * Four chapters over 88 s, a pure function of time (?at= seeks, ← → step).
 * Drag rotates in 3D; with the 4D toggle (or Shift) it rotates in XW and YW.
 * A tap steps to the next beat; the clock waits while you turn it.
 */

import { ACCENTS, C, TAU, clamp, damp, ease, ground, lerp, mod, rgba, setFont, smoothstep, text } from '../kit'
import type { CreatePiece, PieceInstance, PointerInfo } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 24px "Instrument Serif"'), document.fonts.load('italic 400 24px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.07'
const LOOP = 88
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Dimensions' },
  { t: 20, num: 'II', name: 'Shadow' },
  { t: 42, num: 'III', name: 'Slices' },
  { t: 66, num: 'IV', name: 'Unfolding' },
]
const CAPTIONS = [
  { t0: 0.9, t1: 9.6, text: 'Slide a point and it becomes *a line.*' },
  { t0: 14.9, t1: 19.7, text: 'Four directions *at right angles.*' },
  { t0: 22.4, t1: 36, text: 'We only ever see *its shadow.*' },
  { t0: 44.2, t1: 61, text: 'We meet it *one slice at a time.*' },
  { t0: 74.6, t1: 82.2, text: 'Unfolded, it is *eight cubes.*' },
]
/** the slides that build each dimension: [slide start, slide end, recenter start, recenter end] */
const SLIDES = [
  [1.3, 3.5, 2.7, 4.3],
  [4.5, 6.7, 5.9, 7.5],
  [7.8, 10.0, 9.2, 10.8],
  [11.4, 14.0, 12.9, 14.6],
]
/** the collapse back to a point, per axis */
const COLLAPSE = [
  [86.6, 87.9],
  [86.0, 87.4],
  [85.2, 86.8],
  [84.0, 85.8],
]
const ROT0 = 20.6
const ROT1 = 41.2
const SL_A0 = 43.2
const SL_A1 = 50.6
const SL_B0 = 51.4
const SL_B1 = 63.4
const L4 = 3
const D3 = 7
const DIM_NAMES = ['A point', 'A line', 'A square', 'A cube', 'A tesseract']
const SCALE = [146.83, 220.0, 293.66, 369.99, 440.0]
const AXIS = ['X', 'Y', 'Z', 'W']

/* ------------------------------------------------------------ the tesseract */

// vertex i has coordinate +1 on axis k when bit k is set (and −1 otherwise; w is mirrored, see pos4)
const NV = 16
const EDGES: [number, number, number][] = []
for (let i = 0; i < NV; i++) for (let k = 0; k < 4; k++) if (!(i & (1 << k))) EDGES.push([i, i | (1 << k), k])
/** the 24 squares, as 4 vertex indices in cyclic order */
const SQUARES: number[][] = []
for (let a = 0; a < 4; a++)
  for (let b = a + 1; b < 4; b++) {
    const others = [0, 1, 2, 3].filter((k) => k !== a && k !== b)
    for (let m = 0; m < 4; m++) {
      const base = (m & 1 ? 1 << others[0] : 0) | (m & 2 ? 1 << others[1] : 0)
      SQUARES.push([base, base | (1 << a), base | (1 << a) | (1 << b), base | (1 << b)])
    }
  }
/** the 8 cubes: one axis fixed at one end */
const CELLS = Array.from({ length: 8 }, (_, c) => {
  const axis = c >> 1
  const bit = c & 1
  const inCell = (v: number) => ((v >> axis) & 1) === bit
  return {
    axis,
    bit,
    edges: EDGES.map((e, i) => (inCell(e[0]) && inCell(e[1]) ? i : -1)).filter((i) => i >= 0),
    squares: SQUARES.map((q, i) => (q.every(inCell) ? i : -1)).filter((i) => i >= 0),
  }
})

type V4 = [number, number, number, number]
type V3 = [number, number, number]

/** Canonical coordinates: x, y, z = ±1 by bit; w = +1 for bit 0 (the outer cube), −1 for bit 1. */
const canon = (v: number): V4 => [v & 1 ? 1 : -1, v & 2 ? 1 : -1, v & 4 ? 1 : -1, v & 8 ? -1 : 1]

function rotPlane(p: V4, a: number, b: number, t: number) {
  if (!t) return
  const c = Math.cos(t)
  const s = Math.sin(t)
  const pa = p[a]
  const pb = p[b]
  p[a] = pa * c - pb * s
  p[b] = pa * s + pb * c
}

interface Word {
  w: string
  em: boolean
}
function parseWords(s: string): Word[] {
  const out: Word[] = []
  let em = false
  for (const part of s.split('*')) {
    for (const w of part.split(' ')) if (w) out.push({ w, em })
    em = !em
  }
  return out
}

/* The net: hinge each outer cell about its square shared with the central cell (w = −1). */
const CENTRAL = 7 // axis 3, bit 1 → w = −1
const OPPOSITE = 6 // w = +1
const CARRIER = 2 // axis 1, bit 0 → y = −1: carries the w = +1 cell below it

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  /* ------------------------------------------------------------ layout */

  let w = 1
  let h = 1
  let pad = 20
  let portrait = false
  let stacked = false
  let short = false
  let tiny = false
  let capSize = 30
  let capX = 0
  let capW = 300
  let capBottom = 0
  let capBlockTop = 0
  let rulerY = 0
  let lab = 9.5
  // the drawing area
  let ax0 = 0
  let ay0 = 0
  let aw = 1
  let ah = 1
  let cx = 0
  let cy = 0
  let S = 100

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.25
    stacked = portrait || w < h * 1.45
    short = h < 440
    tiny = h < 260 || w < 380
    pad = clamp(Math.min(w, h) * 0.05, preview || tiny ? 11 : 14, 38)
    lab = tiny || preview ? 8 : short ? 8.5 : 9.5
    rulerY = h - pad * 0.55
    const rulerRoom = preview || tiny ? 4 : 16
    capSize = portrait ? clamp(w * 0.075, 18, 40) : clamp(Math.min(w * 0.04, h * 0.068), tiny ? 13 : 15, 50)
    capX = pad * (stacked ? 1 : 1.3)
    capW = stacked ? w - pad * 2 : clamp(w * 0.34, 160, 560)
    capBottom = h - pad - rulerRoom
    if (stacked) {
      ax0 = pad
      ay0 = pad + (tiny ? 18 : 28)
      aw = w - pad * 2
      capBlockTop = capBottom - capSize * (w < 520 ? 3.2 : 2.3) - 14
      ah = capBlockTop - (preview ? 8 : 34) - ay0
    } else {
      ax0 = Math.max(capX + capW * 0.9, w * 0.34)
      ay0 = pad + (tiny ? 14 : 24)
      aw = w - pad - ax0
      ah = h - ay0 - pad - rulerRoom - 4
      // short frames: the drawing stops above the 3D / 4D switch
      if (short) ah -= 30
    }
    cx = ax0 + aw / 2
    cy = ay0 + ah / 2
    S = preview || tiny ? Math.min(aw / 4.2, ah / 4.3) : Math.min(aw / 4.6, ah / 5)
  }
  layout()

  /* ------------------------------------------------------------ clock + input */

  const at = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(at) ? at : preview ? 24 : 0
  let wall = 0
  let rate = 1
  let prevT = -1
  let curT = 0
  let holdUntil = -1
  let touched = false
  let dragging = false
  let mode4 = env.params.get('drag') === '4d'
  let shift = false
  let downWall = 0
  let lastX = 0
  let lastY = 0
  let moved = 0
  let touch = false
  let pointerIn = false
  let scrubbing = false
  let hoverRuler = -1
  let hoverPill = false
  // the viewer's turns: 3D (yaw, pitch) and 4D (XW, YW)
  let uYaw = 0
  let uPitch = 0
  let uXW = 0
  let uYW = 0

  const onRuler = (x: number, y: number) => !preview && !tiny && y > rulerY - 18 && y < h && x > pad - 8 && x < w - pad + 8
  function seekTo(x: number) {
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.5) target = c.t
    clock = Math.min(LOOP - 0.05, target)
  }
  function chapterAt(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }
  function step(dir: number) {
    const T = curT
    if (dir > 0) {
      const next = CHAPTERS.find((c) => c.t > T + 0.01)
      clock += (next ? next.t : LOOP) - T
    } else {
      const i = chapterAt(T)
      const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
      clock += target - T
    }
    holdUntil = -1
  }
  /** the in-canvas toggle: which rotation a drag makes */
  function pill() {
    const ph = tiny ? 18 : 20
    const pw = tiny ? 84 : 112
    const x = w - pad - pw
    // stacked frames: at the right, just above the caption's block
    const y = stacked ? capBlockTop - ph - 6 : (preview || tiny ? h - pad : rulerY - 14) - ph - 6
    return { x, y, w: pw, h: ph }
  }
  const inPill = (x: number, y: number) => {
    const p = pill()
    const m = touch ? 10 : 4
    return x > p.x - m && x < p.x + p.w + m && y > p.y - m && y < p.y + p.h + m
  }

  /* ------------------------------------------------------------ projection */

  // 3D view
  let vYaw = 0
  let vPitch = 0
  let vcx = 0
  let vcy = 0
  let vS = 100
  const P2 = new Float64Array(3)
  /** 3D → screen with the current view; writes x, y, depth into P2 */
  function view(x: number, y: number, z: number) {
    const cyw = Math.cos(vYaw)
    const syw = Math.sin(vYaw)
    const cp = Math.cos(vPitch)
    const sp = Math.sin(vPitch)
    const x1 = x * cyw + z * syw
    const z1 = -x * syw + z * cyw
    const y1 = y * cp - z1 * sp
    const z2 = y * sp + z1 * cp
    const f = D3 / (D3 + z2)
    P2[0] = vcx + vS * x1 * f
    P2[1] = vcy - vS * y1 * f
    P2[2] = z2
  }
  /** 4D → 3D: perspective from a camera on the w axis; the cube at w = wRef keeps its size */
  function to3(p: V4, wRef: number, out: V3, L = L4) {
    const k = (L - wRef) / (L - p[3])
    out[0] = p[0] * k
    out[1] = p[1] * k
    out[2] = p[2] * k
    return k
  }

  /* ------------------------------------------------------------ the build */

  function slide(T: number, k: number) {
    const [s0, s1, r0, r1] = SLIDES[k]
    const [c0, c1] = COLLAPSE[k]
    let sg = ease.inOutCubic(clamp((T - s0) / (s1 - s0)))
    let rc = ease.inOutCubic(clamp((T - r0) / (r1 - r0)))
    if (T >= c0) {
      const u = 1 - ease.inOutCubic(clamp((T - c0) / (c1 - c0)))
      sg = u
      rc = u
    }
    return [sg, rc]
  }
  const SIG = new Float64Array(4)
  const RHO = new Float64Array(4)
  /** Vertex positions in 4D at time T (the build / collapse), before rotation. */
  function pos4(v: number, out: V4) {
    for (let k = 0; k < 3; k++) out[k] = (v & (1 << k) ? 2 * SIG[k] : 0) - RHO[k]
    out[3] = RHO[3] - (v & 8 ? 2 * SIG[3] : 0)
  }
  const vVis = (v: number) => {
    for (let k = 0; k < 4; k++) if (v & (1 << k) && SIG[k] <= 0) return false
    return true
  }

  /* ------------------------------------------------------------ rotation in 4D */

  function rot4Script(T: number) {
    if (T < ROT0 || T > ROT1 + 0.5) return [0, 0]
    const u = clamp((T - ROT0) / (ROT1 - ROT0))
    // smooth start and stop, near-constant speed between: XW two turns, YW one
    const s = u - Math.sin(TAU * u) / TAU
    return [TAU * 2 * s, TAU * s]
  }

  const X4: V4[] = Array.from({ length: NV }, () => [0, 0, 0, 0] as V4)
  const X3: V3[] = Array.from({ length: NV }, () => [0, 0, 0] as V3)
  const SX = new Float64Array(NV)
  const SY = new Float64Array(NV)
  const SZ = new Float64Array(NV)
  const SK = new Float64Array(NV)

  /* ------------------------------------------------------------ drawing helpers */

  const k = { ink: C.ink, ink2: C.ink2, muted: C.muted, rule: C.rule }

  function wrap(words: Word[], size: number, maxW: number) {
    const lines: Word[][] = [[]]
    const width = (ws: Word[]) => {
      let t = 0
      for (const wd of ws) {
        setFont(ctx, { font: 'serif', size, italic: wd.em })
        t += ctx.measureText(wd.w + ' ').width
      }
      return t
    }
    const emStart = words.findIndex((wd) => wd.em)
    const emW = emStart >= 0 ? width(words.slice(emStart)) : 0
    let x = 0
    words.forEach((wd, i) => {
      setFont(ctx, { font: 'serif', size, italic: wd.em })
      const ww = ctx.measureText(wd.w).width
      const sp = ctx.measureText(' ').width
      const breakEm = i === emStart && emW <= maxW && x + emW - sp > maxW
      if (x > 0 && (x + ww > maxW || breakEm)) {
        lines.push([])
        x = 0
      }
      lines[lines.length - 1].push(wd)
      x += ww + sp
    })
    return lines
  }
  function captionLines(cap: { text: string }) {
    let size = capSize
    let lines: Word[][] = []
    const maxLines = stacked && w < 520 ? 3 : 2
    for (let iter = 0; iter < 8; iter++) {
      lines = wrap(parseWords(cap.text), size, capW)
      if (lines.length <= maxLines) break
      size *= 0.9
    }
    return { lines, size }
  }
  function caption(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const { lines, size } = captionLines(cap)
      const lineH = size * 1.06
      const top = capBottom - lines.length * lineH
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = top + (li + 1) * lineH - size * 0.2
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - size * 1.02, w, size * 1.32)
        ctx.clip()
        const dy = (1 - pr) * size * 1.15 - pe * size * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        let x = capX
        for (const wd of ln) {
          text(ctx, wd.w, x, y + dy, { font: 'serif', size, italic: wd.em, color: wd.em ? C.moss : k.ink })
          setFont(ctx, { font: 'serif', size, italic: wd.em })
          x += ctx.measureText(wd.w + ' ').width
        }
        ctx.restore()
      })
    }
  }
  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    setFont(ctx, o)
    ctx.save()
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.9)
    ctx.globalAlpha *= o?.alpha ?? 1
    ctx.strokeText(o?.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }
  function arrow(x0: number, y0: number, x1: number, y1: number, head = 5) {
    const a = Math.atan2(y1 - y0, x1 - x0)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.moveTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head)
    ctx.stroke()
  }
  function hatchPoly(pts: number[], gap: number, angle: number, color: string, alpha: number) {
    if (pts.length < 6) return
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
    ctx.closePath()
    ctx.clip()
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i])
      x1 = Math.max(x1, pts[i])
      y0 = Math.min(y0, pts[i + 1])
      y1 = Math.max(y1, pts[i + 1])
    }
    const ccx = (x0 + x1) / 2
    const ccy = (y0 + y1) / 2
    const R = Math.hypot(x1 - x0, y1 - y0) / 2 + gap
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let d = -R; d <= R; d += gap) {
      const px = ccx - sa * d
      const py = ccy + ca * d
      ctx.moveTo(px - ca * R, py - sa * R)
      ctx.lineTo(px + ca * R, py + sa * R)
    }
    ctx.stroke()
    ctx.restore()
  }

  /* ------------------------------------------------------------ chapters I, II: the figure */

  function edgeColor(T: number, axis: number) {
    // I: the slide that made an edge colors it for a moment; at "four directions" all four show
    const four = smoothstep(14.6, 15.4, T) * (1 - smoothstep(19.4, 20.6, T))
    const [s0, s1] = SLIDES[axis]
    const fresh = smoothstep(s0, s0 + 0.3, T) * (1 - smoothstep(s1 + 0.8, s1 + 2.2, T))
    let a = Math.max(four, fresh)
    // II and after: the fourth direction keeps its color
    if (axis === 3 && T > 19.4) a = Math.max(a, 0.85 * smoothstep(19.4, 20.6, T))
    return a
  }

  /** Project all 16 vertices at time T; returns the 4D perspective factor range. */
  function projectFigure(T: number) {
    for (let k2 = 0; k2 < 4; k2++) {
      const [sg, rc] = slide(T, k2)
      SIG[k2] = sg
      RHO[k2] = rc
    }
    const [sxw, syw] = rot4Script(T)
    const wRef = RHO[3]
    for (let v = 0; v < NV; v++) {
      const p = X4[v]
      pos4(v, p)
      rotPlane(p, 0, 3, sxw + uXW)
      rotPlane(p, 1, 3, syw + uYW)
      SK[v] = to3(p, wRef, X3[v])
      view(X3[v][0], X3[v][1], X3[v][2])
      SX[v] = P2[0]
      SY[v] = P2[1]
      SZ[v] = P2[2]
    }
  }

  function drawFigure(T: number, alpha: number) {
    if (alpha <= 0.01) return
    ctx.save()
    ctx.globalAlpha = alpha
    // swept area of the slide being made (a hatch), so the slide reads as making something
    for (let a = 0; a < 3; a++) {
      const [s0, s1] = SLIDES[a]
      const on = smoothstep(s0, s0 + 0.4, T) * (1 - smoothstep(s1 + 0.2, s1 + 1.6, T))
      if (on <= 0.01 || a === 0) continue
      // the squares that contain an edge along this axis and only built axes
      for (const q of SQUARES) {
        let ok = true
        for (const v of q) if (!vVis(v)) ok = false
        if (!ok) continue
        const axes = new Set<number>()
        for (let i = 0; i < 4; i++) {
          const d = q[i] ^ q[(i + 1) % 4]
          axes.add(Math.log2(d))
        }
        if (!axes.has(a) || axes.has(3)) continue
        // this square must not use axes beyond a
        let beyond = false
        for (const ax of axes) if (ax > a) beyond = true
        if (beyond) continue
        const pts = q.flatMap((v) => [SX[v], SY[v]])
        hatchPoly(pts, a === 1 ? 5 : 6, a === 1 ? -Math.PI / 4 : Math.PI / 4, ACCENTS[a], on * (a === 1 ? 0.35 : 0.22))
      }
    }
    // edges, far to near
    const order = EDGES.map((_, i) => i)
    const depth = (i: number) => (SZ[EDGES[i][0]] + SZ[EDGES[i][1]]) / 2
    order.sort((a, b) => depth(b) - depth(a))
    let zmin = Infinity
    let zmax = -Infinity
    for (let v = 0; v < NV; v++) {
      zmin = Math.min(zmin, SZ[v])
      zmax = Math.max(zmax, SZ[v])
    }
    for (const i of order) {
      const [a, b, axis] = EDGES[i]
      if (!vVis(a) || !vVis(b)) continue
      if (SIG[axis] <= 0) continue
      const near = zmax > zmin + 1e-6 ? 1 - (depth(i) - zmin) / (zmax - zmin) : 1
      const kk = (SK[a] + SK[b]) / 2
      const ca = edgeColor(T, axis)
      const col = ca > 0.02 ? ACCENTS[axis] : k.ink
      ctx.globalAlpha = alpha * (0.3 + 0.7 * near) * clamp(0.55 + 0.45 * kk)
      ctx.strokeStyle = ca > 0.02 ? rgba(col, 0.25 + 0.75 * ca) : k.ink
      ctx.lineWidth = ca > 0.5 ? 1.3 : 1
      ctx.beginPath()
      ctx.moveTo(SX[a], SY[a])
      ctx.lineTo(SX[b], SY[b])
      ctx.stroke()
      if (ca > 0.02 && ca < 1) {
        ctx.globalAlpha = alpha * (0.3 + 0.7 * near) * (1 - ca) * clamp(0.55 + 0.45 * kk)
        ctx.strokeStyle = k.ink
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
    // vertices
    ctx.fillStyle = k.ink
    for (let v = 0; v < NV; v++) {
      if (!vVis(v)) continue
      const near = zmax > zmin + 1e-6 ? 1 - (SZ[v] - zmin) / (zmax - zmin) : 1
      ctx.globalAlpha = alpha * (0.35 + 0.65 * near)
      ctx.beginPath()
      ctx.arc(SX[v], SY[v], (1.3 + near * 1.1) * clamp(SK[v], 0.6, 1.4), 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  /** The point at the very start: a dot and a ring that breathes. */
  function drawPoint(T: number) {
    const a = smoothstep(0.1, 0.8, T) * (1 - smoothstep(1.3, 1.6, T)) + (T > 87.6 ? smoothstep(87.6, 88, T) : 0)
    if (a <= 0.01) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    const r = 9 + Math.sin(T * 3) * 1.5
    ctx.beginPath()
    ctx.arc(vcx, vcy, r, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  /** The step's name and the f-vector, under / beside the figure. */
  function stepLabel(T: number) {
    if (T > 21 && T < 86) return
    let d = 0
    for (let a = 0; a < 4; a++) if (SIG[a] > 0.5) d = a + 1
    // mid-slide, name the step being taken
    let sliding = -1
    for (let a = 0; a < 4; a++) if (SIG[a] > 0.02 && SIG[a] < 0.98) sliding = a
    const back = T > 80
    const lbl = sliding >= 0 ? (back ? `${sliding + 1}D → ${sliding}D · folding back` : `${sliding}D → ${sliding + 1}D · sliding along ${AXIS[sliding]}`) : `${d}D · ${DIM_NAMES[d]}`
    // under the figure
    let ymax = vcy + 14
    for (let v = 0; v < NV; v++) if (vVis(v)) ymax = Math.max(ymax, SY[v])
    const y = Math.min(ay0 + ah - 2, ymax + 26)
    const a = T < 20 ? 1 - smoothstep(19.4, 20.4, T) : smoothstep(86, 86.6, T)
    halo(lbl, vcx, y, { size: lab + 0.5, color: k.ink, align: 'center', tracking: 0.16, upper: true, alpha: a })
  }

  /** V, E, F, C for 0D … 4D: a small table that fills in as each dimension is made. */
  function fvector(T: number) {
    if (preview || tiny || short || T > 21.5) return
    const rows = [
      [1, 0, 0, 0],
      [2, 1, 0, 0],
      [4, 4, 1, 0],
      [8, 12, 6, 1],
      [16, 32, 24, 8],
    ]
    const fade = 1 - smoothstep(20.2, 21.4, T)
    const fs = 9.5
    const cw = 38
    const rh = 17
    let x0 = capX
    let y0 = pad + 52
    if (stacked) {
      // under the figure, at the left of the drawing
      x0 = ax0
      y0 = ay0 + ah - rh * 6 - 12
    }
    ctx.save()
    ctx.globalAlpha = fade
    const heads = ['', 'V', 'E', 'F', 'C']
    heads.forEach((hh, i) => text(ctx, hh, x0 + 26 + (i - 1) * cw + cw - 6, y0, { size: fs - 1, color: k.muted, align: 'right', tracking: 0.14 }))
    ctx.strokeStyle = k.rule
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0, y0 + 6.5)
    ctx.lineTo(x0 + 26 + cw * 4, y0 + 6.5)
    ctx.stroke()
    for (let d = 0; d <= 4; d++) {
      const made = d === 0 ? smoothstep(0.2, 0.8, T) : smoothstep(SLIDES[d - 1][1] - 0.3, SLIDES[d - 1][1] + 0.4, T)
      if (made <= 0.01) continue
      const y = y0 + 6 + (d + 1) * rh
      ctx.globalAlpha = fade * made
      text(ctx, `${d}D`, x0, y, { size: fs, color: k.muted, tracking: 0.1 })
      rows[d].forEach((n, i) => {
        if (n === 0 && i > d) return
        const isNew = d > 0 && i === 1
        text(ctx, String(n), x0 + 26 + i * cw + cw - 6, y, { size: fs + 0.5, color: isNew && d > 0 ? ACCENTS[d - 1] : k.ink, align: 'right', tracking: 0.04 })
      })
    }
    ctx.globalAlpha = fade * smoothstep(14, 15, T)
    text(ctx, 'Eₙ = 2Eₙ₋₁ + Vₙ₋₁', x0, y0 + 6 + 6 * rh + 4, { size: fs, color: k.ink2, tracking: 0.06 })
    ctx.restore()
  }

  /** Four arrows: x, y, z and a fourth, drawn dashed — at right angles to all three. */
  function gizmo(T: number) {
    const a = smoothstep(14.4, 15.4, T) * (1 - smoothstep(35, 37, T))
    if (a <= 0.01 || preview || tiny) return
    const gx = stacked ? ax0 + aw - 112 : ax0 + 22
    const gy = stacked ? ay0 + ah - 16 : ay0 + ah - 26
    const L = 30
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    const dirs: [number, number][] = [
      [1, 0],
      [0, -1],
      [-0.62, 0.5],
      [0.55, -0.62],
    ]
    dirs.forEach(([dx, dy], i) => {
      ctx.strokeStyle = ACCENTS[i]
      if (i === 3) ctx.setLineDash([2, 2.5])
      arrow(gx, gy, gx + dx * L * (i === 2 ? 0.8 : 1), gy + dy * L * (i === 2 ? 0.8 : 1), 4.5)
      ctx.setLineDash([])
      text(ctx, AXIS[i], gx + dx * (L + 9) * (i === 2 ? 0.8 : 1), gy + dy * (L + 9) * (i === 2 ? 0.8 : 1) + 3, { size: 9, color: ACCENTS[i], align: 'center', tracking: 0.06 })
    })
    // right-angle ticks where w leaves the corner
    text(ctx, 'W ⟂ X, Y, Z', gx + L + 22, gy - L * 0.62 - 6, { size: 8.5, color: k.muted, tracking: 0.14 })
    ctx.restore()
  }

  /** II: the rotation, numerically: the 4×4 matrix of the current turn. */
  function matrix(T: number) {
    const a = smoothstep(ROT0 + 0.5, ROT0 + 2, T) * (1 - smoothstep(ROT1 - 0.5, ROT1 + 1, T))
    if (a <= 0.01 || preview || short || tiny) return
    const [sxw, syw] = rot4Script(T)
    const M: number[][] = [0, 1, 2, 3].map((j) => {
      const e: V4 = [0, 0, 0, 0]
      e[j] = 1
      rotPlane(e, 0, 3, sxw + uXW)
      rotPlane(e, 1, 3, syw + uYW)
      return e
    })
    const fs = 9.5
    const cw = 50
    const rh = 16
    const x0 = stacked ? w - pad - cw * 4 - 8 : capX
    const y0 = stacked ? pad + 44 : pad + 60
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    // brackets
    const bh = rh * 4 + 4
    ctx.beginPath()
    ctx.moveTo(x0 + 4, y0 - 12)
    ctx.lineTo(x0, y0 - 12)
    ctx.lineTo(x0, y0 - 12 + bh)
    ctx.lineTo(x0 + 4, y0 - 12 + bh)
    ctx.moveTo(x0 + cw * 4 + 4, y0 - 12)
    ctx.lineTo(x0 + cw * 4 + 8, y0 - 12)
    ctx.lineTo(x0 + cw * 4 + 8, y0 - 12 + bh)
    ctx.lineTo(x0 + cw * 4 + 4, y0 - 12 + bh)
    ctx.stroke()
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const v = M[c][r]
        const s = (v < 0 ? '−' : ' ') + Math.abs(v).toFixed(2)
        text(ctx, s, x0 + 6 + c * cw + cw - 10, y0 + r * rh, { size: fs, color: r === 3 || c === 3 ? C.fern : k.ink, align: 'right', tracking: 0.02 })
      }
    text(ctx, 'R = R(YW) · R(XW)', x0, y0 - 22, { size: 8.5, color: k.muted, tracking: 0.14, upper: true })
    ctx.restore()
  }

  /** II: name the two cubes before they trade places. */
  function cubeLabels(T: number) {
    const a = smoothstep(19.8, 20.8, T) * (1 - smoothstep(23.4, 24.6, T))
    if (a <= 0.01 || preview) return
    // outer: vertex 0 (w = +1) · inner: vertex 8 (w = −1)
    const lbl = (v: number, s: string, dx: number) => {
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = k.ink2
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(SX[v] - 3 * Math.sign(dx), SY[v] + 3)
      ctx.lineTo(SX[v] + dx, SY[v] + 18)
      ctx.stroke()
      ctx.restore()
      halo(s, SX[v] + dx + (dx < 0 ? -4 : 4), SY[v] + 22, { size: lab, color: k.ink, align: dx < 0 ? 'right' : 'left', tracking: 0.14, alpha: a })
    }
    lbl(0, 'OUTER CUBE · W = +1', -24)
    lbl(8, 'INNER CUBE · W = −1', 24)
  }

  /* ------------------------------------------------------------ chapter III: slices */

  const SQ3 = Math.sqrt(3)
  // corner-first: cube along (1,1,1)/√3, tesseract along (1,1,1,1)/2
  const nC: V3 = [1 / SQ3, 1 / SQ3, 1 / SQ3]
  const e1C: V3 = [1 / Math.SQRT2, -1 / Math.SQRT2, 0]
  const e2C: V3 = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)]
  const nT: V4 = [0.5, 0.5, 0.5, 0.5]
  const bT: V4[] = [
    [1 / Math.SQRT2, -1 / Math.SQRT2, 0, 0],
    [0, 0, 1 / Math.SQRT2, -1 / Math.SQRT2],
    [0.5, 0.5, -0.5, -0.5],
  ]
  const PR = (() => {
    // rotation: 0.55 rad about x, then 0.42 rad about z
    const a = 0.55
    const b = 0.42
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const cb = Math.cos(b)
    const sb = Math.sin(b)
    return [cb, -sb * ca, sb * sa, sb, cb * ca, -cb * sa, 0, sa, ca]
  })()
  const CUBE_V: V3[] = Array.from({ length: 8 }, (_, v) => [v & 1 ? 1 : -1, v & 2 ? 1 : -1, v & 4 ? 1 : -1])
  const CUBE_E: [number, number][] = []
  for (let v = 0; v < 8; v++) for (let a = 0; a < 3; a++) if (!(v & (1 << a))) CUBE_E.push([v, v | (1 << a)])

  interface Panel {
    x: number
    y: number
    w: number
    h: number
    cx: number
    cy: number
    S: number
  }
  function panels(): [Panel, Panel] {
    const side = aw > ah * 1.15
    const gap = side ? 18 : 12
    const pw = side ? (aw - gap) / 2 : aw
    const ph = side ? ah : (ah - gap) / 2
    const mk = (x: number, y: number): Panel => ({ x, y, w: pw, h: ph, cx: x + pw / 2, cy: y + ph / 2 + (tiny ? 4 : 8), S: Math.min(pw / 4.4, (ph - 44) / 4.9) })
    return side ? [mk(ax0, ay0), mk(ax0 + pw + gap, ay0)] : [mk(ax0, ay0), mk(ax0, ay0 + ph + gap)]
  }
  function setView(p: Panel, yaw: number, pitch: number, scale = 1) {
    vYaw = yaw
    vPitch = pitch
    vcx = p.cx
    vcy = p.cy
    vS = p.S * scale
  }
  function panelFrame(p: Panel, title: string, a: number) {
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.rule
    ctx.lineWidth = 1
    // corner marks only: a sheet, not a box
    const m = 8
    ctx.beginPath()
    ctx.moveTo(p.x, p.y + m)
    ctx.lineTo(p.x, p.y)
    ctx.lineTo(p.x + m, p.y)
    ctx.moveTo(p.x + p.w - m, p.y)
    ctx.lineTo(p.x + p.w, p.y)
    ctx.lineTo(p.x + p.w, p.y + m)
    ctx.moveTo(p.x, p.y + p.h - m)
    ctx.lineTo(p.x, p.y + p.h)
    ctx.lineTo(p.x + m, p.y + p.h)
    ctx.moveTo(p.x + p.w - m, p.y + p.h)
    ctx.lineTo(p.x + p.w, p.y + p.h)
    ctx.lineTo(p.x + p.w, p.y + p.h - m)
    ctx.stroke()
    text(ctx, title, p.x + 10, p.y + 16, { size: lab, color: k.ink2, tracking: 0.16, upper: true })
    ctx.restore()
  }

  /** Split a 3D segment at the plane y = 0 and stroke the part on one side. */
  function segSide(a: V3, b: V3, above: boolean) {
    let t0 = 0
    let t1 = 1
    const ya = a[1]
    const yb = b[1]
    if (above) {
      if (ya <= 0 && yb <= 0) return
      if (ya < 0) t0 = ya / (ya - yb)
      if (yb < 0) t1 = ya / (ya - yb)
    } else {
      if (ya >= 0 && yb >= 0) return
      if (ya > 0) t0 = ya / (ya - yb)
      if (yb > 0) t1 = ya / (ya - yb)
    }
    view(lerp(a[0], b[0], t0), lerp(a[1], b[1], t0), lerp(a[2], b[2], t0))
    ctx.moveTo(P2[0], P2[1])
    view(lerp(a[0], b[0], t1), lerp(a[1], b[1], t1), lerp(a[2], b[2], t1))
    ctx.lineTo(P2[0], P2[1])
  }

  const sphereSegs: [V3, V3][] = []
  function sphereWire(cy3: number, r: number, out: [V3, V3][]) {
    out.length = 0
    const NLAT = 7
    const NSEG = 28
    for (let j = 1; j < NLAT; j++) {
      const phi = -Math.PI / 2 + (j / NLAT) * Math.PI
      const y = cy3 + Math.sin(phi) * r
      const rr = Math.cos(phi) * r
      for (let s = 0; s < NSEG; s++) {
        const a0 = (s / NSEG) * TAU
        const a1 = ((s + 1) / NSEG) * TAU
        out.push([
          [Math.cos(a0) * rr, y, Math.sin(a0) * rr],
          [Math.cos(a1) * rr, y, Math.sin(a1) * rr],
        ])
      }
    }
    for (let m = 0; m < 6; m++) {
      const th = (m / 6) * Math.PI
      for (let s = 0; s < NSEG; s++) {
        const p0 = (s / NSEG) * TAU
        const p1 = ((s + 1) / NSEG) * TAU
        out.push([
          [Math.cos(p0) * Math.cos(th) * r, cy3 + Math.sin(p0) * r, Math.cos(p0) * Math.sin(th) * r],
          [Math.cos(p1) * Math.cos(th) * r, cy3 + Math.sin(p1) * r, Math.cos(p1) * Math.sin(th) * r],
        ])
      }
    }
    return out
  }

  /** III, left: Flatland — a plane, and a sphere or cube passing down through it. */
  function flatland(p: Panel, T: number, a: number) {
    const phaseA = T < (SL_A1 + SL_B0) / 2
    const yaw = -0.62 + uYaw
    const pitch = -0.5 + uPitch * 0.6
    setView(p, yaw, pitch)
    const half = 1.6
    // what passes through, in display coordinates (y up; the plane is y = 0)
    const segs: [V3, V3][] = []
    let section: number[] = []
    let label = ''
    if (phaseA) {
      const u = clamp((T - SL_A0) / (SL_A1 - SL_A0))
      const yc = lerp(1.5, -1.5, ease.inOutSine(u))
      sphereWire(yc, 1, sphereSegs)
      for (const s of sphereSegs) segs.push(s)
      if (Math.abs(yc) < 1) {
        const r = Math.sqrt(1 - yc * yc)
        for (let j = 0; j <= 48; j++) {
          const t = (j / 48) * TAU
          view(Math.cos(t) * r, 0, Math.sin(t) * r)
          section.push(P2[0], P2[1])
        }
        label = `CIRCLE · r = ${r.toFixed(2)}`
      } else label = yc > 0 ? 'NOTHING YET' : 'GONE'
    } else {
      const u = clamp((T - SL_B0) / (SL_B1 - SL_B0))
      // a cube of edge 1.56, so its long diagonal (2.7) passes within the panel
      const CS = 0.78
      const hh = lerp(-SQ3 * CS - 0.08, SQ3 * CS + 0.08, ease.inOutSine(u))
      const P3: V3[] = CUBE_V.map((v) => [CS * (v[0] * e1C[0] + v[1] * e1C[1] + v[2] * e1C[2]), CS * (v[0] * nC[0] + v[1] * nC[1] + v[2] * nC[2]) - hh, CS * (v[0] * e2C[0] + v[1] * e2C[1] + v[2] * e2C[2])] as V3)
      for (const [i, j] of CUBE_E) segs.push([P3[i], P3[j]])
      // the slice: where each edge crosses y = 0, ordered round the plane
      const pts: [number, number][] = []
      for (const [i, j] of CUBE_E) {
        const ya = P3[i][1]
        const yb = P3[j][1]
        if ((ya < 0) === (yb < 0)) continue
        const t = ya / (ya - yb)
        pts.push([lerp(P3[i][0], P3[j][0], t), lerp(P3[i][2], P3[j][2], t)])
      }
      if (pts.length >= 3) {
        const mx = pts.reduce((s2, q) => s2 + q[0], 0) / pts.length
        const mz = pts.reduce((s2, q) => s2 + q[1], 0) / pts.length
        pts.sort((q1, q2) => Math.atan2(q1[1] - mz, q1[0] - mx) - Math.atan2(q2[1] - mz, q2[0] - mx))
        for (const q of pts) {
          view(q[0], 0, q[1])
          section.push(P2[0], P2[1])
        }
        section.push(section[0], section[1])
        label = pts.length === 3 ? 'TRIANGLE' : `HEXAGON${Math.abs(hh) < 0.05 ? ' · REGULAR' : ''}`
      } else label = hh < 0 ? 'NOTHING YET' : 'GONE'
      section = section.length >= 8 ? section : []
    }
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // below the plane first (it will be veiled), then the plane, then above
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    for (const [s0, s1] of segs) segSide(s0, s1, false)
    ctx.stroke()
    const corners: V3[] = [
      [-half, 0, -half],
      [half, 0, -half],
      [half, 0, half],
      [-half, 0, half],
    ]
    const cp: number[] = []
    for (const c of corners) {
      view(c[0], c[1], c[2])
      cp.push(P2[0], P2[1])
    }
    ctx.fillStyle = rgba(C.paper2, 0.86)
    ctx.beginPath()
    ctx.moveTo(cp[0], cp[1])
    for (let i = 2; i < 8; i += 2) ctx.lineTo(cp[i], cp[i + 1])
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = k.ink2
    ctx.stroke()
    // the plane's grid
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    for (let g = 1; g < 8; g++) {
      const t = -half + (g / 8) * half * 2
      view(t, 0, -half)
      ctx.moveTo(P2[0], P2[1])
      view(t, 0, half)
      ctx.lineTo(P2[0], P2[1])
      view(-half, 0, t)
      ctx.moveTo(P2[0], P2[1])
      view(half, 0, t)
      ctx.lineTo(P2[0], P2[1])
    }
    ctx.stroke()
    // the slice: what a Flatlander meets
    if (section.length >= 6) {
      ctx.fillStyle = rgba(C.moss, 0.16)
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(section[0], section[1])
      for (let i = 2; i < section.length; i += 2) ctx.lineTo(section[i], section[i + 1])
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.lineWidth = 1
    }
    ctx.strokeStyle = k.ink
    ctx.beginPath()
    for (const [s0, s1] of segs) segSide(s0, s1, true)
    ctx.stroke()
    ctx.restore()
    // the plane's name, on its near corner
    view(-half, 0, half)
    halo('FLATLAND', P2[0] + 4, P2[1] + 14, { size: lab - 0.5, color: k.muted, tracking: 0.16, alpha: a })
    shapeLabel(p, label, a, phaseA ? 'A SPHERE PASSES THROUGH' : 'A CUBE, CORNER FIRST')
    return phaseA
  }

  /** III, right: our space — the slice of a hypersphere or of a tesseract. */
  const SEC = new Float64Array(64 * 3)
  function spaceland(p: Panel, T: number, a: number, phaseA: boolean) {
    const yaw = 0.5 + (T - SL_A0) * 0.16 + uYaw
    const pitch = -0.38 + uPitch * 0.6
    // the slices of the tesseract reach out to radius 2 (the octahedron's corners)
    setView(p, yaw, pitch, phaseA ? 1.08 : 0.62)
    let label = ''
    let gauge = 0
    let range = 1
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    if (phaseA) {
      const u = clamp((T - SL_A0) / (SL_A1 - SL_A0))
      const hh = lerp(-1.75, 1.75, ease.inOutSine(u))
      gauge = hh
      range = 1.75
      if (Math.abs(hh) < 1) {
        const r = Math.sqrt(1 - hh * hh)
        sphereWire(0, r, sphereSegs)
        // back half faint, front half ink: split by view depth
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass === 0 ? rgba(C.moss, 0.3) : C.moss
          ctx.beginPath()
          for (const [s0, s1] of sphereSegs) {
            view(s0[0], s0[1], s0[2])
            const x0 = P2[0]
            const y0 = P2[1]
            const z0 = P2[2]
            view(s1[0], s1[1], s1[2])
            if (z0 + P2[2] > 0 === (pass === 0)) {
              ctx.moveTo(x0, y0)
              ctx.lineTo(P2[0], P2[1])
            }
          }
          ctx.stroke()
        }
        label = `SPHERE · r = ${r.toFixed(2)}`
      } else label = hh < 0 ? 'NOTHING YET' : 'GONE'
    } else {
      const u = clamp((T - SL_B0) / (SL_B1 - SL_B0))
      const hh = lerp(-2.2, 2.2, ease.inOutSine(u))
      gauge = hh
      range = 2.2
      // the tesseract, turned by the viewer in 4D, sliced by the hyperplane n·x = h
      const V4s: V4[] = []
      for (let v = 0; v < NV; v++) {
        const q = canon(v)
        rotPlane(q, 0, 3, uXW)
        rotPlane(q, 1, 3, uYW)
        V4s.push(q)
      }
      const s = V4s.map((q) => q[0] * nT[0] + q[1] * nT[1] + q[2] * nT[2] + q[3] * nT[3] - hh)
      // a crossing point per edge (index by edge), in the hyperplane's own 3D coordinates
      const hit = new Int8Array(EDGES.length)
      let nPts = 0
      EDGES.forEach(([i, j], e) => {
        if (s[i] < 0 === s[j] < 0) return
        const t = s[i] / (s[i] - s[j])
        const q: V4 = [lerp(V4s[i][0], V4s[j][0], t), lerp(V4s[i][1], V4s[j][1], t), lerp(V4s[i][2], V4s[j][2], t), lerp(V4s[i][3], V4s[j][3], t)]
        const c0 = q[0] * bT[0][0] + q[1] * bT[0][1] + q[2] * bT[0][2] + q[3] * bT[0][3]
        const c1 = q[0] * bT[1][0] + q[1] * bT[1][1] + q[2] * bT[1][2] + q[3] * bT[1][3]
        const c2 = q[0] * bT[2][0] + q[1] * bT[2][1] + q[2] * bT[2][2] + q[3] * bT[2][3]
        // a fixed turn of the slice's own axes, so no edge starts out end-on to the eye
        SEC[e * 3] = c0 * PR[0] + c1 * PR[1] + c2 * PR[2]
        SEC[e * 3 + 1] = c0 * PR[3] + c1 * PR[4] + c2 * PR[5]
        SEC[e * 3 + 2] = c0 * PR[6] + c1 * PR[7] + c2 * PR[8]
        hit[e] = 1
        nPts++
      })
      const edgeOf = (i: number, j: number) => EDGES.findIndex(([a2, b2]) => (a2 === i && b2 === j) || (a2 === j && b2 === i))
      if (nPts >= 4) {
        // faces: each cube cell cuts a polygon; wash them lightly
        ctx.fillStyle = rgba(C.moss, 0.07)
        for (const cell of CELLS) {
          const pts = cell.edges.filter((e) => hit[e])
          if (pts.length < 3) continue
          let mx = 0
          let my = 0
          let mz = 0
          for (const e of pts) {
            mx += SEC[e * 3]
            my += SEC[e * 3 + 1]
            mz += SEC[e * 3 + 2]
          }
          mx /= pts.length
          my /= pts.length
          mz /= pts.length
          // sort round the centroid in the polygon's plane
          const e0 = pts[0]
          const ux: V3 = [SEC[e0 * 3] - mx, SEC[e0 * 3 + 1] - my, SEC[e0 * 3 + 2] - mz]
          let nx = 0
          let ny = 0
          let nz = 0
          for (const e of pts) {
            const vx = SEC[e * 3] - mx
            const vy = SEC[e * 3 + 1] - my
            const vz = SEC[e * 3 + 2] - mz
            nx += ux[1] * vz - ux[2] * vy
            ny += ux[2] * vx - ux[0] * vz
            nz += ux[0] * vy - ux[1] * vx
          }
          const nl = Math.hypot(nx, ny, nz)
          if (nl < 1e-9) continue
          const vv: V3 = [(ny * ux[2] - nz * ux[1]) / nl, (nz * ux[0] - nx * ux[2]) / nl, (nx * ux[1] - ny * ux[0]) / nl]
          const ang = (e: number) => {
            const dx = SEC[e * 3] - mx
            const dy = SEC[e * 3 + 1] - my
            const dz = SEC[e * 3 + 2] - mz
            return Math.atan2(dx * vv[0] + dy * vv[1] + dz * vv[2], dx * ux[0] + dy * ux[1] + dz * ux[2])
          }
          pts.sort((e1, e2) => ang(e1) - ang(e2))
          ctx.beginPath()
          pts.forEach((e, i) => {
            view(SEC[e * 3], SEC[e * 3 + 1], SEC[e * 3 + 2])
            if (i === 0) ctx.moveTo(P2[0], P2[1])
            else ctx.lineTo(P2[0], P2[1])
          })
          ctx.closePath()
          ctx.fill()
        }
        // edges: each square face cuts one segment
        const segs: number[] = []
        for (const q of SQUARES) {
          const ends: number[] = []
          for (let i = 0; i < 4; i++) {
            const e = edgeOf(q[i], q[(i + 1) % 4])
            if (hit[e]) ends.push(e)
          }
          if (ends.length === 2) segs.push(ends[0], ends[1])
        }
        let zmin = Infinity
        let zmax = -Infinity
        for (let e = 0; e < EDGES.length; e++) {
          if (!hit[e]) continue
          view(SEC[e * 3], SEC[e * 3 + 1], SEC[e * 3 + 2])
          zmin = Math.min(zmin, P2[2])
          zmax = Math.max(zmax, P2[2])
        }
        for (let s2 = 0; s2 < segs.length; s2 += 2) {
          const e1 = segs[s2]
          const e2 = segs[s2 + 1]
          view(SEC[e1 * 3], SEC[e1 * 3 + 1], SEC[e1 * 3 + 2])
          const x0 = P2[0]
          const y0 = P2[1]
          const z0 = P2[2]
          view(SEC[e2 * 3], SEC[e2 * 3 + 1], SEC[e2 * 3 + 2])
          const near = zmax > zmin + 1e-6 ? 1 - ((z0 + P2[2]) / 2 - zmin) / (zmax - zmin) : 1
          ctx.strokeStyle = C.moss
          ctx.globalAlpha = a * (0.35 + 0.65 * near)
          ctx.lineWidth = 1.25
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.lineTo(P2[0], P2[1])
          ctx.stroke()
        }
        ctx.globalAlpha = a
        ctx.fillStyle = C.moss
        for (let e = 0; e < EDGES.length; e++) {
          if (!hit[e]) continue
          view(SEC[e * 3], SEC[e * 3 + 1], SEC[e * 3 + 2])
          ctx.beginPath()
          ctx.arc(P2[0], P2[1], 1.8, 0, TAU)
          ctx.fill()
        }
        const turned = Math.abs(uXW) > 0.02 || Math.abs(uYW) > 0.02
        const ah2 = Math.abs(hh)
        label = turned ? `${nPts} CORNERS · ${segs.length / 2} EDGES` : ah2 < 0.07 ? 'OCTAHEDRON' : ah2 < 0.995 ? 'TRUNCATED TETRAHEDRON' : 'TETRAHEDRON'
      } else label = hh < 0 ? 'NOTHING YET' : 'GONE'
    }
    ctx.restore()
    gaugeDraw(p, gauge, range, a, phaseA)
    shapeLabel(p, label, a, phaseA ? 'A HYPERSPHERE PASSES THROUGH' : 'A TESSERACT, CORNER FIRST')
  }

  function shapeLabel(p: Panel, label: string, a: number, sub: string) {
    const y = p.y + p.h - (tiny ? 6 : 10)
    halo(label, p.cx, y, { size: lab + 0.5, color: C.moss, align: 'center', tracking: 0.16, alpha: a })
    if (!tiny && p.h > 200) halo(sub, p.cx, y - 15, { size: lab - 1, color: k.muted, align: 'center', tracking: 0.14, alpha: a })
  }

  /** The slicing position along the fourth direction: a vertical ruler with a marker. */
  function gaugeDraw(p: Panel, hh: number, range: number, a: number, phaseA: boolean) {
    if (tiny) return
    const gx = p.x + p.w - 14
    const gy0 = p.y + 34
    const gy1 = p.y + p.h - 40
    if (gy1 - gy0 < 60) return
    const yAt = (v: number) => lerp(gy1, gy0, (v + range) / (2 * range))
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(gx, gy0)
    ctx.lineTo(gx, gy1)
    const marks = phaseA ? [-1, 0, 1] : [-2, -1, 0, 1, 2]
    for (const m of marks) {
      ctx.moveTo(gx - 4, yAt(m))
      ctx.lineTo(gx, yAt(m))
    }
    ctx.stroke()
    for (const m of marks) text(ctx, m === 0 ? '0' : (m < 0 ? '−' : '+') + Math.abs(m), gx - 7, yAt(m) + 3, { size: 8, color: k.muted, align: 'right', tracking: 0.04 })
    // the object's extent and the slice
    ctx.strokeStyle = C.moss
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gx + 3, yAt(phaseA ? -1 : -2))
    ctx.lineTo(gx + 3, yAt(phaseA ? 1 : 2))
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.fillStyle = k.ink
    const my = yAt(clamp(hh, -range, range))
    ctx.beginPath()
    ctx.moveTo(gx - 1, my)
    ctx.lineTo(gx - 7, my - 4)
    ctx.lineTo(gx - 7, my + 4)
    ctx.closePath()
    ctx.fill()
    text(ctx, 'SLICE', gx, gy0 - 8, { size: 8, color: k.muted, align: 'right', tracking: 0.14 })
    ctx.restore()
  }

  /* ------------------------------------------------------------ chapter IV: the net */

  interface Unfold {
    arms: number
    carrier: number
    second: number
  }
  let netL = L4
  function unfoldAt(T: number): Unfold {
    const f = (t0: number, t1: number) => ease.inOutCubic(clamp((T - t0) / (t1 - t0)))
    // out 68 → 75, held, back 80 → 83.6
    const back = (t0: number, t1: number) => 1 - ease.inOutCubic(clamp((T - t0) / (t1 - t0)))
    // the carrier swings down before its passenger opens, so nothing passes behind the 4D eye
    if (T < 79) return { arms: f(68.8, 72.4), carrier: f(68, 71.6), second: f(71.6, 75) }
    return { arms: back(81.4, 83.4), carrier: back(81.8, 83.6), second: back(80, 81.8) }
  }
  /** One point of cell c, carried by the cell's hinges at unfold u, then projected to 3D. */
  function netPoint(c: number, v: number, u: Unfold, out: V3) {
    const p = canon(v)
    const cell = CELLS[c]
    const hingeTo = (a: number, sgn: number, phi: number) => {
      // rotate about the square x_a = sgn, w = −1, in the (a, w) plane
      const da = p[a] - sgn
      const dw = p[3] + 1
      const cs = Math.cos(phi)
      const sn = Math.sin(phi)
      p[a] = sgn + da * cs + sgn * dw * sn
      p[3] = -1 - sgn * da * sn + dw * cs
    }
    const Q = Math.PI / 2
    if (c === OPPOSITE) {
      // first about its square with the carrier (y = −1, w = +1), then with the carrier about the center
      const dy = p[1] + 1
      const dw = p[3] - 1
      const phi = u.second * Q
      p[1] = -1 + dy * Math.cos(phi) - dw * Math.sin(phi)
      p[3] = 1 + dy * Math.sin(phi) + dw * Math.cos(phi)
      hingeTo(1, -1, u.carrier * Q)
    } else if (c === CARRIER) hingeTo(1, -1, u.carrier * Q)
    else if (c !== CENTRAL) hingeTo(cell.axis, cell.bit ? 1 : -1, u.arms * Q)
    rotPlane(p, 0, 3, uXW)
    rotPlane(p, 1, 3, uYW)
    return to3(p, 1, out, netL)
  }

  function drawNet(T: number, alpha: number) {
    if (alpha <= 0.01) return
    const u = unfoldAt(T)
    const open = Math.min(u.arms, u.carrier, u.second)
    const solid = smoothstep(0.82, 1, open)
    // faces: per cell, its 6 squares; the 7 squares that become hinges are inside the cross
    const faces: { pts: number[]; z: number; shade: number; c: number }[] = []
    const P: V3 = [0, 0, 0]
    // a square is inside the cross when the two cells that share it are hinged together
    const hinged = (a2: number, b2: number) => (a2 === CENTRAL && b2 !== OPPOSITE) || (b2 === CENTRAL && a2 !== OPPOSITE) || (a2 === CARRIER && b2 === OPPOSITE) || (a2 === OPPOSITE && b2 === CARRIER)
    const hinge = (c: number, q: number) => CELLS.some((cc, i) => i !== c && cc.squares.includes(q) && hinged(c, i))
    ctx.save()
    ctx.lineWidth = 1
    for (let c = 0; c < 8; c++) {
      for (const q of CELLS[c].squares) {
        const pts: number[] = []
        const p3: V3[] = []
        let z = 0
        for (const v of SQUARES[q]) {
          netPoint(c, v, u, P)
          view(P[0], P[1], P[2])
          pts.push(P2[0], P2[1])
          p3.push([P[0], P[1], P[2]])
          z += P2[2]
        }
        // flat shading from the face's normal in view space
        const ax = p3[1][0] - p3[0][0]
        const ay = p3[1][1] - p3[0][1]
        const az = p3[1][2] - p3[0][2]
        const bx = p3[3][0] - p3[0][0]
        const by = p3[3][1] - p3[0][1]
        const bz = p3[3][2] - p3[0][2]
        const nx = ay * bz - az * by
        const ny = az * bx - ax * bz
        const nz = ax * by - ay * bx
        const nl = Math.hypot(nx, ny, nz) || 1
        const shade = Math.abs(nx * -0.45 + ny * 0.75 + nz * -0.48) / nl
        faces.push({ pts, z: z / 4, shade, c: hinge(c, q) ? -1 : c })
      }
    }
    faces.sort((a2, b2) => b2.z - a2.z)
    for (const f of faces) {
      if (f.c < 0 && solid > 0.5) continue
      ctx.beginPath()
      ctx.moveTo(f.pts[0], f.pts[1])
      for (let i = 2; i < 8; i += 2) ctx.lineTo(f.pts[i], f.pts[i + 1])
      ctx.closePath()
      const tone = 1 - f.shade
      if (solid > 0.01 && f.c >= 0) {
        ctx.globalAlpha = alpha * solid
        ctx.fillStyle = lerpShade(C.paper, '#CFDCD3', 0.15 + 0.85 * tone)
        ctx.fill()
        // faces turned from the light get a fine hatch, as an engraver would shade them
        if (tone > 0.5) {
          hatchPoly(f.pts, 4, -Math.PI / 4, k.ink2, alpha * solid * 0.22 * smoothstep(0.5, 0.8, tone))
          ctx.beginPath()
          ctx.moveTo(f.pts[0], f.pts[1])
          for (let i = 2; i < 8; i += 2) ctx.lineTo(f.pts[i], f.pts[i + 1])
          ctx.closePath()
        }
      }
      ctx.globalAlpha = alpha * (solid > 0.01 ? lerp(0.5, 1, solid) : 0.5)
      ctx.strokeStyle = k.ink
      ctx.stroke()
    }
    ctx.restore()
  }
  function lerpShade(a: string, b: string, t: number) {
    const pa = parseInt(a.slice(1), 16)
    const pb = parseInt(b.slice(1), 16)
    const ch = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp(t)))
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`
  }

  /* ------------------------------------------------------------ chrome */

  function readouts(T: number) {
    const rows: [string, string][] = []
    const ch = chapterAt(T)
    if (ch === 0 || T > 85.5) {
      let d = 0
      for (let a = 0; a < 4; a++) if (SIG[a] > 0.5) d = a + 1
      const V = [1, 2, 4, 8, 16][d]
      const E = [0, 1, 4, 12, 32][d]
      rows.push(['DIMENSION', `${d}`], ['VERTICES', `${V}`], ['EDGES', `${E}`])
    } else if (ch === 1) {
      const [sxw, syw] = rot4Script(T)
      const dg = (r: number) => `${String(Math.round(((((r * 180) / Math.PI) % 360) + 360) % 360)).padStart(3, '0')}°`
      rows.push(['XW', dg(sxw + uXW)], ['YW', dg(syw + uYW)], ['PROJECTION', '4D → 3D → 2D'])
    } else if (ch === 2) {
      rows.push(['SLICE', T < (SL_A1 + SL_B0) / 2 ? 'PLANE' : 'HYPERPLANE'], ['PASS', T < (SL_A1 + SL_B0) / 2 ? 'SPHERES' : 'CORNER FIRST'])
    } else {
      const u = unfoldAt(T)
      rows.push(['CUBES', '8'], ['HINGES', '7'], ['UNFOLDED', `${Math.round(((u.arms + u.carrier + u.second) / 3) * 100)}%`])
    }
    if (preview) rows.length = Math.min(rows.length, 2)
    // the slicing panels carry their own labels; cramped frames drop the readouts there
    if (ch === 2 && (short || tiny)) rows.length = 0
    const small = preview || tiny || short
    let y = pad + 10
    for (const [label, value] of rows) {
      setFont(ctx, { size: small ? 9 : 10.5, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, value, w - pad, y, { size: small ? 9 : 10.5, color: k.ink, align: 'right', tracking: 0.06 })
      text(ctx, label, w - pad - vw - 10, y, { size: small ? 8 : 9.5, color: k.muted, align: 'right', tracking: 0.14 })
      y += small ? 13 : 16
    }
  }

  function chrome(T: number) {
    const ch = chapterAt(T)
    const small = preview || tiny
    text(ctx, short || small || w < 560 ? `${FIG} — Tesseract` : `${FIG} — Fourth dimension`, pad, pad + 10, { size: small ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(86.4, 87.6, T) : 1)
    const capOn = CAPTIONS.find((cc) => T > cc.t0 - 0.3 && T < cc.t1 + 0.3)
    const lines = capOn ? captionLines(capOn) : { lines: [[], []], size: capSize }
    const capTop = capBottom - lines.lines.length * lines.size * 1.06
    if (!tiny) text(ctx, `${c.num} — ${c.name}`, capX, capTop - (small ? 6 : 10), { size: small ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true, alpha: kIn })
    // Dalí, credited while the cross stands
    const dali = smoothstep(74.6, 75.6, T) * (1 - smoothstep(80, 81, T))
    if (dali > 0.01 && !preview) {
      const s = tiny ? 'AFTER DALÍ, 1954' : 'AFTER SALVADOR DALÍ · CORPUS HYPERCUBUS, 1954'
      text(ctx, s, stacked ? capX : capX, capTop - (small ? 22 : 30), { size: lab - 0.5, color: k.muted, tracking: 0.14, alpha: dali })
    }
    if (!preview && !tiny) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 44; i++) {
        const x = lerp(x0, x1, i / 44)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 4 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      CHAPTERS.forEach((cc, i) => {
        const x = lerp(x0, x1, cc.t / LOOP)
        text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
      })
      if (hoverRuler >= 0) {
        const hx = clamp(hoverRuler, x0, x1)
        const hc = chapterAt(((hx - x0) / (x1 - x0)) * LOOP)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${CHAPTERS[hc].name}`, clamp(hx, x0 + 50, x1 - 50), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12, upper: true })
      }
    }
    if (!preview) pillDraw()
  }

  function pillDraw() {
    const p = pill()
    const is4 = mode4 || shift
    ctx.save()
    ctx.lineWidth = 1
    ctx.fillStyle = rgba(C.paper, 0.92)
    ctx.fillRect(p.x, p.y, p.w, p.h)
    const lblW = tiny ? 0 : 36
    const seg = (p.w - lblW) / 2
    ctx.fillStyle = k.ink
    ctx.fillRect(p.x + lblW + (is4 ? seg : 0), p.y, seg, p.h)
    ctx.strokeStyle = hoverPill ? k.ink : k.ink2
    ctx.strokeRect(Math.round(p.x) + 0.5, Math.round(p.y) + 0.5, Math.round(p.w), Math.round(p.h))
    ctx.beginPath()
    ctx.moveTo(Math.round(p.x + lblW + seg) + 0.5, p.y)
    ctx.lineTo(Math.round(p.x + lblW + seg) + 0.5, p.y + p.h)
    if (lblW) {
      ctx.moveTo(Math.round(p.x + lblW) + 0.5, p.y)
      ctx.lineTo(Math.round(p.x + lblW) + 0.5, p.y + p.h)
    }
    ctx.stroke()
    const ty = p.y + p.h / 2 + 0.5
    if (lblW) text(ctx, 'DRAG', p.x + lblW / 2, ty, { size: 8, color: k.muted, align: 'center', baseline: 'middle', tracking: 0.14 })
    text(ctx, '3D', p.x + lblW + seg / 2, ty, { size: 9, color: is4 ? k.ink : C.paper, align: 'center', baseline: 'middle', tracking: 0.12 })
    text(ctx, '4D', p.x + lblW + seg * 1.5, ty, { size: 9, color: is4 ? C.paper : C.fern, align: 'center', baseline: 'middle', tracking: 0.12 })
    ctx.restore()
  }

  /* the ghost: a dotted arc and a dot, early in full mode, until the first touch */
  const G0 = 2.4
  const G1 = 7.4
  function ghost() {
    if (preview || touched || wall < G0 || wall > G1) return null
    return { u: (wall - G0) / (G1 - G0) }
  }
  function ghostDraw(g: { u: number } | null) {
    if (!g) return
    const a = smoothstep(0, 0.1, g.u) * (1 - smoothstep(0.88, 1, g.u))
    const gx = stacked ? cx : capX + Math.min(capW, 300) / 2
    const gy = stacked ? Math.min(ay0 + ah - 20, cy + S * 1.9) : h * 0.4
    const rx = Math.min(80, w * 0.12)
    const pos = Math.sin(g.u * TAU) * 0.5 + 0.5
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.setLineDash([1.5, 3.5])
    ctx.beginPath()
    ctx.ellipse(gx, gy - 8, rx, 10, 0, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
    ctx.setLineDash([])
    const ang = lerp(0.85 * Math.PI, 0.15 * Math.PI, pos)
    const dx = gx + Math.cos(ang) * rx
    const dy = gy - 8 + Math.sin(ang) * 10
    ctx.fillStyle = k.ink
    ctx.beginPath()
    ctx.arc(dx, dy, 3.5, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(dx, dy, 9, 0, TAU)
    ctx.stroke()
    halo(tiny ? 'DRAG · TAP' : 'DRAG TO TURN · TAP FOR THE NEXT BEAT', gx, gy + 22, { size: 9, color: k.ink, tracking: 0.14, align: 'center' })
    ctx.restore()
  }

  function hints(T: number) {
    if (preview || tiny) return
    let msg = ''
    if (dragging) msg = mode4 || shift ? 'TURNING IN 4D · XW ↔ · YW ↕' : 'TURNING IN 3D'
    else if (!touched && wall > G1 && T > ROT0 && T < ROT1) msg = 'DRAG TO TURN · SWITCH TO 4D →'
    if (!msg) return
    const p = pill()
    text(ctx, msg, p.x - 12, p.y + p.h / 2 + 3, { size: 9, color: k.muted, align: 'right', tracking: 0.14 })
  }

  /* ------------------------------------------------------------ frame */

  let lastXWq = 0
  function frame(_t: number, dt: number) {
    wall += dt
    simulate()
    const interacting = dragging || wall < holdUntil
    const want = interacting ? 0 : 1
    rate = lerp(rate, want, damp(want > rate ? 1.4 : 7, dt))
    if (rate > 0.999) rate = 1
    clock += dt * rate
    const T = mod(clock, LOOP)
    curT = T
    const advancing = dt > 0 && prevT >= 0 && T >= prevT && T - prevT < 1
    const crossed = (te: number) => advancing && prevT < te && te <= T

    ground(ctx, w, h, 'paper')

    // the 3D view: straight on for the point, line and square; turning from the cube on
    const turn = ease.inOutCubic(clamp((T - 7.4) / 3))
    const g = ghost()
    const gYaw = g ? Math.sin(g.u * Math.PI) * Math.sin(g.u * TAU) * 0.35 : 0
    vYaw = turn * 0.62 + Math.max(0, T - 10.4) * 0.07 * smoothstep(10.4, 12, T) + uYaw + gYaw
    vPitch = -turn * 0.42 + uPitch
    vcx = cx
    vcy = cy
    vS = S
    // the net needs more room than the tesseract
    const u = unfoldAt(T)
    const open = T > 66 && T < 86 ? (u.arms + u.carrier + u.second) / 3 : 0
    if (open > 0) {
      // the 4D eye backs away as the cells open, so none swings too close to it
      netL = lerp(L4, 9, smoothstep(0, 0.55, open))
      const kc = (netL - 1) / (netL + 1)
      // the cross is 3 cubes wide and 4 tall: fit it, whatever the frame
      const Snet = Math.min(aw / 3.5, ah / 4.7, S * 1.12)
      vS = lerp(S, Snet, open) * (0.5 / kc)
      vcy = cy - vS * kc * open
    }

    // I, II and IV: the figure (built, rotated, unfolded); III: the two slicing panels
    const figA = (1 - smoothstep(ROT1 + 0.4, ROT1 + 1.6, T)) + smoothstep(66, 67.4, T)
    projectFigure(T)
    if (T < 66 || T > 83.6) {
      drawPoint(T)
      drawFigure(T, T > 83.6 ? smoothstep(83.6, 84.4, T) : clamp(figA))
    }
    if (T >= 66 && T < 84.4) drawNet(T, smoothstep(66, 67.4, T) * (1 - smoothstep(83.6, 84.4, T)))
    gizmo(T)
    matrix(T)
    if (T < 30) cubeLabels(T)
    stepLabel(T)
    fvector(T)

    const panA = smoothstep(42.2, 43.4, T) * (1 - smoothstep(64, 65.4, T))
    if (panA > 0.01) {
      const [pl, pr] = panels()
      panelFrame(pl, tiny ? 'FLATLAND' : 'FLATLAND · 3D → 2D', panA)
      panelFrame(pr, tiny ? 'SPACELAND' : 'SPACELAND · 4D → 3D', panA)
      const phaseA = flatland(pl, T, panA)
      spaceland(pr, T, panA, phaseA)
    }

    // sound
    for (let a = 0; a < 4; a++) if (crossed(SLIDES[a][0])) sfx.tone(SCALE[a + 1], 2.2, { type: 'sine', gain: 0.05, attack: 0.02, room: 0.5 })
    if (crossed(0.3)) sfx.tone(SCALE[0], 2.4, { type: 'sine', gain: 0.05, room: 0.5 })
    if (crossed(14.9)) [146.83, 220, 293.66, 369.99].forEach((f, j) => sfx.tone(f, 4, { type: 'sine', gain: 0.03, attack: 0.3, room: 0.6, when: j * 0.09 }))
    if (T > ROT0 && T < ROT1) {
      const [sxw] = rot4Script(T)
      const q = Math.floor((sxw + Math.PI / 4) / (Math.PI / 2))
      if (advancing && q !== lastXWq) sfx.tone(q % 2 ? 440 : 369.99, 1.6, { type: 'triangle', gain: 0.03, room: 0.55 })
      lastXWq = q
    }
    if (crossed(SL_A0 + 0.5) || crossed(SL_B0 + 0.4)) sfx.noise(5, { filter: 300, to: 1600, q: 0.6, gain: 0.03, room: 0.6 })
    if (crossed(75)) [146.83, 220, 293.66, 440].forEach((f, j) => sfx.tone(f, 4.4, { type: 'sine', gain: 0.035, attack: 0.4, room: 0.6, when: j * 0.1 }))
    for (const tt of [71.6, 72.8, 74.8, 82.4, 83, 83.6]) if (crossed(tt)) sfx.tone(587.33, 0.5, { type: 'triangle', gain: 0.025, room: 0.4 })

    readouts(T)
    caption(T)
    chrome(T)
    ghostDraw(g)
    hints(T)
    if (!preview) env.setCursor(scrubbing || hoverRuler >= 0 || hoverPill ? 'pointer' : dragging ? 'grabbing' : pointerIn ? 'grab' : 'default')
    prevT = T
  }

  /* ------------------------------------------------------------ instance */

  /* ------------------------------------------------------------ test hook: ?sim=drag | drag4 | tap replays a gesture */

  const sim = preview ? '' : env.params.get('sim') ?? ''
  let simApi: PieceInstance | null = null
  let simStage = 0
  function simulate() {
    if (!sim || !simApi?.pointer) return
    const P = (type: PointerInfo['type'], x: number, y: number, pressed: boolean) => simApi?.pointer?.({ type, x, y, id: 1, pointerType: 'mouse', pressed })
    const x0 = cx - 80
    const y0 = cy + 20
    if (sim === 'tap') {
      if (simStage === 0 && wall >= 0.2) {
        P('down', x0, y0, true)
        simStage = 1
      } else if (simStage === 1 && wall >= 0.3) {
        P('up', x0, y0, false)
        simStage = 2
      }
      return
    }
    if (sim === 'drag4' && simStage === 0 && wall >= 0.1) {
      const p = pill()
      P('down', p.x + p.w - 10, p.y + p.h / 2, true)
      P('up', p.x + p.w - 10, p.y + p.h / 2, false)
      simStage = 1
      return
    }
    const base = sim === 'drag4' ? 1 : 0
    if (simStage === base && wall >= 0.25) {
      P('down', x0, y0, true)
      simStage = base + 1
    } else if (simStage === base + 1) {
      const u = clamp((wall - 0.25) / 0.6)
      P('move', x0 + u * 160, y0 - u * 90, true)
      if (u >= 1) simStage = base + 2
    } else if (simStage === base + 2 && wall > 0.95) {
      P('up', x0 + 160, y0 - 90, false)
      simStage = base + 3
    }
  }

  const api: PieceInstance = {
    resize() {
      layout()
    },
    frame,
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        pointerIn = false
        hoverRuler = -1
        hoverPill = false
        if (dragging) holdUntil = wall + 2.5
        dragging = false
        scrubbing = false
        return
      }
      pointerIn = true
      const ruler = onRuler(p.x, p.y)
      hoverRuler = ruler || scrubbing ? p.x : -1
      hoverPill = inPill(p.x, p.y)
      if (p.type === 'down') {
        touched = true
        if (hoverPill) {
          mode4 = !mode4
          sfx.tone(mode4 ? 440 : 293.66, 0.5, { type: 'triangle', gain: 0.03 })
          return
        }
        if (ruler) {
          scrubbing = true
          seekTo(p.x)
          return
        }
        lastX = p.x
        lastY = p.y
        downWall = wall
        moved = 0
        dragging = true
        return
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      if (p.type === 'move' && dragging && p.pressed) {
        const dx = p.x - lastX
        const dy = p.y - lastY
        moved += Math.abs(dx) + Math.abs(dy)
        if (moved > (touch ? 10 : 5)) {
          const kk = 3.2 / Math.max(240, Math.min(w, h))
          if (mode4 || shift) {
            uXW += dx * kk
            uYW -= dy * kk
          } else {
            uYaw += dx * kk
            uPitch = clamp(uPitch + dy * kk, -1.3, 1.3)
          }
        }
        lastX = p.x
        lastY = p.y
        return
      }
      if (p.type === 'up' && dragging) {
        dragging = false
        const tap = moved < (touch ? 14 : 8) && wall - downWall < 0.45
        if (tap) step(1)
        else holdUntil = wall + 2.6
      }
    },
    key(code, down) {
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        shift = down
        return false
      }
      if (!down) return code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Space' || code === 'Digit3' || code === 'Digit4'
      if (code === 'ArrowRight' || code === 'ArrowLeft') {
        step(code === 'ArrowRight' ? 1 : -1)
        return true
      }
      if (code === 'Space' || code === 'Digit3' || code === 'Digit4') {
        mode4 = code === 'Space' ? !mode4 : code === 'Digit4'
        touched = true
        return true
      }
      return false
    },
  }
  simApi = api
  return api
}

export default create
