/*
 * ATTRACTOR — sensitive dependence on initial conditions. A bundle of
 * trajectories launched within a millionth of each other is integrated with
 * RK4 through a strange attractor and projected with a slowly orbiting
 * camera. For a while the bundle moves as one line; then it frays, and the
 * strands spread across the whole attractor. The spread is read out live
 * (Δ 0.000001 → 14.2) and plotted on a log axis, where exponential growth
 * is a straight line whose slope is the Lyapunov exponent.
 *
 * Lorenz → Aizawa → Halvorsen, 16 s each:
 *   arrival   the seed and its axes draw on                    0 – 1.2 s
 *   build     time-lapse while the bundle is still one line    1.2 – 8 s
 *   peak      the bundle frays and fills the attractor         8 – 12 s
 *   release   strands keep orbiting, then drain tail-first     12 – 16 s
 *
 * Full mode: drag to orbit the camera (with a little inertia); let go and it
 * drifts back to its slow orbit. A ghost shows the gesture once, early on.
 */

import { C, clamp, cropMarks, damp, ease, ground, lerp, rgba, rng, setFont, smoothstep, TAU, text } from '../kit'
import type { CreatePiece, PointerInfo } from '../types'

const CYCLE = 16
const T_IN = 1.2
const T_VIS = 8
const T_FULL = 12
const T_OUT = 14.4

type Deriv = (x: number, y: number, z: number, o: Float64Array) => void

interface Sys {
  name: string
  eq: string[]
  params: string
  f: Deriv
  h: number
  ic: [number, number, number]
  /** natural → world rotation (rows) */
  R: number[]
  tick: number
  fmt: (v: number) => string
  /** largest Lyapunov exponent (measured offline by renormalisation) */
  lyap: number
}

const S3 = 1 / Math.sqrt(3)
const S2 = 1 / Math.sqrt(2)
const S6 = 1 / Math.sqrt(6)
/** x → X, z → up, y → depth */
const Z_UP = [1, 0, 0, 0, 0, 1, 0, -1, 0]
/** the (1,1,1) diagonal → up */
const DIAG_UP = [S2, -S2, 0, S3, S3, S3, S6, S6, -2 * S6]

const SYSTEMS: Sys[] = [
  {
    name: 'Lorenz',
    eq: ['dx/dt = σ(y − x)', 'dy/dt = x(ρ − z) − y', 'dz/dt = xy − βz'],
    params: 'σ 10 · ρ 28 · β 8/3',
    f: (x, y, z, o) => {
      o[0] = 10 * (y - x)
      o[1] = x * (28 - z) - y
      o[2] = x * y - (8 / 3) * z
    },
    h: 0.005,
    ic: [1, 1, 1],
    R: Z_UP,
    tick: 10,
    fmt: (v) => v.toFixed(0),
    lyap: 0.905,
  },
  {
    name: 'Aizawa',
    eq: ['dx/dt = (z − b)x − dy', 'dy/dt = dx + (z − b)y', 'dz/dt = c + az − z³/3 − r²(1 + ez) + fzx³'],
    params: 'a .95 · b .7 · c .6 · d 3.5 · e .25 · f .1',
    f: (x, y, z, o) => {
      o[0] = (z - 0.7) * x - 3.5 * y
      o[1] = 3.5 * x + (z - 0.7) * y
      o[2] = 0.6 + 0.95 * z - (z * z * z) / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x * x * x
    },
    h: 0.01,
    ic: [0.1, 0, 0],
    R: Z_UP,
    tick: 0.5,
    fmt: (v) => v.toFixed(1),
    lyap: 0.117,
  },
  {
    name: 'Halvorsen',
    eq: ['dx/dt = −ax − 4y − 4z − y²', 'dy/dt = −ay − 4z − 4x − z²', 'dz/dt = −az − 4x − 4y − x²'],
    params: 'a 1.4 · cyclic in x → y → z',
    f: (x, y, z, o) => {
      o[0] = -1.4 * x - 4 * y - 4 * z - y * y
      o[1] = -1.4 * y - 4 * z - 4 * x - z * z
      o[2] = -1.4 * z - 4 * x - 4 * y - x * x
    },
    h: 0.005,
    ic: [1, 0, 0],
    R: DIAG_UP,
    tick: 5,
    fmt: (v) => v.toFixed(0),
    lyap: 0.666,
  },
]

/* ------------------------------------------------------------------ RK4 */

