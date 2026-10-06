import type { Guide } from '../guide'

const icons = `<svg viewBox="0 0 330 112" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g fill="currentColor"><rect x="10" y="20" width="9" height="9"/><rect x="21" y="20" width="9" height="9"/><rect x="32" y="20" width="9" height="9"/>
<rect x="50" y="20" width="9" height="9"/><rect x="61" y="20" width="9" height="9"/>
<rect x="90" y="20" width="9" height="9"/><rect x="112" y="20" width="9" height="9"/>
<rect x="130" y="20" width="9" height="9"/>
<rect x="181" y="20" width="9" height="9"/><rect x="192" y="20" width="9" height="9"/>
<rect x="221" y="20" width="9" height="9"/><rect x="272" y="20" width="9" height="9"/></g>
<g><rect x="72" y="20" width="9" height="9"/><rect x="101" y="20" width="9" height="9"/><rect x="141" y="20" width="9" height="9"/><rect x="152" y="20" width="9" height="9"/>
<rect x="170" y="20" width="9" height="9"/><rect x="210" y="20" width="9" height="9"/><rect x="232" y="20" width="9" height="9"/><rect x="250" y="20" width="9" height="9"/><rect x="261" y="20" width="9" height="9"/>
<rect x="290" y="20" width="9" height="9"/><rect x="301" y="20" width="9" height="9"/><rect x="312" y="20" width="9" height="9"/></g>
<g opacity="0.5"><rect x="21" y="32" width="9" height="9"/><rect x="61" y="32" width="9" height="9"/><rect x="101" y="32" width="9" height="9"/><rect x="301" y="32" width="9" height="9"/></g>
<g fill="#3F7A55" stroke="#3F7A55"><rect x="141" y="32" width="9" height="9"/><rect x="181" y="32" width="9" height="9"/><rect x="221" y="32" width="9" height="9"/><rect x="261" y="32" width="9" height="9"/></g>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1" text-anchor="middle">
<text x="25" y="56">0</text><text x="65" y="56">0</text><text x="105" y="56">0</text><text x="145" y="56" fill="#3F7A55">1</text><text x="185" y="56" fill="#3F7A55">1</text><text x="225" y="56" fill="#3F7A55">1</text><text x="265" y="56" fill="#3F7A55">1</text><text x="305" y="56">0</text>
<text x="25" y="12" opacity="0.6">111</text><text x="65" y="12" opacity="0.6">110</text><text x="105" y="12" opacity="0.6">101</text><text x="145" y="12" opacity="0.6">100</text><text x="185" y="12" opacity="0.6">011</text><text x="225" y="12" opacity="0.6">010</text><text x="265" y="12" opacity="0.6">001</text><text x="305" y="12" opacity="0.6">000</text>
<text x="165" y="80">00011110 (binary) = 16 + 8 + 4 + 2 = 30</text>
<text x="165" y="98" opacity="0.6">RULE 30: EACH NEIGHBOURHOOD, AND THE CELL IT MAKES BELOW</text></g>
</svg>`

