import type { Guide } from '../guide'

const wheelFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="105" cy="95" r="62" opacity="0.5"/><circle cx="315" cy="95" r="62" opacity="0.5"/>
  <g fill="currentColor" stroke="none">
    <circle cx="105" cy="33" r="2.4"/><circle cx="160" cy="66" r="2.4"/><circle cx="166" cy="104" r="2.4"/><circle cx="138" cy="148" r="2.4"/><circle cx="92" cy="155" r="2.4"/>
    <circle cx="52" cy="128" r="2.4"/><circle cx="44" cy="84" r="2.4"/><circle cx="66" cy="47" r="2.4"/><circle cx="127" cy="37" r="2.4"/><circle cx="150" cy="135" r="2.4"/>
    <circle cx="300" cy="34" r="2.4"/><circle cx="309" cy="33" r="2.4"/><circle cx="318" cy="33" r="2.4"/><circle cx="327" cy="34" r="2.4"/><circle cx="292" cy="37" r="2.4"/>
    <circle cx="336" cy="36" r="2.4"/><circle cx="284" cy="40" r="2.4"/><circle cx="345" cy="39" r="2.4"/><circle cx="314" cy="33" r="2.4"/><circle cx="356" cy="49" r="2.4"/>
  </g>
  <path d="M105 95 L111 89" stroke="#7FB6D9" stroke-width="1.4"/>
  <path d="M315 95 L317 40 M312 47 L317 40 L321 47" stroke="#7FB6D9" stroke-width="1.4"/>
  <g fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="9" text-anchor="middle">
    <text x="105" y="182">K &lt; Kc · STRANGERS · r ≈ 0</text>
    <text x="315" y="182">K &gt; Kc · A CLUSTER · r → 1</text>
    <text x="345" y="22" font-size="8" opacity="0.7">FLASH AT THE TOP</text>
  </g>
</svg>`

const bifFigure = `<svg viewBox="0 0 420 210" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="60" y1="20" x2="60" y2="160"/><line x1="60" y1="160" x2="380" y2="160"/>
  <line x1="135" y1="30" x2="135" y2="160" stroke="#7FB6D9" stroke-dasharray="2 3"/>
  <path d="M60 160 L135 160 L135.75 139.6 L138.75 114.6 L150 80.4 L172.5 58 L210 47.6 L247.5 44.3 L285 42.9 L360 41.6" stroke-width="1.4"/>
  <path d="M135 160 L138 139 L150 111 L172.5 90.8 L210 75.2 L247.5 67 L285 62 L360 56" stroke-dasharray="3 3" opacity="0.6"/>
  <g fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="9">
    <text x="50" y="44" text-anchor="end">1</text><text x="50" y="164" text-anchor="end">0</text>
    <text x="139" y="26" fill="#7FB6D9">Kc</text>
    <text x="220" y="38">GAUSSIAN g (THE PIECE)</text>
    <text x="220" y="92" opacity="0.7">LORENTZIAN g: √(1 − Kc/K)</text>
    <text x="380" y="178" text-anchor="end">COUPLING K / Kc → 4</text>
    <text x="14" y="100" transform="rotate(-90 14 100)" text-anchor="middle">ORDER r</text>
  </g>
