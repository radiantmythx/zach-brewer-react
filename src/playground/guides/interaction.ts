import type { Guide } from '../guide'

const contrastFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <rect x="30" y="40" width="120" height="120" fill="#2c2a5a" stroke="none" opacity="0.9"/>
  <rect x="160" y="40" width="120" height="120" fill="#f1e49a" stroke="none"/>
  <rect x="73" y="83" width="34" height="34" fill="#a08866" stroke="none"/>
  <rect x="203" y="83" width="34" height="34" fill="#a08866" stroke="none"/>
  <text x="30" y="30" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">GROUND A · DARK</text>
  <text x="160" y="30" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">GROUND B · LIGHT</text>
  <path d="M90 125 L90 176 L220 176 L220 125" stroke-dasharray="2 3" opacity="0.6"/>
  <text x="104" y="190" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">THE SAME COLOR</text>
  <line x1="300" y1="40" x2="300" y2="160" opacity="0.25"/>
  <text x="314" y="62" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">P = X + k(X − G)</text>
  <text x="314" y="86" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">ON DARK: LOOKS</text>
  <text x="314" y="98" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">LIGHTER, WARMER</text>
  <text x="314" y="122" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">ON LIGHT: LOOKS</text>
  <text x="314" y="134" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">DARKER, GRAYER</text>
</svg>`

const homageFigure = `<svg viewBox="0 0 420 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <rect x="110" y="10" width="200" height="200"/>
  <rect x="130" y="40" width="160" height="160"/>
  <rect x="150" y="70" width="120" height="120"/>
  <rect x="170" y="100" width="80" height="80"/>
  <line x1="90" y1="10" x2="90" y2="100" stroke="#2B6A93"/>
  <line x1="86" y1="10" x2="94" y2="10" stroke="#2B6A93"/>
  <line x1="86" y1="100" x2="94" y2="100" stroke="#2B6A93"/>
  <text x="44" y="58" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">4.5 u</text>
  <line x1="90" y1="180" x2="90" y2="210" stroke="#3F7A55"/>
  <line x1="86" y1="180" x2="94" y2="180" stroke="#3F7A55"/>
  <line x1="86" y1="210" x2="94" y2="210" stroke="#3F7A55"/>
  <text x="44" y="199" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">1.5 u</text>
  <line x1="110" y1="140" x2="170" y2="140" stroke-dasharray="2 3" opacity="0.6"/>
  <text x="122" y="134" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">3 u</text>
  <text x="330" y="40" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">OUTER = 10 u</text>
  <text x="330" y="60" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">SIDES 10, 8, 6, 4</text>
  <text x="330" y="96" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">ABOVE : BESIDE</text>
  <text x="330" y="110" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">: BELOW</text>
  <text x="330" y="128" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">= 3 : 2 : 1</text>
