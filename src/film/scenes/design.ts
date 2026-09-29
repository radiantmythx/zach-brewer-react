import type { Box, Layout } from '../layout'
import { blend, makePts, resample, uncurl, type PathFn } from '../line'
import {
  bez,
  clamp,
  cubicBezierEase,
  easeInOutCubic,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  lerp,
  rgba,
  seg,
  springOut,
  win,
  WHITE,
  type RGB,
} from '../math'
import { MONO, roundRect, SANS, setSpacing, style, uiFont, type Scene, type SceneEnv } from '../scene'
import { CHAPTERS } from '../timeline'

/*
 * CHAPTER 02 — DESIGN
 * The easing curve is now a vector path on an infinite canvas. Anchors and
 * handles pop in, a cursor drags the handles (the properties panel updates
 * live), a bounding box snaps to smart guides — then the path re-routes
 * itself into a golden spiral and unrolls into the horizon of chapter three.
 */

const CORAL = CHAPTERS[1].rgb
const GUIDE: RGB = [255, 79, 216]

export const DESIGN_EVENTS = {
  anchors: [0.05, 0.3],
  press: [1.4, 3.1],
  release: [2.6, 4.1],
  bbox: 4.15,
  golden: 5.0,
  goldenLines: 5.3,
  morph: [5.3, 6.5] as const,
  unfurl: [6.9, 8.0] as const,
}

const D2 = [1.4, 2.6] as const
const D1 = [3.1, 4.1] as const

function ctrl(t: number) {
  const d2 = seg(t, D2[0], D2[1], easeInOutSine)
  const d1 = seg(t, D1[0], D1[1], easeInOutSine)
  return {
    x1: lerp(0.65, 0.82, d1),
    y1: lerp(0, -0.36, d1),
    x2: lerp(0.35, 0.14, d2),
    y2: lerp(1, 1.34, d2),
  }
}

const X = (G: Box, nx: number) => G.x + nx * G.w
const Y = (G: Box, ny: number) => G.y + G.h - ny * G.h

function curveFn(G: Box, c: ReturnType<typeof ctrl>): PathFn {
  return (s, o) => {
    o.x = bez(X(G, 0), X(G, c.x1), X(G, c.x2), X(G, 1), s)
    o.y = bez(Y(G, 0), Y(G, c.y1), Y(G, c.y2), Y(G, 1), s)
  }
}

/* ---- golden rectangle: squares, dividers and the quarter-arc spiral ---- */

interface Arc {
  cx: number
  cy: number
  r: number
  a0: number
}
type Seg4 = [number, number, number, number]

function goldenParts(B: Box) {
  let { x, y, w, h } = B
  const arcs: Arc[] = []
  const divs: Seg4[] = []
  let a = Math.PI
  for (let i = 0; i < 9; i++) {
    const d = i % 4
    if (d === 0) {
      arcs.push({ cx: x + h, cy: y + h, r: h, a0: a })
      divs.push([x + h, y, x + h, y + h])
      x += h
      w -= h
    } else if (d === 1) {
      arcs.push({ cx: x, cy: y + w, r: w, a0: a })
      divs.push([x, y + w, x + w, y + w])
      y += w
      h -= w
    } else if (d === 2) {
      arcs.push({ cx: x + w - h, cy: y, r: h, a0: a })
      divs.push([x + w - h, y, x + w - h, y + h])
      w -= h
    } else {
      arcs.push({ cx: x + w, cy: y + h - w, r: w, a0: a })
      divs.push([x, y + h - w, x + w, y + h - w])
      h -= w
    }
    a += Math.PI / 2
  }
  return { arcs, divs }
}

const spiral = makePts()
const tmp = makePts()
let spiralKey = ''
let parts: ReturnType<typeof goldenParts> | null = null

function goldenFor(L: Layout) {
  const B = L.golden
  const key = `${B.x}|${B.y}|${B.w}`
  if (key !== spiralKey || !parts) {
    spiralKey = key
    parts = goldenParts(B)
    const arcs = parts.arcs
    resample((s, o) => {
      const f = s * arcs.length
      const i = Math.min(arcs.length - 1, Math.floor(f))
      const A = arcs[i]
      const ang = A.a0 + (f - i) * (Math.PI / 2)
      o.x = A.cx + A.r * Math.cos(ang)
      o.y = A.cy + A.r * Math.sin(ang)
    }, spiral)
  }
  return parts
}

