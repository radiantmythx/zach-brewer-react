/*
 * PYRAMID — after Q*bert (Gottlieb, 1982).
 *
 * An isometric pyramid of 28 cubes in seven courses, drawn as an axonometric
 * plate: each cube's three faces told apart by hatch direction and density,
 * every hatch computed analytically (parallel strokes between two edges, no
 * clipping). Hop a cube and its top changes state; later rounds need two steps,
 * or toggle back. The hero is a round creature with a tubular snout and feet;
 * ocean balls roll down, a lagoon ball hatches into a coiled spring that
 * chases, a fern ball freezes time, and two spinning discs carry the hero to
 * the apex — and lure the spring off the edge.
 */

import { C, card, clamp, ease, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, rgba, rng, Rings, setFont, Sparks, START_KEYS, TAU, text, toField, Touch } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. G.10 — AFTER Q*BERT, 1982'

const ROWS = 7
const A = 20 // half-width of a cube's top
const B = 11 // half-height of a cube's top
const HH = 20 // height of a cube's side
const DY = B + HH // course to course
const LW = 340
const LH = 306
const Y0 = 62 // apex top centre
const cx = (r: number, c: number) => LW / 2 + (2 * c - r) * A
const cy = (r: number) => Y0 + r * DY
const onPyr = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c <= r
const idx = (r: number, c: number) => (r * (r + 1)) / 2 + c
const NCUBES = 28

// moves: 0 up-right · 1 down-right · 2 down-left · 3 up-left
const MR = [-1, 1, 1, -1]
const MC = [0, 1, 0, -1]

const PALETTE = [C.moss, C.ocean, C.lagoon, C.fern]

type State = 'attract' | 'title' | 'play' | 'over'
type Phase = 'intro' | 'play' | 'dying' | 'clear'
type Kind = 'hero' | 'ball' | 'coilball' | 'coily' | 'green'

interface Hopper {
  kind: Kind
  r: number
  c: number
  tr: number
  tc: number
  p: number // hop progress; −1 at rest
  dur: number
  rest: number // seconds until the next hop
  face: number // last move
  x: number
  y: number
  land: number // squash timer
  fall: number // > 0 while falling off the pyramid
  vy: number
  behind: boolean
  drop: number // > 0 while dropping in from above
  hatch: number // coil ball → spring
  dead: boolean
}

interface Disc {
  r: number
  c: number // −1 (left) or r + 1 (right)
  used: boolean
  ride: number // > 0 while carrying the hero
  x: number
  y: number
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(preview ? 60 : 220)
  const rings = new Rings()
  // compact frames (short screens, previews) crop the plate to the pyramid and
  // its discs, and drop the drafting annotations (the HUD carries the counts)
  let trimX = 0
  let trimB = 0
  const fitFor = (w: number, h: number) => {
    const f0 = gameFit(w, h, env.mode, LW, LH)
    trimX = f0.compact ? 14 : 0
    trimB = f0.compact ? 22 : 0
    return f0.compact ? gameFit(w, h, env.mode, LW - trimX * 2, LH - trimB) : f0
  }
  let f = fitFor(env.width, env.height)
  /** a label size in plate units that never renders below `minPx` CSS pixels */
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
  let phase: Phase = 'intro'
  let phaseT = 0
  let r = rng(3)
  const tops = new Uint8Array(NCUBES)
  const flash = new Float32Array(NCUBES) // pop when a top changes
  let mode = 0 // 0 one step · 1 two steps · 2 toggle · 3 two steps, reverting
  let speedK = 1
  let enemies: Hopper[] = []
  let discs: Disc[] = []
  let spawnT = 0
  let coilT = 0
  let greenT = 0
  let freezeT = 0
  let deathKind: 'caught' | 'fell' = 'caught'
  let bubbleX = 0
  let bubbleY = 0
  let shake = 0
  let px = 1
  let fresh = true // the first drop of a course marks the apex

  const mk = (kind: Kind, rr: number, c: number): Hopper => ({ kind, r: rr, c, tr: rr, tc: c, p: -1, dur: 0.3, rest: 0.3, face: 1, x: cx(rr, c), y: cy(rr), land: 0, fall: 0, vy: 0, behind: false, drop: 0, hatch: 0, dead: false })
  const hero = mk('hero', 0, 0)

  const target = () => (mode === 0 || mode === 2 ? 1 : 2)
  const done = (i: number) => tops[i] === target()

  function startLevel(lv: number) {
    level = lv
    mode = (lv - 1) % 4
    speedK = 1 + Math.floor((lv - 1) / 4) * 0.18 + ((lv - 1) % 4) * 0.04
    tops.fill(0)
    flash.fill(0)
    r = rng(3 + lv * 71)
    const rows = [[3, 5], [4, 2], [2, 4], [5, 3]][(lv - 1) % 4]
    discs = [
      { r: rows[0], c: -1, used: false, ride: 0, x: 0, y: 0 },
      { r: rows[1], c: rows[1] + 1, used: false, ride: 0, x: 0, y: 0 },
    ]
    respawn()
    fresh = true
    phase = 'intro'
    phaseT = 0
  }

  function respawn() {
    Object.assign(hero, mk('hero', 0, 0))
    hero.drop = 0.5
    hero.face = 1
    enemies = []
    spawnT = 2.4
    coilT = 4.5
    greenT = 14
    freezeT = 0
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
    if (next === 'play') newGame()
    if (next === 'over') {
      finalScore = score
      newRecord = hi.submit(score)
      newGame()
    }
  }

  /* ----------------------------------------------------------------- sound */

