import type { Guide } from '../guide'

const triangleFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="40" y1="40" x2="380" y2="40" opacity="0.5"/>
  <line x1="40" y1="160" x2="380" y2="160" opacity="0.5"/>
  <line x1="70" y1="160" x2="250" y2="40" stroke="#2B6A93" stroke-width="1.4"/>
  <line x1="250" y1="40" x2="380" y2="126" stroke="#2B6A93" stroke-dasharray="3 3" opacity="0.6"/>
  <line x1="70" y1="160" x2="250" y2="160" stroke="#3F7A55"/>
  <line x1="250" y1="160" x2="250" y2="40" stroke="#3F7A55"/>
  <path d="M240 160 L240 150 L250 150" stroke="#3F7A55"/>
  <circle cx="70" cy="160" r="3" fill="#2B6A93" stroke="none"/>
  <circle cx="250" cy="40" r="3" fill="#2B6A93" stroke="none"/>
  <g font-family="Geist Mono, monospace" font-size="10" fill="currentColor" stroke="none" letter-spacing="1">
    <text x="112" y="92" fill="#2B6A93">ct</text>
    <text x="150" y="178" fill="#3F7A55">vt</text>
    <text x="258" y="104" fill="#3F7A55">ct′ = L</text>
    <text x="44" y="32" opacity="0.6">MIRROR</text>
    <text x="300" y="32" opacity="0.6">MIRROR</text>
    <text x="40" y="194" opacity="0.7">(ct)² = (vt)² + (ct′)²   ⇒   t = γ t′</text>
  </g>
</svg>`

const twinsFigure = `<svg viewBox="0 0 420 240" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="40" y1="220" x2="400" y2="220" opacity="0.5"/>
  <line x1="120" y1="220" x2="120" y2="20" stroke-width="1.4"/>
  <polyline points="120,220 280,120 120,20" stroke="#2B6A93" stroke-width="1.4"/>
  <polyline points="20,120 120,220 220,120" stroke="#6F952F" opacity="0.7"/>
  <polyline points="20,120 120,20 220,120" stroke="#6F952F" opacity="0.7"/>
  <line x1="120" y1="184" x2="280" y2="120" stroke="#2B6A93" stroke-dasharray="2 3" opacity="0.6"/>
  <line x1="120" y1="56" x2="280" y2="120" stroke="#2B6A93" stroke-dasharray="2 3" opacity="0.6"/>
  <line x1="108" y1="184" x2="108" y2="56" stroke="#3F7A55" stroke-width="2"/>
  <g font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">
    <text x="126" y="214">HOME</text>
    <text x="210" y="160" fill="#2B6A93">TRAVELLER</text>
    <text x="290" y="124" fill="#2B6A93">TURN</text>
    <text x="20" y="124" fill="#6F952F" opacity="0.9">45°</text>
    <text x="30" y="96" fill="#3F7A55">SWEPT PAST</text>
    <text x="300" y="214" opacity="0.6">x</text>
    <text x="126" y="30" opacity="0.6">ct</text>
  </g>
