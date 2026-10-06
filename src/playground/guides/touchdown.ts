import type { Guide } from '../guide'

/*
 * Notes for G.06 Touchdown, after Lunar Lander (Atari, 1979).
 */

const profileFigure = `<svg viewBox="0 0 320 180" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, monospace" font-size="9">
<path d="M40 20 L40 150 L300 150"/>
<path d="M36 24 L40 18 L44 24 M294 146 L300 150 L294 154"/>
<path d="M40 136 C 70 104, 120 70, 290 34" stroke="#7FB6D9"/>
<path d="M40 136 L290 136" stroke-dasharray="2 3" opacity="0.6"/>
<path d="M40 92 L290 92" stroke-dasharray="1 4" opacity="0.5"/>
<path d="M118 64 L118 150" stroke-dasharray="1 3" opacity="0.5"/>
<circle cx="118" cy="72" r="2.5" fill="currentColor"/>
<text x="46" y="14" fill="currentColor" stroke="none">DESCENT RATE</text>
<text x="246" y="166" fill="currentColor" stroke="none">ALTITUDE</text>
<text x="200" y="130" fill="currentColor" stroke="none" opacity="0.8">TOUCHDOWN SPEED</text>
<text x="200" y="86" fill="currentColor" stroke="none" opacity="0.8">LANDING LIMIT</text>
<text x="124" y="66" fill="#7FB6D9" stroke="none">v = √(2ah) + v₀</text>
</svg>`

