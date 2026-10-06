import type { Guide } from '../guide'

const pathFigure = `<svg viewBox="0 0 420 210" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <path d="M40 190 A420 420 0 0 1 380 190" opacity="0.8"/>
  <path d="M18 150 A470 470 0 0 1 402 150" stroke-dasharray="2 4" opacity="0.45"/>
  <circle cx="210" cy="72" r="2.5" fill="currentColor"/>
  <line x1="210" y1="72" x2="252" y2="22" stroke="#2B6A93"/>
  <path d="M244 26 L252 22 L250 31" stroke="#2B6A93"/>
  <line x1="210" y1="72" x2="404" y2="96" stroke="#C0502A"/>
  <path d="M396 92 L404 96 L396 99" stroke="#C0502A"/>
  <text x="262" y="30" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" letter-spacing="1">NOON · AIR MASS 1.4</text>
  <text x="268" y="122" font-family="Geist Mono, monospace" font-size="9" fill="#C0502A" stroke="none" letter-spacing="1">SUNSET · AIR MASS ≈ 38</text>
  <text x="150" y="64" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">OBSERVER</text>
  <text x="24" y="140" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.55">TOP OF THE AIR (NOT TO SCALE)</text>
  <text x="44" y="204" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.55">EARTH</text>
</svg>`

const blueFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="40" y1="170" x2="400" y2="170" opacity="0.5"/>
  <line x1="40" y1="20" x2="40" y2="170" opacity="0.5"/>
  <text x="40" y="186" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.6">400</text>
  <text x="188" y="186" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.6">550</text>
  <text x="372" y="186" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.6">700 NM</text>
  <polyline points="40,30 80,72 120,101 160,121 200,135 240,145 280,152 320,157 360,160 400,162" stroke-dasharray="3 3" opacity="0.7"/>
  <polyline points="40,52 64,40 100,43 140,45 180,47 220,49 260,52 300,55 340,59 400,65" opacity="0.6"/>
  <polyline points="40,42 80,88 120,114 160,130 200,141 240,149 280,154 320,158 360,161 400,163" stroke="#2B6A93" stroke-width="1.6"/>
  <path d="M60 169 C120 166 160 40 200 22 C240 40 290 150 360 168" stroke="#3F7A55" stroke-dasharray="1 3"/>
  <text x="96" y="66" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.75">λ⁻⁴</text>
  <text x="300" y="50" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.75">SUNLIGHT</text>
  <text x="70" y="128" font-family="Geist Mono, monospace" font-size="8" fill="#2B6A93" stroke="none">SKYLIGHT = λ⁻⁴ × SUNLIGHT</text>
  <text x="214" y="30" font-family="Geist Mono, monospace" font-size="8" fill="#3F7A55" stroke="none">EYE (ȳ)</text>
