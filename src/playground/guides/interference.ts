import type { Guide } from '../guide'

const nodal = `<svg viewBox="0 0 320 190" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g opacity="0.3"><circle cx="120" cy="95" r="20"/><circle cx="120" cy="95" r="40"/><circle cx="120" cy="95" r="60"/><circle cx="120" cy="95" r="80"/><circle cx="200" cy="95" r="20"/><circle cx="200" cy="95" r="40"/><circle cx="200" cy="95" r="60"/><circle cx="200" cy="95" r="80"/></g>
<g stroke="#3F7A55" stroke-width="1.3"><path d="M160 10 L160 180"/><path d="M178 12 Q170 95 178 178"/><path d="M142 12 Q150 95 142 178"/><path d="M200 18 Q186 95 200 172"/><path d="M120 18 Q134 95 120 172"/></g>
<g fill="currentColor" stroke="none"><circle cx="120" cy="95" r="3"/><circle cx="200" cy="95" r="3"/></g>
<path d="M120 112 L200 112 M120 108 L120 116 M200 108 L200 116" opacity="0.7"/>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1">
<text x="98" y="88">S1</text><text x="208" y="88">S2</text><text x="152" y="126" opacity="0.8">d</text>
<text x="232" y="24" fill="#3F7A55">NODAL LINES</text><text x="232" y="38" opacity="0.7">r₁ − r₂ =</text><text x="232" y="50" opacity="0.7">(n + ½) λ</text></g>
</svg>`

