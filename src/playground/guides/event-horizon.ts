import type { Guide } from '../guide'

const raysFigure = `<svg viewBox="0 0 420 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="20" y1="120" x2="400" y2="120" stroke-dasharray="12 3 2 3" opacity="0.3"/>
  <circle cx="270" cy="120" r="26"/>
  <path d="M252 102 L288 138 M258 96 L294 132 M246 108 L282 144 M264 92 L298 126 M240 116 L276 150" opacity="0.25"/>
  <circle cx="270" cy="120" r="39" stroke-dasharray="3 4" stroke="#7FB6D9"/>
  <path d="M20 52 L190 52 C235 52 312 60 312 120 C312 170 230 172 232 120 C234 82 300 70 400 66" stroke="#7FB6D9"/>
  <path d="M20 40 L200 40 C260 40 320 34 400 20" opacity="0.6"/>
  <path d="M20 92 L215 92 C240 94 247 99 251 104" opacity="0.6"/>
  <line x1="60" y1="120" x2="60" y2="52" stroke="currentColor"/>
  <path d="M57 58 L60 52 L63 58 M57 114 L60 120 L63 114"/>
  <text x="68" y="90" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">b꜀ = 3√3 M</text>
  <text x="300" y="190" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">HORIZON r = 2M</text>
  <text x="322" y="98" font-family="Geist Mono, monospace" font-size="9" fill="#7FB6D9" stroke="none">r = 3M</text>
  <text x="140" y="34" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">b &gt; b꜀ · BENT</text>
  <text x="120" y="108" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">b &lt; b꜀ · FALLS IN</text>
</svg>`

const planeFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="170" cy="110" r="14"/>
  <circle cx="170" cy="110" r="21" stroke-dasharray="2 3" opacity="0.5"/>
  <line x1="60" y1="134" x2="120" y2="122" stroke-width="2.4" opacity="0.6"/>
  <line x1="220" y1="98" x2="290" y2="84" stroke-width="2.4" opacity="0.6"/>
  <path d="M400 62 L230 62 C190 62 150 66 132 86 C120 100 116 112 112 124" stroke="#3F7A55"/>
  <circle cx="112" cy="124" r="3" fill="#3F7A55" stroke="none"/>
  <path d="M392 58 L400 62 L392 66"/>
  <line x1="170" y1="110" x2="170" y2="62" stroke-dasharray="2 3" opacity="0.5"/>
  <text x="176" y="84" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">b</text>
  <text x="300" y="54" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">TO THE OBSERVER</text>
  <text x="232" y="122" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">DISK PLANE</text>
  <text x="40" y="160" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">CROSSES AT φ₀ + nπ</text>
  <text x="300" y="180" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">THE ORBIT PLANE</text>
