import type { Guide } from '../guide'

const tangentFigure = `<svg viewBox="0 0 420 250" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="210" cy="160" r="72"/>
  <circle cx="210" cy="160" r="2.5" fill="currentColor"/>
  <circle cx="210" cy="58" r="2.5" fill="currentColor"/>
  <line x1="210" y1="58" x2="159" y2="109"/>
  <line x1="210" y1="58" x2="261" y2="109"/>
  <line x1="210" y1="160" x2="159" y2="109" stroke-dasharray="3 3" opacity="0.6"/>
  <line x1="210" y1="160" x2="261" y2="109" stroke-dasharray="3 3" opacity="0.6"/>
  <line x1="210" y1="58" x2="210" y2="160" opacity="0.35"/>
  <path d="M166 116 L173 109 L166 102" opacity="0.6"/>
  <path d="M254 116 L247 109 L254 102" opacity="0.6"/>
  <path d="M147 121 A72 72 0 0 1 157 93" stroke="#2B6A93" stroke-width="2"/>
  <path d="M263 93 A72 72 0 0 1 273 121" stroke="#2B6A93" stroke-width="2"/>
  <path d="M195 172 A20 20 0 0 1 225 172" opacity="0.5"/>
  <g font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">
    <text x="218" y="54">PALLET ARBOR</text>
    <text x="218" y="182">ESCAPE WHEEL</text>
    <text x="216" y="118" opacity="0.6">R√2</text>
    <text x="92" y="100" fill="#2B6A93">ENTRY</text>
    <text x="282" y="100" fill="#2B6A93">EXIT</text>
    <text x="176" y="206" opacity="0.7">90° = 7½ TEETH</text>
    <text x="40" y="236" opacity="0.7">LOCKING FACES ARE ARCS ABOUT THE ARBOR, TANGENT TO THE TIP CIRCLE</text>
  </g>
</svg>`

const phaseFigure = `<svg viewBox="0 0 420 130" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <rect x="20" y="52" width="380" height="26" fill="#3F7A55" fill-opacity="0.08" stroke="none"/>
  <line x1="20" y1="65" x2="400" y2="65" opacity="0.3"/>
  <path d="M20 65 C 45 20, 75 20, 100 65 S 155 110, 180 65 S 235 20, 260 65 S 315 110, 340 65 S 395 20, 400 50" stroke="#2B6A93"/>
  <path d="M92 52 C 96 60, 98 63, 100 65 S 104 72, 107 78" stroke="#3F7A55" stroke-width="2.4"/>
  <path d="M172 78 C 176 70, 178 67, 180 65 S 184 58, 187 52" stroke="#3F7A55" stroke-width="2.4"/>
  <path d="M252 52 C 256 60, 258 63, 260 65 S 264 72, 267 78" stroke="#3F7A55" stroke-width="2.4"/>
  <g stroke="#6F952F"><line x1="108" y1="72" x2="108" y2="86"/><line x1="188" y1="44" x2="188" y2="58"/><line x1="268" y1="72" x2="268" y2="86"/></g>
  <g font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">
    <text x="22" y="14" fill="#2B6A93">LOCK (SUPPLEMENTARY ARC)</text>
    <text x="196" y="122" fill="#3F7A55">IMPULSE NEAR THE BOTTOM</text>
    <text x="276" y="96" fill="#6F952F">DROP · TICK</text>
    <text x="330" y="78" opacity="0.6">± LIFT</text>
  </g>
</svg>`

