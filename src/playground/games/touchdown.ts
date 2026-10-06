/*
 * TOUCHDOWN — after Lunar Lander (Atari, 1979).
 *
 * A descent drawn on the night ground in paper-coloured line: the terrain
 * is a topographic profile (a ridge with strata of contour strokes beneath),
 * the landing pads are dimensioned with their multipliers, and the lander is
 * a small technical drawing with a stacked-stroke plume. Gravity, rotation
 * and a fuel tank that doubles as your lives; the camera closes in near the
 * ground, as the original did. A soft landing settles on its legs and tallies
 * up; a crash comes apart into tumbling line fragments.
 *
 * The bot is a PD controller: it picks a pad, holds clearance over the
 * ridges, and flies a speed-over-altitude profile down to the pad.
 */

import { angleDiff, C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, makeNoise, mod, rgba, rng, Rings, Sparks, START_KEYS, TAU, text } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

const CAPTION = 'FIG. G.06 — AFTER LUNAR LANDER, 1979'
const KICKER = 'After Lunar Lander · Atari, 1979'

type State = 'attract' | 'title' | 'play' | 'over'
type Phase = 'intro' | 'fly' | 'landed' | 'crashed'

const LH = 360 // the world's floor; terrain lives in y 196–348
const WW = 480 // world width; the terrain wraps
const G = 9 // u/s²
const THRUST = 22.5
const ROT_MAX = 1.9
const FUEL_MAX = 1000
const BURN = 30 // per second at full throttle
const M = 0.2 // metres per unit, for the readouts
const VS_MAX = 12
const HS_MAX = 6
const ATT_MAX = 0.2
const FOOT_Y = 5.5
const ZOOM = 2.4
const INK = '#EEF4F1'

interface Pad {
  x0: number
  x1: number
  y: number
  mult: number
}

// --- the lander, as segments in its own frame (y down, upright = 0)
function polySegs(out: number[], p: number[]) {
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length
    out.push(p[i], p[i + 1], p[j], p[j + 1])
  }
}
const BODY = (() => {
  const s: number[] = []
  polySegs(s, [-4.5, -5.5, -4.5, -9.2, -2.6, -11.6, 2.6, -11.6, 4.5, -9.2, 4.5, -5.5]) // ascent stage
  polySegs(s, [-6.2, -5.5, 6.2, -5.5, 6.2, -1.6, -6.2, -1.6]) // descent stage
  polySegs(s, [-1.5, -1.6, 1.5, -1.6, 2.6, 1.4, -2.6, 1.4]) // nozzle bell
  // window: a small octagon
  const w: number[] = []
  for (let i = 0; i < 8; i++) w.push(-1.7 + Math.cos((i / 8) * TAU) * 1.2, -8.5 + Math.sin((i / 8) * TAU) * 1.2)
  polySegs(s, w)
  // antenna + dish
  s.push(2.2, -11.6, 3.3, -14.0)
  s.push(2.3, -14.6, 4.3, -13.4)
  // bracing hatch on the descent stage
  for (const k of [-3.9, -1.3, 1.3, 3.9]) s.push(k - 1.9, -1.7, k + 1.9, -5.4)
  // RCS quads
  s.push(-4.5, -10.2, -5.6, -10.2, 4.5, -10.2, 5.6, -10.2)
  return s
})()
const BODY_N = BODY.length

/** Leg segments for a given compression (feet stay on the ground, the body sinks). */
function legSegs(out: number[], comp: number) {
  out.length = 0
  for (const sd of [-1, 1]) {
    const fy = FOOT_Y - comp
    out.push(sd * 5.6, -3.2, sd * 9.2, fy) // main strut
    out.push(sd * 3.4, -1.6, sd * 7.4, fy - 3.6 + comp * 0.35) // brace
    out.push(sd * 7.7, fy, sd * 10.7, fy) // footpad
  }
  return out
}

/** Sparks-like fragments with gravity that bounce on the terrain. */
class Debris {
  x = new Float32Array(64)
  y = new Float32Array(64)
  vx = new Float32Array(64)
  vy = new Float32Array(64)
  a = new Float32Array(64)
  va = new Float32Array(64)
  len = new Float32Array(64)
  n = 0
  add(x1: number, y1: number, x2: number, y2: number, vx: number, vy: number, va: number) {
    if (this.n >= 64) return
    const i = this.n++
    this.x[i] = (x1 + x2) / 2
    this.y[i] = (y1 + y2) / 2
    this.a[i] = Math.atan2(y2 - y1, x2 - x1)
    this.len[i] = Math.hypot(x2 - x1, y2 - y1)
    this.vx[i] = vx
    this.vy[i] = vy
    this.va[i] = va
  }
  update(dt: number, groundY: (x: number) => number) {
    for (let i = 0; i < this.n; i++) {
      this.vy[i] += G * 1.4 * dt
      this.x[i] += this.vx[i] * dt
      this.y[i] += this.vy[i] * dt
      this.a[i] += this.va[i] * dt
      const gy = groundY(this.x[i]) - Math.abs(Math.sin(this.a[i])) * this.len[i] * 0.5
      if (this.y[i] > gy) {
        this.y[i] = gy
        if (this.vy[i] > 0) this.vy[i] *= -0.32
        this.vx[i] *= 0.55
        this.va[i] *= 0.5
        if (Math.abs(this.vy[i]) < 2) this.vy[i] = 0
      }
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    for (let i = 0; i < this.n; i++) {
      const h = this.len[i] / 2
      const c = Math.cos(this.a[i]) * h
      const s = Math.sin(this.a[i]) * h
      ctx.moveTo(this.x[i] - c, this.y[i] - s)
      ctx.lineTo(this.x[i] + c, this.y[i] + s)
    }
    ctx.stroke()
  }
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 120 : 320)
  const rings = new Rings()
  const debris = new Debris()
  const V = rng(77)
  const forceBot = env.params.get('bot') === '1'
  // the field: landscape shows the whole world; portrait a taller, narrower window that pans
  let FW = 480
  let FH = 360
  let portrait = false
  let f = gameFit(env.width, env.height, env.mode, FW, FH)

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  let newRecord = false
  let shown = 0

  // session
  let score = 0
  let fuel = FUEL_MAX
  let round = 0
  let clock = 0
  let seed = 11

  // round
  let phase: Phase = 'intro'
  let phaseT = 0
  let pads: Pad[] = []
  let tx = new Float32Array(0)
  let ty = new Float32Array(0)
  const CS = 4
  const CN = WW / CS
  let contours: Float32Array[] = []
  let stars = new Float32Array(0)

  const L = { x: 40, y: 40, vx: 30, vy: 0, a: 0, va: 0, thr: 0, comp: 0, comp0: 0, rcs: 0 }
  let rotIn = 0
  let thrustIn = false
  let thrustSnd = 0
  let lowFuelSnd = 0
  let tallyTick = 0
  let result = { title: '', detail: '', base: 0, mult: 1, points: 0, fuelBonus: 0, quality: 0 }
  let shake = 0

  // camera
  let zoom = 1
  let zoomWant = 1
  let camX = WW / 2
  let camY = LH / 2

  // bot
  let botPad: Pad | null = null
  let botAcc = 0
  let botOver = false
  let botSoft = 2

