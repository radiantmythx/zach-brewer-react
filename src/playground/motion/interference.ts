/*
 * INTERFERENCE — a ripple tank. Point sources emit circular waves; the
 * summed field is drawn as contour hairlines (marching squares on a grid,
 * six iso-levels: crests in ink, troughs in ocean), so constructive and
 * destructive interference shimmer as moiré. With two sources the nodal
 * lines — where the waves arrive in antiphase and cancel — are drawn in
 * moss; with three, cancellation shrinks to points (phase singularities),
 * found by the winding of the phasor around each grid cell.
 *
 *   0.3 s    S1 switches on; its wavefront spreads across still water
 *   2 s      S2 joins; nodal lines draw on as its front passes
 *   8.5 s    S2 detunes by 7 %: the nodal lines sweep (a beat), then lock
 *   12.5 s   S3 joins: a lattice of singularities — the peak
 *   18.5 s   S3 falls silent; the nodal lines return
 *   20.5 s   still water: the levels drop out one by one
 *
 * Full mode: every source has a handle — drag it to move the source; tap
 * open water to add one (up to four; a fifth replaces the oldest you added).
 * Until the viewer touches the tank, a ghost demonstrates both gestures.
 */

import { C, clamp, cropMarks, ease, lerp, mixHex, rgba, setFont, smoothstep, TAU, text } from '../kit'
import type { CreatePiece } from '../types'

const LOOP = 24
const F0 = 0.9
const DETUNE = 0.07
const T_S2 = 2.0
const T_BEAT = 8.5
const T_S3 = 12.5
const T_S3_OFF = 18.5
const T_CALM = 20.5
/** front speed as a multiple of the phase speed (an envelope, like a group velocity) */
const FRONT = 6

/** ∫ smoothstep(a, b, u) du from -∞ to x */
function ssInt(a: number, b: number, x: number) {
  if (x <= a) return 0
  if (x >= b) return (b - a) / 2 + (x - b)
  const u = (x - a) / (b - a)
  return (b - a) * (u * u * u - (u * u * u * u) / 2)
}
const beatBump = (x: number) => smoothstep(T_BEAT, T_BEAT + 1, x) - smoothstep(T_BEAT + 2, T_BEAT + 3, x)
const beatInt = (x: number) => ssInt(T_BEAT, T_BEAT + 1, x) - ssInt(T_BEAT + 2, T_BEAT + 3, x)

// sine table
const LUT_N = 4096
const LUT = new Float32Array(LUT_N + 1)
for (let i = 0; i <= LUT_N; i++) LUT[i] = Math.sin((i / LUT_N) * TAU)
const LUT_K = LUT_N / TAU
const OFF = LUT_N * 4096
const fsin = (x: number) => LUT[((x * LUT_K + OFF) | 0) & (LUT_N - 1)]
const fcos = (x: number) => LUT[((x * LUT_K + OFF + LUT_N / 4) | 0) & (LUT_N - 1)]

interface Src {
  label: string
  user: boolean
  /** loop-time on/off (autos) or absolute time (user) */
  tOn: number
  tOff: number
  phi: number
  /** Lissajous home */
  ax: number
  ay: number
  fx: number
  fy: number
  px: number
  py: number
  bx: number
  by: number
  /** live position */
  x: number
  y: number
  drag: boolean
  /** 0 = on its path, 1 = where the user left it */
  held: number
  hx: number
  hy: number
}

interface Live {
  x: number
  y: number
  k: number
  ph: number
  env: number
  front: number
  f: number
  s: Src
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const small = env.mode === 'preview'
  const FEW = [-0.62, -0.22, 0.22, 0.62]
  const MANY = [-0.76, -0.45, -0.15, 0.15, 0.45, 0.76]
  let LEVELS = small ? FEW : MANY
  /** cramped frames (previews, short or narrow viewers): condensed annotation */
  let tight = small
  const tTarget = env.params.has('t') ? Number(env.params.get('t')) : NaN

  let W = env.width
  let H = env.height
  let S = Math.min(W, H)
  let lam = 40
  let cell = 5
  let nx = 1
  let ny = 1
  let F = new Float32Array(1)
  let G = new Float32Array(1)
  let RE = new Float32Array(1)
  let IM = new Float32Array(1)
  let mmPerPx = 1
  let portrait = false
  let m = 16

  const autos: Src[] = [
    { label: 'S1', user: false, tOn: 0.3, tOff: 99, phi: 0, ax: 0.05, ay: 0.06, fx: 0.11, fy: 0.17, px: 0.3, py: 1.1, bx: -0.17, by: 0, x: 0, y: 0, drag: false, held: 0, hx: 0, hy: 0 },
    { label: 'S2', user: false, tOn: T_S2, tOff: 99, phi: 1.1, ax: 0.05, ay: 0.07, fx: 0.13, fy: 0.15, px: 2.2, py: 0.4, bx: 0.17, by: 0.02, x: 0, y: 0, drag: false, held: 0, hx: 0, hy: 0 },
    { label: 'S3', user: false, tOn: T_S3, tOff: T_S3_OFF, phi: 2.3, ax: 0.07, ay: 0.04, fx: 0.17, fy: 0.12, px: 1.3, py: 2.7, bx: 0.01, by: -0.25, x: 0, y: 0, drag: false, held: 0, hx: 0, hy: 0 },
  ]
  const users: Src[] = []
  let userLoop = -1
  let dragging: Src | null = null
  let downX = 0
  let downY = 0
  let downT = 0
  let moved = false
  let nowT = 0
  let tauNow = 0
  // pointer affordances
  const ptr = { x: 0, y: 0, over: false, down: false, touch: false }
  let hoverSrc: Src | null = null
  let touched = false
  let addedOnce = false
  /** the ghost demonstration's drag, while it runs */
  let ghost: { x: number; y: number; hx: number; hy: number; px: number; py: number; a: number } | null = null

