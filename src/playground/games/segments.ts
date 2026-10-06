/*
 * SEGMENTS — after Centipede (Atari, 1981).
 *
 * A garden plot on a 30 × 25 grid. Mushrooms are hairline caps with hatched
 * gills that lose their hatching as they're shot (four hits clear one). The
 * centipede is a chain of outlined ovals with paddling legs; the head carries
 * antennae. Heads steer by the original's rule — run until a mushroom or the
 * edge, drop a row, reverse — and the body follows the head's exact path, so
 * shooting a middle segment leaves a mushroom and splits the chain in two.
 * A spider zig-zags through the player zone, a flea drops straight down
 * seeding mushrooms, and the player is a small gnome whose hat is the barrel.
 */

import { angleDiff, C, card, clamp, damp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, rgba, rng, Rings, setFont, Sparks, START_KEYS, text, toField, TAU } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

const CELL = 16
const COLS = 30
const ROWS = 25
const LW = COLS * CELL
const LH = ROWS * CELL
const ZONE_ROW = 19
const ZONE_Y = ZONE_ROW * CELL
const SHOT_V = 1000
const PSPEED = 190
const CHAIN = 10

/** [centipede, mushrooms] per wave */
const PALETTE: [string, string][] = [
  [C.ocean, C.moss],
  [C.lagoon, C.fern],
  [C.moss, C.ocean],
  [C.fern, C.lagoon],
]

type State = 'attract' | 'title' | 'play' | 'over'

interface Seg {
  fc: number
  fr: number
  tc: number
  tr: number
  dir: number
  vdir: number
  ang: number
}

interface Spider {
  x: number
  y: number
  vx: number
  vy: number
  turn: number
  phase: number
}

interface Flea {
  x: number
  y: number
  vy: number
  hp: number
  lastRow: number
}

