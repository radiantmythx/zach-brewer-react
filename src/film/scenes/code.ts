import { B, caption, col, font, hatch, line, MONO, pb, poly, rect, typeText } from '../kit'
import { clamp, easeOutCubic, hash, lerp, noise1 } from '../math'
import type { Env, Scene } from '../scene'
import { CHAPTERS, INK } from '../timeline'

/*
 * FIG. 01 ENGINEERING — beats 8–16.
 * A live system diagram drawing itself. A migration pipeline types out in
 * the editor while the architecture routes itself — client, gateway,
 * GraphQL, four services, an event queue — packets flow along every edge,
 * throughput charts itself, and the legacy mainframe is hatched out as
 * retired. (It's SPARC, more or less.)
 */

type Kind = 'kw' | 'fn' | 'lit' | 'plain' | 'punct' | 'comment'
const KIND: Record<Kind, string> = {
  kw: INK.ocean,
  fn: INK.lagoon,
  lit: INK.fern,
  plain: INK.ink,
  punct: INK.muted,
  comment: INK.faint,
}

const SRC = [
  '// sparc — batch migration pipeline',
  'export async function migrate(job) {',
  '  const plan = await planner.resolve(job)',
  '  for (const step of plan.steps) {',
  '    await gateway.execute(step, { retry: 3 })',
  '    metrics.record(step.id, now())',
  '  }',
  '  return plan.summary()',
  '}',
]

interface Glyph {
  ch: string
  line: number
  col: number
  kind: Kind
  at: number
}

/** keystroke beats (local), for the soundtrack */
export const CODE_TYPE_BEATS: number[] = []

const GLYPHS: Glyph[] = (() => {
  const out: Glyph[] = []
  const re = /(\/\/.*$)|\b(export|async|function|const|await|for|of|return)\b|(\d+)|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d])/g
  let b = 0.55
  SRC.forEach((src, line) => {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      const kind: Kind = m[1] ? 'comment' : m[2] ? 'kw' : m[3] ? 'lit' : m[4] ? 'fn' : m[5] || m[6] ? 'plain' : 'punct'
      if (!m[6]) CODE_TYPE_BEATS.push(b)
      for (let i = 0; i < m[0].length; i++) {
        out.push({ ch: m[0][i], line, col: m.index + i, kind, at: b })
        b += m[6] ? 0.02 : 0.034
      }
    }
    b += 0.1
  })
  return out
})()

interface Node {
  id: string
  label: string
  x: number
  y: number
  legacy?: boolean
}

const NODES_L: Node[] = [
  { id: 'client', label: 'WEB CLIENT', x: -20, y: -205 },
  { id: 'gw', label: 'API GATEWAY', x: 200, y: -205 },
  { id: 'host', label: 'AZURE · LIBERTY', x: 440, y: -205 },
  { id: 'gql', label: 'GRAPHQL', x: 200, y: -105 },
  { id: 's1', label: 'LOANS', x: -20, y: -5 },
  { id: 's2', label: 'SERVICING', x: 125, y: -5 },
  { id: 's3', label: 'RISK', x: 275, y: -5 },
  { id: 's4', label: 'REPORTING', x: 420, y: -5 },
  { id: 'queue', label: 'EVENT QUEUE', x: 200, y: 95 },
  { id: 'mf', label: 'MAINFRAME', x: 440, y: 95, legacy: true },
]
const NODES_P: Node[] = [
  { id: 'client', label: 'WEB CLIENT', x: -170, y: -150 },
  { id: 'gw', label: 'API GATEWAY', x: 0, y: -150 },
  { id: 'host', label: 'AZURE', x: 170, y: -150 },
  { id: 'gql', label: 'GRAPHQL', x: 0, y: -60 },
  { id: 's1', label: 'LOANS', x: -240, y: 30 },
  { id: 's2', label: 'SERVICING', x: -80, y: 30 },
  { id: 's3', label: 'RISK', x: 80, y: 30 },
  { id: 's4', label: 'REPORTING', x: 240, y: 30 },
  { id: 'queue', label: 'EVENT QUEUE', x: -80, y: 120 },
  { id: 'mf', label: 'MAINFRAME', x: 120, y: 120, legacy: true },
]
const EDGES: [string, string][] = [
  ['client', 'gw'],
  ['gw', 'host'],
  ['gw', 'gql'],
  ['gql', 's1'],
  ['gql', 's2'],
  ['gql', 's3'],
  ['gql', 's4'],
  ['s1', 'queue'],
  ['s2', 'queue'],
  ['s3', 'queue'],
  ['s4', 'queue'],
  ['queue', 'mf'],
]
export const CODE_RETIRE_BEAT = 5.4

function layout(env: Env) {
  const p = env.portrait
  const code = p ? { x: -330, y: -395, w: 660, h: 200, lines: 4 } : { x: -585, y: -255, w: 400, h: 300, lines: 9 }
  const chart = p ? { x: -330, y: 230, w: 660, h: 110 } : { x: -110, y: 175, w: 690, h: 90 }
  return { code, nodes: p ? NODES_P : NODES_L, nodeW: p ? 150 : 132, nodeH: 36, chart }
}

