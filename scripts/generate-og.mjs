/*
 * Generates the brand assets from the ZB monogram (same geometry as
 * src/film/logo.ts): public/favicon.svg, public/og-image.png (1200×630) and
 * public/apple-touch-icon.png (180×180).
 *
 * The wordmark is set in Unbounded and converted to vector paths with
 * opentype.js, because librsvg (sharp) can't load web fonts.
 * Run: node scripts/generate-og.mjs
 */
import sharp from 'sharp'
import opentype from 'opentype.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const NEON = { white: '#F2FBFF', blue: '#5CA8FF', cyan: '#3DE3F5', mint: '#3DFFA8', lime: '#B8FF5C' }

// --- the mark (keep in sync with src/film/logo.ts) ---------------------------------
const hexPts = Array.from({ length: 6 }, (_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180
  return [50 + 46 * Math.cos(a), 50 + 46 * Math.sin(a)]
})
const LOGO = {
  hex: `M${hexPts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z`,
  bars: 'M25 32 H49 M25 68 H49',
  diag: 'M49 32 L25 68',
  bowls: 'M55 32 V68 M55 32 H63 A8.5 8.5 0 0 1 63 49 H55 M55 49 H65 A9.5 9.5 0 0 1 65 68 H55',
}

/** The mark as SVG markup in its own 100×100 space, with optional glow layers. */
function mark({ glow = false, hexWidth = 3, letterWidth = 6.5 } = {}) {
  const letters = `<path d="${LOGO.bars}"/><path d="${LOGO.diag}"/><path d="${LOGO.bowls}"/>`
  const glowLayer = glow
    ? `<g filter="url(#markGlow)" opacity="0.9">
         <path d="${LOGO.hex}" fill="none" stroke="${NEON.cyan}" stroke-width="${hexWidth * 2.2}" stroke-linejoin="round"/>
         <g fill="none" stroke="url(#letterGrad)" stroke-width="${letterWidth * 2}" stroke-linecap="round" stroke-linejoin="round">${letters}</g>
       </g>`
    : ''
  return `${glowLayer}
    <path d="${LOGO.hex}" fill="none" stroke="${NEON.cyan}" stroke-width="${hexWidth}" stroke-linejoin="round"/>
    <g fill="none" stroke="${NEON.white}" stroke-width="${letterWidth}" stroke-linecap="round" stroke-linejoin="round">${letters}</g>`
}

const defs = (blur) => `
  <linearGradient id="letterGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${NEON.blue}"/><stop offset=".5" stop-color="${NEON.cyan}"/><stop offset="1" stop-color="${NEON.lime}"/>
  </linearGradient>
  <filter id="markGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${blur}"/></filter>`

// --- favicon ----------------------------------------------------------------------------
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#05080D"/>
  <g transform="translate(2 2) scale(0.6)">${mark({ hexWidth: 5, letterWidth: 9 })}</g>
</svg>
`
writeFileSync(join(ROOT, 'public', 'favicon.svg'), favicon)
console.log('favicon.svg written')

// --- wordmark as paths --------------------------------------------------------------------
const fontFile = readFileSync(join(ROOT, 'node_modules/@fontsource/unbounded/files/unbounded-latin-800-normal.woff'))
const font = opentype.parse(fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength))
const word = font.getPath('ZACH BREWER', 0, 0, 64)
const wb = word.getBoundingBox()
const wordW = wb.x2 - wb.x1

// --- OG image -------------------------------------------------------------------------------
const W = 1200
const H = 630
const markSize = 300
const mx = 110
const my = (H - markSize) / 2 - 10
const tx = mx + markSize + 70
const ty = 350
const wordScale = Math.min(1, (W - tx - 70) / wordW)

let hexGrid = ''
for (let row = -1; row < 14; row++) {
  for (let col = -1; col < 26; col++) {
    const r = 30
    const x = col * r * 1.5
    const y = row * r * Math.sqrt(3) + (col % 2 ? (r * Math.sqrt(3)) / 2 : 0)
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`
    }).join(' ')
    hexGrid += `<polygon points="${pts}"/>`
  }
}

