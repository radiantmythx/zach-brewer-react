/*
 * STACK — after Tetris (Alexey Pajitnov, 1984).
 *
 * A 10 × 20 well drawn as a technical section: ruler ticks up both walls,
 * row numbers, a hatched ground line under the floor. The seven pieces are
 * outlined cells, each with its own "material" hatch (mirror pieces get
 * mirrored hatching), and the side panels read like a drawing's legend.
 *
 * Mechanics are guideline-faithful: SRS rotation with wall kicks, a 7-bag
 * randomiser, hold, three-piece preview, soft/hard drop, lock delay with
 * move reset, DAS/ARR, and the guideline gravity curve. Line clears strike
 * through, dissolve into hairline sparks, and the stack above settles.
 *
 * The bot is a real placement search: every rotation × column (and the
 * hold alternative) scored with Dellacherie / El-Tetris features, plus a
 * reserved right-hand well so the attract demo shows off four-line clears.
 */

import { C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, rng, Rings, Sparks, START_KEYS, TAU, text, Touch } from '../kit'
import type { Rng } from '../kit'
import type { CreatePiece } from '../types'

/* ------------------------------------------------------------- the pieces */

const COLS = 10
const ROWS = 20
const HID = 2 // hidden rows above the visible well
const TOT = ROWS + HID
const CS = 16 // cell size in playfield units

// 1 I · 2 O · 3 T · 4 S · 5 Z · 6 J · 7 L — block coordinates in their SRS boxes (x right, y down)
const NAMES = ['', 'I', 'O', 'T', 'S', 'Z', 'J', 'L']
const BASE: number[][] = [
  [],
  [0, 1, 1, 1, 2, 1, 3, 1],
  [1, 0, 2, 0, 1, 1, 2, 1],
  [1, 0, 0, 1, 1, 1, 2, 1],
  [1, 0, 2, 0, 0, 1, 1, 1],
  [0, 0, 1, 0, 1, 1, 2, 1],
  [0, 0, 0, 1, 1, 1, 2, 1],
  [2, 0, 0, 1, 1, 1, 2, 1],
]
const BOXN = [0, 4, 4, 3, 3, 3, 3, 3]
/** SHAPES[type][rot] → [x0,y0,x1,y1,…] */
const SHAPES: Int8Array[][] = BASE.map((b, t) => {
  const rots: Int8Array[] = []
  let cur = b.slice()
  for (let r = 0; r < 4; r++) {
    rots.push(Int8Array.from(cur))
    if (t === 2) continue // the O doesn't rotate
    const n = BOXN[t]
    const nx: number[] = []
    for (let i = 0; i < cur.length; i += 2) nx.push(n - 1 - cur[i + 1], cur[i])
    cur = nx
  }
  return rots
})

// SRS wall kicks, converted to y-down. Key: `${from}${to}`.
const KICK: Record<string, number[]> = {
  '01': [0, 0, -1, 0, -1, -1, 0, 2, -1, 2],
  '10': [0, 0, 1, 0, 1, 1, 0, -2, 1, -2],
  '12': [0, 0, 1, 0, 1, 1, 0, -2, 1, -2],
  '21': [0, 0, -1, 0, -1, -1, 0, 2, -1, 2],
  '23': [0, 0, 1, 0, 1, -1, 0, 2, 1, 2],
  '32': [0, 0, -1, 0, -1, 1, 0, -2, -1, -2],
  '30': [0, 0, -1, 0, -1, 1, 0, -2, -1, -2],
  '03': [0, 0, 1, 0, 1, -1, 0, 2, 1, 2],
}
const KICK_I: Record<string, number[]> = {
  '01': [0, 0, -2, 0, 1, 0, -2, 1, 1, -2],
  '10': [0, 0, 2, 0, -1, 0, 2, -1, -1, 2],
  '12': [0, 0, -1, 0, 2, 0, -1, -2, 2, 1],
  '21': [0, 0, 1, 0, -2, 0, 1, 2, -2, -1],
  '23': [0, 0, 2, 0, -1, 0, 2, -1, -1, 2],
  '32': [0, 0, -2, 0, 1, 0, -2, 1, 1, -2],
  '30': [0, 0, 1, 0, -2, 0, 1, 2, -2, -1],
  '03': [0, 0, -1, 0, 2, 0, -1, -2, 2, 1],
}

/* ------------------------------------------------------------ materials */

// Mirror pairs share a colour and get mirrored hatching (S/Z, J/L).
const COL = ['', C.lagoon, C.ink, C.moss, C.fern, C.fern, C.ocean, C.ocean]
const MAT = ['', 'VERT.', 'STIPPLE', 'CROSS', '45° R', '45° L', '63° R', '63° L']

/** Liang–Barsky: the part of the line p + s·d inside the unit square. */
function clipUnit(px: number, py: number, dx: number, dy: number): number[] | null {
  let t0 = -1e9
  let t1 = 1e9
  const P = [-dx, dx, -dy, dy]
  const Q = [px, 1 - px, py, 1 - py]
  for (let i = 0; i < 4; i++) {
    if (Math.abs(P[i]) < 1e-9) {
      if (Q[i] < 0) return null
    } else {
      const r = Q[i] / P[i]
      if (P[i] < 0) t0 = Math.max(t0, r)
      else t1 = Math.min(t1, r)
    }
  }
  if (t1 - t0 < 0.06) return null
  return [px + dx * t0, py + dy * t0, px + dx * t1, py + dy * t1]
}

/** Parallel lines at `angle` and perpendicular `gap`, clipped to the unit square. */
function lineSet(angle: number, gap: number, out: number[]) {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const nx = -dy
  const ny = dx
  const reach = 0.5 * (Math.abs(nx) + Math.abs(ny)) - 0.03
  const m = Math.floor(reach / gap)
  for (let i = -m; i <= m; i++) {
    const k = i * gap
    const s = clipUnit(0.5 + nx * k, 0.5 + ny * k, dx, dy)
    if (s) out.push(...s)
  }
}

const PAT: { segs: Float32Array; dots: Float32Array }[] = NAMES.map((_, t) => {
  const segs: number[] = []
  const dots: number[] = []
  const steep = Math.atan2(2, 1)
  if (t === 1) lineSet(Math.PI / 2, 0.25, segs)
  else if (t === 2) {
    for (const a of [0.22, 0.5, 0.78]) for (const b of [0.22, 0.5, 0.78]) dots.push(a, b)
  } else if (t === 3) {
    lineSet(Math.PI / 4, 0.3, segs)
    lineSet(-Math.PI / 4, 0.3, segs)
  } else if (t === 4) lineSet(-Math.PI / 4, 0.2, segs)
  else if (t === 5) lineSet(Math.PI / 4, 0.2, segs)
  else if (t === 6) lineSet(-steep, 0.23, segs)
  else if (t === 7) lineSet(steep, 0.23, segs)
  return { segs: Float32Array.from(segs), dots: Float32Array.from(dots) }
})

/* ------------------------------------------------------------- the rules */

const LOCK = 0.5
const DAS = 0.15
const ARR = 0.045
const gravity = (level: number) => Math.pow(Math.max(0.05, 0.8 - (level - 1) * 0.007), level - 1)

interface Piece {
  t: number
  r: number
  x: number
  y: number
}

interface Clear {
  rows: number[]
  types: Uint8Array
  sparked: Uint8Array
  t: number
  dur: number
  n: number
}

interface Game {
  board: Uint8Array
  rand: Rng
  bag: number[]
  queue: number[]
  cur: Piece | null
  hold: number
  holdUsed: boolean
  fall: number
  lockT: number
  resets: number
  lowest: number
  are: number
  clear: Clear | null
  score: number
  lines: number
  level: number
  combo: number
  b2b: boolean
  pieces: number
  counts: Int32Array
  dead: boolean
  deadT: number
  bot: boolean
  maxLevel: number
}

function collide(board: Uint8Array, t: number, r: number, x: number, y: number) {
  const s = SHAPES[t][r]
  for (let i = 0; i < 8; i += 2) {
    const c = x + s[i]
    const row = y + s[i + 1]
    if (c < 0 || c >= COLS || row >= TOT) return true
    if (row >= 0 && board[row * COLS + c]) return true
  }
  return false
}

function dropY(board: Uint8Array, t: number, r: number, x: number, y: number) {
  while (!collide(board, t, r, x, y + 1)) y++
  return y
}

function stackHeight(board: Uint8Array) {
  for (let r = 0; r < TOT; r++) for (let c = 0; c < COLS; c++) if (board[r * COLS + c]) return TOT - r
  return 0
}

/* ------------------------------------------------------------------ bot */

const scratch = new Uint8Array(TOT * COLS)
const scratch2 = new Uint8Array(TOT * COLS)

