import type { Guide } from '../guide'

const lengthsFigure = `<svg viewBox="0 0 420 210" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="30" y1="30" x2="390" y2="30"/>
  <g opacity="0.85">
    <line x1="60" y1="30" x2="60" y2="170"/><circle cx="60" cy="176" r="6"/>
    <line x1="120" y1="30" x2="120" y2="156"/><circle cx="120" cy="162" r="6"/>
    <line x1="180" y1="30" x2="180" y2="144"/><circle cx="180" cy="150" r="6"/>
    <line x1="240" y1="30" x2="240" y2="133"/><circle cx="240" cy="139" r="6"/>
    <line x1="300" y1="30" x2="300" y2="124"/><circle cx="300" cy="130" r="6"/>
    <line x1="360" y1="30" x2="360" y2="115"/><circle cx="360" cy="121" r="6"/>
  </g>
  <path d="M60 176 C 150 150, 260 128, 360 121" stroke="#2B6A93" stroke-dasharray="3 4"/>
  <g font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">
    <text x="48" y="22">N</text><text x="54" y="200">60</text><text x="114" y="200">63</text><text x="174" y="200">66</text>
    <text x="234" y="200">69</text><text x="294" y="200">72</text><text x="354" y="200">74</text>
    <text x="250" y="70" fill="#2B6A93">Lₖ = g (Γ / 2πNₖ)²</text>
    <text x="250" y="86" opacity="0.6">Γ = 60 s</text>
  </g>
</svg>`

const groupsFigure = `<svg viewBox="0 0 420 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <g font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">
    <text x="10" y="24">t = 0</text><text x="10" y="74">t = Γ/2</text><text x="10" y="124">t = Γ/3</text>
  </g>
  <g fill="currentColor" stroke="none">
    <circle cx="110" cy="20" r="3"/><circle cx="140" cy="20" r="3"/><circle cx="170" cy="20" r="3"/><circle cx="200" cy="20" r="3"/><circle cx="230" cy="20" r="3"/><circle cx="260" cy="20" r="3"/><circle cx="290" cy="20" r="3"/><circle cx="320" cy="20" r="3"/><circle cx="350" cy="20" r="3"/><circle cx="380" cy="20" r="3"/>
  </g>
  <line x1="110" y1="20" x2="380" y2="20" stroke="#3F7A55"/>
  <polyline points="110,60 170,60 230,60 290,60 350,60" stroke="#2B6A93"/>
  <polyline points="140,84 200,84 260,84 320,84 380,84" stroke="#1F8A86"/>
  <g fill="currentColor" stroke="none">
    <circle cx="110" cy="60" r="3"/><circle cx="140" cy="84" r="3"/><circle cx="170" cy="60" r="3"/><circle cx="200" cy="84" r="3"/><circle cx="230" cy="60" r="3"/><circle cx="260" cy="84" r="3"/><circle cx="290" cy="60" r="3"/><circle cx="320" cy="84" r="3"/><circle cx="350" cy="60" r="3"/><circle cx="380" cy="84" r="3"/>
  </g>
  <polyline points="110,108 200,108 290,108 380,108" stroke="#2B6A93"/>
  <polyline points="140,132 230,132 320,132" stroke="#1F8A86"/>
  <polyline points="170,128 260,128 350,128" stroke="#3F7A55"/>
  <g fill="currentColor" stroke="none">
    <circle cx="110" cy="108" r="3"/><circle cx="140" cy="132" r="3"/><circle cx="170" cy="128" r="3"/><circle cx="200" cy="108" r="3"/><circle cx="230" cy="132" r="3"/><circle cx="260" cy="128" r="3"/><circle cx="290" cy="108" r="3"/><circle cx="320" cy="132" r="3"/><circle cx="350" cy="128" r="3"/><circle cx="380" cy="108" r="3"/>
  </g>
</svg>`

