import type { Guide } from '../guide'

/*
 * Notes for games/formation — after Space Invaders (Taito, 1978).
 */

const ripple = `<svg viewBox="0 0 330 126" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g font-family="ui-monospace, monospace" font-size="7.5" fill="currentColor" stroke="none" letter-spacing="1">
<text x="2" y="21">TICK 0</text><text x="2" y="58">TICK 4</text><text x="2" y="95">TICK 8</text>
<text x="58" y="122">ONE INVADER MOVES PER TICK · ARROW: NEXT TO MOVE</text>
</g>
<g>
<rect x="58" y="12" width="11" height="9"/><rect x="82" y="12" width="11" height="9"/><rect x="106" y="12" width="11" height="9"/><rect x="130" y="12" width="11" height="9"/><rect x="154" y="12" width="11" height="9"/><rect x="178" y="12" width="11" height="9"/><rect x="202" y="12" width="11" height="9"/><rect x="226" y="12" width="11" height="9"/><rect x="250" y="12" width="11" height="9"/><rect x="274" y="12" width="11" height="9"/><rect x="298" y="12" width="11" height="9"/>
<rect x="154" y="49" width="11" height="9"/><rect x="178" y="49" width="11" height="9"/><rect x="202" y="49" width="11" height="9"/><rect x="226" y="49" width="11" height="9"/><rect x="250" y="49" width="11" height="9"/><rect x="274" y="49" width="11" height="9"/><rect x="298" y="49" width="11" height="9"/>
<rect x="250" y="86" width="11" height="9"/><rect x="274" y="86" width="11" height="9"/><rect x="298" y="86" width="11" height="9"/>
</g>
<g stroke="#2B6A93">
<rect x="64" y="49" width="11" height="9"/><rect x="88" y="49" width="11" height="9"/><rect x="112" y="49" width="11" height="9"/><rect x="136" y="49" width="11" height="9"/>
<rect x="64" y="86" width="11" height="9"/><rect x="88" y="86" width="11" height="9"/><rect x="112" y="86" width="11" height="9"/><rect x="136" y="86" width="11" height="9"/><rect x="160" y="86" width="11" height="9"/><rect x="184" y="86" width="11" height="9"/><rect x="208" y="86" width="11" height="9"/><rect x="232" y="86" width="11" height="9"/>
</g>
<g stroke-dasharray="1.5 2.5"><path d="M159.5 63v6M255.5 100v6"/></g>
<path d="M156 69l3.5 4 3.5-4M252 106l3.5 4 3.5-4"/>
</svg>`

