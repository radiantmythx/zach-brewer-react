/*
 * Playground sound: one lazily created AudioContext, a soft master bus
 * (gain → gentle compressor → a little feedback-delay "room"), and a few
 * voices. Everything is a no-op until the viewer turns sound on, which only
 * happens from a user gesture, so autoplay rules are satisfied.
 */

export interface ToneOpts {
  type?: OscillatorType
  /** peak gain, 0–1 (default 0.18) */
  gain?: number
  /** seconds (default 0.004) */
  attack?: number
  /** glide to this frequency over the note's duration */
  to?: number
  /** start offset from now, seconds */
  when?: number
  /** low-pass cutoff in Hz (default none) */
  filter?: number
  /** stereo position, -1..1 */
  pan?: number
  /** 0–1 send to the room (default 0.15) */
  room?: number
}

export interface NoiseOpts {
  gain?: number
  /** band-pass centre, Hz (default 1200) */
  filter?: number
  q?: number
  /** sweep the filter to this frequency */
  to?: number
  when?: number
  pan?: number
  room?: number
}

export interface Sfx {
  readonly enabled: boolean
  /** A single enveloped oscillator note. */
  tone(freq: number, dur: number, opts?: ToneOpts): void
  /** A filtered noise burst (hits, thrust, wind, explosions). */
  noise(dur: number, opts?: NoiseOpts): void
  /** The raw context and the bus input, for pieces that build their own graph. Null while disabled. */
  context(): AudioContext | null
  output(): AudioNode | null
  /** AudioContext time, or 0 while disabled. */
  now(): number
}

class Engine implements Sfx {
  private ctx: AudioContext | null = null
  private bus: GainNode | null = null
  private room: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private on = false

  get enabled() {
    return this.on && !!this.ctx
  }

  setEnabled(next: boolean) {
    this.on = next
    if (next) this.ensure()
    if (!this.ctx || !this.bus) return
    const t = this.ctx.currentTime
    this.bus.gain.cancelScheduledValues(t)
    this.bus.gain.setTargetAtTime(next ? 0.9 : 0, t, 0.05)
    if (next && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private ensure() {
    if (this.ctx || typeof window === 'undefined') return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const bus = ctx.createGain()
    bus.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 18
    comp.ratio.value = 3
    comp.attack.value = 0.004
    comp.release.value = 0.2
    // a small, dark room: two cross-fed delays through a low-pass
    const room = ctx.createGain()
    room.gain.value = 1
    const dl = ctx.createDelay(1)
    const dr = ctx.createDelay(1)
    dl.delayTime.value = 0.137
    dr.delayTime.value = 0.211
    const fb = ctx.createGain()
    fb.gain.value = 0.32
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    const wet = ctx.createGain()
    wet.gain.value = 0.5
    room.connect(dl)
    room.connect(dr)
    dl.connect(lp)
    dr.connect(lp)
    lp.connect(fb)
    fb.connect(dl)
    fb.connect(dr)
    lp.connect(wet)
    wet.connect(bus)
    bus.connect(comp)
    comp.connect(ctx.destination)
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.ctx = ctx
    this.bus = bus
    this.room = room
    this.noiseBuf = buf
  }

  private route(node: AudioNode, pan = 0, roomSend = 0.15) {
    const ctx = this.ctx!
    let out: AudioNode = node
    if (pan) {
      const p = ctx.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, pan))
      node.connect(p)
      out = p
    }
    out.connect(this.bus!)
    if (roomSend > 0) {
      const s = ctx.createGain()
      s.gain.value = roomSend
      out.connect(s)
      s.connect(this.room!)
    }
  }

  tone(freq: number, dur: number, o: ToneOpts = {}) {
    if (!this.enabled || !(freq > 0) || !(dur > 0)) return
    const ctx = this.ctx!
    const t0 = ctx.currentTime + (o.when ?? 0)
    const peak = Math.min(1, o.gain ?? 0.18)
    const atk = Math.max(0.001, o.attack ?? 0.004)
    const osc = ctx.createOscillator()
    osc.type = o.type ?? 'triangle'
    osc.frequency.setValueAtTime(freq, t0)
    if (o.to && o.to > 0) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(peak, t0 + atk)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(atk + 0.01, dur))
    let head: AudioNode = g
    if (o.filter) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = o.filter
      g.connect(f)
      head = f
    }
    osc.connect(g)
    this.route(head, o.pan, o.room ?? 0.15)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  noise(dur: number, o: NoiseOpts = {}) {
    if (!this.enabled || !(dur > 0) || !this.noiseBuf) return
    const ctx = this.ctx!
    const t0 = ctx.currentTime + (o.when ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = o.q ?? 0.8
    f.frequency.setValueAtTime(o.filter ?? 1200, t0)
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur)
    const g = ctx.createGain()
    const peak = Math.min(1, o.gain ?? 0.2)
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(peak, t0 + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(f)
    f.connect(g)
    this.route(g, o.pan, o.room ?? 0.15)
    src.start(t0, Math.random())
    src.stop(t0 + dur + 0.05)
  }

  context() {
    return this.enabled ? this.ctx : null
  }

  output() {
    return this.enabled ? this.bus : null
  }

  now() {
    return this.enabled ? this.ctx!.currentTime : 0
  }
}

/** The shared engine. The viewer toggles it; pieces only see the Sfx interface. */
export const sfxEngine = new Engine()

/** Handed to pieces in preview mode: always silent. */
export const silentSfx: Sfx = {
  enabled: false,
  tone() {},
  noise() {},
  context: () => null,
  output: () => null,
  now: () => 0,
}

const KEY = 'pg:sound'
let soundOn = false
try {
  soundOn = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1'
} catch {
  /* storage blocked */
}
const listeners = new Set<() => void>()

export const getSound = () => soundOn
export function setSound(next: boolean) {
  soundOn = next
  sfxEngine.setEnabled(next)
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* storage blocked */
  }
  listeners.forEach((fn) => fn())
}
export function subscribeSound(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
