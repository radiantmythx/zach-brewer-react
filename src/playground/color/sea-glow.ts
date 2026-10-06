/*
 * C.07 — SEA GLOW
 *
 * A moonless shore where the breaking waves light up blue. The light is
 * made by dinoflagellates — single cells such as Noctiluca scintillans and
 * Lingulodinium polyedra — that flash when the water around them is
 * sheared: a luciferin–luciferase reaction in tiny organelles (scintillons),
 * triggered by an action potential across the cell's vacuole membrane;
 * about a tenth of a second of blue light near 475 nm.
 *
 * Thousands of particles stand for patches of cells on the water. Each has
 * an excitation threshold, a store of light that tires with use and
 * recovers, and a short refractory time; a flash rises at once and decays
 * with τ ≈ 0.1 s. The stimulus is the turbulence of the surf — the steepening
 * face, the plunging lip, the bore that runs to the beach, the swash on the
 * sand and the foam line it leaves — and your hand in the water. The light
 * is added (canvas 'lighter'), as light does; its colour is the CIE 1931
 * colour of the emission spectrum itself.
 *
 *   darkness and swell → first sparks at the break → a set rolls in and the
 *   whole shoreline lights → calm, stars, a meteor → again
 *
 * Long-crested waves approach in perspective (a pinhole 3 m above the
 * sand, so a wave's crest stands up off the water plane by F·η/z), slow in
 * the shallows, break where the water is about 1.3 times as deep as they are
 * high, peel along the crest, and run up the beach. The cells ride the
 * surface. Drag through the water to stir it into light; tap to splash.
 */

import { TAU, clamp, damp, ease, ground, lerp, makeNoise, mod, rgba, rng, setFont, smoothstep, text } from '../kit'
import { cmf, fitGamut, spectral, toSrgb, xyzToLinear, type Rgb } from '../color'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. C.07'
const NIGHT_INK = '#EEF4F1'

/* ------------------------------------------------------------ the light */

/** emission: a Gaussian band at 475 nm, FWHM 50 nm (dinoflagellate luciferase) */
const PEAK = 475
const FWHM = 50
const emission = (nm: number) => Math.exp(-0.5 * ((nm - PEAK) / (FWHM / 2.3548)) ** 2)
/** the colour of that spectrum: CIE 1931 → linear sRGB, brought into gamut */
const GLOW: Rgb = (() => {
  let X = 0
  let Y = 0
  let Z = 0
  for (let nm = 380; nm <= 700; nm += 2) {
    const p = emission(nm)
    const c = cmf(nm)
    X += p * c[0]
    Y += p * c[1]
    Z += p * c[2]
  }
  return toSrgb(fitGamut(xyzToLinear([X, Y, Z]), true))
})()
const G8 = GLOW.map((v) => Math.round(v * 255))
const glowCss = (a: number) => `rgba(${G8[0]},${G8[1]},${G8[2]},${a})`

/** pure-water absorption a(λ), m⁻¹, approximately after Pope & Fry (1997) */
const WATER: [number, number][] = [
  [400, 0.0066],
  [420, 0.0045],
  [440, 0.0064],
  [460, 0.0092],
  [480, 0.0145],
  [500, 0.0257],
  [520, 0.0477],
  [540, 0.0558],
  [560, 0.0708],
  [580, 0.108],
  [600, 0.222],
  [620, 0.275],
  [640, 0.312],
  [660, 0.41],
  [680, 0.465],
  [700, 0.624],
]
const waterA = (nm: number) => {
  for (let i = 0; i < WATER.length - 1; i++) {
    if (nm <= WATER[i + 1][0]) {
      const u = (nm - WATER[i][0]) / (WATER[i + 1][0] - WATER[i][0])
      return Math.exp(lerp(Math.log(WATER[i][1]), Math.log(WATER[i + 1][1]), clamp(u)))
    }
  }
  return WATER[WATER.length - 1][1]
}

/* ------------------------------------------------------------ the surf */

const LOOP = 64
const PERIOD = 6.4
/** wave heights through the loop: a quiet start, a set, a calm */
const HS = [0.35, 0.45, 0.55, 0.85, 1.35, 1.6, 1.35, 0.8, 0.5, 0.4]
const FIRST = 3
/** metres: the shoreline, the top of the wet sand, the camera height */
const Z_SHORE = 14
const Z_WET = 8.6
const CAM_H = 3
/** the break peels along the crest (m/s); the bore runs in (m/s) */
const PEEL = 6
const BORE = 3.2
/** beach slope 1 : 9; breaker index γ = H / d ≈ 0.78 */
const SLOPE = 9

