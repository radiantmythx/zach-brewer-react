/*
 * Small, allocation-free math kit for the film. Everything in the film is a
 * pure function of time, so these helpers are the whole animation vocabulary.
 */

export const TAU = Math.PI * 2
export const PHI = (1 + Math.sqrt(5)) / 2

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a))

export const linear = (t: number) => t
export const smoothstep = (t: number) => t * t * (3 - 2 * t)
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
export const easeInCubic = (t: number) => t * t * t
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const easeOutBack = (t: number, s = 1.70158) =>
  1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)

/** Eased progress of `t` through the interval [a, b]. */
export const seg = (t: number, a: number, b: number, ease: (x: number) => number = smootherstep) =>
  ease(invLerp(a, b, t))

/** 0 → 1 → 0 envelope: fades in over [a, b], out over [c, d]. */
export const win = (t: number, a: number, b: number, c: number, d: number) =>
  Math.min(seg(t, a, b, smoothstep), 1 - seg(t, c, d, smoothstep))

/** Underdamped spring step response: 0 → 1 with a natural overshoot. */
export function springOut(t: number, freq = 2.4, damp = 0.42) {
  if (t <= 0) return 0
  const w = TAU * freq
  const wd = w * Math.sqrt(1 - damp * damp)
  const e = Math.exp(-damp * w * t)
  return 1 - e * (Math.cos(wd * t) + ((damp * w) / wd) * Math.sin(wd * t))
}

/** Decaying wobble used for squash & stretch: starts at 1, rings out to 0. */
export const ring = (dt: number, freq = 4, decay = 9) =>
  dt < 0 ? 0 : Math.exp(-decay * dt) * Math.cos(TAU * freq * dt)

/** One component of a cubic bezier. */
export const bez = (a: number, b: number, c: number, d: number, s: number) => {
  const m = 1 - s
  return m * m * m * a + 3 * m * m * s * b + 3 * m * s * s * c + s * s * s * d
}

/** Evaluate a CSS-style cubic-bezier easing y for a given x (bisection). */
export function cubicBezierEase(x1: number, y1: number, x2: number, y2: number, x: number) {
  let lo = 0
  let hi = 1
  let s = x
  for (let i = 0; i < 24; i++) {
    s = (lo + hi) / 2
    if (bez(0, x1, x2, 1, s) < x) lo = s
    else hi = s
  }
  return bez(0, y1, y2, 1, s)
}

/** Deterministic hash → [0, 1). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Cheap smooth 1-D value noise in [-1, 1]. */
export function noise1(x: number) {
  const i = Math.floor(x)
  const f = x - i
  const a = hash(i) * 2 - 1
  const b = hash(i + 1) * 2 - 1
  return lerp(a, b, smootherstep(f))
}

/* ---- color ---- */

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

export const rgba = (c: RGB, a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`

export const WHITE: RGB = [255, 255, 255]
