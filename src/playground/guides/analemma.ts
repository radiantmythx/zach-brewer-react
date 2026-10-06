import type { Guide } from '../guide'

const causesFigure = `<svg viewBox="0 0 440 170" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="20" y1="85" x2="420" y2="85" stroke-dasharray="2 4" opacity="0.4"/>
  <path d="M20 85 C70 120 120 120 170 85 S320 50 420 85" stroke="#6F952F" stroke-dasharray="4 3"/>
  <path d="M20 85 C45 40 70 40 95 85 S145 130 170 85 S220 40 245 85 S295 130 320 85 S370 40 395 85" stroke="#2B6A93" stroke-dasharray="1 2.5" transform="translate(12 0)"/>
  <path d="M20 96 C40 120 62 128 82 116 C110 96 120 54 150 50 C176 48 180 92 205 104 C230 116 240 96 262 76 C290 50 320 22 352 28 C384 34 396 70 420 96" stroke-width="1.3"/>
  <text x="24" y="16" font-family="Geist Mono, monospace" font-size="9" fill="#6F952F" stroke="none">ELLIPSE · ONE A YEAR · ±7.7 MIN</text>
  <text x="24" y="30" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">TILT · TWO A YEAR · ±9.9 MIN</text>
  <text x="250" y="16" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">SUM · −14 TO +16 MIN</text>
  <text x="20" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">JAN</text>
  <text x="208" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">JUL</text>
  <text x="396" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">DEC</text>
</svg>`

const figure8 = `<svg viewBox="0 0 300 260" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="150" y1="14" x2="150" y2="236" stroke-dasharray="1 3" opacity="0.5"/>
  <path d="M150 36 C132 36 132 70 146 92 C160 116 176 142 176 178 C176 214 162 232 150 232 C138 232 124 214 124 178 C124 142 140 116 154 92 C168 70 168 36 150 36 Z"/>
  <circle cx="150" cy="36" r="3"/>
  <circle cx="150" cy="232" r="3"/>
  <circle cx="125" cy="182" r="3" stroke="#2B6A93"/>
  <circle cx="176" cy="172" r="3" stroke="#2B6A93"/>
  <text x="160" y="34" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">JUN 21</text>
  <text x="160" y="248" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">DEC 21</text>
  <text x="34" y="186" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">FEB 11 · −14</text>
  <text x="184" y="170" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">NOV 3 · +16</text>
  <text x="18" y="24" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">NOON, 51.5° N</text>
  <text x="158" y="128" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">MERIDIAN</text>
</svg>`

