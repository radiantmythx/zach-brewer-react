/*
 * LATENT SPACE — a thousand word embeddings as a 3-D point cloud, plotted
 * like a scientific figure in a slowly rotating perspective. The story, 24 s:
 *
 *   01 scatter    0 – 3 s     unsorted points; the plot draws on
 *   02 k-means    3 – 11 s    the embedding settles while k-means runs:
 *                             centroids (registration marks) glide, points
 *                             re-colour by assignment, an iteration counter
 *   03 clusters   11 – 13 s   groups tighten; serif labels on leader lines
 *   04 nearest    13 – 17 s   "heron" flies in; lines to its 6 nearest
 *                             neighbours with cosine similarities
 *   05 analogy    17 – 21.6 s heron − water + sky ≈ swift, as dimensioned
 *                             vectors on a parallelogram
 *   release       21.6 – 24 s everything undraws; the points scatter again
 *
 * k-means is computed for real at start-up on the (deterministic) point
 * positions at each iteration's moment, so what you see is what it did.
 *
 * Full mode: drag to orbit the plot (it drifts back to its scripted camera
 * when you let go); hover a point to read its word. A ghost shows the drag.
 */

import { C, clamp, cropMarks, damp, ease, gauss, ground, hexRgb, lerp, rgba, rng, setFont, smoothstep, TAU, text } from '../kit'
import type { CreatePiece, PointerInfo } from '../types'

const LOOP = 24
const K = 5
const ITERS = 11
const IT0 = 3.0
const ITD = 0.7
const T_CONV = IT0 + ITERS * ITD
const T_LAB = 11.2
const T_Q = 13.2
const T_A = 17.2
const T_REL = 21.6

const PAPER = '#EEF4F1'
/** mix toward paper, as a hex string (kit.rgba wants hex) */
function lighten(hex: string, k: number) {
  const [r1, g1, b1] = hexRgb(hex)
  const [r2, g2, b2] = hexRgb(PAPER)
  const h = (a: number, b: number) => Math.round(lerp(a, b, k)).toString(16).padStart(2, '0')
  return `#${h(r1, r2)}${h(g1, g2)}${h(b1, b2)}`
}

interface Cluster {
  name: string
  c: [number, number, number]
  sd: [number, number, number]
  share: number
  col: string
  words: Record<string, [number, number, number]>
  /** words are absolute positions rather than offsets */
  abs?: boolean
}

const CLUSTERS: Cluster[] = [
  {
    name: 'rivers',
    c: [-0.52, -0.42, 0.28],
    sd: [0.12, 0.11, 0.12],
    share: 0.2,
    col: lighten(C.lagoon, 0.32),
    words: { water: [0, 0.02, 0], estuary: [0.07, 0.13, 0.05], marsh: [-0.06, 0.15, -0.04], delta: [0.11, -0.05, 0.09], tide: [-0.11, -0.08, 0.1], brook: [0.04, -0.15, -0.08], rapids: [-0.13, 0, -0.1] },
  },
  {
    name: 'weather',
    c: [0.46, -0.42, 0.28],
    sd: [0.12, 0.11, 0.12],
    share: 0.19,
    col: C.sky,
    words: { sky: [0, 0.02, 0], cirrus: [0.07, 0.13, 0.05], gale: [-0.09, -0.06, 0.1], dusk: [0.11, -0.1, -0.06], squall: [-0.11, 0.06, -0.09], haze: [0.05, -0.15, 0.07] },
  },
  {
    name: 'birds',
    c: [-0.03, 0.37, 0.28],
    sd: [0.3, 0.06, 0.07],
    share: 0.23,
    col: lighten(C.fern, 0.3),
    abs: true,
    words: {
      heron: [-0.52, 0.36, 0.28],
      egret: [-0.43, 0.43, 0.21],
      kingfisher: [-0.6, 0.27, 0.37],
      plover: [-0.37, 0.29, 0.35],
      wren: [-0.1, 0.41, 0.22],
      finch: [0.05, 0.31, 0.31],
      lark: [0.21, 0.42, 0.25],
      kestrel: [0.36, 0.45, 0.19],
      swift: [0.47, 0.35, 0.3],
      swallow: [0.6, 0.47, 0.12],
    },
  },
  {
    name: 'instruments',
    c: [-0.6, 0.62, -0.5],
    sd: [0.12, 0.11, 0.11],
    share: 0.19,
    col: C.sage,
    words: { cello: [0, 0, 0], viola: [0.08, 0.07, 0.05], oboe: [-0.1, 0.06, -0.06], harp: [0.06, -0.1, 0.08], marimba: [-0.07, -0.08, 0.1], piano: [0.12, 0, -0.08], synth: [-0.12, 0.12, 0.04] },
  },
  {
    name: 'colours',
    c: [0.58, 0.64, -0.48],
    sd: [0.11, 0.11, 0.11],
    share: 0.19,
    col: PAPER,
    words: { ochre: [0, 0, 0], umber: [0.08, -0.06, 0.06], sienna: [-0.07, 0.08, 0.05], slate: [0.1, 0.09, -0.06], teal: [-0.1, -0.07, -0.07], indigo: [0.04, 0.13, 0.08], sage: [-0.05, -0.13, 0.04] },
  },
]
/** the colours cluster wears the whole palette */
const RAINBOW = [lighten(C.ocean, 0.3), lighten(C.lagoon, 0.25), lighten(C.moss, 0.35), lighten(C.fern, 0.2), C.sky, C.sage]
const NEUTRAL = 0
/** colour slots: 0 neutral, 1..5 cluster colours, 6..11 rainbow */
const SLOTS = [PAPER, ...CLUSTERS.map((c) => c.col), ...RAINBOW]
const ANNO = PAPER

