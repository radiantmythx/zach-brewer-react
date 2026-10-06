import type { Guide } from '../guide'

const conesFigure = `<svg viewBox="0 0 420 200" fill="none" stroke-width="1.2" stroke-linecap="round">
  <line x1="40" y1="160" x2="390" y2="160" stroke="currentColor" opacity="0.5"/>
  <line x1="40" y1="30" x2="40" y2="160" stroke="currentColor" opacity="0.5"/>
  <path d="M40 158 C70 150 90 40 112 32 C130 30 140 70 160 120 C175 150 200 158 240 159" stroke="#2B6A93"/>
  <path d="M60 158 C120 150 160 100 200 40 C215 26 228 28 240 50 C262 100 290 152 330 158" stroke="#3F7A55"/>
  <path d="M60 158 C140 150 180 110 215 50 C232 26 250 26 266 46 C292 90 320 150 380 158" stroke="#B5523A"/>
  <text x="104" y="24" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">S 445</text>
  <text x="180" y="24" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">M 545</text>
  <text x="252" y="24" font-family="Geist Mono, monospace" font-size="9" fill="#B5523A" stroke="none">L 570</text>
  <line x1="290" y1="30" x2="290" y2="160" stroke="currentColor" stroke-dasharray="2 3" opacity="0.7"/>
  <circle cx="290" cy="112" r="3" fill="#B5523A" stroke="none"/>
  <circle cx="290" cy="146" r="3" fill="#3F7A55" stroke="none"/>
  <text x="296" y="108" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">λ → (L, M, S)</text>
  <text x="40" y="180" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">400</text>
  <text x="200" y="180" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">550</text>
  <text x="350" y="180" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">700 nm</text>
</svg>`

const brettelFigure = `<svg viewBox="0 0 420 210" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="60" y1="180" x2="380" y2="180" opacity="0.4"/>
  <line x1="60" y1="180" x2="60" y2="20" opacity="0.4"/>
  <text x="384" y="184" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">M</text>
  <text x="54" y="16" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">S</text>
  <line x1="60" y1="180" x2="250" y2="70" stroke="#3F7A55"/>
  <text x="254" y="66" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">WHITE</text>
  <path d="M60 180 L250 70 L170 30 Z" fill="#2B6A93" fill-opacity="0.08" stroke="#2B6A93" stroke-dasharray="3 3"/>
  <path d="M60 180 L250 70 L360 150 Z" fill="#B5523A" fill-opacity="0.08" stroke="#B5523A" stroke-dasharray="3 3"/>
  <text x="140" y="26" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">475 nm WING</text>
  <text x="300" y="168" font-family="Geist Mono, monospace" font-size="9" fill="#B5523A" stroke="none">575 nm WING</text>
  <circle cx="230" cy="122" r="4"/>
  <path d="M230 122 L230 104" stroke-dasharray="2 2"/>
  <circle cx="230" cy="102" r="3" fill="currentColor"/>
  <text x="238" y="126" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">A COLOR</text>
  <text x="238" y="100" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.8">ITS PROJECTION</text>
  <text x="70" y="200" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">PROTANOPE: L IS MOVED UNTIL THE COLOR LIES ON A WING</text>
</svg>`

