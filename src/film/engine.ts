import { font, MONO } from './kit'
import { clamp, hash, hexToRgb, noise1, rgba } from './math'
import type { Env, FX, Scene } from './scene'
import { codeScene } from './scenes/code'
import { designScene } from './scenes/design'
import { gameScene } from './scenes/game'
import { musicScene } from './scenes/music'
import { openScene } from './scenes/open'
import { resolveScene } from './scenes/resolve'
import { BEAT, REEL_END, SECTIONS } from './timeline'

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

/*
 * The reel renderer. Time is the only input: now() comes from the wall
 * clock, or from the Web Audio clock while the score plays, so picture and
 * sound can't drift. Each frame: gather camera/post FX from the active
 * scenes → draw them under the camera → HUD → glitch → bloom → flash.
 */
export class FilmEngine {
  private canvas: HTMLCanvasElement
  private g: CanvasRenderingContext2D
  private chain: HTMLCanvasElement[] = []
  private chainG: CanvasRenderingContext2D[] = []
  private dpr = 1
  private env: Env
  private fx: FX = { flash: 0, flashColor: '#FFFFFF', shake: 0, zoom: 1, rot: 0, glitch: 0, bloom: 1 }
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
    const g = canvas.getContext('2d', { alpha: true })
    if (!g) throw new Error('2D canvas unavailable')
    this.g = g
    for (let i = 0; i < 4; i++) {
      const c = document.createElement('canvas')
      const cg = c.getContext('2d')
      if (!cg) throw new Error('2D canvas unavailable')
      this.chain.push(c)
      this.chainG.push(cg)
    }
    this.env = { W: 1, H: 1, cx: 0, cy: 0, U: 1, portrait: false, top: 0, bottom: 1, logo: { x: 0, y: 0, size: 100 }, time: 0, mx: 0, my: 0, debug: false }
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
    this.chain.forEach((c, i) => {
      const d = 2 ** (i + 1)
      c.width = Math.max(1, Math.ceil(this.canvas.width / d))
      c.height = Math.max(1, Math.ceil(this.canvas.height / d))
    })