type Pt = [number, number]

function route(a: Node, b: Node, w: number, h: number): Pt[] {
  if (Math.abs(a.y - b.y) < 1) {
    const s = b.x > a.x ? 1 : -1
    return [
      [a.x + (s * w) / 2, a.y],
      [b.x - (s * w) / 2, b.y],
    ]
  }
  const s = b.y > a.y ? 1 : -1
  const y0 = a.y + (s * h) / 2
  const y1 = b.y - (s * h) / 2
  const mid = (y0 + y1) / 2
  if (Math.abs(a.x - b.x) < 1)
    return [
      [a.x, y0],
      [b.x, y1],
    ]
  return [
    [a.x, y0],
    [a.x, mid],
    [b.x, mid],
    [b.x, y1],
  ]
}

function along(pts: Pt[], f: number): Pt {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  let left = total * f
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (left <= l) {
      const k = l > 0 ? left / l : 0
      return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]
    }
    left -= l
  }
  return pts[pts.length - 1]
}

export const codeScene: Scene = {
  id: 'code',

  fx(t, _env, fx) {
    fx.zoom *= 1 + 0.018 * clamp(t / (8 * B))
  },

  draw(g, t, env) {
    const lb = t / B
    const { U, cx, cy, fig } = env
    const L = layout(env)
    const P = (x: number, y: number): Pt => [cx + x * U, cy + y * U]

    // blueprint grid
    const gp = pb(lb, 0, 0.9, easeOutCubic)
    g.strokeStyle = col(INK.ocean, 0.07)
    g.lineWidth = 1
    const step = 40 * U
    g.beginPath()
    for (let x = fig.x + ((cx - fig.x) % step); x < fig.x + fig.w; x += step) {
      g.moveTo(x, fig.y)
      g.lineTo(x, fig.y + fig.h * gp)
    }
    for (let y = fig.y + ((cy - fig.y) % step); y < fig.y + fig.h; y += step) {
      g.moveTo(fig.x, y)
      g.lineTo(fig.x + fig.w * gp, y)
    }
    g.stroke()

    // --- the editor ------------------------------------------------------------------
    const c = L.code
    const [ex, ey] = P(c.x, c.y)
    const ew = c.w * U
    const eh = c.h * U
    g.fillStyle = INK.paper
    g.fillRect(ex, ey, ew * pb(lb, 0.2, 0.9), eh)
    g.strokeStyle = col(INK.ink, 0.55)
    rect(g, ex, ey, ew, eh, pb(lb, 0.2, 0.9))
    g.strokeStyle = col(INK.ink, 0.2)
    line(g, ex, ey + 22, ex + ew, ey + 22, pb(lb, 0.5, 1))
    typeText(g, 'sparc/migrate.ts', ex + 10, ey + 11, pb(lb, 0.4, 0.8, (v) => v), 10, INK.ink2)
    typeText(g, 'TS', ex + ew - 10, ey + 11, pb(lb, 0.6, 0.8, (v) => v), 10, INK.muted, 'right')
    const fs = Math.max(9.5, Math.min(13.5, 13 * U))
    g.font = font(fs, 400, MONO)
    const cw = g.measureText('0').width
    const lh = Math.max(fs * 1.35, Math.min((eh - 34) / c.lines, fs * 1.75))
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    for (let ln = 0; ln < c.lines; ln++) {
      const first = GLYPHS.find((gl) => gl.line === ln)
      if (!first || first.at > lb) continue
      g.fillStyle = col(INK.muted, 0.6)
      g.fillText(String(ln + 1).padStart(2, ' '), ex + 8, ey + 36 + ln * lh)
    }
    let caretX = ex + 34
    let caretY = ey + 36
    for (const gl of GLYPHS) {
      if (gl.line >= c.lines || gl.at > lb) continue
      const x = ex + 34 + gl.col * cw
      const y = ey + 36 + gl.line * lh
      if (x + cw > ex + ew - 6 || y > ey + eh - 8) continue
      g.fillStyle = KIND[gl.kind]
      g.fillText(gl.ch, x, y)
      caretX = x + cw
      caretY = y
    }
    if (lb > 0.5 && lb < 7.5 && Math.floor(lb * 2.2) % 2 === 0) {
      g.fillStyle = INK.ocean
      g.fillRect(caretX + 1, caretY - fs * 0.6, 1.5, fs * 1.2)
    }

    // --- the architecture --------------------------------------------------------------
    const nw = L.nodeW * U
    const nh = L.nodeH * U
    const byId = new Map(L.nodes.map((n) => [n.id, n]))
    const retire = pb(lb, CODE_RETIRE_BEAT, CODE_RETIRE_BEAT + 0.6)
    EDGES.forEach(([a, b], j) => {
      const A = byId.get(a)!
      const Bn = byId.get(b)!
      const pts = route(A, Bn, L.nodeW, L.nodeH).map(([x, y]) => P(x, y))
      const dp = pb(lb, 1.3 + j * 0.07, 1.8 + j * 0.07)
      const legacy = Bn.legacy
      g.strokeStyle = legacy ? col(INK.ink, 0.35 * (1 - retire * 0.7)) : col(INK.ink, 0.45)
      g.lineWidth = 1
      if (legacy) g.setLineDash([3, 4])
      poly(g, pts, dp)
      g.setLineDash([])
      if (lb > 2.3 && !(legacy && retire >= 1)) {
        const n = legacy ? 1 : 3
        const speed = 0.55 + hash(j * 3.3) * 0.5
        for (let k = 0; k < n; k++) {
          const f = ((((lb - 2.3) * speed + k / n + hash(j)) % 1) + 1) % 1
          const [px, py] = along(pts, f)
          g.fillStyle = legacy ? INK.muted : j % 3 === 0 ? INK.lagoon : INK.ocean
          g.fillRect(px - 2, py - 2, 4, 4)
        }
      }
    })
    L.nodes.forEach((n, i) => {
      const [x, y] = P(n.x, n.y)
      const p = pb(lb, 0.6 + i * 0.1, 1.1 + i * 0.1)
      if (p <= 0) return
      g.fillStyle = INK.paper
      g.fillRect(x - nw / 2, y - nh / 2, nw * clamp(p * 2), nh)
      g.strokeStyle = n.legacy ? col(INK.ink, 0.5) : INK.ink
      g.lineWidth = 1
      if (n.legacy) g.setLineDash([3, 3])
      rect(g, x - nw / 2, y - nh / 2, nw, nh, p)
      g.setLineDash([])
      typeText(g, n.label, x - nw / 2 + 7, y, pb(lb, 0.8 + i * 0.1, 1.3 + i * 0.1, (v) => v), Math.max(7.5, Math.min(10, 10 * U)), n.legacy ? INK.muted : INK.ink)
      if (lb > 2.4 && !n.legacy) {
        const on = hash(i * 7 + Math.floor(lb * 6)) > 0.45
        g.fillStyle = on ? INK.moss : col(INK.moss, 0.25)
        g.fillRect(x + nw / 2 - 9, y - 2, 4, 4)
      }
      if (n.legacy && retire > 0) {
        g.strokeStyle = col(INK.fern, 0.8)
        hatch(g, x - nw / 2, y - nh / 2, nw, nh, 6, retire)
        g.strokeStyle = INK.fern
        line(g, x - nw / 2 - 6, y, x + nw / 2 + 6, y, retire)
        typeText(g, 'RETIRED — 80+ JOBS AUTOMATED', x - nw / 2, y + nh / 2 + 12, pb(lb, CODE_RETIRE_BEAT + 0.3, CODE_RETIRE_BEAT + 1, (v) => v), 9, INK.fern)
      }
    })

    // --- throughput -------------------------------------------------------------------------
    const ch = L.chart
    const [chx, chy] = P(ch.x, ch.y)
    const cwid = ch.w * U
    const chh = ch.h * U
    g.strokeStyle = col(INK.ink, 0.5)
    line(g, chx, chy + chh, chx + cwid, chy + chh, pb(lb, 2.6, 3.2))
    line(g, chx, chy + chh, chx, chy, pb(lb, 2.6, 3.0))
    g.strokeStyle = col(INK.ink, 0.12)
    g.beginPath()
    for (let k = 1; k < 4; k++) {
      const y = chy + chh - (chh * k) / 4
      g.moveTo(chx, y)
      g.lineTo(chx + cwid * pb(lb, 2.8, 3.4), y)
    }
    g.stroke()
    const prog = pb(lb, 3.0, 7.4, (v) => v)
    const n = 90
    for (const [off, color, w] of [
      [0, INK.ocean, 1.5],
      [7, INK.sage, 1],
    ] as const) {
      g.strokeStyle = color
      g.lineWidth = w
      g.beginPath()
      for (let s = 0; s <= n * prog; s++) {
        const k = s / n
        const v = off
          ? 0.25 + 0.1 * noise1(k * 9 + 3)
          : 0.35 + 0.35 * (1 - Math.exp(-k * 3)) + 0.12 * noise1(k * 14) + 0.05 * Math.sin(k * 40)
        const x = chx + k * cwid
        const y = chy + chh - v * chh
        if (s === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    g.lineWidth = 1
    typeText(g, 'THROUGHPUT', chx + 8, chy + 6, pb(lb, 2.8, 3.2, (v) => v), 9.5, INK.ocean)
    const rps = Math.round(12480 * easeOutCubic(prog))
    typeText(g, `${rps.toLocaleString('en-US')} req/s`, chx + cwid, chy + 6, pb(lb, 3, 3.3, (v) => v), 9.5, INK.ink, 'right')
    typeText(g, `p95 ${Math.round(lerp(120, 41, easeOutCubic(prog)))} ms`, chx + cwid, chy + 20, pb(lb, 3.2, 3.5, (v) => v), 9.5, INK.muted, 'right')
  },

  hud(g, t, env) {
    caption(g, env, t / B, 1, CHAPTERS[0])
  },
}
