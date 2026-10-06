import type { Guide } from '../guide'

const ellipseFigure = `<svg viewBox="0 0 420 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <ellipse cx="190" cy="110" rx="150" ry="90"/>
  <line x1="30" y1="110" x2="350" y2="110" stroke-dasharray="3 4" opacity="0.5"/>
  <line x1="190" y1="14" x2="190" y2="206" stroke-dasharray="3 4" opacity="0.5"/>
  <circle cx="310" cy="110" r="5" fill="currentColor" opacity="0.15"/>
  <circle cx="310" cy="110" r="5"/>
  <circle cx="70" cy="110" r="2.5"/>
  <path d="M310 110 L232 39 L70 110" stroke="#2B6A93"/>
  <circle cx="232" cy="39" r="3" fill="#2B6A93" stroke="none"/>
  <text x="246" y="34" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">r₁ + r₂ = 2a</text>
  <text x="296" y="130" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">SUN · F₁</text>
  <text x="48" y="130" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">F₂</text>
  <text x="352" y="104" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">q</text>
  <text x="18" y="104" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">Q</text>
  <text x="196" y="66" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">b</text>
  <text x="246" y="124" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">c = ae</text>
  <text x="362" y="190" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">e = c / a</text>
</svg>`

const newtonFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="70" cy="160" r="4" fill="currentColor"/>
  <text x="56" y="182" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">S</text>
  <path d="M70 160 L150 60 L250 40 L330 70" stroke="currentColor"/>
  <path d="M70 160 L250 40 M70 160 L330 70" opacity="0.5"/>
  <path d="M150 60 L230 -40" stroke-dasharray="3 3" opacity="0.4"/>
  <path d="M250 40 L350 20" stroke-dasharray="3 3" opacity="0.4"/>
  <path d="M70 160 L150 60 L250 40 Z" fill="#2B6A93" fill-opacity="0.12" stroke="none"/>
  <path d="M70 160 L250 40 L330 70 Z" fill="#1F8A86" fill-opacity="0.12" stroke="none"/>
  <circle cx="150" cy="60" r="2.5" fill="currentColor"/>
  <circle cx="250" cy="40" r="2.5" fill="currentColor"/>
  <circle cx="330" cy="70" r="2.5" fill="currentColor"/>
  <text x="136" y="52" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">A</text>
  <text x="246" y="30" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">B</text>
  <text x="336" y="66" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">C</text>
  <text x="150" y="110" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">SAB</text>
  <text x="236" y="92" font-family="Geist Mono, monospace" font-size="9" fill="#1F8A86" stroke="none">SBC</text>
  <text x="250" y="150" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">a kick towards S at B,</text>
  <text x="250" y="164" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">then a straight drift:</text>
  <text x="250" y="178" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">equal triangles</text>