const chapters = [
  ['01', 'PROGRAMMING', NEON.blue],
  ['02', 'DESIGN', NEON.cyan],
  ['03', 'GAME DEV', NEON.mint],
  ['04', 'MUSIC', NEON.lime],
]
let cx = tx
let chapterMarkup = ''
for (const [n, label, c] of chapters) {
  chapterMarkup += `<rect x="${cx}" y="${ty + 58}" width="26" height="2" fill="${c}"/>
    <text x="${cx}" y="${ty + 86}" font-family="Consolas, 'Courier New', monospace" font-size="15" letter-spacing="1.5"><tspan fill="${c}">${n}</tspan><tspan fill="#8FA3AA" dx="8">${label}</tspan></text>`
  cx += 34 + label.length * 9.4 + 42
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    ${defs(4)}
    <radialGradient id="auroraA" cx="22%" cy="45%" r="55%"><stop offset="0" stop-color="${NEON.blue}" stop-opacity="0.32"/><stop offset="1" stop-color="${NEON.blue}" stop-opacity="0"/></radialGradient>
    <radialGradient id="auroraB" cx="82%" cy="70%" r="50%"><stop offset="0" stop-color="${NEON.mint}" stop-opacity="0.18"/><stop offset="1" stop-color="${NEON.mint}" stop-opacity="0"/></radialGradient>
    <radialGradient id="fadeGrid" cx="30%" cy="50%" r="70%"><stop offset="0" stop-color="#05080D" stop-opacity="0"/><stop offset="1" stop-color="#05080D" stop-opacity="1"/></radialGradient>
    <linearGradient id="wordGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D9FFF1"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#05080D"/>
  <g fill="none" stroke="rgba(61,227,245,0.07)" stroke-width="1">${hexGrid}</g>
  <rect width="${W}" height="${H}" fill="url(#fadeGrid)"/>
  <rect width="${W}" height="${H}" fill="url(#auroraA)"/>
  <rect width="${W}" height="${H}" fill="url(#auroraB)"/>

  <g transform="translate(${mx} ${my}) scale(${markSize / 100})">${mark({ glow: true })}</g>

  <text x="${tx}" y="${ty - 92}" font-family="Consolas, 'Courier New', monospace" font-size="16" letter-spacing="3.5" fill="#8FA3AA">SOFTWARE ENGINEER · DESIGNER</text>
  <g transform="translate(${tx - wb.x1 * wordScale} ${ty}) scale(${wordScale})">
    <path d="${word.toPathData(2)}" fill="${NEON.cyan}" opacity="0.35" filter="url(#markGlow)"/>
    <path d="${word.toPathData(2)}" fill="url(#wordGrad)"/>
  </g>
  ${chapterMarkup}
  <text x="${W - 70}" y="${H - 48}" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="17" letter-spacing="1.5" fill="#8FA3AA">zachbrewer.com</text>
</svg>`

const ogPng = await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(join(ROOT, 'public', 'og-image.png'), ogPng)
console.log(`og-image.png written (${(ogPng.length / 1024).toFixed(0)} KB)`)

// --- apple touch icon ---------------------------------------------------------------------------
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
  <defs>${defs(3)}
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#0E2A33"/><stop offset="1" stop-color="#05080D"/></radialGradient>
  </defs>
  <rect width="180" height="180" fill="url(#bgGlow)"/>
  <g transform="translate(22 22) scale(1.36)">${mark({ glow: true, hexWidth: 3.5, letterWidth: 7.5 })}</g>
</svg>`
const iconPng = await sharp(Buffer.from(icon)).png().toBuffer()
writeFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), iconPng)
console.log(`apple-touch-icon.png written (${(iconPng.length / 1024).toFixed(0)} KB)`)
