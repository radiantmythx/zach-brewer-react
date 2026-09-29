import { chordAt, CHORDS, IDLE_CHORDS, IDLE_LEN, mtof, REEL_CHORDS } from './harmony'
import { hash } from './math'
import { CODE_TOKEN_BEATS } from './scenes/code'
import { DESIGN_SNAP_BEATS, DESIGN_SWATCH_BEATS } from './scenes/design'
import { GAME_BEATS, GAME_BOLT_BEATS, GAME_HIT_BEATS, GAME_LOOT_BEATS } from './scenes/game'
import { DRUMS } from './scenes/music'
import { RESOLVE_PIECE_BEATS } from './scenes/resolve'
import { BAR, BEAT, REEL_END, REVEAL_BEAT, SNAP_BEAT } from './timeline'

/*
 * The reel's soundtrack, synthesized live with Web Audio — no samples, no
 * files. Every hit is derived from the same beat times the picture uses
 * (token slams, shape snaps, sword hits, bolts, the boss, the logo snap), and
 * the music chapter's drums are literally the on-screen sequencer pattern.
 * After the reel, a quiet ambient loop plays for as long as sound is on.
 */

type Kind =
  | 'pad' | 'bass' | 'kick' | 'clap' | 'hat' | 'perc' | 'stab' | 'impact' | 'riser' | 'drop' | 'whoosh'
  | 'blip' | 'zap' | 'crunch' | 'crackle' | 'bell' | 'arp' | 'growl' | 'shimmer' | 'crash' | 'strum' | 'portal'

interface Ev {
  t: number
  k: Kind
  gain?: number
  dur?: number
  midi?: number
  notes?: number[]
  cutoff?: number
}

