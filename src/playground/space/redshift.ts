/*
 * S.04 — REDSHIFT
 *
 * The universe is getting bigger. Galaxies sit at fixed comoving positions
 * on a grid; their physical separations are a(t) times those, where the
 * scale factor a(t) comes from a flat ΛCDM model (H₀ = 70 km/s/Mpc,
 * Ω_m = 0.27, Ω_r = 8.5 × 10⁻⁵, Ω_Λ = 1 − Ω_m − Ω_r; age 13.8 Gyr):
 *
 *     H(a) = H₀ √(Ω_r a⁻⁴ + Ω_m a⁻³ + Ω_Λ),   t(a) = ∫ da / (a H),
 *     comoving distance light covers from a₁ to a₂:  χ = c ∫ da / (a² H).
 *
 * Cosmic time and conformal time are tabulated once; everything on screen is
 * then a function of a. Light leaving a galaxy at a_e and arriving at a has
 * its wavelength stretched by a / a_e (1 + z), drawn in true spectral colour.
 * The Hubble diagram is assembled from the galaxies on screen (v = H d holds
 * exactly for the Hubble flow, at every epoch). Run backward, the grid
 * contracts, the galaxies have not yet formed, the gas glows like a 3,000 K
 * blackbody, and at a = 1/1091 the light we now see as the cosmic microwave
 * background is released, carrying a Gaussian random field of tiny
 * temperature differences (drawn as contours, enormously exaggerated).
 *
 * Five chapters, 86 s, a pure function of time plus what you drag (?at=…):
 *   I    Expansion      every galaxy recedes from every other — from here, or there
 *   II   Light stretches  a wave from a distant galaxy reddens on its way to us
 *   III  Hubble’s law   v = H₀ d, assembled point by point
 *   IV   The past       back to the hot, dense glow and the oldest light
 *   V    The oldest light  forward again: the glow cools, galaxies form
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, makeNoise, rgba, rng, setFont, smoothstep, text } from '../kit'
import { blackbody, css, spectral } from '../color'
import type { CreatePiece, PointerInfo } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 32px "Instrument Serif"'), document.fonts.load('italic 400 32px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.04'
const LOOP = 86
const INK = '#E4ECE8'
const INK2 = '#B9C8C2'
const MUTED = '#8FA39E'
const RULE = 'rgba(238,244,241,0.15)'
const ACC = C.sky
const ACC2 = C.sage

/* -------------------------------------------------------- cosmology */
const H0 = 70 // km/s/Mpc
const OM = 0.27
const OR = 8.5e-5
const OL = 1 - OM - OR
const CKMS = 299792.458
/** c / H₀ in Gpc */
const DH = CKMS / H0 / 1000
/** 1 / H₀ in Gyr */
const TH = 977.792 / H0
const A_REC = 1 / 1091
const T_CMB = 2.7255
const A0 = 0.45 // where the loop begins
const A_EMIT = 0.62 // when the light of chapter II leaves its galaxy
const LAMBDA0 = 420 // nm, as emitted

const E = (a: number) => Math.sqrt(OR / (a * a * a * a) + OM / (a * a * a) + OL)

// tables in ln a: cosmic time (Gyr) and conformal time η (Gpc of comoving distance)
const NT = 3000
const LA0 = Math.log(1e-5)
const LA1 = Math.log(2.2)
const TT = new Float64Array(NT)
const ETA = new Float64Array(NT)
{
  // radiation era start: t ≈ a² / (2 H₀ √Ω_r), η ≈ c a / (H₀ √Ω_r)
  const a = Math.exp(LA0)
  TT[0] = (a * a) / (2 * Math.sqrt(OR)) * TH
  ETA[0] = (a / Math.sqrt(OR)) * DH
  const dl = (LA1 - LA0) / (NT - 1)
  for (let i = 1; i < NT; i++) {
    const a1 = Math.exp(LA0 + (i - 1) * dl)
    const a2 = Math.exp(LA0 + i * dl)
    const f1 = 1 / E(a1)
    const f2 = 1 / E(a2)
    TT[i] = TT[i - 1] + 0.5 * (f1 + f2) * dl * TH
    ETA[i] = ETA[i - 1] + 0.5 * (f1 / a1 + f2 / a2) * dl * DH
  }
}
function tab(T: Float64Array, a: number) {
  const f = ((Math.log(Math.max(1e-5, a)) - LA0) / (LA1 - LA0)) * (NT - 1)
  const i = clamp(Math.floor(f), 0, NT - 2)
  const u = clamp(f - i, 0, 1)
  return T[i] + (T[i + 1] - T[i]) * u
}
/** cosmic time at scale factor a, Gyr */
const ageAt = (a: number) => tab(TT, a)
/** conformal time at a, Gpc (comoving distance light has covered since the beginning) */
const etaAt = (a: number) => tab(ETA, a)
/** scale factor at which light must leave to cover comoving distance χ by scale factor a */
function aEmitFor(chi: number, a: number) {
  const target = etaAt(a) - chi
  if (target <= ETA[0]) return 0
  let lo = 0
  let hi = NT - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (ETA[mid] < target) lo = mid
    else hi = mid
  }
  const u = (target - ETA[lo]) / (ETA[hi] - ETA[lo])
  return Math.exp(LA0 + ((lo + u) * (LA1 - LA0)) / (NT - 1))
}

const CHAPTERS = [
  { t: 0, num: 'I', name: 'Expansion' },
  { t: 17, num: 'II', name: 'Light stretches' },
  { t: 34, num: 'III', name: 'Hubble’s law' },
  { t: 50, num: 'IV', name: 'The past' },
  { t: 68, num: 'V', name: 'The oldest light' },
]
interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 1, t1: 16.2, lines: [{ s: 'Every galaxy is leaving' }, { s: '', em: 'every other.' }] },
  { t0: 18, t1: 33.2, lines: [{ s: 'Light stretches' }, { s: '', em: 'as space does.' }] },
  { t0: 36.5, t1: 49.2, lines: [{ s: 'The farther,' }, { s: '', em: 'the faster.' }] },
  { t0: 59, t1: 67.6, lines: [{ s: 'Look far enough' }, { s: 'and you ', em: 'see the past.' }] },
  { t0: 72, t1: 85, lines: [{ s: 'Everything here' }, { s: 'was once ', em: 'that glow.' }] },
]

/** the film’s scale factor */
function aAuto(T: number) {
  if (T < 17) return Math.exp(lerp(Math.log(A0), Math.log(A_EMIT), ease.inOutSine(T / 17)))
  if (T < 34) {
    // the wave crosses: ease in and out of the journey
    return Math.exp(lerp(Math.log(A_EMIT), 0, ease.inOutSine((T - 17) / 16)))
  }
  if (T < 50) return 1
  if (T < 63) return Math.exp(lerp(0, Math.log(A_REC), ease.inOutCubic((T - 50) / 13)))
  if (T < 68) return A_REC
  return Math.exp(lerp(Math.log(A_REC), Math.log(A0), ease.inOutCubic((T - 68) / 17.6)))
}

