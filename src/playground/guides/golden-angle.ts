import type { Guide } from '../guide'

const angleFigure = `<svg viewBox="0 0 420 240" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="150" cy="120" r="3" fill="currentColor"/>
  <line x1="150" y1="120" x2="268" y2="120" stroke-dasharray="3 4" opacity="0.55"/>
  <circle cx="268" cy="120" r="9"/>
  <line x1="150" y1="120" x2="86" y2="61" stroke="#2B6A93"/>
  <circle cx="86" cy="61" r="9"/>
  <path d="M196 120 A46 46 0 0 0 116 89" stroke="#2B6A93"/>
  <path d="M121 84 L116 89 L123 92" stroke="#2B6A93"/>
  <text x="164" y="84" font-family="Geist Mono, monospace" font-size="10" fill="#2B6A93" stroke="none" letter-spacing="1">137.5°</text>
  <text x="276" y="138" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">SEED n − 1</text>
  <text x="40" y="44" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">SEED n</text>
  <path d="M150 120 m-96 0 a96 96 0 1 0 192 0 a96 96 0 1 0 -192 0" opacity="0.18"/>
  <line x1="330" y1="40" x2="330" y2="200" opacity="0.25"/>
  <text x="344" y="60" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">r = c√n</text>
  <text x="344" y="80" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">θ = n · 137.5°</text>
  <text x="344" y="112" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">360° / φ²</text>
  <text x="344" y="128" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">= 137.50776°</text>
</svg>`

