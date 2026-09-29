/*
 * Generates the brand assets from the ZB monogram (same geometry as
 * src/film/logo.ts), in the site's linework language — ink on paper:
 * public/favicon.svg, public/og-image.png (1200×630) and
 * public/apple-touch-icon.png (180×180).
 *
 * The serif wordmark is converted to vector paths with opentype.js, because
 * librsvg (sharp) can't load web fonts. Run: node scripts/generate-og.mjs
 */
import sharp from 'sharp'
import opentype from 'opentype.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const INK = { paper: '#F3F6F2', ink: '#122630', ink2: '#3A4F58', muted: '#6C7F86', ocean: '#2B6A93', moss: '#3F7A55', fern: '#6F952F' }

// --- the mark (keep in sync with src/film/logo.ts) -------------------------------------
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
const mark = (hexW, letterW) => `
  <path d="${LOGO.hex}" fill="none" stroke="${INK.ocean}" stroke-width="${hexW}" stroke-linejoin="round"/>
  <g fill="none" stroke="${INK.ink}" stroke-width="${letterW}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${LOGO.bars}"/><path d="${LOGO.diag}"/><path d="${LOGO.bowls}"/>
  </g>`

/** construction lines around the mark, in its own 100-unit space */
function construction(unit) {
  let grid = ''
  for (let k = 0; k <= 12; k++) {
    const v = -10 + k * 10
    grid += `<line x1="${v}" y1="-12" x2="${v}" y2="112"/><line x1="-12" y1="${v}" x2="112" y2="${v}"/>`
  }
  const spokes = hexPts.map(([x, y]) => `<line x1="50" y1="50" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`).join('')
  return `
    <g stroke="${INK.ink}" stroke-opacity="0.1" stroke-width="${unit}">${grid}</g>
    <g stroke="${INK.ink}" stroke-opacity="0.16" stroke-width="${unit}">${spokes}</g>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${INK.ocean}" stroke-opacity="0.45" stroke-width="${unit}"/>
    <g fill="none" stroke="${INK.fern}" stroke-opacity="0.6" stroke-width="${unit}" stroke-dasharray="${unit * 3} ${unit * 4}">
      <circle cx="63" cy="40.5" r="8.5"/><circle cx="65" cy="58.5" r="9.5"/>
    </g>
    <g stroke="${INK.ink}" stroke-opacity="0.5" stroke-width="${unit}">
      <circle cx="50" cy="50" r="2.8" fill="none"/><line x1="45" y1="50" x2="55" y2="50"/><line x1="50" y1="45" x2="50" y2="55"/>
    </g>`
}

// --- favicon -------------------------------------------------------------------------------
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="0.5" y="0.5" width="63" height="63" rx="14" fill="${INK.paper}" stroke="${INK.ink}" stroke-opacity="0.18"/>
  <g transform="translate(2 2) scale(0.6)">${mark(4.5, 8)}</g>
