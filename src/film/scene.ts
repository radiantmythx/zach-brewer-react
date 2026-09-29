import type { SectionId } from './timeline'

/*
 * Scene contract. Everything is a pure function of local time t (seconds
 * since the section's first beat), so the reel can be scrubbed, paused and
 * locked to the audio clock. Scenes are also called for a moment after their
 * window (the outgoing half of a wipe) and should keep drawing sensibly.
 */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Env {
  /** canvas size, CSS px */
  W: number
  H: number
  /** the figure area — where each section draws */
  fig: Box
  /** centre of the figure */
  cx: number
  cy: number
  /** CSS px per composition unit (figures are 1200×600, or 700×800 in portrait) */
  U: number
  portrait: boolean
  /** reel safe area (between nav and controls) */
  top: number
  bottom: number
  /** left margin shared with the page */
  pad: number
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
  zoom: number
}

export interface Scene {
  id: SectionId
  /** the figure: drawn under the camera */
  draw(g: CanvasRenderingContext2D, t: number, env: Env): void
  /** caption / annotations: no camera */
  hud?(g: CanvasRenderingContext2D, t: number, env: Env): void
  fx?(t: number, env: Env, fx: FX): void
  debug?(g: CanvasRenderingContext2D, t: number, env: Env): void
}
