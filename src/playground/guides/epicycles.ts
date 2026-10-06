import type { Guide } from '../guide'

const chain = `<svg viewBox="0 0 330 170" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g opacity="0.35"><circle cx="90" cy="85" r="60"/><circle cx="132" cy="42" r="26"/><circle cx="154" cy="56" r="12"/></g>
<path d="M90 85 L132 42 L154 56 L162 65" stroke-width="1.2"/>
<g fill="currentColor" stroke="none"><circle cx="90" cy="85" r="2"/><circle cx="132" cy="42" r="1.6"/><circle cx="154" cy="56" r="1.6"/></g>
<circle cx="162" cy="65" r="3.5" stroke="#7FB6D9"/>
<path d="M162 65 C 190 95, 210 120, 250 118 S 300 80, 290 50" stroke="#7FB6D9" stroke-dasharray="2 3"/>
<path d="M150 85 A60 60 0 0 0 132 42" stroke-dasharray="1 3" opacity="0.6"/>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1">
<text x="56" y="104">c₀</text><text x="96" y="58">|c₁|</text><text x="140" y="30">|c₂|</text><text x="170" y="52">|c₃|</text>
<text x="170" y="152" opacity="0.7">PEN = c₀ + c₁e^{ik₁t} + c₂e^{ik₂t} + …</text>
<text x="226" y="132" fill="#7FB6D9">TRACE</text></g>
</svg>`

