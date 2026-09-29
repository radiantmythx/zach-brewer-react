import type { FilmEngine } from './engine'

/* The hidden "director's commentary": shows the rig behind the film. */

let target: FilmEngine | null = null

export function setDirectorTarget(engine: FilmEngine | null) {
  target = engine
}

/** Returns the new state, or null if no film is mounted. */
export function toggleCommentary(): boolean | null {
  if (!target) return null
  target.debug = !target.debug
  target.refresh()
  return target.debug
}
