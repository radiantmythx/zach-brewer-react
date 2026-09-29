import { chordAt, mtof, PROGRESSION } from './harmony'
import { CODE_TICKS } from './scenes/code'
import { DESIGN_EVENTS } from './scenes/design'
import { COINS, JUMPS, LANDINGS, STOMP } from './scenes/game'
import { BAR, BEAT, CHAPTER, LOOP, wrap } from './timeline'

/*
 * The film's soundtrack, synthesized live with Web Audio: no samples, no
 * files. Every event is derived from the same timings the picture uses —
 * keystrokes, handle clicks, jumps, coins, the stomp — layered over one chord
 * progression that gains an instrument each chapter.
 */

type Ev =
  | { t: number; kind: 'pad'; notes: number[]; dur: number; cutoff: number; gain: number }
  | { t: number; kind: 'bass'; midi: number; dur: number; gain: number }
  | { t: number; kind: 'bell'; midi: number; gain: number; dur: number }
  | { t: number; kind: 'tick'; gain: number; freq: number }
  | { t: number; kind: 'kick'; gain: number }
  | { t: number; kind: 'hat'; gain: number }
  | { t: number; kind: 'arp'; midi: number; gain: number }
  | { t: number; kind: 'coin'; gem: boolean }
  | { t: number; kind: 'jump' }
  | { t: number; kind: 'thud' }
  | { t: number; kind: 'stomp' }
  | { t: number; kind: 'strum'; notes: number[] }
  | { t: number; kind: 'swell'; dur: number; gain: number }

const MELODY: [number, number, number][] = [
  [0, 76, 1], [1, 79, 0.5], [1.5, 81, 1.5], [3, 79, 1],
  [4, 74, 1], [5, 76, 0.5], [5.5, 79, 1.5], [7, 76, 1],
  [8, 71, 1], [9, 74, 0.5], [9.5, 76, 1], [10.5, 79, 1.5],
  [12, 81, 1], [13, 79, 0.5], [13.5, 76, 2.5],
]

