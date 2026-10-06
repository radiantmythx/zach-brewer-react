import type { Guide } from '../guide'

const curvesFigure = `<svg viewBox="0 0 440 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="50" y1="20" x2="50" y2="180"/>
  <line x1="50" y1="180" x2="420" y2="180"/>
  <rect x="150" y="20" width="44" height="160" fill="currentColor" stroke="none" opacity="0.08"/>
  <text x="152" y="34" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.7">VISIBLE</text>
  <path d="M120 180 C 170 120 205 112 245 118 S 340 150 420 160" stroke="#E0A060"/>
  <path d="M72 180 C 100 90 125 66 160 70 S 300 120 420 140" stroke="#F3F6F2"/>
  <path d="M52 112 C 60 40 76 30 96 34 S 260 90 420 116" stroke="#9FC0FF"/>
  <path d="M60 20 L 300 170" stroke-dasharray="3 4" opacity="0.5"/>
  <circle cx="96" cy="34" r="2.5" fill="#9FC0FF" stroke="none"/>
  <circle cx="160" cy="70" r="2.5" fill="#F3F6F2" stroke="none"/>
  <circle cx="245" cy="118" r="2.5" fill="#E0A060" stroke="none"/>
  <text x="252" y="112" font-family="Geist Mono, monospace" font-size="9" fill="#E0A060" stroke="none">2,700 K</text>
  <text x="168" y="64" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">5,772 K</text>
  <text x="104" y="28" font-family="Geist Mono, monospace" font-size="9" fill="#9FC0FF" stroke="none">20,000 K</text>
  <text x="262" y="150" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.7">WIEN: PEAKS ON A LINE</text>
  <text x="300" y="200" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">LOG WAVELENGTH</text>
  <text x="10" y="14" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">LOG RADIANCE</text>
</svg>`