  // pointer zones
  const ptrs = new Map<number, 'left' | 'mid' | 'right'>()
  let tapStart = false

  // first-play hints (full mode, once per browser): thrust, then rotate; after
  // that, in-the-moment advice near the ground
  let hint = env.mode === 'full' && env.store.get('hinted') !== '1' ? 0 : 2
  let hintT = 0
  let thrustAcc = 0
  let rotAcc = 0

  const sfxOn = () => state === 'play'
  const sfx = {
    tone: (freq: number, dur: number, o?: Parameters<typeof env.sfx.tone>[2]) => sfxOn() && env.sfx.tone(freq, dur, o),
    noise: (dur: number, o?: Parameters<typeof env.sfx.noise>[1]) => sfxOn() && env.sfx.noise(dur, o),
  }

  /* ------------------------------------------------------------ terrain */

  function groundY(x: number) {
    const xm = mod(x, WW)
    let lo = 0
    let hi2 = tx.length - 1
    while (hi2 - lo > 1) {
      const mid = (lo + hi2) >> 1
      if (tx[mid] <= xm) lo = mid
      else hi2 = mid
    }
    const k = (xm - tx[lo]) / (tx[hi2] - tx[lo] || 1)
    return ty[lo] + (ty[hi2] - ty[lo]) * k
  }

  function padUnder(xa: number, xb: number): Pad | null {
    for (const p of pads) {
      const a = p.x0 - 1.6
      const b = p.x1 + 1.6
      const ma = mod(xa, WW)
      const mb = mod(xb, WW)
      if (ma >= a && ma <= b && mb >= a && mb <= b) return p
    }
    return null
  }

