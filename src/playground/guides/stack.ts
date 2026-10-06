import type { Guide } from '../guide'

/*
 * Notes for games/stack — after Tetris (Alexey Pajitnov, 1984).
 */

const guide: Guide = {
  lede: "A falling-block puzzle drawn as a section through a well: seven pieces, each with its own hatch “material”, played to the modern rules, with a bot that searches every placement before it moves.",

  facts: [
    ['Original', 'Tetris, Alexey Pajitnov, 1984'],
    ['First machine', 'Electronika 60, Moscow'],
    ['Well', '10 × 20 cells, plus 2 hidden rows'],
    ['Rotation', 'Super Rotation System, up to 5 kick tests'],
    ['Randomizer', '7-bag'],
    ['Gravity', '$(0.8 - 0.007(L-1))^{L-1}$ s per row'],
    ['Lock delay', '0.5 s, up to 15 resets'],
    ['Scoring', '100 · 300 · 500 · 800 × level'],
    ['Bot', 'One-piece search, El-Tetris weights'],
  ],

  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Move (hold to auto-repeat)' },
      { keys: ['↑', 'X'], action: 'Rotate clockwise' },
      { keys: ['Z'], action: 'Rotate counter-clockwise' },
      { keys: ['↓'], action: 'Soft drop' },
      { keys: ['Space'], action: 'Hard drop (also starts and restarts)' },
      { keys: ['C', 'Shift'], action: 'Hold the piece' },
      { keys: ['Enter'], action: 'Start or restart' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag sideways to move, slowly down to soft drop' },
      { gesture: 'tap', action: 'Tap to rotate (tap the hold box to hold)' },
      { gesture: 'swipe', action: 'Swipe down to hard drop, up to hold' },
    ],
    tip: "Keep the stack flat and leave the right-hand column open; when a long I piece arrives, four lines go at once for the biggest score.",
  },

  pad: {
    left: [
      { label: '←', code: 'ArrowLeft', aria: 'Move left' },
      { label: '↓', code: 'ArrowDown', aria: 'Soft drop' },
      { label: '→', code: 'ArrowRight', aria: 'Move right' },
    ],
    right: [
      { label: '↺', code: 'KeyZ', aria: 'Rotate counter-clockwise' },
      { label: '↻', code: 'KeyX', aria: 'Rotate clockwise' },
      { label: 'Hold', code: 'KeyC' },
      { label: 'Drop', code: 'Space', aria: 'Hard drop, or start', wide: true },
    ],
  },

  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'A puzzle written on a terminal in Moscow',
      blocks: [
        { type: 'p', text: "In June 1984 Alexey Pajitnov, a researcher at the Dorodnitsyn Computing Centre of the Soviet Academy of Sciences in Moscow, wrote a small game on an Electronika 60, a Soviet copy of a DEC minicomputer. He had been working on artificial intelligence and speech recognition, and he liked puzzles; in particular he liked pentominoes, the set of twelve shapes made from five squares that tile rectangles in maddening ways. Pentominoes were too many and too awkward for a quick game, so he used the seven shapes that can be made from four squares, the tetrominoes, and asked a different question: not how they fit together on a table, but what happens if they fall into a narrow well one at a time while you steer them." },
        { type: 'p', text: "The Electronika 60 had no graphics. The first Tetris drew its pieces with text characters, each square a pair of square brackets, and it ran on a text terminal. The name joins *tetra*, Greek for four, with tennis, Pajitnov's favorite sport. The idea that made it a game rather than a puzzle came early: when a row of the well fills completely, it disappears and everything above it falls. A stack you were losing can suddenly become a stack you are winning." },
        { type: 'p', text: "The game spread the way software spread in the Soviet Union in the 1980s, copied from machine to machine. Vadim Gerasimov, a sixteen-year-old student, ported it to the IBM PC, and the PC version traveled to Hungary, where Western software dealers saw it. What followed was one of the strangest licensing stories in the industry: rights were sold, resold and disputed by companies who had never dealt with the Soviet state trading organization, Elorg, that actually controlled them. The PC version was published in the West in 1987 and 1988. In 1989 Henk Rogers flew to Moscow and secured the handheld rights for Nintendo, and Tetris was bundled with the new Game Boy; that pairing made it one of the most played games ever made." },
        { type: 'p', text: "Pajitnov, as an employee of a state institute, received nothing from the early sales. He moved to the United States in 1991, and in 1996 he and Rogers founded The Tetris Company, which has managed the game ever since. The Company's design guideline, adopted across official games from the early 2000s, fixed the details that this piece follows: a 10 × 20 well, a standard rotation system with wall kicks, a seven-piece bag, a hold slot, a ghost piece and a visible queue of next pieces." },
        { type: 'aside', title: 'Why it lasts', text: "Tetris is a game about local decisions with global consequences. Every placement is easy; the stack is the sum of all of them. It never runs out of situations, it is understood in seconds, and its failure state is visible a long way off, which is why near-misses feel earned." },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Seven pieces, one well',
      blocks: [
        { type: 'p', text: "The well is ten cells wide and twenty tall, with two hidden rows above the top where pieces appear. A piece falls one row at a time; you can move it sideways, rotate it, drop it faster, or hold it in reserve. When it can fall no further it *locks*, any full rows clear, and the next piece appears. The game ends when a new piece has nowhere to appear (a *block out*) or a piece locks entirely above the visible well (a *lock out*)." },
        { type: 'h', text: 'The pieces' },
        { type: 'table', head: ['Piece', 'Shape', 'Material in the drawing'], rows: [
          ['I', 'four in a line', 'lagoon, vertical lines'],
          ['O', 'two by two', 'ink, stipple'],
          ['T', 'three with a nub', 'moss, cross-hatch'],
          ['S', 'skew', 'fern, 45° rising'],
          ['Z', 'skew, mirrored', 'fern, 45° falling'],
          ['J', 'hook', 'ocean, steep rising'],
          ['L', 'hook, mirrored', 'ocean, steep falling'],
        ], caption: "Mirror pairs share a colour and get mirrored hatching, the way a drawing distinguishes a part from its handed twin." },
        { type: 'h', text: 'The seven-piece bag' },
        { type: 'p', text: "Pieces are not drawn independently at random. The randomizer shuffles one of each of the seven into a bag and deals the bag out before shuffling another. You never wait more than twelve pieces for any particular shape, droughts of the long I piece are impossible, and floods of S and Z are capped. The bag is a seeded Fisher–Yates shuffle, so a given seed always deals the same game." },
        { type: 'h', text: 'Rotation and kicks' },
        { type: 'p', text: "Each piece sits in a small box (four by four for I, three by three for the others) and rotates about the box's center. If the rotated piece would overlap a wall or the stack, the game tries up to four alternative offsets, called *kicks*, before giving up. The kick tables are the Super Rotation System's: they differ for each pair of states and for the I piece, and they are what let a T slide into a slot under an overhang. The O piece does not rotate at all." },
        { type: 'h', text: 'Gravity, locking and handling' },
        { type: 'p', text: "Gravity follows the guideline curve. At level $L$ a piece falls one row every" },
        { type: 'math', tex: 't(L) = (0.8 - 0.007\\,(L-1))^{L-1} \\;\\text{seconds}', label: '(1)', caption: "One second per row at level 1; about 0.36 s at level 5, 0.064 s at level 10 and 0.007 s at level 15, where a piece crosses the whole well in under a sixth of a second." },
        { type: 'p', text: "A piece that touches down does not lock at once: it has half a second of *lock delay*, and every successful move or rotation resets that timer, up to fifteen times, so you can slide a landed piece into place. Holding a direction moves once, waits 150 ms (the *delayed auto shift*) and then repeats every 45 ms. Soft drop falls at twenty times gravity (at least 32 rows a second); hard drop places the piece instantly. Hold swaps the current piece into the hold box, once per piece." },
        { type: 'h', text: 'Scoring' },
        { type: 'table', head: ['Event', 'Points'], rows: [
          ['Single', '100 × level'],
          ['Double', '300 × level'],
          ['Triple', '500 × level'],
          ['Four lines', '800 × level, × 1.5 if the previous clear was also four'],
          ['Combo (consecutive clearing pieces)', '+ 50 × combo × level'],
          ['Soft drop', '1 per row'],
          ['Hard drop', '2 per row'],
        ] },
        { type: 'p', text: "The level is one plus the number of cleared lines divided by ten, rounded down. Four lines at once is worth twice as much per line as four singles, and back-to-back fours earn half again; the whole scoring system nudges you to build a tall, clean stack with one open column and wait for the long piece." },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'What the rules are really doing',
      blocks: [
        { type: 'p', text: "Most of Tetris's feel lives in small timing rules. Lock delay turns the bottom of the well from a wall into a workbench. Delayed auto shift decides whether a tap moves one cell or a hold sweeps the piece to the wall. The ghost piece, a dashed outline where the piece would land, removes guesswork about depth, which is why modern players can hard drop almost everything." },
        { type: 'p', text: "Older versions made very different choices. Nintendo's 1989 version for the NES had no hold, no hard drop, no ghost and no wall kicks, a single next piece, a randomizer that merely rerolled immediate repeats, and a score table of 40, 100, 300 and 1,200 points times the level plus one. Its gravity jumps sharply at level 29, and for decades that level was treated as a wall. The modern guideline is friendlier and faster; most of the difficulty moved from fighting the controls to planning." },
        { type: 'h', text: 'Tetris and mathematics' },
        { type: 'p', text: "The game has attracted real mathematics. In 1997 Heidi Burgiel showed that a long enough alternating sequence of S and Z pieces forces any player to lose in the original rules: you cannot survive forever, only for a while. In 2003 Erik Demaine, Susan Hohenberger and David Liben-Nowell proved that the offline version (where you know every future piece) is NP-complete for several natural goals, such as maximizing cleared lines, and hard even to approximate. The seven-bag randomizer sidesteps the S–Z argument, which is one reason guideline Tetris can be played essentially forever by a good player or a good program." },
      ],
    },
    {
      id: 'bot',
      kicker: 'The bot',
      title: 'Every rotation, every column',
      blocks: [
        { type: 'p', text: "The attract-mode player is a *one-piece* searcher. When a piece appears it considers every distinct rotation and every column the piece can reach by sliding sideways at its current height, drops it straight down, and scores the resulting board. If the hold box offers a different piece (or the next piece, when hold is empty), it scores those placements too and holds only if the best of them beats the best placement for the current piece by a margin. Then it carries the plan out at a human pace: a short pause to “think”, one rotation or one step every 55–110 ms, and a hard drop, or now and then a soft drop at low levels." },
        { type: 'h', text: 'The evaluation' },
        { type: 'p', text: "Pierre Dellacherie, a French programmer, published a hand-tuned one-piece controller in 2003 built on six features of the board after a placement. Islam El-Ashi later re-tuned the weights, and those are the ones used here:" },
        { type: 'math', tex: 'v = -4.50\\,h + 3.42\\,(c \\cdot e) - 3.22\\,R - 9.35\\,K - 7.90\\,H - 3.39\\,W', label: '(2)' },
        { type: 'list', items: [
          "$h$ — *landing height*: how high the middle of the piece came to rest.",
          "$c \\cdot e$ — *eroded cells*: rows cleared times the number of the piece's own cells in those rows; it rewards using the piece itself to finish lines.",
          "$R$ — *row transitions*: changes between filled and empty walking along every row, the walls counting as filled; a ragged row scores badly.",
          "$K$ — *column transitions*: the same walking down every column, the floor counting as filled; it punishes overhangs.",
          "$H$ — *holes*: empty cells with a filled cell somewhere above them in the same column.",
          "$W$ — *wells*: for every empty cell with filled neighbours on both sides, add its depth within that well (1 for the top cell, 2 for the next…), so deep wells cost quadratically.",
        ] },
        { type: 'code', lang: 'ts', code: `let v = -4.500158825082766 * landing
      + 3.4181268101392694 * cleared * eroded
      - 3.2178882868487753 * rowT
      - 9.348695305445199 * colT
      - 7.899265427351652 * holes
      - 3.3855972247263626 * wells
if (reserve) {
  if (usesWell && cleared < 4) v -= 40
  if (cleared === 4) v += 60
}
return v`, caption: "The heart of `evaluate()` in `stack.ts`: the El-Tetris weights, then the attract-mode tweak that keeps the right-hand column open." },
        { type: 'h', text: 'The four-line tweak' },
        { type: 'p', text: "Pure El-Tetris is a survivor: it clears lines as soon as it can, mostly singles, and it almost never dies. That is dull to watch. While the stack is lower than eleven rows, this bot treats column ten as a reserved well: the well penalty ignores it, any placement that puts a cell there without clearing four lines costs 40, and a four-line clear earns 60. The result is the classic modern pattern: nine columns built up flat, then an I piece slotted down the side for four lines, with doubles and triples when the queue doesn't cooperate. Over ten simulated minutes in attract mode it made about thirty each of singles, doubles and fours and rather more triples, cleared some 370 lines, and never topped out." },
        { type: 'h', text: 'Blind spots' },
        { type: 'list', items: [
          "It only considers paths that rotate first and then slide at the current height, so it never finds placements that need a tuck under an overhang or a spin into a slot (no T-spins).",
          "It looks one piece ahead (the hold alternative), not two; it does not plan around the visible queue.",
          "Its hands are deliberately slow. At high levels gravity outruns them and it starts to misplace pieces, which is why attract mode caps the level at seven. In a real game with the bot driving (`&bot=1`) it usually reaches level 13 or 14 before the speed beats it.",
        ] },
      ],
    },
    {
      id: 'built',
      kicker: 'How the piece is built',
      title: 'A section drawing that plays',
      blocks: [
        { type: 'h', text: 'State and data' },
        { type: 'p', text: "The game is one closure with a small state machine: *attract* (the preview card, the bot forever), *title* (the bot plays behind the card), *play* and *over*. A game is a plain object: the board is a `Uint8Array` of 10 × 22 cells holding piece types, the falling piece is four numbers (type, rotation, x, y), and the bag and the five-piece queue are short arrays. Every piece shape in every rotation is precomputed once by rotating its box coordinates:" },
        { type: 'code', lang: 'ts', code: `const SHAPES: Int8Array[][] = BASE.map((b, t) => {
  const rots: Int8Array[] = []
  let cur = b.slice()
  for (let r = 0; r < 4; r++) {
    rots.push(Int8Array.from(cur))
    if (t === 2) continue // the O doesn't rotate
    const n = BOXN[t]
    const nx: number[] = []
    // a quarter turn clockwise in an n × n box: (x, y) → (n − 1 − y, x)
    for (let i = 0; i < cur.length; i += 2) nx.push(n - 1 - cur[i + 1], cur[i])
    cur = nx
  }
  return rots
})`, caption: "Four rotations per piece, as flat (x, y) pairs." },
        { type: 'p', text: "Rotation tries the kick offsets in order and takes the first that fits:" },
        { type: 'code', lang: 'ts', code: `const to = (p.r + dir + 4) % 4
const k = (p.t === 1 ? KICK_I : KICK)[\`\${p.r}\${to}\`]
for (let i = 0; i < k.length; i += 2) {
  if (!collide(g.board, p.t, to, p.x + k[i], p.y + k[i + 1])) {
    p.x += k[i]
    p.y += k[i + 1]
    p.r = to
    afterShift() // a successful rotation resets the lock timer
    return true
  }
}
return false`, caption: "SRS kicks, stored as flat offset lists keyed by the from–to state pair (in y-down coordinates)." },
        { type: 'h', text: 'Drawing the materials' },
        { type: 'p', text: "Each cell is an outlined square inset slightly from its neighbours, so the stack reads like coursed masonry. Its hatch is precomputed once per material as line segments clipped to the unit square with the Liang–Barsky algorithm; drawing a cell is then just scaling and translating those segments. All cells of one material are batched into a single path per frame, so the whole well is about fourteen strokes regardless of how full it is. The falling piece is drawn heavier, eased a few milliseconds behind its logical position so movement reads as motion rather than teleporting, with a slight swell when it rotates." },
        { type: 'h', text: 'The clear, in three beats' },
        { type: 'list', ordered: true, items: [
          "**Strike.** A 1.4 px rule is drawn across each full row in 130 ms, overshooting the walls, alternating direction row by row (left to right, then right to left).",
          "**Dissolve.** Starting 90 ms in, the cells shrink toward their centers and fade, one after another in the direction of the strike, each bursting into a few hairline sparks in its own colour.",
          "**Settle.** When the rows are removed the stack above is redrawn at its old height and eased down over 200 ms with an in-out curve.",
        ] },
        { type: 'p', text: "Four lines get a bigger moment: doubled strike rules staggered by 35 ms, a dimension line on the wall spanning the four rows, two rings, a short screen shake, a serif *Four lines* label, and a fuller chord. Hard drops leave a fan of vertical speed lines and a puff of dust at the landing edge. Game over strikes every row of the dead stack from the bottom up, greys it to ink, and after a pause the bot clears the sheet and starts again behind the card." },
        { type: 'h', text: 'Sound' },
        { type: 'p', text: "Moves are 25 ms sine clicks; rotations are slightly lower triangle ticks; locks are a soft low thump. Clears play notes of a chord that steps through I–vi–IV–V in C major with each clear, one note more for each line, so a run of clears makes a progression. A four-line clear plays the whole chord with two octave notes and a hush of filtered noise. Behind the title card the bot's clears play very quietly; its moves are silent." },
        { type: 'h', text: 'Layouts' },
        { type: 'p', text: "There are three arrangements. On a landscape screen the well sits between a left column (hold, a record of level, lines, pieces and gravity, and a key of materials with piece counts) and a right column (next three, and a log of recent clears). On a tall phone the hold and next boxes move above the well. On short screens, such as a phone on its side, the well takes the full height and only hold and next remain, with score, lines and level in the side margins." },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Every mark has a job',
      blocks: [
        { type: 'list', items: [
          "**Ruler ticks** run up both walls, one per row and longer every fifth; **row numbers** count up from the floor and **column letters** A–J sit under it when there is room.",
          "**The floor** is a heavier rule with ground hatching beneath it, the architect's symbol for earth.",
          "**The dashed line** across the top is the limit of the visible well. When the stack comes within five rows of it, the line starts to pulse and a **clearance** readout counts the rows left.",
          "**The ghost** is a dashed outline of the piece where it would land; two dotted **projection lines** drop from the piece's edges to the ghost, as in an orthographic drawing.",
          "**The key** shows each piece's material and how many of it you have been dealt.",
          "**The log** lists recent clears as piece number, lines and points.",
          "**To next level** is a row of ten ticks that fill in moss as you clear lines.",
        ] },
        { type: 'p', text: "In your first game a hint draws three dotted gestures around the falling piece: a double arrow beneath it (move), an arc over it (rotate) and a drop line to its ghost, lighting up in turn and labeled for the keyboard or for touch, whichever you used last. It fades once you have placed two pieces." },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is simplified',
      blocks: [
        { type: 'list', items: [
          "T-spins are not detected or scored. The kicks that make them possible are there; the bonus is not.",
          "Pieces appear fully visible in the top two visible rows rather than straddling the top edge, and the hidden buffer is two rows rather than the guideline's taller buffer.",
          "There are no all-clear (perfect clear) bonuses, and the level is capped at 20.",
          "The bot's reachability check is simplified (rotate, then slide), as noted above.",
          "Colours are the site's four accents and ink rather than the guideline's seven hues; mirror pairs share a colour on purpose.",
        ] },
      ],
    },
    {
      id: 'playing',
      kicker: 'Playing well',
      title: 'Advice from the well',
      blocks: [
        { type: 'list', items: [
          "Keep the stack flat. Bumps cost you more than height does until you are near the top.",
          "Leave one column open, usually at an edge, and build the other nine up evenly; when an I arrives, drop it in for four lines.",
          "Use hold for the piece that doesn't fit now (often an I you are saving, or an S or Z when the surface is flat).",
          "Look at the queue, not the falling piece. By the time a piece appears you should already know where it goes.",
          "Trust the ghost and hard drop. Soft drop is for slides under overhangs, which lock delay gives you time for.",
          "Tap to move one cell; hold to sweep to the wall. After the first step, movement repeats every 45 ms.",
          "When the clearance readout appears, stop building for fours and clear whatever you can.",
        ] },
      ],
    },
  ],

  further: [
    { title: 'The Tetris Effect: The Game That Hypnotized the World', by: 'Dan Ackerman', year: '2016', note: 'The history, from the Computing Centre to the Game Boy, and the licensing fight.' },
    { title: 'Tetris: The Games People Play', by: 'Box Brown', year: '2016', note: 'A graphic-novel history of the game and its rights.' },
    { title: 'How to Lose at Tetris', by: 'Heidi Burgiel', year: '1997', note: 'The Mathematical Gazette. Alternating S and Z pieces eventually defeat any player.' },
    { title: 'Tetris is Hard, Even to Approximate', by: 'Erik D. Demaine, Susan Hohenberger, David Liben-Nowell', year: '2003', note: 'The offline game is NP-complete for several objectives.' },
    { title: 'Building Controllers for Tetris', by: 'Christophe Thiery, Bruno Scherrer', year: '2009', note: 'ICGA Journal. A survey of feature-based Tetris players, including Dellacherie’s.' },
    { title: 'El-Tetris – An Improvement on Pierre Dellacherie’s Algorithm', by: 'Islam El-Ashi', year: '2011', note: 'The weights used by this bot.' },
  ],
}

export default guide
