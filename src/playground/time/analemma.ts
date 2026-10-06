/*
 * T.10 — ANALEMMA
 *
 * Photograph the Sun at the same clock time every day for a year and the
 * pictures stack into a figure eight. The Sun is computed, not drawn: for
 * each day the Astronomical Almanac's low-precision solar formulae give the
 * mean longitude L, the mean anomaly g and the ecliptic longitude λ, and from
 * them the right ascension α, the declination δ and the equation of time
 *   E = L − α = (L − λ) + (λ − α)
 *             = the ellipse (−1.915° sin g …) + the tilt (reduction to the equator),
 * good to well under a minute. The Sun's place in the sky at clock time t is
 * then hour angle H = 15°(t − 12 h) + E at declination δ, seen from the
 * chosen latitude by a camera facing the equator.
 *
 *   I    Noon             the clock says noon; the Sun is not on the meridian
 *   II   A year           a disc every four days builds the composite
 *   III  Two causes       the figure without its ellipse, then without its tilt
 *   IV   The dial         a sundial's noon shadow drifting through the year
 *
 * Full mode: drag the sky — up and down for latitude, sideways for the clock
 * time — and the figure tilts, climbs and leans; drag along the charts to
 * scrub the day; tap to show the two causes. ← → chapters, ↑ ↓ latitude.
 */

import { C, TAU, clamp, cropMarks, damp, ease, lerp, makeNoise, mod, rgba, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. T.10'
const LOOP = 84
const DEG = Math.PI / 180
const YEAR = 365
/** days from J2000.0 to 2026 January 1, 0 h UT */
const N0 = 9496.5
/** a disc every STAMP days */
const STAMP = 5
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MSTART = MDAYS.reduce<number[]>((acc, _, i) => (acc.push(i ? acc[i - 1] + MDAYS[i - 1] : 1), acc), [])
// D major pentatonic over two octaves, for the shutter notes
const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77]

const CHAPTERS = [
  { t: 0, num: 'I', name: 'Noon' },
  { t: 12, num: 'II', name: 'A year' },
  { t: 46, num: 'III', name: 'Two causes' },
  { t: 66, num: 'IV', name: 'The dial' },
]

interface Caption {
  t0: number
  t1: number
  a: string
  em: string
}
const CAPTIONS: Caption[] = [
  { t0: 1.2, t1: 11.2, a: 'Noon is not always ', em: 'at noon.' },
  { t0: 16, t1: 30, a: 'The year draws itself ', em: 'in the sky.' },
  { t0: 46.8, t1: 58.5, a: 'Two causes: ', em: 'a tilt and an ellipse.' },
  { t0: 69, t1: 80.5, a: 'The Sun keeps ', em: 'its own time.' },
]

/* ------------------------------------------------------------ the Sun */

interface Sun {
  /** equation of time, minutes (sundial minus clock), and its two parts */
  eot: number
  ecc: number
  obl: number
  /** declination, radians */
  dec: number
}
const wrap180 = (d: number) => mod(d + 180, 360) - 180
/**
 * The Sun on day `day` (1 = Jan 1, fractional) at `hour` (UT = local mean time
 * on the reference meridian). kE and kT scale the orbit's eccentricity and the
 * axis's tilt, so the piece can switch each cause off.
 */
function sunAt(day: number, hour: number, kE = 1, kT = 1, out?: Sun): Sun {
  const n = N0 + (day - 1) + hour / 24
  const L = 280.46 + 0.9856474 * n
  const g = (357.528 + 0.9856003 * n) * DEG
  const C = kE * (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g))
  const lam = (L + C) * DEG
  const eps = kT * (23.439 - 0.0000004 * n) * DEG
  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / DEG
  const o = out ?? { eot: 0, ecc: 0, obl: 0, dec: 0 }
  o.ecc = -C * 4
  o.obl = wrap180(lam / DEG - alpha) * 4
  o.eot = o.ecc + o.obl
  o.dec = Math.asin(Math.sin(eps) * Math.sin(lam))
  return o
}

/** sky coordinates (degrees) of a direction at declination dec, hour angle H, for a camera facing the equator */
function skyXY(dec: number, H: number, lat: number, out: { x: number; y: number }) {
  const cd = Math.cos(dec)
  const east = -cd * Math.sin(H)
  const north = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * cd * Math.cos(H)
  const up = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * cd * Math.cos(H)
  if (lat >= 0) {
    out.x = Math.asin(clamp(-east, -1, 1)) / DEG
    out.y = Math.atan2(up, -north) / DEG
  } else {
    out.x = Math.asin(clamp(east, -1, 1)) / DEG
    out.y = Math.atan2(up, north) / DEG
  }
  return out
}

