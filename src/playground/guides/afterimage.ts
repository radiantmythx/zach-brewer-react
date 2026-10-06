import type { Guide } from '../guide'

const planeFigure = `<svg viewBox="0 0 420 240" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="40" y1="120" x2="260" y2="120" opacity="0.35"/>
  <line x1="150" y1="20" x2="150" y2="220" opacity="0.35"/>
  <text x="264" y="124" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">+a</text>
  <text x="154" y="18" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">+b</text>
  <circle cx="150" cy="120" r="88" opacity="0.15"/>
  <circle cx="150" cy="120" r="3" fill="currentColor"/>
  <text x="120" y="140" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">GRAY</text>
  <line x1="150" y1="120" x2="214" y2="66" stroke="#2B6A93"/>
  <circle cx="214" cy="66" r="7" stroke="#2B6A93"/>
  <text x="224" y="62" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">STIMULUS</text>
  <line x1="150" y1="120" x2="118" y2="147" stroke="#3F7A55" stroke-dasharray="3 3"/>
  <circle cx="118" cy="147" r="5" stroke="#3F7A55"/>
  <text x="40" y="176" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">AFTERIMAGE</text>
  <text x="40" y="188" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">≈ −κ × STIMULUS</text>
  <line x1="300" y1="40" x2="300" y2="200" opacity="0.25"/>
  <text x="314" y="70" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.75">ADAPT TO S</text>
  <text x="314" y="88" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.75">VIEW GRAY N</text>
  <text x="314" y="106" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.75">SEE N − κ(S − N)</text>
  <text x="314" y="140" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">SO SHOW −a, −b</text>
  <text x="314" y="156" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">TO SEE +a, +b</text>
</svg>`

const wiringFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="60" cy="50" r="14"/>
  <circle cx="60" cy="100" r="14"/>
  <circle cx="60" cy="150" r="14"/>
  <text x="56" y="54" font-family="Geist Mono, monospace" font-size="10" fill="currentColor" stroke="none">L</text>
  <text x="55" y="104" font-family="Geist Mono, monospace" font-size="10" fill="currentColor" stroke="none">M</text>
  <text x="56" y="154" font-family="Geist Mono, monospace" font-size="10" fill="currentColor" stroke="none">S</text>
  <text x="34" y="185" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">CONES</text>
  <path d="M74 50 L200 50 M74 100 L200 60" stroke="#2B6A93"/>
  <path d="M74 50 L200 100 M74 100 L200 100" opacity="0.6"/>
  <path d="M74 150 L200 150 M74 50 L200 140 M74 100 L200 145" stroke="#3F7A55"/>
  <rect x="200" y="38" width="120" height="28"/>
  <rect x="200" y="86" width="120" height="28"/>
  <rect x="200" y="134" width="120" height="28"/>
  <text x="212" y="56" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">L − M · RED/GREEN</text>
  <text x="212" y="104" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">L + M · LIGHT/DARK</text>
  <text x="212" y="152" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">S − (L+M) · BLUE/YEL</text>
  <text x="334" y="56" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">±</text>
  <text x="334" y="104" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">±</text>
  <text x="334" y="152" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">±</text>
  <text x="200" y="185" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">OPPONENT CHANNELS</text>
