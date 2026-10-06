/*
 * C.08 — BLACKBODY
 *
 * Every star is a temperature. A filament glows at 1,000 K, a deep red; as
 * it heats, Planck's law draws its spectrum in hairlines on log–log axes
 * (where every blackbody curve has the same shape, slid along the line of
 * Wien's law), with the visible band washed in the real spectrum and the
 * peak dimensioned. The filament's colour is computed, not chosen: Planck's
 * law integrated against the CIE 1931 observer and converted to sRGB
 * (color.blackbody), passing through the red of an ember, the amber of a
 * candle and a tungsten bulb, the white of the Sun, to the blue-white of a
 * 30,000 K star. Then the drawing widens to a field of stars, each a dot of
 * its own temperature's colour, that sorts itself into the Hertzsprung–
 * Russell diagram — temperature reversed along the bottom, luminosity on a
 * log scale — with the Sun ringed. Then the stars gather back into one ember.
 *
 *   I    Ember        1,000 K: the curve draws on, the peak far in the infrared
 *   II   Heat         the temperature climbs to 30,000 K; landmark curves remain
 *   III  Stars        the field: 1,500 stars, coloured by temperature
 *   IV   Sorted       the field arranges itself into the HR diagram
 *   V    One again    the stars gather and cool back to a single ember
 *
 * Full mode: drag the temperature scale (or drag across the plot to place the
 * peak) to set T; hover a star to read it. ← → step chapters; the ruler
 * scrubs. Sound (optional): a soft tone whose pitch rises with temperature.
 */

import { C, TAU, clamp, ease, ground, lerp, rng, setFont, smoothstep, text } from '../kit'
import { blackbody, css, planck, spectral, wienPeak } from '../color'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('italic 400 64px "Instrument Serif"'), document.fonts.load('500 12px "Geist Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. C.08'
const LOOP = 72
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Ember' },
  { t: 11, num: 'II', name: 'Heat' },
  { t: 34, num: 'III', name: 'Stars' },
  { t: 46, num: 'IV', name: 'Sorted' },
  { t: 64, num: 'V', name: 'One again' },
]

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
  /** the italic takes the current temperature's colour */
  hot?: boolean
}
const CAPTIONS: Caption[] = [
  { t0: 1.6, t1: 10.4, lines: [{ s: 'Heat a thing' }, { s: 'and it ', em: 'glows.' }], hot: true },
  { t0: 15.5, t1: 31.5, lines: [{ s: 'The hotter,' }, { s: 'the ', em: 'bluer.' }], hot: true },
  { t0: 37.4, t1: 46.6, lines: [{ s: 'Every star' }, { s: 'is a ', em: 'temperature.' }] },
  { t0: 53.6, t1: 63.2, lines: [{ s: 'Ours is a middling' }, { s: '', em: 'yellow dwarf.' }] },
]

const T_MIN = 1000
const T_MAX = 30000
const T_SUN = 5772
const SIGMA = 5.670374419e-8

/** landmarks left behind on the plot and marked on the scale */
const MARKS: { T: number; name: string; short: string }[] = [
  { T: 1000, name: 'Ember', short: 'EMBER' },
  { T: 1850, name: 'Candle flame', short: 'CANDLE' },
  { T: 2700, name: 'Tungsten bulb', short: 'TUNGSTEN' },
  { T: 5772, name: 'The Sun', short: 'SUN' },
  { T: 9940, name: 'Sirius A', short: 'SIRIUS' },
  { T: 30000, name: 'A hot B star', short: 'B STAR' },
]

/* ------------------------------------------------- the main sequence, roughly */

// (log T, log L/L☉) along the zero-age-ish main sequence, after standard tables
const MS: [number, number][] = [
  [3.415, -3.3],
  [3.484, -2.4],
  [3.585, -1.2],
  [3.643, -0.8],
  [3.716, -0.35],
  [3.7613, 0],
  [3.813, 0.45],
  [3.857, 0.8],
  [3.908, 1.1],
  [3.987, 1.5],
  [4.196, 2.9],
  [4.462, 4.4],
  [4.55, 5.0],
]
function msL(logT: number) {
  if (logT <= MS[0][0]) return MS[0][1]
  for (let i = 1; i < MS.length; i++) {
    if (logT <= MS[i][0]) {
      const [a, b] = [MS[i - 1], MS[i]]
      return lerp(a[1], b[1], (logT - a[0]) / (b[0] - a[0]))
    }
  }
  return MS[MS.length - 1][1]
}
const SPECTRAL: [string, number][] = [
  ['O', 33000],
  ['B', 10000],
  ['A', 7300],
  ['F', 6000],
  ['G', 5300],
  ['K', 3900],
  ['M', 2300],
]
function classOf(T: number) {
  for (const [c, lo] of SPECTRAL) if (T >= lo) return c
  return 'M'
}

