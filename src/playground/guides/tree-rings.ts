import type { Guide } from '../guide'

const ringFigure = `<svg viewBox="0 0 440 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <rect x="20" y="40" width="400" height="44"/>
  <g opacity="0.16" fill="currentColor" stroke="none">
    <rect x="96" y="40" width="22" height="44"/><rect x="176" y="40" width="10" height="44"/><rect x="206" y="40" width="5" height="44"/><rect x="272" y="40" width="20" height="44"/><rect x="348" y="40" width="16" height="44"/>
  </g>
  <path d="M118 40 v44 M186 40 v44 M211 40 v44 M292 40 v44 M364 40 v44"/>
  <path d="M30 46 v32 M42 46 v32 M54 46 v32 M66 46 v32 M78 46 v32 M126 46 v32 M138 46 v32 M150 46 v32 M162 46 v32 M224 46 v32 M236 46 v32 M248 46 v32 M260 46 v32 M302 46 v32 M314 46 v32 M326 46 v32 M338 46 v32 M376 46 v32 M390 46 v32 M404 46 v32" opacity="0.18"/>
  <path d="M30 104 v-6 M188 104 v-14 M213 104 v-22 M120 104 v-2" stroke="#2B6A93"/>
  <line x1="20" y1="104" x2="420" y2="104" opacity="0.4"/>
  <text x="22" y="30" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">PITH SIDE →</text>
  <text x="96" y="30" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">LATEWOOD</text>
  <text x="128" y="96" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.7">EARLYWOOD</text>
  <text x="170" y="30" font-family="Geist Mono, monospace" font-size="9" fill="#6F952F" stroke="none">TWO DRY YEARS</text>
  <text x="20" y="124" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">SKELETON PLOT: A LINE FOR EACH NARROW RING, LONGER FOR NARROWER</text>
  <text x="20" y="140" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">ONE RING = ONE YEAR: PALE SPRING WOOD, DARK SUMMER WOOD, A SHARP BOUNDARY</text>
</svg>`

const datingFigure = `<svg viewBox="0 0 440 170" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="150" y1="60" x2="420" y2="60" opacity="0.4"/>
  <line x1="20" y1="92" x2="290" y2="92" opacity="0.4"/>
  <path d="M170 60 v-12 M196 60 v-26 M214 60 v-8 M240 60 v-30 M262 60 v-14 M300 60 v-22 M332 60 v-10 M360 60 v-28 M392 60 v-16" stroke="#2B6A93"/>
  <path d="M40 92 v10 M70 92 v22 M96 92 v14 M120 92 v8 M170 92 v12 M196 92 v24 M214 92 v8 M240 92 v28 M262 92 v12" stroke="#1F8A86"/>
  <path d="M170 48 V104 M196 34 V116 M240 30 V120 M262 46 V104" stroke="#3F7A55" stroke-dasharray="1 2" opacity="0.8"/>
  <text x="300" y="24" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">LIVING TREE, DATED</text>
  <text x="20" y="140" font-family="Geist Mono, monospace" font-size="9" fill="#1F8A86" stroke="none">OLD BEAM, SLID UNTIL THE PATTERNS MATCH</text>
  <text x="150" y="158" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">THE OVERLAP DATES THE BEAM</text>
  <path d="M20 160 h100" opacity="0.4"/>
  <path d="M110 156 l10 4 -10 4" opacity="0.4"/>
</svg>`