  const PENT = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047]
  const sHop = (rr: number) => sfx.tone(PENT[clamp(10 - rr, 0, 10)], 0.07, { type: 'triangle', gain: 0.055, to: PENT[clamp(10 - rr, 0, 10)] * 1.5, room: 0.08 })

  /* ---------------------------------------------------------------- moves */

  function discAt(rr: number, c: number) {
    return discs.find((d) => !d.used && d.r === rr && d.c === c)
  }

  function startHop(h: Hopper, m: number, dur: number) {
    h.tr = h.r + MR[m]
    h.tc = h.c + MC[m]
    h.p = 0
    h.dur = dur
    h.face = m
    h.behind = m === 0 || m === 3
  }

  function landTop(i: number) {
    const tg = target()
    const before = tops[i]
    if (mode === 0) tops[i] = 1
    else if (mode === 1) tops[i] = Math.min(2, tops[i] + 1)
    else if (mode === 2) tops[i] = tops[i] ? 0 : 1
    else tops[i] = tops[i] === 2 ? 1 : tops[i] + 1
    if (tops[i] !== before) {
      flash[i] = 1
      if (tops[i] === tg) score += 25
      else if (tops[i] > before) score += 15
    }
  }

  function heroMove(m: number) {
    if (hero.p >= 0 || hero.fall > 0 || hero.drop > 0 || phase !== 'play') return
    startHop(hero, m, 0.3)
    sHop(hero.tr)
  }

  /* ------------------------------------------------------------------- bot */

  function heroOcc() {
    return hero.p >= 0 && hero.p < 0.55 ? [hero.r, hero.c] : [hero.tr, hero.tc]
  }

  function coilyChoice(e: Hopper): number {
    // the spring chases the hero's cube (or the cube it left by disc)
    let [hr, hc] = heroOcc()
    if (lure) {
      hr = lure.r
      hc = lure.c
      if (e.r === lure.r && e.c === lure.c) return lure.m // follow it off the edge
    }
    const tx = cx(hr, hc)
    const ty = cy(hr)
    let best = 2
    let bd = Infinity
    for (let m = 0; m < 4; m++) {
      const nr = e.r + MR[m]
      const nc = e.c + MC[m]
      if (!onPyr(nr, nc)) continue
      const d = Math.hypot(cx(nr, nc) - tx, cy(nr) - ty)
      if (d < bd) {
        bd = d
        best = m
      }
    }
    return best
  }

  /** Cubes an enemy might stand on within the next `win` seconds. */
  function threat(e: Hopper, win: number, out: Set<number>) {
    if (e.dead || e.fall > 0) return
    if (e.drop > 0) {
      // about to land on its spawn cube
      out.add(idx(e.r, e.c))
      if (e.drop > win) return
    }
    const occR = e.p >= 0 ? e.tr : e.r
    const occC = e.p >= 0 ? e.tc : e.c
    if (onPyr(occR, occC)) out.add(idx(occR, occC))
    if (e.p >= 0 && e.p < 0.5 && onPyr(e.r, e.c)) out.add(idx(e.r, e.c))
    const nextIn = e.p >= 0 ? (1 - e.p) * e.dur + e.rest : e.rest
    if (nextIn > win || freezeT > 0) return
    const moves = e.kind === 'coily' ? [0, 1, 2, 3] : [1, 2]
    for (const m of moves) {
      const nr = occR + MR[m]
      const nc = occC + MC[m]
      if (onPyr(nr, nc)) out.add(idx(nr, nc))
    }
  }

  function bfsToUnfinished(sr: number, sc: number, blocked: Set<number>) {
    // breadth-first over cubes; finished cubes cost more where re-hopping undoes them
    const dist = new Map<number, number>()
    const q: [number, number, number][] = [[sr, sc, 0]]
    dist.set(idx(sr, sc), 0)
    let best = Infinity
    while (q.length) {
      q.sort((a, b) => a[2] - b[2])
      const [qr, qc, d] = q.shift()!
      if (d >= best) break
      const i = idx(qr, qc)
      if (!done(i)) best = Math.min(best, d)
      for (let m = 0; m < 4; m++) {
        const nr = qr + MR[m]
        const nc = qc + MC[m]
        if (!onPyr(nr, nc)) continue
        const ni = idx(nr, nc)
        if (blocked.has(ni)) continue
        const step = done(ni) && (mode === 2 || mode === 3) ? 3 : 1
        const nd = d + step
        if (nd < (dist.get(ni) ?? Infinity)) {
          dist.set(ni, nd)
          q.push([nr, nc, nd])
        }
      }
    }
    return best
  }

  function botMove(): number {
    const danger = new Set<number>()
    for (const e of enemies) threat(e, 0.45, danger)
    const coily = enemies.find((e) => e.kind === 'coily' && !e.dead && e.fall === 0)
    const coilyD = coily ? Math.abs(coily.r - hero.r) + Math.abs(coily.c - hero.c) : 99
    let best = -1
    let bestV = -Infinity
    for (let m = 0; m < 4; m++) {
      const nr = hero.r + MR[m]
      const nc = hero.c + MC[m]
      let v: number
      if (!onPyr(nr, nc)) {
        if (!discAt(nr, nc)) continue
        // a disc: worth it when the spring is close (and it lures it off)
        v = coily && coilyD <= 3 ? 40 : -30
      } else {
        const ni = idx(nr, nc)
        if (danger.has(ni)) continue
        // distance (in hops) from the landing cube to the nearest unfinished one; 0 if it is one
        const pathLen = bfsToUnfinished(nr, nc, danger)
        v = -(Number.isFinite(pathLen) ? pathLen : 12) * 3
        if (done(ni) && (mode === 2 || mode === 3)) v -= 6
        // keep away from the spring
        if (coily) {
          const d = Math.hypot(cx(nr, nc) - coily.x, cy(nr) - coily.y) / (A * 2)
          v += Math.min(d, 3) * 2.2
        }
        for (const e of enemies) {
          if (e.kind === 'green' && e.r === nr && e.c === nc) v += 8
        }
      }
      v += r() * 0.6
      if (v > bestV) {
        bestV = v
        best = m
      }
    }
    // standing still is fine if nothing threatens this cube
    return best
  }

  /* ---------------------------------------------------------------- update */

  let lure: { r: number; c: number; m: number } | null = null

  function hopPos(h: Hopper) {
    const x0 = h.r < 0 ? LW / 2 : cx(h.r, h.c)
    const y0 = cy(h.r)
    const x1 = cx(h.tr, h.tc)
    const y1 = cy(h.tr)
    const k = clamp(h.p)
    const up = h.tr < h.r
    const lift = (up ? 26 : 13) * 4 * k * (1 - k)
    h.x = lerp(x0, x1, k)
    h.y = lerp(y0, y1, k) - lift
  }

  function killHero(kind: 'caught' | 'fell') {
    if (phase !== 'play') return
    phase = 'dying'
    phaseT = 0
    deathKind = kind
    bubbleX = hero.x
    bubbleY = hero.y
    shake = kind === 'caught' ? 0.35 : 0
    sfx.noise(0.25, { filter: 700, gain: 0.1, q: 2 })
    ;[523, 415, 330, 262].forEach((n, i) => sfx.tone(n, 0.12, { type: 'square', gain: 0.025, filter: 1400, when: i * 0.07 }))
  }

  function spawn(kind: Kind) {
    const e = mk(kind, 1, r() < 0.5 ? 0 : 1)
    e.drop = 0.6
    e.rest = 0.15
    e.face = 2
    enemies.push(e)
  }

  function enemyUpdate(e: Hopper, dt: number) {
    if (e.dead) return
    if (e.fall > 0) {
      e.fall += dt
      e.vy += 900 * dt
      e.y += e.vy * dt
      if (e.y > LH + 60) e.dead = true
      return
    }
    if (e.drop > 0) {
      e.drop = Math.max(0, e.drop - dt)
      e.x = cx(e.r, e.c)
      e.y = cy(e.r) - 160 * Math.pow(e.drop / 0.6, 2)
      if (e.drop === 0) {
        e.land = 1
        if (e.kind === 'ball' || e.kind === 'green') sfx.tone(196, 0.06, { type: 'sine', gain: 0.05 })
      }
      return
    }
    if (freezeT > 0) return
    if (e.kind === 'coilball' && e.hatch > 0) {
      e.hatch += dt
      if (e.hatch > 0.9) {
        e.kind = 'coily'
        e.hatch = 0
        e.rest = 0.3
        sfx.tone(330, 0.2, { type: 'triangle', to: 660, gain: 0.05 })
      }
      return
    }
    if (e.p >= 0) {
      e.p += dt / e.dur
      if (e.p >= 1) {
        e.p = -1
        e.r = e.tr
        e.c = e.tc
        e.land = 1
        if (!onPyr(e.r, e.c)) {
          e.fall = 1e-3
          e.vy = -60
          if (e.kind === 'coily') {
            score += 500
            rings.add(e.x, e.y, 30, 0.7, C.lagoon)
            ;[392, 523, 659, 784, 1047].forEach((n, i) => sfx.tone(n, 0.16, { type: 'triangle', gain: 0.05, when: i * 0.06 }))
          }
        } else {
          e.x = cx(e.r, e.c)
          e.y = cy(e.r)
          if (e.kind === 'coily') sfx.tone(147, 0.09, { type: 'triangle', to: 220, gain: 0.04 })
          else sfx.tone(e.kind === 'green' ? 523 : 247, 0.05, { type: 'sine', gain: 0.035 })
          // the coil ball hatches on the bottom course
          if (e.kind === 'coilball' && e.r === ROWS - 1) e.hatch = 1e-3
        }
      } else hopPos(e)
      return
    }
    e.rest -= dt
    if (e.rest > 0) return
    const base = e.kind === 'coily' ? 0.62 : 0.5
    const restT = (e.kind === 'coily' ? 0.32 : 0.28) / speedK
    if (e.kind === 'coily') startHop(e, coilyChoice(e), 0.34 / speedK)
    else startHop(e, r() < 0.5 ? 1 : 2, (base - 0.18) / speedK)
    e.rest = restT
  }

  function update(dt: number, useBot: boolean) {
    phaseT += dt
    shake = Math.max(0, shake - dt * 2)
    for (let i = 0; i < NCUBES; i++) flash[i] = Math.max(0, flash[i] - dt * 3)
    hero.land = Math.max(0, hero.land - dt * 6)
    for (const e of enemies) e.land = Math.max(0, e.land - dt * 6)
    for (const d of discs) {
      if (!d.ride) {
        d.x = cx(d.r, d.c)
        d.y = cy(d.r) + 6
      }
    }

    if (phase === 'intro') {
      if (hero.drop > 0) {
        hero.drop = Math.max(0, hero.drop - dt)
        hero.x = cx(0, 0)
        hero.y = cy(0) - 150 * Math.pow(hero.drop / 0.5, 2)
        if (hero.drop === 0) {
          hero.land = 1
          if (fresh) landTop(0)
          fresh = false
        }
      }
      if (phaseT > 1.1) {
        phase = 'play'
        phaseT = 0
      }
      return
    }
    if (phase === 'dying') {
      if (deathKind === 'fell') {
        hero.vy += 900 * dt
        hero.y += hero.vy * dt
      }
      if (phaseT > 1.7) {
        lives--
        if (lives <= 0) {
          if (state === 'play') go('over')
          else newGame()
          return
        }
        respawn()
        phase = 'intro'
        phaseT = 0.4
      }
      return
    }
    if (phase === 'clear') {
      if (phaseT > 2.6) {
        score += 1000 + 250 * (level - 1) + discs.filter((d) => !d.used).length * 50
        startLevel(level + 1)
      }
      return
    }

    // --- play
    freezeT = Math.max(0, freezeT - dt)
    // spawns
    if (freezeT <= 0) {
      spawnT -= dt
      coilT -= dt
      greenT -= dt
    }
    const balls = enemies.filter((e) => e.kind === 'ball' && !e.dead).length
    if (spawnT <= 0) {
      if (balls < 1 + Math.min(2, Math.floor(level / 2))) spawn('ball')
      spawnT = (4.6 - Math.min(2, level * 0.3)) * (0.8 + r() * 0.4)
    }
    if (coilT <= 0) {
      if (!enemies.some((e) => (e.kind === 'coily' || e.kind === 'coilball') && !e.dead)) spawn('coilball')
      coilT = 5 + r() * 3
    }
    if (greenT <= 0) {
      if (level >= 2 && !enemies.some((e) => e.kind === 'green' && !e.dead)) spawn('green')
      greenT = 16 + r() * 8
    }

    // hero input
    if (hero.p < 0 && hero.drop === 0 && hero.fall === 0 && !discs.some((d) => d.ride > 0)) {
      let m = -1
      if (useBot) {
        if (hero.rest <= 0) {
          m = botMove()
          hero.rest = m < 0 ? 0.08 : 0.05 + r() * 0.08
        } else hero.rest -= dt
      } else {
        if (keys.hit('ArrowUp', 'KeyE', 'Numpad9')) m = 0
        else if (keys.hit('ArrowRight', 'KeyD', 'KeyC', 'Numpad3')) m = 1
        else if (keys.hit('ArrowDown', 'KeyA', 'KeyZ', 'Numpad1')) m = 2
        else if (keys.hit('ArrowLeft', 'KeyQ', 'Numpad7')) m = 3
        else if (queued >= 0) m = queued
        if (touchMove >= 0) m = touchMove
        touchMove = -1
        queued = -1
      }
      if (m >= 0) heroMove(m)
    } else if (!useBot) {
      // buffer one move while airborne
      if (keys.hit('ArrowUp', 'KeyE', 'Numpad9')) queued = 0
      else if (keys.hit('ArrowRight', 'KeyD', 'KeyC', 'Numpad3')) queued = 1
      else if (keys.hit('ArrowDown', 'KeyA', 'KeyZ', 'Numpad1')) queued = 2
      else if (keys.hit('ArrowLeft', 'KeyQ', 'Numpad7')) queued = 3
      if (touchMove >= 0) {
        queued = touchMove
        touchMove = -1
      }
    }

    // hero hop
    if (hero.p >= 0) {
      hero.p += dt / hero.dur
      if (hero.p >= 1) {
        hero.p = -1
        const fr = hero.r
        const fc = hero.c
        hero.r = hero.tr
        hero.c = hero.tc
        if (onPyr(hero.r, hero.c)) {
          hero.x = cx(hero.r, hero.c)
          hero.y = cy(hero.r)
          hero.land = 1
          landTop(idx(hero.r, hero.c))
          if (tops.every((_, i) => done(i))) {
            phase = 'clear'
            phaseT = 0
            enemies = []
            ;[523, 659, 784, 1047, 1319, 1568].forEach((n, i) => sfx.tone(n, 0.25, { type: 'triangle', gain: 0.05, when: i * 0.09 }))
            return
          }
        } else {
          const d = discAt(hero.r, hero.c)
          if (d) {
            d.ride = 1e-3
            d.used = true
            lure = { r: fr, c: fc, m: hero.face }
            sfx.tone(392, 1.4, { type: 'sine', to: 1175, gain: 0.05 })
          } else {
            hero.fall = 1e-3
            hero.vy = -40
            killHero('fell')
            return
          }
        }
      } else hopPos(hero)
    }

    // riding a disc to the apex
    for (const d of discs) {
      if (d.ride <= 0) continue
      d.ride += dt
      const k = ease.inOutSine(clamp(d.ride / 1.5))
      const sx0 = cx(d.r, d.c)
      const sy0 = cy(d.r) + 6
      d.x = lerp(sx0, LW / 2, k)
      d.y = lerp(sy0, cy(0) - 34, k) - Math.sin(k * Math.PI) * 18
      hero.x = d.x
      hero.y = d.y - 6
      if (d.ride > 1.7) {
        d.ride = 0
        d.x = -999
        hero.r = -1
        hero.c = 0
        hero.tr = 0
        hero.tc = 0
        hero.p = 0
        hero.dur = 0.28
        hero.face = 2
      }
    }
    if (hero.r === -1 && hero.p >= 0) {
      hero.p += dt / hero.dur
      const k = clamp(hero.p)
      hero.x = LW / 2
      hero.y = lerp(cy(0) - 40, cy(0), ease.inSine(k))
      if (hero.p >= 1) {
        hero.p = -1
        hero.r = 0
        hero.c = 0
        hero.land = 1
        landTop(0)
      }
    }
    if (lure && !enemies.some((e) => e.kind === 'coily' && !e.dead && e.fall === 0)) lure = null
    if (lure && hero.r >= 0 && !discs.some((d) => d.ride > 0) && hero.p < 0) {
      // the lure lasts until the spring has gone over (or the hero has moved on)
      if (!enemies.some((e) => e.kind === 'coily' && !e.dead && e.fall === 0 && Math.abs(e.r - lure!.r) <= 1)) lure = null
    }

    // enemies
    for (const e of enemies) enemyUpdate(e, dt)
    enemies = enemies.filter((e) => !e.dead)

    // collisions (generous: centre distance in the plane of the tops)
    const riding = discs.some((d) => d.ride > 0) || hero.r < 0
    if (!riding && hero.fall === 0) {
      const [hr, hc] = heroOcc()
      for (const e of enemies) {
        if (e.fall > 0 || e.drop > 0.12 || e.hatch > 0 && e.kind !== 'coilball') continue
        const er = e.p >= 0 && e.p >= 0.55 ? e.tr : e.r
        const ec = e.p >= 0 && e.p >= 0.55 ? e.tc : e.c
        const near = Math.hypot(e.x - hero.x, e.y - hero.y) < 13
        if ((er === hr && ec === hc && near) || Math.hypot(e.x - hero.x, e.y - hero.y) < 8) {
          if (e.kind === 'green') {
            e.dead = true
            freezeT = 3.5
            score += 100
            rings.add(e.x, e.y, 26, 0.6, C.fern)
            ;[784, 988, 1175].forEach((n, i) => sfx.tone(n, 0.2, { type: 'sine', gain: 0.05, when: i * 0.05 }))
            continue
          }
          if (freezeT > 0 && e.kind !== 'coily') continue
          killHero('caught')
          return
        }
      }
    }
  }

  /* ------------------------------------------------------------------ draw */

  /** Strokes parallel to edge p0→p1, spaced along p0→p3, inside the parallelogram p0 p1 p2 p3. */
  function hatchPara(x0: number, y0: number, x1: number, y1: number, x3: number, y3: number, n: number) {
    for (let i = 1; i < n; i++) {
      const k = i / n
      const ax = x0 + (x3 - x0) * k
      const ay = y0 + (y3 - y0) * k
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax + (x1 - x0), ay + (y1 - y0))
    }
  }

  function drawPyramid() {
    const tg = target()
    const col = PALETTE[(level - 1) % 4]
    // clear ripple: tops flash in a wave from the apex down
    const wave = phase === 'clear' ? phaseT : -1
    // faces
    ctx.lineWidth = px
    // left faces: vertical hatch, dense
    ctx.strokeStyle = rgba(C.ink, 0.42)
    ctx.beginPath()
    for (let rr = 0; rr < ROWS; rr++)
      for (let c = 0; c <= rr; c++) {
        const x = cx(rr, c)
        const y = cy(rr)
        // left face: (x−A, y) (x, y+B) (x, y+B+HH) (x−A, y+HH): strokes parallel to the vertical edge
        hatchPara(x - A, y, x - A, y + HH, x, y + B, 7)
      }
    ctx.stroke()
    // right faces: strokes parallel to the top edge, sparse
    ctx.strokeStyle = rgba(C.ink, 0.3)
    ctx.beginPath()
    for (let rr = 0; rr < ROWS; rr++)
      for (let c = 0; c <= rr; c++) {
        const x = cx(rr, c)
        const y = cy(rr)
        hatchPara(x, y + B, x + A, y, x, y + B + HH, 5)
      }
    ctx.stroke()
    // tops by state
    for (let rr = 0; rr < ROWS; rr++)
      for (let c = 0; c <= rr; c++) {
        const i = idx(rr, c)
        const x = cx(rr, c)
        const y = cy(rr)
        let st = tops[i]
        if (wave >= 0) {
          const w = wave * 3.2 - rr * 0.45
          if (w > 0 && w < 4) st = Math.floor(w * 2.5) % 2 === 0 ? tg : 0
        }
        const pop = flash[i]
        const s = 1 + pop * 0.12
        const a = A * s
        const b = B * s
        ctx.fillStyle = C.paper
        ctx.beginPath()
        ctx.moveTo(x, y - b)
        ctx.lineTo(x + a, y)
        ctx.lineTo(x, y + b)
        ctx.lineTo(x - a, y)
        ctx.closePath()
        ctx.fill()
        if (st > 0) {
          const full = st === tg
          ctx.strokeStyle = rgba(full ? col : C.sky, full ? 0.85 : 0.9)
          ctx.beginPath()
          // strokes parallel to the upper-left edge
          hatchPara(x - a, y, x, y - b, x, y + b, full ? 9 : 5)
          if (full) hatchPara(x, y - b, x + a, y, x - a, y, 9)
          ctx.stroke()
        }
        if (pop > 0) {
          ctx.strokeStyle = rgba(col, pop)
          ctx.beginPath()
          ctx.moveTo(x, y - b - 3 * (1 - pop))
          ctx.lineTo(x + a + 6 * (1 - pop), y)
          ctx.lineTo(x, y + b + 3 * (1 - pop))
          ctx.lineTo(x - a - 6 * (1 - pop), y)
          ctx.closePath()
          ctx.stroke()
        }
      }
    // outlines
    ctx.strokeStyle = C.ink
    ctx.lineWidth = px
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let rr = 0; rr < ROWS; rr++)
      for (let c = 0; c <= rr; c++) {
        const x = cx(rr, c)
        const y = cy(rr)
        ctx.moveTo(x, y - B)
        ctx.lineTo(x + A, y)
        ctx.lineTo(x + A, y + HH)
        ctx.lineTo(x, y + B + HH)
        ctx.lineTo(x - A, y + HH)
        ctx.lineTo(x - A, y)
        ctx.closePath()
        ctx.moveTo(x - A, y)
        ctx.lineTo(x, y + B)
        ctx.lineTo(x + A, y)
        ctx.moveTo(x, y + B)
        ctx.lineTo(x, y + B + HH)
      }
    ctx.stroke()
    ctx.lineJoin = 'miter'
  }

  function drawDisc(d: Disc, t: number) {
    if (d.x < -100) return
    if (d.used && d.ride <= 0) return
    const x = d.x
    const y = d.y
    ctx.lineWidth = px
    const spin = t * 5
    ctx.strokeStyle = C.ink2
    ctx.beginPath()
    ctx.ellipse(x, y, 13, 5, 0, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ocean, 0.8)
    ctx.beginPath()
    ctx.ellipse(x, y, 9, 3.4, 0, 0, TAU)
    ctx.moveTo(x + 4.5, y)
    ctx.ellipse(x, y, 4.5, 1.7, 0, 0, TAU)
    ctx.stroke()
    // spinning tick marks round the rim
    ctx.strokeStyle = rgba(C.ink, 0.6)
    ctx.beginPath()
    for (let k = 0; k < 8; k++) {
      const a = spin + (k / 8) * TAU
      const s = Math.sin(a)
      if (s < 0) continue
      ctx.moveTo(x + Math.cos(a) * 11, y + s * 4.2)
      ctx.lineTo(x + Math.cos(a) * 13, y + s * 5)
    }
    ctx.stroke()
    // hover: faint dashed shadow below
    ctx.strokeStyle = rgba(C.ink, 0.22)
    ctx.setLineDash([1.5, 2])
    ctx.beginPath()
    ctx.moveTo(x - 6, y + 9 + Math.sin(t * 3) * 1.2)
    ctx.lineTo(x + 6, y + 9 + Math.sin(t * 3) * 1.2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  /** The hero: a ball with a tube snout and two shoes. face: 0 UR · 1 DR · 2 DL · 3 UL */
  function drawHero(h: Hopper, t: number, alpha = 1) {
    const front = h.face === 1 || h.face === 2
    const dir = h.face === 0 || h.face === 1 ? 1 : -1
    let sx = 1
    let sy = 1
    if (h.p >= 0 && h.r >= 0) {
      const k = h.p
      if (k < 0.15) {
        sx = 1 + 0.12 * (k / 0.15)
        sy = 1 - 0.14 * (k / 0.15)
      } else {
        const v = Math.sin(((k - 0.15) / 0.85) * Math.PI)
        sx = 1 - 0.07 * v
        sy = 1 + 0.12 * v
      }
    }
    if (h.land > 0) {
      sx *= 1 + 0.18 * h.land
      sy *= 1 - 0.2 * h.land
    }
    const idle = h.p < 0 ? Math.sin(t * 4) * 0.4 : 0
    const R = 9.6
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(h.x, h.y - 2)
    ctx.scale(sx, sy)
    ctx.translate(0, -R - 1.5 + idle * 0.3)
    const lw = px
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // shoes
    for (const s of [-1, 1]) {
      const fx = s * 3.8 + dir * 1.2
      ctx.beginPath()
      ctx.ellipse(fx + dir * 1.2, R + 1.2, 3.4, 1.9, 0, 0, TAU)
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.strokeStyle = C.ink
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(fx, R - 2)
      ctx.lineTo(fx + dir * 0.6, R)
      ctx.stroke()
    }
    // snout behind the body when facing away
    const snout = () => {
      const ax = dir * (front ? 0.82 : 0.86)
      const ay = front ? 0.42 : -0.42
      const L = 8.6
      const w = 3
      const bx = ax * R * 0.55
      const by = ay * R * 0.55 + (front ? 1 : -1)
      const ex = bx + ax * L
      const ey = by + ay * L * 0.75
      const nx = -ay
      const ny = ax
      ctx.beginPath()
      ctx.moveTo(bx + nx * w, by + ny * w)
      ctx.lineTo(ex + nx * w * 1.15, ey + ny * w * 1.15)
      ctx.lineTo(ex - nx * w * 1.15, ey - ny * w * 1.15)
      ctx.lineTo(bx - nx * w, by - ny * w)
      ctx.closePath()
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.strokeStyle = C.ink
      ctx.stroke()
      // the opening
      ctx.beginPath()
      ctx.ellipse(ex, ey, 1.6, w * 1.15, Math.atan2(ny, nx), 0, TAU)
      ctx.fillStyle = C.paper
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(ex, ey, 0.7, w * 0.6, Math.atan2(ny, nx), 0, TAU)
      ctx.fillStyle = C.ink
      ctx.fill()
    }
    if (!front) snout()
    // body
    ctx.beginPath()
    ctx.arc(0, 0, R, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    // drafted shading: a crescent of hatch on the shadow side
    ctx.strokeStyle = rgba(C.lagoon, 0.6)
    ctx.beginPath()
    for (let k = -6; k <= 6; k++) {
      const yy = k * 1.3
      const half = Math.sqrt(Math.max(0, R * R - yy * yy))
      const x0 = -dir * half
      const x1 = -dir * (half * 0.35 + 1.8)
      ctx.moveTo(x0 * 0.94, yy)
      ctx.lineTo(x1, yy)
    }
    ctx.stroke()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = lw * 1.5
    ctx.beginPath()
    ctx.arc(0, 0, R, 0, TAU)
    ctx.stroke()
    ctx.lineWidth = lw
    if (front) {
      snout()
      // eyes
      for (const s of [-1, 1]) {
        const ex = dir * 1.6 + s * 3
        const ey = -2.6
        ctx.beginPath()
        ctx.ellipse(ex, ey, 2.2, 2.7, 0, 0, TAU)
        ctx.fillStyle = C.paper
        ctx.fill()
        ctx.strokeStyle = C.ink
        ctx.stroke()
        const blink = (t * 0.7 + h.x * 0.01) % 3 < 0.09
        if (!blink) {
          ctx.beginPath()
          ctx.arc(ex + dir * 0.9, ey + 0.8, 1.05, 0, TAU)
          ctx.fillStyle = C.ink
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.moveTo(ex - 2, ey)
          ctx.lineTo(ex + 2, ey)
          ctx.stroke()
        }
      }
    } else {
      // seen from behind: just the tops of the eyes peeking over
      ctx.strokeStyle = rgba(C.ink, 0.7)
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(dir * 2.4 + s * 3, -5.6, 2, Math.PI * 1.1, Math.PI * 1.9)
        ctx.stroke()
      }
    }
    ctx.restore()
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
  }

  function drawBall(e: Hopper, color: string, rad: number, t: number) {
    let sx = 1
    let sy = 1
    if (e.land > 0) {
      sx = 1 + 0.22 * e.land
      sy = 1 - 0.24 * e.land
    }
    ctx.save()
    ctx.translate(e.x, e.y - 2)
    ctx.scale(sx, sy)
    ctx.translate(0, -rad)
    ctx.lineWidth = px
    ctx.beginPath()
    ctx.arc(0, 0, rad, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    // hatch lines that roll with the ball
    const roll = (e.r + e.c * 0.5 + (e.p > 0 ? e.p : 0)) * 1.6
    ctx.strokeStyle = rgba(color, 0.65)
    ctx.beginPath()
    for (let k = -3; k <= 3; k++) {
      const yy = k * (rad / 3.6) + Math.sin(roll) * 0.6
      const half = Math.sqrt(Math.max(0, rad * rad - yy * yy))
      ctx.moveTo(-half * 0.85, yy)
      ctx.lineTo(half * 0.85, yy)
    }
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = px * 1.4
    ctx.beginPath()
    ctx.arc(0, 0, rad, 0, TAU)
    ctx.stroke()
    // a highlight notch
    ctx.lineWidth = px
    ctx.strokeStyle = C.paper
    ctx.beginPath()
    ctx.arc(0, 0, rad * 0.62, -2.4, -1.7)
    ctx.stroke()
    if (freezeT > 0 && Math.floor(t * 6) % 2 === 0) {
      ctx.strokeStyle = rgba(C.fern, 0.8)
      ctx.beginPath()
      ctx.arc(0, 0, rad + 2.5, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawCoilBall(e: Hopper, t: number) {
    if (e.hatch <= 0) {
      drawBall(e, C.lagoon, 6.4, t)
      return
    }
    // hatching: the ball shivers, a zig-zag crack runs round it, the lid flips
    // away and the spring uncoils out of the cup
    const k = clamp(e.hatch / 0.9)
    const rad = 6.4
    const shiver = k < 0.38 ? Math.sin(e.hatch * 70) * 0.9 : 0
    const zig = (from: number) => {
      for (let i = 0; i <= 6; i++) {
        const u = from < 0 ? i / 6 : 1 - i / 6
        ctx.lineTo(-rad + u * 2 * rad, i % 2 ? -1.3 : 1.1)
      }
    }
    if (k > 0.42) drawCoily({ ...e, land: 0 }, t, ease.outBack(clamp((k - 0.42) / 0.58)))
    ctx.save()
    ctx.translate(e.x + shiver, e.y - 2 - rad)
    ctx.lineWidth = px
    // the cup
    ctx.beginPath()
    ctx.moveTo(-rad, 0)
    ctx.arc(0, 0, rad, Math.PI, 0, true)
    zig(1)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.strokeStyle = C.lagoon
    ctx.lineWidth = px * 1.4
    ctx.stroke()
    // the lid
    const lift = ease.outCubic(clamp((k - 0.35) / 0.4))
    ctx.save()
    ctx.globalAlpha = 1 - clamp((k - 0.72) / 0.28)
    ctx.translate(lift * 7 * (e.face === 1 || e.face === 0 ? -1 : 1), -lift * 9)
    ctx.rotate(lift * 1.1 * (e.face === 1 || e.face === 0 ? -1 : 1))
    ctx.beginPath()
    ctx.moveTo(-rad, 0)
    ctx.arc(0, 0, rad, Math.PI, Math.PI * 2)
    zig(1)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    // the crack draws on
    if (k < 0.38) {
      ctx.strokeStyle = rgba(C.ink, clamp(k / 0.2))
      ctx.lineWidth = px
      ctx.beginPath()
      ctx.moveTo(-rad, 1.1)
      zig(-1)
      ctx.stroke()
    }
    ctx.restore()
  }

  /** The spring: a helix of hairline loops with a head on top; squashes when it lands. */
  function drawCoily(e: Hopper, t: number, grow = 1) {
    const front = e.face === 1 || e.face === 2
    const dir = e.face === 0 || e.face === 1 ? 1 : -1
    let comp = 1
    if (e.p >= 0) comp = 1 + 0.3 * Math.sin(clamp(e.p) * Math.PI)
    if (e.land > 0) comp *= 1 - 0.38 * e.land
    const loops = 5
    const H = 18 * comp * grow
    const w = 5.6
    ctx.save()
    ctx.translate(e.x, e.y - 2)
    ctx.lineWidth = px
    ctx.lineCap = 'round'
    // back half of each loop (faint), then front half
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? C.lagoon : rgba(C.lagoon, 0.45)
      ctx.lineWidth = pass ? px * 1.5 : px
      ctx.beginPath()
      for (let i = 0; i <= loops * 24; i++) {
        const u = i / (loops * 24)
        const a = u * loops * TAU
        const fr = Math.sin(a) >= 0
        const xx = Math.cos(a) * w
        const yy = -u * H + Math.sin(a) * 1.6
        if (fr !== (pass === 1)) {
          ctx.moveTo(xx, yy)
          continue
        }
        ctx.lineTo(xx, yy)
      }
      ctx.stroke()
    }
    // head
    const hy = -H - 6.5
    ctx.lineWidth = px
    ctx.beginPath()
    ctx.ellipse(0, hy, 7, 6, 0, 0, TAU)
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = px * 1.3
    ctx.stroke()
    ctx.lineWidth = px
    if (front) {
      for (const s of [-1, 1]) {
        const ex = dir * 1.4 + s * 2.6
        ctx.beginPath()
        ctx.arc(ex, hy - 1.2, 1.9, 0, TAU)
        ctx.fillStyle = C.paper
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(ex + dir * 0.7, hy - 0.8, 0.9, 0, TAU)
        ctx.fillStyle = C.ink
        ctx.fill()
      }
      // a wide grin under the eyes
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.arc(dir * 1.4, hy + 0.6, 4, 0.35, Math.PI - 0.35)
      ctx.stroke()
      // a flickering forked tongue
      if (Math.sin(t * 9 + e.x) > 0.2) {
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(dir * 3, hy + 3)
        ctx.lineTo(dir * 6, hy + 5.4)
        ctx.lineTo(dir * 7.4, hy + 4.6)
        ctx.moveTo(dir * 6, hy + 5.4)
        ctx.lineTo(dir * 7, hy + 6.8)
        ctx.stroke()
      }
    } else {
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.arc(0, hy, 3.6, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    }
    ctx.restore()
    ctx.lineCap = 'butt'
  }

  function drawEnemy(e: Hopper, t: number) {
    if (e.kind === 'ball') drawBall(e, C.ocean, 5.6, t)
    else if (e.kind === 'green') drawBall(e, C.fern, 5, t)
    else if (e.kind === 'coilball') drawCoilBall(e, t)
    else drawCoily(e, t)
  }

  function drawBubble(x: number, y: number) {
    const bx = x + 14
    const by = y - 36
    ctx.lineWidth = px
    ctx.beginPath()
    ctx.moveTo(bx - 18, by - 9)
    ctx.arcTo(bx + 20, by - 9, bx + 20, by + 9, 7)
    ctx.arcTo(bx + 20, by + 9, bx - 20, by + 9, 7)
    ctx.lineTo(bx - 6, by + 9)
    ctx.lineTo(bx - 13, by + 17)
    ctx.lineTo(bx - 11, by + 9)
    ctx.arcTo(bx - 20, by + 9, bx - 20, by - 9, 7)
    ctx.arcTo(bx - 20, by - 9, bx + 20, by - 9, 7)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.strokeStyle = C.ink
    ctx.stroke()
    text(ctx, '@!#?@!', bx, by + 0.8, { size: Math.min(U(8, 9), 11), align: 'center', baseline: 'middle', color: C.ink, tracking: 0.02, weight: 600 })
  }

  function drawAnnotations() {
    // top left: the target swatch, like the original's "change to"
    const tg = target()
    const col = PALETTE[(level - 1) % 4]
    const small = trimX > 0
    const ax = small ? 40 : 34
    const ay = small ? 20 : 30
    if (!small) text(ctx, 'TARGET', 14, 16, { size: 5.4, color: C.muted, tracking: 0.16 })
    const steps = tg === 2 ? [0, 1, 2] : [0, 1]
    steps.forEach((st, k) => {
      const x = ax - 14 + k * 26
      const y = ay
      const a = 9
      const b = 5
      ctx.lineWidth = px
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(x, y - b)
      ctx.lineTo(x + a, y)
      ctx.lineTo(x, y + b)
      ctx.lineTo(x - a, y)
      ctx.closePath()
      ctx.stroke()
      if (st > 0) {
        const full = st === tg
        ctx.strokeStyle = rgba(full ? col : C.sky, 0.9)
        ctx.beginPath()
        hatchPara(x - a, y, x, y - b, x, y + b, full ? 6 : 4)
        if (full) hatchPara(x, y - b, x + a, y, x - a, y, 6)
        ctx.stroke()
      }
      if (k < steps.length - 1) {
        ctx.strokeStyle = C.muted
        ctx.beginPath()
        ctx.moveTo(x + a + 2, y)
        ctx.lineTo(x + a + 6, y)
        ctx.moveTo(x + a + 4.5, y - 1.5)
        ctx.lineTo(x + a + 6, y)
        ctx.lineTo(x + a + 4.5, y + 1.5)
        ctx.stroke()
      }
    })
    if (small) {
      if (mode >= 2) text(ctx, '↺', ax - 14 + steps.length * 26 - 8, ay + 0.5, { size: U(6, 9), baseline: 'middle', color: C.ocean, tracking: 0 })
      return
    }
    if (mode >= 2) text(ctx, mode === 2 ? '↺ TOGGLES' : '↺ REVERTS', 14, ay + 16, { size: 5, color: C.ocean, tracking: 0.14 })
    // top right: course and round
    text(ctx, `COURSE ${String(level).padStart(2, '0')}`, LW - 14, 16, { size: 5.4, align: 'right', color: C.muted, tracking: 0.16 })
    let left = 0
    for (let i = 0; i < NCUBES; i++) if (!done(i)) left++
    text(ctx, `${String(NCUBES - left).padStart(2, '0')} / 28`, LW - 14, 27, { size: 7, align: 'right', color: C.ink, tracking: 0.08 })
    // a dimension line down the left flank of the pyramid
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.lineWidth = px
    const x0 = cx(0, 0) - A - 14
    const y0 = cy(0) - 6
    const x1 = cx(ROWS - 1, 0) - A - 14
    const y1 = cy(ROWS - 1) - 6
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    for (let k = 0; k < ROWS; k++) {
      const tx = lerp(x0, x1, k / (ROWS - 1))
      const ty = lerp(y0, y1, k / (ROWS - 1))
      ctx.moveTo(tx - 2.5, ty - 1.4)
      ctx.lineTo(tx + 2.5, ty + 1.4)
    }
    ctx.stroke()
    text(ctx, '7 COURSES', x0 - 3, y0 - 5, { size: 5, align: 'right', color: C.muted, tracking: 0.14 })
    // bottom: a scale bar under the base
    const by = cy(ROWS - 1) + B + HH + 12
    const bx0 = cx(ROWS - 1, 0) - A
    const bx1 = cx(ROWS - 1, ROWS - 1) + A
    ctx.beginPath()
    ctx.moveTo(bx0, by)
    ctx.lineTo(bx1, by)
    for (let k = 0; k <= ROWS; k++) {
      const tx = lerp(bx0, bx1, k / ROWS)
      ctx.moveTo(tx, by - 2.5)
      ctx.lineTo(tx, by + 2.5)
    }
    ctx.stroke()
    text(ctx, `BASE 7 × ${A * 2} U`, LW / 2, by + 10, { size: 5, align: 'center', color: C.muted, tracking: 0.14 })
  }

  let queued = -1
  let touchMove = -1
  const hover = { x: 0, y: 0, on: false, mouse: false }
  let tapFlash = 0
  let tapMove = -1
  // first-play hints, once per visit
  let hopped = false
  let hopHint = 0
  let springHint = 0
  let springHinted = false
  let greenHint = 0
  let greenHinted = false

  function topsDone() {
    let n = 0
    for (let i = 0; i < NCUBES; i++) if (done(i)) n++
    return n
  }
  /** Which hop a press at (x, y) means: the quadrant around the hero. 0 ↗ · 1 ↘ · 2 ↙ · 3 ↖ */
  function quadrant(x: number, y: number) {
    const q = toField(f, x, y)
    const dx = q.x + trimX - hero.x
    const dy = q.y - (hero.y - 10)
    return dy < 0 ? (dx >= 0 ? 0 : 3) : dx >= 0 ? 1 : 2
  }
  const insideField = (x: number, y: number) => x >= f.ox && y >= f.oy && x <= f.ox + f.lw * f.s && y <= f.oy + f.lh * f.s

  /** A small mono label on a paper chip. */
  function tag(str: string, x: number, y: number, size: number, color: string) {
    setFont(ctx, { size, weight: 600, tracking: 0.22 })
    const w = ctx.measureText(str).width
    const x0 = clamp(x - w / 2, trimX + size, LW - trimX - size - w)
    ctx.fillStyle = rgba(C.paper, 0.94)
    ctx.fillRect(x0 - size * 0.5, y - size * 0.75, w + size, size * 1.5)
    text(ctx, str, x0, y + size * 0.05, { size, baseline: 'middle', color, tracking: 0.22, weight: 600 })
  }

  /** A dotted hop arc from the hero toward move m, with the landing marked; returns false off the edge. */
  function hopGuide(m: number, a: number, t: number, ride: boolean) {
    const nr = hero.r + MR[m]
    const nc = hero.c + MC[m]
    const x0 = hero.x
    const y0 = hero.y
    const x1 = cx(nr, nc)
    const y1 = cy(nr)
    const up = nr < hero.r
    const pt = (k: number) => ({ x: lerp(x0, x1, k), y: lerp(y0, y1, k) - (up ? 30 : 19) * 4 * k * (1 - k) - 10 * (1 - k) })
    const land = onPyr(nr, nc) ? 'cube' : discAt(nr, nc) ? 'disc' : 'fall'
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = px
    ctx.strokeStyle = land === 'fall' ? C.ink2 : C.moss
    ctx.setLineDash([1.2, 2])
    ctx.beginPath()
    for (let i = 0; i <= 14; i++) {
      const q = pt(0.2 + (i / 14) * 0.8)
      if (i === 0) ctx.moveTo(q.x, q.y)
      else ctx.lineTo(q.x, q.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    if (land === 'cube') {
      ctx.beginPath()
      ctx.moveTo(x1, y1 - B - 2)
      ctx.lineTo(x1 + A + 3, y1)
      ctx.lineTo(x1, y1 + B + 2)
      ctx.lineTo(x1 - A - 3, y1)
      ctx.closePath()
      ctx.stroke()
    } else if (land === 'disc') {
      ctx.beginPath()
      ctx.ellipse(x1, y1 + 6, 16, 6.5, 0, 0, TAU)
      ctx.stroke()
    } else {
      // over the edge: a cross where it would fall
      ctx.beginPath()
      ctx.moveTo(x1 - 4, y1 - 4)
      ctx.lineTo(x1 + 4, y1 + 4)
      ctx.moveTo(x1 + 4, y1 - 4)
      ctx.lineTo(x1 - 4, y1 + 4)
      ctx.stroke()
    }
    if (ride) {
      const q = pt(0.2 + 0.8 * ease.inOutSine((t * 1.1) % 1))
      ctx.fillStyle = C.moss
      ctx.beginPath()
      ctx.arc(q.x, q.y, 1.5, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    return land !== 'fall'
  }

  function drawHints(t: number, dt: number) {
    const human = state === 'play' && !botParam
    if (human && hero.p >= 0 && hero.r >= 0) hopped = true
    const idle = hero.p < 0 && hero.fall === 0 && hero.drop === 0 && hero.r >= 0 && !discs.some((d) => d.ride > 0)
    const want = human && !hopped && (phase === 'play' || (phase === 'intro' && phaseT > 0.6))
    hopHint = clamp(hopHint + (want ? dt * 3 : -dt * 2.5))
    if (hopHint > 0.01 && idle && phase !== 'dying') {
      for (let m = 0; m < 4; m++) if (onPyr(hero.r + MR[m], hero.c + MC[m]) || discAt(hero.r + MR[m], hero.c + MC[m])) hopGuide(m, hopHint, t, true)
      ctx.save()
      ctx.globalAlpha = hopHint
      tag('HOP DIAGONALLY', hero.x, hero.y - 32, U(5.2, 8.5), C.moss)
      ctx.restore()
    }
    // the first spring, the first green ball
    if (human && !springHinted && enemies.some((e) => e.kind === 'coily')) {
      springHinted = true
      springHint = 3.2
    }
    const green = enemies.find((e) => e.kind === 'green' && e.drop === 0)
    if (human && !greenHinted && green) {
      greenHinted = true
      greenHint = 2.8
    }
    springHint = Math.max(0, springHint - dt)
    greenHint = Math.max(0, greenHint - dt)
    if (springHint > 0) {
      ctx.save()
      ctx.globalAlpha = clamp(springHint / 0.5) * clamp((3.2 - springHint) * 4)
      tag('THE SPRING CHASES · A DISC SHAKES IT', LW / 2, 44, U(5, 8.5), C.lagoon)
      ctx.restore()
    }
    if (greenHint > 0 && green) {
      ctx.save()
      ctx.globalAlpha = clamp(greenHint / 0.5) * clamp((2.8 - greenHint) * 4)
      tag('CATCH IT TO FREEZE TIME', green.x, green.y - 24, U(5, 8.5), C.fern)
      ctx.restore()
    }
    // what a press would do: hovering with a mouse, or a brief flash after a tap
    tapFlash = Math.max(0, tapFlash - dt)
    if (human && idle && phase === 'play') {
      if (hover.on && hover.mouse && insideField(hover.x, hover.y)) hopGuide(quadrant(hover.x, hover.y), 0.8, t, false)
      else if (tapFlash > 0 && tapMove >= 0) hopGuide(tapMove, tapFlash / 0.3, t, false)
    }
  }


  if (pState === 'play') state = 'play'
  if (pState === 'over' && !preview) state = 'over'
  newGame()

  return {
    resize(w, h) {
      f = fitFor(w, h)
    },
    key(code, down) {
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyQ', 'KeyE', 'KeyA', 'KeyD', 'KeyZ', 'KeyC', 'Numpad7', 'Numpad9', 'Numpad1', 'Numpad3', ...START_KEYS])
    },
    pointer(p) {
      touch.pointer(p)
      hover.x = p.x
      hover.y = p.y
      hover.on = p.type !== 'leave'
      hover.mouse = p.pointerType === 'mouse'
      if (p.type === 'down' && state === 'play') {
        // tap the quadrant around the hero
        touchMove = quadrant(p.x, p.y)
        tapFlash = 0.3
        tapMove = touchMove
      }
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      if ((state === 'title' || (state === 'over' && stateT > 0.8)) && wantsStart) {
        go('play')
        touchMove = -1
      }

      if (dt > 0) {
        const human = state === 'play' && !botParam
        update(dt, !human)
        sparks.update(dt, 200, 2)
        rings.update(dt)
      }

      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: FIG, ruler: !f.compact })
      enterFit(ctx, f)
      ctx.translate(-trimX, 0)
      px = 1 / f.s
      if (shake > 0) ctx.translate(Math.sin(t * 90) * shake * 2.4, Math.cos(t * 70) * shake * 2)
      drawAnnotations()
      // things that fell off the far (upper) sides go behind the pyramid
      for (const e of enemies) if (e.fall > 0 && e.behind) drawEnemy(e, t)
      if (hero.fall > 0 && hero.behind) drawHero(hero, t)
      drawPyramid()
      for (const d of discs) drawDisc(d, t)
      // actors, back to front (clipped to the plate so falls end at its edge)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, LW, LH)
      ctx.clip()
      const actors: Hopper[] = enemies.filter((e) => !(e.fall > 0 && e.behind))
      if (!(hero.fall > 0 && hero.behind) && !(phase === 'intro' && hero.drop > 0.49)) actors.push(hero)
      actors.sort((a, b) => a.y - b.y)
      for (const a of actors) {
        if (a === hero) drawHero(hero, t)
        else drawEnemy(a, t)
      }
      ctx.restore()
      if (phase === 'dying' && phaseT > 0.1) drawBubble(deathKind === 'fell' ? bubbleX : hero.x, deathKind === 'fell' ? bubbleY : hero.y)
      if (phase === 'intro' && level > 0 && phaseT < 1.1) {
        const a = clamp(phaseT * 4) * (1 - clamp((phaseT - 0.85) / 0.25))
        text(ctx, `COURSE ${String(level).padStart(2, '0')}`, LW / 2, 21, { size: U(6.5, 9), align: 'center', color: C.moss, tracking: 0.3, weight: 600, alpha: a })
      }
      if (phase === 'clear') text(ctx, 'PYRAMID COMPLETE', LW / 2, 21, { size: U(6.5, 9), align: 'center', color: C.moss, tracking: 0.3, weight: 600 })
      if (freezeT > 0) text(ctx, `HOLD ${freezeT.toFixed(1)}`, LW / 2, phase === 'play' ? 21 : 12, { size: U(5.4, 8.5), align: 'center', color: C.fern, tracking: 0.16 })
      sparks.draw(ctx, px)
      rings.draw(ctx, px)
      if (!preview) drawHints(t, dt)
      ctx.restore()

      const shown = state === 'over' ? finalScore : score
      gameHud(ctx, f, env.mode, [
        { label: 'Score', value: fmtScore(shown, 5) },
        { label: 'Lives', value: String(state === 'over' ? 0 : lives) },
        { label: 'Course', value: String(level).padStart(2, '0') },
      ], [...(trimX && !preview ? [{ label: 'Tops', value: `${String(topsDone()).padStart(2, '0')}/28` }] : []), { label: 'Best', value: fmtScore(Math.max(hi.get(), shown), 5) }])

      // cards sit over the playfield, or over the whole stage when the field is a narrow column
      const roomy = !f.side && f.lw * f.s >= 300
      const ccx = roomy ? f.ox : 0
      const ccy = roomy ? f.oy : 0
      const cw = roomy ? f.lw * f.s : env.width
      const ch = roomy ? f.lh * f.s : env.height
      if (state === 'title')
        card(ctx, ccx, ccy, cw, ch, { kicker: 'After Q*bert · Gottlieb, 1982', title: 'Pyramid', titleEm: 'hop', lines: ['Turn every top to the target', 'Mind the spring; ride a disc'], prompt: 'Press Enter · Tap to start', t, appear: stateT * 2 })
      if (state === 'over')
        card(ctx, ccx, ccy, cw, ch, { kicker: newRecord ? 'New best' : 'Game over', title: fmtScore(finalScore, 5), lines: [`Best ${fmtScore(hi.get(), 5)}`], prompt: 'Press Enter · Tap to play again', t, appear: stateT * 2 })

      if (!preview) env.setCursor(state === 'title' || state === 'over' ? 'pointer' : state === 'play' && hover.on && insideField(hover.x, hover.y) ? 'pointer' : 'default')
      keys.endFrame()
      touch.endFrame()
    },
  }
}

export default create
