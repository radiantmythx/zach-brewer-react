import type { Guide } from '../guide'

/*
 * Notes for games/segments — after Centipede (Atari, 1981).
 */

const headRule = `<svg viewBox="0 0 300 112" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g stroke-opacity="0.25"><path d="M20 10h260M20 34h260M20 58h260M20 82h260M20 10v72M44 10v72M68 10v72M92 10v72M116 10v72M140 10v72M164 10v72M188 10v72M212 10v72M236 10v72M260 10v72M280 10v72"/></g>
<g stroke="#3F7A55"><path d="M192.5 28c0-11 15-11 15 0zM192.5 28h15M197.5 28v4h5v-4"/><path d="M72.5 52c0-11 15-11 15 0zM72.5 52h15M77.5 52v4h5v-4"/></g>
<g stroke="#2B6A93" stroke-width="1.3"><path d="M32 22H176V46H104V70H268"/></g>
<g stroke="#2B6A93"><path d="M170 18l6 4-6 4M110 42l-6 4 6 4M262 66l6 4-6 4M172 30l4 6 4-6M100 54l4 6 4-6"/></g>
<circle cx="32" cy="22" r="4"/>
<g font-family="ui-monospace, monospace" font-size="7" fill="currentColor" stroke="none" letter-spacing="1">
<text x="20" y="100">BLOCKED BY A MUSHROOM OR THE EDGE: DROP A ROW, REVERSE</text>
</g>
</svg>`

