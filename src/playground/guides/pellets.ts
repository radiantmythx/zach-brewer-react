import type { Guide } from '../guide'

const TARGETS_SVG = `<svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, monospace" font-size="8.5">
<g stroke-opacity="0.12">
<path d="M20 20H300M20 60H300M20 100H300M20 140H300M20 180H300M40 10V190M80 10V190M120 10V190M160 10V190M200 10V190M240 10V190M280 10V190"/>
</g>
<circle cx="120" cy="100" r="80" stroke="#6F952F" stroke-dasharray="2 3"/>
<path d="M120 100 L127 96 A8 8 0 1 0 127 104 Z"/>
<path d="M140 97v6M160 97v6" />
<path d="M80 60 L120 100" stroke="#2B6A93"/>
<circle cx="80" cy="60" r="5" stroke="#2B6A93"/>
<text x="62" y="52" fill="#2B6A93" stroke="none">A · target = hero</text>
<path d="M156 96l8 8M164 96l-8 8" stroke="#1F8A86"/>
<text x="150" y="88" fill="#1F8A86" stroke="none">B · 4 ahead</text>
<path d="M80 60 L140 100 L200 140" stroke="#3F7A55" stroke-dasharray="4 3"/>
<path d="M196 136l8 8M204 136l-8 8" stroke="#3F7A55"/>
<text x="208" y="150" fill="#3F7A55" stroke="none">C · A→(2 ahead), doubled</text>
<circle cx="40" cy="182" r="4" stroke="#6F952F"/>
<text x="50" y="185" fill="#6F952F" stroke="none">D · chases outside the ring, retreats inside it</text>
<text x="128" y="118" stroke="none" fill="currentColor">hero →</text>
</svg>`

