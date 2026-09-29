/*
 * The ZB monogram, on a 100×100 grid. Four pieces, one per craft, which the
 * reel flies in separately and snaps together (see scenes/resolve.ts):
 *   hex   — game dev (the tile the ARPG is played on)
 *   bars  — programming (the Z's two strokes, like `=`)
 *   diag  — design (the Z's diagonal arrives as a bezier, then straightens)
 *   bowls — music (the B's stem and bowls settle out of a vibration)
 * scripts/generate-og.mjs mirrors these paths for the favicon and OG image.
 */

const hexPts = Array.from({ length: 6 }, (_, i) => {
  const a = (-90 + i * 60) * (Math.PI / 180)
  return [50 + 46 * Math.cos(a), 50 + 46 * Math.sin(a)]
})

export const LOGO = {
  hex: `M${hexPts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z`,
  bars: 'M25 32 H49 M25 68 H49',
  diag: 'M49 32 L25 68',
  bowls: 'M55 32 V68 M55 32 H63 A8.5 8.5 0 0 1 63 49 H55 M55 49 H65 A9.5 9.5 0 0 1 65 68 H55',
}