</svg>`

const guide: Guide = {
  lede:
    'Hundreds of fireflies, each with its own rhythm, each listening a little to the rest. Below a critical strength of listening they stay strangers; above it they fall into step, the same way pendulum clocks, heart cells and applauding hands do.',
  facts: [
    ['Model', 'Kuramoto, 1975: $\\dot{\\theta}_i = \\omega_i + K r \\sin(\\psi - \\theta_i)$'],
    ['Order parameter', '$r e^{i\\psi} = \\frac{1}{N}\\sum_j e^{i\\theta_j}$'],
    ['Oscillators', '480 fireflies (220 on the card)'],
    ['Natural periods', 'Mean 0.9 s, Gaussian spread of 4 percent'],
    ['Critical coupling', '$K_c = 2 / (\\pi g(0)) = \\sigma\\sqrt{8/\\pi}$, about 0.45 per second here'],
    ['Steady state', 'Kuramoto’s self-consistency equation, solved numerically'],
    ['Integration', 'Euler steps of 1/120 s'],
    ['Sound', 'One chord (D major with an added ninth), a note per flash, thinned'],
    ['Running time', '82 s in five chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['↑', '↓'], action: 'Raise or lower the coupling K by a tenth of Kc' },
      { keys: ['Space'], action: 'Scatter every phase' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag across the r–K plot to set the coupling strength' },
      { gesture: 'tap', action: 'Tap the river to scatter the fireflies’ phases and watch them find each other again' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'Set K just below the dashed Kc line and wait: small clusters form and dissolve. Nudge it just above, and one cluster wins.',
  },
  pad: {
    left: [
      { label: '‹', code: 'ArrowLeft', aria: 'Previous chapter' },
      { label: 'K −', code: 'ArrowDown', aria: 'Weaker coupling' },
    ],
    right: [
      { label: 'Scatter', code: 'Space', aria: 'Scatter the phases', wide: true },
      { label: 'K +', code: 'ArrowUp', aria: 'Stronger coupling' },
      { label: '›', code: 'ArrowRight', aria: 'Next chapter' },
    ],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Biology and physics',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Along certain tidal rivers in Malaysia and Thailand, the mangroves fill at dusk with male fireflies of the genus *Pteroptyx*, thousands to a tree, and after a while whole trees flash together, on and off, roughly twice a second, for hours. European travelers described the sight from at least the seventeenth century, and for a long time Western scientists were inclined to put it down to blinking eyes or tall stories. In 1935 the biologist Hugh Smith described it carefully in *Science*, and in 1968 John and Elisabeth Buck, filming *Pteroptyx malaccae* in Thailand, showed that it was real and how it worked: each firefly carries its own rhythm, and adjusts it a little whenever it sees a neighbor flash.',
        },
        {
          type: 'p',
          text: 'In North America the best known are *Photinus carolinus*, which display for a couple of weeks each June in the Great Smoky Mountains: bursts of five to eight quick flashes in unison, then several seconds of darkness, then another burst, rolling through the woods. They were brought to scientists’ attention in the 1990s by Lynn Faust, who had watched them since childhood. The rhythms and rules differ from species to species. The essential fact is the same: there is no leader and no conductor. Order appears out of a crowd of individuals, each following its own time and listening a little.',
        },
        { type: 'h', text: 'An odd kind of sympathy' },
        {
          type: 'p',
          text: 'The first scientific record of spontaneous synchrony is in a letter. In February 1665 Christiaan Huygens, ill in bed, watched two pendulum clocks he had built hanging from a common beam and noticed that, however he set them going, within half an hour they swung in exact opposition. He called it a sympathy, traced it to tiny motions passed through the beam, and reported it to the Royal Society. The same effect is easy to see today with metronomes set on a light board resting on two cans: the board sways a little, and the metronomes, started at random, drift into step within a minute or so (in phase, rather than Huygens’s opposition).',
        },
        {
          type: 'p',
          text: 'The pattern turns up wherever oscillators can influence one another. The heart’s rhythm is set by the sinoatrial node, thousands of pacemaker cells, each of which would fire at its own rate in a dish, but which together fire as one. The master clock of the circadian rhythm in the brain is a population of neurons kept in agreement. Crickets chirp together on summer nights. In 2000, Zoltán Néda and colleagues recorded opera audiences in Romania and Hungary breaking from thunderous random applause into rhythmic clapping, a striking case because the clapping slowed down, to about half its natural rate, in order to synchronize. And on the opening day of London’s Millennium Bridge, in June 2000, crowds walking across it fell into step with a slight sideways sway of the deck, which grew as more of them did; the bridge was closed two days later and fitted with dampers.',
        },
        { type: 'h', text: 'Order that matters' },
        {
          type: 'p',
          text: 'Synchrony is not always welcome, and not only in footbridges. The alternating-current power grid is a vast population of generators that must all turn in step at 50 or 60 cycles a second; engineers model its stability with equations close to Kuramoto’s, and a grid that loses synchrony blacks out. In the brain, rhythmic synchrony among neurons underlies normal activity such as sleep spindles, but excessive synchrony is a hallmark of epileptic seizures and of the tremor of Parkinson’s disease, which deep-brain stimulation tries to disrupt. Jet lag is a desynchronized population of clocks, in the brain and in the body’s organs, slowly coming back into agreement with each other and with the Sun.',
        },
        {
          type: 'p',
          text: 'What all these share is the structure the piece draws: a population of units with their own rhythms, a coupling that lets each feel the others, and a threshold. Below it, individuality wins and the population hums with incoherent noise. Above it, a common rhythm emerges that no unit chose, and the more units join it, the harder it pulls on the rest.',
        },
        { type: 'h', text: 'From Winfree to Kuramoto' },
        {
          type: 'p',
          text: 'Arthur Winfree, in 1967, was the first to treat this mathematically for large populations. His insight was that a crowd of oscillators with slightly different natural frequencies behaves like a substance with a phase transition: below a critical strength of coupling they stay incoherent, and above it they spontaneously form a synchronized group, the way water freezes. In 1975 Yoshiki Kuramoto found a version of the model simple enough to solve exactly, and it has become the standard picture of synchronization in physics, biology and engineering. In 1990 Renato Mirollo and Steven Strogatz proved the corresponding result for *pulse-coupled* oscillators, closer to real fireflies, in which each flash gives the others a small push: for identical oscillators, almost every starting arrangement ends in perfect unison.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Strangers fall into step',
      blocks: [
        {
          type: 'p',
          text: 'Describe each firefly by a single number, its **phase** $\\theta_i$, an angle that advances steadily around the circle and flashes each time it passes the top. Left alone, it advances at its natural frequency $\\omega_i$. Kuramoto’s model adds a coupling of strength $K$, through which every oscillator is pulled a little toward each of the others:',
        },
        { type: 'math', tex: '\\frac{d\\theta_i}{dt} = \\omega_i + \\frac{K}{N} \\sum_{j=1}^{N} \\sin(\\theta_j - \\theta_i), \\qquad i = 1, \\ldots, N', label: '(1)' },
        {
          type: 'p',
          text: 'If a neighbor is slightly ahead, the sine is positive and $i$ speeds up; if behind, it slows down. The natural frequencies $\\omega_i$ are drawn from a distribution $g(\\omega)$, here a Gaussian with mean $\\omega_0 = 2\\pi / 0.9\\ \\text{s}$ and standard deviation $\\sigma = 0.04\\,\\omega_0$. The decisive step is to define the **order parameter**, the average of all the phases as points on the unit circle:',
        },
        { type: 'math', tex: 'r\\, e^{i\\psi} = \\frac{1}{N} \\sum_{j=1}^{N} e^{i\\theta_j}', label: '(2)', caption: '$r$, between 0 and 1, measures how bunched the phases are; $\\psi$ is their average phase.' },
        {
          type: 'p',
          text: 'Multiply (2) by $e^{-i\\theta_i}$ and take the imaginary part, and the double sum in (1) collapses exactly:',
        },
        { type: 'math', tex: '\\frac{d\\theta_i}{dt} = \\omega_i + K r \\sin(\\psi - \\theta_i)', label: '(3)' },
        {
          type: 'p',
          text: 'Now each oscillator feels only the crowd as a whole, a pull of strength $K r$ toward the average phase. It is a feedback loop: the more coherent the crowd, the stronger the pull, and the stronger the pull, the more coherent the crowd. In the rotating frame of the mean frequency, an oscillator whose natural frequency is close enough to the middle, $|\\omega_i - \\omega_0| \\leq K r$, is **locked**: it settles at a fixed angle $\\sin(\\theta_i - \\psi) = (\\omega_i - \\omega_0)/(K r)$ in the cluster. The rest **drift**, slipping around the circle and, on average, contributing nothing to $r$. Requiring that the locked oscillators produce exactly the $r$ that locks them gives Kuramoto’s self-consistency equation:',
        },
        { type: 'math', tex: 'r = K r \\int_{-\\pi/2}^{\\pi/2} \\cos^2\\!\\phi \\; g(K r \\sin\\phi)\\, d\\phi', label: '(4)' },
        {
          type: 'p',
          text: 'There is always the incoherent solution $r = 0$. A second solution appears when the coupling is strong enough that the right-hand side, for small $r$, exceeds $r$: when $K \\cdot g(0) \\cdot \\pi/2 > 1$. That is the critical coupling,',
        },
        { type: 'math', tex: 'K_c = \\frac{2}{\\pi\\, g(0)} = \\sigma \\sqrt{\\frac{8}{\\pi}} \\approx 1.6\\,\\sigma', label: '(5)', caption: 'For the piece, $K_c \\approx 0.45$ radians per second.' },
        {
          type: 'p',
          text: 'Just above $K_c$ the order grows like $r \\propto \\sqrt{K - K_c}$, the signature of a continuous phase transition. For a Lorentzian distribution of frequencies (half-width $\\gamma$) the equation can be solved by hand: $K_c = 2\\gamma$ and $r = \\sqrt{1 - K_c/K}$. For the Gaussian used here it cannot, so the piece solves (4) numerically for 200 values of $K$, and draws the result as the curve on its r–K plot. At $K = 2.5\\,K_c$, the strength the story settles on, the theory gives $r = 0.964$, and the simulation sits there within the scatter of its 480 fireflies.',
        },
        { type: 'figure', svg: bifFigure, alt: 'A plot of order r against coupling K: zero until the critical value Kc, then rising steeply toward one; a dashed Lorentzian curve rises more slowly.', caption: 'Nothing happens until $K_c$; then a cluster forms and grows. The shape above $K_c$ depends on the spread of natural frequencies.' },
        {
          type: 'p',
          text: 'The cluster does not move at any one firefly’s pace. For a symmetric distribution it turns at the mean frequency $\\omega_0$, so the synchronized trees flash every 0.9 seconds even though no single firefly has exactly that natural period. The drifting fireflies at the edges of the distribution, too fast or too slow to be captured, still feel the cluster: in its frame they crawl through the stretch a quarter-turn away from it and hurry around the rest of the circle, so the wheel shows a faint haze of stragglers, thickest a quarter-turn either side of the cluster, even when $r$ is large.',
        },
        {
          type: 'p',
          text: 'Two finite-size effects are visible in the piece. Below $K_c$, $r$ is not exactly zero but fluctuates around $1/\\sqrt{N} \\approx 0.05$, the size of a random walk of 480 unit steps. And close to $K_c$, clusters form and dissolve and the trace of $r(t)$ wanders, because the transition is smeared out over a range of order $1/\\sqrt{N}$.',
        },
        { type: 'figure', svg: wheelFigure, alt: 'Two circles of phases: on the left the dots are spread all round with a tiny arrow; on the right they bunch near the top with a long arrow.', caption: 'The phase wheel: each dot is one firefly, and the arrow is $r e^{i\\psi}$. Flashes happen as dots cross the top.' },
      ],
    },
    {
      id: 'piece',
      kicker: 'Implementation',
      title: 'How the piece works',
      blocks: [
        {
          type: 'p',
          text: 'Synchrony is one TypeScript module drawing to a single canvas. The story is a schedule for the coupling: zero for the first 15 seconds, rising smoothly to $2.5\\,K_c$ by 29 seconds, held through chapters III and IV, and released over three seconds at 74. The fireflies themselves are simulated, not scripted. Their natural frequencies are fixed when the piece starts: 480 Gaussian quantiles (from Acklam’s rational approximation of the inverse normal distribution), dealt out to the fireflies at random. Their starting phases are random too.',
        },
        {
          type: 'code',
          code: `function step(T: number, dt: number) {
  let left = dt
  const kk = kAt(T) * KC
  while (left > 1e-9) {
    const h = Math.min(SUB, left)
    left -= h
    meanField()
    const kr = kk * rNow
    for (let i = 0; i < N; i++) {
      let v = th[i] + (om[i] + kr * Math.sin(psiNow - th[i])) * h
      if (v >= TAU) {
        v -= TAU
        onsets[pitch[i]]++
      } else if (v < 0) v += TAU
      th[i] = v
    }
    // … the metronomes, heart cells and hands of chapter IV step here too
  }
  meanField()
}`,
          caption: 'Equation (3), stepped by Euler’s method in steps of at most 1/120 s. `meanField()` computes $r$ and $\\psi$ from equation (2); a phase passing $2\\pi$ is a flash, counted by its note.',
        },
        {
          type: 'p',
          text: 'Because the mean field reduces the coupling to two numbers, each step costs one pass to compute $r e^{i\\psi}$ and one to move every phase, about a thousand sines and cosines, rather than the $N^2 = 230{,}000$ that equation (1) would need. Jumping to a chapter re-runs the whole story from its saved first frame to that moment in 1/60 s steps, which takes a few milliseconds, so the state after a jump is the one the story would have reached.',
        },
        {
          type: 'code',
          code: `function theoryCurve(sigma: number, kMaxKc: number, n: number) {
  const out = new Float32Array(n + 1)
  const kc = sigma * Math.sqrt(8 / Math.PI)
  const g = (x: number) => Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(TAU))
  const M = 96
  for (let i = 0; i <= n; i++) {
    const K = ((i / n) * kMaxKc) * kc
    if (K <= kc * 1.0001) continue
    const F = (r: number) => {
      let s = 0
      for (let q = 0; q < M; q++) {
        const th = -Math.PI / 2 + ((q + 0.5) / M) * Math.PI
        const cth = Math.cos(th)
        s += cth * cth * g(K * r * Math.sin(th))
      }
      return K * s * (Math.PI / M) - 1
    }
    let lo = 1e-6
    let hi = 1
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2
      if (F(mid) > 0) lo = mid
      else hi = mid
    }
    out[i] = (lo + hi) / 2
  }
  return out
}`,
          caption: 'Equation (4), divided by $r$, solved by bisection with a 96-point midpoint rule. $F$ is positive below the solution and negative above it.',
        },
        { type: 'h', text: 'Drawing light' },
        {
          type: 'p',
          text: 'A firefly’s flash is a function of its phase alone: a fast rise over the first 2.5 percent of the cycle and an exponential fade over the next tenth, about 80 milliseconds at the mean period. Between flashes each firefly is a dim point, so the trees are always populated. Flashing fireflies are sorted into six brightness bins, and each bin is drawn as three paths (a bright core, a wide faint glow, and a short streak where the river reflects it) with additive compositing, because light from neighboring fireflies really does add. The color is a pale yellow-green near the 560 nanometers that firefly luciferase emits. There is no blur: the glow is just a larger, fainter disc.',
        },
        {
          type: 'p',
          text: 'The mangroves are shaped once, when the frame size changes: a canopy outline of 40 points around an ellipse, its radius modulated by two scales of simplex noise and flattened underneath, filled with the night color so nearer trees cover farther ones; eleven arching stilt roots; a few hanging aerial roots; and short arcs inside the canopy for the edges of foliage. The reflections are the same trees drawn flipped about the waterline, faintly, clipped to the water.',
        },
        { type: 'h', text: 'A breath of chord' },
        {
          type: 'p',
          text: 'Every firefly is assigned one of five notes of a D major chord with an added ninth. Each note has a small bucket that fills with its fireflies’ flashes, scaled so that all five together sound about ten times a second, and the note sounds when its bucket overflows. While the fireflies are strangers, their flashes come at random and so do the notes: a scattered, twinkling texture. As they agree, the flashes of all five groups arrive in the same instant, the buckets overflow together, and the notes fuse into a chord, once a cycle. The loudness of each note rises with $r$, so the chord swells as the order grows.',
        },
        {
          type: 'code',
          code: `const p = 10 / (N / PERIOD)
