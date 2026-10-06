import type { Guide } from '../guide'

const parallaxFigure = `<svg viewBox="0 0 420 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <ellipse cx="110" cy="160" rx="70" ry="22" opacity="0.5"/>
  <circle cx="110" cy="160" r="5" fill="currentColor" stroke="none"/>
  <circle cx="40" cy="160" r="3.5"/>
  <circle cx="180" cy="160" r="3.5"/>
  <circle cx="330" cy="40" r="4" fill="#7FB6D9" stroke="none"/>
  <line x1="40" y1="160" x2="330" y2="40" stroke-dasharray="3 3"/>
  <line x1="180" y1="160" x2="330" y2="40" stroke-dasharray="3 3"/>
  <line x1="110" y1="160" x2="330" y2="40" opacity="0.35"/>
  <path d="M300 54 A34 34 0 0 1 306 60" stroke="#2B6A93"/>
  <text x="270" y="78" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" letter-spacing="1">2p</text>
  <line x1="40" y1="186" x2="180" y2="186"/>
  <line x1="40" y1="181" x2="40" y2="191"/>
  <line x1="180" y1="181" x2="180" y2="191"/>
  <text x="74" y="204" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">2 AU · SIX MONTHS</text>
  <text x="22" y="148" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">JAN</text>
  <text x="170" y="148" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">JUL</text>
  <text x="100" y="177" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">SUN</text>
  <text x="340" y="36" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">STAR</text>
  <text x="250" y="150" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">d = 1 / p</text>
  <text x="250" y="166" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">p in arcseconds, d in parsecs</text>
</svg>`

const coneFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="40" cy="100" r="5"/>
  <line x1="35" y1="100" x2="45" y2="100"/>
  <line x1="40" y1="95" x2="40" y2="105"/>
  <text x="22" y="124" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">YOU</text>
  <path d="M271.3 0 A252 252 0 0 1 271.3 200" stroke="#7FB6D9"/>
  <path d="M171 0 A160 160 0 0 1 171 200" stroke="#7FB6D9" opacity="0.3" stroke-dasharray="2 4"/>
  <circle cx="150" cy="60" r="3" fill="currentColor" stroke="none"/>
  <circle cx="290" cy="130" r="3" fill="currentColor" stroke="none"/>
  <circle cx="380" cy="80" r="3" fill="currentColor" stroke="none"/>
  <line x1="40" y1="100" x2="150" y2="60" stroke-dasharray="1.5 3"/>
  <line x1="40" y1="100" x2="290" y2="130" stroke-dasharray="1.5 3"/>
  <line x1="40" y1="100" x2="380" y2="80" stroke-dasharray="1.5 3"/>
  <text x="156" y="52" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.75">250 LY · LEFT 1780</text>
  <text x="250" y="150" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.75">860 LY · LEFT 1170</text>
  <text x="300" y="70" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.75">1,300 LY</text>
  <text x="212" y="190" font-family="Geist Mono, monospace" font-size="9" fill="#7FB6D9" stroke="none">THE SPHERE OF LIGHT THAT REACHES YOU TONIGHT</text>
