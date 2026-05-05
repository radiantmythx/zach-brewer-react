const DEFAULT_EFFECTS = {
  reverb: { enabled: false, roomSize: 0.45, amount: 0.3 },
  delay: { enabled: false, time: 0.25, volume: 0.25 },
  chorus: { enabled: false, intensity: 0.35 },
  phaser: { enabled: false, intensity: 0.35 }
};

export class AudioEngine {
  constructor(dspConfig) {
    this.config = dspConfig;
    this.ctx = null;
    this.source = null;
    this.preamp = null;
    this.filters = [];
    this.dryGain = null;
    this.master = null;
    this.branches = null;
    this.currentEl = null;
    this.bypass = false;
    this.effects = cloneEffects(DEFAULT_EFFECTS);
  }

  async mountAudioElement(el) {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    if (this.currentEl === el) {
      return;
    }

    this._cleanupSourceOnly();
    this.currentEl = el;

    this.source = this.ctx.createMediaElementSource(el);
    this.preamp = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();
    this.master = this.ctx.createGain();

    const bands = this.config.eqBandsHz;
    this.filters = bands.map((freq) => {
      const f = this.ctx.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = freq;
      f.Q.value = 1.0;
      f.gain.value = 0;
      return f;
    });

    this.branches = {
      reverb: createReverbBranch(this.ctx),
      delay: createDelayBranch(this.ctx),
      chorus: createChorusBranch(this.ctx),
      phaser: createPhaserBranch(this.ctx)
    };

    this._wireGraph();
    this._applyEffectsToGraph();

    el.addEventListener("play", () => this.resume(), { passive: true });
    el.addEventListener(
      "pause",
      () => {
        if (!el.ended) {
          this.suspend();
        }
      },
      { passive: true }
    );
  }

  _cleanupSourceOnly() {
    try {
      this.source?.disconnect();
      this.preamp?.disconnect();
      this.dryGain?.disconnect();
      this.master?.disconnect();
      this.filters.forEach((f) => f.disconnect());
      if (this.branches) {
        Object.values(this.branches).forEach((branch) => {
          branch.input?.disconnect();
          branch.output?.disconnect();
          branch.wet?.disconnect();
          branch.delay?.disconnect();
          branch.feedback?.disconnect();
          branch.convolver?.disconnect();
          branch.baseDelay?.disconnect();
          branch.ap1?.disconnect();
          branch.ap2?.disconnect();
          branch.ap3?.disconnect();
          branch.lfo?.stop();
        });
      }
    } catch (_) {}

    this.source = null;
    this.preamp = null;
    this.dryGain = null;
    this.master = null;
    this.filters = [];
    this.branches = null;
  }

  _disconnectGraph() {
    try {
      this.source?.disconnect();
      this.preamp?.disconnect();
      this.dryGain?.disconnect();
      this.master?.disconnect();
      this.filters.forEach((f) => f.disconnect());
      if (this.branches) {
        Object.values(this.branches).forEach((branch) => {
          branch.input?.disconnect();
          branch.output?.disconnect();
          branch.wet?.disconnect();
          branch.delay?.disconnect();
          branch.feedback?.disconnect();
          branch.convolver?.disconnect();
          branch.baseDelay?.disconnect();
          branch.ap1?.disconnect();
          branch.ap2?.disconnect();
          branch.ap3?.disconnect();
        });
      }
    } catch (_) {}
  }

  _wireGraph() {
    const now = this.ctx.currentTime;
    const defaults = this.config.defaults;
    const preampLinear = dbToLinear(defaults.preampDb ?? -3);

    this.preamp.gain.setValueAtTime(preampLinear, now);
    this.dryGain.gain.setValueAtTime(1, now);
    this.master.gain.setValueAtTime(0.9, now);

    this.source.connect(this.preamp);

    let cursor = this.preamp;
    for (const filter of this.filters) {
      cursor.connect(filter);
      cursor = filter;
    }

    const eqOut = cursor;

    eqOut.connect(this.dryGain);
    this.dryGain.connect(this.master);

    eqOut.connect(this.branches.reverb.input);
    eqOut.connect(this.branches.delay.input);
    eqOut.connect(this.branches.chorus.input);
    eqOut.connect(this.branches.phaser.input);

    this.branches.reverb.output.connect(this.master);
    this.branches.delay.output.connect(this.master);
    this.branches.chorus.output.connect(this.master);
    this.branches.phaser.output.connect(this.master);

    this.master.connect(this.ctx.destination);
  }

