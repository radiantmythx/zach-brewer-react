import type { Guide } from '../guide'

const countFigure = `<svg viewBox="0 0 420 210" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="40" y1="160" x2="392" y2="160"/>
  <rect x="62" y="140" width="40" height="20" stroke="#3F7A55"/>
  <rect x="132" y="80" width="40" height="80"/>
  <rect x="202" y="40" width="40" height="120" stroke="#2B6A93"/>
  <rect x="272" y="80" width="40" height="80"/>
  <rect x="342" y="140" width="40" height="20"/>
  <g fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="10" text-anchor="middle">
    <text x="82" y="132">1</text><text x="152" y="72">4</text><text x="222" y="32">6</text><text x="292" y="72">4</text><text x="362" y="132">1</text>
    <text x="82" y="176" opacity="0.7">4 | 0</text><text x="152" y="176" opacity="0.7">3 | 1</text><text x="222" y="176" opacity="0.7">2 | 2</text><text x="292" y="176" opacity="0.7">1 | 3</text><text x="362" y="176" opacity="0.7">0 | 4</text>
    <text x="82" y="196" fill="#3F7A55" font-size="9">ALL LEFT 1/16</text>
    <text x="222" y="196" fill="#2B6A93" font-size="9">HALF AND HALF 6/16</text>
  </g>
  <text x="40" y="18" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="9" opacity="0.6">FOUR DISKS · LEFT | RIGHT · WAYS</text>
</svg>`

const cellsFigure = `<svg viewBox="0 0 420 190" fill="none" stroke="currentColor" stroke-width="1">
  <g opacity="0.35">
    <rect x="30" y="30" width="120" height="120"/><line x1="60" y1="30" x2="60" y2="150"/><line x1="90" y1="30" x2="90" y2="150"/><line x1="120" y1="30" x2="120" y2="150"/>
    <line x1="30" y1="60" x2="150" y2="60"/><line x1="30" y1="90" x2="150" y2="90"/><line x1="30" y1="120" x2="150" y2="120"/>
    <rect x="270" y="30" width="120" height="120"/><line x1="300" y1="30" x2="300" y2="150"/><line x1="330" y1="30" x2="330" y2="150"/><line x1="360" y1="30" x2="360" y2="150"/>
    <line x1="270" y1="60" x2="390" y2="60"/><line x1="270" y1="90" x2="390" y2="90"/><line x1="270" y1="120" x2="390" y2="120"/>
  </g>
  <g fill="currentColor" stroke="none">
    <circle cx="38" cy="38" r="2"/><circle cx="46" cy="40" r="2"/><circle cx="52" cy="37" r="2"/><circle cx="40" cy="47" r="2"/><circle cx="49" cy="48" r="2"/><circle cx="54" cy="52" r="2"/><circle cx="37" cy="54" r="2"/><circle cx="45" cy="55" r="2"/>
    <circle cx="279" cy="41" r="2"/><circle cx="318" cy="47" r="2"/><circle cx="346" cy="38" r="2"/><circle cx="377" cy="72" r="2"/><circle cx="286" cy="99" r="2"/><circle cx="341" cy="108" r="2"/><circle cx="309" cy="134" r="2"/><circle cx="372" cy="139" r="2"/>
  </g>
  <path d="M175 90 L245 90 M238 85 L245 90 L238 95" stroke="#2B6A93"/>
  <g fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="9" text-anchor="middle">
    <text x="210" y="80" fill="#2B6A93">MIXING</text>
    <text x="90" y="172">ONE CELL · FEW WAYS</text>
    <text x="330" y="172">SPREAD · VASTLY MORE WAYS</text>
  </g>
</svg>`

