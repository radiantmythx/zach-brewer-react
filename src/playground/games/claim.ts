/*
 * CLAIM — after Qix (Taito, 1981), drawn as a surveyor's plan.
 *
 * The field is a lattice: the marker walks lattice vertices, stix lines are
 * lattice edges, and land is the cells between them. Walking is allowed only
 * on the boundary of the open land; holding the draw key leaves it. Closing
 * a line back onto the boundary flood-fills from the Qix and every open cell
 * it can't reach becomes a parcel: hatched at its own angle and accent,
 * numbered like a cadastral map, and logged in the area schedule. Slow draws
 * score double and hatch denser. Claim 75% to clear the level.
 *
 * The Qix is a string sculpture: ten hairlines strung between two counter-
 * rotating ellipses, with trailing echoes, steering itself through the open
 * land by ray-casting and squeezing into narrow corridors. Sparx patrol the
 * boundary with a wall-follower; stop mid-line and a fuse burns along it.
 *
 * The bot plans small rectangles (and the odd straight cut) from the
 * boundary, scores them by area per second against the Qix's reach, travels
 * to the best start, draws, and bails out to the nearest boundary if the Qix
 * turns toward it.
 */

import { angleDiff, blink, C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, makeNoise, rng, Rings, Sparks, START_KEYS, TAU, text, Touch } from '../kit'
import type { Fit } from '../kit'
import type { CreatePiece } from '../types'

type State = 'attract' | 'title' | 'play' | 'over'

const U = 3 // playfield units per lattice cell
const DX = [1, 0, -1, 0]
const DY = [0, 1, 0, -1]
const TARGET = 0.75
const HATCH = [C.ocean, C.lagoon, C.moss, C.fern]
const ANGLES = [-0.55, 0.62, 1.2, -1.05, 0.25, -0.2, 1.45, 0.95, -1.35]

interface Parcel {
  id: number
  area: number
  slow: boolean
  color: string
  angle: number
  fill: Path2D
  outline: Path2D
  x0: number
  y0: number
  x1: number
  y1: number
  lx: number
  ly: number
  /** inscribed half-size in cells (chessboard) */
  inr: number
  ox: number
  oy: number
  born: number
}

interface Qix {
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  r: number
  reff: number
  a: number
  b: number
  seed: number
  echo: Float32Array
  echoN: number
  echoT: number
}

interface Spark {
  x: number
  y: number
  d: number
  hand: number
  acc: number
  px: number
  py: number
  trail: number[]
  born: number
}

const K = 12 // qix strings
const ECHO = 8

interface Layout {
  portrait: boolean
  gw: number
  gh: number
  lw: number
  lh: number
  fx: number
  fy: number
  /** short or narrow screens: the field alone, with the % readout moved into the HUD */
  bare: boolean
}

function layoutOf(portrait: boolean, bare: boolean): Layout {
  if (portrait) return bare ? { portrait, bare, gw: 120, gh: 160, lw: 376, lh: 496, fx: 8, fy: 8 } : { portrait, bare, gw: 120, gh: 160, lw: 376, lh: 556, fx: 8, fy: 70 }
  return bare ? { portrait, bare, gw: 160, gh: 120, lw: 496, lh: 376, fx: 8, fy: 8 } : { portrait, bare, gw: 160, gh: 120, lw: 600, lh: 376, fx: 8, fy: 8 }
}
const layoutFor = (w: number, h: number, mode: string) => layoutOf(w / h < 1, mode === 'full' && (h < 440 || w < 380))

