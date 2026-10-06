/*
 * S.05 — ORION IN DEPTH
 *
 * A constellation is an accident of where we stand. The seven bright stars
 * of Orion are placed at their real positions on the sky (J2000 right
 * ascension and declination) and at published distances, then seen through
 * a perspective camera. From Earth they make the hunter. When the camera
 * swings round, the figure comes apart in depth: the shoulders are 300
 * light-years apart, the belt is four times farther than Bellatrix. Then the
 * light: everything you see tonight sits on one shrinking sphere of light
 * centered on you, and each star is lit as that sphere passes it — Rigel in
 * the twelfth century, Betelgeuse in the fifteenth. Then the camera comes
 * home, and the hunter reassembles.
 *
 * Four chapters over 64 s, a pure function of time (?at= seeks, ← → step):
 *   I    From here    the sky, the seven stars by brightness, the figure
 *   II   Strangers    the camera orbits 80°: rays, distances, error bars
 *   III  The past     the light-sphere sweeps in; a year clock runs to tonight
 *   IV   Tonight      the camera returns; the figure reassembles; loop
 *
 * Drag to orbit the camera anywhere (the clock waits while you look);
 * tap a star for its card. Sound: a note per star, pitched by temperature.
 */

import { C, TAU, clamp, damp, ease, ground, lerp, mod, rgba, rng, setFont, smoothstep, text } from '../kit'
import { blackbody, css } from '../color'
import type { CreatePiece, PieceInstance, PointerInfo } from '../types'

// Set even a frozen test frame in the real faces (instant on the Playground page).
if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"'), document.fonts.load('400 24px "Instrument Serif"'), document.fonts.load('italic 400 24px "Instrument Serif"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

type V3 = [number, number, number]

const FIG = 'FIG. S.05'
const LOOP = 64
const CHAPTERS = [
  { t: 0, num: 'I', name: 'From here' },
  { t: 14, num: 'II', name: 'Strangers' },
  { t: 32, num: 'III', name: 'The past' },
  { t: 47, num: 'IV', name: 'Tonight' },
]
const CAPTIONS = [
  { t0: 2.2, t1: 12.8, text: 'A hunter, *from here.*' },
  { t0: 19.8, t1: 31, text: 'From anywhere else, *strangers.*' },
  { t0: 33.6, t1: 45.6, text: 'You are looking *at the past.*' },
  { t0: 48.2, t1: 58.8, text: 'All of it arrives *tonight.*' },
]
const OUT0 = 14.6
const OUT1 = 22.6
const BACK0 = 48.4
const BACK1 = 56.2
const LIGHT0 = 33
const LIGHT1 = 46.2
const RHO0 = 1440
/** the camera's pivot: a point on the line of sight, ly from Earth */
const PIVOT = 760
const LY_PER_PC = 3.26156
// D major pentatonic, the reel's key
const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88]
const NIGHT_INK = '#EEF4F1'

const hms = (h: number, m: number, s: number) => (h + m / 60 + s / 3600) * 15
const dms = (sign: number, d: number, m: number, s: number) => sign * (d + m / 60 + s / 3600)

interface StarData {
  name: string
  bayer: string
  ra: number
  dec: number
  /** distance used (ly) and the range of published estimates */
  d: number
  lo: number
  hi: number
  /** effective temperature, K (the primary, for multiples) */
  T: number
  /** apparent V magnitude */
  V: number
  kind: string
  sp: string
}

/*
 * Positions: J2000. Distances (ly): Bellatrix, Saiph, Rigel — Hipparcos 2007
 * parallaxes; Betelgeuse — Joyce et al. 2020; the belt — recent orbit and
 * cluster-membership estimates (~1,200–1,300 ly), with the old Hipparcos
 * values at the ends of the ranges. See the guide for sources.
 */
const STARS: StarData[] = [
  { name: 'Betelgeuse', bayer: 'α Ori', ra: hms(5, 55, 10.31), dec: dms(1, 7, 24, 25.4), d: 548, lo: 499, hi: 724, T: 3600, V: 0.5, kind: 'Red supergiant', sp: 'M1–M2 Ia–ab' },
  { name: 'Rigel', bayer: 'β Ori', ra: hms(5, 14, 32.27), dec: dms(-1, 8, 12, 5.9), d: 860, lo: 780, hi: 1010, T: 12100, V: 0.13, kind: 'Blue supergiant', sp: 'B8 Ia' },
  { name: 'Bellatrix', bayer: 'γ Ori', ra: hms(5, 25, 7.86), dec: dms(1, 6, 20, 58.9), d: 250, lo: 240, hi: 260, T: 22000, V: 1.64, kind: 'Blue giant', sp: 'B2 III' },
  { name: 'Mintaka', bayer: 'δ Ori', ra: hms(5, 32, 0.4), dec: dms(-1, 0, 17, 56.7), d: 1200, lo: 690, hi: 1250, T: 30000, V: 2.23, kind: 'Multiple star', sp: 'O9.5 II' },
  { name: 'Alnilam', bayer: 'ε Ori', ra: hms(5, 36, 12.81), dec: dms(-1, 1, 12, 6.9), d: 1300, lo: 1250, hi: 2000, T: 27000, V: 1.69, kind: 'Blue supergiant', sp: 'B0 Ia' },
  { name: 'Alnitak', bayer: 'ζ Ori', ra: hms(5, 40, 45.53), dec: dms(-1, 1, 56, 34.3), d: 1260, lo: 740, hi: 1440, T: 29500, V: 1.77, kind: 'Triple star', sp: 'O9.5 Iab' },
  { name: 'Saiph', bayer: 'κ Ori', ra: hms(5, 47, 45.39), dec: dms(-1, 9, 40, 10.6), d: 650, lo: 620, hi: 680, T: 26000, V: 2.09, kind: 'Blue supergiant', sp: 'B0.5 Ia' },
]
const BET = 0
const RIG = 1
const BEL = 2
const MIN = 3
const ALM = 4
const ALT = 5
const SAI = 6
/** the hourglass: shoulders, belt, knees */
const FIGURE: [number, number][] = [
  [BET, BEL],
  [BEL, MIN],
  [MIN, ALM],
  [ALM, ALT],
  [ALT, BET],
  [ALT, SAI],
  [MIN, RIG],
  [RIG, SAI],
]
/** the Orion Nebula, the sword: ~1,350 ly (VLBI parallaxes, 2007–2017) */
const M42 = { ra: hms(5, 35, 17.3), dec: dms(-1, 5, 23, 28), d: 1350 }

const deg = Math.PI / 180
const dir = (raDeg: number, decDeg: number): V3 => {
  const a = raDeg * deg
  const d = decDeg * deg
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]
}
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
/** Rodrigues: rotate v about the unit axis k by angle a. */
function rot(v: V3, k: V3, a: number): V3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const kv = cross(k, v)
  const kd = dot(k, v) * (1 - c)
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd]
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