  function resize(w: number, h: number) {
    W = w
    H = h
    S = Math.max(1, Math.min(w, h))
    portrait = H > W * 1.15
    tight = small || H < 440 || W < 360
    LEVELS = tight ? FEW : MANY
    m = tight ? 12 : Math.round(clamp(S * 0.04, 16, 34))
    // a floor on the wavelength so very short frames don't turn to grey mush
    lam = Math.max(S * (small ? 0.072 : 0.052), small ? 18 : 21)
    cell = clamp(lam / 9, 3, 8)
    // keep the grid under ~80k cells
    while ((W / cell) * (H / cell) > 80000) cell *= 1.08
    nx = Math.ceil(W / cell)
    ny = Math.ceil(H / cell)
    const n = (nx + 1) * (ny + 1)
    F = new Float32Array(n)
    G = new Float32Array(n)
    RE = new Float32Array(n)
    IM = new Float32Array(n)
    mmPerPx = 200 / S
  }
  resize(W, H)

  /** home position of an auto source at loop time τ (fractions of the frame) */
  function home(s: Src, t: number) {
    const bx = portrait ? s.by * 1.4 : s.bx
    const by = portrait ? s.bx * 1.25 : s.by
    const x = W * 0.5 + (bx + s.ax * Math.sin(s.fx * TAU * t + s.px)) * (portrait ? W : W * 0.9)
    const y = H * 0.53 + (by + s.ay * Math.sin(s.fy * TAU * t + s.py)) * (portrait ? H * 0.8 : H)
    return [x, y]
  }

  /* --------------------------------------------------------------- field */

  const live: Live[] = []

  // the ghost demonstration (full mode, first loop, until the viewer touches the tank)
  const GD0 = 4.4
  const GD1 = 7.4
  const GT0 = 7.5
  const GT1 = 8.5
  const ghostOn = (loop: number) => env.mode === 'full' && !touched && loop === 0
  /** 0 → 1 → 0: how far the ghost has dragged S2 out */
  function ghostDrag(tau: number, loop: number) {
    if (!ghostOn(loop) || tau < GD0 || tau > GD1) return 0
    const u = (tau - GD0) / (GD1 - GD0)
    return ease.inOutCubic(smoothstep(0.08, 0.42, u)) * (1 - ease.inOutCubic(smoothstep(0.58, 0.92, u)))
  }

  function gather(t: number, tau: number, loop: number, dt: number) {
    live.length = 0
    const c = lam * F0 // phase speed, px/s
    const cf = c * FRONT // the switch-on front runs ahead of the crests
    ghost = null
    for (const s of autos) {
      const [x, y] = home(s, t)
      if (s.label === 'S2' && !s.drag) {
        // ghost demonstration: S2 is dragged out into open water and eased back
        const g = ghostDrag(tau, loop)
        if (g > 0) {
          const ox = portrait ? -W * 0.22 : -W * 0.06
          const oy = portrait ? -H * 0.04 : -H * 0.24
          s.x = x + ox * g
          s.y = y + oy * g
          ghost = { x: s.x, y: s.y, hx: x, hy: y, px: x + ox, py: y + oy, a: smoothstep(0, 0.1, (tau - GD0) / (GD1 - GD0)) * (1 - smoothstep(0.85, 1, (tau - GD0) / (GD1 - GD0))) }
          const e = smoothstep(s.tOn, s.tOn + 0.4, tau)
          live.push({ x: s.x, y: s.y, k: (TAU * F0) / c, ph: TAU * F0 * (tau - s.tOn) - s.phi, env: e, front: cf * (tau - s.tOn), f: F0, s })
          continue
        }
      }
      if (s.drag) s.held = 1
      else s.held = Math.max(0, s.held - (dt > 0 ? dt / 2.5 : 0))
      const k = ease.inOutCubic(s.held)
      if (!s.drag) {
        s.x = lerp(x, s.hx, k)
        s.y = lerp(y, s.hy, k)
      }
      const e = smoothstep(s.tOn, s.tOn + 0.4, tau) * (1 - smoothstep(s.tOff, s.tOff + 1.2, tau))
      if (e <= 0.001) continue
      let f = F0
      let ph = TAU * F0 * (tau - s.tOn)
      if (s.label === 'S2') {
        f = F0 * (1 + DETUNE * beatBump(tau))
        ph = TAU * F0 * (tau - s.tOn + DETUNE * beatInt(tau))
      }
      live.push({ x: s.x, y: s.y, k: (TAU * f) / c, ph: ph - s.phi, env: e, front: cf * (tau - s.tOn), f, s })
    }
    if (userLoop === loop)
      for (const s of users) {
        const e = smoothstep(s.tOn, s.tOn + 0.4, t) * (1 - smoothstep(T_CALM, T_CALM + 1, tau))
        if (e <= 0.001) continue
        if (!s.drag) {
          s.x = s.hx
          s.y = s.hy
        }
        live.push({ x: s.x, y: s.y, k: (TAU * F0) / c, ph: TAU * F0 * (t - s.tOn) - s.phi, env: e, front: cf * (t - s.tOn), f: F0, s })
      }
  }

