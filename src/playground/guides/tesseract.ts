import type { Guide } from '../guide'

const ladderFigure = `<svg viewBox="0 0 440 150" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <circle cx="24" cy="76" r="2.5" fill="currentColor" stroke="none"/>
  <line x1="62" y1="76" x2="112" y2="76" stroke="#2B6A93"/>
  <circle cx="62" cy="76" r="2" fill="currentColor" stroke="none"/>
  <circle cx="112" cy="76" r="2" fill="currentColor" stroke="none"/>
  <rect x="146" y="51" width="50" height="50"/>
  <line x1="146" y1="51" x2="146" y2="101" stroke="#1F8A86"/>
  <line x1="196" y1="51" x2="196" y2="101" stroke="#1F8A86"/>
  <rect x="234" y="58" width="44" height="44"/>
  <rect x="250" y="44" width="44" height="44"/>
  <path d="M234 58 L250 44 M278 58 L294 44 M234 102 L250 88 M278 102 L294 88" stroke="#3F7A55"/>
  <rect x="336" y="36" width="80" height="80"/>
  <rect x="356" y="56" width="40" height="40"/>
  <path d="M336 36 L356 56 M416 36 L396 56 M336 116 L356 96 M416 116 L396 96" stroke="#6F952F"/>
  <text x="10" y="138" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">0D · 1</text>
  <text x="66" y="138" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">1D · 2</text>
  <text x="150" y="138" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">2D · 4</text>
  <text x="240" y="138" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">3D · 8</text>
  <text x="352" y="138" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">4D · 16</text>
  <text x="128" y="20" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.65" letter-spacing="1">EACH SLIDE DOUBLES THE CORNERS</text>
</svg>`

const sliceFigure = `<svg viewBox="0 0 420 170" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <path d="M20 120 L120 96 L200 120 L100 144 Z" opacity="0.6"/>
  <path d="M70 120 L110 108 L130 124 Z" stroke="#3F7A55" fill="#3F7A55" fill-opacity="0.15"/>
  <path d="M110 30 L80 70 L110 108 L140 70 Z M80 70 L130 124 M140 70 L70 120" opacity="0.8"/>
  <text x="20" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">CUBE · CORNER FIRST</text>
  <path d="M260 120 L300 60 L340 120 Z" stroke="#3F7A55"/>
  <path d="M300 60 L312 108 L260 120 M312 108 L340 120" stroke="#3F7A55" opacity="0.5"/>
  <path d="M360 90 L388 62 L410 92 L384 118 Z M388 62 L384 118 M360 90 L410 92" stroke="#3F7A55"/>
  <text x="246" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" letter-spacing="1">TETRAHEDRON → OCTAHEDRON</text>
  <text x="230" y="24" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.65" letter-spacing="1">TESSERACT · CORNER FIRST</text>
</svg>`