const guide: Guide = {
  lede:
    'Two stones dropped in a still pond, drawn as a contour map. Where crests meet crests the lines crowd together; where crests meet troughs the water stays flat, and those quiet lanes are the nodal lines.',
  facts: [
    ['Sources', 'Two to four point sources'],
    ['Field', 'Sum of circular waves with $1/\\sqrt{r}$ fall-off, normalized'],
    ['Contours', 'Marching squares, six iso-levels (four when cramped)'],
    ['Grid', 'Cells of about λ / 9, capped near 80,000'],
    ['Nodal lines', 'Zero set of $\\cos(\\Delta\\theta / 2)$ for S1 and S2'],
    ['Singularities', 'Winding number of the phasor around each cell'],
    ['Script cost', 'About 6 ms per frame at 1920 × 1080'],
    ['Loop', '24 s'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Waves adding up, and cancelling out',
      blocks: [
        {
          type: 'p',
          text: 'Waves pass through one another. Two ripples crossing on a pond do not collide or bounce; each carries on as if the other were not there, and where they overlap the water simply does both things at once — the heights add. That is the **principle of superposition**, and almost everything interesting about waves follows from it. Where two crests arrive together the water rises twice as high (*constructive* interference); where a crest meets a trough they cancel and the water barely moves (*destructive* interference). With two steady sources, the places of cancellation do not wander: they lie along fixed curves, the **nodal lines**, which fan out from between the sources like the ribs of a shell.',
        },
        {
          type: 'p',
          text: 'Christiaan Huygens described light as a wave in 1678, imagining every point of a wavefront as the source of a new spherical wavelet. A century and a quarter later Thomas Young made the idea undeniable. Between 1801 and 1803 he showed that light passing through two closely spaced openings produces bands of light and dark on a screen — interference — and he explained it with a drawing of two sets of circular waves crossing, the dark bands lying where crests of one fell on troughs of the other. The drawing in his 1807 *Course of Lectures on Natural Philosophy* is, in effect, the image this piece animates.',
        },
        {
          type: 'p',
          text: 'The **ripple tank** brought the drawing to life in classrooms: a shallow glass-bottomed tray of water lit from above, so that every crest focuses light into a bright line on the table below. Dip two prongs of a vibrating bar into the water and the nodal lines appear as still, dark spokes in a shimmering pattern. Ripple tanks became a fixture of physics teaching, especially through the Physical Science Study Committee’s course in the late 1950s, because they show in a few seconds what takes pages of algebra to describe.',
        },
        {
          type: 'p',
          text: 'The same arithmetic runs much of modern technology. Noise-cancelling headphones add a sound in antiphase with the noise. Phased-array radars and 5G antennas steer a beam by adjusting the phase of many small emitters so their waves add up in one direction only. Radio telescopes thousands of kilometres apart are combined as interferometers, and in 2015 the LIGO detectors registered gravitational waves by watching two laser beams fall in and out of step by a fraction of a proton’s width.',
        },
        {
          type: 'h',
          text: 'Beats',
        },
        {
          type: 'p',
          text: 'If the two sources are slightly out of tune, the pattern can no longer stand still. Their phase difference creeps at a steady rate, and the nodal lines sweep sideways across the tank, all together, returning to where they started once every $1 / |f_1 - f_2|$ seconds. At a single point you would hear this as **beats**: a loudness that swells and fades at the difference frequency, the wobble musicians listen for when they tune two strings to each other.',
        },
        {
          type: 'h',
          text: 'Three sources, and the points where waves vanish',
        },
        {
          type: 'p',
          text: 'Add a third source and something subtle happens. With two equal waves, complete cancellation happens along whole lines. With three or more, the lines break up: perfect stillness survives only at isolated points, and around each one the phase of the wave turns through a full circle, like water spiralling round a plughole. John Nye and Michael Berry described these points in 1974 as **dislocations in wave trains**, borrowing the word from the defects in crystals they resemble; they are now called *phase singularities* or *wave vortices*. They appear wherever waves mix — in speckled laser light, in radio and sound fields, and in the ocean, where the tide rotates around *amphidromic points* of zero tidal range.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Phases, envelopes and hyperbolas',
      blocks: [
        {
          type: 'h',
          text: 'One source',
        },
        {
          type: 'p',
          text: 'A source at $\\vec{s}_i$ oscillating at frequency $f$ sends out circular waves of wavelength $\\lambda$. At distance $r_i = |\\vec{x} - \\vec{s}_i|$ the surface height is',
        },
        {
          type: 'math',
          tex: String.raw`h_i(\vec{x}, t) = a(r_i) \sin \theta_i, \qquad \theta_i = k r_i - \omega t + \phi_i, \qquad k = \frac{2\pi}{\lambda}, \;\; \omega = 2\pi f`,
          label: '(1)',
        },
        {
          type: 'p',
          text: 'The crests move outward at the phase speed $c = \\omega / k = \\lambda f$. On a two-dimensional surface the energy of a circular wave spreads around a circle of circumference $2\\pi r$, so its amplitude falls off like $1 / \\sqrt{r}$ far from the source; the piece uses $a(r) = 1 / \\sqrt{1 + r / \\lambda}$, which behaves that way at a distance and stays finite at the source.',
        },
        {
          type: 'h',
          text: 'Two sources',
        },
        {
          type: 'p',
          text: 'Superposition is just addition, $h = h_1 + h_2$. For two sources of equal amplitude $a$, the identity $\\sin A + \\sin B = 2 \\sin \\frac{A + B}{2} \\cos \\frac{A - B}{2}$ separates the wave into a fast part and a slow one:',
        },
        {
          type: 'math',
          tex: String.raw`h = 2a \cos \frac{\Delta\theta}{2} \, \sin \frac{\theta_1 + \theta_2}{2}, \qquad \Delta\theta = \theta_1 - \theta_2 = k (r_1 - r_2) + (\phi_1 - \phi_2)`,
          label: '(2)',
        },
        {
          type: 'p',
          text: 'The sine travels; the cosine is an envelope that does not depend on time at all when the frequencies match. Where $\\cos(\\Delta\\theta / 2) = 0$ the water is still at every instant. That happens when $\\Delta\\theta$ is an odd multiple of $\\pi$, that is when the path difference is an odd number of half wavelengths:',
        },
        {
          type: 'math',
          tex: String.raw`r_1 - r_2 = \left( n + \frac{1}{2} - \frac{\phi_1 - \phi_2}{2\pi} \right) \lambda, \qquad n = 0, \pm 1, \pm 2, \ldots`,
          label: '(3)',
        },
        {
          type: 'p',
          text: 'A curve on which the *difference* of distances to two fixed points is constant is a **hyperbola** with those points as foci. So the nodal lines are a family of hyperbolas around the two sources, straightening into rays far away. Because $|r_1 - r_2|$ can never exceed the separation $d$ of the sources, there are about $2d / \\lambda$ of them: every extra half wavelength of separation adds one.',
        },
        {
          type: 'figure',
          svg: nodal,
          alt: 'Two sources S1 and S2 a distance d apart, with faint circular wavefronts and a family of hyperbolic nodal lines between and around them.',
          caption: 'Nodal lines are hyperbolas with the sources as foci: curves of constant path difference.',
        },
        {
          type: 'h',
          text: 'Beats',
        },
        {
          type: 'p',
          text: 'With frequencies $f_1 \\neq f_2$ the phase difference picks up a term that grows with time, $\\Delta\\theta = k_1 r_1 - k_2 r_2 - 2\\pi (f_1 - f_2) t + \\Delta\\phi$. The zero set of $\\cos(\\Delta\\theta / 2)$ still marks where the waves are momentarily in antiphase, but it now slides: every nodal line advances by one position in $1 / |f_1 - f_2|$ seconds.',
        },
        {
          type: 'h',
          text: 'Phasors, and the points where they vanish',
        },
        {
          type: 'p',
          text: 'It helps to write each wave as the imaginary part of a rotating complex number, a **phasor**. Summing them gives one complex amplitude per point:',
        },
        {
          type: 'math',
          tex: String.raw`A(\vec{x}) = \sum_i a(r_i) \, e^{i \theta_i}, \qquad h = \operatorname{Im} A, \qquad |A| = \text{local amplitude}`,
          label: '(4)',
        },
        {
          type: 'p',
          text: 'Total stillness needs $A = 0$: both its real and imaginary parts must vanish, which is two conditions in a two-dimensional plane. Generically two conditions in two dimensions meet only at points — those are the phase singularities. (Two waves of exactly equal strength are the special, non-generic case that produces whole lines.) Walk once around a singularity and the phase $\\arg A$ turns through $\\pm 2\\pi$; the sign is its **topological charge**. Because the phase is continuous everywhere else, that winding number cannot change unless a singularity crosses the loop, which is what makes them easy to find on a grid.',
        },
        {
          type: 'h',
          text: 'Contours by marching squares',
        },
        {
          type: 'p',
          text: 'To draw the curve where a sampled field equals a level $L$, **marching squares** looks at one grid cell at a time. Each of the four corners is either above $L$ or not, giving sixteen cases. Each case says which edges the contour crosses, and the crossing point on an edge between values $v_0$ and $v_1$ is found by linear interpolation, $t = (L - v_0) / (v_1 - v_0)$. Two of the cases, with diagonal corners above, are ambiguous saddles; the average of the four corners decides which way the contour turns. It is the two-dimensional cousin of the *marching cubes* algorithm Lorensen and Cline published in 1987 for medical imaging.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'An analytic field on a grid',
      blocks: [
        {
          type: 'p',
          text: 'Nothing is simulated step by step: at every frame the height of the water at every grid vertex is computed directly from equation (1), from the sources’ current positions and phases. That makes the field exact (no numerical dispersion, no instability) and deterministic — any frame can be reproduced from its time alone.',
        },
        {
          type: 'h',
          text: 'The field',
        },
        {
          type: 'p',
          text: 'The grid’s cells are about a ninth of a wavelength wide — fine enough that linear interpolation draws smooth circles, coarse enough to stay near 50,000 vertices on a large screen. Each vertex sums the live sources, each gated by a smooth switch-on front that expands from the source when it starts; the result is normalized by the total amplitude, so constructive regions use the full range of contour levels everywhere, not just near the sources:',
        },
        {
          type: 'code',
          code: `for (let q = 0; q < L; q++) {
  const s = live[q]
  const dx = x - s.x
  const dy = y - s.y
  const r = Math.sqrt(dx * dx + dy * dy)
  const a = s.env / Math.sqrt(1 + r / lam)
  den += a
  // the wave exists only inside its front
  const u = (s.front - r) / fr
  if (u <= 0) continue
  const g = u >= 1 ? 1 : u * u * (3 - 2 * u)
  const th = s.k * r - s.ph
  const sn = fsin(th)
  num += g * a * sn
  if (wantPhasor) {
    re += g * a * fcos(th)
    im += g * a * sn
  }
}
F[o] = (num / den) * calm`,
          caption: 'Lightly trimmed. `fsin` and `fcos` read a 4,096-entry sine table; `calm` fades the whole tank at the end of the loop.',
        },
        {
          type: 'p',
          text: 'The field is then contoured at six levels — ±0.15, ±0.45 and ±0.76 of full height — with crests in ink and troughs in ocean blue. One `Path2D` per level collects every segment, so the whole moiré is six stroke calls. Where two waves reinforce, all six levels are crossed every half wavelength and the lines crowd into dense bands; where they cancel, the field barely leaves zero, no level is crossed, and the paper shows through as a quiet lane.',
        },
        {
          type: 'h',
          text: 'Nodal lines and singularities',
        },
        {
          type: 'p',
          text: 'The nodal lines are contoured from a second grid holding $\\cos(\\Delta\\theta / 2)$ for S1 and S2, whose zero set is exactly equation (3). Outside the region both waves have reached, the value is set to *not a number*, and the contour routine skips any cell with such a corner, so no false lines appear along the fronts. When a third source is playing, the nodal lines fade and the piece looks for phase singularities instead, by counting how the phasor of equation (4) winds around each cell. Rather than compute angles, it tracks which quadrant the phasor is in at each corner and adds up the quarter-turns:',
        },
        {
          type: 'code',
          code: `let wind = 0
let q0 = quad(RE[o], IM[o])
const first = q0
for (let e = 0; e < 4; e++) {
  const a = e === 0 ? o : e === 1 ? o + 1 : e === 2 ? o + stride + 1 : o + stride
  const b = e === 0 ? o + 1 : e === 1 ? o + stride + 1 : e === 2 ? o + stride : o
  const q1 = e === 3 ? first : quad(RE[b], IM[b])
  let d = (q1 - q0 + 4) % 4
  if (d === 3) d = -1
  else if (d === 2) d = RE[a] * IM[b] - IM[a] * RE[b] >= 0 ? 2 : -2
  wind += d
  q0 = q1
}
if (wind === 4 || wind === -4) { /* a singularity of charge ±1 in this cell */ }`,
          caption: 'Four quarter-turns one way is a full winding. A half-turn jump between corners is resolved by the sign of the cross product.',
        },
        {
          type: 'h',
          text: 'Drawing fast',
        },
        {
          type: 'p',
          text: 'Contours at full size come to tens of thousands of tiny segments a frame, and the way they are stroked matters more than the arithmetic. Two choices keep the piece near 60 frames per second at 1920 × 1080. First, every contour line is a *hairline*: no wider than one device pixel, which browsers rasterize on a fast path. An early version drew the nodal lines 1.7 px wide and ran at well under half the speed; they are now two hairlines offset by half a pixel, which looks the same. Second, every colour is *opaque*, pre-mixed with the paper. Translucent hairlines are drawn segment by segment, so wherever two segments meet — at every cell boundary — the pixel is painted twice and comes out darker, printing the grid faintly across the whole drawing.',
        },
        {
          type: 'h',
          text: 'The choreography',
        },
        {
          type: 'p',
          text: 'The sources glide on slow Lissajous paths, so the pattern breathes even when nothing else happens. A switch-on front runs out from each new source at six times the speed of its crests — the front is an envelope, and envelopes can outrun the crests inside them — so a new source fills the tank in a few seconds. The beat is made by easing S2’s frequency up by 7% and back over three seconds; its phase is the exact integral of that frequency, so the waves never jump.',
        },
        {
          type: 'p',
          text: 'Each source wears a handle: a cleared disc with a dashed ring that turns solid, with grip marks and the word *drag*, when the pointer is over it. Dragging moves the source (a drag that starts in open water picks up the nearest one); when you let go, a scripted source eases back to its path. A tap on open water adds a source, up to four; once the tank is full, a tap replaces the oldest one you added. Until the viewer touches the tank, a ghost demonstrates both gestures once, early in the first loop.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'What every mark means',
      blocks: [
        {
          type: 'table',
          head: ['Time', 'Title', 'What happens'],
          rows: [
            ['0.3 s', '*One source*', 'S1 switches on; rings spread across still paper.'],
            ['2 s', '*Two sources*', 'S2 joins; as its front passes, the moss nodal lines draw on and the lattice of reinforcement appears between the sources.'],
            ['8.5–11.5 s', '*A beat*', 'S2 detunes from 0.90 to about 0.96 Hz and back; the nodal lines sweep sideways, then settle.'],
            ['12.5 s', '*Three sources*', 'S3 joins; the nodal lines dissolve into a lattice of teal singularities, filled for charge +1 and open for −1.'],
            ['18.5 s', '*Nodal lines*', 'S3 falls silent and the two-source pattern, with its hyperbolas, returns.'],
            ['20.5 s', '*Still water*', 'The tank calms: the outer contour levels drop out first, then the inner ones.'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Contours** — ink for crests (positive heights), ocean blue for troughs, three levels each.',
            '**Nodal lines** — moss: where S1 and S2 arrive half a cycle apart and cancel.',
            '**Singularities** — teal dots: isolated points of total cancellation when three or more waves mix.',
            '**Source labels** — the name, a small dial whose hand turns once per cycle (its angle is the source’s phase), and the frequency and phase as numbers.',
            '**λ** — a dimension line measuring one wavelength, two to three wavelengths out from S1.',
            '**The lab sheet** — how many sources are playing; the wavelength in nominal millimetres (the tank’s short side is taken as 200 mm); the frequencies; the S1–S2 separation in millimetres and in wavelengths, which tells you roughly how many nodal lines to expect; their phase difference Δφ; the nodal condition or the singularity count; and the grid size.',
          ],
        },
        {
          type: 'h',
          text: 'Cells, lanes and moiré',
        },
        {
          type: 'p',
          text: 'Between two sources the contours close up into a lattice of small ovals. Each oval is an *antinode*: a patch of water that rises and falls with the full, doubled amplitude, its contours crowding together and then opening out twice a cycle. The ovals sit in rows along the hyperbolas of maximum reinforcement, and between the rows run the empty lanes of the nodal lines. Beyond the sources the same pattern stretches into long rays. Where the contour spacing of one region beats against another — two sets of nearly parallel lines at slightly different spacings — the eye sees broad, slowly shifting bands that are not in the field at all. That is moiré, a pattern made by the drawing rather than the water, and it is part of why a contour map of interference shimmers so strongly.',
        },
        {
          type: 'aside',
          title: 'Try this',
          text: 'Drag S2 slowly toward S1 and count the nodal lines as they disappear: one goes for every half wavelength of separation you remove, exactly as equation (3) predicts.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'A tank without walls',
      blocks: [
        {
          type: 'list',
          items: [
            '**No wave equation is solved.** The field is the textbook superposition of ideal circular waves. A real tank has walls that reflect, a depth that makes water waves dispersive (their speed depends on wavelength), damping, and sources with a size and shape; none of that is modelled.',
            '**Sources move without consequence.** When a source moves, its whole wave pattern moves with it instantly, as if it had always been there; a real moving source would leave older crests where they were emitted, and its frequency would shift ahead of and behind it (the Doppler effect).',
            '**Frequency changes are instant everywhere.** During the beat, S2’s wavelength changes across the whole tank at once rather than travelling out from the source.',
            '**The front is faster than physics.** Switch-on fronts run at six times the crest speed so the choreography fits in a loop.',
            '**The field is normalized.** Dividing by the total amplitude makes far-field interference as vivid as near-field; in real water the far field would be fainter.',
            '**Nodal lines are drawn for S1 and S2 only.** With three or more sources the true cancellations are points, and those are shown instead. The singularity search can miss a pair of opposite charges that sit inside one grid cell.',
            '**Millimetres are nominal.** The scale assumes a 200 mm tank, whatever your screen.',
          ],
        },
      ],
    },
  ],
  interact: {
    gestures: [
      { gesture: 'drag', action: 'Move a source by its handle (a drag in open water picks up the nearest one).' },
      { gesture: 'tap', action: 'Add a source on open water, up to four; a fifth replaces the oldest you added.' },
    ],
    tip: 'Drag S2 slowly toward S1: one nodal line disappears for every half wavelength of separation you remove.',
  },
  further: [
    { title: 'Treatise on Light', by: 'Christiaan Huygens', year: '1690', note: 'Wavelets and wavefronts.' },
    { title: 'A Course of Lectures on Natural Philosophy and the Mechanical Arts', by: 'Thomas Young', year: '1807', note: 'Including the famous two-source interference figure.' },
    { title: 'The Feynman Lectures on Physics, Volume I', by: 'Richard P. Feynman, Robert B. Leighton, Matthew Sands', year: '1963', note: 'Chapters 29 (interference) and 48 (beats).' },
    { title: 'Dislocations in Wave Trains', by: 'J. F. Nye, M. V. Berry', year: '1974', note: '*Proceedings of the Royal Society A*; phase singularities.' },
    { title: 'Marching Cubes: A High Resolution 3D Surface Construction Algorithm', by: 'William E. Lorensen, Harvey E. Cline', year: '1987' },
    { title: 'Physics', by: 'Physical Science Study Committee', year: '1960', note: 'The course that put ripple tanks in classrooms.' },
  ],
}

export default guide
