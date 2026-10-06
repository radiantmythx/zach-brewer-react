import type { Guide } from '../guide'

const gridFigure = `<svg viewBox="0 0 420 190" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <g opacity="0.25">
    <path d="M30 40 H150 M30 80 H150 M30 120 H150 M30 160 H150 M30 40 V160 M70 40 V160 M110 40 V160 M150 40 V160"/>
    <path d="M230 10 H410 M230 70 H410 M230 130 H410 M230 190 H410 M230 10 V190 M290 10 V190 M350 10 V190 M410 10 V190"/>
  </g>
  <circle cx="90" cy="100" r="4"/><circle cx="50" cy="60" r="3"/><circle cx="130" cy="64" r="3"/><circle cx="60" cy="140" r="3"/><circle cx="128" cy="138" r="3"/>
  <circle cx="320" cy="100" r="4"/><circle cx="260" cy="40" r="3"/><circle cx="380" cy="46" r="3"/><circle cx="275" cy="160" r="3"/><circle cx="377" cy="157" r="3"/>
  <g stroke="#2B6A93"><path d="M317 97 L301 81 M323 97 L337 83 M317 103 L302 117 M323 103 L337 118"/>
  <path d="M262 42 L254 30 M378 48 L392 36 M277 158 L268 172 M375 155 L388 166"/></g>
  <text x="34" y="182" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">EARLIER · a = 0.67</text>
  <text x="234" y="182" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7" dy="-0">LATER · a = 1</text>
  <text x="160" y="104" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">→</text>
</svg>`

const waveFigure = `<svg viewBox="0 0 420 150" fill="none" stroke-width="1.2" stroke-linecap="round">
  <path d="M20 50 q7 -16 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0" stroke="#5B4BD6"/>
  <path d="M220 50 q11 -16 22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0" stroke="#D63A2A"/>
  <g stroke="currentColor" stroke-width="1" opacity="0.6"><path d="M20 76 h28 M20 72 v8 M48 72 v8"/><path d="M220 76 h44 M220 72 v8 M264 72 v8"/></g>
  <text x="20" y="96" font-family="Geist Mono, monospace" font-size="9" fill="currentColor">λ = 420 NM, AS EMITTED</text>
  <text x="220" y="96" font-family="Geist Mono, monospace" font-size="9" fill="currentColor">λ = 677 NM, ON ARRIVAL</text>
  <text x="20" y="130" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" opacity="0.7">a = 0.62</text>
  <text x="220" y="130" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" opacity="0.7">a = 1 · 1 + z = 1 / 0.62 = 1.61</text>
</svg>`