const guide: Guide = {
  lede: 'Fifty-five pixel creatures, traced in hairline and lightly hatched, march toward four bunkers that erode cell by cell. A close study of Tomohiro Nishikado’s 1978 game, whose hardware limit became its most famous rule: the fewer invaders remain, the faster they come.',
  facts: [
    ['After', 'Space Invaders · Taito, 1978'],
    ['Designer', 'Tomohiro Nishikado'],
    ['Original hardware', 'Intel 8080 board, black-and-white monitor with color overlays'],
    ['Formation', '5 rows × 11 columns, three species'],
    ['March', 'One invader moves per tick, 66–96 ticks a second'],
    ['Scoring', '10 · 20 · 30 per invader, saucer 50–300'],
    ['Playfield', '480 × 400 units, letterboxed'],
    ['Bot', 'A threat map over 37 positions, lead-aimed fire'],
    ['Sound', 'Four descending bass notes, A–G–F–E'],
  ],
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'A machine built for one game',
      blocks: [
        {
          type: 'p',
          text: 'Space Invaders was designed by Tomohiro Nishikado at Taito and released in Japan in 1978, with Midway licensing it for North America the same year. Nishikado did more than design the game: microprocessor-driven arcade machines were still new, and he built the hardware himself around Intel’s 8080 so that the screen could hold a whole army of moving figures at once.',
        },
        {
          type: 'p',
          text: 'He has said that Atari’s *Breakout* (1976) was a starting point — the pleasure of clearing a wall of targets one by one — and that the creatures owe something to H. G. Wells’s *The War of the Worlds*. Accounts of the development describe earlier ideas built around tanks and aircraft before the targets became aliens. What survived every version was the structure: a field of targets that does not wait for you.',
        },
        {
          type: 'p',
          text: 'That is the real invention. Earlier target games were patient; nothing happened unless you acted. Here the targets advance, shoot back and close the distance on their own schedule, so the game has a clock built into its geometry. You lose a base when you are careless, but you lose the whole game if you are merely slow. Every later fixed shooter — *Galaxian*, *Galaga* and their descendants — inherits that pressure.',
        },
        {
          type: 'p',
          text: 'The cabinet was a study in making do. The monitor was black and white and mounted on its side to give a tall playfield; strips of colored film on the glass tinted the band near the bottom green and the band at the top red, so the bunkers and the saucer appeared in color without any color hardware at all. The game also kept a high score on screen, which gave a public, repeatable reason to put in another coin.',
        },
        {
          type: 'aside',
          title: 'What this piece keeps',
          text: 'The 5 × 11 formation, the three species and their point values, the ripple march and the speed-up it causes, the drop-and-reverse at the edges, the four-note bass line, four destructible bunkers, one player shot at a time, three kinds of falling shot, a mystery saucer whose score comes from a shot-count table, invasion as instant defeat, and later waves that start lower. Everything is redrawn as a technical drawing: no filled pixels, no glow, only lines on paper.',
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Step, step, drop',
      blocks: [
        {
          type: 'p',
          text: 'Five rows of eleven invaders hang above four bunkers. The formation steps sideways a few units at a time. When any invader in it would cross the margin, the next step is a drop of one row, and the direction reverses. The player’s cannon slides along the ground line and may have only **one shot on screen**: until it hits something or leaves the top, the fire button does nothing.',
        },
        {
          type: 'p',
          text: 'Invaders fire from the lowest live invader in a column. Their shots fall straight down and stop at the first thing they touch: a bunker cell, the cannon, the ground, or the player’s own shot, which cancels them in a small burst. A hit on the cannon costs a base. If any invader reaches the cannon’s row, the invasion has succeeded and the game ends at once, however many bases are left.',
        },
        {
          type: 'table',
          head: ['Target', 'Points', 'Notes'],
          rows: [
            ['Top row (ocean)', '30', 'The smallest silhouette, eight pixels wide'],
            ['Rows two and three (lagoon)', '20', 'Eleven pixels wide, antennae up'],
            ['Rows four and five (moss)', '10', 'Twelve pixels wide, the broadest target'],
            ['Saucer (fern)', '50–300', 'Read from a fixed table by your shot count'],
            ['Bonus base', '1,500', 'One extra cannon, once per game'],
          ],
          caption: 'Scoring in the piece, which follows the original’s values.',
        },
        {
          type: 'p',
          text: 'The bunkers are the only cover. Each is a block of 16 × 11 small cells; every hit, from above or below, knocks a ragged hole a few cells across, and invaders that sink low enough to overlap a bunker erase whatever they touch. A wave ends when the last invader falls. The next one starts ten units lower (through the eighth wave), shoots more often and with faster shots, and the bunkers are rebuilt.',
        },
        {
          type: 'p',
          text: 'The saucer crosses the top lane every twenty seconds or so while at least eight invaders remain. Its score is not random. As in the original, it is read from a fifteen-entry table indexed by how many shots you have fired, so a player who keeps count can arrange to hit it on the shot that pays 300.',
        },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Why they speed up',
      blocks: [
        {
          type: 'p',
          text: 'The most famous behavior in *Space Invaders* was not designed in the usual sense. The program does not move the whole formation at once; it updates **one invader each time through its main loop**, roughly once a video frame, working through the formation in a fixed order. A full step of a full formation therefore takes about fifty-five passes. Destroy invaders and there are fewer to visit, so each survivor comes up for its turn more often. The formation accelerates as it thins. Nishikado has described noticing this and keeping it, because it made the end of each wave tense in a way he could not have tuned by hand.',
        },
        {
          type: 'p',
          text: 'Two visible consequences follow, and the piece keeps both. First, a step is not instantaneous: it travels through the formation like a ripple, so for a moment the moved invaders sit a few units ahead of the rest. Second, the last invader moves every frame and becomes the fastest thing in the game. If $N$ invaders remain, each moves by $d$ once per pass, and a pass takes $N$ ticks of length $\\Delta t$:',
        },
        { type: 'math', tex: 'v(N) = \\frac{d}{N \\, \\Delta t}', label: '(1)', caption: 'Formation speed is inversely proportional to the number of invaders left.' },
        {
          type: 'p',
          text: 'In the piece, $d = 5$ units and $\\Delta t = 1/66$ s on the first wave, so a full formation creeps at about 6 units a second, ten survivors manage 33, and the last one — whose tick is capped at a thirtieth of a second and whose step grows to 6 units — crosses at 180, the whole field in under three seconds.',
        },
        { type: 'figure', svg: ripple, caption: 'The ripple. With one invader moved per tick, a step sweeps along the row; the accent marks invaders that have already moved.', alt: 'Three rows of eleven small squares at tick 0, 4 and 8; in each later row more of the squares on the left have shifted right by one step.' },
        {
          type: 'p',
          text: 'The sound follows the same clock. The march is four descending bass notes, one per completed step of the formation, so the music speeds up exactly as the invaders do; players describe it as a heartbeat. The alien shots come in three varieties, which commented disassemblies of the program call the rolling, plunger and squiggly shots, and one of them is aimed at the column the player is standing in. The saucer’s score, as above, comes from a table indexed by the number of shots fired, which is why serious players counted.',
        },
        {
          type: 'aside',
          title: 'Limits as material',
          text: 'Much of what makes the game feel alive — the acceleration, the ripple, the frantic last invader — comes from the cost of drawing on 1978 hardware. The piece reproduces those effects on purpose, with a modern renderer that could move every invader at once, because they are the game.',
        },
      ],
    },
    {
      id: 'bot',
      kicker: 'The bot',
      title: 'How the demo plays',
      blocks: [
        {
          type: 'p',
          text: 'In the preview card and behind the title, a bot plays. It uses the same cannon, the same speed (168 units a second) and the same one-shot rule as you; it simply decides faster. Each frame it does three things: picks a target, scores every place it could stand, and decides whether to fire.',
        },
        { type: 'h', text: 'Choosing a target' },
        {
          type: 'p',
          text: 'Every live invader gets a score of $1.6\\,y - 0.35\\,|x - x_\\text{cannon}|$, minus 40 if a bunker stands between the cannon and it. Lower invaders win because they are closer to ending the game; nearby ones break ties. The bot then predicts where that invader will be when a shot fired now arrives. The formation’s average speed is the step size divided by the time a full pass takes, and the prediction reflects off the margins, because the formation will reverse there. When the formation is still high and the saucer is within reach, the saucer takes priority.',
        },
        { type: 'h', text: 'A threat map' },
        {
          type: 'p',
          text: 'The bot evaluates 37 candidate positions, from 90 units left of the cannon to 90 right in steps of 5. Each starts with a cost of 0.9 per unit of distance from the aim point. Then every falling shot the bot has noticed adds danger: 900 × (1.6 − $t$) if the candidate lies within 16 units of a shot that arrives in $t$ seconds, and 350 more if getting there means crossing under a shot at the moment it lands. Shots that a bunker will stop are ignored. The cheapest candidate wins, and the cannon moves toward it at full speed.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `// the shots that matter: noticed, not yet past the cannon, not stopped by a bunker
threatN = 0
for (const s of ishots) {
  if (clock < s.seen || s.y - 6 > PY + 8) continue
  const tA = Math.max(0, (PY - 10 - s.y) / s.vy)
  if (tA > 1.5 || shielded(s.x, s.y)) continue
  threatX[threatN] = s.x
  threatT[threatN++] = tA
}
// threat map over candidate positions
for (let c = px - 90; c <= px + 90; c += 5) {
  if (c < 16 || c > LW - 16) continue
  let cost = Math.abs(c - botAim) * 0.9
  for (let k = 0; k < threatN; k++) {
    const sx = threatX[k]
    const tA = threatT[k]
    if (Math.abs(c - sx) < 16) cost += 900 * (1.6 - tA)
    const lo = Math.min(px, c) - 12
    const hi2 = Math.max(px, c) + 12
    if (sx > lo && sx < hi2) {
      const tX = Math.abs(sx - px) / PSPEED
      if (Math.abs(tX - tA) < 0.28) cost += 350
    }
  }
  if (cost < bestC) { bestC = cost; bestX = c }
}`,
          caption: 'From `botThink` in formation.ts: filter the threats once, then price every candidate position.',
        },
        { type: 'h', text: 'When to fire' },
        {
          type: 'p',
          text: 'The bot fires when its shot is free, when no bunker is overhead, and when *any* live invader is predicted to be over the cannon — within 70 percent of its half-width — at the moment the shot would arrive. Checking every invader rather than only the target means it takes good chances as they pass, which matters most at the end of a wave, when the last few invaders are moving too fast to chase.',
        },
        { type: 'h', text: 'Its blind spots' },
        {
          type: 'list',
          items: [
            'It notices each new shot after a random delay of up to 0.45 seconds, and about one shot in seventeen it never notices at all. That is deliberate: a demo that never dies is dull, and these lapses are where it loses bases.',
            'It does not plan around the bunkers. It will happily shoot its way through its own cover and stand in the open afterward.',
            'It does not count shots, so it collects whatever the saucer table happens to give.',
            'Its prediction treats the formation as moving steadily and ignores the short pause of a drop pass, so with two or three fast survivors it sometimes fires a fraction early.',
          ],
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'Drawing an arcade screen as a plate',
      blocks: [
        {
          type: 'p',
          text: 'The game runs on a fixed logical playfield of 480 × 400 units, letterboxed into whatever space the viewer offers, and every line is drawn one CSS pixel wide by setting the line width to the reciprocal of the current scale. A small state machine — attract, title, play, over — runs the bot behind the title and game-over cards, so the screen is never still. Randomness comes from a seeded generator, so the same moment always looks the same.',
        },
        { type: 'h', text: 'Pixels as silhouettes' },
        {
          type: 'p',
          text: 'Each creature starts as a grid of characters, eight to twelve columns by eight rows, in two animation frames. Instead of filling the grid, the piece traces its silhouette: it walks every boundary between a filled and an empty cell, merges neighbors into long runs, and stores the result as a `Path2D`. Holes for eyes are traced too, so they read as drawn rather than missing. A second path adds a diagonal stroke to every other filled cell; because the strokes line up across neighboring cells, they form a continuous light hatch.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function buildSprite(rows: string[], px = PX): Sprite {
  const h = rows.length
  const w = rows[0].length
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] === '#'
  const ox = (-w * px) / 2
  const oy = (-h * px) / 2
  const edge = new Path2D()
  for (let y = 0; y <= h; y++) {
    let run = -1
    for (let x = 0; x <= w; x++) {
      const e = x < w && on(x, y - 1) !== on(x, y)
      if (e && run < 0) run = x
      if (!e && run >= 0) {
        edge.moveTo(ox + run * px, oy + y * px)
        edge.lineTo(ox + x * px, oy + y * px)
        run = -1
      }
    }
  }
  // … the same again for vertical edges, then the hatch path
}`,
          caption: 'Tracing horizontal edges: an edge exists wherever the cell above differs from the cell below.',
        },
        { type: 'h', text: 'The march' },
        {
          type: 'p',
          text: 'The formation is a flat list of 55 invaders ordered bottom-left first, plus a cursor. Time accumulates in `tickAcc`; each time it passes one tick interval, `marchTick` moves the next live invader by one step (or one drop) and flips its animation frame. When the cursor runs off the end, `endPass` plays the next bass note and checks the margins to decide whether the coming pass is a drop. The tick interval is the larger of $1/66$ s and $1/(30N)$ s, which keeps one invader from moving more than thirty times a second.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function marchTick() {
  while (cursor < invs.length && !invs[cursor].alive) cursor++
  if (cursor >= invs.length) {
    endPass()
    while (cursor < invs.length && !invs[cursor].alive) cursor++
    if (cursor >= invs.length) return
  }
  const v = invs[cursor++]
  if (dropping) v.y += DROP
  else v.x += dirX * stepDx()
  v.frame ^= 1
  // invaders chew through bunkers they overlap …
  if (v.y + sp.hh >= PY - 7) invaded = true
}`,
          caption: 'One invader per tick. The speed-up needs no code of its own; it falls out of the loop.',
        },
        {
          type: 'p',
          text: 'An early version of this loop spent a tick on the end-of-pass bookkeeping itself, which quietly made two surviving invaders a third slower than intended; the bot’s predictions missed until the bookkeeping was folded into the same tick as the next move.',
        },
        { type: 'h', text: 'Bunkers, shots and collisions' },
        {
          type: 'p',
          text: 'Each bunker is a `Uint8Array` of 176 cells of 3 units. A hit clears every cell within 1.2 cells of the impact and, with a 55 percent chance, each cell out to 2.5, offset upward or downward with the shot’s direction, which gives the familiar bitten profile. The outline and hatch are rebuilt into a cached path only when a bunker changes. The hatch uses the same alternate-diagonal trick as the creatures, so a bunker reads as a single hatched solid until it is hit.',
        },
        {
          type: 'p',
          text: 'Shots move in sub-steps of 3 units so that nothing tunnels through a thin target. Hitboxes lean toward the player: an invader can be hit a little outside its drawn edge (1.2 units to either side, 1.5 above and below), while the cannon, drawn 24.7 units wide, can only be hit within 9 units of its center. The player’s shot is 440 units a second; invader shots start at 140 and gain 9 a wave.',
        },
        { type: 'h', text: 'Juice, in linework' },
        {
          type: 'list',
          items: [
            'Kills are starbursts: ten short rays that expand and fade over a third of a second, plus a few sparks in the species color. The march pauses for 90 milliseconds after each kill, a small hit-stop that makes every shot land.',
            'A dashed selection box with corner ticks follows the live formation, like a selection in a drawing program, labeled with the count `N` and the current steps per second.',
            'A tick gauge on the left margin carries a small triangle at the formation’s lowest edge, turning to ocean blue as it nears the bunkers.',
            'The ground line is nicked wherever an invader shot lands, so a long wave leaves a broken line behind it.',
            'The saucer carries a small dimension line beneath it and the label `? PTS`; its score floats up from where it was hit.',
            'The march plays a triangle tone at twice the bass frequency over a quiet sine at the fundamental, low-passed and short, with a minimum gap of 85 milliseconds between notes so the last invader’s tempo stays musical.',
          ],
        },
        { type: 'h', text: 'Small screens and first play' },
        {
          type: 'p',
          text: 'Fine annotations — the selection box labels, the ground and `X` readouts, the saucer label — appear only when the field is drawn at more than 1.1 pixels per unit; below that they would be smaller than a legible mono label. Banners and score pop-ups are set in screen pixels with a minimum size, so they stay readable on a phone held sideways. The first time you play, a ghost of the gesture appears: a dotted track through the cannon with a dot and a faint cannon sliding along it, and a dotted line climbing from the barrel. Each fades once you have done it, and both go with your first kill.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is different',
      blocks: [
        {
          type: 'p',
          text: 'This is an homage, not an emulation. The behaviors that define the game are reproduced on purpose; the numbers behind them are tuned by hand rather than copied cycle for cycle, and some details are simplified or redrawn.',
        },
        {
          type: 'list',
          items: [
            '**The field is wider than it is tall.** The original screen is a tall portrait rectangle; this one is 480 × 400 so it sits well in a landscape viewer, which gives the formation a little more room to travel before each drop.',
            '**The creatures are new drawings.** They follow the original’s sizes — eight, eleven and twelve pixels wide, eight tall, two frames each — but the pixel patterns are drawn for this piece.',
            '**Shot targeting is simpler.** Shots rotate through three kinds; the first aims at the column nearest the cannon and the other two pick a column at random. The original’s column tables and per-type timing are not reproduced.',
            '**The saucer runs on a timer**, every 20–28 seconds while eight or more invaders remain, entering from a side chosen by your shot count.',
            '**The bunkers are coarser.** Their cells are three units square, larger than the original’s single pixels, so damage reads at a distance and the hatching has room.',
            '**One player, one setting.** There is no two-player alternation and no operator menu; the bonus base always arrives at 1,500 points.',
          ],
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
            '**Clear from the bottom.** Every row you remove from the bottom buys you a drop of headroom, and the bottom rows are the ones that fire.',
            '**Thin the ends, not the middle.** The formation drops when its edge reaches the margin. Clearing whole columns at one end widens the path it must travel before it drops, which buys time.',
            '**Respect the one-shot rule.** A missed shot at the top of the screen costs you most of a second. Close targets refire faster, so take the low ones when you can.',
            '**Use the bunkers as cover, not as walls.** Your own shots erode them from below. Shoot from the gaps between bunkers and step under one when two shots are coming at once.',
            '**Count for the saucer.** The saucer’s score depends on how many shots you have fired; the table pays 300 on the 8th shot and every fifteenth after it, counting from the start of the game.',
            '**Save something for the last invader.** It moves faster than you do. Stand still where it will pass and fire early, rather than chasing it.',
          ],
        },
        {
          type: 'p',
          text: 'On a touch screen the on-screen pad is the easiest control: ← and → move the cannon and Fire shoots (it also starts and restarts the game). You can also drag anywhere on the field to slide the cannon and tap to fire; a second finger can tap while the first one drags.',
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Move the cannon (or A, D)' },
      { keys: ['Space'], action: 'Fire — one shot at a time (or ↑, Z, X)' },
      { keys: ['Enter'], action: 'Start, and play again after a game over' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Slide the cannon; the drag is relative, so start anywhere' },
      { gesture: 'tap', action: 'Fire, or start a game from the title card' },
    ],
    tip: 'Take the bottom rows first: each one you clear is a drop the formation no longer has.',
  },
  pad: {
    left: [
      { label: '←', code: 'ArrowLeft', aria: 'Move left' },
      { label: '→', code: 'ArrowRight', aria: 'Move right' },
    ],
    right: [{ label: 'Fire', code: 'Space', aria: 'Fire, or start', wide: true }],
  },
  further: [
    { title: 'Power-Up: How Japanese Video Games Gave the World an Extra Life', by: 'Chris Kohler', year: '2004', note: 'Includes the story of Taito and Space Invaders in the context of the Japanese industry.' },
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001', note: 'Covers the game’s arrival in arcades and its licensing to Midway.' },
    { title: 'Replay: The History of Video Games', by: 'Tristan Donovan', year: '2010' },
    { title: 'Space Invaders, annotated disassembly', by: 'Computer Archeology (computerarcheology.com)', note: 'A line-by-line reading of the original program, including the alien update loop, the shot types and the saucer score table.' },
  ],
}

export default guide