</svg>`

const guide: Guide = {
  lede: 'Light falls too. A fan of rays computed in Schwarzschild’s geometry bends past a black hole, circles it, or crosses a line from which nothing returns; then a thin disk of hot gas, seen nearly edge-on, shows its far side lifted into view, and turns toward us into the shadow the Event Horizon Telescope photographed in 2019.',
  facts: [
    ['Geometry', 'Schwarzschild, 1916: a non-rotating mass, with $G = c = 1$ and lengths in units of $M$'],
    ['Photon orbits', '$d^2u/d\\varphi^2 = 3Mu^2 - u$, with $u = 1/r$'],
    ['Event horizon', '$r = 2M$ (2.95 km for the mass of the Sun)'],
    ['Photon sphere', '$r = 3M$'],
    ['Critical impact parameter', '$b_c = 3\\sqrt{3}\\,M \\approx 5.196\\,M$'],
    ['Integrator', 'RK4, step proportional to $r$, Schwarzschild time alongside'],
    ['Disk', 'Thin and Keplerian, $r = 6M$ to $24M$; 32 rings × 3 image orders'],
    ['Light', 'Brightness $\\propto g^4$, colour = a blackbody at $g\\,T(r)$'],
    ['M87*', '$6.5 \\times 10^9$ solar masses at 16.8 Mpc; ring ≈ 42 µas'],
    ['Running time', '76 s in five chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['↑', '↓'], action: 'Tilt the disk (chapters IV–V)' },
      { keys: ['Space'], action: 'Pause or resume' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Chapters I–III: move the light source anywhere around the hole' },
      { gesture: 'tap', action: 'Chapters I–III: fire a single ray toward that point and read its fate' },
      { gesture: 'drag', action: 'Chapters IV–V: drag up or down to tilt the disk, sideways to turn it' },
      { gesture: 'tap', action: 'Chapters IV–V: trace the ray behind any point of the disk' },
      { gesture: 'tap', action: 'Tap or drag the ruler along the bottom to jump in time' },
    ],
    tip: 'Drag the light in close, between the horizon and the dashed photon sphere: almost every ray falls in, and only a narrow cone pointing outward escapes.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [
      { label: 'Tilt ↑', code: 'ArrowUp', aria: 'Tilt the disk toward edge-on' },
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
          text: 'Gravity bends light. That sentence would have puzzled Newton’s contemporaries only a little: in 1783 the English clergyman John Michell, and a few years later Pierre-Simon Laplace, reasoned that if light were made of particles, a star dense enough would have an escape velocity greater than the speed of light, and would be dark. What neither could have guessed is how strange the real thing is. In Einstein’s general relativity, which he completed in November 1915, gravity is not a force at all but the shape of spacetime, and light simply follows the straightest paths that shape allows. Near a compact mass those paths curve so strongly that light can orbit, and inside a certain radius every path, for light and everything else, leads inward.',
        },
        {
          type: 'p',
          text: 'Within weeks of Einstein’s final paper, Karl Schwarzschild, a German astronomer serving as an artillery officer on the Russian front, found the first exact solution of the new field equations: the geometry outside a single, non-rotating, spherical mass. He sent it to Einstein, who presented it to the Prussian Academy in January 1916. Schwarzschild died that May, of an illness contracted at the front. His solution contains a radius, $r = 2GM/c^2$, at which the mathematics seemed to break down. It took the better part of half a century to understand that nothing breaks there: it is an **event horizon**, a one-way surface. David Finkelstein’s coordinates of 1958 made that clear, and the name *black hole* came into wide use in the late 1960s, popularised by John Wheeler.',
        },
        { type: 'h', text: 'Light that bends, and light that circles' },
        {
          type: 'p',
          text: 'The first test was the Sun. Einstein’s theory predicted that starlight grazing the solar limb would be deflected by 1.75 arcseconds, twice what a Newtonian argument gives. During the total eclipse of 29 May 1919, expeditions led by Arthur Eddington to Príncipe and by Andrew Crommelin to Sobral in Brazil photographed the stars around the darkened Sun, and the measured shifts agreed with Einstein rather than Newton. The precision of those plates has been debated ever since, but the result has been confirmed many times, most precisely by radio interferometry, and gravitational lensing is now an everyday tool of astronomy.',
        },
        {
          type: 'p',
          text: 'Close to a black hole the bending stops being small. At one and a half times the horizon radius, $r = 3M$ in the units used here, light can travel in a circle: the **photon sphere**. The orbit is unstable, like a pencil balanced on its tip, so a ray that arrives aimed almost exactly at it winds around once, twice or more before peeling away, either outward or into the hole. A ray aimed with an impact parameter (its sideways offset from the centre) smaller than $b_c = 3\\sqrt{3}\\,M$ falls in; a larger one escapes. That number is the most important one in this piece. It is why a black hole seen against a bright background has a **shadow** about two and a half times wider than its horizon.',
        },
        { type: 'h', text: 'Pictures of the invisible' },
        {
          type: 'p',
          text: 'In 1979 Jean-Pierre Luminet, then at the Paris Observatory, computed what a black hole surrounded by a thin, glowing disk of gas would look like, and drew the result by hand in ink from the computer’s output: the near side of the disk passing in front, the far side bent up over the top of the shadow and, because light also passes underneath the hole, a second image of the far side below it. In 2014 the film *Interstellar* rendered the same geometry for a spinning hole, with the physicist Kip Thorne working alongside the visual-effects team at Double Negative; their paper in *Classical and Quantum Gravity* (2015) describes the method. The film deliberately left out the Doppler shifts and beaming a real disk would show, so that audiences would not be confused by a lopsided image. This piece keeps them in.',
        },
        {
          type: 'p',
          text: 'Then, on 10 April 2019, the Event Horizon Telescope collaboration released the first image of a black hole: the supermassive one at the centre of the galaxy M87, 55 million light-years away, with six and a half billion times the mass of the Sun. The data had been taken in April 2017 by radio dishes from Hawaii to the South Pole acting together as one telescope the size of the Earth. The image is a ring of light about 42 microarcseconds across, brighter on its southern side, around a dark centre. In May 2022 the same collaboration published an image of Sagittarius A*, the four-million-solar-mass hole at the centre of our own galaxy. Both rings are the size Schwarzschild’s geometry predicts.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'The geometry of falling light',
      blocks: [
        {
          type: 'p',
          text: 'Outside a non-rotating mass $M$, in units where Newton’s constant and the speed of light are both 1, the Schwarzschild metric is:',
        },
        { type: 'math', tex: 'ds^2 = -\\left(1 - \\frac{2M}{r}\\right) dt^2 + \\left(1 - \\frac{2M}{r}\\right)^{-1} dr^2 + r^2\\, d\\Omega^2', label: '(1)' },
        {
          type: 'p',
          text: 'Here $t$ is the time kept by a distant observer, $r$ is defined so that a sphere at radius $r$ has area $4\\pi r^2$, and $d\\Omega^2$ is the angular part. Because the geometry does not change in time and has no preferred direction, a photon has a conserved energy $E$ and angular momentum $L$, and moves in a plane. Their ratio is the impact parameter, $b = L/E$: the distance by which the ray would miss the centre if it were not bent. For light $ds^2 = 0$, and with $\\lambda$ an affine parameter along the ray, the radial motion obeys:',
        },
        { type: 'math', tex: '\\left(\\frac{dr}{d\\lambda}\\right)^2 = E^2 - \\frac{L^2}{r^2}\\left(1 - \\frac{2M}{r}\\right)', label: '(2)' },
        {
          type: 'p',
          text: 'Using $d\\varphi/d\\lambda = L/r^2$ to trade $\\lambda$ for the angle $\\varphi$ around the hole, and writing $u = 1/r$, this becomes $(du/d\\varphi)^2 = 1/b^2 - u^2 + 2Mu^3$. Differentiating once more removes the constant and gives the equation every ray in the piece obeys:',
        },
        { type: 'math', tex: '\\frac{d^2u}{d\\varphi^2} = 3Mu^2 - u', label: '(3)', caption: 'Without the $3Mu^2$ term this is $u = \\sin\\varphi / b$, a straight line. The extra term is all of the bending.' },
        {
          type: 'p',
          text: 'The quantity $(1 - 2M/r)/r^2$ in (2) acts like a potential barrier. It peaks at $r = 3M$, where its value is $1/(27M^2)$. A ray with $1/b^2$ above the peak passes over it and falls in; one below it turns around and escapes; one exactly at the peak can circle forever at $r = 3M$. Setting $1/b^2 = 1/(27M^2)$ gives the critical impact parameter:',
        },
        { type: 'math', tex: 'b_c = \\sqrt{27}\\,M = 3\\sqrt{3}\\,M \\approx 5.196\\,M', label: '(4)' },
        { type: 'h', text: 'Weak and strong bending' },
        {
          type: 'p',
          text: 'Far from the hole the total deflection of a ray is small, $\\alpha \\approx 4M/b$, which for the Sun’s mass and radius gives the 1.75 arcseconds of 1919. Near the critical value the deflection grows without limit, but only logarithmically:',
        },
        { type: 'math', tex: '\\alpha(b) \\approx -\\ln\\!\\left(\\frac{b}{b_c} - 1\\right) + \\text{const}, \\qquad b \\to b_c^{+}', label: '(5)' },
        {
          type: 'p',
          text: 'Each extra turn around the hole costs $2\\pi$ in deflection, so it needs $b$ to be closer to $b_c$ by a factor of $e^{2\\pi} \\approx 535$. That is why the ray in chapter III, which circles exactly once, must arrive within about a thousandth of $b_c$; the readout shows the value found, about $b_c(1 + 1.3 \\times 10^{-3})$. It is also why, in the image of a disk, the second and third images of everything crowd into thinner and thinner rings at the edge of the shadow.',
        },
        { type: 'figure', svg: raysFigure, alt: 'Rays approaching a black hole from the left: one above the critical impact parameter bends past, one below falls in, and one just above it circles the photon sphere once.', caption: 'The critical impact parameter separates light that bends from light that falls. A ray just outside it circles the photon sphere.' },
        { type: 'h', text: 'Time near the horizon' },
        {
          type: 'p',
          text: 'Along a ray, the distant observer’s time advances as $dt/d\\lambda = E/(1 - 2M/r)$. Light climbing out of a deep potential is delayed, an effect Irwin Shapiro proposed in 1964 and measured with radar echoes from Venus and Mercury. At the horizon the factor diverges: by the distant clock, light approaching $r = 2M$ takes forever to arrive. The ray itself crosses in a finite affine distance, and nothing special happens to it there, but no signal from beyond can ever reach outside. The pale blue lines in chapters I–III are drawn at equal intervals of this distant time, so they dent behind the hole and pile up on the horizon without crossing it.',
        },
        { type: 'h', text: 'A disk, seen from far away' },
        {
          type: 'p',
          text: 'For the second view, put a distant observer at inclination $i$ to the axis of a thin disk in the equatorial plane. A point on the observer’s image has polar coordinates $(b, \\psi)$: its distance from the centre is the impact parameter of the ray that arrives there. Traced backward, that ray moves in its own plane through the hole. Measuring $\\varphi$ from the direction of the observer, it crosses the disk plane wherever:',
        },
        { type: 'math', tex: '\\cos\\varphi\\,\\cos i + \\sin\\varphi\\,\\sin\\psi\\,\\sin i = 0 \\quad\\Rightarrow\\quad \\varphi_n = \\varphi_0 + n\\pi', label: '(6)' },
        {
          type: 'p',
          text: 'The first crossing, $n = 0$, gives the direct image; $n = 1$ is light that has gone half a turn further around the hole, which is where the lifted far side and the image underneath come from; $n = 2$ is fainter and thinner still. Solving (3) for the ray’s $u$ at $\\varphi_n$ tells you which radius of the disk that pixel sees.',
        },
        {
          type: 'p',
          text: 'Gas in the disk orbits at the Keplerian rate $\\Omega = \\sqrt{M/r^3}$, at speeds up to half the speed of light near the inner edge. Its light reaches the observer shifted by the factor $g = \\nu_{\\text{obs}} / \\nu_{\\text{emit}}$, which combines the gravitational redshift with the Doppler shift. If $\\alpha = b\\cos\\psi$ is the image coordinate across the projected axis, the photon’s angular momentum about the disk axis is $-\\alpha \\sin i$, and for a circular orbit in Schwarzschild:',
        },
        { type: 'math', tex: 'g = \\frac{\\sqrt{1 - 3M/r}}{1 + \\Omega\\,\\alpha \\sin i}, \\qquad I_{\\text{obs}} = g^4\\, I_{\\text{emit}}', label: '(7)' },
        {
          type: 'p',
          text: 'The fourth power comes from the invariance of $I_\\nu/\\nu^3$ along a ray, integrated over frequency. On the side moving toward us $g$ can exceed 1.2 and the gas looks bluer and several times brighter; on the receding side it can fall below 0.6. This is **Doppler beaming**, and it is why the EHT ring is lopsided.',
        },
        {
          type: 'p',
          text: 'Finally, the shadow. Every ray with $b < b_c$ that does not meet glowing gas on the way in ends on the horizon, so the observer sees a dark disk of angular radius $b_c$ divided by the distance. For M87*, $GM/c^2$ at 16.8 megaparsecs subtends about 3.8 microarcseconds, so the shadow’s diameter, $2\\sqrt{27}$ times that, is about 40 microarcseconds. The EHT measured a ring of $42 \\pm 3$ µas.',
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
          text: 'Event Horizon is a single TypeScript module drawing to one canvas with the Canvas 2D API. The film is a function of time $T$ between 0 and 76 seconds, so it can be scrubbed and seeked; the only state that accumulates is what you add: a moved light, rays you fire, a tilt you set. Everything is computed in units of $M$ and converted to pixels at the last moment.',
        },
        { type: 'h', text: 'Integrating the fan' },
        {
          type: 'p',
          text: 'Equation (3) is awkward for rays that start at a finite point heading in an arbitrary direction, which the movable light needs. There is a neat equivalence: the same orbits are traced by a Newtonian particle under an inverse-fifth-power force, $\\vec{a} = -3L^2\\,\\vec r / r^5$ (with $M = 1$), where the acceleration is taken with respect to the affine parameter $\\lambda$ and $L$ is the conserved angular momentum. The piece integrates that in Cartesian coordinates with classical fourth-order Runge–Kutta, stepping in proportion to the radius and more finely just above the horizon, and adds up Schwarzschild time as it goes:',
        },
        {
          type: 'code',
          code: `// Euclidean speed for unit energy: |v|² (1 − (2/r) sin²α) = 1