</svg>`

const guide: Guide = {
  lede: 'Kepler’s three laws of planetary motion, drawn the way he found them (an ellipse, a sweep of equal areas, a harmony between distance and period) and then handed to you as an orrery in which every orbit is integrated from Newton’s law of gravity.',
  facts: [
    ['Laws', 'Kepler: I and II in *Astronomia Nova* (1609), III in *Harmonices Mundi* (1619)'],
    ['Explained', 'Newton, *Principia* (1687), from inverse-square gravity'],
    ['Force', '$\\ddot{\\vec{r}} = -GM\\,\\vec{r}/r^3$'],
    ['Units', '$GM_\\odot = 4\\pi^2$ AU³/yr², so one AU gives one year'],
    ['Planet A', '$a = 1$ AU, $e = 0.6$; measured period 1.0000 yr'],
    ['Planet B', '$a = 2$ AU, $e = 0.1$; measured period 2.8284 yr'],
    ['Sectors', 'Twelve of 1/12 yr each, every one 0.2094 AU²'],
    ['Integrator', 'Kick-drift-kick leapfrog (Störmer–Verlet), 4,096 steps per orbit'],
    ['Running time', '90 s in four chapters; the orrery holds while you play'],
    ['Sound', 'Optional: a note at each perihelion, a tick at each sector'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['C'], action: 'Clear the bodies you launched' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Press where a world should start and drag to set its velocity; release to launch it' },
      { gesture: 'tap', action: 'Tap to place a world on a circular orbit' },
      { gesture: 'tap', action: 'Tap a chapter on the bottom ruler to jump to it' },
    ],
    tip: 'While you drag, the two dotted rings around the start point are the circular and escape speeds for that distance. Pull the arrow past the outer ring and the world will never come back.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Astronomy',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Watch the planets for a few months and they do not simply circle the sky. They speed up and slow down, and the outer planets stop, back up and go forward again. For two thousand years astronomers modelled this with circles riding on circles, and the models worked well enough to predict eclipses and make calendars. Copernicus, in 1543, put the Sun at the centre, which explained the backing-up at a stroke, but he kept the circles, and with them most of the machinery.',
        },
        {
          type: 'p',
          text: 'The break came from data. Tycho Brahe, working from his observatory on the island of Hven and later in Prague, spent some twenty years measuring planetary positions by eye, with instruments he designed himself, to a precision of a minute or two of arc, several times better than anyone before him. In 1600 Johannes Kepler came to work for him. Tycho died in 1601, Kepler inherited his post and, after some wrangling with the family, his records, and set himself to the orbit of Mars, the planet whose wanderings the old models fitted worst.',
        },
        {
          type: 'p',
          text: 'Kepler’s first serious model, a circle with an offset centre and an offset point of uniform motion, matched Tycho’s Mars longitudes to about two minutes of arc. At some points of the orbit it was off by about eight. Earlier astronomers would have shrugged; Kepler trusted the observations, threw out years of work, and after more false starts (an oval, an egg) found that Mars moves on an ellipse with the Sun at one focus. He had found the second law, that the line from the Sun sweeps equal areas in equal times, a little earlier, as part of the same struggle. Both appeared in *Astronomia Nova* in 1609.',
        },
        {
          type: 'p',
          text: 'The third law took another decade. In *Harmonices Mundi* (1619), a book mostly about the musical and geometrical harmony Kepler believed the Creator had built into the world, he announced that the square of a planet’s period is proportional to the cube of its mean distance from the Sun. He records that the idea came to him in March 1618 and that he convinced himself of it in May. It is the first law in physics that relates different bodies to one another: the same constant holds for Mercury and for Saturn.',
        },
        {
          type: 'aside',
          title: 'Right laws, wrong cause',
          text: 'Kepler thought the Sun pushed the planets round with a rotating, magnet-like force that weakened with distance. The laws were right; the physics behind them waited sixty years for Newton.',
        },
        { type: 'h', text: 'Newton' },
        {
          type: 'p',
          text: 'In 1684 Edmond Halley asked Isaac Newton what path a planet would follow if the Sun attracted it with a force that falls off as the inverse square of distance. Newton is said to have answered at once that it would be an ellipse, and to have produced the proof a few months later in a short manuscript, *De motu corporum in gyrum*. It grew into the *Principia* (1687), which derives all three of Kepler’s laws from three laws of motion and one law of gravitation, and goes on to the tides, the Moon and the comets.',
        },
        {
          type: 'p',
          text: 'The derivation also shows what Kepler’s laws are really about. The area law holds for *any* force that points at the Sun; it is the conservation of angular momentum. The ellipse is special to the inverse square. And the third law, once Newton corrects it for the planet’s own mass, becomes a balance: measure how far away a moon or a planet orbits and how long it takes, and you have weighed the body at the centre. That is how we know the mass of the Sun, of Jupiter from its moons, and of stars from the planets around them.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mechanics',
      title: 'The three laws, and why',
      blocks: [
        { type: 'h', text: 'I. The ellipse' },
        {
          type: 'p',
          text: 'An ellipse is the set of points whose distances to two fixed points, the foci, add up to the same length, $r_1 + r_2 = 2a$. Pin a loop of string round two nails, pull it taut with a pencil and go round: that is the gardener’s construction, and chapter I draws the orbit that way. Measured from the focus where the Sun sits, the orbit is',
        },
        { type: 'math', tex: 'r(\\theta) = \\frac{a(1 - e^2)}{1 + e\\cos\\theta}, \\qquad b = a\\sqrt{1 - e^2}, \\qquad c = ae', label: '(1)' },
        {
          type: 'p',
          text: 'where $a$ is the semi-major axis, $b$ the semi-minor axis, $c$ the distance from the centre to each focus and $e$ the eccentricity. The nearest point, perihelion, is at $q = a(1 - e)$ and the farthest, aphelion, at $Q = a(1 + e)$. Planet A has $a = 1$ AU and $e = 0.6$, so $b = 0.8$, $q = 0.4$ and $Q = 1.6$ AU.',
        },
        { type: 'figure', svg: ellipseFigure, alt: 'An ellipse with its two foci, axes and the string construction from a point on the curve to both foci.', caption: 'The anatomy of the orbit: the Sun at one focus, the other empty; a string of length $2a$ from focus to pen to focus.' },
        { type: 'h', text: 'II. Equal areas' },
        {
          type: 'p',
          text: 'In a short time $dt$ the line from the Sun sweeps a thin triangle of area $dA = \\tfrac{1}{2}|\\vec{r} \\times \\vec{v}|\\,dt$. A force that points straight at the Sun exerts no torque about it, so the specific angular momentum $h = |\\vec{r} \\times \\vec{v}|$ never changes, and neither does the rate of sweeping:',
        },
        { type: 'math', tex: '\\frac{dA}{dt} = \\frac{h}{2} = \\text{const}, \\qquad A_{\\text{orbit}} = \\pi a b = \\frac{h}{2}\\,T', label: '(2)' },
        {
          type: 'p',
          text: 'Close to the Sun the radius is short, so the planet must move fast to sweep its quota; far out it can dawdle. For planet A the readouts show $r \\times v = 5.0265$ AU²/yr throughout, which is $2\\pi \\cdot 0.8$, and the speeds at the two ends of the orbit stand in the ratio of the distances:',
        },
        { type: 'math', tex: '\\frac{v_p}{v_a} = \\frac{Q}{q} = \\frac{1 + e}{1 - e} = 4, \\qquad v^2 = GM\\left(\\frac{2}{r} - \\frac{1}{a}\\right)', label: '(3)' },
        {
          type: 'p',
          text: 'The second formula is the *vis-viva* equation, energy conservation in disguise. With $GM = 4\\pi^2$ it gives 12.6 AU/yr at perihelion and 3.1 AU/yr at aphelion, the two arrows of chapter II.',
        },
        { type: 'h', text: 'III. The harmony' },
        {
          type: 'p',
          text: 'Integrating (2) over a whole orbit and using the ellipse’s geometry gives Kepler’s third law with Newton’s constant in it:',
        },
        { type: 'math', tex: 'T^2 = \\frac{4\\pi^2}{G(M + m)}\\,a^3 \\;\\approx\\; \\frac{4\\pi^2}{GM}\\,a^3', label: '(4)' },
        {
          type: 'p',
          text: 'Measure distances in AU and times in years and the constant is one: $T^2 = a^3$. The period depends only on the semi-major axis, not on the shape. Planet A, stretched to $e = 0.6$, has exactly Earth’s year; planet B, at 2 AU, takes $2^{3/2} = 2.828$ years. On log–log axes the law is a straight line of slope 3/2, and the six planets Kepler knew sit on it:',
        },
        {
          type: 'table',
          head: ['Planet', '$a$ (AU)', '$T$ (yr)', '$T^2/a^3$'],
          rows: [
            ['Mercury', '0.387', '0.241', '1.00'],
            ['Venus', '0.723', '0.615', '1.00'],
            ['Earth', '1.000', '1.000', '1.00'],
            ['Mars', '1.524', '1.881', '1.00'],
            ['Jupiter', '5.203', '11.862', '1.00'],
            ['Saturn', '9.537', '29.457', '1.00'],
          ],
          caption: 'Modern values, rounded. Kepler’s own distances were less exact, but good enough to see the law.',
        },
        { type: 'h', text: 'Every conic, and escape' },
        {
          type: 'p',
          text: 'Newton’s solution allows more than ellipses. The orbit’s energy per unit mass, $E = \\tfrac{1}{2}v^2 - GM/r$, decides its shape, and its eccentricity follows from energy and angular momentum together:',
        },
        { type: 'math', tex: 'e = \\sqrt{1 + \\frac{2Eh^2}{(GM)^2}}, \\qquad v_{\\text{circ}} = \\sqrt{\\frac{GM}{r}}, \\qquad v_{\\text{esc}} = \\sqrt{2}\\,v_{\\text{circ}}', label: '(5)' },
        {
          type: 'p',
          text: 'Negative energy gives an ellipse ($e < 1$), zero a parabola, positive a hyperbola, and a body on either of the last two never returns. That is what the two rings around your launch point mean: the inner is the speed for a circle at that distance, the outer the speed to escape. Between them the orbit is an ever longer ellipse; past the outer ring it is open.',
        },
        {
          type: 'p',
          text: 'In the orrery, A and B are given masses (a thousandth and three thousandths of the Sun’s, Jupiter’s mass and three times it), so a body that passes close to one is deflected. In the planet’s own frame the encounter only turns the body’s velocity; in the Sun’s frame the planet’s motion is added in, and the body can leave with more energy than it came with. Spacecraft use exactly this, a gravity assist. The dotted circles are the planets’ Hill spheres, radius $a\\,(m/3M)^{1/3}$, roughly where the planet’s pull outweighs the Sun’s tide.',
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
          text: 'Equal Areas is one TypeScript module drawing to a Canvas 2D context, with no libraries. It runs on two clocks. The story clock drives chapters I to III as a pure function of time, so they can be scrubbed and always look the same at the same moment. The orrery runs its own free clock, so it can keep going while you play and the story holds still.',
        },
        { type: 'h', text: 'Integrating, not drawing' },
        {
          type: 'p',
          text: 'Nothing on the page is an analytic ellipse except the construction lines of chapter I. At load, each lesson planet is launched from aphelion and integrated for one orbit with the kick-drift-kick leapfrog: half a kick from the acceleration, a full drift, the other half kick. Every step is stored, so the drawing can later look a position up by time:',
        },
        {
          type: 'code',
          code: `for (let i = 0; i < n; i++) {
  X[i] = x
  Y[i] = y
  let r2 = x * x + y * y
  let k = -GM / (r2 * Math.sqrt(r2))
  vx += 0.5 * h * k * x   // half kick
  vy += 0.5 * h * k * y
  x += h * vx             // drift
  y += h * vy
  r2 = x * x + y * y
  k = -GM / (r2 * Math.sqrt(r2))
  vx += 0.5 * h * k * x   // half kick
  vy += 0.5 * h * k * y
  // ...and the period is measured: the step where the angle passes 2π
}`,
          caption: 'From `makeTrack`: 4,096 steps per orbit, units where $GM = 4\\pi^2$.',
        },
        {
          type: 'p',
          text: 'The period is not assumed; it is read off the integration as the moment the planet has turned a full $2\\pi$, interpolated between steps. Planet A comes back after 1.0000076 years and planet B after 2.828429, against exact values of 1 and $2\\sqrt{2} = 2.828427$, which is why the readout can honestly show $T^2/a^3 = 1.0000$ for both.',
        },
        { type: 'h', text: 'Why leapfrog' },
        {
          type: 'p',
          text: 'The simplest integrator, Euler’s method, adds a little energy every orbit, and a planet integrated that way spirals slowly outward. Leapfrog is *symplectic*: it is the exact solution of a slightly different Hamiltonian, so its energy error stays bounded rather than accumulating. Over this orbit the worst relative energy error is $1.7 \\times 10^{-5}$, and it would be the same after a million orbits. It is also time-reversible, and, for a central force, it conserves angular momentum exactly, to the last digit the computer keeps ($6.5 \\times 10^{-15}$ here).',
        },
        {
          type: 'p',
          text: 'That last property is Kepler’s second law in discrete form. Each drift moves the planet in a straight line, $\\vec{x}_{n+1} = \\vec{x}_n + h\\,\\vec{v}_{n+1/2}$, so the triangle from the Sun to two successive positions has area $\\tfrac{1}{2}h\\,|\\vec{x}_n \\times \\vec{v}_{n+1/2}|$, and that cross product is the quantity the kicks leave unchanged. Every step sweeps exactly the same triangle. Newton’s own proof of the area law in the *Principia* (Book I, Proposition 1) is this picture: a body drifting straight, receiving an impulse towards the centre at equal intervals, cuts off equal triangles. The connection between Newton’s argument and the Störmer–Verlet method is drawn out by Hairer, Lubich and Wanner in their 2003 survey of the method.',
        },
        { type: 'figure', svg: newtonFigure, alt: 'A polygon path around a centre S, with triangles SAB and SBC shaded, showing that a straight drift plus a central impulse sweeps equal areas.', caption: 'Newton’s polygon: drift from A to B, a kick towards S at B, drift to C. Triangles SAB and SBC have equal area, and so do the piece’s steps.' },
        { type: 'h', text: 'The sectors' },
        {
          type: 'p',
          text: 'In chapter II the orbit is divided into twelve intervals of one twelfth of the measured period, centred so that one straddles aphelion and the petals are mirror-symmetric. Each sector is built from the stored steps as a fan from the Sun, hatched, and its area summed as it is drawn:',
        },
        {
          type: 'code',
          code: `const n = Math.max(2, Math.ceil((t1 - t0) / trA.h))
