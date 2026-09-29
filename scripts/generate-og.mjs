/*
 * Generates the Open Graph image (1200×630) and apple-touch-icon (180×180)
 * in the site's "one line" language: a single glowing stroke that runs
 * through all four chapters of the hero film — an easing curve, a game
 * level, a waveform — over the film's black.
 *
 * Text uses system fonts (Georgia / Consolas) because librsvg can't load
 * web fonts. Run: node scripts/generate-og.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const W = 1200
const H = 630
const HUES = ['#7C9DFF', '#FF6B4A', '#3FE0A0', '#FFC24D']
const bez = (a, b, c, d, s) => (1 - s) ** 3 * a + 3 * (1 - s) ** 2 * s * b + 3 * (1 - s) * s * s * c + s ** 3 * d

/* ---- the line: ease curve → handle → level → waveform ---- */
const pts = []
// 01 the easing curve, cubic-bezier(0.65, 0, 0.35, 1)
for (let i = 0; i <= 80; i++) {
  const s = i / 80
  pts.push([bez(80, 275, 185, 380, s), bez(300, 300, 140, 140, s)])
}
// 02 a designed flourish down to the horizon
for (let i = 1; i <= 50; i++) {
  const s = i / 50
  pts.push([bez(380, 440, 430, 500, s), bez(140, 140, 262, 262, s)])
}
// 03 the level: spikes, then a block
const ground = (x) => {
  let y = 262
  if (x > 548 && x < 620) {
    const f = ((x - 548) % 24) / 24
    y -= 24 * (1 - Math.abs(f * 2 - 1))
  }
  if (x >= 662 && x <= 730) y -= 44
  return y
}
for (let x = 502; x <= 790; x += 2) pts.push([x, ground(x)])
// 04 the waveform, four partials summed
for (let x = 792; x <= 1120; x += 2) {
  const s = (x - 792) / 328
  const w = Math.sin(Math.PI * s) ** 0.7
  const rise = Math.min(1, s * 6)
  const y =
    262 -
    rise * 52 +
    w * (34 * Math.sin(s * 11) + 20 * Math.sin(s * 17 + 1.3) + 14 * Math.sin(s * 23 + 2.1) + 9 * Math.sin(s * 31 + 0.7))
  pts.push([x, y])
}
const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

const labels = [
  ['01', 'Programming', 80],
  ['02', 'Design', 400],
  ['03', 'Game design', 600],
  ['04', 'Music', 860],
]
  .map(
    ([n, t, x], i) =>
      `<text x="${x}" y="352" font-family="Consolas, 'Courier New', monospace" font-size="17" letter-spacing="1"><tspan fill="${HUES[i]}">${n}</tspan><tspan fill="#8b8a86" dx="10">${t}</tspan></text>
       <rect x="${x}" y="322" width="150" height="2" rx="1" fill="${HUES[i]}" opacity="${i === 0 ? 0.9 : 0.35}"/>`,
  )
  .join('')

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="hue" x1="80" y1="0" x2="1120" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${HUES[0]}"/>
      <stop offset=".33" stop-color="${HUES[1]}"/>
      <stop offset=".6" stop-color="${HUES[2]}"/>
      <stop offset="1" stop-color="${HUES[3]}"/>
    </linearGradient>
    <radialGradient id="vig" cx="50%" cy="38%" r="75%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.6"/>
    </radialGradient>
    <filter id="blur" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#08080A"/>

  <text x="80" y="104" font-family="Consolas, 'Courier New', monospace" font-size="17" fill="#5e6372">const ease = <tspan fill="${HUES[2]}">cubicBezier</tspan>(<tspan fill="${HUES[3]}">0.65, 0, 0.35, 1</tspan>)</text>

  <!-- bezier handles on the curve -->
  <g stroke="rgba(255,255,255,0.45)" stroke-width="1.2">
    <line x1="80" y1="300" x2="275" y2="300"/><line x1="380" y1="140" x2="185" y2="140"/>
  </g>
  <circle cx="275" cy="300" r="5" fill="#fff"/><circle cx="185" cy="140" r="5" fill="${HUES[1]}"/>

  <!-- the line: blur halo, glow, body, hot core -->
  <path d="${d}" fill="none" stroke="url(#hue)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" filter="url(#blur)"/>
  <path d="${d}" fill="none" stroke="url(#hue)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
  <path d="${d}" fill="none" stroke="url(#hue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>

  <rect x="75.5" y="295.5" width="9" height="9" fill="#08080A" stroke="#fff" stroke-width="1.5"/>
  <rect x="375.5" y="135.5" width="9" height="9" fill="#08080A" stroke="#fff" stroke-width="1.5"/>

  <!-- the little hero, mid-jump, and a coin -->
  <circle cx="690" cy="170" r="38" fill="${HUES[2]}" opacity="0.12"/>
  <rect x="673" y="152" width="34" height="34" rx="8" fill="${HUES[2]}"/>
  <rect x="690" y="160" width="4" height="10" rx="2" fill="#04281A"/><rect x="698" y="160" width="4" height="10" rx="2" fill="#04281A"/>
  <path d="M584 176 L592 188 L584 200 L576 188 Z" fill="${HUES[3]}"/>

  ${labels}

  <rect width="${W}" height="${H}" fill="url(#vig)"/>

  <text x="80" y="452" font-family="Consolas, 'Courier New', monospace" font-size="17" letter-spacing="3" fill="#8b8a86">SOFTWARE ENGINEER · DESIGNER</text>
  <text x="74" y="552" font-family="Georgia, 'Times New Roman', serif" font-size="104" fill="#F2EFE8" letter-spacing="-2">Zach <tspan font-style="italic">Brewer</tspan></text>
  <text x="1120" y="548" text-anchor="end" font-family="Consolas, 'Courier New', monospace" font-size="19" letter-spacing="1.5" fill="#8b8a86">zachbrewer.com</text>
</svg>`

// Apple touch icon: the favicon's easing curve at 180×180 (iOS rounds the corners itself)
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
  <defs>
    <linearGradient id="l" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${HUES[0]}"/><stop offset=".38" stop-color="${HUES[1]}"/>
      <stop offset=".68" stop-color="${HUES[2]}"/><stop offset="1" stop-color="${HUES[3]}"/>
    </linearGradient>
    <filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="180" height="180" fill="#08080A"/>
  <path d="M38 136 C 101 136, 79 44, 142 44" fill="none" stroke="url(#l)" stroke-width="20" stroke-linecap="round" opacity="0.5" filter="url(#b)"/>
  <path d="M38 136 C 101 136, 79 44, 142 44" fill="none" stroke="url(#l)" stroke-width="12" stroke-linecap="round"/>
  <circle cx="142" cy="44" r="10" fill="#FFF4DA"/>
</svg>`

const ogPng = await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(join(ROOT, 'public', 'og-image.png'), ogPng)
console.log(`og-image.png written (${(ogPng.length / 1024).toFixed(0)} KB)`)

const iconPng = await sharp(Buffer.from(icon)).png().toBuffer()
writeFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), iconPng)
console.log(`apple-touch-icon.png written (${(iconPng.length / 1024).toFixed(0)} KB)`)
