import type { Guide } from '../guide'

/*
 * Notes for games/claim — after Qix (Taito, 1981).
 */

const lattice = `<svg viewBox="0 0 260 132" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, Menlo, monospace" font-size="6.5" letter-spacing="0.8">
<defs><clipPath id="cp"><rect x="150" y="62" width="90" height="50"/></clipPath></defs>
<g stroke-opacity="0.12">
<path d="M30 22V112M40 22V112M50 22V112M60 22V112M70 22V112M80 22V112M90 22V112M100 22V112M110 22V112M120 22V112M130 22V112M140 22V112M150 22V112M160 22V112M170 22V112M180 22V112M190 22V112M200 22V112M210 22V112M220 22V112M230 22V112"/>
<path d="M20 32H240M20 42H240M20 52H240M20 62H240M20 72H240M20 82H240M20 92H240M20 102H240"/>
</g>
<g clip-path="url(#cp)" stroke="#2B6A93" stroke-opacity="0.7"><path d="M140 112L200 52M150 112L210 52M160 112L220 52M170 112L230 52M180 112L240 52M190 112L250 52M200 112L260 52M210 112L270 52M220 112L280 52M230 112L290 52M130 112L190 52M120 112L180 52"/></g>
<rect x="20" y="22" width="220" height="90" stroke-width="1.2"/>
<path d="M150 112V62H240" stroke-width="1.8"/>
<circle cx="150" cy="62" r="3" fill="currentColor" fill-opacity="0.08"/><path d="M144 62H156M150 56V68"/>
<g stroke-opacity="0.9"><path d="M62 44L96 70M64 50L96 64M66 56L95 58M70 62L93 52M74 67L90 47M79 71L86 43"/></g>
<g stroke-opacity="0.35" stroke="#1F8A86"><path d="M58 46L92 72M60 52L92 66M62 58L91 60"/></g>
<path d="M20 112l-3 3M240 112l3 3" stroke-opacity="0.5"/>
<g fill="currentColor" stroke="none">
<text x="20" y="14">BOUNDARY (WALKABLE)</text>
<text x="160" y="57">STIX — LATTICE EDGES</text>
<text x="168" y="92" fill="#2B6A93">CLAIMED</text>
<text x="40" y="96">OPEN · THE QIX'S SIDE</text>
<text x="20" y="126">VERTEX = MARKER · EDGE = LINE · CELL = LAND</text>
</g>
</svg>`

