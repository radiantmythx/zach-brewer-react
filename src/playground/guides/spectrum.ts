import type { Guide } from '../guide'

const prismFigure = `<svg viewBox="0 0 440 230" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <path d="M220 28 L120 200 L320 200 Z"/>
  <path d="M209 46 A21 21 0 0 0 231 46" opacity="0.7"/>
  <text x="214" y="68" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">A</text>
  <line x1="40" y1="178" x2="166" y2="122"/>
  <line x1="166" y1="122" x2="274" y2="122"/>
  <line x1="274" y1="122" x2="398" y2="180" stroke="#7FB6D9"/>
  <line x1="274" y1="122" x2="404" y2="166" stroke="#E0A060"/>
  <line x1="166" y1="122" x2="300" y2="62" stroke-dasharray="3 4" opacity="0.5"/>
  <line x1="136" y1="105" x2="196" y2="139" stroke-dasharray="2 3" opacity="0.5"/>
  <path d="M146 131 A22 22 0 0 0 148 112" opacity="0.8"/>
  <text x="126" y="146" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">i</text>
  <path d="M186 133 A22 22 0 0 0 188 122" opacity="0.8"/>
  <text x="192" y="140" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">r</text>
  <path d="M330 98 A70 70 0 0 1 334 150" opacity="0.8"/>
  <text x="344" y="128" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">δ</text>
  <text x="20" y="196" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">WHITE</text>
  <text x="352" y="200" font-family="Geist Mono, monospace" font-size="9" fill="#7FB6D9" stroke="none">VIOLET, MORE</text>
  <text x="360" y="160" font-family="Geist Mono, monospace" font-size="9" fill="#E0A060" stroke="none">RED, LESS</text>
  <text x="150" y="222" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">n sin r = sin i at each face</text>
</svg>`

