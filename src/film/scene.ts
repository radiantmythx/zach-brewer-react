import type { Frame, Layout } from './layout'
import type { Pts } from './line'
import { clamp, lerp, rgba, type RGB } from './math'

export interface LineStyle {
  /** overall line opacity */
  alpha: number
  /** glow at the pen head (last point) */
  head: number
  /** fraction of each end that fades to transparent (for edge-to-edge lines) */
  fade: number
}

export interface SceneEnv {
  f: Frame
  L: Layout
  /** frame units per CSS px */
  px: number
  /** monospace advance width at the code font size, in frame units */
  cw: number
  /** unwrapped global film time */
  time: number
  debug: boolean
}

/*
 * A chapter of the film. Every method is a pure function of chapter-local
 * time t (0–8s), and must tolerate t slightly outside that range: the engine
 * calls neighbours near boundaries so hand-offs can overlap.
 */
export interface Scene {
  line(t: number, env: SceneEnv, out: Pts): LineStyle
  back?(g: CanvasRenderingContext2D, t: number, env: SceneEnv): void
  front?(g: CanvasRenderingContext2D, t: number, env: SceneEnv): void
  debug?(g: CanvasRenderingContext2D, t: number, env: SceneEnv): void
}

export const style = (alpha = 1, head = 0, fade = 0): LineStyle => ({ alpha, head, fade })

export const mixStyle = (a: LineStyle, b: LineStyle, t: number): LineStyle => ({
  alpha: lerp(a.alpha, b.alpha, t),
  head: lerp(a.head, b.head, t),
  fade: lerp(a.fade, b.fade, t),
})

export const MONO = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
export const SANS = 'Geist, system-ui, -apple-system, "Segoe UI", sans-serif'

/** A font sized in on-screen CSS px, regardless of the frame's scale. */
export const uiFont = (env: SceneEnv, sizePx: number, weight = 400, family = MONO) =>
  `${weight} ${(sizePx * env.px).toFixed(2)}px ${family}`

export function setSpacing(g: CanvasRenderingContext2D, value: string) {
  const c = g as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in c) c.letterSpacing = value
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}

/** Soft luminous dot — used for playheads, sparks and the pen head. */
export function glowDot(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number) {
  if (a <= 0.002) return
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, rgba(c, 0.9 * a))
  gr.addColorStop(0.25, rgba(c, 0.35 * a))
  gr.addColorStop(1, rgba(c, 0))
  g.fillStyle = gr
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}

/** Draw a straight segment partially, from a toward b, by progress p. */
export function partialLine(g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, p: number) {
  const q = clamp(p)
  if (q <= 0) return
  g.moveTo(ax, ay)
  g.lineTo(lerp(ax, bx, q), lerp(ay, by, q))
}
