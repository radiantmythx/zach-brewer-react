import type { Guide } from '../guide'

const bisectorFigure = `<svg viewBox="0 0 420 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="120" cy="110" r="3" fill="currentColor" stroke="none"/>
  <circle cx="230" cy="80" r="3" fill="currentColor" stroke="none"/>
  <circle cx="200" cy="170" r="3" fill="currentColor" stroke="none"/>
  <line x1="120" y1="110" x2="230" y2="80" stroke="#3F7A55" stroke-dasharray="3 3"/>
  <line x1="152" y1="20" x2="186" y2="146" stroke-width="1.6"/>
  <line x1="186" y1="146" x2="300" y2="132" stroke-width="1.6"/>
  <line x1="186" y1="146" x2="110" y2="196" stroke-width="1.6"/>
  <path d="M169 89 l6 -1.6 l1.6 6" stroke="#3F7A55"/>
  <circle cx="186" cy="146" r="2.2" fill="#2B6A93" stroke="none"/>
  <circle cx="186" cy="146" r="72" stroke="#2B6A93" stroke-dasharray="2 3"/>
  <text x="88" y="104" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">A</text>
  <text x="238" y="76" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">B</text>
  <text x="208" y="186" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">C</text>
  <text x="60" y="34" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none" letter-spacing="1">WALL = BISECTOR OF AB</text>
  <text x="270" y="170" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" letter-spacing="1">EMPTY CIRCLE</text>
  <text x="270" y="182" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" opacity="0.7" letter-spacing="1">THROUGH A, B, C</text>
</svg>`

const lloydFigure = `<svg viewBox="0 0 420 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <path d="M20 30 L110 18 L150 70 L118 128 L36 120 Z"/>
  <circle cx="58" cy="52" r="3" fill="currentColor" stroke="none"/>
  <path d="M86 72 m-4 0 h8 m-4 -4 v8" stroke="#2B6A93"/>
  <line x1="58" y1="52" x2="82" y2="70" stroke="#2B6A93"/>
  <path d="M76 70 L82 70 L79 65" stroke="#2B6A93"/>
  <text x="22" y="146" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">SEED → CENTROID</text>
  <path d="M250 75 l26 -45 h52 l26 45 l-26 45 h-52 Z"/>
  <circle cx="302" cy="75" r="3" fill="currentColor" stroke="none"/>
  <text x="236" y="146" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">G = 5 / (36√3) ≈ 0.0802</text>
  <text x="170" y="72" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">REPEAT</text>
  <path d="M168 80 h52 m-6 -4 l6 4 l-6 4"/>
</svg>`