const guide: Guide = {
  lede:
    'A row of cells, a rule that fits in one byte, and time running down the page: four elementary cellular automata print like woven cloth, from perfect order to chaos. Then the last row comes alive as the Game of Life.',
  facts: [
    ['Rules', '90, 184, 110, 30 — then Life (B3/S23)'],
    ['Neighbourhood', 'Three cells for the elementary rules, eight for Life'],
    ['Boundary', 'Periodic: the row is a ring, Life’s grid a torus'],
    ['Grid', 'About 163 × 141 cells at 1280 × 800'],
    ['Printing', '4.3 s per rule, then a 1.2 s hold'],
    ['Life', '18 generations a second, 115 generations'],
    ['Seed', 'The last row of Rule 30, woven 5, 7 or 9 rows thick'],
    ['Loop', '30 s'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Worlds that fit in a byte',
      blocks: [
        {
          type: 'p',
          text: 'A **cellular automaton** is a world made of cells on a grid. Each cell is in one of a few states — here just two, off and on — and time moves in ticks. At every tick, every cell looks at its neighbourhood and changes its state according to one fixed rule, all cells at once. Nothing else happens. There is no plan, no memory beyond the current state, no long-range force. And yet, depending on the rule, such worlds can stay frozen, settle into clockwork, explode into noise, or produce structures that move, collide and compute.',
        },
        {
          type: 'p',
          text: 'The idea grew up in the 1940s at Los Alamos. Stanisław Ulam was studying the growth of crystals on a lattice, and John von Neumann was trying to imagine a machine that could build a copy of itself. Ulam suggested he think of it as a pattern on a grid of cells, and von Neumann designed a 29-state automaton in which a large pattern does exactly that: reads a description of itself and constructs a copy. His notes were completed and published by Arthur Burks in 1966 as *Theory of Self-Reproducing Automata*.',
        },
        {
          type: 'h',
          text: 'Elementary automata',
        },
        {
          type: 'p',
          text: 'In the early 1980s Stephen Wolfram, then a young physicist at the Institute for Advanced Study, turned to the very simplest case: a single row of cells, two states, and a neighbourhood of three — a cell and its left and right neighbours. A neighbourhood of three binary cells has $2^3 = 8$ possible patterns, and a rule is just a choice of output, 0 or 1, for each of them. There are therefore $2^8 = 256$ such rules, the **elementary cellular automata**. Wolfram gave each a number: write the outputs for the patterns 111, 110, 101 … 000 in that order as an eight-digit binary number, and read it in decimal. That is the *Wolfram code*, and it is why the rules have names like 30 and 110.',
        },
        {
          type: 'figure',
          svg: icons,
          caption: 'Wolfram’s icons for Rule 30. The top three squares are a neighbourhood; the square beneath is the cell it produces on the next row. Read as binary, the eight outputs spell the rule’s number. The piece draws these icons for every rule, and in the viewer they are switches.',
          alt: 'Eight small diagrams of three squares above one square; the outputs 0 0 0 1 1 1 1 0 spell 30 in binary.',
        },
        {
          type: 'p',
          text: 'Because each row depends only on the row above, the whole history of a one-dimensional automaton can be drawn as a picture: space across, time down. Wolfram ran all 256 rules from simple and random starting rows and, in a 1984 paper, sorted their behaviour into four classes: patterns that die out to uniformity (class 1), patterns that settle into stable or periodic structures (class 2), patterns that stay chaotic (class 3), and patterns in which localized structures move and interact in complicated ways (class 4). The four rules in this piece were chosen to walk through that list.',
        },
        {
          type: 'list',
          items: [
            '**Rule 90** is the exclusive-or of a cell’s two neighbours. Started from a single cell it draws Pascal’s triangle modulo 2 — the Sierpiński triangle — exactly, row by row. It is *additive*: the history from any starting row is the overlay, by exclusive-or, of the histories of its individual cells, which makes it completely predictable.',
            '**Rule 184** moves every 1 one step to the right if the cell ahead is empty. Read the 1s as cars and it is the simplest model of traffic: free-flowing cars travel diagonally down the page, and jams appear as solid bands that move backward against the flow. The number of 1s never changes.',
            '**Rule 110** grows from a single cell into a triangle filled with periodic textures and travelling structures. Wolfram conjectured that it could perform any computation, and Matthew Cook proved it in the late 1990s (published in 2004): with a suitable starting row, Rule 110 can simulate any Turing machine. It is the simplest known universal system.',
            '**Rule 30** grows from a single cell into a triangle whose left side is regular and whose interior looks random — so random that Wolfram proposed its centre column as a random-number generator in 1986. It is the clearest example of class 3: deterministic, simple, and for practical purposes unpredictable.',
          ],
        },
        {
          type: 'p',
          text: 'Patterns very like Rule 30’s grow in nature. The shell of the cone snail *Conus textile* is covered in triangles of pigment that look strikingly like an automaton’s history, and for the same reason: the shell grows at its edge, one line at a time, and the pigment cells at the growing edge switch on and off according to their neighbours. Hans Meinhardt’s *The Algorithmic Beauty of Sea Shells* models such patterns with reaction–diffusion equations.',
        },
        {
          type: 'h',
          text: 'Weaving',
        },
        {
          type: 'p',
          text: 'A one-dimensional automaton printed row by row is very close to weaving. A loom also builds cloth one row — one pass of the weft — at a time, and each row of a pattern depends on a rule applied across the width. Joseph-Marie Jacquard’s loom of 1804 read its patterns from chains of punched cards, and those cards in turn inspired Charles Babbage’s Analytical Engine. Ada Lovelace drew the connection herself:',
        },
        {
          type: 'quote',
          text: 'We may say most aptly, that the Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.',
          cite: 'Ada Lovelace, Note A to her translation of Menabrea’s memoir, 1843',
        },
        {
          type: 'h',
          text: 'Life',
        },
        {
          type: 'p',
          text: 'In 1970 the Cambridge mathematician John Horton Conway, after much experiment, settled on a two-dimensional rule that balanced growth and death so finely that nobody could predict what a pattern would do. Each cell has eight neighbours. A dead cell with exactly three live neighbours is born; a live cell with two or three live neighbours survives; every other cell dies or stays dead. Martin Gardner described it in his *Mathematical Games* column in *Scientific American* in October 1970, and the **Game of Life** became perhaps the most famous computer experiment of its era — run on university mainframes late at night across the world.',
        },
        {
          type: 'p',
          text: 'Within weeks Richard Guy found the **glider**, a five-cell shape that reassembles itself one cell diagonally away every four generations, and that November Bill Gosper found the *glider gun*, which emits a new glider every thirty generations — answering Conway’s question of whether a finite pattern could grow forever. With guns, gliders and the right collisions one can build logic gates, and Elwyn Berlekamp, Conway and Guy showed in *Winning Ways for Your Mathematical Plays* (1982) that Life is, like Rule 110, a universal computer. The rule is usually written **B3/S23**: born with 3, survives with 2 or 3.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'One byte, eight bits',
      blocks: [
        {
          type: 'p',
          text: 'Let $x_i^t \\in \\{0, 1\\}$ be the state of cell $i$ at time $t$, and write the neighbourhood as a three-bit number',
        },
        {
          type: 'math',
          tex: 'n_i^t = 4\\, x_{i-1}^t + 2\\, x_i^t + x_{i+1}^t \\in \\{0, 1, \\ldots, 7\\}',
          label: '(1)',
        },
        {
          type: 'p',
          text: 'A rule is a function $f$ from those eight patterns to $\\{0, 1\\}$, and its Wolfram number $W$ packs the eight outputs into a byte. The next state is simply bit $n$ of $W$:',
        },
        {
          type: 'math',
          tex: 'W = \\sum_{n=0}^{7} f(n)\\, 2^n, \\quad x_i^{t+1} = \\lfloor \\frac{W}{2^{n_i^t}} \\rfloor \\text{ mod } 2',
          label: '(2)',
          caption: 'In code this is one shift and one mask: `(rule >> n) & 1`.',
        },
        {
          type: 'p',
          text: 'The four rules in the piece can also be written as Boolean formulas, which explains their characters:',
        },
        {
          type: 'table',
          head: ['Rule', 'Binary', 'Formula', 'Character'],
          rows: [
            ['90', '01011010', '$l \\text{ xor } r$', 'Additive; the Sierpiński triangle'],
            ['184', '10111000', '$(l \\text{ and not } c) \\text{ or } (c \\text{ and } r)$', 'Conserves the number of 1s; traffic'],
            ['110', '01101110', '$(c \\text{ xor } r) \\text{ or } (c \\text{ and not } l)$', 'Class 4; universal'],
            ['30', '00011110', '$l \\text{ xor } (c \\text{ or } r)$', 'Class 3; chaotic'],
          ],
          caption: '$l$, $c$ and $r$ are the left, centre and right cells of the neighbourhood.',
        },
        {
          type: 'h',
          text: 'Why Rule 90 draws a triangle',
        },
        {
          type: 'p',
          text: 'Because exclusive-or is addition modulo 2, Rule 90 is linear: $x_i^{t+1} = x_{i-1}^t + x_{i+1}^t$ (mod 2). Starting from a single 1, the value at row $t$ and offset $j$ is the number of ways to reach it by $t$ steps of ±1, taken mod 2 — the binomial coefficient $\\frac{t!}{m!\\,(t-m)!}$ with $m = (t+j)/2$. Pascal’s triangle mod 2 is the Sierpiński triangle, so the picture is a fractal: every triangle contains three half-size copies of itself, and the large empty triangles open at rows 32, 64, 128 …',
        },
        {
          type: 'h',
          text: 'Traffic on a ring',
        },
        {
          type: 'p',
          text: 'Rule 184 conserves the number of cars, $\\sum_i x_i^{t+1} = \\sum_i x_i^t$, because a car either stays or moves into the empty cell ahead, and no car is created or destroyed. With density $\\rho$ (the fraction of 1s) the long-run behaviour has two regimes. If $\\rho \\leq 1/2$ every jam eventually dissolves and all cars move every step. If $\\rho > 1/2$ there are not enough gaps; jams persist and travel backward at one cell per step, and the flow of cars settles to',
        },
        {
          type: 'math',
          tex: 'q(\\rho) = \\min(\\rho,\\, 1 - \\rho)',
          label: '(3)',
          caption: 'The fundamental diagram of the simplest traffic model. The piece seeds Rule 184 at a density of about 0.6, so jams survive long enough to be seen moving uphill against the diagonal flow.',
        },
        {
          type: 'h',
          text: 'Life, and mirrors',
        },
        {
          type: 'p',
          text: 'For Life, let $s$ be the number of live cells among the eight neighbours. The rule, and the generalizations the piece lets you try, are',
        },
        {
          type: 'math',
          tex: 'x^{t+1} = 1 \\text{ if } (x^t = 0 \\text{ and } s \\in B) \\text{ or } (x^t = 1 \\text{ and } s \\in S), \\text{ else } 0; \\quad B = \\{3\\},\\; S = \\{2, 3\\}',
          label: '(4)',
          caption: 'Conway’s Life is B3/S23. Other choices of $B$ and $S$ give different worlds: HighLife (B36/S23) has a pattern that copies itself; Seeds (B2/S) explodes.',
        },
        {
          type: 'p',
          text: 'The rule depends only on how many neighbours are alive, not on where they are, so it treats a pattern and its mirror image identically. A starting pattern that is symmetric about a line stays symmetric forever. The piece seeds Life with Rule 30’s last row repeated in an odd number of identical rows, symmetric about the middle one, which is why the growth that follows is always a perfect vertical mirror, like an ink blot.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'A loom, a layer and a torus',
      blocks: [
        {
          type: 'p',
          text: 'The piece keeps one row of cells as a `Uint8Array`, and stepping a rule is a single pass with the neighbourhood packed into three bits. The row wraps around, so the leftmost cell’s left neighbour is the rightmost cell: the cloth is really a cylinder, which is why Rule 30’s triangle, on reaching the edges, folds back into itself and fills the width.',
        },
        {
          type: 'code',
          code: `function stepRow(rule: number) {
  for (let i = 0; i < cols; i++) {
    const l = row[(i + cols - 1) % cols]
    const c = row[i]
    const r = row[(i + 1) % cols]
    next[i] = (rule >> ((l << 2) | (c << 1) | r)) & 1
  }
  const t = row
  row = next
  next = t
}`,
          caption: 'Equation (2) as code. Two buffers swap roles each step, so nothing is allocated.',
        },
        {
          type: 'h',
          text: 'Printing into a layer',
        },
        {
          type: 'p',
          text: 'A full textile is 20,000 or more cells, and redrawing every one of them sixty times a second would be wasteful when only one row changes. The cloth therefore lives in an offscreen canvas at the screen’s pixel density. Each new row is painted into it once — a strip of paper, then the row’s live cells as small squares with a hairline gap, all in one path and one `fill()` — and every frame draws the whole layer with a single `drawImage`. The loom head, the frame and the label are drawn on top.',
        },
        {
          type: 'code',
          code: `function paintRow(r: number, color: string) {
  beginLayer()
  const y = r * cs
  lctx.fillStyle = C.paper
  lctx.fillRect(0, y, fw, cs)
  const g = gap()
  const s = cs - g
  lctx.fillStyle = color
  lctx.beginPath()
  for (let i = 0; i < cols; i++) if (row[i]) lctx.rect(i * cs + g / 2, y + g / 2, s, s)
  lctx.fill()
}`,
        },
        {
          type: 'p',
          text: 'When a new rule begins, the old cloth is not cleared. The layer is washed with paper at 80% opacity, so the previous textile fades to a ghost, and the new rule prints over it from the top. The loom head itself is the page wipe: above it the new pattern, below it the faded old one. The number of rows to show is a function of time, and a small synchronizer brings the layer up to date: it prints any missing rows, finishes a rule that was left half-printed before starting the next, and — if the time has jumped (a resize, or a tap that skips ahead) — rebuilds the layer from scratch by replaying the previous rule and the current one. Rules are cheap to replay, so the picture is always exactly what the clock says.',
        },
        {
          type: 'h',
          text: 'Life on a torus',
        },
        {
          type: 'p',
          text: 'Life runs on the same grid, wrapped top to bottom as well as side to side, so its world is a torus. Counting eight neighbours for every cell is the inner loop, and the piece uses a sliding window: it keeps the sums of the three columns around the current cell and, moving one cell right, drops the left column and adds a new right one. That is three reads per cell instead of eight.',
        },
        {
          type: 'code',
          code: `// column sums of the three rows: left, centre, right
let cl = L[ym + W - 1] + L[y0 + W - 1] + L[yp + W - 1]
let cc = L[ym] + L[y0] + L[yp]
for (let x = 0; x < W; x++) {
  const xr = x === W - 1 ? 0 : x + 1
  const cr = L[ym + xr] + L[y0 + xr] + L[yp + xr]
  const alive = L[y0 + x]
  const n = cl + cc + cr - alive
  const v = ((alive ? survive : birth) >> n) & 1
  N[y0 + x] = v
  born[y0 + x] = v & (alive ^ 1)
  died[y0 + x] = alive & (v ^ 1)
  count += v
  cl = cc
  cc = cr
}`,
          caption: 'One row of a Life generation. `birth` and `survive` are nine-bit masks — bit $s$ is set if $s$ neighbours cause a birth or allow survival — so editing the rule in the viewer costs nothing.',
        },
        {
          type: 'p',
          text: 'A single row is a poor seed for Life: no cell in it has more than two live neighbours, so almost nothing is born and the row dies within a few generations. The piece thickens Rule 30’s last row into a band of identical rows. How lively the result is depends, chaotically, on the width of the grid, so each time the layout changes the piece rehearses all three thicknesses — five, seven and nine rows — for the full 115 generations, out of sight, and keeps the one with the most cells alive at the end. The label says which it chose.',
        },
        {
          type: 'p',
          text: 'Cells born in the latest generation are drawn in moss, older living cells in ink, and cells that have just died leave a faint hairline square for one generation, so the motion of gliders and oscillators reads in a single still frame. The population sparkline under the rule shows the count for every generation so far.',
        },
        {
          type: 'h',
          text: 'Your edits',
        },
        {
          type: 'p',
          text: 'In the viewer the eight icons are switches. Tapping one flips that bit of the rule: the number changes (flip the 100 icon of Rule 30 and you have Rule 14), the title says *Your rule*, and the cloth reprints from the top with the same starting row. The piece keeps its own clock, so it can jump back to the start of the print. In Life the nine neighbour counts of the birth and survival rows are switches too; the change applies from the next generation, without restarting, so you can watch a world change its physics mid-flight. Edits last until the loop comes round again.',
        },
        {
          type: 'code',
          code: `if (hit.kind === 'bit' && phase < RULES.length) {
  custom.set(phase, ruleOf(phase) ^ (1 << hit.n))
  if (custom.get(phase) === RULES[phase].n) custom.delete(phase)
  env.sfx.tone(330 * (1 + hit.n / 8), 0.12, { type: 'triangle', gain: 0.06 })
  restartPhase(phase)
} else if (hit.kind === 'birth') {
  rulesB ^= 1 << hit.n
} else if (hit.kind === 'survive') {
  rulesS ^= 1 << hit.n
}`,
          caption: 'Flipping a bit is an exclusive-or with a power of two.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'What the annotations say',
      blocks: [
        {
          type: 'table',
          head: ['Mark', 'Meaning'],
          rows: [
            ['Rule and number', 'The rule printing now, in its dye: ocean for 90, lagoon for 184, moss for 110, ink for 30.'],
            ['Note', 'Its class or character; *Edited from Rule n* after you change it.'],
            ['Binary', 'The rule’s eight outputs as a byte, and its decimal value.'],
            ['Icons', 'The eight neighbourhoods, filled squares on, and the cell each one makes. The digit under each is its output.'],
            ['Bars above the icons', 'How often each neighbourhood occurs in the row being printed (scaled ×3).'],
            ['Loom head', 'The horizontal line and triangle moving down the cloth; the number beside it is the current row.'],
            ['ROW, DENSITY, GRID', 'Rows printed, the fraction of live cells in the last row, and the grid size.'],
            ['SPACE → / ← TIME', 'The axes: each row is one moment; time runs down the page.'],
            ['Birth and survive', 'In Life, the neighbour counts 0–8 that cause a birth or allow survival, filled when part of the rule.'],
            ['Moss cells', 'Born this generation. Hairline squares are cells that just died.'],
            ['Population', 'Live cells per generation, as a sparkline.'],
          ],
          caption: 'On short or narrow screens the notes, the binary and some readouts are dropped; the number, the icons and the cloth stay.',
        },
        {
          type: 'h',
          text: 'The thirty seconds',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**0–5.5 s, Rule 90.** From one cell, the Sierpiński triangle; on the first pass it prints on blank paper, afterwards over the last Life.',
            '**5.5–11 s, Rule 184.** From a random row about 60% full: diagonal streams and backward-moving jams.',
            '**11–16.5 s, Rule 110.** From one cell near the right edge, a triangle growing leftward at one cell per row, full of gliders on a periodic background.',
            '**16.5–22 s, Rule 30.** From one cell, chaos inside a widening triangle that wraps and fills the cloth.',
            '**22–23 s, the lift.** The cloth fades; its last row rises to the middle and thickens.',
            '**23–30 s, Life.** The band burns outward in a mirror-symmetric pattern, leaving still lifes, blinkers and the odd pair of gliders.',
          ],
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'Where the cloth is finite',
      blocks: [
        {
          type: 'list',
          items: [
            '**Wrapped edges.** Elementary automata are usually studied on an infinite row. A finite ring means patterns eventually meet themselves; Rule 30’s and Rule 90’s triangles wrap around and interfere after they reach the edges.',
            '**A few hundred rows.** The cloth shows about 140 generations, and Life runs for 115. Long-run behaviour — the eventual cycle every finite automaton must fall into — is never reached.',
            '**The thickened seed.** Seeding Life with several copies of one row is a device for the picture, not a standard construction, and the choice among thicknesses is made for liveliness.',
            '**Colour.** The dyes are decoration; every rule here has only two states.',
            '**Classes are informal.** Wolfram’s four classes are a description, not a theorem; some rules sit between them, and which class a rule belongs to can depend on its starting row.',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['1–8'], action: 'Flip a bit of the rule (icons left to right) and reprint' },
      { keys: ['0–8', 'Shift + 0–8'], action: 'In Life: toggle a birth count, or with Shift a survival count' },
      { keys: ['R'], action: 'Reset the rule you edited' },
      { keys: ['→', 'Space', 'Enter'], action: 'Next rule' },
      { keys: ['←'], action: 'Back to the start of this rule, or the one before' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Tap an icon to flip its bit; the cloth reprints with the new rule' },
      { gesture: 'tap', action: 'In Life, tap a neighbour count to add it to or remove it from the rule' },
      { gesture: 'tap', action: 'Tap the cloth to move on to the next rule' },
    ],
    tip: 'Flip one icon of Rule 30 at a time and see how few bits separate chaos from order. In Life, add 6 to the birth row to make HighLife.',
  },
  further: [
    { title: 'Statistical mechanics of cellular automata', by: 'Stephen Wolfram', year: '1983', note: '*Reviews of Modern Physics* 55. The numbering of the 256 rules.' },
    { title: 'Universality and complexity in cellular automata', by: 'Stephen Wolfram', year: '1984', note: '*Physica D* 10. The four classes.' },
    { title: 'A New Kind of Science', by: 'Stephen Wolfram', year: '2002', note: 'The long version, with Rule 30 and Rule 110 throughout.' },
    { title: 'Universality in elementary cellular automata', by: 'Matthew Cook', year: '2004', note: '*Complex Systems* 15(1). Rule 110 is universal.' },
    { title: 'The fantastic combinations of John Conway’s new solitaire game “life”', by: 'Martin Gardner', year: '1970', note: '*Scientific American*, October. Life’s first appearance.' },
    { title: 'Winning Ways for Your Mathematical Plays', by: 'Elwyn Berlekamp, John H. Conway, Richard K. Guy', year: '1982', note: 'Includes the proof that Life is universal.' },
    { title: 'Theory of Self-Reproducing Automata', by: 'John von Neumann, edited and completed by Arthur W. Burks', year: '1966' },
    { title: 'A cellular automaton model for freeway traffic', by: 'Kai Nagel and Michael Schreckenberg', year: '1992', note: '*Journal de Physique I* 2. Rule 184 grown into a real traffic model.' },
    { title: 'The Algorithmic Beauty of Sea Shells', by: 'Hans Meinhardt', year: '1995' },
  ],
}

export default guide