</svg>`

const guide: Guide = {
  lede: 'A constellation is an accident of where we stand. Seen from Earth, seven bright stars make a hunter; placed at their real distances and seen from the side, they are strangers hundreds of light-years apart, and the light that draws the figure left each of them in a different century.',
  facts: [
    ['Stars', 'Betelgeuse, Rigel, Bellatrix, Mintaka, Alnilam, Alnitak, Saiph'],
    ['Positions', 'J2000 right ascension and declination'],
    ['Nearest', 'Bellatrix, about 250 light-years'],
    ['Farthest', 'Alnilam, published estimates 1,250 to 2,000 ly (1,300 used)'],
    ['Shoulders', '7.5° apart on the sky, about 300 ly apart in space'],
    ['Light-time', 'Rigel’s light left around 1170; Bellatrix’s around 1780'],
    ['Color', 'Planck’s law at each star’s temperature, seen through the CIE 1931 observer'],
    ['Camera', 'Pinhole perspective, orbiting a point 760 ly along the line of sight'],
    ['Running time', '64 s in four chapters, looping'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Previous or next chapter' }],
    gestures: [
      { gesture: 'drag', action: 'Orbit the camera anywhere around the stars; the clock waits while you look' },
      { gesture: 'tap', action: 'Tap a star for its card: type, temperature, distance and when its light left' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'In the first chapter, drag a little to the side and watch the figure come apart: the near shoulder, Bellatrix, swings the most. That is parallax, the effect astronomers use to measure the distances.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Astronomy',
      title: 'A pattern seen from one place',
      blocks: [
        {
          type: 'p',
          text: 'Orion is one of the few constellations most people can find without help. Two bright shoulders, a belt of three stars in a short straight line, two feet below: an hourglass that has been read as a figure for thousands of years. To the Greeks it was the hunter Orion; in ancient Egypt the same stars were associated with Sah, linked to Osiris; for the Yolŋu people of Arnhem Land in northern Australia the belt and sword are a canoe, Djulpan, with three brothers sitting in it. The figure changes with the storyteller, but the pattern is the same everywhere on Earth, because everyone on Earth sees the stars from very nearly the same place.',
        },
        {
          type: 'p',
          text: 'That is the whole point of this piece. A constellation is not an object. It is a direction, or rather a set of directions that happen to fall close together as seen from the Sun’s neighborhood. The stars in it can be at wildly different distances, moving in different directions, unrelated in age and origin. From anywhere else in the galaxy the same seven stars would scatter across the sky into other patterns, or into no pattern at all.',
        },
        {
          type: 'p',
          text: 'Modern astronomy keeps the old names but treats the constellations as regions of the sky, like states on a map. The International Astronomical Union adopted a list of 88 constellations in 1922, and the Belgian astronomer Eugène Delporte drew their official boundaries, along lines of right ascension and declination, in 1930. Inside Orion’s region are hundreds of stars visible to the naked eye on a dark night, a great molecular cloud, and the Orion Nebula, one of the nearest places where stars are being born. The stick figure joins only the brightest few.',
        },
        { type: 'h', text: 'Strangers, mostly' },
        {
          type: 'p',
          text: 'Placed at their measured distances, the seven bright stars stretch along the line of sight from about 250 light-years (Bellatrix, the western shoulder) to well over 1,000 (the three belt stars). The two shoulders, 7.5° apart on the sky, are about 300 light-years apart in space: Betelgeuse is more than twice as far away as Bellatrix. Rigel, the bright western foot, is farther than Betelgeuse; Saiph, the eastern foot, is in between. The hunter is a projection of an elongated swarm of stars onto the inside of the sky, the way a cloud of moths would make a shape on a window if you looked through it from one spot.',
        },
        {
          type: 'p',
          text: 'There is one honest exception, and the piece keeps it. The three belt stars, and the Orion Nebula below them, really are related. They belong to the Orion OB1 association, a loose family of massive young stars that formed from the same complex of gas over the last ten million years or so, and they lie at broadly similar distances of around 1,200 to 1,400 light-years. So the figure is a mixture: a family in the middle, framed by strangers in front of it.',
        },
        {
          type: 'aside',
          title: 'Not forever, either',
          text: 'The stars also move across the sky, slowly. Over tens or hundreds of thousands of years their proper motions will distort the hourglass, and the massive stars in it will not last that long: Betelgeuse is expected to end as a supernova, probably within the next hundred thousand years. The figure is a moment in a very long film.',
        },
      ],
    },
    {
      id: 'distance',
      kicker: 'Measurement',
      title: 'How far away is a star?',
      blocks: [
        {
          type: 'p',
          text: 'The most direct method is parallax, the same geometry your eyes use for depth. As the Earth goes round the Sun, a nearby star appears to shift slightly against much more distant background stars, tracing a tiny ellipse once a year. Half the width of that shift, the angle subtended at the star by the radius of the Earth’s orbit, is the parallax $p$. If $p$ is measured in arcseconds, the distance in parsecs is simply its reciprocal:',
        },
        { type: 'math', tex: 'd = \\frac{1}{p}, \\qquad 1\\ \\text{pc} = 3.2616\\ \\text{ly} \\approx 206\\,265\\ \\text{AU}', label: '(1)', caption: 'The parsec is the distance at which one astronomical unit subtends one arcsecond.' },
        { type: 'figure', svg: parallaxFigure, alt: 'The Earth at two points of its orbit six months apart, the lines of sight to a nearby star, and the parallax angle between them.', caption: 'Parallax: the star’s direction changes by $2p$ over six months. The angles are tiny: even the nearest stars shift by less than an arcsecond.' },
        {
          type: 'p',
          text: 'The angles are almost unimaginably small. The first successful measurement, by Friedrich Wilhelm Bessel in 1838, found a parallax of about 0.31 arcseconds for the star 61 Cygni, the width of a small coin seen from more than ten kilometers away. Thomas Henderson (Alpha Centauri) and Friedrich Georg Wilhelm von Struve (Vega) published results at almost the same time. Before that the distances to the stars were guesses; afterwards they were measurements, and the universe was suddenly, provably, enormous.',
        },
        {
          type: 'p',
          text: 'From the ground, parallax works well only for stars within a few hundred light-years. The European Space Agency’s Hipparcos satellite, operating from 1989 to 1993, measured parallaxes to about a milliarcsecond for some 118,000 stars, and a careful re-reduction of its data by Floor van Leeuwen in 2007 is still the source of several distances in this piece. Its successor Gaia, launched in 2013, has measured more than a billion stars with far greater precision, but the very brightest stars saturate its detectors, and Orion’s bright stars are among them. For these, Hipparcos values and indirect methods remain the best available.',
        },
        { type: 'h', text: 'When the numbers disagree' },
        {
          type: 'p',
          text: 'Parallax gets hard beyond about a thousand light-years, where the angle falls to a few milliarcseconds and small systematic errors matter. Several of Orion’s stars are also multiple systems, whose orbital wobble can masquerade as parallax. Astronomers then turn to other evidence: the distance of the cluster a star belongs to, the orbit of a resolved binary (which gives masses and therefore luminosities), or models of how a star of a given mass and temperature should shine. The results do not always agree, and the table below gives the values the piece uses together with the spread of published estimates, which the drawing shows as soft bands along each line of sight.',
        },
        {
          type: 'table',
          head: ['Star', 'Class', 'Temp., K', 'Distance (range), ly', 'Left'],
          rows: [
            ['Bellatrix', 'B2 III', '22,000', '250 (240–260)', '1780'],
            ['Betelgeuse', 'M1–M2 Ia–ab', '3,600', '548 (500–720)', '1480'],
            ['Saiph', 'B0.5 Ia', '26,000', '650 (620–680)', '1380'],
            ['Rigel', 'B8 Ia', '12,100', '860 (780–1,010)', '1170'],
            ['Mintaka', 'O9.5 II', '30,000', '1,200 (690–1,250)', '830'],
            ['Alnitak', 'O9.5 Iab', '29,500', '1,260 (740–1,440)', '770'],
            ['Alnilam', 'B0 Ia', '27,000', '1,300 (1,250–2,000)', '730'],
          ],
          caption: 'Temperatures are approximate (the primary star, for the multiple systems). The year the light left is for 2026, rounded to the nearest ten; the piece computes it from the current year. Ranges are the spread of commonly cited values, not formal error bars.',
        },
        {
          type: 'p',
          text: 'A few notes on the table. Betelgeuse’s 548 light-years comes from Meridith Joyce and colleagues in 2020, who combined stellar evolution models with the star’s pulsations; an astrometric solution by Graham Harper and colleagues in 2017 gave about 720. Rigel’s 860 is the Hipparcos 2007 parallax of 3.78 ± 0.34 milliarcseconds; its fainter companion, Rigel B, has a Gaia parallax suggesting nearer 1,000. For the belt the old Hipparcos parallaxes put Mintaka and Alnitak at about 700 light-years and Alnilam anywhere from about 1,340 to 2,000 (the two Hipparcos reductions disagree), while recent work on their orbits and on the association they belong to places all three together near 1,200 to 1,300. The piece follows the recent work and shows the old values as the ends of the bands.',
        },
      ],
    },
    {
      id: 'stars',
      kicker: 'Astrophysics',
      title: 'Every star is a temperature',
      blocks: [
        {
          type: 'p',
          text: 'A star’s color is set mainly by the temperature of its visible surface, the photosphere, which glows very nearly like a blackbody. Planck’s law gives the spectrum of that glow; the eye integrates it into a color. Cool stars, around 3,500 K, peak in the infrared and look orange; the Sun, near 5,800 K, looks white; hot stars of 20,000 K and more peak in the ultraviolet and look blue-white. The piece colors each star by computing its blackbody spectrum, weighting it by the CIE 1931 color-matching functions to get XYZ, and converting to sRGB with the brightest channel normalized to one:',
        },
        { type: 'math', tex: 'B_\\lambda(T) = \\frac{2hc^2}{\\lambda^5} \\cdot \\frac{1}{\\exp(hc / \\lambda k T) - 1}', label: '(2)' },
        { type: 'math', tex: 'X = \\int B_\\lambda(T)\\,\\bar{x}(\\lambda)\\,d\\lambda', label: '', caption: '$h$ is Planck’s constant, $c$ the speed of light, $k$ Boltzmann’s constant, $\\lambda$ the wavelength and $\\bar{x}$ one of the three color-matching functions ($Y$ and $Z$ use $\\bar{y}$ and $\\bar{z}$).' },
        {
          type: 'p',
          text: 'That is why the stars of Orion look as they do: six of the seven are hot, blue-white giants and supergiants of spectral types O and B, and one, Betelgeuse, is a cool red supergiant. Above about 20,000 K blackbody colors change very little, so the five hottest stars are almost the same pale blue in the drawing, which is true to the eye. The spectral letters come from the Harvard classification (O, B, A, F, G, K, M, from hot to cool) organized by Annie Jump Cannon in the early twentieth century; the Roman numerals are the Morgan–Keenan luminosity classes of 1943, where I means a supergiant (Ia the most luminous), III a giant and V a main-sequence dwarf like the Sun.',
        },
        { type: 'h', text: 'Brightness and distance' },
        {
          type: 'p',
          text: 'How bright a star looks depends on how luminous it is and how far away. Astronomers write brightness as a magnitude, a logarithmic scale on which larger numbers are fainter and five magnitudes is a factor of 100. The apparent magnitude $m$ and the absolute magnitude $M$, the magnitude the star would have at 10 parsecs, are related by the distance modulus:',
        },
        { type: 'math', tex: 'm - M = 5 \\log_{10} \\frac{d}{10\\ \\text{pc}}', label: '(3)' },
        {
          type: 'p',
          text: 'The piece uses this twice. From each star’s apparent magnitude as seen from Earth and its distance it computes an absolute magnitude, and then, wherever the camera is, the magnitude the star would have from there. Seen from Earth, Bellatrix is about as bright as the belt stars; seen from the side, at a similar distance from all of them, it is the faintest of the seven by a wide margin, because it is the least luminous and only looks bright from here because it is near. Rigel, more than fifty thousand times as luminous as the Sun, outshines the rest from almost anywhere.',
        },
        { type: 'h', text: 'Betelgeuse and the Great Dimming' },
        {
          type: 'p',
          text: 'Betelgeuse is a pulsating variable, usually around magnitude 0.5. In late 2019 it began to fade, and by February 2020 it had dropped to about magnitude 1.6, losing roughly two thirds of its visible light, the faintest it had been in more than a century of careful observation. There was a flurry of speculation that it was about to explode. It was not. Observations with the Hubble Space Telescope (Andrea Dupree and colleagues) showed a large outflow of hot material from the star’s surface in 2019, and images from the Very Large Telescope (Miguel Montargès and colleagues, published in 2021) showed the southern part of the star darkened, consistent with a cloud of dust that condensed from that ejected gas and veiled part of the star from us. By the spring of 2020 it had recovered.',
        },
      ],
    },
    {
      id: 'light',
      kicker: 'Physics',
      title: 'You are looking at the past',
      blocks: [
        {
          type: 'p',
          text: 'A light-year is the distance light travels in a year, about 9.46 trillion kilometers. So a star $d$ light-years away is seen by light that left it $d$ years ago. The light from Bellatrix that reaches your eye tonight set out around 1780; the light from Rigel set out in the twelfth century, around 1170; the light from the belt left in the eighth and ninth centuries. The figure you recognize is assembled from light of many different ages, all arriving at once.',
        },
        {
          type: 'p',
          text: 'There is a lovely way to see this. Think of every photon that will enter your eye at one particular moment tonight. A year earlier, all of them were one light-year away, on a sphere one light-year in radius centered on you. A century earlier they were on a sphere a hundred light-years across; in the year 1000 they were on a sphere about a thousand light-years out. Each star contributes to tonight’s view at exactly the moment that shrinking sphere passes through it. In relativity this sphere, traced through time, is your past light cone: everything you can see is on it, and nothing you can see is anywhere else.',
        },
        { type: 'math', tex: 'r(Y) = c\\,(Y_{\\text{now}} - Y)', label: '(4)' },
        { type: 'math', tex: 'r(Y) = d \\;\\Rightarrow\\; Y = Y_{\\text{now}} - d/c', label: '', caption: 'A star at distance $d$ joins tonight’s view in the year when the sphere’s radius equals $d$.' },
        { type: 'figure', svg: coneFigure, alt: 'You at the left, three stars at different distances, and a circle centered on you passing through them.', caption: 'The light that will reach you tonight lies, in any earlier year, on one sphere centered on you. It sweeps inward at the speed of light and collects each star as it passes.' },
        {
          type: 'p',
          text: 'That is chapter III of the piece, drawn literally. A year clock runs from the seventh century to tonight; the sphere of tonight’s light shrinks toward Earth; as it reaches each star the star rings and its photon sets out along its line of sight, labelled with its year. Every photon rides the same sphere, so they all arrive together, which is the only reason the hunter exists at all.',
        },
        {
          type: 'aside',
          title: 'Checking the arithmetic',
          text: 'For Rigel at 860 light-years, viewed in 2026: 2026 − 860 = 1166, which the piece rounds to about 1170. With the distance uncertain by 80 light-years or so, the honest statement is the twelfth century, give or take a lifetime. The piece computes every year from the current date, so the numbers stay right as time passes.',
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
          text: 'Orion in Depth is a single TypeScript module drawing to one canvas with the Canvas 2D API, on the site’s dark night ground. It is a pure function of time: given a moment $T$ in the 64-second loop, the camera, every star, every label and the sphere of light are computed from scratch. That makes it seekable (the arrow keys and the ruler jump between chapters) and testable. The only state that builds up is yours: an orbit offset while you drag, and the card you opened.',
        },
        { type: 'h', text: 'Putting the stars in space' },
        {
          type: 'p',
          text: 'Each star’s J2000 right ascension $\\alpha$ and declination $\\delta$ become a unit vector in equatorial coordinates, and its distance places it along that vector. Its absolute magnitude follows from its apparent magnitude by equation (3), and its color from its temperature by equation (2), using the color science shared by the Playground’s color studies:',
        },
        {
          type: 'code',
          code: `const dir = (raDeg: number, decDeg: number): V3 => {
  const a = raDeg * deg
  const d = decDeg * deg
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]
}
const stars = STARS.map((s) => {
  const u = dir(s.ra, s.dec)
  const M = s.V - 5 * Math.log10(s.d / LY_PER_PC / 10)
  const [r, g, b] = blackbody(s.T)
  return { ...s, u, p: scl(u, s.d), M, col: css([r, g, b]), year: departYear(s.d) }
})`,
          caption: 'From catalog values to a position in light-years, an absolute magnitude and a color.',
        },
        { type: 'h', text: 'The camera' },
        {
          type: 'p',
          text: 'The view from Earth looks along $\\mathbf{f}_0$, the direction of the middle of the figure, with celestial north up and east to the left, as the sky appears to someone facing south. The camera orbits a pivot 760 light-years out along that line. At the start of each loop it sits exactly at Earth, so the projection is the real sky. The script turns it 82° about the vertical and tilts it 24° from above (in a portrait frame it turns about the horizontal instead, so depth runs up the screen), and your drag adds a further yaw and pitch. As the view direction leaves Earth’s, the camera also backs away and narrows its field, a dolly zoom that keeps the figure the same size while the perspective flattens toward an engineer’s side elevation:',
        },
        {
          type: 'code',
          code: `// how far the view direction has left Earth's: drives the dolly and the framing