interface Galaxy {
  x: number
  y: number
  /** 0 spiral, 1 barred spiral, 2 elliptical */
  kind: number
  size: number
  rot: number
  q: number
  /** formation: scale factor at which it appears */
  born: number
  /** a standard-normal draw: its distance measurement error in chapter III */
  err: number
}
function gaussR(r: () => number) {
  let u = 0
  while (u === 0) u = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r())
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const noise = makeNoise(5)

  /* ---------------------------------------------------- the galaxies */
  // an endless field, generated per 1-Gpc comoving cell from a hash of the cell
  const cells = new Map<number, Galaxy[]>()
  const DENS = preview ? 1.0 : 1.35
  const cellKey = (i: number, j: number) => (i + 512) * 1024 + (j + 512)
  function cell(i: number, j: number): Galaxy[] {
    const key = cellKey(i, j)
    let list = cells.get(key)
    if (list) return list
    const r = rng(Math.imul(i * 73856093, 1) ^ Math.imul(j, 19349663) ^ 0x51f2)
    list = []
    // filaments: more galaxies where a noise field is high
    // as many per screen area on a phone as on a monitor
    const k = DENS * Math.min(1.3, (s / 194) ** 2) * (0.55 + 0.9 * clamp(0.5 + 0.7 * noise.fbm2(i * 0.31, j * 0.31, 3)))
    const n = Math.floor(k) + (r() < k - Math.floor(k) ? 1 : 0)
    for (let q = 0; q < n; q++) {
      const kind = r() < 0.55 ? 0 : r() < 0.4 ? 1 : 2
      list.push({ x: i + r(), y: j + r(), kind, size: 7 + r() * 8 + (kind === 2 ? r() * 2 : 0), rot: r() * TAU, q: 0.32 + r() * 0.62, born: 0.07 + r() * 0.08, err: gaussR(r) })
    }
    if (cells.size > 6000) cells.clear()
    cells.set(key, list)
    return list
  }
  // the three named galaxies: ours, a second observer, and the source of the light
  const CHI_AB = etaAt(1) - etaAt(A_EMIT)
  const YOU: Galaxy = { x: 0.02, y: 0.03, kind: 1, size: 15, rot: 0.6, q: 0.8, born: 0.06, err: 0 }
  const OTHER: Galaxy = { x: 1.12, y: -0.62, kind: 0, size: 13, rot: 2.1, q: 0.7, born: 0.07, err: 0 }
  const SOURCE: Galaxy = { x: -CHI_AB, y: 0.28, kind: 0, size: 14, rot: 1.2, q: 0.55, born: 0.07, err: 0 }
  const special = [YOU, OTHER, SOURCE]

  // glyph templates in unit coordinates: two spiral arms, a bar, or nested ellipses
  const SPIRAL: number[] = []
  for (let arm = 0; arm < 2; arm++) {
    for (let k = 0; k <= 22; k++) {
      const th = (k / 22) * Math.PI * 1.55
      const rr = 0.16 * Math.exp(0.376 * th)
      const an = th + arm * Math.PI
      SPIRAL.push(rr * Math.cos(an), rr * Math.sin(an))
    }
  }
  const SP_LEN = 23

  /* --------------------------------------------- the CMB pattern */
  // a Gaussian random field: a sum of plane waves with random directions and phases
  const NW = preview ? 70 : 140
  const WK = new Float32Array(NW * 2)
  const WP = new Float32Array(NW)
  const WA = new Float32Array(NW)
  {
    const r = rng(1965)
    for (let i = 0; i < NW; i++) {
      const an = r() * TAU
      // wavenumbers clustered round one scale (the acoustic peak), with a tail of larger modes
      const k = r() < 0.75 ? 1 + (r() - 0.5) * 0.5 : 0.25 + r() * 0.6
      WK[i * 2] = Math.cos(an) * k
      WK[i * 2 + 1] = Math.sin(an) * k
      WP[i] = r() * TAU
      WA[i] = (k < 0.9 ? 1.25 : 1) / Math.sqrt(NW / 2)
    }
  }
  let cmbKey = ''
  let cmbCanvas: HTMLCanvasElement | null = null
  /** The field as a printer’s halftone: warm dots where it is hotter, dark dots where cooler. */
  function buildCmb() {
    const dpr = Math.min(2, env.dpr || 1)
    const key = `${w}x${h}@${dpr}`
    if (key === cmbKey) return
    cmbKey = key
    if (typeof document === 'undefined') return
    const cv = cmbCanvas ?? document.createElement('canvas')
    cmbCanvas = cv
    cv.width = Math.max(1, Math.round(w * dpr))
    cv.height = Math.max(1, Math.round(h * dpr))
    const c2 = cv.getContext('2d')
    if (!c2) return
    c2.setTransform(dpr, 0, 0, dpr, 0, 0)
    c2.clearRect(0, 0, w, h)
    const g = preview ? 7 : 5
    const scale = TAU / clamp(Math.min(w, h) * 0.085, 24, 64)
    const hot = new Path2D()
    const cold = new Path2D()
    for (let y = g / 2; y < h; y += g)
      for (let x = g / 2 + ((Math.round(y / g) % 2) * g) / 2; x < w; x += g) {
        let v = 0
        const X = x * scale
        const Y = y * scale
        for (let q = 0; q < NW; q++) v += WA[q] * Math.cos(WK[q * 2] * X + WK[q * 2 + 1] * Y + WP[q])
        const r = g * 0.5 * clamp(0.1 + 0.34 * Math.abs(v), 0.08, 0.92)
        const path = v > 0 ? hot : cold
        path.moveTo(x + r, y)
        path.arc(x, y, r, 0, TAU)
      }
    c2.fillStyle = 'rgba(255,244,226,0.62)'
    c2.fill(hot)
    c2.fillStyle = 'rgba(52,24,10,0.5)'
    c2.fill(cold)
  }

  /* --------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let portrait = false
  let short = false
  let tiny = false
  let pad = 20
  let capSize = 28
  let capX = 0
  let capY = 0
  let s = 200 // px per Gpc of physical distance, for a ≥ A0
  let cx = 0
  let cy = 0
  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    short = h < 380
    tiny = h < 250
    pad = clamp(Math.min(w, h) * 0.045, short ? 12 : 16, 40)
    capSize = portrait ? clamp(Math.min(w * 0.072, h * 0.04), 18, 40) : clamp(Math.min(w * 0.04, h * 0.058), short ? 14 : 20, 46)
    if (preview) capSize = 16
    capX = pad * (portrait ? 1 : 1.4)
    capY = h - pad * (short ? 1.15 : 1.6) - capSize * 2.1 - (preview ? 0 : 10)
    s = portrait ? Math.min(w / 2 / 2.4, h / 2 / 3.6) : Math.min(w / 2 / 3.3, h / 2 / 2.3)
    cx = portrait ? w / 2 : w * 0.5
    cy = portrait ? h * 0.4 : h * 0.46
    cells.clear()
  }
  layout()

  /* ------------------------------------------------------ the clock */
  const atP = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? 26 : 0
  let prevT = -1
  let paused = false
  let interacted = false
  let aUser: number | null = null
  let lastChapter = 0
  let down: { x: number; y: number; ms: number; moved: boolean; ruler: boolean; la0: number } | null = null
  let touch = false
  let scrubX = -1
  let picked: { g: Galaxy; t0: number } | null = null
  let readoutBottom = 60
  let testTap: [number, number] | null = null
  {
    const tp = env.params.get('tap')?.split(',').map(Number)
    if (tp && tp.length === 2 && tp.every(Number.isFinite)) testTap = [tp[0], tp[1]]
    const ap = Number(env.params.get('a'))
    if (env.params.has('a') && Number.isFinite(ap) && ap > 0) aUser = clamp(ap, A_REC * 0.8, 1.6)
  }

  const rulerY = () => h - pad * 0.55
  const onRuler = (x: number, y: number) => !preview && !tiny && y > rulerY() - (touch ? 30 : 20) && y < h && x > pad - 8 && x < w - pad + 8
  const curT = () => (((prevT < 0 ? 0 : prevT) % LOOP) + LOOP) % LOOP
  function seekTo(target: number) {
    offset += target - curT()
    prevT = target
  }
  function seekX(x: number) {
    let target = clamp((x - pad) / (w - 2 * pad)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 1.6) target = c.t
    seekTo(Math.min(LOOP - 0.05, target))
  }
  const chapterAt = (T: number) => CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)

  /** the reference galaxy: ours, except for a while in chapter I */
  function refAt(T: number) {
    const u = smoothstep(7.6, 9.4, T) * (1 - smoothstep(14, 15.8, T))
    return { x: lerp(YOU.x, OTHER.x, ease.inOutSine(u)), y: lerp(YOU.y, OTHER.y, ease.inOutSine(u)), u }
  }
  /** screen px per Gpc of physical distance (the camera eases in for the early universe) */
  const sEff = (a: number) => s * Math.pow(Math.min(1, a / A0), -0.85)

  /* -------------------------------------------------------- drawing */
  function haloText(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    const lw = ctx.lineWidth
    const ss = ctx.strokeStyle
    setFont(ctx, o)
    const s2 = o?.upper ? str.toUpperCase() : str
    if (o?.font === 'serif') {
      ctx.lineWidth = 5
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(6,16,21,0.7)'
      ctx.strokeText(s2, x, y)
      ctx.lineJoin = 'miter'
    } else {
      const tw = ctx.measureText(s2).width
      const sz = o?.size ?? 11
      const x0 = o?.align === 'right' ? x - tw : o?.align === 'center' ? x - tw / 2 : x
      const fs = ctx.fillStyle
      ctx.fillStyle = 'rgba(6,16,21,0.78)'
      ctx.fillRect(x0 - 3, y - sz * 0.92, tw + 6, sz * 1.3)
      ctx.fillStyle = fs
    }
    text(ctx, str, x, y, o)
    ctx.lineWidth = lw
    ctx.strokeStyle = ss
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
        if (ln.s) haloText(ln.s, capX, y + dy, { font: 'serif', size: capSize, color: INK })
        if (ln.em) haloText(ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: ACC2 })
        ctx.restore()
      })
    }
  }

  /** append a galaxy's disk outline (spirals only) */
  function disk(g: Galaxy, X: number, Y: number, scale = 1) {
    const sz = g.size * scale
    const c = Math.cos(g.rot)
    const sn = Math.sin(g.rot)
    for (let k = 0; k <= 24; k++) {
      const an = (k / 24) * TAU
      const u = Math.cos(an) * 1.08
      const v = Math.sin(an) * 1.08
      const x = X + (u * c - v * g.q * sn) * sz
      const y = Y + (u * sn + v * g.q * c) * sz
      if (k === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  }

  /** append one galaxy glyph to the current path */
  function glyph(g: Galaxy, X: number, Y: number, scale = 1) {
    const sz = g.size * scale
    const c = Math.cos(g.rot)
    const sn = Math.sin(g.rot)
    const q = g.q
    const tx = (u: number, v: number) => X + (u * c - v * q * sn) * sz
    const ty = (u: number, v: number) => Y + (u * sn + v * q * c) * sz
    if (g.kind === 2) {
      for (const rr of [0.42, 1]) {
        for (let k = 0; k <= 20; k++) {
          const an = (k / 20) * TAU
          const u = Math.cos(an) * rr
          const v = Math.sin(an) * rr * 0.78
          if (k === 0) ctx.moveTo(tx(u, v), ty(u, v))
          else ctx.lineTo(tx(u, v), ty(u, v))
        }
      }
      return
    }
    // bulge
    for (let k = 0; k <= 12; k++) {
      const an = (k / 12) * TAU
      const u = Math.cos(an) * 0.17
      const v = Math.sin(an) * 0.17
      if (k === 0) ctx.moveTo(tx(u, v), ty(u, v))
      else ctx.lineTo(tx(u, v), ty(u, v))
    }
    if (g.kind === 1) {
      ctx.moveTo(tx(-0.42, 0), ty(-0.42, 0))
      ctx.lineTo(tx(0.42, 0), ty(0.42, 0))
    }
    for (let arm = 0; arm < 2; arm++) {
      const base = arm * SP_LEN * 2
      const off = g.kind === 1 ? 0.22 : 0
      for (let k = 0; k < SP_LEN; k++) {
        const u = SPIRAL[base + k * 2] + (arm === 0 ? off : -off)
        const v = SPIRAL[base + k * 2 + 1]
        if (k === 0) ctx.moveTo(tx(u, v), ty(u, v))
        else ctx.lineTo(tx(u, v), ty(u, v))
      }
    }
  }

  /** world (comoving Gpc) → screen, at scale factor a, about reference point (rx, ry) */
  let viewA = 1
  let viewRx = 0
  let viewRy = 0
  let viewS = 200
  const SX = (x: number) => cx + (x - viewRx) * viewA * viewS
  const SY = (y: number) => cy + (y - viewRy) * viewA * viewS

  function drawGrid(alpha: number) {
    if (alpha <= 0) return
    // comoving grid lines, at two spacings that fade so the mesh stays even on screen
    const unit = viewA * viewS
    const levels = [0.25, 0.5, 1, 2, 4, 8]
    ctx.lineWidth = 1
    for (const L of levels) {
      const px = L * unit
      const a = smoothstep(26, 60, px) * (1 - smoothstep(150, 260, px)) * alpha
      if (a <= 0.01) continue
      ctx.strokeStyle = rgba(INK, 0.1 * a)
      ctx.beginPath()
      const x0 = viewRx + (0 - cx) / unit
      const x1 = viewRx + (w - cx) / unit
      const y0 = viewRy + (0 - cy) / unit
      const y1 = viewRy + (h - cy) / unit
      for (let gx = Math.floor(x0 / L) * L; gx <= x1; gx += L) {
        const X = Math.round(SX(gx)) + 0.5
        ctx.moveTo(X, 0)
        ctx.lineTo(X, h)
      }
      for (let gy = Math.floor(y0 / L) * L; gy <= y1; gy += L) {
        const Y = Math.round(SY(gy)) + 0.5
        ctx.moveTo(0, Y)
        ctx.lineTo(w, Y)
      }
      ctx.stroke()
    }
  }

  /** visible galaxies this frame: [galaxy, screen x, screen y] */
  const vis: { g: Galaxy; x: number; y: number }[] = []
  function collectGalaxies() {
    vis.length = 0
    const unit = viewA * viewS
    const m = 30 / unit
    const x0 = Math.floor(viewRx + (0 - cx) / unit - m)
    const x1 = Math.floor(viewRx + (w - cx) / unit + m)
    const y0 = Math.floor(viewRy + (0 - cy) / unit - m)
    const y1 = Math.floor(viewRy + (h - cy) / unit + m)
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 2400) return
    for (let i = x0; i <= x1; i++)
      for (let j = y0; j <= y1; j++)
        for (const g of cell(i, j)) {
          // keep the named galaxies' neighbourhoods clear
          let clear = true
          for (const sg of special) if (Math.hypot(g.x - sg.x, g.y - sg.y) < 0.32) clear = false
          if (!clear) continue
          vis.push({ g, x: SX(g.x), y: SY(g.y) })
        }
    for (const g of special) vis.push({ g, x: SX(g.x), y: SY(g.y) })
  }

  function drawGalaxies(a: number, alpha: number) {
    if (alpha <= 0.01) return
    const glyphScale = clamp(viewS / 210, 0.62, 1.25)
    // spirals bluer (young stars), ellipticals warmer (old ones); disks as a faint outline
    const cols = [rgba(css(blackbody(9500)), 0.8 * alpha), rgba(css(blackbody(9500)), 0.22 * alpha), rgba(css(blackbody(4400)), 0.72 * alpha)]
    for (let pass = 0; pass < 3; pass++) {
      ctx.strokeStyle = cols[pass]
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const v of vis) {
        if ((v.g.kind === 2) !== (pass === 2)) continue
        const born = smoothstep(v.g.born, v.g.born + 0.05, a)
        if (born <= 0) continue
        if (v.x < -20 || v.x > w + 20 || v.y < -20 || v.y > h + 20) continue
        if (pass === 1) disk(v.g, v.x, v.y, glyphScale * (0.4 + 0.6 * born))
        else glyph(v.g, v.x, v.y, glyphScale * (0.4 + 0.6 * born))
      }
      ctx.stroke()
    }
  }

  function arrow(x0: number, y0: number, x1: number, y1: number) {
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    const an = Math.atan2(y1 - y0, x1 - x0)
    const L = Math.min(5, Math.hypot(x1 - x0, y1 - y0) * 0.4)
    ctx.moveTo(x1 + Math.cos(an + 2.6) * L, y1 + Math.sin(an + 2.6) * L)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x1 + Math.cos(an - 2.6) * L, y1 + Math.sin(an - 2.6) * L)
  }

  /** chapter I: the Hubble flow seen from the reference galaxy */
  function drawFlow(alpha: number) {
    if (alpha <= 0.01) return
    const k = 0.13
    const fadeR = Math.min(w, h) * 0.5
    const rx = SX(viewRx)
    const ry = SY(viewRy)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    for (let band = 0; band < 3; band++) {
      ctx.strokeStyle = rgba(ACC, [0.75, 0.45, 0.2][band])
      ctx.beginPath()
      for (const v of vis) {
        if (v.x < 0 || v.x > w || v.y < 0 || v.y > h) continue
        const dx = v.x - rx
        const dy = v.y - ry
        const d = Math.hypot(dx, dy)
        if (d < 24) continue
        const b = d < fadeR * 0.6 ? 0 : d < fadeR ? 1 : 2
        if (b !== band) continue
        const off = Math.min(12, v.g.size * 1.1) / d
        arrow(v.x + dx * off, v.y + dy * off, v.x + dx * (off + k), v.y + dy * (off + k))
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  function marker(x: number, y: number, label: string, col: string, r = 15, below = false) {
    ctx.strokeStyle = rgba(col, 0.9)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    if (label) {
      setFont(ctx, { size: 8.5, tracking: 0.14 })
      const tw = ctx.measureText(label).width
      const lx = clamp(x, pad + tw / 2 + 4, w - pad - tw / 2 - 4)
      haloText(label, lx, below ? y + r + 13 : y - r - 7, { size: 8.5, color: col, align: 'center', tracking: 0.14 })
    }
  }

  /** chapter II: a wave packet from the source galaxy to ours */
  function drawWave(a: number, alpha: number) {
    if (alpha <= 0.01) return
    const sx = SX(SOURCE.x)
    const sy = SY(SOURCE.y)
    const yx = SX(YOU.x)
    const yy = SY(YOU.y)
    // the comoving distance the light has covered since it left
    const chi = a > A_EMIT ? etaAt(a) - etaAt(A_EMIT) : 0
    const f = clamp(chi / CHI_AB)
    const px = lerp(sx, yx, f)
    const py = lerp(sy, yy, f)
    const lam = (LAMBDA0 * a) / A_EMIT
    const ux = (yx - sx) / (Math.hypot(yx - sx, yy - sy) || 1)
    const uy = (yy - sy) / (Math.hypot(yx - sx, yy - sy) || 1)
    ctx.save()
    ctx.globalAlpha = alpha
    // the path
    ctx.strokeStyle = rgba(INK, 0.25)
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(sx + ux * 16, sy + uy * 16)
    ctx.lineTo(yx - ux * 16, yy - uy * 16)
    ctx.stroke()
    ctx.setLineDash([])
    if (a >= A_EMIT - 0.002) {
      // the packet: wavelength on screen ∝ λ, in the colour of λ
      const lpx = (lam / LAMBDA0) * clamp(Math.min(w, h) * 0.018, 7, 14)
      const half = lpx * 4.4
      const amp = clamp(Math.min(w, h) * 0.022, 7, 17)
      const col = css(spectral(lam))
      ctx.strokeStyle = col
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let k = -40; k <= 40; k++) {
        const u = (k / 40) * half
        const env2 = Math.exp(-((u / (half * 0.62)) ** 2))
        const ph = (u / lpx) * TAU
        const off = Math.sin(ph) * amp * env2
        const X = px - ux * half * 0.5 + ux * u - uy * off
        const Y = py - uy * half * 0.5 + uy * u + ux * off
        if (k === -40) ctx.moveTo(X, Y)
        else ctx.lineTo(X, Y)
      }
      ctx.stroke()
      // its wavelength, dimensioned between two crests
      if (!tiny && !preview) {
        const c0 = px - ux * half * 0.5 + ux * (lpx * 0.25)
        const c0y = py - uy * half * 0.5 + uy * (lpx * 0.25)
        ctx.strokeStyle = rgba(INK, 0.6)
        ctx.lineWidth = 1
        ctx.beginPath()
        const by = -amp - 7
        ctx.moveTo(c0 - uy * by, c0y + ux * by)
        ctx.lineTo(c0 + ux * lpx - uy * by, c0y + uy * lpx + ux * by)
        ctx.stroke()
        haloText(`λ = ${Math.round(lam)} NM · z = ${(a / A_EMIT - 1).toFixed(2)}`, c0 + ux * lpx * 0.5 - uy * (by - 11), c0y + uy * lpx * 0.5 + ux * (by - 11), { size: 9, color: col, align: 'center', tracking: 0.1 })
      }
    }
    ctx.restore()
  }

  /** a printer’s colour bar of the visible spectrum, with the wave’s wavelength on it */
  function drawSpectrum(lam: number, alpha: number, x: number, y: number, bw: number) {
    if (alpha <= 0.01) return
    ctx.save()
    ctx.globalAlpha = alpha
    const n = Math.max(30, Math.floor(bw / 3))
    for (let k = 0; k < n; k++) {
      const nm = 380 + (370 * (k + 0.5)) / n
      ctx.fillStyle = css(spectral(nm))
      ctx.fillRect(x + (bw * k) / n, y, bw / n + 0.6, 6)
    }
    ctx.strokeStyle = rgba(INK, 0.4)
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, bw, 6)
    ctx.beginPath()
    for (const nm of [400, 500, 600, 700]) {
      const X = x + ((nm - 380) / 370) * bw
      ctx.moveTo(X, y + 7)
      ctx.lineTo(X, y + 10)
      text(ctx, String(nm), X, y + 19, { size: 7.5, color: MUTED, align: 'center' })
    }
    ctx.stroke()
    // emitted and observed
    const xe = x + ((LAMBDA0 - 380) / 370) * bw
    const xo = x + ((clamp(lam, 380, 750) - 380) / 370) * bw
    ctx.strokeStyle = rgba(INK, 0.45)
    ctx.beginPath()
    ctx.moveTo(xe, y - 3)
    ctx.lineTo(xe, y + 9)
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(xo, y - 6)
    ctx.lineTo(xo, y + 10)
    ctx.stroke()
    ctx.lineWidth = 1
    text(ctx, 'EMITTED', xe, y - 6, { size: 7.5, color: MUTED, align: 'center', tracking: 0.12 })
    if (Math.abs(xo - xe) > 34) text(ctx, 'NOW', xo, y - 9, { size: 7.5, color: INK, align: 'center', tracking: 0.12 })
    ctx.restore()
  }

  /** chapter III: the Hubble diagram, assembled from the galaxies on screen */
  function hubblePanel() {
    if (portrait) return { x0: pad + 44, x1: w - pad * 1.2, y0: h * 0.52, y1: capY - capSize * 0.9 - 28 }
    if (short) return { x0: w * 0.56, x1: w - pad * 1.2, y0: Math.max(readoutBottom + 18, pad * 2.6 + 20), y1: h - pad * 2.6 }
    return { x0: w * 0.58, x1: w - pad * 1.6, y0: Math.max(readoutBottom + 34, h * 0.2), y1: h * 0.7 }
  }
  function drawHubble(T: number, a: number, alpha: number) {
    if (alpha <= 0.01) return
    const P = hubblePanel()
    const pw = P.x1 - P.x0
    const ph = P.y1 - P.y0
    if (pw < 120 || ph < 70) return
    const dMax = 4.6 // Gpc
    const Hn = H0 * E(a)
    const vMax = 330000
    const X = (d: number) => P.x0 + (d / dMax) * pw
    const Y = (v: number) => P.y1 - (v / vMax) * ph
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(6,16,21,0.82)'
    ctx.fillRect(P.x0 - 44, P.y0 - 26, pw + 56, ph + 52)
    ctx.strokeStyle = rgba(INK, 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(P.x0, P.y0)
    ctx.lineTo(P.x0, P.y1)
    ctx.lineTo(P.x1, P.y1)
    ctx.stroke()
    // ticks
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.beginPath()
    for (let d = 1; d <= 4; d++) {
      ctx.moveTo(X(d), P.y1)
      ctx.lineTo(X(d), P.y1 + 4)
    }
    for (let v = 100000; v <= 300000; v += 100000) {
      ctx.moveTo(P.x0, Y(v))
      ctx.lineTo(P.x0 - 4, Y(v))
    }
    ctx.stroke()
    for (let d = 1; d <= 4; d++) text(ctx, `${d}`, X(d), P.y1 + 14, { size: 8, color: MUTED, align: 'center' })
    text(ctx, short ? 'GPC' : 'DISTANCE · GPC', P.x1, P.y1 + 14 + (short ? 0 : 11), { size: 8, color: MUTED, align: 'right', tracking: 0.12 })
    for (let v = 100000; v <= 300000; v += 100000) text(ctx, `${v / 1000}K`, P.x0 - 7, Y(v) + 3, { size: 8, color: MUTED, align: 'right' })
    text(ctx, 'KM / S', P.x0 - 7, P.y0 - 10, { size: 8, color: MUTED, align: 'right', tracking: 0.12 })
    // the speed of light, and the Hubble radius where recession reaches it
    ctx.strokeStyle = rgba(ACC, 0.5)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(P.x0, Y(CKMS))
    ctx.lineTo(P.x1, Y(CKMS))
    const dh = CKMS / Hn / 1000
    if (dh < dMax) {
      ctx.moveTo(X(dh), P.y1)
      ctx.lineTo(X(dh), Y(CKMS))
    }
    ctx.stroke()
    ctx.setLineDash([])
    if (!short) text(ctx, 'SPEED OF LIGHT', P.x0 + 6, Y(CKMS) - 5, { size: 8, color: ACC, tracking: 0.12 })
    // the law
    const lineU = smoothstep(37.5, 41.5, T)
    const dEnd = Math.min(dMax, vMax / (Hn * 1000))
    ctx.strokeStyle = ACC2
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(X(0), Y(0))
    ctx.lineTo(X(dEnd * lineU), Y(Hn * 1000 * dEnd * lineU))
    ctx.stroke()
    ctx.lineWidth = 1
    if (lineU > 0.6) {
      ctx.globalAlpha = alpha * smoothstep(0.6, 1, lineU)
      const lab = `v = H d · H = ${Hn.toFixed(0)} KM/S/MPC`
      haloText(short ? `H = ${Hn.toFixed(0)}` : lab, X(dEnd * 0.42) - 8, Y(Hn * 1000 * dEnd * 0.42) - 12, { size: 9, color: ACC2, align: 'right', tracking: 0.1 })
      if (!short && ph > 160) text(ctx, 'DISTANCES ± 7%, AS FROM STANDARD CANDLES', P.x1, P.y1 - 8, { size: 7.5, color: MUTED, align: 'right', tracking: 0.12 })
      ctx.globalAlpha = alpha
    }
    // the points, each flying in from its galaxy, nearest first
    const pts = vis.filter((v) => v.x > 0 && v.x < w && v.y > 0 && v.y < h && v.g !== YOU)
    ctx.fillStyle = INK
    for (const v of pts) {
      const d = (Math.hypot(v.g.x - YOU.x, v.g.y - YOU.y) * a) // proper distance, Gpc
      if (d > dMax) continue
      const vel = Hn * 1000 * d
      const t0 = 35 + (d / dMax) * 5.5
      const u = ease.inOutCubic(clamp((T - t0) / 1.1))
      if (u <= 0) continue
      // a measured distance carries an error, as from a standard candle (≈ 7%)
      const tx = X(clamp(d * (1 + 0.07 * v.g.err), 0, dMax))
      const ty = Y(vel)
      const x = lerp(v.x, tx, u)
      const y = lerp(v.y, ty, u)
      if (u < 1) {
        ctx.strokeStyle = rgba(INK, 0.18 * (1 - u))
        ctx.beginPath()
        ctx.moveTo(v.x, v.y)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 1.8, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  function chrome(T: number, readouts: [string, string][]) {
    const small = preview || Math.min(w, h) < 420
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(INK, 0.4)
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, small ? 7 : 10)
    const hy = pad + (small ? 5 : 8)
    const hs = small ? 8.5 : 10
    ctx.strokeStyle = ACC
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    haloText(FIG, pad + 26, hy, { size: hs, color: ACC, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const fw = ctx.measureText(FIG).width
    haloText(w < 620 || small ? 'REDSHIFT' : 'REDSHIFT · AN EXPANDING UNIVERSE', pad + 26 + fw + hs * 0.9, hy, { size: hs, color: MUTED, tracking: 0.14 })
    const ch = chapterAt(T)
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (1 - smoothstep(LOOP - 1.2, LOOP - 0.2, T))
    if (!tiny && kIn > 0.01) {
      ctx.save()
      ctx.globalAlpha = kIn
      haloText(`${c.num} — ${c.name}`, capX, capY - (small ? 4 : 8), { size: small ? 9 : 10.5, color: INK2, tracking: 0.16, upper: true })
      ctx.restore()
    }
    let y = hy
    const rs = small ? 9 : 10.5
    const maxR = tiny ? 2 : short || portrait ? 4 : 6
    for (const [label, value] of readouts.slice(0, maxR)) {
      setFont(ctx, { size: rs, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      haloText(value, w - pad, y, { size: rs, color: INK, align: 'right', tracking: 0.06 })
      haloText(label, w - pad - vw - 10, y, { size: small ? 8.5 : 9.5, color: MUTED, align: 'right', tracking: 0.14, upper: true })
      y += small ? 14 : 17
    }
    readoutBottom = y
    if (preview || tiny) return
    const x0 = pad
    const x1 = w - pad
    const yb = rulerY()
    ctx.strokeStyle = RULE
    ctx.beginPath()
    ctx.moveTo(x0, yb)
    ctx.lineTo(x1, yb)
    for (let i = 0; i <= 43; i++) {
      const x = lerp(x0, x1, i / 43)
      ctx.moveTo(x, yb)
      ctx.lineTo(x, yb - (i % 2 === 0 ? 4 : 2))
    }
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.beginPath()
    const xp = lerp(x0, x1, T / LOOP)
    ctx.moveTo(xp, yb + 3)
    ctx.lineTo(xp, yb - 8)
    ctx.stroke()
    if (w > 360) CHAPTERS.forEach((cc, i) => text(ctx, cc.num, lerp(x0, x1, cc.t / LOOP) + 4, yb - 7, { size: 8.5, color: i === ch ? INK : MUTED, tracking: 0.1 }))
    if (scrubX >= 0) {
      const hx = clamp(scrubX, x0, x1)
      const ht = ((hx - x0) / (x1 - x0)) * LOOP
      ctx.strokeStyle = ACC
      ctx.beginPath()
      ctx.moveTo(hx, yb + 3)
      ctx.lineTo(hx, yb - 12)
      ctx.stroke()
      text(ctx, `${CHAPTERS[chapterAt(ht)].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: ACC, align: 'center', tracking: 0.12 })
    }
    if (paused) text(ctx, 'PAUSED · SPACE', w - pad, yb - 9, { size: 8.5, color: INK2, align: 'right', tracking: 0.14 })
  }

  /** the cosmic microwave background as we see it now: the same pattern on an all-sky oval */
  function skyMap(alpha: number) {
    buildCmb()
    if (!cmbCanvas) return
    const mw = portrait ? w - pad * 3 : short ? Math.min(w * 0.36, 300) : Math.min(w * 0.34, 440)
    const mh = mw / 2
    const mx = portrait ? w / 2 : w - pad * 1.6 - mw / 2
    const my = portrait ? Math.max(h * 0.27, readoutBottom + 44 + mh / 2) : Math.max(readoutBottom + 44 + mh / 2, short ? 0 : h * 0.42)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(6,16,21,0.86)'
    ctx.fillRect(mx - mw / 2 - 14, my - mh / 2 - 26, mw + 28, mh + 52)
    ctx.beginPath()
    ctx.ellipse(mx, my, mw / 2, mh / 2, 0, 0, TAU)
    ctx.save()
    ctx.clip()
    ctx.fillStyle = css(blackbody(2600), 0.9)
    ctx.fillRect(mx - mw / 2, my - mh / 2, mw, mh)
    const sw = Math.min(w, mw * 1.6)
    ctx.drawImage(cmbCanvas, 0, 0, cmbCanvas.width * (sw / w), cmbCanvas.height * ((sw / 2) / h), mx - mw / 2, my - mh / 2, mw, mh)
    ctx.restore()
    // graticule: Mollweide meridians and parallels
    ctx.strokeStyle = rgba(INK, 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(mx, my, mw / 2, mh / 2, 0, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(INK, 0.18)
    ctx.beginPath()
    for (const k of [1 / 3, 2 / 3]) {
      ctx.ellipse(mx, my, (mw / 2) * k, mh / 2, 0, 0, TAU)
    }
    ctx.moveTo(mx, my - mh / 2)
    ctx.lineTo(mx, my + mh / 2)
    for (const lat of [-60, -30, 0, 30, 60]) {
      // Mollweide: y = sin θ, x half-width = cos θ, with 2θ + sin 2θ = π sin φ
      let th = (lat * Math.PI) / 180
      for (let it = 0; it < 6; it++) th -= (2 * th + Math.sin(2 * th) - Math.PI * Math.sin((lat * Math.PI) / 180)) / (2 + 2 * Math.cos(2 * th) || 1)
      const yy = my - (mh / 2) * Math.sin(th)
      const xx = (mw / 2) * Math.cos(th)
      ctx.moveTo(mx - xx, yy)
      ctx.lineTo(mx + xx, yy)
    }
    ctx.stroke()
    haloText(short ? 'THE SAME LIGHT, TODAY' : 'THE SAME LIGHT TODAY · 2.725 K · ± 0.0002 K', mx, my - mh / 2 - 9, { size: 8.5, color: INK, align: 'center', tracking: 0.14 })
    if (!short) haloText('ALL SKY · FALSE COLOUR · A SIMULATED PATTERN', mx, my + mh / 2 + 17, { size: 8, color: MUTED, align: 'center', tracking: 0.14 })
    ctx.restore()
  }

  /** a scale bar of physical distance, bottom right */
  function scaleBar() {
    if (tiny || preview) return
    const pxPerGly = viewS / 3.2616 // 1 Gpc = 3.2616 Gly
    const target = Math.min(w, h) * 0.16
    const nice = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
    let L = nice[0]
    for (const n of nice) if (n * pxPerGly <= target) L = n
    const bw = L * pxPerGly
    const x1 = w - pad * 1.2
    const x0 = x1 - bw
    const y = rulerY() - (short ? 16 : 22)
    ctx.strokeStyle = rgba(INK, 0.6)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    ctx.moveTo(x0, y - 4)
    ctx.lineTo(x0, y + 1)
    ctx.moveTo(x1, y - 4)
    ctx.lineTo(x1, y + 1)
    ctx.stroke()
    const lab = L >= 1 ? `${L} BILLION LY` : `${Math.round(L * 1000)} MILLION LY`
    text(ctx, lab, x1, y - 7, { size: 8, color: MUTED, align: 'right', tracking: 0.12 })
  }

  function hints(T: number, first: boolean) {
    if (preview || tiny) return
    const yH = readoutBottom + 4
    const narrow = touch || w < 700
    if (!interacted && first && T > 2.5 && T < 9) {
      const a = smoothstep(2.5, 3.3, T) * (1 - smoothstep(8.2, 9, T))
      const gy = Math.min(h - pad * 3.6, cy + Math.min(h, w) * 0.3)
      const gx0 = w * 0.5 - 60
      const u = (((T - 3) % 2.4) + 2.4) % 2.4 / 2.4
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(ACC, 0.55)
      ctx.setLineDash([1.5, 4])
      ctx.beginPath()
      ctx.moveTo(gx0, gy)
      ctx.lineTo(gx0 + 120, gy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = ACC
      ctx.beginPath()
      ctx.arc(gx0 + 120 * ease.inOutSine(u < 0.5 ? u * 2 : 2 - u * 2), gy, 3, 0, TAU)
      ctx.fill()
      haloText(narrow ? 'DRAG ← → THROUGH TIME · TAP A GALAXY' : 'DRAG LEFT OR RIGHT TO RUN COSMIC TIME · TAP A GALAXY', w * 0.5, gy - 12, { size: 8.5, color: ACC, align: 'center', tracking: 0.14 })
      ctx.restore()
      return
    }
    if (T > 9) {
      ctx.save()
      ctx.globalAlpha = 0.85
      haloText(aUser !== null ? (narrow ? 'YOUR TIME · TAP A GALAXY' : 'YOUR COSMIC TIME · TAP A GALAXY · ← → CHAPTERS') : narrow ? 'DRAG ← → THROUGH TIME' : 'DRAG ← → THROUGH COSMIC TIME · TAP A GALAXY', w - pad, yH + 8, { size: 8.5, color: MUTED, align: 'right', tracking: 0.14 })
      ctx.restore()
    }
  }

  /** a tapped galaxy: its distance, redshift and the age of its light, as seen from ours now */
  function drawPicked(T: number, a: number) {
    if (!picked) return
    const age = T - picked.t0
    if (age < 0 || age > 7) {
      picked = null
      return
    }
    const g = picked.g
    const X = SX(g.x)
    const Y = SY(g.y)
    if (X < -10 || X > w + 10 || Y < -10 || Y > h + 10) return
    const al = smoothstep(0, 0.25, age) * (1 - smoothstep(6, 7, age))
    const chi = Math.hypot(g.x - YOU.x, g.y - YOU.y)
    const d = chi * a
    const aE = aEmitFor(chi, a)
    const z = aE > 0 ? a / aE - 1 : Infinity
    const v = H0 * E(a) * d * 1000
    const look = ageAt(a) - ageAt(Math.max(aE, 1e-5))
    const lines = g === YOU ? ['THE MILKY WAY · YOU ARE HERE'] : [
      `DISTANCE NOW ${(d * 3.2616).toFixed(2)} BILLION LY`,
      aE > 0 ? `REDSHIFT z = ${z.toFixed(z < 1 ? 3 : 2)}` : 'ITS LIGHT HAS NOT REACHED US YET',
      `RECEDING AT ${Math.round(v).toLocaleString('en-US')} KM/S`,
      ...(aE > 0 ? [`ITS LIGHT LEFT ${look.toFixed(2)} BILLION YEARS AGO`] : []),
    ]
    ctx.save()
    ctx.globalAlpha = al
    marker(X, Y, '', INK, 12)
    setFont(ctx, { size: 9, tracking: 0.12 })
    const tw = Math.max(...lines.map((l) => ctx.measureText(l).width))
    const right = X + 22 + tw < w - pad
    const bx = right ? X + 20 : X - 20 - tw
    let by = clamp(Y - 10 - lines.length * 7, pad * 2.6, h - pad * 3 - lines.length * 14)
    for (const l of lines) {
      haloText(l, bx, by, { size: 9, color: INK, tracking: 0.12 })
      by += 14
    }
    // Hα, shifted
    if (aE > 0 && g !== YOU) {
      const lam = 656.3 * (1 + z)
      const col = lam <= 750 ? css(spectral(lam)) : MUTED
      ctx.fillStyle = col
      ctx.fillRect(bx, by - 7, 10, 7)
      haloText(lam <= 750 ? `Hα 656 → ${Math.round(lam)} NM` : `Hα 656 → ${(lam / 1000).toFixed(2)} µM · INFRARED`, bx + 15, by, { size: 8.5, color: col, tracking: 0.1 })
    }
    ctx.restore()
  }

  function pick(x: number, y: number) {
    let best: Galaxy | null = null
    let bd = (touch ? 30 : 22) ** 2
    for (const v of vis) {
      const d = (v.x - x) ** 2 + (v.y - y) ** 2
      if (d < bd) {
        bd = d
        best = v.g
      }
    }
    if (best) {
      picked = { g: best, t0: curT() }
      env.sfx.tone(520, 1, { type: 'sine', gain: 0.04, room: 0.5, to: 520 / (1 + Math.min(3, Math.hypot(best.x, best.y) * 0.3)) })
    }
  }

  /* -------------------------------------------------------- sound */
  const sfx = env.sfx
  let hum: { o: OscillatorNode; g: GainNode } | null = null
  function humSet(level: number, freq: number) {
    const ac = sfx.context()
    const out = sfx.output()
    if (!ac || !out) {
      if (hum) {
        try {
          hum.o.stop()
        } catch {
          /* stopped */
        }
        hum = null
      }
      return
    }
    if (!hum) {
      const g = ac.createGain()
      g.gain.value = 0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const o = ac.createOscillator()
      o.type = 'sine'
      o.connect(g)
      g.connect(lp)
      lp.connect(out)
      o.start()
      hum = { o, g }
    }
    hum.o.frequency.setTargetAtTime(freq, ac.currentTime, 0.2)
    hum.g.gain.setTargetAtTime(level * 0.05, ac.currentTime, 0.4)
  }

  return {
    resize() {
      layout()
    },
    pointer(p: PointerInfo) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        scrubX = -1
        down = null
        env.setCursor('default')
        return
      }
      const ruler = onRuler(p.x, p.y)
      if (p.type === 'down') {
        interacted = true
        down = { x: p.x, y: p.y, ms: performance.now(), moved: false, ruler, la0: Math.log(aUser ?? aAuto(curT())) }
        if (ruler) {
          scrubX = p.x
          seekX(p.x)
        }
        return
      }
      if (p.type === 'move') {
        if (down && p.pressed) {
          if (down.ruler) {
            scrubX = p.x
            seekX(p.x)
            return
          }
          if (Math.hypot(p.x - down.x, p.y - down.y) > (touch ? 10 : 6)) down.moved = true
          if (down.moved) {
            // a full width of drag runs from the oldest light to well after today
            const la = down.la0 + ((p.x - down.x) / w) * (Math.log(1.5) - Math.log(A_REC)) * 0.9
            aUser = Math.exp(clamp(la, Math.log(A_REC), Math.log(1.5)))
          }
        } else scrubX = ruler ? p.x : -1
        env.setCursor(ruler ? 'pointer' : down?.moved ? 'grabbing' : 'ew-resize')
        return
      }
      if (p.type === 'up') {
        if (down && !down.ruler && !down.moved && performance.now() - down.ms < 350) pick(p.x, p.y)
        if (down?.ruler) scrubX = -1
        down = null
      }
    },
    key(code, isDown) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (!isDown) return true
        interacted = true
        const T = curT()
        if (code === 'ArrowRight') {
          const next = CHAPTERS.find((c) => c.t > T + 0.01)
          seekTo(next ? next.t : 0)
        } else {
          const i = chapterAt(T)
          seekTo(T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t)
        }
        return true
      }
      if (code === 'Space') {
        if (isDown) paused = !paused
        return true
      }
      return false
    },
    destroy() {
      if (hum) {
        try {
          hum.o.stop()
        } catch {
          /* stopped */
        }
        hum = null
      }
    },
    frame(t, dt) {
      if (paused && dt > 0) offset -= dt
      const T = (((t + offset) % LOOP) + LOOP) % LOOP
      const first = t + offset < LOOP
      const ch = chapterAt(T)
      if (prevT < 0) lastChapter = ch
      if (prevT >= 0 && T < prevT - 1) {
        aUser = null
        picked = null
      }
      if (ch !== lastChapter) {
        aUser = null
        lastChapter = ch
      }
      const a = aUser ?? aAuto(T)
      const ref = refAt(T)
      // make room for the Hubble diagram: ours slides left (or up, on a tall screen)
      const hubA = ch === 2 ? smoothstep(34.4, 35.4, T) * (1 - smoothstep(49.2, 50, T)) : 0
      const room = ease.inOutCubic(ch === 2 ? smoothstep(34, 35.6, T) * (1 - smoothstep(48.8, 50.4, T)) : 0)
      cx = portrait ? w / 2 : lerp(w * 0.5, w * 0.27, room)
      cy = portrait ? lerp(h * 0.4, h * 0.28, room) : h * 0.46
      viewA = a
      viewRx = ref.x
      viewRy = ref.y
      viewS = sEff(a)
      collectGalaxies()
      if (testTap && prevT >= 0) {
        pick(testTap[0], testTap[1])
        interacted = true
        testTap = null
      }

      // the sky: the temperature of the light everywhere, a(t) after the release
      const Tk = T_CMB / a
      ground(ctx, w, h, 'night')
      ctx.fillStyle = 'rgba(3,9,12,0.42)'
      ctx.fillRect(0, 0, w, h)
      const glow = smoothstep(700, 2600, Tk)
      if (glow > 0) {
        ctx.fillStyle = css(blackbody(Math.min(Tk, 3200)), 0.72 * glow)
        ctx.fillRect(0, 0, w, h)
      }
      // the oldest light: a field of temperature differences, released at a = 1/1091
      const cmbA = ch === 3 ? smoothstep(2100, 2950, Tk) : ch === 4 ? 1 - smoothstep(Math.log(A_REC), Math.log(0.02), Math.log(a)) : 0
      if (cmbA > 0.01) {
        buildCmb()
        if (cmbCanvas) {
          ctx.save()
          ctx.globalAlpha = cmbA
          ctx.drawImage(cmbCanvas, 0, 0, w, h)
          ctx.restore()
        }
      }

      const galA = smoothstep(0.06, 0.14, a)
      drawGrid(1 - 0.6 * glow)
      drawGalaxies(a, galA)
      // chapter overlays
      const flowA = ch === 0 && aUser === null ? smoothstep(2, 3.4, T) * (1 - smoothstep(16, 17, T)) : ch === 0 ? 1 : 0
      drawFlow(flowA)
      const waveA = ch === 1 ? smoothstep(17, 18, T) * (1 - smoothstep(33.4, 34.2, T)) : 0
      drawWave(a, waveA)
      // the observers
      if (galA > 0.2 && !tiny) {
        ctx.save()
        ctx.globalAlpha = galA
        const yx = SX(YOU.x)
        const yy = SY(YOU.y)
        marker(yx, yy, ch === 0 && ref.u > 0.5 ? 'US' : 'YOU ARE HERE', ACC, 17, portrait)
        if (ch === 0 && T > 7 && T < 16.5) {
          const a2 = smoothstep(7, 8, T) * (1 - smoothstep(15.6, 16.5, T))
          ctx.globalAlpha = galA * a2
          marker(SX(OTHER.x), SY(OTHER.y), ref.u > 0.5 ? 'OR FROM HERE: THE SAME' : 'ANOTHER GALAXY', ACC2, 15)
        }
        if (ch === 1) {
          ctx.globalAlpha = galA * waveA
          marker(SX(SOURCE.x), SY(SOURCE.y), short ? 'SOURCE' : 'A DISTANT GALAXY', ACC2, 15, true)
        }
        ctx.restore()
      }
      drawHubble(T, a, hubA)
      drawPicked(T, a)
      captionAt(T)

      // readouts
      const z = 1 / a - 1
      const age = ageAt(a)
      const Hn = H0 * E(a)
      const readouts: [string, string][] = [
        ['Cosmic time', age < 0.001 ? `${(Math.round(age * 1e6) * 1000).toLocaleString('en-US')} YR` : age < 1 ? `${(age * 1000).toFixed(0)} MYR` : `${age.toFixed(2)} GYR`],
        ['Scale factor', `a = ${a < 0.01 ? a.toExponential(2) : a.toFixed(3)}`],
        ['Redshift', `z = ${z < 10 ? z.toFixed(2) : Math.round(z).toLocaleString('en-US')}`],
        ['Light now', `${Tk < 100 ? Tk.toFixed(2) : Math.round(Tk).toLocaleString('en-US')} K`],
        ['Hubble rate', `${Hn < 1000 ? Hn.toFixed(1) : Math.round(Hn).toLocaleString('en-US')} KM/S/MPC`],
      ]
      if (ch === 1) readouts.splice(3, 0, ['Wavelength', a >= A_EMIT ? `${Math.round((LAMBDA0 * a) / A_EMIT)} NM` : `${LAMBDA0} NM`])
      chrome(T, readouts)
      if (ch === 1 && !tiny) {
        const bw = clamp(w * 0.18, 120, 210)
        const sy2 = readoutBottom + 18
        drawSpectrum(a >= A_EMIT ? (LAMBDA0 * a) / A_EMIT : LAMBDA0, waveA, w - pad - bw, sy2, bw)
        readoutBottom = sy2 + 26
      }
      if ((ch === 3 || ch === 4) && !tiny && !preview) {
        // one label at a time, saying what era this is
        const ly = portrait ? h * 0.16 : h * 0.2
        const peak = 2.897771955e6 / Tk // nm
        const pk = peak < 1000 ? `${Math.round(peak)} NM` : peak < 1e6 ? `${(peak / 1000).toFixed(peak < 1e4 ? 2 : 1)} µM` : `${(peak / 1e6).toFixed(2)} MM`
        let l1 = ''
        let l2 = ''
        let la = 0
        if (glow > 0.05) {
          la = glow
          l1 = a < A_REC * 1.3 ? (short ? 'THE LIGHT IS RELEASED · z = 1,090' : 'THE UNIVERSE BECOMES TRANSPARENT · z = 1,090 · 380,000 YEARS') : short ? 'HOT, DENSE, GLOWING' : 'HOT, DENSE, GLOWING LIKE THE SURFACE OF A STAR'
          if (!short) l2 = cmbA > 0.3 && ch === 3 ? 'ΔT / T ≈ 10⁻⁵ · THE DOTS EXAGGERATE IT ABOUT 10,000×' : ch === 4 ? `PEAK WAVELENGTH ${pk} · STRETCHING TO 1.06 MM TODAY` : ''
        } else if (a < 0.065 && a > 0.004) {
          la = smoothstep(0.004, 0.006, a) * (1 - smoothstep(0.05, 0.065, a))
          l1 = short ? 'THE DARK AGES' : 'THE DARK AGES · NO STARS YET'
          if (!short) l2 = `THE LEFTOVER GLOW HAS COOLED TO ${Math.round(Tk)} K, INFRARED`
        } else if (a >= 0.065 && a < 0.16) {
          la = smoothstep(0.065, 0.08, a) * (1 - smoothstep(0.13, 0.16, a))
          l1 = short ? 'THE FIRST GALAXIES' : 'THE FIRST GALAXIES · z ≈ 10'
        }
        if (la > 0.01 && l1) {
          ctx.save()
          ctx.globalAlpha = la
          haloText(l1, w / 2, ly, { size: 9, color: INK, align: 'center', tracking: 0.14 })
          if (l2) haloText(l2, w / 2, ly + 16, { size: 8.5, color: INK2, align: 'center', tracking: 0.14 })
          ctx.restore()
        }
      }
      // the same light today: the pattern as an all-sky map
      const mapA = ch === 4 ? smoothstep(73.5, 75.5, T) * (1 - smoothstep(83, 85.4, T)) : 0
      if (mapA > 0.01 && !tiny) skyMap(mapA)
      if (!(hubA > 0.05 && (short || portrait))) scaleBar()
      hints(T, first)

      // sound: one soft tone whose pitch falls as space stretches
      if (sfx.enabled || hum) humSet(sfx.enabled ? 0.5 : 0, clamp(220 / Math.pow(a, 0.18), 60, 900))
      prevT = T
    },
  }
}

export default create
