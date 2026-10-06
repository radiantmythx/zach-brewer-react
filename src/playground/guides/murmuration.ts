import type { Guide } from '../guide'

const rules = `<svg viewBox="0 0 330 150" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g opacity="0.35"><circle cx="55" cy="72" r="38" stroke-dasharray="2 3"/><circle cx="165" cy="72" r="38" stroke-dasharray="2 3"/><circle cx="275" cy="72" r="38" stroke-dasharray="2 3"/></g>
<g><path d="M55 72 l-5 -3 m5 3 l-5 3"/><path d="M48 60 l-4 -3 m4 3 l-4 3"/><path d="M62 84 l-4 -3 m4 3 l-4 3"/></g>
<g stroke="#2B6A93"><path d="M55 72 L37 82"/><path d="M48 60 L36 50"/><path d="M62 84 L74 94"/></g>
<g><path d="M165 72 l-5 -3 m5 3 l-5 3"/><path d="M150 58 l-4 -3 m4 3 l-4 3"/><path d="M182 62 l-4 -3 m4 3 l-4 3"/><path d="M158 90 l-4 -3 m4 3 l-4 3"/></g>
<g stroke="#2B6A93"><path d="M165 72 L185 70"/></g>
<g><path d="M275 72 l-5 -3 m5 3 l-5 3"/><path d="M256 56 l-4 -3 m4 3 l-4 3"/><path d="M296 60 l-4 -3 m4 3 l-4 3"/><path d="M262 94 l-4 -3 m4 3 l-4 3"/><path d="M292 90 l-4 -3 m4 3 l-4 3"/></g>
<g stroke="#2B6A93"><path d="M275 72 L277 76"/><circle cx="277" cy="76" r="2"/></g>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1">
<text x="18" y="132">SEPARATION</text><text x="134" y="132">ALIGNMENT</text><text x="248" y="132">COHESION</text>
<text x="18" y="144" opacity="0.6">move apart</text><text x="134" y="144" opacity="0.6">match velocity</text><text x="248" y="144" opacity="0.6">move to centre</text></g>
</svg>`

