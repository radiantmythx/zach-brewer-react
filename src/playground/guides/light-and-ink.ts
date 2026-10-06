import type { Guide } from '../guide'

const mixFigure = `<svg viewBox="0 0 420 170" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="92" cy="62" r="40" stroke="#D0342C"/>
  <circle cx="68" cy="102" r="40" stroke="#2B6A93"/>
  <circle cx="116" cy="102" r="40" stroke="#3F7A55"/>
  <text x="92" y="38" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">R</text>
  <text x="44" y="122" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">B</text>
  <text x="140" y="122" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">G</text>
  <text x="92" y="92" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">W</text>
  <text x="92" y="162" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" text-anchor="middle" opacity="0.7">LIGHT ADDS: R + G + B = WHITE</text>
  <circle cx="318" cy="62" r="40" stroke="#1F8A86" stroke-dasharray="1.5 2.5"/>
  <circle cx="294" cy="102" r="40" stroke="#B0306A" stroke-dasharray="1.5 2.5"/>
  <circle cx="342" cy="102" r="40" stroke="#B89A10" stroke-dasharray="1.5 2.5"/>
  <text x="318" y="38" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">C</text>
  <text x="270" y="122" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">M</text>
  <text x="366" y="122" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">Y</text>
  <text x="318" y="92" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">K</text>
  <text x="318" y="162" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" text-anchor="middle" opacity="0.7">INK TAKES AWAY: C × M × Y ≈ BLACK</text>
</svg>`

const angleFigure = `<svg viewBox="0 0 420 170" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <g transform="translate(110 92)">
    <line x1="0" y1="0" x2="72" y2="0" stroke="#B89A10"/>
    <line x1="0" y1="0" x2="69.5" y2="-18.6" stroke="#1F8A86"/>
    <line x1="0" y1="0" x2="50.9" y2="-50.9"/>
    <line x1="0" y1="0" x2="18.6" y2="-69.5" stroke="#B0306A"/>
    <path d="M40 0 A40 40 0 0 0 10.4 -38.6" stroke-dasharray="1.5 2.5" opacity="0.5"/>
    <text x="78" y="4" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">Y 0°</text>
    <text x="74" y="-20" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">C 15°</text>
    <text x="54" y="-54" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">K 45°</text>
    <text x="20" y="-74" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">M 75°</text>
    <text x="-10" y="26" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.65">30° BETWEEN C, K, M</text>
  </g>
  <g transform="translate(300 86)" opacity="0.85">
    <circle cx="0" cy="0" r="3"/><circle cx="12" cy="0" r="3"/><circle cx="-12" cy="0" r="3"/><circle cx="0" cy="12" r="3"/><circle cx="0" cy="-12" r="3"/>
    <circle cx="12" cy="12" r="3"/><circle cx="-12" cy="-12" r="3"/><circle cx="12" cy="-12" r="3"/><circle cx="-12" cy="12" r="3"/>
    <g transform="rotate(30)" stroke="#B0306A"><circle cx="0" cy="0" r="3.4"/><circle cx="12" cy="0" r="3.4"/><circle cx="-12" cy="0" r="3.4"/><circle cx="0" cy="12" r="3.4"/><circle cx="0" cy="-12" r="3.4"/><circle cx="12" cy="12" r="3.4"/><circle cx="-12" cy="-12" r="3.4"/><circle cx="12" cy="-12" r="3.4"/><circle cx="-12" cy="12" r="3.4"/></g>
    <text x="-40" y="44" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.65">TWO SCREENS, 30° APART</text>
  </g>
</svg>`