/** ∫ smoothstep(a, b, u) du from -∞ to x */
function ssInt(a: number, b: number, x: number) {
  if (x <= a) return 0
  if (x >= b) return (b - a) / 2 + (x - b)
  const u = (x - a) / (b - a)
  return (b - a) * (u * u * u - (u * u * u * u) / 2)
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * Drag to orbit: yaw and pitch offsets added to the scripted camera, with
 * inertia while flung and a slow ease home once the pointer has been idle.
 */
class Orbit {
  yaw = 0
  pitch = 0
  vyaw = 0
  vpitch = 0
  down = false
  used = false
  /** how far the pointer travelled since it went down (to tell a drag from a tap) */
  travel = 0
  private idle = 99
  private lx = 0
  private ly = 0
  private pyaw = 0
  private ppitch = 0
  pointer(p: PointerInfo) {
    if (p.type === 'down') {
      this.down = true
      this.travel = 0
      this.lx = p.x
      this.ly = p.y
      this.vyaw = this.vpitch = 0
    } else if (p.type === 'move' && this.down) {
      this.travel += Math.hypot(p.x - this.lx, p.y - this.ly)
      if (this.travel > 4) this.used = true
      this.yaw += (p.x - this.lx) * 0.009
      this.pitch = clamp(this.pitch + (p.y - this.ly) * 0.006, -0.5, 0.7)
      this.lx = p.x
      this.ly = p.y
    } else if (p.type === 'up' || p.type === 'leave') {
      if (this.down) {
        this.yaw = ((((this.yaw + Math.PI) % TAU) + TAU) % TAU) - Math.PI
        this.idle = 0
      }
      this.down = false
    }
  }
  update(dt: number) {
    if (dt <= 0) return
    if (this.down) {
      this.vyaw = lerp(this.vyaw, (this.yaw - this.pyaw) / dt, 0.5)
      this.vpitch = lerp(this.vpitch, (this.pitch - this.ppitch) / dt, 0.5)
    } else {
      this.yaw += this.vyaw * dt
      this.pitch = clamp(this.pitch + this.vpitch * dt, -0.5, 0.7)
      const f = Math.exp(-3.2 * dt)
      this.vyaw *= f
      this.vpitch *= f
      this.idle += dt
      if (this.idle > 2.5) {
        const k = damp(0.8, dt)
        this.yaw -= this.yaw * k
        this.pitch -= this.pitch * k
      }
    }
    this.pyaw = this.yaw
    this.ppitch = this.pitch
  }
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const small = env.mode === 'preview'
  const N = small ? 400 : 1000
  const r = rng(0x1a7e)

  /* ------------------------------------------------------------ the data */

  const tx = new Float32Array(N * 3) // target (embedding)
  const sx = new Float32Array(N * 3) // scattered start
  const px = new Float32Array(N * 3) // current
  const truth = new Uint8Array(N)
  const delay = new Float32Array(N)
  const word: (string | null)[] = new Array(N).fill(null)
  const wordIndex = new Map<string, number>()
  const vocab: number[] = []
  {
    let i = 0
    CLUSTERS.forEach((cl, ci) => {
      const n = ci === CLUSTERS.length - 1 ? N - i : Math.round(N * cl.share)
      const names = Object.keys(cl.words)
      for (let k = 0; k < n; k++, i++) {
        truth[i] = ci
        if (k < names.length) {
          const o = cl.words[names[k]]
          for (let j = 0; j < 3; j++) tx[i * 3 + j] = cl.abs ? o[j] : cl.c[j] + o[j]
          word[i] = names[k]
          wordIndex.set(names[k], i)
          vocab.push(i)
        } else {
          for (let j = 0; j < 3; j++) tx[i * 3 + j] = cl.c[j] + gauss(r) * cl.sd[j]
        }
      }
    })
    for (let k = 0; k < N; k++) {
      for (let j = 0; j < 3; j++) sx[k * 3 + j] = clamp(gauss(r) * 0.46, -0.94, 0.94)
      delay[k] = r()
    }
  }
  const centreOf = CLUSTERS.map((cl) => cl.c)

  /** Deterministic position of point i at loop time τ. */
  function posAt(i: number, tau: number, out: Float32Array, o: number) {
    const e = ease.inOutCubic(clamp((tau - 1.2 - delay[i] * 1.4) / 7.2))
    const rel = ease.inOutCubic(clamp((tau - 21.8 - delay[i] * 0.3) / 1.85))
    const tight = 1 - 0.24 * smoothstep(10.4, 12.6, tau)
    const c = centreOf[truth[i]]
    for (let j = 0; j < 3; j++) {
      const t = c[j] + (tx[i * 3 + j] - c[j]) * (word[i] ? 1 : tight)
      const v = lerp(sx[i * 3 + j], t, e)
      out[o + j] = lerp(v, sx[i * 3 + j], rel)
    }
  }

  /* -------------------------------------------------- k-means, precomputed */

  const assign = new Uint8Array(ITERS * N)
  const cent = new Float32Array((ITERS + 1) * K * 3)
  const inertia = new Float32Array(ITERS)
  const shift = new Float32Array(ITERS)
  const colourOf = new Uint8Array(K) // centroid → cluster
  {
    const tmp = new Float32Array(N * 3)
    let ok = false
    for (let attempt = 0; attempt < 40 && !ok; attempt++) {
      const kr = rng(0x5eed + attempt * 977)
      // k-means++ on the positions at the first iteration
      for (let i = 0; i < N; i++) posAt(i, IT0, tmp, i * 3)
      const first = Math.floor(kr() * N)
      for (let j = 0; j < 3; j++) cent[j] = tmp[first * 3 + j]
      const d2 = new Float32Array(N)
      for (let c = 1; c < K; c++) {
        let sum = 0
        for (let i = 0; i < N; i++) {
          let best = Infinity
          for (let q = 0; q < c; q++) {
            const dx = tmp[i * 3] - cent[q * 3]
            const dy = tmp[i * 3 + 1] - cent[q * 3 + 1]
            const dz = tmp[i * 3 + 2] - cent[q * 3 + 2]
            best = Math.min(best, dx * dx + dy * dy + dz * dz)
          }
          d2[i] = best
          sum += best
        }
        let pick = kr() * sum
        let chosen = N - 1
        for (let i = 0; i < N; i++) {
          pick -= d2[i]
          if (pick <= 0) {
            chosen = i
            break
          }
        }
        for (let j = 0; j < 3; j++) cent[c * 3 + j] = tmp[chosen * 3 + j]
      }
      // Lloyd iterations, each on the data as it is at that moment
      for (let it = 0; it < ITERS; it++) {
        for (let i = 0; i < N; i++) posAt(i, IT0 + it * ITD, tmp, i * 3)
        const c0 = it * K * 3
        const c1 = (it + 1) * K * 3
        const sums = new Float64Array(K * 3)
        const counts = new Float64Array(K)
        let J = 0
        for (let i = 0; i < N; i++) {
          let best = Infinity
          let bk = 0
          for (let q = 0; q < K; q++) {
            const dx = tmp[i * 3] - cent[c0 + q * 3]
            const dy = tmp[i * 3 + 1] - cent[c0 + q * 3 + 1]
            const dz = tmp[i * 3 + 2] - cent[c0 + q * 3 + 2]
            const d = dx * dx + dy * dy + dz * dz
            if (d < best) {
              best = d
              bk = q
            }
          }
          assign[it * N + i] = bk
          J += best
          counts[bk]++
          for (let j = 0; j < 3; j++) sums[bk * 3 + j] += tmp[i * 3 + j]
        }
        inertia[it] = J
        let mx = 0
        for (let q = 0; q < K; q++) {
          for (let j = 0; j < 3; j++) cent[c1 + q * 3 + j] = counts[q] > 0 ? sums[q * 3 + j] / counts[q] : cent[c0 + q * 3 + j]
          mx = Math.max(mx, Math.hypot(cent[c1 + q * 3] - cent[c0 + q * 3], cent[c1 + q * 3 + 1] - cent[c0 + q * 3 + 1], cent[c1 + q * 3 + 2] - cent[c0 + q * 3 + 2]))
        }
        shift[it] = mx
      }
      // map centroids to the true groups; accept only a clean one-to-one result
      const used = new Set<number>()
      ok = true
      for (let q = 0; q < K; q++) {
        const votes = new Array(K).fill(0)
        let n = 0
        for (let i = 0; i < N; i++)
          if (assign[(ITERS - 1) * N + i] === q) {
            votes[truth[i]]++
            n++
          }
        const top = votes.indexOf(Math.max(...votes))
        if (used.has(top) || n === 0 || votes[top] / n < 0.95) ok = false
        used.add(top)
        colourOf[q] = top
      }
    }
  }

  /* ------------------------------------------------------ semantic queries */

  const mu = [0, 0, 0]
  for (let i = 0; i < N; i++) for (let j = 0; j < 3; j++) mu[j] += tx[i * 3 + j] / N
  const vec = (i: number) => [tx[i * 3] - mu[0], tx[i * 3 + 1] - mu[1], tx[i * 3 + 2] - mu[2]]
  const cosv = (a: number[], b: number[]) => (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]))
  const QUERY = 'heron'
  const qi = wordIndex.get(QUERY) ?? 0
  const KNN = small ? 4 : 5
  const knn = vocab
    .filter((i) => i !== qi)
    .map((i) => ({ i, c: cosv(vec(qi), vec(i)) }))
    .sort((a, b) => b.c - a.c)
    .slice(0, KNN)
  const wi = wordIndex.get('water') ?? 0
  const si = wordIndex.get('sky') ?? 0
  const res = [0, 1, 2].map((j) => tx[si * 3 + j] + tx[qi * 3 + j] - tx[wi * 3 + j])
  const resV = [res[0] - mu[0], res[1] - mu[1], res[2] - mu[2]]
  const best = vocab
    .filter((i) => i !== qi && i !== wi && i !== si)
    .map((i) => ({ i, c: cosv(resV, vec(i)) }))
    .sort((a, b) => b.c - a.c)[0]
  const vLen = Math.hypot(tx[qi * 3] - tx[wi * 3], tx[qi * 3 + 1] - tx[wi * 3 + 1], tx[qi * 3 + 2] - tx[wi * 3 + 2])

  /* -------------------------------------------------------------- camera */

  let W = env.width
  let H = env.height
  const orbit = new Orbit()
  const ptr = { x: 0, y: 0, over: false, touch: false }
  let hoverI = -1
  let L = layout()
  function layout() {
    const S = Math.min(W, H)
    /** cramped: previews and short or narrow viewers get condensed annotation */
    const tight = small || H < 440 || W < 360
    const portrait = !tight && H > W * 1.15
    const wide = W > H * 1.6
    const m = tight ? 12 : Math.round(clamp(S * 0.04, 16, 34))
    const R = small ? Math.min(H * 0.25, W * 0.22) : tight ? (wide ? Math.min(H * 0.3, W * 0.2) : Math.min(H * 0.24, W * 0.25)) : portrait ? Math.min(W * 0.32, H * 0.2) : Math.min(H * 0.245, W * 0.2)
    const cx = small ? W * 0.53 : tight ? (wide ? W * 0.6 : W * 0.54) : portrait ? W * 0.5 : W * 0.55
    const cy = small ? H * 0.54 : tight ? H * (wide ? 0.55 : 0.6) : portrait ? H * 0.46 : H * 0.5
    return { S, portrait, tight, m, R, cx, cy }
  }

  const Dc = 4.6
  let fpx = 1
  let m00 = 1
  let m02 = 0
  let m10 = 0
  let m11 = 1
  let m12 = 0
  let m20 = 0
  let m21 = 0
  let m22 = 1
  // one full turn per loop: brisk while k-means runs, nearly still while there is reading to do
  const S_SLOW = 0.05
  const SPAN = (x: number) => ssInt(11.2, 12.6, x) - ssInt(21, 22.4, x)
  const S_FAST = (TAU - S_SLOW * SPAN(LOOP)) / (LOOP - SPAN(LOOP))
  const yawF = (x: number) => S_FAST * x - (S_FAST - S_SLOW) * SPAN(x)
  const YAW0 = 0.32 - yawF(19)
  // the ghost demonstration of the drag (full mode, first loop, until the viewer drags)
  const GH0 = 0.9
  const GH1 = 3.1
  const ghostU = (t: number) => (env.mode !== 'full' || orbit.used || t < GH0 || t > GH1 + 2.5 ? -1 : (t - GH0) / (GH1 - GH0))
  function camera(t: number, tau: number) {
    const gu = ghostU(t)
    const gy = gu < 0 ? 0 : 0.7 * ease.inOutCubic(clamp(gu)) * (1 - ease.inOutCubic(clamp((t - GH1) / 2.5)))
    const yaw = YAW0 + yawF(tau) + orbit.yaw + gy
    const pitch = clamp(0.36 + 0.05 * Math.sin(t * 0.23) + orbit.pitch, -0.2, 1.1)
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    const cp = Math.cos(pitch)
    const sp = Math.sin(pitch)
    m00 = cy
    m02 = sy
    m10 = sp * sy
    m11 = cp
    m12 = -sp * cy
    m20 = -cp * sy
    m21 = sp
    m22 = cp * cy
    fpx = L.R * Dc
  }
  const P = { x: 0, y: 0, z: 0, k: 1 }
  function project(x: number, y: number, z: number) {
    const X = m00 * x + m02 * z
    const Y = m10 * x + m11 * y + m12 * z
    const Z = m20 * x + m21 * y + m22 * z
    const k = fpx / (Dc - Z)
    P.x = L.cx + X * k
    P.y = L.cy - Y * k
    P.z = Z
    P.k = k
    return P
  }
  const projXY = (x: number, y: number, z: number): [number, number] => {
    const p = project(x, y, z)
    return [p.x, p.y]
  }

  /* ------------------------------------------------------------- drawing */

  const SX = new Float32Array(N)
  const SY = new Float32Array(N)
  const SZ = new Float32Array(N)
  const slot = new Uint8Array(N)

  /** The plot box: the three back faces as faint grids, like a 3-D scientific plot. */
  function box(a: number) {
    if (a <= 0) return
    // camera direction in world space (for back-face choice)
    const cd = [m20, m21, m22]
    const n = 4
    ctx.lineWidth = 1
    const faces: { axis: number; s: number }[] = []
    for (let ax = 0; ax < 3; ax++) faces.push({ axis: ax, s: cd[ax] > 0 ? -1 : 1 })
    for (const f of faces) {
      const u = (f.axis + 1) % 3
      const v = (f.axis + 2) % 3
      const pt = (pu: number, pv: number): [number, number] => {
        const q = [0, 0, 0]
        q[f.axis] = f.s
        q[u] = pu
        q[v] = pv
        return projXY(q[0], q[1], q[2])
      }
      ctx.strokeStyle = rgba(PAPER, 0.06 * a)
      ctx.beginPath()
      for (let k = 1; k < n; k++) {
        const g = -1 + (2 * k) / n
        let [x0, y0] = pt(g, -1)
        let [x1, y1] = pt(g, lerp(-1, 1, a))
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ;[x0, y0] = pt(-1, g)
        ;[x1, y1] = pt(lerp(-1, 1, a), g)
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
      }
      ctx.stroke()
      ctx.strokeStyle = rgba(PAPER, 0.16 * a)
      ctx.beginPath()
      const c = [pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, 1)]
      ctx.moveTo(c[0][0], c[0][1])
      for (let k = 1; k <= 4 * a; k++) ctx.lineTo(c[k % 4][0], c[k % 4][1])
      ctx.stroke()
    }
    // axis ticks and names along the floor's front edges
    if (!L.tight && a > 0.5) {
      const al = clamp((a - 0.5) * 2)
      const fy = -1
      const zs = cd[2] > 0 ? 1 : -1
      const xs = cd[0] > 0 ? 1 : -1
      const names = ['DIM 1', 'DIM 3']
      for (let e = 0; e < 2; e++) {
        for (let k = 0; k <= 4; k++) {
          const g = -1 + k * 0.5
          const q = e === 0 ? [g, fy, zs] : [xs, fy, g]
          const [x, y] = projXY(q[0], q[1], q[2])
          const q2 = e === 0 ? [g, fy, zs * 1.05] : [xs * 1.05, fy, g]
          const [x2, y2] = projXY(q2[0], q2[1], q2[2])
          ctx.strokeStyle = rgba(PAPER, 0.3 * al)
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x2, y2)
          ctx.stroke()
          if (k % 2 === 0) {
            const q3 = e === 0 ? [g, fy, zs * 1.13] : [xs * 1.13, fy, g]
            const [x3, y3] = projXY(q3[0], q3[1], q3[2])
            text(ctx, g.toFixed(0).replace('-', '−'), x3, y3, { size: 8, color: rgba(PAPER, 0.4 * al), align: 'center', baseline: 'middle', tracking: 0.04 })
          }
        }
        const q4 = e === 0 ? [0.5, fy, zs * 1.13] : [xs * 1.13, fy, 0.5]
        const [x4, y4] = projXY(q4[0], q4[1], q4[2])
        text(ctx, names[e], x4, y4, { size: 8, color: rgba(PAPER, 0.45 * al), align: 'center', baseline: 'middle', tracking: 0.14 })
      }
      // vertical axis
      const [vx0, vy0] = projXY(xs, -1, -zs)
      const [vx1, vy1] = projXY(xs, 1, -zs)
      text(ctx, 'DIM 2', vx1, vy1 - 10, { size: 8, color: rgba(PAPER, 0.45 * al), align: 'center', tracking: 0.14 })
      ctx.strokeStyle = rgba(PAPER, 0.3 * al)
      ctx.beginPath()
      for (let k = 0; k <= 4; k++) {
        const y = lerp(vy0, vy1, k / 4)
        const x = lerp(vx0, vx1, k / 4)
        ctx.moveTo(x - 3, y)
        ctx.lineTo(x + 3, y)
      }
      ctx.stroke()
    }
  }

  /** current iteration state */
  function iterState(tau: number) {
    const j = tau < IT0 ? -1 : Math.min(ITERS - 1, Math.floor((tau - IT0) / ITD))
    return j
  }

  function centroidAt(tau: number, q: number, out: number[]) {
    const j = iterState(tau)
    if (j < 0) {
      for (let k = 0; k < 3; k++) out[k] = cent[q * 3 + k]
      return
    }
    if (tau >= T_CONV) {
      // track the (tightening) group: mean of its current members
      let n = 0
      out[0] = out[1] = out[2] = 0
      for (let i = 0; i < N; i++)
        if (assign[(ITERS - 1) * N + i] === q) {
          out[0] += px[i * 3]
          out[1] += px[i * 3 + 1]
          out[2] += px[i * 3 + 2]
          n++
        }
      if (n) for (let k = 0; k < 3; k++) out[k] /= n
      const blend = smoothstep(T_CONV, T_CONV + 0.6, tau)
      for (let k = 0; k < 3; k++) out[k] = lerp(cent[(ITERS * K + q) * 3 + k], out[k], blend)
      return
    }
    const lt = tau - (IT0 + j * ITD)
    const g = ease.inOutCubic(clamp((lt - 0.26) / 0.36))
    for (let k = 0; k < 3; k++) out[k] = lerp(cent[(j * K + q) * 3 + k], cent[((j + 1) * K + q) * 3 + k], g)
  }

  const cpos = Array.from({ length: K }, () => [0, 0, 0])
  const cscr = Array.from({ length: K }, () => ({ x: 0, y: 0, k: 1 }))

  function slotFor(i: number, q: number) {
    const cl = colourOf[q]
    return cl === 4 ? 1 + K + (i % RAINBOW.length) : 1 + cl
  }

  function points(tau: number, dimOthers: number) {
    const j = iterState(tau)
    for (let i = 0; i < N; i++) {
      const p = project(px[i * 3], px[i * 3 + 1], px[i * 3 + 2])
      SX[i] = p.x
      SY[i] = p.y
      SZ[i] = p.z
      let s = NEUTRAL
      if (j >= 0) {
        const lt = tau - (IT0 + j * ITD)
        const jj = lt >= delay[i] * 0.26 ? j : j - 1
        if (jj >= 0) s = slotFor(i, assign[jj * N + i])
      }
      if (tau > 21.9 && tau - 21.9 > delay[i] * 1.3) s = NEUTRAL
      slot[i] = s
    }
    const base = L.tight ? 1.05 : clamp(L.S * 0.0021, 1.1, 2.1)
    for (let b = 0; b < 3; b++) {
      const zlo = b === 0 ? -9 : -1.2 + b * 0.8
      const zhi = b === 2 ? 9 : -0.4 + b * 0.8
      const near = (b + 0.5) / 3
      const rad = base * (0.7 + near * 0.75)
      for (let s = 0; s < SLOTS.length; s++) {
        let any = false
        ctx.beginPath()
        for (let i = 0; i < N; i++) {
          if (slot[i] !== s || SZ[i] < zlo || SZ[i] >= zhi) continue
          ctx.moveTo(SX[i] + rad, SY[i])
          ctx.arc(SX[i], SY[i], rad, 0, TAU)
          any = true
        }
        if (!any) continue
        const a = (s === NEUTRAL ? 0.45 : 0.8) * (0.45 + near * 0.55) * dimOthers
        ctx.fillStyle = rgba(SLOTS[s], a)
        ctx.fill()
      }
    }
  }

  function spokes(tau: number) {
    const j = iterState(tau)
    if (j < 0 || j > 6 || tau >= T_CONV) return
    const lt = tau - (IT0 + j * ITD)
    const a = 0.2 * (1 - clamp(lt / 0.55)) * (1 - j / 8)
    if (a <= 0.005) return
    ctx.lineWidth = 1
    for (let q = 0; q < K; q++) {
      ctx.strokeStyle = rgba(CLUSTERS[colourOf[q]].col, a)
      ctx.beginPath()
      const c = cscr[q]
      for (let i = 0; i < N; i++) {
        if (assign[j * N + i] !== q) continue
        ctx.moveTo(SX[i], SY[i])
        ctx.lineTo(c.x, c.y)
      }
      ctx.stroke()
    }
  }

  function centroids(tau: number, a: number) {
    if (a <= 0) return
    const j = iterState(tau)
    ctx.lineWidth = 1
    for (let q = 0; q < K; q++) {
      const c = cscr[q]
      const col = CLUSTERS[colourOf[q]].col
      // the path it travelled
      if (j >= 0 && tau < T_LAB + 1) {
        ctx.strokeStyle = rgba(col, 0.45 * a * (1 - smoothstep(T_LAB, T_LAB + 1, tau)))
        ctx.setLineDash([1.5, 3])
        ctx.beginPath()
        const [x0, y0] = projXY(cent[q * 3], cent[q * 3 + 1], cent[q * 3 + 2])
        ctx.moveTo(x0, y0)
        for (let k = 1; k <= Math.min(ITERS, j + 1); k++) {
          const o = (k * K + q) * 3
          const [x, y] = projXY(cent[o], cent[o + 1], cent[o + 2])
          if (k === j + 1 && tau < T_CONV) ctx.lineTo(c.x, c.y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }
      const rr = (L.tight ? 6 : 9) * (0.85 + 0.25 * c.k / (fpx / Dc))
      ctx.strokeStyle = rgba(col, 0.95 * a)
      ctx.beginPath()
      ctx.arc(c.x, c.y, rr * 0.55, 0, TAU)
      ctx.moveTo(c.x - rr, c.y)
      ctx.lineTo(c.x + rr, c.y)
      ctx.moveTo(c.x, c.y - rr)
      ctx.lineTo(c.x, c.y + rr)
      ctx.stroke()
      if (!L.tight && tau < T_LAB) text(ctx, `μ${q + 1}`, c.x + rr + 3, c.y - rr + 2, { size: 8.5, color: rgba(col, 0.9 * a), tracking: 0.06 })
    }
  }

  /** Serif labels on leader lines, kept clear of each other. */
  function labels(a: number) {
    if (a <= 0) return
    const { cx, cy, R, m, portrait } = L
    const size = L.tight ? 13 : Math.round(clamp(L.S * 0.024, 15, 22))
    const items = cscr.map((c, q) => {
      const cl = CLUSTERS[colourOf[q]]
      setFont(ctx, { font: 'serif', size, italic: true })
      const w = ctx.measureText(cl.name).width
      return { q, x: c.x, y: c.y, w, side: 0, lx: 0, ly: 0, name: cl.name, col: cl.col }
    })
    const gap = L.tight ? 20 : size + 16
    if (!portrait) {
      for (const it of items) it.side = it.x < cx ? -1 : 1
      for (const side of [-1, 1]) {
        const g = items.filter((it) => it.side === side).sort((p, q) => p.y - q.y)
        for (const it of g) it.ly = it.y
        for (let pass = 0; pass < 4; pass++) {
          for (let k = 1; k < g.length; k++) if (g[k].ly - g[k - 1].ly < gap) g[k].ly = g[k - 1].ly + gap
          const top = m + (L.tight ? 50 : 120)
          const bottom = H - m - (L.tight ? 30 : 60)
          if (g.length && g[g.length - 1].ly > bottom) {
            g[g.length - 1].ly = bottom
            for (let k = g.length - 2; k >= 0; k--) if (g[k + 1].ly - g[k].ly < gap) g[k].ly = g[k + 1].ly - gap
          }
          if (g.length && g[0].ly < top) g[0].ly = top
        }
        for (const it of g) {
          const colX = cx + side * R * (L.tight ? 1.02 : 1.12)
          it.lx = side < 0 ? Math.max(m + 14 + it.w, colX) : Math.min(W - m - 14 - it.w, colX)
        }
      }
    } else {
      for (const it of items) it.side = it.y < cy ? -1 : 1
      for (const side of [-1, 1]) {
        const g = items.filter((it) => it.side === side).sort((p, q) => p.x - q.x)
        for (const it of g) {
          it.ly = cy + side * R * 1.25
          it.lx = it.x
        }
        for (let pass = 0; pass < 4; pass++) for (let k = 1; k < g.length; k++) if (g[k].lx - g[k - 1].lx < g[k - 1].w + 18) g[k].lx = g[k - 1].lx + g[k - 1].w + 18
        const over = g.length ? g[g.length - 1].lx + g[g.length - 1].w - (W - m - 10) : 0
        if (over > 0) for (const it of g) it.lx -= over
        for (const it of g) it.lx = Math.max(m + 10, it.lx)
      }
    }
    ctx.lineWidth = 1
    for (const it of items) {
      const col = it.col
      ctx.strokeStyle = rgba(col, 0.55 * a)
      ctx.beginPath()
      if (!portrait) {
        const ex = it.lx - it.side * 16
        const d = Math.hypot(ex - it.x, it.ly - it.y) || 1
        const off = Math.min(12, d * 0.3)
        const sxp = it.x + ((ex - it.x) / d) * off
        const syp = it.y + ((it.ly - it.y) / d) * off
        const p = ease.outCubic(a)
        ctx.moveTo(sxp, syp)
        ctx.lineTo(lerp(sxp, ex, p), lerp(syp, it.ly, p))
        if (p > 0.99) ctx.lineTo(it.lx, it.ly)
        ctx.stroke()
        const tx0 = it.side < 0 ? it.lx - 6 : it.lx + 6
        text(ctx, it.name, tx0, it.ly + size * 0.32, { font: 'serif', italic: true, size, color: rgba(col, a), align: it.side < 0 ? 'right' : 'left' })
        if (!L.tight) {
          const n = countOf[it.q]
          text(ctx, `n ${n}`, tx0, it.ly + size * 0.32 + 13, { size: 8, color: rgba(PAPER, 0.5 * a), align: it.side < 0 ? 'right' : 'left', tracking: 0.12 })
        }
      } else {
        const ty = it.ly
        const ex = it.lx + it.w / 2
        ctx.moveTo(it.x, it.y + it.side * 10)
        ctx.lineTo(ex, ty - it.side * (size * 0.9))
        ctx.stroke()
        text(ctx, it.name, it.lx, ty + (it.side > 0 ? size * 0.2 : 0), { font: 'serif', italic: true, size, color: rgba(col, a) })
      }
    }
  }
  const countOf = new Array(K).fill(0)
  for (let i = 0; i < N; i++) countOf[assign[(ITERS - 1) * N + i]]++

  function ring(x: number, y: number, rad: number, col: string, a: number) {
    ctx.strokeStyle = rgba(col, a)
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, TAU)
    ctx.stroke()
  }

  function arrow(x0: number, y0: number, x1: number, y1: number, p: number, col: string, a: number, w = 1.5, dash = false) {
    if (p <= 0) return
    const x = lerp(x0, x1, p)
    const y = lerp(y0, y1, p)
    const ang = Math.atan2(y1 - y0, x1 - x0)
    ctx.strokeStyle = rgba(col, a)
    ctx.lineWidth = w
    if (dash) ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineWidth = 1
    // base tick (dimension style)
    const nx = -Math.sin(ang)
    const ny = Math.cos(ang)
    ctx.beginPath()
    ctx.moveTo(x0 - nx * 5, y0 - ny * 5)
    ctx.lineTo(x0 + nx * 5, y0 + ny * 5)
    ctx.stroke()
    if (p > 0.15) {
      ctx.fillStyle = rgba(col, a)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - Math.cos(ang - 0.32) * 9, y - Math.sin(ang - 0.32) * 9)
      ctx.lineTo(x - Math.cos(ang + 0.32) * 9, y - Math.sin(ang + 0.32) * 9)
      ctx.closePath()
      ctx.fill()
    }
  }

  function wordTag(i: number, s: string, a: number, dx = 8, dy = -8, col = PAPER) {
    if (a <= 0) return
    text(ctx, s, SX[i] + dx, SY[i] + dy, { size: L.tight ? 8.5 : 10, color: rgba(col, a), tracking: 0.06, align: dx < 0 ? 'right' : 'left' })
  }

  /** the query word sits above its point on a short leader, clear of the neighbours */
  function queryTag(x: number, y: number, a: number) {
    if (a <= 0) return
    const up = L.tight ? 16 : 26
    ctx.strokeStyle = rgba(ANNO, 0.6 * a)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y - 6)
    ctx.lineTo(x, y - up)
    ctx.stroke()
    text(ctx, QUERY, x, y - up - 5, { font: 'serif', italic: true, size: L.tight ? 12 : 17, color: rgba(ANNO, a), align: 'center' })
  }

  /* ------------------------------------------------------------- headings */

  const PHASES: { at: number; n: string; kick: string; a: string; b: string }[] = [
    { at: 0, n: '01', kick: 'SCATTER', a: `${N.toLocaleString('en-US')} words,`, b: 'unsorted' },
    { at: IT0, n: '02', kick: 'K-MEANS', a: 'Five centroids', b: 'settle' },
    { at: T_LAB, n: '03', kick: 'CLUSTERS', a: 'Meaning has a', b: 'shape' },
    { at: T_Q, n: '04', kick: 'NEAREST NEIGHBOURS', a: 'Nearest to', b: QUERY },
    { at: T_A, n: '05', kick: 'ANALOGY', a: '', b: '' },
  ]

  let titleWordX = 0
  let titleWordY = 0

  function heading(tau: number) {
    const { m } = L
    const ix = m + (L.tight ? 10 : 16)
    let iy = m + (L.tight ? 16 : 24)
    let ph = 0
    for (let k = 0; k < PHASES.length; k++) if (tau >= PHASES[k].at) ph = k
    const P0 = PHASES[ph]
    const since = tau - P0.at
    const out = 1 - smoothstep(T_REL + 0.2, T_REL + 1.0, tau)
    const kick = tau > T_REL + 0.6 ? 'FIG. M.08 — LATENT SPACE · RELEASE' : W < 600 ? `FIG. M.08 — LATENT SPACE · ${P0.n} / 05` : `FIG. M.08 — LATENT SPACE · ${P0.n} / 05 ${P0.kick}`
    text(ctx, kick, ix, iy, { size: L.tight ? 8 : 9.5, color: rgba(PAPER, 0.5), tracking: 0.14 })
    const ts = L.tight ? 20 : Math.round(clamp(L.S * 0.05, 26, 46))
    iy += ts + (L.tight ? 4 : 10)
    const ap = ease.outCubic(clamp(since / 0.7)) * out
    ctx.save()
    ctx.globalAlpha = ap
    const lift = (1 - ap) * 8
    if (ph < 4) {
      setFont(ctx, { font: 'serif', size: ts })
      const w = P0.a ? ctx.measureText(P0.a + ' ').width : 0
      text(ctx, P0.a, ix, iy + lift, { font: 'serif', size: ts, color: PAPER })
      text(ctx, P0.b, ix + w, iy + lift, { font: 'serif', size: ts, italic: true, color: C.sage })
      if (ph === 3) {
        setFont(ctx, { font: 'serif', size: ts, italic: true })
        titleWordX = ix + w + ctx.measureText(P0.b).width / 2
        titleWordY = iy + 8
      }
    } else {
      // the analogy, term by term
      const terms: [string, number, boolean][] = [
        ['heron', T_A + 0.2, false],
        ['− water', T_A + 0.2, false],
        ['+ sky', T_A + 1.25, false],
        ['≈', T_A + 2.3, false],
        [word[best.i] ?? 'swift', T_A + 2.3, true],
      ]
      let x = ix
      for (const [s, at, em] of terms) {
        setFont(ctx, { font: 'serif', size: ts, italic: em })
        const w = ctx.measureText(s + ' ').width
        const p = ease.outCubic(clamp((tau - at) / 0.5))
        text(ctx, s, x, iy + (1 - p) * 8, { font: 'serif', size: ts, italic: em, color: rgba(em ? C.sage : PAPER, p) })
        x += w
      }
    }
    ctx.restore()
    return iy
  }

  function readouts(tau: number) {
    const { m, portrait } = L
    const j = iterState(tau)
    const conv = tau >= T_CONV
    const a = smoothstep(IT0 - 0.4, IT0, tau) * (1 - smoothstep(T_REL + 0.2, T_REL + 1, tau))
    if (a <= 0) return
    const rows: [string, string][] = L.tight
      ? [['ITER', conv ? 'DONE' : pad2(j + 1)]]
      : [
          ['K-MEANS', `K = ${K}`],
          ['ITERATION', conv ? `${pad2(ITERS)} · CONVERGED` : `${pad2(j + 1)} / ${pad2(ITERS)}`],
          ['INERTIA', inertia[Math.max(0, j)].toFixed(2)],
          ['MAX Δμ', shift[Math.max(0, j)].toFixed(4)],
          ['METRIC', 'COSINE · 3-D PROJECTION'],
        ]
    const rx = W - m - (L.tight ? 10 : 16)
    let ry = m + (L.tight ? 16 : 24)
    // portrait: under the heading, clear of the table and the plot
    if (portrait && !L.tight) ry = m + 24 + Math.round(clamp(L.S * 0.05, 26, 46)) + 34
    ctx.save()
    ctx.globalAlpha = a
    for (const [l, v] of rows) {
      setFont(ctx, { size: L.tight ? 8 : 9, tracking: 0.12 })
      const vw = ctx.measureText(v).width
      text(ctx, v, rx, ry, { size: L.tight ? 8 : 9, color: PAPER, align: 'right', tracking: 0.12 })
      text(ctx, l, rx - vw - 10, ry, { size: L.tight ? 8 : 9, color: rgba(PAPER, 0.45), align: 'right', tracking: 0.12 })
      ry += 15
    }
    ctx.restore()
  }

  function caption() {
    const { m } = L
    if (L.tight) return
    text(ctx, `${N.toLocaleString('en-US')} TOKENS · K-MEANS, K = ${K} · COSINE NEAREST NEIGHBOURS · VECTOR ARITHMETIC`, m + 16, H - m - 16, {
      size: 9,
      color: rgba(PAPER, 0.45),
      tracking: 0.14,
    })
  }

  /* ------------------------------------------------------------- phases */

  function query(tau: number) {
    const a = smoothstep(T_Q, T_Q + 0.3, tau) * (1 - smoothstep(T_A - 0.2, T_A + 0.5, tau))
    if (a <= 0) return
    const hx = SX[qi]
    const hy = SY[qi]
    // the word flies in from the heading
    const fly = ease.inOutCubic(clamp((tau - T_Q - 0.15) / 0.95))
    const sxp = L.tight ? L.m + 60 : titleWordX
    const syp = L.tight ? L.m + 30 : titleWordY
    const cxp = lerp(sxp, hx, 0.25)
    const cyp = Math.max(syp, hy) + (L.tight ? 30 : 80)
    const bx = (u: number) => (1 - u) * (1 - u) * sxp + 2 * (1 - u) * u * cxp + u * u * hx
    const by = (u: number) => (1 - u) * (1 - u) * syp + 2 * (1 - u) * u * cyp + u * u * hy
    ctx.lineWidth = 1
    if (fly < 1 || tau < T_Q + 1.6) {
      const fa = a * (1 - smoothstep(T_Q + 1.2, T_Q + 1.7, tau))
      ctx.strokeStyle = rgba(ANNO, 0.5 * fa)
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.moveTo(sxp, syp)
      for (let k = 1; k <= 24; k++) {
        const u = (k / 24) * fly
        ctx.lineTo(bx(u), by(u))
      }
      ctx.stroke()
      ctx.setLineDash([])
      if (fly < 1) {
        const mx = bx(fly)
        const my = by(fly)
        ring(mx, my, 4, ANNO, a)
        text(ctx, QUERY, mx + 8, my - 6, { font: 'serif', italic: true, size: L.tight ? 12 : 16, color: rgba(ANNO, a) })
      }
    }
    if (fly < 1) return
    const since = tau - (T_Q + 1.1)
    // landing ring
    const lr = ease.outCubic(clamp(since / 0.6))
    ring(hx, hy, 5 + lr * 18, ANNO, a * (1 - lr) * 0.8)
    ring(hx, hy, 5, ANNO, a)
    queryTag(hx, hy, a)
    // neighbour lines, staggered (three when cramped, to match the condensed table)
    knn.slice(0, L.tight && !small ? 3 : KNN).forEach((nb, k) => {
      const p = ease.outCubic(clamp((since - 0.15 - k * 0.16) / 0.45))
      if (p <= 0) return
      const x = SX[nb.i]
      const y = SY[nb.i]
      ctx.strokeStyle = rgba(ANNO, 0.75 * a)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.lineTo(lerp(hx, x, p), lerp(hy, y, p))
      ctx.stroke()
      if (p > 0.95) {
        ring(x, y, 3.5, ANNO, a)
        text(ctx, String(k + 1), x + 6, y + 3, { size: L.tight ? 8 : 9, color: rgba(ANNO, a), tracking: 0 })
      }
    })
    // the table (three rows when cramped, none when very short or a preview)
    // only where it fits beside the plot
    if (small || (L.tight && (H < 300 || L.m + 260 > L.cx - L.R * 1.45))) return
    const rowsN = L.tight ? 3 : KNN
    const ta = a * smoothstep(0.4, 0.9, since)
    if (ta <= 0) return
    const tx0 = L.m + 16
    const rowH = 16
    const ty0 = H - L.m - (L.tight ? 16 : 44) - (rowsN + 1) * rowH
    text(ctx, `QUERY · ${QUERY.toUpperCase()} · TOP ${rowsN} BY COSINE`, tx0, ty0, { size: 8.5, color: rgba(PAPER, 0.5 * ta), tracking: 0.14 })
    knn.slice(0, rowsN).forEach((nb, k) => {
      const p = clamp((since - 0.5 - k * 0.12) / 0.3)
      if (p <= 0) return
      const y = ty0 + (k + 1) * rowH + 4
      const al = ta * p
      text(ctx, pad2(k + 1), tx0, y, { size: 9.5, color: rgba(PAPER, 0.45 * al), tracking: 0.08 })
      text(ctx, word[nb.i] ?? '', tx0 + 28, y, { size: 10, color: rgba(CLUSTERS[truth[nb.i]].col, al), tracking: 0.06 })
      text(ctx, nb.c.toFixed(3), tx0 + 150, y, { size: 10, color: rgba(PAPER, al), tracking: 0.06, align: 'right' })
      // a little bar, cos mapped from .5 → 1
      const bw = 70 * clamp((nb.c - 0.5) / 0.5)
      ctx.strokeStyle = rgba(PAPER, 0.5 * al)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(tx0 + 160, y - 3.5)
      ctx.lineTo(tx0 + 160 + bw * p, y - 3.5)
      ctx.stroke()
      ctx.lineWidth = 1
    })
  }

  function analogy(tau: number) {
    const a = smoothstep(T_A, T_A + 0.3, tau) * (1 - smoothstep(T_REL, T_REL + 0.7, tau))
    if (a <= 0) return
    const since = tau - T_A
    const W0 = [SX[wi], SY[wi]]
    const H0 = [SX[qi], SY[qi]]
    const S0 = [SX[si], SY[si]]
    const R0 = projXY(px[si * 3] + px[qi * 3] - px[wi * 3], px[si * 3 + 1] + px[qi * 3 + 1] - px[wi * 3 + 1], px[si * 3 + 2] + px[qi * 3 + 2] - px[wi * 3 + 2])
    const bi = best.i
    // step 1: water → heron
    const p1 = ease.inOutCubic(clamp((since - 0.3) / 0.8))
    ring(W0[0], W0[1], 5, ANNO, a * clamp(since / 0.3))
    wordTag(wi, 'water', a * clamp(since / 0.3), -9, 14)
    ring(H0[0], H0[1], 5, ANNO, a)
    queryTag(H0[0], H0[1], a)
    arrow(W0[0], W0[1], H0[0], H0[1], p1, ANNO, a)
    if (p1 > 0.6 && !L.tight) {
      const mx = (W0[0] + H0[0]) / 2
      const my = (W0[1] + H0[1]) / 2
      const al = a * clamp((p1 - 0.6) / 0.4)
      text(ctx, 'heron − water', mx - 12, my, { size: 9.5, color: rgba(ANNO, al), align: 'right', tracking: 0.06, baseline: 'middle' })
      text(ctx, `|v| ${vLen.toFixed(2)}`, mx - 12, my + 13, { size: 8, color: rgba(ANNO, 0.55 * al), align: 'right', tracking: 0.12, baseline: 'middle' })
    }
    // step 2: sky, then the same vector from sky; the parallelogram
    const s2 = since - 1.05
    if (s2 > 0) {
      ring(S0[0], S0[1], 5, ANNO, a * clamp(s2 / 0.3))
      wordTag(si, 'sky', a * clamp(s2 / 0.3), 9, 14)
      const pd = ease.inOutCubic(clamp((s2 - 0.15) / 0.7))
      ctx.strokeStyle = rgba(ANNO, 0.4 * a)
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(W0[0], W0[1])
      ctx.lineTo(lerp(W0[0], S0[0], pd), lerp(W0[1], S0[1], pd))
      ctx.moveTo(H0[0], H0[1])
      ctx.lineTo(lerp(H0[0], R0[0], pd), lerp(H0[1], R0[1], pd))
      ctx.stroke()
      ctx.setLineDash([])
      const p2 = ease.inOutCubic(clamp((s2 - 0.35) / 0.8))
      arrow(S0[0], S0[1], R0[0], R0[1], p2, ANNO, a, 1.5, true)
      if (p2 > 0.6 && !L.tight) {
        const mx = (S0[0] + R0[0]) / 2
        const my = (S0[1] + R0[1]) / 2
        text(ctx, '+ (heron − water)', mx + 12, my, { size: 9.5, color: rgba(ANNO, a * clamp((p2 - 0.6) / 0.4)), tracking: 0.06, baseline: 'middle' })
      }
    }
    // step 3: the result lands next to swift
    const s3 = since - 2.25
    if (s3 > 0) {
      const p = ease.outCubic(clamp(s3 / 0.5))
      const rr = 9
      ctx.strokeStyle = rgba(C.sage, a * p)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(R0[0], R0[1], rr * 0.55, 0, TAU)
      ctx.moveTo(R0[0] - rr, R0[1])
      ctx.lineTo(R0[0] + rr, R0[1])
      ctx.moveTo(R0[0], R0[1] - rr)
      ctx.lineTo(R0[0], R0[1] + rr)
      ctx.stroke()
      const pr = ease.outCubic(clamp((s3 - 0.3) / 0.6))
      ring(SX[bi], SY[bi], 4 + 10 * (1 - pr), C.sage, a * pr)
      ring(SX[bi], SY[bi], 4, C.sage, a * pr)
      if (pr > 0.2) {
        text(ctx, word[bi] ?? '', SX[bi] + 16, SY[bi] - 9, { font: 'serif', italic: true, size: L.tight ? 13 : 18, color: rgba(C.sage, a * pr) })
        if (!L.tight) text(ctx, `cos ${best.c.toFixed(3)}`, SX[bi] + 16, SY[bi] + 8, { size: 9, color: rgba(PAPER, 0.7 * a * pr), tracking: 0.08 })
      }
    }
  }

  /* --------------------------------------------------------------- frame */

  /** Hover a point to read it; the ghost demonstration of the orbit drag. */
  function pointerMarks(tau: number, t: number) {
    if (env.mode !== 'full') return
    const u = ghostU(t)
    if (u >= 0 && u <= 1) {
      const a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.88, 1, u))
      const rx = L.R * 1.05
      const ry = L.R * 0.26
      const ey = L.cy + L.R * (L.tight ? 0.7 : 0.95)
      const a0 = Math.PI * 0.92
      const a1 = Math.PI * 0.08
      const ang = lerp(a0, a1, ease.inOutCubic(u))
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(PAPER, 0.6)
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.ellipse(L.cx, ey, rx, ry, 0, a0, ang, true)
      ctx.stroke()
      ctx.setLineDash([])
      const dx = L.cx + Math.cos(ang) * rx
      const dy = ey + Math.sin(ang) * ry
      ctx.fillStyle = PAPER
      ctx.beginPath()
      ctx.arc(dx, dy, 3.5, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = rgba(PAPER, 0.8)
      ctx.beginPath()
      ctx.arc(dx, dy, 9, 0, TAU)
      ctx.stroke()
      if (ey + ry + 18 < H - L.m - 22) text(ctx, 'DRAG TO ORBIT', L.cx, ey + ry + 18, { size: 9.5, color: PAPER, tracking: 0.16, align: 'center' })
      else text(ctx, 'DRAG TO ORBIT', L.cx + rx + 14, ey + 3, { size: 9.5, color: PAPER, tracking: 0.16 })
      ctx.restore()
    }
    // the point under the pointer: its word, or its index and group
    hoverI = -1
    if (ptr.over && !orbit.down) {
      let bd = (ptr.touch ? 22 : 13) ** 2
      for (let i = 0; i < N; i++) {
        const dx = SX[i] - ptr.x
        const dy = SY[i] - ptr.y
        const d = dx * dx + dy * dy
        if (d < bd) {
          bd = d
          hoverI = i
        }
      }
    }
    if (hoverI >= 0) {
      const i = hoverI
      const col = slot[i] === NEUTRAL ? PAPER : SLOTS[slot[i]]
      ring(SX[i], SY[i], 6, col, 0.95)
      const grouped = tau > T_CONV && tau < T_REL + 0.4
      const name = word[i]
      const right = SX[i] < W - 150
      const tx = SX[i] + (right ? 11 : -11)
      const al = right ? 'left' : 'right'
      if (name) text(ctx, name, tx, SY[i] - 4, { font: 'serif', italic: true, size: L.tight ? 13 : 16, color: PAPER, align: al })
      text(ctx, `TOKEN ${String(i).padStart(4, '0')}${grouped ? ' · ' + CLUSTERS[truth[i]].name.toUpperCase() : ''}`, tx, SY[i] + (name ? 10 : 3), { size: 8, color: rgba(PAPER, 0.7), tracking: 0.12, align: al })
    }
  }

  function resize(w: number, h: number) {
    W = w
    H = h
    L = layout()
  }

  // test route (?t=…): the host steps every frame up to t; everything here is a pure function of t
  const tTarget = env.params.has('t') ? Number(env.params.get('t')) : NaN

  return {
    resize,
    frame(t, dt) {
      orbit.update(dt)
      if (t < tTarget - 1e-6) return
      const loop = Math.floor(t / LOOP)
      const tau = t - loop * LOOP
      for (let i = 0; i < N; i++) posAt(i, tau, px, i * 3)
      ground(ctx, W, H, 'night')
      camera(t, tau)
      const first = loop === 0
      const boxA = first ? ease.inOutCubic(clamp(tau / 1.6)) : 1
      box(boxA)
      for (let q = 0; q < K; q++) {
        centroidAt(tau, q, cpos[q])
        const p = project(cpos[q][0], cpos[q][1], cpos[q][2])
        cscr[q].x = p.x
        cscr[q].y = p.y
        cscr[q].k = p.k
      }
      const dim = 1 - 0.35 * smoothstep(T_Q + 0.8, T_Q + 1.4, tau) * (1 - smoothstep(T_REL, T_REL + 1, tau))
      ctx.save()
      if (first) ctx.globalAlpha = smoothstep(0.2, 1.6, tau)
      points(tau, dim)
      ctx.restore()
      spokes(tau)
      const ca = smoothstep(IT0 - 0.2, IT0 + 0.3, tau) * (1 - smoothstep(T_REL, T_REL + 0.8, tau)) * (1 - 0.5 * smoothstep(T_Q, T_Q + 0.6, tau))
      centroids(tau, ca)
      const la = smoothstep(T_LAB, T_LAB + 0.9, tau) * (1 - smoothstep(T_REL, T_REL + 0.6, tau)) * (1 - 0.55 * smoothstep(T_Q, T_Q + 0.6, tau))
      labels(la)
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(PAPER, 0.45)
      cropMarks(ctx, L.m, L.m, W - L.m * 2, H - L.m * 2, L.tight ? 8 : 11)
      heading(tau)
      query(tau)
      analogy(tau)
      readouts(tau)
      caption()
      pointerMarks(tau, t)
      if (env.mode === 'full') env.setCursor(orbit.down ? 'grabbing' : ptr.over ? 'grab' : 'default')
    },
    pointer(p) {
      if (env.mode !== 'full') return
      ptr.x = p.x
      ptr.y = p.y
      ptr.over = p.type !== 'leave'
      ptr.touch = p.pointerType === 'touch'
      orbit.pointer(p)
    },
  }
}

export default create
