/*
 * Colour science for the Playground's colour studies: accurate enough to
 * draw a spectrum, a blackbody or a thin film honestly, small enough to
 * ship. All rgb triples are 0–1; "linear" means linear-light sRGB, plain
 * "rgb" means gamma-encoded sRGB (what CSS wants).
 */

export type Rgb = [number, number, number]

/* ------------------------------------------------------------ the eye */

// CIE 1931 2° standard observer colour-matching functions, 380–780 nm at
// 10 nm (x̄, ȳ, z̄), linearly interpolated between samples.
const CMF = [
  0.001368, 0.000039, 0.00645, 0.004243, 0.00012, 0.02005, 0.01431, 0.000396, 0.06785, 0.04351, 0.00121, 0.2074,
  0.13438, 0.004, 0.6456, 0.2839, 0.0116, 1.3856, 0.34828, 0.023, 1.74706, 0.3362, 0.038, 1.77211,
  0.2908, 0.06, 1.6692, 0.19536, 0.09098, 1.28764, 0.09564, 0.13902, 0.81295, 0.03201, 0.20802, 0.46518,
  0.0049, 0.323, 0.272, 0.0093, 0.503, 0.1582, 0.06327, 0.71, 0.07825, 0.1655, 0.862, 0.04216,
  0.2904, 0.954, 0.0203, 0.43345, 0.99495, 0.00875, 0.5945, 0.995, 0.0039, 0.7621, 0.952, 0.0021,
  0.9163, 0.87, 0.00165, 1.0263, 0.757, 0.0011, 1.0622, 0.631, 0.0008, 1.0026, 0.503, 0.00034,
  0.85445, 0.381, 0.00019, 0.6424, 0.265, 0.00005, 0.4479, 0.175, 0.00002, 0.2835, 0.107, 0,
  0.1649, 0.061, 0, 0.0874, 0.032, 0, 0.04677, 0.017, 0, 0.0227, 0.00821, 0,
  0.011359, 0.004102, 0, 0.00579, 0.002091, 0, 0.002899, 0.001047, 0, 0.00144, 0.00052, 0,
  0.00069, 0.000249, 0, 0.000332, 0.00012, 0, 0.000166, 0.00006, 0, 0.000083, 0.00003, 0, 0.000042, 0.000015, 0,
]

/** CIE 1931 x̄, ȳ, z̄ at wavelength λ (nm); zero outside 380–780. ȳ peaks at 1 near 555 nm. */
export function cmf(nm: number): Rgb {
  if (!(nm >= 380 && nm <= 780)) return [0, 0, 0]
  const f = (nm - 380) / 10
  const i = Math.min(39, Math.floor(f))
  const t = f - i
  const a = i * 3
  const b = a + 3
  return [CMF[a] + (CMF[b] - CMF[a]) * t, CMF[a + 1] + (CMF[b + 1] - CMF[a + 1]) * t, CMF[a + 2] + (CMF[b + 2] - CMF[a + 2]) * t]
}

/** XYZ (D65) → linear sRGB. Can return values outside 0–1 (out of gamut). */
export function xyzToLinear([X, Y, Z]: Rgb): Rgb {
  return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z]
}

export function linearToXyz([r, g2, b]: Rgb): Rgb {
  return [0.4124 * r + 0.3576 * g2 + 0.1805 * b, 0.2126 * r + 0.7152 * g2 + 0.0722 * b, 0.0193 * r + 0.1192 * g2 + 0.9505 * b]
}

const enc = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
const dec = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

/** linear-light → gamma-encoded sRGB, clamped to 0–1. */
export const toSrgb = (l: Rgb): Rgb => [enc(Math.max(0, Math.min(1, l[0]))), enc(Math.max(0, Math.min(1, l[1]))), enc(Math.max(0, Math.min(1, l[2])))]
export const toLinear = (s: Rgb): Rgb => [dec(s[0]), dec(s[1]), dec(s[2])]

/**
 * Bring an out-of-gamut linear colour into gamut: add just enough white to
 * lift negative channels (desaturating toward white, as a real display must),
 * then scale so the largest channel is ≤ 1 (or exactly 1 if `normalize`).
 */
export function fitGamut(l: Rgb, normalize = false): Rgb {
  const lo = Math.min(l[0], l[1], l[2])
  const r: Rgb = lo < 0 ? [l[0] - lo, l[1] - lo, l[2] - lo] : [l[0], l[1], l[2]]
  const hi = Math.max(r[0], r[1], r[2])
  if (hi > 1 || (normalize && hi > 0)) return [r[0] / hi, r[1] / hi, r[2] / hi]
  return r
}

/**
 * The colour of monochromatic light (gamma sRGB), at full brightness: the
 * out-of-gamut parts are clipped (as a spectrum photograph would be) rather
 * than whitened, so the hues stay saturated. The ends fade toward black.
 */
