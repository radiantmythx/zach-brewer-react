import type { Guide } from '../guide'

const bulgeFigure = `<svg viewBox="0 0 440 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <ellipse cx="150" cy="110" rx="78" ry="56" stroke="#2B6A93"/>
  <circle cx="150" cy="110" r="62"/>
  <circle cx="150" cy="110" r="2" fill="currentColor"/>
  <path d="M212 110 h22 M228 106 l6 4 -6 4" />
  <path d="M88 110 h-22 M72 106 l-6 4 6 4" />
  <path d="M150 48 v12 M146 54 l4 6 4 -6" />
  <path d="M150 172 v-12 M146 166 l4 -6 4 6" />
  <path d="M194 66 l10 -6 M196 72 l8 -12" opacity="0.5"/>
  <line x1="236" y1="110" x2="372" y2="110" stroke-dasharray="2 4" opacity="0.5"/>
  <circle cx="392" cy="110" r="17"/>
  <path d="M392 93 a17 17 0 0 1 0 34 z" fill="currentColor" opacity="0.18" stroke="none"/>
  <text x="378" y="148" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">MOON</text>
  <text x="240" y="98" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">PULLED AHEAD</text>
  <text x="14" y="98" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">LEFT BEHIND</text>
  <text x="160" y="40" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">SQUEEZED</text>
  <text x="300" y="134" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">F ∝ M / d³</text>
  <text x="96" y="206" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">TIDAL FORCE = PULL HERE − PULL AT THE CENTRE</text>
</svg>`

const beatFigure = `<svg viewBox="0 0 440 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <path d="M20 75 h400" stroke-dasharray="2 4" opacity="0.4"/>
  <path d="M20 36 C80 36 110 58 130 60 S180 36 240 36 S330 60 350 60 S400 36 420 36" stroke="#1F8A86" stroke-dasharray="3 3"/>
  <path d="M20 114 C80 114 110 92 130 90 S180 114 240 114 S330 90 350 90 S400 114 420 114" stroke="#1F8A86" stroke-dasharray="3 3"/>
  <path d="M20 75 l6 -38 6 76 6 -76 6 74 6 -72 6 68 6 -64 6 58 6 -52 6 44 6 -36 6 30 6 -30 6 34 6 -40 6 48 6 -54 6 60 6 -66 6 70 6 -73 6 76 6 -76 6 76 6 -74 6 70 6 -64 6 58 6 -50 6 42 6 -34 6 30 6 -30 6 36 6 -44 6 52 6 -60 6 66 6 -72 6 75 6 -76" opacity="0.85"/>
  <text x="22" y="20" font-family="Geist Mono, monospace" font-size="9" fill="#1F8A86" stroke="none">SPRING</text>
  <text x="110" y="20" font-family="Geist Mono, monospace" font-size="9" fill="#1F8A86" stroke="none">NEAP</text>
  <text x="218" y="20" font-family="Geist Mono, monospace" font-size="9" fill="#1F8A86" stroke="none">SPRING</text>
  <text x="330" y="20" font-family="Geist Mono, monospace" font-size="9" fill="#1F8A86" stroke="none">NEAP</text>
  <text x="22" y="140" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">TWO WAVES, 12 H 25 MIN AND 12 H 00 MIN, BEAT EVERY 14.8 DAYS</text>
</svg>`

