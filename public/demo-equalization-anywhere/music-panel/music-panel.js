import { AudioEngine } from "./audio-engine.js";
import { detectExtension } from "./extension-detection.js";

const FX_PRESETS = {
  subtle: {
    reverb: { enabled: true, roomSize: 0.35, amount: 0.2 },
    delay: { enabled: false, time: 0.22, volume: 0.18 },
    chorus: { enabled: true, intensity: 0.2 },
    phaser: { enabled: false, intensity: 0.2 }
  },
  ambient: {
    reverb: { enabled: true, roomSize: 0.75, amount: 0.55 },
    delay: { enabled: true, time: 0.4, volume: 0.28 },
    chorus: { enabled: true, intensity: 0.35 },
    phaser: { enabled: false, intensity: 0.2 }
  },
  retro: {
    reverb: { enabled: false, roomSize: 0.3, amount: 0.2 },
    delay: { enabled: true, time: 0.18, volume: 0.22 },
    chorus: { enabled: true, intensity: 0.58 },
    phaser: { enabled: true, intensity: 0.48 }
  },
  wide: {
    reverb: { enabled: true, roomSize: 0.62, amount: 0.4 },
    delay: { enabled: false, time: 0.24, volume: 0.2 },
    chorus: { enabled: true, intensity: 0.62 },
    phaser: { enabled: true, intensity: 0.25 }
  }
};

export async function mountMusicPanel(container, dspConfig) {
  container.innerHTML = buildMarkup(dspConfig.eqBandsHz);

  const audioEl = container.querySelector("#player");
  const fileInput = container.querySelector("#file-input");
  const dropzone = container.querySelector("#dropzone");
  const status = container.querySelector("#mode-status");
  const bands = [...container.querySelectorAll("[data-band]")];
  const bypass = container.querySelector("#bypass");
  const resetEq = container.querySelector("#reset-eq");
  const eqPreset = container.querySelector("#preset");
  const resetFx = container.querySelector("#reset-fx");

  const engine = new AudioEngine(dspConfig);
  await engine.mountAudioElement(audioEl);

  bands.forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.band);
      const gain = Number(e.target.value);
      engine.setEqBand(idx, gain);
      const readout = container.querySelector(`#gain-${idx}`);
      readout.textContent = `${gain.toFixed(1)} dB`;
    });
  });

  bypass.addEventListener("change", () => {
    engine.setBypass(bypass.checked);
  });

  resetEq.addEventListener("click", () => {
    bands.forEach((input, idx) => {
      input.value = "0";
      container.querySelector(`#gain-${idx}`).textContent = "0.0 dB";
    });
    bypass.checked = false;
    engine.setBypass(false);
    engine.resetEq();
  });

  eqPreset.addEventListener("change", () => {
    const presets = {
      flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bass: [5, 4, 3, 2, 1, 0, -1, -1, -2, -2],
      vocal: [-2, -1, 0, 1, 2, 3, 2, 1, 0, -1],
      sparkle: [-2, -2, -1, 0, 0, 1, 2, 3, 4, 5]
    };

    const selected = presets[eqPreset.value] ?? presets.flat;
    selected.forEach((g, idx) => {
      bands[idx].value = String(g);
      container.querySelector(`#gain-${idx}`).textContent = `${g.toFixed(1)} dB`;
      engine.setEqBand(idx, g);
    });
  });

  wireEffectsUi(container, engine);

  resetFx.addEventListener("click", () => {
    engine.resetEffects();
    syncEffectsUi(container, engine.getEffects());
  });

  wireFileLoading(fileInput, dropzone, audioEl, engine);

  const result = await detectExtension();
  status.textContent = result.installed
    ? extensionDetectedText(result.capabilities)
    : "Demo mode active. Install the extension to EQ any current tab.";

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;

    const msg = event.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.source !== "eq-extension" || msg.type !== "EQA_STATE_CHANGED") return;

    const modeLabel = msg.mode === "page-media" ? "Page Media" : "Capture";
    status.textContent = msg.enabled
      ? `Extension active (${modeLabel} Mode). You can use the in-tab microphone control.`
      : "Extension detected but currently disabled. Press shortcut to enable.";
  });
}

