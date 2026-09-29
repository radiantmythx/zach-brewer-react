import { burst, col, DISPLAY, dot, font, glow, hits, kinetic, MONO, polyPath, ring, slate, titleCard } from '../kit'
import { clamp, easeInCubic, easeInOutCubic, easeOutCubic, easeOutExpo, hash, lerp, seg, springOut, TAU } from '../math'
import type { Scene } from '../scene'
import { BEAT, NEON } from '../timeline'

/*
 * 03 GAME DEV — beats 24–36. A top-down neon ARPG, fully scripted so every
 * frame is a pure function of time (seekable, and synced to the score).
 *
 *   0.0  hero dashes in, the floor lights up        6.5  LEVEL UP
 *   2.0  spin slash clears wave one                  7.0  boss: MERGE CONFLICT
 *   3.0  sixteen homing bolts clear wave two         8.0  AoE telegraphs → dodge
 *   4.75 chain-lightning dash through the brutes     9.0  bullet ring
 *   5.7  loot magnetises to the hero                 9.5  NOVA — 9,999 crit
 *                                                   10.25 slow-mo shatter, 10.75 boom
 */

const B = BEAT
type V = { x: number; y: number }
const v = (x: number, y: number): V => ({ x, y })
const mix = (a: V, b: V, t: number): V => v(lerp(a.x, b.x, t), lerp(a.y, b.y, t))
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y)
const norm = (a: V): V => {
  const l = Math.hypot(a.x, a.y) || 1
  return v(a.x / l, a.y / l)
}

/* ---------------------------------------------------------------- the script */

export const GAME_BEATS = {
  dash: 0,
  spawn1: 0.25,
  slash: 2.0,
  spawn2: 2.25,
  bolts: 3.0,
  spawn3: 4.0,
  lightning: 4.75,
  magnet: 5.7,
  levelUp: 6.5,
  boss: 7.0,
  bossLand: 7.6,
  telegraph: 8.0,
  telegraphBoom: 8.75,
  dodge: 8.4,
  bullets: 9.0,
  charge: 9.1,
  nova: 9.5,
  shatter: 10.25,
  boom: 10.75,
}
const G = GAME_BEATS

/** slow motion during the boss's death */
const warp = (lb: number) =>
  lb < G.shatter ? lb : lb < G.boom ? G.shatter + (lb - G.shatter) * 0.25 : G.shatter + (G.boom - G.shatter) * 0.25 + (lb - G.boom)

const H0 = v(-80, 20)
const H1 = v(360, 10)
const H2 = v(140, 40)
const H3 = v(-170, 160)
const wob = (b: number, amp: number, base: V) => v(base.x + amp * 34 * Math.sin(b * 1.3), base.y + amp * 26 * Math.sin(b * 1.7 + 0.4))

function hero(lb: number): V {
  if (lb < 0.8) {
    const p = easeOutExpo(clamp(lb / 0.8))
    return v(lerp(-800, H0.x, p), lerp(60, H0.y, p))
  }
  if (lb < G.lightning) return wob(lb, seg(lb, 0.8, 1.6) * (1 - seg(lb, 4.3, G.lightning)), H0)
  if (lb < 5.0) return mix(H0, H1, easeOutExpo((lb - G.lightning) / 0.25))
  if (lb < 6.0) return mix(H1, H2, easeInOutCubic(lb - 5.0))
  if (lb < G.dodge) return wob(lb, seg(lb, 6.0, 6.8) * (1 - seg(lb, 8.1, G.dodge)), H2)
  if (lb < G.dodge + 0.25) return mix(H2, H3, easeOutExpo((lb - G.dodge) / 0.25))
  return wob(lb, 0.5 * seg(lb, 8.65, 9.2), H3)
}

function boss(lb: number): V {
  const p = easeOutCubic(seg(lb, G.boss, G.bossLand, (x) => x))
  const y = lerp(-800, -250, p)
  return v(60 + 30 * Math.sin(lb * 0.9) * seg(lb, G.bossLand, 8.2), y + 12 * Math.sin(lb * 2.1) * seg(lb, G.bossLand, 8.2))
}

function facing(lb: number): number {
  const h = hero(lb)
  if (lb < 0.8) return 0
  if (lb >= G.slash && lb < G.slash + 0.25) return -Math.PI / 2 + TAU * easeInOutCubic((lb - G.slash) / 0.25)
  if (lb >= G.lightning - 0.1 && lb < 5.05) return 0
  const target = lb < G.boss ? v(0, -30) : boss(lb)
  return Math.atan2(target.y - h.y, target.x - h.x)
}

type Kind = 'drone' | 'wisp' | 'brute' | 'add'
interface Enemy {
  kind: Kind
  spawn: number
  hit: number
  die: number
  r: number
  base: (lb: number) => V
  knock: V
  seed: number
}
interface Dmg {
  at: number
  p: V
  value: number
  crit: boolean
  boss?: boolean
}
interface Loot {
  at: number
  land: V
  from: V
  magnet: number
  color: string
}
interface Bolt {
  fire: number
  hit: number
  from: V
  ctrl: V
  to: V
}

const ENEMIES: Enemy[] = []
const DMG: Dmg[] = []
const LOOT: Loot[] = []
const BOLTS: Bolt[] = []
const CHAIN: { at: number; p: V }[] = []
const TELEGRAPHS: V[] = []
const BOSS_MAX = 12000

const novaR = (lb: number) => 1150 * easeOutCubic(clamp((lb - G.nova) / 0.8))
const novaHitAt = (d: number) => G.nova + 0.8 * (1 - Math.cbrt(Math.max(0, 1 - d / 1150)))

function pos(e: Enemy, lb: number): V {
  const p = e.base(Math.min(lb, e.hit))
  if (lb <= e.hit) return p
  const k = easeOutCubic(clamp((lb - e.hit) / 0.25))
  return v(p.x + e.knock.x * k, p.y + e.knock.y * k)
}

