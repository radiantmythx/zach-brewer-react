import { frameDims, makeLayout, type Frame, type Layout } from './layout'
import { blend, makePts, N, type Pts } from './line'
import { clamp, mixRgb, rgba, seg, smoothstep, WHITE, type RGB } from './math'
import { mixStyle, MONO, type LineStyle, type Scene, type SceneEnv } from './scene'
import { codeScene } from './scenes/code'
import { designScene } from './scenes/design'
import { gameScene } from './scenes/game'
import { musicScene } from './scenes/music'
import { CHAPTER, CHAPTERS, LOOP, wrap } from './timeline'

const SCENES: Scene[] = [codeScene, designScene, gameScene, musicScene]
/** line hand-off half-window at each chapter boundary */
const HANDOFF = 0.25
/** overlays of neighbouring chapters keep drawing this close to a boundary */
const OVERLAP = 0.6

export interface FilmCallbacks {
  onFrame?: (t: number, chapter: number, progress: number) => void
}

/*
 * The film renderer. Time is the only input: now() comes from the wall clock,
 * or from the Web Audio clock while the score is playing so picture and sound
 * can never drift. Rendering pauses when the hero is offscreen; time doesn't.
 */
export class FilmEngine {
  private canvas: HTMLCanvasElement
  private g: CanvasRenderingContext2D
  private trail: HTMLCanvasElement
  private tg: CanvasRenderingContext2D
  private W = 0
  private dpr = 1
  private ox = 0
  private oy = 0
  private f!: Frame
  private L!: Layout
  private env!: SceneEnv
  private A = makePts()
  private B = makePts()
  private C = makePts()

  private clock: (() => number) | null = null
  private wallBase = performance.now()
  private filmBase = 0
  private pausedAt: number | null = null
  private raf = 0
  private running = false
  private lastWall = 0
  private fps = 60
  private trailAcc = 0
  private mouse = { tx: 0, ty: 0, x: 0, y: 0 }
  private cb: FilmCallbacks
  debug = false

  constructor(canvas: HTMLCanvasElement, cb: FilmCallbacks = {}) {
    this.canvas = canvas
    this.cb = cb
    const g = canvas.getContext('2d', { alpha: true })
    if (!g) throw new Error('2D canvas unavailable')
    this.g = g
    this.trail = document.createElement('canvas')
    const tg = this.trail.getContext('2d')
    if (!tg) throw new Error('2D canvas unavailable')
    this.tg = tg
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
    this.tg.setTransform(1, 0, 0, 1, 0, 0)
    this.tg.clearRect(0, 0, this.trail.width, this.trail.height)
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
    this.render(this.now(), dt)
  }

  private safe: { top: number; bottom: number } | null = null

  /** Keep the choreographed frame between `top` and `bottom` (CSS px within the canvas). */
  setSafeArea(top: number, bottom: number) {
    if (this.safe && Math.abs(this.safe.top - top) < 1 && Math.abs(this.safe.bottom - bottom) < 1) return
    this.safe = { top, bottom }
    this.resize()
  }

  pointer(nx: number, ny: number) {
    this.mouse.tx = clamp(nx, -0.5, 0.5)
    this.mouse.ty = clamp(ny, -0.5, 0.5)
  }

  /* ---- layout ---- */

  resize() {
    const W = this.canvas.clientWidth || 1
    const H = this.canvas.clientHeight || 1
    this.W = W
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(W * this.dpr)
    this.canvas.height = Math.round(H * this.dpr)
    const ts = Math.min(1, this.dpr * 0.5)
    this.trail.width = Math.max(1, Math.round(W * ts))
    this.trail.height = Math.max(1, Math.round(H * ts))

    // The film plays in the region between the nav and the hero's type block
    // (measured by the page via setSafeArea), with percentage fallbacks.
    const tall = W / H < 1
    const fx = W * 0.04
    const fw = W * 0.92
    let fy = H * (tall ? 0.11 : 0.09)
    let fh = H * (tall ? 0.5 : 0.56)
    if (this.safe) {
      fy = Math.max(this.safe.top, H * 0.06)
      fh = Math.max(140, Math.min(H * 0.6, this.safe.bottom - fy))
    }
    const portrait = fw / fh < 1.15
    const fd = frameDims(portrait)
    const scale = Math.min(fw / fd.w, fh / fd.h)
    this.ox = fx + (fw - fd.w * scale) / 2
    this.oy = fy + (fh - fd.h * scale) / 2
    this.f = {
      w: fd.w,
      h: fd.h,
      portrait,
      scale,
      px: 1 / scale,
      visL: -this.ox / scale,
      visR: (W - this.ox) / scale,
      visT: -this.oy / scale,
      visB: (H - this.oy) / scale,
    }
    this.L = makeLayout(this.f)
    this.env = { f: this.f, L: this.L, px: this.f.px, cw: this.L.code.font * 0.6, time: 0, debug: false }
    if (!this.running) this.render(this.now(), 1 / 60)
  }