interface Word {
  w: string
  em: boolean
}
function parseWords(s: string): Word[] {
  const out: Word[] = []
  let em = false
  for (const part of s.split('*')) {
    for (const w of part.split(' ')) if (w) out.push({ w, em })
    em = !em
  }
  return out
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx
  const NOW = new Date().getFullYear()
  const departYear = (d: number) => Math.round((NOW - d) / 10) * 10

  /* ------------------------------------------------------------ the sky */

  // Earth's view: centered on the figure's box on the sky, north up, east left
  let raMin = Infinity
  let raMax = -Infinity
  let deMin = Infinity
  let deMax = -Infinity
  for (const s of STARS) {
    raMin = Math.min(raMin, s.ra)
    raMax = Math.max(raMax, s.ra)
    deMin = Math.min(deMin, s.dec)
    deMax = Math.max(deMax, s.dec)
  }
  const F0 = dir((raMin + raMax) / 2, (deMin + deMax) / 2)
  const R0 = norm(cross(F0, [0, 0, 1]))
  const U0 = cross(R0, F0)
  const P: V3 = scl(F0, PIVOT)

  const stars = STARS.map((s) => {
    const u = dir(s.ra, s.dec)
    const M = s.V - 5 * Math.log10(s.d / LY_PER_PC / 10)
    const [r, g, b] = blackbody(s.T)
    return { ...s, u, p: scl(u, s.d), M, col: css([r, g, b]), rgb: [r, g, b] as V3, year: departYear(s.d) }
  })
  const order = stars.map((_, i) => i).sort((a, b) => stars[a].V - stars[b].V)
  const appearAt = new Float32Array(stars.length)
  order.forEach((i, k) => (appearAt[i] = 1.2 + k * 0.42))
  const m42 = scl(dir(M42.ra, M42.dec), M42.d)
  const shoulderAngle = Math.acos(dot(stars[BET].u, stars[BEL].u)) / deg
  const shoulderLy = Math.hypot(stars[BET].p[0] - stars[BEL].p[0], stars[BET].p[1] - stars[BEL].p[1], stars[BET].p[2] - stars[BEL].p[2])

  // faint field stars: directions in a cone around Orion, far behind it
  const NF = preview ? 110 : 260
  const fr = rng(5050)
  const field: { p: V3; m: number; col: string }[] = []
  for (let i = 0; i < NF; i++) {
    const a = fr() * TAU
    const rr = Math.sqrt(fr()) * 0.42
    const u = norm([F0[0] + (R0[0] * Math.cos(a) + U0[0] * Math.sin(a)) * rr * 1.25, F0[1] + (R0[1] * Math.cos(a) + U0[1] * Math.sin(a)) * rr * 1.25, F0[2] + (R0[2] * Math.cos(a) + U0[2] * Math.sin(a)) * rr])
    const T = 3200 + Math.pow(fr(), 1.6) * 14000
    const c = blackbody(T)
    field.push({ p: scl(u, 4000 + fr() * 26000), m: 3.6 + Math.pow(fr(), 0.6) * 3, col: css([lerp(c[0], 1, 0.4), lerp(c[1], 1, 0.4), lerp(c[2], 1, 0.4)]) })
  }

  /* ------------------------------------------------------------ layout */

  let w = 1
  let h = 1
  let pad = 20
  let portrait = false
  let stacked = false
  let short = false
  let tiny = false
  let capSize = 30
  let capX = 0
  let capW = 300
  let capBottom = 0
  let rulerY = 0
  let lab = 9.5
  // camera framing: the view from Earth (0) and the side view (1)
  let vx0 = 0
  let vy0 = 0
  let k0 = 1
  let vx1 = 0
  let vy1 = 0
  let k1 = 1
  let pitchMode = false

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.25
    stacked = portrait || w < h * 1.45
    short = h < 440
    tiny = h < 260 || w < 380
    pad = clamp(Math.min(w, h) * 0.05, preview || tiny ? 11 : 14, 38)
    lab = tiny || preview ? 8 : short ? 8.5 : 9.5
    rulerY = h - pad * 0.55
    const rulerRoom = preview || tiny ? 4 : 16
    capSize = portrait ? clamp(w * 0.075, 18, 40) : clamp(Math.min(w * 0.04, h * 0.068), tiny ? 13 : 15, 50)
    capX = pad * (stacked ? 1 : 1.3)
    capW = stacked ? w - pad * 2 : clamp(w * 0.34, 160, 560)
    capBottom = h - pad - rulerRoom
    pitchMode = portrait
    // the view from Earth: fit the figure's angular box (with label room) into its region
    let bx: number
    let by: number
    let bw: number
    let bh: number
    const capBlock = capSize * (stacked ? 2.5 : 0) + 22
    if (stacked) {
      bx = pad
      by = pad + (tiny ? 18 : 30)
      bw = w - pad * 2
      bh = capBottom - capBlock - by - 6
    } else {
      bx = Math.max(capX + capW * 0.82, w * 0.36)
      by = pad + (tiny ? 16 : 26)
      bw = w - pad - bx
      bh = h - by - pad - rulerRoom
    }
    // angular half-extents of the figure (tangent-plane units) + margin for names
    let ax = 0
    let ay = 0
    for (const s of stars) {
      const z = dot(s.u, F0)
      ax = Math.max(ax, Math.abs(dot(s.u, R0) / z))
      ay = Math.max(ay, Math.abs(dot(s.u, U0) / z))
    }
    const labW = tiny ? 48 : portrait ? 52 : 70
    const F = Math.min((bw / 2 - labW) / ax, (bh / 2 - 12) / ay)
    k0 = Math.max(0.05, F / PIVOT)
    vx0 = bx + bw / 2
    vy0 = by + bh / 2
    // the side view: 0 → 1,500 ly across the width (or up the height, in portrait)
    if (pitchMode) {
      const top = pad + 40
      const bottom = h * 0.68
      k1 = (bottom - top) / 1600
      vx1 = w * 0.54
      vy1 = bottom - PIVOT * k1 - 40 * k1
    } else {
      const left = pad + (tiny ? 26 : 44)
      const right = w - pad - (tiny ? 10 : 20)
      k1 = (right - left) / 1560
      vx1 = left + PIVOT * k1
      vy1 = stacked ? pad + (capBottom - capBlock - pad) * 0.42 : h * (short ? 0.38 : 0.4)
    }
  }
  layout()

  /* ------------------------------------------------------------ camera */

  const cam = { c: [0, 0, 0] as V3, f: F0, r: R0, u: U0, F: 1, vx: 0, vy: 0, s: 0, Rc: PIVOT }
  let yawU = 0
  let pitchU = 0

  function camera(T: number) {
    const sw = swing(T)
    const hold = smoothstep(OUT1, OUT1 + 2, T) * (1 - smoothstep(BACK0 - 2, BACK0, T))
    let f = F0
    let r = R0
    let u = U0
    if (pitchMode) {
      const a = -(sw * 88 + hold * 3 * Math.sin((T - OUT1) * 0.21)) * deg
      f = rot(f, r, a)
      u = rot(u, r, a)
      const b = (sw * 24 + hold * 5 * Math.sin((T - OUT1) * 0.17)) * deg
      f = rot(f, u, b)
      r = rot(r, u, b)
    } else {
      const a = (sw * 82 + hold * 4 * Math.sin((T - OUT1) * 0.19)) * deg
      f = rot(f, u, a)
      r = rot(r, u, a)
      const b = -(sw * 24 + hold * 3 * Math.sin((T - OUT1) * 0.13 + 1)) * deg
      f = rot(f, r, b)
      u = rot(u, r, b)
    }
    if (yawU) {
      f = rot(f, u, yawU)
      r = rot(r, u, yawU)
    }
    if (pitchU) {
      f = rot(f, r, pitchU)
      u = rot(u, r, pitchU)
    }
    // how far the view direction has left Earth's: drives the dolly and the framing
    const ang = Math.acos(clamp(dot(f, F0), -1, 1))
    const s = smoothstep(0, 1, clamp(ang / (80 * deg)))
    const Rc = PIVOT * Math.pow(5.2, s)
    const k = k0 * Math.pow(k1 / k0, s)
    cam.f = f
    cam.r = r
    cam.u = u
    cam.Rc = Rc
    cam.c = [P[0] - f[0] * Rc, P[1] - f[1] * Rc, P[2] - f[2] * Rc]
    cam.F = k * Rc
    cam.vx = lerp(vx0, vx1, s)
    cam.vy = lerp(vy0, vy1, s)
    cam.s = s
  }

  function swing(T: number) {
    if (T < OUT0) return 0
    if (T < OUT1) return ease.inOutCubic((T - OUT0) / (OUT1 - OUT0))
    if (T < BACK0) return 1
    if (T < BACK1) return 1 - ease.inOutCubic((T - BACK0) / (BACK1 - BACK0))
    return 0
  }

  // projection scratch: x, y, z per point
  const out = new Float64Array(3)
  function project(p: V3): boolean {
    const qx = p[0] - cam.c[0]
    const qy = p[1] - cam.c[1]
    const qz = p[2] - cam.c[2]
    const z = qx * cam.f[0] + qy * cam.f[1] + qz * cam.f[2]
    out[2] = z
    if (z < 2) return false
    out[0] = cam.vx + (cam.F * (qx * cam.r[0] + qy * cam.r[1] + qz * cam.r[2])) / z
    out[1] = cam.vy - (cam.F * (qx * cam.u[0] + qy * cam.u[1] + qz * cam.u[2])) / z
    return true
  }
  const SX = new Float64Array(stars.length)
  const SY = new Float64Array(stars.length)
  const SZ = new Float64Array(stars.length)
  const SR = new Float64Array(stars.length)
  const SOK = new Uint8Array(stars.length)

  /* ------------------------------------------------------------ clock + input */

  const at = Number(env.params.get('at'))
  let clock = env.params.has('at') && Number.isFinite(at) ? at : preview ? 8.5 : 0
  let wall = 0
  let rate = 1
  let prevT = -1
  let holdUntil = -1
  let touched = false
  let dragging = false
  let downX = 0
  let downY = 0
  let downWall = 0
  let lastX = 0
  let lastY = 0
  let moved = 0
  let touch = false
  let hover = -1
  // ?sel=0…6 opens a star's card (test route)
  let selected = env.params.has('sel') ? clamp(Math.round(Number(env.params.get('sel'))), -1, STARS.length - 1) : -1
  let selectedAt = 0
  let pointerIn = false
  let scrubbing = false
  let hoverRuler = -1
  let curT = 0

  const onRuler = (x: number, y: number) => !preview && !tiny && y > rulerY - 18 && y < h && x > pad - 8 && x < w - pad + 8
  function seekTo(x: number) {
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2) target = c.t
    clock = Math.min(LOOP - 0.05, target)
    yawU = pitchU = 0
  }
  function hitStar(x: number, y: number) {
    let best = -1
    let bd = Infinity
    for (let i = 0; i < stars.length; i++) {
      if (!SOK[i]) continue
      const d = Math.hypot(SX[i] - x, SY[i] - y)
      const lim = Math.max(SR[i] + (touch ? 18 : 9), touch ? 26 : 14)
      if (d < lim && d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }

  /* ------------------------------------------------------------ drawing helpers */

  const k = {
    ink: NIGHT_INK,
    ink2: 'rgba(238,244,241,0.78)',
    muted: 'rgba(238,244,241,0.52)',
    rule: 'rgba(238,244,241,0.16)',
    faint: 'rgba(238,244,241,0.07)',
    accent: C.sage,
    sky: C.sky,
  }

  function caption(T: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const words = parseWords(cap.text)
      // shrink until it fits in two lines (three when stacked on a narrow screen)
      let size = capSize
      let lines: Word[][] = []
      const maxLines = stacked && w < 520 ? 3 : 2
      for (let iter = 0; iter < 8; iter++) {
        lines = wrap(words, size, capW)
        if (lines.length <= maxLines) break
        size *= 0.9
      }
      const lineH = size * 1.06
      const top = capBottom - lines.length * lineH
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = top + (li + 1) * lineH - size * 0.2
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - size * 1.02, w, size * 1.32)
        ctx.clip()
        const dy = (1 - pr) * size * 1.15 - pe * size * 0.9
        ctx.globalAlpha = 1 - pe * 0.6
        let x = capX
        for (const wd of ln) {
          text(ctx, wd.w, x, y + dy, { font: 'serif', size, italic: wd.em, color: wd.em ? k.accent : k.ink })
          setFont(ctx, { font: 'serif', size, italic: wd.em })
          x += ctx.measureText(wd.w + ' ').width
        }
        ctx.restore()
      })
    }
  }
  function wrap(words: Word[], size: number, maxW: number) {
    const lines: Word[][] = [[]]
    const width = (ws: Word[]) => {
      let t = 0
      for (const wd of ws) {
        setFont(ctx, { font: 'serif', size, italic: wd.em })
        t += ctx.measureText(wd.w + ' ').width
      }
      return t
    }
    // the italic phrase moves as one when it fits on a line of its own
    const emStart = words.findIndex((wd) => wd.em)
    const emW = emStart >= 0 ? width(words.slice(emStart)) : 0
    let x = 0
    words.forEach((wd, i) => {
      setFont(ctx, { font: 'serif', size, italic: wd.em })
      const ww = ctx.measureText(wd.w).width
      const sp = ctx.measureText(' ').width
      const breakEm = i === emStart && emW <= maxW && x + emW - sp > maxW
      if (x > 0 && (x + ww > maxW || breakEm)) {
        lines.push([])
        x = 0
      }
      lines[lines.length - 1].push(wd)
      x += ww + sp
    })
    return lines
  }

  /** A star: a soft image of the point (its color is its temperature), a core, a hairline ring. */
  function drawStar(i: number, alpha: number, ringA: number) {
    const x = SX[i]
    const y = SY[i]
    const r = SR[i]
    const s = stars[i]
    const rgb = `${(s.rgb[0] * 255) | 0},${(s.rgb[1] * 255) | 0},${(s.rgb[2] * 255) | 0}`
    ctx.save()
    ctx.globalAlpha = alpha
    // the point's image: a small colored bloom, then a white-hot core
    const R = r * 4.2
    const g = ctx.createRadialGradient(x, y, 0, x, y, R)
    g.addColorStop(0, `rgba(${rgb},0.7)`)
    g.addColorStop(0.24, `rgba(${rgb},0.26)`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R, 0, TAU)
    ctx.fill()
    ctx.fillStyle = s.col
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.5, 0, TAU)
    ctx.fill()
    if (ringA > 0) {
      // a registration mark: four ticks (and a ring when it is hovered or chosen)
      const on = i === selected || i === hover
      const rr = r + (on ? 8 : 5)
      ctx.globalAlpha = alpha * ringA * (on ? 1 : 0.6)
      ctx.strokeStyle = on ? k.ink : k.muted
      ctx.lineWidth = 1
      ctx.beginPath()
      if (on) ctx.arc(x, y, rr, 0, TAU)
      ctx.moveTo(x + rr + 1, y)
      ctx.lineTo(x + rr + 5, y)
      ctx.moveTo(x - rr - 1, y)
      ctx.lineTo(x - rr - 5, y)
      ctx.moveTo(x, y - rr - 1)
      ctx.lineTo(x, y - rr - 5)
      ctx.moveTo(x, y + rr + 1)
      ctx.lineTo(x, y + rr + 5)
      ctx.stroke()
    }
    ctx.restore()
  }

  // label placement (greedy, with memory so labels don't hop)
  const labelPick = new Int8Array(stars.length).fill(-1)
  const boxes: number[] = []
  const OFFS = [
    [1, 0],
    [-1, 0],
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
    [0, -1],
    [0, 1],
  ]
  function placeLabel(i: number, lines: { s: string; c: string; sz: number }[], alpha: number) {
    if (!SOK[i] || alpha <= 0.01) return
    let wmax = 0
    for (const l of lines) {
      setFont(ctx, { size: l.sz, tracking: 0.12 })
      wmax = Math.max(wmax, ctx.measureText(l.s.toUpperCase()).width)
    }
    const lh = lab + 3
    const bh = lines.length * lh
    const gap = SR[i] + 13
    const tryAt = (o: number) => {
      const [ox, oy] = OFFS[o]
      const x0 = ox > 0 ? SX[i] + gap : ox < 0 ? SX[i] - gap - wmax : SX[i] - wmax / 2
      const y0 = oy < 0 ? SY[i] - gap - bh : oy > 0 ? SY[i] + gap : SY[i] - bh / 2
      if (x0 < 4 || x0 + wmax > w - 4 || y0 < pad + 14 || y0 + bh > h - 4) return null
      for (let b = 0; b < boxes.length; b += 4) {
        if (x0 < boxes[b + 2] + 4 && x0 + wmax > boxes[b] - 4 && y0 < boxes[b + 3] + 2 && y0 + bh > boxes[b + 1] - 2) return null
      }
      for (let j = 0; j < stars.length; j++) {
        if (!SOK[j]) continue
        const cx = clamp(SX[j], x0, x0 + wmax)
        const cy = clamp(SY[j], y0, y0 + bh)
        if (Math.hypot(cx - SX[j], cy - SY[j]) < SR[j] + 3) return null
      }
      return [x0, y0]
    }
    let pos: number[] | null = null
    let pick = labelPick[i]
    if (pick >= 0) pos = tryAt(pick)
    if (!pos) {
      for (let o = 0; o < OFFS.length && !pos; o++) {
        pos = tryAt(o)
        if (pos) pick = o
      }
    }
    if (!pos) return
    labelPick[i] = pick
    boxes.push(pos[0], pos[1], pos[0] + wmax, pos[1] + bh)
    ctx.save()
    ctx.globalAlpha = alpha
    const right = OFFS[pick][0] < 0
    lines.forEach((l, li) => {
      text(ctx, l.s, right ? pos[0] + wmax : OFFS[pick][0] === 0 ? pos[0] + wmax / 2 : pos[0], pos[1] + (li + 1) * lh - 3, {
        size: l.sz,
        color: l.c,
        tracking: 0.12,
        upper: true,
        align: right ? 'right' : OFFS[pick][0] === 0 ? 'center' : 'left',
      })
    })
    ctx.restore()
  }

  function seg(a: V3, b: V3, dash: number[] | null, trim0 = 0, trim1 = 0) {
    if (!project(a)) return
    const ax = out[0]
    const ay = out[1]
    if (!project(b)) return
    const bx = out[0]
    const by = out[1]
    const L = Math.hypot(bx - ax, by - ay)
    if (L < trim0 + trim1 + 2) return
    const ux = (bx - ax) / L
    const uy = (by - ay) / L
    if (dash) ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(ax + ux * trim0, ay + uy * trim0)
    ctx.lineTo(bx - ux * trim1, by - uy * trim1)
    ctx.stroke()
    if (dash) ctx.setLineDash([])
  }

  /* ------------------------------------------------------------ sound */

  function noteFor(i: number) {
    const lt = (Math.log(stars[i].T) - Math.log(3500)) / (Math.log(31000) - Math.log(3500))
    const idx = Math.round(lt * 7)
    return SCALE[idx % 5] * Math.pow(2, Math.floor(idx / 5)) * 0.5
  }

  /* ------------------------------------------------------------ frame */

  function frame(_t: number, dt: number) {
    wall += dt
    simulate()
    const interacting = dragging || wall < holdUntil
    const want = interacting ? 0 : 1
    rate = lerp(rate, want, damp(want > rate ? 1.4 : 7, dt))
    if (rate > 0.999) rate = 1
    clock += dt * rate
    const T = mod(clock, LOOP)
    curT = T
    const advancing = dt > 0 && prevT >= 0 && T >= prevT && T - prevT < 1
    const crossed = (te: number) => advancing && prevT < te && te <= T
    if (prevT >= 0 && T < prevT - 1) {
      labelPick.fill(-1)
      if (!interacting) selected = -1
    }
    // the viewer's orbit eases home once they let go
    if (!interacting && (yawU || pitchU)) {
      const kk = damp(1.3, dt)
      yawU -= yawU * kk
      pitchU -= pitchU * kk
      if (Math.abs(yawU) < 1e-4) yawU = 0
      if (Math.abs(pitchU) < 1e-4) pitchU = 0
    }
    // the ghost demonstration nudges the camera, a first taste of parallax
    const g = ghost()
    const ghostYaw = g ? Math.sin(g.u * Math.PI) * Math.sin(g.u * TAU) * 7 * deg : 0
    const keepYaw = yawU
    yawU += ghostYaw
    camera(T)
    yawU = keepYaw
    const s = cam.s

    ground(ctx, w, h, 'night')
    // label boxes: the chrome first, then annotations as they are drawn, then the names
    boxes.length = 0
    reserveChrome(T)

    const endFade = 1 - smoothstep(60.8, 63.4, T)
    const starFade = 1 - smoothstep(62.2, 63.9, T)
    const szScale = clamp(Math.min(w, h) / 760, 0.62, 1.35) * (preview ? 0.85 : 1)
    const exposure = 5 * Math.log10(cam.Rc / PIVOT)

    /* the celestial grid: right ascension and declination, as seen from Earth */
    const gridA = (1 - smoothstep(0.04, 0.32, s)) * 0.85
    if (gridA > 0.01) {
      ctx.save()
      ctx.globalAlpha = gridA
      ctx.strokeStyle = k.faint
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let ra = 3.8; ra <= 7.21; ra += 1 / 3) {
        let first = true
        for (let dc = -36; dc <= 36; dc += 2) {
          if (!project(scl(dir(ra * 15, dc), 1e6))) {
            first = true
            continue
          }
          if (first) ctx.moveTo(out[0], out[1])
          else ctx.lineTo(out[0], out[1])
          first = false
        }
      }
      for (let dc = -30; dc <= 30; dc += 5) {
        let first = true
        for (let ra = 3.6; ra <= 7.4; ra += 0.05) {
          if (!project(scl(dir(ra * 15, dc), 1e6))) {
            first = true
            continue
          }
          if (first) ctx.moveTo(out[0], out[1])
          else ctx.lineTo(out[0], out[1])
          first = false
        }
      }
      ctx.stroke()
      // the equator, labelled
      if (!tiny && !preview && !short) {
        if (project(scl(dir(6.12 * 15, 0), 1e6)) && out[0] > 0 && out[0] < w) text(ctx, 'CELESTIAL EQUATOR · DEC 0°', out[0] + 6, out[1] - 5, { size: 8, color: k.muted, tracking: 0.14 })
        if (project(scl(dir(5.0 * 15, -18.6), 1e6)) && out[0] > 0 && out[0] < w) text(ctx, 'RA 5H 00M', out[0] + 5, out[1], { size: 8, color: k.muted, tracking: 0.14 })
      }
      ctx.restore()
    }

    /* field stars */
    const fieldA = 1 - smoothstep(0.02, 0.5, s)
    if (fieldA > 0.01) {
      ctx.save()
      for (const f of field) {
        if (!project(f.p)) continue
        if (out[0] < -4 || out[0] > w + 4 || out[1] < -4 || out[1] > h + 4) continue
        const a = clamp(1.25 - (f.m - 3.6) * 0.3) * fieldA
        ctx.globalAlpha = a * 0.85
        ctx.fillStyle = f.col
        const rr = clamp((7 - f.m) * 0.32, 0.45, 1.3) * szScale
        ctx.fillRect(out[0] - rr, out[1] - rr, rr * 2, rr * 2)
      }
      ctx.restore()
    }

    /* the seven: project, size by brightness as seen from the camera */
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i]
      SOK[i] = project(st.p) ? 1 : 0
      SX[i] = out[0]
      SY[i] = out[1]
      SZ[i] = out[2]
      const dc = Math.hypot(st.p[0] - cam.c[0], st.p[1] - cam.c[1], st.p[2] - cam.c[2])
      const m = st.M + 5 * Math.log10(Math.max(1, dc) / LY_PER_PC / 10) - exposure
      SR[i] = clamp(2.6 * Math.pow(10, -0.17 * (m - 1)), 1.1, 7) * szScale
    }
    const vis = (i: number) => smoothstep(appearAt[i], appearAt[i] + 0.6, T) * starFade

    /* the depth apparatus: rays from Earth, the ruler, the error bars */
    // (on the way home the apparatus folds away early, so the return reads as one gesture)
    const homeFade = T >= BACK0 && T < BACK1 + 2 ? 1 - smoothstep(BACK0 + 0.6, BACK0 + 3.4, T) : 1
    const depthA = smoothstep(0.12, 0.6, s) * endFade * homeFade
    const E: V3 = [0, 0, 0]
    const rulerOff: V3 = pitchMode ? scl(R0, -96) : scl(U0, -175)
    if (depthA > 0.01) {
      ctx.save()
      ctx.lineWidth = 1
      // lines of sight: from you to each star (all of them meet at your eye)
      for (let i = 0; i < stars.length; i++) {
        ctx.globalAlpha = depthA * 0.5
        ctx.strokeStyle = stars[i].col
        seg(E, stars[i].p, [1.5, 3.5], 0, SR[i] + 4)
      }
      // the ruler: 0 → 1,500 ly along the line of sight
      ctx.globalAlpha = depthA
      ctx.strokeStyle = k.ink2
      const r0: V3 = rulerOff
      const r1: V3 = [F0[0] * 1500 + rulerOff[0], F0[1] * 1500 + rulerOff[1], F0[2] * 1500 + rulerOff[2]]
      seg(r0, r1, null)
      if (project(r0)) {
        const ax = out[0]
        const ay = out[1]
        if (project(r1)) {
          const bx = out[0]
          const by = out[1]
          const L = Math.hypot(bx - ax, by - ay) || 1
          // ticks on the far side from the stars
          let nx = -(by - ay) / L
          let ny = (bx - ax) / L
          if (pitchMode ? nx > 0 : ny < 0) {
            nx = -nx
            ny = -ny
          }
          ctx.beginPath()
          for (let d = 0; d <= 1500; d += 50) {
            const q = d / 1500
            const px = lerp(ax, bx, q)
            const py = lerp(ay, by, q)
            const len = d % 500 === 0 ? 6 : d % 100 === 0 ? 3.5 : 0
            if (!len) continue
            ctx.moveTo(px, py)
            ctx.lineTo(px + nx * len, py + ny * len)
          }
          ctx.stroke()
          const every = L < 260 ? 1500 : L < 520 ? 500 : 250
          for (let d = 0; d <= 1500; d += every) {
            const q = d / 1500
            const px = lerp(ax, bx, q) + nx * (pitchMode ? 10 : 15)
            const py = lerp(ay, by, q) + ny * (pitchMode ? 10 : 15)
            const rl = d === 0 ? '0' : d === 1500 ? '1,500 LY' : fmt(d)
            text(ctx, rl, px, py + (pitchMode ? 3 : 0), { size: lab - 0.5, color: k.muted, align: pitchMode ? 'right' : 'center', baseline: pitchMode ? 'alphabetic' : 'middle', tracking: 0.1 })
            setFont(ctx, { size: lab - 0.5, tracking: 0.1 })
            const rw = ctx.measureText(rl).width
            if (pitchMode) boxes.push(px - rw, py - 7, px, py + 5)
            else boxes.push(px - rw / 2, py - 6, px + rw / 2, py + 6)
          }
        }
      }
      // where each star falls on the ruler: a dotted drop and a color tick
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i]
        const along = dot(st.p, F0)
        const foot: V3 = [F0[0] * along + rulerOff[0], F0[1] * along + rulerOff[1], F0[2] * along + rulerOff[2]]
        ctx.globalAlpha = depthA * 0.32
        ctx.strokeStyle = k.ink2
        seg(st.p, foot, [1, 3], SR[i] + 3, 0)
        if (project(foot)) {
          ctx.globalAlpha = depthA
          ctx.fillStyle = st.col
          ctx.beginPath()
          ctx.arc(out[0], out[1], 2.2, 0, TAU)
          ctx.fill()
        }
      }
      // distance uncertainty: the range of published estimates, a soft band along each ray
      const rangeA = depthA * smoothstep(24.5, 26.5, T) * (1 - smoothstep(LIGHT0, LIGHT0 + 2, T))
      ctx.lineCap = 'round'
      for (let i = 0; i < stars.length && rangeA > 0.01; i++) {
        const st = stars[i]
        ctx.strokeStyle = st.col
        const a = scl(st.u, st.lo)
        const b = scl(st.u, st.hi)
        if (!project(a)) continue
        const ax = out[0]
        const ay = out[1]
        if (!project(b)) continue
        const bx = out[0]
        const by = out[1]
        const L = Math.hypot(bx - ax, by - ay)
        if (L < 3) continue
        const nx = (-(by - ay) / L) * 3.5
        const ny = ((bx - ax) / L) * 3.5
        ctx.globalAlpha = rangeA * 0.26
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
        ctx.globalAlpha = rangeA * 0.8
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(ax - nx, ay - ny)
        ctx.lineTo(ax + nx, ay + ny)
        ctx.moveTo(bx - nx, by - ny)
        ctx.lineTo(bx + nx, by + ny)
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
      // a legend for the bands, beside the farthest one
      if (rangeA > 0.01 && !tiny && !preview && project(scl(stars[ALM].u, Math.min(stars[ALM].hi, 1480)))) {
        const legend = 'BANDS · RANGE OF PUBLISHED DISTANCES'
        setFont(ctx, { size: lab - 1, tracking: 0.14 })
        const lw = ctx.measureText(legend).width
        const lx = clamp(out[0], pad + lw, w - pad - 4)
        const ly = out[1] - 30
        // only where it collides with nothing already placed (the readouts, a title)
        let clear = ly - 10 > pad
        for (let q = 0; q < boxes.length && clear; q += 4) if (lx - lw < boxes[q + 2] && lx > boxes[q] && ly - 10 < boxes[q + 3] && ly + 4 > boxes[q + 1]) clear = false
        if (clear) {
          text(ctx, legend, lx, ly, { size: lab - 1, color: k.muted, tracking: 0.14, align: 'right', alpha: rangeA })
          boxes.push(lx - lw, ly - 10, lx, ly + 4)
        }
      }
      ctx.restore()
    }

    /* Earth: you are here */
    const earthA = smoothstep(0.1, 0.45, s) * endFade
    if (earthA > 0.01 && project(E)) {
      const ex = out[0]
      const ey = out[1]
      ctx.save()
      ctx.globalAlpha = earthA
      ctx.strokeStyle = k.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(ex, ey, 5, 0, TAU)
      ctx.moveTo(ex - 5, ey)
      ctx.lineTo(ex + 5, ey)
      ctx.moveTo(ex, ey - 5)
      ctx.lineTo(ex, ey + 5)
      ctx.stroke()
      const el = tiny ? 'YOU' : 'EARTH · YOU'
      setFont(ctx, { size: lab, tracking: 0.14 })
      const ew = ctx.measureText(el).width
      if (pitchMode) {
        text(ctx, el, ex + 10, ey + 14, { size: lab, color: k.ink, tracking: 0.14 })
        boxes.push(ex + 10, ey + 4, ex + 10 + ew, ey + 16)
      } else {
        const lx = Math.max(4 + ew / 2, ex)
        text(ctx, el, lx, ey - 12, { size: lab, color: k.ink, tracking: 0.14, align: 'center' })
        boxes.push(lx - ew / 2, ey - 22, lx + ew / 2, ey - 8)
      }
      boxes.push(ex - 7, ey - 7, ex + 7, ey + 7)
      ctx.restore()
    }

    /* the light: one sphere of light, centered on you, shrinking to tonight */
    let rho = RHO0
    if (T >= LIGHT0) rho = T < LIGHT1 ? RHO0 * (1 - ease.inOutSine((T - LIGHT0) / (LIGHT1 - LIGHT0))) : 0
    const lightA = smoothstep(LIGHT0 - 0.6, LIGHT0 + 0.4, T) * (1 - smoothstep(LIGHT1 + 0.2, LIGHT1 + 1.2, T))
    if (lightA > 0.01 && rho > 1) {
      ctx.save()
      ctx.lineWidth = 1
      for (const [dr, a] of [
        [0, 0.75],
        [26, 0.22],
        [52, 0.09],
      ] as const) {
        const R = rho + dr
        ctx.globalAlpha = lightA * a
        ctx.strokeStyle = k.sky
        ctx.beginPath()
        let first = true
        for (let j = 0; j <= 180; j++) {
          const ang = (j / 180) * TAU
          const p: V3 = [(cam.r[0] * Math.cos(ang) + cam.u[0] * Math.sin(ang)) * R, (cam.r[1] * Math.cos(ang) + cam.u[1] * Math.sin(ang)) * R, (cam.r[2] * Math.cos(ang) + cam.u[2] * Math.sin(ang)) * R]
          if (!project(p)) {
            first = true
            continue
          }
          if (first) ctx.moveTo(out[0], out[1])
          else ctx.lineTo(out[0], out[1])
          first = false
        }
        ctx.stroke()
      }
      ctx.restore()
    }
    // photons: every departed star's light rides the sphere along its ray
    if (T >= LIGHT0 && T < LIGHT1 + 0.6) {
      ctx.save()
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i]
        if (rho > st.d) continue
        const head = scl(st.u, Math.max(0, rho))
        const tail = scl(st.u, Math.min(st.d, rho + 90))
        if (!project(head)) continue
        const hx = out[0]
        const hy = out[1]
        ctx.globalAlpha = lightA
        if (project(tail)) {
          const gr = ctx.createLinearGradient(hx, hy, out[0], out[1])
          gr.addColorStop(0, st.col)
          gr.addColorStop(1, rgba('#ffffff', 0))
          ctx.strokeStyle = gr
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.moveTo(hx, hy)
          ctx.lineTo(out[0], out[1])
          ctx.stroke()
        }
        ctx.fillStyle = st.col
        ctx.beginPath()
        ctx.arc(hx, hy, 1.9, 0, TAU)
        ctx.fill()
        // the moment of departure: a ring at the star
        const since = (st.d - rho) / 110
        if (since < 1 && SOK[i]) {
          ctx.globalAlpha = (1 - since) * lightA
          ctx.strokeStyle = st.col
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(SX[i], SY[i], SR[i] + 4 + since * 22, 0, TAU)
          ctx.stroke()
        }
      }
      ctx.restore()
      for (let i = 0; i < stars.length; i++) if (advancing && rho <= stars[i].d && rho > stars[i].d - 80 && !departedOnce[i]) {
        departedOnce[i] = 1
        sfx.tone(noteFor(i), 3, { type: 'sine', gain: 0.05, attack: 0.02, room: 0.55, pan: clamp((SX[i] / w) * 2 - 1, -0.8, 0.8) })
      }
    }
    if (T < LIGHT0) departedOnce.fill(0)
    if (crossed(LIGHT1)) [293.66, 369.99, 440, 587.33].forEach((f, j) => sfx.tone(f, 4.2, { type: 'sine', gain: 0.04, attack: 0.3 + j * 0.06, room: 0.6, when: j * 0.08 }))

    /* M42, the sword's nebula: a few hairline wisps */
    const nebA = smoothstep(5, 7, T) * endFade * (tiny ? 0 : 0.8)
    if (nebA > 0.01 && project(m42)) {
      const rr = Math.max(2.5, (cam.F * 12) / out[2])
      const nx = out[0]
      const ny = out[1]
      ctx.save()
      ctx.globalAlpha = nebA * 0.55
      const gN = ctx.createRadialGradient(nx, ny, 0, nx, ny, rr * 1.6)
      gN.addColorStop(0, 'rgba(200,214,236,0.32)')
      gN.addColorStop(1, 'rgba(200,214,236,0)')
      ctx.fillStyle = gN
      ctx.beginPath()
      ctx.arc(nx, ny, rr * 1.6, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,214,236,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([1, 2.5])
      ctx.beginPath()
      ctx.arc(nx, ny, rr, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
      if (!preview && rr > 1) {
        const m42Label = s < 0.15 ? 'M42' : `M42 · ${fmt(M42.d)} LY`
        setFont(ctx, { size: lab - 1, tracking: 0.12 })
        const mw = ctx.measureText(m42Label).width
        const mx = nx + rr + 5
        let clear = mx + mw < w - 4
        for (let b = 0; b < boxes.length && clear; b += 4) if (mx < boxes[b + 2] && mx + mw > boxes[b] && ny - 6 < boxes[b + 3] && ny + 4 > boxes[b + 1]) clear = false
        if (clear) {
          text(ctx, m42Label, mx, ny + 3, { size: lab - 1, color: k.muted, tracking: 0.12, alpha: nebA })
          boxes.push(mx, ny - 6, mx + mw, ny + 5)
        }
      }
    }

    /* the figure: hairlines between the stars, drawn on in chapter I */
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(NIGHT_INK, lerp(0.62, 0.34, cam.s))
    for (let j = 0; j < FIGURE.length; j++) {
      const [a, b] = FIGURE[j]
      const on = clamp((T - (4.4 + j * 0.34)) / 0.9) * endFade
      if (on <= 0 || !SOK[a] || !SOK[b]) continue
      const L = Math.hypot(SX[b] - SX[a], SY[b] - SY[a])
      const t0 = SR[a] + 5
      const t1 = SR[b] + 5
      if (L < t0 + t1 + 2) continue
      const ux = (SX[b] - SX[a]) / L
      const uy = (SY[b] - SY[a]) / L
      const len = (L - t0 - t1) * ease.inOutSine(on)
      ctx.beginPath()
      ctx.moveTo(SX[a] + ux * t0, SY[a] + uy * t0)
      ctx.lineTo(SX[a] + ux * (t0 + len), SY[a] + uy * (t0 + len))
      ctx.stroke()
    }
    ctx.restore()

    /* the shoulders: 7.5° apart on the sky, 300 ly apart in space */
    if (!preview && SOK[BET] && SOK[BEL]) {
      const angA = smoothstep(7, 8.4, T) * (1 - smoothstep(0.04, 0.2, s)) * endFade
      const lyA = smoothstep(0.55, 0.9, s) * endFade
      const a = Math.max(angA, lyA)
      if (a > 0.01) {
        const label = angA >= lyA ? `${shoulderAngle.toFixed(1)}°` : `≈ ${fmt(Math.round(shoulderLy / 10) * 10)} LY APART`
        shoulderDim(a, label)
      }
    }

    /* the stars, far to near */
    const ids = stars.map((_, i) => i).sort((a, b) => SZ[b] - SZ[a])
    for (const i of ids) {
      if (!SOK[i]) continue
      const v = vis(i)
      if (v <= 0) continue
      drawStar(i, v, smoothstep(5.6, 7, T) * endFade)
      if (crossed(appearAt[i] + 0.05)) sfx.tone(noteFor(i), 2.4, { type: 'sine', gain: 0.045, attack: 0.01, room: 0.5, pan: clamp((SX[i] / w) * 2 - 1, -0.8, 0.8) })
    }
    if (crossed(7.2)) [146.83, 220, 293.66].forEach((f, j) => sfx.tone(f, 3.6, { type: 'sine', gain: 0.03, attack: 0.5, room: 0.6, when: j * 0.1 }))
    if (crossed(BACK1 - 0.4)) [220, 293.66, 369.99, 440].forEach((f, j) => sfx.tone(f, 3.8, { type: 'triangle', gain: 0.025, attack: 0.4, room: 0.6, when: j * 0.12 }))

    /* the year: when the light now reaching you set out */
    yearClock(T, rho)

    /* labels */
    const nameA = smoothstep(6, 7.4, T) * endFade
    const showDist = smoothstep(0.3, 0.6, s) > 0.5 || (T >= LIGHT0 && T < LOOP - 3)
    for (const i of order) {
      if (!SOK[i]) continue
      const st = stars[i]
      const lines: { s: string; c: string; sz: number }[] = [{ s: st.name, c: i === selected ? k.ink : k.ink2, sz: lab }]
      const departed = T >= LIGHT0 && rho <= st.d
      const parts: string[] = []
      if (showDist) parts.push(`${fmt(st.d)} LY`)
      if (departed && !tiny) parts.push(`≈ ${st.year}`)
      else if (departed && !showDist) parts.push(`≈ ${st.year}`)
      if (parts.length) lines.push({ s: parts.join(' · '), c: departed ? k.sky : k.muted, sz: lab - 0.5 })
      if (preview && s < 0.3) lines.length = 1
      // on a card the three belt stars share one label
      if ((preview || tiny) && (i === MIN || i === ALT)) continue
      if ((preview || tiny) && i === ALM && s < 0.3) lines[0].s = 'Belt'
      // cramped side views: one line, name and number
      if ((preview || tiny) && lines.length > 1 && s >= 0.3) {
        lines[0].s = `${lines[0].s} ${fmt(st.d)}`
        lines.length = 1
      }
      placeLabel(i, lines, nameA * vis(i))
    }

    /* chrome */
    readouts(T, rho)
    caption(T)
    chrome(T)
    if (selected >= 0) infoCard(selected)
    ghostDraw(g)
    hints(T)

    if (!preview) env.setCursor(scrubbing || hoverRuler >= 0 ? 'pointer' : dragging ? 'grabbing' : hover >= 0 ? 'pointer' : pointerIn ? 'grab' : 'default')
    prevT = T
  }
  const departedOnce = new Uint8Array(STARS.length)

  function shoulderDim(a: number, label: string) {
    const ax = SX[BET]
    const ay = SY[BET]
    const bx = SX[BEL]
    const by = SY[BEL]
    const L = Math.hypot(bx - ax, by - ay)
    if (L < 40) return
    let nx = -(by - ay) / L
    let ny = (bx - ax) / L
    if (pitchMode && cam.s > 0.5 ? nx > 0 : ny > 0) {
      nx = -nx
      ny = -ny
    }
    const off = 24 + Math.max(SR[BET], SR[BEL])
    // no room beside the shoulders (a short frame): leave the dimension out
    if (Math.min(ay + ny * (off + 16), by + ny * (off + 16)) < pad + 18) return
    const ux = (bx - ax) / L
    const uy = (by - ay) / L
    const p0x = ax + nx * off
    const p0y = ay + ny * off
    const p1x = bx + nx * off
    const p1y = by + ny * off
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ax + nx * (SR[BET] + 6), ay + ny * (SR[BET] + 6))
    ctx.lineTo(p0x + nx * 4, p0y + ny * 4)
    ctx.moveTo(bx + nx * (SR[BEL] + 6), by + ny * (SR[BEL] + 6))
    ctx.lineTo(p1x + nx * 4, p1y + ny * 4)
    ctx.moveTo(p0x, p0y)
    ctx.lineTo(p1x, p1y)
    for (const [px, py, sg] of [
      [p0x, p0y, 1],
      [p1x, p1y, -1],
    ] as const) {
      ctx.moveTo(px + (ux * 5 - uy * 2.5) * sg, py + (uy * 5 + ux * 2.5) * sg)
      ctx.lineTo(px, py)
      ctx.lineTo(px + (ux * 5 + uy * 2.5) * sg, py + (uy * 5 - ux * 2.5) * sg)
    }
    ctx.stroke()
    const mx = (p0x + p1x) / 2 + nx * 11
    const my = (p0y + p1y) / 2 + ny * 11
    setFont(ctx, { size: lab, tracking: 0.12 })
    const tw = ctx.measureText(label).width
    text(ctx, label, clamp(mx, tw / 2 + 4, w - tw / 2 - 4), my + 3, { size: lab, color: k.ink, align: 'center', tracking: 0.12 })
    boxes.push(mx - tw / 2, my - 8, mx + tw / 2, my + 6)
    ctx.restore()
  }

  /** Big serif year during chapter III (in the readouts on cramped screens). */
  function yearClock(T: number, rho: number) {
    const a = smoothstep(LIGHT0 - 0.2, LIGHT0 + 0.8, T) * (1 - smoothstep(LIGHT1 + 1.6, LIGHT1 + 2.6, T))
    if (a <= 0.01 || preview || short) return
    const Y = Math.round(NOW - rho)
    const size = clamp(Math.min(w, h) * 0.11, 40, 120)
    const x = stacked ? pad : capX
    const y = pad + 30 + size * 0.8
    ctx.save()
    ctx.globalAlpha = a
    const tonight = rho < 1
    text(ctx, tonight ? 'Tonight' : String(Y), x, y, { font: 'serif', size, color: tonight ? k.accent : k.ink, italic: tonight })
    let note = 'CE · THE LIGHT NOW SETTING OUT'
    let best = -1
    for (let i = 0; i < stars.length; i++) if (rho <= stars[i].d && stars[i].d - rho < 160) best = i
    if (best >= 0) note = `CE · LIGHT LEAVES ${stars[best].name.toUpperCase()}`
    if (tonight) note = `${NOW} · ALL OF IT ARRIVES AT ONCE`
    text(ctx, note, x + 3, y + 20, { size: lab, color: tonight ? k.accent : k.ink2, tracking: 0.14 })
    ctx.restore()
    boxes.push(x, y - size, x + size * 2.6, y + 26)
  }

  function chapterAt(T: number) {
    return CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
  }

  function readouts(T: number, rho: number) {
    const rows: [string, string][] = []
    const camLy = Math.hypot(cam.c[0], cam.c[1], cam.c[2])
    if (cam.s < 0.08 && !dragging) {
      rows.push(['RA', '5H 35M'], ['DEC', '−1°'], ['FIELD', `${Math.round((2 * Math.atan(h / 2 / cam.F)) / deg)}°`])
    } else {
      rows.push(['CAMERA', `${fmt(Math.round(camLy / 10) * 10)} LY`], ['FROM', 'EARTH'])
      rows.push(['DEPTH', '250–1,300 LY'])
    }
    if (T >= LIGHT0 - 0.2 && T < LIGHT1 + 2.4) {
      rows.length = 0
      rows.push(['YEAR', rho < 1 ? String(NOW) : `${Math.round(NOW - rho)} CE`], ['LOOKBACK', `${fmt(Math.round(rho))} YR`])
    }
    if (preview) rows.length = Math.min(rows.length, 2)
    const small = preview || tiny || short
    let y = pad + 10
    for (const [label, value] of rows) {
      setFont(ctx, { size: small ? 9 : 10.5, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, value, w - pad, y, { size: small ? 9 : 10.5, color: k.ink, align: 'right', tracking: 0.06 })
      text(ctx, label, w - pad - vw - 10, y, { size: small ? 8 : 9.5, color: k.muted, align: 'right', tracking: 0.14 })
      y += small ? 13 : 16
    }
    readoutBottom = y
  }
  let readoutBottom = 0

  function reserveChrome(T: number) {
    // keep star labels off the kicker, the readouts and the caption
    boxes.push(0, 0, Math.min(w * 0.5, 280), pad + 16)
    boxes.push(w - 190, 0, w, Math.max(readoutBottom, pad + 40))
    const capOn = CAPTIONS.some((c) => T > c.t0 - 0.3 && T < c.t1 + 0.3)
    if (capOn) boxes.push(capX - 4, capBottom - capSize * (stacked && w < 520 ? 3.3 : 2.3) - 18, capX + capW, capBottom + 4)
  }

  function chrome(T: number) {
    const ch = chapterAt(T)
    const small = preview || tiny
    text(ctx, short || small ? `${FIG} — Orion` : `${FIG} — Orion in depth`, pad, pad + 10, { size: small ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    // chapter label above the caption
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(62.6, 63.8, T) : 1)
    const capOn = CAPTIONS.find((cc) => T > cc.t0 - 0.3 && T < cc.t1 + 0.3)
    let lines = 1
    if (capOn) {
      let size = capSize
      const maxLines = stacked && w < 520 ? 3 : 2
      for (let iter = 0; iter < 8; iter++) {
        lines = wrap(parseWords(capOn.text), size, capW).length
        if (lines <= maxLines) break
        size *= 0.9
      }
    }
    const capTop = capBottom - (capOn ? lines : 2) * capSize * 1.06
    if (!tiny) text(ctx, `${c.num} — ${c.name}`, capX, capTop - (small ? 6 : 10), { size: small ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true, alpha: kIn })
    // chapter ruler
    if (!preview && !tiny) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 32; i++) {
        const x = lerp(x0, x1, i / 32)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 4 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      CHAPTERS.forEach((cc, i) => {
        const x = lerp(x0, x1, cc.t / LOOP)
        text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
      })
      if (hoverRuler >= 0) {
        const hx = clamp(hoverRuler, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = chapterAt(ht)
        ctx.strokeStyle = k.sky
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${CHAPTERS[hc].name}`, clamp(hx, x0 + 50, x1 - 50), yb - 17, { size: 9, color: k.sky, align: 'center', tracking: 0.12, upper: true })
      }
    }
  }

  function infoCard(i: number) {
    if (!SOK[i]) return
    const st = stars[i]
    const a = ease.outCubic(clamp((wall - selectedAt) / 0.35))
    const fs = tiny ? 8.5 : 9.5
    const rows: [string, string][] = [
      ['TYPE', st.kind],
      ['CLASS', st.sp],
      ['TEMP', `≈ ${fmt(st.T)} K`],
      ['DIST', `${fmt(st.d)} LY`],
      ['RANGE', `${fmt(st.lo)}–${fmt(st.hi)} LY`],
      ['LEFT', `≈ ${st.year} CE`],
    ]
    const labW = tiny ? 50 : 58
    let vw = 0
    for (const [, v] of rows) {
      setFont(ctx, { size: fs, tracking: 0.06 })
      vw = Math.max(vw, ctx.measureText(v).width)
    }
    const cw = Math.max(tiny ? 150 : 176, labW + vw + 44)
    const rowH = fs + 5.5
    const head = tiny ? 26 : 30
    const ch = head + rows.length * rowH + 8
    // beside the star if there is room, else above or below it; never over it
    const r = SR[i] + 16
    const cands: [number, number][] = [
      [SX[i] + r, SY[i] - ch / 2],
      [SX[i] - r - cw, SY[i] - ch / 2],
      [SX[i] - cw / 2, SY[i] + r],
      [SX[i] - cw / 2, SY[i] - r - ch],
    ]
    let x = cands[0][0]
    let y = cands[0][1]
    let best = Infinity
    for (const [cx0, cy0] of cands) {
      const cx = clamp(cx0, pad, w - pad - cw)
      const cy = clamp(cy0, pad + 16, h - pad - ch - 12)
      const covers = cx < SX[i] + SR[i] + 8 && cx + cw > SX[i] - SR[i] - 8 && cy < SY[i] + SR[i] + 8 && cy + ch > SY[i] - SR[i] - 8
      const cost = Math.abs(cx - cx0) + Math.abs(cy - cy0) + (covers ? 1e4 : 0)
      if (cost < best) {
        best = cost
        x = cx
        y = cy
      }
    }
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgba(9,24,30,0.93)'
    ctx.fillRect(x, y, cw, ch)
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(cw), Math.round(ch))
    // a leader from the card's nearest edge to the star
    const ex = clamp(SX[i], x, x + cw)
    const ey = clamp(SY[i], y, y + ch)
    const L = Math.hypot(SX[i] - ex, SY[i] - ey)
    if (L > SR[i] + 10) {
      ctx.strokeStyle = k.muted
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(SX[i] + ((ex - SX[i]) / L) * (SR[i] + 9), SY[i] + ((ey - SY[i]) / L) * (SR[i] + 9))
      ctx.stroke()
    }
    text(ctx, st.name, x + 10, y + head - 8, { font: 'serif', size: tiny ? 17 : 20, color: k.ink })
    text(ctx, st.bayer, x + cw - 10, y + head - 9, { size: fs - 0.5, color: k.muted, align: 'right', tracking: 0.1 })
    rows.forEach(([l, v], ri) => {
      const yy = y + head + (ri + 1) * rowH - 2
      text(ctx, l, x + 10, yy, { size: fs - 1, color: k.muted, tracking: 0.14 })
      text(ctx, v, x + 10 + labW, yy, { size: fs, color: ri === rows.length - 1 ? k.sky : k.ink, tracking: 0.06 })
      if (l === 'TEMP') {
        // the star's color, as a swatch: what this temperature looks like
        setFont(ctx, { size: fs, tracking: 0.06 })
        const sx = x + 10 + labW + ctx.measureText(v).width + 8
        ctx.fillStyle = st.col
        ctx.fillRect(sx, yy - fs + 1.5, 18, fs - 2)
      }
    })
    ctx.restore()
  }

  /* the ghost: a dotted arc and a moving dot under the figure, early in full mode */
  const G0 = 2.6
  const G1 = 7.6
  function ghost() {
    if (preview || touched || wall < G0 || wall > G1) return null
    return { u: (wall - G0) / (G1 - G0) }
  }
  function ghostDraw(g: { u: number } | null) {
    if (!g) return
    const a = smoothstep(0, 0.1, g.u) * (1 - smoothstep(0.88, 1, g.u))
    // over open sky: the left column when the figure stands to the right, else under the figure
    const cx = stacked ? vx0 : capX + Math.min(capW, 300) / 2
    const cy = stacked ? Math.min(h - pad - 40, vy0 + (h * 0.5 - pad) * 0.62) : h * 0.42
    const rx = Math.min(90, w * 0.14)
    const pos = Math.sin(g.u * TAU) * 0.5 + 0.5
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.setLineDash([1.5, 3.5])
    ctx.beginPath()
    ctx.ellipse(cx, cy - 8, rx, 10, 0, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
    ctx.setLineDash([])
    const ang = lerp(0.85 * Math.PI, 0.15 * Math.PI, pos)
    const dx = cx + Math.cos(ang) * rx
    const dy = cy - 8 + Math.sin(ang) * 10
    ctx.fillStyle = k.ink
    ctx.beginPath()
    ctx.arc(dx, dy, 3.5, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(dx, dy, 9, 0, TAU)
    ctx.stroke()
    text(ctx, tiny ? 'DRAG · TAP A STAR' : 'DRAG TO ORBIT · TAP A STAR', cx, cy + 22, { size: 9, color: k.ink, tracking: 0.14, align: 'center' })
    ctx.restore()
  }

  function hints(T: number) {
    if (preview || tiny) return
    let msg = ''
    if (dragging) msg = 'ORBITING · THE CLOCK WAITS'
    else if (!touched && wall > G1 && T > OUT1 && T < BACK0) msg = 'DRAG TO LOOK AROUND · TAP A STAR'
    else if (hover >= 0 && selected !== hover) msg = 'TAP FOR ITS CARD'
    if (!msg) return
    text(ctx, msg, w - pad, rulerY - 22, { size: 9, color: k.muted, align: 'right', tracking: 0.14 })
  }

  /* ------------------------------------------------------------ instance */

  /* ------------------------------------------------------------ test hook: ?sim=drag replays a gesture */

  const sim = preview ? '' : env.params.get('sim') ?? ''
  let simApi: PieceInstance | null = null
  let simStage = 0
  function simulate() {
    if (!sim || !simApi?.pointer) return
    const P = (type: PointerInfo['type'], x: number, y: number, pressed: boolean) => simApi?.pointer?.({ type, x, y, id: 1, pointerType: 'mouse', pressed })
    const x0 = vx0 - 80
    const y0 = vy0 + 30
    if (sim === 'drag') {
      if (simStage === 0 && wall >= 0.2) {
        P('down', x0, y0, true)
        simStage = 1
      } else if (simStage === 1) {
        const u = clamp((wall - 0.2) / 0.6)
        P('move', x0 + u * 240, y0 + u * 30, true)
        if (u >= 1) simStage = 2
      } else if (simStage === 2 && wall > 0.9) {
        P('up', x0 + 240, y0 + 30, false)
        simStage = 3
      }
    }
  }

  const api: PieceInstance = {
    resize() {
      layout()
      labelPick.fill(-1)
    },
    frame,
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        pointerIn = false
        hover = -1
        hoverRuler = -1
        if (dragging) holdUntil = wall + 2.5
        dragging = false
        scrubbing = false
        return
      }
      pointerIn = true
      const ruler = onRuler(p.x, p.y)
      hoverRuler = ruler || scrubbing ? p.x : -1
      if (p.type === 'down') {
        touched = true
        if (ruler) {
          scrubbing = true
          seekTo(p.x)
          return
        }
        downX = lastX = p.x
        downY = lastY = p.y
        downWall = wall
        moved = 0
        dragging = true
        return
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      if (p.type === 'move') {
        if (dragging && p.pressed) {
          const dx = p.x - lastX
          const dy = p.y - lastY
          moved += Math.abs(dx) + Math.abs(dy)
          if (moved > (touch ? 10 : 5)) {
            yawU = clamp(yawU - dx * 0.0062, -Math.PI * 1.1, Math.PI * 1.1)
            pitchU = clamp(pitchU + dy * 0.0062, -1.35, 1.35)
          }
          lastX = p.x
          lastY = p.y
          hover = -1
        } else hover = hitStar(p.x, p.y)
        return
      }
      if (p.type === 'up') {
        if (dragging) {
          const tap = moved < (touch ? 14 : 8) && wall - downWall < 0.5
          dragging = false
          if (tap) {
            const hit = hitStar(downX, downY)
            if (hit >= 0) {
              selected = hit === selected ? -1 : hit
              selectedAt = wall
              if (selected >= 0) sfx.tone(noteFor(hit), 1.6, { type: 'sine', gain: 0.05, room: 0.5 })
            } else selected = -1
          } else holdUntil = wall + 2.8
        }
      }
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      const T = curT
      if (code === 'ArrowRight') {
        const next = CHAPTERS.find((c) => c.t > T + 0.01)
        clock += (next ? next.t : LOOP) - T
      } else {
        const i = chapterAt(T)
        const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
        clock += target - T
      }
      yawU = pitchU = 0
      holdUntil = -1
      return true
    },
  }
  simApi = api
  return api
}

export default create
