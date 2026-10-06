/*
 * PELLETS — after Pac-Man (Namco, 1980).
 *
 * The maze is drawn as an architectural floor plan: every wall is a pair of
 * rounded hairline outlines (the wall tiles' rectilinear boundary, inset twice
 * and rounded with arcTo), with a faint poché hatch between them, grid bubbles
 * in the margin and a door-swing symbol on the ghost house. The hero is a circle with
 * a waka mouth and an eye; four hairline ghosts (ocean, lagoon, moss, fern)
 * keep the classic scatter/chase personalities — direct chaser, ambusher four
 * tiles ahead, vector flanker, and the shy one — plus frightened and eaten
 * modes. A Dijkstra bot with ghost-arrival danger costs plays attract mode.
 */

import { angleDiff, C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, mod, rgba, rng, Rings, setFont, Sparks, START_KEYS, TAU, text, Touch } from '../kit'
import type { Dir as KDir } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. G.01 — AFTER PAC-MAN, 1980'

/* ------------------------------------------------------------------- the plan */

// Left halves (cols 0–10), mirrored about col 10.
// # wall · . pellet · o power pellet · = open, no pellet · X outside · H house · - door
const HALF = [
  '###########', // 0
  '#.........#', // 1
  '#o##.####.#', // 2
  '#.##.####.#', // 3
  '#..........', // 4
  '#.##.#.####', // 5
  '#....#...##', // 6
  '####.###=##', // 7
  'XXX#.#=====', // 8
  'XXX#.#=###-', // 9
  '====.==#HHH', // 10  tunnel
  'XXX#.#=#HHH', // 11
  'XXX#.#=####', // 12
  'XXX#.#=====', // 13
  '####.#=####', // 14
  '#.........#', // 15
  '#.##.####.#', // 16
  '#o.#......=', // 17  start
  '##.#.#.####', // 18
  '#....#....#', // 19
  '#.#######.#', // 20
  '#..........', // 21
  '###########', // 22
]
const ROWS = HALF.map((s) => s + s.slice(0, 10).split('').reverse().join(''))
const W = ROWS[0].length // 21
const H = ROWS.length // 23
const NN = W * H
const T = 12 // playfield units per tile
const M = 18 // margin around the plan (grid bubbles, lives)
const LW = W * T + M * 2
const LH = H * T + M * 2

const WALL = 0
const PATH = 1
const VOID = 2
const HOUSE = 3
const DOOR = 4
const cells = new Uint8Array(NN)
const dots0 = new Uint8Array(NN)
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const ch = ROWS[y][x]
    const i = y * W + x
    cells[i] = ch === '#' ? WALL : ch === 'X' ? VOID : ch === 'H' ? HOUSE : ch === '-' ? DOOR : PATH
    dots0[i] = ch === '.' ? 1 : ch === 'o' ? 2 : 0
  }
const DOTS_TOTAL = dots0.reduce((s, v) => s + (v ? 1 : 0), 0)
const WALKABLE: number[] = []
for (let i = 0; i < NN; i++) if (cells[i] === PATH) WALKABLE.push(i)

const START_X = 10
const START_Y = 17
const DOOR_X = 10
const OUT_Y = 8 // the tile just above the door
const HOUSE_Y = 10.5
const FRUIT_X = 10
const FRUIT_Y = 13
const TUNNEL_Y = 10

// 0 up · 1 left · 2 down · 3 right (the classic tie-break order)
const DX = [0, -1, 0, 1]
const DY = [-1, 0, 1, 0]
const OPP = [2, 3, 0, 1]
const KDIR: Record<KDir, number> = { up: 0, left: 1, down: 2, right: 3 }

const tileAt = (x: number, y: number) => (y < 0 || y >= H ? WALL : cells[y * W + mod(x, W)])
const open = (x: number, y: number) => tileAt(x, y) === PATH
const isTunnel = (x: number, y: number) => y === TUNNEL_Y && (x <= 3 || x >= W - 4)

/* ------------------------------------------------- wall outlines (geometry) */

const wallAt = (i: number, j: number) => (i >= 0 && j >= 0 && i < W && j < H && cells[j * W + i] === WALL ? 1 : 0)

/**
 * Rectilinear outlines of the wall union along tile edges, walked with the
 * wall on the right, collinear runs merged. Vertices are tile corners: tile
 * (i, j) spans corners (i, j)–(i + 1, j + 1). Each loop is [x0, y0, x1, y1, …].
 */
function wallLoops(): number[][] {
  // directed unit edges keyed by start corner
  const CW = W + 1
  const out = new Map<number, number[]>()
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const k = y0 * CW + x0
    const l = out.get(k)
    if (l) l.push(x1, y1)
    else out.set(k, [x1, y1])
  }
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      if (!wallAt(i, j)) continue
      if (!wallAt(i, j - 1)) add(i, j, i + 1, j)
      if (!wallAt(i + 1, j)) add(i + 1, j, i + 1, j + 1)
      if (!wallAt(i, j + 1)) add(i + 1, j + 1, i, j + 1)
      if (!wallAt(i - 1, j)) add(i, j + 1, i, j)
    }
  const loops: number[][] = []
  for (;;) {
    let startK = -1
    for (const [k, l] of out)
      if (l.length) {
        startK = k
        break
      }
    if (startK < 0) break
    const pts: number[] = []
    let k = startK
    for (let guard = 0; guard < 5000; guard++) {
      const l = out.get(k)
      if (!l || !l.length) break
      const x1 = l.shift()!
      const y1 = l.shift()!
      pts.push(k % CW, Math.floor(k / CW))
      k = y1 * CW + x1
      if (k === startK) break
    }
    // merge collinear runs
    const n = pts.length / 2
    const v: number[] = []
    for (let i = 0; i < n; i++) {
      const p = (i + n - 1) % n
      const q = (i + 1) % n
      const ax = pts[i * 2] - pts[p * 2]
      const ay = pts[i * 2 + 1] - pts[p * 2 + 1]
      const bx = pts[q * 2] - pts[i * 2]
      const by = pts[q * 2 + 1] - pts[i * 2 + 1]
      if (ax * by - ay * bx !== 0) v.push(pts[i * 2], pts[i * 2 + 1])
    }
    loops.push(v)
  }
  return loops
}

interface Outline {
  /** inset polygon in tile-corner units */
  p: number[]
  /** corner radius per vertex */
  rad: number[]
}

/** Inset a right-handed rectilinear loop by e and give each corner a radius (convex rc, concave rv). */
function inset(loop: number[], e: number, rc: number, rv: number): Outline {
  const n = loop.length / 2
  const p: number[] = []
  const rad: number[] = []
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n
    const b = (i + 1) % n
    const dax = Math.sign(loop[i * 2] - loop[a * 2])
    const day = Math.sign(loop[i * 2 + 1] - loop[a * 2 + 1])
    const dbx = Math.sign(loop[b * 2] - loop[i * 2])
    const dby = Math.sign(loop[b * 2 + 1] - loop[i * 2 + 1])
    // right-hand normals (y down): (-dy, dx)
    p.push(loop[i * 2] + e * (-day - dby), loop[i * 2 + 1] + e * (dax + dbx))
    const convex = dax * dby - day * dbx > 0
    rad.push(convex ? rc : rv)
  }
  return { p, rad }
}

const RAW_LOOPS = wallLoops()
const E1 = 0.15
const GAP = 0.19
const OUTER_RAW = RAW_LOOPS.map((l) => inset(l, E1, 0.35, 0.2))
const INNER_RAW = RAW_LOOPS.map((l) => inset(l, E1 + GAP, 0.16, 0.39))

/* ------------------------------------------------------------------ tuning */

function speeds(level: number) {
  const k = clamp((level - 1) / 4)
  return {
    pac: lerp(6.5, 7.6, k),
    pacFright: lerp(7.1, 8.0, k),
    ghost: lerp(6.0, 7.35, k),
    fright: lerp(3.7, 4.3, k),
    tunnel: lerp(3.1, 3.8, k),
    eyes: 15,
  }
}
const frightDur = (level: number) => Math.max(1.4, 6.5 - (level - 1) * 1.1)
const MODE_TIMES = (level: number) => (level === 1 ? [7, 20, 7, 20, 5, 20, 5] : level < 5 ? [7, 20, 7, 20, 5, 40, 1] : [5, 20, 5, 20, 5, 60, 1])
const GHOST_INFO = [
  { name: 'A', color: C.ocean, corner: [W - 2, -3], homeX: 10, release: 0, dots: 0, hatch: -Math.PI / 4 },
  { name: 'B', color: C.lagoon, corner: [1, -3], homeX: 10, release: 0.6, dots: 0, hatch: Math.PI / 4 },
  { name: 'C', color: C.moss, corner: [W - 1, H + 1], homeX: 8.6, release: 3.2, dots: 14, hatch: 0 },
  { name: 'D', color: C.fern, corner: [0, H + 1], homeX: 11.4, release: 6, dots: 34, hatch: Math.PI / 2 },
]