const ang = Math.acos(clamp(dot(f, F0), -1, 1))
const s = smoothstep(0, 1, clamp(ang / (80 * deg)))
const Rc = PIVOT * Math.pow(5.2, s)          // camera distance from the pivot
const k = k0 * Math.pow(k1 / k0, s)           // pixels per light-year at the pivot
cam.c = [P[0] - f[0] * Rc, P[1] - f[1] * Rc, P[2] - f[2] * Rc]
cam.F = k * Rc                                 // focal length, so the pivot keeps scale k`,
          caption: 'The dolly. At $s = 0$ the camera is at Earth; at $s = 1$ it is five times farther out, looking from the side.',
        },
        {
          type: 'p',
          text: 'Projection is the pinhole camera. A point $\\mathbf{p}$ is expressed relative to the camera position $\\mathbf{c}$ in the camera’s right, up and forward axes, and divided by its depth:',
        },
        { type: 'math', tex: 'x_s = x_0 + F\\,\\frac{(\\mathbf{p} - \\mathbf{c}) \\cdot \\mathbf{r}}{(\\mathbf{p} - \\mathbf{c}) \\cdot \\mathbf{f}}', label: '(5)' },
        { type: 'math', tex: 'y_s = y_0 - F\\,\\frac{(\\mathbf{p} - \\mathbf{c}) \\cdot \\mathbf{u}}{(\\mathbf{p} - \\mathbf{c}) \\cdot \\mathbf{f}}', label: '', caption: '$F$ is the focal length in pixels and $(x_0, y_0)$ the screen position of the pivot. Points behind the camera are skipped.' },
        {
          type: 'p',
          text: 'Straight lines project to straight lines, so the figure’s hairlines are simply drawn between projected stars. The rays from Earth, the distance ruler, the drop lines, the bands of published distances, the Orion Nebula and the dimension between the shoulders are all real 3D objects pushed through the same projection, which is why they stay consistent as you orbit. The celestial grid is projected from points a million light-years away, where only the camera’s rotation matters, and it fades as soon as the camera leaves Earth, since it means nothing anywhere else.',
        },
        { type: 'h', text: 'The sphere of light' },
        {
          type: 'p',
          text: 'In chapter III the radius $r$ of tonight’s light-sphere eases from 1,440 light-years to zero. It is drawn as the circle of that radius around Earth in the plane facing the camera, which is the sphere’s outline for a distant camera. Each star whose distance exceeds $r$ has already been reached, and its photon is drawn at distance $r$ along its own ray, so all of them lie on the sphere, exactly as equation (4) says:',
        },
        {
          type: 'code',
          code: `for (let i = 0; i < stars.length; i++) {
  const st = stars[i]
  if (rho > st.d) continue                        // the sphere has not reached it yet
  const head = scl(st.u, Math.max(0, rho))         // this star's photon, on the sphere
  const tail = scl(st.u, Math.min(st.d, rho + 90)) // a short streak back toward the star
  if (!project(head)) continue
  // … the streak from tail to head, fading, and a dot at the head …
  // the moment of departure: a ring at the star
  const since = (st.d - rho) / 110
  if (since < 1 && SOK[i]) {
    ctx.globalAlpha = (1 - since) * lightA
    ctx.beginPath()
    ctx.arc(SX[i], SY[i], SR[i] + 4 + since * 22, 0, TAU)
    ctx.stroke()
  }
}`,
          caption: 'Photons on the sphere (trimmed). The big year numeral is simply $Y_{\\text{now}} - r$.',
        },
        { type: 'h', text: 'Stars, labels and sound' },
        {
          type: 'p',
          text: 'Each star is drawn as a small colored bloom (a radial gradient), a disc in its blackbody color and a white core, sized from its magnitude as seen from the camera with an automatic exposure, so the brightness ratios stay physical while the overall level stays readable. There is no blur filter. Labels are placed greedily, brightest star first, in the first of eight positions around the star that collides with nothing already drawn, and each label remembers its last position so it does not hop between frames. With sound on, each star plays a note when it appears and again when the sphere of light leaves it, pitched by its temperature in a D major pentatonic scale: Betelgeuse is the lowest note, the hot O-type belt stars the highest.',
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
            '**I · From here (0–14 s).** The faint field and the celestial grid, then the seven stars in order of brightness, then the hourglass. The dimension between the shoulders is their angle on the sky, 7.5°. Top right: the direction of the view and its field.',
            '**II · Strangers (14–32 s).** The camera swings round. Dotted lines from Earth (the ringed cross) to each star are lines of sight; the ruler runs from 0 to 1,500 light-years along Earth’s line of sight, and each star drops a dotted line to its place on it, marked in its own color. The soft bands along the rays are the spread of published distances. The same shoulders are now dimensioned in light-years.',
            '**III · The past (32–47 s).** The pale blue circle is the sphere of light that will reach you tonight. The year numeral is the year it describes; as the sphere passes a star, the star rings, its photon sets off toward you, and its label gains the year its light left.',
            '**IV · Tonight (47–64 s).** The camera comes home and the figure reassembles, each star still labelled with its distance and the year of its light. Then the labels and lines fade and the loop begins again.',
            '**A star’s card.** Name and Bayer letter, type and spectral class, temperature with a swatch of its color, the distance used, the range of published values, and when its light left.',
            '**Bottom ruler.** The 64-second timeline with the four chapter numerals and a playhead. Tap it to jump.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the first second of the swing, when Bellatrix, the nearest star, slides much faster than the rest; the moment the belt stars, which looked like neighbors of the shoulders, turn out to be four times farther than Bellatrix; and the end of chapter III, when seven photons that left in seven different centuries arrive together and make a hunter.',
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
            '**Distances are uncertain**, some of them badly. The piece commits to one value per star (see the table) and shows the published spread as a band; another choice would change the picture in detail, though not in kind.',
            '**The field stars are invented.** The faint dots in the background are placed at random in the right part of the sky to suggest a starfield, and they fade when the camera leaves Earth because their distances would be made up. The real region holds many more stars, and dust and gas.',
            '**Interstellar extinction is ignored.** Dust dims and reddens distant starlight; the brightness calculation uses the catalog magnitudes as if space were clear.',
            '**Multiple stars are drawn as one.** Mintaka, Alnitak and Rigel are systems of several stars; the piece uses the primary’s temperature and the system’s combined brightness.',
            '**Positions are now, light is then.** The stars have moved a little since their light left; the drawing places them at their J2000 positions. Over a few centuries the shift is far smaller than the distance uncertainties.',
            '**Sizes are not to scale.** A star is a point at these distances; the discs are a chart’s symbols, scaled by brightness. Earth stands in for the Sun, which differs by eight light-minutes.',
            '**The years are rounded** to the nearest ten, which is still more precision than the distances support.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Bestimmung der Entfernung des 61sten Sterns des Schwans', by: 'Friedrich Wilhelm Bessel', year: '1838', note: '*Astronomische Nachrichten* 16. The first stellar parallax.' },
    { title: 'Parallax: The Race to Measure the Cosmos', by: 'Alan W. Hirshfeld', year: '2001', note: 'The story of the race that Bessel won, for a general reader.' },
    { title: 'Validation of the new Hipparcos reduction', by: 'Floor van Leeuwen', year: '2007', note: '*Astronomy & Astrophysics* 474. The source of several distances used here.' },
    { title: 'Gaia Data Release 3: Summary of the content and survey properties', by: 'Gaia Collaboration (A. Vallenari et al.)', year: '2023', note: '*Astronomy & Astrophysics* 674, A1.' },
    { title: 'Standing on the shoulders of giants: new mass and distance estimates for Betelgeuse', by: 'Meridith Joyce et al.', year: '2020', note: '*The Astrophysical Journal* 902. The 548 light-years used here.' },
    { title: 'An updated 2017 astrometric solution for Betelgeuse', by: 'Graham M. Harper et al.', year: '2017', note: '*The Astronomical Journal* 154. The larger, astrometric distance.' },
    { title: 'A dusty veil shading Betelgeuse during its Great Dimming', by: 'Miguel Montargès et al.', year: '2021', note: '*Nature* 594.' },
    { title: 'The distance to the Orion Nebula', by: 'Karl M. Menten et al.', year: '2007', note: '*Astronomy & Astrophysics* 474. A radio parallax for the sword.' },
  ],
}

export default guide
