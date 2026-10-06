import type { Guide } from '../guide'

const CUBE_SVG = `<svg viewBox="0 0 320 170" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, monospace" font-size="8.5">
<path d="M160 50 L200 72 L160 94 L120 72 Z M120 72 L160 94 L160 134 L120 112 Z M160 94 L200 72 L200 112 L160 134 Z"/>
<path d="M126 75v40M132 78v40M139 82v40M146 86v40M153 90v40" stroke-opacity="0.45"/>
<path d="M160 102 L200 80M160 110 L200 88M160 118 L200 96M160 126 L200 104" stroke-opacity="0.32"/>
<path d="M128 72 L168 50M136 76 L176 54M144 81 L184 59M152 85 L192 63M168 50 L128 72" stroke="#3F7A55"/>
<path d="M152 50 L192 72M144 54 L184 76M136 59 L176 81M128 63 L168 85" stroke="#3F7A55"/>
<g stroke="#2B6A93" stroke-dasharray="2 2.5">
<path d="M170 60 Q190 30 218 34"/><path d="M150 60 Q130 30 102 34"/>
<path d="M176 76 Q214 70 236 104"/><path d="M144 76 Q106 70 84 104"/>
</g>
<text x="222" y="32" fill="#2B6A93" stroke="none">↗ (r−1, c)</text>
<text x="40" y="32" fill="#2B6A93" stroke="none">↖ (r−1, c−1)</text>
<text x="240" y="112" fill="#2B6A93" stroke="none">↘ (r+1, c+1)</text>
<text x="18" y="112" fill="#2B6A93" stroke="none">↙ (r+1, c)</text>
<text x="128" y="152" fill="currentColor" stroke="none">left face · right face</text>
<text x="214" y="58" fill="#3F7A55" stroke="none">top: target</text>
</svg>`

