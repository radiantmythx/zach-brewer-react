import { Score } from './score'

/*
 * Tiny global store for "is sound on?". The hero film registers itself so
 * the score can take over its clock; the contact section's string just asks
 * for a pluck. The Score (and its AudioContext) is created synchronously
 * inside the first click — iOS only unlocks audio within the gesture itself.
 */

export interface FilmHandle {
  now(): number
  setClock(fn: (() => number) | null): void
  readonly paused: boolean
}

let on = false
let score: Score | null = null
let film: FilmHandle | null = null
const listeners = new Set<(on: boolean) => void>()

export const isSoundOn = () => on

export function subscribeSound(fn: (on: boolean) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function ensureScore() {
  if (score) return score
  score = new Score()
  void score.ctx.resume()
  document.addEventListener('visibilitychange', () => {
    if (!score?.playing) return
    if (document.hidden) score.suspend()
    else score.resume()
  })
  return score
}

/** Reconcile the score with the film: play only while sound is on and the film is running. */
export function syncSound() {
  const s = score
  if (!s) return
  const shouldPlay = on && !!film && !film.paused
  if (shouldPlay && !s.playing && film) {
    const f = film
    void s.start(() => f.now()).then(() => {
      if (on && film === f && !f.paused && s.playing) f.setClock(s.filmTime)
    })
  } else if (!shouldPlay && s.playing) {
    film?.setClock(null)
    s.stop()
  }
}

/** Must be called from a user gesture the first time it turns sound on. */
export function setSoundOn(next: boolean) {
  if (next === on) return
  on = next
  if (on) ensureScore()
  listeners.forEach((fn) => fn(on))
  syncSound()
}

export function attachFilm(handle: FilmHandle | null) {
  if (!handle && film) {
    film.setClock(null)
    score?.stop()
  }
  film = handle
  syncSound()
}

export function seekSound(t: number) {
  if (score?.playing) score.seek(t)
}

export function pluck(x01: number, velocity = 1) {
  if (on && score) score.pluck(x01, velocity)
}
