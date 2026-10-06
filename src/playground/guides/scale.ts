import type { Guide } from '../guide'

const framesFigure = `<svg viewBox="0 0 420 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <rect x="60" y="20" width="180" height="180" opacity="0.8"/>
  <rect x="132" y="92" width="36" height="36" opacity="0.8"/>
  <rect x="146.4" y="106.4" width="7.2" height="7.2" opacity="0.8"/>
  <path d="M78 20 v4 M96 20 v4 M114 20 v4 M132 20 v4 M150 20 v6 M168 20 v4 M186 20 v4 M204 20 v4 M222 20 v4" opacity="0.5"/>
  <text x="60" y="14" font-family="Instrument Serif, serif" font-size="16" fill="currentColor" stroke="none">10<tspan font-size="10" dy="-7">n</tspan></text>
  <text x="132" y="87" font-family="Instrument Serif, serif" font-size="11" fill="currentColor" stroke="none">10<tspan font-size="7" dy="-5">n−1</tspan></text>
  <line x1="60" y1="212" x2="240" y2="212" opacity="0.6"/>
  <path d="M60 208 v8 M240 208 v8" opacity="0.6"/>
  <text x="270" y="60" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">SIDE = S₀ · 10^(n − E)</text>
  <text x="270" y="84" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">EACH SQUARE IS TEN TIMES</text>
  <text x="270" y="98" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">THE ONE INSIDE IT</text>
  <text x="270" y="130" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">E RISES 1 → EVERY SQUARE</text>
  <text x="270" y="144" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">TAKES ITS PARENT’S PLACE</text>
</svg>`

const rulerFigure = `<svg viewBox="0 0 420 120" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="20" y1="40" x2="400" y2="40" opacity="0.6"/>
  <path d="M20 40 v-6 M58 40 v-3 M96 40 v-3 M134 40 v-3 M172 40 v-3 M210 40 v-6 M248 40 v-3 M286 40 v-3 M324 40 v-3 M362 40 v-3 M400 40 v-6" opacity="0.6"/>
  <text x="20" y="26" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">0</text>
  <text x="210" y="26" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">50</text>
  <text x="400" y="26" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">100</text>
  <text x="20" y="58" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.6">LINEAR</text>
  <line x1="20" y1="90" x2="400" y2="90" stroke="#2B6A93"/>
  <path d="M20 90 v-6 M134.4 90 v-4 M201.3 90 v-4 M248.8 90 v-4 M285.6 90 v-4 M315.7 90 v-4 M341.2 90 v-4 M363.2 90 v-4 M382.6 90 v-4 M400 90 v-6" stroke="#2B6A93"/>
  <text x="20" y="76" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" text-anchor="middle">1</text>
  <text x="201" y="76" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" text-anchor="middle">3</text>
  <text x="400" y="76" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" text-anchor="middle">10</text>
  <text x="20" y="108" font-family="Geist Mono, monospace" font-size="8" fill="#2B6A93" stroke="none" opacity="0.8">LOGARITHMIC · EQUAL STEPS ARE EQUAL RATIOS</text>
</svg>`

