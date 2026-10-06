/*
 * FIG. T.01 — PENDULUM WAVE
 *
 * Fifteen pendulums hang from one beam. Their lengths are chosen so that in
 * a common cycle Γ the k-th completes exactly Nₖ = Γ + k swings (the longest
 * has a period of exactly 1 s). From the small-angle period T = 2π√(L/g),
 *
 *     Lₖ = g · (Γ / 2π Nₖ)²        (Γ = 60 s: 248.5 mm … 163.4 mm)
 *
 * Released together, each keeps its own time: neighbours drift apart by
 * 360°·s/Γ, so the row writhes into travelling waves, then two interleaved
 * groups at Γ/2, three at Γ/3 and 2Γ/3, and so on at every simple fraction,
 * apparent disorder in between, and at s = Γ all fifteen agree again.
 *
 * Two views, as on an engineering sheet:
 *   ELEVATION  the frame, the bifilar strings and hatched bobs, swinging in
 *              depth (oblique projection: the swing plane recedes at 35°).
 *   PLAN       the row seen from above, strobed once a second (once per swing
 *              of the longest pendulum), each snapshot stacked under the last
 *              into a ridged plate that completes exactly at Γ.
 *
 * Motion is the exact solution of the linearised pendulum, θ = A cos ω(t − τ):
 * no integrator, no drift, a pure function of time (seek with ?at=seconds).
 *
 * Sound: each bob plays a note of D major pentatonic as it passes the bottom
 * of its swing (longest = lowest); at Γ the notes fall together into a chord.
 *
 * Interaction (full mode): drag a bob aside and let go (it rejoins with a new
 * phase); tap anywhere else to gather and release all fifteen together;
 * ← → change Γ (the strings re-tune), Space releases all.
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, rgba, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces (on the Playground page they are
 * already loaded and this resolves at once). Never blocks for long.
 */
if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. T.01'
const K = 15
const G = 9.81
const DEG = Math.PI / 180
/** the cycle times offered by ← → (seconds); the longest pendulum always has a 1 s period */
const GAMMAS = [30, 45, 60, 90, 120]
const GAMMA_WORDS: Record<number, string> = { 30: 'half minute', 45: 'forty-five seconds', 60: 'minute', 90: 'minute and a half', 120: 'two minutes' }
const THETA0 = 12 * DEG
const THETA_MAX = 24 * DEG
/** mm: pendulum spacing along the beam, bob radius, half-span of the bifilar V */
const SPACING = 50
const BOB_R = 12
const V_HALF = 15
/** oblique projection of the swing (depth) axis */
const OBL_A = 35 * DEG
const OBL_K = 0.62
const OCX = Math.cos(OBL_A) * OBL_K
const OCY = Math.sin(OBL_A) * OBL_K
/** world box of the elevation, mm */
const WX0 = -116
const WX1 = 14 * SPACING + 118
const WY0 = -40
const WY1 = 338
const BASE_Y = 300
/** the opening: frame draws on, bobs are gathered to θ₀ and released at INTRO */
const GATHER0 = 1.3
const INTRO = 3.2
/** D major pentatonic, three octaves from D3: the longest pendulum is the lowest note */
const PENTA = [146.83, 164.81, 185.0, 220.0, 246.94]
const noteOf = (k: number) => PENTA[k % 5] * Math.pow(2, Math.floor(k / 5))
const GROUP_COLORS = [C.ocean, C.lagoon, C.moss, C.fern, C.sky, '#7E9A80']
const NUMWORD = ['', 'one', 'two', 'three', 'four', 'five', 'six']

interface Caption {
  key: string
  lines: { s: string; em?: string }[]
}

