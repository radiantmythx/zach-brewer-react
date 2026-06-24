// Injects server-rendered HTML into the built index.html so crawlers and
// social scrapers receive a fully-populated page, and the browser hydrates it.
//
// Run order (see package.json "build"):
//   1. vite build                -> dist/ (client assets + index.html template)
//   2. vite build --ssr ...       -> dist/server/entry-server.js
//   3. node scripts/prerender.mjs -> reads template, renders, writes final HTML
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distIndex = path.join(root, 'dist', 'index.html')
const serverEntry = path.join(root, 'dist', 'server', 'entry-server.js')

const template = fs.readFileSync(distIndex, 'utf-8')

const { render } = await import(pathToFileURL(serverEntry).href)
const { html } = render()

if (!template.includes('<!--app-html-->')) {
  throw new Error('Prerender placeholder <!--app-html--> not found in dist/index.html')
}

const output = template.replace('<!--app-html-->', html)
fs.writeFileSync(distIndex, output)

// The server bundle is only needed during the build.
fs.rmSync(path.join(root, 'dist', 'server'), { recursive: true, force: true })

console.log('✓ Prerendered dist/index.html (%d bytes of markup injected)', html.length)