const guide: Guide = {
  lede:
    'Any closed drawing can be redrawn by circles riding on circles, each turning at a whole-number speed. This piece computes the circles for four drawings and lets you watch the likeness sharpen as the number of terms doubles from one to 128.',
  facts: [
    ['Transform', 'Discrete Fourier transform, direct sum, M = 1,024 samples'],
    ['Frequencies', '$k = -160 \\ldots 160$, the 128 largest kept'],
    ['Passes', '1, 2, 4, 8, 16, 32, 64, 128 terms'],
    ['Ordering', 'By amplitude $|c_k|$, largest first'],
    ['Figures', 'ZB monogram, treble clef, grey heron, one-line profile'],
    ['Sampling', 'SVG path geometry and Catmull–Rom splines, by arc length'],
    ['Error at 128', 'About 0.15–0.3% of the drawing’s size'],
    ['Loop', 'About 86 s, 21.5 s per figure'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'From planets to pictures',
      blocks: [
        {
          type: 'p',
          text: 'Seen from the Earth, the planets misbehave. Mars drifts eastward against the stars night after night, then slows, stops, runs backward for a couple of months, stops again and carries on. Greek astronomers, committed to the idea that heavenly motion must be built from perfect circles, explained this **retrograde motion** with a beautiful device: the planet rides on a small circle, the **epicycle**, whose centre itself travels around the Earth on a larger circle, the **deferent**. When the planet’s motion on its epicycle opposes the epicycle’s motion along the deferent, it appears to go backward.',
        },
        {
          type: 'p',
          text: 'The idea is usually credited to Apollonius of Perga, around 200 BCE, and was developed by Hipparchus; it reached its fullest form in Claudius Ptolemy’s *Almagest* in the second century CE, which predicted planetary positions well enough to be used for fourteen hundred years. Ptolemy needed more than plain circles — off-centre deferents and a point called the *equant* — but the epicycle was the heart of it. Even Copernicus, whose *De revolutionibus* (1543) put the Sun at the centre, still used epicycles to get the details right. Only Kepler’s ellipses (1609) made them unnecessary.',
        },
        {
          type: 'p',
          text: 'Epicycles are often remembered as a cautionary tale, a theory patched with circle upon circle until it collapsed. But there is a deep truth inside them. With enough circles, turning at the right speeds, you can trace *any* closed path — not just planetary loops but a square, a signature or a heron. That fact had to wait for a different kind of mathematics to be understood.',
        },
        {
          type: 'h',
          text: 'Fourier’s idea',
        },
        {
          type: 'p',
          text: 'In 1807 Joseph Fourier, studying how heat spreads through a solid, made a startling claim: any function on an interval, however irregular, can be written as a sum of sines and cosines of whole-number frequencies. The claim met resistance — Lagrange objected that a function with a corner could not be a sum of smooth waves — and it took Fourier until 1822 to publish his *Théorie analytique de la chaleur*. Making the claim precise occupied mathematicians for a century and helped create modern analysis; the question of exactly which functions it holds for, and in what sense, led to Riemann’s and Lebesgue’s theories of integration.',
        },
        {
          type: 'p',
          text: 'The link to epicycles appears when you move from functions on a line to curves in the plane. Treat each point $(x, y)$ of a drawing as a complex number $z = x + iy$, and the drawing as a path $z(t)$ traced once as $t$ runs from 0 to 1. Fourier’s series then says that $z(t)$ is a sum of terms $c_k e^{2\\pi i k t}$ — and each such term is a point going round a circle of radius $|c_k|$ at $k$ turns per period. Adding the terms one after another, head to tail, is exactly a chain of epicycles: each circle’s centre rides on the rim of the one before. The sum of rotating circles is the Fourier series, and the Fourier series can draw anything.',
        },
        {
          type: 'p',
          text: 'Working it out by hand was out of the question for a detailed drawing; it was computers, and the fast Fourier transform published by James Cooley and John Tukey in 1965, that made Fourier analysis routine. Today it is everywhere: in the compression of JPEG photographs and MP3 audio, in MRI scanners, in the equalizer on a music player. Drawing pictures with epicycles became a popular demonstration on the web in the 2010s, helped along by Grant Sanderson’s 2019 *3Blue1Brown* video on Fourier series.',
        },
        {
          type: 'figure',
          svg: chain,
          caption: 'A chain of three epicycles. The first circle is centred on the drawing’s mean point $c_0$; each later circle rides on the rim of the one before. The pen at the end of the chain traces the curve.',
          alt: 'Three circles of decreasing size joined arm to arm, with a pen at the end of the last arm drawing a dotted curve.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'Coefficients, circles and error',
      blocks: [
        {
          type: 'p',
          text: 'Let $z(t)$, $0 \\leq t < 1$, be a closed path in the complex plane. Its Fourier coefficients are',
        },
        {
          type: 'math',
          tex: 'c_k = \\int_0^1 z(t)\\, e^{-2\\pi i k t}\\, dt, \\quad k = \\ldots, -2, -1, 0, 1, 2, \\ldots',
          label: '(1)',
        },
        {
          type: 'p',
          text: 'and, for any reasonable path, the path is recovered by adding the terms back up:',
        },
        {
          type: 'math',
          tex: 'z(t) = \\sum_{k} c_k\\, e^{2\\pi i k t} = c_0 + \\sum_{k \\neq 0} |c_k|\\, e^{i(2\\pi k t + \\arg c_k)}',
          label: '(2)',
          caption: 'Each term is a circle of radius $|c_k|$, starting at angle $\\arg c_k$ and turning $k$ times per period — counterclockwise for positive $k$, clockwise for negative. $c_0$ is the path’s average position, the fixed pivot of the chain.',
        },
        {
          type: 'p',
          text: 'A computer cannot integrate a hand-drawn path exactly, so the path is sampled at $M$ points $z_n = z(n / M)$, evenly spaced along its length, and the integral becomes the **discrete Fourier transform**:',
        },
        {
          type: 'math',
          tex: 'c_k \\approx \\frac{1}{M} \\sum_{n=0}^{M-1} z_n\\, e^{-2\\pi i k n / M}',
          label: '(3)',
          caption: 'With $M = 1024$ and $|k| \\leq 160$ the approximation is excellent: the terms the piece uses are far below the sampling limit of 512.',
        },
        {
          type: 'h',
          text: 'Which terms to keep',
        },
        {
          type: 'p',
          text: 'With infinitely many terms the series is exact. With $N$ terms it is an approximation, and the question is which $N$ to keep. The textbook choice is the lowest frequencies, $|k| \\leq N/2$. This piece instead keeps the $N$ terms with the **largest amplitudes**, and Parseval’s theorem shows why that is the best possible choice. The theorem says that the average squared distance of the path from its centre equals the sum of the squared amplitudes,',
        },
        {
          type: 'math',
          tex: '\\int_0^1 |z(t)|^2\\, dt = \\sum_k |c_k|^2',
          label: '(4)',
        },
        {
          type: 'p',
          text: 'and, applied to the difference between the path and its approximation $z_S$ built from a set $S$ of terms,',
        },
        {
          type: 'math',
          tex: 'E_S^2 = \\int_0^1 |z(t) - z_S(t)|^2\\, dt = \\sum_{k \\text{ not in } S} |c_k|^2',
          label: '(5)',
          caption: 'The mean squared error is exactly the energy of the terms you left out. To make it as small as possible with $N$ terms, leave out the smallest ones.',
        },
        {
          type: 'p',
          text: 'The ERROR readout is $E_S$ measured directly from the samples, as a percentage of the drawing’s full size. For the monogram it falls from about 29% with one term to 7.5% with eight, 0.44% with 64 and 0.3% with 128.',
        },
        {
          type: 'h',
          text: 'How fast the error falls',
        },
        {
          type: 'p',
          text: 'How quickly $|c_k|$ shrinks as $|k|$ grows depends on how smooth the drawing is. Integrating (1) by parts shows that each continuous derivative the path has buys another factor of $1/k$. A path with sharp corners — the hexagon of the monogram, the junctions of the Z — has a continuous position but a broken direction, and its coefficients fall roughly like $1/k^2$. The spline figures (clef, heron, profile) have a continuous direction everywhere and fall faster, like $1/k^3$. You can see it in the spectrum chart: the monogram’s spectrum keeps a long tail of small bars; the clef’s dies away quickly.',
        },
        {
          type: 'p',
          text: 'Corners are also where the approximation misbehaves. Near a jump or a sharp turn a truncated Fourier series overshoots and rings, and the overshoot does not shrink as terms are added — it only gets narrower. Henry Wilbraham noticed this in 1848 and J. Willard Gibbs described it in 1899; it is called the **Gibbs phenomenon**. It is why the 128-term monogram looks hand-drawn: its straight edges wobble slightly and its corners are rounded with a little lip.',
        },
        {
          type: 'aside',
          title: 'Why the pen moves at a constant speed',
          text: 'The samples $z_n$ are spaced evenly by arc length, not by the order in which the drawing was made. That makes $t$ proportional to distance along the path, so the pen draws at a steady pace and no part of the figure gets more terms than its length deserves. Sampled unevenly, a slowly drawn corner would soak up coefficients.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'From strokes to a spinning chain',
      blocks: [
        {
          type: 'h',
          text: 'Four drawings, one stroke each',
        },
        {
          type: 'p',
          text: 'A Fourier series draws a single closed loop, but a drawing is often several strokes: the monogram has seven (a hexagon, the three strokes of the Z, the stem and two bowls of the B). The piece joins them into one **tour**: each stroke is sampled into points, the strokes are visited in an order chosen by hand (the Z in one zig-zag, the B from the foot of its stem), and straight **pen-up connectors** join the end of one stroke to the start of the next and the last back to the first. Every point remembers whether it is pen or connector, and the connectors are drawn as faint dashes.',
        },
        {
          type: 'p',
          text: 'The monogram comes straight from the site’s logo: the same SVG path strings, measured with a detached `SVGPathElement` using `getTotalLength()` and `getPointAtLength()`, which handle the arcs of the B exactly. The clef, heron and profile are drawn as lists of control points through which a Catmull–Rom spline passes, with a point repeated where a sharp corner is wanted (the tip of the heron’s beak, its toes).',
        },
        {
          type: 'p',
          text: 'The tour is then measured by cumulative length, centred on its bounding box and scaled so that its longer half-extent is 1, and resampled at 1,024 evenly spaced points. With those in hand the transform is a direct double loop. There is no need for a fast Fourier transform: 321 frequencies times 1,024 samples is about 330,000 multiply-adds per figure, a few milliseconds, done once.',
        },
        {
          type: 'code',
          code: `// DFT for k in [-KMAX, KMAX]
for (let k = -KMAX; k <= KMAX; k++) {
  let re = 0
  let im = 0
  for (let n = 0; n < M; n++) {
    const a = (-TAU * k * n) / M
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const x = target[n * 2]
    const y = target[n * 2 + 1]
    re += x * ca - y * sa
    im += x * sa + y * ca
  }
  re /= M
  im /= M
  const amp = Math.hypot(re, im)
  spectrum[k + KMAX] = amp
  if (k === 0) c0 = [re, im]
  else terms.push({ k, re, im, amp, phase: Math.atan2(im, re) })
}
terms.sort((a, b) => b.amp - a.amp)
terms.length = STAGES[STAGES.length - 1]`,
          caption: 'Equation (3), written out with real arithmetic: $(x + iy)(\\cos a + i \\sin a)$. The terms are then sorted by amplitude and the largest 128 kept.',
        },
        {
          type: 'h',
          text: 'Precomputed passes',
        },
        {
          type: 'p',
          text: 'For each of the eight passes (1, 2, 4 … 128 terms) the approximate curve is computed once, at 768 points, and its error recorded. During a pass the piece only has to draw a prefix of a stored polyline and place the chain; nothing heavy happens per frame. The chain itself is recomputed every frame, since it moves: for the current parameter $s$ each term contributes one arm, from the previous joint to the next.',
        },
        {
          type: 'code',
          code: `for (let q = 0; q < n; q++) {
  const t = B.terms[q]
  const g = q < prevN ? 1 : grow
  const r = t.amp * g
  const rp = r * S
  ;(rp > 26 ? big : rp > 6 ? mid : small).push(x, y, rp)
  const a = t.phase + TAU * t.k * s
  x += r * Math.cos(a)
  y += r * Math.sin(a)
  joints.push(x, y)
}`,
          caption: 'Building the chain. New terms grow from zero radius while the number rolls over (`grow`), so the pen slides smoothly from the old curve’s start to the new one’s. Circles are bucketed by size so that each bucket is one path with one stroke.',
        },
        {
          type: 'h',
          text: 'The timeline',
        },
        {
          type: 'p',
          text: 'Each pass has two parts: 0.4 seconds in which the new circles grow in and the big number rolls up to the new count, and one full revolution of the chain, 1.3 seconds for one term rising to 2.4 seconds for 128, during which the pen draws the curve. While a pass draws, the previous pass stays on screen as a fading sage ghost, so you can compare the two. After 128 terms the chain fades away, the finished drawing holds for 3.2 seconds with its caption, then erases itself along its own path and the next figure begins.',
        },
        {
          type: 'h',
          text: 'By hand',
        },
        {
          type: 'p',
          text: 'In the viewer the count of terms is also yours. Dragging sideways anywhere on the canvas, or along the slider under the stepper, sets $\\log_2 N$ continuously, so you can stop at 23 terms or 77, not just the powers of two. Any count’s curve is computed on demand (at most 128 × 768 terms, a couple of milliseconds) and cached. While you hold it, the chain spins through the whole curve at a steady 2.4 seconds a turn; let go for six seconds and the series carries on from the next doubling. A tap moves straight on to the next figure.',
        },
        {
          type: 'code',
          code: `if (drag) {
  if (drag.slider) enterManual(xToU(p.x))
  else if (drag.moved || Math.abs(p.x - drag.x0) > (drag.touch ? 12 : 8)) {
    // a drag anywhere scrubs the series: one octave of terms per 70 px
    drag.moved = true
    enterManual(drag.u0 + (p.x - drag.x0) / 70)
    env.setCursor('grabbing')
  }
  return
}`,
          caption: 'A press only becomes a drag after it has moved a few pixels (more for a finger), so a tap is never mistaken for a scrub.',
        },
        {
          type: 'p',
          text: 'The clock is the piece’s own: it advances by each frame’s `dt` and equals the elapsed time until you take over, so a given moment always looks the same in the solo test route. When the curve is drawn the stroke is split into pen and connector runs, the pen in sky blue at 1.8 pixels and the connectors as dashes, which is how the hexagon and the letters of the monogram read as separate strokes even though the circles draw them as one.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'What the annotations say',
      blocks: [
        {
          type: 'table',
          head: ['Mark', 'Meaning'],
          rows: [
            ['Large number', 'How many terms — circles — the current pass uses.'],
            ['$z(t) = \\Sigma c_k e^{ikt}$', 'The series being drawn, set in the serif.'],
            ['01 / 04 — NAME', 'Which figure, and below it how it was made (SVG paths, or a spline).'],
            ['Stepper and slider', 'The eight passes on a logarithmic scale. The handle sits at the current count; a ring around it fills as the pass draws. Drag it to choose any count.'],
            ['Spectrum', '$|c_k|$ for $k = -96 \\ldots 96$, square-root scaled so small terms stay visible. Bars in use are lit in sky blue.'],
            ['ERROR', 'RMS distance between the approximation and the drawing, as a percentage of its size.'],
            ['SAMPLES', 'Points along the tour used for the transform.'],
            ['LARGEST R', 'Radius of the biggest circle, in units of the drawing’s half-size.'],
            ['PERIOD', 'Seconds per revolution of the chain in this pass.'],
            ['Dotted outline', 'The target drawing, for comparison.'],
            ['Sage curve', 'The previous pass, fading.'],
            ['Dashed segments', 'Pen-up connectors between strokes.'],
            ['Crosshair', 'The fixed pivot $c_0$, the drawing’s mean point.'],
          ],
          caption: 'On short screens the formula, the notes and the readouts are dropped; the number, the slider and the drawing stay.',
        },
        {
          type: 'p',
          text: 'Watch the first two passes of any figure. One term is a circle of the right overall size — the best one-circle summary of the drawing. Two terms make an ellipse or a looped oval, already leaning the right way. By eight the main masses are placed; by 32 the strokes are recognizable; 64 and 128 are about corners and fine detail. Each doubling buys less, which is equation (5) at work: the largest terms carry most of the energy.',
        },
        {
          type: 'p',
          text: 'There is a small chord on each new pass if you turn the sound on: one note of a pentatonic scale per doubling, rising with the count.',
        },
        {
          type: 'h',
          text: 'Reading the chain',
        },
        {
          type: 'p',
          text: 'The chain is ordered by size, so it reads from the pivot outward like a family tree of the drawing. The first arm is the drawing’s dominant motion, usually one slow turn per period: $k = +1$ or $k = -1$, depending on which way round the tour runs. The next few circles are still large and still slow; they set the figure’s proportions and lean. Farther out the circles shrink and speed up — a 128-term chain ends in specks turning sixty or more times per period — and they only nudge the pen, sharpening a corner here, straightening an edge there. That is why the end of the chain shimmers while its base swings calmly.',
        },
        {
          type: 'p',
          text: 'The spectrum is not symmetric, and that asymmetry is information. Positive and negative frequencies turn in opposite directions, so a curve that is mostly traced one way round has most of its energy on one side of $k = 0$. A pure circle would be a single bar. A long thin shape, such as the heron’s neck or the clef’s stem, needs a pair of nearly equal bars at $+k$ and $-k$, because an ellipse is two circles turning in opposite directions. The tall bars near the centre are the figure’s shape; the long low tail is its corners.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'Where the drawing is a drawing',
      blocks: [
        {
          type: 'list',
          items: [
            '**The connectors are part of the curve.** A Fourier series can only trace one continuous loop, so the pen-up moves between strokes are traced too, and the circles spend some of their effort on them. They are drawn faintly so the figure reads as separate strokes.',
            '**The tour order is chosen by hand.** A different order of strokes gives different connectors and a slightly different spectrum. The order here keeps the connectors short.',
            '**The figures are mine.** The clef, the heron and the profile are hand-placed control points, not traced from photographs or engraved music.',
            '**Speed is for the eye.** The chain turns once per pass, so the time it takes to draw a figure has no physical meaning, and the period grows with the count so that the many small circles of a 128-term chain stay legible.',
            '**Not astronomy.** Ptolemy’s epicycles were fitted to observations with off-centre circles and equants, not computed by a Fourier transform. The kinship is mathematical, not historical.',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['→', 'Space', 'Enter'], action: 'Next figure' },
      { keys: ['←'], action: 'Previous figure' },
      { keys: ['↑', '↓'], action: 'Double or halve the number of terms (by hand)' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag sideways, anywhere or along the slider, to set the number of terms from 1 to 128' },
      { gesture: 'tap', action: 'Tap to move on to the next figure' },
    ],
    tip: 'Drag slowly down from 128 and watch which details go first: corners, then the B’s bowls, then the Z.',
  },
  further: [
    { title: 'Théorie analytique de la chaleur', by: 'Joseph Fourier', year: '1822', note: 'The heat equation, and the claim that any function is a sum of sines.' },
    { title: 'An algorithm for the machine calculation of complex Fourier series', by: 'James W. Cooley and John W. Tukey', year: '1965', note: '*Mathematics of Computation* 19(90). The fast Fourier transform.' },
    { title: 'On a certain periodic function', by: 'Henry Wilbraham', year: '1848', note: '*Cambridge and Dublin Mathematical Journal* 3. The overshoot later named for Gibbs.' },
    { title: 'Fourier’s series', by: 'J. Willard Gibbs', year: '1899', note: 'Letter to *Nature* 59.' },
    { title: 'Ptolemy’s Almagest', by: 'Claudius Ptolemy, translated and annotated by G. J. Toomer', year: '1984', note: 'The standard English translation.' },
    { title: 'But what is a Fourier series? From heat flow to drawing with circles', by: 'Grant Sanderson (3Blue1Brown)', year: '2019', note: 'A video that made circle drawings famous.' },
    { title: 'Fourier Analysis', by: 'T. W. Körner', year: '1988', note: 'A humane, historical textbook; good on Gibbs and on convergence.' },
  ],
}

export default guide