const lengthOf = (gamma: number, k: number) => G * Math.pow(gamma / (TAU * (gamma + k)), 2) * 1000
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** Simple fractions p/q of the cycle, q ≤ 6, in order. */
const FRACTIONS: { p: number; q: number; f: number }[] = []
for (let q = 2; q <= 6; q++) for (let p = 1; p < q; p++) if (gcd(p, q) === 1) FRACTIONS.push({ p, q, f: p / q })
FRACTIONS.sort((a, b) => a.f - b.f)

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  /* ------------------------------------------------------------- state */

  // test route: &gamma=90 starts on another cycle; &poke=k:deg:sec disturbs bob k at that moment; &hover=k
  let gi = Math.max(0, GAMMAS.indexOf(Number(env.params.get('gamma'))))
  if (!env.params.has('gamma')) gi = 2
  let gamma = GAMMAS[gi]
  const poke = (env.params.get('poke') ?? '').split(':').map(Number)
  let poked = !(poke.length === 3 && poke.every(Number.isFinite))
  const omega = new Float64Array(K)
  const amp = new Float64Array(K)
  const tau = new Float64Array(K)
  const Lmm = new Float64Array(K)
  const Lfrom = new Float64Array(K)
  const Lto = new Float64Array(K)
  for (let k = 0; k < K; k++) {
    Lmm[k] = Lfrom[k] = Lto[k] = lengthOf(gamma, k)
    omega[k] = (TAU * (gamma + k)) / gamma
  }
  // the opening gather (and every later "release all"): bobs ease to θ₀, then let go together
  let gather: { t0: number; dur: number; from: Float64Array; retune: boolean } | null = { t0: GATHER0, dur: INTRO - GATHER0, from: new Float64Array(K), retune: false }
  let cycleStart = INTRO
  let firstCycle = true
  // the viewer's hand
  let drag = -1
  let dragTheta = 0
  let hover = -1
  let acted = false
  let disturbed = false
  let downAt: { x: number; y: number; ms: number; bob: number } | null = null
  let touch = false
  // the plate: one snapshot of the row per second (the longest pendulum's period); drawn every ds seconds
  const MAXL = 128
  const stride = 1
  let nLines = gamma + 1
  const plate = new Float32Array(MAXL * K)
  let plateCount = 0
  let plateStart = INTRO
  const oldPlate = new Float32Array(MAXL * K)
  let oldCount = 0
  let oldN = 0
  let oldStart = -1e9
  const prevTheta = new Float64Array(K)
  let prevT = -1
  let lastNotes = 0

  // ?at=… (solo/test route) jumps to a moment; the piece is a function of time until touched
  const at = Number(env.params.get('at'))
  const offset = env.params.has('at') && Number.isFinite(at) ? at : preview ? INTRO + 34.5 : 0

  /* ------------------------------------------------------------ layout */

  let w = env.width
  let h = env.height
  let m = 24
  let s = 1 // px per mm in the elevation
  let ox = 0
  let oy = 0
  let mode: 'wide' | 'portrait' | 'side' | 'stack' = 'wide'
  let small = false
  let tiny = false
  // plate rect + column x positions
  let px0 = 0
  let px1 = 0
  let py0 = 0
  let py1 = 0
  let aligned = true
  const colX = new Float64Array(K)
  let plateLead = 0
  // caption block
  let capX = 0
  let capY = 0
  let capSize = 30
  let capW = 300
  // spec table (wide only)
  let tableX = 0
  let tableY = 0
  let tableOn = false
  let headerH = 40

  function layout() {
    w = env.width
    h = env.height
    small = preview || Math.min(w, h) < 480
    tiny = h < 260 || w < 360
    m = preview ? 12 : tiny ? 10 : small ? 14 : Math.round(clamp(Math.min(w, h) * 0.035, 18, 40))
    headerH = preview ? 22 : tiny ? 22 : small ? 30 : 46
    const EW = WX1 - WX0
    const EH = WY1 - WY0
    const aspect = w / h
    if (preview) mode = 'stack'
    else if (h > w * 1.12) mode = 'portrait'
    else if (h < 470 && aspect > 1.65) mode = 'side'
    else if (w >= 900 && h >= 520) mode = 'wide'
    else mode = 'stack'
    tableOn = false
    if (mode === 'wide') {
      const lc = Math.round(clamp(w * 0.27, 250, 470))
      const dx0 = lc + m
      const dw = w - dx0 - m * 1.4
      const eh = (h - headerH - m * 2) * 0.54
      s = Math.min(dw / EW, eh / EH)
      ox = dx0 + (dw - EW * s) / 2 - WX0 * s
      oy = m + headerH + 6 - WY0 * s
      aligned = true
      py0 = oy + WY1 * s + Math.max(18, h * 0.035)
      py1 = h - m - 26
      capSize = Math.round(clamp(Math.min(w * 0.03, h * 0.05), 24, 50))
      capX = m + 4
      capW = lc - m - 8
      capY = oy + 40 * s
      tableOn = h >= 640 && lc >= 260
      tableX = m + 4
      tableY = Math.max(capY + capSize * 2.4 + 64, py0 - 4)
    } else if (mode === 'portrait') {
      const dw = w - m * 2
      s = Math.min(dw / EW, (h * 0.3) / EH)
      ox = (w - EW * s) / 2 - WX0 * s
      oy = m + headerH + 10 - WY0 * s
      aligned = true
      capSize = Math.round(clamp(w * 0.066, 18, 36))
      const capH = capSize * 2.3 + 34
      py0 = oy + WY1 * s + 16
      py1 = h - m - capH - 18
      capX = m + 2
      capW = w - m * 2
      capY = py1 + 30
    } else if (mode === 'side') {
      // wide and short: elevation left, plate right, caption under the elevation
      const half = w * 0.56
      const capRoom = tiny ? 40 : 64
      s = Math.min((half - m * 1.5) / EW, (h - headerH - m - capRoom) / EH)
      ox = m - WX0 * s
      oy = headerH + 4 - WY0 * s
      aligned = false
      px0 = ox + WX1 * s + m * 1.2 + 24
      px1 = w - m - (tiny ? 4 : 10)
      py0 = headerH + 8
      py1 = h - m - 6
      capSize = Math.round(clamp(h * 0.068, 13, 26))
      capX = m + 2
      capW = ox + WX1 * s - capX
      capY = oy + WY1 * s + 4
    } else {
      // small frames and the card: elevation, then the caption, then the plate
      const dw = w - m * 2
      capSize = Math.round(clamp(Math.min(w * 0.05, h * 0.062), 13, 24))
      const capH = preview ? 0 : capSize * 2.2 + 8
      s = Math.min(dw / EW, ((h - headerH - m - capH) * (preview ? 0.47 : 0.5)) / EH)
      ox = (w - EW * s) / 2 - WX0 * s
      oy = headerH + 2 - WY0 * s
      aligned = true
      capX = m + 2
      capW = w - m * 2
      capY = oy + WY1 * s + 2
      py0 = capY + capH + (preview || tiny ? 6 : 16)
      py1 = h - m - (preview ? 0 : h < 360 ? 2 : 12)
    }
    if (aligned) {
      px0 = ox + (-SPACING * 0.9) * s
      px1 = ox + (14 * SPACING + SPACING * 0.9) * s
      for (let k = 0; k < K; k++) colX[k] = ox + k * SPACING * s
      plateLead = SPACING * 0.9 * s
    } else {
      const lead = (px1 - px0) * 0.06
      for (let k = 0; k < K; k++) colX[k] = lerp(px0 + lead, px1 - lead, k / (K - 1))
      plateLead = lead
    }
  }
  layout()

  /* ----------------------------------------------------------- physics */

  const thetaFree = (k: number, t: number) => amp[k] * Math.cos(omega[k] * (t - tau[k]))

  /** The angle we show at time t (drag and gather override the free swing). */
  function thetaAt(k: number, t: number) {
    if (k === drag) return dragTheta
    if (gather && t >= gather.t0) {
      const u = ease.inOutCubic(clamp((t - gather.t0) / gather.dur))
      return lerp(gather.from[k], THETA0, u)
    }
    return thetaFree(k, t)
  }

  function lengthNow(k: number, t: number) {
    if (gather && gather.retune) return lerp(Lfrom[k], Lto[k], ease.inOutCubic(clamp((t - gather.t0) / gather.dur)))
    return Lmm[k]
  }

  function startGather(t: number, retune: boolean) {
    const from = new Float64Array(K)
    for (let k = 0; k < K; k++) from[k] = thetaAt(k, t)
    if (retune) for (let k = 0; k < K; k++) Lfrom[k] = Lmm[k]
    gather = { t0: t, dur: retune ? 1.5 : 0.9, from, retune }
    // set the unfinished plate aside to fade while the bobs are gathered
    newCycle(t, true)
    drag = -1
    sfx.noise(retune ? 1.2 : 0.7, { filter: 500, to: 1500, q: 0.7, gain: 0.025, room: 0.3 })
  }

  function finishGather() {
    if (!gather) return
    const tr = gather.t0 + gather.dur
    if (gather.retune) for (let k = 0; k < K; k++) Lmm[k] = Lto[k]
    for (let k = 0; k < K; k++) {
      amp[k] = THETA0
      tau[k] = tr
      omega[k] = (TAU * (gamma + k)) / gamma
    }
    gather = null
    disturbed = false
    newCycle(tr, true)
    if (tr > INTRO + 0.1 || prevT >= 0) sfx.tone(noteOf(0) / 2, 1.6, { type: 'sine', gain: 0.05, attack: 0.01, room: 0.4 })
  }

  function newCycle(t0: number, fresh: boolean) {
    // keep the finished plate for a cross-fade (a gather has already set it aside)
    if (plateCount > 0) {
      oldPlate.set(plate.subarray(0, plateCount * K))
      oldCount = plateCount
      oldN = nLines
      oldStart = t0
    }
    nLines = gamma + 1
    plateCount = 0
    plateStart = t0
    cycleStart = t0
    if (fresh) firstCycle = true
  }

  /** Plan displacement of bob k at time t, as a fraction of the longest bob's full swing. */
  function planD(k: number, t: number) {
    return (lengthNow(k, t) * Math.sin(thetaAt(k, t))) / (lengthOf(gamma, 0) * Math.sin(THETA0))
  }

  function fillPlate(t: number) {
    if (gather) return
    const due = Math.min(nLines, Math.floor((t - plateStart) / stride + 1e-9) + 1)
    for (let mm = plateCount; mm < due; mm++) {
      const tm = plateStart + mm * stride
      for (let k = 0; k < K; k++) plate[mm * K + k] = planD(k, tm)
    }
    if (due > plateCount) plateCount = due
  }

  /* ----------------------------------------------------------- drawing */

  const X = (x: number, z: number) => ox + (x + z * OCX) * s
  const Y = (y: number, z: number) => oy + (y - z * OCY) * s

  // bob screen positions (centre) for the current frame
  const bx = new Float64Array(K)
  const by = new Float64Array(K)
  const bz = new Float64Array(K)
  const th = new Float64Array(K)
  const order = Array.from({ length: K }, (_, i) => i)

  function drawFrameStructure(alpha: number, ink: string) {
    if (alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = ink
    const D = 18
    const xa = -60
    const xb = 14 * SPACING + 60
    // base plate: top face (receding) and front face, hatched
    const BD = 56
    ctx.beginPath()
    ctx.moveTo(X(xa - 18, -BD), Y(BASE_Y, -BD))
    ctx.lineTo(X(xb + 18, -BD), Y(BASE_Y, -BD))
    ctx.lineTo(X(xb + 18, BD), Y(BASE_Y, BD))
    ctx.lineTo(X(xa - 18, BD), Y(BASE_Y, BD))
    ctx.closePath()
    ctx.moveTo(X(xa - 18, -BD), Y(BASE_Y + 12, -BD))
    ctx.lineTo(X(xb + 18, -BD), Y(BASE_Y + 12, -BD))
    ctx.lineTo(X(xb + 18, BD), Y(BASE_Y + 12, BD))
    ctx.moveTo(X(xa - 18, -BD), Y(BASE_Y, -BD))
    ctx.lineTo(X(xa - 18, -BD), Y(BASE_Y + 12, -BD))
    ctx.moveTo(X(xb + 18, -BD), Y(BASE_Y, -BD))
    ctx.lineTo(X(xb + 18, -BD), Y(BASE_Y + 12, -BD))
    ctx.moveTo(X(xb + 18, BD), Y(BASE_Y, BD))
    ctx.lineTo(X(xb + 18, BD), Y(BASE_Y + 12, BD))
    ctx.stroke()
    // section hatch on the base's front face
    ctx.save()
    ctx.beginPath()
    ctx.rect(X(xa - 18, -BD), Y(BASE_Y, -BD), (xb - xa + 36) * s, 12 * s)
    ctx.clip()
    ctx.strokeStyle = rgba(ink, 0.35)
    ctx.beginPath()
    const hx0 = X(xa - 18, -BD)
    const hy0 = Y(BASE_Y, -BD)
    const gap = Math.max(3, 5 * s)
    for (let d = -14 * s; d < (xb - xa + 50) * s; d += gap) {
      ctx.moveTo(hx0 + d, hy0 + 12 * s)
      ctx.lineTo(hx0 + d + 12 * s, hy0)
    }
    ctx.stroke()
    ctx.restore()
    // uprights: front and side faces
    for (const ux of [xa, xb - 20]) {
      ctx.beginPath()
      ctx.moveTo(X(ux, -D), Y(0, -D))
      ctx.lineTo(X(ux, -D), Y(BASE_Y, -D))
      ctx.moveTo(X(ux + 20, -D), Y(0, -D))
      ctx.lineTo(X(ux + 20, -D), Y(BASE_Y, -D))
      ctx.moveTo(X(ux + 20, D), Y(0, D))
      ctx.lineTo(X(ux + 20, D), Y(BASE_Y, D))
      ctx.stroke()
      // a brace foot
      ctx.beginPath()
      ctx.moveTo(X(ux - 28, -D), Y(BASE_Y, -D))
      ctx.lineTo(X(ux, -D), Y(BASE_Y - 46, -D))
      ctx.moveTo(X(ux + 48, -D), Y(BASE_Y, -D))
      ctx.lineTo(X(ux + 20, -D), Y(BASE_Y - 46, -D))
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawBeam(alpha: number, ink: string) {
    if (alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    const D = 18
    const xa = -60
    const xb = 14 * SPACING + 60
    // paper behind the beam so strings disappear under it
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.moveTo(X(xa, -D), Y(-16, -D))
    ctx.lineTo(X(xa, D), Y(-16, D))
    ctx.lineTo(X(xb, D), Y(-16, D))
    ctx.lineTo(X(xb, D), Y(0, D))
    ctx.lineTo(X(xb, -D), Y(0, -D))
    ctx.lineTo(X(xa, -D), Y(0, -D))
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = ink
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(X(xa, -D), Y(-16, -D))
    ctx.lineTo(X(xb, -D), Y(-16, -D))
    ctx.lineTo(X(xb, D), Y(-16, D))
    ctx.moveTo(X(xb, -D), Y(-16, -D))
    ctx.lineTo(X(xb, -D), Y(0, -D))
    ctx.stroke()
    // the end face, hatched (a section through the beam)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(X(xb, -D), Y(-16, -D))
    ctx.lineTo(X(xb, D), Y(-16, D))
    ctx.lineTo(X(xb, D), Y(0, D))
    ctx.lineTo(X(xb, -D), Y(0, -D))
    ctx.closePath()
    ctx.clip()
    ctx.strokeStyle = rgba(ink, 0.45)
    ctx.beginPath()
    const ex = X(xb, -D)
    const ey = Y(-16, -D)
    for (let d = -30 * s; d < 40 * s; d += Math.max(2.5, 3.5 * s)) {
      ctx.moveTo(ex + d, ey + 20 * s)
      ctx.lineTo(ex + d + 20 * s, ey - 10 * s)
    }
    ctx.stroke()
    ctx.restore()
    // screw heads on the front face where each V is tied
    if (s > 0.55) {
      ctx.strokeStyle = rgba(ink, 0.5)
      ctx.beginPath()
      for (let k = 0; k < K; k++) {
        const cx = X(k * SPACING, -D)
        const cy = Y(-8, -D)
        ctx.moveTo(cx + 2.2 * s, cy)
        ctx.arc(cx, cy, 2.2 * s, 0, TAU)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /** A bob: a paper disc, its outline, and a hatched shadow crescent at lower right. */
  function bob(x: number, y: number, r: number, ink: string, accent: string | null) {
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
    if (r > 3.2) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.clip()
      ctx.beginPath()
      ctx.rect(x - r * 2, y - r * 2, r * 4, r * 4)
      ctx.arc(x - r * 0.42, y - r * 0.42, r * 1.05, 0, TAU, true)
      ctx.clip('evenodd')
      ctx.strokeStyle = rgba(accent ?? ink, 0.55)
      ctx.lineWidth = 1
      ctx.beginPath()
      const g = Math.max(1.6, r * 0.2)
      for (let d = -r * 2; d <= r * 2; d += g) {
        ctx.moveTo(x + d - r, y + r)
        ctx.lineTo(x + d + r, y - r)
      }
      ctx.stroke()
      ctx.restore()
    } else {
      ctx.fillStyle = rgba(accent ?? ink, 0.5)
      ctx.beginPath()
      ctx.arc(x + r * 0.25, y + r * 0.25, r * 0.6, 0, TAU)
      ctx.fill()
    }
    ctx.strokeStyle = accent ?? ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.stroke()
  }

  function drawPendulums(T: number, appear: number) {
    const k0 = { ink: C.ink }
    for (let k = 0; k < K; k++) {
      const L = lengthNow(k, T)
      const a = thetaAt(k, T)
      th[k] = a
      const z = L * Math.sin(a)
      const y = L * Math.cos(a)
      bx[k] = X(k * SPACING, z)
      by[k] = Y(y, z)
      bz[k] = z
    }
    // the swing arcs and the rest curve, faint
    if (!tiny) {
      ctx.save()
      ctx.globalAlpha = appear
      ctx.strokeStyle = rgba(C.ink, 0.16)
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3])
      ctx.beginPath()
      for (let k = 0; k < K; k++) {
        const L = lengthNow(k, T)
        const A = Math.max(Math.abs(amp[k]), k === drag ? Math.abs(dragTheta) : 0, gather ? THETA0 : 0)
        if (A < 0.01) continue
        for (let i = 0; i <= 16; i++) {
          const f = -A + (2 * A * i) / 16
          const xx = X(k * SPACING, L * Math.sin(f))
          const yy = Y(L * Math.cos(f), L * Math.sin(f))
          if (i) ctx.lineTo(xx, yy)
          else ctx.moveTo(xx, yy)
        }
      }
      ctx.stroke()
      ctx.beginPath()
      for (let k = 0; k < K; k++) {
        const xx = X(k * SPACING, 0)
        const yy = Y(lengthNow(k, T), 0)
        if (k) ctx.lineTo(xx, yy)
        else ctx.moveTo(xx, yy)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
    // back to front
    order.sort((a, b) => bz[b] - bz[a])
    const r = Math.max(1.8, BOB_R * s)
    for (const k of order) {
      const L = lengthNow(k, T)
      // a drop-in during the opening: strings lower from the beam
      const drop = clamp(appear * 1.6 - (k / K) * 0.6)
      if (drop <= 0) continue
      const a = th[k]
      const z = L * Math.sin(a) * drop
      const y = L * Math.cos(a) * drop
      const cx = X(k * SPACING, z)
      const cy = Y(y, z)
      bx[k] = cx
      by[k] = cy
      const hot = k === drag || k === hover
      const accent = hot ? C.ocean : null
      ctx.strokeStyle = hot ? C.ocean : rgba(k0.ink, 0.8)
      ctx.lineWidth = 1
      ctx.beginPath()
      // the bifilar V: two threads from the beam to the top of the bob
      const tz = (L - BOB_R) * drop
      const tx = X(k * SPACING, tz * Math.sin(a))
      const ty = Y(tz * Math.cos(a), tz * Math.sin(a))
      ctx.moveTo(X(k * SPACING - V_HALF, 0), Y(0, 0))
      ctx.lineTo(tx, ty)
      ctx.lineTo(X(k * SPACING + V_HALF, 0), Y(0, 0))
      ctx.stroke()
      bob(cx, cy, r, C.ink, accent)
    }
  }

  /** Smooth ridge through the columns at baseline yb (Catmull-Rom as cubic Béziers). */
  const rx = new Float64Array(K + 2)
  const ry = new Float64Array(K + 2)
  function ridgePath(yb: number, a: number, vals: ArrayLike<number>, off: number) {
    rx[0] = colX[0] - plateLead
    ry[0] = yb
    for (let k = 0; k < K; k++) {
      rx[k + 1] = colX[k]
      ry[k + 1] = yb - a * vals[off + k]
    }
    rx[K + 1] = colX[K - 1] + plateLead
    ry[K + 1] = yb
    const n = K + 2
    ctx.moveTo(rx[0], ry[0])
    for (let i = 0; i < n - 1; i++) {
      const i0 = Math.max(0, i - 1)
      const i3 = Math.min(n - 1, i + 2)
      const c1x = rx[i] + (rx[i + 1] - rx[i0]) / 6
      const c1y = ry[i] + (ry[i + 1] - ry[i0]) / 6
      const c2x = rx[i + 1] - (rx[i3] - rx[i]) / 6
      const c2y = ry[i + 1] - (ry[i3] - ry[i]) / 6
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, rx[i + 1], ry[i + 1])
    }
  }

  const live = new Float32Array(K)
  /** Display stride (seconds per drawn line): the smallest divisor of Γ that keeps lines apart. */
  function displayStride(H: number) {
    const minDy = small ? 3.6 : 3.1
    for (let d = 1; d <= 12; d++) if (gamma % d === 0 && H / (gamma / d + 2.2) >= minDy) return d
    return 12
  }

  function drawPlate(T: number, appear: number) {
    const top = py0
    const bot = py1
    const H = bot - top
    if (H < 30) return
    const ds = displayStride(H)
    const n = gamma / ds + 1
    const dy = (H - 4) / (n + 3.8)
    const a = Math.min(dy * 2.4, H * 0.09)
    const y0 = top + a + 2
    ctx.save()
    ctx.beginPath()
    ctx.rect(px0 - 6, top - 4, px1 - px0 + 12, H + 8)
    ctx.clip()
    ctx.lineWidth = 1
    // last cycle's plate, fading under the new one
    const fade = 1 - smoothstep(0, 5, T - oldStart)
    if (fade > 0 && oldCount > 0) {
      const ods = Math.max(1, Math.ceil((oldN - 1) / Math.max(4, Math.floor(H / (small ? 3.6 : 3.1)) - 2)))
      const on = Math.floor((oldN - 1) / ods) + 1
      const ody = (H - 4) / (on + 3.8)
      const oa = Math.min(ody * 2.4, H * 0.09)
      ctx.globalAlpha = fade * 0.5 * appear
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      for (let j = 0; j * ods < oldCount; j++) ridgePath(top + oa + 2 + j * ody, oa, oldPlate, j * ods * K)
      ctx.stroke()
    }
    ctx.globalAlpha = appear
    const frac = (sec: number) => {
      for (const fr of FRACTIONS) if (Math.abs(sec - fr.f * gamma) < ds * 0.5 && fr.q <= 4) return fr
      return null
    }
    let j = 0
    for (; j * ds < plateCount; j++) {
      const mm = j * ds
      const yb = y0 + j * dy
      ctx.beginPath()
      ridgePath(yb, a, plate, mm * K)
      ctx.lineTo(colX[K - 1] + plateLead, yb + a + 2)
      ctx.lineTo(colX[0] - plateLead, yb + a + 2)
      ctx.closePath()
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.beginPath()
      ridgePath(yb, a, plate, mm * K)
      const fr = frac(mm)
      const edge = mm === 0 || mm === gamma
      ctx.strokeStyle = edge ? C.moss : fr ? rgba(C.ocean, 0.85) : rgba(C.ink, 0.78)
      ctx.stroke()
    }
    // the live row (the plan view now), wriggling at the foot of the stack until the next strobe
    if (j * ds <= gamma && !gather) {
      const yb = y0 + j * dy
      for (let k = 0; k < K; k++) live[k] = planD(k, T)
      ctx.beginPath()
      ridgePath(yb, a, live, 0)
      ctx.lineTo(colX[K - 1] + plateLead, yb + a + 2)
      ctx.lineTo(colX[0] - plateLead, yb + a + 2)
      ctx.closePath()
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.beginPath()
      ridgePath(yb, a, live, 0)
      ctx.strokeStyle = rgba(C.ocean, 0.55)
      ctx.stroke()
      if (!tiny) {
        ctx.fillStyle = C.ocean
        ctx.beginPath()
        for (let k = 0; k < K; k++) {
          const yy = yb - a * live[k]
          ctx.moveTo(colX[k] + 1.8, yy)
          ctx.arc(colX[k], yy, 1.8, 0, TAU)
        }
        ctx.fill()
      }
    }
    ctx.restore()
    ctx.globalAlpha = 1
    return { y0, dy, a, ds, n }
  }

  function plateChrome(sc: number, geo: { y0: number; dy: number; a: number; ds: number; n: number } | undefined, appear: number) {
    if (!geo || preview) return
    const { y0, dy, ds, n } = geo
    ctx.save()
    ctx.globalAlpha = appear
    ctx.lineWidth = 1
    // time axis at the left: one tick per drawn line, longer every quarter cycle
    const ax = px0 - (tiny ? 4 : 8)
    const yAt = (sec: number) => y0 + (sec / ds) * dy
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.beginPath()
    ctx.moveTo(ax, y0)
    ctx.lineTo(ax, y0 + (n - 1) * dy)
    const quarter = gamma % 4 === 0 ? gamma / 4 : gamma / 3
    for (let j = 0; j < n; j++) {
      const yy = Math.round(y0 + j * dy) + 0.5
      const major = (j * ds) % quarter === 0
      ctx.moveTo(ax, yy)
      ctx.lineTo(ax - (major ? 6 : 3), yy)
    }
    ctx.stroke()
    if (!tiny && dy * (n - 1) > 90) {
      for (let q = 0; q <= gamma + 0.01; q += quarter) {
        text(ctx, Math.abs(q - gamma) < 0.01 && !small ? `${gamma} S` : String(Math.round(q)), ax - 9, yAt(q) + 3, { size: 8.5, color: C.muted, align: 'right', tracking: 0.1 })
      }
    }
    // the playhead on the axis
    const yp = yAt(clamp(sc, 0, gamma))
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.moveTo(ax + 1, yp)
    ctx.lineTo(ax + 6, yp - 3.2)
    ctx.lineTo(ax + 6, yp + 3.2)
    ctx.closePath()
    ctx.fill()
    // simple fractions of the cycle on the right
    if (!tiny && w - px1 > 26) {
      const rxx = px1 + 6
      let lastY = -99
      for (const fr of FRACTIONS) {
        const yy = yAt(fr.f * gamma)
        if (yy - lastY < (small ? 12 : 11)) continue
        lastY = yy
        const passed = sc >= fr.f * gamma
        ctx.strokeStyle = passed ? rgba(C.ocean, 0.8) : rgba(C.ink, 0.3)
        ctx.beginPath()
        ctx.moveTo(px1 - 2, yy)
        ctx.lineTo(rxx, yy)
        ctx.stroke()
        if (w - rxx > 30) text(ctx, `${fr.p}/${fr.q}`, rxx + 3, yy + 3, { size: 8.5, color: passed ? C.ocean : C.muted, tracking: 0.06 })
      }
    }
    // heading
    if (!tiny) {
      const every = ds === 1 ? 'ONCE A SECOND' : `EVERY ${ds} S`
      const label = mode === 'wide' && w > 1100 ? `PLAN — THE ROW FROM ABOVE, STROBED ${every}` : small ? `PLAN · STROBED ${ds === 1 ? '1/S' : `${ds} S`}` : `PLAN — STROBED ${every}`
      text(ctx, label, px0, py0 - 7, { size: small ? 8 : 9, color: C.muted, tracking: 0.14 })
    }
    ctx.restore()
  }

  /** Projection lines from the elevation down into the plate (aligned layouts). */
  function projectionLines(appear: number) {
    if (!aligned || tiny || preview) return
    ctx.save()
    ctx.globalAlpha = appear
    ctx.strokeStyle = rgba(C.ink, 0.09)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    const yTop = Y(BASE_Y + 14, -56) + 4
    for (let k = 0; k < K; k++) {
      ctx.moveTo(Math.round(colX[k]) + 0.5, yTop)
      ctx.lineTo(Math.round(colX[k]) + 0.5, py1)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  function elevationNotes(T: number, appear: number) {
    if (tiny || preview) return
    ctx.save()
    ctx.globalAlpha = appear
    ctx.lineWidth = 1
    const ink2 = C.ink2
    // L₁ and L₁₅ dimensioned at rest, outside the frame, text along the line
    const L0 = lengthNow(0, T)
    const L14 = lengthNow(K - 1, T)
    const dimX0 = X(-104, 0)
    const dimX1 = X(14 * SPACING + 104, 0)
    const yA = Y(0, 0)
    const fs = small ? 8 : 9
    const dimLine = (x: number, y1: number, y2: number, label: string, xFrom: number) => {
      ctx.strokeStyle = rgba(ink2, 0.35)
      ctx.setLineDash([1.5, 2.5])
      ctx.beginPath()
      ctx.moveTo(xFrom, y2)
      ctx.lineTo(x + (x < xFrom ? -4 : 4), y2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = rgba(ink2, 0.75)
      ctx.beginPath()
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y2)
      ctx.moveTo(x - 2.5, y1 + 5)
      ctx.lineTo(x, y1)
      ctx.lineTo(x + 2.5, y1 + 5)
      ctx.moveTo(x - 2.5, y2 - 5)
      ctx.lineTo(x, y2)
      ctx.lineTo(x + 2.5, y2 - 5)
      ctx.stroke()
      // the value set along the line, on a paper gap
      setFont(ctx, { size: fs, tracking: 0.08 })
      const lw = ctx.measureText(label).width
      if (lw + 16 < y2 - y1) {
        ctx.save()
        ctx.translate(x, (y1 + y2) / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillStyle = C.paper
        ctx.fillRect(-lw / 2 - 4, -6, lw + 8, 12)
        text(ctx, label, 0, 0, { size: fs, color: ink2, align: 'center', baseline: 'middle', tracking: 0.08 })
        ctx.restore()
      }
    }
    if (s > 0.3) {
      dimLine(dimX0, yA, Y(L0, 0), small ? `L₁ ${L0.toFixed(0)}` : `L₁ = ${L0.toFixed(1)} MM`, X(-BOB_R - 4, 0))
      dimLine(dimX1, yA, Y(L14, 0), small ? `L₁₅ ${L14.toFixed(0)}` : `L₁₅ = ${L14.toFixed(1)} MM`, X(14 * SPACING + BOB_R + 4, 0))
    }
    if (mode === 'wide' || mode === 'portrait') {
      const ly = Y(-16, 18) - (mode === 'wide' ? 12 : 9)
      let bx0 = X(-60, -18)
      if (mode === 'wide') {
        const lab = 'ELEVATION — SWING PLANE RECEDING AT 35°'
        text(ctx, lab, bx0, ly, { size: 9, color: C.muted, tracking: 0.14 })
        setFont(ctx, { size: 9, tracking: 0.14 })
        bx0 += ctx.measureText(lab).width + 22
      }
      // a 100 mm scale bar
      const byy = ly - 2
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.moveTo(bx0, byy)
      ctx.lineTo(bx0 + 100 * s, byy)
      for (let q = 0; q <= 4; q++) {
        ctx.moveTo(bx0 + (100 * s * q) / 4 + 0.5, byy)
        ctx.lineTo(bx0 + (100 * s * q) / 4 + 0.5, byy - (q % 2 === 0 ? 5 : 3))
      }
      ctx.stroke()
      text(ctx, '100 MM', bx0 + 100 * s + 6, byy + 1, { size: 8.5, color: C.muted, tracking: 0.12 })
    }
    ctx.restore()
  }

  /** N for each pendulum, along the foot of the plate's columns. */
  function columnLabels() {
    if (tiny || preview || !aligned || colX[1] - colX[0] < 15) return
    const yN = py1 + 13
    if (yN > h - 4) return
    for (let k = 0; k < K; k++) {
      const hot = k === hover || k === drag
      text(ctx, String(gamma + k), colX[k], yN, { size: colX[1] - colX[0] > 30 ? 9 : 8, color: hot ? C.ocean : C.muted, align: 'center', tracking: 0.02 })
    }
    if (mode === 'wide' && w - (colX[K - 1] + plateLead + 8) > 52) text(ctx, 'SWINGS', colX[K - 1] + plateLead + 8, yN, { size: 8.5, color: C.muted, tracking: 0.12 })
  }

  /** At a simple fraction of the cycle, join each in-step group with a coloured line. */
  function groups(sc: number) {
    if (!tiny && !preview) {
      // the wave itself: a faint line through the row
      ctx.strokeStyle = rgba(C.ink, 0.14)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let k = 0; k < K; k++) {
        if (k) ctx.lineTo(bx[k], by[k])
        else ctx.moveTo(bx[k], by[k])
      }
      ctx.stroke()
    }
    if (gather || disturbed) return null
    const win = clamp(gamma * 0.013, 0.45, 1.5)
    // all in phase at the start/end of a cycle
    const dEnd = Math.min(Math.abs(sc), Math.abs(sc - gamma))
    if (dEnd < win * 1.6 && sc > -0.01) {
      const a = 1 - dEnd / (win * 1.6)
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let k = 0; k < K; k++) {
        if (k) ctx.lineTo(bx[k], by[k])
        else ctx.moveTo(bx[k], by[k])
      }
      ctx.stroke()
      ctx.restore()
      return { q: 1, p: 0, a }
    }
    let best: { p: number; q: number; f: number } | null = null
    let bestD = 1e9
    for (const fr of FRACTIONS) {
      const d = Math.abs(sc - fr.f * gamma)
      if (d < win && (best === null || fr.q < best.q || (fr.q === best.q && d < bestD))) {
        best = fr
        bestD = d
      }
    }
    if (!best) return null
    const a = 1 - bestD / win
    ctx.save()
    ctx.lineWidth = 1.2
    for (let j = 0; j < best.q; j++) {
      ctx.globalAlpha = a * 0.9
      ctx.strokeStyle = GROUP_COLORS[j % GROUP_COLORS.length]
      ctx.beginPath()
      let first = true
      for (let k = j; k < K; k += best.q) {
        if (first) ctx.moveTo(bx[k], by[k])
        else ctx.lineTo(bx[k], by[k])
        first = false
      }
      ctx.stroke()
    }
    ctx.restore()
    return { q: best.q, p: best.p, a }
  }

  function captionsFor(sc: number): { c: Caption; t0: number; t1: number } | null {
    const word = GAMMA_WORDS[gamma] ?? `${gamma} seconds`
    const list: { c: Caption; t0: number; t1: number }[] = []
    const c2 = Math.max(8, gamma * 0.17)
    if (firstCycle) list.push({ c: { key: 'a', lines: [{ s: 'Fifteen pendulums,' }, { s: 'released ', em: 'together.' }] }, t0: -INTRO + 0.7, t1: 6.6 })
    list.push({ c: { key: 'b', lines: [{ s: 'Each keeps' }, { s: 'its own ', em: 'time.' }] }, t0: c2, t1: c2 + 9 })
    list.push({ c: { key: 'c', lines: [{ s: `And every ${word},` }, { s: 'they ', em: 'agree again.' }] }, t0: gamma - 8.5, t1: gamma + 1.6 })
    for (const it of list) if (sc >= it.t0 - 0.1 && sc <= it.t1 + 0.1) return it
    // the last caption runs on a moment past the realignment
    if (!firstCycle) for (const it of list) if (sc + gamma >= it.t0 && sc + gamma <= it.t1 + 0.1) return { ...it, t0: it.t0 - gamma, t1: it.t1 - gamma }
    return null
  }

  function drawCaption(sc: number) {
    if (preview) return
    const it = captionsFor(sc)
    if (!it) return
    const lineH = capSize * 1.06
    let size = capSize
    // shrink to fit the column
    setFont(ctx, { font: 'serif', size })
    let widest = 0
    for (const ln of it.c.lines) {
      setFont(ctx, { font: 'serif', size })
      let wv = ln.s ? ctx.measureText(ln.s).width : 0
      setFont(ctx, { font: 'serif', size, italic: true })
      wv += ln.em ? ctx.measureText(ln.em).width : 0
      widest = Math.max(widest, wv)
    }
    if (widest > capW) size = Math.max(11, Math.floor((size * capW) / widest))
    it.c.lines.forEach((ln, li) => {
      const pr = ease.outExpo(clamp((sc - it.t0 - li * 0.14) / 1.0))
      const pe = ease.inCubic(clamp((sc - (it.t1 - 0.7 + li * 0.08)) / 0.6))
      if (pr <= 0 || pe >= 1) return
      const y = capY + size + li * lineH * (size / capSize)
      ctx.save()
      ctx.beginPath()
      ctx.rect(capX - 4, y - size * 1.02, w, size * 1.32)
      ctx.clip()
      const dy = (1 - pr) * size * 1.15 - pe * size * 0.9
      setFont(ctx, { font: 'serif', size })
      const sw = ln.s ? ctx.measureText(ln.s).width : 0
      ctx.globalAlpha = 1 - pe * 0.6
      if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size, color: C.ink })
      if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size, italic: true, color: C.moss })
      ctx.restore()
    })
  }

  function table(T: number) {
    if (!tableOn) return
    const rows = K
    const rowH = clamp((h - tableY - m - 8) / (rows + 2.4), 10, 17)
    if (rowH < 10.5) return
    const x = tableX
    let y = tableY
    const cols = [0, 34, 82, 152]
    const fs = rowH > 13 ? 9 : 8
    text(ctx, 'SCHEDULE', x, y, { size: 9, color: C.muted, tracking: 0.14 })
    text(ctx, 'T = 2π√(L / g)', x + cols[2], y, { size: 9, color: C.ink2, tracking: 0.04 })
    y += rowH * 1.1
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, Math.round(y - rowH * 0.62) + 0.5)
    ctx.lineTo(x + 210, Math.round(y - rowH * 0.62) + 0.5)
    ctx.stroke()
    const head = ['K', 'N', 'T  S', 'L  MM']
    head.forEach((hd, i) => text(ctx, hd, x + cols[i], y, { size: 8, color: C.muted, tracking: 0.12 }))
    y += rowH
    for (let k = 0; k < K; k++) {
      const hot = k === hover || k === drag
      const col = hot ? C.ocean : C.ink
      const L = lengthNow(k, T)
      const Tp = TAU * Math.sqrt(L / 1000 / G)
      text(ctx, String(k + 1).padStart(2, '0'), x + cols[0], y, { size: fs, color: hot ? C.ocean : C.muted, tracking: 0.06 })
      text(ctx, String(gamma + k), x + cols[1], y, { size: fs, color: col, tracking: 0.06 })
      text(ctx, Tp.toFixed(4), x + cols[2], y, { size: fs, color: col, tracking: 0.06 })
      text(ctx, L.toFixed(1), x + cols[3], y, { size: fs, color: col, tracking: 0.06 })
      // a little phase dial: where this bob is in its swing
      const ph = Math.atan2(-Math.sin(omega[k] * (T - tau[k])), Math.cos(omega[k] * (T - tau[k])))
      const dcx = x + 214
      const dcy = y - rowH * 0.32
      const rr = Math.min(5, rowH * 0.34)
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.beginPath()
      ctx.arc(dcx, dcy, rr, 0, TAU)
      ctx.stroke()
      if (!gather && Math.abs(amp[k]) > 0.01) {
        ctx.strokeStyle = hot ? C.ocean : C.ink
        ctx.beginPath()
        ctx.moveTo(dcx, dcy)
        ctx.lineTo(dcx + Math.cos(ph - Math.PI / 2) * rr, dcy + Math.sin(ph - Math.PI / 2) * rr)
        ctx.stroke()
      }
      y += rowH
    }
    text(ctx, `Lₖ = g · (Γ / 2π Nₖ)²   g = ${G} M/S²`, x, y + rowH * 0.4, { size: 8.5, color: C.ink2, tracking: 0.04 })
  }

  function header(sc: number, grp: { q: number; p: number; a: number } | null) {
    const kick = small ? `${FIG} — PENDULUM WAVE` : `${FIG} — PENDULUM WAVE · ${K} PENDULUMS`
    text(ctx, kick, m + 2, m + (small ? 8 : 10), { size: small ? 8.5 : 10, color: C.muted, tracking: 0.16 })
    if (!small) {
      text(ctx, `Γ = ${gamma} S · N = ${gamma} … ${gamma + K - 1} SWINGS PER CYCLE · θ₀ = 12°`, m + 2, m + 26, { size: 9, color: C.ink2, tracking: 0.12 })
    }
    // readouts, top right
    const items: [string, string][] = []
    const scc = clamp(sc, 0, gamma)
    items.push(['Γ', `${gamma} S`])
    items.push(['s', `${scc.toFixed(1).padStart(4, '0')} S`])
    if (!tiny) items.push(['Δφ', `${((360 * scc) / gamma).toFixed(1)}°`])
    if (!small) items.push(['IN PHASE IN', `${Math.max(0, gamma - scc).toFixed(1)} S`])
    let y = m + (small ? 8 : 10)
    const vs = small ? 9 : 10.5
    if (small && !preview && mode !== 'portrait') {
      // one line
      let x = w - m - 2
      for (let i = items.length - 1; i >= 0; i--) {
        const [l, v] = items[i]
        setFont(ctx, { size: vs, tracking: 0.06 })
        const vw = ctx.measureText(v).width
        text(ctx, v, x, y, { size: vs, color: C.ink, align: 'right', tracking: 0.06 })
        setFont(ctx, { size: 8.5, tracking: 0.14 })
        const lw = ctx.measureText(l.toUpperCase()).width
        text(ctx, l, x - vw - 6, y, { size: 8.5, color: C.muted, align: 'right', tracking: 0.14, upper: l !== 's' && l !== 'Δφ' })
        x -= vw + lw + 18
        if (x < w * 0.45) break
      }
    } else if (!preview) {
      for (const [l, v] of items) {
        setFont(ctx, { size: vs, tracking: 0.06 })
        const vw = ctx.measureText(v).width
        text(ctx, v, w - m - 2, y, { size: vs, color: C.ink, align: 'right', tracking: 0.06 })
        text(ctx, l, w - m - 2 - vw - 10, y, { size: 9, color: C.muted, align: 'right', tracking: 0.14, upper: l !== 's' && l !== 'Δφ' })
        y += small ? 13 : 16
      }
    }
    // the group label
    if (grp && grp.a > 0.02 && !preview) {
      const label = grp.q === 1 ? 'ALL FIFTEEN IN PHASE' : `${grp.p}/${grp.q} Γ — ${NUMWORD[grp.q].toUpperCase()} GROUPS`
      const lx = mode === 'wide' ? capX : mode === 'side' ? capX : m + 2
      const ly = mode === 'wide' ? capY - 12 : mode === 'side' ? Math.max(headerH, capY - 4) : mode === 'portrait' ? capY - 10 : py0 - 7
      ctx.save()
      ctx.globalAlpha = grp.a
      if (mode === 'stack') {
        setFont(ctx, { size: 9, tracking: 0.14 })
        const lw = ctx.measureText(label).width
        ctx.fillStyle = C.paper
        ctx.fillRect(w - m - lw - 6, ly - 10, lw + 8, 14)
        text(ctx, label, w - m - 2, ly, { size: 9, color: grp.q === 1 ? C.moss : C.ocean, align: 'right', tracking: 0.14 })
      } else text(ctx, label, lx, ly, { size: small ? 8.5 : 9.5, color: grp.q === 1 ? C.moss : C.ocean, tracking: 0.14 })
      ctx.restore()
    }
  }

  function ghost(T: number) {
    if (preview || acted) return
    const g0 = INTRO + 3.2
    const g1 = INTRO + 8.6
    if (T < g0 || T > g1) return
    const u = (T - g0) / (g1 - g0)
    const k = 10
    const L = Lmm[k]
    const al = smoothstep(0, 0.08, u) * (1 - smoothstep(0.9, 1, u))
    // a ring that follows one bob, and the arc it could be pulled along
    const fNow = th[k]
    const fEnd = 23 * DEG
    const arcAt = (f: number) => [X(k * SPACING, L * Math.sin(f)), Y(L * Math.cos(f), L * Math.sin(f))] as const
    ctx.save()
    ctx.globalAlpha = al
    ctx.strokeStyle = rgba(C.ocean, 0.75)
    ctx.lineWidth = 1
    ctx.setLineDash([1.5, 3.5])
    ctx.beginPath()
    for (let i = 0; i <= 20; i++) {
      const [xx, yy] = arcAt(lerp(fNow, fEnd, i / 20))
      if (i) ctx.lineTo(xx, yy)
      else ctx.moveTo(xx, yy)
    }
    ctx.stroke()
    ctx.setLineDash([])
    const rr = Math.max(9, BOB_R * s + 5)
    ctx.beginPath()
    ctx.arc(bx[k], by[k], rr, 0, TAU)
    ctx.stroke()
    // the hand: a dot that pulls out along the arc, twice
    const pulse = (u * 2) % 1
    const e = ease.inOutSine(clamp(pulse * 1.25))
    const [gx, gy] = arcAt(lerp(fNow, fEnd, e))
    ctx.globalAlpha = al * (1 - smoothstep(0.82, 1, pulse))
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(gx, gy, 3.2, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = al
    const [ex, ey] = arcAt(fEnd)
    const label = touch ? 'DRAG A BOB · TAP TO RELEASE ALL' : 'DRAG A BOB ASIDE · CLICK TO RELEASE ALL'
    setFont(ctx, { size: 9, tracking: 0.14 })
    const lw = ctx.measureText(label).width
    const right = ex + 12 + lw < Math.min(w - m, X(14 * SPACING + 80, 0))
    const lx = right ? ex + 12 : Math.max(m, ex - 12 - lw)
    const ly = Math.max(headerH + 10, ey - 8)
    ctx.fillStyle = rgba(C.paper, 0.88)
    ctx.fillRect(lx - 3, ly - 10, lw + 6, 14)
    text(ctx, label, lx, ly, { size: 9, color: C.ocean, tracking: 0.14 })
    ctx.restore()
  }

  function prompts(T: number) {
    if (preview) return
    // while dragging: the angle; after a disturbance: how to bring them back together
    if (drag >= 0) {
      const lbl = `θ ${(dragTheta / DEG).toFixed(1)}° · LET GO TO SWING`
      setFont(ctx, { size: 9, tracking: 0.12 })
      const lw = ctx.measureText(lbl).width
      const lx = clamp(bx[drag] + 14, m, w - m - lw)
      const ly = Math.max(headerH + 10, by[drag] - BOB_R * s - 12)
      ctx.fillStyle = rgba(C.paper, 0.85)
      ctx.fillRect(lx - 3, ly - 10, lw + 6, 14)
      text(ctx, lbl, lx, ly, { size: 9, color: C.ocean, tracking: 0.12 })
      return
    }
    if (hover >= 0 && !small) {
      const k = hover
      const L = Lmm[k]
      const lbl = `N ${gamma + k} · T ${(TAU * Math.sqrt(L / 1000 / G)).toFixed(3)} S · L ${L.toFixed(1)} MM`
      setFont(ctx, { size: 9, tracking: 0.12 })
      const lw = ctx.measureText(lbl).width
      const lx = clamp(bx[k] + 14, m, w - m - lw)
      const ly = Math.max(headerH + 10, by[k] - BOB_R * s - 12)
      ctx.fillStyle = rgba(C.paper, 0.85)
      ctx.fillRect(lx - 3, ly - 10, lw + 6, 14)
      text(ctx, lbl, lx, ly, { size: 9, color: C.ocean, tracking: 0.12 })
    }
    if (disturbed && T - cycleStart > 1) {
      const lbl = touch ? 'TAP TO RELEASE ALL TOGETHER' : 'CLICK OR SPACE TO RELEASE ALL TOGETHER'
      if (aligned) text(ctx, lbl, px1, h - m + (tiny ? 0 : 2), { size: 8.5, color: C.ocean, align: 'right', tracking: 0.14 })
      else text(ctx, lbl, w - m, h - 4, { size: 8, color: C.ocean, align: 'right', tracking: 0.14 })
    }
  }

  /* ------------------------------------------------------------- sound */

  function sound(T: number, dt: number) {
    if (!sfx.enabled || dt <= 0 || dt > 0.1 || prevT < 0) {
      for (let k = 0; k < K; k++) prevTheta[k] = th[k]
      return
    }
    lastNotes = Math.max(0, lastNotes - dt * 40)
    for (let k = 0; k < K; k++) {
      const a = th[k]
      const b = prevTheta[k]
      // one note per swing, as the bob passes the bottom moving outward
      if (k !== drag && b < 0 && a >= 0 && Math.abs(amp[k]) > 0.02 && !gather) {
        if (lastNotes < 40) {
          const level = clamp(Math.abs(amp[k]) / THETA0, 0.3, 1.6)
          sfx.tone(noteOf(k), 1.3, { type: 'sine', gain: 0.022 * level, attack: 0.004, pan: (k / (K - 1) - 0.5) * 1.3, room: 0.35 })
          lastNotes++
        }
      }
      prevTheta[k] = a
    }
    void T
  }

  /* ------------------------------------------------------------- input */

  function hitBob(x: number, y: number) {
    const rr = Math.max(BOB_R * s + (touch ? 16 : 8), touch ? 22 : 12)
    let best = -1
    let bd = rr * rr
    for (let k = 0; k < K; k++) {
      const dx = x - bx[k]
      const dy = y - by[k]
      const d2 = dx * dx + dy * dy
      if (d2 < bd) {
        bd = d2
        best = k
      }
    }
    // the plan's live row is a handle too
    return best
  }

  /** Pointer → swing angle for bob k: project onto the oblique swing direction. */
  function angleFromPointer(k: number, x: number, y: number) {
    const L = Lmm[k]
    // screen offset per unit z (the swing displacement) and per unit y
    const ux = OCX * s
    const uy = -OCY * s
    const dx = x - X(k * SPACING, 0)
    const dy = y - Y(L, 0)
    const z = (dx * ux + dy * uy) / (ux * ux + uy * uy)
    return clamp(Math.asin(clamp(z / L, -1, 1)), -THETA_MAX, THETA_MAX)
  }

  let lastT = 0

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hover = -1
        if (drag >= 0) {
          // let go where it is
          amp[drag] = dragTheta
          tau[drag] = lastT
          disturbed = true
          drag = -1
        }
        downAt = null
        env.setCursor('default')
        return
      }
      if (p.type === 'down') {
        const k = gather ? -1 : hitBob(p.x, p.y)
        downAt = { x: p.x, y: p.y, ms: performance.now(), bob: k }
        if (k >= 0) {
          drag = k
          dragTheta = angleFromPointer(k, p.x, p.y)
          acted = true
          env.setCursor('grabbing')
        }
        return
      }
      if (p.type === 'move') {
        if (drag >= 0) {
          dragTheta = angleFromPointer(drag, p.x, p.y)
          env.setCursor('grabbing')
          return
        }
        hover = gather ? -1 : hitBob(p.x, p.y)
        env.setCursor(hover >= 0 ? 'grab' : 'pointer')
        return
      }
      if (p.type === 'up') {
        if (drag >= 0) {
          const moved = downAt ? Math.hypot(p.x - downAt.x, p.y - downAt.y) : 99
          amp[drag] = dragTheta
          tau[drag] = lastT
          disturbed = true
          if (moved > 4) sfx.tone(noteOf(drag), 0.8, { type: 'triangle', gain: 0.03, room: 0.3 })
          drag = -1
          env.setCursor('grab')
        } else if (downAt && downAt.bob < 0 && Math.hypot(p.x - downAt.x, p.y - downAt.y) < (touch ? 16 : 10) && performance.now() - downAt.ms < 450 && !gather) {
          acted = true
          startGather(lastT, false)
        }
        downAt = null
      }
    },
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (down && !gather) {
          const ni = clamp(gi + (code === 'ArrowRight' ? 1 : -1), 0, GAMMAS.length - 1)
          if (ni !== gi) {
            gi = ni
            gamma = GAMMAS[gi]
            for (let k = 0; k < K; k++) Lto[k] = lengthOf(gamma, k)
            acted = true
            startGather(lastT, true)
          }
        }
        return true
      }
      if (code === 'Space' || code === 'Enter') {
        if (down && !gather) {
          acted = true
          startGather(lastT, false)
        }
        return true
      }
      return false
    },
    frame(t, dt) {
      const T = t + offset
      lastT = T
      if (gather && T >= gather.t0 + gather.dur) finishGather()
      if (!poked && !gather && T >= poke[2]) {
        const k = clamp(Math.round(poke[0]), 0, K - 1)
        amp[k] = clamp(poke[1] * DEG, -THETA_MAX, THETA_MAX)
        tau[k] = poke[2]
        disturbed = true
        poked = true
      }
      if (env.params.has('hover')) hover = clamp(Number(env.params.get('hover')) | 0, 0, K - 1)
      // plate: strobe snapshots due by now; roll to a new cycle at Γ
      if (!gather) {
        while (T - plateStart >= gamma) {
          // complete this plate first
          fillPlate(plateStart + gamma)
          firstCycle = false
          newCycle(plateStart + gamma, false)
        }
        fillPlate(T)
      }
      const sc = gather ? -(gather.t0 + gather.dur - T) : T - cycleStart

      ground(ctx, w, h, 'paper')
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(C.ink, 0.5)
      cropMarks(ctx, m * 0.5, m * 0.5, w - m, h - m, preview ? 7 : 10)

      const appear = preview || env.params.has('at') ? 1 : ease.outCubic(clamp(T / 1.2))
      projectionLines(appear)
      drawFrameStructure(appear, C.ink)
      drawPendulums(T, appear)
      drawBeam(appear, C.ink)
      elevationNotes(T, appear)
      const grp = groups(sc)
      const geo = drawPlate(T, appear)
      plateChrome(sc, geo, appear)
      columnLabels()
      drawCaption(sc)
      table(T)
      header(sc, grp)
      ghost(T)
      prompts(T)

      // the opening and every gather: a release board along the bobs
      if (gather && T >= gather.t0) {
        const u = clamp((T - gather.t0) / gather.dur)
        const al = smoothstep(0.1, 0.5, u) * (1 - smoothstep(0.92, 1, u))
        if (al > 0) {
          ctx.save()
          ctx.globalAlpha = al
          ctx.strokeStyle = C.ocean
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          for (let k = 0; k < K; k++) {
            const xx = bx[k] + OCX * s * (BOB_R + 3)
            const yy = by[k] - OCY * s * (BOB_R + 3)
            if (k) ctx.lineTo(xx, yy)
            else ctx.moveTo(xx, yy)
          }
          ctx.stroke()
          ctx.setLineDash([])
          if (!tiny && !preview) text(ctx, gather.retune ? `RE-TUNING · Γ = ${gamma} S` : 'RELEASE BOARD', bx[0] - 4, by[0] + BOB_R * s + 18, { size: 9, color: C.ocean, tracking: 0.14 })
          ctx.restore()
        }
      }

      if (!preview) sound(T, dt)
      else for (let k = 0; k < K; k++) prevTheta[k] = th[k]
      prevT = T
    },
  }
}

export default create