  /** Evaluate the normalised field (and the nodal/phasor helpers) on the grid. */
  function evaluate(tau: number, wantNodal: boolean, wantPhasor: boolean) {
    const calm = 1 - smoothstep(T_CALM, T_CALM + 2.6, tau)
    const L = live.length
    const fr = lam * 2.2
    const n1 = live.find((l) => l.s.label === 'S1')
    const n2 = live.find((l) => l.s.label === 'S2')
    for (let j = 0; j <= ny; j++) {
      const y = j * cell
      for (let i = 0; i <= nx; i++) {
        const x = i * cell
        let num = 0
        let den = 1e-6
        let re = 0
        let im = 0
        let th1 = 0
        let th2 = 0
        let g1 = 0
        let g2 = 0
        for (let q = 0; q < L; q++) {
          const s = live[q]
          const dx = x - s.x
          const dy = y - s.y
          const r = Math.sqrt(dx * dx + dy * dy)
          const a = s.env / Math.sqrt(1 + r / lam)
          den += a
          // the wave exists only inside its front
          const u = (s.front - r) / fr
          if (u <= 0) continue
          const g = u >= 1 ? 1 : u * u * (3 - 2 * u)
          const th = s.k * r - s.ph
          const sn = fsin(th)
          num += g * a * sn
          if (wantPhasor) {
            re += g * a * fcos(th)
            im += g * a * sn
          }
          if (s === n1) {
            th1 = th
            g1 = g
          } else if (s === n2) {
            th2 = th
            g2 = g
          }
        }
        const o = j * (nx + 1) + i
        F[o] = (num / den) * calm
        if (wantNodal) G[o] = g1 > 0.5 && g2 > 0.5 ? fcos((th1 - th2) * 0.5) : NaN
        if (wantPhasor) {
          RE[o] = re
          IM[o] = im
        }
      }
    }
  }

  /* -------------------------------------------------------- marching squares */

  function contour(V: Float32Array, levels: number[], paths: Path2D[]) {
    const stride = nx + 1
    const c = cell
    const nl = levels.length
    for (let j = 0; j < ny; j++) {
      const y0 = j * c
      const row = j * stride
      for (let i = 0; i < nx; i++) {
        const o = row + i
        const v00 = V[o]
        const v10 = V[o + 1]
        const v01 = V[o + stride]
        const v11 = V[o + stride + 1]
        // NaN marks cells outside the region where a contour means anything
        if (v00 !== v00 || v10 !== v10 || v01 !== v01 || v11 !== v11) continue
        const x0 = i * c
        let lo = v00
        let hi = v00
        if (v10 < lo) lo = v10
        if (v10 > hi) hi = v10
        if (v01 < lo) lo = v01
        if (v01 > hi) hi = v01
        if (v11 < lo) lo = v11
        if (v11 > hi) hi = v11
        for (let l = 0; l < nl; l++) {
          const L = levels[l]
          if (L <= lo || L > hi) continue
          const p = paths[l]
          const idx = (v00 > L ? 8 : 0) | (v10 > L ? 4 : 0) | (v11 > L ? 2 : 0) | (v01 > L ? 1 : 0)
          // edge crossings: T(op), R(ight), B(ottom), L(eft)
          const x1 = x0 + c
          const y1 = y0 + c
          switch (idx) {
            case 1:
            case 14:
              p.moveTo(x0, y0 + (c * (L - v00)) / (v01 - v00))
              p.lineTo(x0 + (c * (L - v01)) / (v11 - v01), y1)
              break
            case 2:
            case 13:
              p.moveTo(x0 + (c * (L - v01)) / (v11 - v01), y1)
              p.lineTo(x1, y0 + (c * (L - v10)) / (v11 - v10))
              break
            case 3:
            case 12:
              p.moveTo(x0, y0 + (c * (L - v00)) / (v01 - v00))
              p.lineTo(x1, y0 + (c * (L - v10)) / (v11 - v10))
              break
            case 4:
            case 11:
              p.moveTo(x0 + (c * (L - v00)) / (v10 - v00), y0)
              p.lineTo(x1, y0 + (c * (L - v10)) / (v11 - v10))
              break
            case 6:
            case 9:
              p.moveTo(x0 + (c * (L - v00)) / (v10 - v00), y0)
              p.lineTo(x0 + (c * (L - v01)) / (v11 - v01), y1)
              break
            case 7:
            case 8:
              p.moveTo(x0, y0 + (c * (L - v00)) / (v01 - v00))
              p.lineTo(x0 + (c * (L - v00)) / (v10 - v00), y0)
              break
            case 5:
            case 10: {
              const tx = x0 + (c * (L - v00)) / (v10 - v00)
              const ry = y0 + (c * (L - v10)) / (v11 - v10)
              const bx = x0 + (c * (L - v01)) / (v11 - v01)
              const ly = y0 + (c * (L - v00)) / (v01 - v00)
              const centre = (v00 + v10 + v01 + v11) * 0.25 > L
              if ((idx === 5) === centre) {
                p.moveTo(x0, ly)
                p.lineTo(tx, y0)
                p.moveTo(bx, y1)
                p.lineTo(x1, ry)
              } else {
                p.moveTo(tx, y0)
                p.lineTo(x1, ry)
                p.moveTo(x0, ly)
                p.lineTo(bx, y1)
              }
              break
            }
          }
        }
      }
    }
  }

