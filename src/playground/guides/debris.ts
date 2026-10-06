import type { Guide } from '../guide'

/*
 * Notes for G.03 Debris, after Asteroids (Atari, 1979).
 */

const leadFigure = `<svg viewBox="0 0 320 170" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, monospace" font-size="9">
<path d="M40 128 L58 120 L44 112 L48 120 Z" stroke-linejoin="round"/>
<circle cx="236" cy="54" r="14"/>
<path d="M236 54 L268 92" stroke-dasharray="3 3"/>
<path d="M262 88 L268 92 L265 85"/>
<circle cx="268" cy="92" r="14" stroke-dasharray="2 3" opacity="0.6"/>
<path d="M58 120 L268 92" stroke="#3F7A55"/>
<path d="M58 120 L236 54" stroke-dasharray="1 3" opacity="0.7"/>
<path d="M262 86 L274 98 M274 86 L262 98" stroke="#2B6A93"/>
<text x="20" y="146" fill="currentColor" stroke="none">SHIP</text>
<text x="224" y="32" fill="currentColor" stroke="none">ROCK NOW</text>
<text x="274" y="118" fill="currentColor" stroke="none">AIM POINT</text>
<text x="132" y="78" fill="currentColor" stroke="none" opacity="0.8">d</text>
<text x="252" y="70" fill="currentColor" stroke="none">v·t</text>
<text x="150" y="122" fill="#3F7A55" stroke="none">S·t</text>
</svg>`