/**
 * Score a placement: El-Tetris weights (Islam El-Ashi's tuning of Pierre
 * Dellacherie's features) — landing height, eroded cells, row and column
 * transitions, holes, wells. With `reserve`, column 9 is kept open as a well
 * for four-line clears while the stack is low.
 */
function evaluate(board: Uint8Array, t: number, r: number, x: number, y: number, reserve: boolean) {
  scratch.set(board)
  const s = SHAPES[t][r]
  let rowSum = 0
  let usesWell = false
  for (let i = 0; i < 8; i += 2) {
    const row = y + s[i + 1]
    if (row < 0) return -1e9
    scratch[row * COLS + x + s[i]] = t
    rowSum += row
    if (x + s[i] === COLS - 1) usesWell = true
  }
  const landing = TOT - rowSum / 4
  // clear full rows into scratch2
  let cleared = 0
  let eroded = 0
  let w = TOT - 1
  scratch2.fill(0)
  for (let row = TOT - 1; row >= 0; row--) {
    let full = true
    for (let c = 0; c < COLS; c++)
      if (!scratch[row * COLS + c]) {
        full = false
        break
      }
    if (full) {
      cleared++
      for (let i = 0; i < 8; i += 2) if (y + s[i + 1] === row) eroded++
      continue
    }
    scratch2.set(scratch.subarray(row * COLS, row * COLS + COLS), w * COLS)
    w--
  }
  const b = scratch2
  let rowT = 0
  for (let row = 0; row < TOT; row++) {
    let prev = 1
    for (let c = 0; c < COLS; c++) {
      const v = b[row * COLS + c] ? 1 : 0
      if (v !== prev) rowT++
      prev = v
    }
    if (prev === 0) rowT++
  }
  let colT = 0
  let holes = 0
  let wells = 0
  for (let c = 0; c < COLS; c++) {
    let prev = 0
    let seen = false
    let depth = 0
    for (let row = 0; row < TOT; row++) {
      const v = b[row * COLS + c] ? 1 : 0
      if (v !== prev) colT++
      prev = v
      if (v) {
        seen = true
        depth = 0
      } else {
        if (seen) holes++
        const l = c === 0 || b[row * COLS + c - 1]
        const rr = c === COLS - 1 || b[row * COLS + c + 1]
        if (l && rr && !(reserve && c === COLS - 1)) {
          depth++
          wells += depth
        } else depth = 0
      }
    }
    if (prev === 0) colT++
  }
  let v = -4.500158825082766 * landing + 3.4181268101392694 * cleared * eroded - 3.2178882868487753 * rowT - 9.348695305445199 * colT - 7.899265427351652 * holes - 3.3855972247263626 * wells
  if (reserve) {
    if (usesWell && cleared < 4) v -= 40
    if (cleared === 4) v += 60
  }
  return v
}

interface Plan {
  hold: boolean
  r: number
  x: number
  v: number
}

function bestFor(board: Uint8Array, t: number, from: Piece, reserve: boolean): Plan | null {
  let best: Plan | null = null
  const nRot = t === 2 ? 1 : 4
  for (let r = 0; r < nRot; r++) {
    if (collide(board, t, r, from.x, from.y)) continue
    // walk left and right from the current column at the current height
    for (const dir of [-1, 1]) {
      for (let x = dir === -1 ? from.x : from.x + 1; ; x += dir) {
        if (collide(board, t, r, x, from.y)) break
        const y = dropY(board, t, r, x, from.y)
        const v = evaluate(board, t, r, x, y, reserve)
        if (!best || v > best.v) best = { hold: false, r, x, v }
      }
    }
  }
  return best
}

function think(g: Game, allowHold: boolean): Plan | null {
  const p = g.cur
  if (!p) return null
  const reserve = stackHeight(g.board) < 11
  const a = bestFor(g.board, p.t, p, reserve)
  if (allowHold && !g.holdUsed) {
    const alt = g.hold || g.queue[0]
    if (alt && alt !== p.t) {
      const s = { t: alt, r: 0, x: 3, y: p.y }
      const b = bestFor(g.board, alt, s, reserve)
      if (b && (!a || b.v > a.v + 4)) return { ...b, hold: true }
    }
  }
  return a
}

/* ------------------------------------------------------------- layout */

interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface Layout {
  lw: number
  lh: number
  wx: number
  wy: number
  hold: Box
  next: Box
  side: Box | null
  log: Box | null
  portrait: boolean
  /** a short screen: the well takes the whole height, only hold and next remain beside it */
  short: boolean
}

function layoutFor(w: number, h: number): Layout {
  if (w / h < 0.8) {
    return { lw: 200, lh: 420, wx: 20, wy: 84, hold: { x: 20, y: 6, w: 52, h: 60 }, next: { x: 80, y: 6, w: 100, h: 60 }, side: null, log: null, portrait: true, short: false }
  }
  if (h < 470) {
    return { lw: 356, lh: 340, wx: 98, wy: 8, hold: { x: 8, y: 8, w: 74, h: 66 }, next: { x: 274, y: 8, w: 74, h: 168 }, side: null, log: null, portrait: false, short: true }
  }
  return {
    lw: 356,
    lh: 356,
    wx: 98,
    wy: 18,
    hold: { x: 8, y: 18, w: 74, h: 66 },
    next: { x: 274, y: 18, w: 74, h: 168 },
    side: { x: 8, y: 100, w: 74, h: 238 },
    log: { x: 274, y: 202, w: 74, h: 136 },
    portrait: false,
    short: false,
  }
}

/* ------------------------------------------------------------------ game */

type State = 'attract' | 'title' | 'play' | 'over'

interface Callout {
  head: string
  sub: string
  y: number
  t: number
  big: boolean
}

const CHORDS = [
  [261.63, 329.63, 392.0, 523.25],
  [220.0, 261.63, 329.63, 440.0],
  [174.61, 220.0, 261.63, 349.23],
  [196.0, 246.94, 293.66, 392.0],
]