const path = new Path2D()
path.moveTo(X(0), Y(0))                    // the Sun
let area = 0
for (let i = 0; i <= n; i++) {
  sample(trA, t0 + ((t1 - t0) * i) / n, tmp)
  if (i) area += 0.5 * (px0 * tmp.y - tmp.x * py0)
  px0 = tmp.x
  py0 = tmp.y
  path.lineTo(X(tmp.x), Y(tmp.y))
}
path.closePath()
if (full) secArea[k] = area                  // into the log, column ΔA`,
          caption: 'The area of each sector, by the shoelace formula over the integrated positions. All twelve come out at 0.20944 AU², which is $\\pi a b / 12$.',
        },
        {
          type: 'p',
          text: 'The second orbit of chapter II lays a tick on the path every 1/48 of a year. They crowd together near aphelion and spread apart near perihelion: the same law, read as speed instead of area.',
        },
        { type: 'h', text: 'Clocks' },
        {
          type: 'p',
          text: 'The story runs a year in 8 seconds through chapter II, in 4 seconds for the harmonies of chapter III, and in 7 seconds in the orrery. Changing speed abruptly would make the planets jerk, so the rate is blended smoothly and integrated once into a table that maps story time to years. In chapter III the two periods are measured by stopwatch arcs that trace each planet’s lap, starting at a fixed moment; when a lap closes, its point drops onto the log–log plot beside Kepler’s six planets.',
        },
        { type: 'h', text: 'The orrery' },
        {
          type: 'p',
          text: 'Launched bodies are test particles: they feel the Sun and both planets but pull on nothing. Each frame advances them with the same leapfrog, in smaller steps the closer they are to the Sun, because a body at perihelion moves quickly and a fixed step would cut corners:',
        },
        {
          type: 'code',
          code: `const r0 = Math.hypot(b.x, b.y)
const hMax = r0 < 0.12 ? 1 / 24000 : r0 < 0.35 ? 1 / 6000 : 1 / 1600
const n = Math.max(1, Math.ceil(dtau / hMax))
const hh = dtau / n
accel(b.x, b.y, tau, acc)        // Sun + A + B, planets read from their tables
for (let k = 0; k < n; k++) {
  b.vx += 0.5 * hh * acc.ax
  b.vy += 0.5 * hh * acc.ay
  b.x += hh * b.vx
  b.y += hh * b.vy
  tau += hh
  accel(b.x, b.y, tau, acc)
  b.vx += 0.5 * hh * acc.ax
  b.vy += 0.5 * hh * acc.ay
  if (acc.dS < 0.035 || acc.dA < 0.022 || acc.dB < 0.03) return false // swallowed
}`,
          caption: 'Advancing one body by `dtau` years. Bodies farther than 14 AU are let go.',
        },
        {
          type: 'p',
          text: 'While you drag, the same integrator runs 900 steps ahead from the press point with the velocity your arrow implies, and the dotted path is that prediction, slingshots included, because the planets’ future positions are known from their tables. The label beside the arrow classifies the orbit from its energy and angular momentum, using (5). A tap with no drag places a body at exactly circular speed, anticlockwise like the planets.',
        },
        {
          type: 'p',
          text: 'The orrery opens with four demonstrations, each preceded by a ghost of the gesture: a bound ellipse, a near-escape at 0.9 of escape speed that comes back on a long, slow ellipse, an escape on a hyperbola, and a gravity assist past B. The last is found by a small search at load, 135 candidate launches integrated for two years each, keeping the one that gains the most energy from a close pass by B.',
        },
        { type: 'h', text: 'Sound' },
        {
          type: 'p',
          text: 'With sound on, every body plays a soft sine note as it passes perihelion, detected as the moment its radial velocity turns from inward to outward. Closer perihelia sound higher, on a D major pentatonic scale. In chapter II a quiet tick marks each sector boundary, so the equal times are audible as a steady clock while the sectors change shape.',
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
            '**Chapter I:** two pins and a blue string draw the orbit; then the dashed major and minor axes, the centre (a small cross), the empty focus $F_2$ (a registration mark) and the Sun at $F_1$. Dimension lines give $2a$, $2b$ and $c = ae$; the ends are labelled perihelion and aphelion.',
            '**Chapter II:** the blue line is the radius vector. The hatched sectors, alternating lagoon and ocean, are each 1/12 of a year; their numbers sit just outside the orbit. The log on the left lists each sector’s time and area and their sum, $\\pi a b$. Ticks along the orbit mark equal 1/48 year steps; the blue arrows are the speeds at perihelion and aphelion, and a small arrow rides with the planet.',
            '**Chapter III:** a protractor ring around the Sun; A (a filled dot) and B (a cross in a circle). The thick lagoon and ocean arcs are stopwatches tracing one lap of each. The log–log plot shows Kepler’s six planets as dots, the law $T^2 = a^3$ as a moss line, and the two measured worlds as rings.',
            '**Chapter IV:** the orbits of A and B become dashed and gain masses; their dotted circles are Hill spheres. Your bodies are ocean, the demonstrations lagoon, with trails that fade with age.',
            '**The launch instrument:** a dot at the press point, the velocity arrow, the circular and escape rings, the predicted path and a label: ellipse with its eccentricity, escape, slung out by a planet, or into the Sun.',
            '**Top right:** live readouts. **Bottom:** the chapter ruler; tap it to jump. In the orrery, a “free play” mark appears on it while the story is holding for you.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the moment the twelfth petal closes and the log adds up to $\\pi a b$; the second orbit, when the ticks crowd at aphelion; B’s lap closing on the plot exactly on the line, with a shape quite unlike A’s; and in the orrery, a body that passes just behind B and leaves faster than it came.',
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
            '**An exaggerated ellipse.** Planet A’s eccentricity is 0.6 so that the ellipse and the speed change are obvious. Mars, the planet Kepler fought with, has 0.093; Earth has 0.017. The laws do not care.',
            '**A fixed Sun.** The Sun is held still at the origin. Strictly, the Sun and a planet both orbit their common centre of mass, which is why Newton’s version of the third law has $M + m$ in it; for the lesson planets the difference is nil because they are massless.',
            '**A restricted orrery.** In chapter IV the planets have mass, but they follow their fixed orbits and do not pull on each other or on the Sun; only your bodies feel everything. Gravity is softened very slightly at tiny distances, and bodies are removed if they come within a few hundredths of an AU of the Sun or a planet, far larger than the real bodies.',
            '**Speed.** Time is enormously compressed and runs at different rates in different chapters, blended smoothly.',
            '**Kepler’s data.** The six planets on the plot use modern values. Kepler’s own distances, derived partly from Tycho’s observations, were less precise.',
            '**Sound.** The perihelion pitches are a musical choice, not a physical quantity, although Kepler, in *Harmonices Mundi*, did assign musical intervals to the planets from their speeds at perihelion and aphelion.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'New Astronomy (Astronomia Nova)', by: 'Johannes Kepler, translated by William H. Donahue', year: '1609; Cambridge University Press, 1992', note: 'The war on Mars, in Kepler’s own discursive voice.' },
    { title: 'The Harmony of the World (Harmonices Mundi)', by: 'Johannes Kepler, translated by E. J. Aiton, A. M. Duncan and J. V. Field', year: '1619; American Philosophical Society, 1997', note: 'Book V contains the third law.' },
    { title: 'The Principia: Mathematical Principles of Natural Philosophy', by: 'Isaac Newton, translated by I. Bernard Cohen and Anne Whitman', year: '1687; University of California Press, 1999', note: 'Book I, Propositions 1–17: areas, ellipses and the inverse square.' },
    { title: 'The Composition of Kepler’s Astronomia Nova', by: 'James R. Voelkel', year: '2001', note: 'Princeton University Press. How the book, and the laws, were actually made.' },
    { title: 'Geometric numerical integration illustrated by the Störmer–Verlet method', by: 'Ernst Hairer, Christian Lubich and Gerhard Wanner', year: '2003', note: '*Acta Numerica* 12. Why leapfrog conserves what it conserves, with Newton’s polygon.' },
    { title: 'Solar System Dynamics', by: 'Carl D. Murray and Stanley F. Dermott', year: '1999', note: 'Cambridge University Press. Chapter 2 is the two-body problem in full.' },
    { title: 'Feynman’s Lost Lecture: The Motion of Planets Around the Sun', by: 'David L. Goodstein and Judith R. Goodstein', year: '1996', note: 'W. W. Norton. A purely geometric proof that inverse-square orbits are ellipses.' },
  ],
}

export default guide
