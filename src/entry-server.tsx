import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'
import PlaygroundApp from './playground/PlaygroundApp.tsx'

// Rendered at build time by scripts/prerender.mjs to produce static HTML
// for crawlers and a faster first paint. The client then hydrates this markup.
export function render(url = '/') {
  const page = url.startsWith('/playground') ? <PlaygroundApp /> : <App />
  const html = renderToString(<StrictMode>{page}</StrictMode>)
  return { html }
}
