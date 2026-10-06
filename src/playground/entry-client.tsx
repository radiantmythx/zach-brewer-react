import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '../index.css'
import './playground.css'
import PlaygroundApp from './PlaygroundApp'
import Solo from './Solo'

const root = document.getElementById('root')!
const params = new URLSearchParams(window.location.search)

if (params.has('solo')) {
  // The solo/test route renders one piece full-bleed (see Solo.tsx).
  root.innerHTML = ''
  document.documentElement.classList.add('pg-solo-root')
  createRoot(root).render(<Solo params={params} />)
} else {
  const app = (
    <StrictMode>
      <PlaygroundApp />
    </StrictMode>
  )
  // Production HTML is pre-rendered; the dev server serves the empty template.
  if (root.firstElementChild) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
