/*
 * INTERCEPT — after Missile Command (Atari, 1980).
 *
 * Warheads draw straight hairline trails down toward six small skylines and
 * three launch mounds on a hatched ground line. Click or tap the sky: the
 * nearest base fires an interceptor along a dashed path to a target cross,
 * where it blooms into a hatched circle that grows, holds and shrinks — and
 * anything it touches goes off too, so a good shot sets off a chain, each
 * link a note higher. Waves add speed and splitting warheads; the bonus
 * tally counts remaining ammo and cities up with ticks.
 *
 * The bot ranks warheads by time to impact, leads the earliest uncovered
 * one, and fires from the nearest base with ammo.
 */

import { blink, C, card, clamp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, rgba, rng, Sparks, START_KEYS, TAU, text, toField } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

const CAPTION = 'FIG. G.07 — AFTER MISSILE COMMAND, 1980'
const KICKER = 'After Missile Command · Atari, 1980'

type State = 'attract' | 'title' | 'play' | 'over'
type Phase = 'intro' | 'fight' | 'tally' | 'end'

const AMMO = 10
const SPEED_SIDE = 330
const SPEED_MID = 450
const BLAST_R = 25
const CHAIN_R = 19
const MULTS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]
const NOTES = [392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319]

interface Building {
  x: number
  w: number
  h: number
  win: number[] // window rects x,y (relative to the city's left/ground)
  lit: number[]
  antenna: boolean
}
interface City {
  x: number
  alive: boolean
  b: Building[]
  rubble: number[]
  hitT: number
}
interface Base {
  x: number
  ammo: number
  alive: boolean
  hitT: number
}
interface Warhead {
  id: number
  sx: number
  sy: number
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  split: number
  alive: boolean
  fade: number
}
interface Shot {
  bx: number
  by: number
  tx: number
  ty: number
  x: number
  y: number
  speed: number
  d: number
  total: number
  target: number
  alive: boolean
  /** fired by a finger: the blast is drawn a little larger (a bigger target for a thumb) */
  touch: boolean
}
interface Blast {
  x: number
  y: number
  rMax: number
  t: number
  dur: number
  chain: number
  kind: 0 | 1 | 2 // player, chain, ground
  rot: number
  /** warheads this blast has caught (a player blast that catches nothing is a miss) */
  caught: number
}
interface Label {
  x: number
  y: number
  s: string
  t: number
  /** a teaching prompt rather than a score label: lingers, in moss */
  tip?: boolean
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 160 : 500)
  const R = rng(1980)
  const V = rng(5)
  const forceBot = env.params.get('bot') === '1'

  // --- field (portrait screens get a taller sky)
  let W = 480
  let H = 360
  let GY = H - 30
  let U = 1 // horizontal scale of ground features (portrait is narrower)
  let f = gameFit(env.width, env.height, env.mode, W, H)

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  let stateT = 0
  let newRecord = false
  let shown = 0

  let score = 0
  let wave = 0
  let nextCity = 10000
  let phase: Phase = 'intro'
  let phaseT = 0
  let toLaunch = 0
  let launchT = 0
  let warheadId = 0
  let shake = 0
  let endT = 0
  let lostT = 0

  let cities: City[] = []
  let bases: Base[] = []
  let warheads: Warhead[] = []
  let shots: Shot[] = []
  let blasts: Blast[] = []
  let labels: Label[] = []

  // tally
  let tallyAmmo = 0
  let tallyCities = 0
  let tallyPoints = 0
  let tallyAmmoTotal = 0
  let tallyCityTotal = 0
  let tallyStep = 0
  let tallyClock = 0

  // aim
  let cx = W / 2
  let cy = H * 0.45
  let pointerSeen = false
  let tapQueued = false
  const fireQueue: { x: number; y: number; touch: boolean }[] = []
  let hoverIn = false
  let lastTouch = false
  let shotTouch = false

  // first-play teaching (full mode, once per browser): a ghost shot until the
  // first one is fired, then gentle prompts after misses until the first catch
  let hint = env.mode === 'full' && env.store.get('hinted') !== '1' ? 0 : 2
  let misses = 0
  let aimPrompts = 0
  let noAmmoT = 0

  // bot
  let botT = 0
  let botAimX = -1
  let botAimY = -1

  const sfxOn = () => state === 'play'
  const sfx = {
    tone: (freq: number, dur: number, o?: Parameters<typeof env.sfx.tone>[2]) => sfxOn() && env.sfx.tone(freq, dur, o),
    noise: (dur: number, o?: Parameters<typeof env.sfx.noise>[1]) => sfxOn() && env.sfx.noise(dur, o),
  }

  const mult = () => MULTS[Math.min(MULTS.length - 1, wave - 1)]
  const baseXs = () => [W * 0.075, W * 0.5, W * 0.925]
  const cityXs = () => {
    const [a, b, c] = baseXs()
    return [lerp(a, b, 0.27), lerp(a, b, 0.52), lerp(a, b, 0.76), lerp(b, c, 0.24), lerp(b, c, 0.48), lerp(b, c, 0.73)]
  }

  function makeCity(i: number, x: number): City {
    const r = rng(300 + i * 17)
    const n = 5 + Math.floor(r() * 3)
    const cw = 30 * U
    const widths: number[] = []
    let sum = 0
    for (let k = 0; k < n; k++) {
      const w = (3.2 + r() * 4.2) * U
      widths.push(w)
      sum += w
    }
    const gap = 0.7
    const scale = (cw - gap * (n - 1)) / sum
    const b: Building[] = []
    let bx = -cw / 2
    let tallest = 0
    for (let k = 0; k < n; k++) {
      const w = widths[k] * scale
      const centre = 1 - Math.abs(k - (n - 1) / 2) / n
      const h = 5 + r() * 9 + centre * 7
      const win: number[] = []
      const lit: number[] = []
      for (let wy = 2.2; wy < h - 1.6; wy += 2.6)
        for (let wx = 1.0; wx < w - 1.1; wx += 2.0) {
          if (r() < 0.82) win.push(bx + wx, -h + wy)
          if (r() < 0.07) lit.push(bx + wx, -h + wy)
        }
      b.push({ x: bx, w, h, win, lit, antenna: false })
      if (h > b[tallest].h) tallest = k
      bx += w + gap
    }
    b[tallest].antenna = true
    // rubble outline for when it falls
    const rubble: number[] = []
    for (let k = 0; k <= 12; k++) rubble.push(-cw / 2 + (cw * k) / 12, -(k % 2 ? 1.5 + r() * 3.2 : 0.6 + r() * 1.2))
    return { x, alive: true, b, rubble, hitT: 0 }
  }

  function layout(w: number, h: number) {
    // tall screens get a taller sky; square-ish ones a square field
    const ar = h / w
    const nw = ar > 1.25 ? 360 : ar > 0.92 ? 400 : 480
    const nh = ar > 1.25 ? 580 : ar > 0.92 ? 400 : 360
    if (nw !== W || nh !== H) {
      const kx = nw / W
      const ky = (nh - 30) / (H - 30)
      for (const wh of warheads) {
        wh.x *= kx
        wh.sx *= kx
        wh.tx *= kx
        wh.y *= ky
        wh.sy *= ky
        wh.vx *= kx
        wh.vy *= ky
      }
      for (const s of shots) s.alive = false
      for (const b of blasts) {
        b.x *= kx
        b.y *= ky
      }
      cx *= kx
      cy *= ky
      W = nw
      H = nh
      GY = H - 30
      U = W / 480
      const bx = baseXs()
      bases.forEach((b, i) => (b.x = bx[i]))
      const xs = cityXs()
      cities = cities.map((c, i) => {
        const n = makeCity(i, xs[i])
        n.alive = c.alive
        n.hitT = c.hitT
        return n
      })
    }
    f = gameFit(w, h, env.mode, W, H)
  }

  /* -------------------------------------------------------------- flow */

  function newGame() {
    score = 0
    nextCity = 10000
    const xs = cityXs()
    cities = xs.map((x, i) => makeCity(i, x))
    bases = baseXs().map((x) => ({ x, ammo: AMMO, alive: true, hitT: 0 }))
    warheads = []
    shots = []
    blasts = []
    labels = []
    sparks.clear()
    // the attract demo opens at wave 3, where splitting warheads appear
    startWave(state === 'play' ? 1 : 3)
  }

  function startWave(n: number) {
    wave = n
    phase = 'intro'
    phaseT = 0
    lostT = 0
    toLaunch = Math.min(36, 10 + n * 2)
    launchT = 0.4
    for (const b of bases) {
      b.ammo = AMMO
      b.alive = true
    }
    warheads = []
    shots = []
    if (score >= nextCity) {
      const dead = cities.find((c) => !c.alive)
      if (dead) {
        dead.alive = true
        dead.hitT = 0
        labels.push({ x: dead.x, y: GY - 30, s: 'BONUS CITY', t: 0 })
      }
      nextCity += 10000
    }
    sfx.tone(523, 0.25, { type: 'triangle', gain: 0.04 })
    sfx.tone(784, 0.35, { type: 'triangle', gain: 0.04, when: 0.14 })
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

  /* ---------------------------------------------------------- entities */

  function pickTarget(): number {
    // cities more often than bases, living ones first
    const alive = cities.filter((c) => c.alive)
    if (R() < 0.68 && cities.length) {
      const pool = alive.length && R() < 0.8 ? alive : cities
      return pool[Math.floor(R() * pool.length)].x + (R() - 0.5) * 8
    }
    const b = bases[Math.floor(R() * bases.length)]
    return b.x + (R() - 0.5) * 6
  }

  const speedNow = () => Math.min(94, 21 + wave * 6) * (GY / 330)

  function spawnWarhead(sx: number, sy: number, tx: number, speed: number, canSplit: boolean) {
    const dx = tx - sx
    const dy = GY - sy
    const L = Math.hypot(dx, dy) || 1
    const mirvChance = wave >= 2 ? Math.min(0.5, 0.14 + wave * 0.05) : 0
    warheads.push({
      id: ++warheadId,
      sx,
      sy,
      x: sx,
      y: sy,
      vx: (dx / L) * speed,
      vy: (dy / L) * speed,
      tx,
      split: canSplit && R() < mirvChance ? H * (0.2 + R() * 0.24) : -1,
      alive: true,
      fade: 0,
    })
  }

  function launch() {
    const sp = speedNow()
    spawnWarhead(10 + R() * (W - 20), -2, pickTarget(), sp * (0.85 + R() * 0.3), true)
  }

  function splitWarhead(wh: Warhead) {
    wh.alive = false
    wh.fade = 0.0001
    const n = 2 + (R() < 0.35 ? 1 : 0)
    const sp = Math.hypot(wh.vx, wh.vy)
    for (let k = 0; k < n; k++) spawnWarhead(wh.x, wh.y, pickTarget(), sp, false)
    sparks.emit(wh.x, wh.y, preview ? 3 : 7, { speed: 60, life: 0.35, color: C.ink })
    sfx.tone(988, 0.14, { type: 'sine', gain: 0.02, to: 494 })
  }

  function fireAt(x: number, y: number, forceBase = -1) {
    y = Math.min(y, GY - 20)
    y = Math.max(y, 8)
    x = clamp(x, 4, W - 4)
    let bi = forceBase
    if (bi < 0 || !bases[bi].alive || bases[bi].ammo <= 0) {
      bi = -1
      let best = Infinity
      bases.forEach((b, i) => {
        if (!b.alive || b.ammo <= 0) return
        const d = Math.abs(b.x - x) * (i === 1 ? 0.8 : 1)
        if (d < best) {
          best = d
          bi = i
        }
      })
    }
    if (bi < 0) {
      sfx.tone(196, 0.07, { type: 'square', gain: 0.02, filter: 800 })
      if (state === 'play' && !forceBot && noAmmoT <= 0) {
        labels.push({ x, y: y - 12, s: 'NO AMMO', t: 0, tip: true })
        noAmmoT = 1.2
      }
      return false
    }
    const b = bases[bi]
    b.ammo--
    const by = GY - 16
    const total = Math.hypot(x - b.x, y - by)
    shots.push({ bx: b.x, by, tx: x, ty: y, x: b.x, y: by, speed: (bi === 1 ? SPEED_MID : SPEED_SIDE) * (GY / 330), d: 0, total, target: -1, alive: true, touch: shotTouch })
    if (hint === 0 && state === 'play' && !forceBot) hint = 1
    sfx.tone(330, 0.16, { type: 'sine', to: 990, gain: 0.04, pan: (b.x / W) * 2 - 1 })
    return true
  }

  function detonate(x: number, y: number, kind: 0 | 1 | 2, chain: number, big = false) {
    const rMax = (kind === 0 ? BLAST_R : kind === 1 ? CHAIN_R : 15) * (big ? 1.15 : 1)
    blasts.push({ x, y, rMax, t: 0, dur: kind === 2 ? 1.0 : 1.35, chain, kind, rot: V() * Math.PI, caught: 0 })
    if (kind === 2) return
    sfx.noise(0.55, { filter: 520, to: 130, gain: 0.1, pan: (x / W) * 2 - 1 })
    sfx.tone(NOTES[Math.min(NOTES.length - 1, chain)], 0.42, { type: 'triangle', gain: 0.05, pan: (x / W) * 2 - 1 })
  }

  const blastR = (b: Blast) => {
    const k = b.t / b.dur
    if (k < 0.26) return b.rMax * ease.outCubic(k / 0.26)
    if (k < 0.5) return b.rMax
    return b.rMax * (1 - ease.inCubic((k - 0.5) / 0.5))
  }

  function destroyWarhead(wh: Warhead, chain: number) {
    wh.alive = false
    wh.fade = 0.0001
    const pts = 25 * mult()
    score += pts
    detonate(wh.x, wh.y, 1, chain)
    sparks.emit(wh.x, wh.y, preview ? 3 : 6, { speed: 70, life: 0.4, color: C.ink })
    if (chain >= 2) {
      const bonus = 25 * mult() * (chain - 1)
      score += bonus
      if (!preview) {
        // stack labels that would land on one another
        let y = wh.y - CHAIN_R - 8
        const span = 96 / f.s // a label's width, in field units
        for (const l of labels) if (l.t < 0.8 && Math.abs(l.x - wh.x) < span && Math.abs(l.y - y) < 12 / f.s) y = l.y - 13 / f.s
        labels.push({ x: wh.x, y, s: `CHAIN ×${chain} +${bonus}`, t: 0 })
      }
    }
  }

  function impact(wh: Warhead) {
    wh.alive = false
    wh.fade = 0.0001
    detonate(wh.x, GY - 2, 2, 0)
    sparks.emit(wh.x, GY - 2, preview ? 6 : 14, { speed: 110, life: 0.6, color: C.ink, dir: -Math.PI / 2, spread: 2.4 })
    let hit = false
    for (const c of cities) {
      if (c.alive && Math.abs(c.x - wh.x) < 17 * U) {
        hit = true
        c.alive = false
        c.hitT = 0
        shake = 3.5
        // the buildings come down: their edges as sparks
        for (const b of c.b) sparks.emit(c.x + b.x + b.w / 2, GY - b.h / 2, preview ? 2 : 5, { speed: 70, life: 0.8, color: C.ink2, dir: -Math.PI / 2, spread: 2 })
        sfx.noise(0.9, { filter: 210, to: 55, gain: 0.24 })
        sfx.tone(98, 0.7, { type: 'sine', to: 49, gain: 0.08 })
      }
    }
    for (const b of bases) {
      if (b.alive && Math.abs(b.x - wh.x) < 20 * U) {
        hit = true
        b.alive = false
        b.ammo = 0
        b.hitT = 0
        shake = 3
        sfx.noise(0.7, { filter: 260, to: 70, gain: 0.2 })
      }
    }
    if (!hit) sfx.noise(0.3, { filter: 300, gain: 0.08 })
  }

  /* ---------------------------------------------------------------- bot */

  function botThink(dt: number) {
    botT -= dt
    if (botT > 0 || phase !== 'fight') return
    botT = 0.2 + V() * 0.12
    // warheads already handled by a shot in flight or a live blast
    const covered = new Set<number>()
    let inFlight = 0
    for (const s of shots)
      if (s.alive) {
        inFlight++
        if (s.target >= 0) covered.add(s.target)
      }
    if (inFlight >= 3) return
    // candidates, most urgent first
    const cands: { wh: Warhead; tti: number }[] = []
    for (const wh of warheads) {
      if (!wh.alive || covered.has(wh.id) || wh.y < 4) continue
      const tti = (GY - wh.y) / Math.max(1, wh.vy)
      // let trails draw a while: engage once a warhead is well into the sky
      if (wh.y < H * 0.3 && tti > 3.2) continue
      // will a current blast catch it anyway?
      let safe = false
      for (const b of blasts) {
        if (b.kind === 2 || b.t / b.dur > 0.6) continue
        if (Math.hypot(wh.x + wh.vx * 0.4 - b.x, wh.y + wh.vy * 0.4 - b.y) < b.rMax * 0.85) safe = true
      }
      if (!safe) cands.push({ wh, tti })
    }
    cands.sort((p, q) => p.tti - q.tti)
    for (const { wh: tgt } of cands) {
      // lead: iterate flight time to the predicted point
      let px = tgt.x
      let py = tgt.y
      let ok = true
      for (let it = 0; it < 5; it++) {
        let bi = -1
        let bd = Infinity
        bases.forEach((b, i) => {
          if (!b.alive || b.ammo <= 0) return
          const d = Math.abs(b.x - px) * (i === 1 ? 0.8 : 1)
          if (d < bd) {
            bd = d
            bi = i
          }
        })
        if (bi < 0) return // nothing left to fire
        const speed = (bi === 1 ? SPEED_MID : SPEED_SIDE) * (GY / 330)
        const flight = Math.hypot(px - bases[bi].x, py - (GY - 16)) / speed + 0.1
        px = tgt.x + tgt.vx * flight
        py = tgt.y + tgt.vy * flight
      }
      if (py > GY - 24) ok = false // too late to save this one cleanly: try the next
      if (!ok) continue
      // a human-ish hand: the aim wanders more as the waves quicken
      const err = 3 + wave * 1.1
      px += (V() - 0.5) * err
      py += (V() - 0.5) * err
      if (fireAt(px, py)) {
        shots[shots.length - 1].target = tgt.id
        botAimX = px
        botAimY = py
      }
      return
    }
  }

  /* ---------------------------------------------------------- simulation */

  function step(dt: number, bot: boolean) {
    phaseT += dt
    if (phase === 'intro') {
      if (phaseT > 1.8) {
        phase = 'fight'
        phaseT = 0
      }
    }
    if (phase === 'fight') {
      launchT -= dt
      if (launchT <= 0 && toLaunch > 0) {
        const k = Math.min(toLaunch, 2 + Math.floor(R() * Math.min(4, 1.2 + wave * 0.5)))
        for (let i = 0; i < k; i++) launch()
        toLaunch -= k
        launchT = lerp(3.2, 1.1, clamp((wave - 1) / 8)) * (0.7 + R() * 0.6)
      }
      if (toLaunch <= 0 && !warheads.some((w) => w.alive) && !shots.some((s) => s.alive) && !blasts.some((b) => b.kind !== 2)) beginTally()
      else if (!cities.some((c) => c.alive) && phaseT > 0.5) {
        // nothing left to defend
        lostT += dt
        if (lostT > 1.6) {
          phase = 'end'
          endT = 0
          toLaunch = 0
          // the original's sign-off: one great bloom over the field
          blasts.push({ x: W / 2, y: H * 0.38, rMax: Math.min(W, H) * 0.24, t: 0, dur: 2.8, chain: 0, kind: 2, rot: 0.4, caught: 0 })
          shake = 5
          sfx.tone(196, 1.4, { type: 'triangle', gain: 0.05 })
          sfx.tone(233, 1.4, { type: 'triangle', gain: 0.04, when: 0.06 })
          sfx.tone(147, 1.8, { type: 'sine', gain: 0.05, when: 0.12 })
        }
      }
    }

    // input
    if (bot) botThink(dt)
    else if (phase === 'fight' || phase === 'intro') {
      const sp = 280 * dt
      if (keys.down('ArrowLeft', 'KeyJ')) cx -= sp
      if (keys.down('ArrowRight', 'KeyL')) cx += sp
      if (keys.down('ArrowUp', 'KeyI')) cy -= sp
      if (keys.down('ArrowDown', 'KeyK')) cy += sp
      cx = clamp(cx, 4, W - 4)
      cy = clamp(cy, 8, GY - 20)
      if (keys.hit('Space', 'KeyZ', 'KeyX', 'Enter')) fireAt(cx, cy)
      if (keys.hit('KeyA')) fireAt(cx, cy, 0)
      if (keys.hit('KeyS')) fireAt(cx, cy, 1)
      if (keys.hit('KeyD')) fireAt(cx, cy, 2)
      while (fireQueue.length) {
        const q = fireQueue.shift()!
        cx = clamp(q.x, 4, W - 4)
        cy = clamp(q.y, 8, GY - 20)
        shotTouch = q.touch
        fireAt(q.x, q.y)
        shotTouch = false
      }
    }
    fireQueue.length = 0

    // warheads
    for (const wh of warheads) {
      if (!wh.alive) {
        if (wh.fade > 0) wh.fade += dt
        continue
      }
      wh.x += wh.vx * dt
      wh.y += wh.vy * dt
      if (wh.split > 0 && wh.y >= wh.split) splitWarhead(wh)
      else if (wh.y >= GY - 1) impact(wh)
    }
    // shots
    for (const s of shots) {
      if (!s.alive) continue
      s.d += s.speed * dt
      const k = Math.min(1, s.d / (s.total || 1))
      s.x = lerp(s.bx, s.tx, k)
      s.y = lerp(s.by, s.ty, k)
      if (k >= 1) {
        s.alive = false
        detonate(s.tx, s.ty, 0, 0, s.touch)
      }
    }
    // blasts: grow, catch, chain
    for (const b of blasts) b.t += dt
    const n0 = blasts.length
    for (let i = 0; i < n0; i++) {
      const b = blasts[i]
      if (b.kind === 2 || b.t >= b.dur) continue
      const r = blastR(b) + 1.5
      for (const wh of warheads) {
        if (!wh.alive) continue
        const dx = wh.x - b.x
        const dy = wh.y - b.y
        if (dx * dx + dy * dy < r * r) {
          b.caught++
          destroyWarhead(wh, b.chain + 1)
        }
      }
    }
    if (blasts.some((b) => b.t >= b.dur)) {
      for (const b of blasts) if (b.t >= b.dur && b.kind === 0) judgeShot(b)
      blasts = blasts.filter((b) => b.t < b.dur)
    }
    noAmmoT -= dt
    if (warheads.length > 60) warheads = warheads.filter((w) => w.alive || w.fade < 0.6)
    if (shots.length > 40) shots = shots.filter((s) => s.alive)
    for (const c of cities) c.hitT += dt
    for (const b of bases) b.hitT += dt

    // tally
    if (phase === 'tally') stepTally(dt)
    if (phase === 'end') {
      endT += dt
      if (endT > 2.9) {
        if (state === 'play') go('over')
        newGame()
      }
    }
  }

  function beginTally() {
    phase = 'tally'
    phaseT = 0
    tallyAmmoTotal = bases.reduce((s, b) => s + (b.alive ? b.ammo : 0), 0)
    tallyCityTotal = cities.filter((c) => c.alive).length
    tallyAmmo = 0
    tallyCities = 0
    tallyPoints = 0
    tallyStep = 0
    tallyClock = 0
  }

  function stepTally(dt: number) {
    tallyClock += dt
    if (tallyCityTotal === 0) {
      phase = 'end'
      endT = 0
      sfx.tone(196, 1.2, { type: 'triangle', gain: 0.05 })
      sfx.tone(233, 1.2, { type: 'triangle', gain: 0.04, when: 0.05 })
      return
    }
    if (tallyClock < 0.8) return
    tallyStep -= dt
    if (tallyStep > 0) return
    if (tallyAmmo < tallyAmmoTotal) {
      tallyAmmo++
      tallyPoints += 5 * mult()
      score += 5 * mult()
      // take a missile off the pile it came from
      const b = bases.find((bb) => bb.alive && bb.ammo > 0)
      if (b) b.ammo--
      tallyStep = 0.055
      sfx.tone(1319, 0.03, { type: 'sine', gain: 0.025 })
    } else if (tallyCities < tallyCityTotal) {
      tallyCities++
      tallyPoints += 100 * mult()
      score += 100 * mult()
      const c = cities.filter((cc) => cc.alive)[tallyCities - 1]
      if (c) {
        c.hitT = -0.5 // a little flourish
        sparks.emit(c.x, GY - 22, preview ? 3 : 8, { speed: 60, life: 0.5, color: C.moss, dir: -Math.PI / 2, spread: 1.6 })
      }
      tallyStep = 0.32
      sfx.tone(NOTES[Math.min(NOTES.length - 1, 2 + tallyCities)], 0.18, { type: 'triangle', gain: 0.05 })
    } else {
      if (tallyStep < -1.4) startWave(wave + 1)
    }
  }

  /* -------------------------------------------------------------- drawing */

  let hair = 1
  const lab = (s: string, x: number, y: number, o: TextOpts = {}) => text(ctx, s, x, y, { ...o, size: (o.size ?? 8.5) / f.s })

  function drawSky() {
    // altitude ruler on the left edge
    ctx.strokeStyle = rgba(C.ink, 0.22)
    ctx.lineWidth = hair
    ctx.beginPath()
    const step = 20
    let i = 0
    for (let y = GY; y > 6; y -= step, i++) {
      const l = i % 5 === 0 ? 7 : 3.5
      ctx.moveTo(0, y)
      ctx.lineTo(l, y)
    }
    ctx.stroke()
    if (!preview) {
      i = 0
      for (let y = GY; y > 30; y -= step * 5, i++) if (i > 0) lab(`${i * 1000}`, 10, y + 3 / f.s, { size: 7.5, color: rgba(C.ink, 0.4) })
      lab('ALT M', 10, 16, { size: 7.5, color: rgba(C.ink, 0.4) })
    }
  }

  function drawGround() {
    // hatched earth below the ground line
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, GY, W, H - GY)
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.lineWidth = hair
    ctx.beginPath()
    for (let x = -H; x < W + H; x += 5) {
      ctx.moveTo(x, H)
      ctx.lineTo(x + (H - GY), GY)
    }
    ctx.stroke()
    ctx.restore()
    // the ground line, rising over the three mounds
    ctx.strokeStyle = C.ink
    ctx.lineWidth = hair * 1.2
    ctx.beginPath()
    ctx.moveTo(0, GY)
    for (const b of bases) {
      ctx.lineTo(b.x - 26 * U, GY)
      ctx.lineTo(b.x - 15 * U, GY - 14)
      ctx.lineTo(b.x + 15 * U, GY - 14)
      ctx.lineTo(b.x + 26 * U, GY)
    }
    ctx.lineTo(W, GY)
    ctx.stroke()
    // mound hatching and ammo piles
    for (let i = 0; i < bases.length; i++) {
      const b = bases[i]
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(b.x - 26 * U, GY)
      ctx.lineTo(b.x - 15 * U, GY - 14)
      ctx.lineTo(b.x + 15 * U, GY - 14)
      ctx.lineTo(b.x + 26 * U, GY)
      ctx.closePath()
      ctx.clip()
      ctx.strokeStyle = rgba(C.ink, b.alive ? 0.32 : 0.55)
      ctx.beginPath()
      const g = b.alive ? 3 : 2
      for (let x = b.x - 40; x < b.x + 40; x += g) {
        ctx.moveTo(x, GY)
        ctx.lineTo(x + 14, GY - 14)
      }
      ctx.stroke()
      ctx.restore()
      if (!b.alive) {
        // a crater notch
        ctx.strokeStyle = C.ink
        ctx.beginPath()
        ctx.moveTo(b.x - 9, GY - 14)
        ctx.lineTo(b.x - 4, GY - 9)
        ctx.lineTo(b.x + 2, GY - 12)
        ctx.lineTo(b.x + 8, GY - 8)
        ctx.lineTo(b.x + 11, GY - 14)
        ctx.stroke()
        continue
      }
      // ammo: a little pyramid of rounds on the mound, rows 4·3·2·1
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hair * 1.1
      ctx.beginPath()
      let k = 0
      for (let row = 0; row < 4; row++) {
        const nInRow = 4 - row
        for (let j = 0; j < nInRow; j++, k++) {
          if (k >= b.ammo) break
          const x = b.x + (j - (nInRow - 1) / 2) * 5 * Math.max(0.8, U)
          const y = GY - 16 - row * 4.6
          ctx.moveTo(x, y)
          ctx.lineTo(x, y - 3.2)
          ctx.moveTo(x - 1.2, y - 2)
          ctx.lineTo(x, y - 3.4)
          ctx.lineTo(x + 1.2, y - 2)
        }
      }
      ctx.stroke()
      if (!preview) lab(String(b.ammo).padStart(2, '0'), b.x, GY + 11, { size: 8, color: b.ammo <= 2 ? C.ocean : C.ink2, align: 'center', baseline: 'middle' })
    }
  }

  function drawCities() {
    ctx.lineWidth = hair
    for (const c of cities) {
      if (!c.alive) {
        // rubble, hatched
        ctx.strokeStyle = C.ink
        ctx.beginPath()
        ctx.moveTo(c.x + c.rubble[0], GY + c.rubble[1])
        for (let i = 2; i < c.rubble.length; i += 2) ctx.lineTo(c.x + c.rubble[i], GY + c.rubble[i + 1])
        ctx.stroke()
        ctx.strokeStyle = rgba(C.ink, 0.4)
        ctx.beginPath()
        for (let x = -14 * U; x < 14 * U; x += 2.4) {
          ctx.moveTo(c.x + x, GY)
          ctx.lineTo(c.x + x + 1.6, GY - 1.8)
        }
        ctx.stroke()
        // smoke: two thin rising wisps for a while
        if (c.hitT < 6 && !preview) {
          ctx.strokeStyle = rgba(C.ink, 0.25 * (1 - c.hitT / 6))
          ctx.beginPath()
          for (let s = 0; s < 2; s++) {
            const ox = c.x - 5 + s * 9
            for (let k = 0; k <= 8; k++) {
              const yy = GY - 4 - k * 3 - c.hitT * 4
              const xx = ox + Math.sin(k * 0.8 + c.hitT * 2 + s) * 1.8 * (k / 8)
              if (k === 0) ctx.moveTo(xx, yy)
              else ctx.lineTo(xx, yy)
            }
          }
          ctx.stroke()
        }
        continue
      }
      const lift = c.hitT < 0 ? Math.sin((c.hitT + 0.5) * Math.PI * 2) * 1.2 : 0
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      for (const b of c.b) {
        const x = c.x + b.x
        ctx.moveTo(x, GY)
        ctx.lineTo(x, GY - b.h - lift)
        ctx.lineTo(x + b.w, GY - b.h - lift)
        ctx.lineTo(x + b.w, GY)
        if (b.antenna) {
          ctx.moveTo(x + b.w / 2, GY - b.h - lift)
          ctx.lineTo(x + b.w / 2, GY - b.h - lift - 4.5)
        }
      }
      ctx.stroke()
      ctx.fillStyle = rgba(C.ink, 0.5)
      ctx.beginPath()
      for (const b of c.b) for (let i = 0; i < b.win.length; i += 2) ctx.rect(c.x + b.win[i], GY + b.win[i + 1] - lift, 0.9, 0.9)
      ctx.fill()
      ctx.fillStyle = C.lagoon
      ctx.beginPath()
      for (const b of c.b) for (let i = 0; i < b.lit.length; i += 2) ctx.rect(c.x + b.lit[i] - 0.1, GY + b.lit[i + 1] - 0.1 - lift, 1.1, 1.1)
      ctx.fill()
    }
  }

  function drawWarheads() {
    // trails: straight hairlines from launch to head
    ctx.lineWidth = hair
    ctx.strokeStyle = rgba(C.ink, 0.62)
    ctx.beginPath()
    for (const wh of warheads) {
      if (!wh.alive) continue
      ctx.moveTo(wh.sx, wh.sy)
      ctx.lineTo(wh.x, wh.y)
    }
    ctx.stroke()
    for (const wh of warheads) {
      if (wh.alive || wh.fade <= 0 || wh.fade > 0.6) continue
      ctx.strokeStyle = rgba(C.ink, 0.5 * (1 - wh.fade / 0.6))
      ctx.beginPath()
      ctx.moveTo(wh.sx, wh.sy)
      ctx.lineTo(wh.x, wh.y)
      ctx.stroke()
    }
    // heads
    ctx.fillStyle = C.ink
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    for (const wh of warheads) {
      if (!wh.alive) continue
      const s = 1.5
      if (wh.split > 0) {
        // a splitter reads as a small diamond
        ctx.moveTo(wh.x, wh.y - 2.6)
        ctx.lineTo(wh.x + 2.2, wh.y)
        ctx.lineTo(wh.x, wh.y + 2.6)
        ctx.lineTo(wh.x - 2.2, wh.y)
        ctx.closePath()
      } else ctx.rect(wh.x - s / 2, wh.y - s / 2, s, s)
    }
    ctx.fill()
  }

  function drawShots() {
    ctx.lineWidth = hair
    ctx.strokeStyle = C.moss
    ctx.setLineDash([3 / f.s, 3 / f.s])
    ctx.beginPath()
    for (const s of shots) {
      if (!s.alive) continue
      ctx.moveTo(s.bx, s.by)
      ctx.lineTo(s.x, s.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    for (const s of shots) {
      if (!s.alive) continue
      // target cross
      const r = 3.2
      ctx.moveTo(s.tx - r, s.ty - r)
      ctx.lineTo(s.tx + r, s.ty + r)
      ctx.moveTo(s.tx + r, s.ty - r)
      ctx.lineTo(s.tx - r, s.ty + r)
      // head: a short chevron along the path
      const ux = (s.tx - s.bx) / (s.total || 1)
      const uy = (s.ty - s.by) / (s.total || 1)
      ctx.moveTo(s.x - ux * 3 - uy * 1.6, s.y - uy * 3 + ux * 1.6)
      ctx.lineTo(s.x, s.y)
      ctx.lineTo(s.x - ux * 3 + uy * 1.6, s.y - uy * 3 - ux * 1.6)
    }
    ctx.stroke()
  }

  function drawBlasts() {
    for (const b of blasts) {
      const r = blastR(b)
      if (r < 0.3) continue
      const k = b.t / b.dur
      const col = b.kind === 0 ? C.moss : b.kind === 1 ? C.ocean : C.ink2
      const grounded = b.kind === 2 && b.y > GY - 20
      ctx.save()
      if (grounded) {
        // impacts bloom as a dome above the ground line
        ctx.beginPath()
        ctx.rect(0, 0, W, GY)
        ctx.clip()
      }
      // fine hatching inside, rotating slowly
      ctx.save()
      ctx.beginPath()
      ctx.arc(b.x, b.y, r, 0, TAU)
      ctx.clip()
      ctx.strokeStyle = rgba(col, b.kind === 2 ? 0.45 : 0.6)
      ctx.lineWidth = hair
      ctx.beginPath()
      const a = b.rot + b.t * 0.6
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const gap = b.kind === 2 ? 2.4 : 2.1
      for (let d = -r; d <= r; d += gap) {
        const px = b.x - sa * d
        const py = b.y + ca * d
        ctx.moveTo(px - ca * r, py - sa * r)
        ctx.lineTo(px + ca * r, py + sa * r)
      }
      ctx.stroke()
      ctx.restore()
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hair * (k < 0.26 ? 1.5 : 1.1)
      ctx.beginPath()
      ctx.arc(b.x, b.y, r, 0, TAU)
      ctx.stroke()
      // a hairline shock ring on arrival
      if (k < 0.3) {
        ctx.strokeStyle = rgba(C.ink, 0.5 * (1 - k / 0.3))
        ctx.lineWidth = hair
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.rMax * (0.6 + (k / 0.3) * 0.75), 0, TAU)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  /** where each live warhead will land: small ticks in the earth band */
  function drawImpactTicks() {
    if (preview) return
    ctx.strokeStyle = rgba(C.ocean, 0.75)
    ctx.lineWidth = hair
    ctx.beginPath()
    for (const wh of warheads) {
      if (!wh.alive) continue
      ctx.moveTo(wh.tx - 1.8, GY + 2)
      ctx.lineTo(wh.tx + 1.8, GY + 2)
      ctx.lineTo(wh.tx, GY + 5)
      ctx.closePath()
    }
    ctx.stroke()
  }

  /** a player blast has run its course: count misses, teach once, then step aside */
  function judgeShot(b: Blast) {
    if (state !== 'play' || forceBot) return
    if (b.caught > 0) {
      misses = 0
      if (hint < 2) {
        hint = 2
        env.store.set('hinted', '1')
      }
      return
    }
    misses++
    if (misses >= 2 && aimPrompts < 3 && phase === 'fight') {
      labels.push({ x: b.x, y: b.y - b.rMax - 6, s: 'AIM AHEAD OF THE TRAIL', t: 0, tip: true })
      aimPrompts++
      misses = 0
    }
  }

  /** the first seconds of a first game: a ghost shot from the middle base, and the words */
  function drawGhost() {
    if (hint !== 0 || state !== 'play' || forceBot || preview) return
    const bx = bases[1].x
    const by = GY - 16
    const tx = W * 0.5 + Math.sin(stateT * 0.5) * W * 0.12
    const ty = H * 0.58
    const cyc = (stateT % 2.4) / 2.4
    const k = clamp(stateT / 0.6)
    ctx.globalAlpha = k * 0.85
    ctx.strokeStyle = C.moss
    ctx.lineWidth = hair
    ctx.setLineDash([2 / f.s, 4 / f.s])
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.setLineDash([])
    const travel = clamp(cyc / 0.45)
    if (cyc < 0.45) {
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(lerp(bx, tx, travel), lerp(by, ty, travel), 1.6, 0, TAU)
      ctx.fill()
    } else {
      const g = (cyc - 0.45) / 0.55
      ctx.globalAlpha = k * 0.85 * (1 - g)
      ctx.setLineDash([1.5 / f.s, 2.5 / f.s])
      ctx.beginPath()
      ctx.arc(tx, ty, BLAST_R * ease.outCubic(clamp(g * 2)), 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = k
    const r = 3.4
    ctx.beginPath()
    ctx.moveTo(tx - r, ty - r)
    ctx.lineTo(tx + r, ty + r)
    ctx.moveTo(tx + r, ty - r)
    ctx.lineTo(tx - r, ty + r)
    ctx.stroke()
    lab(lastTouch ? 'TAP THE SKY TO FIRE' : 'CLICK THE SKY TO FIRE', tx, ty - BLAST_R - 8, { size: 9, color: C.moss, align: 'center', tracking: 0.2 })
    ctx.globalAlpha = 1
  }

  /** under a mouse: which base will answer, and the path it will take */
  function drawAim() {
    if (state !== 'play' || forceBot || !hoverIn || lastTouch || (phase !== 'fight' && phase !== 'intro')) return
    if (cy > GY - 20) return
    let bi = -1
    let best = Infinity
    bases.forEach((b, i) => {
      if (!b.alive || b.ammo <= 0) return
      const d = Math.abs(b.x - cx) * (i === 1 ? 0.8 : 1)
      if (d < best) {
        best = d
        bi = i
      }
    })
    if (bi < 0) return
    const b = bases[bi]
    ctx.strokeStyle = rgba(C.moss, 0.35)
    ctx.lineWidth = hair
    ctx.setLineDash([1 / f.s, 5 / f.s])
    ctx.beginPath()
    ctx.moveTo(b.x, GY - 16)
    ctx.lineTo(cx, cy)
    ctx.stroke()
    ctx.setLineDash([])
    // brackets on the answering mound
    ctx.strokeStyle = C.moss
    const x0 = b.x - 17 * U
    const x1 = b.x + 17 * U
    const y0 = GY - 37
    ctx.beginPath()
    ctx.moveTo(x0, y0 + 4)
    ctx.lineTo(x0, y0)
    ctx.lineTo(x0 + 4, y0)
    ctx.moveTo(x1 - 4, y0)
    ctx.lineTo(x1, y0)
    ctx.lineTo(x1, y0 + 4)
    ctx.stroke()
  }

  function updateCursor() {
    if (env.mode !== 'full') return
    if (state === 'title' || state === 'over') return env.setCursor('pointer')
    if (forceBot) return env.setCursor('default')
    env.setCursor(hoverIn && cy < GY - 20 ? 'crosshair' : 'default')
  }

  function drawReticle(x: number, y: number, a: number, col: string) {
    ctx.globalAlpha = a
    ctx.strokeStyle = col
    ctx.lineWidth = hair
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, TAU)
    ctx.moveTo(x - 10, y)
    ctx.lineTo(x - 6.5, y)
    ctx.moveTo(x + 6.5, y)
    ctx.lineTo(x + 10, y)
    ctx.moveTo(x, y - 10)
    ctx.lineTo(x, y - 6.5)
    ctx.moveTo(x, y + 6.5)
    ctx.lineTo(x, y + 10)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawLabels(dt: number) {
    for (const l of labels) l.t += dt
    const life = (l: Label) => (l.tip ? 2.2 : 1.4)
    if (labels.some((l) => l.t > life(l))) labels = labels.filter((l) => l.t <= life(l))
    if (state === 'title' || state === 'over') return
    for (const l of labels) {
      const k = l.t / life(l)
      const rise = l.tip ? 4 : 10
      lab(l.s, clamp(l.x, 60, W - 60), Math.max(16, l.y) - ease.outCubic(k) * rise, { size: l.tip ? 9 : 8.5, color: l.tip ? C.moss : C.ocean, align: 'center', alpha: 1 - k * k, tracking: l.tip ? 0.18 : undefined })
    }
  }

  function drawOverlay() {
    const midX = W / 2
    const quiet = state === 'title' || state === 'over' // the card speaks; keep the field's text down
    if (phase === 'intro') {
      const a = clamp(phaseT / 0.25) * clamp((1.8 - phaseT) / 0.4)
      if (!preview && !quiet) {
        ctx.globalAlpha = a
        lab(`WAVE ${String(wave).padStart(2, '0')}`, midX, H * 0.34, { size: 12, color: C.ink, align: 'center', tracking: 0.3 })
        lab(`${mult()}× POINTS`, midX, H * 0.34 + 18 / f.s, { size: 9, color: C.muted, align: 'center' })
        lab('DEFEND CITIES', midX, H * 0.34 + 34 / f.s, { size: 9, color: C.moss, align: 'center' })
        ctx.globalAlpha = 1
      }
      // arrows over each living city
      if (blink(phaseT, 2.6)) {
        ctx.strokeStyle = C.moss
        ctx.lineWidth = hair * 1.2
        ctx.beginPath()
        for (const c of cities) {
          if (!c.alive) continue
          const y = GY - 34
          ctx.moveTo(c.x, y - 9)
          ctx.lineTo(c.x, y)
          ctx.moveTo(c.x - 3, y - 3.5)
          ctx.lineTo(c.x, y)
          ctx.lineTo(c.x + 3, y - 3.5)
        }
        ctx.stroke()
      }
    }
    if (phase === 'tally' && preview) {
      const a = clamp(phaseT / 0.3)
      lab(`WAVE ${String(wave).padStart(2, '0')} HELD  +${tallyPoints}`, midX, H * 0.36, { size: 10, color: C.moss, align: 'center', tracking: 0.14, alpha: a })
    }
    if (phase === 'tally' && !preview && !quiet) {
      const a = clamp(phaseT / 0.3)
      ctx.globalAlpha = a
      const y = H * 0.3
      lab(`WAVE ${String(wave).padStart(2, '0')} HELD`, midX, y, { size: 12, color: C.ink, align: 'center', tracking: 0.3 })
      lab('BONUS', midX, y + 22 / f.s, { size: 8.5, color: C.muted, align: 'center', tracking: 0.2 })
      // tick rows: one tick per round counted, one block per city
      const rowY = y + 40 / f.s
      lab(`AMMO  ${String(tallyAmmo).padStart(2, '0')} × ${5 * mult()}`, midX - 70, rowY, { size: 9, color: C.ink2 })
      lab(`CITIES  ${tallyCities} × ${100 * mult()}`, midX - 70, rowY + 16 / f.s, { size: 9, color: C.ink2 })
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hair
      ctx.beginPath()
      for (let i = 0; i < tallyAmmo; i++) {
        const x = midX + 30 + i * 2.4 + Math.floor(i / 5) * 1.6
        const yy = rowY - 1
        ctx.moveTo(x, yy)
        ctx.lineTo(x, yy - (i % 5 === 4 ? 6.5 : 5))
      }
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i < tallyCities; i++) {
        const x = midX + 30 + i * 7
        const yy = rowY + 16 / f.s - 1
        ctx.rect(x, yy - 5, 5, 5)
      }
      ctx.stroke()
      lab(`+${tallyPoints}`, midX, rowY + 40 / f.s, { size: 12, color: C.moss, align: 'center', tracking: 0.06 })
      ctx.globalAlpha = 1
    }
    if (phase === 'end') {
      const a = clamp((endT - 0.3) / 0.5)
      ctx.globalAlpha = a
      const tw = 120 / f.s
      const th = 26 / f.s
      ctx.fillStyle = C.paper
      ctx.fillRect(midX - tw / 2, H * 0.38 - th / 2, tw, th)
      ctx.strokeStyle = C.ink
      ctx.lineWidth = hair
      ctx.strokeRect(midX - tw / 2, H * 0.38 - th / 2, tw, th)
      lab('THE END', midX + 3.5 / f.s, H * 0.38, { size: 13, color: C.ink, align: 'center', baseline: 'middle', tracking: 0.5 })
      ctx.globalAlpha = 1
    }
  }

  /* ---------------------------------------------------------- lifecycle */

  newGame()
  const ps = env.params.get('state')
  if (env.mode === 'full') {
    if (ps === 'play') go('play')
    else if (ps === 'over') {
      state = 'over'
      shown = 31275
    }
  }

  return {
    resize(w, h) {
      layout(w, h)
    },
    key(code, down) {
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', ...START_KEYS])
    },
    pointer(p) {
      const q = toField(f, p.x, p.y)
      if (p.type === 'down') lastTouch = p.pointerType === 'touch'
      hoverIn = p.type !== 'leave' && p.pointerType !== 'touch' && q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H
      if (p.type === 'move' || p.type === 'down') {
        pointerSeen = true
        if (state === 'play') {
          cx = clamp(q.x, 4, W - 4)
          cy = clamp(q.y, 8, GY - 20)
        }
      }
      if (p.type === 'down') {
        if (state === 'play' && !forceBot) fireQueue.push({ x: q.x, y: q.y, touch: p.pointerType === 'touch' })
        else tapQueued = true
      }
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || tapQueued
      tapQueued = false
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        keys.endFrame()
      }

      if (dt > 0) {
        const bot = state !== 'play' || forceBot
        const n = Math.max(1, Math.ceil(dt / 0.0175))
        for (let i = 0; i < n; i++) step(dt / n, bot)
        sparks.update(dt, 160, 2.4)
      }
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
      drawSky()
      drawWarheads()
      drawShots()
      drawBlasts()
      drawCities()
      drawGround()
      drawImpactTicks()
      sparks.draw(ctx, hair)
      drawGhost()
      drawAim()
      drawLabels(dt)
      drawOverlay()
      const botView = state !== 'play' || forceBot
      if (botView) {
        if (botAimX >= 0 && phase === 'fight') drawReticle(botAimX, botAimY, 0.45, C.ocean)
      } else if (phase !== 'end') drawReticle(cx, cy, pointerSeen || keys.down('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown') ? 0.9 : 0.6, C.ink)
      ctx.restore()
      ctx.restore()
      updateCursor()

      gameHud(ctx, f, env.mode, [
        { label: 'Score', value: fmtScore(state === 'over' ? shown : score) },
        { label: 'Wave', value: String(wave).padStart(2, '0') },
        { label: 'Mult', value: `${mult()}×` },
      ], [{ label: 'Best', value: fmtScore(Math.max(hi.get(), state === 'play' ? score : 0)) }])

      const x0 = f.ox
      const y0 = f.oy
      const cw = f.lw * f.s
      const ch = f.lh * f.s
      if (state === 'title')
        card(ctx, x0, y0, cw, ch, {
          kicker: KICKER,
          title: 'Intercept',
          lines: cw < 380 ? ['Tap the sky to fire'] : ['Click or tap the sky to fire from the nearest base', 'Keys: arrows aim · Space fires · A S D pick a base'],
          prompt: 'Press Enter · Tap to start',
          t,
          appear: stateT * 2,
        })
      if (state === 'over')
        card(ctx, x0, y0, cw, ch, {
          kicker: newRecord ? 'The end · new best' : 'The end',
          title: fmtScore(shown),
          lines: [`Best ${fmtScore(Math.max(hi.get(), shown))}`],
          prompt: 'Press Enter · Tap to defend again',
          t,
          appear: stateT * 2,
        })

      keys.endFrame()
    },
  }
}

export default create
