/*
 * The contract between the Playground host (Stage.tsx) and every piece.
 *
 * A piece is a module under src/playground/{motion,games,showcase}/ whose
 * default export is a `CreatePiece`. The host owns the canvas, its size and
 * pixel ratio, the animation loop, pausing, input routing and sound; the piece
 * owns everything it draws. Pieces never call requestAnimationFrame, never add
 * window listeners, and never touch the DOM outside their canvas.
 */

import type { Sfx } from './sfx'

export type Mode = 'preview' | 'full'

export interface PointerInfo {
  type: 'down' | 'move' | 'up' | 'leave'
  /** CSS pixels, relative to the canvas's top-left */
  x: number
  y: number
  id: number
  pointerType: string
  /** true while a button/finger is down */
  pressed: boolean
}

export interface PieceStore {
  get(key: string): string | null
  set(key: string, value: string): void
}

export interface PieceEnv {
  canvas: HTMLCanvasElement
  /** Already scaled by dpr before every frame: draw in CSS pixels. */
  ctx: CanvasRenderingContext2D
  /** CSS pixels. Kept current; resize() is called whenever they change. */
  width: number
  height: number
  dpr: number
  /**
   * 'preview' — a small card on the Playground grid: ~30 fps, no sound, no
   * keyboard. Games run their attract mode (a bot plays). Keep it light.
   * 'full' — the viewer: full frame rate, keyboard + pointer, sound if on.
   */
  mode: Mode
  reducedMotion: boolean
  /** Sound effects. Always safe to call; silent unless the viewer's sound is on. */
  sfx: Sfx
  /** localStorage, namespaced per piece, failure-safe (e.g. high scores). */
  store: PieceStore
  /** URL query params in the solo/test route (e.g. ?solo=games/x&state=over), else empty. */
  params: URLSearchParams
  /**
   * Set the canvas's CSS cursor ('grab', 'grabbing', 'crosshair', 'pointer',
   * 'default'…) to show what the pointer will do. Cheap to call every frame.
   */
  setCursor(cursor: string): void
}

export interface PieceInstance {
  /**
   * Draw one frame. t = seconds since the piece started (frozen while paused),
   * dt = seconds since the previous frame (clamped to <= 0.05). dt can be 0:
   * a repaint without advancing time (after a resize, or the first frame).
   * The context transform is reset to the dpr scale before each call, but
   * nothing is cleared for you: paint the whole frame (or deliberately not).
   */
  frame(t: number, dt: number): void
  /** Canvas changed size (CSS px). Also called once before the first frame. */
  resize?(width: number, height: number): void
  pointer?(p: PointerInfo): void
  /**
   * Keyboard, full mode only. `code` is KeyboardEvent.code ('ArrowLeft',
   * 'Space', 'Enter', 'KeyZ'…). Return true if handled (default is prevented).
   * Escape is reserved by the viewer and never arrives here.
   */
  key?(code: string, down: boolean, e: KeyboardEvent): boolean
  destroy?(): void
}

export type CreatePiece = (env: PieceEnv) => PieceInstance
