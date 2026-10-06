import type { Guide } from '../guide'

const ringFigure = `<svg viewBox="0 0 420 170" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <g opacity="0.35"><circle cx="70" cy="80" r="40"/><circle cx="210" cy="80" r="40"/><circle cx="350" cy="80" r="40"/></g>
  <ellipse cx="70" cy="80" rx="52" ry="30" stroke="#7FB6D9"/>
  <ellipse cx="210" cy="80" rx="30" ry="52" stroke="#7FB6D9"/>
  <ellipse cx="350" cy="80" rx="52" ry="30" stroke="#9DB9A0" transform="rotate(45 350 80)"/>
  <path d="M10 80h16M114 80h16M70 30v10M70 120v10" opacity="0.6"/>
  <text x="34" y="150" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">h₊ &gt; 0</text>
  <text x="174" y="150" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">h₊ &lt; 0</text>
  <text x="324" y="150" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">h× &gt; 0</text>
  <text x="128" y="20" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">A RING OF FREE MASSES, WAVE COMING TOWARDS YOU</text>
</svg>`

const chirpFigure = `<svg viewBox="0 0 420 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="20" y1="75" x2="400" y2="75" opacity="0.25"/>
  <path d="M20 75 C30 65 40 65 50 75 S70 85 80 75 S98 65 106 75 S122 87 130 75 S144 61 151 75 S163 91 170 75 S181 57 187 75 S197 95 202 75 S211 52 215 75 S223 101 227 75 S234 45 237 75 S243 109 246 75 S251 36 253 75 S258 120 260 75 S264 26 266 75 S270 132 272 75 S276 20 278 75 S283 128 286 75 S292 40 297 75 S306 100 314 75 S330 66 345 75 S370 78 400 75" stroke="#7FB6D9"/>
  <path d="M278 18 V132" stroke-dasharray="2 3" opacity="0.6"/>
  <text x="22" y="140" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">INSPIRAL · FREQUENCY AND STRAIN RISE</text>
  <text x="284" y="18" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">PEAK</text>
  <text x="300" y="140" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">RINGDOWN · DAMPED</text>
</svg>`

