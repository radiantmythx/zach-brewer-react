/*
 * FIG. S.09 — CHIRP
 *
 * Two black holes, a billion years ago, and the sound they made: GW150914.
 *
 * The waveform is synthesised, not simulated. The inspiral follows the
 * leading-order (quadrupole) chirp, f(τ) = (1/π)(5/256τ)^{3/8}(GM_c/c³)^{-5/8},
 * with amplitude ∝ f^{2/3}; at the frequency where numerical relativity puts
 * the peak (Mω ≈ 0.36) it hands over to a damped ringdown at the remnant's
 * quasi-normal frequency, from standard fits for the final mass and spin.
 * The phase is the running integral of 2πf, so the plot, the picture and
 * the sound share one signal.
 *
 * The picture slows time (×17 through the inspiral, ×50 at the merger: the
 * real thing lasts under two seconds) and draws the orbital plane as a
 * hairline grid, pinched towards each hole and displaced tangentially by the
 * outgoing quadrupole wave, h ∝ A(t − r/c)/r · cos(2φ − Φ(t − r/c)), with the
 * wave speed scaled down so the ripples fit the page.
 *
 *   I    Two black holes   circling, ~19 orbits from 15 Hz
 *   II   The chirp         faster, closer, the merger, the ringdown
 *   III  The long way      1.3 billion years, Earth's history passing
 *   IV   Arrival           Livingston, then Hanford 6.9 ms later
 *   V    Listen            the chirp in real time, two octaves up
 *
 * Drag either mass on its ruler and the binary replays with its own chirp.
 * Tap the strain plot (or press Space) to hear it.
 */

import { C, TAU, clamp, cropMarks, ease, ground, lerp, mod, rgba, setFont, smoothstep, text } from '../kit'
import type { TextOpts } from '../kit'
import type { CreatePiece } from '../types'

if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([
      document.fonts.load('400 40px "Instrument Serif"'),
      document.fonts.load('italic 400 40px "Instrument Serif"'),
      document.fonts.load('500 11px "Geist Mono"'),
    ]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const FIG = 'FIG. S.09'
const LOOP = 72
const CHAPTERS = [
  { t: 0, num: 'I', name: 'Two black holes' },
  { t: 14, num: 'II', name: 'The chirp' },
  { t: 30, num: 'III', name: 'The long way' },
  { t: 42, num: 'IV', name: 'Arrival' },
  { t: 56, num: 'V', name: 'Listen' },
]
/** the merger, in story time */
const T_M = 25.6
const HOLD_AT = 69
const OUTRO = 70.4
/** GW150914 (source frame), redshift */
const M1_0 = 36
const M2_0 = 29
const Z = 0.09
/** G M☉ / c³ in seconds, G M☉ / c² in km */
const TSUN = 4.925491e-6
const RSUN_KM = 1.476625
const F_START = 15
const INK = '#EEF4F1'
const INK2 = 'rgba(238,244,241,0.78)'
const MUTED = 'rgba(238,244,241,0.5)'
const RULE = 'rgba(238,244,241,0.14)'
const HOLE = '#04090b'
const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0]

interface Caption {
  t0: number
  t1: number
  lines: { s: string; em?: string }[]
}
const CAPTIONS: Caption[] = [
  { t0: 1.4, t1: 11.8, lines: [{ s: 'Two black holes,' }, { s: '', em: 'circling.' }] },
  { t0: 14.6, t1: 27.6, lines: [{ s: 'Space itself' }, { s: 'begins ', em: 'to ring.' }] },
  { t0: 39.4, t1: 51.6, lines: [{ s: '1.3 billion years later,' }, { s: 'it ', em: 'reached us.' }] },
  { t0: 57.0, t1: 68.6, lines: [{ s: 'This is what' }, { s: 'it ', em: 'sounded like.' }] },
]

/** Earth's history as the wave crossed the gap (years before arrival). */
const EPOCHS: [number, string, string, number][] = [
  [1.3e9, 'It leaves', 'life on Earth is almost all single cells', -1],
  [5.4e8, 'The Cambrian', 'animals with eyes', 1],
  [6.6e7, 'The dinosaurs end', '', -2],
  [3.0e5, 'Homo sapiens', '', 1],
  [99, '1916', 'Einstein predicts the waves', -1],
  [41, '1974', 'a binary pulsar is found', 2],
  [0.02, 'Sept 2015', 'Advanced LIGO is listening', -2],
]

/* ------------------------------------------------------------- the model */

interface Binary {
  m1: number
  m2: number
  M: number
  eta: number
  /** chirp mass, source and detector frame (M☉) */
  mc: number
  mcDet: number
  mf: number
  af: number
  erad: number
  /** detector-frame frequencies (Hz) and ringdown damping time (s) */
  fPeak: number
  fRing: number
  tauRing: number
  /** where the drawing starts: 15 Hz, or later for light binaries (~40 cycles) */
  fStart: number
  /** the audio's pitch multiplier (keeps the ringdown under ~1.2 kHz) */
  pitch: number
  /** the audio starts here (s from the peak): 20 Hz, at most 3 s before */
  tAudio: number
  /** time from fStart to the peak (s, real) */
  tau0: number
  tauPeak: number
  /** horizon radii, km (2GM/c²) */
  rs1: number
  rs2: number
  rsf: number
  /** waveform tables at FS Hz from −tau0 to +POST (detector frame) */
  t0: number
  n: number
  f: Float32Array
  A: Float32Array
  ph: Float64Array
  ampPeak: number
}
const FS = 4096
const POST = 0.06

function makeBinary(m1: number, m2: number): Binary {
  const M = m1 + m2
  const eta = (m1 * m2) / (M * M)
  const mc = Math.pow(m1 * m2, 0.6) / Math.pow(M, 0.2)
  const mcDet = mc * (1 + Z)
  const Mdet = M * (1 + Z)
  // radiated energy and final spin: polynomial fits in η to non-spinning numerical relativity
  const eFrac = 0.0559745 * eta + 0.580951 * eta * eta - 0.960673 * eta ** 3 + 3.35241 * eta ** 4
  const af = 2 * Math.sqrt(3) * eta - 3.871 * eta * eta + 4.028 * eta ** 3
  const mf = M * (1 - eFrac)
  const mfDet = mf * (1 + Z)
  // the ℓ = m = 2 ringdown (Berti, Cardoso & Will 2006 fits)
  const wR = 1.5251 - 1.1568 * Math.pow(1 - af, 0.1292)
  const Q = 0.7 + 1.4187 * Math.pow(1 - af, -0.499)
  const fRing = wR / (TAU * mfDet * TSUN)
  const tauRing = Q / (Math.PI * fRing)
  // the peak: GW angular frequency Mω ≈ 0.36 (a little higher for unequal masses is ignored)
  const fPeak = Math.min(0.36 / (TAU * Mdet * TSUN), fRing * 0.92)
  const Tc = mcDet * TSUN
  const tauOf = (f: number) => (5 / 256) * Math.pow(Math.PI * f, -8 / 3) * Math.pow(Tc, -5 / 3)
  const fOf = (tau: number) => (1 / Math.PI) * Math.pow(5 / (256 * tau), 3 / 8) * Math.pow(Tc, -5 / 8)
  const tauPeak = tauOf(fPeak)
  // no more than ~40 cycles on screen: N(f) = (32 π^{8/3})^{-1} (T_c f)^{-5/3}
  const f40 = Math.pow(40 * 32 * Math.pow(Math.PI, 8 / 3), -3 / 5) / Tc
  const fStart = Math.max(F_START, f40)
  const tau0 = tauOf(fStart) - tauPeak
  const pitch = fRing < 320 ? 4 : fRing < 640 ? 2 : 1
  const tAudio = Math.max(-tau0, -Math.min(3, tauOf(Math.max(20, fStart)) - tauPeak))
  const t0 = -tau0
  const n = Math.ceil((tau0 + POST) * FS) + 1
  const f = new Float32Array(n)
  const A = new Float32Array(n)
  const ph = new Float64Array(n)
  const aPk = Math.pow(fPeak, 2 / 3)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = t0 + i / FS
    let fi: number
    let ai: number
    if (t < 0) {
      fi = fOf(tauPeak - t)
      ai = Math.pow(fi, 2 / 3)
      // round the peak over the last ringdown time
      const k = smoothstep(-2.5 * tauRing, 0, t)
      ai = lerp(ai, aPk * (1 - 0.06 * Math.pow(t / (2.5 * tauRing), 2)), k * k)
    } else {
      fi = fRing + (fPeak - fRing) * Math.exp(-t / (0.35 * tauRing))
      ai = aPk * Math.exp(-t / tauRing) * (1 + t / tauRing) * 0.94
    }
    f[i] = fi
    A[i] = ai
    ph[i] = phase
    phase += (TAU * fi) / FS
  }
  // amplitude scale: ∝ M_c^{5/3} f^{2/3}; normalised so GW150914 peaks near 1.0 × 10⁻²¹
  const ref = Math.pow(M1_0 * M2_0, 0.6) / Math.pow(M1_0 + M2_0, 0.2)
  const k0 = Math.pow(mc / ref, 5 / 3) / aPk
  const kRef = 1.0 / Math.pow(0.36 / (TAU * (M1_0 + M2_0) * (1 + Z) * TSUN), 2 / 3)
  for (let i = 0; i < n; i++) A[i] *= k0 * aPk * kRef
  return {
    m1,
    m2,
    M,
    eta,
    mc,
    mcDet,
    mf,
    af,
    erad: M * eFrac,
    fPeak,
    fRing,
    tauRing,
    fStart,
    pitch,
    tAudio,
    tau0,
    tauPeak,
    rs1: 2 * RSUN_KM * m1,
    rs2: 2 * RSUN_KM * m2,
    rsf: 2 * RSUN_KM * mf,
    t0,
    n,
    f,
    A,
    ph,
    ampPeak: aPk * k0 * aPk * kRef,
  }
}