function buildScore(): Ev[] {
  const ev: Ev[] = []
  const C = CHAPTER

  for (let bar = 0; bar < 16; bar++) {
    const t = bar * BAR
    const ch = Math.floor(bar / 4)
    const chord = PROGRESSION[bar % 4]
    const cutoff = [650, 950, 1300, 2000][ch] * (bar === 15 ? 0.55 : 1)
    ev.push({ t, kind: 'pad', notes: chord.notes, dur: BAR + 0.1, cutoff, gain: [0.8, 0.95, 0.7, 0.95][ch] })

    if (ch === 1) ev.push({ t, kind: 'bass', midi: chord.bass, dur: BAR - 0.1, gain: 0.5 })
    if (ch === 2) {
      for (const [b, oct] of [[0, 0], [1.5, 12], [2, 0], [3.5, 12]] as const)
        ev.push({ t: t + b * BEAT, kind: 'bass', midi: chord.bass + oct, dur: 0.4, gain: 0.55 })
    }
    if (ch === 3 && bar < 15) {
      ev.push({ t, kind: 'bass', midi: chord.bass, dur: BEAT * 2 - 0.05, gain: 0.6 })
      ev.push({ t: t + 2 * BEAT, kind: 'bass', midi: chord.bass + 7, dur: BEAT * 2 - 0.05, gain: 0.45 })
    }
    if (bar === 15) ev.push({ t, kind: 'bass', midi: chord.bass, dur: BAR, gain: 0.4 })
  }

  // 01 — programming: keystrokes, a whoosh as the caret leaps, a chime when the curve lands
  for (const tk of CODE_TICKS) ev.push({ t: tk, kind: 'tick', gain: 0.8, freq: 3200 + ((tk * 9173) % 1) * 1800 })
  ev.push({ t: 4.1, kind: 'swell', dur: 1.9, gain: 0.8 })
  ev.push({ t: 6.0, kind: 'bell', midi: 76, gain: 0.7, dur: 1.8 })
  ev.push({ t: 7.0, kind: 'bell', midi: 84, gain: 0.45, dur: 1.6 })

  // 02 — design: anchors pop, handles click, the golden grid rings up the chord
  ev.push({ t: C + DESIGN_EVENTS.anchors[0], kind: 'bell', midi: 76, gain: 0.55, dur: 1.4 })
  ev.push({ t: C + DESIGN_EVENTS.anchors[1], kind: 'bell', midi: 81, gain: 0.55, dur: 1.4 })
  for (const p of DESIGN_EVENTS.press) ev.push({ t: C + p, kind: 'tick', gain: 1.4, freq: 2200 })
  for (const r of DESIGN_EVENTS.release) ev.push({ t: C + r, kind: 'tick', gain: 1.0, freq: 2800 })
  ev.push({ t: C + DESIGN_EVENTS.bbox, kind: 'bell', midi: 84, gain: 0.4, dur: 1.4 })
  ev.push({ t: C + DESIGN_EVENTS.bbox + 0.02, kind: 'bell', midi: 88, gain: 0.3, dur: 1.4 })
  ;[67, 71, 74, 76, 79, 83, 86, 88].forEach((m, i) =>
    ev.push({ t: C + DESIGN_EVENTS.goldenLines + i * 0.125, kind: 'bell', midi: m, gain: 0.32, dur: 1.2 }),
  )
  ev.push({ t: C + DESIGN_EVENTS.unfurl[0], kind: 'swell', dur: 1.2, gain: 0.7 })

  // 03 — game design: a beat kicks in, arpeggios, jumps, coins, the stomp
  const G = 2 * C
  for (let b = 4; b < 15; b++) {
    const t = G + b * BEAT
    ev.push({ t, kind: 'kick', gain: 0.55 })
    ev.push({ t: t + BEAT / 2, kind: 'hat', gain: 0.7 })
  }
  for (let s = 16; s < 60; s++) {
    const t = G + s * (BEAT / 4)
    const chord = chordAt(wrap(t))
    const pat = [0, 1, 2, 3, 2, 1, 2, 3][s % 8]
    ev.push({ t, kind: 'arp', midi: chord.notes[pat] + 12, gain: s % 4 === 0 ? 1 : 0.65 })
  }
  for (const j of JUMPS) ev.push({ t: G + j.t0, kind: 'jump' })
  for (const l of LANDINGS) if (l !== STOMP) ev.push({ t: G + l, kind: 'thud' })
  for (const c of COINS) ev.push({ t: G + c.t, kind: 'coin', gem: c.gem })
  ev.push({ t: G + STOMP, kind: 'stomp' })
  ev.push({ t: G + STOMP, kind: 'strum', notes: [41, 48, 57, 64, 67, 72] })

  // 04 — music: half-time groove and a melody over the progression
  const Mu = 3 * C
  for (let bar = 0; bar < 4; bar++) {
    const t = Mu + bar * BAR
    if (bar < 3) {
      ev.push({ t, kind: 'kick', gain: 0.6 })
      ev.push({ t: t + 2 * BEAT, kind: 'kick', gain: 0.5 })
      for (let e = 0; e < 8; e++) ev.push({ t: t + e * (BEAT / 2), kind: 'hat', gain: e % 2 ? 0.75 : 0.4 })
    } else {
      ev.push({ t, kind: 'kick', gain: 0.4 })
    }
  }
  for (const [b, m, d] of MELODY) ev.push({ t: Mu + b * BEAT, kind: 'bell', midi: m, gain: 0.75, dur: d * BEAT + 1.2 })

  return ev.sort((a, b) => a.t - b.t)
}

const EVENTS = buildScore()

interface Gen {
  dry: GainNode
  verb: GainNode
  echo: GainNode
}

export class Score {
  readonly ctx: AudioContext
  private out: GainNode
  private comp: DynamicsCompressorNode
  private verbIn: GainNode
  private echoIn: GainNode
  private pluckBus: GainNode
  private gen: Gen
  private noise: AudioBuffer
  private ks = new Map<number, AudioBuffer>()
  private origin = 0
  private cursor = 0
  private timer = 0
  playing = false

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC({ latencyHint: 'interactive' })
    this.ctx = ctx

    this.comp = ctx.createDynamicsCompressor()
    this.comp.threshold.value = -16
    this.comp.knee.value = 12
    this.comp.ratio.value = 4
    this.comp.attack.value = 0.004
    this.comp.release.value = 0.25
    this.out = ctx.createGain()
    this.out.gain.value = 0
    this.comp.connect(this.out).connect(ctx.destination)