/* ---- cursor choreography ---- */

function arcLerp(ax: number, ay: number, bx: number, by: number, p: number, bend: number) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const b = Math.sin(Math.PI * p) * bend
  return { x: lerp(ax, bx, p) + (-dy / len) * b, y: lerp(ay, by, p) + (dx / len) * b }
}

function cursorAt(t: number, env: SceneEnv) {
  const G = env.L.design
  const portrait = env.f.portrait
  const sx = G.x + G.w + (portrait ? 40 : 280)
  const sy = G.y + G.h + (portrait ? 230 : 160)
  const ex = G.x + G.w + (portrait ? 30 : 220)
  const ey = G.y + G.h + (portrait ? 260 : 250)
  const c = ctrl(t)
  let p: { x: number; y: number }
  if (t < D2[0]) p = arcLerp(sx, sy, X(G, 0.35), Y(G, 1), seg(t, 0.6, D2[0], easeInOutCubic), 70)
  else if (t < D2[1]) p = { x: X(G, c.x2), y: Y(G, c.y2) }
  else if (t < D1[0]) p = arcLerp(X(G, 0.14), Y(G, 1.34), X(G, 0.65), Y(G, 0), seg(t, D2[1], D1[0], easeInOutCubic), -90)
  else if (t < D1[1]) p = { x: X(G, c.x1), y: Y(G, c.y1) }
  else p = arcLerp(X(G, 0.82), Y(G, -0.36), ex, ey, seg(t, D1[1], 4.9, easeInOutCubic), 50)
  const pressed = (t >= D2[0] && t < D2[1]) || (t >= D1[0] && t < D1[1])
  return { ...p, a: seg(t, 0.55, 0.85) * (1 - seg(t, 4.5, 4.9)), pressed }
}

const CURSOR = [0, 0, 0, 17, 4.5, 13, 7.5, 19.5, 10.2, 18.3, 7.3, 12, 12.5, 12]

function drawCursor(g: CanvasRenderingContext2D, x: number, y: number, s: number, a: number) {
  const path = (ox: number, oy: number) => {
    g.beginPath()
    for (let i = 0; i < CURSOR.length; i += 2) {
      const px = x + ox + CURSOR[i] * s
      const py = y + oy + CURSOR[i + 1] * s
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
  }
  path(1.2 * s, 2 * s)
  g.fillStyle = `rgba(0,0,0,${0.4 * a})`
  g.fill()
  path(0, 0)
  g.fillStyle = `rgba(255,255,255,${a})`
  g.fill()
  g.lineWidth = s
  g.strokeStyle = `rgba(10,10,12,${0.9 * a})`
  g.stroke()
}

/** Draw [text, color] runs left to right. */
function runs(g: CanvasRenderingContext2D, x: number, y: number, parts: [string, string][]) {
  let cx = x
  for (const [text, color] of parts) {
    g.fillStyle = color
    g.fillText(text, cx, y)
    cx += g.measureText(text).width
  }
}

const fmt = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2)