/** Planck per nanometre: W·sr⁻¹·m⁻²·nm⁻¹ */
const Bnm = (nm: number, T: number) => planck(nm, T) * 1e-9

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const k = { ink: '#EEF4F1', ink2: 'rgba(238,244,241,0.74)', muted: 'rgba(238,244,241,0.5)', rule: 'rgba(238,244,241,0.14)', faint: 'rgba(238,244,241,0.07)' }
  const ACC = C.sage

  /* --------------------------------------------------------- the stars */

  const NS = preview ? 520 : 1500
  const sT = new Float32Array(NS)
  const sL = new Float32Array(NS)
  const sKind = new Uint8Array(NS) // 0 main sequence, 1 giant, 2 supergiant, 3 white dwarf
  const sX = new Float32Array(NS) // sky position 0..1
  const sY = new Float32Array(NS)
  const sMag = new Float32Array(NS) // apparent size 0..1
  const sDelay = new Float32Array(NS)
  const sBin = new Uint8Array(NS)
  const NBIN = 28
  const binCol: string[] = []
  {
    const r = rng(5772)
    const gauss = () => {
      let u = 0
      let v = 0
      while (u === 0) u = r()
      while (v === 0) v = r()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v)
    }
    for (let i = 0; i < NS; i++) {
      const p = r()
      let logT: number
      let logL: number
      let kind = 0
      if (i === 0) {
        logT = Math.log10(T_SUN)
        logL = 0
      } else if (p < 0.7) {
        // main sequence, weighted toward the cool, common stars
        logT = lerp(3.46, 4.52, Math.pow(r(), 1.7))
        logL = msL(logT) + gauss() * 0.12
      } else if (p < 0.86) {
        kind = 1
        if (r() < 0.4) {
          // the red clump
          logT = Math.log10(4800) + gauss() * 0.012
          logL = 1.7 + gauss() * 0.08
        } else {
          logT = lerp(3.53, 3.72, r())
          logL = 1.0 + ((3.72 - logT) / 0.19) * 2.2 + gauss() * 0.15
        }
      } else if (p < 0.89) {
        kind = 2
        logT = lerp(3.52, 4.45, r())
        logL = lerp(4.2, 5.5, r())
      } else {
        kind = 3
        logT = lerp(3.78, 4.46, Math.pow(r(), 0.8))
        logL = -3.84 + 4 * (logT - 3.7613) + gauss() * 0.12
      }
      sT[i] = Math.pow(10, logT)
      sL[i] = logL
      sKind[i] = kind
      // a sky with a faint milky band across it
      if (r() < 0.45) {
        const along = r()
        const across = gauss() * 0.09
        sX[i] = clamp(along + across * 0.4, 0.01, 0.99)
        sY[i] = clamp(0.2 + along * 0.6 + across, 0.02, 0.98)
      } else {
        sX[i] = r()
        sY[i] = r()
      }
      sMag[i] = Math.pow(r(), 3) * 0.6 + clamp((logL + 1) / 7) * 0.4
      sDelay[i] = r()
      sBin[i] = Math.round(((logT - 3.4) / (4.52 - 3.4)) * (NBIN - 1))
    }
    for (let b = 0; b < NBIN; b++) binCol.push(css(blackbody(Math.pow(10, 3.4 + (b / (NBIN - 1)) * (4.52 - 3.4)))))
    // the Sun sits a little apart in the sky so it can be ringed
    sX[0] = 0.62
    sY[0] = 0.58
    sMag[0] = 0.55
  }

  /* ------------------------------------------------------------ layout */

  let w = env.width
  let h = env.height
  let pad = 20
  let portrait = false
  let short = false
  let tiny = false
  let sideCap = false
  // the Planck plot
  let px0 = 0
  let py0 = 0
  let pw = 100
  let ph = 100
  // the HR diagram (the same box, a little larger)
  let hx0 = 0
  let hy0 = 0
  let hw = 100
  let hh = 100
  // the ember
  let ex = 0
  let ey = 0
  let eS = 40
  // the temperature scale
  let tx0 = 0
  let tx1 = 100
  let tyS = 0
  let capX = 0
  let capY = 0
  let capSize = 28
  let capW = 300
  let numX = 0
  let numY = 0
  let numSize = 60
  let rulerOn = true

  const LX0 = Math.log10(80)
  const LX1 = Math.log10(10000)
  const LY0 = -2
  const LY1 = 8.4
  const plotX = (nm: number) => px0 + ((Math.log10(nm) - LX0) / (LX1 - LX0)) * pw
  const plotY = (B: number) => py0 + ph - ((Math.log10(Math.max(1e-30, B)) - LY0) / (LY1 - LY0)) * ph
  const plotNm = (x: number) => Math.pow(10, LX0 + ((x - px0) / pw) * (LX1 - LX0))
  const HT0 = Math.log10(40000)
  const HT1 = Math.log10(2400)
  const HL0 = -4.6
  const HL1 = 6.2
  const hrX = (T: number) => hx0 + ((Math.log10(T) - HT0) / (HT1 - HT0)) * hw
  const hrY = (logL: number) => hy0 + hh - ((logL - HL0) / (HL1 - HL0)) * hh
  const tScaleX = (T: number) => tx0 + ((Math.log(T) - Math.log(T_MIN)) / (Math.log(T_MAX) - Math.log(T_MIN))) * (tx1 - tx0)
  const tScaleT = (x: number) => Math.exp(Math.log(T_MIN) + clamp((x - tx0) / (tx1 - tx0)) * (Math.log(T_MAX) - Math.log(T_MIN)))

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 0.98
    short = h < 440
    tiny = preview || Math.min(w, h) < 300
    sideCap = !portrait && w / h > 1.75 && h < 620
    pad = clamp(Math.min(w, h) * 0.045, tiny ? 10 : 14, 38)
    rulerOn = !preview && h >= 280
    const rulerH = rulerOn ? 24 : 4
    const top = pad + (tiny ? 26 : 40)
    if (portrait) {
      capSize = clamp(Math.min(w * 0.075, h * 0.052), 16, 38)
      capX = pad
      capW = w - pad * 2
      capY = h - pad - rulerH - capSize * 2.4
      // ember + numeral on top, plot, then the scale
      eS = clamp(w * 0.12, 26, 60)
      ex = pad + eS * 1.1
      ey = top + eS * 0.9
      numSize = clamp(w * 0.13, 30, 64)
      numX = ex + eS * 1.5
      numY = ey + numSize * 0.32
      px0 = pad + 34
      pw = w - pad * 2 - 40
      py0 = ey + eS * 1.4 + 26
      tyS = capY - 40
      ph = Math.max(80, tyS - (short || tiny ? 40 : 66) - py0)
      tx0 = px0
      tx1 = px0 + pw
    } else if (sideCap) {
      capSize = clamp(Math.min(h * 0.085, w * 0.034), 14, 32)
      capW = clamp(w * 0.27, 150, 300)
      capX = pad
      capY = h - pad - rulerH - capSize * 2.4
      eS = clamp(h * 0.09, 14, 40)
      ex = pad + eS * 1.1
      ey = top + eS * 0.6
      numSize = clamp(h * 0.12, 22, 52)
      numX = ex + eS * 1.5
      numY = ey + numSize * 0.32
      px0 = pad + capW + 40
      pw = w - px0 - pad - 8
      py0 = top + 6
      tyS = h - pad - rulerH - 22
      ph = Math.max(60, tyS - 30 - py0)
      tx0 = px0
      tx1 = px0 + pw
    } else {
      capSize = clamp(Math.min(w * 0.038, h * 0.056), tiny ? 14 : 19, 46)
      capX = pad * 1.3
      capW = w * 0.34
      capY = h - pad - rulerH - capSize * 2.4
      const leftW = clamp(w * 0.3, 140, 420)
      eS = clamp(Math.min(leftW * 0.16, h * 0.07), 18, 64)
      ex = pad + leftW * 0.2 + eS
      ey = top + h * 0.12 + eS
      numSize = clamp(Math.min(w * 0.06, h * 0.1), 26, 96)
      numX = pad * 1.3
      numY = ey + eS * 1.6 + numSize * 0.85
      px0 = pad + leftW + 30
      pw = w - px0 - pad - 10
      py0 = top + 12
      tyS = h - pad - rulerH - (short ? 22 : 40)
      ph = Math.max(80, tyS - (short ? 40 : 70) - py0)
      tx0 = px0
      tx1 = px0 + pw
    }
    // the HR diagram fills the plot's box plus the scale's band, clear of the words below
    hx0 = px0
    hw = pw
    hy0 = py0
    hh = tyS - py0 + 6
    if (portrait || (capY < tyS + 50 && capX + capW > hx0)) hh = Math.min(hh, capY - 48 - hy0)
    buildCurves()
  }

  // landmark curves in screen space, rebuilt on resize
  const NC = preview ? 90 : 200
  const curves: Float32Array[] = MARKS.map(() => new Float32Array(NC * 2))
  function curveInto(T: number, out: Float32Array) {
    for (let i = 0; i < NC; i++) {
      const nm = Math.pow(10, LX0 + (i / (NC - 1)) * (LX1 - LX0))
      out[i * 2] = plotX(nm)
      out[i * 2 + 1] = plotY(Bnm(nm, T))
    }
  }
  function buildCurves() {
    MARKS.forEach((m, i) => curveInto(m.T, curves[i]))
  }
  const live = new Float32Array(NC * 2)
  layout()

  /* ------------------------------------------------------ the timeline */

  const at = Number(env.params.get('at'))
  let offset = Number.isFinite(at) && env.params.has('at') ? at : preview ? 14 : 0
  let lastT = 0
  let prevT = -1
  const curT = () => (((lastT + offset) % LOOP) + LOOP) % LOOP

  /** the authored temperature */
  function authoredT(T: number) {
    if (T < 7) return T_MIN
    if (T < 31) {
      // climb evenly in log T, eased at both ends
      const u = (T - 7) / 24
      const e = ease.inOutSine(u)
      return Math.exp(lerp(Math.log(T_MIN), Math.log(T_MAX), e))
    }
    if (T < 64) return T_MAX
    return Math.exp(lerp(Math.log(T_MAX), Math.log(T_MIN), ease.inOutCubic(clamp((T - 64.5) / 6))))
  }

  // the viewer's temperature, which drifts back to the story after release
  let userT = -1
  let userW = 0
  let release = -1e9
  let drag: 'none' | 'scale' | 'plot' | 'hr' | 'ruler' = 'none'
  let hover: 'none' | 'scale' | 'plot' | 'hr' | 'ruler' | 'star' = 'none'
  let hoverX = -1
  let touched = false
  let touch = false
  let hoverStar = -1

  const rulerY = () => h - pad * 0.55 - 4
  const onRuler = (x: number, y: number) => rulerOn && y > rulerY() - 20 && y < h && x > pad - 8 && x < w - pad + 8
  function seekTo(x: number) {
    const T = curT()
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 1.6) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }

  /* ----------------------------------------------------------- sound */

  let tone: { osc: OscillatorNode; gain: GainNode; lp: BiquadFilterNode } | null = null
  function toneSet(level: number, temp: number) {
    const ac = env.sfx.context()
    const out = env.sfx.output()
    if (!ac || !out) {
      stopTone()
      return
    }
    if (!tone) {
      const osc = ac.createOscillator()
      osc.type = 'sine'
      const gain = ac.createGain()
      gain.gain.value = 0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      osc.connect(gain)
      gain.connect(lp)
      lp.connect(out)
      osc.start()
      tone = { osc, gain, lp }
    }
    const now = ac.currentTime
    // pitch rises with temperature: 1,000 K is A2, every doubling of T a fifth higher
    const f = 110 * Math.pow(1.5, Math.log2(temp / T_MIN))
    tone.osc.frequency.setTargetAtTime(f, now, 0.08)
    tone.gain.gain.setTargetAtTime(level * 0.05, now, 0.2)
  }
  function stopTone() {
    if (!tone) return
    try {
      tone.osc.stop()
    } catch {
      /* already stopped */
    }
    tone = null
  }

  /* --------------------------------------------------------- helpers */

  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4] = {}) {
    ctx.save()
    setFont(ctx, o)
    const tw = ctx.measureText(o.upper ? str.toUpperCase() : str).width
    const al = o.align ?? 'left'
    const left = al === 'center' ? x - tw / 2 : al === 'right' ? x - tw : x
    x += left < 4 ? 4 - left : left + tw > w - 4 ? w - 4 - (left + tw) : 0
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(11,29,36,0.85)'
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }
  const bbCss = (T: number, a = 1) => css(blackbody(T), a)
  /** how bright a blackbody looks, 0..1, for the glow (luminance rises enormously; this is a gentle stand-in) */
  const glowOf = (T: number) => 0.32 + 0.68 * smoothstep(Math.log(1000), Math.log(7000), Math.log(T))

  /* ---------------------------------------------------------- drawing */

  function drawEmber(T: number, a: number) {
    if (a <= 0) return
    const col = blackbody(T)
    const g = glowOf(T)
    ctx.save()
    ctx.globalAlpha = a
    // a soft wash of the light it gives (light adds)
    ctx.globalCompositeOperation = 'lighter'
    const rg = ctx.createRadialGradient(ex, ey, 0, ex, ey, eS * 2.6)
    rg.addColorStop(0, css(col, 0.22 * g))
    rg.addColorStop(1, css(col, 0))
    ctx.fillStyle = rg
    ctx.fillRect(ex - eS * 2.6, ey - eS * 2.6, eS * 5.2, eS * 5.2)
    // the coil: a helix seen from the side, a wide faint pass and a hairline core
    const turns = 7
    const len = eS * 1.6
    const rad = eS * 0.2
    const coil = new Path2D()
    for (let s = 0; s <= turns * 24; s++) {
      const u = s / (turns * 24)
      const x = ex - len / 2 + u * len
      const y = ey + Math.sin(u * turns * TAU) * rad
      const z = Math.cos(u * turns * TAU)
      if (s === 0) coil.moveTo(x + z * rad * 0.35, y)
      else coil.lineTo(x + z * rad * 0.35, y)
    }
    ctx.strokeStyle = css(col, 0.28 * g)
    ctx.lineWidth = 3.2
    ctx.stroke(coil)
    ctx.strokeStyle = css(col, 0.95)
    ctx.lineWidth = 1.1
    ctx.stroke(coil)
    ctx.globalCompositeOperation = 'source-over'
    // the leads and the stem, in ink
    ctx.strokeStyle = k.ink2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ex - len / 2, ey)
    ctx.lineTo(ex - len / 2 - eS * 0.2, ey + eS * 1.1)
    ctx.moveTo(ex + len / 2, ey)
    ctx.lineTo(ex + len / 2 + eS * 0.2, ey + eS * 1.1)
    ctx.stroke()
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    ctx.ellipse(ex, ey + eS * 0.05, eS * 1.25, eS * 1.05, 0, Math.PI * 0.62, Math.PI * 2.38)
    ctx.stroke()
    ctx.restore()
  }

  function drawPlot(T: number, a: number, Tshow: number) {
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    // the visible band, washed in its own colours
    const v0 = plotX(380)
    const v1 = plotX(780)
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineWidth = 1
    for (let x = Math.ceil(v0); x <= v1; x += 2) {
      const nm = plotNm(x)
      ctx.strokeStyle = css(spectral(nm), 0.13)
      ctx.beginPath()
      ctx.moveTo(x + 0.5, py0)
      ctx.lineTo(x + 0.5, py0 + ph)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    if (!tiny) text(ctx, 'VISIBLE', (v0 + v1) / 2, py0 + 12, { size: 8.5, color: k.ink2, align: 'center', tracking: 0.14 })
    // axes
    ctx.strokeStyle = k.rule
    ctx.beginPath()
    ctx.moveTo(px0, py0)
    ctx.lineTo(px0, py0 + ph)
    ctx.lineTo(px0 + pw, py0 + ph)
    ctx.stroke()
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    for (const nm of [100, 200, 500, 1000, 2000, 5000, 10000]) {
      const x = plotX(nm)
      ctx.moveTo(x, py0 + ph)
      ctx.lineTo(x, py0 + ph + 4)
    }
    for (let e = 0; e <= 8; e += 2) {
      const y = plotY(Math.pow(10, e))
      ctx.moveTo(px0 - 4, y)
      ctx.lineTo(px0, y)
    }
    ctx.stroke()
    const fs = tiny ? 7.5 : 8.5
    for (const nm of tiny || pw < 380 ? [100, 1000, 10000] : [100, 200, 500, 1000, 2000, 5000, 10000]) text(ctx, nm >= 1000 ? `${nm / 1000} µm` : `${nm}`, plotX(nm), py0 + ph + 15, { size: fs, color: k.muted, align: 'center', tracking: 0.02 })
    for (let e = 0; e <= 8; e += tiny ? 4 : 2) text(ctx, `10${['⁰', '', '²', '', '⁴', '', '⁶', '', '⁸'][e]}`, px0 - 7, plotY(Math.pow(10, e)) + 3, { size: fs, color: k.muted, align: 'right', tracking: 0 })
    if (!tiny && !short) {
      text(ctx, 'WAVELENGTH (NM)', px0 + pw, py0 + ph + 30, { size: 8.5, color: k.muted, align: 'right', tracking: 0.14 })
      text(ctx, 'SPECTRAL RADIANCE · W·sr⁻¹·m⁻²·nm⁻¹', px0, py0 - 10, { size: 8.5, color: k.muted, tracking: 0.12 })
    }
    // Wien's line: the peaks of every curve lie on it (slope −5 on these axes)
    ctx.save()
    ctx.beginPath()
    ctx.rect(px0, py0, pw, ph)
    ctx.clip()
    ctx.strokeStyle = 'rgba(238,244,241,0.28)'
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    for (let s = 0; s <= 40; s++) {
      const TT = Math.exp(lerp(Math.log(250), Math.log(40000), s / 40))
      const lm = wienPeak(TT)
      const x = plotX(lm)
      const y = plotY(Bnm(lm, TT))
      if (s === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    // landmark curves, left behind as the temperature passes them
    ctx.lineWidth = 1
    MARKS.forEach((m, i) => {
      if (Tshow < m.T * 1.01 && i > 0) return
      const c = curves[i]
      ctx.strokeStyle = bbCss(m.T, 0.32)
      ctx.beginPath()
      let started = false
      for (let q = 0; q < NC; q++) {
        const y = c[q * 2 + 1]
        if (y > py0 + ph + 2) {
          started = false
          continue
        }
        if (!started) ctx.moveTo(c[q * 2], Math.max(py0 - 2, y))
        else ctx.lineTo(c[q * 2], Math.max(py0 - 2, y))
        started = true
      }
      ctx.stroke()
    })
    // the live curve, drawing on from the long-wave end in chapter I
    curveInto(T, live)
    const prog = clamp((lastBeat - 1.2) / 3.2)
    ctx.strokeStyle = bbCss(T, 1)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    let started = false
    const nDraw = Math.round(NC * ease.inOutSine(prog))
    for (let q = NC - 1; q >= NC - nDraw; q--) {
      const y = live[q * 2 + 1]
      if (y > py0 + ph + 2) {
        started = false
        continue
      }
      if (!started) ctx.moveTo(live[q * 2], Math.max(py0 - 2, y))
      else ctx.lineTo(live[q * 2], Math.max(py0 - 2, y))
      started = true
    }
    ctx.stroke()
    ctx.restore()
    // the peak, dimensioned
    if (prog > 0.9) {
      const lm = wienPeak(T)
      const x = plotX(lm)
      const yP = plotY(Bnm(lm, T))
      if (x >= px0 - 1 && x <= px0 + pw) {
        ctx.strokeStyle = bbCss(T, 0.9)
        ctx.fillStyle = bbCss(T, 1)
        ctx.beginPath()
        ctx.arc(x, Math.max(py0, yP), 3, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = k.ink2
        ctx.setLineDash([1.5, 3])
        ctx.beginPath()
        ctx.moveTo(x, Math.max(py0, yP) + 5)
        ctx.lineTo(x, py0 + ph)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(x - 4, py0 + ph - 1)
        ctx.lineTo(x, py0 + ph - 7)
        ctx.lineTo(x + 4, py0 + ph - 1)
        ctx.stroke()
        const label = lm >= 1000 ? `λ PEAK ${(lm / 1000).toFixed(2)} µm` : `λ PEAK ${Math.round(lm)} NM`
        halo(label, x + 7, py0 + ph - 10, { size: 9, color: k.ink, tracking: 0.1, align: x > px0 + pw * 0.7 ? 'right' : 'left' })
      }
    }
    // landmark labels at their peaks
    if (!tiny) {
      MARKS.forEach((m, i) => {
        if (i === 0 || Tshow < m.T * 1.01) return
        const lm = wienPeak(m.T)
        const x = plotX(lm)
        const y = plotY(Bnm(lm, m.T))
        if (x < px0 || y < py0) return
        halo(m.short, x + 5, y - 6, { size: 8, color: bbCss(m.T, 0.8), tracking: 0.12 })
      })
      if (!short) halo('WIEN · λ·T = 2,898 µm·K', plotX(5200) - 6, plotY(Bnm(5200, 2.897771955e6 / 5200)) + 4, { size: 8.5, color: k.muted, tracking: 0.1, align: 'right' })
    }
    ctx.restore()
  }
  let lastBeat = 0

  /** the temperature scale: a strip of blackbody colour, log-spaced, with a handle */
  function drawScale(T: number, a: number, ghost: number, ghostX: number) {
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    const y = tyS
    // the colour strip as fine vertical hairlines
    ctx.lineWidth = 1
    for (let x = Math.floor(tx0); x <= tx1; x += 2) {
      ctx.strokeStyle = bbCss(tScaleT(x), 0.9)
      ctx.beginPath()
      ctx.moveTo(x + 0.5, y - 5)
      ctx.lineTo(x + 0.5, y + 5)
      ctx.stroke()
    }
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    for (const t of [1000, 2000, 3000, 5000, 10000, 20000, 30000]) {
      const x = tScaleX(t)
      ctx.moveTo(x, y + 7)
      ctx.lineTo(x, y + 11)
    }
    ctx.stroke()
    const fs = tiny ? 7.5 : 8.5
    const tl = tiny || tx1 - tx0 < 380 ? [1000, 3000, 10000, 30000] : [1000, 2000, 3000, 5000, 10000, 20000, 30000]
    for (const t of tl) text(ctx, t === 30000 ? '30,000 K' : t === 1000 ? '1,000' : `${t / 1000}k`, tScaleX(t), y + 21, { size: fs, color: k.muted, align: t === 30000 ? 'right' : t === 1000 ? 'left' : 'center', tracking: 0.02 })
    // landmarks above the strip
    if (!tiny && !short && tx1 - tx0 > 300) {
      let lastRight = -Infinity
      MARKS.forEach((m, i) => {
        const x = tScaleX(m.T)
        ctx.strokeStyle = k.rule
        ctx.beginPath()
        ctx.moveTo(x, y - 8)
        ctx.lineTo(x, y - 12)
        ctx.stroke()
        setFont(ctx, { size: 7.5, tracking: 0.1 })
        const lw2 = ctx.measureText(m.short).width
        const al: CanvasTextAlign = i === 0 ? 'left' : i === MARKS.length - 1 ? 'right' : 'center'
        const left = al === 'left' ? x - 3 : al === 'right' ? x - lw2 : x - lw2 / 2
        if (left < lastRight + 6) return
        lastRight = left + lw2
        text(ctx, m.short, al === 'left' ? x - 3 : x, y - 16, { size: 7.5, color: k.muted, align: al, tracking: 0.1 })
      })
    }
    // the handle
    const hx = tScaleX(T)
    const hot = drag === 'scale' || hover === 'scale'
    ctx.fillStyle = bbCss(T)
    ctx.strokeStyle = k.ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(hx, y - 7)
    ctx.lineTo(hx - 5, y - 15)
    ctx.lineTo(hx + 5, y - 15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(hx, y - 7)
    ctx.lineTo(hx, y + 7)
    ctx.stroke()
    if (hot) {
      ctx.beginPath()
      ctx.arc(hx, y, touch ? 16 : 10, 0, TAU)
      ctx.stroke()
    }
    // the ghost: a hand sliding the temperature
    if (ghost > 0) {
      ctx.globalAlpha = a * ghost
      ctx.strokeStyle = k.ink
      ctx.fillStyle = k.ink
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.moveTo(tScaleX(1000), y)
      ctx.lineTo(ghostX - 12, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(ghostX, y, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ghostX, y, 11, 0, TAU)
      ctx.stroke()
      const right = ghostX < (tx0 + tx1) / 2
      halo(touch ? 'DRAG TO SET THE TEMPERATURE' : 'DRAG TO SET THE TEMPERATURE', ghostX + (right ? 18 : -18), y - 22, { size: 9.5, color: k.ink, tracking: 0.14, align: right ? 'left' : 'right' })
    }
    ctx.restore()
  }

  /** stars: in the sky (u = 0), in the HR diagram (u = 1), gathered into the ember (g = 1) */
  const SX = new Float32Array(NS)
  const SY = new Float32Array(NS)
  const HIDE = new Uint8Array(NS)
  function drawStars(a: number, sort: number, gather: number, highlightT: number) {
    if (a <= 0) return
    const skyX0 = pad
    const skyY0 = pad + 34
    const skyW = w - pad * 2
    const skyH = h - pad - (rulerOn ? 30 : 6) - skyY0
    for (let i = 0; i < NS; i++) {
      const d = sDelay[i]
      const u = ease.inOutCubic(clamp((sort - d * 0.35) / 0.65))
      let x = lerp(skyX0 + sX[i] * skyW, hrX(sT[i]), u)
      let y = lerp(skyY0 + sY[i] * skyH, hrY(sL[i]), u)
      if (gather > 0) {
        const gu = ease.inOutCubic(clamp((gather - d * 0.3) / 0.7))
        x = lerp(x, ex, gu)
        y = lerp(y, ey, gu)
      }
      SX[i] = x
      SY[i] = y
      // in the open sky, keep the words clear
      HIDE[i] = u < 0.5 && gather < 0.3 && x > capX - 8 && x < capX + capW && y > capY - 18 && y < capY + capSize * 2.6 ? 1 : 0
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    // one path per colour bin
    for (let b = 0; b < NBIN; b++) {
      ctx.fillStyle = binCol[b]
      ctx.beginPath()
      let any = false
      for (let i = 1; i < NS; i++) {
        if (sBin[i] !== b || HIDE[i]) continue
        // a slow twinkle in the open sky, stilled once the stars are sorted
        const tw = 1 + (1 - sort) * 0.18 * Math.sin(lastBeat * (1.3 + sDelay[i] * 2.2) + i)
        const r = (0.55 + sMag[i] * 1.7) * (1 - gather * 0.6) * (tiny ? 0.8 : 1) * tw
        ctx.moveTo(SX[i] + r, SY[i])
        ctx.arc(SX[i], SY[i], r, 0, TAU)
        any = true
      }
      if (!any) continue
      ctx.globalAlpha = a * 0.82
      ctx.fill()
    }
    ctx.restore()
    // the Sun: a slightly larger dot, ringed
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = bbCss(T_SUN)
    ctx.beginPath()
    ctx.arc(SX[0], SY[0], 2.2, 0, TAU)
    ctx.fill()
    const ring = smoothstep(52.5, 54, lastBeat) * (1 - smoothstep(63.6, 64.6, lastBeat)) + (sort < 0.1 ? smoothstep(39, 40.5, lastBeat) * (1 - smoothstep(45, 46, lastBeat)) * 0.6 : 0)
    if (ring > 0 && gather < 0.1) {
      ctx.globalAlpha = a * ring
      ctx.strokeStyle = k.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(SX[0], SY[0], 9, 0, TAU)
      ctx.stroke()
      const lab = sort > 0.5 ? (tiny || hh < 240 ? 'THE SUN' : 'THE SUN · 5,772 K · 1 L☉ · G2 V') : 'THE SUN'
      setFont(ctx, { size: 9, tracking: 0.12 })
      const lw2 = ctx.measureText(lab).width
      const sg = SX[0] + 38 + lw2 > w - pad ? -1 : 1
      ctx.beginPath()
      ctx.moveTo(SX[0] + 6.4 * sg, SY[0] - 6.4)
      ctx.lineTo(SX[0] + 22 * sg, SY[0] - 22)
      ctx.lineTo(SX[0] + 34 * sg, SY[0] - 22)
      ctx.stroke()
      halo(lab, SX[0] + 38 * sg, SY[0] - 19, { size: 9, color: k.ink, tracking: 0.12, align: sg > 0 ? 'left' : 'right' })
    }
    // the highlighted temperature band (from the scale) in the HR diagram
    if (highlightT > 0 && sort > 0.9) {
      const x = hrX(highlightT)
      ctx.globalAlpha = a * 0.8
      ctx.strokeStyle = bbCss(highlightT, 0.7)
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, hy0 + 16)
      ctx.lineTo(x, hy0 + hh)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = bbCss(highlightT)
      ctx.fillRect(x - 5, hy0 + hh - 12, 10, 10)
      halo(`${fmt(highlightT)} K · ${classOf(highlightT)}`, x + 8, hy0 + hh - 4, { size: 9, color: k.ink, tracking: 0.1, align: x > hx0 + hw * 0.75 ? 'right' : 'left' })
    }
    ctx.restore()
  }

  function drawHRAxes(a: number) {
    if (a <= 0) return
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = k.rule
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(hx0, hy0)
    ctx.lineTo(hx0, hy0 + hh)
    ctx.lineTo(hx0 + hw, hy0 + hh)
    ctx.stroke()
    ctx.strokeStyle = k.ink2
    ctx.beginPath()
    for (const t of [40000, 20000, 10000, 5000, 2500]) {
      const x = hrX(t)
      ctx.moveTo(x, hy0 + hh)
      ctx.lineTo(x, hy0 + hh + 4)
    }
    for (let e = -4; e <= 6; e += 2) {
      const y = hrY(e)
      ctx.moveTo(hx0 - 4, y)
      ctx.lineTo(hx0, y)
    }
    ctx.stroke()
    const fs = tiny ? 7.5 : 8.5
    for (const t of [40000, 20000, 10000, 5000, 2500]) text(ctx, fmt(t), hrX(t), hy0 + hh + 15, { size: fs, color: k.muted, align: 'center', tracking: 0.02 })
    const sup = ['⁻⁴', '⁻²', '⁰', '²', '⁴', '⁶']
    for (let e = -4; e <= 6; e += 2) text(ctx, e === 0 ? '1' : `10${sup[(e + 4) / 2]}`, hx0 - 7, hrY(e) + 3, { size: fs, color: k.muted, align: 'right', tracking: 0 })
    if (!tiny) {
      if (hy0 + hh + 34 < (rulerOn ? rulerY() - 14 : h - 4) && hy0 + hh + 34 < capY - 12 + (capX + capW < hx0 ? 999 : 0)) text(ctx, 'SURFACE TEMPERATURE (K) — HOTTER TO THE LEFT', hx0 + hw, hy0 + hh + 30, { size: 8.5, color: k.muted, align: 'right', tracking: 0.12 })
      text(ctx, 'LUMINOSITY · L☉', hx0, hy0 - 10, { size: 8.5, color: k.muted, tracking: 0.12 })
      // spectral classes along the top
      for (const [c, lo] of SPECTRAL) {
        const hi = c === 'O' ? 40000 : SPECTRAL[SPECTRAL.findIndex((s) => s[0] === c) - 1][1]
        const x = (hrX(Math.max(lo, 2400)) + hrX(Math.min(hi, 40000))) / 2
        text(ctx, c, x, hy0 + 10, { size: 9, color: k.ink2, align: 'center', tracking: 0 })
      }
      // regions
      if (hh < 200) {
        ctx.restore()
        return
      }
      const lab = (s: string, T: number, L: number, al: CanvasTextAlign = 'center') => halo(s, hrX(T), hrY(L), { size: 8.5, color: k.muted, align: al, tracking: 0.14 })
      lab('MAIN SEQUENCE', 14000, 1.2, 'center')
      lab('GIANTS', 4200, 3.4)
      lab('SUPERGIANTS', 9000, 5.85)
      lab('WHITE DWARFS', 12000, -3.7)
    }
    ctx.restore()
  }

  function captionAt(T: number, temp: number) {
    for (const cap of CAPTIONS) {
      if (T < cap.t0 - 0.1 || T > cap.t1 + 0.1) continue
      const lineH = capSize * 1.06
      cap.lines.forEach((ln, li) => {
        const pr = ease.outExpo(clamp((T - cap.t0 - li * 0.14) / 1.0))
        const pe = ease.inCubic(clamp((T - (cap.t1 - 0.7 + li * 0.08)) / 0.6))
        if (pr <= 0 || pe >= 1) return
        const y = capY + capSize + li * lineH
        ctx.save()
        ctx.beginPath()
        ctx.rect(capX - 4, y - capSize * 1.02, capW + 80, capSize * 1.32)
        ctx.clip()
        const dy = (1 - pr) * capSize * 1.15 - pe * capSize * 0.9
        setFont(ctx, { font: 'serif', size: capSize })
        const sw = ln.s ? ctx.measureText(ln.s).width : 0
        ctx.globalAlpha = 1 - pe * 0.6
        if (ln.s) text(ctx, ln.s, capX, y + dy, { font: 'serif', size: capSize, color: k.ink })
        if (ln.em) text(ctx, ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: cap.hot ? bbCss(temp) : cap.t0 > 50 ? bbCss(T_SUN) : ACC })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, temp: number, stars: number) {
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    const fs = tiny ? 8.5 : 10
    if (!preview) env.setCursor(drag !== 'none' ? (drag === 'ruler' ? 'pointer' : 'grabbing') : hover === 'scale' || hover === 'plot' ? 'grab' : hover === 'hr' ? 'crosshair' : hover === 'ruler' || hover === 'star' ? 'pointer' : 'default')
    text(ctx, `${FIG} — Blackbody`, pad, pad + 10, { size: tiny ? 8.5 : 10, color: k.muted, tracking: 0.16, upper: true })
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8))
    if (!tiny || h > 260) text(ctx, `${c.num} — ${c.name}`, capX, capY - (tiny ? 2 : 6), { size: tiny ? 8.5 : 10, color: k.ink2, tracking: 0.16, upper: true, alpha: kIn })
    // readouts
    const rows: [string, string][] = []
    if (stars < 0.5 || T > 66) {
      rows.push(['T', `${fmt(temp)} K`])
      const lm = wienPeak(temp)
      rows.push(['λ peak', lm >= 1000 ? `${(lm / 1000).toFixed(2)} µm` : `${Math.round(lm)} nm`])
      const M = SIGMA * temp ** 4
      rows.push(['σT⁴', M >= 1e9 ? `${(M / 1e9).toFixed(1)} GW/m²` : M >= 1e6 ? `${(M / 1e6).toFixed(M >= 1e8 ? 0 : 1)} MW/m²` : `${(M / 1e3).toFixed(1)} kW/m²`])
    } else {
      rows.push(['stars', String(NS)])
      if (hoverStar >= 0) {
        const L = Math.pow(10, sL[hoverStar])
        rows.push(['T', `${fmt(sT[hoverStar])} K`], ['L', `${L >= 100 ? fmt(L) : L.toPrecision(2)} L☉`], ['kind', ['main seq.', 'giant', 'supergiant', 'white dwarf'][sKind[hoverStar]]])
      } else if (userW > 0 && T > 47) rows.push(['T', `${fmt(temp)} K`], ['class', classOf(temp)])
      else rows.push(['sun', '5,772 K'], ['class', 'G2 V'])
    }
    if (tiny && rows.length > 2) rows.length = 2
    let y = pad + 10
    for (const [label, value] of rows) {
      setFont(ctx, { size: fs, tracking: 0.06 })
      text(ctx, value, w - pad, y, { size: fs, color: k.ink, align: 'right', tracking: 0.06 })
      const vw = ctx.measureText(value).width
      text(ctx, label, w - pad - vw - 10, y, { size: fs - 1, color: k.muted, align: 'right', tracking: 0.14, upper: label.length > 2 && !label.includes('σ') && !label.includes('λ') })
      y += tiny ? 13 : 16
    }
    if (rulerOn) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY()
      ctx.lineWidth = 1
      ctx.strokeStyle = k.rule
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 72; i++) {
        const x = lerp(x0, x1, i / 72)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 6 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = k.ink
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360) {
        CHAPTERS.forEach((cc, i) => {
          const x = lerp(x0, x1, cc.t / LOOP)
          text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? k.ink : k.muted, tracking: 0.1 })
        })
      }
      if (hoverX >= 0) {
        const hx = clamp(hoverX, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c2, i) => (ht >= c2.t ? i : acc), 0)
        ctx.strokeStyle = C.sky
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${String(Math.floor(ht)).padStart(2, '0')} S`, clamp(hx, x0 + 30, x1 - 30), yb - 17, { size: 9, color: C.sky, align: 'center', tracking: 0.12 })
      }
    }
  }

  /* ------------------------------------------------------------ frame */

  function frame(t: number, dt: number) {
    lastT = t
    const T = curT()
    lastBeat = T
    if (prevT >= 0 && T < prevT - 1) userT = -1
    // the viewer's temperature eases back to the story a few seconds after release
    if (drag === 'none' && userT > 0 && dt > 0 && t - release > 3) userW = Math.max(0, userW - dt * 0.6)
    if (userW <= 0) userT = -1
    const aT = authoredT(T)
    const temp = userT > 0 ? Math.exp(lerp(Math.log(aT), Math.log(userT), ease.inOutSine(userW))) : aT

    // phases
    const plotA = smoothstep(0.6, 1.8, T) * (1 - smoothstep(34.5, 37, T)) + smoothstep(69.5, 71.5, T) * 0
    const starA = smoothstep(35, 38, T) * (1 - smoothstep(70.6, 71.8, T))
    const sort = smoothstep(46.5, 52.5, T) * (1 - smoothstep(63.2, 65.6, T))
    const gather = smoothstep(64.4, 70.4, T)
    const axesA = smoothstep(48.5, 51.5, T) * (1 - smoothstep(62.8, 64.2, T))
    const emberA = smoothstep(0.2, 1.4, T) * (1 - smoothstep(36, 38.5, T)) + smoothstep(68.5, 71, T)
    const scaleA = smoothstep(2.6, 4.2, T) * (1 - smoothstep(35, 37, T))

    // the ghost demonstration
    let ghost = 0
    let ghostX = 0
    if (!preview && !touched && t < LOOP && T > 12 && T < 18) {
      const u = (T - 12) / 6
      ghost = smoothstep(0, 0.12, u) * (1 - smoothstep(0.85, 1, u))
      ghostX = tScaleX(temp)
    }
    const shown = temp

    ground(ctx, w, h, 'night')
    drawEmber(gather > 0.5 ? temp : shown, emberA)
    if (plotA > 0) drawPlot(shown, plotA, Math.max(shown, aT))
    if (starA > 0) {
      drawHRAxes(axesA)
      drawStars(starA, sort, gather, sort > 0.9 && (drag === 'scale' || userW > 0) ? temp : -1)
    }
    drawScale(sort > 0.5 ? temp : shown, scaleA, ghost, ghostX)

    // the big numeral and its swatch
    const numA = smoothstep(0.8, 2, T) * (1 - smoothstep(35, 37, T)) + smoothstep(69, 71, T)
    if (numA > 0) {
      const T2 = shown
      ctx.save()
      ctx.globalAlpha = numA
      setFont(ctx, { font: 'serif', size: numSize })
      const s2 = fmt(T2)
      const nw = ctx.measureText(s2).width
      text(ctx, s2, numX, numY, { font: 'serif', size: numSize, color: k.ink })
      text(ctx, 'KELVIN', numX + nw + 8, numY - numSize * 0.12, { size: tiny ? 8 : 9.5, color: k.muted, tracking: 0.16 })
      // the swatch, like a printer's patch, with its name
      const sw = tiny ? 12 : clamp(numSize * 0.32, 14, 30)
      const sy = numY + (tiny ? 8 : 14)
      ctx.fillStyle = bbCss(T2)
      ctx.fillRect(numX, sy, sw, sw)
      ctx.strokeStyle = k.ink2
      ctx.lineWidth = 1
      ctx.strokeRect(numX + 0.5, sy + 0.5, sw, sw)
      if (!tiny) {
        const near = MARKS.reduce((b, m) => (Math.abs(Math.log(m.T / T2)) < Math.abs(Math.log(b.T / T2)) ? m : b), MARKS[0])
        if (Math.abs(Math.log(near.T / T2)) < 0.07) text(ctx, near.name.toUpperCase(), numX + sw + 10, sy + sw / 2 + 3, { size: 9, color: k.ink2, tracking: 0.14 })
      }
      ctx.restore()
    }

    // sound
    if (env.sfx.enabled || tone) {
      if (!env.sfx.enabled) stopTone()
      else toneSet((plotA > 0.1 ? plotA : 0) * (T > 1.5 ? 1 : 0) + (drag !== 'none' ? 0.6 : 0), shown)
    }

    captionAt(T, shown)
    chrome(T, shown, starA)
    prevT = T
  }

  /* -------------------------------------------------------- hit tests */

  const overScale = (x: number, y: number) => Math.abs(y - tyS) < (touch ? 26 : 16) && x > tx0 - 12 && x < tx1 + 12
  const overPlot = (x: number, y: number) => x > px0 && x < px0 + pw && y > py0 && y < py0 + ph
  const overHR = (x: number, y: number) => x > hx0 && x < hx0 + hw && y > hy0 && y < hy0 + hh
  const hrT = (x: number) => Math.pow(10, HT0 + clamp((x - hx0) / hw) * (HT1 - HT0))
  function nearestStar(x: number, y: number) {
    let best = -1
    let bd = (touch ? 22 : 12) ** 2
    for (let i = 0; i < NS; i++) {
      const d = (SX[i] - x) ** 2 + (SY[i] - y) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }
  function setUserT(v: number) {
    userT = clamp(v, T_MIN, T_MAX)
    userW = 1
    touched = true
  }

  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      touch = p.pointerType === 'touch'
      const T = curT()
      const plotLive = T > 1.5 && T < 34.5
      const scaleLive = (T > 3 && T < 35) || (T > 47.5 && T < 63)
      const starsLive = T > 38 && T < 63.5
      if (p.type === 'leave') {
        hover = 'none'
        hoverX = -1
        hoverStar = -1
        if (drag !== 'none' && drag !== 'ruler') release = lastT
        drag = 'none'
        return
      }
      if (drag === 'ruler') {
        hoverX = p.x
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') drag = 'none'
        return
      }
      if (drag === 'scale' || drag === 'plot' || drag === 'hr') {
        if (p.type === 'move') setUserT(drag === 'scale' ? tScaleT(p.x) : drag === 'hr' ? hrT(p.x) : 2.897771955e6 / plotNm(p.x))
        if (p.type === 'up') {
          drag = 'none'
          release = lastT
        }
        return
      }
      const ruler = onRuler(p.x, p.y)
      hoverX = ruler ? p.x : -1
      hoverStar = starsLive ? nearestStar(p.x, p.y) : -1
      const hrLive = T > 51 && T < 63
      hover = ruler ? 'ruler' : scaleLive && overScale(p.x, p.y) ? 'scale' : plotLive && overPlot(p.x, p.y) ? 'plot' : hoverStar >= 0 ? 'star' : hrLive && overHR(p.x, p.y) ? 'hr' : 'none'
      if (p.type === 'down') {
        if (hover === 'ruler') {
          drag = 'ruler'
          seekTo(p.x)
        } else if (hover === 'scale') {
          drag = 'scale'
          setUserT(tScaleT(p.x))
        } else if (hover === 'plot') {
          drag = 'plot'
          setUserT(2.897771955e6 / plotNm(p.x))
        } else if (hover === 'star' && hoverStar >= 0) {
          env.sfx.tone(110 * Math.pow(1.5, Math.log2(sT[hoverStar] / T_MIN)), 0.6, { type: 'sine', gain: 0.05, room: 0.5 })
          if (T > 51 && T < 63) {
            drag = 'hr'
            setUserT(hrT(p.x))
          }
        } else if (hover === 'hr') {
          drag = 'hr'
          setUserT(hrT(p.x))
        }
      }
    },
    key(code, down) {
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false
      if (!down) return true
      const T = curT()
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
    frame,
    destroy() {
      stopTone()
    },
  }
}

export default create