</svg>
`
writeFileSync(join(ROOT, 'public', 'favicon.svg'), favicon)
console.log('favicon.svg written')

// --- wordmark as paths -----------------------------------------------------------------------
const load = (file) => {
  const buf = readFileSync(join(ROOT, 'node_modules/@fontsource/instrument-serif/files', file))
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}
const roman = load('instrument-serif-latin-400-normal.woff')
const italic = load('instrument-serif-latin-400-italic.woff')

/** Lay out glyphs by hand (advance + kerning). Pinned to opentype.js 1.3: 2.x mis-parses this italic. */
function setText(font, text, x, size) {
  const scale = size / font.unitsPerEm
  const glyphs = [...text].map((ch) => font.charToGlyph(ch))
  let d = ''
  glyphs.forEach((gl, i) => {
    d += gl.getPath(x, 0, size).toPathData(2)
    x += gl.advanceWidth * scale
    if (i < glyphs.length - 1) x += font.getKerningValue(gl, glyphs[i + 1]) * scale
  })
  return { d, x }
}
const SIZE = 132
const zach = setText(roman, 'Zach ', 0, SIZE)
const brewer = setText(italic, 'Brewer', zach.x, SIZE)

// --- OG image -----------------------------------------------------------------------------------
const W = 1200
const H = 630
let grid = ''
for (let x = 40; x < W; x += 40) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`
for (let y = 30; y < H; y += 40) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`
let ticks = ''
for (let k = 0; k <= 48; k++) {
  const x = 60 + ((W - 120) * k) / 48
  const h = k % 8 === 0 ? 7 : k % 4 === 0 ? 5 : 2.5
  ticks += `<line x1="${x.toFixed(1)}" y1="44" x2="${x.toFixed(1)}" y2="${44 + h}"/>`
}
const corner = (x, y, sx, sy) => `<path d="M${x + sx * 16} ${y} H${x} V${y + sy * 16}"/>`
const ms = 300
const mx = 110
const my = 170
const tx = 500
const base = 390

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${INK.paper}"/>
  <g stroke="${INK.ocean}" stroke-opacity="0.06" stroke-width="1">${grid}</g>
  <g stroke="${INK.ink}" stroke-opacity="0.2" stroke-width="1"><line x1="60" y1="44" x2="${W - 60}" y2="44"/>${ticks}</g>
  <line x1="${60 + (W - 120) * 0.92}" y1="38" x2="${60 + (W - 120) * 0.92}" y2="56" stroke="${INK.ink}" stroke-width="1"/>
  <text x="60" y="74" font-family="Consolas, 'Courier New', monospace" font-size="12" letter-spacing="1.5" fill="${INK.muted}">SHOWREEL — 2026</text>
  <text x="${W - 60}" y="74" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="12" letter-spacing="1.5" fill="${INK.ink2}">ZACHBREWER.COM</text>
  <g fill="none" stroke="${INK.ink}" stroke-opacity="0.5" stroke-width="1">
    ${corner(60, 100, 1, 1)}${corner(W - 60, 100, -1, 1)}${corner(60, H - 50, 1, -1)}${corner(W - 60, H - 50, -1, -1)}
  </g>

  <g transform="translate(${mx} ${my}) scale(${ms / 100})">
    ${construction(1 / (ms / 100))}
    ${mark(1.6, 3.6)}
  </g>
  <g font-family="Consolas, 'Courier New', monospace" font-size="11" fill="${INK.fern}" letter-spacing="1">
    <text x="${mx + ms * 0.88}" y="${my + ms * 0.08}">R 46</text>
    <text x="${mx + ms * 0.99}" y="${my + ms * 0.5}">60°</text>
    <text x="${mx + ms * 0.5}" y="${my + ms * 1.08}" text-anchor="middle">ø 92 · STROKE 3.6</text>
  </g>

  <line x1="${tx}" y1="${base - 150}" x2="${tx + 28}" y2="${base - 150}" stroke="${INK.ink}" stroke-width="1"/>
  <text x="${tx + 40}" y="${base - 146}" font-family="Consolas, 'Courier New', monospace" font-size="12" letter-spacing="1.5" fill="${INK.ink}">FIG. 00 — ZACH BREWER</text>
  <g transform="translate(${tx - 4} ${base})">
    <path d="${zach.d}" fill="${INK.ink}"/>
    <path d="${brewer.d}" fill="${INK.moss}"/>
  </g>
  <text x="${tx}" y="${base + 50}" font-family="'Segoe UI', Helvetica, Arial, sans-serif" font-size="22" fill="${INK.ink2}">Software Engineer &amp; Designer</text>
  <text x="${tx}" y="${base + 86}" font-family="Consolas, 'Courier New', monospace" font-size="12" letter-spacing="1.6" fill="${INK.muted}">ENGINEERING · INTERFACE DESIGN · GAME SYSTEMS · SOUND</text>
</svg>`

const ogPng = await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(join(ROOT, 'public', 'og-image.png'), ogPng)
console.log(`og-image.png written (${(ogPng.length / 1024).toFixed(0)} KB)`)

// --- apple touch icon ------------------------------------------------------------------------------
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
  <rect width="180" height="180" fill="${INK.paper}"/>
  <g transform="translate(25 25) scale(1.3)">
    <circle cx="50" cy="50" r="46" fill="none" stroke="${INK.ocean}" stroke-opacity="0.3" stroke-width="0.8"/>
    ${mark(2.6, 6)}
  </g>
</svg>`
const iconPng = await sharp(Buffer.from(icon)).png().toBuffer()
writeFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), iconPng)
console.log(`apple-touch-icon.png written (${(iconPng.length / 1024).toFixed(0)} KB)`)