;(() => {
  // wave 1 — drones collapse on the hero, spin slash clears them
  const theta0 = -Math.PI / 2
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.2
    const S = v(Math.cos(a) * 560, Math.sin(a) * 380)
    const dir = norm(v(S.x - H0.x, S.y - H0.y))
    const spawn = G.spawn1 + i * 0.04
    const phi = Math.atan2(dir.y, dir.x)
    const hit = G.slash + ((((phi - theta0) % TAU) + TAU) % TAU / TAU) * 0.25
    ENEMIES.push({
      kind: 'drone',
      spawn,
      hit,
      die: hit + 0.1,
      r: 17,
      seed: i,
      knock: v(dir.x * 95, dir.y * 95),
      base: (lb) => {
        const h = hero(lb)
        return mix(S, v(h.x + dir.x * 120, h.y + dir.y * 120), easeInOutCubic(seg(lb, spawn + 0.2, 1.95, (x) => x)))
      },
    })
  }
  // wave 2 — wisps spiral in, sixteen homing bolts
  const wisps: Enemy[] = []
  for (let j = 0; j < 16; j++) {
    const a = (j / 16) * TAU
    wisps.push({
      kind: 'wisp',
      spawn: G.spawn2 + (j % 4) * 0.05,
      hit: 0,
      die: 0,
      r: 13,
      seed: 100 + j,
      knock: v(0, 0),
      base: (lb) => {
        const k = easeInOutCubic(seg(lb, G.spawn2 + 0.1, 3.25, (x) => x))
        const creep = Math.max(0, lb - 3.25) * 0.08
        const ang = a + 0.5 * k + creep
        return v(Math.cos(ang) * lerp(620, 310 - creep * 200, k), Math.sin(ang) * lerp(430, 235 - creep * 140, k))
      },
    })
  }
  const f3 = Math.atan2(-30 - H0.y, 0 - H0.x)
  const order = wisps
    .map((w, i) => ({ i, a: Math.atan2(w.base(3.3).y - H0.y, w.base(3.3).x - H0.x) }))
    .sort((p, q) => p.a - q.a)
  order.forEach(({ i }, j) => {
    const w = wisps[i]
    const fire = G.bolts + j * 0.05
    const hit = fire + 0.3
    w.hit = hit
    w.die = hit + 0.02
    const from = hero(fire)
    const la = f3 + (j / 15 - 0.5) * 2.8
    BOLTS.push({ fire, hit, from, ctrl: v(from.x + Math.cos(la) * 320, from.y + Math.sin(la) * 320), to: w.base(hit) })
  })
  ENEMIES.push(...wisps)
  // wave 3 — brutes line up, the lightning dash chains through them
  for (let i = 0; i < 7; i++) {
    const target = v(200 + (i % 2) * 80, -230 + i * 76)
    const S = v(900, target.y * 1.3)
    const spawn = G.spawn3 + i * 0.03
    const hit = G.lightning + 0.05 + i * 0.045
    ENEMIES.push({
      kind: 'brute',
      spawn,
      hit,
      die: hit + 0.08,
      r: 25,
      seed: 200 + i,
      knock: v(60, (i - 3) * 14),
      base: (lb) => mix(S, target, easeOutCubic(seg(lb, spawn, 4.6, (x) => x))),
    })
    CHAIN.push({ at: hit, p: target })
  }
  // adds — arrive with the boss, erased by the nova
  const novaFrom = hero(G.nova)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.3
    const e: Enemy = {
      kind: 'add',
      spawn: G.bossLand + k * 0.04,
      hit: 0,
      die: 0,
      r: 12,
      seed: 300 + k,
      knock: v(0, 0),
      base: (lb) => {
        const b = boss(lb)
        const home = v(b.x + Math.cos(a + lb * 0.6) * 190, b.y + Math.sin(a + lb * 0.6) * 150)
        return mix(home, hero(lb), 0.3 * seg(lb, 7.8, 9.6))
      },
    }
    const d = dist(e.base(9.7), novaFrom)
    e.hit = novaHitAt(d)
    e.die = e.hit + 0.05
    const dir = norm(v(e.base(e.hit).x - novaFrom.x, e.base(e.hit).y - novaFrom.y))
    e.knock = v(dir.x * 80, dir.y * 80)
    ENEMIES.push(e)
  }

  // damage numbers + loot
  for (const e of ENEMIES) {
    const p = e.base(e.hit)
    const h = hash(e.seed * 3.7)
    const crit = h > 0.78
    const base = e.kind === 'brute' ? 240 : e.kind === 'add' ? 520 : 110
    DMG.push({ at: e.hit, p, value: Math.round(base * (0.7 + hash(e.seed) * 0.6) * (crit ? 3 : 1)), crit })
  }
  const lootFrom = ENEMIES.filter((e) => e.kind === 'wisp' || e.kind === 'brute').slice(0, 20)
  lootFrom.forEach((e, i) => {
    const p = pos(e, e.die)
    const color = hash(i * 9.1) > 0.85 ? NEON.gold : [NEON.cyan, NEON.mint, NEON.lime][i % 3]
    LOOT.push({
      at: e.die,
      from: p,
      land: v(p.x + (hash(i * 4.4) - 0.5) * 90, p.y + (hash(i * 6.6) - 0.5) * 70),
      magnet: G.magnet + i * 0.02,
      color,
    })
  })
  // boss damage: opener bolts, the nova, the finishers
  const bossHits: [number, number, boolean][] = [
    [8.0, 312, false],
    [8.1, 287, false],
    [8.2, 405, true],
    [novaHitAt(dist(novaFrom, boss(9.6))), 9999, true],
    [9.97, 250, false],
    [10.07, 250, false],
    [10.17, 250, false],
    [10.27, 250, true],
  ]
  for (const [at, value, crit] of bossHits) DMG.push({ at, p: boss(at), value, crit, boss: true })
  for (const [i, at] of [7.85, 7.95, 8.05, 9.85, 9.95, 10.05, 10.15].entries()) {
    const hitAt = bossHits.filter((b) => b[1] !== 9999)[i][0]
    const from = hero(at)
    const la = facing(at) + (i % 2 ? 0.8 : -0.8)
    BOLTS.push({ fire: at, hit: hitAt, from, ctrl: v(from.x + Math.cos(la) * 260, from.y + Math.sin(la) * 260), to: boss(hitAt) })
  }
  const th = hero(G.telegraph)
  TELEGRAPHS.push(th, v(th.x - 130, th.y + 95), v(th.x + 120, th.y + 115))
  DMG.sort((a, b) => a.at - b.at)
})()

