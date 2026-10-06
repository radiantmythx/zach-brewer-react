// Injects server-rendered HTML into the built pages so crawlers and social
// scrapers receive fully-populated markup, and the browser hydrates it.
//
// Run order (see package.json "build"):
//   1. vite build                -> dist/ (client assets + HTML templates)
//   2. vite build --ssr ...       -> dist/server/entry-server.js
//   3. node scripts/prerender.mjs -> reads each template, renders, writes final HTML
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const serverEntry = path.join(root, 'dist', 'server', 'entry-server.js')

const PAGES = [
  { url: '/', file: path.join(root, 'dist', 'index.html') },
  { url: '/playground/', file: path.join(root, 'dist', 'playground', 'index.html') },
]

const { render } = await import(pathToFileURL(serverEntry).href)

for (const page of PAGES) {
  const template = fs.readFileSync(page.file, 'utf-8')
  if (!template.includes('<!--app-html-->')) {
    throw new Error(`Prerender placeholder <!--app-html--> not found in ${page.file}`)
  }
  const { html } = render(page.url)
  fs.writeFileSync(page.file, template.replace('<!--app-html-->', html))
  console.log('✓ Prerendered %s (%d bytes of markup injected)', page.url, html.length)
}

// The server bundle is only needed during the build.
fs.rmSync(path.join(root, 'dist', 'server'), { recursive: true, force: true })