</svg>`

const guide: Guide = {
  lede: 'Four book plates in motion, after Josef Albers’s *Interaction of Color*: one color that looks like two, two colors that look like one, a red that changes when its lines do, and four nested squares breathing through harmonies.',
  facts: [
    ['After', 'Josef Albers, *Interaction of Color*, Yale University Press, 1963'],
    ['Effects', 'Simultaneous contrast; assimilation (the Bezold effect)'],
    ['Contrast model', '$P = X + k(X - G)$ in OKLab, $k$ 0.18 for lightness, 0.10 for hue and chroma'],
    ['Plate I', 'One color, OKLCH 0.64 0.060 78°, on two grounds'],
    ['Plate II', 'Two colors $\\Delta E_{OK}$ 0.084 apart, chosen to look alike'],
    ['Plate III', 'One red, OKLCH 0.55 0.160 30°, under black and white lines'],
    ['Plate IV', 'Four squares, margins 3 : 2 : 1, five harmonies'],
    ['Running time', '70 s in four plates, looping; held while you drag'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next plate' },
      { keys: ['Space', 'Enter'], action: 'Reveal (plates I–III) or the next harmony (plate IV)' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Plates I and II: drag an inner square across onto the other ground, or slide a ground out from under its square' },
      { gesture: 'tap', action: 'Plates I and II: slide the grounds away and bring the squares together; tap again to put them back' },
      { gesture: 'drag', action: 'Plate III: drag the boundary between black and white lines' },
      { gesture: 'tap', action: 'Plate III: clear a band of lines so the red runs straight across' },
      { gesture: 'drag', action: 'Plate IV: drag sideways to turn the hue of the whole harmony' },
      { gesture: 'tap', action: 'Plate IV: the next harmony' },
      { gesture: 'tap', action: 'Tap a numeral on the ruler to jump to that plate' },
    ],
    tip: 'In plate I, drag the inner square slowly from the dark ground onto the light one and watch it darken as it crosses the edge. Nothing about it changes but its neighbors.',
  },
  pad: {
    left: [{ label: '‹ Plate', code: 'ArrowLeft', aria: 'Previous plate', wide: true }],
    right: [{ label: 'Plate ›', code: 'ArrowRight', aria: 'Next plate', wide: true }],
  },
  sections: [
    {
      id: 'albers',
      kicker: 'Art & perception',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Put a small square of one color on a dark ground and an identical square on a light ground, and they no longer look identical. On the dark ground the square looks lighter; on the light ground, darker. Its hue shifts too, away from the hue of whatever surrounds it. This is *simultaneous contrast*, and it is not a trick of printing or a failure of attention. It is how vision works. The eye is built to report differences, and the color you see in any spot depends on the colors around it.',
        },
        {
          type: 'p',
          text: 'Josef Albers made that fact the center of his teaching. Born in Bottrop, Germany, in 1888, he studied and then taught at the Bauhaus, and when the school closed in 1933 he and his wife, the textile artist Anni Albers, came to the United States to teach at the new Black Mountain College in North Carolina. He taught there until 1949 and then led the Department of Design at Yale from 1950 until 1958. In 1963 Yale University Press published *Interaction of Color*, a portfolio of silkscreened color studies with a short text, the distilled form of decades of classroom exercises.',
        },
        {
          type: 'p',
          text: 'The book is unusual because it teaches by doing, not by theory. Albers asked students to work with sheets of colored paper, cutting and placing them until one color looked like two, or two looked like one, or a middle color looked like a mixture of the colors on either side. The point was to train the eye to see what actually happens, rather than what one expects. The book opens by observing that we almost never see a color as it physically is, and draws the conclusion that gives this piece its second caption:',
        },
        { type: 'quote', text: 'This fact makes color the most relative medium in art.', cite: 'Josef Albers, *Interaction of Color*, 1963' },
        {
          type: 'p',
          text: 'Albers also painted. From 1950 until his death in 1976 he made the long series *Homage to the Square*: more than a thousand paintings and prints of three or four nested squares, each a study in how flat, adjacent colors change one another. The squares are not centered; they sit low, in fixed proportions, so that the eye reads depth, glow or transparency into what is only paint laid edge to edge. Plate IV of this piece borrows that format.',
        },
        { type: 'h', text: 'Before Albers' },
        {
          type: 'p',
          text: 'The effects themselves had been studied for more than a century. In the 1820s the French chemist Michel-Eugène Chevreul became director of dyeing at the Gobelins tapestry works in Paris, where weavers complained that some of his dyes looked dull. He found the dyes were fine. The colors next to them were changing their appearance. His 1839 book on the law of simultaneous contrast set out rules for it and was read by painters, the Neo-Impressionists above all. In the 1870s the German meteorologist Wilhelm von Bezold noticed something that seemed to run the other way: in a rug design he could change the whole look of a field of color by changing just the color of the thin lines running through it. When lines are fine and close together, the field takes on their color instead of moving away from it. That is now called the *Bezold effect*, or *assimilation*, and it is plate III.',
        },
        {
          type: 'aside',
          title: 'The checker shadow',
          text: 'In 1995 the vision scientist Edward Adelson published the checker-shadow illusion: a checkerboard with a cylinder casting a shadow across it, in which a "white" square in shadow and a "black" square in light are exactly the same gray on the page. It shows that lightness perception is not only a matter of local contrast: the visual system is estimating the *surface* under its illumination, and it discounts the shadow. Contrast at an edge, grouping into surfaces, and inferences about light and shade all feed into the color you finally see.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Perception',
      title: 'Why it happens',
      blocks: [
        {
          type: 'p',
          text: 'The first explanation is in the retina. Cells there, and in the stages after it, have *center–surround* receptive fields: they are excited by light in a small central region and inhibited by light in the ring around it, or the reverse. A cell like that responds to the difference between a spot and its surroundings, not to the spot alone. Put the same gray in the center and change the surround from dark to light, and the cell’s output falls. This lateral inhibition is why edges look crisp, why the bands of Ernst Mach (1865) appear at the boundaries of gradients, and why a gray on black looks lighter than the same gray on white. Color-opponent cells do the same thing along the red–green and blue–yellow axes, which is why the hue of a square drifts away from its ground’s hue.',
        },
        {
          type: 'p',
          text: 'The second explanation is higher up. The light reaching your eye from a surface is the product of the surface’s reflectance and the illumination falling on it. Vision tries to recover the reflectance, the property that belongs to the object, and it does so partly by assuming that the surroundings tell it about the light. A gray patch surrounded by darkness is probably brightly lit, relative to its neighbors, and so is seen as lighter. This *lightness constancy* is what lets a white shirt look white in shade and in sun. Simultaneous contrast is its side effect, and theories of lightness, such as Alan Gilchrist’s anchoring theory, treat the two as one problem.',
        },
        { type: 'h', text: 'A working model' },
        {
          type: 'p',
          text: 'For designing the plates, the piece uses the simplest model that captures the direction of the effect: an inner color $X$ on a ground $G$ appears pushed away from the ground by a fraction of their difference.',
        },
        { type: 'math', tex: 'P = X + k\\,(X - G)', label: '(1)', caption: '$X$ is the inner color as displayed, $G$ the ground, $P$ the color it appears to be, and $k \\geq 0$ the strength of the induction. Every quantity is a point in OKLab $(L, a, b)$, with a separate $k$ for $L$ and for $(a, b)$.' },
        {
          type: 'p',
          text: 'OKLab is a perceptual color space published by Björn Ottosson in 2020. $L$ is perceived lightness from 0 (black) to 1 (white), and $a$ and $b$ are opponent axes, roughly green–red and blue–yellow. Distances in it track perceived differences reasonably well, so the color difference used in the readouts is plain Euclidean distance:',
        },
        { type: 'math', tex: '\\Delta E_{OK} = \\sqrt{(\\Delta L)^2 + (\\Delta a)^2 + (\\Delta b)^2}', label: '(2)', caption: 'Roughly, a difference of 0.02 is about the smallest most people notice side by side; 0.08 is plain.' },
        { type: 'h', text: 'Making two colors look like one' },
        {
          type: 'p',
          text: 'Plate I uses the model qualitatively: one inner color, OKLCH $L$ 0.64, $C$ 0.060, $h$ 78°, a muted ochre, on a deep violet ground ($L$ 0.36) and on a pale yellow one ($L$ 0.92). The violet pushes the ochre lighter and warmer; the yellow pushes it darker and grayer, even slightly violet. Plate II uses it in reverse. Pick the color $P$ both squares should *appear* to be, here OKLCH 0.60 0.050 70°, and two grounds, a pale blue-green and a deep oxblood. Then solve equation (1) for the inner color on each ground:',
        },
        { type: 'math', tex: 'X = \\frac{P + k\\,G}{1 + k}', label: '(3)', caption: 'On a light ground the inner square must be lighter than $P$, because the ground will darken it, and tinted toward the ground, because the ground will push it away.' },
        {
          type: 'p',
          text: 'With $k = 0.18$ for lightness and $k = 0.10$ for $a$ and $b$, this gives OKLCH 0.64 0.042 77° on the pale ground and 0.56 0.052 63° on the dark one: two colors $\\Delta E_{OK} = 0.084$ apart, a difference you see at once when they touch, that sit on their grounds looking very nearly alike. The two strengths are lower than many textbook demonstrations would suggest, because the colors were tuned by eye on an ordinary display until the match held; chromatic induction from a large saturated ground turned out weaker than lightness induction. The table lists the plates.',
        },
        { type: 'figure', svg: contrastFigure, alt: 'One ochre square on a dark violet ground and the same ochre on a pale yellow ground, with the contrast model written beside them.', caption: 'Plate I in miniature. The two small squares are the same color.' },
        {
          type: 'table',
          head: ['Plate', 'Inner', 'Grounds', 'Inner Δ'],
          rows: [
            ['I · One color as two', '0.64 0.060 78° (both)', '0.36 0.120 285° · 0.92 0.100 100°', '0.000'],
            ['II · Two colors as one', '0.64 0.042 77° · 0.56 0.052 63°', '0.88 0.070 200° · 0.34 0.100 25°', '0.084'],
          ],
          caption: 'OKLCH values as displayed, after fitting to sRGB. The inner squares are about a quarter of the ground’s width, small enough for the ground to dominate.',
        },
        { type: 'h', text: 'Assimilation' },
        {
          type: 'p',
          text: 'The Bezold effect looks like the opposite of contrast. A red crossed by fine black lines looks darker and deeper; the same red crossed by fine white lines looks lighter and pinker, as if the lines had bled into it. The usual explanation is spatial: when the lines are fine and close together, the eye’s optics and the large receptive fields of its color channels average the red and the lines over a small area, so the red takes on some of the lines’ color. Make the lines wider and farther apart and contrast takes over again. In plate III the lattice is drawn with lines about 1–2 px wide on a repeat of 10–22 px, depending on the screen, in the range where assimilation dominates.',
        },
        { type: 'h', text: 'The homage format' },
        {
          type: 'p',
          text: 'Albers worked the *Homage to the Square* series in a few fixed arrangements of three or four squares. In the four-square one, measured in tenths of the outer side, the squares have sides 10, 8, 6 and 4, are centered left to right, and are placed low, so that the margins below, beside and above each square stand in the ratio 1 : 2 : 3. With $u$ = one tenth of the outer side and $j$ = 0 (outer) to 3 (inner):',
        },
        { type: 'math', tex: 's_j = (10 - 2j)\\,u, \\qquad \\text{left}_j = j\\,u, \\qquad \\text{below}_j = \\tfrac{1}{2}\\,j\\,u, \\qquad \\text{above}_j = \\tfrac{3}{2}\\,j\\,u', label: '(4)' },
        { type: 'figure', svg: homageFigure, alt: 'Four nested squares of sides 10, 8, 6 and 4 units, set low, with the margins above, beside and below in the ratio 3 to 2 to 1.', caption: 'The four-square format: the innermost square has 4.5 u above it, 3 u to either side and 1.5 u below.' },
      ],
    },
    {
      id: 'piece',
      kicker: 'Implementation',
      title: 'How the piece works',
      blocks: [
        {
          type: 'p',
          text: 'Interaction is one TypeScript module drawing flat rectangles and one lattice to a canvas. Everything on screen is a function of a 70-second clock, which the piece owns so that it can stop: while you hold a square, a ground, the boundary or the homage, the clock holds too, and the plate waits for you. When you let go, whatever you moved springs back to where the timeline wants it.',
        },
        {
          type: 'table',
          head: ['Plate', 'Time', 'What happens'],
          rows: [
            ['I · One color as two', '0–17 s', 'Two grounds, one inner color. At 8 s the grounds slide away, the squares slide together and meet with no seam'],
            ['II · Two colors as one', '17–33 s', 'Two inner colors solved to look alike. The same reveal ends with a visible seam and $\\Delta E$ 0.084'],
            ['III · The Bezold effect', '33–48 s', 'A red under black lines; white lines sweep in from the right; a band of lines lifts to show one red'],
            ['IV · Homage to the square', '48–70 s', 'Four nested squares breathe through five harmonies, 4.4 s each'],
          ],
        },
        { type: 'h', text: 'Colors as data' },
        {
          type: 'p',
          text: 'Every color is defined in OKLCH, converted to OKLab and then to sRGB by bisecting on chroma at fixed lightness and hue until it fits the gamut, and finally converted back so the readouts report the color actually shown. Plate II is solved at load time:',
        },
        {
          type: 'code',
          code: `// Plate II: choose what both squares should look like, then solve P = X + k(X − G) for X on each ground
