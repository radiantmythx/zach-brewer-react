import { B, caption, circle, col, line, pb, typeText } from '../kit'
import { clamp, easeInCubic, easeOutCubic, hash, lerp, TAU } from '../math'
import type { Scene } from '../scene'
import { CHAPTERS, INK } from '../timeline'

/*
 * FIG. 03 GAME SYSTEMS — beats 24–32. An action RPG, abstracted to its
 * systems: 160 agents stream along a spiral flow field toward a moving
 * point; they resolve on a sixteenth-note grid of arc sweeps and radial
 * bursts. Then a structure draws in, takes four fast cuts — each one offsets
 * everything on one side of it — and shatters. Pure function of time.
 */

type V = [number, number]

const N = 260
const SWEEPS = Array.from({ length: 11 }, (_, i) => 0.5 + i * 0.5)
const BURSTS = [1, 2, 3, 4, 5]
export const GAME_CUTS = [6.0, 6.25, 6.5, 6.75]
export const GAME_SHATTER = 7.2

const hero = (lb: number, R: number): V => [R * 0.34 * Math.sin(lb * 1.9), R * 0.24 * Math.sin(lb * 2.7 + 0.6)]

interface Agent {
  s: number
  T: number
  a: number
  bend: number
  die: number
}

// Agents arrive in tight waves — one every sixteenth note, each fanning in
// from a shared bearing — so the field reads as streams, not noise.
const WAVES = 20
const PER_WAVE = N / WAVES
const AGENTS: Agent[] = Array.from({ length: N }, (_, i) => {
  const w = Math.floor(i / PER_WAVE)
  const j = i % PER_WAVE
  const s = 0.3 + w * 0.25 + j * 0.012
  const T = 0.38 + hash(i * 3.1) * 0.26
  const die = Math.ceil((s + T * 0.92) * 4) / 4
  const bearing = hash(w * 9.7) * TAU
  return { s, T, a: bearing + (j / PER_WAVE - 0.5) * 0.8, bend: (hash(w * 4.4) - 0.5) * 1.8 + (j / PER_WAVE - 0.5) * 0.3, die }
})
/** agent resolutions (local beats) for the soundtrack — sixteenths, deduped */
export const GAME_HIT_BEATS = [...new Set(AGENTS.map((a) => a.die))].sort((a, b) => a - b)

function agentPos(ag: Agent, lb: number, R: number): V {
  const k = clamp((Math.min(lb, ag.die) - ag.s) / ag.T)
  const e = easeInCubic(k)
  const S: V = [Math.cos(ag.a) * R, Math.sin(ag.a) * R]
  const ca = ag.a + ag.bend
  const C: V = [Math.cos(ca) * R * 0.62, Math.sin(ca) * R * 0.62]
  const H = hero(Math.min(lb, ag.die), R)
  const m = 1 - e
  return [m * m * S[0] + 2 * m * e * C[0] + e * e * H[0], m * m * S[1] + 2 * m * e * C[1] + e * e * H[1]]
}

/** The structure: three nested hexagons + spokes, as segments. */
function structure(r: number, lb: number): [V, V][] {
  const segs: [V, V][] = []
  const rings = [
    [r, lb * 0.35],
    [r * 0.68, -lb * 0.6],
    [r * 0.38, lb * 0.9],
  ]
  const verts = rings.map(([rr, rot]) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = rot + (i / 6) * TAU
      return [Math.cos(a) * rr, Math.sin(a) * rr] as V
    }),
  )
  for (const vs of verts) for (let i = 0; i < 6; i++) segs.push([vs[i], vs[(i + 1) % 6]])
  for (let i = 0; i < 6; i++) {
    segs.push([verts[0][i], verts[1][i]])
    segs.push([verts[1][i], verts[2][(i + 1) % 6]])
  }
  return segs
}

const CUT_ANGLES = [0.35, -0.9, 1.35, -0.2]
const CUT_OFFS = [0.12, -0.2, 0.05, 0.25]