const guide: Guide = {
  lede: 'A centipede of outlined ovals and paddling legs winds down through a garden of hatched mushrooms, splitting wherever it is hit, while a spider and a flea work the ground near a small gnome. A study of Dona Bailey and Ed Logg’s 1981 game, and of the one-line rule that makes the centipede move.',
  facts: [
    ['After', 'Centipede · Atari, 1981'],
    ['Designers', 'Dona Bailey and Ed Logg'],
    ['Original control', 'Trackball and one fire button'],
    ['Grid', '30 × 25 cells of 16 units; player zone the bottom six rows'],
    ['Centipede', 'Ten segments, 8–13 cells a second'],
    ['Mushrooms', 'Four hits each; 62 seeded at the start'],
    ['Scoring', 'Head 100 · body 10 · spider 300–900 · flea 200'],
    ['Bot', 'Grid search over 153 positions with a predicted spider'],
    ['Movement rule', 'Run, and at a mushroom or edge drop a row and reverse'],
  ],
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'A garden instead of a sky',
      blocks: [
        {
          type: 'p',
          text: '*Centipede* was released by Atari in 1981. It was designed by Dona Bailey and Ed Logg; Bailey, one of very few women programming arcade games at the time, designed and programmed it with Logg. Logg had already worked on *Asteroids*, and *Centipede* shares that game’s confidence in a few simple objects with very particular behaviors.',
        },
        {
          type: 'p',
          text: 'What set it apart was its setting and its controller. Where most shooters of the period put the player under a sky of aliens, *Centipede* is set in a garden: a field of mushrooms through which a segmented insect winds its way down. The player steers a small shooter with a **trackball**, which allows quick, precise movement in any direction within a strip at the bottom of the screen, and fires as fast as the single shot allows. The palette changed with every wave. It is often remembered for drawing a broader audience than most shooters of its day.',
        },
        {
          type: 'p',
          text: 'The game ran on Atari’s 6502-based arcade hardware and was followed in 1982 by *Millipede*, which added more creatures and new ways for the field to change. Both treat the playfield itself as a weapon: every shot you fire reshapes the ground the next enemy has to cross.',
        },
        {
          type: 'aside',
          title: 'What this piece keeps',
          text: 'The mushroom field and its four-hit mushrooms, the centipede’s run–drop–reverse rule, splitting on every hit with a mushroom left behind, heads that circle the player zone once they reach it, new heads that join from the sides, the spider that zig-zags through the zone and eats mushrooms, the flea that drops straight down planting them, one fast shot at a time, the restoration of damaged mushrooms after a death, and a new color pairing for each wave. The scorpion and its poisoned mushrooms are left out.',
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Run, drop, reverse',
      blocks: [
        {
          type: 'p',
          text: 'The field is a grid of 30 columns by 25 rows. The centipede enters at the top, a chain of ten segments led by a head. The head moves one cell at a time along its row. When the next cell is the edge of the field or holds a mushroom, it instead moves down one row and reverses direction. Each body segment follows exactly the path the segment in front of it took. That is the whole movement model, and it is enough to produce the familiar winding descent: an open field lets the centipede sweep from wall to wall, while a dense patch of mushrooms makes it zig-zag down quickly.',
        },
        { type: 'figure', svg: headRule, caption: 'The head’s rule. It runs along a row until a mushroom or the edge blocks the next cell, then drops one row and reverses.', alt: 'A grid with a path that runs right along the top row to just before a mushroom, drops a row, runs left to just before a second mushroom, drops again and runs right to the edge.' },
        {
          type: 'p',
          text: 'Shooting any segment destroys it and leaves a mushroom in its cell. If the segment was in the middle of the chain, the chain splits: the part in front carries on, and the segment just behind the gap becomes a new head, which immediately meets the new mushroom, drops a row and reverses. A well-placed shot therefore turns one centipede into two that diverge. Heads are worth 100 points and body segments 10.',
        },
        {
          type: 'p',
          text: 'The player’s shooter lives in the **player zone**, the bottom six rows, and cannot pass through mushrooms. It fires a short, very fast dash; only one can be on screen at a time, so firing at something close is much faster than firing across the field. When a centipede reaches the bottom row it does not leave: it turns back up, circles within the zone, and comes down again. Once a head has been in the zone for a few seconds, new single heads begin to arrive from the sides.',
        },
        {
          type: 'table',
          head: ['Creature', 'Behavior', 'Points'],
          rows: [
            ['Centipede head', 'Steers by the run–drop–reverse rule', '100'],
            ['Body segment', 'Follows the segment ahead', '10'],
            ['Spider', 'Zig-zags through the zone, eats mushrooms', '300, 600 or 900 by distance'],
            ['Flea', 'Drops straight down planting mushrooms; two hits', '200'],
            ['Mushroom', 'Four hits; restored after a death', '1 (5 when restored)'],
          ],
          caption: 'Scoring in the piece, which follows the original’s values. An extra life arrives every 12,000 points.',
        },
        {
          type: 'p',
          text: 'The spider enters from one side of the zone and bounces diagonally through it, changing its vertical direction at short, irregular intervals, and leaves by the other side. It eats mushrooms in the zone as it passes, which opens room for you and for the centipede alike. Shooting it pays more the closer it is: 900 within 40 units, 600 within 80, otherwise 300. The flea appears when the player zone holds fewer than five mushrooms; it drops straight down from the top, planting mushrooms as it goes, and takes two hits — the first only makes it fall twice as fast.',
        },
        {
          type: 'p',
          text: 'Touching the centipede, the spider or the flea costs a life. Everything stops; the shooter bursts; and then, one by one, every damaged mushroom on the field is redrawn whole, for 5 points each, before the wave restarts with a fresh centipede. Clearing every segment ends the wave. The next centipede is faster and arrives with fewer body segments and more independent heads, and the garden changes color.',
        },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'Why a centipede is a good enemy',
      blocks: [
        {
          type: 'p',
          text: 'The centipede is a lovely piece of design because its complexity comes almost entirely from the field, not from its own logic. A head knows only two things: which way it is going horizontally, and whether the next cell is open. The mushrooms supply the rest. That means the player is always shaping the enemy’s route — every mushroom you shoot away lengthens a run, and every segment you destroy plants a new obstacle that sends the next head down sooner. The field remembers the whole game.',
        },
        {
          type: 'p',
          text: 'Splitting is what makes the rule interesting. A single chain moving through an open field is easy to predict and to stop. Shoot its middle and you have two heads moving apart, each now turning at different places. Players learn to shoot heads when they can and to avoid splitting a chain high up the screen, where its pieces have time to spread out. The flea and the spider exist to stop the player from controlling the field too completely: one adds mushrooms where you have cleared them, the other removes them where you were using them for cover.',
        },
        {
          type: 'p',
          text: 'The trackball matters too. A centipede that reaches the zone moves quickly and unpredictably; the original’s controller let a player throw the shooter across the zone in a fraction of a second. The piece approximates this with a pointer: the gnome follows the mouse (or a dragging finger) at up to 520 units a second, much faster than the 190 units a second the arrow keys allow.',
        },
        {
          type: 'aside',
          title: 'A note on certainty',
          text: 'The rules above are the ones the original presents to a player. Exact speeds, timings and spawn rules of the 1981 program are not reproduced here, and these notes avoid quoting figures that are not well documented; the numbers in the next sections describe this piece.',
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
          text: 'The attract-mode bot uses the same gnome, the same speed and the same single shot as a player on the arrow keys. Each frame it decides on an **aim** column and whether to fire, then picks the safest nearby place to stand.',
        },
        { type: 'h', text: 'Aiming' },
        {
          type: 'p',
          text: 'Every visible segment is scored by $1.2\\,y - 0.5\\,|x - x_\\text{gnome}| + 20$ for heads, so the lowest segment wins and heads get a small bonus. The bot leaves the centipede alone until its lowest segment has come 30 percent of the way down the field — partly so that the demo shows the centipede winding through the garden, and partly because a centipede high up is less dangerous than mushrooms in the zone. Once it engages, it leads the target: the segment’s horizontal velocity is its cell step times the hop rate, and the shot takes $(y_\\text{gnome} - y)/1000$ seconds to arrive. It fires when the gnome is within 9 units of that lead point.',
        },
        {
          type: 'p',
          text: 'Two other targets can take over. A spider above the gnome and within 70 units becomes the aim, since it is both dangerous and valuable up close; a flea more than 150 units overhead does too. And whenever a mushroom sits directly above the gnome in or just above the zone, the bot fires anyway, keeping its own lane clear.',
        },
        { type: 'h', text: 'Where to stand' },
        {
          type: 'p',
          text: 'The bot then searches a grid of candidate positions around the gnome: 17 columns 8 units apart and 9 rows 10 units apart, 153 in all, skipping any that a mushroom blocks. Each candidate costs 1.1 per unit from the aim column, plus a small preference for staying low when no spider is about. The spider is the main danger, so its position is projected at four moments over the next half-second, reflecting off the top and bottom of its range just as it will, and every candidate near any of those points pays heavily, with the nearest moments weighted most. Segments in or near the zone add cost within 30 units, and standing under a falling flea is all but forbidden.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `let cost = Math.abs(x - aim) * 1.1 + (spider ? 0 : (LH - 10 - y) * 0.35)
if (spider) {
  // where the spider could be over the next half second (it bounces off the zone edges)
  for (const T of [0, 0.15, 0.3, 0.5]) {
    let py = spider.y + spider.vy * T
    if (py > LH - 8) py = 2 * (LH - 8) - py
    if (py < ZONE_Y - 24) py = 2 * (ZONE_Y - 24) - py
    const d = Math.hypot(x - (spider.x + spider.vx * T), y - py)
    if (d < 64) cost += (64 - d) * (40 - T * 40)
  }
}
for (const ch of chains)
  for (const s of ch) {
    const sy = segY(s)
    if (sy < ZONE_Y - 24) continue
    const d = Math.hypot(x - segX(s), y - sy)
    if (d < 30) cost += (30 - d) * 22
  }
if (flea && flea.y < y && Math.abs(x - flea.x) < 18) cost += flea.y > y - 150 ? 2000 : 300`,
          caption: 'The cost of one candidate position, from `botThink` in segments.ts.',
        },
        {
          type: 'p',
          text: 'An earlier version weighted the spider at a single predicted point and preferred the bottom row unconditionally. It died almost every time a spider arrived, because the spider bounces off the bottom of the zone exactly where the bot liked to wait. Predicting several moments with the bounce folded in, and dropping the preference for the bottom while a spider is present, cut its deaths to a handful in several minutes of play.',
        },
        { type: 'h', text: 'Its blind spots' },
        {
          type: 'list',
          items: [
            'It moves in straight lines toward its chosen point and has no path planning, so a ring of mushrooms can pin it in place while a head closes in.',
            'It predicts segments as if they keep moving along their row, so it misses heads that are about to turn.',
            'Once heads are circling inside the zone, its 30-unit margin is sometimes not enough; this is where it usually dies.',
            'It never plans splits. It simply shoots the lowest segment it can reach.',
          ],
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'A botanical plate that moves',
      blocks: [
        {
          type: 'p',
          text: 'The garden is a fixed 480 × 400 field — 30 × 25 cells of 16 units — letterboxed into the viewer and drawn in one-pixel hairlines. The same attract → title → play → over state machine as the other games runs the bot behind both cards. Randomness comes from a seeded generator, so the demo is repeatable.',
        },
        { type: 'h', text: 'Mushrooms' },
        {
          type: 'p',
          text: 'Mushroom health lives in a `Uint8Array` of 750 cells, from 0 (empty) to 4. Each mushroom is drawn as a flattened dome — a single Bézier curve closed by a straight underside — over a short stem, with hatching under the cap. The hatching carries the damage: a mushroom draws two hatch lines per point of health, so it loses a pair with every hit, and its stem shortens from 5 units to 3.5, 2 and then nothing. All the mushrooms are drawn in two batched paths, one for outlines and one for hatching, so the whole field costs two strokes. A hit mushroom jiggles for a fifth of a second.',
        },
        { type: 'h', text: 'The centipede' },
        {
          type: 'p',
          text: 'Each segment stores the cell it is leaving and the cell it is entering. All segments share a single hop progress that advances at the current hop rate (8 cells a second on the first wave, rising by 0.8 a wave to 13), so a whole chain moves in lockstep and draws at interpolated positions between cells. When a hop completes, every body segment takes the cell its predecessor was entering, and only the head consults the rule.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function headStep(h: Seg) {
  const nc = h.tc + h.dir
  if (nc < 0 || nc >= COLS || (h.tr >= 0 && mushAt(nc, h.tr))) {
    let nr = h.tr + h.vdir
    if (nr > ROWS - 1) {
      h.vdir = -1
      nr = h.tr - 1
    } else if (h.vdir < 0 && nr < ZONE_ROW) {
      h.vdir = 1
      nr = h.tr + 1
    }
    h.dir = -h.dir
    return [h.tc, nr] as const
  }
  return [nc, h.tr] as const
}`,
          caption: 'The head’s whole intelligence: run, and when blocked, drop (or climb, inside the zone) and reverse.',
        },
        {
          type: 'p',
          text: 'Because the body follows the head’s path rather than each segment applying the rule itself, a chain stays coherent even when you shoot away the mushroom it turned at. Splitting is then just array surgery: the shot segment becomes a mushroom, and the chain becomes the slice in front of it and the slice behind it, whose first segment now steers.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `const front = ch.slice(0, si)
const back = ch.slice(si + 1)
chains.splice(ci, 1)
if (front.length) chains.push(front)
if (back.length) chains.push(back)
if (!chains.length && !pendingHeads.length) waveClear()`,
          caption: 'From `killSegment`: one centipede becomes two.',
        },
        {
          type: 'p',
          text: 'Drawing a segment means drawing an outlined oval, filled with paper so that the legs of the segment behind tuck underneath. Each oval turns smoothly toward the direction of its current hop, so a centipede rounding a mushroom bends rather than snapping. Every segment has one leg a side, a two-stroke line with the knee bent back, swinging on a sine wave whose phase shifts along the body, so the legs ripple from head to tail. Body segments carry two plate lines across them and breathe very slightly; the head is drawn in ink rather than the wave’s accent, with two eyes and a pair of antennae that sweep forward and curl at the tips.',
        },
        { type: 'h', text: 'Spider, flea and gnome' },
        {
          type: 'p',
          text: 'The spider is a hatched oval with a round head and eight jointed legs that cycle out of phase, drawn at 1.3 times scale. It moves at a constant horizontal speed and re-rolls its vertical speed every 0.35 to 0.9 seconds, bouncing between the top of the zone and the ground. The flea is a teardrop with kicking legs and three speed lines above it; it plants a mushroom in each new row it enters with a 28 percent chance. The gnome is an oval body with a hatched conical hat — the hat is the barrel — two dots for eyes and feet that patter as it moves. Firing squashes the hat for a moment.',
        },
        {
          type: 'p',
          text: 'The shot travels 1,000 units a second and is checked in 4-unit sub-steps against the flea, the spider, every segment and the mushroom grid. Movement into a mushroom is resolved one axis at a time, so the gnome slides along obstacles instead of sticking to them. Hitboxes are generous to the player: the centipede kills within 10 units of the gnome’s center, although the drawings would touch at about 12.',
        },
        { type: 'h', text: 'Juice, sound and annotation' },
        {
          type: 'list',
          items: [
            'Hits ring out: a hairline ring and sparks in the wave’s accent for a body segment, in ink for a head, which also floats its 100.',
            'Every other hop plays a soft low pulse that alternates between G and A, so the centipede’s speed is audible.',
            'Body hits play pentatonic notes; heads glide up a fifth; a destroyed mushroom gives a small high tone and a hit one a dry tick. The flea falls with a long descending whistle.',
            'Faint graph-paper dots mark the cell corners. A dashed line marks the player zone, with a readout of segments, chains and the current speed in cells a second.',
            'Each wave pairs a new centipede color with a new mushroom color: ocean with moss, lagoon with fern, moss with ocean, fern with lagoon.',
          ],
        },
        { type: 'h', text: 'Small screens and first play' },
        {
          type: 'p',
          text: 'The zone labels and the speed readout appear only when the field is drawn at more than 1.1 pixels per unit; score pop-ups and wave banners are set in screen pixels so they stay readable. On a first play, a dotted loop is drawn through the zone with a dot running round it — move here — and a dotted line climbs from the gnome’s hat, both labeled for whatever you last used: arrows, mouse or touch. They fade as you move and fire, and go with your first hit on the centipede. With a mouse over the field, a small dotted ring marks where the gnome is heading.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is different',
      blocks: [
        {
          type: 'list',
          items: [
            '**No scorpion.** The original’s scorpion poisons mushrooms so that a centipede touching one dives straight to the bottom. It is left out to keep the field readable at small sizes.',
            '**A pointer instead of a trackball.** The mouse steers absolutely and a finger steers relatively, which keeps the gnome visible under your thumb.',
            '**A fixed field.** The playfield is landscape, 30 × 25, rather than the original’s tall screen, and the zone is the bottom six rows.',
            '**Tuned numbers.** Speeds, spawn intervals and the flea’s planting rate are chosen for feel, not copied from the original program.',
            '**The flea can come early.** From the second wave it appears whenever the zone holds fewer than five mushrooms; in the first wave it waits until 25 seconds into the game, so a tidy player still meets it.',
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
            '**Shoot heads.** A head is worth ten body segments, and removing it makes the next segment the head — still one chain, not two.',
            '**Split low, not high.** A chain split near the top has time to spread across the field. Let it come down a little, then take it apart.',
            '**Stay close to your work.** The single shot comes back fastest when the target is near, so hold your ground under a descending chain rather than firing across the screen.',
            '**Keep the zone clear, but not empty.** Mushrooms in the zone slow you down and turn the centipede toward you; an empty zone brings the flea. A few scattered mushrooms are ideal.',
            '**Let the spider come, then step aside.** It cannot chase you; it only bounces. Watch its rhythm, take the 900 when it passes close and above you, and move out of its lane otherwise.',
            '**After a death, count the restoration.** Every damaged mushroom comes back whole, so a field you have chewed up will be dense again. Plan the next wave around that.',
          ],
        },
        {
          type: 'p',
          text: 'On a touch screen the on-screen pad is the simplest control: the four-way pad moves the gnome and Fire shoots while held (it also starts and restarts the game). You can also drag anywhere on the field; the gnome moves with your finger without sitting under it, and fires while your finger is down.',
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→', '↑', '↓'], action: 'Move the gnome within the zone (or W A S D)' },
      { keys: ['Space'], action: 'Fire; hold to keep firing (or Z, X)' },
      { keys: ['Enter'], action: 'Start, and play again after a game over' },
    ],
    gestures: [
      { gesture: 'move', action: 'With a mouse, the gnome follows the pointer within the zone' },
      { gesture: 'hold', action: 'Fire while the button or finger is down' },
      { gesture: 'drag', action: 'On touch, the gnome moves with your finger, offset so it stays visible' },
      { gesture: 'tap', action: 'Start a game from the title card' },
    ],
    tip: 'Shoot heads when you can and split chains low on the screen, where their pieces have no room to spread.',
  },
  pad: {
    dpad: ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'],
    right: [{ label: 'Fire', code: 'Space', aria: 'Fire (hold), or start', wide: true }],
  },
  further: [
    { title: 'Atari Inc.: Business Is Fun', by: 'Marty Goldberg and Curt Vendel', year: '2012', note: 'A history of Atari through its arcade years, including the coin-op division that made Centipede.' },
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001' },
    { title: 'Replay: The History of Video Games', by: 'Tristan Donovan', year: '2010' },
  ],
}

export default guide
