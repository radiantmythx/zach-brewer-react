import { resample } from '../line'
import {
  clamp,
  easeInOutCubic,
  easeOutCubic,
  hash,
  invLerp,
  lerp,
  mixRgb,
  noise1,
  rgba,
  ring,
  seg,
  smoothstep,
  TAU,
  win,
  WHITE,
} from '../math'
import { glowDot, roundRect, setSpacing, style, uiFont, type Scene, type SceneEnv } from '../scene'
import { CHAPTERS } from '../timeline'
import { strike } from './string'

/*
 * CHAPTER 03 — GAME DESIGN
 * The unrolled spiral is the horizon; hills rise out of it and the level
 * builds itself. A little hero drops in, runs, and jumps on the beat — over
 * spikes, onto a block, through a coin arc — then flips for a gem and stomps
 * the world flat. The stomp is a hammer strike on what becomes a string.
 */

const JADE = CHAPTERS[2].rgb
const GOLD = CHAPTERS[3].rgb

export const JUMPS = [
  { t0: 2.25, air: 0.5, h: 150, spin: false },
  { t0: 3.25, air: 0.5, h: 200, spin: false },
  { t0: 4.25, air: 0.75, h: 190, spin: false },
  { t0: 6.0, air: 1.5, h: 330, spin: true },
]
export const DROP_LAND = 1.5
export const LANDINGS = [DROP_LAND, ...JUMPS.map((j) => j.t0 + j.air)]
export const STOMP = 7.5
export const COINS = [
  { t: 2.5, gem: false },
  { t: 4.5, gem: false },
  { t: 4.625, gem: false },
  { t: 4.75, gem: false },
  { t: 6.75, gem: true },
]

/* ---- world scroll: integrated once, looked up per frame ---- */

const DT = 1 / 240
const speed1 = (t: number) => seg(t, 1.3, 2.0, smoothstep) * (1 - seg(t, 6.6, 7.4, smoothstep))
const SCROLL = (() => {
  const n = Math.ceil(9 / DT) + 1
  const s = new Float32Array(n)
  let acc = 0
  for (let i = 1; i < n; i++) {
    acc += speed1(i * DT) * DT
    s[i] = acc
  }
  return s
})()
function scroll1(t: number) {
  const f = clamp(t, 0, 9) / DT
  const i = Math.floor(f)
  const j = Math.min(i + 1, SCROLL.length - 1)
  return lerp(SCROLL[i], SCROLL[j], f - i)
}

/* ---- level geometry ---- */

const SPIKE = 34

interface Level {
  v: number
  size: number
  hScale: number
  wc: (t: number) => number
  hillEnd: number
  s1: number
  s2: number
  b0: number
  b1: number
  bump: number
}

let levelKey = ''
let lv: Level | null = null

function level(env: SceneEnv): Level {
  const { L, f } = env
  const key = `${f.portrait}|${L.charX}|${L.groundY}`
  if (key !== levelKey || !lv) {
    levelKey = key
    const v = f.portrait ? 300 : 430
    const wc = (t: number) => scroll1(t) * v + L.charX
    lv = {
      v,
      size: f.portrait ? 34 : 38,
      hScale: f.portrait ? 0.85 : 1,
      wc,
      hillEnd: wc(1.9),
      s1: wc(2.5),
      s2: wc(4.625) + 12,
      b0: wc(3.75) - 34,
      b1: wc(4.25) + 26,
      bump: wc(5.5),
    }
  }
  return lv
}

function spikes(xw: number, c: number, n: number) {
  const x = xw - (c - (n * SPIKE) / 2)
  if (x < 0 || x > n * SPIKE) return 0
  const fr = (x % SPIKE) / SPIKE
  return 1 - Math.abs(fr * 2 - 1)
}

function terrainAt(xw: number, amp: number, env: SceneEnv, l: Level) {
  if (amp <= 0) return env.L.groundY
  const hills =
    (28 * Math.sin(xw * 0.0042 + 1.1) + 15 * Math.sin(xw * 0.011 + 0.3) + 6 * Math.sin(xw * 0.027 + 2)) *
    (1 - smoothstep(invLerp(l.hillEnd - 280, l.hillEnd, xw)))
  const bump = 44 * Math.exp(-(((xw - l.bump) / 240) ** 2) * 3)
  const block = smoothstep(invLerp(l.b0 - 5, l.b0 + 5, xw)) * (1 - smoothstep(invLerp(l.b1 - 5, l.b1 + 5, xw)))
  const h = hills + bump + 36 * spikes(xw, l.s1, 3) + 36 * spikes(xw, l.s2, 4) + 80 * block
  return env.L.groundY - amp * h
}