</svg>`

const guide: Guide = {
  lede: 'Three short experiments you perform on your own eye. Look at a cross while a saturated picture tires the cones beneath it, then watch a plain gray fill with color that is not on the screen.',
  facts: [
    ['Phenomenon', 'Negative afterimages and Troxler fading'],
    ['Mechanism', 'Adaptation in the cones and the cells after them, read out by opponent channels'],
    ['Opponent theory', 'Ewald Hering, 1870s; quantified by Hurvich and Jameson, 1957'],
    ['Fading', 'Ignaz Troxler, 1804'],
    ['Lilac chaser', 'Jeremy Hinton, around 2005'],
    ['Stimulus design', 'Each true color turned 180° about the gray axis in OKLab'],
    ['Neutral', 'OKLab L 0.82, a = b = 0 (sRGB #C4C4C4)'],
    ['Fixation', '12 s, 20 s and 16 s for the three experiments'],
    ['Running time', 'About 90 s, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next experiment' },
      { keys: ['Space', 'Enter'], action: 'Start the count again; once the gray is up, go on to the next experiment' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Tap while the count runs to start it again (if you looked away)' },
      { gesture: 'tap', action: 'Tap once the gray is up to go on to the next experiment' },
      { gesture: 'tap', action: 'Tap a segment of the ruler to jump to that experiment' },
    ],
    tip: 'Turn the screen up, sit still at a normal distance, and keep your eyes on the cross until the gray appears. If the colors fade, blink once: the afterimage often comes back.',
  },
  pad: {
    left: [{ label: '‹ Experiment', code: 'ArrowLeft', aria: 'Previous experiment', wide: true }],
    right: [{ label: 'Experiment ›', code: 'ArrowRight', aria: 'Next experiment', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Perception',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Stare at a red disc for twenty seconds, then look at a white wall, and a disc floats there in a pale blue-green. Stare at a yellow one and the ghost is violet. This is a *negative afterimage*: after a steady look at a color, a neutral surface takes on roughly the opposite hue in the same place in your field of view. It moves when your eyes move, because it is not on the wall. It is in the retina, and in the cells that read the retina.',
        },
        {
          type: 'p',
          text: 'The piece turns that into three small experiments. The first shows four saturated hues and then four empty circles on gray, so you can see that each color leaves its opposite. The second shows a landscape painted in the *complements* of its true colors: a yellow sky, a magenta meadow, cyan poppies. When it is replaced by a pale gray line drawing, the afterimage of the complements is the true palette, and for a few seconds the drawing appears in color: blue sky, green field, red poppies. The third is the lilac chaser, which adds motion and a second effect, the slow disappearance of anything that does not change.',
        },
        { type: 'h', text: 'A short history' },
        {
          type: 'p',
          text: 'Afterimages are old knowledge. Aristotle noticed that after looking at the sun or at a bright color, the impression stays in the eye when you look away. Johann Wolfgang von Goethe gave them a central place in his *Theory of Colours* (*Zur Farbenlehre*, 1810), where he called them physiological colors, colors produced by the eye itself. His most famous example happened in an inn: he watched a young woman in a scarlet bodice, and when she moved away he saw her figure on the white wall, the dress now a sea-green. Goethe was wrong about much of the physics of light, but he was a careful observer of the eye, and he described the pairing of each color with its opposite in detail. Michel-Eugène Chevreul, in his 1839 study of color contrast, called the effect *successive contrast*, to set it beside the *simultaneous contrast* of neighboring colors.',
        },
        {
          type: 'p',
          text: 'The explanation took the rest of the nineteenth century. Thomas Young (1802) and Hermann von Helmholtz (1850s) proposed that color vision rests on three kinds of receptor, which turned out to be true. Ewald Hering, from the 1870s, argued instead for three *opposed* processes: red against green, yellow against blue, and light against dark. Hering pointed to things trichromacy alone did not explain. No color looks reddish-green or yellowish-blue. And afterimages come in those same opposed pairs. The two theories were long treated as rivals. They are now understood as two stages of one system: three cone types at the front, and opponent channels built from their differences just behind. Leo Hurvich and Dorothea Jameson measured the opponent channels psychophysically in the 1950s, and Russell De Valois and colleagues found cells in the primate visual pathway that fire for one color and fall silent for its opponent.',
        },
        { type: 'h', text: 'Fading' },
        {
          type: 'p',
          text: 'In 1804 the Swiss physician and philosopher Ignaz Paul Vital Troxler reported that if you hold your gaze steady, a faint object away from the center of vision gradually disappears, filled in by its surroundings. *Troxler fading* happens because the visual system answers change, not constancy. Normally our eyes never stop moving: tiny involuntary jumps called microsaccades refresh the image on the retina several times a second. In 2006 Susana Martinez-Conde and colleagues showed that fading sets in when microsaccades become rare and reverses when they return. Blurred edges and low contrast help a target fade, which is why the dots of the lilac chaser are soft.',
        },
        {
          type: 'p',
          text: 'The lilac chaser itself was made by Jeremy Hinton, and it spread widely around 2005, notably through Michael Bach’s collection of visual phenomena. Twelve blurred lilac dots sit in a ring on gray around a small cross, and one dot vanishes for about a tenth of a second, then the next, and so on around. If you watch the dots, you see a gap running round. If you fix your eyes on the cross, three things happen in turn: the gap becomes a moving green dot, the afterimage of lilac on gray; after ten or twenty seconds the lilac dots fade away entirely; and you are left watching a single green dot circling an empty gray field, a dot that was never on the screen.',
        },
        {
          type: 'aside',
          title: 'Why it matters',
          text: 'Afterimages are one of the plainest demonstrations that the eye is not a camera. What you see at any moment depends on what you saw a moment ago. The same adaptation that makes a gray wall look green after a red disc is what lets you read a page by candlelight and in sunlight, a range of brightness of a million to one, and still see white paper as white.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Physiology',
      title: 'The science',
      blocks: [
        { type: 'h', text: 'Three cones, and their gains' },
        {
          type: 'p',
          text: 'The retina has three kinds of cone, called L, M and S for the long, middle and short wavelengths they respond to best. Each cone adjusts its sensitivity to the light it has recently received, a process called *adaptation*. Part of it is chemical: light bleaches the photopigment, which takes time to regenerate. At the brightness of a screen, more of it is a change of gain in the cone and in the cells after it, which turn down their response to a steady input. A useful first description is the *von Kries* rule, proposed by Johannes von Kries around 1902: each cone class scales its signal by a gain inversely proportional to the light it is adapted to.',
        },
        { type: 'math', tex: 'r_X = g_X \\, E_X, \\qquad g_X \\propto \\frac{1}{A_X}, \\qquad X \\in \\{L, M, S\\}', label: '(1)', caption: '$E_X$ is the excitation of cone class $X$ by the light now arriving; $A_X$ is the excitation it has adapted to; $r_X$ is its response.' },
        {
          type: 'p',
          text: 'Suppose one patch of retina has adapted to a stimulus $S$ while the rest has adapted to a gray $N$. Then the gray appears. Over the patch, every cone class responds to the gray in proportion to $N_X / S_X$ rather than $N_X / N_X = 1$. Where the stimulus excited the L cones strongly, the gray now excites them weakly, and so on for each class. Written as *cone contrast*, the fractional difference from the gray, the afterimage is approximately the stimulus contrast with its sign reversed:',
        },
        { type: 'math', tex: 'c_X = \\frac{S_X - N_X}{N_X}, \\qquad \\Delta_X \\approx -\\kappa \\, c_X, \\qquad 0 < \\kappa < 1', label: '(2)', caption: '$c_X$ is the stimulus’s cone contrast; $\\Delta_X$ is the apparent contrast of the gray afterwards; $\\kappa$ depends on how long and how steadily you looked, and fades with time.' },
        {
          type: 'p',
          text: 'Opponent channels then combine the three cone signals into differences: roughly $L - M$ (red against green), $S - (L + M)$ (blue against yellow) and $L + M$ (light against dark). Because the channels are linear in the cone contrasts to a first approximation, flipping the sign of every cone contrast flips every opponent signal too. In an opponent space, the afterimage is the stimulus reflected through the gray point and scaled down by $\\kappa$. A red disc, which pushes the red–green channel toward red, leaves a patch that pushes it toward green, and because red light also sits slightly on the yellow side, the ghost leans blue: cyan, not a pure green.',
        },
        { type: 'figure', svg: wiringFigure, alt: 'Three cones, L, M and S, feeding three opponent channels: L minus M, L plus M, and S minus L plus M.', caption: 'Two stages: three cone types, then opponent channels made from their sums and differences.' },
        {
          type: 'p',
          text: 'Where exactly the afterimage is made is still studied. Most of it is retinal. In 2012 Qasim Zaidi, Barry Lee and colleagues recorded from retinal ganglion cells in macaques and found that, when a colored light is turned off, the cells rebound with a response of the opposite sign that matches the color and time course of the afterimages people report. The brain contributes too, which is why an afterimage can be shaped by an outline drawn on the test field, the effect experiment II leans on.',
        },
        { type: 'h', text: 'Designing the stimulus in OKLab' },
        {
          type: 'p',
          text: 'To paint a landscape that the eye will repaint in its true colors, the piece needs, for each true color $T$, a stimulus whose afterimage on the gray is $T$. Equation (2) says: show the reflection of $T$ through the gray. The piece does that in OKLab, a perceptual color space published by Björn Ottosson in 2020. OKLab starts from an LMS-like stage, applies a cube-root compression, and forms a lightness $L$ and two opponent axes, $a$ (green to red) and $b$ (blue to yellow). Its neutral axis is $a = b = 0$. In polar form, the chroma is $C = \\sqrt{a^2 + b^2}$ and the hue is $h = \\operatorname{atan2}(b, a)$.',
        },
        { type: 'math', tex: '(L_s,\\; a_s,\\; b_s) = (\\ell(L_T),\\; -\\gamma\\, a_T,\\; -\\gamma\\, b_T), \\qquad h_s = h_T + 180°', label: '(3)', caption: 'The stimulus for true color $T$. $\\ell$ maps lightness toward the middle and $\\gamma > 1$ raises chroma, limited by the sRGB gamut.' },
        {
          type: 'p',
          text: 'Two choices make the effect strong. First, the stimulus lightness is pulled toward a mid value, $\\ell(L) = 0.73 + 0.35(0.62 - L)$, clamped to 0.52–0.90, so that each region differs from the gray mostly in color, not in brightness. A much brighter patch would leave a dark afterimage that muddies the color. Second, chroma is pushed as high as the screen allows: $C_s = \\min(0.24,\\, 1.3\\,C_T + 0.05)$, then reduced only as far as needed to fit sRGB, keeping hue and lightness fixed. The gray the afterimage lands on is OKLab $L = 0.82$, $a = b = 0$, a light neutral, and the line drawing keeps a faint trace of each region’s true lightness, $0.82 + 0.16(L_T - 0.62)$, so the brain has shapes to hang the colors on.',
        },
        { type: 'figure', svg: planeFigure, alt: 'The OKLab a–b plane with a stimulus point and its afterimage reflected through the gray origin.', caption: 'In an opponent plane the afterimage sits opposite the stimulus, closer to gray. To see a color, show its opposite.' },
        {
          type: 'table',
          head: ['Region', 'True (OKLCH)', 'Shown (OKLCH)', 'Shown, sRGB'],
          rows: [
            ['Upper sky', 'L 0.52 · C 0.13 · 262°', 'L 0.77 · C 0.16 · 82°', '#E4A700'],
            ['Low sky', 'L 0.80 · C 0.11 · 55°', 'L 0.67 · C 0.14 · 235°', '#00A0DE'],
            ['Sun', 'L 0.93 · C 0.11 · 95°', 'L 0.62 · C 0.21 · 275°', '#6773FF'],
            ['Sea', 'L 0.50 · C 0.10 · 235°', 'L 0.77 · C 0.16 · 55°', '#FF9748'],
            ['Meadow', 'L 0.62 · C 0.15 · 138°', 'L 0.73 · C 0.22 · 318°', '#DF71FF'],
            ['Poppies', 'L 0.56 · C 0.21 · 28°', 'L 0.75 · C 0.13 · 208°', '#00C4D9'],
          ],
          caption: 'Six of the ten regions of experiment II. Every hue turns by 180°; chroma is what the sRGB gamut allows at that lightness.',
        },
        { type: 'h', text: 'The lilac chaser' },
        {
          type: 'p',
          text: 'The chaser stacks three effects. The gap, jumping from one position to the next every 0.1 s, is seen as motion: the eye links successive changes into a moving thing, as it does with the lights on a marquee. Under steady fixation each lilac dot adapts its patch of retina, so when it vanishes the gray in its place carries a green afterimage; with the gap moving, the green appears to run. And because the eyes are held still and the dots are soft-edged and unchanging, Troxler fading removes the lilac. The green dot does not fade, because it is the one thing in the display that keeps changing.',
        },
        {
          type: 'p',
          text: 'The piece predicts the green the same way it designs the landscape: the lilac is OKLCH $L$ 0.70, $C$ 0.15, $h$ 335°, so its afterimage on the gray lies near $h$ 155°, a soft green. When the experiment ends, that predicted green is drawn running in the gap, and the lilac is faded out, so you can compare the picture with what your eye did.',
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
          text: 'Afterimage is one TypeScript module drawing to a canvas with the Canvas 2D API. Each experiment has four phases on its own clock: an arrival (2.6 s, the plate fades in and the caption settles), the count (12, 20 or 16 s of fixation), the gray (9 to 13 s), and a short departure. After the last experiment the loop begins again. Tapping during the count sends the clock back to the start of the count; tapping once the gray is up moves on.',
        },
        {
          type: 'p',
          text: 'The hardest design rule is stillness. Anything that moves during the count pulls the eyes and spoils the adaptation, so during fixation nothing animates except a thin ring around the cross that empties clockwise over the count, and the number under the plate, which changes once a second. Captions arrive before the count starts and stay put. The ruler at the bottom shows progress in three steps rather than with a moving playhead. When the count ends, the stimulus is replaced in a single frame: a crossfade would let the gray arrive gradually and weaken the afterimage.',
        },
        { type: 'h', text: 'Colors that keep their hue' },
        {
          type: 'p',
          text: 'Saturated colors often fall outside the sRGB gamut. The shared color library brings them in by adding white, which keeps them displayable but brightens them. For an afterimage stimulus that would undo the careful lightness, so the piece has its own conversion that keeps $L$ and $h$ fixed and bisects on chroma until the color fits:',
        },
        {
          type: 'code',
          code: `/** OKLCH (h in degrees) → gamma sRGB, keeping L and h and lowering chroma until it fits sRGB. */