const create: CreatePiece = (env) => {
  const { ctx } = env
  const full = env.mode === 'full'
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(full ? 900 : 260)
  const rings = new Rings()
  const vr = rng(19)
  const botParam = env.params.get('bot') === '1'
  let L = layoutFor(env.width, env.height)
  let f = gameFit(env.width, env.height, env.mode, L.lw, L.lh)

  let state: State = full ? 'title' : 'attract'
  let stateT = 0
  let seed = 3
  let newRecord = false
  let finalScore = 0
  let finalLines = 0
  let finalLevel = 1

  // visual state
  let shake = 0
  let spawnT = 1
  let rotPulse = 0
  let visX = 3
  let visY = 0
  let lockFlash: { cells: number[]; t: number } | null = null
  let drop: { t: number; from: Float32Array } | null = null
  const trails: { x0: number; x1: number; y0: number; y1: number; t: number; col: string }[] = []
  const callouts: Callout[] = []
  const log: string[] = []
  let chordI = 0
  let levelFlash = 1

  // bot state
  const bot = { plan: null as Plan | null, wait: 0, r: rng(5), soft: false }

  // keyboard state
  let dasDir = 0
  let dasT = 0
  let arrT = 0
  let touchSoft = false
  // interaction affordances (full mode only)
  let hover: { x: number; y: number } | null = null
  let usesTouch = false
  let hintA = full ? 1 : 0 // the first-play hint; fades once two pieces have been placed
  let firstGame = true
  let hintT = 0
  const hintLabels: [string, number, number, boolean, CanvasTextAlign][] = []

  function newGame(botGame: boolean): Game {
    const g: Game = {
      board: new Uint8Array(TOT * COLS),
      rand: rng(seed++ * 7919),
      bag: [],
      queue: [],
      cur: null,
      hold: 0,
      holdUsed: false,
      fall: 0,
      lockT: 0,
      resets: 0,
      lowest: 0,
      are: 0.25,
      clear: null,
      score: 0,
      lines: 0,
      level: 1,
      combo: -1,
      b2b: false,
      pieces: 0,
      counts: new Int32Array(8),
      dead: false,
      deadT: 0,
      bot: botGame,
      maxLevel: botGame ? 7 : 20,
    }
    while (g.queue.length < 5) g.queue.push(pull(g))
    return g
  }

  function pull(g: Game) {
    if (!g.bag.length) {
      g.bag = [1, 2, 3, 4, 5, 6, 7]
      for (let i = 6; i > 0; i--) {
        const j = Math.floor(g.rand() * (i + 1))
        const tmp = g.bag[i]
        g.bag[i] = g.bag[j]
        g.bag[j] = tmp
      }
    }
    return g.bag.pop()!
  }

  let g = newGame(true)
  const audible = () => state === 'play'

  /* --------------------------------------------------------- mechanics */

  function spawn(type?: number) {
    const t = type ?? g.queue.shift()!
    if (type === undefined) g.queue.push(pull(g))
    const s = SHAPES[t][0]
    let minY = 9
    for (let i = 1; i < 8; i += 2) minY = Math.min(minY, s[i])
    let y = HID - minY
    while (y > -2 && collide(g.board, t, 0, 3, y)) y--
    if (collide(g.board, t, 0, 3, y)) {
      die()
      return
    }
    g.cur = { t, r: 0, x: 3, y }
    g.fall = 0
    g.lockT = 0
    g.resets = 0
    g.lowest = y
    spawnT = 0
    visX = 3
    visY = y - 0.6
    bot.plan = null
  }

  function grounded() {
    const p = g.cur!
    return collide(g.board, p.t, p.r, p.x, p.y + 1)
  }

  function afterShift() {
    if (g.lockT > 0 || grounded()) {
      if (g.resets < 15) g.lockT = 0
      g.resets++
    }
  }

  function move(dx: number) {
    const p = g.cur
    if (!p || g.clear || g.dead) return false
    if (collide(g.board, p.t, p.r, p.x + dx, p.y)) return false
    p.x += dx
    afterShift()
    if (audible()) env.sfx.tone(1320 + dx * 60, 0.025, { type: 'sine', gain: 0.035, room: 0.05 })
    return true
  }

  function rotate(dir: number) {
    const p = g.cur
    if (!p || g.clear || g.dead) return false
    if (p.t === 2) {
      rotPulse = 0.5
      return true
    }
    const to = (p.r + dir + 4) % 4
    const k = (p.t === 1 ? KICK_I : KICK)[`${p.r}${to}`]
    for (let i = 0; i < k.length; i += 2) {
      if (!collide(g.board, p.t, to, p.x + k[i], p.y + k[i + 1])) {
        p.x += k[i]
        p.y += k[i + 1]
        p.r = to
        if (p.y > g.lowest) {
          g.lowest = p.y
          g.resets = 0
        }
        afterShift()
        rotPulse = 1
        if (audible()) env.sfx.tone(dir > 0 ? 990 : 880, 0.035, { type: 'triangle', gain: 0.04, room: 0.05 })
        return true
      }
    }
    return false
  }

  function hardDrop() {
    const p = g.cur
    if (!p || g.clear || g.dead) return
    const y = dropY(g.board, p.t, p.r, p.x, p.y)
    const d = y - p.y
    if (!g.bot) g.score += d * 2
    // speed lines, one per occupied column
    const s = SHAPES[p.t][p.r]
    let minC = 99
    let maxC = -1
    let topR = 99
    for (let i = 0; i < 8; i += 2) {
      minC = Math.min(minC, p.x + s[i])
      maxC = Math.max(maxC, p.x + s[i])
      topR = Math.min(topR, p.y + s[i + 1])
    }
    if (d > 0) trails.push({ x0: minC, x1: maxC + 1, y0: topR, y1: topR + d, t: 0, col: COL[p.t] })
    p.y = y
    visY = y
    shake = Math.max(shake, Math.min(2.6, 0.8 + d * 0.09))
    // dust at the landing edge
    for (let i = 0; i < 8; i += 2) {
      const cx = L.wx + (p.x + s[i] + 0.5) * CS
      const cy = L.wy + (p.y + s[i + 1] - HID + 1) * CS
      sparks.emit(cx, cy, full ? 2 : 1, { speed: 60, life: 0.35, color: COL[p.t], dir: -Math.PI / 2, spread: 2.6, r: vr })
    }
    if (audible()) {
      env.sfx.noise(0.09, { filter: 1400, to: 260, gain: 0.09, room: 0.1 })
      env.sfx.tone(98, 0.14, { type: 'sine', gain: 0.14, room: 0.1 })
    }
    lock()
  }

  function holdPiece() {
    const p = g.cur
    if (!p || g.holdUsed || g.clear || g.dead) return
    g.holdUsed = true
    const t = p.t
    if (g.hold) {
      const h = g.hold
      g.hold = t
      spawn(h)
    } else {
      g.hold = t
      spawn()
    }
    if (audible()) {
      env.sfx.tone(587.33, 0.06, { type: 'triangle', gain: 0.05 })
      env.sfx.tone(783.99, 0.07, { type: 'triangle', gain: 0.05, when: 0.05 })
    }
  }

  function die() {
    g.dead = true
    g.deadT = 0
    g.cur = null
    if (state === 'play' && !g.bot) {
      finalScore = g.score
      finalLines = g.lines
      finalLevel = g.level
      go('over')
      env.sfx.tone(392, 0.4, { type: 'triangle', gain: 0.07, filter: 1800 })
      env.sfx.tone(329.63, 0.4, { type: 'triangle', gain: 0.07, filter: 1800, when: 0.16 })
      env.sfx.tone(261.63, 0.5, { type: 'triangle', gain: 0.07, filter: 1800, when: 0.32 })
      env.sfx.tone(196, 0.9, { type: 'triangle', gain: 0.07, filter: 1400, when: 0.48 })
    }
  }

  function lock() {
    const p = g.cur
    if (!p) return
    const s = SHAPES[p.t][p.r]
    const cells: number[] = []
    let above = true
    const touched = new Set<number>()
    for (let i = 0; i < 8; i += 2) {
      const row = p.y + s[i + 1]
      const c = p.x + s[i]
      if (row >= 0) {
        g.board[row * COLS + c] = p.t
        cells.push(row * COLS + c)
        touched.add(row)
      }
      if (row >= HID) above = false
    }
    g.counts[p.t]++
    g.pieces++
    g.cur = null
    g.holdUsed = false
    lockFlash = { cells, t: 0 }
    if (above) {
      die()
      return
    }
    const rows = [...touched].filter((row) => {
      for (let c = 0; c < COLS; c++) if (!g.board[row * COLS + c]) return false
      return true
    })
    rows.sort((a, b) => a - b)
    if (rows.length) {
      const n = rows.length
      const types = new Uint8Array(n * COLS)
      rows.forEach((row, i) => types.set(g.board.subarray(row * COLS, row * COLS + COLS), i * COLS))
      g.combo++
      let pts = [0, 100, 300, 500, 800][n] * g.level
      if (n === 4 && g.b2b) pts = Math.round(pts * 1.5)
      if (g.combo > 0) pts += 50 * g.combo * g.level
      g.b2b = n === 4
      g.score += pts
      g.lines += n
      const lv = Math.min(g.maxLevel, 1 + Math.floor(g.lines / 10))
      const levelUp = lv > g.level
      g.level = lv
      g.clear = { rows, types, sparked: new Uint8Array(n * COLS), t: 0, dur: n === 4 ? 0.56 : 0.36, n }
      onClear(rows, n, pts, levelUp)
    } else {
      g.combo = -1
      g.are = 0.05
      if (audible()) {
        env.sfx.tone(196, 0.08, { type: 'sine', gain: 0.07, room: 0.05 })
        env.sfx.noise(0.035, { filter: 700, gain: 0.04, room: 0.05 })
      }
    }
  }

  function onClear(rows: number[], n: number, pts: number, levelUp: boolean) {
    const word = ['', 'Single', 'Double', 'Triple', 'Four lines'][n]
    const midRow = (rows[0] + rows[rows.length - 1]) / 2 - HID + 0.5
    callouts.push({ head: word, sub: `+${pts}`, y: L.wy + midRow * CS, t: 0, big: n === 4 })
    if (callouts.length > 3) callouts.shift()
    log.unshift(`${String(g.pieces).padStart(3, '0')} ×${n}  +${pts}`)
    if (log.length > 7) log.pop()
    if (n === 4) {
      shake = 4
      const cy = L.wy + midRow * CS
      rings.add(L.wx + COLS * CS * 0.5, cy, 52, 0.6, C.moss)
      rings.add(L.wx + COLS * CS * 0.5, cy, 84, 0.85, C.ink, 20)
    }
    // chords on clears: I–vi–IV–V, n notes of the chord, arpeggiated
    const gain = audible() ? 0.075 : state === 'title' || state === 'over' ? 0.025 : 0
    if (gain > 0) {
      const ch = CHORDS[chordI++ % CHORDS.length]
      for (let i = 0; i < Math.min(4, n + (n === 4 ? 0 : 1)); i++) env.sfx.tone(ch[i], n === 4 ? 1.2 : 0.7, { type: 'triangle', gain, filter: 2600, when: i * 0.045, room: 0.3 })
      if (n === 4) {
        env.sfx.tone(ch[0] * 2, 1.4, { type: 'sine', gain: gain * 0.8, when: 0.2, room: 0.4 })
        env.sfx.tone(ch[2] * 2, 1.4, { type: 'sine', gain: gain * 0.6, when: 0.28, room: 0.4 })
        env.sfx.noise(0.5, { filter: 3000, to: 600, gain: gain * 0.6 })
      }
    }
    if (levelUp) {
      levelFlash = 0
      if (audible()) [523.25, 587.33, 659.25, 783.99, 880].forEach((fq, i) => env.sfx.tone(fq, 0.18, { type: 'triangle', gain: 0.05, when: 0.25 + i * 0.06 }))
    }
  }

  function finishClear() {
    const cl = g.clear!
    const from = new Float32Array(TOT)
    const nb = new Uint8Array(TOT * COLS)
    let w = TOT - 1
    let k = 0
    for (let row = TOT - 1; row >= 0; row--) {
      if (cl.rows.includes(row)) {
        k++
        continue
      }
      nb.set(g.board.subarray(row * COLS, row * COLS + COLS), w * COLS)
      from[w] = k
      w--
    }
    g.board = nb
    g.clear = null
    drop = { t: 0, from }
    spawn()
  }

  function step(dt: number, soft: boolean) {
    if (g.dead) {
      g.deadT += dt
      return
    }
    if (g.clear) {
      g.clear.t += dt
      if (g.clear.t >= g.clear.dur) finishClear()
      return
    }
    if (!g.cur) {
      g.are -= dt
      if (g.are <= 0) spawn()
      return
    }
    const p = g.cur
    const grav = 1 / gravity(g.level)
    const rate = soft ? Math.max(grav * 20, 32) : grav
    g.fall += dt * rate
    while (g.fall >= 1) {
      g.fall -= 1
      if (!collide(g.board, p.t, p.r, p.x, p.y + 1)) {
        p.y++
        if (soft && !g.bot) g.score += 1
        if (p.y > g.lowest) {
          g.lowest = p.y
          g.resets = 0
          g.lockT = 0
        }
      } else {
        g.fall = 0
        break
      }
    }
    if (grounded()) {
      g.lockT += dt * (soft ? 2 : 1)
      if (g.lockT >= LOCK || g.resets >= 15) lock()
    }
  }

  /* --------------------------------------------------------------- bot */

  function botUpdate(dt: number) {
    const p = g.cur
    if (!p || g.clear || g.dead) {
      bot.soft = false
      return
    }
    if (!bot.plan) {
      bot.plan = think(g, true)
      bot.wait = 0.16 + bot.r() * 0.16
      bot.soft = false
      if (!bot.plan) return
    }
    bot.wait -= dt
    if (bot.wait > 0) return
    const pl = bot.plan
    const pace = g.level > 4 ? 0.75 : 1
    if (pl.hold && !g.holdUsed) {
      holdPiece()
      bot.plan = null
      return
    }
    if (p.r !== pl.r) {
      const diff = (pl.r - p.r + 4) % 4
      if (!rotate(diff === 3 ? -1 : 1)) pl.r = p.r
      bot.wait = (0.07 + bot.r() * 0.04) * pace
      return
    }
    if (p.x !== pl.x) {
      if (!move(Math.sign(pl.x - p.x))) pl.x = p.x
      bot.wait = (0.055 + bot.r() * 0.035) * pace
      return
    }
    if (bot.soft) return
    if (bot.r() < 0.18 && g.level < 4) bot.soft = true
    else hardDrop()
  }

  /* ------------------------------------------------------------- states */

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') {
      g = newGame(botParam)
      g.maxLevel = 20
      resetVisuals()
      chordI = 0
      hintA = full && !botParam && firstGame ? 1 : 0
      firstGame = false
      hintT = 0
    }
    if (next === 'over') newRecord = hi.submit(finalScore)
  }

  function resetVisuals() {
    sparks.clear()
    rings.clear()
    trails.length = 0
    callouts.length = 0
    log.length = 0
    drop = null
    lockFlash = null
    dasDir = 0
    bot.plan = null
  }

  /** Dissolve whatever is on the board into sparks (attract resets). */
  function burst() {
    for (let row = HID; row < TOT; row++)
      for (let c = 0; c < COLS; c++) {
        const t = g.board[row * COLS + c]
        if (t && vr() < 0.6) sparks.emit(L.wx + (c + 0.5) * CS, L.wy + (row - HID + 0.5) * CS, 2, { speed: 90, life: 0.7, color: COL[t], r: vr })
      }
  }

  /** Build a plausible finished board quickly (for &state=over). */
  function simulate(pieces: number) {
    for (let i = 0; i < pieces && !g.dead; i++) {
      if (!g.cur) spawn()
      const pl = think(g, false)
      const p = g.cur
      if (!pl || !p) break
      p.r = pl.r
      p.x = pl.x
      p.y = dropY(g.board, p.t, p.r, p.x, p.y)
      lock()
      if (g.clear) {
        g.clear.t = g.clear.dur
        finishClear()
        drop = null
      }
    }
    callouts.length = 0
  }

  const ps = env.params.get('state')
  if (ps === 'play') go('play')
  else if (ps === 'title' && full) go('title')
  else if (ps === 'over') {
    g = newGame(false)
    simulate(46)
    // top it out with the next few pieces stacked in the middle
    for (let k = 0; k < 8; k++) {
      if (!g.cur) spawn()
      if (g.dead || !g.cur) break
      g.cur.x = 3 + (k % 3) - 1
      g.cur.y = dropY(g.board, g.cur.t, g.cur.r, g.cur.x, g.cur.y)
      lock()
    }
    finalScore = g.score
    finalLines = g.lines
    finalLevel = g.level
    if (!g.dead) die()
    state = 'over' // straight to the card, without touching the stored best
    stateT = 0
    g.deadT = 0.2
  }

  /* --------------------------------------------------------------- input */

  let pd: { x: number; y: number; t: number; cols: number; rows: number; moved: boolean; done: boolean } | null = null

  function overHold(x: number, y: number, slop: number) {
    const fx = (x - f.ox) / f.s
    const fy = (y - f.oy) / f.s
    const hb = L.hold
    return fx >= hb.x - slop && fx <= hb.x + hb.w + slop && fy >= hb.y - slop && fy <= hb.y + hb.h + slop
  }
  function overWell(x: number, y: number) {
    const fx = (x - f.ox) / f.s
    const fy = (y - f.oy) / f.s
    return fx >= L.wx - 6 && fx <= L.wx + COLS * CS + 6 && fy >= L.wy - 6 && fy <= L.wy + ROWS * CS + 6
  }

  function pointerPlay(type: string, x: number, y: number, isTouch: boolean) {
    const cell = CS * f.s
    const now = performance.now()
    if (type === 'down') {
      pd = { x, y, t: now, cols: 0, rows: 0, moved: false, done: false }
      return
    }
    if (!pd) return
    const dx = x - pd.x
    const dy = y - pd.y
    const el = Math.max(1, now - pd.t)
    if (type === 'move' && !pd.done) {
      if (Math.abs(dx) > Math.abs(dy) * 0.8 || pd.cols) {
        const target = Math.round(dx / (cell * 0.85))
        while (pd.cols < target && move(1)) pd.cols++
        while (pd.cols > target && move(-1)) pd.cols--
        if (Math.abs(dx) > 8) pd.moved = true
      }
      if (dy > cell * 1.6 && dy > Math.abs(dx) * 1.4 && dy / el > 0.75) {
        hardDrop()
        pd.done = true
        pd.moved = true
      } else if (dy < -cell * 2 && -dy > Math.abs(dx) * 1.4) {
        holdPiece()
        pd.done = true
        pd.moved = true
      } else if (dy > cell * 0.9 && dy > Math.abs(dx) * 1.4) {
        touchSoft = true
        pd.moved = true
      }
      return
    }
    if (type === 'up' || type === 'leave') {
      if (!pd.done && dy > cell * 1.4 && dy / el > 0.5 && dy > Math.abs(dx) * 1.4) hardDrop()
      else if (!pd.moved && el < 340 && Math.hypot(dx, dy) < (isTouch ? 22 : 14)) {
        const fx = (x - f.ox) / f.s
        if (overHold(x, y, isTouch ? 10 : 0)) holdPiece()
        else rotate(fx < L.wx + COLS * CS * 0.25 && !L.portrait ? -1 : 1)
      }
      touchSoft = false
      pd = null
    }
  }

  function playInput(dt: number) {
    const lHeld = keys.down('ArrowLeft', 'KeyA')
    const rHeld = keys.down('ArrowRight', 'KeyD')
    if (keys.hit('ArrowLeft', 'KeyA')) {
      dasDir = -1
      dasT = 0
      arrT = 0
      move(-1)
    }
    if (keys.hit('ArrowRight', 'KeyD')) {
      dasDir = 1
      dasT = 0
      arrT = 0
      move(1)
    }
    if ((dasDir === -1 && !lHeld) || (dasDir === 1 && !rHeld)) {
      dasDir = lHeld ? -1 : rHeld ? 1 : 0
      dasT = 0
      arrT = 0
    }
    if (dasDir) {
      dasT += dt
      if (dasT >= DAS) {
        arrT += dt
        while (arrT >= ARR) {
          arrT -= ARR
          if (!move(dasDir)) {
            arrT = 0
            break
          }
        }
      }
    }
    if (keys.hit('ArrowUp', 'KeyX', 'KeyW')) rotate(1)
    if (keys.hit('KeyZ')) rotate(-1)
    if (keys.hit('KeyC', 'ShiftLeft', 'ShiftRight')) holdPiece()
    if (keys.hit('Space')) hardDrop()
  }

  /* ------------------------------------------------------------- drawing */

  const batch: number[][] = [[], [], [], [], [], [], [], []]
  function addCell(t: number, x: number, y: number, s: number) {
    batch[t].push(x, y, s)
  }
  function flush(aOut: number, aHatch: number, lw: number, col?: string) {
    ctx.lineWidth = lw
    for (let t = 1; t < 8; t++) {
      const b = batch[t]
      if (!b.length) continue
      const colour = col ?? COL[t]
      ctx.strokeStyle = colour
      ctx.fillStyle = colour
      ctx.globalAlpha = aOut
      ctx.beginPath()
      for (let i = 0; i < b.length; i += 3) {
        const ins = b[i + 2] * 0.09
        ctx.rect(b[i] + ins, b[i + 1] + ins, b[i + 2] - ins * 2, b[i + 2] - ins * 2)
      }
      ctx.stroke()
      if (aHatch > 0) {
        ctx.globalAlpha = aHatch
        const pat = PAT[t]
        if (pat.segs.length) {
          ctx.beginPath()
          for (let i = 0; i < b.length; i += 3) {
            const ins = b[i + 2] * 0.09
            const ox = b[i] + ins
            const oy = b[i + 1] + ins
            const sz = b[i + 2] - ins * 2
            const sg = pat.segs
            for (let j = 0; j < sg.length; j += 4) {
              ctx.moveTo(ox + sg[j] * sz, oy + sg[j + 1] * sz)
              ctx.lineTo(ox + sg[j + 2] * sz, oy + sg[j + 3] * sz)
            }
          }
          ctx.stroke()
        }
        if (pat.dots.length) {
          ctx.beginPath()
          for (let i = 0; i < b.length; i += 3) {
            const ins = b[i + 2] * 0.09
            const sz = b[i + 2] - ins * 2
            const d = Math.max(1.1 / f.s, sz * 0.085)
            const dt = pat.dots
            for (let j = 0; j < dt.length; j += 2) ctx.rect(b[i] + ins + dt[j] * sz - d / 2, b[i + 1] + ins + dt[j + 1] * sz - d / 2, d, d)
          }
          ctx.fill()
        }
      }
      b.length = 0
    }
    ctx.globalAlpha = 1
  }

  function drawMini(t: number, cx: number, cy: number, c: number) {
    const s = SHAPES[t][0]
    let x0 = 9
    let x1 = -9
    let y0 = 9
    let y1 = -9
    for (let i = 0; i < 8; i += 2) {
      x0 = Math.min(x0, s[i])
      x1 = Math.max(x1, s[i])
      y0 = Math.min(y0, s[i + 1])
      y1 = Math.max(y1, s[i + 1])
    }
    const w = (x1 - x0 + 1) * c
    const h = (y1 - y0 + 1) * c
    for (let i = 0; i < 8; i += 2) addCell(t, cx - w / 2 + (s[i] - x0) * c, cy - h / 2 + (s[i + 1] - y0) * c, c)
  }

  const SX = (x: number) => f.ox + x * f.s
  const SY = (y: number) => f.oy + y * f.s

  function panel(b: Box, lw: number) {
    ctx.lineWidth = lw
    ctx.strokeStyle = C.ink
    ctx.globalAlpha = 0.55
    ctx.strokeRect(b.x, b.y, b.w, b.h)
    ctx.globalAlpha = 1
  }

  function drawWell() {
    const x0 = L.wx
    const y0 = L.wy
    const W = COLS * CS
    const H = ROWS * CS
    const hl = 1 / f.s
    // construction points at every cell corner
    ctx.fillStyle = C.ink
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    const d = Math.max(0.9 / f.s, 0.7)
    for (let r = 1; r < ROWS; r++) for (let c = 1; c < COLS; c++) ctx.rect(x0 + c * CS - d / 2, y0 + r * CS - d / 2, d, d)
    ctx.fill()
    // faint rule at every fifth row
    ctx.globalAlpha = 0.06
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hl
    ctx.beginPath()
    for (let r = 5; r < ROWS; r += 5) {
      ctx.moveTo(x0, y0 + H - r * CS)
      ctx.lineTo(x0 + W, y0 + H - r * CS)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    // walls
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hl
    ctx.beginPath()
    ctx.moveTo(x0, y0 - 6)
    ctx.lineTo(x0, y0 + H)
    ctx.moveTo(x0 + W, y0 - 6)
    ctx.lineTo(x0 + W, y0 + H)
    // opening serifs
    ctx.moveTo(x0 - 4, y0 - 6)
    ctx.lineTo(x0, y0 - 6)
    ctx.moveTo(x0 + W, y0 - 6)
    ctx.lineTo(x0 + W + 4, y0 - 6)
    ctx.stroke()
    // ruler ticks up both walls
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    for (let r = 0; r <= ROWS; r++) {
      const y = y0 + H - r * CS
      const len = r % 5 === 0 ? 5 : 2.5
      ctx.moveTo(x0, y)
      ctx.lineTo(x0 - len, y)
      ctx.moveTo(x0 + W, y)
      ctx.lineTo(x0 + W + len, y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    // the dashed limit line at the top of the visible well
    ctx.setLineDash([2, 3])
    ctx.globalAlpha = 0.28
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + W, y0)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    // the floor: a heavier ground line with earth hatching beneath
    ctx.lineWidth = 2 / f.s
    ctx.beginPath()
    ctx.moveTo(x0 - 6, y0 + H)
    ctx.lineTo(x0 + W + 6, y0 + H)
    ctx.stroke()
    ctx.lineWidth = hl
    ctx.globalAlpha = 0.45
    ctx.beginPath()
    for (let x = x0 - 4; x <= x0 + W + 4; x += 4) {
      ctx.moveTo(x, y0 + H + 1)
      ctx.lineTo(x - 5, y0 + H + 6)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function rowOffset(row: number) {
    if (!drop) return 0
    const k = clamp(drop.t / 0.2)
    return -drop.from[row] * (1 - ease.inOutCubic(k))
  }

  function drawBoard() {
    const x0 = L.wx
    const y0 = L.wy - HID * CS
    const cl = g.clear
    const dead = g.dead
    const flashCells = lockFlash && lockFlash.t < 0.22 ? lockFlash.cells : null
    // rows struck on game over, from the bottom up
    const struck = dead ? Math.floor(g.deadT / 0.045) : 0
    for (let row = HID; row < TOT; row++) {
      if (cl && cl.rows.includes(row)) continue
      const isStruck = dead && TOT - 1 - row < struck
      const oy = rowOffset(row)
      for (let c = 0; c < COLS; c++) {
        const t = g.board[row * COLS + c]
        if (!t) continue
        if (isStruck) addCell(t, x0 + c * CS, y0 + (row + oy) * CS, CS)
        else addCell(t, x0 + c * CS, y0 + (row + oy) * CS, CS)
      }
    }
    if (dead) {
      flush(0.5, 0.18, 1 / f.s, C.ink2)
      // strike every finished row
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1 / f.s
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = pass ? 0.75 : 0.2
        ctx.beginPath()
        for (let i = 0; i < Math.min(struck, ROWS); i++) {
          const row = TOT - 1 - i
          let any = false
          for (let c = 0; c < COLS; c++) if (g.board[row * COLS + c]) any = true
          if (any !== !!pass) continue
          const y = L.wy + (ROWS - 1 - i + 0.5) * CS
          ctx.moveTo(x0 - 3, y)
          ctx.lineTo(x0 + COLS * CS + 3, y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      return
    }
    flush(0.82, 0.5, 1 / f.s)
    // lock flash: the just-set piece in ink, fading
    if (flashCells && lockFlash) {
      const a = 1 - lockFlash.t / 0.22
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.6 / f.s
      ctx.globalAlpha = a * 0.8
      ctx.beginPath()
      for (const idx of flashCells) {
        const row = Math.floor(idx / COLS)
        const c = idx % COLS
        if (row < HID) continue
        ctx.rect(x0 + c * CS + 1.4, y0 + (row + rowOffset(row)) * CS + 1.4, CS - 2.8, CS - 2.8)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (cl) drawClear(cl)
  }

  function drawClear(cl: Clear) {
    const x0 = L.wx
    const W = COLS * CS
    const four = cl.n === 4
    const strikeDur = four ? 0.2 : 0.13
    cl.rows.forEach((row, i) => {
      const y = L.wy + (row - HID) * CS
      const lr = (row & 1) === 0
      const st = cl.t - (four ? i * 0.035 : 0)
      // cells dissolve in the direction of the strike
      for (let c = 0; c < COLS; c++) {
        const t = cl.types[i * COLS + c]
        const order = lr ? c : COLS - 1 - c
        const k = clamp((st - 0.09 - order * 0.012) / 0.16)
        if (k > 0 && !cl.sparked[i * COLS + c]) {
          cl.sparked[i * COLS + c] = 1
          const cx = x0 + (c + 0.5) * CS
          sparks.emit(cx, y + CS / 2, full ? (four ? 7 : 4) : 2, { speed: four ? 150 : 95, life: four ? 0.8 : 0.55, color: COL[t], dir: -Math.PI / 2 + (lr ? 0.5 : -0.5), spread: 3.4, r: vr })
        }
        if (k >= 1) continue
        const sz = CS * (1 - ease.inCubic(k) * 0.8)
        addCell(t, x0 + c * CS + (CS - sz) / 2, y + (CS - sz) / 2, sz)
      }
      flush(0.85, 0.5, 1 / f.s)
      // the strike
      const sk = clamp(st / strikeDur)
      const fade = 1 - clamp((cl.t - cl.dur * 0.7) / (cl.dur * 0.3))
      if (sk > 0) {
        const xa = lr ? x0 - 5 : x0 + W + 5
        const xb = lerp(xa, lr ? x0 + W + 5 : x0 - 5, ease.outCubic(sk))
        ctx.strokeStyle = C.ink
        ctx.globalAlpha = fade
        ctx.lineWidth = (four ? 1.8 : 1.4) / f.s
        ctx.beginPath()
        ctx.moveTo(xa, y + CS / 2)
        ctx.lineTo(xb, y + CS / 2)
        if (four) {
          ctx.moveTo(xa, y + CS / 2 + 2.2)
          ctx.lineTo(xb, y + CS / 2 + 2.2)
        }
        // end ticks
        ctx.moveTo(xa, y + CS / 2 - 3)
        ctx.lineTo(xa, y + CS / 2 + 3)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    })
    // the four-line moment: a dimension line on the wall
    if (four) {
      const yA = L.wy + (cl.rows[0] - HID) * CS
      const yB = L.wy + (cl.rows[3] - HID + 1) * CS
      const k = ease.outCubic(clamp(cl.t / 0.25))
      const xd = x0 + W + 10
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1 / f.s
      ctx.beginPath()
      const ym = (yA + yB) / 2
      ctx.moveTo(xd, lerp(ym, yA, k))
      ctx.lineTo(xd, lerp(ym, yB, k))
      ctx.moveTo(xd - 3, yA)
      ctx.lineTo(xd + 3, yA)
      ctx.moveTo(xd - 3, yB)
      ctx.lineTo(xd + 3, yB)
      ctx.stroke()
    }
  }

  function drawActive() {
    const p = g.cur
    if (!p || g.clear || g.dead) return
    const x0 = L.wx
    const y0 = L.wy - HID * CS
    const s = SHAPES[p.t][p.r]
    const gy = dropY(g.board, p.t, p.r, p.x, p.y)
    // ghost: dashed outlines at the landing position
    ctx.setLineDash([2.2, 2])
    ctx.strokeStyle = COL[p.t]
    ctx.lineWidth = 1 / f.s
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    for (let i = 0; i < 8; i += 2) {
      const row = gy + s[i + 1]
      if (row < HID) continue
      ctx.rect(x0 + (p.x + s[i]) * CS + 1.4, y0 + row * CS + 1.4, CS - 2.8, CS - 2.8)
    }
    ctx.stroke()
    ctx.setLineDash([])
    // projection lines from the piece down to its ghost
    let minC = 99
    let maxC = -1
    let botR = -1
    for (let i = 0; i < 8; i += 2) {
      minC = Math.min(minC, s[i])
      maxC = Math.max(maxC, s[i] + 1)
      botR = Math.max(botR, s[i + 1] + 1)
    }
    const yTop = y0 + (visY + botR) * CS
    const yBot = y0 + (gy + botR - 1) * CS
    if (yBot - yTop > CS * 1.5) {
      ctx.globalAlpha = 0.22
      ctx.setLineDash([1, 2.5])
      ctx.beginPath()
      for (const c of [minC, maxC]) {
        const x = x0 + (visX + c) * CS
        ctx.moveTo(x, yTop + 2)
        ctx.lineTo(x, yBot)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
    // the piece itself, eased into place, with a little pulse on rotation
    const appear = ease.outCubic(clamp(spawnT / 0.12))
    const pulse = 1 + rotPulse * 0.07
    let cxm = 0
    let cym = 0
    for (let i = 0; i < 8; i += 2) {
      cxm += s[i] + 0.5
      cym += s[i + 1] + 0.5
    }
    cxm /= 4
    cym /= 4
    for (let i = 0; i < 8; i += 2) {
      const bx = (s[i] + 0.5 - cxm) * pulse + cxm - 0.5
      const by = (s[i + 1] + 0.5 - cym) * pulse + cym - 0.5
      const row = visY + by
      if (row + 1 < HID) continue
      addCell(p.t, x0 + (visX + bx) * CS, y0 + row * CS, CS)
    }
    // clip the hidden rows above the well's top
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 - 2, L.wy - 0.5, COLS * CS + 4, ROWS * CS + 1)
    ctx.clip()
    flush(appear, 0.85 * appear, 1.35 / f.s)
    ctx.restore()
  }

  function drawPanels() {
    const lw = 1 / f.s
    // hold
    const hb = L.hold
    panel(hb, lw)
    if (g.hold) {
      const c = L.portrait ? 9 : 11
      drawMini(g.hold, hb.x + hb.w / 2, hb.y + hb.h / 2 + 5, c)
      flush(g.holdUsed ? 0.3 : 0.9, g.holdUsed ? 0.15 : 0.6, lw)
    }
    // next ×3
    const nb = L.next
    panel(nb, lw)
    for (let i = 0; i < 3; i++) {
      const t = g.queue[i]
      if (!t) continue
      if (L.portrait) {
        const slot = nb.w / 3
        drawMini(t, nb.x + slot * (i + 0.5), nb.y + nb.h / 2 + 5, i === 0 ? 8 : 6.5)
      } else {
        const c = i === 0 ? 11 : 8.5
        const cy = i === 0 ? nb.y + 50 : nb.y + 100 + (i - 1) * 42
        drawMini(t, nb.x + nb.w / 2, cy, c)
      }
      flush(i === 0 ? 0.9 : 0.6, i === 0 ? 0.6 : 0.4, lw)
    }
    if (!L.portrait) {
      // a hairline between the first and the rest
      ctx.strokeStyle = C.ink
      ctx.globalAlpha = 0.18
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(nb.x + 8, nb.y + 78)
      ctx.lineTo(nb.x + nb.w - 8, nb.y + 78)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // the legend: one swatch per material with its count
    if (L.side) {
      const sb = L.side
      panel(sb, lw)
      for (let t = 1; t < 8; t++) {
        const y = sb.y + 112 + (t - 1) * 17
        addCell(t, sb.x + 8, y, 11)
      }
      flush(0.85, 0.6, lw)
      ctx.strokeStyle = C.ink
      ctx.globalAlpha = 0.18
      ctx.beginPath()
      ctx.moveTo(sb.x + 6, sb.y + 94)
      ctx.lineTo(sb.x + sb.w - 6, sb.y + 94)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (L.log) panel(L.log, lw)
  }

  /**
   * The first-play hint: three dotted gestures drawn around the falling
   * piece — slide, turn, drop — taking turns to light up, labelled for the
   * keyboard/pad or for touch, whichever was used last.
   */
  function drawHint() {
    const p = g.cur
    if (!p || g.clear || g.dead || state !== 'play') return
    const s = SHAPES[p.t][p.r]
    let c0 = 9
    let c1 = -9
    let r0 = 9
    let r1 = -9
    for (let i = 0; i < 8; i += 2) {
      c0 = Math.min(c0, s[i])
      c1 = Math.max(c1, s[i] + 1)
      r0 = Math.min(r0, s[i + 1])
      r1 = Math.max(r1, s[i + 1] + 1)
    }
    const x0 = L.wx + (visX + c0) * CS
    const x1 = L.wx + (visX + c1) * CS
    const yT = L.wy + (visY + r0 - HID) * CS
    const yB = L.wy + (visY + r1 - HID) * CS
    const cx = (x0 + x1) / 2
    const cy = (yT + yB) / 2
    const gy = L.wy + (dropY(g.board, p.t, p.r, p.x, p.y) + r1 - HID) * CS
    const phase = Math.floor(hintT / 1.6) % 3
    const k = (hintT % 1.6) / 1.6
    const hl = 1 / f.s
    ctx.lineWidth = hl
    ctx.setLineDash([2, 2.5])
    const style = (i: number) => {
      ctx.strokeStyle = i === phase ? C.moss : C.ink2
      ctx.fillStyle = ctx.strokeStyle
      ctx.globalAlpha = hintA * (i === phase ? 1 : 0.35)
    }
    const head = (x: number, y: number, a: number) => {
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a + 2.6) * 4, y + Math.sin(a + 2.6) * 4)
      ctx.lineTo(x, y)
      ctx.lineTo(x + Math.cos(a - 2.6) * 4, y + Math.sin(a - 2.6) * 4)
      ctx.stroke()
      ctx.setLineDash([2, 2.5])
    }
    // slide: a double-headed arrow under the piece
    style(0)
    const ay = yB + 7
    const ax0 = Math.max(L.wx + 4, x0 - 18)
    const ax1 = Math.min(L.wx + COLS * CS - 4, x1 + 18)
    ctx.beginPath()
    ctx.moveTo(ax0, ay)
    ctx.lineTo(ax1, ay)
    ctx.stroke()
    head(ax0, ay, Math.PI)
    head(ax1, ay, 0)
    if (phase === 0) {
      ctx.beginPath()
      ctx.arc(lerp(ax0, ax1, 0.5 + 0.5 * Math.sin(k * TAU)), ay, 1.8, 0, TAU)
      ctx.fill()
    }
    hintLabels.push([usesTouch ? 'DRAG' : 'MOVE ← →', SX((ax0 + ax1) / 2), SY(ay) + 13, phase === 0, 'center'])
    // turn: an arc over the piece
    style(1)
    const R = Math.max(x1 - x0, yB - yT) / 2 + 9
    ctx.beginPath()
    ctx.arc(cx, cy, R, -2.5, -0.65)
    ctx.stroke()
    head(cx + Math.cos(-0.65) * R, cy + Math.sin(-0.65) * R, -0.65 + Math.PI / 2)
    if (phase === 1) {
      const a = lerp(-2.5, -0.65, ease.inOutSine(k))
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 1.8, 0, TAU)
      ctx.fill()
    }
    hintLabels.push([usesTouch ? 'TAP' : '↑ ROTATE', SX(cx), SY(cy - R) - 5, phase === 1, 'center'])
    // drop: straight down to the ghost
    style(2)
    if (gy - yB > CS * 1.5) {
      const right = x1 < L.wx + COLS * CS * 0.62
      const dx = right ? x1 + 6 : x0 - 6
      ctx.beginPath()
      ctx.moveTo(dx, yB)
      ctx.lineTo(dx, gy - 2)
      ctx.stroke()
      head(dx, gy - 2, Math.PI / 2)
      if (phase === 2) {
        ctx.beginPath()
        ctx.arc(dx, lerp(yB, gy - 2, ease.inCubic(k)), 1.8, 0, TAU)
        ctx.fill()
      }
      hintLabels.push([usesTouch ? 'SWIPE ↓' : 'DROP · SPACE', SX(dx) + (right ? 6 : -6), SY((yB + gy) / 2), phase === 2, right ? 'left' : 'right'])
    }
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  /** Screen-space affordances: hint labels, the hold box under the pointer, the clearance warning, the cursor. */
  function affordances(t: number) {
    for (const [s, x, y, on, align] of hintLabels) text(ctx, s, x, y, { size: 9, color: on ? C.moss : C.ink2, tracking: 0.14, align, alpha: hintA * (on ? 1 : 0.55) })
    hintLabels.length = 0
    const playing = state === 'play' && !botParam && !g.bot
    const holdHover = playing && !!hover && !pd && overHold(hover.x, hover.y, usesTouch ? 10 : 0)
    if (holdHover) {
      const hb = L.hold
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(SX(hb.x)) + 0.5, Math.round(SY(hb.y)) + 0.5, Math.round(hb.w * f.s), Math.round(hb.h * f.s))
      text(ctx, g.holdUsed ? 'HOLD USED' : 'CLICK · C', SX(hb.x) + 6, SY(hb.y + hb.h) - 6, { size: 8, color: C.moss, tracking: 0.14 })
    }
    // a high stack: the limit line wakes up and reports the clearance
    if (playing && !g.dead) {
      const hgt = Math.min(ROWS, stackHeight(g.board))
      if (hgt >= ROWS - 5) {
        const a = 0.55 + 0.45 * Math.sin(t * 6)
        ctx.strokeStyle = C.ink
        ctx.globalAlpha = a
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(SX(L.wx), Math.round(SY(L.wy)) + 0.5)
        ctx.lineTo(SX(L.wx + COLS * CS), Math.round(SY(L.wy)) + 0.5)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        if (f.s > 0.7) text(ctx, `CLEARANCE ${String(ROWS - hgt).padStart(2, '0')}`, SX(L.wx + COLS * CS) - 4, SY(L.wy) + 11, { size: 8, color: C.ink, align: 'right', tracking: 0.14, alpha: a })
      }
    }
    // the cursor says what a press will do
    let cur = 'default'
    if (full) {
      if (state === 'title' || (state === 'over' && stateT > 0.8)) cur = 'pointer'
      else if (playing) {
        if (pd) cur = 'grabbing'
        else if (holdHover && !g.holdUsed) cur = 'pointer'
        else if (hover && overWell(hover.x, hover.y)) cur = 'grab'
      }
    }
    env.setCursor(cur)
  }

  /** A paper label with a hairline border, centred on (x, y). */
  function tagBox(x: number, y: number, w: number, h: number, a: number) {
    ctx.globalAlpha = a * 0.93
    ctx.fillStyle = C.paper
    ctx.fillRect(x - w / 2, y - h / 2, w, h)
    ctx.globalAlpha = a * 0.7
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(x - w / 2) + 0.5, Math.round(y - h / 2) + 0.5, Math.round(w), Math.round(h))
    ctx.globalAlpha = 1
  }

  function labels() {
    const small = f.s < 1.25
    const k = f.s
    const ls = clamp(k * 3.6, 7.5, 9.5)
    const tag = (b: Box, s: string) => {
      text(ctx, s, SX(b.x) + 6, SY(b.y) + ls + 5, { size: ls, color: C.muted, tracking: 0.16 })
    }
    if (!small || full) {
      tag(L.hold, 'HOLD')
      tag(L.next, 'NEXT')
    }
    // row numbers up the left wall
    if (f.s * CS >= 15) {
      const every = f.s * CS >= 22 ? 1 : 5
      for (let r = every; r <= ROWS; r += every) {
        const y = SY(L.wy + (ROWS - r + 0.5) * CS)
        text(ctx, String(r).padStart(2, '0'), SX(L.wx) - 7 * k, y, { size: clamp(k * 3.2, 7, 9), color: r % 5 === 0 ? C.ink2 : C.muted, align: 'right', baseline: 'middle', tracking: 0.04 })
      }
      // column letters under the floor
      for (let c = 0; c < COLS; c++) {
        text(ctx, 'ABCDEFGHIJ'[c], SX(L.wx + (c + 0.5) * CS), SY(L.wy + ROWS * CS + 13), { size: clamp(k * 3, 7, 8.5), color: C.muted, align: 'center', baseline: 'middle', tracking: 0 })
      }
    }
    if (L.side && f.s > 0.9) {
      const sb = L.side
      tag(sb, 'RECORD')
      const rows: [string, string][] = [
        ['LEVEL', String(g.level).padStart(2, '0')],
        ['LINES', String(g.lines).padStart(3, '0')],
        ['PIECES', String(g.pieces).padStart(3, '0')],
        ['G', `${gravity(g.level).toFixed(2)}s`],
      ]
      const lx = SX(sb.x) + 6
      const rx = SX(sb.x + sb.w) - 6
      rows.forEach(([a, b], i) => {
        const y = SY(sb.y + 26 + i * 14)
        text(ctx, a, lx, y, { size: ls, color: C.muted, tracking: 0.14 })
        text(ctx, b, rx, y, { size: ls + 1, color: C.ink, align: 'right', tracking: 0.06 })
      })
      // lines to the next level, as ten ticks
      const ty = SY(sb.y + 78)
      const into = g.lines % 10
      ctx.lineWidth = 1
      for (let i = 0; i < 10; i++) {
        const x = lerp(lx, rx, i / 9)
        ctx.strokeStyle = i < into ? C.moss : C.muted
        ctx.globalAlpha = i < into ? 1 : 0.45
        ctx.beginPath()
        ctx.moveTo(Math.round(x) + 0.5, ty - (i < into ? 6 : 4))
        ctx.lineTo(Math.round(x) + 0.5, ty)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      text(ctx, 'TO NEXT LEVEL', lx, ty + ls + 4, { size: ls - 1, color: C.muted, tracking: 0.12 })
      // legend names and counts
      for (let ty2 = 1; ty2 < 8; ty2++) {
        const y = SY(sb.y + 112 + (ty2 - 1) * 17 + 5.5)
        text(ctx, NAMES[ty2], SX(sb.x + 24), y, { size: ls + 0.5, color: C.ink, baseline: 'middle', tracking: 0.04 })
        if (f.s > 1.6) text(ctx, MAT[ty2], SX(sb.x + 33), y, { size: ls - 1.5, color: C.muted, baseline: 'middle', tracking: 0.08 })
        text(ctx, String(g.counts[ty2]).padStart(3, '0'), rx, y, { size: ls, color: C.ink2, align: 'right', baseline: 'middle', tracking: 0.04 })
      }
      text(ctx, 'KEY', lx, SY(sb.y + 106), { size: ls, color: C.muted, tracking: 0.16 })
    }
    if (L.log && f.s > 0.9) {
      const lb = L.log
      tag(lb, 'LOG')
      log.forEach((s, i) => {
        text(ctx, s, SX(lb.x) + 6, SY(lb.y + 30 + i * 13), { size: ls - 0.5, color: i === 0 ? C.ink : C.muted, tracking: 0.04, alpha: 1 - i * 0.1 })
      })
    }
    // callouts in the well
    for (const co of callouts) {
      const k2 = co.t / (co.big ? 1.5 : 1.05)
      if (k2 >= 1) continue
      const a = k2 < 0.12 ? k2 / 0.12 : 1 - clamp((k2 - 0.6) / 0.4)
      const x = SX(L.wx + COLS * CS / 2)
      const y = SY(co.y) - ease.outCubic(k2) * 26 * Math.min(1, k)
      const ms = clamp(f.s * 4, 8, 11)
      if (co.big) {
        const sz = clamp(f.s * 16, 18, 46)
        tagBox(x, y - sz * 0.05, sz * 4.4, sz * 1.55, a)
        text(ctx, co.head, x, y, { font: 'serif', italic: true, size: sz, color: C.moss, align: 'center', alpha: a })
        text(ctx, co.sub, x, y + sz * 0.5, { size: ms, color: C.ink, align: 'center', tracking: 0.16, alpha: a })
      } else {
        const s = `${co.head.toUpperCase()}  ${co.sub}`
        tagBox(x, y - ms * 0.35, s.length * ms * 0.74 + 18, ms * 2.3, a)
        text(ctx, s, x, y, { size: ms, color: C.ink, align: 'center', tracking: 0.16, alpha: a })
      }
    }
    // level-up flash
    if (levelFlash < 1) {
      const a = Math.sin(levelFlash * Math.PI)
      text(ctx, `LEVEL ${String(g.level).padStart(2, '0')}`, SX(L.wx + COLS * CS / 2), SY(L.wy + 22), { size: clamp(f.s * 4, 8, 11), color: C.moss, align: 'center', tracking: 0.2, alpha: a })
    }
  }

  return {
    resize(w, h) {
      const next = layoutFor(w, h)
      if (next.portrait !== L.portrait) sparks.clear()
      L = next
      f = gameFit(w, h, env.mode, L.lw, L.lh)
    },
    key(code, down) {
      if (down) usesTouch = false
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyX', 'KeyZ', 'KeyC', 'ShiftLeft', 'ShiftRight', ...START_KEYS])
    },
    pointer(p) {
      touch.pointer(p)
      if (p.pointerType === 'touch' || p.pointerType === 'pen') usesTouch = true
      else if (p.type === 'move' && !p.pressed) usesTouch = false
      hover = p.type === 'leave' ? null : { x: p.x, y: p.y }
      if (state === 'play' && !botParam && !g.bot) pointerPlay(p.type, p.x, p.y, usesTouch)
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      let started = false
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        started = true
      }

      if (dt > 0) {
        const botDrives = state !== 'play' || botParam
        if (botDrives) {
          if (!g.dead) botUpdate(dt)
          step(dt, bot.soft)
        } else {
          if (!started) playInput(dt)
          step(dt, keys.down('ArrowDown', 'KeyS') || touchSoft)
        }
        // attract resets after a top-out; the over card hands the board to the bot
        if (g.dead && ((g.bot && g.deadT > 1.6) || (state === 'over' && stateT > 2.6 && !g.bot))) {
          burst()
          g = newGame(true)
          resetVisuals()
        }
        if (botDrives && state === 'play' && g.dead && g.deadT > 1.6) {
          burst()
          g = newGame(true)
        }

        // visuals
        spawnT += dt
        rotPulse = Math.max(0, rotPulse - dt * 7)
        shake = Math.max(0, shake - dt * 14)
        if (lockFlash) lockFlash.t += dt
        if (drop) {
          drop.t += dt
          if (drop.t > 0.2) drop = null
        }
        levelFlash = Math.min(1, levelFlash + dt * 0.7)
        hintT += dt
        if (state !== 'play' || g.pieces >= 2) hintA = Math.max(0, hintA - dt * 1.6)
        for (const tr of trails) tr.t += dt
        while (trails.length && trails[0].t > 0.28) trails.shift()
        for (const co of callouts) co.t += dt
        const p = g.cur
        if (p) {
          visX = lerp(visX, p.x, damp(38, dt))
          visY = lerp(visY, p.y, damp(30, dt))
          if (Math.abs(visX - p.x) < 0.01) visX = p.x
          if (Math.abs(visY - p.y) < 0.01) visY = p.y
        }
        sparks.update(dt, 160, 2.6)
        rings.update(dt)
      }

      /* ---- draw */
      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: f.lw * f.s > 300 ? 'FIG. G.02 — AFTER TETRIS, 1984 · SECTION THROUGH WELL' : 'FIG. G.02 — AFTER TETRIS, 1984' })
      enterFit(ctx, f)
      const sy = shake > 0 ? Math.sin(t * 90) * shake * 0.5 : 0
      ctx.translate(0, sy)
      drawWell()
      // hard-drop speed lines
      for (const tr of trails) {
        const a = 1 - tr.t / 0.28
        ctx.strokeStyle = tr.col
        ctx.lineWidth = 1 / f.s
        ctx.globalAlpha = a * 0.55
        ctx.beginPath()
        const x0 = L.wx + tr.x0 * CS
        const x1 = L.wx + tr.x1 * CS
        const yA = L.wy + (tr.y0 - HID) * CS
        const yB = L.wy + (tr.y1 - HID) * CS
        for (let x = x0 + 2; x <= x1 - 2; x += 3.2) {
          ctx.moveTo(x, Math.max(L.wy, lerp(yA, yB, ease.outCubic(tr.t / 0.28))))
          ctx.lineTo(x, yB)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      drawBoard()
      drawActive()
      if (hintA > 0.01) drawHint()
      sparks.draw(ctx, 1 / f.s, 0.03)
      ctx.save()
      ctx.beginPath()
      ctx.rect(L.wx, L.wy - 8, COLS * CS, ROWS * CS + 8)
      ctx.clip()
      rings.draw(ctx, 1 / f.s)
      ctx.restore()
      ctx.translate(0, -sy)
      drawPanels()
      ctx.restore()

      labels()
      affordances(t)

      const over = state === 'over'
      gameHud(
        ctx,
        f,
        env.mode,
        [
          { label: 'Score', value: fmtScore(over ? finalScore : g.score, 6) },
          { label: 'Lines', value: String(over ? finalLines : g.lines).padStart(3, '0') },
          { label: 'Level', value: String(over ? finalLevel : g.level).padStart(2, '0') },
        ],
        [{ label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? g.score : 0), 6) }],
      )

      // on wide-short screens, or when the playfield is narrow, the cards use the whole canvas
      const wide = f.side || f.lw * f.s < 320
      const cx = wide ? 0 : f.ox
      const cy = wide ? 0 : f.oy
      const cw = wide ? env.width : f.lw * f.s
      const ch = wide ? env.height : f.lh * f.s
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, {
          kicker: 'After Tetris · Alexey Pajitnov, 1984',
          title: 'Stack',
          titleEm: 'courses',
          lines: ['← → move · ↑ X Z rotate · ↓ soft drop', 'Space hard drop · C hold', 'Touch: drag · tap · swipe down'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          kicker: newRecord ? 'New best' : 'Topped out',
          title: fmtScore(finalScore, 6),
          lines: [`${finalLines} lines · level ${String(finalLevel).padStart(2, '0')}`, `Best ${fmtScore(hi.get(), 6)}`],
          prompt: 'Press Enter · Tap to play again',
          t,
          appear: (stateT - 0.5) * 2,
        })

      keys.endFrame()
      touch.endFrame()
    },
  }
}

export default create