export function spectral(nm: number, brightness = 1): Rgb {
  const l = xyzToLinear(cmf(nm))
  const c: Rgb = [Math.max(0, l[0]), Math.max(0, l[1]), Math.max(0, l[2])]
  const hi = Math.max(c[0], c[1], c[2]) || 1
  const lin: Rgb = [c[0] / hi, c[1] / hi, c[2] / hi]
  // the eye's falling sensitivity at the ends: fade with ȳ-ish envelope
  const env = Math.min(1, Math.max(0, (nm - 380) / 40)) * Math.min(1, Math.max(0, (720 - nm) / 50))
  const k = brightness * (0.25 + 0.75 * env)
  return toSrgb([lin[0] * k, lin[1] * k, lin[2] * k])
}

/** Integrate a spectral power distribution (nm → power) to XYZ, 380–780 nm. */
export function spectrumToXyz(spd: (nm: number) => number, step = 5): Rgb {
  let X = 0
  let Y = 0
  let Z = 0
  for (let nm = 380; nm <= 780; nm += step) {
    const p = spd(nm)
    const [x, y, z] = cmf(nm)
    X += p * x
    Y += p * y
    Z += p * z
  }
  return [X * step, Y * step, Z * step]
}

/* --------------------------------------------------------- blackbody */

const H = 6.62607015e-34
const CL = 2.99792458e8
const KB = 1.380649e-23

/** Planck's law: spectral radiance at λ (nm) and temperature T (K), W·sr⁻¹·m⁻³. */
export function planck(nm: number, T: number) {
  const l = nm * 1e-9
  return (2 * H * CL * CL) / (Math.pow(l, 5) * (Math.exp((H * CL) / (l * KB * T)) - 1))
}

const bbCache = new Map<number, Rgb>()
/** The chromaticity of a blackbody at T kelvin, as gamma sRGB with its brightest channel at 1. */
export function blackbody(T: number): Rgb {
  const key = Math.round(T / 10) * 10
  let c = bbCache.get(key)
  if (!c) {
    const xyz = spectrumToXyz((nm) => planck(nm, key), 10)
    c = toSrgb(fitGamut(xyzToLinear(xyz), true))
    if (bbCache.size > 2000) bbCache.clear()
    bbCache.set(key, c)
  }
  return c
}

/** Wien's displacement law: peak wavelength (nm) at T kelvin. */
export const wienPeak = (T: number) => 2.897771955e6 / T

/* ------------------------------------------------------------- OKLab */

/** linear sRGB → OKLab [L, a, b] (Björn Ottosson, 2020). */
export function linearToOklab([r, g2, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g2 + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g2 + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g2 + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}

/** OKLab → linear sRGB (may be out of gamut). */
export function oklabToLinear([L, a, b]: Rgb): Rgb {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3)
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}

/** OKLCH (L 0–1, C ~0–0.37, h radians) → gamma sRGB, gamut-fitted. */
export function oklch(L: number, C: number, h: number): Rgb {
  return toSrgb(fitGamut(oklabToLinear([L, C * Math.cos(h), C * Math.sin(h)])))
}

export const inGamut = (l: Rgb, eps = 1e-4) => l.every((c) => c >= -eps && c <= 1 + eps)

/**
 * OKLCH → gamma sRGB, keeping lightness and hue and reducing chroma until the
 * colour fits the sRGB gamut (binary search). Prefer this to `oklch()` when
 * the colour's lightness matters (oklch() lifts out-of-gamut colours toward white).
 */
export function oklchFit(L: number, C: number, h: number): Rgb {
  const at = (c: number) => oklabToLinear([L, c * Math.cos(h), c * Math.sin(h)])
  let lin = at(C)
  if (!inGamut(lin)) {
    let lo = 0
    let hi = C
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(at(mid))) lo = mid
      else hi = mid
    }
    lin = at(lo)
  }
  return toSrgb(lin)
}

/* ------------------------------------------------------------- utils */

/** '#2B6A93' → gamma sRGB triple. */
export function hex(h: string): Rgb {
  const s = h.replace('#', '')
  const n = parseInt(s.length === 3 ? s.replace(/./g, (c) => c + c) : s, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** gamma sRGB triple → CSS colour string. */
export function css(c: Rgb, a = 1) {
  const r = Math.round(Math.max(0, Math.min(1, c[0])) * 255)
  const g2 = Math.round(Math.max(0, Math.min(1, c[1])) * 255)
  const b = Math.round(Math.max(0, Math.min(1, c[2])) * 255)
  return a >= 1 ? `rgb(${r},${g2},${b})` : `rgba(${r},${g2},${b},${a})`
}

/** Interpolate two gamma-sRGB colours in OKLab (perceptually even). */
export function mixOklab(a: Rgb, b: Rgb, t: number): Rgb {
  const A = linearToOklab(toLinear(a))
  const B = linearToOklab(toLinear(b))
  return toSrgb(fitGamut(oklabToLinear([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t])))
}

/** Relative luminance (WCAG) of a gamma sRGB colour. */
export const luminance = (c: Rgb) => {
  const l = toLinear(c)
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
