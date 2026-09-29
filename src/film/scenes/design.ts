import { bez, clamp, easeInCubic, easeInOutCubic, easeOutCubic, easeOutExpo, hash, lerp, seg, springOut, TAU } from '../math'
import { burst, col, DISPLAY, font, glow, hits, MONO, polyPath, SERIF, slate, titleCard } from '../kit'
import type { Env, Scene } from '../scene'
import { BEAT, NEON } from '../timeline'

/*
 * 02 DESIGN — beats 16–24.
 * The code's singularity becomes a pen: one fast swoosh with anchors and
 * handles. A modular grid shoots in, shapes snap into it on the beat with
 * bounding boxes and smart guides, a type specimen slams in and cycles
 * typefaces, a palette pops and recolours everything — then the hexagon
 * zooms through the lens and becomes the game's floor.
 */

const B = BEAT

// pen swoosh: three cubic segments, in composition units around centre
const SWOOSH: [number, number][][] = [
  [[0, 0], [220, -270], [540, -250], [580, -40]],
  [[580, -40], [620, 170], [300, 310], [0, 230]],
  [[0, 230], [-330, 150], [-620, -110], [-540, -300]],
]

const SHAPES = [
  { kind: 3 as const, cell: [0, 0], at: 2 },
  { kind: 4 as const, cell: [1, 1], at: 2.5 },
  { kind: 0 as const, cell: [2, 0], at: 3 },
  { kind: 6 as const, cell: [3, 1], at: 3.5 },
]
export const DESIGN_SNAP_BEATS = SHAPES.map((s) => s.at)
const SWATCHES = [NEON.blue, NEON.cyan, NEON.mint, NEON.lime, NEON.hot]
export const DESIGN_SWATCH_BEATS = SWATCHES.map((_, i) => 5 + i * 0.25)
const FACES = [
  { name: 'Instrument Serif', family: SERIF, weight: 400, style: '' },
  { name: 'Unbounded 900', family: DISPLAY, weight: 900, style: '' },
  { name: 'Geist Mono', family: MONO, weight: 500, style: '' },
  { name: 'Instrument Serif Italic', family: SERIF, weight: 400, style: 'italic' },
]

function geom(env: Env) {
  const p = env.portrait
  const grid = p ? { x0: -400, x1: 400, y0: -560, y1: -60 } : { x0: -730, x1: -50, y0: -270, y1: 270 }
  const cols = 4
  const rows = 2
  const cw = (grid.x1 - grid.x0) / cols
  const ch = (grid.y1 - grid.y0) / rows
  const spec = p ? { x: 0, y: 300 } : { x: 390, y: 10 }
  const swatchY = p ? 600 : 380
  const swatchX = p ? 0 : -390
  return { grid, cols, rows, cw, ch, spec, swatchY, swatchX, r: Math.min(cw, ch) * 0.34 }
}

function shapePath(g: CanvasRenderingContext2D, kind: number, x: number, y: number, r: number, rot: number) {
  if (kind === 0) {
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
  } else if (kind === 4) {
    polyPath(g, x, y, r * 1.18, 4, rot + Math.PI / 4)
  } else polyPath(g, x, y, r * (kind === 3 ? 1.2 : 1.08), kind, rot)
}

