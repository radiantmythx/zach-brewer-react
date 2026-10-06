/*
 * REBOUND — after Arkanoid (Taito, 1986).
 *
 * A brick wall drawn like an elevation: every course has its own hatching
 * (angle, density, accent), silver bricks are double-outlined and take two
 * hits, gold ones never break. The side and top walls are section poché.
 * The paddle is a hairline capsule with hatched end caps and a ruler along
 * its top, with a live dimension line underneath. The ball leaves a short
 * fading trail and its angle off the paddle depends on where it lands.
 * Breaking a brick scatters its hatch lines as tumbling sticks, rings out,
 * and blips a pentatonic note that climbs with the combo. Capsules tumble
 * down: Enlarge, Slow, Multi, Catch, Laser. A cleared round gets a tally,
 * then a section line sweeps across like a page turning to the next one.
 * In attract mode the bot's predicted path is drawn as a faint dashed line.
 */

import { C, card, clamp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, rgba, rng, Rings, setFont, Sparks, START_KEYS, text, toField, TAU } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

const LW = 440
const LH = 420
const WALL = 12
const X0 = WALL
const X1 = LW - WALL
const TOP = WALL
const BCOLS = 13
const BROWS = 16
const BW = 32
const BH = 14
const BY0 = 44
const PY = 392
const PH = 9
const R = 3.4
const PEN = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093]

/** hatching per course: [accent, angle, gap, cross] */
const COURSES: [string, number, number, boolean][] = [
  [C.ocean, -Math.PI / 4, 3, false],
  [C.lagoon, Math.PI / 4, 3, false],
  [C.moss, Math.PI / 2, 2.6, false],
  [C.fern, 0, 2.8, false],
  [C.ocean, -Math.PI / 4, 4.2, true],
  [C.lagoon, -Math.PI / 6, 2.4, false],
  [C.moss, Math.PI / 3, 3.4, false],
  [C.fern, Math.PI / 4, 4, true],
]

/* '#' brick · 'S' silver (2 hits) · 'G' gold (unbreakable) · '.' empty */
const LEVELS: string[][] = [
  ['.............', '.............', 'SSSSSSSSSSSSS', '#############', '#############', '#############', '#############', '#############'],
  ['.............', '#............', '##...........', '###..........', '####.........', '#####........', '######.......', '#######......', '########.....', '#########....', '##########...', '###########..', 'SSSSSSSSSSSS#'],
  ['.............', '...#.....#...', '....#...#....', '...#######...', '..##S###S##..', '.###########.', '.#.#######.#.', '.#.#.....#.#.', '....##.##....'],
  ['.............', '.SSSSSSSSSSS.', '.#.........#.', '.#.##...##.#.', '.#.##.#.##.#.', '.#.##...##.#.', '.#.........#.', '.###########.', '.G..G...G..G.'],
  ['.............', '......#......', '.....###.....', '....##S##....', '...###S###...', '..####S####..', '.#####S#####.', '..####S####..', '...###S###...', '....##S##....', '.....###.....', '......#......'],
  ['.............', '#.#.#.#.#.#.#', '#.#.#.#.#.#.#', '#.#.#.#.#.#.#', 'S.S.S.S.S.S.S', '#.#.#.#.#.#.#', '#.#.#.#.#.#.#', '#.#.#.#.#.#.#', 'G...G...G...G'],
]

type State = 'attract' | 'title' | 'play' | 'over'
type Phase = 'wipe' | 'serve' | 'live' | 'lost' | 'clear'
type Power = 'E' | 'S' | 'M' | 'C' | 'L'

const POWER_COL: Record<Power, string> = { E: C.ocean, S: C.lagoon, M: C.moss, C: C.fern, L: C.ink2 }
const POWER_NAME: Record<Power, string> = { E: 'ENLARGE', S: 'SLOW', M: 'MULTI', C: 'CATCH', L: 'LASER' }

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  stuck: boolean
  off: number
  stuckT: number
  trail: Float32Array
  tn: number
}

interface Capsule {
  x: number
  y: number
  kind: Power
  t: number
}

/** Tumbling hairline sticks: a broken brick's hatch lines. */
class Sticks {
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
  emit(x: number, y: number, vx: number, vy: number, a: number, va: number, len: number, life: number, col: string) {
    const i = this.n < this.cap ? this.n++ : Math.floor(Math.random() * this.cap)
    this.x[i] = x
    this.y[i] = y
    this.vx[i] = vx
    this.vy[i] = vy
    this.a[i] = a
    this.va[i] = va
    this.len[i] = len
    this.life[i] = this.max[i] = life
    this.col[i] = col
  }
  update(dt: number, g: number) {
    const k = Math.exp(-1.6 * dt)
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
      this.vy[i] = this.vy[i] * k + g * dt
      this.x[i] += this.vx[i] * dt
      this.y[i] += this.vy[i] * dt
      this.a[i] += this.va[i] * dt
    }
  }
  draw(ctx: CanvasRenderingContext2D, hw: number) {
    ctx.lineWidth = hw
    ctx.lineCap = 'round'
    for (let i = 0; i < this.n; i++) {
      const h = this.len[i] / 2
      const ca = Math.cos(this.a[i]) * h
      const sa = Math.sin(this.a[i]) * h
      ctx.globalAlpha = Math.min(1, (this.life[i] / this.max[i]) * 1.6)
      ctx.strokeStyle = this.col[i]
      ctx.beginPath()
      ctx.moveTo(this.x[i] - ca, this.y[i] - sa)
      ctx.lineTo(this.x[i] + ca, this.y[i] + sa)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.lineCap = 'butt'
  }
  clear() {
    this.n = 0
  }
}

/**
 * Add hatch lines to the current path, cut analytically to the rect (no clip
 * regions, which are slow on big canvases). Line offsets sit on a global
 * grid, so neighbouring rects' hatching lines up like one drawing.
 */
function hatchRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gap: number, angle: number) {
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const cx = x + w / 2
  const cy = y + h / 2
  const ext = (Math.abs(w * sa) + Math.abs(h * ca)) / 2
  const cn = -sa * cx + ca * cy
  for (let d = Math.ceil((cn - ext) / gap) * gap - cn; d <= ext; d += gap) {
    const px = cx - sa * d
    const py = cy + ca * d
    let t0 = -1e9
    let t1 = 1e9
    if (Math.abs(ca) < 1e-6) {
      if (px < x || px > x + w) continue
    } else {
      const a = (x - px) / ca
      const b = (x + w - px) / ca
      t0 = Math.max(t0, Math.min(a, b))
      t1 = Math.min(t1, Math.max(a, b))
    }
    if (Math.abs(sa) < 1e-6) {
      if (py < y || py > y + h) continue
    } else {
      const a = (y - py) / sa
      const b = (y + h - py) / sa
      t0 = Math.max(t0, Math.min(a, b))
      t1 = Math.min(t1, Math.max(a, b))
    }
    if (t1 - t0 < 0.3) continue
    ctx.moveTo(px + ca * t0, py + sa * t0)
    ctx.lineTo(px + ca * t1, py + sa * t1)
  }
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 120 : 300)
  const sticks = new Sticks(preview ? 160 : 420)
  const rings = new Rings()
  const r = rng(1986)
  let f = gameFit(env.width, env.height, env.mode, LW, LH)

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  const botParam = env.params.get('bot') === '1'

  let score = 0
  let finalScore = 0
  let finalLevel = 0
  let lives = 3
  let level = 0
  let newRecord = false
  let clock = 0

  const btype = new Uint8Array(BCOLS * BROWS)
  const bhp = new Uint8Array(BCOLS * BROWS)
  const bflash = new Float32Array(BCOLS * BROWS)
  let breakable = 0
  let firstRow = 0
  let bricksBroken = 0
  let levelTime = 0
  let bestCombo = 0

  let phase: Phase = 'wipe'
  let phaseT = 0
  let px = LW / 2
  let pvx = 0
  let pw = 64
  let pwTarget = 64
  let pDip = 0
  let pDipV = 0
  let mode: Power | null = null
  let balls: Ball[] = []
  let speed = 240
  let combo = 0
  let capsule: Capsule | null = null
  let lasers: { x: number; y: number }[] = []
  let laserCd = 0
  let banner: { str: string; t: number; col: string } | null = null
  let shake = 0

  // bot
  let botTarget = -1
  let botNoise = 0
  let botWait = 0
  let botPath: number[] = []

  // pointer
  let ptrX: number | null = null
  let ptrHeld = false
  let tapped = false
  // affordances: the last input used, the mouse over the field, and the first-play hints
  let lastInput: 'key' | 'mouse' | 'touch' = 'key'
  let hover: { x: number; y: number } | null = null
  let hintsSeen = false
  let hintAge = 0
  let hintDone = false
  let hintOut = 0
  let launchedOnce = false
  let laserHintT = 0

  const minSpeed = () => 210 + Math.min(level, 8) * 8
  const maxSpeed = () => 380 + Math.min(level, 8) * 14
  /** the hatching style of a course: rotates with the round so every wall reads differently */
  const course = (row: number) => COURSES[(row - firstRow + level * 3 + COURSES.length * 4) % COURSES.length]
  const brickX = (c: number) => X0 + c * BW
  const brickY = (row: number) => BY0 + row * BH

  /* ---------------------------------------------------------------- setup */

  function loadLevel(n: number) {
    const pat = LEVELS[n % LEVELS.length]
    btype.fill(0)
    bhp.fill(0)
    bflash.fill(0)
    breakable = 0
    firstRow = Math.max(0, pat.findIndex((row) => row.replace(/\./g, '').length > 0))
    const silverHp = 2 + Math.floor(n / LEVELS.length)
    for (let row = 0; row < pat.length && row < BROWS; row++)
      for (let c = 0; c < BCOLS; c++) {
        const ch = pat[row][c]
        const i = row * BCOLS + c
        if (ch === '#') {
          btype[i] = 1
          bhp[i] = 1
        } else if (ch === 'S') {
          btype[i] = 2
          bhp[i] = silverHp
        } else if (ch === 'G') {
          btype[i] = 3
          bhp[i] = 255
        }
        if (btype[i] === 1 || btype[i] === 2) breakable++
      }
    bricksBroken = 0
    levelTime = 0
    bestCombo = 0
  }

  function makeBall(x: number, y: number, vx: number, vy: number, stuck = false, off = 0): Ball {
    const trail = new Float32Array(20)
    for (let i = 0; i < 10; i++) {
      trail[i * 2] = x
      trail[i * 2 + 1] = y
    }
    return { x, y, vx, vy, stuck, off, stuckT: 0, trail, tn: 0 }
  }

  function serve() {
    phase = 'serve'
    phaseT = 0
    balls = [makeBall(px + 6, PY - PH / 2 - R, 0, 0, true, 6)]
    speed = minSpeed()
    combo = 0
    capsule = null
    lasers = []
    botWait = 0.7 + r() * 0.5
  }

  function startWipe(next: number) {
    level = next
    phase = 'wipe'
    phaseT = 0
    balls = []
    capsule = null
    lasers = []
    mode = null
    pwTarget = 64
    loadLevel(level)
    if (!preview) env.sfx.noise(0.9, { filter: 600, to: 2400, gain: 0.03, q: 0.6 })
  }

  function newGame() {
    score = 0
    lives = 3
    level = 0
    px = LW / 2
    pw = pwTarget = 64
    mode = null
    sparks.clear()
    sticks.clear()
    rings.clear()
    banner = null
    startWipe(0)
  }

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') {
      newGame()
      keys.reset()
      hintAge = 0
      hintOut = 0
      // hints are for people: none when the bot is driving the test route
      hintDone = hintsSeen || botParam
      launchedOnce = hintsSeen
    }
    if (next === 'over') {
      finalScore = score
      finalLevel = level
      newRecord = hi.submit(score)
    }
  }

  /* ------------------------------------------------------------- bricks */

  function breakBrick(i: number, dirX: number, dirY: number) {
    const c = i % BCOLS
    const row = Math.floor(i / BCOLS)
    const x = brickX(c)
    const y = brickY(row)
    const t = btype[i]
    btype[i] = 0
    breakable--
    bricksBroken++
    const [col, ang] = t === 2 ? [C.ink2, 0] : course(row)
    // the brick's hatch lines scatter as tumbling sticks
    const n = preview ? 5 : 11
    for (let k = 0; k < n; k++) {
      const sx = x + 3 + r() * (BW - 6)
      const sy = y + 2 + r() * (BH - 4)
      const sp = 40 + r() * 90
      const a = Math.atan2(sy - (y + BH / 2), sx - (x + BW / 2)) + (r() - 0.5) * 0.8
      sticks.emit(sx, sy, Math.cos(a) * sp + dirX * 50, Math.sin(a) * sp + dirY * 40 - 30, ang + (r() - 0.5) * 0.3, (r() - 0.5) * 9, 5 + r() * 6, 0.7 + r() * 0.5, col)
    }
    // the outline breaks into its four sides
    sticks.emit(x + BW / 2, y, dirX * 30, -50, 0, (r() - 0.5) * 4, BW * 0.8, 0.6, t === 2 ? C.ink : C.ink2)
    sticks.emit(x + BW / 2, y + BH, dirX * 30, 20, 0, (r() - 0.5) * 4, BW * 0.8, 0.6, t === 2 ? C.ink : C.ink2)
    rings.add(x + BW / 2, y + BH / 2, 20, 0.4, col)
    score += t === 2 ? 50 * (level + 1) : 50 + Math.max(0, 9 - (row - firstRow)) * 10
    combo++
    bestCombo = Math.max(bestCombo, combo)
    env.sfx.tone(PEN[Math.min(combo - 1, PEN.length - 1)], 0.11, { type: 'triangle', gain: 0.055, room: 0.2 })
    env.sfx.tone(PEN[Math.min(combo - 1, PEN.length - 1)] * 2, 0.05, { type: 'sine', gain: 0.015 })
    // capsules: only one at a time, none during multi-ball
    if (t === 1 && !capsule && balls.length === 1 && r() < 0.16) {
      const roll = r()
      const kind: Power = roll < 0.24 ? 'E' : roll < 0.44 ? 'S' : roll < 0.64 ? 'M' : roll < 0.84 ? 'C' : 'L'
      capsule = { x: x + BW / 2, y: y + BH / 2, kind, t: 0 }
    }
    if (breakable <= 0) {
      phase = 'clear'
      phaseT = 0
      lasers = []
      capsule = null
      // the balls bow out as small rings
      for (const b of balls) rings.add(b.x, b.y, 16, 0.5, C.ink)
      balls = []
      ;[523, 659, 784, 1046, 1318].forEach((fq, k) => env.sfx.tone(fq, 0.16, { type: 'triangle', gain: 0.05, when: k * 0.09 }))
    }
  }

  function hitBrick(i: number, dirX: number, dirY: number) {
    const t = btype[i]
    speed = Math.min(maxSpeed(), speed + 2.5)
    if (t === 3) {
      bflash[i] = 0.35
      env.sfx.tone(1975, 0.06, { type: 'sine', gain: 0.03 })
      return
    }
    bhp[i]--
    if (bhp[i] > 0) {
      bflash[i] = 0.35
      env.sfx.tone(1568, 0.07, { type: 'sine', gain: 0.035 })
      score += 10
      return
    }
    breakBrick(i, dirX, dirY)
  }

  /* -------------------------------------------------------------- physics */

  function clampAngle(b: Ball) {
    const s = Math.hypot(b.vx, b.vy) || 1
    let vx = b.vx / s
    let vy = b.vy / s
    if (Math.abs(vy) < 0.3) {
      vy = Math.sign(vy || -1) * 0.3
      vx = Math.sign(vx || 1) * Math.sqrt(1 - vy * vy)
    }
    if (Math.abs(vx) < 0.06) vx = vx < 0 ? -0.06 : 0.06
    const l = Math.hypot(vx, vy)
    b.vx = (vx / l) * speed
    b.vy = (vy / l) * speed
  }

  function stepBall(b: Ball, dt: number): boolean {
    const dist = Math.hypot(b.vx, b.vy) * dt
    const steps = Math.max(1, Math.ceil(dist / 2))
    const sdt = dt / steps
    for (let k = 0; k < steps; k++) {
      const ox = b.x
      const oy = b.y
      b.x += b.vx * sdt
      b.y += b.vy * sdt
      // walls
      if (b.x < X0 + R) {
        b.x = X0 + R
        b.vx = Math.abs(b.vx)
        wallTick(b.x, b.y)
      } else if (b.x > X1 - R) {
        b.x = X1 - R
        b.vx = -Math.abs(b.vx)
        wallTick(b.x, b.y)
      }
      if (b.y < TOP + R) {
        b.y = TOP + R
        b.vy = Math.abs(b.vy)
        wallTick(b.x, b.y)
      }
      // paddle
      const top = PY - PH / 2 + pDip
      if (b.vy > 0 && b.y + R >= top && oy + R <= top + 3 && Math.abs(b.x - px) <= pw / 2 + R) {
        const off = clamp((b.x - px) / (pw / 2), -1, 1)
        const a = off * (62 * Math.PI) / 180
        b.y = top - R
        if (mode === 'C' && phase === 'live') {
          b.stuck = true
          b.off = b.x - px
          b.stuckT = 0
          b.vx = b.vy = 0
          env.sfx.tone(392, 0.08, { type: 'sine', gain: 0.05 })
        } else {
          b.vx = Math.sin(a) * speed
          b.vy = -Math.cos(a) * speed
          env.sfx.tone(196 * (1 + Math.abs(off) * 0.5), 0.09, { type: 'triangle', gain: 0.06, room: 0.1 })
        }
        pDipV = 26
        combo = 0
        botTarget = -1
        if (state === 'play' && !hintDone) {
          hintDone = true
          hintsSeen = true
        }
        sparks.emit(b.x, top, 5, { color: C.ink2, speed: 60, life: 0.3, dir: -Math.PI / 2, spread: 2.2, r })
        return true
      }
      // bricks
      const c0 = Math.floor((b.x - R - X0) / BW)
      const c1 = Math.floor((b.x + R - X0) / BW)
      const r0 = Math.floor((b.y - R - BY0) / BH)
      const r1 = Math.floor((b.y + R - BY0) / BH)
      let hit = -1
      let hd = Infinity
      for (let row = Math.max(0, r0); row <= Math.min(BROWS - 1, r1); row++)
        for (let c = Math.max(0, c0); c <= Math.min(BCOLS - 1, c1); c++) {
          const i = row * BCOLS + c
          if (!btype[i]) continue
          const bx = brickX(c)
          const by = brickY(row)
          const qx = clamp(b.x, bx, bx + BW)
          const qy = clamp(b.y, by, by + BH)
          const d = Math.hypot(b.x - qx, b.y - qy)
          if (d < R && d < hd) {
            hd = d
            hit = i
          }
        }
      if (hit >= 0) {
        const c = hit % BCOLS
        const row = Math.floor(hit / BCOLS)
        const bx = brickX(c)
        const by = brickY(row)
        const dirX = Math.sign(b.vx)
        const dirY = Math.sign(b.vy)
        const outX = ox < bx || ox > bx + BW
        const outY = oy < by || oy > by + BH
        if (outX && !outY) b.vx = -b.vx
        else if (outY && !outX) b.vy = -b.vy
        else {
          b.vx = -b.vx
          b.vy = -b.vy
        }
        b.x = ox
        b.y = oy
        hitBrick(hit, dirX, dirY)
        clampAngle(b)
        if (phase !== 'live') return true
      }
      if (b.y > LH + 12) return false
    }
    return true
  }

  function wallTick(x: number, y: number) {
    sparks.emit(x, y, 2, { color: C.muted, speed: 40, life: 0.2, r })
    env.sfx.tone(130.8, 0.05, { type: 'sine', gain: 0.03, room: 0 })
  }

  function applyPower(k: Power) {
    banner = { str: POWER_NAME[k], t: 0, col: POWER_COL[k] }
    if (k === 'L') laserHintT = 3.5
    score += 1000
    rings.add(px, PY, 40, 0.5, POWER_COL[k])
    ;[0, 4, 7, 12].forEach((s, i) => env.sfx.tone(392 * Math.pow(2, s / 12), 0.1, { type: 'triangle', gain: 0.045, when: i * 0.05 }))
    if (k === 'S') {
      speed = minSpeed()
      for (const b of balls) if (!b.stuck) clampAngle(b)
      return
    }
    if (k === 'M') {
      const src = balls.find((b) => !b.stuck) ?? balls[0]
      if (!src) return
      if (src.stuck) {
        src.stuck = false
        src.vx = 0
        src.vy = -speed
      }
      const a0 = Math.atan2(src.vx, -src.vy)
      for (const d of [-0.42, 0.42]) {
        const nb = makeBall(src.x, src.y, Math.sin(a0 + d) * speed, -Math.abs(Math.cos(a0 + d)) * speed * Math.sign(-src.vy || 1))
        clampAngle(nb)
        balls.push(nb)
      }
      return
    }
    if (mode === 'C' && k !== 'C') for (const b of balls) if (b.stuck) release(b)
    mode = k
    pwTarget = k === 'E' ? 96 : 64
  }

  function release(b: Ball) {
    if (!b.stuck) return
    const off = clamp(b.off / (pw / 2), -1, 1)
    const a = off * (55 * Math.PI) / 180
    b.stuck = false
    b.vx = Math.sin(a) * speed
    b.vy = -Math.cos(a) * speed
    clampAngle(b)
    env.sfx.tone(330, 0.08, { type: 'triangle', gain: 0.05, to: 440 })
  }

  function loseLife() {
    phase = 'lost'
    phaseT = 0
    shake = 1
    capsule = null
    lasers = []
    // the paddle comes apart into its strokes
    for (let k = 0; k < 14; k++) {
      const x = px - pw / 2 + (k / 13) * pw
      sticks.emit(x, PY + (r() - 0.5) * PH, (x - px) * 2.5 + (r() - 0.5) * 40, -60 - r() * 90, r() * Math.PI, (r() - 0.5) * 10, 4 + r() * 7, 1 + r() * 0.5, k % 3 ? C.ink : C.ink2)
    }
    rings.add(px, PY, 46, 0.7, C.ink)
    env.sfx.noise(0.7, { filter: 500, to: 120, gain: 0.16 })
    env.sfx.tone(294, 0.8, { type: 'sine', gain: 0.06, to: 73 })
  }

  /* ------------------------------------------------------------------ bot */

  /** Straight-line flight with wall reflections until the ball reaches yEnd. Fills botPath. */
  function predict(b: Ball, yEnd: number): number {
    let x = b.x
    let y = b.y
    let vx = b.vx
    let vy = b.vy
    botPath = [x, y]
    for (let k = 0; k < 8; k++) {
      if (vy <= 0) {
        // up to the ceiling first
        const tt = (y - (TOP + R)) / -vy || 0
        const nx = x + vx * tt
        if (nx < X0 + R || nx > X1 - R) {
          const wx = nx < X0 + R ? X0 + R : X1 - R
          const tw = (wx - x) / vx
          x = wx
          y += vy * tw
          vx = -vx
        } else {
          x = nx
          y = TOP + R
          vy = -vy
        }
      } else {
        const tt = (yEnd - y) / vy
        const nx = x + vx * tt
        if (nx < X0 + R || nx > X1 - R) {
          const wx = nx < X0 + R ? X0 + R : X1 - R
          const tw = (wx - x) / vx
          x = wx
          y += vy * tw
          vx = -vx
        } else {
          botPath.push(nx, yEnd)
          return nx
        }
      }
      botPath.push(x, y)
    }
    return x
  }

  function botThink(dt: number): { x: number; launch: boolean } {
    botWait -= dt
    // the ball that lands first
    let best: Ball | null = null
    let bestT = Infinity
    for (const b of balls) {
      if (b.stuck) continue
      const T = b.vy > 0 ? (PY - b.y) / b.vy : (b.y - TOP) / -b.vy + (PY - TOP) / -b.vy
      if (T < bestT) {
        bestT = T
        best = b
      }
    }
    let x = px
    let launch = false
    if (balls.some((b) => b.stuck)) {
      launch = botWait <= 0
      if (!best) botPath = []
    }
    if (best) {
      const lx = predict(best, PY - PH / 2 - R)
      // pick a brick to aim at, refreshed after every return
      if (botTarget < 0 || !btype[botTarget] || btype[botTarget] === 3) {
        const cands: number[] = []
        for (let i = 0; i < btype.length; i++) if (btype[i] === 1 || btype[i] === 2) cands.push(i)
        // prefer the lower, exposed bricks
        cands.sort((a, b) => b - a)
        botTarget = cands.length ? cands[Math.floor(Math.pow(r(), 2) * Math.min(cands.length, 18))] : -1
        botNoise = (r() - 0.5) * 0.25
      }
      let off = 0
      if (botTarget >= 0) {
        const tx = brickX(botTarget % BCOLS) + BW / 2
        const ty = brickY(Math.floor(botTarget / BCOLS)) + BH / 2
        const ang = Math.atan2(tx - lx, PY - ty)
        off = clamp(ang / ((62 * Math.PI) / 180) + botNoise, -0.82, 0.82)
      }
      x = lx - off * (pw / 2)
      // go for a capsule when the ball is safely far away
      if (capsule && bestT > 0.9) {
        const tc = (PY - capsule.y) / 80
        if (tc < bestT - 0.4) x = capsule.x
      }
    } else if (capsule) x = capsule.x
    if (mode === 'L' && phase === 'live') launch = true
    return { x, launch }
  }

  /* --------------------------------------------------------------- update */

  function update(dt: number, bot: boolean, input: boolean) {
    clock += dt
    phaseT += dt
    shake = Math.max(0, shake - dt * 3)
    for (let i = 0; i < bflash.length; i++) if (bflash[i] > 0) bflash[i] = Math.max(0, bflash[i] - dt)
    if (banner) {
      banner.t += dt
      if (banner.t > 1.4) banner = null
    }
    // paddle spring
    pDipV += (-pDip * 260 - pDipV * 16) * dt
    pDip += pDipV * dt
    pw += (pwTarget - pw) * (1 - Math.exp(-10 * dt))

    if (phase === 'wipe') {
      if (phaseT > 1.5) serve()
    } else if (phase === 'clear') {
      if (phaseT > 2.6) startWipe(level + 1)
    } else if (phase === 'lost') {
      if (phaseT > 1.4) {
        if (lives > 1) {
          lives--
          mode = null
          pwTarget = 64
          pw = 0
          serve()
        } else if (state === 'play') {
          lives = 0
          go('over')
          return
        } else {
          newGame()
          return
        }
      }
    }
    if (phase === 'serve' || phase === 'live') levelTime += dt

    // paddle control
    let launch = false
    let target = px
    if (bot) {
      const b = botThink(dt)
      target = b.x
      launch = b.launch
      const d = target - px
      px += clamp(d, -720 * dt, 720 * dt)
    } else if (input) {
      let dir = 0
      if (keys.down('ArrowLeft', 'KeyA')) dir -= 1
      if (keys.down('ArrowRight', 'KeyD')) dir += 1
      if (dir) {
        pvx = clamp(pvx + dir * 3200 * dt, -460, 460)
        if (Math.sign(pvx) !== dir) pvx = dir * 120
        px += pvx * dt
      } else {
        pvx = 0
        if (ptrX !== null) px = ptrX
      }
      launch = keys.hit('Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyX') || tapped
      // the laser keeps firing while held
      if (mode === 'L' && (keys.down('Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyX') || ptrHeld)) launch = true
    }
    px = clamp(px, X0 + pw / 2, X1 - pw / 2)

    if (phase === 'serve' || phase === 'live') {
      for (const b of balls)
        if (b.stuck) {
          b.x = px + b.off
          b.y = PY - PH / 2 - R + pDip
          b.stuckT += dt
        }
      if (phase === 'serve' && launch) {
        if (state === 'play') launchedOnce = true
        phase = 'live'
        phaseT = 0
        for (const b of balls) release(b)
        launch = false
      }
      if (phase === 'live') {
        if (launch || balls.some((b) => b.stuck && b.stuckT > 3)) {
          const stuck = balls.filter((b) => b.stuck)
          if (stuck.length) for (const b of stuck) release(b)
          else if (mode === 'L' && laserCd <= 0 && lasers.length < 4) {
            lasers.push({ x: px - pw / 2 + 5, y: PY - 8 }, { x: px + pw / 2 - 5, y: PY - 8 })
            laserCd = 0.28
            env.sfx.tone(1318, 0.06, { type: 'triangle', gain: 0.03, to: 880 })
          }
        }
      }
    }
    laserCd -= dt

    if (phase === 'live') {
      // balls
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]
        if (b.stuck) continue
        const alive = stepBall(b, dt)
        if (!alive) {
          balls.splice(i, 1)
          if (!balls.length) {
            loseLife()
            break
          }
          continue
        }
        if (phase !== 'live') break
      }
      // speed creeps up while the rally lasts
      speed = Math.min(maxSpeed(), speed + dt * 1.5)
      // lasers
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i]
        l.y -= 620 * dt
        const c = Math.floor((l.x - X0) / BW)
        const row = Math.floor((l.y - BY0) / BH)
        if (row >= 0 && row < BROWS && c >= 0 && c < BCOLS && btype[row * BCOLS + c]) {
          hitBrick(row * BCOLS + c, 0, -1)
          lasers.splice(i, 1)
          continue
        }
        if (l.y < TOP) lasers.splice(i, 1)
      }
      // capsule
      if (capsule) {
        capsule.y += 80 * dt
        capsule.t += dt
        if (capsule.y + 4.5 > PY - PH / 2 && capsule.y - 4.5 < PY + PH / 2 && Math.abs(capsule.x - px) < pw / 2 + 11) {
          applyPower(capsule.kind)
          capsule = null
        } else if (capsule.y > LH + 10) capsule = null
      }
    }
    // trails
    for (const b of balls) {
      if (dt <= 0) break
      b.tn = (b.tn + 1) % 10
      b.trail[b.tn * 2] = b.x
      b.trail[b.tn * 2 + 1] = b.y
    }
  }

  /* ----------------------------------------------------------------- draw */

  function drawWalls(hw: number) {
    // section poché: double line with 45° hatch between
    ctx.beginPath()
    hatchRect(ctx, 0, 0, WALL, LH, 3.2, -Math.PI / 4)
    hatchRect(ctx, LW - WALL, 0, WALL, LH, 3.2, -Math.PI / 4)
    hatchRect(ctx, WALL, 0, LW - WALL * 2, WALL, 3.2, -Math.PI / 4)
    ctx.strokeStyle = C.ink2
    ctx.globalAlpha = 0.35
    ctx.lineWidth = hw
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw
    ctx.beginPath()
    ctx.moveTo(X0, LH)
    ctx.lineTo(X0, TOP)
    ctx.lineTo(X1, TOP)
    ctx.lineTo(X1, LH)
    ctx.moveTo(0, LH)
    ctx.lineTo(0, 0)
    ctx.lineTo(LW, 0)
    ctx.lineTo(LW, LH)
    ctx.stroke()
    // gate marks on the side walls where the paddle runs
    ctx.strokeStyle = C.ink2
    ctx.beginPath()
    for (const x of [0, LW - WALL]) {
      ctx.moveTo(x, PY - 10)
      ctx.lineTo(x + WALL, PY - 10)
      ctx.moveTo(x, PY + 10)
      ctx.lineTo(x + WALL, PY + 10)
    }
    ctx.stroke()
  }

  function drawBricks(hw: number, clipX0 = 0, clipX1 = LW, appear = 1) {
    ctx.save()
    if (clipX0 > 0 || clipX1 < LW) {
      ctx.beginPath()
      ctx.rect(clipX0, 0, clipX1 - clipX0, LH)
      ctx.clip()
    }
    // hatch per course (inset a little inside each brick)
    for (let row = 0; row < BROWS; row++) {
      let any = false
      const [col, ang, gap, cross] = course(row)
      ctx.beginPath()
      for (let c = 0; c < BCOLS; c++) {
        const i = row * BCOLS + c
        if (btype[i] !== 1) continue
        hatchRect(ctx, brickX(c) + 2, brickY(row) + 2, BW - 4, BH - 4, gap, ang)
        if (cross) hatchRect(ctx, brickX(c) + 2, brickY(row) + 2, BW - 4, BH - 4, gap, ang + Math.PI / 2)
        any = true
      }
      if (any) {
        ctx.strokeStyle = col
        ctx.globalAlpha = 0.85 * appear
        ctx.lineWidth = hw
        ctx.stroke()
      }
    }
    // gold: dense cross-hatch
    ctx.beginPath()
    let anyGold = false
    for (let i = 0; i < btype.length; i++)
      if (btype[i] === 3) {
        const x = brickX(i % BCOLS) + 3
        const y = brickY(Math.floor(i / BCOLS)) + 3
        hatchRect(ctx, x, y, BW - 6, BH - 6, 2.2, Math.PI / 4)
        hatchRect(ctx, x, y, BW - 6, BH - 6, 2.2, -Math.PI / 4)
        anyGold = true
      }
    if (anyGold) {
      ctx.strokeStyle = C.ink2
      ctx.globalAlpha = 0.55 * appear
      ctx.lineWidth = hw
      ctx.stroke()
    }
    // outlines
    ctx.globalAlpha = appear
    ctx.lineWidth = hw
    ctx.beginPath()
    for (let i = 0; i < btype.length; i++) {
      if (btype[i] !== 1) continue
      ctx.rect(brickX(i % BCOLS) + 0.5, brickY(Math.floor(i / BCOLS)) + 0.5, BW - 1, BH - 1)
    }
    ctx.strokeStyle = C.ink
    ctx.stroke()
    // silver and gold: double outlines
    ctx.beginPath()
    for (let i = 0; i < btype.length; i++) {
      const t = btype[i]
      if (t !== 2 && t !== 3) continue
      const x = brickX(i % BCOLS)
      const y = brickY(Math.floor(i / BCOLS))
      ctx.rect(x + 0.5, y + 0.5, BW - 1, BH - 1)
      if (t === 3 || bhp[i] > 1) ctx.rect(x + 2.5, y + 2.5, BW - 5, BH - 5)
    }
    ctx.strokeStyle = C.ink
    ctx.stroke()
    // silver: a single sparse rule; gold: rivets
    ctx.beginPath()
    for (let i = 0; i < btype.length; i++) {
      const x = brickX(i % BCOLS)
      const y = brickY(Math.floor(i / BCOLS))
      if (btype[i] === 2) {
        ctx.moveTo(x + 6, y + BH / 2)
        ctx.lineTo(x + BW - 6, y + BH / 2)
      }
    }
    ctx.strokeStyle = C.ink2
    ctx.stroke()
    // shimmer: a diagonal glint sweeps across a struck silver/gold brick
    ctx.strokeStyle = C.ink
    for (let i = 0; i < btype.length; i++) {
      if (bflash[i] <= 0 || !btype[i]) continue
      const k = 1 - bflash[i] / 0.35
      const x = brickX(i % BCOLS)
      const y = brickY(Math.floor(i / BCOLS))
      const gx = x - 6 + k * (BW + 12)
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, BW, BH)
      ctx.clip()
      ctx.lineWidth = hw * 2
      ctx.globalAlpha = (1 - k) * appear
      ctx.beginPath()
      ctx.moveTo(gx - 4, y + BH)
      ctx.lineTo(gx + 4, y)
      ctx.moveTo(gx - 1, y + BH)
      ctx.lineTo(gx + 7, y)
      ctx.stroke()
      ctx.restore()
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }

  function drawPaddle(hw: number, grow = 1) {
    const w = pw * grow
    if (w < 1) return
    const x = px - w / 2
    const y = PY - PH / 2 + pDip
    const rr = PH / 2
    // capsule
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.lineTo(x + w - rr, y)
    ctx.arc(x + w - rr, y + rr, rr, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(x + rr, y + PH)
    ctx.arc(x + rr, y + rr, rr, Math.PI / 2, (3 * Math.PI) / 2)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw * 1.2
    ctx.stroke()
    // end caps, hatched
    const capW = Math.min(10, w / 4)
    // clip the caps' hatching to the capsule's rounded ends
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    hatchRect(ctx, x, y, capW, PH, 2, -Math.PI / 3)
    hatchRect(ctx, x + w - capW, y, capW, PH, 2, Math.PI / 3)
    ctx.strokeStyle = mode ? POWER_COL[mode] : C.ink2
    ctx.lineWidth = hw
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw
    ctx.beginPath()
    ctx.moveTo(x + capW, y)
    ctx.lineTo(x + capW, y + PH)
    ctx.moveTo(x + w - capW, y)
    ctx.lineTo(x + w - capW, y + PH)
    // ruler along the top: the hit zones
    for (let k = -3; k <= 3; k++) {
      const tx = px + (k / 3) * (w / 2 - capW - 2)
      const l = k === 0 ? 3.4 : 1.8
      ctx.moveTo(tx, y + PH / 2 - l / 2)
      ctx.lineTo(tx, y + PH / 2 + l / 2)
    }
    ctx.stroke()
    // catch: little hooks; laser: two turrets
    if (mode === 'C') {
      ctx.strokeStyle = C.fern
      ctx.beginPath()
      for (let k = -2; k <= 2; k++) {
        const tx = px + k * (w / 6)
        ctx.moveTo(tx, y)
        ctx.lineTo(tx, y - 2.4)
        ctx.lineTo(tx + 1.4, y - 2.4)
      }
      ctx.stroke()
    } else if (mode === 'L') {
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      for (const tx of [x + 5, x + w - 5]) {
        ctx.rect(tx - 1.6, y - 4, 3.2, 4)
        ctx.moveTo(tx, y - 4)
        ctx.lineTo(tx, y - 6)
      }
      ctx.stroke()
    }
    // a live dimension line underneath (dropped where it would be too small to read)
    if (!preview && f.s >= 1.1) {
      const dy = PY + PH / 2 + 7
      ctx.strokeStyle = rgba(C.ink, 0.45)
      ctx.beginPath()
      ctx.moveTo(x, dy - 2.5)
      ctx.lineTo(x, dy + 2.5)
      ctx.moveTo(x + w, dy - 2.5)
      ctx.lineTo(x + w, dy + 2.5)
      ctx.moveTo(x, dy)
      ctx.lineTo(px - 9, dy)
      ctx.moveTo(px + 9, dy)
      ctx.lineTo(x + w, dy)
      ctx.moveTo(x + 3, dy - 1.5)
      ctx.lineTo(x, dy)
      ctx.lineTo(x + 3, dy + 1.5)
      ctx.moveTo(x + w - 3, dy - 1.5)
      ctx.lineTo(x + w, dy)
      ctx.lineTo(x + w - 3, dy + 1.5)
      ctx.stroke()
      text(ctx, String(Math.round(w)), px, dy + 0.3, { size: 5.5, color: C.muted, align: 'center', baseline: 'middle', tracking: 0.08 })
    }
  }

  function drawBall(b: Ball, hw: number) {
    // fading trail
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw
    ctx.lineCap = 'round'
    for (let k = 1; k < 10; k++) {
      const i0 = (b.tn - k + 1 + 10) % 10
      const i1 = (b.tn - k + 10) % 10
      ctx.globalAlpha = (1 - k / 10) * 0.5
      ctx.beginPath()
      ctx.moveTo(b.trail[i0 * 2], b.trail[i0 * 2 + 1])
      ctx.lineTo(b.trail[i1 * 2], b.trail[i1 * 2 + 1])
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.arc(b.x, b.y, R, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.lineWidth = hw * 1.3
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.fillRect(b.x - 0.6, b.y - 0.6, 1.2, 1.2)
  }

  function drawCapsule(cp: Capsule, hw: number) {
    const w = 22
    const h = 9
    const x = cp.x - w / 2
    const y = cp.y - h / 2
    const col = POWER_COL[cp.kind]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + h / 2, y)
    ctx.lineTo(x + w - h / 2, y)
    ctx.arc(x + w - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(x + h / 2, y + h)
    ctx.arc(x + h / 2, y + h / 2, h / 2, Math.PI / 2, (3 * Math.PI) / 2)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = hw * 1.2
    ctx.stroke()
    ctx.clip()
    // tumbling: bands roll over the capsule's surface
    ctx.lineWidth = hw
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const ph = (cp.t * 1.6 + k / 3) % 1
      const yy = y + h * ph
      const squash = Math.sin(ph * Math.PI)
      ctx.moveTo(x, yy)
      ctx.quadraticCurveTo(cp.x, yy + (ph - 0.5) * 4 * squash, x + w, yy)
    }
    ctx.globalAlpha = 0.45
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()
    const flip = Math.cos(cp.t * 1.6 * TAU)
    text(ctx, cp.kind, cp.x, cp.y + 0.4, { size: 6.5, color: col, align: 'center', baseline: 'middle', alpha: 0.5 + 0.5 * Math.abs(flip), weight: 600, tracking: 0 })
  }

  /** Text at a field position, set in CSS px so it stays legible on small screens. */
  function ftext(str: string, fx: number, fy: number, o: TextOpts, min = 9) {
    ctx.save()
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
    text(ctx, str, f.ox + fx * f.s, f.oy + fy * f.s, { ...o, size: Math.max(min, (o.size ?? 6) * f.s) })
    ctx.restore()
  }

  function drawWorld(hw: number, bot: boolean) {
    // fine annotations only where they can be read
    const tiny = preview || f.s < 1.1
    drawWalls(hw)

    // bricks, with the section-line wipe between rounds
    if (phase === 'wipe') {
      const k = ease.inOutCubic(clamp(phaseT / 1.3))
      const wx = lerp(-4, LW + 4, k)
      drawBricks(hw, 0, wx, 1)
      // the section line: a cut with arrowheads and a round label
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hw
      ctx.setLineDash([10, 3, 2, 3])
      ctx.beginPath()
      ctx.moveTo(wx, TOP)
      ctx.lineTo(wx, LH)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      for (const yy of [TOP + 8, LH - 10]) {
        ctx.moveTo(wx, yy)
        ctx.lineTo(wx + 9, yy)
        ctx.moveTo(wx + 5, yy - 3)
        ctx.lineTo(wx + 9, yy)
        ctx.lineTo(wx + 5, yy + 3)
      }
      ctx.stroke()
      const lab = `R${String(level + 1).padStart(2, '0')}`
      ftext(lab, wx + 12, TOP + 9, { size: 6, color: C.ink, baseline: 'middle', tracking: 0.12 }, 8)
      ftext(lab, wx + 12, LH - 9, { size: 6, color: C.ink, baseline: 'middle', tracking: 0.12 }, 8)
      // a faint band of hatching trailing the line, like a page's shadow
      ctx.beginPath()
      hatchRect(ctx, wx - 14, TOP, 14, LH - TOP, 3, Math.PI / 3)
      ctx.strokeStyle = C.rule
      ctx.stroke()
    } else drawBricks(hw)

    // round label under the top wall
    if (!tiny) {
      text(ctx, `ROUND ${String(level + 1).padStart(2, '0')} · ${String(Math.max(0, breakable)).padStart(2, '0')} LEFT`, X0 + 4, TOP + 9, { size: 5.5, color: C.muted, tracking: 0.14 })
      if (balls.length && phase === 'live') text(ctx, `V ${Math.round(speed)}`, X1 - 4, TOP + 9, { size: 5.5, color: C.muted, tracking: 0.14, align: 'right' })
    }

    // the bot's predicted path
    if (bot && botPath.length >= 4 && phase === 'live' && balls.some((b) => !b.stuck && b.vy > 0)) {
      ctx.strokeStyle = rgba(C.moss, 0.4)
      ctx.lineWidth = hw
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(botPath[0], botPath[1])
      for (let i = 2; i < botPath.length; i += 2) ctx.lineTo(botPath[i], botPath[i + 1])
      ctx.stroke()
      ctx.setLineDash([])
      const lx = botPath[botPath.length - 2]
      const ly = botPath[botPath.length - 1]
      ctx.beginPath()
      ctx.moveTo(lx - 3, ly - 3)
      ctx.lineTo(lx + 3, ly + 3)
      ctx.moveTo(lx + 3, ly - 3)
      ctx.lineTo(lx - 3, ly + 3)
      ctx.stroke()
    }

    // lasers
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw * 1.3
    ctx.beginPath()
    for (const l of lasers) {
      ctx.moveTo(l.x, l.y)
      ctx.lineTo(l.x, l.y + 7)
    }
    ctx.stroke()

    if (capsule) {
      drawCapsule(capsule, hw)
      // name the capsule as it falls, so the letters teach themselves
      if (!tiny && state === 'play') text(ctx, POWER_NAME[capsule.kind], capsule.x + 15, capsule.y + 0.5, { size: 5.5, color: POWER_COL[capsule.kind], baseline: 'middle', tracking: 0.14, alpha: 0.85 })
    }

    // paddle
    if (phase !== 'lost') {
      const grow = phase === 'wipe' ? ease.outBack(clamp((phaseT - 1.1) / 0.4)) : phase === 'serve' && pw < 60 ? clamp(pw / 64) : 1
      drawPaddle(hw, grow)
    }
    for (const b of balls) drawBall(b, hw)

    sticks.draw(ctx, hw)
    sparks.draw(ctx, hw)
    rings.draw(ctx, hw)

    if (banner) {
      const a = Math.sin(clamp(banner.t / 1.4) * Math.PI)
      ftext(banner.str, LW / 2, PY - 40 - banner.t * 8, { size: 7, color: banner.col, align: 'center', tracking: 0.3, alpha: a })
    }

  }

  /** The round tally, in screen space at no less than 1.25 px per unit so it reads on small screens. */
  function drawTally() {
    if (phase !== 'clear') return
    const k = phaseT
    const lines = [
      ['ROUND', String(level + 1).padStart(2, '0')],
      ['BRICKS', String(bricksBroken).padStart(3, '0')],
      ['TIME', `${String(Math.floor(levelTime / 60)).padStart(2, '0')}:${String(Math.floor(levelTime % 60)).padStart(2, '0')}`],
      ['BEST COMBO', String(bestCombo).padStart(2, '0')],
    ]
    const u = Math.min(Math.max(f.s, 1.25), (env.width - 16) / 150, (env.height - 16) / 92)
    ctx.save()
    ctx.translate(f.ox + (LW / 2) * f.s, f.oy + (LH * 0.45) * f.s)
    ctx.scale(u, u)
    const hw = 1 / u
    const bw = 150
    const bx = -bw / 2
    const by = -46
    const a = clamp(k / 0.25) * (1 - clamp((k - 2.3) / 0.3))
    ctx.globalAlpha = a
    ctx.fillStyle = rgba(C.paper, 0.94)
    ctx.fillRect(bx, by, bw, 92)
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw
    ctx.strokeRect(bx, by, bw, 92)
    text(ctx, 'CLEAR', 0, by + 20, { font: 'serif', size: 17, color: C.ink, align: 'center', tracking: 0 })
    lines.forEach(([l, v], i) => {
      const show = clamp((k - 0.35 - i * 0.22) / 0.15)
      if (show <= 0) return
      const yy = by + 38 + i * 13
      text(ctx, l, bx + 12, yy, { size: 6, color: C.muted, tracking: 0.16, alpha: show })
      text(ctx, v, bx + bw - 12, yy, { size: 7, color: C.ink, align: 'right', tracking: 0.06, alpha: show })
      // dotted leader
      ctx.globalAlpha = a * show * 0.5
      ctx.setLineDash([1, 2.5])
      ctx.beginPath()
      ctx.moveTo(bx + 12 + l.length * 6.3, yy - 2)
      ctx.lineTo(bx + bw - 14 - v.length * 5.2, yy - 2)
      ctx.strokeStyle = C.muted
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = a
    })
    ctx.globalAlpha = 1
    ctx.restore()
  }

  /* ---------------------------------------------------------------- hints */

  /** A small boxed mono label (a callout) in screen px, kept inside the field. */
  function tag(str: string, sx: number, sy: number, a: number, col: string = C.ink2) {
    if (a <= 0.01) return
    const size = Math.max(9, 6 * f.s)
    setFont(ctx, { size, tracking: 0.16 })
    const w = ctx.measureText(str).width + size * 1.6
    const h = size * 2
    const x = clamp(sx - w / 2, f.ox + 4, f.ox + f.lw * f.s - w - 4)
    const y = clamp(sy - h / 2, f.oy + 4, f.oy + f.lh * f.s - h - 4)
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = rgba(C.paper, 0.92)
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = C.rule
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h))
    text(ctx, str, x + w / 2, y + h / 2 + 0.5, { size, align: 'center', baseline: 'middle', color: col, tracking: 0.16 })
    ctx.restore()
  }

  /**
   * Hints in screen space. Before the first return: a ghost of the move (a
   * dotted rail under the paddle, a dot and a faint paddle sliding along it)
   * and a dotted launch arrow climbing from the ball. In the moment, every
   * time: launch / release prompts while a ball waits, and a laser cue.
   */
  function drawHints(dt: number) {
    if (state !== 'play' || botParam) return
    hintAge += dt
    laserHintT = Math.max(0, laserHintT - dt)
    if (hintDone) hintOut = Math.min(1, hintOut + dt * 1.5)
    const S = (x: number) => f.ox + x * f.s
    const T = (y: number) => f.oy + y * f.s
    const ghost = clamp((hintAge - 1.4) / 0.5) * (1 - hintOut)
    const verb = lastInput === 'touch' ? 'TAP' : lastInput === 'mouse' ? 'CLICK' : 'SPACE'
    const stuck = balls.find((b) => b.stuck)
    if (ghost > 0.01 && (phase === 'serve' || phase === 'live')) {
      const cx = S(px)
      // the rail sits below the paddle's dimension line
      const cy = T(PY + PH / 2 + 16)
      const span = 70 * f.s
      const sw = Math.sin(hintAge * 2)
      ctx.save()
      ctx.globalAlpha = ghost * 0.7
      ctx.strokeStyle = C.ink2
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(cx - span, cy)
      ctx.lineTo(cx + span, cy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      for (const sg of [-1, 1]) {
        ctx.moveTo(cx + sg * (span - 5), cy - 3.5)
        ctx.lineTo(cx + sg * span, cy)
        ctx.lineTo(cx + sg * (span - 5), cy + 3.5)
      }
      ctx.stroke()
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(cx + sw * span * 0.8, cy, 2.6, 0, TAU)
      ctx.fill()
      // a faint paddle outline sliding with the dot
      ctx.strokeStyle = C.moss
      ctx.globalAlpha = ghost * 0.3
      const gw = pw * f.s
      const gx = cx + sw * span * 0.8 - gw / 2
      const gy = T(PY - PH / 2)
      const rr = (PH / 2) * f.s
      ctx.beginPath()
      ctx.moveTo(gx + rr, gy)
      ctx.lineTo(gx + gw - rr, gy)
      ctx.arc(gx + gw - rr, gy + rr, rr, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(gx + rr, gy + 2 * rr)
      ctx.arc(gx + rr, gy + rr, rr, Math.PI / 2, (3 * Math.PI) / 2)
      ctx.stroke()
      ctx.restore()
      tag(lastInput === 'touch' ? 'DRAG TO MOVE' : lastInput === 'mouse' ? 'MOVE THE POINTER' : '← →  MOVE', cx, T(PY - 34) - (stuck ? 0 : 0), ghost * (phase === 'live' ? 1 : 0))
    }
    if (stuck && (phase === 'serve' || phase === 'live')) {
      // a dotted launch arrow climbing from the waiting ball, with a dot riding it
      const a = clamp((phaseT - 0.3) / 0.4) * (launchedOnce && phase === 'serve' ? 0.75 : 1)
      const bx = S(stuck.x)
      const by = T(stuck.y)
      const ang = clamp(stuck.off / (pw / 2), -1, 1) * (55 * Math.PI) / 180
      const L = 64 * f.s + 18
      const ex = bx + Math.sin(ang) * L
      const ey = by - Math.cos(ang) * L
      ctx.save()
      ctx.globalAlpha = a * 0.75
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3])
      ctx.beginPath()
      ctx.moveTo(bx, by - 6)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex - Math.sin(ang - 0.5) * 6, ey + Math.cos(ang - 0.5) * 6)
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex - Math.sin(ang + 0.5) * 6, ey + Math.cos(ang + 0.5) * 6)
      ctx.stroke()
      const q = (hintAge * 0.9) % 1
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(lerp(bx, ex, ease.outCubic(q)), lerp(by - 6, ey, ease.outCubic(q)), 2.2, 0, TAU)
      ctx.fill()
      ctx.restore()
      tag(`${verb} TO ${phase === 'serve' ? 'LAUNCH' : 'RELEASE'}`, ex, ey - 14, a, C.moss)
    }
    if (laserHintT > 0 && mode === 'L' && phase === 'live')
      tag(lastInput === 'touch' ? 'HOLD TO FIRE THE LASER' : lastInput === 'mouse' ? 'HOLD THE BUTTON · LASER' : 'HOLD SPACE · LASER', S(px), T(PY - 44), clamp(laserHintT / 0.6), C.ink2)
  }

  if (env.params.get('state') === 'play') go('play')
  else if (env.params.get('state') === 'over') {
    newGame()
    state = 'over'
    stateT = 1
  } else newGame()

  let lastTickClear = -1

  return {
    resize(w, h) {
      f = gameFit(w, h, env.mode, LW, LH)
    },
    key(code, down) {
      if (down) lastInput = 'key'
      if (down && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(code)) ptrX = null
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'KeyZ', 'KeyX', ...START_KEYS])
    },
    pointer(p) {
      if (preview) return
      const fp = toField(f, p.x, p.y)
      const touch = p.pointerType === 'touch' || p.pointerType === 'pen'
      if (p.type === 'down' || p.type === 'move') lastInput = touch ? 'touch' : 'mouse'
      hover = p.type === 'leave' || (touch && p.type === 'up') ? null : fp
      if (p.type === 'move' || p.type === 'down') ptrX = fp.x
      if (p.type === 'down') tapped = true
      ptrHeld = p.pressed
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || tapped
      let fresh = false
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        fresh = true
      }
      if (dt > 0) {
        if (state === 'play') update(dt, botParam, !fresh)
        else update(dt, true, false)
      }
      sparks.update(dt, 120, 2.5)
      sticks.update(dt, 240)
      rings.update(dt)
      // tally ticks
      if (phase === 'clear') {
        const tick = Math.floor((phaseT - 0.35) / 0.22)
        if (tick !== lastTickClear && tick >= 0 && tick < 4) env.sfx.tone(1046 + tick * 131, 0.04, { type: 'triangle', gain: 0.03 })
        lastTickClear = tick
      }

      const isBot = state !== 'play' || botParam
      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: 'FIG. G.08 — AFTER ARKANOID, 1986' })
      enterFit(ctx, f)
      if (shake > 0) {
        const s = shake * shake * 2
        ctx.translate(Math.sin(clock * 91) * s, Math.cos(clock * 77) * s)
      }
      drawWorld(1 / f.s, isBot)
      ctx.restore()
      drawTally()
      if (!preview) {
        drawHints(dt)
        const inField = hover && hover.x >= 0 && hover.x <= LW && hover.y >= 0 && hover.y <= LH
        // the paddle is the cursor while a ball is live; a waiting ball is clickable
        env.setCursor(state !== 'play' || balls.some((b) => b.stuck) ? 'pointer' : inField && phase === 'live' ? 'none' : 'default')
      }

      const showScore = state === 'over' ? finalScore : score
      gameHud(
        ctx,
        f,
        env.mode,
        [
          { label: 'Score', value: fmtScore(showScore, 6) },
          { label: 'Lives', value: String(Math.max(0, lives)) },
          { label: 'Round', value: String((state === 'over' ? finalLevel : level) + 1).padStart(2, '0') },
        ],
        [{ label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0), 6) }],
      )

      // on wide, short screens the card may spill into the side margins
      const cx = f.side ? 0 : f.ox
      const cy = f.oy
      const cw = f.side ? env.width : f.lw * f.s
      const ch = f.lh * f.s
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, {
          kicker: 'After Arkanoid · Taito, 1986',
          title: 'Rebound',
          titleEm: 'wall',
          lines: ['Move the pointer, drag, or ← →', 'Click, tap or Space to launch'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          kicker: newRecord ? 'New best' : 'Game over',
          title: fmtScore(finalScore, 6),
          lines: [`Round ${String(finalLevel + 1).padStart(2, '0')} · Best ${fmtScore(hi.get(), 6)}`],
          prompt: 'Press Enter · Tap to play again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
      tapped = false
    },
  }
}

export default create
