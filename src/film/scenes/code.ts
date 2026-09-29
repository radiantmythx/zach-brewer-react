import { burst, col, decay, dot, font, glow, hits, MONO, ring, SERIF, slate, titleCard } from '../kit'
import { clamp, easeInCubic, easeOutExpo, hash, lerp, seg, springOut } from '../math'
import type { Env, Scene } from '../scene'
import { BEAT, NEON } from '../timeline'

/*
 * 01 PROGRAMMING — beats 8–16.
 * Code rains past in three depth layers while a function assembles itself,
 * one token per eighth note, each flying in and landing with a spark. RUN
 * scans it, giant braces clap it shut, it glitches while compiling, and every
 * glyph spirals into a single point — which becomes the design pen.
 */

const B = BEAT

type Kind = 'kw' | 'fn' | 'param' | 'op' | 'num' | 'punct'
const COLOR: Record<Kind, string> = {
  kw: NEON.blue,
  fn: NEON.mint,
  param: NEON.white,
  op: '#9FB3C8',
  num: NEON.lime,
  punct: '#9FB3C8',
}

const TOKENS: { line: number; text: string; kind: Kind; at: number }[] = [
  { line: 0, text: 'function', kind: 'kw', at: 0.5 },
  { line: 0, text: ' play', kind: 'fn', at: 0.75 },
  { line: 0, text: '(beat)', kind: 'param', at: 1.0 },
  { line: 0, text: ' {', kind: 'punct', at: 1.5 },
  { line: 1, text: '  return', kind: 'kw', at: 2.0 },
  { line: 1, text: ' ease', kind: 'fn', at: 2.25 },
  { line: 1, text: '(beat)', kind: 'param', at: 2.5 },
  { line: 1, text: ' *', kind: 'op', at: 2.75 },
  { line: 1, text: ' 128', kind: 'num', at: 3.0 },
  { line: 2, text: '}', kind: 'punct', at: 3.5 },
]
/** beat times (local) the soundtrack uses for token hits */
export const CODE_TOKEN_BEATS = TOKENS.map((t) => t.at)

const RAIN = [
  'const scene = await load(reel)',
  'for (const e of enemies) e.update(dt)',
  'export function mix(a, b, t) {',
  'ctx.globalCompositeOperation = "lighter"',
  'if (hp <= 0) return shatter(boss)',
  'return springOut(t, 3.2, 0.45)',
  'query { profile { name craft } }',
  'await deploy({ env: "prod" })',
  'bloom.push(downsample(frame))',
  'const hue = lerp(blue, mint, k)',
  'type Beat = { at: number; hit: () => void }',
  'osc.frequency.exponentialRampToValueAtTime',
  'shapes.map(s => snap(s, grid))',
  'while (running) render(now())',
  'public async Task<Result> Run()',
  'services.AddGraphQLServer()',
  'git commit -m "ship it"',
  'grid.cells.filter(c => c.walkable)',
]

const GLITCH = '!<>-_/\\[]{}=+*^?#01%&$'

interface Glyph {
  ch: string
  x: number
  y: number
  color: string
  at: number
  tok: number
}

function layout(g: CanvasRenderingContext2D, env: Env) {
  const fs = (env.portrait ? 38 : 54) * env.U
  g.font = font(fs, 500, MONO)
  const cw = g.measureText('0').width
  const lh = fs * 1.55
  const longest = 25
  const left = env.cx - (longest * cw) / 2
  const top = env.cy - lh
  const glyphs: Glyph[] = []
  const tokenCenters: { x: number; y: number }[] = []
  const col0 = [0, 0, 0]
  TOKENS.forEach((tk, ti) => {
    const start = col0[tk.line]
    const y = top + tk.line * lh
    for (let i = 0; i < tk.text.length; i++) {
      const ch = tk.text[i]
      if (ch !== ' ') glyphs.push({ ch, x: left + (start + i + 0.5) * cw, y, color: COLOR[tk.kind], at: tk.at, tok: ti })
    }
    const trimmed = tk.text.trimStart()
    const lead = tk.text.length - trimmed.length
    tokenCenters.push({ x: left + (start + lead + trimmed.length / 2) * cw, y })
    col0[tk.line] += tk.text.length
  })
  return { fs, cw, lh, left, top, right: left + longest * cw, bottom: top + 2 * lh, glyphs, tokenCenters }
}

