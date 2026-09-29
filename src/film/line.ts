import { clamp, lerp, smootherstep } from './math'

/*
 * "The line" is N points. Scenes describe shapes as parametric paths, and
 * resample() spaces the points evenly by arc length so any two shapes can be
 * morphed point-for-point without bunching.
 */
export const N = 520
export type Pts = Float32Array
export const makePts = () => new Float32Array(N * 2)

export interface Vec {
  x: number
  y: number
}
export type PathFn = (s: number, out: Vec) => void

const M = 900
const sx = new Float32Array(M + 1)
const sy = new Float32Array(M + 1)
const cum = new Float32Array(M + 1)
const v: Vec = { x: 0, y: 0 }

/**
 * Sample `fn` densely, then write N points evenly spaced by arc length over
 * the [from, to] fraction of the path's total length. Returns the length.
 */
export function resample(fn: PathFn, out: Pts, from = 0, to = 1): number {
  let total = 0
  for (let i = 0; i <= M; i++) {
    fn(i / M, v)
    sx[i] = v.x
    sy[i] = v.y
    if (i > 0) total += Math.hypot(sx[i] - sx[i - 1], sy[i] - sy[i - 1])
    cum[i] = total
  }
  const a = from * total
  const b = to * total
  let j = 0
  for (let k = 0; k < N; k++) {
    const target = a + ((b - a) * k) / (N - 1)
    while (j < M - 1 && cum[j + 1] < target) j++
    const len = cum[j + 1] - cum[j]
    const f = len > 1e-6 ? clamp((target - cum[j]) / len) : 0
    out[2 * k] = sx[j] + (sx[j + 1] - sx[j]) * f
    out[2 * k + 1] = sy[j] + (sy[j + 1] - sy[j]) * f
  }
  return total
}

/** Approximate length of a path (coarser than resample; for planning). */
export function pathLength(fn: PathFn, samples = 160) {
  let total = 0
  fn(0, v)
  let px = v.x
  let py = v.y
  for (let i = 1; i <= samples; i++) {
    fn(i / samples, v)
    total += Math.hypot(v.x - px, v.y - py)
    px = v.x
    py = v.y
  }
  return total
}

/**
 * Point-for-point morph with a travelling wipe: at t the front of the wipe is
 * at u = t, softened over `soft` of the line. reverse wipes from the far end.
 */
export function blend(a: Pts, b: Pts, t: number, out: Pts, soft = 0.4, reverse = false) {
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1)
    const uu = reverse ? 1 - u : u
    const w = soft <= 0 ? t : smootherstep(clamp((t * (1 + soft) - uu) / soft))
    out[2 * k] = lerp(a[2 * k], b[2 * k], w)
    out[2 * k + 1] = lerp(a[2 * k + 1], b[2 * k + 1], w)
  }
}

export function copyPts(src: Pts, out: Pts) {
  out.set(src)
}

const heads = new Float32Array(N)
const lens = new Float32Array(N)

/**
 * Straighten a curve in curvature space: every segment's heading is pulled
 * toward `heading` by k, so spirals unroll like a fern instead of sliding.
 * Point 0 travels from its original position to (ax, ay); total length eases
 * toward `targetLen`.
 */
export function uncurl(
  src: Pts,
  k: number,
  heading: number,
  ax: number,
  ay: number,
  targetLen: number,
  out: Pts,
) {
  let total = 0
  let prev = 0
  for (let i = 0; i < N - 1; i++) {
    const dx = src[2 * i + 2] - src[2 * i]
    const dy = src[2 * i + 3] - src[2 * i + 1]
    let h = Math.atan2(dy, dx)
    if (i > 0) {
      while (h - prev > Math.PI) h -= Math.PI * 2
      while (h - prev < -Math.PI) h += Math.PI * 2
    }
    heads[i] = h
    prev = h
    lens[i] = Math.hypot(dx, dy)
    total += lens[i]
  }
  const lenScale = lerp(1, total > 0 ? targetLen / total : 1, k)
  let x = lerp(src[0], ax, k)
  let y = lerp(src[1], ay, k)
  out[0] = x
  out[1] = y
  for (let i = 0; i < N - 1; i++) {
    const h = lerp(heads[i], heading, k)
    const l = lens[i] * lenScale
    x += Math.cos(h) * l
    y += Math.sin(h) * l
    out[2 * i + 2] = x
    out[2 * i + 3] = y
  }
}

export function bounds(p: Pts) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let k = 0; k < N; k++) {
    const x = p[2 * k]
    const y = p[2 * k + 1]
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