/** linear lookup into a binary's tables at real time t (s from the peak) */
function look(b: Binary, arr: Float32Array | Float64Array, t: number) {
  const x = (t - b.t0) * FS
  if (x <= 0) return arr[0]
  if (x >= b.n - 1) return arr[b.n - 1]
  const i = Math.floor(x)
  return arr[i] + (arr[i + 1] - arr[i]) * (x - i)
}

/* --------------------------------------------- the story clock → real time */

// slowed ×S_IN through the inspiral, ×S_RING through the merger (blended)
const S_RING = 50
const VIS_DT = 1 / 240
const VIS_T0 = -6
const VIS_T1 = 30

interface Visual {
  /** real time (s from the peak) at each story sample */
  tr: Float64Array
  /** slow-down factor at each sample */
  sl: Float32Array
}

function makeVisual(b: Binary): Visual {
  const sIn = T_M / b.tau0
  const slow = (T: number) => lerp(sIn, S_RING, smoothstep(T_M - 1.6, T_M + 0.2, T))
  const n = Math.round((VIS_T1 - VIS_T0) / VIS_DT) + 1
  const tr = new Float64Array(n)
  const sl = new Float32Array(n)
  const iM = Math.round((T_M - VIS_T0) / VIS_DT)
  tr[iM] = 0
  for (let i = iM + 1; i < n; i++) {
    const T = VIS_T0 + (i - 0.5) * VIS_DT
    tr[i] = tr[i - 1] + VIS_DT / slow(T)
  }
  for (let i = iM - 1; i >= 0; i--) {
    const T = VIS_T0 + (i + 0.5) * VIS_DT
    tr[i] = tr[i + 1] - VIS_DT / slow(T)
  }
  for (let i = 0; i < n; i++) sl[i] = slow(VIS_T0 + i * VIS_DT)
  return { tr, sl }
}
function vlook(arr: Float64Array | Float32Array, T: number) {
  const x = (T - VIS_T0) / VIS_DT
  if (x <= 0) return arr[0]
  if (x >= arr.length - 1) return arr[arr.length - 1]
  const i = Math.floor(x)
  return arr[i] + (arr[i + 1] - arr[i]) * (x - i)
}