const guide: Guide = {
  lede:
    'Two and a half thousand birds, each following three local rules, fold into one dark, breathing shape over a reed bed at dusk. When a falcon stoops, the alarm runs through the flock faster than any bird can fly.',
  facts: [
    ['Model', 'Boids (Reynolds, 1987), in three dimensions'],
    ['Birds', '2,500 in the viewer, 560 in a preview'],
    ['Neighbours', 'At most 20 within 26 units, nearest cells first'],
    ['Search', 'Spatial hash, 8,192 buckets, rebuilt every step'],
    ['Integrator', 'Semi-implicit Euler with a speed clamp, one step per frame'],
    ['Alarm', 'An excitable medium: fuse, fire, refractory'],
    ['Predator', 'A peregrine stoop every 10.5 s, or on a tap'],
    ['Script cost', 'About 3 ms per frame for the flock at 60 Hz'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'A shape with no one in charge',
      blocks: [
        {
          type: 'p',
          text: 'On winter evenings across Britain, Ireland, the Netherlands, Denmark and much of southern Europe, European starlings (*Sturnus vulgaris*) gather above their roosts before settling for the night. They come in from the fields in loose groups, merge, and then for twenty minutes or so the whole assembly — a few thousand birds on a small night, hundreds of thousands on a large one — turns and swells and folds in the sky over a reed bed, a pier or a city square. The display is called a **murmuration**, after the sound: a soft roar of wings that you hear as the flock turns over your head.',
        },
        {
          type: 'p',
          text: 'What makes a murmuration astonishing is that nothing directs it. There is no leader and no plan, and no bird can see more than a few of its neighbours through the crowd. Yet the flock behaves like a single body. It changes direction in a fraction of a second, stretches into ribbons, splits around an obstacle and closes again, and its edges stay sharp. Waves of darkness sweep across it. The shape is *emergent*: a pattern at the scale of the group that is not written anywhere in the behaviour of any individual.',
        },
        {
          type: 'p',
          text: 'Why starlings do this is still argued over. The most supported explanation is protection from predators. Peregrine falcons, sparrowhawks and merlins hunt at roosts, and a dense, rapidly turning mass makes it hard for a hawk to single out a target; every bird is safer in the middle of many (the *dilution* and *confusion* effects). Larger murmurations tend to draw more predators and to last longer, which fits that story. Other suggested reasons — advertising a roost, exchanging information about feeding grounds, keeping warm in a crowd overnight — may all play some part.',
        },
        {
          type: 'h',
          text: 'Measuring a flock',
        },
        {
          type: 'p',
          text: 'For a long time the only way to study a flock was to watch it. That changed in the mid-2000s, when the STARFLAG project in Rome, led by physicists including Andrea Cavagna and Irene Giardina, filmed the starlings that roost by the city’s Termini station with synchronized cameras and reconstructed the three-dimensional position of every bird in flocks of up to a few thousand. The data overturned some old assumptions and confirmed others.',
        },
        {
          type: 'list',
          items: [
            '**Neighbours are counted, not measured.** In 2008 Michele Ballerini and colleagues showed that a starling’s behaviour depends on its six or seven nearest neighbours, whatever their distance — a *topological* interaction rather than a *metric* one. That is what lets a flock stay together when it thins out or packs tight.',
            '**Flocks are thin.** A murmuration is usually a sheet or a lens, much thinner than it is wide. Seen from the ground its darkness changes as the sheet tilts: edge-on it is a black band, face-on a pale veil.',
            '**Correlations reach across the whole flock.** In 2010 Cavagna and colleagues found that the fluctuations of a bird’s velocity are correlated with those of birds right across the flock, however large it is — *scale-free* correlation. Information does not fade with distance; a change on one side is felt on the other.',
            '**Turns travel as waves.** When a flock turns, the turn starts with a few birds and spreads through the rest at a nearly constant speed, typically 20 to 40 metres a second — faster than the birds themselves fly. Attanasi and colleagues described this in 2014 and showed it requires a kind of inertia in how birds change heading.',
          ],
        },
        {
          type: 'p',
          text: 'In the same years, Charlotte Hemelrijk and Hanno Hildenbrandt in Groningen built a computer model of starlings, *StarDisplay*, with banked turns, a fixed number of topological neighbours and attraction to a roost. It reproduces the flattened shapes, the variable density and the waves of real flocks remarkably well, and it showed that much of what we see — the dark bands in particular — is a consequence of how a three-dimensional sheet looks when it is projected onto the sky.',
        },
        {
          type: 'h',
          text: 'The falcon',
        },
        {
          type: 'p',
          text: 'The peregrine (*Falco peregrinus*) hunts starlings by stooping — folding its wings and dropping on the flock from above, reaching speeds faster than any other animal. The flock answers in characteristic ways that ornithologists have named: a **flash expansion**, when birds burst away from the attacker and open a hole; a **vacuole**, a pocket of empty sky that travels with the falcon; and **agitation waves**, dark bands that ripple outward from the point of attack. Studies of Roman murmurations under attack (Procaccini and colleagues, 2011) described these waves in detail: they start near the attacking falcon and roll across the flock away from it. This piece is built around exactly those three responses.',
        },
        {
          type: 'h',
          text: 'Boids',
        },
        {
          type: 'p',
          text: 'In 1986 the computer graphics researcher Craig Reynolds wondered whether a flock could be animated without scripting every bird. He gave each simulated bird — a *boid* — three steering behaviours, all computed only from nearby flockmates: **separation** (steer to avoid crowding), **alignment** (steer toward their average heading) and **cohesion** (steer toward their average position). The paper, presented at SIGGRAPH in 1987, launched a field. Boids flocked convincingly; they flowed around obstacles and split and rejoined. The technique was soon used for the bat swarms and penguin flocks in *Batman Returns* (1992) and has been in films and games ever since.',
        },
        {
          type: 'p',
          text: 'Physicists later stripped the idea to its bones. In 1995 Tamás Vicsek and colleagues studied particles that move at constant speed and simply adopt the average heading of their neighbours, plus a little noise. Below a critical noise level the whole group suddenly aligns and moves together — a phase transition, like a magnet ordering as it cools — and the degree of alignment can be measured by one number, the **polarization** or order parameter. The readout marked $\\phi$ in this piece is that number.',
        },
        {
          type: 'figure',
          svg: rules,
          caption: 'Reynolds’s three rules, as seen by the bird at the centre of each dashed neighbourhood. The blue strokes are the steering each rule asks for; the bird sums them.',
          alt: 'Three neighbourhoods of chevron birds: arrows pushing the central bird away from close neighbours, toward their average heading, and toward their centre.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'Three rules, a container and an alarm',
      blocks: [
        {
          type: 'p',
          text: 'Each bird $i$ has a position $\\mathbf{x}_i$ and a velocity $\\mathbf{v}_i$ in three dimensions. Its neighbourhood $N_i$ is the set of other birds within a radius $R$, capped at $K = 20$ members. With $n = |N_i|$ and $\\mathbf{d}_{ij} = \\mathbf{x}_j - \\mathbf{x}_i$, the three Reynolds terms are:',
        },
        {
          type: 'math',
          tex: '\\mathbf{a}_{\\text{align}} = k_a (\\frac{1}{n} \\sum_{j \\in N_i} \\mathbf{v}_j - \\mathbf{v}_i ), \\quad \\mathbf{a}_{\\text{coh}} = \\frac{k_c}{n} \\sum_{j \\in N_i} \\mathbf{d}_{ij}, \\quad \\mathbf{a}_{\\text{sep}} = -k_s \\sum_{|\\mathbf{d}_{ij}| < r_s} \\frac{\\mathbf{d}_{ij}}{|\\mathbf{d}_{ij}|^2 + \\epsilon}',
          label: '(1)',
          caption: 'Alignment pulls a bird’s velocity toward the local mean; cohesion toward the local centre; separation pushes away from anyone closer than $r_s$, harder the closer they are. Here $k_a = 1.6$, $k_c = 1$, $k_s = 1200$, $R = 26$, $r_s = 8$ and $\\epsilon = 4$ (world units, seconds).',
        },
        {
          type: 'p',
          text: 'Taken alone, these rules make a flock that wanders off the screen or drifts into an untidy blob. Real starlings are held over their roost; the model needs a counterpart. Here it is an **envelope**: a soft, flattened ellipsoid that drifts around the sky, swells and shrinks, tilts, rolls and bends. In the envelope’s own coordinates $(u, v, w)$, with half-axes $a$, $b$, $c$ and a bend $\\beta$ and twist $\\tau$,',
        },
        {
          type: 'math',
          tex: 'q = \\sqrt{ (\\frac{u}{a})^2 + (\\frac{v - b\\,\\hat{u}^2 (1.8\\beta + 1.5\\tau \\hat{u})}{b})^2 + (\\frac{w}{c})^2 }, \\quad \\hat{u} = \\frac{u}{a}',
          label: '(2)',
          caption: '$q < 1$ inside the envelope and $q > 1$ outside. The bend term curves the sheet into a banana; the twist term turns it into an S.',
        },
        {
          type: 'p',
          text: 'Every bird is pushed back along the direction that reduces $q$ fastest (the normalized gradient), gently everywhere and firmly near the wall:',
        },
        {
          type: 'math',
          tex: '\\mathbf{a}_{\\text{env}} = -(55\\, q + 560 \\max(0, \\min(q - 0.85,\\, 0.9)))\\, \\frac{\\nabla q}{|\\nabla q|}',
          label: '(3)',
        },
        {
          type: 'p',
          text: 'Because the envelope is thin in one axis, its orientation decides how the flock looks. When the thin axis lies across the line of sight we see a dense, dark band; when it points at us we see a wide, pale spread. The envelope rotates continuously, so the flock rolls between the two, and its dark folds come from geometry, not from any rule that says *be dark here* — the same effect Hemelrijk’s model explains in real flocks.',
        },
        {
          type: 'h',
          text: 'Speed, and the order parameter',
        },
        {
          type: 'p',
          text: 'The sum of all accelerations (rules, envelope, a slow divergence-free breeze, the predator and the alarm) is integrated with a semi-implicit Euler step, and the new speed is clamped into a band so that no bird ever hovers or races off:',
        },
        {
          type: 'math',
          tex: '\\mathbf{v}_i \\leftarrow \\mathbf{v}_i + \\mathbf{a}_i\\,\\Delta t, \\quad \\mathbf{v}_i \\leftarrow \\mathbf{v}_i \\cdot \\frac{\\operatorname{clamp}(|\\mathbf{v}_i|,\\, v_{\\min},\\, v_{\\max}(1 + 0.45\\,w_i))}{|\\mathbf{v}_i|}, \\quad \\mathbf{x}_i \\leftarrow \\mathbf{x}_i + \\mathbf{v}_i\\,\\Delta t',
          label: '(4)',
          caption: '$v_{\\min} = 105$ and $v_{\\max} = 185$ units per second; $w_i$ is the bird’s alarm level, which lets a frightened bird fly almost half again as fast.',
        },
        {
          type: 'p',
          text: 'The polarization is the length of the average unit velocity, the measure Vicsek used. It is 1 when every bird flies the same way and near 0 when headings are random or the flock is milling in a circle:',
        },
        {
          type: 'math',
          tex: '\\phi = \\frac{1}{N} | \\sum_{i=1}^{N} \\frac{\\mathbf{v}_i}{|\\mathbf{v}_i|} |',
          label: '(5)',
        },
        {
          type: 'h',
          text: 'The alarm as an excitable medium',
        },
        {
          type: 'p',
          text: 'An agitation wave needs three properties: it must spread from bird to bird, travel at a definite speed, and not echo back on itself. Those are the defining properties of an **excitable medium** — the same mathematics used for nerve impulses, heartbeats and forest fires (the Greenberg–Hastings cellular automaton of 1978 is the classic discrete version). Each bird carries three numbers: an excitation $w_i$, a refractory clock $\\rho_i$ and a fuse $f_i$.',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Resting** birds watch their neighbours. If any neighbour’s excitation exceeds 0.5 and the bird is not refractory, its fuse is lit with a short random delay of 50 to 100 ms.',
            '**Firing:** when the fuse burns down the bird jumps to $w_i = 1$, banks sideways away from the alarm and speeds up, and starts a refractory period of $\\rho_i = 1.9$ s.',
            '**Recovering:** excitation decays as $w_i \\leftarrow w_i\\,e^{-3.4\\,\\Delta t}$. Until $\\rho_i$ runs out, the bird ignores further alarms, so the wave cannot travel backwards into the birds that have just fired.',
          ],
        },
        {
          type: 'p',
          text: 'The fuse delay sets the speed of the front. A bird fires roughly 75 ms after its neighbour; neighbours are about one neighbourhood radius apart, so the wave advances about $R / 0.075 \\approx 350$ units a second — about twice the birds’ own cruising speed, which is the ratio observed in real flocks. Birds that fire are drawn heavier and darker, so the wave appears as a dark band rolling outward from the falcon.',
        },
        {
          type: 'aside',
          title: 'Topological, nearly',
          text: 'The model uses a radius $R$ but stops counting at $K = 20$ neighbours, and searches the nearest cells first. In dense regions this behaves like the topological rule the Rome team found (a fixed number of neighbours); in sparse regions it falls back to a metric one. A strictly topological search would need a sort per bird, which costs more than this piece can afford at 60 frames a second.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'Two and a half thousand birds in three milliseconds',
      blocks: [
        {
          type: 'p',
          text: 'The flock lives in flat typed arrays — one `Float32Array` each for position, velocity, acceleration, excitation, fuse, refractory clock, wingbeat phase and so on — so a step allocates nothing and the arrays stay in the processor’s cache. Each frame does one simulation step at the frame’s own `dt` (two half-steps if the frame was slow), then draws.',
        },
        {
          type: 'h',
          text: 'Finding neighbours',
        },
        {
          type: 'p',
          text: 'Comparing every bird with every other would be 3 million distance checks per frame. Instead space is cut into cubes the size of the neighbourhood radius, and each cube is hashed to one of 8,192 buckets using the three large primes from Teschner and colleagues’ 2003 paper on spatial hashing. A counting sort places the birds of each bucket next to each other in one array, so a neighbour query visits 27 cubes and reads only the birds inside them.',
        },
        {
          type: 'code',
          code: `const hash3 = (x: number, y: number, z: number) =>
  (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & MASK

// --- spatial hash (counting sort into buckets)
start.fill(0)
for (let i = 0; i < N; i++) {
  const hsh = hash3(Math.floor(px[i] / R), Math.floor(py[i] / R), Math.floor(pz[i] / R))
  cellOf[i] = hsh
  start[hsh + 1]++
}
for (let b = 0; b < HASH; b++) {
  start[b + 1] += start[b]
  fill[b] = start[b]
}
for (let i = 0; i < N; i++) sorted[fill[cellOf[i]]++] = i`,
          caption: 'Three passes over the flock and one over the buckets build the whole index. `start[b]` to `start[b + 1]` is then the slice of `sorted` that holds bucket `b`.',
        },
        {
          type: 'p',
          text: 'The order in which the 27 cubes are visited matters more than it seems. With a cap of 20 neighbours, a search that always began in the same corner would find a bird’s neighbours on that side first, and cohesion would then pull the whole flock steadily toward that corner. The offsets are therefore sorted by distance — centre first, then the six faces, the twelve edges and the eight corners — and alternate sides within each shell, so a capped search is still balanced.',
        },
        {
          type: 'code',
          code: `/** the 27 neighbouring cells, centre first, then faces, edges and corners, alternating sides */
const OFFS = (() => {
  const list: number[][] = []
  for (let z = -1; z <= 1; z++) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) list.push([x, y, z])
  list.sort((a, b) => a[0] * a[0] + a[1] * a[1] + a[2] * a[2] - (b[0] * b[0] + b[1] * b[1] + b[2] * b[2]) || (a[0] + a[1] + a[2] > 0 ? 1 : -1))
  return Int8Array.from(list.flat())
})()`,
        },
        {
          type: 'h',
          text: 'The alarm, in code',
        },
        {
          type: 'p',
          text: 'The excitable medium of the previous section is a few lines inside the per-bird loop. `maxw` is the largest excitation seen among the bird’s neighbours during the search; `alarmX` is where the alarm came from (the falcon, or the viewer’s hawk).',
        },
        {
          type: 'code',
          code: `// the wave: excitable medium (fuse → fire → refractory)
if (fuse[i] >= 0) {
  fuse[i] -= dt
  if (fuse[i] < 0) {
    wave[i] = 1
    refr[i] = REFR
    // turn away from where the alarm came from: keep heading, bank sideways
    const vl = Math.hypot(vx[i], vy[i]) + 1e-3
    const sgn = alarmX < x ? 1 : -1
    ex[i] = (-vy[i] / vl) * sgn * 0.6 + sgn * 0.4
    ey[i] = (vx[i] / vl) * sgn * 0.6 - 0.2
    ez[i] = 0
  }
} else if (refr[i] <= 0 && maxw > 0.5) fuse[i] = 0.05 + jitter[i] * 0.05
if (wave[i] > 0.02) {
  const k = wave[i] * 420
  fx += ex[i] * k
  fy += ey[i] * k
  fz += ez[i] * k
}`,
        },
        {
          type: 'h',
          text: 'The falcon and the hawk',
        },
        {
          type: 'p',
          text: 'The falcon is not a boid. Each stoop is planned when it begins: a cubic Bézier curve from a point high off-screen on one side, down through the flock’s centre (or through the point you tapped), and out low on the other side, timed over 3.4 seconds with a sine ease so that it accelerates into the dive and slows on the pull-out. Birds within 105 units of it are shoved away along the line from the falcon, harder the closer they are, and are fired at once without a fuse. The flash expansion, the travelling vacuole and the waves all follow from that one push.',
        },
        {
          type: 'p',
          text: 'Your hawk works the same way with one difference: it hunts in the picture plane. The pointer has no depth, so the hawk pushes every bird whose projected position falls within its circle, a column of fear right through the sheet. Pressing makes the circle larger, the way a stooping bird of prey frightens more of the flock. The hawk’s influence fades in and out over a few frames rather than switching, so the flock never jerks.',
        },
        {
          type: 'code',
          code: `// the viewer's hawk: a column of fear through the flock (it hunts in the picture plane)
if (hawk.a > 0.02) {
  const ddx = x - hawk.wx
  const ddy = y - hawk.wy
  const d2 = ddx * ddx + ddy * ddy
  if (d2 < RH2) {
    const d = Math.sqrt(d2) + 1e-3
    const k = (1 - d / RH) * 2300 * hawk.a
    fx += (ddx / d) * k
    fy += (ddy / d) * k
    if (refr[i] <= 0 && d < RH * 0.75) {
      wave[i] = 1
      refr[i] = REFR
      ex[i] = ddx / d
      ey[i] = ddy / d
      ez[i] = 0
      fuse[i] = -1
    }
  }
}`,
        },
        {
          type: 'h',
          text: 'Drawing the birds',
        },
        {
          type: 'p',
          text: 'Positions are projected with a mild perspective, $f = D / (D - z)$ with $D = 1900$, so nearer birds are slightly larger and spread wider. Each bird is a hairline chevron: two strokes swept back from the head, opened and closed by a sine wingbeat between 11 and 17 beats a second (faster when alarmed). When a bird flies toward or away from you its projected heading is short, so the chevron flattens into a dash — a cheap but convincing way to show birds seen head-on.',
        },
        {
          type: 'p',
          text: 'Canvas strokes are expensive one at a time and cheap in bulk, so the birds are sorted into four bins — far, middle, near and alarmed — and each bin is one path with one `stroke()` call: four draw calls for the whole flock. Within a single path overlapping strokes do not darken each other, but the four bins do, which gives density its weight where the sheet folds.',
        },
        {
          type: 'p',
          text: 'Everything is deterministic. The flock is seeded from a fixed pseudorandom sequence, flown for four seconds before the first frame so that it is already formed, and every later step depends only on the previous one and `dt`. The falcon’s schedule is part of the state, so the same moment always looks the same — until you start hunting.',
        },
        {
          type: 'h',
          text: 'The landscape',
        },
        {
          type: 'p',
          text: 'The rest of the drawing is quiet on purpose. The sky is paper with a faint wash of sky blue at the top and sage near the horizon. A setting sun is a hairline circle with horizontal striations, clipped by the horizon and broken up again as a reflection on the water. The distant tree line is a fractal silhouette drawn as vertical hatching. In the foreground a reed bed of quadratic stems, feathery plumes and arching leaves bends in a gusting wind made from simplex noise — one path for the whole bed.',
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
            ['BIRDS', 'The number of simulated birds: 2,500 in the viewer, 560 in a preview card.'],
            ['TIME', 'Minutes, seconds and hundredths since the piece started.'],
            ['ORDER φ', 'Polarization (5): 1 when the whole flock flies one way, low when it mills or splits.'],
            ['NEIGHBOURS', 'The mean number of neighbours each bird is steering by, at most 20.'],
            ['ALARMED', 'Birds whose excitation is above 0.25 — the size of the current wave.'],
            ['Heading rose', 'Top right: a 24-sector histogram of headings in the picture plane. The blue needle points along the mean heading; its length is φ.'],
            ['Altitude ruler', 'Left edge: ticks every 10 metres above the horizon, labelled every 20.'],
            ['Scale bar', 'Bottom left: 20 metres at the distance of the flock.'],
            ['Chevron weight', 'Lighter birds are farther away; the heaviest strokes are birds in the alarm wave.'],
            ['Falcon callout', 'Ocean blue: the falcon’s dotted track and its current speed in the stoop.'],
            ['Dashed circle', 'Your hawk’s reach. It grows while you press.'],
          ],
          caption: 'On short screens the ruler, scale bar and some readouts are dropped so that the flock keeps its sky.',
        },
        {
          type: 'p',
          text: 'The units are notional. One world unit is taken as 10 centimetres, which makes the birds cruise at 10 to 18 metres a second (starlings fly at about 20), the flock a few dozen metres across, and the falcon’s stoop peak at roughly 350 kilometres an hour. The scale was chosen so those numbers come out plausible, not measured from any real flock.',
        },
        {
          type: 'h',
          text: 'The rhythm',
        },
        {
          type: 'p',
          text: 'There is no loop. The flock flies continuously and never repeats; the envelope’s motions are sums of slow sines at unrelated frequencies, so the sky keeps changing shape. The falcon stoops on a ten-and-a-half-second schedule (first at 3.2 s in a preview, 6.2 s in the viewer), alternating the side it comes from. In the viewer a ghost hawk flies through the flock in the first seconds to show what the pointer does; it stops the moment you move.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'Where the model is a drawing',
      blocks: [
        {
          type: 'list',
          items: [
            '**Numbers.** Real murmurations can hold hundreds of thousands of birds. Two and a half thousand is what one frame budget allows, and the density is drawn darker than reality to compensate.',
            '**The envelope.** No invisible ellipsoid holds a real flock. Starlings stay over a roost because they are attracted to it and to each other; the envelope is a compact way to get the same staying power and to make the sheet roll so its folds read.',
            '**No banking.** Real starlings bank to turn, and the tilt of their wings is part of why a turning flock darkens. Here birds steer instantly within the speed limits, and wing flicker is a simple sine.',
            '**A scripted falcon.** The peregrine follows a planned curve rather than choosing and chasing a target, and it never catches anything.',
            '**The wave rule.** The fuse-and-refractory alarm reproduces the speed and one-way travel of real agitation waves, but the escape manoeuvre it triggers is a simple sideways push, not the measured turning behaviour of starlings.',
            '**The breeze.** A cheap trigonometric flow field folds the sheet a little more than the boid rules alone would.',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['Space', 'Enter', 'F'], action: 'Send the falcon down through the flock' },
    ],
    gestures: [
      { gesture: 'move', action: 'Your pointer is a hawk: the flock gives way and the alarm spreads from it' },
      { gesture: 'hold', action: 'Press to widen the hawk’s reach' },
      { gesture: 'tap', action: 'Tap the sky to send the falcon through that spot' },
    ],
    tip: 'Hold the hawk still at the edge of the flock and watch the alarm travel across it; then tap in the densest fold.',
  },
  further: [
    { title: 'Flocks, herds and schools: a distributed behavioral model', by: 'Craig W. Reynolds', year: '1987', note: 'SIGGRAPH ’87, *Computer Graphics* 21(4). The boids paper.' },
    { title: 'Novel type of phase transition in a system of self-driven particles', by: 'Tamás Vicsek, András Czirók, Eshel Ben-Jacob, Inon Cohen, Ofer Shochet', year: '1995', note: '*Physical Review Letters* 75. The order parameter.' },
    { title: 'Interaction ruling animal collective behavior depends on topological rather than metric distance', by: 'M. Ballerini, N. Cabibbo, R. Candelier, A. Cavagna et al.', year: '2008', note: '*PNAS* 105(4). The six or seven nearest neighbours.' },
    { title: 'Scale-free correlations in starling flocks', by: 'Andrea Cavagna, Alessio Cimarelli, Irene Giardina et al.', year: '2010', note: '*PNAS* 107(26).' },
    { title: 'Information transfer and behavioural inertia in starling flocks', by: 'Alessandro Attanasi, Andrea Cavagna, Lorenzo Del Castello et al.', year: '2014', note: '*Nature Physics* 10.' },
    { title: 'Propagating waves in starling, Sturnus vulgaris, flocks under predation', by: 'Andrea Procaccini, Alberto Orlandi, Andrea Cavagna et al.', year: '2011', note: '*Animal Behaviour* 82(4).' },
    { title: 'Self-organized aerial displays of thousands of starlings: a model', by: 'Hanno Hildenbrandt, Claudio Carere, Charlotte K. Hemelrijk', year: '2010', note: '*Behavioral Ecology* 21(6). StarDisplay.' },
    { title: 'Collective memory and spatial sorting in animal groups', by: 'Iain D. Couzin, Jens Krause, Richard James, Graeme D. Ruxton, Nigel R. Franks', year: '2002', note: '*Journal of Theoretical Biology* 218.' },
    { title: 'Optimized spatial hashing for collision detection of deformable objects', by: 'Matthias Teschner, Bruno Heidelberger, Matthias Müller, Danat Pomeranets, Markus Gross', year: '2003', note: 'Vision, Modeling and Visualization 2003. The three primes.' },
  ],
}

export default guide