const guide: Guide = {
  lede: 'How a sunflower packs its seeds: one fixed turn between each seed and the next. Every simple fraction of a turn leaves gaps, and the one turn no fraction can reach leaves none.',
  facts: [
    ['Phenomenon', 'Phyllotaxis: the arrangement of leaves, florets and seeds'],
    ['Model', 'Vogel’s spiral, 1979: $r = c\\sqrt{n}$, $\\theta = n\\alpha$'],
    ['Golden angle', '$360° / \\varphi^2 \\approx 137.50776°$'],
    ['Golden ratio', '$\\varphi = (1 + \\sqrt{5})/2 = 1.6180339887\\ldots$'],
    ['Convergents', '1/2, 1/3, 2/5, 3/8, 5/13, 8/21, 13/34'],
    ['Seeds', '520 in the viewer, 340 on the card'],
    ['Petals', '34, placed by the same angle'],
    ['Running time', '100 s in six chapters, looping seamlessly'],
    ['Sound', 'Optional: one note per seed, pitched by its angle'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
    ],
    gestures: [
      { gesture: 'move', action: 'Move the pointer to make wind' },
      { gesture: 'tap', action: 'Tap the meadow to plant a flower' },
      { gesture: 'tap', action: 'Tap a chapter on the ruler to jump to it' },
    ],
    tip: 'Turn the sound on for chapter II: every simple fraction plays a short, repeating figure, and the golden angle never repeats.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Botany',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Look closely at the head of a sunflower and you see two families of spirals crossing, one winding clockwise and one counter-clockwise. Count them and you almost always find two neighbouring numbers from the sequence 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, in which each number is the sum of the two before it. A modest head might show 34 and 55; a large one 55 and 89, or even 89 and 144. Pine cones, pineapples, the florets of a daisy, the scales of an artichoke and the leaves climbing many stems show the same thing. The arrangement is called *phyllotaxis*, from the Greek for "leaf arrangement", and it is one of the oldest puzzles in biology.',
        },
        {
          type: 'p',
          text: 'The spirals are not drawn by the plant. Nothing in a sunflower knows about spirals or Fibonacci numbers. Each new floret simply appears at the growing tip, a fixed angle around from the one before, and pushes the older ones outward. The spirals, called *parastichies*, are what the eye picks out afterward: chains of nearest neighbours that happen to line up. Which chains line up depends on a single number, the angle between one floret and the next.',
        },
        {
          type: 'p',
          text: 'In most plants that angle is close to 137.5°. It has a name, the **golden angle**, because it divides a full turn in the golden ratio: the smaller arc is to the larger as the larger is to the whole circle. This piece is about why that number, and only that number, packs a head so well.',
        },
        { type: 'h', text: 'A short history' },
        {
          type: 'p',
          text: 'Johannes Kepler noticed the pattern in 1611, in a little New Year’s essay on snowflakes, where he linked the five-fold symmetry of flowers to the ratio of successive Fibonacci numbers. In the 1830s the botanists Karl Schimper and Alexander Braun described leaf arrangements as fractions of a turn (1/2, 1/3, 2/5, 3/8, 5/13…) and noticed that the fractions were built from Fibonacci numbers. The brothers Louis and Auguste Bravais, in 1837, took the next step: the angle itself, measured carefully, is close to an irrational 137.5°, and the fractions are only the approximations the eye settles on.',
        },
        {
          type: 'p',
          text: 'The question then became *why*. In 1868 Wilhelm Hofmeister observed that a new leaf primordium forms in the largest gap left by the existing ones, as far as possible from its neighbours. Alan Turing worked on the problem in his last years, alongside his 1952 paper on morphogenesis. In 1992 the physicists Stéphane Douady and Yves Couder reproduced the whole sequence in a dish: drops of ferrofluid falling at a steady rate onto a magnetised plate repelled each other, drifted outward, and settled into Fibonacci spirals with no biology at all. A decade later, Didier Reinhardt and colleagues showed the biological mechanism: each young primordium drains the growth hormone auxin from around itself, so the next one can only form in the largest unclaimed gap. Hofmeister’s rule, a physical repulsion, and a hormone all lead to the same angle.',
        },
        {
          type: 'aside',
          title: 'Not every sunflower',
          text: 'In 2012, for the centenary of Turing’s birth, the Manchester Science Festival asked the public to grow sunflowers and photograph their heads. Of the several hundred heads analysed, roughly four in five showed Fibonacci counts; the rest showed near-misses, such as Lucas numbers (4, 7, 11, 18, 29…), or patterns too irregular to count. The golden angle is where growth tends to land, not a law it obeys.',
        },
      ],
    },
    {
      id: 'fractions',
      kicker: 'Number theory',
      title: 'Why simple fractions fail',
      blocks: [
        {
          type: 'p',
          text: 'Write the angle between consecutive seeds as a fraction $\\alpha$ of a full turn, so seed $n$ sits at angle $2\\pi n \\alpha$. Suppose $\\alpha$ is a simple fraction $p/q$. Then seed $n + q$ sits at angle $2\\pi(n\\alpha + p)$, which is the same direction as seed $n$. Every $q$-th seed lands on the same ray, the seeds stack into exactly $q$ straight spokes, and the space between the spokes widens forever as the head grows. That is chapter II of the piece: half a turn makes two spokes, a third of a turn three, and so on.',
        },
        { type: 'math', tex: '\\alpha = \\frac{p}{q} \\quad\\Rightarrow\\quad \\theta_{n+q} = \\theta_n + 2\\pi p \\equiv \\theta_n', caption: 'A rational turn repeats every $q$ seeds, so $q$ spokes and widening gaps.' },
        {
          type: 'p',
          text: 'An irrational $\\alpha$ never repeats exactly, but it can come close. If $\\alpha$ is very near some fraction $p/q$, then seeds $q$ apart are *nearly* aligned and the eye sees $q$ arms, gently curving instead of straight. The better the approximation, the more the head looks like spokes and gaps. So the best angle is the one that is badly approximated by every fraction: the *most irrational* number.',
        },
        { type: 'h', text: 'Continued fractions' },
        {
          type: 'p',
          text: 'There is a precise way to measure how well a number can be approximated by fractions. Every real number has a *continued fraction*: a whole part, then one over a whole number plus one over a whole number, and so on. Cutting it off at each stage gives the *convergents*, the best rational approximations there are for their size of denominator.',
        },
        { type: 'math', tex: 'x = a_0 + \\frac{1}{a_1 + \\frac{1}{a_2 + \\frac{1}{a_3 + \\ldots}}} = [a_0; a_1, a_2, a_3, \\ldots]' },
        {
          type: 'p',
          text: 'A large term $a_k$ means the convergent just before it is an unusually good approximation, because the remainder it leaves is tiny. The error of the convergent $p_k/q_k$ is bounded by:',
        },
        { type: 'math', tex: '\\left| x - \\frac{p_k}{q_k} \\right| < \\frac{1}{a_{k+1}\\, q_k^2}' },
        {
          type: 'p',
          text: 'So the hardest number to approximate is the one whose terms are all as small as possible, all ones. That number is the golden ratio:',
        },
        { type: 'math', tex: '\\varphi = 1 + \\frac{1}{1 + \\frac{1}{1 + \\frac{1}{1 + \\ldots}}} = [1; 1, 1, 1, \\ldots] = \\frac{1 + \\sqrt{5}}{2}', caption: 'The golden ratio satisfies $\\varphi = 1 + 1/\\varphi$, which is the continued fraction read aloud.' },
        {
          type: 'p',
          text: 'Hurwitz’s theorem (1891) makes "most irrational" exact. For any irrational $x$ there are infinitely many fractions with $|x - p/q| < 1/(\\sqrt{5}\\,q^2)$, and the constant $\\sqrt{5}$ cannot be improved, because for the golden ratio and the numbers equivalent to it, no larger constant works. Every other irrational number can be approximated better.',
        },
        { type: 'h', text: 'From the ratio to the angle' },
        {
          type: 'p',
          text: 'The golden angle is the turn $\\alpha = 1/\\varphi^2 = 2 - \\varphi \\approx 0.381966$, or 137.50776°. (Going the other way round the circle it is $1/\\varphi \\approx 0.618$, or 222.49°; the head looks the same, mirrored.) Its continued fraction is $[0; 2, 1, 1, 1, \\ldots]$, and its convergents are exactly the fractions the botanists of the 1830s recorded:',
        },
        {
          type: 'table',
          head: ['Convergent', 'Turn', 'Angle', 'Spokes', 'Error vs golden'],
          rows: [
            ['1/2', '0.500000', '180.000°', '2', '+42.49°'],
            ['1/3', '0.333333', '120.000°', '3', '−17.51°'],
            ['2/5', '0.400000', '144.000°', '5', '+6.49°'],
            ['3/8', '0.375000', '135.000°', '8', '−2.51°'],
            ['5/13', '0.384615', '138.462°', '13', '+0.95°'],
            ['8/21', '0.380952', '137.143°', '21', '−0.36°'],
            ['13/34', '0.382353', '137.647°', '34', '+0.14°'],
            ['$1/\\varphi^2$', '0.381966…', '137.508°', 'none', '0'],
          ],
          caption: 'The stops in chapter II. The errors alternate in sign and shrink by about $\\varphi^2 \\approx 2.6$ each time, and the spoke counts are the Fibonacci numbers.',
        },
        {
          type: 'p',
          text: 'Notice the spoke counts in the last column: 2, 3, 5, 8, 13, 21, 34. The denominators of the convergents of the golden ratio are Fibonacci numbers, which is why the spirals in a sunflower come in Fibonacci counts. At a given radius the eye picks the convergent whose spacing best matches the local seed spacing; near the centre that is a small one (8 or 13), and further out a larger one (21, 34, 55). That is why the spiral count of a head rises as it grows.',
        },
        { type: 'figure', svg: angleFigure, alt: 'Two consecutive seeds 137.5 degrees apart around a centre, with the rule r equals c root n.', caption: 'Each seed sits one golden angle on from the last, a little further out.' },
        { type: 'h', text: 'Why it packs evenly' },
        {
          type: 'p',
          text: 'There is a lovely theorem behind the evenness. Place points on a circle at $0, \\alpha, 2\\alpha, \\ldots, (n-1)\\alpha$ turns. The **three-gap theorem**, proved independently in the late 1950s by Vera Sós, János Surányi and Stanisław Świerczkowski after a conjecture of Hugo Steinhaus, says the gaps between neighbouring points never take more than three different lengths, whatever $\\alpha$ and $n$ are. For the golden turn the three lengths stay in golden proportion to one another, and each new point always falls into one of the largest gaps and splits it in golden ratio. That is Hofmeister’s rule restated as arithmetic: the new seed goes where there is the most room.',
        },
      ],
    },
    {
      id: 'vogel',
      kicker: 'Geometry',
      title: 'Vogel’s model',
      blocks: [
        {
          type: 'p',
          text: 'Angle is only half a placement; a seed also needs a distance from the centre. In 1979 Helmut Vogel proposed the simplest rule that gives an evenly packed disc:',
        },
        { type: 'math', tex: 'r_n = c\\sqrt{n}, \\qquad \\theta_n = 2\\pi n \\alpha', label: '(Vogel)' },
        {
          type: 'p',
          text: 'The square root is what makes the density uniform. The first $n$ seeds fill a disc of radius $r_n$, whose area is $\\pi r_n^2 = \\pi c^2 n$, so every seed gets the same area, $\\pi c^2$, however far out it lies. With a constant radius step instead (an Archimedean spiral) the seeds would crowd the centre and thin out at the rim. The constant $c$ just sets the scale: in the piece, $c = R/\\sqrt{N}$ so that seed $N$ lands on the rim of a head of radius $R$, and each seed is drawn as a circle of radius $0.43c$, close to the largest that fits without touching.',
        },
        {
          type: 'p',
          text: 'Vogel’s spiral is an idealisation. A real head grows from the outside in (the oldest florets are on the rim), florets vary a little in size, and the angle wanders. But it captures the essential fact: everything visible in the pattern follows from one angle and one square root.',
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
          text: 'Golden Angle is a single TypeScript module of about 1,300 lines, drawing to one canvas with the Canvas 2D API. There are no images, video or libraries. The whole film is a **pure function of time**: given a moment $T$ between 0 and 100 seconds, every position, opacity and stroke can be computed from scratch. That makes it seekable (the arrow keys jump between chapters), deterministic (the same moment always looks the same), and easy to test. The only state that builds up is what you add: wind from the pointer, and any flowers you plant.',
        },
        { type: 'h', text: 'The timeline' },
        {
          type: 'table',
          head: ['Chapter', 'Time', 'What happens'],
          rows: [
            ['I · A turn', '0–14 s', 'Seeds appear one at a time, each one golden angle on from the last, then accelerate to 520 while the view zooms out'],
            ['II · Close is not enough', '14–34 s', 'The turn steps through the convergents 1/2 … 13/34; the seeds rearrange live into 2, 3, 5 … 34 spokes'],
            ['III · The golden angle', '34–46 s', 'The turn locks to $1/\\varphi^2$; the 21 and 34 parastichy families draw themselves'],
            ['IV · Bloom', '46–64 s', 'The head rises onto a stem, leaves unfurl, 34 petals open, florets open from the rim inward'],
            ['V · Wind', '64–84 s', 'Petals fall, florets ripen into seeds, 92 seeds fly, about half take root as a meadow'],
            ['VI · Begin again', '84–100 s', 'Dusk; the camera dives into one flower, whose seeds retract until one is left: the first frame'],
          ],
        },
        { type: 'h', text: 'Stepping through the convergents' },
        {
          type: 'p',
          text: 'Chapter II is the heart of the piece. All 520 seeds are redrawn every frame from the current turn, so easing the turn smoothly from one fraction to the next makes the pattern twist live between them. The spokes uncurl into spirals and re-form with more arms. Each stop holds for 1.25 s, so the eye can count the spokes, and then eases on:',
        },
        {
          type: 'code',
          code: `function turnAt(T: number) {
  if (T < 14 || T >= LOCK) return { turn: GOLD, stop: -1, hold: 0 }
  const k = Math.min(STOPS.length - 1, Math.floor((T - STOP_T0) / STOP_DT))
  const tk = STOP_T0 + k * STOP_DT
  const [p, q] = STOPS[k]
  const here = p / q
  if (T < tk + HOLD) return { turn: here, stop: k, hold: inHold }
  // ease towards the next convergent (or, after 13/34, the golden turn)
  const next = isLast ? GOLD : STOPS[k + 1][0] / STOPS[k + 1][1]
  const u = (T - tk - HOLD) / (tEnd - tk - HOLD)
  return { turn: lerp(here, next, ease.inOutCubic(u)), stop: -1, hold: 0 }
}`,
          caption: 'The turn as a function of time (trimmed). `GOLD` is `2 − φ`.',
        },
        {
          type: 'p',
          text: 'With half a turn, 260 seeds stack on each of two spokes and the circles merge into a dark bar. So the seed glyphs shrink when there are few spokes, to about a seventh of their size at 1/2, and grow back as the denominators rise. The gaps become the subject, not the overlap.',
        },
        { type: 'h', text: 'Drawing 520 seeds quickly' },
        {
          type: 'p',
          text: 'Each frame computes every seed’s position into two preallocated `Float32Array`s, then builds the circles into a handful of `Path2D` objects, one per visual state (closed floret, opening floret, ripe seed), and strokes each once. Five hundred arcs in one path is cheap; five hundred separate stroke calls would not be. The same position arrays are reused to draw the spiral families in chapter III:',
        },
        {
          type: 'code',
          code: `/** Parastichies: join seed i to i+F — the spirals the eye sees. */
function lattice(F: number, n: number, c: number, progress: number) {
  const lim = Math.floor((n - F) * progress)
  ctx.beginPath()
  for (let i = 8; i < lim; i++) {
    const dx = xs[i + F] - xs[i]
    const dy = ys[i + F] - ys[i]
    // only near neighbours: far pairs belong to another spiral family
    if (dx * dx + dy * dy > c * c * 7.5) continue
    ctx.moveTo(xs[i], ys[i])
    ctx.lineTo(xs[i + F], ys[i + F])
  }
  ctx.stroke()
}`,
          caption: 'Joining every seed to the one 21 later draws the 21 spirals; 34 later, the 34. Drawing in index order grows them outward from the centre.',
        },
        {
          type: 'p',
          text: 'This is the parastichy idea in code. Seeds $F$ apart are nearest neighbours exactly when $F$ is a Fibonacci number suited to that radius, so the distance test keeps the true spiral segments and drops the long chords near the centre, where a smaller Fibonacci family takes over.',
        },
        { type: 'h', text: 'The zoom in chapter I' },
        {
          type: 'p',
          text: 'With only a few seeds, Vogel’s formula leaves them crowded at the centre of a large empty disc. So chapter I uses a moving scale, $c = R/\\sqrt{\\max(12, n + 2)}$, where $n$ is a smooth count of the seeds visible so far. The first seeds are drawn large, with their angle dimensioned, and the view eases outward as they multiply. The same formula, run backward, closes the film.',
        },
        { type: 'h', text: 'Bloom, seed and meadow' },
        {
          type: 'p',
          text: 'The 34 petals are placed with the golden angle too, and they open in golden order rather than around the circle, so the head fills in evenly from scattered points. The florets open from the rim inward, as real sunflower florets do. The stem is two hairlines along a quadratic curve, drawn on progressively, and the leaves are pairs of cubic curves with veins.',
        },
        {
          type: 'p',
          text: 'In chapter V, 92 seeds leave the head rim-first. Each has a precomputed flight: a start on the head, a landing point along the horizon, a lift, a flutter phase and a duration, all from a seeded random generator so every loop is the same. Positions along the flight are closed-form curves, so they stay seekable. The only exception is the pointer’s wind, which nudges seeds that are already in the air. About half the seeds take root, and the rest leave a dot that fades. On narrow screens fewer flowers grow, so a phone shows a sparse meadow rather than a crowded one.',
        },
        { type: 'h', text: 'The dive and the loop' },
        {
          type: 'p',
          text: 'The last chapter has to end exactly where the first begins: one seed, at the centre, on paper. The camera picks one meadow flower and zooms into it exponentially, so the speed of approach feels constant, while its head slides to the screen position of the opening head. Every other element fades as the dive begins.',
        },
        {
          type: 'code',
          code: `const zEnd = R / (tH * 0.15)            // the flower's head grows to the opening size
const de = ease.inOutCubic(dive)
const z = Math.exp(Math.log(zEnd) * de)  // exponential zoom: constant apparent speed
const fsx = lerp(tx, cx, de)             // its centre slides to the opening centre
const fsy = lerp(ty, cy, de)
ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (fsx - tx * z), dpr * (fsy - ty * z))
const lwz = lw / z                       // hairlines stay one pixel under the zoom`,
          caption: 'The dive transform. When it finishes, the zoomed head is exactly the opening head, so the hand-off is invisible.',
        },
        {
          type: 'p',
          text: 'When the dive completes, the scene is replaced by the opening renderer drawing the same 89 seeds at the same place and size. The seeds then retract rim-first, the zoom formula from chapter I runs in reverse, and the ground fades from night back to paper. At 100 s one seed remains, the first frame of the next loop.',
        },
      ],
    },
    {
      id: 'sound',
      kicker: 'Music',
      title: 'The sound',
      blocks: [
        {
          type: 'p',
          text: 'With sound on, the piece plays the pattern it draws. Every seed is a note. Its angle, as a fraction of a turn, picks a degree of a D major pentatonic scale (D, E, F♯, A, B), its distance from the centre picks the octave, and its direction sets the stereo position:',
        },
        { type: 'math', tex: '\\text{degree}_n = \\lfloor 5 \\cdot \\operatorname{frac}(n\\alpha) \\rfloor, \\qquad \\text{pan}_n = 0.55 \\cos(2\\pi n\\alpha)' },
        {
          type: 'p',
          text: 'For a rational turn $p/q$, $\\operatorname{frac}(n\\alpha)$ takes only $q$ values and repeats every $q$ seeds, so each stop in chapter II plays a short, audibly repeating figure: two notes see-sawing at 1/2, three at 1/3, and so on. For the golden turn the values never repeat but fill the interval evenly (Weyl’s equidistribution theorem), so the melody wanders without settling into a loop.',
        },
        {
          type: 'p',
          text: 'Underneath sits a quiet pad of sine and triangle oscillators on D and A through a low-pass filter. The lock in chapter III brings a slow chord, and the dive a rising filtered-noise swell. Every sound is synthesised live with the Web Audio API through a soft compressor and a small feedback-delay room, and nothing plays until you turn the sound on.',
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
            '**Top right:** the live readouts: the turn $\\theta$ in degrees, the current fraction during chapter II, the seed count $n$, and after the lock the identities $360°/\\varphi^2$ and $\\varphi$.',
            '**Large numeral (chapter II):** the number of spokes the current fraction makes. It shows only while the turn rests on a fraction.',
            '**Ocean and lagoon spirals (chapter III):** the 21 and 34 parastichy families, labelled with their counts and their sense of rotation.',
            '**Moss stars (chapter IV):** open florets. Plain circles are florets still closed; teardrops are ripe seeds.',
            '**Fern lines:** leaf and petal veins.',
            '**Bottom ruler:** the 100-second timeline, with a tick per two seconds, the six chapter numerals, and a playhead. Tap a numeral to jump there.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the moment in chapter II when 5/13 eases toward 8/21 and the spokes visibly bend into spirals before straightening again; the near-stillness when the turn locks, after twenty seconds of motion; and the dive, where a single meadow flower becomes, without a cut, the head the film began with.',
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
            '**Sunflower seeds do not fly.** The parasol seeds of chapter V belong to a dandelion. The swap is for the story, a flower becoming a meadow; the phyllotaxis is the same in both.',
            '**The model places seeds; it does not grow them.** Real heads arrange themselves through growth and the hormone auxin; Vogel’s formula imposes the end result directly.',
            '**Perfect regularity.** Real angles scatter around 137.5°, and some heads show non-Fibonacci counts.',
            '**Petal counts.** Sunflowers have a variable number of ray florets, often but not always near a Fibonacci number. The piece uses 34 for the hero and 13 for the meadow.',
            '**Scale.** A large sunflower has well over a thousand florets. The piece uses 520, and 340 on the card, to keep the frame rate high on phones.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'A better way to construct the sunflower head', by: 'Helmut Vogel', year: '1979', note: '*Mathematical Biosciences* 44. The two-line model used here.' },
    { title: 'The Algorithmic Beauty of Plants', by: 'Przemysław Prusinkiewicz & Aristid Lindenmayer', year: '1990', note: 'Chapter 4 builds phyllotactic patterns from Vogel’s formula; freely available from the authors’ lab.' },
    { title: 'Phyllotaxis as a physical self-organized growth process', by: 'Stéphane Douady & Yves Couder', year: '1992', note: '*Physical Review Letters* 68. Fibonacci spirals from ferrofluid drops.' },
    { title: 'Regulation of phyllotaxis by polar auxin transport', by: 'Didier Reinhardt et al.', year: '2003', note: '*Nature* 426. The biological mechanism.' },
    { title: 'Novel Fibonacci and non-Fibonacci structure in the sunflower: results of a citizen science experiment', by: 'Jonathan Swinton, Erinma Ochu et al.', year: '2016', note: '*Royal Society Open Science* 3. Turing’s Sunflowers.' },
    { title: 'Phyllotaxis: A Systemic Study in Plant Morphogenesis', by: 'Roger V. Jean', year: '1994', note: 'Cambridge University Press. The comprehensive survey.' },
    { title: 'An Introduction to the Theory of Numbers', by: 'G. H. Hardy & E. M. Wright', note: 'Oxford University Press. Continued fractions and Hurwitz’s theorem.' },
    { title: 'The Six-Cornered Snowflake (Strena seu de nive sexangula)', by: 'Johannes Kepler', year: '1611', note: 'Where the Fibonacci ratio first meets botany.' },
  ],
}

export default guide