function wireEffectsUi(container, engine) {
  const mapping = [
    ["#fx-reverb-enabled", "reverb", "enabled", "checkbox"],
    ["#fx-reverb-room", "reverb", "roomSize", "range"],
    ["#fx-reverb-amount", "reverb", "amount", "range"],
    ["#fx-delay-enabled", "delay", "enabled", "checkbox"],
    ["#fx-delay-time", "delay", "time", "range"],
    ["#fx-delay-volume", "delay", "volume", "range"],
    ["#fx-chorus-enabled", "chorus", "enabled", "checkbox"],
    ["#fx-chorus-intensity", "chorus", "intensity", "range"],
    ["#fx-phaser-enabled", "phaser", "enabled", "checkbox"],
    ["#fx-phaser-intensity", "phaser", "intensity", "range"]
  ];

  syncEffectsUi(container, engine.getEffects());

  mapping.forEach(([selector, effectKey, prop, type]) => {
    const input = container.querySelector(selector);
    input.addEventListener("input", () => {
      const current = engine.getEffects();
      current[effectKey][prop] = type === "checkbox" ? input.checked : Number(input.value);
      engine.setEffects(current);
      syncEffectsUi(container, engine.getEffects());
    });
  });

  container.querySelectorAll("[data-fx-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = FX_PRESETS[btn.dataset.fxPreset];
      if (!preset) return;
      engine.setEffects(preset);
      syncEffectsUi(container, engine.getEffects());
    });
  });

  container.querySelector("#toggle-eq").addEventListener("click", () => {
    container.querySelector("#eq-section").classList.toggle("open");
  });

  container.querySelector("#toggle-fx").addEventListener("click", () => {
    container.querySelector("#fx-section").classList.toggle("open");
  });
}

function syncEffectsUi(container, fx) {
  container.querySelector("#fx-reverb-enabled").checked = fx.reverb.enabled;
  container.querySelector("#fx-reverb-room").value = String(fx.reverb.roomSize);
  container.querySelector("#fx-reverb-amount").value = String(fx.reverb.amount);

  container.querySelector("#fx-delay-enabled").checked = fx.delay.enabled;
  container.querySelector("#fx-delay-time").value = String(fx.delay.time);
  container.querySelector("#fx-delay-volume").value = String(fx.delay.volume);

  container.querySelector("#fx-chorus-enabled").checked = fx.chorus.enabled;
  container.querySelector("#fx-chorus-intensity").value = String(fx.chorus.intensity);

  container.querySelector("#fx-phaser-enabled").checked = fx.phaser.enabled;
  container.querySelector("#fx-phaser-intensity").value = String(fx.phaser.intensity);

  container.querySelector("#fx-reverb-room-val").textContent = pct(fx.reverb.roomSize);
  container.querySelector("#fx-reverb-amount-val").textContent = pct(fx.reverb.amount);
  container.querySelector("#fx-delay-time-val").textContent = `${fx.delay.time.toFixed(2)}s`;
  container.querySelector("#fx-delay-volume-val").textContent = pct(fx.delay.volume);
  container.querySelector("#fx-chorus-intensity-val").textContent = pct(fx.chorus.intensity);
  container.querySelector("#fx-phaser-intensity-val").textContent = pct(fx.phaser.intensity);
}

function extensionDetectedText(capabilities) {
  const modes = capabilities?.modes?.includes("page-media") ? "Capture + Page Media" : "Capture";
  return `Extension detected (${modes}). Press shortcut to enable in-tab controls.`;
}

function wireFileLoading(fileInput, dropzone, audioEl, engine) {
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    await loadFile(file, audioEl, engine);
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("active");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove("active"));
  });

  dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    await loadFile(file, audioEl, engine);
  });
}

async function loadFile(file, audioEl, engine) {
  if (!file) return;
  const lower = file.name.toLowerCase();
  if (!(lower.endsWith(".mp3") || lower.endsWith(".wav"))) {
    alert("Please drop an MP3 or WAV file.");
    return;
  }

  const url = URL.createObjectURL(file);
  audioEl.src = url;
  audioEl.load();
  await engine.mountAudioElement(audioEl);
  await engine.resume();
}