const guide: Guide = {
  lede: 'Seeing a shape we cannot see. Slide a point and it leaves a line; slide the line at right angles and it leaves a square, then a cube, then — in a fourth direction at right angles to all three — a tesseract. We can only ever draw its shadow, or meet it one slice at a time.',
  facts: [
    ['Vertices · edges', '16 vertices, 32 edges'],
    ['Faces · cells', '24 squares, 8 cubes; $16 - 32 + 24 - 8 = 0$'],
    ['Schläfli symbol', '$\\{4, 3, 3\\}$'],
    ['Name', '“Tesseract”, Charles Howard Hinton, 1888'],
    ['Rotation', 'In the XW plane (two turns) and the YW plane (one turn)'],
    ['Projection', 'Perspective from 4D to 3D, eye on the w axis; then 3D to the page'],
    ['Slices', 'Corner first: tetrahedron, truncated tetrahedron, octahedron'],
    ['Net', 'Eight cubes and seven hinges: the cross in Dalí’s *Corpus Hypercubus*, 1954'],
    ['Running time', '88 s in four chapters, looping'],
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next chapter' },
      { keys: ['Space'], action: 'Switch a drag between turning in 3D and turning in 4D' },
      { keys: ['3', '4'], action: 'Drag turns in 3D, or in 4D' },
      { keys: ['Shift'], action: 'Hold while dragging to turn in 4D' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Turn the figure in 3D: sideways for yaw, up and down for pitch' },
      { gesture: 'drag', action: 'With the 4D switch on: sideways turns in the XW plane, up and down in YW' },
      { gesture: 'tap', action: 'Tap the figure to step to the next beat' },
      { gesture: 'tap', action: 'Tap the 3D / 4D switch, or the ruler to jump to a chapter' },
    ],
    tip: 'In chapter III, switch to 4D and drag: you are turning the tesseract before it is sliced, so the sequence of slices changes from tetrahedra and octahedra into other polyhedra.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [
      { label: '3D / 4D', code: 'Space', aria: 'Switch between turning in 3D and 4D' },
      { label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true },
    ],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Geometry',
      title: 'One more direction',
      blocks: [
        {
          type: 'p',
          text: 'There is a simple recipe for building cubes in any number of dimensions. Start with a point. Slide it a unit distance in some direction and it sweeps out a line segment, with two ends. Slide the segment the same distance in a new direction at right angles to the first and it sweeps out a square, with four corners. Slide the square at right angles to both previous directions and you get a cube, with eight. Nothing in the recipe says to stop at three. Slide the cube a unit in a fourth direction, at right angles to all three of ours, and the shape it sweeps out is a four-dimensional cube: a hypercube, or tesseract.',
        },
        {
          type: 'p',
          text: 'We cannot point in that fourth direction, but we can count. Every slide doubles the corners, because there is the old shape and its copy. It doubles the old edges for the same reason, and adds one new edge for every old corner, joining each to its copy. So the counts follow a rule a child could run:',
        },
        { type: 'math', tex: 'V_n = 2V_{n-1}, \\qquad E_n = 2E_{n-1} + V_{n-1}', label: '(1)' },
        { type: 'math', tex: 'f_k(n) = 2^{\\,n-k}\\,\\frac{n!}{k!\\,(n-k)!}', label: '', caption: '$V_n$ and $E_n$ are the corners and edges of the $n$-dimensional cube; $f_k(n)$ is its number of $k$-dimensional faces (corners are $k = 0$, edges $k = 1$, squares $k = 2$, cubes $k = 3$).' },
        {
          type: 'table',
          head: ['Shape', 'Corners', 'Edges', 'Squares', 'Cubes'],
          rows: [
            ['Point (0D)', '1', '', '', ''],
            ['Segment (1D)', '2', '1', '', ''],
            ['Square (2D)', '4', '4', '1', ''],
            ['Cube (3D)', '8', '12', '6', '1'],
            ['Tesseract (4D)', '16', '32', '24', '8'],
          ],
          caption: 'The table chapter I fills in as it builds. For the tesseract, $16 - 32 + 24 - 8 = 0$, as Euler’s formula requires for the boundary of a four-dimensional polytope.',
        },
        { type: 'figure', svg: ladderFigure, alt: 'A point, a segment, a square, a cube and a tesseract drawn as a cube inside a cube, with the new edges of each step colored.', caption: 'The ladder of dimensions. The colored edges are the ones each slide adds, joining every corner to its copy.' },
        { type: 'h', text: 'A short history' },
        {
          type: 'p',
          text: 'The idea of more than three dimensions grew up in the nineteenth century, partly as pure mathematics and partly as a popular fascination. The Swiss mathematician Ludwig Schläfli worked out the geometry of $n$ dimensions around 1850–52, including the complete list of regular polytopes, the higher-dimensional cousins of the Platonic solids: in four dimensions there are six, the tesseract among them, and in every dimension above four only three. His treatise was not published in full until 1901, after his death, and the same six were found independently by others. One of them, Alicia Boole Stott, daughter of the logician George Boole, coined the English word *polytope* and made beautiful models of the three-dimensional slices of the four-dimensional solids, the subject of chapter III.',
        },
        {
          type: 'p',
          text: 'The word *tesseract* comes from Charles Howard Hinton, a British mathematician and teacher who spent much of his life trying to make the fourth dimension intuitive. In *A New Era of Thought* (1888) he introduced the name, usually explained as coming from the Greek for “four rays”, after the four edges that meet at each corner, and he devised sets of colored cubes meant to train the mind to imagine the shape by its cross-sections. In 1884 the schoolmaster Edwin Abbott Abbott had published *Flatland*, a satire narrated by A Square, a resident of a two-dimensional world, which remains the best way in to the subject for most people. In 1886 Victor Schlegel described the kind of drawing this piece makes: a four-dimensional polytope projected into our space in perspective, so that it appears as one cell with the others packed inside it.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Rotating and projecting',
      blocks: [
        {
          type: 'p',
          text: 'Give the tesseract coordinates. Its sixteen corners are the points $(\\pm 1, \\pm 1, \\pm 1, \\pm 1)$, all combinations of signs; two corners are joined by an edge when they differ in exactly one coordinate. The eight cubes are the places where one coordinate is fixed at $+1$ or $-1$, and the twenty-four squares where two are.',
        },
        { type: 'h', text: 'Rotation happens in planes' },
        {
          type: 'p',
          text: 'In three dimensions we say a rotation turns about an axis. That habit of language does not survive into four dimensions. What a rotation really does is turn one plane, mixing two coordinates, while leaving everything at right angles to that plane alone. In 3D the leftover is a line, so we call it an axis; in 4D the leftover is a whole plane. A rotation by angle $\\theta$ in the XW plane mixes $x$ and $w$ and leaves $y$ and $z$ fixed:',
        },
        { type: 'math', tex: 'x\' = x\\cos\\theta - w\\sin\\theta, \\qquad w\' = x\\sin\\theta + w\\cos\\theta', label: '(2)', caption: '$y$ and $z$ are unchanged.' },
        {
          type: 'p',
          text: 'Four dimensions have six coordinate planes, XY, XZ, XW, YZ, YW and ZW. The three that involve $w$ are the ones that look strange to us, because they trade one of our directions for the one we cannot see. The piece turns in XW and YW together, through two full turns and one full turn over twenty seconds, and lets you add to either by dragging. Since both of those planes leave $z$ alone, their combination is itself a rotation in a single plane inside the XYW subspace. A general rotation in 4D can turn two completely perpendicular planes at once, a *double rotation*, which has no counterpart in 3D at all.',
        },
        { type: 'h', text: 'Two perspective projections' },
        {
          type: 'p',
          text: 'To draw the rotated tesseract we project twice, each time the way a camera projects: by dividing by depth. First from 4D to 3D, with an eye on the $w$ axis at $w = L$. A point farther from the eye along $w$ is drawn smaller:',
        },
        { type: 'math', tex: '(x, y, z) \\mapsto k\\,(x, y, z), \\qquad k = \\frac{L - w_{\\text{ref}}}{L - w}', label: '(3)', caption: 'The piece uses $L = 3$ and normalizes so the cube at $w_{\\text{ref}} = +1$ keeps its size; the cube at $w = -1$ then appears half as large.' },
        {
          type: 'p',
          text: 'Then from 3D to the page, with an eye in front at distance $D = 7$ units, after turning the 3D result by a yaw and a pitch:',
        },
        { type: 'math', tex: 'x_s = c_x + S\\,\\frac{D\\,x}{D + z}, \\qquad y_s = c_y - S\\,\\frac{D\\,y}{D + z}', label: '(4)', caption: '$S$ is the drawing scale in pixels and $(c_x, c_y)$ the center of the drawing.' },
        {
          type: 'p',
          text: 'This is why the familiar picture is a small cube inside a large one. The two are the cubes at $w = -1$ and $w = +1$, the original and its copy, and the six lopsided frustums between them are the other six cubes, seen at a slant. Rotating in XW slides the inner cube outward through one side while the outer cube swings in through the other. Nothing is really turning inside out; every cube stays a perfect cube in four dimensions. It is the shadow that turns inside out, because the distance to the four-dimensional eye keeps changing. That is the meaning of the caption in chapter II, and the deep point of Abbott’s book: a lower-dimensional view of a higher-dimensional object is always a shadow or a slice, and both distort.',
        },
      ],
    },
    {
      id: 'flatland',
      kicker: 'Analogy',
      title: 'Flatland, and one slice at a time',
      blocks: [
        {
          type: 'quote',
          text: 'I call our world Flatland, not because we call it so, but to make its nature clearer to you, my happy readers, who are privileged to live in Space.',
          cite: 'A Square, in Edwin A. Abbott, Flatland (1884)',
        },
        {
          type: 'p',
          text: 'In *Flatland* a Sphere visits A Square. Since A Square can perceive only his plane, what he meets is the Sphere’s cross-section: a point that appears from nowhere, widens into a circle, reaches the Sphere’s full width and shrinks back to a point as the Sphere passes through. A Square refuses to believe there is anything more to it, until the Sphere lifts him out of the plane. The book’s quiet suggestion is that we, too, might be meeting only the slices of things.',
        },
        {
          type: 'p',
          text: 'Chapter III puts the two cases side by side. On the left, in Flatland, a sphere passes down through a plane, and its slice is a circle of radius $\\sqrt{R^2 - h^2}$ at height $h$. On the right, in what Abbott called Spaceland, our own space, a four-dimensional sphere (a 3-sphere) passes through, and its slice is an ordinary sphere of the same radius $\\sqrt{R^2 - h^2}$: it appears as a point, swells and shrinks away. Nothing about the formula knows how many dimensions it lives in.',
        },
        { type: 'h', text: 'Cubes, corner first' },
        {
          type: 'p',
          text: 'Then the cubes. Push an ordinary cube through Flatland corner first, along its long diagonal $(1, 1, 1)/\\sqrt{3}$, and A Square sees a point become a growing triangle; the triangle’s corners are clipped into a hexagon, which is perfectly regular at the halfway point; then the hexagon becomes an inverted triangle that shrinks away. Push a tesseract through our space corner first, along $(1, 1, 1, 1)/2$, and we would see the same story one dimension up: a point becomes a growing tetrahedron, its corners are clipped into a truncated tetrahedron, and halfway through it is a perfect octahedron, before the sequence runs backward. Pushed face first instead, the tesseract would simply appear as a cube, stay the same for a while, and vanish, just as a cube pushed face first through Flatland appears as a square.',
        },
        { type: 'figure', svg: sliceFigure, alt: 'A cube passing corner first through a plane with its triangular slice, and the slices of a tesseract: a tetrahedron and an octahedron.', caption: 'Corner-first slices: a triangle that becomes a hexagon in Flatland; a tetrahedron that becomes an octahedron in our space.' },
        {
          type: 'p',
          text: 'Computing these slices exactly is pleasantly simple. The slicing hyperplane is the set of points with $\\mathbf{n} \\cdot \\mathbf{x} = h$. Give every corner its signed height $s = \\mathbf{n} \\cdot \\mathbf{v} - h$. An edge whose two corners have opposite signs crosses the hyperplane at the point a fraction $s_0 / (s_0 - s_1)$ along it. Each square face is convex, so it meets the hyperplane in a single segment, joining the crossings on two of its four edges; those segments, from all twenty-four squares, are exactly the edges of the slice. Each of the eight cubes meets the hyperplane in a convex polygon, and those polygons are the slice’s faces. The slice is then drawn in the hyperplane’s own three coordinates, given by three unit vectors at right angles to $\\mathbf{n}$ and to each other.',
        },
        { type: 'math', tex: '\\mathbf{n} = \\tfrac{1}{2}(1,1,1,1), \\qquad \\mathbf{b}_3 = \\tfrac{1}{2}(1,1,-1,-1)', label: '(5)' },
        { type: 'math', tex: '\\mathbf{b}_1 = \\tfrac{1}{\\sqrt{2}}(1,-1,0,0), \\qquad \\mathbf{b}_2 = \\tfrac{1}{\\sqrt{2}}(0,0,1,-1)', label: '', caption: 'The slicing direction and three axes of the slice, all at right angles.' },
      ],
    },
    {
      id: 'net',
      kicker: 'Art',
      title: 'Eight cubes, and a painting',
      blocks: [
        {
          type: 'p',
          text: 'A cube can be cut along seven of its edges and unfolded flat into six squares, a net; there are eleven different nets of the cube. In the same way the tesseract can be cut along some of its squares and unfolded into our space as eight cubes joined face to face. Peter Turney counted the possibilities in 1984 and found 261 distinct nets.',
        },
        {
          type: 'p',
          text: 'The most famous is a cross: a column of four cubes with four more around the second from the top. Salvador Dalí painted it in 1954 as the cross in *Crucifixion (Corpus Hypercubus)*, now in the Metropolitan Museum of Art in New York, with Christ suspended in front of the unfolded hypercube. Dalí was fascinated by science and mathematics in the 1950s, and the painting turns the old analogy around: just as a cube’s net is a flat shadow of something more complete, the cross is the unfolded, earthly form of a shape from a higher dimension. Linda Dalrymple Henderson’s history of the fourth dimension in modern art traces how widely ideas like Hinton’s and Abbott’s spread among painters in the decades before.',
        },
        {
          type: 'p',
          text: 'Chapter IV unfolds the net the way a real one would open, by turning each cube in four dimensions about the square it shares with its neighbor. The central cube is the one at $w = -1$. The six cubes around it each turn a quarter turn in the plane of their own axis and $w$, about their shared square, until they lie in the same 3D space as the central one. The eighth cube, the one at $w = +1$, rides on the cube below the center and then opens about the square it shares with that one. Seven hinges, eight cubes, a cross.',
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
          text: 'Fourth Dimension is a single TypeScript module drawing to one canvas with the Canvas 2D API, with no 3D library. It is a pure function of time over an 88-second loop, which makes it seekable and testable; the only state that accumulates is your own rotation, in 3D and in 4D, which persists until you change it. The tesseract is sixteen vertices, generated from the bits of the numbers 0 to 15, and thirty-two edges, the pairs of vertices whose numbers differ in one bit.',
        },
        { type: 'h', text: 'Building, turning, projecting' },
        {
          type: 'p',
          text: 'In chapter I each axis has a slide parameter that runs from 0 to 1 as the copy moves out, and a recentering parameter that lags behind it, so the slide reads first and the shape then settles back into the middle. Along $w$ the copy moves away from the four-dimensional eye, so it shrinks. Every frame, each vertex is placed, turned in XW and YW, and projected twice:',
        },
        {
          type: 'code',
          code: `function pos4(v: number, out: V4) {
  for (let k = 0; k < 3; k++) out[k] = (v & (1 << k) ? 2 * SIG[k] : 0) - RHO[k]
  out[3] = RHO[3] - (v & 8 ? 2 * SIG[3] : 0)   // the copy slides away from the 4D eye
}

const [sxw, syw] = rot4Script(T)
const wRef = RHO[3]
for (let v = 0; v < NV; v++) {
  const p = X4[v]
  pos4(v, p)
  rotPlane(p, 0, 3, sxw + uXW)                 // the XW plane: script + your drag
  rotPlane(p, 1, 3, syw + uYW)                 // the YW plane
  SK[v] = to3(p, wRef, X3[v])                  // 4D → 3D, equation (3)
  view(X3[v][0], X3[v][1], X3[v][2])           // 3D → 2D, equation (4)
  SX[v] = P2[0]
  SY[v] = P2[1]
  SZ[v] = P2[2]
}`,
          caption: 'All sixteen corners, every frame. `SIG` and `RHO` are the slide and recentering of each axis.',
        },
        {
          type: 'p',
          text: 'The rotation angles are $2\\pi\\cdot 2\\,s(u)$ and $2\\pi\\,s(u)$ with $s(u) = u - \\sin(2\\pi u)/2\\pi$, which starts and stops gently and runs at a nearly constant speed in between. Edges are sorted from far to near and drawn with an alpha that falls with depth, both the 3D depth and the 4D perspective factor, so nearer edges read darker. In chapter I the edges a slide has just created are drawn in that axis’s color (ocean, lagoon, moss, fern for X, Y, Z, W) and the swept square or faces are hatched while the slide happens.',
        },
        { type: 'h', text: 'Slicing' },
        {
          type: 'p',
          text: 'The slice in chapter III follows the method described above, almost line for line. Your 4D drag is applied to the tesseract before slicing, so dragging in 4D during this chapter changes the shapes you see:',
        },
        {
          type: 'code',
          code: `const s = V4s.map((q) => q[0] * nT[0] + q[1] * nT[1] + q[2] * nT[2] + q[3] * nT[3] - hh)
EDGES.forEach(([i, j], e) => {
  if (s[i] < 0 === s[j] < 0) return              // this edge does not cross
  const t = s[i] / (s[i] - s[j])
  const q: V4 = [lerp(V4s[i][0], V4s[j][0], t), lerp(V4s[i][1], V4s[j][1], t), lerp(V4s[i][2], V4s[j][2], t), lerp(V4s[i][3], V4s[j][3], t)]
  const c0 = q[0] * bT[0][0] + q[1] * bT[0][1] + q[2] * bT[0][2] + q[3] * bT[0][3]
  const c1 = q[0] * bT[1][0] + q[1] * bT[1][1] + q[2] * bT[1][2] + q[3] * bT[1][3]
  const c2 = q[0] * bT[2][0] + q[1] * bT[2][1] + q[2] * bT[2][2] + q[3] * bT[2][3]
  // … then a fixed turn of the slice's own axes (PR), so no edge starts end-on to the eye
  hit[e] = 1
})
// each square face cuts one segment of the slice: between the crossings on two of its edges
for (const q of SQUARES) {
  const ends: number[] = []
  for (let i = 0; i < 4; i++) {
    const e = edgeOf(q[i], q[(i + 1) % 4])
    if (hit[e]) ends.push(e)
  }
  if (ends.length === 2) segs.push(ends[0], ends[1])
}`,
          caption: 'The slice of the tesseract by the hyperplane $\\mathbf{n}\\cdot\\mathbf{x} = h$ (trimmed). The faces are the polygons cut from the eight cubes, sorted round their centroids.',
        },
        {
          type: 'p',
          text: 'Flatland’s side is drawn with real occlusion, cheaply: every edge of the sphere’s wireframe and of the cube is split where it crosses the plane, the parts below are drawn first, the plane is laid over them as a translucent sheet, and the parts above are drawn last. The shape’s name under each panel comes from the slice itself (the number of crossing points, three or six for the cube, and the slice height for the tesseract).',
        },
        { type: 'h', text: 'Unfolding' },
        {
          type: 'p',
          text: 'Each point of each cube in the net is carried by its hinges and then projected like everything else. A hinge is a rotation in the plane of one axis and $w$, about the square where that axis and $w$ take their shared values:',
        },
        {
          type: 'code',
          code: `const hingeTo = (a: number, sgn: number, phi: number) => {
  // rotate about the square x_a = sgn, w = −1, in the (a, w) plane
  const da = p[a] - sgn
  const dw = p[3] + 1
  p[a] = sgn + da * Math.cos(phi) + sgn * dw * Math.sin(phi)
  p[3] = -1 - sgn * da * Math.sin(phi) + dw * Math.cos(phi)
}
if (c === OPPOSITE) {
  // first about its square with the carrier (y = −1, w = +1) …
  const dy = p[1] + 1
  const dw = p[3] - 1
  const phi = u.second * Q
  p[1] = -1 + dy * Math.cos(phi) - dw * Math.sin(phi)
  p[3] = 1 + dy * Math.sin(phi) + dw * Math.cos(phi)
  hingeTo(1, -1, u.carrier * Q)                // … then with the carrier about the center
} else if (c === CARRIER) hingeTo(1, -1, u.carrier * Q)
else if (c !== CENTRAL) hingeTo(cell.axis, cell.bit ? 1 : -1, u.arms * Q)`,
          caption: 'The hinges of the net. At a quarter turn every cube lies in the hyperplane $w = -1$, which is our space.',
        },
        {
          type: 'p',
          text: 'Two practical details. A cube swinging through the fourth dimension can pass close to the four-dimensional eye, where the perspective factor of equation (3) blows up; so the carrier cube swings first, and the eye backs away from $L = 3$ to $L = 9$ as the net opens, with the drawing scale corrected so the finished cross keeps its size. And once the net is fully open its 34 outer faces are drawn as solids, sorted far to near (the painter’s algorithm) and shaded flat by the angle each makes with a light from the upper left, with a fine hatch on the faces turned from it. The fourteen faces that became hinges are inside the cross and are skipped.',
        },
        {
          type: 'p',
          text: 'With sound on, each slide of chapter I plays a note a step higher in a D major pentatonic scale, the four directions sound together as a chord, each quarter turn in the XW plane chimes as the inner and outer cubes trade places, and each hinge clicks as it closes.',
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
            '**I · Dimensions (0–20 s).** A point, then four slides. Coloured edges are the ones the current slide creates; hatching shows what it sweeps. The table at the left fills in the counts of equation (1); the label under the figure names the step. At the end all four directions light up at once, with the axis key: X, Y and Z as arrows, W dashed, at right angles to all three.',
            '**II · Shadow (20–42 s).** The tesseract turns in XW and YW. The fern edges are the eight that run in the W direction. The matrix at the left is the current rotation, its W row and column in fern. Top right, the two angles.',
            '**III · Slices (42–66 s).** Left, Flatland: a plane, and a sphere or cube passing down through it, with its slice in moss. Right, Spaceland: the slice of a hypersphere or tesseract by our space. The ruler at the right shows where the slice is along the fourth direction, with the object’s extent as a moss bar.',
            '**IV · Unfolding (66–88 s).** The eight cubes hinge open into Dalí’s cross, stand, fold up again, and the tesseract collapses back through the cube, square and line to a point, the first frame.',
            '**The 3D / 4D switch** (bottom right, or above the caption on narrow screens) shows which kind of turn a drag makes.',
            '**Bottom ruler.** The 88-second timeline with the four chapter numerals; tap it to jump.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: the moment in chapter I when the cube’s copy slides into the fourth direction and, instead of moving sideways, shrinks inward; the inner cube in chapter II pushing out through a face of the outer one; and in chapter III, the halfway point, when the triangle on the left has become a regular hexagon at exactly the moment the shape on the right is a regular octahedron.',
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
            '**One projection among many.** Perspective from a point on the $w$ axis is the classic choice, but there are others (orthographic, or from a corner), each with its own shadow. None is more “correct”.',
            '**The slices are synchronized by time, not by geometry.** The two panels of chapter III share a clock, so the hexagon and the octahedron arrive together; their other transitions do not line up exactly.',
            '**The net’s motion is one choice.** The hinge order and timing are chosen to read clearly; every path that ends in the same net is equally valid. The 4D eye also backs away during the unfolding, which changes the perspective while it happens.',
            '**Depth cues are a convention.** Darker edges are nearer in 3D and larger in the 4D projection; a real four-dimensional observer would see the tesseract’s full three-dimensional surface at once, which no drawing can show.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Flatland: A Romance of Many Dimensions', by: 'Edwin A. Abbott', year: '1884', note: 'Short, funny and still the best introduction.' },
    { title: 'A New Era of Thought', by: 'Charles Howard Hinton', year: '1888', note: 'Where the word *tesseract* first appears, with Hinton’s training cubes.' },
    { title: 'The Fourth Dimension', by: 'Charles Howard Hinton', year: '1904' },
    { title: 'Theorie der vielfachen Kontinuität', by: 'Ludwig Schläfli', year: '1901', note: 'Written 1850–52; the regular polytopes in every dimension.' },
    { title: 'On certain series of sections of the regular four-dimensional hypersolids', by: 'Alicia Boole Stott', year: '1900', note: 'The three-dimensional slices of all six regular 4D polytopes.' },
    { title: 'Regular Polytopes', by: 'H. S. M. Coxeter', year: '1948', note: 'The standard reference; Dover reprint.' },
    { title: 'Beyond the Third Dimension: Geometry, Computer Graphics, and Higher Dimensions', by: 'Thomas F. Banchoff', year: '1990', note: 'By a pioneer of hypercube animation.' },
    { title: 'Unfolding the tesseract', by: 'Peter D. Turney', year: '1984', note: '*Journal of Recreational Mathematics* 17. The 261 nets.' },
    { title: 'The Fourth Dimension and Non-Euclidean Geometry in Modern Art', by: 'Linda Dalrymple Henderson', year: '1983', note: 'Revised edition, MIT Press, 2013.' },
    { title: 'Crucifixion (Corpus Hypercubus)', by: 'Salvador Dalí', year: '1954', note: 'Oil on canvas, The Metropolitan Museum of Art, New York.' },
  ],
}

export default guide
