/*
 * FIG. T.08 — LIGHT CLOCK
 *
 * Why moving clocks run slow, in four chapters (90 s, ← → step):
 *
 *   I    A clock made of light: a photon bouncing between two mirrors 1 m
 *        apart; one tick (there and back) is 2L/c = 6.67 ns, shown about
 *        2.4 × 10⁸ times slower. A train stands at a platform; the platform's
 *        own clocks (dials on posts, all synchronised) tick in step with it.
 *   II   The train moves (β = v/c on the slider). Seen from the platform the
 *        photon runs a zigzag of diagonals, longer than the mirror gap, at the
 *        same speed c, so each tick takes longer: the right triangle
 *        (ct)² = (vt)² + (ct′)² gives t = γt′, γ = 1/√(1 − β²). The carriage
 *        is drawn contracted by 1/γ along its motion; you hear two rhythms,
 *        the platform's (low) and the train's (high), drift apart.
 *   III  The twins on a Minkowski diagram: one stays, one goes out and back at
 *        β. Light cones as 45° hairlines (the causal diamond of the trip),
 *        proper-time ticks lying on invariant hyperbolae, the traveller's
 *        lines of simultaneity swinging at the turn. On reunion: 10 years at
 *        home, 10/γ for the traveller.
 *   IV   GPS: satellite clocks run 7.2 μs/day slow for their speed and
 *        45.7 μs/day fast for their height; net +38.5, so they are built to
 *        tick at 10.22999999543 MHz. Left alone: about 11 km of error a day.
 *
 * The scene is computed in the platform frame: the train's proper time
 * advances as dτ = dt/γ(t), the photon's height is a triangle wave in τ and
 * its position along the track is the train's, so its speed is always c.
 *
 * Interaction (full mode): drag the β slider; in III tap to send the twin
 * (at the slider's β) and hover the diagram to read proper time; ← → chapters.
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, rgba, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. T.08'
const LOOP = 90
const CHAPTERS = [
  { t: 0, num: 'I', name: 'A clock made of light' },
  { t: 9, num: 'II', name: 'Moving clocks' },
  { t: 36, num: 'III', name: 'The twins' },
  { t: 66, num: 'IV', name: 'Einstein’s time' },
]
/** display: half a tick (mirror to mirror) takes HALF seconds at rest */
const HALF = 0.8
/** physical: mirrors 1 m apart; one tick 2L/c */
const C_LIGHT = 299792458
const TICK_NS = (2 / C_LIGHT) * 1e9
const SLOW = (2 * HALF) / (TICK_NS * 1e-9)
/** carriage length at rest, in mirror gaps (metres) */
const CAR_L = 2.6
const POST_EVERY = 2.5
/** the twins: a 10-year round trip in the home frame */
const TRIP = 10
/** GPS, a circular orbit of radius a, ground clock on a sphere of radius R_E (non-rotating) */
const GM = 3.986004418e14
const R_E = 6.371e6
const A_GPS = 2.656175e7
const V_GPS = Math.sqrt(GM / A_GPS)
const SR_US = (-(V_GPS * V_GPS) / (2 * C_LIGHT * C_LIGHT)) * 86400e6
const GR_US = ((GM / (C_LIGHT * C_LIGHT)) * (1 / R_E - 1 / A_GPS)) * 86400e6
const NET_US = SR_US + GR_US
const KM_DAY = (NET_US * 1e-6 * C_LIGHT) / 1000

interface Caption {
  t0: number
  t1: number
  /** a line: plain, then italic, then plain again */
  lines: { s: string; em?: string; tail?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 1, t1: 8.4, lines: [{ s: 'A clock made' }, { s: 'of ', em: 'light.' }] },
  { t0: 14.5, t1: 27, lines: [{ s: 'Moving, the light' }, { s: 'has ', em: 'farther to go.' }] },
  { t0: 54.5, t1: 65, lines: [{ s: 'The traveller' }, { s: 'comes home ', em: 'younger.' }] },
  { t0: 78.5, t1: 89.3, lines: [{ s: 'Your phone keeps' }, { s: '', em: 'Einstein’s', tail: ' time.' }] },
]