type State = 'attract' | 'title' | 'play' | 'over'
type Phase = 'draw' | 'ready' | 'play' | 'eat' | 'dying' | 'clear'
type GState = 'house' | 'leaving' | 'active' | 'eaten' | 'entering'

interface Ghost {
  id: number
  x: number
  y: number
  dir: number
  st: GState
  fright: boolean
  reverse: boolean
  lx: number
  ly: number
  ph: number
  hide: number
}

interface Popup {
  x: number
  y: number
  s: string
  t: number
  color: string
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 80 : 260)
  const rings = new Rings()
  // compact frames (short screens, previews) crop the plate to the maze and
  // drop the margin furniture, which would be unreadably small there
  let trim = 0
  const fitFor = (w: number, h: number) => {
    const f0 = gameFit(w, h, env.mode, LW, LH)
    trim = f0.compact ? M - 4 : 0
    return trim ? gameFit(w, h, env.mode, LW - trim * 2, LH - trim * 2) : f0
  }
  let f = fitFor(env.width, env.height)
  /** a label size in plan units that never renders below `px` CSS pixels */
  const U = (size: number, px = 8) => Math.max(size, px / f.s)
  const botParam = env.params.get('bot') === '1'
  const pState = env.params.get('state')

  // --- wall paths (built here, not at module load, so SSR never touches Path2D)
  const X = (x: number) => M + (x + 0.5) * T
  const Y = (y: number) => M + (y + 0.5) * T
  interface Loop {
    path: Path2D
    len: number
    delay: number
  }
  // tile-corner units → playfield units
  const CX = (x: number) => M + x * T
  const CY = (y: number) => M + y * T
  const mkLoops = (raw: Outline[]): Loop[] =>
    raw.map(({ p, rad }) => {
      const path = new Path2D()
      const n = p.length / 2
      let len = 0
      let sx = 0
      let sy = 0
      const px = (i: number) => CX(p[((i + n) % n) * 2])
      const py = (i: number) => CY(p[((i + n) % n) * 2 + 1])
      path.moveTo((px(-1) + px(0)) / 2, (py(-1) + py(0)) / 2)
      for (let i = 0; i < n; i++) {
        const lp = Math.hypot(px(i) - px(i - 1), py(i) - py(i - 1))
        const ln = Math.hypot(px(i + 1) - px(i), py(i + 1) - py(i))
        const rr = Math.min(rad[i] * T, lp / 2, ln / 2)
        path.arcTo(px(i), py(i), px(i + 1), py(i + 1), rr)
        len += ln - rr * (2 - Math.PI / 2)
        sx += px(i)
        sy += py(i)
      }
      path.closePath()
      // draw-on order: a plotter sweep from the top
      const delay = clamp((sy / n / LH) * 0.75 + (Math.abs(sx / n - LW / 2) / LW) * 0.35)
      return { path, len, delay }
    })
  const outer = mkLoops(OUTER_RAW)
  const inner = mkLoops(INNER_RAW)
  const outerAll = new Path2D()
  const innerAll = new Path2D()
  outer.forEach((l) => outerAll.addPath(l.path))
  inner.forEach((l) => innerAll.addPath(l.path))

  // --- world
  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  let score = 0
  let finalScore = 0
  let lives = 3
  let level = 1
  let newRecord = false
  let extraGiven = false
  const dots = new Uint8Array(NN)
  let dotsLeft = 0
  let dotsEaten = 0 // since this life started (house release)
  let phase: Phase = 'draw'
  let phaseT = 0
  let lifeT = 0
  let modeIdx = 0
  let modeT = 0
  let frightT = 0
  let combo = 0
  let fruitT = 0
  let fruitShown = 0
  let wakaFlip = false
  let frightBeat = 0
  let shake = 0
  let r = rng(11)
  const popups: Popup[] = []
  const pac = { x: START_X, y: START_Y, dir: 1, next: -1, nextT: 0, moving: false, face: Math.PI, eyeSide: -1, dist: 0, bump: 0, gulp: 0, chomp: 0, idle: 0 }
  const ghosts: Ghost[] = GHOST_INFO.map((_, id) => ({ id, x: 0, y: 0, dir: 1, st: 'house', fright: false, reverse: false, lx: 0, ly: 0, ph: id * 1.7, hide: 0 }))
  let eatGhost: Ghost | null = null
  let doorOpen = 0
  let swipeX = 0
  let swipeY = 0
  let swipeArmed = false

  function resetActors() {
    pac.x = START_X
    pac.y = START_Y
    pac.dir = 1
    pac.next = -1
    pac.moving = false
    pac.face = Math.PI
    pac.eyeSide = -1
    pac.dist = 0
    pac.bump = pac.gulp = pac.chomp = 0
    ghosts.forEach((g, i) => {
      const info = GHOST_INFO[i]
      g.st = i === 0 ? 'active' : 'house'
      g.x = i === 0 ? DOOR_X : info.homeX
      g.y = i === 0 ? OUT_Y : HOUSE_Y
      g.dir = i === 0 ? 1 : i === 1 ? 2 : 0
      g.fright = false
      g.reverse = false
      g.lx = i === 0 ? -1 : 0
      g.ly = 0
      g.hide = 0
    })
    modeIdx = 0
    modeT = 0
    frightT = 0
    combo = 0
    dotsEaten = 0
    lifeT = 0
    eatGhost = null
  }

  function startLevel(lv: number) {
    level = lv
    dots.set(dots0)
    dotsLeft = DOTS_TOTAL
    fruitShown = 0
    fruitT = 0
    r = rng(11 + lv * 97)
    resetActors()
    phase = 'draw'
    phaseT = 0
  }

  function newGame() {
    score = 0
    lives = 3
    extraGiven = false
    popups.length = 0
    sparks.clear()
    rings.clear()
    startLevel(1)
  }

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') {
      newGame()
      tapDir = swipeDir = -1
    }
    if (next === 'over') {
      finalScore = score
      newRecord = hi.submit(score)
      newGame() // the demo resumes behind the card
    }
  }

  /* ----------------------------------------------------------------- sound */

  const sfx = env.sfx
  const notes = (seq: number[], gap: number, dur: number, o: { type?: OscillatorType; gain?: number } = {}) =>
    seq.forEach((n, i) => sfx.tone(n, dur, { type: o.type ?? 'triangle', gain: o.gain ?? 0.07, when: i * gap, room: 0.25 }))
  const sWaka = () => {
    wakaFlip = !wakaFlip
    sfx.tone(wakaFlip ? 470 : 330, 0.075, { type: 'triangle', to: wakaFlip ? 330 : 470, gain: 0.055, filter: 2200, room: 0.05 })
  }

  /* ---------------------------------------------------------------- actors */

  const approach = (v: number, target: number, d: number) => (v < target ? Math.min(target, v + d) : Math.max(target, v - d))
  const wrapX = (x: number) => (x < -0.5 ? x + W : x >= W - 0.5 ? x - W : x)

  function tryInput(nd: number) {
    if (nd < 0) return
    const cx = Math.round(pac.x)
    const cy = Math.round(pac.y)
    if (!pac.moving) {
      if (open(cx + DX[nd], cy + DY[nd])) {
        pac.dir = nd
        pac.moving = true
        pac.next = -1
      }
      return
    }
    if (nd === pac.dir) {
      pac.next = -1
      return
    }
    if (nd === OPP[pac.dir]) {
      pac.dir = nd
      pac.next = -1
      return
    }
    // cornering forgiveness: turn up to 0.42 tile before or after the centre
    const off = (pac.x - cx) * DX[pac.dir] + (pac.y - cy) * DY[pac.dir]
    if (Math.abs(off) <= 0.42 && open(cx + DX[nd], cy + DY[nd])) {
      pac.dir = nd
      pac.next = -1
      pac.chomp = 0.5
    }
  }

  function stepPac(d: number) {
    for (let guard = 0; guard < 5 && d > 1e-6; guard++) {
      const cx = Math.round(pac.x)
      const cy = Math.round(pac.y)
      const dx = DX[pac.dir]
      const dy = DY[pac.dir]
      // pre/post-turn: slide the cross axis back onto the centre line (the diagonal cut)
      if (dx !== 0) pac.y = approach(pac.y, cy, d)
      else pac.x = approach(pac.x, cx, d)
      const off = (pac.x - cx) * dx + (pac.y - cy) * dy
      let to: number
      if (off < -1e-6) to = -off
      else {
        if (!open(cx + dx, cy + dy)) {
          if (dx !== 0) pac.x = cx
          else pac.y = cy
          if (pac.moving) pac.bump = 1
          pac.moving = false
          return
        }
        to = 1 - off
      }
      pac.moving = true
      const m = Math.min(d, to)
      pac.x = wrapX(pac.x + dx * m)
      pac.y += dy * m
      pac.dist += m
      d -= m
      if (m >= to - 1e-6) {
        // arrived at a centre: take the buffered turn if it fits
        pac.x = Math.round(pac.x)
        pac.y = Math.round(pac.y)
        const nx = Math.round(pac.x)
        const ny = Math.round(pac.y)
        if (pac.next >= 0 && pac.next !== pac.dir && open(nx + DX[pac.next], ny + DY[pac.next])) {
          pac.dir = pac.next
          pac.next = -1
          pac.chomp = 0.5
        }
      }
    }
  }

  function ghostTarget(g: Ghost): [number, number] {
    const info = GHOST_INFO[g.id]
    if (g.st === 'eaten') return [DOOR_X, OUT_Y]
    const scatter = modeIdx % 2 === 0 && modeIdx < MODE_TIMES(level).length
    const px = Math.round(pac.x)
    const py = Math.round(pac.y)
    // the first chaser ignores scatter once the plan is nearly clear ("cruise")
    if (scatter && !(g.id === 0 && dotsLeft < 16)) return [info.corner[0], info.corner[1]]
    const pd = pac.dir
    if (g.id === 0) return [px, py]
    if (g.id === 1) return [px + DX[pd] * 4, py + DY[pd] * 4]
    if (g.id === 2) {
      const vx = px + DX[pd] * 2
      const vy = py + DY[pd] * 2
      const b = ghosts[0]
      return [vx * 2 - Math.round(b.x), vy * 2 - Math.round(b.y)]
    }
    const ddx = g.x - pac.x
    const ddy = g.y - pac.y
    return ddx * ddx + ddy * ddy > 64 ? [px, py] : [info.corner[0], info.corner[1]]
  }

  function chooseDir(g: Ghost, cx: number, cy: number) {
    if (g.reverse) {
      g.reverse = false
      if (open(cx + DX[OPP[g.dir]], cy + DY[OPP[g.dir]])) {
        g.dir = OPP[g.dir]
        return
      }
    }
    const back = OPP[g.dir]
    if (g.fright) {
      const start = Math.floor(r() * 4)
      for (let k = 0; k < 4; k++) {
        const dd = (start + k) % 4
        if (dd !== back && open(cx + DX[dd], cy + DY[dd])) {
          g.dir = dd
          return
        }
      }
      g.dir = back
      return
    }
    const [tx, ty] = ghostTarget(g)
    let best = -1
    let bestD = Infinity
    for (let dd = 0; dd < 4; dd++) {
      if (dd === back) continue
      const nx = cx + DX[dd]
      const ny = cy + DY[dd]
      if (!open(nx, ny)) continue
      const ex = nx - tx
      const ey = ny - ty
      const dist2 = ex * ex + ey * ey
      if (dist2 < bestD) {
        bestD = dist2
        best = dd
      }
    }
    g.dir = best >= 0 ? best : back
  }

  function ghostSpeed(g: Ghost, sp: ReturnType<typeof speeds>) {
    if (g.st === 'eaten') return sp.eyes
    if (g.st === 'house' || g.st === 'leaving' || g.st === 'entering') return sp.ghost * 0.55
    if (isTunnel(Math.round(g.x), Math.round(g.y))) return sp.tunnel
    if (g.fright) return sp.fright
    if (g.id === 0 && dotsLeft < 20) return sp.ghost * (dotsLeft < 10 ? 1.1 : 1.05)
    return sp.ghost
  }

  function stepGhost(g: Ghost, d: number) {
    if (g.st === 'house') {
      g.y = HOUSE_Y + Math.sin(lifeT * 5 + g.id * 1.3) * 0.2
      g.ly = Math.sin(lifeT * 5 + g.id * 1.3 + 1.2) * 0.8
      g.lx = 0
      const info = GHOST_INFO[g.id]
      const scale = level > 2 ? 0.5 : level > 1 ? 0.75 : 1
      if (lifeT >= info.release * scale || (info.dots > 0 && dotsEaten >= info.dots * scale)) g.st = 'leaving'
      return
    }
    if (g.st === 'leaving') {
      g.lx = 0
      g.ly = -1
      if (Math.abs(g.x - DOOR_X) > 1e-4) {
        g.x = approach(g.x, DOOR_X, d)
        g.lx = Math.sign(DOOR_X - g.x)
        g.ly = 0
        g.y = approach(g.y, HOUSE_Y, d)
      } else {
        g.y = approach(g.y, OUT_Y, d)
        if (g.y <= OUT_Y + 1e-4) {
          g.y = OUT_Y
          g.st = 'active'
          g.dir = r() < 0.5 ? 1 : 3
          g.reverse = false
        }
      }
      return
    }
    if (g.st === 'entering') {
      g.lx = 0
      g.ly = 1
      if (g.y < HOUSE_Y - 1e-4) g.y = approach(g.y, HOUSE_Y, d)
      else {
        g.x = approach(g.x, GHOST_INFO[g.id].homeX, d)
        if (Math.abs(g.x - GHOST_INFO[g.id].homeX) < 1e-4) {
          g.st = 'leaving'
          g.fright = false
        }
      }
      return
    }
    for (let guard = 0; guard < 5 && d > 1e-6; guard++) {
      const cx = Math.round(g.x)
      const cy = Math.round(g.y)
      const dx = DX[g.dir]
      const dy = DY[g.dir]
      const off = (g.x - cx) * dx + (g.y - cy) * dy
      let to: number
      if (off < -1e-6) to = -off
      else {
        if (!open(cx + dx, cy + dy)) {
          g.x = cx
          g.y = cy
          chooseDir(g, cx, cy)
          if (!open(cx + DX[g.dir], cy + DY[g.dir])) return
          continue
        }
        to = 1 - off
      }
      const m = Math.min(d, to)
      g.x = wrapX(g.x + dx * m)
      g.y += dy * m
      d -= m
      if (m >= to - 1e-6) {
        const nx = Math.round(g.x)
        const ny = Math.round(g.y)
        g.x = nx
        g.y = ny
        if (g.st === 'eaten' && nx === DOOR_X && ny === OUT_Y) {
          g.st = 'entering'
          return
        }
        chooseDir(g, nx, ny)
      }
    }
  }

  /* ------------------------------------------------------------------- bot */

  const gdist = [new Int16Array(NN), new Int16Array(NN), new Int16Array(NN), new Int16Array(NN)]
  const gActive = [false, false, false, false]
  const gSpd = [1, 1, 1, 1]
  const queue = new Int16Array(NN)
  const cost = new Float32Array(NN)
  const steps = new Int16Array(NN)
  const first = new Int8Array(NN)
  const done = new Uint8Array(NN)

  function bfsFrom(start: number, out: Int16Array, skipDir: number) {
    out.fill(-1)
    if (start < 0) return
    let qh = 0
    let qt = 0
    out[start] = 0
    queue[qt++] = start
    while (qh < qt) {
      const u = queue[qh++]
      const ux = u % W
      const uy = (u - ux) / W
      for (let dd = 0; dd < 4; dd++) {
        if (u === start && dd === skipDir) continue
        const nx = mod(ux + DX[dd], W)
        const ny = uy + DY[dd]
        if (ny < 0 || ny >= H) continue
        const n = ny * W + nx
        if (cells[n] !== PATH || out[n] >= 0) continue
        out[n] = out[u] + 1
        queue[qt++] = n
      }
    }
  }

  function dangerAt(n: number, tt: number) {
    let dsum = 0
    for (let k = 0; k < 4; k++) {
      if (!gActive[k]) continue
      const dg = gdist[k][n]
      if (dg < 0) continue
      const tg = dg / gSpd[k]
      const lead = tg - tt
      if (lead < 1.1) dsum += 80 - lead * 10
      else dsum += 8 / (1 + lead * 1.5)
    }
    return dsum
  }

  function plan(start: number, stepOff: number, pacSpd: number, frightLeft: number, chased: boolean) {
    for (const i of WALKABLE) {
      cost[i] = 1e9
      done[i] = 0
      first[i] = -1
    }
    cost[start] = dangerAt(start, stepOff)
    steps[start] = 0
    let best = -1
    let bestV = Infinity
    for (;;) {
      let u = -1
      let uc = 1e9
      for (const i of WALKABLE)
        if (!done[i] && cost[i] < uc) {
          uc = cost[i]
          u = i
        }
      if (u < 0) break
      done[u] = 1
      // is u a target?
      const ux = u % W
      const uy = (u - ux) / W
      let bias = Infinity
      const dv = dots[u]
      if (dv === 1) bias = 0
      else if (dv === 2) bias = chased ? -16 : dotsLeft < 10 ? 0 : 12
      if (fruitT > 0 && ux === FRUIT_X && uy === FRUIT_Y) bias = Math.min(bias, -6)
      if (frightLeft > 0)
        for (const g of ghosts)
          if (g.fright && g.st === 'active' && Math.round(g.x) === ux && Math.round(g.y) === uy && (steps[u] + stepOff) / pacSpd < frightLeft - 0.4) bias = Math.min(bias, -45)
      if (bias < Infinity && uc + bias < bestV) {
        bestV = uc + bias
        best = u
      }
      for (let dd = 0; dd < 4; dd++) {
        const nx = mod(ux + DX[dd], W)
        const ny = uy + DY[dd]
        if (ny < 0 || ny >= H) continue
        const n = ny * W + nx
        if (cells[n] !== PATH || done[n]) continue
        const st = steps[u] + 1
        const c = uc + 1 + dangerAt(n, st + stepOff)
        if (c < cost[n]) {
          cost[n] = c
          steps[n] = st
          first[n] = u === start ? dd : first[u]
        }
      }
    }
    return { v: bestV, dir: best >= 0 ? first[best] : -1 }
  }

  function bot(sp: ReturnType<typeof speeds>) {
    const frightLeft = frightT
    let chased = false
    const pi = Math.round(pac.y) * W + mod(Math.round(pac.x), W)
    for (let k = 0; k < 4; k++) {
      const g = ghosts[k]
      const danger = (g.st === 'active' && (!g.fright || frightLeft < 1.1)) || g.st === 'leaving'
      gActive[k] = danger
      if (!danger) continue
      gSpd[k] = Math.max(0.1, ghostSpeed(g, sp) / (frightLeft > 0 ? sp.pacFright : sp.pac))
      const gx = g.st === 'leaving' ? DOOR_X : mod(Math.round(g.x), W)
      const gy = g.st === 'leaving' ? OUT_Y : Math.round(g.y)
      bfsFrom(gy * W + gx, gdist[k], g.st === 'active' && !g.reverse ? OPP[g.dir] : -1)
      if (gdist[k][pi] >= 0 && gdist[k][pi] < 7) chased = true
    }
    const pacSpd = frightLeft > 0 ? sp.pacFright : sp.pac // tiles per second, for the fright clock
    const cx = Math.round(pac.x)
    const cy = Math.round(pac.y)
    const dx = DX[pac.dir]
    const dy = DY[pac.dir]
    const off = (pac.x - cx) * dx + (pac.y - cy) * dy
    if (!pac.moving || Math.abs(off) < 0.02) {
      const p = plan(cy * W + mod(cx, W), 0, pacSpd, frightLeft, chased)
      if (p.dir >= 0) pac.next = p.dir
      return
    }
    let ax: number, ay: number, bx: number, by: number, da: number, db: number
    if (off < 0) {
      bx = cx
      by = cy
      db = -off
      ax = cx - dx
      ay = cy - dy
      da = 1 + off
    } else {
      ax = cx
      ay = cy
      da = off
      bx = cx + dx
      by = cy + dy
      db = 1 - off
    }
    if (!open(bx, by)) return
    const pb = plan(by * W + mod(bx, W), db, pacSpd, frightLeft, chased)
    const pa = open(ax, ay) ? plan(ay * W + mod(ax, W), da, pacSpd, frightLeft, chased) : { v: Infinity, dir: -1 }
    // turn back only if the best route from behind doesn't run through the tile ahead
    if (pa.dir >= 0 && pa.dir !== pac.dir && pa.v + 2 < pb.v) pac.next = OPP[pac.dir]
    else if (pb.dir >= 0) pac.next = pb.dir
  }

  /* ---------------------------------------------------------------- update */

  function addPopup(x: number, y: number, s: string, color: string) {
    popups.push({ x, y, s, t: 0, color })
  }

  function addScore(n: number) {
    score += n
    if (!extraGiven && score >= 10000) {
      extraGiven = true
      lives++
      notes([784, 988, 1175, 1568], 0.07, 0.18, { gain: 0.06 })
    }
  }

  function killPac() {
    phase = 'dying'
    phaseT = 0
    shake = 0.4
    notes([784, 659, 587, 523, 440, 392, 330, 294, 262], 0.1, 0.17, { gain: 0.055, type: 'triangle' })
  }

  function update(dt: number, useBot: boolean) {
    phaseT += dt
    shake = Math.max(0, shake - dt * 2)
    pac.bump = Math.max(0, pac.bump - dt * 5)
    pac.gulp = Math.max(0, pac.gulp - dt * 3)
    pac.chomp = Math.max(0, pac.chomp - dt * 4)
    for (const p of popups) p.t += dt
    while (popups.length && popups[0].t > 1.1) popups.shift()
    for (const g of ghosts) g.ph += dt * (g.st === 'eaten' ? 0 : 9)
    const doorTarget = ghosts.some((g) => (g.st === 'leaving' && Math.abs(g.x - DOOR_X) < 0.2) || g.st === 'entering' || (g.st === 'eaten' && Math.abs(g.x - DOOR_X) < 1.5 && Math.abs(g.y - OUT_Y) < 1.5)) ? 1 : 0
    doorOpen += (doorTarget - doorOpen) * damp(10, dt)

    if (phase === 'draw') {
      if (phaseT > (level === 1 ? 1.5 : 1.1)) {
        phase = 'ready'
        phaseT = 0
        notes([523, 659, 784, 659, 1047], 0.11, 0.2, { gain: 0.05 })
      }
      return
    }
    if (phase === 'ready') {
      if (phaseT > 1.25) {
        phase = 'play'
        phaseT = 0
      }
      return
    }
    if (phase === 'eat') {
      if (phaseT > 0.55) {
        phase = 'play'
        phaseT = 0
        if (eatGhost) eatGhost.hide = 0
        eatGhost = null
      }
      return
    }
    if (phase === 'dying') {
      if (phaseT > 0.55 && phaseT - dt <= 0.55) sparks.emit(X(pac.x), Y(pac.y), preview ? 10 : 18, { speed: 70, life: 0.5, color: C.ink, r })
      if (phaseT > 2.0) {
        lives--
        if (lives <= 0) {
          if (state === 'play') go('over')
          else newGame()
          return
        }
        resetActors()
        phase = 'ready'
        phaseT = 0
      }
      return
    }
    if (phase === 'clear') {
      if (phaseT > 2.4) startLevel(level + 1)
      return
    }

    // --- play
    const sp = speeds(level)
    lifeT += dt
    // input
    if (useBot) bot(sp)
    else {
      let nd = -1
      if (keys.hit('ArrowUp', 'KeyW')) nd = 0
      else if (keys.hit('ArrowLeft', 'KeyA')) nd = 1
      else if (keys.hit('ArrowDown', 'KeyS')) nd = 2
      else if (keys.hit('ArrowRight', 'KeyD')) nd = 3
      if (nd >= 0) {
        pac.next = nd
        pac.nextT = 0.55
      } else {
        // a held key keeps its request alive
        const held = keys.down('ArrowUp', 'KeyW') ? 0 : keys.down('ArrowLeft', 'KeyA') ? 1 : keys.down('ArrowDown', 'KeyS') ? 2 : keys.down('ArrowRight', 'KeyD') ? 3 : -1
        if (held >= 0 && held !== pac.dir) {
          pac.next = held
          pac.nextT = 0.55
        }
      }
      if (touch.swipe) {
        pac.next = KDIR[touch.swipe]
        pac.nextT = 0.7
      }
      if (swipeDir >= 0) {
        pac.next = swipeDir
        pac.nextT = 0.7
        swipeDir = -1
      }
      if (tapDir >= 0) {
        pac.next = tapDir
        pac.nextT = 0.9
        tapDir = -1
      }
      if (pac.next >= 0) steered = true
      pac.nextT -= dt
      if (pac.nextT <= 0) pac.next = -1
    }
    tryInput(pac.next)

    // modes
    if (frightT > 0) {
      frightT -= dt
      frightBeat -= dt
      if (frightBeat <= 0) {
        frightBeat = 0.3
        sfx.tone(frightT < 2 ? 262 : 220, 0.14, { type: 'sine', gain: 0.03, filter: 900, room: 0.1 })
      }
      if (frightT <= 0) {
        frightT = 0
        for (const g of ghosts) g.fright = false
      }
    } else {
      const times = MODE_TIMES(level)
      if (modeIdx < times.length) {
        modeT += dt
        if (modeT >= times[modeIdx]) {
          modeT = 0
          modeIdx++
          for (const g of ghosts) if (g.st === 'active') g.reverse = true
        }
      }
    }

    // fruit
    if (fruitT > 0) fruitT -= dt
    const eatenTotal = DOTS_TOTAL - dotsLeft
    if ((fruitShown === 0 && eatenTotal >= 60) || (fruitShown === 1 && eatenTotal >= 125)) {
      fruitShown++
      fruitT = 9
    }

    // move in small substeps so nothing tunnels through anything
    const subs = Math.max(1, Math.ceil(dt / (1 / 120)))
    const sdt = dt / subs
    for (let s = 0; s < subs; s++) {
      const pacSp = frightT > 0 ? sp.pacFright : sp.pac
      const beforeX = pac.x
      const beforeY = pac.y
      stepPac(pacSp * sdt)
      if (Math.abs(pac.x - beforeX) + Math.abs(pac.y - beforeY) > 0) pac.idle = 0
      else pac.idle += sdt
      // eat
      const tx = mod(Math.round(pac.x), W)
      const ty = Math.round(pac.y)
      const ti = ty * W + tx
      const dv = dots[ti]
      if (dv) {
        dots[ti] = 0
        dotsLeft--
        dotsEaten++
        pac.chomp = 1
        if (dv === 1) {
          addScore(10)
          sWaka()
        } else {
          addScore(50)
          frightT = frightDur(level)
          combo = 0
          pac.gulp = 1
          rings.add(X(tx), Y(ty), T * 2.6, 0.7, C.ocean)
          rings.add(X(tx), Y(ty), T * 1.4, 0.45, C.ink)
          sfx.tone(196, 0.34, { type: 'sine', to: 392, gain: 0.12 })
          sfx.tone(588, 0.3, { type: 'triangle', gain: 0.04, when: 0.08 })
          for (const g of ghosts) {
            if (g.st === 'eaten' || g.st === 'entering') continue
            g.fright = true
            if (g.st === 'active') g.reverse = true
          }
        }
        if (dotsLeft <= 0) {
          phase = 'clear'
          phaseT = 0
          frightT = 0
          for (const g of ghosts) g.fright = false
          notes([392, 494, 587, 784, 988, 1175], 0.09, 0.22, { gain: 0.06 })
          return
        }
      }
      if (fruitT > 0 && Math.abs(pac.x - FRUIT_X) < 0.7 && Math.abs(pac.y - FRUIT_Y) < 0.6) {
        const v = 100 + (level - 1) * 200
        addScore(v)
        fruitT = 0
        addPopup(X(FRUIT_X), Y(FRUIT_Y), String(v), C.fern)
        sparks.emit(X(FRUIT_X), Y(FRUIT_Y), 10, { speed: 60, color: C.fern, life: 0.5, r })
        notes([880, 1175, 1568], 0.06, 0.14, { gain: 0.06 })
      }
      for (const g of ghosts) stepGhost(g, ghostSpeed(g, sp) * sdt)
      // collisions — generous to the player: a smaller deadly radius, a larger eating one
      for (const g of ghosts) {
        if (g.st !== 'active') continue
        let ddx = Math.abs(pac.x - g.x)
        ddx = Math.min(ddx, W - ddx)
        const dd = Math.hypot(ddx, pac.y - g.y)
        if (g.fright && dd < 0.8) {
          g.st = 'eaten'
          g.fright = false
          g.hide = 1
          const v = 200 * Math.pow(2, combo)
          combo = Math.min(combo + 1, 3)
          addScore(v)
          addPopup(X(g.x), Y(g.y), String(v), C.ocean)
          sparks.emit(X(g.x), Y(g.y), preview ? 8 : 16, { speed: 90, color: GHOST_INFO[g.id].color, life: 0.5, r })
          rings.add(X(g.x), Y(g.y), T * 1.6, 0.4, GHOST_INFO[g.id].color)
          notes([523, 659, 784, 1047].map((n) => n * Math.pow(1.122, combo - 1)), 0.05, 0.12, { gain: 0.07 })
          eatGhost = g
          phase = 'eat'
          phaseT = 0
          return
        }
        if (!g.fright && dd < 0.55) {
          killPac()
          return
        }
      }
    }
  }

  /* ------------------------------------------------------------------ draw */

  const hairline = () => 1 / f.s

  function drawMargins(t: number) {
    const k = hairline()
    ctx.lineWidth = k
    // grid bubbles: columns along the top, rows down the left
    const cols = [1, 4, 10, 16, 19]
    const rows = [1, 4, 15, 21]
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.beginPath()
    for (const c of cols) {
      ctx.moveTo(X(c) + 5, M * 0.48)
      ctx.arc(X(c), M * 0.48, 5, 0, TAU)
    }
    for (const rr of rows) {
      ctx.moveTo(M * 0.48 + 5, Y(rr))
      ctx.arc(M * 0.48, Y(rr), 5, 0, TAU)
    }
    ctx.stroke()
    ctx.setLineDash([1.5, 1.5])
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    for (const c of cols) {
      ctx.moveTo(X(c), M * 0.48 + 5)
      ctx.lineTo(X(c), M + 2)
    }
    for (const rr of rows) {
      ctx.moveTo(M * 0.48 + 5, Y(rr))
      ctx.lineTo(M + 2, Y(rr))
    }
    ctx.stroke()
    ctx.setLineDash([])
    cols.forEach((c, i) => text(ctx, 'ABCDE'[i], X(c), M * 0.48 + 0.4, { size: 5.6, align: 'center', baseline: 'middle', color: C.ink2, tracking: 0 }))
    rows.forEach((rr, i) => text(ctx, String(i + 1), M * 0.48, Y(rr) + 0.4, { size: 5.6, align: 'center', baseline: 'middle', color: C.ink2, tracking: 0 }))
    // tunnel arrows
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.beginPath()
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? M - 3 : LW - M + 3
      const y0 = Y(TUNNEL_Y)
      ctx.moveTo(x0, y0)
      ctx.lineTo(x0 + s * 9, y0)
      ctx.moveTo(x0 + s * 6, y0 - 2.5)
      ctx.lineTo(x0 + s * 9, y0)
      ctx.lineTo(x0 + s * 6, y0 + 2.5)
    }
    ctx.stroke()
    // north arrow, top right
    const nx = LW - M * 0.5
    const ny = M * 0.5
    ctx.beginPath()
    ctx.arc(nx, ny + 1, 4.2, 0, TAU)
    ctx.moveTo(nx, ny - 5.5)
    ctx.lineTo(nx + 2, ny + 3)
    ctx.lineTo(nx, ny + 1.8)
    ctx.lineTo(nx - 2, ny + 3)
    ctx.closePath()
    ctx.stroke()
    // spare lives, bottom left; level marks, bottom right
    const ly = LH - M * 0.5
    for (let i = 0; i < Math.min(lives - 1, 5); i++) {
      const lx = M + 6 + i * 13
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.arc(lx, ly, 4.4, Math.PI + 0.55, Math.PI - 0.55 + TAU)
      ctx.closePath()
      ctx.strokeStyle = C.ink
      ctx.stroke()
    }
    text(ctx, `PLAN ${String(level).padStart(2, '0')}`, LW - M - 2, ly + 0.5, { size: 5.8, align: 'right', baseline: 'middle', color: C.muted, tracking: 0.14 })
    for (let i = 0; i < Math.min(level, 6); i++) drawFruit(LW - M - 46 - i * 11, ly, 0.62, t)
  }

  // The finished walls are static: render them once per size/colour into a
  // device-pixel-aligned offscreen canvas (the poché clip is the costly part).
  const wallCache = new Map<string, HTMLCanvasElement>()
  let cacheFor = ''
  function paintWalls(g: CanvasRenderingContext2D, color: string, k: number) {
    g.save()
    g.clip(innerAll, 'evenodd')
    g.strokeStyle = rgba(color, preview ? 0.14 : 0.2)
    g.lineWidth = k
    g.beginPath()
    const gap = preview ? 3.4 : 2.6
    for (let d = -LH; d < LW; d += gap) {
      g.moveTo(d, 0)
      g.lineTo(d + LH, LH)
    }
    g.stroke()
    g.restore()
    g.lineWidth = k
    g.strokeStyle = rgba(color, 0.95)
    g.stroke(outerAll)
    g.strokeStyle = rgba(color, preview ? 0.3 : 0.42)
    g.stroke(innerAll)
  }
  function blitWalls(color: string, sx: number, sy: number) {
    const dpr = env.dpr || 1
    const ox0 = f.ox - trim * f.s
    const oy0 = f.oy - trim * f.s
    const key = `${f.s}|${ox0}|${oy0}|${dpr}`
    if (key !== cacheFor) {
      wallCache.clear()
      cacheFor = key
    }
    const bx = ox0 * dpr
    const by = oy0 * dpr
    const ix = Math.floor(bx)
    const iy = Math.floor(by)
    let c = wallCache.get(color)
    if (!c) {
      c = document.createElement('canvas')
      c.width = Math.ceil(LW * f.s * dpr) + 2
      c.height = Math.ceil(LH * f.s * dpr) + 2

      const g = c.getContext('2d')
      if (!g) return false
      g.setTransform(f.s * dpr, 0, 0, f.s * dpr, bx - ix, by - iy)
      paintWalls(g, color, 1 / f.s)
      wallCache.set(color, c)
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(c, ix + Math.round(sx * f.s * dpr), iy + Math.round(sy * f.s * dpr))
    ctx.restore()
    return true
  }

  function wallsPass(color: string, drawP: number, sx: number, sy: number) {
    const k = hairline()
    if (drawP >= 1) {
      if (!blitWalls(color, sx, sy)) paintWalls(ctx, color, k)
      return
    }
    ctx.lineWidth = k
    ctx.lineCap = 'round'
    const pass = (loops: Loop[], col: string, lag: number) => {
      ctx.strokeStyle = col
      for (const l of loops) {
        const p = ease.inOutSine(clamp((drawP - l.delay * 0.55 - lag) / 0.4))
        if (p <= 0) continue
        if (p >= 1) {
          ctx.setLineDash([])
          ctx.stroke(l.path)
          continue
        }
        ctx.setLineDash([l.len * p, l.len + 10])
        ctx.stroke(l.path)
      }
      ctx.setLineDash([])
    }
    pass(outer, rgba(color, 0.95), 0)
    pass(inner, rgba(color, 0.42), 0.06)
    ctx.lineCap = 'butt'
  }

  function drawDoor() {
    const k = hairline()
    const hx = X(9 + 0.35)
    const hy = Y(9)
    const L = X(11 - 0.35) - hx
    const a = doorOpen * (Math.PI / 2) * 0.92
    ctx.lineWidth = k
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.setLineDash([1.2, 1.6])
    ctx.beginPath()
    ctx.arc(hx, hy, L, 0, Math.PI / 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = C.ink2
    ctx.lineWidth = k * 1.4
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(hx + Math.cos(a) * L, hy + Math.sin(a) * L)
    ctx.stroke()
    ctx.lineWidth = k
  }

  const dotR = preview ? 1.6 : 1.15
  function drawDots(t: number) {
    ctx.fillStyle = rgba(C.ink, 0.72)
    ctx.beginPath()
    for (let i = 0; i < NN; i++) {
      if (dots[i] !== 1) continue
      const x = X(i % W)
      const y = Y(Math.floor(i / W))
      ctx.moveTo(x + dotR, y)
      ctx.arc(x, y, dotR, 0, TAU)
    }
    ctx.fill()
    // power pellets: pulsing registration marks
    ctx.lineWidth = hairline()
    for (let i = 0; i < NN; i++) {
      if (dots[i] !== 2) continue
      const x = X(i % W)
      const y = Y(Math.floor(i / W))
      const p = 0.5 + 0.5 * Math.sin(t * 6.5 + i)
      const rr = 4.2 + p * 1.1
      ctx.strokeStyle = rgba(C.ink, 0.55 + p * 0.45)
      ctx.beginPath()
      ctx.arc(x, y, rr * 0.55, 0, TAU)
      ctx.moveTo(x - rr, y)
      ctx.lineTo(x + rr, y)
      ctx.moveTo(x, y - rr)
      ctx.lineTo(x, y + rr)
      ctx.stroke()
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(x, y, 1.1 + p * 0.5, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = rgba(C.ocean, 0.5 * (1 - p))
      ctx.beginPath()
      ctx.arc(x, y, rr * (0.9 + (1 - p) * 0.5), 0, TAU)
      ctx.stroke()
    }
  }

  /** A sprig: two berries on stems with a leaf — the bonus. */
  function drawFruit(x: number, y: number, s: number, t: number) {
    const k = hairline()
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.rotate(Math.sin(t * 2) * 0.08)
    ctx.lineWidth = k / s
    ctx.strokeStyle = C.ink2
    ctx.beginPath()
    ctx.moveTo(-3, 2.5)
    ctx.quadraticCurveTo(-1.5, -2.5, 1.5, -5.5)
    ctx.moveTo(3, 2.2)
    ctx.quadraticCurveTo(2.6, -2, 1.5, -5.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(1.5, -5.5)
    ctx.quadraticCurveTo(4.5, -8, 7, -5.8)
    ctx.quadraticCurveTo(4.5, -4, 1.5, -5.5)
    ctx.strokeStyle = C.moss
    ctx.stroke()
    for (const [bx, by] of [
      [-3, 4.6],
      [3, 4.3],
    ]) {
      ctx.beginPath()
      ctx.arc(bx, by, 2.4, 0, TAU)
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = rgba(C.fern, 0.7)
      ctx.beginPath()
      for (let d = -6; d < 6; d += 1.3) {
        ctx.moveTo(bx + d - 3, by - 3)
        ctx.lineTo(bx + d + 3, by + 3)
      }
      ctx.stroke()
      ctx.restore()
      ctx.strokeStyle = C.fern
      ctx.beginPath()
      ctx.arc(bx, by, 2.4, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawPac(t: number) {
    const k = hairline()
    const R = T * 0.74
    let x = X(pac.x)
    const y = Y(pac.y)
    if (pac.x > W - 0.5) x = X(pac.x - W)
    let mouth: number
    let face = pac.face
    let s = 1
    let alpha = 1
    if (phase === 'dying') {
      const dp = clamp((phaseT - 0.5) / 1.1)
      // turn to face up, then open until the circle folds away
      face = lerp(pac.face, -Math.PI / 2, ease.outCubic(clamp((phaseT - 0.2) / 0.3)))
      mouth = lerp(0.35, Math.PI, ease.inSine(dp))
      if (dp >= 1) return
      s = 1 - dp * 0.15
      alpha = 1 - clamp((dp - 0.85) / 0.15)
    } else if (phase === 'draw' || phase === 'ready' || phase === 'clear') {
      mouth = 0.5 + Math.sin(t * 3) * 0.1
    } else if (!pac.moving) {
      mouth = 0.42 + Math.sin(t * 2.4) * 0.12
    } else {
      mouth = 0.04 + 0.74 * Math.abs(Math.sin(pac.dist * Math.PI * 1.15))
    }
    // squash & stretch
    const run = pac.moving && phase === 'play' ? 1 : 0
    const along = 1 + 0.035 * run - 0.2 * pac.bump + 0.12 * pac.gulp - 0.05 * pac.chomp
    const across = 1 - 0.025 * run + 0.13 * pac.bump + 0.12 * pac.gulp + 0.03 * pac.chomp
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    ctx.rotate(face)
    ctx.scale(along * s, across * s)
    ctx.beginPath()
    ctx.moveTo(-R * 0.12, 0)
    ctx.arc(0, 0, R, mouth, TAU - mouth)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    // a little shading crescent on the back, like a drafted sphere
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = rgba(C.fern, 0.55)
    ctx.lineWidth = k * 0.9
    ctx.beginPath()
    for (let d = -R; d < R; d += 2.1) {
      ctx.moveTo(-R, d)
      ctx.lineTo(-R * 0.35 - Math.abs(d) * 0.4, d)
    }
    ctx.stroke()
    ctx.restore()
    ctx.lineWidth = (k * 1.6) / s
    ctx.lineJoin = 'round'
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(-R * 0.12, 0)
    ctx.arc(0, 0, R, mouth, TAU - mouth)
    ctx.closePath()
    ctx.stroke()
    if (phase !== 'dying' && Math.abs(pac.eyeSide) > 0.35) {
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(R * 0.12, -R * 0.52 * Math.sign(pac.eyeSide), R * 0.11, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    ctx.lineJoin = 'miter'
  }

  function ghostBody(x: number, y: number, R: number, ph: number, wob: number, t: number) {
    const top = y - R * 0.1
    const hem = y + R * 0.9
    ctx.beginPath()
    ctx.moveTo(x - R, hem - R * 0.08 * (0.5 + 0.5 * Math.sin(ph + 3 * TAU)))
    const NA = 14
    for (let i = 0; i <= NA; i++) {
      const a = Math.PI + (i / NA) * Math.PI
      const rr = R * (1 + wob * 0.07 * Math.sin(a * 5 + t * 13))
      ctx.lineTo(x + Math.cos(a) * rr, top + Math.sin(a) * rr)
    }
    const NH = 18
    for (let i = 0; i <= NH; i++) {
      const u = i / NH
      const px = x + R - 2 * R * u
      const py = hem - R * 0.2 * (0.5 + 0.5 * Math.sin(u * 3 * TAU + ph)) + wob * Math.sin(u * 9 + t * 15) * R * 0.05
      ctx.lineTo(px, py)
    }
    ctx.closePath()
  }

  function ghostEyes(x: number, y: number, R: number, lx: number, ly: number) {
    const k = hairline()
    ctx.lineWidth = k
    for (const s of [-1, 1]) {
      const ex = x + s * R * 0.36 + lx * R * 0.13
      const ey = y - R * 0.18 + ly * R * 0.12
      ctx.beginPath()
      ctx.ellipse(ex, ey, R * 0.25, R * 0.31, 0, 0, TAU)
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.strokeStyle = C.ink
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(ex + lx * R * 0.11, ey + ly * R * 0.14, R * 0.12, 0, TAU)
      ctx.fillStyle = C.ink
      ctx.fill()
    }
  }

  function drawGhost(g: Ghost, t: number) {
    if (g.hide > 0 && phase === 'eat') return
    const k = hairline()
    const R = T * 0.7
    let x = X(g.x)
    if (g.x > W - 0.5) x = X(g.x - W)
    const moving = g.st !== 'house'
    const y = Y(g.y) + (moving ? Math.sin(g.ph * 0.5) * 0.35 : 0)
    if (g.st === 'eaten' || g.st === 'entering') {
      ctx.setLineDash([1.4, 1.8])
      ctx.lineWidth = k
      ctx.strokeStyle = rgba(GHOST_INFO[g.id].color, 0.45)
      ghostBody(x, y, R, g.ph, 0, t)
      ctx.stroke()
      ctx.setLineDash([])
      ghostEyes(x, y, R, g.lx, g.ly)
      return
    }
    const flashing = g.fright && frightT < 2 && Math.floor(frightT * 5) % 2 === 0
    ghostBody(x, y, R, g.ph, g.fright ? 1 : 0, t)
    ctx.fillStyle = C.paper
    ctx.fill()
    const col = g.fright ? (flashing ? C.sky : C.ink2) : GHOST_INFO[g.id].color
    ctx.save()
    ctx.clip()
    ctx.lineWidth = k
    ctx.beginPath()
    if (g.fright && !flashing) {
      ctx.strokeStyle = rgba(C.ink, 0.3)
      for (let d = -2 * R; d < 2 * R; d += 2.1) {
        ctx.moveTo(x + d - R, y - R * 1.2)
        ctx.lineTo(x + d + R * 1.4, y + R * 1.2)
        ctx.moveTo(x + d + R, y - R * 1.2)
        ctx.lineTo(x + d - R * 1.4, y + R * 1.2)
      }
    } else if (!g.fright) {
      ctx.strokeStyle = rgba(col, 0.42)
      const a = GHOST_INFO[g.id].hatch
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      for (let d = -R * 1.4; d < R * 1.4; d += 2.2) {
        const px = x - sa * d
        const py = y + ca * d
        ctx.moveTo(px - ca * R * 1.5, py - sa * R * 1.5)
        ctx.lineTo(px + ca * R * 1.5, py + sa * R * 1.5)
      }
    }
    ctx.stroke()
    ctx.restore()
    ctx.lineWidth = k * 1.35
    ctx.lineJoin = 'round'
    ctx.strokeStyle = col
    ghostBody(x, y, R, g.ph, g.fright ? 1 : 0, t)
    ctx.stroke()
    ctx.lineJoin = 'miter'
    if (g.fright) {
      // a worried face
      ctx.fillStyle = flashing ? C.ocean : C.ink
      ctx.beginPath()
      ctx.arc(x - R * 0.3, y - R * 0.22, R * 0.1, 0, TAU)
      ctx.arc(x + R * 0.3, y - R * 0.22, R * 0.1, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = flashing ? C.ocean : C.ink
      ctx.lineWidth = k
      ctx.beginPath()
      for (let i = 0; i <= 6; i++) {
        const px = x - R * 0.5 + (i / 6) * R
        const py = y + R * 0.3 + (i % 2 ? -1 : 1) * R * 0.08
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      return
    }
    ghostEyes(x, y, R, g.lx, g.ly)
  }

  function drawActors(t: number) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(M, M, W * T, H * T)
    ctx.clip()
    const showGhosts = phase !== 'dying' || phaseT < 0.5
    drawPac(t)
    if (showGhosts && phase !== 'clear') for (let i = ghosts.length - 1; i >= 0; i--) drawGhost(ghosts[i], t)
    ctx.restore()
  }

  function smoothLooks(dt: number) {
    if (dt <= 0) return
    for (const g of ghosts) {
      if (g.st === 'active' || g.st === 'eaten') {
        g.lx += (DX[g.dir] - g.lx) * damp(16, dt)
        g.ly += (DY[g.dir] - g.ly) * damp(16, dt)
      }
    }
    if (phase === 'play') {
      const target = Math.atan2(DY[pac.dir], DX[pac.dir])
      pac.face += angleDiff(pac.face, target) * damp(20, dt)
      const c = Math.cos(pac.face)
      const want = c > 0.15 ? 1 : c < -0.15 ? -1 : Math.sign(pac.eyeSide) || 1
      pac.eyeSide += (want - pac.eyeSide) * damp(14, dt)
    }
  }

  let swipeDir = -1
  let tapDir = -1
  let tapT = 0
  let tapMoved = false
  const hover = { x: 0, y: 0, on: false, mouse: false }
  // first-play hints: shown once per visit, gone after the first steer
  let steered = false
  let steerHint = 0
  let eatHint = 0
  let eatHinted = false

  /** Screen position of the hero (CSS px). */
  const heroScreen = () => ({ x: f.ox + (X(pac.x) - trim) * f.s, y: f.oy + (Y(pac.y) - trim) * f.s })
  /** The direction a tap at (x, y) would steer: the dominant axis from the hero. */
  function dirFromHero(x: number, y: number) {
    const h = heroScreen()
    const dx = x - h.x
    const dy = y - h.y
    if (Math.hypot(dx, dy) < T * 0.5 * f.s) return -1
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : dy > 0 ? 2 : 0
  }
  const insideField = (x: number, y: number) => x >= f.ox && y >= f.oy && x <= f.ox + f.lw * f.s && y <= f.oy + f.lh * f.s

  /** A small mono label on a paper chip, so it reads over the plan. */
  function tag(str: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign) {
    setFont(ctx, { size, weight: 600, tracking: 0.24 })
    const w = ctx.measureText(str).width
    const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2
    ctx.fillStyle = rgba(C.paper, 0.92)
    ctx.fillRect(x0 - size * 0.5, y - size * 0.75, w + size, size * 1.5)
    text(ctx, str, x, y + size * 0.05, { size, align, baseline: 'middle', color, tracking: 0.24, weight: 600 })
  }

  function drawHints(t: number, dt: number) {
    const human = state === 'play' && !botParam
    const k = hairline()
    // the steer hint: chevrons round the hero and a dot rehearsing a swipe
    const wantSteer = human && !steered && (phase === 'ready' || phase === 'play')
    steerHint = clamp(steerHint + (wantSteer ? dt * 3 : -dt * 2.5))
    if (steerHint > 0.01) {
      const a = steerHint
      const hx = X(pac.x)
      const hy = Y(pac.y)
      ctx.save()
      ctx.globalAlpha = a
      ctx.lineWidth = k
      ctx.strokeStyle = C.moss
      ctx.beginPath()
      const pulse = 1.25 + 0.12 * Math.sin(t * 5)
      for (let d = 0; d < 4; d++) {
        const cx0 = hx + DX[d] * T * pulse
        const cy0 = hy + DY[d] * T * pulse
        const ux = DX[d]
        const uy = DY[d]
        ctx.moveTo(cx0 - uy * 2.6 - ux * 1.6, cy0 + ux * 2.6 - uy * 1.6)
        ctx.lineTo(cx0, cy0)
        ctx.lineTo(cx0 + uy * 2.6 - ux * 1.6, cy0 - ux * 2.6 - uy * 1.6)
      }
      ctx.stroke()
      const cyc = Math.floor(t * 0.9) % 4
      const fr = t * 0.9 - Math.floor(t * 0.9)
      ctx.setLineDash([1, 2])
      ctx.beginPath()
      ctx.moveTo(hx + DX[cyc] * T * 0.9, hy + DY[cyc] * T * 0.9)
      ctx.lineTo(hx + DX[cyc] * T * 2.6, hy + DY[cyc] * T * 2.6)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(hx + DX[cyc] * T * lerp(0.9, 2.6, ease.inOutSine(fr)), hy + DY[cyc] * T * lerp(0.9, 2.6, ease.inOutSine(fr)), 1.4, 0, TAU)
      ctx.fill()
      tag('STEER', hx + T * 1.55, hy + T * 1.75, U(5.4, 8.5), C.moss, 'left')
      ctx.restore()
    }
    // the first time the tables turn
    if (human && frightT > 0 && !eatHinted) {
      eatHinted = true
      eatHint = 2.6
    }
    eatHint = Math.max(0, eatHint - dt)
    if (eatHint > 0) {
      const a = clamp(eatHint / 0.5) * clamp((2.6 - eatHint) * 4)
      ctx.save()
      ctx.globalAlpha = a
      tag('CHASE THEM', X(pac.x), Y(pac.y) - T * 1.6, U(5.4, 8.5), C.ocean, 'center')
      ctx.restore()
    }
    // hover preview (mouse): which way a click would steer
    if (human && hover.on && hover.mouse && phase === 'play' && insideField(hover.x, hover.y)) {
      const d = dirFromHero(hover.x, hover.y)
      if (d >= 0) {
        const hx = X(pac.x)
        const hy = Y(pac.y)
        const ux = DX[d]
        const uy = DY[d]
        const tipx = hx + ux * T * 1.9
        const tipy = hy + uy * T * 1.9
        ctx.lineWidth = k
        ctx.strokeStyle = rgba(C.moss, 0.7)
        ctx.setLineDash([1.5, 1.5])
        ctx.beginPath()
        ctx.moveTo(hx + ux * T * 0.95, hy + uy * T * 0.95)
        ctx.lineTo(tipx, tipy)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(tipx - uy * 2.2 - ux * 2.4, tipy + ux * 2.2 - uy * 2.4)
        ctx.lineTo(tipx, tipy)
        ctx.lineTo(tipx + uy * 2.2 - ux * 2.4, tipy - ux * 2.2 - uy * 2.4)
        ctx.stroke()
      }
    }
  }

  if (pState === 'play') state = 'play'
  if (pState === 'over' && !preview) {
    state = 'over'
    finalScore = 0
  }
  newGame()

  return {
    resize(w, h) {
      f = fitFor(w, h)
    },
    key(code, down) {
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', ...START_KEYS])
    },
    pointer(p) {
      touch.pointer(p)
      hover.x = p.x
      hover.y = p.y
      hover.on = p.type !== 'leave'
      hover.mouse = p.pointerType === 'mouse'
      // continuous swipe steering: every 18px of travel from the anchor is a new direction
      if (p.type === 'down') {
        swipeX = p.x
        swipeY = p.y
        swipeArmed = true
        tapT = performance.now()
        tapMoved = false
      } else if (p.type === 'up' && swipeArmed && !tapMoved && performance.now() - tapT < 350 && state === 'play') {
        // a tap steers toward the side of the hero it lands on
        const d = dirFromHero(p.x, p.y)
        if (d >= 0) tapDir = d
      }
      if (p.type === 'move' && p.pressed && Math.hypot(p.x - swipeX, p.y - swipeY) > 12) tapMoved = true
      if (p.type === 'move' && p.pressed && swipeArmed) {
        const dx = p.x - swipeX
        const dy = p.y - swipeY
        if (Math.hypot(dx, dy) > 18) {
          swipeDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : dy > 0 ? 2 : 0
          swipeX = p.x
          swipeY = p.y
        }
      }
      if (p.type === 'up' || p.type === 'leave') swipeArmed = false
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) go('play')

      if (dt > 0) {
        const human = state === 'play' && !botParam
        update(dt, !human)
        smoothLooks(dt)
        sparks.update(dt, 0, 3)
        rings.update(dt)
      }

      // --- draw
      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: FIG, ruler: !f.compact })
      enterFit(ctx, f)
      ctx.translate(-trim, -trim)
      const shx = shake > 0 ? Math.sin(t * 90) * shake * 2.5 : 0
      const shy = shake > 0 ? Math.cos(t * 77) * shake * 2 : 0
      ctx.translate(shx, shy)
      if (!trim) drawMargins(t)

      // walls: draw-on at level start, blink at clear
      let wallCol: string = C.ink
      let drawP = 1
      if (phase === 'draw') drawP = clamp(phaseT / (level === 1 ? 1.4 : 1.0))
      if (phase === 'clear' && phaseT > 0.5) wallCol = Math.floor((phaseT - 0.5) * 5) % 2 === 0 ? C.moss : C.ink
      wallsPass(wallCol, drawP, shx, shy)
      if (drawP >= 1) drawDoor()
      if (phase !== 'draw' || phaseT > 0.4) {
        ctx.save()
        if (phase === 'draw') ctx.globalAlpha = clamp((phaseT - 0.4) / 0.8)
        drawDots(t)
        ctx.restore()
      }
      if (fruitT > 0 && (fruitT > 1.5 || Math.floor(fruitT * 6) % 2 === 0)) drawFruit(X(FRUIT_X), Y(FRUIT_Y) + 1, 1, t)
      if (phase !== 'draw' || phaseT > 0.9) drawActors(t)

      // labels
      if (phase === 'ready' || (phase === 'draw' && phaseT > 0.9)) text(ctx, 'READY', X(FRUIT_X), Y(FRUIT_Y) + 2.5, { size: U(7, 9), align: 'center', baseline: 'middle', color: C.moss, tracking: 0.3, weight: 600 })
      if (phase === 'clear' && phaseT > 0.5) text(ctx, `PLAN ${String(level).padStart(2, '0')} · CLEAR`, X(FRUIT_X), Y(FRUIT_Y) + 2.5, { size: U(6.2, 8.5), align: 'center', baseline: 'middle', color: C.moss, tracking: 0.2, weight: 600 })
      for (const p of popups) {
        const a = 1 - clamp((p.t - 0.6) / 0.5)
        text(ctx, p.s, p.x, p.y - 9 - p.t * 7, { size: U(6.5, 8.5), align: 'center', baseline: 'middle', color: p.color, alpha: a, weight: 600, tracking: 0.06 })
      }
      sparks.draw(ctx, hairline())
      rings.draw(ctx, hairline())
      if (!preview) drawHints(t, dt)
      ctx.restore()

      const shown = state === 'over' ? finalScore : score
      gameHud(ctx, f, env.mode, [
        { label: 'Score', value: fmtScore(shown, 5) },
        { label: 'Lives', value: String(Math.max(0, state === 'over' ? 0 : lives)) },
        { label: 'Plan', value: String(level).padStart(2, '0') },
      ], [{ label: 'Best', value: fmtScore(Math.max(hi.get(), shown), 5) }])

      // cards sit over the playfield, or over the whole stage when the field is a narrow column
      const roomy = !f.side && f.lw * f.s >= 300
      const cx = roomy ? f.ox : 0
      const cy = roomy ? f.oy : 0
      const cw = roomy ? f.lw * f.s : env.width
      const ch = roomy ? f.lh * f.s : env.height
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, { kicker: 'After Pac-Man · Namco, 1980', title: 'Pellet', titleEm: 'plan', lines: ['Clear the plan of pellets', 'Registration marks turn the tables'], prompt: 'Press Enter · Tap to start', t, appear: stateT * 2 })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, { kicker: newRecord ? 'New best' : 'Game over', title: fmtScore(finalScore, 5), lines: [`Best ${fmtScore(hi.get(), 5)}`], prompt: 'Press Enter · Tap to play again', t, appear: stateT * 2 })

      if (!preview) env.setCursor(state === 'title' || state === 'over' ? 'pointer' : state === 'play' && hover.on && insideField(hover.x, hover.y) ? 'pointer' : 'default')
      keys.endFrame()
      touch.endFrame()
    },
  }
}

export default create