function buildReel(): Ev[] {
  const ev: Ev[] = []
  const add = (beat: number, k: Kind, o: Omit<Ev, 't' | 'k'> = {}) => ev.push({ t: beat * BEAT, k, ...o })
  const chord = (bar: number) => CHORDS[REEL_CHORDS[bar]]

  // harmony bed
  const padLook: Record<number, [number, number]> = { 1: [0.5, 700], 2: [0.45, 900], 3: [0.45, 900], 4: [0.55, 1100], 5: [0.55, 1100], 6: [0.4, 1300], 7: [0.4, 1300], 8: [0.45, 1100], 9: [0.7, 1800], 10: [0.7, 1800] }
  for (const [bar, [gain, cutoff]] of Object.entries(padLook)) add(Number(bar) * 4, 'pad', { notes: chord(Number(bar)).notes, dur: BAR + 0.1, gain, cutoff })

  const groove = (from: number, to: number, o: { clap?: boolean; hats?: 8 | 16; bass?: boolean; kick?: boolean } = {}) => {
    for (let b = from; b < to; b++) {
      if (o.kick !== false) add(b, 'kick', { gain: 0.8 })
      if (o.clap !== false && b % 2 === 1) add(b, 'clap', { gain: 0.8 })
      if ((o.hats ?? 8) === 8) add(b + 0.5, 'hat', { gain: 0.7 })
      else for (let s = 0; s < 4; s++) add(b + s / 4, 'hat', { gain: s === 2 ? 0.7 : s % 2 ? 0.45 : 0.3 })
      if (o.bass !== false) {
        const c = chord(Math.floor(b / 4))
        add(b, 'bass', { midi: c.bass - 12, dur: BEAT * 0.45, gain: 0.9 })
        add(b + 0.5, 'bass', { midi: c.bass - 12 + (b % 2 ? 12 : 7), dur: BEAT * 0.4, gain: 0.7 })
      }
    }
  }

  // --- COLD OPEN ---------------------------------------------------------------------
  add(0, 'riser', { dur: BEAT * 0.95, gain: 0.6 })
  add(1, 'impact', { gain: 0.8 })
  add(1, 'stab', { notes: [57, 60, 64], gain: 0.7 })
  add(2, 'impact', { gain: 0.65 })
  add(2, 'stab', { notes: [57, 60, 64], gain: 0.55 })
  add(3, 'whoosh', { dur: 0.25, gain: 0.5 })
  add(3, 'blip', { midi: 88, gain: 0.5 })
  add(3.5, 'impact', { gain: 1 })
  add(3.5, 'drop', { dur: BEAT * 2, gain: 0.8 })
  add(3.5, 'stab', { notes: [45, 52, 57, 60], gain: 0.9 })
  groove(4, 8, { hats: 8 })
  add(7.25, 'riser', { dur: BEAT * 0.75, gain: 0.5 })
  add(7.5, 'whoosh', { dur: 0.35, gain: 0.8 })

  // --- 01 PROGRAMMING --------------------------------------------------------------------
  add(8, 'impact', { gain: 0.6 })
  groove(8, 16, { hats: 16 })
  CODE_TOKEN_BEATS.forEach((b, i) => {
    add(8 + b, 'blip', { midi: [72, 74, 76, 79, 81, 79, 84, 86, 88, 91][i], gain: 0.6 })
    add(8 + b, 'crunch', { gain: 0.35 })
  })
  add(12, 'riser', { dur: BEAT * 0.6, gain: 0.35 })
  add(12, 'bell', { midi: 88, gain: 0.5, dur: 1.2 })
  add(12.5, 'whoosh', { dur: 0.3, gain: 0.6 })
  add(12.75, 'whoosh', { dur: 0.3, gain: 0.6 })
  add(13, 'impact', { gain: 0.5 })
  add(13.5, 'impact', { gain: 0.55 })
  for (let i = 0; i < 14; i++) add(13.6 + i * 0.0625, 'blip', { midi: 60 + Math.floor(hash(i * 3.3) * 36), gain: 0.25 })
  add(14.5, 'riser', { dur: BEAT * 1.4, gain: 0.55 })

  // --- 02 DESIGN -----------------------------------------------------------------------------
  add(16, 'impact', { gain: 0.6 })
  add(16, 'whoosh', { dur: BEAT * 1.4, gain: 0.6 })
  groove(16, 24, { hats: 8 })
  DESIGN_SNAP_BEATS.forEach((b, i) => add(16 + b, 'bell', { midi: [81, 84, 88, 91][i], gain: 0.6, dur: 1.4 }))
  add(20, 'impact', { gain: 0.55 })
  add(20, 'stab', { notes: [60, 64, 67, 71], gain: 0.6 })
  for (const b of [21, 21.5, 22]) add(b, 'blip', { midi: 96, gain: 0.3 })
  DESIGN_SWATCH_BEATS.forEach((b, i) => add(16 + b, 'arp', { midi: [72, 76, 79, 83, 86][i], gain: 1 }))
  add(22.5, 'crash', { gain: 0.5 })
  add(22.5, 'whoosh', { dur: 0.4, gain: 0.7 })
  add(23.3, 'riser', { dur: BEAT * 0.7, gain: 0.6 })

  // --- 03 GAME DEV ---------------------------------------------------------------------------------
  const G = (b: number) => 24 + b
  add(G(0), 'impact', { gain: 0.8 })
  add(G(0), 'whoosh', { dur: 0.35, gain: 0.7 })
  add(G(GAME_BEATS.spawn1), 'portal', { gain: 0.6 })
  add(G(GAME_BEATS.spawn2), 'portal', { gain: 0.6 })
  add(G(GAME_BEATS.spawn3), 'portal', { gain: 0.5 })
  groove(24, 31, { hats: 16 })
  add(G(GAME_BEATS.slash), 'whoosh', { dur: 0.22, gain: 0.9 })
  GAME_BOLT_BEATS.slice(0, 16).forEach((b) => add(G(b), 'zap', { gain: 0.45 }))
  GAME_HIT_BEATS.forEach((b) => add(G(b), 'crunch', { gain: 0.5 }))
  add(G(GAME_BEATS.lightning), 'crackle', { gain: 0.8 })
  add(G(GAME_BEATS.lightning + 0.05), 'impact', { gain: 0.55 })
  GAME_LOOT_BEATS.forEach((b, i) => add(G(b), 'bell', { midi: [84, 86, 88, 91, 93][i % 5] + (i % 3 === 0 ? 12 : 0), gain: 0.18, dur: 0.6 }))
  ;[84, 88, 91, 96, 100].forEach((m, i) => add(G(GAME_BEATS.levelUp) + i * 0.08, 'bell', { midi: m, gain: 0.55, dur: 1.4 }))
  add(G(GAME_BEATS.levelUp), 'shimmer', { gain: 0.6 })
  // boss
  add(G(GAME_BEATS.boss), 'growl', { gain: 0.8 })
  add(G(GAME_BEATS.boss), 'stab', { notes: [45, 46, 52, 58], gain: 0.8 })
  add(G(GAME_BEATS.bossLand), 'impact', { gain: 1 })
  groove(32, 33, { hats: 16 })
  for (let i = 0; i < 8; i++) add(33 + i * 0.0625, 'clap', { gain: 0.3 + i * 0.06 })
  ;[0, 0.08, 0.16].forEach((d) => add(G(GAME_BEATS.telegraphBoom) + d, 'impact', { gain: 0.45 }))
  for (let i = 0; i < 8; i++) add(G(GAME_BEATS.bullets) + i * 0.03, 'zap', { gain: 0.3 })
  add(G(GAME_BEATS.charge), 'riser', { dur: BEAT * 0.4, gain: 0.7 })
  add(G(GAME_BEATS.nova), 'impact', { gain: 1.2 })
  add(G(GAME_BEATS.nova), 'drop', { dur: BEAT * 2, gain: 0.9 })
  add(G(GAME_BEATS.nova), 'stab', { notes: [45, 57, 60, 64, 67], gain: 0.9 })
  add(G(GAME_BEATS.shatter), 'shimmer', { gain: 0.8 })
  add(G(GAME_BEATS.boom), 'impact', { gain: 1.3 })
  add(G(GAME_BEATS.boom), 'crash', { gain: 0.9 })
  add(G(GAME_BEATS.boom), 'drop', { dur: BEAT * 2.5, gain: 0.8 })

  // --- 04 MUSIC — drums straight off the on-screen sequencer ------------------------------------------
  for (let bar = 0; bar < 2; bar++) {
    const b0 = 36 + bar * 4
    DRUMS.forEach((row) => {
      for (const s of row.steps) {
        const beat = b0 + s / 4
        if (beat >= 42.6) continue
        add(beat, row.name === 'KICK' ? 'kick' : row.name === 'SNARE' ? 'clap' : row.name === 'HAT' ? 'hat' : 'perc', { gain: 0.85 })
      }
    })
    const c = chord(9 + bar)
    for (let s = 0; s < 16; s += 2) {
      if (b0 + s / 4 >= 42.6) continue
      add(b0 + s / 4, 'bass', { midi: c.bass - 12 + (s % 8 === 6 ? 12 : 0), dur: BEAT * 0.4, gain: 0.8 })
      add(b0 + s / 4, 'arp', { midi: c.notes[(s / 2) % 4] + 12, gain: 0.6 })
    }
  }
  ;[76, 79, 81, 84, 81, 79, 76, 74, 76, 79, 83, 81, 79, 76].forEach((m, k) =>
    add(36 + 0.5 + k * 0.5 + (k % 3 === 1 ? 0.25 : 0), 'bell', { midi: m, gain: 0.7, dur: 1.1 }),
  )
  add(42.5, 'riser', { dur: BEAT * 1.5, gain: 0.55 })

  // --- RESOLVE ------------------------------------------------------------------------------------------
  add(44, 'riser', { dur: BEAT * 2.5, gain: 0.9 })
  for (const b of [45, 45.5, 45.75, 46, 46.125, 46.25, 46.375]) add(b, 'clap', { gain: 0.5 })
  RESOLVE_PIECE_BEATS.forEach((b) => {
    add(44 + b, 'whoosh', { dur: 0.2, gain: 0.5 })
    add(44 + b, 'kick', { gain: 0.6 })
  })
  add(SNAP_BEAT, 'impact', { gain: 1.4 })
  add(SNAP_BEAT, 'stab', { notes: [48, 55, 64, 67, 71, 74], gain: 0.9 })
  add(SNAP_BEAT, 'pad', { notes: CHORDS.Cmaj9.notes, dur: BEAT * 5.5, gain: 0.8, cutoff: 1600 })
  add(SNAP_BEAT, 'strum', { notes: [36, 43, 52, 62, 67, 72] })
  add(SNAP_BEAT, 'shimmer', { gain: 0.8 })
  for (let i = 0; i < 11; i++) add(REVEAL_BEAT + i * 0.045, 'blip', { midi: 84 + (i % 4) * 3, gain: 0.25 })
  add(REVEAL_BEAT, 'kick', { gain: 0.5 })
  add(49, 'bell', { midi: 88, gain: 0.35, dur: 2 })
  add(50.5, 'bell', { midi: 91, gain: 0.3, dur: 2 })

  return ev.sort((a, b) => a.t - b.t)
}