const guide: Guide = {
  lede: 'On 14 September 2015 two detectors in the United States felt space stretch and squeeze by about one part in 10²¹. The signal, GW150914, came from two black holes that merged about 1.3 billion years ago. The piece draws their last orbits, follows the wave across Earth’s history to the detectors, and lets you hear it.',
  facts: [
    ['Event', 'GW150914 · 14 September 2015, 09:50:45 UTC'],
    ['Black holes', '36 (+5 / −4) and 29 (±4) solar masses (source frame)'],
    ['Remnant', '62 ± 4 solar masses, spin 0.67'],
    ['Radiated', '3.0 ± 0.5 solar masses × $c^2$, peak 3.6 × 10⁴⁹ W'],
    ['Distance', '410 (+160 / −180) Mpc, redshift 0.09, about 1.3 billion years'],
    ['Signal', '35 to 250 Hz in about 0.2 s; peak strain 1.0 × 10⁻²¹'],
    ['Detectors', 'LIGO Livingston, then Hanford 6.9 ms later; 3,002 km apart'],
    ['Model here', 'Leading-order inspiral plus a damped ringdown: synthesised, not numerical relativity'],
    ['Sound', 'The chirp in real time, every frequency multiplied by four'],
    ['Running time', '72 s in five chapters'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['Space'], action: 'Hear the chirp (with the viewer’s sound on)' },
      { keys: ['R'], action: 'Return to GW150914’s masses' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag either mass along its ruler; on release the binary replays with its own chirp' },
      { gesture: 'tap', action: 'Tap the strain plot (or, in the last chapter, the picture) to hear the chirp' },
      { gesture: 'tap', action: 'Tap a chapter on the bottom ruler to jump to it' },
    ],
    tip: 'Try two light black holes, say 12 and 9: the chirp climbs higher and lasts longer. Two heavy ones, 80 and 60, give a deep, short thump; that is why LIGO hears heavy binaries only at the very end.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Hear it', code: 'Space', aria: 'Play the chirp' }, { label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Physics',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'In general relativity gravity is the shape of spacetime, and the shape can ripple. When masses accelerate asymmetrically, as two stars circling each other do, they send out waves that stretch space in one direction and squeeze it in the perpendicular one, travelling at the speed of light. The waves carry energy away, so the orbit shrinks; the closer the pair, the faster they circle and the stronger they radiate. The last fraction of a second before two black holes touch is the loudest event the universe produces, and it is still almost impossibly faint by the time it reaches us.',
        },
        { type: 'h', text: 'A century of doubt' },
        {
          type: 'p',
          text: 'Albert Einstein predicted gravitational waves in 1916, from an approximate solution of his field equations, and corrected an error in the calculation in 1918, arriving at the *quadrupole formula* still used today. For decades it was unclear whether the waves were physical or an artefact of coordinates. In 1936 Einstein himself, with Nathan Rosen, submitted a paper arguing that they did not exist; a referee found the flaw, and the version eventually published reached the opposite conclusion. The question was effectively settled at a conference in Chapel Hill in 1957, where Felix Pirani showed how the waves would move free particles, and Richard Feynman’s thought experiment of beads sliding on a rod made it vivid: the waves would rub the beads against the rod and heat it, so they carry real energy.',
        },
        {
          type: 'p',
          text: 'Joseph Weber built the first detectors in the 1960s, aluminium cylinders meant to ring when a wave passed; his reported detections were never confirmed. The first firm evidence came instead from the sky. In 1974 Russell Hulse and Joseph Taylor, using the Arecibo radio telescope, found a pulsar in a tight orbit around another neutron star. Over the following years its orbit shrank exactly as the quadrupole formula predicts for energy lost to gravitational waves, and Hulse and Taylor received the Nobel Prize in Physics in 1993.',
        },
        { type: 'h', text: 'LIGO' },
        {
          type: 'p',
          text: 'Detecting the waves directly needed a ruler that could notice a change of one part in $10^{21}$. In 1972 Rainer Weiss, at MIT, worked out in detail how a laser interferometer could do it and what would limit it; Kip Thorne and Ronald Drever at Caltech pursued the idea in parallel. The Laser Interferometer Gravitational-Wave Observatory was built in the 1990s at two sites, Hanford in Washington and Livingston in Louisiana, ran from 2002 to 2010 without a detection, and was rebuilt as Advanced LIGO.',
        },
        {
          type: 'p',
          text: 'The upgraded detectors were in their final engineering run, days before formal observations began, when GW150914 arrived at 09:50:45 UTC on 14 September 2015. It reached Livingston first and Hanford 6.9 milliseconds later. It was so clear that it could be seen by eye in the data, rising from 35 to 250 Hz in about two tenths of a second. After five months of checking, the discovery was announced on 11 February 2016, almost exactly a century after Einstein’s prediction. Weiss, Thorne and Barry Barish, who had led the project through construction, shared the 2017 Nobel Prize in Physics. By the end of the third observing run in 2020, LIGO and Virgo had catalogued around ninety such events, including, in 2017, two neutron stars whose merger was also seen in light.',
        },
        {
          type: 'aside',
          title: 'The long way',
          text: 'The light-travel time from GW150914 is about 1.3 billion years. When the wave set out, life on Earth was almost entirely single-celled; it was crossing intergalactic space through the Cambrian explosion, the age of dinosaurs and the whole of human history, and passed the Earth in the hundredth year of general relativity, days before the instruments built to hear it formally began listening.',
        },
      ],
    },
    {
      id: 'physics',
      kicker: 'Mathematics',
      title: 'The chirp, and what it tells you',
      blocks: [
        { type: 'h', text: 'Strain and polarisation' },
        {
          type: 'p',
          text: 'A gravitational wave is measured by its *strain*, the fractional change in distance between free masses, $h = \\Delta L / L$. The wave is transverse: it acts across its direction of travel, not along it. It has two polarisations, called plus and cross, which stretch a ring of free particles into an ellipse along one pair of axes or along axes turned by 45°. A binary seen face-on emits both equally, a quarter-cycle apart, so the ellipse rotates; the two rings in the piece show the two components.',
        },
        { type: 'figure', svg: ringFigure, alt: 'Three rings of test masses deformed into ellipses: stretched horizontally, stretched vertically, and stretched along a diagonal.', caption: 'Plus and cross polarisations acting on a ring of free masses, enormously exaggerated.' },
        { type: 'h', text: 'The inspiral' },
        {
          type: 'p',
          text: 'Two masses $m_1$ and $m_2$ on a circular orbit radiate at twice the orbital frequency. To leading order (the Newtonian orbit plus Einstein’s quadrupole formula, worked out for binaries by Peters and Mathews in 1963) the frequency rises at a rate that depends on the masses only through one combination, the *chirp mass*:',
        },
        { type: 'math', tex: '\\mathcal{M} = \\frac{(m_1 m_2)^{3/5}}{(m_1 + m_2)^{1/5}}, \\qquad \\dot{f} = \\frac{96}{5}\\,\\pi^{8/3} \\left(\\frac{G\\mathcal{M}}{c^3}\\right)^{5/3} f^{11/3}', label: '(1)' },
        {
          type: 'p',
          text: 'Integrating, with $\\tau$ the time left before the formal coalescence, gives the chirp itself, its phase and its amplitude at distance $D$:',
        },
        { type: 'math', tex: 'f(\\tau) = \\frac{1}{\\pi}\\left(\\frac{5}{256\\,\\tau}\\right)^{3/8}\\left(\\frac{G\\mathcal{M}}{c^3}\\right)^{-5/8}, \\qquad \\Phi(\\tau) = -2\\left(\\frac{c^3\\tau}{5G\\mathcal{M}}\\right)^{5/8}', label: '(2)' },
        { type: 'math', tex: 'h(\\tau) \\approx \\frac{4}{D}\\left(\\frac{G\\mathcal{M}}{c^2}\\right)^{5/3}\\left(\\frac{\\pi f}{c}\\right)^{2/3}\\cos\\Phi(\\tau)', label: '(3)' },
        {
          type: 'p',
          text: 'Frequency and amplitude both climb without limit as $\\tau \\to 0$, which is the chirp: a whistle that rises in pitch and loudness. Measure $f$ and $\\dot{f}$ from the data and (1) gives the chirp mass directly. For GW150914 it came out near 30 solar masses as measured at the detectors. The redshift stretches everything by $1 + z = 1.09$, so the masses in the source’s own frame are 9% smaller: a chirp mass of 28, consistent with 36 and 29.',
        },
        {
          type: 'p',
          text: 'The same numbers explain why these had to be black holes. By the time the signal peaked near 150 Hz the bodies were orbiting 75 times a second; by Kepler’s third law, a total mass of some 70 solar masses doing that must be only a few hundred kilometres across. Nothing but black holes is that compact at that mass.',
        },
        { type: 'h', text: 'Merger and ringdown' },
        {
          type: 'p',
          text: 'Formulas (2) and (3) fail as the holes meet, and the merger itself needs numerical relativity: solving Einstein’s equations on a supercomputer, which became possible only in 2005. What emerges is a single, distorted black hole that settles by ringing like a struck bell, at a *quasi-normal* frequency and damping time fixed entirely by its mass and spin. For the GW150914 remnant, 62 solar masses spinning at about two thirds of the maximum, the ring is near 250 Hz as observed and dies away in about 4 milliseconds.',
        },
        { type: 'math', tex: 'h_{\\text{ring}}(t) \\propto e^{-t/\\tau_{\\text{ring}}}\\cos(2\\pi f_{\\text{ring}}t), \\qquad f_{\\text{ring}} \\approx 250 \\text{ Hz}, \\quad \\tau_{\\text{ring}} \\approx 4 \\text{ ms}', label: '(4)' },
        {
          type: 'p',
          text: 'The difference between the starting masses, 65, and the final 62 left as gravitational waves: about three solar masses, $5 \\times 10^{47}$ joules, most of it in the last tenth of a second. At its peak the output reached $3.6 \\times 10^{49}$ watts, more than all the stars in the observable universe put together shine, as far as such a comparison can be made.',
        },
        { type: 'h', text: 'Hearing it' },
        {
          type: 'p',
          text: 'A LIGO detector is a Michelson interferometer with two 4 km arms at right angles, the light in each bouncing back and forth hundreds of times. A passing wave lengthens one arm and shortens the other; for GW150914 the change was about $4 \\times 10^{-18}$ m, roughly a four-hundredth of the width of a proton. The output is a single number varying in time, and because the frequencies lie in the range of hearing it can be played directly as sound. At the true pitch, 35 to 250 Hz, it is a short thump that small speakers cannot reproduce; raised by two octaves, it is the rising “whoop” that the announcement made famous.',
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
          text: 'Chirp is one TypeScript module on a Canvas 2D context and the Web Audio API. It does not run numerical relativity. It synthesises one waveform from the formulas above and uses it everywhere: to place the black holes, to bend the grid, to draw the strain plot and to make the sound. Everything except the sound is a pure function of the story clock, so the chapters can be scrubbed.',
        },
        { type: 'h', text: 'The waveform' },
        {
          type: 'p',
          text: 'For a given pair of masses the model computes the chirp mass, the remnant (with polynomial fits in the symmetric mass ratio $\\eta = m_1 m_2 / M^2$ to numerical-relativity simulations of non-spinning binaries), the remnant’s ringing (with the quasi-normal-mode fits of Berti, Cardoso and Will), and the frequency where the inspiral hands over, taken where numerical relativity puts the peak, a gravitational-wave angular frequency of about $0.36\\,c^3/GM$:',
        },
        {
          type: 'code',
          code: `const eFrac = 0.0559745 * eta + 0.580951 * eta * eta - 0.960673 * eta ** 3 + 3.35241 * eta ** 4
const af = 2 * Math.sqrt(3) * eta - 3.871 * eta * eta + 4.028 * eta ** 3
const mf = M * (1 - eFrac)
// the ℓ = m = 2 ringdown (Berti, Cardoso & Will 2006 fits)
const wR = 1.5251 - 1.1568 * Math.pow(1 - af, 0.1292)
const Q = 0.7 + 1.4187 * Math.pow(1 - af, -0.499)
const fRing = wR / (TAU * mfDet * TSUN)
const tauRing = Q / (Math.PI * fRing)
// the peak: GW angular frequency Mω ≈ 0.36
const fPeak = Math.min(0.36 / (TAU * Mdet * TSUN), fRing * 0.92)
const tauOf = (f: number) => (5 / 256) * Math.pow(Math.PI * f, -8 / 3) * Math.pow(Tc, -5 / 3)
const fOf = (tau: number) => (1 / Math.PI) * Math.pow(5 / (256 * tau), 3 / 8) * Math.pow(Tc, -5 / 8)`,
          caption: 'From `makeBinary`. `TSUN` is $GM_\\odot/c^3$ in seconds; `Tc` is the chirp mass in the same units, at the detector.',
        },
        {
          type: 'p',
          text: 'For 36 and 29 solar masses this gives 3.1 solar masses radiated, a remnant of 61.9 solar masses with spin 0.68, a ringdown at 252 Hz damping in 4.0 ms, and a detector-frame chirp mass of 30.6, all within the published uncertainties. The waveform is then tabulated at 4,096 samples a second: before the peak, frequency from (2) and amplitude proportional to $f^{2/3}$, the peak rounded off over a few ringdown times; after it, the frequency relaxes to the ringdown value while the amplitude decays. The phase is the running sum of $2\\pi f\\,\\Delta t$, so it stays continuous through the join, and the amplitudes are scaled so that GW150914 peaks at $1.0 \\times 10^{-21}$.',
        },
        { type: 'figure', svg: chirpFigure, alt: 'A sketch of a chirp waveform growing in frequency and amplitude to a peak, then decaying.', caption: 'The synthesised waveform: a leading-order inspiral handed to a damped ringdown at the peak.' },
        { type: 'h', text: 'Slowing time' },
        {
          type: 'p',
          text: 'The visible inspiral begins at 15 Hz, about 37 wave cycles (some nineteen orbits) and 1.6 seconds before the peak. Shown in real time it would be over before the eye could follow, so the story clock slows the real one sixteen-fold through the inspiral and fifty-fold through the merger, blending between them over the last second and a half; the readout “time slowed” shows the factor. For very light binaries, which spend hundreds of cycles above 15 Hz, the drawing starts later, at whatever frequency leaves about forty.',
        },
        {
          type: 'p',
          text: 'The black holes are drawn to scale. Each horizon is a disc of the Schwarzschild radius $2Gm/c^2$, 106 and 86 km for the two, with a dotted ring at 1.5 times that radius where light itself can orbit. Their separation comes from Kepler’s law at the current orbital frequency, which is only an approximation in the last orbits; at the merger the two discs are simply drawn together and replaced by the remnant, whose outline wobbles in an $\\ell = 2$ shape and settles over the ringdown.',
        },
        { type: 'h', text: 'Spacetime on paper' },
        {
          type: 'p',
          text: 'The grid stands for the orbital plane. Each line is a polyline sampled every five pixels, and every sample is displaced twice. First it is pinched towards each hole, a picture of curvature rather than a solution of anything. Then it is moved sideways by the outgoing wave, using the strain the binary emitted a light-travel time earlier:',
        },
        {
          type: 'code',
          code: `// the wave: tangential, quadrupolar, retarded
const Tr = T - r / waveC()
const trr = vlook(vis.tr, Tr)
const A = look(bin, bin.A, trr)
const ph = look(bin, bin.ph, trr)
const r0 = Math.max(st.sep * 0.8, st.rf * 2.2, 30)
// 1/r, softened to 1/√r so the far ripples stay visible
const fall = r < r0 ? r / r0 : Math.sqrt(r0 / r)
const c2 = (x * x - y * y) / r2      // cos 2φ
const s2 = (2 * x * y) / r2          // sin 2φ
const hh = A0 * A * fall * (c2 * Math.cos(ph) + s2 * Math.sin(ph))
const amp = clamp(hh * 1.3, -1, 1) * sp * 0.42
dx += (-y / r) * amp                 // along the circle: transverse to the wave
dy += (x / r) * amp`,
          caption: 'The wave pattern $\\cos(2\\varphi - \\Phi(t - r/c))$: two spiral arms, carried outward.',
        },
        {
          type: 'p',
          text: 'Because the phase seen at radius $r$ is the phase the binary had $r/c$ earlier, lines of equal phase wind into a two-armed spiral, and the faint blue crests drawn over the grid mark where $2\\varphi$ equals that phase. The displacement is tangential, across the direction of travel, because the waves are transverse. The strongest wavefront, from the merger, leaves as a ring.',
        },
        { type: 'h', text: 'The journey and the arrival' },
        {
          type: 'p',
          text: 'Chapter III runs the wavefront along a logarithmic ruler of years-before-arrival, one decade of time per second, so that the first billion years and the last week take equally long, and Earth’s history is written in as the wave passes it. Chapter IV shows the two detectors as a schematic, not a map, with the wavefront arriving from the southern sky: first at Livingston, then at Hanford. The two traces are the model waveform, not detector data. Livingston’s is drawn 6.9 ms early and upside down, because its arms are turned relative to Hanford’s; shifting it by 6.9 ms and inverting it lays it exactly on Hanford’s, which is how the discovery paper first showed the event.',
        },
        { type: 'h', text: 'The sound' },
        {
          type: 'p',
          text: 'With the viewer’s sound on, three things play. Through the inspiral a soft tick marks every wave cycle, so the acceleration is heard as a quickening pulse, and under the last orbits a tone follows the real frequency, two octaves up, swelling with the amplitude. At the merger two quiet sine tones at the ringdown frequency, and twice it, ring out like a bell. In chapter V, and whenever you tap the plot, the chirp itself plays in real time, synthesised sample by sample from the same tables:',
        },
        {
          type: 'code',
          code: `for (let i = 0; i < n; i++) {
  const t = t0 + i / sr
  const f = look(b, b.f, t) * b.pitch   // ×4: 20–252 Hz becomes 80–1,008 Hz
  const a = look(b, b.A, t)
  phase += (TAU * f) / sr
  // a little second harmonic so small speakers find the low start
  const v = a * (Math.sin(phase) + 0.18 * Math.sin(2 * phase))
  const fade = Math.min(1, i / (0.06 * sr)) * Math.min(1, (n - i) / (0.01 * sr))
  d[i] = v * fade
  peak = Math.max(peak, Math.abs(d[i]))
}
const k = 0.32 / Math.max(1e-9, peak)     // a gentle, fixed level, never clipping
for (let i = 0; i < n; i++) d[i] *= k`,
          caption: 'From `buildChirp`: from 20 Hz to the end of the ringdown, about 0.8 s for GW150914.',
        },
        {
          type: 'p',
          text: 'Multiplying every frequency by four keeps the duration and the shape and moves the whole chirp into the range of a laptop speaker. Binaries whose ringdown is already high are raised less, or not at all. The buffer is normalised to a fixed, modest peak, passed through a gentle low-pass filter and the Playground’s own soft compressor, and the sustained tone has a built-in fade, so pausing the viewer silences it.',
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
            '**The panel:** the orbital plane as a hairline grid. Dark discs with white rims are the horizons, to scale; dotted rings mark the photon spheres; short blue arcs trace the last part of each orbit; faint blue spirals are the wave crests. The scale bar is in kilometres.',
            '**Top right:** gravitational-wave frequency as observed, separation, orbital speed as a fraction of $c$, real time to the merger, and how much time is slowed; after the merger, energy radiated, peak power, the remnant and its ringdown.',
            '**Left column:** a large numeral with its formula: the frequency, then the mass radiated, the years still to go, the 6.9 ms delay, and the masses. Below it, two rings of free masses showing the plus and cross strain, and the mass ruler with its two handles.',
            '**The strain plot:** strain in units of $10^{-21}$ against real time from the peak, drawn on as the story runs; in chapter IV, Hanford and Livingston one above the other, then aligned; in chapter V, the sound’s playhead.',
            '**Chapter V:** the time–frequency track, the shape you hear, on a logarithmic frequency axis.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the separation readout falling past a thousand kilometres, then a few hundred, as the speed climbs past a third of the speed of light; the moment the spiral crests tighten and brighten just before the merger; the countdown in chapter III, from 1.3 billion to a handful of days; and the two detector traces sliding into one.',
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
            '**Not numerical relativity.** The inspiral is leading order only; real templates add higher post-Newtonian terms, spins and higher harmonics, and the merger and ringdown are stitched on by hand at a chosen peak frequency. The shape is right in character, and the main numbers agree with the published ones, but this is an illustration, not a template.',
            '**Non-spinning fits.** The remnant’s mass and spin come from fits for black holes that start without spin. GW150914’s spins were small but not known to be zero.',
            '**Amplitude.** The strain is scaled so GW150914 peaks at $10^{-21}$, the measured value, rather than computed from the detectors’ orientation and the source’s; other masses are scaled from it by $\\mathcal{M}^{5/3} f^{2/3}$ at the same distance. The peak-power readout for other masses is scaled roughly as $\\eta^2$.',
            '**The grid.** The pinching is a picture, not a metric. The wave speed is slowed so ripples fit on the page, the fall-off is softened from $1/r$ to $1/\\sqrt{r}$, and the displacement is exaggerated by about twenty orders of magnitude.',
            '**Time.** The inspiral is slowed sixteen-fold and the merger fifty-fold; the journey runs on a logarithmic clock.',
            '**The detectors.** The site sketch is schematic, the traces are noiseless model waveforms rather than LIGO data, and the arms’ visible wobble is a cartoon of a change smaller than a proton.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Observation of gravitational waves from a binary black hole merger', by: 'B. P. Abbott et al. (LIGO Scientific Collaboration and Virgo Collaboration)', year: '2016', note: '*Physical Review Letters* 116, 061102. The discovery paper.' },
    { title: 'Properties of the binary black hole merger GW150914', by: 'B. P. Abbott et al. (LIGO Scientific Collaboration and Virgo Collaboration)', year: '2016', note: '*Physical Review Letters* 116, 241102. Masses, spins and distance in detail.' },
    { title: 'Gravitational radiation from point masses in a Keplerian orbit', by: 'P. C. Peters and J. Mathews', year: '1963', note: '*Physical Review* 131, 435. The leading-order chirp used here.' },
    { title: 'Discovery of a pulsar in a binary system', by: 'R. A. Hulse and J. H. Taylor', year: '1975', note: '*Astrophysical Journal* 195, L51.' },
    { title: 'On gravitational-wave spectroscopy of massive black holes with the space interferometer LISA', by: 'Emanuele Berti, Vitor Cardoso and Clifford M. Will', year: '2006', note: '*Physical Review D* 73, 064030. Includes the quasi-normal-mode fits used for the ringdown.' },
    { title: 'Traveling at the Speed of Thought: Einstein and the Quest for Gravitational Waves', by: 'Daniel Kennefick', year: '2007', note: 'Princeton University Press. The decades of doubt, including the 1936 episode.' },
    { title: 'Black Hole Blues and Other Songs from Outer Space', by: 'Janna Levin', year: '2016', note: 'The people who built LIGO.' },
    { title: 'Gravity’s Kiss: The Detection of Gravitational Waves', by: 'Harry Collins', year: '2017', note: 'MIT Press. A sociologist inside the collaboration during the discovery.' },
  ],
}

export default guide
