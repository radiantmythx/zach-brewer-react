import type { Guide } from '../guide'

const latitudeFigure = `<svg viewBox="0 0 420 230" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="120" cy="130" r="70"/>
  <line x1="120" y1="40" x2="120" y2="220" stroke-dasharray="10 3 2 3" opacity="0.5"/>
  <line x1="40" y1="130" x2="200" y2="130" stroke-dasharray="2 3" opacity="0.35"/>
  <line x1="120" y1="130" x2="169.5" y2="80.5" opacity="0.6"/>
  <path d="M146 130 A26 26 0 0 0 138.4 111.6" stroke="#2B6A93"/>
  <text x="150" y="122" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">φ</text>
  <line x1="113" y1="37" x2="226" y2="150" opacity="0.8"/>
  <line x1="169.5" y1="80.5" x2="169.5" y2="20" stroke="#7FB6D9"/>
  <path d="M166 26 L169.5 20 L173 26" stroke="#7FB6D9"/>
  <line x1="120" y1="60" x2="120" y2="20" stroke="#7FB6D9"/>
  <path d="M116.5 26 L120 20 L123.5 26" stroke="#7FB6D9"/>
  <path d="M186 97 A24 24 0 0 0 169.5 56.5" stroke="#2B6A93"/>
  <text x="185" y="70" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">φ</text>
  <circle cx="169.5" cy="80.5" r="2.5" fill="currentColor" stroke="none"/>
  <text x="250" y="34" font-family="Geist Mono, monospace" font-size="9" fill="#7FB6D9" stroke="none">TO POLARIS (PARALLEL)</text>
  <text x="232" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">YOUR HORIZON</text>
  <text x="250" y="196" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">POLE ALTITUDE = LATITUDE</text>
  <text x="54" y="214" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">EARTH’S AXIS</text>
</svg>`

const arcFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="20" y1="176" x2="400" y2="176" opacity="0.7"/>
  <path d="M210 70 m-2 0 h4 m-2 -2 v4" stroke="#7FB6D9"/>
  <path d="M234 70 A24 24 0 0 0 210 46" opacity="0.8"/>
  <path d="M264 70 A54 54 0 0 0 210 16" opacity="0.7"/>
  <path d="M300 70 A90 90 0 0 0 237.8 -15.6" opacity="0.6"/>
  <path d="M310 70 A100 100 0 0 0 263.2 -13.8" opacity="0.3"/>
  <line x1="210" y1="70" x2="300" y2="70" stroke-dasharray="2 3" opacity="0.5"/>
  <line x1="210" y1="70" x2="263.6" y2="-2" stroke-dasharray="2 3" opacity="0.5"/>
  <path d="M250 70 A40 40 0 0 0 233.9 37.8" stroke="#2B6A93"/>
  <text x="252" y="50" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">15° × HOURS</text>
  <text x="60" y="120" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">EVERY TRAIL SPANS THE SAME ANGLE</text>
  <text x="60" y="134" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">AROUND THE POLE; ITS LENGTH ∝ cos δ</text>
  <text x="216" y="88" font-family="Geist Mono, monospace" font-size="9" fill="#7FB6D9" stroke="none">POLE</text>
