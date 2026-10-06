/*
 * FORMATION — after Space Invaders (Taito, 1978).
 *
 * Fifty-five pixel creatures drawn as traced hairline silhouettes with a
 * light diagonal hatch, three species in three accents. The march is the
 * original's ripple: one invader moves per tick, so a full step travels
 * through the formation and the whole thing speeds up as it thins — the
 * four-note descending bass loop plays once per step, so the tempo tracks
 * it. Bunkers are grids of hatched cells that erode where they're hit; a
 * saucer crosses the top lane; shots are zig-zag hairlines; kills are small
 * starbursts of strokes. A bounding box with corner ticks follows the
 * formation like a selection in a drawing tool.
 */

import { C, card, clamp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, rgba, rng, Rings, setFont, Sparks, START_KEYS, text, toField, TAU } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece, PointerInfo } from '../types'

const LW = 480
const LH = 400
/** one sprite pixel, in field units */
const PX = 1.9
const COLS = 11
const ROWS = 5
const COLW = 31
const ROWH = 25
const MARGIN = 12
const GY = 384
const PY = 368
const DROP = 10
const CELL = 3
const BW = 16
const BH = 11
const BY = 300
const BUNKER_X = [96, 192, 288, 384]
const SAUCER_Y = 42
const PSPEED = 168
const SHOT_V = 440
const POINTS = [30, 20, 20, 10, 10]
const MYSTERY = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100]
const MARCH = [110, 98, 87.31, 82.41]

/* ----------------------------------------------------------------- sprites */

const SPR_A = [
  ['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#.#..#.#', '.#....#.'],
  ['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#......#'],
]
const SPR_B = [
  ['..#.....#..', '...#...#...', '..#######..', '.#########.', '##..###..##', '###########', '.#.#...#.#.', '#.#.....#.#'],
  ['..#.....#..', '#..#...#..#', '#.#######.#', '.#########.', '.#..###..#.', '###########', '..#.#.#.#..', '.#.......#.'],
]
const SPR_C = [
  ['....####....', '.##########.', '############', '##..####..##', '############', '..##....##..', '.##..##..##.', '##........##'],
  ['....####....', '.##########.', '############', '##..####..##', '############', '...##..##...', '..##.##.##..', '.##......##.'],
]
const SPR_SAUCER = ['.....######.....', '...##########...', '..############..', '.##.##.##.##.##.', '################', '..###..##..###..', '...#........#...']
const SPR_CANNON = ['......#......', '.....###.....', '.....###.....', '.###########.', '#############', '#############', '#############', '#############']
const SPR_WRECK = [
  ['.....#.......', '..#.......#..', '.......#.....', '..#..##.#.#..', '.#.#######...', '#.#######.#.#', '.##########..', '#############'],
  ['...#.....#...', '#.....#......', '..#.#....#.#.', '....###......', '.#.#####.#...', '..########.#.', '#.#########..', '#############'],
]
const BUNKER_MASK = ['....########....', '...##########...', '..############..', '.##############.', '################', '################', '################', '################', '#####......#####', '####........####', '####........####']

interface Sprite {
  edge: Path2D
  hatch: Path2D
  hw: number
  hh: number
}

/** Trace a pixel grid's silhouette as merged hairline edges, plus an aligned diagonal hatch. */
function buildSprite(rows: string[], px = PX): Sprite {
  const h = rows.length
  const w = rows[0].length
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] === '#'
  const ox = (-w * px) / 2
  const oy = (-h * px) / 2
  const edge = new Path2D()
  for (let y = 0; y <= h; y++) {
    let run = -1
    for (let x = 0; x <= w; x++) {
      const e = x < w && on(x, y - 1) !== on(x, y)
      if (e && run < 0) run = x
      if (!e && run >= 0) {
        edge.moveTo(ox + run * px, oy + y * px)
        edge.lineTo(ox + x * px, oy + y * px)
        run = -1
      }
    }
  }
  for (let x = 0; x <= w; x++) {
    let run = -1
    for (let y = 0; y <= h; y++) {
      const e = y < h && on(x - 1, y) !== on(x, y)
      if (e && run < 0) run = y
      if (!e && run >= 0) {
        edge.moveTo(ox + x * px, oy + run * px)
        edge.lineTo(ox + x * px, oy + y * px)
        run = -1
      }
    }
  }
  const hatch = new Path2D()
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (on(x, y) && (x + y) % 2 === 0) {
        hatch.moveTo(ox + x * px, oy + (y + 1) * px)
        hatch.lineTo(ox + (x + 1) * px, oy + y * px)
      }
  return { edge, hatch, hw: (w * px) / 2, hh: (h * px) / 2 }
}

/* -------------------------------------------------------------------- types */

type State = 'attract' | 'title' | 'play' | 'over'

interface Inv {
  x: number
  y: number
  row: number
  col: number
  frame: number
  alive: boolean
  delay: number
}

interface IShot {
  x: number
  y: number
  vy: number
  kind: number
  /** when the bot notices it */
  seen: number
}

interface Burst {
  x: number
  y: number
  t: number
  dur: number
  r: number
  col: string
}