  _applyEffectsToGraph() {
    applyReverb(this.ctx, this.branches.reverb, this.effects.reverb);
    applyDelay(this.ctx, this.branches.delay, this.effects.delay);
    applyChorus(this.ctx, this.branches.chorus, this.effects.chorus);
    applyPhaser(this.ctx, this.branches.phaser, this.effects.phaser);
  }

  setEqBand(index, gainDb) {
    if (!this.ctx || !this.filters[index]) return;
    const range = this.config.ranges.eqGainDb;
    const safe = clamp(gainDb, range.min, range.max);
    const t = this.ctx.currentTime;
    this.filters[index].gain.cancelScheduledValues(t);
    this.filters[index].gain.linearRampToValueAtTime(safe, t + 0.025);
  }

  setBypass(enabled) {
    this.bypass = Boolean(enabled);
    if (!this.ctx || !this.source) return;

    this._disconnectGraph();

    if (this.bypass) {
      this.source.connect(this.ctx.destination);
      return;
    }

    this._wireGraph();
    this._applyEffectsToGraph();
  }

  setEffects(nextEffects) {
    this.effects = normalizeEffects(nextEffects, this.effects);
    if (!this.ctx || this.bypass || !this.branches) {
      return;
    }
    this._applyEffectsToGraph();
  }

  getEffects() {
    return cloneEffects(this.effects);
  }

  resetEq() {
    const gains = this.config.defaults.eqGainsDb;
    gains.forEach((g, idx) => this.setEqBand(idx, g));
  }

  resetEffects() {
    this.effects = cloneEffects(DEFAULT_EFFECTS);
    this._applyEffectsToGraph();
  }

  async resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  async suspend() {
    if (this.ctx && this.ctx.state === "running") {
      await this.ctx.suspend();
    }
  }
}

function createReverbBranch(ctx) {
  const input = ctx.createGain();
  const convolver = ctx.createConvolver();
  const wet = ctx.createGain();
  wet.gain.value = 0;

  input.connect(convolver);
  convolver.connect(wet);

  return { input, convolver, wet, output: wet };
}

function createDelayBranch(ctx) {
  const input = ctx.createGain();
  const delay = ctx.createDelay(1.5);
  const feedback = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0;
  feedback.gain.value = 0;

  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);

  return { input, delay, feedback, wet, output: wet };
}

function createChorusBranch(ctx) {
  const input = ctx.createGain();
  const baseDelay = ctx.createDelay(0.05);
  const wet = ctx.createGain();
  wet.gain.value = 0;

  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 0.35;
  depth.gain.value = 0;
  lfo.connect(depth);
  depth.connect(baseDelay.delayTime);
  lfo.start();

  input.connect(baseDelay);
  baseDelay.connect(wet);

  return { input, baseDelay, wet, lfo, depth, output: wet };
}

function createPhaserBranch(ctx) {
  const input = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0;

  const ap1 = ctx.createBiquadFilter();
  const ap2 = ctx.createBiquadFilter();
  const ap3 = ctx.createBiquadFilter();
  [ap1, ap2, ap3].forEach((ap) => {
    ap.type = "allpass";
    ap.frequency.value = 550;
    ap.Q.value = 0.7;
  });

  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 0.28;
  depth.gain.value = 0;
  lfo.connect(depth);
  depth.connect(ap1.frequency);
  depth.connect(ap2.frequency);
  depth.connect(ap3.frequency);
  lfo.start();

  input.connect(ap1);
  ap1.connect(ap2);
  ap2.connect(ap3);
  ap3.connect(wet);

  return { input, wet, ap1, ap2, ap3, lfo, depth, output: wet };
}