/* --------------------------------------------------------------- the piece */

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const sfx = env.sfx

  const gw = makeBinary(M1_0, M2_0)
  const gwVis = makeVisual(gw)
  let bin = gw
  let vis = gwVis
  let custom = false

  /* ---------------------------------------------------------- layout */
  let w = env.width
  let h = env.height
  let pad = 16
  let portrait = false
  let wide = false
  let short = false
  let tiny = false
  let small = false
  let capX = 0
  let capY = 0
  let capSize = 24
  let rulerOn = true
  /** the orbital-plane panel */
  const P = { x: 0, y: 0, w: 1, h: 1, cx: 0, cy: 0 }
  /** the strain plot */
  const S = { x: 0, y: 0, w: 1, h: 1, on: true }
  /** the mass ruler */
  const MR = { x0: 0, x1: 0, y: 0, on: true }
  /** the polarisation rings */
  const PR = { x: 0, y: 0, r: 20, on: true }
  /** the big numeral in the left column */
  const NUM = { x: 0, y: 0, size: 80, on: false }

  function captionWidth(size: number) {
    let mw = 0
    for (const c of CAPTIONS)
      for (const ln of c.lines) {
        setFont(ctx, { font: 'serif', size })
        let lw = ln.s ? ctx.measureText(ln.s).width : 0
        if (ln.em) {
          setFont(ctx, { font: 'serif', size, italic: true })
          lw += ctx.measureText(ln.em).width
        }
        mw = Math.max(mw, lw)
      }
    return mw
  }

  function layout() {
    w = env.width
    h = env.height
    portrait = h > w * 1.05
    wide = !portrait && w >= h * 1.2
    short = h < 420
    tiny = h < 260
    small = preview || Math.min(w, h) < 480
    pad = preview ? 12 : clamp(Math.min(w, h) * 0.045, 12, 36)
    rulerOn = !preview && h >= 200
    const rulerSpace = rulerOn ? (tiny ? 12 : 16) : 0
    capSize = portrait ? clamp(Math.min(w * 0.072, h * 0.04), 17, 40) : clamp(Math.min(w * 0.036, h * (short ? 0.085 : 0.06)), tiny ? 13 : 15, 46)
    if (preview) capSize = 16
    const top = pad + (tiny ? 18 : 26)
    if (wide) {
      const leftW = clamp(w * (short ? 0.33 : 0.3), 150, 400)
      while (capSize > 12 && captionWidth(capSize) > leftW) capSize -= 1
      capX = pad * (preview ? 1 : 1.25)
      capY = h - pad - rulerSpace - capSize * 2.12
      const x0 = pad + leftW + 14
      const bottom = h - pad - rulerSpace - (h >= 300 ? 22 : 6)
      // strain plot along the bottom of the right side (not on very short frames)
      S.on = h >= 300
      const sh = S.on ? clamp((bottom - top) * 0.24, 70, 190) : 0
      P.x = x0
      P.y = top
      P.w = w - pad - x0
      P.h = bottom - top - (S.on ? sh + 18 : 0)
      S.x = x0 + (small ? 22 : 30)
      S.w = w - pad - S.x
      S.h = sh
      S.y = bottom - sh
      // the left column: mass ruler, then the polarisation rings, above the caption
      MR.on = !preview
      MR.x0 = capX + 4
      MR.x1 = capX + leftW - 24
      MR.y = capY - (tiny ? 26 : short ? 44 : 56)
      PR.on = !preview && !tiny && MR.y - top > 130
      PR.r = clamp(Math.min(leftW * 0.11, (MR.y - top) * 0.13), 14, 30)
      PR.x = capX + PR.r + 8
      PR.y = MR.y - (short ? 46 : 64) - PR.r
      const room = (PR.on ? PR.y - PR.r - 30 : preview ? capY - 30 : MR.y - 40) - (top + 40)
      NUM.on = room > 90
      NUM.size = clamp(Math.min(room * 0.55, leftW * 0.3), 40, 120)
      NUM.x = capX
      NUM.y = top + 40 + Math.min(room * 0.25, 60) + NUM.size * 0.8
    } else {
      while (capSize > 12 && captionWidth(capSize) > w - pad * 2) capSize -= 1
      capX = pad * (preview ? 1 : 1.25)
      capY = h - pad - rulerSpace - capSize * 2.12
      MR.on = !preview
      MR.x0 = pad + 8
      MR.x1 = w - pad - 8
      MR.y = capY - (tiny ? 26 : 40)
      const bottom = (MR.on ? MR.y - 30 : capY - 30) - 22
      S.on = !preview && bottom - top > 300
      const sh = S.on ? clamp((bottom - top) * 0.22, 70, 150) : 0
      P.x = pad
      P.y = top + (portrait && !preview ? 70 : 0)
      P.w = w - pad * 2
      P.h = bottom - P.y - (S.on ? sh + 16 : 0)
      S.x = pad + 26
      S.w = w - pad * 2 - 26
      S.h = sh
      S.y = bottom - sh
      PR.on = false
      NUM.on = false
    }
    P.cx = P.x + P.w / 2
    P.cy = P.y + P.h / 2
  }
  layout()

  /* ------------------------------------------------------------ clock */
  const atP = Number(env.params.get('at'))
  let offset = env.params.has('at') && Number.isFinite(atP) ? atP : preview ? (env.reducedMotion ? 22.5 : 12) : 0
  let prevT = -1
  let clock = 0
  let acted = false
  let lastAct = -1e9
  let holding = false
  const tFixed = env.params.has('t') ? Number(env.params.get('t')) : NaN

  function setMasses(m1: number, m2: number) {
    if (Math.abs(m1 - M1_0) < 1e-6 && Math.abs(m2 - M2_0) < 1e-6) {
      bin = gw
      vis = gwVis
      custom = false
    } else {
      bin = makeBinary(m1, m2)
      vis = makeVisual(bin)
      custom = true
    }
    chirpBuf = null
  }

  /* ------------------------------------------------------------ sound */
  let chirpBuf: AudioBuffer | null = null
  let chirpSrc: AudioBufferSourceNode | null = null
  let playAt = -1
  let offMsgAt = -1e9
  let playDur = 0
  let tone: { osc: OscillatorNode; osc2: OscillatorNode; g: GainNode } | null = null

  /** the real-time chirp, every frequency doubled twice (two octaves) */
  function buildChirp(ac: AudioContext, b: Binary) {
    const sr = ac.sampleRate
    const t0 = b.tAudio
    const dur = -t0 + POST + 0.02
    const n = Math.ceil(dur * sr)
    const buf = ac.createBuffer(1, n, sr)
    const d = buf.getChannelData(0)
    let phase = 0
    let peak = 0
    for (let i = 0; i < n; i++) {
      const t = t0 + i / sr
      const f = look(b, b.f, t) * b.pitch
      const a = look(b, b.A, t)
      phase += (TAU * f) / sr
      // a little second harmonic so small speakers find the low start
      const v = a * (Math.sin(phase) + 0.18 * Math.sin(2 * phase))
      const fade = Math.min(1, i / (0.06 * sr)) * Math.min(1, (n - i) / (0.01 * sr))
      d[i] = v * fade
      peak = Math.max(peak, Math.abs(d[i]))
    }
    const k = 0.32 / Math.max(1e-9, peak)
    for (let i = 0; i < n; i++) d[i] *= k
    return buf
  }

  function playChirp() {
    const ac = sfx.context()
    const out = sfx.output()
    if (!ac || !out) return false
    if (!chirpBuf || chirpBuf.sampleRate !== ac.sampleRate) chirpBuf = buildChirp(ac, bin)
    try {
      chirpSrc?.stop()
    } catch {
      /* already stopped */
    }
    const src = ac.createBufferSource()
    src.buffer = chirpBuf
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    const g = ac.createGain()
    g.gain.value = 0.55
    src.connect(lp)
    lp.connect(g)
    g.connect(out)
    // a touch of the room
    const send = ac.createGain()
    send.gain.value = 0.18
    g.connect(send)
    send.connect(out)
    src.start()
    chirpSrc = src
    playAt = clock
    playDur = chirpBuf.duration
    return true
  }

  function stopTone() {
    if (!tone) return
    try {
      tone.osc.stop()
      tone.osc2.stop()
    } catch {
      /* stopped */
    }
    tone = null
  }

  /** the slowed listening tone under the inspiral: frequency follows f(t), two octaves up */
  function toneSet(freq: number, level: number) {
    const ac = sfx.context()
    const out = sfx.output()
    if (!ac || !out) {
      if (tone) {
        try {
          tone.osc.stop()
          tone.osc2.stop()
        } catch {
          /* stopped */
        }
        tone = null
      }
      return
    }
    if (!tone) {
      const g = ac.createGain()
      g.gain.value = 0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1800
      g.connect(lp)
      lp.connect(out)
      const osc = ac.createOscillator()
      osc.type = 'sine'
      const osc2 = ac.createOscillator()
      osc2.type = 'triangle'
      const g2 = ac.createGain()
      g2.gain.value = 0.25
      osc.connect(g)
      osc2.connect(g2)
      g2.connect(g)
      osc.start()
      osc2.start()
      tone = { osc, osc2, g }
    }
    const now = ac.currentTime
    tone.osc.frequency.setTargetAtTime(freq, now, 0.03)
    tone.osc2.frequency.setTargetAtTime(freq * 0.5, now, 0.03)
    // a dead man's switch: if frames stop (paused), the tone fades by itself
    tone.g.gain.cancelScheduledValues(now)
    tone.g.gain.setTargetAtTime(level, now, 0.08)
    tone.g.gain.setTargetAtTime(0, now + 0.25, 0.15)
  }

  /** where the chirp's audio begins, in real seconds from the peak */
  const fromT = () => bin.tAudio

  /* ---------------------------------------------------------- pointer */
  const MASS_MIN = 5
  const MASS_MAX = 100
  const mX = (m: number) => lerp(MR.x0, MR.x1, (m - MASS_MIN) / (MASS_MAX - MASS_MIN))
  const mAt = (x: number) => clamp(Math.round(lerp(MASS_MIN, MASS_MAX, (x - MR.x0) / (MR.x1 - MR.x0)) * 2) / 2, MASS_MIN, MASS_MAX)
  const drag = { on: -1, touch: false }
  let dm1 = M1_0
  let dm2 = M2_0
  if (env.params.has('m1') && env.params.has('m2')) {
    // test route: ?m1=&m2= start with another binary
    const a = clamp(Number(env.params.get('m1')) || M1_0, 5, 100)
    const b2 = clamp(Number(env.params.get('m2')) || M2_0, 5, 100)
    dm1 = Math.max(a, b2)
    dm2 = Math.min(a, b2)
    setMasses(dm1, dm2)
  }
  let hoverRuler = -1
  let scrubbing = false
  let hoverMass = -1
  let hoverPlot = false
  const rulerY = () => h - pad * 0.55
  const onTimeline = (x: number, y: number, touch: boolean) => rulerOn && y > rulerY() - (touch ? 26 : 16) && x > pad - 8 && x < w - pad + 8
  const onPlot = (x: number, y: number) => S.on && x > S.x - 30 && x < S.x + S.w && y > S.y - 10 && y < S.y + S.h + 10
  function massHit(x: number, y: number, touch: boolean) {
    if (!MR.on) return -1
    const r = touch ? 26 : 14
    if (Math.abs(y - MR.y) > r + 4) return -1
    const d1 = Math.abs(x - mX(dm1))
    const d2 = Math.abs(x - mX(dm2))
    if (Math.min(d1, d2) > r + 6) return x > MR.x0 - 10 && x < MR.x1 + 10 ? (d1 < d2 ? 0 : 1) : -1
    return d1 <= d2 ? 0 : 1
  }
  function storyT() {
    return mod(prevT < 0 ? 0 : prevT, LOOP)
  }
  function seekTo(x: number) {
    const T = storyT()
    let target = clamp((x - pad) / (w - pad * 2)) * LOOP
    for (const c of CHAPTERS) if (Math.abs(target - c.t) < 2.2) target = c.t
    offset += Math.min(LOOP - 0.05, target) - T
  }
  function replay() {
    const T = storyT()
    offset += LOOP - T + 0.001
  }

  /* ---------------------------------------------------------- drawing */

  function halo(str: string, x: number, y: number, o: TextOpts) {
    ctx.save()
    setFont(ctx, o)
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(11,29,36,0.9)'
    ctx.strokeText(o.upper ? str.toUpperCase() : str, x, y)
    ctx.restore()
    text(ctx, str, x, y, o)
  }

  // per-frame state of the binary (in panel px)
  const st = { th: 0, sep: 0, r1: 0, r2: 0, rf: 0, merge: 0, kmPx: 1, fReal: 0, tr: 0, slow: 1, amp: 0, ph: 0 }
  function stateAt(T: number) {
    const tr = vlook(vis.tr, T)
    st.tr = tr
    st.slow = vlook(vis.sl, T)
    st.fReal = look(bin, bin.f, tr)
    st.amp = look(bin, bin.A, tr)
    st.ph = look(bin, bin.ph, tr)
    st.th = st.ph / 2
    // Kepler (source frame) for the separation; the drawing is to scale in km
    const fSrc = st.fReal * (1 + Z)
    const om = Math.PI * fSrc
    const sepKm = Math.cbrt((bin.M * RSUN_KM * 9.0e10 * 1) / (om * om)) // GM/c² · c² = GM ; c² in km²/s²
    const sep0 = Math.cbrt((bin.M * RSUN_KM * 9.0e10) / Math.pow(Math.PI * bin.fStart * (1 + Z), 2))
    st.kmPx = (Math.min(P.w, P.h) * (portrait ? 0.44 : 0.4)) / sep0
    st.merge = smoothstep(T_M - 0.5, T_M + 0.02, T)
    st.sep = sepKm * st.kmPx * (1 - st.merge)
    st.r1 = Math.max(2, bin.rs1 * st.kmPx)
    st.r2 = Math.max(2, bin.rs2 * st.kmPx)
    st.rf = Math.max(2.5, bin.rsf * st.kmPx)
  }

  /** visual wave speed (px per story second) and the near-field radius */
  const waveC = () => Math.max(P.w, P.h) * 0.8
  const tmpP = { x: 0, y: 0 }
  /** displacement of a grid point (panel coordinates relative to the centre) */
  function displace(x: number, y: number, T: number, A0: number, sp: number) {
    const r2 = x * x + y * y + 1e-6
    const r = Math.sqrt(r2)
    let dx = 0
    let dy = 0
    // pinched towards the holes (a picture of curvature, not a solution of anything)
    if (st.merge < 1) {
      const m1f = bin.m2 / bin.M
      const m2f = bin.m1 / bin.M
      const c = Math.cos(st.th)
      const s = Math.sin(st.th)
      const h1x = c * st.sep * m1f
      const h1y = s * st.sep * m1f
      const k = 1 - st.merge
      for (let q = 0; q < 2; q++) {
        const hx = q ? -h1x * (m2f / m1f) : h1x
        const hy = q ? -h1y * (m2f / m1f) : h1y
        const rs = (q ? st.r2 : st.r1) * 2
        const ex = x - hx
        const ey = y - hy
        const d = Math.sqrt(ex * ex + ey * ey) + 1e-3
        const pull = ((rs * rs) / (d + rs)) * 0.9 * k
        dx -= (ex / d) * pull
        dy -= (ey / d) * pull
      }
    }
    if (st.merge > 0) {
      const rs = st.rf * 2
      const pull = ((rs * rs) / (r + rs)) * 0.9 * st.merge
      dx -= (x / r) * pull
      dy -= (y / r) * pull
    }
    // the wave: tangential, quadrupolar, retarded
    const Tr = T - r / waveC()
    const trr = vlook(vis.tr, Tr)
    const A = look(bin, bin.A, trr) * (trr < bin.t0 ? 0.6 : 1)
    const ph = look(bin, bin.ph, trr)
    const r0 = Math.max(st.sep * 0.8, st.rf * 2.2, 30)
    // 1/r, softened to 1/√r so the far ripples stay visible
    const fall = r < r0 ? r / r0 : Math.sqrt(r0 / r)
    const c2 = (x * x - y * y) / r2
    const s2 = (2 * x * y) / r2
    const hh = A0 * A * fall * (c2 * Math.cos(ph) + s2 * Math.sin(ph))
    const amp = clamp(hh * 1.3, -1, 1) * sp * 0.42
    dx += (-y / r) * amp
    dy += (x / r) * amp
    tmpP.x = x + dx
    tmpP.y = y + dy
    return tmpP
  }

  function drawGrid(T: number, alpha: number) {
    if (alpha <= 0) return
    const sp = preview ? 26 : clamp(Math.min(P.w, P.h) / 17, 18, 34)
    const step = preview ? 7 : 5
    const A0 = 1.0 / Math.max(1e-6, bin.ampPeak)
    const x0 = P.x - P.cx
    const x1 = P.x + P.w - P.cx
    const y0 = P.y - P.cy
    const y1 = P.y + P.h - P.cy
    ctx.save()
    ctx.beginPath()
    ctx.rect(P.x, P.y, P.w, P.h)
    ctx.clip()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(238,244,241,0.2)'
    ctx.beginPath()
    const gx0 = Math.ceil(x0 / sp) * sp
    for (let gx = gx0; gx <= x1; gx += sp) {
      for (let y = y0 - step; y <= y1 + step; y += step) {
        const p = displace(gx, y, T, A0, sp)
        if (y === y0 - step) ctx.moveTo(P.cx + p.x, P.cy + p.y)
        else ctx.lineTo(P.cx + p.x, P.cy + p.y)
      }
    }
    const gy0 = Math.ceil(y0 / sp) * sp
    for (let gy = gy0; gy <= y1; gy += sp) {
      for (let x = x0 - step; x <= x1 + step; x += step) {
        const p = displace(x, gy, T, A0, sp)
        if (x === x0 - step) ctx.moveTo(P.cx + p.x, P.cy + p.y)
        else ctx.lineTo(P.cx + p.x, P.cy + p.y)
      }
    }
    ctx.stroke()
    ctx.restore()
  }

  /** the wave's crests: the two arms where 2φ = Φ(t − r/c), faint, brightening with the amplitude */
  function drawCrests(T: number, alpha: number) {
    if (alpha <= 0 || preview) return
    const rMax = Math.hypot(P.w, P.h) * 0.55
    const r0 = Math.max(st.sep * 0.8, st.rf * 2.2, 30)
    const c = waveC()
    const A0 = 1 / Math.max(1e-6, bin.ampPeak)
    ctx.save()
    ctx.beginPath()
    ctx.rect(P.x, P.y, P.w, P.h)
    ctx.clip()
    ctx.lineWidth = 1
    for (let arm = 0; arm < 2; arm++) {
      // in short runs, alpha binned by amplitude
      let open = false
      let bin0 = -1
      for (let r = r0; r < rMax; r += 4) {
        const Tr = T - r / c
        const trr = vlook(vis.tr, Tr)
        const A = look(bin, bin.A, trr) * A0 * Math.sqrt(r0 / r)
        const ph = look(bin, bin.ph, trr)
        const phi = ph / 2 + arm * Math.PI
        const x = P.cx + Math.cos(phi) * r
        const y = P.cy + Math.sin(phi) * r
        const b = Math.min(4, Math.floor(A * 5))
        if (b !== bin0) {
          if (open) ctx.stroke()
          ctx.strokeStyle = rgba(C.sky, alpha * (0.1 + b * 0.13))
          ctx.beginPath()
          ctx.moveTo(x, y)
          open = true
          bin0 = b
        } else ctx.lineTo(x, y)
      }
      if (open) ctx.stroke()
    }
    ctx.restore()
  }

  function drawHoles(T: number, alpha: number) {
    if (alpha <= 0) return
    const m1f = bin.m2 / bin.M
    const m2f = bin.m1 / bin.M
    const c = Math.cos(st.th)
    const s = Math.sin(st.th)
    const x1 = P.cx + c * st.sep * m1f
    const y1 = P.cy + s * st.sep * m1f
    const x2 = P.cx - c * st.sep * m2f
    const y2 = P.cy - s * st.sep * m2f
    ctx.save()
    ctx.globalAlpha = alpha
    const twoA = 1 - smoothstep(T_M - 0.08, T_M + 0.04, T)
    if (twoA > 0) {
      // the orbits' recent arcs
      if (!preview && st.sep > 6) {
        ctx.lineWidth = 1
        ctx.strokeStyle = rgba(C.sky, 0.35 * twoA)
        ctx.beginPath()
        ctx.arc(P.cx, P.cy, st.sep * m1f, st.th - 1.4, st.th)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(P.cx, P.cy, st.sep * m2f, st.th + Math.PI - 1.4, st.th + Math.PI)
        ctx.stroke()
      }
      for (const [x, y, r] of [
        [x1, y1, st.r1],
        [x2, y2, st.r2],
      ]) {
        ctx.globalAlpha = alpha * twoA
        // photon ring (1.5 rs), dotted
        if (r > 6) {
          ctx.setLineDash([1.5, 3])
          ctx.strokeStyle = rgba(C.sky, 0.45)
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, r * 1.5, 0, TAU)
          ctx.stroke()
          ctx.setLineDash([])
        }
        ctx.fillStyle = HOLE
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = INK
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
    }
    const oneA = smoothstep(T_M - 0.1, T_M + 0.02, T)
    if (oneA > 0) {
      // the remnant, ringing: an ℓ = 2 wobble dying away with the ringdown
      const tvis = Math.max(0, T - T_M)
      const ringVis = bin.tauRing * S_RING
      const eps = 0.22 * Math.exp(-tvis / Math.max(0.05, ringVis * 1.6))
      const ph = st.ph / 2
      ctx.globalAlpha = alpha * oneA
      if (st.rf > 6) {
        ctx.setLineDash([1.5, 3])
        ctx.strokeStyle = rgba(C.sky, 0.45)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(P.cx, P.cy, st.rf * 1.5, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.fillStyle = HOLE
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * TAU
        const rr = st.rf * (1 + eps * Math.cos(2 * (a - ph)))
        const px = P.cx + Math.cos(a) * rr
        const py = P.cy + Math.sin(a) * rr
        if (k) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    // the strongest wavefront leaves the merger as a ring
    if (T > T_M && T < T_M + 2.5) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(P.x, P.y, P.w, P.h)
      ctx.clip()
      const rr = (T - T_M) * waveC()
      const a = 1 - smoothstep(0, 2.5, T - T_M)
      ctx.globalAlpha = alpha * a * 0.8
      ctx.strokeStyle = C.sky
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(P.cx, P.cy, rr, 0, TAU)
      ctx.stroke()
      ctx.restore()
      ctx.globalAlpha = alpha
    }
    // labels
    if (!small && T < T_M - 2 && st.sep > 80) {
      const la = smoothstep(2, 3, T) * (1 - smoothstep(T_M - 4, T_M - 2.5, T))
      halo(`${fmtM(bin.m1)} M☉`, x1 + st.r1 + 8, y1 - st.r1 - 2, { size: 9, color: INK2, tracking: 0.08, alpha: la })
      halo(`${fmtM(bin.m2)} M☉`, x2 + st.r2 + 8, y2 - st.r2 - 2, { size: 9, color: INK2, tracking: 0.08, alpha: la })
    }
    if (!small && T > T_M + 0.6 && T < 30) {
      const la = smoothstep(T_M + 0.6, T_M + 1.4, T) * (1 - smoothstep(29, 30, T))
      halo(`${fmtM(bin.mf)} M☉ · spin ${bin.af.toFixed(2)}`, P.cx + st.rf * 1.6 + 8, P.cy - st.rf - 4, { size: 9, color: INK2, tracking: 0.08, alpha: la })
    }
    ctx.restore()
  }

  const fmtM = (m: number) => (Math.abs(m - Math.round(m)) < 0.05 ? String(Math.round(m)) : m.toFixed(1))

  /** a scale bar in km under the panel */
  function drawScale(alpha: number) {
    if (alpha <= 0 || tiny) return
    let km = 100
    for (const k of [100, 200, 500, 1000, 2000, 5000]) if (k * st.kmPx <= P.w * 0.3) km = k
    const L = km * st.kmPx
    const x = P.x + 8
    const y = P.y + P.h - 10
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = INK2
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + L, y)
    ctx.moveTo(x, y - 4)
    ctx.lineTo(x, y + 2)
    ctx.moveTo(x + L, y - 4)
    ctx.lineTo(x + L, y + 2)
    ctx.stroke()
    text(ctx, `${km.toLocaleString('en-US')} km`, x + L + 8, y + 3, { size: 8.5, color: MUTED, tracking: 0.1 })
    ctx.restore()
  }

  /** the strain plot: the waveform as it arrives, drawn on in real time */
  function drawStrain(alpha: number, b: Binary, upTo: number, mode: 'live' | 'two' | 'listen', two: number) {
    if (!S.on || alpha <= 0) return
    const { x, y, w: sw, h: sh } = S
    const tA = mode === 'live' ? Math.max(b.t0, -1.6) : mode === 'two' ? -0.2 : Math.max(b.t0, -0.6)
    const tB = mode === 'live' ? POST : 0.05
    const X = (t: number) => x + ((t - tA) / (tB - tA)) * sw
    const sz = small ? 8 : 8.5
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    // axes
    const rows = mode === 'two' ? 2 : 1
    const rowH = sh / rows
    for (let rI = 0; rI < rows; rI++) {
      const cy = y + rowH * (rI + 0.5)
      ctx.strokeStyle = RULE
      ctx.beginPath()
      ctx.moveTo(x, cy)
      ctx.lineTo(x + sw, cy)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(238,244,241,0.3)'
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(sw), Math.round(sh))
    // time ticks
    const span = tB - tA
    const tick = span > 1 ? 0.25 : span > 0.4 ? 0.1 : 0.05
    ctx.strokeStyle = 'rgba(238,244,241,0.35)'
    ctx.beginPath()
    for (let t = Math.ceil(tA / tick) * tick; t <= tB + 1e-9; t += tick) {
      ctx.moveTo(X(t), y + sh)
      ctx.lineTo(X(t), y + sh + 4)
    }
    ctx.stroke()
    for (let t = Math.ceil(tA / tick) * tick; t <= tB + 1e-9; t += tick * (span > 1 ? 2 : 2)) {
      const lab = Math.abs(t) < 1e-9 ? '0' : `${t > 0 ? '+' : '−'}${Math.abs(t).toFixed(tick < 0.1 ? 2 : tick < 0.25 ? 1 : 1)} s`
      text(ctx, lab, X(t), y + sh + 14, { size: sz, color: MUTED, align: 'center', tracking: 0.04 })
    }
    if (!wide || x - (MR.x1 + 8) > 44 || y > MR.y + 24) {
      text(ctx, 'strain', x - 6, y + 9, { size: sz, color: MUTED, align: 'right', upper: true, tracking: 0.12 })
      text(ctx, '10⁻²¹', x - 6, y + 20, { size: sz, color: MUTED, align: 'right', tracking: 0.04 })
    } else text(ctx, '×10⁻²¹', x + sw - 6, y + 12, { size: sz, color: MUTED, align: 'right', tracking: 0.04 })
    // the trace(s)
    const kY = (rowH * 0.42) / 1.15
    const n = Math.max(200, Math.round(sw * (mode === 'live' ? 2 : 1.5)))
    const drawTrace = (row: number, sign: number, shift: number, col: string, lim: number) => {
      const cy = y + rowH * (row + 0.5)
      ctx.strokeStyle = col
      ctx.lineWidth = 1.1
      ctx.beginPath()
      let started = false
      for (let i = 0; i <= n; i++) {
        const t = tA + (span * i) / n
        if (t > lim) break
        const tt = t - shift
        const hv = tt < b.t0 ? 0 : look(b, b.A, tt) * Math.cos(look(b, b.ph, tt))
        const py = cy - sign * hv * kY
        if (!started) {
          ctx.moveTo(X(t), py)
          started = true
        } else ctx.lineTo(X(t), py)
      }
      ctx.stroke()
    }
    if (mode === 'live') {
      drawTrace(0, 1, 0, C.sky, upTo)
      // the playhead of the story
      if (upTo > tA && upTo < tB) {
        ctx.strokeStyle = INK
        ctx.beginPath()
        ctx.moveTo(X(upTo), y - 3)
        ctx.lineTo(X(upTo), y + sh + 3)
        ctx.stroke()
      }
      text(ctx, custom ? `model · ${fmtM(b.m1)} + ${fmtM(b.m2)} M☉` : 'model waveform · GW150914', x + 6, y + 12, { size: sz, color: MUTED, upper: true, tracking: 0.12 })
    } else if (mode === 'two') {
      // Livingston first; then shifted 6.9 ms and inverted onto Hanford
      const dt = 0.0069
      const shiftL = lerp(-dt, 0, two)
      const rowL = lerp(1, 0, two)
      drawTrace(0, 1, 0, C.sky, upTo)
      // L1 drawn in its own row, sliding up as it is aligned
      ctx.save()
      ctx.translate(0, (rowL - 1) * rowH)
      drawTrace(1, lerp(-1, 1, smoothstep(0, 0.4, two)), shiftL, rgba(C.sage, 0.95), upTo + dt * (1 - two))
      ctx.restore()
      text(ctx, 'Hanford · H1', x + 6, y + 12, { size: sz, color: C.sky, upper: true, tracking: 0.12 })
      text(ctx, two > 0.5 ? 'Livingston · L1 · shifted 6.9 ms, inverted' : 'Livingston · L1', x + 6, y + rowH * lerp(1, 0, two) + (two > 0.5 ? 24 : 12), { size: sz, color: C.sage, upper: true, tracking: 0.12 })
    } else {
      drawTrace(0, 1, 0, C.sky, tB)
      // the listening playhead
      if (upTo > tA - 1 && upTo <= tB) {
        ctx.strokeStyle = INK
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(X(Math.max(tA, upTo)), y - 4)
        ctx.lineTo(X(Math.max(tA, upTo)), y + sh + 4)
        ctx.stroke()
      }
      text(ctx, sfx.enabled ? 'tap to hear it again · space' : 'turn the sound on to hear it · then tap here', x + 6, y + 12, { size: sz, color: sfx.enabled ? MUTED : C.sky, upper: true, tracking: 0.12 })
    }
    ctx.restore()
  }

  /** V: the time–frequency track, the shape you hear */
  function drawTrack(alpha: number, b: Binary, playT: number) {
    if (alpha <= 0) return
    const x = P.x + P.w * 0.1
    const ww = P.w * 0.8
    const y = P.y + P.h * 0.12
    const hh = P.h * 0.68
    const tA = Math.max(b.t0, -0.6)
    const tB = 0.05
    const f0 = 16
    const f1 = 512
    const X = (t: number) => x + ((t - tA) / (tB - tA)) * ww
    const Y = (f: number) => y + hh - ((Math.log2(f) - Math.log2(f0)) / (Math.log2(f1) - Math.log2(f0))) * hh
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.strokeStyle = RULE
    ctx.beginPath()
    for (const f of [16, 32, 64, 128, 256, 512]) {
      ctx.moveTo(x, Y(f))
      ctx.lineTo(x + ww, Y(f))
    }
    ctx.stroke()
    for (const f of [32, 64, 128, 256, 512]) text(ctx, `${f} Hz`, x - 6, Y(f) + 3, { size: 8.5, color: MUTED, align: 'right', tracking: 0.04 })
    // the band of the track: hairlines at harmonics of the shape, the classic chirp
    const n = 260
    for (let pass = 0; pass < 3; pass++) {
      ctx.strokeStyle = pass === 0 ? rgba(C.sky, 0.9) : rgba(C.sky, 0.22)
      ctx.lineWidth = pass === 0 ? 1.4 : 1
      ctx.beginPath()
      for (let i = 0; i <= n; i++) {
        const t = tA + ((tB - tA) * i) / n
        const f = look(b, b.f, t) * (pass === 0 ? 1 : pass === 1 ? 1.06 : 0.94)
        const py = Y(f)
        if (i) ctx.lineTo(X(t), py)
        else ctx.moveTo(X(t), py)
      }
      ctx.stroke()
    }
    // the playhead and the frequency now
    if (playT > tA && playT < tB) {
      const f = look(b, b.f, playT)
      ctx.strokeStyle = INK
      ctx.beginPath()
      ctx.moveTo(X(playT), y)
      ctx.lineTo(X(playT), y + hh)
      ctx.stroke()
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(X(playT), Y(f), 3, 0, TAU)
      ctx.fill()
      halo(b.pitch > 1 ? `${Math.round(f)} Hz · heard at ${Math.round(f * b.pitch)} Hz` : `${Math.round(f)} Hz`, X(playT) + 8, Y(f) - 8, { size: 9, color: INK, tracking: 0.06 })
    }
    halo('frequency · as it arrived', x, y - 8, { size: 8.5, color: MUTED, upper: true, tracking: 0.14 })
    ctx.restore()
  }

  /** III: the wave crosses 1.3 billion years */
  function drawJourney(T: number, alpha: number) {
    if (alpha <= 0) return
    const u = clamp((T - 31) / 9.8)
    const x0 = P.x + P.w * 0.08
    const x1 = P.x + P.w * 0.92
    const yM = P.y + P.h * 0.5
    // years before arrival → x on a log ruler (1.3e9 … 0.01)
    const LA = Math.log10(1.3e9)
    const LB = Math.log10(0.01)
    const X = (yrs: number) => lerp(x0, x1, (LA - Math.log10(Math.max(0.01, yrs))) / (LA - LB))
    const yrsNow = Math.pow(10, lerp(LA, LB, u))
    const xf = X(yrsNow)
    const sz = small ? 8 : 9
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    // the ruler
    ctx.strokeStyle = 'rgba(238,244,241,0.35)'
    ctx.beginPath()
    ctx.moveTo(x0, yM)
    ctx.lineTo(x1, yM)
    for (let e = 9; e >= -2; e--) {
      const x = X(Math.pow(10, e))
      if (x < x0 - 1 || x > x1 + 1) continue
      ctx.moveTo(x, yM)
      ctx.lineTo(x, yM + 5)
    }
    ctx.stroke()
    if (!tiny)
      for (const e of [9, 6, 3, 0]) {
        const lab = e === 9 ? '10⁹ yr' : e === 6 ? '10⁶' : e === 3 ? '10³' : '1 yr'
        text(ctx, lab, X(Math.pow(10, e)), yM + 17, { size: sz - 0.5, color: MUTED, align: 'center', tracking: 0.04 })
      }

    // the source and Earth
    ctx.fillStyle = HOLE
    ctx.strokeStyle = INK
    ctx.beginPath()
    ctx.arc(x0, yM, 4, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x1, yM, 5, 0, TAU)
    ctx.moveTo(x1 - 5, yM)
    ctx.lineTo(x1 + 5, yM)
    ctx.moveTo(x1, yM - 5)
    ctx.lineTo(x1, yM + 5)
    ctx.stroke()
    text(ctx, '410 Mpc · 1.3 billion light-years', (x0 + x1) / 2, yM - (small ? 56 : 84), { size: sz, color: INK2, align: 'center', upper: true, tracking: 0.14 })
    if (!small) text(ctx, 'years before it reaches Earth · one decade a second', x1, yM + 32, { size: sz - 0.5, color: MUTED, align: 'right', upper: true, tracking: 0.14 })
    // the wavefront: a few arcs, fading behind
    for (let k = 0; k < 4; k++) {
      const xx = xf - k * (small ? 5 : 8)
      if (xx < x0) break
      ctx.strokeStyle = rgba(C.sky, (1 - k / 4) * 0.9)
      ctx.lineWidth = k === 0 ? 1.4 : 1
      ctx.beginPath()
      ctx.arc(xx - P.h * 0.5, yM, P.h * 0.5, -0.32, 0.32)
      ctx.stroke()
    }
    // epochs, written as the front passes them
    const tierH = small ? 22 : 34
    for (const [yrs, title, note, tier] of EPOCHS) {
      const x = X(yrs)
      const a = clamp((xf - x) / 30 + 0.5)
      if (a <= 0) continue
      const up = tier < 0
      const ly = yM + tier * tierH + (up ? 0 : 8)
      ctx.globalAlpha = alpha * a
      ctx.strokeStyle = 'rgba(238,244,241,0.4)'
      ctx.beginPath()
      ctx.moveTo(x, yM)
      ctx.lineTo(x, ly + (up ? 4 : -12))
      ctx.stroke()
      const align: CanvasTextAlign = x > x1 - 120 ? 'right' : 'left'
      const tx = align === 'left' ? x + 4 : x - 4
      halo(title, tx, ly, { size: sz, color: INK, align, upper: true, tracking: 0.12 })
      if (note && !small) halo(note, tx, ly + (up ? -12 : 12), { size: sz - 0.5, color: MUTED, align, tracking: 0.04 })
    }
    ctx.restore()
  }

  /** IV: two L-shaped detectors, 3,002 km apart, and the plane wave sweeping past */
  function drawArrival(T: number, alpha: number) {
    if (alpha <= 0) return
    const cx = P.cx
    const cy = P.cy - P.h * 0.04
    const sc = Math.min(P.w, P.h) / 520
    // schematic positions (not a map): Hanford upper left, Livingston lower right
    const hx = cx - 150 * sc
    const hy = cy - 70 * sc
    const lx = cx + 150 * sc
    const ly = cy + 70 * sc
    const sz = small ? 8 : 9
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.rect(P.x, P.y, P.w, P.h)
    ctx.clip()
    // the wavefront sweeps from lower right (the southern sky) across both sites
    const u = clamp((T - 43.2) / 6)
    const dir = [-0.83, -0.56]
    const reach = 330 * sc
    const off = lerp(-reach, reach, ease.inOutSine(u))
    const fx = cx + dir[0] * -off
    const fy = cy + dir[1] * -off
    ctx.strokeStyle = rgba(C.sky, 0.85 * (1 - smoothstep(0.92, 1, u)) * smoothstep(0, 0.06, u))
    ctx.lineWidth = 1.3
    ctx.beginPath()
    const tx = -dir[1]
    const ty = dir[0]
    ctx.moveTo(fx - tx * 600 * sc, fy - ty * 600 * sc)
    ctx.lineTo(fx + tx * 600 * sc, fy + ty * 600 * sc)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.sky, 0.3 * (1 - smoothstep(0.92, 1, u)))
    ctx.lineWidth = 1
    for (const k of [1, 2]) {
      ctx.beginPath()
      ctx.moveTo(fx - dir[0] * 12 * k * sc - tx * 600 * sc, fy - dir[1] * 12 * k * sc - ty * 600 * sc)
      ctx.lineTo(fx - dir[0] * 12 * k * sc + tx * 600 * sc, fy - dir[1] * 12 * k * sc + ty * 600 * sc)
      ctx.stroke()
    }
    // the baseline between the sites
    ctx.strokeStyle = 'rgba(238,244,241,0.3)'
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(lx, ly)
    ctx.stroke()
    ctx.setLineDash([])
    if (!tiny) fitLabel(P.w < 520 ? '3,002 km · 10 ms' : '3,002 km · 10 ms at the speed of light', (hx + lx) / 2 + 40, (hy + ly) / 2 - 12, { size: sz, color: MUTED, upper: true, tracking: 0.12 })
    // each detector: arms that stretch and squeeze as the wave passes (enormously exaggerated)
    const passH = (fx - hx) * dir[0] + (fy - hy) * dir[1]
    const passL = (fx - lx) * dir[0] + (fy - ly) * dir[1]
    for (const [x, y, name, pass, rot] of [
      [hx, hy, 'LIGO Hanford · Washington', passH, -0.3],
      [lx, ly, 'LIGO Livingston · Louisiana', passL, 0.9],
    ] as const) {
      const near = Math.exp(-Math.pow(pass / (40 * sc), 2))
      const wob = near * Math.sin(T * 30) * 0.12
      const arm = 60 * sc
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.3
      ctx.beginPath()
      const c = Math.cos(rot)
      const s = Math.sin(rot)
      ctx.moveTo(x + c * arm * (1 + wob), y + s * arm * (1 + wob))
      ctx.lineTo(x, y)
      ctx.lineTo(x - s * arm * (1 - wob), y + c * arm * (1 - wob))
      ctx.stroke()
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + c * arm * (1 + wob), y + s * arm * (1 + wob), 2, 0, TAU)
      ctx.arc(x - s * arm * (1 - wob), y + c * arm * (1 - wob), 2, 0, TAU)
      ctx.fill()
      if (near > 0.3) {
        ctx.strokeStyle = rgba(C.sky, near)
        ctx.beginPath()
        ctx.arc(x, y, 10 + (1 - near) * 30, 0, TAU)
        ctx.stroke()
      }
      fitLabel(P.w < 520 ? name.split(' · ')[0] : name, x, y + (small ? 18 : 24) + (rot > 0 ? arm * 0.75 : 0), { size: sz, color: INK2, upper: true, tracking: 0.12 })
    }
    // when
    const da = smoothstep(43, 44, T)
    if (!tiny) {
      halo('14 September 2015 · 09:50:45 UTC', P.x + 10, P.y + 14, { size: sz + 0.5, color: INK, upper: true, tracking: 0.14, alpha: da })
      halo('Livingston first · Hanford 6.9 ms later', P.x + 10, P.y + 30, { size: sz, color: MUTED, upper: true, tracking: 0.14, alpha: smoothstep(47, 48, T) })
      if (!small) halo('each 4 km arm stretched by about 4 × 10⁻¹⁸ m · some 1/400 of a proton · schematic, not a map', P.x + 10, P.y + P.h - 12, { size: sz - 0.5, color: MUTED, tracking: 0.04, alpha: smoothstep(49, 50, T) })
    }
    ctx.restore()
  }

  /** the left column's figure: a formula, a big serif numeral and what it counts */
  function drawNumeral(T: number, alpha: number) {
    if (!NUM.on || alpha <= 0) return
    let formula: [string, boolean][] = []
    let big = ''
    let unit = ''
    let label = ''
    let short2 = ''
    if (T < T_M) {
      formula = [
        ['f ∝ τ', false],
        ['−3/8', true],
      ]
      big = String(Math.round(st.fReal))
      unit = 'Hz'
      label = 'gravitational-wave frequency'
      short2 = 'wave frequency'
    } else if (T < 30.4) {
      formula = [['E = Δm c²', false]]
      big = bin.erad.toFixed(1)
      unit = 'suns'
      label = 'of mass, radiated in a fraction of a second'
      short2 = 'of mass, radiated'
    } else if (T < 42) {
      const u = clamp((T - 31) / 9.8)
      const yrs = Math.pow(10, lerp(Math.log10(1.3e9), Math.log10(0.02), u))
      formula = [['d = 410 Mpc', false]]
      big = yrs >= 1e9 ? (yrs / 1e9).toFixed(1) : yrs >= 1e6 ? String(Math.round(yrs / 1e6)) : yrs >= 1e4 ? String(Math.round(yrs / 1e3)) : yrs >= 1 ? String(Math.round(yrs)) : String(Math.max(1, Math.round(yrs * 365)))
      unit = yrs >= 1e9 ? 'billion' : yrs >= 1e6 ? 'million' : yrs >= 1e4 ? 'thousand' : yrs >= 1 ? 'years' : 'days'
      label = 'years to go'
      if (yrs < 1e4 && yrs >= 1) label = 'to go'
      if (yrs < 1) label = 'to go'
    } else if (T < 56) {
      formula = [['Δt = (d · n) / c', false]]
      big = '6.9'
      unit = 'ms'
      label = 'between Livingston and Hanford'
      short2 = 'between the sites'
    } else {
      formula = [
        ['𝓜 = (m₁m₂)', false],
        ['3/5', true],
        [' / (m₁ + m₂)', false],
        ['1/5', true],
      ]
      big = `${fmtM(bin.m1)}+${fmtM(bin.m2)}`
      unit = 'M☉'
      label = custom ? 'your binary' : 'GW150914, as published'
    }
    ctx.save()
    ctx.globalAlpha = alpha
    {
      const fs = Math.round(clamp(NUM.size * 0.22, 15, 26))
      let fx = NUM.x
      const fy = NUM.y - NUM.size * 0.86
      for (const [str, sup] of formula) {
        const o = { font: 'serif' as const, size: sup ? Math.round(fs * 0.62) : fs, italic: true, color: INK2 }
        text(ctx, str, fx, fy - (sup ? fs * 0.42 : 0), o)
        setFont(ctx, o)
        fx += ctx.measureText(str).width + (sup ? 2 : 0)
      }
    }
    text(ctx, big, NUM.x - NUM.size * 0.04, NUM.y, { font: 'serif', size: NUM.size, color: INK })
    setFont(ctx, { font: 'serif', size: NUM.size })
    const bw = ctx.measureText(big).width
    text(ctx, unit, NUM.x + bw + 10, NUM.y, { size: 10, color: C.sky, upper: true, tracking: 0.14 })
    setFont(ctx, { size: 9, tracking: 0.14 })
    const colW = P.x - NUM.x - 16
    const lab = short2 && ctx.measureText(label.toUpperCase()).width > colW ? short2 : label
    text(ctx, lab, NUM.x, NUM.y + 20, { size: 9, color: MUTED, upper: true, tracking: 0.14 })
    ctx.restore()
  }

  /** + and × polarisations: a ring of free test masses, face-on */
  function drawRings(alpha: number) {
    if (!PR.on || alpha <= 0) return
    const hp = st.amp * Math.cos(st.ph)
    const hx = st.amp * Math.sin(st.ph)
    const k = 0.45 / Math.max(1e-6, bin.ampPeak)
    ctx.save()
    ctx.globalAlpha = alpha
    const items: [number, number, string][] = [
      [hp * k, 0, 'h₊'],
      [0, hx * k, 'h×'],
    ]
    items.forEach(([a, b], i) => {
      const cx = PR.x + i * (PR.r * 2 + 34)
      const cy = PR.y
      ctx.strokeStyle = RULE
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, PR.r, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = INK
      for (let q = 0; q < 16; q++) {
        const ang = (q / 16) * TAU
        const x = Math.cos(ang) * PR.r
        const y = Math.sin(ang) * PR.r
        const px = x * (1 + a / 2) + (y * b) / 2
        const py = y * (1 - a / 2) + (x * b) / 2
        ctx.beginPath()
        ctx.arc(cx + px, cy + py, 1.6, 0, TAU)
        ctx.fill()
      }
      text(ctx, items[i][2], cx, cy + PR.r + 16, { size: 10, color: INK2, align: 'center', tracking: 0.04 })
    })
    text(ctx, P.x - PR.x > 230 ? 'free masses, seen face-on' : 'free masses', PR.x - PR.r, PR.y - PR.r - 12, { size: 8.5, color: MUTED, upper: true, tracking: 0.14 })
    ctx.restore()
  }

  function drawMassRuler(ghostU: number) {
    if (!MR.on) return
    const { x0, x1, y } = MR
    const sz = small ? 8 : 8.5
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(238,244,241,0.45)'
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    for (let m = 5; m <= 100; m += 5) {
      const x = mX(m)
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + (m % 25 === 0 ? 6 : 3))
    }
    ctx.stroke()
    if (!tiny) for (const m of [25, 50, 75, 100]) text(ctx, String(m), mX(m), y + 16, { size: sz, color: MUTED, align: 'center', tracking: 0.04 })
    // the title row: the two masses (live), and the chirp mass
    const mc = Math.pow(dm1 * dm2, 0.6) / Math.pow(dm1 + dm2, 0.2)
    const hi = (i: number) => drag.on === i || hoverMass === i
    let tx = x0
    const seg = (str: string, col: string, size = sz) => {
      text(ctx, str, tx, y - 14, { size, color: col, tracking: 0.1 })
      setFont(ctx, { size, tracking: 0.1 })
      tx += ctx.measureText(str).width
    }
    seg('MASSES  ', MUTED)
    seg(`m₁ ${fmtM(dm1)}`, hi(0) ? C.sky : INK, sz + 1)
    seg('  ·  ', MUTED)
    seg(`m₂ ${fmtM(dm2)}`, hi(1) ? C.sky : INK, sz + 1)
    seg('  M☉', MUTED)
    if (x1 - x0 > 250) text(ctx, `chirp mass ${mc.toFixed(1)}`, x1, y - 14, { size: sz, color: MUTED, align: 'right', tracking: 0.08 })
    for (const [m, i] of [
      [dm1, 0],
      [dm2, 1],
    ] as const) {
      const x = mX(m)
      ctx.fillStyle = HOLE
      ctx.strokeStyle = hi(i) ? C.sky : INK
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(x, y, (i === 0 ? 6.5 : 5) + (hi(i) ? 1.5 : 0), 0, TAU)
      ctx.fill()
      ctx.stroke()
    }
    if (custom && !tiny) halo('↺ GW150914', x1 + 4, y + 30, { size: sz, color: C.sky, align: 'right', upper: true, tracking: 0.12 })
    if (ghostU > 0) {
      const a = Math.sin(Math.PI * clamp(ghostU))
      const gx = mX(dm1) + Math.sin(ghostU * TAU) * (x1 - x0) * 0.16
      ctx.globalAlpha = a
      ctx.strokeStyle = C.sky
      ctx.setLineDash([2, 3])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(mX(dm1), y)
      ctx.lineTo(gx, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(gx, y, 7, 0, TAU)
      ctx.stroke()
      if (!tiny) halo(x1 - x0 > 250 ? 'drag a mass · it replays with its own chirp' : 'drag a mass', x0, y + 30, { size: sz, color: C.sky, upper: true, tracking: 0.12 })
    }
    ctx.restore()
  }

  /** a label kept inside the panel */
  function fitLabel(str: string, x: number, y: number, o: TextOpts) {
    setFont(ctx, o)
    const lw = ctx.measureText(o.upper ? str.toUpperCase() : str).width
    const cx = clamp(x, P.x + 4 + lw / 2, P.x + P.w - 4 - lw / 2)
    halo(str, cx, y, { ...o, align: 'center' })
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
        if (ln.s) halo(ln.s, capX, y + dy, { font: 'serif', size: capSize, color: INK })
        if (ln.em) halo(ln.em, capX + sw, y + dy, { font: 'serif', size: capSize, italic: true, color: C.sage })
        ctx.restore()
      })
    }
  }

  function chrome(T: number, readouts: [string, string][]) {
    const ch = CHAPTERS.reduce((acc, c, i) => (T >= c.t ? i : acc), 0)
    text(ctx, `${FIG} — Chirp`, pad, pad + 10, { size: small ? 9 : 10, color: MUTED, tracking: 0.16, upper: true })
    const c = CHAPTERS[ch]
    const kIn = ease.outExpo(clamp((T - c.t - 0.2) / 0.8)) * (ch === CHAPTERS.length - 1 ? 1 - smoothstep(OUTRO, OUTRO + 1, T) : 1)
    halo(`${c.num} — ${c.name}`, capX, capY - (small ? 4 : 9), { size: small ? 9 : 10.5, color: INK2, tracking: 0.16, upper: true, alpha: kIn })
    let y = pad + 10
    const rs = small ? 9 : 10.5
    const maxRows = tiny ? 2 : short ? 3 : 6
    for (const [label, value] of readouts.slice(0, maxRows)) {
      setFont(ctx, { size: rs, tracking: 0.06 })
      const vw = ctx.measureText(value).width
      halo(value, w - pad, y, { size: rs, color: INK, align: 'right', tracking: 0.06 })
      if (label) halo(label, w - pad - vw - 10, y, { size: small ? 8.5 : 9.5, color: MUTED, align: 'right', tracking: 0.14, upper: true })
      y += small ? 13 : 16
    }
    if (rulerOn) {
      const x0 = pad
      const x1 = w - pad
      const yb = rulerY()
      ctx.lineWidth = 1
      ctx.strokeStyle = RULE
      ctx.beginPath()
      ctx.moveTo(x0, yb)
      ctx.lineTo(x1, yb)
      for (let i = 0; i <= 36; i++) {
        const x = lerp(x0, x1, i / 36)
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - (i % 6 === 0 ? 4 : 2))
      }
      ctx.stroke()
      ctx.strokeStyle = INK
      ctx.beginPath()
      const xp = lerp(x0, x1, T / LOOP)
      ctx.moveTo(xp, yb + 3)
      ctx.lineTo(xp, yb - 7)
      ctx.stroke()
      if (w > 360) {
        CHAPTERS.forEach((cc, i) => {
          const x = lerp(x0, x1, cc.t / LOOP)
          text(ctx, cc.num, x + 4, yb - 7, { size: 8.5, color: i === ch ? INK : MUTED, tracking: 0.1 })
        })
        if (holding) text(ctx, 'Free play', xp + 8, yb - 7, { size: 8.5, color: C.sky, tracking: 0.14, upper: true })
      }
      if (hoverRuler >= 0) {
        const hx = clamp(hoverRuler, x0, x1)
        const ht = ((hx - x0) / (x1 - x0)) * LOOP
        const hc = CHAPTERS.reduce((acc, c2, i) => (ht >= c2.t ? i : acc), 0)
        ctx.strokeStyle = C.sky
        ctx.beginPath()
        ctx.moveTo(hx, yb + 3)
        ctx.lineTo(hx, yb - 12)
        ctx.stroke()
        text(ctx, `${CHAPTERS[hc].num} · ${CHAPTERS[hc].name}`, clamp(hx, x0 + 50, x1 - 50), yb - 17, { size: 9, color: C.sky, align: 'center', tracking: 0.12, upper: true })
      }
    }
    if (!preview) {
      ctx.strokeStyle = 'rgba(238,244,241,0.3)'
      ctx.lineWidth = 1
      cropMarks(ctx, pad * 0.4, pad * 0.4, w - pad * 0.8, h - pad * 0.8, 8)
    }
  }

  const fmtE = (v: number, d = 1) => {
    if (!(v > 0)) return '0'
    const e = Math.floor(Math.log10(v))
    const m = v / Math.pow(10, e)
    const sup = String(e).replace('-', '⁻').replace(/\d/g, (q) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(q)])
    return `${m.toFixed(d)} × 10${sup}`
  }

  /* ------------------------------------------------------------ frame */

  let lastCycle = -1
  return {
    resize() {
      layout()
    },
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hoverRuler = -1
        hoverMass = -1
        hoverPlot = false
        scrubbing = false
        if (drag.on >= 0) {
          // a drag that left the canvas counts as a release
          const a = Math.max(dm1, dm2)
          const b = Math.min(dm1, dm2)
          dm1 = a
          dm2 = b
          drag.on = -1
          setMasses(a, b)
          replay()
        }
        env.setCursor('default')
        return
      }
      const tl = onTimeline(p.x, p.y, touch)
      hoverRuler = (tl && drag.on < 0) || scrubbing ? p.x : -1
      hoverMass = drag.on >= 0 ? drag.on : massHit(p.x, p.y, touch)
      hoverPlot = onPlot(p.x, p.y)
      if (p.type === 'down') {
        acted = true
        lastAct = clock
        if (tl) {
          scrubbing = true
          seekTo(p.x)
          return
        }
        if (custom && MR.on && Math.abs(p.y - (MR.y + 27)) < (touch ? 16 : 10) && p.x > MR.x1 - 100 && p.x < MR.x1 + 10) {
          dm1 = M1_0
          dm2 = M2_0
          setMasses(M1_0, M2_0)
          replay()
          return
        }
        const mh = massHit(p.x, p.y, touch)
        if (mh >= 0) {
          drag.on = mh
          drag.touch = touch
          if (mh === 0) dm1 = mAt(p.x)
          else dm2 = mAt(p.x)
          env.setCursor('grabbing')
          return
        }
        if (onPlot(p.x, p.y) || (storyT() >= 56 && p.y > P.y && p.y < P.y + P.h && p.x > P.x)) {
          if (!playChirp()) offMsgAt = clock
          return
        }
        return
      }
      if (scrubbing) {
        if (p.type === 'move' && p.pressed) seekTo(p.x)
        if (p.type === 'up') scrubbing = false
        return
      }
      if (drag.on >= 0) {
        lastAct = clock
        const m = mAt(p.x)
        if (drag.on === 0) dm1 = m
        else dm2 = m
        if (p.type === 'up') {
          const a = Math.max(dm1, dm2)
          const b = Math.min(dm1, dm2)
          dm1 = a
          dm2 = b
          drag.on = -1
          setMasses(a, b)
          replay()
          env.setCursor('grab')
        }
        return
      }
      env.setCursor(tl || hoverPlot ? 'pointer' : hoverMass >= 0 ? 'grab' : 'default')
    },
    key(code, down) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        if (!down) return true
        const T = storyT()
        if (code === 'ArrowRight') {
          const next = CHAPTERS.find((c) => c.t > T + 0.01)
          offset += (next ? next.t : LOOP) - T
        } else {
          const i = CHAPTERS.reduce((acc, c, idx) => (T >= c.t ? idx : acc), 0)
          const target = T - CHAPTERS[i].t < 1.5 && i > 0 ? CHAPTERS[i - 1].t : CHAPTERS[i].t
          offset += target - T
        }
        acted = true
        return true
      }
      if (code === 'Space' || code === 'Enter') {
        if (down) {
          acted = true
          lastAct = clock
          if (!playChirp()) offMsgAt = clock
        }
        return true
      }
      if (code === 'KeyR') {
        if (down) {
          dm1 = M1_0
          dm2 = M2_0
          setMasses(M1_0, M2_0)
          replay()
        }
        return true
      }
      return false
    },
    destroy() {
      try {
        chirpSrc?.stop()
      } catch {
        /* stopped */
      }
      if (tone) {
        try {
          tone.osc.stop()
          tone.osc2.stop()
        } catch {
          /* stopped */
        }
        tone = null
      }
    },
    frame(t, dt) {
      clock = t
      let T = mod(t + offset, LOOP)
      holding = !preview && T >= HOLD_AT && T < OUTRO && clock - lastAct < 14
      if (holding && prevT >= 0 && dt > 0) {
        offset -= dt
        T = mod(t + offset, LOOP)
      }
      const jumped = prevT >= 0 && Math.abs(T - prevT) > 0.5
      const advancing = dt > 0 && prevT >= 0 && !jumped && T >= prevT
      const crossed = (te: number) => advancing && prevT < te && te <= T
      if (Number.isFinite(tFixed) && t + 0.5 / 60 < tFixed) {
        prevT = T
        return
      }

      ground(ctx, w, h, 'night')
      const fadeAll = 1 - smoothstep(OUTRO, LOOP - 0.3, T)
      const inT = smoothstep(0, 1.2, T)
      // the binary's story time runs I–II, then rests (merged) under III–V
      const Tb = Math.min(T, 29.9)
      stateAt(Tb)

      const panelA = (1 - smoothstep(29.4, 31, T) + smoothstep(55.4, 57.4, T)) * fadeAll * inT
      // III and IV take the panel; the grid sleeps under them
      if (T < 31 || T >= 55.4) {
        const quiet = T >= 55.4 ? 0.3 : 1
        drawGrid(T >= 55.4 ? 29.9 : Tb, panelA * quiet)
        if (T < 31) {
          drawCrests(Tb, panelA * smoothstep(4, 8, T))
          drawHoles(Tb, panelA)
          drawScale(panelA * smoothstep(2, 3, T) * (1 - smoothstep(T_M - 3, T_M - 1.5, T)))
        } else {
          drawTrack(panelA * smoothstep(56.5, 57.8, T), bin, playAt >= 0 && clock - playAt < playDur + 0.3 ? fromT() + (clock - playAt) : -9)
        }
      }
      drawJourney(T, smoothstep(30.6, 31.6, T) * (1 - smoothstep(41.4, 42.6, T)) * fadeAll)
      drawArrival(T, smoothstep(42.2, 43.2, T) * (1 - smoothstep(54.6, 55.6, T)) * fadeAll)

      // the strain plot
      if (T < 42) {
        const upTo = T < 30 ? st.tr : POST
        drawStrain(fadeAll * smoothstep(0.8, 2, T) * (1 - smoothstep(41, 42, T)), bin, upTo, 'live', 0)
      } else if (T < 56) {
        const two = ease.inOutCubic(smoothstep(50, 53, T))
        const upTo = lerp(-0.2, 0.05, clamp((T - 43.4) / 4.5))
        drawStrain(fadeAll * smoothstep(42, 43, T) * (1 - smoothstep(55, 56, T)), gw, upTo, 'two', two)
      } else {
        const playT = playAt >= 0 && clock - playAt < playDur + 0.3 ? fromT() + (clock - playAt) : -9
        drawStrain(fadeAll * smoothstep(56, 57, T), bin, playT, 'listen', 0)
      }
      drawRings(panelA * (T < 30 ? 1 : 0.6) * smoothstep(3, 4, T))
      drawNumeral(T, fadeAll * smoothstep(1.5, 2.5, T) * (T > 29.6 && T < 31.2 ? 1 - Math.sin(Math.PI * clamp((T - 29.6) / 1.6)) * 0.9 : 1))

      /* ---------------------------------------------------- sound */
      if (sfx.enabled) {
        // a tick for every gravitational-wave cycle while the story is slowed enough to count them
        if (advancing && T < T_M + 0.1) {
          const cyc = Math.floor(st.ph / TAU)
          if (lastCycle >= 0 && cyc > lastCycle && st.fReal / st.slow < 7) sfx.tone(SCALE[13], 0.05, { type: 'sine', gain: 0.012 + 0.02 * clamp(st.amp / bin.ampPeak), attack: 0.002, room: 0.25 })
          lastCycle = cyc
        }
        // the slowed listening tone, rising with the frequency, swelling into the merger
        const lvl = T < T_M + 3 ? 0.055 * clamp(st.amp / bin.ampPeak) * smoothstep(T_M - 12, T_M - 4, T) * (1 - smoothstep(T_M + 0.4, T_M + 3, T)) : 0
        if (T > T_M - 13 && T < T_M + 4) toneSet(st.fReal * 4, lvl * fadeAll)
        else if (tone) stopTone()
        if (crossed(T_M)) {
          sfx.tone(bin.fRing * 2, 3.2, { type: 'sine', gain: 0.05, attack: 0.01, room: 0.7 })
          sfx.tone(bin.fRing, 3.6, { type: 'sine', gain: 0.04, attack: 0.02, room: 0.7 })
        }
        if (crossed(57.6) || crossed(61.2)) playChirp()
        if (crossed(43.6)) sfx.tone(SCALE[9], 1.6, { type: 'sine', gain: 0.03, room: 0.6 })
        if (crossed(43.6 + 0.4)) sfx.tone(SCALE[9], 1.6, { type: 'sine', gain: 0.03, room: 0.6, pan: -0.4 })
      } else if (tone) stopTone()

      /* ---------------------------------------------------- readouts */
      const readouts: [string, string][] = []
      if (T < T_M - 0.02) {
        const v = Math.cbrt(bin.M * TSUN * Math.PI * st.fReal * (1 + Z))
        const sepKm = st.sep / st.kmPx / Math.max(1e-6, 1 - st.merge)
        readouts.push(['f · gw', `${st.fReal.toFixed(1)} Hz`], ['separation', `${Math.round(sepKm).toLocaleString('en-US')} km`], ['speed', `${v.toFixed(2)} c`], ['to merger', `${Math.max(0, -st.tr).toFixed(3)} s`], ['time slowed', `×${Math.round(st.slow)}`])
      } else if (T < 31) {
        const L = 3.6e49 * Math.pow(bin.eta / 0.2471, 2)
        readouts.push(['radiated', `${bin.erad.toFixed(1)} M☉ c²`], ['peak power', `≈ ${fmtE(L)} W`], ['remnant', `${fmtM(bin.mf)} M☉ · a ${bin.af.toFixed(2)}`], ['ringdown', `${Math.round(bin.fRing)} Hz · ${(bin.tauRing * 1000).toFixed(1)} ms`])
      } else if (T < 42) {
        readouts.push(['distance', '410 Mpc'], ['redshift', '0.09'], ['travel', '≈ 1.3 billion yr'])
      } else if (T < 56) {
        readouts.push(['event', 'GW150914'], ['peak strain', '1.0 × 10⁻²¹'], ['H1 − L1', '6.9 ms'], ['signal to noise', '24'])
      } else {
        const fa = Math.round(look(bin, bin.f, bin.tAudio))
        readouts.push(['as it arrived', `${fa}–${Math.round(bin.fRing)} Hz`], ['heard', bin.pitch > 1 ? `×${bin.pitch} · ${fa * bin.pitch}–${Math.round(bin.fRing * bin.pitch)} Hz` : 'as it was'], ['duration', `${(-bin.tAudio).toFixed(2)} s`], ['chirp mass', `${bin.mcDet.toFixed(1)} M☉ detector`])
      }

      // ghost demonstrations (full mode, until the viewer acts)
      let ghost = 0
      if (!preview && !acted && T > 3 && T < 7.6) ghost = (T - 3) / 4.6
      drawMassRuler(ghost)
      if (!preview && !acted && T > 7.6 && T < 11.4 && S.on) {
        const a = Math.sin(Math.PI * clamp((T - 7.6) / 3.8))
        halo('tap the plot to hear it', S.x + S.w - 8, S.y + 12, { size: 9, color: C.sky, align: 'right', upper: true, tracking: 0.14, alpha: a })
      }
      if (!preview && T >= 62 && T < OUTRO && clock - lastAct > 6 && !tiny) {
        const al = smoothstep(62, 63, T) * (1 - smoothstep(OUTRO - 1, OUTRO, T))
        text(ctx, portrait || w < 640 ? 'Drag a mass · tap to hear' : 'Drag a mass to make another binary · tap the plot or press space to hear it', w - pad, rulerOn ? rulerY() - 24 : h - pad, { size: 9.5, color: MUTED, align: 'right', tracking: 0.14, upper: true, alpha: al })
      }
      if (clock - offMsgAt < 3.5 && !sfx.enabled) {
        halo('sound is off · turn it on in the viewer', P.x + P.w / 2, P.y + P.h - 18, { size: 9.5, color: C.sky, align: 'center', upper: true, tracking: 0.14 })
      }

      captionAt(T)
      chrome(T, readouts)
      prevT = T
    },
  }
}

export default create