</svg>`

const guide: Guide = {
  lede: 'A clock made of a single flash of light bouncing between two mirrors. Set it moving and, seen from the platform, the light has farther to go on every tick, at the same speed; so the moving clock runs slow, and a twin who travels comes home younger.',
  facts: [
    ['Phenomenon', 'Time dilation, from Einstein’s special relativity (1905)'],
    ['The clock', 'Mirrors 1 m apart; one tick 2L/c = 6.67 ns, shown 240 million times slower'],
    ['Factor', '$\\gamma = 1/\\sqrt{1 - \\beta^2}$, with $\\beta = v/c$'],
    ['Twins', '10 years at home; $10/\\gamma$ for the traveller (6 years at β = 0.8)'],
    ['Diagram', 'Minkowski, 1908: light cones at 45°, proper time on hyperbolae'],
    ['GPS', '−7.2 μs/day for speed, +45.7 μs/day for height, net +38.5 μs/day'],
    ['Uncorrected', 'About 11.5 km of position error a day'],
    ['Running time', '90 s in four chapters'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Previous or next chapter' }],
    gestures: [
      { gesture: 'drag', action: 'Drag the β slider to set the train’s (or the traveller’s) speed' },
      { gesture: 'tap', action: 'In the twins chapter, tap to send the traveller again at the slider’s speed' },
      { gesture: 'move', action: 'Hover the spacetime diagram to read proper time along either world line' },
    ],
    tip: 'Turn the sound on in chapter II: the low note is the platform’s clock and the high note the train’s. At β = 0.866 the train’s note comes exactly half as often.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Moving clocks run slow',
      blocks: [
        {
          type: 'p',
          text: 'In June 1905 Albert Einstein, a patent examiner in Bern, sent the *Annalen der Physik* a paper titled “On the Electrodynamics of Moving Bodies”. It rested on two statements. The first is the *principle of relativity*: the laws of physics are the same for every observer moving at constant velocity, so no experiment inside a smoothly moving train can tell you whether the train is moving. The second is that light in empty space always travels at the same speed $c$, about 299,792 km per second, whatever the motion of its source. Each statement sounds harmless. Together they force a conclusion that sounded absurd: two observers in relative motion cannot agree on how much time has passed between two events.',
        },
        {
          type: 'p',
          text: 'The cleanest way to see why is a clock with no gears at all, a flash of light bouncing between two parallel mirrors. Each round trip is one tick. Mirrors one metre apart give a tick of $2L/c = 6.67$ nanoseconds, and the clock is perfect by construction: its rate depends only on the distance between the mirrors and the speed of light. This thought experiment does not appear in Einstein’s 1905 paper; it is usually traced to Gilbert Lewis and Richard Tolman in 1909, and it has been the standard first lesson in relativity ever since.',
        },
        { type: 'h', text: 'The clock on the train' },
        {
          type: 'p',
          text: 'Put the clock on a train with its mirrors one above the other, and let the train pass a platform at speed $v$. To a passenger nothing has changed: the light goes straight up and down and the clock ticks every 6.67 ns, as relativity’s first principle demands. But someone on the platform sees the bottom mirror move along while the light is in flight, so the light must travel on a diagonal to meet the top mirror, and another diagonal back down. The path is a zigzag, longer than the straight up-and-down. By the second principle the light still travels it at $c$. A longer path at the same speed takes longer, so as judged from the platform each tick of the moving clock lasts longer than a tick of an identical clock at rest. The moving clock runs slow, by a factor $\\gamma$ that the right triangle gives exactly.',
        },
        {
          type: 'p',
          text: 'Nothing here is special to light clocks. If the light clock on the train ran slow but the passenger’s wristwatch did not, the passenger could compare them and detect the train’s motion from inside, which the first principle forbids. So every clock on the train, mechanical, atomic or biological, runs slow by the same factor. Time itself, measured from the platform, passes more slowly on the train.',
        },
        { type: 'h', text: 'The evidence' },
        {
          type: 'p',
          text: 'The effect is real and has been measured many times. Muons, unstable particles made by cosmic rays high in the atmosphere, live on average 2.2 microseconds at rest, long enough to travel only about 660 m at nearly the speed of light. Yet far more of them reach the ground than that allows. Bruno Rossi and David Hall measured the effect in 1941; David Frisch and James Smith filmed the classic version in 1963, counting muons on Mount Washington and at sea level and finding that the muons’ clocks ran slow by a factor of about nine. At CERN in the 1970s, muons circulating in a storage ring at $\\gamma \\approx 29$ were found to live about 29 times longer than at rest, in agreement with relativity to about one part in a thousand.',
        },
        {
          type: 'p',
          text: 'In October 1971 Joseph Hafele and Richard Keating flew four caesium atomic clocks around the world on commercial airliners, once eastward and once westward, and compared them with clocks at the US Naval Observatory. The clocks flown east lost about 59 ns and those flown west gained about 273 ns, in agreement, within the errors, with the predictions of special and general relativity together.',
        },
        { type: 'h', text: 'The twins' },
        {
          type: 'p',
          text: 'In 1911 Paul Langevin dramatised the effect as a journey. One twin stays on Earth; the other travels to a star and back at high speed. On reunion the traveller is younger. This seems to contradict relativity itself: from the traveller’s point of view it is Earth that moved away and came back, so should the Earth twin not be the younger? The answer is that the two twins are not in equivalent situations. The stay-at-home twin is in one inertial frame for the whole story. The traveller is not: to come home, they must turn round, and in doing so they change from the frame moving outward to a frame moving inward. That change of frames is where the asymmetry lies, and Minkowski’s geometry makes it visible.',
        },
        {
          type: 'p',
          text: 'In 1908 Hermann Minkowski, who had taught Einstein mathematics in Zurich, recast relativity as geometry. Time and space together form a four-dimensional *spacetime*, and every object traces a *world line* through it. Draw one direction of space across the page and time ($ct$, so that both axes are in metres or light-years) up the page; light then runs at 45°, and nothing can travel faster, so every world line climbs more steeply than 45°. The time a clock records, its *proper time*, is a kind of length along its world line, measured with a geometry in which the straight line between two events is the *longest* path, not the shortest. The stay-at-home twin’s world line is straight; the traveller’s is bent. The bent one is shorter, in time.',
        },
        { type: 'h', text: 'Your phone' },
        {
          type: 'p',
          text: 'The Global Positioning System is relativity in daily use. Each satellite carries atomic clocks and broadcasts the time; a receiver works out its distance from several satellites from the delays of their signals, and so its position. Light travels 30 cm in a nanosecond, so the clocks must agree to within a few nanoseconds. The satellites orbit about 20,200 km above the ground at about 3.9 km/s. Their speed makes their clocks run slow by about 7.2 μs a day (special relativity). But they are also higher in the Earth’s gravity, where, according to general relativity, clocks run fast, by about 45.7 μs a day. The net effect is that a satellite clock gains about 38.5 μs a day on a clock on the ground. Left uncorrected, that would add up to an error of more than 11 km in a single day. So the clocks are deliberately built to tick slow before launch, at 10.22999999543 MHz instead of 10.23 MHz, and the receiver in your phone applies a further small correction for each satellite’s slightly elliptical orbit.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'One triangle, one interval',
      blocks: [
        { type: 'h', text: 'The light clock' },
        {
          type: 'p',
          text: 'Let the mirrors be a distance $L$ apart and the train move at speed $v$. In the train’s frame, one trip from mirror to mirror takes $t\' = L/c$. In the platform’s frame it takes some time $t$, during which the light travels a distance $ct$ along the diagonal while the clock moves $vt$ along the track. The mirror separation is perpendicular to the motion and is the same in both frames, so the three distances form a right triangle:',
        },
        { type: 'math', tex: '(ct)^2 = (vt)^2 + (ct\')^2', label: '(1)' },
        { type: 'figure', svg: triangleFigure, alt: 'Two horizontal mirrors with a light path running diagonally from the bottom mirror to the top one, forming a right triangle with legs vt along the mirror and ct prime across the gap, and hypotenuse ct.', caption: 'One mirror-to-mirror run of the moving clock, as seen from the platform: the triangle the piece draws and dimensions in chapter II.' },
        {
          type: 'p',
          text: 'Solving for $t$, with $\\beta = v/c$:',
        },
        { type: 'math', tex: 't = \\frac{t\'}{\\sqrt{1 - v^2/c^2}} = \\gamma\\, t\', \\qquad \\gamma = \\frac{1}{\\sqrt{1 - \\beta^2}}', label: '(2)' },
        {
          type: 'p',
          text: '$t\'$ is the *proper time* of the tick, measured by the clock itself; $t$ is the same tick timed by the platform’s clocks; and the Lorentz factor $\\gamma$ is always at least 1. It barely differs from 1 at everyday speeds (a jet at 250 m/s has $\\gamma - 1 \\approx 3.5\\times 10^{-13}$), and grows without limit as $v$ approaches $c$.',
        },
        {
          type: 'table',
          head: ['β = v/c', 'γ', 'One tick, seen from the platform'],
          rows: [
            ['0', '1.000', '6.67 ns'],
            ['0.6', '1.250', '8.34 ns'],
            ['0.8', '1.667', '11.12 ns'],
            ['0.866', '2.000', '13.34 ns'],
            ['0.99', '7.089', '47.3 ns'],
          ],
          caption: 'The speeds the piece visits. At β = 0.866 the moving clock ticks exactly half as often.',
        },
        {
          type: 'p',
          text: 'Lengths along the motion shrink by the same factor: an object of rest length $\\ell_0$ moving along its length measures $\\ell_0/\\gamma$ from the platform. That is why the carriage is drawn shorter as it speeds up, while its height, and the mirrors’ separation, stay the same.',
        },
        { type: 'h', text: 'Proper time and the interval' },
        {
          type: 'p',
          text: 'A clock moving with a varying speed $v(t)$ accumulates proper time at the rate $d\\tau = dt/\\gamma(t)$, so along any world line',
        },
        { type: 'math', tex: '\\tau = \\int \\sqrt{1 - \\frac{v(t)^2}{c^2}}\\; dt', label: '(3)' },
        {
          type: 'p',
          text: 'Between two events separated by $\\Delta t$ and $\\Delta x$, every inertial observer agrees on the *interval* $s^2 = c^2\\Delta t^2 - \\Delta x^2$, although they disagree about $\\Delta t$ and $\\Delta x$ separately. For a clock that travels straight from one event to the other, $s/c$ is exactly its proper time. The events a clock can reach after one year of its own time therefore lie on the hyperbola $c^2t^2 - x^2 = (1\\ \\text{light-year})^2$, which is why the traveller’s yearly ticks in chapter III sit on the faint hyperbolae, farther up the page than the home twin’s.',
        },
        { type: 'h', text: 'The twins in numbers' },
        {
          type: 'p',
          text: 'Let the traveller go out at $\\beta = 0.8$ for 5 years of Earth time, reaching a point 4 light-years away, and return the same way. Earth’s clock records 10 years. With $\\gamma = 5/3$, each leg takes the traveller $5/\\gamma = 3$ years, so the traveller’s clock records 6. During each leg the traveller, using their own frame, also sees the Earth clock running slow, by the same factor: a symmetry that is perfectly real. The two views are reconciled by *simultaneity*. In the outbound frame, the events simultaneous with the turnaround include Earth at year 1.8; in the inbound frame, Earth at year 8.2. Changing frames at the turn swings the line of simultaneity across 6.4 years of Earth’s history, $10\\beta^2$ in general. Add $1.8 + 6.4 + 1.8$ and the traveller’s accounting reaches 10 years too.',
        },
        { type: 'figure', svg: twinsFigure, alt: 'A spacetime diagram: the home world line straight up, the traveller going out and back at an angle, light cones at 45 degrees, and two dashed lines of simultaneity from the turnaround meeting the home line far apart.', caption: 'At the turn the traveller’s line of simultaneity swings from one dashed line to the other, sweeping past the stretch of Earth time marked in moss.' },
        {
          type: 'p',
          text: 'A second check uses only light. Suppose Earth sends a signal every year. Outbound, the traveller receives them stretched by the relativistic Doppler factor $\\sqrt{(1+\\beta)/(1-\\beta)} = 3$: one signal in their three years. Inbound they arrive compressed by the same factor: nine signals in three years. Ten in all, received over six years of the traveller’s life.',
        },
        { type: 'h', text: 'GPS' },
        {
          type: 'p',
          text: 'For a circular orbit of radius $a$ about a mass $M$, the orbital speed is $v = \\sqrt{GM/a}$. Compared with a clock on the ground at radius $R_E$, a satellite clock runs at a fractional rate',
        },
        { type: 'math', tex: '\\frac{\\Delta f}{f} \\approx -\\frac{v^2}{2c^2} + \\frac{GM}{c^2}\\left(\\frac{1}{R_E} - \\frac{1}{a}\\right)', label: '(4)' },
        {
          type: 'p',
          text: 'With $GM = 3.986\\times10^{14}$ m³/s², $a = 26{,}562$ km and $R_E = 6{,}371$ km, the first term is $-8.35\\times10^{-11}$ and the second $+5.29\\times10^{-10}$. Multiplied by the 86,400 seconds in a day they give −7.2 μs and +45.7 μs, net +38.5 μs. Light covers 11.5 km in 38.5 μs. The figure used in the system itself, $\\Delta f/f = -4.4647\\times10^{-10}$, is slightly different because it refers the ground clock to the Earth’s rotating geoid rather than to a still, spherical Earth, but the story is the same.',
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'How the piece works',
      title: 'Computing in the platform’s frame',
      blocks: [
        {
          type: 'p',
          text: 'Light Clock is one TypeScript module on one canvas. The first two chapters are computed in the platform’s frame. The train has a position along the platform and a speed $\\beta$; the platform has its time $t$; and the train’s clock has its own proper time $\\tau$, advanced by $dt/\\gamma$ every substep, which is equation (3) in code. The photon’s height between the mirrors is a triangle wave in $\\tau$, and its position along the track is the train’s. Its velocity is therefore $(v, \\pm c/\\gamma)$ in the platform frame, of magnitude exactly $c$, whatever the slider is doing.',
        },
        {
          type: 'code',
          code: `beta = b