const guide: Guide = {
  lede: 'Three kinds of cone turn every spectrum into three numbers. That is why different light can look identical, and why one man in twelve sees the same garden differently.',
  facts: [
    ['Cone fundamentals', 'Stockman & Sharpe (2000), 2°, energy units; the CIE (2006) LMS functions'],
    ['Peaks in this table', 'L 570 nm, M 545 nm, S 445 nm'],
    ['Rendering', 'LMS → XYZ by the CIE (2015) 2° transform, then sRGB'],
    ['Metamer', '580 nm ≡ 0.59 × 545 nm + 1.07 × 630 nm, the same L and M'],
    ['Simulation', 'Brettel, Viénot & Mollon (1997), built from the same cone curves'],
    ['Red–green deficiency', 'About 8% of men and 0.5% of women of Northern European ancestry'],
    ['Genes', 'L and M opsins on the X chromosome; S opsin on chromosome 7'],
    ['Running time', '84 s in three chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['Space', 'Enter'], action: 'In the garden, switch to the next vision' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag the probe along the spectrum to read the three cone responses at any wavelength' },
      { gesture: 'drag', action: 'In chapter II, drag the probe to choose the light to be matched; the mixture of 545 and 630 nm re-solves live' },
      { gesture: 'tap', action: 'In the garden, tap to switch vision: typical, deuteranopia, protanopia, tritanopia, and back' },
      { gesture: 'drag', action: 'In the garden, drag sideways to compare typical vision (left) with the simulation (right)' },
      { gesture: 'tap', action: 'Tap a numeral on the ruler to jump to that chapter' },
    ],
    tip: 'In chapter II, drag the probe past 630 nm or below 545 nm: no positive mix of the two lights can match it, which is why a display can only show colors inside the triangle of its primaries.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Vision',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'Light arrives as a spectrum, a different amount of power at every wavelength from violet to deep red, but the eye does not record a spectrum. In daylight it records three numbers. The retina holds three kinds of cone, called L, M and S for the long, middle and short wavelengths they respond to best, and each one reports a single quantity: how strongly the light, all wavelengths together, excites its pigment. Every color you have ever seen is a point in the space of those three numbers.',
        },
        {
          type: 'p',
          text: 'A single cone cannot tell what wavelength excited it. A dim light at its favorite wavelength and a bright one off to the side can produce exactly the same response. This is the *principle of univariance*, named by the physiologist William Rushton: a photoreceptor’s output varies along only one dimension. Color comes from comparison, from the ratios between the three cone types, which is why it takes at least two kinds of cone to see any color at all, and three to see the colors we do.',
        },
        { type: 'h', text: 'Young, Helmholtz and Maxwell' },
        {
          type: 'p',
          text: 'In 1802 the physician Thomas Young proposed that the eye contains just three kinds of sensitive "particle," because it seemed impossible that every point of the retina could hold a receptor for every wavelength. Hermann von Helmholtz developed the idea in the 1850s and 1860s, and it became the Young–Helmholtz theory of trichromacy. James Clerk Maxwell made it quantitative: with spinning tops and a "color box" he showed that any color can be matched by mixing three fixed primary lights in the right proportions, and measured those proportions across the spectrum. In 1861 he and the photographer Thomas Sutton showed the first color photograph, a tartan ribbon taken three times through red, green and blue filters and projected together, as a demonstration of the same idea. The three kinds of cone were confirmed directly a century later, when their pigments were measured in single cones in the 1960s, and their genes were identified by Jeremy Nathans and colleagues in 1986.',
        },
        {
          type: 'p',
          text: 'Three is a small number. The retina has about six million cones and roughly twenty times as many rods, which work only in dim light and do not contribute to color. The S cones are only some 5 to 10 percent of all cones, and the proportion of L to M cones varies remarkably between people with entirely normal color vision; in one study of the cone mosaic it ranged across more than a tenfold span. Each of us builds the same world from a different mosaic, and the brain calibrates the result so well that we agree on what we see.',
        },
        {
          type: 'aside',
          title: 'Daltonism',
          text: 'In 1794 the chemist John Dalton described his own color vision to the Manchester Literary and Philosophical Society: the pink of a geranium looked to him sky blue by daylight and red by candlelight. He guessed that the fluid in his eyes was tinted blue, and asked that his eyes be examined after his death. They were, and the fluid was clear. His preserved eye survived, and in 1995 David Hunt, John Mollon and colleagues extracted DNA from it and found that he lacked the M-cone gene: Dalton was a deuteranope.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Colorimetry',
      title: 'Three numbers',
      blocks: [
        {
          type: 'p',
          text: 'Each cone type has a spectral sensitivity: a curve giving how strongly light of each wavelength excites it. Measured at the cornea, so that the absorption of the lens and the macular pigment are included, these curves are called *cone fundamentals*. The piece uses those of Andrew Stockman and Lindsay Sharpe (2000) for a 2° field, adopted by the CIE in 2006 as the physiological basis of colorimetry, tabulated at 5 nm and normalized so each peaks at 1. In these energy units the L curve peaks at about 570 nm, M at 545 nm and S at 445 nm. (Per photon rather than per unit of energy the peaks are a few nanometers shorter.)',
        },
        { type: 'figure', svg: conesFigure, alt: 'Three overlapping sensitivity curves, S peaking near 445 nanometers, M near 545 and L near 570, with a probe line reading two of them.', caption: 'The three cone fundamentals. A probe at one wavelength reads three numbers.' },
        {
          type: 'p',
          text: 'The response of each cone type to a light with spectral power distribution $P(\\lambda)$ is the light weighted by the cone’s sensitivity and summed over wavelength:',
        },
        { type: 'math', tex: 'L = \\int P(\\lambda)\\, \\bar{l}(\\lambda)\\, d\\lambda, \\qquad M = \\int P(\\lambda)\\, \\bar{m}(\\lambda)\\, d\\lambda, \\qquad S = \\int P(\\lambda)\\, \\bar{s}(\\lambda)\\, d\\lambda', label: '(1)', caption: '$\\bar{l}, \\bar{m}, \\bar{s}$ are the cone fundamentals; for a single wavelength $\\lambda_0$ the integrals reduce to the three curves’ heights at $\\lambda_0$.' },
        { type: 'h', text: 'Metamers' },
        {
          type: 'p',
          text: 'Equation (1) throws information away. An infinite variety of spectra produce the same three numbers, and any two of them look exactly alike. Such pairs are called *metamers*. Chapter II builds one. Light A is pure 580 nm, a spectral yellow. Light B is a mixture of 545 nm, a green, and 630 nm, a red-orange, in amounts $a$ and $b$ chosen so that L and M match:',
        },
        { type: 'math', tex: 'a\\,\\bar{l}(545) + b\\,\\bar{l}(630) = \\bar{l}(580), \\qquad a\\,\\bar{m}(545) + b\\,\\bar{m}(630) = \\bar{m}(580)', label: '(2)', caption: 'Two equations, two unknowns. With the Stockman–Sharpe values, $a = 0.589$ and $b = 1.069$, in units of light A’s power.' },
        {
          type: 'p',
          text: 'The S cones barely respond to any of these wavelengths: light A excites them to 0.0001 of their peak and light B to 0.0019, a difference far below what anyone could see. So the two lights produce the same L, M and S, and look the same, though one is a single wavelength and the other is two wavelengths with no yellow in them at all. Your screen depends on this. It has no yellow light; the yellow on it is a metamer, a mixture of its red and green. Drag the probe and the mixture re-solves for any wavelength between 545 and 630 nm. Outside that range one of the amounts would have to be negative, and no real light can be subtracted: a display can only show the colors that lie inside the triangle of its three primaries.',
        },
        {
          type: 'p',
          text: 'The same equations underlie standard colorimetry. The CIE color-matching functions are a fixed linear transformation of the cone fundamentals; the piece converts cone excitations to CIE XYZ with the transformation published by the CIE in 2015 for this observer, and from XYZ to sRGB for the screen.',
        },
        { type: 'math', tex: 'X = 1.94735\\,L - 1.41445\\,M + 0.36476\\,S, \\qquad Y = 0.68990\\,L + 0.34832\\,M, \\qquad Z = 1.93485\\,S', label: '(3)', caption: 'The CIE (2015) 2° transformation from cone excitations to XYZ; $L$, $M$ and $S$ are the normalized Stockman–Sharpe excitations.' },
        { type: 'h', text: 'When a cone is missing' },
        {
          type: 'p',
          text: 'The genes for the L and M opsins sit next to each other on the X chromosome, and they are so similar, about 98% identical, that they recombine unevenly during the formation of egg cells. A man inherits one X, so if his copy carries a hybrid or missing gene, he has no normal second copy to fall back on. The result is the commonest inherited difference in color vision. If one cone type is missing entirely, the person is a *dichromat*: a protanope (no working L cones) or a deuteranope (no working M cones). If a hybrid gene makes a pigment whose sensitivity is shifted toward the other, the person is an *anomalous trichromat*, with milder confusions: protanomaly or deuteranomaly. The S-cone gene is on chromosome 7, so the rare blue–yellow deficiencies, tritanopia and tritanomaly, are not sex-linked.',
        },
        {
          type: 'table',
          head: ['Type', 'Cones', 'Men (European ancestry)', 'Women'],
          rows: [
            ['Protanopia', 'S, M', '≈ 1%', '≈ 0.02%'],
            ['Protanomaly', 'S, M, shifted L', '≈ 1%', '≈ 0.03%'],
            ['Deuteranopia', 'S, L', '≈ 1%', '≈ 0.01%'],
            ['Deuteranomaly', 'S, L, shifted M', '≈ 5%', '≈ 0.4%'],
            ['All red–green types', '', '≈ 8%', '≈ 0.5%'],
            ['Tritanopia', 'L, M', 'rare (estimates near 1 in 10,000 or fewer)', 'same'],
          ],
          caption: 'Approximate prevalences, rounded; studies differ by population and method. Red–green deficiency is less common in many other populations, around 4–6% of men in East Asian studies and lower in some others.',
        },
        {
          type: 'p',
          text: 'The figure "one in twelve men" in the piece is the round number for men of Northern European ancestry, and it counts all red–green types, most of them anomalous trichromats with mild differences rather than the full dichromacy the garden simulates. About 15% of women carry one affected X, and some carriers have four kinds of cone, although true four-dimensional color vision in a carrier has been demonstrated only in rare cases.',
        },
        {
          type: 'p',
          text: 'Metamers are also how deficiencies are diagnosed. In 1881 Lord Rayleigh found that some people matching a spectral yellow with a red and green mixture needed noticeably more red, or more green, than everyone else. The *anomaloscope*, introduced by Willibald Nagel in 1907, turns this Rayleigh match into a test: with these fundamentals, 589 nm is matched by about 0.48 parts of 545 nm and 9.9 parts of 670 nm (the red line must be very strong, because L cones respond weakly that far out). An anomalous trichromat sets a different ratio; a dichromat can match any ratio by changing brightness alone.',
        },
        { type: 'h', text: 'Simulating dichromacy' },
        {
          type: 'p',
          text: 'A dichromat’s colors form a two-dimensional space: every color that differs only along the missing cone’s axis looks the same to them. To show a trichromat what is lost, a simulation replaces each color with the single color, among all those the dichromat confuses with it, that the dichromat and the trichromat would describe alike. Hans Brettel, Françoise Viénot and John Mollon (1997) took these from people who are dichromatic in one eye only: such observers see white the same in both eyes, and also two wavelengths, about 475 and 575 nm (a blue and a yellow) for the red–green dichromacies, and about 485 and 660 nm for tritanopia. The dichromat’s colors are therefore taken to lie on two half-planes in LMS space, each through the white point and one of these anchor wavelengths. Each color is moved along the missing cone’s axis until it lands on the half-plane on its own side of white.',
        },
        { type: 'figure', svg: brettelFigure, alt: 'Two half-planes in cone space meeting along the white axis, with a color projected onto one of them.', caption: 'Brettel’s method for a protanope: two half-planes through white, one toward 475 nm and one toward 575 nm. A color keeps its M and S and gets the L that puts it on its wing.' },
        {
          type: 'p',
          text: 'For a protanope, with white $\\mathbf{E}$ and anchor $\\mathbf{A}$ in LMS, the half-plane has normal $\\mathbf{n} = \\mathbf{E} \\times \\mathbf{A}$, and a color $(L, M, S)$ is replaced by $(L\', M, S)$ with',
        },
        { type: 'math', tex: "L' = -\\frac{n_M M + n_S S}{n_L}, \\qquad \\text{using } \\mathbf{A}_{475} \\text{ if } \\frac{S}{M} > \\frac{E_S}{E_M}, \\text{ else } \\mathbf{A}_{575}", label: '(4)', caption: 'The same with M replaced for a deuteranope (testing $S/L$), and S for a tritanope (testing $M/L$, with anchors 485 and 660 nm). White and grays are unchanged, because $\\mathbf{n} \\cdot \\mathbf{E} = 0$.' },
      ],
    },
    {
      id: 'piece',
      kicker: 'Implementation',
      title: 'How the piece works',
      blocks: [
        {
          type: 'p',
          text: 'Three Cones is one TypeScript module. Its foundation is a table of 79 rows, the Stockman–Sharpe 2° fundamentals from 390 to 780 nm at 5 nm, as published by the Colour & Vision Research Laboratory, rounded to four significant figures and interpolated linearly. Every curve, bar, swatch and simulation in the piece is computed from that table, so the chapters agree with one another: the yellow in chapter II and the garden in chapter III are rendered through the same cone space as the curves in chapter I.',
        },
        {
          type: 'p',
          text: 'The film is a pure function of an 84-second clock. Chapter I draws the axes, the spectrum strip and the three curves in turn (S, M, L), then sweeps the probe from 400 to 700 nm. Chapter II parks the probe on 580 nm, raises light A as a spectral line, then light B as two dashed lines, and fills in the two cone readouts; halfway through, the yellow drifts between about 555 and 605 nm and the mixture re-solves every frame. Chapter III shows the garden as a typical trichromat sees it, then crossfades through deuteranopia, protanopia and tritanopia and back. Dragging the probe or the comparison divider, or pinning a vision, holds the clock.',
        },
        { type: 'h', text: 'Solving a metamer' },
        {
          type: 'code',
          code: `/** Two lights, at p1 and p2 nm, mixed to give the same L and M as one at λ (S is near zero for all three). */
function metamer(nm: number, p1 = 545, p2 = 630) {
  const T = cones(nm)
  const A = cones(p1)
  const B = cones(p2)
  const det = A[0] * B[1] - B[0] * A[1]
  const a = (T[0] * B[1] - B[0] * T[1]) / det
  const b = (A[0] * T[1] - T[0] * A[1]) / det
  const q: V3 = [a * A[0] + b * B[0], a * A[1] + b * B[1], a * A[2] + b * B[2]]
  return { a, b, q, ok: a >= 0 && b >= 0 }
}`,
          caption: 'Equation (2) by Cramer’s rule. When `a` or `b` would be negative, the readout says no positive mix matches.',
        },
        {
          type: 'p',
          text: 'Colors are made from cone excitations, not from wavelengths: LMS becomes XYZ by equation (3), XYZ becomes linear sRGB, negative channels are clipped (spectral colors lie outside every screen’s gamut), and the result is scaled to full brightness. Light B’s swatch is rendered from its own cone excitations, so the two discs match because their numbers match, not because the code paints them alike.',
        },
        { type: 'h', text: 'Brettel in nine numbers' },
        {
          type: 'p',
          text: 'The simulation is computed from the same table at load time. For each deficiency, the projection onto each half-plane is a linear map in LMS, and so is the conversion to and from linear sRGB, so the whole thing collapses to two 3×3 matrices that act directly on linear RGB, plus one dot product that chooses between them:',
        },
        {
          type: 'code',
          code: `const proj = (A: V3): M3 => {
  const n = cross(E, A)
  const p: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  p[k] = [0, 0, 0]
  p[k][i] = -n[i] / n[k]
  p[k][j] = -n[j] / n[k]
  return p
}
// which half-plane: the color's j/i cone ratio against white's
const c: V3 = [0, 0, 0]
c[j] = E[i]
c[i] = -E[j]
const w: V3 = [0, 1, 2].map((m) => c[0] * RGB2LMS[0][m] + c[1] * RGB2LMS[1][m] + c[2] * RGB2LMS[2][m]) as V3
return {
  t1: flat(mm(LMS2RGB, mm(proj(A1), RGB2LMS))),
  t2: flat(mm(LMS2RGB, mm(proj(A2), RGB2LMS))),
  w,
  s1: Math.sign(A1[j] * E[i] - A1[i] * E[j]),
}`,
          caption: 'Inside `brettel(k, a1, a2)`, where `k` is the missing cone and `i`, `j` the other two. `E` is sRGB white in LMS.',
        },
        {
          type: 'p',
          text: 'The garden is painted once, into an off-screen canvas the size of its frame: a sky wash, two rows of trees, a striped lawn, a rose bush, a robin, a branch of red berries and a border of cornflowers, buttercups and poppies, chosen because each pair of them is confused by one of the deficiencies. Each simulation is then a pass over its pixels, using lookup tables for the sRGB curve in both directions; the vision on screen is built at once and the others on the following frames. Showing a vision is then just drawing an image, and switching is a crossfade.',
        },
        {
          type: 'code',
          code: `for (let p = 0; p < d.length; p += 4) {
  const r = DEC[d[p]]
  const gg = DEC[d[p + 1]]
  const b = DEC[d[p + 2]]
  const T = (sw[0] * r + sw[1] * gg + sw[2] * b) * s1 >= 0 ? t1 : t2
  o[p] = enc(T[0] * r + T[1] * gg + T[2] * b)
  o[p + 1] = enc(T[3] * r + T[4] * gg + T[5] * b)
  o[p + 2] = enc(T[6] * r + T[7] * gg + T[8] * b)
  o[p + 3] = d[p + 3]
}`,
          caption: 'One pixel: decode, choose the half-plane, apply nine multiply-adds, encode.',
        },
      ],
    },
    {
      id: 'design',
      kicker: 'Design',
      title: 'Why it matters for design',
      blocks: [
        {
          type: 'p',
          text: 'Look again at the garden as a protanope sees it. The berries do not vanish, but they stop standing out: red against green becomes dark olive against olive. Anything that relies on that contrast alone, a red error state beside a green success state, a red line and a green line on a chart, a "stop" and a "go" that differ only in hue, carries no message for millions of people. The safer channels are the ones every kind of color vision shares: lightness, which comes mostly from the L and M cones together; blue against yellow, which survives both red–green deficiencies; and anything that is not color at all, such as position, shape, pattern, line style and words.',
        },
        {
          type: 'list',
          items: [
            '**Never use color as the only signal.** The Web Content Accessibility Guidelines say this directly (success criterion 1.4.1, *Use of Color*). Pair it with a label, an icon or a pattern.',
            '**Separate by lightness.** Two colors that differ clearly in lightness stay distinct under every simulation in this piece. Pairs that differ only in hue at similar lightness are the ones to avoid.',
            '**Label directly.** A chart whose lines are named at their ends needs no legend to decode, and no one has to match colors.',
            '**Test.** Simulations like the one here, or the Viénot and Machado variants built into many design tools, are quick ways to check a palette before it ships.',
          ],
        },
        {
          type: 'p',
          text: 'This site tries to follow its own advice: the Playground’s readouts, keys and charts are labelled in words, so that no number or state depends on telling two hues apart. The point is not to remove color, which carries feeling and meaning for those who see it, but never to let it carry the message alone.',
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
            '**The plot:** relative sensitivity (0 to 1) against wavelength from 390 to 720 nm. S in blue, M in green, L in red, each labelled at its peak. Under it, the spectrum as a strip of color.',
            '**The probe:** a hairline at the wavelength, a dot where it crosses each curve, a round handle on the spectrum strip, and the wavelength in a small box.',
            '**The probe readout:** the wavelength in serif, a disc of the color that light makes, its color name, and three bars: the L, M and S responses.',
            '**Chapter II:** light A as a solid spectral line; light B as two dashed lines, heights to scale; the two discs and their bars side by side, joined by an equals sign when they match.',
            '**The garden panel:** the vision’s name, the missing cone, prevalence, and the three curves with the missing one dashed.',
            '**The divider (after you drag):** typical vision to the left, the simulation to the right.',
            '**Bottom ruler:** the 84-second timeline and its three chapters.',
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
            '**The screen is not the spectrum.** Spectral colors lie outside sRGB, so the strip, the probe’s disc and light A are clipped approximations; they are brighter and less saturated than real monochromatic light. Light A and light B are shown as identical because they are computed as identical; your screen then shows both with its own three primaries, which is itself a metamer.',
            '**Two observers meet in the conversion.** The cone fundamentals and their XYZ transform belong to the CIE 2006 observer, while sRGB is defined on the older CIE 1931 observer. The mismatch is small for the colors in the garden and is accepted by most simulations.',
            '**The S-cone match is not exact.** Light B excites S cones to 0.0019 of their peak, light A to 0.0001; both are effectively zero.',
            '**Dichromacy is the extreme case.** Most people with red–green deficiency are anomalous trichromats whose differences are milder. The crossfades in the garden pass through intermediate mixtures, which only loosely resemble anomalous trichromacy.',
            '**A simulation is not an experience.** It shows a trichromat which colors a dichromat confuses. It cannot show what a dichromat’s colors are like to them, and Brettel’s anchors are averages from a few unilateral dichromats. It also assumes a calibrated sRGB screen.',
            '**Prevalences are rounded** and depend on population and method; the table gives typical figures for people of European ancestry.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'The spectral sensitivities of the middle- and long-wavelength-sensitive cones derived from measurements in observers of known genotype', by: 'Andrew Stockman & Lindsay T. Sharpe', year: '2000', note: '*Vision Research* 40. The cone fundamentals used here.' },
    { title: 'Colour & Vision Research Laboratory database', by: 'Andrew Stockman and colleagues', note: 'cvrl.org: the tabulated cone fundamentals and the CIE 2006 and 2015 functions.' },
    { title: 'Fundamental chromaticity diagram with physiological axes, Part 1 (CIE 170-1:2006)', by: 'Commission Internationale de l’Éclairage', year: '2006', note: 'The CIE’s adoption of the Stockman–Sharpe fundamentals; Part 2 (2015) gives the XYZ transform.' },
    { title: 'Computerized simulation of color appearance for dichromats', by: 'Hans Brettel, Françoise Viénot & John D. Mollon', year: '1997', note: '*Journal of the Optical Society of America A* 14. The method behind the garden.' },
    { title: 'A physiologically-based model for simulation of color vision deficiency', by: 'Gustavo M. Machado, Manuel M. Oliveira & Leandro A. F. Fernandes', year: '2009', note: '*IEEE Transactions on Visualization and Computer Graphics* 15. A widely used alternative that also covers anomalous trichromacy.' },
    { title: 'The chemistry of John Dalton’s color blindness', by: 'David M. Hunt, Kanwaljit S. Dulai, James K. Bowmaker & John D. Mollon', year: '1995', note: '*Science* 267. DNA from Dalton’s eye.' },
    { title: 'The genetics of normal and defective color vision', by: 'Jay Neitz & Maureen Neitz', year: '2011', note: '*Vision Research* 51. The opsin genes, their recombination and their consequences.' },
    { title: 'Organization of the human trichromatic cone mosaic', by: 'Heidi Hofer, Joseph Carroll, Jay Neitz, Maureen Neitz & David R. Williams', year: '2005', note: '*Journal of Neuroscience* 25. How much the L to M ratio varies between people.' },
    { title: 'Foundations of Vision', by: 'Brian A. Wandell', year: '1995', note: 'Sinauer. A clear account of color matching, metamers and cone space.' },
  ],
}

export default guide
