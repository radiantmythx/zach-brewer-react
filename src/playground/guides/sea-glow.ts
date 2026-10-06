import type { Guide } from '../guide'

const chainFigure = `<svg viewBox="0 0 420 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="62" cy="70" r="44" opacity="0.8"/>
  <circle cx="62" cy="70" r="30" stroke-dasharray="2 3" opacity="0.5"/>
  <circle cx="50" cy="58" r="3" fill="#1F8A86" stroke="none"/>
  <circle cx="72" cy="80" r="3" fill="#1F8A86" stroke="none"/>
  <circle cx="58" cy="86" r="3" fill="#1F8A86" stroke="none"/>
  <text x="18" y="134" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.7">CELL · SCINTILLONS</text>
  <line x1="120" y1="70" x2="150" y2="70"/>
  <path d="M146 66 L150 70 L146 74"/>
  <text x="156" y="52" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.8">SHEAR</text>
  <text x="156" y="66" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.8">→ ACTION POTENTIAL</text>
  <text x="156" y="80" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.8">→ H⁺ INTO SCINTILLONS</text>
  <text x="156" y="94" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.8">→ pH 8 TO 6 · LUCIFERASE ON</text>
  <line x1="330" y1="70" x2="356" y2="70"/>
  <path d="M352 66 L356 70 L352 74"/>
  <path d="M366 70 q6 -10 12 0 t12 0 t12 0" stroke="#2B6A93"/>
  <text x="360" y="96" font-family="Geist Mono, monospace" font-size="8" fill="#2B6A93" stroke="none">475 NM</text>
  <text x="360" y="108" font-family="Geist Mono, monospace" font-size="8" fill="#2B6A93" stroke="none">≈ 0.1 S</text>
</svg>`

const flashFigure = `<svg viewBox="0 0 420 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="30" y1="120" x2="400" y2="120" opacity="0.5"/>
  <line x1="30" y1="20" x2="30" y2="120" opacity="0.5"/>
  <path d="M30 120 L60 120 L61 30 C70 70 80 100 110 116 L120 120 L150 120 L151 40 C160 76 170 102 196 116 L206 120 L232 120 L233 52 C242 84 252 104 276 117 L286 120 L314 120 L315 62 C324 90 334 106 356 117 L366 120 L400 120" stroke="#2B6A93" stroke-width="1.3"/>
  <path d="M60 128 L60 134 M150 128 L150 134 M232 128 L232 134 M314 128 L314 134" opacity="0.6"/>
  <text x="34" y="146" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.6">STIMULI</text>
  <path d="M61 22 L61 14 L110 14" stroke-dasharray="2 2" opacity="0.6"/>
  <text x="66" y="11" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.7">τ ≈ 0.11 S</text>
  <text x="250" y="40" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.7">EACH FLASH DIMMER: FATIGUE</text>
  <text x="2" y="26" font-family="Geist Mono, monospace" font-size="8" fill="currentColor" stroke="none" opacity="0.6">LIGHT</text>
</svg>`