function rain(g: CanvasRenderingContext2D, env: Env, t: number, alpha: number) {
  if (alpha <= 0.003) return
  const layers = [
    { size: 12, a: 0.045, speed: 70 },
    { size: 15, a: 0.07, speed: 150 },
    { size: 19, a: 0.1, speed: 280 },
  ]
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  layers.forEach((L, li) => {
    g.font = font(L.size, 400, MONO)
    const lh = L.size * 2.2
    const rows = Math.ceil(env.H / lh) + 2
    const total = rows * lh
    const shift = t * L.speed
    for (let row = 0; row < rows; row++) {
      const y = ((((row * lh - shift) % total) + total) % total) - lh
      for (let k = 0; k < 2; k++) {
        const h = hash(row * 17.3 + k * 91.7 + li * 311)
        const text = RAIN[Math.floor(h * RAIN.length)]
        const x = hash(row * 5.1 + k * 13.7 + li * 7) * env.W * 0.9 - 40
        const c = h > 0.66 ? NEON.mint : h > 0.33 ? NEON.blue : NEON.cyan
        g.fillStyle = col(c, L.a * alpha * (0.5 + hash(row + k) * 0.5))
        g.fillText(text, x, y)
      }
    }
  })
}

export const codeScene: Scene = {
  id: 'code',

  fx(t, _env, fx) {
    const lb = t / B
    if (lb < -0.2 || lb > 8.2) return
    fx.flash += hits(lb, [0], 0.4, 14) + hits(lb, [4], 0.18, 14)
    fx.shake += hits(lb, CODE_TOKEN_BEATS.map((b) => b + 0.1), 2.5, 16) + hits(lb, [4.6, 4.85], 5, 12) + hits(lb, [5, 5.5], 9, 10)
    fx.zoom *= 1 + hits(lb, [0], 0.05, 8) + hits(lb, [5, 5.5], 0.03, 10) - 0.04 * seg(lb, 6.5, 7.8, easeInCubic)
    fx.glitch += lb >= 5.6 && lb < 6.5 ? 0.35 + 0.35 * hash(Math.floor(t * 20)) : 0
    fx.bloom += 0.4 * seg(lb, 7, 7.9)
  },

  draw(g, t, env) {
    const lb = t / B
    if (lb < 0 || lb >= 8) return
    const L = layout(g, env)
    const implode = seg(lb, 6.5, 7.75, easeInCubic)

    rain(g, env, t, clamp(lb / 0.4) * (1 - seg(lb, 6.2, 7.2)))
    titleCard(g, env, lb, 'CODE', NEON.blue)
    glow(g, env.cx, env.cy, 640 * env.U, NEON.blue, 0.12 * (1 - implode))

    // --- giant serif braces swing in and clap -------------------------------------
    const braceSize = (env.portrait ? 360 : 520) * env.U
    const brace = (ch: string, side: -1 | 1, at: number) => {
      const p = springOut(t - at * B, 2.6, 0.45)
      if (p <= 0) return
      const clap = hits(lb, [5, 5.5], 1, 9)
      const home = side < 0 ? L.left - 0.2 * braceSize : L.right + 0.2 * braceSize
      let x = lerp(env.cx + side * env.W * 0.7, home, p) - side * clap * 34 * env.U
      let y = env.cy - L.lh * 0.1
      x = lerp(x, env.cx, implode)
      y = lerp(y, env.cy, implode)
      g.save()
      g.translate(x, y)
      g.rotate((1 - clamp(p)) * side * 1.1 + implode * side * 2.5)
      g.scale(1 - implode, 1 - implode)
      g.font = font(braceSize, 400, SERIF)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillStyle = col(NEON.cyan, 0.95)
      g.fillText(ch, 0, 0)
      g.restore()
    }
    brace('{', -1, 4.5)
    brace('}', 1, 4.75)

    // --- the function ----------------------------------------------------------------
    g.font = font(L.fs, 500, MONO)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const scanY = lerp(L.top - L.lh, L.bottom + L.lh, seg(lb, 4, 4.6))
    const scanning = lb >= 4 && lb < 4.6
    const glitching = lb >= 5.6 && lb < 6.6
    for (let i = 0; i < L.glyphs.length; i++) {
      const gl = L.glyphs[i]
      const tk = L.tokenCenters[gl.tok]
      const p = springOut(t - gl.at * B, 3.4, 0.5)
      if (p <= 0) continue
      const h = hash(gl.tok * 7.7 + 1)
      const ang = h * Math.PI * 2
      const from = 760 * env.U
      // fly in as a token (relative to the token centre), then settle
      let x = gl.x + Math.cos(ang) * from * (1 - p)
      let y = gl.y + Math.sin(ang) * from * (1 - p)
      const rot = (1 - clamp(p)) * (hash(gl.tok * 3.1) - 0.5) * 2.4
      let s = lerp(2.4, 1, clamp(p))
      if (implode > 0) {
        const dx = x - env.cx
        const dy = y - env.cy
        const a = Math.atan2(dy, dx) + implode * 3.2
        const r = Math.hypot(dx, dy) * (1 - implode)
        x = env.cx + Math.cos(a) * r
        y = env.cy + Math.sin(a) * r
        s *= 1 - implode * 0.85
      }
      let ch = gl.ch
      let c = gl.color
      if (scanning && gl.y < scanY) c = NEON.white
      if (glitching && hash(i * 3.7 + Math.floor(t * 24)) < 0.32) {
        ch = GLITCH[Math.floor(hash(i + Math.floor(t * 30)) * GLITCH.length)]
        x += (hash(i * 9 + Math.floor(t * 30)) - 0.5) * 18 * env.U
        c = hash(i) > 0.5 ? NEON.hot : NEON.cyan
      }
      if (implode > 0.6) c = NEON.white
      g.save()
      g.translate(x, y)
      if (rot) g.rotate(rot + ((gl.x - tk.x) / 900) * (1 - clamp(p)))
      g.scale(s, s)
      g.fillStyle = c
      g.globalAlpha = clamp(p * 3)
      g.fillText(ch, 0, 0)
      g.restore()
    }

    // landing sparks for every token
    L.tokenCenters.forEach((c, i) => {
      const dt = t - TOKENS[i].at * B - 0.1
      burst(g, c.x, c.y, dt, { n: 10, seed: i + 20, speed: 520 * env.U, life: 0.4, size: 3, color: COLOR[TOKENS[i].kind], kind: 'streak' })
    })

    // RUN: scan bar, label, progress
    if (scanning) {
      g.fillStyle = col(NEON.mint, 0.9)
      g.fillRect(L.left - 40 * env.U, scanY, L.right - L.left + 80 * env.U, 2)
      glow(g, env.cx, scanY, 400 * env.U, NEON.mint, 0.18)
    }
    const runA = clamp((lb - 4) / 0.15) * (1 - seg(lb, 6.2, 6.6))
    if (runA > 0) {
      const y = L.bottom + L.lh * 0.95
      g.globalAlpha = runA
      g.font = font(13, 500, MONO)
      g.textAlign = 'left'
      g.fillStyle = NEON.mint
      const prog = seg(lb, 4, 5.2, easeOutExpo)
      g.fillText(prog < 1 ? '▶ RUN' : '✓ compiled in 12 ms', L.left, y)
      g.fillStyle = col(NEON.white, 0.15)
      g.fillRect(L.left, y + 16, L.right - L.left, 2)
      g.fillStyle = NEON.mint
      g.fillRect(L.left, y + 16, (L.right - L.left) * prog, 2)
      g.globalAlpha = 1
    }

    // the singularity
    if (implode > 0) {
      const r = lerp(2, 9, implode) * env.U * (1 + decay(t, 7.75 * B, 1.5, 10))
      glow(g, env.cx, env.cy, 140 * env.U * implode, NEON.cyan, 0.7 * implode)
      dot(g, env.cx, env.cy, r, NEON.white)
      if (lb > 7.2) ring(g, env.cx, env.cy, (1 - seg(lb, 7.2, 7.95)) * 180 * env.U, 1.5, col(NEON.white, 0.5 * seg(lb, 7.2, 7.5)))
    }
  },

  hud(g, t, env) {
    slate(g, env, t / B, '01', 'Programming', NEON.blue)
  },
}