const guide: Guide = {
  lede: "Twenty-eight cubes drawn as an axonometric plate, each face told apart by the direction and density of its hatching. Hop a cube and its top changes; turn every top to the target while balls roll down and a coiled spring gives chase.",
  facts: [
    ['After', 'Q*bert · Gottlieb, 1982'],
    ['Original team', 'Warren Davis, Jeff Lee; sound by David Thiel'],
    ['Pyramid', '7 courses, 28 cubes, 4 diagonal moves per cube'],
    ['Rounds', 'One step · two steps · toggle · two steps, reverting'],
    ['Hop', '0.3 s parabola; crouch, stretch, squash'],
    ['Enemies', 'Balls, a coil ball that hatches a spring, a freeze ball'],
    ['Demo player', 'Threat sets over a 0.45 s window, BFS to unfinished tops'],
    ['Rendering', 'Analytic parallelogram hatching, no clipping'],
  ],
  interact: {
    keys: [
      { keys: ['↑'], action: 'Hop up and to the right' },
      { keys: ['→'], action: 'Hop down and to the right' },
      { keys: ['↓'], action: 'Hop down and to the left' },
      { keys: ['←'], action: 'Hop up and to the left' },
      { keys: ['Q', 'E', 'A', 'D'], action: 'Hop up-left, up-right, down-left, down-right (Z and C also work for the lower two, and numpad 7 9 1 3)' },
      { keys: ['Enter', 'Space'], action: 'Start, or play again' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Hop toward the quadrant you tap around the hero (upper right, lower right, lower left, upper left)' },
      { gesture: 'move', action: 'With a mouse, hovering shows which cube a click would hop to' },
      { gesture: 'tap', action: 'Start from the title or game-over card' },
    ],
    tip: "When the spring closes in, hop onto a spinning disc at the pyramid's edge: it carries you to the top, and the spring follows you over the side.",
  },
  pad: {
    left: [
      { label: '↖', code: 'KeyQ', aria: 'Hop up-left' },
      { label: '↙', code: 'KeyA', aria: 'Hop down-left' },
    ],
    right: [
      { label: '↗', code: 'KeyE', aria: 'Hop up-right' },
      { label: '↘', code: 'KeyD', aria: 'Hop down-right' },
      { label: 'Start', code: 'Enter', aria: 'Start or play again', wide: true },
    ],
  },
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'Gottlieb, 1982',
      blocks: [
        {
          type: 'p',
          text: "*Q*bert* was made at Gottlieb, a Chicago company far better known for pinball than for video games, and released in 1982. It was designed and programmed by **Warren Davis**, with art and the character by **Jeff Lee** and sound by **David Thiel**. Lee had drawn a pyramid of cubes in a style that recalls M. C. Escher's impossible architecture, and a round orange creature with a long tubular snout; Davis built a game around hopping from cube to cube, changing the color of each top as you land on it.",
        },
        {
          type: 'p',
          text: "Everything about it was a little odd, which is part of why it is remembered. The playfield is not a maze or a starfield but an isometric pyramid, so up and down on the screen are diagonals in the game. The joystick was mounted at 45 degrees in the cabinet so that its four directions matched those diagonals. When the hero is caught, a speech balloon pops up over its head reading *@!#?@!*, and the cabinet's speech synthesizer produces a burst of garbled syllables that sounds like swearing. When the hero jumps off the pyramid, a pinball-style knocker inside the cabinet thumps the woodwork. Gottlieb's pinball heritage is audible.",
        },
        {
          type: 'p',
          text: "The character was a hit beyond the arcade. Parker Brothers published home versions, Q*bert had a segment in CBS's *Saturday Supercade* cartoon, and it has kept turning up in later films and games about the arcade era. Among video games of its year it is one of the few whose hero is still recognized on sight.",
        },
        {
          type: 'aside',
          title: 'A puzzle disguised as an action game',
          text: "Most arcade games of 1982 asked the player to shoot or to run. Q*bert asks the player to *cover* a space, every cube exactly as many times as the round demands, while enemies make some routes impossible. Its later rounds, where a second hop undoes the first, turn it into something close to a graph puzzle.",
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Change every top',
      blocks: [
        {
          type: 'p',
          text: "The hero stands on the top of a cube and can hop to any of the four diagonal neighbors: up-right, up-left, down-right, down-left. Each landing changes the cube's top. A round is complete when every top shows the target state, drawn in the corner of the plate as a small swatch, the counterpart of the original's \"change to\" indicator. Hopping off the pyramid is fatal, except where a floating disc waits beside the edge: step onto it and it carries the hero up to the apex.",
        },
        {
          type: 'p',
          text: "How a top changes depends on the round, and the piece cycles through four rules, as the original's levels escalate in a similar way:",
        },
        {
          type: 'table',
          head: ['Course', 'Rule', 'Swatch'],
          rows: [
            ['1, 5, 9…', 'One landing turns a top to the target.', 'blank → target'],
            ['2, 6, 10…', 'Two landings: blank, then an intermediate state, then the target.', 'blank → half → target'],
            ['3, 7, 11…', 'Toggle: a landing flips a top between blank and target, so re-hopping undoes it.', 'blank ↔ target (↺)'],
            ['4, 8, 12…', 'Two steps, and landing on a finished top knocks it back to the intermediate state.', 'blank → half → target (↺)'],
          ],
          caption: 'Every fourth course the enemies speed up by 18 percent; within a cycle they gain 4 percent per course.',
        },
        {
          type: 'p',
          text: "The enemies drop in from above onto one of the two cubes of the second course. **Balls** (ocean) bounce straight down the pyramid, choosing left or right at random each hop, and fall off the bottom. A **coil ball** (lagoon) does the same until it reaches the bottom course, where it hatches into a **spring** that chases the hero. From the second course a **freeze ball** (fern) appears now and then; catching it stops every enemy for three and a half seconds. Touching a ball or the spring costs a life. The spring can be beaten: ride a disc while it is close, and it will follow the hero's path to the edge and leap off after it.",
        },
        {
          type: 'table',
          head: ['Event', 'Points'],
          rows: [
            ['A top reaches the target', '25'],
            ['A top reaches the intermediate state', '15'],
            ['Luring the spring off the pyramid', '500'],
            ['Catching the freeze ball', '100'],
            ['Completing a course', '1,000 + 250 per course after the first, + 50 per unused disc'],
          ],
          caption: 'Three lives. The 25 points per cube and the 500 for the spring follow the original; the course bonus is this piece\'s own.',
        },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'A pyramid is a graph',
      blocks: [
        {
          type: 'p',
          text: "Strip away the drawing and the pyramid is a small triangular graph. Number the courses (rows) from the top, $r = 0 \\ldots 6$, and the cubes in each course from the left, $c = 0 \\ldots r$. Then the four diagonal hops are four fixed offsets, and a hop leaves the pyramid exactly when it lands outside that triangle:",
        },
        {
          type: 'math',
          tex: "\\text{↗}\\; (r - 1,\\, c) \\qquad \\text{↘}\\; (r + 1,\\, c + 1) \\qquad \\text{↙}\\; (r + 1,\\, c) \\qquad \\text{↖}\\; (r - 1,\\, c - 1)",
          label: '(1)',
          caption: 'A cube $(r, c)$ is on the pyramid when $0 \\leq c \\leq r \\leq 6$.',
        },
        {
          type: 'p',
          text: "Drawing it is a matter of projecting that grid into isometric space. Each cube's top is a rhombus with half-width $a = 20$ and half-height $b = 11$ units; its two visible sides are $h = 20$ units tall. Cube $(r, c)$ has its top centered at",
        },
        {
          type: 'math',
          tex: "x = \\frac{W}{2} + (2c - r)\\,a, \\qquad y = y_0 + r\\,(b + h)",
          label: '(2)',
          caption: "so each course steps down by $b + h = 31$ units and half a cube sideways. A cube's down-right neighbor sits exactly under the bottom corner of its right face, which is what makes the stack read as solid.",
        },
        {
          type: 'figure',
          svg: CUBE_SVG,
          caption: "One cube and its four hops. Left faces carry dense vertical hatching, right faces sparse strokes parallel to the top edge, and a finished top is cross-hatched in the course's accent.",
          alt: 'An isometric cube with a cross-hatched top, vertically hatched left face and diagonally hatched right face, with four dotted arrows to its diagonal neighbors labeled with their row and column offsets.',
        },
        {
          type: 'p',
          text: "In the original, the enemies' movement is simple once it is laid out this way: balls only ever go down, choosing one of their two lower neighbors, so they can never threaten a cube above them. The spring is the only enemy that goes up, and it closes on the hero one hop at a time. The discs are the escape hatch from that pursuit: because the spring follows the hero's position, a hero who leaves by disc draws it to the edge, and its next hop takes it over the side.",
        },
        {
          type: 'p',
          text: "The piece's spring does the same with one rule. At each hop it looks at its legal neighbors (it never jumps off by choice) and takes the one whose top is nearest, on screen, to the hero's cube. While the hero rides a disc, the spring's target becomes the cube the hero jumped from; once it arrives there, it repeats the hero's last move, which carries it off the edge.",
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function coilyChoice(e: Hopper): number {
  // the spring chases the hero's cube (or the cube it left by disc)
  let [hr, hc] = heroOcc()
  if (lure) {
    hr = lure.r
    hc = lure.c
    if (e.r === lure.r && e.c === lure.c) return lure.m // follow it off the edge
  }
  const tx = cx(hr, hc)
  const ty = cy(hr)
  let best = 2
  let bd = Infinity
  for (let m = 0; m < 4; m++) {
    const nr = e.r + MR[m]
    const nc = e.c + MC[m]
    if (!onPyr(nr, nc)) continue
    const d = Math.hypot(cx(nr, nc) - tx, cy(nr) - ty)
    if (d < bd) {
      bd = d
      best = m
    }
  }
  return best
}`,
          caption: 'A greedy pursuer with one trick: it remembers where the hero left.',
        },
        {
          type: 'p',
          text: "The round rules are a small state machine on each top. The four rules above are one function:",
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function landTop(i: number) {
  const tg = target()
  const before = tops[i]
  if (mode === 0) tops[i] = 1
  else if (mode === 1) tops[i] = Math.min(2, tops[i] + 1)
  else if (mode === 2) tops[i] = tops[i] ? 0 : 1
  else tops[i] = tops[i] === 2 ? 1 : tops[i] + 1
  if (tops[i] !== before) {
    flash[i] = 1
    if (tops[i] === tg) score += 25
    else if (tops[i] > before) score += 15
  }
}`,
          caption: "States are 0 (blank), 1 (half) and 2 (target); in one-step and toggle rounds the target is 1.",
        },
      ],
    },
    {
      id: 'bot',
      kicker: 'The demo player',
      title: 'Threats, distances, and a disc',
      blocks: [
        {
          type: 'p',
          text: "Each time the hero lands, the demo player picks its next hop by scoring the four candidates. It begins by building a **threat set**: every cube an enemy might be standing on within the next 0.45 seconds, a little longer than one hop. For each enemy that means the cube it is on (or landing on), the cube it is leaving if it has only just jumped, the cube it is dropping onto if it is still falling in from above, and, if its next hop would start inside the window, every cube it could land on next. For a ball those are its two lower neighbors; for the spring, all four. While enemies are frozen, they threaten only where they stand.",
        },
        {
          type: 'p',
          text: "Then, for each of the four hops:",
        },
        {
          type: 'list',
          ordered: true,
          items: [
            "A hop **off the pyramid** is considered only if a disc is waiting there. It scores +40 when the spring is within three hops, since that both escapes it and lures it off, and −30 otherwise, so discs are not wasted.",
            "A hop onto a **threatened cube** is discarded.",
            "Otherwise the bot runs a breadth-first search from the landing cube, through unthreatened cubes, to the nearest top that is not yet finished. Its value is −3 per hop of that distance, so landing on an unfinished top scores 0, the best possible. In the toggle rounds a finished top costs three hops to cross, because crossing it undoes it, and landing on one costs a further 6.",
            "It adds 2.2 per cube-width of distance from the spring, up to three, so that among equally useful hops it drifts away from the pursuer, and +8 for landing on the freeze ball.",
            "A little seeded noise (up to 0.6) breaks ties, so the demo does not repeat itself exactly.",
          ],
        },
        {
          type: 'p',
          text: "If no hop is safe, the bot stays where it is for a moment and looks again. Between hops it pauses for 0.05 to 0.13 seconds, which gives the hero's idle bob and blink a chance to show.",
        },
        {
          type: 'h',
          text: 'Blind spots',
        },
        {
          type: 'list',
          items: [
            "**Half a second of foresight.** The threat window covers one hop. The bot will happily hop into a corner of the pyramid that the spring can seal two hops later, and corners are where it usually dies.",
            "**Greedy coverage.** Nearest-unfinished-first leaves stragglers, so the end of a round is a long walk to the last few tops, often through the spring's territory.",
            "**Discs only as a panic button.** A human might use a disc early to reset the spring to the top of the pyramid; the bot only reaches for one when the spring is already close.",
          ],
        },
        {
          type: 'p',
          text: "It typically clears the first course in about 25 seconds and reaches the third or fourth course before its last life, which is long enough to show every rule and every enemy.",
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'An axonometric plate',
      blocks: [
        {
          type: 'h',
          text: 'Hatching by interpolation',
        },
        {
          type: 'p',
          text: "Every face of every cube is a parallelogram, and that makes hatching cheap. Lines parallel to one edge of a parallelogram are simply copies of that edge, slid along the adjacent edge, so they never need clipping to the shape. Twenty-eight cubes with three faces each come to a few hundred strokes, drawn in three batched paths per frame:",
        },
        {
          type: 'code',
          lang: 'ts',
          code: `/** Strokes parallel to edge p0→p1, spaced along p0→p3, inside the parallelogram p0 p1 p2 p3. */
function hatchPara(x0: number, y0: number, x1: number, y1: number, x3: number, y3: number, n: number) {
  for (let i = 1; i < n; i++) {
    const k = i / n
    const ax = x0 + (x3 - x0) * k
    const ay = y0 + (y3 - y0) * k
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax + (x1 - x0), ay + (y1 - y0))
  }
}`,
          caption: 'The whole hatching engine. The left face gets six vertical strokes, the right face four strokes parallel to its top edge.',
        },
        {
          type: 'p',
          text: "The three faces are told apart the way a draftsman would: the left face, in shadow, with dense vertical hatching; the right face with sparser strokes running along its top edge; the top left plain until it is hopped. An intermediate top gets a few strokes of sky blue in one direction; a finished top is cross-hatched in the course's accent, which rotates through moss, ocean, lagoon and fern. When a top changes it pops, swelling slightly while a rhombus outline expands off it and fades. When the last top changes, a wave of flashing tops runs down the pyramid course by course, and the next course begins.",
        },
        {
          type: 'p',
          text: "Around the pyramid sit the annotations of a technical plate: the target swatch top left, showing each step of the current rule with a ↺ when hopping undoes it; the course number and a count of finished tops top right; a dimension line down the left flank ticked at each course and labeled *7 courses*; and a scale bar under the base. On small or very short screens these are dropped or condensed, the plate is cropped to the pyramid and its discs, and the count of tops moves into the readouts beside the score.",
        },
        {
          type: 'h',
          text: 'Hops and characters',
        },
        {
          type: 'p',
          text: "Every character, hero and enemy alike, is a *hopper*: a logical cube, a target cube and a hop progress from 0 to 1. Its position on screen is a parabola between the two tops, higher for a hop up the pyramid (26 units) than down it (13). The hero's hop lasts 0.3 seconds. For the first 15 percent it crouches, wider and shorter; in the air it stretches upward; on landing it squashes for a moment, and the cube under it changes. Balls squash on every landing too, and the spring compresses, its coils bunching together before it bounces up again.",
        },
        {
          type: 'p',
          text: "The hero is a paper-white ball with a heavier ink outline, two shoes, a crescent of lagoon hatching on its shadow side and a tubular snout ending in an open, elliptical nostril. It faces one of the four diagonals. Hopping down, it faces the viewer: two eyes, with pupils looking where it is going, and the snout pointing down and out in front of the body. Hopping up, it turns away: the eyes are reduced to two arcs peeking over the top of its head and the snout is drawn behind the body. It blinks now and then, and bobs gently while it waits.",
        },
        {
          type: 'p',
          text: "The spring is a helix of five loops drawn in two passes, the back half of each loop faint and the front half full strength, under an oval head with eyes, a wide grin and a forked tongue that flickers. Its hatching from the coil ball takes nine-tenths of a second: the ball shivers, a zig-zag crack draws itself around its equator, the lid flips off and fades, and the spring uncoils out of the cup with a small overshoot. Discs are spinning ellipses with concentric rings and tick marks that turn with them, hovering over a dashed shadow.",
        },
        {
          type: 'p',
          text: "Characters are drawn back to front by their height on screen. Anything that falls off one of the pyramid's upper sides is drawn behind the pyramid, so it seems to drop away behind the cubes. A death freezes the scene under the speech balloon, *@!#?@!*, accompanied by a short, filtered, garbled phrase on the sound side; after a moment the enemies are cleared and the hero drops back onto the apex.",
        },
        {
          type: 'h',
          text: 'Collisions and fairness',
        },
        {
          type: 'p',
          text: "A character occupies its starting cube for the first 55 percent of a hop and its target cube after that. The hero is caught when an enemy occupies the same cube and their drawings are within 13 units, or when the two pass within 8 units anywhere. An enemy that is still dropping in from above is harmless until the last fraction of its fall. While the hero rides a disc it cannot be touched. Every one of those thresholds leans toward the player.",
        },
        {
          type: 'h',
          text: 'The controls',
        },
        {
          type: 'p',
          text: "Four diagonal moves are awkward on a keyboard and on glass. The keyboard mapping follows the cabinet's rotated joystick: each arrow is turned 45 degrees clockwise, so ↑ hops up-right, → down-right, ↓ down-left and ← up-left. For players who would rather press the direction they see, Q, E, A and D sit in the same diamond on a keyboard (Z and C, and the numpad's 7, 9, 1 and 3, also work). On a touch screen, a tap in any quadrant around the hero hops that way, and a mouse hovering over the plate draws the hop it would make: a dotted arc and an outline on the landing cube, a ring on a disc, or a cross where the hero would fall.",
        },
        {
          type: 'p',
          text: "The on-screen pad does not use a four-way cross, whose arrows would point the wrong way for this game. Instead it splits the diamond between two thumbs: the left cluster holds the two left-hand hops, ↖ above ↙, and the right cluster the two right-hand hops, ↗ above ↘, with Start beneath them. Each thumb owns one side of the pyramid, and upper buttons always mean up.",
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
            "**Sweep by courses.** Work across the pyramid in bands rather than chasing the nearest blank top. It leaves fewer stragglers for the end.",
            "**Stay above the balls.** Balls only go down. A hero standing above a ball, or off to one side of its path, is safe from it.",
            "**Watch the bottom course.** The coil ball hatches when it lands there. That is the moment to know where your nearest disc is.",
            "**Spend discs on the spring.** A disc used while the spring is a hop or two away earns 500 points and buys a stretch of peace. A disc wasted early is gone for the course.",
            "**In toggle courses, plan a route.** Every extra landing on a finished top undoes it. Think of the pyramid as a path you want to walk once.",
            "**Catch the green ball.** Three and a half seconds of frozen enemies is enough to finish a course or slip past the spring.",
            "**Edges are not walls.** Hopping off an upper or lower edge without a disc is fatal. On the outer cubes, check for a disc beside you before you move.",
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
            "The cast is smaller: there are no Slick and Sam (who change tops back) and no Ugg and Wrongway (who run along the cube sides).",
            "The four round rules cycle forever, with the enemies speeding up every course, rather than following the original's level-by-level design.",
            "After a death the hero always returns to the apex, and the enemies are cleared.",
            "Point values for intermediate tops and the course bonus are this piece's own.",
            "The swearing is a short filtered phrase from simple tones, not synthesized speech, and there is no knocker, alas.",
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Creating Q*bert and Other Classic Video Arcade Games', by: 'Warren Davis', year: '2021', note: "The game's designer and programmer on how it was made." },
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001', note: 'Gottlieb, its pinball roots, and the arcade years around Q*bert.' },
    { title: 'The Illusion of Life: Disney Animation', by: 'Frank Thomas and Ollie Johnston', year: '1981', note: 'Squash and stretch, anticipation and follow-through, the principles behind every hop here.' },
  ],
}

export default guide
