import type { Guide } from '../guide'

const LOOKAHEAD_SVG = `<svg viewBox="0 0 320 150" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, monospace" font-size="8.5">
<path d="M10 20H310M10 60H310M10 100H310M10 140H310" stroke-opacity="0.35"/>
<rect x="30" y="68" width="90" height="24" rx="12" stroke="#3F7A55"/>
<rect x="70" y="68" width="90" height="24" rx="12" stroke="#3F7A55" stroke-dasharray="2 3" stroke-opacity="0.6"/>
<rect x="190" y="28" width="70" height="24" rx="12" stroke="#3F7A55"/>
<rect x="150" y="28" width="70" height="24" rx="12" stroke="#3F7A55" stroke-dasharray="2 3" stroke-opacity="0.6"/>
<path d="M118 80h30M152 80l-4-3M152 80l-4 3" stroke="#3F7A55" stroke-opacity="0.7"/>
<path d="M188 40h-26M158 40l4-3M158 40l4 3" stroke="#3F7A55" stroke-opacity="0.7"/>
<circle cx="100" cy="120" r="6"/>
<path d="M100 114 Q96 97 100 80 M100 80 Q118 70 124 80 M124 80 Q130 58 176 40" stroke="#2B6A93" stroke-dasharray="1.5 2.5"/>
<circle cx="100" cy="80" r="2.5" stroke="#2B6A93"/>
<circle cx="124" cy="80" r="2.5" stroke="#2B6A93"/>
<circle cx="176" cy="40" r="2.5" stroke="#2B6A93"/>
<text x="112" y="124" fill="currentColor" stroke="none">frog, t = 0</text>
<text x="18" y="104" fill="#3F7A55" stroke="none">log at t = 0 · dashed: t + 0.6 s</text>
<text x="226" y="64" fill="#3F7A55" stroke="none">← drifting left</text>
<text x="190" y="16" fill="#2B6A93" stroke="none">plan: up · right · up</text>
</svg>`