const guide: Guide = {
  lede: "Wall off land from a wandering string sculpture. Every closed line becomes a numbered, hatched parcel on a surveyor's plan; claim three quarters of the field to clear it.",

  facts: [
    ['Original', 'Qix, Taito America, 1981'],
    ['Designers', 'Randy and Sandy Pfeiffer'],
    ['Lattice', '160 × 120 cells (120 × 160 on tall screens)'],
    ['Target', '75% of the field'],
    ['The Qix', '12 strings, 8 trailing echoes'],
    ['Speeds', 'walk 46, draw 38, slow draw 19 vertices/s'],
    ['Fuse', 'lights after 0.45 s still, burns at 16/s'],
    ['Scoring', '½ point per cell, × 2 for slow draws'],
    ['Bot', 'Rectangle and L-cut planner, area per second'],
  ],

  interact: {
    keys: [
      { keys: ['←', '↑', '→', '↓'], action: 'Walk along the edge; steer while drawing' },
      { keys: ['Space'], action: 'Hold to draw (fast); also starts and restarts' },
      { keys: ['Z', 'Shift'], action: 'Hold to draw slowly, for double points' },
      { keys: ['Enter'], action: 'Start or restart' },
    ],
    gestures: [
      { gesture: 'drag', action: 'The marker follows your finger along the edge, and draws when you drag out into the open field' },
      { gesture: 'tap', action: 'Start or restart' },
    ],
    tip: "Take small, quick bites from the edges while the Qix is far away; never stop in the open, and watch for sparks where your line will land.",
  },

  pad: {
    dpad: ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'],
    right: [
      { label: 'Draw', code: 'Space', aria: 'Hold to draw, or start', wide: true },
      { label: 'Slow', code: 'KeyZ', aria: 'Hold to draw slowly for double points' },
    ],
  },

  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'A game about drawing lines',
      blocks: [
        { type: 'p', text: "Qix appeared in arcades in 1981, released by Taito's American arm and designed by Randy and Sandy Pfeiffer, a husband-and-wife team. It looked like nothing else in the arcade that year. There were no ships, no aliens and no maze: a black rectangle, a small diamond marker on its border, and in the middle a restless tangle of colored lines, the Qix itself, that whirled and drifted like something alive. The player's job was to fence off territory." },
        { type: 'p', text: "The marker lives on the edge of the unclaimed area. Holding a draw button lets it leave the edge and lay down a line, a *Stix*, through the open field. When the line reaches the edge again it closes a region, and the region on the side away from the Qix is filled in and becomes yours. Claim enough of the screen and the level ends. The danger is that while you draw you are exposed: if the Qix so much as touches your unfinished line, you lose a life. And along the edges patrol *Sparx*, small sparks that chase you around the border." },
        { type: 'p', text: "The game rewarded nerve in a way few games had. Fast drawing was safer; slow drawing scored double, so the best players crept long, slow lines across the field while the Qix thrashed nearby. On later levels two Qix appear, and cutting the field so that they end up in separate regions became one of the game's famous high-risk plays. Qix was widely ported, including to the Game Boy in 1990, and it founded a small genre of territory games: Taito's own Super Qix (1987) and Volfied (1989), and Kaneko's Gals Panic (1990) among them." },
        { type: 'aside', title: 'Why the Qix is the star', text: "Most arcade enemies chase you. The Qix doesn't; it wanders. Its danger is in its unpredictability and its size: a bundle of lines that sweeps a wide area and changes shape as it moves. You don't fight it; you fence it in. That is a rare thing to ask of a player, and it is why Qix feels calm and frightening at the same time." },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Edges, lines and parcels',
      blocks: [
        { type: 'p', text: "In this piece the field is a lattice of 160 by 120 square cells. The marker stands on lattice *vertices*, lines are made of lattice *edges*, and land is made of *cells*. That three-part model makes every rule exact: a claimed parcel's border is precisely the line you drew, with no half-cell gaps." },
        { type: 'figure', svg: lattice, alt: 'A rectangular field; an L-shaped line runs from the bottom edge up and across to the right edge; the cut-off corner is hatched as claimed; a bundle of lines, the Qix, sits on the open side.', caption: "The lattice model. The marker walks the boundary of the open land; drawing lays lattice edges through the open field; closing the line claims every cell the Qix can no longer reach." },
        { type: 'h', text: 'Walking and drawing' },
        { type: 'list', items: [
          "An edge of the lattice is a **boundary** edge if exactly one of the two cells beside it is open (unclaimed). The marker can walk freely along boundary edges, which together form the edge of the open land.",
          "An edge is **interior** if both cells beside it are open. Holding the draw key while pushing into the field lets the marker leave the boundary along interior edges, laying a line behind it. It cannot cross or touch its own line.",
          "When the line reaches any boundary vertex, it **closes**. While drawing you must keep the draw key held to keep moving; release it and the marker stops where it is.",
        ] },
        { type: 'h', text: 'Claiming' },
        { type: 'p', text: "Closing a line runs a flood fill from the Qix's position across open cells, treating the new line as a wall. Every open cell the flood fails to reach is claimed. If the line divides the open land into several pieces, all the pieces without a Qix are taken at once. The claimed fraction is" },
        { type: 'math', tex: 'p = \\frac{\\left|\\text{claimed cells}\\right|}{W \\times H}', label: '(1)' },
        { type: 'p', text: "and the level clears when $p \\geq 0.75$." },
        { type: 'h', text: 'Dangers' },
        { type: 'list', items: [
          "**The Qix** kills you if any of its strings crosses your unfinished line or comes within a cell of the marker while you are drawing. It cannot hurt you on the boundary.",
          "**Sparx** run along the boundary edges. They cannot enter the open field or follow your line, but if one reaches the marker while it is on the boundary, you lose a life. The first appears half a second into a level; more arrive every six seconds, up to one more than the level number (six at most). They speed up the longer a level runs.",
          "**The fuse.** Stop moving in the open for more than 0.45 seconds and a fuse lights at the start of your line and burns along it at 16 vertices a second. If it reaches the marker, you lose a life. Moving again puts it out.",
        ] },
        { type: 'p', text: "When you lose a life, your unfinished line erases itself back to where it started and the marker returns there. You have three lives." },
        { type: 'h', text: 'Scoring' },
        { type: 'math', tex: '\\text{points} = \\frac{1}{2}\\, n\\, m', label: '(2)', caption: "$n$ is the number of cells claimed and $m$ is 2 for a slow line, 1 otherwise. A line counts as slow only if every step of it was drawn slowly." },
        { type: 'p', text: "Clearing a level adds a bonus of 1,000 points for every whole percentage point above 75, plus 500 times the level. Each level is faster than the last (the Qix moves 9% faster per level, the Sparx 6%), and from level three there are two Qix." },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Lines, walls and floods',
      blocks: [
        { type: 'p', text: "Whatever the original hardware did internally, the game's logic is a lesson in discrete geometry. Everything rests on one classification of the lattice edge $e$ between cells $a$ and $b$:" },
        { type: 'table', head: ['Cells beside the edge', 'State', 'Meaning'], rows: [
          ['both open', '2 · interior', 'the marker may draw along it'],
          ['one open, one claimed or outside', '1 · boundary', 'the marker and the Sparx may walk along it'],
          ['neither open', '0 · closed', 'buried inside claimed land'],
        ], caption: "Every movement rule, for the player, the Sparx and the bot, is a question about this one value." },
        { type: 'code', lang: 'ts', code: `/** 0 closed (claimed or outside on both sides), 1 boundary, 2 interior */
function edge(x: number, y: number, d: number) {
  let a: boolean
  let b: boolean
  if (d === 0) {          // east: the cells above and below the edge
    a = openC(x, y - 1)
    b = openC(x, y)
  } else if (d === 2) {   // west
    a = openC(x - 1, y - 1)
    b = openC(x - 1, y)
  } else if (d === 1) {   // south: the cells left and right of the edge
    a = openC(x - 1, y)
    b = openC(x, y)
  } else {                // north
    a = openC(x - 1, y - 1)
    b = openC(x, y - 1)
  }
  return a && b ? 2 : a !== b ? 1 : 0
}`, caption: "The whole movement model in one function from `claim.ts`. Cells outside the field count as closed, so the outer border is a boundary from the start." },
        { type: 'p', text: "Because boundary status is derived from the cells rather than stored, it updates itself: the moment a parcel is claimed, the edges of your line become boundary edges (claimed on one side, open on the other) and the old border behind the parcel stops being walkable. A per-vertex cache of “is this on the boundary?” is rebuilt lazily after each claim so that the bot and the Sparx can ask it thousands of times a second." },
        { type: 'p', text: "The flood fill is a breadth-first search over cells with a typed-array queue and a generation stamp instead of a cleared visited array. Moving from one cell to its neighbour is blocked when the lattice edge between them is part of the current line; separate bit arrays record the horizontal and vertical edges of the line. A full fill touches at most 19,200 cells and runs once per claim." },
        { type: 'h', text: 'Sparx as wall followers' },
        { type: 'p', text: "A Spark knows only where it is and which way it is facing. At each vertex it tries to turn toward its preferred hand, then to go straight, then to turn the other way, then to reverse, and takes the first boundary edge it finds. That is the classic maze-walker's rule, and on the boundary of a region it traces the whole outline, through every notch and pinch, without ever needing a map. Half the Sparx prefer the left hand and half the right, so they circulate in both directions." },
        { type: 'code', lang: 'ts', code: `function stepSparx(s: Spark) {
  // prefer turning toward \`hand\`, then straight, then the other way, then back
  const order = s.hand > 0 ? [1, 0, 3, 2] : [3, 0, 1, 2]
  for (const o of order) {
    const d = (s.d + o) % 4
    if (edge(s.x, s.y, d) === 1) {
      s.x += DX[d]
      s.y += DY[d]
      s.d = d
      return
    }
  }
}`, caption: "A Spark's entire intelligence, lightly trimmed." },
        { type: 'p', text: "When a claim strands a Spark inside the new parcel, it hops to the nearest boundary vertex (found by a breadth-first search over vertices), never one within ten steps of the marker, and reappears with a small ring and half a second of harmlessness." },
      ],
    },
    {
      id: 'qix',
      kicker: 'The Qix',
      title: 'A string sculpture that wanders',
      blocks: [
        { type: 'p', text: "The original Qix drew a handful of lines whose ends moved independently, leaving a few previous positions on screen so that it seemed to ripple. Here the Qix is built like the string sculptures of the 1930s and 40s, in which taut threads strung between two curved frames trace a smooth surface. Twelve strings join points on two arcs on opposite sides of an ellipse. For string $i$ of $K$:" },
        { type: 'math', tex: 'u_i = (\\frac{i}{K-1} - \\frac{1}{2})\\,\\sigma', label: '(3)' },
        { type: 'math', tex: 'A_i = c + R\\,\\mathbf{R}_\\rho\\,(\\cos(a + u_i),\\; e_a \\sin(a + u_i))', label: '(4)' },
        { type: 'math', tex: 'B_i = c + R\\,\\mathbf{R}_\\rho\\,(e_b \\cos(a + \\pi - u_i + \\tau),\\; \\sin(a + \\pi - u_i + \\tau))', label: '(5)' },
        { type: 'p', text: "Here $c$ is the center, $R$ the radius, $\\mathbf{R}_\\rho$ a rotation by $\\rho$, $e_a$ and $e_b$ the squash of each ellipse, $\\sigma$ the spread of the arcs and $\\tau$ the twist between them. With no twist the strings are parallel rungs of a ladder; as $\\tau$ grows the two arcs slide past each other, the strings cross, and their envelope pinches into a curve. Every one of these parameters drifts on its own slow sine, so the figure never repeats: it fans, folds, crosses and opens again. Eight earlier snapshots, taken every 40 ms, are drawn behind it in fading ocean and lagoon." },
        { type: 'code', lang: 'ts', code: `for (let i = 0; i < K; i++) {
  const u = (i / (K - 1) - 0.5) * spread
  const a1 = q.a + u
  const a2 = q.a + Math.PI - u + twist
  const x1 = Math.cos(a1) * R
  const y1 = Math.sin(a1) * R * ea
  const x2 = Math.cos(a2) * R * eb
  const y2 = Math.sin(a2) * R
  out[o + i * 4]     = q.x + x1 * cr - y1 * sr
  out[o + i * 4 + 1] = q.y + x1 * sr + y1 * cr
  out[o + i * 4 + 2] = q.x + x2 * cr - y2 * sr
  out[o + i * 4 + 3] = q.y + x2 * sr + y2 * cr
}`, caption: "`qixShape()`: twelve strings between two counter-sliding arcs." },
        { type: 'h', text: 'How it moves' },
        { type: 'p', text: "The Qix steers by noise. Its heading turns according to a slowly varying simplex-noise value, and its speed swells and occasionally lunges. Every frame it casts sixteen rays outward through the open cells and measures how far each gets before hitting claimed land. Rays that stop short push the Qix away from that wall, more strongly the closer it is, and its effective radius shrinks to fit the narrowest gap, so in a corridor it squeezes thin and in open country it blooms. If it would still step into claimed land, it bounces. Touching your line is a geometric test: each string is checked for a proper crossing against each straight run of your line, and against the marker's position." },
      ],
    },
    {
      id: 'bot',
      kicker: 'The bot',
      title: 'Small bites, far from the Qix',
      blocks: [
        { type: 'p', text: "The attract-mode player is a planner. Standing on the boundary, it runs a breadth-first search along the boundary to collect candidate starting points (every seventh vertex within reach, plus every corner where the boundary turns), and from each one, for each direction that leads into the open, it simulates two families of lines:" },
        { type: 'list', items: [
          "**Rectangles**: in $D$ steps, across $W$, and back out until the boundary, for $D \\in \\{4, 8, 13, 19, 27, 36\\}$ and $W \\in \\{8, 16, 28\\}$, turning either way.",
          "**L-cuts**: in $D$ steps, then turn and run until the boundary. Started from a corner, an L closes against two existing edges and leaves no slivers, which is why the bot's plans come out looking like a neat cadastral map.",
        ] },
        { type: 'p', text: "Each simulated path must stay on interior edges and must not cross itself. Its bounding box is the region at risk. A plan is safe only if every Qix is far enough from that box to be unable to reach it in the time the plan takes:" },
        { type: 'math', tex: 'd_Q > r_Q + 5 + \\frac{1}{2}\\, v_Q\\, T, \\qquad T = \\frac{\\text{walk}}{46} + \\frac{\\text{draw}}{38}', label: '(6)' },
        { type: 'p', text: "where $d_Q$ is the Qix's distance from the box, $r_Q$ its current radius and $v_Q$ its speed. Safe plans are scored by area per second, with the area raised to a power below one so that the bot prefers several moderate bites to one greedy one:" },
        { type: 'math', tex: 'v = \\frac{m\\,A^{0.62}}{T\\,(1 + 0.7[\\text{slow}]) + 0.8} - 0.02\\,b + \\epsilon', label: '(7)', caption: "$A$ is the box area, $m$ the slow-draw multiplier, $b$ the walking distance to the start and $\\epsilon$ a small random term so its play varies. Slow draws are chosen only when the Qix is very far away and the bite is small." },
        { type: 'p', text: "Once it has a plan the bot walks to the start and draws it. Every step it re-checks the Qix: if the Qix comes within its radius plus six cells of the marker, or within two of the plan's box, the bot abandons the plan and takes the shortest interior route back to any boundary vertex (another breadth-first search, avoiding its own line). It also waits, with the draw key held, rather than close a line onto a vertex where a Spark is passing, and it ducks into the field or reverses along the edge when a Spark is closing in." },
        { type: 'h', text: 'Blind spots' },
        { type: 'list', items: [
          "It reasons about the Qix's current position and a worst-case reach, not where the Qix is actually heading, so a sudden lunge can still catch a long line.",
          "It never tries the risky play of splitting two Qix apart.",
          "Its notion of area is the plan's bounding box, which undercounts when a line cuts off a large irregular region.",
        ] },
        { type: 'p', text: "In a long headless run it cleared a level roughly every 60 to 90 seconds and lost a life a couple of times every four minutes, usually to the Qix on a long line." },
      ],
    },
    {
      id: 'built',
      kicker: 'How the piece is built',
      title: 'A plan that draws itself',
      blocks: [
        { type: 'p', text: "The game runs the usual states (attract, title, play, over) around a single update: the Qix moves, the marker spends a time budget one lattice step at a time (46 steps a second walking, 38 drawing, 19 drawing slowly), the fuse burns, the Sparx step, and the Qix is tested against the line. Death and level-clear are short sub-states with their own animations." },
        { type: 'h', text: 'Parcels' },
        { type: 'p', text: "Each claim becomes a *parcel*. Its fill is a `Path2D` built from horizontal runs of its cells; its outline is assembled from the edges where its cells meet anything else, merged into long straight runs. Each parcel gets the next accent in turn and a hatch angle, both chosen to differ from its neighbours'. Slow-drawn parcels are cross-hatched more densely. A label, *P.07* with its share of the field, is placed at the most inland cell, found with a two-pass chessboard distance transform (the technique Azriel Rosenfeld and John Pfaltz described in 1966), and drawn only if there is room." },
        { type: 'p', text: "Finished parcels are drawn once into an offscreen canvas at screen resolution and reused every frame. The newest one is drawn live: its hatch is revealed by a circle growing from the point where the line closed, with a ring of its own colour as the front. When a level is cleared, the Qix dissolves into sparks, the readout reports the survey, and a vertical sweep line wipes the sheet from left to right before the next level." },
        { type: 'h', text: 'The marker, the line and the readouts' },
        { type: 'p', text: "The marker is a registration mark, a circle with a crosshair, and while drawing it carries a small arc that turns. Lines are 1.5 px, ink for fast and ocean for slow, with a live length readout beside the marker (*L 042*, or *SLOW ×2 042*). A burning fuse is a fern-coloured dotted line eating the line from its start. On wide screens a side column holds a large serif percentage, a vertical ruler from 0 to 100 with the 75% target marked and the claimed part hatched, and an area schedule of the latest parcels; on tall screens the readout becomes a header with a horizontal ruler; on short screens it moves into the score readouts with a slim gauge." },
        { type: 'h', text: 'Sound' },
        { type: 'p', text: "Starting a line plays a soft sine (lower for slow). Closing plays a pentatonic note with its fifth, and an octave above for large claims. A burning fuse crackles quietly; a death is a falling sweep; a cleared level is a rising C-major arpeggio." },
        { type: 'h', text: 'Hints' },
        { type: 'p', text: "In your first game, a dotted ghost line leaves the marker, turns and comes back to the edge, and the land it would enclose flickers into hatching, with *HOLD DRAW + ARROWS* (or *DRAG INTO THE FIELD* on touch). It fades after your first claim. Push into the field without the draw key and the game reminds you to hold it; stop while drawing and *KEEP MOVING — FUSE LIT* blinks under the marker. With a mouse, a faint target shows where a press would steer the marker; while pressed, a dotted lead joins them." },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is changed',
      blocks: [
        { type: 'list', items: [
          "The original's Sparx eventually become more dangerous; here they simply speed up during a level, and never follow your line.",
          "There is no bonus for separating two Qix.",
          "The Qix is a designed string figure, not a reproduction of the original's line behaviour, and it steers itself by ray-casting.",
          "Scoring and the level bonus are this piece's own, as are the 75% target and the speeds.",
          "Claimed land is drawn as hatched, numbered parcels instead of solid colour; that is the point of the drawing.",
        ] },
      ],
    },
    {
      id: 'playing',
      kicker: 'Playing well',
      title: 'Advice from the survey office',
      blocks: [
        { type: 'list', items: [
          "Start from corners. A line from a corner that turns once (an L) closes against two edges you already own and wastes nothing.",
          "Watch the Qix, not your line. Draw when it is heading away, and keep your bites small enough to finish before it can turn around.",
          "Never stop in the open. If the Qix comes your way, take the shortest route back to any edge, even if it spoils the shape.",
          "Slow draws pay double but take twice as long. Use them for small claims far from the Qix.",
          "Before you close, look where the line will land; if a Spark is about to pass that point, wait a moment with the draw key held.",
          "Big cuts across the middle are tempting and occasionally brilliant. They are also how most lives are lost.",
          "The target is 75%, but every point above it is worth a thousand at the end of the level.",
        ] },
      ],
    },
  ],

  further: [
    { title: 'Qix', by: 'The International Arcade Museum (Killer List of Videogames)', note: 'Machine details and history of the 1981 cabinet.' },
    { title: 'A Seed Fill Algorithm', by: 'Paul S. Heckbert', year: '1990', note: 'In Graphics Gems, ed. Andrew Glassner. Flood filling, the operation behind every claim.' },
    { title: 'Sequential Operations in Digital Picture Processing', by: 'Azriel Rosenfeld, John L. Pfaltz', year: '1966', note: 'Journal of the ACM. The two-pass distance transform used to place parcel labels.' },
  ],
}

export default guide
