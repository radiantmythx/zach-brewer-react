import type { SectionId } from './timeline'

/*
 * Scene contract. Everything is a pure function of local time t (seconds
 * since the section's first beat), so the reel can be scrubbed, paused and
 * locked to the audio clock. Scenes may be called slightly before and after
 * their window and must draw nothing there unless they mean to.
 */

export interface Env {
  /** canvas size, CSS px */
  W: number
  H: number
  /** centre of the reel area */
  cx: number
  cy: number
  /** CSS px per composition unit (compositions are 1600 units wide, or 900 in portrait) */
  U: number
  portrait: boolean
  /** reel safe area (between nav and chapter bar) */
  top: number
  bottom: number
  /** where the logo rests once the hero copy is showing */
  logo: { x: number; y: number; size: number }
  /** global film time, seconds */
  time: number
  /** pointer, -0.5..0.5, smoothed */
  mx: number
  my: number
  debug: boolean
}

export interface FX {
  flash: number
  flashColor: string
  shake: number
  zoom: number
  rot: number
  glitch: number
  bloom: number
}

export interface Scene {
  id: SectionId
  /** world layer: drawn under the camera (shake / zoom) */
  draw(g: CanvasRenderingContext2D, t: number, env: Env): void
  /** screen layer: HUD, slates — no camera shake */
  hud?(g: CanvasRenderingContext2D, t: number, env: Env): void
  /** add camera / post effects for this moment */
  fx?(t: number, env: Env, fx: FX): void
  debug?(g: CanvasRenderingContext2D, t: number, env: Env): void
}