const guide: Guide = {
  lede: 'Heat anything and it glows: first a dull red, then orange, white and finally blue-white. Planck’s law says exactly how much light of each color a hot body gives off, and that one law turns the colors of the stars into a thermometer.',
  facts: [
    ['Law', 'Planck, 1900: $B_\\lambda(T) = \\dfrac{2hc^2}{\\lambda^5} \\dfrac{1}{e^{hc/\\lambda k T} - 1}$'],
    ['Peak', 'Wien’s law: $\\lambda_{\\max} T = 2{,}898\\ \\mu\\text{m·K}$'],
    ['Total', 'Stefan–Boltzmann: $M = \\sigma T^4$, $\\sigma = 5.670 \\times 10^{-8}\\ \\text{W·m}^{-2}\\text{K}^{-4}$'],
    ['Temperatures', '1,000 K to 30,000 K on a logarithmic scale'],
    ['Plot', 'Log–log, 80 nm to 10 µm, spectral radiance per nanometre'],
    ['Color', 'Planck’s law against the CIE 1931 observer, to sRGB (`color.blackbody`)'],
    ['Stars', '1,500 (520 on the card), a synthetic population with the Sun among them'],
    ['The Sun', '5,772 K, spectral type G2 V'],
    ['Running time', '72 s in five chapters, looping'],
    ['Sound', 'Optional: a tone a fifth higher for every doubling of temperature'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Previous or next chapter' }],
    gestures: [
      { gesture: 'drag', action: 'Drag the temperature scale, or drag across the plot to place the peak, to set the temperature' },
      { gesture: 'move', action: 'Hover a star to read its temperature, luminosity and kind' },
      { gesture: 'drag', action: 'Drag across the HR diagram to draw a line of constant temperature' },
      { gesture: 'tap', action: 'Tap or drag the ruler along the bottom to move through the chapters' },
    ],
    tip: 'Drag the temperature slowly up from 1,000 K and watch the peak walk toward the visible band: the filament turns white when the curve is nearly level across the band, around 6,000 K, and only turns bluish once the peak has passed into the ultraviolet.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Heat a thing and it glows',
      blocks: [
        {
          type: 'p',
          text: 'Everything warm gives off light. At room temperature the light is far in the infrared and invisible, though a thermal camera sees it. Heat a poker in a fire and at around 800 K (about 500 °C) it begins to glow a dim, deep red. Hotter, it turns orange; a candle flame’s glowing soot is about 1,850 K, the filament of an ordinary incandescent bulb about 2,700 K, and both look yellowish. The surface of the Sun, at about 5,800 K, looks white. Stars hotter still, at 10,000 to 30,000 K, are blue-white. The sequence is always the same, whatever the material, because the color is set by temperature alone.',
        },
        {
          type: 'p',
          text: 'The ideal case is a **blackbody**: an object that absorbs all light that falls on it, reflecting none, so that the only light it gives off is its own thermal glow. A small hole in the side of a hot, closed furnace behaves almost exactly like one. A tungsten filament, a lump of coal and the surface of a star are not perfect blackbodies, but they are close enough that their color tells you their temperature, which is how pyrometers in steelworks and astronomers looking at stars both measure heat from a distance.',
        },
        { type: 'h', text: 'From Kirchhoff to Planck' },
        {
          type: 'p',
          text: 'In 1859 and 1860 Gustav Kirchhoff proved that, at a given temperature and wavelength, the ratio of how well a body emits light to how well it absorbs it is the same for every material. A perfect absorber, which he called a *black body*, must therefore emit a universal spectrum that depends only on its temperature. Finding that spectrum became one of the central problems of nineteenth-century physics. Josef Stefan found from experimental data in 1879 that the total power radiated grows as the fourth power of temperature, and Ludwig Boltzmann derived the same law from thermodynamics in 1884. In 1893 Wilhelm Wien showed that the spectrum keeps the same shape as the temperature changes, with its peak sliding to shorter wavelengths in inverse proportion to temperature: his *displacement law*.',
        },
        {
          type: 'p',
          text: 'The full shape resisted. Wien’s own guess worked at short wavelengths and failed at long ones. Lord Rayleigh, in 1900, and James Jeans, who corrected a factor in 1905, derived a law from classical physics that worked at long wavelengths and failed absurdly at short ones: it predicted that the radiation should grow without limit toward the ultraviolet, so that any hot body would radiate infinite energy. Paul Ehrenfest later called this the *ultraviolet catastrophe*. Meanwhile, careful measurements in Berlin by Otto Lummer and Ernst Pringsheim, and by Heinrich Rubens and Ferdinand Kurlbaum deep in the infrared, pinned down the real curve.',
        },
        {
          type: 'p',
          text: 'Max Planck found a formula that fitted every measurement and presented it to the German Physical Society on 19 October 1900. Searching for a derivation, he was led, as he later described it, to an act of desperation: he assumed that the oscillators exchanging energy with the radiation could only take or give energy in whole multiples of a tiny step, $h\\nu$, proportional to the frequency $\\nu$. He presented that derivation on 14 December 1900. Planck regarded the steps as a mathematical device; Albert Einstein took them literally in 1905, and the quantum theory began.',
        },
        { type: 'h', text: 'Color temperature in everyday life' },
        {
          type: 'p',
          text: 'Because the color of a blackbody depends only on its temperature, the temperature has become the standard way to describe the color of white light. A warm-white LED sold as 2,700 K is designed to match the color of a 2,700 K blackbody, close to an incandescent bulb, although nothing in it is that hot; this is its *correlated color temperature*, the temperature of the blackbody whose color is nearest. Daylight-white lamps are 5,000 to 6,500 K, the sRGB standard’s white point corresponds to about 6,500 K, and an overcast sky or the blue light of shade can be well above 7,000 K. Photographers call low temperatures warm and high ones cool, the opposite of the physics, because the low ones look like firelight.',
        },
        { type: 'h', text: 'Every star is a temperature' },
        {
          type: 'p',
          text: 'Around 1910 Ejnar Hertzsprung in Denmark and Henry Norris Russell in Princeton independently plotted stars by their brightness and their color or spectral type, and found that they do not scatter randomly. Most lie along one diagonal band, the **main sequence**, running from hot, luminous blue stars to cool, faint red ones. Above it lie red **giants** and **supergiants**, as cool as the faintest dwarfs but hundreds to hundreds of thousands of times brighter; below it, hot but extremely faint **white dwarfs**. The Hertzsprung–Russell diagram, drawn with temperature increasing to the left by a convention inherited from the spectral sequence, is the single most useful picture in astrophysics: a star’s place on it reveals its size, its stage of life and, on the main sequence, its mass.',
        },
        {
          type: 'p',
          text: 'The Sun sits on the main sequence near the middle, a star of spectral type G2 with an effective temperature of 5,772 K. Astronomers call such stars *yellow dwarfs*. The name is a little unfair: above the atmosphere the Sun’s light is white, and it looks yellow from the ground mainly because the air scatters away some of its blue, which is why the sky is blue. On this piece’s scale the Sun’s swatch is a slightly warm white.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Physics',
      title: 'Planck’s law and what follows from it',
      blocks: [
        {
          type: 'p',
          text: 'Planck’s law gives the spectral radiance of a blackbody: the power it emits per unit area, per unit solid angle, per unit wavelength, at wavelength $\\lambda$ and temperature $T$:',
        },
        { type: 'math', tex: 'B_\\lambda(T) = \\frac{2hc^2}{\\lambda^5}\\,\\frac{1}{e^{hc/\\lambda k_B T} - 1}', label: '(1)' },
        {
          type: 'p',
          text: 'Here $h = 6.626 \\times 10^{-34}$ J·s is Planck’s constant, $c$ the speed of light and $k_B = 1.381 \\times 10^{-23}$ J/K Boltzmann’s constant. The first factor rises steeply toward short wavelengths; the second, the quantum part, shuts the spectrum off when a single quantum of light, $hc/\\lambda$, carries much more energy than the typical thermal energy $k_B T$. At long wavelengths, where $hc/\\lambda \\ll k_B T$, the exponential can be expanded and the law reduces to the classical Rayleigh–Jeans form,',
        },
        { type: 'math', tex: 'B_\\lambda(T) \\approx \\frac{2 c k_B T}{\\lambda^4}', caption: 'Correct in the infrared, and divergent as $\\lambda \\to 0$: the ultraviolet catastrophe, which the quantum factor in (1) removes.' },
        { type: 'h', text: 'Wien and Stefan–Boltzmann' },
        {
          type: 'p',
          text: 'Setting the derivative of (1) to zero gives the wavelength of the peak, and integrating it over all wavelengths and directions gives the total power emitted per unit area:',
        },
        { type: 'math', tex: '\\lambda_{\\max} = \\frac{b}{T}, \\quad b = 2.898 \\times 10^{-3}\\ \\text{m·K} \\qquad\\qquad M = \\sigma T^4', label: '(2)' },
        {
          type: 'p',
          text: 'At 1,000 K the peak is at 2.9 µm, far in the infrared, and only the faint short-wavelength tail of the curve reaches the visible band: that sliver of red is the ember’s glow. At 5,772 K the peak is at 502 nm, in the blue-green. At 30,000 K it is at 97 nm, in the ultraviolet. Meanwhile the total power, $\\sigma T^4$, grows from about 57 kilowatts per square metre at 1,000 K to nearly 46 gigawatts per square metre at 30,000 K, eight hundred thousand times more.',
        },
        { type: 'h', text: 'Why log–log axes' },
        {
          type: 'p',
          text: 'Across that range the peak radiance changes by a factor of about twenty-four million (it grows as $T^5$), so curves for different temperatures cannot share ordinary axes. On logarithmic axes something lovely happens: every blackbody curve has exactly the same shape, simply slid along a straight line. Equation (1) depends on $\\lambda$ and $T$ only through the combination $\\lambda T$, apart from an overall factor of $T^5$, so on log axes a change of temperature is a pure translation, and the peaks fall on a line of slope −5. That dashed line is Wien’s law drawn on the plot.',
        },
        { type: 'figure', svg: curvesFigure, alt: 'Three blackbody curves on logarithmic axes, for 2,700 K, 5,772 K and 20,000 K, the same shape shifted, with their peaks on a dashed diagonal and a shaded visible band.', caption: 'On log–log axes every blackbody curve is the same shape, translated. The peaks lie on Wien’s line; the visible band is a narrow slice.' },
        { type: 'h', text: 'Why the colors go red, white, blue' },
        {
          type: 'p',
          text: 'The color you see depends on the shape of the curve across the narrow visible band, 380 to 780 nm. When the band is on the steep short-wavelength side of the peak, red is much stronger than blue and the glow is red or orange. As the temperature rises, the peak moves toward the band and the curve flattens across it; around 6,000 K it is nearly level and the light looks white. When the peak has moved past the band into the ultraviolet, the visible band sits on the long-wavelength tail, which falls toward the red, and the light looks bluish. It never becomes deep blue: even at infinite temperature, the Rayleigh–Jeans tail, $\\propto \\lambda^{-4}$, gives a pale sky blue.',
        },
        { type: 'h', text: 'Luminosity, radius and the HR diagram' },
        {
          type: 'p',
          text: 'A star is not exactly a blackbody, but its *effective temperature* is defined as the temperature of a blackbody of the same size that would emit the same total power. Its luminosity is then',
        },
        { type: 'math', tex: 'L = 4\\pi R^2 \\sigma T_{\\text{eff}}^4', label: '(3)' },
        {
          type: 'p',
          text: 'This is why the HR diagram has its shape. Two stars at the same temperature differ in luminosity only through their radii, so the giants above the main sequence are huge (tens to hundreds of times the Sun’s radius) and the white dwarfs below it are tiny, about the size of the Earth. Lines of constant radius run diagonally across the diagram. The main sequence itself is the stage of life in which a star burns hydrogen in its core; a star’s position along it is set mainly by its mass, the hot, luminous end being the massive, short-lived stars.',
        },
        { type: 'h', text: 'From Planck’s law to a color on screen' },
        {
          type: 'p',
          text: 'The site’s `color.ts` computes a blackbody’s color by integrating Planck’s law against the CIE 1931 color-matching functions, every 10 nm from 380 to 780 nm, to get its tristimulus values $X, Y, Z$. A fixed matrix converts these to linear sRGB. At low temperatures the result has a negative blue component, because a deep red blackbody is more saturated than the sRGB primaries allow; `fitGamut` adds just enough white to lift it to zero and then scales the color so that its brightest channel is 1, before the sRGB gamma curve is applied. Results are cached in 10 K steps. Dividing out the brightness is deliberate: the swatch shows the *color* of each temperature at equal brightness, because the true brightness range, a factor of hundreds of thousands, cannot be shown on a screen.',
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
          text: 'Blackbody is a single TypeScript module drawing to a canvas, a pure function of time apart from the temperature you set, which eases back to the story a few seconds after you let go. Five chapters run over 72 seconds: an ember at 1,000 K, a climb to 30,000 K, a field of stars, the stars sorting into the HR diagram, and the stars gathering back into the ember.',
        },
        {
          type: 'code',
          code: `function authoredT(T: number) {
  if (T < 7) return T_MIN
  if (T < 31) {
    // climb evenly in log T, eased at both ends
    const u = (T - 7) / 24
    const e = ease.inOutSine(u)
    return Math.exp(lerp(Math.log(T_MIN), Math.log(T_MAX), e))
  }
  if (T < 64) return T_MAX
  return Math.exp(lerp(Math.log(T_MAX), Math.log(T_MIN), ease.inOutCubic(clamp((T - 64.5) / 6))))
}`,
          caption: 'The story’s temperature. Climbing in $\\log T$ gives each factor of two the same time, so the reds and oranges are not rushed.',
        },
        { type: 'h', text: 'The plot' },
        {
          type: 'p',
          text: 'Each frame the live curve is evaluated at 200 wavelengths spaced evenly in $\\log\\lambda$ from 80 nm to 10 µm, converted to spectral radiance per nanometre, and drawn on logarithmic axes in the color of its own temperature. Six landmark curves, for an ember, a candle, a tungsten bulb, the Sun, Sirius A and a hot B star, are computed once per layout and appear as faint hairlines once the temperature has passed them. The visible band is washed with hairlines in the colors of the spectrum. Wien’s line is drawn by evaluating each curve at its own peak:',
        },
        {
          type: 'code',
          code: `// Wien's line: the peaks of every curve lie on it (slope −5 on these axes)
ctx.setLineDash([2, 4])
ctx.beginPath()
for (let s = 0; s <= 40; s++) {
  const TT = Math.exp(lerp(Math.log(250), Math.log(40000), s / 40))
  const lm = wienPeak(TT)
  const x = plotX(lm)
  const y = plotY(Bnm(lm, TT))
  if (s === 0) ctx.moveTo(x, y)
  else ctx.lineTo(x, y)
}`,
          caption: '`wienPeak` and `planck` come from `color.ts`; `Bnm` converts Planck’s per-metre radiance to per-nanometre.',
        },
        { type: 'h', text: 'The stars' },
        {
          type: 'p',
          text: 'The 1,500 stars are a synthetic population generated from a fixed seed, so the sky is the same every time. About 70 percent are on the main sequence, with luminosity read from a table of temperature against luminosity drawn from standard tables of main-sequence stars, plus a little scatter; about 16 percent are giants, many of them gathered in the *red clump* near 4,800 K; 3 percent are supergiants; and the rest are white dwarfs on a cooling line of fixed radius, from equation (3). The first star is the Sun.',
        },
        {
          type: 'code',
          code: `} else if (p < 0.7) {
  // main sequence, weighted toward the cool, common stars
  logT = lerp(3.46, 4.52, Math.pow(r(), 1.7))
  logL = msL(logT) + gauss() * 0.12
} else if (p < 0.86) {
  kind = 1
  if (r() < 0.4) {
    // the red clump
    logT = Math.log10(4800) + gauss() * 0.012
    logL = 1.7 + gauss() * 0.08
  } else {
    logT = lerp(3.53, 3.72, r())
    logL = 1.0 + ((3.72 - logT) / 0.19) * 2.2 + gauss() * 0.15
  }
} else if (p < 0.89) {
  kind = 2
  logT = lerp(3.52, 4.45, r())
  logL = lerp(4.2, 5.5, r())
} else {
  kind = 3
  logT = lerp(3.78, 4.46, Math.pow(r(), 0.8))
  logL = -3.84 + 4 * (logT - 3.7613) + gauss() * 0.12
}`,
          caption: 'The population (trimmed). The white-dwarf line is $\\log L = 2\\log(R/R_\\odot) + 4\\log(T/T_\\odot)$ with $R = 0.012\\,R_\\odot$.',
        },
        {
          type: 'p',
          text: 'Each star has a position in the sky, a little concentrated along a faint diagonal band, and a position in the HR diagram from its temperature and luminosity. In chapter IV every star eases from one to the other with its own delay, so the diagram assembles itself rather than snapping. To draw 1,500 differently colored dots quickly, the stars are sorted once into 28 bins by temperature, each bin with its blackbody color, and each frame draws one path of circles per bin: 28 fills instead of 1,500. They are added with `lighter` compositing, as starlight adds.',
        },
        { type: 'h', text: 'The ember and the sound' },
        {
          type: 'p',
          text: 'The filament is a helix drawn as a hairline over a wider, fainter stroke of the same color, with a soft radial wash of its light behind it; its strength rises gently with temperature, a stand-in for the real brightness, which rises far too steeply to show. With sound on, a sine tone follows the temperature: 1,000 K is the A two octaves below concert A, and every doubling of temperature raises it a fifth, so the climb from 1,000 to 30,000 K spans almost five fifths.',
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
            '**The ember (left or top):** a filament glowing in the computed color of its temperature, with the temperature in large numerals, a swatch of its color like a printer’s patch, and the name of a landmark when the temperature is close to one.',
            '**The plot:** spectral radiance against wavelength, both logarithmic. The washed vertical band is the visible spectrum. The bright curve is the present temperature; faint curves are landmarks already passed, labeled at their peaks. The dashed diagonal is Wien’s law.',
            '**The peak:** a dot on the curve, a dashed drop to the axis and a label giving $\\lambda_{\\max}$.',
            '**The temperature scale:** a strip of blackbody color from 1,000 to 30,000 K, spaced logarithmically, with landmarks marked above and a handle at the present temperature. Drag it.',
            '**Top right:** the temperature, the peak wavelength and the total power per square metre, $\\sigma T^4$; in the star chapters, the number of stars, the Sun’s values, or those of the star under the pointer.',
            '**The star field (III):** 1,500 dots, each in the color of its own temperature, the Sun ringed.',
            '**The HR diagram (IV):** surface temperature along the bottom, hotter to the left, and luminosity in solar units up the side, on a log scale from $10^{-4}$ to $10^{6}$. Spectral classes O B A F G K M along the top; labels for the main sequence, giants, supergiants and white dwarfs; the Sun ringed with its values.',
            '**Bottom:** the 72-second ruler with the five chapter numerals and a playhead.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: in chapter I, how little of the 1,000 K curve reaches the visible band, and yet it glows; in chapter II, the moment the peak crosses the visible band and the filament turns white; and in chapter IV, the main sequence forming as a single diagonal while the giants peel away to the upper right.',
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
            '**No filament gets that hot.** Tungsten melts at about 3,695 K. The climb beyond that is a thought experiment that hands over from the filament to the stars.',
            '**Stars are not perfect blackbodies.** Their spectra carry absorption lines and their colors are reddened by interstellar dust; the piece colors each star with a pure blackbody at its effective temperature.',
            '**The population is synthetic.** The relative numbers of main-sequence stars, giants, supergiants and white dwarfs are chosen to make a clear diagram, not drawn from a catalogue, and the main-sequence relation is a simplified table.',
            '**Colors at equal brightness.** Every swatch and dot shows the color of its temperature with the brightness divided out. The glow of the ember rises with temperature only gently, where the real brightness rises by a factor of many thousands.',
            '**The sky is a drawing.** Star positions are random, with a faint band, and their sizes are a mix of brightness and chance rather than a model of distance.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Ueber das Gesetz der Energieverteilung im Normalspectrum', by: 'Max Planck', year: '1901', note: '*Annalen der Physik* 4. The law and its derivation, after his talks of October and December 1900.' },
    { title: 'Black-Body Theory and the Quantum Discontinuity, 1894–1912', by: 'Thomas S. Kuhn', year: '1978', note: 'Oxford University Press. The history in detail, and what Planck did and did not believe.' },
    { title: 'Über das Verhältnis zwischen dem Emissionsvermögen und dem Absorptionsvermögen der Körper für Wärme und Licht', by: 'Gustav Kirchhoff', year: '1860', note: '*Annalen der Physik und Chemie* 109. The law of emission and absorption, and the black body.' },
    { title: 'Relations between the spectra and other characteristics of the stars', by: 'Henry Norris Russell', year: '1914', note: '*Nature* 93 and *Popular Astronomy* 22. The diagram that bears his name.' },
    { title: 'Resolution B3 on recommended nominal conversion constants for selected solar and planetary properties', by: 'International Astronomical Union', year: '2015', note: 'The nominal solar effective temperature, 5,772 K.' },
    { title: 'Intrinsic colors, temperatures, and bolometric corrections of pre-main-sequence stars', by: 'Mark J. Pecaut and Eric E. Mamajek', year: '2013', note: '*Astrophysical Journal Supplement* 208. With Mamajek’s widely used table of main-sequence temperatures and luminosities.' },
    { title: 'An Introduction to Modern Astrophysics', by: 'Bradley W. Carroll and Dale A. Ostlie', note: 'Cambridge University Press. Blackbody radiation, stellar temperatures and the HR diagram.' },
    { title: 'Measuring Colour', by: 'R. W. G. Hunt and M. R. Pointer', note: 'Wiley. Color temperature, correlated color temperature and the Planckian locus.' },
  ],
}

export default guide
