import type { Guide } from '../guide'

const filmFigure = `<svg viewBox="0 0 440 210" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="40" y1="90" x2="400" y2="90"/>
  <line x1="40" y1="140" x2="400" y2="140"/>
  <path d="M40 92 L400 92 M40 138 L400 138" opacity="0.15"/>
  <text x="404" y="118" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">d</text>
  <path d="M396 92 L396 138" stroke-dasharray="2 3" opacity="0.6"/>
  <line x1="90" y1="20" x2="150" y2="90"/>
  <line x1="150" y1="90" x2="210" y2="20" stroke="#7FB6D9"/>
  <line x1="150" y1="90" x2="180" y2="140"/>
  <line x1="180" y1="140" x2="210" y2="90"/>
  <line x1="210" y1="90" x2="270" y2="20" stroke="#9DB9A0"/>
  <line x1="180" y1="140" x2="214" y2="200" opacity="0.5"/>
  <text x="58" y="18" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">LIGHT</text>
  <text x="170" y="34" font-family="Geist Mono, monospace" font-size="9" fill="#7FB6D9" stroke="none">1</text>
  <text x="232" y="34" font-family="Geist Mono, monospace" font-size="9" fill="#9DB9A0" stroke="none">2</text>
  <text x="250" y="70" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">1: INVERTED AT THE FRONT</text>
  <text x="250" y="84" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">2: UPRIGHT, PATH 2nd LONGER</text>
  <text x="250" y="164" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">AIR</text>
  <text x="250" y="119" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">SOAPY WATER, n ≈ 1.33</text>
  <text x="44" y="190" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">AS d → 0, 1 AND 2 CANCEL: BLACK</text>
</svg>`

