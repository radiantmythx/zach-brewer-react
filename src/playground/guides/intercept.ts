import type { Guide } from '../guide'

/*
 * Notes for G.07 Intercept, after Missile Command (Atari, 1980).
 */

const blastFigure = `<svg viewBox="0 0 320 170" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, monospace" font-size="9">
<path d="M30 20 L30 140 L300 140"/>
<path d="M26 24 L30 18 L34 24 M294 136 L300 140 L294 144"/>
<path d="M30 140 C 44 70, 60 44, 92 40 L156 40 C 200 40, 240 60, 290 140" stroke="#3F7A55"/>
<path d="M92 34 L92 146 M156 34 L156 146" stroke-dasharray="1 3" opacity="0.6"/>
<path d="M30 40 L92 40" stroke-dasharray="2 3" opacity="0.5"/>
<text x="36" y="14" fill="currentColor" stroke="none">RADIUS</text>
<text x="262" y="158" fill="currentColor" stroke="none">TIME</text>
<text x="40" y="160" fill="currentColor" stroke="none">0</text>
<text x="80" y="160" fill="currentColor" stroke="none">0.35 s</text>
<text x="142" y="160" fill="currentColor" stroke="none">0.68 s</text>
<text x="268" y="132" fill="currentColor" stroke="none">1.35 s</text>
<text x="104" y="32" fill="#3F7A55" stroke="none">HOLD · 25 UNITS</text>
<text x="38" y="96" fill="currentColor" stroke="none" opacity="0.8">GROW</text>
<text x="206" y="80" fill="currentColor" stroke="none" opacity="0.8">SHRINK</text>
</svg>`