const ampAt = (t: number) => seg(t, 0, 1.2, easeInOutCubic) * (1 - seg(t, STOMP, STOMP + 0.25, easeOutCubic))

/* ---- the hero ---- */

interface Hero {
  y: number
  rot: number
  sx: number
  sy: number
  a: number
  lift: number
}

function hero(t: number, env: SceneEnv, l: Level): Hero {
  const ground = (tt: number) => terrainAt(l.wc(tt), ampAt(tt), env, l)
  const slope = (tt: number) => {
    const x = l.wc(tt)
    const a = ampAt(tt)
    return Math.atan2(terrainAt(x + 6, a, env, l) - terrainAt(x - 6, a, env, l), 12)
  }
  let y = ground(t)
  let rot = slope(t)
  let lift = 0
  let a = 1
  let airborne = false
  let takeoff = -1

  if (t < DROP_LAND) {
    const p = clamp((t - 1.0) / (DROP_LAND - 1.0))
    y = lerp(env.f.visT - 80, ground(DROP_LAND), p * p)
    lift = ground(DROP_LAND) - y
    rot = 0
    a = t < 1.0 ? 0 : 1
  }
  for (const j of JUMPS) {
    if (t >= j.t0 && t < j.t0 + j.air) {
      const p = (t - j.t0) / j.air
      const base = lerp(ground(j.t0), ground(j.t0 + j.air), p)
      lift = j.h * l.hScale * 4 * p * (1 - p)
      y = base - lift
      rot = j.spin ? TAU * easeInOutCubic(p) : lerp(slope(j.t0), slope(j.t0 + j.air), p) + Math.sin(Math.PI * p) * 0.22
      airborne = true
      takeoff = j.t0
    }
  }

  let sq = 0
  for (const tl of LANDINGS) if (t >= tl && t - tl < 0.9) sq = 0.34 * ring(t - tl, 3.0, 9)
  const st = airborne ? 0.24 * ring(t - takeoff, 2.2, 8) : 0
  let sy = 1 - sq + st
  let sx = 1 + sq * 0.9 - st * 0.6

  if (!airborne && t > DROP_LAND && t < STOMP) {
    const bob = Math.abs(Math.sin(t * TAU * 4)) * speed1(t)
    y -= bob * 3.5
    sy *= 1 - bob * 0.04
  }
  if (t >= STOMP) {
    const k = easeOutCubic(clamp((t - STOMP) / 0.08))
    sy = lerp(1, 0.22, k)
    sx = lerp(1, 1.7, k)
    a = 1 - seg(t, STOMP + 0.05, STOMP + 0.3)
    rot = 0
  }
  return { y, rot, sx, sy, a, lift }
}

function drawHero(g: CanvasRenderingContext2D, x: number, h: Hero, t: number, s: number, env: SceneEnv) {
  if (h.a <= 0.003) return
  const cy = h.y - (s * h.sy) / 2
  glowDot(g, x, cy, s * 1.5, JADE, 0.35 * h.a)
  g.save()
  g.translate(x, cy)
  g.rotate(h.rot)
  g.scale(h.sx, h.sy)
  const grad = g.createLinearGradient(0, -s / 2, 0, s / 2)
  grad.addColorStop(0, rgba(mixRgb(JADE, WHITE, 0.45), h.a))
  grad.addColorStop(1, rgba(JADE, h.a))
  roundRect(g, -s / 2, -s / 2, s, s, s * 0.24)
  g.fillStyle = grad
  g.fill()
  // eyes, with a blink or two
  let blink = 1
  for (const b of [3.05, 5.55]) blink *= 1 - 0.9 * win(t, b, b + 0.05, b + 0.08, b + 0.13)
  g.fillStyle = `rgba(4,40,26,${h.a})`
  const ew = s * 0.11
  const eh = s * 0.26 * blink
  roundRect(g, s * 0.06, -s * 0.18 - eh / 2 + s * 0.02, ew, eh, ew / 2)
  g.fill()
  roundRect(g, s * 0.26, -s * 0.18 - eh / 2 + s * 0.02, ew, eh, ew / 2)
  g.fill()
  g.restore()
  void env
}