const K1 = new Float64Array(3)
const K2 = new Float64Array(3)
const K3 = new Float64Array(3)
const K4 = new Float64Array(3)
function rk4(f: Deriv, s: Float64Array, i: number, h: number) {
  const x = s[i]
  const y = s[i + 1]
  const z = s[i + 2]
  f(x, y, z, K1)
  f(x + 0.5 * h * K1[0], y + 0.5 * h * K1[1], z + 0.5 * h * K1[2], K2)
  f(x + 0.5 * h * K2[0], y + 0.5 * h * K2[1], z + 0.5 * h * K2[2], K3)
  f(x + h * K3[0], y + h * K3[1], z + h * K3[2], K4)
  s[i] = x + (h / 6) * (K1[0] + 2 * K2[0] + 2 * K3[0] + K4[0])
  s[i + 1] = y + (h / 6) * (K1[1] + 2 * K2[1] + 2 * K3[1] + K4[1])
  s[i + 2] = z + (h / 6) * (K1[2] + 2 * K2[2] + 2 * K3[2] + K4[2])
}

interface Bounds {
  min: number[]
  max: number[]
  c: number[]
  s: number
  size: number
}

function bounds(sys: Sys): Bounds {
  const s = new Float64Array(sys.ic)
  for (let k = 0; k < 4000; k++) rk4(sys.f, s, 0, sys.h)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let k = 0; k < 24000; k++) {
    rk4(sys.f, s, 0, sys.h)
    for (let j = 0; j < 3; j++) {
      if (s[j] < min[j]) min[j] = s[j]
      if (s[j] > max[j]) max[j] = s[j]
    }
  }
  const c = [0, 1, 2].map((j) => (min[j] + max[j]) / 2)
  const half = Math.max(...[0, 1, 2].map((j) => (max[j] - min[j]) / 2))
  return { min, max, c, s: 1 / half, size: half * 2 }
}