    const top = this.hasSafe ? this.safe.top : H * 0.09
    const bottom = this.hasSafe ? this.safe.bottom : H * 0.9
    const idleBottom = this.hasSafe ? this.safe.idleBottom : H * 0.6
    const h = Math.max(120, bottom - top)
    const portrait = W / h < 0.9
    const U = portrait ? Math.min(W / 900, h / 1400) : Math.min(W / 1600, h / 900)
    const ih = Math.max(80, idleBottom - top)
    const size = clamp(Math.min(ih * 0.8, W * 0.5), 84, 360)
    Object.assign(this.env, {
      W,
      H,
      cx: W / 2,
      cy: top + h / 2,
      U,
      portrait,
      top,
      bottom,
      logo: { x: W / 2, y: top + ih / 2, size },
    })
    if (!this.running) this.render(this.now(), 1 / 60)
  }

  /* ---- render ---- */

  private active(T: number) {
    const b = T / BEAT
    return SECTIONS.filter((s) => b >= s.from - 0.25 && (b < s.to + 0.25 || s.id === 'resolve'))
  }

  render(T: number, dt: number) {
    const { g, env, fx } = this
    T = Math.max(0, T)
    env.time = T
    env.debug = this.debug
    const ease = 1 - Math.exp(-dt * 3)
    this.mouse.x += (this.mouse.tx - this.mouse.x) * ease
    this.mouse.y += (this.mouse.ty - this.mouse.y) * ease
    env.mx = this.mouse.x
    env.my = this.mouse.y

    const secs = this.active(T)
    Object.assign(fx, { flash: 0, flashColor: '#FFFFFF', shake: 0, zoom: 1, rot: 0, glitch: 0, bloom: 1 })
    for (const s of secs) SCENES[s.id].fx?.(T - s.from * BEAT, env, fx)

    const d = this.dpr
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // --- world, under the camera ---
    const sh = Math.min(40, fx.shake)
    const sx = sh * noise1(T * 31)
    const sy = sh * noise1(T * 37 + 50)
    g.setTransform(d, 0, 0, d, 0, 0)
    g.translate(env.cx + sx, env.cy + sy)
    if (fx.rot) g.rotate(fx.rot)
    g.scale(fx.zoom, fx.zoom)
    g.translate(-env.cx, -env.cy)
    for (const s of secs) SCENES[s.id].draw(g, T - s.from * BEAT, env)

    // --- HUD, steady ---
    g.setTransform(d, 0, 0, d, 0, 0)
    for (const s of secs) SCENES[s.id].hud?.(g, T - s.from * BEAT, env)

    // --- glitch slices ---
    if (fx.glitch > 0.02) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      const cw = this.canvas.width
      const ch = this.canvas.height
      const f = Math.floor(T * 30)
      for (let k = 0; k < 7; k++) {
        const y = hash(k * 3.1 + f) * ch
        const h = (0.015 + hash(k * 7.7 + f) * 0.07) * ch
        const off = (hash(k * 5.3 + f) - 0.5) * 160 * d * clamp(fx.glitch)
        g.drawImage(this.canvas, 0, y, cw, h, off, y, cw, h)
      }
    }

    // --- bloom: progressive downsample, add back the soft levels ---
    const b = clamp(fx.bloom, 0, 3)
    if (b > 0.01) {
      let src: HTMLCanvasElement = this.canvas
      for (let i = 0; i < this.chain.length; i++) {
        const c = this.chain[i]
        const cg = this.chainG[i]
        cg.globalCompositeOperation = 'copy'
        cg.drawImage(src, 0, 0, c.width, c.height)
        src = c
      }
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.globalCompositeOperation = 'lighter'
      const cw = this.canvas.width
      const ch = this.canvas.height
      g.globalAlpha = clamp(0.35 * b)
      g.drawImage(this.chain[1], 0, 0, cw, ch)
      g.globalAlpha = clamp(0.45 * b)
      g.drawImage(this.chain[2], 0, 0, cw, ch)
      g.globalAlpha = clamp(0.55 * b)
      g.drawImage(this.chain[3], 0, 0, cw, ch)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
    }

    // --- flash frame ---
    if (fx.flash > 0.003) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.fillStyle = rgba(hexToRgb(fx.flashColor), clamp(fx.flash))
      g.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    if (this.debug) this.drawDebug(T, secs.map((s) => s.id))
    this.cb.onFrame?.(T)
  }

  /** Director's commentary: the rig behind the reel. */
  private drawDebug(T: number, ids: string[]) {
    const { g, env } = this
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    for (const s of SECTIONS) if (ids.includes(s.id)) SCENES[s.id].debug?.(g, T - s.from * BEAT, env)
    g.strokeStyle = 'rgba(255,79,216,0.5)'
    g.setLineDash([6, 6])
    g.strokeRect(8, env.top, env.W - 16, env.bottom - env.top)
    g.setLineDash([])
    const lb = T / BEAT
    g.font = font(11, 500, MONO)
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillStyle = 'rgba(255,79,216,0.95)'
    const sec = SECTIONS.find((s) => lb >= s.from && lb < s.to)?.id ?? 'idle'
    const lines = [
      `DIRECTOR'S COMMENTARY`,
      `t ${T.toFixed(2)}s   bar ${Math.floor(lb / 4) + 1}.${(Math.floor(lb) % 4) + 1}   beat ${lb.toFixed(2)}   ${sec}`,
      `${Math.round(this.fps)} fps   ${this.clock ? 'audio clock' : 'wall clock'}   U ${env.U.toFixed(3)}   ${env.portrait ? 'portrait' : 'landscape'}`,
    ]
    lines.forEach((l, i) => g.fillText(l, 20, env.top + 60 + i * 16))
    // beat grid ticker
    const w = env.W - 40
    const y = env.bottom - 8
    g.fillStyle = 'rgba(255,79,216,0.3)'
    g.fillRect(20, y, w, 1)
    for (let b = 0; b <= 52; b++) g.fillRect(20 + (b / 52) * w, y - (b % 4 ? 3 : 7), 1, b % 4 ? 3 : 7)
    g.fillStyle = 'rgba(255,79,216,1)'
    g.fillRect(20 + clamp(lb / 52) * w - 1, y - 12, 2, 14)
  }
}