const g = gammaOf(beta)
const prevTau = tau
xT += (beta * h) / HALF // metres: c = 1 m per HALF seconds
tP += h
tau += h / g
// a bounce: τ crossed a multiple of HALF
const kPrev = Math.floor(prevTau / HALF)
const kNow = Math.floor(tau / HALF)
if (kNow > kPrev) {
  const yB = kNow % 2 === 0 ? 0 : 1
  // record the vertex (interpolate the platform position)
  const f = (kNow * HALF - prevTau) / (tau - prevTau || 1)
  const xb = xT - ((beta * h) / HALF) * (1 - f)
  trailX[trailN] = xb
  trailY[trailN] = yB
  trailN++
  tri = { x0, y0, x1: xb, y1: yB, b: beta }
}`,
          caption: 'One substep (trimmed). `HALF` is the display time of one mirror-to-mirror run at rest, 0.8 s, which sets the slowdown: 6.67 ns becomes 1.6 s.',
        },
        {
          type: 'p',
          text: 'Each bounce leaves a vertex where it happened on the platform, and the zigzag is drawn through them in platform coordinates, so it stays behind in the air as the camera follows the train. The last completed run becomes the triangle of equation (1), drawn with its right angle and labelled with its three sides in metres. The carriage, its windows, its wheels and the mirrors are drawn shortened by $1/\\gamma$ along the track. The posts behind the track carry the platform’s clocks, all synchronised: their hands turn once per rest tick, so the train’s photon can be compared with each as it passes. With sound on, the platform’s ticks are a low note and the train’s a high one, and the two rhythms drift apart as $\\gamma$ grows.',
        },
        { type: 'h', text: 'The diagram' },
        {
          type: 'p',
          text: 'Chapter III is a function of the slider and of a single trip clock. At coordinate time $t$ the traveller is at $x = \\beta t$ going out and $x = \\beta(10 - t)$ coming back, and has aged $t/\\gamma$:',
        },
        {
          type: 'code',
          code: `function tripAt(T: number) {
  const u = clamp((T - tripStart) / TRIP_DUR)
  const tc = u * TRIP
  const b = tripBeta
  const x = tc <= TRIP / 2 ? b * tc : b * (TRIP - tc)
  return { u, tc, x, tau: tc / gammaOf(b) }
}`,
          caption: 'The whole trip. `TRIP` is 10 years; the animation spends 17 s on it.',
        },
        {
          type: 'p',
          text: 'The light cones of the departure and the reunion are drawn as 45° hairlines; together they bound the *causal diamond*, the set of all events through which any journey from the first to the second could pass, faintly hatched. The traveller’s yearly ticks are placed at $t = k\\gamma$ and drawn across the world line; the hyperbolae $t^2 - x^2 = k^2$ through them are drawn faintly. The traveller’s line of simultaneity, of slope $\\beta$ on the way out and $-\\beta$ on the way back, follows the traveller and meets the home world line at $t - \\beta x$ (in years and light-years); after the turn, both lines through the turnaround and the stretch of home time between them stay on the drawing. Hovering near a world line reads its proper time at that height; elsewhere the readout gives the event’s coordinates and its interval from the departure, timelike or spacelike.',
        },
        { type: 'h', text: 'The satellites' },
        {
          type: 'p',
          text: 'The GPS numbers are not typed in but computed from physical constants, with equation (4):',
        },
        {
          type: 'code',
          code: `const GM = 3.986004418e14