</svg>`

const guide: Guide = {
  lede: 'A long exposure of one night, computed rather than photographed. Every star sweeps an arc around the celestial pole at fifteen degrees an hour and Polaris barely moves; travel, and the pole sinks or rises with your latitude, until at the equator the stars rise straight up and in the south they turn the other way.',
  facts: [
    ['Rotation', '360° in a sidereal day of 23 h 56 min 4 s: 15.041° per hour'],
    ['Pole altitude', 'Equal to your latitude'],
    ['Polaris', 'About 0.63° from the north celestial pole in 2026'],
    ['Precession', 'A 25,800-year cycle; Vega near the pole in about 12,000 years'],
    ['Lens', 'Stereographic: every circle on the sky stays a circle'],
    ['Stars', '≈ 100 bright stars with rounded, approximate catalogue values, plus 1,550 faint ones placed at random'],
    ['Colour', 'The blackbody chromaticity of each star’s temperature'],
    ['Places', '45° N, 78° N in the polar night, the equator, 34° S'],
    ['Running time', '84 s in six chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['↑', '↓'], action: 'Travel north or south by 5° of latitude' },
      { keys: ['Space'], action: 'Hold to keep the shutter open faster' },
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['P'], action: 'Pause or resume' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag up to travel north, down to travel south; the pole climbs or sinks with you' },
      { gesture: 'hold', action: 'Press and hold anywhere to expose faster' },
      { gesture: 'tap', action: 'Tap a trail to name its star and read its temperature' },
      { gesture: 'tap', action: 'Tap or drag the ruler along the bottom to jump in time' },
    ],
    tip: 'Drag all the way down to the equator during a long exposure and watch the circles open into straight lines, then keep going south and watch them close again around the other pole.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [
      { label: 'North', code: 'ArrowUp', aria: 'Travel north' },
      { label: 'South', code: 'ArrowDown', aria: 'Travel south' },
      { label: 'Hold', code: 'Space', aria: 'Hold the shutter open faster', wide: true },
    ],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Astronomy',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Leave a camera on a tripod with its shutter open, point it at the night sky, and come back hours later. Every star has drawn an arc, and the arcs are concentric: they share a centre, a point in the sky about which the whole sky seems to turn. The stars are not moving, of course. The camera is, along with the ground, the tree and you, on a planet that turns once a day. The arcs are a record of the Earth’s rotation, written in starlight.',
        },
        {
          type: 'p',
          text: 'The turning is steady and surprisingly quick. Relative to the stars, the Earth turns once in 23 hours, 56 minutes and 4 seconds, the **sidereal day**. That is about four minutes shorter than the solar day of 24 hours, because the Earth also moves about a degree along its orbit each day, and has to turn a little extra to bring the Sun back to the same place. So the sky turns 15.041° in every hour of clock time, a little over 15°: a star near the celestial equator travels the width of a full Moon in about two minutes.',
        },
        { type: 'h', text: 'The poles of the sky' },
        {
          type: 'p',
          text: 'Extend the Earth’s axis into space and it meets the sky at two points, the north and south **celestial poles**. Every star circles them, and the circles get smaller toward the poles, exactly as lines of latitude get shorter toward the poles of the Earth. A star’s distance from the celestial equator is its **declination**, $\\delta$; a star at declination $\\delta$ moves on a circle of angular radius $90° - \\delta$ around the north pole.',
        },
        {
          type: 'p',
          text: 'By luck, a bright star lies close to the north celestial pole. Polaris, at the end of the handle of the Little Dipper, is currently about 0.63° from the pole, a little more than the width of a full Moon. In a night-long exposure its arc is so small that it looks like a slightly smeared point, while everything around it swings in wide arcs. Polaris is moving closer still: the pole should pass within about half a degree of it around the year 2100. The south celestial pole has no such marker. The nearest naked-eye star, Sigma Octantis, is faint, about magnitude 5.4, and about one degree away; southern navigators have traditionally found the pole by extending the long axis of the Southern Cross about four and a half times its length.',
        },
        { type: 'h', text: 'Why the pole’s altitude is your latitude' },
        {
          type: 'p',
          text: 'Stand at the North Pole and the celestial pole is directly overhead: every star circles the zenith at a constant height and none ever sets. Stand on the equator and both celestial poles sit on the horizon, due north and due south: every star rises straight up out of the east, crosses the sky and sets straight down in the west, spending exactly twelve hours above the horizon. In between, the pole sits at an altitude above the northern horizon equal to your latitude. The reason is simple geometry: Polaris is so far away that its light reaches every point on Earth along parallel lines, all parallel to the axis, so the angle between your horizon and that direction equals the angle between the equator and your position, measured from the centre of the Earth.',
        },
        { type: 'figure', svg: latitudeFigure, alt: 'A cross-section of the Earth with an observer at latitude phi; the horizon at the observer is tangent to the Earth, and the direction to Polaris, parallel to the axis, makes an angle phi with the horizon.', caption: 'Light from Polaris arrives parallel to the Earth’s axis everywhere. The angle it makes with your horizon is your latitude.' },
        {
          type: 'p',
          text: 'Navigators have used this for thousands of years: measure the height of the pole star above the horizon and you know how far north you are. In the piece, drag up or down to travel and watch the pole climb toward the zenith or sink to the horizon, with the dimension line along its side reading the same number as the latitude. In the southern hemisphere the same rule holds for the south celestial pole, above the southern horizon, and the sky turns clockwise around it instead of anticlockwise.',
        },
        { type: 'h', text: 'Pole stars come and go' },
        {
          type: 'p',
          text: 'The Earth’s axis is not fixed in space. The pull of the Sun and Moon on the Earth’s equatorial bulge makes it wobble like a slowing top, tracing a wide circle on the sky once every 25,800 years or so. The effect, the **precession of the equinoxes**, was discovered by the Greek astronomer Hipparchus in the second century BC, from star positions recorded by earlier observers. As a result, Polaris is only a temporary pole star. In the third millennium BC, when the Egyptian pyramids were built, the pole lay near Thuban in Draco. In roughly 12,000 years it will lie a few degrees from Vega, the brilliant blue-white star of summer evenings, and Vega’s trail will be the small bright circle at the centre of every northern star-trail photograph. The piece uses star positions precessed to 2026.',
        },
        { type: 'h', text: 'Photographing time' },
        {
          type: 'p',
          text: 'Star trails appeared on photographic plates as soon as plates were sensitive enough to record stars, in the second half of the nineteenth century. To astronomers they were a nuisance, removed by mounting telescopes on clockwork drives that turned with the sky. To photographers they became a subject: a way of showing, in one image, a duration that no eye can see. A single exposure of several hours is still possible on film, but digital sensors accumulate noise and skyglow, so most modern star-trail images are made by stacking hundreds of exposures of thirty seconds or so, taken one after another and combined so that each pixel keeps its brightest value. The result looks the same: the patience of the photographer, made visible.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Mathematics',
      title: 'Coordinates on a turning sky',
      blocks: [
        {
          type: 'p',
          text: 'Astronomers fix each star by two angles on the sky: its **right ascension** $\\alpha$, measured eastward along the celestial equator, and its declination $\\delta$. These change only very slowly. What changes through the night is the star’s **hour angle**, how far it has turned past your meridian, the north–south line overhead:',
        },
        { type: 'math', tex: 'H = \\text{LST} - \\alpha, \\qquad \\frac{d\\,\\text{LST}}{dt} = 15.041°\\ \\text{per hour}', label: '(1)', caption: 'LST, the local sidereal time, is the right ascension crossing your meridian at that moment.' },
        {
          type: 'p',
          text: 'At latitude $\\varphi$, the star’s direction in your local sky, as components toward north $N$, east $E$ and up $U$, is:',
        },
        { type: 'math', tex: 'N = \\cos\\varphi\\,\\sin\\delta - \\sin\\varphi\\,\\cos\\delta\\,\\cos H, \\quad E = -\\cos\\delta\\,\\sin H, \\quad U = \\sin\\varphi\\,\\sin\\delta + \\cos\\varphi\\,\\cos\\delta\\,\\cos H', label: '(2)' },
        {
          type: 'p',
          text: 'Its altitude is $\\arcsin U$. Setting $\\delta = 90°$ gives $(N, E, U) = (\\cos\\varphi, 0, \\sin\\varphi)$: the pole is due north at altitude $\\varphi$, the rule above. A star never sets if its lowest point, $U$ at $H = 180°$, stays above zero, which happens when $\\delta > 90° - \\varphi$: at 45° N everything north of declination +45° is **circumpolar**; at 78° N, everything north of +12°; at the equator, nothing.',
        },
        { type: 'h', text: 'How long is a trail?' },
        {
          type: 'p',
          text: 'In an exposure of $\\Delta t$ hours every star turns through the same angle about the pole, $15.041°\\,\\Delta t$. Its arc on the sky is that angle times the radius of its circle:',
        },
        { type: 'math', tex: '\\ell = 15.041° \\times \\Delta t \\times \\cos\\delta', label: '(3)' },
        {
          type: 'p',
          text: 'So stars near the pole draw short trails and stars on the celestial equator draw the longest. There is a quieter consequence. A trail’s brightness per unit length is the star’s light spread over the length it covers, so near the pole, where stars move slowly, trails are brighter than equally bright stars’ trails near the equator. The piece weights each trail by its flux divided by a power of $\\cos\\delta$ for exactly this reason.',
        },
        { type: 'figure', svg: arcFigure, alt: 'Concentric arcs around the celestial pole above a horizon line, all spanning the same angle, with outer arcs longer.', caption: 'Every trail subtends the same angle at the pole; its length grows with its circle.' },
        { type: 'h', text: 'A lens that keeps circles round' },
        {
          type: 'p',
          text: 'A camera maps directions on the sky to points on a flat sensor, and the choice of map decides what a star trail looks like. An ordinary rectilinear lens turns the circles into ellipses and hyperbolas. The piece instead uses the **stereographic projection**, a map known to Hipparchus and Ptolemy, used for the plates of the astrolabe, and approximated by some modern fisheye lenses. A direction at angle $\\theta$ from the centre of view lands at distance $r = 2f\\tan(\\theta/2)$ from the centre of the picture; in components, with $(x, y, z)$ the direction in the camera’s frame and $z$ along the view:',
        },
        { type: 'math', tex: 'X = c_x + \\frac{2f\\,x}{1 + z}, \\qquad Y = c_y - \\frac{2f\\,y}{1 + z}', label: '(4)' },
        {
          type: 'p',
          text: 'The stereographic projection has two properties that matter here. It is **conformal**, so small shapes are not distorted, only scaled. And it maps every circle on the sphere to a circle or a straight line in the plane. Each star’s daily path is a circle on the sky, so in this lens every trail is an exact circular arc, which a canvas can draw with a single `arc()` call. The horizon, a great circle through the centre of view when the camera is level, becomes a straight line.',
        },
        { type: 'h', text: 'Precession, in numbers' },
        {
          type: 'p',
          text: 'The catalogue positions are for the standard epoch J2000.0. To bring them to 2026, the piece rotates each star’s direction by three small angles, $\\zeta_A$, $z_A$ and $\\theta_A$, from the IAU 1976 precession model, where $T$ is the time from J2000 in Julian centuries ($T \\approx 0.26$):',
        },
        { type: 'math', tex: '\\zeta_A \\approx 2306.2181″\\,T, \\qquad z_A \\approx 2306.2181″\\,T, \\qquad \\theta_A \\approx 2004.3109″\\,T', label: '(5)', caption: 'Plus small quadratic terms. Over 26 years the pole moves about 0.14° among the stars.' },
      ],
    },
    {
      id: 'piece',
      kicker: 'Implementation',
      title: 'How the piece works',
      blocks: [
        {
          type: 'p',
          text: 'Star Trails is a single TypeScript module drawing to one canvas. There is no accumulation buffer: every frame redraws the whole exposure from scratch, analytically, which is what makes it possible to change the latitude in the middle of a night and see the same hours re-photographed from somewhere else. The film is a function of time with four exposure legs, and the only state that builds up is what you add: a latitude you dragged to, and extra exposure from holding.',
        },
        { type: 'h', text: 'The sky' },
        {
          type: 'p',
          text: 'About a hundred bright stars carry names, approximate J2000 positions, magnitudes and effective temperatures: the Big and Little Dippers and Cassiopeia around Polaris, the bright stars of each season, the Pleiades as a tight bundle of blue trails, and in the south the Southern Cross, Alpha and Beta Centauri, Canopus and Achernar. Then 1,550 fainter stars, magnitude 3.4 to 6.2, are scattered at random over the sphere with the number-magnitude law $N(<m) \\propto 10^{0.5m}$, thinned away from the plane of the Milky Way (using the galactic north pole at RA 12 h 51 m, Dec +27.1°), and a small swarm of faint stars stands in for each Magellanic Cloud, so that in the south they trail into soft bands. Each star’s colour is the blackbody chromaticity at its temperature, from the shared colour module.',
        },
        { type: 'h', text: 'Every trail is one arc' },
        {
          type: 'p',
          text: 'Whenever the camera changes, the piece projects three points of each star’s daily circle through the lens and finds the circle through them. The rare circle that passes close to the point behind the camera, where the projection runs off to infinity, is flagged and drawn as a short polyline instead. Each frame then needs only the start and end of every arc, plus a midpoint to tell which way round to go:',
        },
        {
          type: 'code',
          code: `projStar(i, h0)