function drawGem(g: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number, a: number) {
  const sx = Math.max(0.18, Math.abs(Math.cos(spin)))
  const pts = [
    [0, -r],
    [r * sx, 0],
    [0, r],
    [-r * sx, 0],
  ]
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[(i + 1) % 4]
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + ax, y + ay)
    g.lineTo(x + bx, y + by)
    g.closePath()
    g.fillStyle = rgba(mixRgb(CHAPTERS[i].rgb, WHITE, 0.15), a)
    g.fill()
  }
}

export const gameScene: Scene = {
  line(t, env, out) {
    const l = level(env)
    const { f, L } = env
    const S = l.v * scroll1(t)
    const amp = ampAt(t)
    const x0 = f.visL - 20
    const x1 = f.visR + 20
    const xp = (L.charX - x0) / (x1 - x0)
    const sAmp = f.portrait ? 120 : 165
    resample((s, o) => {
      const x = lerp(x0, x1, s)
      o.x = x
      o.y = terrainAt(x + S, amp, env, l) + strike(s, t - STOMP, xp, sAmp)
    }, out)
    return style(1, 0, 0.08)
  },

  back(g, t, env) {
    const a = win(t, 0.1, 1.2, 7.3, 8.0)
    if (a < 0.003) return
    const l = level(env)
    const { f, L, px } = env
    const S = l.v * scroll1(t)
    const span = f.visR - f.visL + 200
    for (let i = 0; i < 90; i++) {
      const hx = hash(i * 3.1 + 1)
      const hy = hash(i * 7.7 + 2)
      const x = f.visL - 100 + ((((hx * span - S * 0.05) % span) + span) % span)
      const y = f.visT + hy * (L.groundY - 260 - f.visT)
      const tw = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(env.time * (1 + hash(i) * 2) * 2 + i))
      g.fillStyle = `rgba(255,255,255,${0.55 * a * tw})`
      const s = (hash(i * 1.3) > 0.85 ? 2.2 : 1.4) * px
      g.fillRect(x, y, s, s)
    }
    const ridge = (off: number, baseY: number, amp: number, freq: number, alpha: number) => {
      g.strokeStyle = `rgba(255,255,255,${alpha})`
      g.lineWidth = px
      g.beginPath()
      for (let x = f.visL; x <= f.visR + 12; x += 10) {
        const y =
          baseY - amp * (0.5 + 0.5 * noise1((x + off) * freq)) - amp * 0.35 * noise1((x + off) * freq * 3.1 + 7)
        if (x === f.visL) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    ridge(S * 0.18, L.groundY - 200, 80, 0.0035, 0.1 * a)
    ridge(S * 0.42, L.groundY - 110, 45, 0.006, 0.07 * a)
  },

  front(g, t, env) {
    if (t < 0.5 || t > 8.7) return
    const l = level(env)
    const { L, px, f } = env
    const S = l.v * scroll1(t)
    const s = l.size

    // --- coins & the gem ------------------------------------------------------
    const coinA = win(t, 0.8, 1.4, 7.4, 7.8)
    let score = 0
    let coins = 0
    let lastCollect = -10
    for (const c of COINS) {
      const cx = l.wc(c.t) - S
      const cy = hero(c.t, env, l).y - s * 0.5
      if (t < c.t) {
        if (cx < f.visL - 40 || cx > f.visR + 40) continue
        const bob = Math.sin(env.time * 3 + c.t * 5) * 4
        const spin = env.time * 4 + c.t * 3
        if (c.gem) {
          glowDot(g, cx, cy + bob, 70 * px, WHITE, 0.4 * coinA)
          drawGem(g, cx, cy + bob, 17, spin, coinA)
        } else {
          glowDot(g, cx, cy + bob, 34 * px, GOLD, 0.5 * coinA)
          const w = 9 * Math.max(0.18, Math.abs(Math.cos(spin)))
          g.fillStyle = rgba(mixRgb(GOLD, WHITE, 0.2), coinA)
          g.beginPath()
          g.moveTo(cx, cy + bob - 11)
          g.lineTo(cx + w, cy + bob)
          g.lineTo(cx, cy + bob + 11)
          g.lineTo(cx - w, cy + bob)
          g.closePath()
          g.fill()
        }
      } else {
        score += c.gem ? 1000 : 100
        coins += 1
        lastCollect = c.t
        const dt = t - c.t
        if (dt < 0.8) {
          const n = c.gem ? 16 : 10
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * TAU + hash(i + c.t) * 0.6
            const dist = easeOutCubic(clamp(dt / 0.55)) * ((c.gem ? 70 : 38) + hash(i * 2 + c.t) * 30)
            const col = c.gem ? CHAPTERS[i % 4].rgb : GOLD
            g.fillStyle = rgba(mixRgb(col, WHITE, 0.3), (1 - clamp(dt / 0.55)) * coinA)
            const r = (c.gem ? 3.2 : 2.4) * (1 - dt / 0.8)
            g.fillRect(cx + Math.cos(ang) * dist - r / 2, cy + Math.sin(ang) * dist - r / 2, r, r)
          }
          const ta = 1 - clamp(dt / 0.75)
          g.font = uiFont(env, c.gem ? 12 : 11, 500)
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillStyle = rgba(c.gem ? WHITE : mixRgb(GOLD, WHITE, 0.3), ta * coinA)
          g.fillText(c.gem ? '+1000' : '+100', cx, cy - 26 - dt * 70)
          g.textAlign = 'left'
        }
      }
    }

    // --- the hero ----------------------------------------------------------------
    const h = hero(t, env, l)
    if (h.lift > 6 && h.a > 0) {
      const gy = terrainAt(l.wc(t), ampAt(t), env, l)
      const k = clamp(1 - h.lift / 420)
      g.fillStyle = `rgba(0,0,0,${0.35 * k})`
      g.beginPath()
      g.ellipse(L.charX, gy + 3, s * 0.55 * k, 4 * k, 0, 0, TAU)
      g.fill()
    }
    drawHero(g, L.charX, h, t, s, env)

    // dust on landings
    for (const tl of LANDINGS) {
      const dt = t - tl
      if (dt < 0 || dt > 0.45 || tl === STOMP) continue
      const gy = terrainAt(l.wc(tl), ampAt(tl), env, l)
      for (let i = 0; i < 6; i++) {
        const dir = i % 2 ? 1 : -1
        const d = easeOutCubic(dt / 0.45) * (18 + hash(i + tl) * 26)
        g.fillStyle = `rgba(255,255,255,${0.4 * (1 - dt / 0.45)})`
        const r = 2.2 + hash(i * 3 + tl) * 2
        g.beginPath()
        g.arc(L.charX + dir * (s * 0.4 + d), gy - 2 - d * 0.25, r, 0, TAU)
        g.fill()
      }
    }

    // --- the stomp ---------------------------------------------------------------
    const ds = t - STOMP
    if (ds >= 0 && ds < 0.9) {
      const k = easeOutCubic(ds / 0.9)
      g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - ds / 0.9)})`
      g.lineWidth = 1.5 * px
      g.beginPath()
      g.ellipse(L.charX, L.groundY, 30 + k * 300, (30 + k * 300) * 0.16, 0, 0, TAU)
      g.stroke()
      glowDot(g, L.charX, L.groundY, 180, mixRgb(JADE, GOLD, 0.5), 0.5 * (1 - clamp(ds / 0.3)))
      for (let i = 0; i < 14; i++) {
        const ang = -Math.PI * (0.08 + 0.84 * hash(i * 5.1))
        const d = easeOutCubic(clamp(ds / 0.6)) * (50 + hash(i * 2.3) * 90)
        g.fillStyle = rgba(mixRgb(JADE, WHITE, 0.4), 1 - clamp(ds / 0.6))
        g.fillRect(L.charX + Math.cos(ang) * d, L.groundY + Math.sin(ang) * d, 3, 3)
      }
    }

    // --- HUD -----------------------------------------------------------------------
    const ha = win(t, 1.0, 1.5, 7.2, 7.7)
    if (ha > 0.003) {
      const hx = f.portrait ? 40 : 70
      const hy = f.portrait ? 40 : 64
      g.font = uiFont(env, 11, 500)
      setSpacing(g, '0.12em')
      g.textBaseline = 'middle'
      g.fillStyle = `rgba(255,255,255,${0.45 * ha})`
      g.fillText('WORLD 1-1', hx, hy)
      const pop = 1 + 0.35 * Math.max(0, ring(t - lastCollect, 2.5, 10))
      g.save()
      g.translate(hx + 110 * px, hy)
      g.scale(pop, pop)
      g.fillStyle = `rgba(255,255,255,${0.85 * ha})`
      g.fillText(`SCORE ${String(score).padStart(6, '0')}`, 0, 0)
      g.restore()
      g.fillStyle = rgba(GOLD, 0.9 * ha)
      g.fillText(`◆ ${String(coins).padStart(2, '0')}`, hx + 250 * px, hy)
      setSpacing(g, '0px')
    }
  },
}