interface Popup {
  x: number
  y: number
  t: number
  str: string
  col: string
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 160 : 420)
  const rings = new Rings()
  const r = rng(1981)
  let f = gameFit(env.width, env.height, env.mode, LW, LH)

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  const botParam = env.params.get('bot') === '1'

  let score = 0
  let finalScore = 0
  let finalWave = 1
  let lives = 3
  let wave = 1
  let nextExtra = 12000
  let newRecord = false
  let clock = 0
  /** seconds into the current game (the flea may come early in wave one after 25 s) */
  let gameT = 0

  const mush = new Uint8Array(COLS * ROWS)
  const mushHit = new Float32Array(COLS * ROWS)
  let chains: Seg[][] = []
  let hopP = 0
  let hopSpeed = 8
  let pendingHeads: { c: number; at: number }[] = []
  let zoneTime = 0
  let headSpawnT = 0
  let beat = 0

  let gx = LW / 2
  let gy = LH - 12
  let gvx = 0
  let gvy = 0
  let gAlive = true
  let deadT = 0
  let restoreQ: number[] = []
  let restoreT = 0
  let shot: { x: number; y: number } | null = null
  let recoil = 0
  let walk = 0

  let spider: Spider | null = null
  let spiderT = 4
  let spiderTone = 0
  let flea: Flea | null = null
  let fleaT = 3
  let popups: Popup[] = []
  let shake = 0

  // pointer: a mouse steers absolutely; a finger drags relative to where it landed
  let ptrTarget: { x: number; y: number } | null = null
  let ptrDown = false
  let tapStart = false
  // affordances: the last input used, the mouse over the field, and the first-play hints
  let lastInput: 'key' | 'mouse' | 'touch' = 'key'
  let hover: { x: number; y: number } | null = null
  let hintsSeen = false
  let hintAge = 0
  let hintDone = false
  let hintOut = 0
  let movedOnce = false
  let firedOnce = false
  let drag: { fx: number; fy: number; gx: number; gy: number } | null = null

  const colOf = () => PALETTE[(wave - 1) % PALETTE.length]

  /* ---------------------------------------------------------------- setup */

  function seedMushrooms() {
    mush.fill(0)
    let n = 0
    while (n < 62) {
      const c = Math.floor(r() * COLS)
      const row = 1 + Math.floor(r() * (ROWS - 3))
      if (row >= ZONE_ROW && r() < 0.6) continue
      const i = row * COLS + c
      if (mush[i]) continue
      mush[i] = 4
      n++
    }
  }

  function spawnCentipede() {
    chains = []
    pendingHeads = []
    const extra = Math.min(wave - 1, 5)
    const len = CHAIN - extra
    const startC = Math.floor(COLS / 2) + 2
    const chain: Seg[] = []
    for (let i = 0; i < len; i++) {
      // body trails off-screen above the top row, entering one cell per hop
      chain.push({ fc: startC, fr: -i - 1, tc: startC, tr: -i, dir: -1, vdir: 1, ang: Math.PI / 2 })
    }
    // the head walks along row 0 once it arrives; body follows its path
    chains.push(chain)
    for (let k = 0; k < extra; k++) pendingHeads.push({ c: Math.floor(r() * COLS), at: 1.2 + k * 0.9 })
    hopP = 0
    hopSpeed = Math.min(8 + (wave - 1) * 0.8, 13)
    zoneTime = 0
    headSpawnT = 0
  }

  function newGame() {
    gameT = 0
    score = 0
    lives = 3
    wave = 1
    nextExtra = 12000
    gx = LW / 2
    gy = LH - 12
    gvx = gvy = 0
    gAlive = true
    deadT = 0
    restoreQ = []
    shot = null
    spider = null
    spiderT = 4
    flea = null
    fleaT = 3
    popups = []
    sparks.clear()
    rings.clear()
    mushHit.fill(0)
    seedMushrooms()
    spawnCentipede()
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

  /* -------------------------------------------------------------- helpers */

  const segX = (s: Seg) => ((s.fc + (s.tc - s.fc) * hopP) * CELL + CELL / 2)
  const segY = (s: Seg) => ((s.fr + (s.tr - s.fr) * hopP) * CELL + CELL / 2)
  const mushAt = (c: number, row: number) => (c >= 0 && c < COLS && row >= 0 && row < ROWS ? mush[row * COLS + c] : 0)
  /** player blocked by a mushroom at (x, y)? */
  function blocked(x: number, y: number, rad = 5) {
    const c0 = Math.floor((x - rad) / CELL)
    const c1 = Math.floor((x + rad) / CELL)
    const r0 = Math.floor((y - rad) / CELL)
    const r1 = Math.floor((y + rad) / CELL)
    for (let row = r0; row <= r1; row++)
      for (let c = c0; c <= c1; c++) {
        if (!mushAt(c, row)) continue
        const cx = c * CELL + CELL / 2
        const cy = row * CELL + CELL / 2
        if (Math.abs(x - cx) < 6 + rad && Math.abs(y - cy) < 6 + rad) return true
      }
    return false
  }

  function addScore(n: number) {
    score += n
    if (score >= nextExtra) {
      nextExtra += 12000
      lives++
      env.sfx.tone(784, 0.12, { type: 'triangle', gain: 0.06 })
      env.sfx.tone(1175, 0.2, { type: 'triangle', gain: 0.05, when: 0.1 })
    }
  }

  function popup(x: number, y: number, str: string, col: string) {
    popups.push({ x, y, t: 0, str, col })
  }

  function headStep(h: Seg) {
    const nc = h.tc + h.dir
    if (nc < 0 || nc >= COLS || (h.tr >= 0 && mushAt(nc, h.tr))) {
      let nr = h.tr + h.vdir
      if (nr > ROWS - 1) {
        h.vdir = -1
        nr = h.tr - 1
      } else if (h.vdir < 0 && nr < ZONE_ROW) {
        h.vdir = 1
        nr = h.tr + 1
      }
      h.dir = -h.dir
      return [h.tc, nr] as const
    }
    return [nc, h.tr] as const
  }

  function hop() {
    for (const ch of chains) {
      for (let i = ch.length - 1; i >= 1; i--) {
        const s = ch[i]
        s.fc = s.tc
        s.fr = s.tr
        s.tc = ch[i - 1].tc
        s.tr = ch[i - 1].tr
        s.dir = ch[i - 1].dir
        s.vdir = ch[i - 1].vdir
      }
      const h = ch[0]
      h.fc = h.tc
      h.fr = h.tr
      if (h.tr < 0) {
        // still entering from above the field
        h.tr = h.tr + 1
      } else {
        const [c, row] = headStep(h)
        h.tc = c
        h.tr = row
      }
    }
    // a soft two-note pulse, every other hop
    beat++
    if (beat % 2 === 0 && chains.length) env.sfx.tone(beat % 4 === 0 ? 98 : 110, 0.09, { type: 'sine', gain: 0.05, room: 0.05 })
  }

  function killSegment(ci: number, si: number) {
    const ch = chains[ci]
    const s = ch[si]
    const x = segX(s)
    const y = segY(s)
    const isHead = si === 0
    const c = Math.round((x - CELL / 2) / CELL)
    const row = Math.round((y - CELL / 2) / CELL)
    if (c >= 0 && c < COLS && row >= 0 && row < ROWS) mush[row * COLS + c] = 4
    addScore(isHead ? 100 : 10)
    if (state === 'play' && !hintDone) {
      hintDone = true
      hintsSeen = true
    }
    const [cc] = colOf()
    sparks.emit(x, y, preview ? 5 : 10, { color: isHead ? C.ink : cc, speed: 130, life: 0.45, r })
    rings.add(x, y, isHead ? 18 : 12, 0.35, isHead ? C.ink : cc)
    if (isHead) popup(x, y - 8, '100', C.ink2)
    const pent = [523, 587, 659, 784, 880]
    env.sfx.tone(isHead ? 1046 : pent[si % 5], 0.08, { type: 'triangle', gain: isHead ? 0.07 : 0.05, to: isHead ? 1568 : undefined })
    const front = ch.slice(0, si)
    const back = ch.slice(si + 1)
    chains.splice(ci, 1)
    if (front.length) chains.push(front)
    if (back.length) chains.push(back)
    if (!chains.length && !pendingHeads.length) waveClear()
  }

  function waveClear() {
    wave++
    ;[523, 659, 784, 1046].forEach((fq, i) => env.sfx.tone(fq, 0.12, { type: 'triangle', gain: 0.05, when: i * 0.08 }))
    popup(LW / 2, LH * 0.45, `WAVE ${String(wave).padStart(2, '0')}`, C.ink2)
    spawnCentipede()
  }

  function killPlayer() {
    gAlive = false
    deadT = 0
    shot = null
    shake = 1
    sparks.emit(gx, gy, preview ? 14 : 30, { color: C.ink, speed: 170, life: 0.8, r })
    rings.add(gx, gy, 34, 0.7, C.ink)
    rings.add(gx, gy, 18, 0.45, C.ink2)
    env.sfx.noise(0.6, { filter: 600, to: 120, gain: 0.18 })
    env.sfx.tone(392, 0.7, { type: 'sine', gain: 0.06, to: 98 })
    restoreQ = []
    for (let i = 0; i < mush.length; i++) if (mush[i] > 0 && mush[i] < 4) restoreQ.push(i)
    restoreT = 0
  }

  /* ------------------------------------------------------------------ bot */

  function botThink(): { tx: number; ty: number; fire: boolean } {
    // target: the lowest segment once the centipede is well into the garden;
    // lead it by the shot's flight time
    let best: Seg | null = null
    let bestS = -Infinity
    for (const ch of chains)
      for (let i = 0; i < ch.length; i++) {
        const s = ch[i]
        const y = segY(s)
        if (y < 0) continue
        const sc = y * 1.2 - Math.abs(segX(s) - gx) * 0.5 + (i === 0 ? 20 : 0)
        if (sc > bestS) {
          bestS = sc
          best = s
        }
      }
    let aim = LW / 2 + Math.sin(clock * 0.37) * LW * 0.32
    let fire = false
    const engaged = best !== null && segY(best) > LH * 0.3
    if (best && engaged) {
      const vx = (best.tc - best.fc) * CELL * hopSpeed
      const T = (gy - segY(best)) / SHOT_V
      aim = segX(best) + vx * T
      fire = Math.abs(aim - gx) < 9
    }
    if (spider && spider.y < gy && Math.abs(spider.x - gx) < 70 && (!engaged || Math.abs(spider.x - gx) < 20)) {
      aim = spider.x + spider.vx * ((gy - spider.y) / SHOT_V)
      fire = fire || Math.abs(aim - gx) < 10
    }
    if (flea && flea.y < gy - 150) {
      aim = flea.x
      fire = fire || Math.abs(flea.x - gx) < 6
    }
    // keep the zone tidy: clear mushrooms straight overhead
    const c = Math.floor(gx / CELL)
    for (let row = Math.floor(gy / CELL) - 1; row >= ZONE_ROW - 2; row--) if (mushAt(c, row)) fire = true
    let bx = gx
    let by = gy
    let bc = Infinity
    for (let dx = -64; dx <= 64; dx += 8)
      for (let dy = -40; dy <= 40; dy += 10) {
        const x = clamp(gx + dx, 8, LW - 8)
        const y = clamp(gy + dy, ZONE_Y + 8, LH - 8)
        if (blocked(x, y)) continue
        let cost = Math.abs(x - aim) * 1.1 + (spider ? 0 : (LH - 10 - y) * 0.35)
        if (spider) {
          // where the spider could be over the next half second (it bounces off the zone edges)
          for (const T of [0, 0.15, 0.3, 0.5]) {
            let py = spider.y + spider.vy * T
            if (py > LH - 8) py = 2 * (LH - 8) - py
            if (py < ZONE_Y - 24) py = 2 * (ZONE_Y - 24) - py
            const d = Math.hypot(x - (spider.x + spider.vx * T), y - py)
            if (d < 64) cost += (64 - d) * (40 - T * 40)
          }
        }
        for (const ch of chains)
          for (const s of ch) {
            const sy = segY(s)
            if (sy < ZONE_Y - 24) continue
            const d = Math.hypot(x - segX(s), y - sy)
            if (d < 30) cost += (30 - d) * 22
          }
        if (flea && flea.y < y && Math.abs(x - flea.x) < 18) cost += flea.y > y - 150 ? 2000 : 300
        if (cost < bc) {
          bc = cost
          bx = x
          by = y
        }
      }
    return { tx: bx, ty: by, fire }
  }

  /* --------------------------------------------------------------- update */

  function update(dt: number, bot: boolean, input: boolean) {
    clock += dt
    gameT += dt
    shake = Math.max(0, shake - dt * 3)
    recoil = Math.max(0, recoil - dt * 12)
    for (let i = 0; i < mushHit.length; i++) if (mushHit[i] > 0) mushHit[i] = Math.max(0, mushHit[i] - dt)
    for (const p of popups) p.t += dt
    popups = popups.filter((p) => p.t < 1.1)

    if (!gAlive) {
      deadT += dt
      // after the burst, damaged mushrooms are redrawn one by one, 5 points each
      if (deadT > 0.9 && restoreQ.length) {
        restoreT -= dt
        while (restoreT <= 0 && restoreQ.length) {
          const i = restoreQ.shift()!
          mush[i] = 4
          mushHit[i] = 0.25
          addScore(5)
          restoreT += 0.055
          env.sfx.tone(1318, 0.03, { type: 'triangle', gain: 0.025 })
        }
      }
      if (deadT > 1.4 && !restoreQ.length) {
        if (lives > 1) {
          lives--
          gAlive = true
          gx = LW / 2
          gy = LH - 12
          // clear the player's spawn cell
          for (let row = ROWS - 2; row < ROWS; row++) for (let c = 13; c <= 16; c++) mush[row * COLS + c] = 0
          spider = null
          flea = null
          spawnCentipede()
        } else if (state === 'play') {
          lives = 0
          go('over')
          return
        } else {
          newGame()
          return
        }
      }
      return
    }

    // centipede
    hopP += hopSpeed * dt
    while (hopP >= 1) {
      hopP -= 1
      hop()
      // pending heads enter from the top at a hop boundary
      for (let k = pendingHeads.length - 1; k >= 0; k--) {
        const ph = pendingHeads[k]
        ph.at -= 1 / hopSpeed
        if (ph.at <= 0) {
          chains.push([{ fc: ph.c, fr: -1, tc: ph.c, tr: 0, dir: r() < 0.5 ? -1 : 1, vdir: 1, ang: Math.PI / 2 }])
          pendingHeads.splice(k, 1)
        }
      }
      // heads keep arriving from the sides once the centipede has reached the zone
      if (zoneTime > 5) {
        headSpawnT -= 1 / hopSpeed
        if (headSpawnT <= 0) {
          headSpawnT = Math.max(2.5, 6 - wave * 0.4)
          const left = r() < 0.5
          chains.push([{ fc: left ? -1 : COLS, fr: ZONE_ROW, tc: left ? 0 : COLS - 1, tr: ZONE_ROW, dir: left ? 1 : -1, vdir: 1, ang: left ? 0 : Math.PI }])
          env.sfx.tone(196, 0.2, { type: 'triangle', gain: 0.05, to: 247 })
        }
      }
    }
    let inZone = false
    for (const ch of chains) {
      for (const s of ch) {
        const tx = s.tc - s.fc
        const ty = s.tr - s.fr
        if (tx || ty) s.ang += angleDiff(s.ang, Math.atan2(ty, tx)) * damp(16, dt)
      }
      if (ch[0].tr >= ZONE_ROW) inZone = true
    }
    zoneTime = inZone ? zoneTime + dt : zoneTime

    // player movement
    let tx = gx
    let ty = gy
    let fire = false
    if (bot) {
      const b = botThink()
      tx = b.tx
      ty = b.ty
      fire = b.fire
    } else if (input) {
      let dx = 0
      let dy = 0
      if (keys.down('ArrowLeft', 'KeyA')) dx -= 1
      if (keys.down('ArrowRight', 'KeyD')) dx += 1
      if (keys.down('ArrowUp', 'KeyW')) dy -= 1
      if (keys.down('ArrowDown', 'KeyS')) dy += 1
      fire = keys.down('Space', 'KeyZ', 'KeyX')
      if (dx || dy) {
        const l = Math.hypot(dx, dy)
        tx = gx + (dx / l) * 60
        ty = gy + (dy / l) * 60
      } else if (ptrTarget) {
        tx = ptrTarget.x
        ty = ptrTarget.y
        if (ptrDown) fire = true
      }
    }
    tx = clamp(tx, 7, LW - 7)
    ty = clamp(ty, ZONE_Y + 7, LH - 7)
    const maxV = bot || !ptrTarget || keys.down('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS') ? PSPEED : 520
    const ddx = tx - gx
    const ddy = ty - gy
    const dl = Math.hypot(ddx, ddy)
    const step = Math.min(dl, maxV * dt)
    const nvx = dl > 0.01 ? (ddx / dl) * step : 0
    const nvy = dl > 0.01 ? (ddy / dl) * step : 0
    if (!blocked(gx + nvx, gy)) gx += nvx
    if (!blocked(gx, gy + nvy)) gy += nvy
    if (!bot && Math.hypot(nvx, nvy) > 0.2) movedOnce = true
    gvx = nvx / Math.max(dt, 1e-4)
    gvy = nvy / Math.max(dt, 1e-4)
    walk += Math.hypot(gvx, gvy) * dt * 0.35

    // shooting: one dash in flight, so close targets fire faster
    if (fire && !shot) {
      if (!bot) firedOnce = true
      shot = { x: gx, y: gy - 11 }
      recoil = 1
      env.sfx.tone(1568, 0.03, { type: 'triangle', gain: 0.018, room: 0 })
    }
    if (shot) {
      const dist = SHOT_V * dt
      const steps = Math.ceil(dist / 4)
      outer: for (let k = 0; k < steps; k++) {
        shot.y -= dist / steps
        const sx = shot.x
        const sy = shot.y
        if (sy < 0) {
          shot = null
          break
        }
        // flea
        if (flea && Math.abs(sx - flea.x) < 7 && Math.abs(sy - flea.y) < 9) {
          flea.hp--
          if (flea.hp <= 0) {
            addScore(200)
            popup(flea.x, flea.y, '200', C.ink2)
            rings.add(flea.x, flea.y, 20, 0.4, C.ink2)
            sparks.emit(flea.x, flea.y, 10, { color: C.ink2, speed: 140, life: 0.5, r })
            env.sfx.tone(880, 0.12, { type: 'triangle', gain: 0.06, to: 1318 })
            flea = null
          } else {
            flea.vy *= 2
            env.sfx.tone(660, 0.06, { type: 'triangle', gain: 0.04 })
          }
          shot = null
          break
        }
        // spider
        if (spider && Math.abs(sx - spider.x) < 11 && Math.abs(sy - spider.y) < 8) {
          const d = Math.hypot(spider.x - gx, spider.y - gy)
          const pts = d < 40 ? 900 : d < 80 ? 600 : 300
          addScore(pts)
          popup(spider.x, spider.y, String(pts), C.ink)
          rings.add(spider.x, spider.y, 26, 0.5, C.ink)
          sparks.emit(spider.x, spider.y, preview ? 8 : 16, { color: C.ink2, speed: 150, life: 0.6, r })
          ;[659, 784, 988].forEach((fq, i) => env.sfx.tone(fq, 0.1, { type: 'triangle', gain: 0.05, when: i * 0.06 }))
          spider = null
          spiderT = 3 + r() * 4
          shot = null
          break
        }
        // centipede
        for (let ci = 0; ci < chains.length; ci++) {
          const ch = chains[ci]
          for (let si = 0; si < ch.length; si++) {
            const s = ch[si]
            if (Math.abs(sx - segX(s)) < 7.5 && Math.abs(sy - segY(s)) < 7.5) {
              killSegment(ci, si)
              shot = null
              break outer
            }
          }
        }
        // mushrooms
        const c = Math.floor(sx / CELL)
        const row = Math.floor(sy / CELL)
        const m = mushAt(c, row)
        if (m && Math.abs(sx - (c * CELL + CELL / 2)) < 7 && sy - (row * CELL + CELL / 2) < 6) {
          const i = row * COLS + c
          mush[i] = m - 1
          mushHit[i] = 0.18
          const mx = c * CELL + CELL / 2
          const my = row * CELL + CELL / 2
          sparks.emit(mx, my + 3, preview ? 2 : 4, { color: colOf()[1], speed: 70, life: 0.3, dir: Math.PI / 2, spread: 2, r })
          if (mush[i] === 0) {
            addScore(1)
            rings.add(mx, my, 10, 0.3, colOf()[1])
            env.sfx.tone(988, 0.05, { type: 'triangle', gain: 0.03 })
          } else env.sfx.noise(0.03, { filter: 3200, gain: 0.025, q: 2 })
          shot = null
          break
        }
      }
    }

    // spider: zig-zags through the zone, eats mushrooms it crosses
    if (spider) {
      const sp = spider
      sp.turn -= dt
      if (sp.turn <= 0) {
        sp.turn = 0.35 + r() * 0.55
        sp.vy = (r() < 0.5 ? -1 : 1) * (90 + r() * 50 + wave * 4)
      }
      sp.x += sp.vx * dt
      sp.y += sp.vy * dt
      if (sp.y < ZONE_Y - 24) {
        sp.y = ZONE_Y - 24
        sp.vy = Math.abs(sp.vy)
      }
      if (sp.y > LH - 8) {
        sp.y = LH - 8
        sp.vy = -Math.abs(sp.vy)
      }
      sp.phase += dt * 16
      const c = Math.floor(sp.x / CELL)
      const row = Math.floor(sp.y / CELL)
      if (row >= ZONE_ROW && mushAt(c, row) && r() < dt * 3) mush[row * COLS + c] = 0
      spiderTone -= dt
      if (spiderTone <= 0) {
        spiderTone = 0.18
        env.sfx.tone(Math.floor(clock / 0.18) % 2 ? 330 : 294, 0.12, { type: 'sine', gain: 0.022, room: 0.1 })
      }
      if (Math.hypot(sp.x - gx, sp.y - gy) < 11) killPlayer()
      if (sp.x < -30 || sp.x > LW + 30) {
        spider = null
        spiderT = 2.5 + r() * 4
      }
    } else {
      spiderT -= dt
      if (spiderT <= 0) {
        const left = r() < 0.5
        spider = { x: left ? -20 : LW + 20, y: ZONE_Y + r() * 60, vx: (left ? 1 : -1) * (60 + r() * 30 + wave * 5), vy: 100, turn: 0, phase: 0 }
      }
    }

    // flea: drops when the zone runs short of mushrooms
    if (flea) {
      flea.y += flea.vy * dt
      const row = Math.floor(flea.y / CELL)
      if (row !== flea.lastRow) {
        flea.lastRow = row
        const c = Math.floor(flea.x / CELL)
        if (row > 0 && row < ROWS - 1 && !mushAt(c, row) && r() < 0.28) mush[row * COLS + c] = 4
      }
      if (Math.abs(flea.x - gx) < 8 && Math.abs(flea.y - gy) < 11) killPlayer()
      if (flea.y > LH + 12) flea = null
    } else if (wave >= 2 || gameT > 25) {
      fleaT -= dt
      let zoneM = 0
      for (let i = ZONE_ROW * COLS; i < mush.length; i++) if (mush[i]) zoneM++
      if (fleaT <= 0 && zoneM < 5) {
        flea = { x: Math.floor(r() * COLS) * CELL + CELL / 2, y: -10, vy: 150 + wave * 6, hp: 2, lastRow: -1 }
        fleaT = 2 + r() * 3
        env.sfx.tone(1200, 1.4, { type: 'sine', gain: 0.025, to: 300, room: 0.2 })
      }
    }

    // centipede vs gnome
    if (gAlive)
      for (const ch of chains)
        for (const s of ch)
          if (Math.hypot(segX(s) - gx, segY(s) - gy) < 10) {
            killPlayer()
            return
          }
  }

  /* ----------------------------------------------------------------- draw */

  function mushroomPath(hatch: boolean, accent: string, hw: number) {
    // outlines then hatch, each as one batched path
    ctx.beginPath()
    for (let row = 0; row < ROWS; row++)
      for (let c = 0; c < COLS; c++) {
        const h = mush[row * COLS + c]
        if (!h) continue
        const cx = c * CELL + CELL / 2
        const j = mushHit[row * COLS + c]
        const cy = row * CELL + CELL / 2 + (j > 0 ? Math.sin(j * 60) * 0.8 : 0)
        const capY = cy + 0.5
        if (!hatch) {
          // cap: a flattened dome, open underneath
          ctx.moveTo(cx - 6.5, capY)
          ctx.bezierCurveTo(cx - 6.5, capY - 8.5, cx + 6.5, capY - 8.5, cx + 6.5, capY)
          ctx.lineTo(cx - 6.5, capY)
          // stem shortens as the mushroom is shot
          const stem = [0, 0, 2, 3.5, 5][h]
          if (stem > 0) {
            ctx.moveTo(cx - 2, capY)
            ctx.lineTo(cx - 2, capY + stem)
            ctx.lineTo(cx + 2, capY + stem)
            ctx.lineTo(cx + 2, capY)
          }
        } else {
          // gills: hatching under the cap line; one pair lost per hit
          const n = h * 2
          for (let k = 0; k < n; k++) {
            const x = cx - 5.2 + (k * 10.4) / 7
            ctx.moveTo(x, capY - 0.5)
            ctx.lineTo(x + 1.6, capY - 4.2 + Math.abs(x - cx) * 0.35)
          }
        }
      }
    ctx.strokeStyle = accent
    ctx.lineWidth = hw
    ctx.globalAlpha = hatch ? 0.6 : 0.95
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawCentipede(hw: number) {
    const [cc] = colOf()
    // legs, batched: one per side per segment, paddling in a travelling wave
    ctx.beginPath()
    let n = 0
    for (const ch of chains)
      for (let i = 0; i < ch.length; i++) {
        const s = ch[i]
        const x = segX(s)
        const y = segY(s)
        if (y < -8) continue
        const ca = Math.cos(s.ang)
        const sa = Math.sin(s.ang)
        for (let side = -1; side <= 1; side += 2) {
          const sw = Math.sin(clock * 20 - n * 1.1 + (side > 0 ? Math.PI : 0)) * 2.4
          // local frame: u along heading, v lateral; the knee bends backward
          const ax = x - sa * side * 4.4
          const ay = y + ca * side * 4.4
          const bu = sw * 0.6
          const bx = x + ca * bu - sa * side * 8
          const by = y + sa * bu + ca * side * 8
          const eu = sw - 2.6
          const ex = x + ca * eu - sa * side * 10
          const ey = y + sa * eu + ca * side * 10
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
          ctx.lineTo(ex, ey)
        }
        n++
      }
    ctx.strokeStyle = cc
    ctx.lineWidth = hw
    ctx.globalAlpha = 0.8
    ctx.stroke()
    ctx.globalAlpha = 1
    // bodies: paper-filled ovals so the legs tuck underneath
    for (const ch of chains)
      for (let i = ch.length - 1; i >= 0; i--) {
        const s = ch[i]
        const x = segX(s)
        const y = segY(s)
        if (y < -8) continue
        const head = i === 0
        const breathe = 1 + Math.sin(clock * 9 + i * 0.7) * 0.04
        ctx.beginPath()
        ctx.ellipse(x, y, (head ? 7.4 : 7) * breathe, (head ? 6.2 : 5.4) / breathe, s.ang, 0, TAU)
        ctx.fillStyle = C.paper
        ctx.fill()
        ctx.strokeStyle = head ? C.ink : cc
        ctx.lineWidth = hw * (head ? 1.3 : 1)
        ctx.stroke()
        const ca = Math.cos(s.ang)
        const sa = Math.sin(s.ang)
        ctx.lineWidth = hw
        ctx.beginPath()
        if (head) {
          // antennae, sweeping forward and curling at the tips
          for (let side = -1; side <= 1; side += 2) {
            const wig = Math.sin(clock * 7 + side) * 1.2
            const bx = x + ca * 5.5 - sa * side * 2.2
            const by = y + sa * 5.5 + ca * side * 2.2
            const mx = x + ca * 11 - sa * side * (3 + wig)
            const my = y + sa * 11 + ca * side * (3 + wig)
            const ex = x + ca * 12 - sa * side * (7.5 + wig)
            const ey = y + sa * 12 + ca * side * (7.5 + wig)
            ctx.moveTo(bx, by)
            ctx.quadraticCurveTo(mx, my, ex, ey)
            ctx.moveTo(ex + 1, ey)
            ctx.arc(ex, ey, 1, 0, TAU)
          }
          ctx.strokeStyle = C.ink
          ctx.stroke()
          // eyes
          ctx.fillStyle = C.ink
          for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath()
            ctx.arc(x + ca * 3 - sa * side * 2.4, y + sa * 3 + ca * side * 2.4, 0.9, 0, TAU)
            ctx.fill()
          }
        } else {
          // two plate lines across the segment
          for (const u of [-1.8, 1.8]) {
            ctx.moveTo(x + ca * u - sa * 3.4, y + sa * u + ca * 3.4)
            ctx.lineTo(x + ca * u + sa * 3.4, y + sa * u - ca * 3.4)
          }
          ctx.strokeStyle = rgba(cc, 0.6)
          ctx.stroke()
        }
      }
  }

  function drawSpider(sp0: Spider, hw0: number) {
    // drawn at 1.3× around its centre
    ctx.save()
    ctx.translate(sp0.x, sp0.y)
    ctx.scale(1.3, 1.3)
    const sp = { ...sp0, x: 0, y: 0 }
    const hw = hw0 / 1.3
    ctx.strokeStyle = C.ink2
    ctx.lineWidth = hw
    ctx.beginPath()
    for (let side = -1; side <= 1; side += 2)
      for (let k = 0; k < 4; k++) {
        const ph = Math.sin(sp.phase + k * 1.6 + (side > 0 ? 1 : 0)) * 1.6
        const bx = sp.x + side * 2.5
        const by = sp.y - 1.5 + k * 1.2
        const kx = sp.x + side * (7 + k * 0.6)
        const ky = sp.y - 6 + k * 1.5 + ph
        const ex = sp.x + side * (11 + k * 0.8)
        const ey = sp.y + 2 + k * 1.6 - ph * 0.5
        ctx.moveTo(bx, by)
        ctx.lineTo(kx, ky)
        ctx.lineTo(ex, ey)
      }
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(sp.x, sp.y + 1, 5, 4, 0, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(sp.x, sp.y - 3.5, 2.4, 0, TAU)
    ctx.fill()
    ctx.stroke()
    // hatch on the abdomen
    ctx.beginPath()
    for (let k = -1; k <= 1; k++) {
      ctx.moveTo(sp.x - 2.5 + k * 2, sp.y + 4)
      ctx.lineTo(sp.x - 0.5 + k * 2, sp.y - 1.5)
    }
    ctx.globalAlpha = 0.6
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()
  }

  function drawFlea(fl: Flea, hw: number) {
    ctx.strokeStyle = C.ink2
    ctx.lineWidth = hw
    // speed lines above it
    ctx.globalAlpha = 0.45
    ctx.beginPath()
    for (const dx of [-3, 0, 3]) {
      ctx.moveTo(fl.x + dx, fl.y - 9 - Math.abs(dx))
      ctx.lineTo(fl.x + dx, fl.y - 18 - Math.abs(dx) * 2)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(fl.x, fl.y + 7)
    ctx.bezierCurveTo(fl.x + 6, fl.y + 2, fl.x + 4, fl.y - 6, fl.x, fl.y - 7)
    ctx.bezierCurveTo(fl.x - 4, fl.y - 6, fl.x - 6, fl.y + 2, fl.x, fl.y + 7)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    const kick = Math.sin(clock * 30) * 1.5
    for (let side = -1; side <= 1; side += 2) {
      ctx.moveTo(fl.x + side * 3.5, fl.y)
      ctx.lineTo(fl.x + side * 7, fl.y - 4 + kick * side)
      ctx.lineTo(fl.x + side * 6, fl.y - 9)
    }
    if (fl.hp === 1) {
      ctx.moveTo(fl.x - 2, fl.y - 3)
      ctx.lineTo(fl.x + 2, fl.y + 3)
    }
    ctx.stroke()
  }

  function drawGnome(hw: number) {
    const x = gx
    const y = gy
    const sq = 1 - recoil * 0.12
    // feet patter while walking
    const st = Math.sin(walk) * 2
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hw
    ctx.beginPath()
    ctx.moveTo(x - 2.5, y + 5)
    ctx.lineTo(x - 3.5 + st, y + 7.5)
    ctx.moveTo(x + 2.5, y + 5)
    ctx.lineTo(x + 3.5 - st, y + 7.5)
    ctx.stroke()
    // body
    ctx.beginPath()
    ctx.ellipse(x, y + 2, 5.2, 4.2, 0, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.stroke()
    // hat: the barrel
    const tipY = y - 1 - 11 * sq
    ctx.beginPath()
    ctx.moveTo(x - 5.6, y - 0.5)
    ctx.lineTo(x, tipY)
    ctx.lineTo(x + 5.6, y - 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    for (let k = -8; k <= 8; k += 2.6) {
      ctx.moveTo(x + k - 6, y)
      ctx.lineTo(x + k + 6, y - 12)
    }
    ctx.strokeStyle = C.moss
    ctx.globalAlpha = 0.8
    ctx.stroke()
    ctx.restore()
    ctx.globalAlpha = 1
    // eyes under the brim
    ctx.fillStyle = C.ink
    ctx.fillRect(x - 2.4, y + 1.2, 1.1, 1.1)
    ctx.fillRect(x + 1.3, y + 1.2, 1.1, 1.1)
  }

  /** Text at a field position, set in CSS px so it stays legible on small screens. */
  function ftext(str: string, fx: number, fy: number, o: TextOpts, min = 9) {
    ctx.save()
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
    text(ctx, str, f.ox + fx * f.s, f.oy + fy * f.s, { ...o, size: Math.max(min, (o.size ?? 6) * f.s) })
    ctx.restore()
  }

  function drawWorld(hw: number) {
    const mc = colOf()[1]
    // fine annotations only where they can be read
    const tiny = preview || f.s < 1.1
    // graph-paper dots and the player zone
    if (!preview) {
      ctx.fillStyle = C.rule
      for (let row = 1; row < ROWS; row++) for (let c = 1; c < COLS; c++) ctx.fillRect(c * CELL - 0.4, row * CELL - 0.4, 0.8, 0.8)
    }
    ctx.strokeStyle = C.rule
    ctx.lineWidth = hw
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(0, ZONE_Y)
    ctx.lineTo(LW, ZONE_Y)
    ctx.stroke()
    ctx.setLineDash([])
    if (!tiny) {
      text(ctx, 'ZONE', 4, ZONE_Y - 3, { size: 5.5, color: C.muted, tracking: 0.16 })
      let segs = 0
      for (const ch of chains) segs += ch.length
      text(ctx, `SEG ${String(segs).padStart(2, '0')} · CH ${chains.length} · ${hopSpeed.toFixed(1)} CELL/S`, LW - 4, ZONE_Y - 3, { size: 5.5, color: C.muted, tracking: 0.14, align: 'right' })
    }

    mushroomPath(true, mc, hw)
    mushroomPath(false, mc, hw)

    drawCentipede(hw)
    if (spider) drawSpider(spider, hw)
    if (flea) drawFlea(flea, hw)

    // shot: a short dash with a faint tail
    if (shot) {
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hw * 1.5
      ctx.beginPath()
      ctx.moveTo(shot.x, shot.y)
      ctx.lineTo(shot.x, shot.y + 6)
      ctx.stroke()
      ctx.lineWidth = hw
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(shot.x, shot.y + 9)
      ctx.lineTo(shot.x, shot.y + 20)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // where the mouse is steering: a dotted ring at the target, clamped into the zone
    if (state === 'play' && gAlive && hover && lastInput === 'mouse' && ptrTarget && !preview) {
      const tx = clamp(ptrTarget.x, 7, LW - 7)
      const ty = clamp(ptrTarget.y, ZONE_Y + 7, LH - 7)
      ctx.strokeStyle = rgba(C.moss, ptrDown ? 0.9 : 0.55)
      ctx.lineWidth = hw
      ctx.setLineDash([1.5, 2.5])
      ctx.beginPath()
      ctx.arc(tx, ty, 7, 0, TAU)
      if (Math.hypot(tx - gx, ty - gy) > 12) {
        ctx.moveTo(gx, gy)
        ctx.lineTo(tx, ty)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(tx - 2.5, ty)
      ctx.lineTo(tx + 2.5, ty)
      ctx.moveTo(tx, ty - 2.5)
      ctx.lineTo(tx, ty + 2.5)
      ctx.stroke()
    }
    if (gAlive) drawGnome(hw)
    else if (deadT < 0.5) {
      // the gnome flies apart into strokes
      const k = deadT / 0.5
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hw
      ctx.globalAlpha = 1 - k
      ctx.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU
        const d = 3 + ease.outCubic(k) * 14
        ctx.moveTo(gx + Math.cos(a) * d, gy + Math.sin(a) * d)
        ctx.lineTo(gx + Math.cos(a + 0.5) * (d + 4), gy + Math.sin(a + 0.5) * (d + 4))
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    sparks.draw(ctx, hw)
    rings.draw(ctx, hw)
    for (const p of popups) {
      const a = 1 - clamp((p.t - 0.7) / 0.4)
      ftext(p.str, p.x, p.y - p.t * 12, { size: p.str.startsWith('WAVE') ? 8 : 7, color: p.col, align: 'center', baseline: 'middle', alpha: a, tracking: p.str.startsWith('WAVE') ? 0.3 : 0.1 })
    }
  }

  /* ---------------------------------------------------------------- hints */

  /** A small boxed mono label (a callout) in screen px, kept inside the field. 'beside' sits right of sx. */
  function tag(str: string, sx: number, sy: number, a: number, col: string = C.ink2, beside = false) {
    if (a <= 0.01) return
    const size = Math.max(9, 6 * f.s)
    setFont(ctx, { size, tracking: 0.16 })
    const w = ctx.measureText(str).width + size * 1.6
    const h = size * 2
    const right = f.ox + f.lw * f.s - 4
    const x = clamp(beside ? sx + 8 : sx - w / 2, f.ox + 4, right - w)
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
   * First-play hints, in screen space: a ghost loop through the zone with a
   * dot running round it (move here), and a dotted line up from the hat with
   * dashes climbing it (hold to fire). They fade as each is done, and go
   * entirely with the first segment hit.
   */
  function drawHints(dt: number) {
    if (state !== 'play' || !gAlive) return
    hintAge += dt
    if (hintDone) hintOut = Math.min(1, hintOut + dt * 1.5)
    const base = clamp((hintAge - 0.3) / 0.5) * (1 - hintOut)
    if (base <= 0) return
    const S = (x: number) => f.ox + x * f.s
    const T = (y: number) => f.oy + y * f.s
    const moveA = base * (movedOnce ? clamp(1.8 - hintAge * 0.3) : 1)
    const fireA = base * (firedOnce ? clamp(2.4 - hintAge * 0.3) : 1)
    if (moveA > 0.01) {
      const cx = S(LW / 2)
      const cy = T(ZONE_Y + 48)
      const rx = 92 * f.s
      const ry = 28 * f.s
      ctx.save()
      ctx.globalAlpha = moveA * 0.7
      ctx.strokeStyle = C.ink2
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      // the zone's edge, briefly in the accent
      ctx.strokeStyle = C.moss
      ctx.globalAlpha = moveA * 0.5
      ctx.beginPath()
      ctx.moveTo(S(0), T(ZONE_Y))
      ctx.lineTo(S(LW), T(ZONE_Y))
      ctx.stroke()
      const a = hintAge * 1.6
      ctx.globalAlpha = moveA
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.6, 0, TAU)
      ctx.fill()
      ctx.restore()
      tag(lastInput === 'touch' ? 'DRAG TO MOVE' : lastInput === 'mouse' ? 'POINT TO MOVE' : 'ARROWS MOVE', cx + rx, cy, moveA, C.ink2, true)
    }
    if (fireA > 0.01) {
      const x = S(gx)
      const y0 = T(gy - 13)
      const y1 = T(gy - 100)
      ctx.save()
      ctx.globalAlpha = fireA * 0.7
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.moveTo(x, y0)
      ctx.lineTo(x, y1)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let k = 0; k < 3; k++) {
        const q = (hintAge * 1.8 + k / 3) % 1
        const yy = y0 + (y1 - y0) * q
        ctx.moveTo(x, yy)
        ctx.lineTo(x, yy - 5)
      }
      ctx.stroke()
      ctx.restore()
      tag(lastInput === 'touch' ? 'HOLD TO FIRE' : lastInput === 'mouse' ? 'PRESS TO FIRE' : 'HOLD SPACE · FIRE', x, y1 - 12, fireA, C.moss)
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
      // the keyboard takes over from a resting mouse
      if (down && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(code)) ptrTarget = null
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyZ', 'KeyX', ...START_KEYS])
    },
    pointer(p) {
      if (preview) return
      const fp = toField(f, p.x, p.y)
      const touch = p.pointerType === 'touch' || p.pointerType === 'pen'
      if (p.type === 'down' || p.type === 'move') lastInput = touch ? 'touch' : 'mouse'
      hover = p.type === 'leave' || (touch && p.type === 'up') ? null : fp
      if (p.type === 'leave' || p.type === 'up') {
        ptrDown = false
        drag = null
        if (touch) ptrTarget = null
        return
      }
      if (p.type === 'down') {
        ptrDown = true
        if (state !== 'play') tapStart = true
        if (touch) drag = { fx: fp.x, fy: fp.y, gx, gy }
      }
      if (touch) {
        if (drag) ptrTarget = { x: drag.gx + (fp.x - drag.fx) * 1.25, y: drag.gy + (fp.y - drag.fy) * 1.25 }
      } else ptrTarget = { x: fp.x, y: fp.y }
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || tapStart
      let fresh = false
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        fresh = true
        ptrDown = false
      }
      if (dt > 0) {
        if (state === 'play') update(dt, botParam, !fresh)
        else update(dt, true, false)
      }
      sparks.update(dt, 80, 2.5)
      rings.update(dt)

      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: 'FIG. G.11 — AFTER CENTIPEDE, 1981' })
      enterFit(ctx, f)
      ctx.beginPath()
      ctx.rect(0, 0, LW, LH)
      ctx.clip()
      if (shake > 0) {
        const s = shake * shake * 2.4
        ctx.translate(Math.sin(clock * 91) * s, Math.cos(clock * 77) * s)
      }
      drawWorld(1 / f.s)
      ctx.restore()
      if (!preview) {
        drawHints(dt)
        const inField = hover && hover.x >= 0 && hover.x <= LW && hover.y >= 0 && hover.y <= LH
        env.setCursor(state !== 'play' ? 'pointer' : inField ? 'crosshair' : 'default')
      }

      const showScore = state === 'over' ? finalScore : score
      gameHud(
        ctx,
        f,
        env.mode,
        [
          { label: 'Score', value: fmtScore(showScore, 6) },
          { label: 'Lives', value: String(Math.max(0, lives)) },
          { label: 'Wave', value: String(state === 'over' ? finalWave : wave).padStart(2, '0') },
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
          kicker: 'After Centipede · Atari, 1981',
          title: 'Segments',
          titleEm: 'afield',
          lines: ['Arrows / WASD move · hold Space to fire', 'Mouse: point and press · Touch: drag'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, cx, cy, cw, ch, {
          kicker: newRecord ? 'New best' : 'Game over',
          title: fmtScore(finalScore, 6),
          lines: [`Wave ${String(finalWave).padStart(2, '0')} · Best ${fmtScore(hi.get(), 6)}`],
          prompt: 'Press Enter · Tap to play again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
      tapStart = false
    },
  }
}

export default create
