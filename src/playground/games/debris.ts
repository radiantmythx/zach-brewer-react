/*
 * DEBRIS — after Asteroids (Atari, 1979).
 *
 * A hairline dart in a field of drifting rock, drawn like a survey plate:
 * irregular outlines with crack strokes and a patch of hatching, a velocity
 * vector annotated on the ship, and the bot's targeting brackets shown in
 * attract mode. Rotation with a little inertia, thrust, drag, screen wrap,
 * hyperspace; rocks split large → medium → small; a saucer drops in and
 * fires. Waves grow denser and quicker; the heartbeat quickens with them.
 *
 * Portrait screens get a taller field (the wrap works at any aspect).
 */

import { angleDiff, C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, mod, rgba, rng, Rings, Sparks, START_KEYS, TAU, text, Touch } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

const CAPTION = 'FIG. G.03 — AFTER ASTEROIDS, 1979'
const KICKER = 'After Asteroids · Atari, 1979'

type State = 'attract' | 'title' | 'play' | 'over'

const RADII = [30, 16, 8.5]
const SPEEDS = [24, 44, 70]
const POINTS = [20, 50, 100]
const ROT_MAX = 4.7
const THRUST = 215
const MAX_V = 240
const DRAG = 0.5
const BULLET_V = 390
const BULLET_LIFE = 0.92
const MAX_BULLETS = 5
const SHIP_R = 4.2 // collision radius — deliberately smaller than the drawing
const HYPER = 0.62
const BORN = 0.55 // rocks draw themselves on, harmless, for this long

interface Rock {
  x: number
  y: number
  vx: number
  vy: number
  a: number
  va: number
  size: number
  r: number
  pts: Float32Array
  marks: Float32Array
  hatch: Float32Array
  age: number
  dead: boolean
}

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  enemy: boolean
}

interface Saucer {
  x: number
  y: number
  vx: number
  vy: number
  small: boolean
  r: number
  fire: number
  turn: number
  age: number
  beat: number
}

interface Popup {
  x: number
  y: number
  s: string
  t: number
}