const guide: Guide = {
  lede: 'A hairline dart in a field of drifting rock, drawn like a survey plate. Asteroids was a physics toy with a scoring system bolted on, and this study keeps the physics honest: momentum you have to cancel, a world that wraps, and rocks that turn one problem into two.',
  facts: [
    ['After', 'Asteroids · Atari, 1979'],
    ['Original design', 'Lyle Rains, Ed Logg'],
    ['Display (original)', 'Monochrome vector monitor'],
    ['Field', '480 × 360 units (taller or square on narrow screens), wrapped'],
    ['Ship', 'Rotation with inertia, 215 u/s² thrust, exponential drag'],
    ['Rocks', 'Large 20 · medium 50 · small 100 points'],
    ['Saucers', 'Large 200 · small 1,000 points'],
    ['Bot', 'Quadratic lead targeting, closest-approach threat test'],
    ['Extra ship', 'Every 10,000 points'],
  ],
  sections: [
    {
      id: 'original',
      kicker: 'The original',
      title: 'A field of rocks, and nothing else',
      blocks: [
        {
          type: 'p',
          text: 'Atari released *Asteroids* in November 1979. Lyle Rains came up with the idea and Ed Logg programmed it, and it went on to become the company’s best-selling coin-op machine. The premise fits in one sentence: you are a small triangle in the middle of a black screen, rocks drift in from the edges, and you shoot them. Large rocks break into two medium rocks, medium rocks into two small ones, and small ones vanish. When the field is clear a new wave arrives with more rocks. Every so often a flying saucer crosses the screen and shoots at you.',
        },
        {
          type: 'p',
          text: 'What made it matter was the feel. The ship does not move like a cursor. You rotate it, you fire a short burn, and it keeps sliding the way you pushed it until friction slowly bleeds the speed away. To stop, you turn around and burn the other way. The screen wraps, so a rock leaving the right edge comes back on the left, and so do you. That small world with no walls turned the game into a lesson in momentum. It was harder than it looked and more forgiving than it seemed, and players stood at the cabinet for hours learning to drift.',
        },
        {
          type: 'p',
          text: 'The cabinet drew with a vector monitor rather than a grid of pixels. The electron beam was steered directly from point to point, tracing bright, perfectly sharp lines on a dark screen. Nothing was filled in; every object was an outline. That constraint is the reason this study fits the site’s drawing language so easily. The original already looked like linework, and the step from glowing phosphor on black to ink hairlines on paper is a short one.',
        },
        {
          type: 'p',
          text: '*Asteroids* also helped make the high-score table a social object. It was one of the first arcade games to let a player enter initials next to a score, so a machine in a bar or an arcade became a running record of who had been there and how good they were. The bonus ship every 10,000 points and the steady tempo of the saucers gave skilled players a reason to keep going, sometimes for a very long time on a single coin.',
        },
        {
          type: 'aside',
          title: 'Lurking',
          text: 'The best-known exploit of the original was “lurking”: clear all but one slow rock, park near the edge of the screen, and pick off saucers for points without ever finishing the wave. It shows how much of the game’s design lives in its incentives. This version doesn’t try to stop you, but saucers arrive on a steady clock and fire more often in later waves, so lurking is a choice with a cost.',
        },
      ],
    },
    {
      id: 'rules',
      kicker: 'The rules',
      title: 'Turn, burn, fire, jump',
      blocks: [
        { type: 'p', text: 'You have five controls: rotate left, rotate right, thrust, fire and hyperspace. The ship starts in the center of the field with three lives. Each wave begins with large rocks drifting in from the edges; the first has four and each later wave adds one, up to eleven.' },
        {
          type: 'table',
          head: ['Target', 'Radius (units)', 'Points', 'Becomes'],
          rows: [
            ['Large rock', '30', '20', 'two medium'],
            ['Medium rock', '16', '50', 'two small'],
            ['Small rock', '8.5', '100', 'nothing'],
            ['Large saucer', '12.5', '200', '—'],
            ['Small saucer', '7.5', '1,000', '—'],
          ],
          caption: 'Point values follow the original. Sizes are in playfield units on a 480-unit-wide field.',
        },
        {
          type: 'list',
          items: [
            '**Splitting.** A shot rock is replaced by two smaller ones flung apart on either side of the bullet’s line, each faster than its parent. A wave gets busier as you clear it, until suddenly it is empty.',
            '**Saucers.** A saucer enters from the left or right edge, at first every fifteen seconds or so and more often in later waves, zig-zags across and leaves on the far side. The large one fires mostly at random; the small one aims at you, more accurately as your score rises. Saucer shots break rocks too, and a saucer that flies into a rock is destroyed.',
            '**Collisions.** Touching a rock or saucer, or being hit by a saucer shot, costs a ship; the rock you hit breaks as if shot. After a loss the next ship waits until the center of the field is clear, then appears with a short spell of protection, drawn as a dashed ring.',
            '**Hyperspace.** The ship folds out of the world and reappears somewhere random half a second later. It is an escape, not a guarantee: you can land next to a rock.',
            '**Bonus.** An extra ship every 10,000 points.',
          ],
        },
        { type: 'p', text: 'Each wave speeds the rocks up by about seven percent, to a ceiling of one and three-quarter times the first wave’s pace. The background heartbeat, two alternating low notes as in the original, quickens as rocks multiply and as the wave wears on.' },
      ],
    },
    {
      id: 'machine',
      kicker: 'Inside the machine',
      title: 'What the original was doing',
      blocks: [
        {
          type: 'p',
          text: 'The arcade board paired a MOS Technology 6502 processor with Atari’s vector-generator hardware. Rather than writing pixels, the program built a list of drawing instructions each frame (move the beam here, draw a line of this length at this brightness) and the vector hardware traced them on the monitor. Rocks were stored as a handful of fixed outlines in a few sizes and drawn at different positions and scales; their apparent variety comes from that small library, not from per-rock geometry.',
        },
        {
          type: 'p',
          text: 'The ship’s physics are the part every player feels. Thrust adds velocity in the direction the nose points, a small amount every frame the button is held. Friction removes a fraction of the velocity every frame, so a coasting ship slows smoothly rather than stopping dead. There is a top speed. The bullets inherit the ship’s velocity, which is why firing while drifting sideways sends shots off at an angle, and why the original limited you to a few shots in flight at once. Firing was rationed, so you had to aim instead of spraying.',
        },
        {
          type: 'p',
          text: 'The heartbeat was more than atmosphere. Its tempo tracked the state of the wave, so an experienced player could hear how much danger was left without looking. Its two notes are one of the most recognizable sounds of the period, and they are a good example of feedback that is both information and mood.',
        },
      ],
    },
    {
      id: 'bot',
      kicker: 'The bot',
      title: 'How the attract mode plays',
      blocks: [
        {
          type: 'p',
          text: 'In the preview and behind the title card, a small controller flies the ship with exactly the same inputs a player has: turn left or right, thrust, fire, jump. Its decisions are recomputed every simulation step (about sixty times a second) and it draws what it is thinking: thin blue brackets around the rock it has chosen, a dashed line from the nose to its aim point, and a small cross where it expects bullet and rock to meet.',
        },
        { type: 'h', text: 'Choosing a target' },
        {
          type: 'p',
          text: 'For every rock, the saucer, and every saucer bullet, the bot computes the shortest displacement across the wrapped field and the velocity relative to the ship. Two numbers come out of that. The first is a target score: distance to the rock’s edge, reduced by how fast it is closing, with a small preference for small rocks (they are worth the most and are the hardest to dodge). The lowest score wins. The saucer is considered only after it has been on screen for a few seconds, so it gets a chance to fly.',
        },
        {
          type: 'p',
          text: 'The second is a danger test. For constant velocities, the time of closest approach and the miss distance have a closed form. With relative position $\\vec{d}$ and relative velocity $\\vec{v}$:',
        },
        { type: 'math', tex: 't_{ca} = -\\frac{\\vec{d}\\cdot\\vec{v}}{\\vec{v}\\cdot\\vec{v}}, \\quad m = |\\vec{d} + \\vec{v}\\,t_{ca}| - r - r_{ship}', label: '(1)' },
        {
          type: 'p',
          text: 'If $0 < t_{ca} < 1.3$ s and $m$ is under a small margin, that object is on a collision course. The earliest such threat becomes the danger the bot reacts to.',
        },
        { type: 'h', text: 'Leading the shot' },
        {
          type: 'p',
          text: 'A bullet leaves the nose at speed $S$ relative to the ship, so in the ship’s frame the problem is clean: find the time $t$ at which a bullet fired now in some direction meets a rock moving at $\\vec{v}$ from offset $\\vec{d}$. The meeting point $\\vec{d} + \\vec{v}t$ must be exactly $St$ away:',
        },
        { type: 'math', tex: '|\\vec{d} + \\vec{v}t| = St \\quad\\to\\quad (\\vec{v}\\cdot\\vec{v} - S^2)\\,t^2 + 2(\\vec{d}\\cdot\\vec{v})\\,t + \\vec{d}\\cdot\\vec{d} = 0', label: '(2)' },
        {
          type: 'p',
          text: 'Because the bullet is far faster than any rock, the leading coefficient is negative and the constant term positive, so the quadratic always has one positive root. The bot aims at $\\vec{d} + \\vec{v}t$ for that root.',
        },
        { type: 'figure', svg: leadFigure, alt: 'A ship at lower left, a rock at upper right with its velocity arrow, and the aim point where the rock will be when a bullet fired now arrives.', caption: 'Lead targeting. The bullet (green) is aimed at where the rock will be after $t$ seconds, not where it is now (dotted).' },
        {
          type: 'code',
          lang: 'ts',
          code: `// lead: |d + rv·t| = S·t
const a = tgt.rvx * tgt.rvx + tgt.rvy * tgt.rvy - BULLET_V * BULLET_V
const b = 2 * (tgt.dx * tgt.rvx + tgt.dy * tgt.rvy)
const c = tgt.dx * tgt.dx + tgt.dy * tgt.dy
const disc = b * b - 4 * a * c
let tt = 0
if (disc > 0) tt = Math.max(0, (-b - Math.sqrt(disc)) / (2 * a))
const ax = tgt.dx + tgt.rvx * tt
const ay = tgt.dy + tgt.rvy * tt
const want = Math.atan2(ay, ax)
const diff = angleDiff(ship.a, want)
inp.rot = Math.abs(diff) < 0.015 ? 0 : clamp(diff * 5.5 - ship.va * 0.16, -1, 1)
const dist = Math.hypot(ax, ay)
const tol = Math.max(0.035, Math.atan2(tgt.r * 0.7, dist))
if (Math.abs(diff) < tol && dist < BULLET_V * BULLET_LIFE * 0.92 && botFireCd <= 0) {
  inp.fire = true
  botFireCd = 0.17
}`,
          caption: 'From `botThink` in `games/debris.ts`. The turn command is a proportional-derivative term: angle error, minus a little of the current spin so the nose settles instead of overshooting.',
        },
        { type: 'h', text: 'Moving, and getting out of the way' },
        {
          type: 'p',
          text: 'Rotation alone is enough to fight, so the bot thrusts only for three reasons. If a threat is coming and the nose already points away from it, it burns to clear the line of approach. If its chosen target is far off and the nose is lined up, it closes in, which keeps it moving around the field and shows off the drift and the velocity annotation. And if it is sliding fast with its nose pointed back against its motion, it burns to brake. As a last resort, when a collision is a fraction of a second away and turning can’t help, it may jump to hyperspace.',
        },
        {
          type: 'p',
          text: '**Blind spots.** The bot assumes everything moves in straight lines, so it can be surprised by rocks born from a split it just caused, right next to the ship. It doesn’t plan routes; it reacts. And it fires only when its own aim is good, so a fast small saucer zig-zagging across the screen can outlast it. It is strong enough to clear waves for minutes at a time, which is the point of an attract mode.',
        },
      ],
    },
    {
      id: 'build',
      kicker: 'How the piece is built',
      title: 'Physics, wrap, and the drawing',
      blocks: [
        {
          type: 'p',
          text: 'Everything lives in one module that exports a `CreatePiece` function. The game is a small state machine: *attract* (the bot plays forever, used in previews), *title* (the bot plays behind the title card), *play* and *over*. Simulation and drawing are separate. Each frame, the elapsed time is split into substeps of at most 17.5 ms so fast bullets can’t tunnel through small rocks, the world is advanced, and then the whole frame is painted from scratch.',
        },
        { type: 'h', text: 'The ship' },
        {
          type: 'code',
          lang: 'ts',
          code: `ship.va += (inp.rot * ROT_MAX - ship.va) * damp(15, dt)
ship.a += ship.va * dt
const ca = Math.cos(ship.a)
const sa = Math.sin(ship.a)
if (inp.thrust) {
  ship.vx += ca * THRUST * dt
  ship.vy += sa * THRUST * dt
}
const sp = Math.hypot(ship.vx, ship.vy)
if (sp > MAX_V) {
  ship.vx *= MAX_V / sp
  ship.vy *= MAX_V / sp
}
const k = Math.exp(-DRAG * dt)
ship.vx *= k
ship.vy *= k
ship.x = mod(ship.x + ship.vx * dt, W)
ship.y = mod(ship.y + ship.vy * dt, H)`,
          caption: 'The ship’s step, lightly trimmed. Rotation eases toward its target rate rather than snapping, which is the “rotation inertia” you feel as a slight lag when you tap a turn key.',
        },
        {
          type: 'p',
          text: 'Two details make it framerate-independent. The rotation uses `damp(k, dt)`, which is $1 - e^{-k\\,dt}$, the exact fraction an exponential approach covers in time $dt$. The drag multiplies velocity by $e^{-0.5\\,dt}$ each step, so a coasting ship loses about 40 percent of its speed per second however the time is sliced:',
        },
        { type: 'math', tex: '\\dot{\\vec{v}} = T\\hat{h} - c\\,\\vec{v} \\quad\\to\\quad \\vec{v}(t) = \\vec{v}_0\\,e^{-ct} \\text{ while coasting}', label: '(3)' },
        {
          type: 'p',
          text: 'Here $T$ is the thrust acceleration (215 units/s²), $\\hat{h}$ the unit heading and $c = 0.5$ per second the drag constant. Speed is capped at 240 units/s. Bullets travel at 390 units/s plus the ship’s velocity and live for 0.92 s, so a shot crosses about three-quarters of the field. Five may be in flight at once.',
        },
        { type: 'h', text: 'A world that wraps' },
        {
          type: 'p',
          text: 'Positions are kept in $[0, W) \\times [0, H)$ with a positive modulo. Distances use the shortest displacement on a torus, `d - L * Math.round(d / L)` on each axis, so a rock on the far right edge is correctly “near” a ship on the far left. Drawing handles the seam by drawing any object within its radius of an edge a second time, offset by the field width or height, and clipping to the frame. A rock sliding off the right edge appears on the left in the same frame.',
        },
        { type: 'h', text: 'Rocks as survey drawings' },
        {
          type: 'p',
          text: 'Each rock is generated once, from a seeded random sequence, when it is created: 13, 10 or 8 vertices around a circle with jittered angles and radii, and one vertex deliberately pulled in to give it a bite. Inside, one or two crack strokes start at a vertex and kink inward, and large and medium rocks get a small patch of parallel hatching placed safely inside the outline. A rock spins slowly. When it arrives at the start of a wave its outline is drawn on progressively, the site’s draw-on stroke, and it can’t hurt you until it is complete.',
        },
        {
          type: 'p',
          text: 'All rock outlines are batched into a single path and stroked once; cracks and hatching are two more batched strokes at lower opacity. That keeps the cost flat even with forty small rocks on screen.',
        },
        { type: 'h', text: 'The juice' },
        {
          type: 'list',
          items: [
            '**Breaking.** A shot rock throws hairline sparks, a ring expanding from its edge, and its own outline: every segment becomes a short line fragment that tumbles outward and fades.',
            '**The ship.** A crisp dart with a rear crossbar and a dot at its center of mass. Thrust shows as three flickering moss-colored strokes. A trail of faint blue points plots its recent path, and while it moves a small dimension-style arrow shows its velocity with a readout such as `v 142` (units per second).',
            '**Loss.** The dart comes apart into its four lines, with sparks, two rings and a short screen shake. A dashed registration mark waits at the center until it is safe to return.',
            '**Hyperspace.** The ship shrinks and spins away from where it was, and a ring opens where it lands.',
            '**Waves.** “WAVE 02”, a dimension rule drawn out beneath it, and the wave’s rock count and speed factor in small type.',
            '**Sound.** Off by default. The heartbeat, a soft falling note for each shot, filtered noise for thrust and breaks, a pentatonic note for each small rock in a quick combo, a two-note warble for the saucer.',
          ],
        },
        { type: 'h', text: 'Collisions, and fairness' },
        {
          type: 'p',
          text: 'Every collision is a circle test on the wrapped field, which is cheap and, at this scale, indistinguishable from testing the outlines. The circles are chosen to favor the player. The ship’s collision radius is 4.2 units, although the drawn dart is 22 units long and 14 wide, so a rock has to cross into the body of the ship rather than brush a wingtip. A rock counts as touching the ship at 86 percent of its radius, while a bullet counts as hitting a rock at 104 percent plus a unit and a half. Rocks drawing themselves on at the start of a wave can’t hurt you, and the pieces of a split rock are solid from the moment they appear, so a ship parked beside a big rock is in more danger than it looks.',
        },
        {
          type: 'p',
          text: 'The substeps exist for the same reason. A bullet moving at 390 units a second covers 6.8 units in a 17.5 ms step, far less than the 17-unit diameter of the smallest rock, so a shot can’t pass through a rock between one test and the next. At 30 frames a second in a preview, each frame simply runs two substeps.',
        },
        { type: 'h', text: 'Saucers in detail' },
        {
          type: 'p',
          text: 'Whether a saucer is large or small is decided as it enters. The chance of a small one is zero for the first few thousand points and in the first waves, then grows with score and wave number to a ceiling of 75 percent. A large saucer fires about every 1.15 seconds, usually in a random direction and occasionally at you; a small one fires about every 0.85 seconds and always aims, with an error that shrinks from about 20 degrees at low scores to under 4 degrees by 40,000 points. Saucers change vertical direction every second or so, wrap vertically but not horizontally, and leave when they reach the far edge.',
        },
        { type: 'h', text: 'Determinism' },
        {
          type: 'p',
          text: 'All gameplay randomness (rock shapes, spawn positions, split angles, saucer timing) comes from one seeded generator, and visual randomness (flame flicker, shake) from a second. Given the same inputs, the game plays out identically, which is what lets the test route step it to an exact moment for a screenshot, and what makes the attract mode the same small film each time it starts.',
        },
        { type: 'h', text: 'Teaching without a manual' },
        {
          type: 'p',
          text: 'The first time you play in a given browser, the field shows you what to do, once. A dotted arc with a sweeping dot sits in front of the nose with the word TURN until you have turned for a moment. Then ghost shots leave the nose with the word FIRE until your first hit. Then a dashed flame behind the ship says THRUST until you have burned. After that the hints are gone for good. Until you have used hyperspace once, a blinking JUMP ↓ appears above the ship when a rock is about to hit it, at most three times per visit. The cursor changes too: on the left half of the screen it is a grab hand (that half is a steering stick for touch and mouse), and on the right half a crosshair (tap to fire).',
        },
        { type: 'h', text: 'Any screen' },
        {
          type: 'p',
          text: 'Because the field wraps, its shape is free. Wide screens get a 480 × 360 field, square-ish ones 420 × 420, and tall phones 360 × 540. On a resize the positions of everything scale with the field. On wide, short screens (a phone held sideways) the score and lives move into the side margins so the field can use the whole height.',
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
            '**Stay near the middle and turn, don’t fly.** Most of the game can be played by rotating in place and firing. Thrust when you need to reposition, and then brake.',
            '**Break rocks one at a time.** Each large rock becomes two mediums and then four smalls. Clear the pieces of one rock before starting on the next, or the field fills with fast debris.',
            '**Watch the seams.** Rocks leaving one edge come back on the opposite one. The danger in a wrapped world is usually behind you.',
            '**Read the velocity arrow.** If the little blue arrow is long, you are going faster than you think. Turn around and burn until it shrinks.',
            '**Shoot the small saucer.** It is worth 1,000 points, five large rocks’ worth, and the longer it stays the better it aims.',
            '**Save hyperspace for the last instant.** It is a gamble, so use it only when a collision is certain.',
            '**Listen.** When the heartbeat quickens, the wave is getting dense. Slow down.',
          ],
        },
        {
          type: 'aside',
          title: 'Reading the drawing',
          text: 'Blue corner brackets: the rock the bot has chosen. A dashed blue line and a small blue cross: its aim point. Faint blue points behind the ship: its recent path, one point every 70 ms. The blue dimension arrow: velocity, with `v` in units per second. A dashed moss ring around a new ship: protection, closing as it runs out. A dashed circle and crosshair at the center: the next ship waiting for a clear space. Small gray numbers: points, rising from where they were scored.',
        },
        {
          type: 'aside',
          title: 'Liberties taken',
          text: 'The original’s exact constants (thrust, drag, rock speeds, saucer timing) aren’t reproduced; these are tuned by feel for a smaller, letterboxed field. Five shots may be in flight rather than the original’s handful, rocks have individual outlines rather than a few shared shapes, and hyperspace never destroys the ship. The collision circles are deliberately smaller than the drawings, in your favor.',
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Turn (A and D also work)' },
      { keys: ['↑'], action: 'Thrust (W)' },
      { keys: ['Space'], action: 'Fire; hold to keep firing (Z, X)' },
      { keys: ['↓'], action: 'Hyperspace (S or Shift)' },
      { keys: ['Enter'], action: 'Start or play again' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Left half: drag from where you touch to steer; drag further to thrust' },
      { gesture: 'tap', action: 'Right half: tap to fire, hold to keep firing' },
    ],
    tip: 'Turn more than you fly. Every burn has to be cancelled by another one.',
  },
  pad: {
    left: [
      { label: '↺', code: 'ArrowLeft', aria: 'Turn left' },
      { label: '↻', code: 'ArrowRight', aria: 'Turn right' },
    ],
    right: [
      { label: 'Thrust', code: 'ArrowUp' },
      { label: 'Fire', code: 'Space', wide: true, aria: 'Fire, or start' },
      { label: 'Jump', code: 'ArrowDown', aria: 'Hyperspace' },
    ],
  },
  further: [
    { title: 'The Ultimate History of Video Games', by: 'Steven L. Kent', year: '2001', note: 'Atari in the arcade era, including *Asteroids* and its success.' },
    { title: 'Replay: The History of Video Games', by: 'Tristan Donovan', year: '2010' },
    { title: 'Atari Inc.: Business Is Fun', by: 'Curt Vendel and Marty Goldberg', year: '2012', note: 'A detailed company history, with the coin-op division and its engineers.' },
    { title: 'Game Feel: A Game Designer’s Guide to Virtual Sensation', by: 'Steve Swink', year: '2009', note: 'On why inertia, drag and response time make a control feel the way it does.' },
  ],
}

export default guide
