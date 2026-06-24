import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

// Rendered at build time by scripts/prerender.mjs to produce static HTML
// for crawlers and a faster first paint. The client then hydrates this markup.
export function render() {
  const html = renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return { html }
}