const guide: Guide = {
  lede: "Five lanes of traffic and a river of logs and diving turtles, drawn as a surveyor's section. Every lane is a pure function of time, so the demo frog can look ahead exactly and plan each hop against where the cars and logs will be.",
  facts: [
    ['After', 'Frogger · Konami, 1981'],
    ['Playfield', '13 × 13 tiles: verge, 5 road lanes, median, 5 river lanes, homes'],
    ['Lanes', 'Wrapping conveyors, each its own speed and direction'],
    ['Hop', '0.15 s: crouch, stretch, land; airborne for the first 55%'],
    ['Timer', '30 s per frog, drawn as a ruler that shortens'],
    ['Divers', '6 s cycle: 3.6 surfaced, 0.8 diving, 1.0 under, 0.6 rising'],
    ['Demo player', 'Depth-5 search over hops and waits, exact look-ahead'],
    ['Ground', 'Paper; ocean, lagoon, moss and fern by lane'],
  ],
  interact: {
    keys: [
      { keys: ['↑', '←', '→', '↓'], action: 'Hop one tile; hold to keep hopping' },
      { keys: ['W', 'A', 'S', 'D'], action: 'Hop' },
      { keys: ['Enter', 'Space'], action: 'Start, or play again' },
    ],
    gestures: [
      { gesture: 'swipe', action: 'Hop in the swipe direction' },
      { gesture: 'tap', action: 'Hop toward where you tap: above the frog to hop forward, beside it to hop sideways, below it to hop back' },
      { gesture: 'tap', action: 'Start from the title or game-over card' },
    ],
    tip: 'On the river, hop sideways along a log to line up with an empty bay, and watch the turtles: a group that starts to dissolve into a dashed outline is about to dive.',
  },
  pad: {
    dpad: ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'],
    right: [{ label: 'Start', code: 'Enter', aria: 'Start or play again', wide: true }],
  },
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'Konami, 1981',
      blocks: [
        {
          type: 'p',
          text: "*Frogger* came out of Konami in 1981, at the height of the arcade boom, and Sega distributed it in North America through Gremlin, its American arm. Its premise is as plain as a game premise can be: get a frog across a busy road and a fast river to its home on the far bank. There is nothing to shoot, no enemy that hunts you; the danger is a world going about its business, indifferent to the frog.",
        },
        {
          type: 'p',
          text: "That indifference is the design. The road is five lanes of traffic, each moving at its own steady speed in its own direction. The river is five lanes too, but now the moving objects are the only safe ground: logs and turtles that float past, carrying the frog with them. Halfway between sits a median strip where the frog can catch its breath. At the top are five homes set into a hedge; each frog that reaches an empty one stays there, and filling all five ends the round. Every frog has a short time limit, shown as a bar that runs down.",
        },
        {
          type: 'p',
          text: "The game became one of the era's best-known titles. It was ported widely, notably by Parker Brothers to the Atari 2600, and it found its way into popular culture; a 1998 episode of *Seinfeld*, \"The Frogger\", turns on George's attempt to push a working cabinet across a busy street. Its appeal is unusually broad: the rules can be explained in a sentence, it is not violent, and it rewards timing and patience more than reflexes.",
        },
        {
          type: 'aside',
          title: 'A frog, not a ship',
          text: "Like Pac-Man the year before, Frogger gave the player a small, vulnerable character in place of a vehicle. Its deaths are comic rather than violent, and its world is made of everyday things: cars, a truck, a tractor, logs, turtles. That gentleness is part of why it lasted.",
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Road, median, river, home',
      blocks: [
        {
          type: 'p',
          text: "The frog hops one tile at a time in four directions. On the road anything that touches it is fatal. In the river the water is fatal and the floating things are safe; while the frog sits on a log or a turtle it drifts with it, and if it is carried off the edge of the screen it is lost. Some turtle groups dive: they sink for a moment, and a frog standing on them goes down too. At the top, a hop into an empty home is safe, but a hop into the hedge, or into a home already taken, is not. Running out of time costs a frog as well.",
        },
        {
          type: 'p',
          text: "The original adds more hazards on later rounds than this piece does: crocodiles that float like logs but bite from the front, a crocodile that sometimes lurks in a home, snakes, otters, and a lady frog who can be escorted home for a bonus. Points come from forward progress, from each frog reaching home, and from filling all five homes, with bonuses for time left on the clock and for eating a fly that visits a home. This piece keeps that structure:",
        },
        {
          type: 'table',
          head: ['Event', 'Points'],
          rows: [
            ['A hop onto a row never reached before by this frog', '10'],
            ['A frog home', '50 + 10 per whole second left on the ruler'],
            ['A fly in that home', '+200'],
            ['All five homes', '+1,000, and the next level'],
          ],
          caption: 'Three frogs per game. Each new level speeds every lane up by 13 percent (to a cap of 1.75×), from the second level adds a vehicle to three road lanes and more divers, and from the third level shortens the logs.',
        },
        {
          type: 'p',
          text: "The level-one lanes, from the start verge upward. Speeds are in playfield units per second; a tile is 24 units, and the lane is 312 units wide.",
        },
        {
          type: 'table',
          head: ['Lane', 'What', 'Count', 'Speed', 'Accent'],
          rows: [
            ['L1', 'Sedans', '4', '30 ←', 'Ocean'],
            ['L2', 'Tractors', '4', '36 →', 'Moss'],
            ['L3', 'Coupés', '4', '50 ←', 'Lagoon'],
            ['L4', 'Racer', '2', '96 →', 'Fern'],
            ['L5', 'Trucks', '3', '38 ←', 'Graphite'],
            ['R1', 'Turtles, threes', '4 groups (1 dives)', '36 ←', 'Lagoon'],
            ['R2', 'Short logs', '4', '28 →', 'Moss'],
            ['R3', 'Long logs', '3', '58 →', 'Moss'],
            ['R4', 'Turtles, pairs', '5 groups (1 dives)', '44 ←', 'Lagoon'],
            ['R5', 'Medium logs', '4', '40 →', 'Moss'],
          ],
        },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Conveyor belts',
      blocks: [
        {
          type: 'p',
          text: "Underneath its scenery, the original is a stack of conveyor belts. Each lane is a row of objects with fixed spacing, moving at a constant speed and wrapping around when it leaves the screen, so a lane's whole future is determined by where it is now. Almost nothing in the world reacts to the frog. That is what makes the game learnable: the patterns repeat, the gaps arrive on schedule, and a player who watches a lane for a few seconds can predict it.",
        },
        {
          type: 'p',
          text: "The frog's vertical position is always one of the fixed rows, but its horizontal position is not: riding a log moves it continuously, so after a river crossing it may be anywhere along a row, and a home has to be entered from roughly in front of it. The diving turtles are on a cycle of their own, and later rounds put more of the river on that cycle, so the safe ground itself starts to come and go.",
        },
        {
          type: 'p',
          text: "This piece makes the conveyor structure explicit. A lane stores one number, its accumulated offset, and every object's position is a function of that offset and the object's place in a repeating pattern. The pattern's period is the lane width plus a margin of 150 units on each side, wide enough that even a long log is fully off-screen before it wraps.",
        },
        {
          type: 'math',
          tex: "x_i(t) = ((s_i + o_0 + v\\,t) \\;\\text{mod}\\; P) - 150, \\qquad P = 312 + 2 \\cdot 150",
          label: '(1)',
          caption: "$s_i$ is the object's slot in the pattern, $o_0$ the lane's starting offset, $v$ its speed and $P$ the period. A positive modulo keeps $x_i$ in range for either direction.",
        },
        {
          type: 'p',
          text: "The turtles' dive is a second clock, offset per group so the divers in a lane are out of step:",
        },
        {
          type: 'code',
          lang: 'ts',
          code: `/** 0 surfaced · 0–1 diving · 1 under · back up */
function diveLevel(o: Obj, lt: number) {
  if (o.dive < 0) return 0
  const p = mod(lt + o.dive, DIVE_CYCLE)
  if (p < 3.6) return 0
  if (p < 4.4) return (p - 3.6) / 0.8
  if (p < 5.4) return 1
  return 1 - (p - 5.4) / 0.6
}
function diveSafe(o: Obj, lt: number) {
  if (o.dive < 0) return true
  const p = mod(lt + o.dive, DIVE_CYCLE)
  return p < 4.2 || p > 5.65
}`,
          caption: "The drawing and the rules read the same clock. A turtle stays safe a little into its dive, while its outline is already breaking into dashes; that small grace is the warning.",
        },
      ],
    },
    {
      id: 'bot',
      kicker: 'The demo player',
      title: 'Looking ahead, exactly',
      blocks: [
        {
          type: 'p',
          text: "Because every lane is a function of time, the demo frog does not have to guess where anything will be. It can ask a precise question: *if I am at position x on row r, t seconds from now, am I safe?* That function, `safeAt`, is the heart of the bot, and the game's own collision test calls it too, with the time set to zero.",
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function safeAt(x: number, row: number, tf: number, m = 0) {
  if (x < 6 + m * 2 || x > LA - 6 - m * 2) return false
  if (row === START_ROW || row === MEDIAN) return true
  if (row === 0) {
    for (let k = 0; k < 5; k++) if (Math.abs(x - BAYS[k]) < BAY_TOL) return !homes[k]
    return false
  }
  const l = laneOf[row]
  if (!l) return true
  const off = l.off + l.v * tf
  if (!l.river) {
    for (const o of l.objs) {
      const x0 = objX(o, off)
      if (x + 6.5 + m > x0 + 2.5 && x - 6.5 - m < x0 + o.len - 2.5) return false
    }
    return true
  }
  for (const o of l.objs) {
    const x0 = objX(o, off)
    if (x > x0 - 2.5 + m && x < x0 + o.len + 2.5 - m && diveSafe(o, lt + tf + m * 0.08)) return true
  }
  return false
}`,
          caption: "On the road the frog's box (±6.5) must miss every vehicle's slightly shrunken box. On the river its center must be over something afloat. The bot passes a margin `m` of 4 units, a little daylight the real test does not demand.",
        },
        {
          type: 'p',
          text: "With that question available, planning is a search. From the frog's position the bot tries five actions (hop up, left, right or down, or wait 0.22 seconds) and recurses to a depth of five, about one second of future. A hop is only explored if the frog would be safe at its destination both mid-flight (60 percent of the way through the hop, when the game starts checking) and on landing. A wait on the river moves the frog with its log, and is checked halfway and at the end. Unsafe branches are pruned immediately, which keeps the tree far smaller than its worst case of 3,125 leaves.",
        },
        {
          type: 'p',
          text: "Each leaf is scored. Forward progress dominates: 12 points per row gained. Time costs 2 points per second, so faster plans win ties. On the river the frog pays 2.2 points per tile of distance from its chosen home, so it lines up while it still has logs to walk along. A frog drifting toward the edge pays a steep price once it is less than two seconds from being swept off. And a leaf earns up to 9 points for being somewhere that *stays* safe for another three quarters of a second, so the bot prefers to stop on solid footing rather than on a gap that is about to close.",
        },
        {
          type: 'math',
          tex: "V = 12\\,(12 - r) - 2\\,t - 2.2\\,\\frac{|x - x_{\\text{bay}}|}{24} - 14\\,\\max(0,\\, 2 - t_{\\text{edge}}) + 3\\,h",
          label: '(2)',
          caption: "$r$ is the row (12 at the start verge, 0 at the homes), $t$ the plan's elapsed time, $x_{\\text{bay}}$ the target home, $t_{\\text{edge}}$ the time before the current log carries the frog off, and $h \\in \\{0,1,2,3\\}$ the number of quarter-second checks it would survive by waiting. The alignment term applies only on the river; reaching a home adds 400.",
        },
        {
          type: 'figure',
          svg: LOOKAHEAD_SVG,
          caption: "The search evaluates hops against future lane positions: here the frog hops onto a log, walks right along it as it drifts, and hops up to where the next log will be, not where it is now.",
          alt: 'Two river lanes with logs drawn at their current positions and, dashed, where they will be shortly; a dotted path shows the frog hopping up, right, then up onto the future position of the upper log.',
        },
        {
          type: 'p',
          text: "The chosen home is the nearest empty one, with a strong preference for a home that has a fly in it. After each hop the bot pauses for a breath of 0.03 to 0.10 seconds, partly to look less mechanical and partly so the frog's idle animation, its blink and the pulse of its throat, can be seen. It replans after every hop, and every 0.08 seconds while it waits.",
        },
        {
          type: 'h',
          text: 'Blind spots',
        },
        {
          type: 'list',
          items: [
            "**One second of foresight.** A plan that is safe for a second can still lead somewhere with no way forward. The leaf's hold bonus and edge penalty patch over this, but a long log that drifts the frog into a corner can still catch it out.",
            "**Divers at the horizon.** A turtle group that dives just after the search horizon looks safe. Most of the bot's deaths are on the two turtle lanes.",
            "**No regret.** It never chooses to retreat a row to set up a better approach unless it is about to die; a careful human often does.",
          ],
        },
        {
          type: 'p',
          text: "In long runs it fills a level's five homes in about half a minute and usually reaches the third to sixth level before losing its last frog.",
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'A survey section, animated',
      blocks: [
        {
          type: 'h',
          text: 'The field',
        },
        {
          type: 'p',
          text: "The playfield is thirteen tiles of 24 units across and thirteen rows deep: the start verge, five road lanes, the median, five river lanes and the row of homes. Narrow gutters either side carry the surveyor's annotations. On the left each lane has an identifier (L1 to L5 for the road, R1 to R5 for the river, S, M and H for the verge, median and homes); on the right, a small arrow and number give each lane's direction and speed. Tick marks at every row boundary run down both gutters. Under the field the timer is a ruler with a tick per second and a long tick every five. The remaining time is a hatched bar whose end is marked with a hairline, and it turns ocean blue and blinks in the last eight seconds.",
        },
        {
          type: 'p',
          text: "Everything that never moves (the verges with their grass ticks, the kerbs and lane dividers, the hatched hedge with its five bays, the gutters and the ruler) is drawn once per size and level into an offscreen canvas aligned to the device-pixel grid, then copied each frame. The water's drifting wave lines, the lily pads, the traffic and the frog are drawn live.",
        },
        {
          type: 'h',
          text: 'Hatching without clipping',
        },
        {
          type: 'p',
          text: "Hatching, the closely spaced parallel strokes that stand in for tone in a technical drawing, is everywhere: on the hedge, on car roofs, on the timer bar, on the frog's back. Clipping a canvas path to a shape is expensive, so the piece computes each stroke's endpoints analytically instead. A 45° line $u + v = c$ crosses a $w \\times h$ rectangle between $u = \\max(0, c - h)$ and $u = \\min(w, c)$, so every hatch line is one `moveTo` and one `lineTo` with no clip. Only the hedge, with its five rounded bays cut out, uses an even-odd clip, and that is drawn once into the static layer.",
        },
        {
          type: 'h',
          text: 'The frog',
        },
        {
          type: 'p',
          text: "The frog is seen from above: an egg-shaped body broad at the back, two eyes that bulge past its outline, folded hind legs and planted front legs, with a patch of fern hatching on its back. The limbs are drawn as hollow tubes: each leg is stroked once wide in ink and again slightly narrower in paper, which leaves two parallel hairlines with rounded ends. Webbed toes fan out from each foot. The frog blinks every few seconds, its throat pulses while it waits, and it turns smoothly to face each hop.",
        },
        {
          type: 'p',
          text: "Each hop lasts 0.15 seconds and follows the animator's old sequence of anticipation, action and follow-through. For the first fifth the frog **crouches**: wider, shorter, still in place. Then it **leaps**: the body stretches along the hop and lifts, growing slightly as if nearer the eye, the hind legs kick out straight and the front legs tuck back, while a dashed shadow stays on the ground below. On landing it **squashes**, wider and flatter for a moment, and on the water a small ring spreads from the log. For the first 55 percent of the hop the frog counts as airborne and cannot be hit, a deliberate kindness to the player.",
        },
        {
          type: 'h',
          text: 'The traffic and the river',
        },
        {
          type: 'p',
          text: "Each vehicle is a top-down drawing about two-thirds of a lane wide: a paper body outlined in its lane's accent, small rectangles for the wheels, curved windscreen and rear-window lines, a hatched roof, headlights. The truck has a separate cab and a ribbed trailer; the tractor has big treaded rear wheels whose treads crawl, a blade across its front and a puff from its exhaust; the racer is slim, with wings fore and aft, a cockpit and streaming speed lines. Logs are capsules with four wavering lines of grain, a knot or two, growth rings on the cut end and two arcs on the far end. Turtles are shells with a hexagonal pattern, a head, and four flippers that paddle; when they dive their outlines break into dashes and fade, and when they are under only dashed ripples mark the spot.",
        },
        {
          type: 'h',
          text: 'States and deaths',
        },
        {
          type: 'p',
          text: "Like all the playground's games, the outer state runs attract, title, play and over, with the demo continuing behind the cards. Within a game the phases are **start** (the frog pops in at the verge and the level is announced), **play**, **home** (a short beat while the frog settles onto its lily pad), **dying** and **clear** (each home's pad rings in turn and the next level begins). Each death is drawn: on the road two skid streaks under a flattened outline with crossed-out eyes; in the water a crown of droplets and a settling ripple; for the hedge or the clock, a small starburst. The sounds are a hop note that climbs a pentatonic scale with each row the frog gains, a soft chord for each frog home, a splash or a thump for each death, and an arpeggio for a full row of homes.",
        },
        {
          type: 'h',
          text: 'Small screens',
        },
        {
          type: 'p',
          text: "On very short or very small frames, such as a phone held sideways or a portrait phone with the on-screen pad, the gutters and the ruler's labels would be too small to read, so the piece drops them, crops the field to the lanes, and moves the remaining time into the readouts beside the score. Prompts are drawn at a minimum size so they stay legible.",
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
            "**Stop on the median.** It is the only safe ground between the road and the river, and the clock is generous enough to let you watch the river for a moment.",
            "**Read a lane before you enter it.** Every lane repeats. Watch where its gaps fall and hop into the space just behind a vehicle, not just ahead of one.",
            "**Line up on the river.** Hop left and right along a log to stand in front of the home you want before the last lane. A home has to be entered nearly head-on.",
            "**Trust logs over turtles.** Logs never sink. A turtle group whose outline begins to break into dashes is about to dive; get off it.",
            "**Mind the edges.** A log will carry you off the side of the screen. If you are drifting toward an edge, hop against the current or move up.",
            "**Fill the far homes first.** The outer homes are the hardest to line up with when the river is fast; take them while the clock is fresh and leave the middle for last.",
            "**Flies are worth the detour.** A fly visiting an empty home is worth 200 points when you land there.",
          ],
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What differs from the arcade',
      blocks: [
        {
          type: 'list',
          items: [
            "There are no crocodiles, snakes, otters or lady frog; the hazards are traffic, water, the edges, the hedge, the clock and the diving turtles.",
            "The field is this piece's own, thirteen tiles square, and every hop is exactly one tile.",
            "The frog is airborne, and safe, for the first half of each hop; the original is stricter.",
            "Scoring follows the original's structure, but the time bonus and fly values here are this piece's own.",
            "Difficulty ramps continuously, level after level, by lane speed, density, diver count and log length, rather than through a fixed sequence of designed rounds.",
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001', note: 'The arcade industry of the early 1980s, including Konami and Sega.' },
    { title: 'The Illusion of Life: Disney Animation', by: 'Frank Thomas and Ollie Johnston', year: '1981', note: "The classic account of squash and stretch, anticipation and follow-through, the principles behind the frog's hop." },
    { title: 'Artificial Intelligence: A Modern Approach', by: 'Stuart Russell and Peter Norvig', year: '1995', note: 'Depth-limited search and heuristic evaluation, the two ideas the demo frog combines.' },
  ],
}

export default guide