const K_L = 0.18
const K_AB = 0.1
const TARGET = lab(0.6, 0.05, 70)
const G2a = shown(lab(0.88, 0.07, 200))
const G2b = shown(lab(0.34, 0.1, 25))
const solve = (P: Lab, G: Lab): Lab => shown([(P[0] + K_L * G[0]) / (1 + K_L), (P[1] + K_AB * G[1]) / (1 + K_AB), (P[2] + K_AB * G[2]) / (1 + K_AB)])
const P2 = { a: solve(TARGET, G2a), b: solve(TARGET, G2b), g0: G2a, g1: G2b }`,
          caption: 'Equation (3) for each ground. `shown` round-trips through sRGB so the numbers match the screen.',
        },
        { type: 'h', text: 'The reveal' },
        {
          type: 'p',
          text: 'Plates I and II share one choreography with two progress values: $g$ for the grounds sliding outward and fading, and $s$ for the inner squares sliding together. The squares start moving a little after the grounds, so they travel across bare paper and meet on it, where nothing can bias them. Tapping jumps the clock to the start of the reveal or to its return.',
        },
        {
          type: 'code',
          code: `/** Reveal progress for plates I and II at local time u: grounds away, squares together, and back. */
function revealAt(u: number) {
  const g = ease.inOutCubic(clamp((u - REV0) / 1.2)) * (1 - ease.inOutCubic(clamp((u - REV1 - 0.6) / 1.2)))
  const s = ease.inOutCubic(clamp((u - REV0 - 0.6) / 1.4)) * (1 - ease.inOutCubic(clamp((u - REV1) / 1.3)))
  return { g, s }
}`,
          caption: 'Out and back as one product of eases. With sound on, a soft click marks the moment the squares touch.',
        },
        { type: 'h', text: 'One lattice, two inks' },
        {
          type: 'p',
          text: 'The Bezold pattern is built once per frame as a single `Path2D`: two families of diagonals through the panel’s corner and a small diamond in alternate cells. It is then stroked twice, each time clipped to one side of the boundary, in black and in white. Moving the boundary is just moving the clip. The reveal fills a horizontal band with the plain red on top, so the one fill runs unbroken from the black side to the white.',
        },
        {
          type: 'code',
          code: `for (let side = 0; side < 2; side++) {
  ctx.save()
  ctx.beginPath()
  if (side === 0) ctx.rect(B.bx, B.by, div - B.bx, B.bh)
  else ctx.rect(div, B.by, B.bx + B.bw - div, B.bh)
  ctx.clip()
  ctx.strokeStyle = cssOf(side === 0 ? BLACK : WHITE)
  ctx.stroke(path)
  ctx.restore()
}`,
          caption: 'The same path, two clips. The red underneath is never redrawn.',
        },
        { type: 'h', text: 'Breathing harmonies' },
        {
          type: 'p',
          text: 'Plate IV holds five harmonies, each four OKLCH colors from the outer square inward: analogous ochres, a value scale in blue-gray, complements through two neutral grays, a dusk that glows toward the center, and spring greens. Each holds for 2.8 s and then breathes into the next over 1.6 s, interpolated in OKLab so the blend passes through even steps. Dragging adds an offset to every hue, turning the whole harmony around the color wheel while keeping its lightness and chroma relationships. The third harmony is the one to watch: its two middle squares are pure grays, yet next to terracotta and teal they take on faint opposite tints.',
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
            '**Plate label (top left of the frame):** the plate number in ocean, then its title, as in a book of plates.',
            '**Under the frame:** a one-line note on what the plate shows, which changes at the reveal (*two grounds · one inner color* becomes *the squares are one color*).',
            '**Right column (wide screens):** the colors in OKLCH, lightness, chroma, hue, each with a printed swatch, the $\\Delta E_{OK}$ between the inner squares, and for plate II the color both are meant to look like and the model used.',
            '**The join (plates I and II):** two ticks mark where the squares meet, with the verdict, *no seam · one color* or *a seam* with the measured difference.',
            '**The triangle under plate III:** the boundary between black and white lines. Drag it.',
            '**The dimension at the left of plate IV (wide screens):** the margins above and below the inner square, 3 and 1, the format’s 3 : 2 : 1.',
            '**Bottom ruler:** the 70-second timeline with the four plates. Tap a numeral to jump.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth trying: in plate II, drag square A off its pale ground onto bare paper and back. Off its ground it looks lighter and bluer than you expected, because it is. In plate III, drag the boundary all the way to the left and then all the way to the right, and watch the whole red lift and sink. In plate IV, turn the dusk harmony until it becomes a sunset, and see whether the center still glows.',
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
            '**The contrast model is a caricature.** Induction depends on the sizes of the square and ground, viewing distance, the colors involved, adaptation and the person looking. One constant $k$ per axis is enough to design a plate, not to predict perception in general.',
            '**Screens differ.** The colors were tuned on a typical sRGB display. On a very different screen, or in a very bright room, plate II may look less like a match.',
            '**Paper and light.** Albers worked with colored paper, mostly the Color-aid range, and with paint, under ordinary light; a screen emits light and has a different gamut. The plates follow his exercises; they do not reproduce his plates.',
            '**The harmonies are mine.** Plate IV borrows the *Homage* format, not Albers’s palettes, and computing harmonies in OKLCH is a modern convenience he would likely have distrusted. He insisted that colors be judged by eye.',
            '**The Bezold pattern is invented.** Bezold’s observation came from rug designs; the lattice here is a simple geometric stand-in, sized so assimilation dominates on most screens.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Interaction of Color', by: 'Josef Albers', year: '1963', note: 'Yale University Press. Later paperback and 50th-anniversary editions keep a selection of the plates; Yale also published an interactive version in 2013.' },
    { title: 'De la loi du contraste simultané des couleurs', by: 'Michel-Eugène Chevreul', year: '1839', note: 'In English as *The Principles of Harmony and Contrast of Colours* (1854). The law of simultaneous contrast.' },
    { title: 'The Theory of Color in Its Relation to Art and Art-Industry', by: 'Wilhelm von Bezold, trans. S. R. Koehler', year: '1876', note: 'The English translation of Bezold’s 1874 book, where the spreading effect is described.' },
    { title: 'Lightness perception and lightness illusions', by: 'Edward H. Adelson', year: '2000', note: 'In *The New Cognitive Neurosciences*, ed. M. Gazzaniga, MIT Press. Includes the checker-shadow illusion and a clear account of the theories.' },
    { title: 'Seeing Black and White', by: 'Alan Gilchrist', year: '2006', note: 'Oxford University Press. A history and theory of lightness perception.' },
    { title: 'The Arts at Black Mountain College', by: 'Mary Emma Harris', year: '1987', note: 'MIT Press. The college where Albers taught from 1933 to 1949.' },
    { title: 'A perceptual color space for image processing', by: 'Björn Ottosson', year: '2020', note: 'The definition of OKLab, the space every plate is computed in.' },
  ],
}

export default guide