const guide: Guide = {
  lede: 'White sunlight enters a glass prism and leaves as a fan of colors, each bent by its own amount. Then a single color is isolated and refuses to split again, and a second prism turned the other way puts the fan back together into white. This is Newton’s argument, drawn with real glass and real rays.',
  facts: [
    ['Experiments', 'Isaac Newton, 1666–1672; *Opticks*, 1704'],
    ['Glass', 'Schott N-SF11 dense flint, from its Sellmeier equation'],
    ['Index', '$n = 1.8454$ at 400 nm, $1.7845$ at 589 nm, $1.7718$ at 700 nm'],
    ['Prism', 'Equilateral, apex angle $A = 60°$'],
    ['Minimum deviation', '$66.31°$ for the sodium D line, at incidence $63.15°$'],
    ['Spread', '$9.9°$ between 400 and 700 nm at minimum deviation'],
    ['Rays', '210 wavelengths traced every frame (92 on the card); 1,060 in chapter V'],
    ['Running time', '60 s in five chapters, looping'],
    ['Sound', 'Optional: seven voices, one for each of Newton’s colors'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Previous or next chapter' }],
    gestures: [
      { gesture: 'drag', action: 'Drag the prism to turn it and watch the deviation pass its minimum' },
      { gesture: 'drag', action: 'Drag the hole in the shutter to move the source' },
      { gesture: 'tap', action: 'Tap or drag the ruler along the bottom to move through the chapters' },
    ],
    tip: 'In chapter IV, turn the first prism yourself, as Newton did, to choose which color passes the hole. Turn it far enough the other way and violet is trapped inside the glass.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'History',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Hold a glass prism in a beam of sunlight and a band of color appears on the far wall: red at one end, violet at the other, orange, yellow, green and blue between. People had seen this for centuries, in prisms, in cut glass and in the rainbow. The usual explanation, inherited from Aristotle and still taught in the 1660s, was that colors are *modifications* of white light: glass darkens or disturbs pure white light, a little for yellow and red, more for blue and violet. On that view the prism makes the colors.',
        },
        {
          type: 'p',
          text: 'Isaac Newton thought the opposite. White light, he argued, is a mixture of rays of every color, and each kind of ray is bent by glass by its own fixed amount. The prism makes nothing; it only sorts what was already there. This is the idea the first chapter of the piece puts in one line: white light is every color at once.',
        },
        { type: 'h', text: 'Newton’s experiments' },
        {
          type: 'p',
          text: 'Newton began his experiments with prisms around 1666, when Cambridge was closed by the plague and he was working at home in Lincolnshire. (The story that he bought his first prism at Stourbridge Fair comes from later recollections and the details vary.) He darkened his room, made a small hole in the window shutter, and let the narrow beam pass through a prism onto the far wall, more than twenty feet away. The first thing that struck him was the shape: a round hole made an image about five times longer than it was wide. If glass merely tinted the light, the spot should have stayed round. A long spectrum meant that different parts of the light were being bent through different angles.',
        },
        {
          type: 'p',
          text: 'He then devised what he called the *experimentum crucis*, the crucial experiment, described in his letter to the Royal Society published in the *Philosophical Transactions* in February 1672. Behind the first prism he placed a board with a small hole, and some distance beyond it a second board with another hole, so that only a narrow slice of the spectrum, one color, could pass through both. Behind the second hole he set a second prism. Turning the first prism slowly about its axis, he made each part of the spectrum in turn pass through the holes, and watched where the second prism threw it on the wall. Two things followed. The second prism bent the light again, but the color did not change and did not spread into a new spectrum: red stayed red, blue stayed blue. And the second prism bent blue light more than red light, by the same rule as the first. Colors are not made by refraction; they are sorted by it, and a color, once separated, is fixed.',
        },
        {
          type: 'p',
          text: 'The final step is recombination. If white is a mixture, it should be possible to put the colors back together. Newton did this in several ways, with a lens that gathered the spectrum to a focus and with a second prism set the opposite way, and found white again where the colors overlapped. These and many more experiments were collected in his *Opticks* of 1704, published in English after years of controversy, much of it with Robert Hooke, who died in 1703.',
        },
        {
          type: 'aside',
          title: 'Seven colors',
          text: 'Newton named seven colors in the spectrum: red, orange, yellow, green, blue, indigo and violet. The spectrum itself is continuous, and most people would not pick out indigo. Newton chose seven partly by analogy with the seven notes of a musical scale, and in the *Opticks* he compared the spaces occupied by the colors to the divisions of a string. The optional sound in this piece borrows his idea: one voice for each of his colors, tuned to a seven-note scale.',
        },
        { type: 'h', text: 'Why it matters' },
        {
          type: 'p',
          text: 'The variation of refractive index with color, called **dispersion**, is everywhere once you look. It splits sunlight into the rainbow, it puts colored fringes around high-contrast edges seen through cheap lenses (chromatic aberration, the problem that pushed Newton to build a reflecting telescope instead), and it is the working principle of the prism spectrometer. In 1802 William Hyde Wollaston, and in 1814 Joseph von Fraunhofer with far better instruments, saw that the solar spectrum is crossed by hundreds of fine dark lines. Fraunhofer labeled the strongest with letters (C in the red, D in the yellow, F in the blue-green and so on), and half a century later Kirchhoff and Bunsen showed that each family of lines is the fingerprint of an element absorbing light in the Sun’s atmosphere. The dark lines on the screen in this piece are drawn at Fraunhofer’s positions.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Optics',
      title: 'Refraction, dispersion and the minimum',
      blocks: [
        {
          type: 'p',
          text: 'When light crosses from one transparent medium into another it changes direction. If $\\theta_1$ is the angle between the ray and the normal to the surface on one side, and $\\theta_2$ the angle on the other, **Snell’s law** relates them through the refractive indices $n_1$ and $n_2$ of the two media:',
        },
        { type: 'math', tex: 'n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2', label: '(1)' },
        {
          type: 'p',
          text: 'The refractive index $n$ of a material is the ratio of the speed of light in vacuum to its speed in the material. For air $n \\approx 1$; for ordinary window glass about 1.5; for the dense flint glass used here about 1.78. A ray going from glass back into air at too steep an angle cannot satisfy equation (1), because $\\sin\\theta_2$ would have to exceed 1; it is then totally reflected back into the glass. This is **total internal reflection**, and the piece shows it if you turn the prism far enough: violet, which bends most, is the first color to be trapped.',
        },
        { type: 'h', text: 'Index against wavelength' },
        {
          type: 'p',
          text: 'Dispersion means that $n$ depends on the wavelength $\\lambda$. In clear glass it falls slowly through the red and rises steeply toward the violet. Augustin-Louis Cauchy proposed in 1836 a simple series that captures this, and Wolfgang Sellmeier in 1871 a formula grounded in the idea that glass contains oscillators that resonate in the ultraviolet and infrared. Glass makers still publish Sellmeier coefficients for every glass they sell:',
        },
        { type: 'math', tex: 'n(\\lambda) \\approx A + \\frac{B}{\\lambda^2} \\qquad n^2(\\lambda) = 1 + \\sum_{j=1}^{3} \\frac{B_j\\,\\lambda^2}{\\lambda^2 - C_j}', caption: 'Cauchy’s two-term form (left) and Sellmeier’s equation (right). $\\lambda$ is in micrometres; $B_j$ and $C_j$ are measured constants of the glass.' },
        {
          type: 'p',
          text: 'The piece uses the Sellmeier coefficients Schott publishes for N-SF11. Between 400 nm and 700 nm the index falls from 1.8454 to 1.7718. That difference, about 0.07, is the whole of the effect: everything colorful in the drawing follows from it.',
        },
        { type: 'h', text: 'Through a prism' },
        {
          type: 'p',
          text: 'A ray entering a prism of apex angle $A$ at incidence $i$ refracts to an angle $r_1$ inside, meets the second face at $r_2 = A - r_1$, and leaves at an angle $e$. The total **deviation** $\\delta$, the angle between the ray’s original direction and its final one, is',
        },
        { type: 'math', tex: '\\sin r_1 = \\frac{\\sin i}{n}, \\qquad \\sin e = n \\sin(A - r_1), \\qquad \\delta = i + e - A', label: '(2)' },
        {
          type: 'p',
          text: 'Because $n$ is larger for violet, $r_1$ is smaller, $e$ is larger and so is $\\delta$: violet bends more. As you turn a prism, $\\delta$ changes, and it has a minimum when the ray passes through the prism symmetrically, parallel to the base, with $i = e$. At that **minimum deviation**',
        },
        { type: 'math', tex: 'n = \\frac{\\sin\\left(\\frac{A + \\delta_{\\min}}{2}\\right)}{\\sin\\left(\\frac{A}{2}\\right)}', label: '(3)', caption: 'The classical way to measure a refractive index: find the minimum, measure $\\delta_{\\min}$, read off $n$.' },
        {
          type: 'p',
          text: 'For N-SF11 at 589 nm, equation (3) gives $\\delta_{\\min} = 66.31°$ at $i = 63.15°$. The deviation curve is very flat near its minimum, so the spectrum barely moves for small turns of the prism there, and the light is most concentrated. The inset in chapter III plots $\\delta$ against $i$ for red, the D line and violet, with a dot showing the present state.',
        },
        { type: 'figure', svg: prismFigure, alt: 'A ray entering a triangular prism, bending toward the normal, crossing parallel to the base and leaving bent toward the base; violet is bent more than red.', caption: 'Snell’s law at each face. At minimum deviation the ray crosses parallel to the base, and the deviation $\\delta$ is larger for violet than for red.' },
        { type: 'h', text: 'Why rainbows' },
        {
          type: 'p',
          text: 'A raindrop is a prism with a mirror inside. Sunlight enters a spherical drop, reflects once from the back and comes out again. Rays entering at different heights leave at different angles, but they crowd together at the angle of minimum deviation, about 138° from the incoming direction, so the drop sends a concentrated beam back at about 42° from the point opposite the Sun. René Descartes worked this out ray by ray in 1637. Because water’s index varies with color, red concentrates at about 42° and violet at about 40°, and the bow is colored with red outside. It is the same minimum the inset in chapter III shows, in a different piece of glass.',
        },
        { type: 'h', text: 'From wavelength to screen color' },
        {
          type: 'p',
          text: 'To draw each ray in its own color, the piece needs to know what color light of a single wavelength looks like. That comes from the **CIE 1931 standard observer**, built from color-matching experiments by William David Wright and John Guild in the late 1920s: three curves $\\bar{x}(\\lambda)$, $\\bar{y}(\\lambda)$, $\\bar{z}(\\lambda)$ that turn any spectrum into three numbers $X, Y, Z$ describing how it looks to an average eye. Monochromatic light of wavelength $\\lambda$ has $X, Y, Z = \\bar{x}, \\bar{y}, \\bar{z}$ at that wavelength. A fixed 3×3 matrix converts these to the red, green and blue of an sRGB display in linear light, and a gamma curve encodes them.',
        },
        { type: 'math', tex: '(R, G, B)_{\\text{lin}} = \\mathbf{M}\\, (\\bar{x}(\\lambda), \\bar{y}(\\lambda), \\bar{z}(\\lambda))', caption: '$\\mathbf{M}$ is the fixed 3×3 matrix from CIE $XYZ$ to linear-light sRGB.' },
        {
          type: 'p',
          text: 'Here is the honest catch. Pure spectral colors are more saturated than anything a screen can show; they lie outside the sRGB gamut, so the matrix returns a negative value for at least one channel at almost every wavelength. The site’s `color.ts` handles this in `spectral()` the way a photograph of a spectrum does: it clips the negative channels to zero (keeping the hue as saturated as the screen allows), scales the result so its brightest channel is 1, and fades the two ends of the band, below about 420 nm and above about 670 nm, toward black, a rough stand-in for the eye’s falling sensitivity there. So the hues are as close as an sRGB screen can come, but their brightness is a choice, not a measurement.',
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
          text: 'Spectrum is a single TypeScript module drawing to a canvas. The apparatus lives in its own coordinate system, in units of the prism’s side, with the first prism at the origin. A camera maps that system onto the screen with one rotation, one scale and one offset, chosen at each size so the drawing fits (on a tall phone screen it turns the whole bench by roughly a quarter turn) and blended between three framings, one for chapters I to III, one for the experimentum crucis and one for the recombination. The story is a pure function of time, so the ruler and the arrow keys can jump anywhere; only your own turning of the prism, which drifts home a few seconds after you let go, is extra state.',
        },
        { type: 'h', text: 'The glass' },
        {
          type: 'code',
          code: `// Schott N-SF11 dense flint: Sellmeier coefficients, λ in µm
const SB = [1.73759695, 0.313747346, 1.89878101]
const SC = [0.013188707, 0.0623068142, 155.23629]
function nGlass(nm: number) {
  const l2 = (nm / 1000) ** 2
  return Math.sqrt(1 + (SB[0] * l2) / (l2 - SC[0]) + (SB[1] * l2) / (l2 - SC[1]) + (SB[2] * l2) / (l2 - SC[2]))
}
const dMin = (n: number) => 2 * Math.asin(n * Math.sin(APEX / 2)) - APEX`,
          caption: 'The refractive index for any wavelength, and equation (3) solved for the minimum deviation.',
        },
        { type: 'h', text: 'Tracing every ray' },
        {
          type: 'p',
          text: 'Every frame, every wavelength is traced from the shutter through whatever is on the bench: up to three prisms and three boards (the screen, the wall and the last screen of chapter V). The tracer finds the nearest face the ray meets, refracts it with Snell’s law in vector form, or reflects it if the law has no solution, and repeats. Rays that meet a board stop there, unless they find its hole.',
        },
        {
          type: 'code',
          code: `const exiting = inside === hp
const Nx = exiting ? -p.nx[he] : p.nx[he]
const Ny = exiting ? -p.ny[he] : p.ny[he]
const eta = exiting ? n : 1 / n
let cosi = -(dx * Nx + dy * Ny)
const kk = 1 - eta * eta * (1 - cosi * cosi)
if (kk < 0) {
  // total internal reflection
  dx += 2 * cosi * Nx
  dy += 2 * cosi * Ny
} else {
  const c = eta * cosi - Math.sqrt(kk)
  dx = eta * dx + c * Nx
  dy = eta * dy + c * Ny
  inside = exiting ? -1 : hp
}`,
          caption: 'Snell’s law as vectors (trimmed). $N$ faces the incoming light, $\\eta = n_1/n_2$, and `kk < 0` is exactly the case where equation (1) has no real angle.',
        },
        {
          type: 'p',
          text: 'The tracer also records the optical path length, the distance travelled multiplied by the refractive index, at every vertex. In chapter I the light is drawn up to a front that advances at a constant optical path per second, so the beam visibly slows as it enters the glass, by exactly the factor $n$. The drawing’s light is absurdly slow, about one prism’s width per second, but the ratio is right.',
        },
        { type: 'h', text: 'A wash and a comb' },
        {
          type: 'p',
          text: 'The fan is drawn in two layers, both added together with the canvas’s `lighter` compositing, the way light adds. The **wash** is 170 wavelengths evenly spaced from 396 to 704 nm, each a very faint hairline. Where they overlap, close to the prism, they add up toward white; on the screen they form a continuous band whose brightness follows how many nanometres land on each millimetre. That is why the red end, where flint glass disperses least, is compressed and bright and the violet end is spread out and dim. The wash colors were balanced once, at start-up, so that all of them added together come out neutral rather than pink or green.',
        },
        {
          type: 'p',
          text: 'The **comb** is 40 brighter hairlines that make the fan read as a drawing. They are not evenly spaced in wavelength: they are chosen so that at minimum deviation they leave the prism at evenly spaced angles, which keeps the hairlines distinct all the way across. Each one is found by inverting the minimum-deviation formula:',
        },
        {
          type: 'code',
          code: `// invert δmin(λ) by bisection for an evenly spaced deviation
const target = lerp(d700, d400, (i - NW) / (NRULE - 1))
let lo = 400
let hi = 700
for (let it = 0; it < 30; it++) {
  const mid = (lo + hi) / 2
  if (dMin(nGlass(mid)) > target) lo = mid
  else hi = mid
}
nm = (lo + hi) / 2`,
          caption: 'Thirty halvings pin each comb wavelength to better than a millionth of a nanometre.',
        },
        { type: 'h', text: 'The experimentum crucis, solved by the tracer' },
        {
          type: 'p',
          text: 'In chapter IV the screen gains a hole just beyond where violet lands at minimum deviation, and the first prism turns, as Newton’s did, so that each color in turn passes through. How far to turn it for a given color is not simple to write down, because turning the prism about its middle also slides the face the light leaves from. So the piece asks the tracer: at start-up it searches, by bisection, for the turn that brings each wavelength from 400 to 700 nm in 10 nm steps to the hole, and the chapter then sweeps the wavelength evenly in time and looks up the turn. The second prism sits beyond the hole at minimum deviation for that ray, so the color that passes is bent once more and lands on the wall, unchanged; small ticks on the wall remember where each color landed.',
        },
        { type: 'h', text: 'Recombination and the widened beam' },
        {
          type: 'p',
          text: 'A single ray per wavelength cannot recombine into white: after an inverted prism the colors leave parallel to one another but slightly displaced, a thin ribbon of rainbow. Real beams have width, and where the displaced colored strips overlap, the light is white. So in chapter V the hole in the shutter widens and each wash wavelength is traced as six parallel sub-rays, staggered so that together they fill the beam evenly (about 1,060 rays a frame in all). The inverted prism slides in along the face of the first, the colors that fanned out in the gap fold back, and the beam that leaves is white in the middle with a thin red edge on one side and a violet edge on the other, as Newton would have seen. A last screen catches it.',
        },
        { type: 'h', text: 'Cost' },
        {
          type: 'p',
          text: 'Tracing 210 rays through three prisms is a few thousand line intersections, a fraction of a millisecond. Drawing is one stroke per wavelength. The enlarged strip in the corner is rendered once into a one-pixel-tall image and redrawn as hairline rows. The only real expense is chapter V, at about 1,060 rays a frame, still comfortably inside a frame’s budget on a laptop.',
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
            '**The shutter (left):** a hairline bar with a small hole, the source of the beam. In chapter V the hole opens wider. Drag it to move the source.',
            '**The prism:** N-SF11 flint, apex angle 60°, faintly hatched. The dotted arc above it is the handle for turning it. A faint white line from the first face is the light it reflects there, about 15 percent at this angle by the Fresnel equations.',
            '**The fan:** a faint wash of 170 wavelengths and a comb of 40 brighter hairlines. Near the prism the colors still overlap and the light is nearly white.',
            '**The screen:** a hatched board where the fan lands, with a strip of colored light on its face, ticks every 50 nm behind it, and dark hairlines at the Fraunhofer lines.',
            '**The screen, enlarged (top right):** the image on the screen as a printer’s color bar, with Fraunhofer’s letters above (h, G, F, E, D, C) and an even wavelength scale below whose ticks are unevenly spaced. The note *the prism crowds the red* is the point: a prism spectrum is not linear in wavelength.',
            '**Chapter III:** the dashed line continues the incoming beam undeviated; colored arcs measure the deviation of 656 nm (Fraunhofer C) and 434 nm, with their values. The inset plots deviation against incidence for three colors, with the minimum marked and a dot for the present state.',
            '**Chapter IV:** the hole in the screen and the color passing it, the second prism, the wall and its ticks, and a marker on the enlarged strip showing which part of the spectrum is getting through.',
            '**Chapter V:** the widened beam, the inverted prism, and the white light landing on the last screen.',
            '**Top right:** readouts for the chapter: the indices at 400 and 700 nm and the spread; the incidence $i$, the deviation of 589 nm and its minimum; the color through the hole.',
            '**Bottom:** the 60-second ruler with the five chapter numerals and a playhead. Tap or drag it to move.',
          ],
        },
        {
          type: 'p',
          text: 'Things to watch for: the moment in chapter I when the white beam slows as it enters the glass; in chapter III, the fan barely moving while the prism turns through the minimum and then swinging away; and in chapter IV, the color through the hole changing while the light beyond the second prism stays a single thin line.',
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
            '**The glass is modern.** N-SF11 is a dense flint chosen because its dispersion is large enough to see across a screen. Newton’s prisms were of the glass of his day, and their exact composition is not known.',
            '**The beam has no width until chapter V.** Each wavelength is a single mathematical ray, so the spectrum on the screen is sharper than a real one, which is blurred by the size of the hole and of the Sun. In chapter V the beam widens because recombination needs it to.',
            '**One hole, not two.** Newton used two boards with holes, which fixed the direction of the light reaching the second prism. The piece uses one hole, so that direction drifts slightly as the first prism turns, and the colors land on the wall closer together than his would have.',
            '**The light is not sunlight.** The wash is an even mix of wavelengths balanced to look white; it is not the solar spectrum, and the Fraunhofer lines on the screen and the strip mark positions rather than absorbing any light.',
            '**Colors are as close as sRGB allows.** Spectral colors lie outside the screen’s gamut and are clipped, their brightness is a stylized curve, and the canvas adds colors in gamma-encoded values rather than in linear light, so the sums are approximate.',
            '**Only one reflection is drawn.** Light reflects partly at every face; the piece shows only the first, and ignores absorption in the glass and the dimming of rays at steep incidence.',
            '**The speed of light.** The light front in chapter I travels about one prism width per second, roughly $3 \\times 10^{-9}$ of its real speed. Its slowing in glass is to scale.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'A Letter of Mr. Isaac Newton … containing his New Theory about Light and Colors', by: 'Isaac Newton', year: '1672', note: '*Philosophical Transactions of the Royal Society* 6. The experimentum crucis, in his words.' },
    { title: 'Opticks: or, a Treatise of the Reflexions, Refractions, Inflexions and Colours of Light', by: 'Isaac Newton', year: '1704', note: 'Book I covers the prism experiments, recombination and the seven colors; freely available in reprints.' },
    { title: 'The Optical Papers of Isaac Newton, Volume 1: The Optical Lectures, 1670–1672', by: 'Alan E. Shapiro (ed.)', year: '1984', note: 'Cambridge University Press. The scholarly edition, with the history of the experiments.' },
    { title: 'Bestimmung des Brechungs- und Farbenzerstreuungs-Vermögens verschiedener Glasarten', by: 'Joseph von Fraunhofer', year: '1817', note: 'Refraction and dispersion of glasses measured against the dark lines of the solar spectrum.' },
    { title: 'Optics', by: 'Eugene Hecht', note: 'Pearson. The standard textbook treatment of refraction, dispersion, prisms and the rainbow.' },
    { title: 'Optical Glass Data Sheets: N-SF11', by: 'Schott AG', note: 'The Sellmeier coefficients used here.' },
    { title: 'The C.I.E. colorimetric standards and their use', by: 'T. Smith and J. Guild', year: '1931', note: '*Transactions of the Optical Society* 33. The 1931 standard observer.' },
    { title: 'Measuring Colour', by: 'R. W. G. Hunt and M. R. Pointer', note: 'Wiley. A careful account of colorimetry, gamuts and why spectral colors cannot be displayed.' },
  ],
}

export default guide