function buildMarkup(eqBands) {
  const bandMarkup = eqBands
    .map(
      (hz, idx) => `
      <div class="band">
        <small>${formatHz(hz)}</small>
        <input
          type="range"
          min="-12"
          max="12"
          step="0.5"
          value="0"
          data-band="${idx}"
          aria-label="${hz} Hz EQ"
        />
        <small id="gain-${idx}">0.0 dB</small>
      </div>`
    )
    .join("");

  return `
    <div id="mode-status" class="status">Checking extension status...</div>

    <div class="controls">
      <div id="dropzone" class="dropzone">
        <p>Drop an MP3/WAV file here to test.</p>
        <p class="muted">or</p>
        <input id="file-input" type="file" accept="audio/mp3,audio/mpeg,audio/wav,.mp3,.wav" />
      </div>

      <audio id="player" controls preload="metadata"></audio>

      <div class="row">
        <label for="preset">Preset</label>
        <select id="preset">
          <option value="flat">Flat</option>
          <option value="bass">Bass Lift</option>
          <option value="vocal">Vocal Forward</option>
          <option value="sparkle">Top-End Sparkle</option>
        </select>

        <label>
          <input id="bypass" type="checkbox" /> Bypass
        </label>

        <button id="reset-eq" class="primary" type="button">Reset EQ</button>
      </div>
    </div>

    <button class="accordion-btn" id="toggle-eq">EQ</button>
    <section class="section open" id="eq-section">
      <div class="eq-grid">${bandMarkup}</div>
    </section>

    <button class="accordion-btn" id="toggle-fx">Effects</button>
    <section class="section" id="fx-section">
      <div class="fx-presets">
        <button class="pill" data-fx-preset="subtle">Subtle</button>
        <button class="pill" data-fx-preset="ambient">Ambient</button>
        <button class="pill" data-fx-preset="retro">Retro</button>
        <button class="pill" data-fx-preset="wide">Wide</button>
      </div>

      <div class="fx-grid">
        <div class="fx-card">
          <div class="fx-head">
            <span>Reverb</span>
            <label><input type="checkbox" id="fx-reverb-enabled" /> On</label>
          </div>
          <div class="fx-control">
            <span>Room</span>
            <input type="range" min="0" max="1" step="0.01" id="fx-reverb-room" />
            <span id="fx-reverb-room-val"></span>
          </div>
          <div class="fx-control">
            <span>Amount</span>
            <input type="range" min="0" max="1" step="0.01" id="fx-reverb-amount" />
            <span id="fx-reverb-amount-val"></span>
          </div>
        </div>

        <div class="fx-card">
          <div class="fx-head">
            <span>Delay</span>
            <label><input type="checkbox" id="fx-delay-enabled" /> On</label>
          </div>
          <div class="fx-control">
            <span>Time</span>
            <input type="range" min="0.05" max="1" step="0.01" id="fx-delay-time" />
            <span id="fx-delay-time-val"></span>
          </div>
          <div class="fx-control">
            <span>Volume</span>
            <input type="range" min="0" max="1" step="0.01" id="fx-delay-volume" />
            <span id="fx-delay-volume-val"></span>
          </div>
        </div>

        <div class="fx-card">
          <div class="fx-head">
            <span>Chorus</span>
            <label><input type="checkbox" id="fx-chorus-enabled" /> On</label>
          </div>
          <div class="fx-control">
            <span>Intensity</span>
            <input type="range" min="0" max="1" step="0.01" id="fx-chorus-intensity" />
            <span id="fx-chorus-intensity-val"></span>
          </div>
        </div>

        <div class="fx-card">
          <div class="fx-head">
            <span>Phaser</span>
            <label><input type="checkbox" id="fx-phaser-enabled" /> On</label>
          </div>
          <div class="fx-control">
            <span>Intensity</span>
            <input type="range" min="0" max="1" step="0.01" id="fx-phaser-intensity" />
            <span id="fx-phaser-intensity-val"></span>
          </div>
        </div>
      </div>

      <div class="row">
        <button id="reset-fx" class="primary" type="button">Reset FX</button>
      </div>
    </section>
  `;
}

function pct(v) {
  return `${Math.round(Math.max(0, Math.min(1, Number(v))) * 100)}%`;
}

function formatHz(v) {
  return v >= 1000 ? `${v / 1000}k` : String(v);
}
