/*
 * TRACE — after the light-cycle game in Tron (Bally Midway, 1982).
 *
 * A top-down arena on paper with a fine construction grid. Four cycles —
 * the player in ink, three rivals in ocean, lagoon and moss — each lay a
 * continuous 2px wall behind them, turning only at right angles. Hit a wall
 * and your cycle derezzes: a burst of hairline sparks, a surveyor's cross
 * at the spot, and the trail erases itself back toward the start, freeing
 * the floor for everyone else. Last one riding takes the round; first to
 * three takes the heat. Each heat is faster, the rivals sharper, and from
 * heat two the floor gets structural columns.
 *
 * The rivals (and the attract-mode player) choose at every cell between
 * straight, left and right by flood-filling the space each move leaves
 * them, avoiding head-on cells, cutting in ahead of the player when they're
 * feeling bold, and hugging walls to fill their pocket once they're sealed
 * off alone. A small chance of inattention keeps them beatable.
 */

import { C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, regMark, rng, Rings, Sparks, START_KEYS, TAU, text, Touch } from '../kit'
import type { Fit } from '../kit'
import type { CreatePiece } from '../types'

type State = 'attract' | 'title' | 'play' | 'over'
type Phase = 'count' | 'race' | 'end' | 'match'

const U = 5
const DX = [1, 0, -1, 0]
const DY = [0, 1, 0, -1]
const ANG = [0, Math.PI / 2, Math.PI, -Math.PI / 2]
const WINS = 3
const COLORS = [C.ink, C.ocean, C.lagoon, C.moss]
const NAMES = ['INK', 'OCEAN', 'LAGOON', 'MOSS']
// pinwheel starts: [fx, fy, dir]
const STARTS: [number, number, number][] = [
  [0.3, 0.84, 3],
  [0.1, 0.3, 0],
  [0.7, 0.16, 1],
  [0.9, 0.7, 2],
]

interface Rider {
  id: number
  color: string
  name: string
  x: number
  y: number
  d: number
  next: number
  queue: number[]
  acc: number
  alive: boolean
  cells: number[]
  corners: number[]
  erase: number
  eraseDelay: number
  heading: number
  boost: number
  boosting: boolean
  wins: number
  outAt: number
  cx: number
  cy: number
  aggr: number
  player: boolean
  glint: number
}

interface Layout {
  portrait: boolean
  gw: number
  gh: number
  lw: number
  lh: number
}

function layoutFor(w: number, h: number): Layout {
  if (w / h < 0.9) return { portrait: true, gw: 48, gh: 74, lw: 48 * U + 16, lh: 74 * U + 16 + 30 }
  return { portrait: false, gw: 76, gh: 48, lw: 76 * U + 16, lh: 48 * U + 16 + 16 }
}
const FX = 8
const FY = 8

