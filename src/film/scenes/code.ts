import type { Box } from '../layout'
import { makePts, pathLength, resample, type PathFn, type Pts, type Vec } from '../line'
import {
  bez,
  clamp,
  cubicBezierEase,
  easeInOutCubic,
  easeOutCubic,
  invLerp,
  lerp,
  rgba,
  seg,
  win,
  WHITE,
  type RGB,
} from '../math'
import { glowDot, MONO, partialLine, roundRect, style, uiFont, type Scene, type SceneEnv } from '../scene'
import { CHAPTERS } from '../timeline'

/*
 * CHAPTER 01 — PROGRAMMING
 * The line begins as a text caret. Code types itself out; then the caret
 * leaps across the frame as a comet and plots the very easing curve the code
 * just defined. The curve glides to center stage to become chapter two.
 */

const SRC = [
  '// every motion starts as math',
  'const ease = cubicBezier(',
  '  0.65, 0, 0.35, 1',
  ')',
  '',
  'function draw(t) {',
  '  line.to(t, ease(t))',
  '}',
]

type Kind = 'plain' | 'comment' | 'keyword' | 'number' | 'fn' | 'punct'

const BLUE = CHAPTERS[0].rgb
const KIND_COLOR: Record<Kind, RGB> = {
  plain: [232, 230, 224],
  comment: [104, 110, 124],
  keyword: BLUE,
  number: CHAPTERS[3].rgb,
  fn: CHAPTERS[2].rgb,
  punct: [138, 142, 154],
}

interface Glyph {
  ch: string
  line: number
  col: number
  kind: Kind
  t: number
}

export const TYPE_START = 0.5
const LEAP = 4.1
const DRAWN = 6.0
const MOVE = [7.1, 8.0] as const

/** Token start times — the soundtrack turns these into keystroke ticks. */
export const CODE_TICKS: number[] = []

const GLYPHS: Glyph[] = (() => {
  const out: Glyph[] = []
  const re = /(\/\/.*$)|\b(const|function|return)\b|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d])/g
  let t = TYPE_START
  SRC.forEach((src, line) => {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      const kind: Kind = m[1]
        ? 'comment'
        : m[2]
          ? 'keyword'
          : m[3]
            ? 'number'
            : m[4]
              ? 'fn'
              : m[5] || m[6]
                ? 'plain'
                : 'punct'
      const ws = !!m[6]
      if (!ws) CODE_TICKS.push(t)
      for (let i = 0; i < m[0].length; i++) {
        out.push({ ch: m[0][i], line, col: m.index + i, kind, t })
        t += ws ? 0.012 : kind === 'comment' ? 0.017 : 0.021
      }
    }
    t += src.length === 0 ? 0.06 : line === 0 ? 0.24 : 0.11
  })
  return out
})()

export const TYPE_END = GLYPHS[GLYPHS.length - 1].t

/* ---- geometry ---- */

const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
})

function graphBox(t: number, env: SceneEnv): Box {
  return lerpBox(env.L.graph, env.L.design, seg(t, MOVE[0], MOVE[1], easeInOutCubic))
}

/** The ease-in-out curve cubic-bezier(0.65, 0, 0.35, 1) inside box G. */
function curveFn(G: Box): PathFn {
  return (s, o) => {
    o.x = bez(G.x, G.x + 0.65 * G.w, G.x + 0.35 * G.w, G.x + G.w, s)
    o.y = bez(G.y + G.h, G.y + G.h, G.y, G.y, s)
  }
}

function caretPos(t: number, env: SceneEnv, o: Vec) {
  const { code } = env.L
  let i = 0
  while (i < GLYPHS.length && GLYPHS[i].t <= t) i++
  const at = (idx: number, v: Vec) => {
    if (idx <= 0) {
      v.x = code.x
      v.y = code.y + code.lh / 2
      return
    }
    const gph = GLYPHS[idx - 1]
    v.x = code.x + (gph.col + 1) * env.cw
    v.y = code.y + gph.line * code.lh + code.lh / 2
  }
  at(i, o)
  if (i > 0) {
    const prev = { x: 0, y: 0 }
    at(i - 1, prev)
    const k = easeOutCubic(clamp((t - GLYPHS[i - 1].t) / 0.06))
    o.x = lerp(prev.x, o.x, k)
    o.y = lerp(prev.y, o.y, k)
  }
}

const tmpA = makePts()
const caretV: Vec = { x: 0, y: 0 }

function writeCaret(x: number, y: number, h: number, out: Pts) {
  const n = out.length / 2
  for (let k = 0; k < n; k++) {
    out[2 * k] = x
    out[2 * k + 1] = y - h / 2 + (h * k) / (n - 1)
  }
}

