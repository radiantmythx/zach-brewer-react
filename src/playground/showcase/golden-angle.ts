/*
 * F.01 — GOLDEN ANGLE
 *
 * Place each seed a fixed turn from the last (Vogel's model: seed i at
 * radius c·√i, angle i·θ). Any simple fraction of a turn stacks the seeds
 * into spokes — and the fractions that come closest, 1/2, 1/3, 2/5, 3/8,
 * 5/13, 8/21, 13/34, make 2, 3, 5, 8, 13, 21, 34 spokes: the Fibonacci
 * numbers, converging on the one turn no fraction can reach, 1/φ². At that
 * turn there are no gaps at all. That is how a sunflower packs its seeds.
 *
 * Six chapters over 100 s, as a pure function of time (seekable, loops
 * seamlessly: the last chapter dives into one flower's centre and leaves a
 * single seed, which is the first frame):
 *   I    A turn             seeds placed one by one, the angle annotated
 *   II   Close is not enough  the turn steps through the convergents
 *   III  The golden angle   it locks; the 21 and 34 spirals draw themselves
 *   IV   Bloom              petals, florets opening rim-in, stem and leaves
 *   V    Wind               petals fall, seeds fly, a meadow grows
 *   VI   Begin again        dusk, fireflies, a dive into one flower
 *
 * Sound (optional): every seed is a note whose pitch comes from its angle,
 * so rational turns repeat audibly and the golden turn never does.
 */

import { C, TAU, clamp, ease, fract, ground, lerp, makeNoise, mixHex, rng, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

const LOOP = 100
const CHAPTERS = [
  { t: 0, num: 'I', name: 'A turn' },
  { t: 14, num: 'II', name: 'Close is not enough' },
  { t: 34, num: 'III', name: 'The golden angle' },
  { t: 46, num: 'IV', name: 'Bloom' },
  { t: 64, num: 'V', name: 'Wind' },
  { t: 84, num: 'VI', name: 'Begin again' },
]
const PHI = (1 + Math.sqrt(5)) / 2
const GOLD = 2 - PHI // 1/φ² of a turn = 0.381966…
const STOPS: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 5],
  [3, 8],
  [5, 13],
  [8, 21],
  [13, 34],
]
const STOP_T0 = 15.6
const STOP_DT = 2.35
const HOLD = 1.25
const LOCK = 33.6
const DIVE0 = 90
const DIVE1 = 97.4

// D major pentatonic, the reel's key
const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88]
const NIGHT_INK = '#E4ECE8'

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}

const CAPTIONS: Caption[] = [
  { t0: 0.6, t1: 12.9, lines: [{ s: 'Place each seed' }, { s: 'a fixed turn ', em: 'from the last.' }] },
  { t0: 14.7, t1: 22.4, lines: [{ s: 'Half a turn makes' }, { s: '', em: 'two spokes.' }] },
  { t0: 22.9, t1: 31.2, lines: [{ s: 'Every simple fraction' }, { s: 'leaves ', em: 'gaps.' }] },
  { t0: 34.3, t1: 45.6, lines: [{ s: 'Only the golden angle' }, { s: 'leaves ', em: 'none.' }] },
  { t0: 46.7, t1: 63.2, lines: [{ s: 'One number' }, { s: 'grows ', em: 'a flower,' }] },
  { t0: 64.6, t1: 83.2, lines: [{ s: 'and the flower,' }, { s: '', em: 'a meadow.' }] },
  { t0: 84.7, t1: 92.8, lines: [{ s: 'Every seed' }, { s: '', em: 'begins again.' }] },
]

interface Meadow {
  /** release order 0..1 */
  k: number
  /** which rim seed it was (index) */
  seed: number
  tr: number
  fd: number
  /** landing x (0..1 of width), depth (-1 back .. 1 front) */
  lx: number
  depth: number
  lift: number
  phase: number
  sway: number
  height: number
  leaf: number
  /** only some seeds take root */
  grows: boolean
  /** order among the growing ones (narrow screens show fewer) */
  rank: number
  /** wind displacement accumulated from the pointer while in flight */
  wx: number
  wy: number
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const N = preview ? 340 : 520
  const FLYERS = preview ? 46 : 92
  const noise = makeNoise(11)