  /** Phase singularities: cells around which the phasor winds once (±1). */
  const SING = new Float32Array(4096)
  function singularities() {
    let n = 0
    const stride = nx + 1
    const quad = (re: number, im: number) => (re >= 0 ? (im >= 0 ? 0 : 3) : im >= 0 ? 1 : 2)
    for (let j = 0; j < ny && n < 2040; j++) {
      for (let i = 0; i < nx; i++) {
        const o = j * stride + i
        let wind = 0
        let q0 = quad(RE[o], IM[o])
        const first = q0
        let weak = false
        for (let e = 0; e < 4; e++) {
          const a = e === 0 ? o : e === 1 ? o + 1 : e === 2 ? o + stride + 1 : o + stride
          const b = e === 0 ? o + 1 : e === 1 ? o + stride + 1 : e === 2 ? o + stride : o
          if (Math.abs(RE[a]) + Math.abs(IM[a]) < 1e-5) weak = true
          const q1 = e === 3 ? first : quad(RE[b], IM[b])
          let d = (q1 - q0 + 4) % 4
          if (d === 3) d = -1
          else if (d === 2) d = RE[a] * IM[b] - IM[a] * RE[b] >= 0 ? 2 : -2
          wind += d
          q0 = q1
        }
        if (!weak && (wind === 4 || wind === -4)) {
          SING[n * 2] = (i + 0.5) * cell
          SING[n * 2 + 1] = (j + 0.5) * cell * (wind > 0 ? 1 : -1)
          n++
          if (n >= 2040) break
        }
      }
    }
    return n
  }