const guide: Guide = {
  lede: 'Inside every mechanical clock a falling weight is let go one tooth at a time. The escapement locks the train, takes a push from it, and lets it drop; the pendulum decides when, and every tick gives back a little of the energy the swing has lost.',
  facts: [
    ['Escapement', 'Graham deadbeat, after George Graham, c. 1715'],
    ['Escape wheel', '30 teeth; the pallets embrace 7½ of them (90°)'],
    ['Per beat', 'Lock 1°, impulse 2° of the anchor; the wheel turns 4.8°, then drops 1.2°'],
    ['Pendulum', 'Seconds pendulum, period 2 s, rated at 992.1 mm'],
    ['Beat', '1 s · 3,600 beats per hour · the escape wheel turns once a minute'],
    ['Train', '8/48 × 8/80 = 1/60 to the minute hand; motion work 12:1 to the hours'],
    ['Physics', 'Pendulum integrated in 8 substeps a frame; the wheel solved by contact with the real pallet geometry'],
    ['Q (this model)', '60, so each beat loses 5.2% of the swing’s energy'],
    ['Running time', '60 s story in four chapters; the clock itself runs on'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['↑', '↓'], action: 'Raise or lower the rating nut by 0.5 mm (raise to gain)' },
      { keys: ['R'], action: 'Reset the pendulum to its rated length' },
      { keys: ['Space'], action: 'Stop the pendulum, or start it with a push' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag the bob sideways to set its swing, up or down to move the rating nut' },
      { gesture: 'tap', action: 'Tap anywhere else to stop or start the clock' },
      { gesture: 'move', action: 'Hover a part to name it' },
    ],
    tip: 'Turn the sound on, then drag the bob up a few millimetres and watch the rate readout: a millimetre of length is worth more than forty seconds a day.',
  },
  pad: {
    left: [
      { label: '‹', code: 'ArrowLeft', aria: 'Previous chapter' },
      { label: '›', code: 'ArrowRight', aria: 'Next chapter' },
    ],
    right: [
      { label: '↑', code: 'ArrowUp', aria: 'Raise the rating nut' },
      { label: '↓', code: 'ArrowDown', aria: 'Lower the rating nut' },
      { label: 'Stop · start', code: 'Space', aria: 'Stop or start the clock', wide: true },
    ],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'A controlled fall',
      blocks: [
        {
          type: 'p',
          text: 'A weight clock is a weight on a cord wound round a drum. Left alone, the weight would fall to the floor in a second and the hands would spin. The whole art of the clock is to let it fall slowly and evenly: a few millimetres an hour, in steps so regular that they can be counted as seconds. The part that does this is the *escapement*. It stands between the train of wheels, which is always trying to run, and the oscillator, a pendulum or a balance, which keeps time. It does two jobs at once: it releases the train one tooth at a time, at moments chosen by the oscillator, and it passes the oscillator a small push to replace the energy that friction and air take from it.',
        },
        {
          type: 'p',
          text: 'Those two jobs pull against each other. The oscillator keeps good time only if it is left alone, swinging freely at its own natural period; the escapement must touch it, and every touch is a disturbance. The history of precision timekeeping is, to a large extent, the history of escapements that touch more lightly.',
        },
        { type: 'h', text: 'The verge and foliot' },
        {
          type: 'p',
          text: 'The first mechanical clocks appeared in Europe in the late thirteenth century, and their escapement was the *verge*. A crown wheel, with teeth like the points of a crown, turns against two small flags, the pallets, set on a vertical arbor, the verge, at nearly a right angle to each other. A tooth pushes one pallet aside, swinging the verge, until the other pallet swings into the path of a tooth on the far side of the crown and is pushed back. On top of the verge sat the *foliot*, a horizontal bar with a weight hung on each arm; moving the weights in or out changed the rate. The foliot has no natural period of its own, so the clock ran as fast as the weight drove it, and errors of a quarter of an hour a day are often quoted.',
        },
        { type: 'h', text: 'The pendulum, and the anchor' },
        {
          type: 'p',
          text: 'Christiaan Huygens put a pendulum in charge in 1656. A pendulum has a period set by its length, not by the force driving it, and pendulum clocks were better at once. But Huygens still used a verge, and the verge forces the pendulum through a wide arc, where the pendulum is least isochronous. The next step, made in London some time between about 1657 and 1670, was the *anchor* escapement, named for its shape. Credit is disputed: Robert Hooke claimed it, and the clockmaker William Clement made early examples. The anchor’s pallets act on the teeth of a flat escape wheel in the same plane as the pendulum, and they need only a few degrees of swing. That made long pendulums practical, and the tall longcase clock, with a pendulum a metre long beating seconds, became the standard household timekeeper.',
        },
        {
          type: 'p',
          text: 'The anchor has a flaw. While the pendulum swings beyond the point where a tooth has landed on a pallet, the pallet keeps moving into the tooth and pushes the whole train backwards a little. You can see the seconds hand of an old longcase clock kick back after each tick. This *recoil* means the train is always pushing on the pendulum, and the push changes with the driving force, the oil and the swing.',
        },
        { type: 'h', text: 'Graham’s deadbeat' },
        {
          type: 'p',
          text: 'Around 1715 George Graham, who had worked with and succeeded Thomas Tompion in London, cured the recoil. In his *deadbeat* escapement the face of each pallet where the tooth comes to rest, the *locking face*, is cut as an arc of a circle centred on the pallet arbor. As the pendulum swings on, the arc slides past the tooth tip without pushing it either way, and the wheel stays dead still: hence the name. Only on a separate, inclined *impulse face* near the end of each pallet does the tooth push the pendulum, and only for a short arc near the bottom of the swing. Graham’s escapement, with his mercury-compensated pendulum of the 1720s, became the standard for precision regulators and observatory clocks for nearly two centuries. It is the escapement drawn here.',
        },
        { type: 'h', text: 'Harrison and the longitude' },
        {
          type: 'p',
          text: 'A pendulum cannot keep time on a rolling ship, and that was the great clock problem of the eighteenth century. A navigator can find local time from the Sun; if a clock aboard also keeps the time of the home port, the difference between the two is the ship’s longitude, at fifteen degrees per hour. In 1714 the British Parliament offered up to £20,000 for a method good to half a degree. John Harrison, a carpenter and self-taught clockmaker from Lincolnshire, spent most of his life on the problem. His first three sea clocks, H1 to H3, built between about 1730 and 1759, were large brass machines with linked balances, regulated in H1 by his low-friction *grasshopper* escapement. His fourth, H4, finished in 1759, was a large watch about 13 cm across. On a voyage to Jamaica in 1761–62 it is reported to have lost only about five seconds in 81 days. The Board of Longitude was slow to pay, and Harrison received most of his reward only in 1773, from Parliament, after an appeal to George III.',
        },
        {
          type: 'aside',
          title: 'Why the escapement matters',
          text: 'A pendulum’s period depends a little on its amplitude (circular error), so a clock keeps steady time only if each swing has the same amplitude, and only if the escapement’s pushes do not themselves change the period. In 1826 George Biddell Airy showed that an impulse given symmetrically about the bottom of the swing changes the period not at all, while an impulse given before the bottom makes the clock gain and one given after makes it lose. That is why the deadbeat delivers its push in a short arc around the dead point.',
        },
      ],
    },
    {
      id: 'mechanism',
      kicker: 'The science',
      title: 'Lock, impulse, drop',
      blocks: [
        { type: 'h', text: 'The geometry' },
        {
          type: 'p',
          text: 'The escape wheel has 30 slender teeth leaning forward, tip radius $R = 26$ mm. The pallet arbor sits directly above the wheel’s centre at a distance $R\\sqrt{2}$, chosen so that lines from the arbor touch the tip circle at 45° either side of the line of centres. At those two tangent points a tooth tip moves straight towards the arbor (on the entry side) or straight away from it (on the exit side). The pallets are placed there, 90° apart, embracing 7½ teeth. The half tooth is essential: when one pallet holds a tooth, the other sits midway between two teeth on the far side, ready to catch the next.',
        },
        { type: 'figure', svg: tangentFigure, alt: 'The tangent construction: an escape wheel, the pallet arbor above it at root two times the radius, tangent lines at 45 degrees, and the locking faces as short arcs about the arbor.', caption: 'The tangent construction. Because each locking face is an arc about the arbor and meets a tooth moving radially, the tooth presses straight through the arbor and cannot turn the anchor.' },
        {
          type: 'p',
          text: 'Each pallet is a band between radii $R \\pm w/2$ about the arbor, here $w = 2.18$ mm. On the entry pallet the outer edge is the locking face; on the exit pallet it is the inner edge, because there the teeth arrive from inside. Each pallet ends in an inclined impulse face that spans the band. One beat, with the anchor angle $\\psi$ (the pendulum’s angle, through the crutch), runs like this:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Lock.** A tooth rests on the entry pallet’s locking face. The pendulum swings on to the end of its arc and back (the *supplementary arc*); the face slides past the tip and the wheel does not move.',
            '**Unlock and impulse.** At $\\psi = -0.5°$ the end of the locking face passes the tip. The tip runs onto the impulse face and, as the pendulum swings on through the bottom, slides down it, pushing the pallet ahead. The pendulum gets its energy; the wheel turns 4.8°.',
            '**Drop.** At $\\psi = +1.5°$ the tip leaves the end of the impulse face. The wheel, pulled by the weight, turns freely for 1.2° until a tooth on the other side lands on the exit pallet’s locking face. That landing is the tick.',
            '**And back.** The pendulum swings out and returns; at $\\psi = +0.5°$ the exit pallet unlocks, its impulse face pushes the pendulum the other way, and at $\\psi = -1.5°$ the wheel drops again onto the entry pallet: the tock.',
          ],
        },
        {
          type: 'p',
          text: 'The numbers close neatly. Each beat turns the wheel $4.8° + 1.2° = 6°$, half a tooth; two beats make one tooth, 12°; thirty teeth make a turn. The drop is not a design choice but a consequence: it is the half pitch less the wheel’s rotation during impulse. With a seconds pendulum ($T = 2$ s) there is one beat a second, 3,600 an hour, and the escape wheel turns once a minute, so the seconds hand sits on its arbor.',
        },
        { type: 'figure', svg: phaseFigure, alt: 'A sine curve of the anchor angle over time with a shaded band of plus or minus the lift; short impulse segments cross the band near the zero crossings, and drop marks follow them.', caption: 'The anchor angle through four beats. Impulse happens inside the lift band, near the bottom of each swing; the rest is lock.' },
        { type: 'h', text: 'The train and the dial' },
        {
          type: 'p',
          text: 'The escape arbor carries a pinion of 8 leaves, driven by a third wheel of 48; the third arbor’s pinion of 8 is driven by the centre wheel of 80. So the centre wheel turns once for every $\\frac{48}{8}\\cdot\\frac{80}{8} = 60$ turns of the escape wheel: once an hour. It carries the minute hand. A great wheel of 96 teeth on the weight’s barrel drives the centre pinion of 10, and the *motion work* (a cannon pinion of 12, a minute wheel of 36 with a pinion of 10, an hour wheel of 40) reduces by $\\frac{36}{12}\\cdot\\frac{40}{10} = 12$ to the hour hand. This is a regulator layout: seconds above, minutes from the centre, hours below, each hand on its own arbor so that none hides another.',
        },
        { type: 'h', text: 'Energy and the Q factor' },
        {
          type: 'p',
          text: 'Write the pendulum’s angle as $\\theta$ and its natural angular frequency as $\\omega_0 = \\sqrt{g/\\ell}$. With friction modelled as a drag proportional to speed, and the escapement as a torque $\\tau$ that acts only during impulse,',
        },
        { type: 'math', tex: '\\ddot{\\theta} = -\\omega_0^2 \\sin\\theta - \\frac{\\omega_0}{Q}\\,\\dot{\\theta} + \\tau(t)', label: '(1)' },
        {
          type: 'p',
          text: 'The *quality factor* $Q$ says how freely the pendulum swings: left to itself it loses a fraction $2\\pi/Q$ of its energy $E$ each period. With the swing’s energy $E \\approx \\tfrac{1}{2}\\omega_0^2\\theta_a^2$ (per unit moment of inertia) at amplitude $\\theta_a$, and an impulse of torque $\\tau$ acting through the impulse angle $I$ twice a period, the clock settles where gain equals loss:',
        },
        { type: 'math', tex: '2\\tau I = \\frac{2\\pi}{Q}\\cdot\\frac{1}{2}\\omega_0^2\\theta_a^2 \\quad\\Rightarrow\\quad \\theta_a = \\sqrt{\\frac{2 Q \\tau I}{\\pi\\,\\omega_0^2}}', label: '(2)' },
        {
          type: 'p',
          text: 'This balance is stable. Swing the pendulum wider and it loses more than it gains, so it decays back; swing it narrower and the impulses build it up. If it ever swings less than the lift, $\\pm 1.5°$ here, the escapement cannot complete a beat and the clock stops. A good regulator pendulum has a $Q$ in the thousands or tens of thousands, so the escapement need only touch it lightly; the free-pendulum clocks of the 1920s did better still. The higher the $Q$, the less the escapement matters, which is the deepest reason that a good pendulum makes a good clock.',
        },
        { type: 'h', text: 'Rating' },
        {
          type: 'p',
          text: 'A pendulum with a period of exactly 2 s would, by the small-angle formula, be $g/\\pi^2 = 993.96$ mm long. This clock’s pendulum is rated at 992.1 mm, nearly two millimetres shorter, for two reasons the model reproduces. At its running amplitude of about 3.1°, circular error ($T \\approx T_0(1 + \\theta_a^2/16)$) makes it lose about 17 seconds a day. And its impulses do not quite straddle the bottom of the swing: the entry impulse runs from $-0.5°$ to $+1.5°$, mostly after the dead point, so by Airy’s rule it loses, here about a minute a day. A clockmaker corrects both at once by turning the rating nut, which is what dragging the bob does. Near 1 m, a change $\\Delta\\ell$ changes the rate by about $-\\tfrac{1}{2}\\,\\Delta\\ell/\\ell$, or 43 seconds a day per millimetre.',
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'How the piece works',
      title: 'A pendulum, and a wheel that goes as far as it can',
      blocks: [
        {
          type: 'p',
          text: 'Escapement is one TypeScript module drawing on a canvas, with no images or libraries. Nothing in it is keyframed. The pendulum is integrated, the anchor turns with it, and the escape wheel goes wherever the pallets let it. Lock, impulse and drop are not programmed as phases; they emerge from geometry.',
        },
        { type: 'h', text: 'The pallets' },
        {
          type: 'p',
          text: 'The pallet corners are computed from the design numbers. For a radius $\\rho$ about the arbor, `tipCross` finds where the tooth-tip circle crosses that radius on the left or right, as an angle about the arbor; the corners are then placed so that the unlock and release happen at the chosen anchor angles.',
        },
        {
          type: 'code',
          code: `function tipCross(rho: number, side: number) {
  const y = (rho * rho - R_TIP * R_TIP + D_AW * D_AW) / (2 * D_AW)
  const x = side * Math.sqrt(Math.max(0, rho * rho - y * y))
  return Math.atan2(y, x)
}
const PSI_UE = -IMP / 2 + CC   // entry unlocks
const PSI_RE = IMP / 2 + CC    // entry releases (drop)
const PSI_UX = IMP / 2 - CC    // exit unlocks
const PSI_RX = -IMP / 2 - CC   // exit releases
const aC1 = tipCross(RO, -1) - PSI_UE
const aC2 = tipCross(RI, -1) - PSI_RE
const aC3 = tipCross(RI, 1) - PSI_UX
const aC4 = tipCross(RO, 1) - PSI_RX`,
          caption: 'Corner angles of the two impulse faces, in the anchor’s own frame. `IMP` is the impulse angle (2°), `CC` half the lock (0.5°).',
        },
        {
          type: 'p',
          text: 'A point is inside a pallet if it lies between the two radii and on the pallet’s side of the line through its impulse face: two comparisons and a cross product, exact and cheap. Only the tooth tips can touch the pallets, as in a real Graham escapement, so the test runs on the five tips nearest each pallet.',
        },
        { type: 'h', text: 'The wheel' },
        {
          type: 'p',
          text: 'The weight always pulls the wheel forward, so every substep the wheel tries to advance by as much as a fast, light wheel could (600° a second). If that would push a tip into a pallet, bisection finds the furthest angle that does not. During lock the answer is zero; during impulse the face retreats and the tip follows it; after release the wheel runs freely until the next tooth lands. If the anchor ever moves into a tip, the same search runs backwards, which is recoil, and in a deadbeat it hardly ever happens.',
        },
        {
          type: 'code',
          code: `function solveWheel(maxAdv: number) {
  if (blocked(tw)) {
    // the anchor moved into a tip: push the wheel back (recoil) just enough
    let lo = tw - 0.5 * DEG
    let hi = tw
    let k = 0
    while (blocked(lo) && k++ < 12) lo -= 0.5 * DEG
    if (blocked(lo)) return 0
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2
      if (blocked(mid)) hi = mid
      else lo = mid
    }
    const d = lo - tw
    tw = lo
    return d
  }
  const target = tw + maxAdv
  if (!blocked(target)) { tw = target; return maxAdv }
  let lo = tw
  let hi = target
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2
    if (blocked(mid)) hi = mid
    else lo = mid
  }
  const d = lo - tw
  tw = lo
  return d
}`,
          caption: 'The whole kinematic model of the escape wheel. Twenty-two halvings leave the tip within a millionth of a degree of the face.',
        },
        { type: 'h', text: 'The pendulum' },
        {
          type: 'p',
          text: 'Equation (1) is integrated with semi-implicit Euler in eight substeps a frame, about 480 a second, which is ample for a 2 s pendulum. After each step the wheel is solved, and the contact is classified by distance: a tip on a locking arc means lock, a tip on an impulse face means impulse (and the torque acts, in the direction of that pallet’s push), no contact means drop. A tick sounds when the wheel has just run freely and a tip comes to rest on a locking face. The period is measured from zero crossings of the pendulum, interpolated within the substep, so the beats-per-hour and rate readouts are the model’s own measurements, not the design values.',
        },
        {
          type: 'code',
          code: `const torque = !held && !stopped && !dragging && contactNow === 'impulse'
  ? (contactSide === 'E' ? 1 : -1) * TORQUE_K * ((Math.PI * w0 * w0 * AMP_EQ * AMP_EQ) / (2 * Q * IMP))
  : 0
let acc = -w0 * w0 * Math.sin(th) - (w0 / Q) * om + torque
om += acc * h
th += om * h
psi = th + BEAT_SET
const adv = solveWheel(wmax * h)
const c = classify()
if (adv > 0.25 * DEG) dropping = 1
if (c.ph === 'lock' && dropping && c.side !== lastLock) {
  // the tick: a tooth lands on a locking face
  tick(c.side === 'E')
  lastLock = c.side
}`,
          caption: 'One substep (trimmed). The torque is equation (2) solved for $\\tau$, with a small factor for the impulse the contact actually delivers.',
        },
        {
          type: 'p',
          text: '`BEAT_SET` is a few hundredths of a degree of crutch adjustment. Without it the model is slightly *out of beat*, with tick and tock 16 ms unequal, exactly as a real clock is until the clockmaker bends its crutch; the value was found by running the model and listening, in effect, for an even beat.',
        },
        { type: 'h', text: 'Drawing' },
        {
          type: 'p',
          text: 'Every part is drawn in millimetres under a canvas transform, so one set of paths serves the plate, the 4:1 detail and the exploded view. Wheels are built once as `Path2D` outlines, teeth and crossings together, filled with paper using the even-odd rule so the wheels behind show through the crossings, then stroked. The train is drawn from back to front with fainter ink for the deeper wheels. In the exploded view each part slides along its arbor in an oblique projection, by a depth level times 26 mm, with dashed guides along the arbors. The dial reads the viewer’s own time at the start and is then driven only by the escape wheel, through the train ratios, so stopping the pendulum stops the clock and shortening it makes the clock gain. The sound is a resonant burst of filtered noise and two short tones, a little lower for the tock.',
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
            '**The plate:** the movement seen from the front, its plates drawn in dashed phantom line as if made of glass, with four pillars. From the top: the suspension block and spring, the anchor, the escape wheel and the third wheel, the centre wheel, and the great wheel with the barrel and the weight’s cord.',
            '**The pendulum:** shown broken, as long parts are on engineering drawings: its true length is in the readouts. Below the bob is the rating nut and a beat scale marked in degrees.',
            '**Detail A (chapter II):** the escapement at four times the plate’s scale. Dashed arcs are the locking faces’ circles about the arbor; faint lines show the tangent construction. The dot marks where a tooth tip touches a pallet, coloured by phase: ocean for lock, moss for impulse, fern for the drop and its tick.',
            '**The parts (chapter III):** each part moved along its own arbor, with names and tooth counts.',
            '**Strip chart:** the anchor’s angle over the last seven seconds, coloured by phase, with the lift band shaded. In chapter IV the pendulum’s energy is drawn beneath it: a sawtooth that sags between impulses and steps up at each one.',
            '**Readouts:** beats per hour and the beat, both measured; the amplitude of the last swing; the rate in seconds per day against a perfect seconds pendulum; and the pendulum’s length.',
            '**Dial:** a regulator dial, seconds above, minutes at the centre, hours below, set to your time when the piece opened.',
          ],
        },
        {
          type: 'p',
          text: 'Worth watching for: in detail A, the moment after each tick when the wheel is perfectly still although the pendulum is still swinging; the seconds hand stepping, not sweeping; and, if you drag the bob to a wide swing, the amplitude decaying back to about 3° over a few dozen beats while the rate readout shows the circular error coming and going.',
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
            '**A very lossy pendulum.** $Q = 60$, so the escapement visibly matters and the energy sawtooth can be seen. A real regulator pendulum has a $Q$ hundreds of times higher, its amplitude barely changes from beat to beat, and it would take minutes to recover from a push rather than seconds.',
            '**A simple impulse.** The push is a constant torque while a tip is on an impulse face. In a real clock it is the weight’s torque passed through the train, less the friction of every pivot and mesh, and it varies along the face.',
            '**No friction on the locking faces.** A real deadbeat’s locking faces rub on the teeth during the supplementary arc, which is why they are polished, oiled and often jewelled.',
            '**A weightless wheel.** The escape wheel accelerates instantly, so the drop takes about two milliseconds. A real wheel has inertia and the drop takes a little longer.',
            '**Proportions.** The pendulum is drawn broken and the bob is drawn near the movement; the beat scale shows true degrees on the drawn length. The gear teeth are rounded clock teeth, not exact cycloidal profiles, and the motion work appears only in the exploded view.',
            '**The rated length** of 992.1 mm belongs to this model’s pallets and amplitude. A different escapement, or the same one at another amplitude, would need another.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Britten’s Watch and Clockmaker’s Handbook, Dictionary and Guide', by: 'F. J. Britten', note: 'Many editions since 1878. The classic workshop reference, including the escapements drawn here.' },
    { title: 'Clock and Watch Escapements', by: 'W. J. Gazeley', year: '1956', note: 'How escapements are laid out, the Graham deadbeat among them.' },
    { title: 'My Own Right Time', by: 'Philip Woodward', year: '1995', note: 'Oxford University Press. A physicist designs a precision pendulum clock: Q, impulse and circular error.' },
    { title: 'On the disturbances of pendulums and balances, and on the theory of escapements', by: 'George Biddell Airy', year: '1830', note: '*Transactions of the Cambridge Philosophical Society* 3. Why the impulse should straddle the bottom of the swing.' },
    { title: 'The Marine Chronometer: Its History and Development', by: 'Rupert T. Gould', year: '1923', note: 'The standard history, with Harrison’s timekeepers described in detail.' },
    { title: 'The Quest for Longitude', by: 'William J. H. Andrewes (ed.)', year: '1996', note: 'Proceedings of the 1993 Longitude Symposium at Harvard.' },
    { title: 'Longitude', by: 'Dava Sobel', year: '1995', note: 'A short, popular account of Harrison and the longitude prize.' },
  ],
}

export default guide