export const GAME_HIT_BEATS = DMG.map((d) => d.at)
export const GAME_LOOT_BEATS = LOOT.map((l) => l.magnet + 0.35)
export const GAME_BOLT_BEATS = BOLTS.map((b) => b.fire)

function bossHp(lb: number) {
  let hp = BOSS_MAX
  for (const d of DMG) if (d.boss && d.at <= lb) hp -= d.value
  return Math.max(0, hp) / BOSS_MAX
}

/* ---------------------------------------------------------------- drawing */

let floorKey = ''
let floorPattern: CanvasPattern | null = null

function floor(g: CanvasRenderingContext2D, r: number) {
  const key = r.toFixed(2)
  if (key !== floorKey || !floorPattern) {
    floorKey = key
    const w = Math.max(8, Math.round(r * 3))
    const h = Math.max(8, Math.round(r * Math.sqrt(3)))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const tg = c.getContext('2d')!
    tg.strokeStyle = 'rgba(61,227,245,0.55)'
    tg.lineWidth = 1
    const hexAt = (x: number, y: number) => {
      tg.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU
        const px = x + (w / 3) * Math.cos(a)
        const py = y + (w / 3) * Math.sin(a)
        if (i) tg.lineTo(px, py)
        else tg.moveTo(px, py)
      }
      tg.closePath()
      tg.stroke()
    }
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) hexAt(x, y)
    floorPattern = g.createPattern(c, 'repeat')
  }
  return floorPattern
}

function enemyShape(g: CanvasRenderingContext2D, e: Enemy, p: V, lb: number, face: number, px: number) {
  const flash = lb >= e.hit && lb < e.hit + 0.12
  const grow = springOut((lb - e.spawn) * B, 3, 0.45)
  const r = e.r * grow
  if (r <= 0.3) return
  const hue = e.kind === 'brute' ? '#6C7BFF' : e.kind === 'add' ? NEON.hot : NEON.violet
  const n = e.kind === 'drone' ? 3 : e.kind === 'wisp' ? 4 : e.kind === 'brute' ? 4 : 6
  const rot = e.kind === 'drone' ? face + Math.PI / 2 : e.kind === 'brute' ? lb * 1.5 + e.seed : lb * 3 + e.seed
  polyPath(g, p.x, p.y, r, n, rot)
  g.fillStyle = flash ? NEON.white : col(hue, 0.28)
  g.fill()
  g.strokeStyle = flash ? NEON.white : hue
  g.lineWidth = 2 * px
  g.stroke()
  dot(g, p.x, p.y, r * 0.28, flash ? NEON.white : NEON.hot)
}