interface Popup {
  x: number
  y: number
  t: number
  str: string
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 160 : 400)
  const rings = new Rings()
  const r = rng(1978)
  let f = gameFit(env.width, env.height, env.mode, LW, LH)

  const SPR = [SPR_A.map((s) => buildSprite(s)), SPR_B.map((s) => buildSprite(s)), SPR_C.map((s) => buildSprite(s))]
  const speciesOf = (row: number) => (row === 0 ? 0 : row < 3 ? 1 : 2)
  const SPECIES_COL = [C.ocean, C.lagoon, C.moss]
  const saucerSpr = buildSprite(SPR_SAUCER)
  const cannonSpr = buildSprite(SPR_CANNON)
  const wreckSpr = SPR_WRECK.map((s) => buildSprite(s))

  /* ---------------------------------------------------------------- world */

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  const botParam = env.params.get('bot') === '1'

  let score = 0
  let finalScore = 0
  let finalWave = 1
  let lives = 3
  let wave = 1
  let extraGiven = false
  let newRecord = false
  let invaded = false

  const invs: Inv[] = []
  let alive = 0
  let cursor = 0
  let dirX = 1
  let dropping = false
  let tickAcc = 0
  let noteIdx = 0
  let lastNote = -1
  let marchPause = 0
  let introT = 0
  let clearT = -1
  let clock = 0

  let px = LW / 2
  let pAlive = true
  let pDeadT = 0
  let shot: { x: number; y: number } | null = null
  let shotCount = 0
  let ishots: IShot[] = []
  let fireT = 1.2
  let shooterKind = 0

  let saucer: { x: number; dir: number; pts: number } | null = null
  let saucerT = 14
  let saucerTone = 0

  const bunkers = BUNKER_X.map(() => new Uint8Array(BW * BH))
  const bunkerDirty = [true, true, true, true]
  const bunkerPaths: { edge: Path2D; hatch: Path2D }[] = BUNKER_X.map(() => ({ edge: new Path2D(), hatch: new Path2D() }))
  const nicks = new Float32Array(40)
  const nickSorted = new Float32Array(40)
  let nickN = 0

  let bursts: Burst[] = []
  let popups: Popup[] = []
  let shake = 0

  // bot memory
  let botAim = LW / 2
  let botRetarget = 0
  const threatX = new Float32Array(8)
  const threatT = new Float32Array(8)
  let threatN = 0

  // touch: first pointer drags, any quick tap fires
  const touches = new Map<number, { sx: number; sy: number; st: number; px0: number; moved: boolean }>()
  let dragId = -1
  let dragTarget: number | null = null
  let tapFire = false
  let tapStart = false
  // affordances: what the player last used, where the mouse is, and the first-play hints
  let lastInput: 'key' | 'mouse' | 'touch' = 'key'
  let hover: { x: number; y: number } | null = null
  let hintsSeen = false
  let hintAge = 0
  let hintDone = false
  let hintOut = 0
  let movedOnce = false
  let firedOnce = false

  function resetBunkers() {
    for (let b = 0; b < bunkers.length; b++) {
      const g = bunkers[b]
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) g[y * BW + x] = BUNKER_MASK[y][x] === '#' ? 1 : 0
      bunkerDirty[b] = true
    }
  }

  function buildWave() {
    invs.length = 0
    const top = 72 + Math.min(wave - 1, 7) * 10
    const x0 = 60
    // move order: bottom-left first, like the original's update loop
    for (let row = ROWS - 1; row >= 0; row--)
      for (let col = 0; col < COLS; col++) invs.push({ x: x0 + col * COLW, y: top + row * ROWH, row, col, frame: 0, alive: true, delay: invs.length * 0.016 })
    alive = invs.length
    cursor = 0
    dirX = 1
    dropping = false
    tickAcc = 0
    introT = 0
    clearT = -1
    ishots = []
    shot = null
    fireT = 1.6
    saucer = null
    saucerT = 12 + r() * 8
  }

  function newGame() {
    score = 0
    lives = 3
    wave = 1
    extraGiven = false
    invaded = false
    shotCount = 0
    px = LW / 2
    pAlive = true
    pDeadT = 0
    nickN = 0
    bursts = []
    popups = []
    sparks.clear()
    rings.clear()
    resetBunkers()
    buildWave()
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
      movedOnce = firedOnce = false
    }
    if (next === 'over') {
      finalScore = score
      finalWave = wave
      newRecord = hi.submit(score)
    }
  }

  /* ------------------------------------------------------------- helpers */

  const hwOf = (v: Inv) => SPR[speciesOf(v.row)][0].hw
  const passTime = () => Math.max(alive, 1) * tickInterval()
  function tickInterval() {
    const rate = 66 + Math.min(wave - 1, 6) * 5
    return Math.max(1 / rate, 1 / 30 / Math.max(alive, 1))
  }
  const stepDx = () => (alive === 1 ? 6 : 5)

  function bunkerCellAt(x: number, y: number): [number, number] | null {
    if (y < BY || y >= BY + BH * CELL) return null
    for (let b = 0; b < BUNKER_X.length; b++) {
      const bx = BUNKER_X[b] - (BW * CELL) / 2
      if (x >= bx && x < bx + BW * CELL) {
        const i = Math.floor((x - bx) / CELL)
        const j = Math.floor((y - BY) / CELL)
        return bunkers[b][j * BW + i] ? [b, j * BW + i] : null
      }
    }
    return null
  }

  /** Knock a ragged hole into a bunker around (x, y). */
  function erode(b: number, x: number, y: number, down: boolean) {
    const g = bunkers[b]
    const bx = BUNKER_X[b] - (BW * CELL) / 2
    const ci = Math.floor((x - bx) / CELL)
    const cj = Math.floor((y - BY) / CELL)
    for (let dj = -2; dj <= 2; dj++)
      for (let di = -2; di <= 2; di++) {
        const i = ci + di
        const j = cj + (down ? dj + 1 : dj - 1)
        if (i < 0 || j < 0 || i >= BW || j >= BH) continue
        const d = Math.hypot(di, dj * 0.8)
        if (d < 1.2 || (d < 2.5 && r() < 0.55)) g[j * BW + i] = 0
      }
    bunkerDirty[b] = true
    sparks.emit(x, y, preview ? 3 : 6, { color: C.ink2, speed: 70, life: 0.35, dir: down ? -Math.PI / 2 : Math.PI / 2, spread: 2.2, r })
  }

  /** True if bunker cells lie in column x between y0 and the cannon. */
  function shielded(x: number, y0: number) {
    for (let y = Math.max(y0, BY); y < BY + BH * CELL; y += CELL) if (bunkerCellAt(x, y)) return true
    return false
  }

  function burst(x: number, y: number, col: string, rad = 10, dur = 0.32) {
    bursts.push({ x, y, t: 0, dur, r: rad, col })
  }

  function addScore(n: number) {
    score += n
    if (!extraGiven && score >= 1500) {
      extraGiven = true
      lives++
      env.sfx.tone(784, 0.12, { type: 'triangle', gain: 0.06 })
      env.sfx.tone(1175, 0.2, { type: 'triangle', gain: 0.05, when: 0.1 })
    }
  }

  function killInvader(v: Inv) {
    v.alive = false
    alive--
    if (state === 'play' && !hintDone) {
      hintDone = true
      hintsSeen = true
    }
    const sp = speciesOf(v.row)
    addScore(POINTS[v.row])
    burst(v.x, v.y, SPECIES_COL[sp], 11)
    sparks.emit(v.x, v.y, preview ? 5 : 10, { color: SPECIES_COL[sp], speed: 120, life: 0.4, r })
    marchPause = 0.09
    env.sfx.noise(0.12, { filter: 2400, to: 700, gain: 0.05, q: 1.2 })
    env.sfx.tone([784, 659, 523][sp], 0.09, { type: 'triangle', gain: 0.05, to: [784, 659, 523][sp] * 0.7 })
    if (alive === 0) {
      clearT = 0
      ishots = []
    }
  }

  function killPlayer() {
    pAlive = false
    pDeadT = 0
    shot = null
    ishots = []
    shake = 1
    burst(px, PY, C.ink, 22, 0.6)
    rings.add(px, PY, 34, 0.7, C.ink)
    sparks.emit(px, PY, preview ? 14 : 28, { color: C.ink, speed: 160, life: 0.8, dir: -Math.PI / 2, spread: 2.6, r })
    env.sfx.noise(0.6, { filter: 500, to: 110, gain: 0.2 })
    env.sfx.tone(330, 0.7, { type: 'sine', gain: 0.07, to: 98 })
  }

  function playMarch() {
    if (clock - lastNote < 0.085) return
    lastNote = clock
    const fq = MARCH[noteIdx % 4]
    noteIdx++
    env.sfx.tone(fq * 2, 0.12, { type: 'triangle', gain: 0.16, filter: 900, to: fq * 1.86, room: 0.06 })
    env.sfx.tone(fq, 0.14, { type: 'sine', gain: 0.12, room: 0 })
  }

  /* --------------------------------------------------------------- march */

  function endPass() {
    cursor = 0
    playMarch()
    if (dropping) {
      dropping = false
      return
    }
    let minX = Infinity
    let maxX = -Infinity
    for (const v of invs)
      if (v.alive) {
        const hw = hwOf(v)
        minX = Math.min(minX, v.x - hw)
        maxX = Math.max(maxX, v.x + hw)
      }
    const dx = stepDx()
    if ((dirX > 0 && maxX + dx > LW - MARGIN) || (dirX < 0 && minX - dx < MARGIN)) {
      dropping = true
      dirX = -dirX
    }
  }

  function marchTick() {
    while (cursor < invs.length && !invs[cursor].alive) cursor++
    if (cursor >= invs.length) {
      endPass()
      while (cursor < invs.length && !invs[cursor].alive) cursor++
      if (cursor >= invs.length) return
    }
    const v = invs[cursor++]
    if (dropping) v.y += DROP
    else v.x += dirX * stepDx()
    v.frame ^= 1
    const sp = SPR[speciesOf(v.row)][0]
    // invaders chew through bunkers they overlap
    if (v.y + sp.hh > BY)
      for (let yy = v.y - sp.hh; yy < v.y + sp.hh; yy += CELL)
        for (let xx = v.x - sp.hw; xx < v.x + sp.hw; xx += CELL) {
          const c = bunkerCellAt(xx, yy)
          if (c) {
            bunkers[c[0]][c[1]] = 0
            bunkerDirty[c[0]] = true
          }
        }
    if (v.y + sp.hh >= PY - 7) invaded = true
  }

  /* ------------------------------------------------------------------ bot */

  function botThink(dt: number): { x: number; fire: boolean } {
    botRetarget -= dt
    const vx = dropping ? 0 : (dirX * stepDx()) / Math.max(passTime(), 1e-3)
    let minX = Infinity
    let maxX = -Infinity
    for (const v of invs)
      if (v.alive) {
        minX = Math.min(minX, v.x - hwOf(v))
        maxX = Math.max(maxX, v.x + hwOf(v))
      }
    // where an invader will be when a shot fired now reaches it (bouncing off the margins)
    const predict = (v: Inv) => {
      const T = (PY - 10 - v.y) / SHOT_V
      const lo = MARGIN + (v.x - minX)
      const hi2 = LW - MARGIN - (maxX - v.x)
      let x = v.x + vx * T
      if (x > hi2) x = hi2 - (x - hi2)
      if (x < lo) x = lo + (lo - x)
      return x
    }
    // choose a target: the lowest invaders first, nearer ones break ties
    let best: Inv | null = null
    let bestS = -Infinity
    for (const v of invs) {
      if (!v.alive) continue
      const s = v.y * 1.6 - Math.abs(v.x - px) * 0.35 - (shielded(v.x, v.y) ? 40 : 0)
      if (s > bestS) {
        bestS = s
        best = v
      }
    }
    let aim = botAim
    if (best) aim = predict(best)
    let saucerX = -1
    if (saucer && best && best.y < 250) {
      const T = (PY - SAUCER_Y) / SHOT_V
      const sx = saucer.x + saucer.dir * 60 * T
      if (sx > 20 && sx < LW - 20 && Math.abs(sx - px) < 110) aim = saucerX = sx
    }
    if (botRetarget <= 0 || Math.abs(aim - botAim) > 2) {
      botAim = aim + Math.sin(clock * 2.3) * 1.2
      botRetarget = 0.2
    }
    // fire whenever something will be over the cannon when the shot gets there
    let aligned = saucerX >= 0 && Math.abs(saucerX - px) < saucerSpr.hw * 0.6
    if (!aligned)
      for (const v of invs)
        if (v.alive && Math.abs(predict(v) - px) < hwOf(v) * 0.7) {
          aligned = true
          break
        }
    // the shots that matter: noticed, not yet past the cannon, not stopped by a bunker
    threatN = 0
    for (const s of ishots) {
      if (clock < s.seen || s.y - 6 > PY + 8) continue
      const tA = Math.max(0, (PY - 10 - s.y) / s.vy)
      if (tA > 1.5 || shielded(s.x, s.y)) continue
      threatX[threatN] = s.x
      threatT[threatN++] = tA
    }
    // threat map over candidate positions
    let bestX = px
    let bestC = Infinity
    for (let c = px - 90; c <= px + 90; c += 5) {
      if (c < 16 || c > LW - 16) continue
      let cost = Math.abs(c - botAim) * 0.9
      for (let k = 0; k < threatN; k++) {
        const sx = threatX[k]
        const tA = threatT[k]
        if (Math.abs(c - sx) < 16) cost += 900 * (1.6 - tA)
        const lo = Math.min(px, c) - 12
        const hi2 = Math.max(px, c) + 12
        if (sx > lo && sx < hi2) {
          const tX = Math.abs(sx - px) / PSPEED
          if (Math.abs(tX - tA) < 0.28) cost += 350
        }
      }
      if (cost < bestC) {
        bestC = cost
        bestX = c
      }
    }
    const fire = !shot && aligned && !shielded(px, BY - 1)
    return { x: bestX, fire }
  }

  /* --------------------------------------------------------------- update */

  function update(dt: number, bot: boolean, input: boolean) {
    clock += dt
    shake = Math.max(0, shake - dt * 3)
    for (const b of bursts) b.t += dt
    bursts = bursts.filter((b) => b.t < b.dur)
    for (const p of popups) p.t += dt
    popups = popups.filter((p) => p.t < 1.2)

    // wave intro: the formation pops in, invader by invader
    if (introT < 1.4) introT += dt
    const intro = introT < 1.0
    // wave clear
    if (clearT >= 0) {
      clearT += dt
      if (clearT > 1.6) {
        wave++
        resetBunkers()
        buildWave()
        env.sfx.tone(523, 0.1, { type: 'triangle', gain: 0.06 })
        env.sfx.tone(659, 0.1, { type: 'triangle', gain: 0.06, when: 0.09 })
        env.sfx.tone(784, 0.18, { type: 'triangle', gain: 0.06, when: 0.18 })
      }
    }

    // player
    if (pAlive) {
      let dir = 0
      let fire = false
      if (bot) {
        const b = botThink(dt)
        const d = b.x - px
        dir = Math.abs(d) < 1.5 ? d / 1.5 : Math.sign(d)
        fire = b.fire
      } else if (input) {
        if (keys.down('ArrowLeft', 'KeyA')) dir -= 1
        if (keys.down('ArrowRight', 'KeyD')) dir += 1
        fire = keys.hit('Space', 'KeyZ', 'KeyX', 'ArrowUp', 'KeyW') || tapFire
        if (dragTarget !== null && dir === 0) {
          const d = dragTarget - px
          px += clamp(d, -420 * dt, 420 * dt)
        }
      }
      px = clamp(px + dir * PSPEED * dt, 18, LW - 18)
      if (dir || dragTarget !== null) movedOnce = true
      if (fire && !shot && clearT < 0 && !intro) {
        firedOnce = true
        shot = { x: px, y: PY - 10 }
        shotCount++
        env.sfx.tone(1046, 0.07, { type: 'triangle', gain: 0.04, to: 1568 })
      }
    } else {
      pDeadT += dt
      if (pDeadT > 1.8) {
        if (lives > 1) {
          lives--
          pAlive = true
          px = 40
        } else if (state === 'play' && !bot) {
          lives = 0
          go('over')
          return
        } else if (bot) {
          // attract / demo: begin again quietly
          if (state === 'play') {
            lives = 0
            go('over')
            return
          }
          newGame()
          return
        }
      }
    }

    // invasion
    if (invaded) {
      if (pAlive) killPlayer()
      lives = 1
      invaded = false
    }

    // march (frozen while the cannon is down)
    if (pAlive && clearT < 0 && !intro) {
      if (marchPause > 0) marchPause -= dt
      else {
        tickAcc += dt
        let n = 0
        while (tickAcc >= tickInterval() && n++ < 60 && alive > 0) {
          tickAcc -= tickInterval()
          marchTick()
        }
      }
    }

    // player shot
    if (shot) {
      const steps = Math.ceil((SHOT_V * dt) / 3)
      for (let k = 0; k < steps && shot; k++) {
        shot.y -= (SHOT_V * dt) / steps
        const sx = shot.x
        const sy = shot.y
        if (sy < 22) {
          burst(sx, 24, C.ink2, 6, 0.22)
          shot = null
          break
        }
        // saucer
        if (saucer && Math.abs(sx - saucer.x) < saucerSpr.hw + 2 && Math.abs(sy - SAUCER_Y) < saucerSpr.hh + 2) {
          const pts = MYSTERY[shotCount % MYSTERY.length]
          addScore(pts)
          popups.push({ x: saucer.x, y: SAUCER_Y, t: 0, str: String(pts) })
          burst(saucer.x, SAUCER_Y, C.fern, 18, 0.5)
          rings.add(saucer.x, SAUCER_Y, 30, 0.6, C.fern)
          sparks.emit(saucer.x, SAUCER_Y, preview ? 8 : 18, { color: C.fern, speed: 150, life: 0.6, r })
          ;[523, 659, 784, 1046].forEach((fq, i) => env.sfx.tone(fq, 0.12, { type: 'triangle', gain: 0.06, when: i * 0.07 }))
          saucer = null
          shot = null
          break
        }
        // invaders
        let hit: Inv | null = null
        for (const v of invs) {
          if (!v.alive) continue
          const sp = SPR[speciesOf(v.row)][0]
          if (Math.abs(sx - v.x) < sp.hw + 1.2 && Math.abs(sy - v.y) < sp.hh + 1.5) {
            hit = v
            break
          }
        }
        if (hit) {
          killInvader(hit)
          shot = null
          break
        }
        // invader shots
        const si = ishots.findIndex((s) => Math.abs(s.x - sx) < 3.5 && Math.abs(s.y - sy) < 7)
        if (si >= 0) {
          burst(sx, sy, C.ink2, 7, 0.25)
          ishots.splice(si, 1)
          shot = null
          break
        }
        // bunkers
        const c = bunkerCellAt(sx, sy)
        if (c) {
          erode(c[0], sx, sy, false)
          shot = null
          break
        }
      }
    }

    // invader fire
    if (pAlive && clearT < 0 && alive > 0 && !intro) {
      fireT -= dt
      const maxShots = Math.min(3 + Math.floor((wave - 1) / 2), 5)
      if (fireT <= 0 && ishots.length < maxShots) {
        const prog = clamp((wave - 1) / 6 + (1 - alive / 55) * 0.4)
        fireT = lerp(1.0, 0.42, prog) * (0.7 + r() * 0.6)
        // lowest invader per column
        const lows: Inv[] = []
        for (const v of invs) if (v.alive && (!lows[v.col] || v.y > lows[v.col].y)) lows[v.col] = v
        const cands = lows.filter(Boolean)
        let shooter: Inv | undefined
        if (shooterKind === 0) shooter = cands.reduce<Inv | undefined>((b, v) => (!b || Math.abs(v.x - px) < Math.abs(b.x - px) ? v : b), undefined)
        else shooter = cands[Math.floor(r() * cands.length)]
        if (shooter) {
          const sp = SPR[speciesOf(shooter.row)][0]
          ishots.push({ x: shooter.x, y: shooter.y + sp.hh + 2, vy: 140 + Math.min(wave - 1, 6) * 9 + (alive < 9 ? 30 : 0), kind: shooterKind, seen: clock + (r() < 0.06 ? 1e9 : r() * 0.45) })
        }
        shooterKind = (shooterKind + 1) % 3
      }
    }
    for (let i = ishots.length - 1; i >= 0; i--) {
      const s = ishots[i]
      const steps = Math.ceil((s.vy * dt) / 3)
      let dead = false
      for (let k = 0; k < steps; k++) {
        s.y += (s.vy * dt) / steps
        const c = bunkerCellAt(s.x, s.y + 5)
        if (c) {
          erode(c[0], s.x, s.y + 5, true)
          dead = true
          break
        }
        if (pAlive && Math.abs(s.x - px) < 9 && s.y + 5 > PY - 5 && s.y - 5 < PY + 6) {
          killPlayer()
          dead = true
          break
        }
        if (s.y + 5 >= GY) {
          burst(s.x, GY, C.ink2, 6, 0.25)
          nicks[nickN % nicks.length] = s.x
          nickN++
          dead = true
          break
        }
      }
      if (dead && ishots[i] === s) ishots.splice(i, 1)
    }

    // saucer
    if (saucer) {
      saucer.x += saucer.dir * 60 * dt
      saucerTone -= dt
      if (saucerTone <= 0) {
        saucerTone = 0.16
        const up = Math.floor(clock / 0.16) % 2 === 0
        env.sfx.tone(up ? 392 : 330, 0.15, { type: 'sine', gain: 0.03, to: up ? 330 : 392, room: 0.2 })
      }
      if (saucer.x < -24 || saucer.x > LW + 24) saucer = null
    } else if (pAlive && clearT < 0 && alive >= 8 && !intro) {
      saucerT -= dt
      if (saucerT <= 0) {
        const dir = shotCount % 2 === 0 ? 1 : -1
        saucer = { x: dir > 0 ? -20 : LW + 20, dir, pts: 0 }
        saucerT = 20 + r() * 8
      }
    }
  }

  /* ----------------------------------------------------------------- draw */

  function rebuildBunker(b: number) {
    const g = bunkers[b]
    const bx = BUNKER_X[b] - (BW * CELL) / 2
    const on = (i: number, j: number) => i >= 0 && j >= 0 && i < BW && j < BH && g[j * BW + i] === 1
    const edge = new Path2D()
    const hatch = new Path2D()
    for (let j = 0; j < BH; j++)
      for (let i = 0; i < BW; i++) {
        if (!on(i, j)) continue
        const x = bx + i * CELL
        const y = BY + j * CELL
        if (!on(i, j - 1)) {
          edge.moveTo(x, y)
          edge.lineTo(x + CELL, y)
        }
        if (!on(i, j + 1)) {
          edge.moveTo(x, y + CELL)
          edge.lineTo(x + CELL, y + CELL)
        }
        if (!on(i - 1, j)) {
          edge.moveTo(x, y)
          edge.lineTo(x, y + CELL)
        }
        if (!on(i + 1, j)) {
          edge.moveTo(x + CELL, y)
          edge.lineTo(x + CELL, y + CELL)
        }
        if ((i + j) % 2 === 0) {
          hatch.moveTo(x, y + CELL)
          hatch.lineTo(x + CELL, y)
        }
      }
    bunkerPaths[b] = { edge, hatch }
    bunkerDirty[b] = false
  }

  function drawSprite(s: Sprite, x: number, y: number, col: string, hw: number, scale = 1, hatchA = 0.5) {
    ctx.save()
    ctx.translate(x, y)
    if (scale !== 1) ctx.scale(scale, scale)
    ctx.lineWidth = hw / scale
    ctx.strokeStyle = col
    ctx.globalAlpha = hatchA
    ctx.stroke(s.hatch)
    ctx.globalAlpha = 1
    ctx.stroke(s.edge)
    ctx.restore()
  }

  /** Text at a field position, set in CSS px so it stays legible on small screens. */
  function ftext(str: string, fx: number, fy: number, o: TextOpts, min = 9) {
    ctx.save()
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
    text(ctx, str, f.ox + fx * f.s, f.oy + fy * f.s, { ...o, size: Math.max(min, (o.size ?? 6) * f.s) })
    ctx.restore()
  }

  function drawWorld(hw: number, t: number) {
    // fine annotations only where they can be read
    const tiny = preview || f.s < 1.1
    // ground line with nicks, and a faint ruler
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw
    const nn = Math.min(nickN, nicks.length)
    nickSorted.set(nicks.subarray(0, nn))
    const sorted = nickSorted.subarray(0, nn).sort()
    ctx.beginPath()
    let gx = 8
    for (const n of sorted) {
      if (n - 2 > gx) {
        ctx.moveTo(gx, GY)
        ctx.lineTo(n - 2, GY)
      }
      gx = Math.max(gx, n + 2)
    }
    ctx.moveTo(gx, GY)
    ctx.lineTo(LW - 8, GY)
    ctx.stroke()
    ctx.strokeStyle = C.rule
    ctx.beginPath()
    for (let x = 16; x <= LW - 16; x += 16) {
      const l = (x - 16) % 80 === 0 ? 5 : 2.5
      ctx.moveTo(x, GY + 3)
      ctx.lineTo(x, GY + 3 + l)
    }
    ctx.stroke()
    if (!tiny) {
      text(ctx, 'GROUND  Y 384', 16, GY + 14, { size: 5.5, color: C.muted, tracking: 0.14 })
      text(ctx, `X ${String(Math.round(px)).padStart(3, '0')}`, LW - 16, GY + 14, { size: 5.5, color: C.muted, tracking: 0.14, align: 'right' })
    }

    // altitude gauge on the left margin: where the formation's lowest row is
    ctx.strokeStyle = C.rule
    ctx.lineWidth = hw
    ctx.beginPath()
    for (let y = 56; y <= GY - 8; y += 8) {
      const l = (y - 56) % 40 === 0 ? 4 : 2
      ctx.moveTo(2, y)
      ctx.lineTo(2 + l, y)
    }
    ctx.stroke()
    if (alive > 0 && introT > 0.9) {
      let low = 0
      for (const v of invs) if (v.alive) low = Math.max(low, v.y + SPR[speciesOf(v.row)][0].hh)
      const danger = clamp((low - 250) / 100)
      ctx.strokeStyle = danger > 0.5 ? C.ocean : C.ink2
      ctx.beginPath()
      ctx.moveTo(8, low)
      ctx.lineTo(12, low - 2.5)
      ctx.lineTo(12, low + 2.5)
      ctx.closePath()
      ctx.moveTo(2, low)
      ctx.lineTo(8, low)
      ctx.stroke()
    }

    // bunkers
    for (let b = 0; b < bunkers.length; b++) {
      if (bunkerDirty[b]) rebuildBunker(b)
      ctx.strokeStyle = C.ink2
      ctx.lineWidth = hw
      ctx.globalAlpha = 0.55
      ctx.stroke(bunkerPaths[b].hatch)
      ctx.globalAlpha = 0.9
      ctx.stroke(bunkerPaths[b].edge)
      ctx.globalAlpha = 1
    }

    // formation bounding box — a selection with corner ticks
    if (alive > 0 && introT > 0.9) {
      let x0 = Infinity
      let y0 = Infinity
      let x1 = -Infinity
      let y1 = -Infinity
      for (const v of invs)
        if (v.alive) {
          const sp = SPR[speciesOf(v.row)][0]
          x0 = Math.min(x0, v.x - sp.hw)
          x1 = Math.max(x1, v.x + sp.hw)
          y0 = Math.min(y0, v.y - sp.hh)
          y1 = Math.max(y1, v.y + sp.hh)
        }
      x0 -= 5
      y0 -= 5
      x1 += 5
      y1 += 5
      const k = Math.min(6, (x1 - x0) / 3)
      const a = clamp((introT - 0.9) / 0.4)
      ctx.globalAlpha = a
      ctx.strokeStyle = C.muted
      ctx.lineWidth = hw
      ctx.beginPath()
      ctx.moveTo(x0, y0 + k)
      ctx.lineTo(x0, y0)
      ctx.lineTo(x0 + k, y0)
      ctx.moveTo(x1 - k, y0)
      ctx.lineTo(x1, y0)
      ctx.lineTo(x1, y0 + k)
      ctx.moveTo(x1, y1 - k)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x1 - k, y1)
      ctx.moveTo(x0 + k, y1)
      ctx.lineTo(x0, y1)
      ctx.lineTo(x0, y1 - k)
      ctx.stroke()
      ctx.strokeStyle = C.rule
      ctx.setLineDash([2, 3])
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
      ctx.setLineDash([])
      if (!tiny) {
        text(ctx, `N ${String(alive).padStart(2, '0')}`, x0, y0 - 4, { size: 5.5, color: C.muted, tracking: 0.14 })
        const hz = 1 / Math.max(passTime(), 1e-3)
        text(ctx, `${hz.toFixed(2)} STEP/S`, x1, y0 - 4, { size: 5.5, color: C.muted, tracking: 0.14, align: 'right' })
      }
      ctx.globalAlpha = 1
    }

    // invaders
    for (let i = 0; i < invs.length; i++) {
      const v = invs[i]
      if (!v.alive) continue
      const sp = speciesOf(v.row)
      const k = clamp((introT - v.delay) / 0.2)
      if (k <= 0) continue
      const s = k < 1 ? ease.outBack(k) : 1
      drawSprite(SPR[sp][v.frame], v.x, v.y, SPECIES_COL[sp], hw, s, 0.45)
    }

    // saucer
    if (saucer) {
      drawSprite(saucerSpr, saucer.x, SAUCER_Y, C.fern, hw, 1, 0.5)
      // a little dimension under its path
      ctx.strokeStyle = rgba(C.fern, 0.35)
      ctx.lineWidth = hw
      ctx.beginPath()
      ctx.moveTo(saucer.x - saucerSpr.hw, SAUCER_Y + 9)
      ctx.lineTo(saucer.x + saucerSpr.hw, SAUCER_Y + 9)
      ctx.moveTo(saucer.x - saucerSpr.hw, SAUCER_Y + 7)
      ctx.lineTo(saucer.x - saucerSpr.hw, SAUCER_Y + 11)
      ctx.moveTo(saucer.x + saucerSpr.hw, SAUCER_Y + 7)
      ctx.lineTo(saucer.x + saucerSpr.hw, SAUCER_Y + 11)
      ctx.stroke()
      if (!tiny) text(ctx, '? PTS', saucer.x, SAUCER_Y + 17, { size: 5, color: C.fern, align: 'center', tracking: 0.14 })
    }

    // invader shots: zig-zags, a plunger, a twisted pair
    ctx.lineWidth = hw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of ishots) {
      const ph = Math.floor(clock * 18 + s.x) % 2 === 0 ? 1 : -1
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      if (s.kind === 1) {
        ctx.moveTo(s.x, s.y - 5)
        ctx.lineTo(s.x, s.y + 5)
        const cy = s.y - 4 + (Math.floor(clock * 14) % 4) * 2.6
        ctx.moveTo(s.x - 2.2, cy)
        ctx.lineTo(s.x + 2.2, cy)
      } else {
        for (let k = 0; k <= 5; k++) {
          const yy = s.y - 5 + k * 2
          const xx = s.x + (k % 2 === 0 ? -1.6 : 1.6) * ph
          if (k === 0) ctx.moveTo(xx, yy)
          else ctx.lineTo(xx, yy)
        }
        if (s.kind === 2) {
          for (let k = 0; k <= 5; k++) {
            const yy = s.y - 5 + k * 2
            const xx = s.x - (k % 2 === 0 ? -1.6 : 1.6) * ph
            if (k === 0) ctx.moveTo(xx, yy)
            else ctx.lineTo(xx, yy)
          }
        }
      }
      ctx.stroke()
    }

    // player shot + a faint construction line above the cannon
    if (pAlive && !preview) {
      ctx.strokeStyle = C.rule
      ctx.setLineDash([1.5, 4])
      ctx.beginPath()
      ctx.moveTo(px, PY - 12)
      ctx.lineTo(px, PY - 70)
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (shot) {
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hw * 1.4
      ctx.beginPath()
      ctx.moveTo(shot.x, shot.y - 4)
      ctx.lineTo(shot.x, shot.y + 4)
      ctx.stroke()
      ctx.lineWidth = hw
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.moveTo(shot.x, shot.y + 6)
      ctx.lineTo(shot.x, shot.y + 16)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'

    // cannon
    if (pAlive) {
      drawSprite(cannonSpr, px, PY, C.ink, hw, 1, 0.55)
      // drag handles: chevrons either side when a mouse is over the field, or while dragging
      if (state === 'play' && (dragId >= 0 || (hover && lastInput === 'mouse'))) {
        const k = dragId >= 0 ? 1 : 0.6
        ctx.strokeStyle = rgba(C.ink, k)
        ctx.lineWidth = hw
        ctx.beginPath()
        for (const sgn of [-1, 1]) {
          const x0 = px + sgn * 17
          ctx.moveTo(x0, PY - 3.5)
          ctx.lineTo(x0 + sgn * 3, PY)
          ctx.lineTo(x0, PY + 3.5)
          ctx.moveTo(x0 + sgn * 3.5, PY - 3.5)
          ctx.lineTo(x0 + sgn * 6.5, PY)
          ctx.lineTo(x0 + sgn * 3.5, PY + 3.5)
        }
        ctx.stroke()
      }
    } else if (pDeadT < 1.3) {
      const w = wreckSpr[Math.floor(pDeadT * 12) % 2]
      ctx.globalAlpha = 1 - clamp((pDeadT - 0.9) / 0.4)
      drawSprite(w, px, PY, C.ink, hw, 1, 0.5)
      ctx.globalAlpha = 1
    }

    // starbursts
    ctx.lineCap = 'round'
    for (const b of bursts) {
      const k = b.t / b.dur
      const e = ease.outCubic(k)
      ctx.strokeStyle = b.col
      ctx.globalAlpha = 1 - k
      ctx.lineWidth = hw * 1.2
      ctx.beginPath()
      const n = 10
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + (i % 2) * 0.12
        const r0 = b.r * (0.2 + 0.55 * e)
        const r1 = b.r * (0.45 + 0.75 * e) * (i % 2 ? 0.7 : 1)
        ctx.moveTo(b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0)
        ctx.lineTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.lineCap = 'butt'
    sparks.draw(ctx, hw)
    rings.draw(ctx, hw)

    for (const p of popups) {
      const a = 1 - clamp((p.t - 0.8) / 0.4)
      ftext(p.str, p.x, p.y - p.t * 10, { size: 9, color: C.fern, align: 'center', baseline: 'middle', alpha: a, weight: 500 }, 10)
    }

    // wave banner
    if (introT < 1.2 && t > 0.05) {
      const a = Math.sin(clamp(introT / 1.2) * Math.PI)
      ftext(`WAVE ${String(wave).padStart(2, '0')}`, LW / 2, 230, { size: 8, color: C.ink2, align: 'center', tracking: 0.3, alpha: a })
    }
    if (clearT >= 0) {
      const a = Math.sin(clamp(clearT / 1.6) * Math.PI)
      ftext('FORMATION CLEARED', LW / 2, 200, { size: 8, color: C.moss, align: 'center', tracking: 0.3, alpha: a })
    }
  }

  /* ---------------------------------------------------------------- hints */

  /** A small boxed mono label (a callout), centred at a screen point, kept inside the field. */
  function tag(str: string, sx: number, sy: number, a: number, col: string = C.ink2, align: 'center' | 'beside' = 'center', gap = 0) {
    if (a <= 0.01) return
    const size = Math.max(9, 6 * f.s)
    setFont(ctx, { size, tracking: 0.16 })
    const w = ctx.measureText(str).width + size * 1.6
    const h = size * 2
    // 'beside': to the right of sx (or the left, if that would leave the field)
    const right = f.ox + f.lw * f.s - 4
    let x0 = sx - w / 2
    if (align === 'beside') x0 = sx + gap + w <= right ? sx + gap : sx - 2 * gap - w
    const x = clamp(x0, f.ox + 4, right - w)
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
   * First-play hints, in screen space: a ghost of the drag (a dotted track with
   * a sliding dot and a ghost cannon) and a fire cue. Each fades once it has
   * been done; all of them go after the first kill.
   */
  function drawHints(dt: number) {
    if (state !== 'play' || !pAlive) return
    hintAge += dt
    if (hintDone) hintOut = Math.min(1, hintOut + dt * 1.5)
    const base = clamp(hintAge / 0.5) * (1 - hintOut) * (introT > 0.9 ? 1 : 0)
    if (base <= 0) return
    const cx = f.ox + px * f.s
    const cy = f.oy + PY * f.s
    const moveA = base * (movedOnce ? clamp(1.6 - hintAge * 0.25) : 1)
    const fireA = base * (firedOnce ? 0 : 1)
    const sw = Math.sin(hintAge * 2.2)
    const span = 58 * f.s
    if (moveA > 0.01) {
      // the ghost: a dotted track through the cannon, a dot and a faint cannon sliding along it
      ctx.save()
      ctx.globalAlpha = moveA * 0.75
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
      ctx.restore()
      enterFit(ctx, f)
      ctx.globalAlpha = moveA * 0.25
      drawSprite(cannonSpr, px + sw * 46, PY, C.moss, 1 / f.s, 1, 0)
      ctx.globalAlpha = 1
      ctx.restore()
      // beside the track's right arrow, or its left one near the edge
      tag(lastInput === 'key' ? '← →  MOVE' : 'DRAG TO MOVE', cx + span, cy, moveA, C.ink2, 'beside', 8)
    }
    if (fireA > 0.01) {
      // a dotted line up from the barrel, with a tick climbing it
      ctx.save()
      ctx.globalAlpha = fireA * 0.7
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      const top = cy - 70 * f.s - 20
      ctx.beginPath()
      ctx.moveTo(cx, cy - 10 * f.s)
      ctx.lineTo(cx, top)
      ctx.stroke()
      ctx.setLineDash([])
      const k = (hintAge * 0.9) % 1
      const ty = lerp(cy - 10 * f.s, top, ease.outCubic(k))
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, ty)
      ctx.lineTo(cx, ty + 6)
      ctx.stroke()
      ctx.restore()
      tag(lastInput === 'touch' ? 'TAP OR FIRE' : lastInput === 'mouse' ? 'CLICK TO FIRE' : 'FIRE · SPACE', cx, top - 12, fireA, C.moss)
    }
  }

  /* ---------------------------------------------------------------- input */

  function onPointer(p: PointerInfo) {
    if (preview) return
    const fp = toField(f, p.x, p.y)
    const isTouch = p.pointerType === 'touch' || p.pointerType === 'pen'
    if (p.type === 'down' || p.type === 'move') lastInput = isTouch ? 'touch' : 'mouse'
    hover = p.type === 'leave' || (isTouch && p.type === 'up') ? null : fp
    if (p.type === 'down') {
      touches.set(p.id, { sx: p.x, sy: p.y, st: clock, px0: px, moved: false })
      if (dragId < 0) dragId = p.id
    } else if (p.type === 'move') {
      const tt = touches.get(p.id)
      if (!tt) return
      if (Math.hypot(p.x - tt.sx, p.y - tt.sy) > (isTouch ? 16 : 8)) tt.moved = true
      if (p.id === dragId && tt.moved) dragTarget = clamp(tt.px0 + (fp.x - toField(f, tt.sx, tt.sy).x) * 1.15, 18, LW - 18)
    } else {
      const tt = touches.get(p.id)
      if (tt && !tt.moved && clock - tt.st < (isTouch ? 0.45 : 0.35)) {
        tapFire = true
        tapStart = true
      }
      touches.delete(p.id)
      if (p.id === dragId) {
        dragId = -1
        dragTarget = null
      }
    }
  }

  if (env.params.get('state') === 'play') go('play')
  else if (env.params.get('state') === 'over') {
    newGame()
    state = 'over'
    stateT = 1
  } else newGame()

  return {
    resize(w, h) {
      f = gameFit(w, h, env.mode, LW, LH)
    },
    key(code, down) {
      if (down) lastInput = 'key'
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'KeyZ', 'KeyX', ...START_KEYS])
    },
    pointer: onPointer,
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || tapStart
      let fresh = false
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        fresh = true
      }
      if (dt > 0) {
        if (state === 'play') update(dt, botParam, !fresh)
        else update(dt, true, false)
      }
      sparks.update(dt, 60, 2.5)
      rings.update(dt)

      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: 'FIG. G.04 — AFTER SPACE INVADERS, 1978' })
      enterFit(ctx, f)
      if (shake > 0) {
        const s = shake * shake * 2.2
        ctx.translate(Math.sin(clock * 91) * s, Math.cos(clock * 77) * s)
      }
      drawWorld(1 / f.s, t)
      ctx.restore()
      if (!preview) {
        drawHints(dt)
        const inField = hover && hover.x >= 0 && hover.x <= LW && hover.y >= 0 && hover.y <= LH
        env.setCursor(state !== 'play' ? 'pointer' : dragId >= 0 ? 'grabbing' : inField ? 'grab' : 'default')
      }

      const showScore = state === 'over' ? finalScore : score
      gameHud(
        ctx,
        f,
        env.mode,
        [
          { label: 'Score', value: fmtScore(showScore, 5) },
          { label: 'Lives', value: String(Math.max(0, lives)) },
          { label: 'Wave', value: String(state === 'over' ? finalWave : wave).padStart(2, '0') },
        ],
        [{ label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0), 5) }],
      )

      // on wide, short screens the card may spill into the side margins
      const cx = f.side ? 0 : f.ox
      const cy = f.oy
      const cw = f.side ? env.width : f.lw * f.s
      const ch = f.lh * f.s
      if (state === 'title')
        card(ctx, cx, cy, cw, ch, {
          kicker: 'After Space Invaders · Taito, 1978',
          title: 'Formation',
          titleEm: 'drill',
          lines: ['← → move · Space fires', 'Touch: drag to move · tap to fire'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          kicker: newRecord ? 'New best' : 'Game over',
          title: fmtScore(finalScore, 5),
          lines: [`Wave ${String(finalWave).padStart(2, '0')} · Best ${fmtScore(hi.get(), 5)}`],
          prompt: 'Press Enter · Tap to play again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
      tapFire = false
      tapStart = false
    },
  }
}

export default create