</svg>`

const guide: Guide = {
  lede: 'A day over a quiet hill in a minute and a quarter, its sky computed from the way air scatters sunlight. Blue by day, red at sunset, and then, after the sun has gone, the deep blue of the air lit only from above.',
  facts: [
    ['Phenomenon', 'Rayleigh and Mie scattering, ozone absorption, twilight'],
    ['Rayleigh', '$\\beta_R \\approx 1.24 \\times 10^{-6}\\, \\lambda^{-4}$ m⁻¹ ($\\lambda$ in µm)'],
    ['Haze', 'Mie, scale height 1.2 km, asymmetry $g = 0.8$'],
    ['Ozone', '300 Dobson units, 10–40 km, Chappuis band near 600 nm'],
    ['Spectrum', 'Twelve bins, 390–720 nm, ASTM G-173 sunlight, CIE 1931 observer'],
    ['Place', '40° N, 6 October, facing south; noon sun 44.6° high'],
    ['Running time', '78 s for 24 hours, slowed through the twilights'],
    ['Twilights', 'Civil 0 to −6°, nautical to −12°, astronomical to −18°'],
    ['Sound', 'Optional: wind, a dawn chorus, crickets after dusk'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Step to the previous or next moment of the day' }],
    gestures: [
      { gesture: 'drag', action: 'Drag anywhere in the sky to move the sun along its arc' },
      { gesture: 'tap', action: 'Tap or drag the 24-hour ruler to set the time' },
      { gesture: 'move', action: 'Hover the sky to see where the sun would stand, and when' },
    ],
    tip: 'Hold the sun a few degrees below the horizon and watch the antisolar side of the sky: the dark band rising from the horizon is the shadow of the Earth, and the pink above it is the Belt of Venus.',
  },
  pad: {
    left: [{ label: '‹ Earlier', code: 'ArrowLeft', aria: 'Previous moment', wide: true }],
    right: [{ label: 'Later ›', code: 'ArrowRight', aria: 'Next moment', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Atmospheric optics',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Sunlight arrives at the top of the atmosphere white: a smooth spectrum with every visible wavelength in it. What reaches a person on a hill is something else. Part of the light comes straight from the sun, a little dimmed. The rest has been knocked out of its path by the air on the way down and reaches the eye from every other direction at once. That redirected light is the sky. Without air there would be a black sky with a white sun in it, as on the Moon.',
        },
        {
          type: 'p',
          text: 'The redirection is called *scattering*, and the air does it unevenly. Its molecules are hundreds of times smaller than a wavelength of light, and objects that small scatter short wavelengths far more strongly than long ones. Blue light is redirected about five and a half times as often as red. So the sky, which is made of scattered light, is blue; and the direct sunlight, which is what remains after scattering, is a little yellow, and at sunset, after a much longer path through the air, orange and then red. The two colors are one process seen from opposite sides.',
        },
        {
          type: 'p',
          text: 'Twilight adds a third act. When the sun is just below the horizon it still lights the air high above you, while the air near the ground lies in the Earth’s shadow. Opposite the sun you can see that shadow rising up the sky as a blue-gray band, with a pink fringe above it where the reddened light of the set sun is scattered back toward you. Overhead, the sky turns a deep, saturated blue. Photographers call it the *blue hour*. It is the light of the air itself, lit from above, after the sun has gone.',
        },
        { type: 'h', text: 'A short history' },
        {
          type: 'p',
          text: 'Leonardo da Vinci noted that distant mountains look blue and that the blue of the sky comes from the air between us and the darkness beyond. Isaac Newton thought the color might arise in thin films of water in the air, like the colors of a soap bubble. In the 1860s the Irish physicist John Tyndall shone light through glass tubes filled with fine aerosols and found that the scattered light was blue and partly polarized, and that it became whiter as the particles grew. The effect is still named after him.',
        },
        {
          type: 'p',
          text: 'In 1871 John William Strutt, who later became the third Baron Rayleigh, published the explanation in *Philosophical Magazine*. Treating a particle much smaller than the wavelength as a tiny oscillating dipole driven by the light wave, he showed that the scattered intensity goes as the inverse fourth power of the wavelength, and that light scattered at right angles to the sun should be strongly polarized, as it is. At first he attributed the scattering to dust and droplets. By 1899 he had shown that the air molecules alone were enough, and the inverse-fourth-power law, Rayleigh scattering, became one of the classic results of physics. Albert Einstein and Marian Smoluchowski later put it on a firmer footing as scattering by tiny fluctuations in the density of a gas.',
        },
        {
          type: 'p',
          text: 'Two later pieces complete the story. In 1908 Gustav Mie solved the full problem of light scattered by a sphere of any size, which explains why haze, mist and clouds, made of particles comparable to or larger than the wavelength, scatter all colors nearly equally and look white. And in 1953 Edward Hulburt, working at the Naval Research Laboratory, showed that Rayleigh scattering alone could not explain the color of the twilight sky. Calculated without ozone, the zenith shortly after sunset should look gray or faintly yellow; the deep blue needs ozone, which absorbs orange and yellow light in a broad band first described by James Chappuis in 1880.',
        },
        {
          type: 'aside',
          title: 'Why not violet?',
          text: 'If short wavelengths scatter most, why is the sky not violet? Three things conspire. Sunlight itself is weaker in the violet than in the blue. The ozone layer removes most of the ultraviolet and a little violet. And the eye is far less sensitive to violet than to blue or green. Skylight really is richest in violet, but our three kinds of cone read the whole broad mixture as a pale, slightly desaturated blue.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Physics',
      title: 'The science',
      blocks: [
        { type: 'h', text: 'Rayleigh scattering' },
        {
          type: 'p',
          text: 'For a gas of molecules with refractive index $n$ and number density $N$, the fraction of light scattered per meter of path, the *scattering coefficient*, is',
        },
        {
          type: 'math',
          tex: '\\beta_R(\\lambda) = \\frac{8\\pi^3 (n^2 - 1)^2}{3 N \\lambda^4} \\cdot \\frac{6 + 3\\delta}{6 - 7\\delta}',
          label: '(1)',
          caption: '$\\lambda$ is the wavelength and $\\delta \\approx 0.03$ the depolarization factor of air, a small correction for molecules that are not perfect spheres.',
        },
        {
          type: 'p',
          text: 'At sea level this comes to about $5.8 \\times 10^{-6}$ per meter for red light at 680 nm, $13.6 \\times 10^{-6}$ for green at 550 nm and $33.1 \\times 10^{-6}$ for blue at 440 nm. The piece uses the compact form $\\beta_R = 1.24 \\times 10^{-6}\\,\\lambda^{-4}$ m⁻¹ with $\\lambda$ in micrometers, averaged over each 30 nm bin. The density of air falls off with height roughly exponentially, $\\rho_R(h) = e^{-h/H_R}$ with a scale height $H_R = 8$ km, so most scattering happens in the lowest ten kilometers.',
        },
        {
          type: 'p',
          text: 'Where the light goes is described by a *phase function*, the probability of scattering through an angle $\\theta$. For Rayleigh scattering it is gentle and symmetric, a little stronger forward and backward than sideways:',
        },
        { type: 'math', tex: 'P_R(\\theta) = \\frac{3}{16\\pi}\\left(1 + \\cos^2\\theta\\right)' },
        { type: 'h', text: 'Haze and clouds: Mie scattering' },
        {
          type: 'p',
          text: 'Aerosols, the dust, salt, smoke and droplets in the lower air, are around a micrometer across, similar to the wavelength. For them Mie’s theory gives a scattering coefficient that depends only weakly on wavelength and a phase function sharply peaked forward. That is why haze whitens the horizon, why the sky near the sun is bright and white, and why clouds, whose droplets are ten micrometers or more, look white or gray rather than blue. The piece uses a light, clear-day haze, scattering $4.0 \\times 10^{-6}$ m⁻¹ at sea level with a scale height of 1.2 km, and the Cornette–Shanks form of the phase function with asymmetry $g = 0.8$:',
        },
        { type: 'math', tex: 'P_M(\\theta) = \\frac{3}{8\\pi} \\cdot \\frac{(1 - g^2)(1 + \\cos^2\\theta)}{(2 + g^2)(1 + g^2 - 2g\\cos\\theta)^{3/2}}' },
        { type: 'h', text: 'Transmittance and air mass' },
        {
          type: 'p',
          text: 'Light traveling through the air is dimmed by everything that scatters or absorbs it. Along a path, the transmittance at each wavelength is the exponential of minus the *optical depth* $\\tau$, the sum over species of coefficient times column density:',
        },
        {
          type: 'math',
          tex: 'T(\\lambda) = e^{-\\tau(\\lambda)}, \\qquad \\tau(\\lambda) = \\beta_R(\\lambda) \\int \\rho_R\\, ds + \\beta_M^{\\text{ext}} \\int \\rho_M\\, ds + \\sigma_{O_3}(\\lambda) \\int n_{O_3}\\, ds',
          label: '(2)',
        },
        {
          type: 'p',
          text: 'The *air mass* is the column along the path divided by the column straight up. For a high sun it is close to $1/\\cos z$, where $z$ is the angle from the zenith; at noon on this plate, with the sun 44.6° high, it is 1.42. But the Earth is round, so the air mass does not run off to infinity at the horizon: it peaks at about 38. Thirty-eight times the vertical optical depth is enough to remove almost all the blue and most of the green from the direct sun, which is why the setting sun is red.',
        },
        { type: 'figure', svg: pathFigure, alt: 'A curved Earth with an exaggerated shell of atmosphere; a short steep ray to the noon sun and a long grazing ray to the setting sun.', caption: 'At noon the light crosses a little more air than the vertical column; at sunset, about thirty-eight times as much.' },
        { type: 'h', text: 'Single scattering' },
        {
          type: 'p',
          text: 'To find the sky’s brightness in some direction $\\mathbf{v}$, follow that line of sight from the eye out to the top of the atmosphere. Every small piece of air along it, at distance $t$ and height $h$, is lit by sunlight that has crossed the air between it and the sun, and scatters a little of that light toward you, which is then dimmed again on its way to you. Adding up the pieces gives the single-scattering integral:',
        },
        {
          type: 'math',
          tex: 'L(\\lambda) = E(\\lambda) \\int_0^{t_{\\max}} T_{\\text{eye}}(t)\\, T_{\\text{sun}}(t) \\left[ \\beta_R(\\lambda) \\rho_R(h) P_R(\\theta) + \\beta_M \\rho_M(h) P_M(\\theta) \\right] dt',
          label: '(3)',
          caption: '$E(\\lambda)$ is the solar spectral irradiance above the atmosphere, $T_{\\text{eye}}$ and $T_{\\text{sun}}$ the transmittances from the point to the eye and to the sun, and $\\theta$ the angle between the line of sight and the sun.',
        },
        {
          type: 'p',
          text: 'Everything in the sky follows from equation (3). Looking up at noon, the integrand is dominated by $\\beta_R \\propto \\lambda^{-4}$, so the sky is blue. Looking toward the horizon, the path is long; the air near you scatters a lot of light, but light from far along the path is dimmed on the way, and the result saturates toward the color of the sunlight itself, a pale whitish blue. Toward the setting sun, $T_{\\text{sun}}$ has removed the blue, so what is scattered is orange. And when the sun is below the horizon, $T_{\\text{sun}}$ is zero for every point inside the Earth’s shadow: only the air above the shadow line is lit.',
        },
        { type: 'figure', svg: blueFigure, alt: 'Curves of wavelength to the minus four, the solar spectrum, their product, and the eye’s sensitivity, across the visible spectrum.', caption: 'Skylight is sunlight times $\\lambda^{-4}$: richest in violet. The eye, most sensitive in the green, reads the mixture as blue.' },
        { type: 'h', text: 'From spectrum to color' },
        {
          type: 'p',
          text: 'A spectrum is not yet a color. The eye has three kinds of cone, and in 1931 the CIE standardized three color-matching functions $\\bar{x}, \\bar{y}, \\bar{z}$ that predict, for an average observer, which mixtures look alike. Integrating the computed radiance against them gives the tristimulus values, which a fixed matrix turns into the red, green and blue of an sRGB display:',
        },
        { type: 'math', tex: 'X = \\int L(\\lambda)\\, \\bar{x}(\\lambda)\\, d\\lambda, \\quad Y = \\int L(\\lambda)\\, \\bar{y}(\\lambda)\\, d\\lambda, \\quad Z = \\int L(\\lambda)\\, \\bar{z}(\\lambda)\\, d\\lambda' },
        {
          type: 'p',
          text: 'The luminance $Y$, multiplied by 683 lumens per watt, is in candelas per square meter, so the piece knows how bright its sky really is: a few thousand cd/m² at noon, a few in the blue hour, a few hundredths when the sun is seven or eight degrees down. That number drives the exposure, and below a few cd/m² it also drives a shift toward the way a dark-adapted eye sees, described below.',
        },
        { type: 'h', text: 'Earth’s shadow and the Belt of Venus' },
        {
          type: 'p',
          text: 'Just after sunset, look away from the sun. Low on the horizon there is a band of blue-gray, darker than the sky above it and rising a degree or so for each degree the sun sinks: the shadow of the Earth, cast on its own atmosphere. Above it lies a band of rose or salmon pink, the *Belt of Venus*, also called the antitwilight arch. It is air high enough to be lit by the set sun, whose light has crossed so much atmosphere that it is reddened, and Rayleigh scattering, which is as strong backward as forward, returns some of it to you. At dawn the order reverses: the shadow sinks into the western horizon as the sun rises behind you. In the piece both appear from equation (3) alone, because the shadow is simply the region where $T_{\\text{sun}} = 0$.',
        },
        { type: 'h', text: 'Ozone and the blue hour' },
        {
          type: 'p',
          text: 'Ozone is a trace gas, a few parts per million concentrated between about 15 and 35 km. Vertically it removes only about four percent of orange light. But in twilight the light that still reaches the air above you has grazed the Earth on its way, crossing the ozone layer almost edge-on, over a path of a thousand kilometers or more, and there the Chappuis band takes out a large part of the yellow, orange and red. What is left, scattered toward you by the air overhead, is blue. The piece’s light-path panel shows this live: in twilight it plots the transmittance of the light grazing about twelve kilometers up, with a dashed curve for the same path without ozone; the gap between them, labeled O₃, is the blue hour.',
        },
        {
          type: 'table',
          head: ['Sun', 'Name', 'What you see'],
          rows: [
            ['0 to −4°', 'Civil twilight, golden-hour afterglow', 'Orange horizon, shadow and Belt of Venus opposite'],
            ['−4 to −8°', 'The blue hour', 'Deep blue overhead; the shadow fills the antisolar sky'],
            ['−6 to −12°', 'Nautical twilight', 'Horizon still visible; the brightest stars'],
            ['−12 to −18°', 'Astronomical twilight', 'A faint glow toward the sun; most stars'],
            ['below −18°', 'Night', 'Airglow and starlight only'],
          ],
          caption: 'The photographers’ blue hour overlaps the end of civil and the start of nautical twilight.',
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
          text: 'Blue Hour is one TypeScript module drawing to a single canvas. There are no images, textures or libraries. Every frame it solves equation (3) for about nine hundred lines of sight at twelve wavelengths, converts the result to color, and paints a panorama of the sky: a full 360° in a wide frame, narrowing to 180° on a phone held upright, so the antisolar sky is always in view. The land, the stars, the instruments and the captions are drawn on top in hairlines.',
        },
        { type: 'h', text: 'The atmosphere' },
        {
          type: 'p',
          text: 'The model atmosphere follows Eric Bruneton’s reference implementation of precomputed atmospheric scattering: an Earth of radius 6,360 km under a 60 km shell; air with an 8 km scale height; haze with a 1.2 km scale height; and 300 Dobson units of ozone in a tent-shaped layer from 10 to 40 km, peaking at 25. The extraterrestrial solar spectrum is the ASTM G-173 reference, and the ozone cross-sections are laboratory values for 233 K, both binned at 10 nm and then averaged into the piece’s twelve 30 nm bins. The observer stands 200 m up, on the hill.',
        },
        { type: 'h', text: 'A table instead of an integral' },
        {
          type: 'p',
          text: 'The expensive part of equation (3) is $T_{\\text{sun}}$, a second integral from every sample point to the top of the atmosphere. Since it depends only on the point’s height and the angle of the sun there, the piece computes it once, at load, as a table of column densities for air, haze and ozone: 32 heights by 64 directions, each a 110-step march. The direction axis is measured from the local horizon and spaced quadratically, so the grazing rays of twilight, where everything changes fastest, get most of the samples. Rays that meet the Earth return `false`: the point is in shadow.',
        },
        {
          type: 'code',
          code: `/** Column densities from (r, μ) toward the top; false if the ray meets the Earth. */