const bez2 = (a: V, c: V, b: V, t: number) =>
  v((1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y)

function camera(lb: number): { x: number; y: number; z: number } {
  const h = hero(lb)
  const follow = mix(v(0, 0), h, 0.35)
  const bossK = seg(lb, G.boss, G.bossLand + 0.3)
  return {
    x: lerp(follow.x, 20, bossK * 0.6),
    y: lerp(follow.y, -60, bossK),
    z: lerp(1.08, 1, seg(lb, 0, 1.2, easeOutCubic)) * lerp(1, 0.9, bossK) * (1 + hits(lb, [G.nova], 0.06, 7) + hits(lb, [G.boom], 0.1, 5)),
  }
}

export const gameScene: Scene = {
  id: 'game',

  fx(t, _env, fx) {
    const lb = t / B
    if (lb < -0.2 || lb > 12.2) return
    fx.flash +=
      hits(lb, [0], 0.3, 12) + hits(lb, [G.slash], 0.22, 14) + hits(lb, [G.lightning + 0.05], 0.35, 12) +
      hits(lb, [G.levelUp], 0.2, 10) + hits(lb, [G.bossLand], 0.4, 10) + hits(lb, [G.telegraphBoom], 0.3, 12) +
      hits(lb, [G.nova], 0.9, 8) + hits(lb, [G.boom], 1, 4.5)
    fx.shake +=
      hits(lb, [G.slash], 10, 10) + hits(lb, GAME_BOLT_BEATS.map((b) => b + 0.3), 1.6, 18) + hits(lb, [G.lightning + 0.05], 16, 9) +
      hits(lb, [G.bossLand], 20, 7) + hits(lb, [G.telegraphBoom], 12, 9) + hits(lb, [G.nova], 28, 6) + hits(lb, [G.boom], 34, 4) +
      (lb > G.shatter && lb < G.boom ? 3 : 0)
    fx.glitch += (lb >= G.boss && lb < G.boss + 0.15 ? 0.9 : 0) + (lb >= G.nova && lb < G.nova + 0.08 ? 0.6 : 0)
    fx.bloom += hits(lb, [G.nova], 1, 5) + hits(lb, [G.boom], 1.4, 3) + 0.2 * seg(lb, G.charge, G.nova)
    if (lb > G.boom) fx.flashColor = '#E9FFF6'
  },

  draw(g, t, env) {
    const lb = t / B
    if (lb < 0 || lb >= 12) return
    const W = warp(lb)
    const { cx, cy, U } = env
    const ws = env.portrait ? 0.74 : 1
    const cam = camera(lb)
    const scale = U * ws * cam.z
    const px = 1 / scale

    // --- the floor ---------------------------------------------------------------
    const fr = 60 * scale
    const pat = floor(g, fr)
    if (pat) {
      pat.setTransform(new DOMMatrix().translate(cx - cam.x * scale, cy - cam.y * scale))
      g.globalAlpha = 0.14 * clamp(lb / 0.2)
      g.fillStyle = pat
      g.fillRect(0, 0, env.W, env.H)
      g.globalAlpha = 1
    }
    const vg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(env.W, env.H) * 0.65)
    vg.addColorStop(0, 'rgba(5,8,13,0)')
    vg.addColorStop(1, 'rgba(5,8,13,0.92)')
    g.fillStyle = vg
    g.fillRect(0, 0, env.W, env.H)
    titleCard(g, env, lb, 'PLAY', NEON.mint, 3)

    g.save()
    g.translate(cx, cy)
    g.scale(scale, scale)
    g.translate(-cam.x, -cam.y)

    // floor ripple + arena
    const rip = seg(lb, 0, 1.3, easeOutCubic)
    if (rip < 1) ring(g, 0, 0, rip * 1300, (30 * (1 - rip) + 2) * px, col(NEON.cyan, 0.35 * (1 - rip)))
    g.save()
    g.rotate(lb * 0.08)
    g.setLineDash([6 * px * 3, 18 * px * 3])
    ring(g, 0, 0, 600, 1.5 * px, col(NEON.cyan, 0.3))
    g.setLineDash([])
    g.restore()
    ring(g, 0, 0, 620, 3 * px, col(NEON.blue, 0.18))

    // --- telegraphs ------------------------------------------------------------------
    TELEGRAPHS.forEach((p, i) => {
      const a = seg(lb, G.telegraph + i * 0.08, G.telegraph + i * 0.08 + 0.2)
      const fill = seg(lb, G.telegraph, G.telegraphBoom, (x) => x)
      if (lb < G.telegraphBoom && a > 0) {
        ring(g, p.x, p.y, 120, 2 * px, col(NEON.hot, 0.8 * a))
        g.fillStyle = col(NEON.hot, 0.14 * a)
        g.beginPath()
        g.arc(p.x, p.y, 120 * fill, 0, TAU)
        g.fill()
      }
      const db = (lb - G.telegraphBoom) * B
      if (db >= 0 && db < 0.7) {
        const k = easeOutCubic(db / 0.7)
        ring(g, p.x, p.y, 120 + k * 120, 8 * (1 - k) * px * 3, col(NEON.hot, 1 - k))
        glow(g, p.x, p.y, 200, NEON.hot, 0.5 * (1 - k))
        burst(g, p.x, p.y, db, { n: 18, seed: 60 + i, speed: 900, life: 0.6, size: 6, color: NEON.hot, kind: 'streak' })
      }
    })

    // --- loot on the ground, then magnetised --------------------------------------------
    LOOT.forEach((l, i) => {
      if (W < l.at) return
      const collect = l.magnet + 0.35
      if (W > collect) return
      const hop = clamp((W - l.at) / 0.4)
      let p = mix(l.from, l.land, easeOutCubic(hop))
      const z = 70 * 4 * hop * (1 - hop)
      const m = seg(W, l.magnet, collect, easeInCubic)
      if (m > 0) {
        const h = hero(W)
        const sw = Math.sin(m * Math.PI) * 60
        const d = norm(v(h.x - p.x, h.y - p.y))
        p = mix(p, h, m)
        p = v(p.x - d.y * sw, p.y + d.x * sw)
      }
      g.save()
      g.translate(p.x, p.y - z)
      g.rotate(W * 3 + i)
      polyPath(g, 0, 0, 9, 6)
      g.fillStyle = l.color
      g.fill()
      g.restore()
      glow(g, p.x, p.y - z, 36, l.color, 0.5)
    })

    // --- enemies -------------------------------------------------------------------------
    const h = hero(W)
    for (const e of ENEMIES) {
      if (W < e.spawn - 0.15 || W > e.die + 1.2) continue
      const p = pos(e, W)
      const ds = (W - e.spawn) * B
      if (ds < 0.5 && ds > -0.3) {
        const k = clamp((ds + 0.3) / 0.8)
        ring(g, p.x, p.y, 10 + k * 50, 2 * px, col(e.kind === 'add' ? NEON.hot : NEON.violet, 1 - k))
      }
      if (W < e.die) enemyShape(g, e, p, W, Math.atan2(h.y - p.y, h.x - p.x), px)
      const dd = (W - e.die) * B
      if (dd >= 0) {
        burst(g, p.x, p.y, dd, { n: 12, seed: e.seed, speed: 700, life: 0.7, size: 9, kind: 'shard', color: (i) => (i % 3 ? (e.kind === 'add' ? NEON.hot : NEON.violet) : NEON.white) })
        burst(g, p.x, p.y, dd, { n: 8, seed: e.seed + 0.5, speed: 1100, life: 0.35, size: 4, kind: 'streak', color: NEON.gold })
        const k = clamp(dd / 0.35)
        ring(g, p.x, p.y, e.r + k * 60, 3 * px * (1 - k) + px, col(NEON.white, 1 - k))
      }
    }

    // --- the boss ------------------------------------------------------------------------------
    if (lb >= G.boss - 0.2) {
      const bp = boss(W)
      const portal = seg(lb, G.boss - 0.2, G.bossLand)
      if (lb < G.bossLand + 0.6) {
        const k = easeOutCubic(portal)
        ring(g, 60, -250, 40 + k * 240, 3 * px, col(NEON.hot, 0.8 * (1 - seg(lb, G.bossLand, G.bossLand + 0.6))))
        ring(g, 60, -250, 20 + k * 160, 1.5 * px, col(NEON.violet, 0.8 * (1 - seg(lb, G.bossLand, G.bossLand + 0.6))))
      }
      const alive = lb < G.boom
      if (alive) {
        const hp = bossHp(lb)
        const hit = DMG.some((d) => d.boss && W >= d.at && W < d.at + 0.08)
        const crack = seg(lb, G.shatter, G.boom)
        const shake = crack * 8
        const bx = bp.x + (hash(Math.floor(t * 60)) - 0.5) * shake
        const by = bp.y + (hash(Math.floor(t * 60) + 5) - 0.5) * shake
        glow(g, bx, by, 260, NEON.hot, 0.25 + 0.4 * crack)
        // orbiting shield plates
        for (let i = 0; i < 6; i++) {
          if (hp < 0.5 && i % 2) continue
          const a = W * 1.4 + (i / 6) * TAU
          g.save()
          g.translate(bx + Math.cos(a) * 140, by + Math.sin(a) * 140)
          g.rotate(a + Math.PI / 2)
          g.fillStyle = col(NEON.violet, 0.3)
          g.strokeStyle = NEON.violet
          g.lineWidth = 2 * px
          g.beginPath()
          g.rect(-22, -7, 44, 14)
          g.fill()
          g.stroke()
          g.restore()
        }
        polyPath(g, bx, by, 88, 6, W * 0.4)
        g.fillStyle = hit ? NEON.white : col('#2A1030', 0.9)
        g.fill()
        g.strokeStyle = hit ? NEON.white : NEON.hot
        g.lineWidth = 4 * px
        g.stroke()
        polyPath(g, bx, by, 58, 6, -W * 0.7)
        g.strokeStyle = col(NEON.violet, 0.9)
        g.lineWidth = 2 * px
        g.stroke()
        dot(g, bx, by, 22 + 6 * Math.sin(W * 8), hit ? NEON.white : NEON.hot)
        // glowing cracks while it dies
        if (crack > 0) {
          g.strokeStyle = col(NEON.white, 0.4 + crack * 0.6)
          g.lineWidth = 3 * px
          g.beginPath()
          for (let i = 0; i < 7; i++) {
            const a = hash(i * 2.2) * TAU
            const len = 90 * clamp(crack * 1.6 - i * 0.12)
            g.moveTo(bx, by)
            g.lineTo(bx + Math.cos(a) * len * 0.5 + (hash(i) - 0.5) * 20, by + Math.sin(a) * len * 0.5)
            g.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len)
          }
          g.stroke()
        }
      }
      // the boom
      const db = (lb - G.boom) * B
      if (db >= 0) {
        for (let k = 0; k < 4; k++) {
          const p = easeOutCubic(clamp((db - k * 0.12) / 1.4))
          if (p > 0 && p < 1) ring(g, bp.x, bp.y, p * (900 + k * 300), (12 - k * 2) * px * (1 - p) * 3, col(k % 2 ? NEON.cyan : NEON.white, 1 - p))
        }
        burst(g, bp.x, bp.y, db, { n: 60, seed: 7, speed: 2200, life: 1.4, size: 16, kind: 'shard', drag: 2.5, color: (i) => [NEON.hot, NEON.violet, NEON.white, NEON.gold][i % 4] })
        burst(g, bp.x, bp.y, db, { n: 40, seed: 8, speed: 3200, life: 0.8, size: 5, kind: 'streak', color: NEON.white })
        glow(g, bp.x, bp.y, 600, NEON.white, 0.8 * clamp(1 - db / 0.6))
      }
    }

    // --- bullets ----------------------------------------------------------------------------------
    if (lb >= G.bullets && lb < 11) {
      const from = boss(G.bullets)
      const nf = hero(G.nova)
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * TAU + 0.1
        const d = (W - G.bullets) * 640
        const p = v(from.x + Math.cos(a) * d, from.y + Math.sin(a) * d)
        if (W > G.nova && dist(p, nf) < novaR(W)) continue
        const tail = v(from.x + Math.cos(a) * Math.max(0, d - 50), from.y + Math.sin(a) * Math.max(0, d - 50))
        g.strokeStyle = col(NEON.hot, 0.6)
        g.lineWidth = 6 * px * 2
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(tail.x, tail.y)
        g.lineTo(p.x, p.y)
        g.stroke()
        dot(g, p.x, p.y, 8, NEON.white)
      }
    }

    // --- the hero ----------------------------------------------------------------------------------
    const dashing = (W > 0 && W < 0.8) || (W > G.lightning && W < 5.05) || (W > G.dodge && W < G.dodge + 0.3)
    if (dashing) {
      for (let k = 7; k >= 1; k--) {
        const ph = hero(W - k * 0.035)
        dot(g, ph.x, ph.y, 18 * (1 - k / 9), col(NEON.cyan, 0.35 * (1 - k / 8)))
      }
    }
    const f = facing(W)
    glow(g, h.x, h.y, 90, NEON.cyan, 0.45)
    ring(g, h.x, h.y, 26, 2.5 * px, NEON.cyan)
    dot(g, h.x, h.y, 15, NEON.white)
    g.save()
    g.translate(h.x, h.y)
    g.rotate(f)
    g.fillStyle = NEON.cyan
    g.beginPath()
    g.moveTo(40, 0)
    g.lineTo(28, -9)
    g.lineTo(28, 9)
    g.closePath()
    g.fill()
    g.restore()

    // --- spin slash --------------------------------------------------------------------------------
    const ss = (W - G.slash) / 0.3
    if (ss > 0 && ss < 1.6) {
      const sweep = easeInOutCubic(clamp(ss))
      const end = -Math.PI / 2 + sweep * TAU
      const fade = 1 - clamp((ss - 1) / 0.6)
      for (let k = 0; k < 14; k++) {
        const a0 = end - (k / 14) * Math.min(sweep * TAU, 3.2)
        g.strokeStyle = col(k < 2 ? NEON.white : NEON.cyan, fade * (1 - k / 14))
        g.lineWidth = (14 - k * 0.8) * px
        g.beginPath()
        g.arc(h.x, h.y, 150, a0 - 0.24, a0)
        g.stroke()
      }
    }

    // --- bolts ---------------------------------------------------------------------------------------
    for (const b of BOLTS) {
      const k = (W - b.fire) / (b.hit - b.fire)
      if (k < 0 || k > 1.05) continue
      g.strokeStyle = col(NEON.blue, 0.9)
      g.lineWidth = 3 * px * 2
      g.lineCap = 'round'
      g.beginPath()
      for (let s = 0; s <= 8; s++) {
        const q = bez2(b.from, b.ctrl, b.to, clamp(k - (8 - s) * 0.035))
        if (s) g.lineTo(q.x, q.y)
        else g.moveTo(q.x, q.y)
      }
      g.stroke()
      const hd = bez2(b.from, b.ctrl, b.to, clamp(k))
      dot(g, hd.x, hd.y, 6, NEON.white)
      glow(g, hd.x, hd.y, 40, NEON.blue, 0.6)
    }

    // --- chain lightning -------------------------------------------------------------------------------
    if (W > G.lightning && W < G.lightning + 0.7) {
      const fade = 1 - seg(W, G.lightning + 0.4, G.lightning + 0.7)
      const pts = [hero(G.lightning + 0.02), ...CHAIN.filter((c) => W >= c.at).map((c) => c.p)]
      const jitter = Math.floor(t * 40)
      for (const [w, c] of [[9, NEON.cyan], [3, NEON.white]] as const) {
        g.strokeStyle = col(c, fade)
        g.lineWidth = w * px * 1.6
        g.lineJoin = 'miter'
        g.beginPath()
        pts.forEach((p, i) => {
          if (i === 0) {
            g.moveTo(p.x, p.y)
            return
          }
          const q = pts[i - 1]
          for (let s = 1; s <= 5; s++) {
            const m = mix(q, p, s / 5)
            const off = s < 5 ? (hash(i * 13 + s * 7 + jitter) - 0.5) * 50 : 0
            g.lineTo(m.x + off, m.y + off * 0.6)
          }
        })
        g.stroke()
      }
    }

    // --- nova --------------------------------------------------------------------------------------------
    const nf = hero(G.nova)
    if (W > G.charge && W < G.nova) {
      const c = seg(W, G.charge, G.nova)
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU + W * 2
        const r = lerp(260, 20, c) + hash(i) * 40 * (1 - c)
        dot(g, nf.x + Math.cos(a) * r, nf.y + Math.sin(a) * r, 5, i % 2 ? NEON.white : NEON.lime)
      }
      ring(g, nf.x, nf.y, lerp(240, 30, c), 3 * px, col(NEON.lime, c))
      glow(g, nf.x, nf.y, 160, NEON.lime, 0.6 * c)
    }
    if (W >= G.nova && W < G.nova + 1.2) {
      const R = novaR(W)
      const k = clamp((W - G.nova) / 1.2)
      ring(g, nf.x, nf.y, R, (60 * (1 - k) + 4) * px * 1.5, col(NEON.lime, 0.9 * (1 - k)))
      ring(g, nf.x, nf.y, R * 0.94, 6 * px, col(NEON.white, 1 - k))
      g.fillStyle = col(NEON.lime, 0.12 * (1 - k))
      g.beginPath()
      g.arc(nf.x, nf.y, R, 0, TAU)
      g.fill()
    }

    // --- damage numbers --------------------------------------------------------------------------------
    for (const d of DMG) {
      const dt = W - d.at
      if (dt < 0 || dt > 1.1) continue
      const pop = springOut(dt * B, 4, 0.4)
      const a = 1 - seg(dt, 0.7, 1.1)
      const size = (d.boss ? (d.value > 5000 ? 64 : 30) : d.crit ? 30 : 20) * pop
      const y = d.p.y - 40 - dt * 70
      g.font = font(size, 800, DISPLAY)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.globalAlpha = a
      const text = d.value > 5000 ? d.value.toLocaleString('en-US') : String(d.value)
      g.lineWidth = 5 * px
      g.strokeStyle = 'rgba(5,8,13,0.8)'
      g.strokeText(text, d.p.x, y)
      g.fillStyle = d.boss && d.value > 5000 ? NEON.lime : d.crit ? NEON.gold : NEON.white
      g.fillText(text, d.p.x, y)
      if (d.crit && d.value > 5000) {
        g.font = font(22, 800, DISPLAY)
        g.fillStyle = NEON.gold
        g.fillText('CRITICAL', d.p.x, y - 56)
      }
      g.globalAlpha = 1
    }

    // --- level up ------------------------------------------------------------------------------------------
    const lu = (lb - G.levelUp) * B
    // lu is in seconds: ~1.3 beats of LEVEL UP
    if (lu >= 0 && lu < 0.64) {
      const hp = hero(lb)
      const k = easeOutCubic(clamp(lu / 0.5))
      ring(g, hp.x, hp.y, 30 + k * 380, 8 * (1 - k) * px * 3 + px, col(NEON.gold, 1 - k))
      const pillar = 1 - clamp(lu / 0.64)
      const pg = g.createLinearGradient(0, hp.y - 700, 0, hp.y)
      pg.addColorStop(0, col(NEON.gold, 0))
      pg.addColorStop(1, col(NEON.gold, 0.5 * pillar))
      g.fillStyle = pg
      g.fillRect(hp.x - 40, hp.y - 700, 80, 700)
      const ta = 1 - seg(lu, 0.42, 0.64)
      const grad = g.createLinearGradient(hp.x - 150, 0, hp.x + 150, 0)
      grad.addColorStop(0, NEON.gold)
      grad.addColorStop(1, NEON.lime)
      kinetic(g, 'LEVEL UP', hp.x, hp.y - 110 - lu * 30, {
        size: 52,
        weight: 900,
        fill: grad,
        alpha: ta,
        letter: (i) => {
          const p = springOut(lu - i * 0.025, 3.5, 0.4)
          return { y: (1 - p) * 40, sx: p, sy: p }
        },
      })
    }
    g.restore()

    // --- boss title card -----------------------------------------------------------------------------------
    const bt = lb - G.boss
    if (bt >= 0 && bt < 1.4) {
      const a = clamp(bt / 0.1) * (1 - seg(bt, 1.0, 1.4))
      const band = seg(bt, 0, 0.2, easeOutExpo)
      g.fillStyle = col('#05080D', 0.55 * a)
      g.fillRect(0, cy - 90 * U * band, env.W, 180 * U * band)
      g.fillStyle = col(NEON.hot, a)
      g.fillRect(0, cy - 90 * U * band, env.W, 2)
      g.fillRect(0, cy + 90 * U * band - 2, env.W, 2)
      g.font = font(12, 500, MONO)
      g.textAlign = 'center'
      g.fillStyle = col(NEON.hot, a)
      g.fillText('⚠  BOSS ENCOUNTER  ⚠', cx, cy - 56 * U)
      const size = Math.min((env.portrait ? 100 : 120) * U, env.W / 9)
      kinetic(g, 'MERGE CONFLICT', cx, cy + 8 * U, {
        size,
        weight: 900,
        fill: NEON.white,
        alpha: a,
        split: 10 * (1 - clamp(bt / 0.4)) + 2,
        tracking: lerp(0.3, 0.02, easeOutExpo(clamp(bt / 0.5))),
      })
    }
  },

  hud(g, t, env) {
    const lb = t / B
    if (lb < 0 || lb >= 12) return
    slate(g, env, lb, '03', 'Game dev', NEON.mint, 12)
    const a = clamp((lb - 0.4) / 0.4) * (1 - seg(lb, 11, 11.8))
    if (a <= 0.003) return
    const W = warp(lb)
    g.globalAlpha = a
    const s = clamp(env.W / 1100, 0.66, 1)
    const bottom = env.bottom - 24

    // orbs
    const orb = (x: number, y: number, r: number, level: number, c: string, label: string) => {
      g.save()
      g.beginPath()
      g.arc(x, y, r, 0, TAU)
      g.clip()
      g.fillStyle = col('#05080D', 0.8)
      g.fillRect(x - r, y - r, r * 2, r * 2)
      const top = y + r - level * r * 2
      const wv = Math.sin(t * 4) * 3
      g.fillStyle = col(c, 0.75)
      g.beginPath()
      g.moveTo(x - r, top + wv)
      g.quadraticCurveTo(x, top - wv * 2, x + r, top + wv)
      g.lineTo(x + r, y + r)
      g.lineTo(x - r, y + r)
      g.fill()
      g.restore()
      ring(g, x, y, r, 2, col(c, 0.9))
      g.font = font(9, 500, MONO)
      g.textAlign = 'center'
      g.fillStyle = NEON.white
      g.fillText(label, x, y + r + 12)
    }
    const casts: [number, number][] = [
      [G.slash, 18],
      [G.bolts, 24],
      [G.lightning, 26],
      [7.85, 10],
      [G.nova, 48],
      [9.85, 10],
    ]
    let mana = 100
    let last = 0
    for (const [at, cost] of casts) {
      if (W < at) break
      mana = Math.min(100, mana + (at - last) * 9) - cost
      last = at
    }
    mana = Math.min(100, mana + (W - last) * 9)
    const r = 34 * s
    orb(env.W * 0.06 + r, bottom - r - 10, r, 0.92, NEON.mint, 'HP')
    orb(env.W * 0.94 - r, bottom - r - 10, r, Math.max(0.05, mana / 100), NEON.blue, 'MANA')

    // skill bar
    const skills = [
      { at: [G.slash], c: NEON.cyan },
      { at: [G.bolts, 7.85, 9.85], c: NEON.blue },
      { at: [G.lightning], c: NEON.white },
      { at: [G.nova], c: NEON.lime },
    ]
    const sz = 44 * s
    const gap = 10 * s
    const x0 = env.cx - (skills.length * sz + (skills.length - 1) * gap) / 2
    const y0 = bottom - sz - 18
    skills.forEach((sk, i) => {
      const x = x0 + i * (sz + gap)
      const used = sk.at.filter((b) => W >= b).pop()
      const cd = used !== undefined ? clamp((W - used) / 2.5) : 1
      const flash = used !== undefined ? 1 - clamp((W - used) / 0.3) : 0
      g.fillStyle = col(sk.c, 0.1 + 0.5 * flash)
      g.fillRect(x, y0, sz, sz)
      g.strokeStyle = col(sk.c, 0.5 + 0.5 * flash)
      g.lineWidth = 1.5
      g.strokeRect(x, y0, sz, sz)
      // icon
      g.save()
      g.translate(x + sz / 2, y0 + sz / 2)
      g.strokeStyle = sk.c
      g.fillStyle = sk.c
      g.lineWidth = 2
      g.beginPath()
      if (i === 0) g.arc(0, 0, sz * 0.26, -2.4, 1.2)
      if (i === 1) {
        g.moveTo(-sz * 0.25, sz * 0.2)
        g.lineTo(sz * 0.25, -sz * 0.2)
        g.lineTo(sz * 0.08, -sz * 0.2)
        g.moveTo(sz * 0.25, -sz * 0.2)
        g.lineTo(sz * 0.25, -sz * 0.03)
      }
      if (i === 2) {
        g.moveTo(sz * 0.06, -sz * 0.3)
        g.lineTo(-sz * 0.12, sz * 0.02)
        g.lineTo(sz * 0.1, sz * 0.02)
        g.lineTo(-sz * 0.06, sz * 0.3)
      }
      if (i === 3) for (let k = 0; k < 8; k++) {
        const a2 = (k / 8) * TAU
        g.moveTo(Math.cos(a2) * sz * 0.1, Math.sin(a2) * sz * 0.1)
        g.lineTo(Math.cos(a2) * sz * 0.3, Math.sin(a2) * sz * 0.3)
      }
      g.stroke()
      g.restore()
      if (cd < 1) {
        g.fillStyle = 'rgba(5,8,13,0.6)'
        g.beginPath()
        g.moveTo(x + sz / 2, y0 + sz / 2)
        g.arc(x + sz / 2, y0 + sz / 2, sz * 0.72, -Math.PI / 2 + cd * TAU, Math.PI * 1.5)
        g.closePath()
        g.save()
        g.beginPath()
        g.rect(x, y0, sz, sz)
        g.clip()
        g.fill()
        g.restore()
      }
      g.font = font(9, 500, MONO)
      g.textAlign = 'left'
      g.fillStyle = col(NEON.white, 0.6)
      g.fillText(String(i + 1), x + 4, y0 + 10)
    })

    // xp bar
    const collected = LOOT.filter((l) => W > l.magnet + 0.35).length
    const xp = W < G.levelUp ? collected / LOOT.length : clamp((collected - LOOT.length) / 10 + 0.08)
    const bw = skills.length * sz + (skills.length - 1) * gap
    g.fillStyle = col(NEON.white, 0.12)
    g.fillRect(x0, y0 - 12, bw, 4)
    g.fillStyle = W >= G.levelUp && W < G.levelUp + 0.6 ? NEON.white : NEON.gold
    g.fillRect(x0, y0 - 12, bw * xp, 4)
    g.font = font(9, 500, MONO)
    g.textAlign = 'right'
    g.fillStyle = col(NEON.gold, 0.9)
    g.fillText(W >= G.levelUp ? 'LV 43' : 'LV 42', x0 + bw, y0 - 22)

    // combo counter
    const combo = DMG.filter((d) => d.at <= W).length
    if (combo > 0) {
      const lastHit = DMG.filter((d) => d.at <= W).pop()!.at
      const pop = 1 + 0.35 * Math.exp(-(W - lastHit) * B * 9)
      const x = env.W * (env.portrait ? 0.9 : 0.92)
      const y = env.top + (env.portrait ? 120 : 150)
      g.save()
      g.translate(x, y)
      g.scale(pop, pop)
      g.font = font(44 * s, 900, DISPLAY)
      g.textAlign = 'right'
      g.fillStyle = NEON.white
      g.fillText(`${combo}`, 0, 0)
      g.restore()
      g.font = font(10, 500, MONO)
      g.textAlign = 'right'
      g.fillStyle = NEON.mint
      g.fillText('HIT COMBO', x, y + 30 * s)
    }

    // minimap
    if (!env.portrait) {
      const mx = env.W * 0.94 - 52
      const my = env.top + 64
      const mr = 48
      g.fillStyle = 'rgba(5,8,13,0.55)'
      g.beginPath()
      g.arc(mx, my, mr, 0, TAU)
      g.fill()
      ring(g, mx, my, mr, 1.5, col(NEON.cyan, 0.6))
      const ms = mr / 700
      for (const e of ENEMIES) {
        if (W < e.spawn || W > e.die) continue
        const p = pos(e, W)
        dot(g, mx + p.x * ms, my + p.y * ms, 1.8, e.kind === 'add' ? NEON.hot : NEON.violet)
      }
      if (lb > G.boss && lb < G.boom) {
        const bp = boss(W)
        dot(g, mx + bp.x * ms, my + bp.y * ms, 4, NEON.hot)
      }
      const hp = hero(W)
      dot(g, mx + hp.x * ms, my + hp.y * ms, 3, NEON.white)
    }

    // boss bar
    const ba = seg(lb, G.bossLand - 0.2, G.bossLand + 0.2) * (1 - seg(lb, G.boom, G.boom + 0.4))
    if (ba > 0.003) {
      const hp = bossHp(W)
      const trail = bossHp(W - 0.35)
      const bw2 = Math.min(560, env.W * 0.5)
      const bx = env.cx - bw2 / 2
      const by = env.top + 70
      g.globalAlpha = a * ba
      g.font = font(12, 800, DISPLAY)
      g.textAlign = 'center'
      g.fillStyle = NEON.white
      g.fillText('MERGE CONFLICT', env.cx, by - 14)
      g.fillStyle = 'rgba(5,8,13,0.7)'
      g.fillRect(bx, by, bw2, 10)
      g.fillStyle = col(NEON.white, 0.7)
      g.fillRect(bx, by, bw2 * trail, 10)
      g.fillStyle = NEON.hot
      g.fillRect(bx, by, bw2 * hp, 10)
      g.strokeStyle = col(NEON.hot, 0.8)
      g.lineWidth = 1
      g.strokeRect(bx, by, bw2, 10)
      g.font = font(9, 500, MONO)
      g.fillStyle = col(NEON.white, 0.7)
      g.fillText(`${Math.round(hp * BOSS_MAX).toLocaleString('en-US')} / ${BOSS_MAX.toLocaleString('en-US')}`, env.cx, by + 24)
    }
    g.globalAlpha = 1
  },

  debug(g, t, env) {
    const lb = t / B
    if (lb < 0 || lb >= 12) return
    const W = warp(lb)
    const ws = env.portrait ? 0.74 : 1
    const cam = camera(lb)
    const scale = env.U * ws * cam.z
    g.save()
    g.translate(env.cx, env.cy)
    g.scale(scale, scale)
    g.translate(-cam.x, -cam.y)
    g.strokeStyle = 'rgba(255,79,216,0.9)'
    g.lineWidth = 1 / scale
    for (const e of ENEMIES) {
      if (W < e.spawn || W > e.die) continue
      const p = pos(e, W)
      g.beginPath()
      g.arc(p.x, p.y, e.r + 6, 0, TAU)
      g.stroke()
    }
    const h = hero(W)
    g.beginPath()
    g.arc(h.x, h.y, 30, 0, TAU)
    g.stroke()
    g.restore()
  },
}