const guide: Guide = {
  lede: 'Photograph the Sun at the same clock time every day for a year and the images stack into a tall, lopsided figure eight. Its height is the tilt of the Earth’s axis; its width is the equation of time, the few minutes by which the Sun runs ahead of the clock or falls behind it.',
  facts: [
    ['Phenomenon', 'The analemma: the Sun at one clock time through a year'],
    ['Equation of time', 'Sundial minus clock, −14.2 min (Feb) to +16.4 min (Nov)'],
    ['Causes', 'Orbital eccentricity 0.0167 and axial tilt 23.44°'],
    ['Parts', '±7.7 min once a year; ±9.9 min twice a year'],
    ['Declination', '±23.44° over the year'],
    ['Model', 'The Astronomical Almanac’s low-precision solar formulae'],
    ['Accuracy', 'Well under a minute in the equation of time'],
    ['Default place', '51.5° N, the latitude of Greenwich, at 12:00'],
    ['Running time', '84 s: a year in 46, then the causes and the dial'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['↑', '↓'], action: 'Latitude, 5° at a time' },
      { keys: ['D'], action: 'Show or hide the two causes' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag the sky up or down to change latitude, sideways to change the clock time (08:00 to 16:00)' },
      { gesture: 'drag', action: 'Drag along either chart to scrub the day of the year' },
      { gesture: 'tap', action: 'Tap the sky to show the two causes: the curves split and the figure’s two ghosts appear' },
    ],
    tip: 'Drag the clock time to 09:00 and the latitude toward the equator: the figure leans over and climbs toward the zenith, and the faint figures for the other hours fan out across the sky.',
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Noon is not always at noon',
      blocks: [
        {
          type: 'p',
          text: 'A sundial tells *apparent solar time*: noon is the moment the Sun crosses the meridian, the north–south line through the sky, and the shadow of the gnomon falls on the noon line. A clock tells *mean time*, in which every day is exactly 24 hours long. The two agree only four times a year, around 15 April, 13 June, 1 September and 25 December. In between, the sundial drifts. By about 11 February it is more than fourteen minutes slow; by mid-May nearly four minutes fast; by late July six and a half minutes slow; and by about 3 November more than sixteen minutes fast. The difference, sundial minus clock, is called the **equation of time**, using “equation” in its old astronomical sense of a correction.',
        },
        {
          type: 'p',
          text: 'Nobody noticed the equation of time on sundials alone, because for most of history sundials were the clocks. Astronomers knew of it from the motions of the Sun and Moon; Ptolemy accounts for the unequal length of solar days in the *Almagest*, in the second century. It became a practical matter when pendulum clocks, from the 1650s, were steady enough to show that the Sun itself was the irregular one. Christiaan Huygens and, in the 1670s, John Flamsteed published tables for setting a clock from a sundial. Towns kept apparent time well into the eighteenth century and changed to mean time over the decades either side of 1800; the railways and the telegraph then pulled whole countries onto a single mean time, and in 1884 an international conference adopted the meridian at Greenwich as the zero of longitude. The default latitude in the piece is Greenwich’s, 51.5° N.',
        },
        { type: 'h', text: 'Why the Sun runs unevenly' },
        {
          type: 'p',
          text: 'A solar day is one turn of the Earth plus the extra bit needed to face the Sun again, because the Earth has moved along its orbit in the meantime. The equation of time is the running total of how that extra bit varies over the year. There are two independent reasons.',
        },
        {
          type: 'list',
          items: [
            '**The ellipse.** The Earth’s orbit is slightly eccentric. Near perihelion, in early January, the Earth moves faster along its orbit (Kepler’s second law), so each day it has to turn further to bring the Sun back to the meridian: solar days are longer than average and the sundial falls behind. Near aphelion in early July the opposite holds. On its own this would make the sundial up to 7.7 minutes slow in spring and 7.7 fast in autumn: one sine wave a year.',
            '**The tilt.** Even on a circular orbit the Sun’s steady motion is along the ecliptic, which is tilted 23.44° to the celestial equator, while clocks measure time by rotation about the equator. Near the equinoxes the Sun moves partly north or south, so its eastward progress, projected onto the equator, is slower than average; near the solstices it moves parallel to the equator at a smaller circle of declination, so its eastward progress is faster. That makes a wave of twice a year, up to 9.9 minutes either way.',
          ],
        },
        {
          type: 'p',
          text: 'Add the two and the result is the familiar lopsided curve: a deep trough in February, a small peak in May, a shallow trough in July and a tall peak in November. The two causes are almost exactly in the proportion they look, and you can watch them separate in chapter III of the piece.',
        },
        {
          type: 'figure',
          svg: causesFigure,
          alt: 'A dashed sine wave of one cycle per year, a dotted wave of two cycles per year, and their uneven sum.',
          caption: 'The equation of time as the sum of two waves: the orbit’s eccentricity (dashed) and the axis’s tilt (dotted).',
        },
        { type: 'h', text: 'The figure in the sky' },
        {
          type: 'p',
          text: 'Through the year the Sun also climbs and sinks: its **declination**, the angle north or south of the celestial equator, swings between +23.44° at the June solstice and −23.44° in December. Mark the Sun’s place at a fixed clock time every day and the declination moves it up and down, while the equation of time moves it east and west, four minutes of time to each degree of arc. Up and down twice as slowly as side to side: a figure eight. It is called the **analemma**, from a Greek word for the support of a sundial; Ptolemy wrote a treatise under that name on the geometry used to lay sundials out, and the word later passed to the figure.',
        },
        {
          type: 'p',
          text: 'The two loops are not equal. Near the June solstice the Earth is far from the Sun and moving slowly, and the eccentricity and tilt terms partly cancel; near December the Earth is near perihelion and they reinforce. So in the northern hemisphere the summer loop, at the top of the figure, is the smaller one, and the winter loop at the bottom is fatter. Large globes once printed the analemma in the empty middle of the Pacific, as a chart of the Sun’s declination and the equation of time for every date, and some sundials carry a figure eight on their noon line so the time can be read correctly on any day.',
        },
        {
          type: 'figure',
          svg: figure8,
          alt: 'A tall figure eight with a small upper loop marked June 21 and a larger lower loop marked December 21; February 11 and November 3 mark its left and right extremes.',
          caption: 'The noon analemma at 51.5° N, as the piece draws it: 47° tall, and only about 8° wide.',
        },
        {
          type: 'p',
          text: 'Photographers began to capture the whole figure on a single frame in the late 1970s, by fixing a camera in place and opening the shutter on the same clock time once every week or so for a year, with an extra exposure of the landscape to anchor it. Dennis di Cicco’s composite, made through 1978 and 1979, is the best known of the early ones. The figure they record is the one in the piece: at noon it stands upright above the southern horizon, at other times of day it leans, and its height above the horizon depends on the latitude.',
        },
        { type: 'h', text: 'Latest sunrise, earliest sunset' },
        {
          type: 'p',
          text: 'The equation of time explains a small puzzle of winter. The shortest day is the December solstice, but at mid-northern latitudes the earliest sunset comes in the first half of December and the latest sunrise in early January. Around the solstice the equation of time is falling by about half a minute a day, so the sundial loses ground and solar noon comes later by the clock, day after day. Near the solstice the day length is hardly changing, so sunrise and sunset ride along with noon: both drift later. Sunset stops getting earlier before the solstice, and sunrise keeps getting later after it. The same thing happens, mirrored, around the June solstice.',
        },
        { type: 'h', text: 'Latitude and shape' },
        {
          type: 'p',
          text: 'The noon figure always has the same angular size, 47° from top to bottom, because that is just twice the tilt, but where it sits depends on the latitude $\\phi$: its centre is at altitude $90° - |\\phi|$. At Greenwich it spans 15° to 62° above the southern horizon. Toward the tropics it climbs until its top passes through the zenith and over into the northern sky. In the southern hemisphere the figure stands above the northern horizon and is upside down: the larger loop, near the December perihelion, is now summer’s, and is at the top. Away from noon the figure tilts, toward the east in the morning and the west in the afternoon, and how far it leans depends on both the hour and the latitude; at the equator the morning and afternoon figures lie almost on their sides. Other planets draw other figures: Mars, with a more eccentric orbit, makes a teardrop.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'Two corrections and a projection',
      blocks: [
        {
          type: 'p',
          text: 'The piece uses the low-precision formulae for the Sun printed in the Astronomical Almanac. Let $n$ be the number of days from the epoch J2000.0 (noon, 1 January 2000, Universal Time). Then, in degrees,',
        },
        { type: 'math', tex: 'L = 280.460 + 0.9856474\\,n, \\qquad g = 357.528 + 0.9856003\\,n', label: '(1)', caption: '$L$ is the Sun’s mean longitude: where it would be if it moved uniformly. $g$ is its mean anomaly: the angle from perihelion of that uniform motion.' },
        { type: 'math', tex: '\\lambda = L + 1.915\\sin g + 0.020\\sin 2g, \\qquad \\varepsilon = 23.439 - 0.0000004\\,n', label: '(2)', caption: '$\\lambda$ is the Sun’s true ecliptic longitude: the two sine terms are the *equation of the centre*, the eccentric orbit’s correction. $\\varepsilon$ is the obliquity of the ecliptic, the tilt.' },
        {
          type: 'p',
          text: 'The Sun’s right ascension $\\alpha$ and declination $\\delta$ follow by rotating from the ecliptic onto the equator:',
        },
        { type: 'math', tex: '\\tan\\alpha = \\frac{\\cos\\varepsilon\\,\\sin\\lambda}{\\cos\\lambda}, \\qquad \\sin\\delta = \\sin\\varepsilon\\,\\sin\\lambda', label: '(3)' },
        {
          type: 'p',
          text: 'The mean Sun moves along the equator at the rate of $L$, so the equation of time, the angle by which the true Sun leads it, is $E = L - \\alpha$. Converted at four minutes of time per degree, and split by adding and subtracting $\\lambda$:',
        },
        { type: 'math', tex: 'E = (L - \\lambda) + (\\lambda - \\alpha) = E_{\\text{ellipse}} + E_{\\text{tilt}}', label: '(4)', caption: 'The first part is minus the equation of the centre; the second is the *reduction to the equator*. Each can be switched off on its own: set the eccentricity to zero and $\\lambda = L$; set the tilt to zero and $\\alpha = \\lambda$, $\\delta = 0$.' },
        {
          type: 'p',
          text: 'To first order these are the two waves of the figure above. With eccentricity $e = 0.0167$, the equation of the centre is about $2e\\sin g$ radians, an amplitude of $2e \\times 229.2 = 7.7$ minutes; the reduction to the equator is about $\\tan^2(\\varepsilon/2)\\sin 2\\lambda$, an amplitude of $0.0430 \\times 229.2 = 9.9$ minutes, where 229.2 is the number of minutes of time in a radian:',
        },
        { type: 'math', tex: 'E \\approx -7.7\\sin g + 9.9\\sin 2\\lambda \\quad \\text{minutes}', label: '(5)' },
        { type: 'h', text: 'From the Sun to the sky' },
        {
          type: 'p',
          text: 'At clock time $t$ on the reference meridian, the true Sun’s hour angle, its angle west of the meridian, is $H = 15°(t - 12\\text{ h}) + E$, the second term turned from minutes into degrees. For an observer at latitude $\\phi$ the Sun’s direction, in east, north and up components, is',
        },
        { type: 'math', tex: '(e, n, u) = (-\\cos\\delta\\sin H,\\; \\cos\\phi\\sin\\delta - \\sin\\phi\\cos\\delta\\cos H,\\; \\sin\\phi\\sin\\delta + \\cos\\phi\\cos\\delta\\cos H)', label: '(6)' },
        {
          type: 'p',
          text: 'Its altitude is $\\operatorname{arcsin} u$. To draw the sky, the piece uses a projection that behaves well through the zenith. Facing the equator (south for northern observers), the horizontal coordinate is the angle out of the meridian plane, $x = \\operatorname{arcsin}(-e)$, and the vertical one is the angle above the forward horizon measured around the east–west line, $y = \\operatorname{atan2}(u, -n)$. Along the meridian $y$ is the altitude, so the noon figure is drawn at its true angular size; past the zenith $y$ simply keeps increasing into the northern sky. It is a cylindrical projection with its axis along the east–west line, so the celestial equator comes out as a straight horizontal line, which you can see in the drawing.',
        },
        { type: 'h', text: 'The sundial' },
        {
          type: 'p',
          text: 'A horizontal sundial at latitude $\\phi$ has its gnomon’s edge, the style, parallel to the Earth’s axis. The style’s shadow on the level plate makes an angle $\\theta$ with the noon line given by',
        },
        { type: 'math', tex: '\\tan\\theta = \\sin\\phi\\,\\tan H', label: '(7)', caption: 'At the poles the hour lines are evenly spaced, 15° apart; toward the equator they crowd into the noon line, which is why a tropical horizontal dial is hard to read.' },
        {
          type: 'p',
          text: 'At clock noon, $H$ is just the equation of time in degrees, a few degrees at most, and at Greenwich $\\sin\\phi = 0.78$, so the noon shadow swings only about three degrees either way through the year. The piece adds a magnified scale above the dial so the drift reads in minutes.',
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'How the piece works',
      title: 'A year of noons, computed',
      blocks: [
        {
          type: 'p',
          text: 'Analemma is a single canvas module. Every frame it computes the Sun for all 365 days at the current clock time and latitude, about a millisecond of arithmetic, and draws the composite, the charts and the dial from those positions. Nothing is stored except your latitude, clock time and whether the causes are shown, so the whole film can be scrubbed, and every change you make redraws the year at once.',
        },
        {
          type: 'code',
          code: `function sunAt(day: number, hour: number, kE = 1, kT = 1, out?: Sun): Sun {
  const n = N0 + (day - 1) + hour / 24          // days from J2000.0
  const L = 280.46 + 0.9856474 * n                // mean longitude
  const g = (357.528 + 0.9856003 * n) * DEG       // mean anomaly
  const C = kE * (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) // the ellipse
  const lam = (L + C) * DEG                       // true longitude
  const eps = kT * (23.439 - 0.0000004 * n) * DEG  // the tilt
  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / DEG
  const o = out ?? { eot: 0, ecc: 0, obl: 0, dec: 0 }
  o.ecc = -C * 4                                  // minutes
  o.obl = wrap180(lam / DEG - alpha) * 4
  o.eot = o.ecc + o.obl
  o.dec = Math.asin(Math.sin(eps) * Math.sin(lam))
  return o
}`,
          caption: 'Equations (1) to (4). `kE` and `kT` scale the eccentricity and the tilt so that chapter III can switch each cause off; at 1 and 1 they are the real Sun.',
        },
        {
          type: 'p',
          text: 'The year is 2026, counted from 1 January at 0 h Universal Time, and the clock is mean time on the reference meridian, so 12:00 means mean noon at the observer: there are no time zones and no daylight saving. The positions go through the projection of equation (6):',
        },
        {
          type: 'code',
          code: `function skyXY(dec: number, H: number, lat: number, out: { x: number; y: number }) {
  const cd = Math.cos(dec)
  const east = -cd * Math.sin(H)
  const north = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * cd * Math.cos(H)
  const up = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * cd * Math.cos(H)
  if (lat >= 0) {
    // facing south: west is on the right
    out.x = Math.asin(clamp(-east, -1, 1)) / DEG
    out.y = Math.atan2(up, -north) / DEG
  } else {
    // facing north: east is on the right
    out.x = Math.asin(clamp(east, -1, 1)) / DEG
    out.y = Math.atan2(up, north) / DEG
  }
  return out
}`,
          caption: 'Angles out of the meridian plane, and around the east–west axis from the horizon you face.',
        },
        {
          type: 'p',
          text: 'The view then fits itself to the figure: the scale is chosen so the top of the analemma (or 62°, whichever is higher) clears the top of the sky panel, and the centre pans only if the figure would leave the frame, both eased so that dragging feels smooth. The landscape, with its church on the meridian, is drawn in the same angular coordinates, so it pans and scales with the sky.',
        },
        { type: 'h', text: 'The composite' },
        {
          type: 'p',
          text: 'In chapter II the day runs from 11 February (where chapter I leaves it, at the deepest point of the equation of time) to the end of the year at about ten days a second. A hairline joins every day so far, and every fifth day is stamped as a small hatched disc, the way a time-lapse photograph is built. Each disc is hatched with three chords computed directly rather than by clipping, so seventy-three of them cost almost nothing. The faint figures for the other whole hours, from 09:00 to 15:00, are computed the same way and cached until the latitude or the causes change.',
        },
        {
          type: 'p',
          text: 'The *causes* in chapter III morph the year rather than replace it: the eccentricity weight eases to zero, leaving a circular orbit and a symmetric figure eight with equal loops; then the eccentricity returns and the tilt goes, and the figure collapses onto the celestial equator as a short horizontal bar, since without the tilt the Sun never leaves the equator and only the ellipse moves it east and west. The charts, the readouts and the dial all follow the same weights.',
        },
        { type: 'h', text: 'The dial' },
        {
          type: 'code',
          code: `// the Sun's hour angle at this clock time; the style's shadow makes an
// angle θ with the noon line where tan θ = sin φ tan H
const H = (15 * (clock - 12) + s.eot / 4) * DEG
const ang = (hourA: number) => Math.atan2(sphi * Math.sin(hourA), Math.cos(hourA))
// hour lines, 06:00 to 18:00
for (let hr = 6; hr <= 18; hr++) {
  const a = ang((hr - 12) * 15 * DEG)
  ctx.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0)
  ctx.lineTo(cx + Math.sin(a) * R * 0.92, cy - Math.cos(a) * R * 0.92)
}`,
          caption: 'Equation (7). The same function draws the hour lines and places the shadow, so in the southern hemisphere the dial mirrors itself.',
        },
        { type: 'h', text: 'Sound' },
        {
          type: 'p',
          text: 'With sound on, every stamped disc makes a soft click and a sine note whose pitch comes from that day’s equation of time on a D-major pentatonic scale: high when the dial is fast, low when it is slow. Through chapter II the notes trace the curve: down into February, up for May, down for July and up to the long November high. Each change of cause in chapter III is marked by a low tone, and the return of both causes by a chord.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Every mark on the plate',
      blocks: [
        {
          type: 'list',
          items: [
            '**The sky:** the dotted vertical is the meridian; the dashed arcs are the Sun’s paths across the sky on the June solstice, the equinoxes and the December solstice; the blue dotted arc is today’s path. The scale on the right is altitude, with *N* or *S* marks past the zenith.',
            '**The composite:** a hairline through every day’s noon, a hatched disc every five days, and today’s Sun with rays and its date. In chapter I a dashed circle marks where the Sun would be at true noon, with the offset dimensioned in minutes.',
            '**Landmarks:** once the year is complete, the solstices at the ends and the two extremes of the equation of time, on 11 February and 3 November.',
            '**Faint figures:** the same year photographed at 09:00, 10:00, 11:00, 13:00, 14:00 and 15:00, leaning more the further they are from noon.',
            '**The equation of time chart:** sundial minus clock through the year, with dots on the four days it is zero. In chapter III, or when you tap the sky, the fern dashes are the ellipse’s part and the blue dots the tilt’s.',
            '**The declination chart:** the Sun’s angle north or south of the equator, between the dotted lines at ±23.44°.',
            '**The sundial:** a horizontal dial in plan, its hour lines from 06:00 to 18:00, the style along the noon line and its shadow; above it a magnified scale from −20 to +20 minutes with a blue pointer; below it the time the dial reads and the time the clock reads.',
            '**Readouts:** date, dial minus clock, declination, latitude and clock time.',
          ],
        },
        {
          type: 'p',
          text: 'The beats: chapter I holds clock noon while January runs into February, and the Sun slips away from the meridian until it is fourteen minutes late. Chapter II builds the figure, disc by disc, and draws the two curves beneath it. Chapter III takes it apart, first the ellipse and then the tilt, and puts it back. Chapter IV brings the dial forward while one more year runs around the finished figure, and the loop ends as the exposure clears.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'Approximations and omissions',
      blocks: [
        {
          type: 'list',
          items: [
            '**Low-precision astronomy.** The Almanac formulae ignore nutation, aberration and the planets’ small pulls; they place the Sun to about 0.01° between 1950 and 2050, which keeps the equation of time well inside a minute (in practice within a few tens of seconds). One year, 2026, stands for all; leap years and the slow drift of perihelion change the figure only slightly from year to year.',
            '**No refraction.** The atmosphere lifts the Sun by about half a degree at the horizon. The piece draws geometric positions, so low winter Suns at high latitudes sit a little lower than they would appear.',
            '**Local mean time.** Real clocks keep zone time, which shifts the whole figure east or west by the difference between your longitude and your zone’s meridian, and daylight saving shifts half the year by an hour. The piece sets the clock to mean time on the observer’s own meridian.',
            '**Enlarged discs.** The Sun is half a degree across; the discs are drawn about twice that so they read at screen sizes.',
            '**The projection.** Any flat picture of the sky distorts something. Near the meridian this one is true to angle, so the noon figure has its real shape; the faint hour figures far to either side are stretched upward somewhat.',
            '**A diagram, not a photograph.** The landscape is schematic and the hour figures, day paths and dial are annotation. A photograph at noon would show only the one figure.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'The Astronomical Almanac', by: 'U.S. Naval Observatory and HM Nautical Almanac Office', note: 'Section C gives the low-precision formulae for the Sun used here, with their accuracy.' },
    { title: 'Astronomical Algorithms', by: 'Jean Meeus', year: '1991', note: 'Willmann-Bell. The equation of time, solar coordinates and their higher-precision forms.' },
    { title: 'The equation of time', by: 'D. W. Hughes, B. D. Yallop & C. Y. Hohenkerk', year: '1989', note: '*Monthly Notices of the Royal Astronomical Society* 238. A careful modern treatment of both causes.' },
    { title: 'Sundials: Their Theory and Construction', by: 'Albert E. Waugh', year: '1973', note: 'Dover. Hour-line formulae for horizontal and other dials, and correcting a dial with the equation of time.' },
    { title: 'Fourier series representation of the position of the sun', by: 'J. W. Spencer', year: '1971', note: '*Search* 2. The compact series for declination and the equation of time that many solar calculators use.' },
  ],
}

export default guide