interface Wave {
  tb: number
  H: number
  x0: number
  zb: number
  R: number
  seed: number
  tUp: number
  tDown: number
}
const waveCache = new Map<number, Wave>()
function waveAt(i: number): Wave {
  let wv = waveCache.get(i)
  if (wv) return wv
  const k = mod(i, HS.length)
  const r = rng(9001 + i * 7919)
  const H = HS[k] * (0.92 + r() * 0.16)
  wv = {
    tb: FIRST + i * PERIOD + (r() - 0.5) * 0.8,
    H,
    x0: (r() - 0.5) * 12,
    // it breaks where the depth is H / 0.78
    zb: Z_SHORE + (H / 0.78) * SLOPE + 1,
    R: Math.min(Z_SHORE - Z_WET - 0.6, 1.8 + 2.3 * H),
    seed: r() * 100,
    tUp: 1.5 + 0.9 * H,
    tDown: 2.2 + 1.1 * H,
  }
  if (waveCache.size > 200) waveCache.clear()
  waveCache.set(i, wv)
  return wv
}
/** crest distance Δ seconds before it breaks: slowing as it shoals */
const crestZ = (wv: Wave, d: number) => wv.zb + 4.4 * d + 0.12 * d * d
/** crest height above still water: growing as it shoals */
const crestH = (wv: Wave, d: number) => wv.H * (0.5 + 0.32 * Math.exp(-d / 1.8))

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 2.4, t1: 10.4, lines: [{ s: 'Touch the water' }, { s: 'and ', em: 'it answers.' }] },
  { t0: 13.2, t1: 21.8, lines: [{ s: 'Each spark' }, { s: 'is ', em: 'a single cell.' }] },
  { t0: 29.6, t1: 38.4, lines: [{ s: 'Light,' }, { s: '', em: 'made by life.' }] },
  { t0: 44.6, t1: 53.2, lines: [{ s: 'Blue travels' }, { s: '', em: 'farthest through the sea.' }] },
]
const METEOR = 50.6
const SHIMMER = [1568, 1760, 2093, 2349, 2637, 3136, 3520]

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx
  const noise = makeNoise(707)
  const rand = rng(475)
  let lastT = 0

  /* ---------------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let portrait = false
  let short = false
  let tiny = false
  let pad = 20
  let yH = 0
  let yS = 0
  let yWet = 0
  let FH = 1
  let F = 1
  let cx = 0
  let capSize = 28
  let capX = 0
  let capY = 0
  /** a point on the water plane (or η metres above it) at distance z → screen y */
  const toY = (z: number, eta = 0) => yH + (F * (CAM_H - eta)) / z
  const toZ = (y: number) => FH / Math.max(0.5, y - yH)
  const toX = (x: number, z: number) => cx + (F * x) / z

  /* -------------------------------------------------------------- particles */
  const CAP = preview ? 3200 : 28000
  let N = 0
  const px = new Float32Array(CAP)
  const py = new Float32Array(CAP)
  const wx = new Float32Array(CAP)
  const wz = new Float32Array(CAP)
  const ox = new Float32Array(CAP)
  const oy = new Float32Array(CAP)
  const vx = new Float32Array(CAP)
  const vy = new Float32Array(CAP)
  const eta = new Float32Array(CAP)
  const em = new Float32Array(CAP)
  const charge = new Float32Array(CAP)
  const thr = new Float32Array(CAP)
  const refr = new Float32Array(CAP)
  const size = new Float32Array(CAP)
  const foamAff = new Float32Array(CAP)
  /** fixed per cell: where it sits (0–1 across, 0–1 from horizon to wet sand), its size and threshold */
  const nu = new Float32Array(CAP)
  const nv = new Float32Array(CAP)
  const sz = new Float32Array(CAP)
  for (let i = 0; i < CAP; i++) {
    nu[i] = rand()
    nv[i] = Math.pow(rand(), 1.1)
    sz[i] = 0.75 + rand() * 0.5
    charge[i] = 0.75 + rand() * 0.25
    thr[i] = 0.1 + Math.pow(rand(), 1.4) * 0.85
  }

  // stars, sand and the headland, rebuilt on resize
  let stars: { x: number; y: number; b: number; p: number }[] = []
  let milky: Path2D | null = null
  let sand: Path2D | null = null
  let head: Path2D | null = null
  let headRim: Path2D | null = null
  // the soft glow: a quarter-resolution buffer, faded each frame, added on top
  let GB = 4
  /** small frames pack the surf into fewer pixels: lighter glow, finer points */
  let fine = 1
  let gbuf: HTMLCanvasElement | null = null
  let gctx: CanvasRenderingContext2D | null = null

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    short = h < 380
    tiny = h < 260 || w < 340
    pad = Math.round(clamp(Math.min(w, h) * 0.045, 12, 32))
    fine = clamp(Math.min(w, h) / 720, 0.42, 1)
    GB = Math.min(w, h) < 460 ? 2 : Math.min(w, h) < 700 ? 3 : 4
    yH = Math.round(h * (portrait ? 0.3 : short ? 0.34 : 0.36))
    yS = Math.round(h * (portrait ? 0.68 : short ? 0.7 : 0.7))
    FH = (yS - yH) * Z_SHORE
    F = FH / CAM_H
    cx = w / 2
    yWet = toY(Z_WET)
    capSize = portrait ? clamp(w * 0.072, 18, 34) : clamp(Math.min(w * 0.034, (yH - pad * 2) * 0.26), short ? 13 : 18, 44)
    capX = pad
    capY = pad + (short ? 14 : 30)
    // the cells: an even scatter over the water and the wet sand, in screen space;
    // a resize keeps every cell's state and moves it with the frame
    const area = w * (yWet - yH)
    N = Math.min(CAP, Math.round(area / (preview ? 34 : 28)))
    for (let i = 0; i < N; i++) {
      const y = yH + 1.5 + nv[i] * (yWet - yH - 1.5)
      const x = nu[i] * w
      px[i] = x
      py[i] = y
      const z = toZ(y)
      wz[i] = z
      wx[i] = ((x - cx) * z) / F
      size[i] = clamp(0.5 + 24 / z, 0.6, 2.3) * sz[i] * (0.55 + 0.45 * fine)
      // streaks of foam that linger behind each bore
      foamAff[i] = clamp(noise.fbm2(wx[i] * 0.32, z * 0.85, 3) * 1.6 + 0.15)
    }
    const r = rng(31)
    stars = []
    const ns = Math.round((w * yH) / (preview ? 700 : 480))
    for (let i = 0; i < ns; i++) stars.push({ x: r() * w, y: Math.pow(r(), 0.8) * (yH - 4), b: Math.pow(r(), 3), p: r() * TAU })
    if (typeof Path2D !== 'undefined') {
      // the Milky Way: faint dust along a band from the horizon up across the sky
      milky = new Path2D()
      const nm = Math.round((w * yH) / (preview ? 200 : 90))
      for (let i = 0; i < nm; i++) {
        const u = r()
        const bx = lerp(w * 0.12, w * 0.95, u)
        const by = lerp(yH * 1.02, -yH * 0.1, u)
        const spread = yH * (0.07 + 0.08 * Math.sin(u * 7.1) ** 2)
        const g = (r() + r() + r() - 1.5) * 1.2
        const x = bx + g * spread * 0.55
        const y = by + g * spread
        if (y > yH - 3 || y < 0) continue
        const s = 0.4 + r() * 0.6
        milky.rect(x, y, s, s)
      }
      sand = new Path2D()
      const nd = Math.round((w * (h - yS)) / (preview ? 90 : 55))
      for (let i = 0; i < nd; i++) {
        const y = yS + 2 + Math.pow(r(), 0.7) * (h - yS)
        const x = r() * w
        const s = 0.35 + ((y - yS) / (h - yS)) * 0.7
        sand.rect(x, y, s, s)
      }
      // a dark headland on the horizon
      head = new Path2D()
      headRim = new Path2D()
      const hx0 = w * (portrait ? 0.62 : 0.74)
      const peak = Math.min(h * 0.045, (yH - pad) * 0.25)
      head.moveTo(hx0, yH + 0.5)
      headRim.moveTo(hx0, yH + 0.5)
      for (let x = hx0; x <= w + 4; x += 4) {
        const u = (x - hx0) / (w - hx0)
        const y = yH - peak * Math.pow(Math.sin(Math.min(1, u * 1.25) * Math.PI * 0.5), 1.6) * (0.85 + 0.15 * noise.n2(u * 6, 1.5)) - peak * 0.18 * Math.max(0, u - 0.6)
        head.lineTo(x, y)
        headRim.lineTo(x, y)
      }
      head.lineTo(w + 4, yH + 0.5)
      head.closePath()
    }
    if (typeof document !== 'undefined') {
      if (!gbuf) gbuf = document.createElement('canvas')
      gbuf.width = Math.max(1, Math.ceil(w / GB))
      gbuf.height = Math.max(1, Math.ceil(h / GB))
      gctx = gbuf.getContext('2d')
      if (gctx) {
        gctx.fillStyle = '#000'
        gctx.fillRect(0, 0, gbuf.width, gbuf.height)
      }
    }
  }

  /* ---------------------------------------------------------------- surf */
  const NBIN = 128
  interface Active {
    wv: Wave
    /** unbroken crest: distance, height above still water, how close to breaking (0–1) */
    zC: Float32Array
    hC: Float32Array
    pre: Float32Array
    /** broken: front distance, stimulus, front height, plunging lip, swash phase */
    zF: Float32Array
    I: Float32Array
    hF: Float32Array
    lip: Float32Array
    swash: Uint8Array
    /** the foam line at the top of the run-up */
    zM: Float32Array
    foam: Float32Array
  }
  const active: Active[] = []
  const pool: Active[] = []
  let XW = 20
  const newActive = (wv: Wave): Active => ({
    wv,
    zC: new Float32Array(NBIN),
    hC: new Float32Array(NBIN),
    pre: new Float32Array(NBIN),
    zF: new Float32Array(NBIN),
    I: new Float32Array(NBIN),
    hF: new Float32Array(NBIN),
    lip: new Float32Array(NBIN),
    swash: new Uint8Array(NBIN),
    zM: new Float32Array(NBIN),
    foam: new Float32Array(NBIN),
  })

  function surf(T: number, loopN: number) {
    XW = ((w / 2) * 80) / F
    while (active.length) pool.push(active.pop() as Active)
    const base = loopN * HS.length
    const now = T + loopN * LOOP
    for (let i = base - 3; i < base + HS.length + 3; i++) {
      const wv = waveAt(i)
      const tl = now - wv.tb
      if (tl < -5 || tl > 15) continue
      const a = pool.pop() ?? newActive(wv)
      a.wv = wv
      for (let j = 0; j < NBIN; j++) {
        const x = ((j + 0.5) / NBIN - 0.5) * 2 * XW
        const tbx = wv.tb + Math.abs(x - wv.x0) / PEEL
        const tau = now - tbx
        a.zC[j] = -1
        a.zF[j] = -1
        a.I[j] = 0
        a.hF[j] = 0
        a.lip[j] = 0
        a.swash[j] = 0
        a.zM[j] = -1
        a.foam[j] = 0
        const lace = noise.n2(x * 0.9, wv.seed) * 0.35
        if (tau < 0) {
          const d = -tau
          if (d < 5) {
            a.zC[j] = crestZ(wv, d) + noise.n2(x * 0.03 + wv.seed, 0.5) * 1.2
            a.hC[j] = crestH(wv, d)
            a.pre[j] = clamp(1 - d / 1.6)
          }
          continue
        }
        const travel = (wv.zb - Z_SHORE) / BORE
        if (tau < travel) {
          // the lip, then the bore, weakening and settling as it runs in
          const k = tau / travel
          a.zF[j] = wv.zb - (wv.zb - Z_SHORE) * (k + 0.08 * Math.sin(k * Math.PI)) - Math.min(tau, 0.5) * 1.5 + lace
          a.I[j] = wv.H * (1.12 - 0.5 * k)
          const plunge = clamp(1 - tau / 0.55)
          a.lip[j] = plunge
          a.hF[j] = crestH(wv, 0) * plunge * 0.95 + wv.H * 0.42 * (1 - 0.75 * k) * (1 - plunge)
        } else {
          const ts = tau - travel
          const R = Math.min(Z_SHORE - Z_WET - 0.3, wv.R * (1 + 0.2 * noise.n2(x * 0.17, wv.seed + 3)))
          if (ts < wv.tUp) {
            const u = ts / wv.tUp
            a.zF[j] = Z_SHORE - R * (2 * u - u * u) + lace * 0.4
            a.I[j] = wv.H * 0.66 * (1 - 0.45 * u)
            a.swash[j] = 1
          } else if (ts < wv.tUp + wv.tDown) {
            const u = (ts - wv.tUp) / wv.tDown
            a.zF[j] = Z_SHORE - R * (1 - u * u) + lace * 0.4
            a.I[j] = wv.H * 0.2 * (1 - u)
            a.swash[j] = 2
          }
          const tf = ts - wv.tUp
          if (tf > 0 && tf < 3.4) {
            a.zM[j] = Z_SHORE - R + lace * 0.3
            a.foam[j] = wv.H * 0.6 * (1 - tf / 3.4) ** 1.5
          }
        }
      }
      active.push(a)
    }
  }

  /* ------------------------------------------------------------- stirring */
  const ptr = { x: -1, y: -1, lx: -1, ly: -1, down: false, touch: false, t0: 0, moved: 0, speed: 0 }
  /** where the hand (or the ghost) has been: a fading hairline of stirred water */
  const trail: { x: number; y: number; t: number }[] = []
  // test hook: ?ghost=0 skips the demonstration
  let touched = env.params.get('ghost') === '0'
  let stirredOnce = false
  interface Splash {
    x: number
    z: number
    t: number
    drops: { a: number; v: number; up: number }[]
  }
  const splashes: Splash[] = []

  function splash(x: number, y: number) {
    const z = toZ(y)
    const drops = []
    const n = 18
    for (let i = 0; i < n; i++) drops.push({ a: rand() * TAU, v: 0.4 + rand() * 1.3, up: 0.25 + rand() * 0.35 })
    splashes.push({ x: ((x - cx) * z) / F, z, t: 0, drops })
    if (splashes.length > 8) splashes.shift()
    sfx.noise(0.5, { filter: 2200, to: 700, q: 0.7, gain: 0.05, room: 0.4, pan: clamp((x / w) * 2 - 1, -0.8, 0.8) })
    for (let q = 0; q < 4; q++) sfx.tone(SHIMMER[(q * 2 + Math.floor(rand() * 3)) % SHIMMER.length], 1.1, { type: 'sine', gain: 0.012, when: 0.04 + q * 0.06, room: 0.6, pan: rand() * 1.4 - 0.7 })
  }

  /* --------------------------------------------------------------- sound */
  let nextShimmer = 0
  function surfSound(T: number, prevT: number, loopN: number) {
    if (!sfx.enabled || prevT < 0 || T < prevT) return
    const base = loopN * HS.length
    for (let i = base - 1; i < base + HS.length + 1; i++) {
      const wv = waveAt(i)
      const tb = wv.tb - loopN * LOOP
      const pan = clamp((toX(wv.x0, wv.zb) / w) * 2 - 1, -0.7, 0.7)
      if (prevT < tb && tb <= T) sfx.noise(4.5 + wv.H, { filter: 700 + wv.H * 300, to: 260, q: 0.45, gain: 0.03 + wv.H * 0.03, room: 0.55, pan })
      const ts = tb + (wv.zb - Z_SHORE) / BORE
      if (prevT < ts && ts <= T) sfx.noise(wv.tUp + wv.tDown, { filter: 2600, to: 900, q: 0.6, gain: 0.008 + wv.H * 0.01, room: 0.4, pan: -pan * 0.5 })
    }
  }

  /* ---------------------------------------------------------------- clock */
  const at = Number(env.params.get('at'))
  const offset = env.params.has('at') && Number.isFinite(at) ? at : preview ? 27 : 0
  let prevT = -1
  let lit = 0
  /** a cell to point the loupe at */
  let pick = -1
  /** where the loupe's leader points: eased from one lit cell to the next */
  const lead = { x: -1, y: -1, since: 0 }

  /* ---------------------------------------------------------- the ghost demo */
  const G0 = 1.4
  const G1 = 6.8
  function ghostAt(t: number) {
    if (preview || touched || t < G0 || t > G1) return null
    const u = (t - G0) / (G1 - G0)
    const k = ease.inOutSine(clamp(u * 1.1))
    const x = lerp(w * (portrait ? 0.15 : 0.26), w * (portrait ? 0.85 : 0.72), k)
    const y = lerp(toY(26), toY(10.5), k) + Math.sin(k * Math.PI * 2) * (yS - yH) * 0.07
    return { x, y, u, a: smoothstep(0, 0.1, u) * (1 - smoothstep(0.88, 1, u)) }
  }

  /* --------------------------------------------------------------- step */
  function step(t: number, dt: number, T: number, loopN: number) {
    surf(T, loopN)
    // the stir this frame: the pointer, or the ghost
    let sx0 = 0
    let sy0 = 0
    let sx1 = 0
    let sy1 = 0
    let sOn = false
    let strength = 0
    let radius = 0
    let push = 0
    if (ptr.x >= 0 && ptr.lx >= 0 && (ptr.down || !ptr.touch)) {
      sx0 = ptr.lx
      sy0 = ptr.ly
      sx1 = ptr.x
      sy1 = ptr.y
      const sp = Math.hypot(sx1 - sx0, sy1 - sy0) / Math.max(dt, 1 / 120)
      ptr.speed = lerp(ptr.speed, sp, damp(12, dt))
      // pressing stirs hard and drags the water; a passing mouse just brushes it
      strength = ptr.down ? 0.6 + Math.min(1.6, ptr.speed / 450) : Math.min(0.75, ptr.speed / 1000)
      radius = ptr.down ? (ptr.touch ? 42 : 30) : 16
      push = ptr.down ? 1 : 0
      sOn = ptr.down || ptr.speed > 25
      ptr.lx = ptr.x
      ptr.ly = ptr.y
    } else {
      const g = ghostAt(t)
      const g2 = ghostAt(t - Math.max(dt, 1 / 60))
      if (g && g2) {
        sOn = true
        sx0 = g2.x
        sy0 = g2.y
        sx1 = g.x
        sy1 = g.y
        strength = 1.15 * g.a
        radius = 30
        push = 0.8 * g.a
      }
    }
    if (sOn && push > 0 && sy1 > yH) {
      trail.push({ x: sx1, y: sy1, t })
      if (trail.length > 90) trail.shift()
    }
    while (trail.length && t - trail[0].t > 0.9) trail.shift()
    const sdx = sx1 - sx0
    const sdy = sy1 - sy0
    const sl2 = sdx * sdx + sdy * sdy
    const bx0 = Math.min(sx0, sx1) - radius
    const bx1 = Math.max(sx0, sx1) + radius
    const by0 = Math.min(sy0, sy1) - radius
    const by1 = Math.max(sy0, sy1) + radius
    const pvx = dt > 0 ? sdx / dt : 0
    const pvy = dt > 0 ? sdy / dt : 0

    for (const s of splashes) s.t += dt
    while (splashes.length && splashes[0].t > 2.4) splashes.shift()

    const decay = Math.exp(-dt / 0.11)
    const recover = dt / 6
    const inv = NBIN / (2 * XW)
    let newLight = 0
    lit = 0
    for (let i = 0; i < N; i++) {
      // the water carries what you push, then lets go
      if (vx[i] !== 0 || vy[i] !== 0 || ox[i] !== 0 || oy[i] !== 0) {
        ox[i] += vx[i] * dt
        oy[i] += vy[i] * dt
        const kv = Math.exp(-dt * 2.4)
        vx[i] *= kv
        vy[i] *= kv
        const ko = Math.exp(-dt * 0.3)
        ox[i] *= ko
        oy[i] *= ko
        if (Math.abs(vx[i]) + Math.abs(vy[i]) < 0.05 && Math.abs(ox[i]) + Math.abs(oy[i]) < 0.05) vx[i] = vy[i] = ox[i] = oy[i] = 0
      }
      const z = wz[i]
      let s = 0
      let el = 0
      // the surf
      if (active.length) {
        const j = clamp(Math.floor(wx[i] * inv + NBIN / 2), 0, NBIN - 1)
        for (let q = 0; q < active.length; q++) {
          const a = active[q]
          const zc = a.zC[j]
          if (zc > 0) {
            // the swell lifts the water; the face steepens and sparks just before the break
            const d = z - zc
            const sig = 2.2 + 0.07 * (zc - Z_SHORE)
            el += a.hC[j] * Math.exp(-((d / (d < 0 ? sig : sig * 2.6)) ** 2))
            if (a.pre[j] > 0 && d > -1.2 && d < 0.8) s += a.wv.H * 0.55 * a.pre[j] * rand()
          }
          const zf = a.zF[j]
          if (zf > 0) {
            const d = z - zf
            if (a.swash[j]) {
              // the swash: its leading edge, and the thin sheet behind it
              if (d > -0.45 && d < 0.45) s += a.I[j] * (1 - Math.abs(d) / 0.45)
              else if (d > 0 && z < Z_SHORE + 0.6) s += a.I[j] * 0.32 * rand()
            } else {
              const wf = 0.8 + a.wv.H * 0.45
              const Lb = 3 + a.wv.H * 3.5
              if (d > -wf - a.lip[j] * 1.5 && d < wf) {
                s += a.I[j] * (1 - Math.abs(d) / (wf + a.lip[j] * 1.5)) * (1 + a.lip[j])
                el += a.hF[j] * (1 - Math.abs(d) / (wf * 3))
              } else if (d > 0 && d < Lb) {
                // white water behind the front: churning, sparkling
                s += a.I[j] * 0.8 * Math.exp(-(d - wf) / (Lb * 0.5)) * rand()
                el += a.hF[j] * 0.7 * Math.exp(-(d - wf) / (Lb * 0.6))
              } else if (d >= Lb && d < Lb + 12) {
                // and the foam it leaves, in streaks
                s += a.I[j] * 0.65 * foamAff[i] * Math.exp(-(d - Lb) / 5) * rand()
              }
            }
          }
          const zm = a.zM[j]
          if (zm > 0 && Math.abs(z - zm) < 0.35) s += a.foam[j] * rand()
        }
      }
      eta[i] = el
      // the hand
      const X = px[i] + ox[i]
      const Y = py[i] + oy[i]
      if (sOn && X > bx0 && X < bx1 && Y > by0 && Y < by1) {
        let u = sl2 > 0 ? ((X - sx0) * sdx + (Y - sy0) * sdy) / sl2 : 0
        u = clamp(u)
        const qx = sx0 + sdx * u - X
        const qy = sy0 + sdy * u - Y
        const d2 = qx * qx + qy * qy
        if (d2 < radius * radius) {
          const f = 1 - Math.sqrt(d2) / radius
          s += strength * f * (0.55 + 0.45 * rand())
          if (push > 0) {
            // drag the water along, curling a little either side of the path
            const side = qx * sdy - qy * sdx > 0 ? 1 : -1
            vx[i] += (pvx * 0.5 - side * pvy * 0.14) * f * push * dt * 9
            vy[i] += (pvy * 0.5 + side * pvx * 0.14) * f * push * dt * 9
          }
        }
      }
      // a splash: a ring spreading on the water, and drops falling back
      if (splashes.length) {
        for (const sp of splashes) {
          const ddx = wx[i] - sp.x
          const ddz = z - sp.z
          if (Math.abs(ddx) > 4 || Math.abs(ddz) > 4) continue
          const d = Math.sqrt(ddx * ddx + ddz * ddz)
          const rr = 0.2 + sp.t * 1.5
          if (Math.abs(d - rr) < 0.2) s += (1 - sp.t / 2.4) * 1.5
          if (sp.t < 0.12 && d < 0.35) s += 2
          for (const dr of sp.drops) {
            const tl = sp.t - dr.up
            if (tl < 0 || tl > 0.08) continue
            if (Math.abs(ddx - Math.cos(dr.a) * dr.v) < 0.22 && Math.abs(ddz - Math.sin(dr.a) * dr.v) < 0.22) s += 1.8
          }
        }
      }
      // excitation: threshold, refractory time, a store of light that tires
      refr[i] -= dt
      em[i] *= decay
      if (s > thr[i] && refr[i] <= 0 && rand() < clamp((s - thr[i]) * 4) * Math.min(1, dt * 40)) {
        const f = charge[i] * clamp(0.45 + s * 0.5, 0, 1.4)
        em[i] = Math.min(1.6, em[i] + f)
        charge[i] -= charge[i] * 0.12
        refr[i] = 0.09 + rand() * 0.1
        newLight += f
      }
      if (charge[i] < 1) charge[i] = Math.min(1, charge[i] + recover)
      if (em[i] > 0.04) {
        lit++
        if (pick < 0 && em[i] > 0.7 && z > Z_SHORE + 2 && z < 45 && T > 12.6 && T < 21.5) pick = i
      }
    }
    return newLight
  }

  /* ------------------------------------------------------------- render */
  function render(t: number, T: number, loopN: number, dt: number) {
    ground(ctx, w, h, 'night')
    // the sea: a faint sheen of sky near the horizon
    const sea = ctx.createLinearGradient(0, yH, 0, yS)
    sea.addColorStop(0, 'rgba(120,170,190,0.1)')
    sea.addColorStop(0.3, 'rgba(60,110,130,0.04)')
    sea.addColorStop(1, 'rgba(0,0,0,0.14)')
    ctx.fillStyle = sea
    ctx.fillRect(0, yH, w, yS - yH)
    // the beach: darker and stippled; the wet band darker still, with a sheen
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(0, yS, w, h - yS)
    const wet = ctx.createLinearGradient(0, yS, 0, yWet)
    wet.addColorStop(0, 'rgba(90,140,160,0.07)')
    wet.addColorStop(1, 'rgba(0,8,12,0.2)')
    ctx.fillStyle = wet
    ctx.fillRect(0, yS, w, yWet - yS)
    if (sand) {
      ctx.fillStyle = 'rgba(238,244,241,0.1)'
      ctx.fill(sand)
    }

    // the sky: dust of the Milky Way, stars, a meteor in the calm
    if (milky) {
      ctx.fillStyle = 'rgba(238,244,241,0.16)'
      ctx.fill(milky)
    }
    ctx.fillStyle = '#F2F6F8'
    for (const s of stars) {
      const tw = 0.65 + 0.35 * Math.sin(t * (1.2 + s.b * 2) + s.p)
      ctx.globalAlpha = (0.2 + s.b * 0.7) * tw
      const r = 0.5 + s.b * 1.2
      ctx.fillRect(s.x - r / 2, s.y - r / 2, r, r)
    }
    ctx.globalAlpha = 1
    const mt = T - METEOR
    if (mt > 0 && mt < 1.1) {
      const u = ease.outCubic(clamp(mt / 0.7))
      const x0 = w * 0.64
      const y0 = yH * 0.1
      const x1 = w * 0.46
      const y1 = yH * 0.6
      const tail = 0.3
      const hx = lerp(x0, x1, u)
      const hy = lerp(y0, y1, u)
      const tx = lerp(x0, x1, Math.max(0, u - tail))
      const ty = lerp(y0, y1, Math.max(0, u - tail))
      const fade = 1 - smoothstep(0.5, 1.1, mt)
      const g = ctx.createLinearGradient(tx, ty, hx, hy)
      g.addColorStop(0, 'rgba(240,246,248,0)')
      g.addColorStop(1, `rgba(240,246,248,${0.9 * fade})`)
      ctx.strokeStyle = g
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()
    }
    // the headland and the horizon
    if (head && headRim) {
      ctx.fillStyle = 'rgba(4,14,18,0.85)'
      ctx.fill(head)
      ctx.strokeStyle = 'rgba(238,244,241,0.18)'
      ctx.lineWidth = 1
      ctx.stroke(headRim)
    }
    ctx.strokeStyle = 'rgba(238,244,241,0.22)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, yH + 0.5)
    ctx.lineTo(w, yH + 0.5)
    ctx.stroke()

    // the swell: long crests in fine hairlines, coming in, standing up as they shoal
    drawCrests(T, loopN)

    // the light: a soft quarter-resolution glow under crisp points
    if (gctx && gbuf) {
      const gw = gbuf.width
      const gh = gbuf.height
      gctx.globalCompositeOperation = 'source-over'
      gctx.fillStyle = `rgba(0,0,0,${dt > 0 ? 1 - Math.exp(-dt / 0.09) : 0})`
      gctx.fillRect(0, 0, gw, gh)
      gctx.globalCompositeOperation = 'lighter'
      sparkPaths(1 / GB, 1)
      for (let q = 0; q < LV; q++) {
        gctx.fillStyle = glowCss(Math.min(1, ((q + 0.5) / LV) * 0.55 * fine * fine))
        gctx.fill(lvPaths[q])
      }
      glowLines(gctx, 1 / GB, 1.6, 0.4 * fine)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(gbuf, 0, 0, gw * GB, gh * GB)
      ctx.restore()
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    glowLines(ctx, 1, fine, 0.6 + 0.4 * fine)
    sparkPaths(1, 0)
    for (let q = 0; q < LV; q++) {
      ctx.fillStyle = glowCss(Math.min(1, ((q + 0.5) / LV) * 1.15))
      ctx.fill(lvPaths[q])
    }
    // the hand's wake
    if (trail.length > 1) {
      for (let q = 1; q < trail.length; q++) {
        const p0 = trail[q - 1]
        const p1 = trail[q]
        if (Math.hypot(p1.x - p0.x, p1.y - p0.y) > 80) continue
        const age = clamp((t - p1.t) / 0.9)
        ctx.strokeStyle = glowCss(0.5 * (1 - age) * (1 - age))
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.stroke()
      }
    }
    // the brightest flashes whiten a little at the core (light adds)
    ctx.fillStyle = 'rgba(200,232,255,0.35)'
    ctx.fill(lvPaths[LV - 1])
    ctx.restore()
  }

  function drawCrests(T: number, loopN: number) {
    const base = loopN * HS.length
    const now = T + loopN * LOOP
    const n = Math.max(40, Math.round(w / 14))
    ctx.lineWidth = 1
    for (let i = base - 2; i < base + HS.length + 13; i++) {
      const wv = waveAt(i)
      const d0 = wv.tb - now
      if (d0 < -1 || d0 > 85) continue
      const zMid = crestZ(wv, Math.max(0, d0))
      const fadeFar = clamp(1.15 - (zMid - 50) / 550)
      // the crest line, a fainter back line, and — as it stands up — the face in contours
      for (let line = 0; line < 5; line++) {
        const back = line === 1
        const contour = line >= 2 ? line - 1 : 0
        if (contour && d0 > 3.2) continue
        ctx.beginPath()
        let pen = false
        let aSum = 0
        let cnt = 0
        for (let k = 0; k <= n; k++) {
          const xs = (k / n) * (w + 80) - 40
          const zg = zMid + (back ? 2.5 + wv.H * 2 : 0)
          const xw = ((xs - cx) * zg) / F
          const d = wv.tb + Math.abs(xw - wv.x0) / PEEL - now
          if (d < 0.02 || (contour && d > 3)) {
            pen = false
            continue
          }
          let z = crestZ(wv, d) + noise.n2(xw * 0.03 + wv.seed, 0.5) * 1.2 + (back ? 2.5 + wv.H * 2 : 0)
          // far out the swell is a broken texture, not a ruled line
          if (z > 1600 || (z > 70 && noise.n2(xw * 0.012 + wv.seed * 3, back ? 9 : 4) < -0.35 + 0.25 * clamp((z - 70) / 300))) {
            pen = false
            continue
          }
          let hc = back ? crestH(wv, d) * 0.25 : crestH(wv, d)
          if (contour) {
            // contours down the concave face, each a little in front of the last
            const f = 1 - contour * 0.25
            const steep = clamp(1 - d / 3)
            z -= contour * (0.35 + 0.5 * steep) * (0.6 + 0.4 * wv.H)
            hc *= f * f
          }
          const x = toX(xw, z)
          const y = toY(z, hc)
          if (!pen) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          pen = true
          aSum += back ? 0.07 : contour ? (0.06 + 0.2 * clamp(1 - d / 3)) * Math.min(1.2, wv.H) * (1 - contour * 0.2) : 0.13 + 0.36 * Math.exp(-d / 2.5) * Math.min(1.2, wv.H)
          cnt++
        }
        if (!cnt) continue
        ctx.strokeStyle = rgba(NIGHT_INK, clamp((aSum / cnt) * fadeFar, 0.03, 0.55))
        ctx.stroke()
      }
    }
  }

  /** the breaking lip and the bore front, the swash edge, the foam line: hairlines of light */
  function glowLines(c: CanvasRenderingContext2D, scale: number, lw: number, alpha: number) {
    for (const a of active) {
      for (let pass = 0; pass < 3; pass++) {
        // 0: the front, 1: its reflection on the water and wet sand, 2: the foam line
        if (pass === 1 && scale !== 1) continue
        c.beginPath()
        let pen = false
        let sum = 0
        let cnt = 0
        for (let j = 0; j < NBIN; j++) {
          const z = pass === 2 ? a.zM[j] : a.zF[j]
          const I = pass === 2 ? a.foam[j] : a.I[j]
          if (z <= 0 || I <= 0.02) {
            pen = false
            continue
          }
          const xw = ((j + 0.5) / NBIN - 0.5) * 2 * XW
          const hgt = pass === 2 ? 0 : a.hF[j]
          const x = toX(xw, z)
          const y = toY(z, pass === 1 ? -hgt : hgt * 0.9)
          if (x < -40 || x > w + 40) {
            pen = false
            continue
          }
          if (!pen) c.moveTo(x * scale, y * scale)
          else c.lineTo(x * scale, y * scale)
          pen = true
          sum += I * (pass === 0 ? 1 + a.lip[j] * 0.6 : 1)
          cnt++
        }
        if (!cnt) continue
        const I = sum / cnt
        c.strokeStyle = glowCss(clamp(I * (pass === 0 ? 0.5 : pass === 1 ? 0.12 : 0.32), 0, 0.8) * alpha)
        c.lineWidth = lw * (pass === 0 ? 1.2 : 0.8)
        c.stroke()
      }
      // the plunging lip: a curtain of light falling from the crest to the water
      c.beginPath()
      let curtain = 0
      for (let j = 0; j < NBIN; j++) {
        const lip = a.lip[j]
        const z = a.zF[j]
        if (lip <= 0.02 || z <= 0 || a.swash[j]) continue
        const xw = ((j + 0.5) / NBIN - 0.5) * 2 * XW
        const x = toX(xw, z)
        if (x < -10 || x > w + 10) continue
        const nn = noise.n2(j * 0.9, a.wv.seed * 2)
        if (nn < 0.05) continue
        const y0 = toY(z, a.hF[j] * 0.9)
        const y1 = toY(z - 1.2, 0)
        const jx = noise.n2(j * 0.7, a.wv.seed + lip * 3) * 3
        c.moveTo(x * scale, y0 * scale)
        c.quadraticCurveTo((x + jx * 0.3) * scale, lerp(y0, y1, 0.3) * scale, (x + jx) * scale, lerp(y0, y1, (0.3 + 0.7 * lip) * (0.5 + nn)) * scale)
        curtain += lip
      }
      if (curtain > 0) {
        c.strokeStyle = glowCss(clamp(0.32 * a.wv.H, 0, 0.5) * alpha)
        c.lineWidth = lw * 0.7
        c.stroke()
      }
      // white water: churning streaks of light behind the front
      if (scale === 1) {
        for (let q = 1; q <= 3; q++) {
          c.beginPath()
          let pen = false
          let sum = 0
          let cnt = 0
          const off = q * (0.9 + a.wv.H * 0.9)
          for (let j = 0; j < NBIN; j++) {
            const zf = a.zF[j]
            if (zf <= 0 || a.swash[j] || a.I[j] < 0.05) {
              pen = false
              continue
            }
            const xw = ((j + 0.5) / NBIN - 0.5) * 2 * XW
            const n = noise.n2(xw * 0.35 + q * 5, a.wv.seed + q)
            if (n < -0.25) {
              pen = false
              continue
            }
            const z = zf + off + n * 0.6
            const x = toX(xw, z)
            const y = toY(z, a.hF[j] * 0.6 * Math.exp(-off / 4))
            if (!pen) c.moveTo(x, y)
            else c.lineTo(x, y)
            pen = true
            sum += a.I[j]
            cnt++
          }
          if (!cnt) continue
          c.strokeStyle = glowCss(clamp((sum / cnt) * 0.22 * (1 - q * 0.22), 0, 0.5))
          c.lineWidth = 0.8
          c.stroke()
        }
      }
    }
  }

  const LV = 7
  const lvPaths: Path2D[] = []
  /** Build the lit cells into one path per brightness level (screen or glow-buffer scale). */
  function sparkPaths(scale: number, mode: number) {
    for (let q = 0; q < LV; q++) lvPaths[q] = new Path2D()
    for (let i = 0; i < N; i++) {
      const e = em[i]
      if (e < 0.04) continue
      const z = wz[i]
      const x = (px[i] + ox[i]) * scale
      const y = (py[i] + oy[i] - (F * eta[i]) / z) * scale
      const lvl = Math.min(LV - 1, Math.floor(Math.min(1, e) * LV))
      const s = mode === 1 ? 1 : size[i] * (0.8 + Math.min(0.6, e * 0.4))
      lvPaths[lvl].rect(x - s / 2, y - s / 2, s, s)
    }
  }

  /* ----------------------------------------------------------- the chrome */
  function chrome(t: number, T: number, loopN: number) {
    const k = NIGHT_INK
    const m = 'rgba(238,244,241,0.55)'
    const small = preview || tiny
    text(ctx, small ? FIG : `${FIG} — SEA GLOW`, pad, pad + 8, { size: small ? 8.5 : 10, color: m, tracking: 0.16, upper: true })
    if (!small && !short) text(ctx, 'NOCTILUCA SCINTILLANS · NEW MOON · SURF', pad, pad + 24, { size: 9, color: 'rgba(238,244,241,0.38)', tracking: 0.14 })

    const cur = currentWave(T, loopN)
    const rows: [string, string][] = [
      ['λ peak', `${PEAK} nm`],
      ['Lit', lit.toLocaleString('en-US')],
    ]
    if (!small) {
      rows.push(['Flash', '≈ 0.1 s'])
      rows.push(['Wave', `${cur.H.toFixed(1)} m · ${PERIOD} s`])
    }
    let y = pad + 8
    for (const [label, value] of rows) {
      setFont(ctx, { size: small ? 9 : 10.5, tracking: 0.06 })
      text(ctx, value, w - pad, y, { size: small ? 9 : 10.5, color: k, align: 'right', tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, label, w - pad - vw - 10, y, { size: small ? 8 : 9, color: m, align: 'right', tracking: 0.14, upper: true })
      y += small ? 13 : 16
    }
    // the set: one tick per wave in the loop, as tall as the wave, the current one lit
    if (!small) {
      const n = HS.length
      const bw = 7
      const x1 = w - pad
      const x0 = x1 - n * bw
      const yb = y + 8
      ctx.lineWidth = 1
      for (let q = 0; q < n; q++) {
        ctx.strokeStyle = q === cur.k ? glowCss(0.95) : 'rgba(238,244,241,0.35)'
        ctx.beginPath()
        ctx.moveTo(x0 + q * bw + 3, yb)
        ctx.lineTo(x0 + q * bw + 3, yb - 3 - HS[q] * 9)
        ctx.stroke()
      }
      text(ctx, 'SET', x0 - 8, yb, { size: 8.5, color: m, align: 'right', tracking: 0.14 })
      y = yb + 6
    }
    if (!small && !short && w >= 640 && y + 110 < yH) spectrum(w - pad - 190, y + 18, 190, 74, T)

    // the distance ruler down the left edge: perspective, closer together as it recedes
    if (!small && !short) {
      const x = pad * 0.5 + 2
      ctx.strokeStyle = 'rgba(238,244,241,0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, toY(400))
      ctx.lineTo(x, toY(Z_WET))
      for (const z of [10, 14, 20, 30, 50, 100, 200, 400]) {
        const yy = toY(z)
        ctx.moveTo(x, yy)
        ctx.lineTo(x + (z === Z_SHORE ? 8 : 4), yy)
      }
      ctx.stroke()
      for (const z of [10, 20, 50, 100]) text(ctx, `${z} M`, x + 7, toY(z) + 3, { size: 7.5, color: 'rgba(238,244,241,0.42)', tracking: 0.12 })
      text(ctx, 'SHORE', x + 11, toY(Z_SHORE) + 3, { size: 7.5, color: 'rgba(238,244,241,0.42)', tracking: 0.12 })
    }

    if (!preview && !tiny) loupe(T)
    captionAt(T)
    if (!preview) prompts(t)
  }

  function currentWave(T: number, loopN: number) {
    let best = { H: HS[0], k: 0 }
    let bestD = 1e9
    const base = loopN * HS.length
    for (let i = base - 1; i < base + HS.length + 1; i++) {
      const wv = waveAt(i)
      const d = T + loopN * LOOP - wv.tb + 1.5
      if (d >= 0 && d < bestD) {
        bestD = d
        best = { H: wv.H, k: mod(i, HS.length) }
      }
    }
    return best
  }

  /** Emission spectrum, and how fast water swallows each colour. */
  function spectrum(x: number, y: number, bw: number, bh: number, T: number) {
    const hi = smoothstep(44, 45.5, T) * (1 - smoothstep(52.5, 54, T))
    const X = (nm: number) => lerp(x, x + bw, (nm - 400) / 300)
    const y1 = y + bh - 12
    const y0 = y + 10
    ctx.save()
    ctx.globalAlpha = 0.6 + 0.4 * hi
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(238,244,241,0.35)'
    ctx.beginPath()
    ctx.moveTo(x, y1)
    ctx.lineTo(x + bw, y1)
    for (const nm of [400, 500, 600, 700]) {
      ctx.moveTo(X(nm), y1)
      ctx.lineTo(X(nm), y1 + 3)
    }
    ctx.stroke()
    for (const nm of [400, 500, 600, 700]) text(ctx, String(nm), X(nm), y1 + 12, { size: 7.5, color: 'rgba(238,244,241,0.5)', align: 'center' })
    text(ctx, 'EMISSION · WATER ABSORPTION (LOG)', x, y, { size: 7.5, color: 'rgba(238,244,241,0.62)', tracking: 0.14 })
    ctx.lineWidth = 1.5
    for (let nm = 400; nm <= 560; nm += 5) {
      const v = emission(nm)
      if (v < 0.02) continue
      const c = spectral(nm)
      ctx.strokeStyle = `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},0.9)`
      ctx.beginPath()
      ctx.moveTo(X(nm), y1)
      ctx.lineTo(X(nm), lerp(y1, y0, v))
      ctx.stroke()
    }
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(238,244,241,0.85)'
    ctx.beginPath()
    for (let nm = 400; nm <= 600; nm += 4) {
      const yy = lerp(y1, y0, emission(nm))
      if (nm === 400) ctx.moveTo(X(nm), yy)
      else ctx.lineTo(X(nm), yy)
    }
    ctx.stroke()
    // water absorption, log scale 0.003 → 1 m⁻¹, dashed
    const Ya = (av: number) => lerp(y1, y0, clamp((Math.log10(av) + 2.5) / 2.5))
    ctx.setLineDash([2, 2])
    ctx.strokeStyle = 'rgba(238,244,241,0.6)'
    ctx.beginPath()
    for (let nm = 400; nm <= 700; nm += 5) {
      const yy = Ya(waterA(nm))
      if (nm === 400) ctx.moveTo(X(nm), yy)
      else ctx.lineTo(X(nm), yy)
    }
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, `1/a · ${Math.round(1 / waterA(PEAK))} M AT ${PEAK} · ${(1 / waterA(600)).toFixed(1)} M AT 600 NM`, x, y1 + 24, { size: 7.5, color: 'rgba(238,244,241,0.55)', tracking: 0.1 })
    ctx.restore()
  }

  /** A loupe on one cell: Noctiluca, half a millimetre across, its scintillons flashing. */
  function loupe(T: number) {
    const a = smoothstep(13.4, 14.4, T) * (1 - smoothstep(21.2, 22.2, T))
    if (a <= 0.01 || pick < 0) return
    const R = clamp(Math.min(w, h) * 0.085, 30, 70)
    const lx = portrait ? w - pad - R : w * 0.6
    const ly = portrait ? yH - R - 34 : Math.max(pad + R + 8, yH * 0.52)
    if (ly - R < pad + 40) return
    // the leader follows one flashing cell, then moves on to another as it fades
    const qx = px[pick] + ox[pick]
    const qy = py[pick] + oy[pick] - (F * eta[pick]) / wz[pick]
    if (lead.x < 0) {
      lead.x = qx
      lead.y = qy
    }
    lead.x = lerp(lead.x, qx, 0.25)
    lead.y = lerp(lead.y, qy, 0.25)
    const sx = lead.x
    const sy = lead.y
    ctx.save()
    ctx.globalAlpha = a
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(238,244,241,0.55)'
    const ang = Math.atan2(sy - ly, sx - lx)
    ctx.beginPath()
    ctx.arc(sx, sy, 5, 0, TAU)
    ctx.moveTo(sx - Math.cos(ang) * 5, sy - Math.sin(ang) * 5)
    ctx.lineTo(lx + Math.cos(ang) * R, ly + Math.sin(ang) * R)
    ctx.stroke()
    ctx.fillStyle = 'rgba(8,22,28,0.94)'
    ctx.beginPath()
    ctx.arc(lx, ly, R, 0, TAU)
    ctx.fill()
    ctx.stroke()
    // the cell: a balloon of vacuole, strands of cytoplasm to a central mass, a tentacle
    const cr = R * 0.66
    const ccx = lx - R * 0.05
    const ccy = ly + R * 0.02
    ctx.strokeStyle = 'rgba(238,244,241,0.75)'
    ctx.beginPath()
    ctx.ellipse(ccx, ccy, cr, cr * 0.96, 0.2, 0, TAU)
    ctx.stroke()
    const nx = ccx + cr * 0.22
    const ny = ccy - cr * 0.18
    ctx.strokeStyle = 'rgba(238,244,241,0.38)'
    ctx.beginPath()
    for (let q = 0; q < 14; q++) {
      const aa = (q / 14) * TAU + 0.3
      const ex = ccx + Math.cos(aa) * cr * 0.95
      const ey = ccy + Math.sin(aa) * cr * 0.92
      ctx.moveTo(nx, ny)
      ctx.quadraticCurveTo((nx + ex) / 2 + Math.sin(aa * 3) * cr * 0.12, (ny + ey) / 2 + Math.cos(aa * 2) * cr * 0.12, ex, ey)
    }
    ctx.stroke()
    ctx.strokeStyle = 'rgba(238,244,241,0.7)'
    ctx.beginPath()
    ctx.ellipse(nx, ny, cr * 0.16, cr * 0.12, -0.4, 0, TAU)
    const tx = ccx + Math.cos(2.2) * cr
    const ty = ccy + Math.sin(2.2) * cr
    ctx.moveTo(tx, ty)
    ctx.bezierCurveTo(tx - cr * 0.25, ty + cr * 0.15, tx - cr * 0.35, ty + cr * 0.05, tx - cr * 0.42, ty + cr * 0.26)
    ctx.stroke()
    // scintillons: points of light in the cytoplasm, flashing
    ctx.globalCompositeOperation = 'lighter'
    const fl = 0.5 + 0.5 * Math.sin(T * 9)
    for (let q = 0; q < 26; q++) {
      const aa = q * 2.399
      const rr = cr * (0.55 + 0.38 * ((q * 0.618) % 1))
      const on = clamp(fl + Math.sin(q * 1.7 + T * 5) * 0.6)
      ctx.fillStyle = glowCss(0.25 + on * 0.75)
      ctx.fillRect(ccx + Math.cos(aa) * rr - 1, ccy + Math.sin(aa) * rr * 0.96 - 1, 2, 2)
    }
    ctx.globalCompositeOperation = 'source-over'
    setFont(ctx, { size: 8, tracking: 0.14 })
    const tw = ctx.measureText('SCINTILLONS · FLASH ≈ 0.1 S').width
    const tx2 = clamp(lx, pad + tw / 2, w - pad - tw / 2)
    text(ctx, 'NOCTILUCA · ⌀ ≈ 0.5 MM', tx2, ly + R + 14, { size: 8, color: 'rgba(238,244,241,0.72)', align: 'center', tracking: 0.14 })
    if (!short) text(ctx, 'SCINTILLONS · FLASH ≈ 0.1 S', tx2, ly + R + 26, { size: 8, color: 'rgba(238,244,241,0.5)', align: 'center', tracking: 0.14 })
    ctx.restore()
  }

  function captionAt(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.04
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = capY + capSize + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, w, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: NIGHT_INK })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: glowCss(1) })
        ctx.restore()
      })
    }
  }

  function prompts(t: number) {
    const g = ghostAt(t)
    if (g) {
      ctx.save()
      ctx.globalAlpha = g.a
      ctx.strokeStyle = 'rgba(238,244,241,0.55)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      for (let q = 0; q <= 40; q++) {
        const gg = ghostAt(G0 + ((G1 - G0) * q) / 40 / 1.1)
        if (!gg) continue
        if (q === 0) ctx.moveTo(gg.x, gg.y)
        else ctx.lineTo(gg.x, gg.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = NIGHT_INK
      ctx.beginPath()
      ctx.arc(g.x, g.y, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(g.x, g.y, 11, 0, TAU)
      ctx.stroke()
      const label = tiny || w < 600 ? 'DRAG THROUGH THE WATER' : 'DRAG THROUGH THE WATER · TAP TO SPLASH'
      setFont(ctx, { size: 9.5, tracking: 0.14 })
      const lw = ctx.measureText(label).width
      text(ctx, label, clamp(g.x + 18, pad, w - pad - lw), g.y - 18, { size: 9.5, color: NIGHT_INK, tracking: 0.14 })
      ctx.restore()
    }
    // hover: the reach of the hand
    if (ptr.x >= 0 && !ptr.down && !ptr.touch && ptr.y > yH && ptr.y < yWet) {
      ctx.save()
      ctx.strokeStyle = 'rgba(238,244,241,0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.arc(ptr.x, ptr.y, 30, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      if (!stirredOnce && !tiny) {
        const label = 'DRAG TO STIR · TAP TO SPLASH'
        setFont(ctx, { size: 9, tracking: 0.14 })
        const lw = ctx.measureText(label).width
        const right = ptr.x + 38 + lw < w - pad
        text(ctx, label, right ? ptr.x + 38 : ptr.x - 38, ptr.y + 3, { size: 9, color: 'rgba(238,244,241,0.8)', tracking: 0.14, align: right ? 'left' : 'right' })
      }
      ctx.restore()
    }
  }

  layout()

  const sp0 = (env.params.get('splash') ?? '').split(',').map(Number)
  let splashAt: number[] | null = sp0.length === 2 && sp0.every(Number.isFinite) ? sp0 : null
  // test hook: ?hover=x,y shows the hover prompt in a frozen frame
  {
    const hv = (env.params.get('hover') ?? '').split(',').map(Number)
    if (hv.length === 2 && hv.every(Number.isFinite)) {
      ptr.x = ptr.lx = hv[0]
      ptr.y = ptr.ly = hv[1]
    }
  }

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      ptr.touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        ptr.x = ptr.y = ptr.lx = ptr.ly = -1
        ptr.down = false
        env.setCursor('default')
        return
      }
      if (p.type === 'down') {
        touched = true
        ptr.down = true
        ptr.x = ptr.lx = p.x
        ptr.y = ptr.ly = p.y
        ptr.t0 = lastT
        ptr.moved = 0
      } else if (p.type === 'up') {
        if (ptr.down && ptr.moved < 12 && lastT - ptr.t0 < 0.4 && p.y > yH) splash(p.x, p.y)
        ptr.down = false
        if (ptr.touch) ptr.x = ptr.y = ptr.lx = ptr.ly = -1
      } else {
        if (ptr.x >= 0) ptr.moved += Math.hypot(p.x - ptr.x, p.y - ptr.y)
        if (ptr.lx < 0) {
          ptr.lx = p.x
          ptr.ly = p.y
        }
        ptr.x = p.x
        ptr.y = p.y
        if (ptr.down && ptr.moved > 40) stirredOnce = true
      }
      env.setCursor(ptr.down ? 'grabbing' : p.y > yH ? 'crosshair' : 'default')
    },
    frame(t, dt) {
      lastT = t
      // test hook: ?splash=x,y splashes there one second in
      if (splashAt && t >= 1) {
        splash(splashAt[0], splashAt[1])
        splashAt = null
      }
      const Tr = t + offset
      const T = mod(Tr, LOOP)
      const loopN = Math.floor(Tr / LOOP)
      if (T < prevT) pick = -1
      if (dt > 0) {
        const nl = step(t, dt, T, loopN)
        // a high shimmer when the water glows
        if (sfx.enabled && nl > 2 && t > nextShimmer) {
          nextShimmer = t + 0.09 + Math.random() * 0.12
          const g = clamp(nl / 60, 0.004, 0.016)
          sfx.tone(SHIMMER[Math.floor(Math.random() * SHIMMER.length)] * (Math.random() < 0.3 ? 2 : 1), 0.9 + Math.random() * 0.6, { type: 'sine', gain: g, attack: 0.01, room: 0.7, pan: Math.random() * 1.6 - 0.8 })
        }
        surfSound(T, prevT, loopN)
      } else surf(T, loopN)
      if (pick >= 0 && (T < 12.5 || T > 22.5)) pick = -1
      // a new cell to look at once this one has dimmed (but not too often)
      if (pick >= 0 && em[pick] < 0.15 && t - lead.since > 0.7) {
        pick = -1
        lead.since = t
      }
      if (pick < 0 && (T < 12.5 || T > 22.5)) lead.x = lead.y = -1
      render(t, T, loopN, dt)
      chrome(t, T, loopN)
      prevT = T
    },
    destroy() {
      gbuf = null
      gctx = null
    },
  }
}

export default create