const guide: Guide = {
  lede: "A maze chase redrawn as an architect's floor plan: four ghosts with four distinct ways of hunting, power pellets as registration marks, and a demo player that plans its route through a map of where each ghost could be.",
  facts: [
    ['After', 'Pac-Man · Namco, 1980'],
    ['Original designer', 'Toru Iwatani'],
    ['Maze', '21 × 23 tiles, mirrored, 166 pellets + 4 power pellets'],
    ['Ghost model', 'Target tiles, scatter / chase / frightened / eaten'],
    ['Movement', 'Tile centers, cornering ±0.42 tile, 120 Hz substeps'],
    ['Demo player', 'Dijkstra over 211 open tiles with arrival-time danger'],
    ['Walls', 'Rectilinear outline → two insets → arcTo corners'],
    ['Ground', 'Paper, ink hairlines, ocean / lagoon / moss / fern'],
  ],
  interact: {
    keys: [
      { keys: ['←', '↑', '→', '↓'], action: 'Steer. A press is remembered briefly, so you can ask for a turn before you reach it' },
      { keys: ['W', 'A', 'S', 'D'], action: 'Steer' },
      { keys: ['Enter', 'Space'], action: 'Start, or play again' },
    ],
    gestures: [
      { gesture: 'swipe', action: 'Steer; keep your finger down and swipe again to turn again' },
      { gesture: 'tap', action: 'Steer toward the side of the hero you tap' },
      { gesture: 'tap', action: 'Start from the title or game-over card' },
    ],
    tip: 'Ask for a turn just before a corner: the hero cuts it on the diagonal and gains a few pixels on the ghosts, which must reach the tile center before they can turn.',
  },
  pad: {
    dpad: ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'],
    right: [{ label: 'Start', code: 'Enter', aria: 'Start or play again', wide: true }],
  },
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'A game about eating',
      blocks: [
        {
          type: 'p',
          text: "In 1980 the arcade was a shooting gallery. *Space Invaders* had swept Japan two years earlier, and most of what followed was a variation on the same idea: a ship at the bottom of the screen and something hostile above it. **Toru Iwatani**, a young designer at Namco, wanted to make something else, a game that people who did not care for shooting might also enjoy. He settled on the most ordinary verb he could think of, eating, and on a character that was almost nothing but a mouth.",
        },
        {
          type: 'p',
          text: "Iwatani has often told the story that the shape came to him from a pizza with one slice taken out. Whether or not the anecdote is the whole truth, the design that came out of it was startlingly simple: a yellow disc with a wedge that opens and closes, a maze packed with dots, and four ghosts that roam it. The game was released in Japan in 1980 as *Puck Man*; Midway licensed it for North America and renamed it *Pac-Man* before it shipped later the same year.",
        },
        {
          type: 'p',
          text: "What followed was the first true video game craze to reach far beyond the arcade. There was a hit novelty song, \"Pac-Man Fever\" by Buckner & Garcia, a Saturday-morning cartoon, lunchboxes, cereal, and a sequel developed outside Namco, *Ms. Pac-Man*, which many players still consider the better game. Guinness World Records later named the original the most successful coin-operated arcade game. It also did something few games before it had done: it gave the player a *character* rather than a vehicle, and gave the enemies personalities. Short comic intermissions between levels, in which the ghost and the hero chase each other across the screen, are often cited as some of the earliest cutscenes in a video game.",
        },
        {
          type: 'aside',
          title: 'Why ghosts?',
          text: "Ghosts are frightening in principle and harmless-looking in practice, and they can be turned on: when the hero eats a power pellet the tables turn and the hunters become the hunted. That reversal, the moment the music changes and the ghosts turn blue and flee, is the emotional center of the game, and most of its strategy.",
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Dots, power pellets, four ghosts',
      blocks: [
        {
          type: 'p',
          text: "The player steers the hero through a maze of corridors one tile wide. Every corridor tile holds a small dot; clearing all of them completes the level. Four larger **power pellets** (in the original, *energizers*) sit near the corners. Eating one frightens the ghosts for a few seconds: they reverse, slow down, wander, and can be eaten for rising rewards. An eaten ghost leaves only its eyes, which race back to the ghost house in the middle of the maze to be revived. A tunnel at the sides wraps from one edge to the other and slows any ghost that enters it.",
        },
        {
          type: 'p',
          text: "Twice per level a bonus fruit appears below the ghost house for a few seconds. The hero has three lives; touching a ghost that is not frightened costs one. Here is how this piece scores, which follows the original's values for the dots and the ghost chain:",
        },
        {
          type: 'table',
          head: ['Event', 'Points', 'Notes'],
          rows: [
            ['Pellet', '10', '166 per plan'],
            ['Power pellet', '50', 'Four per plan; frightens the ghosts'],
            ['Ghosts in one fright', '200 · 400 · 800 · 1,600', 'Doubles for each ghost eaten on the same pellet'],
            ['Bonus sprig', '100, then +200 per plan', 'Appears after 60 and 125 pellets, for 9 seconds'],
            ['Extra life', 'at 10,000', 'Once'],
          ],
          caption: "A full chain of four ghosts on all four power pellets is worth 12,000 points, more than the pellets themselves.",
        },
        {
          type: 'p',
          text: "Difficulty ramps by level, which the piece calls a *plan*: the hero and the ghosts both get faster (the ghosts more so), fright gets shorter, the ghosts leave home sooner, and the scatter phases shrink: from the second plan the last scatter is a single second, and from the fifth every scatter is five. When only a few pellets remain, the first ghost speeds up a little more and stops scattering altogether. Fans of the original call this *Cruise Elroy*.",
        },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Target tiles',
      blocks: [
        {
          type: 'p',
          text: "The original ghosts look as if they are hunting, but there is no search in them at all. The maze is a grid of 8-pixel tiles, and each ghost makes one decision at a time: as it enters a tile, it looks at the exits it could take next (never the way it came) and picks the one whose neighboring tile is closest, *as the crow flies*, to a single **target tile**. Ties break in a fixed order: up, left, down, right. Everything that makes the ghosts feel like individuals comes from how each one picks its target.",
        },
        {
          type: 'math',
          tex: "d^{*} = \\arg\\min_{d \\in E} \\; |(p + d) - t|^2",
          label: '(1)',
          caption: "Here $p$ is the tile the ghost is entering, $E$ the set of open exits other than the way back, $d$ a unit step and $t$ the target tile. Squared Euclidean distance is enough: only the order matters.",
        },
        {
          type: 'p',
          text: "Players later gave the ghosts names that suit their targets. The red ghost, *Shadow*, targets the hero's own tile and so follows directly. The pink ghost, *Speedy*, targets four tiles ahead of the hero, so it tends to cut in from the front: an ambush. The cyan ghost, *Bashful*, takes the point two tiles ahead of the hero, draws a line to it from the red ghost, and doubles that line; its target swings wildly as the other two move, which makes it hard to read. The orange ghost, *Pokey*, chases directly while it is more than eight tiles away and gives up for its home corner when it gets closer, so it seems to lose its nerve.",
        },
        {
          type: 'figure',
          svg: TARGETS_SVG,
          caption: "The four target rules, on a grid of tiles. A chases the hero's tile; B aims four tiles ahead; C doubles the vector from A to the point two ahead; D chases only outside a ring of eight tiles.",
          alt: 'A grid with the hero facing right, a line from ghost A to the hero, a cross four tiles ahead for ghost B, a dashed doubled vector for ghost C, and a dashed ring of radius eight tiles for ghost D.',
        },
        {
          type: 'p',
          text: "On top of that rule sits a timetable. Ghosts alternate between **chase**, when they use the targets above, and **scatter**, when each heads for a fixed tile just outside its own corner of the maze and circles there. On the first level the original runs scatter for 7 seconds, chase for 20, scatter 7, chase 20, scatter 5, chase 20, scatter 5, and then chases indefinitely; later levels shorten the scatters. Every change of mode forces the ghosts to reverse, which is often the only warning a player gets. **Frightened** ghosts stop using targets and turn at random at each junction; in the original the randomness comes from a simple pseudo-random generator, so with the same inputs it repeats exactly. That determinism is why memorized *patterns* work.",
        },
        {
          type: 'p',
          text: "A few smaller details shape the feel. The hero moves a little faster than the ghosts on early levels but pauses fractionally on every dot, so a corridor full of dots is slower than an empty one. The hero can **corner**: if the player asks for a turn a few pixels early, it cuts the corner on the diagonal, while ghosts must reach the tile center first. Ghosts are slowed in the tunnel. Two regions near the center forbid ghosts from turning upward, which gives careful players a safe route. And the original was never meant to be played forever: level 256 is unplayable, because the routine that draws the fruit at the bottom of the screen overflows and garbles the right half of the maze. The maximum possible score, 3,333,360, was first recorded by Billy Mitchell in 1999.",
        },
        {
          type: 'p',
          text: "The piece keeps the target rules, the reversal on mode changes, the first-level timetable, the no-reverse turning rule with its tie-break order, the tunnel slowdown and the cornering advantage. Here is its targeting, nearly verbatim:",
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function ghostTarget(g: Ghost): [number, number] {
  const info = GHOST_INFO[g.id]
  if (g.st === 'eaten') return [DOOR_X, OUT_Y]
  const scatter = modeIdx % 2 === 0 && modeIdx < MODE_TIMES(level).length
  const px = Math.round(pac.x)
  const py = Math.round(pac.y)
  // the first chaser ignores scatter once the plan is nearly clear ("cruise")
  if (scatter && !(g.id === 0 && dotsLeft < 16)) return [info.corner[0], info.corner[1]]
  const pd = pac.dir
  if (g.id === 0) return [px, py]
  if (g.id === 1) return [px + DX[pd] * 4, py + DY[pd] * 4]
  if (g.id === 2) {
    const vx = px + DX[pd] * 2
    const vy = py + DY[pd] * 2
    const b = ghosts[0]
    return [vx * 2 - Math.round(b.x), vy * 2 - Math.round(b.y)]
  }
  const ddx = g.x - pac.x
  const ddy = g.y - pac.y
  return ddx * ddx + ddy * ddy > 64 ? [px, py] : [info.corner[0], info.corner[1]]
}`,
          caption: 'Four personalities in a dozen lines. Ghost D compares a squared distance against 64, eight tiles squared.',
        },
        {
          type: 'aside',
          title: 'A famous bug, left out',
          text: "In the original, the \"four tiles ahead\" of the pink ghost (and the \"two tiles ahead\" used by the cyan one) are miscalculated when the hero faces up: an arithmetic overflow adds the same offset to the left, so the target lands up and to the left. Players exploit it. This piece computes the intended target in all four directions.",
        },
      ],
    },
    {
      id: 'bot',
      kicker: 'The demo player',
      title: 'A route through where the ghosts could be',
      blocks: [
        {
          type: 'p',
          text: "The attract-mode player has a harder job than the ghosts. It must find food, avoid four pursuers, and know when to turn around, and it re-decides every frame. It does this with a shortest-path search, Dijkstra's algorithm, over the 211 open tiles of the maze, where the *cost* of entering a tile is one step plus a **danger** term that asks a simple question: could a ghost be there when I am?",
        },
        {
          type: 'p',
          text: "Before planning, the bot runs a breadth-first search from every dangerous ghost (one that is out and not frightened, or whose fright is about to expire) to get its distance, in tiles, to every tile in the maze. Because ghosts cannot reverse, that search is not allowed to step backward on its first move. Dividing by each ghost's speed relative to the hero turns those distances into arrival times measured in hero-steps. During the hero's own search, entering tile $n$ after $k$ steps compares the two clocks:",
        },
        {
          type: 'math',
          tex: "\\Delta t_n = \\frac{g_n}{r_g} - (k + k_0)",
          label: '(2)',
          caption: "$g_n$ is the ghost's BFS distance to tile $n$, $r_g = v_g / v_h$ its speed relative to the hero, $k$ the hero's steps to reach $n$, and $k_0$ the fraction of a tile it must still travel before its first decision. A positive $\\Delta t_n$ means the hero gets there first.",
        },
        {
          type: 'math',
          tex: "\\text{danger}(n) = 80 - 10\\,\\Delta t_n \\;\\; \\text{if} \\; \\Delta t_n < 1.1, \\qquad \\text{else} \\;\\; \\frac{8}{1 + 1.5\\,\\Delta t_n}",
          label: '(3)',
          caption: 'Dangers from all four ghosts add up.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function dangerAt(n: number, tt: number) {
  let dsum = 0
  for (let k = 0; k < 4; k++) {
    if (!gActive[k]) continue
    const dg = gdist[k][n]
    if (dg < 0) continue
    const tg = dg / gSpd[k]
    const lead = tg - tt
    if (lead < 1.1) dsum += 80 - lead * 10
    else dsum += 8 / (1 + lead * 1.5)
  }
  return dsum
}`,
          caption: "A tile a ghost could reach first, or within about one step of the hero, costs as much as eighty empty corridor tiles.",
        },
        {
          type: 'p',
          text: "Once the costs are settled, the bot chooses a **target**: the tile with the lowest path cost plus a bias. An ordinary pellet has no bias, so the nearest safe pellet usually wins. A power pellet is made *less* attractive (+12) while no ghost is near, so the bot saves them, and strongly attractive (−16) when a ghost is within seven tiles, so it uses them as an escape. A frightened ghost that can be reached before its fright runs out, with 0.4 seconds to spare, is the most attractive thing in the maze (−45). The bonus sprig gets a small pull (−6). The bot then reads off the first step of the path to that target and asks for that direction.",
        },
        {
          type: 'p',
          text: "Turning around is the subtle part. The hero is usually between two tile centers, so the bot plans twice: once from the tile ahead and once from the tile behind. It reverses only if the plan from behind is cheaper by a margin *and* that plan does not simply lead back through the tile ahead. An early version of the bot lacked the second condition and dithered back and forth in place, a classic failure of greedy maze players, until a ghost caught it standing still.",
        },
        {
          type: 'h',
          text: 'Blind spots',
        },
        {
          type: 'list',
          items: [
            "**It assumes the worst of every ghost.** Each one is treated as if it could head anywhere, when in fact it follows a target rule that the bot could predict exactly. The bot is therefore overcautious near ghosts that are actually heading away.",
            "**It does not think beyond the target.** A pellet at the end of a corridor can look safe to reach and still be a trap once the hero has eaten it. The arrival-time margin softens this but does not remove it.",
            "**It clears greedily.** Nearest-first leaves isolated pellets behind, so the end of each plan is slow and dangerous. A human would sweep regions.",
          ],
        },
        {
          type: 'p',
          text: "In practice it usually reaches the third plan, eating a ghost or two on most power pellets, before the ghosts corner it. That is enough to show every phase of the game: the opening sweep, a power-pellet chase, a death, a level clear.",
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'A floor plan that moves',
      blocks: [
        {
          type: 'h',
          text: 'The plan',
        },
        {
          type: 'p',
          text: "The maze is an original 21 × 23 layout, typed as the left eleven columns of text and mirrored about the center column. A small validator, run while it was being designed, checked that every open tile connects, that there are no dead ends and no open two-by-two areas, and that no two wall tiles touch only at a corner (which would make the outline ambiguous). The legend is a character per tile: walls, pellets, power pellets, open floor without a pellet, the outside, the ghost house and its door.",
        },
        {
          type: 'p',
          text: "The walls are drawn the way an architect draws them in plan: two parallel lines for the faces of each wall, with *poché* (a light hatch) between them. To get there the piece first walks the boundary of the wall tiles along tile edges, always keeping the wall on its right, and merges straight runs into single segments. That gives one closed rectilinear polygon per wall block. Each polygon is then **inset** twice, by 0.15 and 0.34 of a tile, and drawn with `arcTo`, which rounds every corner. Convex corners and concave corners get different radii, chosen so the two lines stay parallel around every bend; a wall one tile thick becomes a rounded pill.",
        },
        {
          type: 'code',
          lang: 'ts',
          code: `/** Inset a right-handed rectilinear loop by e and give each corner a radius (convex rc, concave rv). */
function inset(loop: number[], e: number, rc: number, rv: number): Outline {
  const n = loop.length / 2
  const p: number[] = []
  const rad: number[] = []
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n
    const b = (i + 1) % n
    const dax = Math.sign(loop[i * 2] - loop[a * 2])
    const day = Math.sign(loop[i * 2 + 1] - loop[a * 2 + 1])
    const dbx = Math.sign(loop[b * 2] - loop[i * 2])
    const dby = Math.sign(loop[b * 2 + 1] - loop[i * 2 + 1])
    // right-hand normals (y down): (-dy, dx)
    p.push(loop[i * 2] + e * (-day - dby), loop[i * 2 + 1] + e * (dax + dbx))
    const convex = dax * dby - day * dbx > 0
    rad.push(convex ? rc : rv)
  }
  return { p, rad }
}`,
          caption: "Each vertex moves inward along the sum of the two edge normals. The sign of the cross product tells a convex corner from a concave one.",
        },
        {
          type: 'p',
          text: "The poché is a field of diagonal lines clipped to the inner outlines with the even-odd rule, so that a wall's interior is hatched and the corridors are not. Clipping is the most expensive thing in the frame, so the finished walls are rendered once per size into an offscreen canvas, aligned to the device-pixel grid so the hairlines stay crisp, and copied each frame. Only the **draw-on** at the start of each plan, when every outline is traced like a pen plotter in an order that sweeps down from the top, and the green **blink** at a plan's end are drawn live. Around the plan sit the conventions of an architectural drawing: grid bubbles lettered along the top and numbered down the side, a north arrow, the tunnel marked with arrows, and the ghost-house door drawn as a door swing, a leaf and a dashed quarter-circle arc, which actually swings open as ghosts pass.",
        },
        {
          type: 'h',
          text: 'Movement',
        },
        {
          type: 'p',
          text: "Every actor lives in tile coordinates, with tile centers at whole numbers. Movement is a loop that advances to the next center, decides, and spends whatever distance is left. The hero's decision at a center is simple: take the requested turn if that exit is open, otherwise carry on, otherwise stop. A requested turn is **buffered**: a key press is remembered for about half a second (a swipe a little longer, a tap longer still), and a held key keeps renewing it, so a player can ask for a turn before reaching the junction. A turn requested within 0.42 of a tile before or after a center is taken immediately, and the hero then slides back onto the new corridor's center line as it moves, which is the original's diagonal cornering. Reversing is always instant.",
        },
        {
          type: 'p',
          text: "To keep fast actors from passing through each other between frames, each frame is split into substeps of at most 1/120 of a second, and collisions are tested after every substep. The tests are deliberately generous to the player: a ghost kills only within 0.55 of a tile, but a frightened ghost can be eaten from 0.8.",
        },
        {
          type: 'table',
          head: ['', 'Plan 1', 'Plan 5 and later'],
          rows: [
            ['Hero', '6.5 tiles/s', '7.6 tiles/s'],
            ['Hero, during fright', '7.1', '8.0'],
            ['Ghost', '6.0', '7.35'],
            ['Frightened ghost', '3.7', '4.3'],
            ['Ghost in tunnel', '3.1', '3.8'],
            ['Eyes going home', '15', '15'],
            ['Fright lasts', '6.5 s', '2.1 s, never under 1.4 s'],
          ],
          caption: 'Speeds ramp linearly over the first five plans. The ghosts gain more than the hero does.',
        },
        {
          type: 'h',
          text: 'A state machine with phases',
        },
        {
          type: 'p',
          text: "The game runs on two layers of state. The outer one is shared by all the playground's games: *attract* (the bot plays forever, in previews), *title*, *play* and *over*, with the demo continuing behind the title and game-over cards. Inside it, a plan moves through phases: **draw** (the walls trace themselves), **ready**, **play**, a short **eat** pause when a ghost is caught (its score floats up where it was), **dying**, and **clear**. Ghosts have their own five states: *house* (bobbing in place, eyes looking up and down), *leaving* (lining up with the door and rising through it), *active*, *eaten* and *entering*. They are released by a timer or by a count of pellets eaten since the last life began, whichever comes first, and both thresholds shrink on later plans.",
        },
        {
          type: 'h',
          text: 'Characters in linework',
        },
        {
          type: 'p',
          text: "The hero is a paper-filled circle with a 1.6-pixel ink outline, a mouth that opens with distance traveled rather than time (so it stops when the hero stops), a single eye that slides to the upper side of whichever way it faces, and a crescent of fern hatching on its back like the shading on a drafted sphere. It turns smoothly toward its heading, squashes when it bumps a wall, bulges when it swallows a power pellet and breathes gently when it waits. Its death is the original's: it turns to face up and the mouth opens until the circle folds away, then a small burst of hairline sparks.",
        },
        {
          type: 'p',
          text: "Each ghost is a dome over a scalloped hem whose wave travels along it, so they appear to scuttle. Each is hatched at its own angle in its own accent: ocean for the chaser, lagoon for the ambusher, moss for the flanker, fern for the shy one. Eyes are paper ellipses whose pupils slide toward the ghost's next direction a moment before the body turns. Frightened ghosts lose their color for an ink cross-hatch, their outlines wobble, their faces turn into two dots and a zigzag, and in the last two seconds they flash. Eaten ghosts are reduced to a dashed outline and their eyes.",
        },
        {
          type: 'p',
          text: "The sounds are soft and short: a two-note waka on alternate pellets, a rising glide for a power pellet, a low pulse while the ghosts are frightened, a quick arpeggio for each ghost eaten (pitched up along the chain), and a falling pentatonic run for a death. On small or very short screens the plate is cropped to the maze itself and the margin furniture is dropped, since it would be unreadable there; key labels never render below about eight CSS pixels.",
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
            "**Turn early.** Ask for every turn a fraction before the junction. Cornering is the hero's one structural advantage over the ghosts.",
            "**Save the power pellets.** Clear the open areas first and leave the corner pellets until a ghost or two are close, then eat one and turn on them. Four ghosts on one pellet is worth 3,000 points.",
            "**Watch for reversals.** When all four ghosts turn around at once, the mode has changed. A scatter is a breather; the reversal into chase is when they come back for you.",
            "**Read the flanker by the chaser.** The moss ghost's target depends on where the ocean ghost is. If the ocean ghost is behind you, expect the moss one ahead.",
            "**Use the shy one.** The fern ghost retreats when it gets within eight tiles, so running straight at it is often safe.",
            "**The tunnel is a refuge.** Ghosts crawl through it at half speed. Lead a pursuer in and you gain a long head start.",
            "**Mind the last pellets.** On the final dozen pellets the ocean ghost stops scattering and speeds up. Plan a route that finishes the stragglers in one pass.",
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
            "The maze is original and smaller: 21 × 23 tiles with 170 pellets rather than the original's 28 × 31 with 244, so a plan takes about half a minute instead of two or three.",
            "Speeds are in tiles per second, tuned for this maze, and they ramp smoothly over five plans rather than following the original's level table.",
            "The pink and cyan ghosts' up-facing overflow bug is not reproduced, and there are no zones where ghosts may not turn upward.",
            "The hero does not pause on each dot; it simply moves at one speed. Fright and release timings are simplified, and there is a single bonus item (a sprig of two berries) instead of a sequence of fruits.",
            "Frightened ghosts choose their turns with a seeded generator, so the demo is deterministic, but it is not the original's generator.",
            "There are no intermissions, and no level 256: the plans go on until the hero runs out of lives.",
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'The Pac-Man Dossier', by: 'Jamey Pittman', note: "The definitive technical account of the original: tile logic, speeds, timers, targeting and the bugs." },
    { title: 'Understanding Pac-Man Ghost Behavior', by: 'Chad Birch', year: '2010', note: 'A clear, illustrated explanation of target tiles and modes, from the GameInternals blog.' },
    { title: 'Programmers at Work', by: 'Susan Lammers', year: '1986', note: 'Interviews with early software designers, including Toru Iwatani on how the game was conceived.' },
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001', note: 'The arcade boom and the Pac-Man craze in context.' },
    { title: 'A note on two problems in connexion with graphs', by: 'Edsger W. Dijkstra', year: '1959', note: 'The shortest-path algorithm the demo player runs every frame.' },
  ],
}

export default guide
