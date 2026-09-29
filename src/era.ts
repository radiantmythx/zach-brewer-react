/*
 * The era engine.
 *
 * One scroll-driven value (0 → 1) represents the site's "migration progress":
 * 0 = 2012, green-phosphor mainframe. 1 = present day, sakura in full bloom.
 * On scroll we interpolate the global palette and publish the raw progress so
 * the petal canvas and HUD can read it every frame without React re-renders.
 */

export type EraListener = (progress: number) => void

const listeners = new Set<EraListener>()

export const era = {
  progress: 0,
}

export function subscribeEra(fn: EraListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* ---- petal storm event bus (the `sakura` command) ---- */

const stormListeners = new Set<(intensity: number) => void>()

export function onPetalStorm(fn: (intensity: number) => void): () => void {
  stormListeners.add(fn)
  return () => stormListeners.delete(fn)
}

export function triggerPetalStorm(intensity = 1) {
  stormListeners.forEach((fn) => fn(intensity))
}

/* ---- point emission: spawn a few petals at a specific spot ---- */

const emitListeners = new Set<(x: number, y: number, count: number) => void>()

export function onPetalEmit(fn: (x: number, y: number, count: number) => void): () => void {
  emitListeners.add(fn)
  return () => emitListeners.delete(fn)
}

export function emitPetals(x: number, y: number, count: number) {
  emitListeners.forEach((fn) => fn(x, y, count))
}

/* ---- palette interpolation ---- */

type RGB = [number, number, number]

// Era color stops: phosphor green → CRT amber → sakura pink
const ACCENT_STOPS: { at: number; c: RGB }[] = [
  { at: 0.0, c: [70, 247, 143] },
  { at: 0.42, c: [255, 180, 84] },
  { at: 1.0, c: [255, 143, 184] },
]

// Background stops: green-black → amber-black → ink with a violet-pink cast
const BG_STOPS: { at: number; c: RGB }[] = [
  { at: 0.0, c: [2, 6, 4] },
  { at: 0.42, c: [10, 7, 4] },
  { at: 1.0, c: [16, 10, 18] },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function sample(stops: { at: number; c: RGB }[], p: number): RGB {
  if (p <= stops[0].at) return stops[0].c
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i].at) {
      const t = (p - stops[i - 1].at) / (stops[i].at - stops[i - 1].at)
      const a = stops[i - 1].c
      const b = stops[i].c
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
    }
  }
  return stops[stops.length - 1].c
}

function rgb(c: RGB, alpha?: number) {
  const [r, g, b] = c.map(Math.round)
  return alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`
}

export const ERA_NAMES = [
  { until: 0.22, label: 'IBM S/370' },
  { until: 0.48, label: 'ON-PREM .NET' },
  { until: 0.74, label: 'WEB PLATFORM' },
  { until: Infinity, label: 'CLOUD · FULL BLOOM' },
]

export function eraName(p: number): string {
  return ERA_NAMES.find((e) => p <= e.until)!.label
}

/*
 * Installs the scroll listener. Returns a cleanup function.
 * Sets CSS variables on <html> so plain CSS can follow the migration.
 */
export function startEraEngine(): () => void {
  const root = document.documentElement

  const update = () => {
    const doc = document.documentElement
    const max = Math.max(1, doc.scrollHeight - window.innerHeight)
    const p = Math.min(1, Math.max(0, window.scrollY / max))
    era.progress = p

    const accent = sample(ACCENT_STOPS, p)
    const bg = sample(BG_STOPS, p)

    root.style.setProperty('--era-accent', rgb(accent))
    root.style.setProperty('--era-accent-soft', rgb(accent, 0.14))
    root.style.setProperty('--era-bg', rgb(bg))
    root.style.setProperty('--era-glow-a', rgb(accent, 0.07))
    root.style.setProperty('--era-glow-b', rgb(accent, 0.035))

    listeners.forEach((fn) => fn(p))
  }

  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })

  return () => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  }
}