const xs = P.x
const ys = P.y
projStar(i, h0 + span * 0.5)
const xm = P.x
const ym = P.y
projStar(i, h1)
const cx = CCX[i]
const cy = CCY[i]
const a0 = Math.atan2(ys - cy, xs - cx)
const am = Math.atan2(ym - cy, xm - cx)
const a1 = Math.atan2(P.y - cy, P.x - cx)
const dE = (((a1 - a0) % TAU) + TAU) % TAU
const dM = (((am - a0) % TAU) + TAU) % TAU
ctx.moveTo(xs, ys)
// if the midpoint lies outside the clockwise sweep, go anticlockwise
ctx.arc(cx, cy, CCR[i], a0, a1, dM > dE)`,
          caption: 'From `trail()`. The hour angles $h_0$ and $h_1$ are the moments the shutter opened and now.',
        },
        {
          type: 'p',
          text: 'The stars are sorted once into seventy bins of colour and brightness, so a frame strokes seventy paths, each holding a few dozen arcs, with additive blending, since light really does accumulate on a sensor. The sky is clipped to the skyline, so stars below the horizon leave no trace and rising stars’ trails begin exactly at the hills. Then the current position of each star is drawn as a small dot at the end of its trail.',
        },
        { type: 'h', text: 'The camera' },
        {
          type: 'p',
          text: 'The camera follows the latitude. North of about 18° it faces north; south of about −18° it faces south; in between it swings through east, so that at the equator it looks straight along the celestial equator as the stars climb out of the horizon. Its focal length is chosen so that the pole sits comfortably in frame with some sky above it, within limits that keep the field between about 70° and 150° wide, and wider in the polar sky. At 78° N the pole is too high for a level camera, so the camera tilts up and the horizon curves into the shape a fisheye gives. Meteors and the satellite are defined in the camera’s own frame, because they happen in the atmosphere or in orbit, not on the turning sky: in a real exposure a meteor’s streak stays put while the stars wheel past it.',
        },
        {
          type: 'code',
          code: `const sm = smoothstep(-18, 18, phi)
