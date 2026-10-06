/*
 * CROSSING — after Frogger (Konami, 1981).
 *
 * A survey drawing of a crossing: a start verge, five road lanes of little
 * top-down hairline vehicles (each lane its own speed, direction and accent),
 * a median, five river lanes of wood-grain logs and paddling turtles that dive,
 * and five lily-pad homes in a hatched hedge. The frog crouches, leaps with a
 * stretch and lands with a squash; the timer is a ruler that shortens.
 *
 * Every lane is a pure function of its accumulated offset, so the bot can
 * look ahead exactly: a depth-limited search over hops and waits against the
 * future positions of every car, log and diving turtle.
 */

import { C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, mod, rgba, rng, Rings, setFont, Sparks, START_KEYS, TAU, text, Touch } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. G.05 — AFTER FROGGER, 1981'

const TILE = 24
const COLS = 13
const LA = COLS * TILE // lane width, 312
const G = 22 // annotation gutters
const TOP = 6
const ROWS = 13
const LW = LA + G * 2
const LH = TOP + ROWS * TILE + 36
const PAD = 150 // objects wrap fully off-screen
const PERIOD = LA + PAD * 2
const START_X = 6.5 * TILE
const START_ROW = 12
const MEDIAN = 6
const HOP_T = 0.15
const TIME_LIMIT = 30
const BAYS = [0, 1, 2, 3, 4].map((k) => (k + 0.5) * (LA / 5))
const BAY_TOL = 13
const DIVE_CYCLE = 6

const rowY = (r: number) => TOP + (r + 0.5) * TILE

type Kind = 'sedan' | 'tractor' | 'coupe' | 'racer' | 'truck' | 'turtle3' | 'log' | 'turtle2'

interface Obj {
  pos: number
  len: number
  dive: number // −1: never dives; else phase offset in the dive cycle
  seed: number
}

interface Lane {
  row: number
  river: boolean
  kind: Kind
  v: number // units/s at this level
  off: number
  color: string
  objs: Obj[]
}

function buildLanes(level: number): Lane[] {
  const m = Math.min(1.75, 1 + (level - 1) * 0.13)
  const r = rng(300 + level * 31)
  const lane = (row: number, river: boolean, kind: Kind, v: number, n: number, len: number, color: string, divers: number[] = []): Lane => {
    const objs: Obj[] = []
    for (let i = 0; i < n; i++) {
      const jitter = (r() - 0.5) * (PERIOD / n - len) * 0.35
      objs.push({ pos: (i * PERIOD) / n + jitter, len, dive: divers.includes(i) ? (i * 2.3) % DIVE_CYCLE : -1, seed: r() * 100 })
    }
    return { row, river, kind, v: v * m, off: r() * PERIOD, color, objs }
  }
  const more = level >= 2 ? 1 : 0
  const logK = level >= 3 ? 0.85 : 1
  return [
    lane(11, false, 'sedan', -30, 4, 30, C.ocean),
    lane(10, false, 'tractor', 36, 4 + more, 28, C.moss),
    lane(9, false, 'coupe', -50, 4 + more, 30, C.lagoon),
    lane(8, false, 'racer', 96, 2 + more, 30, C.fern),
    lane(7, false, 'truck', -38, 3, 58, C.ink2),
    lane(5, true, 'turtle3', -36, 4, 66, C.lagoon, level >= 3 ? [0, 2] : [1]),
    lane(4, true, 'log', 28, 4, 74 * logK, C.moss),
    lane(3, true, 'log', 58, 3, 140 * logK, C.moss),
    lane(2, true, 'turtle2', -44, 5, 44, C.lagoon, level >= 2 ? [1, 3] : [2]),
    lane(1, true, 'log', 40, 4, 100 * logK, C.moss),
  ]
}

const objX = (o: Obj, off: number) => mod(o.pos + off, PERIOD) - PAD
/** 0 surfaced · 0–1 diving · 1 under · back up */
function diveLevel(o: Obj, lt: number) {
  if (o.dive < 0) return 0
  const p = mod(lt + o.dive, DIVE_CYCLE)
  if (p < 3.6) return 0
  if (p < 4.4) return (p - 3.6) / 0.8
  if (p < 5.4) return 1
  return 1 - (p - 5.4) / 0.6
}
function diveSafe(o: Obj, lt: number) {
  if (o.dive < 0) return true
  const p = mod(lt + o.dive, DIVE_CYCLE)
  return p < 4.2 || p > 5.65
}

type State = 'attract' | 'title' | 'play' | 'over'
type Phase = 'start' | 'play' | 'dying' | 'home' | 'clear'
type Death = 'road' | 'water' | 'bank' | 'time'

