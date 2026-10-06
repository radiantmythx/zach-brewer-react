import type { Guide } from '../guide'

const logPlot = `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<path d="M40 20 L40 140 L300 140" opacity="0.6"/>
<path d="M36 130 L40 130 M36 90 L40 90 M36 50 L40 50" opacity="0.6"/>
<path d="M40 130 L200 46" stroke-dasharray="3 3" opacity="0.6"/>
<path d="M40 128 C60 126 64 118 78 114 S100 104 112 98 S136 84 150 76 S176 62 188 54 S206 40 220 38 S260 40 300 37" stroke="#7FB6D9" stroke-width="1.4"/>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1">
<text x="4" y="133">1e−6</text><text x="12" y="93">1e−3</text><text x="22" y="53">1</text>
<text x="44" y="16">LOG Δ</text><text x="305" y="144">τ</text>
<text x="104" y="74" opacity="0.8">SLOPE λ₁ / ln 10</text><text x="226" y="30" opacity="0.8">SATURATES</text>
<text x="56" y="156" opacity="0.7">EXPONENTIAL GROWTH</text><text x="196" y="156" opacity="0.7">ATTRACTOR SIZE</text></g>
</svg>`

const guide: Guide = {
  lede:
    'A hundred and twenty paths start within a millionth of each other and, for a while, travel as one. Then they fray, and fill the whole attractor — the clearest picture there is of why weather cannot be forecast far ahead.',
  facts: [
    ['Systems', 'Lorenz (1963), Aizawa, Halvorsen'],
    ['Integrator', 'Classical Runge–Kutta (RK4), fixed step'],
    ['Ensemble', '120 paths (56 in the preview), seeded on a sphere of radius $10^{-6}$'],
    ['Spread', 'RMS distance from the lead path'],
    ['Lyapunov λ₁', 'Lorenz ≈ 0.91, Aizawa ≈ 0.12, Halvorsen ≈ 0.67'],
    ['Trails', '240 steps per strand, 1,800 for the lead'],
    ['Cycle', '16 s per system'],
    ['Ground', 'Night'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Sensitive dependence on initial conditions',
      blocks: [
        {
          type: 'p',
          text: 'In the winter of 1961 Edward Lorenz, a meteorologist at MIT, wanted to see a long run of his toy weather model again. Rather than start from the beginning he typed in numbers from the middle of an earlier printout and went for coffee. When he came back the new run had drifted completely away from the old one. Nothing was broken. The printout showed three decimal places — 0.506 where the machine had held 0.506127 — and a difference of a few parts in ten thousand had grown, over a simulated couple of months, until the two weathers had nothing in common.',
        },
        {
          type: 'p',
          text: 'Lorenz realized that this was not a flaw of his program but a property of the equations, and very likely of the atmosphere itself. If tiny differences grow, then any error in measuring today’s weather — and there will always be errors — eventually swamps the forecast. He boiled the problem down to three equations, describing the simplest possible model of a fluid heated from below, and published them in 1963 as *Deterministic Nonperiodic Flow*. The title is the whole surprise in three words: a system with no randomness in it at all, whose behaviour never repeats and cannot be predicted in the long run.',
        },
        {
          type: 'p',
          text: 'The idea had been glimpsed before. In the 1880s Henri Poincaré, studying the motion of three bodies under gravity, found orbits so tangled that he wrote of small differences in initial conditions producing very great ones in the final result. But it took computers, and Lorenz’s three equations, to make the phenomenon something you could watch. In 1972 he gave a talk with a title that named it for good: *Predictability: Does the Flap of a Butterfly’s Wings in Brazil Set Off a Tornado in Texas?* The “butterfly effect” stuck, helped by the fact that his attractor, drawn on a page, looks like a pair of wings.',
        },
        {
          type: 'h',
          text: 'Chaos is not randomness',
        },
        {
          type: 'p',
          text: 'It is worth being precise about what chaos is not. Nothing in these equations is random. Run the piece twice and every strand traces exactly the same path, because the same equations start from the same numbers. What is lost is not determinism but *predictability*: the future is fixed by the present, yet any uncertainty about the present, however small, grows until it is as large as the attractor itself. After that, all you can say is that the system is somewhere on the attractor — and, if you have watched long enough, how often it visits each part of it.',
        },
        {
          type: 'p',
          text: 'Modern weather forecasting takes that lesson literally. Since 1992 the major forecasting centres have run *ensembles*: dozens of forecasts from slightly different starting states, consistent with the uncertainty in the observations. When the members agree the forecast is confident; when they fan out, it is not, and the spread itself is the most useful number the forecast contains. The piece is an ensemble forecast of a toy atmosphere. The bundle of 120 strands is the ensemble, the spread readout is its uncertainty, and the moment the strands fill the attractor is the moment the forecast has nothing left to say.',
        },
        {
          type: 'h',
          text: 'Strange attractors',
        },
        {
          type: 'p',
          text: 'Lorenz’s system loses energy to friction and gains it from heating, so trajectories neither fly off to infinity nor settle to rest. They are drawn onto a bounded set, the **attractor**, and wander on it forever. Because nearby paths separate while the whole set stays bounded, the attractor must be folded over and over on itself, like dough kneaded by a baker: stretched in one direction, squeezed in another, folded back. The result has structure at every scale and a fractal dimension a little above two (about 2.06 for Lorenz). David Ruelle and Floris Takens called such sets *strange attractors* in 1971. Whether Lorenz’s attractor was truly strange, rather than an artefact of computer arithmetic, stayed open until Warwick Tucker proved it in 1999 with a computer-assisted argument — answering the fourteenth of Stephen Smale’s problems for the twenty-first century.',
        },
        {
          type: 'p',
          text: 'Two other attractors share the stage here. The **Aizawa** system, a favourite of generative artists, wraps its trajectories around a sphere-like shell pierced by a tube along its axis; its chaos is gentle, with a Lyapunov exponent about a seventh of Lorenz’s. The **Halvorsen** system is cyclically symmetric — swapping $x \\to y \\to z \\to x$ leaves the equations unchanged — so its attractor has three identical lobes arranged around the diagonal. Both are best known from catalogues of chaotic flows, such as J. C. Sprott’s, rather than from a single landmark paper.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Three equations, and how fast they forget',
      blocks: [
        {
          type: 'h',
          text: 'The Lorenz system',
        },
        {
          type: 'math',
          tex: String.raw`\dot{x} = \sigma (y - x), \qquad \dot{y} = x (\rho - z) - y, \qquad \dot{z} = x y - \beta z`,
          label: '(1)',
          caption: 'Lorenz’s values: $\\sigma = 10$, $\\rho = 28$, $\\beta = 8/3$.',
        },
        {
          type: 'p',
          text: 'Here $x$ measures the strength of the convective rolls, $y$ the temperature difference between rising and sinking fluid, and $z$ how far the vertical temperature profile departs from a straight line. $\\sigma$ is the Prandtl number (how viscosity compares with heat diffusion), $\\rho$ is the heating relative to the threshold at which convection starts, and $\\beta$ is set by the shape of the rolls. For small $\\rho$ the fluid sits still or rolls steadily; by $\\rho \\approx 24.7$ the steady rolls have lost their stability and the chaotic attractor takes over. At 28 the trajectory loops around one of two hollow centres — rolls turning one way — for a while, then flips unpredictably to the other.',
        },
        {
          type: 'p',
          text: 'One more fact explains the shape. The divergence of the flow is constant:',
        },
        {
          type: 'math',
          tex: String.raw`\nabla \cdot \vec{f} = \frac{\partial \dot{x}}{\partial x} + \frac{\partial \dot{y}}{\partial y} + \frac{\partial \dot{z}}{\partial z} = -(\sigma + 1 + \beta) \approx -13.67`,
          label: '(2)',
        },
        {
          type: 'p',
          text: 'So any blob of starting points shrinks in volume by a factor of $e^{-13.67}$ every unit of time. It collapses towards a set of zero volume — the thin, layered sheets of the attractor — even as it stretches along them.',
        },
        {
          type: 'h',
          text: 'The other two',
        },
        {
          type: 'math',
          tex: String.raw`\dot{x} = (z - b)x - d y, \quad \dot{y} = d x + (z - b) y, \quad \dot{z} = c + a z - \frac{z^3}{3} - (x^2 + y^2)(1 + e z) + f z x^3`,
          label: '(3)',
          caption: 'Aizawa, with $a = 0.95$, $b = 0.7$, $c = 0.6$, $d = 3.5$, $e = 0.25$, $f = 0.1$.',
        },
        {
          type: 'math',
          tex: String.raw`\dot{x} = -a x - 4y - 4z - y^2, \quad \dot{y} = -a y - 4z - 4x - z^2, \quad \dot{z} = -a z - 4x - 4y - x^2`,
          label: '(4)',
          caption: 'Halvorsen, with $a = 1.4$.',
        },
        {
          type: 'h',
          text: 'Lyapunov exponents',
        },
        {
          type: 'p',
          text: 'Start two trajectories a tiny distance $\\delta_0$ apart. On a chaotic attractor their separation grows, on average, exponentially:',
        },
        {
          type: 'math',
          tex: String.raw`|\delta(t)| \approx |\delta_0| \, e^{\lambda_1 t}, \qquad \lambda_1 = \lim_{t \to \infty} \frac{1}{t} \ln \frac{|\delta(t)|}{|\delta_0|}`,
          label: '(5)',
        },
        {
          type: 'p',
          text: 'The rate $\\lambda_1$ is the largest **Lyapunov exponent**, after Aleksandr Lyapunov’s 1892 work on the stability of motion. A positive $\\lambda_1$ is the working definition of chaos. For Lorenz it is about 0.906 per unit of time, and the full set of three exponents is roughly $(0.906, \\; 0, \\; -14.57)$; they add up to the divergence in equation (2), as they must. The exponents quoted in the facts were measured offline the standard way (after Benettin and colleagues, 1980): run two neighbours, and every step measure their separation, add its logarithm to a running total, and pull the neighbour back to the original distance along the same direction.',
        },
        {
          type: 'p',
          text: 'Equation (5) turns into a forecast horizon. If you can tolerate an error $\\Delta$ and you know the starting state to within $\\delta_0$, you can predict for about',
        },
        {
          type: 'math',
          tex: String.raw`t_{\text{predict}} \approx \frac{1}{\lambda_1} \ln \frac{\Delta}{\delta_0}`,
          label: '(6)',
        },
        {
          type: 'p',
          text: 'The logarithm is the cruelty of chaos. Measuring the initial state a thousand times more precisely buys only $\\ln 1000 / \\lambda_1 \\approx 7.6$ more time units for Lorenz — a few more loops of the butterfly. That is why weather forecasts improve slowly, by better models and denser observations, and why they will always run out somewhere around two weeks.',
        },
        {
          type: 'figure',
          svg: logPlot,
          alt: 'A log-scale plot of spread against time: a straight rising line, then a flat plateau at the size of the attractor.',
          caption: 'On a logarithmic axis exponential growth is a straight line whose slope is $\\lambda_1 / \\ln 10$; it bends flat when the spread reaches the size of the attractor. The piece draws this chart live.',
        },
        {
          type: 'h',
          text: 'Runge–Kutta',
        },
        {
          type: 'p',
          text: 'The equations have no formula for their solution, so they are stepped forward numerically. The classical fourth-order Runge–Kutta method (Carl Runge, 1895; Martin Kutta, 1901) samples the slope four times per step — at the start, twice at the midpoint, and at the end — and averages them with weights 1, 2, 2, 1:',
        },
        {
          type: 'math',
          tex: String.raw`\vec{x}_{n+1} = \vec{x}_n + \frac{h}{6} (\vec{k}_1 + 2\vec{k}_2 + 2\vec{k}_3 + \vec{k}_4)`,
          label: '(7)',
          caption: '$\\vec{k}_1 = \\vec{f}(\\vec{x}_n)$, $\\vec{k}_2 = \\vec{f}(\\vec{x}_n + \\frac{h}{2}\\vec{k}_1)$, $\\vec{k}_3 = \\vec{f}(\\vec{x}_n + \\frac{h}{2}\\vec{k}_2)$, $\\vec{k}_4 = \\vec{f}(\\vec{x}_n + h\\vec{k}_3)$.',
        },
        {
          type: 'p',
          text: 'Its error per step shrinks like $h^5$ and its accumulated error like $h^4$, so halving the step makes it sixteen times more accurate. Accuracy is relative here, though: on a chaotic attractor every numerical error is itself amplified at the rate $\\lambda_1$, so no integrator follows the *true* trajectory from a given start for long. What a good integrator does follow faithfully is the attractor’s shape and statistics — which is what the eye sees.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'A bundle, a time-lapse and a log chart',
      blocks: [
        {
          type: 'h',
          text: 'Seeds a millionth apart',
        },
        {
          type: 'p',
          text: 'Each sixteen-second cycle begins by integrating from a standard starting point for a few thousand steps, so the *lead* trajectory starts on the attractor rather than spiralling in towards it. The other 119 start on a sphere of radius exactly $10^{-6}$ around it, in uniformly random directions — a shell rather than a ball, so the first readout of the spread is exactly 0.000001:',
        },
        {
          type: 'code',
          code: `if (i > 0) {
  // uniform direction, radius 1e-6 (shell, so Δ₀ reads exactly)
  const u = r() * 2 - 1
  const a = r() * TAU
  const q = Math.sqrt(1 - u * u)
  dx = q * Math.cos(a) * 1e-6
  dy = q * Math.sin(a) * 1e-6
  dz = u * 1e-6
}
st[i * 3] = s0[0] + dx
st[i * 3 + 1] = s0[1] + dy
st[i * 3 + 2] = s0[2] + dz`,
          caption: 'Choosing the height $u$ uniformly in [−1, 1] and the angle uniformly gives points evenly spread over a sphere (Archimedes’ hat-box theorem).',
        },
        {
          type: 'p',
          text: 'State is kept in 64-bit floats, so rounding error (about $10^{-16}$ relative) is ten orders of magnitude below the seeds’ separation; the divergence you see is the system’s, not the arithmetic’s. Every step advances all the paths with the same RK4 routine, written to avoid allocating anything:',
        },
        {
          type: 'code',
          code: `function rk4(f: Deriv, s: Float64Array, i: number, h: number) {
  const x = s[i]
  const y = s[i + 1]
  const z = s[i + 2]
  f(x, y, z, K1)
  f(x + 0.5 * h * K1[0], y + 0.5 * h * K1[1], z + 0.5 * h * K1[2], K2)
  f(x + 0.5 * h * K2[0], y + 0.5 * h * K2[1], z + 0.5 * h * K2[2], K3)
  f(x + h * K3[0], y + h * K3[1], z + h * K3[2], K4)
  s[i] = x + (h / 6) * (K1[0] + 2 * K2[0] + 2 * K3[0] + K4[0])
  s[i + 1] = y + (h / 6) * (K1[1] + 2 * K2[1] + 2 * K3[1] + K4[1])
  s[i + 2] = z + (h / 6) * (K1[2] + 2 * K2[2] + 2 * K3[2] + K4[2])
}`,
          caption: 'Equation (7). The step is 0.005 for Lorenz and Halvorsen and 0.01 for Aizawa.',
        },
        {
          type: 'h',
          text: 'A time-lapse that lands on the beat',
        },
        {
          type: 'p',
          text: 'The three systems forget at very different rates. From a separation of $10^{-6}$, Lorenz paths become visibly distinct after about fifteen time units; Aizawa paths take closer to ninety. Played at one speed, either Lorenz would be over in a blink or Aizawa would take minutes. So each cycle starts by running four of the paths ahead, silently, to find two moments: when their spread first becomes visible (0.4% of the attractor’s size) and when it is full (30%). The piece then builds a map from wall-clock time to simulated time with a fast hump in the middle — a time-lapse — scaled so the bundle frays at eight seconds into the cycle and fills the attractor by twelve, whatever the system:',
        },
        {
          type: 'code',
          code: `// rate profile: slow start, a time-lapse hump, then a steady viewing rate
const rView = (tFull - tVis) / (T_FULL - T_VIS)
const base = (c: number) => rView * smoothstep(T_IN, T_IN + 1, c)
const hump = (c: number) => smoothstep(T_IN + 0.4, T_IN + 2.6, c) * (1 - smoothstep(T_VIS - 2.2, T_VIS, c))
let a0 = 0
let a1 = 0
for (let c = 0; c < T_VIS; c += dtT) {
  a0 += base(c) * dtT
  a1 += hump(c) * dtT
}
const A = Math.max(0, (tVis - a0) / a1)`,
          caption: 'Solve for the hump’s height $A$ so the integral of the rate reaches the visible-spread moment exactly on cue; the profile is then tabulated at 60 Hz.',
        },
        {
          type: 'p',
          text: 'Each frame the piece looks up how much simulated time should have elapsed and takes as many whole RK4 steps as needed to catch up — usually a handful, a few dozen at the peak of a time-lapse, never more than 420. The current rate is shown in the run sheet, so the time-lapse is declared rather than hidden.',
        },
        {
          type: 'h',
          text: 'Trails',
        },
        {
          type: 'p',
          text: 'Every step, every path pushes its position (normalized so each attractor fits a unit cube, and rotated so its natural axis points up) into a ring buffer: 240 points for each follower, 1,800 for the lead. Each frame the buffers are projected through an orbiting perspective camera and drawn as polylines in four age bands — newest brightest — with one path per band for all 119 followers, so the whole ensemble costs four stroke calls. The lead is drawn on top in sky blue with a longer, six-band trail. While the bundle is still coherent the followers lie exactly on top of one another, and their overlapping strokes read as one bright line; as they separate the line becomes a ribbon, then a fan, then a cloud.',
        },
        {
          type: 'h',
          text: 'Measuring the spread',
        },
        {
          type: 'p',
          text: 'The headline number is the root-mean-square distance of the followers from the lead, in the system’s own units:',
        },
        {
          type: 'math',
          tex: String.raw`\Delta = \sqrt{\frac{1}{N - 1} \sum_{i=1}^{N-1} |\vec{x}_i - \vec{x}_0|^2}`,
          label: '(8)',
        },
        {
          type: 'p',
          text: 'It is printed in plain decimals while it is small, so you watch the zeros disappear, and plotted on a logarithmic axis against simulated time. The dashed line beside it has slope $\\lambda_1 / \\ln 10$: when the measured curve runs parallel to it the growth is exponential at the rate equation (5) predicts; when it flattens, the spread has reached the size of the attractor and there is nowhere further to diverge.',
        },
        {
          type: 'h',
          text: 'Cost and determinism',
        },
        {
          type: 'p',
          text: 'At the viewing rate the piece takes a few RK4 steps per frame for each of the 120 paths — a few thousand evaluations of the equations — and at the peak of a time-lapse a few dozen steps each, still well under a millisecond of arithmetic. Drawing is the larger cost: about thirty thousand trail points are projected and stroked every frame, as ten paths (four age bands for the ensemble, six for the lead). The probe that times each cycle runs once per cycle, a few tens of thousands of steps, in a few milliseconds.',
        },
        {
          type: 'p',
          text: 'Each cycle’s seed comes from a generator seeded with the cycle number, and simulated time is a fixed function of the time within the cycle, so the piece is deterministic: the same moment always shows the same strands in the same places, which is what lets the test route photograph any frame exactly. In that route, frames before the requested moment are simulated but not drawn.',
        },
        {
          type: 'h',
          text: 'The hand-over',
        },
        {
          type: 'p',
          text: 'In the last second and a half of a cycle the trails drain from the tail, the axes undraw and the title fades; the next system’s seed arrives with a small registration mark and its coordinates. Dragging adds an offset to the camera’s yaw and pitch, with a little inertia when you let go and a slow ease back to the scripted orbit once you have been idle for a couple of seconds.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'One cycle, beat by beat',
      blocks: [
        {
          type: 'table',
          head: ['Time in cycle', 'Beat', 'What to look for'],
          rows: [
            ['0–1.2 s', 'Arrival', 'The seed point, its coordinates $x_0$ and “120 seeds within 1e−6”; the axes grow out from the origin.'],
            ['1.2–8 s', 'Build', 'A single bright line sketches the attractor as the time-lapse runs; Δ climbs through the decimal places; the log chart rises in a straight line.'],
            ['8–12 s', 'Peak', 'The bundle frays into a ribbon and then a cloud of strands covering the whole attractor; Δ reaches the attractor’s size and the chart flattens.'],
            ['12–14.4 s', 'Settle', 'The cloud keeps orbiting, a picture of the attractor’s long-run statistics.'],
            ['14.4–16 s', 'Release', 'Trails drain tail-first; the next system arrives.'],
          ],
        },
        {
          type: 'p',
          text: 'The measured curve on the log chart is not a perfectly straight line, and the wiggles are real. Stretching on a chaotic attractor is uneven: on the Lorenz attractor neighbouring paths separate fastest as they pass near the saddle between the two lobes and can even draw closer for a while as they circle a lobe. The Lyapunov exponent is the *average* rate over a long run, and the dashed line shows that average. On a short stretch, the measured spread runs a little ahead of the line or behind it.',
        },
        {
          type: 'list',
          items: [
            '**Equations and parameters** (top left) — the system being integrated, exactly as in equations (1), (3) and (4).',
            '**SPREAD** — equation (8): the initial spread $\\Delta_0$ and the live value.',
            '**LOG Δ chart** — the history of the spread against simulated time τ, with the dashed Lyapunov slope.',
            '**Run sheet** (bottom right) — the number of paths and the seed radius, the integrator and step size $h$, the simulated time τ, and the current time-lapse rate.',
            '**Axes** — the system’s own $x$, $y$, $z$ through its origin, with ticks in its natural units (tens for Lorenz, halves for Aizawa, fives for Halvorsen).',
            '**Colour** — paper-white strands for the ensemble, sky blue for the lead path and the spread readouts.',
          ],
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'Where the drawing bends the physics',
      blocks: [
        {
          type: 'list',
          items: [
            '**Simulated time is elastic.** The time-lapse hump compresses the long, invisible early growth so every system frays on the same beat. The rate readout always says how fast time is running.',
            '**Halvorsen uses $a = 1.4$.** The value most often quoted is 1.89; from this piece’s starting points that version did not diverge reliably within a sixteen-second cycle, and 1.4 gives a robustly chaotic attractor with $\\lambda_1 \\approx 0.67$.',
            '**The spread is measured from the lead.** Other choices — the maximum pairwise distance, or the spread about the ensemble’s mean — give curves of the same shape with different constants.',
            '**The thresholds are visual.** “Visible” and “full” spread are fractions of each attractor’s bounding size, chosen so the beats land; they are not physical quantities.',
            '**Normalization and orientation.** Each attractor is scaled to fill the same space and turned so its axis of symmetry points up, which changes how it looks but not its dynamics.',
            '**Numerical, not exact, trajectories.** As the mathematics section says, no finite-precision computation tracks a chaotic trajectory exactly; what the piece shows faithfully is the divergence and the attractor’s shape.',
          ],
        },
      ],
    },
  ],
  interact: {
    gestures: [{ gesture: 'drag', action: 'Orbit the camera. Let go and it drifts back to its slow orbit.' }],
    tip: 'Orbit while the bundle is still one line, and look end-on: the strands are already separating along one direction, the unstable one, while staying pressed together in the others.',
  },
  further: [
    { title: 'Deterministic Nonperiodic Flow', by: 'Edward N. Lorenz', year: '1963', note: '*Journal of the Atmospheric Sciences*.' },
    { title: 'The Essence of Chaos', by: 'Edward N. Lorenz', year: '1993', note: 'Lorenz’s own account, including the 1972 butterfly lecture.' },
    { title: 'Chaos: Making a New Science', by: 'James Gleick', year: '1987', note: 'The story of the rounded printout, and much more.' },
    { title: 'Nonlinear Dynamics and Chaos', by: 'Steven H. Strogatz', year: '1994', note: 'The standard textbook; chapter 9 is on the Lorenz equations.' },
    { title: 'On the Nature of Turbulence', by: 'David Ruelle, Floris Takens', year: '1971', note: 'Where “strange attractor” was coined.' },
    { title: 'Lyapunov Characteristic Exponents for Smooth Dynamical Systems and for Hamiltonian Systems', by: 'Giancarlo Benettin, Luigi Galgani, Antonio Giorgilli, Jean-Marie Strelcyn', year: '1980', note: 'The renormalization method used to measure λ₁.' },
    { title: 'A Rigorous ODE Solver and Smale’s 14th Problem', by: 'Warwick Tucker', year: '2002', note: 'The proof that the Lorenz attractor exists.' },
    { title: 'Chaos and Time-Series Analysis', by: 'J. C. Sprott', year: '2003', note: 'A wide catalogue of chaotic flows.' },
  ],
}

export default guide
