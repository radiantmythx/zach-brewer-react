import { bez, clamp, easeInCubic, easeInOutCubic, easeOutCubic, hash, lerp, ring as wobble, seg, TAU } from '../math'
import { burst, col, font, glow, hits, MONO, ring } from '../kit'
import type { Env, Scene } from '../scene'
import { BEAT, NEON, SNAP_BEAT } from '../timeline'

/*
 * RESOLVE — beats 44–52, then IDLE forever after.
 * Four pieces, one per craft, fly in from the corners and morph as they come:
 * the code bars smear in, the design diagonal arrives as a bezier with
 * handles and straightens, the game hex draws itself, the music bowls settle
 * out of a vibration. They snap into the ZB mark on beat 46.5 with a
 * detonation, cool from white-hot, and lift to where the hero copy expects
 * them. Idle: the mark breathes, particles orbit, light sweeps across it.
 */

const B = BEAT
const SNAP = SNAP_BEAT - 44
type P = [number, number]

const HEX: P[] = Array.from({ length: 7 }, (_, i) => {
  const a = ((-90 + (i % 6) * 60) * Math.PI) / 180
  return [50 + 46 * Math.cos(a), 50 + 46 * Math.sin(a)]
})
const arc = (cx: number, cy: number, r: number, n = 18): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
const BOWLS: P[][] = [
  [
    [55, 32],
    [55, 68],
  ],
  [[55, 32], ...arc(63, 40.5, 8.5), [55, 49]],
  [[55, 49], ...arc(65, 58.5, 9.5), [55, 68]],
]
const BARS: P[][] = [
  [
    [25, 32],
    [49, 32],
  ],
  [
    [25, 68],
    [49, 68],
  ],
]

interface Piece {
  id: 'bars' | 'diag' | 'hex' | 'bowls'
  label: string
  color: string
  at: number
  from: P
  spin: number
}
const PIECES: Piece[] = [
  { id: 'bars', label: 'CODE', color: NEON.blue, at: 1.5, from: [-1.25, -0.35], spin: -2.4 },
  { id: 'diag', label: 'DESIGN', color: NEON.cyan, at: 1.75, from: [1.2, -0.95], spin: 2.8 },
  { id: 'hex', label: 'PLAY', color: NEON.mint, at: 2.0, from: [-0.2, 1.35], spin: -3.6 },
  { id: 'bowls', label: 'SOUND', color: NEON.lime, at: 2.25, from: [1.3, 0.75], spin: 2.2 },
]
export const RESOLVE_PIECE_BEATS = PIECES.map((p) => p.at)

function reelPose(env: Env) {
  const size = Math.min((env.bottom - env.top) * 0.62, env.W * 0.62, 440)
  return { x: env.cx, y: env.cy, size }
}

export function logoPose(t: number, env: Env) {
  const lb = t / B
  const r = reelPose(env)
  const k = seg(lb, 3, 4.1, easeInOutCubic)
  const i = env.logo
  return { x: lerp(r.x, i.x, k), y: lerp(r.y, i.y, k), size: lerp(r.size, i.size, k) }
}

function poly(g: CanvasRenderingContext2D, pts: P[], upto = 1) {
  if (upto >= 1) {
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    return
  }
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  let left = total * upto
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const l = Math.hypot(bx - ax, by - ay)
    const f = Math.min(1, left / l)
    g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f)
    left -= l
  }
}

