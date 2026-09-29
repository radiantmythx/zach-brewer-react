import { TAU } from '../math'

/*
 * A struck string: the modal sum of an ideal string hit by a hammer at xp.
 * Shared by the game (the stomp) and music (the string it becomes) so the
 * hand-off between chapters is the same physical event.
 */
export function strike(xi: number, dt: number, xp: number, amp: number) {
  if (dt <= 0) return 0
  let y = 0
  for (let n = 1; n <= 7; n++) {
    const b = Math.sin(n * Math.PI * xp) / n
    y += b * Math.sin(n * Math.PI * xi) * Math.sin(TAU * 1.25 * n * dt) * Math.exp(-(0.75 + 0.42 * n) * dt)
  }
  return y * amp
}