const dateOf = (day: number) => {
  const d = Math.floor(mod(day - 1, YEAR)) + 1
  let m = 0
  while (m < 11 && d >= MSTART[m + 1]) m++
  return `${MONTHS[m]} ${String(d - MSTART[m] + 1).padStart(2, '0')}`
}
const fmtMin = (min: number) => {
  const s = Math.round(Math.abs(min) * 60)
  return `${min < -0.5 / 60 ? '−' : min > 0.5 / 60 ? '+' : '±'}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const fmtClock = (hour: number) => {
  const m = Math.round(mod(hour, 24) * 60)
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const fmtLat = (lat: number) => `${Math.abs(lat / DEG).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`

/* ------------------------------------------------------------ the clock */

/** day of the year at piece time T (fractional, 1 = Jan 1) */
function dayAt(T: number) {
  if (T < 1.5) return 1
  if (T < 12) return 1 + 41 * ease.inOutSine((T - 1.5) / 10.5)
  if (T < 46) {
    // a steady ~9.5 days a second
    return 42 + 324 * ((T - 12) / 34)
  }
  if (T < 66) return 1 + mod((T - 46) * 18.25, YEAR)
  if (T < 82) return 1 + 365 * ease.inOutSine((T - 66) / 16)
  return 1
}

/* ------------------------------------------------------------ the piece */

interface Layout {
  stack: boolean
  tight: boolean
  mini: boolean
  pad: number
  // sky panel
  sx: number
  sy: number
  sw: number
  sh: number
  horizon: number
  // equation-of-time chart
  ex: number
  ey: number
  ew: number
  eh: number
  // declination chart
  dx: number
  dy: number
  dw: number
  dh: number
  // the sundial (radius 0: not shown)
  ux: number
  uy: number
  ur: number
  capX: number
  capY: number
  capSize: number
  capW: number
  oneLine: boolean
  rulerY: number
  hudRow: boolean
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  // ?perf (test route): the mean cost of a frame, printed at the bottom
  const perfOn = env.params.has('perf')
  let perfSum = 0
  let perfN = 0
  const preview = env.mode === 'preview'
  const sfx = env.sfx
  const noise = makeNoise(1010)
  let w = env.width
  let h = env.height
  let L = layoutFor(w, h)

  // state
  const at = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(at) ? at : preview ? 40 : 0
  let prevT = -1
  let lat = (Number(env.params.get('lat')) || 51.48) * DEG
  let clock = Number(env.params.get('clock')) || 12
  let decomp = env.params.get('decomp') === '1'
  let decompK = decomp ? 1 : 0
  let used = false
  let drag: { mode: 'sky' | 'scrub'; x: number; y: number; lat: number; clock: number; moved: boolean; ms: number; id: number } | null = null
  let hoverSky = false
  let touch = false
  let scrubRuler = false
  let hoverX = -1
  // the view: px per degree and the centre (degrees), eased
  let viewK = 0
  let viewX = 0
  let viewTop = 70

  // per-day positions
  const DAYS = YEAR + 1
  const px = new Float32Array(DAYS)
  const py = new Float32Array(DAYS)
  const eotD = new Float32Array(DAYS)
  const eccD = new Float32Array(DAYS)
  const oblD = new Float32Array(DAYS)
  const decD = new Float32Array(DAYS)
  const tmpSun: Sun = { eot: 0, ecc: 0, obl: 0, dec: 0 }
  const tmpXY = { x: 0, y: 0 }
  // the reference curves (both causes), for the charts
  const refE = new Float32Array(DAYS)
  const refEcc = new Float32Array(DAYS)
  const refObl = new Float32Array(DAYS)
  const refDec = new Float32Array(DAYS)
  for (let d = 1; d <= YEAR; d++) {
    const s = sunAt(d, 12)
    refE[d] = s.eot
    refEcc[d] = s.ecc
    refObl[d] = s.obl
    refDec[d] = s.dec
  }
  // landmarks: solstices and the four days the dial agrees with the clock
  const EOT_ZERO: number[] = []
  for (let d = 1; d < YEAR; d++) if (Math.sign(refE[d]) !== Math.sign(refE[d + 1])) EOT_ZERO.push(d + refE[d] / (refE[d] - refE[d + 1]))
  let dMin = 1
  let dMax = 1
  let eMinD = 1
  let eMaxD = 1
  for (let d = 1; d <= YEAR; d++) {
    if (refDec[d] < refDec[dMin]) dMin = d
    if (refDec[d] > refDec[dMax]) dMax = d
    if (refE[d] < refE[eMinD]) eMinD = d
    if (refE[d] > refE[eMaxD]) eMaxD = d
  }

  /* --------------------------------------------------------------- layout */

  function layoutFor(W: number, H: number): Layout {
    const stack = W < H * 1.15
    const mini = preview || H < 260 || W < 300
    const tight = mini || H < 470 || W < 700
    const pad = Math.round(clamp(Math.min(W, H) * 0.04, preview ? 10 : 12, 36))
    const rulerH = preview ? 0 : mini ? 12 : 18
    const lay = { stack, tight, mini, pad, hudRow: false } as Layout
    lay.rulerY = H - pad * 0.55
    if (!stack) {
      const capTop = H < 540
      const capSize = capTop ? clamp(H * 0.055, 13, 21) : clamp(Math.min(W * 0.03, H * 0.046), 22, 46)
      const headH = (mini ? 24 : tight ? 32 : 44) + (capTop && !preview ? capSize + 8 : 0)
      const top = pad + headH
      const bottom = H - pad - rulerH - (mini ? 0 : 4)
      lay.oneLine = capTop
      lay.capSize = capSize
      if (H < 420) {
        // wide and short: the sky on the left, the charts stacked on the right
        const skyW = (W - pad * 2) * (W > H * 2.3 ? 0.5 : 0.56)
        lay.sx = pad
        lay.sy = top
        lay.sw = skyW
        lay.sh = bottom - top
        const x0 = pad + skyW + (mini ? 12 : 22)
        const colW = W - pad - x0
        const lab = mini ? 10 : 12
        const gapY = mini ? 18 : 24
        const hh = (bottom - top - gapY - lab * 2) / 2
        lay.ex = x0 + 24
        lay.ew = colW - 24
        lay.ey = top + (preview ? 20 : 14)
        lay.eh = hh - (preview ? 20 : 14)
        const dialR = !mini && colW > 300 ? Math.min(hh * 0.5, colW * 0.16) : 0
        lay.dx = x0 + 24
        lay.dy = top + hh + gapY + lab
        lay.dh = hh - 4
        lay.dw = colW - 24 - (dialR ? dialR * 2 + 26 : 0)
        lay.ur = dialR
        lay.ux = W - pad - dialR
        lay.uy = lay.dy + lay.dh / 2
      } else {
        // the sky across the top, three instruments beneath
        const bandH = clamp((bottom - top) * 0.3, 120, 260)
        lay.sx = pad
        lay.sy = top
        lay.sw = W - pad * 2
        lay.sh = bottom - top - bandH - 30
        const by = lay.sy + lay.sh + 34
        const bh = bottom - by - 12
        const dialR = Math.min(bh * 0.5, (W - pad * 2) * 0.1)
        const rest = W - pad * 2 - dialR * 2 - 40
        lay.ex = pad + 26
        lay.ew = rest * 0.58 - 26
        lay.ey = by
        lay.eh = bh
        lay.dx = pad + rest * 0.58 + 50
        lay.dw = rest * 0.42 - 50
        lay.dy = by
        lay.dh = bh
        lay.ur = dialR
        lay.ux = W - pad - dialR
        lay.uy = by + bh / 2
      }
      if (capTop) {
        lay.capX = pad
        lay.capY = pad + headH - capSize - 12
        lay.capW = W - pad * 2
      } else {
        lay.capX = pad + 8
        lay.capW = lay.sw * 0.42
        lay.capY = lay.sy + 14
      }
      lay.horizon = lay.sy + lay.sh * (lay.sh < 220 ? 0.84 : 0.86)
      return lay
    }
    // stacked: sky, equation of time, declination + dial, caption
    const short = H < 640
    lay.hudRow = !short
    const capSize = clamp(Math.min(W * 0.062, H * 0.034), 15, 30)
    const headH = short ? 34 : 70
    const top = pad + headH
    const bottom = H - pad - rulerH - 4
    const capBlock = capSize * 2.3 + 20
    const avail = bottom - top - capBlock
    lay.sx = pad
    lay.sw = W - pad * 2
    lay.sy = top
    lay.sh = avail * (short ? 0.5 : 0.52)
    const lab = 12
    const rowH = (avail - lay.sh - 28 - lab * 2) / 2
    lay.ex = pad + 24
    lay.ew = W - pad * 2 - 24
    lay.ey = lay.sy + lay.sh + 28
    lay.eh = rowH
    let dialR = Math.min(rowH * 0.5, W * 0.14)
    if (dialR < 26) dialR = 0
    lay.dx = pad + 24
    lay.dy = lay.ey + rowH + 24 + lab
    lay.dh = rowH - 4
    lay.dw = W - pad * 2 - 24 - (dialR ? dialR * 2 + 22 : 0)
    lay.ur = dialR
    lay.ux = W - pad - dialR
    lay.uy = lay.dy + lay.dh / 2
    lay.capSize = capSize
    lay.oneLine = false
    lay.capX = pad
    lay.capY = bottom - capSize * 2.2
    lay.capW = W - pad * 2
    lay.horizon = lay.sy + lay.sh * 0.84
    return lay
  }

  /* -------------------------------------------------------------- helpers */

  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    ctx.save()
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.92)
    ctx.strokeText(o?.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }
  const measure = (str: string, size: number, font: 'mono' | 'serif' = 'mono', italic = false) => {
    setFont(ctx, { size, font, italic, tracking: font === 'mono' ? 0.14 : 0 })
    return ctx.measureText(str).width
  }
  function hatchRect(gap: number, angle: number, x: number, y: number, ww: number, hh: number) {
    const cx = x + ww / 2
    const cy = y + hh / 2
    const R = Math.hypot(ww, hh) / 2 + gap
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    ctx.beginPath()
    for (let d = -R; d <= R; d += gap) {
      const qx = cx - sa * d
      const qy = cy + ca * d
      ctx.moveTo(qx - ca * R, qy - sa * R)
      ctx.lineTo(qx + ca * R, qy + sa * R)
    }
    ctx.stroke()
  }

  /* ---------------------------------------------------------- the model */

  /** morph weights for the two causes at time T */
  function causesAt(T: number) {
    // III: ellipse off (tilt only), then tilt off (ellipse only), then both
    const offE = smoothstep(49.5, 53, T) * (1 - smoothstep(55, 58.5, T))
    const offT = smoothstep(55, 58.5, T) * (1 - smoothstep(60.5, 64, T))
    return { kE: 1 - offE, kT: 1 - offT }
  }

  /** positions for every day, at the current clock time and latitude */
  function computeYear(kE: number, kT: number) {
    for (let d = 1; d <= YEAR; d++) {
      sunAt(d, clock, kE, kT, tmpSun)
      eotD[d] = tmpSun.eot
      eccD[d] = tmpSun.ecc
      oblD[d] = tmpSun.obl
      decD[d] = tmpSun.dec
      const H = (15 * (clock - 12) + tmpSun.eot / 4) * DEG
      skyXY(tmpSun.dec, H, lat, tmpXY)
      px[d] = tmpXY.x
      py[d] = tmpXY.y
    }
  }

  // the same figure photographed at the other whole hours, faint, for the tilt
  const HOURS = [9, 10, 11, 12, 13, 14, 15]
  const hourX = new Float32Array(HOURS.length * DAYS)
  const hourY = new Float32Array(HOURS.length * DAYS)
  let hourKey = ''
  function computeHours(kE: number, kT: number) {
    const key = `${lat.toFixed(5)}|${kE.toFixed(4)}|${kT.toFixed(4)}`
    if (key === hourKey) return
    hourKey = key
    HOURS.forEach((hr, k) => {
      for (let d = 1; d <= YEAR; d++) {
        sunAt(d, hr, kE, kT, tmpSun)
        skyXY(tmpSun.dec, (15 * (hr - 12) + tmpSun.eot / 4) * DEG, lat, tmpXY)
        hourX[k * DAYS + d] = tmpXY.x
        hourY[k * DAYS + d] = tmpXY.y
      }
    })
  }

  /* ------------------------------------------------------------ the view */

  function updateView(dt: number) {
    let x0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (let d = 1; d <= YEAR; d++) {
      x0 = Math.min(x0, px[d])
      x1 = Math.max(x1, px[d])
      y1 = Math.max(y1, py[d])
    }
    const above = L.horizon - L.sy - (L.mini ? 10 : 22)
    const top = Math.max(62, y1 + 7)
    const k = above / top
    const half = L.sw / 2 / k
    let cx = 0
    if (x1 - x0 > half * 2 - 6) cx = (x0 + x1) / 2
    else cx = clamp(0, x1 - half + 4, x0 + half - 4)
    const kk = dt > 0 && viewK > 0 ? damp(5, dt) : 1
    viewK += (k - viewK) * kk
    viewX += (cx - viewX) * kk
    viewTop += (top - viewTop) * kk
  }
  const sxOf = (xDeg: number) => L.sx + L.sw / 2 + (xDeg - viewX) * viewK
  const syOf = (yDeg: number) => L.horizon - yDeg * viewK

  /* ------------------------------------------------------------ the sky */

  function drawSky(T: number, day: number, A: number) {
    const { sx, sy, sw, sh, horizon } = L
    ctx.save()
    ctx.globalAlpha = A
    ctx.beginPath()
    ctx.rect(sx, sy, sw, sh)
    ctx.clip()
    ctx.lineWidth = 1
    const reveal = ease.inOutCubic(clamp((T - 0.1) / 1.6))

    // altitude ticks along the right edge, every 5°
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    for (let a = 0; a <= 120; a += 5) {
      const y = syOf(a)
      if (y < sy + 4) break
      ctx.moveTo(sx + sw, y)
      ctx.lineTo(sx + sw - (a % 10 === 0 ? 7 : 4), y)
    }
    ctx.stroke()
    if (!L.mini) {
      for (let a = 10; a <= 120; a += 10) {
        const y = syOf(a)
        if (y < sy + 10) break
        if (y > horizon - 8) continue
        if (a % 20 !== 0 && viewK < 4) continue
        text(ctx, a > 90 ? `${180 - a}° ${lat >= 0 ? 'N' : 'S'}` : `${a}°`, sx + sw - 10, y + 3, { size: 7.5, color: C.muted, align: 'right', tracking: 0.06 })
      }
    }

    // the Sun's day-paths at the solstices and equinoxes
    const da = smoothstep(1.2, 3, T)
    if (da > 0) {
      ctx.save()
      ctx.globalAlpha = A * da
      // (with the tilt switched off there are no solstices: the paths close up on the equator)
      const kT = causesAt(T).kT
      ctx.setLineDash([2, 4])
      for (const dd of [23.44, 0, -23.44]) {
        ctx.strokeStyle = rgba(C.ink, dd === 0 ? 0.3 : 0.22)
        ctx.beginPath()
        let on = false
        for (let i = -90; i <= 90; i++) {
          skyXY(dd * kT * DEG, i * 1.5 * DEG, lat, tmpXY)
          if (tmpXY.y < 0) {
            on = false
            continue
          }
          const X = sxOf(tmpXY.x)
          const Y = syOf(tmpXY.y)
          if (on) ctx.lineTo(X, Y)
          else ctx.moveTo(X, Y)
          on = true
        }
        ctx.stroke()
      }
      // today's path across the sky, sunrise to sunset
      if (T > 3 && T < 82) {
        const kk = causesAt(T)
        const sd = sunAt(clamp(day, 1, YEAR), 12, kk.kE, kk.kT, tmpSun).dec
        ctx.strokeStyle = rgba(C.ocean, 0.45)
        ctx.setLineDash([1, 3])
        ctx.beginPath()
        let on = false
        for (let i = -90; i <= 90; i++) {
          skyXY(sd, i * 1.5 * DEG, lat, tmpXY)
          if (tmpXY.y < 0) {
            on = false
            continue
          }
          const X = sxOf(tmpXY.x)
          const Y = syOf(tmpXY.y)
          if (on) ctx.lineTo(X, Y)
          else ctx.moveTo(X, Y)
          on = true
        }
        ctx.stroke()
        ctx.setLineDash([2, 4])
      }
      if (!L.mini && sw > 420 && horizon - sy > 160) {
        ctx.setLineDash([])
        const ly = horizon - (L.sh < 300 ? 26 : 34)
        ctx.strokeStyle = rgba(C.ink, 0.3)
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(sx + 12, ly - 3)
        ctx.lineTo(sx + 34, ly - 3)
        ctx.stroke()
        ctx.setLineDash([])
        halo('THE SUN’S DAY AT THE SOLSTICES AND EQUINOXES', sx + 40, ly, { size: 7.5, color: C.muted, tracking: 0.14 })
      }
      ctx.setLineDash([])
      // the meridian
      ctx.strokeStyle = rgba(C.ink, 0.3)
      ctx.setLineDash([1, 3])
      const mx = sxOf(0)
      ctx.beginPath()
      ctx.moveTo(mx, horizon)
      ctx.lineTo(mx, syOf(Math.min(viewTop, 120)))
      ctx.stroke()
      ctx.setLineDash([])
      if (!L.mini && syOf(90) > sy + 12) {
        halo('ZENITH', mx + 5, syOf(90) + 3, { size: 7.5, color: C.muted, tracking: 0.14 })
      }
      if (!L.mini && L.sy + L.sh - horizon > 24) halo(lat >= 0 ? 'DUE SOUTH' : 'DUE NORTH', mx, horizon + 14, { size: 7.5, color: C.muted, align: 'center', tracking: 0.14 })
      ctx.restore()
    }

    // ghost variants when the causes are shown: tilt only, ellipse only
    const vA = decompK * (1 - smoothstep(49, 50, T) * (1 - smoothstep(63.5, 64.5, T)))
    if (vA > 0.01) {
      ctx.save()
      ctx.globalAlpha = A * vA * 0.75
      for (const [kE, kT, col] of [
        [0, 1, C.ocean],
        [1, 0, C.fern],
      ] as const) {
        ctx.strokeStyle = col
        ctx.setLineDash(kT ? [4, 3] : [1, 2.5])
        ctx.beginPath()
        for (let d = 1; d <= YEAR; d += 2) {
          const s = sunAt(d, clock, kE, kT, tmpSun)
          skyXY(s.dec, (15 * (clock - 12) + s.eot / 4) * DEG, lat, tmpXY)
          const X = sxOf(tmpXY.x)
          const Y = syOf(tmpXY.y)
          if (d === 1) ctx.moveTo(X, Y)
          else ctx.lineTo(X, Y)
        }
        ctx.closePath()
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()
    }

    // the composite: the curve through every day so far, and a disc every five days
    const full = T >= 46 && T < 82
    const upTo = full ? YEAR : Math.min(YEAR, day)
    const fadeAll = 1 - smoothstep(82, 83.6, T)
    // the other hours, faint
    if (!L.mini && T > 12) {
      ctx.save()
      ctx.globalAlpha = A * fadeAll * 0.32 * smoothstep(12, 14, T) * (1 - 0.85 * dialPlace(T).hero)
      ctx.strokeStyle = C.ink2
      ctx.beginPath()
      HOURS.forEach((hr, k) => {
        if (Math.abs(hr - clock) < 0.4) return
        let pen = false
        let topY = Infinity
        let topX = 0
        for (let d = 1; d <= Math.floor(upTo); d++) {
          const yd = hourY[k * DAYS + d]
          if (yd < 0) {
            pen = false
            continue
          }
          const X = sxOf(hourX[k * DAYS + d])
          const Y = syOf(yd)
          if (pen) ctx.lineTo(X, Y)
          else ctx.moveTo(X, Y)
          pen = true
          if (Y < topY) {
            topY = Y
            topX = X
          }
        }
        if (full && hourY[k * DAYS + 1] >= 0 && hourY[k * DAYS + YEAR] >= 0) ctx.lineTo(sxOf(hourX[k * DAYS + 1]), syOf(hourY[k * DAYS + 1]))
        if (topY < Infinity && topY > sy + 14 && viewK * 15 > 34) text(ctx, `${String(hr).padStart(2, '0')}:00`, topX, topY - 7, { size: 7.5, color: C.ink2, align: 'center', tracking: 0.08 })
      })
      ctx.stroke()
      ctx.restore()
    }
    ctx.save()
    ctx.globalAlpha = A * fadeAll
    ctx.strokeStyle = rgba(C.ink, 0.55)
    ctx.beginPath()
    let first = true
    for (let d = 1; d <= Math.floor(upTo); d++) {
      if (py[d] < -2) {
        first = true
        continue
      }
      const X = sxOf(px[d])
      const Y = syOf(py[d])
      if (first) ctx.moveTo(X, Y)
      else ctx.lineTo(X, Y)
      first = false
    }
    if (full && py[1] > -2 && py[YEAR] > -2) ctx.lineTo(sxOf(px[1]), syOf(py[1]))
    ctx.stroke()
    const rD = clamp(viewK * 0.5, 1.8, L.mini ? 2.6 : 3.6)
    const discs = new Path2D()
    const hatchP = new Path2D()
    for (let d = 1; d <= upTo; d += STAMP) {
      if (py[d] < -0.3) continue
      const X = sxOf(px[d])
      const Y = syOf(py[d])
      const age = full ? 9 : (day - d) / 9.5
      const s = ease.outBack(clamp(age * 3))
      const r = rD * s
      if (r < 0.3) continue
      discs.moveTo(X + r, Y)
      discs.arc(X, Y, r, 0, TAU)
      // three chords at −45°: a hatched disc without a clip per disc
      for (const o of [-0.5, 0, 0.5]) {
        const c = Math.sqrt(Math.max(0, 1 - o * o)) * r
        const ox = o * r * Math.SQRT1_2
        const oy = o * r * Math.SQRT1_2
        hatchP.moveTo(X + ox - c * Math.SQRT1_2, Y - oy - c * Math.SQRT1_2)
        hatchP.lineTo(X + ox + c * Math.SQRT1_2, Y - oy + c * Math.SQRT1_2)
      }
    }
    ctx.fillStyle = C.paper
    ctx.fill(discs)
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.stroke(hatchP)
    ctx.strokeStyle = C.ink
    ctx.stroke(discs)
    ctx.restore()

    // landmarks on the figure (once it is complete)
    const lmA = smoothstep(44, 46.5, T) * (1 - smoothstep(48.5, 49.5, T)) + smoothstep(64, 65.5, T) * (1 - smoothstep(80, 81.5, T))
    if (lmA > 0.01 && !L.mini) {
      ctx.save()
      ctx.globalAlpha = A * lmA
      const marks: [number, string, number][] = [
        [dMax, 'JUN 21', -1],
        [dMin, 'DEC 21', 1],
        [eMinD, `${dateOf(eMinD)} · −14 MIN`, 0],
        [eMaxD, `${dateOf(eMaxD)} · +16 MIN`, 0],
      ]
      for (const [d, lab, side] of marks) {
        if (py[d] < 0) continue
        // in a small sky only the solstices are named
        if (!side && L.sw < 520) continue
        const X = sxOf(px[d])
        const Y = syOf(py[d])
        const dir = side || (px[d] >= viewX ? 1 : -1)
        ctx.strokeStyle = rgba(C.ink, 0.5)
        ctx.beginPath()
        ctx.moveTo(X + dir * 6, Y)
        ctx.lineTo(X + dir * 22, Y)
        ctx.stroke()
        halo(lab, X + dir * 26, Y + 3, { size: 7.5, color: C.ink2, align: dir > 0 ? 'left' : 'right', tracking: 0.12 })
      }
      ctx.restore()
    }

    // today's Sun, larger, with rays; and in chapter I the clock-versus-dial offset
    if (py[Math.max(1, Math.round(day))] > -0.5 && T < 82) {
      const di = clamp(day, 1, YEAR)
      sunAt(di, clock, 1, 1, tmpSun)
      const k = causesAt(T)
      const s2 = sunAt(di, clock, k.kE, k.kT, { eot: 0, ecc: 0, obl: 0, dec: 0 })
      skyXY(s2.dec, (15 * (clock - 12) + s2.eot / 4) * DEG, lat, tmpXY)
      const X = sxOf(tmpXY.x)
      const Y = syOf(tmpXY.y)
      const r = rD * 1.9
      const sunIn = ease.outBack(clamp((T - 0.8) / 0.8))
      ctx.save()
      ctx.globalAlpha = A * sunIn
      ctx.fillStyle = C.paper
      ctx.beginPath()
      ctx.arc(X, Y, r, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + T * 0.15
        ctx.moveTo(X + Math.cos(a) * (r + 2.5), Y + Math.sin(a) * (r + 2.5))
        ctx.lineTo(X + Math.cos(a) * (r + (i % 2 ? 5 : 7.5)), Y + Math.sin(a) * (r + (i % 2 ? 5 : 7.5)))
      }
      ctx.stroke()
      // chapter I: where the Sun would be at true noon
      const nA = smoothstep(2.5, 4, T) * (1 - smoothstep(11.2, 12.5, T))
      if (nA > 0.01 && Math.abs(clock - 12) < 0.01) {
        ctx.globalAlpha = A * nA
        skyXY(s2.dec, 0, lat, tmpXY)
        const X0 = sxOf(tmpXY.x)
        const Y0 = syOf(tmpXY.y)
        ctx.strokeStyle = C.ocean
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.arc(X0, Y0, r, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
        // a dimension from the true-noon place to the clock-noon place
        const yy = Y - r - 14
        ctx.beginPath()
        ctx.moveTo(X0, Y0 - r - 3)
        ctx.lineTo(X0, yy - 4)
        ctx.moveTo(X, Y - r - 3)
        ctx.lineTo(X, yy - 4)
        ctx.moveTo(X0, yy)
        ctx.lineTo(X, yy)
        ctx.stroke()
        const behind = s2.eot < 0
        if (!L.mini) {
          let lab = `${Math.abs(s2.eot).toFixed(1)} MIN ${behind ? 'BEHIND' : 'AHEAD OF'} THE CLOCK`
          if (measure(lab, 8.5) > Math.min(X, X0) - L.sx - 16) lab = `${Math.abs(s2.eot).toFixed(1)} MIN ${behind ? 'SLOW' : 'FAST'}`
          halo(lab, Math.min(X, X0) - 8, yy - 6, { size: 8.5, color: C.ocean, align: 'right', tracking: 0.12 })
          halo('TRUE NOON', X0 + (X0 > X ? 1 : -1) * (r + 6), Y0 + 3, { size: 7.5, color: C.ocean, align: X0 > X ? 'left' : 'right', tracking: 0.14 })
        }
      }
      if (!L.mini && T >= 4) {
        const lab = dateOf(day)
        ctx.globalAlpha = A * sunIn
        halo(lab, X + r + 10, Y + 3 + (T < 12 ? 16 : 0), { size: 8.5, color: C.ink, tracking: 0.14 })
      }
      ctx.restore()
    }

    // chapter III: what is switched off
    const k3 = causesAt(T)
    if (T > 49 && T < 64.5 && !L.mini) {
      const lab = k3.kE < 0.5 ? 'TILT ONLY · A CIRCULAR ORBIT' : k3.kT < 0.5 ? 'ELLIPSE ONLY · NO TILT' : 'TILT + ELLIPSE'
      const al = smoothstep(50.5, 51.5, T) * (1 - smoothstep(63.5, 64.5, T))
      halo(lab, sx + sw / 2, sy + 16, { size: 9, color: k3.kE < 0.5 ? C.ocean : k3.kT < 0.5 ? C.fern : C.ink, align: 'center', tracking: 0.16, alpha: al })
    }

    // the landscape: hills, a church on the meridian, the ground
    drawLand(T, reveal)

    ctx.restore()
    // frame
    ctx.strokeStyle = rgba(C.ink, 0.25)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, Math.round(sw), Math.round(sh))
  }

  function drawLand(T: number, reveal: number) {
    const { sx, sy, sw, sh, horizon } = L
    const k = viewK
    // hills: far (faint), near (hatched)
    const far = (xd: number) => 1.6 + 1.3 * noise.fbm2(xd * 0.035, 1.3, 3) + 0.8 * Math.sin(xd * 0.05)
    const near = (xd: number) => 0.6 + 1.6 * Math.max(0, noise.fbm2(xd * 0.02 + 7, 4.1, 3) + 0.15)
    const x0d = viewX - sw / 2 / k
    const x1d = viewX + sw / 2 / k
    const n = Math.max(40, Math.round(sw / 5))
    ctx.fillStyle = C.paper
    ctx.fillRect(sx, horizon, sw, sy + sh - horizon)
    // far ridge
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const xd = lerp(x0d, x1d, i / n)
      const X = sxOf(xd)
      const Y = horizon - far(xd) * k
      if (i) ctx.lineTo(X, Y)
      else ctx.moveTo(X, Y)
    }
    ctx.stroke()
    // near hill, filled paper so it hides the far ridge, lightly hatched
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx, horizon + 1)
    for (let i = 0; i <= n; i++) {
      const xd = lerp(x0d, x1d, i / n)
      ctx.lineTo(sxOf(xd), horizon - near(xd) * k)
    }
    ctx.lineTo(sx + sw, horizon + 1)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.clip()
    ctx.strokeStyle = rgba(C.moss, 0.28)
    hatchRect(L.mini ? 3 : 4, -Math.PI / 4, sx, horizon - 6 * k, sw, 6 * k + 2)
    ctx.restore()
    ctx.strokeStyle = rgba(C.ink, 0.8)
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const xd = lerp(x0d, x1d, i / n)
      const X = sxOf(xd)
      const Y = horizon - near(xd) * k
      if (i) ctx.lineTo(X, Y)
      else ctx.moveTo(X, Y)
    }
    ctx.stroke()
    // the horizon and the field in front, with furrows converging
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(sx, horizon)
    ctx.lineTo(sx + sw * reveal, horizon)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.14)
    ctx.beginPath()
    const vx = sxOf(0)
    for (let f = -12; f <= 12; f++) {
      const bx = vx + f * sw * 0.09
      ctx.moveTo(lerp(vx, bx, 0.12), horizon + (sy + sh - horizon) * 0.12)
      ctx.lineTo(bx, sy + sh)
    }
    for (let r = 1; r <= 4; r++) {
      const y = horizon + (sy + sh - horizon) * Math.pow(r / 4.4, 1.6)
      ctx.moveTo(sx, y)
      ctx.lineTo(sx + sw, y)
    }
    ctx.stroke()
    // the church: nave, tower, spire, on the meridian
    const cA = ease.outCubic(clamp((T - 0.6) / 1.4))
    const base = horizon - near(0) * k * 0.4
    const s = clamp(k * 1.05, 1.6, 7)
    const cx = sxOf(0)
    ctx.save()
    ctx.globalAlpha *= cA
    ctx.fillStyle = C.paper
    ctx.strokeStyle = C.ink
    // nave
    const nw = 9 * s
    const nh = 3.2 * s
    const tx = cx - 1.6 * s
    const tw = 3.2 * s
    const th = 6.5 * s
    const spire = 7.5 * s
    ctx.beginPath()
    ctx.rect(cx + 1.6 * s, base - nh, nw, nh)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + 1.6 * s, base - nh)
    ctx.lineTo(cx + 1.6 * s + nw * 0.12, base - nh - 2 * s)
    ctx.lineTo(cx + 1.6 * s + nw, base - nh - 2 * s)
    ctx.lineTo(cx + 1.6 * s + nw, base - nh)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.35)
    hatchRect(2.2, -Math.PI / 4, cx, base - nh - 2 * s, nw + 2 * s, 2 * s)
    ctx.restore()
    // tower and spire
    ctx.beginPath()
    ctx.rect(tx, base - th, tw, th)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(tx - 0.3 * s, base - th)
    ctx.lineTo(cx, base - th - spire)
    ctx.lineTo(tx + tw + 0.3 * s, base - th)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = rgba(C.ink, 0.4)
    hatchRect(2, Math.PI / 4, tx - s, base - th - spire, tw + 2 * s, spire)
    ctx.restore()
    // a cross, a belfry opening, nave windows
    ctx.beginPath()
    ctx.moveTo(cx, base - th - spire)
    ctx.lineTo(cx, base - th - spire - 1.4 * s)
    ctx.moveTo(cx - 0.5 * s, base - th - spire - 0.9 * s)
    ctx.lineTo(cx + 0.5 * s, base - th - spire - 0.9 * s)
    ctx.stroke()
    if (s > 2.4) {
      ctx.beginPath()
      ctx.moveTo(cx - 0.5 * s, base - th + 2.2 * s)
      ctx.lineTo(cx - 0.5 * s, base - th + 1.2 * s)
      ctx.arc(cx, base - th + 1.2 * s, 0.5 * s, Math.PI, 0)
      ctx.lineTo(cx + 0.5 * s, base - th + 2.2 * s)
      for (let i = 0; i < 4; i++) {
        const wx = cx + 1.6 * s + nw * (0.22 + i * 0.2)
        ctx.moveTo(wx - 0.35 * s, base - 0.6 * s)
        ctx.lineTo(wx - 0.35 * s, base - 2 * s)
        ctx.arc(wx, base - 2 * s, 0.35 * s, Math.PI, 0)
        ctx.lineTo(wx + 0.35 * s, base - 0.6 * s)
      }
      ctx.stroke()
    }
    // a yew beside it
    ctx.beginPath()
    ctx.ellipse(cx - 6 * s, base - 3.4 * s, 2 * s, 3 * s, 0, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 6 * s, base)
    ctx.lineTo(cx - 6 * s, base - 0.6 * s)
    ctx.stroke()
    ctx.restore()
  }

  /* ---------------------------------------------------------- the charts */

  function chartFrame(x: number, y: number, ww: number, hh: number, title: string, reveal: number) {
    ctx.strokeStyle = rgba(C.ink, 0.22)
    ctx.beginPath()
    ctx.moveTo(x, y + 0.5)
    ctx.lineTo(x + ww * reveal, y + 0.5)
    ctx.moveTo(x, y + hh + 0.5)
    ctx.lineTo(x + ww * reveal, y + hh + 0.5)
    ctx.stroke()
    // month ticks
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    for (let m = 0; m <= 12; m++) {
      const d = m < 12 ? MSTART[m] : YEAR + 1
      const X = x + ((d - 1) / YEAR) * ww
      if (X > x + ww * reveal + 0.5) break
      ctx.moveTo(X, y + hh)
      ctx.lineTo(X, y + hh - 4)
    }
    ctx.stroke()
    if (hh > 40) {
      for (let m = 0; m < 12; m++) {
        const X = x + ((MSTART[m] - 1 + MDAYS[m] / 2) / YEAR) * ww
        const lab = ww < 300 ? MONTHS[m][0] : MONTHS[m]
        text(ctx, lab, X, y + hh + 11, { size: 7.5, color: C.muted, align: 'center', tracking: 0.08 })
      }
    }
    text(ctx, title, x, y - 7, { size: L.mini ? 7.5 : 8, color: C.muted, tracking: 0.14 })
  }

  function drawCharts(T: number, day: number, A: number) {
    const reveal = ease.inOutCubic(clamp((T - 0.5) / 1.8))
    const upTo = T >= 46 && T < 82 ? YEAR : clamp(day, 1, YEAR)
    const cur = clamp(day, 1, YEAR)
    const k3 = causesAt(T)
    const compA = Math.max(decompK, smoothstep(46.5, 48, T) * (1 - smoothstep(64, 66, T)))
    ctx.save()
    ctx.globalAlpha = A
    ctx.lineWidth = 1

    // the equation of time
    {
      const { ex: x, ey: y, ew: ww, eh: hh } = L
      const xOf = (d: number) => x + ((d - 1) / YEAR) * ww
      const yOf = (m: number) => y + hh / 2 - (m / 18) * (hh / 2)
      chartFrame(x, y, ww, hh, ww < 330 ? 'SUNDIAL − CLOCK' : 'EQUATION OF TIME · SUNDIAL MINUS CLOCK, MIN', reveal)
      ctx.strokeStyle = rgba(C.ink, 0.3)
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, yOf(0))
      ctx.lineTo(x + ww * reveal, yOf(0))
      ctx.stroke()
      ctx.setLineDash([])
      if (!L.mini) for (const m of [15, -15]) text(ctx, (m > 0 ? '+' : '−') + Math.abs(m), x - 5, yOf(m) + 3, { size: 7.5, color: C.muted, align: 'right', tracking: 0.04 })
      // components
      if (compA > 0.01) {
        ctx.save()
        ctx.globalAlpha = A * compA
        ctx.lineWidth = 1
        ctx.strokeStyle = C.fern
        ctx.setLineDash([4, 3])
        ctx.globalAlpha = A * compA * (0.35 + 0.65 * k3.kE)
        ctx.beginPath()
        for (let d = 1; d <= YEAR; d += 2) (d === 1 ? ctx.moveTo : ctx.lineTo).call(ctx, xOf(d), yOf(refEcc[d]))
        ctx.stroke()
        ctx.strokeStyle = C.ocean
        ctx.setLineDash([1, 2.5])
        ctx.globalAlpha = A * compA * (0.35 + 0.65 * k3.kT)
        ctx.beginPath()
        for (let d = 1; d <= YEAR; d += 2) (d === 1 ? ctx.moveTo : ctx.lineTo).call(ctx, xOf(d), yOf(refObl[d]))
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
        if (!L.mini && hh > 70) {
          ctx.save()
          ctx.globalAlpha = A * compA
          const lx = x + ww - 4
          halo(L.tight ? 'ELLIPSE ±7.7' : 'ELLIPSE · ONE SINE A YEAR · ±7.7 MIN', lx, y + 12, { size: 7.5, color: C.fern, align: 'right', tracking: 0.12 })
          halo(L.tight ? 'TILT ±9.9' : 'TILT · TWO A YEAR · ±9.9 MIN', lx, y + 24, { size: 7.5, color: C.ocean, align: 'right', tracking: 0.12 })
          ctx.restore()
        }
      }
      // the curve as the morph has it (both causes, or one)
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let d = 1; d <= Math.floor(upTo); d++) {
        const v = k3.kE * refEcc[d] + k3.kT * refObl[d]
        if (d === 1) ctx.moveTo(xOf(d), yOf(v))
        else ctx.lineTo(xOf(d), yOf(v))
      }
      ctx.stroke()
      ctx.lineWidth = 1
      // the four days the dial agrees with the clock
      if (upTo >= YEAR && !L.mini) {
        ctx.fillStyle = C.ink
        for (const d of EOT_ZERO) {
          ctx.beginPath()
          ctx.arc(xOf(d), yOf(0), 2, 0, TAU)
          ctx.fill()
        }
      }
      // the cursor
      const v = k3.kE * refEcc[Math.round(cur)] + k3.kT * refObl[Math.round(cur)]
      ctx.strokeStyle = rgba(C.ink, 0.25)
      ctx.beginPath()
      ctx.moveTo(xOf(cur), y)
      ctx.lineTo(xOf(cur), y + hh)
      ctx.stroke()
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(xOf(cur), yOf(v), 2.6, 0, TAU)
      ctx.fill()
      if (!L.mini) halo(fmtMin(v), xOf(cur) + (xOf(cur) > x + ww - 50 ? -6 : 6), yOf(v) - 6, { size: 8, color: C.ink, align: xOf(cur) > x + ww - 50 ? 'right' : 'left', tracking: 0.06 })
    }

    // the declination
    if (L.dw > 40) {
      const { dx: x, dy: y, dw: ww, dh: hh } = L
      const xOf = (d: number) => x + ((d - 1) / YEAR) * ww
      const yOf = (deg: number) => y + hh / 2 - (deg / 26) * (hh / 2)
      chartFrame(x, y, ww, hh, ww < 230 ? 'DECLINATION' : 'DECLINATION · TILT 23.44°', reveal)
      ctx.strokeStyle = rgba(C.ink, 0.3)
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, yOf(0))
      ctx.lineTo(x + ww * reveal, yOf(0))
      for (const v of [23.44, -23.44]) {
        ctx.moveTo(x, yOf(v))
        ctx.lineTo(x + ww * reveal, yOf(v))
      }
      ctx.stroke()
      ctx.setLineDash([])
      if (!L.mini) for (const v of [23, -23]) text(ctx, (v > 0 ? '+' : '−') + Math.abs(v) + '°', x - 5, yOf(v) + 3, { size: 7.5, color: C.muted, align: 'right', tracking: 0.04 })
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let d = 1; d <= Math.floor(upTo); d++) {
        // the tilt scales the declination; the ellipse only shifts it slightly
        const v = (Math.asin(Math.sin(refDec[d]) * (k3.kT < 1 ? Math.sin(k3.kT * 23.44 * DEG) / Math.sin(23.44 * DEG) : 1)) / DEG)
        if (d === 1) ctx.moveTo(xOf(d), yOf(v))
        else ctx.lineTo(xOf(d), yOf(v))
      }
      ctx.stroke()
      ctx.lineWidth = 1
      const v = Math.asin(Math.sin(refDec[Math.round(cur)]) * (k3.kT < 1 ? Math.sin(k3.kT * 23.44 * DEG) / Math.sin(23.44 * DEG) : 1)) / DEG
      ctx.strokeStyle = rgba(C.ink, 0.25)
      ctx.beginPath()
      ctx.moveTo(xOf(cur), y)
      ctx.lineTo(xOf(cur), y + hh)
      ctx.stroke()
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(xOf(cur), yOf(v), 2.6, 0, TAU)
      ctx.fill()
      if (!L.mini) halo(`${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}°`, xOf(cur) + (xOf(cur) > x + ww - 50 ? -6 : 6), yOf(v) - 6, { size: 8, color: C.ink, align: xOf(cur) > x + ww - 50 ? 'right' : 'left', tracking: 0.06 })
    }
    ctx.restore()
  }

  /* ---------------------------------------------------------- the dial */

  /** where the dial sits: its slot beside the charts, or (chapter IV, wide frames) large in the sky */
  function dialPlace(T: number) {
    const hero = !L.mini && L.sw > 640 && !L.stack ? ease.inOutCubic(smoothstep(66, 68.5, T) * (1 - smoothstep(80, 82.5, T))) : 0
    const hr = Math.min(L.sh * 0.26, L.sw * 0.11)
    const hx = L.sx + L.sw * 0.82
    const hy = L.horizon - L.sh * 0.4
    return { x: lerp(L.ux, hx, hero), y: lerp(L.uy, hy, hero), R: lerp(L.ur, hr, hero), hero }
  }

  function drawDial(T: number, day: number, A: number) {
    const P = dialPlace(T)
    const R = P.R
    if (R < 26) return
    const cx = P.x
    const cy = P.y + R * 0.18
    const appear = ease.outCubic(clamp((T - 0.8) / 1.6))
    const sphi = Math.sin(lat)
    const sgn = lat < 0 ? -1 : 1
    const k3 = causesAt(T)
    const s = sunAt(clamp(day, 1, YEAR), clock, k3.kE, k3.kT)
    // the Sun's hour angle at this clock time; on a horizontal dial the shadow of the
    // style makes an angle θ with the noon line where tan θ = sin φ tan H
    const H = (15 * (clock - 12) + s.eot / 4) * DEG
    const ang = (hourA: number) => Math.atan2(sphi * Math.sin(hourA), Math.cos(hourA))
    ctx.save()
    ctx.globalAlpha = A * appear
    ctx.lineWidth = 1
    if (P.hero > 0) {
      // in the sky, the dial sits in a detail frame of its own
      ctx.save()
      ctx.globalAlpha = A * appear * P.hero
      const fx = cx - R * 1.3
      const fy = cy - R * 1.5
      const fw = R * 2.6
      const fh = R * 2.1
      ctx.fillStyle = rgba(C.paper, 0.96)
      ctx.fillRect(fx, fy, fw, fh)
      ctx.strokeStyle = rgba(C.ink, 0.6)
      cropMarks(ctx, fx, fy, fw, fh, 8)
      text(ctx, `DETAIL A · HORIZONTAL SUNDIAL AT ${fmtLat(lat)}`, fx, fy - 6, { size: 7.5, color: C.muted, tracking: 0.14 })
      ctx.restore()
    }
    // the plate: a half disc of hour lines, noon pointing up (to the pole)
    const r0 = R * 0.08
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.arc(cx, cy, R, Math.PI, 0)
    ctx.lineTo(cx + R, cy + R * 0.12)
    ctx.lineTo(cx - R, cy + R * 0.12)
    ctx.closePath()
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    for (let hr = 6; hr <= 18; hr++) {
      const a = ang((hr - 12) * 15 * DEG)
      ctx.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0)
      ctx.lineTo(cx + Math.sin(a) * R * 0.92, cy - Math.cos(a) * R * 0.92)
    }
    // half-hour ticks on the rim
    for (let hh = 6; hh <= 18; hh += 0.5) {
      const a = ang((hh - 12) * 15 * DEG)
      ctx.moveTo(cx + Math.sin(a) * R * 0.94, cy - Math.cos(a) * R * 0.94)
      ctx.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R)
    }
    ctx.stroke()
    if (R > 44) {
      for (const hr of [6, 9, 12, 15, 18]) {
        const a = ang((hr - 12) * 15 * DEG)
        const X = cx + Math.sin(a) * R * 0.8
        const Y = cy - Math.cos(a) * R * 0.8
        if (Y > cy - 2) continue
        text(ctx, String(hr), X, Y + 3, { size: 7.5, color: C.muted, align: 'center', tracking: 0.04 })
      }
    }
    // the gnomon, seen from above: a thin wedge along the noon line
    ctx.strokeStyle = C.ink
    ctx.beginPath()
    ctx.moveTo(cx - 1.5, cy)
    ctx.lineTo(cx, cy - R * 0.62)
    ctx.lineTo(cx + 1.5, cy)
    ctx.stroke()
    // the shadow, while the Sun is up
    const up = Math.sin(lat) * Math.sin(s.dec) + Math.cos(lat) * Math.cos(s.dec) * Math.cos(H)
    if (up > 0) {
      const a = ang(H)
      const L2 = R * 0.9
      const dx = Math.sin(a)
      const dy = -Math.cos(a)
      ctx.beginPath()
      ctx.moveTo(cx - dy * 2.5, cy + dx * 2.5)
      ctx.lineTo(cx + dx * L2, cy + dy * L2)
      ctx.lineTo(cx + dy * 2.5, cy - dx * 2.5)
      ctx.closePath()
      ctx.fillStyle = rgba(C.ink, 0.14)
      ctx.fill()
      ctx.strokeStyle = C.ink
      ctx.stroke()
    }
    // the noon detail: twenty minutes either side of the noon line, magnified
    if (Math.abs(clock - 12) < 0.3) {
      const sy2 = cy - R - 12
      const span = R * 0.95
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.moveTo(cx - span, sy2)
      ctx.lineTo(cx + span, sy2)
      for (let m = -20; m <= 20; m += 5) {
        const X = cx + (m / 20) * span
        ctx.moveTo(X, sy2)
        ctx.lineTo(X, sy2 - (m % 10 === 0 ? 5 : 3))
      }
      ctx.stroke()
      const minutes = 4 * (H / DEG)
      const X = cx + (clamp(minutes * sgn, -20, 20) / 20) * span
      ctx.fillStyle = C.ocean
      ctx.beginPath()
      ctx.moveTo(X, sy2 + 1)
      ctx.lineTo(X - 3.5, sy2 + 6.5)
      ctx.lineTo(X + 3.5, sy2 + 6.5)
      ctx.closePath()
      ctx.fill()
      if (R > 40) {
        text(ctx, sgn > 0 ? '−20' : '+20', cx - span, sy2 - 8, { size: 7, color: C.muted, align: 'center', tracking: 0.04 })
        text(ctx, sgn > 0 ? '+20' : '−20', cx + span, sy2 - 8, { size: 7, color: C.muted, align: 'center', tracking: 0.04 })
        text(ctx, P.hero > 0.5 ? 'NOON DETAIL · MIN' : 'MIN', cx, sy2 - 8, { size: 7, color: C.muted, align: 'center', tracking: 0.1 })
      }
    }
    // readout under the dial
    text(ctx, `DIAL ${fmtClock(clock + s.eot / 60)}`, cx, cy + R * 0.12 + 14, { size: 8.5, color: C.ocean, align: 'center', tracking: 0.12 })
    if (R > 34) text(ctx, `CLOCK ${fmtClock(clock)}`, cx, cy + R * 0.12 + 26, { size: 8.5, color: C.ink2, align: 'center', tracking: 0.12 })
    ctx.restore()
  }

  /* ------------------------------------------------------------- chrome */

  function captionAt(T: number) {
    if (preview) return
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lines: { s: string; em: string }[] = L.oneLine ? [{ s: cap.a, em: cap.em }] : [{ s: cap.a.trim(), em: '' }, { s: '', em: cap.em }]
      let fs = L.capSize
      for (const ln of lines) {
        const wd = measure(ln.s, fs, 'serif') + measure(ln.em, fs, 'serif', true)
        if (wd > L.capW) fs = Math.max(11, (fs * L.capW) / wd)
      }
      lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = L.capY + fs + li * fs * 1.04
        ctx.save()
        ctx.beginPath()
        ctx.rect(L.capX - 4, y - fs * 1.02, w, fs * 1.32)
        ctx.clip()
        const dy = (1 - pr) * fs * 1.15 - pe * fs * 0.9
        setFont(ctx, { font: 'serif', size: fs })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) {
          ctx.save()
          ctx.lineWidth = 5
          ctx.lineJoin = 'round'
          ctx.strokeStyle = rgba(C.paper, 0.9)
          ctx.strokeText(ln.s, L.capX, y + dy)
          ctx.restore()
          text(ctx, ln.s, L.capX, y + dy, { font: 'serif', size: fs, color: C.ink })
        }
        if (ln.em) {
          setFont(ctx, { font: 'serif', size: fs, italic: true })
          ctx.save()
          ctx.lineWidth = 5
          ctx.lineJoin = 'round'
          ctx.strokeStyle = rgba(C.paper, 0.9)
          ctx.strokeText(ln.em, L.capX + sw, y + dy)
          ctx.restore()
          text(ctx, ln.em, L.capX + sw, y + dy, { font: 'serif', size: fs, italic: true, color: C.moss })
        }
        ctx.restore()
      })
    }
  }

  function chrome(T: number, day: number) {
    const { pad } = L
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    const ks = L.mini ? 8.5 : L.tight ? 9 : 10
    text(ctx, `${FIG} — ANALEMMA`, pad, pad + 9, { size: ks, color: C.muted, tracking: 0.16 })
    if (!preview) {
      const c = CHAPTERS[ch]
      const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
      text(ctx, `${c.num} — ${c.name}`, pad, pad + 9 + (L.mini ? 12 : 15), { size: ks, color: C.ink2, tracking: 0.16, upper: true, alpha: kIn })
    }
    const k3 = causesAt(T)
    const s = sunAt(clamp(day, 1, YEAR), clock, k3.kE, k3.kT)
    const items: [string, string][] = [
      ['Date', dateOf(day).toLowerCase().replace(/^./, (c) => c.toUpperCase())],
      ['Dial − clock', fmtMin(s.eot)],
      ['Declination', `${s.dec >= 0 ? '+' : '−'}${Math.abs(s.dec / DEG).toFixed(1)}°`],
      ['Latitude', fmtLat(lat)],
      ['Clock', fmtClock(clock)],
    ]
    if (L.mini) items.splice(2, 1)
    if (preview) items.splice(2)
    const size = L.mini ? 10 : L.tight ? 11 : 13
    const kickW = Math.max(measure(`${FIG} — ANALEMMA`, ks), preview ? 0 : measure(`${CHAPTERS[ch].num} — ${CHAPTERS[ch].name}`.toUpperCase(), ks)) + 24
    const avail = L.hudRow ? w - pad * 2 : w - pad * 2 - kickW
    const gap = L.tight ? 14 : 22
    const widthOf = (its: [string, string][]) => its.reduce((acc, [l, v]) => acc + Math.max(measure(l.toUpperCase(), 8.5), measure(v, size)) + gap, -gap)
    let shown = items.slice()
    while (shown.length > 1 && widthOf(shown) > avail) shown = shown.slice(0, -1)
    let x = L.hudRow ? pad : w - pad - widthOf(shown)
    const hy = L.hudRow ? pad + 40 : pad + 7
    for (const [l, v] of shown) {
      const wd = Math.max(measure(l.toUpperCase(), 8.5), measure(v, size))
      text(ctx, l, x, hy, { size: 8.5, color: C.muted, tracking: 0.14, upper: true })
      text(ctx, v, x, hy + size + 3, { size, color: C.ink, tracking: 0.04 })
      x += wd + gap
    }
    // chapter ruler
    if (!preview) {
      const x0 = pad
      const x1 = w - pad
      const yb = L.rulerY
      ctx.lineWidth = 1
      ctx.strokeStyle = C.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 42; i++) {
        const xx = lerp(x0, x1, i / 42)
        ctx.moveTo(xx, yb)
        ctx.lineTo(xx, yb - (i % 5 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = C.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360) CHAPTERS.forEach((cc, i) => text(ctx, cc.num, lerp(x0, x1, cc.t / LOOP) + 4, yb - 7, { size: 8.5, color: i === ch ? C.ink : C.muted, tracking: 0.1 }))
      if (hoverX >= 0) {
        const hx = clamp(hoverX, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c, i) => (ht >= c.t ? i : acc), 0)
        ctx.strokeStyle = C.ocean
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${CHAPTERS[hc].name.toUpperCase()}`, clamp(hx, x0 + 50, x1 - 50), yb - 17, { size: 9, color: C.ocean, align: 'center', tracking: 0.12 })
      }
    }
    ctx.strokeStyle = rgba(C.ink, 0.45)
    ctx.lineWidth = 1
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, L.mini ? 6 : 9)
  }

  /** the sky handle: the figure's centre, latitude and clock, and the ghost demonstration */
  function handle(T: number) {
    if (preview) return
    let cxD = 0
    let cyD = 0
    let n = 0
    for (let d = 1; d <= YEAR; d += 5) {
      cxD += px[d]
      cyD += py[d]
      n++
    }
    const X = sxOf(cxD / n)
    const Y = syOf(cyD / n)
    const g0 = 13.5
    const g1 = 19.5
    const ghostOn = !used && T > g0 && T < g1
    const show = drag?.mode === 'sky' || hoverSky || ghostOn
    if (!show) return
    ctx.save()
    let gx = X
    let gy = Y
    if (ghostOn) {
      const u = (T - g0) / (g1 - g0)
      ctx.globalAlpha = smoothstep(0, 0.1, u) * (1 - smoothstep(0.88, 1, u))
      const amp = Math.min(L.sh * 0.18, 60)
      gy = Y + Math.sin(u * TAU) * amp
      gx = X + Math.sin(u * TAU * 0.5) * amp * 0.6
      ctx.strokeStyle = rgba(C.ocean, 0.7)
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.moveTo(X, Y - amp)
      ctx.lineTo(X, Y + amp)
      ctx.moveTo(X - amp * 0.6, Y)
      ctx.lineTo(X + amp * 0.6, Y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    ctx.arc(gx, gy, 9, 0, TAU)
    ctx.moveTo(gx - 15, gy)
    ctx.lineTo(gx - 5, gy)
    ctx.moveTo(gx + 5, gy)
    ctx.lineTo(gx + 15, gy)
    ctx.moveTo(gx, gy - 15)
    ctx.lineTo(gx, gy - 5)
    ctx.moveTo(gx, gy + 5)
    ctx.lineTo(gx, gy + 15)
    ctx.stroke()
    const lab = ghostOn ? (L.tight ? 'DRAG THE SKY' : 'DRAG · ↕ LATITUDE · ↔ CLOCK TIME') : `${fmtLat(lat)} · ${fmtClock(clock)}`
    const right = gx + 22 + measure(lab, 9) < L.sx + L.sw - 6
    halo(lab, right ? gx + 22 : gx - 22, gy + 3, { size: 9, color: C.ocean, align: right ? 'left' : 'right', tracking: 0.14 })
    ctx.restore()
  }

  /* ---------------------------------------------------------------- sound */

  let lastStamp = -1
  function shutter(eot: number) {
    if (!sfx.enabled) return
    const deg = clamp(Math.round(((eot + 16) / 33) * (SCALE.length - 1)), 0, SCALE.length - 1)
    sfx.tone(SCALE[deg], 0.9, { type: 'sine', gain: 0.03, attack: 0.005, room: 0.45, pan: clamp(eot / 18, -0.7, 0.7) })
    sfx.noise(0.035, { filter: 5200, q: 1.2, gain: 0.012, room: 0.05 })
  }

  /* ------------------------------------------------------------ interaction */

  const loopT = (t: number) => mod(t + offset, LOOP)
  const inSky = (x: number, y: number) => x > L.sx && x < L.sx + L.sw && y > L.sy && y < L.sy + L.sh
  const inChart = (x: number, y: number) =>
    (x > L.ex - 6 && x < L.ex + L.ew + 6 && y > L.ey - 14 && y < L.ey + L.eh + 16) || (L.dw > 40 && x > L.dx - 6 && x < L.dx + L.dw + 6 && y > L.dy - 14 && y < L.dy + L.dh + 16)
  const onRuler = (x: number, y: number) => !preview && y > L.rulerY - 20 && y < h && x > L.pad - 8 && x < w - L.pad + 8
  /** seek the piece to the moment day `d` passes in chapter II (or chapter I for the first weeks) */
  function seekDay(d: number) {
    const T = prevT < 0 ? 0 : prevT
    let target: number
    if (d <= 42) {
      // invert chapter I's ease
      const u = clamp((d - 1) / 41)
      target = 1.5 + (Math.acos(1 - 2 * u) / Math.PI) * 10.5
    } else target = 12 + ((d - 42) / 324) * 34
    offset += clamp(target, 0, 45.9) - T
  }
  function chartDay(x: number) {
    const inE = x > L.ex - 6 && x < L.ex + L.ew + 6
    const x0 = inE ? L.ex : L.dx
    const ww = inE ? L.ew : L.dw
    return 1 + clamp((x - x0) / ww) * (YEAR - 1)
  }
  function seekRuler(x: number) {
    const T = prevT < 0 ? 0 : prevT
    let target = clamp((x - L.pad) / (w - L.pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }
  function toggleDecomp() {
    decomp = !decomp
    used = true
    sfx.tone(decomp ? 587.33 : 440, 0.6, { type: 'sine', gain: 0.04, room: 0.4 })
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      L = layoutFor(w, h)
      viewK = 0
    },
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hoverSky = false
        hoverX = -1
        scrubRuler = false
        drag = null
        env.setCursor('default')
        return
      }
      const ruler = onRuler(p.x, p.y)
      hoverX = ruler || scrubRuler ? p.x : -1
      if (p.type === 'down') {
        if (ruler) {
          scrubRuler = true
          seekRuler(p.x)
          env.setCursor('pointer')
          return
        }
        if (inChart(p.x, p.y)) {
          drag = { mode: 'scrub', x: p.x, y: p.y, lat, clock, moved: false, ms: performance.now(), id: p.id }
          seekDay(chartDay(p.x))
          used = true
        } else drag = { mode: 'sky', x: p.x, y: p.y, lat, clock, moved: false, ms: performance.now(), id: p.id }
      }
      if (scrubRuler) {
        if (p.type === 'move' && p.pressed) seekRuler(p.x)
        if (p.type === 'up') scrubRuler = false
        return
      }
      if (drag && p.type === 'move' && p.pressed) {
        const dx = p.x - drag.x
        const dy = p.y - drag.y
        if (Math.hypot(dx, dy) > (touch ? 10 : 5)) drag.moved = true
        if (drag.mode === 'scrub') seekDay(chartDay(p.x))
        else if (drag.moved) {
          used = true
          const latDeg = clamp(drag.lat / DEG + (dy / Math.max(120, L.sh)) * 70, -65, 65)
          lat = latDeg * DEG
          let ck = drag.clock + (dx / Math.max(160, L.sw)) * 8
          ck = clamp(ck, 8, 16)
          if (Math.abs(ck - 12) < 0.12) ck = 12
          clock = ck
        }
      }
      if (p.type === 'up' && drag) {
        if (!drag.moved && drag.mode === 'sky' && performance.now() - drag.ms < 450) toggleDecomp()
        drag = null
      }
      hoverSky = inSky(p.x, p.y)
      env.setCursor(drag?.mode === 'sky' && drag.moved ? 'grabbing' : inChart(p.x, p.y) ? 'ew-resize' : ruler ? 'pointer' : hoverSky ? 'grab' : 'default')
    },
    key(code, down) {
      const T = prevT < 0 ? 0 : prevT
      if (code === 'ArrowUp' || code === 'ArrowDown') {
        if (down) {
          lat = clamp(lat / DEG + (code === 'ArrowUp' ? 5 : -5), -65, 65) * DEG
          used = true
        }
        return true
      }
      if (code === 'KeyD') {
        if (down) toggleDecomp()
        return true
      }
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      if (code === 'ArrowRight') {
        const next = CHAPTERS.find((c) => c.t > T + 0.01)
        offset += (next ? next.t : LOOP) - T
      } else {
        const i = CHAPTERS.reduce((acc, c, idx) => (T >= c.t ? idx : acc), 0)
        const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
        offset += target - T
      }
      return true
    },
    frame(t, dt) {
      const perf0 = perfOn ? performance.now() : 0
      // scrubbing the day holds the clock
      if (drag?.mode === 'scrub') offset -= dt
      const T = loopT(t)
      const day = dayAt(T)
      decompK += ((decomp ? 1 : 0) - decompK) * (dt > 0 ? damp(4, dt) : 1)
      const k = causesAt(T)
      computeYear(k.kE, k.kT)
      if (!L.mini) computeHours(k.kE, k.kT)
      updateView(dt)
      const A = smoothstep(0, 0.5, T) * (1 - smoothstep(LOOP - 0.8, LOOP - 0.05, T))

      ctx.fillStyle = C.paper
      ctx.fillRect(0, 0, w, h)
      drawSky(T, day, A)
      drawCharts(T, day, A)
      drawDial(T, day, A)
      captionAt(T)
      chrome(T, day)
      handle(T)

      // a shutter for every disc as it is stamped
      if (dt > 0 && T < 46) {
        const stamp = Math.floor((day - 1) / STAMP)
        if (stamp !== lastStamp && lastStamp >= 0 && stamp > lastStamp) shutter(sunAt(day, clock).eot)
        lastStamp = stamp
      } else lastStamp = -1
      if (dt > 0 && prevT >= 0 && prevT < 49.6 && T >= 49.6) sfx.tone(220, 2.5, { type: 'sine', gain: 0.04, attack: 0.4, room: 0.6 })
      if (dt > 0 && prevT >= 0 && prevT < 55.1 && T >= 55.1) sfx.tone(196, 2.5, { type: 'sine', gain: 0.04, attack: 0.4, room: 0.6 })
      if (dt > 0 && prevT >= 0 && prevT < 60.6 && T >= 60.6) [146.83, 220, 293.66, 369.99].forEach((f, j) => sfx.tone(f, 3.5, { type: 'sine', gain: 0.035, attack: 0.3 + j * 0.05, room: 0.6 }))
      prevT = T
      if (perfOn) {
        perfSum += performance.now() - perf0
        perfN++
        text(ctx, `${(perfSum / perfN).toFixed(2)} MS / FRAME · ${perfN}`, w / 2, h - 4, { size: 10, color: C.ocean, align: 'center' })
      }
    },
  }
}

export default create