function column(r: number, mu: number, out: Float32Array) {
  const h = clamp(r - RE, 0, 60000)
  const rr = RE + h
  const md = -Math.sqrt(Math.max(0, 1 - (RE * RE) / (rr * rr)))
  if (mu < md) return false
  const fu = Math.sqrt(Math.min(1, (mu - md) / (1 - md))) * (NUL - 1)
  const fv = Math.sqrt(h / 60000) * (NHL - 1)
  const iv = Math.min(NHL - 2, fv | 0)
  const iu = Math.min(NUL - 2, fu | 0)
  const a = fv - iv
  const b = fu - iu
  const o00 = (iv * NUL + iu) * 3
  const o10 = o00 + NUL * 3
  for (let c = 0; c < 3; c++) {
    out[c] = (LUT[o00 + c] * (1 - b) + LUT[o00 + 3 + c] * b) * (1 - a) + (LUT[o10 + c] * (1 - b) + LUT[o10 + 3 + c] * b) * a
  }
  return true
}`,
          caption: '`md` is the direction cosine of the horizon at that height; anything below it hits the ground.',
        },
        { type: 'h', text: 'The sky grid' },
        {
          type: 'p',
          text: 'The observer’s sky is symmetric about the vertical plane through the sun, so the grid is laid out relative to the sun: 30 azimuths from the sun to the antisolar point, spaced as $u^{1.6}$ to crowd the bright aureole, by 28 elevations from −1° to the zenith, spaced as $u^2$ to crowd the horizon. Each line of sight is marched in 16 steps that bunch toward the eye, where the air is densest. The parts of the march that do not depend on the sun (each step’s height, its share of air and haze, and the column already crossed) are computed once. A frame then costs one table lookup and twelve exponentials per step:',
        },
        {
          type: 'code',
          code: `for (let n = 0; n < NS; n++) {
  const o = s * NS + n
  const mu = SPY[o] * se + SPZ[o] * ce
  if (!column(SR[o], mu, col)) continue
  const aR = SVR[o] + col[0]
  const aM = SVM[o] + col[1]
  const aO = SVO[o] + col[2]
  const wr = SWR[o] * pr
  const wm = SWM[o] * pm * BETA_MS
  const ext = BETA_ME * aM
  for (let k = 0; k < NB; k++) Lss[L + k] += Math.exp(-(BR[k] * aR + ext + BO[k] * aO)) * (BR[k] * wr + wm)
}
for (let k = 0; k < NB; k++) Lss[L + k] *= E0[k]`,
          caption: 'Equation (3) for one line of sight. `aR`, `aM`, `aO` are the total columns of air, haze and ozone, eye to point to sun; `pr` and `pm` the two phase functions.',
        },
        {
          type: 'p',
          text: 'Because the sky changes slowly, alternate frames each recompute half of the lines of sight; a jump in time recomputes them all. A frame, sky included, takes a few milliseconds of script time.',
        },
        { type: 'h', text: 'Light scattered more than once' },
        {
          type: 'p',
          text: 'Single scattering underestimates the sky wherever direct sunlight cannot reach: Earth’s shadow comes out nearly black and the deep-twilight zenith too dark. Real air is also lit by the sky itself. The piece adds a simple isotropic estimate of that second-order light: the sky’s downwelling radiance, $\\bar{L}(\\lambda)$, the cosine-weighted mean of the single-scattered sky (the irradiance on the ground divided by $\\pi$), scattered into each line of sight in proportion to how much scattering material it crosses:',
        },
        { type: 'math', tex: 'L_{\\text{ms}}(\\lambda) \\approx \\bar{L}(\\lambda) \\left(1 - e^{-\\tau_s(\\lambda)}\\right)', caption: '$\\tau_s$ is the scattering optical depth of the whole line of sight. For a thin path this is $\\bar{L}\\,\\tau_s$, which carries another factor of $\\lambda^{-4}$, so the extra light is bluer than the light it came from.' },
        {
          type: 'p',
          text: 'Weighting by the cosine counts the sky overhead, ozone-filtered and blue in twilight, more than the warm glow on the horizon, and lets the shadow fill with blue-gray instead of black.',
        },
        { type: 'h', text: 'Aerial perspective' },
        {
          type: 'p',
          text: 'The distant ridges are not given a color. Each is a line of sight ending at a hillside, 24 km away for the far ridge and 7 km for the middle one, integrated with the same code: what you see is the dark, shaded slope dimmed by the air in front of it, plus the light that air scatters toward you. Leonardo’s blue mountains come out by themselves at noon; at sunset the haze toward the sun glows and the slopes away from it go dusky. The near hill, its tree and the figure are drawn as a silhouette, lit only by the sky.',
        },
        { type: 'h', text: 'Exposure and the eye' },
        {
          type: 'p',
          text: 'The sky spans a factor of a million in brightness over the day, and a display spans about a hundred. Like an eye, the piece adapts, but not completely, so that night stays dark. The exposure is set from the mean luminance $\\bar{Y}$ of the sky above 6°: $k = 0.3 / (\\bar{Y} + 7 \\times 10^{-4})^{0.82}$. A tone curve then compresses luminance, $Y\' = 1 - e^{-(kY)^{0.75}}$, and scales red, green and blue together so that hues are kept, bleaching to white only where a color would overflow, as around the sun.',
        },
        {
          type: 'code',
          code: `// mesopic: rod weight from absolute luminance (cd/m²), 3 → 0.003