const now = performance.now()
for (let q = 0; q < CHORD.length; q++) {
  charge[q] += onsets[q] * p
  if (charge[q] >= thresh[q] && now - lastNote[q] > 180) {
    const gain = 0.012 + 0.03 * rNow
    sfx.tone(CHORD[q] * (Math.random() < 0.25 ? 0.5 : 1), 1.6, { type: 'sine', gain, attack: 0.03, filter: 2200, room: 0.65 })
    charge[q] = 0
    thresh[q] = 0.6 + Math.random() * 0.8
    lastNote[q] = now
  }
}`,
          caption: 'The sound, per frame (trimmed). A random threshold keeps the scattered notes from becoming regular.',
        },
        { type: 'h', text: 'Elsewhere' },
        {
          type: 'p',
          text: 'Chapter IV runs three more Kuramoto populations beside the fireflies, each with its own natural frequencies and a coupling that ramps from zero: five metronomes (period 1.15 s, spread 3 percent) on a board that sways with their mean, fourteen pacemaker cells in a honeycomb (0.86 s, 6 percent) with a trace driven by how many fire together, and eighteen pairs of clapping hands (0.6 s, 9 percent) with their summed loudness. Each starts scattered at the beginning of the chapter and agrees within a few seconds.',
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
            '**The river:** mangroves with stilt roots along the far bank, fireflies in their crowns, and every flash doubled in the water.',
            '**The phase wheel:** each dot is a firefly’s phase, moving clockwise; a flash happens as a dot passes the mark at the top. The pale blue arrow is the order parameter $r e^{i\\psi}$: short and wandering when they are strangers, long and steady when they agree.',
            '**Coupling K → order r:** the solid curve is Kuramoto’s steady state for this crowd; the dashed line is $K_c$; the dot is the crowd right now; the triangle on the axis is the coupling, which you can drag.',
            '**r(t):** the last 30 seconds of order, with the theory’s steady value dashed once $K$ passes $K_c$.',
            '**Chapter IV:** metronomes on a swinging board, pacemaker cells lighting as they fire over a trace of the heartbeat, and clapping hands over a trace of their loudness.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the moment in chapter II when the coupling passes $K_c$ and the arrow on the wheel, which has been flickering near zero, starts to grow; the first tree that flashes all at once; the order trace leveling off right at the dashed theory line; and, after you scatter them, how long it takes them to find each other again (a few seconds at $2.5\\,K_c$, much longer close to $K_c$).',
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
            '**Everyone hears everyone.** The Kuramoto model is all-to-all: each firefly feels the average of the whole crowd. Real fireflies see only those nearby, through leaves, and the synchrony spreads across a tree and from tree to tree; that spatial structure is not modeled.',
            '**Smooth coupling, not pulses.** Real fireflies respond to each flash as an event, more like the pulse-coupled oscillators of Mirollo and Strogatz, and each species has its own response rules. The sinusoidal coupling of Kuramoto is the simplest model with the same transition.',
            '**One flash per cycle.** *Photinus carolinus* flashes in bursts with long dark pauses; the piece’s fireflies flash once per cycle, closer to the *Pteroptyx* of the mangroves, at a slower, calmer rate.',
            '**Chapter IV is a sketch.** The metronomes are driven by the same equation, with the board’s sway drawn from their mean rather than computed from mechanics; the heartbeat trace is a schematic shape, not an electrocardiogram; the applause does not model the period doubling Néda and colleagues observed.',
            '**The story sets the coupling.** In nature the coupling is fixed by the animals; here it rises on cue so that the transition can be watched. Drag it yourself to take over.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Self-entrainment of a population of coupled non-linear oscillators', by: 'Yoshiki Kuramoto', year: '1975', note: 'In *International Symposium on Mathematical Problems in Theoretical Physics*, Lecture Notes in Physics 39, Springer.' },
    { title: 'Biological rhythms and the behavior of populations of coupled oscillators', by: 'Arthur T. Winfree', year: '1967', note: '*Journal of Theoretical Biology* 16.' },
    { title: 'Synchronization of pulse-coupled biological oscillators', by: 'Renato E. Mirollo & Steven H. Strogatz', year: '1990', note: '*SIAM Journal on Applied Mathematics* 50.' },
    { title: 'From Kuramoto to Crawford: exploring the onset of synchronization in populations of coupled oscillators', by: 'Steven H. Strogatz', year: '2000', note: '*Physica D* 143. A readable review of the model and its history.' },
    { title: 'Sync: The Emerging Science of Spontaneous Order', by: 'Steven Strogatz', year: '2003', note: 'Hyperion. Fireflies, hearts, bridges and clocks, for general readers.' },
    { title: 'Mechanism of rhythmic synchronous flashing of fireflies', by: 'John Buck & Elisabeth Buck', year: '1968', note: '*Science* 159.' },
    { title: 'The sound of many hands clapping', by: 'Zoltán Néda, Erzsébet Ravasz, Yves Brechet, Tamás Vicsek & Albert-László Barabási', year: '2000', note: '*Nature* 403.' },
    { title: 'Crowd synchrony on the Millennium Bridge', by: 'Steven H. Strogatz, Daniel M. Abrams, Allan McRobie, Bruno Eckhardt & Edward Ott', year: '2005', note: '*Nature* 438.' },
    { title: 'Synchronization of metronomes', by: 'James Pantaleone', year: '2002', note: '*American Journal of Physics* 70.' },
    { title: 'The Kuramoto model: A simple paradigm for synchronization phenomena', by: 'Juan A. Acebrón, L. L. Bonilla, Conrad J. Pérez Vicente, Félix Ritort & Renato Spigler', year: '2005', note: '*Reviews of Modern Physics* 77.' },
  ],
}

export default guide