function lch(L: number, Cc: number, hDeg: number): Rgb {
  const h = hDeg * DEG
  const at = (c: number) => oklabToLinear([L, c * Math.cos(h), c * Math.sin(h)])
  if (inGamut(at(Cc))) return toSrgb(at(Cc))
  let lo = 0
  let hi = Cc
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(at(mid))) lo = mid
    else hi = mid
  }
  return toSrgb(at(lo))
}

/** The stimulus for a true color: the opposite hue about the neutral axis, mid lightness, full chroma. */
function stimulusOf([L, Cc, h]: Lch): Rgb {
  const Ls = clamp(0.73 + 0.35 * (0.62 - L), 0.52, 0.9)
  return lch(Ls, Math.min(0.24, Cc * 1.3 + 0.05), h + 180)
}`,
          caption: 'Equation (3) in code. Twenty halvings find the largest in-gamut chroma to about one part in a million.',
        },
        { type: 'h', text: 'The landscape' },
        {
          type: 'p',
          text: 'The field at dusk is ten regions: two bands of sky, a cloud, the sun, the sea and its glitter, a headland, the meadow, a tree and ten poppies, each a `Path2D` built from lines, arcs and Bézier curves in coordinates relative to the plate, so it fits any aspect ratio. The same paths are filled three ways: with the stimulus colors, with the neutral tones of the line drawing, and, at the end of the experiment, with the true colors, which wash in over three seconds so you can compare what your eye painted with what the picture really was. A second path holds the drawing details, grass, stems, ripples and birds, stroked faintly in every phase so that the stimulus and the drawing line up exactly.',
        },
        { type: 'h', text: 'Soft dots, cheaply' },
        {
          type: 'p',
          text: 'Canvas blur filters are slow, so the chaser’s dots are drawn once into a small off-screen canvas as a radial gradient that samples a Gaussian, then stamped twelve times a frame. The gap is a pure function of the experiment clock:',
        },
        {
          type: 'code',
          code: `const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