const create: CreatePiece = (env) => {
  const { ctx } = env
  const full = env.mode === 'full'
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(full ? 900 : 300)
  const rings = new Rings()
  const vr = rng(31)
  const ar = rng(97)
  const botParam = env.params.get('bot') === '1'

  let L = layoutFor(env.width, env.height)
  let f: Fit = gameFit(env.width, env.height, env.mode, L.lw, L.lh)
  let GW = L.gw
  let GH = L.gh
  let owner = new Uint8Array(GW * GH)
  let seen = new Uint32Array(GW * GH)
  let queue = new Int32Array(GW * GH)
  let vdist = new Int16Array(GW * GH)
  let vwho = new Uint8Array(GW * GH)
  let gen = 1

  function allocate(gw: number, gh: number) {
    GW = gw
    GH = gh
    owner = new Uint8Array(GW * GH)
    seen = new Uint32Array(GW * GH)
    queue = new Int32Array(GW * GH)
    vdist = new Int16Array(GW * GH)
    vwho = new Uint8Array(GW * GH)
  }

  let state: State = full ? 'title' : 'attract'
  let stateT = 0
  let phase: Phase = 'count'
  let phaseT = 0
  let raceT = 0
  let heat = 1
  let round = 1
  let score = 0
  let finalScore = 0
  let finalText = ''
  let newRecord = false
  let roundWinner: Rider | null = null
  let matchWinner: Rider | null = null
  let shake = 0
  let obstacles: number[] = [] // [x, y, size, …]
  const riders: Rider[] = []

  for (let i = 0; i < 4; i++)
    riders.push({ id: i + 1, color: COLORS[i], name: NAMES[i], x: 0, y: 0, d: 0, next: 0, queue: [], acc: 0, alive: true, cells: [], corners: [], erase: -1, eraseDelay: 0, heading: 0, boost: 1, boosting: false, wins: 0, outAt: 0, cx: 0, cy: 0, aggr: [0.25, 0.75, 0.3, 0.55][i], player: i === 0, glint: i * 0.4 })
  const you = riders[0]

  const playing = () => state === 'play' && !botParam
  const audible = () => state === 'play'
  const speed = () => Math.min(24, 17 + 1.8 * (heat - 1))
  const mistake = () => Math.max(0.006, 0.022 - 0.006 * (heat - 1))

  /* ----------------------------------------------------------- the arena */

  function blocked(x: number, y: number) {
    return x < 0 || y < 0 || x >= GW || y >= GH || owner[y * GW + x] !== 0
  }

  function placeObstacles() {
    obstacles = []
    if (heat < 2) return
    const s = heat >= 3 ? 3 : 2
    const pts: [number, number][] = [
      [0.3, 0.38],
      [0.7, 0.62],
      [0.62, 0.36],
      [0.38, 0.64],
    ]
    if (heat >= 3) pts.push([0.5, 0.5])
    for (const [fx, fy] of pts) {
      const x = Math.round(fx * GW - s / 2)
      const y = Math.round(fy * GH - s / 2)
      obstacles.push(x, y, s)
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) owner[(y + j) * GW + x + i] = 9
    }
  }

  function startRound() {
    owner.fill(0)
    placeObstacles()
    riders.forEach((r, i) => {
      const [fx, fy, d] = STARTS[i]
      r.x = Math.round(fx * (GW - 1))
      r.y = Math.round(fy * (GH - 1))
      r.d = d
      r.next = d
      r.queue = []
      r.acc = 0
      r.alive = true
      r.cells = [r.y * GW + r.x]
      r.corners = [0]
      r.erase = -1
      r.heading = ANG[d]
      r.boost = 1
      r.boosting = false
      owner[r.y * GW + r.x] = r.id
      rings.add((r.x + 0.5) * U, (r.y + 0.5) * U, 12, 0.7, r.color)
    })
    you.name = playing() ? 'YOU' : 'INK'
    phase = 'count'
    phaseT = 0
    raceT = 0
    roundWinner = null
  }

  function newMatch() {
    riders.forEach((r) => (r.wins = 0))
    round = 1
    matchWinner = null
    startRound()
  }

  function reset() {
    const nl = layoutFor(env.width, env.height)
    if (nl.gw !== GW || nl.gh !== GH) allocate(nl.gw, nl.gh)
    L = nl
    f = gameFit(env.width, env.height, env.mode, L.lw, L.lh)
    heat = 1
    score = 0
    sparks.clear()
    rings.clear()
    newMatch()
  }

  /* -------------------------------------------------------------- the AI */

  /** Flood-fill the space from (x, y); returns [cells, touches another rider's head]. */
  function flood(x0: number, y0: number, cap: number, self: Rider): [number, boolean] {
    gen++
    let head = 0
    let tail = 0
    const s = y0 * GW + x0
    seen[s] = gen
    queue[tail++] = s
    let meets = false
    while (head < tail && tail < cap) {
      const c = queue[head++]
      const x = c % GW
      const y = (c - x) / GW
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d]
        const ny = y + DY[d]
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue
        const n = ny * GW + nx
        if (seen[n] === gen) continue
        const o = owner[n]
        if (o) {
          if (!meets && o <= 4 && o !== self.id) {
            const r = riders[o - 1]
            if (r.alive && r.x === nx && r.y === ny) meets = true
          }
          continue
        }
        seen[n] = gen
        queue[tail++] = n
      }
    }
    return [tail, meets]
  }

  function hug(x: number, y: number) {
    let n = 0
    for (let d = 0; d < 4; d++) if (blocked(x + DX[d], y + DY[d])) n++
    return n
  }

  /**
   * Voronoi territory after a candidate move: a multi-source BFS from my new
   * head and every other head; cells I reach first are mine. Returns
   * [mine, the player's, whether anyone else's region touches mine].
   */
  function territory(r: Rider, x0: number, y0: number): [number, number, boolean] {
    gen++
    let head = 0
    let tail = 0
    const s0 = y0 * GW + x0
    seen[s0] = gen
    vdist[s0] = 0
    vwho[s0] = r.id
    queue[tail++] = s0
    for (const o of riders) {
      if (o === r || !o.alive) continue
      const c = o.y * GW + o.x
      seen[c] = gen
      vdist[c] = 0
      vwho[c] = o.id
      queue[tail++] = c
    }
    let mine = 0
    let theirs = 0
    let touch = false
    while (head < tail) {
      const c = queue[head++]
      const w = vwho[c]
      if (w === r.id) mine++
      else if (w === 1) theirs++
      if (w === 0) continue
      const x = c % GW
      const y = (c - x) / GW
      const nd = vdist[c] + 1
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d]
        const ny = y + DY[d]
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue
        const n = ny * GW + nx
        if (owner[n]) continue
        if (seen[n] === gen) {
          if (vwho[n] !== w) {
            if (w === r.id || vwho[n] === r.id) touch = true
            if (vdist[n] === nd && vwho[n] !== 0) vwho[n] = 0
          }
          continue
        }
        seen[n] = gen
        vdist[n] = nd
        vwho[n] = w
        queue[tail++] = n
      }
    }
    return [mine, theirs, touch]
  }

  function choose(r: Rider): number {
    const opts = [r.d, (r.d + 1) % 4, (r.d + 3) % 4]
    const careless = !r.player && ar() < mistake()
    let best = r.d
    let bestV = -1e9
    for (const d of opts) {
      const nx = r.x + DX[d]
      const ny = r.y + DY[d]
      if (blocked(nx, ny)) continue
      let v: number
      if (careless) v = ar() * 10 + (d === r.d ? 6 : 0) - hug(nx, ny) * 3
      else {
        const [mine, theirs, touch] = territory(r, nx, ny)
        if (!touch) {
          // sealed off alone: run long straights through the pocket (the
          // careful wall-hugging fill only comes with later heats)
          const [area] = flood(nx, ny, 4000, r)
          v = area + (d === r.d ? 12 : 0) + hug(nx, ny) * 6 * (heat - 1)
        } else {
          v = mine
          if (mine < 16) v -= 500 - mine * 20
          if (!r.player) v -= theirs * r.aggr * 0.2
          // ride in straights: turning costs a little, turning again right away costs more
          if (d === r.d) v += 8
          else if (r.cells.length - 1 - r.corners[r.corners.length - 1] < 4) v -= 14
          // head-on: another head could take this cell next step; the cautious keep a margin
          for (const o of riders) {
            if (o === r || !o.alive) continue
            const md = Math.abs(o.x - nx) + Math.abs(o.y - ny)
            if (md === 1) v -= 60 + mine * 0.2
            else if (md <= 3) v -= (4 - md) * 30 * (1 - r.aggr)
          }
        }
      }
      if (v > bestV) {
        bestV = v
        best = d
      }
    }
    return best
  }

  /* ------------------------------------------------------------ the race */

  function crash(r: Rider, x: number, y: number) {
    r.alive = false
    r.outAt = raceT
    r.cx = clamp(x, -0.5, GW - 0.5)
    r.cy = clamp(y, -0.5, GH - 0.5)
    r.erase = r.cells.length
    r.eraseDelay = 0.35
    r.boosting = false
    const px = (r.x + 0.5 + DX[r.d] * 0.5) * U
    const py = (r.y + 0.5 + DY[r.d] * 0.5) * U
    sparks.emit(px, py, full ? 40 : 14, { speed: 150, life: 0.8, color: r.color, r: vr })
    sparks.emit(px, py, full ? 14 : 5, { speed: 90, life: 0.5, color: C.ink, r: vr })
    rings.add(px, py, 16, 0.55, r.color)
    rings.add(px, py, 28, 0.8, C.ink, 4)
    shake = Math.max(shake, r.player ? 4 : 1.6)
    if (audible()) {
      const g = r.player ? 1 : 0.55
      env.sfx.noise(0.42, { filter: 1800, to: 160, gain: 0.15 * g, room: 0.3, pan: clamp((x / GW) * 2 - 1, -0.8, 0.8) })
      env.sfx.tone(r.player ? 220 : 330, 0.45, { type: 'triangle', gain: 0.07 * g, to: r.player ? 82 : 140, room: 0.3 })
    }
    if (playing() && !r.player && you.alive) score += 200
  }

  function stepRider(r: Rider, drives: boolean) {
    // pick the direction for this step
    if (r.player && !drives) {
      while (r.queue.length) {
        const q = r.queue.shift()!
        if (q !== r.d && q !== (r.d + 2) % 4) {
          r.d = q
          break
        }
      }
    } else {
      // the decision made a step ago, re-checked against what has moved since
      let d = r.next
      if (blocked(r.x + DX[d], r.y + DY[d])) d = choose(r)
      r.d = d
    }
    const prevD = r.cells.length > 1 ? dirBetween(r.cells[r.cells.length - 2], r.cells[r.cells.length - 1]) : r.d
    const nx = r.x + DX[r.d]
    const ny = r.y + DY[r.d]
    if (blocked(nx, ny)) {
      crash(r, nx, ny)
      return
    }
    if (r.d !== prevD && r.cells.length > 1) {
      r.corners.push(r.cells.length - 1)
      if (audible() && r.player) env.sfx.tone(784, 0.025, { type: 'sine', gain: 0.03, room: 0.05 })
    }
    r.x = nx
    r.y = ny
    owner[ny * GW + nx] = r.id
    r.cells.push(ny * GW + nx)
    if (r.player && playing()) score += 1
    if (!r.player || drives) r.next = choose(r)
    else r.next = r.queue.length && r.queue[0] !== (r.d + 2) % 4 ? r.queue[0] : r.d
  }

  function dirBetween(a: number, b: number) {
    const ax = a % GW
    const bx = b % GW
    if (bx > ax) return 0
    if (bx < ax) return 2
    return b > a ? 1 : 3
  }

  function aiBoost(r: Rider, drives: boolean) {
    if (r.player && !drives) {
      const was = r.boosting
      r.boosting = (keys.down('Space', 'ShiftLeft', 'ShiftRight') || touchBoost) && r.boost > 0.02
      if (r.boosting && !was && audible()) env.sfx.noise(0.35, { filter: 500, to: 2200, gain: 0.05, room: 0.15 })
    } else {
      // bold riders boost on a clear straight when lining up a cut
      const ahead = (() => {
        let n = 0
        for (let k = 1; k <= 10; k++) {
          if (blocked(r.x + DX[r.d] * k, r.y + DY[r.d] * k)) break
          n++
        }
        return n
      })()
      const near = riders.some((o) => o !== r && o.alive && Math.abs(o.x - r.x) + Math.abs(o.y - r.y) < 16)
      if (r.boosting) r.boosting = r.boost > 0.05 && ahead >= 6
      else r.boosting = r.boost > 0.6 && ahead >= 10 && near && ar() < r.aggr * 0.05
    }
  }

  function updateRace(dt: number, drives: boolean) {
    raceT += dt
    // the pace tightens the longer a round runs
    const v = speed() * (1 + Math.min(0.8, raceT * 0.022))
    for (const r of riders) {
      if (!r.alive) continue
      aiBoost(r, drives)
      if (r.boosting) r.boost = Math.max(0, r.boost - dt * 0.55)
      else r.boost = Math.min(1, r.boost + dt * 0.12)
      r.acc += v * (r.boosting ? 1.65 : 1) * dt
    }
    // step in time order so nobody gets two moves ahead of anyone else
    for (let guard = 0; guard < 16; guard++) {
      let pick: Rider | null = null
      for (const r of riders) if (r.alive && r.acc >= 1 && (!pick || r.acc > pick.acc)) pick = r
      if (!pick) break
      pick.acc -= 1
      stepRider(pick, drives || !pick.player)
    }
    const alive = riders.filter((r) => r.alive)
    if (alive.length <= 1) endRound(alive[0] ?? null)
  }

  function endRound(w: Rider | null) {
    phase = 'end'
    phaseT = 0
    roundWinner = w
    if (w) {
      w.wins++
      rings.add((w.x + 0.5) * U, (w.y + 0.5) * U, 18, 0.8, w.color)
      rings.add((w.x + 0.5) * U, (w.y + 0.5) * U, 32, 1.2, C.ink, 6)
      if (w.player && playing()) score += 1000
      if (w.wins >= WINS) matchWinner = w
    }
    if (state === 'play' || state === 'title' || state === 'over') {
      const g = state === 'play' ? 1 : 0.35
      const root = w?.player ? 523.25 : 392
      ;[1, 1.25, 1.5, 2].forEach((m, i) => env.sfx.tone(root * m, 0.7, { type: 'triangle', gain: 0.05 * g, when: i * 0.07, filter: 2600, room: 0.35 }))
    }
  }

  function updatePhase(dt: number, drives: boolean) {
    phaseT += dt
    if (phase === 'count') {
      const before = Math.floor((phaseT - dt) / 0.6)
      const now = Math.floor(phaseT / 0.6)
      if (now !== before && now <= 3 && audible()) env.sfx.tone(now === 3 ? 880 : 440, now === 3 ? 0.25 : 0.12, { type: 'triangle', gain: 0.06 })
      if (phaseT >= 1.8) {
        phase = 'race'
        phaseT = 0
        riders.forEach((r) => {
          if (!r.player || drives) r.next = choose(r)
        })
      }
      return
    }
    if (phase === 'race') {
      // watch the rivals finish at a brisk pace once you're out
      const fast = !you.alive && playing() ? 2 : 1
      for (let i = 0; i < fast; i++) if (phase === 'race') updateRace(dt, drives)
      return
    }
    if (phase === 'end') {
      // everyone still standing erases too, in a staggered sweep
      if (phaseT > 1.1)
        riders.forEach((r, i) => {
          if (r.erase < 0 && phaseT > 1.1 + i * 0.12) {
            r.erase = r.cells.length
            r.eraseDelay = 0
          }
        })
      if (phaseT > 2.5) {
        if (matchWinner) {
          phase = 'match'
          phaseT = 0
          if (playing()) {
            if (matchWinner.player) score += 2500
            else {
              finalScore = score
              const w = you.wins
              finalText = `Heat ${heat} · lost ${w}–${matchWinner.wins} to ${matchWinner.name.toLowerCase()}`
              go('over')
            }
          }
        } else {
          round++
          startRound()
        }
      }
      return
    }
    if (phase === 'match' && phaseT > 2.6) {
      // a won heat moves you up; the attract demo cycles through the first three
      heat = playing() ? heat + 1 : (heat % 3) + 1
      newMatch()
    }
  }

  function updateErase(dt: number) {
    for (const r of riders) {
      if (r.erase < 0) continue
      if (r.eraseDelay > 0) {
        r.eraseDelay -= dt
        continue
      }
      const before = Math.ceil(r.erase)
      r.erase = Math.max(0, r.erase - dt * Math.max(60, r.cells.length * 1.2))
      const after = Math.ceil(r.erase)
      for (let i = after; i < before; i++) {
        const c = r.cells[i]
        if (owner[c] === r.id) owner[c] = 0
        if (i % 3 === 0 && (full || i % 9 === 0)) {
          const x = ((c % GW) + 0.5) * U
          const y = (Math.floor(c / GW) + 0.5) * U
          sparks.emit(x, y, 1, { speed: 45, life: 0.45, color: r.color, r: vr })
        }
      }
      if (before !== after && audible() && vr() < 0.08) env.sfx.tone(1200 + r.erase * 2, 0.03, { type: 'sine', gain: 0.012 })
      if (r.erase <= 0) r.erase = -2 // fully gone
    }
  }

  /* ----------------------------------------------------------- input */

  let touchBoost = false
  let tdown: { x: number; y: number; t: number; moved: boolean } | null = null

  function turn(d: number) {
    if (you.queue.length < 3) you.queue.push(d)
    // the first real turn (not a reversal or a repeat) retires the hint
    if (phase === 'race' && d !== you.d && d !== (you.d + 2) % 4) turned = true
  }

  // interaction affordances (full mode only)
  let usesTouch = false
  let hintA = 0
  let turned = false
  let firstGame = true
  const hintLabels: [string, number, number, CanvasTextAlign][] = []

  /**
   * The first-play hint: around your cycle, dotted arrows for the three
   * directions you can take, the live one drawn as a moving dot; on touch, a
   * ghost swipe beside it.
   */
  function drawHint(t: number) {
    if (!you.alive || state !== 'play' || botParam) return
    const [hx, hy] = headPos(you)
    const hl = 1 / f.s
    ctx.lineWidth = hl
    ctx.setLineDash([1.6, 2.2])
    const L0 = 2.2 * U
    const L1 = 6.5 * U
    for (const o of [3, 0, 1]) {
      const d = (you.d + o) % 4
      const live = o !== 0
      ctx.strokeStyle = live ? C.moss : C.ink2
      ctx.fillStyle = ctx.strokeStyle
      ctx.globalAlpha = hintA * (live ? 0.95 : 0.4)
      const ax = hx + DX[d] * L0
      const ay = hy + DY[d] * L0
      const bx = hx + DX[d] * L1
      const by = hy + DY[d] * L1
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      const a = ANG[d]
      ctx.moveTo(bx + Math.cos(a + 2.5) * 3, by + Math.sin(a + 2.5) * 3)
      ctx.lineTo(bx, by)
      ctx.lineTo(bx + Math.cos(a - 2.5) * 3, by + Math.sin(a - 2.5) * 3)
      ctx.stroke()
      ctx.setLineDash([1.6, 2.2])
      if (live) {
        const k = (t * 0.9 + (o === 1 ? 0.5 : 0)) % 1
        ctx.beginPath()
        ctx.arc(lerp(ax, bx, k), lerp(ay, by, k), Math.max(1.2, 1.8 / f.s), 0, TAU)
        ctx.fill()
      }
    }
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    const keyName = ['→', '↓', '←', '↑']
    const lab = usesTouch ? 'SWIPE TO TURN' : `${keyName[(you.d + 3) % 4]} ${keyName[(you.d + 1) % 4]} TO TURN`
    hintLabels.push([lab, SX(FX + hx) + 14, SY(FY + hy) + 16, hx < GW * U * 0.7 ? 'left' : 'right'])
  }

  /** Wall ahead within a few cells and no turn queued: chevrons in front of the nose (first heat only). */
  function drawWarning(t: number) {
    if (!you.alive || phase !== 'race' || state !== 'play' || botParam || heat > 1 || you.queue.length) return
    let k = 1
    while (k <= 4 && !blocked(you.x + DX[you.d] * k, you.y + DY[you.d] * k)) k++
    if (k > 4 || !(Math.sin(t * 14) > -0.2)) return
    const [hx, hy] = headPos(you)
    const a = ANG[you.d]
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.2 / f.s
    ctx.beginPath()
    for (let i = 0; i < 2; i++) {
      const dd = (1.6 + i * 0.9) * U
      const cx = hx + Math.cos(a) * dd
      const cy = hy + Math.sin(a) * dd
      ctx.moveTo(cx + Math.cos(a + 2.4) * 3, cy + Math.sin(a + 2.4) * 3)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a - 2.4) * 3, cy + Math.sin(a - 2.4) * 3)
    }
    ctx.stroke()
  }

  /* --------------------------------------------------------------- draw */

  const SX = (x: number) => f.ox + x * f.s
  const SY = (y: number) => f.oy + y * f.s

  function drawArena() {
    const W = GW * U
    const H = GH * U
    const hl = 1 / f.s
    ctx.lineWidth = hl
    ctx.strokeStyle = C.ink
    ctx.globalAlpha = 0.045
    ctx.beginPath()
    for (let x = 4; x < GW; x += 4) {
      ctx.moveTo(x * U, 0)
      ctx.lineTo(x * U, H)
    }
    for (let y = 4; y < GH; y += 4) {
      ctx.moveTo(0, y * U)
      ctx.lineTo(W, y * U)
    }
    ctx.stroke()
    ctx.globalAlpha = 0.1
    ctx.beginPath()
    for (let x = 16; x < GW; x += 16) {
      ctx.moveTo(x * U, 0)
      ctx.lineTo(x * U, H)
    }
    for (let y = 16; y < GH; y += 16) {
      ctx.moveTo(0, y * U)
      ctx.lineTo(W, y * U)
    }
    ctx.stroke()
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    for (let x = 16; x < GW; x += 16)
      for (let y = 16; y < GH; y += 16) {
        ctx.moveTo(x * U - 2.5, y * U)
        ctx.lineTo(x * U + 2.5, y * U)
        ctx.moveTo(x * U, y * U - 2.5)
        ctx.lineTo(x * U, y * U + 2.5)
      }
    ctx.stroke()
    // ruler ticks along the top and left, outside
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    for (let x = 0; x <= GW; x += 2) {
      const l = x % 16 === 0 ? 4 : x % 8 === 0 ? 2.6 : 1.4
      ctx.moveTo(x * U, H + 1.5)
      ctx.lineTo(x * U, H + 1.5 + l)
    }
    for (let y = 0; y <= GH; y += 2) {
      const l = y % 16 === 0 ? 4 : y % 8 === 0 ? 2.6 : 1.4
      ctx.moveTo(W + 1.5, y * U)
      ctx.lineTo(W + 1.5 + l, y * U)
    }
    ctx.stroke()
    // the wall: a double line, like a plan
    ctx.globalAlpha = 1
    ctx.lineWidth = hl * 1.3
    ctx.strokeRect(0, 0, W, H)
    ctx.globalAlpha = 0.35
    ctx.lineWidth = hl
    ctx.strokeRect(-1.6, -1.6, W + 3.2, H + 3.2)
    ctx.globalAlpha = 1
    // start marks
    ctx.strokeStyle = C.ink
    ctx.globalAlpha = 0.22
    for (const [fx, fy] of STARTS) regMark(ctx, (Math.round(fx * (GW - 1)) + 0.5) * U, (Math.round(fy * (GH - 1)) + 0.5) * U, 5)
    ctx.globalAlpha = 1
    // columns: a square with its diagonals, the plan symbol, lightly hatched
    for (let i = 0; i < obstacles.length; i += 3) {
      const x = obstacles[i] * U
      const y = obstacles[i + 1] * U
      const s = obstacles[i + 2] * U
      ctx.fillStyle = C.paper
      ctx.fillRect(x, y, s, s)
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hl * 1.2
      ctx.strokeRect(x, y, s, s)
      ctx.lineWidth = hl
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + s, y + s)
      ctx.moveTo(x + s, y)
      ctx.lineTo(x, y + s)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  /** The trail polyline through cell centres, up to `upTo` cells (fractional), ending at (hx, hy) if given. */
  function trailPath(r: Rider, upTo: number, hx?: number, hy?: number) {
    const n = Math.min(r.cells.length, upTo)
    if (n <= 0) return false
    const cx = (c: number) => ((c % GW) + 0.5) * U
    const cy = (c: number) => (Math.floor(c / GW) + 0.5) * U
    ctx.moveTo(cx(r.cells[0]), cy(r.cells[0]))
    const last = Math.floor(n - 1)
    for (const k of r.corners) {
      if (k === 0) continue
      if (k > last) break
      ctx.lineTo(cx(r.cells[k]), cy(r.cells[k]))
    }
    ctx.lineTo(cx(r.cells[last]), cy(r.cells[last]))
    if (hx !== undefined && hy !== undefined) ctx.lineTo(hx, hy)
    else {
      const fr = n - 1 - last
      if (fr > 0 && last + 1 < r.cells.length) ctx.lineTo(lerp(cx(r.cells[last]), cx(r.cells[last + 1]), fr), lerp(cy(r.cells[last]), cy(r.cells[last + 1]), fr))
    }
    return true
  }

  function headPos(r: Rider): [number, number] {
    const k = r.alive && phase === 'race' ? clamp(r.acc) : 0
    const d = r.alive && phase === 'race' ? r.next : r.d
    return [(r.x + 0.5 + DX[d] * k) * U, (r.y + 0.5 + DY[d] * k) * U]
  }

  function drawTrails() {
    const lw = 2 / f.s
    ctx.lineJoin = 'miter'
    ctx.lineCap = 'butt'
    for (const r of riders) {
      if (r.erase === -2) continue
      ctx.strokeStyle = r.color
      ctx.lineWidth = lw
      ctx.beginPath()
      let ok: boolean
      if (r.erase >= 0) ok = trailPath(r, r.erase)
      else if (r.alive && phase === 'race') {
        const [hx, hy] = headPos(r)
        ok = trailPath(r, r.cells.length, hx, hy)
      } else ok = trailPath(r, r.cells.length)
      if (ok) ctx.stroke()
      // plotted vertices: a tiny open circle at every turn
      if (f.s > 1.2) {
        const n = r.erase >= 0 ? r.erase : r.cells.length
        ctx.lineWidth = 1 / f.s
        ctx.globalAlpha = 0.55
        ctx.beginPath()
        for (const k of r.corners) {
          if (k === 0 || k >= n) continue
          const c = r.cells[k]
          const x = ((c % GW) + 0.5) * U
          const y = (Math.floor(c / GW) + 0.5) * U
          ctx.moveTo(x + 1.3, y)
          ctx.arc(x, y, 1.3, 0, TAU)
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      // the erasing tip glows as a small ring of hairlines
      if (r.erase > 0 && r.eraseDelay <= 0) {
        const i = Math.max(0, Math.floor(r.erase) - 1)
        const c = r.cells[i]
        const x = ((c % GW) + 0.5) * U
        const y = (Math.floor(c / GW) + 0.5) * U
        ctx.lineWidth = 1 / f.s
        ctx.beginPath()
        ctx.arc(x, y, 2.4, 0, TAU)
        ctx.stroke()
      }
    }
  }

  function drawCycle(r: Rider, t: number) {
    const [hx, hy] = headPos(r)
    const hl = 1 / f.s
    const a = r.heading
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(a)
    ctx.scale(1.25, 1.25)
    const len0 = -1.75 * U
    const len1 = 0.62 * U
    const hw = 0.4 * U
    // boost streaks
    if (r.boosting) {
      ctx.strokeStyle = r.color
      ctx.lineWidth = hl
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      for (let i = -1; i <= 1; i++) {
        const o = ((t * 9 + i * 0.37) % 1) * 4
        ctx.moveTo(len0 - 1.5 - o, i * hw * 0.9)
        ctx.lineTo(len0 - 5.5 - o, i * hw * 0.9)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // wheels: dark tyres that stand proud of the fairing, fore and aft (the only solid fills)
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.roundRect(len0 - 1.2, -hw * 0.3, 4.2, hw * 0.6, 1)
    ctx.roundRect(len1 - 3.4, -hw * 0.26, 4.2, hw * 0.52, 1)
    ctx.fill()
    // the fairing: broad over the engine, tapering to a rounded nose
    ctx.fillStyle = C.paper
    ctx.strokeStyle = r.color
    ctx.lineWidth = hl * 1.2
    ctx.beginPath()
    ctx.moveTo(len0 + 2.4, -hw)
    ctx.lineTo(len0 + 6.5, -hw)
    ctx.lineTo(len1 - 2.6, -hw * 0.62)
    ctx.arc(len1 - 2.6, 0, hw * 0.62, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(len0 + 6.5, hw)
    ctx.lineTo(len0 + 2.4, hw)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // hatch over the engine half only
    ctx.save()
    ctx.clip()
    ctx.globalAlpha = 0.55
    ctx.lineWidth = hl
    ctx.beginPath()
    for (let x = len0 + 1; x < len0 + 6.6; x += 1.3) {
      ctx.moveTo(x, hw)
      ctx.lineTo(x + 1.8, -hw)
    }
    ctx.stroke()
    ctx.restore()
    // the rider: a helmet ring, with the cowl line to the nose
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hl
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(len0 + 7.6, 0, hw * 0.5, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(len0 + 7.6 + hw * 0.5, 0)
    ctx.lineTo(len1 - 1.6, 0)
    ctx.stroke()
    // the glint: a four-point sparkle that crosses the nose now and then
    const g = (t * 0.7 + r.glint) % 1
    if (g < 0.16) {
      const k = Math.sin((g / 0.16) * Math.PI)
      const gx = lerp(len0 + 3, len1 - 1, g / 0.16)
      ctx.strokeStyle = r.player ? C.moss : C.ink
      ctx.globalAlpha = k
      ctx.beginPath()
      ctx.moveTo(gx - 2.6 * k, -hw - 1.2)
      ctx.lineTo(gx + 2.6 * k, -hw - 1.2)
      ctx.moveTo(gx, -hw - 1.2 - 2.6 * k)
      ctx.lineTo(gx, -hw - 1.2 + 2.6 * k)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  function drawCrashMark(r: Rider) {
    const x = (r.cx + 0.5) * U
    const y = (r.cy + 0.5) * U
    const s = 3.2
    ctx.strokeStyle = r.color
    ctx.lineWidth = 1.2 / f.s
    ctx.beginPath()
    ctx.moveTo(x - s, y - s)
    ctx.lineTo(x + s, y + s)
    ctx.moveTo(x + s, y - s)
    ctx.lineTo(x - s, y + s)
    ctx.stroke()
    ctx.lineWidth = 1 / f.s
    ctx.beginPath()
    ctx.arc(x, y, s * 1.6, 0, TAU)
    ctx.stroke()
  }

  function crashLabels() {
    if (f.s < 1.1) return
    for (const r of riders) {
      if (r.alive || phase === 'count') continue
      const x = SX(FX + (r.cx + 0.5) * U)
      const y = SY(FY + (r.cy + 0.5) * U)
      const right = r.cx < GW * 0.75
      const label = `${r.name} OUT · ${raceT >= 0 ? fmtT(r.outAt) : ''}`
      text(ctx, label, x + (right ? 14 : -14), y - 10, { size: 8.5, color: r.color, align: right ? 'left' : 'right', tracking: 0.12 })
      ctx.strokeStyle = r.color
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.moveTo(x + (right ? 6 : -6), y - 5)
      ctx.lineTo(x + (right ? 12 : -12), y - 12)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  const fmtT = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s - m * 60
    return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`
  }

  function legend() {
    const x0 = SX(FX)
    const w = GW * U * f.s
    const two = L.portrait && w / 4 < 120
    const col = two ? w / 2 : w / 4
    const small = col < 150
    const names = col >= 96
    for (let i = 0; i < 4; i++) {
      const r = riders[i]
      const x = x0 + col * (two ? i % 2 : i)
      const y0 = SY(FY + GH * U + 8) + (two ? 12 + Math.floor(i / 2) * 15 : Math.min(16, f.s * 8 + 4))
      ctx.strokeStyle = r.color
      ctx.lineWidth = 2
      ctx.globalAlpha = r.alive || phase === 'count' ? 1 : 0.35
      ctx.beginPath()
      ctx.moveTo(x, Math.round(y0) - 3.5)
      ctx.lineTo(x + 14, Math.round(y0) - 3.5)
      ctx.stroke()
      ctx.globalAlpha = 1
      if (names) text(ctx, r.name, x + 20, y0, { size: small ? 8 : 9.5, color: r.alive || phase === 'count' ? C.ink : C.muted, tracking: 0.14 })
      // round pips
      const px = names ? x + 20 + (small ? 44 : 62) : x + 22
      for (let k = 0; k < WINS; k++) {
        ctx.strokeStyle = r.color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(px + k * (small ? 8 : 11), y0 - 3.5, small ? 2.6 : 3.4, 0, TAU)
        if (k < r.wins) {
          ctx.fillStyle = r.color
          ctx.fill()
        }
        ctx.stroke()
      }
      // the player's boost meter
      if (r.player && !small && full) {
        const bx = px + 42
        const bw = Math.min(70, col - 132)
        if (bw > 24) {
          ctx.strokeStyle = C.rule
          ctx.strokeRect(Math.round(bx) + 0.5, Math.round(y0 - 7) + 0.5, Math.round(bw), 6)
          ctx.fillStyle = r.boosting ? C.moss : C.ink2
          ctx.globalAlpha = 0.8
          ctx.fillRect(Math.round(bx) + 1.5, Math.round(y0 - 7) + 1.5, Math.max(0, (bw - 2) * r.boost), 4)
          ctx.globalAlpha = 1
          text(ctx, 'BOOST', bx, y0 + 9, { size: 7.5, color: C.muted, tracking: 0.14 })
        }
      }
    }
  }

  function overlay(t: number) {
    const cx = SX(FX + (GW * U) / 2)
    const cy = SY(FY + (GH * U) / 2)
    const big = clamp(f.s * 34, 30, 96)
    if (phase === 'count') {
      const n = 3 - Math.floor(phaseT / 0.6)
      const k = (phaseT % 0.6) / 0.6
      if (n >= 1) {
        const a = 1 - ease.inCubic(k)
        text(ctx, String(n), cx, cy + big * 0.33, { font: 'serif', size: big * (1.15 - 0.15 * ease.outCubic(k)), color: C.ink, align: 'center', alpha: a })
        ctx.strokeStyle = C.ink
        ctx.lineWidth = 1
        ctx.globalAlpha = a * 0.5
        ctx.beginPath()
        ctx.arc(cx, cy, big * (0.62 + k * 0.25), -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k))
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      text(ctx, `HEAT ${heat} · ROUND ${String(round).padStart(2, '0')} · FIRST TO ${WINS}`, cx, cy + big * 0.95, { size: clamp(f.s * 4.5, 8, 11), color: C.ink2, align: 'center', tracking: 0.18 })
    }
    if (phase === 'race' && phaseT < 0.5) {
      const a = 1 - phaseT / 0.5
      text(ctx, 'GO', cx, cy + big * 0.2, { font: 'serif', size: big * 0.7, italic: true, color: C.moss, align: 'center', alpha: a })
    }
    if (phase === 'race' && !you.alive && playing()) text(ctx, 'OUT — WATCHING THE FINISH', cx, SY(FY) + 20, { size: 9.5, color: C.ink2, align: 'center', tracking: 0.18, alpha: blinkA(t) })
    if (phase === 'end' || phase === 'match') {
      const a = clamp(phaseT / 0.3) * (phase === 'end' ? 1 - clamp((phaseT - 2.1) / 0.4) : 1 - clamp((phaseT - 2.2) / 0.4))
      const w = phase === 'match' ? matchWinner : roundWinner
      const head = phase === 'match' ? (w ? `${w.player ? (playing() ? 'You take' : 'Ink takes') : `${cap(w.name)} takes`}` : 'No one takes') : w ? (w.player && playing() ? 'Round to you' : `Round to ${w.name.toLowerCase()}`) : 'Dead heat'
      const sub = phase === 'match' ? `HEAT ${heat}` : `ROUND ${String(round).padStart(2, '0')} · ${riders.map((r) => r.wins).join('–')}`
      const sz = big * 0.5
      const bw = Math.max(sz * 7.5, 220)
      const top = cy - sz * 0.95
      const bh = sz * 2.25
      ctx.globalAlpha = a * 0.93
      ctx.fillStyle = C.paper
      ctx.fillRect(cx - bw / 2, top, bw, bh)
      ctx.globalAlpha = a
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(cx - bw / 2) + 0.5, Math.round(top) + 0.5, Math.round(bw), Math.round(bh))
      ctx.globalAlpha = 1
      const em = phase === 'match' ? ' the heat' : ''
      setSerif(sz, false)
      const tw = ctx.measureText(head).width
      setSerif(sz, true)
      const ew = em ? ctx.measureText(em).width : 0
      const tx = cx - (tw + ew) / 2
      text(ctx, head, tx, cy + sz * 0.2, { font: 'serif', size: sz, color: C.ink, alpha: a })
      if (em) text(ctx, em, tx + tw, cy + sz * 0.2, { font: 'serif', size: sz, italic: true, color: w?.color === C.ink ? C.moss : (w?.color ?? C.moss), alpha: a })
      text(ctx, sub, cx, cy + sz * 0.95, { size: clamp(f.s * 4, 8, 10.5), color: C.muted, align: 'center', tracking: 0.16, alpha: a })
    }
  }

  const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
  const blinkA = (t: number) => 0.55 + 0.45 * Math.sin(t * 5)
  function setSerif(size: number, italic: boolean) {
    ctx.font = `${italic ? 'italic ' : ''}400 ${size}px "Instrument Serif", "Iowan Old Style", "Times New Roman", serif`
  }

  /* --------------------------------------------------------------- states */

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') {
      reset()
      you.queue = []
      hintA = full && !botParam && firstGame ? 1 : 0
      firstGame = false
      turned = false
    }
    if (next === 'over') newRecord = hi.submit(finalScore)
  }

  allocate(L.gw, L.gh)
  newMatch()
  const ph = Number(env.params.get('heat'))
  if (ph >= 1 && ph <= 9) {
    heat = Math.floor(ph)
    newMatch()
  }
  const ps = env.params.get('state')
  if (ps === 'play') {
    go('play')
    if (ph >= 1 && ph <= 9) {
      heat = Math.floor(ph)
      newMatch()
    }
  }
  else if (ps === 'over') {
    finalScore = 0
    finalText = 'Heat 1 · lost 1–3 to ocean'
    state = 'over'
  }

  return {
    resize(w, h) {
      const want = layoutFor(w, h)
      if (want.gw === GW && want.gh === GH) L = want
      else if (state !== 'play') {
        allocate(want.gw, want.gh)
        L = want
        newMatch()
      } else L = GW > GH ? layoutFor(2, 1) : layoutFor(1, 2)
      f = gameFit(w, h, env.mode, L.lw, L.lh)
    },
    key(code, down) {
      if (down) usesTouch = false
      if (down && state === 'play' && !botParam) {
        const map: Record<string, number> = { ArrowRight: 0, KeyD: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2, ArrowUp: 3, KeyW: 3 }
        if (code in map && !keys.down(code)) turn(map[code])
      }
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight', ...START_KEYS])
    },
    pointer(p) {
      touch.pointer(p)
      if (p.pointerType === 'touch' || p.pointerType === 'pen') usesTouch = true
      else if (p.type === 'move' && !p.pressed) usesTouch = false
      if (state !== 'play' || botParam) return
      const now = performance.now()
      if (p.type === 'down') tdown = { x: p.x, y: p.y, t: now, moved: false }
      else if (p.type === 'move' && tdown && p.pressed) {
        const dx = p.x - tdown.x
        const dy = p.y - tdown.y
        if (Math.hypot(dx, dy) > 22) {
          turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3)
          // re-anchor so an L-shaped drag gives two turns
          tdown = { x: p.x, y: p.y, t: now, moved: true }
          touchBoost = false
        } else if (!tdown.moved && now - tdown.t > 220) touchBoost = true
      } else if (p.type === 'up' || p.type === 'leave') {
        tdown = null
        touchBoost = false
      }
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) go('play')
      if (tdown && !tdown.moved && performance.now() - tdown.t > 220 && state === 'play') touchBoost = true

      if (dt > 0) {
        const drives = state !== 'play' || botParam
        updatePhase(dt, drives)
        updateErase(dt)
        for (const r of riders) {
          const want = ANG[r.alive && phase === 'race' && r.acc > 0.35 ? r.next : r.d]
          const diff = ((((want - r.heading + Math.PI) % TAU) + TAU) % TAU) - Math.PI
          r.heading += diff * damp(28, dt)
        }
        shake = Math.max(0, shake - dt * 16)
        if (state !== 'play' || turned || round > 1 || (phase === 'race' && raceT > 12)) hintA = Math.max(0, hintA - dt * 1.4)
        sparks.update(dt, 0, 2.4)
        rings.update(dt)
      }

      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: f.lw * f.s > 340 ? 'FIG. G.12 — AFTER TRON, 1982 · LIGHT-CYCLE ARENA, PLAN' : 'FIG. G.12 — AFTER TRON, 1982' })
      enterFit(ctx, f)
      const sx = shake > 0 ? Math.sin(t * 77) * shake * 0.4 : 0
      const sy = shake > 0 ? Math.cos(t * 91) * shake * 0.3 : 0
      ctx.translate(FX + sx, FY + sy)
      drawArena()
      drawTrails()
      for (const r of riders) if (!r.alive && phase !== 'count') drawCrashMark(r)
      for (const r of riders) if (r.alive) drawCycle(r, t)
      if (hintA > 0.01) drawHint(t)
      drawWarning(t)
      sparks.draw(ctx, 1 / f.s, 0.03)
      rings.draw(ctx, 1 / f.s)
      ctx.restore()

      crashLabels()
      legend()
      overlay(t)
      for (const [s, x, y, al] of hintLabels) text(ctx, s, x + (al === 'right' ? -28 : 0), y, { size: 9, color: C.moss, align: al, tracking: 0.14, alpha: hintA })
      if (hintA > 0.01 && full && f.s > 0.8) {
        // point at the boost meter too
        text(ctx, usesTouch ? 'PRESS AND HOLD TO BOOST ↓' : 'HOLD SPACE TO BOOST ↓', SX(FX) + 6, SY(FY + GH * U) - 7, { size: 8.5, color: C.moss, tracking: 0.12, alpha: hintA * 0.9 })
      }
      hintLabels.length = 0
      env.setCursor(full && (state === 'title' || (state === 'over' && stateT > 0.8)) ? 'pointer' : 'default')

      gameHud(
        ctx,
        f,
        env.mode,
        [
          { label: 'Score', value: fmtScore(state === 'over' ? finalScore : score, 6) },
          { label: 'Heat', value: String(heat) },
          { label: 'Round', value: String(round).padStart(2, '0') },
        ],
        [
          { label: 'Clock', value: fmtT(raceT) },
          { label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0), 6) },
        ],
      )

      // on wide-short screens, or when the playfield is narrow, the cards use the whole canvas
      const wide = f.side || f.lw * f.s < 320
      const cx = wide ? 0 : f.ox
      const cy = wide ? 0 : f.oy
      const cw = wide ? env.width : f.lw * f.s
      const ch = wide ? env.height : f.lh * f.s
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, {
          kicker: 'After Tron · Bally Midway, 1982',
          title: 'Trace',
          titleEm: 'lines',
          lines: ['Arrows or WASD turn · Space boosts', 'Touch: swipe to turn, hold to boost', 'Last rider standing · first to three'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          kicker: newRecord ? 'New best' : 'Derezzed',
          title: fmtScore(finalScore, 6),
          lines: [finalText, `Best ${fmtScore(hi.get(), 6)}`],
          prompt: 'Press Enter · Tap to ride again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
      touch.endFrame()
    },
  }
}

export default create