  function genTerrain(sd: number) {
    const nz = makeNoise(sd)
    const r = rng(sd * 7 + 3)
    const base = (x: number) => {
      const th = (x / WW) * TAU
      const c = Math.cos(th)
      const s = Math.sin(th)
      const big = nz.fbm2(c * 1.25 + 10, s * 1.25 + 10, 3)
      const jag = nz.n2(c * 8 + 50, s * 8 + 50) * 0.42 + nz.n2(c * 21 + 80, s * 21 + 80) * 0.18
      return clamp(286 - big * 78 - jag * 26, 196, 348)
    }
    // pads: one per quarter, narrower = higher multiplier
    const specs = [
      { w: 46, m: 2 },
      { w: 36, m: 2 },
      { w: 29, m: 3 },
      { w: 22, m: 5 },
    ]
    for (let i = specs.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      const tmp = specs[i]
      specs[i] = specs[j]
      specs[j] = tmp
    }
    pads = specs.map((sp, i) => {
      const cx = i * (WW / 4) + 34 + r() * (WW / 4 - 68)
      const x0 = cx - sp.w / 2
      const x1 = cx + sp.w / 2
      let y = 999
      for (let x = x0; x <= x1; x += 2) y = Math.min(y, base(x))
      return { x0, x1, y: y - 1, mult: sp.m }
    })
    const xs: number[] = []
    const ys: number[] = []
    for (let x = 0; x <= WW + 0.01; x += 6) {
      if (pads.some((p) => x > p.x0 - 1 && x < p.x1 + 1)) continue
      xs.push(x)
      ys.push(base(x))
    }
    for (const p of pads) {
      xs.push(p.x0, p.x1)
      ys.push(p.y, p.y)
    }
    const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b])
    tx = new Float32Array(order.map((i) => xs[i]))
    ty = new Float32Array(order.map((i) => ys[i]))
    // contours: progressively smoother strata beneath the ridge
    const raw = new Float32Array(CN + 1)
    for (let i = 0; i <= CN; i++) raw[i] = groundY(i * CS)
    const offs = [5, 11, 18, 27, 38, 52, 69]
    contours = offs.map((off, k) => {
      const rad = 1 + k * 2
      const out = new Float32Array(CN + 1)
      for (let i = 0; i <= CN; i++) {
        let s = 0
        for (let j = -rad; j <= rad; j++) s += raw[mod(i + j, CN)]
        out[i] = s / (rad * 2 + 1) + off
      }
      return out
    })
    // stars above the ridge
    const st: number[] = []
    for (let i = 0; i < 130; i++) {
      const x = r() * WW
      const y = -170 + r() * 430
      if (y < groundY(x) - 14) st.push(x, y, r())
    }
    stars = new Float32Array(st)
  }

  /* -------------------------------------------------------------- rounds */

  function startRound() {
    round++
    seed = 101 + round * 17 + (state === 'play' ? 0 : 5000)
    genTerrain(seed)
    phase = 'intro'
    phaseT = 0
    const r = rng(seed + 1)
    const fromLeft = r() < 0.6
    // enter clear of the instrument plate (top-left)
    L.x = fromLeft ? 178 + r() * 40 : WW - 120 - r() * 50
    L.y = 30 + r() * 14
    L.vx = (fromLeft ? 1 : -1) * (22 + r() * 14)
    L.vy = 0
    L.a = 0
    L.va = 0
    L.thr = 0
    L.comp = 0
    debris.n = 0
    sparks.clear()
    rings.clear()
    zoom = zoomWant = 1
    botPad = null
    botAcc = 0
    botOver = false
    botSoft = 1.8 + r() * 3.4 // touchdown speed varies: some perfect, some merely good
  }

  function newSession() {
    score = 0
    fuel = FUEL_MAX
    round = 0
    clock = 0
    startRound()
  }

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') newSession()
    if (next === 'over') {
      shown = score
      newRecord = hi.submit(score)
    }
  }

  function endRound() {
    if (fuel <= 0) {
      if (state === 'play') go('over')
      newSession()
    } else startRound()
  }

  /* -------------------------------------------------------------- landing */

  const toWorld = (px: number, py: number, out: [number, number]) => {
    const ca = Math.cos(L.a)
    const sa = Math.sin(L.a)
    out[0] = L.x + ca * px - sa * py
    out[1] = L.y + sa * px + ca * py
    return out
  }
  const tmpA: [number, number] = [0, 0]
  const tmpB: [number, number] = [0, 0]
  const legBuf: number[] = []

  function land(pad: Pad) {
    const vs = L.vy
    const hs = Math.abs(L.vx)
    const att = Math.abs(L.a)
    phase = 'landed'
    phaseT = 0
    L.comp0 = (0.55 + 0.45 * clamp(vs / VS_MAX)) * 3.2
    L.y = pad.y - FOOT_Y
    L.vx = L.vy = 0
    L.va = 0
    const perfect = vs < 4.5 && hs < 2.5 && att < 0.07
    const hard = vs > 8.5
    const base = perfect ? 100 : hard ? 25 : 50
    result = {
      title: perfect ? 'Perfect landing' : hard ? 'Hard landing' : 'Good landing',
      detail: `PAD ×${pad.mult} · VS ${(vs * M).toFixed(1)} m/s · ATT ${Math.round((att * 180) / Math.PI)}°`,
      base,
      mult: pad.mult,
      points: base * pad.mult,
      fuelBonus: perfect ? 50 : 0,
      quality: perfect ? 2 : hard ? 0 : 1,
    }
    score += result.points
    fuel = Math.min(FUEL_MAX, fuel + result.fuelBonus)
    // dust from both feet, along the ground
    for (const sd of [-1, 1]) {
      const fx = L.x + sd * 9.2
      sparks.emit(fx, pad.y - 0.5, preview ? 5 : 12, { speed: 34 + vs * 2, life: 0.9, color: rgba(INK, 0.7), dir: sd > 0 ? 0 : Math.PI, spread: 0.5 })
      sparks.emit(fx, pad.y - 0.5, preview ? 2 : 5, { speed: 22, life: 0.7, color: rgba(C.sage, 0.8), dir: -Math.PI / 2 + sd * 0.9, spread: 0.6 })
    }
    sfx.noise(0.2, { filter: 260, gain: 0.12 })
    const chord = perfect ? [523, 659, 784, 1047] : hard ? [440, 554] : [523, 659, 784]
    chord.forEach((fr, i) => sfx.tone(fr, 0.5, { type: 'triangle', gain: 0.05, when: 0.12 + i * 0.09 }))
  }

  function crash(reason: string) {
    phase = 'crashed'
    phaseT = 0
    const lost = Math.min(fuel, 250)
    fuel -= lost
    score += 5
    result = { title: 'Structural failure', detail: reason, base: 5, mult: 1, points: 5, fuelBonus: -lost, quality: -1 }
    // the drawing comes apart: every segment becomes a fragment
    legSegs(legBuf, 0)
    const all = BODY.concat(legBuf)
    for (let i = 0; i < all.length; i += 4) {
      toWorld(all[i], all[i + 1], tmpA)
      toWorld(all[i + 2], all[i + 3], tmpB)
      const mx = (tmpA[0] + tmpB[0]) / 2 - L.x
      const my = (tmpA[1] + tmpB[1]) / 2 - L.y
      const ml = Math.hypot(mx, my) || 1
      const s = 6 + V() * 16
      debris.add(tmpA[0], tmpA[1], tmpB[0], tmpB[1], L.vx * 0.25 + (mx / ml) * s, -6 - V() * 13 + (my / ml) * s * 0.5, (V() - 0.5) * 6)
    }
    sparks.emit(L.x, L.y, preview ? 12 : 34, { speed: 70, life: 1.1, color: INK })
    sparks.emit(L.x, L.y, preview ? 4 : 12, { speed: 50, life: 0.9, color: C.sky })
    rings.add(L.x, L.y, 26, 0.7, INK)
    rings.add(L.x, L.y, 14, 0.5, C.sky)
    shake = 4
    sfx.noise(1.0, { filter: 180, to: 45, gain: 0.32 })
    sfx.tone(110, 0.7, { type: 'sine', to: 40, gain: 0.08 })
  }

  function checkContact() {
    // hull strike first
    const hull = [-4.5, -11.6, 4.5, -11.6, -6.2, -1.6, 6.2, -1.6, 0, 1.4, -6.2, -5.5, 6.2, -5.5]
    for (let i = 0; i < hull.length; i += 2) {
      toWorld(hull[i], hull[i + 1], tmpA)
      if (tmpA[1] >= groundY(tmpA[0])) {
        crash('HULL STRIKE · TERRAIN CONTACT')
        return
      }
    }
    toWorld(-9.2, FOOT_Y, tmpA)
    toWorld(9.2, FOOT_Y, tmpB)
    const la = tmpA[1] >= groundY(tmpA[0])
    const lb = tmpB[1] >= groundY(tmpB[0])
    if (!la && !lb) return
    const pad = padUnder(tmpA[0], tmpB[0])
    const vs = L.vy
    const hs = Math.abs(L.vx)
    const att = Math.abs(L.a)
    if (!pad) crash('OFF PAD · UNEVEN GROUND')
    else if (vs > VS_MAX) crash(`VS ${(vs * M).toFixed(1)} m/s > LIMIT ${(VS_MAX * M).toFixed(1)}`)
    else if (hs > HS_MAX) crash(`HS ${(hs * M).toFixed(1)} m/s > LIMIT ${(HS_MAX * M).toFixed(1)}`)
    else if (att > ATT_MAX) crash(`ATT ${Math.round((att * 180) / Math.PI)}° > LIMIT ${Math.round((ATT_MAX * 180) / Math.PI)}°`)
    else land(pad)
  }

  /* ------------------------------------------------------------------ bot */

  function choosePad() {
    const r = rng(seed + 9)
    let best: Pad | null = null
    let bs = -1
    for (const p of pads) {
      const d = wrapD((p.x0 + p.x1) / 2 - L.x)
      // pads ahead in the direction of travel are cheaper to reach
      const ahead = Math.sign(d) === Math.sign(L.vx) ? 1 : 0.45
      const risk = p.mult === 5 ? (fuel < 300 ? 0.3 : 0.85) : 1
      const sc = (Math.pow(p.mult, 0.7) / (1 + Math.abs(d) / 110)) * ahead * risk * (0.8 + r() * 0.4)
      if (sc > bs) {
        bs = sc
        best = p
      }
    }
    return best
  }

  const wrapD = (d: number) => d - WW * Math.round(d / WW)

  function botThink() {
    rotIn = 0
    thrustIn = false
    if (phase !== 'fly') return
    if (!botPad) botPad = choosePad()
    const pad = botPad!
    const cx = (pad.x0 + pad.x1) / 2
    const dx = wrapD(cx - L.x)
    const adx = Math.abs(dx)
    const feet = L.y + FOOT_Y
    const padAlt = pad.y - feet
    const halfW = (pad.x1 - pad.x0) / 2
    // over the pad (with a little hysteresis so the descent commits)
    const tol = halfW - 9.2 + 1.2
    if (adx < tol - 0.6) botOver = true
    else if (adx > tol + 0.6) botOver = false
    const over = botOver
    // horizontal: a braking profile toward the pad centre, gentle when close
    const vxDes = Math.sign(dx) * Math.min(40, 0.85 * Math.sqrt(12 * adx), 0.6 * adx)
    // vertical: clear the ridges en route, then a constant-deceleration descent onto the pad
    let vyDes: number
    let tiltMax = 0.85
    if (over) vyDes = clamp(Math.sqrt(11 * Math.max(0, padAlt - 5)) + botSoft, botSoft, 34)
    else {
      let clearY = 999
      for (let i = 0; i <= 16; i++) clearY = Math.min(clearY, groundY(L.x + (dx * i) / 16 + Math.sign(dx) * 12))
      const margin = clearY - feet
      vyDes = margin < 26 ? -10 : clamp((margin - 26) * 0.35, 0, 24)
      tiltMax = margin > 50 ? 1.25 : 0.85
      vyDes = Math.min(vyDes, Math.max(-6, (padAlt - 16) * 0.5))
    }
    const ax = (vxDes - L.vx) * (adx < 14 ? 1.1 : 1.6)
    const ay = (vyDes - L.vy) * (over && padAlt < 24 ? 3 : 2)
    const Tx = ax
    const Ty = ay - G
    // even while it wants to fall faster, tilt to brake sideways
    let aDes = Math.atan2(Tx, -Math.min(Ty, -2))
    aDes = clamp(aDes, -tiltMax, tiltMax)
    if (over && padAlt < 12) aDes = clamp(aDes, -0.05, 0.05)
    if (over && padAlt < 3) aDes = 0
    const err = angleDiff(L.a, aDes)
    rotIn = Math.abs(err) < 0.006 ? 0 : clamp(err * 6 - L.va * 1.2, -1, 1)
    const hx = Math.sin(L.a)
    const hy = -Math.cos(L.a)
    let need = clamp((Tx * hx + Ty * hy) / THRUST, 0, 1)
    if (Math.abs(err) > 0.5) need *= 0.25
    // sigma-delta: an on/off key whose duty cycle is the throttle we want
    botAcc += need
    if (botAcc >= 1) {
      thrustIn = true
      botAcc -= 1
    }
  }

  function playerInput() {
    rotIn = (keys.down('ArrowRight', 'KeyD') ? 1 : 0) - (keys.down('ArrowLeft', 'KeyA') ? 1 : 0)
    thrustIn = keys.down('ArrowUp', 'KeyW', 'Space')
    for (const z of ptrs.values()) {
      if (z === 'left') rotIn = -1
      else if (z === 'right') rotIn = 1
      else thrustIn = true
    }
    if (rotIn !== 0 && L.rcs <= 0) {
      L.rcs = 0.18
      sfx.noise(0.05, { filter: 3400, gain: 0.025, q: 1.2 })
    }
  }

  /* ---------------------------------------------------------- simulation */

  function step(dt: number, bot: boolean) {
    phaseT += dt
    L.rcs -= dt
    if (phase === 'intro') {
      if (phaseT > 0.9) {
        phase = 'fly'
        phaseT = 0
      }
      return
    }
    if (phase === 'landed') {
      const k = phaseT
      L.a += (0 - L.a) * damp(12, dt)
      // the legs take the weight: a damped spring settling to a static squat
      L.comp = 0.7 + (L.comp0 - 0.7) * Math.exp(-4 * k) * Math.cos(11 * k)
      L.thr *= Math.exp(-10 * dt)
      L.y = (padUnder(L.x - 9, L.x + 9)?.y ?? groundY(L.x)) - FOOT_Y + L.comp
      if (phaseT > 3.8) endRound()
      return
    }
    if (phase === 'crashed') {
      debris.update(dt, groundY)
      if (phaseT > 3.4) endRound()
      return
    }
    // fly
    clock += dt
    if (bot) botThink()
    else {
      playerInput()
      if (thrustIn && fuel > 0) thrustAcc += dt
      if (rotIn !== 0) rotAcc += dt
    }
    if (fuel <= 0) thrustIn = false
    L.va += (rotIn * ROT_MAX - L.va) * damp(9, dt)
    L.a = clamp(L.a + L.va * dt, -Math.PI / 2, Math.PI / 2)
    L.thr += ((thrustIn ? 1 : 0) - L.thr) * damp(thrustIn ? 16 : 11, dt)
    const burn = L.thr * BURN * dt + Math.abs(rotIn) * 3 * dt
    fuel = Math.max(0, fuel - burn)
    const acc = L.thr * THRUST
    L.vx += Math.sin(L.a) * acc * dt
    L.vy += (G - Math.cos(L.a) * acc) * dt
    L.x = mod(L.x + L.vx * dt, WW)
    L.y += L.vy * dt
    if (L.y < -30) {
      L.y = -30
      L.vy = Math.max(0, L.vy)
    }
    // sound
    if (L.thr > 0.06) {
      thrustSnd -= dt
      if (thrustSnd <= 0) {
        thrustSnd = 0.06
        sfx.noise(0.13, { filter: 120 + L.thr * 70, q: 0.6, gain: 0.07 * L.thr, room: 0.04 })
      }
    }
    if (fuel < 150 && fuel > 0) {
      lowFuelSnd -= dt
      if (lowFuelSnd <= 0) {
        lowFuelSnd = 0.75
        sfx.tone(880, 0.09, { type: 'sine', gain: 0.03 })
      }
    }
    // ground dust under the plume
    const alt = groundY(L.x) - (L.y + FOOT_Y)
    if (L.thr > 0.3 && alt < 26 && V() < L.thr * 0.6) {
      const gx = L.x + Math.sin(L.a) * alt
      const gy = groundY(gx)
      const s = V() < 0.5 ? 0 : Math.PI
      sparks.emit(gx, gy - 0.5, 1, { speed: 40 * (1 - alt / 26) + 10, life: 0.6, color: rgba(INK, 0.55), dir: s, spread: 0.35 })
    }
    checkContact()
  }

  /* -------------------------------------------------------------- drawing */

  let hair = 1
  /** world units per CSS px at the current zoom */
  let px = 1
  const lab = (s: string, x: number, y: number, o: TextOpts = {}) => text(ctx, s, x, y, { ...o, size: (o.size ?? 9) * px })

  function drawLander(x: number, y: number, a: number, comp: number, thr: number, alpha: number, rot: number) {
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const segs = (arr: ArrayLike<number>, n: number) => {
      for (let i = 0; i < n; i += 4) {
        ctx.moveTo(x + ca * arr[i] - sa * arr[i + 1], y + sa * arr[i] + ca * arr[i + 1])
        ctx.lineTo(x + ca * arr[i + 2] - sa * arr[i + 3], y + sa * arr[i + 2] + ca * arr[i + 3])
      }
    }
    ctx.globalAlpha = alpha
    ctx.strokeStyle = INK
    ctx.lineWidth = hair * 1.1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    segs(BODY, BODY_N)
    legSegs(legBuf, comp)
    segs(legBuf, legBuf.length)
    ctx.stroke()
    // plume: stacked strokes under the bell
    if (thr > 0.04) {
      const n = Math.round(2 + thr * 4)
      ctx.strokeStyle = C.sky
      ctx.lineWidth = hair * 1.2
      ctx.beginPath()
      let yy = 2.8
      for (let i = 0; i < n; i++) {
        const fl = 0.7 + V() * 0.6
        const w = Math.max(0.4, (2.5 - i * 0.36) * fl * Math.sqrt(thr))
        ctx.moveTo(x + ca * -w - sa * yy, y + sa * -w + ca * yy)
        ctx.lineTo(x + ca * w - sa * yy, y + sa * w + ca * yy)
        yy += (1.9 + V() * 0.7) * (0.6 + thr * 0.5)
      }
      ctx.stroke()
    }
    // RCS puffs
    if (rot !== 0) {
      const sd = rot > 0 ? -1 : 1
      ctx.strokeStyle = rgba(INK, 0.6)
      ctx.lineWidth = hair
      ctx.beginPath()
      for (const dy of [-0.8, 0.8]) {
        const x0 = sd * 6.2
        const y0 = -10.2 + dy
        const x1 = sd * (7.6 + V() * 1.6)
        const y1 = -10.2 + dy * 1.8
        ctx.moveTo(x + ca * x0 - sa * y0, y + sa * x0 + ca * y0)
        ctx.lineTo(x + ca * x1 - sa * y1, y + sa * x1 + ca * y1)
      }
      ctx.stroke()
    }
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
    ctx.globalAlpha = 1
  }

  function drawTerrain(ox: number, prog: number) {
    const xMax = prog * WW
    // strata
    for (let k = 0; k < contours.length; k++) {
      // strata follow the ridge down, each a beat behind the one above
      const lag = 0.08 + k * 0.035
      const cp = clamp((prog - lag) / (1 - lag))
      if (cp <= 0) continue
      const c = contours[k]
      ctx.strokeStyle = rgba(INK, 0.3 - k * 0.032)
      ctx.lineWidth = hair
      ctx.beginPath()
      const n = Math.floor(cp * CN)
      for (let i = 0; i <= n; i++) {
        const y = Math.min(c[i], LH + 40)
        if (i === 0) ctx.moveTo(ox + i * CS, y)
        else ctx.lineTo(ox + i * CS, y)
      }
      ctx.stroke()
    }
    // the ridge
    ctx.strokeStyle = INK
    ctx.lineWidth = hair * 1.35
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(ox + tx[0], ty[0])
    for (let i = 1; i < tx.length; i++) {
      if (tx[i] > xMax) {
        const k = (xMax - tx[i - 1]) / (tx[i] - tx[i - 1] || 1)
        ctx.lineTo(ox + lerp(tx[i - 1], tx[i], k), lerp(ty[i - 1], ty[i], k))
        break
      }
      ctx.lineTo(ox + tx[i], ty[i])
    }
    ctx.stroke()
    ctx.lineJoin = 'miter'
    // pads
    for (const p of pads) {
      const pa = clamp((prog * WW - p.x1) / 60 + 0.3)
      if (pa <= 0) continue
      const target = (botPad === p && (state !== 'play' || forceBot)) || nearPad === p
      const col = target ? C.sage : INK
      ctx.globalAlpha = pa
      ctx.strokeStyle = col
      ctx.lineWidth = hair * 2.2
      ctx.beginPath()
      ctx.moveTo(ox + p.x0, p.y)
      ctx.lineTo(ox + p.x1, p.y)
      ctx.stroke()
      // landing lights
      ctx.lineWidth = hair
      ctx.beginPath()
      ctx.moveTo(ox + p.x0, p.y)
      ctx.lineTo(ox + p.x0, p.y - 2.6)
      ctx.moveTo(ox + p.x1, p.y)
      ctx.lineTo(ox + p.x1, p.y - 2.6)
      ctx.stroke()
      // dimension line beneath
      const dy = p.y + 7
      const ah = 2.2
      ctx.strokeStyle = rgba(target ? C.sage : INK, 0.75)
      ctx.beginPath()
      ctx.moveTo(ox + p.x0, p.y + 2)
      ctx.lineTo(ox + p.x0, dy + 2.5)
      ctx.moveTo(ox + p.x1, p.y + 2)
      ctx.lineTo(ox + p.x1, dy + 2.5)
      ctx.moveTo(ox + p.x0, dy)
      ctx.lineTo(ox + p.x1, dy)
      ctx.moveTo(ox + p.x0 + ah, dy - ah * 0.55)
      ctx.lineTo(ox + p.x0, dy)
      ctx.lineTo(ox + p.x0 + ah, dy + ah * 0.55)
      ctx.moveTo(ox + p.x1 - ah, dy - ah * 0.55)
      ctx.lineTo(ox + p.x1, dy)
      ctx.lineTo(ox + p.x1 - ah, dy + ah * 0.55)
      ctx.stroke()
      lab(`×${p.mult}`, ox + (p.x0 + p.x1) / 2, dy + 2.5 + 9 * px, { size: preview ? 8 : 10, color: col, align: 'center', weight: 500 })
      ctx.globalAlpha = 1
    }
  }
  let nearPad: Pad | null = null

  function drawStars(ox: number, prog: number) {
    ctx.fillStyle = INK
    const d = 0.7 * px
    for (let i = 0; i < stars.length; i += 3) {
      const b = stars[i + 2]
      ctx.globalAlpha = (0.15 + b * 0.45) * prog
      const x = ox + stars[i]
      const y = stars[i + 1]
      if (b > 0.93) {
        ctx.fillRect(x - d * 3, y - d * 0.5, d * 6, d)
        ctx.fillRect(x - d * 0.5, y - d * 3, d, d * 6)
      } else ctx.fillRect(x - d, y - d, d * 2, d * 2)
    }
    ctx.globalAlpha = 1
  }

  function drawAnnotations() {
    if (phase !== 'fly' && phase !== 'intro') return
    // predicted ballistic path
    ctx.fillStyle = INK
    const d = 0.9 * px
    for (let i = 1; i <= 18; i++) {
      const t = i * 0.16
      const x = L.x + L.vx * t
      const y = L.y + FOOT_Y * 0.3 + L.vy * t + 0.5 * G * t * t
      if (y > groundY(x)) break
      ctx.globalAlpha = 0.32 * (1 - i / 19)
      ctx.fillRect(x - d, y - d, d * 2, d * 2)
    }
    ctx.globalAlpha = 1
    // velocity vector
    const sp = Math.hypot(L.vx, L.vy)
    if (sp > 1.5) {
      const len = clamp(sp * 2.4, 6, 74) * px
      const ux = L.vx / sp
      const uy = L.vy / sp
      const x0 = L.x
      const y0 = L.y - 3
      const x1 = x0 + ux * len
      const y1 = y0 + uy * len
      const ah = 5 * px
      ctx.strokeStyle = rgba(C.sky, 0.85)
      ctx.lineWidth = hair
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.moveTo(x1 - ux * ah - uy * ah * 0.45, y1 - uy * ah + ux * ah * 0.45)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 - ux * ah + uy * ah * 0.45, y1 - uy * ah - ux * ah * 0.45)
      ctx.stroke()
      if (!preview) {
        // label beside the arrow tip, on the side away from the altitude dimension (right)
        let nx = -uy
        let ny = ux
        if (nx > 0) {
          nx = -nx
          ny = -ny
        }
        lab(`${(sp * M).toFixed(1)} m/s`, x1 + nx * 9 * px, y1 + ny * 9 * px + 3 * px, { size: 8.5, color: C.sky, align: 'right' })
      }
    }
    // altitude dimension when close
    const gy = groundY(L.x)
    const alt = gy - (L.y + FOOT_Y)
    if (zoom > 1.3 && alt > 4 && alt < 90) {
      const k = clamp((zoom - 1.3) / 0.6)
      const xx = L.x + 15
      const ya = L.y + FOOT_Y
      const t = 3 * px
      ctx.globalAlpha = k
      ctx.strokeStyle = rgba(C.sage, 0.9)
      ctx.lineWidth = hair
      ctx.setLineDash([3 * px, 2.5 * px])
      ctx.beginPath()
      ctx.moveTo(xx, ya)
      ctx.lineTo(xx, gy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(xx - t, ya)
      ctx.lineTo(xx + t, ya)
      ctx.moveTo(xx - t, gy)
      ctx.lineTo(xx + t, gy)
      ctx.stroke()
      if (!preview) lab(`${(alt * M).toFixed(1)} m`, xx + 6 * px, (ya + gy) / 2 + 3 * px, { size: 8.5, color: C.sage })
      ctx.globalAlpha = 1
    }
  }

  function drawWorld(ox: number) {
    const prog = phase === 'intro' ? ease.inOutCubic(clamp(phaseT / 0.85)) : 1
    drawStars(ox, prog)
    drawTerrain(ox, prog)
    ctx.save()
    ctx.translate(ox, 0)
    if (phase === 'crashed') {
      ctx.strokeStyle = INK
      ctx.lineWidth = hair * 1.1
      ctx.lineCap = 'round'
      ctx.globalAlpha = clamp((3.4 - phaseT) / 0.6)
      debris.draw(ctx)
      ctx.globalAlpha = 1
      ctx.lineCap = 'butt'
    } else {
      const appear = phase === 'intro' ? clamp((phaseT - 0.35) / 0.4) : 1
      if (appear > 0) drawLander(L.x, L.y, L.a, L.comp, L.thr, appear, phase === 'fly' ? rotIn : 0)
    }
    drawAnnotations()
    sparks.draw(ctx, hair)
    rings.draw(ctx, hair)
    ctx.restore()
  }

  function drawEarth() {
    const r = 9 * f.s
    const cx = f.ox + (FW - 40) * f.s
    const cy = f.oy + 40 * f.s
    ctx.strokeStyle = rgba(INK, 0.7)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, TAU)
    ctx.stroke()
    // the night side, hatched, behind an elliptical terminator
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2)
    ctx.ellipse(cx, cy, r * 0.38, r, 0, Math.PI / 2, (3 * Math.PI) / 2)
    ctx.clip()
    ctx.strokeStyle = rgba(INK, 0.38)
    ctx.beginPath()
    for (let d = -r * 1.5; d < r * 1.5; d += Math.max(2, r * 0.22)) {
      ctx.moveTo(cx + d - r, cy + r)
      ctx.lineTo(cx + d + r, cy - r)
    }
    ctx.stroke()
    ctx.restore()
    if (!preview && !f.compact && fieldPx() >= 300) text(ctx, 'EARTH 384 400 km', cx, cy + r + 14, { size: 8, color: rgba(INK, 0.45), align: 'center' })
  }

  /** CSS px height of the playfield on screen */
  const fieldPx = () => f.lh * f.s

  function fuelBar(bx: number, by: number, bw: number, bh: number, ticks: boolean) {
    const frac = fuel / FUEL_MAX
    ctx.strokeStyle = rgba(INK, 0.6)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw), Math.round(bh))
    if (frac > 0) {
      ctx.strokeStyle = fuel < 150 ? (Math.sin(clock * 9) > 0 ? INK : C.sky) : C.sage
      ctx.save()
      ctx.beginPath()
      ctx.rect(bx + 1, by + 1, (bw - 1) * frac, bh)
      ctx.clip()
      ctx.beginPath()
      for (let hx = bx - bh; hx < bx + bw; hx += 2.5) {
        ctx.moveTo(hx, by + bh + 1)
        ctx.lineTo(hx + bh + 1, by)
      }
      ctx.stroke()
      ctx.restore()
    }
    if (!ticks) return
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.beginPath()
    for (let i = 1; i < 10; i++) {
      const tx2 = Math.round(bx + (bw * i) / 10) + 0.5
      ctx.moveTo(tx2, by + bh + 1)
      ctx.lineTo(tx2, by + bh + (i === 5 ? 5 : 3))
    }
    ctx.stroke()
  }

  /**
   * The readouts. Three layouts: a plate in the top-left of the field (roomy
   * screens), a two-line strip (short screens), or a column in the right-hand
   * margin when the HUD sits beside the field (wide, short screens).
   */
  function drawInstruments() {
    const alt = Math.max(0, groundY(L.x) - (L.y + FOOT_Y))
    const live = phase === 'fly' || phase === 'intro'
    const vs = live ? L.vy : 0
    const hs = live ? L.vx : 0
    const altS = `${(alt * M).toFixed(1).padStart(5, '0')} m`
    const hsS = `${hs >= 0 ? '+' : '−'}${Math.abs(hs * M).toFixed(1).padStart(4, '0')} m/s`
    const vsS = `${vs >= 0 ? '−' : '+'}${Math.abs(vs * M).toFixed(1).padStart(4, '0')} m/s`
    const attS = `${String(Math.round((Math.abs(L.a) * 180) / Math.PI)).padStart(2, '0')}°`
    const hsOk = Math.abs(hs) <= HS_MAX
    const vsOk = vs <= VS_MAX
    const attOk = Math.abs(L.a) <= ATT_MAX
    const label = rgba(INK, 0.5)

    if (f.side) {
      // a column in the right margin, under BEST
      const x = f.ox + f.lw * f.s + 14
      let y = f.oy + 14 + 36 + 6
      const room = env.width - x - 8
      const row = (l: string, v: string, ok: boolean | null) => {
        text(ctx, l, x, y, { size: 8, color: label, tracking: 0.14 })
        text(ctx, v, x + 30, y, { size: 10, color: ok === false || ok === null ? INK : C.sage, tracking: 0.04 })
        y += 14
      }
      row('ALT', altS, null)
      row('HS', hsS, hsOk)
      row('VS', vsS, vsOk)
      if (f.oy + f.lh * f.s - y > 34) row('ATT', attS, attOk)
      text(ctx, 'FUEL', x, y, { size: 8, color: label, tracking: 0.14 })
      fuelBar(x + 30, y - 7, Math.max(30, Math.min(84, room - 34)), 6, false)
      return
    }

    if (preview || f.compact || fieldPx() < 300) {
      // two lines, condensed
      const k = preview ? 0.8 : 0.9
      const x = f.ox + 10
      const y = f.oy + 15
      const colW = 104 * k
      const pw = Math.min(f.lw * f.s - 2, colW * 2 + 18)
      const two = pw >= colW * 2
      ctx.fillStyle = 'rgba(11,29,36,0.82)'
      ctx.fillRect(f.ox + 1, f.oy + 1, pw, 36 * k)
      const pair = (l: string, v: string, ok: boolean | null, px2: number, py: number) => {
        text(ctx, l, px2, py, { size: 7.5 * k, color: label, tracking: 0.14 })
        text(ctx, v, px2 + 24 * k, py, { size: 9.5 * k, color: ok === false || ok === null ? INK : C.sage, tracking: 0.04 })
      }
      pair('ALT', altS, null, x, y)
      if (two) pair('VS', vsS, vsOk, x + colW, y)
      if (two) pair('HS', hsS, hsOk, x, y + 14 * k)
      else pair('VS', vsS, vsOk, x, y + 14 * k)
      const fx = x + (two ? colW : 0)
      if (two) {
        text(ctx, 'FUEL', fx, y + 14 * k, { size: 7.5 * k, color: label, tracking: 0.14 })
        fuelBar(fx + 24 * k, y + 14 * k - 6, 60 * k, 5, false)
      }
      return
    }

    const x = f.ox + 14
    let y = f.oy + 22
    // an instrument plate, so the ridge can pass behind the readouts
    const pw = 190
    const ph = 5 * 15 + 12
    ctx.fillStyle = 'rgba(11,29,36,0.82)'
    ctx.fillRect(f.ox + 1, f.oy + 1, pw, ph)
    ctx.strokeStyle = rgba(INK, 0.16)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(f.ox + pw) + 0.5, f.oy + 1)
    ctx.lineTo(Math.round(f.ox + pw) + 0.5, Math.round(f.oy + ph) + 0.5)
    ctx.lineTo(f.ox + 1, Math.round(f.oy + ph) + 0.5)
    ctx.stroke()
    const row = (l: string, value: string, ok: boolean | null, arrow = '') => {
      text(ctx, l, x, y, { size: 8, color: label, tracking: 0.14 })
      text(ctx, value, x + 34, y, { size: 10.5, color: ok === null ? INK : ok ? C.sage : INK, tracking: 0.04 })
      if (arrow) text(ctx, arrow, x + 112, y, { size: 10, color: ok ? C.sage : rgba(INK, 0.7) })
      y += 15
    }
    row('ALT', altS, null)
    row('HS', hsS, hsOk, Math.abs(hs) < 0.5 ? '·' : hs > 0 ? '→' : '←')
    row('VS', vsS, vsOk, Math.abs(vs) < 0.5 ? '·' : vs > 0 ? '↓' : '↑')
    row('ATT', attS, attOk)
    text(ctx, 'FUEL', x, y, { size: 8, color: label, tracking: 0.14 })
    fuelBar(x + 34, y - 7, 104, 6, true)
    text(ctx, String(Math.round(fuel)).padStart(4, '0'), x + 34 + 104 + 8, y, { size: 10.5, color: INK, tracking: 0.04 })
  }

  /** the landing points counted up so far */
  const tallyCount = () => Math.round(result.points * clamp((phaseT - 0.9) / 0.9))

  function drawTally(dt: number) {
    if (state === 'title' || state === 'over') return
    if (preview && phase !== 'intro') {
      if (phase === 'landed' || phase === 'crashed') {
        const a = clamp(phaseT / 0.3) * clamp((3.4 - phaseT) / 0.4)
        text(ctx, phase === 'landed' ? `+${result.points}` : 'FAILURE', f.ox + (f.lw * f.s) / 2, f.oy + f.lh * f.s * 0.3, { size: 10, color: phase === 'landed' ? C.sage : INK, align: 'center', alpha: a })
      }
      return
    }
    const cx = f.ox + (f.lw * f.s) / 2
    // short screens: smaller type, tighter leading, a little lower (clear of the readouts)
    const ts = clamp(fieldPx() / 360, 0.62, 1)
    let y = f.oy + fieldPx() * (ts < 0.8 ? 0.3 : 0.24)
    if (phase === 'intro') {
      const a = clamp(phaseT / 0.2) * clamp((0.9 - phaseT) / 0.25 + 0.6)
      text(ctx, `ROUND ${String(round).padStart(2, '0')}`, cx, y, { size: 11 * Math.max(0.85, ts), color: INK, align: 'center', tracking: 0.3, alpha: a })
      if (ts > 0.7) text(ctx, `FUEL ${String(Math.round(fuel)).padStart(4, '0')} · PADS ×2 ×3 ×5`, cx, y + 18 * ts, { size: 9, color: rgba(INK, 0.55), align: 'center', alpha: a })
      return
    }
    if (phase !== 'landed' && phase !== 'crashed') return
    const fade = clamp((3.6 - phaseT) / 0.4)
    const ok = phase === 'landed'
    const line = (s: string, at: number, o: TextOpts) => {
      const a = clamp((phaseT - at) / 0.25) * fade
      if (a > 0) text(ctx, s, cx, y + (1 - ease.outCubic(clamp((phaseT - at) / 0.25))) * 6, { ...o, align: 'center', alpha: a })
    }
    line(result.title, 0.1, { font: 'serif', size: 26 * ts, italic: true, color: ok ? C.sage : INK })
    y += 22 * ts
    line(result.detail.toUpperCase(), 0.45, { size: ts < 0.8 ? 8 : 9, color: rgba(INK, 0.7), tracking: 0.14 })
    y += 22 * ts
    if (ok) {
      const cnt = tallyCount()
      if (phaseT > 0.9 && phaseT < 1.85) {
        tallyTick -= dt
        if (tallyTick <= 0) {
          tallyTick = 0.05
          sfx.tone(1568, 0.025, { type: 'sine', gain: 0.025 })
        }
      }
      line(`${result.base} × ${result.mult} = ${String(cnt).padStart(3, '0')}`, 0.85, { size: 13 * Math.max(0.8, ts), color: INK, tracking: 0.08 })
      y += 18 * ts
      if (result.fuelBonus > 0) line(`FUEL +${result.fuelBonus}`, 1.9, { size: 9, color: C.sage, tracking: 0.14 })
    } else {
      line(`FUEL −${-result.fuelBonus}`, 0.9, { size: 11 * Math.max(0.8, ts), color: C.sky, tracking: 0.14 })
      y += 16 * ts
      if (fuel <= 0) line('TANK EMPTY', 1.4, { size: 9, color: rgba(INK, 0.6), tracking: 0.14 })
    }
  }

  /** world → CSS px, through the current camera */
  function toScreen(x: number, y: number) {
    return {
      x: f.ox + (wrapD(x - camX) * zoom + FW / 2) * f.s,
      y: f.oy + ((y - camY) * zoom + FH / 2) * f.s,
    }
  }

  function updateHints(dt: number) {
    if (state !== 'play' || forceBot || phase !== 'fly') return
    hintT += dt
    if (hint === 0 && (thrustAcc > 0.5 || hintT > 8)) {
      hint = 1
      hintT = 0
    } else if (hint === 1 && (rotAcc > 0.3 || hintT > 8)) {
      hint = 2
      env.store.set('hinted', '1')
    }
  }

  /** ghost demonstrations for a first flight, then advice near the ground */
  function drawHints() {
    if (state !== 'play' || forceBot || phase !== 'fly') return
    const p = toScreen(L.x, L.y)
    const u = zoom * f.s // px per world unit
    const left = f.ox + 40
    const right = f.ox + f.lw * f.s - 40
    const cx = clamp(p.x, left, right)
    ctx.lineWidth = 1
    if (hint === 0) {
      // the plume, as a dashed ghost that pulses: hold to burn
      const a = clamp(hintT / 0.4)
      ctx.globalAlpha = a * (0.45 + 0.55 * Math.sin(clock * 5) ** 2)
      ctx.strokeStyle = C.sage
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const yy = p.y + (3.4 + i * 2.4) * u
        const w = (2.5 - i * 0.45) * u
        ctx.moveTo(p.x - w, yy)
        ctx.lineTo(p.x + w, yy)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = a
      text(ctx, 'HOLD THRUST', cx, p.y + 16 * u + 14, { size: 9, color: C.sage, align: 'center', tracking: 0.2 })
      ctx.globalAlpha = 1
      return
    }
    if (hint === 1) {
      // a dotted arc over the cabin, a dot swinging along it
      const a = clamp(hintT / 0.4)
      const r = 17 * u
      ctx.globalAlpha = a
      ctx.strokeStyle = C.sage
      ctx.setLineDash([1.5, 3])
      ctx.beginPath()
      ctx.arc(p.x, p.y - 4 * u, r, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9)
      ctx.stroke()
      ctx.setLineDash([])
      const sw = -Math.PI / 2 + Math.sin(clock * 2.6) * 0.85
      ctx.fillStyle = C.sage
      ctx.beginPath()
      ctx.arc(p.x + Math.cos(sw) * r, p.y - 4 * u + Math.sin(sw) * r, 2, 0, TAU)
      ctx.fill()
      text(ctx, 'ROTATE TO STEER', cx, p.y - 4 * u - r - 9, { size: 9, color: C.sage, align: 'center', tracking: 0.2 })
      ctx.globalAlpha = 1
      return
    }
    // advice in the moment, close to the ground
    const alt = groundY(L.x) - (L.y + FOOT_Y)
    if (alt > 46 || alt < 1) return
    const pad = padUnder(L.x - 9.2, L.x + 9.2)
    let msg = ''
    let good = false
    if (!pad) msg = 'NO PAD BELOW'
    else if (L.vy > VS_MAX) msg = 'TOO FAST · THRUST'
    else if (Math.abs(L.vx) > HS_MAX) msg = 'DRIFTING · LEAN AGAINST IT'
    else if (Math.abs(L.a) > ATT_MAX) msg = 'LEVEL OUT'
    else {
      msg = 'STEADY'
      good = true
    }
    const k = clamp((46 - alt) / 10)
    const blinkOn = good || Math.sin(clock * 10) > -0.5
    if (blinkOn) text(ctx, msg, cx, p.y - 17 * u - 10, { size: 9, color: good ? C.sage : C.sky, align: 'center', tracking: 0.18, alpha: k })
  }

  /** while a finger or button holds a zone, name it */
  function drawZones() {
    if (state !== 'play' || forceBot || !ptrs.size) return
    const w = env.width
    const y = f.oy + f.lh * f.s - 12
    const held = new Set(ptrs.values())
    ctx.strokeStyle = rgba(INK, 0.14)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const gx of [w / 3, (2 * w) / 3]) {
      ctx.moveTo(Math.round(gx) + 0.5, f.oy + 24)
      ctx.lineTo(Math.round(gx) + 0.5, f.oy + f.lh * f.s - 24)
    }
    ctx.stroke()
    const z = (name: 'left' | 'mid' | 'right', label: string, x: number) =>
      text(ctx, label, x, y, { size: 9, color: held.has(name) ? C.sage : rgba(INK, 0.4), align: 'center', tracking: 0.16 })
    z('left', '◂ ROTATE', w / 6)
    z('mid', 'THRUST', w / 2)
    z('right', 'ROTATE ▸', (5 * w) / 6)
  }

  /* ---------------------------------------------------------- lifecycle */

  newSession()
  const ps = env.params.get('state')
  if (env.mode === 'full') {
    if (ps === 'play') go('play')
    else if (ps === 'over') {
      state = 'over'
      shown = 2350
    }
  }

  function zoneOf(x: number): 'left' | 'mid' | 'right' {
    return x < env.width / 3 ? 'left' : x > (env.width * 2) / 3 ? 'right' : 'mid'
  }

  return {
    resize(w, h) {
      portrait = h > w * 1.2
      FW = portrait ? 300 : 480
      FH = portrait ? 520 : 360
      f = gameFit(w, h, env.mode, FW, FH)
    },
    key(code, down) {
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', ...START_KEYS])
    },
    pointer(p) {
      if (p.type === 'down') {
        if (state !== 'play') {
          tapStart = true
          return
        }
        ptrs.set(p.id, zoneOf(p.x))
      } else if (p.type === 'move') {
        if (ptrs.has(p.id)) ptrs.set(p.id, zoneOf(p.x))
      } else ptrs.delete(p.id)
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || tapStart
      tapStart = false
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        ptrs.clear()
      }

      if (dt > 0) {
        const bot = state !== 'play' || forceBot
        const n = Math.max(1, Math.ceil(dt / 0.01))
        for (let i = 0; i < n; i++) step(dt / n, bot)
        sparks.update(dt, G * 1.2, 2.2)
        rings.update(dt)
      }
      shake *= Math.exp(-6 * dt)

      // camera: close in near the ground
      const alt = groundY(L.x) - (L.y + FOOT_Y)
      const zPrev = zoomWant
      if (phase === 'fly') {
        if (alt < 64) zoomWant = ZOOM
        else if (alt > 100) zoomWant = 1
      } else if (phase === 'intro') zoomWant = 1
      zoom += (zoomWant - zoom) * damp(2.6, dt)
      if (zPrev !== zoomWant && zoomWant > 1) sfx.tone(587, 0.3, { type: 'sine', gain: 0.02 })
      const zk = (zoom - 1) / (ZOOM - 1)
      const viewH = FH / zoom
      const focusY = L.y + Math.min(Math.max(alt, 0), 60) * 0.45
      const floorY = LH + (portrait ? 14 : 0)
      const wideX = portrait ? L.x : WW / 2
      const wideY = floorY - FH / 2
      camX = wideX + wrapD(L.x - wideX) * zk
      camY = lerp(wideY, clamp(focusY, viewH / 2 + wideY - FH / 2, floorY + 30 - viewH / 2), zk)

      // nearest pad, for the highlight
      nearPad = null
      if (state === 'play' && !forceBot && phase === 'fly') {
        let best = 1e9
        for (const p of pads) {
          const d = Math.abs(wrapD((p.x0 + p.x1) / 2 - L.x))
          if (d < best && d < 60) {
            best = d
            nearPad = p
          }
        }
      }

      // --- draw
      ground(ctx, env.width, env.height, 'night')
      gameFrame(ctx, f, { ground: 'night', caption: CAPTION })
      drawEarth()
      ctx.save()
      ctx.beginPath()
      ctx.rect(f.ox, f.oy, f.lw * f.s, f.lh * f.s)
      ctx.clip()
      enterFit(ctx, f)
      if (shake > 0.05) ctx.translate((V() - 0.5) * shake, (V() - 0.5) * shake)
      ctx.translate(FW / 2, FH / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-camX, -camY)
      hair = 1 / (f.s * zoom)
      px = hair
      const half = FW / 2 / zoom
      for (const k of [-2, -1, 0, 1, 2]) {
        const ox = k * WW
        if (camX + half <= ox || camX - half >= ox + WW) continue
        drawWorld(ox)
      }
      ctx.restore()
      ctx.restore()
      drawInstruments()
      drawTally(dt)
      updateHints(dt)
      drawHints()
      drawZones()
      if (env.mode === 'full') env.setCursor(state === 'play' && forceBot ? 'default' : 'pointer')

      const mm = Math.floor(clock / 60)
      const ss = Math.floor(clock % 60)
      gameHud(
        ctx,
        f,
        env.mode,
        [
          { label: 'Score', value: fmtScore(state === 'over' ? shown : phase === 'landed' ? score - result.points + tallyCount() : score, 5) },
          { label: 'Time', value: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` },
          { label: 'Round', value: String(round).padStart(2, '0') },
        ],
        [{ label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0), 5) }],
        'night',
      )

      const cx = f.ox
      const cy = f.oy
      const cw = f.lw * f.s
      const ch = f.lh * f.s
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, {
          ground: 'night',
          kicker: KICKER,
          title: 'Soft',
          titleEm: 'touchdown',
          lines: cw < 380 ? [`VS ≤ ${(VS_MAX * M).toFixed(1)} · HS ≤ ${(HS_MAX * M).toFixed(1)} m/s · level`] : ['← → rotate · ↑ or Space thrust', `Land level · VS ≤ ${(VS_MAX * M).toFixed(1)} m/s · HS ≤ ${(HS_MAX * M).toFixed(1)} m/s`, 'Touch: the pad, or hold the sides and middle'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          ground: 'night',
          kicker: newRecord ? 'New best' : 'Tank empty · game over',
          title: fmtScore(shown, 5),
          lines: [`Best ${fmtScore(Math.max(hi.get(), shown), 5)}`],
          prompt: 'Press Enter · Tap to fly again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
    },
  }
}

export default create