export const designScene: Scene = {
  id: 'design',

  fx(t, _env, fx) {
    const lb = t / B
    if (lb < -0.2 || lb > 8.2) return
    fx.flash += hits(lb, [0], 0.35, 14) + hits(lb, [4], 0.25, 14) + hits(lb, [7.95], 0.6, 20)
    fx.shake += hits(lb, DESIGN_SNAP_BEATS, 4, 14) + hits(lb, [4], 9, 10) + hits(lb, [6.5], 12, 8)
    fx.zoom *= 1 + hits(lb, [4], 0.04, 9) + hits(lb, DESIGN_SNAP_BEATS, 0.012, 12)
    fx.glitch += (lb >= 5 && lb < 5.08 ? 0.9 : 0) + (lb >= 5.5 && lb < 5.58 ? 0.9 : 0) + (lb >= 6 && lb < 6.08 ? 0.6 : 0)
  },

  draw(g, t, env) {
    const lb = t / B
    if (lb < 0 || lb >= 8) return
    const { U, cx, cy } = env
    const G = geom(env)
    const sx = env.portrait ? 0.62 : 1
    const P = (x: number, y: number): [number, number] => [cx + x * U, cy + y * U]
    const blast = seg(lb, 6.5, 7.2, easeInCubic)
    const out = (x: number, y: number, i: number): [number, number] => {
      // everything but the hexagon flies outward on the blast
      if (blast <= 0) return [x, y]
      const a = Math.atan2(y - cy, x - cx) + (hash(i) - 0.5) * 0.6
      const d = blast * 1400 * U
      return [x + Math.cos(a) * d, y + Math.sin(a) * d]
    }
    const fadeB = 1 - blast

    titleCard(g, env, lb, 'DESIGN', NEON.cyan)

    // --- the pen swoosh ------------------------------------------------------------
    const pen = seg(lb, 0, 1.45, easeInOutCubic) * 3
    const swA = (1 - seg(lb, 2.6, 3.6)) * fadeB
    if (swA > 0.003 && pen > 0) {
      const pts: [number, number][] = []
      const N = 150
      for (let i = 0; i <= N; i++) {
        const s = (i / N) * pen
        const k = Math.min(2, Math.floor(s))
        const f = s - k
        const c = SWOOSH[k]
        pts.push(P(bez(c[0][0], c[1][0], c[2][0], c[3][0], f) * sx, bez(c[0][1], c[1][1], c[2][1], c[3][1], f)))
      }
      const grad = g.createLinearGradient(cx - 600 * U, 0, cx + 600 * U, 0)
      grad.addColorStop(0, NEON.mint)
      grad.addColorStop(1, NEON.cyan)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      for (const [w, a, s] of [
        [10, 0.25, grad],
        [3.5, 1, grad],
        [1.2, 0.9, NEON.white],
      ] as const) {
        g.strokeStyle = s
        g.globalAlpha = a * swA
        g.lineWidth = w * Math.max(0.6, U * 1.4)
        g.beginPath()
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
        g.stroke()
      }
      g.globalAlpha = 1
      // anchors + handles appear as the pen passes each one
      SWOOSH.forEach((c, k) => {
        const reached = clamp((pen - k) * 4)
        if (reached <= 0) return
        const [ax, ay] = P(c[0][0] * sx, c[0][1])
        const [hx, hy] = P(c[1][0] * sx, c[1][1])
        const hl = easeOutCubic(reached)
        g.strokeStyle = col(NEON.white, 0.55 * swA)
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(ax, ay)
        g.lineTo(lerp(ax, hx, hl), lerp(ay, hy, hl))
        g.stroke()
        g.fillStyle = col(NEON.white, swA)
        g.beginPath()
        g.arc(lerp(ax, hx, hl), lerp(ay, hy, hl), 4, 0, TAU)
        g.fill()
        const s = 10 * springOut((pen - k) * 0.4, 3, 0.4)
        g.fillStyle = col('#05080D', swA)
        g.fillRect(ax - s / 2, ay - s / 2, s, s)
        g.strokeStyle = col(NEON.cyan, swA)
        g.lineWidth = 1.5
        g.strokeRect(ax - s / 2, ay - s / 2, s, s)
      })
      if (pen < 3) {
        const [x, y] = pts[pts.length - 1]
        glow(g, x, y, 60 * U, NEON.white, 0.8)
      }
    }

    // --- modular grid --------------------------------------------------------------
    const gridP = seg(lb, 1.5, 2.05, easeOutExpo)
    const gridA = gridP * (1 - seg(lb, 6.3, 6.8)) * 0.35
    if (gridA > 0.003) {
      g.strokeStyle = col(NEON.cyan, gridA)
      g.lineWidth = 1
      const gx = (G.grid.x0 + G.grid.x1) / 2
      const gy = (G.grid.y0 + G.grid.y1) / 2
      g.beginPath()
      for (let c = 0; c <= G.cols; c++) {
        const x = G.grid.x0 + c * G.cw
        const [px, py0] = P(x, gy - ((G.grid.y1 - G.grid.y0) / 2 + 60) * gridP)
        const [, py1] = P(x, gy + ((G.grid.y1 - G.grid.y0) / 2 + 60) * gridP)
        g.moveTo(px, py0)
        g.lineTo(px, py1)
      }
      for (let r = 0; r <= G.rows; r++) {
        const y = G.grid.y0 + r * G.ch
        const [px0, py] = P(gx - ((G.grid.x1 - G.grid.x0) / 2 + 60) * gridP, y)
        const [px1] = P(gx + ((G.grid.x1 - G.grid.x0) / 2 + 60) * gridP, y)
        g.moveTo(px0, py)
        g.lineTo(px1, py)
      }
      g.stroke()
    }

    // --- shapes snap into the grid ---------------------------------------------------
    const beat4 = springOut(t - 4 * B, 2.6, 0.4)
    SHAPES.forEach((sh, i) => {
      const p = springOut(t - sh.at * B, 3, 0.42)
      if (p <= 0) return
      const isHex = sh.kind === 6
      let [x, y] = P(G.grid.x0 + (sh.cell[0] + 0.5) * G.cw, G.grid.y0 + (sh.cell[1] + 0.5) * G.ch)
      let r = G.r * U * p
      let rot = (1 - clamp(p)) * 1.6 + beat4 * (Math.PI / 2) * (isHex ? 1 / 3 : 1)
      let a = 1
      if (isHex) {
        // the hexagon survives the blast, heads for centre and flies through the lens
        const home = seg(lb, 6.6, 7.35, easeInOutCubic)
        x = lerp(x, cx, home)
        y = lerp(y, cy, home)
        const zoom = Math.pow(seg(lb, 7.3, 8, easeInCubic), 2.2)
        r *= 1 + zoom * 40
        rot += zoom * 0.6
      } else {
        ;[x, y] = out(x, y, i)
        rot += blast * 4
        a = fadeB
      }
      const swatch = lb >= DESIGN_SWATCH_BEATS[i] ? SWATCHES[i] : NEON.cyan
      g.globalAlpha = a
      shapePath(g, sh.kind, x, y, r, rot)
      g.fillStyle = col(swatch, 0.14)
      g.fill()
      g.strokeStyle = swatch
      g.lineWidth = isHex && lb > 7.3 ? 4 : 2.5
      g.stroke()
      g.globalAlpha = 1

      // bounding box + dimension on snap
      const bb = clamp((lb - sh.at) / 0.1) * (1 - clamp((lb - sh.at - 0.55) / 0.3)) * fadeB
      if (bb > 0.003 && !(isHex && lb > 6.6)) {
        const s = G.r * U * 1.3
        g.strokeStyle = col(NEON.white, 0.8 * bb)
        g.lineWidth = 1
        g.strokeRect(x - s, y - s, s * 2, s * 2)
        g.fillStyle = col(NEON.white, bb)
        for (const [hx, hy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
          g.fillRect(x + hx * s - 3, y + hy * s - 3, 6, 6)
        g.font = font(10, 500, MONO)
        g.textAlign = 'center'
        g.fillStyle = col(NEON.cyan, bb)
        g.fillText(`${Math.round(G.r * 2.6)} × ${Math.round(G.r * 2.6)}`, x, y + s + 16)
        // smart guide to the previous shape
        if (i > 0) {
          const prev = SHAPES[i - 1]
          const [px, py] = P(G.grid.x0 + (prev.cell[0] + 0.5) * G.cw, G.grid.y0 + (prev.cell[1] + 0.5) * G.ch)
          g.strokeStyle = col(NEON.lime, 0.9 * bb)
          g.setLineDash([4, 4])
          g.beginPath()
          g.moveTo(px, py)
          g.lineTo(x, y)
          g.stroke()
          g.setLineDash([])
        }
      }
      burst(g, x, y, t - sh.at * B - 0.08, { n: 12, seed: i + 40, speed: 420 * U, life: 0.45, size: 3, color: swatch, kind: 'streak' })
    })

    // --- type specimen: slams in, cycles faces ---------------------------------------
    const spP = springOut(t - 4 * B, 2.8, 0.45)
    const spA = spP > 0 ? clamp(spP * 3) * fadeB : 0
    if (spA > 0.003) {
      const face = FACES[lb < 5 ? 0 : lb < 5.5 ? 1 : lb < 6 ? 2 : 3]
      let [x, y] = P(G.spec.x, G.spec.y)
      ;[x, y] = out(x, y, 9)
      const size = (env.portrait ? 300 : 400) * U
      const base = y + size * 0.3
      const s = lerp(1.5, 1, clamp(spP))
      // metric lines
      const lines = [
        ['ascender', 0.8],
        ['cap height', 0.7],
        ['x-height', 0.47],
        ['baseline', 0],
        ['descender', -0.22],
      ] as const
      const lp = seg(lb, 4.2, 4.8, easeOutExpo)
      g.font = font(10, 500, MONO)
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      lines.forEach(([label, k], i) => {
        const ly = base - k * size
        const w = (env.portrait ? 380 : 330) * U
        const pi = clamp(lp * 1.6 - i * 0.15)
        g.fillStyle = col(i === 3 ? NEON.mint : NEON.cyan, (i === 3 ? 0.9 : 0.4) * spA)
        g.fillRect(x - w, ly, w * 2 * pi, 1)
        g.fillStyle = col(NEON.white, 0.55 * spA * pi)
        g.textAlign = 'right'
        g.fillText(label, x + w, ly - 8)
      })
      g.save()
      g.translate(x, base)
      g.scale(s, s)
      g.globalAlpha = spA
      g.font = font(size, face.weight, face.family, face.style)
      g.textAlign = 'center'
      g.textBaseline = 'alphabetic'
      const grad = g.createLinearGradient(0, -size * 0.8, 0, 0)
      grad.addColorStop(0, NEON.white)
      grad.addColorStop(1, NEON.cyan)
      g.fillStyle = grad
      g.fillText('Aa', 0, 0)
      g.restore()
      g.globalAlpha = spA
      g.font = font(11, 500, MONO)
      g.textAlign = 'center'
      g.fillStyle = NEON.mint
      g.fillText(face.name.toUpperCase(), x, base + size * 0.36)
      g.globalAlpha = 1
    }

    // --- palette ------------------------------------------------------------------------
    SWATCHES.forEach((c, i) => {
      const p = springOut(t - DESIGN_SWATCH_BEATS[i] * B, 3, 0.4)
      if (p <= 0) return
      let [x, y] = P(G.swatchX + (i - 2) * (env.portrait ? 120 : 92), G.swatchY)
      ;[x, y] = out(x, y, i + 20)
      const r = 26 * U * p
      g.globalAlpha = fadeB
      g.fillStyle = c
      g.beginPath()
      g.arc(x, y, Math.max(0, r), 0, TAU)
      g.fill()
      g.font = font(9, 500, MONO)
      g.textAlign = 'center'
      g.fillStyle = col(NEON.white, 0.6 * clamp(p))
      g.fillText(c.toUpperCase(), x, y + r + 14)
      g.globalAlpha = 1
    })

    // --- the lens: hexagon interior becomes the floor ------------------------------------
    const zoom = seg(lb, 7.55, 8)
    if (zoom > 0) {
      g.fillStyle = col('#07131A', zoom)
      g.fillRect(0, 0, env.W, env.H)
    }
  },

  hud(g, t, env) {
    slate(g, env, t / B, '02', 'Design', NEON.cyan)
  },
}