const guide: Guide = {
  lede: 'Six small skylines, three batteries, and a sky full of falling lines. The original made the player the last line of a defense that could not hold forever; this study draws it as a technical plate and keeps its best idea, that one well-placed blast can set off the next.',
  facts: [
    ['After', 'Missile Command · Atari, 1980'],
    ['Original design', 'Dave Theurer, with Rich Adam'],
    ['Original control', 'Trackball and three fire buttons'],
    ['Defenses', '6 cities, 3 bases, 10 interceptors each'],
    ['Blast', 'Grows 0.35 s, holds, shrinks; 1.35 s in all'],
    ['Scoring', '25 a warhead × wave multiplier, up to 6×'],
    ['Bonus', '5 per round left, 100 per city; a city every 10,000'],
    ['Threats', 'Warheads; splitting warheads from wave 2'],
    ['Bot', 'Earliest impact first, iterated lead'],
  ],
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'A game you cannot win',
      blocks: [
        {
          type: 'p',
          text: 'Atari released *Missile Command* in 1980. Dave Theurer designed and programmed it, with Rich Adam, and it reached arcades at a time when the threat of nuclear war was an ordinary part of the news. Its premise is stark: missiles fall toward six cities, and you have three bases of anti-ballistic missiles to stop them. You don’t aim the interceptors at the warheads directly. You choose a point in the sky, an interceptor flies there and explodes, and the expanding fireball destroys whatever flies into it.',
        },
        {
          type: 'p',
          text: 'The game had no victory condition. Waves came faster, and eventually every city fell. When the last one went, the screen filled with a great explosion and the words THE END. Most arcade games of the period had a “game over”; this one had an ending, and the difference is the point. Theurer has described having nightmares about nuclear war while he made it. The game is often remembered as one of the first coin-ops with something to say.',
        },
        {
          type: 'p',
          text: 'It also had one of the best controls of its era: a trackball. You rolled it with your palm to sweep a crosshair across the screen, much faster and more precisely than any joystick, and pressed one of three buttons to fire from the left, center or right base. Choosing which base to fire from was part of the skill. The center base’s missiles flew faster, the side bases covered their own flanks, and a base that ran out of ammunition, or was destroyed, left a gap the enemy would find.',
        },
        {
          type: 'p',
          text: 'Unlike the vector games around it, *Missile Command* used a color raster display, and its explosions cycled through bright colors as they grew and shrank. The enemy grew more varied as waves went on: missiles that split into several in mid-flight, bombers and satellites crossing the sky and releasing their own warheads, and “smart bombs” that could dodge your explosions. This study keeps the warheads and the splitting warheads, and leaves the rest out.',
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Choose a point; the blast does the rest',
      blocks: [
        {
          type: 'p',
          text: 'Warheads appear at the top of the sky in salvos and fall in straight lines toward the cities and the bases. Click or tap anywhere in the sky: the nearest base that still has rounds fires an interceptor along a dashed path to that point, marked with a small cross. When it arrives it detonates into a hatched circle that grows for a third of a second, holds, then shrinks away over about the same again. Any warhead inside the circle at any moment is destroyed, and its own smaller blast can catch others. A chain of these is worth more with every link.',
        },
        {
          type: 'list',
          items: [
            '**Bases.** Three mounds, each with ten rounds, drawn as a small pyramid of arrows that empties as you fire. The middle base’s interceptors fly at 450 units a second, the side bases’ at 330. A base hit by a warhead is out for the rest of the wave and loses its remaining rounds.',
            '**Cities.** Six skylines. A city hit by a warhead falls to rubble and smoke. It stays down until you earn a bonus city.',
            '**Waves.** The first wave has twelve warheads; each later wave adds two, up to thirty-six, and they fall faster. From wave 2, some warheads are splitters, drawn as small diamonds, which break into two or three warheads partway down the sky, each aimed at a different target.',
            '**End of wave.** When the sky is clear, a tally counts your remaining rounds and surviving cities. Then the bases are rebuilt and restocked, and the next wave begins with arrows over each living city: DEFEND CITIES.',
            '**The end.** When no city survives, a great hatched bloom fills the middle of the sky and the game prints THE END.',
          ],
        },
        {
          type: 'table',
          head: ['Event', 'Points'],
          rows: [
            ['Warhead destroyed', '25 × multiplier'],
            ['Chain bonus, n-th link of a chain', '25 × multiplier × (n − 1)'],
            ['Round left at end of wave', '5 × multiplier'],
            ['City standing at end of wave', '100 × multiplier'],
            ['Bonus city', 'every 10,000 points'],
          ],
          caption: 'The multiplier is 1× for waves 1 and 2, 2× for waves 3 and 4, and so on up to 6× from wave 11. The base values and the tally follow the original; the chain bonus is this piece’s own.',
        },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Why the blast is a circle in time',
      blocks: [
        {
          type: 'p',
          text: 'The central mechanic is that you don’t shoot a target; you place an area of denial in space for a short stretch of time. That turns aiming into a small problem in prediction. If a warhead is falling at speed $v$ and your interceptor needs time $t_f$ to reach a point, you have to choose the point the warhead will occupy $t_f$ seconds from now, or slightly beyond it, so it flies into the blast while it is at full size.',
        },
        {
          type: 'p',
          text: 'The blast’s radius follows a fixed curve over its 1.35 seconds of life: a fast ease-out to its full 25 units, a hold, and an ease-in shrink. Because it holds at full size for a third of a second, an interceptor that arrives a little early still works; one that arrives late doesn’t.',
        },
        { type: 'figure', svg: blastFigure, alt: 'A graph of blast radius against time: a quick rise to a plateau, a hold, then a slower fall to zero at 1.35 seconds.', caption: 'A player blast’s radius over its life. The wide plateau is what makes leading forgiving.' },
        {
          type: 'math',
          tex: 'r = R\\,(1 - (1 - \\frac{t}{0.35})^3) \\;\\; (t < 0.35), \\quad r = R \\;\\; (t < 0.675), \\quad r = R\\,(1 - (\\frac{t - 0.675}{0.675})^3) \\;\\; (t < 1.35)',
          label: '(1)',
          caption: 'With $R = 25$ units for a player blast and $19$ for the blast of a destroyed warhead. Touch taps get $R$ 15 percent larger, a bigger target for a thumb.',
        },
        {
          type: 'p',
          text: 'Chains follow from the geometry. Splitting warheads begin as a tight fan from a single point, so a blast placed just below the split catches one, whose own blast catches its neighbors, and so on. Each link in the chain plays the next note up a pentatonic scale, so a good chain sounds like a short rising phrase.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `// blasts: grow, catch, chain
for (const b of blasts) b.t += dt
const n0 = blasts.length
for (let i = 0; i < n0; i++) {
  const b = blasts[i]
  if (b.kind === 2 || b.t >= b.dur) continue
  const r = blastR(b) + 1.5
  for (const wh of warheads) {
    if (!wh.alive) continue
    const dx = wh.x - b.x
    const dy = wh.y - b.y
    if (dx * dx + dy * dy < r * r) {
      b.caught++
      destroyWarhead(wh, b.chain + 1)
    }
  }
}`,
          caption: 'From the simulation step in `games/intercept.ts`. Each destroyed warhead adds a new blast to the end of the list with a chain depth one greater. Only blasts that existed at the start of the step are checked, so a chain spreads one link per frame instead of all at once.',
        },
        {
          type: 'p',
          text: 'Ground impacts are blasts too, but of a third kind: they bloom as a dome over the ground line and destroy the city or base beneath them, not other warheads. The 1.5-unit allowance on each blast’s radius is a small kindness to the player: a warhead grazing the edge of the hatching counts.',
        },
      ],
    },
    {
      id: 'pacing',
      kicker: 'Pacing',
      title: 'How the waves build',
      blocks: [
        {
          type: 'p',
          text: 'Difficulty rises along several axes at once: more warheads, faster warheads, shorter gaps between salvos, and more splitters. The multiplier rises with them, so later waves are worth far more.',
        },
        {
          type: 'table',
          head: ['Wave', 'Warheads', 'Speed (u/s)', 'Gap between salvos', 'Splitter chance', 'Multiplier'],
          rows: [
            ['1', '12', '27', 'about 3.2 s', '—', '1×'],
            ['3', '16', '39', 'about 2.7 s', '29%', '2×'],
            ['5', '20', '51', 'about 2.2 s', '39%', '3×'],
            ['8', '26', '69', 'about 1.4 s', '50%', '4×'],
            ['12', '34', '93', 'about 1.1 s', '50%', '6×'],
          ],
          caption: 'Speeds are for a 480 × 360 field; gaps are averages, each one varied by up to 30 percent either way. Splitters break up between 20 and 44 percent of the way down the sky.',
        },
        {
          type: 'p',
          text: 'The numbers explain why leading becomes essential. An interceptor from the middle base reaches the middle of the sky, about 200 units away, in under half a second. In wave 1 a warhead falls about 13 units in that time, half a blast radius, so aiming straight at it mostly works. By wave 8 it falls about 30 units, more than the blast’s full radius, so a shot aimed at the warhead itself bursts behind it. You have to aim at where it will be.',
        },
        {
          type: 'math',
          tex: '\\text{lead} \\approx v_{w}\\,(\\frac{d}{s} + t_{g})',
          label: '(3)',
          caption: 'With $v_{w}$ the warhead’s speed, $d$ the distance from the firing base to the target point, $s$ the interceptor’s speed and $t_{g}$ the part of the blast’s growth you want behind you, about 0.1 s.',
        },
        { type: 'h', text: 'Sound' },
        {
          type: 'p',
          text: 'Sound is off until you turn it on, and quiet when it is on. A launch is a short sine rising an octave and a half, panned toward its base. A burst is a puff of band-passed noise under a triangle-wave note, and the note depends on the blast’s place in a chain, climbing a pentatonic scale from G: G, A, C, D, E, G, A, C and on. A lost city is a low noise and a falling sine. The tally ticks once for each round counted and plays a rising note for each city. A wave opens on a fifth, C to G, and THE END is a low minor chord.',
        },
      ],
    },
    {
      id: 'bot',
      kicker: 'The bot',
      title: 'Triage, then lead',
      blocks: [
        {
          type: 'p',
          text: 'The attract-mode commander thinks a few times a second, every 0.2 to 0.3 seconds, which is a fair human reaction rate. Its blue crosshair shows where it last aimed. It fires through the same function you do, so it is bound by the same rules: nearest base with ammunition, the same interceptor speeds, the same blasts.',
        },
        { type: 'h', text: 'Which warhead' },
        {
          type: 'list',
          ordered: true,
          items: [
            'Ignore any warhead already **covered**: one an interceptor in flight is aimed at, or one whose position 0.4 seconds from now falls inside a blast that is still near full size.',
            'Let trails **draw a while**: leave alone any warhead still in the top 30 percent of the sky with more than 3.2 seconds before it lands. This gives splitters a chance to split, which makes for better chains and a better show.',
            'Of what remains, take the one with the **earliest time to impact**, $(y_{ground} - y) / v_y$.',
            'Hold fire if **three interceptors** are already in the air.',
          ],
        },
        { type: 'h', text: 'Where to aim' },
        {
          type: 'p',
          text: 'Leading is a fixed-point iteration. Guess that the meeting point is where the warhead is now. Find the base that would answer a shot there and the flight time $t_f$ to that point. Move the guess to where the warhead will be after $t_f$ plus a tenth of a second (so the blast is already near full size when the warhead arrives), and repeat. Five rounds are plenty; the answer settles in two or three.',
        },
        { type: 'math', tex: '\\vec{p}_{k+1} = \\vec{x} + \\vec{v}\\,(\\frac{|\\vec{p}_k - \\vec{b}(\\vec{p}_k)|}{s(\\vec{p}_k)} + 0.1)', label: '(2)', caption: 'Warhead position $\\vec{x}$ and velocity $\\vec{v}$; $\\vec{b}(\\vec{p})$ is the base that would fire at $\\vec{p}$, and $s$ that base’s interceptor speed.' },
        {
          type: 'code',
          lang: 'ts',
          code: `for (let it = 0; it < 5; it++) {
  let bi = -1
  let bd = Infinity
  bases.forEach((b, i) => {
    if (!b.alive || b.ammo <= 0) return
    const d = Math.abs(b.x - px) * (i === 1 ? 0.8 : 1)
    if (d < bd) {
      bd = d
      bi = i
    }
  })
  if (bi < 0) return
  bx = bases[bi].x
  speed = (bi === 1 ? SPEED_MID : SPEED_SIDE) * (GY / 330)
  const flight = Math.hypot(px - bx, py - (GY - 16)) / speed + 0.1
  px = tgt.x + tgt.vx * flight
  py = tgt.y + tgt.vy * flight
}`,
          caption: 'The lead iteration from `botThink`. The middle base gets a slight preference in the nearest-base rule (distances to it count 80 percent), because its interceptors are faster.',
        },
        {
          type: 'p',
          text: 'Finally, the aim is jittered by a few units, more in later waves, a deliberately human hand. If the meeting point would be too close to the ground, the bot lets that warhead go and looks for one it can still save cleanly.',
        },
        {
          type: 'p',
          text: '**Blind spots.** The bot never fires speculatively into a crowded area hoping for a chain; it always targets one warhead at a time. It doesn’t choose bases strategically, so it can drain the middle battery early in a heavy wave. And with three interceptors as its limit, a dense salvo of fast warheads in the late waves eventually gets through. It usually holds every city until about wave 8 or 9, and the game ends a few waves later.',
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'Plate, sky and ground',
      blocks: [
        {
          type: 'p',
          text: 'The game runs the usual cycle of *attract*, *title*, *play* and *over*. Inside play, each wave moves through *intro* (about two seconds, with the wave number, multiplier and arrows over the cities), *fight*, *tally* and, eventually, *end*. The attract demo begins at wave 3 so that splitting warheads appear in the preview. A real game begins at wave 1.',
        },
        { type: 'h', text: 'Simulation' },
        {
          type: 'p',
          text: 'Everything moves in straight lines at constant speed, so the simulation is simple: warheads advance along their unit direction, interceptors along theirs, and blasts age. Salvos of two to five warheads are launched at intervals that shrink from about three seconds to one over the first nine waves. Each warhead picks a target: a city about two-thirds of the time (usually one still standing) and otherwise a base. Speeds start at 27 units a second and rise by 6 per wave to a ceiling of 94. On a tall screen the sky is taller, and all speeds scale with it, so the timing is the same at any aspect.',
        },
        {
          type: 'p',
          text: 'The tally is a little sequencer. After a pause, it removes one round from the piles every 55 ms with a soft tick and counts it in, then lights each surviving city in turn every third of a second with a rising note and a lift of its buildings, then holds the total for a moment before the next wave.',
        },
        { type: 'h', text: 'Drawing in linework' },
        {
          type: 'list',
          items: [
            '**Warheads** are straight hairline trails from launch to head, the head a tiny square (or a diamond for a splitter). A destroyed warhead’s trail fades out over half a second. Small open triangles in the hatched earth mark where each live warhead will land.',
            '**Interceptors** are dashed moss lines from the mound to a chevron head, with a small cross at the target.',
            '**Blasts** are circles clipped over fine parallel hatching that rotates slowly as the blast ages: moss for your blasts, ocean for the blasts of destroyed warheads, ink for ground impacts. A thin shock ring flashes outward when each one arrives. Overlapping blasts cross-hatch naturally.',
            '**Cities** are generated per index: five to seven rectangles of varied height, tallest near the middle, with an antenna on the tallest and a grid of tiny window dots, a few of them lit in lagoon. A fallen city becomes a jagged rubble line with short hatching and two wisps of smoke that rise and fade.',
            '**Bases** are hatched trapezoid mounds on the ground line, with their remaining rounds as a pyramid of small arrows and a two-digit count below. A destroyed base gets a crater notch.',
            '**The sky** carries an altitude ruler down its left edge, labeled in meters.',
          ],
        },
        {
          type: 'p',
          text: 'Each blast is drawn inside its own clip, which is the most expensive thing on screen. Even a large chain stays well under the frame budget, because each blast is only a circle, a few dozen hatch lines and a ring.',
        },
        { type: 'h', text: 'Teaching and affordances' },
        {
          type: 'p',
          text: 'The cursor becomes a crosshair over the sky. With a mouse, a faint dotted line runs from the base that would answer your click to the cursor, and small brackets mark that mound, so you can see which battery you are about to use. The first time you play in a given browser, a ghost shot rises from the middle base to a moving cross, with the words CLICK THE SKY TO FIRE, or TAP on a touch screen, until you fire. If two shots in a row catch nothing, AIM AHEAD OF THE TRAIL appears where the second one burst, at most three times a visit. A tap with every battery empty shows NO AMMO.',
        },
        { type: 'h', text: 'Any screen' },
        {
          type: 'p',
          text: 'The field is 480 × 360 on wide screens, 400 × 400 on square-ish ones and 360 × 580 on tall phones, where the sky gets taller and the skylines narrower. Cities are regenerated to the new width, and everything in flight is rescaled. On a wide, short screen the score and wave move into the side margins.',
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
            '**Aim ahead, not at.** Place the cross a little way down the warhead’s line, so it falls into the blast while the blast is at full size.',
            '**Catch splitters early.** A diamond that splits becomes two or three targets. Hit it high, or wait and catch the fan right below the split point, where the pieces are still close together.',
            '**Let chains work.** A blast that catches one warhead in a crowd often catches the rest. Don’t spend a second round where the first one is about to do the job.',
            '**Spend the side bases first.** The middle base is fastest and covers the most sky. Keep some of its rounds for the end of the wave.',
            '**Let lost causes go.** A warhead aimed at a city that has already fallen costs you nothing. Spend your rounds on the ones that matter.',
            '**Save rounds for the bonus.** Every round left at the end of a wave is worth five times the multiplier, and every city a hundred times.',
          ],
        },
        {
          type: 'aside',
          title: 'Liberties taken',
          text: 'There are no bombers, satellites or smart bombs, and a destroyed warhead’s own blast can set off chain reactions, which the piece rewards with a bonus of its own. Speeds, wave sizes and timings are tuned for a smaller field rather than copied, and touch taps get a slightly larger blast. The cities are not named.',
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '↑', '→', '↓'], action: 'Move the crosshair (I J K L also work)' },
      { keys: ['Space'], action: 'Fire from the nearest base (Z, X, Enter)' },
      { keys: ['A', 'S', 'D'], action: 'Fire from the left, middle or right base' },
      { keys: ['Enter'], action: 'Start or play again' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Tap or click the sky: the nearest base fires there' },
      { gesture: 'move', action: 'With a mouse, the line shows which base will fire' },
    ],
    tip: 'Aim a little ahead of a warhead, so it falls into the blast while the blast is at full size.',
  },
  pad: {
    dpad: ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'],
    right: [
      { label: 'Fire', code: 'Space', wide: true, aria: 'Fire from the nearest base, or start' },
      { label: 'Left', code: 'KeyA', aria: 'Fire from the left base' },
      { label: 'Mid', code: 'KeyS', aria: 'Fire from the middle base' },
      { label: 'Right', code: 'KeyD', aria: 'Fire from the right base' },
    ],
  },
  further: [
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001', note: 'Includes Atari’s coin-op years and *Missile Command*.' },
    { title: 'Replay: The History of Video Games', by: 'Tristan Donovan', year: '2010', note: 'On early games and their politics, including *Missile Command*.' },
    { title: 'Atari Inc.: Business Is Fun', by: 'Curt Vendel and Marty Goldberg', year: '2012' },
  ],
}

export default guide