/** Δ in plain decimals while it is tiny — the point is to see the zeros. */
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
  private idle = 99
  private lx = 0
  private ly = 0
  private pyaw = 0
  private ppitch = 0
  pointer(p: PointerInfo) {
    if (p.type === 'down') {
      this.down = true
      this.used = true
      this.lx = p.x
      this.ly = p.y
      this.vyaw = this.vpitch = 0
    } else if (p.type === 'move' && this.down) {
      this.yaw += (p.x - this.lx) * 0.009
      this.pitch = clamp(this.pitch + (p.y - this.ly) * 0.006, -0.55, 0.75)
      this.lx = p.x
      this.ly = p.y
    } else if (p.type === 'up' || p.type === 'leave') {
      if (this.down) {
        // ease home the short way round
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
      this.pitch = clamp(this.pitch + this.vpitch * dt, -0.55, 0.75)
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

function fmtDelta(d: number) {
  if (d < 0.01) return d.toFixed(6)
  if (d < 1) return d.toFixed(4)
  if (d < 10) return d.toFixed(2)
  return d.toFixed(1)
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const small = env.mode === 'preview'
  const N = small ? 56 : 120
  const CAP = small ? 150 : 240
  const CAPL = small ? 900 : 1800
  const HIST = 900
  const B = SYSTEMS.map(bounds)
  // test route (?t=…): the host steps every frame up to t; only the last one needs drawing
  const tTarget = env.params.has('t') ? Number(env.params.get('t')) : NaN

  // ensemble state (natural coordinates) and trails (world coordinates)
  const st = new Float64Array(N * 3)
  const tr = new Float32Array(N * CAP * 3)
  const lt = new Float32Array(CAPL * 3)
  const PX = new Float32Array(N * CAP)
  const PY = new Float32Array(N * CAP)
  const LX = new Float32Array(CAPL)
  const LY = new Float32Array(CAPL)
  const hx = new Float32Array(HIST)
  const hy = new Float32Array(HIST)
  let nh = 0
  let hi = 0
  let tc = 0
  let li = 0
  let lc = 0
  let simT = 0
  let delta = 1e-6
  let delta0 = 1e-6
  let cycle = -1
  let sys = SYSTEMS[0]
  let bd = B[0]
  let seedNat = [0, 0, 0]
  let lambda = 0.9
  let tEnd = 1
  // wall time → sim time, tabulated per cycle
  const TAB = 16 * 60
  const simAt = new Float32Array(TAB + 1)

  let W = env.width
  let H = env.height
  const orbit = new Orbit()
  let hover = false

  function toWorld(s: Float64Array | number[], i: number, out: Float32Array, o: number) {
    const R = sys.R
    const x = (s[i] - bd.c[0]) * bd.s
    const y = (s[i + 1] - bd.c[1]) * bd.s
    const z = (s[i + 2] - bd.c[2]) * bd.s
    out[o] = R[0] * x + R[1] * y + R[2] * z
    out[o + 1] = R[3] * x + R[4] * y + R[5] * z
    out[o + 2] = R[6] * x + R[7] * y + R[8] * z
  }

  /** New cycle: a seed on the attractor, a ±1e-6 ball of neighbours, and a timing plan. */
  function reset(k: number) {
    cycle = k
    const si = k % SYSTEMS.length
    sys = SYSTEMS[si]
    bd = B[si]
    const r = rng(0x9e37 + k * 131)
    const s0 = new Float64Array(sys.ic)
    const pre = 3000 + Math.floor(r() * 4000)
    for (let n = 0; n < pre; n++) rk4(sys.f, s0, 0, sys.h)
    seedNat = [s0[0], s0[1], s0[2]]
    for (let i = 0; i < N; i++) {
      let dx = 0
      let dy = 0
      let dz = 0
      if (i > 0) {
        // uniform direction, radius 1e-6 (shell, so Δ₀ reads exactly)
        const u = r() * 2 - 1
        const a = r() * TAU
        const q = Math.sqrt(1 - u * u)
        dx = q * Math.cos(a) * 1e-6
        dy = q * Math.sin(a) * 1e-6
        dz = u * 1e-6
      }
      st[i * 3] = s0[0] + dx
      st[i * 3 + 1] = s0[1] + dy
      st[i * 3 + 2] = s0[2] + dz
    }
    // timing: run a few members ahead to find when the spread becomes visible / full
    const probe = new Float64Array(st.subarray(0, 12))
    const visAt = bd.size * 0.004
    const fullAt = bd.size * 0.3
    let tVis = -1
    let tFull = -1
    let t = 0
    for (let n = 0; n < 60000 && tFull < 0; n++) {
      for (let j = 0; j < 4; j++) rk4(sys.f, probe, j * 3, sys.h)
      t += sys.h
      let s2 = 0
      for (let j = 1; j < 4; j++) {
        const ex = probe[j * 3] - probe[0]
        const ey = probe[j * 3 + 1] - probe[1]
        const ez = probe[j * 3 + 2] - probe[2]
        s2 += ex * ex + ey * ey + ez * ez
      }
      const d = Math.sqrt(s2 / 3)
      if (tVis < 0 && d > visAt) tVis = t
      if (d > fullAt) tFull = t
    }
    if (tVis < 0) tVis = t * 0.7
    if (tFull < 0) tFull = t
    lambda = sys.lyap
    // rate profile: slow start, a time-lapse hump, then a steady viewing rate
    const rView = (tFull - tVis) / (T_FULL - T_VIS)
    const dtT = 1 / 60
    const base = (c: number) => rView * smoothstep(T_IN, T_IN + 1, c)
    const hump = (c: number) => smoothstep(T_IN + 0.4, T_IN + 2.6, c) * (1 - smoothstep(T_VIS - 2.2, T_VIS, c))
    let a0 = 0
    let a1 = 0
    for (let c = 0; c < T_VIS; c += dtT) {
      a0 += base(c) * dtT
      a1 += hump(c) * dtT
    }
    const A = Math.max(0, (tVis - a0) / a1)
    let acc = 0
    for (let n = 0; n <= TAB; n++) {
      const c = n * dtT
      simAt[n] = acc
      acc += (base(c) + A * hump(c)) * dtT
    }
    tEnd = simAt[Math.round(T_OUT * 60)] * 1.04
    simT = 0
    hi = tc = li = lc = 0
    nh = 0
    delta = delta0 = 1e-6
    for (let i = 0; i < N; i++) push(i)
    pushLead()
    hi = 1
    tc = 1
    li = 1
    lc = 1
  }

  function push(i: number) {
    toWorld(st, i * 3, tr, (i * CAP + hi) * 3)
  }
  function pushLead() {
    toWorld(st, 0, lt, li * 3)
  }

  function advance(c: number) {
    const f = Math.min(TAB, c * 60)
    const n0 = Math.floor(f)
    const target = lerp(simAt[n0], simAt[Math.min(TAB, n0 + 1)], f - n0)
    let steps = 0
    while (simT + sys.h <= target && steps < 420) {
      for (let i = 0; i < N; i++) rk4(sys.f, st, i * 3, sys.h)
      simT += sys.h
      for (let i = 0; i < N; i++) push(i)
      hi = (hi + 1) % CAP
      if (tc < CAP) tc++
      pushLead()
      li = (li + 1) % CAPL
      if (lc < CAPL) lc++
      steps++
    }
    // spread: rms distance from the lead
    let s2 = 0
    for (let i = 1; i < N; i++) {
      const ex = st[i * 3] - st[0]
      const ey = st[i * 3 + 1] - st[1]
      const ez = st[i * 3 + 2] - st[2]
      s2 += ex * ex + ey * ey + ez * ez
    }
    delta = Math.sqrt(s2 / (N - 1))
    if (steps > 0 && nh < HIST) {
      hx[nh] = simT
      hy[nh] = Math.log10(Math.max(1e-7, delta))
      nh++
    }
    return steps
  }

  /* ---------------------------------------------------------------- camera */

  let cx = 0
  let cy = 0
  let fpx = 1
  const Dcam = 4.2
  let m00 = 1
  let m01 = 0
  let m02 = 0
  let m10 = 0
  let m11 = 1
  let m12 = 0
  let m20 = 0
  let m21 = 0
  let m22 = 1
  /** The ghost demonstration of the orbit gesture (full mode, first cycle, until touched). */
  const GH0 = 2.4
  const GH1 = 5.0
  const ghostU = (t: number) => (env.mode !== 'full' || orbit.used || t < GH0 || t > GH1 + 2.5 ? -1 : (t - GH0) / (GH1 - GH0))
  function camera(t: number) {
    // the ghost turns the camera a little, as a drag would, then lets it drift back
    const gu = ghostU(t)
    const gy = gu < 0 ? 0 : 0.75 * ease.inOutCubic(clamp(gu)) * (1 - ease.inOutCubic(clamp((t - GH1) / 2.5)))
    const yaw = 0.6 + t * 0.12 + orbit.yaw + gy
    const pitch = clamp(0.28 + 0.1 * Math.sin(t * 0.17) + orbit.pitch, -0.3, 1.1)
    const cyw = Math.cos(yaw)
    const syw = Math.sin(yaw)
    const cp = Math.cos(pitch)
    const sp = Math.sin(pitch)
    // yaw around Y, then pitch around X
    m00 = cyw
    m01 = 0
    m02 = syw
    m10 = sp * syw
    m11 = cp
    m12 = -sp * cyw
    m20 = -cp * syw
    m21 = sp
    m22 = cp * cyw
  }
  const proj = { x: 0, y: 0, k: 1 }
  function project(x: number, y: number, z: number) {
    const X = m00 * x + m01 * y + m02 * z
    const Y = m10 * x + m11 * y + m12 * z
    const Z = m20 * x + m21 * y + m22 * z
    const k = fpx / (Dcam - Z)
    proj.x = cx + X * k
    proj.y = cy - Y * k
    proj.k = k / (fpx / Dcam)
    return proj
  }

  /* ---------------------------------------------------------------- layout */

  let L = layout()
  function layout() {
    const S = Math.min(W, H)
    /** cramped: previews and short or narrow viewers get condensed annotation */
    const tight = small || H < 440 || W < 360
    const portrait = !tight && H > W * 1.15
    const m = tight ? 12 : Math.round(clamp(S * 0.04, 16, 34))
    // squarer landscape frames: a smaller figure, up and to the right, clear of the readout
    const squarish = !tight && !portrait && W < H * 1.55
    const R = tight ? Math.min(W * (W > H * 1.6 ? 0.27 : 0.36), H * 0.4) : portrait ? Math.min(W * 0.47, H * 0.27) : squarish ? Math.min(W * 0.26, H * 0.34) : Math.min(W * 0.3, H * 0.4)
    const ax = portrait || (tight && W < H * 1.6) ? W * 0.5 : tight ? W * 0.6 : squarish ? W * 0.62 : W * 0.56
    const ay = tight ? H * 0.54 : portrait ? H * 0.46 : squarish ? H * 0.43 : H * 0.5
    return { S, portrait, tight, m, R, ax, ay }
  }

  function resize(w: number, h: number) {
    W = w
    H = h
    L = layout()
  }

  /* ---------------------------------------------------------------- drawing */

  const paper = '#EEF4F1'
  const lead = C.sky

  function drawAxes(a: number) {
    if (a <= 0) return
    const { min, max } = bd
    const w = new Float32Array(3)
    const nat = [0, 0, 0]
    const P = (x: number, y: number, z: number) => {
      nat[0] = x
      nat[1] = y
      nat[2] = z
      toWorld(nat, 0, w, 0)
      const p = project(w[0], w[1], w[2])
      return [p.x, p.y]
    }
    // axes through the natural origin, each spanning the attractor's extent
    const org = [0, 1, 2].map((j) => clamp(0, min[j], max[j]))
    const names = ['x', 'y', 'z']
    const placed: number[] = []
    const free = (x: number, y: number) => {
      for (let k = 0; k < placed.length; k += 2) if (Math.abs(placed[k] - x) < 22 && Math.abs(placed[k + 1] - y) < 12) return false
      placed.push(x, y)
      return true
    }
    ctx.lineWidth = 1
    for (let j = 0; j < 3; j++) {
      // grows outward from the origin both ways
      const g = ease.inOutCubic(a)
      const o = [...org]
      o[j] = lerp(org[j], min[j], g)
      const e = [...org]
      e[j] = lerp(org[j], max[j], g)
      const [x0, y0] = P(o[0], o[1], o[2])
      const [x1, y1] = P(e[0], e[1], e[2])
      ctx.strokeStyle = rgba(paper, 0.3)
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      // ticks perpendicular-ish (along screen normal), labels on a few
      const dx = x1 - x0
      const dy = y1 - y0
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      ctx.strokeStyle = rgba(paper, 0.3)
      ctx.beginPath()
      const first = Math.ceil(min[j] / sys.tick - 1e-9) * sys.tick
      const labels: [number, number, string][] = []
      let count = 0
      for (let v = first; v <= e[j] + 1e-9; v += sys.tick) {
        if (v < o[j] - 1e-9) continue
        const q = [...o]
        q[j] = v
        const [tx, ty] = P(q[0], q[1], q[2])
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx + nx * 4, ty + ny * 4)
        if (count % 2 === 0 && Math.abs(v) > 1e-9) labels.push([tx + nx * 12, ty + ny * 12, sys.fmt(v)])
        count++
      }
      ctx.stroke()
      if (!L.tight) for (const [lx, ly, s] of labels) if (free(lx, ly)) text(ctx, s, lx, ly, { size: 8, color: rgba(paper, 0.4 * a), align: 'center', baseline: 'middle', tracking: 0.06 })
      const nxp = x1 + (dx / len) * 12
      let nyp = y1 + (dy / len) * 12
      for (let k = 0; k < 3 && !free(nxp, nyp); k++) nyp += 14
      if (a > 0.6) text(ctx, names[j], nxp, nyp, { font: 'serif', italic: true, size: L.tight ? 12 : 15, color: rgba(paper, 0.7 * clamp((a - 0.6) / 0.4)), align: 'center', baseline: 'middle' })
    }
  }

  function drawTrails(c: number, alpha: number) {
    // how much of each trail is still showing (drains tail-first at the end)
    const drain = 1 - ease.inOutCubic(smoothstep(T_OUT, CYCLE - 0.15, c))
    const vis = Math.floor(tc * drain)
    const visL = Math.floor(lc * drain)
    if (vis < 2 && visL < 2) return
    // project
    for (let i = 0; i < N; i++) {
      for (let a = 0; a < vis; a++) {
        const k = (hi - 1 - a + CAP) % CAP
        const o = (i * CAP + k) * 3
        const p = project(tr[o], tr[o + 1], tr[o + 2])
        PX[i * CAP + a] = p.x
        PY[i * CAP + a] = p.y
      }
    }
    for (let a = 0; a < visL; a++) {
      const k = (li - 1 - a + CAPL) % CAPL
      const p = project(lt[k * 3], lt[k * 3 + 1], lt[k * 3 + 2])
      LX[a] = p.x
      LY[a] = p.y
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // the ensemble: four age bands, one path each
    const BANDS = 4
    const al = small ? [0.34, 0.2, 0.11, 0.05] : [0.3, 0.17, 0.09, 0.04]
    ctx.lineWidth = 1
    for (let b = 0; b < BANDS; b++) {
      const a0 = Math.floor((b * vis) / BANDS)
      const a1 = Math.min(vis - 1, Math.floor(((b + 1) * vis) / BANDS))
      if (a1 <= a0) continue
      ctx.strokeStyle = rgba(paper, al[b] * alpha)
      ctx.beginPath()
      for (let i = 1; i < N; i++) {
        const o = i * CAP
        ctx.moveTo(PX[o + a0], PY[o + a0])
        for (let a = a0 + 1; a <= a1; a++) ctx.lineTo(PX[o + a], PY[o + a])
      }
      ctx.stroke()
    }
    // the lead: a longer trail in the accent
    const LB = 6
    ctx.lineWidth = small ? 1.1 : 1.25
    for (let b = 0; b < LB; b++) {
      const a0 = Math.floor((b * visL) / LB)
      const a1 = Math.min(visL - 1, Math.floor(((b + 1) * visL) / LB))
      if (a1 <= a0) continue
      ctx.strokeStyle = rgba(lead, (0.95 - b * 0.16) * alpha)
      ctx.beginPath()
      ctx.moveTo(LX[a0], LY[a0])
      for (let a = a0 + 1; a <= a1; a++) ctx.lineTo(LX[a], LY[a])
      ctx.stroke()
    }
    // heads
    if (vis > 0 && drain > 0.05) {
      ctx.fillStyle = rgba(paper, 0.85 * alpha * drain)
      ctx.beginPath()
      for (let i = 1; i < N; i++) {
        const o = i * CAP
        ctx.moveTo(PX[o] + 1.1, PY[o])
        ctx.arc(PX[o], PY[o], 1.1, 0, TAU)
      }
      ctx.fill()
    }
  }

  function halo(s: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    text(ctx, s, x, y, o)
  }

  function chart(x: number, y: number, w: number, h: number, a: number) {
    if (a <= 0) return
    const y0 = -6.5
    const y1 = 2
    const X = (v: number) => x + (v / tEnd) * w
    const Y = (v: number) => y + h - ((v - y0) / (y1 - y0)) * h
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(paper, 0.35)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x + w, y + h)
    ctx.stroke()
    // decade ticks
    ctx.beginPath()
    for (let d = -6; d <= 2; d += 2) {
      ctx.moveTo(x, Y(d))
      ctx.lineTo(x - 4, Y(d))
    }
    for (let k = 0; k <= 8; k++) {
      ctx.moveTo(x + (k / 8) * w, y + h)
      ctx.lineTo(x + (k / 8) * w, y + h + 3)
    }
    ctx.stroke()
    for (let d = -6; d <= 2; d += 4) text(ctx, d === 0 ? '1' : `1e${d < 0 ? '−' : ''}${Math.abs(d)}`, x - 7, Y(d), { size: 7.5, color: rgba(paper, 0.5), align: 'right', baseline: 'middle', tracking: 0.04 })
    text(ctx, 'LOG Δ', x, y - 8, { size: 7.5, color: rgba(paper, 0.5), tracking: 0.14 })
    text(ctx, 'τ', x + w + 6, y + h, { font: 'serif', italic: true, size: 12, color: rgba(paper, 0.6), baseline: 'middle' })
    // Lyapunov slope (dashed)
    ctx.setLineDash([2, 3])
    ctx.strokeStyle = rgba(paper, 0.32)
    ctx.beginPath()
    const ly0 = Math.log10(delta0)
    const tHit = ((y1 - 0.4 - ly0) * Math.LN10) / lambda
    ctx.moveTo(X(0), Y(ly0))
    ctx.lineTo(X(Math.min(tEnd, tHit)), Y(ly0 + (Math.min(tEnd, tHit) * lambda) / Math.LN10))
    ctx.stroke()
    ctx.setLineDash([])
    // the measured spread
    if (nh > 1) {
      ctx.strokeStyle = lead
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.moveTo(X(hx[0]), Y(hy[0]))
      for (let k = 1; k < nh; k++) ctx.lineTo(X(Math.min(tEnd, hx[k])), Y(clamp(hy[k], y0, y1)))
      ctx.stroke()
      const ex = X(Math.min(tEnd, hx[nh - 1]))
      const ey = Y(clamp(hy[nh - 1], y0, y1))
      ctx.fillStyle = lead
      ctx.beginPath()
      ctx.arc(ex, ey, 2.2, 0, TAU)
      ctx.fill()
    }
    text(ctx, `SLOPE λ₁ ≈ ${lambda.toFixed(lambda < 0.2 ? 3 : 2)}`, x + w, y - 8, { size: 7.5, color: rgba(paper, 0.6), tracking: 0.12, align: 'right' })
    ctx.restore()
  }

  function chrome(c: number) {
    const { m, portrait, tight } = L
    const ink = rgba(paper, 0.85)
    const muted = rgba(paper, 0.5)
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(paper, 0.45)
    cropMarks(ctx, m, m, W - m * 2, H - m * 2, tight ? 8 : 11)

    const appear = ease.outCubic(smoothstep(0.1, 1.0, c)) * (1 - smoothstep(CYCLE - 0.9, CYCLE - 0.2, c))
    const ix = m + (tight ? 10 : 16)
    let iy = m + (tight ? 16 : 24)
    const si = cycle % SYSTEMS.length
    halo(`FIG. M.05 — SENSITIVE DEPENDENCE · ${String(si + 1).padStart(2, '0')} / 03`, ix, iy, { size: tight ? 8 : 9.5, color: muted, tracking: 0.14 })
    const ts = tight ? (H < 260 ? 19 : 22) : Math.round(clamp(L.S * 0.055, 28, 50))
    iy += ts + (tight ? 4 : 10)
    ctx.save()
    ctx.globalAlpha = appear
    const lift = (1 - appear) * 10
    setFont(ctx, { font: 'serif', size: ts })
    const nw = ctx.measureText(sys.name + ' ').width
    text(ctx, sys.name, ix, iy + lift, { font: 'serif', size: ts, color: paper })
    text(ctx, 'attractor', ix + nw, iy + lift, { font: 'serif', size: ts, italic: true, color: C.sage })
    if (!tight) {
      iy += 26
      for (const e of sys.eq) {
        text(ctx, e, ix, iy, { size: 10.5, color: ink, tracking: 0.04 })
        iy += 17
      }
      iy += 4
      text(ctx, sys.params, ix, iy, { size: 9, color: muted, tracking: 0.12, upper: false })
    } else if (!small && H >= 300) text(ctx, sys.params, ix, iy + 16, { size: 8.5, color: muted, tracking: 0.1 })
    ctx.restore()

    // spread readout
    const dv = fmtDelta(delta)
    if (tight) {
      const by = H - m - 12
      text(ctx, `Δ ${fmtDelta(delta0)} → ${dv}`, ix, by, { size: small ? 9 : 10.5, color: lead, tracking: 0.08 })
      if (!small && H >= 280 && W >= 420) chart(ix + 28, by - 62, Math.min(170, W * 0.3), 36, smoothstep(0.6, 1.4, c))
      if (W >= 480 || small) text(ctx, small ? `N ${N} · RK4` : `N ${N} · RK4 h ${sys.h} · τ ${simT.toFixed(1)}`, W - m - 10, by, { size: 8, color: muted, align: 'right', tracking: 0.12 })
      return
    }
    const cw = portrait ? Math.min(W - 2 * (ix + 10), 300) : Math.min(260, W * 0.2)
    const ch = portrait ? 74 : 78
    const bx = ix + 30
    const by = H - m - 30 - ch
    // headline number
    const big = Math.round(clamp(L.S * 0.04, 20, 34))
    const hy0 = by - 26
    text(ctx, 'SPREAD · RMS DISTANCE FROM THE LEAD', ix, hy0 - big - 16, { size: 8.5, color: muted, tracking: 0.14 })
    setFont(ctx, { size: big, weight: 500, tracking: 0.02 })
    const d0 = `Δ ${fmtDelta(delta0)}`
    const w0 = ctx.measureText(d0 + '  →  ').width
    text(ctx, d0 + '  →  ', ix, hy0, { size: big, color: rgba(paper, 0.55), tracking: 0.02, weight: 400 })
    text(ctx, dv, ix + w0, hy0, { size: big, color: lead, tracking: 0.02, weight: 500 })
    chart(bx, by, cw, ch, smoothstep(0.6, 1.4, c))

    // run sheet, bottom right
    const rate = (simAt[Math.min(TAB, Math.round(c * 60) + 1)] - simAt[Math.max(0, Math.round(c * 60) - 1)]) * 30
    const rows = [
      `N ${N} · |δ₀| = 1e−6`,
      `RK4 · h ${sys.h}`,
      `τ ${simT.toFixed(2).padStart(6, ' ')}`,
      `RATE ×${rate.toFixed(1)}`,
    ]
    const rx = W - m - 16
    let ry = H - m - 20 - (rows.length - 1) * 15
    if (portrait) ry = m + 24 + ts + 36
    for (const s of rows) {
      text(ctx, s, rx, ry, { size: 9, color: muted, align: 'right', tracking: 0.12 })
      ry += 15
    }
  }

  /** The orbit gesture: a ghost demonstration early on, and a hover hint. */
  function orbitMarks(t: number) {
    if (env.mode !== 'full') return
    const u = ghostU(t)
    if (u >= 0 && u <= 1) {
      const a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.88, 1, u))
      const rx = L.R * 0.95
      const ry = L.R * 0.24
      const ey = L.ay + L.R * (L.tight ? 0.6 : 0.78)
      const a0 = Math.PI * 0.92
      const a1 = Math.PI * 0.08
      const ang = lerp(a0, a1, ease.inOutCubic(u))
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(paper, 0.6)
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.ellipse(L.ax, ey, rx, ry, 0, a0, ang, true)
      ctx.stroke()
      ctx.setLineDash([])
      const dx = L.ax + Math.cos(ang) * rx
      const dy = ey + Math.sin(ang) * ry
      ctx.fillStyle = paper
      ctx.beginPath()
      ctx.arc(dx, dy, 3.5, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = rgba(paper, 0.8)
      ctx.beginPath()
      ctx.arc(dx, dy, 9, 0, TAU)
      ctx.stroke()
      if (ey + ry + 18 < H - L.m - 22) text(ctx, 'DRAG TO ORBIT', L.ax, ey + ry + 18, { size: 9.5, color: paper, tracking: 0.16, align: 'center' })
      else text(ctx, 'DRAG TO ORBIT', L.ax + rx + 14, ey + 3, { size: 9.5, color: paper, tracking: 0.16 })
      ctx.restore()
    }
    if (hover && !orbit.down && !orbit.used) text(ctx, 'DRAG TO ORBIT', W - L.m - (L.tight ? 10 : 16), L.m + (L.tight ? 16 : 24), { size: 8.5, color: rgba(paper, 0.7), tracking: 0.14, align: 'right' })
  }

  function seedMark(c: number) {
    const a = smoothstep(0.2, 0.7, c) * (1 - smoothstep(T_IN + 0.4, T_IN + 1.6, c))
    if (a <= 0.01) return
    const w = new Float32Array(3)
    toWorld(seedNat, 0, w, 0)
    const p = project(w[0], w[1], w[2])
    const ring = ease.outCubic(clamp((c - 0.2) / 1.0))
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = lead
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4 + ring * 14, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(p.x - 22, p.y)
    ctx.lineTo(p.x - 7, p.y)
    ctx.moveTo(p.x + 7, p.y)
    ctx.lineTo(p.x + 22, p.y)
    ctx.moveTo(p.x, p.y - 22)
    ctx.lineTo(p.x, p.y - 7)
    ctx.moveTo(p.x, p.y + 7)
    ctx.lineTo(p.x, p.y + 22)
    ctx.stroke()
    if (!small) {
      const s = `x₀ (${seedNat.map((v) => v.toFixed(2)).join(', ')})`
      text(ctx, s, p.x + 26, p.y - 8, { size: L.tight ? 8.5 : 9, color: paper, tracking: 0.06 })
      if (!L.tight) text(ctx, `${N} SEEDS WITHIN 1e−6`, p.x + 26, p.y + 6, { size: 8.5, color: rgba(paper, 0.6), tracking: 0.12 })
    }
    ctx.restore()
  }

  /* ---------------------------------------------------------------- ground */

  return {
    resize,
    frame(t, dt) {
      const k = Math.floor(t / CYCLE)
      if (k !== cycle) reset(k)
      const c = t - k * CYCLE
      advance(c)
      orbit.update(dt)
      if (t < tTarget - 1e-6) return
      ground(ctx, W, H, 'night')
      cx = L.ax
      cy = L.ay
      fpx = L.R * (Dcam - 1.1)
      camera(t)
      const axA = smoothstep(0.1, 1.2, c) * (1 - smoothstep(CYCLE - 1.4, CYCLE - 0.3, c))
      drawAxes(axA)
      drawTrails(c, 1)
      seedMark(c)
      chrome(c)
      orbitMarks(t)
      if (env.mode === 'full') env.setCursor(orbit.down ? 'grabbing' : hover ? 'grab' : 'default')
    },
    pointer(p) {
      if (env.mode !== 'full') return
      hover = p.type !== 'leave'
      orbit.pointer(p)
    },
  }
}

export default create