const guide: Guide = {
  lede:
    'A drop of ink spreads through a beaker of water and never gathers itself back up. Every step of the spreading obeys laws that run equally well backward; what gives time its direction is counting, and a past that began extraordinarily ordered.',
  facts: [
    ['Phenomenon', 'The thermodynamic arrow of time'],
    ['Law', 'The second law of thermodynamics (Clausius, Kelvin, 1850s)'],
    ['Entropy', 'Boltzmann’s $S = k \\ln W$'],
    ['Measured here', 'Coarse-grained $S = -\\sum p \\ln p$ over 8 × 10 cells'],
    ['Ink', '2,000 particles (900 on the card): Langevin walks carried by currents'],
    ['Film', '20 frames a second, up to 32 s, recorded so it can run backward'],
    ['Gas', '360 hard disks, elastic collisions, a time-reversible step of 1/480 s'],
    ['Odds', '$2^{-360} \\approx 10^{-108}$ for the gas; $(1/80)^{2000} \\approx 10^{-3806}$ for the ink'],
    ['Running time', '72 s in five chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['Space'], action: 'Reverse the film (I–III) or every velocity in the gas (IV)' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag in the water to stir it; the stirring is recorded' },
      { gesture: 'drag', action: 'Drag the film strip under the beaker to run time either way' },
      { gesture: 'tap', action: 'Tap the water to play the film backward, and again to play it forward' },
      { gesture: 'tap', action: 'In chapter IV, tap the box to reverse every velocity' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'Stir the ink hard, then tap the water. Watch the film unstir your stirring and lift the drop back into the pipette.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [
      { label: 'Reverse', code: 'Space', aria: 'Reverse time', wide: true },
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
          text: 'Pour cream into coffee and it swirls, thins and vanishes into a uniform brown. Drop a glass and it shatters; leave a hot cup on the table and it cools to the temperature of the room. You remember yesterday and not tomorrow. None of these runs the other way: nobody has seen coffee unmix, shards leap up into a glass, or a cup warm itself by drawing heat out of a cooler room. Played backward, a film of any of them looks wrong at once, even to a child.',
        },
        {
          type: 'p',
          text: 'The puzzle is that the laws underneath do not care. Newton’s laws, Maxwell’s equations and the Schrödinger equation all work just as well with time reversed. (The one known exception, a small asymmetry in certain decays of subatomic particles, plays no part in mixing or cooling.) A film of two billiard balls colliding looks perfectly fine backward. A film of the opening break, a triangle of fifteen balls scattering across the table, does not. Each collision in the reversed break is legal. What is wrong is the whole: fifteen balls converging from all over the table, at exactly the right speeds and angles, to come to rest in a perfect triangle and send the cue ball back. That is the shape of the answer this piece draws.',
        },
        { type: 'h', text: 'A law that only goes one way' },
        {
          type: 'p',
          text: 'The direction was first written down as a law of heat. Sadi Carnot’s 1824 study of steam engines showed that work can only be had from heat flowing from hot to cold. In the 1850s Rudolf Clausius made it a principle: heat does not of itself pass from a colder body to a warmer one. William Thomson, later Lord Kelvin, gave an equivalent form in 1851 and, a year later, a bleaker one, a universal tendency in nature to the dissipation of mechanical energy. In 1865 Clausius named the quantity that never decreases in an isolated system: *entropy*, from the Greek for transformation. His summary was that the energy of the world is constant and its entropy tends to a maximum.',
        },
        {
          type: 'p',
          text: 'That was a law about heat, measured in joules per kelvin. Why it should hold was the work of the next forty years, and mostly of Ludwig Boltzmann. In 1872 he showed, from a model of colliding gas molecules, that a certain quantity he called H can only decrease as the molecules collide, settling the gas into the Maxwell distribution of speeds. It seemed to derive the second law from mechanics.',
        },
        {
          type: 'p',
          text: 'It could not, and Josef Loschmidt, Boltzmann’s friend and colleague in Vienna, said why in 1876. Take a gas whose H has decreased, and reverse the velocity of every molecule. By the reversibility of the laws, the gas will retrace its history exactly, and H will increase. So no argument from reversible mechanics alone can show that H always decreases. Boltzmann’s answer, in 1877, changed what the second law means. It is not a certainty but an overwhelming likelihood. There are vastly more ways for a gas to be spread out than gathered up, so almost every history leads toward spreading; the reversed histories exist, but they are a vanishing fraction of all possibilities. His formula, written as $S = k \\log W$ by Max Planck in 1900 (Planck also introduced the constant $k$), is carved on Boltzmann’s tomb in Vienna.',
        },
        {
          type: 'p',
          text: 'In 1896 Ernst Zermelo raised a second objection, from Henri Poincaré’s recurrence theorem of 1890: a bounded mechanical system returns, eventually, arbitrarily close to any state it has been in. So the gas must one day unmix. Boltzmann agreed, and pointed out how long *eventually* is. Chapter IV of the piece puts a number on it.',
        },
        { type: 'h', text: 'Why the past was different' },
        {
          type: 'p',
          text: 'Counting explains why entropy rises toward the future. It does not explain why it was lower in the past, and the same counting applied backward would say the ink was probably *more* mixed a moment ago. The statistics are symmetric; something else breaks the tie. The modern answer, which the philosopher David Albert named the **Past Hypothesis** in 2000, is a boundary condition: the universe began in a state of extraordinarily low entropy, and every arrow we know (mixing, cooling, remembering, ageing) points away from it. Arthur Eddington, who coined the phrase *time’s arrow* in 1928, already saw the second law as the place where time gets its direction. Why the beginning was so ordered is one of the open questions of cosmology.',
        },
        {
          type: 'aside',
          title: 'Gibbs’s ink',
          text: 'In his 1902 *Elementary Principles in Statistical Mechanics*, J. Willard Gibbs used the image this piece is built on: a drop of colored liquid stirred into water. Stirring is reversible, and in a sense the color is never mixed at all; it is only drawn into ever finer threads. But coarse-grained (looked at with any finite resolution) the liquid becomes uniform, and stays so.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Statistical mechanics',
      title: 'Counting the ways',
      blocks: [
        {
          type: 'p',
          text: 'A **microstate** is a complete description: where every particle is. A **macrostate** is what you can actually see: how much ink is in each region. Many microstates share one macrostate, and Boltzmann’s entropy is the logarithm of how many:',
        },
        { type: 'math', tex: 'S = k \\ln W', label: '(1)', caption: '$W$ is the number of microstates compatible with the macrostate; $k$ is Boltzmann’s constant.' },
        {
          type: 'p',
          text: 'The piece coarse-grains the water into $M = 80$ square cells, 8 across and 10 deep. A macrostate is the list of counts $n_1, \\ldots, n_M$ of particles in each cell, with $\\sum n_c = N$. The number of ways to choose which particles go where is a multinomial coefficient, and Stirling’s approximation $\\ln n! \\approx n \\ln n - n$ turns its logarithm into a sum over cells:',
        },
        { type: 'math', tex: 'W = \\frac{N!}{n_1! \\, n_2! \\cdots n_M!}, \\qquad \\frac{\\ln W}{N} \\approx -\\sum_{c=1}^{M} p_c \\ln p_c, \\quad p_c = \\frac{n_c}{N}', label: '(2)' },
        {
          type: 'p',
          text: 'That right-hand side is the readout and the curve in the piece: the coarse-grained entropy per particle, in natural units ($k = 1$). It is zero when all the ink is in one cell, and its largest possible value, $\\ln M = \\ln 80 \\approx 4.38$, is reached when every cell holds the same share. The dashed ceiling on the plot is that value. A drop straddling two cells starts at $\\ln 2 \\approx 0.69$, which is the short flat step at the left of the curve, before the drop reaches the water.',
        },
        { type: 'figure', svg: cellsFigure, alt: 'Two grids of sixteen cells: eight dots crowded in one corner cell, and eight dots spread one per cell.', caption: 'The same eight particles, one way crowded and one way spread. There are vastly more ways to be spread.' },
        { type: 'h', text: 'The odds of unmixing' },
        {
          type: 'p',
          text: 'Once the ink is mixed, each particle is equally likely to be anywhere. The chance of finding all $N$ of them in one chosen cell at a given moment is then $(1/M)^N$. For the piece’s 2,000 particles and 80 cells:',
        },
        { type: 'math', tex: '\\left(\\frac{1}{80}\\right)^{2000} = 10^{-2000 \\log_{10} 80} \\approx 10^{-3806}', label: '(3)' },
        {
          type: 'p',
          text: 'The gas in chapter IV makes the same point with the smallest possible macrostate, a left half and a right half. Each of $N$ disks is on either side with probability ½, so the number on the left follows a binomial distribution, and the chance that all of them are on the left at once is',
        },
        { type: 'math', tex: 'P(\\text{all left}) = 2^{-N}, \\qquad \\frac{n_L}{N} = \\frac{1}{2} \\pm \\frac{1}{2\\sqrt{N}}', label: '(4)', caption: 'The second expression is the typical fluctuation (one standard deviation): ±0.026 for $N = 360$, drawn as the shaded band.' },
        {
          type: 'p',
          text: 'For $N = 360$, $2^{-360} \\approx 4 \\times 10^{-109}$, about one chance in $2.3 \\times 10^{108}$. To feel it: the universe is about $4.4 \\times 10^{17}$ seconds old. Looking a billion times a second for all of that time gives $4 \\times 10^{26}$ looks, and the expected number of times you would catch the gas all on the left is still about $10^{-82}$. For four disks, though, the same formula gives 1 in 16, and the small box in the corner of chapter IV shows it happening every few seconds. The second law is not a different law for big things. It is the same arithmetic, with exponents that grow with the number of particles.',
        },
        { type: 'figure', svg: countFigure, alt: 'A bar chart of the ways four disks can split between two halves: 1, 4, 6, 4, 1.', caption: 'Four disks: one arrangement in sixteen has them all on the left, six have them evenly split. With 360 disks the middle bar is $10^{107}$ times taller than the end ones.' },
        { type: 'h', text: 'The random walk' },
        {
          type: 'p',
          text: 'Each ink particle in the piece follows a **Langevin** random walk. Its velocity relaxes toward zero with a time constant $\\tau$ and is kicked by noise; its position follows the velocity. Paul Langevin wrote this down in 1908, three years after Albert Einstein’s theory of Brownian motion, as the simplest model of a small particle buffeted by molecules:',
        },
        { type: 'math', tex: 'dv = -\\frac{v}{\\tau}\\, dt + \\frac{\\sqrt{2D}}{\\tau}\\, dW_t, \\qquad dx = v\\, dt', label: '(5)', caption: '$D$ is the diffusion coefficient and $dW_t$ an increment of Brownian motion (independent in $x$ and $y$).' },
        {
          type: 'p',
          text: 'Over times much longer than $\\tau$ this becomes ordinary diffusion: the mean squared displacement grows as $\\langle \\Delta x^2 \\rangle = 2Dt$ in each direction, as Einstein predicted and Jean Perrin confirmed with microscopes in 1908–09. Over shorter times the paths are smooth, which is why the three colored walks in the piece curve rather than jitter. The velocity is an Ornstein–Uhlenbeck process, and it can be stepped exactly, with no discretization error, by $v_{k+1} = a\\,v_k + \\sigma_v \\sqrt{1 - a^2}\\, \\xi_k$, where $a = e^{-\\Delta t / \\tau}$, $\\sigma_v^2 = D/\\tau$ and $\\xi_k$ is a standard normal number.',
        },
        {
          type: 'p',
          text: 'Molecular diffusion alone mixes slowly: a dye takes days to diffuse across a glass. What mixes real ink is flow. The drop falls in as a vortex ring (seen here in cross-section as a pair of counter-rotating vortices), and the water’s faint convection currents then stretch the ink into filaments. Both flows are *area-preserving*: written as a stream function $\\psi$, the velocity is $u = \\partial \\psi / \\partial y$, $v = -\\partial \\psi / \\partial x$, which has zero divergence. On its own such a flow could be run backward to unstir the ink perfectly; it changes the fine-grained entropy not at all. What it does is fold the ink into threads finer than the cells, and diffusion then erases the threads. The coarse-grained entropy rises, as Gibbs described.',
        },
        { type: 'h', text: 'Running it backward' },
        {
          type: 'p',
          text: 'Loschmidt’s reversal is real, and chapter IV performs it: at 5.6 seconds every disk’s velocity is flipped, and the gas starts back toward the left. But it does not get all the way. A gas of hard disks is chaotic: each collision magnifies a small error in angle by roughly the ratio of the mean free path to the disk radius, about twenty here. An error of one part in $10^{16}$ (the precision of a double-precision number) becomes as large as a disk after a dozen collisions. To unmix a gas you would need to reverse every velocity, exactly, and leave nothing else disturbed. The ink film, by contrast, does run all the way back, because it is a recording: the piece plays its own film in reverse.',
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
          text: 'The piece is one TypeScript module drawing to a single canvas with the Canvas 2D API, with no libraries. It runs three small simulations: the ink, recorded as a film; a box of 360 disks; and an inset of four disks. The story is a clock running from 0 to 72 seconds, and everything else (where the film is, whether the gas has been released) follows from it, apart from what you do.',
        },
        {
          type: 'table',
          head: ['Chapter', 'Time', 'What happens'],
          rows: [
            ['I · A drop', '0–5 s', 'The drop swells at the pipette, falls, enters the water as a vortex ring'],
            ['II · Spreading', '5–24 s', 'Currents stretch the ink; diffusion blurs it; the entropy climbs toward ln 80'],
            ['III · The film, backward', '24–40 s', 'The film slows, stops and runs back to its first frame, faster than it ran forward'],
            ['IV · A box of gas', '40–60 s', 'A partition lifts; at 5.6 s every velocity is reversed; four disks keep returning'],
            ['V · The arrow', '60–72 s', 'Entropy along the history of the universe; a fresh beaker for the next loop'],
          ],
        },
        { type: 'h', text: 'The ink, as a film' },
        {
          type: 'p',
          text: 'Every ink frame is recorded: each particle’s position is quantized to two 16-bit integers, four bytes a particle, so 640 frames of 2,000 particles take 5.1 MB. Playing the film backward is then just reading frames in the opposite order, interpolating between them for smooth motion at 60 frames a second. The entropy is computed once per recorded frame and stored with it, so the curve and the playhead always agree.',
        },
        {
          type: 'p',
          text: 'The noise that drives each walk is not drawn from a sequential random generator but hashed from the particle and frame numbers. Frame 312 of particle 1,047 always gets the same kick. So if you stir halfway through, the piece truncates the film at that frame and simulates the future again, and the new future differs from the old one only by your stirring:',
        },
        {
          type: 'code',
          code: `// Langevin: an Ornstein–Uhlenbeck velocity, exact discretisation
const al = Math.exp(-DT / TAU_V)
const be = SIG_V * Math.sqrt(1 - al * al)
for (let i = 0; i < N; i++) {
  const u1 = hash01(Math.imul(i, 0x9e3779b1) ^ Math.imul(k, 0x85ebca6b) ^ 0x27d4eb2f) || 1e-9
  const u2 = hash01(Math.imul(i, 0x632be5ab) ^ Math.imul(k, 0xc2b2ae35) ^ 0x165667b1)
  const m = Math.sqrt(-2 * Math.log(u1))
  svx[i] = al * svx[i] + be * m * Math.cos(TAU * u2)
  svy[i] = al * svy[i] + be * m * Math.sin(TAU * u2)
  let x = sx[i] + svx[i] * DT
  let y = sy[i] + svy[i] * DT
  // reflecting walls (and the surface)
  if (x < 0) {
    x = -x
    svx[i] = -svx[i]
  } // … and likewise for the other three walls
}`,
          caption: 'One film frame of random walking. A Box–Muller pair of normal numbers, from two hashed uniforms, kicks each velocity.',
        },
        {
          type: 'p',
          text: 'Before the walk, each particle is carried by the flow, integrated with a midpoint (second-order Runge–Kutta) step, three substeps per frame while the plume is fast. The flow is the sum of the drop’s vortex pair, given analytically, and a stream function on a 17 × 21 grid: slow simplex noise for the convection, plus your stirring, all multiplied by a taper that vanishes at the walls so no water flows through them. The velocity at a particle is the curl of the bilinear interpolation of that grid, which is exactly divergence-free inside each cell: stirring cannot compress the ink into a clump, only fold it.',
        },
        {
          type: 'code',
          code: `/** Add the drag of a spoon at (x, y) moving by (mx, my), in water widths: a divergence-free dipole. */
function addStir(x: number, y: number, mx: number, my: number, gain = 0.55) {
  const s2 = 0.085 * 0.085
  const k = gain / 1.15
  for (let j = 0; j <= PGY; j++)
    for (let i = 0; i <= PGX; i++) {
      const nx = i / PGX - x
      const ny = (j / PGY) * A - y
      const r2 = nx * nx + ny * ny
      if (r2 > s2 * 9) continue
      stir[j * (PGX + 1) + i] += k * (mx * ny - my * nx) * Math.exp(-r2 / s2)
    }
}`,
          caption: 'A drag adds $\\psi = (\\Delta x\\,(y - p_y) - \\Delta y\\,(x - p_x))\\, e^{-r^2/s^2}$: water under the pointer moves with it and flows back around. The stir grid then decays with a time constant of 1.15 s.',
        },
        {
          type: 'p',
          text: 'The film has its own clock, separate from the story’s. Left alone, it follows a schedule: forward at real speed for 24 seconds, a stop, then back to the first frame by 37.5 seconds. Your actions are offsets on that schedule. Dragging the film strip sets the film time directly; a tap on the water reverses the direction; stirring forces the film forward at real speed (you cannot stir the past) and rewrites everything after the present frame.',
        },
        {
          type: 'p',
          text: 'The ink is drawn twice. A thin wash shows its density: the particles are counted on a 36 × 45 grid, blurred with two passes of a 3 × 3 box filter, mapped through $\\alpha = 0.88\\,(1 - e^{-v/9})$, written into a small offscreen image and scaled up smoothly. Then each particle is drawn as a 1.5-pixel square, all 2,000 in one path, as grain over the wash. The drop itself, hanging and falling, is drawn as a solid disc with a glint.',
        },
        { type: 'h', text: 'A gas that can run backward' },
        {
          type: 'p',
          text: 'The disks move in straight lines between collisions. Each step of 1/480 s drifts every disk, then applies a *kick*: the walls reflect any disk moving out through them, and every overlapping pair that is approaching exchanges the components of velocity along the line between their centers, which is an exact elastic collision for equal masses. A spatial grid of cells one diameter wide finds the pairs.',
        },
        {
          type: 'code',
          code: `for (let q = 0; q < np; q++) {
  const p = gDir > 0 ? q : np - 1 - q
  const i = pairI[p]
  const j = pairJ[p]
  const ddx = gx[j] - gx[i]
  const ddy = gy[j] - gy[i]
  const d2 = ddx * ddx + ddy * ddy
  const dot = (gvx[j] - gvx[i]) * ddx + (gvy[j] - gvy[i]) * ddy
  if (dot >= 0) continue
  // equal masses, perfectly elastic: exchange the normal components
  const k = dot / d2
  gvx[i] += k * ddx
  gvy[i] += k * ddy
  gvx[j] -= k * ddx
  gvy[j] -= k * ddy
}`,
          caption: 'The collision kick. A reversed run walks the pairs in the opposite order, so that the kicks undo one another.',
        },
        {
          type: 'p',
          text: 'The scheme is built to be reversible. Flipping every velocity and applying the kick once at the current positions undoes the last kick; after that, each drift retraces the previous one and each kick undoes its twin. An isolated pair that collides is guaranteed to have separated one step later, because reflecting the relative velocity about the tangent line returns the pair to the distance it had one step earlier. The scheme is not perfect: when three disks touch in one step, or a pair still overlaps after colliding, the order of the kicks matters and the reversal slips. Those slips, together with ordinary rounding, are what chaos then magnifies, and why the gas comes back to about 90 percent on the left instead of 100.',
        },
        {
          type: 'p',
          text: 'The gas is re-simulated from its saved initial state whenever you jump into chapter IV, so its history is the same every loop until you tap it. The four-disk inset runs alongside with the same scheme, tallying the fraction of steps in which all four are on the left. It converges, noisily, toward 6.25 percent.',
        },
        { type: 'h', text: 'Sound' },
        {
          type: 'p',
          text: 'With sound on, the drop entering the water is a short falling glide, and the reversed film plays it rising. The film’s reversal brings a slow filtered-noise sweep, each velocity reversal a falling tone, and each moment the four small disks are all on the left a soft bell. The fifth chapter rests on a quiet four-note chord. Everything is synthesized with the Web Audio API through the site’s shared bus.',
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
            '**The beaker:** a hairline section with a hatched glass base, graduations every 50 mL and a meniscus. The surface ripples outward when the drop goes in, and inward when the film runs backward.',
            '**The ink:** a wash for density, and fine grain for the particles. Three colored dots with trails (ocean, lagoon, moss) are single particles; the trail always points into the film’s past, whichever way it is running.',
            '**The dotted grid:** the 8 × 10 coarse-graining cells. The **macrostate** inset beside the plot shades each cell by its share of the ink.',
            '**The entropy plot:** $-\\sum p \\ln p$ for every recorded frame, the dashed ceiling at $\\ln 80$, and an ocean playhead at the frame on screen.',
            '**The film strip:** one frame mark per second of film, the recorded part shaded, the playhead with its direction, and the time code. Ocean corner marks around the beaker mean the film is running backward.',
            '**Chapter III’s odds:** $(1/80)^{2000} \\approx 10^{-3806}$, the chance of finding all the ink in one cell at a random moment once it is mixed.',
            '**The gas box:** hairline disks, one ocean disk with the path of its last few seconds, a dashed midline, and the hatched partition that lifts out. An ocean frame flashes when every velocity is reversed.',
            '**The fraction plot:** $n_L/N$ against time, the lines at 1 and ½, the band of typical fluctuation $\\pm 1/(2\\sqrt{N})$, a tick where the partition lifted and an ocean line at each reversal.',
            '**The four-disk inset:** its left half hatches in moss whenever all four disks are there, with the running fraction and count.',
            '**Chapter V:** an arrow from the Big Bang to the far future, with entropy rising along it; a tight cluster at the start, a beaker mid-mix at now, a uniform haze at the end.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the mushroom of the falling drop, which is a vortex ring cut in half; the moment in chapter III when the reversed ink, already uniform-looking, starts to darken in one place for no visible reason; the ripples converging on the surface and the drop leaping out of the water; and in chapter IV, how far back the gas gets before it gives up.',
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
            '**Time is compressed.** Real ink in still water takes many minutes to mix, and days by diffusion alone. The currents here are invented (slow simplex noise), and the diffusion coefficient is far larger than a dye’s, so the whole process fits in twenty seconds.',
            '**Two dimensions.** The beaker is a thin slice; the vortex ring is drawn as its cross-section, a vortex pair, with a prescribed path rather than one computed from the fluid equations.',
            '**Particles are not molecules.** Each particle stands for a cloud of dye molecules, and they do not interact with one another or push the water.',
            '**The backward film is a recording.** The ink is not a deterministic mechanical system whose velocities could be reversed; the piece simply plays its film in reverse. Each backward step is still one that the same random-walk laws allow, which is the point.',
            '**The reversal of the gas fails partly by construction.** The collisions are time-stepped, not computed event by event, and the scheme is only exactly reversible for isolated pairs. Real chaos would defeat a reversal too, but a little later.',
            '**Entropy depends on the cells.** Coarse-grained entropy is defined relative to a choice of resolution. Different cells give different numbers, but every reasonable choice rises in the same way.',
            '**The cosmology is a sketch.** The early universe was close to thermal equilibrium for its matter and radiation; its low entropy lies in how smooth it was, which for gravity is a very improbable state. The arrow in chapter V is a diagram, not a calculation.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Über die Beziehung zwischen dem zweiten Hauptsatze der mechanischen Wärmetheorie und der Wahrscheinlichkeitsrechnung', by: 'Ludwig Boltzmann', year: '1877', note: 'The counting argument: entropy as the logarithm of the number of states.' },
    { title: 'Elementary Principles in Statistical Mechanics', by: 'J. Willard Gibbs', year: '1902', note: 'Yale University Press. Chapter XII has the stirred colored liquid.' },
    { title: 'The Nature of the Physical World', by: 'Arthur Eddington', year: '1928', note: 'Where “time’s arrow” comes from.' },
    { title: 'Boltzmann’s Entropy and Time’s Arrow', by: 'Joel L. Lebowitz', year: '1993', note: '*Physics Today* 46(9). A clear modern account of coarse-graining and the initial condition.' },
    { title: 'Time’s Arrow and Archimedes’ Point', by: 'Huw Price', year: '1996', note: 'Oxford University Press. A philosopher on the asymmetry of time.' },
    { title: 'Time and Chance', by: 'David Z. Albert', year: '2000', note: 'Harvard University Press. The Past Hypothesis.' },
    { title: 'From Eternity to Here', by: 'Sean Carroll', year: '2010', note: 'Dutton. The arrow of time and the low-entropy beginning, for general readers.' },
    { title: 'Sur la théorie du mouvement brownien', by: 'Paul Langevin', year: '1908', note: '*Comptes Rendus* 146. The equation behind each ink particle.' },
  ],
}

export default guide