const sinA = (x * ny - y * nx) / r
const sp = 1 / Math.sqrt(Math.max(1e-6, 1 - (2 / r) * sinA * sinA))
let vx = nx * sp
let vy = ny * sp
const L = x * vy - y * vx          // the impact parameter, since E = 1
const k = 3 * L * L
const ax = (px: number, py: number) => {
  const r2 = px * px + py * py
  return -k / (r2 * r2 * Math.sqrt(r2))   // a = −3L² r⃗ / r⁵
}
while (n < MAXP) {
  let h = Math.min(1, 0.035 * r)
  if (r < 3) h = Math.min(h, Math.max(2e-5, 0.3 * (r - 2)))
  // … four RK4 stages on (x, y, vx, vy) …
  // Schwarzschild coordinate time: dt = dλ / (1 − 2/r), midpoint rule
  const rm = Math.max(2.00001, 0.5 * (r + rn))
  t += h / (1 - 2 / rm)
  if (r < 2.0002) { fate = 1; break }       // crossed the horizon
  if (r > rmax && x * vx + y * vy > 0) break // gone, outward
}`,
          caption: 'From `trace()`. The speed factor makes the photon’s energy exactly 1, so $L$ is the true impact parameter even for a ray that starts close to the hole.',
        },
        {
          type: 'p',
          text: 'Each ray is stored in a pool of typed arrays (positions, times, fate, total turning, closest approach), 104 slots of up to 1,500 points, so moving the light re-traces about fifty rays per frame without allocating. Parallel starlight is a fan of 47 rays across the view, plus eight more just inside and just outside $\\pm b_c$, 2.5 and 0.3 per cent away from it, so the photon sphere fills with near-misses. The ray that circles exactly once is found by bisection on the impact parameter until its velocity has turned through exactly $2\\pi$.',
        },
        {
          type: 'p',
          text: 'The pale blue wavefronts are isochrones. For each multiple of $3M$ of distant time, the piece finds, on every ray, the point where that time is reached (a binary search on the ray’s time array), and joins neighbouring rays. A ray that has fallen in contributes its last point, frozen on the horizon. The segments are sorted by distance from the hole into three brightness bins, so the fronts fade outward and the strong field stays the subject.',
        },
        { type: 'h', text: 'Ray-tracing the disk by inverse mapping' },
        {
          type: 'p',
          text: 'The disk view needs, for every point of the image, the place on the disk it sees. Rather than trace one ray per pixel, the piece solves equation (3) once for 210 impact parameters, from deep inside the shadow to about $48M$, packed densely around $b_c$ as $b = b_c(1 \\pm 10^{-q})$, and stores each orbit as a table $u(\\varphi)$ up to $3\\pi$. Any ray in any direction is one of these, rotated into its own plane, so a lookup and an interpolation replace an integration.',
        },
        {
          type: 'p',
          text: 'The disk is drawn as **isoradials**, the images of its rings, which is how Luminet drew it in 1979. For each image angle $\\psi$, each order $n$ and each of 32 ring radii, the piece finds the impact parameter at which the ray’s crossing radius equals the ring’s, by binary search through the table:',
        },
        {
          type: 'code',
          code: `for (let j = 0; j < NPSI; j++) {
  const sp = SIN_PSI[j]
  // first crossing of the disk plane: cos φ cos i + sin φ sin ψ sin i = 0
  const phi0 = Math.atan2(-ci, sp * si) + Math.PI
  for (let n = 0; n < ORD; n++) {
    const phi = phi0 + n * Math.PI
    for (let k = 0; k < NRING; k++) {
      const r = RINGS[k]
      const b = solveB(phi, 1 / r)          // which ray lands on this ring
      if (b < 0) { IA[idx] = NaN; continue }
      if (n > 0) {
        // an opaque disk hides the higher-order images behind it
        const u0 = crossU(b, phi0)
        const r0 = u0 > 0 ? 1 / u0 : 1e9
        if (r0 >= RIN && r0 <= rv + 1) { IA[idx] = NaN; continue }
      }
      const al = b * COS_PSI[j]
      IA[idx] = al
      IB[idx] = b * sp
      IG[idx] = Math.sqrt(1 - 3 / r) / (1 + Math.pow(r, -1.5) * al * si)
    }
  }
}`,
          caption: 'From `buildDisk()`, trimmed. It reruns only when the inclination changes; otherwise the curves are cached.',
        },
        {
          type: 'p',
          text: 'Each short segment of each curve gets a brightness, $g^4$ times a flux profile that peaks a little outside the inner edge, and a colour, the blackbody chromaticity at $g\\,T(r)$ from the shared colour module. Brightness is normalised to the brightest segment in view and gently compressed, and the segments are counting-sorted into 140 bins of colour and brightness and stroked with additive blending, which is honest here: light from overlapping rings does add. A darker wash goes down under this view so warm hairlines read as warm.',
        },
        { type: 'figure', svg: planeFigure, alt: 'A ray from the observer bends around the hole within its own orbit plane and meets the line where the disk crosses that plane.', caption: 'Every pixel’s ray lives in a plane through the hole. It sees the disk where it crosses the disk’s line in that plane, at $\\varphi_0$, $\\varphi_0 + \\pi$, and so on.' },
        {
          type: 'p',
          text: 'Tapping the disk runs the same mapping in reverse for one point: it finds the first order whose crossing lands on glowing gas and draws that ray in its own plane in a small inset, from the observer to the disk, with its radius and shift. The transition between the two views is a camera move: the shadow grows out of the horizon at the start of chapter IV and shrinks back into it at the end, while the inclination eases from 84° to 17° and the image turns so the bright side is at the bottom, as in the EHT image.',
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
            '**Hatched circle:** the event horizon, $r = 2M$. **Dashed blue circle:** the photon sphere, $r = 3M$. **Chain-dotted lines:** the axes through the hole, as on an engineering drawing.',
            '**White hairlines:** rays of light. Rays bent through more than about 60° are drawn fainter, so the fan stays legible. In chapter II, rays that fall in turn sage.',
            '**Blue lines across the rays:** wavefronts, drawn at equal steps of the distant observer’s time. They lag behind the hole and freeze on the horizon.',
            '**White dots during the arrival:** the leading photons of the first wavefront.',
            '**Hatched band (chapter II):** every ray that enters it, $|b| < 3\\sqrt{3}\\,M$, falls in. Its width is the width of the shadow.',
            '**Blue ray (chapter III):** the ray whose deflection is exactly $2\\pi$. Readouts give its impact parameter, the number of loops and its closest approach, just above $3M$.',
            '**Warm ray:** a ray you fired. Its fate appears where it ends: fell in, escaped and bent by so many degrees, or circled and escaped.',
            '**Disk curves:** isoradials, the images of rings from $6M$ to $24M$, coloured by observed temperature and weighted by $g^4$. Labels mark the near side, the far side bent over the top, and the far side seen underneath.',
            '**Dashed circle around the shadow:** the critical curve, $b = 3\\sqrt{3}\\,M$, where the photon ring lies. **Dimension (chapter V):** the shadow’s diameter, about 40 µas at the mass and distance of M87*.',
            '**Bottom ruler:** the 76-second timeline with the five chapters. Tap or drag it to jump.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: in chapter I, the wavefront wrapping around behind the hole and closing on itself, which is the origin of the extra images; in chapter III, how long the blue photon lingers on the photon sphere before it leaves; and in chapter V, the moment the edge-on disk has tilted far enough that the lifted far side and the lower image merge into a single ring.',
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
            '**No spin.** Real black holes almost certainly rotate, and M87* probably rotates quickly. A Kerr black hole’s shadow is slightly flattened and shifted, and frame dragging adds its own asymmetry. The Schwarzschild shadow differs from a Kerr one by only a few per cent, which is why the EHT result is a strong test of general relativity but a weak measure of spin.',
            '**A textbook disk.** The disk is infinitely thin, Keplerian, and stops at the innermost stable orbit, with a flux profile shaped like, but simpler than, the Novikov–Thorne disk. The gas around M87* is hot, thick and much fainter than a quasar disk, and the EHT sees it at 1.3 mm, blurred by a resolution of about 20 µas. Chapter V borrows the image’s geometry, scale and lopsidedness, not its physics in detail.',
            '**Orientation chosen.** M87*’s jet points about 17° from our line of sight, so the piece tilts to 17°, and the image is turned so the bright side is at the bottom, as observed. The direction of the disk’s rotation on the sky is a choice.',
            '**A plane of rays.** Chapters I–III show light in one plane through the hole. The light around a real hole arrives from every direction.',
            '**Which clock.** The wavefronts use the distant observer’s time, which is why they stop at the horizon. In the ray’s own terms nothing stops there; the drawing chooses the outsider’s view on purpose.',
            '**Brightness as line weight.** A line drawing cannot show surface brightness directly. The piece maps $g^4$ times the flux to line opacity, compressed and normalised per frame, and compressed images such as the photon ring look brighter because their lines crowd together.',
            '**2019.** The image was announced in April 2019; the observations behind it were made in April 2017.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Über das Gravitationsfeld eines Massenpunktes nach der Einsteinschen Theorie', by: 'Karl Schwarzschild', year: '1916', note: '*Sitzungsberichte der Königlich Preussischen Akademie der Wissenschaften*. The solution itself.' },
    { title: 'A Determination of the Deflection of Light by the Sun’s Gravitational Field, from Observations Made at the Total Eclipse of May 29, 1919', by: 'F. W. Dyson, A. S. Eddington & C. Davidson', year: '1920', note: '*Philosophical Transactions of the Royal Society A* 220.' },
    { title: 'Fourth Test of General Relativity', by: 'Irwin I. Shapiro', year: '1964', note: '*Physical Review Letters* 13. The time delay of light near a mass.' },
    { title: 'Image of a spherical black hole with thin accretion disk', by: 'Jean-Pierre Luminet', year: '1979', note: '*Astronomy and Astrophysics* 75. The first picture, and the isoradials used here.' },
    { title: 'Gravitational lensing by spinning black holes in astrophysics, and in the movie Interstellar', by: 'Oliver James, Eugénie von Tunzelmann, Paul Franklin & Kip S. Thorne', year: '2015', note: '*Classical and Quantum Gravity* 32.' },
    { title: 'The Science of Interstellar', by: 'Kip Thorne', year: '2014', note: 'W. W. Norton. A physicist’s account of the film’s black hole.' },
    { title: 'First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole', by: 'The Event Horizon Telescope Collaboration', year: '2019', note: '*The Astrophysical Journal Letters* 875, L1.' },
    { title: 'First Sagittarius A* Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole in the Center of the Milky Way', by: 'The Event Horizon Telescope Collaboration', year: '2022', note: '*The Astrophysical Journal Letters* 930, L12.' },
    { title: 'Gravitation', by: 'Charles W. Misner, Kip S. Thorne & John Archibald Wheeler', year: '1973', note: 'W. H. Freeman. The standard text; orbits of light and matter around a Schwarzschild mass are treated in detail.' },
    { title: 'The Mathematical Theory of Black Holes', by: 'Subrahmanyan Chandrasekhar', year: '1983', note: 'Oxford University Press. Null geodesics treated in full.' },
  ],
}

export default guide