  /* ---- render ---- */

  private camera(g: CanvasRenderingContext2D, depth: number, res: number) {
    const s = this.f.scale * res
    const mx = this.mouse.x * 10 * depth
    const my = this.mouse.y * 7 * depth
    g.setTransform(s, 0, 0, s, (this.ox + mx) * res, (this.oy + my) * res)
  }

  private colorAt(T: number): RGB {
    const t = wrap(T)
    const k = Math.floor(t / CHAPTER) % 4
    const tau = t - k * CHAPTER
    if (tau < 0.6) return mixRgb(CHAPTERS[(k + 3) % 4].rgb, CHAPTERS[k].rgb, seg(tau + CHAPTER, 7, 8.6))
    return mixRgb(CHAPTERS[k].rgb, CHAPTERS[(k + 1) % 4].rgb, seg(tau, 7, 8.6))
  }

  render(T: number, dt: number) {
    const { g, f, env } = this
    const Tm = wrap(T)
    const k = Math.min(3, Math.floor(Tm / CHAPTER))
    const tau = Tm - k * CHAPTER
    const prevK = (k + 3) % 4
    const nextK = (k + 1) % 4

    env.time = T
    env.debug = this.debug
    g.font = `${this.L.code.font}px ${MONO}`
    env.cw = g.measureText('0').width

    const ease = 1 - Math.exp(-dt * 2.5)
    this.mouse.x += (this.mouse.tx - this.mouse.x) * ease
    this.mouse.y += (this.mouse.ty - this.mouse.y) * ease

    // --- the line, with hand-offs at chapter boundaries ---
    let st: LineStyle = SCENES[k].line(tau, env, this.A)
    let pts: Pts = this.A
    if (tau > CHAPTER - HANDOFF) {
      const s2 = SCENES[nextK].line(tau - CHAPTER, env, this.B)
      const w = smoothstep((tau - (CHAPTER - HANDOFF)) / (2 * HANDOFF))
      blend(this.A, this.B, w, this.C, 0)
      st = mixStyle(st, s2, w)
      pts = this.C
    } else if (tau < HANDOFF) {
      const s0 = SCENES[prevK].line(tau + CHAPTER, env, this.B)
      const w = smoothstep((tau + HANDOFF) / (2 * HANDOFF))
      blend(this.B, this.A, w, this.C, 0)
      st = mixStyle(s0, st, w)
      pts = this.C
    }

    const tail = this.colorAt(T - 0.35)
    const head = this.colorAt(T + 0.45)

    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // --- background layers (deeper parallax) ---
    this.camera(g, 1.8, this.dpr)
    this.eachActive(k, tau, (s, t) => s.back?.(g, t, env))

    // --- long-exposure trail, at half resolution ---
    // Fades are batched to ~30 Hz: at high refresh rates a per-frame fade is so
    // small that 8-bit rounding never reaches zero and leaves ghost residue.
    const tg = this.tg
    const tres = this.trail.width / this.W
    this.trailAcc += dt
    if (this.trailAcc >= 1 / 30) {
      tg.setTransform(1, 0, 0, 1, 0, 0)
      tg.globalCompositeOperation = 'destination-out'
      tg.fillStyle = `rgba(0,0,0,${(1 - Math.exp(-this.trailAcc / 0.085)).toFixed(3)})`
      tg.fillRect(0, 0, this.trail.width, this.trail.height)
      this.trailAcc = 0
    }
    tg.globalCompositeOperation = 'lighter'
    this.camera(tg, 1, tres)
    const path = this.path(pts)
    this.strokePass(tg, path, pts, st, tail, head, 6, 0.22 * Math.min(1, dt * 60), 0.1)

    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'lighter'
    g.drawImage(this.trail, 0, 0, this.canvas.width, this.canvas.height)

    // --- the line itself: halo → glow → body → hot core ---
    this.camera(g, 1, this.dpr)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    this.strokePass(g, path, pts, st, tail, head, 26, 0.05, 0)
    this.strokePass(g, path, pts, st, tail, head, 9, 0.13, 0.1)
    this.strokePass(g, path, pts, st, tail, head, 3, 0.9, 0.35)
    this.strokePass(g, path, pts, st, tail, head, 1.2, 0.85, 0.8)
    if (st.head > 0.01) {
      const hx = pts[2 * (N - 1)]
      const hy = pts[2 * (N - 1) + 1]
      const r = 40 * f.px
      const gr = g.createRadialGradient(hx, hy, 0, hx, hy, r)
      gr.addColorStop(0, rgba(mixRgb(head, WHITE, 0.6), 0.9 * st.head * st.alpha))
      gr.addColorStop(0.2, rgba(head, 0.3 * st.head * st.alpha))
      gr.addColorStop(1, rgba(head, 0))
      g.fillStyle = gr
      g.fillRect(hx - r, hy - r, r * 2, r * 2)
    }
    g.globalCompositeOperation = 'source-over'

    // --- overlays ---
    this.eachActive(k, tau, (s, t) => s.front?.(g, t, env))

    if (this.debug) this.drawDebug(pts, k, tau, T)
    this.cb.onFrame?.(Tm, k, tau / CHAPTER)
  }

