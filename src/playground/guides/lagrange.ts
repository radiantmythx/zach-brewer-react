import type { Guide } from '../guide'

const pointsFigure = `<svg viewBox="0 0 420 240" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="200" cy="120" r="100" stroke-dasharray="2 4" opacity="0.35"/>
  <circle cx="196" cy="120" r="6"/>
  <circle cx="196" cy="120" r="1.5" fill="currentColor"/>
  <circle cx="300" cy="120" r="3.5"/>
  <path d="M196 120 L250 33 L300 120 Z M196 120 L250 207 L300 120" stroke-dasharray="3 3" opacity="0.5"/>
  <g stroke="#3F7A55">
    <circle cx="250" cy="33" r="4"/><path d="M243 33h14M250 26v14"/>
    <circle cx="250" cy="207" r="4"/><path d="M243 207h14M250 200v14"/>
  </g>
  <g stroke="#2B6A93">
    <circle cx="282" cy="120" r="3"/><path d="M277 120h10M282 115v10"/>
    <circle cx="318" cy="120" r="3"/><path d="M313 120h10M318 115v10"/>
    <circle cx="100" cy="120" r="3"/><path d="M95 120h10M100 115v10"/>
  </g>
  <text x="258" y="28" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">L4 · HILLTOP</text>
  <text x="258" y="222" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">L5 · HILLTOP</text>
  <text x="262" y="140" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">L1</text>
  <text x="326" y="140" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">L2</text>
  <text x="62" y="140" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">L3 · SADDLE</text>
  <text x="172" y="146" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">SUN</text>
  <text x="290" y="104" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">PLANET</text>
  <text x="214" y="96" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">60°</text>
</svg>`

