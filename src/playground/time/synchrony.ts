/*
 * FIG. T.07 — SYNCHRONY
 *
 * Strangers fall into step. Mangroves along a river at night, and in their
 * crowns several hundred fireflies, each an oscillator with its own natural
 * rhythm (periods spread about 0.9 s, a Gaussian of 4 %). Each flashes as
 * its phase passes 2π. They are coupled as Kuramoto (1975) described:
 *
 *     dθᵢ/dt = ωᵢ + K r sin(ψ − θᵢ),   r e^{iψ} = (1/N) Σ e^{iθⱼ}
 *
 * Below the critical coupling K_c = 2 / (π g(0)) they stay strangers; above
 * it a cluster forms and grows until whole trees flash together. Beside the
 * river: the phases as points on a wheel gathering into a cluster, the
 * order parameter r(t), and r against K with its exact self-consistent
 * curve (Kuramoto's equation, solved numerically for the Gaussian). Then
 * the same mathematics elsewhere: metronomes on a swinging board, the
 * heart's pacemaker cells, an audience's applause. Sound: every flash a soft
 * note of one chord, thinned while they are scattered — so scattered notes
 * become, as they agree, a single breath of chord.
 *
 * Five chapters over 82 s:
 *   I    Strangers     K = 0
 *   II   Listening     K rises through K_c
 *   III  Agreement     the cluster forms; the chord gathers
 *   IV   Elsewhere     clocks, hearts, hands
 *   V    Apart         the coupling is let go; they drift into the next loop
 *
 * Interaction (full mode): drag across the r–K plot to set the coupling;
 * tap the river (or Space) to scatter every phase and watch them find each
 * other again; ↑ ↓ nudge K; ← → step chapters; the ruler along the bottom
 * seeks.
 */

import { C, TAU, clamp, ease, ground, inkOn, lerp, makeNoise, rgba, rng, setFont, smoothstep, text, type TextOpts } from '../kit'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([
      document.fonts.load('400 40px "Instrument Serif"'),
      document.fonts.load('italic 400 40px "Instrument Serif"'),
      document.fonts.load('500 11px "Geist Mono"'),
    ]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. T.07'
const LOOP = 82
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Strangers' },
  { t: 15, num: 'II', name: 'Listening' },
  { t: 32, num: 'III', name: 'Agreement' },
  { t: 54, num: 'IV', name: 'Elsewhere' },
  { t: 74, num: 'V', name: 'Apart' },
]
/** natural mean period (s) and the spread of natural frequencies (fraction of ω₀, one s.d.) */
const PERIOD = 0.9
const W0 = TAU / PERIOD
const SIGMA = 0.04 * W0
/** critical coupling for a Gaussian g(ω): K_c = 2 / (π g(0)) = σ √(8 / π) */
const KC = SIGMA * Math.sqrt(8 / Math.PI)
const K_TOP = 2.5
const SUB = 1 / 120
/** firefly light, near the 560 nm of firefly luciferase */
const GLOW = [224, 240, 156] as const
/** the chord: D major, with an added ninth */
const CHORD = [293.66, 369.99, 440.0, 659.25, 880.0]