/** Tumbling line fragments (a shattered outline), typed arrays, wrapped to the field. */
class Frags {
  private x: Float32Array
  private y: Float32Array
  private vx: Float32Array
  private vy: Float32Array
  private a: Float32Array
  private va: Float32Array
  private len: Float32Array
  private life: Float32Array
  private max: Float32Array
  private col: string[]
  private n = 0
  private cap: number
  constructor(cap: number) {
    this.cap = cap
    this.x = new Float32Array(cap)
    this.y = new Float32Array(cap)
    this.vx = new Float32Array(cap)
    this.vy = new Float32Array(cap)
    this.a = new Float32Array(cap)
    this.va = new Float32Array(cap)
    this.len = new Float32Array(cap)
    this.life = new Float32Array(cap)
    this.max = new Float32Array(cap)
    this.col = new Array(cap).fill(C.ink)
  }
  /** a segment from (x1,y1) to (x2,y2), flung with (vx, vy) and spin va */
  add(x1: number, y1: number, x2: number, y2: number, vx: number, vy: number, va: number, life: number, col: string) {
    const i = this.n < this.cap ? this.n++ : 0
    this.x[i] = (x1 + x2) / 2
    this.y[i] = (y1 + y2) / 2
    this.a[i] = Math.atan2(y2 - y1, x2 - x1)
    this.len[i] = Math.hypot(x2 - x1, y2 - y1)
    this.vx[i] = vx
    this.vy[i] = vy
    this.va[i] = va
    this.life[i] = this.max[i] = life
    this.col[i] = col
  }
  update(dt: number, W: number, H: number) {
    const k = Math.exp(-0.9 * dt)
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt
      if (this.life[i] <= 0) {
        const j = --this.n
        this.x[i] = this.x[j]
        this.y[i] = this.y[j]
        this.vx[i] = this.vx[j]
        this.vy[i] = this.vy[j]
        this.a[i] = this.a[j]
        this.va[i] = this.va[j]
        this.len[i] = this.len[j]
        this.life[i] = this.life[j]
        this.max[i] = this.max[j]
        this.col[i] = this.col[j]
        i--
        continue
      }
      this.vx[i] *= k
      this.vy[i] *= k
      this.x[i] = mod(this.x[i] + this.vx[i] * dt, W)
      this.y[i] = mod(this.y[i] + this.vy[i] * dt, H)
      this.a[i] += this.va[i] * dt
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.n; i++) {
      const k = this.life[i] / this.max[i]
      const h = (this.len[i] / 2) * (0.6 + 0.4 * k)
      const c = Math.cos(this.a[i]) * h
      const s = Math.sin(this.a[i]) * h
      ctx.globalAlpha = Math.min(1, k * 1.6)
      ctx.strokeStyle = this.col[i]
      ctx.beginPath()
      ctx.moveTo(this.x[i] - c, this.y[i] - s)
      ctx.lineTo(this.x[i] + c, this.y[i] + s)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  clear() {
    this.n = 0
  }
}

/** Shortest signed delta on a wrapped axis. */
const wrapD = (d: number, L: number) => d - L * Math.round(d / L)

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 160 : 420)
  const rings = new Rings()
  const frags = new Frags(preview ? 60 : 160)
  const R = rng(1979)
  const V = rng(42) // visual-only randomness (flicker, shake)
  const forceBot = env.params.get('bot') === '1'
  const sfxOn = () => state === 'play'

  let W = 480
  let H = 360
  let f = gameFit(env.width, env.height, env.mode, W, H)

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  let score = 0
  let lives = 3
  let wave = 0
  let nextLife = 10000
  let waveT = 0
  let clearT = -1
  let deadT = 0
  let combo = 0
  let comboT = 0
  let shake = 0
  let newRecord = false
  let shown = 0 // score shown on the over card

  const ship = { x: 240, y: 180, vx: 0, vy: 0, a: -Math.PI / 2, va: 0, alive: false, inv: 0, wait: 0, hyper: 0, hx: 0, hy: 0, flame: 0, fireCd: 0, autoCd: 0, hyperCd: 0, born: 0, thrustSnd: 0 }
  let rocks: Rock[] = []
  let bullets: Bullet[] = []
  let saucer: Saucer | null = null
  let saucerT = 18
  let popups: Popup[] = []
  let beatT = 1
  let beatFlip = false
  // a plotted trajectory: the ship's recent positions as fading points
  const TRAIL = 22
  const trail = new Float32Array(TRAIL * 3)
  let trailHead = 0
  let trailT = 0
  let simT = 0

  // bot overlay (what the "AI" is looking at)
  let botTarget: { x: number; y: number; r: number } | null = null
  let botAim: { x: number; y: number } | null = null
  let botFireCd = 0

  // pointer: left half is a stick, right half fires
  interface Ptr {
    side: 'stick' | 'fire'
    sx: number
    sy: number
    x: number
    y: number
  }
  const ptrs = new Map<number, Ptr>()
  let fireQueued = false
  let hoverX = -1
  let hoverIn = false

  // first-play hints (full mode, once per browser): turn → fire → thrust; then a
  // contextual JUMP prompt the first few times a rock is about to hit
  const HINTS = env.mode === 'full' && env.store.get('hinted') !== '1'
  let hint = HINTS ? 0 : 3
  let hintT = 0
  let turnAcc = 0
  let thrustAcc = 0
  let firstHit = false
  let usedJump = false
  let jumpPrompts = 0
  let jumpT = 0

  /* ------------------------------------------------------------ helpers */

  const sfx = {
    tone: (freq: number, dur: number, o?: Parameters<typeof env.sfx.tone>[2]) => sfxOn() && env.sfx.tone(freq, dur, o),
    noise: (dur: number, o?: Parameters<typeof env.sfx.noise>[1]) => sfxOn() && env.sfx.noise(dur, o),
  }

  function layout(w: number, h: number) {
    // the wrap works at any aspect: tall, square-ish or wide fields
    const ar = h / w
    const nw = ar > 1.25 ? 360 : ar > 0.92 ? 420 : 480
    const nh = ar > 1.25 ? 540 : ar > 0.92 ? 420 : 360
    if (nw !== W || nh !== H) {
      const kx = nw / W
      const ky = nh / H
      for (const rk of rocks) {
        rk.x *= kx
        rk.y *= ky
      }
      for (const b of bullets) {
        b.x *= kx
        b.y *= ky
      }
      ship.x *= kx
      ship.y *= ky
      if (saucer) {
        saucer.x *= kx
        saucer.y *= ky
      }
      W = nw
      H = nh
    }
    f = gameFit(w, h, env.mode, W, H)
  }

  function makeRock(x: number, y: number, size: number, vx: number, vy: number): Rock {
    const r = RADII[size]
    const n = [13, 10, 8][size]
    const pts = new Float32Array(n * 2)
    const notch = Math.floor(R() * n)
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + (R() - 0.5) * (TAU / n) * 0.6
      // one vertex pulled in gives each rock a bite of character
      const rad = r * (i === notch ? 0.62 + R() * 0.08 : 0.8 + R() * 0.26)
      pts[i * 2] = Math.cos(ang) * rad
      pts[i * 2 + 1] = Math.sin(ang) * rad
    }
    // crack strokes: from an edge vertex, kinking inward
    const segs: number[] = []
    const nc = size === 2 ? 1 : 2
    for (let c = 0; c < nc; c++) {
      const vi = Math.floor(R() * n)
      const x0 = pts[vi * 2] * 0.97
      const y0 = pts[vi * 2 + 1] * 0.97
      let px = x0
      let py = y0
      const steps = size === 0 ? 3 : 2
      for (let s = 1; s <= steps; s++) {
        const k = 1 - s * (size === 0 ? 0.21 : 0.27)
        const nx = x0 * k + (R() - 0.5) * r * 0.22
        const ny = y0 * k + (R() - 0.5) * r * 0.22
        segs.push(px, py, nx, ny)
        px = nx
        py = ny
      }
      if (size === 0) segs.push(px, py, px + (R() - 0.5) * r * 0.3, py + (R() - 0.5) * r * 0.3)
    }
    // a patch of hatching
    const hat: number[] = []
    if (size < 2) {
      const ha = R() * TAU
      const hd = r * 0.3
      const hx = Math.cos(ha) * hd
      const hy = Math.sin(ha) * hd
      const ang = R() * Math.PI
      const ux = Math.cos(ang)
      const uy = Math.sin(ang)
      const m = size === 0 ? 5 : 3
      const gap = r * (size === 0 ? 0.085 : 0.11)
      for (let i = 0; i < m; i++) {
        const o = (i - (m - 1) / 2) * gap
        const L = r * 0.17 * (1 - (Math.abs(i - (m - 1) / 2) / m) * 0.7)
        hat.push(hx - uy * o - ux * L, hy + ux * o - uy * L, hx - uy * o + ux * L, hy + ux * o + uy * L)
      }
    }
    return { x, y, vx, vy, a: R() * TAU, va: (R() - 0.5) * (size === 0 ? 0.9 : size === 1 ? 1.6 : 2.6), size, r, pts, marks: new Float32Array(segs), hatch: new Float32Array(hat), age: 0, dead: false }
  }

  const speedMul = () => 1 + Math.min(0.75, (wave - 1) * 0.07)

  function startWave(n: number) {
    wave = n
    waveT = 0
    clearT = -1
    const count = Math.min(11, 3 + n)
    for (let i = 0; i < count; i++) {
      let x = 0
      let y = 0
      for (let tries = 0; tries < 12; tries++) {
        const side = Math.floor(R() * 4)
        const u = R()
        x = side === 0 ? u * W : side === 1 ? W - 8 : side === 2 ? u * W : 8
        y = side === 0 ? 8 : side === 1 ? u * H : side === 2 ? H - 8 : u * H
        if (Math.hypot(wrapD(x - ship.x, W), wrapD(y - ship.y, H)) > 130) break
      }
      const a = R() * TAU
      const s = SPEEDS[0] * speedMul() * (0.7 + R() * 0.5)
      const rk = makeRock(x, y, 0, Math.cos(a) * s, Math.sin(a) * s)
      rk.age = -i * 0.08 // stagger the draw-on
      rocks.push(rk)
    }
    if (n === 1) saucerT = 10 + R() * 3
    beatT = 1
  }

  function spawnShip() {
    ship.x = W / 2
    ship.y = H / 2
    ship.vx = ship.vy = 0
    ship.a = -Math.PI / 2
    ship.va = 0
    ship.alive = true
    ship.inv = 2.2
    ship.hyper = 0
    ship.born = 0
    ship.flame = 0
    rings.add(ship.x, ship.y, 22, 0.6, C.ink2)
  }

  function newGame() {
    score = 0
    lives = 3
    nextLife = 10000
    rocks = []
    bullets = []
    saucer = null
    popups = []
    combo = 0
    deadT = 0
    sparks.clear()
    rings.clear()
    frags.clear()
    ptrs.clear()
    spawnShip()
    startWave(1)
  }

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') newGame()
    if (next === 'over') {
      shown = score
      newRecord = hi.submit(score)
    }
  }

  function addScore(n: number, x: number, y: number) {
    score += n
    if (!preview) popups.push({ x, y, s: `+${n}`, t: 0 })
    if (score >= nextLife) {
      nextLife += 10000
      lives++
      popups.push({ x: ship.x, y: ship.y - 16, s: '+1 SHIP', t: 0 })
      ;[784, 988, 1175].forEach((fr, i) => sfx.tone(fr, 0.16, { type: 'triangle', gain: 0.06, when: i * 0.08 }))
    }
  }

  function shatterOutline(cx: number, cy: number, pts: ArrayLike<number>, a: number, vx: number, vy: number, speed: number, col: string, every = 1) {
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const n = pts.length / 2
    for (let i = 0; i < n; i += every) {
      const j = (i + 1) % n
      const x1 = cx + ca * pts[i * 2] - sa * pts[i * 2 + 1]
      const y1 = cy + sa * pts[i * 2] + ca * pts[i * 2 + 1]
      const x2 = cx + ca * pts[j * 2] - sa * pts[j * 2 + 1]
      const y2 = cy + sa * pts[j * 2] + ca * pts[j * 2 + 1]
      const mx = (x1 + x2) / 2 - cx
      const my = (y1 + y2) / 2 - cy
      const ml = Math.hypot(mx, my) || 1
      const s = speed * (0.5 + V())
      frags.add(x1, y1, x2, y2, vx + (mx / ml) * s, vy + (my / ml) * s, (V() - 0.5) * 7, 0.7 + V() * 0.6, col)
    }
  }

  function splitRock(rk: Rock, bx: number, by: number, player: boolean) {
    if (rk.dead) return
    rk.dead = true
    const sz = rk.size
    sparks.emit(rk.x, rk.y, preview ? [8, 6, 4][sz] : [18, 12, 8][sz], { speed: [150, 130, 110][sz], life: 0.55, color: C.ink })
    rings.add(rk.x, rk.y, rk.r * 1.7, 0.5, rgba(C.ink, 0.6), rk.r * 0.6)
    shatterOutline(rk.x, rk.y, rk.pts, rk.a, rk.vx * 0.5, rk.vy * 0.5, sz === 2 ? 34 : 26, C.ink, sz === 2 ? 1 : 3)
    if (sz < 2) {
      const base = Math.atan2(by, bx)
      const sp = SPEEDS[sz + 1] * speedMul()
      for (const side of [-1, 1]) {
        const a = base + side * (0.55 + R() * 0.7)
        const s = sp * (0.8 + R() * 0.45)
        const child = makeRock(rk.x + Math.cos(a) * rk.r * 0.35, rk.y + Math.sin(a) * rk.r * 0.35, sz + 1, rk.vx * 0.45 + Math.cos(a) * s, rk.vy * 0.45 + Math.sin(a) * s)
        child.age = BORN // children arrive solid
        rocks.push(child)
      }
    }
    shake = Math.max(shake, [2.2, 1.2, 0.6][sz])
    sfx.noise([0.42, 0.3, 0.2][sz], { filter: [170, 280, 520][sz], to: [70, 120, 220][sz], gain: [0.22, 0.17, 0.13][sz], q: 0.7 })
    if (player) {
      if (state === 'play') firstHit = true
      combo++
      comboT = 0.6
      addScore(POINTS[sz], rk.x, rk.y - rk.r - 4)
      if (sz === 2) sfx.tone([523, 587, 659, 784, 880, 1047][Math.min(5, combo - 1)], 0.12, { type: 'triangle', gain: 0.035 })
    }
  }

  function killShip() {
    if (!ship.alive) return
    ship.alive = false
    ship.wait = 1.6
    lives--
    deadT = 0
    const pts = [13, 0, -9, 7.2, -5.6, 0, -9, -7.2]
    shatterOutline(ship.x, ship.y, pts, ship.a, ship.vx * 0.4, ship.vy * 0.4, 30, C.ink)
    sparks.emit(ship.x, ship.y, preview ? 12 : 30, { speed: 190, life: 0.8, color: C.ink })
    sparks.emit(ship.x, ship.y, preview ? 4 : 10, { speed: 120, life: 0.6, color: C.moss })
    rings.add(ship.x, ship.y, 34, 0.7, C.ink)
    rings.add(ship.x, ship.y, 18, 0.45, C.moss)
    shake = 4.5
    sfx.noise(0.9, { filter: 240, to: 55, gain: 0.3 })
    sfx.tone(220, 0.6, { type: 'sine', to: 55, gain: 0.07 })
  }

  function killSaucer(player: boolean) {
    if (!saucer) return
    const s = saucer
    sparks.emit(s.x, s.y, preview ? 10 : 22, { speed: 170, life: 0.7, color: C.ocean })
    rings.add(s.x, s.y, s.r * 3, 0.6, C.ocean)
    shatterOutline(s.x, s.y, saucerPts(s.r), 0, s.vx * 0.3, s.vy * 0.3, 30, C.ocean)
    if (player) addScore(s.small ? 1000 : 200, s.x, s.y - s.r - 4)
    shake = Math.max(shake, 2.5)
    sfx.noise(0.5, { filter: 400, to: 120, gain: 0.2 })
    if (player) [659, 880, 1319].forEach((fr, i) => sfx.tone(fr, 0.14, { type: 'triangle', gain: 0.045, when: i * 0.06 }))
    saucer = null
  }

  const saucerPts = (r: number) => [-r, 0, -r * 0.45, -r * 0.4, r * 0.45, -r * 0.4, r, 0, r * 0.45, r * 0.4, -r * 0.45, r * 0.4]

  function spawnSaucer() {
    const smallChance = clamp((score - 6000) / 20000 + (wave - 2) * 0.12, 0, 0.75)
    const small = R() < smallChance
    const fromLeft = R() < 0.5
    const v = (small ? 78 : 58) * (1 + Math.min(0.4, wave * 0.03))
    saucer = { x: fromLeft ? -12 : W + 12, y: H * (0.18 + R() * 0.64), vx: fromLeft ? v : -v, vy: 0, small, r: small ? 7.5 : 12.5, fire: 1.1, turn: 1.2, age: 0, beat: 0 }
  }

  function fire(enemyFrom?: Saucer, aim?: number) {
    if (enemyFrom) {
      const a = aim ?? 0
      bullets.push({ x: enemyFrom.x + Math.cos(a) * enemyFrom.r, y: enemyFrom.y + Math.sin(a) * enemyFrom.r, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 1.15, enemy: true })
      sfx.tone(392, 0.08, { type: 'square', gain: 0.018, to: 330, filter: 1400 })
      return
    }
    let mine = 0
    for (const b of bullets) if (!b.enemy) mine++
    if (mine >= MAX_BULLETS) return
    const ca = Math.cos(ship.a)
    const sa = Math.sin(ship.a)
    bullets.push({ x: ship.x + ca * 12, y: ship.y + sa * 12, vx: ship.vx + ca * BULLET_V, vy: ship.vy + sa * BULLET_V, life: BULLET_LIFE, enemy: false })
    ship.fireCd = 0.12
    ship.autoCd = 0.22
    sfx.tone(1175, 0.07, { type: 'triangle', to: 587, gain: 0.04, room: 0.08 })
  }

  /* ---------------------------------------------------------------- bot */

  interface Input {
    rot: number
    thrust: boolean
    fire: boolean
    held: boolean
    hyper: boolean
  }

  function botThink(dt: number): Input {
    const inp: Input = { rot: 0, thrust: false, fire: false, held: false, hyper: false }
    botTarget = null
    botAim = null
    botFireCd -= dt
    if (!ship.alive || ship.hyper > 0) return inp
    const hx = Math.cos(ship.a)
    const hy = Math.sin(ship.a)
    let danger: { dx: number; dy: number; tca: number; miss: number } | null = null
    let best: { x: number; y: number; r: number; dx: number; dy: number; rvx: number; rvy: number } | null = null
    let bestScore = Infinity

    const consider = (x: number, y: number, vx: number, vy: number, r: number, bias: number, shootable: boolean) => {
      const dx = wrapD(x - ship.x, W)
      const dy = wrapD(y - ship.y, H)
      const rvx = vx - ship.vx
      const rvy = vy - ship.vy
      const d = Math.hypot(dx, dy)
      const rv2 = rvx * rvx + rvy * rvy || 1e-6
      const tca = -(dx * rvx + dy * rvy) / rv2
      if (tca > 0 && tca < 1.3) {
        const mx = dx + rvx * tca
        const my = dy + rvy * tca
        const miss = Math.hypot(mx, my) - r - SHIP_R - 6
        if (miss < 0 && (!danger || tca < danger.tca)) danger = { dx, dy, tca, miss }
      }
      if (!shootable) return
      const closing = -(dx * rvx + dy * rvy) / (d || 1)
      const sc = d - r - Math.max(0, closing) * 0.9 + bias
      if (sc < bestScore) {
        bestScore = sc
        best = { x, y, r, dx, dy, rvx, rvy }
      }
    }
    for (const rk of rocks) if (!rk.dead && rk.age > BORN * 0.6) consider(rk.x, rk.y, rk.vx, rk.vy, rk.r, rk.size === 2 ? -6 : 0, true)
    if (saucer && saucer.age > 2.5) consider(saucer.x, saucer.y, saucer.vx, saucer.vy, saucer.r, 10, true)
    for (const b of bullets) if (b.enemy) consider(b.x, b.y, b.vx, b.vy, 1, 0, false)

    let huntDist = 0
    let huntDiff = 9
    const tgt = best as { x: number; y: number; r: number; dx: number; dy: number; rvx: number; rvy: number } | null
    if (tgt) {
      // lead: |d + rv·t| = S·t
      const a = tgt.rvx * tgt.rvx + tgt.rvy * tgt.rvy - BULLET_V * BULLET_V
      const b = 2 * (tgt.dx * tgt.rvx + tgt.dy * tgt.rvy)
      const c = tgt.dx * tgt.dx + tgt.dy * tgt.dy
      const disc = b * b - 4 * a * c
      let tt = 0
      if (disc > 0) tt = Math.max(0, (-b - Math.sqrt(disc)) / (2 * a))
      const ax = tgt.dx + tgt.rvx * tt
      const ay = tgt.dy + tgt.rvy * tt
      const want = Math.atan2(ay, ax)
      const diff = angleDiff(ship.a, want)
      inp.rot = Math.abs(diff) < 0.015 ? 0 : clamp(diff * 5.5 - ship.va * 0.16, -1, 1)
      const dist = Math.hypot(ax, ay)
      const tol = Math.max(0.035, Math.atan2(tgt.r * 0.7, dist))
      if (Math.abs(diff) < tol && dist < BULLET_V * BULLET_LIFE * 0.92 && botFireCd <= 0) {
        inp.fire = true
        botFireCd = 0.17
      }
      botTarget = { x: tgt.x, y: tgt.y, r: tgt.r }
      botAim = { x: ship.x + ax, y: ship.y + ay }
      huntDist = dist
      huntDiff = diff
    }
    const dg = danger as { dx: number; dy: number; tca: number; miss: number } | null
    const speed = Math.hypot(ship.vx, ship.vy)
    if (dg) {
      // thrust if the nose already points away from the incoming line
      const dl = Math.hypot(dg.dx, dg.dy) || 1
      const away = -(hx * dg.dx + hy * dg.dy) / dl
      if (away > 0.35 && speed < 150) inp.thrust = true
      if (dg.tca < 0.22 && dg.miss < -6 && ship.hyperCd <= 0 && Math.abs(away) < 0.5 && R() < 0.5) inp.hyper = true
    } else {
      // hunt: close in on a distant target, then hold and shoot; brake when quick
      if (huntDist > 150 && Math.abs(huntDiff) < 0.3 && speed < 80) inp.thrust = true
      if (speed > 95 && (hx * ship.vx + hy * ship.vy) / speed < -0.7) inp.thrust = true
    }
    return inp
  }

  function playerInput(): Input {
    let rot = (keys.down('ArrowRight', 'KeyD') ? 1 : 0) - (keys.down('ArrowLeft', 'KeyA') ? 1 : 0)
    let thrust = keys.down('ArrowUp', 'KeyW')
    let held = keys.down('Space', 'KeyZ', 'KeyX')
    for (const p of ptrs.values()) {
      if (p.side === 'fire') {
        held = true
        continue
      }
      const dx = p.x - p.sx
      const dy = p.y - p.sy
      const len = Math.hypot(dx, dy)
      if (len > 12) {
        const diff = angleDiff(ship.a, Math.atan2(dy, dx))
        rot = clamp(diff * 4, -1, 1)
        if (len > 34 && Math.abs(diff) < 1.3) thrust = true
      }
    }
    return { rot, thrust, fire: keys.hit('Space', 'KeyZ', 'KeyX') || fireQueued, held, hyper: keys.hit('ArrowDown', 'KeyS', 'ShiftLeft', 'ShiftRight') }
  }

  /* ---------------------------------------------------------- simulation */

  function step(dt: number, bot: boolean) {
    waveT += dt
    simT += dt
    comboT -= dt
    if (comboT <= 0) combo = 0
    const inp = bot ? botThink(dt) : playerInput()
    if (!bot && ship.alive) {
      if (inp.rot !== 0) turnAcc += dt
      if (inp.thrust) thrustAcc += dt
      if (inp.hyper) usedJump = true
    }

    // --- ship
    if (ship.alive) {
      ship.born += dt
      ship.inv -= dt
      ship.fireCd -= dt
      ship.autoCd -= dt
      ship.hyperCd -= dt
      if (ship.hyper > 0) {
        const before = ship.hyper
        ship.hyper -= dt
        if (before > HYPER / 2 && ship.hyper <= HYPER / 2) {
          ship.x = W * (0.12 + R() * 0.76)
          ship.y = H * (0.12 + R() * 0.76)
          ship.vx *= 0.2
          ship.vy *= 0.2
          rings.add(ship.x, ship.y, 26, 0.5, C.ink2, 2)
          sparks.emit(ship.x, ship.y, preview ? 5 : 12, { speed: 90, life: 0.4, color: C.ink2 })
        }
        if (ship.hyper < 0) ship.hyper = 0
      } else {
        ship.va += (inp.rot * ROT_MAX - ship.va) * damp(15, dt)
        ship.a += ship.va * dt
        const ca = Math.cos(ship.a)
        const sa = Math.sin(ship.a)
        if (inp.thrust) {
          ship.vx += ca * THRUST * dt
          ship.vy += sa * THRUST * dt
          ship.thrustSnd -= dt
          if (ship.thrustSnd <= 0) {
            ship.thrustSnd = 0.075
            sfx.noise(0.14, { filter: 170, q: 0.5, gain: 0.05, room: 0.05 })
          }
        }
        ship.flame += ((inp.thrust ? 1 : 0) - ship.flame) * damp(inp.thrust ? 30 : 14, dt)
        const sp = Math.hypot(ship.vx, ship.vy)
        if (sp > MAX_V) {
          ship.vx *= MAX_V / sp
          ship.vy *= MAX_V / sp
        }
        const k = Math.exp(-DRAG * dt)
        ship.vx *= k
        ship.vy *= k
        ship.x = mod(ship.x + ship.vx * dt, W)
        ship.y = mod(ship.y + ship.vy * dt, H)
        trailT -= dt
        if (trailT <= 0) {
          trailT = 0.07
          if (Math.hypot(ship.vx, ship.vy) > 18) {
            trail[trailHead * 3] = ship.x
            trail[trailHead * 3 + 1] = ship.y
            trail[trailHead * 3 + 2] = simT
            trailHead = (trailHead + 1) % TRAIL
          }
        }
        if (ship.born > 0.25) {
          if (inp.fire && ship.fireCd <= 0) fire()
          else if (inp.held && ship.autoCd <= 0) fire()
        }
        if (inp.hyper && ship.hyperCd <= 0 && ship.born > 0.4) {
          ship.hyper = HYPER
          ship.hyperCd = 1.6
          ship.hx = ship.x
          ship.hy = ship.y
          rings.add(ship.x, ship.y, 2, 0.32, C.ink2, 24)
          sfx.tone(330, 0.32, { type: 'sine', to: 1320, gain: 0.05 })
        }
      }
    } else if (lives > 0) {
      ship.wait -= dt
      if (ship.wait <= 0) {
        let clear = true
        for (const rk of rocks) if (Math.hypot(wrapD(rk.x - W / 2, W), wrapD(rk.y - H / 2, H)) < rk.r + 48) clear = false
        if (clear) spawnShip()
      }
    } else {
      deadT += dt
      if (deadT > 2.2) {
        if (state === 'play') go('over')
        else if (state !== 'over') newGame()
      }
    }

    // --- rocks
    for (const rk of rocks) {
      rk.age += dt
      rk.x = mod(rk.x + rk.vx * dt, W)
      rk.y = mod(rk.y + rk.vy * dt, H)
      rk.a += rk.va * dt
    }

    // --- bullets
    for (const b of bullets) {
      b.life -= dt
      b.x = mod(b.x + b.vx * dt, W)
      b.y = mod(b.y + b.vy * dt, H)
    }

    // --- saucer
    if (saucer) {
      const s = saucer
      s.age += dt
      s.x += s.vx * dt
      s.y = mod(s.y + s.vy * dt, H)
      s.turn -= dt
      if (s.turn <= 0) {
        s.turn = 0.8 + R() * 1.1
        s.vy = (Math.floor(R() * 3) - 1) * Math.abs(s.vx) * 0.7
      }
      s.beat -= dt
      if (s.beat <= 0) {
        s.beat = 0.15
        sfx.tone(s.small ? 1046 : 698, 0.13, { type: 'sine', gain: 0.022, to: s.small ? 1175 : 784 })
      }
      s.fire -= dt
      if (s.fire <= 0 && s.x > 0 && s.x < W) {
        s.fire = s.small ? 0.85 : 1.15
        let a = R() * TAU
        if (ship.alive && (s.small || R() < 0.25)) {
          const err = s.small ? lerp(0.35, 0.06, clamp(score / 40000)) : 0.5
          a = Math.atan2(wrapD(ship.y - s.y, H), wrapD(ship.x - s.x, W)) + (R() - 0.5) * 2 * err
        }
        fire(s, a)
      }
      if (s.x < -20 || s.x > W + 20) saucer = null
    } else if (rocks.length > 0) {
      saucerT -= dt
      if (saucerT <= 0) {
        spawnSaucer()
        saucerT = Math.max(7, 16 - wave * 1.2) + R() * 6
      }
    }

    // --- collisions
    for (const b of bullets) {
      if (b.life <= 0) continue
      for (const rk of rocks) {
        if (rk.dead || rk.age < BORN * 0.5) continue
        const dx = wrapD(b.x - rk.x, W)
        const dy = wrapD(b.y - rk.y, H)
        const rr = rk.r * 1.04 + 1.5
        if (dx * dx + dy * dy < rr * rr) {
          splitRock(rk, b.vx, b.vy, !b.enemy)
          b.life = 0
          break
        }
      }
      if (b.life <= 0) continue
      if (!b.enemy && saucer && Math.hypot(wrapD(b.x - saucer.x, W), wrapD(b.y - saucer.y, H)) < saucer.r + 3) {
        killSaucer(true)
        b.life = 0
        continue
      }
      if (b.enemy && ship.alive && ship.hyper <= 0 && ship.inv <= 0 && Math.hypot(wrapD(b.x - ship.x, W), wrapD(b.y - ship.y, H)) < SHIP_R + 1) {
        killShip()
        b.life = 0
      }
    }
    const shipHot = ship.alive && ship.hyper <= 0 && ship.inv <= 0
    for (const rk of rocks) {
      if (rk.dead || rk.age < BORN) continue
      if (shipHot && ship.alive) {
        const dx = wrapD(ship.x - rk.x, W)
        const dy = wrapD(ship.y - rk.y, H)
        const rr = rk.r * 0.86 + SHIP_R
        if (dx * dx + dy * dy < rr * rr) {
          splitRock(rk, -dx, -dy, true)
          killShip()
        }
      }
      if (saucer && saucer.x > 0 && saucer.x < W && Math.hypot(wrapD(saucer.x - rk.x, W), wrapD(saucer.y - rk.y, H)) < rk.r * 0.9 + saucer.r * 0.8) {
        splitRock(rk, saucer.vx, saucer.vy, false)
        killSaucer(false)
      }
    }
    if (shipHot && ship.alive && saucer && Math.hypot(wrapD(ship.x - saucer.x, W), wrapD(ship.y - saucer.y, H)) < saucer.r * 0.8 + SHIP_R) {
      killSaucer(true)
      killShip()
    }

    // compact
    if (rocks.some((rk) => rk.dead)) rocks = rocks.filter((rk) => !rk.dead)
    if (bullets.some((b) => b.life <= 0)) bullets = bullets.filter((b) => b.life > 0)

    // --- wave clear
    if (rocks.length === 0 && clearT < 0 && wave > 0) {
      clearT = 2.4
      ;[523, 659, 784, 1047].forEach((fr, i) => sfx.tone(fr, 0.2, { type: 'triangle', gain: 0.04, when: i * 0.09 }))
    }
    if (clearT >= 0) {
      clearT -= dt
      if (clearT < 0) startWave(wave + 1)
    }

    // --- heartbeat
    if (rocks.length && (ship.alive || lives > 0)) {
      beatT -= dt
      if (beatT <= 0) {
        beatT = clamp(Math.min(0.28 + rocks.length * 0.05, lerp(1.05, 0.3, clamp(waveT / 45))), 0.26, 1.05)
        beatFlip = !beatFlip
        sfx.tone(beatFlip ? 98 : 87.3, 0.16, { type: 'triangle', gain: 0.11, filter: 420, room: 0.05 })
      }
    }
  }

  /* -------------------------------------------------------------- drawing */

  let hair = 1
  const lab = (s: string, x: number, y: number, o: TextOpts = {}) => text(ctx, s, x, y, { ...o, size: (o.size ?? 8.5) / f.s })

  /** offsets at which a wrapped object of radius r must be drawn (into a reused buffer) */
  function ghosts(x: number, y: number, r: number, out: number[]) {
    out.length = 0
    const gx = x < r ? W : x > W - r ? -W : 0
    const gy = y < r ? H : y > H - r ? -H : 0
    out.push(0, 0)
    if (gx) out.push(gx, 0)
    if (gy) out.push(0, gy)
    if (gx && gy) out.push(gx, gy)
    return out
  }
  const gbuf: number[] = []

  function drawRocks() {
    // outlines (with draw-on), then cracks, then hatching — three batched strokes
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hair * 1.05
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (const rk of rocks) {
      if (rk.age <= 0) continue
      const prog = clamp(rk.age / BORN)
      const ca = Math.cos(rk.a)
      const sa = Math.sin(rk.a)
      const p = rk.pts
      const n = p.length / 2
      const segs = ease.inOutSine(prog) * n
      ghosts(rk.x, rk.y, rk.r, gbuf)
      for (let g = 0; g < gbuf.length; g += 2) {
        const cx = rk.x + gbuf[g]
        const cy = rk.y + gbuf[g + 1]
        ctx.moveTo(cx + ca * p[0] - sa * p[1], cy + sa * p[0] + ca * p[1])
        for (let i = 1; i <= n; i++) {
          const j = i % n
          const xj = cx + ca * p[j * 2] - sa * p[j * 2 + 1]
          const yj = cy + sa * p[j * 2] + ca * p[j * 2 + 1]
          if (i <= segs) ctx.lineTo(xj, yj)
          else {
            const k = segs - (i - 1)
            if (k > 0) {
              const q = i - 1
              const xq = cx + ca * p[q * 2] - sa * p[q * 2 + 1]
              const yq = cy + sa * p[q * 2] + ca * p[q * 2 + 1]
              ctx.lineTo(lerp(xq, xj, k), lerp(yq, yj, k))
            }
            break
          }
        }
        if (segs >= n) ctx.closePath()
      }
    }
    ctx.stroke()

    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? rgba(C.ink, 0.62) : rgba(C.ink2, 0.5)
      ctx.lineWidth = hair
      ctx.beginPath()
      for (const rk of rocks) {
        if (rk.age < BORN * 0.7) continue
        const m = pass === 0 ? rk.marks : rk.hatch
        if (!m.length) continue
        const ca = Math.cos(rk.a)
        const sa = Math.sin(rk.a)
        ghosts(rk.x, rk.y, rk.r, gbuf)
        for (let g = 0; g < gbuf.length; g += 2) {
          const cx = rk.x + gbuf[g]
          const cy = rk.y + gbuf[g + 1]
          for (let i = 0; i < m.length; i += 4) {
            ctx.moveTo(cx + ca * m[i] - sa * m[i + 1], cy + sa * m[i] + ca * m[i + 1])
            ctx.lineTo(cx + ca * m[i + 2] - sa * m[i + 3], cy + sa * m[i + 2] + ca * m[i + 3])
          }
        }
      }
      ctx.stroke()
    }
    ctx.lineJoin = 'miter'
  }

  function drawShipAt(x: number, y: number, a: number, alpha: number, scale = 1) {
    const ca = Math.cos(a) * scale
    const sa = Math.sin(a) * scale
    const P = (px: number, py: number): [number, number] => [x + ca * px - sa * py, y + sa * px + ca * py]
    ctx.globalAlpha = alpha
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hair * 1.25
    ctx.lineJoin = 'miter'
    ctx.beginPath()
    // the dart: swept wings, a rear crossbar inset from the tips
    let q = P(-9, -7.2)
    ctx.moveTo(q[0], q[1])
    q = P(13, 0)
    ctx.lineTo(q[0], q[1])
    q = P(-9, 7.2)
    ctx.lineTo(q[0], q[1])
    q = P(-5.6, 6.08)
    ctx.moveTo(q[0], q[1])
    q = P(-5.6, -6.08)
    ctx.lineTo(q[0], q[1])
    ctx.stroke()
    // centre of mass: a tiny registration point
    ctx.fillStyle = C.ink
    q = P(0.5, 0)
    ctx.fillRect(q[0] - hair, q[1] - hair, hair * 2, hair * 2)
    if (ship.flame > 0.05) {
      ctx.strokeStyle = C.moss
      ctx.lineCap = 'round'
      ctx.lineWidth = hair * 1.2
      ctx.beginPath()
      const fl = ship.flame
      const L0 = (7 + V() * 7) * fl
      const L1 = (3 + V() * 4.5) * fl
      const L2 = (3 + V() * 4.5) * fl
      q = P(-7.4, 0)
      ctx.moveTo(q[0], q[1])
      q = P(-7.4 - L0, 0)
      ctx.lineTo(q[0], q[1])
      q = P(-7.2, -2.8)
      ctx.moveTo(q[0], q[1])
      q = P(-7.2 - L1, -3.6)
      ctx.lineTo(q[0], q[1])
      q = P(-7.2, 2.8)
      ctx.moveTo(q[0], q[1])
      q = P(-7.2 - L2, 3.6)
      ctx.lineTo(q[0], q[1])
      ctx.stroke()
      ctx.lineCap = 'butt'
    }
    ctx.globalAlpha = 1
  }

  function drawTrail() {
    ctx.fillStyle = C.ocean
    const d = 1.3 * hair
    for (let i = 0; i < TRAIL; i++) {
      const age = simT - trail[i * 3 + 2]
      if (age > 1.5 || trail[i * 3 + 2] === 0) continue
      ctx.globalAlpha = 0.5 * (1 - age / 1.5)
      ctx.fillRect(trail[i * 3] - d, trail[i * 3 + 1] - d, d * 2, d * 2)
    }
    ctx.globalAlpha = 1
  }

  function drawShip() {
    if (!ship.alive) {
      // standby mark at the respawn point
      if (lives > 0 && ship.wait < 1.2) {
        ctx.strokeStyle = rgba(C.ink, 0.35 + 0.25 * Math.sin(stateT * 8))
        ctx.lineWidth = hair
        ctx.setLineDash([3 / f.s, 3 / f.s])
        ctx.beginPath()
        ctx.arc(W / 2, H / 2, 16, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(W / 2 - 22, H / 2)
        ctx.lineTo(W / 2 - 10, H / 2)
        ctx.moveTo(W / 2 + 10, H / 2)
        ctx.lineTo(W / 2 + 22, H / 2)
        ctx.moveTo(W / 2, H / 2 - 22)
        ctx.lineTo(W / 2, H / 2 - 10)
        ctx.moveTo(W / 2, H / 2 + 10)
        ctx.lineTo(W / 2, H / 2 + 22)
        ctx.stroke()
      }
      return
    }
    if (ship.hyper > 0) return
    const appear = ease.outBack(clamp(ship.born / 0.35))
    const blinkA = ship.inv > 0 ? (Math.sin(ship.inv * 22) > -0.3 ? 1 : 0.25) : 1
    ghosts(ship.x, ship.y, 14, gbuf)
    for (let g = 0; g < gbuf.length; g += 2) drawShipAt(ship.x + gbuf[g], ship.y + gbuf[g + 1], ship.a, blinkA, 0.6 + 0.4 * appear)
    if (ship.inv > 0 && ship.born > 0.2) {
      // shield ring, closing as protection runs out
      ctx.strokeStyle = rgba(C.moss, 0.55 * clamp(ship.inv))
      ctx.lineWidth = hair
      ctx.setLineDash([2 / f.s, 3 / f.s])
      ctx.beginPath()
      ctx.arc(ship.x, ship.y, 15 + ship.inv * 3, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
    }
    // velocity vector, dimension style
    const sp = Math.hypot(ship.vx, ship.vy)
    if (sp > 14) {
      const L = clamp(sp * 0.2, 10, 50)
      const ux = ship.vx / sp
      const uy = ship.vy / sp
      const x0 = ship.x + ux * 6
      const y0 = ship.y + uy * 6
      const x1 = x0 + ux * L
      const y1 = y0 + uy * L
      const k = clamp((sp - 14) / 30)
      ctx.strokeStyle = rgba(C.ocean, 0.75 * k)
      ctx.lineWidth = hair
      ctx.beginPath()
      ctx.moveTo(x0 - uy * 2.5, y0 + ux * 2.5)
      ctx.lineTo(x0 + uy * 2.5, y0 - ux * 2.5)
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.moveTo(x1 - ux * 4 - uy * 2, y1 - uy * 4 + ux * 2)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 - ux * 4 + uy * 2, y1 - uy * 4 - ux * 2)
      ctx.stroke()
      if (!preview) {
        const side = uy > 0 ? -1 : 1
        lab(`v ${sp.toFixed(0)}`, x1 + uy * 7 * side + ux * 3, y1 - ux * 7 * side + uy * 3, { size: 8.5, color: rgba(C.ocean, 0.9 * k), align: 'center', baseline: 'middle' })
      }
    }
  }

  function drawSaucer() {
    if (!saucer) return
    const s = saucer
    const r = s.r
    ghosts(s.x, s.y, r * 1.2, gbuf)
    for (let g = 0; g < gbuf.length; g += 2) {
      const x = s.x + gbuf[g]
      const y = s.y + gbuf[g + 1]
      const p = saucerPts(r)
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hair * 1.15
      ctx.beginPath()
      ctx.moveTo(x + p[0], y + p[1])
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(x + p[i], y + p[i + 1])
      ctx.closePath()
      ctx.moveTo(x - r, y)
      ctx.lineTo(x + r, y)
      // dome
      ctx.moveTo(x - r * 0.3, y - r * 0.4)
      ctx.lineTo(x - r * 0.18, y - r * 0.72)
      ctx.lineTo(x + r * 0.18, y - r * 0.72)
      ctx.lineTo(x + r * 0.3, y - r * 0.4)
      ctx.stroke()
      // hatch the lower hull in ocean
      ctx.strokeStyle = rgba(C.ocean, 0.8)
      ctx.lineWidth = hair
      ctx.beginPath()
      const ph = (s.age * 18) % 4
      for (let hx = -r * 0.8 + ph * r * 0.06; hx < r * 0.8; hx += r * 0.24) {
        const half = r * 0.4 * (1 - Math.abs(hx) / (r * 1.05))
        ctx.moveTo(x + hx - half * 0.4, y + 1.2)
        ctx.lineTo(x + hx + half * 0.4, y + half * 0.9 + 0.5)
      }
      ctx.stroke()
      // antenna tick
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(x, y - r * 0.72)
      ctx.lineTo(x, y - r * 0.98)
      ctx.stroke()
    }
  }

  function drawBullets() {
    ctx.lineCap = 'round'
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? C.ink : C.ocean
      ctx.lineWidth = hair * (pass === 0 ? 1.6 : 1.4)
      ctx.beginPath()
      for (const b of bullets) {
        if (b.enemy !== (pass === 1)) continue
        const sp = Math.hypot(b.vx, b.vy) || 1
        const L = pass === 0 ? 5 : 3.5
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x - (b.vx / sp) * L, b.y - (b.vy / sp) * L)
      }
      ctx.stroke()
    }
    ctx.lineCap = 'butt'
  }

  function drawBotOverlay() {
    if (!botTarget || !ship.alive) return
    const { x, y } = botTarget
    const r = botTarget.r + 5
    const c = Math.min(6, r * 0.5)
    ctx.strokeStyle = rgba(C.ocean, 0.55)
    ctx.lineWidth = hair
    ctx.beginPath()
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      ctx.moveTo(x + sx * r, y + sy * (r - c))
      ctx.lineTo(x + sx * r, y + sy * r)
      ctx.lineTo(x + sx * (r - c), y + sy * r)
    }
    ctx.stroke()
    if (botAim) {
      ctx.setLineDash([2 / f.s, 4 / f.s])
      ctx.strokeStyle = rgba(C.ocean, 0.32)
      ctx.beginPath()
      ctx.moveTo(ship.x + Math.cos(ship.a) * 14, ship.y + Math.sin(ship.a) * 14)
      ctx.lineTo(botAim.x, botAim.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = rgba(C.ocean, 0.6)
      ctx.beginPath()
      ctx.moveTo(botAim.x - 3, botAim.y - 3)
      ctx.lineTo(botAim.x + 3, botAim.y + 3)
      ctx.moveTo(botAim.x + 3, botAim.y - 3)
      ctx.lineTo(botAim.x - 3, botAim.y + 3)
      ctx.stroke()
    }
  }

  function drawField() {
    // faint survey grid of points + the centre registration
    ctx.fillStyle = rgba(C.ink, 0.16)
    const d = 1.2 / f.s
    for (let gx = 40; gx < W; gx += 40) for (let gy = 40; gy < H; gy += 40) ctx.fillRect(gx - d / 2, gy - d / 2, d, d)
    ctx.strokeStyle = rgba(C.ink, 0.1)
    ctx.lineWidth = hair
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, 5, 0, TAU)
    ctx.moveTo(W / 2 - 9, H / 2)
    ctx.lineTo(W / 2 + 9, H / 2)
    ctx.moveTo(W / 2, H / 2 - 9)
    ctx.lineTo(W / 2, H / 2 + 9)
    ctx.stroke()
  }

  function drawBanner() {
    let a = 0
    let line1 = ''
    let line2 = ''
    if (clearT >= 0) {
      a = clamp((2.4 - clearT) / 0.3) * clamp(clearT / 0.3)
      line1 = `WAVE ${String(wave).padStart(2, '0')} CLEARED`
      line2 = `NEXT ${String(Math.min(11, 4 + wave)).padStart(2, '0')} ROCKS`
    } else if (waveT < 2.2 && wave > 0) {
      a = clamp(waveT / 0.25) * clamp((2.2 - waveT) / 0.5)
      line1 = `WAVE ${String(wave).padStart(2, '0')}`
      line2 = `ROCKS ${String(Math.min(11, 3 + wave)).padStart(2, '0')} · v ×${speedMul().toFixed(2)}`
    }
    if (a <= 0.01 || preview || state === 'title' || state === 'over') return
    const y = H * 0.3
    ctx.globalAlpha = a
    lab(line1, W / 2, y, { size: 11, color: C.ink, align: 'center', tracking: 0.3 })
    const half = 60 * ease.outCubic(a)
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.lineWidth = hair
    ctx.beginPath()
    ctx.moveTo(W / 2 - half, y + 6)
    ctx.lineTo(W / 2 + half, y + 6)
    ctx.moveTo(W / 2 - half, y + 3)
    ctx.lineTo(W / 2 - half, y + 9)
    ctx.moveTo(W / 2 + half, y + 3)
    ctx.lineTo(W / 2 + half, y + 9)
    ctx.stroke()
    lab(line2, W / 2, y + 18, { size: 8, color: C.muted, align: 'center' })
    ctx.globalAlpha = 1
  }

  function drawPopups(dt: number) {
    for (const p of popups) p.t += dt
    if (popups.some((p) => p.t > 0.9)) popups = popups.filter((p) => p.t <= 0.9)
    for (const p of popups) {
      const k = p.t / 0.9
      lab(p.s, p.x, p.y - ease.outCubic(k) * 10, { size: 8, color: C.ink2, align: 'center', alpha: 1 - k * k })
    }
  }

  function drawTouchUI() {
    if (state !== 'play' || forceBot) return
    for (const p of ptrs.values()) {
      if (p.side === 'stick') {
        const dx = p.x - p.sx
        const dy = p.y - p.sy
        const len = Math.hypot(dx, dy)
        const k = len > 44 ? 44 / len : 1
        ctx.strokeStyle = rgba(C.ink, 0.25)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, 44, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, 34, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle = rgba(C.ink, 0.55)
        ctx.beginPath()
        ctx.moveTo(p.sx, p.sy)
        ctx.lineTo(p.sx + dx * k, p.sy + dy * k)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(p.sx + dx * k, p.sy + dy * k, 7, 0, TAU)
        ctx.stroke()
        if (len > 34) text(ctx, 'THRUST', p.sx, p.sy + 58, { size: 9, color: C.moss, align: 'center' })
      } else {
        ctx.strokeStyle = rgba(C.ink, 0.35)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(p.x, p.y, 16, 0, TAU)
        ctx.stroke()
      }
    }
  }

  /** advance the first-play hints and the contextual JUMP prompt */
  function updateHints(dt: number) {
    if (state !== 'play' || forceBot || !ship.alive || ship.born < 0.6) return
    hintT += dt
    if (hint === 0 && (turnAcc > 0.25 || hintT > 7)) {
      hint = 1
      hintT = 0
    } else if (hint === 1 && (firstHit || hintT > 9)) {
      hint = 2
      hintT = 0
    } else if (hint === 2 && (thrustAcc > 0.3 || hintT > 6)) {
      hint = 3
      env.store.set('hinted', '1')
    }
    jumpT -= dt
    if (env.mode === 'full' && !usedJump && jumpPrompts < 3 && jumpT < -2 && ship.inv <= 0 && ship.hyper <= 0) {
      for (const rk of rocks) {
        if (rk.age < BORN) continue
        const dx = wrapD(rk.x - ship.x, W)
        const dy = wrapD(rk.y - ship.y, H)
        const rvx = rk.vx - ship.vx
        const rvy = rk.vy - ship.vy
        const rv2 = rvx * rvx + rvy * rvy || 1e-6
        const tca = -(dx * rvx + dy * rvy) / rv2
        if (tca > 0.15 && tca < 0.7 && Math.hypot(dx + rvx * tca, dy + rvy * tca) < rk.r * 0.86 + SHIP_R) {
          jumpT = 1.3
          jumpPrompts++
          break
        }
      }
    }
  }

  /** ghost demonstrations around the ship, in the drawing's own language */
  function drawHints() {
    if (state !== 'play' || forceBot || !ship.alive || ship.hyper > 0 || ship.born < 0.6) return
    const a = ship.a
    const x = ship.x
    const y = ship.y
    const k = clamp(hintT / 0.4) * (hint === 3 ? 0 : 1)
    const ph = (stateT * 0.9) % 1
    ctx.lineWidth = hair
    if (hint === 0 && k > 0) {
      // a dotted arc in front of the nose, a dot sweeping along it
      ctx.globalAlpha = k
      ctx.strokeStyle = rgba(C.moss, 0.8)
      ctx.setLineDash([1.5 / f.s, 3 / f.s])
      ctx.beginPath()
      ctx.arc(x, y, 24, a - 1.1, a + 1.1)
      ctx.stroke()
      ctx.setLineDash([])
      const sweep = a + Math.sin(stateT * 2.4) * 1.0
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(x + Math.cos(sweep) * 24, y + Math.sin(sweep) * 24, 1.6, 0, TAU)
      ctx.fill()
      for (const sd of [-1, 1]) {
        const e = a + sd * 1.1
        const ex = x + Math.cos(e) * 24
        const ey = y + Math.sin(e) * 24
        const tx = -Math.sin(e) * sd
        const ty = Math.cos(e) * sd
        ctx.beginPath()
        ctx.moveTo(ex - tx * 3 + Math.cos(e) * 2, ey - ty * 3 + Math.sin(e) * 2)
        ctx.lineTo(ex, ey)
        ctx.lineTo(ex - tx * 3 - Math.cos(e) * 2, ey - ty * 3 - Math.sin(e) * 2)
        ctx.stroke()
      }
      lab('TURN', x, y + 36, { size: 8.5, color: C.moss, align: 'center', tracking: 0.2 })
    } else if (hint === 1 && k > 0) {
      // ghost shots leaving the nose
      ctx.globalAlpha = k
      ctx.strokeStyle = rgba(C.moss, 0.85)
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const d = 18 + ((ph + i / 3) % 1) * 46
        ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
        ctx.lineTo(x + Math.cos(a) * (d + 4), y + Math.sin(a) * (d + 4))
      }
      ctx.stroke()
      ctx.lineCap = 'butt'
      lab('FIRE', x + Math.cos(a) * 74, y + Math.sin(a) * 74 + 3 / f.s, { size: 8.5, color: C.moss, align: 'center', tracking: 0.2 })
    } else if (hint === 2 && k > 0) {
      // a dashed flame and a push arrow behind the ship
      ctx.globalAlpha = k * (0.6 + 0.4 * Math.sin(stateT * 6))
      ctx.strokeStyle = C.moss
      ctx.setLineDash([2 / f.s, 2 / f.s])
      ctx.beginPath()
      ctx.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9)
      ctx.lineTo(x - Math.cos(a) * 22, y - Math.sin(a) * 22)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = k
      lab('THRUST', x - Math.cos(a) * 32, y - Math.sin(a) * 32 + 3 / f.s, { size: 8.5, color: C.moss, align: 'center', tracking: 0.2 })
    }
    ctx.globalAlpha = 1
    if (jumpT > 0 && Math.sin(jumpT * 18) > -0.4) lab('JUMP ↓', x, y - 22, { size: 9, color: C.ocean, align: 'center', tracking: 0.2 })
  }

  function updateCursor() {
    if (env.mode !== 'full') return
    if (state === 'title' || state === 'over') env.setCursor('pointer')
    else if (forceBot) env.setCursor('default')
    else if ([...ptrs.values()].some((p) => p.side === 'stick')) env.setCursor('grabbing')
    else if (hoverIn) env.setCursor(hoverX < env.width / 2 ? 'grab' : 'crosshair')
    else env.setCursor('default')
  }

  /* ---------------------------------------------------------- lifecycle */

  newGame()
  const ps = env.params.get('state')
  if (env.mode === 'full') {
    if (ps === 'play') go('play')
    else if (ps === 'over') {
      state = 'over'
      stateT = 0
      lives = 0
      ship.alive = false
      deadT = -1e9
      shown = 18420
    }
  }

  return {
    resize(w, h) {
      layout(w, h)
    },
    key(code, down) {
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight', ...START_KEYS])
    },
    pointer(p) {
      touch.pointer(p)
      hoverX = p.x
      hoverIn = p.type !== 'leave' && p.pointerType !== 'touch'
      if (p.type === 'down') {
        if (state !== 'play') return
        const side = p.x < env.width / 2 ? 'stick' : 'fire'
        ptrs.set(p.id, { side, sx: p.x, sy: p.y, x: p.x, y: p.y })
        if (side === 'fire') fireQueued = true
      } else if (p.type === 'move') {
        const q = ptrs.get(p.id)
        if (q) {
          q.x = p.x
          q.y = p.y
        }
      } else ptrs.delete(p.id)
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) go('play')

      if (dt > 0) {
        const bot = state !== 'play' || forceBot
        const n = Math.max(1, Math.ceil(dt / 0.0175))
        for (let i = 0; i < n; i++) step(dt / n, bot)
      }
      updateHints(dt)
      sparks.update(dt, 0, 2.6)
      rings.update(dt)
      frags.update(dt, W, H)
      shake *= Math.exp(-7 * dt)

      // --- draw
      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: CAPTION })
      hair = 1 / f.s
      ctx.save()
      ctx.beginPath()
      ctx.rect(f.ox, f.oy, f.lw * f.s, f.lh * f.s)
      ctx.clip()
      enterFit(ctx, f)
      if (shake > 0.05) ctx.translate((V() - 0.5) * shake, (V() - 0.5) * shake)
      drawField()
      drawRocks()
      drawSaucer()
      drawBullets()
      drawTrail()
      if (ship.hyper > 0) {
        // the jump: a collapsing mark where it left
        const k = 1 - ship.hyper / HYPER
        if (k < 0.5) drawShipAt(ship.hx, ship.hy, ship.a + k * 9, 1 - k * 2, 1 - k * 2)
      }
      drawShip()
      ctx.lineWidth = hair
      frags.draw(ctx)
      sparks.draw(ctx, hair)
      rings.draw(ctx, hair)
      if (state !== 'play' || forceBot) drawBotOverlay()
      drawPopups(dt)
      drawHints()
      drawBanner()
      ctx.restore()
      ctx.restore()
      drawTouchUI()
      updateCursor()

      const shownScore = state === 'over' ? shown : score
      gameHud(ctx, f, env.mode, [
        { label: 'Score', value: fmtScore(shownScore) },
        { label: 'Ships', value: String(Math.max(0, state === 'over' ? 0 : lives)) },
        { label: 'Wave', value: String(wave).padStart(2, '0') },
      ], [{ label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0)) }])

      const cx = f.ox
      const cy = f.oy
      const cw = f.lw * f.s
      const ch = f.lh * f.s
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, {
          kicker: KICKER,
          title: 'Debris',
          titleEm: 'field',
          // a narrow card can't hold the key list; the viewer's legend has it anyway
          lines: cw < 380 ? ['Turn · thrust · fire · jump'] : ['← → turn · ↑ thrust · Space fire · ↓ jump', 'Touch: the pad, or drag left and tap right'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          kicker: newRecord ? 'New best' : 'Game over',
          title: fmtScore(shown),
          lines: [`Wave ${String(wave).padStart(2, '0')} · Best ${fmtScore(Math.max(hi.get(), shown))}`],
          prompt: 'Press Enter · Tap to play again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
      touch.endFrame()
      fireQueued = false
    },
  }
}

export default create
