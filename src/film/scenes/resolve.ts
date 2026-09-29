import { B, circle, col, dot, line, lineMid, pb, poly, reg, typeText } from '../kit'
import { easeInOutCubic, easeOutCubic, lerp, TAU } from '../math'
import type { Env, Scene } from '../scene'
import { INK, SNAP_BEAT } from '../timeline'

/*
 * RESOLVE — beats 40–48, then IDLE for as long as the page is open.
 * The ZB mark as a construction drawing: grid, compass circle, the hexagon
 * edge by edge, construction circles for the bowls, then the letters,
 * stroked with a pen — annotated as it goes. Construction fades, the mark
 * lifts to rest above the hero copy, and a graduated ring turns slowly.
 */

const SNAP = SNAP_BEAT - 40
type P = [number, number]

const HEX: P[] = Array.from({ length: 6 }, (_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180
  return [50 + 46 * Math.cos(a), 50 + 46 * Math.sin(a)]
})
const arcPts = (cx: number, cy: number, r: number, n = 20): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
const STROKES: { pts: P[]; at: number; dur: number }[] = [
  { pts: [[25, 32], [49, 32]], at: 1.2, dur: 0.25 },
  { pts: [[49, 32], [25, 68]], at: 1.42, dur: 0.3 },
  { pts: [[25, 68], [49, 68]], at: 1.68, dur: 0.25 },
  { pts: [[55, 32], [55, 68]], at: 1.88, dur: 0.22 },
  { pts: [[55, 32], [63, 32], ...arcPts(63, 40.5, 8.5), [55, 49]], at: 2.02, dur: 0.24 },
  { pts: [[55, 49], [65, 49], ...arcPts(65, 58.5, 9.5), [55, 68]], at: 2.18, dur: 0.26 },
]
export const RESOLVE_STROKE_BEATS = STROKES.map((s) => s.at)

function reelPose(env: Env) {
  return { x: env.cx, y: env.cy, size: Math.min(env.fig.h * 0.8, env.fig.w * 0.42, 340) }
}

export function logoPose(t: number, env: Env) {
  const r = reelPose(env)
  const k = pb(t / B, 3, 4.1, easeInOutCubic)
  const i = env.logo
  return { x: lerp(r.x, i.x, k), y: lerp(r.y, i.y, k), size: lerp(r.size, i.size, k) }
}