interface Seg {
  s: string
  em?: string
}
interface Caption {
  t0: number
  t1: number
  lines: Seg[]
}
const CAPTIONS: Caption[] = [
  { t0: 1.2, t1: 12.6, lines: [{ s: 'Each keeps' }, { s: 'its ', em: 'own time.' }] },
  { t0: 16.4, t1: 29.2, lines: [{ s: 'Each listens a little' }, { s: 'to ', em: 'the others.' }] },
  { t0: 36.2, t1: 51.6, lines: [{ s: 'And slowly,' }, { s: 'they ', em: 'agree.' }] },
  { t0: 58.6, t1: 71.4, lines: [{ s: 'Strangers fall' }, { s: '', em: 'into step.' }] },
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Inverse of the standard normal CDF (Acklam's rational approximation). */
function invNorm(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const lo = 0.02425
  if (p < lo || p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(p < lo ? p : 1 - p))
    const v = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    return p < lo ? v : -v
  }
  const q = p - 0.5
  const r = q * q
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

/**
 * Kuramoto's self-consistency for a Gaussian g of s.d. σ: the steady r > 0
 * solves 1 = K ∫ cos²θ g(K r sin θ) dθ over (−π/2, π/2). Tabulated once.
 */
function theoryCurve(sigma: number, kMaxKc: number, n: number) {
  const out = new Float32Array(n + 1)
  const kc = sigma * Math.sqrt(8 / Math.PI)
  const g = (x: number) => Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(TAU))
  const M = 96
  for (let i = 0; i <= n; i++) {
    const K = ((i / n) * kMaxKc) * kc
    if (K <= kc * 1.0001) continue
    const F = (r: number) => {
      let s = 0
      for (let q = 0; q < M; q++) {
        const th = -Math.PI / 2 + ((q + 0.5) / M) * Math.PI
        const cth = Math.cos(th)
        s += cth * cth * g(K * r * Math.sin(th))
      }
      return K * s * (Math.PI / M) - 1
    }
    let lo = 1e-6
    let hi = 1
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2
      if (F(mid) > 0) lo = mid
      else hi = mid
    }
    out[i] = (lo + hi) / 2
  }
  return out
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const k = inkOn('night')
  const INK = '#E4ECE8'
  const N = preview ? 220 : 480
  const noise = makeNoise(17)
  const KMAX = 4
  const THEORY = theoryCurve(SIGMA, KMAX, 200)

  /* ------------------------------------------------------ oscillators */

  const th = new Float64Array(N)
  const om = new Float64Array(N)
  const pitch = new Uint8Array(N)
  const th0 = new Float64Array(N)
  {
    const r = rng(1665)
    // natural frequencies: Gaussian quantiles, dealt out at random
    const order = Array.from({ length: N }, (_, i) => i)
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      const t = order[i]
      order[i] = order[j]
      order[j] = t
    }
    for (let i = 0; i < N; i++) {
      om[order[i]] = W0 + SIGMA * invNorm((i + 0.5) / N)
      th0[i] = r() * TAU
      pitch[i] = Math.floor(r() * CHORD.length)
    }
    th.set(th0)
  }
  let rNow = 0
  let psiNow = 0
  const onsets = new Uint16Array(CHORD.length)
  const RH = 60 * 30
  const rHist = new Float32Array(RH)
  let rHistN = 0
  let rHistTick = 0

  // the mean field and its order parameter
  function meanField() {
    let sx = 0
    let sy = 0
    for (let i = 0; i < N; i++) {
      sx += Math.cos(th[i])
      sy += Math.sin(th[i])
    }
    rNow = Math.hypot(sx, sy) / N
    psiNow = Math.atan2(sy, sx)
  }

  /* -------------------------------------- clocks, hearts and hands (IV) */

  interface Group {
    n: number
    th: Float64Array
    om: Float64Array
    w0: number
    sigma: number
    k: number
    sig: Float32Array
    sigN: number
  }
  function group(n: number, period: number, spread: number, seed: number): Group {
    const r = rng(seed)
    const w0 = TAU / period
    const g: Group = { n, th: new Float64Array(n), om: new Float64Array(n), w0, sigma: spread * w0, k: 0, sig: new Float32Array(240), sigN: 0 }
    for (let i = 0; i < n; i++) {
      g.om[i] = w0 + spread * w0 * invNorm((i + 0.5) / n)
      g.th[i] = r() * TAU
    }
    return g
  }
  const metro = group(5, 1.15, 0.03, 7)
  const heart = group(14, 0.86, 0.06, 11)
  const hands = group(18, 0.6, 0.09, 13)
  const groups = [metro, heart, hands]
  function scatterGroups(seed: number) {
    const r = rng(seed)
    for (const g of groups) for (let i = 0; i < g.n; i++) g.th[i] = r() * TAU
  }
  function stepGroup(g: Group, kc: number, dt: number) {
    let sx = 0
    let sy = 0
    for (let i = 0; i < g.n; i++) {
      sx += Math.cos(g.th[i])
      sy += Math.sin(g.th[i])
    }
    const r = Math.hypot(sx, sy) / g.n
    const psi = Math.atan2(sy, sx)
    const K = g.k * kc
    for (let i = 0; i < g.n; i++) {
      g.th[i] += (g.om[i] + K * r * Math.sin(psi - g.th[i])) * dt
      if (g.th[i] >= TAU) g.th[i] -= TAU
    }
  }

  /* ------------------------------------------------------------ story */

  let kUser: number | null = null
  /** coupling, in units of K_c, at story time T */
  function kAt(T: number) {
    if (kUser !== null) return kUser
    if (T < 15) return 0
    if (T < 29) return K_TOP * ease.inOutSine((T - 15) / 14)
    if (T < 74) return K_TOP
    if (T < 77) return K_TOP * (1 - ease.inOutSine((T - 74) / 3))
    return 0
  }
  function groupK(T: number) {
    return T >= 54 && T < 74 ? 3.2 * smoothstep(55.5, 60, T) : 0
  }

  /** Advance the oscillators by dt at story time T; counts flash onsets by note. */
  function step(T: number, dt: number) {
    let left = dt
    const kk = kAt(T) * KC
    while (left > 1e-9) {
      const h = Math.min(SUB, left)
      left -= h
      meanField()
      const kr = kk * rNow
      for (let i = 0; i < N; i++) {
        let v = th[i] + (om[i] + kr * Math.sin(psiNow - th[i])) * h
        if (v >= TAU) {
          v -= TAU
          onsets[pitch[i]]++
        } else if (v < 0) v += TAU
        th[i] = v
      }
      const gk = groupK(T)
      for (const g of groups) {
        g.k = gk
        stepGroup(g, g.sigma * Math.sqrt(8 / Math.PI), h)
      }
    }
    meanField()
  }

  /** Re-run the story from its first frame to T (for seeking): deterministic. */
  function resim(T: number) {
    th.set(th0)
    scatterGroups(54)
    rHistN = 0
    for (const g of groups) g.sigN = 0
    const dt = 1 / 60
    for (let t = 0; t < T; t += dt) {
      const prev = t
      step(t, Math.min(dt, T - t))
      if (prev < 54 && t + dt >= 54) scatterGroups(54)
      pushR(dt)
      if (t > T - 4.2) for (const g of groups) pushSig(g, signal(g))
    }
    onsets.fill(0)
  }
  function pushR(dt: number) {
    rHistTick += dt
    while (rHistTick >= 1 / 60) {
      rHistTick -= 1 / 60
      if (rHistN < RH) rHist[rHistN++] = rNow
      else {
        rHist.copyWithin(0, 1)
        rHist[RH - 1] = rNow
      }
    }
  }
  function scatter() {
    for (let i = 0; i < N; i++) th[i] = Math.random() * TAU
    sfx.noise(0.9, { filter: 900, to: 3200, q: 0.6, gain: 0.025, room: 0.4 })
  }

  /* ----------------------------------------------------------- layout */

  let w = env.width
  let h = env.height
  let side = false
  let stacked = false
  let short = false
  let tiny = false
  let narrow = false
  let pad = 16
  let topY = 50
  let botY = 0
  let rulerY = -1
  let waterY = 0
  let sceneX0 = 0
  let sceneX1 = 0
  let capX = 0
  let capY = 0
  let capSize = 30
  const panel: Rect = { x: 0, y: 0, w: 0, h: 0 }
  // the diagrams inside the panel
  const wheel = { x: 0, y: 0, r: 30 }
  const bif: Rect = { x: 0, y: 0, w: 0, h: 0 }
  const trace: Rect = { x: 0, y: 0, w: 0, h: 0 }
  interface Tree {
    x: number
    base: number
    cx: number
    cy: number
    rx: number
    ry: number
    seed: number
    lean: number
    px?: Float32Array
    py?: Float32Array
    wood?: Path2D
    aerial?: Path2D
    canopy?: Path2D
    clumps?: Path2D
  }
  let trees: Tree[] = []
  const fx = new Float32Array(N)
  const fy = new Float32Array(N)
  const fph = new Float32Array(N)
  const stars: [number, number, number][] = []

  function layout() {
    w = env.width
    h = env.height
    stacked = h > w * 1.15
    short = !stacked && h < 440
    side = short || preview
    tiny = h < 260
    narrow = w < 520
    pad = clamp(Math.min(w, h) * 0.045, preview || short ? 10 : 14, 40)
    topY = pad + (tiny ? 30 : preview || short ? 34 : 46)
    rulerY = !preview && h >= 330 ? h - pad * 0.55 : -1
    botY = rulerY > 0 ? rulerY - (short ? 16 : 22) : h - pad
    capSize = clamp(Math.min(w * (stacked ? 0.07 : side ? 0.05 : 0.045), h * (side ? 0.08 : 0.055)), tiny ? 14 : 16, 46)
    let treeTop = topY
    if (side) {
      sceneX0 = 0
      sceneX1 = w * (preview ? 0.6 : 0.64)
      panel.x = sceneX1 + 10
      panel.w = w - pad - panel.x
      panel.y = topY - 4
      panel.h = botY - panel.y
      waterY = h * 0.64
      wheel.r = clamp(Math.min(panel.w * 0.24, panel.h * 0.2), 18, 60)
      wheel.x = panel.x + wheel.r + 4
      wheel.y = panel.y + wheel.r + 12
      bif.x = panel.x + 22
      bif.y = wheel.y + wheel.r + 44
      bif.w = panel.w - 26
      bif.h = Math.max(30, Math.min(panel.y + panel.h - bif.y - 22, panel.h * 0.36))
      trace.w = 0
      treeTop = topY + 6
    } else {
      sceneX0 = 0
      sceneX1 = w
      waterY = h * (stacked ? 0.62 : 0.66)
      const ph = stacked ? clamp(h * 0.17, 110, 160) : clamp(h * 0.23, 120, 200)
      panel.x = stacked ? pad : Math.max(w * 0.4, w - pad - 760)
      panel.w = w - pad - panel.x
      panel.y = topY - 6
      panel.h = ph
      wheel.r = clamp(Math.min(panel.h / 2 - 14, panel.w * 0.16), 24, 74)
      wheel.x = panel.x + wheel.r + 6
      wheel.y = panel.y + panel.h / 2 + 4
      const rest = panel.x + panel.w - (wheel.x + wheel.r + 30)
      const nPlots = stacked ? 1 : 2
      const pw = (rest - (nPlots - 1) * 30) / nPlots
      bif.x = wheel.x + wheel.r + 46
      bif.y = panel.y + 22
      bif.w = pw - 16
      bif.h = panel.h - 50
      if (nPlots === 2) {
        trace.x = bif.x + bif.w + 44
        trace.y = bif.y
        trace.w = pw - 20
        trace.h = bif.h
      } else trace.w = 0
      treeTop = panel.y + panel.h + 18
    }
    capX = pad
    capY = botY - capSize * 0.3
    // mangroves along the far bank
    const r = rng(29)
    const span = sceneX1 - sceneX0 - pad * 2
    const n = clamp(Math.round(span / (side ? 150 : 200)), 2, 8)
    trees = []
    const room = waterY - treeTop
    for (let t = 0; t < n; t++) {
      const x = sceneX0 + pad + ((t + 0.5) / n) * span + (r() - 0.5) * (span / n) * 0.35
      const big = 0.7 + r() * 0.3
      const ry = room * (0.2 + 0.14 * big)
      let rx = Math.min((span / n) * (0.42 + r() * 0.16), ry * 2.1)
      rx = Math.max(12, Math.min(rx, sceneX1 - 8 - x, x - sceneX0 - 4))
      const trunk = room * (0.14 + r() * 0.1)
      const cy = Math.max(treeTop + ry, waterY - trunk - ry * 0.5)
      trees.push({ x, base: waterY, cx: x + (r() - 0.5) * rx * 0.25, cy, rx, ry, seed: r() * 100, lean: (r() - 0.5) * 0.15 })
    }
    if (typeof Path2D !== 'undefined') trees.forEach(shapeTree)
    // fireflies: in the crowns, more in the bigger ones
    const areas = trees.map((t) => t.rx * t.ry)
    const total = areas.reduce((a, b) => a + b, 0)
    const fr = rng(31)
    let i = 0
    trees.forEach((t, ti) => {
      const m = ti === trees.length - 1 ? N - i : Math.round((N * areas[ti]) / total)
      for (let q = 0; q < m && i < N; q++, i++) {
        const a = fr() * TAU
        const rr = Math.sqrt(fr()) * 0.92
        fx[i] = t.cx + Math.cos(a) * rr * t.rx
        fy[i] = t.cy + Math.sin(a) * rr * t.ry * 0.85 - t.ry * 0.05
        fph[i] = fr() * 100
      }
    })
    stars.length = 0
    const sr = rng(5)
    for (let q = 0; q < (side ? 26 : 50); q++) {
      const x = sceneX0 + sr() * (sceneX1 - sceneX0)
      const y = topY + sr() * (waterY - topY) * 0.6
      if (!side && x > panel.x - 10 && y < panel.y + panel.h + 10) continue
      stars.push([x, y, sr()])
    }
  }
  layout()

  /* ------------------------------------------------------------ clock */

  const sfx = env.sfx
  const atP = Number(env.params.get('at'))
  // previews open as the cluster forms
  let clock = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 33 : 0
  let prevT = -1
  let seekFlag = false
  let tappedOnce = false
  let draggedOnce = false
  let dragging = false
  const ptr = { x: 0, y: 0, over: false, down: false, touch: false, mode: '' as '' | 'k' | 'scene' | 'ruler', sx: 0, sy: 0, ms: 0 }
  const ripples: { x: number; y: number; t: number }[] = []

  function chapterOf(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }
  function curT() {
    return (((prevT < 0 ? clock : prevT) % LOOP) + LOOP) % LOOP
  }
  function seek(target: number) {
    clock += target - curT()
    seekFlag = true
    kUser = null
    resim(target)
  }
  function onRuler(x: number, y: number) {
    return !preview && rulerY > 0 && y > rulerY - 18 && y < h && x > pad - 8 && x < w - pad + 8
  }
  function seekRuler(x: number) {
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.2) target = c.t
    seek(Math.min(LOOP - 0.05, target))
  }
  function inBif(x: number, y: number) {
    const m = ptr.touch ? 16 : 8
    return x > bif.x - m && x < bif.x + bif.w + m && y > bif.y - m && y < bif.y + bif.h + 22
  }
  function inScene(x: number, y: number) {
    return x > sceneX0 && x < sceneX1 && y > topY && y < botY && !(x > panel.x - 4 && y < panel.y + panel.h + 4)
  }
  function setK(x: number) {
    kUser = Math.round(clamp((x - bif.x) / bif.w) * KMAX * 100) / 100
    draggedOnce = true
  }

  /* ----------------------------------------------------------- drawing */

  function halo(str: string, x: number, y: number, o: TextOpts) {
    const lw0 = ctx.lineWidth
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.night, 0.85)
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.lineJoin = 'miter'
    ctx.lineWidth = lw0
    text(ctx, str, x, y, o)
  }
  function tw(str: string, size: number, tracking = 0.12, font: 'mono' | 'serif' = 'mono', italic = false) {
    setFont(ctx, { size, tracking, font, italic })
    const v = ctx.measureText(str).width
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    return v
  }
  /** a flash: a fast rise, then an exponential fade over about a tenth of the cycle */
  const flash = (phi: number) => (phi < 0.025 ? phi / 0.025 : Math.exp(-(phi - 0.025) / 0.085))

  /** Shape a tree once per layout: canopy outline, stilt roots, aerial roots, leaf clumps. */
  function shapeTree(t: Tree) {
    const nz = (a: number, b: number) => noise.n2(a, b + t.seed)
    const tr = rng(Math.floor(t.seed * 1000) + 3)
    const bottom = t.cy + t.ry * 0.5
    const M = 40
    t.px = new Float32Array(M)
    t.py = new Float32Array(M)
    for (let q = 0; q < M; q++) {
      const a = (q / M) * TAU
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const rr = 1 + 0.14 * nz(ca * 1.1, sa * 1.1) + 0.06 * nz(ca * 3.2 + 9, sa * 3.2)
      t.px[q] = t.cx + ca * t.rx * rr
      t.py[q] = t.cy + sa * t.ry * rr * (sa > 0 ? 0.5 : 1)
    }
    const wood = new Path2D()
    const topX = t.cx + t.lean * t.ry
    for (const dx of [-1.6, 1.6]) {
      wood.moveTo(t.x + dx * 1.3, t.base)
      wood.quadraticCurveTo(t.x + dx, (t.base + bottom) / 2, topX + dx, bottom)
    }
    const nr = 11
    for (let q = 0; q < nr; q++) {
      const u = (q + 0.5) / nr - 0.5
      const hh = (t.base - bottom) * (0.15 + 0.55 * tr())
      const sx = t.x + u * 3
      const sy = t.base - hh
      const ex = t.x + u * t.rx * (1.0 + 0.4 * tr())
      wood.moveTo(sx, sy)
      wood.quadraticCurveTo(lerp(sx, ex, 0.45), sy - hh * 0.35, ex, t.base + 1)
    }
    const aerial = new Path2D()
    for (let q = 0; q < 4; q++) {
      const x = t.cx + (tr() - 0.5) * t.rx * 1.4
      aerial.moveTo(x, bottom - 2)
      aerial.lineTo(x + (tr() - 0.5) * 4, t.base)
    }
    const canopy = new Path2D()
    canopy.moveTo((t.px[M - 1] + t.px[0]) / 2, (t.py[M - 1] + t.py[0]) / 2)
    for (let q = 0; q < M; q++) {
      const nq = (q + 1) % M
      canopy.quadraticCurveTo(t.px[q], t.py[q], (t.px[q] + t.px[nq]) / 2, (t.py[q] + t.py[nq]) / 2)
    }
    canopy.closePath()
    const clumps = new Path2D()
    for (let q = 0; q < 16; q++) {
      const a = tr() * TAU
      const rr = Math.sqrt(tr()) * 0.85
      const cx = t.cx + Math.cos(a) * t.rx * rr
      const cy = t.cy + Math.sin(a) * t.ry * rr * 0.8
      const rad = t.rx * (0.12 + tr() * 0.1)
      clumps.moveTo(cx - rad, cy)
      clumps.arc(cx, cy, rad, Math.PI, TAU)
    }
    t.wood = wood
    t.aerial = aerial
    t.canopy = canopy
    t.clumps = clumps
  }

  function drawTree(t: Tree, alpha: number, flip: boolean) {
    if (!t.canopy || !t.wood || !t.aerial || !t.clumps) return
    ctx.save()
    if (flip) {
      ctx.translate(0, waterY * 2)
      ctx.scale(1, -1)
    }
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.4)
    ctx.stroke(t.wood)
    ctx.strokeStyle = rgba(INK, 0.16)
    ctx.stroke(t.aerial)
    // the canopy is filled, so nearer trees cover farther ones
    ctx.fillStyle = rgba('#0b1f22', 0.78)
    ctx.fill(t.canopy)
    ctx.strokeStyle = rgba(INK, 0.36)
    ctx.stroke(t.canopy)
    ctx.save()
    ctx.clip(t.canopy)
    ctx.strokeStyle = rgba(INK, 0.13)
    ctx.stroke(t.clumps)
    ctx.restore()
    ctx.restore()
  }

  function drawScene(T: number) {
    const order = [...trees].sort((a, b) => a.rx * a.ry - b.rx * b.ry)
    // stars, faint
    ctx.fillStyle = rgba(INK, 0.5)
    for (const [x, y, s] of stars) {
      ctx.globalAlpha = 0.25 + 0.35 * s * (0.6 + 0.4 * Math.sin(T * (0.6 + s) + s * 40))
      ctx.fillRect(x, y, 1.1, 1.1)
    }
    ctx.globalAlpha = 1
    // the far bank and the water
    ctx.strokeStyle = rgba(INK, 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(sceneX0, waterY + 0.5)
    ctx.lineTo(sceneX1, waterY + 0.5)
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.12)
    ctx.beginPath()
    for (let q = 1; q < 9; q++) {
      const y = Math.round(waterY + Math.pow(q / 9, 1.6) * (botY - waterY)) + 0.5
      const seg = 22 + q * 14
      for (let x0 = sceneX0 - ((T * (5 + q * 2)) % (seg * 2)); x0 < sceneX1; x0 += seg * 2) {
        const n = noise.n2(x0 * 0.01 + q * 7, q)
        if (n < -0.2) continue
        ctx.moveTo(Math.max(sceneX0, x0), y)
        ctx.lineTo(Math.min(sceneX1, x0 + seg * (0.35 + 0.4 * (n + 1) * 0.5)), y)
      }
    }
    ctx.stroke()
    // reflections first, then the trees
    ctx.save()
    ctx.beginPath()
    ctx.rect(sceneX0, waterY + 1, sceneX1 - sceneX0, botY - waterY)
    ctx.clip()
    for (const t of order) drawTree(t, 0.35, true)
    ctx.restore()
    for (const t of order) drawTree(t, 1, false)
  }

  /** Fireflies: a dim body always, a flash as the phase passes 2π; light adds, and the river doubles it. */
  function drawFireflies(T: number) {
    const BINS = 6
    const core: Path2D[] = []
    const glow: Path2D[] = []
    const refl: Path2D[] = []
    for (let b = 0; b < BINS; b++) {
      core.push(new Path2D())
      glow.push(new Path2D())
      refl.push(new Path2D())
    }
    const dim = new Path2D()
    const sz = side ? 0.85 : 1
    for (let i = 0; i < N; i++) {
      const x = fx[i] + noise.n2(fph[i], T * 0.15) * 6
      const y = fy[i] + noise.n2(T * 0.12, fph[i]) * 4
      const b = flash(th[i] / TAU)
      if (b < 0.06) {
        dim.rect(x - 0.6, y - 0.6, 1.2, 1.2)
        continue
      }
      const bin = Math.min(BINS - 1, Math.floor(b * BINS))
      const rc = (1.1 + 1.5 * b) * sz
      core[bin].moveTo(x + rc, y)
      core[bin].arc(x, y, rc, 0, TAU)
      const rg = (3.5 + 6 * b) * sz
      glow[bin].moveTo(x + rg, y)
      glow[bin].arc(x, y, rg, 0, TAU)
      const ry = waterY * 2 - y + noise.n2(x * 0.05, T * 1.2) * 2
      if (ry < botY - 2) {
        const xr = x + noise.n2(y * 0.05, T * 1.5) * 2.5
        refl[bin].rect(xr - 0.7, ry - 2 * b, 1.4, 3 + 9 * b)
      }
    }
    ctx.fillStyle = `rgba(${GLOW[0]},${GLOW[1]},${GLOW[2]},0.2)`
    ctx.fill(dim)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let b = 0; b < BINS; b++) {
      const a = (b + 0.5) / BINS
      ctx.fillStyle = `rgba(${GLOW[0]},${GLOW[1]},${GLOW[2]},${(0.09 * a).toFixed(3)})`
      ctx.fill(glow[b])
      ctx.fillStyle = `rgba(${GLOW[0]},${GLOW[1]},${GLOW[2]},${(0.95 * a).toFixed(3)})`
      ctx.fill(core[b])
      ctx.fillStyle = `rgba(${GLOW[0]},${GLOW[1]},${GLOW[2]},${(0.3 * a).toFixed(3)})`
      ctx.fill(refl[b])
    }
    ctx.restore()
  }

  /** The phases as points on a wheel; the arrow is r e^{iψ}. */
  function drawWheel(alpha: number) {
    const { x, y, r } = wheel
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.14)
    ctx.beginPath()
    ctx.moveTo(x - r - 5, y)
    ctx.lineTo(x + r + 5, y)
    ctx.moveTo(x, y - r - 5)
    ctx.lineTo(x, y + r + 5)
    ctx.stroke()
    // the flash mark: phase 2π ≡ 0, at the top
    ctx.strokeStyle = `rgb(${GLOW[0]},${GLOW[1]},${GLOW[2]})`
    ctx.beginPath()
    ctx.moveTo(x, y - r - 6)
    ctx.lineTo(x, y - r + 4)
    ctx.stroke()
    if (r > 30) text(ctx, 'FLASH', x + 5, y - r - 4, { size: 7.5, color: k.muted, tracking: 0.12 })
    // phases (clockwise from the top)
    ctx.fillStyle = INK
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const a = th[i]
      const jr = r * (0.97 - (i % 5) * 0.012)
      ctx.rect(x + Math.sin(a) * jr - 0.9, y - Math.cos(a) * jr - 0.9, 1.8, 1.8)
    }
    ctx.globalAlpha = alpha * 0.75
    ctx.fill()
    ctx.globalAlpha = alpha
    // the order parameter
    const ax = x + Math.sin(psiNow) * r * rNow
    const ay = y - Math.cos(psiNow) * r * rNow
    ctx.strokeStyle = C.sky
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(ax, ay)
    ctx.stroke()
    const hd = Math.atan2(ay - y, ax - x)
    if (rNow * r > 6) {
      ctx.beginPath()
      ctx.moveTo(ax + Math.cos(hd + 2.6) * 5, ay + Math.sin(hd + 2.6) * 5)
      ctx.lineTo(ax, ay)
      ctx.lineTo(ax + Math.cos(hd - 2.6) * 5, ay + Math.sin(hd - 2.6) * 5)
      ctx.stroke()
    }
    ctx.lineWidth = 1
    text(ctx, `r = ${rNow.toFixed(2)}`, x - r, y + r + 16, { size: 9, color: C.sky, tracking: 0.08 })
    if (r > 44 && !tiny) text(ctx, `N = ${N}`, x + r, y + r + 16, { size: 8, color: k.muted, align: 'right', tracking: 0.1 })
    ctx.restore()
  }

  /** r against K: the theory, K_c, the live point, the handle you drag. */
  function drawBif(T: number, alpha: number) {
    const r = bif
    if (r.w < 60 || r.h < 26) return
    const K = kAt(T)
    const toX = (kk: number) => r.x + (kk / KMAX) * r.w
    const toY = (v: number) => r.y + r.h - v * r.h
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    text(ctx, 'COUPLING K → ORDER r', r.x - 20, r.y - 8, { size: 8.5, color: k.ink2, tracking: 0.14 })
    ctx.strokeStyle = rgba(INK, 0.4)
    ctx.beginPath()
    ctx.moveTo(r.x, r.y)
    ctx.lineTo(r.x, r.y + r.h)
    ctx.lineTo(r.x + r.w, r.y + r.h)
    for (let q = 0; q <= KMAX; q++) {
      ctx.moveTo(Math.round(toX(q)) + 0.5, r.y + r.h)
      ctx.lineTo(Math.round(toX(q)) + 0.5, r.y + r.h + 3)
    }
    ctx.stroke()
    text(ctx, '1', r.x - 6, toY(1) + 3, { size: 8, color: k.muted, align: 'right' })
    text(ctx, '0', r.x - 6, toY(0) + 3, { size: 8, color: k.muted, align: 'right' })
    // K_c
    ctx.strokeStyle = rgba(C.sky, 0.6)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(toX(1), r.y)
    ctx.lineTo(toX(1), r.y + r.h)
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, 'Kc', toX(1) + 3, r.y + 8, { size: 8.5, color: C.sky, tracking: 0.04 })
    // the self-consistent curve
    ctx.strokeStyle = INK
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(0))
    ctx.lineTo(toX(1), toY(0))
    for (let q = 50; q <= 200; q++) ctx.lineTo(toX((q / 200) * KMAX), toY(THEORY[q]))
    ctx.stroke()
    // the live state
    ctx.fillStyle = C.sky
    ctx.beginPath()
    ctx.arc(toX(K), toY(rNow), 3.2, 0, TAU)
    ctx.fill()
    // the handle on the K axis
    const hx = toX(K)
    const hy = r.y + r.h + 13
    ctx.strokeStyle = C.sky
    ctx.fillStyle = C.night
    ctx.lineWidth = 1.2
    const hs = dragging ? 1.35 : 1
    ctx.beginPath()
    ctx.moveTo(hx, hy - 7 * hs)
    ctx.lineTo(hx + 5.5 * hs, hy + 2)
    ctx.lineTo(hx - 5.5 * hs, hy + 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.lineWidth = 1
    const lab = `K = ${K.toFixed(2)} Kc`
    const lw = tw(lab, 8.5, 0.08)
    const lx = hx + 9 + lw < r.x + r.w + 16 ? hx + 9 : hx - 9 - lw
    text(ctx, lab, lx, hy + 4, { size: 8.5, color: C.sky, tracking: 0.08 })
    // the ghost: drag me
    if (!preview && !draggedOnce && T > 15.8 && T < 19.8) {
      const ga = smoothstep(15.8, 16.4, T) * (1 - smoothstep(19.2, 19.8, T))
      ctx.globalAlpha = alpha * ga
      ctx.strokeStyle = C.sky
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.arc(hx, hy - 2, 12, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      // inside the plot, in the empty corner under the curve
      const lab2 = r.w > 200 ? 'DRAG TO SET THE COUPLING' : 'DRAG ← →'
      const lw2 = tw(lab2, 8.5)
      halo(lab2, clamp(r.x + r.w * 0.62, r.x + lw2 / 2, r.x + r.w - lw2 / 2), r.y + r.h * 0.7, { size: 8.5, color: C.sky, align: 'center', tracking: 0.14 })
    }
    ctx.restore()
  }

  /** r(t), the last 30 s, with the theory's steady value. */
  function drawTrace(T: number, alpha: number) {
    const r = trace
    if (r.w < 80) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    text(ctx, 'r(t) · LAST 30 S', r.x, r.y - 8, { size: 8.5, color: k.ink2, tracking: 0.14 })
    ctx.strokeStyle = rgba(INK, 0.4)
    ctx.beginPath()
    ctx.moveTo(r.x, r.y)
    ctx.lineTo(r.x, r.y + r.h)
    ctx.lineTo(r.x + r.w, r.y + r.h)
    ctx.stroke()
    const K = kAt(T)
    if (K > 1) {
      const q = Math.round((K / KMAX) * 200)
      const rt = THEORY[Math.min(200, q)]
      ctx.strokeStyle = rgba(C.sky, 0.55)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(r.x, r.y + r.h - rt * r.h)
      ctx.lineTo(r.x + r.w, r.y + r.h - rt * r.h)
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, 'THEORY', r.x + r.w, r.y + r.h - rt * r.h - 4, { size: 7.5, color: C.sky, align: 'right', tracking: 0.12 })
    }
    ctx.strokeStyle = INK
    ctx.beginPath()
    const n = rHistN
    for (let q = 0; q < n; q++) {
      const x = r.x + r.w - ((n - 1 - q) / (RH - 1)) * r.w
      const y = r.y + r.h - rHist[q] * r.h
      if (q) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  /** IV: the same equation in three other places. */
  function drawElsewhere(alpha: number) {
    if (alpha <= 0.01) return
    const boxes: Rect[] = []
    if (side) {
      const bh = (panel.h - 16) / 3
      for (let q = 0; q < 3; q++) boxes.push({ x: panel.x, y: panel.y + 6 + q * bh, w: panel.w, h: bh - 8 })
    } else {
      const bw = (panel.w - 24) / 3
      for (let q = 0; q < 3; q++) boxes.push({ x: panel.x + q * (bw + 12), y: panel.y + 4, w: bw, h: panel.h - 8 })
    }
    const titles = ['METRONOMES · AFTER HUYGENS, 1665', 'PACEMAKER CELLS · THE HEART', 'APPLAUSE · AN AUDIENCE']
    const shortT = ['METRONOMES', 'PACEMAKER CELLS', 'APPLAUSE']
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    boxes.forEach((b, q) => {
      const ttl = tw(titles[q], 8, 0.12) < b.w ? titles[q] : shortT[q]
      text(ctx, ttl, b.x, b.y + 8, { size: 8, color: k.ink2, tracking: 0.12 })
      const ib = { x: b.x, y: b.y + 16, w: b.w, h: b.h - 18 }
      if (q === 0) drawMetronomes(ib)
      else if (q === 1) drawHeart(ib)
      else drawHands(ib)
    })
    ctx.restore()
  }

  function drawMetronomes(b: Rect) {
    const g = metro
    const plankY = b.y + b.h * 0.72
    const x0 = b.x + 6
    const x1 = b.x + b.w - 6
    // the board sways with the mean of the pendulums: that is the coupling
    let mean = 0
    for (let i = 0; i < g.n; i++) mean += Math.sin(g.th[i])
    mean /= g.n
    const sway = -mean * Math.min(6, b.w * 0.02)
    ctx.strokeStyle = rgba(INK, 0.7)
    ctx.beginPath()
    ctx.rect(x0 + sway, plankY, x1 - x0, 4)
    ctx.stroke()
    // two cans
    const cr = Math.min(b.h * 0.1, 9)
    ctx.strokeStyle = rgba(INK, 0.4)
    ctx.beginPath()
    for (const cx of [x0 + (x1 - x0) * 0.22, x0 + (x1 - x0) * 0.78]) {
      ctx.moveTo(cx + cr, plankY + 4 + cr)
      ctx.arc(cx, plankY + 4 + cr, cr, 0, TAU)
    }
    ctx.stroke()
    const mh = Math.min(b.h * 0.5, ((x1 - x0) / g.n) * 1.5)
    const mw = Math.min(((x1 - x0) / g.n) * 0.62, mh * 0.55)
    for (let i = 0; i < g.n; i++) {
      const cx = x0 + ((i + 0.5) / g.n) * (x1 - x0) + sway
      ctx.strokeStyle = rgba(INK, 0.6)
      ctx.beginPath()
      ctx.moveTo(cx - mw / 2, plankY)
      ctx.lineTo(cx - mw * 0.18, plankY - mh)
      ctx.lineTo(cx + mw * 0.18, plankY - mh)
      ctx.lineTo(cx + mw / 2, plankY)
      ctx.stroke()
      const ang = Math.sin(g.th[i]) * 0.55
      const px = cx + Math.sin(ang) * mh * 1.05
      const py = plankY - mh * 0.12 - Math.cos(ang) * mh * 1.05
      ctx.strokeStyle = INK
      ctx.beginPath()
      ctx.moveTo(cx, plankY - mh * 0.12)
      ctx.lineTo(px, py)
      ctx.stroke()
      ctx.fillStyle = INK
      ctx.fillRect(px - 2, py + mh * 0.25, 4, 3)
    }
  }

  function signal(g: Group) {
    let s = 0
    for (let i = 0; i < g.n; i++) s += flash(g.th[i] / TAU)
    return s / g.n
  }
  function pushSig(g: Group, v: number) {
    if (g.sigN < g.sig.length) g.sig[g.sigN++] = v
    else {
      g.sig.copyWithin(0, 1)
      g.sig[g.sig.length - 1] = v
    }
  }
  function drawSig(g: Group, x0: number, y0: number, wd: number, ht: number, ecg: boolean) {
    ctx.strokeStyle = C.sky
    ctx.beginPath()
    const n = g.sigN
    for (let q = 0; q < n; q++) {
      const x = x0 + wd - ((n - 1 - q) / (g.sig.length - 1)) * wd
      let v = g.sig[q]
      if (ecg) {
        // a heartbeat shape driven by how many cells fire together
        const d = q > 0 ? g.sig[q] - g.sig[q - 1] : 0
        v = v * 0.6 + Math.max(0, d) * 6
      }
      const y = y0 + ht - clamp(v) * ht
      if (q) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.stroke()
  }

  function drawHeart(b: Rect) {
    const g = heart
    const cy = b.y + b.h * 0.36
    const cx = b.x + b.w / 2
    const cs = Math.min(b.h * 0.15, b.w * 0.085)
    // cells in a honeycomb, each lighting as it fires
    for (let i = 0; i < g.n; i++) {
      const row = Math.floor(i / 5) - 1
      const col = (i % 5) - 2 + (row % 2 ? 0.5 : 0)
      const x = cx + col * cs * 1.9
      const y = cy + row * cs * 1.65
      const f = flash(g.th[i] / TAU)
      ctx.beginPath()
      for (let p = 0; p <= 6; p++) {
        const a = (p / 6) * TAU + Math.PI / 6
        const X = x + Math.cos(a) * cs
        const Y = y + Math.sin(a) * cs
        if (p) ctx.lineTo(X, Y)
        else ctx.moveTo(X, Y)
      }
      ctx.strokeStyle = rgba(INK, 0.45 + 0.5 * f)
      ctx.stroke()
      if (f > 0.05) {
        ctx.fillStyle = rgba(C.sky, 0.55 * f)
        ctx.fill()
      }
    }
    drawSig(g, b.x + 4, b.y + b.h * 0.7, b.w - 8, b.h * 0.26, true)
  }

  function drawHands(b: Rect) {
    const g = hands
    const n = g.n
    const cols = Math.ceil(n / 2)
    for (let i = 0; i < n; i++) {
      const x = b.x + 8 + ((i % cols) + 0.5) * ((b.w - 16) / cols)
      const y = b.y + b.h * (i < cols ? 0.18 : 0.42)
      const f = flash(g.th[i] / TAU)
      const open = 1 - f
      const sz = Math.min((b.w - 16) / cols, b.h * 0.24) * 0.38
      ctx.strokeStyle = rgba(INK, 0.5 + 0.5 * f)
      ctx.beginPath()
      // two palms, meeting at the clap
      ctx.moveTo(x - sz * 0.25 - open * sz * 0.6, y + sz)
      ctx.lineTo(x - sz * 0.15 - open * sz * 0.4, y - sz)
      ctx.moveTo(x + sz * 0.25 + open * sz * 0.6, y + sz)
      ctx.lineTo(x + sz * 0.15 + open * sz * 0.4, y - sz)
      ctx.stroke()
      if (f > 0.3) {
        ctx.strokeStyle = rgba(C.sky, f * 0.7)
        ctx.beginPath()
        ctx.moveTo(x - sz * 0.9, y - sz * 1.3)
        ctx.lineTo(x - sz * 0.5, y - sz * 0.9)
        ctx.moveTo(x + sz * 0.9, y - sz * 1.3)
        ctx.lineTo(x + sz * 0.5, y - sz * 0.9)
        ctx.stroke()
      }
    }
    drawSig(g, b.x + 4, b.y + b.h * 0.62, b.w - 8, b.h * 0.34, false)
  }

  function captionAt(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.04
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = capY - lineH + li * lineH
        const sw = ln.s ? tw(ln.s, capSize, 0, 'serif') : 0
        const ew = ln.em ? tw(ln.em, capSize, 0, 'serif', true) : 0
        const maxW = sceneX1 - capX - 8
        const sz = sw + ew > maxW ? (capSize * maxW) / (sw + ew) : capSize
        const sc = sz / capSize
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, w, capSize * 1.32)
        ctx.clip()
        const dyy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dyy, { font: 'serif', size: sz, color: k.ink })
        if (ln.em) text(ctx, ln.em, capX + sw * sc, y + dyy, { font: 'serif', size: sz, italic: true, color: C.sage })
        ctx.restore()
      })
    }
  }

  function chrome(T: number) {
    const ch = chapterOf(T)
    const small = preview || short || narrow
    text(ctx, `${FIG} — Synchrony`, pad, pad + 9, { size: small ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    if (!tiny) {
      const c = CHAPTERS[ch]
      const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
      ctx.save()
      ctx.globalAlpha = kIn
      text(ctx, `${c.num} — ${c.name}`, pad, pad + (small ? 23 : 27), { size: small ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true })
      ctx.restore()
    }
    if (rulerY > 0) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= LOOP / 2; i++) {
        const x = lerp(x0, x1, (i * 2) / LOOP)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 5 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360)
        CHAPTERS.forEach((cc, i) => {
          const x = lerp(x0, x1, cc.t / LOOP)
          text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
        })
      if (ptr.over && (ptr.mode === 'ruler' || (!ptr.down && onRuler(ptr.x, ptr.y)))) {
        const hx = clamp(ptr.x, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        ctx.strokeStyle = C.sky
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[chapterOf(ht)].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: C.sky, align: 'center', tracking: 0.12 })
      }
    }
  }

  /* ---------------------------------------------------------- sound */

  // each note of the chord fills like a small bucket with its fireflies' flashes and sounds when full
  const charge = new Float32Array(CHORD.length)
  const thresh = Float32Array.from(CHORD, () => 0.6 + Math.random() * 0.8)
  const lastNote = new Float64Array(CHORD.length)
  function sound() {
    if (!sfx.enabled) {
      onsets.fill(0)
      return
    }
    // about ten notes a second in all; scattered flashes give scattered notes, agreeing ones a chord
    const p = 10 / (N / PERIOD)
    const now = performance.now()
    for (let q = 0; q < CHORD.length; q++) {
      charge[q] += onsets[q] * p
      if (charge[q] >= thresh[q] && now - lastNote[q] > 180) {
        const gain = 0.012 + 0.03 * rNow
        sfx.tone(CHORD[q] * (Math.random() < 0.25 ? 0.5 : 1), 1.6, { type: 'sine', gain, attack: 0.03, filter: 2200, room: 0.65, pan: (Math.random() - 0.5) * 0.8 })
        charge[q] = 0
        thresh[q] = 0.6 + Math.random() * 0.8
        lastNote[q] = now
      }
    }
    onsets.fill(0)
  }

  /* ---------------------------------------------------------- frame */

  if (env.params.has('at') || preview) resim(((clock % LOOP) + LOOP) % LOOP)

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      ptr.touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        ptr.over = false
        ptr.down = false
        ptr.mode = ''
        dragging = false
        env.setCursor('default')
        return
      }
      ptr.over = true
      ptr.x = p.x
      ptr.y = p.y
      if (p.type === 'down') {
        ptr.down = true
        ptr.sx = p.x
        ptr.sy = p.y
        ptr.ms = performance.now()
        if (onRuler(p.x, p.y)) {
          ptr.mode = 'ruler'
          seekRuler(p.x)
        } else if (inBif(p.x, p.y) && curT() < 54) {
          ptr.mode = 'k'
          dragging = true
          setK(p.x)
        } else if (inScene(p.x, p.y)) ptr.mode = 'scene'
        else ptr.mode = ''
      } else if (p.type === 'move' && ptr.down) {
        if (ptr.mode === 'ruler') seekRuler(p.x)
        else if (ptr.mode === 'k') setK(p.x)
      } else if (p.type === 'up') {
        if (ptr.mode === 'scene' && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) < (ptr.touch ? 16 : 9) && performance.now() - ptr.ms < 450) {
          scatter()
          tappedOnce = true
          ripples.push({ x: p.x, y: p.y, t: curT() })
        }
        ptr.down = false
        ptr.mode = ''
        dragging = false
      }
      const T = curT()
      env.setCursor(ptr.mode === 'k' ? 'ew-resize' : onRuler(p.x, p.y) ? 'pointer' : inBif(p.x, p.y) && T < 54 ? 'ew-resize' : inScene(p.x, p.y) ? 'pointer' : 'default')
    },
    key(code, down) {
      const watch = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']
      if (!watch.includes(code)) return false
      if (!down) return true
      const T = curT()
      if (code === 'Space') {
        scatter()
        tappedOnce = true
      } else if (code === 'ArrowUp' || code === 'ArrowDown') {
        kUser = clamp(Math.round((kAt(T) + (code === 'ArrowUp' ? 0.1 : -0.1)) * 100) / 100, 0, KMAX)
        draggedOnce = true
      } else if (code === 'ArrowRight') {
        const next = CHAPTERS.find((c) => c.t > T + 0.01)
        seek(next ? next.t : 0)
      } else {
        const i = chapterOf(T)
        seek(T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t)
      }
      return true
    },
    frame(t, dt) {
      const T = (((t + clock) % LOOP) + LOOP) % LOOP
      if (prevT >= 0 && T < prevT - 1 && !seekFlag) kUser = null
      seekFlag = false
      if (dt > 0) {
        if (prevT >= 0 && prevT < 54 && T >= 54) scatterGroups(Math.floor(t * 1000))
        step(T, dt)
        pushR(dt)
        for (const g of groups) pushSig(g, signal(g))
        sound()
      }

      ground(ctx, w, h, 'night')
      drawScene(T)
      drawFireflies(T)
      // a tap's ripple, where the phases were scattered
      for (let q = ripples.length - 1; q >= 0; q--) {
        const rp = ripples[q]
        const age = T - rp.t
        if (age < 0 || age > 1.4) {
          ripples.splice(q, 1)
          continue
        }
        ctx.strokeStyle = rgba(C.sky, 0.6 * (1 - age / 1.4))
        ctx.beginPath()
        ctx.arc(rp.x, rp.y, 6 + age * 60, 0, TAU)
        ctx.stroke()
      }
      // the panel: the diagrams, or (IV) the same law elsewhere
      const elsewhere = smoothstep(54.4, 55.6, T) * (1 - smoothstep(73, 74.4, T))
      const diag = 1 - elsewhere
      if (diag > 0.01) {
        drawWheel(diag)
        drawBif(T, diag)
        drawTrace(T, diag)
      }
      drawElsewhere(elsewhere)
      // K crosses K_c: say so
      const nearKc = kUser === null && T > 20 && T < 26 ? smoothstep(20, 20.8, T) * (1 - smoothstep(25, 26, T)) : 0
      if (nearKc > 0 && !tiny && bif.w > 120) {
        // inside the plot, under the curve, just past the critical line
        const lab = bif.w > 210 ? 'PAST Kc A CLUSTER CAN FORM' : 'PAST Kc'
        halo(lab, bif.x + (1.12 / 4) * bif.w, bif.y + bif.h * 0.82, { size: 8, color: C.sky, tracking: 0.12, alpha: nearKc })
      }
      // the hint to tap
      if (!preview && !tappedOnce && T > 43 && T < 49 && !tiny) {
        const ha = smoothstep(43, 43.8, T) * (1 - smoothstep(48.2, 49, T))
        const t0 = trees[Math.floor(trees.length / 2)]
        const x = t0.cx
        const y = t0.cy - t0.ry - 12
        const u = ((T - 43) * 0.8) % 1
        ctx.save()
        ctx.globalAlpha = ha
        ctx.strokeStyle = C.sky
        ctx.beginPath()
        ctx.arc(x, t0.cy, 5 + u * 26, 0, TAU)
        ctx.stroke()
        ctx.restore()
        halo('TAP TO SCATTER THEM', x, y, { size: 9, color: C.sky, align: 'center', tracking: 0.14, alpha: ha })
      }
      captionAt(T)
      chrome(T)
      prevT = T
    },
  }
}

export default create