const guide: Guide = {
  lede: 'How nature divides space. Give every place to its nearest seed and the plane breaks into cells; move each seed to the middle of its cell, again and again, and the ragged cells settle into a calm, near-hexagonal honeycomb. The same rule shows up in a giraffe’s coat, a dragonfly’s wing, dry mud and soap foam.',
  facts: [
    ['Rule', 'Every point belongs to its nearest seed'],
    ['Cells', 'Voronoi diagram: Dirichlet, 1850; Voronoi, 1908'],
    ['Dual', 'Delaunay triangulation, 1934: no seed inside any triangle’s circumcircle'],
    ['Relaxation', 'Lloyd’s algorithm: each seed to its cell’s centroid, repeated'],
    ['Target', 'The hexagon’s second moment, $5/(36\\sqrt{3}) \\approx 0.0802$'],
    ['Honeycomb', 'Least perimeter for equal areas: proved by Thomas Hales, 1999'],
    ['Method', 'Exact half-plane clipping, nearest neighbor first'],
    ['Seeds', 'About 90 to 130 in the viewer, depending on the frame'],
    ['Running time', '66 s in four chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter (and back to the script)' },
      { keys: ['Space'], action: 'Hold to relax the field: every seed moves toward its centroid' },
      { keys: ['R'], action: 'Return the field to the script' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Tap the field to add a seed' },
      { gesture: 'drag', action: 'Drag a seed to move it; its neighbors’ walls follow live' },
      { gesture: 'hold', action: 'Press and hold on the field to relax it' },
      { gesture: 'tap', action: 'In the plate, tap a specimen to grow another from new seeds' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'Add a cluster of seeds close together in a calm region, then hold: watch the crowding spread out as a ripple through the neighbors until the honeycomb heals.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [
      { label: 'Relax', code: 'Space', aria: 'Hold to relax the field' },
      { label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true },
    ],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Geometry',
      title: 'The nearest seed',
      blocks: [
        {
          type: 'p',
          text: 'Scatter some points on a plane and call them seeds. Now give every other point of the plane to whichever seed is nearest. The plane breaks into territories, one per seed, each a convex polygon, and together they cover everything with no gaps and no overlaps. This partition is the **Voronoi diagram** of the seeds, and it is one of the most useful shapes in mathematics: it answers the question “which one is closest?” for every place at once.',
        },
        {
          type: 'p',
          text: 'The walls are not arbitrary. A point is equally far from two seeds exactly when it lies on the perpendicular bisector of the segment between them, so every wall of the diagram is a piece of such a bisector. Where three territories meet, the corner is equally far from three seeds: it is the center of a circle through all three, and that circle has no other seed inside it, or that seed would be nearer. Joining every pair of seeds whose territories share a wall gives a second figure, a mesh of triangles called the **Delaunay triangulation**, after the Russian mathematician Boris Delaunay, who described this empty-circle property in 1934. Each figure determines the other; they are duals.',
        },
        { type: 'figure', svg: bisectorFigure, alt: 'Three seeds A, B and C; the wall between A and B is the perpendicular bisector of AB; the corner where three walls meet is the center of a circle through A, B and C with no other seed inside.', caption: 'Why the walls are straight, and why the corners are special. Chapter II marks one pair and one corner like this.' },
        { type: 'h', text: 'A history in borrowed names' },
        {
          type: 'p',
          text: 'The idea has been found again and again, which is why it has so many names. René Descartes’s 1644 picture of the cosmos as vortices of matter, each swirling around its own star, is often cited as an early example. Peter Gustav Lejeune Dirichlet used the construction in 1850 to study quadratic forms, and Georgy Voronoi generalized it to any number of dimensions in a long paper published in 1908; mathematicians still say “Dirichlet tessellation” and “Voronoi diagram” interchangeably. The American meteorologist Alfred Thiessen used the same polygons in 1911 to average rainfall between gauges, and geographers call them Thiessen polygons. In 1933 the physicists Eugene Wigner and Frederick Seitz used the three-dimensional version, the region of a crystal closer to one atom than to any other, which solid-state physicists call the Wigner–Seitz cell.',
        },
        {
          type: 'p',
          text: 'One of the most famous early uses was practical, and urgent. In 1854 a cholera outbreak killed hundreds of people around Broad Street in London’s Soho. The physician John Snow mapped the deaths and argued that they clustered around one public water pump. On a version of the map he published in 1855 he added a dotted line through the points that are equally far, by the nearest road, from the Broad Street pump and from the pumps around it; the deaths fell overwhelmingly inside it. It is a Voronoi cell measured along streets instead of as the crow flies.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Why the cells become hexagons',
      blocks: [
        {
          type: 'p',
          text: 'Write the seeds as $\\mathbf{s}_1, \\ldots, \\mathbf{s}_n$. The territory, or cell, of seed $i$ is the set of points at least as close to it as to any other seed:',
        },
        { type: 'math', tex: 'V_i = \\{\\, \\mathbf{x} : |\\mathbf{x} - \\mathbf{s}_i| \\leq |\\mathbf{x} - \\mathbf{s}_j| \\text{ for all } j \\,\\}', label: '(1)' },
        { type: 'math', tex: 'V_i = \\bigcap_{j \\neq i} H_{ij}', label: '' },
        { type: 'math', tex: 'H_{ij} = \\{\\, \\mathbf{x} : (\\mathbf{x} - \\mathbf{s}_i) \\cdot \\mathbf{d}_{ij} \\leq \\tfrac{1}{2}|\\mathbf{d}_{ij}|^2 \\,\\}', label: '', caption: 'Here $\\mathbf{d}_{ij} = \\mathbf{s}_j - \\mathbf{s}_i$. Each condition is a half-plane bounded by a bisector, so every cell is an intersection of half-planes: a convex polygon.' },
        {
          type: 'p',
          text: 'Random seeds give a ragged diagram: cells of every size, with anywhere from three to ten or more sides. Yet the *average* number of sides is always close to six. This follows from Euler’s formula $V - E + F = 2$ for a map on the plane. In a Voronoi diagram, almost every corner has exactly three walls meeting at it, so $2E = 3V$; every wall borders two cells, so the sides of all the cells add up to $2E$. Putting these together, the average number of sides per cell is $6(1 - 2/F)$ plus a small correction for the cells at the edge, which tends to six as the number of cells grows. Six is not a property of hexagons. It is a property of any map in which three regions meet at every corner, and it is why hexagons are where such maps naturally settle.',
        },
        { type: 'h', text: 'Lloyd’s algorithm' },
        {
          type: 'p',
          text: 'Chapter III applies a beautifully simple rule: move every seed to the centroid, the center of mass, of its own cell; recompute the cells; repeat. It is called Lloyd’s algorithm, after Stuart Lloyd of Bell Labs, who devised it in 1957 to choose the levels of a pulse-code-modulation quantizer (his note circulated internally and was published only in 1982). Its discrete cousin, in which the “cells” are clusters of data points, is the k-means algorithm.',
        },
        {
          type: 'p',
          text: 'Why it works is easiest to see from the quantity it reduces. Measure how well a set of seeds “represents” the plane by the total squared distance from every point to its own seed:',
        },
        { type: 'math', tex: 'E = \\sum_{i=1}^{n} \\int_{V_i} |\\mathbf{x} - \\mathbf{s}_i|^2 \\, dA', label: '(2)' },
        {
          type: 'p',
          text: 'Each half of Lloyd’s step can only lower $E$. With the seeds fixed, giving every point to its nearest seed is by definition the partition that minimizes it. With the cells fixed, the single point that minimizes $\\int_{V_i} |\\mathbf{x} - \\mathbf{s}|^2\\,dA$ is the centroid of $V_i$. So $E$ falls with every iteration, quickly at first and then more and more slowly, until the seeds sit at the centroids of their own cells. Such a configuration is a **centroidal Voronoi tessellation**, studied in depth by Qiang Du, Vance Faber and Max Gunzburger in 1999. It is a local minimum of $E$, not always the global one, so the settled field usually keeps a few defects: seams where a five-sided and a seven-sided cell sit side by side.',
        },
        { type: 'figure', svg: lloydFigure, alt: 'A seed inside an irregular cell with an arrow to the cell’s centroid, and a regular hexagonal cell with its seed at the center.', caption: 'One step of Lloyd’s algorithm, and where it is heading.' },
        { type: 'h', text: 'Measuring roundness' },
        {
          type: 'p',
          text: 'To compare cells of different sizes the piece uses a dimensionless number, the normalized second moment of each cell about its own centroid $\\mathbf{c}_i$:',
        },
        { type: 'math', tex: 'G_i = \\frac{1}{2}\\,\\frac{\\int_{V_i} |\\mathbf{x} - \\mathbf{c}_i|^2 \\, dA}{A_i^{\\,2}}', label: '(3)', caption: '$A_i$ is the cell’s area. The factor $\\tfrac12$ is $1/d$ for $d = 2$ dimensions; scaling a cell does not change $G$.' },
        {
          type: 'p',
          text: 'Rounder cells have smaller $G$. A disc would score $1/(4\\pi) \\approx 0.0796$, but discs cannot tile the plane. Among shapes that can, the regular hexagon is best, at $5/(36\\sqrt{3}) \\approx 0.0802$; the square scores $1/12 \\approx 0.0833$ and the equilateral triangle $1/(6\\sqrt{3}) \\approx 0.0962$. The field in the piece starts near 0.096 and falls toward the hexagon’s value as it relaxes. That no arrangement of many seeds can beat the hexagonal one on this measure, on average, was shown by László Fejes Tóth and, in the form usually quoted, by Donald Newman in 1982 as “the hexagon theorem”. The corresponding statement in three dimensions, part of what is called Gersho’s conjecture, is still open.',
        },
        {
          type: 'aside',
          title: 'The honeycomb conjecture',
          text: 'A related question is older. Which way of dividing the plane into regions of equal area uses the least total wall length? Pappus of Alexandria, in the fourth century, praised the bees for choosing hexagons, and the claim that hexagons are best became known as the honeycomb conjecture. It was proved only in 1999, by Thomas Hales, and his proof holds even if the walls are allowed to curve. Real honeybees seem to have physics on their side as well: it has been proposed that their cells start out round and are pulled into hexagons as the warm wax flows.',
        },
      ],
    },
    {
      id: 'nature',
      kicker: 'Natural history',
      title: 'The same rule, in nature',
      blocks: [
        {
          type: 'p',
          text: 'Voronoi patterns turn up wherever things grow outward from centers at similar speeds until they meet, or wherever many neighbors push on each other until they settle. The plate in chapter IV draws six of them as specimens, each generated from a variant of the same diagram. The likenesses are real, but they are likenesses: in each case the actual mechanism is its own story, and the Voronoi diagram is the simplest model that captures the shape.',
        },
        {
          type: 'list',
          items: [
            '**a · Giraffe.** The coat of the reticulated giraffe is a net of pale lines around dark polygonal patches, strikingly like a Voronoi diagram with its cells shrunk away from their walls. The patches form during development, and their shapes appear to be partly inherited; the drawing uses lightly relaxed cells, inset and rounded, and hatched.',
            '**b · Dragonfly wing.** The membrane between a dragonfly’s main veins is divided by many small cross-veins into polygonal cells, finer toward the trailing edge and the tip. A 2018 study by Jordan Hoffmann, Seth Donoughe and colleagues found the cells close to, but measurably different from, a Voronoi diagram, and better matched by a model in which the veins form between centers that inhibit their surroundings. The drawing uses density-graded seeds clipped to a convex wing, with a few long veins and the dark pterostigma near the tip.',
            '**c · Dry earth.** Mud shrinks as it dries and cracks into plates. Fresh crack networks are dominated by T-shaped junctions, where a new crack meets an old one at right angles, and experiments by Lucas Goehring and colleagues showed that repeated wetting and drying gradually turns them into Y-shaped junctions near 120°, much more like a Voronoi diagram. The drawing shrinks random Voronoi plates apart and roughens their edges, with the cracks hatched dark.',
            '**d · Leaf.** Between a leaf’s midrib and secondary veins, the finest veins enclose small islands of tissue called areoles, which tile the leaf like polygonal cells. The drawing lays a fine relaxed Voronoi diagram inside the outline, under the main veins.',
            '**e · Soap foam.** In a two-dimensional foam, films meet three at a time at 120°, one of Joseph Plateau’s laws of 1873, and each film bows into the larger of the two bubbles it separates, because the smaller bubble is at higher pressure (the Young–Laplace law). John von Neumann showed in 1952 that such a foam coarsens by a rule that singles out six: a bubble with fewer than six sides shrinks, one with more than six grows, at a rate proportional to the difference. The drawing relaxes bubbles of many sizes and bows each film by an amount set by the difference of the two curvatures.',
            '**f · City.** A phone usually talks to the strongest nearby tower, which for towers of similar power on open ground is roughly the nearest one, so a coverage map is approximately a Voronoi diagram of the towers, finer downtown where they are dense. Real coverage depends on power, antennas and terrain, which turn it into a weighted diagram.',
          ],
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
          text: 'Territories is a single TypeScript module drawing to one canvas with the Canvas 2D API, with no geometry library. The scripted loop is a pure function of time, so it can be scrubbed and tested; once you touch the field it becomes yours, a live set of seeds that you edit and relax, until the loop begins again.',
        },
        { type: 'h', text: 'Cells by half-plane clipping' },
        {
          type: 'p',
          text: 'Equation (1) is also an algorithm. Each cell starts as the whole frame and is cut by the bisector of every other seed in turn, keeping the side that contains its own seed, with the Sutherland–Hodgman clipping step. Two details make it fast and robust. The other seeds are visited nearest first, and the loop stops as soon as a seed is more than twice as far away as the cell’s farthest corner, because its bisector can no longer reach the cell; in practice that is after a dozen or so neighbors. And each edge of the polygon carries a label, the index of the neighbor whose bisector made it, or −1 for the frame, so the walls, the Delaunay edges and the side counts all come straight out of the clipping:',
        },
        {
          type: 'code',
          code: `for (let q = 0; q < cnt && m >= 3; q++) {
  const j = IDX[q]                       // neighbors, nearest first
  const d2 = D2[j]
  if (d2 > 4 * r2) break                 // too far to cut this cell any more
  const nx = xs[j] - sx
  const ny = ys[j] - sy
  const half = d2 / 2
  // keep (x − s)·(sj − s) ≤ |sj − s|²/2
  let o = 0
  for (let k = 0; k < m; k++) {
    const k2 = k + 1 === m ? 0 : k + 1
    const fP = (AX[k] - sx) * nx + (AY[k] - sy) * ny - half
    const fQ = (AX[k2] - sx) * nx + (AY[k2] - sy) * ny - half
    if (fP <= 0) {
      BX[o] = AX[k]; BY[o] = AY[k]; BL[o++] = AL[k]
      if (fQ > 0) {                      // leaving: the new wall starts here, labeled j
        const t = fP / (fP - fQ)
        BX[o] = AX[k] + (AX[k2] - AX[k]) * t; BY[o] = AY[k] + (AY[k2] - AY[k]) * t; BL[o++] = j
      }
    } else if (fQ <= 0) {                // entering: the old edge resumes
      const t = fP / (fP - fQ)
      BX[o] = AX[k] + (AX[k2] - AX[k]) * t; BY[o] = AY[k] + (AY[k2] - AY[k]) * t; BL[o++] = AL[k]
    }
  }
  m = o                                  // … then copy back and update r2, the farthest corner
}`,
          caption: 'Clipping one cell by one bisector (lightly condensed). No allocation: the polygons live in preallocated typed arrays.',
        },
        {
          type: 'p',
          text: 'For about a hundred seeds this costs a millisecond or two, so the whole diagram is simply recomputed every frame, which is what lets the walls follow your finger when you drag a seed. The same pass computes each cell’s area, centroid and second moment exactly from its corners with the shoelace formulas, and counts its sides, ignoring cells that touch the frame.',
        },
        { type: 'h', text: 'Growing the cells' },
        {
          type: 'p',
          text: 'Chapter II grows the diagram the way a grass fire would burn outward from every seed at once: circles widen at the same speed from all the seeds, and where two fronts meet they stop and leave a wall. It is drawn from the finished diagram. Each seed’s circle is drawn only where it is still inside its own cell, and each wall only where the circles have reached it, which is a short quadratic, since every point on a wall is equally far from both its seeds:',
        },
        {
          type: 'code',
          code: `// the part of this wall within R of the seed (both seeds are equally far from every point on it)
const dx = x1 - x0
const dy = y1 - y0
const ex = x0 - SXs[i]
const ey = y0 - SYs[i]
const A2 = dx * dx + dy * dy
const B = ex * dx + ey * dy
const Cc = ex * ex + ey * ey - R * R
const disc = B * B - A2 * Cc
if (A2 < 1e-9 || disc <= 0) continue
const sq = Math.sqrt(disc)
const t0 = Math.max(0, (-B - sq) / A2)
const t1 = Math.min(1, (-B + sq) / A2)
if (t1 <= t0) continue
ctx.moveTo(x0 + dx * t0, y0 + dy * t0)
ctx.lineTo(x0 + dx * t1, y0 + dy * t1)`,
          caption: 'Solving $|\\mathbf{p}_0 + t(\\mathbf{p}_1 - \\mathbf{p}_0) - \\mathbf{s}|^2 \\le R^2$ for the visible stretch of a wall.',
        },
        { type: 'h', text: 'Relaxing, frame by frame' },
        {
          type: 'p',
          text: 'The scripted relaxation runs 56 iterations of Lloyd’s algorithm over about 18 seconds. Each iteration is computed once, on demand, and kept, so the film can be scrubbed backward as well as forward. Between iterations the seeds are interpolated, and the iteration count is a power of time, so the first iterations, which make the largest moves, take the longest, and the last, which only polish, go quickly. The effect is of a crowd finding its places: a few big shuffles, then a long, calm settling.',
        },
        {
          type: 'code',
          code: `function iterate(k: number) {
  while (history.length <= k) {
    const prev = history[history.length - 1]
    for (let i = 0; i < N; i++) {
      SXs[i] = prev[i * 2]
      SYs[i] = prev[i * 2 + 1]
    }
    voronoi(SXs, SYs, N, dom, cells)
    const next = new Float64Array(N * 2)
    for (let i = 0; i < N; i++) {
      next[i * 2] = cells.GX[i]          // every seed to its cell's centroid
      next[i * 2 + 1] = cells.GY[i]
    }
    history.push(next)
  }
  return history[k]
}
/** The scripted relaxation: iterations as a function of time, slow first (the big moves), quick last. */
const iterAt = (T: number) => (T < RX0 ? 0 : T >= RX1 ? ITER : ITER * Math.pow((T - RX0) / (RX1 - RX0), 1.7))`,
          caption: 'Lloyd’s algorithm as a lazily filled history, so time can run both ways.',
        },
        {
          type: 'p',
          text: 'Your own field relaxes continuously instead: while you hold, each seed moves a fraction of the way to its centroid every frame, $\\mathbf{s} \\leftarrow \\mathbf{s} + (\\mathbf{c} - \\mathbf{s})(1 - e^{-k\\,\\Delta t})$, a smooth version of the same step that converges to the same kind of tiling.',
        },
        { type: 'h', text: 'The plate' },
        {
          type: 'p',
          text: 'Each specimen is drawn once into an offscreen canvas, at the screen’s pixel ratio, during the seconds before the plate appears, and then revealed by a widening circle with a hairline at its edge. The giraffe and the soap foam relax their seeds two steps; the dragonfly wing and the leaf use seeds scattered with a density that varies across the shape, and clip the diagram to the wing or leaf outline (both convex, so it is the same clipping as the frame); the dry earth uses raw random seeds, shrinks each plate by clipping it against its own edges moved inward, and roughens the result with noise; the foam bows each film with a quadratic curve. Tapping a specimen redraws it from fresh seeds.',
        },
        {
          type: 'p',
          text: 'With sound on, seeds tick softly as they land, and the relaxation is a quiet chord whose top voice is detuned in proportion to how far the cells are from the hexagon’s second moment. As the field settles, the beating slows toward stillness.',
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
            '**I · Seeds (0–5 s).** The seeds land, scattered at random but never too close together.',
            '**II · Territories (5–15 s).** Ocean circles grow from every seed and leave ink walls where they meet. Then one pair is annotated: the moss dashed segment between two seeds with equal ticks, the wall that bisects it at a right angle, marked *equidistant*; and one corner with its dashed *empty circle* through three seeds. The faint dotted ocean mesh is the Delaunay triangulation.',
            '**III · Room (15–38 s).** Lloyd’s algorithm. Ocean arrows run from each seed toward its centroid (drawn twice their true length so the last small moves still show); the small crosses are the centroids. Cells with five sides are washed ocean, seven sides moss: the defects, which travel and heal as the field settles. At the left, or under the field on a phone, a bar chart counts the sides of the interior cells, and a needle moves along a scale of $G$ from scattered seeds toward the hexagon’s 0.0802 (the long tick is the square’s 1/12). At the end the walls double into a honeycomb.',
            '**IV · The same rule (38–66 s).** The plate of six specimens, a to f. On small screens they come three at a time.',
            '**Readouts.** Seeds, iteration, the share of interior cells that are hexagons, and the mean $G$. “Your field” replaces the chapter name once you have touched it.',
            '**Bottom ruler.** The 66-second timeline with four chapter numerals; tap it to jump.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: in chapter II, the instant two growing circles touch and a straight wall appears between them; early in chapter III, the large cells at the edge of the field shrinking as their seeds are pulled inward; and the last few seconds of relaxation, when almost nothing moves except a lone five-and-seven pair working its way along a seam.',
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
            '**The frame is a wall.** The field is bounded by its frame, so cells along the edge line up with it rather than becoming hexagons. A field that wrapped around at its edges could relax completely, but would read less clearly as a territory.',
            '**The seeds are not quite random.** They are scattered with a minimum spacing, which avoids slivers too small to see. Truly random (Poisson) seeds would give an even more ragged first diagram.',
            '**Lloyd’s algorithm is shown, not raced.** The film interpolates between whole iterations; nothing about the convergence is staged, but the timing is chosen for the eye.',
            '**The specimens are models.** Each is a Voronoi variant chosen to look like its subject; the real patterns form by their own mechanisms, and some (mud cracks, dragonfly wings) are known to differ from a Voronoi diagram in measurable ways.',
            '**The honeycomb is drawn by insetting the cells.** Real combs are built in three dimensions, with rhombic bases and walls of wax with real thickness.',
            '**Coverage maps** in reality use weighted diagrams and radio propagation; nearest distance is the first approximation.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Nouvelles applications des paramètres continus à la théorie des formes quadratiques', by: 'Georgy Voronoi', year: '1908', note: '*Journal für die reine und angewandte Mathematik* 134.' },
    { title: 'Über die Reduction der positiven quadratischen Formen mit drei unbestimmten ganzen Zahlen', by: 'Peter Gustav Lejeune Dirichlet', year: '1850', note: '*Journal für die reine und angewandte Mathematik* 40.' },
    { title: 'Sur la sphère vide', by: 'Boris Delaunay', year: '1934', note: 'The empty-circle (and empty-sphere) property.' },
    { title: 'On the Mode of Communication of Cholera, second edition', by: 'John Snow', year: '1855', note: 'With the Broad Street map.' },
    { title: 'Least squares quantization in PCM', by: 'Stuart P. Lloyd', year: '1982', note: '*IEEE Transactions on Information Theory* 28. Written at Bell Labs in 1957.' },
    { title: 'Centroidal Voronoi tessellations: applications and algorithms', by: 'Qiang Du, Vance Faber & Max Gunzburger', year: '1999', note: '*SIAM Review* 41.' },
    { title: 'The honeycomb conjecture', by: 'Thomas C. Hales', year: '2001', note: '*Discrete & Computational Geometry* 25.' },
    { title: 'Spatial Tessellations: Concepts and Applications of Voronoi Diagrams', by: 'Atsuyuki Okabe, Barry Boots, Kokichi Sugihara & Sung Nok Chiu', year: '2000', note: 'Second edition, Wiley. The encyclopedia of the subject.' },
    { title: 'A sweepline algorithm for Voronoi diagrams', by: 'Steven Fortune', year: '1987', note: '*Algorithmica* 2. The classic $O(n \\log n)$ method, an alternative to the clipping used here.' },
    { title: 'A simple developmental model recapitulates complex insect wing venation patterns', by: 'Jordan Hoffmann, Seth Donoughe et al.', year: '2018', note: '*Proceedings of the National Academy of Sciences* 115.' },
  ],
}

export default guide