const create: CreatePiece = (env) => {
  const { ctx } = env
  const full = env.mode === 'full'
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(full ? 700 : 240)
  const rings = new Rings()
  const vr = rng(23)
  const noise = makeNoise(41)
  const botParam = env.params.get('bot') === '1'

  let L = layoutFor(env.width, env.height, env.mode)
  let f: Fit = gameFit(env.width, env.height, env.mode, L.lw, L.lh)

  /* ---------------------------------------------------------- the lattice */

  let GW = L.gw
  let GH = L.gh
  let VW = GW + 1
  let cells = new Uint8Array(GW * GH)
  let claimId = new Uint16Array(GW * GH)
  let hT = new Uint8Array(GW * (GH + 1))
  let vT = new Uint8Array(VW * GH)
  let onTrail = new Uint8Array(VW * (GH + 1))
  let stamp = new Uint32Array(VW * (GH + 1))
  let cstamp = new Uint32Array(GW * GH)
  let prev = new Int32Array(VW * (GH + 1))
  let bdist = new Int32Array(VW * (GH + 1))
  let queue = new Int32Array(Math.max(VW * (GH + 1), GW * GH))
  let gen = 1

  function allocate(gw: number, gh: number) {
    GW = gw
    GH = gh
    VW = GW + 1
    cells = new Uint8Array(GW * GH)
    bndDirty = true
    claimId = new Uint16Array(GW * GH)
    hT = new Uint8Array(GW * (GH + 1))
    vT = new Uint8Array(VW * GH)
    onTrail = new Uint8Array(VW * (GH + 1))
    stamp = new Uint32Array(VW * (GH + 1))
    cstamp = new Uint32Array(GW * GH)
    prev = new Int32Array(VW * (GH + 1))
    bdist = new Int32Array(VW * (GH + 1))
    queue = new Int32Array(Math.max(VW * (GH + 1), GW * GH))
  }

  const openC = (x: number, y: number) => x >= 0 && y >= 0 && x < GW && y < GH && cells[y * GW + x] === 0
  /** 0 closed (claimed or outside on both sides), 1 boundary, 2 interior (open both sides) */
  function edge(x: number, y: number, d: number) {
    let a: boolean
    let b: boolean
    if (d === 0) {
      a = openC(x, y - 1)
      b = openC(x, y)
    } else if (d === 2) {
      a = openC(x - 1, y - 1)
      b = openC(x - 1, y)
    } else if (d === 1) {
      a = openC(x - 1, y)
      b = openC(x, y)
    } else {
      a = openC(x - 1, y - 1)
      b = openC(x, y - 1)
    }
    return a && b ? 2 : a !== b ? 1 : 0
  }
  /** Boundary vertices, cached; rebuilt lazily after the land changes. */
  let bnd = new Uint8Array(VW * (GH + 1))
  let bndDirty = true
  function onBoundary(x: number, y: number) {
    if (x < 0 || y < 0 || x > GW || y > GH) return false
    if (bndDirty) {
      if (bnd.length !== VW * (GH + 1)) bnd = new Uint8Array(VW * (GH + 1))
      for (let vy = 0; vy <= GH; vy++)
        for (let vx = 0; vx <= GW; vx++) {
          let b = 0
          for (let d = 0; d < 4 && !b; d++) if (edge(vx, vy, d) === 1) b = 1
          bnd[vy * VW + vx] = b
        }
      bndDirty = false
    }
    return bnd[y * VW + x] === 1
  }
  function markTrail(x: number, y: number, d: number) {
    if (d === 0) hT[y * GW + x] = 1
    else if (d === 2) hT[y * GW + x - 1] = 1
    else if (d === 1) vT[y * VW + x] = 1
    else vT[(y - 1) * VW + x] = 1
  }

  /* ---------------------------------------------------------------- state */

  let state: State = full ? 'title' : 'attract'
  let stateT = 0
  let score = 0
  let lives = 3
  let level = 1
  let claimed = 0
  let shownPct = 0
  let newRecord = false
  let levelT = 0
  let parcels: Parcel[] = []
  let cacheDirty = true
  let seedN = 1

  // the marker
  let px = 0
  let py = 0
  let vx = 0
  let vy = 0
  let acc = 0
  let drawing = false
  let slowDraw = true
  let trail: number[] = [] // flat vertex coords
  let runs: number[] = [] // merged straight runs [x0,y0,x1,y1,…]
  let idleT = 0
  let fuse = -1
  // interaction affordances (full mode only)
  let hover: { x: number; y: number } | null = null
  let usesTouch = false
  let hintA = 0 // the first-play ghost demonstration; fades after the first claim
  let hintT = 0
  let firstGame = true
  let edgeNudge = 0 // the "hold draw" prompt after pushing into the field without the draw key
  let finalScore = 0
  let finalLevel = 1
  let finalPct = 0

  let qixes: Qix[] = []
  let sparx: Spark[] = []
  let sparxTimer = 0
  let dying: { t: number; trail: number[]; x: number; y: number; cause: string } | null = null
  let clearing: { t: number; pct: number; bonus: number } | null = null
  let shake = 0

  function newQix(x: number, y: number, s: number): Qix {
    return { x, y, vx: 0, vy: 0, heading: s * 2.3, r: 12, reff: 12, a: s, b: s * 1.7, seed: s, echo: new Float32Array(ECHO * K * 4), echoN: 0, echoT: 0 }
  }

  function setupLevel(lv: number) {
    level = lv
    cells.fill(0)
    bndDirty = true
    claimId.fill(0)
    hT.fill(0)
    vT.fill(0)
    onTrail.fill(0)
    parcels = []
    claimed = 0
    shownPct = 0
    cacheDirty = true
    px = Math.floor(GW / 2)
    py = GH
    vx = px
    vy = py
    acc = 0
    drawing = false
    trail = []
    runs = []
    fuse = -1
    idleT = 0
    levelT = 0
    qixes = [newQix(GW * 0.5, GH * 0.42, 1 + seedN * 0.37)]
    if (lv >= 3) qixes.push(newQix(GW * 0.3, GH * 0.6, 2.1 + seedN * 0.53))
    sparx = []
    sparxTimer = 0.5
    clearing = null
    dying = null
    bot.plan = null
    bot.travel = []
    seedN++
  }

  function reset() {
    const nl = layoutFor(env.width, env.height, env.mode)
    if (nl.gw !== GW || nl.gh !== GH) allocate(nl.gw, nl.gh)
    L = nl
    f = gameFit(env.width, env.height, env.mode, L.lw, L.lh)
    score = 0
    lives = 3
    setupLevel(1)
    sparks.clear()
    rings.clear()
  }

  const qixSpeed = () => 15 * Math.pow(1.09, level - 1)
  const sparxSpeed = () => (15 + Math.min(10, levelT * 0.12)) * Math.pow(1.06, level - 1)
  const sparxMax = () => Math.min(6, level + 1)

  /* ------------------------------------------------------------ flood/claim */

  function qixCell(q: Qix): number {
    let cx = clamp(Math.floor(q.x), 0, GW - 1)
    let cy = clamp(Math.floor(q.y), 0, GH - 1)
    if (cells[cy * GW + cx] === 0) return cy * GW + cx
    // nearest open cell
    for (let r = 1; r < 30; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx
          const y = cy + dy
          if (openC(x, y)) {
            cx = x
            cy = y
            return cy * GW + cx
          }
        }
    return -1
  }

  /** Flood open cells from the qixes across everything but trail edges; returns cells reached. */
  function flood(): number {
    gen++
    let head = 0
    let tail = 0
    for (const q of qixes) {
      const c = qixCell(q)
      if (c >= 0 && cstamp[c] !== gen) {
        cstamp[c] = gen
        queue[tail++] = c
      }
    }
    while (head < tail) {
      const c = queue[head++]
      const x = c % GW
      const y = (c - x) / GW
      if (x + 1 < GW && !vT[y * VW + x + 1]) {
        const n = c + 1
        if (cells[n] === 0 && cstamp[n] !== gen) {
          cstamp[n] = gen
          queue[tail++] = n
        }
      }
      if (x > 0 && !vT[y * VW + x]) {
        const n = c - 1
        if (cells[n] === 0 && cstamp[n] !== gen) {
          cstamp[n] = gen
          queue[tail++] = n
        }
      }
      if (y + 1 < GH && !hT[(y + 1) * GW + x]) {
        const n = c + GW
        if (cells[n] === 0 && cstamp[n] !== gen) {
          cstamp[n] = gen
          queue[tail++] = n
        }
      }
      if (y > 0 && !hT[y * GW + x]) {
        const n = c - GW
        if (cells[n] === 0 && cstamp[n] !== gen) {
          cstamp[n] = gen
          queue[tail++] = n
        }
      }
    }
    return tail
  }

  function clearTrail() {
    for (let i = 0; i + 2 < trail.length; i += 2) {
      const x = trail[i]
      const y = trail[i + 1]
      const nx = trail[i + 2]
      const ny = trail[i + 3]
      if (ny === y) hT[y * GW + Math.min(x, nx)] = 0
      else vT[Math.min(y, ny) * VW + x] = 0
    }
    for (let i = 0; i < trail.length; i += 2) onTrail[trail[i + 1] * VW + trail[i]] = 0
    trail = []
    runs = []
  }

  function close() {
    flood()
    const id = parcels.length + 1
    let n = 0
    let sx = 0
    let sy = 0
    for (let c = 0; c < GW * GH; c++) {
      if (cells[c] === 0 && cstamp[c] !== gen) {
        cells[c] = 1
        claimId[c] = id
        n++
        sx += c % GW
        sy += Math.floor(c / GW)
      }
    }
    bndDirty = true
    const endX = px
    const endY = py
    const wasSlow = slowDraw
    clearTrail()
    drawing = false
    fuse = -1
    if (n > 0) {
      claimed += n
      const p = buildParcel(id, n, wasSlow, sx / n, sy / n, endX, endY)
      parcels.push(p)
      const pts = Math.round(n * (wasSlow ? 2 : 1) * 0.5)
      score += pts
      rings.add(endX * U, endY * U, 18, 0.5, p.color)
      if (audible()) {
        const base = [392, 440, 523.25, 587.33, 659.25][parcels.length % 5]
        env.sfx.tone(base, 0.5, { type: 'triangle', gain: 0.07, filter: 2400, room: 0.3 })
        env.sfx.tone(base * 1.5, 0.6, { type: 'triangle', gain: 0.05, filter: 2400, when: 0.07, room: 0.3 })
        if (n > GW * GH * 0.06) env.sfx.tone(base * 2, 0.8, { type: 'sine', gain: 0.04, when: 0.14, room: 0.4 })
      }
    }
    // keep everyone on the boundary
    if (!onBoundary(px, py)) {
      const v = nearestBoundary(px, py)
      if (v >= 0) {
        px = v % VW
        py = Math.floor(v / VW)
      }
    }
    // sparx stranded inside the new parcel hop to the nearest edge — never onto the marker
    for (const s of sparx) {
      if (!onBoundary(s.x, s.y)) {
        const v = nearestBoundary(s.x, s.y, 10)
        if (v >= 0) {
          s.x = v % VW
          s.y = Math.floor(v / VW)
          s.px = s.x
          s.py = s.y
          s.trail = []
          s.born = 0
          rings.add(s.x * U, s.y * U, 8, 0.4, C.ink)
        }
      }
    }
    if (claimed / (GW * GH) >= TARGET) levelClear()
  }

  /** BFS over lattice vertices (any edge) to the closest boundary vertex, optionally keeping `avoid` from the marker. */
  function nearestBoundary(x0: number, y0: number, avoid = 0): number {
    gen++
    let head = 0
    let tail = 0
    const s = y0 * VW + x0
    stamp[s] = gen
    queue[tail++] = s
    while (head < tail) {
      const v = queue[head++]
      const x = v % VW
      const y = (v - x) / VW
      if (onBoundary(x, y) && (!avoid || Math.abs(x - px) + Math.abs(y - py) > avoid)) return v
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d]
        const ny = y + DY[d]
        if (nx < 0 || ny < 0 || nx > GW || ny > GH) continue
        const n = ny * VW + nx
        if (stamp[n] === gen) continue
        stamp[n] = gen
        queue[tail++] = n
      }
    }
    return -1
  }

  function buildParcel(id: number, area: number, slow: boolean, cxm: number, cym: number, ox: number, oy: number): Parcel {
    const fill = new Path2D()
    const outline = new Path2D()
    let x0 = GW
    let y0 = GH
    let x1 = 0
    let y1 = 0
    for (let y = 0; y < GH; y++) {
      let run = -1
      for (let x = 0; x <= GW; x++) {
        const inside = x < GW && claimId[y * GW + x] === id
        if (inside) {
          if (run < 0) run = x
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        } else if (run >= 0) {
          fill.rect(run * U, y * U, (x - run) * U, U)
          run = -1
        }
      }
    }
    const isIn = (x: number, y: number) => x >= 0 && y >= 0 && x < GW && y < GH && claimId[y * GW + x] === id
    // horizontal boundary runs
    for (let y = y0; y <= y1 + 1; y++) {
      let run = -1
      for (let x = x0; x <= x1 + 1; x++) {
        const b = x <= x1 && isIn(x, y - 1) !== isIn(x, y)
        if (b && run < 0) run = x
        if (!b && run >= 0) {
          outline.moveTo(run * U, y * U)
          outline.lineTo(x * U, y * U)
          run = -1
        }
      }
    }
    for (let x = x0; x <= x1 + 1; x++) {
      let run = -1
      for (let y = y0; y <= y1 + 1; y++) {
        const b = y <= y1 && isIn(x - 1, y) !== isIn(x, y)
        if (b && run < 0) run = y
        if (!b && run >= 0) {
          outline.moveTo(x * U, run * U)
          outline.lineTo(x * U, y * U)
          run = -1
        }
      }
    }
    // a label point: the most inland cell (chessboard distance transform), nearest the centroid on ties
    const bw = x1 - x0 + 1
    const bh = y1 - y0 + 1
    const dt = new Uint16Array(bw * bh)
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= bw || y >= bh ? 0 : dt[y * bw + x])
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) dt[y * bw + x] = isIn(x + x0, y + y0) ? Math.min(at(x - 1, y), at(x, y - 1), at(x - 1, y - 1), at(x + 1, y - 1)) + 1 : 0
    let lx = Math.floor(cxm)
    let ly = Math.floor(cym)
    let inr = 0
    let best = 1e9
    for (let y = bh - 1; y >= 0; y--)
      for (let x = bw - 1; x >= 0; x--) {
        const i = y * bw + x
        if (!dt[i]) continue
        dt[i] = Math.min(dt[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1, at(x - 1, y + 1) + 1)
        const d2 = (x + x0 - cxm) ** 2 + (y + y0 - cym) ** 2
        if (dt[i] > inr || (dt[i] === inr && d2 < best)) {
          inr = dt[i]
          best = d2
          lx = x + x0
          ly = y + y0
        }
      }
    // pick an accent and an angle unlike the neighbours'
    const near = new Set<number>()
    for (let y = Math.max(0, y0 - 1); y <= Math.min(GH - 1, y1 + 1); y++)
      for (let x = Math.max(0, x0 - 1); x <= Math.min(GW - 1, x1 + 1); x++) {
        const c = claimId[y * GW + x]
        if (c && c !== id && (isIn(x - 1, y) || isIn(x + 1, y) || isIn(x, y - 1) || isIn(x, y + 1))) near.add(c)
      }
    const nb = parcels.filter((q) => near.has(q.id))
    let color: string = HATCH[(id - 1) % 4]
    for (let k = 0; k < 4; k++) {
      const c = HATCH[(id - 1 + k) % 4]
      if (!nb.some((q) => q.color === c)) {
        color = c
        break
      }
    }
    let angle = ANGLES[(id - 1) % ANGLES.length]
    for (let k = 0; k < ANGLES.length; k++) {
      const a = ANGLES[(id - 1 + k * 4) % ANGLES.length]
      if (!nb.some((q) => Math.abs(Math.sin(q.angle - a)) < 0.45)) {
        angle = a
        break
      }
    }
    return {
      id,
      area,
      slow,
      color,
      angle,
      fill,
      outline,
      x0,
      y0,
      x1: x1 + 1,
      y1: y1 + 1,
      lx: lx + 0.5,
      ly: ly + 0.5,
      inr,
      ox,
      oy,
      born: levelT,
    }
  }

  function levelClear() {
    const pct = claimed / (GW * GH)
    const bonus = Math.round((pct - TARGET) * 100) * 1000 + level * 500
    score += bonus
    clearing = { t: 0, pct, bonus }
    drawing = false
    for (const q of qixes) {
      for (let i = 0; i < 40; i++) sparks.emit(q.x * U, q.y * U, 1, { speed: 160, life: 1, color: i % 2 ? C.ink : C.ocean, r: vr })
      rings.add(q.x * U, q.y * U, 60, 0.9, C.ink)
    }
    if (audible()) [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((fq, i) => env.sfx.tone(fq, 0.6, { type: 'triangle', gain: 0.06, when: i * 0.08, room: 0.4 }))
  }

  /* ---------------------------------------------------------------- death */

  function kill(cause: string) {
    if (dying || clearing) return
    dying = { t: 0, trail: trail.slice(), x: px, y: py, cause }
    shake = 4
    sparks.emit(vx * U, vy * U, full ? 46 : 16, { speed: 170, life: 0.9, color: C.ink, r: vr })
    rings.add(vx * U, vy * U, 30, 0.6, C.ink)
    rings.add(vx * U, vy * U, 54, 0.9, C.moss, 8)
    if (audible()) {
      env.sfx.noise(0.5, { filter: 1600, to: 180, gain: 0.16, room: 0.3 })
      env.sfx.tone(330, 0.5, { type: 'triangle', gain: 0.08, to: 110, room: 0.3 })
    }
  }

  function finishDeath() {
    const d = dying!
    // back to where the line started (or stay put on the boundary)
    if (d.trail.length >= 2) {
      px = d.trail[0]
      py = d.trail[1]
    }
    clearTrail()
    drawing = false
    fuse = -1
    idleT = 0
    vx = px
    vy = py
    dying = null
    const counts = state === 'play' && !botParam
    if (counts) {
      lives--
      if (lives <= 0) {
        go('over')
        return
      }
    }
    // sparx retreat: respawn them far from the marker
    const n = sparx.length
    sparx = []
    sparxTimer = 1.2
    for (let i = 0; i < Math.max(0, n - 1); i++) spawnSparx(true)
  }

  /* ------------------------------------------------------------- the qix */

  const RAYS = 16
  function updateQix(q: Qix, dt: number, t: number) {
    const sp = qixSpeed()
    // wander: noise-steered heading with occasional dashes
    const n1 = noise.n2(t * 0.35 + q.seed * 10, q.seed)
    const n2 = noise.n2(t * 0.22 + 40, q.seed * 3)
    q.heading += n1 * 2.4 * dt
    const speed = sp * (0.65 + 0.55 * (0.5 + 0.5 * n2)) * (1 + 0.6 * Math.max(0, noise.n2(t * 0.5, q.seed + 9) - 0.55) * 4)
    q.r = 15 + 9 * (0.5 + 0.5 * noise.n2(t * 0.3, q.seed + 20))
    // ray-cast free distances
    let minD = 1e9
    let pushX = 0
    let pushY = 0
    const maxR = q.r + 6
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * TAU
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      let d = 0.5
      for (; d < maxR; d += 1) {
        if (!openC(Math.floor(q.x + ca * d), Math.floor(q.y + sa * d))) break
      }
      if (d < minD) minD = d
      if (d < q.r + 3) {
        const w = (1 - d / (q.r + 3)) ** 2
        pushX -= ca * w
        pushY -= sa * w
      }
    }
    q.reff = lerp(q.reff, clamp(Math.min(q.r, minD - 1.2), 1.5, 26), damp(6, dt))
    const tx = Math.cos(q.heading) * speed + pushX * sp * 2.2
    const ty = Math.sin(q.heading) * speed + pushY * sp * 2.2
    q.vx = lerp(q.vx, tx, damp(3.5, dt))
    q.vy = lerp(q.vy, ty, damp(3.5, dt))
    // steer the heading toward where the push sends it
    if (pushX * pushX + pushY * pushY > 0.02) q.heading += angleDiff(q.heading, Math.atan2(q.vy, q.vx)) * damp(2.5, dt)
    let nx = q.x + q.vx * dt
    let ny = q.y + q.vy * dt
    if (!openC(Math.floor(nx), Math.floor(ny))) {
      // bounce
      if (!openC(Math.floor(nx), Math.floor(q.y))) {
        q.vx = -q.vx
        nx = q.x
      }
      if (!openC(Math.floor(q.x), Math.floor(ny))) {
        q.vy = -q.vy
        ny = q.y
      }
      q.heading = Math.atan2(q.vy, q.vx)
      if (!openC(Math.floor(nx), Math.floor(ny))) {
        nx = q.x
        ny = q.y
      }
    }
    q.x = nx
    q.y = ny
    q.a += dt * (1.1 + 0.6 * n2)
    q.b -= dt * (0.8 + 0.5 * n1)
    // echoes
    q.echoT -= dt
    if (q.echoT <= 0) {
      q.echoT = 0.04
      q.echo.copyWithin(K * 4, 0, (ECHO - 1) * K * 4)
      qixShape(q, t, q.echo, 0)
      q.echoN = Math.min(ECHO, q.echoN + 1)
    }
  }

  /**
   * A twisting string ladder: K strings between two arcs on opposite sides of
   * an ellipse. Untwisted the strings are parallel rungs; as the arcs slide
   * past each other they cross and their envelope pinches into a hyperbola —
   * the string-art look. Writes K×[x0,y0,x1,y1] (cell units).
   */
  function qixShape(q: Qix, t: number, out: Float32Array, o: number) {
    const R = q.reff
    const ea = 0.72 + 0.28 * Math.sin(t * 0.83 + q.seed)
    const eb = 0.72 + 0.28 * Math.cos(t * 0.61 + q.seed * 2)
    const rot = q.b * 0.5
    const cr = Math.cos(rot)
    const sr = Math.sin(rot)
    const spread = 2.4 + 0.6 * Math.sin(t * 0.47 + q.seed * 3)
    const twist = 1.6 + 0.85 * Math.sin(t * 0.71 + q.seed) + 0.25 * Math.sin(t * 1.9 + q.seed * 5)
    for (let i = 0; i < K; i++) {
      const u = (i / (K - 1) - 0.5) * spread
      const a1 = q.a + u
      const a2 = q.a + Math.PI - u + twist
      const x1 = Math.cos(a1) * R
      const y1 = Math.sin(a1) * R * ea
      const x2 = Math.cos(a2) * R * eb
      const y2 = Math.sin(a2) * R
      out[o + i * 4] = q.x + x1 * cr - y1 * sr
      out[o + i * 4 + 1] = q.y + x1 * sr + y1 * cr
      out[o + i * 4 + 2] = q.x + x2 * cr - y2 * sr
      out[o + i * 4 + 3] = q.y + x2 * sr + y2 * cr
    }
  }

  const shapeBuf = new Float32Array(K * 4)

  function segHit(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
    const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
    const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
    const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  }
  function segDist(px0: number, py0: number, ax: number, ay: number, bx: number, by: number) {
    const ex = bx - ax
    const ey = by - ay
    const l2 = ex * ex + ey * ey || 1
    const k = clamp(((px0 - ax) * ex + (py0 - ay) * ey) / l2)
    return Math.hypot(ax + ex * k - px0, ay + ey * k - py0)
  }

  function qixTouchesLine(q: Qix, t: number) {
    if (!drawing || trail.length < 2) return false
    qixShape(q, t, shapeBuf, 0)
    for (let i = 0; i < K; i++) {
      const ax = shapeBuf[i * 4]
      const ay = shapeBuf[i * 4 + 1]
      const bx = shapeBuf[i * 4 + 2]
      const by = shapeBuf[i * 4 + 3]
      if (segDist(px, py, ax, ay, bx, by) < 0.8) return true
      for (let j = 0; j < runs.length; j += 4) if (segHit(ax, ay, bx, by, runs[j], runs[j + 1], runs[j + 2], runs[j + 3])) return true
    }
    // the open tail segment from the last run end to the marker
    return false
  }

  /* --------------------------------------------------------------- sparx */

  function spawnSparx(far: boolean) {
    // pick boundary vertices along the top edge first, else anywhere far from the marker
    let best = -1
    let bestD = -1
    for (let tries = 0; tries < 40; tries++) {
      const x = Math.floor(vr() * (GW + 1))
      const y = tries < 20 && !far ? 0 : Math.floor(vr() * (GH + 1))
      const v = onBoundary(x, y) ? y * VW + x : nearestBoundary(x, y)
      if (v < 0) continue
      const bx = v % VW
      const by = Math.floor(v / VW)
      const d = Math.hypot(bx - px, by - py)
      if (d > bestD) {
        bestD = d
        best = v
      }
      if (!far && d > GW * 0.45) break
    }
    if (best < 0) return
    const x = best % VW
    const y = Math.floor(best / VW)
    let d = 0
    for (let k = 0; k < 4; k++)
      if (edge(x, y, k) === 1) {
        d = k
        break
      }
    sparx.push({ x, y, d, hand: sparx.length % 2 ? 1 : -1, acc: 0, px: x, py: y, trail: [], born: 0 })
    rings.add(x * U, y * U, 10, 0.5, C.ink)
  }

  function stepSparx(s: Spark) {
    // wall follower: prefer turning toward `hand`, then straight, then the other way, then back
    const order = s.hand > 0 ? [1, 0, 3, 2] : [3, 0, 1, 2]
    for (const o of order) {
      const d = (s.d + o) % 4
      if (edge(s.x, s.y, d) === 1) {
        s.px = s.x
        s.py = s.y
        s.x += DX[d]
        s.y += DY[d]
        s.d = d
        s.trail.unshift(s.px, s.py)
        if (s.trail.length > 16) s.trail.length = 16
        return
      }
    }
  }

  /* ------------------------------------------------------------ the marker */

  function trailPush(x: number, y: number, d: number) {
    trail.push(x, y)
    onTrail[y * VW + x] = 1
    const n = runs.length
    if (n >= 4) {
      const rdx = Math.sign(runs[n - 2] - runs[n - 4])
      const rdy = Math.sign(runs[n - 1] - runs[n - 3])
      if (rdx === DX[d] && rdy === DY[d]) {
        runs[n - 2] = x
        runs[n - 1] = y
        return
      }
    }
    runs.push(x - DX[d], y - DY[d], x, y)
  }

  /** One lattice step in direction d. mode: 0 walk, 1 fast draw, 2 slow draw. */
  function stepMarker(d: number, mode: number): boolean {
    const e = edge(px, py, d)
    const nx = px + DX[d]
    const ny = py + DY[d]
    if (!drawing) {
      if (e === 1) {
        px = nx
        py = ny
        return true
      }
      if (e === 2 && mode > 0 && !onTrail[ny * VW + nx]) {
        drawing = true
        slowDraw = mode === 2
        trail = []
        runs = []
        trail.push(px, py)
        onTrail[py * VW + px] = 1
        markTrail(px, py, d)
        px = nx
        py = ny
        trailPush(px, py, d)
        if (audible()) env.sfx.tone(slowDraw ? 293.66 : 440, 0.08, { type: 'sine', gain: 0.05 })
        if (onBoundary(px, py)) close()
        return true
      }
      return false
    }
    if (mode === 0) return false
    if (e !== 2 || onTrail[ny * VW + nx]) return false
    if (mode === 1) slowDraw = false
    markTrail(px, py, d)
    px = nx
    py = ny
    trailPush(px, py, d)
    if (onBoundary(px, py)) close()
    return true
  }

  /* ------------------------------------------------------------------ bot */

  interface BotPlan {
    dirs: number[]
    i: number
    slow: boolean
    sx: number
    sy: number
    bx0: number
    by0: number
    bx1: number
    by1: number
  }
  const bot = { plan: null as BotPlan | null, travel: [] as number[], think: 0, r: rng(77), escape: [] as number[], pending: null as [number, number] | null }

  /** Simulate a scripted line from (sx, sy); returns the full dir list to closure, or null. */
  function simulate(sx: number, sy: number, script: number[], back: number, maxExtra: number): number[] | null {
    gen++
    let x = sx
    let y = sy
    stamp[y * VW + x] = gen
    const out: number[] = []
    const tryStep = (d: number) => {
      if (edge(x, y, d) !== 2) return -1
      const nx = x + DX[d]
      const ny = y + DY[d]
      const v = ny * VW + nx
      if (stamp[v] === gen || onTrail[v]) return -1
      stamp[v] = gen
      x = nx
      y = ny
      out.push(d)
      return onBoundary(x, y) ? 1 : 0
    }
    for (const d of script) {
      const r = tryStep(d)
      if (r < 0) return null
      if (r === 1) return out.length >= 2 ? out : null
    }
    for (let i = 0; i < maxExtra; i++) {
      const r = tryStep(back)
      if (r < 0) return null
      if (r === 1) return out
    }
    return null
  }

  function pathBox(sx: number, sy: number, dirs: number[]) {
    let x = sx
    let y = sy
    let x0 = x
    let y0 = y
    let x1 = x
    let y1 = y
    for (const d of dirs) {
      x += DX[d]
      y += DY[d]
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
    return [x0, y0, x1, y1]
  }

  const boxDist = (x: number, y: number, b: number[]) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3]))

  /** BFS along the boundary from the marker; fills prev[], returns visited vertices in order. */
  function boundaryBFS(limit: number): number[] {
    gen++
    const out: number[] = []
    let head = 0
    let tail = 0
    const s = py * VW + px
    stamp[s] = gen
    prev[s] = -1
    bdist[s] = 0
    queue[tail++] = s
    while (head < tail && out.length < limit) {
      const v = queue[head++]
      out.push(v)
      const x = v % VW
      const y = (v - x) / VW
      for (let d = 0; d < 4; d++) {
        if (edge(x, y, d) !== 1) continue
        const n = (y + DY[d]) * VW + x + DX[d]
        if (stamp[n] === gen) continue
        stamp[n] = gen
        prev[n] = v
        bdist[n] = bdist[v] + 1
        queue[tail++] = n
      }
    }
    return out
  }

  function pathTo(v: number): number[] {
    const dirs: number[] = []
    while (prev[v] >= 0) {
      const p = prev[v]
      const dx = (v % VW) - (p % VW)
      const dy = Math.floor(v / VW) - Math.floor(p / VW)
      dirs.push(dx === 1 ? 0 : dx === -1 ? 2 : dy === 1 ? 1 : 3)
      v = p
    }
    return dirs.reverse()
  }

  function botPlan(onlyHere = false, ignoreSparx = false) {
    const verts = boundaryBFS(onlyHere ? 1 : 220)
    // candidate starts: every 7th boundary vertex plus every corner (where the boundary turns)
    const starts: number[] = []
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i]
      if (i % 7 === 0) {
        starts.push(v)
        continue
      }
      if (starts.length > 30) continue
      const x = v % VW
      const y = (v - x) / VW
      const h = (edge(x, y, 0) === 1 ? 1 : 0) + (edge(x, y, 2) === 1 ? 1 : 0)
      const vv = (edge(x, y, 1) === 1 ? 1 : 0) + (edge(x, y, 3) === 1 ? 1 : 0)
      if (h === 1 && vv === 1) starts.push(v)
    }
    let best: (BotPlan & { v: number; start: number }) | null = null
    const qs = qixSpeed()
    const vDraw = 38
    const vWalk = 46
    for (const s of starts) {
      const sx = s % VW
      const sy = Math.floor(s / VW)
      // stay clear of sparx at the start
      let sparxNear = false
      if (!ignoreSparx) for (const k of sparx) if (Math.hypot(k.x - sx, k.y - sy) < 7) sparxNear = true
      if (sparxNear) continue
      const walkT = bdist[s] / vWalk
      for (let n = 0; n < 4; n++) {
        if (edge(sx, sy, n) !== 2) continue
        for (const D of [4, 8, 13, 19, 27, 36]) {
          // W = 0: an L that runs on until it meets the boundary (closes against a corner, no slivers)
          for (const W of [0, 8, 16, 28]) {
            for (const side of [1, 3]) {
              const t = (n + side) % 4
              if (W && D * W > GW * GH * 0.045) continue
              const script: number[] = []
              for (let i = 0; i < D; i++) script.push(n)
              for (let i = 0; i < W; i++) script.push(t)
              if (W) for (let i = 0; i < D; i++) script.push((n + 2) % 4)
              const dirs = W ? simulate(sx, sy, script, (n + 2) % 4, 16) : simulate(sx, sy, script, t, 70)
              if (!dirs) continue
              const box = pathBox(sx, sy, dirs)
              const T = walkT + dirs.length / vDraw
              let safe = true
              let minQ = 1e9
              for (const q of qixes) {
                const dq = boxDist(q.x, q.y, box)
                minQ = Math.min(minQ, dq)
                if (dq < q.reff + 5 + qs * T * 0.5) safe = false
              }
              if (!safe) continue
              const area = (box[2] - box[0]) * (box[3] - box[1])
              if (area > GW * GH * (W ? 0.045 : 0.065)) continue
              const slow = minQ > 40 + qs * T * 1.4 && area < 600 && (s * 7 + D) % 3 === 0
              const v = (Math.pow(area, 0.62) * (slow ? 2 : 1)) / (T * (slow ? 1.7 : 1) + 0.8) - bdist[s] * 0.02 + bot.r() * 3
              if (!best || v > best.v) best = { dirs, i: 0, slow, sx, sy, bx0: box[0], by0: box[1], bx1: box[2], by1: box[3], v, start: s }
            }
          }
        }
      }
    }
    return best
  }

  /** Shortest interior route from the marker to any boundary vertex, avoiding the trail. */
  function escapeRoute(): number[] {
    gen++
    let head = 0
    let tail = 0
    const s = py * VW + px
    stamp[s] = gen
    prev[s] = -1
    queue[tail++] = s
    while (head < tail) {
      const v = queue[head++]
      const x = v % VW
      const y = (v - x) / VW
      if (v !== s && onBoundary(x, y)) return pathTo(v)
      for (let d = 0; d < 4; d++) {
        if (edge(x, y, d) !== 2) continue
        const n = (y + DY[d]) * VW + x + DX[d]
        if (stamp[n] === gen || onTrail[n]) continue
        stamp[n] = gen
        prev[n] = v
        queue[tail++] = n
      }
    }
    return []
  }

  /** Would this step close the line next to a spark? (Ignored once the fuse has burnt a good way.) */
  function sparkAtLanding(d: number) {
    if (fuse >= 0 && fuse > (trail.length / 2) * 0.45) return false
    const tx = px + DX[d]
    const ty = py + DY[d]
    return onBoundary(tx, ty) && sparx.some((k) => Math.hypot(k.x - tx, k.y - ty) < 4.5)
  }

  /** The bot's input for the next lattice step: [dir, mode] or dir -1 to wait. */
  function botInput(dt: number): [number, number] {
    if (drawing) {
      const pl = bot.plan
      // danger check against the rest of the line
      let danger = false
      for (const q of qixes) {
        const dq = Math.hypot(q.x - px, q.y - py)
        if (dq < q.reff + 6) danger = true
        if (pl && boxDist(q.x, q.y, [pl.bx0, pl.by0, pl.bx1, pl.by1]) < q.reff + 2) danger = true
      }
      if (danger && !bot.escape.length) {
        bot.escape = escapeRoute()
        bot.plan = null
      }
      let src = 0
      let nextD = -1
      if (bot.escape.length) {
        src = 1
        nextD = bot.escape[0]
      } else if (pl && pl.i < pl.dirs.length) {
        src = 2
        nextD = pl.dirs[pl.i]
      } else {
        const r = escapeRoute()
        nextD = r.length ? r[0] : -1
      }
      if (nextD < 0) return [-1, 1]
      if (!danger && sparkAtLanding(nextD)) return [-1, slowDraw ? 2 : 1]
      if (src === 1) bot.escape.shift()
      if (src === 2) pl!.i++
      return [nextD, src === 2 && pl!.slow ? 2 : 1]
    }
    bot.escape = []
    // dodge sparx that are closing in: duck into the field, or outrun them along the edge
    for (const k of sparx) {
      const dk = Math.hypot(k.x - px, k.y - py)
      const closing = Math.hypot(k.x + DX[k.d] - px, k.y + DY[k.d] - py) < dk
      if (dk < 4 || (dk < 10 && closing)) {
        const pl = botPlan(true, true)
        if (pl && pl.sx === px && pl.sy === py) {
          bot.plan = pl
          bot.travel = []
          return [pl.dirs[pl.i++], 1]
        }
        // run away along the boundary
        for (let d = 0; d < 4; d++) {
          if (edge(px, py, d) !== 1) continue
          if (Math.hypot(k.x - (px + DX[d]), k.y - (py + DY[d])) > Math.hypot(k.x - px, k.y - py)) {
            bot.travel = []
            return [d, 0]
          }
        }
      }
    }
    if (bot.travel.length) return [bot.travel.shift()!, 0]
    if (bot.plan && bot.plan.sx === px && bot.plan.sy === py) {
      // re-check before committing
      const pl = bot.plan
      let ok = true
      for (const q of qixes) if (boxDist(q.x, q.y, [pl.bx0, pl.by0, pl.bx1, pl.by1]) < q.reff + 6) ok = false
      if (ok && pl.dirs.length) return [pl.dirs[pl.i++], pl.slow ? 2 : 1]
      bot.plan = null
    }
    bot.think -= dt
    if (bot.think > 0) return [-1, 0]
    bot.think = 0.3 + bot.r() * 0.3
    const pl = botPlan()
    if (pl) {
      bot.plan = pl
      if (pl.sx !== px || pl.sy !== py) bot.travel = pathTo(pl.sy * VW + pl.sx)
      return [-1, 0]
    }
    // nothing safe: drift along the boundary away from the qix
    let bestD = -1
    let bestDir = -1
    for (let d = 0; d < 4; d++) {
      if (edge(px, py, d) !== 1) continue
      let dq = 1e9
      for (const q of qixes) dq = Math.min(dq, Math.hypot(q.x - px - DX[d] * 8, q.y - py - DY[d] * 8))
      if (dq > bestD) {
        bestD = dq
        bestDir = d
      }
    }
    if (bestDir >= 0) {
      const out: number[] = []
      let x = px
      let y = py
      let d = bestDir
      for (let i = 0; i < 10; i++) {
        let moved = false
        for (const o of [0, 1, 3]) {
          const dd = (d + o) % 4
          if (edge(x, y, dd) === 1) {
            out.push(dd)
            x += DX[dd]
            y += DY[dd]
            d = dd
            moved = true
            break
          }
        }
        if (!moved) break
      }
      bot.travel = out
    }
    return [-1, 0]
  }

  /* -------------------------------------------------------------- input */

  const held: number[] = [] // held direction keys, most recent last
  const KEYDIR: Record<string, number> = { ArrowRight: 0, KeyD: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2, ArrowUp: 3, KeyW: 3 }
  let tp: { x: number; y: number } | null = null

  function playerInput(): [number, number] {
    const drawKey = keys.down('Space') ? 1 : keys.down('KeyZ', 'ShiftLeft', 'ShiftRight', 'KeyX') ? 2 : 0
    if (held.length) return [held[held.length - 1], drawKey]
    if (tp) {
      // touch: head for the finger; draw when the finger is out in the open
      const tx = clamp(Math.round(tp.x), 0, GW)
      const ty = clamp(Math.round(tp.y), 0, GH)
      const ddx = tx - px
      const ddy = ty - py
      if (Math.abs(ddx) + Math.abs(ddy) < 1) return [-1, drawing ? 1 : 0]
      const fingerOpen = openC(Math.floor(tp.x), Math.floor(tp.y))
      const primary = Math.abs(ddx) >= Math.abs(ddy) ? (ddx > 0 ? 0 : 2) : ddy > 0 ? 1 : 3
      const secondary = Math.abs(ddx) >= Math.abs(ddy) ? (ddy > 0 ? 1 : ddy < 0 ? 3 : -1) : ddx > 0 ? 0 : ddx < 0 ? 2 : -1
      if (drawing) {
        for (const d of [primary, secondary]) {
          if (d < 0) continue
          const nv = (py + DY[d]) * VW + px + DX[d]
          if (edge(px, py, d) === 2 && !onTrail[nv]) return [d, 1]
        }
        return [-1, 1]
      }
      if (fingerOpen && edge(px, py, primary) === 2 && Math.abs(ddx) + Math.abs(ddy) > 2) return [primary, 1]
      if (fingerOpen && secondary >= 0 && edge(px, py, secondary) === 2 && Math.abs(ddx) + Math.abs(ddy) > 2) return [secondary, 1]
      // walk the boundary toward the boundary vertex nearest the finger
      const verts = boundaryBFS(2000)
      let best = -1
      let bd = 1e9
      for (const v of verts) {
        const d = Math.hypot((v % VW) - tp.x, Math.floor(v / VW) - tp.y)
        if (d < bd - 0.01) {
          bd = d
          best = v
        }
      }
      if (best >= 0 && best !== py * VW + px) {
        const dirs = pathTo(best)
        if (dirs.length) return [dirs[0], 0]
      }
      return [-1, 0]
    }
    return [-1, drawKey]
  }

  /* -------------------------------------------------------------- states */

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') {
      reset()
      held.length = 0
      hintA = full && !botParam && firstGame ? 1 : 0
      firstGame = false
      hintT = 0
    }
    if (next === 'over') {
      finalScore = score
      finalLevel = level
      finalPct = claimed / (GW * GH)
      newRecord = hi.submit(finalScore)
    }
  }

  const audible = () => state === 'play'

  /* ------------------------------------------------------------- update */

  function update(dt: number, t: number, botDrives: boolean) {
    levelT += dt
    if (clearing) {
      clearing.t += dt
      if (clearing.t > 3.2) setupLevel(level + 1)
      return
    }
    if (dying) {
      dying.t += dt
      if (dying.t > 1.1) finishDeath()
      for (const q of qixes) updateQix(q, dt, t)
      return
    }
    // sparx arrive over time
    sparxTimer -= dt
    if (sparxTimer <= 0 && sparx.length < sparxMax()) {
      spawnSparx(false)
      sparxTimer = 6
    }
    for (const q of qixes) updateQix(q, dt, t)
    // the marker: a time budget spent one lattice step at a time
    acc += dt
    let moved = false
    let first = true
    for (let guard = 0; guard < 8; guard++) {
      let d: number
      let mode: number
      if (botDrives) {
        if (!bot.pending) bot.pending = botInput(first ? dt : 0)
        ;[d, mode] = bot.pending
      } else {
        ;[d, mode] = playerInput()
        if (d >= 0 && mode === 0 && !drawing && edge(px, py, d) === 2 && !tp) edgeNudge = 1.6
      }
      first = false
      if (d < 0) {
        bot.pending = null
        acc = 0
        break
      }
      const cost = 1 / (drawing ? (mode === 2 ? 19 : 38) : 46)
      if (acc < cost) break
      // the bot holds a closing step while a spark passes the landing point
      if (botDrives && drawing && sparkAtLanding(d)) {
        acc = 0
        break
      }
      acc -= cost
      bot.pending = null
      if (!stepMarker(d, mode)) {
        acc = 0
        bot.plan = null
        break
      }
      moved = true
      if (clearing || dying) break
    }
    if (moved) {
      idleT = 0
      fuse = -1
      if (drawing && audible() && vr() < 0.12) env.sfx.tone(slowDraw ? 587.33 : 880, 0.02, { type: 'sine', gain: 0.015, room: 0.02 })
    } else if (drawing) idleT += dt
    // fuse
    if (drawing && idleT > 0.45) {
      if (fuse < 0) fuse = 0
      const before = Math.floor(fuse * 0.5)
      fuse += dt * 16
      // a soft crackle as it burns
      if (audible() && Math.floor(fuse * 0.5) !== before) env.sfx.noise(0.03, { filter: 3200, q: 2, gain: 0.03, room: 0.05 })
      if (fuse >= trail.length / 2 - 1) kill('fuse')
    }
    // sparx
    const ss = sparxSpeed()
    for (const s of sparx) {
      s.born += dt
      s.acc += ss * dt
      while (s.acc >= 1) {
        s.acc -= 1
        stepSparx(s)
      }
      if (!drawing && Math.hypot(s.x - px, s.y - py) < 1.1 && s.born > 0.6) kill('sparx')
      if (full && vr() < dt * 6) sparks.emit(s.x * U, s.y * U, 1, { speed: 40, life: 0.3, color: C.ink2, r: vr })
    }
    // the qix against the line
    for (const q of qixes) if (qixTouchesLine(q, t)) kill('qix')
  }

  /* ------------------------------------------------------------ drawing */

  let cache: HTMLCanvasElement | null = null
  let cacheKey = ''

  function hatchParcel(c: CanvasRenderingContext2D, p: Parcel, lw: number, alpha: number) {
    c.save()
    c.clip(p.fill)
    const x0 = p.x0 * U
    const y0 = p.y0 * U
    const w = (p.x1 - p.x0) * U
    const h = (p.y1 - p.y0) * U
    const cx = x0 + w / 2
    const cy = y0 + h / 2
    const R = Math.hypot(w, h) / 2 + 2
    const gap = p.slow ? 2.3 : 3.4
    c.strokeStyle = p.color
    c.lineWidth = lw
    c.globalAlpha = alpha * (p.slow ? 0.5 : 0.62)
    for (let pass = 0; pass < (p.slow ? 2 : 1); pass++) {
      const a = p.angle + pass * 1.35
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      c.beginPath()
      for (let d = -R; d <= R; d += pass ? gap * 2 : gap) {
        const ox = cx - sa * d
        const oy = cy + ca * d
        c.moveTo(ox - ca * R, oy - sa * R)
        c.lineTo(ox + ca * R, oy + sa * R)
      }
      c.stroke()
    }
    c.restore()
  }

  function parcelLabel(c: CanvasRenderingContext2D, p: Parcel, s: number) {
    const room = (p.inr - 0.5) * U * s // px from the label point to the nearest edge
    if (room < 21) return
    const x = p.lx * U
    const y = p.ly * U
    const fs = clamp(8.5 / s, 2, 9)
    const label = `P.${String(p.id).padStart(2, '0')}`
    c.font = `500 ${fs}px ${'"Geist Mono", ui-monospace, Menlo, Consolas, monospace'}`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const tw = c.measureText(label).width + 6 / s
    c.globalAlpha = 0.92
    c.fillStyle = C.paper
    c.fillRect(x - tw / 2, y - fs * 0.85, tw, fs * 1.7)
    c.globalAlpha = 1
    c.strokeStyle = C.ink
    c.lineWidth = 1 / s
    c.strokeRect(x - tw / 2, y - fs * 0.85, tw, fs * 1.7)
    c.fillStyle = C.ink
    c.fillText(label, x, y + 0.5 / s)
    if (room > 30) {
      const pct = ((p.area / (GW * GH)) * 100).toFixed(1) + '%'
      c.font = `500 ${fs * 0.86}px ${'"Geist Mono", ui-monospace, Menlo, Consolas, monospace'}`
      c.fillStyle = C.muted
      c.fillText(pct, x, y + fs * 1.6)
    }
  }

  /** Bake every finished parcel into an offscreen canvas at screen resolution. */
  function bake(upTo: number) {
    const W = Math.ceil(GW * U * f.s * env.dpr)
    const H = Math.ceil(GH * U * f.s * env.dpr)
    if (!cache) cache = document.createElement('canvas')
    if (cache.width !== W || cache.height !== H) {
      cache.width = W
      cache.height = H
    }
    const c = cache.getContext('2d')
    if (!c) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, W, H)
    const k = f.s * env.dpr
    c.setTransform(k, 0, 0, k, 0, 0)
    for (let i = 0; i < upTo; i++) hatchParcel(c, parcels[i], 1 / f.s, 1)
    c.strokeStyle = C.ink
    c.lineWidth = 1 / f.s
    c.globalAlpha = 0.85
    for (let i = 0; i < upTo; i++) c.stroke(parcels[i].outline)
    c.globalAlpha = 1
    for (let i = 0; i < upTo; i++) parcelLabel(c, parcels[i], f.s)
    cacheKey = `${upTo}|${f.s}|${env.dpr}|${GW}|${parcels.length ? parcels[0].born : 0}`
  }

  const SX = (x: number) => f.ox + x * f.s
  const SY = (y: number) => f.oy + y * f.s

  function drawField() {
    const FW = GW * U
    const FH = GH * U
    const hl = 1 / f.s
    // construction grid
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hl
    ctx.globalAlpha = 0.05
    ctx.beginPath()
    for (let x = 10; x < GW; x += 10) {
      ctx.moveTo(x * U, 0)
      ctx.lineTo(x * U, FH)
    }
    for (let y = 10; y < GH; y += 10) {
      ctx.moveTo(0, y * U)
      ctx.lineTo(FW, y * U)
    }
    ctx.stroke()
    // grid crosses at every 20
    ctx.globalAlpha = 0.22
    ctx.beginPath()
    for (let x = 20; x < GW; x += 20)
      for (let y = 20; y < GH; y += 20) {
        ctx.moveTo(x * U - 2, y * U)
        ctx.lineTo(x * U + 2, y * U)
        ctx.moveTo(x * U, y * U - 2)
        ctx.lineTo(x * U, y * U + 2)
      }
    ctx.stroke()
    // outside ticks
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    for (let x = 0; x <= GW; x += 5) {
      const l = x % 20 === 0 ? 4 : 2
      ctx.moveTo(x * U, FH)
      ctx.lineTo(x * U, FH + l)
    }
    for (let y = 0; y <= GH; y += 5) {
      const l = y % 20 === 0 ? 4 : 2
      ctx.moveTo(FW, y * U)
      ctx.lineTo(FW + l, y * U)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    // parcels: baked ones from the cache, the newest animated live
    const live = parcels.length && levelT - parcels[parcels.length - 1].born < 0.9 ? 1 : 0
    const upTo = parcels.length - live
    const key = `${upTo}|${f.s}|${env.dpr}|${GW}|${parcels.length ? parcels[0].born : 0}`
    if (key !== cacheKey || cacheDirty) {
      bake(upTo)
      cacheDirty = false
    }
    // after a level clears, a sweep line wipes the survey off the sheet
    const wipe = clearing ? ease.inOutCubic(clamp((clearing.t - 2.25) / 0.85)) : 0
    if (cache && upTo > 0 && wipe < 1) {
      ctx.save()
      if (wipe > 0) {
        ctx.beginPath()
        ctx.rect(FW * wipe, -2, FW * (1 - wipe) + 2, FH + 4)
        ctx.clip()
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = clearing ? 0.85 + 0.15 * Math.sin(clearing.t * 8) : 1
      ctx.drawImage(cache, Math.round((f.ox + L.fx * f.s) * env.dpr + shakeX * f.s * env.dpr), Math.round((f.oy + L.fy * f.s) * env.dpr))
      ctx.restore()
    }
    if (wipe > 0 && wipe < 1) {
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hl * 1.5
      ctx.beginPath()
      ctx.moveTo(FW * wipe, -4)
      ctx.lineTo(FW * wipe, FH + 4)
      ctx.stroke()
      if (vr() < 0.9) sparks.emit(FW * wipe, vr() * FH, 1, { speed: 50, life: 0.4, color: HATCH[Math.floor(vr() * 4)], dir: Math.PI, spread: 1.2, r: vr })
    }
    if (live) {
      const p = parcels[parcels.length - 1]
      const k = clamp((levelT - p.born) / 0.75)
      const R = Math.hypot(Math.max(p.ox - p.x0, p.x1 - p.ox), Math.max(p.oy - p.y0, p.y1 - p.oy)) * U * 1.05
      const r = R * ease.outCubic(k)
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.ox * U, p.oy * U, Math.max(0.1, r), 0, TAU)
      ctx.clip()
      hatchParcel(ctx, p, hl, 1)
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hl * 1.6
      ctx.globalAlpha = 0.85
      ctx.stroke(p.outline)
      ctx.restore()
      // the scan front
      ctx.save()
      ctx.clip(p.fill)
      ctx.strokeStyle = p.color
      ctx.lineWidth = hl * 1.5
      ctx.globalAlpha = 1 - k
      ctx.beginPath()
      ctx.arc(p.ox * U, p.oy * U, Math.max(0.1, r), 0, TAU)
      ctx.stroke()
      ctx.restore()
      ctx.globalAlpha = 1
    }
    // the field border
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hl * 1.2
    ctx.strokeRect(0, 0, FW, FH)
  }

  let shakeX = 0

  function drawTrail(pts: number[], upTo: number, col: string, lw: number) {
    if (pts.length < 4 || upTo <= 0) return
    ctx.strokeStyle = col
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0] * U, pts[1] * U)
    const n = Math.min(pts.length / 2 - 1, upTo)
    for (let i = 1; i <= Math.floor(n); i++) ctx.lineTo(pts[i * 2] * U, pts[i * 2 + 1] * U)
    const fr = n - Math.floor(n)
    if (fr > 0 && Math.floor(n) + 1 < pts.length / 2) {
      const i = Math.floor(n)
      ctx.lineTo(lerp(pts[i * 2], pts[i * 2 + 2], fr) * U, lerp(pts[i * 2 + 1], pts[i * 2 + 3], fr) * U)
    }
    ctx.stroke()
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
  }

  function drawQix(q: Qix, t: number, alpha: number) {
    const hl = 1 / f.s
    // echoes, oldest first
    for (let e = q.echoN - 1; e >= 1; e--) {
      const o = e * K * 4
      ctx.strokeStyle = e % 2 ? C.ocean : C.lagoon
      ctx.globalAlpha = alpha * 0.42 * (1 - e / ECHO)
      ctx.lineWidth = hl
      ctx.beginPath()
      for (let i = 0; i < K; i++) {
        ctx.moveTo(q.echo[o + i * 4] * U, q.echo[o + i * 4 + 1] * U)
        ctx.lineTo(q.echo[o + i * 4 + 2] * U, q.echo[o + i * 4 + 3] * U)
      }
      ctx.stroke()
    }
    qixShape(q, t, shapeBuf, 0)
    ctx.strokeStyle = C.ink
    ctx.globalAlpha = alpha
    ctx.lineWidth = hl * 1.15
    ctx.beginPath()
    for (let i = 0; i < K; i++) {
      ctx.moveTo(shapeBuf[i * 4] * U, shapeBuf[i * 4 + 1] * U)
      ctx.lineTo(shapeBuf[i * 4 + 2] * U, shapeBuf[i * 4 + 3] * U)
    }
    ctx.stroke()
    // the two rails as faint ellipse ends
    ctx.globalAlpha = alpha * 0.5
    ctx.fillStyle = C.ink
    ctx.beginPath()
    for (let i = 0; i < K; i++) {
      ctx.rect(shapeBuf[i * 4] * U - hl, shapeBuf[i * 4 + 1] * U - hl, hl * 2, hl * 2)
      ctx.rect(shapeBuf[i * 4 + 2] * U - hl, shapeBuf[i * 4 + 3] * U - hl, hl * 2, hl * 2)
    }
    ctx.fill()
    ctx.globalAlpha = 1
  }

  function drawSparx(s: Spark, t: number) {
    const hl = 1 / f.s
    // a short dotted wake along the boundary
    ctx.fillStyle = C.ink2
    for (let i = 0; i < s.trail.length; i += 2) {
      ctx.globalAlpha = 0.5 * (1 - i / s.trail.length)
      ctx.fillRect(s.trail[i] * U - hl, s.trail[i + 1] * U - hl, hl * 2, hl * 2)
    }
    ctx.globalAlpha = 1
    const x = lerp(s.px, s.x, clamp(s.acc)) * U
    const y = lerp(s.py, s.y, clamp(s.acc)) * U
    const r = Math.max(3.4, 4.2 / f.s) + Math.sin(t * 18 + s.hand) * 0.5
    const appear = ease.outBack(clamp(s.born / 0.4))
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(appear, appear)
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hl * 1.2
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.lineTo(r, 0)
    ctx.lineTo(0, r)
    ctx.lineTo(-r, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // a spinning inner tick
    const a = t * 9 * s.hand
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5)
    ctx.lineTo(-Math.cos(a) * r * 0.5, -Math.sin(a) * r * 0.5)
    ctx.stroke()
    ctx.restore()
  }

  function drawMarker(t: number) {
    const hl = 1 / f.s
    const x = vx * U
    const y = vy * U
    const r = Math.max(drawing ? 3.2 : 2.6, (drawing ? 4.2 : 3.6) / f.s)
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hl * 1.2
    ctx.fillStyle = C.paper
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    const L2 = r + 2.6
    ctx.moveTo(x - L2, y)
    ctx.lineTo(x + L2, y)
    ctx.moveTo(x, y - L2)
    ctx.lineTo(x, y + L2)
    ctx.stroke()
    if (drawing) {
      ctx.strokeStyle = slowDraw ? C.ocean : C.moss
      ctx.beginPath()
      ctx.arc(x, y, r + 2.2, t * 6, t * 6 + 1.6)
      ctx.stroke()
    }
  }

  /** On bare layouts: a small claimed-vs-target gauge (under the right HUD column, or along the field's foot). */
  function miniGauge() {
    const pct = shownPct
    let x0: number
    let x1: number
    let y: number
    if (f.side) {
      x0 = f.ox + f.lw * f.s + 14
      x1 = Math.min(env.width - 10, x0 + 72)
      y = f.oy + 14 + 2 * 36 + 2
    } else {
      x0 = SX(L.fx)
      x1 = SX(L.fx + GW * U)
      y = SY(L.fy + GH * U) + Math.max(3, 4 * f.s)
    }
    ctx.lineWidth = 1
    ctx.strokeStyle = C.rule
    ctx.beginPath()
    ctx.moveTo(x0, Math.round(y) + 0.5)
    ctx.lineTo(x1, Math.round(y) + 0.5)
    ctx.stroke()
    ctx.strokeStyle = C.moss
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, Math.round(y) + 0.5)
    ctx.lineTo(lerp(x0, x1, pct), Math.round(y) + 0.5)
    ctx.stroke()
    const tx = Math.round(lerp(x0, x1, TARGET)) + 0.5
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(tx, y - 3)
    ctx.lineTo(tx, y + 4)
    ctx.stroke()
    if (f.side) text(ctx, '75%', tx, y + 13, { size: 7.5, color: C.muted, align: 'center', tracking: 0.1 })
  }

  function readouts() {
    if (L.bare) return
    const small = f.s < 0.9
    const k = f.s
    if (!L.portrait) {
      // the side column: big readout, a vertical ruler and the area schedule
      const cx = SX(L.fx + GW * U + 14)
      const top = SY(L.fy)
      const big = clamp(k * 26, 26, 76)
      text(ctx, 'CLAIMED', cx, top + 10, { size: clamp(k * 4.4, 7.5, 10), color: C.muted, tracking: 0.16 })
      const s = (shownPct * 100).toFixed(1)
      text(ctx, s, cx, top + 12 + big * 0.92, { font: 'serif', size: big, color: C.ink })
      setFontW(big)
      const w = ctx.measureText(s).width
      text(ctx, '%', cx + w + 2, top + 12 + big * 0.92, { font: 'serif', size: big * 0.5, italic: true, color: C.moss })
      text(ctx, `TARGET ${Math.round(TARGET * 100)}%`, cx, top + 26 + big, { size: clamp(k * 4, 7.5, 9.5), color: C.ink2, tracking: 0.14 })
      // ruler
      const rx = cx + 2
      const ry0 = top + 46 + big
      const ry1 = SY(L.fy + GH * U) - (small ? 4 : 128 * Math.min(1, k / 1.6))
      const rh = ry1 - ry0
      if (rh > 40) {
        ctx.lineWidth = 1
        ctx.strokeStyle = C.ink
        ctx.beginPath()
        ctx.moveTo(Math.round(rx) + 0.5, ry0)
        ctx.lineTo(Math.round(rx) + 0.5, ry1)
        for (let i = 0; i <= 20; i++) {
          const y = Math.round(ry1 - (i / 20) * rh) + 0.5
          ctx.moveTo(rx, y)
          ctx.lineTo(rx + (i % 5 === 0 ? 7 : 3.5), y)
        }
        ctx.stroke()
        // the claimed part, hatched
        const fy = ry1 - shownPct * rh
        ctx.save()
        ctx.beginPath()
        ctx.rect(rx + 10, fy, 12, ry1 - fy)
        ctx.strokeStyle = C.moss
        ctx.stroke()
        ctx.clip()
        ctx.beginPath()
        for (let y = fy - 20; y < ry1 + 20; y += 4) {
          ctx.moveTo(rx + 10, y + 12)
          ctx.lineTo(rx + 22, y)
        }
        ctx.stroke()
        ctx.restore()
        // target mark
        const ty = Math.round(ry1 - TARGET * rh) + 0.5
        ctx.strokeStyle = C.ink
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(rx - 4, ty)
        ctx.lineTo(rx + 30, ty)
        ctx.stroke()
        ctx.setLineDash([])
        text(ctx, '75', rx + 33, ty + 3, { size: 8.5, color: C.ink, tracking: 0.06 })
        for (const v of [0, 50, 100]) text(ctx, String(v), rx + 26, ry1 - (v / 100) * rh + 3, { size: 8, color: C.muted, tracking: 0.04 })
      }
      // area schedule
      if (!small && k > 1.2) {
        const sy0 = SY(L.fy + GH * U) - 118 * Math.min(1, k / 1.6)
        const lh = 13
        text(ctx, 'SCHEDULE', cx, sy0, { size: 8.5, color: C.muted, tracking: 0.16 })
        ctx.strokeStyle = C.rule
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, Math.round(sy0 + 5) + 0.5)
        ctx.lineTo(SX(L.lw) - 4, Math.round(sy0 + 5) + 0.5)
        ctx.stroke()
        const list = parcels.slice(-7).reverse()
        list.forEach((p, i) => {
          const y = sy0 + 18 + i * lh
          ctx.strokeStyle = p.color
          ctx.strokeRect(Math.round(cx) + 0.5, Math.round(y - 7) + 0.5, 8, 8)
          ctx.beginPath()
          ctx.moveTo(cx + 1, y + 0.5)
          ctx.lineTo(cx + 8, y - 6.5)
          if (p.slow) {
            ctx.moveTo(cx + 1, y - 6.5)
            ctx.lineTo(cx + 8, y + 0.5)
          }
          ctx.stroke()
          text(ctx, `P.${String(p.id).padStart(2, '0')}`, cx + 14, y, { size: 8.5, color: i === 0 ? C.ink : C.ink2, tracking: 0.06 })
          text(ctx, `${((p.area / (GW * GH)) * 100).toFixed(1)}%`, SX(L.lw) - 4, y, { size: 8.5, color: C.muted, align: 'right', tracking: 0.04 })
        })
      }
    } else {
      // portrait: a header strip
      const x0 = SX(L.fx)
      const y0 = SY(0)
      const big = clamp(k * 30, 24, 60)
      text(ctx, 'CLAIMED', x0, y0 + 10, { size: 8, color: C.muted, tracking: 0.16 })
      const s = (shownPct * 100).toFixed(1)
      text(ctx, s, x0, y0 + 10 + big * 0.95, { font: 'serif', size: big, color: C.ink })
      setFontW(big)
      const w = ctx.measureText(s).width
      text(ctx, '%', x0 + w + 2, y0 + 10 + big * 0.95, { font: 'serif', size: big * 0.5, italic: true, color: C.moss })
      const rx0 = x0 + w + big * 0.6
      const rx1 = SX(L.fx + GW * U)
      const ry = y0 + 10 + big * 0.7
      const rw = rx1 - rx0
      ctx.lineWidth = 1
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(rx0, Math.round(ry) + 0.5)
      ctx.lineTo(rx1, Math.round(ry) + 0.5)
      for (let i = 0; i <= 20; i++) {
        const x = Math.round(rx0 + (i / 20) * rw) + 0.5
        ctx.moveTo(x, ry)
        ctx.lineTo(x, ry - (i % 5 === 0 ? 7 : 3.5))
      }
      ctx.stroke()
      ctx.save()
      ctx.beginPath()
      ctx.rect(rx0, ry + 4, shownPct * rw, 8)
      ctx.strokeStyle = C.moss
      ctx.stroke()
      ctx.clip()
      ctx.beginPath()
      for (let x = rx0 - 10; x < rx0 + shownPct * rw + 10; x += 4) {
        ctx.moveTo(x, ry + 12)
        ctx.lineTo(x + 8, ry + 4)
      }
      ctx.stroke()
      ctx.restore()
      const tx = Math.round(rx0 + TARGET * rw) + 0.5
      ctx.setLineDash([2, 2])
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(tx, ry - 10)
      ctx.lineTo(tx, ry + 16)
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, 'TARGET 75', tx, ry + 26, { size: 7.5, color: C.ink2, align: 'center', tracking: 0.12 })
    }
  }

  /**
   * The first-play demonstration: a dotted ghost line leaves the marker,
   * turns, and returns to the edge; when it closes, a faint hatch shows the
   * land it would claim.
   */
  function drawHint() {
    if (state !== 'play' || botParam || dying || clearing || drawing) return
    let n = -1
    for (let d = 0; d < 4 && n < 0; d++) if (edge(px, py, d) === 2) n = d
    if (n < 0) return
    let side = (n + 1) % 4
    const D = Math.min(16, Math.floor(GH * 0.16))
    const W = Math.min(20, Math.floor(GW * 0.16))
    const room = (d: number, len: number) => {
      const x = px + DX[n] * D + DX[d] * len
      const y = py + DY[n] * D + DY[d] * len
      return x >= 1 && y >= 1 && x <= GW - 1 && y <= GH - 1
    }
    if (!room(side, W)) side = (n + 3) % 4
    const pts = [px, py, px + DX[n] * D, py + DY[n] * D, px + DX[n] * D + DX[side] * W, py + DY[n] * D + DY[side] * W, px + DX[side] * W, py + DY[side] * W]
    const total = D * 2 + W
    const k = clamp((hintT % 3.2) / 2.2)
    let left = k * total
    const hl = 1 / f.s
    ctx.strokeStyle = C.moss
    ctx.fillStyle = C.moss
    ctx.lineWidth = hl * 1.2
    ctx.globalAlpha = hintA * 0.9
    ctx.setLineDash([2, 2.5])
    ctx.beginPath()
    ctx.moveTo(pts[0] * U, pts[1] * U)
    let tipX = pts[0]
    let tipY = pts[1]
    for (let i = 2; i < pts.length && left > 0; i += 2) {
      const seg = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1])
      const u = Math.min(1, left / seg)
      tipX = lerp(pts[i - 2], pts[i], u)
      tipY = lerp(pts[i - 1], pts[i + 1], u)
      ctx.lineTo(tipX * U, tipY * U)
      left -= seg
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(tipX * U, tipY * U, Math.max(1.6, 2.2 / f.s), 0, TAU)
    ctx.fill()
    // closed: a faint preview of the parcel it would make
    if (k >= 1) {
      const fade = 1 - clamp(((hintT % 3.2) - 2.2) / 1)
      const xs = [pts[0], pts[2], pts[4], pts[6]]
      const ys = [pts[1], pts[3], pts[5], pts[7]]
      const bx = Math.min(...xs) * U
      const by = Math.min(...ys) * U
      const bw = (Math.max(...xs) - Math.min(...xs)) * U
      const bh = (Math.max(...ys) - Math.min(...ys)) * U
      ctx.globalAlpha = hintA * 0.45 * fade
      ctx.lineWidth = hl
      ctx.save()
      ctx.beginPath()
      ctx.rect(bx, by, bw, bh)
      ctx.clip()
      ctx.beginPath()
      for (let d = -bh; d < bw; d += 3.4) {
        ctx.moveTo(bx + d, by + bh)
        ctx.lineTo(bx + d + bh, by)
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = 1
    hintAt = [pts[2], pts[3], pts[4], pts[5]]
  }
  let hintAt: number[] | null = null

  /** Where a press is steering the marker: a small target, with a dotted lead from the marker while pressed. */
  function drawTarget() {
    if (state !== 'play' || botParam || dying || clearing) return
    const tgt = tp ?? (hover && !usesTouch ? hover : null)
    if (!tgt || tgt.x < 0 || tgt.y < 0 || tgt.x > GW || tgt.y > GH) return
    const x = tgt.x * U
    const y = tgt.y * U
    const hl = 1 / f.s
    const on = !!tp
    ctx.strokeStyle = on ? C.moss : C.ink2
    ctx.globalAlpha = on ? 0.9 : 0.35
    ctx.lineWidth = hl
    const r = Math.max(3, (usesTouch ? 9 : 5) / f.s)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.moveTo(x - r * 1.6, y)
    ctx.lineTo(x - r * 0.5, y)
    ctx.moveTo(x + r * 0.5, y)
    ctx.lineTo(x + r * 1.6, y)
    ctx.moveTo(x, y - r * 1.6)
    ctx.lineTo(x, y - r * 0.5)
    ctx.moveTo(x, y + r * 0.5)
    ctx.lineTo(x, y + r * 1.6)
    ctx.stroke()
    if (on) {
      ctx.setLineDash([1.5, 2.5])
      ctx.beginPath()
      ctx.moveTo(vx * U, vy * U)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
  }

  /** Screen-space hints and in-the-moment prompts, and the cursor. */
  function affordances() {
    const playing = state === 'play' && !botParam
    if (hintA > 0.01 && hintAt && playing) {
      const x = SX(L.fx + Math.max(hintAt[0], hintAt[2]) * U) + 8
      const y = SY(L.fy + Math.min(hintAt[1], hintAt[3]) * U) + 4
      const right = x < SX(L.fx + GW * U * 0.7)
      const ax = right ? x : SX(L.fx + Math.min(hintAt[0], hintAt[2]) * U) - 8
      const al: CanvasTextAlign = right ? 'left' : 'right'
      text(ctx, usesTouch ? 'DRAG INTO THE FIELD' : 'HOLD DRAW + ARROWS', ax, y, { size: 9, color: C.moss, align: al, tracking: 0.14, alpha: hintA })
      text(ctx, 'BACK TO THE EDGE CLAIMS', ax, y + 13, { size: 8.5, color: C.ink2, align: al, tracking: 0.12, alpha: hintA * 0.8 })
    }
    hintAt = null
    if (playing && !dying && !clearing) {
      const mx = SX(L.fx + vx * U)
      const my = SY(L.fy + vy * U)
      if (drawing && fuse >= 0 && blink(stateT, 3)) text(ctx, 'KEEP MOVING — FUSE LIT', mx, my + 22, { size: 9, color: C.ink, align: 'center', tracking: 0.14 })
      else if (edgeNudge > 0 && !drawing) text(ctx, usesTouch ? 'DRAG FURTHER IN' : 'HOLD DRAW TO LEAVE THE EDGE', mx, my - 14, { size: 9, color: C.moss, align: 'center', tracking: 0.14, alpha: clamp(edgeNudge / 0.4) })
    }
    let cur = 'default'
    if (full) {
      if (state === 'title' || (state === 'over' && stateT > 0.8)) cur = 'pointer'
      else if (playing && hover && hover.x >= -1 && hover.y >= -1 && hover.x <= GW + 1 && hover.y <= GH + 1) cur = 'crosshair'
    }
    env.setCursor(cur)
  }

  function setFontW(size: number) {
    ctx.font = `400 ${size}px ${'"Instrument Serif", "Iowan Old Style", "Times New Roman", serif'}`
  }

  const qixLabels: [number, number, number, number][] = []

  function overlayText() {
    for (const [x, y, i, r] of qixLabels) text(ctx, `QIX ${i + 1} · R ${r.toFixed(1)}`, SX(L.fx + x), SY(L.fy + y) + 3, { size: 8, color: C.ink2, tracking: 0.12, alpha: 0.8 })
    qixLabels.length = 0
    const fx = SX(L.fx + (GW * U) / 2)
    const fy = SY(L.fy + (GH * U) / 2)
    if (clearing) {
      const k = clearing.t
      const a = clamp(k / 0.3) * (1 - clamp((k - 2.6) / 0.5))
      const big = clamp(f.s * 22, 24, 64)
      ctx.globalAlpha = a * 0.95
      ctx.fillStyle = C.paper
      const bw = Math.max(220, big * 6.5)
      const top = fy - big * 1.05 - 8
      const bh = big * 2.1 + 26
      ctx.fillRect(fx - bw / 2, top, bw, bh)
      ctx.globalAlpha = a
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(fx - bw / 2) + 0.5, Math.round(top) + 0.5, Math.round(bw), Math.round(bh))
      ctx.globalAlpha = 1
      text(ctx, `LEVEL ${String(level).padStart(2, '0')} · SURVEYED`, fx, top + 18, { size: 9, color: C.muted, align: 'center', tracking: 0.16, alpha: a })
      text(ctx, `${(clearing.pct * 100).toFixed(1)}%`, fx, fy + big * 0.4, { font: 'serif', size: big, color: C.ink, align: 'center', alpha: a })
      text(ctx, `BONUS +${clearing.bonus}`, fx, top + bh - 12, { size: 9.5, color: C.moss, align: 'center', tracking: 0.16, alpha: a })
    }
    if (drawing && f.s > 0.9 && !dying) {
      // a live length readout by the marker
      const n = trail.length / 2 - 1
      text(ctx, `${slowDraw ? 'SLOW ×2' : 'L'} ${String(n).padStart(3, '0')}`, SX(L.fx + vx * U) + 10, SY(L.fy + vy * U) - 9, { size: 8.5, color: slowDraw ? C.ocean : C.ink2, tracking: 0.1 })
    }
    if (dying) {
      const a = Math.sin(clamp(dying.t / 1.1) * Math.PI)
      const why = dying.cause === 'qix' ? 'THE QIX CUT THE LINE' : dying.cause === 'fuse' ? 'THE FUSE CAUGHT UP' : 'A SPARK CAUGHT THE MARKER'
      text(ctx, `LOST — ${why}`, SX(L.fx + dying.x * U), SY(L.fy + dying.y * U) - 14, { size: 9, color: C.ink, align: 'center', tracking: 0.14, alpha: a })
    }
    if (state === 'play' && levelT < 2.2 && !clearing) {
      const a = Math.sin(clamp(levelT / 2.2) * Math.PI)
      text(ctx, `LEVEL ${String(level).padStart(2, '0')} — CLAIM 75%`, fx, SY(L.fy) + 22, { size: 10, color: C.ink, align: 'center', tracking: 0.18, alpha: a })
    }
  }

  /* -------------------------------------------------------------- start */

  allocate(L.gw, L.gh)
  setupLevel(1)
  const ps = env.params.get('state')
  if (ps === 'play') go('play')
  else if (ps === 'over') {
    // a plausible finished survey behind the card
    for (let i = 0; i < 60 * 30; i++) update(1 / 60, i / 60, true)
    state = 'over'
    finalScore = score
    finalLevel = level
    finalPct = claimed / (GW * GH)
  }

  return {
    resize(w, h) {
      const want = layoutFor(w, h, env.mode)
      if (want.gw === GW && want.gh === GH) L = want
      else if (state !== 'play') {
        allocate(want.gw, want.gh)
        L = want
        setupLevel(1)
        score = 0
      } else L = layoutOf(GH > GW, want.bare) // keep the lattice mid-game
      f = gameFit(w, h, env.mode, L.lw, L.lh)
      cacheDirty = true
    },
    key(code, down) {
      if (down) usesTouch = false
      if (code in KEYDIR) {
        const d = KEYDIR[code]
        const i = held.indexOf(d)
        if (i >= 0) held.splice(i, 1)
        if (down) held.push(d)
      }
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight', ...START_KEYS])
    },
    pointer(p) {
      touch.pointer(p)
      if (p.pointerType === 'touch' || p.pointerType === 'pen') usesTouch = true
      else if (p.type === 'move' && !p.pressed) usesTouch = false
      const cell = { x: (p.x - f.ox) / f.s / U - L.fx / U, y: (p.y - f.oy) / f.s / U - L.fy / U }
      hover = p.type === 'leave' ? null : cell
      if (p.pressed && (p.type === 'down' || p.type === 'move')) tp = cell
      else if (p.type === 'up' || p.type === 'leave') tp = null
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        tp = null
      }
      if (dt > 0) {
        const botDrives = state !== 'play' || botParam
        update(dt, t, botDrives)
        // the attract demo starts over when it runs out of lives or clears a couple of levels
        if (botDrives && state !== 'play' && level > 2 && !clearing) {
          setupLevel(1)
          score = 0
        }
        vx = lerp(vx, px, damp(34, dt))
        vy = lerp(vy, py, damp(34, dt))
        shownPct = lerp(shownPct, claimed / (GW * GH), damp(5, dt))
        hintT += dt
        edgeNudge = Math.max(0, edgeNudge - dt)
        if (state !== 'play' || parcels.length > 0) hintA = Math.max(0, hintA - dt * 1.5)
        shake = Math.max(0, shake - dt * 14)
        shakeX = shake > 0 ? Math.sin(t * 80) * shake * 0.4 : 0
        sparks.update(dt, 0, 2.4)
        rings.update(dt)
      }

      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: f.lw * f.s > 340 ? 'FIG. G.09 — AFTER QIX, 1981 · PLAN OF CLAIMS' : 'FIG. G.09 — AFTER QIX, 1981' })
      enterFit(ctx, f)
      ctx.translate(L.fx + shakeX, L.fy)
      drawField()
      if (hintA > 0.01) drawHint()
      drawTarget()
      // dying: the line erases back toward its start
      if (dying) {
        const n = dying.trail.length / 2 - 1
        const k = clamp(dying.t / 0.8)
        const upTo = n * (1 - ease.inOutCubic(k))
        drawTrail(dying.trail, upTo, C.ink, 1.5 / f.s)
        if (n > 0 && k < 1 && vr() < 0.8) {
          const i = Math.min(n, Math.floor(upTo))
          sparks.emit(dying.trail[i * 2] * U, dying.trail[i * 2 + 1] * U, 2, { speed: 60, life: 0.4, color: C.ink, r: vr })
        }
      } else if (drawing) {
        drawTrail(trail, trail.length, slowDraw ? C.ocean : C.ink, 1.5 / f.s)
        // the open tail to the marker
        if (trail.length >= 2) {
          ctx.strokeStyle = slowDraw ? C.ocean : C.ink
          ctx.lineWidth = 1.5 / f.s
          ctx.beginPath()
          ctx.moveTo(trail[trail.length - 2] * U, trail[trail.length - 1] * U)
          ctx.lineTo(vx * U, vy * U)
          ctx.stroke()
        }
        if (fuse >= 0) {
          const i = Math.floor(fuse)
          const fr = fuse - i
          if (i * 2 + 3 < trail.length) {
            const x = lerp(trail[i * 2], trail[i * 2 + 2], fr) * U
            const y = lerp(trail[i * 2 + 1], trail[i * 2 + 3], fr) * U
            // the burnt part
            ctx.strokeStyle = C.paper
            ctx.lineWidth = 2.6 / f.s
            ctx.beginPath()
            ctx.moveTo(trail[0] * U, trail[1] * U)
            for (let j = 1; j <= i; j++) ctx.lineTo(trail[j * 2] * U, trail[j * 2 + 1] * U)
            ctx.lineTo(x, y)
            ctx.stroke()
            ctx.strokeStyle = C.fern
            ctx.lineWidth = 1 / f.s
            ctx.setLineDash([1.5, 1.5])
            ctx.stroke()
            ctx.setLineDash([])
            sparks.emit(x, y, 1, { speed: 50, life: 0.3, color: C.fern, r: vr })
          }
        }
      }
      for (const q of qixes) drawQix(q, t, clearing ? 1 - clamp(clearing.t / 0.5) : 1)
      if (f.s > 1.3 && !clearing)
        qixes.forEach((q, i) => {
          // a leader line to a small label, like a callout on a drawing
          const x = q.x * U
          const y = q.y * U
          const lx = x + (q.reff * 0.8 + 6) * U * 0.6
          const ly = y - (q.reff * 0.8 + 6) * U * 0.45
          ctx.strokeStyle = C.ink
          ctx.globalAlpha = 0.45
          ctx.lineWidth = 1 / f.s
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(lx, ly)
          ctx.lineTo(lx + 10, ly)
          ctx.stroke()
          ctx.globalAlpha = 1
          qixLabels.push([lx + 12, ly, i, q.reff])
        })
      for (const s of sparx) drawSparx(s, t)
      if (!dying && !clearing) drawMarker(t)
      sparks.draw(ctx, 1 / f.s, 0.03)
      rings.draw(ctx, 1 / f.s)
      ctx.restore()

      readouts()
      overlayText()

      gameHud(
        ctx,
        f,
        env.mode,
        [
          { label: 'Score', value: fmtScore(state === 'over' ? finalScore : score, 6) },
          { label: 'Level', value: String(state === 'over' ? finalLevel : level).padStart(2, '0') },
          { label: 'Lives', value: state === 'play' && !botParam ? String(lives) : '—' },
        ],
        L.bare
          ? [
              { label: 'Claimed', value: `${(shownPct * 100).toFixed(1)}%` },
              { label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0), 6) },
            ]
          : [{ label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0), 6) }],
      )
      if (L.bare) miniGauge()
      affordances()

      // on wide-short screens, or when the playfield is narrow, the cards use the whole canvas
      const wide = f.side || f.lw * f.s < 320
      const cx = wide ? 0 : f.ox
      const cy = wide ? 0 : f.oy
      const cw = wide ? env.width : f.lw * f.s
      const ch = wide ? env.height : f.lh * f.s
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, {
          kicker: 'After Qix · Taito, 1981',
          title: 'Claim',
          titleEm: 'the field',
          lines: ['Arrows walk the edge · Space draws', 'Hold Z to draw slow for double', 'Touch: drag out into the field'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          kicker: newRecord ? 'New best' : 'Survey closed',
          title: fmtScore(finalScore, 6),
          lines: [`Level ${String(finalLevel).padStart(2, '0')} · ${(finalPct * 100).toFixed(1)}% claimed`, `Best ${fmtScore(hi.get(), 6)}`],
          prompt: 'Press Enter · Tap to play again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
      touch.endFrame()
    },
  }
}

export default create

