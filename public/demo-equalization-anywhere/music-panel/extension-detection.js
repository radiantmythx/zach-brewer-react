const PING = { source: "portfolio-site", type: "EQA_PING", version: 1 };
const PAGE_ORIGIN = window.location.origin;

export function detectExtension({ timeoutMs = 900 } = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve({ installed: false, capabilities: null });
    }, timeoutMs);

    const onMessage = (event) => {
      if (event.source !== window) return;
      if (event.origin !== PAGE_ORIGIN) return;

      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.source !== "eq-extension") return;
      if (msg.type !== "EQA_PONG") return;

      clearTimeout(timer);
      cleanup();
      resolve({ installed: true, capabilities: msg.capabilities ?? null });
    };

    function cleanup() {
      window.removeEventListener("message", onMessage);
    }

    window.addEventListener("message", onMessage, { passive: true });
    window.postMessage(PING, PAGE_ORIGIN);
  });
}