const guide: Guide = {
  lede: 'Two hands almost touching on a blanket in a park, and then, every few seconds, ten times farther: a city, a coast, the Earth, the planets, the stars, the Milky Way, the Local Group, the cosmic web and the edge of what light has had time to show us. Then all the way back, through the skin of a fingertip, to an atom and the protons at its heart.',
  facts: [
    ['After', 'Kees Boeke, *Cosmic View*, 1957; Charles and Ray Eames, *Powers of Ten*, 1977'],
    ['Range', '$10^{-15}$ m to $10^{27}$ m: 42 orders of magnitude'],
    ['The zoom', 'One number, the exponent $E$; a $10^n$ m square is $S_0 \\cdot 10^{n-E}$ px wide'],
    ['Pace', 'One power of ten in the first ten seconds, then about one a second'],
    ['Precision', 'Each layer drawn in its own frame of reference, in double precision'],
    ['Coastline', 'Fractal noise with 15 octaves, faded in as they become visible'],
    ['Atom', 'Carbon: 1s and 2s/2p electrons sampled from hydrogen-like $|\\psi|^2$'],
    ['Stars', 'The 15 nearest bright neighbours at their real galactic positions and temperatures'],
    ['Running time', '118 s, looping from the hands back to the hands'],
  ],
  interact: {
    keys: [
      { keys: ['→', '↑'], action: 'Hold on the next power of ten out' },
      { keys: ['←', '↓'], action: 'Hold on the next power of ten in' },
      { keys: ['Space'], action: 'Pause or resume' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag up to zoom out and down to zoom in (sideways works too); let go and it glides, then the film picks up again' },
      { gesture: 'tap', action: 'Tap to hold on the nearest power of ten; tap again to go on' },
      { gesture: 'tap', action: 'Tap or drag the exponent ruler along the bottom to jump straight to any scale' },
    ],
    tip: 'Hold on 10⁷ m and look at the Earth for a while. Then press ← nine times and you are on your fingertip.',
  },
  pad: {
    left: [{ label: '‹ ÷10', code: 'ArrowLeft', aria: 'Zoom in one power of ten', wide: true }],
    right: [{ label: '×10 ›', code: 'ArrowRight', aria: 'Zoom out one power of ten', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Scale',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'A hand is about twenty centimetres long. The Earth is about sixty million hands across; the distance to the nearest star is about two hundred thousand billion hands. In the other direction, a hand is about a billion carbon atoms long, and the nucleus of each of those atoms is tens of thousands of times smaller than the atom itself. Numbers like these are easy to write and impossible to feel. This piece tries a different approach: instead of comparing sizes, it travels through them, one factor of ten at a time, at a steady pace, so that each step feels like the last.',
        },
        { type: 'h', text: 'A book, a sketch and a film' },
        {
          type: 'p',
          text: 'The idea has a lovely history. In 1957 Kees Boeke, a Dutch educator who ran a progressive school called the Werkplaats in Bilthoven, published a short book called *Cosmic View: The Universe in 40 Jumps*. It begins with a drawing of a girl sitting in a chair outdoors, holding a cat, and each following picture shows a region ten times wider, out past the Earth and the Sun to the galaxies; then the pictures go the other way, ten times smaller each time, down to the nucleus of an atom. Each plate comes with a short note on what it shows.',
        },
        {
          type: 'p',
          text: 'The designers Charles and Ray Eames came across the book and in 1968 made *A Rough Sketch for a Proposed Film Dealing with the Powers of Ten and the Relative Size of Things in the Universe*. Their finished film, *Powers of Ten*, followed in 1977. It opens on a couple picnicking on a blanket by the lake in Chicago, then rises ten times farther every ten seconds until the frame holds ten to the twenty-fourth metres, before plunging back down into the man’s hand, to a carbon nucleus and a proton. The physicist Philip Morrison, who narrated it, later wrote an accompanying book with Phylis Morrison and the Office of Charles and Ray Eames. The film was added to the United States National Film Registry in 1998, and it remains one of the best-known science films ever made.',
        },
        {
          type: 'p',
          text: 'This piece is an homage to both, not a copy. It begins with two hands about to touch rather than a picnic, it travels on to the edge of the observable universe (a scale whose size has been measured well only since the Eameses’ film), and its world is drawn as a technical plate: hairline frames, each exponent set in serif at its corner, a scale bar under each, and the Earth’s coastlines generated rather than traced.',
        },
        { type: 'h', text: 'What lives at each scale' },
        {
          type: 'table',
          head: ['Power', 'In the piece', 'For a sense of it'],
          rows: [
            ['$10^{-15}$ m', 'A proton: three quarks and the gluon field between them', 'A proton’s charge radius is 0.84 femtometres'],
            ['$10^{-14}$ m', 'A carbon nucleus: six protons, six neutrons', 'About 5 fm across; nearly all the atom’s mass'],
            ['$10^{-10}$ m', 'A carbon atom’s electron cloud', 'A few tenths of a nanometre; the nucleus is a dot at its centre'],
            ['$10^{-9}$ m', 'The DNA double helix', '2 nm wide, a full turn every 3.4 nm'],
            ['$10^{-8}$ m', 'DNA wound on histones (nucleosomes)', 'Two metres of DNA fold into each cell nucleus'],
            ['$10^{-5}$ m', 'Skin cells, each with its nucleus', 'Most of your cells are 10–30 micrometres'],
            ['$10^{-3}$ m', 'A fingerprint’s ridges and sweat pores', 'Ridges about half a millimetre apart'],
            ['$10^{0}$ m', 'Two hands', 'You'],
            ['$10^{4}$ m', 'A city by the water', 'An afternoon’s walk'],
            ['$10^{7}$ m', 'The Earth', '12,742 km across; light crosses it in 43 ms'],
            ['$10^{9}$ m', 'The Moon’s orbit', '384,400 km; 1.3 light-seconds'],
            ['$10^{11}$–$10^{13}$ m', 'The planets', 'Eight light-minutes to the Sun, four light-hours to Neptune'],
            ['$10^{14}$ m', 'The heliosphere and the Voyagers', 'Voyager 1 is about one light-day away'],
            ['$10^{17}$ m', 'The nearest stars', 'Alpha Centauri, 4.37 light-years'],
            ['$10^{21}$ m', 'The Milky Way', 'About 100,000 light-years across; the Sun 26,000 from its centre'],
            ['$10^{23}$ m', 'The Local Group', 'Andromeda, 2.5 million light-years away'],
            ['$10^{25}$ m', 'The cosmic web', 'Galaxies along filaments around empty voids'],
            ['$10^{27}$ m', 'The observable universe', '93 billion light-years across'],
          ],
          caption: 'Highlights of the journey; the piece names every power of ten in its title and on its frames.',
        },
        { type: 'h', text: 'Emptiness, twice' },
        {
          type: 'p',
          text: 'The journey has a symmetry that the Eameses noticed and this piece borrows for its last caption. Going out, most of what the frame holds is empty: the planets are specks on their orbits, the nearest star is a dot four light-years away, galaxies are islands separated by millions of light-years of almost nothing. Coming in, after the crowded scales of cells and molecules, the atom is empty in the same way. A carbon atom’s nucleus is about 5 femtometres across inside a cloud of electrons some sixty thousand times wider. If the nucleus were a grain of sand, the electrons would be a faint haze filling a stadium. The solid world is built almost entirely of fields and space.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Logarithms, and why they feel strange',
      blocks: [
        {
          type: 'p',
          text: 'The tool for travelling through scales is the logarithm. The base-ten logarithm of a length counts its powers of ten: $\\log_{10}(1000\\ \\text{m}) = 3$, $\\log_{10}(0.001\\ \\text{m}) = -3$. Multiplying a length by ten adds one to its logarithm, so a journey in which each step multiplies by ten is, in logarithms, a walk along a ruler at a steady pace.',
        },
        { type: 'math', tex: 'E = \\log_{10}\\!\\left(\\frac{L}{1\\ \\text{m}}\\right), \\qquad L = 10^{E}\\ \\text{m}', label: '(1)', caption: '$E$ is the exponent the piece animates. The readout *Power* shows it; the ruler along the bottom is a ruler of $E$.' },
        {
          type: 'p',
          text: 'Our intuition for quantity is not built this way. Asked to place numbers on a line from 1 to 100, young children crowd the small numbers apart and squash the large ones together, a roughly logarithmic placement; with schooling the placement becomes linear, at least for familiar ranges (Robert Siegler and John Opfer studied this in 2003). Stanislas Dehaene and colleagues found, in 2008, that adults of the Mundurukú people in the Amazon, with little formal schooling, also tended to place quantities logarithmically. A common reading of such results is that an innate sense of number compares ratios, and that the even, additive number line is a cultural tool we learn. Whatever the right account, trained adults handle *differences* well and *ratios* across many orders of magnitude badly, which is exactly what this piece is designed to exercise.',
        },
        { type: 'figure', svg: rulerFigure, alt: 'Two rulers: a linear one from 0 to 100 with evenly spaced ticks, and a logarithmic one from 1 to 10 whose ticks crowd together toward 10.', caption: 'On a logarithmic ruler the distance from 1 to 10 equals the distance from 10 to 100, and from 100 to 1,000.' },
        { type: 'h', text: 'A seamless zoom' },
        {
          type: 'p',
          text: 'Draw the square of side $10^n$ metres at $S_0 \\cdot 10^{\\,n - E}$ pixels, where $S_0$ is a fixed size on the screen. When $E = n$ that square is exactly $S_0$ wide; as $E$ rises by one, it shrinks by ten and its parent, the $10^{n+1}$ square, takes its place. Because the picture depends only on the fractional part of $E$ and the content at each level, the frames repeat perfectly every unit of $E$, and changing $E$ at a constant rate gives a zoom of constant apparent speed. That is the exponential zoom of the Eames film, and it is the only kind that feels steady: a linear zoom would race through the small scales and crawl through the large ones.',
        },
        { type: 'math', tex: '\\text{px per metre} = k = \\frac{S_0}{10^{E}}, \\qquad \\frac{d \\ln k}{dt} = -\\ln 10 \\,\\frac{dE}{dt}', label: '(2)' },
        {
          type: 'p',
          text: 'In the first ten seconds $E$ rises by one, from $10^{-0.6}$ to $10^{0.4}$ metres: ten times farther in ten seconds, the Eameses’ pace. After that the piece speeds up, to about a power of ten a second on the way out and faster on the long fall back to the hands, so that the whole journey fits in two minutes; it slows down at the Earth, the edge of the universe and the atom, where the captions sit. The readout *Pace* gives the current rate.',
        },
        { type: 'h', text: 'Some numbers that set the scene' },
        {
          type: 'list',
          items: [
            '**Light-crossing time.** The readout *Light crosses it in* is $10^{E}\\ \\text{m}$ divided by $c = 299{,}792{,}458$ m/s: 3.3 nanoseconds for one metre, 43 milliseconds for the Earth, about 100 billion years for the frame that holds the observable universe.',
            '**The astronomical unit** is 149,597,870,700 m, the mean distance from the Earth to the Sun. **A light-year** is 9.4607 × 10¹⁵ m. **A parsec** is 3.0857 × 10¹⁶ m, about 3.26 light-years.',
            '**The observable universe** has a radius of about 46.5 billion light-years, though it is 13.8 billion years old, because space has expanded while the light was travelling. Its edge, as drawn, is the cosmic microwave background, the oldest light.',
            '**The heliopause**, where the Sun’s wind gives way to interstellar gas, was crossed by Voyager 1 in 2012 at about 121 AU and by Voyager 2 in 2018 at about 119 AU. Voyager 1 is expected to be one light-day, about 173 AU, from the Sun around the end of 2026.',
          ],
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'Implementation',
      title: 'How the piece works',
      blocks: [
        {
          type: 'p',
          text: 'Scale is a single TypeScript module drawing to one canvas. Everything on screen is a function of one number, the exponent $E$, which a smooth monotone curve through 45 keyframes moves from the hands out to $10^{27}$ metres, back in to $10^{-15}$ and out again in 118 seconds. You can take $E$ over at any moment. Each order of magnitude has its own procedural layer, and each layer fades in and out over a range of $E$ chosen so that two or three overlap at any time, with the hairline frames drawn on top.',
        },
        { type: 'h', text: 'Forty-two orders of magnitude in double precision' },
        {
          type: 'p',
          text: 'A double-precision number carries about sixteen significant digits, so one coordinate system cannot hold both a fingertip and the edge of the universe. The piece uses a chain of frames of reference instead: the hands’ plan (metres from the palm), the Sun relative to the Earth, the galactic centre relative to the Sun, the Local Group relative to the Milky Way. Each layer is drawn about its own anchor, and the camera glides from one anchor to the next only while the scale makes the move invisible. Below the human scale a second camera, relative to the fingertip, takes over, so the protons are computed from offsets of femtometres, not from the Earth’s orbit.',
        },
        {
          type: 'code',
          code: `function setCamera(e: number) {
  E = clamp(e, E_MIN, E_MAX)
  k = S0 / p10(E)                     // px per metre
  const c1 = smoothstep(10.55, 11.55, E) // to the Sun
  const c2 = smoothstep(19.75, 20.85, E) // to the galactic centre
  const c3 = smoothstep(22.35, 23.25, E) // to the Local Group
  const c4 = smoothstep(24.8, 25.9, E)   // the universe is centred on us
  // at the human scale the camera sits between the two hands; below it, on the fingertip
  const wq = smoothstep(-1.5, -0.9, E) * (1 - smoothstep(0.5, 1.4, E))
  const wm = 1 - smoothstep(-1.75, -0.95, E)
  const hx = lerp(Q.x * wq, M.x, wm)
  const hy = lerp(Q.y * wq, M.y, wm)
  cam.x = (1 - c4) * (SUN.x * c1 + GC.x * c2 + LG.x * c3) + hx
  cam.y = (1 - c4) * (SUN.y * c1 + GC.y * c2 + LG.y * c3) + hy
  camM.x = (wm - 1) * M.x + (1 - wm) * Q.x * wq   // the camera, from the fingertip
  camM.y = (wm - 1) * M.y + (1 - wm) * Q.y * wq
}`,
          caption: 'The camera. Outside each transition the weights are exactly 0 or 1, so the arithmetic stays exact where it matters.',
        },
        { type: 'figure', svg: framesFigure, alt: 'Nested squares, each ten times smaller than the one around it, with exponents at their corners.', caption: 'The plate: one square per power of ten, each divided into ten along its top and left edges.' },
        { type: 'h', text: 'A coastline that keeps getting longer' },
        {
          type: 'p',
          text: 'The planet’s land is a sum of fifteen octaves of Perlin noise sampled on the unit sphere, so it wraps without seams, from continents thousands of kilometres across down to bays a few hundred metres wide. Rather than computing every octave everywhere, each frame fades in only the octaves that are large enough to see at the current zoom. As you approach, smaller and smaller wiggles appear, and the coast gets longer without limit, as Lewis Fry Richardson found for real coastlines and Benoit Mandelbrot made famous in 1967.',
        },
        {
          type: 'code',
          code: `const mPerNode = g / k            // metres between samples on screen
for (let o = 0; o < NO; o++) {
  const lam = R_E / LFQ[o]        // the octave's wavelength in metres
  WT[o] = smoothstep(2.8 * mPerNode, 5.6 * mPerNode, lam)
  // octaves under about three coarse cells can hide inside one
  if (lam < (3 * CG) / k) fine += WT[o] * LAM[o]
}
landMargin = fine * 0.9 + 0.03`,
          caption: 'From `sampleLand()`. The coast is traced by marching squares on a coarse grid, refined to 8-pixel cells only where the land might cross zero.',
        },
        {
          type: 'p',
          text: 'Where the hands lie is chosen once, at load: the piece searches the planet for a point on a continent, dry within two kilometres in every direction and with the sea four to seven kilometres away in a few directions, so that the city it draws sits by the water and the coast appears when it should. A small rise in the land there keeps the blanket dry at every resolution. The city is a street grid every hundred metres with avenues every four hundred, kept on land and off the river, and the park is one block of it. The globe adds a graticule, a hairline atmosphere and hatching on the night side.',
        },
        { type: 'h', text: 'Atoms by probability' },
        {
          type: 'p',
          text: 'The carbon atom is not drawn as a solar system. Its six electrons occupy the 1s, 2s and 2p orbitals, and the piece draws 2,900 sample positions, each drawn from the probability density $|\\psi|^2$ of a hydrogen-like orbital with Clementi and Raimondi’s effective nuclear charges (about 5.67 for the 1s electrons and 3.2 for the outer ones). For 1s the radial density is $r^2 e^{-2Zr/a_0}$, a gamma distribution, which is the sum of three exponential variates:',
        },
        {
          type: 'code',
          code: `// 1s, Z_eff ≈ 5.67: radial density r² e^(−2Zr/a0), a Gamma(3) variate
for (let k = 0; k < nE1; k++) {
  const rr = (-a0 / (2 * 5.67)) * Math.log(r() * r() * r())
  const ct = r() * 2 - 1           // an isotropic direction
  const an = r() * TAU
  const st = Math.sqrt(1 - ct * ct)
  ELEC[i++] = rr * st * Math.cos(an)
  ELEC[i++] = rr * st * Math.sin(an)
}`,
          caption: 'The 2s density, $r^2(2 - \\rho)^2 e^{-\\rho}$, is sampled by rejection; the 2p lobes by a radial gamma variate times $\\cos^2$ about each axis.',
        },
        {
          type: 'p',
          text: 'The nucleus is twelve nucleons at the corners of an icosahedron about 3 fm across, the protons hatched; the zoom ends inside the front-most proton, where three quarks are joined by the wavy lines of the gluon field. The other layers are similar small models: a double helix with base pairs every 0.34 nm, nucleosomes every 17 nm, a nucleus with its double membrane, pores and chromatin, a honeycomb of skin cells, a whorl of ridges with sweat pores, the planets on their true orbits, the heliosphere with the two Voyagers, an Oort cloud, a few thousand stars along the Orion Spur, a barred spiral galaxy of 12,000 points, the Local Group, and two populations of galaxies along filaments for the cosmic web.',
        },
        {
          type: 'p',
          text: 'Point clouds are drawn as tiny squares batched into one path per colour; frames and labels go through the same halo routine so they stay legible over any layer. The heaviest moments, the coast and the globe, cost about ten milliseconds a frame at 1920 × 1080; most scales cost one or two.',
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
            '**Square frames:** one per power of ten, its exponent in serif at the top-left corner, ten divisions along the top and left edges, and its width written beneath. A frame leaves just before the screen would cut it.',
            '**Title, top left:** the largest power of ten wholly in view, in words. **Along the frame’s top edge:** what lives at that scale.',
            '**Readouts, top right:** the exponent, the width of the frame in everyday units, the time light takes to cross it, and the pace of the zoom (or *Holding*, or *Yours* while you drive).',
            '**Exponent ruler, bottom:** $10^{-15}$ to $10^{27}$ metres, with landmarks from the nucleus to the edge. The playhead points the way the film is going.',
            '**Colours:** ink for structure, ocean blue for water and for the Earth’s orbit, moss for living things, and for stars the colour of a blackbody at their temperature.',
            '**The ring at the edge of the universe:** the oldest light, with small ticks standing in for its temperature fluctuations.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: at $10^{5}$ metres, how the coastline sprouts new bays as you approach it; at $10^{17}$, how nearby the nearest stars are compared with the next frame, which is already full of strangers; and on the way in, the long stretch of nearly empty frames between the outer electrons of the atom and its nucleus.',
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
            '**An imaginary Earth.** The coastlines, the city and the park are generated, not traced from a map. That keeps the drawing everyone’s home rather than one particular place, and lets the coast stay detailed at every scale. The Earth’s size, its Moon and the planets are real.',
            '**Plans, not views.** Each level is a plan drawing seen from above, as in Boeke’s plates. The Sun, the Galaxy and the Local Group are arranged in one plane for clarity; the solar system’s planets are placed at arbitrary points on their orbits.',
            '**Schematic structures.** The galaxy’s arms, the Local Group’s dwarfs beyond the brightest few, the cosmic web and the galaxies of the observable universe are statistical drawings, not maps. The cosmic web is a noise-shaped stand-in for the filaments seen in surveys.',
            '**Models of the small.** Real atoms do not have sharp electron positions; each dot is one possible measurement. The nucleus is not rigid, and quarks are not little balls. DNA is drawn flat, and its chromatin far more orderly than in a real nucleus.',
            '**Uneven pace.** After the first ten seconds the zoom runs much faster than the Eameses’ one power of ten every ten seconds, and slows near the captions.',
            '**Light-crossing time and the expanding universe.** At the largest scales the light-crossing time ignores the expansion of space, which makes it a measure of size, not of how long light from there has actually travelled.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Cosmic View: The Universe in 40 Jumps', by: 'Kees Boeke', year: '1957', note: 'John Day Company. The book that started it.' },
    { title: 'Powers of Ten', by: 'Charles and Ray Eames', year: '1977', note: 'Film, about nine minutes, narrated by Philip Morrison; preceded by *A Rough Sketch for a Proposed Film Dealing with the Powers of Ten and the Relative Size of Things in the Universe* (1968).' },
    { title: 'Powers of Ten: A Book About the Relative Size of Things in the Universe and the Effect of Adding Another Zero', by: 'Philip and Phylis Morrison and the Office of Charles and Ray Eames', year: '1982', note: 'Scientific American Library.' },
    { title: 'How Long Is the Coast of Britain? Statistical Self-Similarity and Fractional Dimension', by: 'Benoit Mandelbrot', year: '1967', note: '*Science* 156.' },
    { title: 'The Development of Numerical Estimation: Evidence for Multiple Representations of Numerical Quantity', by: 'Robert S. Siegler & John E. Opfer', year: '2003', note: '*Psychological Science* 14.' },
    { title: 'Log or Linear? Distinct Intuitions of the Number Scale in Western and Amazonian Indigene Cultures', by: 'Stanislas Dehaene, Véronique Izard, Elizabeth Spelke & Pierre Pica', year: '2008', note: '*Science* 320.' },
    { title: 'Atomic Screening Constants from SCF Functions', by: 'E. Clementi & D. L. Raimondi', year: '1963', note: '*The Journal of Chemical Physics* 38. The effective nuclear charges used for the carbon atom.' },
    { title: 'Improving Noise', by: 'Ken Perlin', year: '2002', note: '*ACM Transactions on Graphics* 21 (SIGGRAPH 2002). The noise behind the coastlines.' },
    { title: 'Expanding Confusion: Common Misconceptions of Cosmological Horizons and the Superluminal Expansion of the Universe', by: 'Tamara M. Davis & Charles H. Lineweaver', year: '2004', note: '*Publications of the Astronomical Society of Australia* 21. Why the observable universe is 93 billion light-years across.' },
  ],
}

export default guide