const guide: Guide = {
  lede: 'A tree lays down one ring of wood every growing season, wide in good years and narrow in hard ones. Read in cross-section the rings are a diary of the tree’s life; matched between trees, they become a calendar that reaches back centuries before any of them was alive.',
  facts: [
    ['Phenomenon', 'Annual growth rings in temperate trees'],
    ['Science', 'Dendrochronology: dating and climate from rings'],
    ['Founded by', 'A. E. Douglass, Flagstaff and Tucson, from about 1901'],
    ['Key method', 'Cross-dating by patterns of narrow rings'],
    ['Model', 'Growth curve × rainfall × the tree’s own memory'],
    ['Tree', 'A conifer of about 240 to 310 years, cored at breast height'],
    ['Events', 'A fire scar, a lightning strip, a frost ring, droughts'],
    ['Running time', '80 s; each loop grows the next tree'],
    ['Sound', 'Optional: a note each decade, pitched by its rainfall'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['N'], action: 'Grow a new tree with a different climate' },
    ],
    gestures: [
      { gesture: 'move', action: 'Hover over the section to read any ring through the loupe: its year, width and rainfall' },
      { gesture: 'drag', action: 'On a touch screen, drag a finger across the rings to read them' },
      { gesture: 'tap', action: 'Tap anywhere for a new tree with a different climate' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'Read the drought the second caption points to, then find the same years on the beam in chapter III: the narrow rings line up across both trees.',
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'One ring for every year',
      blocks: [
        {
          type: 'p',
          text: 'Wood is made by a thin living layer just under the bark, the *cambium*, which divides through the growing season and leaves new cells on its inner side. In a conifer those cells are mostly *tracheids*, long hollow tubes that carry water. In spring, when water is plentiful and the tree is growing fast, the cambium makes wide tracheids with thin walls: pale, open **earlywood**. As summer goes on the cells come out narrower and thicker-walled, until the last wood of the season, the **latewood**, is dense and dark. Then growth stops for the winter. Next spring the first large, pale cells sit directly against last year’s dark ones, and that sharp line is the ring boundary.',
        },
        {
          type: 'p',
          text: 'How much wood a year adds depends on everything that limits growth: water, warmth, light, competition, injury, the tree’s own age and size. Where one factor dominates, the rings record it faithfully. On dry sites in the American Southwest that factor is rain; a ponderosa pine on a rocky slope grows wide rings after wet winters and narrow ones in droughts, and every tree on the same slope feels the same years. Near the cold limit of a forest the controlling factor is summer temperature instead. Either way, the sequence of wide and narrow rings is not random. It is a signal shared across a whole region, written in each tree with a little individual noise.',
        },
        {
          type: 'figure',
          svg: ringFigure,
          alt: 'A strip of wood with pale earlywood and dark latewood bands; two very narrow rings marked as dry years, with skeleton-plot lines below them.',
          caption: 'A core, pith side on the left. Each year is a pale band and a dark one; dry years are narrow, and get a line in the skeleton plot.',
        },
        { type: 'h', text: 'A. E. Douglass' },
        {
          type: 'p',
          text: 'The science of reading them was founded by an astronomer. Andrew Ellicott Douglass went to Arizona in 1894 to help Percival Lowell build his observatory at Flagstaff, and around the turn of the century began looking at the stumps of pines felled for lumber. He was hoping to find a record of the Sun: if the eleven-year sunspot cycle changed the climate, perhaps it changed the trees. That question he never settled to everyone’s satisfaction. But in the course of it he discovered something more useful. The sequence of narrow rings matched from tree to tree, across the forest and eventually across hundreds of kilometres, so precisely that a single distinctive run of narrow years could identify the same decade in any of them. He called the matching **cross-dating**, and the field **dendrochronology**, tree-time-study.',
        },
        {
          type: 'p',
          text: 'Douglass also invented a simple way to see the pattern: the **skeleton plot**. Instead of measuring every ring, he went along a core with a hand lens and, on graph paper with one column per year, drew a vertical line wherever a ring was noticeably narrower than its neighbours, longer for narrower. The result is a sparse barcode of the hard years, easy to compare by eye, one plot sliding along another until the lines coincide. It is still taught.',
        },
        {
          type: 'p',
          text: 'Cross-dating lets a chronology extend beyond the life of any one tree. The rings near the bark of an old beam may overlap the rings near the pith of a living tree; match the overlap and the beam’s rings take on calendar dates, and so does any timber whose rings overlap the beam. Douglass spent the 1920s doing exactly that with timbers from the ruined pueblos of the Southwest, building a long *floating* chronology of prehistoric wood that matched internally but could not be tied to the calendar, and a modern chronology running back from his own day. In 1929 a charred beam excavated at Show Low, Arizona, catalogued as HH-39, bridged the gap between them. Overnight the great houses of Chaco Canyon and the cliff dwellings of Mesa Verde had calendar dates. In 1937 Douglass founded the Laboratory of Tree-Ring Research at the University of Arizona.',
        },
        { type: 'h', text: 'Why counting is not enough' },
        {
          type: 'p',
          text: 'Simply counting rings fails often enough to matter. In a severe drought a stressed tree may make no ring at all on part of its circumference, or none anywhere at the height sampled: a *missing* ring. A dry spell in midsummer followed by rain can produce a band of dense wood that looks like a boundary: a *false* ring. Cross-dating catches both, because a missing ring shifts every earlier year by one against the other trees, and a false ring shifts them the other way. That is why dendrochronologists date samples rather than count them, and why a tree-ring date, done properly, is exact to the year.',
        },
        { type: 'h', text: 'The long chronologies' },
        {
          type: 'p',
          text: 'In the 1950s Edmund Schulman, at Douglass’s laboratory, found that the Great Basin bristlecone pines (*Pinus longaeva*) high in the White Mountains of California were older than any trees then known. One he cored and named Methuselah had more than 4,700 rings when he sampled it, and it is still alive. A bristlecone on Wheeler Peak in Nevada, cut in 1964 and later known as Prometheus, had close to 4,900. Because bristlecone wood decays so slowly in the dry cold, dead trees and fallen remnants lie on the same slopes for thousands of years, and by cross-dating them Wesley Ferguson and his successors built a continuous bristlecone chronology of more than 8,000 years. In Europe, chronologies of oak and pine preserved in rivers and bogs reach back more than 12,000 years, to the end of the last ice age.',
        },
        {
          type: 'p',
          text: 'These sequences turned out to matter far beyond botany. Wood of exactly known age, measured for radiocarbon, showed in the 1960s that radiocarbon years are not calendar years, because the amount of carbon-14 in the air has varied; the tree-ring calibration curves built since then underpin almost every radiocarbon date in archaeology and geology.',
        },
        { type: 'h', text: 'Fire, frost and climate' },
        {
          type: 'p',
          text: 'Rings record injuries as well as weather. A surface fire that kills the cambium on one side of the trunk leaves a wound; the tree grows *woundwood* from the edges, rolling over the scar year by year until it closes, and the year of the fire can be read exactly from the ring the scar face sits on. A single old pine may carry a dozen such scars, nested in the same wound, the classic “cat face” at the base of the trunk. Collections of fire scars show that many ponderosa pine forests in the Southwest burned in low surface fires every few years to a couple of decades for centuries, until the late nineteenth century, when grazing and then fire suppression stopped them; that record has reshaped how those forests are managed.',
        },
        {
          type: 'p',
          text: 'A hard frost during the growing season can collapse the developing cells and leave a crumpled band within the earlywood, a **frost ring**. In 1984 Valmore LaMarche and Katherine Hirschboeck showed that frost rings in bristlecone pines cluster in the years after large volcanic eruptions, whose veils of sulfate cool the summers. And because ring widths track climate, networks of trees can be calibrated against the instrumental record of the last century and then run backward: reconstructions of rainfall, river flow and temperature for centuries before anyone measured them. Much of what we know about the great droughts of past centuries comes from rings.',
        },
      ],
    },
    {
      id: 'science',
      kicker: 'The science',
      title: 'From widths to dates',
      blocks: [
        {
          type: 'p',
          text: 'A ring-width series mixes several things. Young trees put on wide rings and old ones narrow rings, simply because the same volume of wood is spread around a larger circumference: the *age trend*. On top of that sit the climate signal, which is common to all trees of a site, and noise peculiar to each tree. Dendrochronologists first remove the age trend by fitting a smooth curve $G_t$ to each series (a negative exponential is the classic choice) and dividing:',
        },
        { type: 'math', tex: 'I_t = \\frac{w_t}{G_t}, \\qquad G_t = g_0\\,e^{-t/\\tau} + g_1', label: '(1)', caption: '$w_t$ is the width of the ring formed $t$ years after the pith, $I_t$ the dimensionless *ring-width index*, near 1 in an average year. $g_0$, $\\tau$ and $g_1$ are fitted per tree.' },
        {
          type: 'p',
          text: 'Two index series are compared with Pearson’s correlation coefficient over the years they share,',
        },
        { type: 'math', tex: 'r = \\frac{\\sum_t (a_t - \\bar{a})(b_t - \\bar{b})}{\\sqrt{\\sum_t (a_t - \\bar{a})^2 \\, \\sum_t (b_t - \\bar{b})^2}}', label: '(2)' },
        {
          type: 'p',
          text: 'Cross-dating a sample of unknown age means sliding it along the reference and computing $r$ at every trial offset $L$; the right placement stands out as a single sharp peak, while wrong placements scatter around zero. In practice the statistics are done by software (the program COFECHA, written by Richard Holmes in the early 1980s, became the standard check), but they confirm a match that a trained eye has already seen in the pattern of narrow rings. A dated series can then be averaged with others into a *master chronology*, which cancels the individual noise and leaves the shared signal.',
        },
        {
          type: 'p',
          text: 'Douglass’s skeleton plot is the same idea in graphical form. For each ring, compare it with its neighbours; if it is markedly narrower, draw a line whose height grows with how much narrower it is, on a scale of one to ten. The piece computes exactly that score:',
        },
        { type: 'math', tex: 's_t = \\frac{\\bar{I}_{\\text{local}} - I_t}{\\bar{I}_{\\text{local}}}, \\qquad \\text{line height} \\propto s_t \\text{ when } s_t > 0.24', label: '(3)', caption: '$\\bar{I}_{\\text{local}}$ is the mean index of the five rings on either side.' },
        {
          type: 'figure',
          svg: datingFigure,
          alt: 'Two skeleton plots, one above a line and one below, offset so that four of their lines coincide, joined by dotted verticals.',
          caption: 'Cross-dating: slide the undated plot until its narrow years fall under the dated tree’s. The overlap gives every ring of the beam a calendar year.',
        },
      ],
    },
    {
      id: 'piece',
      kicker: 'How the piece works',
      title: 'A procedural life',
      blocks: [
        {
          type: 'p',
          text: 'Tree rings is a single canvas module. When a loop begins it builds a whole life from one seed: about six centuries of climate, the living tree’s rings and its cross-section, an older beam, and the statistics that connect them. That takes a few milliseconds; after that, every frame is a function of the piece’s time, so the film can be scrubbed and each loop is the same until it moves on to the next seed.',
        },
        { type: 'h', text: 'Climate' },
        {
          type: 'p',
          text: 'Rainfall for each year from 1420 to 2025 is $100\\,e^{0.34 z}$ per cent of normal, where $z$ mixes red noise (each year remembering a third of the last) with a slow swing from fractal noise, then subtracts droughts of three to six years, a couple of dozen single sharp dry years, and adds a few wet spells. One severe drought is always placed in the middle of the living tree’s life, for the second caption. All of it is simulated; no real place or year is meant.',
        },
        { type: 'h', text: 'Growth' },
        {
          type: 'code',
          code: `const grow = (start, n, g0, tau, g1, noiseSd, fireYear = -1) => {
  const rings: Ring[] = []
  // the tree's own year-to-year memory (stored sugars, needle mass): red noise
  let e = 0
  for (let i = 0; i < n; i++) {
    const y = start + i
    const g = g0 * Math.exp(-i / tau) + g1          // the age trend (1)
    const p = rain[y - CL0] / 100
    const pPrev = rain[Math.max(0, y - 1 - CL0)] / 100
    e = 0.5 * e + noiseSd * gauss(r)
    let wv = g * Math.pow(p, 1.0) * Math.pow(pPrev, 0.3) * Math.exp(e)
    if (y === fireYear + 1) wv *= 0.7                // a poor year after the fire
    rings.push({ w: Math.max(0.12, wv), g, rwi: 0, sk: 0 })
  }
  for (const rg of rings) rg.rwi = rg.w / rg.g       // the index
  skeleton(rings)                                    // the scores (3)
  return rings
}`,
          caption: 'Each ring is the age trend times this year’s rain, a little of last year’s, and the tree’s own persistent noise. The resulting correlation with rainfall is usually around 0.8, close to the best real drought-sensitive sites.',
        },
        { type: 'h', text: 'The cross-section' },
        {
          type: 'p',
          text: 'The section is stored as a grid of radii: for every ring boundary and each of 160 directions around the stem, the distance from the pith in millimetres. Each year’s growth is the ring width times a smooth positive shape function (an eccentricity, because real stems are rarely centred, plus low harmonics that drift slowly from year to year), so the rings stay nested and never cross. Scars are a mask: in the years after the fire, growth is zero inside an angular wound that narrows as it heals, and the callus at its edges grows thicker.',
        },
        {
          type: 'code',
          code: `let f = 1 + e1 * c1 + a2 * Math.cos(2 * th) + b2 * Math.sin(2 * th)
      + a3 * Math.cos(3 * th) + b3 * Math.sin(3 * th)
f = Math.max(0.3, f)
let mask = 1
for (const sc of [fire, light]) {
  if (y <= sc.year || y > sc.year + sc.heal) continue
  const k = (y - sc.year) / sc.heal
  const hw = sc.half * Math.pow(1 - k, 0.85)       // the wound narrows as it heals
  const d = angDist(th, sc.ang)
  if (d < hw) mask = 0                              // dead cambium: no wood here
  // woundwood: the callus rolls thick at the edge of the closing wound
  else if (d < sc.half + 0.05) f *= 1 + 1.5 * Math.exp(-(((d - hw) / 0.07) ** 2))
}
grew[i * NA + j] = mask
R[(i + 1) * NA + j] = R[i * NA + j] + rings[i].w * f * mask`,
          caption: 'One ring at one angle. Rings that did not grow at an angle are not drawn there, so later rings end at the wound’s edge and curl over it.',
        },
        {
          type: 'p',
          text: 'Drawing is done every frame. Each ring boundary is a polyline around the stem, batched by darkness; where rings crowd closer than a pixel only every second or third is drawn, since the loupe shows them all. Latewood is a soft stroke along the outer third of each ring, bucketed by width. The disc grows on screen more slowly than the tree, as the square root of its true radius or thereabouts, so that the first rings are large enough to read and the last ones still fit. The loupe redraws the rings near the pointer at four to nine times, with real hatching in the latewood and faint radial cell rows, and finds the ring under the pointer by a binary search along that direction.',
        },
        { type: 'h', text: 'Dating the beam' },
        {
          type: 'p',
          text: 'The beam is a second tree from the same climate, about a century and a half older, with an overlap of roughly a century with the living one. At build time the piece slides it across every offset within sixty years either way and computes equation (2) on the two index series:',
        },
        {
          type: 'code',
          code: `for (let L = -LAG; L <= LAG; L++) {
  // trial: the beam's ring k is the year bStart + k + L
  let m = 0
  for (let k = 0; k < bN; k++) {
    const ia = bStart + k + L - y0
    if (ia < 0 || ia >= age) continue
    ta[m] = rings[ia].rwi
    tb[m] = beamRings[k].rwi
    m++
  }
  lagR[L + LAG] = m > 30 ? corr(ta, tb, m) : 0
}`,
          caption: 'The correlation at each trial date, drawn in chapter III as the bar chart beside the section. The animation sweeps through wrong dates before settling on the peak.',
        },
        {
          type: 'p',
          text: 'The search animation is choreographed, but the numbers it shows are computed: the readout under the trace is the real correlation at the offset currently on screen, and the peak at zero is the real peak. Typically it is around 0.6 to 0.75, with wrong offsets below 0.3.',
        },
        { type: 'h', text: 'The tree' },
        {
          type: 'p',
          text: 'The side view grows from the same rings. Its height follows a saturating curve with age; its trunk width is the section’s true diameter, exaggerated a little more than one and a half times so it reads. Branch slots are fixed per tree, each with its own length, tilt and number of needle tufts; the crown is a cone while the tree is young and lifts and rounds as it ages, leaving dead stubs on the cleared trunk. The fire burns at the foot in its year and leaves a dark cat face; the lightning year brings a single bolt and a scar spiralling down the bark. A dash-dot line with arrows marks section A–A at breast height, 1.3 metres up, where foresters measure and core.',
        },
        { type: 'h', text: 'Sound' },
        {
          type: 'p',
          text: 'With sound on, each decade of growth plays one soft note, pitched on a D-major pentatonic scale by that decade’s average rainfall, so wet and dry runs are audible as the rings go down. The fire crackles as filtered noise, the lightning is a sharp crack and a long low roll, the borer turns with a brief rasp, and the moment the beam is dated is marked by a chord.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Every mark on the plate',
      blocks: [
        {
          type: 'list',
          items: [
            '**The section:** the pith at the centre, rings out to the cambium, radially hatched bark outside. Every tenth ring is a little darker. The heavy line with ticks is a charred scar face; rings curl around it where woundwood closed the wound. The crinkled ring is frost damage.',
            '**Callouts:** the frost ring, fire scar, lightning strip and the drought, each labelled with its year as it forms and again at the end.',
            '**The loupe:** a magnified view under the pointer, with the ring you are reading outlined in blue and its year, ring number, width and rainfall below. The readouts at the top turn blue while you read.',
            '**The tree:** growing from a seedling, with a ten-metre scale bar and section A–A. In chapter II the increment borer goes in at A–A.',
            '**The climate chart (chapter I):** rainfall as bars, blue above normal and green below, with the ring-width index as a line over them. Green dashes along the top mark droughts; *r* is the correlation of the two so far.',
            '**The bench (chapters II–IV):** core A from the living tree, pith to bark, with narrow rings in blue; its skeleton plot, with pencil lines from each very narrow ring to its year; and core B, the beam, with its own plot below. Moss verticals join matching narrow years once it is dated, and the bracket gives the length of the combined chronology.',
            '**The notes (wide screens):** germination year, ring count, diameter, the climate correlation, the dating correlation, and a key to the markings.',
          ],
        },
        {
          type: 'p',
          text: 'The beats: one ring for every year as the seedling becomes a tree; the hard years arriving as a band of tight rings; the fire, and the slow rolling-over of the wound; the borer, the core and its barcode of narrow years; then the beam, sliding back and forth through wrong dates until it locks, and the record running on unbroken from before either tree was born.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is simulated, and what is simplified',
      blocks: [
        {
          type: 'list',
          items: [
            '**The climate is invented.** The years are real calendar years so the dates read naturally, but the rainfall, droughts, fire, frost and lightning are generated from a seed. They are not a record of any place.',
            '**A tidy growth model.** Real growth also responds to temperature, competition, defoliation and release when neighbours fall, and the response changes with age. The model has rain, last year’s rain, an age trend and red noise.',
            '**No missing or false rings.** Every year makes a complete ring all the way round (except in wounds), so counting would work here, and cross-dating is shown for what it adds: dating wood of unknown age.',
            '**One reference tree.** Real cross-dating compares a sample with a master chronology averaged from many trees, which is far more robust than one tree against one beam.',
            '**Scars and frost are drawn, not grown.** Woundwood is a geometric rule, the frost ring is a crinkled line inside one ring, and the lightning strip is a narrow wound that heals in a few years.',
            '**Exaggerations.** The trunk in the side view is wider than true; the disc is shown at a slowly changing scale during growth; crowded outer rings are thinned on screen.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Climatic Cycles and Tree-Growth', by: 'A. E. Douglass', year: '1919–1936', note: 'Carnegie Institution of Washington, three volumes. The founding work, including the method of cross-dating.' },
    { title: 'The Secret of the Southwest Solved by Talkative Tree Rings', by: 'A. E. Douglass', year: '1929', note: '*National Geographic Magazine*, December 1929. The dating of the pueblos, told by Douglass.' },
    { title: 'An Introduction to Tree-Ring Dating', by: 'Marvin A. Stokes & Terah L. Smiley', year: '1968', note: 'University of Chicago Press. The classic manual, with skeleton plotting.' },
    { title: 'Tree Rings and Climate', by: 'Harold C. Fritts', year: '1976', note: 'Academic Press. How ring widths respond to climate, and how climate is reconstructed from them.' },
    { title: 'Tree Rings: Basics and Applications of Dendrochronology', by: 'Fritz Hans Schweingruber', year: '1988', note: 'Reidel. Wood anatomy, frost rings, scars and the rest, richly illustrated.' },
    { title: 'Computer-assisted quality control in tree-ring dating and measurement', by: 'Richard L. Holmes', year: '1983', note: '*Tree-Ring Bulletin* 43. The COFECHA program.' },
    { title: 'Frost rings in trees as records of major volcanic eruptions', by: 'Valmore C. LaMarche Jr. & Katherine K. Hirschboeck', year: '1984', note: '*Nature* 307.' },
    { title: 'Tree Story: The History of the World Written in Rings', by: 'Valerie Trouet', year: '2020', note: 'Johns Hopkins University Press. A lively modern account of the field.' },
  ],
}

export default guide
