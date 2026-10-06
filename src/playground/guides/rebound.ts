import type { Guide } from '../guide'

/*
 * Notes for games/rebound — after Arkanoid (Taito, 1986).
 */

const fan = `<svg viewBox="0 0 300 152" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<rect x="90" y="112" width="120" height="12" rx="6"/>
<path d="M104 112v12M196 112v12"/>
<g stroke-opacity="0.5"><path d="M120 116v4M180 116v4M150 115v6M90 130v6M210 130v6M90 133h120"/></g>
<g stroke="#3F7A55" stroke-dasharray="2 3"><path d="M150 112V22M180 112L226 35M210 112L289 70M120 112L74 35M90 112L11 70"/></g>
<g fill="currentColor" stroke="none" font-family="ui-monospace, monospace" font-size="7" letter-spacing="1">
<text x="145" y="16">0°</text><text x="229" y="33">31°</text><text x="266" y="62">62°</text><text x="58" y="33">31°</text><text x="16" y="62">62°</text>
<text x="60" y="148">u = −1</text><text x="147" y="148">0</text><text x="203" y="148">+1</text>
</g>
</svg>`

const guide: Guide = {
  lede: 'A brick wall drawn as an architectural elevation, every course hatched in its own way, and a paddle that returns the ball at an angle set by where it lands. A study of Taito’s 1986 game, of the Breakout lineage behind it, and of the small amount of geometry that makes a bat-and-ball game feel fair.',
  facts: [
    ['After', 'Arkanoid · Taito, 1986'],
    ['Lineage', 'Breakout · Atari, 1976'],
    ['Original control', 'A rotary knob (spinner) and one button'],
    ['Wall', '13 columns of 32 × 14 bricks; six round designs that cycle'],
    ['Bricks', 'Hatched · silver, two or more hits · gold, unbreakable'],
    ['Power-ups', 'Enlarge, Slow, Multi, Catch, Laser'],
    ['Return angle', 'Up to 62° from vertical, by impact point'],
    ['Ball speed', '210–490 units/s, rising with every hit'],
    ['Bot', 'Wall-reflected landing prediction, aimed returns'],
  ],
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'Breakout, rebuilt for the mid-eighties',
      blocks: [
        {
          type: 'p',
          text: 'The bat-and-ball wall game begins with Atari’s *Breakout* in 1976, conceived at Atari by Nolan Bushnell and Steve Bristow as a single-player turn on *Pong*: instead of an opponent, a wall of bricks that the ball chips away. Steve Wozniak built the prototype, working with Steve Jobs, and the story of how few chips he managed it in has become part of the lore of both men. The idea was simple and almost endlessly reworkable.',
        },
        {
          type: 'p',
          text: 'Ten years later, Taito’s *Arkanoid* reworked it thoroughly. The paddle became the Vaus, a small craft escaping the destroyed mothership *Arkanoid*; the walls became a long sequence of designed rounds, each a pattern rather than a block; and the game ends in a duel with DOH, the enemy behind the whole affair. It was played with a rotary knob, like *Breakout*, which lets a good player put the paddle exactly where they mean to.',
        },
        {
          type: 'p',
          text: 'Two additions made *Arkanoid* the model for nearly every brick game after it. The first is the **brick vocabulary**: ordinary colored bricks, silver bricks that need several hits (more as the game goes on), and gold bricks that cannot be broken at all and so turn a wall into a maze. The second is the **capsule**: breaking certain bricks releases a falling capsule which, caught with the paddle, changes the rules for a while — a wider paddle, a slower ball, three balls, a sticky paddle, lasers. Small enemies drift down from hatches in the ceiling, too, and knock the ball off course. A sequel, *Arkanoid: Revenge of Doh*, followed in 1987.',
        },
        {
          type: 'aside',
          title: 'What this piece keeps',
          text: 'The walled playfield with a gap at the bottom, designed rounds that cycle, silver bricks that grow tougher every cycle and unbreakable gold, a paddle whose return angle depends on where the ball lands, ball speed that rises through a rally, falling capsules — Enlarge, Slow, Multi (Arkanoid’s Disruption), Catch and Laser — with one capsule at a time and none while several balls are in play, and lives lost when the last ball falls. The ceiling enemies, the Break and extra-life capsules and the final duel are left out.',
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Keep the ball, take the wall',
      blocks: [
        {
          type: 'p',
          text: 'The ball starts on the paddle; launch it and it climbs toward the wall. It bounces off the side walls and the ceiling, breaks (or chips) the bricks it touches, and falls back toward the paddle. Return it and the rally continues. Miss, with no other ball in play, and you lose a life; the next ball waits on the paddle. Clear every brick that can be broken and the round ends with a tally of bricks, time and best combo, and the next round sweeps in.',
        },
        {
          type: 'p',
          text: 'The essential skill is aim. The paddle is not a flat mirror: where the ball lands on it sets the angle it leaves at. Dead center sends it straight up; the very ends send it out at 62 degrees from vertical, toward the side walls. Between, the angle varies smoothly. So you play the paddle like a bat, moving it to meet the ball off-center on purpose.',
        },
        { type: 'figure', svg: fan, caption: 'The return angle depends only on where the ball meets the paddle: straight up at the center, 31° halfway out, 62° at the ends.', alt: 'A capsule-shaped paddle with dashed rays rising from five points along it, labeled 62°, 31°, 0°, 31° and 62°.' },
        {
          type: 'table',
          head: ['Brick', 'Hits', 'Points'],
          rows: [
            ['Hatched (one per course)', '1', '50 for the lowest courses, up to 140 for the top one'],
            ['Silver (double outline)', '2 in the first cycle, +1 every six rounds', '50 × round, and 10 per chip'],
            ['Gold (cross-hatched, double outline)', 'Never', '—'],
            ['Capsule caught', '—', '1,000'],
          ],
          caption: 'Scoring in the piece. A round is clear when only gold remains.',
        },
        { type: 'h', text: 'The capsules' },
        {
          type: 'p',
          text: 'Ordinary bricks have a chance of releasing a capsule when they break, as long as no capsule is already falling and only one ball is in play. The capsule tumbles down slowly; touch it with the paddle to collect it. **Enlarge**, **Catch** and **Laser** are modes, and a new one replaces the old. **Slow** and **Multi** act at once.',
        },
        {
          type: 'list',
          items: [
            '**E · Enlarge** (ocean) widens the paddle from 64 to 96 units.',
            '**S · Slow** drops the ball to the round’s minimum speed; it starts climbing again at once.',
            '**M · Multi** splits the ball into three, the new two fanned 24 degrees to either side. No capsules fall while more than one ball is in play.',
            '**C · Catch** (fern) makes the paddle sticky: a ball that lands is held where it touched, then released on your command, or after three seconds.',
            '**L · Laser** mounts two small turrets on the paddle. Hold the fire button to shoot paired lasers that break bricks directly.',
          ],
        },
        {
          type: 'p',
          text: 'Speed is part of the rules. Each round has a minimum and a maximum speed, both rising with the round number. Every brick hit adds 2.5 units a second and the rally adds 1.5 more every second, up to the maximum, so a long rally gets steadily harder. Slow resets it; so does losing a life.',
        },
      ],
    },
    {
      id: 'geometry',
      kicker: 'Inside the machine',
      title: 'The geometry of a fair bounce',
      blocks: [
        {
          type: 'p',
          text: 'Bat-and-ball games feel fair or unfair almost entirely through a handful of rules about angles. If the paddle were a mirror, the player could never change the ball’s direction, only its timing. If the angle were random, skill would not matter. The convention that *Breakout* and *Arkanoid* settled on — and that this piece follows — is that the paddle’s **impact point** chooses the angle. Let $u$ be where the ball lands, from −1 at the left end of the paddle to +1 at the right:',
        },
        { type: 'math', tex: 'u = \\frac{x_\\text{ball} - x_\\text{paddle}}{w/2}, \\qquad \\theta = 62^{\\circ} \\cdot u, \\qquad \\vec{v} = s\\,(\\sin\\theta,\\; -\\cos\\theta)', label: '(1)', caption: 'The return: $w$ is the paddle width, $s$ the current speed, and $\\theta$ the angle from vertical.' },
        {
          type: 'p',
          text: 'Walls and bricks are mirrors: they flip the component of velocity across the surface they were hit on, and leave speed unchanged except for the rally’s gradual increase. One guard keeps the game moving. A ball that travels nearly horizontally can bounce between the side walls for a very long time, so after every bounce the piece insists that the vertical component is at least 30 percent of the speed, and that the horizontal component is never quite zero, so the ball cannot settle into a vertical loop between paddle and ceiling.',
        },
        { type: 'math', tex: '|v_y| \\geq 0.3\\,s, \\qquad |v_x| \\geq 0.06\\,s', label: '(2)' },
        { type: 'h', text: 'Where will it land?' },
        {
          type: 'p',
          text: 'Between the paddle and the lowest bricks there is nothing to hit but the side walls, so the ball’s landing point can be predicted exactly. The classic trick is to *unfold* the walls: reflect the playfield across each wall the ball would hit and the bouncing path becomes one straight line. Fly the ball in a straight line to the paddle’s height, at $x\' = x_0 + v_x t$, then fold the result back into the playfield between walls at $a$ and $a + L$:',
        },
        { type: 'math', tex: 'm = (x\' - a) \\;\\text{mod}\\; 2L, \\qquad x_\\text{land} = a + L - |m - L|', label: '(3)', caption: 'Folding an unfolded path back between two walls.' },
        {
          type: 'p',
          text: 'The bot uses the same idea, but walks the path one leg at a time instead of folding it in one step, because it also wants the corner points: it draws the predicted path on screen in attract mode, as a faint dashed line ending in a small cross where the ball will meet the paddle.',
        },
        {
          type: 'aside',
          title: 'Why the corners feel right',
          text: 'Bricks are rectangles and the ball is a circle, so a hit near a corner is ambiguous: did it strike the side or the face? The piece decides by asking where the ball was a moment before the collision. If it was beside the brick, the bounce is sideways; if it was above or below, vertical; if it was diagonally off the corner, both components flip and the ball goes back the way it came. That last case is what players perceive as a satisfying corner shot.',
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
          text: 'The attract-mode bot plays with the same paddle, moving at up to 720 units a second — fast, but no faster than a quick hand on a mouse. It does three things each frame: choose which ball to save, predict where that ball will land, and decide where on the paddle to meet it.',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Choose a ball.** For every free ball it estimates the time until it reaches the paddle: directly if the ball is falling, or via the ceiling if it is rising. The soonest one is the ball to save.',
            '**Predict the landing.** It walks the ball’s flight leg by leg, reflecting off the side walls and the ceiling, until it reaches the paddle’s height. Bricks are ignored, so the prediction is exact once the ball has passed below the wall and only approximate while it is still among the bricks.',
            '**Aim the return.** After every successful return it picks a new target brick, at random but weighted toward the lowest breakable bricks. Knowing the landing point and the target, it computes the angle the ball must leave at, turns that into an impact point with equation (1), adds a little noise, and places the paddle so the ball strikes there. It never aims closer than 18 percent from the ends, which keeps a margin for error.',
          ],
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function predict(b: Ball, yEnd: number): number {
  let x = b.x
  let y = b.y
  let vx = b.vx
  let vy = b.vy
  botPath = [x, y]
  for (let k = 0; k < 8; k++) {
    if (vy <= 0) {
      // up to the ceiling first
      const tt = (y - (TOP + R)) / -vy || 0
      const nx = x + vx * tt
      if (nx < X0 + R || nx > X1 - R) {
        const wx = nx < X0 + R ? X0 + R : X1 - R
        const tw = (wx - x) / vx
        x = wx
        y += vy * tw
        vx = -vx
      } else {
        x = nx
        y = TOP + R
        vy = -vy
      }
    } else {
      // … the same toward the paddle, returning x when it gets there
    }
    botPath.push(x, y)
  }
  return x
}`,
          caption: 'From rebound.ts: the landing prediction, leg by leg, keeping each corner for the dashed path.',
        },
        {
          type: 'p',
          text: 'Capsules are opportunistic. If one is falling and the ball is at least 0.9 seconds away, and the capsule will reach the paddle at least 0.4 seconds before the ball does, the bot goes for the capsule first. With Laser it fires continuously, and with a ball waiting on the paddle it launches after a pause of 0.7 to 1.2 seconds, so you can see the serve.',
        },
        { type: 'h', text: 'Its blind spots' },
        {
          type: 'list',
          items: [
            'It ignores bricks in its prediction, so a ball that is about to hit a brick on its way down can surprise it. Its speed usually covers the error.',
            'It aims at one brick in a straight line from the paddle and never plans bank shots off the walls, which is how a human clears the last brick in a corner.',
            'It has no strategy for getting the ball behind the wall — the most efficient way to clear a round — and only does so by accident.',
            'Its targets are biased toward low bricks, so it works through a wall from the bottom up, steadily rather than quickly.',
          ],
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'A wall in elevation',
      blocks: [
        {
          type: 'p',
          text: 'The playfield is 440 × 420 units: a 12-unit wall on three sides, drawn as architectural section *poché* — two lines with a 45-degree hatch between them — and an open bottom. Bricks are 32 × 14 units on a 13-column grid starting 32 units below the ceiling, which leaves room for the ball to get behind a wall. Six round designs cycle: plain courses, a staircase, a small invader made of bricks, an arcaded facade with gold column bases, a diamond with a silver spine, and pillars.',
        },
        { type: 'h', text: 'Hatching without clipping' },
        {
          type: 'p',
          text: 'Every course of bricks has its own hatch: angle, spacing and accent, and some are cross-hatched. The style index rotates by three each round, so the same pattern reads differently the next time it comes round. The first version drew each course’s hatching as long lines across the whole row and clipped them to the bricks. That looked right but, on a large canvas without GPU help, clipping made a single frame cost tens of milliseconds. The piece now cuts every hatch line to its brick analytically, as a pair of line-and-slab intersections, with no clip regions at all.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `function hatchRect(ctx, x, y, w, h, gap, angle) {
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const cx = x + w / 2
  const cy = y + h / 2
  const ext = (Math.abs(w * sa) + Math.abs(h * ca)) / 2
  const cn = -sa * cx + ca * cy
  for (let d = Math.ceil((cn - ext) / gap) * gap - cn; d <= ext; d += gap) {
    const px = cx - sa * d
    const py = cy + ca * d
    let t0 = -1e9
    let t1 = 1e9
    // clip the line to the slab x..x+w, then to y..y+h
    const a = (x - px) / ca, b = (x + w - px) / ca
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b))
    const c = (y - py) / sa, e = (y + h - py) / sa
    t0 = Math.max(t0, Math.min(c, e)); t1 = Math.min(t1, Math.max(c, e))
    if (t1 - t0 < 0.3) continue
    ctx.moveTo(px + ca * t0, py + sa * t0)
    ctx.lineTo(px + ca * t1, py + sa * t1)
  }
}`,
          caption: 'Hatch lines cut to a rectangle (trimmed: the real function also handles exactly horizontal and vertical lines). Offsets sit on a global grid, so neighboring bricks’ hatching lines up like one drawing.',
        },
        { type: 'h', text: 'The ball and the bricks' },
        {
          type: 'p',
          text: 'The ball moves in sub-steps of at most 2 units, so even at top speed it cannot pass through a brick between frames. At each sub-step it checks the side walls and ceiling, the paddle, and then only the bricks under its bounding box. Of the bricks it overlaps, the nearest is hit; the bounce direction comes from where the ball was a sub-step earlier, as described above. The paddle catches a falling ball whose bottom crosses its top edge anywhere within its width plus the ball’s radius, which is a little generous to the player.',
        },
        {
          type: 'code',
          lang: 'ts',
          code: `const top = PY - PH / 2 + pDip
if (b.vy > 0 && b.y + R >= top && oy + R <= top + 3 && Math.abs(b.x - px) <= pw / 2 + R) {
  const off = clamp((b.x - px) / (pw / 2), -1, 1)
  const a = off * (62 * Math.PI) / 180
  b.y = top - R
  if (mode === 'C' && phase === 'live') {
    b.stuck = true          // Catch: hold the ball where it landed
    b.off = b.x - px
  } else {
    b.vx = Math.sin(a) * speed
    b.vy = -Math.cos(a) * speed
  }
  pDipV = 26                // the paddle dips and springs back
  combo = 0
}`,
          caption: 'The return, from `stepBall` (lightly trimmed): equation (1) in code.',
        },
        { type: 'h', text: 'Juice, in linework' },
        {
          type: 'list',
          items: [
            'A broken brick scatters its own hatching: a dozen short sticks at the course’s hatch angle, plus its top and bottom edges, tumbling and falling under gravity in the course’s accent. A hairline ring opens where it stood.',
            'Each break plays a soft triangle note on a C-major pentatonic scale, one step higher for every brick in the same rally, with a faint octave above it; returning the ball resets the climb.',
            'Silver and gold bricks flash a diagonal glint across their face when struck. The paddle dips and springs back on a damped spring. The ball trails a short fading line.',
            'The paddle is a capsule with hatched end caps, a ruler of seven ticks marking its hit zones, and a live dimension line underneath that reads its width — 64, or 96 with Enlarge, easing between them.',
            'Capsules tumble: pale bands roll across them while the letter fades in and out, and on larger screens the capsule’s name rides beside it as it falls.',
            'A cleared round gets a tally card — round, bricks, time, best combo, each with a dotted leader — and then a section line, dashed and arrowed like a cut on a drawing, sweeps across the field and draws the next wall in behind it.',
          ],
        },
        { type: 'h', text: 'Small screens and first play' },
        {
          type: 'p',
          text: 'The round label, speed readout and paddle dimension appear only when the field is drawn at more than 1.1 pixels per unit. The tally card and power-up banners are set in screen pixels, never smaller than legible, so they read on a phone held sideways. While a ball waits on the paddle, a dotted arrow climbs from it with a dot riding up, labeled for your input — click, tap or Space — and the same cue asks you to release a caught ball. On your first rally a ghost paddle slides along a dotted rail beneath the real one, until your first successful return. With a ball in play and the mouse over the field, the pointer hides: the paddle is the cursor.',
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
            '**No enemies, no DOH.** The drifting ceiling creatures and the final round are left out; the piece cycles six rounds indefinitely, with silver bricks toughening each cycle.',
            '**Five capsules, not seven.** Break (the warp to the next round) and the extra-life capsule are omitted. Multi stands in for Arkanoid’s Disruption.',
            '**Scoring by height.** Ordinary bricks are worth more the higher their course sits in the wall, rather than by color, because here color and hatching follow the course.',
            '**A wider, shorter field.** The original screen is tall; this one is nearly square so the wall reads well in a landscape viewer.',
            '**Pointer control.** A mouse sets the paddle’s position directly, a finger drags it, and the arrow keys accelerate it — the closest equivalents to the original’s knob.',
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
            '**Play the ends of the paddle.** A center hit sends the ball straight back up the column it came from. To steer, meet it off-center on purpose.',
            '**Get behind the wall.** Aim for a gap at one side. A ball that reaches the space above the bricks breaks them from behind, many in a row, and the combo climbs the whole scale.',
            '**Save Slow for later.** The ball speeds up through every rally. Catching Slow near the end of a long rally is worth more than catching it at the start.',
            '**Catch, then aim.** With Catch, the ball is held where it landed. Move the paddle so that spot points where you want, then release.',
            '**Take Multi with care.** Three balls clear a wall quickly, but you can only save one at a time, and no capsules fall until you are back to a single ball.',
            '**Watch the bot’s dashed line.** In attract mode it shows exactly where the ball will land. Your own eye should be doing the same thing.',
          ],
        },
        {
          type: 'p',
          text: 'On a touch screen, the on-screen pad gives you ← and → to move and Launch to serve, release a caught ball, fire the laser while held, and start or restart the game. You can also drag anywhere on the field — the paddle follows your finger’s horizontal position — and tap to launch.',
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Move the paddle, accelerating as you hold (or A, D)' },
      { keys: ['Space'], action: 'Launch, release a caught ball, or fire the laser while held (or ↑, Z, X)' },
      { keys: ['Enter'], action: 'Start, and play again after a game over' },
    ],
    gestures: [
      { gesture: 'move', action: 'With a mouse, the paddle follows the pointer across the field' },
      { gesture: 'drag', action: 'On touch, the paddle follows your finger' },
      { gesture: 'tap', action: 'Launch or release the ball; hold to fire the laser; tap the title card to start' },
    ],
    tip: 'Meet the ball off-center on purpose: the ends of the paddle send it out at up to 62 degrees.',
  },
  pad: {
    left: [
      { label: '←', code: 'ArrowLeft', aria: 'Move left' },
      { label: '→', code: 'ArrowRight', aria: 'Move right' },
    ],
    right: [{ label: 'Launch', code: 'Space', aria: 'Launch, release or fire; also starts', wide: true }],
  },
  further: [
    { title: 'iWoz: From Computer Geek to Cult Icon', by: 'Steve Wozniak with Gina Smith', year: '2006', note: 'Wozniak’s own account, including building the Breakout prototype.' },
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001', note: 'Covers Breakout at Atari.' },
    { title: 'Replay: The History of Video Games', by: 'Tristan Donovan', year: '2010' },
    { title: 'Atari Inc.: Business Is Fun', by: 'Marty Goldberg and Curt Vendel', year: '2012', note: 'Atari’s side of the Breakout story.' },
  ],
}

export default guide