function applyReverb(ctx, branch, cfg) {
  branch.convolver.buffer = createImpulseResponse(ctx, 0.8 + cfg.roomSize * 2.2, 1.8 + cfg.roomSize * 2.8);

  const t = ctx.currentTime;
  const target = cfg.enabled ? clamp(cfg.amount, 0, 1) * 0.7 : 0;
  branch.wet.gain.cancelScheduledValues(t);
  branch.wet.gain.linearRampToValueAtTime(target, t + 0.05);
}

function applyDelay(ctx, branch, cfg) {
  const t = ctx.currentTime;

  branch.delay.delayTime.cancelScheduledValues(t);
  branch.delay.delayTime.linearRampToValueAtTime(clamp(cfg.time, 0.05, 1), t + 0.03);

  branch.feedback.gain.cancelScheduledValues(t);
  branch.feedback.gain.linearRampToValueAtTime(cfg.enabled ? 0.32 : 0, t + 0.03);

  branch.wet.gain.cancelScheduledValues(t);
  branch.wet.gain.linearRampToValueAtTime(cfg.enabled ? clamp(cfg.volume, 0, 1) * 0.6 : 0, t + 0.03);
}

function applyChorus(ctx, branch, cfg) {
  const intensity = cfg.enabled ? clamp(cfg.intensity, 0, 1) : 0;
  const t = ctx.currentTime;

  branch.baseDelay.delayTime.cancelScheduledValues(t);
  branch.baseDelay.delayTime.linearRampToValueAtTime(0.02 + intensity * 0.015, t + 0.03);

  branch.depth.gain.cancelScheduledValues(t);
  branch.depth.gain.linearRampToValueAtTime(intensity * 0.008, t + 0.03);

  branch.wet.gain.cancelScheduledValues(t);
  branch.wet.gain.linearRampToValueAtTime(intensity * 0.5, t + 0.03);
}

function applyPhaser(ctx, branch, cfg) {
  const intensity = cfg.enabled ? clamp(cfg.intensity, 0, 1) : 0;
  const t = ctx.currentTime;

  branch.depth.gain.cancelScheduledValues(t);
  branch.depth.gain.linearRampToValueAtTime(intensity * 900, t + 0.03);

  branch.wet.gain.cancelScheduledValues(t);
  branch.wet.gain.linearRampToValueAtTime(intensity * 0.45, t + 0.03);
}

function createImpulseResponse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const impulse = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch += 1) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      const n = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(n, decay);
    }
  }

  return impulse;
}

function normalizeEffects(raw, fallback = DEFAULT_EFFECTS) {
  return {
    reverb: {
      enabled: Boolean(raw?.reverb?.enabled),
      roomSize: clamp(raw?.reverb?.roomSize ?? fallback.reverb.roomSize, 0, 1),
      amount: clamp(raw?.reverb?.amount ?? fallback.reverb.amount, 0, 1)
    },
    delay: {
      enabled: Boolean(raw?.delay?.enabled),
      time: clamp(raw?.delay?.time ?? fallback.delay.time, 0.05, 1),
      volume: clamp(raw?.delay?.volume ?? fallback.delay.volume, 0, 1)
    },
    chorus: {
      enabled: Boolean(raw?.chorus?.enabled),
      intensity: clamp(raw?.chorus?.intensity ?? fallback.chorus.intensity, 0, 1)
    },
    phaser: {
      enabled: Boolean(raw?.phaser?.enabled),
      intensity: clamp(raw?.phaser?.intensity ?? fallback.phaser.intensity, 0, 1)
    }
  };
}

function cloneEffects(effects) {
  return {
    reverb: { ...effects.reverb },
    delay: { ...effects.delay },
    chorus: { ...effects.chorus },
    phaser: { ...effects.phaser }
  };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Number(val)));
}

function dbToLinear(db) {
  return Math.pow(10, db / 20);
}