const guide: Guide = {
  lede: 'A moonless shore where the breaking waves light up blue. The light is made by single-celled plankton that flash when the water around them is disturbed: the sea answers every wave, and every hand.',
  facts: [
    ['Phenomenon', 'Bioluminescence of dinoflagellates'],
    ['Organisms', '*Noctiluca scintillans*, *Lingulodinium polyedra* and kin'],
    ['Chemistry', 'Luciferin, luciferase and oxygen, switched on by acid'],
    ['Emission', 'Peak near 475 nm, modeled as a 50 nm wide band'],
    ['Flash', 'About 0.1 s; decay constant 0.11 s in the piece'],
    ['Water', 'Absorbs 600 nm light about 17 times as strongly as 475 nm'],
    ['Cells', 'Up to 28,000 patches in the viewer, 3,200 on the card'],
    ['Surf', 'Ten waves every 6.4 s, a set of three near 1.5 m'],
    ['Running time', '64 s, looping; the cells keep their state'],
  ],
  interact: {
    gestures: [
      { gesture: 'drag', action: 'Drag through the water or the wet sand to stir it into light' },
      { gesture: 'move', action: 'With a mouse, just passing over the water brushes it' },
      { gesture: 'tap', action: 'Tap the water to splash: a ring spreads, and drops spark where they fall' },
    ],
    tip: 'Drag slowly, then fast. The cells answer the speed of the water, not where your finger is, and a cell that has just flashed needs a moment before it can flash again.',
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Marine biology',
      title: 'The phenomenon',
      blocks: [
        {
          type: 'p',
          text: 'On some nights the sea glows. A wave rises out of the dark, and as it breaks the whole crest lights up an electric blue; the white water runs up the beach as a sheet of blue sparks; footprints in the wet sand flare as you walk; a swimmer moves through a cloud of light. Sailors have described it for as long as there have been sailors, and it is still one of the most astonishing sights the natural world offers.',
        },
        {
          type: 'p',
          text: 'The light is alive. It comes from dinoflagellates, single-celled plankton a few hundredths of a millimeter to a couple of millimeters across, that produce a short flash of light whenever the water around them is sheared. Two species dominate the famous displays. *Noctiluca scintillans*, the "sea sparkle", is a large, almost transparent balloon of a cell, up to two millimeters wide, that feeds on other plankton and gathers in vast pink or green blooms. *Lingulodinium polyedra*, about a twentieth of a millimeter, is the cause of the red tides of Southern California whose waves glow at night. Others, such as *Pyrodinium bahamense*, keep a few warm, sheltered bays glowing almost all year.',
        },
        {
          type: 'p',
          text: 'Each cell holds hundreds of tiny light-making compartments, and each flash lasts about a tenth of a second. A single cell is just visible to a dark-adapted eye as a pinprick. What makes a wave glow is numbers: a liter of bloom water can hold tens of thousands of cells or more, and a breaking wave shears every one of them at once.',
        },
        { type: 'h', text: 'Where to see it' },
        {
          type: 'p',
          text: 'The most dependable displays are in shallow, enclosed bays fringed with mangroves, where the water is warm, rich in nutrients from the trees, and flushed only slowly by the tide, so the cells accumulate. Mosquito Bay on Vieques, Puerto Rico, often described as the brightest in the world, Laguna Grande near Fajardo and La Parguera on the same island, and the Luminous Lagoon near Falmouth, Jamaica, are the best known. Open coasts glow more fitfully, when a bloom drifts in: the beaches of San Diego and Orange County during *Lingulodinium* red tides, the Maldives and Tasmania have all made headlines. A night with no moon, no nearby lights, and a few hours after dark, when the cells are most responsive, is best.',
        },
        { type: 'h', text: 'A short history' },
        {
          type: 'p',
          text: 'Aristotle and Pliny both wrote of the shining sea. Explanations varied for two thousand years: phosphorus, electricity, friction, the rotting of fish. Charles Darwin, sailing south of the River Plate on the *Beagle*, described one very dark night when the sea seemed to burn, every wave lit and the bow throwing up luminous foam. By the nineteenth century naturalists had traced much of the light to *Noctiluca* and its relatives.',
        },
        {
          type: 'p',
          text: 'The chemistry came next. In the 1880s the French physiologist Raphaël Dubois showed that the light of a luminous beetle and a glowing clam comes from a reaction between two substances, which he named *luciferin* and *luciferase*; E. Newton Harvey, at Princeton, spent decades showing that both differ from one kind of organism to the next. In the 1950s J. Woodland Hastings and Beatrice Sweeney showed that the glow of *Lingulodinium* (then called *Gonyaulax*) follows a circadian rhythm, strong at night and weak by day even in constant conditions; it became a model system for biological clocks. Hastings and his colleagues later isolated the cell’s light-making particles, the *scintillons*, and showed that a drop in pH switches them on.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'Biochemistry and optics',
      title: 'The science',
      blocks: [
        { type: 'h', text: 'Luciferin and luciferase' },
        {
          type: 'p',
          text: 'Dinoflagellate luciferin is an open-chain tetrapyrrole, chemically related to chlorophyll, from which it is probably derived. Luciferase oxidizes it with molecular oxygen, leaving the product in an electronically excited state that relaxes by emitting a photon:',
        },
        { type: 'math', tex: '\\text{luciferin} + O_2 \\longrightarrow \\text{oxyluciferin}^{*} \\to \\text{oxyluciferin} + h\\nu', caption: 'The first step is catalyzed by luciferase; the star marks the excited state. $h\\nu$ is a photon of energy $hc/\\lambda$, about 2.6 eV at 475 nm.' },
        {
          type: 'p',
          text: 'In the resting cell nothing happens, because at the cell’s normal pH of about 8 the luciferin is held by a binding protein and the luciferase is inactive. Both are packed into scintillons, small pockets of cytoplasm pressed against the membrane of the cell’s large central vacuole, which is acidic. When the cell is deformed it sets off, by a pathway still being worked out, an action potential that sweeps across the vacuole membrane and opens voltage-gated proton channels; protons flood from the vacuole into the scintillons, the pH there drops toward 6, the binding protein lets go, the luciferase switches on, and every scintillon flashes at once. Then the protons are pumped away and the cell can flash again.',
        },
        { type: 'figure', svg: chainFigure, alt: 'A cell with scintillons, and the chain from shear to action potential to proton influx to light at 475 nanometers.', caption: 'From a push to a photon: mechanical stimulus, a membrane spike, acid, light.' },
        { type: 'h', text: 'What sets them off' },
        {
          type: 'p',
          text: 'The trigger is not touch as such but *shear*, neighboring layers of water moving at different speeds and deforming the cell. Laboratory flow chambers show a threshold: below a certain shear stress (a small fraction of a pascal for *Lingulodinium*) nothing happens; above it, flashes come with a delay of a few tens of milliseconds, brighter for stronger stimuli. Breaking waves, the wake of a boat or a dolphin, a swimming fish, a footstep in wet sand and the drag of a hand all exceed it easily. Under steady stimulation a cell flashes repeatedly, a few times a second, with each flash dimmer than the last: its supply of luciferin is finite and takes time to restore.',
        },
        { type: 'figure', svg: flashFigure, alt: 'A graph of light against time showing four flashes, each rising instantly and decaying in about a tenth of a second, each dimmer than the last.', caption: 'One cell under repeated stimulation: instant rise, fast decay, and fatigue.' },
        { type: 'h', text: 'Why flash at all?' },
        {
          type: 'p',
          text: 'Making light costs energy, so it presumably pays. The leading explanation is the *burglar alarm hypothesis*, proposed by Martin Burkenroad in 1943. A dinoflagellate’s main predators are small crustaceans such as copepods, which hunt by touch in the dark. When a copepod grabs a cell, the flash lights up the copepod itself, making it visible to the fish that eat copepods. The light is not a warning to the grazer so much as a call for its predator. Experiments support it: in the laboratory, fish catch more zooplankton in luminescent water than in dark water, and grazers feeding on luminous dinoflagellates take fewer cells and swim more erratically. A simpler effect may also help: a sudden flash can startle a grazer into letting go. Neither explanation covers every species, and for the glow of a whole breaking wave, which has nothing to do with any one predator, the light is a side effect: every cell is answering its own alarm at once.',
        },
        {
          type: 'aside',
          title: 'A sense of scale',
          text: 'A single flash of *Lingulodinium* releases on the order of a hundred million photons. That sounds like a lot, but a candle seen from a meter away delivers that many to the eye in about a millisecond. Sea glow is visible only because there are so many cells, and only to eyes that have been in the dark for a while.',
        },
        { type: 'h', text: 'Why blue' },
        {
          type: 'p',
          text: 'Water is a strongly colored substance. Pure water absorbs red light about a hundred times more strongly than blue: measured absorption coefficients are about $0.013$ m⁻¹ at 475 nm and $0.22$ m⁻¹ at 600 nm. Light falls off as',
        },
        { type: 'math', tex: 'I(d) = I_0\\, e^{-a(\\lambda)\\, d}', caption: '$a(\\lambda)$ is the absorption coefficient and $d$ the path length. The distance over which light falls to $1/e$ is $1/a$: about 75 m at 475 nm, under 5 m at 600 nm.' },
        {
          type: 'p',
          text: 'So in the sea, blue light travels farthest, and most marine bioluminescence, from plankton to deep-sea fish, is emitted between about 440 and 500 nm. In coastal water full of plankton and dissolved organic matter the clearest window shifts toward blue-green, and many coastal organisms emit greener light. Dinoflagellates sit in between, peaking near 474–476 nm. Many marine animals have their visual sensitivity tuned to the same window; a signal that both carries and is seen is the one that survives.',
        },
        { type: 'h', text: 'The surf' },
        {
          type: 'p',
          text: 'Waves feel the bottom when the water is shallower than about half a wavelength. They slow down (in shallow water the speed is $c = \\sqrt{g d}$, where $g$ is the acceleration of gravity and $d$ the depth), crowd together, and grow taller, until the crest outruns the trough and the wave breaks. A useful rule, going back to McCowan in 1894, is that a wave breaks when its height $H$ reaches about 0.78 of the depth:',
        },
        { type: 'math', tex: '\\gamma = \\frac{H}{d} \\approx 0.78 \\quad\\Rightarrow\\quad d_b \\approx 1.28\\, H' },
        {
          type: 'p',
          text: 'On a gently sloping beach the break peels along the crest as different parts of the wave reach their breaking depth. The broken wave becomes a *bore*, a turbulent step of white water that runs to the shore and then up the beach as *swash*, slowing until gravity stops it, and sliding back as *backwash*. At the top of the run-up it leaves a line of foam. Every one of these is a sheet of strong shear, and every one glows.',
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'Implementation',
      title: 'How the piece works',
      blocks: [
        {
          type: 'p',
          text: 'Sea Glow is one TypeScript module drawing to a canvas: a pinhole camera 3 m above the sand looking out to sea, a schedule of waves, and a field of cells, each with its own state. Unlike most of the Playground’s films, it is a simulation, not a pure function of time; the waves are scheduled, but the cells remember what has happened to them.',
        },
        { type: 'h', text: 'The camera' },
        {
          type: 'p',
          text: 'The shoreline is 14 m away and the top of the wet sand 8.6 m. A point $x$ meters along the beach, $z$ meters out, and $\\eta$ meters above still water lands on the screen at',
        },
        { type: 'math', tex: 'X = c_x + \\frac{F x}{z}, \\qquad Y = y_H + \\frac{F (h_c - \\eta)}{z}', caption: '$y_H$ is the horizon, $h_c = 3$ m the camera height, and $F$ is chosen so that the shoreline lands at about 70 percent of the frame’s height.' },
        {
          type: 'p',
          text: 'The $\\eta$ term is what makes the waves stand up: a 1.5 m crest 30 m away rises tens of pixels above the water behind it, so the crests read as walls of water rather than lines on a map, and the cells riding them rise and fall.',
        },
        { type: 'h', text: 'The waves' },
        {
          type: 'p',
          text: 'Ten waves arrive every loop, 6.4 s apart, in a pattern of small, rising, large and calm: 0.35, 0.45, 0.55, 0.85, 1.35, 1.6, 1.35, 0.8, 0.5 and 0.4 m, each varied by a few percent. Each wave breaks where the water is $H/0.78$ deep on a beach sloping one in nine. Before that, its crest approaches as $z(\\Delta) = z_b + 4.4\\Delta + 0.12\\Delta^2$, where $\\Delta$ is the time left before breaking: faster far out, slowing as it shoals, so crests pile up toward the horizon as fine hairlines. The break starts at a random point along the crest and peels outward at 6 m/s; the bore then runs in at about 3.2 m/s, and the swash rises and falls on the sand in a parabola, as a ballistic sheet of water would. All of this is computed each frame in 128 strips along the beach.',
        },
        { type: 'h', text: 'The cells' },
        {
          type: 'p',
          text: 'Each particle stands for a patch of cells. It has a fixed place on the screen (an even scatter over the water and the wet sand), a threshold, a refractory clock, a store of light, and its current brightness. Every frame the surf and the pointer add up a *stimulus* $s$ at each particle. Then:',
        },
        {
          type: 'code',
          code: `// excitation: threshold, refractory time, a store of light that tires
refr[i] -= dt
em[i] *= decay
if (s > thr[i] && refr[i] <= 0 && rand() < clamp((s - thr[i]) * 4) * Math.min(1, dt * 40)) {
  const f = charge[i] * clamp(0.45 + s * 0.5, 0, 1.4)
  em[i] = Math.min(1.6, em[i] + f)
  charge[i] -= charge[i] * 0.12
  refr[i] = 0.09 + rand() * 0.1
  newLight += f
}
if (charge[i] < 1) charge[i] = Math.min(1, charge[i] + recover)`,
          caption: '`decay` is $e^{-\\Delta t / 0.11\\,\\text{s}}$ and `recover` is $\\Delta t / 6\\,\\text{s}$. Thresholds are spread between 0.1 and 0.95, skewed low, so a weak stimulus lights a few cells and a strong one lights them all.',
        },
        {
          type: 'p',
          text: 'Above threshold a cell does not flash at once but with a probability that grows with how far above threshold it is, so a stimulus produces a twinkle rather than a single synchronized pulse. Each flash spends 12 percent of the cell’s store, and the store recovers over a few seconds, so a long, hard stir grows dimmer under your hand, as real water does.',
        },
        { type: 'h', text: 'The stimulus' },
        {
          type: 'p',
          text: 'Each broken wave contributes a narrow band of strong stimulus at its front, widened while the lip is still plunging, then a churning band of white water behind it, and then streaks of fading foam, whose pattern comes from a fixed noise field so the streaks look like foam rather than static. On the beach the swash adds its leading edge and a thin, sparkling sheet; the foam line glows for three seconds after the water turns back. Just before a wave breaks, its steepening face adds a faint sparkle: the first sparks.',
        },
        {
          type: 'code',
          code: `// the hand
const X = px[i] + ox[i]
const Y = py[i] + oy[i]
if (sOn && X > bx0 && X < bx1 && Y > by0 && Y < by1) {
  let u = sl2 > 0 ? ((X - sx0) * sdx + (Y - sy0) * sdy) / sl2 : 0
  u = clamp(u)
  const qx = sx0 + sdx * u - X
  const qy = sy0 + sdy * u - Y
  const d2 = qx * qx + qy * qy
  if (d2 < radius * radius) {
    const f = 1 - Math.sqrt(d2) / radius
    s += strength * f * (0.55 + 0.45 * rand())
    if (push > 0) {
      // drag the water along, curling a little either side of the path
      const side = qx * sdy - qy * sdx > 0 ? 1 : -1
      vx[i] += (pvx * 0.5 - side * pvy * 0.14) * f * push * dt * 9
      vy[i] += (pvy * 0.5 + side * pvx * 0.14) * f * push * dt * 9
    }
  }
}`,
          caption: 'Your drag is a line segment per frame. Cells near it are stimulated in proportion to how close they are and how fast you move, and pushed along with a little curl either side, then released: the water carries the light with your hand and lets it settle.',
        },
        {
          type: 'p',
          text: 'A tap makes a splash: a ring that spreads across the water at 1.5 m/s, lighting the cells it crosses, and eighteen drops that fall back at random around it, each lighting the patch where it lands.',
        },
        { type: 'h', text: 'The color, and the light' },
        {
          type: 'p',
          text: 'The glow is not a chosen blue. The piece integrates its emission band, a Gaussian centered on 475 nm and 50 nm wide at half height, against the CIE 1931 color-matching functions and converts the result to sRGB. The color of a band that narrow lies outside what a screen can show, so it is brought into gamut by adding just enough white, and comes out a vivid azure.',
        },
        {
          type: 'code',
          code: `const GLOW: Rgb = (() => {
  let X = 0
  let Y = 0
  let Z = 0
  for (let nm = 380; nm <= 700; nm += 2) {
    const p = emission(nm)
    const c = cmf(nm)
    X += p * c[0]
    Y += p * c[1]
    Z += p * c[2]
  }
  return toSrgb(fitGamut(xyzToLinear([X, Y, Z]), true))
})()`,
          caption: 'The color of the light itself.',
        },
        {
          type: 'p',
          text: 'Light adds, so the sparks are drawn with the canvas’s additive mode: where many overlap they brighten toward white. Each lit cell is a small square, batched into seven paths by brightness. Underneath, a second copy is drawn into a buffer at a half to a quarter of the screen’s resolution that fades with a 0.09 s time constant and is scaled up softly, standing in for the glare a dark-adapted eye sees around a bright crowd of points; on small screens it is weaker and finer, so the light stays a texture of points rather than a glowing tube. The fronts of the bores, the swash edge and the foam lines are drawn as hairlines of the same light, with a dim reflection below each elevated front.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Legend',
      title: 'Reading the drawing',
      blocks: [
        {
          type: 'list',
          items: [
            '**Top right:** the emission peak; the number of cells lit this frame; the flash time; and the height and period of the wave now breaking. Below them, the set: one tick per wave in the loop, as tall as the wave, with the current one lit.',
            '**The spectrum inset:** the emission band drawn as spectral hairlines, and the absorption of pure water as a dashed curve on a logarithmic scale, rising steeply into the red. The note under it gives the distance over which each color falls to $1/e$.',
            '**The ruler on the left edge** is a perspective scale from the wet sand out to 400 m: 10, 20, 50 and 100 m are labeled, and the ticks crowd toward the horizon. The longer tick marks the shoreline.',
            '**The loupe** (while "Each spark is a single cell" is showing) looks at one flashing cell, a *Noctiluca* about half a millimeter across, with its vacuole, the strands of cytoplasm, the tentacle, and its scintillons flashing.',
            '**Hairlines:** far out, the swell is a broken texture of crests; nearer, each wave stands up, its face drawn in contours as it steepens. Lit fronts and foam lines are hairlines of the emission color.',
          ],
        },
        {
          type: 'table',
          head: ['Time', 'Waves', 'Beat'],
          rows: [
            ['0–10 s', '0.35, 0.45 m', 'Darkness and swell; the first small breakers barely glow. "Touch the water and it answers."'],
            ['13–22 s', '0.55, 0.85 m', 'First sparks along the break; a loupe on one cell. "Each spark is a single cell."'],
            ['26–42 s', '1.35, 1.6, 1.35 m', 'The set: whole crests light, bores and swash sparkle, foam streaks linger. "Light, made by life."'],
            ['44–64 s', '0.8, 0.5, 0.4 m', 'The calm; a meteor at 51 s; the sea dims. "Blue travels farthest through the sea."'],
          ],
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Honesty',
      title: 'Liberties taken',
      blocks: [
        {
          type: 'list',
          items: [
            '**The waves are kinematic, not fluid dynamics.** Crests, bores and swash follow prescribed paths; the stimulus is a function of distance from them, not a computed shear field.',
            '**Particles are patches, not cells.** Each particle stands for many cells, and the patches stay where they are unless you push them; real cells ride the orbital motion of the waves and drift with the current.',
            '**Brighter than life.** Real sea glow is dim, and fully appreciated only after many minutes in darkness. The piece shows it as a dark-adapted eye remembers it, not as a light meter measures it.',
            '**The halo is a convention.** The soft glow under the points stands in for the eye’s own glare; it is not light in the water.',
            '**One emission band for all.** Different species, and even different strains, peak at slightly different wavelengths; 475 nm is typical of dinoflagellates.',
            '**Pure water for the absorption curve.** Seawater with plankton absorbs blue more than pure water does; the coastal window is greener.',
            '**The cell in the loupe is a sketch,** and *Noctiluca* and *Lingulodinium* are lumped together; their flashes differ in brightness and shape.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Bioluminescence in the Sea', by: 'Steven H. D. Haddock, Mark A. Moline & James F. Case', year: '2010', note: '*Annual Review of Marine Science* 2. A comprehensive review, from chemistry to ecology.' },
    { title: 'Bioluminescence in the Ocean: Origins of Biological, Chemical, and Ecological Diversity', by: 'Edith A. Widder', year: '2010', note: '*Science* 328.' },
    { title: 'A possible function of bioluminescence', by: 'Martin D. Burkenroad', year: '1943', note: '*Journal of Marine Research* 5. The burglar alarm hypothesis.' },
    { title: 'Bioluminescence in dinoflagellates: a test of the burglar alarm hypothesis', by: 'Mark V. Abrahams & Lyle D. Townsend', year: '1993', note: '*Ecology* 74.' },
    { title: 'Bioluminescence: mechanism and mode of control of scintillon activity', by: 'Marta Fogel & J. Woodland Hastings', year: '1972', note: '*Proceedings of the National Academy of Sciences* 69. The pH switch.' },
    { title: 'Voltage-gated proton channel in a dinoflagellate', by: 'Susan M. E. Smith et al.', year: '2011', note: '*Proceedings of the National Academy of Sciences* 108. The channel that lets the acid in.' },
    { title: 'Absorption spectrum (380–700 nm) of pure water. II. Integrating cavity measurements', by: 'Robin M. Pope & Edward S. Fry', year: '1997', note: '*Applied Optics* 36. The water absorption values used in the inset.' },
    { title: 'Light and Water: Radiative Transfer in Natural Waters', by: 'Curtis D. Mobley', year: '1994', note: 'Academic Press. Why the sea is blue, and how light moves in it.' },
    { title: 'Bioluminescence: Chemical Principles and Methods', by: 'Osamu Shimomura', note: 'World Scientific. The chemistry of luciferins, by the chemist who isolated GFP.' },
  ],
}

export default guide