export const codeScene: Scene = {
  line(t, env, out) {
    const { L } = env
    if (t < LEAP) {
      caretPos(t, env, caretV)
      writeCaret(caretV.x, caretV.y, L.caret.h, out)
      // Solid while typing; a soft blink once the code is written.
      const phase = t - TYPE_END - 0.25
      const blink = phase > 0 ? 0.25 + 0.75 * (0.5 + 0.5 * Math.cos((phase / 1.06) * Math.PI * 2)) : 1
      return style(blink, 0, 0)
    }

    const G = graphBox(t, env)
    const curve = curveFn(G)
    if (t >= DRAWN) {
      resample(curve, out)
      return style(1, 0, 0)
    }

    // Leap + draw: the visible line is the [tail, head] window of a single
    // path — an arc from the caret to the graph origin, then the curve.
    caretPos(LEAP, env, caretV)
    const cx = caretV.x
    const cy = caretV.y
    const ox = G.x
    const oy = G.y + G.h
    const qx = (cx + ox) / 2
    const qy = Math.min(cy, oy) - (env.f.portrait ? 120 : 230)
    const arc: PathFn = (s, o) => {
      const m = 1 - s
      o.x = m * m * cx + 2 * m * s * qx + s * s * ox
      o.y = m * m * cy + 2 * m * s * qy + s * s * oy
    }
    const composite: PathFn = (s, o) => (s < 0.5 ? arc(s * 2, o) : curve((s - 0.5) * 2, o))
    const la = pathLength(arc)
    const lc = pathLength(curve)
    const total = la + lc
    const head = total * easeInOutCubic(invLerp(LEAP, DRAWN, t))
    const tail = clamp(head - la * 0.55, 0, la)
    resample(composite, out, tail / total, Math.max(head, tail + 0.01) / total)

    // Melt the vertical caret into the comet over the first 0.12s.
    const k = seg(t, LEAP, LEAP + 0.12)
    if (k < 1) {
      writeCaret(cx, cy, L.caret.h, tmpA)
      for (let i = 0; i < out.length; i++) out[i] = lerp(tmpA[i], out[i], k)
    }
    return style(1, win(t, LEAP, LEAP + 0.2, DRAWN - 0.35, DRAWN), 0)
  },

  back(g, t, env) {
    // Current-line highlight while typing, like an editor.
    const a = win(t, TYPE_START - 0.2, TYPE_START, TYPE_END + 0.2, LEAP)
    if (a <= 0) return
    const { code } = env.L
    caretPos(t, env, caretV)
    g.fillStyle = `rgba(255,255,255,${0.028 * a})`
    g.fillRect(code.x - 12 * env.px, caretV.y - code.lh / 2, 31 * env.cw + 24 * env.px, code.lh)
  },

  front(g, t, env) {
    if (t < -0.2 || t > 8.6) return
    const { code } = env.L
    const px = env.px

    // --- the source -------------------------------------------------------
    const dim = 1 - 0.4 * seg(t, LEAP, LEAP + 0.5)
    g.textBaseline = 'middle'
    g.textAlign = 'left'
    g.font = `${code.font}px ${MONO}`

    // file tab + gutter
    const chromeA = win(t, 0, 0.5, 6.1, 6.7) * 0.9
    if (chromeA > 0) {
      g.font = uiFont(env, 11)
      g.fillStyle = rgba(BLUE, 0.7 * chromeA)
      g.beginPath()
      g.arc(code.x + 3 * px, code.y - 30 * px, 2.5 * px, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = `rgba(255,255,255,${0.42 * chromeA})`
      g.fillText('motion.ts', code.x + 12 * px, code.y - 30 * px)
      g.textAlign = 'right'
      g.font = uiFont(env, 11)
      for (let ln = 0; ln < SRC.length; ln++) {
        const first = GLYPHS.find((gl) => gl.line >= ln)
        if (!first || first.t > t + 0.02) continue
        g.fillStyle = `rgba(255,255,255,${0.16 * chromeA})`
        g.fillText(String(ln + 1), code.x - 18 * px, code.y + ln * code.lh + code.lh / 2)
      }
      g.textAlign = 'left'
      g.font = `${code.font}px ${MONO}`
    }

    // highlight the four numbers — they become bezier handles next chapter
    const hl = win(t, LEAP + 0.2, LEAP + 0.6, 6.0, 6.6)
    if (hl > 0) {
      const y = code.y + 2 * code.lh
      roundRect(g, code.x + 1.6 * env.cw, y + 4, 16.8 * env.cw, code.lh - 8, 6 * px)
      g.fillStyle = rgba(CHAPTERS[1].rgb, 0.12 * hl)
      g.fill()
      g.strokeStyle = rgba(CHAPTERS[1].rgb, 0.35 * hl)
      g.lineWidth = px
      g.stroke()
    }

    for (const gl of GLYPHS) {
      if (gl.t > t) break
      const appear = clamp((t - gl.t) / 0.09)
      const out = 1 - seg(t, 6.15 + gl.line * 0.05, 6.75 + gl.line * 0.05)
      const a = appear * out * dim
      if (a <= 0.003) continue
      const lift = (1 - appear) * 6 + (1 - out) * -10
      g.fillStyle = rgba(KIND_COLOR[gl.kind], a * (gl.kind === 'plain' ? 0.92 : 1))
      g.fillText(gl.ch, code.x + gl.col * env.cw, code.y + gl.line * code.lh + code.lh / 2 + lift)
    }

    // --- the graph --------------------------------------------------------
    const G = graphBox(t, env)
    const ox = G.x
    const oy = G.y + G.h
    const axes = seg(t, LEAP + 0.3, LEAP + 0.9)
    const axesA = axes * (1 - seg(t, 6.9, 7.4)) * 0.3
    if (axesA > 0.002) {
      g.strokeStyle = `rgba(255,255,255,${axesA})`
      g.lineWidth = px
      g.beginPath()
      partialLine(g, ox, oy, ox + G.w + 26 * px, oy, axes)
      partialLine(g, ox, oy, ox, G.y - 26 * px, axes)
      g.stroke()

      g.setLineDash([3 * px, 5 * px])
      g.strokeStyle = `rgba(255,255,255,${axesA * 0.45})`
      g.beginPath()
      partialLine(g, ox, G.y, ox + G.w, G.y, axes)
      partialLine(g, ox + G.w, oy, ox + G.w, G.y, axes)
      g.stroke()
      g.setLineDash([])

      g.font = uiFont(env, 11)
      g.fillStyle = `rgba(255,255,255,${axesA * 1.6})`
      g.textAlign = 'left'
      g.fillText('t', ox + G.w + 34 * px, oy)
      // portrait tucks the label inside the plot, clear of the code above
      if (env.f.portrait) g.fillText('ease(t)', ox + 10 * px, G.y + 12 * px)
      else g.fillText('ease(t)', ox - 4 * px, G.y - 40 * px)
      g.textAlign = 'right'
      g.fillText('0', ox - 10 * px, oy + 12 * px)
      g.fillText('1', ox - 10 * px, G.y)
      g.textAlign = 'center'
      g.fillText('1', ox + G.w, oy + 18 * px)
    }

    // --- playhead demo: linear time vs. eased position ---------------------
    const demo = win(t, 5.85, 6.1, 7.0, 7.3)
    if (demo > 0.002) {
      const p = invLerp(6.05, 7.0, t)
      const e = cubicBezierEase(0.65, 0, 0.35, 1, p)
      const x = ox + p * G.w
      const y = oy - e * G.h
      g.strokeStyle = rgba(BLUE, 0.4 * demo)
      g.lineWidth = px
      g.beginPath()
      g.moveTo(x, oy)
      g.lineTo(x, y)
      g.stroke()
      glowDot(g, x, y, 16 * px, BLUE, demo)
      g.fillStyle = rgba(WHITE, demo)
      g.beginPath()
      g.arc(x, y, 3 * px, 0, Math.PI * 2)
      g.fill()

      const ty1 = oy + (env.f.portrait ? 32 : 52) * px
      const ty2 = ty1 + (env.f.portrait ? 18 : 22) * px
      g.strokeStyle = `rgba(255,255,255,${0.14 * demo})`
      g.beginPath()
      g.moveTo(ox, ty1)
      g.lineTo(ox + G.w, ty1)
      g.moveTo(ox, ty2)
      g.lineTo(ox + G.w, ty2)
      g.stroke()
      g.font = uiFont(env, 10)
      g.textAlign = 'right'
      g.fillStyle = `rgba(255,255,255,${0.4 * demo})`
      g.fillText('linear', ox - 12 * px, ty1)
      g.fillText('eased', ox - 12 * px, ty2)
      g.strokeStyle = `rgba(255,255,255,${0.5 * demo})`
      g.beginPath()
      g.arc(ox + p * G.w, ty1, 3.5 * px, 0, Math.PI * 2)
      g.stroke()
      glowDot(g, ox + e * G.w, ty2, 14 * px, BLUE, demo)
      g.fillStyle = rgba(WHITE, demo)
      g.beginPath()
      g.arc(ox + e * G.w, ty2, 3.5 * px, 0, Math.PI * 2)
      g.fill()
    }
    g.textAlign = 'left'
  },
}