    // reverb: a generated 2.8s stereo tail, darkened
    const verb = ctx.createConvolver()
    const len = Math.floor(ctx.sampleRate * 2.8)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
    }
    verb.buffer = ir
    const verbTone = ctx.createBiquadFilter()
    verbTone.type = 'lowpass'
    verbTone.frequency.value = 4200
    this.verbIn = ctx.createGain()
    this.verbIn.gain.value = 0.55
    this.verbIn.connect(verbTone).connect(verb).connect(this.comp)

    // dotted-eighth echo
    const delay = ctx.createDelay(1)
    delay.delayTime.value = BEAT * 0.75
    const fb = ctx.createGain()
    fb.gain.value = 0.3
    const fbTone = ctx.createBiquadFilter()
    fbTone.type = 'lowpass'
    fbTone.frequency.value = 2600
    this.echoIn = ctx.createGain()
    this.echoIn.gain.value = 0.3
    this.echoIn.connect(delay)
    delay.connect(fbTone).connect(fb).connect(delay)
    fbTone.connect(this.comp)

    // Plucks bypass the score's master fade so the contact string still
    // sounds while the film is paused or offscreen.
    this.pluckBus = ctx.createGain()
    this.pluckBus.gain.value = 0.7
    const pluckLimit = ctx.createDynamicsCompressor()
    pluckLimit.threshold.value = -10
    this.pluckBus.connect(pluckLimit).connect(ctx.destination)
    this.pluckBus.connect(this.verbIn)

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const nd = this.noise.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

    this.gen = this.makeGen()
    for (const m of [41, 48, 57, 64, 67, 72]) this.karplus(m)
  }

  private get latency() {
    return this.ctx.outputLatency || this.ctx.baseLatency || 0
  }

  /** Film time the listener is hearing right now. */
  filmTime = () => this.ctx.currentTime - this.latency - this.origin

  private makeGen(): Gen {
    const dry = this.ctx.createGain()
    const verb = this.ctx.createGain()
    const echo = this.ctx.createGain()
    dry.connect(this.comp)
    verb.connect(this.verbIn)
    echo.connect(this.echoIn)
    return { dry, verb, echo }
  }

  private retireGen() {
    const old = this.gen
    const now = this.ctx.currentTime
    for (const n of [old.dry, old.verb, old.echo]) {
      n.gain.setValueAtTime(n.gain.value, now)
      n.gain.linearRampToValueAtTime(0, now + 0.12)
    }
    window.setTimeout(() => {
      old.dry.disconnect()
      old.verb.disconnect()
      old.echo.disconnect()
    }, 3500)
    this.gen = this.makeGen()
  }

  /** Begin scoring from the film's current time (read after the context is running). */
  async start(filmNow: () => number) {
    this.playing = true
    if (this.ctx.state !== 'running') await this.ctx.resume()
    if (!this.playing) return
    this.retireGen()
    const t = filmNow()
    this.origin = this.ctx.currentTime - this.latency - t
    this.cursor = t
    const now = this.ctx.currentTime
    this.out.gain.cancelScheduledValues(now)
    this.out.gain.setValueAtTime(this.out.gain.value, now)
    this.out.gain.linearRampToValueAtTime(0.8, now + 0.9)
    window.clearInterval(this.timer)
    this.timer = window.setInterval(this.pump, 25)
    this.pump()
  }

  stop() {
    this.playing = false
    window.clearInterval(this.timer)
    const now = this.ctx.currentTime
    this.out.gain.cancelScheduledValues(now)
    this.out.gain.setValueAtTime(this.out.gain.value, now)
    this.out.gain.linearRampToValueAtTime(0, now + 0.35)
    this.retireGen()
  }

  seek(filmT: number) {
    if (!this.playing) return
    this.retireGen()
    this.origin = this.ctx.currentTime - this.latency - filmT
    this.cursor = filmT
    this.pump()
  }

  suspend() {
    void this.ctx.suspend()
  }

  resume() {
    void this.ctx.resume()
  }

  private pump = () => {
    if (!this.playing) return
    const horizon = this.ctx.currentTime - this.origin + 0.18
    while (this.cursor < horizon) {
      const t0 = this.cursor
      const t1 = Math.min(horizon, t0 + 0.5)
      const n = Math.floor(t0 / LOOP)
      for (let l = n; l <= n + 1; l++) {
        for (const ev of EVENTS) {
          const T = l * LOOP + ev.t
          if (T >= t0 && T < t1) {
            const when = this.origin + T
            if (when >= this.ctx.currentTime - 0.02) this.play(ev, Math.max(when, this.ctx.currentTime))
          }
        }
      }
      this.cursor = t1
    }
  }

  /** The contact section's line: pluck a note from whatever chord is sounding. */
  pluck(x01: number, velocity = 1) {
    if (this.ctx.state !== 'running') void this.ctx.resume()
    const ch = chordAt(wrap(this.playing ? this.filmTime() : 0))
    const pool = [ch.bass + 12, ...ch.notes, ...ch.notes.map((n) => n + 12)].sort((a, b) => a - b)
    const midi = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, x01) * pool.length))]
    const src = this.ctx.createBufferSource()
    src.buffer = this.karplus(midi)
    const g = this.ctx.createGain()
    g.gain.value = 0.35 * Math.min(1, 0.4 + velocity * 0.6)
    src.connect(g).connect(this.pluckBus)
    src.start()
  }

  /* ---- instruments ---- */

  private osc(type: OscillatorType, freq: number, when: number) {
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, when)
    return o
  }

  private env(when: number, peak: number, attack: number, decay: number) {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(peak, when + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay)
    return g
  }

  private route(node: AudioNode, verb = 0, echo = 0) {
    node.connect(this.gen.dry)
    if (verb > 0) {
      const s = this.ctx.createGain()
      s.gain.value = verb
      node.connect(s).connect(this.gen.verb)
    }
    if (echo > 0) {
      const s = this.ctx.createGain()
      s.gain.value = echo
      node.connect(s).connect(this.gen.echo)
    }
  }

  private noiseSrc(when: number, dur: number) {
    const s = this.ctx.createBufferSource()
    s.buffer = this.noise
    s.loop = true
    s.start(when, Math.random() * 0.5)
    s.stop(when + dur)
    return s
  }

  private karplus(midi: number) {
    const hit = this.ks.get(midi)
    if (hit) return hit
    const sr = this.ctx.sampleRate
    const n = Math.floor(sr * 2.6)
    const buf = this.ctx.createBuffer(1, n, sr)
    const d = buf.getChannelData(0)
    const p = Math.max(2, Math.round(sr / mtof(midi)))
    const ring = new Float32Array(p)
    let lp = 0
    for (let i = 0; i < p; i++) {
      lp += 0.45 * (Math.random() * 2 - 1 - lp)
      ring[i] = lp
    }
    let idx = 0
    let peak = 0
    for (let i = 0; i < n; i++) {
      const a = ring[idx]
      const b = ring[(idx + 1) % p]
      d[i] = a
      peak = Math.max(peak, Math.abs(a))
      ring[idx] = (a + b) * 0.5 * 0.9982
      idx = (idx + 1) % p
    }
    if (peak > 0) for (let i = 0; i < n; i++) d[i] *= 0.9 / peak
    this.ks.set(midi, buf)
    return buf
  }

  private play(ev: Ev, when: number) {
    const ctx = this.ctx
    switch (ev.kind) {
      case 'pad': {
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.Q.value = 0.6
        f.frequency.setValueAtTime(ev.cutoff * 0.7, when)
        f.frequency.linearRampToValueAtTime(ev.cutoff, when + ev.dur * 0.6)
        const g = ctx.createGain()
        const peak = 0.045 * ev.gain
        g.gain.setValueAtTime(0.0001, when)
        g.gain.linearRampToValueAtTime(peak, when + 0.5)
        g.gain.setValueAtTime(peak, when + ev.dur - 0.1)
        g.gain.linearRampToValueAtTime(0.0001, when + ev.dur + 1.1)
        for (const m of ev.notes) {
          const o1 = this.osc('triangle', mtof(m), when)
          const o2 = this.osc('sawtooth', mtof(m), when)
          o2.detune.value = 7
          const g2 = ctx.createGain()
          g2.gain.value = 0.28
          o1.connect(f)
          o2.connect(g2).connect(f)
          o1.start(when)
          o2.start(when)
          o1.stop(when + ev.dur + 1.2)
          o2.stop(when + ev.dur + 1.2)
        }
        f.connect(g)
        this.route(g, 0.6)
        break
      }
      case 'bass': {
        const o = this.osc('sine', mtof(ev.midi), when)
        const o2 = this.osc('triangle', mtof(ev.midi), when)
        const g2 = ctx.createGain()
        g2.gain.value = 0.25
        const g = ctx.createGain()
        const peak = 0.2 * ev.gain
        g.gain.setValueAtTime(0.0001, when)
        g.gain.linearRampToValueAtTime(peak, when + 0.015)
        g.gain.exponentialRampToValueAtTime(peak * 0.4, when + ev.dur)
        g.gain.exponentialRampToValueAtTime(0.0001, when + ev.dur + 0.2)
        o.connect(g)
        o2.connect(g2).connect(g)
        o.start(when)
        o2.start(when)
        o.stop(when + ev.dur + 0.25)
        o2.stop(when + ev.dur + 0.25)
        this.route(g, 0.1)
        break
      }
      case 'bell': {
        const f = mtof(ev.midi)
        const car = this.osc('sine', f, when)
        const mod = this.osc('sine', f * 3.5, when)
        const mg = ctx.createGain()
        mg.gain.setValueAtTime(f * 1.1, when)
        mg.gain.exponentialRampToValueAtTime(f * 0.01, when + 0.6)
        mod.connect(mg).connect(car.frequency)
        const g = this.env(when, 0.075 * ev.gain, 0.004, ev.dur)
        car.connect(g)
        car.start(when)
        mod.start(when)
        car.stop(when + ev.dur + 0.1)
        mod.stop(when + ev.dur + 0.1)
        this.route(g, 0.7, 0.4)
        break
      }
      case 'tick': {
        const s = this.noiseSrc(when, 0.04)
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = ev.freq
        bp.Q.value = 1.3
        const g = this.env(when, 0.05 * ev.gain, 0.001, 0.025)
        s.connect(bp).connect(g)
        this.route(g, 0.15)
        break
      }
      case 'kick': {
        const o = this.osc('sine', 150, when)
        o.frequency.exponentialRampToValueAtTime(44, when + 0.12)
        const g = this.env(when, 0.75 * ev.gain, 0.003, 0.36)
        o.connect(g)
        o.start(when)
        o.stop(when + 0.45)
        this.route(g)
        break
      }
      case 'hat': {
        const s = this.noiseSrc(when, 0.06)
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 7600
        const g = this.env(when, 0.05 * ev.gain, 0.001, 0.045)
        s.connect(hp).connect(g)
        this.route(g, 0.1)
        break
      }
      case 'arp': {
        const o = this.osc('triangle', mtof(ev.midi), when)
        const o2 = this.osc('square', mtof(ev.midi), when)
        const g2 = ctx.createGain()
        g2.gain.value = 0.12
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 2400
        const g = this.env(when, 0.06 * ev.gain, 0.003, 0.2)
        o.connect(lp)
        o2.connect(g2).connect(lp)
        lp.connect(g)
        o.start(when)
        o2.start(when)
        o.stop(when + 0.3)
        o2.stop(when + 0.3)
        this.route(g, 0.2, 0.35)
        break
      }
      case 'coin': {
        if (ev.gem) {
          ;[84, 88, 91, 96].forEach((m, i) => this.play({ t: 0, kind: 'bell', midi: m, gain: 0.5, dur: 1.2 }, when + i * 0.05))
          break
        }
        const o = this.osc('square', 988, when)
        o.frequency.setValueAtTime(1319, when + 0.06)
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 5000
        const g = this.env(when, 0.03, 0.002, 0.26)
        o.connect(lp).connect(g)
        o.start(when)
        o.stop(when + 0.3)
        this.route(g, 0.2, 0.3)
        break
      }
      case 'jump': {
        const o = this.osc('sine', 330, when)
        o.frequency.exponentialRampToValueAtTime(760, when + 0.12)
        const g = this.env(when, 0.05, 0.004, 0.15)
        o.connect(g)
        o.start(when)
        o.stop(when + 0.2)
        this.route(g, 0.15)
        break
      }
      case 'thud': {
        const o = this.osc('sine', 120, when)
        o.frequency.exponentialRampToValueAtTime(55, when + 0.08)
        const g = this.env(when, 0.22, 0.002, 0.14)
        o.connect(g)
        o.start(when)
        o.stop(when + 0.2)
        this.route(g)
        break
      }
      case 'stomp': {
        const o = this.osc('sine', 95, when)
        o.frequency.exponentialRampToValueAtTime(30, when + 0.45)
        const g = this.env(when, 0.8, 0.003, 0.9)
        o.connect(g)
        o.start(when)
        o.stop(when + 1)
        this.route(g, 0.4)
        const s = this.noiseSrc(when, 0.5)
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 900
        const gn = this.env(when, 0.25, 0.002, 0.4)
        s.connect(lp).connect(gn)
        this.route(gn, 0.5)
        break
      }
      case 'strum': {
        ev.notes.forEach((m, i) => {
          const src = ctx.createBufferSource()
          src.buffer = this.karplus(m)
          const g = ctx.createGain()
          g.gain.value = 0.22
          src.connect(g)
          this.route(g, 0.45, 0.2)
          src.start(when + i * 0.028)
        })
        break
      }
      case 'swell': {
        const s = this.noiseSrc(when, ev.dur + 0.1)
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.Q.value = 0.9
        bp.frequency.setValueAtTime(300, when)
        bp.frequency.exponentialRampToValueAtTime(2600, when + ev.dur)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, when)
        g.gain.linearRampToValueAtTime(0.035 * ev.gain, when + ev.dur * 0.7)
        g.gain.linearRampToValueAtTime(0.0001, when + ev.dur)
        s.connect(bp).connect(g)
        this.route(g, 0.6)
        break
      }
    }
  }
}