/** Build the path for one piece in 100-unit logo space. `m` = how "in flight" it is (1 → 0). */
function piecePath(g: CanvasRenderingContext2D, id: Piece['id'], m: number, t: number, draw = 1) {
  g.beginPath()
  if (id === 'hex') poly(g, HEX, draw)
  if (id === 'bars') BARS.forEach((s) => poly(g, s))
  if (id === 'diag') {
    const c1: P = [49 + 34 * m, 32 + 14 * m]
    const c2: P = [25 - 34 * m, 68 - 14 * m]
    for (let i = 0; i <= 20; i++) {
      const s = i / 20
      const x = bez(49, c1[0], c2[0], 25, s)
      const y = bez(32, c1[1], c2[1], 68, s)
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
  }
  if (id === 'bowls')
    BOWLS.forEach((s) =>
      poly(
        g,
        s.map(([x, y]) => [x + 5 * m * Math.sin(y * 0.55 + t * 26), y] as P),
      ),
    )
}

function stroke(g: CanvasRenderingContext2D, id: Piece['id'], s: number, color: string, heat: number, a: number) {
  const hexPiece = id === 'hex'
  const w = (hexPiece ? 3 : 6.5) * s
  const hot = heat > 0.02 ? NEON.white : color
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.globalAlpha = a * 0.35
  g.strokeStyle = hexPiece ? color : hot
  g.lineWidth = w * 1.9
  g.stroke()
  g.globalAlpha = a
  g.strokeStyle = hexPiece ? (heat > 0.3 ? NEON.white : NEON.cyan) : NEON.white
  g.lineWidth = w
  g.stroke()
  g.globalAlpha = 1
}

/** The resolved mark at a pose, with an optional light sweep. */
function drawMark(g: CanvasRenderingContext2D, x: number, y: number, size: number, heat: number, sweep: number, t: number) {
  const s = size / 100
  g.save()
  g.translate(x - 50 * s, y - 50 * s)
  g.scale(s, s)
  for (const p of PIECES) {
    piecePath(g, p.id, 0, t)
    stroke(g, p.id, 1, p.color, heat, 1)
  }
  if (sweep > 0 && sweep < 1) {
    const gr = g.createLinearGradient(-10, -10, 110, 110)
    const k = sweep
    gr.addColorStop(clamp(k - 0.12), 'rgba(255,255,255,0)')
    gr.addColorStop(clamp(k), 'rgba(255,255,255,0.95)')
    gr.addColorStop(clamp(k + 0.12), 'rgba(255,255,255,0)')
    g.globalCompositeOperation = 'lighter'
    for (const p of PIECES) {
      piecePath(g, p.id, 0, t)
      g.strokeStyle = gr
      g.lineWidth = p.id === 'hex' ? 5 : 9
      g.stroke()
    }
    g.globalCompositeOperation = 'source-over'
  }
  g.restore()
}

export const resolveScene: Scene = {
  id: 'resolve',

  fx(t, _env, fx) {
    const lb = t / B
    if (lb < -0.2 || lb > 10) return
    fx.zoom *= 1 + 0.035 * seg(lb, 0, SNAP) * (lb < SNAP ? 1 : 0) + hits(lb, [SNAP], 0.09, 6)
    fx.shake += (lb < SNAP ? 1.5 * seg(lb, 0.5, SNAP) : 0) + hits(lb, RESOLVE_PIECE_BEATS, 5, 12) + hits(lb, [SNAP], 26, 5)
    fx.flash += hits(lb, RESOLVE_PIECE_BEATS, 0.1, 14) + hits(lb, [SNAP], 1, 5)
    fx.bloom += hits(lb, [SNAP], 1.8, 3) + 0.5 * seg(lb, 0.8, SNAP) * (lb < SNAP ? 1 : 0)
    fx.glitch += lb >= SNAP && lb < SNAP + 0.1 ? 0.6 : 0
    if (lb >= SNAP && lb < SNAP + 1) fx.flashColor = '#E8FBFF'
  },

  draw(g, t, env) {
    const lb = t / B
    if (lb < 0) return
    const { W } = env
    const pose = logoPose(t, env)
    const idle = Math.max(0, lb - 8)

    // aurora behind everything once resolved
    const aur = seg(lb, 3, 6)
    if (aur > 0) {
      const d = idle * B
      glow(g, env.W * (0.3 + 0.08 * Math.sin(d * 0.11)), env.cy + env.H * 0.1 * Math.sin(d * 0.07), env.W * 0.55, NEON.blue, 0.13 * aur)
      glow(g, env.W * (0.72 + 0.06 * Math.cos(d * 0.09)), env.cy - env.H * 0.08 * Math.cos(d * 0.05), env.W * 0.45, NEON.mint, 0.1 * aur)
      glow(g, pose.x, pose.y, pose.size * 1.25, NEON.cyan, (0.14 + 0.06 * Math.sin(d * 1.2)) * aur)
    }

    // the build-up point
    if (lb < SNAP) {
      const k = seg(lb, 0, SNAP)
      glow(g, env.cx, env.cy, (60 + 120 * k) * env.U, NEON.white, 0.5 * k)
    }

    // --- pieces in flight ------------------------------------------------------------
    if (lb < SNAP + 0.05) {
      const s = pose.size / 100
      PIECES.forEach((p, i) => {
        const start = 0.35 + i * 0.16
        const fly = seg(lb, start, p.at, easeInCubic)
        if (lb < start) return
        const arrived = lb >= p.at
        const settle = arrived ? wobble(t - p.at * B, 3.2, 9) : 0
        const m = arrived ? Math.max(0, settle) * 0.6 : 1 - fly * 0.6
        const at = (k: number) => {
          const fx = lerp(env.cx + p.from[0] * W * 0.6, pose.x, k)
          const fy = lerp(env.cy + p.from[1] * env.H * 0.55, pose.y, k)
          return [fx, fy] as P
        }
        const render = (k: number, alpha: number, ghost: boolean) => {
          const [x, y] = at(k)
          const scl = lerp(1.6, 1, k) * (1 + (arrived ? settle * 0.06 : 0))
          const rot = (1 - k) * p.spin
          g.save()
          g.translate(x, y)
          g.rotate(rot)
          g.scale(s * scl * (p.id === 'bars' ? 1 + (1 - k) * 1.6 : 1), s * scl)
          g.translate(-50, -50)
          piecePath(g, p.id, m, t, p.id === 'hex' ? Math.max(0.02, k) : 1)
          stroke(g, p.id, 1, p.color, 0, alpha)
          if (!ghost && p.id === 'diag' && m > 0.05) {
            // bezier handles while in flight
            g.globalAlpha = m
            g.strokeStyle = NEON.white
            g.lineWidth = 0.6
            g.beginPath()
            g.moveTo(49, 32)
            g.lineTo(49 + 34 * m, 32 + 14 * m)
            g.moveTo(25, 68)
            g.lineTo(25 - 34 * m, 68 - 14 * m)
            g.stroke()
            g.fillStyle = NEON.cyan
            g.beginPath()
            g.arc(49 + 34 * m, 32 + 14 * m, 1.8, 0, TAU)
            g.arc(25 - 34 * m, 68 - 14 * m, 1.8, 0, TAU)
            g.fill()
            g.globalAlpha = 1
          }
          g.restore()
        }
        if (!arrived) for (let k = 3; k >= 1; k--) render(Math.max(0, fly - k * 0.06), 0.12 * (1 - k / 4), true)
        render(arrived ? 1 : fly, 1, false)
        // craft label rides along with its piece
        const la = clamp(fly * 4) * (1 - seg(lb, p.at, p.at + 0.3))
        if (la > 0.01) {
          const [x, y] = at(fly)
          g.font = font(11, 500, MONO)
          g.textAlign = 'center'
          g.fillStyle = col(p.color, la)
          g.fillText(p.label, x, y + pose.size * 0.62 * lerp(1.6, 1, fly))
        }
      })
    } else {
      // --- resolved ------------------------------------------------------------------------
      const heat = 1 - seg(lb, SNAP, SNAP + 1.2)
      const sweepA = seg(lb, 5, 6.2)
      const cycle = idle > 0 ? ((idle * B) % 9) / 1.6 : -1
      const px = pose.x + env.mx * 14 * aur
      const py = pose.y + env.my * 10 * aur
      drawMark(g, px, py, pose.size, heat, idle > 0 ? cycle : sweepA, t)
    }

    // --- detonation ----------------------------------------------------------------------------
    const ds = t - SNAP * B
    if (ds >= 0 && ds < 1.8) {
      for (let k = 0; k < 3; k++) {
        const p = easeOutCubic(clamp((ds - k * 0.1) / 1.4))
        if (p > 0 && p < 1) ring(g, pose.x, pose.y, pose.size * (0.5 + p * (2.2 + k)), (6 - k * 1.5) * (1 - p) + 0.5, col(k === 1 ? NEON.mint : NEON.cyan, 1 - p))
      }
      burst(g, pose.x, pose.y, ds, { n: 70, seed: 3, speed: 2400 * env.U + 600, life: 1.2, size: 4, kind: 'streak', drag: 3.5, color: (i) => [NEON.blue, NEON.cyan, NEON.mint, NEON.lime, NEON.white][i % 5] })
      burst(g, pose.x, pose.y, ds, { n: 30, seed: 4, speed: 900 * env.U + 300, life: 1.4, size: 8, kind: 'shard', drag: 2.5, color: (i) => (i % 2 ? NEON.white : NEON.cyan) })
    }

    // --- idle orbiters --------------------------------------------------------------------------
    const orb = seg(lb, 4, 7)
    if (orb > 0) {
      const d = idle * B + (lb - 4) * B
      for (let i = 0; i < 18; i++) {
        const h1 = hash(i * 4.1)
        const h2 = hash(i * 7.7)
        const a = h1 * TAU + d * (0.12 + h2 * 0.22) * (i % 2 ? 1 : -1)
        const rx = pose.size * (0.72 + h1 * 0.5)
        const ry = pose.size * (0.2 + h2 * 0.18)
        const z = Math.sin(a)
        const x = pose.x + Math.cos(a) * rx
        const y = pose.y + z * ry + (h2 - 0.5) * pose.size * 0.3
        const r = (1.2 + h2 * 2) * (1 + z * 0.4)
        g.globalAlpha = orb * (0.35 + 0.45 * (z * 0.5 + 0.5))
        g.fillStyle = [NEON.cyan, NEON.mint, NEON.white, NEON.blue][i % 4]
        g.beginPath()
        g.arc(x, y, Math.max(0.3, r), 0, TAU)
        g.fill()
      }
      g.globalAlpha = 1
    }
  },
}