function buildIdle(): Ev[] {
  const ev: Ev[] = []
  IDLE_CHORDS.forEach((name, bar) => {
    if (bar % 2) return
    ev.push({ t: bar * BAR, k: 'pad', notes: CHORDS[name].notes, dur: BAR * 2 + 0.2, gain: 0.45, cutoff: 850 })
  })
  for (let b = 0; b < IDLE_CHORDS.length * 4; b += 2) {
    const c = CHORDS[IDLE_CHORDS[Math.floor(b / 4)]]
    if (hash(b * 1.7) > 0.45) ev.push({ t: (b + (hash(b) > 0.5 ? 0.5 : 0)) * BEAT, k: 'bell', midi: c.notes[Math.floor(hash(b * 3.1) * 4)] + 12, gain: 0.18, dur: 2.4 })
  }
  return ev.sort((a, b) => a.t - b.t)
}

const REEL = buildReel()
const IDLE = buildIdle()

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
    this.comp.threshold.value = -14
    this.comp.knee.value = 10
    this.comp.ratio.value = 5
    this.comp.attack.value = 0.003
    this.comp.release.value = 0.2
    this.out = ctx.createGain()
    this.out.gain.value = 0
    this.comp.connect(this.out).connect(ctx.destination)

    const verb = ctx.createConvolver()
    const len = Math.floor(ctx.sampleRate * 2.6)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    verb.buffer = ir
    const verbTone = ctx.createBiquadFilter()
    verbTone.type = 'lowpass'
    verbTone.frequency.value = 5000
    this.verbIn = ctx.createGain()
    this.verbIn.gain.value = 0.5
    this.verbIn.connect(verbTone).connect(verb).connect(this.comp)

    const delay = ctx.createDelay(1)
    delay.delayTime.value = BEAT * 0.75
    const fb = ctx.createGain()
    fb.gain.value = 0.28
    const fbTone = ctx.createBiquadFilter()
    fbTone.type = 'lowpass'
    fbTone.frequency.value = 2800
    this.echoIn = ctx.createGain()
    this.echoIn.gain.value = 0.28
    this.echoIn.connect(delay)
    delay.connect(fbTone).connect(fb).connect(delay)
    fbTone.connect(this.comp)

    // Plucks bypass the score's master fade so the contact string always sounds.
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
    for (const m of [36, 43, 52, 62, 67, 72]) this.karplus(m)
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
    }, 4000)
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
    this.out.gain.linearRampToValueAtTime(0.85, now + 0.4)
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
    const horizon = this.ctx.currentTime - this.origin + 0.15
    while (this.cursor < horizon) {
      const t0 = this.cursor
      const t1 = Math.min(horizon, t0 + 0.5)
      if (t0 < REEL_END) {
        for (const e of REEL) if (e.t >= t0 && e.t < t1) this.fire(e, e.t)
      }
      if (t1 > REEL_END) {
        const a = Math.max(t0, REEL_END) - REEL_END
        const b = t1 - REEL_END
        const n = Math.floor(a / IDLE_LEN)
        for (let l = n; l <= n + 1; l++) {
          for (const e of IDLE) {
            const T = l * IDLE_LEN + e.t
            if (T >= a && T < b) this.fire(e, REEL_END + T)
          }
        }
      }
      this.cursor = t1
    }
  }

  private fire(e: Ev, filmT: number) {
    const when = this.origin + filmT
    if (when < this.ctx.currentTime - 0.02) return
    this.play(e, Math.max(when, this.ctx.currentTime))
  }

  /** The contact section's line: pluck a note from whatever chord is sounding. */
  pluck(x01: number, velocity = 1) {
    if (this.ctx.state !== 'running') void this.ctx.resume()
    const ch = chordAt(this.playing ? this.filmTime() : REEL_END)
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
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), when + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay)
    return g
  }

  private filter(type: BiquadFilterType, freq: number, q = 0.7) {
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    return f
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
    s.stop(when + dur + 0.05)
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

  private play(e: Ev, when: number) {
    const ctx = this.ctx
    const gain = e.gain ?? 1
    switch (e.k) {
      case 'pad': {
        const dur = e.dur ?? BAR
        const f = this.filter('lowpass', (e.cutoff ?? 1000) * 0.7, 0.6)
        f.frequency.linearRampToValueAtTime(e.cutoff ?? 1000, when + dur * 0.6)
        const g = ctx.createGain()
        const peak = 0.04 * gain
        g.gain.setValueAtTime(0.0001, when)
        g.gain.linearRampToValueAtTime(peak, when + 0.4)
        g.gain.setValueAtTime(peak, when + dur - 0.1)
        g.gain.linearRampToValueAtTime(0.0001, when + dur + 1.2)
        for (const m of e.notes ?? []) {
          const o1 = this.osc('triangle', mtof(m), when)
          const o2 = this.osc('sawtooth', mtof(m), when)
          o2.detune.value = 8
          const g2 = ctx.createGain()
          g2.gain.value = 0.3
          o1.connect(f)
          o2.connect(g2).connect(f)
          o1.start(when)
          o2.start(when)
          o1.stop(when + dur + 1.3)
          o2.stop(when + dur + 1.3)
        }
        f.connect(g)
        this.route(g, 0.6)
        break
      }
      case 'bass': {
        const dur = e.dur ?? BEAT * 0.45
        const fr = mtof(e.midi ?? 33)
        const o = this.osc('sawtooth', fr, when)
        const sub = this.osc('sine', fr, when)
        const lp = this.filter('lowpass', 1500, 5)
        lp.frequency.setValueAtTime(1500, when)
        lp.frequency.exponentialRampToValueAtTime(220, when + dur)
        const g = this.env(when, 0.09 * gain, 0.004, dur)
        const gs = this.env(when, 0.16 * gain, 0.004, dur)
        o.connect(lp).connect(g)
        sub.connect(gs)
        for (const x of [o, sub]) {
          x.start(when)
          x.stop(when + dur + 0.1)
        }
        this.route(g)
        this.route(gs)
        break
      }
      case 'kick': {
        const o = this.osc('sine', 165, when)
        o.frequency.exponentialRampToValueAtTime(42, when + 0.1)
        const g = this.env(when, 0.8 * gain, 0.002, 0.33)
        o.connect(g)
        o.start(when)
        o.stop(when + 0.4)
        this.route(g)
        const n = this.noiseSrc(when, 0.01)
        const ng = this.env(when, 0.12 * gain, 0.001, 0.008)
        n.connect(this.filter('highpass', 3000)).connect(ng)
        this.route(ng)
        break
      }
      case 'clap': {
        const bp = this.filter('bandpass', 1500, 0.9)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, when)
        for (const [d, a] of [
          [0, 0.3],
          [0.011, 0.26],
          [0.022, 0.3],
        ] as const) {
          g.gain.setValueAtTime(a * gain, when + d)
          g.gain.exponentialRampToValueAtTime(0.02 * gain, when + d + 0.01)
        }
        g.gain.setValueAtTime(0.22 * gain, when + 0.033)
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22)
        this.noiseSrc(when, 0.25).connect(bp).connect(g)
        this.route(g, 0.35)
        break
      }
      case 'hat': {
        const g = this.env(when, 0.045 * gain, 0.001, 0.045)
        this.noiseSrc(when, 0.06).connect(this.filter('highpass', 8000)).connect(g)
        this.route(g, 0.1)
        break
      }
      case 'perc': {
        const o = this.osc('sine', 920, when)
        o.frequency.exponentialRampToValueAtTime(640, when + 0.05)
        const g = this.env(when, 0.14 * gain, 0.001, 0.08)
        o.connect(g)
        o.start(when)
        o.stop(when + 0.12)
        this.route(g, 0.25, 0.3)
        break
      }
      case 'stab': {
        const lp = this.filter('lowpass', 2600, 1)
        lp.frequency.setValueAtTime(2600, when)
        lp.frequency.exponentialRampToValueAtTime(600, when + 0.4)
        const g = this.env(when, 0.05 * gain, 0.003, 0.5)
        for (const m of e.notes ?? []) {
          for (const det of [-9, 9]) {
            const o = this.osc('sawtooth', mtof(m), when)
            o.detune.value = det
            o.connect(lp)
            o.start(when)
            o.stop(when + 0.6)
          }
        }
        lp.connect(g)
        this.route(g, 0.7, 0.2)
        break
      }
      case 'impact': {
        const o = this.osc('sine', 120, when)
        o.frequency.exponentialRampToValueAtTime(34, when + 0.35)
        const g = this.env(when, 0.9 * gain, 0.002, 0.9)
        o.connect(g)
        o.start(when)
        o.stop(when + 1)
        this.route(g, 0.3)
        const n1 = this.env(when, 0.28 * gain, 0.002, 0.5)
        this.noiseSrc(when, 0.55).connect(this.filter('lowpass', 1400)).connect(n1)
        this.route(n1, 0.7)
        const n2 = this.env(when, 0.18 * gain, 0.001, 0.07)
        this.noiseSrc(when, 0.08).connect(this.filter('highpass', 2500)).connect(n2)
        this.route(n2, 0.5)
        break
      }
      case 'riser': {
        const dur = e.dur ?? BEAT
        const bp = this.filter('bandpass', 300, 2.5)
        bp.frequency.setValueAtTime(300, when)
        bp.frequency.exponentialRampToValueAtTime(7000, when + dur)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, when)
        g.gain.exponentialRampToValueAtTime(0.12 * gain, when + dur)
        g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.05)
        this.noiseSrc(when, dur + 0.1).connect(bp).connect(g)
        this.route(g, 0.5)
        const o = this.osc('sawtooth', 180, when)
        o.frequency.exponentialRampToValueAtTime(900, when + dur)
        const og = ctx.createGain()
        og.gain.setValueAtTime(0.0001, when)
        og.gain.exponentialRampToValueAtTime(0.02 * gain, when + dur)
        og.gain.linearRampToValueAtTime(0.0001, when + dur + 0.05)
        o.connect(this.filter('lowpass', 2500)).connect(og)
        o.start(when)
        o.stop(when + dur + 0.1)
        this.route(og, 0.4)
        break
      }
      case 'drop': {
        const dur = e.dur ?? BEAT * 2
        const o = this.osc('sine', 100, when)
        o.frequency.exponentialRampToValueAtTime(30, when + dur)
        const g = this.env(when, 0.45 * gain, 0.01, dur)
        o.connect(g)
        o.start(when)
        o.stop(when + dur + 0.1)
        this.route(g)
        break
      }
      case 'whoosh': {
        const dur = e.dur ?? 0.3
        const bp = this.filter('bandpass', 500, 1.2)
        bp.frequency.setValueAtTime(500, when)
        bp.frequency.exponentialRampToValueAtTime(4500, when + dur * 0.6)
        bp.frequency.exponentialRampToValueAtTime(900, when + dur)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, when)
        g.gain.linearRampToValueAtTime(0.1 * gain, when + dur * 0.5)
        g.gain.linearRampToValueAtTime(0.0001, when + dur)
        this.noiseSrc(when, dur).connect(bp).connect(g)
        this.route(g, 0.4)
        break
      }
      case 'blip': {
        const o = this.osc('sine', mtof(e.midi ?? 84), when)
        const g = this.env(when, 0.07 * gain, 0.002, 0.12)
        o.connect(g)
        o.start(when)
        o.stop(when + 0.16)
        this.route(g, 0.3, 0.35)
        break
      }
      case 'zap': {
        const o = this.osc('square', 1900, when)
        o.frequency.exponentialRampToValueAtTime(190, when + 0.12)
        const g = this.env(when, 0.025 * gain, 0.002, 0.13)
        o.connect(this.filter('lowpass', 3200)).connect(g)
        o.start(when)
        o.stop(when + 0.16)
        this.route(g, 0.2, 0.25)
        break
      }
      case 'crunch': {
        const g = this.env(when, 0.1 * gain, 0.001, 0.06)
        this.noiseSrc(when, 0.08).connect(this.filter('lowpass', 3500)).connect(g)
        this.route(g, 0.15)
        const o = this.osc('sine', 190, when)
        o.frequency.exponentialRampToValueAtTime(60, when + 0.08)
        const og = this.env(when, 0.14 * gain, 0.001, 0.09)
        o.connect(og)
        o.start(when)
        o.stop(when + 0.12)
        this.route(og)
        break
      }
      case 'crackle': {
        for (let i = 0; i < 14; i++) {
          const w = when + hash(i * 3.7) * 0.32
          const g = this.env(w, (0.08 + hash(i) * 0.08) * gain, 0.001, 0.015 + hash(i * 2) * 0.03)
          this.noiseSrc(w, 0.05).connect(this.filter('highpass', 1800 + hash(i * 5) * 3000)).connect(g)
          this.route(g, 0.3)
        }
        break
      }
      case 'bell': {
        const fr = mtof(e.midi ?? 84)
        const dur = e.dur ?? 1.4
        const car = this.osc('sine', fr, when)
        const mod = this.osc('sine', fr * 3.5, when)
        const mg = ctx.createGain()
        mg.gain.setValueAtTime(fr * 1.1, when)
        mg.gain.exponentialRampToValueAtTime(fr * 0.01, when + 0.6)
        mod.connect(mg).connect(car.frequency)
        const g = this.env(when, 0.07 * gain, 0.003, dur)
        car.connect(g)
        car.start(when)
        mod.start(when)
        car.stop(when + dur + 0.1)
        mod.stop(when + dur + 0.1)
        this.route(g, 0.7, 0.4)
        break
      }
      case 'arp': {
        const fr = mtof(e.midi ?? 72)
        const o = this.osc('triangle', fr, when)
        const o2 = this.osc('square', fr, when)
        const g2 = ctx.createGain()
        g2.gain.value = 0.12
        const lp = this.filter('lowpass', 2600)
        const g = this.env(when, 0.055 * gain, 0.003, 0.2)
        o.connect(lp)
        o2.connect(g2).connect(lp)
        lp.connect(g)
        for (const x of [o, o2]) {
          x.start(when)
          x.stop(when + 0.3)
        }
        this.route(g, 0.25, 0.35)
        break
      }
      case 'growl': {
        const lp = this.filter('lowpass', 400, 6)
        const lfo = this.osc('sine', 6, when)
        const lg = ctx.createGain()
        lg.gain.value = 500
        lfo.connect(lg).connect(lp.frequency)
        const g = this.env(when, 0.14 * gain, 0.05, 1.4)
        for (const f of [55, 55.8, 82.4]) {
          const o = this.osc('sawtooth', f, when)
          o.connect(lp)
          o.start(when)
          o.stop(when + 1.6)
        }
        lfo.start(when)
        lfo.stop(when + 1.6)
        lp.connect(g)
        this.route(g, 0.4)
        break
      }
      case 'shimmer': {
        const notes = [88, 91, 95, 98, 100, 103]
        notes.forEach((m, i) => {
          const o = this.osc('sine', mtof(m), when + i * 0.03)
          const g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, when)
          g.gain.linearRampToValueAtTime(0.018 * gain, when + 0.3)
          g.gain.exponentialRampToValueAtTime(0.0001, when + 2.2)
          o.connect(g)
          o.start(when + i * 0.03)
          o.stop(when + 2.4)
          this.route(g, 0.9, 0.3)
        })
        break
      }
      case 'crash': {
        const g = this.env(when, 0.12 * gain, 0.002, 1.6)
        this.noiseSrc(when, 1.7).connect(this.filter('highpass', 3200)).connect(g)
        this.route(g, 0.6)
        break
      }
      case 'strum': {
        ;(e.notes ?? []).forEach((m, i) => {
          const src = ctx.createBufferSource()
          src.buffer = this.karplus(m)
          const g = ctx.createGain()
          g.gain.value = 0.2
          src.connect(g)
          this.route(g, 0.5, 0.2)
          src.start(when + i * 0.025)
        })
        break
      }
      case 'portal': {
        const o = this.osc('sine', 70, when)
        o.frequency.exponentialRampToValueAtTime(240, when + 0.4)
        const g = this.env(when, 0.18 * gain, 0.05, 0.45)
        o.connect(g)
        o.start(when)
        o.stop(when + 0.55)
        this.route(g, 0.5)
        break
      }
    }
  }
}