  private eachActive(k: number, tau: number, fn: (s: Scene, t: number) => void) {
    if (tau < OVERLAP) fn(SCENES[(k + 3) % 4], tau + CHAPTER)
    fn(SCENES[k], tau)
    if (tau > CHAPTER - OVERLAP) fn(SCENES[(k + 1) % 4], tau - CHAPTER)
  }

  private path(pts: Pts) {
    const p = new Path2D()
    p.moveTo(pts[0], pts[1])
    for (let i = 1; i < N; i++) p.lineTo(pts[2 * i], pts[2 * i + 1])
    return p
  }

  private strokePass(
    g: CanvasRenderingContext2D,
    path: Path2D,
    pts: Pts,
    st: LineStyle,
    tail: RGB,
    head: RGB,
    widthPx: number,
    alpha: number,
    lighten: number,
  ) {
    const a = alpha * st.alpha
    if (a <= 0.002) return
    let x0 = pts[0]
    const y0 = pts[1]
    let x1 = pts[2 * (N - 1)]
    let y1 = pts[2 * (N - 1) + 1]
    if (Math.hypot(x1 - x0, y1 - y0) < 60) {
      // near-closed shapes: sweep the gradient across the bounding width
      let lo = Infinity
      let hi = -Infinity
      for (let i = 0; i < N; i += 8) {
        lo = Math.min(lo, pts[2 * i])
        hi = Math.max(hi, pts[2 * i])
      }
      x0 = lo
      x1 = hi + 1
      y1 = y0
    }
    const c0 = mixRgb(tail, WHITE, lighten)
    const c1 = mixRgb(head, WHITE, lighten)
    const gr = g.createLinearGradient(x0, y0, x1, y1)
    const fe = clamp(st.fade, 0, 0.45)
    if (fe > 0.002) {
      gr.addColorStop(0, rgba(c0, 0))
      gr.addColorStop(fe, rgba(mixRgb(c0, c1, fe), a))
      gr.addColorStop(1 - fe, rgba(mixRgb(c0, c1, 1 - fe), a))
      gr.addColorStop(1, rgba(c1, 0))
    } else {
      gr.addColorStop(0, rgba(c0, a))
      gr.addColorStop(1, rgba(c1, a))
    }
    g.strokeStyle = gr
    g.lineWidth = widthPx * this.f.px
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.stroke(path)
  }

  /** Director's commentary: the rig behind the film. */
  private drawDebug(pts: Pts, k: number, tau: number, T: number) {
    const { g, f, env } = this
    this.camera(g, 1, this.dpr)
    g.font = `${10 * f.px}px ${MONO}`
    g.textBaseline = 'middle'
    for (let i = 0; i < N; i += 26) {
      const x = pts[2 * i]
      const y = pts[2 * i + 1]
      g.strokeStyle = 'rgba(255,79,216,0.9)'
      g.lineWidth = f.px
      g.beginPath()
      g.arc(x, y, 3 * f.px, 0, Math.PI * 2)
      g.stroke()
      g.fillStyle = 'rgba(255,79,216,0.8)'
      g.fillText((i / (N - 1)).toFixed(2), x + 6 * f.px, y - 8 * f.px)
    }
    SCENES[k].debug?.(g, tau, env)

    g.strokeStyle = 'rgba(255,255,255,0.18)'
    g.setLineDash([6 * f.px, 6 * f.px])
    g.strokeRect(0, 0, f.w, f.h)
    g.setLineDash([])

    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    g.font = `11px ${MONO}`
    g.fillStyle = 'rgba(255,79,216,0.95)'
    const lines = [
      `DIRECTOR'S COMMENTARY`,
      `t ${wrap(T).toFixed(2)}s / ${LOOP}s   chapter ${k + 1}/4 ${CHAPTERS[k].id}   τ ${tau.toFixed(2)}`,
      `${Math.round(this.fps)} fps   ${N} points   frame ${f.w}×${f.h} @ ${f.scale.toFixed(3)}   ${this.clock ? 'audio clock' : 'wall clock'}`,
    ]
    lines.forEach((l, i) => g.fillText(l, 20, 90 + i * 16))
  }
}