const guide: Guide = {
  lede: 'A soap film has no pigment at all, yet it is one of the most colorful things there is. Every color in it comes from light reflected off its front and back surfaces, interfering, and the colors map its thickness as precisely as a ruler, down to the moment it becomes too thin to reflect anything and bursts.',
  facts: [
    ['Phenomenon', 'Thin-film interference: color by structure, not pigment'],
    ['Film', 'Soapy water, $n = 1.324 + 3100/\\lambda^2$ (≈ 1.333 at 589 nm)'],
    ['Reflectance', 'Airy sum for air–film–air, at normal incidence'],
    ['Brightest', 'About 8 percent, at a quarter-wave thickness'],
    ['Light', 'A 6,500 K blackbody, close to daylight, white-balanced'],
    ['Color table', 'Every whole nanometre from 0 to 2,000 nm, computed at start-up'],
    ['Black film', 'Below about 30 nm the film jumps to a few nanometres and reflects almost nothing'],
    ['Swirls', 'A 64 × 64 material grid stirred by curl noise and your breath'],
    ['Running time', '52 s in five chapters, looping; the burst slowed about a hundredfold'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Previous or next chapter' }],
    gestures: [
      { gesture: 'drag', action: 'Drag across the film to blow on it and swirl the colors' },
      { gesture: 'tap', action: 'Tap the film to burst it' },
      { gesture: 'move', action: 'Hover over the film to read its thickness at that point' },
      { gesture: 'tap', action: 'Tap or drag the ruler along the bottom to move through the chapters' },
    ],
    tip: 'Hover just below the black film in chapter III: the thickness falls from a few hundred nanometres to almost nothing across a hairline.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Color without pigment',
      blocks: [
        {
          type: 'p',
          text: 'Dip a wire loop in soapy water and lift it out, and it holds a film. For a moment the film is nearly clear, with a faint pearly shimmer. Then color arrives from the top: bands of gold, magenta, blue and green slide slowly down the film, swirl at its edges, and crowd together toward the top, where the colors give way to silver, then grey, then a patch of perfect black that spreads downward. Shortly after the black appears, the film bursts.',
        },
        {
          type: 'p',
          text: 'Nothing in the film is colored. Soap and water are clear. The colors are made by the film’s thickness, which is comparable to the wavelength of light: a few hundred nanometres, a few hundred molecules of water deep. Light reflects partly from the front surface of the film and partly from the back, and the two reflections, travelling slightly different distances, interfere. For some wavelengths they reinforce, for others they cancel, and what reaches your eye is white light with some colors taken away. Change the thickness and you change which colors survive. A soap film is a map of its own thickness, drawn in color.',
        },
        { type: 'h', text: 'Hooke, Newton and Young' },
        {
          type: 'p',
          text: 'Robert Hooke described the colors of thin plates, in flakes of mica and in soap bubbles, in his *Micrographia* of 1665, and guessed that they depended on the thickness of the plate. Isaac Newton turned the guess into measurements. He pressed a slightly convex lens onto a flat sheet of glass, so that the thin wedge of air between them grew from nothing at the point of contact, and saw a dark spot surrounded by rings of color, now called **Newton’s rings**. Because he knew the curvature of his lens, he could compute the thickness of the air at each ring, and in the second book of his *Opticks* (1704) he tabulated, in fractions of an inch, the thickness at which each color appears. The sequence of colors with increasing thickness, from black through white, yellow and red, then violet, blue, green, yellow, red, and on through fainter repetitions, became known as **Newton’s scale** of interference colors. It is the ruler drawn beside the film in this piece.',
        },
        {
          type: 'p',
          text: 'Newton had a theory for the rings, but not the right one. The explanation came a century later, when Thomas Young, in his Bakerian lecture to the Royal Society in 1801 (published in 1802), showed that the colors of thin films follow naturally if light is a wave: two reflected waves out of step cancel. Young even used Newton’s own measurements to estimate the wavelengths of the colors, and got them roughly right.',
        },
        { type: 'h', text: 'Why the top goes black' },
        {
          type: 'p',
          text: 'A vertical film drains. Gravity pulls the liquid down, and suction at the thick rim where the film meets the wire, the *Plateau border*, draws more liquid out of the film. The top thins first. In the 1950s Karol Mysels and colleagues showed that much of the thinning happens at the borders, where patches of thinner film are pulled out and rise, a process they called *marginal regeneration*; the swirling plumes at the edges of a draining film are its visible trace. Surfactant molecules at both surfaces hold the film together: where the film stretches, the surfactant thins, surface tension rises and pulls the film back (the *Marangoni effect*), and flows driven by these differences in surface tension stir the colors into marbled swirls.',
        },
        {
          type: 'p',
          text: 'When the thinnest part reaches a few tens of nanometres, its reflections nearly cancel at every wavelength and it turns black. The change is abrupt: below a critical thickness, forces between the film’s two surfaces take over and the film jumps, with a sharp boundary, to a *black film* only a few nanometres to a few tens of nanometres thick, sometimes little more than two layers of soap molecules with a little water between. Black film is fragile. It is where films usually break, and once a hole forms the rim races outward, gathering liquid as it goes and shedding droplets, at a speed set by the balance of surface tension and inertia: tens of metres per second in black film, slower in the thicker film below.',
        },
        { type: 'h', text: 'Structural color in nature' },
        {
          type: 'p',
          text: 'Soap films are the simplest case of **structural color**: color made by the size and spacing of transparent structures rather than by pigments that absorb light. An oil slick on a wet road works the same way. So do the shimmering wings of many butterflies and beetles, whose scales contain stacks of thin layers that act like many films at once, and the eyespots of a peacock’s tail, where melanin rods in the feather barbules are arranged in a regular lattice. Hooke suspected that peacock colors came from thin plates, and Newton agreed in the *Opticks*. A sign of structural color is that it changes with the angle you look from, as soap films and peacock feathers do, while a pigment looks the same from every side.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Physics',
      title: 'Two reflections, half a wave apart',
      blocks: [
        {
          type: 'p',
          text: 'When light meets the boundary between two transparent media with refractive indices $n_1$ and $n_2$, part of it reflects. At normal incidence the reflected wave’s amplitude, relative to the incoming one, is',
        },
        { type: 'math', tex: 'r = \\frac{n_1 - n_2}{n_1 + n_2}', label: '(1)' },
        {
          type: 'p',
          text: 'For light in air ($n_1 = 1$) meeting water ($n_2 \\approx 1.33$), $r \\approx -0.14$: the negative sign means the reflected wave is inverted, shifted by half a wavelength. At the back of the film, going from water to air, the sign reverses and $r \\approx +0.14$: no inversion. So even before the extra path is counted, the two reflections are half a wave out of step. The wave reflected from the back has also crossed the film twice, an extra optical path of $2nd$ for a film of thickness $d$, which adds a phase',
        },
        { type: 'math', tex: '\\delta = \\frac{4\\pi n d}{\\lambda}', label: '(2)', caption: 'At normal incidence. At an angle, $d$ is replaced by $d \\cos\\theta_t$, with $\\theta_t$ the angle inside the film.' },
        {
          type: 'p',
          text: 'The two reflections reinforce when the total shift is a whole number of wavelengths. Because of the built-in half wave, that happens when $2nd = (m + \\tfrac{1}{2})\\lambda$, and they cancel when $2nd = m\\lambda$, for whole numbers $m = 0, 1, 2, \\ldots$ The case $m = 0$ is the important one: as $d \\to 0$ every wavelength cancels, which is why the thinnest film is black rather than bright.',
        },
        { type: 'h', text: 'All the reflections at once' },
        {
          type: 'p',
          text: 'Light bounces back and forth inside the film many times, losing a little at each bounce. Summing all the reflected waves gives the **Airy formula**. With the two surfaces’ amplitudes $r$ and $-r$ (the same film in air on both sides), the fraction of light reflected is',
        },
        { type: 'math', tex: 'R(\\lambda, d) = \\frac{2r^2\\,(1 - \\cos\\delta)}{1 + r^4 - 2r^2 \\cos\\delta}', label: '(3)' },
        {
          type: 'p',
          text: 'This is what the piece computes. Its peak, at $\\cos\\delta = -1$ (a quarter-wave film, $nd = \\lambda/4$), is $4r^2/(1 + r^2)^2$, about 8 percent; a soap film is a weak mirror, which is why it looks transparent. For very thin films, $R \\approx r^2 \\delta^2$, which grows like $(d/\\lambda)^2$: a film a few tens of nanometres thick reflects a little more blue than red and looks grey, and a film of 5 nm reflects about a hundredth of what a quarter-wave film does, which is black.',
        },
        { type: 'figure', svg: filmFigure, alt: 'Light striking a thin film, reflecting from its front surface with an inversion and from its back surface without one, the two reflections leaving side by side.', caption: 'The two reflections that make a soap film’s color. The back one travels an extra $2nd$; the front one is inverted.' },
        { type: 'h', text: 'From reflectance to a color' },
        {
          type: 'p',
          text: 'To turn $R(\\lambda, d)$ into a color, the piece lights the film with a spectrum $S(\\lambda)$, a blackbody at 6,500 K standing in for daylight, and asks how the reflected light looks to the CIE 1931 standard observer, whose color-matching functions $\\bar{x}, \\bar{y}, \\bar{z}$ turn a spectrum into three numbers:',
        },
        { type: 'math', tex: 'X(d) = \\frac{\\int R(\\lambda, d)\\, S(\\lambda)\\, \\bar{x}(\\lambda)\\, d\\lambda}{\\int S(\\lambda)\\, \\bar{y}(\\lambda)\\, d\\lambda}, \\quad \\text{and the same for } Y, Z', label: '(4)' },
        {
          type: 'p',
          text: 'A fixed matrix converts $X, Y, Z$ to linear sRGB. The result is divided channel by channel by the color of a perfect mirror under the same light, so that a white reflector would appear neutral (a simple white balance), multiplied by an exposure so the brightest film is near the top of the screen’s range, brought inside the sRGB gamut by adding just enough white to any channel that came out negative, and gamma-encoded. Do this for every thickness from 0 to 2,000 nm and you have Newton’s scale, computed from first principles.',
        },
        { type: 'h', text: 'Orders' },
        {
          type: 'p',
          text: 'Newton grouped his colors into *orders*, each running roughly from a purple or red to the next. The piece marks the boundaries where green light at 550 nm is cancelled, $d_m = m \\cdot 550/2n$, about 206, 413, 619 and 825 nm. The colors are most vivid in the first and second orders. Further down the scale each order is fainter, because the cancellations for different wavelengths no longer line up, and beyond about 1,500 nm the film looks almost white again: so many narrow bands of the spectrum are removed, all through the visible, that what is left averages to white. That is why a freshly drawn, thick film shows only a pale shimmer.',
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
          text: 'Soap Film is one TypeScript module drawing to a canvas. It has three parts: a table that gives the true color of a film of any thickness, a model of how thick the film is at every point and moment, and a renderer that draws the film as fine horizontal hairlines, each colored along its length by the table.',
        },
        { type: 'h', text: 'The color table' },
        {
          type: 'code',
          code: `/**
 * Reflectance at normal incidence of a free film (air | film | air), from the
 * Airy sum of all the internally reflected beams. r = (n−1)/(n+1) at each face,
 * opposite in sign: the half-wave shift. δ = 4πnd/λ is the round-trip phase.
 */
function reflectance(nm: number, d: number) {
  const n = nFilm(nm)
  const r = (n - 1) / (n + 1)
  const r2 = r * r
  const c = Math.cos((4 * Math.PI * n * d) / nm)
  return (2 * r2 * (1 - c)) / (1 + r2 * r2 - 2 * r2 * c)
}`,
          caption: 'Equation (3) in code. `nFilm` is the Cauchy fit for water, so the film’s own dispersion is included.',
        },
        {
          type: 'p',
          text: 'At start-up the piece evaluates this at 81 wavelengths, every 5 nm from 380 to 780, for every whole nanometre of thickness from 0 to 2,000, weights each by the 6,500 K spectrum and the color-matching functions from the site’s `color.ts`, and stores the 2,001 resulting colors as bytes. That is about 160,000 evaluations, done once in a few milliseconds. After that, coloring the film is a table lookup.',
        },
        { type: 'h', text: 'How thick the film is' },
        {
          type: 'p',
          text: 'The film’s thickness is a designed function of height and age rather than the solution of the drainage equations. At the top it starts at 1,100 nm and thins roughly exponentially; at the bottom it starts at about 2,260 nm and settles toward 760 nm; in between it grows with depth like a power of 0.62, steep near the top and gentle below, much as a draining film does. From an age of about 19 seconds a black front moves down from the top, and anything thinner than 30 nm is replaced by black film 5 nm thick:',
        },
        {
          type: 'code',
          code: `const hTop = (age: number) => 1100 * Math.exp(-age / 6) + 6 - 6 * smoothstep(20, 30, age)
const hBot = (age: number) => 760 + 1500 * Math.exp(-age / 7)
/** how far down the black film has spread (fraction of the loop's height) */
const blackFront = (age: number) => 0.4 * smoothstep(19, 37, age) * (0.6 + 0.4 * smoothstep(26, 37, age))
/** draining profile: thin above, thick below (h grows like a power of depth below the black film) */
function hAt(z: number, age: number) {
  const a = hTop(age)
  const b = hBot(age)
  const zb = blackFront(age)
  return a + (b - a) * Math.pow(clamp((z - zb) / (1 - zb)), 0.62)
}`,
          caption: 'The drainage, as a function of depth $z$ (0 at the top of the loop, 1 at the bottom) and age in seconds.',
        },
        { type: 'h', text: 'Swirls' },
        {
          type: 'p',
          text: 'The film is not simply layered: it swirls. The piece keeps a 64 × 64 grid of *material coordinates*, the depth $z$ that each patch of film came from, and moves it every frame with a velocity field. The velocity is curl noise (smooth, divergence-free, slowly changing), strongest near the wire and in the thick lower film where real films churn, plus whatever you add by dragging. Each frame the grid is advected semi-Lagrangian style, by looking back along the velocity to where each point’s material was a moment ago, and then nudged back toward its own height, which stands for gravity sorting thin, light film upward and thick film down:',
        },
        {
          type: 'code',
          code: `// semi-Lagrangian advection of Z, then gravity's re-stratification toward Z = v
const kr = 1 - Math.exp(-0.42 * dt)
for (let j = 0; j < G; j++) {
  const v = j / (G - 1)
  for (let i = 0; i < G; i++) {
    const u = i / (G - 1)
    // … bilinear velocity (vx, vy) from the 20 × 20 field …
    let z = zAt(u - vx * dt, v - vy * dt)
    z += (v - z) * kr
    ZT[j * G + i] = z
  }
}
ZF.set(ZT)`,
          caption: 'The color at a point is then the table entry for the thickness of the material that is there now.',
        },
        {
          type: 'p',
          text: 'Your breath is a soft round push: dragging adds your pointer’s velocity to the velocity field around it, with a Gaussian footprint, and the push decays over about half a second. Because the bands are carried by the same field, they bend, roll up and slowly settle back into layers.',
        },
        { type: 'h', text: 'Drawing in hairlines' },
        {
          type: 'p',
          text: 'The film is drawn as horizontal hairlines a little more than two pixels apart. Each frame, for each line and for a few hundred points along it, the renderer samples the material grid, looks up the thickness and the color, and writes the color into a small image with one row per hairline. Each row is then stretched across the loop and drawn as a single line about one pixel tall, using the canvas’s `lighter` compositing, because reflected light adds to whatever is behind the film. Where the film is black, nothing is added and the night ground shows through, as it would.',
        },
        { type: 'h', text: 'The burst' },
        {
          type: 'p',
          text: 'The film bursts on its own at the start of chapter IV, at a point in the black film near the top, or earlier wherever you tap it. A hole then grows from that point. Its edge moves faster through thin film than thick, as the real rim does (its speed goes as $1/\\sqrt{d}$), so it races across the black film and slows in the colored film below; just outside the hole a bright line marks the liquid the rim has gathered, and droplets are shed from it and fall under gravity. The real burst of a film this size takes a few milliseconds; the piece slows it to about half a second. If you burst the film early, the piece lets the burst play and then rejoins its timeline just after the automatic one.',
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
            '**The loop:** a doubled hairline ring on a twisted handle, lifted out of the soap solution at the start of each loop and dipped back at the end. Below the surface it is drawn dotted.',
            '**The film:** hairlines of computed color. Pale and nearly white when thick, vivid in the first and second orders, silver and grey when thin, and empty where it has turned to black film.',
            '**Newton’s scale (right):** the color of a film of each thickness from 0 to 1,400 nm, drawn with the same hairlines, spaced by the square root of thickness so the thin end has room. Names on the left, read off the computed table (black, grey, white, straw, amber, purple, blue, green, yellow, red, magenta, blue, green, pink), thickness in nanometres on the right, and brackets for the first four orders.',
            '**Probes:** three small circles down the middle of the film, joined by dotted leaders to the place on the scale where their thickness sits. As the film drains the leaders slide up the scale.',
            '**Hover:** a circle at the pointer, the thickness there in nanometres, and a mark on the scale.',
            '**Top right:** the film’s age, and the thickness at its top and bottom; *black* once the top has turned.',
            '**Bottom:** the 52-second ruler with the five chapter numerals and a playhead.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the moment in chapter II when color first appears at the top while the bottom is still pale; the bands crowding together toward the top as the film thins, because the thickness changes fastest there; the silver and grey just above the black front; and the burst, which crosses the black film almost at once and then slows.',
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
            '**Time is compressed.** A real film in a loop like this drains over tens of seconds to minutes, depending on the solution; the piece does it in about 40 seconds. The burst is slowed about a hundredfold.',
            '**The drainage is designed, not solved.** The thickness profile is a smooth function chosen to look and behave like a draining film, not a solution of the thin-film flow equations, and the black film has a single thickness.',
            '**The swirls are noise.** Real Marangoni flows and marginal regeneration are driven by surface-tension gradients; the piece uses smooth curl noise with a pull back toward layering.',
            '**The film is flat and seen straight on.** A real film bulges slightly and is seen at a range of angles, which shifts its colors a little across it. The piece uses normal incidence everywhere.',
            '**Daylight is a blackbody.** The illuminant is a 6,500 K blackbody, close to but not the same as standard daylight, and the colors are white-balanced and exposed for the screen. Very saturated film colors lie outside sRGB and are softened toward white.',
            '**The rim and droplets are drawn, not simulated.** The hole’s speed follows the right trend with thickness, but the droplets are hairline sparks on simple paths.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Opticks', by: 'Isaac Newton', year: '1704', note: 'Book II: the colors of thin plates, Newton’s rings and his table of colors against thickness.' },
    { title: 'Micrographia', by: 'Robert Hooke', year: '1665', note: 'Early observations of the colors of thin plates, including soap bubbles and mica.' },
    { title: 'On the Theory of Light and Colours', by: 'Thomas Young', year: '1802', note: '*Philosophical Transactions of the Royal Society* 92. Interference explains thin-film colors.' },
    { title: 'Soap-Bubbles: Their Colours and the Forces Which Mould Them', by: 'C. V. Boys', year: '1890', note: 'The classic popular lectures, still in print.' },
    { title: 'The Science of Soap Films and Soap Bubbles', by: 'Cyril Isenberg', year: '1978', note: 'A thorough, readable account of films, drainage and black films; Dover reprint.' },
    { title: 'Soap Films: Studies of Their Thinning and a Bibliography', by: 'Karol J. Mysels, Kozo Shinoda and Stanley Frankel', year: '1959', note: 'Pergamon Press. Drainage, marginal regeneration and black films.' },
    { title: 'Comments on a ruptured soap film', by: 'F. E. C. Culick', year: '1960', note: '*Journal of Applied Physics* 31. The speed of a bursting film’s rim.' },
    { title: 'Photonic structures in biology', by: 'Pete Vukusic and J. Roy Sambles', year: '2003', note: '*Nature* 424. Structural color in butterflies, beetles and birds.' },
    { title: 'Coloration strategies in peacock feathers', by: 'Jian Zi et al.', year: '2003', note: '*Proceedings of the National Academy of Sciences* 100. The photonic lattice in peacock barbules.' },
  ],
}

export default guide