const guide: Guide = {
  lede: 'The universe is getting bigger. Galaxies on a comoving grid drift apart with no centre, a wave of light reddens as the space it crosses stretches, Hubble’s law assembles itself point by point, and running the film backward reaches the hot, even glow whose light still arrives today as the cosmic microwave background.',
  facts: [
    ['Model', 'Flat ΛCDM: $H_0 = 70$ km/s/Mpc, $\\Omega_m = 0.27$, $\\Omega_r = 8.5 \\times 10^{-5}$, $\\Omega_\\Lambda \\approx 0.73$'],
    ['Age', '13.8 billion years in this model'],
    ['Redshift', '$1 + z = a_{\\text{obs}} / a_{\\text{emit}}$'],
    ['Hubble’s law', '$v = H d$, exact for the expansion itself'],
    ['Hubble radius', '$c/H_0 \\approx 4.3$ Gpc, about 14 billion light-years'],
    ['The wave', 'Leaves at 420 nm when $a = 0.62$, arrives at 677 nm ($z = 0.61$)'],
    ['Last scattering', '$z \\approx 1{,}090$, about 380,000 years, about 3,000 K'],
    ['CMB today', '2.7255 K, uneven by a few parts in 100,000'],
    ['Running time', '86 s in five chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['Space'], action: 'Pause or resume' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag left or right to run cosmic time backward or forward, from the release of the oldest light to well past today' },
      { gesture: 'tap', action: 'Tap a galaxy to read its distance, redshift, recession speed and the age of the light we receive from it' },
      { gesture: 'tap', action: 'Tap or drag the ruler along the bottom to jump in time' },
    ],
    tip: 'In chapter III, drag a little to the left: the line gets steeper, because the Hubble rate was higher in the past. The “constant” is only constant across space.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Cosmology',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Pass the light of a galaxy through a prism and you see the colours of its stars crossed by dark and bright lines, the fingerprints of hydrogen, calcium, sodium and the rest. For almost every galaxy, those lines sit at longer wavelengths than they do in a laboratory, shifted toward the red. The farther away the galaxy, the larger the shift. That one observation, repeated for millions of galaxies, is the evidence that the universe is expanding.',
        },
        { type: 'h', text: 'A short history' },
        {
          type: 'p',
          text: 'The first shifts were measured by Vesto Slipher at Lowell Observatory in Arizona, starting in 1912 with the Andromeda nebula, which turned out to be approaching. As he measured more spiral nebulae, the pattern changed: by the early 1920s he had velocities for some forty of them, and most were receding, some at more than a thousand kilometres a second. Nobody yet knew how far away they were, or even for certain that they lay outside our own galaxy; that was settled in 1925, when Edwin Hubble found Cepheid variable stars in Andromeda and showed it was far beyond the Milky Way.',
        },
        {
          type: 'p',
          text: 'Meanwhile the theory had raced ahead. In 1922 Alexander Friedmann showed that Einstein’s equations allow a universe that expands or contracts. In 1927 the Belgian priest and physicist Georges Lemaître independently derived an expanding solution, recognised that it predicts a velocity proportional to distance, and estimated the rate from Slipher’s velocities and Hubble’s distances, in a paper published in French in a little-read Belgian journal. Two years later Hubble published the relation directly from observations, using his own distances and velocities measured by Slipher and by Milton Humason. Hubble’s value for the rate was about 500 km/s per megaparsec, some seven times too large, because his distance scale was wrong. In 2018 the International Astronomical Union recommended calling the result the Hubble–Lemaître law.',
        },
        { type: 'h', text: 'No centre' },
        {
          type: 'p',
          text: 'The expansion is not an explosion from a point. It is the stretching of distances everywhere at once, and every galaxy sees every other receding, at a speed proportional to its distance, as if it were at the centre. The usual picture is a loaf of raisin bread rising in an oven: each raisin sees all the others move away, the more distant ones faster, and no raisin is special. Chapter I shows this twice. First the galaxies are seen from ours, with arrows for their velocities; then the view slides to another galaxy and the same pattern of arrows appears around it. The grid lines, which move with the galaxies, are **comoving** coordinates: the galaxies stay put on the grid while the grid itself expands.',
        },
        { type: 'figure', svg: gridFigure, alt: 'The same five galaxies on a comoving grid at two times; the grid and every separation are larger at the later time, with arrows pointing away from the central galaxy.', caption: 'Each galaxy keeps its place on the comoving grid; the grid scales by $a(t)$. From any galaxy, the others recede.' },
        { type: 'h', text: 'Stretched light' },
        {
          type: 'p',
          text: 'The redshift is often described as a Doppler shift, but it is better understood as the stretching of the light itself. A wave crossing expanding space has its wavelength stretched in proportion to the expansion that happens while it travels. Light that left a galaxy when the universe was 62 per cent of its present size arrives with every wavelength multiplied by $1/0.62 = 1.61$: violet at 420 nm becomes red at 677 nm. That is chapter II. It also means that galaxies far enough away recede faster than light, in the sense that the distance to them grows by more than a light-year per year. This breaks no rule: relativity forbids things outrunning light past each other, not space growing between them. We can still see many such galaxies, whose light set out toward us long ago.',
        },
        { type: 'h', text: 'How fast? The Hubble tension' },
        {
          type: 'p',
          text: 'The present expansion rate, $H_0$, is measured two ways, and they disagree. Fitting the standard cosmological model to the cosmic microwave background, as measured by the Planck satellite, gives about 67.4 km/s/Mpc. Climbing a distance ladder of Cepheid variables and Type Ia supernovae in nearby galaxies, as the SH0ES team has done, gives about 73. Both are quoted with uncertainties near one per cent, and the gap has persisted for a decade. Some recent measurements with other distance indicators land in between. It may be an unrecognised error in one method, or a sign that the standard model is missing something. The piece uses 70, a round number between them, and the guide does not pretend the question is settled.',
        },
        { type: 'h', text: 'The oldest light' },
        {
          type: 'p',
          text: 'Run the expansion backward and the universe was denser and hotter, because radiation’s temperature scales as $1/a$. When it was about 1,100 times smaller than today, roughly 380,000 years after the beginning, it was at about 3,000 K: hot enough that hydrogen stayed ionised and light could not travel far before scattering off free electrons. The universe was an opaque, glowing fog, like the inside of a star. As it cooled through that temperature, electrons and protons combined into atoms, the fog cleared, and the light then present has been travelling freely ever since, stretched by a factor of 1,100, from near-infrared to microwaves.',
        },
        {
          type: 'p',
          text: 'In 1964 Arno Penzias and Robert Wilson, testing a horn antenna at Bell Labs in New Jersey, found a faint hiss of microwave noise coming from every direction that they could not remove. A group at Princeton led by Robert Dicke, which had been preparing to search for exactly that signal, recognised it as the leftover radiation of a hot early universe, and the two groups published side by side in 1965. Ralph Alpher and Robert Herman had predicted such a background in 1948. The COBE satellite then showed that its spectrum is an almost perfect blackbody at 2.725 K, and in 1992 detected its tiny unevenness, a few parts in 100,000. WMAP and Planck later mapped that unevenness across the sky in great detail: the pattern of slightly denser and slightly thinner regions from which every galaxy, and so everything here, eventually grew.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'The scale factor',
      blocks: [
        {
          type: 'p',
          text: 'Give every galaxy fixed **comoving** coordinates $\\vec x$. Its physical position is $\\vec r = a(t)\\,\\vec x$, where the scale factor $a(t)$ is the size of the universe relative to today ($a = 1$ now). Differentiating, every galaxy moves away from every other with velocity',
        },
        { type: 'math', tex: '\\dot{\\vec r} = \\dot a\\,\\vec x = \\frac{\\dot a}{a}\\,\\vec r = H(t)\\,\\vec r', label: '(1)', caption: 'Hubble’s law, exact for any pair of comoving points at any time. $H = \\dot a / a$ is the Hubble parameter; its value today is $H_0$.' },
        {
          type: 'p',
          text: 'How $a$ grows is set by what the universe contains. For a flat universe of radiation, matter and a cosmological constant, the Friedmann equation reads',
        },
        { type: 'math', tex: 'H(a)^2 = H_0^2 \\left( \\Omega_r\\, a^{-4} + \\Omega_m\\, a^{-3} + \\Omega_\\Lambda \\right)', label: '(2)' },
        {
          type: 'p',
          text: 'Radiation thins as $a^{-4}$ (fewer photons per volume, each one stretched), matter as $a^{-3}$, and the cosmological constant not at all, which is why it dominates late and the expansion is now accelerating. The age at scale factor $a$ follows from $dt = da/(aH)$:',
        },
        { type: 'math', tex: 't(a) = \\int_0^a \\frac{da\'}{a\'\\,H(a\')}', label: '(3)' },
        {
          type: 'p',
          text: 'With the piece’s parameters this gives 13.8 billion years today. Light moves at $c$ through physical space, so through comoving coordinates it moves at $c/a$. The comoving distance it covers between scale factors $a_1$ and $a_2$ is',
        },
        { type: 'math', tex: '\\chi = \\int_{t_1}^{t_2} \\frac{c\\,dt}{a} = \\int_{a_1}^{a_2} \\frac{c\\,da}{a^2 H(a)}', label: '(4)' },
        { type: 'h', text: 'Why wavelengths stretch' },
        {
          type: 'p',
          text: 'Two successive crests leave a galaxy a short time $\\delta t_e$ apart and cover the same comoving distance to us. By (4), equal comoving distances mean equal values of $\\int dt/a$, so the interval between the crests grows in proportion to $a$: they arrive $\\delta t_o = \\delta t_e\\, a_o / a_e$ apart. Wavelength is proportional to that interval, so',
        },
        { type: 'math', tex: '1 + z \\equiv \\frac{\\lambda_{\\text{obs}}}{\\lambda_{\\text{emit}}} = \\frac{a_{\\text{obs}}}{a_{\\text{emit}}}', label: '(5)' },
        { type: 'figure', svg: waveFigure, alt: 'A short violet wave labelled 420 nanometres beside a longer red wave labelled 677 nanometres.', caption: 'The light of chapter II, as it leaves and as it arrives. Every wavelength is multiplied by $1 + z$.' },
        {
          type: 'p',
          text: 'The same argument applied to a whole blackbody spectrum shows that it stays a blackbody, with temperature $T \\propto 1/a$. Today’s 2.7255 K therefore means a temperature of about $2.7255 \\times 1{,}091 \\approx 2{,}970$ K at last scattering, and Wien’s law, $\\lambda_{\\text{peak}} = 2.898\\ \\text{mm K} / T$, moves the peak from about 1 µm then to about 1.06 mm now. The piece colours the early sky with exactly that blackbody, $T = 2.7255\\ \\text{K} / a$.',
        },
        {
          type: 'aside',
          title: 'Why 3,000 K and not hotter',
          text: 'It takes 13.6 eV to ionise hydrogen, which corresponds to about 158,000 K, yet atoms only survive once the universe cools to about 3,000 K. The reason is the enormous number of photons: about 1.6 billion for every proton. Even at 3,000 K, the rare photons in the high-energy tail of the blackbody are numerous enough to break apart any atom that forms, until the temperature falls that far.',
        },
        { type: 'h', text: 'Distance, redshift and lookback' },
        {
          type: 'p',
          text: 'Tapping a galaxy uses all of this. Its comoving distance from ours is just the separation on the grid, $\\chi$. Its proper distance now is $a\\chi$. The light we receive from it at this moment left when the scale factor was $a_e$, found by solving (4) for the comoving distance $\\chi$; its redshift is $a/a_e - 1$, the time the light has been travelling is $t(a) - t(a_e)$, and its recession speed is $H(a)\\,a\\chi$, which exceeds the speed of light beyond the Hubble radius, $c/H$.',
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
          text: 'Redshift is a single TypeScript module drawing to one canvas. Almost everything on screen is a function of one number, the scale factor $a$, which the film moves through five chapters and which you can take over by dragging. Integrals (3) and (4) are computed once, at load, as tables of cosmic time and conformal time on 3,000 points in $\\ln a$, from $a = 10^{-5}$ to 2.2, starting from the radiation-era solution and integrated with the trapezoid rule:',
        },
        {
          type: 'code',
          code: `const E = (a: number) => Math.sqrt(OR / a ** 4 + OM / a ** 3 + OL)
// radiation era start: t ≈ a² / (2 H₀ √Ω_r), η ≈ c a / (H₀ √Ω_r)
TT[0] = (a * a) / (2 * Math.sqrt(OR)) * TH
ETA[0] = (a / Math.sqrt(OR)) * DH
for (let i = 1; i < NT; i++) {
  const a1 = Math.exp(LA0 + (i - 1) * dl)
  const a2 = Math.exp(LA0 + i * dl)
  const f1 = 1 / E(a1)
  const f2 = 1 / E(a2)
  TT[i] = TT[i - 1] + 0.5 * (f1 + f2) * dl * TH            // dt = d ln a / H
  ETA[i] = ETA[i - 1] + 0.5 * (f1 / a1 + f2 / a2) * dl * DH // dη = c d ln a / (a H)
}`,
          caption: '`TH` is $1/H_0$ in Gyr and `DH` is $c/H_0$ in Gpc. Comoving distances between two epochs are differences of `ETA`.',
        },
        { type: 'h', text: 'An endless field of galaxies' },
        {
          type: 'p',
          text: 'The galaxies live on a comoving plane divided into cells one gigaparsec across. Each cell’s galaxies are generated on demand from a random generator seeded by the cell’s coordinates, so the field is unbounded, deterministic and only computed where the camera looks; a slow noise field varies the count from cell to cell into loose filaments. The density is scaled to the screen so a phone shows as many galaxies per square centimetre as a monitor. Each galaxy is a hairline glyph: two logarithmic-spiral arms with a bulge and a faint disk outline, sometimes a bar, or nested ellipses for an elliptical. Spirals are drawn in the colour of a 9,500 K blackbody and ellipticals at 4,400 K, the young blue and old red stellar populations they are known for.',
        },
        {
          type: 'p',
          text: 'Every frame maps comoving positions to the screen as $\\text{screen} = \\text{centre} + s\\,a\\,(\\vec x - \\vec x_{\\text{ref}})$, with $s$ the pixels per gigaparsec of physical distance. For $a \\geq 0.45$, $s$ is fixed, so the expansion is literal: the field spreads. Going further back, the camera eases in as $s \\propto a^{-0.85}$, so the contraction stays visible without everything collapsing to a point; the scale bar keeps the physical size honest. The grid is drawn at several comoving spacings at once, each faded in and out by its on-screen size, so it stays even as it grows.',
        },
        { type: 'h', text: 'The travelling wave' },
        {
          type: 'p',
          text: 'The source galaxy sits at exactly the comoving distance light covers between $a = 0.62$ and $a = 1$, so the packet leaves it at the first and reaches us at the second. Its position along the path is the fraction of that distance covered so far, and its wavelength on screen, its label and its colour all scale with $a/0.62$:',
        },
        {
          type: 'code',
          code: `// the comoving distance the light has covered since it left
const chi = a > A_EMIT ? etaAt(a) - etaAt(A_EMIT) : 0
const f = clamp(chi / CHI_AB)
const px = lerp(sx, yx, f)
const py = lerp(sy, yy, f)
const lam = (LAMBDA0 * a) / A_EMIT              // 420 nm × (1 + z)
// the packet: wavelength on screen ∝ λ, in the colour of λ
const lpx = (lam / LAMBDA0) * clamp(Math.min(w, h) * 0.018, 7, 14)
const col = css(spectral(lam))`,
          caption: 'From `drawWave()`. `spectral()` comes from the shared colour module: the CIE 1931 colour of monochromatic light.',
        },
        { type: 'h', text: 'The Hubble diagram' },
        {
          type: 'p',
          text: 'Chapter III takes every galaxy on screen, computes its proper distance and recession speed from (1), and flies a point from the galaxy into the plot, nearest first. On its own the expansion would put every point exactly on the line, which looks false, because real measurements are not exact. So each galaxy carries a fixed random error of about 7 per cent in its distance, roughly what a Type Ia supernova gives, and the points scatter around the law the way real ones do. The line is $v = H d$ at the current $a$: drag through time and its slope follows $H(a)$.',
        },
        { type: 'h', text: 'Glow and pattern' },
        {
          type: 'p',
          text: 'The background is washed with the blackbody colour of $T = 2.7255/a$ kelvin once that temperature passes about 700 K, which is roughly where a hot object starts to glow visibly. At last scattering the pattern appears: a Gaussian random field made by summing 140 plane waves with random directions and phases, their wavenumbers clustered around one scale with a tail of larger ones, a crude stand-in for the acoustic peak in the real spectrum. It is printed as a halftone, cream dots where the field is warmer and brown dots where it is cooler, rendered once to an offscreen canvas and composited each frame. In chapter V the same pattern is shown on an all-sky Mollweide oval, with its meridians and parallels, as the map we make of it today.',
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
            '**Galaxies:** hairline spirals (bluer) and ellipticals (warmer). Ours is circled, *You are here*; in chapter I a second galaxy is circled when the view moves to it.',
            '**Grid:** comoving coordinates. The galaxies never move on it; it carries them apart.',
            '**Blue arrows (chapter I):** velocities relative to the circled galaxy, proportional to distance, fading toward the edge.',
            '**The wave (chapter II):** a packet of light from a distant galaxy to ours, in the true colour of its current wavelength, with its wavelength and redshift dimensioned above it. The colour bar at the top right marks the emitted and current wavelengths on the visible spectrum.',
            '**Hubble diagram (chapter III):** proper distance against recession speed. The dashed lines mark the speed of light and the Hubble radius where recession reaches it.',
            '**Orange glow and halftone (chapters IV–V):** the hot early universe at its true blackbody colour, and the temperature pattern at last scattering, exaggerated enormously.',
            '**Oval (chapter V):** the same pattern as an all-sky map, the way the cosmic microwave background is shown today.',
            '**Readouts:** cosmic time, scale factor, redshift of light from that epoch, the temperature of the background radiation then, and the Hubble rate then. **Scale bar:** a physical length at the current epoch.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: in chapter I, the moment the view slides to the other galaxy and the arrows rearrange into the identical pattern; in chapter II, the packet slowing on screen as it nears us while the galaxies keep separating; and between chapters IV and V, the instant the fog clears and the dots of the oldest light fade into the dark ages.',
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
            '**A slice.** The universe is three-dimensional; the piece shows a two-dimensional slice through it, and its galaxies stand in for whole clusters.',
            '**Perfect Hubble flow.** Real galaxies also move through space at a few hundred kilometres a second, pulled by their neighbours, and structure grows over time. Here every galaxy is fixed on the grid, and galaxies simply fade in between $a \\approx 0.07$ and 0.15.',
            '**Parameters.** $H_0 = 70$ and $\\Omega_m = 0.27$ give an age of 13.8 billion years. Planck’s best fit, $H_0 = 67.4$ and $\\Omega_m = 0.315$, gives nearly the same age; the distance-ladder value of about 73 would give a younger universe with the same matter density.',
            '**Exaggerations.** The wave’s wavelength on screen is enlarged by some thirty orders of magnitude, and the temperature differences by about ten thousand times.',
            '**A toy sky pattern.** The real background has a precise spectrum of fluctuations with a series of acoustic peaks; the piece sums plane waves around one scale. The all-sky oval shows that simulated pattern, not a real map.',
            '**Inside the fog.** Before last scattering the universe was opaque; no one inside it could have seen the glow as a picture. The orange wash shows its colour, not a view.',
            '**Recession, not redshift velocity.** The Hubble diagram plots recession speed $H d$, which is exactly linear; astronomers usually plot redshift, which bends away from a straight line at large distance.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Nebulae', by: 'V. M. Slipher', year: '1917', note: '*Proceedings of the American Philosophical Society* 56. Radial velocities of 25 spiral nebulae, most receding.' },
    { title: 'Un Univers homogène de masse constante et de rayon croissant rendant compte de la vitesse radiale des nébuleuses extra-galactiques', by: 'Georges Lemaître', year: '1927', note: '*Annales de la Société Scientifique de Bruxelles* A47.' },
    { title: 'A relation between distance and radial velocity among extra-galactic nebulae', by: 'Edwin Hubble', year: '1929', note: '*Proceedings of the National Academy of Sciences* 15.' },
    { title: 'A Measurement of Excess Antenna Temperature at 4080 Mc/s', by: 'A. A. Penzias & R. W. Wilson', year: '1965', note: '*The Astrophysical Journal* 142.' },
    { title: 'Cosmic Black-Body Radiation', by: 'R. H. Dicke, P. J. E. Peebles, P. G. Roll & D. T. Wilkinson', year: '1965', note: '*The Astrophysical Journal* 142. The interpretation, in the same issue.' },
    { title: 'Structure in the COBE differential microwave radiometer first-year maps', by: 'G. F. Smoot et al.', year: '1992', note: '*The Astrophysical Journal Letters* 396.' },
    { title: 'Planck 2018 results. VI. Cosmological parameters', by: 'Planck Collaboration', year: '2020', note: '*Astronomy & Astrophysics* 641, A6.' },
    { title: 'A Comprehensive Measurement of the Local Value of the Hubble Constant with 1 km/s/Mpc Uncertainty from the Hubble Space Telescope and the SH0ES Team', by: 'Adam G. Riess et al.', year: '2022', note: '*The Astrophysical Journal Letters* 934, L7.' },
    { title: 'Expanding Confusion: Common Misconceptions of Cosmological Horizons and the Superluminal Expansion of the Universe', by: 'Tamara M. Davis & Charles H. Lineweaver', year: '2004', note: '*Publications of the Astronomical Society of Australia* 21. Why recession faster than light is fine.' },
    { title: 'Introduction to Cosmology', by: 'Barbara Ryden', year: '2016', note: 'Cambridge University Press, 2nd edition. The scale factor, the Friedmann equation and the background, gently.' },
    { title: 'The First Three Minutes', by: 'Steven Weinberg', year: '1977', note: 'Basic Books. The hot early universe, for everyone.' },
  ],
}

export default guide