const guide: Guide = {
  lede: 'Fifteen pendulums, each a little shorter than the last, released together. Each keeps its own time, so the row writhes into waves, splits into groups, dissolves into apparent disorder, and then, exactly once a minute, every one of them agrees again.',
  facts: [
    ['Phenomenon', 'A pendulum wave: phases drifting at a constant rate'],
    ['Pendulums', '15, completing 60, 61 … 74 swings in Γ = 60 s'],
    ['Period', '$T = 2\\pi\\sqrt{L/g}$, small-angle, with $g = 9.81$ m/s²'],
    ['Lengths', '248.5 mm (exactly a 1 s period) down to 163.4 mm'],
    ['Amplitude', '12°, released from rest'],
    ['Motion', 'Exact solution of the linearised pendulum; no integrator'],
    ['Plan view', 'The row strobed once a second, 61 lines per cycle'],
    ['Cycles offered', 'Γ = 30, 45, 60, 90 or 120 s'],
    ['Sound', 'One note per swing, D major pentatonic over three octaves'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Shorter or longer cycle Γ (the strings re-tune)' },
      { keys: ['Space'], action: 'Gather all fifteen and release them together' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag a bob aside and let go: it rejoins with its own phase' },
      { gesture: 'tap', action: 'Tap anywhere else to release all fifteen together' },
      { gesture: 'move', action: 'Hover a bob to read its swings, period and length' },
    ],
    tip: 'Turn the sound on and wait for the last ten seconds of the cycle: the scattered notes pull together, and at Γ all fifteen sound at once.',
  },
  pad: {
    left: [{ label: '‹ Γ', code: 'ArrowLeft', aria: 'Shorter cycle' }],
    right: [
      { label: 'Γ ›', code: 'ArrowRight', aria: 'Longer cycle' },
      { label: 'Release', code: 'Space', aria: 'Release all together', wide: true },
    ],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Fifteen clocks that drift on purpose',
      blocks: [
        {
          type: 'p',
          text: 'A pendulum is a clock with one moving part. Pull a weight aside on a string, let it go, and it swings back and forth at a rate fixed almost entirely by the length of the string. Make the string shorter and it swings faster. A pendulum wave is what happens when you hang a row of pendulums from one beam, choose their lengths with care, and release them together.',
        },
        {
          type: 'p',
          text: 'At first they move as one, a straight line of bobs swinging in unison. Within a few seconds the shorter ones have pulled ahead, and the line bends into a gentle curve that travels along the row like a snake. The curve tightens into a wave, then several waves; the snake seems to reverse; the row splits into two interleaved groups swinging in opposition, then three, then four. In between these moments the motion looks like no pattern at all. And then, at a moment you can predict to the fraction of a second, the disorder resolves: the row straightens, and all fifteen swing together again, exactly as they were released.',
        },
        {
          type: 'p',
          text: 'Nothing couples the pendulums. No pendulum knows about any other, and nothing in the frame transmits a wave. Every one of the patterns is a coincidence of timing, the same coincidence that makes two clocks that run at slightly different rates agree once a day. The pendulum wave is fifteen such clocks, tuned so that their coincidences fall into a schedule the eye can read.',
        },
        { type: 'h', text: 'Galileo and isochronism' },
        {
          type: 'p',
          text: 'The property that makes all of this possible is *isochronism*: a pendulum takes very nearly the same time for each swing, whether the swing is wide or narrow. According to his first biographer, Vincenzo Viviani, the young Galileo noticed this in the cathedral at Pisa, timing a swinging lamp against his pulse; historians treat the details of that story with caution, but Galileo certainly studied pendulums for decades. He described their isochronism in a letter to Guidobaldo del Monte in 1602, and in his *Two New Sciences* (1638) he stated the rule that matters here: the lengths of pendulums are to one another as the squares of their periods. Halve the period and you must quarter the length.',
        },
        {
          type: 'p',
          text: 'Galileo overstated one thing. He believed the pendulum was isochronous for any swing, however wide. It is not: a wide swing takes slightly longer than a narrow one, as the mathematics below shows, and the difference is what later clockmakers had to fight.',
        },
        { type: 'h', text: 'Huygens and the pendulum clock' },
        {
          type: 'p',
          text: 'Christiaan Huygens turned the observation into a machine. In 1656 he built the first pendulum clock, using a pendulum to regulate the going of a clock train; the Hague clockmaker Salomon Coster made clocks to his design under a privilege granted in 1657. Before the pendulum, the best mechanical clocks might drift by many minutes a day. Pendulum clocks cut that to something like a minute a day at first, and within a few decades to seconds.',
        },
        {
          type: 'p',
          text: 'In *Horologium Oscillatorium* (1673) Huygens gave the theory. He proved that the period of a pendulum making small swings is proportional to the square root of its length, in the form we now write as $T = 2\\pi\\sqrt{L/g}$. He showed that a bob running on a cycloid, rather than a circle, would be exactly isochronous for any amplitude, and fitted curved cheeks beside the suspension to approximate it. He even proposed a universal unit of length based on the pendulum that beats seconds. The longest pendulum in this piece is a cousin of that idea: its length, 248.5 mm, is the one that gives a period of exactly one second.',
        },
        {
          type: 'aside',
          title: 'A clock that weighs the Earth',
          text: 'Because the period depends on $g$, a pendulum clock is also a gravity meter. In 1672 the astronomer Jean Richer, observing at Cayenne near the equator, found that his pendulum had to be shortened to keep time, evidence that gravity is weaker there. Newton used such measurements to argue that the Earth bulges at the equator.',
        },
        { type: 'h', text: 'The demonstration' },
        {
          type: 'p',
          text: 'The pendulum wave is a classic of the lecture theatre. A version built for Harvard’s Natural Sciences Lecture Demonstrations uses fifteen pendulums that complete 51 to 65 swings in sixty seconds, and in 2001 James Flaten and Kevin Parendo, writing in the *American Journal of Physics*, explained the patterns as a lesson in *aliasing*: what you see is a smooth wave sampled at fifteen points, and the strange reversals are the same effect that makes a wagon wheel turn backwards in a film. This piece follows the same plan with its own numbers: the longest pendulum has a period of exactly one second, so in a minute the fifteen complete 60, 61, … 74 full swings.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'Lengths, phases and fractions',
      blocks: [
        { type: 'h', text: 'One pendulum' },
        {
          type: 'p',
          text: 'A bob on a light string of length $L$, displaced by an angle $\\theta$ from the vertical, feels a restoring force $mg\\sin\\theta$ along its arc. Newton’s second law along the arc gives the pendulum equation:',
        },
        { type: 'math', tex: '\\ddot{\\theta} + \\frac{g}{L}\\sin\\theta = 0', label: '(1)' },
        {
          type: 'p',
          text: 'Here $g$ is the acceleration due to gravity and the dots are time derivatives. For small angles, $\\sin\\theta \\approx \\theta$ (in radians), and the equation becomes the simple harmonic oscillator, whose solution for a bob released from rest at $\\theta_0$ is',
        },
        { type: 'math', tex: '\\theta(t) = \\theta_0 \\cos(\\omega t), \\qquad \\omega = \\sqrt{\\frac{g}{L}}, \\qquad T = \\frac{2\\pi}{\\omega} = 2\\pi\\sqrt{\\frac{L}{g}}', label: '(2)' },
        {
          type: 'p',
          text: 'The period $T$ does not depend on $\\theta_0$ at all. That is isochronism, and it is exact only for the linearised equation. The true period, from equation (1), grows slowly with amplitude:',
        },
        { type: 'math', tex: 'T = 2\\pi\\sqrt{\\frac{L}{g}}\\left(1 + \\frac{\\theta_0^2}{16} + \\frac{11\\,\\theta_0^4}{3072} + \\ldots\\right)', label: '(3)' },
        {
          type: 'p',
          text: 'At this piece’s amplitude of 12° ($\\theta_0 = 0.209$ rad) the correction is $0.27\\%$, so a real pendulum takes 1.0027 s where the small-angle formula says 1 s. At 24° it is 1.1%, and at 90° it is 18%. The correction is called *circular error*, and it is the reason precision clocks swing through only a degree or two.',
        },
        { type: 'h', text: 'Fifteen pendulums' },
        {
          type: 'p',
          text: 'Choose a cycle time $\\Gamma$ and ask pendulum $k$ (counting from $k = 0$) to complete exactly $N_k = N_0 + k$ swings in it. Its period must be $T_k = \\Gamma / N_k$, and equation (2) turns a period into a length:',
        },
        { type: 'math', tex: 'L_k = g\\left(\\frac{\\Gamma}{2\\pi N_k}\\right)^2', label: '(4)' },
        {
          type: 'p',
          text: 'With $\\Gamma = 60$ s and $N_0 = 60$, the first pendulum has $T_0 = 1$ s and $L_0 = g/4\\pi^2 = 248.5$ mm; the last, with 74 swings, has $T_{14} = 0.8108$ s and $L_{14} = 163.4$ mm. The lengths do not fall in equal steps: since $L \\propto 1/N^2$ they fall steeply at first and then more gently, which is the soft curve the bobs make at rest.',
        },
        { type: 'figure', svg: lengthsFigure, alt: 'Six of the pendulums hanging from a beam, their lengths falling along a smooth curve as the number of swings per minute rises from 60 to 74.', caption: 'Lengths follow $1/N^2$: one more swing a minute costs less length each time.' },
        {
          type: 'table',
          head: ['Γ', 'Swings', 'Longest', 'Shortest'],
          rows: [
            ['30 s', '30 … 44', '248.5 mm', '115.5 mm'],
            ['45 s', '45 … 59', '248.5 mm', '144.6 mm'],
            ['60 s', '60 … 74', '248.5 mm', '163.4 mm'],
            ['90 s', '90 … 104', '248.5 mm', '186.1 mm'],
            ['120 s', '120 … 134', '248.5 mm', '199.3 mm'],
          ],
          caption: 'The cycles offered by ← and →. The longest pendulum always has a period of one second; a longer cycle needs smaller differences in length.',
        },
        { type: 'h', text: 'Why the patterns appear' },
        {
          type: 'p',
          text: 'Released together at $t = 0$, pendulum $k$ has phase $\\varphi_k(t) = 2\\pi N_k t / \\Gamma$. Neighbours differ by',
        },
        { type: 'math', tex: '\\Delta\\varphi(t) = \\varphi_{k+1} - \\varphi_k = \\frac{2\\pi t}{\\Gamma}', label: '(5)' },
        {
          type: 'p',
          text: 'the same for every pair. So at any instant the row is a wave sampled at fifteen points, with a phase step of $\\Delta\\varphi$ from each bob to the next. Early on the step is small and the wave is long: the snake. As $\\Delta\\varphi$ grows the wave shortens. When it passes $\\pi$, a step of more than half a turn per bob, the samples can no longer follow the wave, and the eye reads a longer wave travelling the other way: aliasing. At $t = \\Gamma$, $\\Delta\\varphi = 2\\pi$ and every bob is a whole number of swings from its neighbour, which is to say in step.',
        },
        {
          type: 'p',
          text: 'The groups come from simple fractions. At $t = p\\Gamma/q$, with $p/q$ in lowest terms, $\\Delta\\varphi = 2\\pi p/q$, so bob $k$ and bob $k + q$ differ by exactly $p$ whole turns. The row repeats every $q$ bobs, and the fifteen fall into $q$ groups that move in lockstep:',
        },
        { type: 'math', tex: '\\varphi_{k+q}\\!\\left(\\frac{p\\Gamma}{q}\\right) - \\varphi_k\\!\\left(\\frac{p\\Gamma}{q}\\right) = 2\\pi p \\;\\equiv\\; 0', label: '(6)' },
        { type: 'figure', svg: groupsFigure, alt: 'Ten bobs drawn at three moments: all in a line at t equals zero, alternating between two rows at half the cycle, and in three rows at a third of the cycle.', caption: 'At $\\Gamma/2$ the bobs alternate between two groups; at $\\Gamma/3$ they fall into three.' },
        {
          type: 'p',
          text: 'Half the cycle gives two groups in opposition; a third, or two thirds, gives three; a quarter gives four. A fraction with a large denominator also makes groups, but with so many of them and so few members each that the eye sees no order, which is why the moments between the simple fractions look like chaos. They are not chaotic in the technical sense: every bob is perfectly regular, and the whole row is periodic with period $\\Gamma$.',
        },
        { type: 'h', text: 'The strobe' },
        {
          type: 'p',
          text: 'The plan view at the foot of the drawing photographs the row once a second, when the longest pendulum is at the top of its swing. Because $N_0 = \\Gamma$, snapshot $m$ (taken at $t = m$ seconds) catches bob $k$ at phase $2\\pi m (\\Gamma + k)/\\Gamma = 2\\pi m + 2\\pi k m/\\Gamma$, and the whole-turn part vanishes:',
        },
        { type: 'math', tex: '\\theta_k(m) = \\theta_0 \\cos\\!\\left(\\frac{2\\pi k m}{\\Gamma}\\right)', label: '(7)' },
        {
          type: 'p',
          text: 'Each snapshot is a pure cosine along the row with $m/\\Gamma$ cycles per bob, and the stack of 61 snapshots is the whole cycle laid out as a sheet. Equation (7) has a pleasing consequence: snapshots $m$ and $\\Gamma - m$ are identical, because $\\cos(2\\pi k - x) = \\cos x$ for whole $k$. The finished plate is symmetric about its middle line. The second half of the minute is the first half run backwards, seen through the stroboscope.',
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'How the piece works',
      title: 'A closed form, a strobe and a sheet of paper',
      blocks: [
        {
          type: 'p',
          text: 'Pendulum Wave is one TypeScript module drawing on one canvas with the Canvas 2D API: no images, no libraries. It keeps three numbers per bob, an amplitude $A_k$, a release time $\\tau_k$ and an angular frequency $\\omega_k$, and computes every angle from the exact solution of the linearised equation. There is no numerical integrator, so there is no integration error and no drift: after an hour of running, the fifteen agree at every $\\Gamma$ to the precision of floating-point arithmetic. It also makes the piece a pure function of time, so the test route can jump to any moment.',
        },
        {
          type: 'code',
          code: `const lengthOf = (gamma: number, k: number) => G * Math.pow(gamma / (TAU * (gamma + k)), 2) * 1000

const thetaFree = (k: number, t: number) => amp[k] * Math.cos(omega[k] * (t - tau[k]))

/** The angle we show at time t (drag and gather override the free swing). */
function thetaAt(k: number, t: number) {
  if (k === drag) return dragTheta
  if (gather && t >= gather.t0) {
    const u = ease.inOutCubic(clamp((t - gather.t0) / gather.dur))
    return lerp(gather.from[k], THETA0, u)
  }
  return thetaFree(k, t)
}`,
          caption: 'Equation (4) in millimetres, and equation (2) with a release time. Dragging or gathering simply overrides the angle until the bob is let go.',
        },
        {
          type: 'p',
          text: 'When you drag a bob, the piece projects the pointer onto the bob’s direction of swing and holds it at that angle. When you let go, it records the new amplitude and the moment of release, $A_k = \\theta_{\\text{held}}$ and $\\tau_k = t$, and the bob carries on with its own phase. A tap starts a *gather*: for 0.9 s every bob eases from wherever it is to $\\theta_0$, as if a board had swept them all aside, and then all fifteen are released at the same instant and a new cycle begins. Changing $\\Gamma$ does the same while the strings re-tune to the new lengths of equation (4).',
        },
        { type: 'h', text: 'The plate' },
        {
          type: 'p',
          text: 'Once a second the piece records the plan displacement of every bob, $L_k \\sin\\theta_k$, as a fraction of the longest bob’s full swing. The record is taken from the state at that instant, so a bob you disturbed shows up in every later line as a knot that travels through the sheet.',
        },
        {
          type: 'code',
          code: `function planD(k: number, t: number) {
  return (lengthNow(k, t) * Math.sin(thetaAt(k, t))) / (lengthOf(gamma, 0) * Math.sin(THETA0))
}

function fillPlate(t: number) {
  if (gather) return
  const due = Math.min(nLines, Math.floor((t - plateStart) / stride + 1e-9) + 1)
  for (let mm = plateCount; mm < due; mm++) {
    const tm = plateStart + mm * stride
    for (let k = 0; k < K; k++) plate[mm * K + k] = planD(k, tm)
  }
  if (due > plateCount) plateCount = due
}`,
          caption: 'Snapshots are taken at exact strobe times, not at whatever frame happens to be drawn, so a slow frame never blurs the record.',
        },
        {
          type: 'p',
          text: 'Each line is drawn as a smooth Catmull–Rom curve through fifteen points, converted to cubic Béziers, with a flat lead-in and lead-out. Lines are drawn from the top of the plate down, and each is first filled with paper from the curve to just below its baseline before it is stroked. That is the old engraver’s trick for hidden lines: every new line covers the parts of the lines above it that dip behind it, so the stack reads as a ridged surface rather than a tangle. Below the last line, the current plan view wriggles live in ocean blue until the next strobe prints it. On small frames the plate draws every second, third or sixth snapshot, always a divisor of $\\Gamma$, so the final line still lands on the moment of agreement.',
        },
        { type: 'h', text: 'The elevation' },
        {
          type: 'p',
          text: 'The frame and pendulums are drawn in an *oblique projection*: the beam runs across the page at true length, and the direction of swing, which really points into the page, is drawn receding at 35° and shortened to 0.62. A bob at angle $\\theta$ on a string of length $L$ sits at depth $z = L\\sin\\theta$ and height $L\\cos\\theta$ below the beam, and lands on the screen at $x + 0.62\\,z\\cos 35°$, $y - 0.62\\,z\\sin 35°$. Strings are bifilar: two threads in a V, as on real demonstrations, which keeps each bob in its plane. Bobs are sorted by depth every frame and drawn back to front, each a paper disc with a hatched shadow cut out by an even-odd clip. Near a simple fraction of the cycle, the members of each group are joined by a coloured line, which is the clearest way to see that the row has become two, three or four rows.',
        },
        { type: 'h', text: 'The sound' },
        {
          type: 'p',
          text: 'With sound on, each bob plays a note as it passes the bottom of its swing moving outward: once per swing, so pendulum $k$ plays $N_k$ notes per cycle. The longest pendulum takes the lowest note and the shortest the highest, through three octaves of D major pentatonic. Released together, the row plays a single chord every second. As the phases drift the chord breaks into a rippling arpeggio, at half the cycle it becomes two alternating chords, and as $\\Gamma$ approaches, the arpeggio closes up until all fifteen notes land together.',
        },
        {
          type: 'code',
          code: `// one note per swing, as the bob passes the bottom moving outward
if (k !== drag && b < 0 && a >= 0 && Math.abs(amp[k]) > 0.02 && !gather) {
  if (lastNotes < 40) {
    const level = clamp(Math.abs(amp[k]) / THETA0, 0.3, 1.6)
    sfx.tone(noteOf(k), 1.3, { type: 'sine', gain: 0.022 * level, attack: 0.004, pan: (k / (K - 1) - 0.5) * 1.3, room: 0.35 })
    lastNotes++
  }
}`,
          caption: 'A zero crossing of the angle between two frames triggers the note; a simple budget keeps the voice count bounded.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Legend',
      blocks: [
        {
          type: 'list',
          items: [
            '**Elevation (top):** the beam, uprights and base plate, with the base sectioned (hatched). Each pendulum hangs on a V of two threads. Dotted arcs are the bobs’ paths; the dotted curve through the rest positions shows the lengths. The faint line through the bobs is the wave itself.',
            '**Dimensions:** $L_1$ and $L_{15}$, the longest and shortest lengths at rest, in millimetres. A 100 mm scale bar sits beside the title of the view.',
            '**Coloured lines through the bobs:** near a simple fraction $p/q$ of the cycle, each of the $q$ groups that move together is joined by its own colour. A single moss line means all fifteen are in phase.',
            '**Plan (bottom):** the row seen from above, one line per strobe. The time axis on the left runs from 0 to $\\Gamma$ with a playhead; the marks on the right are the simple fractions of the cycle, turning blue as they pass. The first and last lines are moss: the moments of agreement. Lines at quarter and third fractions are drawn in blue.',
            '**Columns:** along the foot of the plate, the number of swings each pendulum makes per cycle.',
            '**Schedule (wide screens):** for each pendulum its swings per cycle, period and length, and a small dial showing where it is in its swing right now.',
            '**Readouts (top right):** the cycle $\\Gamma$, the time into the cycle $s$, the phase step between neighbours $\\Delta\\varphi = 360°\\cdot s/\\Gamma$, and the time until the next agreement.',
          ],
        },
        {
          type: 'p',
          text: 'Worth watching for: the first few seconds, when the straight line becomes a curve with no apparent cause; the moment near 30 s when the row is two rows; the minute’s last ten seconds, when the plate’s lines flatten towards the moss line at the bottom; and, after a full cycle, the finished plate fading behind the new one, symmetric top to bottom as equation (7) promises.',
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
            '**The small-angle model, exactly.** The bobs follow equation (2), not equation (1). Real pendulums at 12° run 0.27% slow, so a real row released together would agree at 60.16 s rather than 60 s; because every bob is slowed by the same factor, they would still agree. A bob you pull to 24° would, in reality, run 1.1% slow and slip out of the pattern by about half a swing a minute. Here it keeps perfect time.',
            '**No friction.** Real pendulums lose amplitude to air and to the suspension, and they do not all lose it at the same rate, which slowly blurs the pattern. These swing for ever.',
            '**Ideal strings and point-like bobs.** The length that matters for a real pendulum is to the bob’s centre of oscillation, slightly below its centre of mass, and the string has weight. The piece treats each as a simple pendulum.',
            '**The oblique view.** The swing really points into the page; the drawing tilts it to 35° so it can be seen, and shortens it, which is a drafting convention rather than a perspective.',
            '**The strobe.** A real photograph once a second would catch the bobs in motion blur; the plate records exact positions at exact instants.',
            '**The music.** The pitches are chosen, not physical: a pendulum makes no note, and these notes follow the bobs’ order, not their frequencies.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Dialogues Concerning Two New Sciences', by: 'Galileo Galilei', year: '1638', note: 'The First Day includes the pendulum and the rule that lengths go as the squares of the times.' },
    { title: 'Horologium Oscillatorium', by: 'Christiaan Huygens', year: '1673', note: 'The theory of the pendulum clock, the cycloid and the period of small oscillations. English translation by Richard J. Blackwell as *The Pendulum Clock* (1986).' },
    { title: 'The Pendulum: A Case Study in Physics', by: 'Gregory L. Baker & James A. Blackburn', year: '2005', note: 'Oxford University Press. The physics of the pendulum from the small-angle approximation to chaos.' },
    { title: 'Pendulum waves: A lesson in aliasing', by: 'James A. Flaten & Kevin A. Parendo', year: '2001', note: '*American Journal of Physics* 69. The patterns as a sampled wave.' },
    { title: 'Time for Science Education', by: 'Michael R. Matthews', year: '2000', note: 'Kluwer. The history and philosophy of pendulum motion, from Galileo to Huygens and beyond.' },
  ],
}

export default guide