const face = Math.abs(2 * sm - 1)     // 1 facing a pole, 0 facing east
const az = lerp(180, 0, sm) * D2R     // south … east … north
const p = Math.abs(phi) * face
const altTop = clamp(p + (p > 60 ? 13 : 20), 38, 94)
const hc = Math.max(0, p - 50)        // tilt up for the polar sky
let f = (hyE - topM) /
  (2 * (Math.tan((hc / 2) * D2R) + Math.tan(((altTop - hc) / 2) * D2R)))
f = clamp(f, w / 2 / lerp(1.6, 2.05, smoothstep(55, 75, p)), w / 2 / 0.62)`,
          caption: 'From `setCamera()`. The focal length puts altitude `altTop` at the top of the frame and the horizon at `hyE`.',
        },
        { type: 'h', text: 'Time and patience' },
        {
          type: 'p',
          text: 'Each leg opens the shutter, lets the exposure grow on an easing curve, and closes it before the next journey: about ten hours on the first night at 45° N, extended to a full 24 hours in the polar night, seven and a half at the equator and nine and a half at 34° S. Pressing and holding anywhere, or holding Space, runs the exposure several times faster than the film’s own pace; the extra is kept until the shutter next closes. The 24-hour dial shows the clock time and shades the hours the shutter has been open. Tapping searches every bright star’s arc for one passing under your finger, then picks out that trail in white with the star’s name, spectral class and temperature, and a swatch of its colour.',
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
            '**Small blue cross:** the celestial pole, north or south, when the camera faces it.',
            '**Vertical dimension beside it:** the pole’s altitude above the skyline, with ticks every 10°. It always reads the same as the latitude.',
            '**Loupe (chapter II):** Polaris magnified about the true pole. The dashed circle is its full daily circle; the solid arc is the part swept so far.',
            '**Colours:** each trail is the colour of a blackbody at the star’s temperature: deep orange for cool giants such as Arcturus, Aldebaran and Antares, white for stars like the Sun, blue-white for hot stars such as Rigel and the Pleiades.',
            '**Brighter, thicker trails:** brighter stars, and stars near the pole, whose light is spread over less length.',
            '**Short straight streaks:** meteors, which stay where they happened in the frame. **A long faint straight line:** a satellite, ending mid-sky where it passed into the Earth’s shadow.',
            '**The seated figure and tripod:** the photographer. The small orange light blinks while the shutter is open.',
            '**24-hour dial:** clock time, with the open-shutter hours shaded. **Readouts:** latitude, pole altitude, exposure, total turn of the sky, and the sidereal rate.',
            '**Bottom ruler:** the 84-second timeline and its six chapters. Tap or drag it to jump.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: in chapter III, how the circles near the pole close completely as the exposure reaches 24 hours while the tree stands still; in chapter IV, Orion rising vertically out of the east, red Betelgeuse above blue Rigel; and in chapter V, the dark hole around the south celestial pole, with the Magellanic Clouds trailing past it as two faint bands.',
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
            '**One exposure, many places.** No camera can change latitude during an exposure. When you drag, or when the film travels, the piece shows the same span of hours photographed from the new latitude, which is why the trails morph rather than restart.',
            '**Approximate catalogue.** The bright stars’ positions, magnitudes and temperatures are rounded values in the spirit of the standard catalogues, good to a fraction of a degree for the purposes of a drawing; the faint stars are random, not real.',
            '**A perfect, airless sky.** There is no atmospheric refraction (which lifts stars near the horizon by about half a degree), no extinction (which dims and reddens them), no Moon, no light pollution and no twilight. At 78° N even midwinter noon is twilight, too bright for a single real 24-hour exposure; real full-circle images are usually stacks of many shorter frames.',
            '**Compressed time.** A night passes in under a minute. Holding speeds it further.',
            '**An ideal lens.** The stereographic projection is exact here; real fisheye lenses approximate one of several projections, and real lenses have vignetting and distortion.',
            '**Meteors and satellites.** The streaks are placed by a seeded random generator, not taken from a real shower or orbit, though their behaviour, fixed in the frame while the stars move, is real.',
            '**Colour.** Each star is drawn as a pure blackbody at its effective temperature. Real stellar spectra have absorption lines and the eye and cameras each render colour their own way, but a blackbody gets the hue of most stars about right.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Astronomical Algorithms', by: 'Jean Meeus', year: '1998', note: 'Willmann-Bell, 2nd edition. Coordinate transformations, sidereal time and precession.' },
    { title: 'Practical Astronomy with your Calculator or Spreadsheet', by: 'Peter Duffett-Smith & Jonathan Zwart', year: '2011', note: 'Cambridge University Press, 4th edition. Hour angle, altitude and azimuth, worked by hand.' },
    { title: 'Explanatory Supplement to the Astronomical Almanac', by: 'Sean E. Urban & P. Kenneth Seidelmann (eds.)', year: '2013', note: 'University Science Books, 3rd edition.' },
    { title: 'Expressions for the precession quantities based upon the IAU (1976) system of astronomical constants', by: 'J. H. Lieske, T. Lederle, W. Fricke & B. Morando', year: '1977', note: '*Astronomy and Astrophysics* 58. The precession angles used here.' },
    { title: 'The Bright Star Catalogue', by: 'Dorrit Hoffleit & Wayne H. Warren Jr.', year: '1991', note: 'Yale University Observatory, 5th revised edition.' },
    { title: 'Map Projections: A Working Manual', by: 'John P. Snyder', year: '1987', note: 'U.S. Geological Survey Professional Paper 1395. The stereographic projection and its properties.' },
    { title: 'NightWatch: A Practical Guide to Viewing the Universe', by: 'Terence Dickinson', year: '2006', note: 'Firefly Books, 4th edition. A friendly introduction to the turning sky.' },
  ],
}

export default guide