export const gameScene: Scene = {
  id: 'game',

  fx(t, _env, fx) {
    fx.zoom *= 1 + 0.03 * clamp(t / (8 * B))
  },

  draw(g, t, env) {
    const lb = t / B
    const { U, cx, cy } = env
    const R = (env.portrait ? 300 : 265) * U
    const P = ([x, y]: V): V => [cx + x, cy + y]
    g.lineWidth = 1

    // --- arena: lattice, flow field, graduated ring ---------------------------------
    const ap = pb(lb, 0, 0.8, easeOutCubic)
    const sp = 26 * U
    g.fillStyle = col(INK.ink, 0.22 * ap)
    for (let row = -14; row <= 14; row++) {
      for (let c = -14; c <= 14; c++) {
        const x = (c + (row % 2 ? 0.5 : 0)) * sp
        const y = row * sp * 0.866
        if (x * x + y * y > R * R * 0.96) continue
        g.fillRect(cx + x - 0.6, cy + y - 0.6, 1.2, 1.2)
      }
    }
    const flow = pb(lb, 0.2, 1.2)
    for (let k = 0; k < 28; k++) {
      const a0 = (k / 28) * TAU + lb * 0.18
      g.strokeStyle = col(k % 2 ? INK.moss : INK.ocean, 0.09 * flow)
      g.beginPath()
      for (let s = 0; s <= 28; s++) {
        const r = R * (1 - s / 30)
        const a = a0 + (s / 28) * 1.5
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (s === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    g.strokeStyle = col(INK.ink, 0.7)
    circle(g, cx, cy, R, ap)
    g.strokeStyle = col(INK.ink, 0.35)
    g.beginPath()
    for (let k = 0; k < 72 * ap; k++) {
      const a = (k / 72) * TAU - Math.PI / 2
      const l = k % 6 === 0 ? 9 : 4
      g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
      g.lineTo(cx + Math.cos(a) * (R + l), cy + Math.sin(a) * (R + l))
    }
    g.stroke()
    ;['000°', '090°', '180°', '270°'].forEach((lab, i) => {
      const a = (i / 4) * TAU - Math.PI / 2
      typeText(g, lab, cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22), pb(lb, 0.5, 0.9, (v) => v), 8.5, INK.muted, 'center')
    })

    // --- agents ------------------------------------------------------------------------
    let resolved = 0
    for (let i = 0; i < N; i++) {
      const ag = AGENTS[i]
      if (lb < ag.s) continue
      if (lb >= ag.die) {
        resolved++
        const dt = lb - ag.die
        if (dt < 0.6) {
          const [x, y] = P(agentPos(ag, ag.die, R))
          const k = easeOutCubic(clamp(dt / 0.4))
          g.strokeStyle = col(INK.ocean, 1 - clamp(dt / 0.6))
          circle(g, x, y, 3 + k * 12 * Math.max(0.6, U))
          const c = 4 * (1 - k * 0.4)
          line(g, x - c, y - c, x + c, y + c)
          line(g, x - c, y + c, x + c, y - c)
        }
        continue
      }
      const [x, y] = P(agentPos(ag, lb, R))
      const [px, py] = P(agentPos(ag, lb - 0.05, R))
      const a = Math.atan2(y - py, x - px)
      // short streak behind
      g.strokeStyle = col(INK.ocean, 0.38)
      g.beginPath()
      for (let s = 0; s <= 8; s++) {
        const [tx, ty] = P(agentPos(ag, lb - 0.3 + (s / 8) * 0.3, R))
        if (s === 0) g.moveTo(tx, ty)
        else g.lineTo(tx, ty)
      }
      g.stroke()
      g.strokeStyle = INK.ink
      g.lineWidth = 1.5
      const len = 6
      line(g, x - Math.cos(a) * len, y - Math.sin(a) * len, x + Math.cos(a) * len, y + Math.sin(a) * len)
      g.lineWidth = 1
    }

    // --- the moving point ------------------------------------------------------------------
    const H = P(hero(lb, R))
    const shatterP = pb(lb, GAME_SHATTER, GAME_SHATTER + 0.8)
    g.strokeStyle = col(INK.moss, 0.5)
    g.beginPath()
    for (let k = 0; k <= 30; k++) {
      const [x, y] = P(hero(lb - 0.6 + (k / 30) * 0.6, R))
      if (k === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
    g.strokeStyle = INK.moss
    circle(g, H[0], H[1], 7)
    g.fillStyle = INK.moss
    g.fillRect(H[0] - 1.5, H[1] - 1.5, 3, 3)
    const rot = lb * 2
    for (let i = 0; i < 4; i++) {
      const a = rot + (i * TAU) / 4
      line(g, H[0] + Math.cos(a) * 11, H[1] + Math.sin(a) * 11, H[0] + Math.cos(a) * 16, H[1] + Math.sin(a) * 16)
    }

    // --- arc sweeps ------------------------------------------------------------------------------
    for (const s of SWEEPS) {
      const dt = lb - s
      if (dt < 0 || dt > 0.45) continue
      const [hx, hy] = P(hero(s, R))
      const r = 84 * U + 14
      const a0 = s * 2.3
      const span = 5.2 * easeOutCubic(clamp(dt / 0.14))
      const fade = 1 - clamp((dt - 0.12) / 0.33)
      g.strokeStyle = col(INK.moss, fade)
      g.lineWidth = 2
      g.beginPath()
      g.arc(hx, hy, r, a0, a0 + span)
      g.stroke()
      g.lineWidth = 1
      g.strokeStyle = col(INK.moss, 0.6 * fade)
      g.beginPath()
      for (let k = 0; k < 14; k++) {
        const a = a0 + (k / 14) * span
        g.moveTo(hx + Math.cos(a) * (r - 5), hy + Math.sin(a) * (r - 5))
        g.lineTo(hx + Math.cos(a) * (r + 5), hy + Math.sin(a) * (r + 5))
      }
      g.stroke()
    }

    // --- radial bursts -----------------------------------------------------------------------------
    for (const b of BURSTS) {
      const dt = lb - b
      if (dt < 0 || dt > 0.4) continue
      const [hx, hy] = P(hero(b, R))
      const head = easeOutCubic(clamp(dt / 0.12))
      const tail = easeInCubic(clamp((dt - 0.08) / 0.3))
      g.strokeStyle = INK.ink
      g.beginPath()
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * TAU + b
        const r0 = lerp(14, 190 * U + 24, tail)
        const r1 = lerp(14, 190 * U + 24, head)
        g.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0)
        g.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1)
      }
      g.stroke()
    }

    // --- the structure: draws in, takes four cuts, shatters ------------------------------------------
    const build = pb(lb, 5.0, 5.7)
    if (build > 0 && shatterP < 1) {
      const segs = structure(R * 0.55, lb)
      const cuts = GAME_CUTS.map((at, j) => {
        const a = CUT_ANGLES[j]
        const n: V = [-Math.sin(a), Math.cos(a)]
        const off = CUT_OFFS[j] * R
        return { at, a, n, off, k: easeOutCubic(clamp((lb - at) / 0.25)) }
      })
      g.strokeStyle = col(INK.lagoon, 1 - shatterP)
      g.lineWidth = 1.2
      g.beginPath()
      segs.forEach(([p0, p1], i) => {
        const draw = clamp(build * 1.6 - (i / segs.length) * 0.6)
        if (draw <= 0) return
        const mx = (p0[0] + p1[0]) / 2
        const my = (p0[1] + p1[1]) / 2
        let dx = 0
        let dy = 0
        for (const c of cuts) {
          if (c.k <= 0) continue
          const side = mx * c.n[0] + my * c.n[1] - c.off > 0 ? 1 : -1
          dx += c.n[0] * side * 9 * U * c.k
          dy += c.n[1] * side * 9 * U * c.k
        }
        if (shatterP > 0) {
          const ang = Math.atan2(my, mx) + (hash(i) - 0.5) * 0.8
          const d = shatterP * (160 + hash(i * 3) * 220) * U
          dx += Math.cos(ang) * d
          dy += Math.sin(ang) * d
        }
        const spin = shatterP * (hash(i * 5) - 0.5) * 3
        const hx = (p1[0] - p0[0]) / 2
        const hy = (p1[1] - p0[1]) / 2
        const rx = hx * Math.cos(spin) - hy * Math.sin(spin)
        const ry = hx * Math.sin(spin) + hy * Math.cos(spin)
        const ox = cx + mx + dx
        const oy = cy + my + dy
        g.moveTo(ox - rx * draw, oy - ry * draw)
        g.lineTo(ox + rx * draw, oy + ry * draw)
      })
      g.stroke()
      g.lineWidth = 1
      // the cuts themselves
      for (const c of cuts) {
        const dt = lb - c.at
        if (dt < 0 || dt > 0.5) continue
        const p = easeOutCubic(clamp(dt / 0.1))
        const fade = 1 - clamp((dt - 0.1) / 0.4)
        const dir: V = [Math.cos(c.a), Math.sin(c.a)]
        const o: V = [cx + c.n[0] * c.off, cy + c.n[1] * c.off]
        const L = R * 1.15
        g.strokeStyle = col(INK.ink, fade)
        line(g, o[0] - dir[0] * L, o[1] - dir[1] * L, o[0] + dir[0] * L, o[1] + dir[1] * L, p)
      }
    }

    // --- readout ----------------------------------------------------------------------------------------
    const rx0 = env.fig.x + 4
    const ry0 = env.fig.y + 12
    const ro = pb(lb, 0.4, 0.8, (v) => v)
    typeText(g, `AGENTS      ${String(N).padStart(4, '0')}`, rx0, ry0, ro, 9.5, INK.ink2)
    typeText(g, `RESOLVED    ${String(resolved).padStart(4, '0')}`, rx0, ry0 + 15, ro, 9.5, INK.ocean)
    typeText(g, `STRUCTURE   ${lb < 5 ? '—' : shatterP > 0 ? 'BROKEN' : `${4 - GAME_CUTS.filter((c) => lb >= c).length}/4`}`, rx0, ry0 + 30, ro, 9.5, INK.lagoon)
    typeText(g, `Δt 16.7 MS   FRAME ${String(Math.floor(t * 60)).padStart(5, '0')}`, rx0, ry0 + 45, ro, 9.5, INK.muted)
  },

  hud(g, t, env) {
    caption(g, env, t / B, 3, CHAPTERS[2])
  },

  debug(g, t, env) {
    const lb = t / B
    const R = (env.portrait ? 300 : 265) * env.U
    g.strokeStyle = 'rgba(214,51,132,0.7)'
    g.lineWidth = 1
    for (const ag of AGENTS) {
      if (lb < ag.s || lb >= ag.die) continue
      const [x, y] = agentPos(ag, lb, R)
      g.strokeRect(env.cx + x - 6, env.cy + y - 6, 12, 12)
    }
  },
}

