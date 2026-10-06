import type { Guide } from '../guide'

const stairFigure = `<svg viewBox="0 0 420 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="50" y1="20" x2="50" y2="180"/><line x1="50" y1="180" x2="400" y2="180"/>
  <path d="M50 30 C 90 80, 130 112, 170 122 S 270 162, 400 174" stroke="#7FB6D9"/>
  <path d="M50 30 H 72 V 50 H 101 V 70 H 128 V 90 H 160 V 110 H 205 V 130 H 262 V 150 H 340 V 170 H 400" stroke-width="1.4"/>
  <g stroke-dasharray="2 3" opacity="0.5">
    <path d="M50 105 H 160 V 180"/><path d="M50 142 H 270 V 180"/><path d="M50 161 H 380 V 180"/>
  </g>
  <g fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="10">
    <text x="36" y="34" text-anchor="end">1</text><text x="36" y="109" text-anchor="end">½</text><text x="36" y="146" text-anchor="end">¼</text><text x="36" y="165" text-anchor="end">⅛</text>
    <text x="160" y="196" text-anchor="middle" font-size="9">t½</text><text x="270" y="196" text-anchor="middle" font-size="9">2 t½</text><text x="380" y="196" text-anchor="middle" font-size="9">3 t½</text>
    <text x="250" y="40" font-size="9" opacity="0.7">EIGHT ATOMS: A STAIRCASE</text>
    <text x="250" y="56" font-size="9" fill="#7FB6D9">THE LAW: N₀ · 2^(−t / t½)</text>
  </g>
</svg>`

const carbonFigure = `<svg viewBox="0 0 440 170" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="40" cy="40" r="16"/><path d="M28 52 L60 84" stroke-dasharray="2 3"/>
  <circle cx="74" cy="96" r="12"/><path d="M90 96 H 136 M130 91 L136 96 L130 101"/>
  <circle cx="156" cy="96" r="12" stroke="#7FB6D9"/><path d="M172 96 H 214 M208 91 L214 96 L208 101"/>
  <path d="M250 130 V 96 M250 96 C 230 80, 236 58, 250 52 C 264 58, 270 80, 250 96" />
  <path d="M286 96 H 326 M320 91 L326 96 L320 101"/>
  <path d="M346 112 L 356 86 L 372 92 L 386 82 L 398 108 Z"/>
  <path d="M352 104 L 392 104" opacity="0.4"/>
  <g fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="9" text-anchor="middle">
    <text x="40" y="18">COSMIC RAY</text><text x="74" y="126">N-14</text>
    <text x="113" y="86" font-size="8" opacity="0.7">+ n</text>
    <text x="156" y="126" fill="#7FB6D9">C-14</text>
    <text x="193" y="86" font-size="8" opacity="0.7">CO₂</text>
    <text x="250" y="150">A LIVING TREE</text>
    <text x="306" y="86" font-size="8" opacity="0.7">DIES</text>
    <text x="372" y="134">CHARCOAL</text>
    <text x="372" y="150" opacity="0.7">THE CLOCK RUNS</text>
  </g>
</svg>`

