import { col, corner, font, line, MONO, reg } from './kit'
import { clamp, easeInOutCubic, seg } from './math'
import type { Env, FX, Scene } from './scene'
import { codeScene } from './scenes/code'
import { designScene } from './scenes/design'
import { gameScene } from './scenes/game'
import { musicScene } from './scenes/music'
import { openScene } from './scenes/open'
import { resolveScene } from './scenes/resolve'
import { BEAT, INK, REEL_BEATS, REEL_END, SECTIONS, WIPE, type Section } from './timeline'

const SCENES: Record<string, Scene> = {
  open: openScene,
  code: codeScene,
  design: designScene,
  game: gameScene,
  music: musicScene,
  resolve: resolveScene,
}

export interface FilmCallbacks {
  onFrame?: (t: number) => void
}

const tc = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${String(m).padStart(2, '0')}:${r.toFixed(2).padStart(5, '0')}`
}

/*
 * The reel renderer — linework on paper. Time is the only input: now()
 * comes from the wall clock, or from the Web Audio clock while the score
 * plays. Each frame: paper → the active figure (or two, split by a hairline
 * wipe at section changes) → captions → the frame's crop marks and ruler.
 */
export class FilmEngine {
  private canvas: HTMLCanvasElement
  private g: CanvasRenderingContext2D
  private dpr = 1
  private env: Env
  private fx: FX = { zoom: 1 }
  private safe = { top: 80, bottom: 0, idleBottom: 0 }
  private hasSafe = false

  private clock: (() => number) | null = null
  private wallBase = performance.now()
  private filmBase = 0
  private pausedAt: number | null = null
  private raf = 0
  private running = false
  private lastWall = 0
  private frameCount = 0
  private fps = 60
  private mouse = { tx: 0, ty: 0, x: 0, y: 0 }
  private cb: FilmCallbacks
  debug = false

  constructor(canvas: HTMLCanvasElement, cb: FilmCallbacks = {}) {
    this.canvas = canvas
    this.cb = cb
    const g = canvas.getContext('2d', { alpha: false })
    if (!g) throw new Error('2D canvas unavailable')
    this.g = g
    this.env = {
      W: 1,
      H: 1,
      fig: { x: 0, y: 0, w: 1, h: 1 },
      cx: 0,
      cy: 0,
      U: 1,
      portrait: false,
      top: 0,
      bottom: 1,
      pad: 24,
      logo: { x: 0, y: 0, size: 100 },
      time: 0,
      mx: 0,
      my: 0,
      debug: false,
    }
    this.resize()
  }

  /* ---- time ---- */

  now(): number {
    if (this.pausedAt !== null) return this.pausedAt
    if (this.clock) return this.clock()
    return this.filmBase + (performance.now() - this.wallBase) / 1000
  }

  /** Switch time source without a visible jump. Pass null to return to the wall clock. */
  setClock(fn: (() => number) | null) {
    const t = this.now()
    this.clock = fn
    if (!fn) {
      this.filmBase = t
      this.wallBase = performance.now()
    }
  }

  get paused() {
    return this.pausedAt !== null
  }

  pause() {
    if (this.pausedAt === null) this.pausedAt = this.now()
  }

  play() {
    if (this.pausedAt === null) return
    this.filmBase = this.pausedAt
    this.wallBase = performance.now()
    this.pausedAt = null
  }

  seek(t: number) {
    this.filmBase = t
    this.wallBase = performance.now()
    if (this.pausedAt !== null) this.pausedAt = t
    if (!this.running) this.render(this.now(), 1 / 60)
  }

  /* ---- loop ---- */

  start() {
    if (this.running) return
    this.running = true
    this.lastWall = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  destroy() {
    this.stop()
  }

  /** Redraw once when the loop isn't running (paused, reduced motion). */
  refresh() {
    if (!this.running || this.paused) this.render(this.now(), 1 / 60)
  }

  private tick = (wall: number) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.tick)
    const dt = this.lastWall ? clamp((wall - this.lastWall) / 1000, 1 / 240, 0.1) : 1 / 60
    this.lastWall = wall
    this.fps += (1 / dt - this.fps) * 0.05
    const t = this.now()
    // The idle state is gentle — 30 fps is plenty and saves battery.
    this.frameCount++
    if (t > REEL_END + 1 && !this.debug && this.frameCount % 2 === 1) return
    this.render(t, dt)
  }

  pointer(nx: number, ny: number) {
    this.mouse.tx = clamp(nx, -0.5, 0.5)
    this.mouse.ty = clamp(ny, -0.5, 0.5)
  }

  /* ---- layout ---- */

  /** The reel plays between `top` and `bottom`; the resolved logo rests above `idleBottom`. */
  setSafeArea(top: number, bottom: number, idleBottom: number) {
    const s = this.safe
    if (this.hasSafe && Math.abs(s.top - top) < 1 && Math.abs(s.bottom - bottom) < 1 && Math.abs(s.idleBottom - idleBottom) < 1) return
    this.safe = { top, bottom, idleBottom }
    this.hasSafe = true
    this.resize()
  }

  resize() {
    const W = this.canvas.clientWidth || 1
    const H = this.canvas.clientHeight || 1
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(W * this.dpr)
    this.canvas.height = Math.round(H * this.dpr)

    const top = this.hasSafe ? this.safe.top : H * 0.1
    const bottom = this.hasSafe ? this.safe.bottom : H * 0.86
    const idleBottom = this.hasSafe ? this.safe.idleBottom : H * 0.6
    const pad = clamp(W * 0.04, 20, 56)
    const tall = W / Math.max(1, bottom - top) < 0.9
    const capH = tall ? 150 : 176
    const fig = { x: pad, y: top + 40, w: W - pad * 2, h: Math.max(160, bottom - capH - (top + 40)) }
    const portrait = fig.w / fig.h < 0.95
    const U = portrait ? Math.min(fig.w / 700, fig.h / 800) : Math.min(fig.w / 1200, fig.h / 600)
    const ih = Math.max(80, idleBottom - top)
    Object.assign(this.env, {
      W,
      H,
      fig,
      cx: fig.x + fig.w / 2,
      cy: fig.y + fig.h / 2,
      U,
      portrait,
      top,
      bottom,
      pad,
      logo: { x: W / 2, y: top + ih / 2, size: clamp(Math.min(ih * 0.72, W * 0.42), 80, 300) },
    })
    if (!this.running) this.render(this.now(), 1 / 60)
  }

  /* ---- render ---- */

  private sectionAt(b: number): Section {
    for (const s of SECTIONS) if (b < s.to) return s
    return SECTIONS[SECTIONS.length - 1]
  }

  private drawScene(s: Section, T: number, clip?: [number, number]) {
    const { g, env } = this
    g.save()
    if (clip) {
      g.beginPath()
      g.rect(clip[0], 0, clip[1] - clip[0], env.H)
      g.clip()
    }
    SCENES[s.id].draw(g, T - s.from * BEAT, env)
    g.restore()
  }

  render(T: number, dt: number) {
    const { g, env, fx } = this
    T = Math.max(0, T)
    const b = T / BEAT
    env.time = T
    env.debug = this.debug
    const ease = 1 - Math.exp(-dt * 3)
    this.mouse.x += (this.mouse.tx - this.mouse.x) * ease
    this.mouse.y += (this.mouse.ty - this.mouse.y) * ease
    env.mx = this.mouse.x
    env.my = this.mouse.y

    const cur = this.sectionAt(b)
    const idx = SECTIONS.indexOf(cur)
    const prev = idx > 0 ? SECTIONS[idx - 1] : null
    const wipe = prev && b < cur.from + WIPE ? easeInOutCubic((b - cur.from) / WIPE) : 1

    fx.zoom = 1
    SCENES[cur.id].fx?.(T - cur.from * BEAT, env, fx)

    const d = this.dpr
    g.setTransform(d, 0, 0, d, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.fillStyle = INK.paper
    g.fillRect(0, 0, env.W, env.H)

    // --- the figure(s), under a gentle camera push ---
    g.translate(env.cx, env.cy)
    g.scale(fx.zoom, fx.zoom)
    g.translate(-env.cx, -env.cy)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    const x = env.W * wipe
    if (wipe < 1 && prev) {
      this.drawScene(prev, T, [x, env.W])
      this.drawScene(cur, T, [0, x])
    } else this.drawScene(cur, T)

    // --- captions, steady ---
    g.setTransform(d, 0, 0, d, 0, 0)
    SCENES[cur.id].hud?.(g, T - cur.from * BEAT, env)

    // --- the wipe's hairline ---
    if (wipe < 1) {
      g.strokeStyle = INK.ink
      g.lineWidth = 1
      line(g, x, env.top, x, env.bottom)
      g.font = font(9.5, 500, MONO)
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      g.fillStyle = INK.ink
      g.fillText(`→ 0${idx}`, x + 6, env.top + 44)
    }

    this.drawFrame(b)
    if (this.debug) this.drawDebug(T)
    this.cb.onFrame?.(T)
  }

  /** Crop marks, a beat ruler and a timecode: the reel's technical frame. */
  private drawFrame(b: number) {
    const { g, env } = this
    const a = clamp(b / 0.6) * (1 - seg(b, 43.5, 45.5))
    if (a <= 0.003) return
    const { fig } = env
    g.globalAlpha = a
    g.strokeStyle = col(INK.ink, 0.55)
    g.lineWidth = 1
    const L = 14
    const p = seg(b, 0, 1)
    corner(g, fig.x, fig.y, 1, 1, L, p)
    corner(g, fig.x + fig.w, fig.y, -1, 1, L, p)
    corner(g, fig.x, fig.y + fig.h, 1, -1, L, p)
    corner(g, fig.x + fig.w, fig.y + fig.h, -1, -1, L, p)
    g.strokeStyle = col(INK.ink, 0.35)
    reg(g, fig.x + fig.w / 2, fig.y - 14, 5, p)

    // ruler
    const x0 = env.pad
    const x1 = env.W - env.pad
    const y = env.top + 10
    g.strokeStyle = col(INK.ink, 0.18)
    line(g, x0, y, x1, y, seg(b, 0, 0.8))
    g.beginPath()
    for (let k = 0; k <= REEL_BEATS; k++) {
      const x = x0 + ((x1 - x0) * k) / REEL_BEATS
      if (x > x0 + (x1 - x0) * seg(b, 0, 0.8)) break
      const h = k % 8 === 0 ? 7 : k % 4 === 0 ? 5 : 2.5
      g.moveTo(x, y)
      g.lineTo(x, y + h)
    }
    g.stroke()
    const px = x0 + (x1 - x0) * clamp(b / REEL_BEATS)
    g.strokeStyle = INK.ink
    line(g, px, y - 4, px, y + 10)
    g.font = font(9.5, 500, MONO)
    g.textBaseline = 'middle'
    g.fillStyle = INK.muted
    g.textAlign = 'left'
    g.fillText('SHOWREEL — 2026', x0, y + 20)
    g.textAlign = 'right'
    g.fillStyle = INK.ink2
    g.fillText(`${tc(Math.min(b, REEL_BEATS) * BEAT)} / ${tc(REEL_END)}`, x1, y + 20)
    g.globalAlpha = 1
  }

  /** Director's commentary: the rig behind the reel. */
  private drawDebug(T: number) {
    const { g, env } = this
    const b = T / BEAT
    const s = this.sectionAt(b)
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    SCENES[s.id].debug?.(g, T - s.from * BEAT, env)
    g.strokeStyle = 'rgba(214,51,132,0.6)'
    g.setLineDash([5, 5])
    g.strokeRect(env.fig.x, env.fig.y, env.fig.w, env.fig.h)
    g.setLineDash([])
    g.font = font(11, 500, MONO)
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillStyle = 'rgba(214,51,132,0.95)'
    const lines = [
      `DIRECTOR'S COMMENTARY`,
      `t ${T.toFixed(2)}s   bar ${Math.floor(b / 4) + 1}.${(Math.floor(b) % 4) + 1}   beat ${b.toFixed(2)}   ${b < REEL_BEATS ? s.id : 'idle'}`,
      `${Math.round(this.fps)} fps   ${this.clock ? 'audio clock' : 'wall clock'}   U ${env.U.toFixed(3)}   ${env.portrait ? 'portrait' : 'landscape'}`,
    ]
    lines.forEach((l, i) => g.fillText(l, env.fig.x + 8, env.fig.y + 16 + i * 16))
  }
}
