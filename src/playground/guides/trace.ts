import type { Guide } from '../guide'

/*
 * Notes for games/trace — after the light-cycle game in Tron (Bally Midway, 1982).
 */

const territory = `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, Menlo, monospace" font-size="6.5" letter-spacing="0.8">
<defs>
<clipPath id="ta"><path d="M20 20H128L112 52L136 84L118 110H20Z"/></clipPath>
<clipPath id="tb"><path d="M128 20H240V110H118L136 84L112 52Z"/></clipPath>
</defs>
<g clip-path="url(#ta)" stroke-opacity="0.45"><path d="M0 40L40 0M0 56L56 0M0 72L72 0M0 88L88 0M0 104L104 0M0 120L120 0M8 128L136 0M24 128L152 0M40 128L168 0M56 128L184 0M72 128L200 0M88 128L216 0M104 128L232 0"/></g>
<g clip-path="url(#tb)" stroke="#2B6A93" stroke-opacity="0.6"><path d="M100 0L228 128M116 0L244 128M132 0L260 128M148 0L276 128M164 0L292 128M180 0L308 128M196 0L324 128M84 0L212 128M212 0L340 128M228 0L356 128M68 0L196 128"/></g>
<rect x="20" y="20" width="220" height="90" stroke-width="1.2"/>
<path d="M128 20L112 52L136 84L118 110" stroke-dasharray="2 2"/>
<path d="M40 100V70H76" stroke-width="2"/>
<circle cx="76" cy="70" r="2.5" fill="currentColor"/>
<path d="M220 30V48H190" stroke="#2B6A93" stroke-width="2"/>
<circle cx="190" cy="48" r="2.5" fill="#2B6A93" stroke="#2B6A93"/>
<g fill="currentColor" stroke="none">
<text x="52" y="58">CELLS YOU REACH FIRST</text>
<text x="150" y="80" fill="#2B6A93">CELLS A RIVAL REACHES FIRST</text>
<text x="20" y="13">VORONOI TERRITORY BY FLOOD FILL</text>
<text x="20" y="124">THE MOVE THAT KEEPS THE MOST CELLS WINS</text>
</g>
</svg>`