// exp(−x²/2σ²) with σ = r/2.6, sampled at the stops
for (let k = 0; k <= 8; k++) {
  const x = k / 8
  const a = Math.exp(-(x * 2.6) * (x * 2.6) / 2) * (1 - x * x * 0.15)
  grd.addColorStop(x, \`rgba(\${cr},\${cg},\${cb},\${k === 8 ? 0 : a.toFixed(3)})\`)
}

// …and in the frame: one dot missing in turn, clockwise from the top, about 0.1 s each
const gap = Math.floor(tt / 0.1) % 12`,
          caption: 'The sprite and the chaser’s timing. Because the step is discrete, the gap jumps; it never fades in or out.',
        },
        { type: 'h', text: 'Sound and the card' },
        {
          type: 'p',
          text: 'With sound on, the last five seconds of each count are marked by soft ticks, so you can keep your eyes still without reading the number, and a quiet four-note chord sounds when the gray appears. On the Playground card the experiments run with shorter counts (6 to 7 s) and no sound; a shorter adaptation gives a weaker afterimage, but you can still catch it.',
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
            '**The cross:** where to look. Keep your eyes on its center for the whole count, and after it.',
            '**The ring around the cross:** the count, emptying clockwise. It is the only thing that moves while you adapt.',
            '**Under the plate:** the count in seconds, then, once the gray is up, what to do or notice (*keep looking*, *blink to renew it*).',
            '**Right column (wide screens):** the experiment’s recipe, such as the stimulus rule $a, b \\to -a, -b$, the neutral gray it turns about, and the adaptation time, then what the screen shows afterward. *C 0.000* means the gray has no chroma at all: any color you see there is yours.',
            '**The color bar (experiment I):** after a few seconds of gray, the four hues you looked at and, below them, a faint version of what the eye adds, the predicted afterimage at chroma 0.075 on the gray.',
            '**The labels in the circles (experiment I):** each color and its opposite, *RED → CYAN* and so on.',
            '**Experiment III, afterward:** the predicted green dot running in the gap, dashed circles where the lilac was, and two notes: the green was never on screen; the lilac faded while you looked.',
            '**Bottom ruler:** the three experiments, the current one in ink, filled to the phase reached. Tap a segment to go there.',
          ],
        },
        {
          type: 'p',
          text: 'Things to try: in experiment II, blink slowly once or twice after the gray appears and the colors come back for a moment. Move your eyes a little and the colors move with them, off the drawing, which shows they are on your retina, not on the page. And in the lilac chaser, glance away from the cross for a second: the lilac dots return at once.',
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
            '**OKLab is not the visual system.** Its axes approximate opponent channels and its lightness approximates perceived lightness, but the afterimage is generated in cone and post-receptoral terms. Predicting it by reflecting in OKLab is a good first approximation; the exact hue of your afterimage will differ a little.',
            '**Afterimages vary.** Their strength depends on the screen’s brightness and color, the room, your viewing distance, how steady your gaze is, and on you. Some people see vivid afterimages; some see faint ones. If the second experiment shows little, try it again with the screen brighter and the room darker.',
            '**The palette is invented.** The true colors of the field at dusk are chosen to be plausible and to sit well inside the sRGB gamut once complemented. They are not measured from a photograph.',
            '**Drawing the percept.** After the lilac chaser, the piece draws a green dot and fades the lilac to show what your eye did. That is a picture of a perception, not a measurement of it; during the experiment itself the green is never on screen.',
            '**Timing.** Hinton’s chaser removes one dot for about a tenth of a second; the piece uses exactly 0.1 s, so the gap goes round once every 1.2 s. The fixation times are long enough for a clear afterimage and short enough to be comfortable; laboratory studies often use longer adaptation.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Theory of Colours', by: 'Johann Wolfgang von Goethe, trans. Charles Lock Eastlake', year: '1840', note: 'The English translation of *Zur Farbenlehre* (1810). The section on physiological colors describes afterimages, including the scarlet bodice.' },
    { title: 'The Principles of Harmony and Contrast of Colours', by: 'Michel-Eugène Chevreul', year: '1839', note: 'First published in French as *De la loi du contraste simultané des couleurs*; in English from 1854. Where successive and simultaneous contrast are named and set side by side.' },
    { title: 'Outlines of a Theory of the Light Sense', by: 'Ewald Hering, trans. Leo M. Hurvich & Dorothea Jameson', year: '1964', note: 'Harvard University Press. Hering’s opponent theory in his own words.' },
    { title: 'An opponent-process theory of color vision', by: 'Leo M. Hurvich & Dorothea Jameson', year: '1957', note: '*Psychological Review* 64. The opponent channels measured by hue cancellation.' },
    { title: 'Microsaccades counteract visual fading during fixation', by: 'Susana Martinez-Conde, Stephen L. Macknik, Xoana G. Troncoso & Thomas A. Dyar', year: '2006', note: '*Neuron* 49. Why a steady gaze makes things disappear.' },
    { title: 'Neural locus of color afterimages', by: 'Qasim Zaidi, Robert Ennis, Dingcai Cao & Barry Lee', year: '2012', note: '*Current Biology* 22. Afterimage signals in retinal ganglion cells.' },
    { title: 'Optical Illusions & Visual Phenomena', by: 'Michael Bach', note: 'A long-running online collection with careful notes, including the lilac chaser and Troxler fading.' },
    { title: 'A perceptual color space for image processing', by: 'Björn Ottosson', year: '2020', note: 'The definition of OKLab, the space the stimuli are designed in.' },
  ],
}

export default guide