const guide: Guide = {
  lede: 'A small drawn lander over a topographic ridge, a tank of fuel, and gravity that never lets up. The original was a coin-operated lesson in restraint: every burn has to be paid for, and the safest landing is the one that wastes the least.',
  facts: [
    ['After', 'Lunar Lander · Atari, 1979'],
    ['Original credits', 'Rich Moore, Howard Delman'],
    ['Lineage', 'Jim Storer’s *Lunar* (1969), text-only'],
    ['Gravity', '9 u/s², read as 1.8 m/s² (the Moon’s is 1.62)'],
    ['Thrust', '22.5 u/s² at full throttle, 2.5 × gravity'],
    ['Landing limits', 'VS ≤ 2.4 m/s · HS ≤ 1.2 m/s · tilt ≤ 11°'],
    ['Pads', '×2, ×2, ×3, ×5, narrower pays more'],
    ['Fuel', '1,000 units; a crash costs 250'],
    ['Bot', 'Cascaded PD controller with a sigma-delta throttle'],
  ],
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'Ten years after Tranquility Base',
      blocks: [
        {
          type: 'p',
          text: 'Atari’s *Lunar Lander* came out in 1979, ten years after Apollo 11. It is usually credited to Rich Moore and Howard Delman, and it was the first Atari coin-op to draw with vector graphics: an electron beam traced the jagged lunar horizon, the stars and the little spidery lander as bright lines on a dark tube. You controlled the descent with a real thrust lever, not a button, plus two buttons to rotate and one to abort.',
        },
        {
          type: 'p',
          text: 'The idea was older than the arcade. In 1969, the summer of the first landing, a high-school student named Jim Storer wrote *Lunar*, a text game for the PDP-8 minicomputer. Each turn the program printed your altitude, speed and fuel, and you typed how much fuel to burn in the next ten seconds. It was a pure physics problem played as a game: burn too much early and you run dry; burn too little and you meet the Moon at speed. Versions of it spread through schools and computer clubs, were translated into BASIC, and appeared in the type-in collections that taught a generation to program. A graphical *Moonlander* followed in 1973 for Digital Equipment’s GT40 display terminal. Atari’s game is a descendant of both.',
        },
        {
          type: 'p',
          text: 'What the arcade version added was presence. The camera closed in as you got near the surface, so the last few seconds were played in close-up, the pad filling the screen. The landing pads were marked with multipliers: wide pads were safe and paid a little, narrow ones on awkward peaks paid several times more. And fuel was what the coin bought, so the game measured skill in the most literal currency. A careful pilot could make one coin last a long time.',
        },
        {
          type: 'p',
          text: '*Lunar Lander* sold modestly by the standards that came soon after, partly because the next game on the same vector hardware was *Asteroids*, and Atari moved production over to it. But its shape has never gone away. Gravity, a limited resource and a soft target is one of the most reused ideas in games, from the text programs of the 1970s to the rocket-landing toys of today.',
        },
        {
          type: 'aside',
          title: 'The real thing',
          text: 'On July 20, 1969, Neil Armstrong took semi-manual control of the Apollo 11 lunar module in the final minutes of the descent and flew it past a boulder field to a clear spot, with the crew watching the fuel gauge. The module’s descent engine could be throttled, and the last stretch was flown by hand. A game about a lever, a fuel gauge and a few seconds of judgement was not an abstraction to people who had watched that on television.',
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Land level, land slow, land on a pad',
      blocks: [
        {
          type: 'p',
          text: 'Each round begins with the lander high over a new stretch of terrain, already moving sideways. You rotate it and fire its engine. Gravity pulls it down at a constant rate. The engine pushes along the lander’s axis, so tilting turns part of the thrust into sideways force: lean into your drift to cancel it, lean away to build it. The terrain wraps, so flying off one side brings you back on the other.',
        },
        {
          type: 'p',
          text: 'A landing counts if, at the moment either foot touches the ground, both feet are over the same flat pad and you are within all three limits at once.',
        },
        {
          type: 'table',
          head: ['Quantity', 'Limit', 'In playfield units'],
          rows: [
            ['Vertical speed (VS)', '2.4 m/s', '12 u/s'],
            ['Horizontal speed (HS)', '1.2 m/s', '6 u/s'],
            ['Tilt (ATT)', '11°', '0.2 rad'],
          ],
          caption: 'The readouts turn sage green when a value is inside its limit.',
        },
        {
          type: 'table',
          head: ['Result', 'Condition', 'Points', 'Fuel'],
          rows: [
            ['Perfect landing', 'VS < 0.9 m/s, HS < 0.5 m/s, tilt < 4°', '100 × pad', '+50'],
            ['Good landing', 'within the limits', '50 × pad', '—'],
            ['Hard landing', 'VS above 1.7 m/s but within the limit', '25 × pad', '—'],
            ['Crash', 'anything else, or the hull touching ground', '5', '−250'],
          ],
        },
        {
          type: 'p',
          text: 'Each round has four pads, one in each quarter of the terrain: two at ×2, one at ×3 and one at ×5, in a shuffled order. The ×5 pad is 22 units wide for a lander whose feet sit 18.4 units apart: less than two units to spare on each side, plus a little forgiveness at the edges. The fuel tank starts at 1,000 units and carries over from round to round. Full throttle burns 30 units a second and rotating burns a little. When a round ends with the tank empty, the game is over. There are no lives; fuel is the life.',
        },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Why it feels the way it does',
      blocks: [
        {
          type: 'p',
          text: 'The physics are simple and unforgiving. With the engine off, the vertical speed grows by the gravitational acceleration every second. With it on, the net acceleration along the lander’s axis is the engine’s minus gravity’s component along that axis. In this piece’s units, with heading angle $\\theta$ measured from upright and throttle $u \\in [0, 1]$:',
        },
        { type: 'math', tex: '\\dot{v}_x = u\\,T\\sin\\theta, \\quad \\dot{v}_y = g - u\\,T\\cos\\theta', label: '(1)' },
        {
          type: 'p',
          text: 'Here $y$ points down the screen, $g = 9$ u/s² and $T = 22.5$ u/s². At full throttle and upright, the lander slows its fall at $T - g = 13.5$ u/s². Tilted by 60°, the vertical component of thrust is exactly half, $11.25$, barely more than gravity, which is why a hard sideways correction close to the ground so often ends in a crash. You can’t steer and brake at full strength at the same time.',
        },
        {
          type: 'p',
          text: 'The famous zoom is a camera trick, not extra simulation. The world is the same; it is just drawn larger. It matters because the landing limits are small compared with the whole screen. At full view, a speed of 2 m/s is a few pixels of movement per second, which is hard to judge. Up close the same speed is obvious. The zoom moves the player’s attention to the only part that matters, at the moment it starts to matter.',
        },
        {
          type: 'p',
          text: 'The original’s thrust lever was continuous. Here thrust is a key, so it ramps instead: the throttle approaches full in about a tenth of a second when you press and falls away a little more slowly when you let go. That keeps short taps gentle and long holds firm, and it is what lets the bot hold an average throttle with nothing but an on/off key.',
        },
      ],
    },
    {
      id: 'bot',
      kicker: 'The bot',
      title: 'A pilot made of two loops',
      blocks: [
        {
          type: 'p',
          text: 'In the preview and behind the title card, a controller flies the lander using the same two inputs as you: rotate and thrust. It lands every round, usually in ten to twelve seconds of flight, and it is a fair example of how real guidance systems are often built: as nested feedback loops, each simple on its own.',
        },
        { type: 'h', text: 'Choosing a pad' },
        {
          type: 'p',
          text: 'At the start of a round the bot scores each pad as $m^{0.7} / (1 + |dx|/110)$, where $m$ is the multiplier and $|dx|$ the horizontal distance across the wrapped terrain. Pads in the direction it is already moving get full weight, pads behind it less than half, and the ×5 pad is discounted a little, and heavily once fuel runs low. A small random factor, seeded by the round, varies its choices.',
        },
        { type: 'h', text: 'The outer loop: where to go, how fast' },
        {
          type: 'p',
          text: 'The bot turns its position into a desired velocity. Sideways, it uses a braking profile: the speed from which it could still stop at the pad with a comfortable deceleration, the familiar $v = \\sqrt{2ad}$, capped at 40 u/s and blended into a gentle linear approach for the last few units. Vertically there are two regimes. While it isn’t yet over the pad, it holds a safe clearance over the highest terrain between itself and the pad, descending when it is far above that ridge and climbing when it is too close. Once its feet are inside the pad’s margins, it switches to a constant-deceleration descent:',
        },
        { type: 'math', tex: 'v_{des} = \\sqrt{2a\\,(h - h_0)} + v_0', label: '(2)', caption: 'Desired fall rate at height $h$ above the pad: $a$ is a deceleration budget (5.5 u/s²), $h_0$ a small flare height, and $v_0$ the touchdown speed, chosen each round between 1.8 and 5.2 u/s.' },
        { type: 'figure', svg: profileFigure, alt: 'A graph of desired descent rate against altitude: a square-root curve that flattens to a small touchdown speed, well under the landing limit.', caption: 'The descent profile. Far above the pad the bot falls fast; the curve brings it to its touchdown speed just before contact.' },
        { type: 'h', text: 'The inner loop: which way to point, how hard to push' },
        {
          type: 'p',
          text: 'Velocity errors become a desired acceleration, $\\vec{a}_{des} = k(\\vec{v}_{des} - \\vec{v})$. Subtracting gravity gives the thrust vector the engine would have to supply, $\\vec{T}_{des} = \\vec{a}_{des} - \\vec{g}$, and its direction is the attitude to hold, clamped to a sensible tilt (about 49°, or 72° when far above the terrain) and forced level in the last few units. A proportional-derivative term turns the attitude error into a rotate command, and the projection of $\\vec{T}_{des}$ on the current heading becomes the throttle it wants.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `const ax = (vxDes - L.vx) * (adx < 14 ? 1.1 : 1.6)
const ay = (vyDes - L.vy) * (over && padAlt < 24 ? 3 : 2)
const Tx = ax
const Ty = ay - G
// even while it wants to fall faster, tilt to brake sideways
let aDes = Math.atan2(Tx, -Math.min(Ty, -2))
aDes = clamp(aDes, -tiltMax, tiltMax)
if (over && padAlt < 12) aDes = clamp(aDes, -0.05, 0.05)
if (over && padAlt < 3) aDes = 0
const err = angleDiff(L.a, aDes)
rotIn = Math.abs(err) < 0.006 ? 0 : clamp(err * 6 - L.va * 1.2, -1, 1)
const hx = Math.sin(L.a)
const hy = -Math.cos(L.a)
let need = clamp((Tx * hx + Ty * hy) / THRUST, 0, 1)
if (Math.abs(err) > 0.5) need *= 0.25
// sigma-delta: an on/off key whose duty cycle is the throttle we want
botAcc += need
if (botAcc >= 1) {
  thrustIn = true
  botAcc -= 1
}`,
          caption: 'The inner loop, from `botThink` in `games/touchdown.ts`.',
        },
        {
          type: 'p',
          text: 'The last four lines are the trick that lets a controller wanting “62 percent throttle” work through an on/off key. Each step it adds the wanted throttle to an accumulator and presses the key only when the accumulator passes one. Over a few steps the key is down 62 percent of the time, and the throttle ramp smooths that into a nearly steady burn. Audio converters use the same idea, under the name sigma-delta modulation. It also means the bot plays by the same rules as you: it can’t ask for a fractional throttle the keyboard can’t give.',
        },
        {
          type: 'p',
          text: '**Blind spots.** It plans in straight lines across the terrain, so a sharp peak just beside its path can still clip a leg. It never uses the zoom to its advantage; it sees the whole world all the time. And it lands carefully rather than efficiently, so its sessions last six or seven rounds where an expert could do better.',
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'Terrain, lander, camera',
      blocks: [
        { type: 'h', text: 'Rounds and states' },
        {
          type: 'p',
          text: 'The game runs the usual cycle of *attract*, *title*, *play* and *over*, and inside play each round moves through four phases: *intro* (the terrain draws itself on, about a second), *fly*, *landed* (the legs settle and the score is counted up, about four seconds) and *crashed* (the fragments tumble, about three and a half). The simulation runs in substeps of at most 10 ms, short enough for contact to be detected within a fraction of a unit.',
        },
        { type: 'h', text: 'Terrain as a survey' },
        {
          type: 'p',
          text: 'Each round’s ridge comes from seeded simplex noise. To make it wrap without a seam, the noise is sampled around a circle instead of along a line: the point at horizontal position $x$ reads the noise at $(\\cos\\phi, \\sin\\phi)$ for $\\phi = 2\\pi x / W$, so the two ends of the terrain are the same point. A broad, fractal component makes the mountains and a fine one makes them jagged. The four pads are then cut in as flat mesas at the height of the highest point under them.',
        },
        {
          type: 'p',
          text: 'Under the ridge are seven contour strokes, like strata on a geological section. Each is the ridge offset downward and smoothed with a wider moving average than the one above, so the lines relax from jagged to gentle as they go deeper. Their offsets grow (5, 11, 18 … 69 units) and their opacity falls. During the intro the ridge draws on from left to right and each stratum follows a beat behind the one above it.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `const raw = new Float32Array(CN + 1)
for (let i = 0; i <= CN; i++) raw[i] = groundY(i * CS)
const offs = [5, 11, 18, 27, 38, 52, 69]
contours = offs.map((off, k) => {
  const rad = 1 + k * 2
  const out = new Float32Array(CN + 1)
  for (let i = 0; i <= CN; i++) {
    let s = 0
    for (let j = -rad; j <= rad; j++) s += raw[mod(i + j, CN)]
    out[i] = s / (rad * 2 + 1) + off
  }
  return out
})`,
          caption: 'The strata, computed once per round: a box blur that widens with depth, wrapped at the ends.',
        },
        {
          type: 'p',
          text: 'Pads are drawn as heavier flat strokes with two small landing lights, a dimension line beneath with arrowheads and extension lines, and the multiplier set under it. The pad the bot has chosen, or the nearest one to you, is drawn in sage.',
        },
        { type: 'h', text: 'The lander' },
        {
          type: 'p',
          text: 'The lander is a list of line segments in its own frame: an ascent stage with a round window, an antenna and dish, a descent stage with cross-bracing, a nozzle bell, and two legs, each a main strut, a brace and a footpad. The same list is used for drawing and for the crash: when the hull or a foot meets the ground outside the limits, every segment becomes a fragment with its own velocity and spin, falling under gravity and bouncing off the terrain with most of its energy lost.',
        },
        {
          type: 'p',
          text: 'The legs are drawn from a compression value. On landing the body sinks onto them and rebounds, a damped spring settling to a slight squat, while the feet stay on the pad, so the struts visibly flex. Dust kicks out sideways from both feet. The plume is a stack of short horizontal strokes under the bell, wider and more numerous with throttle and jittered every frame. Small paired strokes at the cabin’s side show the attitude jets when you rotate.',
        },
        { type: 'h', text: 'Meters and units' },
        {
          type: 'p',
          text: 'The simulation runs in playfield units, 480 to the width of the terrain, and the readouts convert at 0.2 m per unit. That scale was chosen so the numbers read like a lunar descent: gravity of 9 u/s² becomes 1.8 m/s², close to the Moon’s 1.62, the starting altitude of about 220 units becomes some 45 m, and the landing limit of 12 u/s becomes 2.4 m/s. The lander itself is about 21 units across its feet, a little over 4 m.',
        },
        {
          type: 'p',
          text: 'The dotted arc ahead of the lander is the free-fall prediction, sampled every 0.16 s for about three seconds and cut off where it meets the ground:',
        },
        { type: 'math', tex: 'x(t) = x_0 + v_x t, \\quad y(t) = y_0 + v_y t + \\frac{1}{2} g t^2', label: '(3)' },
        {
          type: 'p',
          text: 'It ignores the engine on purpose. It answers the question a pilot most needs answered: if I do nothing, where do I land?',
        },
        { type: 'h', text: 'The cheapest landing' },
        {
          type: 'p',
          text: 'Hovering costs a steady 40 percent of full throttle, 12 units of fuel a second, so time spent hanging in the air is the most expensive thing you can do. The cheapest descent falls freely for as long as possible and then brakes once, as hard as the engine allows. With full thrust upright, the net deceleration is $T - g = 13.5$ u/s², so from a fall speed $v$ the last moment to start braking is at height',
        },
        { type: 'math', tex: 'h_{burn} = \\frac{v^2 - v_{td}^2}{2\\,(T - g)}', label: '(4)', caption: 'where $v_{td}$ is the speed you want at touchdown. Falling at 30 u/s, that is about 33 units, under 7 m.' },
        {
          type: 'p',
          text: 'That is the ideal, and like most ideals it leaves no margin: the throttle ramp, a small tilt or a slightly late press all eat into it. The bot flies a gentler version of the same idea, with a deceleration budget of 5.5 u/s² rather than 13.5. A typical landing uses 150 to 250 units of fuel, so a full tank is worth four to six landings for a careful pilot.',
        },
        { type: 'h', text: 'The camera' },
        {
          type: 'p',
          text: 'Below about 13 m of altitude the camera eases in to 2.4× and follows the lander; above 20 m it eases back out. The gap between those two heights keeps it from flickering in and out. Line widths are divided by the zoom, so hairlines stay one pixel wide at any magnification. Because the world wraps, the terrain is drawn again on either side whenever the view crosses a seam.',
        },
        { type: 'h', text: 'Reading the drawing' },
        {
          type: 'list',
          items: [
            '**The instrument plate** (top left): altitude above the ground directly below, horizontal and vertical speed with direction arrows, tilt, and a hatched fuel bar with tick marks at tenths. On short screens it condenses to two lines; on wide, short ones it moves to the right-hand margin.',
            '**The blue arrow** on the lander is its velocity, labeled in m/s. **The dotted arc** ahead of it is where it would fall if you cut the engine now.',
            '**The dashed sage line** to the ground, when zoomed, is a dimension of the remaining altitude.',
            '**Earth** hangs in the corner, its night side hatched.',
            '**The tally**: the result in italic serif, the readings at touchdown, then the points counted up with soft ticks. A crash prints the reason instead, such as `VS 3.1 m/s > LIMIT 2.4`, and the fuel lost.',
          ],
        },
        { type: 'h', text: 'Teaching in the moment' },
        {
          type: 'p',
          text: 'The first time you fly, a pulsing dashed plume under the lander says HOLD THRUST until you have burned for half a second, then a dotted arc over the cabin says ROTATE TO STEER until you have turned. After that, advice appears only near the ground, above the lander: NO PAD BELOW, TOO FAST · THRUST, DRIFTING · LEAN AGAINST IT, LEVEL OUT, or a steady STEADY when everything is inside the limits. While you hold a third of the screen, the three zones are named along the bottom.',
        },
      ],
    },
    {
      id: 'playing',
      kicker: 'Playing well',
      title: 'Tips',
      blocks: [
        {
          type: 'list',
          items: [
            '**Kill the sideways speed first, high up.** Tilting costs vertical braking, and up high you can afford it. Arrive over the pad almost still, then come straight down.',
            '**Fall early, brake late, but not too late.** The cheapest descent is a long free fall followed by one firm burn. The arc ahead of the lander shows where the free fall would end.',
            '**Watch the readouts turn green.** VS, HS and ATT turn sage when they are inside the limits. Touch down only when all three are green.',
            '**Level out before contact.** The last two or three meters should be flown upright. A tilted touchdown on a narrow pad usually puts one foot off the edge.',
            '**The ×5 pads are on peaks.** They pay well, but the approach means clearing the ridge beside them and losing height fast in a small space.',
            '**A perfect landing refunds fuel.** Touch down below 0.9 m/s, nearly still and nearly level, and the tank gets 50 units back.',
          ],
        },
        {
          type: 'aside',
          title: 'Liberties taken',
          text: 'The numbers are game numbers. Gravity is close to the Moon’s when read in the piece’s scale, but the engine is far stronger than a real descent stage relative to its weight, there is no mass change as fuel burns, and rotation is instant power with no momentum of its own. The original’s analog lever is approximated by a ramped key. The terrain, pad layout and scoring are this piece’s own.',
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Rotate (A and D also work)' },
      { keys: ['↑', 'Space'], action: 'Thrust while held (W)' },
      { keys: ['Enter'], action: 'Start or fly again' },
    ],
    gestures: [
      { gesture: 'hold', action: 'Left or right third of the screen: rotate that way' },
      { gesture: 'hold', action: 'Middle third: thrust' },
    ],
    tip: 'Cancel your sideways drift while you are still high, then come straight down with the readouts green.',
  },
  pad: {
    left: [
      { label: '↺', code: 'ArrowLeft', aria: 'Rotate left' },
      { label: '↻', code: 'ArrowRight', aria: 'Rotate right' },
    ],
    right: [{ label: 'Thrust', code: 'Space', wide: true, aria: 'Thrust, or start' }],
  },
  further: [
    { title: 'Digital Apollo: Human and Machine in Spaceflight', by: 'David A. Mindell', year: '2008', note: 'How the Apollo landings divided the work between the guidance computer and the pilot, down to the last manual seconds.' },
    { title: 'Feedback Systems: An Introduction for Scientists and Engineers', by: 'Karl J. Åström and Richard M. Murray', year: '2008', note: 'The proportional-derivative control and cascaded loops behind the bot.' },
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001' },
    { title: 'Atari Inc.: Business Is Fun', by: 'Curt Vendel and Marty Goldberg', year: '2012', note: 'Atari’s coin-op division in the vector years.' },
  ],
}

export default guide