export const resolveScene: Scene = {
  id: 'resolve',

  draw(g, t, env) {
    const lb = t / B
    const idle = Math.max(0, lb - 8)
    const pose = logoPose(t, env)
    const s = pose.size / 100
    const px = s > 0 ? 1 / s : 1
    const settle = pb(lb, 4, 6)
    const ox = pose.x + env.mx * 10 * settle
    const oy = pose.y + env.my * 7 * settle
    const construct = 1 - pb(lb, SNAP, SNAP + 0.8)

    g.save()
    g.translate(ox - 50 * s, oy - 50 * s)
    g.scale(s, s)
    g.lineWidth = px

    // --- construction ------------------------------------------------------------------
    if (construct > 0) {
      g.globalAlpha = construct
      g.strokeStyle = col(INK.ink, 0.12)
      for (let k = 0; k <= 12; k++) {
        const v = -10 + k * 10
        const p = pb(lb, k * 0.03, 0.5 + k * 0.03)
        lineMid(g, v, -14, v, 114, p)
        lineMid(g, -14, v, 114, v, p)
      }
      g.strokeStyle = col(INK.ocean, 0.55)
      circle(g, 50, 50, 46, pb(lb, 0.2, 0.9))
      g.strokeStyle = col(INK.ink, 0.5)
      reg(g, 50, 50, 5, pb(lb, 0.2, 0.5))
      g.strokeStyle = col(INK.ink, 0.18)
      HEX.forEach(([x, y], i) => line(g, 50, 50, x, y, pb(lb, 0.5 + i * 0.04, 0.8 + i * 0.04)))
      g.strokeStyle = col(INK.fern, 0.6)
      g.setLineDash([1.5 * px * 3, 2 * px * 3])
      circle(g, 63, 40.5, 8.5, pb(lb, 1.0, 1.3))
      circle(g, 65, 58.5, 9.5, pb(lb, 1.1, 1.4))
      g.setLineDash([])
      // annotations, in screen-sized type
      g.save()
      g.scale(px, px)
      const at = (x: number, y: number): P => [x * s, y * s]
      const note = (text: string, x: number, y: number, a: number, align: CanvasTextAlign = 'left') => typeText(g, text, ...at(x, y), a, 9, INK.fern, align)
      note('R 46', 88, 8, pb(lb, 0.9, 1.2, (v) => v))
      note('60°', 99, 50, pb(lb, 1.0, 1.3, (v) => v))
      note('r 8.5', 76, 34, pb(lb, 1.3, 1.6, (v) => v))
      note('r 9.5', 78, 66, pb(lb, 1.4, 1.7, (v) => v))
      note('24', 37, 25, pb(lb, 1.5, 1.8, (v) => v), 'center')
      note('ø 92 · STROKE 3.6', 50, 106, pb(lb, 1.8, 2.3, (v) => v), 'center')
      g.restore()
      g.globalAlpha = 1
    }

    // --- the hexagon, edge by edge ---------------------------------------------------------
    g.strokeStyle = INK.ocean
    g.lineWidth = 1.5 * px
    poly(g, HEX, pb(lb, 0.7, 1.5, (v) => v), true)

    // --- the letters, stroked with a pen ------------------------------------------------------
    g.strokeStyle = INK.ink
    g.lineWidth = 3.6
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const st of STROKES) {
      const p = pb(lb, st.at, st.at + st.dur, (v) => v)
      if (p <= 0) continue
      poly(g, st.pts, p)
      if (p < 1 && lb < SNAP) {
        // pen head
        let total = 0
        for (let i = 1; i < st.pts.length; i++) total += Math.hypot(st.pts[i][0] - st.pts[i - 1][0], st.pts[i][1] - st.pts[i - 1][1])
        let left = total * p
        let hx = st.pts[0][0]
        let hy = st.pts[0][1]
        for (let i = 1; i < st.pts.length && left > 0; i++) {
          const [ax, ay] = st.pts[i - 1]
          const [bx, by] = st.pts[i]
          const l = Math.hypot(bx - ax, by - ay) || 1e-6
          const f = Math.min(1, left / l)
          hx = ax + (bx - ax) * f
          hy = ay + (by - ay) * f
          left -= l
        }
        dot(g, hx, hy, 1.4, INK.fern)
      }
    }
    g.lineWidth = px

    // --- completion: one ring, then the resting ornament ---------------------------------------
    const dr = lb - SNAP
    if (dr >= 0 && dr < 1.4) {
      const k = easeOutCubic(dr / 1.4)
      g.strokeStyle = col(INK.ocean, 0.6 * (1 - k))
      circle(g, 50, 50, 50 + k * 34)
    }
    const orn = pb(lb, 4, 6)
    if (orn > 0) {
      const d = (idle + lb - 4) * B
      g.save()
      g.translate(50, 50)
      g.rotate(d * 0.05)
      g.strokeStyle = col(INK.ink, 0.35 * orn)
      g.beginPath()
      for (let k = 0; k < 72; k++) {
        const a = (k / 72) * TAU
        const r0 = 60
        const r1 = k % 6 === 0 ? 64 : 62
        g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
        g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
      }
      g.stroke()
      g.rotate(-d * 0.11)
      g.setLineDash([2, 5])
      g.lineDashOffset = -d * 6
      g.strokeStyle = col(INK.lagoon, 0.35 * orn)
      circle(g, 0, 0, 70)
      g.setLineDash([])
      g.restore()
      g.strokeStyle = col(INK.ink, 0.4 * orn)
      for (const [x, y] of [
        [-16, -16],
        [116, -16],
        [-16, 116],
        [116, 116],
      ] as P[])
        reg(g, x, y, 3.5, orn)
    }
    g.restore()
  },
}