const create: CreatePiece = (env) => {
  let ctx = env.ctx
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 60 : 200)
  const rings = new Rings()
  // compact frames (short screens, previews) drop the annotation gutters and
  // the timer's labels (the time moves to the HUD), so the lanes stay legible
  let trimX = 0
  let trimB = 0
  const fitFor = (w: number, h: number) => {
    const f0 = gameFit(w, h, env.mode, LW, LH)
    trimX = f0.compact ? G - 4 : 0
    trimB = f0.compact ? 16 : 0
    return f0.compact ? gameFit(w, h, env.mode, LW - trimX * 2, LH - trimB) : f0
  }
  let f = fitFor(env.width, env.height)
  /** a label size in field units that never renders below `minPx` CSS pixels */
  const U = (size: number, minPx = 8) => Math.max(size, minPx / f.s)
  const botParam = env.params.get('bot') === '1'
  const pState = env.params.get('state')
  const sfx = env.sfx

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  let score = 0
  let finalScore = 0
  let newRecord = false
  let lives = 3
  let level = 1
  let lanes: Lane[] = buildLanes(1)
  const laneOf: (Lane | null)[] = []
  let lt = 0 // lane clock (dives)
  let phase: Phase = 'start'
  let phaseT = 0
  let timeLeft = TIME_LIMIT
  let homes = [false, false, false, false, false]
  let homeT = [0, 0, 0, 0, 0]
  let fly = -1
  let flyT = 0
  let flyNext = 6
  let maxRow = START_ROW
  let death: Death = 'road'
  let deathX = 0
  let deathRow = 0
  let shake = 0
  let r = rng(5)

  const frog = {
    x: START_X,
    row: START_ROW,
    // hop
    hop: 0, // 0 idle, else progress 0..1
    fx: START_X,
    frow: START_ROW,
    tx: START_X,
    trow: START_ROW,
    face: 0, // radians; 0 = up
    faceT: 0,
    land: 0,
    queued: -1,
    holdT: 0,
    blink: 0,
    look: 0,
    idle: 0,
  }

  function indexLanes() {
    laneOf.length = 0
    for (let i = 0; i < ROWS; i++) laneOf.push(null)
    for (const l of lanes) laneOf[l.row] = l
  }
  indexLanes()

  function respawn() {
    frog.x = frog.fx = frog.tx = START_X
    frog.row = frog.frow = frog.trow = START_ROW
    frog.hop = 0
    frog.face = 0
    frog.faceT = 0
    frog.queued = -1
    frog.land = 0.4
    maxRow = START_ROW
    timeLeft = TIME_LIMIT
  }

  function startLevel(lv: number) {
    level = lv
    lanes = buildLanes(lv)
    indexLanes()
    homes = [false, false, false, false, false]
    homeT = [0, 0, 0, 0, 0]
    fly = -1
    flyNext = 5
    r = rng(5 + lv * 13)
    respawn()
    phase = 'start'
    phaseT = 0
  }

  function newGame() {
    score = 0
    lives = 3
    sparks.clear()
    rings.clear()
    startLevel(1)
  }

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') {
      newGame()
      tapDir = -1
    }
    if (next === 'over') {
      finalScore = score
      newRecord = hi.submit(score)
      newGame()
    }
  }

  /* ----------------------------------------------------------------- sound */

  const hopNote = [392, 440, 523, 587, 659, 784, 880, 988, 1047, 1175, 1319, 1568, 1760]
  function sHop(row: number) {
    sfx.tone(hopNote[clamp(12 - row, 0, 12)], 0.06, { type: 'triangle', gain: 0.06, to: hopNote[clamp(12 - row, 0, 12)] * 1.06, room: 0.05 })
  }

  /* ---------------------------------------------------------------- safety */

  /** Is a frog at lane-x `x` on `row` safe `tf` seconds from now? (exact lane look-ahead) */
  function safeAt(x: number, row: number, tf: number, m = 0) {
    if (x < 6 + m * 2 || x > LA - 6 - m * 2) return false
    if (row === START_ROW || row === MEDIAN) return true
    if (row === 0) {
      for (let k = 0; k < 5; k++) if (Math.abs(x - BAYS[k]) < BAY_TOL) return !homes[k]
      return false
    }
    const l = laneOf[row]
    if (!l) return true
    const off = l.off + l.v * tf
    if (!l.river) {
      for (const o of l.objs) {
        const x0 = objX(o, off)
        if (x + 6.5 + m > x0 + 2.5 && x - 6.5 - m < x0 + o.len - 2.5) return false
      }
      return true
    }
    for (const o of l.objs) {
      const x0 = objX(o, off)
      if (x > x0 - 2.5 + m && x < x0 + o.len + 2.5 - m && diveSafe(o, lt + tf + m * 0.08)) return true
    }
    return false
  }

  /* ------------------------------------------------------------------- bot */

  const ACTS = [0, 1, 3, 4, 2] // up, left, right, wait, down
  const BM = 4 // the bot keeps a few units of daylight
  let botWait = 0
  let botTarget = 2

  function pickBay() {
    let best = -1
    let bd = Infinity
    for (let k = 0; k < 5; k++) {
      if (homes[k]) continue
      const d = Math.abs(BAYS[k] - frog.x) + (k === fly ? -40 : 0)
      if (d < bd) {
        bd = d
        best = k
      }
    }
    return best < 0 ? 2 : best
  }

  function search(x: number, row: number, tf: number, depth: number): number {
    // leaf value
    const bayX = BAYS[botTarget]
    let v = (START_ROW - row) * 12 - tf * 2
    if (row <= 5) v -= (Math.abs(x - bayX) / TILE) * 2.2
    const lr = laneOf[row]
    if (lr?.river) {
      // drifting toward an edge is a slow death: price the time left before it
      const tEdge = lr.v > 0 ? (LA - 10 - x) / lr.v : (x - 10) / -lr.v
      if (tEdge < 2) v -= (2 - tEdge) * 14
    }
    if (row === 0) return v + 400
    if (depth === 0) {
      // how long does this spot stay safe if we just sit?
      let hold = 0
      let hx = x
      const l = laneOf[row]
      for (let k = 1; k <= 3; k++) {
        if (l?.river) hx = x + l.v * 0.25 * k
        if (safeAt(hx, row, tf + 0.25 * k, BM)) hold++
        else break
      }
      return v + hold * 3
    }
    let best = -Infinity
    for (const a of ACTS) {
      if (a === 2 && row >= START_ROW) continue
      let nx = x
      let nr = row
      let nt = tf
      if (a === 4) {
        const l = laneOf[row]
        const wt = 0.22
        if (l?.river) nx = x + l.v * wt
        nt = tf + wt
        if (!safeAt(l?.river ? x + l.v * wt * 0.5 : x, row, tf + wt * 0.5, BM) || !safeAt(nx, row, nt, BM)) continue
      } else {
        if (a === 0) nr = row - 1
        else if (a === 2) nr = row + 1
        else if (a === 1) nx = x - TILE
        else nx = x + TILE
        nt = tf + HOP_T + 0.02
        if (nr < 0 || nr > START_ROW) continue
        if (!safeAt(nx, nr, tf + HOP_T * 0.6, BM) || !safeAt(nx, nr, nt, BM)) continue
        if (nr === 0) {
          // a home: only the target (or any empty bay) counts
          let ok = false
          for (let k = 0; k < 5; k++) if (!homes[k] && Math.abs(nx - BAYS[k]) < BAY_TOL - 2) ok = true
          if (!ok) continue
        }
      }
      const val = search(nx, nr, nt, depth - 1) - (a === 4 ? 0.4 : 0)
      if (val > best) best = val
    }
    return best === -Infinity ? v - 100 : best
  }

  function botDecide(): number {
    botTarget = pickBay()
    let bestA = 4
    let bestV = -Infinity
    const depth = preview ? 4 : 5
    for (const a of ACTS) {
      if (a === 2 && frog.row >= START_ROW) continue
      let nx = frog.x
      let nr = frog.row
      let nt: number
      if (a === 4) {
        const l = laneOf[frog.row]
        nx = l?.river ? frog.x + l.v * 0.22 : frog.x
        nt = 0.22
        if (!safeAt(nx, nr, nt, BM)) continue
      } else {
        if (a === 0) nr--
        else if (a === 2) nr++
        else if (a === 1) nx -= TILE
        else nx += TILE
        nt = HOP_T + 0.02
        if (nr < 0) continue
        if (!safeAt(nx, nr, HOP_T * 0.6, BM) || !safeAt(nx, nr, nt, BM)) continue
        if (nr === 0) {
          let ok = false
          for (let k = 0; k < 5; k++) if (!homes[k] && Math.abs(nx - BAYS[k]) < BAY_TOL - 2) ok = true
          if (!ok) continue
        }
      }
      const v = search(nx, nr, nt, depth - 1) - (a === 4 ? 0.4 : 0)
      if (v > bestV) {
        bestV = v
        bestA = a
      }
    }
    return bestA
  }

  /* ---------------------------------------------------------------- update */

  function hop(dir: number) {
    // dir: 0 up · 1 left · 2 down · 3 right
    let tx = frog.x
    let trow = frog.row
    if (dir === 0) trow--
    else if (dir === 2) trow++
    else if (dir === 1) tx -= TILE
    else tx += TILE
    if (trow > START_ROW || trow < 0) return
    tx = clamp(tx, 8, LA - 8)
    frog.fx = frog.x
    frog.frow = frog.row
    frog.tx = tx
    frog.trow = trow
    frog.hop = 1e-4
    frog.faceT = [0, -Math.PI / 2, Math.PI, Math.PI / 2][dir]
    frog.idle = 0
    sHop(trow)
  }

  function kill(kind: Death) {
    if (phase !== 'play') return
    phase = 'dying'
    phaseT = 0
    death = kind
    deathX = frog.x
    deathRow = frog.row
    frog.hop = 0
    const px = G + frog.x
    const py = rowY(frog.row)
    if (kind === 'water') {
      rings.add(px, py, 22, 0.7, C.lagoon)
      rings.add(px, py, 13, 0.5, C.ocean)
      sparks.emit(px, py, preview ? 8 : 16, { speed: 70, life: 0.5, color: C.lagoon, dir: -Math.PI / 2, spread: 2.6, r })
      sfx.noise(0.35, { filter: 900, to: 300, gain: 0.12, q: 1.2 })
      sfx.tone(330, 0.3, { type: 'sine', to: 165, gain: 0.07 })
    } else {
      shake = 0.35
      sparks.emit(px, py, preview ? 8 : 14, { speed: 110, life: 0.4, color: C.ink, r })
      sfx.noise(0.18, { filter: 2400, gain: 0.12 })
      sfx.tone(220, 0.25, { type: 'triangle', to: 110, gain: 0.08 })
    }
  }

  function update(dt: number, useBot: boolean) {
    phaseT += dt
    lt += dt
    shake = Math.max(0, shake - dt * 2)
    frog.land = Math.max(0, frog.land - dt * 6)
    for (const l of lanes) l.off += l.v * dt
    for (let k = 0; k < 5; k++) homeT[k] += dt
    // fly visits an empty bay now and then
    flyT -= dt
    if (fly >= 0 && flyT <= 0) fly = -1
    flyNext -= dt
    if (flyNext <= 0 && fly < 0) {
      const empty = [0, 1, 2, 3, 4].filter((k) => !homes[k])
      if (empty.length) {
        fly = empty[Math.floor(r() * empty.length)]
        flyT = 4.5
      }
      flyNext = 8 + r() * 4
    }

    if (phase === 'start') {
      if (phaseT > 1.1) {
        phase = 'play'
        phaseT = 0
      }
      return
    }
    if (phase === 'dying') {
      if (phaseT > 1.4) {
        lives--
        if (lives <= 0) {
          if (state === 'play') go('over')
          else newGame()
          return
        }
        respawn()
        phase = 'play'
        phaseT = 0
      }
      return
    }
    if (phase === 'home') {
      if (phaseT > 0.55) {
        if (homes.every(Boolean)) {
          phase = 'clear'
          phaseT = 0
          score += 1000
          ;[523, 659, 784, 1047, 1319].forEach((n, i) => sfx.tone(n, 0.3, { type: 'triangle', gain: 0.06, when: i * 0.1 }))
        } else {
          respawn()
          phase = 'play'
          phaseT = 0
        }
      }
      return
    }
    if (phase === 'clear') {
      if (phaseT > 2.4) startLevel(level + 1)
      return
    }

    // --- play
    timeLeft -= dt
    if (timeLeft <= 0) {
      timeLeft = 0
      kill('time')
      return
    }
    // input
    let want = -1
    if (useBot) {
      botWait -= dt
      if (frog.hop === 0 && botWait <= 0) {
        const a = botDecide()
        if (a === 4) botWait = 0.08
        else {
          want = a
          botWait = HOP_T + 0.03 + r() * 0.07 // a breath between hops
        }
      }
    } else {
      if (keys.hit('ArrowUp', 'KeyW')) want = 0
      else if (keys.hit('ArrowLeft', 'KeyA')) want = 1
      else if (keys.hit('ArrowDown', 'KeyS')) want = 2
      else if (keys.hit('ArrowRight', 'KeyD')) want = 3
      else if (touch.swipe) want = { up: 0, left: 1, down: 2, right: 3 }[touch.swipe]
      else if (tapDir >= 0) want = tapDir
      tapDir = -1
      // held keys repeat
      const held = keys.down('ArrowUp', 'KeyW') ? 0 : keys.down('ArrowLeft', 'KeyA') ? 1 : keys.down('ArrowDown', 'KeyS') ? 2 : keys.down('ArrowRight', 'KeyD') ? 3 : -1
      if (held >= 0 && want < 0) {
        frog.holdT += dt
        if (frog.holdT > 0.26 && frog.hop === 0) {
          want = held
          frog.holdT = 0.14
        }
      } else if (want >= 0) frog.holdT = 0
      else frog.holdT = 0
    }
    if (want >= 0) {
      if (frog.hop === 0) hop(want)
      else frog.queued = want
    }

    // the hop itself
    if (frog.hop > 0) {
      frog.hop += dt / HOP_T
      const k = ease.outSine(clamp(frog.hop))
      frog.x = lerp(frog.fx, frog.tx, k)
      if (frog.hop >= 0.5) frog.row = frog.trow
      if (frog.hop >= 1) {
        frog.hop = 0
        frog.x = frog.tx
        frog.row = frog.trow
        frog.land = 1
        const l = laneOf[frog.row]
        if (l?.river) rings.add(G + frog.x, rowY(frog.row), 16, 0.5, rgba(C.lagoon, 0.8))
        if (frog.row < maxRow) {
          maxRow = frog.row
          score += 10
        }
        // a home?
        if (frog.row === 0) {
          let bay = -1
          for (let k = 0; k < 5; k++) if (Math.abs(frog.x - BAYS[k]) < BAY_TOL) bay = k
          if (bay < 0 || homes[bay]) {
            kill('bank')
            return
          }
          homes[bay] = true
          homeT[bay] = 0
          score += 50 + Math.floor(timeLeft) * 10
          if (fly === bay) {
            score += 200
            fly = -1
            rings.add(G + BAYS[bay], rowY(0), 20, 0.6, C.fern)
          }
          rings.add(G + BAYS[bay], rowY(0), 26, 0.7, C.moss)
          sparks.emit(G + BAYS[bay], rowY(0), preview ? 6 : 12, { speed: 60, life: 0.6, color: C.moss, r })
          ;[659, 784, 988].forEach((n, i) => sfx.tone(n, 0.18, { type: 'triangle', gain: 0.06, when: i * 0.07 }))
          phase = 'home'
          phaseT = 0
          return
        }
        if (frog.queued >= 0) {
          const q = frog.queued
          frog.queued = -1
          hop(q)
        }
      }
    } else frog.idle += dt

    // carried by the river
    const l = laneOf[frog.row]
    if (l?.river && frog.hop === 0) {
      frog.x += l.v * dt
      frog.fx = frog.tx = frog.x
    }
    frog.face += (frog.faceT - frog.face) * damp(30, dt)

    // collisions (airborne for the first half of a hop — generous)
    if (frog.hop === 0 || frog.hop > 0.55) {
      if (frog.x < 4 || frog.x > LA - 4) {
        kill(l?.river ? 'water' : 'road')
        return
      }
      if (frog.row !== 0 && !safeAt(frog.x, frog.row, 0)) kill(l?.river ? 'water' : 'road')
    }
  }

  /* ------------------------------------------------------------------ draw */

  let px = 1 // one CSS px in playfield units

  function roundRect(x: number, y: number, w: number, h: number, rr: number) {
    const k = Math.min(rr, w / 2, h / 2)
    ctx.moveTo(x + k, y)
    ctx.arcTo(x + w, y, x + w, y + h, k)
    ctx.arcTo(x + w, y + h, x, y + h, k)
    ctx.arcTo(x, y + h, x, y, k)
    ctx.arcTo(x, y, x + w, y, k)
    ctx.closePath()
  }

  /** 45° hatching inside a rectangle, clipped analytically (no canvas clip). */
  function hatchIn(x: number, y: number, w: number, h: number, gap: number, color: string, ang = 1) {
    if (w <= 0 || h <= 0) return
    ctx.strokeStyle = color
    ctx.beginPath()
    for (let c = gap / 2; c < w + h; c += gap) {
      // ang > 0: lines u + v = c (rising); else u − v = c − h (falling); u, v local to the rect
      const u0 = Math.max(0, c - h)
      const u1 = Math.min(w, c)
      if (u1 <= u0) continue
      if (ang > 0) {
        ctx.moveTo(x + u0, y + h - (c - u0))
        ctx.lineTo(x + u1, y + h - (c - u1))
      } else {
        ctx.moveTo(x + u0, y + (c - u0))
        ctx.lineTo(x + u1, y + (c - u1))
      }
    }
    ctx.stroke()
  }

  function drawGroundStatic() {
    ctx.lineWidth = px
    // verges: start + median
    for (const row of [START_ROW, MEDIAN]) {
      const y0 = TOP + row * TILE
      ctx.strokeStyle = rgba(C.moss, 0.35)
      ctx.beginPath()
      const rr = rng(row * 7)
      for (let i = 0; i < 46; i++) {
        const gx = rr() * LA
        const gy = y0 + 4 + rr() * (TILE - 8)
        ctx.moveTo(gx, gy + 2.5)
        ctx.lineTo(gx - 1, gy - 1.5)
        ctx.moveTo(gx + 1.6, gy + 2.5)
        ctx.lineTo(gx + 2.4, gy - 1)
      }
      ctx.stroke()
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(0, y0)
      ctx.lineTo(LA, y0)
      ctx.moveTo(0, y0 + TILE)
      ctx.lineTo(LA, y0 + TILE)
      ctx.stroke()
    }
    // road: lane dividers
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.setLineDash([7, 7])
    ctx.beginPath()
    for (let row = 8; row <= 11; row++) {
      const y = TOP + row * TILE
      ctx.moveTo(0, y)
      ctx.lineTo(LA, y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    // a double centre line between the two directions of traffic? subtle kerb ticks instead
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    for (let x = 0; x <= LA; x += 6) {
      ctx.moveTo(x, TOP + 7 * TILE)
      ctx.lineTo(x, TOP + 7 * TILE + 2)
      ctx.moveTo(x, TOP + 12 * TILE)
      ctx.lineTo(x, TOP + 12 * TILE - 2)
    }
    ctx.stroke()
    // river banks
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(0, TOP + 1 * TILE)
    ctx.lineTo(LA, TOP + 1 * TILE)
    ctx.stroke()
  }

  function drawWaves(t: number) {
    ctx.lineWidth = px
    // river: drifting wave hairlines
    for (let row = 1; row <= 5; row++) {
      const yc = rowY(row)
      const l = laneOf[row]
      const drift = l ? l.off * 0.25 : 0
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = rgba(k ? C.sky : C.lagoon, k ? 0.45 : 0.3)
        ctx.setLineDash([9, 11])
        ctx.lineDashOffset = -drift - k * 7
        ctx.beginPath()
        const yy = yc + (k ? 6 : -6)
        for (let x = 0; x <= LA; x += 6) {
          const y = yy + Math.sin(x * 0.07 + t * 1.3 + row * 2 + k) * 1.1
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
  }

  function drawHedge() {
    const y0 = TOP
    const y1 = TOP + TILE
    // the hedge, with five bays cut into it
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, y0, LA, TILE)
    for (const bx of BAYS) {
      ctx.moveTo(bx + 17, y1 + 0.5)
      ctx.lineTo(bx + 17, y0 + 9)
      ctx.arcTo(bx + 17, y0 + 3, bx, y0 + 3, 8)
      ctx.lineTo(bx - 9, y0 + 3)
      ctx.arcTo(bx - 17, y0 + 3, bx - 17, y0 + 9, 8)
      ctx.lineTo(bx - 17, y1 + 0.5)
      ctx.closePath()
    }
    ctx.clip('evenodd')
    ctx.lineWidth = px
    hatchIn(0, y0, LA, TILE, 3, rgba(C.moss, 0.45), 1)
    hatchIn(0, y0, LA, TILE, 6, rgba(C.moss, 0.25), -1)
    ctx.restore()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = px
    ctx.beginPath()
    ctx.moveTo(0, y0)
    ctx.lineTo(LA, y0)
    for (const bx of BAYS) {
      ctx.moveTo(bx + 17, y1)
      ctx.lineTo(bx + 17, y0 + 11)
      ctx.arcTo(bx + 17, y0 + 3, bx, y0 + 3, 8)
      ctx.arcTo(bx - 17, y0 + 3, bx - 17, y0 + 11, 8)
      ctx.lineTo(bx - 17, y1)
    }
    ctx.stroke()
  }

  function drawHomes(t: number) {
    ctx.lineWidth = px
    // lily pads, filled homes, the fly
    BAYS.forEach((bx, k) => {
      const cy = rowY(0) + 1.5
      const rot = Math.sin(t * 0.6 + k * 1.7) * 0.25 + k
      ctx.strokeStyle = homes[k] ? C.moss : rgba(C.moss, 0.8)
      ctx.beginPath()
      ctx.arc(bx, cy, 9, rot + 0.3, rot + TAU - 0.3)
      ctx.lineTo(bx, cy)
      ctx.closePath()
      ctx.stroke()
      ctx.strokeStyle = rgba(C.moss, 0.4)
      ctx.beginPath()
      for (let v = 0; v < 5; v++) {
        const a = rot + 0.9 + v * 1.12
        ctx.moveTo(bx, cy)
        ctx.lineTo(bx + Math.cos(a) * 7.5, cy + Math.sin(a) * 7.5)
      }
      ctx.stroke()
      if (homes[k]) {
        const pop = ease.outBack(clamp(homeT[k] / 0.35))
        drawFrog(bx, cy - 1, 0, 0.72 * pop, 0, 0, t + k, false)
        if (phase === 'clear') {
          const w = clamp((phaseT - k * 0.15) / 0.6)
          if (w > 0 && w < 1) {
            ctx.strokeStyle = rgba(C.moss, 1 - w)
            ctx.beginPath()
            ctx.arc(bx, cy, 10 + w * 18, 0, TAU)
            ctx.stroke()
          }
        }
      }
      if (fly === k && !homes[k]) drawFly(bx + Math.sin(t * 3) * 3, cy - 2 + Math.cos(t * 4.4) * 2, t)
    })
  }

  function drawFly(x: number, y: number, t: number) {
    ctx.strokeStyle = C.ink2
    ctx.lineWidth = px
    const fl = Math.sin(t * 40) * 0.5 + 0.5
    ctx.beginPath()
    ctx.ellipse(x, y, 1.6, 2.6, 0, 0, TAU)
    ctx.moveTo(x - 1, y - 1)
    ctx.ellipse(x - 3.2, y - 1.2 - fl, 2.4, 1.3, -0.4, 0, TAU)
    ctx.moveTo(x + 5.6, y - 1.2)
    ctx.ellipse(x + 3.2, y - 1.2 - fl, 2.4, 1.3, 0.4, 0, TAU)
    ctx.stroke()
  }

  /* ----- vehicles: top-down, local +x is forward */

  function vehicle(kind: Kind, len: number, color: string, seed: number, t: number) {
    const hw = kind === 'racer' ? 5.5 : kind === 'truck' ? 8.5 : 7.5
    ctx.lineWidth = px
    // wheel marks
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    const wheels = kind === 'truck' ? [-len / 2 + 6, -len / 2 + 12, len / 2 - 22, len / 2 - 7] : kind === 'tractor' ? [-len / 2 + 6, len / 2 - 6] : [-len / 2 + 6.5, len / 2 - 7]
    wheels.forEach((wx, i) => {
      const big = kind === 'tractor' && i === 0
      const ww = big ? 8 : 5
      const wh = big ? 3.2 : 2.2
      ctx.rect(wx - ww / 2, -hw - wh + 0.6, ww, wh)
      ctx.rect(wx - ww / 2, hw - 0.6, ww, wh)
    })
    ctx.stroke()
    if (kind === 'tractor') {
      // treads on the big wheels
      ctx.beginPath()
      for (let k = -3; k <= 3; k += 2) {
        const wx = -len / 2 + 6 + k + (mod(t * 20, 2) - 1)
        ctx.moveTo(wx, -hw - 2.6)
        ctx.lineTo(wx, -hw + 0.6)
        ctx.moveTo(wx, hw - 0.6)
        ctx.lineTo(wx, hw + 2.6)
      }
      ctx.stroke()
    }
    // body
    ctx.beginPath()
    if (kind === 'truck') {
      roundRect(len / 2 - 15, -hw + 1, 15, hw * 2 - 2, 3) // cab
      roundRect(-len / 2, -hw, len - 17, hw * 2, 1.5) // trailer
    } else if (kind === 'racer') {
      ctx.moveTo(len / 2, 0)
      ctx.quadraticCurveTo(len / 2 - 4, -hw, len / 2 - 12, -hw)
      ctx.lineTo(-len / 2 + 5, -hw)
      ctx.lineTo(-len / 2 + 2, -hw + 1)
      ctx.lineTo(-len / 2 + 2, hw - 1)
      ctx.lineTo(-len / 2 + 5, hw)
      ctx.lineTo(len / 2 - 12, hw)
      ctx.quadraticCurveTo(len / 2 - 4, hw, len / 2, 0)
      ctx.closePath()
    } else if (kind === 'tractor') {
      roundRect(-len / 2 + 2, -hw + 1.5, len - 6, hw * 2 - 3, 2.5)
    } else roundRect(-len / 2, -hw, len, hw * 2, kind === 'coupe' ? 5 : 3.5)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = px * 1.25
    ctx.stroke()
    ctx.lineWidth = px
    // details
    ctx.beginPath()
    if (kind === 'sedan' || kind === 'coupe') {
      const fw = len * (kind === 'coupe' ? 0.12 : 0.18)
      const rw = -len * (kind === 'coupe' ? 0.22 : 0.27)
      // windscreen and rear window, curved
      ctx.moveTo(fw, -hw + 2)
      ctx.quadraticCurveTo(fw + 2.5, 0, fw, hw - 2)
      ctx.moveTo(rw, -hw + 2)
      ctx.quadraticCurveTo(rw - 2, 0, rw, hw - 2)
      // side windows
      ctx.moveTo(rw + 1, -hw + 2)
      ctx.lineTo(fw - 1, -hw + 2)
      ctx.moveTo(rw + 1, hw - 2)
      ctx.lineTo(fw - 1, hw - 2)
      ctx.strokeStyle = color
      ctx.stroke()
      hatchIn(rw + 1, -hw + 3, fw - rw - 2, hw * 2 - 6, 2.2, rgba(color, 0.4))
      // headlights
      ctx.beginPath()
      ctx.arc(len / 2 - 2.2, -hw + 2.5, 1.1, 0, TAU)
      ctx.arc(len / 2 - 2.2, hw - 2.5, 1.1, 0, TAU)
      ctx.fillStyle = color
      ctx.fill()
    } else if (kind === 'truck') {
      ctx.moveTo(len / 2 - 6, -hw + 2.5)
      ctx.lineTo(len / 2 - 6, hw - 2.5)
      for (let x = -len / 2 + 5; x < len / 2 - 20; x += 5) {
        ctx.moveTo(x, -hw + 1.5)
        ctx.lineTo(x, hw - 1.5)
      }
      ctx.strokeStyle = rgba(color, 0.7)
      ctx.stroke()
      hatchIn(len / 2 - 13, -hw + 3, 6, hw * 2 - 6, 2, rgba(color, 0.45))
    } else if (kind === 'tractor') {
      // blade across the front, seat and exhaust
      ctx.moveTo(len / 2 + 0.5, -hw - 3)
      ctx.lineTo(len / 2 + 0.5, hw + 3)
      ctx.moveTo(len / 2 - 3.5, -hw + 2)
      ctx.lineTo(len / 2 + 0.5, -hw - 1)
      ctx.moveTo(len / 2 - 3.5, hw - 2)
      ctx.lineTo(len / 2 + 0.5, hw + 1)
      ctx.rect(-len / 2 + 5, -3.5, 7, 7)
      ctx.strokeStyle = color
      ctx.stroke()
      hatchIn(-len / 2 + 5, -3.5, 7, 7, 1.8, rgba(color, 0.5))
      ctx.beginPath()
      ctx.arc(len / 2 - 8, -hw + 3.2, 1.2, 0, TAU)
      ctx.strokeStyle = C.ink2
      ctx.stroke()
      // puffs
      const p = mod(t * 1.6 + seed, 1)
      ctx.strokeStyle = rgba(C.ink, 0.35 * (1 - p))
      ctx.beginPath()
      ctx.arc(len / 2 - 8 - p * 10, -hw + 3.2 - p * 4, 1.2 + p * 2.5, 0, TAU)
      ctx.stroke()
    } else if (kind === 'racer') {
      // wings, cockpit, number roundel
      ctx.moveTo(len / 2 - 2, -hw - 2.5)
      ctx.lineTo(len / 2 - 2, hw + 2.5)
      ctx.moveTo(-len / 2 + 1, -hw - 2)
      ctx.lineTo(-len / 2 + 1, hw + 2)
      ctx.strokeStyle = color
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(-1, 0, 4.5, 2.6, 0, 0, TAU)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(-1, 0, 1.3, 0, TAU)
      ctx.fillStyle = C.ink
      ctx.fill()
      // speed lines
      ctx.strokeStyle = rgba(color, 0.5)
      ctx.beginPath()
      for (let k = -1; k <= 1; k++) {
        const ln = 6 + mod(seed * 3 + k * 7 + t * 30, 6)
        ctx.moveTo(-len / 2 - 3, k * 3.2)
        ctx.lineTo(-len / 2 - 3 - ln, k * 3.2)
      }
      ctx.stroke()
    }
  }

  function drawLog(x0: number, y: number, len: number, seed: number) {
    const h = 15
    ctx.lineWidth = px
    ctx.beginPath()
    roundRect(x0, y - h / 2, len, h, h / 2)
    ctx.fillStyle = C.paper
    ctx.fill()
    // grain (kept inside the capsule by construction)
    ctx.strokeStyle = rgba(C.moss, 0.55)
    ctx.beginPath()
    const rr = rng(Math.floor(seed * 1000))
    for (let k = 0; k < 4; k++) {
      const yy = y - h / 2 + 3 + k * 3
      const ph = rr() * TAU
      const a = 0.4 + rr() * 0.6
      const edge = k === 0 || k === 3 ? 9 : 6
      const start = x0 + edge + rr() * 8
      const end = x0 + len - edge - rr() * 10
      for (let x = start; x <= end; x += 4) {
        const yv = yy + Math.sin(x * 0.11 + ph) * a
        if (x === start) ctx.moveTo(x, yv)
        else ctx.lineTo(x, yv)
      }
    }
    ctx.stroke()
    // knots
    ctx.strokeStyle = rgba(C.moss, 0.7)
    ctx.beginPath()
    const nk = Math.max(1, Math.floor(len / 50))
    for (let k = 0; k < nk; k++) {
      const kx = x0 + 18 + rr() * (len - 36)
      const ky = y + (rr() - 0.5) * 6
      ctx.ellipse(kx, ky, 2.6, 1.3, 0, 0, TAU)
    }
    ctx.stroke()
    ctx.strokeStyle = C.ink2
    ctx.lineWidth = px * 1.2
    ctx.beginPath()
    roundRect(x0, y - h / 2, len, h, h / 2)
    ctx.stroke()
    // growth rings on the cut end
    ctx.lineWidth = px
    ctx.strokeStyle = rgba(C.moss, 0.9)
    ctx.beginPath()
    ctx.ellipse(x0 + h / 2 - 1.5, y, 4.4, h / 2 - 0.8, 0, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.moss, 0.55)
    ctx.beginPath()
    ctx.ellipse(x0 + h / 2 - 1.5, y, 2.8, 4.4, 0, 0, TAU)
    ctx.moveTo(x0 + h / 2 - 0.2, y)
    ctx.ellipse(x0 + h / 2 - 1.5, y, 1.3, 2, 0, 0, TAU)
    // the far end, seen obliquely: two arcs
    ctx.moveTo(x0 + len - 3, y - 4.5)
    ctx.quadraticCurveTo(x0 + len - 0.5, y, x0 + len - 3, y + 4.5)
    ctx.moveTo(x0 + len - 5.5, y - 2.5)
    ctx.quadraticCurveTo(x0 + len - 4, y, x0 + len - 5.5, y + 2.5)
    ctx.stroke()
  }

  function drawTurtles(x0: number, y: number, n: number, dir: number, dive: number, t: number, seed: number) {
    const w = 22
    const alpha = 1 - dive * 0.75
    if (dive >= 1) {
      // only ripples where they went down
      ctx.strokeStyle = rgba(C.lagoon, 0.35)
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const cx = x0 + w / 2 + i * w
        ctx.moveTo(cx + 7 + Math.sin(t * 3 + i) * 1.5, y)
        ctx.ellipse(cx, y, 7 + Math.sin(t * 3 + i) * 1.5, 4, 0, 0, TAU)
      }
      ctx.stroke()
      ctx.setLineDash([])
      return
    }
    ctx.save()
    ctx.globalAlpha = alpha
    if (dive > 0) ctx.setLineDash([lerp(6, 1, dive), lerp(0.01, 3, dive)])
    for (let i = 0; i < n; i++) {
      const cx = x0 + w / 2 + i * w
      const pad = Math.sin(t * 7 + i * 1.3 + seed) // paddle
      ctx.lineWidth = px
      ctx.strokeStyle = C.lagoon
      // flippers
      ctx.beginPath()
      for (const s of [-1, 1]) {
        ctx.moveTo(cx + dir * 4.5 + 3.5, y + s * (6.2 + pad * 0.8))
        ctx.ellipse(cx + dir * 4.5, y + s * (6.2 + pad * 0.8), 3.5, 1.6, dir * s * (0.5 + pad * 0.3), 0, TAU)
        ctx.moveTo(cx - dir * 4.5 + 2.5, y + s * (5.6 - pad * 0.6))
        ctx.ellipse(cx - dir * 4.5, y + s * (5.6 - pad * 0.6), 2.5, 1.3, -dir * s * 0.6, 0, TAU)
      }
      // head
      ctx.moveTo(cx + dir * 11 + 2.6, y)
      ctx.ellipse(cx + dir * 10.4, y, 2.7, 2.3, 0, 0, TAU)
      ctx.stroke()
      // shell
      ctx.beginPath()
      ctx.ellipse(cx, y, 8.2, 6.6, 0, 0, TAU)
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.lineWidth = px * 1.2
      ctx.strokeStyle = C.ink2
      ctx.stroke()
      // scutes: a central hexagon and spokes
      ctx.lineWidth = px
      ctx.strokeStyle = rgba(C.lagoon, 0.85)
      ctx.beginPath()
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * TAU
        const hx = cx + Math.cos(a) * 3.6
        const hy = y + Math.sin(a) * 3
        if (k === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU
        ctx.moveTo(cx + Math.cos(a) * 3.6, y + Math.sin(a) * 3)
        ctx.lineTo(cx + Math.cos(a) * 7.6, y + Math.sin(a) * 6.1)
      }
      ctx.stroke()
      // eye
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(cx + dir * 11.4, y - 1, 0.6, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    ctx.setLineDash([])
  }

  function drawLanes(t: number) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, TOP, LA, ROWS * TILE)
    ctx.clip()
    for (const l of lanes) {
      const y = rowY(l.row)
      const dir = Math.sign(l.v)
      for (const o of l.objs) {
        const x0 = objX(o, l.off)
        if (x0 > LA + 10 || x0 + o.len < -20) continue
        if (l.kind === 'log') drawLog(x0, y, o.len, o.seed)
        else if (l.kind === 'turtle3' || l.kind === 'turtle2') drawTurtles(x0, y, l.kind === 'turtle3' ? 3 : 2, dir, diveLevel(o, lt), t, o.seed)
        else {
          ctx.save()
          ctx.translate(x0 + o.len / 2, y + Math.sin(t * 9 + o.seed) * 0.25)
          if (dir < 0) ctx.scale(-1, 1)
          vehicle(l.kind, o.len, l.color, o.seed, t)
          ctx.restore()
        }
      }
    }
    ctx.restore()
  }

  /** The frog, top-down, facing `face` (0 = up). p = hop progress 0..1 (0 idle). */
  function drawFrog(x: number, y: number, face: number, s: number, p: number, land: number, t: number, alive: boolean) {
    // crouch → leap (stretch + lift) → land (squash)
    let sx = 1
    let sy = 1
    let lift = 0
    let legs = 0 // 0 folded, 1 extended
    if (p > 0) {
      if (p < 0.22) {
        const k = p / 0.22
        sx = 1 + 0.12 * k
        sy = 1 - 0.14 * k
      } else {
        const k = (p - 0.22) / 0.78
        lift = Math.sin(k * Math.PI)
        sx = 0.9 + 0.1 * (1 - lift)
        sy = 1 + 0.2 * lift
        legs = Math.sin(clamp(k * 1.2) * Math.PI)
      }
    }
    if (land > 0) {
      sx *= 1 + 0.14 * land
      sy *= 1 - 0.16 * land
    }
    const S = s * (1 + lift * 0.13)
    // shadow while airborne
    if (lift > 0.05) {
      ctx.strokeStyle = rgba(C.ink, 0.25)
      ctx.lineWidth = px
      ctx.setLineDash([1.5, 2])
      ctx.beginPath()
      ctx.ellipse(x + 1.5, y + 2.5, 7 * s, 7.5 * s, 0, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.save()
    ctx.translate(x, y - lift * 3)
    ctx.rotate(face)
    ctx.scale(sx * S, sy * S)
    const lw = px / S
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = C.ink
    // legs as hollow hairline tubes: a wide ink stroke, then a paper stroke inside it
    const legs2 = () => {
      // back: folded zig-zag ↔ extended
      const kx = lerp(9.6, 6.6, legs)
      const ky = lerp(2.2, 9.6, legs)
      const ax = lerp(8.2, 5.6, legs)
      const ay = lerp(8.4, 15.2, legs)
      // front: planted forward ↔ tucked along the body in flight
      const ex = lerp(8.4, 6.6, legs)
      const ey = lerp(-1.8, 0.2, legs)
      const hx = lerp(7.8, 6.2, legs)
      const hy = lerp(-5.8, 3.6, legs)
      return { kx, ky, ax, ay, ex, ey, hx, hy }
    }
    const limb = () => {
      ctx.beginPath()
      for (const sd of [-1, 1]) {
        const L = legs2()
        ctx.moveTo(sd * 4.6, 4.2)
        ctx.lineTo(sd * L.kx, L.ky)
        ctx.lineTo(sd * L.ax, L.ay)
        ctx.moveTo(sd * 4, -2.4)
        ctx.lineTo(sd * L.ex, L.ey)
        ctx.lineTo(sd * L.hx, L.hy)
      }
    }
    limb()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = C.ink
    ctx.stroke()
    ctx.lineWidth = Math.max(0.2, 2.5 - lw * 2.2)
    ctx.strokeStyle = C.paper
    ctx.stroke()
    // webbed toes
    ctx.lineWidth = lw
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    for (const sd of [-1, 1]) {
      const L = legs2()
      const bdx = L.ax - L.kx
      const bdy = L.ay - L.ky
      const bl = Math.hypot(bdx, bdy) || 1
      const ux = bdx / bl
      const uy = bdy / bl
      for (const sp of [-0.7, 0, 0.7]) {
        const c = Math.cos(sp)
        const sn = Math.sin(sp)
        ctx.moveTo(sd * (L.ax + ux * 1.1), L.ay + uy * 1.1)
        ctx.lineTo(sd * (L.ax + (ux * c - uy * sn) * 3.4), L.ay + (ux * sn + uy * c) * 3.4)
      }
      const fdx = L.hx - L.ex
      const fdy = L.hy - L.ey
      const fl = Math.hypot(fdx, fdy) || 1
      for (const sp of [-0.6, 0.6]) {
        const c = Math.cos(sp)
        const sn = Math.sin(sp)
        ctx.moveTo(sd * (L.hx + (fdx / fl) * 1), L.hy + (fdy / fl) * 1)
        ctx.lineTo(sd * (L.hx + ((fdx / fl) * c - (fdy / fl) * sn) * 2.6), L.hy + ((fdx / fl) * sn + (fdy / fl) * c) * 2.6)
      }
    }
    ctx.stroke()
    // body: an egg, broad at the back
    ctx.beginPath()
    ctx.moveTo(0, -7.2)
    ctx.bezierCurveTo(4.6, -7.2, 6.4, -1, 6, 3.2)
    ctx.bezierCurveTo(5.6, 7.4, 2.6, 8.2, 0, 8.2)
    ctx.bezierCurveTo(-2.6, 8.2, -5.6, 7.4, -6, 3.2)
    ctx.bezierCurveTo(-6.4, -1, -4.6, -7.2, 0, -7.2)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    // back markings: fern hatch in two spots
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = rgba(C.fern, 0.75)
    ctx.beginPath()
    for (let d = -10; d < 12; d += 1.7) {
      ctx.moveTo(-7 + d, 9)
      ctx.lineTo(-1 + d, -1)
    }
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = lw * 1.4
    ctx.beginPath()
    ctx.moveTo(0, -7.2)
    ctx.bezierCurveTo(4.6, -7.2, 6.4, -1, 6, 3.2)
    ctx.bezierCurveTo(5.6, 7.4, 2.6, 8.2, 0, 8.2)
    ctx.bezierCurveTo(-2.6, 8.2, -5.6, 7.4, -6, 3.2)
    ctx.bezierCurveTo(-6.4, -1, -4.6, -7.2, 0, -7.2)
    ctx.closePath()
    ctx.stroke()
    // eyes bulge past the outline
    const blink = alive && (mod(t + x * 0.013, 3.4) < 0.12 || frog.blink > 0) ? 0.15 : 1
    for (const sd of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(sd * 3.4, -5.4, 2.5, 2.5 * Math.max(blink, 0.15), 0, 0, TAU)
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.lineWidth = lw * 1.2
      ctx.stroke()
      if (blink > 0.5) {
        ctx.beginPath()
        ctx.arc(sd * 3.4 + frog.look * 0.6, -5.9, 1.05, 0, TAU)
        ctx.fillStyle = C.ink
        ctx.fill()
      }
    }
    // throat pulse when idle
    if (alive && p === 0) {
      const th = 0.5 + 0.5 * Math.sin(t * 7)
      ctx.lineWidth = lw
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.beginPath()
      ctx.arc(0, -3.6, 1.6 + th * 0.8, 0.3, Math.PI - 0.3)
      ctx.stroke()
    }
    ctx.restore()
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
  }

  function drawDeath() {
    const x = G + deathX
    const y = rowY(deathRow)
    const k = clamp(phaseT / 0.5)
    const fade = 1 - clamp((phaseT - 1.0) / 0.4)
    ctx.save()
    ctx.globalAlpha = fade
    ctx.lineWidth = px
    if (death === 'water') {
      // splash: a crown of droplets and a settling ripple
      ctx.strokeStyle = C.lagoon
      ctx.beginPath()
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42
        const r0 = 4 + k * 4
        const r1 = 7 + k * 8
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.8)
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.8)
      }
      ctx.stroke()
      ctx.strokeStyle = rgba(C.ocean, 0.8)
      ctx.beginPath()
      ctx.ellipse(x, y + 2, 6 + k * 6, 2.5 + k * 2.5, 0, 0, TAU)
      ctx.stroke()
    } else {
      if (death === 'road') {
        // skid: two tyre streaks under a flattened outline with crossed eyes
        ctx.strokeStyle = rgba(C.ink, 0.5)
        ctx.beginPath()
        ctx.moveTo(x - 16 * k, y - 4)
        ctx.lineTo(x + 16 * k, y - 4)
        ctx.moveTo(x - 14 * k, y + 4)
        ctx.lineTo(x + 14 * k, y + 4)
        ctx.stroke()
      } else {
        // out of time / into the hedge: a little starburst of hairlines
        ctx.strokeStyle = rgba(C.ink, 0.5)
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + 0.2
          ctx.moveTo(x + Math.cos(a) * (10 + k * 2), y + Math.sin(a) * (7 + k * 2))
          ctx.lineTo(x + Math.cos(a) * (12 + k * 5), y + Math.sin(a) * (9 + k * 4))
        }
        ctx.stroke()
      }
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.ellipse(x, y, 9, 4.5, 0, 0, TAU)
      ctx.stroke()
      ctx.beginPath()
      for (const s of [-1, 1]) {
        ctx.moveTo(x + s * 3.5 - 1.4, y - 1.4)
        ctx.lineTo(x + s * 3.5 + 1.4, y + 1.4)
        ctx.moveTo(x + s * 3.5 + 1.4, y - 1.4)
        ctx.lineTo(x + s * 3.5 - 1.4, y + 1.4)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawAnnotations() {
    // left gutter: lane ids; right gutter: speed readouts with arrows
    for (const l of lanes) {
      const y = rowY(l.row)
      const id = l.river ? `R${6 - l.row}` : `L${12 - l.row}`
      text(ctx, id, -G / 2, y + 0.5, { size: 5.2, align: 'center', baseline: 'middle', color: C.muted, tracking: 0.1 })
      const sp = Math.abs(Math.round(l.v))
      const dir = Math.sign(l.v)
      const ax = LA + G / 2
      ctx.strokeStyle = rgba(l.color, 0.8)
      ctx.lineWidth = px
      ctx.beginPath()
      ctx.moveTo(ax - 6, y - 4)
      ctx.lineTo(ax + 6, y - 4)
      ctx.moveTo(ax + dir * 6, y - 4)
      ctx.lineTo(ax + dir * 3.5, y - 6)
      ctx.moveTo(ax + dir * 6, y - 4)
      ctx.lineTo(ax + dir * 3.5, y - 2)
      ctx.stroke()
      text(ctx, String(sp), ax, y + 3.5, { size: 4.8, align: 'center', baseline: 'middle', color: C.muted, tracking: 0.04 })
    }
    for (const [row, s] of [
      [START_ROW, 'S'],
      [MEDIAN, 'M'],
      [0, 'H'],
    ] as const)
      text(ctx, s, -G / 2, rowY(row) + 0.5, { size: 5.2, align: 'center', baseline: 'middle', color: C.ink2, tracking: 0.1 })
    // section ticks every row along both gutters
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.beginPath()
    for (let row = 0; row <= ROWS; row++) {
      const y = TOP + row * TILE
      ctx.moveTo(-4, y)
      ctx.lineTo(0, y)
      ctx.moveTo(LA, y)
      ctx.lineTo(LA + 4, y)
    }
    ctx.stroke()
  }

  function drawRuler() {
    const y = TOP + ROWS * TILE + 13
    ctx.lineWidth = px
    // the ruler: one tick per second, a long tick every five
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.beginPath()
    for (let s = 0; s <= TIME_LIMIT; s++) {
      const x = (s / TIME_LIMIT) * LA
      const len = s % 5 === 0 ? 5 : 2.5
      ctx.moveTo(x, y - 4)
      ctx.lineTo(x, y - 4 - len)
    }
    ctx.moveTo(0, y - 4)
    ctx.lineTo(LA, y - 4)
    ctx.stroke()
    if (!trimB) text(ctx, '0', 0, y + 11, { size: 5.4, align: 'left', baseline: 'middle', color: C.muted, tracking: 0.12 })
  }

  function drawTimer(t: number) {
    const y = TOP + ROWS * TILE + 13
    const k = timeLeft / TIME_LIMIT
    const low = timeLeft < 8
    const x1 = LA * k
    ctx.lineWidth = px
    // the remaining time as a hatched bar
    const col = low ? C.ocean : C.moss
    if (!(low && Math.floor(t * 4) % 2 === 0 && phase === 'play')) {
      hatchIn(0, y - 2, x1, 5, 2, rgba(col, 0.7))
      ctx.strokeStyle = col
      ctx.strokeRect(0, y - 2, x1, 5)
    }
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(x1, y - 9)
    ctx.lineTo(x1, y + 4)
    ctx.stroke()
    if (!trimB) text(ctx, `TIME ${timeLeft.toFixed(1).padStart(4, '0')} S`, LA, y + 11, { size: 5.4, align: 'right', baseline: 'middle', color: low ? C.ocean : C.muted, tracking: 0.12 })
  }

  // Everything that never moves (verges, kerbs, hedge, gutters, ruler) is
  // drawn once per size and level into a device-pixel-aligned offscreen canvas.
  function drawStatic() {
    drawGroundStatic()
    drawHedge()
    if (!trimX) drawAnnotations()
    drawRuler()
  }
  let staticKey = ''
  let staticCanvas: HTMLCanvasElement | null = null
  function blitStatic(sx: number, sy: number) {
    if (typeof document === 'undefined') return false
    const dpr = env.dpr || 1
    const ox0 = f.ox - trimX * f.s
    const key = `${f.s}|${ox0}|${f.oy}|${dpr}|${level}|${trimX}`
    const bx = ox0 * dpr
    const by = f.oy * dpr
    const ix = Math.floor(bx)
    const iy = Math.floor(by)
    if (key !== staticKey || !staticCanvas) {
      const c = staticCanvas ?? document.createElement('canvas')
      c.width = Math.ceil(LW * f.s * dpr) + 2
      c.height = Math.ceil(LH * f.s * dpr) + 2
      const g = c.getContext('2d')
      if (!g) return false
      g.setTransform(f.s * dpr, 0, 0, f.s * dpr, bx - ix, by - iy)
      g.translate(G, 0)
      const main = ctx
      ctx = g
      drawStatic()
      ctx = main
      staticCanvas = c
      staticKey = key
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(staticCanvas, ix + Math.round(sx * f.s * dpr), iy + Math.round(sy * f.s * dpr))
    ctx.restore()
    return true
  }

  let tapDir = -1
  let tapX = 0
  let tapY = 0
  let tapT = 0
  const hover = { x: 0, y: 0, on: false, mouse: false }
  // first-play hints, once per visit
  let hopped = false
  let hopHint = 0
  let riverHint = 0
  let riverHinted = false
  let bayHint = 0
  let bayHinted = false

  const frogScreen = () => ({ x: f.ox + (G - trimX + frog.x) * f.s, y: f.oy + rowY(frog.row) * f.s })
  /** The hop a tap at (x, y) asks for: the dominant axis from the frog (up when level with it). */
  function dirFromFrog(x: number, y: number) {
    const h = frogScreen()
    const dx = x - h.x
    const dy = y - h.y
    if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > TILE * 0.4 * f.s) return dx > 0 ? 3 : 1
    return dy > TILE * 0.4 * f.s ? 2 : 0
  }
  const insideField = (x: number, y: number) => x >= f.ox && y >= f.oy && x <= f.ox + f.lw * f.s && y <= f.oy + f.lh * f.s

  /** A small mono label on a paper chip. */
  function tag(str: string, x: number, y: number, size: number, color: string) {
    setFont(ctx, { size, weight: 600, tracking: 0.24 })
    const w = ctx.measureText(str).width
    ctx.fillStyle = rgba(C.paper, 0.94)
    ctx.fillRect(x - w / 2 - size * 0.5, y - size * 0.75, w + size, size * 1.5)
    text(ctx, str, x, y + size * 0.05, { size, align: 'center', baseline: 'middle', color, tracking: 0.24, weight: 600 })
  }

  /** A dotted hop arc from the frog to a neighbouring tile, with a dot riding it. */
  function hopArc(dir: number, a: number, t: number, ride: boolean) {
    const x0 = frog.x
    const y0 = rowY(frog.row)
    const x1 = x0 + (dir === 1 ? -TILE : dir === 3 ? TILE : 0)
    const y1 = y0 + (dir === 0 ? -TILE : dir === 2 ? TILE : 0)
    const vertical = dir === 0 || dir === 2
    const pt = (k: number) => ({ x: lerp(x0, x1, k) + (vertical ? Math.sin(k * Math.PI) * 6 : 0), y: lerp(y0, y1, k) - (vertical ? 0 : Math.sin(k * Math.PI) * 9) })
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = C.moss
    ctx.lineWidth = px
    ctx.setLineDash([1.2, 2])
    ctx.beginPath()
    for (let i = 0; i <= 12; i++) {
      const q = pt(0.25 + (i / 12) * 0.75)
      if (i === 0) ctx.moveTo(q.x, q.y)
      else ctx.lineTo(q.x, q.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    // the landing mark
    ctx.beginPath()
    ctx.ellipse(x1, y1, 6, 4.5, 0, 0, TAU)
    ctx.stroke()
    if (ride) {
      const q = pt(0.25 + 0.75 * ease.inOutSine((t * 1.1) % 1))
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(q.x, q.y, 1.4, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawHints(t: number, dt: number) {
    const human = state === 'play' && !botParam
    if (human && frog.hop > 0) hopped = true
    const want = human && !hopped && (phase === 'play' || phase === 'start')
    hopHint = clamp(hopHint + (want ? dt * 3 : -dt * 2.5))
    if (hopHint > 0.01 && phase !== 'dying') {
      hopArc(0, hopHint, t, true)
      ctx.save()
      ctx.globalAlpha = hopHint
      tag('HOP', frog.x + TILE * 1.15, rowY(frog.row) - TILE * 0.55, U(5.4, 8.5), C.moss)
      ctx.restore()
    }
    if (human && !riverHinted && frog.row === MEDIAN && frog.hop === 0) {
      riverHinted = true
      riverHint = 2.8
    }
    if (human && !bayHinted && frog.row === 1 && frog.hop === 0) {
      bayHinted = true
      bayHint = 2.8
    }
    riverHint = Math.max(0, riverHint - dt)
    bayHint = Math.max(0, bayHint - dt)
    const fade = (v: number) => clamp(v / 0.5) * clamp((2.8 - v) * 4)
    if (riverHint > 0) {
      ctx.save()
      ctx.globalAlpha = fade(riverHint)
      tag('RIDE THE LOGS · MIND THE DIVERS', LA / 2, rowY(3) + TILE / 2, U(5.2, 8.5), C.lagoon)
      ctx.restore()
    }
    if (bayHint > 0) {
      ctx.save()
      ctx.globalAlpha = fade(bayHint)
      tag('LAND IN AN EMPTY BAY', LA / 2, TOP + TILE + 5, U(5.2, 8.5), C.moss)
      ctx.restore()
    }
    // hover preview (mouse): the hop a click would make
    if (human && hover.on && hover.mouse && phase === 'play' && frog.hop === 0 && insideField(hover.x, hover.y)) hopArc(dirFromFrog(hover.x, hover.y), 0.75, t, false)
  }

  if (pState === 'play') state = 'play'
  if (pState === 'over' && !preview) state = 'over'
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
      if (p.type === 'down') {
        tapX = p.x
        tapY = p.y
        tapT = performance.now()
      } else if (p.type === 'up' && state === 'play' && performance.now() - tapT < 350 && Math.hypot(p.x - tapX, p.y - tapY) < 14) {
        // a tap hops toward the side of the frog it lands on
        tapDir = dirFromFrog(p.x, p.y)
      }
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      const starting = (state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart
      if (starting) go('play')

      if (dt > 0) {
        const human = state === 'play' && !botParam
        update(dt, !human)
        sparks.update(dt, 60, 3)
        rings.update(dt)
        frog.look = Math.sin(t * 0.7) * 0.6
      }

      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: FIG, ruler: !f.compact })
      enterFit(ctx, f)
      ctx.translate(-trimX, 0)
      px = 1 / f.s
      const shx = shake > 0 ? Math.sin(t * 91) * shake * 2.4 : 0
      const shy = shake > 0 ? Math.cos(t * 73) * shake * 2 : 0
      if (!blitStatic(shx, shy)) {
        ctx.translate(G, 0)
        drawStatic()
        ctx.translate(-G, 0)
      }
      ctx.translate(shx, shy)
      ctx.translate(G, 0)
      drawWaves(t)
      drawHomes(t)
      drawLanes(t)
      drawTimer(t)
      // the frog
      if (phase === 'dying') drawDeath()
      else if (phase !== 'clear' && !(phase === 'home')) {
        const p = frog.hop
        const y = frog.hop > 0 ? lerp(rowY(frog.frow), rowY(frog.trow), ease.outSine(clamp(p))) : rowY(frog.row)
        const appear = phase === 'start' ? ease.outBack(clamp((phaseT - 0.35) / 0.4)) : 1
        if (appear > 0) drawFrog(frog.x, y, frog.face, 0.86 * appear, p, frog.land, t, true)
      }
      if (!preview) drawHints(t, dt)
      ctx.translate(-G, 0)
      sparks.draw(ctx, px)
      rings.draw(ctx, px)
      const banner = (str: string, a: number) => {
        if (a <= 0) return
        ctx.save()
        ctx.globalAlpha = a
        ctx.fillStyle = C.paper
        const sz = U(6.8, 9)
        setFont(ctx, { size: sz, weight: 600, tracking: 0.26 })
        const bw = Math.min(LA, ctx.measureText(str).width + sz * 3)
        const bh = sz * 2
        ctx.fillRect(LW / 2 - bw / 2, rowY(MEDIAN) - bh / 2, bw, bh)
        ctx.strokeStyle = C.moss
        ctx.lineWidth = px
        ctx.strokeRect(LW / 2 - bw / 2, rowY(MEDIAN) - bh / 2, bw, bh)
        text(ctx, str, LW / 2, rowY(MEDIAN) + 0.5, { size: sz, align: 'center', baseline: 'middle', color: C.moss, tracking: 0.26, weight: 600 })
        ctx.restore()
      }
      if (phase === 'start') banner(`CROSSING ${String(level).padStart(2, '0')}`, clamp(phaseT * 4) * (1 - clamp((phaseT - 0.9) / 0.2)))
      if (phase === 'clear') banner('ALL HOMES · +1000', 1)
      ctx.restore()

      const shown = state === 'over' ? finalScore : score
      gameHud(ctx, f, env.mode, [
        { label: 'Score', value: fmtScore(shown, 5) },
        { label: 'Frogs', value: String(state === 'over' ? 0 : lives) },
        { label: 'Level', value: String(level).padStart(2, '0') },
      ], [...(trimB && !preview ? [{ label: 'Time', value: timeLeft.toFixed(1).padStart(4, '0') }] : []), { label: 'Best', value: fmtScore(Math.max(hi.get(), shown), 5) }])

      // cards sit over the playfield, or over the whole stage when the field is a narrow column
      const roomy = !f.side && f.lw * f.s >= 300
      const cx = roomy ? f.ox : 0
      const cy = roomy ? f.oy : 0
      const cw = roomy ? f.lw * f.s : env.width
      const ch = roomy ? f.lh * f.s : env.height
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, { kicker: 'After Frogger · Konami, 1981', title: 'Frog', titleEm: 'crossing', lines: ['Five lily pads, one frog at a time', 'Cross before the ruler runs out'], prompt: 'Press Enter · Tap to start', t, appear: stateT * 2 })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, { kicker: newRecord ? 'New best' : 'Game over', title: fmtScore(finalScore, 5), lines: [`Best ${fmtScore(hi.get(), 5)}`], prompt: 'Press Enter · Tap to play again', t, appear: stateT * 2 })

      if (!preview) env.setCursor(state === 'title' || state === 'over' ? 'pointer' : state === 'play' && hover.on && insideField(hover.x, hover.y) ? 'pointer' : 'default')
      keys.endFrame()
      touch.endFrame()
    },
  }
}

export default create
