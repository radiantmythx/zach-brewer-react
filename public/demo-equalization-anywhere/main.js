import { mountMusicPanel } from "./music-panel/music-panel.js";

async function boot() {
  const panel = document.querySelector("#music-panel");
  const cfgResp = await fetch("../shared/dsp-config.json");
  const dspConfig = await cfgResp.json();
  await mountMusicPanel(panel, dspConfig);
}

boot().catch((err) => {
  console.error("Failed to boot music panel", err);
  const panel = document.querySelector("#music-panel");
  panel.innerHTML = `<p>Could not start panel: ${String(err?.message || err)}</p>`;
});
