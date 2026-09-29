/*
 * Generates the Open Graph image (1200×630) and apple-touch-icon (180×180)
 * in the site's mainframe → sakura visual language.
 *
 * The wordmark is drawn as bitmap-font rects (no font dependency), with each
 * letter's color interpolated green → pink so the image itself performs the
 * migration. Run: node scripts/generate-og.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Same bitmap font as Hero.tsx
const FONT = {
  Z: ['█████', '   █ ', '  █  ', ' █   ', '█████'],
  A: [' ███ ', '█   █', '█████', '█   █', '█   █'],
  C: [' ████', '█    ', '█    ', '█    ', ' ████'],
  H: ['█   █', '█   █', '█████', '█   █', '█   █'],
  B: ['████ ', '█   █', '████ ', '█   █', '████ '],
  R: ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
  E: ['█████', '█    ', '████ ', '█    ', '█████'],
  W: ['█   █', '█   █', '█ █ █', '█ █ █', ' █ █ '],
  ' ': ['     ', '     ', '     ', '     ', '     '],
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t)
const GREEN = [70, 247, 143]
const PINK = [255, 143, 184]

function letterColor(t) {
  return `rgb(${lerp(GREEN[0], PINK[0], t)},${lerp(GREEN[1], PINK[1], t)},${lerp(GREEN[2], PINK[2], t)})`
}

/* Render a word as rects. cell = pixel size. Returns { svg, width } */
function bitmapWord(word, x, y, cell, colorFor) {
  let svg = ''
  let col = 0
  for (let li = 0; li < word.length; li++) {
    const glyph = FONT[word[li]]
    const fill = colorFor(li / Math.max(1, word.length - 1))
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (glyph[r][c] === '█') {
          svg += `<rect x="${x + (col + c) * cell}" y="${y + r * cell}" width="${cell - 1.5}" height="${cell - 1.5}" rx="1.5" fill="${fill}"/>`
        }
      }
    }
    col += 6
  }
  return { svg, width: (col - 1) * cell }
}

function blossom(x, y, r, spin = 0, opacity = 1) {
  let petals = ''
  for (const deg of [0, 72, 144, 216, 288]) {
    petals += `<ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.34}" ry="${r * 0.5}" fill="url(#petal)" transform="rotate(${deg})"/>`
  }
  return `<g transform="translate(${x} ${y}) rotate(${spin})" opacity="${opacity}">${petals}<circle r="${r * 0.16}" fill="#ffe9a8"/></g>`
}

function asciiGlyph(x, y, size, ch, opacity) {
  // '+' and '*' drawn as rects so no font is needed
  const t = size / 5
  if (ch === '+') {
    return `<g fill="#46f78f" opacity="${opacity}"><rect x="${x - t / 2}" y="${y - size / 2}" width="${t}" height="${size}"/><rect x="${x - size / 2}" y="${y - t / 2}" width="${size}" height="${t}"/></g>`
  }
  // '*': three crossing bars
  return `<g stroke="#46f78f" stroke-width="${t}" opacity="${opacity}" stroke-linecap="round">
    <line x1="${x}" y1="${y - size / 2}" x2="${x}" y2="${y + size / 2}"/>
    <line x1="${x - size * 0.43}" y1="${y - size * 0.25}" x2="${x + size * 0.43}" y2="${y + size * 0.25}"/>
    <line x1="${x - size * 0.43}" y1="${y + size * 0.25}" x2="${x + size * 0.43}" y2="${y - size * 0.25}"/>
  </g>`
}

const W = 1200
const H = 630

// Wordmark: "ZACH BREWER" on one line, centered
const CELL = 15
const WORD = 'ZACH BREWER'
const wordCols = WORD.length * 6 - 1
const wordWidth = wordCols * CELL
const wordX = (W - wordWidth) / 2
const wordY = 200

const name = bitmapWord(WORD, wordX, wordY, CELL, letterColor)