  /* --------------------------------------------------------------- chrome */

  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.92)
    ctx.strokeText(o?.upper ? str.toUpperCase() : str, x, y)
    text(ctx, str, x, y, o)
  }

  function plate(x: number, y: number, w: number, h: number) {
    ctx.fillStyle = rgba(C.paper, 0.93)
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = rgba(C.ink, 0.22)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h))
  }

  function sourceMark(l: Live, tau: number, t: number) {
    const s = l.s
    const a = clamp(l.env * 1.5) * (1 - smoothstep(T_CALM + 1.4, T_CALM + 3, tau))
    if (a <= 0.005) return
    const r = tight ? 5 : 7
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(s.x, s.y, r + 3, 0, TAU)
    ctx.fill()
    if (env.mode === 'full') {
      // the handle's puck: clear water around the source, so it reads as something to grab
      ctx.fillStyle = rgba(C.paper, 0.78)
      ctx.beginPath()
      ctx.arc(s.x, s.y, hitR(), 0, TAU)
      ctx.fill()
    }
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(s.x, s.y, r * 0.55, 0, TAU)
    ctx.moveTo(s.x - r - 4, s.y)
    ctx.lineTo(s.x + r + 4, s.y)
    ctx.moveTo(s.x, s.y - r - 4)
    ctx.lineTo(s.x, s.y + r + 4)
    ctx.stroke()
    // switch-on pulse
    const age = s.user ? t - s.tOn : tau - s.tOn
    if (age >= 0 && age < 1) {
      ctx.strokeStyle = rgba(C.ink, 1 - age)
      ctx.beginPath()
      ctx.arc(s.x, s.y, r + ease.outCubic(age) * 26, 0, TAU)
      ctx.stroke()
    }
    // label + phasor dial
    const lx = s.x + r + 10
    const ly = s.y - r - 8
    halo(s.label, lx, ly, { size: tight ? 9 : 10.5, color: C.ink, tracking: 0.08, weight: 500 })
    if (!small) {
      const dial = tight ? 6 : 7
      const dx = lx + 32
      const dy = ly - 4
      ctx.fillStyle = rgba(C.paper, 0.9)
      ctx.beginPath()
      ctx.arc(dx, dy, dial + 2, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = rgba(C.ink, 0.45)
      ctx.beginPath()
      ctx.arc(dx, dy, dial, 0, TAU)
      for (let q = 0; q < 4; q++) {
        const a2 = (q * Math.PI) / 2
        ctx.moveTo(dx + Math.cos(a2) * dial, dy + Math.sin(a2) * dial)
        ctx.lineTo(dx + Math.cos(a2) * (dial + 2.5), dy + Math.sin(a2) * (dial + 2.5))
      }
      ctx.stroke()
      const ang = -l.ph
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(dx, dy)
      ctx.lineTo(dx + Math.cos(ang) * dial, dy + Math.sin(ang) * dial)
      ctx.stroke()
      const deg = ((((-l.ph * 180) / Math.PI) % 360) + 360) % 360
      if (!tight) halo(`${l.f.toFixed(2)} HZ · φ ${deg.toFixed(0).padStart(3, '0')}°`, lx, ly + 17, { size: 8.5, color: C.ink2, tracking: 0.1 })
    }
    // the handle: a dashed ring you can grab (solid when hovered or held)
    if (env.mode === 'full') {
      const hot = s === hoverSrc || s.drag
      const hr = hitR()
      ctx.strokeStyle = rgba(C.ink, hot ? 0.9 : 0.6)
      ctx.lineWidth = 1
      if (!hot) ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(s.x, s.y, hr, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      if (hot) {
        // four grip ticks
        ctx.beginPath()
        for (let q = 0; q < 4; q++) {
          const a2 = Math.PI / 4 + (q * Math.PI) / 2
          ctx.moveTo(s.x + Math.cos(a2) * (hr - 3), s.y + Math.sin(a2) * (hr - 3))
          ctx.lineTo(s.x + Math.cos(a2) * (hr + 3), s.y + Math.sin(a2) * (hr + 3))
        }
        ctx.stroke()
        if (s.drag) halo(`${(s.x * mmPerPx).toFixed(1)}, ${(s.y * mmPerPx).toFixed(1)} MM`, s.x, s.y + hr + 14, { size: 8.5, color: C.ink, align: 'center', tracking: 0.08 })
        else halo('DRAG', s.x, s.y + hr + 14, { size: 8.5, color: C.ink, align: 'center', tracking: 0.16 })
      }
    }
    ctx.restore()
  }

  const hitR = () => (ptr.touch ? 30 : 20)

  /** Ghost demonstration and hover previews, drawn over the tank. */
  function affordances(tau: number) {
    if (env.mode !== 'full') return
    const loop = Math.floor(nowT / LOOP)
    if (ghost && ghost.a > 0.01) {
      ctx.save()
      ctx.globalAlpha = ghost.a
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.moveTo(ghost.hx, ghost.hy)
      ctx.lineTo(ghost.px, ghost.py)
      ctx.stroke()
      ctx.setLineDash([])
      // the "finger"
      ctx.fillStyle = rgba(C.ink, 0.85)
      ctx.beginPath()
      ctx.arc(ghost.x + 9, ghost.y + 11, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ghost.x + 9, ghost.y + 11, 9, 0, TAU)
      ctx.stroke()
      const lab = 'DRAG A SOURCE'
      setFont(ctx, { size: 9.5, tracking: 0.16 })
      const lw = ctx.measureText(lab).width
      const lx = clamp(ghost.x + 26, m + 4, W - m - lw - 4)
      halo(lab, lx, ghost.y + 30, { size: 9.5, color: C.ink, tracking: 0.16 })
      ctx.restore()
    }
    if (ghostOn(loop) && tau > GT0 && tau < GT1) {
      // a ghost tap on open water
      const u = (tau - GT0) / (GT1 - GT0)
      const x = portrait ? W * 0.72 : W * 0.5
      const y = portrait ? H * 0.5 : H * 0.22
      const a = smoothstep(0, 0.15, u) * (1 - smoothstep(0.75, 1, u))
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 4 + ease.outCubic(clamp((u - 0.25) / 0.6)) * 22, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, TAU)
      ctx.fill()
      halo('TAP TO ADD ONE', x, y + 40, { size: 9.5, color: C.ink, tracking: 0.16, align: 'center' })
      ctx.restore()
    }
    // hover over open water: where a tap would put a new source
    if (ptr.over && !ptr.down && !hoverSrc && !ptr.touch && tau < T_CALM) {
      const full = live.length >= 4
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.arc(ptr.x, ptr.y, 9, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(ptr.x - 4, ptr.y)
      ctx.lineTo(ptr.x + 4, ptr.y)
      ctx.moveTo(ptr.x, ptr.y - 4)
      ctx.lineTo(ptr.x, ptr.y + 4)
      ctx.stroke()
      if (!addedOnce || full) halo(full ? 'TAP TO REPLACE THE OLDEST' : 'TAP TO ADD A SOURCE', ptr.x + 15, ptr.y + 3, { size: 8.5, color: C.ink, tracking: 0.14 })
    }
  }

  function lambdaDim(src: Live, other: Live | undefined) {
    // a fixed dimension, two to three wavelengths out from S1, pointing away from S2
    // away from the other source, on the side away from the source's own label (upper right)
    let ang = Math.PI * 0.78
    if (other) {
      const base = Math.atan2(src.y - other.y, src.x - other.x)
      const score = (a: number) => Math.cos(a) * 0.7 - Math.sin(a) * 0.7
      ang = score(base + 0.55) < score(base - 0.55) ? base + 0.55 : base - 0.55
    }
    const lamPx = TAU / src.k
    const r0 = lamPx * 2.2
    const ux = Math.cos(ang)
    const uy = Math.sin(ang)
    const x0 = src.x + ux * r0
    const y0 = src.y + uy * r0
    const x1 = src.x + ux * (r0 + lamPx)
    const y1 = src.y + uy * (r0 + lamPx)
    if (Math.min(x0, x1) < m + 8 || Math.max(x0, x1) > W - m - 8 || Math.min(y0, y1) < m + 8 || Math.max(y0, y1) > H - m - 8) return
    const vis = smoothstep(r0 + lamPx * 1.5, r0 + lamPx * 3, src.front) * (1 - smoothstep(T_CALM, T_CALM + 1, tauNow))
    if (vis <= 0.01) return
    ctx.save()
    ctx.globalAlpha = vis
    const nx2 = -uy * 12
    const ny2 = ux * 12
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + nx2 * 1.3, y0 + ny2 * 1.3)
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 + nx2 * 1.3, y1 + ny2 * 1.3)
    ctx.moveTo(x0 + nx2, y0 + ny2)
    ctx.lineTo(x1 + nx2, y1 + ny2)
    for (const [px2, py2, sg] of [
      [x0 + nx2, y0 + ny2, 1],
      [x1 + nx2, y1 + ny2, -1],
    ] as const) {
      ctx.moveTo(px2 + (ux * 5 - uy * 2.5) * sg, py2 + (uy * 5 + ux * 2.5) * sg)
      ctx.lineTo(px2, py2)
      ctx.lineTo(px2 + (ux * 5 + uy * 2.5) * sg, py2 + (uy * 5 - ux * 2.5) * sg)
    }
    ctx.stroke()
    const mx = (x0 + x1) / 2 + nx2 * 2.1
    const my = (y0 + y1) / 2 + ny2 * 2.1
    halo(`λ ${(lamPx * mmPerPx).toFixed(1)} MM`, mx, my, { size: tight ? 8 : 9.5, color: C.ink, align: 'center', baseline: 'middle', tracking: 0.08 })
    ctx.restore()
  }

  const TITLES: [number, string, string][] = [
    [0, 'One', 'source'],
    [T_S2, 'Two', 'sources'],
    [T_BEAT, 'A', 'beat'],
    [T_S3, 'Three', 'sources'],
    [T_S3_OFF, 'Nodal', 'lines'],
    [T_CALM, 'Still', 'water'],
  ]

  function chrome(tau: number, nSing: number, nodalA: number, singA: number) {
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.55)
    cropMarks(ctx, m, m, W - m * 2, H - m * 2, tight ? 8 : 11)

    let ti = 0
    for (let k = 0; k < TITLES.length; k++) if (tau >= TITLES[k][0]) ti = k
    const [t0, ta, tb] = TITLES[ti]
    const ix = m + (tight ? 10 : 16)
    let iy = m + (tight ? 16 : 24)
    const ts = tight ? 21 : Math.round(clamp(S * 0.05, 26, 46))
    {
      // a paper plate under the heading, like a drawing's label
      setFont(ctx, { size: tight ? 8 : 9.5, tracking: 0.14 })
      const kw = ctx.measureText('FIG. M.11 — INTERFERENCE · RIPPLE TANK').width
      setFont(ctx, { font: 'serif', size: ts })
      const tw = ctx.measureText('Three sources').width + ts * 0.3
      const pw = Math.max(kw, tw) + (tight ? 16 : 26)
      const ph = (tight ? 16 : 24) + ts + (tight ? 12 : 20)
      plate(ix - (tight ? 8 : 13), iy - (tight ? 14 : 20), pw, ph)
    }
    text(ctx, 'FIG. M.11 — INTERFERENCE · RIPPLE TANK', ix, iy, { size: tight ? 8 : 9.5, color: C.muted, tracking: 0.14 })
    iy += ts + (tight ? 4 : 10)
    const ap = ease.outCubic(clamp((tau - t0) / 0.7))
    ctx.save()
    ctx.globalAlpha = ap
    setFont(ctx, { font: 'serif', size: ts })
    const w0 = ctx.measureText(ta + ' ').width
    text(ctx, ta, ix, iy + (1 - ap) * 8, { font: 'serif', size: ts, color: C.ink })
    text(ctx, tb, ix + w0, iy + (1 - ap) * 8, { font: 'serif', size: ts, italic: true, color: C.moss })
    ctx.restore()

    // lab sheet
    const n = live.length
    const s1 = live.find((l) => l.s.label === 'S1')
    const s2 = live.find((l) => l.s.label === 'S2')
    const rows: [string, string][] = []
    rows.push(['SOURCES', String(n)])
    rows.push(['λ', `${(lam * mmPerPx).toFixed(1)} MM`])
    rows.push(['f', s2 && Math.abs(s2.f - F0) > 0.001 ? `${F0.toFixed(2)} / ${s2.f.toFixed(2)} HZ` : `${F0.toFixed(2)} HZ`])
    if (s1 && s2) {
      const d = Math.hypot(s1.x - s2.x, s1.y - s2.y) * mmPerPx
      rows.push(['S1–S2', `${d.toFixed(1)} MM · ${(d / (lam * mmPerPx)).toFixed(2)} λ`])
      const dphi = ((((s1.ph - s2.ph) * 180) / Math.PI) % 360 + 360) % 360
      rows.push(['Δφ', `${dphi.toFixed(0).padStart(3, '0')}°`])
    }
    if (singA > 0.5) rows.push(['SINGULAR', String(nSing)])
    else if (nodalA > 0.5) rows.push(['NODAL', 'Δθ = (2n + 1)π'])
    if (!tight) rows.push(['GRID', `${nx} × ${ny} · ${LEVELS.length} LEVELS`])
    const shown = small || H < 260 ? rows.slice(0, 3) : tight ? rows.slice(0, 4) : rows
    const rowH = tight ? 13 : 15
    const lab = tight ? 50 : 66
    const val = tight ? 92 : 150
    const bw = lab + val
    const bh = rowH * shown.length
    const legend = !tight || (W >= 700 && H >= 280)
    const cap = W < 1180 ? `MARCHING SQUARES · ${LEVELS.length} ISO-LEVELS` : `MARCHING SQUARES ON A ${nx} × ${ny} GRID · ${LEVELS.length} ISO-LEVELS · CRESTS, TROUGHS, NODAL LINES`
    setFont(ctx, { size: 9, tracking: 0.14 })
    const cw = Math.max(tight ? 0 : ctx.measureText(cap).width, 330)
    // stack the lab sheet above the legend when they would meet
    const stack = legend && m + cw + 40 > W - m - (tight ? 8 : 14) - bw
    const bx = W - m - (tight ? 8 : 14) - bw
    const by = H - m - (tight ? 8 : 14) - bh - (stack ? (tight ? 30 : 58) : 0)
    ctx.fillStyle = rgba(C.paper, 0.93)
    ctx.fillRect(bx, by, bw, bh)
    ctx.strokeStyle = rgba(C.ink, 0.7)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw), Math.round(bh))
    ctx.strokeStyle = rgba(C.ink, 0.18)
    ctx.beginPath()
    for (let k = 1; k < shown.length; k++) {
      const yy = Math.round(by + k * rowH) + 0.5
      ctx.moveTo(bx, yy)
      ctx.lineTo(bx + bw, yy)
    }
    ctx.moveTo(Math.round(bx + lab) + 0.5, by)
    ctx.lineTo(Math.round(bx + lab) + 0.5, by + bh)
    ctx.stroke()
    const fs = tight ? 7.5 : 8.5
    shown.forEach(([l, v], k) => {
      const yy = by + k * rowH + rowH / 2 + 0.5
      text(ctx, l, bx + 6, yy, { size: fs, color: C.muted, baseline: 'middle', tracking: 0.14 })
      text(ctx, v, bx + lab + 6, yy, { size: fs + 0.5, color: C.ink, baseline: 'middle', tracking: 0.06 })
    })

    // legend + caption, bottom-left (just the key when cramped)
    if (legend) {
      const lx = m + (tight ? 10 : 16)
      const ly = H - m - (tight ? 12 : 16)
      if (tight) plate(lx - 8, ly - 15, cw + 16, 22)
      else {
        plate(lx - 10, ly - 36, cw + 20, 46)
        text(ctx, cap, lx, ly, { size: 9, color: C.muted, tracking: 0.14 })
      }
      const ky = tight ? ly : ly - 20
      const key: [string, string, number][] = [
        [C.ink, 'CREST', 1],
        [C.ocean, 'TROUGH', 1],
        [C.moss, 'NODAL', 1.6],
      ]
      let kx = lx
      for (const [col, name, w] of key) {
        ctx.strokeStyle = col
        ctx.lineWidth = w
        ctx.beginPath()
        ctx.moveTo(kx, ky - 3)
        ctx.lineTo(kx + 18, ky - 3)
        ctx.stroke()
        halo(name, kx + 24, ky, { size: 8.5, color: C.ink2, tracking: 0.14 })
        setFont(ctx, { size: 8.5, tracking: 0.14 })
        kx += 24 + ctx.measureText(name).width + 18
      }
      ctx.fillStyle = C.lagoon
      ctx.beginPath()
      ctx.arc(kx + 4, ky - 3, 2.4, 0, TAU)
      ctx.fill()
      halo('SINGULARITY', kx + 12, ky, { size: 8.5, color: C.ink2, tracking: 0.14 })
      ctx.lineWidth = 1
    }

  }

  /* --------------------------------------------------------------- frame */

  let lastLoop = 0

  return {
    resize,
    frame(t, dt) {
      nowT = t
      const loop = Math.floor(t / LOOP)
      const tau = t - loop * LOOP
      tauNow = tau
      if (loop !== lastLoop) {
        lastLoop = loop
        users.length = 0
        userLoop = -1
      }
      gather(t, tau, loop, dt)
      if (t < tTarget - 1e-6) return
      const n3 = live.length >= 3
      const singA = n3 ? clamp(Math.min(...live.map((l) => l.env)) * 1.2) : 0
      const nodalA = live.some((l) => l.s.label === 'S1') && live.some((l) => l.s.label === 'S2') ? 1 - singA : 0
      evaluate(tau, nodalA > 0.01, singA > 0.01)

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, W, H)
      // contours: crests in ink, troughs in ocean
      const paths = LEVELS.map(() => new Path2D())
      contour(F, LEVELS, paths)
      // keep strokes at one device pixel or less (the fast hairline path), and opaque:
      // translucent hairlines double-hit at every cell boundary and print the grid
      const hairW = Math.min(small ? 0.8 : 0.9, 1 / env.dpr)
      ctx.lineWidth = hairW
      ctx.lineCap = 'butt'
      LEVELS.forEach((L, k) => {
        const mag = Math.abs(L)
        ctx.strokeStyle = L > 0 ? mixHex(C.paper, C.ink, 0.42 + 0.35 * mag) : mixHex(C.paper, C.ocean, 0.4 + 0.4 * mag)
        ctx.stroke(paths[k])
      })
      // nodal lines
      if (nodalA > 0.01) {
        const np = [new Path2D()]
        contour(G, [0], np)
        ctx.strokeStyle = mixHex(C.paper, C.moss, 0.95 * nodalA * (1 - smoothstep(T_CALM, T_CALM + 1.4, tau)))
        // emphasis as two offset hairlines: wide strokes over thousands of tiny segments are slow
        ctx.lineWidth = hairW
        ctx.stroke(np[0])
        ctx.translate(0.6, 0.45)
        ctx.stroke(np[0])
        ctx.translate(-0.6, -0.45)
      }
      // phase singularities
      let nSing = 0
      if (singA > 0.01) {
        nSing = singularities()
        const rad = small ? 1.8 : 2.4
        const calmA = 1 - smoothstep(T_CALM, T_CALM + 1.4, tau)
        for (const sign of [1, -1]) {
          ctx.beginPath()
          for (let k = 0; k < nSing; k++) {
            const y = SING[k * 2 + 1]
            if ((y > 0 ? 1 : -1) !== sign) continue
            const x = SING[k * 2]
            const yy = Math.abs(y)
            ctx.moveTo(x + rad, yy)
            ctx.arc(x, yy, rad, 0, TAU)
          }
          if (sign > 0) {
            ctx.fillStyle = rgba(C.lagoon, 0.9 * singA * calmA)
            ctx.fill()
          } else {
            ctx.strokeStyle = rgba(C.lagoon, 0.9 * singA * calmA)
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }
      ctx.lineWidth = 1
      ctx.lineCap = 'butt'
      const s1 = live.find((l) => l.s.label === 'S1')
      const s2 = live.find((l) => l.s.label === 'S2')
      if (s1 && !small && H >= 260) lambdaDim(s1, s2)
      for (const l of live) sourceMark(l, tau, t)
      affordances(tau)
      chrome(tau, nSing, nodalA, singA)
      if (env.mode === 'full') env.setCursor(dragging ? 'grabbing' : hoverSrc ? 'grab' : ptr.over ? 'crosshair' : 'default')
    },
    pointer(p) {
      if (env.mode !== 'full') return
      ptr.touch = p.pointerType === 'touch'
      ptr.x = p.x
      ptr.y = p.y
      ptr.over = p.type !== 'leave'
      ptr.down = p.pressed
      const nearest = (within: number) => {
        let best: Src | null = null
        let bd = within
        for (const l of live) {
          const d = Math.hypot(l.s.x - p.x, l.s.y - p.y)
          if (d < bd) {
            bd = d
            best = l.s
          }
        }
        return best
      }
      if (!dragging) hoverSrc = p.type === 'leave' ? null : nearest(hitR() + 8)
      if (p.type === 'down') {
        touched = true
        downX = p.x
        downY = p.y
        downT = nowT
        moved = false
        dragging = nearest(hitR() + (ptr.touch ? 16 : 10))
        if (dragging) {
          dragging.drag = true
          dragging.hx = dragging.x
          dragging.hy = dragging.y
        }
      } else if (p.type === 'move' && p.pressed) {
        if (Math.hypot(p.x - downX, p.y - downY) > 6) moved = true
        // a drag that starts in open water picks up the nearest source
        if (!dragging && moved) {
          dragging = nearest(Infinity)
          if (dragging) dragging.drag = true
        }
        if (dragging) {
          dragging.x = dragging.hx = clamp(p.x, m, W - m)
          dragging.y = dragging.hy = clamp(p.y, m, H - m)
          hoverSrc = dragging
        }
      } else if (p.type === 'up' || p.type === 'leave') {
        if (dragging) {
          dragging.drag = false
          if (!dragging.user) dragging.held = 1
          dragging = null
        } else if (p.type === 'up' && !moved && nowT - downT < 0.5) {
          // tap: add a source (max four on the tank; a fifth replaces the oldest you added)
          const loop = Math.floor(nowT / LOOP)
          if (userLoop !== loop) {
            users.length = 0
            userLoop = loop
          }
          if (live.length >= 4 && users.length) users.shift()
          const s: Src = { label: '', user: true, tOn: nowT, tOff: 99, phi: (users.length * 1.7) % TAU, ax: 0, ay: 0, fx: 0, fy: 0, px: 0, py: 0, bx: 0, by: 0, x: p.x, y: p.y, drag: false, held: 0, hx: p.x, hy: p.y }
          users.push(s)
          users.forEach((u, k) => (u.label = `S${autos.length + 1 + k}`))
          addedOnce = true
        }
        if (p.type === 'leave') hoverSrc = null
      }
    },
  }
}

export default create