export const designScene: Scene = {
  line(t, env, out) {
    const { L, f } = env
    const G = L.design
    const curve = curveFn(G, ctrl(t))
    if (t < DESIGN_EVENTS.morph[0]) {
      resample(curve, out)
      return style(1, 0, 0)
    }
    goldenFor(L)
    if (t < DESIGN_EVENTS.unfurl[0]) {
      resample(curve, tmp)
      blend(tmp, spiral, seg(t, DESIGN_EVENTS.morph[0], DESIGN_EVENTS.morph[1], easeInOutCubic), out, 0.55)
      return style(1, 0, 0)
    }
    const k = seg(t, DESIGN_EVENTS.unfurl[0], DESIGN_EVENTS.unfurl[1], easeInOutCubic)
    uncurl(spiral, k, 0, f.visL - 20, L.groundY, f.visR - f.visL + 40, out)
    // edge fades assume a roughly straight line — only apply once it is one
    return style(1, 0, 0.08 * seg(k, 0.8, 1))
  },

  back(g, t, env) {
    const a = win(t, -0.4, 0.8, 6.6, 7.6) * 0.13
    if (a < 0.003) return
    const { f, px } = env
    const sp = f.portrait ? 32 : 36
    const s = 1.4 * px
    g.fillStyle = `rgba(255,255,255,${a})`
    g.beginPath()
    for (let x = Math.floor(f.visL / sp) * sp; x < f.visR; x += sp) {
      for (let y = Math.floor(f.visT / sp) * sp; y < f.visB; y += sp) g.rect(x - s / 2, y - s / 2, s, s)
    }
    g.fill()
  },

  front(g, t, env) {
    if (t < -0.3 || t > 8.4) return
    const { L, px, f } = env
    const G = L.design
    const c = ctrl(t)
    const fadeOut = 1 - seg(t, 4.9, 5.4)

    const p0x = X(G, 0)
    const p0y = Y(G, 0)
    const p3x = X(G, 1)
    const p3y = Y(G, 1)
    const k1x = X(G, c.x1)
    const k1y = Y(G, c.y1)
    const k2x = X(G, c.x2)
    const k2y = Y(G, c.y2)
    const drag2 = t >= D2[0] && t < D2[1]
    const drag1 = t >= D1[0] && t < D1[1]

    // --- handles & anchors --------------------------------------------------
    if (fadeOut > 0 && t > 0) {
      const grow = t > 0.35 ? easeOutBack(clamp((t - 0.35) / 0.5)) : 0
      g.lineWidth = px
      g.strokeStyle = `rgba(255,255,255,${0.55 * fadeOut})`
      g.beginPath()
      g.moveTo(p0x, p0y)
      g.lineTo(lerp(p0x, k1x, grow), lerp(p0y, k1y, grow))
      g.moveTo(p3x, p3y)
      g.lineTo(lerp(p3x, k2x, grow), lerp(p3y, k2y, grow))
      g.stroke()

      const knob = (x: number, y: number, active: boolean, near: number) => {
        const r = 4 * px * clamp(grow * 1.4, 0, 1.15)
        if (r <= 0) return
        if (active || near > 0) {
          g.fillStyle = rgba(CORAL, (active ? 0.28 : 0.18 * near) * fadeOut)
          g.beginPath()
          g.arc(x, y, (active ? 11 : 8 + 3 * near) * px, 0, Math.PI * 2)
          g.fill()
        }
        g.fillStyle = active ? rgba(CORAL, fadeOut) : `rgba(255,255,255,${fadeOut})`
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
      knob(lerp(p0x, k1x, grow), lerp(p0y, k1y, grow), drag1, win(t, 2.8, 3.1, 3.1, 3.2))
      knob(lerp(p3x, k2x, grow), lerp(p3y, k2y, grow), drag2, win(t, 1.1, 1.4, 1.4, 1.5))

      const anchor = (x: number, y: number, at: number, active: boolean) => {
        const s = 9 * px * springOut(t - at)
        if (s <= 0) return
        g.fillStyle = active ? rgba(CORAL, fadeOut) : `rgba(11,11,14,${fadeOut})`
        g.fillRect(x - s / 2, y - s / 2, s, s)
        g.strokeStyle = `rgba(255,255,255,${0.95 * fadeOut})`
        g.lineWidth = 1.25 * px
        g.strokeRect(x - s / 2, y - s / 2, s, s)
      }
      anchor(p0x, p0y, DESIGN_EVENTS.anchors[0], drag1)
      anchor(p3x, p3y, DESIGN_EVENTS.anchors[1], drag2)
    }

    // --- properties panel ---------------------------------------------------
    const pa = win(t, 0.4, 0.9, 4.9, 5.3)
    if (pa > 0.003) {
      const slide = (1 - seg(t, 0.4, 1.0, easeOutCubic)) * 16 * px
      const hi1 = drag1 ? rgba(CORAL, pa) : `rgba(255,255,255,${0.85 * pa})`
      const hi2 = drag2 ? rgba(CORAL, pa) : `rgba(255,255,255,${0.85 * pa})`
      const dimc = `rgba(255,255,255,${0.4 * pa})`
      g.textBaseline = 'middle'
      g.textAlign = 'left'
      if (f.portrait) {
        g.font = uiFont(env, 11)
        const text = `cubic-bezier(${fmt(c.x1)}, ${fmt(c.y1)}, ${fmt(c.x2)}, ${fmt(c.y2)})`
        const w = g.measureText(text).width
        const x = f.w / 2 - w / 2
        runs(g, x, L.panel.y + slide, [
          ['cubic-bezier(', dimc],
          [`${fmt(c.x1)}, ${fmt(c.y1)}`, hi1],
          [', ', dimc],
          [`${fmt(c.x2)}, ${fmt(c.y2)}`, hi2],
          [')', dimc],
        ])
      } else {
        const x = L.panel.x + slide
        const y = L.panel.y
        const w = 204 * px
        const h = 156 * px
        roundRect(g, x, y, w, h, 10 * px)
        g.fillStyle = `rgba(255,255,255,${0.035 * pa})`
        g.fill()
        g.strokeStyle = `rgba(255,255,255,${0.1 * pa})`
        g.lineWidth = px
        g.stroke()

        g.font = uiFont(env, 11, 500, SANS)
        g.fillStyle = rgba(CORAL, pa)
        g.beginPath()
        g.arc(x + 17 * px, y + 22 * px, 3 * px, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = `rgba(255,255,255,${0.6 * pa})`
        setSpacing(g, '0.04em')
        g.fillText('Easing', x + 27 * px, y + 22 * px)
        setSpacing(g, '0px')

        g.font = uiFont(env, 12)
        g.fillStyle = `rgba(255,255,255,${0.9 * pa})`
        g.fillText('cubic-bezier', x + 16 * px, y + 50 * px)
        g.font = uiFont(env, 11)
        const col2 = x + 108 * px
        runs(g, x + 16 * px, y + 76 * px, [['x1  ', dimc], [fmt(c.x1), hi1]])
        runs(g, col2, y + 76 * px, [['y1  ', dimc], [fmt(c.y1), hi1]])
        runs(g, x + 16 * px, y + 98 * px, [['x2  ', dimc], [fmt(c.x2), hi2]])
        runs(g, col2, y + 98 * px, [['y2  ', dimc], [fmt(c.y2), hi2]])

        // live preview of the easing being edited
        const tx0 = x + 16 * px
        const tx1 = x + w - 16 * px
        const ty = y + 130 * px
        g.strokeStyle = `rgba(255,255,255,${0.12 * pa})`
        g.beginPath()
        g.moveTo(tx0, ty)
        g.lineTo(tx1, ty)
        g.stroke()
        const cyc = ((env.time % 1.6) + 1.6) % 1.6
        const e = cubicBezierEase(c.x1, c.y1, c.x2, c.y2, clamp(cyc / 1.2))
        g.fillStyle = rgba(CORAL, pa)
        g.beginPath()
        g.arc(lerp(tx0, tx1, e), ty, 4 * px, 0, Math.PI * 2)
        g.fill()
      }
    }

    // --- bounding box + smart guides ----------------------------------------
    const ba = win(t, DESIGN_EVENTS.bbox, DESIGN_EVENTS.bbox + 0.25, 5.0, 5.35)
    if (ba > 0.003) {
      let x0 = Infinity
      let y0 = Infinity
      let x1 = -Infinity
      let y1 = -Infinity
      for (let i = 0; i <= 64; i++) {
        const s = i / 64
        const x = bez(p0x, k1x, k2x, p3x, s)
        const y = bez(p0y, k1y, k2y, p3y, s)
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y)
      }
      const grow = lerp(0.96, 1, easeOutCubic(clamp((t - DESIGN_EVENTS.bbox) / 0.3)))
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      const hw = ((x1 - x0) / 2) * grow
      const hh = ((y1 - y0) / 2) * grow

      const ga = win(t, 4.3, 4.4, 4.8, 4.95)
      if (ga > 0) {
        g.strokeStyle = rgba(GUIDE, 0.6 * ga)
        g.lineWidth = px
        g.beginPath()
        g.moveTo(cx, f.visT)
        g.lineTo(cx, f.visB)
        g.moveTo(f.visL, cy)
        g.lineTo(f.visR, cy)
        g.stroke()
      }

      g.strokeStyle = rgba(CORAL, ba)
      g.lineWidth = px
      g.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2)
      const hs = 6 * px
      for (const [hx, hy] of [
        [-1, -1],
        [0, -1],
        [1, -1],
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
      ]) {
        const x = cx + hx * hw
        const y = cy + hy * hh
        g.fillStyle = `rgba(255,255,255,${ba})`
        g.fillRect(x - hs / 2, y - hs / 2, hs, hs)
        g.strokeRect(x - hs / 2, y - hs / 2, hs, hs)
      }
      g.font = uiFont(env, 10.5, 500)
      const label = `${Math.round(x1 - x0)} × ${Math.round(y1 - y0)}`
      const lw = g.measureText(label).width + 14 * px
      roundRect(g, cx - lw / 2, cy + hh + 10 * px, lw, 19 * px, 4 * px)
      g.fillStyle = rgba(CORAL, ba)
      g.fill()
      g.fillStyle = `rgba(26,10,6,${ba})`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(label, cx, cy + hh + 19.5 * px)
      g.textAlign = 'left'
    }

    // --- golden-ratio construction -------------------------------------------
    const gA = seg(t, DESIGN_EVENTS.golden, DESIGN_EVENTS.golden + 0.3) * (1 - seg(t, 6.8, 7.3))
    if (gA > 0.003) {
      const B = L.golden
      const { divs } = goldenFor(L)
      g.strokeStyle = `rgba(255,255,255,${0.2 * gA})`
      g.lineWidth = px
      g.beginPath()
      const per = seg(t, DESIGN_EVENTS.golden, DESIGN_EVENTS.golden + 0.5, easeInOutCubic) * 4
      const edges: Seg4[] = [
        [B.x, B.y + B.h, B.x, B.y],
        [B.x, B.y, B.x + B.w, B.y],
        [B.x + B.w, B.y, B.x + B.w, B.y + B.h],
        [B.x + B.w, B.y + B.h, B.x, B.y + B.h],
      ]
      edges.forEach(([ax, ay, bx, by], i) => {
        const p = clamp(per - i)
        if (p <= 0) return
        g.moveTo(ax, ay)
        g.lineTo(lerp(ax, bx, p), lerp(ay, by, p))
      })
      divs.slice(0, 8).forEach(([ax, ay, bx, by], i) => {
        const a0 = DESIGN_EVENTS.goldenLines + i * 0.125
        const p = seg(t, a0, a0 + 0.3, easeOutCubic)
        if (p <= 0) return
        g.moveTo(ax, ay)
        g.lineTo(lerp(ax, bx, p), lerp(ay, by, p))
      })
      g.stroke()

      const la = win(t, 5.5, 5.9, 6.7, 7.1)
      if (la > 0) {
        g.font = uiFont(env, 10.5)
        g.textAlign = 'right'
        g.textBaseline = 'middle'
        g.fillStyle = `rgba(255,255,255,${0.4 * la})`
        g.fillText('1 : 1.618', B.x + B.w, B.y + B.h + 18 * px)
        g.textAlign = 'left'
      }
    }

    // --- the cursor, on top of everything -------------------------------------
    const cur = cursorAt(t, env)
    if (cur.a > 0.003) {
      const s = px * (cur.pressed ? 0.9 : 1)
      drawCursor(g, cur.x, cur.y, s, cur.a)
    }
  },

  debug(g, t, env) {
    const G = env.L.design
    const c = ctrl(t)
    g.setLineDash([4 * env.px, 4 * env.px])
    g.strokeStyle = rgba(WHITE, 0.5)
    g.lineWidth = env.px
    g.beginPath()
    g.moveTo(X(G, 0), Y(G, 0))
    g.lineTo(X(G, c.x1), Y(G, c.y1))
    g.lineTo(X(G, c.x2), Y(G, c.y2))
    g.lineTo(X(G, 1), Y(G, 1))
    g.stroke()
    g.setLineDash([])
    g.font = `${11 * env.px}px ${MONO}`
    g.fillStyle = rgba(WHITE, 0.7)
    g.fillText(`P1 (${c.x1.toFixed(2)}, ${c.y1.toFixed(2)})  P2 (${c.x2.toFixed(2)}, ${c.y2.toFixed(2)})`, G.x, G.y + G.h + 40 * env.px)
  },
}