const guide: Guide = {
  lede: "Four light cycles on a drafting table. Each lays a wall behind it and turns only at right angles; the last one riding takes the round, and the first to three rounds takes the heat.",

  facts: [
    ['Original', 'Tron, Bally Midway, 1982 (light-cycle stage)'],
    ['Ancestor', 'Blockade, Gremlin, 1976'],
    ['Arena', '76 × 48 cells (48 × 74 on tall screens)'],
    ['Riders', 'you (ink) and three rivals: ocean, lagoon, moss'],
    ['Speed', '17 cells/s at heat 1, +1.8 per heat, rising during a round'],
    ['Boost', '× 1.65 while held; a full meter lasts 1.8 s'],
    ['Match', 'first to 3 rounds; win the heat to move up'],
    ['AI', 'Voronoi territory by flood fill, one decision per cell'],
  ],

  interact: {
    keys: [
      { keys: ['←', '↑', '→', '↓'], action: 'Turn (absolute directions; you cannot reverse)' },
      { keys: ['W', 'A', 'S', 'D'], action: 'Turn, as the arrows' },
      { keys: ['Space', 'Shift'], action: 'Hold to boost (Space also starts and restarts)' },
      { keys: ['Enter'], action: 'Start or restart' },
    ],
    gestures: [
      { gesture: 'swipe', action: 'Swipe to turn; one drag can bend twice' },
      { gesture: 'hold', action: 'Press and hold without moving to boost' },
      { gesture: 'tap', action: 'Start or restart' },
    ],
    tip: "Don't chase the others; take space. A rival boxed into a smaller region than yours will run out of room before you do.",
  },

  pad: {
    dpad: ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'],
    right: [{ label: 'Boost', code: 'Space', aria: 'Hold to boost, or start', wide: true }],
  },

  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'Walls of light',
      blocks: [
        { type: 'p', text: "Disney's *Tron*, directed by Steven Lisberger, opened in July 1982. It was set inside a computer, where programs were people and video games were gladiatorial sports, and its most famous sequence was a race of *light cycles*: motorbikes that leave a solid wall of light behind them, so that every rider is building the arena that will kill the others. The same summer, Bally Midway released a *Tron* arcade cabinet. It was a set of four short games taken from the film, all of which had to be cleared to finish a level, in an order the player chose: the light cycles, a tank battle in a maze, a shoot-out with the Master Control Program's spinning cone, and a race into the I/O tower past swarming grid bugs. The cabinet had both a joystick and a rotary spinner, and it sold well." },
        { type: 'p', text: "The light-cycle idea is older than the film. In 1976 Gremlin Industries released *Blockade*, a two-player arcade game in which each player steers a growing line around the screen and the first to crash into a line or a wall loses; the next year Atari's *Surround* brought the same contest to the home console. The genre is sometimes called *snake* games after the single-player variants that followed. What the film and the Midway cabinet added was the fiction (the walls are the riders' own exhaust) and speed." },
        { type: 'p', text: "Light cycles have stayed a favorite of programmers in particular. The rules fit on an index card, there is no luck, and every position can be analyzed; yet good play is surprisingly deep. In early 2010 the University of Waterloo's Computer Science Club, sponsored by Google, ran an AI Challenge on exactly this game, and hundreds of bots fought it out on small grids. The winner, by Andy Sloane, combined a game-tree search with an evaluation based on *territory*: which cells each player can reach before the other. The rivals in this piece use a simpler version of the same idea." },
        { type: 'aside', title: 'What makes it hard', text: "You can only die by your own move. Every crash is a choice made a few cells earlier, usually the choice to go somewhere that was getting smaller. The game is a contest to own space, and the walls are how you claim it." },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Turn, don’t touch',
      blocks: [
        { type: 'list', items: [
          "The arena is a grid of 76 by 48 cells. Each cycle moves one cell at a time at a fixed speed, filling every cell it passes with its wall.",
          "You can turn left or right at any cell (the controls are absolute: press the direction you want to go). You cannot turn back on yourself.",
          "Moving into any wall, your own, a rival's, the arena's border, or a column, ends your round. If two cycles move into the same cell, the second one in crashes; two cycles swapping cells head-on both crash.",
          "When a cycle crashes, its wall erases itself from the crash point back to the start, freeing the floor for everyone still riding.",
          "The last cycle riding wins the round. If the last two crash together, nobody does.",
          "The first rider to win three rounds takes the heat. If that is you, the next heat starts faster, with sharper rivals and, from heat two, structural columns on the floor. If it is a rival, the game is over.",
        ] },
        { type: 'h', text: 'Speed and boost' },
        { type: 'p', text: "Heat $h$ starts at a base speed, and the pace tightens the longer a round runs:" },
        { type: 'math', tex: 'v(t) = \\min(24,\\; 17 + 1.8\\,(h - 1)) \\cdot (1 + \\min(0.8,\\; 0.022\\, t)) \\;\\text{cells/s}', label: '(1)', caption: "After 36 seconds a round is running at 1.8 times its starting pace, which keeps long stand-offs from dragging on." },
        { type: 'p', text: "Holding boost multiplies your speed by 1.65 while the meter lasts. A full meter drains in 1.8 seconds and refills in about eight. Boost is for winning races to a gap, not for cruising." },
        { type: 'h', text: 'Scoring' },
        { type: 'table', head: ['Event', 'Points'], rows: [
          ['Each cell you ride', '1'],
          ['A rival crashes while you are still riding', '200'],
          ['You win a round', '1,000'],
          ['You win a heat', '2,500'],
        ] },
        { type: 'p', text: "When you are out and two or more rivals are still riding, the round plays on at double speed so you can watch it finish." },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Space is the only resource',
      blocks: [
        { type: 'p', text: "Every light-cycle position can be understood as a question of space. A rider who is sealed into a region with $n$ empty cells can survive at most $n$ more steps; a rider whose region is shared with others is in a race for it. Two ideas from computational geometry and graph search make that precise, and both run every time a rival in this piece chooses a direction." },
        { type: 'h', text: 'Flood fill' },
        { type: 'p', text: "A breadth-first search from a cell, stepping only into empty neighbours, visits exactly the cells reachable from it: the size of your pocket. It is the cheapest useful look-ahead there is. A move into a corridor that leads nowhere scores a handful of cells; a move into open floor scores hundreds." },
        { type: 'h', text: 'Territory' },
        { type: 'p', text: "Run the same search from every rider's head at once, all advancing one ring per step, and each empty cell is reached first by somebody. The set of cells a rider reaches first is its *Voronoi region*, named after Georgy Voronoy, who studied such partitions in 1908, measured here with distance along the floor rather than in a straight line:" },
        { type: 'math', tex: 'V_i = \\{\\, c \\;:\\; d_i(c) < \\min_{j \\neq i} d_j(c) \\,\\}', label: '(2)', caption: "$d_i(c)$ is the number of steps rider $i$ needs to reach cell $c$ through empty floor. Cells at equal distance belong to nobody." },
        { type: 'figure', svg: territory, alt: 'An arena divided by a dashed, irregular line into two hatched regions; an ink trail and head on the left, an ocean trail and head on the right.', caption: "Two riders' territories. A move that pushes the dividing line toward the rival enlarges your region and shrinks theirs; when the regions stop touching, the riders are sealed apart and only the size of each pocket matters." },
        { type: 'p', text: "Territory explains most good light-cycle play. Cutting in front of a rival is valuable because it moves the dividing line toward them. Running alongside a rival at a distance keeps your share. Turning into a dead end loses territory immediately, even if you don't crash for a while." },
        { type: 'h', text: 'Filling a pocket' },
        { type: 'p', text: "Once you are sealed off alone, a second question takes over: how many of your pocket's cells can you actually visit before you run out? Not always all of them. Color the grid like a checkerboard. Every step moves you to a cell of the other colour, so any path alternates colours, and a path can visit at most one more cell of one colour than of the other:" },
        { type: 'math', tex: 'n_{\\max} \\leq 2\\,\\min(B, W) + 1', label: '(3)', caption: "$B$ and $W$ are the numbers of empty dark and light cells in the pocket. A pocket with many more of one colour than the other wastes the excess, however well you ride." },
        { type: 'p', text: "Shape matters too. A pocket that opens into two chambers through a single-cell doorway forces a choice: whichever chamber you enter, you can never come back for the other. Strong light-cycle programs look for these doorways (in graph terms, *articulation points*) and count only the best chamber. The rivals here don't, which is one reason a well-made seal can beat them." },
      ],
    },
    {
      id: 'bot',
      kicker: 'The bot',
      title: 'Three choices at every cell',
      blocks: [
        { type: 'p', text: "At every cell each computer rider, and in attract mode your own ink cycle, considers its three possible moves: straight, left and right. Moves into a wall are discarded. For each remaining move it runs the territory search from its new head and the other riders' current heads, counting the cells it would own, the cells the player would own, and whether its region still touches anyone else's. Then it adds a few small adjustments:" },
        { type: 'code', lang: 'ts', code: `const [mine, theirs, touch] = territory(r, nx, ny)
if (!touch) {
  // sealed off alone: run long straights through the pocket
  const [area] = flood(nx, ny, 4000, r)
  v = area + (d === r.d ? 12 : 0) + hug(nx, ny) * 6 * (heat - 1)
} else {
  v = mine
  if (mine < 16) v -= 500 - mine * 20           // a pocket this small is a trap
  if (!r.player) v -= theirs * r.aggr * 0.2     // lean on the player
  if (d === r.d) v += 8                          // ride in straights
  else if (sinceLastTurn < 4) v -= 14            // no jittering
  for (const o of riders) {
    if (o === r || !o.alive) continue
    const md = Math.abs(o.x - nx) + Math.abs(o.y - ny)
    if (md === 1) v -= 60 + mine * 0.2           // head-on risk
    else if (md <= 3) v -= (4 - md) * 30 * (1 - r.aggr)
  }
}`, caption: "The scoring in `choose()` from `trace.ts`, lightly trimmed. The move with the highest value is taken." },
        { type: 'p', text: "The riders differ only in temperament. Ocean is the bold one (aggression 0.75), moss next (0.55), lagoon and your ink cycle cautious (0.3 and 0.25). Aggression does two things: it makes a rider value shrinking the player's territory, which shows up as cutting in front of you, and it reduces how far it keeps from other riders' heads. Bold riders also boost on long clear straights when someone is near." },
        { type: 'p', text: "When a rider's region no longer touches anyone else's, territory is meaningless; only its own pocket matters. Then it switches to filling: it prefers long straights through the space, and from heat two onward it also hugs walls, which wastes less of the pocket. That difference is deliberate. At heat one a sealed-off rival fills its pocket loosely and runs out of room earlier, which gives you time; later rivals spiral tightly and last." },
        { type: 'p', text: "To keep motion smooth, each rider decides its next move just after it arrives at a cell and re-checks it only if the move has since become blocked, so its cycle can lean into a turn before it reaches the corner. Each computer rider also has a small chance per decision of being *careless* (2.2% at heat one, falling with each heat to a floor of 0.6%): it then picks a random open direction, which is how it occasionally drives itself into a pocket." },
        { type: 'h', text: 'Blind spots' },
        { type: 'list', items: [
          "It looks one move ahead and assumes the other riders stand still; it does not search the game tree as the strongest Tron bots do, so it can be outmaneuvered by a rider who plans two or three turns.",
          "Territory treats the frontier as fixed, so it underrates fast riders and boosts.",
          "Its decision is made a cell early; a rival who turns across its path in that moment can catch it.",
        ] },
        { type: 'p', text: "In headless runs at heat one, rounds last about 15 to 30 seconds, and every rider, ink included, wins its share." },
      ],
    },
    {
      id: 'built',
      kicker: 'How the piece is built',
      title: 'A plan view of a race',
      blocks: [
        { type: 'h', text: 'State and timing' },
        { type: 'p', text: "Around the usual attract, title, play and over states, a match runs through four phases: a 1.8-second *count* (3, 2, 1, with soft beeps), the *race*, a 2.5-second round *end*, and a *match* result. The floor is a `Uint8Array` that records which rider owns each cell (or 9 for a column). Each rider keeps the list of cells it has filled and the indices where it turned, so its wall can be drawn as a polyline through the corners rather than cell by cell." },
        { type: 'p', text: "Riders accumulate movement as fractional cells. To keep the race fair, steps are taken in time order across all riders: each pass moves whichever rider is furthest ahead in its budget, so nobody gets two moves in before anyone else gets one. That ordering also decides who crashes when two riders aim at the same cell." },
        { type: 'h', text: 'The derez' },
        { type: 'p', text: "A crash bursts into sparks in the rider's colour, throws two rings and a little screen shake, and leaves a surveyor's cross with a label such as *OCEAN OUT · 00:15.8*. After a third of a second the wall begins to erase from the crash point back toward the start, at least 60 cells a second and faster for long walls, freeing each cell as it goes. A small ring marks the erasing tip, and every third cell gives off a spark." },
        { type: 'code', lang: 'ts', code: `const before = Math.ceil(r.erase)
r.erase = Math.max(0, r.erase - dt * Math.max(60, r.cells.length * 1.2))
const after = Math.ceil(r.erase)
for (let i = after; i < before; i++) {
  const c = r.cells[i]
  if (owner[c] === r.id) owner[c] = 0 // the floor is free again
  if (i % 3 === 0) sparks.emit(cellX(c), cellY(c), 1, { speed: 45, life: 0.45, color: r.color })
}`, caption: "The sweep in `updateErase()`, trimmed." },
        { type: 'p', text: "At the end of a round the winner gets two rings and a paper label (*Round to ocean*, with the running tally), and then every remaining wall erases in a staggered sweep before the next count." },
        { type: 'h', text: 'The cycles' },
        { type: 'p', text: "Each cycle is a small plan drawing: two dark tyres standing proud of the fairing, a fairing broad over the engine and tapered to a rounded nose, hatching over the engine half, a helmet ring and a cowl line. The wall leaves from under the rear tyre. Its heading eases toward the direction it is about to take, so it leans into turns while the wall itself turns at a crisp right angle. Every so often a four-point glint crosses the nose. Boosting adds three streaks behind. Walls are 2 px lines in the rider's colour (ink for you), and every turn is marked with a tiny open circle, like a plotted vertex." },
        { type: 'h', text: 'The arena' },
        { type: 'p', text: "A fine construction grid every four cells, a heavier grid every sixteen with crosses at the intersections, ruler ticks along two edges, and a double outer wall like a building plan. The four start positions are registration marks. From heat two, square columns with their diagonals drawn in, the plan symbol for a column, stand on the floor. Below the arena a legend lists each rider with its round pips and, for you, the boost meter." },
        { type: 'h', text: 'Sound and hints' },
        { type: 'p', text: "Turns tick softly; a boost is a rising breath of noise; a crash is a falling sweep panned toward where it happened, quieter for rivals; a round ends with a short major chord, brighter when you win. In your first round, dotted arrows show the turns open to you, with *SWIPE TO TURN* or the arrow keys spelled out, and a line points at the boost meter; it fades after your first turn. In the first heat, when a wall is four cells or less ahead and you have no turn queued, small chevrons blink in front of your nose." },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'What the marks mean',
      blocks: [
        { type: 'list', items: [
          "**Registration marks** on the floor are the four start positions, arranged as a pinwheel so that every rider begins facing open ground.",
          "**Small open circles** on a wall are its turns, like plotted vertices on a survey line; a busy wall shows a nervous rider.",
          "**A cross in a circle** is where a rider crashed, with its name and the race time beside it on larger screens.",
          "**A small ring running along a wall** is the erasing tip of a derezzed rider; the floor behind it is open again.",
          "**The clock** in the readouts is the race time of the current round; the pace rises with it.",
          "**The legend** under the arena lists the riders in their colours. Filled pips are rounds won; three take the heat. A faded name is out of this round. The bar beside yours is the boost meter.",
          "**Chevrons** blinking ahead of your nose (first heat only) mean a wall is four cells away or less and no turn is queued.",
          "**Square columns** with diagonals, from heat two, are fixed walls.",
        ] },
        { type: 'p', text: "Between rounds a paper label reports the winner and the running tally in rider order (you, ocean, lagoon, moss), and at the end of a heat the winner is named with the heat number. On a phone held sideways the scores move into the margins and the legend drops the names, keeping the colours and pips." },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is changed',
      blocks: [
        { type: 'list', items: [
          "Only the light-cycle game is here, not the cabinet's other three stages.",
          "The arena, speeds, boost, heats, columns and scoring are this piece's own.",
          "Four riders race at once in a pinwheel start; the rivals are computer-controlled with deliberately simple, beatable intelligence.",
          "Walls are drawn as 2 px lines in plan, not as glowing ribbons; there is no glow anywhere, by design.",
        ] },
      ],
    },
    {
      id: 'playing',
      kicker: 'Playing well',
      title: 'Advice from the grid',
      blocks: [
        { type: 'list', items: [
          "Turn early. At 17 cells a second a wall three cells ahead is less than a fifth of a second away.",
          "Queue turns: you can press two directions in quick succession (or bend a single drag twice) and they will be taken on consecutive cells, which is how you make a tight U-turn.",
          "Take space rather than chasing riders. Cut across the middle early to divide the arena, then make the dividing line work for you.",
          "If you are sealed into a pocket alone, fill it tightly: hug the walls and spiral inward instead of zig-zagging.",
          "Keep a margin from other riders' heads; most crashes are head-on mistakes.",
          "Save boost for races to a closing gap. A full meter lasts less than two seconds.",
          "Columns are walls too, and the gaps beside them are where rivals get trapped.",
        ] },
      ],
    },
  ],

  further: [
    { title: 'Tron', by: 'Steven Lisberger (director), Walt Disney Productions', year: '1982', note: 'The film the cabinet was made with.' },
    { title: 'Tron', by: 'The International Arcade Museum (Killer List of Videogames)', note: 'The Bally Midway cabinet and its four games.' },
    { title: 'Blockade', by: 'The International Arcade Museum (Killer List of Videogames)', note: 'Gremlin’s 1976 two-player wall game.' },
    { title: 'Google AI Challenge post-mortem', by: 'Andy Sloane', year: '2010', note: 'How the winning Tron bot combined game-tree search with Voronoi territory.' },
  ],
}

export default guide