const guide: Guide = {
  lede: 'Two ways to make every color. Light adds: three lamps make white. Ink takes away: three inks make black, or nearly. Every screen you have looked at today is the first; every printed page, the second.',
  facts: [
    ['Additive primaries', 'Red, green, blue: the sRGB primaries, white point D65'],
    ['Subtractive primaries', 'Cyan, magenta, yellow, and black (K)'],
    ['Light', '$R + G = Y$, $G + B = C$, $B + R = M$, $R + G + B = W$'],
    ['Ink', '$C \\times M = B$, $C \\times Y = G$, $M \\times Y = R$'],
    ['Ink model', 'Beer–Lambert: reflectance $R(\\lambda) = 10^{-A(\\lambda)}$'],
    ['Screen angles', 'C 15°, M 75°, Y 0°, K 45°'],
    ['Loupe', '4× magnification, dots and subpixels redrawn as vectors'],
    ['Running time', '50 s: lights, inks, a picture as light and as print'],
    ['Sound', 'Optional: a chord of the three lights, the thump of the press'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Step to the previous or next part: lights, inks, the screen, the print' }],
    gestures: [
      { gesture: 'drag', action: 'Drag a light or an ink disc to change how they overlap' },
      { gesture: 'drag', action: 'Drag the loupe across the dots, the rosettes, or the screen’s subpixels' },
    ],
    tip: 'Pull one ink disc slowly across another under the loupe: the rosette pattern shifts as the screens slide over each other, which is exactly what a printer’s registration error does.',
  },
  pad: {
    left: [{ label: '‹ Back', code: 'ArrowLeft', aria: 'Previous part', wide: true }],
    right: [{ label: 'Next ›', code: 'ArrowRight', aria: 'Next part', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Color science',
      title: 'Two kinds of mixing',
      blocks: [
        {
          type: 'p',
          text: 'Shine a red light and a green light on the same white wall and the patch where they overlap is yellow. Lay a cyan ink and a yellow ink on the same white paper and the overlap is green. Both are called mixing, and they seem to break the rules we learn as children, that yellow is a primary and that mixing colors makes them muddier. The two are opposites. Lights *add*: the overlap sends more light to your eye than either alone. Inks *subtract*: each one absorbs part of the light the paper would have reflected, and the overlap absorbs more.',
        },
        {
          type: 'p',
          text: 'The reason three primaries are enough in either case is in the eye, not in the light. We see color with three kinds of cone, sensitive to long, middle and short wavelengths. Any light, however complicated its spectrum, is reduced to three numbers, how strongly it excites each kind, and any two lights that produce the same three numbers look identical. A screen exploits that by mixing three lights chosen to excite the cones as independently as possible; a printer exploits it by controlling three filters, each of which removes roughly a third of the spectrum.',
        },
        { type: 'figure', svg: mixFigure, alt: 'Two Venn diagrams: red, green and blue lights overlapping to white; cyan, magenta and yellow inks overlapping to black.', caption: 'The same diagram twice, read in opposite directions. The secondaries of light are the primaries of ink, and the other way round.' },
        { type: 'h', text: 'A short history' },
        {
          type: 'p',
          text: 'Isaac Newton split white light with a prism and recombined it, and arranged the colors around a circle, but the idea that color vision needs only three channels came later. In 1802 Thomas Young proposed that the eye has three kinds of receptor, each responding to a broad band of the spectrum. Half a century later Hermann von Helmholtz and James Clerk Maxwell put the theory to the test. Maxwell measured color matches with spinning tops and a light box, showing that mixtures of three lights could match almost any color and mapping how they did; Hermann Grassmann had stated the algebra of such matches in 1853.',
        },
        {
          type: 'p',
          text: 'Maxwell then made the first color photograph. At a lecture at the Royal Institution in London in May 1861 he showed a tartan ribbon, photographed three times by Thomas Sutton through red, green and blue filters and projected by three lanterns through the same filters, superimposed on one screen. It was additive color, the principle of every television and phone screen since. Its success was partly luck (the photographic plates of the day were barely sensitive to red), but the idea was exactly right. A few years later Louis Ducos du Hauron described the subtractive alternative: three images in cyan, magenta and yellow printed on top of one another, the principle of color printing and of color film.',
        },
        {
          type: 'p',
          text: 'Printers had been there before the theory. Around 1710 the engraver Jacob Christoph Le Blon was printing color pictures from three mezzotint plates in blue, yellow and red, sometimes adding a fourth in black. The modern process colors, cyan, magenta and yellow, are the same idea refined: inks chosen to be as pure a "minus red", "minus green" and "minus blue" as chemistry allows.',
        },
      ],
    },
    {
      id: 'light',
      kicker: 'Additive color',
      title: 'Light adds',
      blocks: [
        {
          type: 'p',
          text: 'Two lights falling on the same spot send their photons to the eye together, so their spectra add, and because the cone responses are linear in the light, so do the cone responses. In the CIE 1931 system, which describes the average observer’s three channels as tristimulus values $X, Y, Z$, mixing is plain vector addition. Grassmann’s laws say the same thing in words: matches are additive, and proportional.',
        },
        { type: 'math', tex: '\\mathbf{XYZ}(L_1 + L_2) = \\mathbf{XYZ}(L_1) + \\mathbf{XYZ}(L_2)' },
        {
          type: 'p',
          text: 'Divide out the brightness and each color becomes a point on the *chromaticity diagram*, $x = X/(X + Y + Z)$, $y = Y/(X + Y + Z)$. The pure colors of the spectrum lie on its curved edge, the horseshoe; every real color lies inside. A mixture of two lights lies on the straight line between them, and a mixture of three lies inside their triangle. That triangle is a display’s *gamut*.',
        },
        {
          type: 'p',
          text: 'Most screens, and the web, use the sRGB primaries, defined in 1996 by Hewlett-Packard and Microsoft and inherited from television’s Rec. 709: red at $(0.640, 0.330)$, green at $(0.300, 0.600)$, blue at $(0.150, 0.060)$, with white at the D65 daylight point $(0.3127, 0.3290)$. The triangle is drawn in the night half of the plate. It covers only about a third of the horseshoe: no screen can show the deepest cyans, the purest spectral greens or violets. Linear light values are related to the stored numbers by a gamma curve, roughly a power of 2.2, and mixing happens in the linear values.',
        },
        {
          type: 'math',
          tex: 'Y = 0.2126\\, R + 0.7152\\, G + 0.0722\\, B',
          caption: 'The luminance row of the sRGB matrix, in linear values: green carries 72 percent of white’s brightness, blue only 7. The other rows give $X$ and $Z$ the same way.',
        },
        {
          type: 'p',
          text: 'A screen does not overlap its lights; it puts them side by side, too small to see. Each pixel of a typical LCD is three vertical stripes, red, green and blue, each with its own filter in front of a white backlight. At normal viewing distance the eye cannot resolve them and adds them up, which is additive mixing by proximity rather than by overlap. Other layouts exist: OLED phones often use diamonds of subpixels, with more greens than reds or blues, because the eye is most sensitive to green detail.',
        },
      ],
    },
    {
      id: 'ink',
      kicker: 'Subtractive color',
      title: 'Ink takes away',
      blocks: [
        {
          type: 'p',
          text: 'An ink is a transparent colored film. Light from the lamp passes through it, reflects from the white paper beneath, and passes through it again on the way out; at each wavelength the film absorbs a fraction. For a dye in a clear layer, absorption follows the *Beer–Lambert law*, assembled from Pierre Bouguer’s and Johann Lambert’s work in the eighteenth century and August Beer’s in 1852: each thin slice of film absorbs the same fraction of what reaches it, so transmittance falls exponentially with thickness and concentration.',
        },
        {
          type: 'math',
          tex: 'T(\\lambda) = 10^{-\\varepsilon(\\lambda)\\, c\\, \\ell}, \\qquad R(\\lambda) = R_{\\text{paper}}(\\lambda)\\, 10^{-\\sum_i A_i(\\lambda)}',
          label: '(1)',
          caption: '$\\varepsilon$ is the dye’s absorptivity, $c$ its concentration and $\\ell$ the path length; $A_i$ is the *absorbance* of the $i$-th ink film, counting both passes through it. Stacked films multiply their transmittances, so their absorbances add.',
        },
        {
          type: 'p',
          text: 'That multiplication is the whole of subtractive mixing. An ideal cyan absorbs the long wavelengths, red, and passes the rest; an ideal magenta absorbs the middle, green; an ideal yellow absorbs the short, blue. Lay cyan on magenta and the only light both let through is blue. Cyan on yellow leaves green; magenta on yellow, red. All three together absorb everything, and the paper goes black.',
        },
        {
          type: 'p',
          text: 'This is why the subtractive primaries are cyan, magenta and yellow, not the painter’s red, yellow and blue. Each process ink controls one third of the spectrum, which is to say one of the eye’s three cone channels, almost independently of the others. A red ink, by contrast, absorbs both green and blue, so it cannot be combined to make a clean green or blue at all.',
        },
        { type: 'h', text: 'Why printers add black' },
        {
          type: 'p',
          text: 'Real inks are not ideal. Every cyan also absorbs a little green, every magenta a little blue, and the three together make a dark, muddy brown rather than a true black. Printers add a fourth ink, black, which they call *K*; the letter is usually said to stand for *key*, the plate that carries the detail and to which the others are aligned. K brings several things at once: a deep, neutral black; sharp black text from a single plate, which cannot be blurred by the colors slipping out of register; less ink on the paper, since three layers of wet ink smear and dry slowly; and lower cost, since black ink is cheap. In a separation, *gray-component replacement* takes the gray that cyan, magenta and yellow would have made together and prints it with black instead.',
        },
        {
          type: 'aside',
          title: 'Per channel or per wavelength',
          text: 'The plate mixes its inks the way a canvas does, multiplying red, green and blue separately. That is exact only for "block" inks that absorb all or nothing in each third of the spectrum. Done properly, wavelength by wavelength with the piece’s own absorbance curves, cyan, magenta and yellow together give a dark warm brown, about #3D2615, rather than the near-black the plate shows; and that brown is what a real press makes, one more reason for K.',
        },
      ],
    },
    {
      id: 'halftone',
      kicker: 'Printing',
      title: 'Dots, angles and rosettes',
      blocks: [
        {
          type: 'p',
          text: 'A printing press is binary: at any point there is ink or there is not. To print a light pink it prints small magenta dots with paper between them, and the eye, again unable to resolve them, averages the dots and the paper into a tint. This is *halftoning*. The fraction of the area covered, the *dot area* $a$, sets the tone; to a first approximation (the Murray–Davies equation) the reflectance of a tint is the area-weighted average of ink and paper:',
        },
        { type: 'math', tex: 'R_{\\text{tint}} = a\\, R_{\\text{ink}} + (1 - a)\\, R_{\\text{paper}}' },
        {
          type: 'p',
          text: 'With several inks the dots fall partly on top of one another, and the color is the average of all the combinations that occur: paper, each ink alone, each pair, all three. Hans Neugebauer wrote this down in 1937; with independent screens, the area of each combination is a product of the dot areas, for example $a_c a_m (1 - a_y)$ for the blue made where cyan and magenta overlap without yellow. Real prints add a complication the equations above ignore: light enters the paper beside a dot and comes out beneath it, so dots look larger and darker than they are, which J. A. C. Yule and W. J. Nielsen modeled in 1951.',
        },
        { type: 'h', text: 'A short history of the screen' },
        {
          type: 'p',
          text: 'In 1852 William Henry Fox Talbot patented a way of breaking a photograph into printable marks by exposing it through a fabric gauze. Through the 1880s several inventors, among them Georg Meisenbach in Munich and Frederic Ives in Philadelphia, developed practical halftone processes, and in the 1890s Louis and Max Levy perfected glass screens ruled with fine crossed lines, which turned a continuous photograph into dots of varying size. Within a decade halftone photographs had replaced engravings in newspapers and magazines. Today the dots are computed, but the vocabulary survives: a screen of 150 lines per inch is a magazine, 85 a newspaper.',
        },
        { type: 'h', text: 'Moiré, and the angles' },
        {
          type: 'p',
          text: 'Lay two regular grids of dots on top of each other and a larger, slower pattern appears: *moiré*, the beat between two frequencies. For two gratings of the same spatial frequency $f$ turned by an angle $\\Delta\\theta$, the beat has frequency',
        },
        { type: 'math', tex: 'f_{\\text{moiré}} = 2f \\sin\\frac{\\Delta\\theta}{2}', caption: 'Small angles give slow, coarse, highly visible beats; large angles give fast ones, close to the screen’s own fineness.' },
        {
          type: 'p',
          text: 'Square grids repeat every 90°, so the largest angle two of them can differ by is 45°, and three must share the quarter-turn. The traditional answer puts the three strong inks 30° apart, cyan at 15° (equivalently 105°), black at 45° and magenta at 75°, and tucks yellow, the least visible ink, at 0°, only 15° from cyan and magenta. At 30° the beat is about half the screen frequency, fine enough to read as texture: a pattern of small rings and flowers called the *rosette*. When the plates are in register the rosettes are stable; when one slips, they shift and can open into visible moiré.',
        },
        { type: 'figure', svg: angleFigure, alt: 'Four rays at 0, 15, 45 and 75 degrees labeled Y, C, K and M; beside them two square grids of dots overlaid at 30 degrees.', caption: 'The classic screen angles, and what two of them make together.' },
      ],
    },
    {
      id: 'piece',
      kicker: 'Implementation',
      title: 'How the piece works',
      blocks: [
        {
          type: 'p',
          text: 'Light and Ink is one TypeScript module drawing to a canvas split into two halves: night on the left (or on top, on a tall screen) and paper on the right. Its timeline is a pure function of time: lights arrive at 0.8, 2.0 and 3.2 s and glide into a Venn at 4.4 s; the inks follow from 5.0 s and glide together at 8.8 s; black arrives at 12.6 s and the loupe at 13.4 s. At 23.8 s a picture is scanned onto the screen, and from 28.6 s it is printed plate by plate, yellow, magenta, cyan, black. Whatever you drag keeps its new place until the discs fade, and the loupe stays wherever you leave it.',
        },
        { type: 'h', text: 'The lights' },
        {
          type: 'p',
          text: 'Each pool is a radial gradient of one pure primary, flat to 84 percent of its radius and fading to nothing at the rim, drawn in the canvas’s additive mode. Where two overlap the channel values simply add, so red and green give exactly (1, 1, 0), yellow, and all three give white: the sum the eye makes, made by the screen you are reading it on. The diagram in the corner plots the three primaries on the CIE chromaticity diagram, with the mixtures on the triangle’s edges and white at D65.',
        },
        { type: 'h', text: 'The inks' },
        {
          type: 'p',
          text: 'The ink colors are not picked from a swatch book. Each ink is defined by an absorbance spectrum: a soft step above 590 nm for cyan, a band around 545 nm (steeper on its red side) for magenta, a step below 485 nm for yellow, each with a little unwanted absorption elsewhere, and a flat optical density of 1.6 for black. Equation (1) turns each into a reflectance spectrum, which is integrated under daylight against the CIE observer and expressed relative to the paper:',
        },
        {
          type: 'code',
          code: `function inkColour(inks: InkKey[]): Rgb {
  let X = 0
  let Y = 0
  let Z = 0
  let X0 = 0
  let Y0 = 0
  let Z0 = 0
  for (let nm = 380; nm <= 730; nm += 5) {
    const E = planck(nm, 6504)
    let a = 0
    for (const k of inks) a += ABS[k](nm)
    const R = Math.pow(10, -a)
    const c = cmf(nm)
    X += E * R * c[0]
    Y += E * R * c[1]
    Z += E * R * c[2]
    X0 += E * c[0]
    Y0 += E * c[1]
    Z0 += E * c[2]
  }
  const l = xyzToLinear([X, Y, Z])
  const p = xyzToLinear([X0, Y0, Z0])
  return toSrgb([Math.max(0, l[0] / p[0]) * PAPER[0], Math.max(0, l[1] / p[1]) * PAPER[1], Math.max(0, l[2] / p[2]) * PAPER[2]])
}`,
          caption: 'Beer–Lambert under daylight, approximated by a 6504 K blackbody. The results are close to the familiar process colors: cyan #00A6E9, magenta #F0368C, yellow #F6DC00.',
        },
        {
          type: 'p',
          text: 'The reflectance curves are drawn in the paper half’s corner. Each ink disc is a halftone: a grid of round dots at its screen angle, anchored at the disc’s center, whose coverage is 84 percent in the middle and falls smoothly to zero at the rim, so the dots shrink toward the edge. A dot of coverage $a$ has radius $c\\sqrt{a/\\pi}$ in a cell of side $c$ until neighboring dots touch at 78.5 percent; beyond that the circles grow into one another and close the gaps. Each disc is drawn once, at the screen’s resolution, into its own transparent film, and the films are laid onto the paper with the canvas’s multiply mode, so a disc can be dragged without redrawing a single dot.',
        },
        {
          type: 'code',
          code: `/** Visit every halftone cell of a screen (angle a, cell c) whose centre lies within (qx, qy, qr) of a grid anchored at (ox, oy). */
function cells(a: number, c: number, ox: number, oy: number, qx: number, qy: number, qr: number, fn: (x: number, y: number) => void) {
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const dx = qx - ox
  const dy = qy - oy
  // the query center in grid units
  const u0 = (dx * ca + dy * sa) / c
  const v0 = (-dx * sa + dy * ca) / c
  const n = Math.ceil(qr / c) + 1
  for (let i = Math.floor(u0 - n); i <= Math.ceil(u0 + n); i++) {
    for (let j = Math.floor(v0 - n); j <= Math.ceil(v0 + n); j++) {
      const x = ox + (i * ca - j * sa) * c
      const y = oy + (i * sa + j * ca) * c
      if ((x - qx) ** 2 + (y - qy) ** 2 > qr * qr) continue
      fn(x, y)
    }
  }
}`,
          caption: 'One routine places every dot on the plate, and finds just the few dozen under the loupe.',
        },
        { type: 'h', text: 'The picture' },
        {
          type: 'p',
          text: 'The apple is drawn procedurally, with canvas paths and gradients, into a small bitmap with one pixel per screen pixel of the night half’s picture. As light, every pixel becomes three stripes, red, green and blue, above a thin dark row, scaled up without smoothing so the stripes stay crisp. The stripes alone are a third as bright as the picture, because each primary lights only a third of the pixel, so a soft, unstriped copy is added on top, standing in for the way your eye averages them at arm’s length. As print, the same bitmap is separated into four plates:',
        },
        {
          type: 'code',
          code: `const K = 1 - Math.max(r, gg, b)
const k = K * 0.75
sepK[q] = k
sepC[q] = clamp((1 - r - k) / (1 - k))
sepM[q] = clamp((1 - gg - k) / (1 - k))
sepY[q] = clamp((1 - b - k) / (1 - k))`,
          caption: 'A textbook separation with 75 percent gray-component replacement: most of the darkness common to all three inks goes to the black plate.',
        },
        {
          type: 'p',
          text: 'Each plate is screened at its own angle, on a grid 10 percent finer than the discs’, and drawn once into its own film. The print then lays the films down one at a time with a roller line, as progressive proofs: yellow alone, then with magenta, then cyan, then black, the order a printer would use to check a job.',
        },
        { type: 'h', text: 'The loupe' },
        {
          type: 'p',
          text: 'A bitmap blown up four times would be blurry, so the loupe does not magnify pixels. Over the paper it asks `cells` for the dots of every film within its view and redraws them as vectors, four times larger, multiplied onto paper, so the rosettes are as sharp as a real linen tester shows them. Over the night half it draws the screen’s subpixels: for each pixel in view it adds up the light from the pools (or reads the picture) and draws three bars in that pixel’s red, green and blue. In the middle of the white overlap, the loupe shows that white is three colors.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Legend',
      title: 'Reading the drawing',
      blocks: [
        {
          type: 'list',
          items: [
            '**The lamps** at the top of the night half throw hairline beams to their pools; each pool is labeled with its primary and its CIE chromaticity.',
            '**Letters in the overlaps** name what the mixtures make: Y, C, M and W on the night half; B, G and R on the paper half. The equations under each Venn say the same thing in symbols.',
            '**The chromaticity diagram** (night half, top right) is the CIE 1931 horseshoe with a few wavelengths marked, the sRGB triangle, the three lamps at its corners and, once they mix, yellow, cyan, magenta and white.',
            '**The reflectance plot** (paper half, top right) shows $R(\\lambda) = 10^{-A(\\lambda)}$ for the three inks: each removes one third of the spectrum.',
            '**Under each ink**, its screen angle. The black disc is labeled K · 45°.',
            '**The control strips** at the bottom right are set like a printer’s color bar: the six colors of light and white; the four inks and their overprints.',
            '**During the print:** the plate being laid down, its ink and angle, and a small fan of the screen angles used so far.',
            '**Registration marks and crop marks** frame the paper; the night half has the corner marks of a screen.',
          ],
        },
        {
          type: 'table',
          head: ['Time', 'Night half', 'Paper half'],
          rows: [
            ['0–7 s', 'Red, green, blue arrive; they glide together. "Light adds."', 'The inks arrive from 5 s'],
            ['8–21 s', 'Yellow, cyan, magenta, white', 'Blue, green, red, near-black; K at 12.6 s; the loupe at 13.4 s. "Ink takes away."'],
            ['21–24 s', 'The lights go out', 'The inks fade'],
            ['24–46 s', 'The apple scanned onto a screen. "Every screen is three colors."', 'Printed Y, M, C, K from 28.6 s. "Every print is four." The loupe crosses the print, then the screen.'],
            ['46–50 s', 'Fade', 'Fade, and again'],
          ],
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Honesty',
      title: 'Liberties taken',
      blocks: [
        {
          type: 'list',
          items: [
            '**Your screen draws the inks.** Real process inks are not all inside the sRGB gamut, and print is seen by reflected light; the paper half is a simulation of print on a device that adds light.',
            '**Per-channel multiplication** stands in for per-wavelength subtraction, as the aside above explains; the CMY overlap is darker and greener than a real press would make it.',
            '**Idealized inks.** The absorbance curves are smooth shapes tuned to look like process inks, not measurements of any particular ink set.',
            '**No dot gain.** Paper is treated as a perfect white reflector under the dots; there is no spreading of ink and no light scattered sideways in the paper.',
            '**Coarse screens.** The dots are a few pixels across so that they can be seen; a magazine’s are about a sixth of a millimeter apart.',
            '**One subpixel layout.** Vertical RGB stripes, the common LCD arrangement; the soft copy of the picture added over them is a stand-in for the eye’s averaging.',
            '**Flat spotlights.** Real stage lights are not uniform discs, and real overlaps rarely balance to a neutral white without adjustment.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'On the theory of light and colours', by: 'Thomas Young', year: '1802', note: '*Philosophical Transactions of the Royal Society* 92. Three receptors.' },
    { title: 'Experiments on colour, as perceived by the eye, with remarks on colour-blindness', by: 'James Clerk Maxwell', year: '1855', note: '*Transactions of the Royal Society of Edinburgh* 21.' },
    { title: 'On the theory of three primary colours', by: 'James Clerk Maxwell', year: '1861', note: 'The Royal Institution lecture at which the tartan ribbon was shown.' },
    { title: 'Zur Theorie der Farbenmischung', by: 'Hermann Grassmann', year: '1853', note: '*Annalen der Physik* 89. The laws of additive mixing.' },
    { title: 'A Standard Default Color Space for the Internet: sRGB', by: 'Michael Stokes, Matthew Anderson, Srinivasan Chandrasekar & Ricardo Motta', year: '1996', note: 'The proposal behind IEC 61966-2-1.' },
    { title: 'Die theoretischen Grundlagen des Mehrfarbenbuchdrucks', by: 'Hans E. J. Neugebauer', year: '1937', note: '*Zeitschrift für wissenschaftliche Photographie* 36. The color of a halftone.' },
    { title: 'The penetration of light into paper and its effect on halftone reproduction', by: 'J. A. C. Yule & W. J. Nielsen', year: '1951', note: 'TAGA Proceedings. Why dots look bigger than they are.' },
    { title: 'The Reproduction of Colour', by: 'R. W. G. Hunt', note: 'Wiley. The standard text on photography, print and television color.' },
    { title: 'Handbook of Print Media', by: 'Helmut Kipphan (ed.)', year: '2001', note: 'Springer. Presses, screens and process control.' },
    { title: 'Digital Halftoning', by: 'Robert Ulichney', year: '1987', note: 'MIT Press.' },
    { title: 'The Theory of the Moiré Phenomenon', by: 'Isaac Amidror', note: 'Springer. Rosettes and beats, in full.' },
  ],
}

export default guide