const guide: Guide = {
  lede: 'In the frame that turns with a planet, gravity and the centrifugal effect fold into one landscape. It has five flat places where a small body can keep station: three saddles that spill anything placed on them, and two hilltops that, against all intuition, hold.',
  facts: [
    ['Problem', 'The circular restricted three-body problem'],
    ['Found', 'Euler (1767): L1, L2, L3 on the line; Lagrange (1772): L4, L5'],
    ['System shown', 'Sun–Jupiter, $\\mu = m_2/(m_1 + m_2) = 9.54 \\times 10^{-4}$'],
    ['Landscape', '$2\\Omega = x^2 + y^2 + 2(1-\\mu)/r_1 + 2\\mu/r_2$'],
    ['L4, L5 stable if', '$27\\mu(1 - \\mu) < 1$, that is $\\mu < 0.0385$'],
    ['Trojans', 'Jupiter’s, at L4 and L5: over ten thousand catalogued; first found 1906'],
    ['Webb', 'Sun–Earth L2, 1.5 million km beyond Earth, since January 2022'],
    ['Integrators', 'Leapfrog in the inertial frame; RK4 for the periodic orbits'],
    ['Running time', '84 s in five chapters; free play holds while you work'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['↑', '↓'], action: 'Step μ through Sun–Earth, Sun–Jupiter, Earth–Moon, the Routh limit and Pluto–Charon' },
      { keys: ['C'], action: 'Clear the particles you dropped' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Drop a particle at rest anywhere on the map; the region it can never enter is hatched' },
      { gesture: 'drag', action: 'Drag left or right anywhere (or along the μ ruler) to change the mass ratio' },
      { gesture: 'move', action: 'Hover to read the Jacobi value 2Ω under the pointer' },
    ],
    tip: 'Drag μ past the hatched end of its ruler, 0.0385, and watch the Trojan swarms come apart; drag it back and drop a particle near L4 to see one settle into a tadpole.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'μ ↑', code: 'ArrowUp', aria: 'Next mass ratio' }, { label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Celestial mechanics',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Two bodies under gravity are solved: each follows a conic section around their common centre. Add a third and there is, in general, no formula at all. Newton found the Moon, pulled by both Earth and Sun, the hardest problem he ever worked on, and in 1890 Henri Poincaré showed why: the three-body problem has no complete set of conserved quantities, and its orbits can be chaotic. What survives are special cases.',
        },
        {
          type: 'p',
          text: 'The most useful one is the *restricted* problem. Let two massive bodies (a Sun and a planet) circle their centre of mass, and add a third so light that it is pulled but does not pull back: a dust grain, an asteroid, a spacecraft. Viewed from a frame that turns with the planet, the two massive bodies stand still, and the question becomes: where can the small body stand still too?',
        },
        {
          type: 'p',
          text: 'Leonhard Euler found three answers on the line through the two bodies, in work published in 1767: one between them, one beyond the planet and one on the far side of the Sun. In 1772 Joseph-Louis Lagrange, in an essay that won the prize of the Paris Academy, found two more, off the line, each at the third corner of an equilateral triangle whose other corners are the Sun and the planet. The five are now named L1 to L5, with L4 leading the planet in its orbit by 60° and L5 trailing it. Lagrange regarded the triangle solutions as a mathematical curiosity, with no expectation that nature used them.',
        },
        { type: 'h', text: 'Nature used them' },
        {
          type: 'p',
          text: 'In February 1906 Max Wolf, at Heidelberg, found an asteroid moving at Jupiter’s distance from the Sun, about 60° ahead of the planet. It was named 588 Achilles, after the Greek hero, and the convention stuck: the swarm at Jupiter’s L4 is the Greek camp and the swarm at L5 the Trojan camp (with one spy planted in each: 624 Hektor among the Greeks, 617 Patroclus among the Trojans). All of them are now called Jupiter’s Trojans, and more than ten thousand are catalogued. NASA’s Lucy spacecraft, launched in 2021, is on its way to visit several of them.',
        },
        {
          type: 'p',
          text: 'They are not unique to Jupiter. Saturn’s moon Tethys has two small moons at its L4 and L5, Telesto and Calypso, and Dione has Helene and Polydeuces. Earth has at least two known Trojan asteroids, 2010 TK7 and 2020 XL5. Saturn’s moons Janus and Epimetheus share nearly the same orbit and swap places every four years or so, a horseshoe dance in each other’s frame, and the asteroid 3753 Cruithne traces a horseshoe-like path relative to Earth.',
        },
        { type: 'h', text: 'And then we used them' },
        {
          type: 'p',
          text: 'The collinear points are unstable, but only slowly in human terms, and a spacecraft can stay near one with small, regular corrections. Sun–Earth L1, 1.5 million km towards the Sun, has an unbroken view of the Sun: SOHO has watched it from there since early 1996. Sun–Earth L2, the same distance on the far side, keeps Sun, Earth and Moon all behind a spacecraft, which is ideal for cold, sensitive telescopes. WMAP worked there, then Herschel and Planck, then Gaia, and since January 2022 the James Webb Space Telescope, which circles L2 on a large halo orbit about every six months.',
        },
        {
          type: 'aside',
          title: 'Why “halo”',
          text: 'Seen from Earth, a halo orbit around L2 is a loop hundreds of thousands of kilometres across that never passes behind the Earth’s disc, so the spacecraft is never in Earth’s shadow and always in radio contact. Robert Farquhar proposed such orbits in the 1960s for communication relays; ISEE-3 flew the first one, around Sun–Earth L1, in 1978.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'The landscape and its five flat places',
      blocks: [
        { type: 'h', text: 'The turning frame' },
        {
          type: 'p',
          text: 'Choose units in which the two masses together weigh 1, sit a distance 1 apart, and circle once every $2\\pi$ time units. Let $\\mu$ be the planet’s share of the mass. In the frame turning with them, the Sun is at $(-\\mu, 0)$ and the planet at $(1 - \\mu, 0)$, and the small body’s equations of motion are',
        },
        { type: 'math', tex: '\\ddot{x} - 2\\dot{y} = \\frac{\\partial \\Omega}{\\partial x}, \\qquad \\ddot{y} + 2\\dot{x} = \\frac{\\partial \\Omega}{\\partial y}, \\qquad \\Omega = \\frac{x^2 + y^2}{2} + \\frac{1 - \\mu}{r_1} + \\frac{\\mu}{r_2}', label: '(1)' },
        {
          type: 'p',
          text: 'where $r_1$ and $r_2$ are the distances to the Sun and the planet. $\\Omega$ combines the two gravitational potentials with the centrifugal term $\\tfrac{1}{2}(x^2 + y^2)$; the terms $\\mp 2\\dot{y}$, $\\pm 2\\dot{x}$ are the Coriolis force, which pushes sideways on anything moving in the turning frame and does no work.',
        },
        { type: 'h', text: 'The Jacobi constant and the forbidden region' },
        {
          type: 'p',
          text: 'Multiply the first equation by $\\dot{x}$, the second by $\\dot{y}$ and add: the Coriolis terms cancel, and what is left integrates to a conserved quantity found by Carl Jacobi in 1836,',
        },
        { type: 'math', tex: 'C = 2\\Omega(x, y) - (\\dot{x}^2 + \\dot{y}^2)', label: '(2)' },
        {
          type: 'p',
          text: 'Since the speed squared cannot be negative, a body with Jacobi constant $C$ can only be where $2\\Omega \\geq C$. The boundary $2\\Omega = C$ is a *zero-velocity curve*, and George William Hill, in 1878, used exactly this to prove that the Moon can never escape the Earth. The map in the piece is a topographic chart of $2\\Omega$: every hairline is one such curve. A particle dropped at rest has $C = 2\\Omega$ at its starting point, so its zero-velocity curve runs through the drop point, and the region on the other side, hatched, is closed to it forever.',
        },
        { type: 'h', text: 'The five points' },
        {
          type: 'p',
          text: 'A body can rest in the turning frame where the gradient of $\\Omega$ vanishes. Off the axis this requires $r_1 = r_2 = 1$, the equilateral points L4 and L5 at $(\\tfrac{1}{2} - \\mu, \\pm\\tfrac{\\sqrt{3}}{2})$. On the axis it gives a quintic for each of L1, L2 and L3, solved numerically in the piece by Newton’s method. Close to a small planet, L1 and L2 sit about one Hill radius away on either side:',
        },
        { type: 'math', tex: 'r_H \\approx \\left(\\frac{\\mu}{3}\\right)^{1/3}, \\qquad r_H(\\text{Sun–Jupiter}) = 0.068, \\qquad r_H(\\text{Sun–Earth}) = 0.0100', label: '(3)' },
        {
          type: 'p',
          text: 'For Jupiter that is 53 million km; for Earth, 1.5 million km, the distance to Webb.',
        },
        { type: 'figure', svg: pointsFigure, alt: 'A Sun and planet on a dashed circle, with L1 and L2 either side of the planet, L3 opposite, and L4 and L5 at the apexes of two equilateral triangles.', caption: 'Three saddles on the axis, two hilltops at the corners of equilateral triangles.' },
        { type: 'h', text: 'Saddles' },
        {
          type: 'p',
          text: 'Linearise (1) about a collinear point, writing $c_2 = (1 - \\mu)/r_1^3 + \\mu/r_2^3$ there. Small displacements grow or decay as $e^{\\pm\\lambda t}$, with',
        },
        { type: 'math', tex: '\\lambda^2 = \\frac{c_2 - 2 + \\sqrt{9c_2^2 - 8c_2}}{2}', label: '(4)' },
        {
          type: 'p',
          text: 'and they also oscillate in a second, neutral mode. For Sun–Jupiter, $\\lambda = 2.68$ at L1 and 2.35 at L2, so a displacement grows by a factor of $e$ in about 0.7 years: these are true knife edges. L3 is a much gentler saddle, $\\lambda = 0.050$, an $e$-folding time of nearly forty years, and a body that slides off it drifts slowly round into a horseshoe rather than falling away. Spacecraft at Sun–Earth L1 and L2, with $\\lambda \\approx 2.5$ (an $e$-folding time of about three weeks), must fire their thrusters every few weeks to stay.',
        },
        { type: 'h', text: 'Hilltops that hold' },
        {
          type: 'p',
          text: 'L4 and L5 are the *highest* points of the effective potential, $-\\Omega$: a ball placed there in an ordinary landscape would roll off. In the turning frame, though, a body that starts to fall is turned sideways by the Coriolis force, and sideways again, so it circulates around the point instead of leaving it. Linearising about L4 gives the characteristic equation',
        },
        { type: 'math', tex: 's^4 + s^2 + \\frac{27}{4}\\mu(1 - \\mu) = 0', label: '(5)' },
        {
          type: 'p',
          text: 'Its roots are purely imaginary, so the motion is a pure oscillation, exactly when $1 - 27\\mu(1 - \\mu) > 0$:',
        },
        { type: 'math', tex: '\\mu < \\mu_R = \\frac{1}{2}\\left(1 - \\sqrt{\\frac{23}{27}}\\right) = 0.038521', label: '(6)' },
        {
          type: 'p',
          text: 'The condition was found by Gascheau in 1843 and by Edward Routh in 1875, and is usually called Routh’s criterion. The Sun–Jupiter ratio, $9.5 \\times 10^{-4}$, is far below it; so is Earth–Moon, 0.0122. Pluto–Charon, about 0.11, is far above it, and its L4 and L5 cannot hold anything. Proving stability beyond the linear approximation is much harder; it was established for nearly all $\\mu$ below the limit in the 1960s, using the then-new theory of Kolmogorov, Arnold and Moser.',
        },
        {
          type: 'p',
          text: 'For small $\\mu$ the two roots of (5) give a fast oscillation with the orbital period and a slow libration with period $2\\pi / \\sqrt{27\\mu/4}$ in these units. For Jupiter that is about 148 years, which is indeed the typical libration period of Jupiter’s Trojans. Small librations trace *tadpole* orbits around L4 or L5; larger ones merge into *horseshoe* orbits that encircle L4, L3 and L5 and turn back near the planet.',
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
          text: 'Lagrange is one TypeScript module on a Canvas 2D context. The landscape is a function, the contours are computed from it, and every moving particle is integrated; nothing is drawn from a picture.',
        },
        { type: 'h', text: 'The map' },
        {
          type: 'p',
          text: 'Everything starts from the Jacobi function, cheap to evaluate:',
        },
        {
          type: 'code',
          code: `function om2(x: number, y: number, mu: number) {
  const r1 = Math.sqrt((x + mu) * (x + mu) + y * y)
  const r2 = Math.sqrt((x - 1 + mu) * (x - 1 + mu) + y * y)
  return x * x + y * y + (2 * (1 - mu)) / Math.max(r1, 1e-9) + (2 * mu) / Math.max(r2, 1e-9)
}`,
          caption: '$2\\Omega$ in the turning frame, barycentre at the origin.',
        },
        {
          type: 'p',
          text: 'For Sun–Jupiter all the interesting ground is nearly flat: $2\\Omega$ varies by only 0.002 between L4 and L3, while it climbs steeply towards the Sun. A uniform grid would waste its points. So the contours are traced by marching squares on a *polar* grid whose rings crowd towards $r = 1$ from both sides and whose spokes crowd towards the planet: 170 radii by 520 angles. Each cell compares its four corners with the level, picks one of sixteen cases, and emits a segment between the interpolated edge crossings (the two ambiguous saddle cases are resolved by the cell’s mean).',
        },
        {
          type: 'p',
          text: 'The levels are not evenly spaced either. They are placed relative to the five critical values $C_1 > C_2 > C_3 > C_4 = C_5$, the values of $2\\Omega$ at the points themselves, so the curves through the saddles always appear, in heavier ink, with the tadpoles and horseshoes between them:',
        },
        {
          type: 'code',
          code: `function levelsFor(L: LPoints) {
  const [c1, c2, c3, c4] = L.c
  const out: { v: number; kind: 0 | 1 | 2 }[] = []
  const between = (a: number, b: number, n: number) => {
    for (let k = 1; k <= n; k++) out.push({ v: a + ((b - a) * k) / (n + 1), kind: 1 })
  }
  between(c4, c3, 3)              // tadpoles round L4 and L5
  out.push({ v: c3, kind: 2 })    // the curve through L3
  between(c3, c2, 2)              // horseshoes
  out.push({ v: c2, kind: 2 })    // through L2
  if (c1 - c2 > 1e-6) between(c2, c1, 1)
  out.push({ v: c1, kind: 2 })    // the figure eight through L1
  const span = Math.max(0.6, (c1 - c4) * 8)
  for (let k = 1; k <= 9; k++) out.push({ v: c1 + span * Math.pow(k / 9, 1.8), kind: 0 })
  return out
}`,
          caption: 'Contour levels follow the critical values, so the topology reads at any μ.',
        },
        {
          type: 'p',
          text: 'Some twenty thousand segments are too many to restroke every frame, so the plate, the contours and any forbidden-region hatching are rendered once into an offscreen canvas and copied each frame; they are rebuilt only when μ, the frame size or the dropped particle changes. While you drag μ, the grid drops to a coarser resolution so the map can follow your hand, and sharpens again when you let go. The region near the planet is too small to read at the map’s scale, so a detail inset, placed in the largest free area of the page, redraws it on its own Cartesian grid at four or more times the scale.',
        },
        { type: 'h', text: 'The particles' },
        {
          type: 'p',
          text: 'The Coriolis term in (1) depends on velocity, which spoils the simple structure of the leapfrog. So particles are integrated in the *inertial* frame instead, where the only force is gravity from two bodies moving on known circles, and then rotated into the turning frame for drawing:',
        },
        {
          type: 'code',
          code: `for (let k = 0; k < n; k++) {
  // close to the planet: subdivide this step
  const sub = r2s < 0.0025 ? 10 : r2s < 0.01 ? 4 : 1
  const hs = hh / sub
  for (let q = 0; q < sub; q++) {
    p.VX += 0.5 * hs * p.ax       // half kick
    p.VY += 0.5 * hs * p.ay
    p.X += hs * p.VX              // drift
    p.Y += hs * p.VY
    t += hs
    r2s = accelAt(p, t)           // Sun and planet at their positions at time t
    p.VX += 0.5 * hs * p.ax       // half kick
    p.VY += 0.5 * hs * p.ay
  }
  // ...then the trail point, in the turning frame: x = X cos t + Y sin t, …
}`,
          caption: 'Kick-drift-kick with steps of at most 0.005 units, refined near the planet.',
        },
        {
          type: 'p',
          text: 'The check on all of this is the Jacobi constant, which the integrator does not know about. Each particle records its $C$ at birth, and the readout shows the worst drift across the Trojan swarms, typically a few parts in $10^7$ after centuries of simulated time. Trails are sampled by distance travelled in the turning frame rather than by time, so slow Trojans keep a long memory and fast particles near the Sun keep a smooth one.',
        },
        {
          type: 'p',
          text: 'The swarms are seeded at rest in the turning frame, at angles spread around 60° and with a little radial scatter, which is what gives the nested tadpoles; the horseshoe particles start on near-circular orbits a few thousandths inside or outside $r = 1$, spread round the far side. Time runs at different speeds for each beat: about one turn of the frame every six seconds for the saddles, then more than two turns a second for the Trojans, so that a 148-year libration takes a few seconds to watch.',
        },
        { type: 'h', text: 'Webb’s orbit' },
        {
          type: 'p',
          text: 'Chapter IV switches to Sun–Earth, $\\mu = 3.0 \\times 10^{-6}$. The dotted loops around L1 and L2 are not sketched: they are planar Lyapunov orbits, genuine periodic solutions of (1), found by differential correction. Start on the axis at a chosen distance from the point, guess the sideways speed from the linear theory, integrate with fourth-order Runge–Kutta until the path recrosses the axis, and adjust the speed by the secant method until it recrosses at right angles. By symmetry the second half of the orbit is the mirror image of the first.',
        },
        {
          type: 'code',
          code: `let a = kappa * ax * wl          // the linear-theory guess
let b = a * 1.02
let fa = shoot(a, null).vx       // sideways speed where it recrosses the axis
let fb = shoot(b, null).vx
for (let it = 0; it < 24 && Math.abs(fb) > 1e-13 && fb !== fa; it++) {
  const c = b - (fb * (b - a)) / (fb - fa)   // secant step towards vx = 0
  a = b
  fa = fb
  b = c
  fb = shoot(b, null).vx
}`,
          caption: 'Single shooting for a Lyapunov orbit about L1 or L2.',
        },
        {
          type: 'p',
          text: 'Around L2, starting 250,000 km on the Earth side, the orbit reaches about 180,000 km beyond L2 and some 680,000 km to either side, with a period of 180 days. Webb’s real orbit is a three-dimensional halo of comparable size and period; the planar Lyapunov orbit is its flat sibling.',
        },
        { type: 'h', text: 'Sound' },
        {
          type: 'p',
          text: 'The five points arrive as five soft notes; particles slipping off the saddles fall away in short, falling glides; the Trojans enter over a quiet chord; a dropped particle plucks a note pitched by its Jacobi constant.',
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
            '**The plate:** a circular chart of $2\\Omega$ around the barycentre, ticked every 5°. The dashed circle is the planet’s orbit, $r = 1$. The arrow on the rim notes that the frame turns.',
            '**Contours:** heavy ink lines are the critical curves through L1, L2 and L3; lagoon lines lie between the critical values (the tadpole and horseshoe shapes); faint ocean rings are the steep slopes towards the Sun and outward.',
            '**Marks:** registration marks at the five points, labelled saddle or hilltop; dashed equilateral triangles from the Sun and planet to L4 and L5.',
            '**Detail A:** the planet’s neighbourhood redrawn at larger scale, with L1, L2 and the Hill radius.',
            '**Particles:** ocean for the L1 and L2 tests, lagoon for L3, moss for the Trojan swarms, ocean again for horseshoes and for particles you drop. A small ring marks where one was swallowed by the Sun or the planet.',
            '**Hatching:** the forbidden region of the particle you dropped last, bounded by its zero-velocity curve in bold ocean.',
            '**The μ ruler:** a logarithmic scale from $10^{-6}$ to 0.5, with real systems marked and the unstable side beyond Routh’s limit hatched. **Top right:** μ, the critical values, growth rates, the Routh test, libration period, Jacobi drift and elapsed time in years.',
            '**Chapter IV:** Earth, the Moon’s orbit for scale, L1 and L2 at 1.49 and 1.50 million km, the two periodic orbits, SOHO (a small square) and Webb (a hexagon, for its mirror).',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the moment in chapter II when the L1 particles, balanced to a few millionths, all leave at once in different directions; the slow L3 particles creeping sideways rather than falling; the Trojan swarms filling exactly the lagoon tadpoles; and in chapter V, the swarms breaking up as μ passes 0.0385.',
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
            '**Sun–Jupiter, not Sun–Earth.** The main map uses Jupiter’s mass ratio because that is where the Trojans really are, and because at Sun–Earth scale L1 and L2 would sit a few pixels from Earth. The μ ruler and chapter IV cover the other systems.',
            '**Flat and circular.** The model is planar and Jupiter’s orbit is a perfect circle. Real Trojans are inclined, some by more than 30°, Jupiter’s eccentricity is 0.048, and Saturn perturbs everything.',
            '**Halo orbits.** Webb and SOHO fly three-dimensional halo orbits, not the planar Lyapunov orbits drawn, and their real orbits are kept with station-keeping burns.',
            '**Sizes.** The Sun and planet are glyphs, not to scale; particles are removed well outside the planet’s real radius.',
            '**Time.** The simulation runs at different speeds in different chapters, and much faster than real time throughout.',
            '**The hatching** is computed on a grid a quarter of the screen’s resolution, so its edge is soft; the bold zero-velocity curve on top is exact to the contour grid.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Essai sur le problème des trois corps', by: 'Joseph-Louis Lagrange', year: '1772', note: 'Prize essay of the Paris Academy; the equilateral solutions.' },
    { title: 'De motu rectilineo trium corporum se mutuo attrahentium', by: 'Leonhard Euler', year: '1767', note: '*Novi Commentarii Academiae Scientiarum Petropolitanae* 11. The collinear solutions.' },
    { title: 'Theory of Orbits: The Restricted Problem of Three Bodies', by: 'Victor Szebehely', year: '1967', note: 'Academic Press. The classic reference, still.' },
    { title: 'Solar System Dynamics', by: 'Carl D. Murray and Stanley F. Dermott', year: '1999', note: 'Cambridge University Press. Chapter 3: the restricted problem, tadpoles and horseshoes.' },
    { title: 'Dynamical Systems, the Three-Body Problem and Space Mission Design', by: 'Wang Sang Koon, Martin W. Lo, Jerrold E. Marsden and Shane D. Ross', year: '2011', note: 'Marsden Books. Lyapunov and halo orbits, and how missions use them.' },
    { title: 'Analytic construction of periodic orbits about the collinear points', by: 'David L. Richardson', year: '1980', note: '*Celestial Mechanics* 22. The third-order halo approximation used in mission design.' },
    { title: 'Stability of the triangular Lagrangian points', by: 'André Deprit and A. Deprit-Bartholomé', year: '1967', note: '*Astronomical Journal* 72. Nonlinear stability below the Routh limit.' },
  ],
}

export default guide