const gammaOf = (b: number) => 1 / Math.sqrt(1 - b * b)

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  /* --------------------------------------------------------- story clock */

  const at = Number(env.params.get('at'))
  const seek = env.params.has('at') && Number.isFinite(at)
  let storyOff = seek ? at : preview ? 22 : 0
  let lastT = 0
  const storyT = (t: number) => (((t + storyOff) % LOOP) + LOOP) % LOOP
  const chapterOf = (T: number) => CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)

  /** The automatic speed schedule (chapter II); the viewer's slider overrides it. */
  function autoBeta(T: number) {
    if (T < 10) return 0
    if (T < 36) return lerp(0, 0.6, ease.inOutCubic(smoothstep(10, 13.5, T))) + lerp(0, 0.266, ease.inOutCubic(smoothstep(23, 26, T)))
    return 0.8
  }
  let userBeta: number | null = null
  let userChapter = -1

  /* --------------------------------------------------------- the train */

  // platform-frame state (metres, display seconds)
  let xT = 0 // train centre along the platform
  let tP = 0 // platform time since the clocks were last reset (display s)
  let tau = 0 // the train clock's proper time (display s)
  let beta = 0
  const trailX = new Float64Array(64)
  const trailY = new Float64Array(64)
  let trailN = 0
  let ticksT = 0
  let ticksP = 0
  // the triangle: the last completed mirror-to-mirror run
  let triOk = false
  let tri = { x0: 0, y0: 0, x1: 0, y1: 0, b: 0 }

  /** photon height in mirror gaps (0 bottom … 1 top) at train proper time τ */
  const photonY = (tt: number) => {
    const u = (tt / HALF) % 2
    return u < 1 ? u : 2 - u
  }

  function resetTrain() {
    xT = 0
    tP = 0
    tau = 0
    trailN = 0
    ticksT = 0
    ticksP = 0
    triOk = false
    trailX[0] = 0
    trailY[0] = 0
    trailN = 1
  }
  resetTrain()

  function stepTrain(dt: number, b: number) {
    const sub = 4
    const h = dt / sub
    for (let i = 0; i < sub; i++) {
      beta = b
      const g = gammaOf(beta)
      const prevTau = tau
      const prevP = tP
      xT += (beta * h) / HALF // metres: c = 1 m per HALF seconds
      tP += h
      tau += h / g
      // a bounce: τ crossed a multiple of HALF
      const kPrev = Math.floor(prevTau / HALF)
      const kNow = Math.floor(tau / HALF)
      if (kNow > kPrev) {
        const yB = kNow % 2 === 0 ? 0 : 1
        // record the vertex (interpolate the platform position)
        const f = (kNow * HALF - prevTau) / (tau - prevTau || 1)
        const xb = xT - ((beta * h) / HALF) * (1 - f)
        if (trailN >= trailX.length) {
          trailX.copyWithin(0, 1)
          trailY.copyWithin(0, 1)
          trailN--
        }
        const x0 = trailX[trailN - 1]
        const y0 = trailY[trailN - 1]
        trailX[trailN] = xb
        trailY[trailN] = yB
        trailN++
        tri = { x0, y0, x1: xb, y1: yB, b: beta }
        triOk = true
        if (yB === 0) {
          ticksT++
          if (sfx.enabled && !seeking) sfx.tone(880, 0.5, { type: 'sine', gain: 0.045, attack: 0.003, room: 0.35, pan: 0.2 })
        }
      }
      const pPrev = Math.floor(prevP / (2 * HALF))
      const pNow = Math.floor(tP / (2 * HALF))
      if (pNow > pPrev) {
        ticksP++
        if (sfx.enabled && !seeking) sfx.tone(220, 0.6, { type: 'sine', gain: 0.05, attack: 0.004, room: 0.35, pan: -0.2 })
      }
    }
  }

  /* --------------------------------------------------------- the twins */

  let tripBeta = 0.8
  let tripStart = 38 // story time the trip starts
  const TRIP_DUR = 17
  let hoverDiag: { x: number; y: number } | null = null

  /* --------------------------------------------------------- layout */

  let w = env.width
  let h = env.height
  let m = 24
  let small = false
  let tiny = false
  let portrait = false
  let mode: 'wide' | 'portrait' | 'side' | 'stack' = 'wide'
  let headerH = 44
  /** readouts on a second header row (narrow frames) */
  let rowReadouts = false
  // scene region and its geometry
  const sc = { x0: 0, x1: 0, y0: 0, y1: 0 }
  let Lpx = 200
  let railY = 600
  let trainX = 400
  // slider instrument
  const sl = { x: 0, y: 0, w: 300, h: 70, on: true }
  // diagram
  const dg = { x: 0, y: 0, w: 400, h: 500, s: 40 }
  // the twins' dials (centre of the first)
  const dl = { x: 0, y: 0, r: 20 }
  // GPS: the Earth and orbit, the ledger, the phone
  const gp = { ex: 0, ey: 0, R: 100, lx: 0, ly: 0, lw: 300, phone: true, px: 0, py: 0, pw: 60 }
  // caption
  let capX = 0
  let capY = 0
  let capSize = 30
  let capW = 300
  /** a narrower caption column for III and IV on small frames */
  let capW2 = 300
  let formulaY = 0
  let formulaOn = false
  let noteX = 0
  let noteY = 0

  function sceneFrom(x0: number, x1: number, y0: number, y1: number, maxL: number) {
    sc.x0 = x0
    sc.x1 = x1
    sc.y0 = y0
    sc.y1 = y1
    Lpx = clamp(Math.min((y1 - y0 - 34) / 2.05, maxL), 26, 300)
    // a scene shorter than its region sits a little below the middle of it
    const need = Lpx * 2.05 + 34
    const spare = Math.max(0, y1 - y0 - need)
    railY = y1 - spare * 0.4 - Lpx * 0.3
    trainX = lerp(x0, x1, 0.5)
  }

  function diagramIn(left: number, right: number, top: number, bot: number) {
    const s1 = Math.min((right - left) / 7.6, (bot - top) / 10.9)
    dg.s = Math.max(6, s1)
    dg.w = 7.6 * dg.s
    dg.h = 10.9 * dg.s
    dg.x = left + (right - left - dg.w) / 2 + 1.5 * dg.s
    dg.y = top + (bot - top - dg.h) / 2 + 10.5 * dg.s
  }

  function layout() {
    w = env.width
    h = env.height
    small = preview || Math.min(w, h) < 520
    tiny = h < 260 || w < 360
    portrait = h > w * 1.15
    m = preview ? 12 : tiny ? 10 : small ? 14 : Math.round(clamp(Math.min(w, h) * 0.035, 18, 40))
    if (preview) mode = 'stack'
    else if (portrait) mode = 'portrait'
    else if (w >= 900 && h >= 560) mode = 'wide'
    else if (w / h >= 1.1) mode = 'side'
    else mode = 'stack'
    rowReadouts = !preview && (mode === 'portrait' || mode === 'stack')
    headerH = preview ? 16 : mode === 'wide' ? 46 : rowReadouts ? 36 : 22
    sl.on = !preview
    formulaOn = false
    noteX = m + 2
    noteY = h - m - 2
    gp.phone = true
    if (mode === 'wide') {
      capSize = Math.round(clamp(Math.min(w * 0.032, h * 0.055), 22, 50))
      capX = m + 4
      capY = m + headerH + h * 0.04
      capW = capW2 = clamp(w * 0.34, 180, 440)
      sl.h = 70
      sl.w = clamp(w * 0.32, 200, 420)
      sl.x = w - m - sl.w - 6
      sl.y = h - m - sl.h - 12
      sceneFrom(0, w, capY + capSize * 2.4 + 16, sl.y - 40, w * 0.22)
      trainX = w * 0.46
      formulaOn = w >= 1000
      formulaY = Math.min(h - m - 82, railY + Lpx * 0.12 + 60)
      diagramIn(Math.max(capX + capW + 20, w * 0.38), w - m - 8, m + headerH + 8, sl.y - 28)
      dl.r = clamp(Math.min(w, h) * 0.045, 16, 40)
      dl.x = capX + dl.r + 2
      dl.y = capY + capSize * 2.6 + dl.r + 40
      const top = capY + capSize * 2.6 + 14
      gp.R = Math.min(w * 0.25 - 10, (h - top - m - 24) / 2 / 0.62)
      gp.ex = m + w * 0.25 + 10
      gp.ey = top + (h - top - m - 24) / 2
      gp.lx = w * 0.56
      gp.ly = m + headerH + capSize * 2.6 + 40
      gp.lw = Math.min(w * 0.4, 460)
      gp.pw = clamp(Math.min(w, h) * 0.12, 46, 96)
    } else if (mode === 'portrait') {
      capSize = Math.round(clamp(w * 0.07, 16, 34))
      capX = m + 2
      capY = m + headerH + 4
      capW = capW2 = w - m * 2
      sl.h = small ? 46 : 60
      sl.x = m + 30
      sl.w = w - m * 2 - 36
      sl.y = h - m - sl.h - 10
      noteY = sl.y - 22
      const top = capY + capSize * 2.3 + 16
      sceneFrom(0, w, top, noteY - 30, w * 0.3)
      trainX = w * 0.45
      dl.r = clamp(w * 0.07, 16, 30)
      dl.x = m + dl.r + 4
      dl.y = sl.y - 30 - 50 - dl.r
      diagramIn(m + 30, w - m - 8, top, dl.y - dl.r - 18)
      gp.R = Math.min(w / 2 - m - 14, ((h - top) * 0.4) / 2 / 0.62)
      gp.ex = w / 2
      gp.ey = top + gp.R * 0.62 + 10
      gp.lx = m + 4
      gp.ly = gp.ey + gp.R * 0.62 + 40
      gp.lw = w - m * 2 - 8
      gp.pw = clamp(w * 0.16, 40, 80)
    } else if (mode === 'side') {
      const lc = clamp(w * 0.38, 140, 340)
      capSize = Math.round(clamp(Math.min(w * 0.04, h * 0.075), 13, 26))
      capX = m + 2
      capY = m + headerH
      capW = capW2 = lc - m - 10
      sl.h = tiny ? 34 : 44
      sl.x = capX + 26
      sl.w = lc - m - 30
      sl.y = capY + capSize * 2.3 + 16
      sceneFrom(lc, w, m + headerH, h - m - 4, (w - lc) / 2.9)
      trainX = lerp(lc, w, 0.55)
      dl.r = clamp(h * 0.06, 11, 24)
      dl.x = capX + dl.r
      dl.y = sl.y + sl.h + 20 + dl.r
      diagramIn(lc + 4, w - m - 6, m + headerH + 2, h - m - 4)
      gp.R = Math.min((w - lc) / 2 - 10, (h - m * 2 - headerH - 20) / 2 / 0.62)
      gp.ex = lc + (w - lc) / 2
      gp.ey = m + headerH + (h - m * 2 - headerH) / 2
      gp.lx = capX
      gp.ly = capY + capSize * 2.3 + 18
      gp.lw = lc - m - 14
      gp.phone = false
    } else {
      // stack: header, caption, the scene, the slider; III and IV split left and right
      capSize = Math.round(clamp(Math.min(w * 0.05, h * 0.062), 13, 24))
      capX = m + 2
      capY = m + headerH + 2
      capW = w - m * 2
      capW2 = w * 0.42 - m
      sl.h = tiny ? 32 : 40
      sl.x = m + 28
      sl.w = w - m * 2 - 34
      sl.y = h - m - sl.h - 6
      noteY = sl.y - 16
      if (preview) sceneFrom(0, w, m + headerH, h - m, w * 0.24)
      else sceneFrom(0, w, capY + capSize * 2.3 + 8, noteY - 30, w * 0.3)
      trainX = w * 0.5
      const lc = w * 0.42
      dl.r = clamp(Math.min(w, h) * 0.05, 11, 22)
      dl.x = capX + dl.r
      dl.y = capY + capSize * 2.3 + dl.r + 18
      diagramIn(lc + 4, w - m - 4, m + headerH + 2, sl.y - 18)
      gp.R = Math.min((w - lc) / 2 - 16, (h - m * 2 - headerH - 30) / 2 / 0.62)
      gp.ex = lc + (w - lc) / 2
      gp.ey = m + headerH + 20 + gp.R * 0.62
      gp.lx = capX
      gp.ly = capY + capSize * 2.3 + 16
      gp.lw = lc - m - 8
      gp.phone = h > 380
      gp.pw = 40
    }
  }
  layout()

  /* --------------------------------------------------------- drawing: scene */

  const camX = () => xT * Lpx - trainX

  function drawScene(a: number, T: number) {
    if (a <= 0.01) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.beginPath()
    ctx.rect(sc.x0, Math.max(0, sc.y0 - 6), sc.x1 - sc.x0, sc.y1 - sc.y0 + 28)
    ctx.clip()
    const g = gammaOf(beta)
    const ox = camX()
    const X = (xm: number) => xm * Lpx - ox
    const yBot = railY - Lpx * 0.34
    const yTop = yBot - Lpx
    const Y = (u: number) => yBot - u * Lpx
    ctx.lineWidth = 1
    // rails and sleepers
    ctx.strokeStyle = rgba(C.ink, 0.7)
    ctx.beginPath()
    ctx.moveTo(0, railY + 0.5)
    ctx.lineTo(w, railY + 0.5)
    ctx.moveTo(0, railY + 4.5)
    ctx.lineTo(w, railY + 4.5)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    const sp = Lpx * 0.25
    for (let x = -((ox % sp) + sp) % sp; x < w; x += sp) {
      ctx.moveTo(x, railY + 4.5)
      ctx.lineTo(x - 4, railY + 10)
    }
    ctx.stroke()
    // the platform: a ruler along its edge (metres), in front of the rails
    const py = railY + Lpx * 0.12 + 6
    if (py < h - m) {
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(w, py)
      const t0 = Math.floor(ox / Lpx / 0.1) - 1
      for (let i = t0; i * 0.1 * Lpx - ox < w + 2; i++) {
        const x = i * 0.1 * Lpx - ox
        const major = i % 10 === 0
        ctx.moveTo(Math.round(x) + 0.5, py)
        ctx.lineTo(Math.round(x) + 0.5, py + (major ? 7 : i % 5 === 0 ? 4.5 : 2.5))
      }
      ctx.stroke()
      if (!tiny)
        for (let i = Math.floor(ox / Lpx) - 1; i * Lpx - ox < w + 30; i++) {
          const x = i * Lpx - ox
          if (x < -20 || (Lpx < 60 && i % 2 !== 0)) continue
          text(ctx, `${i} M`, x + 3, py + 17, { size: 8.5, color: C.muted, tracking: 0.1 })
        }
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, py, w, Math.min(18, h - py))
      ctx.clip()
      ctx.strokeStyle = rgba(C.ink, 0.12)
      ctx.beginPath()
      for (let x = -((ox * 1) % 6) - 20; x < w + 20; x += 6) {
        ctx.moveTo(x, py + 22)
        ctx.lineTo(x + 18, py)
      }
      ctx.stroke()
      ctx.restore()
    }
    // the platform's clocks: posts behind the track, all synchronised (Einstein's lattice of clocks)
    const postTop = yTop - Lpx * 0.45
    const k0 = Math.floor(ox / Lpx / POST_EVERY) - 1
    for (let k = k0; (k * POST_EVERY) * Lpx - ox < w + 40; k++) {
      const x = k * POST_EVERY * Lpx - ox
      if (x < -40) continue
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.beginPath()
      ctx.moveTo(x, railY - 2)
      ctx.lineTo(x, postTop + 12)
      ctx.stroke()
      const r = clamp(Lpx * 0.07, 6, 15)
      ctx.strokeStyle = rgba(C.ink, 0.7)
      ctx.fillStyle = C.paper
      ctx.beginPath()
      ctx.arc(x, postTop, r, 0, TAU)
      ctx.fill()
      ctx.stroke()
      // one turn of the hand per platform tick (2L/c)
      const an = (tP / (2 * HALF)) * TAU - Math.PI / 2
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(x, postTop)
      ctx.lineTo(x + Math.cos(an) * r * 0.82, postTop + Math.sin(an) * r * 0.82)
      ctx.stroke()
      if (!tiny && Lpx > 60) text(ctx, `${((tP / (2 * HALF)) * TICK_NS).toFixed(1)} NS`, x, postTop - r - 6, { size: 8.5, color: C.ink2, align: 'center', tracking: 0.08 })
    }
    // the carriage body (paper, so the posts pass behind it): contracted by 1/γ along its motion
    const half = (CAR_L / 2 / g) * Lpx
    const cx0 = trainX - half
    const cx1 = trainX + half
    const roof = yTop - Lpx * 0.22
    const floor = yBot + Lpx * 0.16
    const body = () => {
      ctx.beginPath()
      ctx.moveTo(cx0, floor)
      ctx.lineTo(cx0, roof + Lpx * 0.08)
      ctx.quadraticCurveTo(cx0, roof, cx0 + (Lpx * 0.1) / g, roof)
      ctx.lineTo(cx1 - (Lpx * 0.1) / g, roof)
      ctx.quadraticCurveTo(cx1, roof, cx1, roof + Lpx * 0.08)
      ctx.lineTo(cx1, floor)
      ctx.closePath()
    }
    body()
    ctx.fillStyle = C.paper
    ctx.fill()
    // the photon's path as seen from the platform: a zigzag left in the air
    ctx.save()
    ctx.lineWidth = 1
    for (let i = 1; i < trailN; i++) {
      const xa = X(trailX[i - 1])
      const xb = X(trailX[i])
      if (xb < -20 || xa > w + 20) continue
      const age = trailN - i
      ctx.strokeStyle = rgba(C.ocean, clamp(0.85 - age * 0.06, 0.15, 0.85))
      ctx.beginPath()
      ctx.moveTo(xa, Y(trailY[i - 1]))
      ctx.lineTo(xb, Y(trailY[i]))
      ctx.stroke()
    }
    const pyNow = photonY(tau)
    const xNow = X(xT)
    if (trailN > 0) {
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      ctx.moveTo(X(trailX[trailN - 1]), Y(trailY[trailN - 1]))
      ctx.lineTo(xNow, Y(pyNow))
      ctx.stroke()
    }
    ctx.restore()
    // the carriage outline
    ctx.strokeStyle = C.ink
    body()
    ctx.stroke()
    // windows
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.beginPath()
    const wy0 = roof + Lpx * 0.16
    const wy1 = yBot - Lpx * 0.05
    for (const f of [0.1, 0.78]) {
      const x0 = lerp(cx0, cx1, f)
      ctx.rect(x0, wy0, (cx1 - cx0) * 0.12, wy1 - wy0)
    }
    ctx.stroke()
    // wheels and the underframe
    ctx.strokeStyle = rgba(C.ink, 0.8)
    ctx.beginPath()
    ctx.moveTo(cx0 + 4, floor)
    ctx.lineTo(cx1 - 4, floor)
    const wr = Lpx * 0.085
    for (const f of [0.16, 0.3, 0.7, 0.84]) {
      const x = lerp(cx0, cx1, f)
      const rx = wr / g
      ctx.moveTo(x + rx, railY - wr)
      ctx.ellipse(x, railY - wr, rx, wr, 0, 0, TAU)
    }
    ctx.stroke()
    // the light clock: two mirrors (hatched) and its frame
    const mw = (0.42 * Lpx) / g
    const mirror = (yy: number, up: boolean) => {
      ctx.fillStyle = C.paper
      ctx.fillRect(trainX - mw / 2, up ? yy - 6 : yy, mw, 6)
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(trainX - mw / 2, yy)
      ctx.lineTo(trainX + mw / 2, yy)
      ctx.stroke()
      ctx.save()
      ctx.beginPath()
      ctx.rect(trainX - mw / 2, up ? yy - 6 : yy, mw, 6)
      ctx.clip()
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.beginPath()
      for (let d = -12; d < mw + 12; d += 3) {
        ctx.moveTo(trainX - mw / 2 + d, up ? yy - 6 : yy + 6)
        ctx.lineTo(trainX - mw / 2 + d + 6, up ? yy : yy)
      }
      ctx.stroke()
      ctx.restore()
    }
    mirror(yTop, true)
    mirror(yBot, false)
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    ctx.moveTo(trainX + mw / 2 + 4, yTop - 6)
    ctx.lineTo(trainX + mw / 2 + 4, yBot + 6)
    ctx.moveTo(trainX - mw / 2 - 4, yTop - 6)
    ctx.lineTo(trainX - mw / 2 - 4, yBot + 6)
    ctx.stroke()
    // the photon
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(xNow, Y(pyNow), 3.2, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = rgba(C.ocean, 0.35)
    ctx.beginPath()
    ctx.arc(xNow, Y(pyNow), 7, 0, TAU)
    ctx.stroke()
    // the mirror gap, dimensioned (at rest it is the whole story)
    if (!tiny) {
      const dx = trainX - mw / 2 - 16
      ctx.strokeStyle = rgba(C.ink2, 0.8)
      ctx.beginPath()
      ctx.moveTo(dx, yTop)
      ctx.lineTo(dx, yBot)
      ctx.moveTo(dx - 2.5, yTop + 5)
      ctx.lineTo(dx, yTop)
      ctx.lineTo(dx + 2.5, yTop + 5)
      ctx.moveTo(dx - 2.5, yBot - 5)
      ctx.lineTo(dx, yBot)
      ctx.lineTo(dx + 2.5, yBot - 5)
      ctx.stroke()
      ctx.save()
      ctx.translate(dx, (yTop + yBot) / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = C.paper
      ctx.fillRect(-16, -6, 32, 12)
      text(ctx, 'L = 1 M', 0, 0, { size: 8.5, color: C.ink2, align: 'center', baseline: 'middle', tracking: 0.08 })
      ctx.restore()
    }
    // the triangle on the last run between the mirrors
    const triA = smoothstep(0.06, 0.2, tri.b)
    if (triOk && triA > 0.01 && Lpx > 44) {
      const x0 = X(tri.x0)
      const x1 = X(tri.x1)
      const y0 = Y(tri.y0)
      const y1 = Y(tri.y1)
      if (x0 > 10 && x1 < w - 10) {
        ctx.save()
        ctx.globalAlpha = a * triA
        ctx.strokeStyle = C.moss
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
        // the right angle
        const q = 7
        const sy = y1 < y0 ? -1 : 1
        ctx.beginPath()
        ctx.moveTo(x1 - q, y0)
        ctx.lineTo(x1 - q, y0 + sy * q)
        ctx.lineTo(x1, y0 + sy * q)
        ctx.stroke()
        const gt = gammaOf(tri.b)
        const lab = (str: string, x: number, y: number, color: string, align: CanvasTextAlign = 'center') => {
          if (Lpx < 70 || preview) return
          setFont(ctx, { size: 9, tracking: 0.08 })
          const lw = ctx.measureText(str).width
          const lx = align === 'left' ? x : align === 'right' ? x - lw : x - lw / 2
          ctx.fillStyle = rgba(C.paper, 0.9)
          ctx.fillRect(lx - 3, y - 9, lw + 6, 13)
          text(ctx, str, x, y, { size: 9, color, align, tracking: 0.08 })
        }
        lab(`vt = ${(tri.b * gt).toFixed(2)} M`, (x0 + x1) / 2, y0 + (sy < 0 ? 17 : -8), C.moss)
        lab(`ct′ = 1.00 M`, x1 + 8, (y0 + y1) / 2 + 3, C.moss, 'left')
        const mx = (x0 + x1) / 2
        const my = (y0 + y1) / 2
        lab(`ct = ${gt.toFixed(2)} M`, mx - 12, my - 6, C.ocean, 'right')
        ctx.restore()
      }
    }
    // labels: the train's clock and its count
    if (!tiny) {
      const ly = roof - 10
      text(ctx, `TRAIN CLOCK · ${ticksT} TICKS`, trainX, ly, { size: 9, color: C.ocean, align: 'center', tracking: 0.12 })
      const cy2 = railY + Lpx * 0.12 + 38
      if (beta > 0.05 && Lpx > 60 && cy2 < sc.y1 + 20) text(ctx, Lpx > 110 ? `CARRIAGE ${(CAR_L / g).toFixed(2)} M LONG, SEEN FROM THE PLATFORM (×1/γ)` : `CARRIAGE ${(CAR_L / g).toFixed(2)} M (×1/γ)`, trainX, cy2, { size: 8, color: C.muted, align: 'center', tracking: 0.1 })
    }
    void T
    ctx.restore()
  }

  /* --------------------------------------------------------- drawing: slider */

  function drawSlider(a: number, b: number) {
    if (!sl.on || a <= 0.01) return
    const { x, y, w: sw, h: shh } = sl
    const trackY = y + shh - 10
    const bx = (bb: number) => x + clamp(bb / 0.99) * sw
    const gTop = y + 6
    const gy = (g: number) => trackY - 8 - clamp((g - 1) / 3) * (trackY - 8 - gTop)
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // γ(β): the curve above the track
    if (shh > 40) {
      ctx.strokeStyle = rgba(C.ink, 0.25)
      ctx.beginPath()
      ctx.moveTo(x, gy(1))
      ctx.lineTo(x + sw, gy(1))
      ctx.moveTo(x, gy(2))
      ctx.lineTo(x + sw, gy(2))
      ctx.stroke()
      text(ctx, 'γ = 1', x - 6, gy(1) + 3, { size: 8, color: C.muted, align: 'right' })
      text(ctx, '2', x - 6, gy(2) + 3, { size: 8, color: C.muted, align: 'right' })
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      for (let i = 0; i <= 80; i++) {
        const bb = (i / 80) * 0.99
        const yy = gy(gammaOf(bb))
        if (i) ctx.lineTo(bx(bb), yy)
        else ctx.moveTo(bx(bb), yy)
      }
      ctx.stroke()
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(bx(b), gy(gammaOf(b)), 3, 0, TAU)
      ctx.fill()
      ctx.setLineDash([2, 3])
      ctx.strokeStyle = rgba(C.ocean, 0.6)
      ctx.beginPath()
      ctx.moveTo(bx(b), gy(gammaOf(b)))
      ctx.lineTo(bx(b), trackY)
      ctx.stroke()
      ctx.setLineDash([])
    }
    // the track
    ctx.strokeStyle = rgba(C.ink, 0.7)
    ctx.beginPath()
    ctx.moveTo(x, trackY)
    ctx.lineTo(x + sw, trackY)
    for (let i = 0; i <= 10; i++) {
      const xx = bx(i / 10)
      ctx.moveTo(xx, trackY)
      ctx.lineTo(xx, trackY + (i % 5 === 0 ? 6 : 3.5))
    }
    ctx.stroke()
    if (!tiny) for (const v of [0, 0.5, 0.9]) text(ctx, v === 0 ? '0' : v.toFixed(1), bx(v), trackY + 15, { size: 8, color: C.muted, align: 'center' })
    // the handle
    const hx = bx(b)
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(hx, trackY, sliderHot || dragSlider ? 8 : 6.5, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.lineWidth = 1
    const lbl = sw > 330 ? `β = v / c = ${b.toFixed(3)}   γ = ${gammaOf(b).toFixed(3)}` : `β ${b.toFixed(3)} · γ ${gammaOf(b).toFixed(3)}`
    text(ctx, lbl, x, y - 4, { size: tiny ? 8 : 9.5, color: C.ocean, tracking: 0.08 })
    setFont(ctx, { size: tiny ? 8 : 9.5, tracking: 0.08 })
    const lw = ctx.measureText(lbl).width
    const hint = touch || sw < 260 ? 'DRAG' : 'DRAG TO CHANGE SPEED'
    setFont(ctx, { size: 8.5, tracking: 0.12 })
    if (!dragged && !tiny && !preview && lw + ctx.measureText(hint).width + 16 < sw) text(ctx, hint, x + sw, y - 4, { size: 8.5, color: C.muted, align: 'right', tracking: 0.12 })
    ctx.restore()
  }

  /* --------------------------------------------------------- drawing: diagram */

  function tripAt(T: number) {
    const u = clamp((T - tripStart) / TRIP_DUR)
    const tc = u * TRIP
    const b = tripBeta
    const x = tc <= TRIP / 2 ? b * tc : b * (TRIP - tc)
    return { u, tc, x, tau: tc / gammaOf(b) }
  }

  function drawDiagram(a: number, T: number) {
    if (a <= 0.01) return
    const { x: X0, y: Y0, s } = dg
    const X = (x: number) => X0 + x * s
    const Y = (t: number) => Y0 - t * s
    const b = tripBeta
    const g = gammaOf(b)
    const tr = tripAt(T)
    const xMin = -1.5
    const xMax = 6.1
    const tMax = 10.4
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.rect(X(xMin), Y(tMax), (xMax - xMin) * s, tMax * s + 1)
    ctx.save()
    ctx.clip()
    // grid: a year by a light year
    ctx.strokeStyle = rgba(C.ink, 0.06)
    ctx.beginPath()
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      ctx.moveTo(Math.round(X(x)) + 0.5, Y(0))
      ctx.lineTo(Math.round(X(x)) + 0.5, Y(tMax))
    }
    for (let t = 1; t <= tMax; t++) {
      ctx.moveTo(X(xMin), Math.round(Y(t)) + 0.5)
      ctx.lineTo(X(xMax), Math.round(Y(t)) + 0.5)
    }
    ctx.stroke()
    // the causal diamond: the future cone of the departure, the past cone of the reunion
    ctx.strokeStyle = rgba(C.fern, 0.75)
    ctx.beginPath()
    ctx.moveTo(X(-TRIP), Y(TRIP))
    ctx.lineTo(X(0), Y(0))
    ctx.lineTo(X(TRIP), Y(TRIP))
    ctx.moveTo(X(-TRIP / 2), Y(TRIP / 2))
    ctx.lineTo(X(0), Y(TRIP))
    ctx.lineTo(X(TRIP / 2), Y(TRIP / 2))
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(X(0), Y(0))
    ctx.lineTo(X(TRIP / 2), Y(TRIP / 2))
    ctx.lineTo(X(0), Y(TRIP))
    ctx.lineTo(X(-TRIP / 2), Y(TRIP / 2))
    ctx.closePath()
    ctx.clip()
    ctx.strokeStyle = rgba(C.fern, 0.1)
    ctx.beginPath()
    for (let d = -TRIP * s; d < TRIP * s * 2; d += 7) {
      ctx.moveTo(X(-TRIP / 2) + d, Y(0))
      ctx.lineTo(X(-TRIP / 2) + d - TRIP * s, Y(TRIP))
    }
    ctx.stroke()
    ctx.restore()
    // invariant hyperbolae t² − x² = τ² through the traveller's outbound ticks
    ctx.strokeStyle = rgba(C.ink, 0.13)
    ctx.beginPath()
    for (let k = 1; k <= Math.floor(TRIP / g / 2); k++) {
      for (let i = 0; i <= 40; i++) {
        const xx = (i / 40) * 6
        const tt = Math.sqrt(k * k + xx * xx)
        if (i) ctx.lineTo(X(xx), Y(tt))
        else ctx.moveTo(X(xx), Y(tt))
      }
    }
    ctx.stroke()
    // light from the turn, back home
    const turnT = TRIP / 2
    const turnX = b * turnT
    if (tr.tc > turnT) {
      const reach = Math.min(tr.tc, turnT + turnX) - turnT
      ctx.strokeStyle = rgba(C.fern, 0.75)
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(X(turnX), Y(turnT))
      ctx.lineTo(X(turnX - reach), Y(turnT + reach))
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
    // axes
    ctx.strokeStyle = rgba(C.ink, 0.6)
    ctx.beginPath()
    ctx.moveTo(X(xMin), Y(0))
    ctx.lineTo(X(xMax), Y(0))
    ctx.stroke()
    const fs = s > 30 ? 9 : 8
    if (!tiny) {
      text(ctx, 'x · LIGHT YEARS', X(xMax), Y(0) + 28, { size: fs, color: C.muted, align: 'right', tracking: 0.12 })
      for (let x = 1; x <= 5; x++) text(ctx, String(x), X(x), Y(0) + 14, { size: 8, color: C.muted, align: 'center' })
      text(ctx, 'ct · YEARS', X(xMin) + 2, Y(tMax) - 6, { size: fs, color: C.muted, tracking: 0.12 })
      text(ctx, 'LIGHT CONES · 45°', X(Math.min(xMax - 0.2, 5.6)), Y(5.8), { size: 8, color: C.fern, align: 'right', tracking: 0.12 })
    }
    // the home twin's world line, ticked every year
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(X(0), Y(0))
    ctx.lineTo(X(0), Y(Math.max(0.001, tr.tc)))
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    ctx.moveTo(X(0), Y(tr.tc))
    ctx.lineTo(X(0), Y(TRIP))
    ctx.stroke()
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    for (let k = 1; k <= TRIP; k++) {
      if (k > tr.tc + 1e-6) break
      ctx.moveTo(X(0) - 4, Y(k))
      ctx.lineTo(X(0) + 4, Y(k))
    }
    ctx.stroke()
    if (!tiny) for (let k = 2; k <= Math.floor(tr.tc + 1e-6); k += 2) text(ctx, String(k), X(0) - 8, Y(k) + 3, { size: 8, color: C.ink2, align: 'right' })
    // the traveller's world line, ticked every year of their own time
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(X(0), Y(0))
    const steps = 30
    for (let i = 1; i <= steps; i++) {
      const tc = (i / steps) * tr.tc
      const xx = tc <= turnT ? b * tc : b * (TRIP - tc)
      ctx.lineTo(X(xx), Y(tc))
    }
    if (tr.tc > turnT) {
      // make sure the turn is a corner
    }
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let k = 1; k <= Math.floor(tr.tau + 1e-6); k++) {
      const tc = k * g
      const xx = tc <= turnT ? b * tc : b * (TRIP - tc)
      // tick perpendicular (in the drawing) to the world line
      const dir = tc <= turnT ? 1 : -1
      const ux = -1
      const uy = -dir * b
      const l = Math.hypot(ux, uy)
      ctx.moveTo(X(xx) - (ux / l) * 5, Y(tc) + (uy / l) * 5)
      ctx.lineTo(X(xx) + (ux / l) * 5, Y(tc) - (uy / l) * 5)
    }
    ctx.stroke()
    if (!tiny && s > 22)
      for (let k = 1; k <= Math.floor(tr.tau + 1e-6); k++) {
        const tc = k * g
        const xx = tc <= turnT ? b * tc : b * (TRIP - tc)
        if (tc < TRIP - 0.05) text(ctx, String(k), X(xx) + 9, Y(tc) + 3, { size: 8, color: C.ocean })
      }
    // the traveller's lines of simultaneity: slope β out, −β back; at the turn they swing
    if (tr.u > 0 && tr.u < 1.0001) {
      const e = { x: tr.x, t: tr.tc }
      const sl2 = tr.tc <= turnT ? b : -b
      const tHome = e.t - sl2 * e.x
      ctx.strokeStyle = rgba(C.ocean, 0.5)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(X(0), Y(tHome))
      ctx.lineTo(X(e.x + 0.8), Y(e.t + sl2 * 0.8))
      ctx.stroke()
      ctx.setLineDash([])
      // after the turn: the two lines either side of it, and the stretch of home time between them
      if (tr.tc > turnT) {
        const t1 = turnT - b * turnX
        const t2 = turnT + b * turnX
        ctx.strokeStyle = rgba(C.ocean, 0.28)
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.moveTo(X(0), Y(t1))
        ctx.lineTo(X(turnX), Y(turnT))
        ctx.lineTo(X(0), Y(t2))
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle = C.moss
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(X(0) - 24, Y(t1))
        ctx.lineTo(X(0) - 24, Y(t2))
        ctx.stroke()
        ctx.lineWidth = 1
        if (!tiny) {
          ctx.save()
          ctx.translate(X(0) - 31, Y((t1 + t2) / 2))
          ctx.rotate(-Math.PI / 2)
          text(ctx, s > 26 ? `THE TURN · ${(t2 - t1).toFixed(1)} YR OF HOME TIME SWEPT PAST` : `${(t2 - t1).toFixed(1)} YR AT THE TURN`, 0, 0, { size: 8, color: C.moss, align: 'center', tracking: 0.1 })
          ctx.restore()
        }
      }
      // the event dots
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.arc(X(e.x), Y(e.t), 3.4, 0, TAU)
      ctx.fill()
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(X(0), Y(e.t), 3, 0, TAU)
      ctx.fill()
    }
    // labels on the world lines
    if (!tiny) {
      text(ctx, 'HOME', X(0) + 6, Y(0.4), { size: 8.5, color: C.ink, tracking: 0.12 })
      text(ctx, `TRAVELLER · β ${b.toFixed(2)}`, X(b * 2.2) + 8, Y(2.2) + 3, { size: 8.5, color: C.ocean, tracking: 0.12 })
    }
    // hover: proper time along the nearest world line, or the interval from the departure
    if (hoverDiag && !preview) {
      const hx = (hoverDiag.x - X0) / s
      const ht = (Y0 - hoverDiag.y) / s
      if (hx > xMin && hx < xMax && ht > 0 && ht < tMax) {
        // the traveller's point at that coordinate time
        const tc = clamp(ht, 0, TRIP)
        const xt = tc <= turnT ? b * tc : b * (TRIP - tc)
        let label = ''
        let px = 0
        let py = 0
        if (Math.abs(hx) * s < 12) {
          label = `HOME · τ = ${tc.toFixed(2)} YR`
          px = X(0)
          py = Y(tc)
        } else if (Math.abs(hx - xt) * s < 14) {
          label = `TRAVELLER · τ = ${(tc / g).toFixed(2)} YR`
          px = X(xt)
          py = Y(tc)
        } else {
          const s2 = ht * ht - hx * hx
          label = `x ${hx.toFixed(2)} LY · ct ${ht.toFixed(2)} YR · ${s2 > 0 ? `TIMELIKE · τ ${Math.sqrt(s2).toFixed(2)} YR` : 'SPACELIKE · OUT OF REACH'}`
          px = hoverDiag.x
          py = hoverDiag.y
          // a small light cone at the pointer
          ctx.strokeStyle = rgba(C.fern, 0.5)
          ctx.beginPath()
          ctx.moveTo(px - 18, py - 18)
          ctx.lineTo(px, py)
          ctx.lineTo(px + 18, py - 18)
          ctx.moveTo(px - 18, py + 18)
          ctx.lineTo(px, py)
          ctx.lineTo(px + 18, py + 18)
          ctx.stroke()
        }
        ctx.fillStyle = C.ocean
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, TAU)
        ctx.fill()
        setFont(ctx, { size: 9, tracking: 0.1 })
        const lw = ctx.measureText(label).width
        const lx = clamp(px + 10, m, w - m - lw)
        ctx.fillStyle = rgba(C.paper, 0.92)
        ctx.fillRect(lx - 3, py - 22, lw + 6, 14)
        text(ctx, label, lx, py - 11, { size: 9, color: C.ocean, tracking: 0.1 })
      }
    }
    ctx.restore()
  }

  /** The twins' two clocks: dials of years, then the verdict. */
  function twinClocks(a: number, T: number) {
    if (a <= 0.01) return
    const tr = tripAt(T)
    const g = gammaOf(tripBeta)
    const r = dl.r
    const x0 = dl.x
    const y0 = dl.y
    ctx.save()
    ctx.globalAlpha = a
    const dial = (cx: number, yrs: number, color: string, label: string) => {
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.arc(cx, y0, r, 0, TAU)
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const an = (i / 10) * TAU - Math.PI / 2
        ctx.moveTo(cx + Math.cos(an) * r * 0.82, y0 + Math.sin(an) * r * 0.82)
        ctx.lineTo(cx + Math.cos(an) * r, y0 + Math.sin(an) * r)
      }
      ctx.stroke()
      const an = (yrs / 10) * TAU - Math.PI / 2
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(cx, y0)
      ctx.lineTo(cx + Math.cos(an) * r * 0.78, y0 + Math.sin(an) * r * 0.78)
      ctx.stroke()
      ctx.lineWidth = 1
      text(ctx, label, cx, y0 + r + 14, { size: 8.5, color: C.muted, align: 'center', tracking: 0.12 })
      text(ctx, `${yrs.toFixed(1)} YR`, cx, y0 + r + 27, { size: 10, color, align: 'center', tracking: 0.06 })
    }
    dial(x0, tr.tc, C.ink, 'HOME')
    dial(x0 + r * 3.4, tr.tau, C.ocean, 'TRAVELLER')
    if (tr.u >= 1 && !tiny) {
      const yv = y0 + r + 48
      text(ctx, `γ = ${g.toFixed(3)} · ${(TRIP - TRIP / g).toFixed(1)} YEARS APART`, x0 - r, yv, { size: 9, color: C.moss, tracking: 0.12 })
    } else if (!tiny && !preview && T > tripStart + 1) {
      text(ctx, touch ? 'TAP TO SEND THE TWIN AGAIN' : 'CLICK TO SEND THE TWIN · HOVER TO READ τ', x0 - r, y0 + r + 48, { size: 8.5, color: C.muted, tracking: 0.12 })
    }
    ctx.restore()
  }

  /* --------------------------------------------------------- drawing: GPS */

  function drawGps(a: number, T: number) {
    if (a <= 0.01) return
    const u = T - 66
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    // the Earth and the orbit (an inclined ellipse)
    const wideish = mode === 'wide'
    const R = Math.max(20, gp.R)
    const re = R / (A_GPS / R_E)
    const ex = gp.ex
    const ey = gp.ey
    // orbit
    ctx.strokeStyle = rgba(C.ocean, 0.5)
    ctx.beginPath()
    ctx.ellipse(ex, ey, R, R * 0.36, -0.3, 0, TAU)
    ctx.stroke()
    // two of the other five orbital planes, faint
    ctx.strokeStyle = rgba(C.ocean, 0.18)
    ctx.beginPath()
    ctx.ellipse(ex, ey, R, R * 0.36, 0.42, 0, TAU)
    ctx.moveTo(ex + R * 0.92 * Math.cos(-0.95), ey + R * 0.92 * Math.sin(-0.95))
    ctx.ellipse(ex, ey, R * 0.92, R * 0.3, -0.95, 0, TAU)
    ctx.stroke()
    // Earth: a hairline globe with a few parallels and meridians
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.arc(ex, ey, re, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.arc(ex, ey, re, 0, TAU)
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    for (const f of [-0.6, -0.3, 0, 0.3, 0.6]) {
      ctx.moveTo(ex - re, ey + f * re)
      ctx.ellipse(ex, ey + f * re, re * Math.sqrt(1 - f * f), re * 0.12, 0, Math.PI, TAU)
    }
    for (let k = 0; k < 6; k++) {
      const ph = (k / 6) * Math.PI + u * 0.12
      const rx = Math.abs(Math.cos(ph)) * re
      ctx.moveTo(ex, ey - re)
      ctx.ellipse(ex, ey, Math.max(0.5, rx), re, 0, -Math.PI / 2, Math.PI / 2, Math.cos(ph) < 0)
    }
    ctx.stroke()
    ctx.restore()
    // satellites on the drawn orbit: each carries a clock that runs 38.5 μs a day fast
    const n = 4
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU + u * 0.18
      const cx = Math.cos(th) * R
      const cy = Math.sin(th) * R * 0.36
      const ca = Math.cos(-0.3)
      const sa = Math.sin(-0.3)
      const sx = ex + cx * ca - cy * sa
      const sy = ey + cx * sa + cy * ca
      const behind = Math.sin(th) < 0 && Math.hypot(sx - ex, sy - ey) < re
      if (behind) continue
      ctx.fillStyle = C.paper
      ctx.strokeStyle = C.ocean
      ctx.beginPath()
      ctx.rect(sx - 4, sy - 3, 8, 6)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(sx - 4, sy)
      ctx.lineTo(sx - 12, sy)
      ctx.moveTo(sx + 4, sy)
      ctx.lineTo(sx + 12, sy)
      ctx.rect(sx - 16, sy - 2.5, 4, 5)
      ctx.rect(sx + 12, sy - 2.5, 4, 5)
      ctx.stroke()
    }
    if (!tiny) {
      text(ctx, `GPS ORBIT · 20,200 KM UP · ${(V_GPS / 1000).toFixed(2)} KM/S`, ex, ey + R * 0.62 + 16, { size: 8.5, color: C.ocean, align: 'center', tracking: 0.12 })
      text(ctx, 'EARTH', ex, ey + 3, { size: 8, color: C.ink2, align: 'center', tracking: 0.14 })
    }
    // the ledger
    const lx = gp.lx
    let ly = gp.ly
    const colW = gp.lw
    const narrow = colW < 300
    const rows: [string, string, string][] = [
      [narrow ? 'SPEED · SR' : 'SPEED (SPECIAL RELATIVITY)', `${SR_US.toFixed(1)} μs`, 'moving clocks run slow'],
      [narrow ? 'HEIGHT · GR' : 'HEIGHT (GENERAL RELATIVITY)', `+${GR_US.toFixed(1)} μs`, 'clocks higher in gravity run fast'],
      [narrow ? 'NET A DAY' : 'NET, EVERY DAY', `+${NET_US.toFixed(1)} μs`, ''],
      [narrow ? 'UNCORRECTED' : 'IF NO ONE CORRECTED IT', `≈ ${KM_DAY.toFixed(1)} KM`, 'of position error a day'],
    ]
    const stacked = colW < 175
    const rowH = stacked ? 27 : narrow ? (h < 400 ? 19 : 24) : small ? 28 : 40
    const lin = smoothstep(68, 70.5, T)
    ctx.globalAlpha = a * lin
    text(ctx, narrow ? 'SATELLITE − GROUND, A DAY' : 'A SATELLITE CLOCK, AGAINST ONE ON THE GROUND', lx, ly, { size: small ? 8 : 9, color: C.muted, tracking: 0.14 })
    ly += 10
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    ctx.moveTo(lx, Math.round(ly) + 0.5)
    ctx.lineTo(lx + colW, Math.round(ly) + 0.5)
    ctx.stroke()
    rows.forEach((r, i) => {
      const ri = smoothstep(69 + i * 1.6, 70.4 + i * 1.6, T)
      if (ri <= 0) return
      ly += rowH
      ctx.globalAlpha = a * ri
      const net = i === 2
      text(ctx, r[0], lx, ly, { size: small ? 8 : 9, color: net ? C.ink : C.ink2, tracking: 0.12 })
      if (stacked) text(ctx, r[1], lx, ly + 12, { size: 10, color: i === 0 ? C.ocean : i === 1 ? C.moss : C.ink, tracking: 0.04 })
      else text(ctx, r[1], lx + colW, ly, { size: small ? 11 : 14, color: i === 0 ? C.ocean : i === 1 ? C.moss : C.ink, align: 'right', tracking: 0.04 })
      if (r[2] && !small && !narrow) text(ctx, r[2], lx, ly + 13, { size: 8.5, color: C.muted, tracking: 0.06 })
      if (net) {
        ctx.strokeStyle = rgba(C.ink, 0.3)
        ctx.beginPath()
        ctx.moveTo(lx, Math.round(ly - (small ? 13 : 17)) + 0.5)
        ctx.lineTo(lx + colW, Math.round(ly - (small ? 13 : 17)) + 0.5)
        ctx.stroke()
      }
    })
    // so the clocks are built slow, and the receiver applies the rest
    const fin = smoothstep(75.5, 77, T)
    if (fin > 0 && !tiny) {
      ctx.globalAlpha = a * fin
      ly += rowH * 1.1
      text(ctx, narrow ? 'SO THEY TICK AT' : 'SO THEIR CLOCKS ARE BUILT TO TICK AT', lx, ly, { size: small ? 8 : 9, color: C.muted, tracking: 0.12 })
      text(ctx, '10.22999999543 MHZ', lx + colW, ly + (small ? 16 : 22), { size: narrow ? 10 : small ? 13 : 18, color: C.ink, align: 'right', tracking: 0.02 })
      if (!narrow) text(ctx, 'NOT 10.23', lx, ly + (small ? 16 : 22), { size: small ? 8 : 9, color: C.muted, tracking: 0.12 })
      ly += small ? 26 : 36
    }
    // the phone: where it thinks you are, with and without Einstein
    const ph = smoothstep(72, 73.5, T)
    if (ph > 0 && !tiny && gp.phone) {
      ctx.globalAlpha = a * ph
      const pw = gp.pw
      const phh = pw * 1.9
      const pxc = mode === 'stack' ? gp.ex : lx + colW - pw / 2
      const pyc = mode === 'stack' ? h - m - phh / 2 - 16 : Math.min(h - m - phh / 2 - 14, ly + phh / 2 + (wideish ? 24 : 14))
      if (mode === 'stack' ? pyc - phh / 2 > ey + R * 0.62 + 22 : pyc - phh / 2 > ly - 4) {
        ctx.strokeStyle = C.ink
        ctx.beginPath()
        ctx.roundRect(pxc - pw / 2, pyc - phh / 2, pw, phh, pw * 0.16)
        ctx.stroke()
        ctx.strokeStyle = rgba(C.ink, 0.3)
        ctx.beginPath()
        ctx.rect(pxc - pw / 2 + 4, pyc - phh / 2 + 10, pw - 8, phh - 20)
        ctx.stroke()
        // streets
        ctx.save()
        ctx.beginPath()
        ctx.rect(pxc - pw / 2 + 4, pyc - phh / 2 + 10, pw - 8, phh - 20)
        ctx.clip()
        ctx.strokeStyle = rgba(C.ink, 0.18)
        ctx.beginPath()
        for (let i = -3; i <= 3; i++) {
          ctx.moveTo(pxc - pw, pyc + i * pw * 0.32)
          ctx.lineTo(pxc + pw, pyc + i * pw * 0.32 + pw * 0.2)
          ctx.moveTo(pxc + i * pw * 0.3, pyc - phh)
          ctx.lineTo(pxc + i * pw * 0.3 - pw * 0.15, pyc + phh)
        }
        ctx.stroke()
        // the error, growing through a day, then corrected
        const day = clamp((T - 73.5) / 4.5)
        const fixd = smoothstep(78.2, 79.4, T)
        const errKm = KM_DAY * day * (1 - fixd)
        const kmPx = pw * 0.07
        const ddx = errKm * kmPx * 0.8
        const ddy = -errKm * kmPx * 0.6
        ctx.strokeStyle = rgba(C.ocean, 0.5)
        ctx.beginPath()
        ctx.arc(pxc, pyc, 6, 0, TAU)
        ctx.stroke()
        if (errKm > 0.2) {
          ctx.setLineDash([2, 2])
          ctx.strokeStyle = rgba(C.ink, 0.5)
          ctx.beginPath()
          ctx.moveTo(pxc, pyc)
          ctx.lineTo(pxc + ddx, pyc + ddy)
          ctx.stroke()
          ctx.setLineDash([])
        }
        ctx.fillStyle = errKm > 0.2 ? C.ink2 : C.ocean
        ctx.beginPath()
        ctx.arc(pxc + ddx, pyc + ddy, 3.4, 0, TAU)
        ctx.fill()
        ctx.restore()
        const lbl = fixd > 0.5 ? 'CORRECTED: HERE' : `UNCORRECTED · ${(24 * day).toFixed(0)} H · ${errKm.toFixed(1)} KM OFF`
        text(ctx, lbl, pxc, pyc + phh / 2 + 14, { size: 8.5, color: fixd > 0.5 ? C.ocean : C.ink2, align: 'center', tracking: 0.1 })
      }
    }
    ctx.restore()
  }

  /* --------------------------------------------------------- captions, chrome */

  function captionAt(T: number) {
    const cw = mode === 'stack' && T >= 36 ? capW2 : capW
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lines = cap.lines
      let size = capSize
      let widest = 0
      for (const ln of lines) {
        setFont(ctx, { font: 'serif', size })
        let wv = ln.s ? ctx.measureText(ln.s).width : 0
        setFont(ctx, { font: 'serif', size, italic: true })
        wv += ln.em ? ctx.measureText(ln.em).width : 0
        setFont(ctx, { font: 'serif', size })
        wv += ln.tail ? ctx.measureText(ln.tail).width : 0
        widest = Math.max(widest, wv)
      }
      if (widest > cw) size = Math.max(11, Math.floor((size * cw) / widest))
      const lineH = size * 1.06
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = capY + size + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - size * 1.02, w, size * 1.32)
        ctx.clip()
        const dy = (1 - pr) * size * 1.15 - pe * size * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        let x = capX
        if (ln.s) {
          text(ctx, ln.s, x, y + dy, { font: 'serif', size, color: C.ink })
          setFont(ctx, { font: 'serif', size })
          x += ctx.measureText(ln.s).width
        }
        if (ln.em) {
          text(ctx, ln.em, x, y + dy, { font: 'serif', size, italic: true, color: C.moss })
          setFont(ctx, { font: 'serif', size, italic: true })
          x += ctx.measureText(ln.em).width
        }
        if (ln.tail) text(ctx, ln.tail, x, y + dy, { font: 'serif', size, color: C.ink })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, ch: number) {
    text(ctx, small ? `${FIG} — LIGHT CLOCK` : `${FIG} — LIGHT CLOCK · TIME DILATION, γ = 1/√(1 − β²)`, m + 2, m + (small ? 8 : 10), { size: small ? 8.5 : 10, color: C.muted, tracking: 0.16 })
    if (!small) text(ctx, `${CHAPTERS[ch].num} — ${CHAPTERS[ch].name.toUpperCase()}`, m + 2, m + 26, { size: 9, color: C.ink2, tracking: 0.14 })
    const items: [string, string][] = []
    if (ch <= 1) {
      items.push(['β', beta.toFixed(3)], ['γ', gammaOf(beta).toFixed(3)])
      if (!tiny) items.push(['PLATFORM t', `${((tP / (2 * HALF)) * TICK_NS).toFixed(1)} NS`], ['TRAIN τ', `${((tau / (2 * HALF)) * TICK_NS).toFixed(1)} NS`])
      if (!small) items.push(['TICKS', `${ticksP} : ${ticksT}`])
    } else if (ch === 2) {
      const tr = tripAt(T)
      items.push(['β', tripBeta.toFixed(3)], ['γ', gammaOf(tripBeta).toFixed(3)])
      if (!tiny) items.push(['HOME', `${tr.tc.toFixed(2)} YR`], ['TRAVELLER', `${tr.tau.toFixed(2)} YR`])
    } else {
      items.push(['NET', `+${NET_US.toFixed(1)} μs/DAY`])
      if (!tiny) items.push(['SR', `${SR_US.toFixed(1)}`], ['GR', `+${GR_US.toFixed(1)}`])
    }
    const vs = small ? 9 : 10.5
    if (preview) {
      // the card: one quiet readout
      if (items.length) text(ctx, `${items[1][0]} ${items[1][1]}`, w - m - 2, m + 8, { size: 9, color: C.ink, align: 'right', tracking: 0.08 })
    } else if (rowReadouts) {
      let x = m + 2
      const y = m + 24
      for (const [l, v] of items) {
        setFont(ctx, { size: 8.5, tracking: 0.14 })
        const lw = ctx.measureText(l).width
        setFont(ctx, { size: vs, tracking: 0.06 })
        const vw = ctx.measureText(v).width
        if (x + lw + vw + 6 > w - m) break
        text(ctx, l, x, y, { size: 8.5, color: C.muted, tracking: 0.14 })
        text(ctx, v, x + lw + 6, y, { size: vs, color: C.ink, tracking: 0.06 })
        x += lw + vw + 18
      }
    } else if (small) {
      setFont(ctx, { size: 8.5, tracking: 0.16 })
      const kick = ctx.measureText(`${FIG} — LIGHT CLOCK`).width + m + 20
      let x = w - m - 2
      const y = m + 8
      for (let i = items.length - 1; i >= 0; i--) {
        const [l, v] = items[i]
        setFont(ctx, { size: vs, tracking: 0.06 })
        const vw = ctx.measureText(v).width
        setFont(ctx, { size: 8.5, tracking: 0.14 })
        const lw = ctx.measureText(l).width
        if (x - vw - lw - 6 < kick) break
        text(ctx, v, x, y, { size: vs, color: C.ink, align: 'right', tracking: 0.06 })
        text(ctx, l, x - vw - 6, y, { size: 8.5, color: C.muted, align: 'right', tracking: 0.14 })
        x -= vw + lw + 16
      }
    } else {
      let y = m + 10
      for (const [l, v] of items) {
        setFont(ctx, { size: vs, tracking: 0.06 })
        const vw = ctx.measureText(v).width
        text(ctx, v, w - m - 2, y, { size: vs, color: C.ink, align: 'right', tracking: 0.06 })
        text(ctx, l, w - m - 2 - vw - 10, y, { size: 9, color: C.muted, align: 'right', tracking: 0.14 })
        y += 16
      }
    }
    // the time-scale note in I and II
    if (ch <= 1 && !tiny && !preview) text(ctx, small ? `SHOWN ${Math.round(SLOW / 1e6)} MILLION × SLOWER` : `SHOWN ${Math.round(SLOW / 1e6)} MILLION TIMES SLOWER · ONE TICK = 2L/c = ${TICK_NS.toFixed(2)} NS`, noteX, noteY, { size: 8.5, color: C.muted, tracking: 0.12 })
  }

  function formula(a: number) {
    if (!formulaOn || a <= 0.01) return
    const g = gammaOf(beta)
    ctx.save()
    ctx.globalAlpha = a
    const rows = [
      ['THE TRIANGLE', '(ct)² = (vt)² + (ct′)²'],
      ['SO', 't = t′ / √(1 − β²) = γ t′'],
      ['NOW', `β = ${beta.toFixed(3)} → γ = ${g.toFixed(3)}`],
      ['EACH TICK TAKES', `${(TICK_NS * g).toFixed(2)} NS, NOT ${TICK_NS.toFixed(2)}`],
    ]
    rows.forEach(([l, v], i) => {
      const x = capX + (i % 2) * Math.min(250, (sl.x - capX) / 2)
      const y = formulaY + Math.floor(i / 2) * 34
      text(ctx, l, x, y, { size: 8.5, color: C.muted, tracking: 0.12 })
      text(ctx, v, x, y + 15, { size: 11, color: l === 'NOW' ? C.ocean : C.ink, tracking: 0.04 })
    })
    ctx.restore()
  }

  function ghost(t: number, T: number) {
    if (preview || dragged || t < 14 || t > 21 || chapterOf(T) !== 1) return
    const u = (t - 14) / 7
    const al = smoothstep(0, 0.1, u) * (1 - smoothstep(0.88, 1, u))
    const trackY = sl.y + sl.h - 10
    const x0 = sl.x + sl.w * 0.2
    const x1 = sl.x + sl.w * 0.8
    const e = ease.inOutSine((u * 2) % 1)
    ctx.save()
    ctx.globalAlpha = al
    ctx.strokeStyle = rgba(C.ocean, 0.7)
    ctx.setLineDash([1.5, 3.5])
    ctx.beginPath()
    ctx.moveTo(x0, trackY - 18)
    ctx.quadraticCurveTo((x0 + x1) / 2, trackY - 34, x1, trackY - 18)
    ctx.stroke()
    ctx.setLineDash([])
    const gx = lerp(x0, x1, e)
    ctx.fillStyle = C.ocean
    ctx.beginPath()
    ctx.arc(gx, trackY - 18 - Math.sin(e * Math.PI) * 12, 3.2, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  /* --------------------------------------------------------- input */

  let touch = false
  let dragSlider = false
  let sliderHot = false
  let dragged = false
  let downAt: { x: number; y: number; ms: number } | null = null
  let seeking = false

  const onSlider = (x: number, y: number) => sl.on && x > sl.x - 14 && x < sl.x + sl.w + 14 && y > sl.y - 16 && y < sl.y + sl.h + 14
  function setBetaFrom(x: number) {
    userBeta = clamp(((x - sl.x) / sl.w) * 0.99, 0, 0.99)
    userChapter = chapterOf(storyT(lastT))
    dragged = true
    if (userChapter === 0) {
      // moving the slider in chapter I starts the journey
      storyOff += 9.01 - storyT(lastT)
      userChapter = 1
    }
    if (userChapter === 2) tripBeta = clamp(userBeta, 0.1, 0.97)
  }

  /* --------------------------------------------------------- frame */

  let prevCh = -1

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      const T = storyT(lastT)
      const ch = chapterOf(T)
      if (p.type === 'leave') {
        hoverDiag = null
        sliderHot = false
        dragSlider = false
        downAt = null
        env.setCursor('default')
        return
      }
      if (p.type === 'down') {
        downAt = { x: p.x, y: p.y, ms: performance.now() }
        if (onSlider(p.x, p.y) && ch <= 2) {
          dragSlider = true
          setBetaFrom(p.x)
          env.setCursor('grabbing')
        }
        return
      }
      if (p.type === 'move') {
        if (dragSlider) {
          setBetaFrom(p.x)
          env.setCursor('grabbing')
          return
        }
        sliderHot = onSlider(p.x, p.y) && ch <= 2
        hoverDiag = ch === 2 ? { x: p.x, y: p.y } : null
        env.setCursor(sliderHot ? 'grab' : ch === 2 ? 'crosshair' : 'default')
        return
      }
      if (p.type === 'up') {
        if (dragSlider) {
          dragSlider = false
          env.setCursor('grab')
        } else if (downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < (touch ? 16 : 10) && performance.now() - downAt.ms < 450 && ch === 2) {
          // send the twin: the trip restarts at the slider's speed
          tripBeta = clamp(userBeta ?? tripBeta, 0.1, 0.97)
          storyOff += 37.2 - T
          tripStart = 38
          dragged = true
          sfx.tone(440, 0.6, { type: 'sine', gain: 0.04, room: 0.4 })
        }
        downAt = null
      }
    },
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (down) {
          const T = storyT(lastT)
          if (code === 'ArrowRight') {
            const next = CHAPTERS.find((c) => c.t > T + 0.01)
            storyOff += (next ? next.t : LOOP) - T
          } else {
            const i = chapterOf(T)
            const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
            storyOff += target - T
          }
        }
        return true
      }
      return false
    },
    frame(t, dt) {
      lastT = t
      let T = storyT(t)
      let ch = chapterOf(T)
      if (prevCh < 0 && preview && !seek) {
        seeking = true
        resetTrain()
        for (let tt = T - 10; tt < T; tt += 1 / 30) stepTrain(1 / 30, autoBeta(tt))
        seeking = false
      }
      if (prevCh < 0 && seek) {
        // a seek: run the train from the start of its chapter up to the moment
        seeking = true
        resetTrain()
        const from = ch <= 1 ? 0 : -1
        if (from >= 0) for (let tt = 0; tt < T; tt += 1 / 60) stepTrain(1 / 60, autoBeta(tt))
        seeking = false
      }
      if (ch !== prevCh && prevCh >= 0) {
        // a new chapter: the viewer's override ends; the train is reset for I
        if (ch === 0) resetTrain()
        if (userChapter !== ch) userBeta = null
        if (ch === 2 && prevCh !== 2) tripStart = 38
        if (ch === 1 && prevCh !== 0) resetTrain()
      }
      const b = userBeta !== null && userChapter === ch ? userBeta : autoBeta(T)
      if (ch === 2 && userBeta === null) tripBeta = 0.8
      if (dt > 0 && ch <= 1) stepTrain(dt, b)
      else beta = ch <= 1 ? b : beta
      T = storyT(t)
      ch = chapterOf(T)

      ground(ctx, w, h, 'paper')
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(C.ink, 0.5)
      cropMarks(ctx, m * 0.5, m * 0.5, w - m, h - m, preview ? 7 : 10)

      const fadeIn = (t0: number) => smoothstep(t0, t0 + 1.2, T)
      const sceneA = 1 - fadeIn(35)
      const diagA = fadeIn(36) * (1 - fadeIn(65.2))
      const gpsA = fadeIn(66.2) * (1 - smoothstep(89, 90, T))
      const appear = preview || seek ? 1 : ease.outCubic(clamp(t / 1.2))
      if (T < 36.5) drawScene(sceneA * appear, T)
      if (diagA > 0) {
        drawDiagram(diagA, T)
        twinClocks(diagA, T)
        // reunion chord
        if (sfx.enabled && dt > 0) {
          const tr = tripAt(T)
          const prev = tripAt(T - dt)
          if (prev.u < 1 && tr.u >= 1) [220, 277.18, 329.63, 440].forEach((f, i) => sfx.tone(f, 3.2, { type: 'sine', gain: 0.035, attack: 0.2 + i * 0.05, room: 0.5 }))
          if (Math.floor(prev.tau) < Math.floor(tr.tau)) sfx.tone(659.25, 0.5, { type: 'sine', gain: 0.03, room: 0.35, pan: 0.4 })
          if (Math.floor(prev.tc) < Math.floor(tr.tc)) sfx.tone(329.63, 0.5, { type: 'sine', gain: 0.03, room: 0.35, pan: -0.4 })
        }
      }
      if (gpsA > 0) drawGps(gpsA, T)
      if (ch <= 1) formula(sceneA * smoothstep(9.5, 11, T))
      if (ch <= 2) drawSlider((ch <= 1 ? sceneA : diagA) * appear, ch <= 1 ? beta : tripBeta)
      if (!preview) captionAt(T)
      chrome(T, ch)
      ghost(t, T)
      prevCh = ch
    },
  }
}

export default create