const guide: Guide = {
  lede:
    'No atom can be told when it will decay, and none of them grows older while it waits. Yet a few thousand of them, together, keep time well enough to date a hearth, or the Earth.',
  facts: [
    ['Law', '$N(t) = N_0\\, e^{-\\lambda t} = N_0 \\, 2^{-t/t_{1/2}}$'],
    ['Half-life', '$t_{1/2} = \\ln 2 / \\lambda$'],
    ['Discovered', 'Rutherford, 1900; Rutherford and Soddy’s transformation theory, 1902'],
    ['Model', 'Each atom’s decay time drawn once from the exponential distribution'],
    ['Sample', '16 to 2,500 atoms; the default fits the screen, up to 1,600'],
    ['Spread', 'Binomial: $\\pm\\sqrt{N p (1-p)}$ atoms around the law'],
    ['Carbon-14', '$t_{1/2}$ = 5,730 years (Libby used 5,568)'],
    ['Uranium-238', '$t_{1/2}$ = 4.468 billion years'],
    ['Running time', '78 s in five chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['Space'], action: 'A new isotope and a fresh sample (in III–IV, a fresh piece to date)' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag the sample slider under the lattice to change how many atoms there are' },
      { gesture: 'tap', action: 'Tap the atoms for a new isotope and a fresh sample' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'Drag the sample down to 16 atoms and watch the count become a staircase that wanders off the curve; drag it to 2,500 and the staircase disappears into the line.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [
      { label: 'New sample', code: 'Space', aria: 'New isotope and sample', wide: true },
      { label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true },
    ],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Physics',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'In 1896 Henri Becquerel left uranium salts on a photographic plate wrapped in black paper, in a drawer, and found the plate fogged. The salts were giving off something on their own, without sunlight, without any cause he could find. Marie and Pierre Curie took up the work, coined the word *radioactivity* in 1898, and found two new elements that were far more active than uranium: polonium and radium.',
        },
        {
          type: 'p',
          text: 'Ernest Rutherford, at McGill University in Montreal, noticed in 1900 that thorium compounds give off a radioactive gas, which he called the *emanation*, and that its activity falls by half about every minute, then half again, and so on, the same fraction in every equal interval. (The gas was radon-220, one of the isotopes in this piece; its half-life is 55.6 seconds.) In 1902, with the chemist Frederick Soddy, he made the leap: radioactive atoms are not giving off energy while staying the same. They are turning into atoms of other elements, a fixed fraction of them in each moment. It was alchemy, and it was true.',
        },
        {
          type: 'p',
          text: 'The fixed fraction is the strange part. A collection of radioactive atoms does not behave like a stock of candles, each burning down at its own steady rate. It behaves like a crowd in which, every second, each person independently flips a heavily weighted coin. In 1905 Egon von Schweidler pointed out what that implies: decay is a matter of pure chance for each atom, and so the count of decays in any interval must fluctuate. The fluctuations were soon measured, and they matched. A Geiger counter’s irregular clicking, with its gaps and sudden clusters, is the sound of that chance.',
        },
        { type: 'h', text: 'An atom does not age' },
        {
          type: 'p',
          text: 'An atom of carbon-14 made a minute ago and one made in the time of the pharaohs are, as far as anyone can tell, identical. Neither has any clock inside it that is running down. The probability that either decays in the next second is exactly the same, and it does not change however long the atom has already waited. Chapter I of the piece marks one atom near the middle of the lattice and asks when it will go. Nobody can say. When it does go, there is no reason and no warning; its neighbors, which may outlast it by many half-lives, are no different.',
        },
        {
          type: 'p',
          text: 'And yet chapter II is perfectly regular. Count the survivors in a large sample and they fall along a smooth curve that halves in a fixed time, the **half-life**: half of them left after one half-life, a quarter after two, an eighth after three. That regularity is not a property of any atom. It belongs to the crowd. It is the law of large numbers, and it is what turns radioactivity into a clock.',
        },
        {
          type: 'aside',
          title: 'Why it matters',
          text: 'The same law runs through medicine (iodine-131, with an eight-day half-life, treats thyroid disease and is gone within weeks), nuclear power and its waste, the heat inside the Earth (much of it from the decay of uranium, thorium and potassium), and the dating of almost everything old: bones, lava flows, meteorites, the oceans’ circulation, the age of the Earth itself.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Chance, by the thousand',
      blocks: [
        {
          type: 'p',
          text: 'Let $\\lambda$ be the probability per unit time that an atom decays. In a short interval $dt$ an atom decays with probability $\\lambda\\, dt$, independent of its past. So the probability that it survives to time $t$, $P(t)$, satisfies $dP = -\\lambda P\\, dt$, and',
        },
        { type: 'math', tex: 'P(\\text{survive to } t) = e^{-\\lambda t}, \\qquad t_{1/2} = \\frac{\\ln 2}{\\lambda}, \\qquad \\tau = \\frac{1}{\\lambda} = \\frac{t_{1/2}}{\\ln 2}', label: '(1)', caption: '$t_{1/2}$ is the half-life and $\\tau$ the mean life, about 1.44 half-lives.' },
        {
          type: 'p',
          text: 'The decay time $T$ of one atom therefore has the exponential distribution, the only continuous distribution that is **memoryless**: $P(T > s + t \\mid T > s) = P(T > t)$. Having survived $s$ seconds tells you nothing about the next $t$. For $N_0$ independent atoms, the number surviving at time $t$ is binomial, with $p = e^{-\\lambda t}$:',
        },
        { type: 'math', tex: '\\langle N(t) \\rangle = N_0\\, e^{-\\lambda t} = N_0 \\, 2^{-t / t_{1/2}}, \\qquad \\sigma_N = \\sqrt{N_0\\, p\\,(1 - p)}', label: '(2)' },
        {
          type: 'p',
          text: 'The first expression is the smooth curve in the piece; the second is the width of the pale band around it. The band’s width relative to the curve shrinks like $1/\\sqrt{N_0}$: with 25 atoms the count after one half-life is typically $12.5 \\pm 2.5$, a 20 percent spread, while with 1,600 it is $800 \\pm 20$, 2.5 percent, and with the $6 \\times 10^{10}$ carbon-14 atoms in a gram of living carbon the spread is a few parts in a million. Chapter II sweeps the sample from 1,600 down to 25 and back to show it.',
        },
        { type: 'figure', svg: stairFigure, alt: 'A smooth exponential curve with a staircase of eight steps wandering around it, and dashed lines at one half, one quarter and one eighth.', caption: 'Eight atoms make an eight-step staircase; the law is the curve it wanders around. Each step down is one decay.' },
        { type: 'h', text: 'Counting clicks' },
        {
          type: 'p',
          text: 'The number of decays in a short window $\\Delta t$, while the sample has barely changed, follows the Poisson distribution with mean $\\lambda N \\Delta t$. Its variance equals its mean, so a count of $n$ clicks carries an uncertainty of about $\\sqrt{n}$. This is the counting error that sets the precision of radiocarbon dates measured by decay: count 10,000 decays and the activity is known to 1 percent. The rate $A = \\lambda N$ is the **activity**, measured in becquerels (decays per second). A gram of carbon from a living plant decays at about 14 per minute, which is why early radiocarbon labs needed grams of sample and days of counting.',
        },
        { type: 'h', text: 'A clock you can read' },
        {
          type: 'p',
          text: 'If you know how much of an isotope a sample started with, $N_0$, and how much it has now, $N$, then equation (2) runs backward to its age:',
        },
        { type: 'math', tex: 't = \\frac{t_{1/2}}{\\ln 2}\\, \\ln \\frac{N_0}{N}', label: '(3)' },
        {
          type: 'p',
          text: 'For the charcoal in chapter III, $N/N_0 = 2^{-4000/5730} = 0.616$, and equation (3) returns 4,000 years. For a mineral that started with no daughter atoms, the daughters $D$ that have accumulated tell the same story: $D = N_0 - N$, so $t = \\frac{1}{\\lambda} \\ln\\left(1 + \\frac{D}{N}\\right)$. That form needs no knowledge of $N_0$ at all, only the ratio of daughter to parent in the sample today.',
        },
      ],
    },
    {
      id: 'carbon',
      kicker: 'Radiocarbon',
      title: 'Someone sat by this fire',
      blocks: [
        {
          type: 'p',
          text: 'Carbon-14 is made in the upper atmosphere, where neutrons from cosmic rays strike nitrogen-14 and knock out a proton. The new carbon is oxidized to carbon dioxide, mixes through the air within a few years, and enters every plant by photosynthesis and every animal that eats plants. While an organism lives, it keeps exchanging carbon with its surroundings, so its carbon-14 stays at about the atmospheric level: roughly one atom in a trillion ($1.2 \\times 10^{-12}$) of its carbon. When it dies, the exchange stops. From then on its carbon-14 only decays, with a half-life of about 5,730 years, back into nitrogen-14.',
        },
        { type: 'figure', svg: carbonFigure, alt: 'A flow from a cosmic ray striking nitrogen-14, to carbon-14, to carbon dioxide, to a living tree, to charcoal whose clock runs after death.', caption: 'The radiocarbon clock is set to zero by living, and starts at death.' },
        {
          type: 'p',
          text: 'Willard Libby and his colleagues at the University of Chicago worked out the method in the late 1940s. In 1949 James Arnold and Libby published the test that convinced everyone: samples of known age (wood from Egyptian tombs, and a slab of giant sequoia counted ring by ring) gave the right ages, within the errors. Libby received the Nobel Prize in Chemistry in 1960. His half-life, 5,568 years, was later revised to 5,730 ± 40 (the “Cambridge” value of 1962; current evaluations give about 5,700 ± 30), but laboratories still report *conventional radiocarbon ages* with Libby’s figure, by agreement, so that old and new results can be compared.',
        },
        {
          type: 'p',
          text: 'The amount of carbon-14 in the air has not been perfectly constant: it changes with the Sun’s activity, the Earth’s magnetic field, the carbon cycle, and lately with fossil fuels (which add old carbon with no carbon-14) and nuclear tests (which nearly doubled it in the 1960s). So a radiocarbon age is turned into a calendar age with a **calibration curve**, built from samples dated independently: tree rings counted back more than twelve thousand years, annually layered lake sediments, corals and cave formations. The current curves, IntCal20 for the Northern Hemisphere, reach back about 55,000 years, near the limit of the method. Since the late 1970s, accelerator mass spectrometry has counted the carbon-14 atoms themselves rather than waiting for them to decay, so a few milligrams of charcoal are enough.',
        },
        {
          type: 'p',
          text: 'The hearth in chapter III is an invention, but hearths like it are dated this way all the time. Charcoal is ideal: nearly pure carbon, fixed at the moment the wood stopped growing, and left exactly where a person put it. The fire is long out. The ghostly dashed flames are the only part of the drawing that is not there.',
        },
      ],
    },
    {
      id: 'earth',
      kicker: 'Geochronology',
      title: 'The age of the Earth',
      blocks: [
        {
          type: 'p',
          text: 'For the Earth, carbon-14 is useless; after fifty thousand years almost none is left. The clock that works is uranium decaying to lead. Uranium-238 decays through a chain of fourteen steps (eight alpha decays and six beta decays, through thorium, radium, radon and polonium among others) to stable lead-206, with an overall half-life of 4.468 billion years. Its lighter sibling uranium-235 decays to lead-207 with a half-life of 704 million years. Two clocks in one sample, running at different rates, check each other: if both give the same age, nothing has been gained or lost since the clock started.',
        },
        {
          type: 'p',
          text: 'The favorite timekeeper is **zircon**, zirconium silicate. When a zircon crystal grows from a melt, uranium fits into its lattice in place of zirconium, but lead, a larger ion with the wrong charge, is shut out. So a fresh zircon starts with uranium and essentially no lead, and every lead atom found in it later is a decay product: the clock in its purest form. Zircons are also hard, insoluble and nearly indestructible, so they survive erosion, sedimentation and even being carried down into the crust and back. The oldest known pieces of the Earth are zircons from the Jack Hills of Western Australia, 4.4 billion years old.',
        },
        {
          type: 'p',
          text: 'The Earth’s own rocks have all been recycled, so its age comes from meteorites, leftovers of the material the planets formed from. In 1956 Clair Patterson, at Caltech, measured the isotopes of lead in meteorites, including troilite from the iron meteorite that made Meteor Crater in Arizona, and found that they lay on a single line whose slope gave an age of 4.55 ± 0.07 billion years. Modern values agree: 4.54 ± 0.05 billion years. To make the measurement Patterson had to build one of the first ultra-clean laboratories, because the lead in ordinary dust swamped his samples, and that discovery led him to a long campaign against leaded gasoline.',
        },
        {
          type: 'p',
          text: 'Chapter IV draws the coincidence that makes this one memorable: $2^{-4.54/4.468} = 0.494$. The Earth is almost exactly one half-life of uranium-238 old, and about half of the uranium-238 it was made with is still here, in the rocks under your feet, quietly turning into lead.',
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
          text: 'Half-life is a single TypeScript module drawing to one canvas. It simulates no decays step by step. Instead, when a sample is created, every atom is given its decay time once, drawn from the exponential distribution: if $u$ is uniform on (0, 1], then $-\\log_2 u$ is an exponential time measured in half-lives. After that, whether an atom has decayed at time $t$ is a comparison, and the whole drawing is a pure function of time and the sample.',
        },
        {
          type: 'code',
          code: `/** Draw every atom's decay time once: t = −log₂ u half-lives (exponential, memoryless). */
function sample(seed: number, n: number) {
  const key = \`\${seed}:\${n}\`
  if (key === sampleKey) return
  sampleKey = key
  const r = rng(seed * 2654435761)
  for (let i = 0; i < NMAX; i++) {
    let u = r()
    while (u === 0) u = r()
    hAll[i] = -Math.log2(u)
  }
  for (let i = 0; i < n; i++) sorted[i] = hAll[i]
  sorted.subarray(0, n).sort()
  marked = -1
}`,
          caption: 'The whole random part of the piece. Changing the sample size keeps every atom’s time; it just shows more or fewer of them.',
        },
        {
          type: 'p',
          text: 'Because the times are also kept sorted, the number of atoms that have decayed by any time is a binary search, and the survivor curve can be drawn exactly: one step down at each decay time, from the first atom to the last. That is the white staircase on the plot. Nothing is sampled or smoothed; with 25 atoms you see 25 steps.',
        },
        {
          type: 'code',
          code: `// the count, exactly: one step down per decay
ctx.moveTo(toX(0), toY(1))
let alive = N
for (let q = 0; q < N && sorted[q] <= hl; q++) {
  const x = toX(sorted[q])
  ctx.lineTo(x, toY(alive / N))
  alive--
  ctx.lineTo(x, toY(alive / N))
}`,
          caption: '`sorted` holds the decay times in half-lives; `hl` is how many half-lives have passed.',
        },
        {
          type: 'p',
          text: 'In chapters I and II one half-life lasts 6.5 seconds of screen time, whatever the isotope, so the drawing is the same law at different speeds; the notes say how much real time a second represents (11 seconds for protactinium-234m, about 1.2 days for iodine-131, 882 years for carbon-14). In chapters III and IV a fresh sample is fast-forwarded with an easing curve, 4,000 years or 4.54 billion, while a counter shows the years passing.',
        },
        {
          type: 'p',
          text: 'The lattice is a square grid sized to the sample. A parent atom is a bright hairline ring; a daughter is a smaller hatched disc in sage; an atom that has just decayed draws a pale ring expanding out of it for about 0.4 seconds. All the rings of one kind go into a single `Path2D` and are stroked once. In chapter III only the atoms inside an irregular polygon (the charcoal) are drawn, with hearth stones laid over the edges in front; in chapter IV the polygon is a zircon crystal with its growth zoning. The atoms outside fade rather than vanish, so you see the lattice become the object.',
        },
        {
          type: 'p',
          text: 'The default sample is the largest of 1,600, 1,225, 900, 625, 400, 256 or 144 atoms that keeps each atom about 7 pixels across, so a phone shows fewer, larger atoms rather than a gray texture. Until you touch the slider, chapter II sweeps the sample to 400, 100 and 25 atoms and back.',
        },
        { type: 'h', text: 'The clicks' },
        {
          type: 'p',
          text: 'Each frame, the number of decays since the last frame is the difference of two binary searches. With sound on, a decay plays a soft filtered-noise click at a random moment inside the frame. A real counter on a fresh sample would crackle at hundreds of clicks a second; the piece allows at most one click every 38 milliseconds, about 25 a second, so the sample starts as a gentle crackle and thins into sparse, irregular ticks as it decays, which is exactly the shape of a Geiger counter left by a decaying source. The marked atom in chapter I sounds a small chime when it goes.',
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
            '**Top right:** the isotope, its half-life, the atoms remaining (or, in III and IV, the percentage counted in the sample) and the elapsed real time or age.',
            '**The lattice:** bright rings are atoms that have not decayed; small hatched sage discs are their daughters; pale blue rings are decays happening now.',
            '**“This one — when?”:** a marked atom in chapter I, chosen to go in a few seconds. Its label changes when it does.',
            '**The slider:** the sample size on a logarithmic scale from 16 to 2,500. Drag the handle.',
            '**The plot:** the fraction remaining against time in half-lives. The pale curve is the law $2^{-t/t_{1/2}}$, the shaded band its binomial spread for the current sample, and the white staircase the sample itself. Dashed lines mark ½, ¼ and ⅛ at one, two and three half-lives.',
            '**Chapter III:** charcoal in a hearth, enlarged; the stones are in section, hatched. The sage dashes on the plot mark 61.6 percent and 4,000 years.',
            '**Chapter IV:** a zircon crystal, with dashed growth zones and a scale bar; the dashes mark 49.4 percent and 4.54 billion years.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: in chapter II, the moment the sample drops to 25 atoms and the white staircase lurches away from the curve, then falls back into it at 1,600; the counted percentage in chapter III, which is close to 61.6 but almost never exactly (that difference is the counting error of a real measurement); and the clicks, which thin out by half every half-life.',
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
            '**One half-life is always 6.5 seconds.** Every isotope is shown at its own speed-up; nothing on screen is real time.',
            '**One daughter.** Each atom turns into its first daughter and stops. Uranium-238 really passes through fourteen decays to reach lead-206; radon-220’s daughter, polonium-216, itself decays in a fraction of a second; protactinium-234m’s daughter, uranium-234, has a half-life of a quarter of a million years.',
            '**The dating is idealized.** The charcoal’s age uses the half-life directly, with no calibration curve and the modern value rather than Libby’s; real radiocarbon dates carry both laboratory and calibration uncertainties. The Earth’s age comes from lead isotopes in many meteorites, not from one zircon.',
            '**A real sample is enormous.** A gram of modern carbon holds about $6 \\times 10^{10}$ carbon-14 atoms among $5 \\times 10^{22}$ carbon atoms; the lattice shows at most 2,500 atoms of the clock isotope and none of the rest.',
            '**Atoms in a solid are not in a lattice by their decay.** The grid is for counting; the charcoal and the zircon are drawn as outlines filled with that grid.',
            '**The clicks are thinned** to about 25 a second, so a fresh sample sounds calmer than a real counter would.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'The Cause and Nature of Radioactivity', by: 'Ernest Rutherford & Frederick Soddy', year: '1902', note: '*Philosophical Magazine* 4. The transformation theory.' },
    { title: 'A radio-active substance emitted from thorium compounds', by: 'Ernest Rutherford', year: '1900', note: '*Philosophical Magazine* 49. The emanation that halves about every minute.' },
    { title: 'Age Determinations by Radiocarbon Content: Checks with Samples of Known Age', by: 'J. R. Arnold & W. F. Libby', year: '1949', note: '*Science* 110.' },
    { title: 'Radiocarbon Dating', by: 'Willard F. Libby', year: '1952', note: 'University of Chicago Press.' },
    { title: 'Age of meteorites and the earth', by: 'Clair Patterson', year: '1956', note: '*Geochimica et Cosmochimica Acta* 10.' },
    { title: 'The age of the Earth in the twentieth century: a problem (mostly) solved', by: 'G. Brent Dalrymple', year: '2001', note: 'Geological Society, London, Special Publications 190.' },
    { title: 'Evidence from detrital zircons for the existence of continental crust and oceans on the Earth 4.4 Gyr ago', by: 'Simon A. Wilde, John W. Valley, William H. Peck & Colin M. Graham', year: '2001', note: '*Nature* 409. The Jack Hills zircons.' },
    { title: 'The IntCal20 Northern Hemisphere radiocarbon age calibration curve (0–55 cal kBP)', by: 'Paula J. Reimer et al.', year: '2020', note: '*Radiocarbon* 62.' },
  ],
}

export default guide