  // layout
  let w = env.width
  let h = env.height
  let portrait = false
  let pad = 24
  // chapters I–III: the head
  let cx = 0
  let cy = 0
  let R = 100
  // chapters IV–VI: the flower on its stem
  let fx = 0
  let fy = 0
  let fR = 40
  let groundY = 0
  let capX = 0
  let capY = 0
  let capSize = 32
  let square = false
  let stacked = false

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    // squarish frames (and short ones) stack the head over the caption
    square = !portrait && w < h * 1.45
    const short = h < 380 || w < 420
    stacked = portrait || square
    pad = Math.max(short ? 12 : 16, Math.min(40, Math.min(w, h) * 0.05))
    capSize = portrait ? clamp(Math.min(w * 0.075, h * 0.045), 18, 44) : clamp(Math.min(w * 0.042, h * 0.062), short ? 14 : 20, 52)
    if (square) {
      capX = pad
      capY = h - pad * 1.4 - capSize * 2.2
      const top = pad + 30
      const bottom = capY - capSize * 0.9 - 6
      R = Math.max(30, Math.min(w * 0.36, (bottom - top) / 2))
      cx = w * 0.56
      cy = top + (bottom - top) / 2
      fx = w * 0.58
      fR = Math.max(16, Math.min(w * 0.13, (bottom - top) * 0.17))
      fy = top + fR * 1.9
      groundY = Math.min(bottom + 2, fy + (bottom - top) * 0.62)
      return
    }
    if (portrait) {
      cx = w / 2
      cy = h * 0.42
      R = Math.min(w * 0.42, h * 0.3)
      fx = w / 2
      fy = h * 0.37
      fR = Math.min(w * 0.21, h * 0.11)
      groundY = h * 0.72
      capX = pad
      capY = h - pad * 1.9 - capSize * 2.2
    } else {
      cx = w * 0.62
      cy = h * 0.5
      R = Math.min(h * 0.38, w * 0.27)
      fx = w * 0.6
      fy = h * 0.3
      fR = h * 0.13
      groundY = h * 0.72
      capX = pad * 1.4
      capY = h - pad * 1.6 - capSize * 2.2
      if (h < 400) {
        // a short landscape frame: keep the horizon clear of the caption
        groundY = Math.min(h * 0.72, capY - capSize - 14)
        fy = groundY * 0.42
        fR = Math.min(h * 0.12, groundY * 0.18)
      }
    }
  }
  layout()

  // the meadow: deterministic per loop
  const r = rng(1618)
  const meadow: Meadow[] = []
  for (let j = 0; j < FLYERS; j++) {
    const k = j / (FLYERS - 1)
    const right = r() < 0.72
    const lx = right ? 0.55 + r() * 0.45 : r() * 0.5
    meadow.push({
      k,
      seed: N - 1 - Math.floor(j * ((N * 0.55) / FLYERS)),
      tr: 67.2 + 5.6 * Math.pow(k, 0.85) + r() * 0.3,
      fd: 3.4 + r() * 3.2,
      lx: clamp(lx, 0.03, 0.97),
      depth: r() * 2 - 1,
      lift: 0.12 + r() * 0.22,
      phase: r() * TAU,
      sway: r() * TAU,
      height: r(),
      leaf: r(),
      grows: r() < 0.5,
      rank: 0,
      wx: 0,
      wy: 0,
    })
  }
  // the flower we dive into: an early, front, tall one left of the hero
  const diveTarget = Math.floor(FLYERS * 0.3)
  Object.assign(meadow[diveTarget], { depth: 0.9, height: 1, tr: 70.4, fd: 4.2, grows: true })
  {
    // interleave ranks so a narrow screen keeps an even spread, not just the first to land
    let rank = 0
    const order = meadow.map((_, i) => i).sort((a, b) => fract(a * GOLD) - fract(b * GOLD))
    for (const i of order) if (meadow[i].grows) meadow[i].rank = rank++
  }
  /** landing x in px (the dive target sits clear of the hero flower) */
  const landX = (i: number) => (i === diveTarget ? (portrait ? 0.24 : 0.34) : meadow[i].lx) * w + meadow[i].wx
  /** base y and stem height of a meadow flower from its depth (-1 back … 1 front) and height (0…1) */
  const baseY = (depth: number) => groundY + depth * h * 0.026
  const stemH = (depth: number, height: number) => h * (0.05 + 0.12 * height) * (0.62 + 0.38 * (depth + 1) * 0.5) * (portrait ? 0.8 : 1)
  const extras: { x: number; depth: number; t0: number; height: number; sway: number }[] = []

  const fireflies = Array.from({ length: preview ? 14 : 30 }, () => ({ x: r(), y: r(), p: r() * TAU, s: 0.4 + r() * 0.6 }))

  // clock + interaction
  // ?at=… (solo/test route) jumps straight to a moment: the piece is a function of time
  const at = Number(env.params.get('at'))
  let offset = Number.isFinite(at) && env.params.has('at') ? at : preview ? (env.reducedMotion ? 38 : 15) : 0
  let prevT = -1
  let wind = 0
  let windV = 0
  let px = -1
  let lastPx = -1
  let pointerSeen = 0

  // the timeline ruler along the bottom: tap or drag it to scrub
  let hoverX = -1
  let scrubbing = false
  const rulerY = () => h - pad * 0.55
  const rulerX0 = () => pad
  const rulerX1 = () => w - pad
  const onRuler = (x: number, y: number) => !preview && y > rulerY() - 22 && y < h && x > rulerX0() - 8 && x < rulerX1() + 8
  function seekTo(x: number) {
    const T = (((prevT < 0 ? 0 : prevT) % LOOP) + LOOP) % LOOP
    let target = clamp((x - rulerX0()) / (rulerX1() - rulerX0())) * LOOP
    // snap to a chapter start when close
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.2) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }

  // sound
  let pad1: { oscs: OscillatorNode[]; gain: GainNode } | null = null

  const sfx = env.sfx
  function note(i: number, turn: number, gain = 0.045, when = 0, dur = 1.1) {
    if (!sfx.enabled) return
    const deg = Math.floor(fract(i * turn) * 5)
    const band = i < 3 ? 1 : Math.min(2, Math.floor(Math.sqrt(i / N) * 3))
    const f = SCALE[deg] * [0.5, 1, 2][band]
    const pan = Math.cos(TAU * fract(i * turn)) * 0.55
    sfx.tone(f, dur, { type: 'sine', gain, attack: 0.008, when, pan, room: 0.4 })
  }
  function padSet(level: number) {
    const ac = sfx.context()
    const out = sfx.output()
    if (!ac || !out) {
      if (pad1) {
        try {
          pad1.oscs.forEach((o) => o.stop())
        } catch {
          /* already stopped */
        }
        pad1 = null
      }
      return
    }
    if (!pad1) {
      const gain = ac.createGain()
      gain.gain.value = 0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 700
      gain.connect(lp)
      lp.connect(out)
      const oscs = [73.42, 110.0, 146.83, 220.0].map((f, i) => {
        const o = ac.createOscillator()
        o.type = i % 2 ? 'triangle' : 'sine'
        o.frequency.value = f
        o.detune.value = (i - 1.5) * 4
        const g = ac.createGain()
        g.gain.value = [0.5, 0.32, 0.22, 0.12][i]
        o.connect(g)
        g.connect(gain)
        o.start()
        return o
      })
      pad1 = { oscs, gain }
    }
    pad1.gain.gain.setTargetAtTime(level * 0.09, ac.currentTime, 0.6)
  }

  /* ----------------------------------------------------------- timing */

  /** The turn (fraction of a revolution) at time T, and which convergent it rests on. */
  function turnAt(T: number): { turn: number; stop: number; hold: number } {
    if (T < 14 || T >= LOCK) return { turn: GOLD, stop: -1, hold: 0 }
    if (T < STOP_T0) return { turn: lerp(GOLD, 0.5, ease.inOutCubic((T - 14) / (STOP_T0 - 14))), stop: -1, hold: 0 }
    const k = Math.min(STOPS.length - 1, Math.floor((T - STOP_T0) / STOP_DT))
    const tk = STOP_T0 + k * STOP_DT
    const [p, q] = STOPS[k]
    const here = p / q
    const isLast = k === STOPS.length - 1
    const tEnd = isLast ? LOCK : tk + STOP_DT
    if (T < tk + HOLD) {
      const inHold = Math.min(smoothstep(tk - 0.2, tk + 0.25, T), 1 - smoothstep(tk + HOLD - 0.25, tk + HOLD + 0.1, T))
      return { turn: here, stop: k, hold: inHold }
    }
    const next = isLast ? GOLD : STOPS[k + 1][0] / STOPS[k + 1][1]
    const u = (T - tk - HOLD) / (tEnd - tk - HOLD)
    return { turn: lerp(here, next, isLast ? ease.outCubic(u) : ease.inOutCubic(u)), stop: -1, hold: 0 }
  }

  /** Seed glyph size while the turn rests on (or moves between) fractions: few spokes, fine dots. */
  const stopScale = (k: number) => clamp(0.1 + STOPS[k][1] / 32, 0.14, 1)
  function glyphScaleAt(T: number) {
    if (T < 14 || T >= LOCK) return 1
    if (T < STOP_T0) return lerp(1, stopScale(0), ease.inOutCubic((T - 14) / (STOP_T0 - 14)))
    const k = Math.min(STOPS.length - 1, Math.floor((T - STOP_T0) / STOP_DT))
    const tk = STOP_T0 + k * STOP_DT
    if (T < tk + HOLD) return stopScale(k)
    const isLast = k === STOPS.length - 1
    const tEnd = isLast ? LOCK : tk + STOP_DT
    const u = ease.inOutCubic((T - tk - HOLD) / (tEnd - tk - HOLD))
    return lerp(stopScale(k), isLast ? 1 : stopScale(k + 1), u)
  }

  /** Chapter I: when seed k appears. */
  function appearAt(k: number) {
    if (k === 0) return -1
    if (k <= 20) return 0.9 + (k - 1) * 0.36
    return 7.9 + 5 * Math.pow((k - 20) / (N - 20), 0.6)
  }
  /** Chapter I: a continuous seed count, for the zoom normalisation. */
  function countAt(T: number) {
    if (T < 0.9) return 1
    if (T < 7.9) return 1 + Math.min(20, (T - 0.9) / 0.36 + 1)
    return Math.min(N, 21 + (N - 20) * Math.pow(clamp((T - 7.9) / 5), 1 / 0.6))
  }

  /* ---------------------------------------------------------- drawing */

  interface HeadOpts {
    x: number
    y: number
    R: number
    turn: number
    rot: number
    /** visible seeds (float) */
    n: number
    /** zoom normalisation: c = R / √norm */
    norm: number
    T: number
    ink: string
    /** 0 dots, 1 florets opening rim-in per `open`, 2 seeds */
    open?: (i: number) => number
    /** glyph size multiplier */
    gScale?: number
    /** CSS px per unit (under a camera zoom), for size thresholds */
    px?: number
    seedT?: number
    chapter1?: boolean
    lw: number
    alpha?: number
  }

  const xs = new Float32Array(1024)
  const ys = new Float32Array(1024)

  /** Seeds of a head as hairline circles (closed), small stars (open florets) or teardrops (seeds). */
  function drawHead(o: HeadOpts) {
    const c = o.R / Math.sqrt(Math.max(1, o.norm))
    const a = TAU * o.turn
    const n = Math.min(Math.ceil(o.n), xs.length)
    const g = c * 0.43 * (o.gScale ?? 1)
    ctx.save()
    ctx.globalAlpha = o.alpha ?? 1
    ctx.lineWidth = o.lw
    for (let i = 0; i < n; i++) {
      const rr = c * Math.sqrt(i)
      const ang = i * a + o.rot
      xs[i] = o.x + Math.cos(ang) * rr
      ys[i] = o.y + Math.sin(ang) * rr
    }
    // closed florets / plain seeds
    const closed = new Path2D()
    const opened = new Path2D()
    const ripe = new Path2D()
    const dots = new Path2D()
    for (let i = 0; i < n; i++) {
      let s = 1
      if (o.chapter1) s = ease.outBack(clamp((o.T - appearAt(i)) / 0.4))
      else if (i === n - 1) s = clamp(o.n - i)
      if (s <= 0.001) continue
      const gi = g * s
      const op = o.open ? o.open(i) : 0
      if (op < -0.5) continue
      if (op <= 0) {
        closed.moveTo(xs[i] + gi, ys[i])
        closed.arc(xs[i], ys[i], gi, 0, TAU)
        if (gi * (o.px ?? 1) > 2.2) {
          dots.moveTo(xs[i] + gi * 0.16, ys[i])
          dots.arc(xs[i], ys[i], gi * 0.16, 0, TAU)
        }
      } else if (op < 2) {
        // an opening floret: five points growing out of the circle
        const k = Math.min(1, op)
        const rot = i * a + o.rot
        const ro = gi * (1 + 0.35 * k)
        const ri = gi * (1 - 0.5 * k)
        for (let p = 0; p <= 10; p++) {
          const pa = rot + (p / 10) * TAU
          const rad = p % 2 === 0 ? ro : ri
          const px2 = xs[i] + Math.cos(pa) * rad
          const py2 = ys[i] + Math.sin(pa) * rad
          if (p === 0) opened.moveTo(px2, py2)
          else opened.lineTo(px2, py2)
        }
      } else {
        // a ripe seed: a teardrop pointing outward
        const ang = i * a + o.rot
        const ux = Math.cos(ang)
        const uy = Math.sin(ang)
        const L = gi * 1.25
        const W = gi * 0.62
        ripe.moveTo(xs[i] + ux * L, ys[i] + uy * L)
        ripe.quadraticCurveTo(xs[i] - uy * W * 1.6, ys[i] + ux * W * 1.6, xs[i] - ux * L * 0.7, ys[i] - uy * L * 0.7)
        ripe.quadraticCurveTo(xs[i] + uy * W * 1.6, ys[i] - ux * W * 1.6, xs[i] + ux * L, ys[i] + uy * L)
      }
    }
    ctx.strokeStyle = o.ink
    ctx.stroke(closed)
    ctx.stroke(ripe)
    ctx.fillStyle = o.ink
    ctx.fill(dots)
    ctx.strokeStyle = night > 0.5 ? C.sage : C.moss
    ctx.stroke(opened)
    ctx.restore()
    return { c, n }
  }

  /** Parastichies: join seed i to i+F — the spirals the eye sees. */
  function lattice(F: number, n: number, c: number, progress: number, color: string, lw: number) {
    if (progress <= 0) return
    const lim = Math.floor((n - F) * progress)
    ctx.beginPath()
    for (let i = 8; i < lim; i++) {
      const dx = xs[i + F] - xs[i]
      const dy = ys[i + F] - ys[i]
      if (dx * dx + dy * dy > c * c * 7.5) continue
      ctx.moveTo(xs[i], ys[i])
      ctx.lineTo(xs[i + F], ys[i + F])
    }
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.stroke()
  }

  function petalPath(p: Path2D, bx: number, by: number, ang: number, L: number, W: number, curl: number) {
    const ux = Math.cos(ang)
    const uy = Math.sin(ang)
    const bend = curl * 0.9
    const tx = bx + (ux * Math.cos(bend) - uy * Math.sin(bend)) * L
    const ty = by + (uy * Math.cos(bend) + ux * Math.sin(bend)) * L
    const mx = bx + ux * L * 0.42
    const my = by + uy * L * 0.42
    p.moveTo(bx, by)
    p.quadraticCurveTo(mx - uy * W, my + ux * W, tx, ty)
    p.quadraticCurveTo(mx + uy * W, my - ux * W, bx, by)
  }

  function leafPath(p: Path2D, veins: Path2D, sx: number, sy: number, ang: number, L: number, W: number) {
    const ux = Math.cos(ang)
    const uy = Math.sin(ang)
    const tx = sx + ux * L
    const ty = sy + uy * L
    p.moveTo(sx, sy)
    p.bezierCurveTo(sx + ux * L * 0.25 - uy * W, sy + uy * L * 0.25 + ux * W, sx + ux * L * 0.75 - uy * W * 0.7, sy + uy * L * 0.75 + ux * W * 0.7, tx, ty)
    p.bezierCurveTo(sx + ux * L * 0.75 + uy * W * 0.5, sy + uy * L * 0.75 - ux * W * 0.5, sx + ux * L * 0.25 + uy * W * 0.8, sy + uy * L * 0.25 - ux * W * 0.8, sx, sy)
    veins.moveTo(sx, sy)
    veins.lineTo(sx + ux * L * 0.9, sy + uy * L * 0.9)
    for (let v = 1; v <= 4; v++) {
      const k = v / 5.2
      const bxv = sx + ux * L * k
      const byv = sy + uy * L * k
      const side = v % 2 ? 1 : -1
      veins.moveTo(bxv, byv)
      veins.lineTo(bxv + (ux * 0.5 - uy * side) * W * 0.75, byv + (uy * 0.5 + ux * side) * W * 0.75)
    }
  }

  /** Points along a quadratic curve. */
  function qPoint(x0: number, y0: number, qx: number, qy: number, x1: number, y1: number, u: number) {
    const a = (1 - u) * (1 - u)
    const b = 2 * (1 - u) * u
    const c = u * u
    return [a * x0 + b * qx + c * x1, a * y0 + b * qy + c * y1] as const
  }
  function strokeQ(x0: number, y0: number, qx: number, qy: number, x1: number, y1: number, upTo: number, steps = 22) {
    if (upTo <= 0) return
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    const n = Math.max(1, Math.ceil(steps * upTo))
    for (let s = 1; s <= n; s++) {
      const [x, y] = qPoint(x0, y0, qx, qy, x1, y1, Math.min(upTo, s / steps))
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  /** A meadow flower: stem, an optional leaf, a small golden head and 13 petals. */
  function miniFlower(x: number, base: number, H: number, grow: number, swayA: number, rot: number, ink: string, lw: number, detail: boolean, alpha = 1, petalAlpha = 1) {
    if (grow <= 0) return
    const stemU = ease.outCubic(clamp(grow / 0.45))
    const headU = clamp((grow - 0.35) / 0.4)
    const petU = clamp((grow - 0.62) / 0.38)
    const hx = x + Math.sin(swayA) * H
    const hy = base - Math.cos(swayA) * H
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = lw
    ctx.strokeStyle = ink
    const rh = H * 0.15 * ease.outBack(headU)
    strokeQ(x, base, x + Math.sin(swayA) * H * 0.2, base - H * 0.55, hx - Math.sin(swayA) * rh, hy + Math.cos(swayA) * rh, stemU, 14)
    if (headU > 0 && rh > 0.4) {
      if (petU > 0 && petalAlpha > 0) {
        const p = new Path2D()
        const P = 13
        for (let j = 0; j < P; j++) {
          const pj = clamp(petU * 1.6 - (j / P) * 0.6)
          if (pj <= 0) continue
          const ang = j * TAU * GOLD + rot
          petalPath(p, hx + Math.cos(ang) * rh * 0.9, hy + Math.sin(ang) * rh * 0.9, ang, rh * 1.1 * ease.outBack(pj), rh * 0.3, (1 - pj) * 0.8)
        }
        ctx.globalAlpha = alpha * petalAlpha
        ctx.stroke(p)
        ctx.globalAlpha = alpha
      }
      if (detail && rh > 7) {
        drawHead({ x: hx, y: hy, R: rh, turn: GOLD, rot, n: 89 * headU, norm: 89, T: 0, ink, lw, open: () => 0, px: 1 / lw })
      } else {
        ctx.beginPath()
        ctx.arc(hx, hy, rh, 0, TAU)
        ctx.stroke()
        if (rh > 2.5) {
          ctx.beginPath()
          ctx.arc(hx, hy, rh * 0.45, 0, TAU)
          ctx.stroke()
        }
      }
    }
    ctx.restore()
    return { hx, hy, rh }
  }

  function flyer(x: number, y: number, ang: number, s: number) {
    const ux = Math.sin(ang)
    const uy = -Math.cos(ang)
    // seed at the bottom, stalk, then a parasol of filaments
    const sx = x - ux * 6 * s
    const sy = y - uy * 6 * s
    ctx.moveTo(sx, sy)
    ctx.lineTo(x, y)
    for (let f = -3; f <= 3; f++) {
      const fa = ang + f * 0.32
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.sin(fa) * 7 * s, y - Math.cos(fa) * 7 * s)
    }
    ctx.moveTo(sx + 1.6 * s, sy)
    ctx.arc(sx, sy, 1.6 * s, 0, TAU)
  }

  function captionAt(T: number) {
    const k = inkOn(night)
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.04
      const top = capY
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = top + capSize + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, w, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: k.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: night > 0.5 ? C.sage : C.moss })
        ctx.restore()
      })
    }
  }

  let night = 0
  function inkOn(nk: number) {
    return {
      ink: mixHex(C.ink, NIGHT_INK, nk),
      ink2: mixHex(C.ink2, '#B9C8C2', nk),
      muted: mixHex(C.muted, '#8FA39E', nk),
      rule: nk > 0.5 ? 'rgba(238,244,241,0.16)' : 'rgba(18,38,48,0.13)',
    }
  }

  function chrome(T: number, readouts: [string, string][]) {
    const k = inkOn(night)
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    const small = preview || Math.min(w, h) < 480
    if (!preview) env.setCursor(hoverX >= 0 ? 'pointer' : T > 66 && T < DIVE0 - 1 ? 'crosshair' : 'default')
    // kicker, top-left
    text(ctx, 'F.01 — Golden angle', pad, pad + 10, { size: small ? 9 : 10, color: k.muted, tracking: 0.16, upper: true })
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(93, 94.2, T) : 1)
    ctx.save()
    ctx.globalAlpha = kIn
    text(ctx, `${c.num} — ${c.name}`, capX, capY - (small ? 4 : 8), { size: small ? 9 : 10.5, color: k.ink2, tracking: 0.16, upper: true })
    ctx.restore()
    // readouts, top-right
    let y = pad + 10
    for (const [label, value] of readouts) {
      setFont(ctx, { size: small ? 9 : 10.5, tracking: 0.08 })
      text(ctx, value, w - pad, y, { size: small ? 9 : 10.5, color: k.ink, align: 'right', tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, label, w - pad - vw - 12, y, { size: small ? 8.5 : 9.5, color: k.muted, align: 'right', tracking: 0.14, upper: true })
      y += small ? 14 : 17
    }
    // chapter ruler along the bottom
    if (!small || !portrait || !preview) {
      const x0 = pad
      const x1 = w - pad
      const yb = h - pad * 0.55
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 50; i++) {
        const x = lerp(x0, x1, i / 50)
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
      if (!preview && w > 360) {
        CHAPTERS.forEach((cc, i) => {
          const x = lerp(x0, x1, cc.t / LOOP)
          text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
        })
      }
      if (hoverX >= 0) {
        // where a tap would take you
        const hx = clamp(hoverX, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c, i) => (ht >= c.t ? i : acc), 0)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        const label = `${CHAPTERS[hc].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`
        text(ctx, label, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12 })
      }
    }
  }

  /* ------------------------------------------------------------ frame */

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (p.type === 'leave') {
        px = -1
        hoverX = -1
        scrubbing = false
        return
      }
      const ruler = onRuler(p.x, p.y)
      hoverX = ruler || scrubbing ? p.x : -1
      if (p.type === 'down' && ruler) {
        scrubbing = true
        seekTo(p.x)
        return
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      if (px >= 0 && p.type === 'move') windV += clamp((p.x - lastPx) * 0.012, -0.6, 0.6)
      lastPx = p.x
      px = p.x
      pointerSeen = 1
      if (p.type === 'down' && !preview) {
        const T = ((((prevT < 0 ? 0 : prevT) % LOOP) + LOOP) % LOOP)
        if (T > 66 && T < DIVE0 - 1 && extras.length < 24) {
          const depth = clamp((p.y - groundY) / (h - groundY) * 2 - 0.2, -1, 1)
          extras.push({ x: p.x / w, depth, t0: T, height: 0.7 + Math.random() * 0.4, sway: Math.random() * TAU })
          sfx.tone(SCALE[Math.floor(Math.random() * 5)] / 2, 1.4, { type: 'sine', gain: 0.07, room: 0.5 })
        }
      }
    },
    key(code, down) {
      if (!down) return code === 'ArrowLeft' || code === 'ArrowRight'
      const T = ((((prevT < 0 ? 0 : prevT) % LOOP) + LOOP) % LOOP)
      if (code === 'ArrowRight') {
        const next = CHAPTERS.find((c) => c.t > T + 0.01)
        offset += (next ? next.t : LOOP) - T
        return true
      }
      if (code === 'ArrowLeft') {
        const i = CHAPTERS.reduce((acc, c, idx) => (T >= c.t ? idx : acc), 0)
        const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
        offset += target - T
        return true
      }
      return false
    },
    destroy() {
      if (pad1) {
        try {
          pad1.oscs.forEach((o) => o.stop())
        } catch {
          /* already stopped */
        }
        pad1 = null
      }
    },
    frame(t, dt) {
      const T = (((t + offset) % LOOP) + LOOP) % LOOP
      const advancing = dt > 0 && prevT >= 0 && T >= prevT
      if (prevT >= 0 && T < prevT - 1) {
        // looped (or jumped back): reset per-loop state
        extras.length = 0
        meadow.forEach((m) => {
          m.wx = 0
          m.wy = 0
        })
      }
      const crossed = (te: number) => advancing && prevT < te && te <= T
      // wind: pointer velocity, eased back to calm
      windV *= Math.exp(-2.2 * dt)
      wind = lerp(wind, windV, 1 - Math.exp(-4 * dt))
      if (dt > 0) pointerSeen = Math.max(0, pointerSeen - dt * 0.2)

      night = smoothstep(84.5, 89.5, T) * (1 - smoothstep(97.6, 99.8, T))
      const k = inkOn(night)
      ground(ctx, w, h, 'paper')
      if (night > 0) {
        ctx.save()
        ctx.globalAlpha = night
        ground(ctx, w, h, 'night')
        ctx.restore()
      }

      const rot = 0.018 * T * (T < 98 ? 1 : 1 - smoothstep(98, 100, T))
      const { turn, stop, hold } = turnAt(T)
      const readouts: [string, string][] = []
      const lw = 1

      if (T < 46 + 4.5) {
        /* ------------------------------------------ I–III: the head */
        const morph = ease.inOutCubic(clamp((T - 46) / 4.2))
        const hx = lerp(cx, fx, morph)
        const hy = lerp(cy, fy, morph)
        const hR = lerp(R, fR, morph)
        const nVis = T < 14 ? countAt(T) : N
        const norm = T < 14 ? Math.max(12, countAt(T) + 2) : N
        // spoke guides while resting on a fraction
        if (stop >= 0 && hold > 0) {
          const q = STOPS[stop][1]
          ctx.save()
          ctx.globalAlpha = hold * 0.55
          ctx.strokeStyle = k.rule
          ctx.lineWidth = 1
          ctx.beginPath()
          for (let j = 0; j < q; j++) {
            const a = (j / q) * TAU + rot
            ctx.moveTo(hx + Math.cos(a) * hR * 0.06, hy + Math.sin(a) * hR * 0.06)
            ctx.lineTo(hx + Math.cos(a) * hR * 1.12, hy + Math.sin(a) * hR * 1.12)
          }
          ctx.stroke()
          ctx.restore()
        }
        // seeds slim down while they crowd onto spokes, so the gaps read
        const { c, n } = drawHead({ x: hx, y: hy, R: hR, turn, rot, n: nVis, norm, T, ink: k.ink, lw, chapter1: T < 14, gScale: glyphScaleAt(T) })

        // chapter I annotation: the angle between the newest seed and the one before
        if (T < 8.6) {
          let kk = 0
          for (let i = 1; i <= 20; i++) if (T >= appearAt(i)) kk = i
          const fade = 1 - smoothstep(7.6, 8.5, T)
          if (kk >= 1 && fade > 0) {
            const a0 = (kk - 1) * TAU * GOLD + rot
            const a1 = kk * TAU * GOLD + rot
            const age = clamp((T - appearAt(kk)) / 0.3)
            ctx.save()
            ctx.globalAlpha = fade
            ctx.lineWidth = 1
            ctx.strokeStyle = k.ink2
            ctx.setLineDash([2, 3])
            ctx.beginPath()
            ctx.moveTo(hx, hy)
            ctx.lineTo(xs[kk - 1] ?? hx, ys[kk - 1] ?? hy)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.strokeStyle = C.ocean
            ctx.beginPath()
            ctx.moveTo(hx, hy)
            ctx.lineTo(lerp(hx, xs[kk], age), lerp(hy, ys[kk], age))
            ctx.stroke()
            const ra = Math.max(c * 0.9, Math.min(c * 1.6, hR * 0.22))
            ctx.beginPath()
            ctx.arc(hx, hy, ra, a0, a0 + (a1 - a0) * age)
            ctx.stroke()
            // arrowhead at the end of the arc
            const ae = a0 + (a1 - a0) * age
            const ex = hx + Math.cos(ae) * ra
            const ey = hy + Math.sin(ae) * ra
            ctx.beginPath()
            ctx.moveTo(ex + Math.cos(ae - 2.4) * 5, ey + Math.sin(ae - 2.4) * 5)
            ctx.lineTo(ex, ey)
            ctx.lineTo(ex + Math.cos(ae - 0.75) * 5, ey + Math.sin(ae - 0.75) * 5)
            ctx.stroke()
            const am = (a0 + a1) / 2
            text(ctx, '137.5°', hx + Math.cos(am) * (ra + 16), hy + Math.sin(am) * (ra + 16), { size: 10, color: C.ocean, align: 'center', baseline: 'middle', tracking: 0.06 })
            ctx.restore()
            // seed numbers, fading with age
            for (let i = 1; i <= kk; i++) {
              const ageI = T - appearAt(i)
              const al = (1 - clamp((ageI - 1.4) / 1.6)) * fade
              if (al <= 0.02) continue
              const ang = i * TAU * GOLD + rot
              const rr = c * Math.sqrt(i) + c * 0.62
              text(ctx, String(i), hx + Math.cos(ang) * rr, hy + Math.sin(ang) * rr, { size: 9, color: k.muted, align: 'center', baseline: 'middle', alpha: al })
            }
          }
          readouts.push(['θ', '137.5°'], ['n', String(Math.max(1, Math.round(countAt(T))))])
        } else if (T < 14) {
          // r = c√n, dimensioned to the outermost seed
          const al = smoothstep(8.4, 9.4, T) * (1 - smoothstep(12.6, 13.6, T))
          let last = 0
          for (let i = n - 1; i > 0; i--)
            if (T >= appearAt(i) + 0.4) {
              last = i
              break
            }
          if (al > 0 && last > 2) {
            ctx.save()
            ctx.globalAlpha = al
            ctx.strokeStyle = k.ink2
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(hx, hy)
            ctx.lineTo(xs[last], ys[last])
            ctx.stroke()
            const mx = (hx + xs[last]) / 2
            const my = (hy + ys[last]) / 2
            text(ctx, 'r = c√n', mx + 8, my - 8, { size: 10, color: k.ink2, tracking: 0.06 })
            ctx.restore()
          }
          readouts.push(['θ', '137.5°'], ['n', String(Math.round(countAt(T)))], ['r', 'c√n'])
        }

        if (T >= 14 && T < LOCK + 0.4) {
          const deg = (turn * 360).toFixed(3) + '°'
          readouts.push(['θ', deg])
          if (stop >= 0) readouts.push(['turn', `${STOPS[stop][0]}/${STOPS[stop][1]}`])
          readouts.push(['n', String(N)])
          // the spoke count, large
          if (stop >= 0 && hold > 0.01) {
            const q = STOPS[stop][1]
            const big = clamp(Math.min(w, h) * 0.16, h < 380 ? 36 : 54, 150)
            const sx2 = stacked ? pad : capX
            const sy2 = stacked ? pad + 34 + big * 0.86 : h * 0.18 + big * 0.86
            ctx.save()
            ctx.globalAlpha = ease.outCubic(hold)
            text(ctx, String(q), sx2, sy2 + (1 - hold) * 10, { font: 'serif', size: big, color: k.ink })
            text(ctx, 'spokes', sx2 + 4, sy2 + 22, { size: 10, color: k.muted, tracking: 0.16, upper: true })
            ctx.restore()
          }
        }

        if (T >= LOCK - 0.1 && T < 47.5) {
          // the lock: a ring, then the two families of spirals
          const ring = clamp((T - LOCK) / 1.1)
          if (ring > 0 && ring < 1) {
            ctx.save()
            ctx.globalAlpha = 1 - ring
            ctx.strokeStyle = C.moss
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(hx, hy, hR * (1.02 + ring * 0.12), 0, TAU)
            ctx.stroke()
            ctx.restore()
          }
          const fadeOut = 1 - smoothstep(45.6, 47.2, T)
          ctx.save()
          ctx.globalAlpha = fadeOut
          lattice(21, n, c, ease.inOutSine(clamp((T - 34.8) / 3.6)), C.ocean, 1)
          lattice(34, n, c, ease.inOutSine(clamp((T - 36.6) / 3.6)), C.lagoon, 1)
          // spiral counts with their sense of rotation
          const lab = ease.outExpo(clamp((T - 38.2) / 1))
          if (lab > 0) {
            const big = clamp(Math.min(w, h) * 0.075, h < 380 ? 20 : 26, 64)
            const sx2 = stacked ? pad : capX
            const sy2 = stacked ? pad + 30 + big : h * 0.16 + big
            const d21 = fract(21 * GOLD + 0.5) - 0.5 > 0 ? '↻' : '↺'
            const d34 = fract(34 * GOLD + 0.5) - 0.5 > 0 ? '↻' : '↺'
            ctx.globalAlpha = fadeOut * lab
            text(ctx, '21', sx2, sy2, { font: 'serif', size: big, color: C.ocean })
            text(ctx, `${d21} spirals`, sx2 + big * 1.05, sy2 - 4, { size: 10, color: C.ocean, tracking: 0.14, upper: true })
            text(ctx, '34', sx2, sy2 + big * 1.05, { font: 'serif', size: big, color: C.lagoon })
            text(ctx, `${d34} spirals`, sx2 + big * 1.05, sy2 + big * 1.05 - 4, { size: 10, color: C.lagoon, tracking: 0.14, upper: true })
          }
          ctx.restore()
          if (T >= LOCK) readouts.push(['θ', '360° / φ²'], ['', '137.50776°'], ['φ', '1.6180339887…'], ['gaps', 'none'])
        }

        // sound
        if (T < 14) {
          for (let i = 1; i < n; i++) {
            const ta = appearAt(i)
            if (crossed(ta) && (i <= 20 || i % 6 === 0)) note(i, GOLD, i <= 20 ? 0.06 : 0.03)
          }
        }
        for (let s = 0; s < STOPS.length; s++) {
          const tk = STOP_T0 + s * STOP_DT
          if (crossed(tk)) {
            const [p, q] = STOPS[s]
            for (let j = 1; j <= 6; j++) note(j * 7, p / q, 0.05, j * 0.17, 0.8)
          }
        }
        if (crossed(LOCK)) {
          ;[146.83, 220, 293.66, 369.99, 440, 554.37].forEach((f, j) => sfx.tone(f, 4.5, { type: 'sine', gain: 0.05, attack: 0.4 + j * 0.05, room: 0.6, when: j * 0.06 }))
          for (let j = 1; j <= 13; j++) note(j * 3, GOLD, 0.035, 0.6 + j * 0.11, 1.2)
        }
      }

      if (T >= DIVE1) {
        /* ------------------------------------- the hand-off back to I */
        const u = ease.inOutCubic(clamp((T - DIVE1) / 2.4))
        const nRet = Math.max(1, 89 * (1 - u))
        const rotM = rot + 0.7 * (1 - smoothstep(97.6, 100, T))
        drawHead({ x: cx, y: cy, R, turn: GOLD, rot: rotM, n: nRet, norm: Math.max(12, nRet + 2 * clamp((89 - nRet) / 9)), T, ink: k.ink, lw })
        readouts.push(['n', String(Math.max(1, Math.round(nRet)))], ['θ', '137.50776°'])
        if (crossed(DIVE1 + 0.05)) for (let j = 0; j < 8; j++) note(89 - j * 11, GOLD, 0.04, j * 0.26, 1.4)
      } else if (T >= 46) {
        /* ---------------------------------- IV–VI: flower, wind, meadow */
        const sway = 0.03 * Math.sin(T * 0.7) + wind * 0.12 + 0.02 * noise.n2(T * 0.2, 3)
        // the dive into one meadow flower
        const dive = clamp((T - DIVE0) / (DIVE1 - DIVE0))
        const target = meadow[diveTarget]
        const tBase = baseY(target.depth)
        const tH = stemH(target.depth, target.height)
        const tSway = 0.04 * Math.sin(T * 0.9 + target.sway) + wind * 0.15
        const tx = landX(diveTarget) + Math.sin(tSway) * tH
        const ty = tBase - Math.cos(tSway) * tH
        const zEnd = R / (tH * 0.15)
        const de = ease.inOutCubic(dive)
        const z = dive > 0 ? Math.exp(Math.log(zEnd) * de) : 1
        const fsx = lerp(tx, cx, de)
        const fsy = lerp(ty, cy, de)
        ctx.save()
        if (dive > 0) ctx.setTransform(env.dpr * z, 0, 0, env.dpr * z, env.dpr * (fsx - tx * z), env.dpr * (fsy - ty * z))
        const lwz = lw / z
        // everything but the target falls away as the camera dives
        const sceneFade = 1 - smoothstep(0.06, 0.42, dive)
        const rotM = rot + 0.7 * (1 - smoothstep(97.6, 100, T))

        // ground: horizon and furrows
        const gIn = ease.inOutCubic(clamp((T - 47) / 3.4))
        if (gIn > 0 && sceneFade > 0) {
          ctx.save()
          ctx.globalAlpha = sceneFade
          ctx.lineWidth = lwz
          ctx.strokeStyle = k.ink
          ctx.beginPath()
          ctx.moveTo(fx - (fx + 40) * gIn, groundY)
          ctx.lineTo(fx + (w - fx + 40) * gIn, groundY)
          ctx.stroke()
          ctx.strokeStyle = k.rule
          ctx.beginPath()
          const furrowLimit = capY - capSize * 0.9 - 10
          for (let f = 1; f <= 6; f++) {
            const fy2 = groundY + (h - groundY) * Math.pow(f / 6.4, 1.7)
            if (fy2 > furrowLimit) break
            const span = (w * 0.6 + f * w * 0.1) * gIn
            ctx.moveTo(fx - span, fy2)
            ctx.lineTo(fx + span, fy2)
          }
          ctx.stroke()
          ctx.restore()
        }

        // meadow flowers (and the flyers that become them), back to front
        const flowers: { x: number; base: number; H: number; grow: number; sway: number; d: number; i: number }[] = []
        for (let i = 0; i < meadow.length; i++) {
          const m = meadow[i]
          const land = m.tr + m.fd
          if (T < land) continue
          if (!m.grows || (m.rank >= Math.floor(w / 24) && i !== diveTarget)) {
            // a seed that does not take: a dot on the ground, fading
            const al = (1 - clamp((T - land) / 2.5)) * sceneFade
            if (al > 0) {
              ctx.fillStyle = k.ink2
              ctx.globalAlpha = al
              ctx.beginPath()
              ctx.arc(landX(i), baseY(m.depth), 1.4 / z, 0, TAU)
              ctx.fill()
              ctx.globalAlpha = 1
            }
            continue
          }
          flowers.push({
            x: landX(i),
            base: baseY(m.depth),
            H: stemH(m.depth, m.height),
            grow: clamp((T - land - 0.35) / 3.2),
            sway: 0.04 * Math.sin(T * 0.9 + m.sway) + wind * 0.15,
            d: m.depth,
            i,
          })
        }
        for (const e of extras) {
          flowers.push({ x: e.x * w, base: baseY(e.depth), H: stemH(e.depth, e.height), grow: clamp((T - e.t0) / 2.6), sway: 0.04 * Math.sin(T * 0.9 + e.sway) + wind * 0.15, d: e.depth, i: -1 })
        }
        flowers.sort((a, b) => a.d - b.d)

        const drawFlowers = (front: boolean) => {
          for (const f of flowers) {
            if (f.base > groundY !== front) continue
            const isTarget = f.i === diveTarget
            const al = isTarget ? 1 : sceneFade
            if (al <= 0) continue
            if (dive > 0 && !isTarget) {
              // cull what the camera has left behind
              const sx = (f.x - tx) * z + fsx
              if (sx < -f.H * z || sx > w + f.H * z) continue
            }
            const back = f.d < 0 ? 0.55 + 0.45 * (1 + f.d) : 1
            const r2 = miniFlower(f.x, f.base, f.H, f.grow, f.sway, isTarget ? rotM : rot + f.i * 0.7, isTarget ? k.ink : mixHex(C.ink2, '#C9D6D1', night), lwz, isTarget, (isTarget ? 1 : al) * back, isTarget ? 1 - smoothstep(0.7, 0.98, dive) : 1)
            if (r2 && f.grow > 0 && f.grow < 0.12 && !isTarget) {
              // landing ring
              ctx.save()
              ctx.globalAlpha = (1 - f.grow / 0.12) * al
              ctx.strokeStyle = k.ink2
              ctx.lineWidth = lwz
              ctx.beginPath()
              ctx.ellipse(f.x, f.base, 3 + f.grow * 90, 1 + f.grow * 16, 0, 0, TAU)
              ctx.stroke()
              ctx.restore()
            }
          }
        }
        drawFlowers(false)

        // the hero flower: stem, leaves, petals, head
        if (sceneFade > 0) {
          ctx.save()
          ctx.globalAlpha = sceneFade
          const droop = smoothstep(72, 82, T) * 0.12
          const sa = sway + droop
          const hx = T < 50.5 ? lerp(cx, fx, ease.inOutCubic(clamp((T - 46) / 4.2))) : fx + Math.sin(sa) * (groundY - fy) * 0.35
          const hy = T < 50.5 ? lerp(cy, fy, ease.inOutCubic(clamp((T - 46) / 4.2))) : fy + (1 - Math.cos(sa)) * (groundY - fy) * 0.35
          const hR = T < 50.5 ? lerp(R, fR, ease.inOutCubic(clamp((T - 46) / 4.2))) : fR
          const stemU = ease.inOutSine(clamp((T - 48.4) / 3.2))
          const qx = fx + Math.sin(sa) * (groundY - fy) * 0.08
          const qy = lerp(hy + hR, groundY, 0.55)
          ctx.lineWidth = lwz
          ctx.strokeStyle = k.ink
          // a tube: two hairlines
          const tube = Math.max(1.4, hR * 0.045)
          strokeQ(fx - tube, groundY, qx - tube, qy, hx - tube, hy + hR * 0.98, stemU)
          strokeQ(fx + tube, groundY, qx + tube, qy, hx + tube, hy + hR * 0.98, stemU)
          // leaves
          const leaves = [
            { u: 0.42, side: -1, t0: 51.2 },
            { u: 0.62, side: 1, t0: 52.4 },
          ]
          for (const lf of leaves) {
            const g = ease.outBack(clamp((T - lf.t0) / 2.4))
            if (g <= 0) continue
            const [lx2, ly2] = qPoint(fx, groundY, qx, qy, hx, hy + hR, lf.u)
            const ang = -Math.PI / 2 + lf.side * (0.25 + g * 0.95) + sa * 0.5 + Math.sin(T * 1.1 + lf.u * 5) * 0.03
            const p = new Path2D()
            const v = new Path2D()
            leafPath(p, v, lx2 + lf.side * tube, ly2, ang, fR * 1.45 * g, fR * 0.4 * g)
            ctx.strokeStyle = k.ink
            ctx.stroke(p)
            ctx.strokeStyle = night > 0.5 ? C.sage : C.fern
            ctx.stroke(v)
          }
          // petals: 34, in golden order, unfolding; later withering and falling
          const P = 34
          const petals = new Path2D()
          const veins = new Path2D()
          const falling = new Path2D()
          for (let j = 0; j < P; j++) {
            const t0 = 52.2 + fract(j * GOLD) * 2.6
            const g = clamp((T - t0) / 1.7)
            if (g <= 0) continue
            const ang = j * TAU * GOLD + rot
            const L = hR * 0.95 * ease.outBack(g)
            const W2 = hR * 0.2 * ease.outCubic(g)
            const detach = 64.2 + fract(j * GOLD * 3) * 3.4
            if (T < detach) {
              const wither = smoothstep(63.2, detach, T)
              const bx = hx + Math.cos(ang) * hR * 0.96
              const by = hy + Math.sin(ang) * hR * 0.96
              petalPath(petals, bx, by, ang + wither * 0.5 * Math.sign(Math.cos(ang) || 1), L * (1 - wither * 0.25), W2 * (1 - wither * 0.4), (1 - g) * 1.2 + wither * 0.5)
              veins.moveTo(bx, by)
              veins.lineTo(bx + Math.cos(ang) * L * 0.7, by + Math.sin(ang) * L * 0.7)
            } else {
              // falling: drift with the wind, flutter, settle on the ground
              const tau = T - detach
              const fall = Math.min(1, tau / 3.4)
              const sx0 = hx + Math.cos(ang) * hR * 1.3
              const sy0 = hy + Math.sin(ang) * hR * 1.3
              const gx = sx0 + tau * (18 + wind * 60) + Math.sin(tau * 2.4 + j) * 14
              const gy = lerp(sy0, groundY - 2, ease.inOutSine(fall))
              const al2 = 1 - smoothstep(4.5, 7, tau)
              if (al2 <= 0) continue
              const spin = ang + tau * 1.4 + Math.sin(tau * 3 + j) * 0.6
              ctx.save()
              ctx.globalAlpha = sceneFade * al2
              petalPath(falling, gx, gy, spin, hR * 0.5, hR * 0.12, 0.3)
              ctx.restore()
            }
          }
          ctx.strokeStyle = k.ink
          ctx.stroke(petals)
          ctx.strokeStyle = mixHex(C.ink, NIGHT_INK, night)
          ctx.globalAlpha = sceneFade * 0.7
          ctx.stroke(falling)
          ctx.globalAlpha = sceneFade
          ctx.strokeStyle = night > 0.5 ? C.sage : C.fern
          ctx.stroke(veins)
          // the head: florets open rim-in, then ripen, then fly
          const released = (i: number) => {
            // rim seeds leave in order; the flyers are tracked separately
            const rel = 66.8 + (1 - Math.sqrt(i / N)) * 6.8
            return T >= rel
          }
          drawHead({
            x: hx,
            y: hy,
            R: hR,
            turn: GOLD,
            rot,
            n: N,
            norm: N,
            T,
            ink: k.ink,
            lw: lwz,
            open: (i) => {
              if (released(i)) return -1
              const rim = Math.sqrt(i / N)
              const o = clamp((T - (55 + (1 - rim) * 4)) / 0.7)
              if (T > 64.6) return 2
              return o
            },
            alpha: 1,
          })
          // the empty receptacle: an outline and a fine cross-hatch where the seeds were
          const empty = smoothstep(68, 74, T)
          if (empty > 0) {
            ctx.strokeStyle = k.ink2
            ctx.beginPath()
            ctx.arc(hx, hy, hR * 1.02, 0, TAU)
            ctx.stroke()
            ctx.save()
            ctx.beginPath()
            ctx.arc(hx, hy, hR * 0.98 * empty, 0, TAU)
            ctx.clip()
            ctx.globalAlpha = sceneFade * 0.28
            ctx.beginPath()
            const step = Math.max(5, hR * 0.09)
            for (let d = -hR * 2; d <= hR * 2; d += step) {
              ctx.moveTo(hx + d - hR, hy - hR)
              ctx.lineTo(hx + d + hR, hy + hR)
              ctx.moveTo(hx + d + hR, hy - hR)
              ctx.lineTo(hx + d - hR, hy + hR)
            }
            ctx.stroke()
            ctx.restore()
          }
          // dimension: the head's diameter
          // (only where there is room: short and stacked frames already show it in the readouts)
          const dimA = !stacked && h >= 400 ? smoothstep(57, 58.5, T) * (1 - smoothstep(62.5, 64, T)) : 0
          if (dimA > 0) {
            ctx.globalAlpha = sceneFade * dimA
            ctx.strokeStyle = k.ink2
            const yb = hy - hR * 1.95
            ctx.beginPath()
            ctx.moveTo(hx - hR, yb)
            ctx.lineTo(hx + hR, yb)
            ctx.moveTo(hx - hR, yb - 5)
            ctx.lineTo(hx - hR, yb + 5)
            ctx.moveTo(hx + hR, yb - 5)
            ctx.lineTo(hx + hR, yb + 5)
            ctx.stroke()
            text(ctx, `${N} florets · 34 petals`, hx, yb - 9, { size: 9.5, color: k.ink2, align: 'center', tracking: 0.12, upper: true })
          }
          ctx.restore()

          // flyers
          ctx.save()
          ctx.globalAlpha = sceneFade
          ctx.lineWidth = lwz
          ctx.strokeStyle = k.ink
          ctx.beginPath()
          const c0 = hR / Math.sqrt(N)
          for (const m of meadow) {
            const tau = T - m.tr
            if (tau < 0 || tau > m.fd) continue
            const u = tau / m.fd
            const ang0 = m.seed * TAU * GOLD + rot
            const sx0 = hx + Math.cos(ang0) * c0 * Math.sqrt(m.seed)
            const sy0 = hy + Math.sin(ang0) * c0 * Math.sqrt(m.seed)
            const lx = m.lx * w
            const ly = groundY + m.depth * (h - groundY) * 0.42
            if (advancing) {
              m.wx += wind * 90 * dt
              m.wy += -Math.abs(wind) * 20 * dt
            }
            const x = lerp(sx0, lx, ease.inOutSine(u)) + Math.sin(u * Math.PI * 2 + m.phase) * 26 * (1 - u) + m.wx
            const y = lerp(sy0, ly, u) - Math.sin(u * Math.PI) * m.lift * h + m.wy * (1 - u)
            const s = (0.5 + 0.6 * ease.outCubic(clamp(u * 4))) * (0.7 + (m.depth + 1) * 0.3) * Math.max(0.8, Math.min(w, h) / 700)
            flyer(x, y, Math.sin(tau * 3 + m.phase) * 0.35 + wind * 0.8, s)
          }
          ctx.stroke()
          ctx.restore()
        }

        drawFlowers(true)

        // dusk: a moon and fireflies
        if (night > 0 && sceneFade > 0) {
          ctx.save()
          ctx.globalAlpha = night * sceneFade
          ctx.lineWidth = lwz
          ctx.strokeStyle = NIGHT_INK
          const mr = Math.min(w, h) * 0.045
          const mx = portrait ? w * 0.76 : w * 0.84
          const my = h * 0.17
          const mu = ease.inOutSine(clamp((T - 85.5) / 3))
          ctx.beginPath()
          ctx.arc(mx, my, mr, -Math.PI * 0.5, -Math.PI * 0.5 + TAU * 0.5 * mu, false)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(mx - mr * 0.42, my, mr * 0.9, -Math.PI * 0.42, -Math.PI * 0.42 + Math.PI * 0.84 * mu, false)
          ctx.stroke()
          ctx.fillStyle = C.sage
          for (const ff of fireflies) {
            const fxp = (ff.x + noise.n2(ff.x * 3, T * 0.08 * ff.s) * 0.08) * w
            const fyp = groundY - h * 0.04 - ff.y * h * 0.36 + noise.n2(T * 0.1 * ff.s, ff.y * 5) * h * 0.03
            const tw = 0.5 + 0.5 * Math.sin(T * 2.2 * ff.s + ff.p)
            ctx.globalAlpha = night * sceneFade * tw * tw
            ctx.beginPath()
            ctx.arc(fxp, fyp, 1.3 + tw, 0, TAU)
            ctx.fill()
          }
          ctx.restore()
        }
        ctx.restore()


        // readouts
        if (T < 64) readouts.push(['petals', '34'], ['florets', String(N)], ['θ', '137.50776°'])
        else if (T < 84) {
          const landed = meadow.filter((m) => T >= m.tr + m.fd).length + extras.length
          readouts.push(['seeds', String(FLYERS)], ['landed', String(landed)], ['wind', (wind * 10).toFixed(1)])
        } else readouts.push(['flowers', String(FLYERS + extras.length)], ['θ', '137.50776°'])

        // sound
        for (let j = 0; j < 34; j++) if (crossed(52.2 + fract(j * GOLD) * 2.6)) note(j * 5 + 2, GOLD, 0.035, 0, 1.4)
        if (crossed(51.2) || crossed(52.4)) sfx.tone(SCALE[0] / 2, 2.4, { type: 'sine', gain: 0.06, attack: 0.3, room: 0.5 })
        if (crossed(66.8)) sfx.noise(6, { filter: 500, to: 1800, q: 0.5, gain: 0.05, room: 0.6 })
        for (const m of meadow) if (crossed(m.tr + m.fd)) sfx.tone(SCALE[Math.floor(fract(m.k * 7.3) * 5)] * (m.depth > 0 ? 0.5 : 1), 1.2, { type: 'triangle', gain: 0.035, room: 0.5, pan: m.lx * 1.4 - 0.7 })
        if (crossed(DIVE0)) sfx.noise(7.5, { filter: 300, to: 3200, q: 0.7, gain: 0.04, room: 0.6 })
      }

      // the pad underneath: II–VI
      if (sfx.enabled || pad1) padSet(sfx.enabled ? smoothstep(14, 17, T) * (1 - smoothstep(95, 99.5, T)) * (0.7 + night * 0.3) : 0)

      captionAt(T)
      chrome(T, readouts)

      // a hint that the pointer is the wind
      if (!preview && T > 66 && T < 84 && pointerSeen < 0.05) {
        const al = smoothstep(67, 68, T) * (1 - smoothstep(82, 83.5, T))
        const hy2 = stacked ? capY - capSize * 0.9 - 22 : h - pad * 0.55 - 26
        text(ctx, portrait ? 'Drag for wind · tap to plant' : 'Move to make wind · click to plant', w - pad, hy2, { size: 9.5, color: k.muted, align: 'right', tracking: 0.14, upper: true, alpha: al })
      }

      prevT = T
    },
  }
}

export default create