const guide: Guide = {
  lede: 'A lunar month at one shore. The Moon stretches the ocean into two shallow bulges and the Earth turns beneath them, so the sea comes in and goes out twice a day; when the Sun lines up with the Moon the tides run highest, and when it pulls at right angles they barely move.',
  facts: [
    ['Phenomenon', 'Ocean tides: the sea’s twice-daily rise and fall'],
    ['Model', 'Newton’s equilibrium tide, 1687, in the equatorial plane'],
    ['Tidal force', '$\\propto M/d^3$: the Sun’s is 0.46 of the Moon’s'],
    ['Heights', 'Moon 0.36 m, Sun 0.16 m above the undisturbed sphere'],
    ['Ranges', 'Springs 0.78 m, neaps 0.29 m (equilibrium, at the equator)'],
    ['Periods', 'Lunar day 24 h 50 min; half of it 12 h 25 min'],
    ['Month', 'Synodic, 29.53 days: two springs and two neaps'],
    ['Running time', '78 s for one month, on a warped clock'],
    ['Sound', 'Optional: surf that swells with the water'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['S'], action: 'Take the Sun’s tide away, or give it back' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag the Moon around its orbit: time holds, and the bulge, the beach and the readouts follow' },
      { gesture: 'tap', action: 'Tap anywhere else to switch the Sun’s contribution off or on' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'In chapter III, take the Sun away: the chart redraws as a steady, even tide with no springs and no neaps, and the dotted line shows what the Sun was adding.',
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'The sea, keeping time with the Moon',
      blocks: [
        {
          type: 'p',
          text: 'Stand on almost any open coast for a day and the sea moves twice: in and out, in and out, with high water arriving about fifty minutes later each day. Stand there for a month and a slower rhythm appears inside the fast one. For a few days the tides run very high and very low, and the beach is exposed further than usual; a week later the sea hardly moves at all; a week after that the big tides are back. The large ones are called **spring tides** (nothing to do with the season: the word means to leap or well up) and the small ones **neap tides**. Springs come around new and full moon, neaps around the quarters.',
        },
        {
          type: 'p',
          text: 'That timing was noticed long before anyone could explain it. Ancient writers from Pytheas, who sailed the Atlantic coasts in the fourth century BC, to Seleucus of Seleucia two centuries later, tied the tides to the Moon, and in the eighth century Bede described how high water drifted later day by day. What nobody could say was *how* a body a quarter of a million miles away lifts the sea, or why it raises the water on the side of the Earth facing away from it as well as the side facing toward it.',
        },
        { type: 'h', text: 'Newton’s answer' },
        {
          type: 'p',
          text: 'Isaac Newton gave the answer in the *Principia* in 1687, as one of the first applications of universal gravitation. The Moon does not simply pull the ocean toward itself; it pulls on everything, the Earth included, and the Earth falls toward the Moon as a whole (that falling is the Earth’s monthly wobble about the pair’s common centre of mass). What raises the tide is the *difference* between the pull on the water and the pull on the Earth’s centre. Water on the near side is about one Earth radius closer to the Moon than the centre, so it is pulled a little harder and draws ahead. Water on the far side is a radius further away, pulled a little less, and is left behind. Around the sides, the pulls converge slightly toward the Moon and squeeze the water inward. The result is an ocean stretched into an ellipse, with two bulges, one under the Moon and one opposite.',
        },
        {
          type: 'p',
          text: 'Newton went further. He saw that the Sun produces the same effect, weaker because although the Sun is enormously more massive it is also far more distant, and that the two tides add when the Sun, Earth and Moon are in line and partly cancel when they are at right angles. That is the spring–neap cycle, explained in a few pages. He even estimated the ratio of the two forces from tidal heights recorded in the English Channel and the Bristol Channel, and came out with the Moon’s share well over four times the Sun’s; the true figure is about 2.2. His theory of the shape was right; the error came from the tidal observations he had to work with, and it led him to overestimate the Moon’s mass as well.',
        },
        {
          type: 'figure',
          svg: bulgeFigure,
          alt: 'The Earth with an ellipse around it elongated toward the Moon; arrows pointing outward toward and away from the Moon and inward at the sides.',
          caption: 'The tidal force is what is left of the Moon’s pull once the Earth’s own fall toward the Moon is taken away: outward on the near and far sides, inward around the middle.',
        },
        { type: 'h', text: 'Twice a day, and fifty minutes late' },
        {
          type: 'p',
          text: 'The bulges stay roughly lined up with the Moon while the Earth turns underneath them, so a point on the coast passes through both bulges every rotation: two high waters and two low waters. But the Moon is moving too, about 13° a day around its orbit in the same direction as the Earth spins, so the Earth has to turn a little extra each day to bring the Moon back overhead. The interval from one passage of the Moon to the next, the **lunar day**, averages 24 hours 50 minutes. Half of it, 12 hours 25 minutes, is the rhythm of the main tidal constituent, which tide tables call $M_2$. The Sun’s tide, $S_2$, keeps exactly 12 hours. Two waves with slightly different periods drift in and out of step, and the time it takes them to do so is half a synodic month, 14.8 days: spring to spring.',
        },
        { type: 'h', text: 'Real tides' },
        {
          type: 'p',
          text: 'Newton’s picture is the *equilibrium tide*: the shape the ocean would take if it could adjust instantly. It cannot. A long wave in water four kilometres deep travels at about 200 metres a second, while the Earth’s surface at the equator moves at 465, so the ocean is always chasing a bulge it can never keep up with, and the continents are in the way. Pierre-Simon Laplace recast the problem in the 1770s as the dynamics of a thin fluid layer on a rotating sphere, and his equations are still the starting point of tidal theory. They show that each ocean basin responds like a resonant body, sloshing at its own natural periods under the astronomical forcing.',
        },
        {
          type: 'p',
          text: 'So in most seas the tide rotates. There are places, called **amphidromic points**, where the tidal range is nearly zero; around each one the high water travels like the hand of a clock, once every 12 hours 25 minutes, usually anticlockwise in the northern hemisphere, and the range grows with distance from the point. The North Sea has three. In some basins the resonance amplifies the tide enormously: the Bay of Fundy, between New Brunswick and Nova Scotia, has a natural sloshing period close to 12 hours 25 minutes, and its spring tides rise and fall by around 16 metres at the head of the Minas Basin, the largest range in the world. The astronomy sets the rhythm everywhere; the shape of the sea sets the size.',
        },
        {
          type: 'p',
          text: 'So practical tide prediction does not compute the ocean’s response from first principles. Instead, each port’s record is broken into a sum of sine waves at the astronomically known frequencies, the *harmonic constituents* ($M_2$, $S_2$, the diurnal $K_1$ and $O_1$, and dozens more), whose amplitudes and phases are fitted from a year or so of measurements. William Thomson, later Lord Kelvin, built a mechanical tide-predicting machine in the 1870s that summed the constituents with pulleys and a wire; such machines printed tide tables for a century.',
        },
        { type: 'h', text: 'The tide that slows the day' },
        {
          type: 'p',
          text: 'Friction in the tides takes energy from the Earth’s rotation. Because the Earth spins faster than the Moon orbits, the bulge is carried slightly ahead of the line to the Moon, and its gravity pulls the Moon gently forward along its orbit while the Moon pulls the bulge, and so the Earth, back. Angular momentum flows from the Earth’s spin to the Moon’s orbit. The day lengthens, by about 2.3 milliseconds a century from tidal friction alone (the observed rate is smaller, around 1.7 to 1.8 milliseconds, because the Earth is also slowly changing shape since the last ice age), and the Moon climbs away. Laser ranging to the reflectors left by the Apollo astronauts measures the recession directly: about **3.8 centimetres a year**.',
        },
        {
          type: 'p',
          text: 'The same process, run on the Moon by the Earth’s much stronger pull, long ago braked the Moon’s own spin until it turned exactly once per orbit. That is **tidal locking**, and it is why we always see the same face. The Earth will never quite lock to the Moon before the Sun changes everything, but the direction of travel is set: longer days, a more distant Moon, and in the far future no total eclipses.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'Differential gravity, and the shape it makes',
      blocks: [
        {
          type: 'p',
          text: 'Let a body of mass $M$ sit at distance $d$ from the Earth’s centre, along the unit vector $\\hat{u}$. At a point $\\vec{r}$ from the centre, with $|\\vec{r}| = R \\ll d$, subtract the pull at the centre from the pull at the point and keep the leading term:',
        },
        { type: 'math', tex: '\\vec{a}_{\\text{tide}} \\approx \\frac{GM}{d^3}\\left(3(\\vec{r}\\cdot\\hat{u})\\,\\hat{u} - \\vec{r}\\right)', label: '(1)', caption: '$G$ is the gravitational constant. The force grows with distance from the centre and falls off with the *cube* of the distance to the body.' },
        {
          type: 'p',
          text: 'On the surface, writing $\\theta$ for the angle between the point and the direction to the body, the outward component is $(GMR/d^3)(3\\cos^2\\theta - 1)$: twice the base value, outward, under the body and opposite it, and once, inward, around the rim at $\\theta = 90°$. That is the arrow diagram in the opening of the piece. The cube is the whole reason the Moon wins. The Sun is 27 million times the Moon’s mass but 389 times as far away, and $27 \\times 10^6 / 389^3 \\approx 0.46$.',
        },
        { type: 'h', text: 'The equilibrium surface' },
        {
          type: 'p',
          text: 'The tidal force derives from a potential, and an ocean in equilibrium makes its surface an equipotential. Dividing the potential by surface gravity $g = GM_E/R^2$ gives the height of the water above the undisturbed sphere:',
        },
        { type: 'math', tex: '\\eta(\\theta) = \\frac{M}{M_E}\\left(\\frac{R}{d}\\right)^3 R \\cdot \\frac{3\\cos^2\\theta - 1}{2}', label: '(2)' },
        {
          type: 'p',
          text: 'For the Moon, $M/M_E = 0.0123$ and $R/d = 6371/384400$, so the coefficient is 0.357 m: the water stands 36 cm above the sphere under the Moon and opposite it, and 18 cm below it at the sides, a range of 54 cm. For the Sun the coefficient is 0.164 m. The piece uses exactly these two numbers, $A_{\\text{moon}} = 0.3568$ and $A_{\\text{sun}} = 0.1638$ metres.',
        },
        {
          type: 'p',
          text: 'Put the Moon at longitude $\\phi_m$ and the Sun at $\\phi_s$, both in the plane of the equator, and a shore at longitude $\\psi$. Using $\\cos^2 x = (1 + \\cos 2x)/2$, the part of the tide that varies at the shore is',
        },
        { type: 'math', tex: '\\eta(\\psi) = \\tfrac{3}{4}\\left[A_m \\cos 2(\\psi - \\phi_m) + A_s \\cos 2(\\psi - \\phi_s)\\right]', label: '(3)', caption: 'The factor $2$ inside the cosines is the two bulges: the tide repeats every half-turn of the Earth relative to each body.' },
        {
          type: 'p',
          text: 'Two cosines of the same form add like two arrows: the result is a single semi-diurnal wave whose amplitude depends on the angle between Sun and Moon,',
        },
        { type: 'math', tex: 'a = \\tfrac{3}{4}\\sqrt{A_m^2 + A_s^2 + 2A_mA_s\\cos 2(\\phi_m - \\phi_s)}', label: '(4)' },
        {
          type: 'p',
          text: 'At new and full moon, $\\phi_m - \\phi_s$ is $0$ or $180°$, the cosine is $+1$ and the amplitudes add: a spring range of $\\tfrac{3}{2}(A_m + A_s) = 0.78$ m. At the quarters the cosine is $-1$ and they subtract: a neap range of $\\tfrac{3}{2}(A_m - A_s) = 0.29$ m. These are the dashed envelopes on the tide chart, and the readout labelled *range*.',
        },
        { type: 'h', text: 'Periods' },
        {
          type: 'p',
          text: 'In a frame fixed to the Sun, the shore turns once per solar day and the Moon advances once per synodic month, $P_{\\text{syn}} = 29.530589$ days. The Moon returns overhead after one lunar day,',
        },
        { type: 'math', tex: 'P_{\\text{lunar}} = \\frac{P_{\\text{syn}}}{P_{\\text{syn}} - 1} = 1.03505\\text{ days} = 24\\text{ h }50.5\\text{ min}', label: '(5)' },
        {
          type: 'p',
          text: 'and the $M_2$ tide has half that period, 12 h 25.2 min. The beat between $M_2$ and $S_2$ has period $1/(1/12 - 1/12.4206)$ hours, which is 14.77 days, half the synodic month. Notice one consequence of equation (3): with the Sun in, successive high waters are not always 12 h 25 min apart. Near springs the combined wave runs a little fast (about 12 h 17 min) and near neaps a little slow (about 12 h 47 min); only the average is 12 h 25 min. The piece measures the interval from its own record rather than printing the average, and you can watch it change.',
        },
        {
          type: 'figure',
          svg: beatFigure,
          alt: 'A fast oscillation whose amplitude swells and shrinks between dashed envelope lines labelled spring and neap.',
          caption: 'The tide chart of chapter III in miniature: two nearly equal frequencies, beating.',
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'How the piece works',
      title: 'One shore, one month, one function of time',
      blocks: [
        {
          type: 'p',
          text: 'Tide is a single TypeScript module drawing to a canvas, with no images or libraries. Everything on the plate is computed each frame from one number, the time $\\tau$ in days since the opening new moon, and two pieces of state you control: an offset for a dragged Moon, and whether the Sun is switched on.',
        },
        { type: 'h', text: 'A warped clock' },
        {
          type: 'p',
          text: 'A month at a steady pace would be either too slow to see the springs or too fast to see a single tide. So the 78-second loop runs on a clock whose rate changes with the chapters: an hour per second at first, then four hours a second, then most of a day a second through the month, then two hours a second at the end. The fast rate is not chosen by hand; the clock is integrated once at load, with the fast rate left as an unknown, and solved so the loop holds exactly one synodic month.',
        },
        {
          type: 'code',
          code: `function rateParts(T: number): [number, number] {
  const r0 = 1 / 24 // days per second: an hour
  const r1 = 1 / 6  // four hours
  const r3 = 1 / 12 // two hours
  const u1 = smoothstep(14, 18, T)
  const u2 = smoothstep(31, 37, T)
  const u3 = smoothstep(62, 68, T)
  // the rate is linear in the unknown fast rate rF: [part without it, weight of rF]
  return [(1 - u3) * (1 - u2) * lerp(r0, r1, u1) + u3 * r3, (1 - u3) * u2]
}
// integrate both parts over the loop, then pick rF so that τ(LOOP) = MONTH
const rF = (MONTH - aL) / bL`,
          caption: 'The clock’s rate as a blend of four speeds. Because the blend is linear in the fast rate, one pass of integration finds it exactly (it comes out at about 0.8 days per second).',
        },
        { type: 'h', text: 'The model' },
        {
          type: 'p',
          text: 'The Sun sits fixed to the left, at longitude $\\pi$. The shore starts at sunrise and turns a full circle each day; the Moon starts at new moon and advances once per synodic month. Equations (2) to (4) appear almost verbatim:',
        },
        {
          type: 'code',
          code: `const psiAt = (tau: number) => Math.PI / 2 + TAU * tau          // the shore
const moonAt = (tau: number) => Math.PI + (TAU * tau) / MONTH      // the Moon
/** height at the shore, metres, about its mean (3) */
const etaShore = (psi, moon, k) =>
  0.75 * (AM * Math.cos(2 * (psi - moon)) + k * AS * Math.cos(2 * (psi - SUN)))
/** semi-amplitude for a Sun–Moon angle (4) */
const ampFor = (moon, k) =>
  0.75 * Math.sqrt(AM * AM + k * k * AS * AS + 2 * k * AM * AS * Math.cos(2 * (moon - SUN)))
/** the equilibrium surface around the Earth (2), for the drawing */
const P2 = (c: number) => (3 * c * c - 1) / 2
const bulgeAt = (phi, moon, k) => AM * P2(Math.cos(phi - moon)) + k * AS * P2(Math.cos(phi - SUN))`,
          caption: 'The whole tidal model. `k` is the Sun’s weight, eased between 0 and 1 when you toggle it, so the bulge, the beach and the chart all change smoothly.',
        },
        {
          type: 'p',
          text: 'The tide chart is recomputed every frame from $\\tau = 0$ to now, sampled about one and a half times per pixel of chart width, so that switching the Sun off redraws the whole month as it would have been. Its time axis eases from thirty hours to three and a half days to the full month as the clock speeds up, which keeps each beat readable: a single tide first, then a few, then the beating. The next high and low water in the beach panel are found by stepping forward five minutes at a time and watching the sign of the slope change.',
        },
        { type: 'h', text: 'The orbit view' },
        {
          type: 'p',
          text: 'Seen from above the north pole, everything turns counter-clockwise: the Earth, the Moon and, if it were drawn, the Earth around the Sun. The bulge is drawn from equation (2) as a closed polyline of 120 points, scaled about three million times in height so that 36 cm reads as 17% of the Earth’s radius. In chapter III the lunar and solar parts are drawn separately, dashed and dotted, so you can see the sum change shape. The arrows of chapter I are equation (1) evaluated at sixteen points on the surface:',
        },
        {
          type: 'code',
          code: `for (let k = 0; k < 16; k++) {
  const a = s.moon + (k * TAU) / 16
  const c = Math.cos(a - s.moon)
  // a = (GM/d³)(3 cosθ û − r̂)
  const vx = 3 * c * Math.cos(s.moon) - Math.cos(a)
  const vy = 3 * c * Math.sin(s.moon) - Math.sin(a)
  const x0 = ox + Math.cos(a) * rE
  const y0 = oy - Math.sin(a) * rE
  arrow(x0, y0, x0 + vx * len, y0 - vy * len, 3)
}`,
          caption: 'The quadrupole field of the tidal force: outward along the Earth–Moon line, inward across it.',
        },
        {
          type: 'p',
          text: 'Dragging the Moon converts the pointer’s angle about the Earth into an offset from the Moon’s true longitude and freezes the clock while you hold it. Everything that reads the Moon (the bulge, the force arrows, the elongation arc, the shore’s water level and the readouts) follows the dragged position; the chart keeps the true record and marks where the dragged Moon would put the water with a small open circle. Let go and the offset decays back to zero over a second or two, and the month resumes.',
        },
        { type: 'h', text: 'The beach' },
        {
          type: 'p',
          text: 'The section is a profile function: a dune, a beach face falling about two metres per unit of width, a rock ledge with a pool in it, and a sea floor. Vertical distances are exaggerated so that the equilibrium range is visible. The water is drawn by filling everything below the current level with a pale wash and draughtsman’s dashes, then painting the sand over it, so the waterline finds the slope by itself. The *wet-sand line* is the highest water of the last 13 hours, found by sampling the model backward; the moss-coloured *strandline* is the highest of the month so far. The pool keeps its water at the height of its rim whenever the sea falls below it.',
        },
        {
          type: 'p',
          text: 'The boat’s mooring line runs from a block on the bottom. The tidal current is taken to be proportional to the rate of rise of the water: flooding shoreward while the tide comes in, ebbing seaward as it goes out, and slack at high and low water. The boat lies downstream of its mooring with its bow into the current, and at slack water it swings through, end-on to you, which in a section looks like the hull shortening and lengthening again.',
        },
        { type: 'h', text: 'The sound' },
        {
          type: 'p',
          text: 'With sound on, the piece builds a small graph of its own: three seconds of pinkish noise looped through two low-pass filters, one for the hiss of the swash and one for the rumble of the break, swelling every seven seconds or so in step with the swash drawn on the beach. The tide sets the level and brightness: the surf is louder and brighter at high water, when the sea is close, and quieter and duller at low. In the fast part of the month, where the tide would flutter several times a second, the sound follows the day’s range instead, so you hear the springs and neaps as a slow swell and fade. While time runs slowly, each high water rings a soft bell.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Every mark on the plate',
      blocks: [
        {
          type: 'list',
          items: [
            '**The orbit view (left or top):** the Earth from above the north pole, its night side hatched, with latitude rings at 30° and 60° and meridians turning with the planet. The small triangle marked **A** is the shore drawn below. The ocean-blue ellipse is the tide; in chapter III its lunar part is dashed and its solar part dotted in fern.',
            '**The Sun:** off the plate to the left, shown by an arc of its limb and three lines of sunlight. When its tide is switched off the label reads *tide off* and the arc pales.',
            '**The Moon:** lit on the side facing the Sun. A tick on its dotted orbit marks each day gone by, a longer tick each week. The lagoon arc in chapter III is the angle between Sun and Moon, labelled *spring* near 0° or 180° and *neap* near 90°.',
            '**The section:** dune and marram grass, the beach face, the hatched rock ledge and its pool, the tide staff in centimetres with the current reading, and the moored boat. The dotted marker is the last high water; the stipple below it is wet sand.',
            '**The Moon’s face** in the section’s corner, as seen from the shore, with its phase name and the fraction lit.',
            '**The tide gauge:** the month’s record at shore A. Moon phases sit along the top, dashed lagoon envelopes trace the range, and *spring* and *neap* are labelled as the pen passes them. In chapter II a dimension line measures one high water to the next, and a second one measures two tides.',
            '**Readouts:** day of the month, local solar time at the shore, the water level, today’s range, and whether the Sun is on. In chapter II the lunar day is added.',
            '**Bottom ruler:** the loop, with its four chapters. Tap it to jump.',
          ],
        },
        {
          type: 'p',
          text: 'The beats: in chapter I the bulge draws itself around the Earth and the force arrows show where it comes from, while the beach fills from dawn to noon. Chapter II speeds up to four hours a second and the pattern of two tides a day appears. Chapter III zooms the chart out to the whole month and the beating appears; the caption arrives at the full-moon spring. Chapter IV slows down again on the last day, with an arrow on the Moon for its slow retreat, and the month closes on another spring tide.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What the drawing leaves out',
      blocks: [
        {
          type: 'list',
          items: [
            '**Equilibrium, not dynamics.** The water at the shore is Newton’s equilibrium height, instantaneous and the same everywhere along a meridian. Real tides lag, rotate around amphidromic points and are amplified or cancelled by the shape of the basin; most coasts see one to several metres of range, not the 0.3 to 0.8 m shown on the staff.',
            '**Everything in the equatorial plane.** The Moon’s orbit is tilted about 5° to the ecliptic, and the ecliptic 23.4° to the equator, so in reality the bulges are usually off the equator. That produces the *diurnal inequality* (one of the two daily tides higher than the other) and the diurnal tides that dominate in some places. The piece has neither.',
            '**A circular orbit.** The Moon’s distance varies by about 11% over the anomalistic month of 27.55 days, changing its tidal force by around 40% from apogee to perigee (the cube again). Perigean spring tides, sometimes called king tides, are the result. The piece holds the distance fixed.',
            '**No age of the tide.** At many ports the biggest tides arrive a day or two after new or full moon. The equilibrium model has no such delay.',
            '**A rigid Earth.** The solid Earth also deforms under the tidal force, by a few tens of centimetres, which reduces the ocean tide measured against the land. Geophysicists fold this into a factor built from Love numbers, about 0.7; the piece ignores it.',
            '**Not to scale.** The Moon’s orbit is drawn at about three Earth radii instead of sixty, and the bulge is exaggerated about three million times. The beach is a schematic section with heights exaggerated; the boat, rope and current are illustrative, not modelled hydrodynamics.',
            '**A warped clock.** Time runs at different speeds in different chapters, and the loop holds one synodic month exactly, so the last day ends at a different time of day from the first; the plate fades between loops rather than pretending otherwise.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Philosophiæ Naturalis Principia Mathematica', by: 'Isaac Newton', year: '1687', note: 'Book I, Proposition 66, and Book III, Propositions 24, 36 and 37: the first theory of the tides.' },
    { title: 'Tides: A Scientific History', by: 'David Edgar Cartwright', year: '1999', note: 'Cambridge University Press. From Pytheas and Bede to satellite altimetry, by a tidal scientist.' },
    { title: 'Sea-Level Science: Understanding Tides, Surges, Tsunamis and Mean Sea-Level Changes', by: 'David Pugh & Philip Woodworth', year: '2014', note: 'Cambridge University Press. The standard modern text; the equilibrium tide, harmonic analysis and amphidromes in detail.' },
    { title: 'Our Restless Tides', by: 'U.S. National Oceanic and Atmospheric Administration', note: 'A short, clear NOAA explanation of the astronomical causes of tides and tidal currents.' },
    { title: 'Tide: The Science and Lore of the Greatest Force on Earth', by: 'Hugh Aldersey-Williams', year: '2016', note: 'A general reader’s history and natural history of the tides.' },
    { title: 'Lunar Laser Ranging: A Continuing Legacy of the Apollo Program', by: 'J. O. Dickey et al.', year: '1994', note: '*Science* 265. Includes the measurement of the Moon’s recession, about 3.8 cm a year.' },
    { title: 'Measurement of the Earth’s rotation: 720 BC to AD 2015', by: 'F. R. Stephenson, L. V. Morrison & C. Y. Hohenkerk', year: '2016', note: '*Proceedings of the Royal Society A* 472. The lengthening of the day from ancient eclipse records.' },
  ],
}

export default guide