// Migration progress bar under the tagline
const BAR_X = 350
const BAR_Y = 445
const BAR_W = 500
const CELLS = 24
let bar = ''
for (let i = 0; i < CELLS; i++) {
  const t = i / (CELLS - 1)
  const filled = i < CELLS - 3
  bar += `<rect x="${BAR_X + i * (BAR_W / CELLS)}" y="${BAR_Y}" width="${BAR_W / CELLS - 4}" height="22" rx="2" fill="${filled ? letterColor(t) : 'rgba(255,255,255,0.12)'}"/>`
}

// Scattered decorations: ASCII glyphs on the left, blossoms on the right
const decorations = [
  asciiGlyph(90, 90, 26, '+', 0.5),
  asciiGlyph(160, 170, 20, '*', 0.4),
  asciiGlyph(70, 300, 18, '*', 0.35),
  asciiGlyph(210, 60, 16, '+', 0.3),
  asciiGlyph(120, 470, 22, '*', 0.4),
  asciiGlyph(250, 380, 14, '+', 0.25),
  blossom(1050, 100, 44, 15, 0.9),
  blossom(1130, 210, 30, -20, 0.75),
  blossom(980, 60, 24, 40, 0.6),
  blossom(1090, 480, 38, -10, 0.85),
  blossom(970, 560, 24, 30, 0.6),
  blossom(1160, 380, 20, 0, 0.5),
].join('')

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#041007"/>
      <stop offset="55%" stop-color="#0a0810"/>
      <stop offset="100%" stop-color="#160b18"/>
    </linearGradient>
    <radialGradient id="petal" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#ffd3e3"/>
      <stop offset="100%" stop-color="#e2578f"/>
    </radialGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="transparent"/>
      <rect y="2" width="4" height="1" fill="rgba(0,0,0,0.35)"/>
    </pattern>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="220" cy="315" rx="420" ry="360" fill="rgba(70,247,143,0.05)"/>
  <ellipse cx="1030" cy="315" rx="430" ry="380" fill="rgba(226,87,143,0.07)"/>

  ${decorations}

  <!-- terminal prompt line -->
  <text x="${wordX}" y="150" font-family="Consolas, 'Courier New', monospace" font-size="24" fill="#2a9457" letter-spacing="2">visitor@zb-s370:~$ ./introduce --name</text>

  <g filter="url(#glow)">${name.svg}</g>

  <!-- tagline -->
  <text x="${W / 2}" y="390" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="26" fill="#d8d3dc" letter-spacing="6">SOFTWARE ENGINEER — MAINFRAME → CLOUD</text>

  <!-- migration bar -->
  ${bar}
  <text x="${W / 2}" y="510" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="22" fill="#ff8fb8" letter-spacing="4">MIGRATION ▸ 88% — SYSTEM IN FULL BLOOM</text>

  <!-- url -->
  <text x="${W / 2}" y="585" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="24" fill="#8a8494" letter-spacing="3">zachbrewer.com</text>

  <rect width="${W}" height="${H}" fill="url(#scan)"/>
</svg>`

// Apple touch icon: the favicon design at 180×180 with square-ish corners
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
  <defs>
    <radialGradient id="petal" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#ffd3e3"/>
      <stop offset="100%" stop-color="#e2578f"/>
    </radialGradient>
  </defs>
  <rect width="180" height="180" fill="#071009"/>
  <path d="M 28 96 L 62 118 L 28 140" stroke="#46f78f" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="76" y="130" width="40" height="14" rx="4" fill="#46f78f"/>
  ${blossom(121, 56, 46, 0, 1)}
</svg>`

const ogPng = await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(join(ROOT, 'public', 'og-image.png'), ogPng)
console.log(`og-image.png written (${(ogPng.length / 1024).toFixed(0)} KB)`)

const iconPng = await sharp(Buffer.from(icon)).png().toBuffer()
writeFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), iconPng)
console.log(`apple-touch-icon.png written (${(iconPng.length / 1024).toFixed(0)} KB)`)