const R_E = 6.371e6
const A_GPS = 2.656175e7
const V_GPS = Math.sqrt(GM / A_GPS)
const SR_US = (-(V_GPS * V_GPS) / (2 * C_LIGHT * C_LIGHT)) * 86400e6
const GR_US = ((GM / (C_LIGHT * C_LIGHT)) * (1 / R_E - 1 / A_GPS)) * 86400e6
const NET_US = SR_US + GR_US
const KM_DAY = (NET_US * 1e-6 * C_LIGHT) / 1000`,
          caption: 'Microseconds per day, and the distance light travels in the net drift.',
        },
        {
          type: 'p',
          text: 'The Earth and the orbit are drawn to scale against each other (the orbit’s radius is 4.17 Earth radii), the orbits as inclined circles seen in projection. The phone shows where an uncorrected receiver would put you as a day of drift accumulates, compressed into a few seconds, and then where a corrected one does.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Legend',
      blocks: [
        {
          type: 'list',
          items: [
            '**Chapter I:** the light clock in its carriage, the mirror gap dimensioned (L = 1 m), the photon in ocean blue. The platform’s ruler is in metres; the posts carry the platform’s synchronised clocks, labelled with platform time in nanoseconds.',
            '**Chapter II:** the zigzag is the photon’s path as the platform sees it, fading with age. The moss triangle is the last mirror-to-mirror run, with $vt$ along the mirror, $ct\'$ across the gap and $ct$ along the light. The note under the carriage gives its contracted length.',
            '**The slider:** β along the bottom, from 0 to 0.99, and above it the curve $\\gamma(\\beta)$, flat at first and then steep. The dot on the curve is the current speed.',
            '**Readouts:** in I and II, β, γ, platform time $t$ and train time $\\tau$, and the number of ticks of each clock; in III, the two twins’ ages; in IV, the daily drift.',
            '**Chapter III:** home’s world line in ink, the traveller’s in ocean, both ticked every year of their own time. Fern lines are light; the hatched diamond is every journey possible between departure and reunion. Dashed ocean lines are the traveller’s lines of simultaneity; the moss bar on the home line is the Earth time swept past at the turn. The two dials compare the twins’ clocks.',
            '**Chapter IV:** the Earth and the GPS orbit (with two of the other orbital planes, faint), the ledger of corrections, the clock frequency, and the phone.',
          ],
        },
        {
          type: 'p',
          text: 'Worth watching for: the moment in chapter II when the triangle first opens out from a vertical line; the carriage visibly shortening at β = 0.866 while the mirrors stay the same distance apart; and in chapter III, the turn, where the line of simultaneity swings and the moss bar appears.',
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
            '**Slow light.** Everything in chapters I and II runs 240 million times slower than life, so that light crosses a metre in 0.8 s. The geometry is exact; only the time scale is changed.',
            '**What the platform measures, not what it sees.** The shortened carriage is its length as measured with the platform’s rulers and synchronised clocks. A camera on the platform would record something different, because light from the near and far ends of the train takes different times to arrive.',
            '**Speeding up.** The train reaches its speed in a few seconds without anyone feeling it, and the clock keeps the rate of its instantaneous speed, as experiments confirm clocks do. Between bounces the photon’s path is drawn as a straight line even while the train is accelerating, where it would really be very slightly curved.',
            '**An instant turn.** The traveller reverses instantly, which would need an infinite acceleration. A gentler turn rounds the corner of the world line and smooths the swing of simultaneity, but changes the final ages very little for a short turn.',
            '**A simple Earth.** The GPS figures use a circular orbit and a still, spherical Earth. The system itself also accounts for the Earth’s rotation and shape, and for each orbit’s small eccentricity, which adds a periodic correction of up to some tens of nanoseconds.',
            '**A schematic phone.** Real position errors from unsynchronised clocks would not grow in a straight line; the drift on the phone illustrates the size of the error, not its shape.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Zur Elektrodynamik bewegter Körper (On the Electrodynamics of Moving Bodies)', by: 'Albert Einstein', year: '1905', note: '*Annalen der Physik* 17. Time dilation appears in section 4.' },
    { title: 'Raum und Zeit (Space and Time)', by: 'Hermann Minkowski', year: '1908', note: 'The Cologne lecture that turned relativity into the geometry of spacetime.' },
    { title: 'Spacetime Physics', by: 'Edwin F. Taylor & John Archibald Wheeler', year: '1966', note: 'W. H. Freeman; second edition 1992. The light clock, the interval and the twins, taught with diagrams.' },
    { title: 'It’s About Time: Understanding Einstein’s Relativity', by: 'N. David Mermin', year: '2005', note: 'Princeton University Press. A careful, elementary account built on clocks and light.' },
    { title: 'Measurement of the Relativistic Time Dilation Using μ-Mesons', by: 'David H. Frisch & James H. Smith', year: '1963', note: '*American Journal of Physics* 31. Muons on Mount Washington and at sea level.' },
    { title: 'Around-the-World Atomic Clocks: Observed Relativistic Time Gains', by: 'J. C. Hafele & Richard E. Keating', year: '1972', note: '*Science* 177. The clocks flown east and west.' },
    { title: 'Relativity in the Global Positioning System', by: 'Neil Ashby', year: '2003', note: '*Living Reviews in Relativity* 6. Every relativistic correction in GPS, with numbers.' },
    { title: 'Was Einstein Right?', by: 'Clifford M. Will', year: '1986', note: 'Basic Books. The experimental tests of relativity, for a general reader.' },
  ],
}

export default guide