const cd = 683 * Yl
const rod = cd > 3 ? 0 : clamp(Math.log10(3 / Math.max(1e-6, cd)) / 3) * 0.75
if (rod > 0) {
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
  const V = Math.max(0, Yl * (1.33 * (1 + (Yl + Z) / Math.max(1e-12, X)) - 1.68)) * k
  const Vt = 1 - Math.exp(-Math.pow(V, TONE_P))
  R = R * (1 - rod) + Vt * SCOTO[0] * rod
  G = G * (1 - rod) + Vt * SCOTO[1] * rod
  B = B * (1 - rod) + Vt * SCOTO[2] * rod
}`,
          caption: 'Below about 3 cd/m² the rods take over from the cones (the Purkinje shift). The scotopic luminance uses the approximation of Larson, Rushmeier and Piatko (1997); the rod image is drawn as a dim, slightly blue gray.',
        },
        {
          type: 'p',
          text: 'Where the sky falls toward black, the site’s own night ground shows through, standing in for airglow and starlight.',
        },
        { type: 'h', text: 'Drawing the sky' },
        {
          type: 'p',
          text: 'The tone-mapped grid is refined four times in each direction with Catmull–Rom splines, which removes the faint banding a coarse grid leaves, then resampled per pixel into an image at a half to a quarter of the screen’s resolution, with a 4 × 4 ordered dither so that the dark blues of twilight do not band in eight bits. The image is scaled up smoothly and crossed with fine horizontal hairlines every three pixels, so the sky reads as an engraved plate rather than a gradient.',
        },
        { type: 'h', text: 'The day' },
        {
          type: 'p',
          text: 'The sun’s position is the textbook formula for latitude 40° N and the solar declination of 6 October, −5.4°: $\\sin a = \\sin\\phi \\sin\\delta + \\cos\\phi \\cos\\delta \\cos H$, where $H$ is the hour angle. Piece time maps to hour angle through a monotone cubic spline that spends about a second on each degree of hour angle in the evening twilight and a seventh of that at midday, so the 78 s loop lingers where the color is. The sun disc is lifted by atmospheric refraction (about half a degree at the horizon, from Sæmundsson’s formula) and flattened slightly as it sets. Dragging maps your pointer’s azimuth back to an hour angle, and the hour angle back to piece time.',
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
            '**The dotted arc** is the sun’s path across the sky today, with a tick for each hour and labels at 09, 12 and 15. Hover anywhere in the sky to see where the sun would stand at that azimuth, and when.',
            '**The dashed ring under the hill** marks where the sun is when it is below the horizon, with its elevation. Twilight is what the sky does with a sun in that ring.',
            '**Top right:** the sun’s elevation, local solar time, compass azimuth, air mass (a dash when the sun is down), and the name of the moment: golden hour, civil dusk, blue hour, nautical, astronomical, night.',
            '**The elevation gauge** on the right edge runs from +50° to −20°, with the three twilights hatched, densest for astronomical. The small triangle is the sun.',
            '**The light-path panel, top left:** a sketch of the light’s route through an exaggerated shell of air, and its transmittance $T(\\lambda)$ on a logarithmic scale, as twelve colored hairlines. By day it is the direct sun; in twilight it is the light still reaching the air overhead, with a dashed curve showing the same path without ozone.',
            '**Earth’s shadow and Belt of Venus** labels appear opposite the sun from just before sunset to the end of civil twilight (and the same at dawn), with the antisolar point marked.',
            '**Venus** is labeled when it first shows in the evening; the stars appear wherever the sky has grown darker than they are, and dim toward the horizon.',
            '**The 24-hour ruler** along the bottom hatches the three twilights of this date, morning and evening; the white tick is now.',
          ],
        },
        {
          type: 'table',
          head: ['Time', 'Sun', 'Beat'],
          rows: [
            ['0–7 s', '−55 to −18°', 'Night: stars turning slowly overhead'],
            ['7–20 s', '−18 to 0°', 'Dawn: a glow before the sun; the shadow sinks in the west'],
            ['20–46 s', '0 to 44.6 to 10°', 'Sunrise, white-blue noon, afternoon'],
            ['46–54 s', '10 to 0°', 'Golden hour and sunset'],
            ['54–66 s', '0 to −12°', 'Afterglow, the Belt of Venus, the blue hour, the first star'],
            ['66–78 s', '−12 to −55°', 'The stars come out; night again'],
          ],
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
            '**Multiple scattering is estimated, not computed.** The isotropic term is a deliberate shortcut. Full treatments iterate the scattering integral or precompute it in tables; this one is tuned to look right and errs toward a slightly paler sky.',
            '**No clouds, no volcanoes, no city.** The haze is a single clear-day layer. Real sunsets vary enormously with aerosols; after a large eruption they can stay vivid for months.',
            '**Twelve wavelength bins.** Enough for smooth spectra like skylight, but the solar spectrum’s dark absorption lines are averaged away.',
            '**The sun is drawn larger than it is.** Its true diameter, about half a degree, would be a pixel or two on this panorama.',
            '**The perceptual steps are approximations.** The exposure curve and the rod shift are simple models of adaptation, not a model of any particular eye or camera.',
            '**The land is a stylized silhouette.** Only the distant ridges are computed; the near hill, tree and figure are drawn.',
            '**The day is compressed unevenly**, and the stars rotate with the sun rather than gaining their extra four minutes a day.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'On the light from the sky, its polarization and colour', by: 'Lord Rayleigh (J. W. Strutt)', year: '1871', note: '*Philosophical Magazine* 41. The inverse-fourth-power law.' },
    { title: 'On the transmission of light through an atmosphere containing small particles in suspension, and on the origin of the blue of the sky', by: 'Lord Rayleigh', year: '1899', note: '*Philosophical Magazine* 47. Air molecules are enough.' },
    { title: 'Explanation of the brightness and color of the sky, particularly the twilight sky', by: 'E. O. Hulburt', year: '1953', note: '*Journal of the Optical Society of America* 43. Why the blue hour needs ozone.' },
    { title: 'Human color vision and the unsaturated blue color of the daytime sky', by: 'Glenn S. Smith', year: '2005', note: '*American Journal of Physics* 73. Why the sky is blue, not violet.' },
    { title: 'Precomputed Atmospheric Scattering', by: 'Eric Bruneton & Fabrice Neyret', year: '2008', note: '*Computer Graphics Forum* 27(4). The model atmosphere used here comes from Bruneton’s later open-source reference implementation.' },
    { title: 'Display of the Earth taking into account atmospheric scattering', by: 'Tomoyuki Nishita et al.', year: '1993', note: 'SIGGRAPH 93. The classic single-scattering sky.' },
    { title: 'A Scalable and Production Ready Sky and Atmosphere Rendering Technique', by: 'Sébastien Hillaire', year: '2020', note: '*Computer Graphics Forum* 39(4). A fast, careful treatment of multiple scattering.' },
    { title: 'A Visibility Matching Tone Reproduction Operator for High Dynamic Range Scenes', by: 'Gregory Ward Larson, Holly Rushmeier & Christine Piatko', year: '1997', note: '*IEEE Transactions on Visualization and Computer Graphics* 3(4). The scotopic approximation.' },
    { title: 'Color and Light in Nature', by: 'David K. Lynch & William Livingston', note: 'Cambridge University Press. Twilight, the Belt of Venus and much else, with photographs.' },
    { title: 'Clouds in a Glass of Beer', by: 'Craig F. Bohren', year: '1987', note: 'Wiley. Simple experiments in atmospheric physics, including why the sky is not violet.' },
    { title: 'The Nature of Light and Colour in the Open Air', by: 'M. Minnaert', note: 'Dover. The field guide to looking up.' },
  ],
}

export default guide
