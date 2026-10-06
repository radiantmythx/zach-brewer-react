import type { Guide } from '../guide'

const parallelogram = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g opacity="0.35"><circle cx="70" cy="150" r="26"/><circle cx="240" cy="150" r="26"/><ellipse cx="155" cy="52" rx="120" ry="18"/></g>
<path d="M70 150 L70 56" stroke-width="1.4"/><path d="M66 64 L70 54 L74 64" stroke-width="1.2"/>
<path d="M240 150 L240 56" stroke-dasharray="4 3" stroke-width="1.4"/><path d="M236 64 L240 54 L244 64" stroke-width="1.2"/>
<path d="M70 150 L240 150 M70 52 L240 52" stroke-dasharray="2 4" opacity="0.6"/>
<g fill="currentColor" stroke="none"><circle cx="70" cy="150" r="3"/><circle cx="70" cy="52" r="3"/><circle cx="240" cy="150" r="3"/><circle cx="244" cy="49" r="3" fill="#9DB9A0"/></g>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1">
<text x="78" y="166">WATER</text><text x="248" y="166">SKY</text><text x="78" y="46">HERON</text><text x="280" y="53" fill="#3F7A55">SWIFT</text>
<text x="56" y="104">v</text><text x="250" y="104">+ v</text><text x="122" y="190" opacity="0.7">RIVERS · WEATHER</text><text x="128" y="26" opacity="0.7">BIRDS</text></g>
</svg>`

const guide: Guide = {
  lede:
    'A thousand words laid out as points in space, where nearness stands for likeness. Watch k-means find the groups, a query find its neighbours, and a little vector arithmetic carry *heron* from the water to the sky.',
  facts: [
    ['Points', '1,000 tokens (400 in the preview)'],
    ['Groups', 'Rivers, weather, birds, instruments, colours'],
    ['Clustering', 'Lloyd’s k-means, $k = 5$, k-means++ seeding, 11 iterations'],
    ['Similarity', 'Cosine, measured from the mean of the cloud'],
    ['Query', '*heron*, five nearest neighbours'],
    ['Analogy', 'heron − water + sky ≈ swift'],
    ['Camera', 'Perspective, one full turn per loop'],
    ['Loop', '24 s, in five phases'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Meaning as geometry',
      blocks: [
        {
          type: 'p',
          text: 'Computers do not read; they count. Every system that seems to understand language rests on some way of turning words into numbers, and the most fruitful idea of the past seventy years is that a word can be described by the company it keeps. Words that turn up in the same kinds of sentences tend to mean similar things. *Heron* and *egret* appear beside *marsh*, *wading*, *reeds* and *fish*; *cello* and *viola* appear beside *bow*, *string* and *quartet*. If you record those habits as a long list of numbers, one list per word, then similar words end up with similar lists — and a list of numbers is a point in space.',
        },
        {
          type: 'quote',
          text: 'You shall know a word by the company it keeps!',
          cite: 'J. R. Firth, 1957',
        },
        {
          type: 'p',
          text: 'The linguist Zellig Harris had made the same argument in 1954 under the name *distributional structure*, and Firth’s line became its slogan. For decades it was a research programme more than a technology. Information-retrieval researchers built huge tables of word–document counts and compressed them with linear algebra: **latent semantic analysis** (Deerwester and colleagues, 1990) used a singular-value decomposition to squeeze tens of thousands of documents into a few hundred dimensions, and found that synonyms landed near one another even when they never appeared in the same document. The word *latent* is the important one. The dimensions of the compressed space are not labelled by anyone; they are hidden variables the method discovers because they explain the counts.',
        },
        {
          type: 'p',
          text: 'Neural networks turned the idea into an engine. In 2003 Yoshua Bengio and colleagues trained a network to predict the next word and let it learn a *feature vector* for every word along the way. In 2013 Tomáš Mikolov and colleagues at Google released **word2vec**, two very small, very fast models — skip-gram and continuous bag-of-words — trained on billions of words. The vectors they produced had a property almost nobody expected: directions in the space carried meaning. The offset from *man* to *woman* was roughly the offset from *king* to *queen*, so that the arithmetic $\\vec{king} - \\vec{man} + \\vec{woman}$ landed closest to $\\vec{queen}$. GloVe (Pennington, Socher and Manning, 2014) reached similar geometry from global co-occurrence statistics.',
        },
        {
          type: 'p',
          text: 'Today every large language model begins with an embedding table: each token in its vocabulary is looked up as a vector of several hundred to several thousand numbers before any attention or reasoning happens. The same trick has spread far beyond words. Images, songs, products, proteins and people’s listening histories are all embedded, and the everyday machinery of search, recommendation and retrieval is, at heart, the question this piece asks in its fourth phase: *which points are nearest to this one?*',
        },
        {
          type: 'h',
          text: 'Why look at it in three dimensions',
        },
        {
          type: 'p',
          text: 'A real embedding space has hundreds of axes, and none of our intuitions about distance survive the trip intact — in high dimensions almost every pair of random points is nearly the same distance apart, and almost every pair of random directions is nearly at right angles. Visualizations therefore always project: principal component analysis keeps the directions of greatest variance, t-SNE (van der Maaten and Hinton, 2008) and UMAP (McInnes, Healy and Melville, 2018) try to keep neighbourhoods intact at the cost of global distances. This piece goes one step further and draws a space that was *designed* in three dimensions, so that the clusters, neighbours and the analogy all read cleanly from a slowly turning camera. It is a diagram of how embeddings behave, not a map of a real one — the section on liberties says exactly where it departs.',
        },
        {
          type: 'h',
          text: 'Finding the groups',
        },
        {
          type: 'p',
          text: 'Once words are points, a natural next question is where the clumps are. **k-means** is the oldest and still the most widely used answer. Hugo Steinhaus described the idea in 1956; Stuart Lloyd devised the standard iteration at Bell Labs in 1957 as a way to quantize signals (it circulated as a report and was published only in 1982); James MacQueen named it *k-means* in 1967. The algorithm is disarmingly simple: guess $k$ centres, give every point to its nearest centre, move each centre to the average of its points, and repeat until nothing changes. It is fast, it is easy to reason about, and it is the first thing most people reach for when they want to know what kinds of thing are in a pile of vectors.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Distances, angles and centres',
      blocks: [
        {
          type: 'h',
          text: 'Cosine similarity',
        },
        {
          type: 'p',
          text: 'Embeddings are usually compared by the angle between them rather than the distance, because the length of a word vector tends to track how often the word occurs rather than what it means. For two vectors $\\mathbf{a}$ and $\\mathbf{b}$ the cosine similarity is',
        },
        {
          type: 'math',
          tex: String.raw`\cos\theta = \frac{\mathbf{a} \cdot \mathbf{b}}{|\mathbf{a}| \, |\mathbf{b}|} = \frac{\sum_j a_j b_j}{\sqrt{\sum_j a_j^2} \, \sqrt{\sum_j b_j^2}}`,
          label: '(1)',
          caption: 'One for vectors pointing the same way, zero at right angles, minus one for opposites.',
        },
        {
          type: 'p',
          text: 'In this piece every vector is first measured from the mean of the whole cloud, $\\mathbf{a} = \\mathbf{x}_a - \\bar{\\mathbf{x}}$. Without that centring, a three-dimensional cloud sitting off to one side of the origin would make every pair of points look alike. (Real embedding pipelines often do the same, subtracting a common mean direction before comparing.)',
        },
        {
          type: 'h',
          text: 'The k-means objective',
        },
        {
          type: 'p',
          text: 'Given points $\\mathbf{x}_1, \\ldots, \\mathbf{x}_N$ and $k$ centres $\\mu_1, \\ldots, \\mu_k$, write $c(i)$ for the centre that point $i$ is assigned to. k-means looks for the assignment and centres that minimise the **inertia** — the total squared distance from each point to its centre:',
        },
        {
          type: 'math',
          tex: String.raw`J = \sum_{i=1}^{N} |\mathbf{x}_i - \mu_{c(i)}|^2`,
          label: '(2)',
        },
        {
          type: 'p',
          text: 'Lloyd’s iteration alternates two steps, each of which can only lower $J$. The *assignment step* fixes the centres and gives every point to its nearest one; the *update step* fixes the assignments and moves each centre to the mean of its points, which is exactly the position that minimises the sum of squared distances to them:',
        },
        {
          type: 'math',
          tex: String.raw`c(i) \leftarrow \arg\min_{q} |\mathbf{x}_i - \mu_q|^2 \qquad \mu_q \leftarrow \frac{1}{|S_q|} \sum_{i \in S_q} \mathbf{x}_i`,
          label: '(3)',
          caption: '$S_q$ is the set of points currently assigned to centre $q$.',
        },
        {
          type: 'p',
          text: 'Because $J$ never rises and there are only finitely many ways to assign the points, the iteration always stops. What it stops at is a *local* minimum: a bad start can leave two centres sharing one group while another group is split. Finding the true minimum is NP-hard in general, so in practice people run k-means from several starts and keep the best. **k-means++** (Arthur and Vassilvitskii, 2007) makes the start much better: pick the first centre at random, then pick each next one with probability proportional to its squared distance from the nearest centre already chosen. Far-flung points are likely picks, so the initial centres spread out, and the expected result is provably within a factor of $O(\\log k)$ of optimal.',
        },
        {
          type: 'h',
          text: 'Nearest neighbours and analogies',
        },
        {
          type: 'p',
          text: 'The *k nearest neighbours* of a query word are simply the vocabulary words with the highest cosine similarity to it — a sort and a slice. The analogy is the same search with a constructed query. To answer “water is to heron as sky is to what?”, form',
        },
        {
          type: 'math',
          tex: String.raw`\mathbf{r} = \mathbf{x}_{heron} - \mathbf{x}_{water} + \mathbf{x}_{sky}, \qquad \hat{w} = \arg\max_{w \notin \{heron,\, water,\, sky\}} \cos(\mathbf{r}, \mathbf{x}_w)`,
          label: '(4)',
        },
        {
          type: 'p',
          text: 'Read it as a parallelogram. The vector $\\mathbf{v} = \\mathbf{x}_{heron} - \\mathbf{x}_{water}$ is “the step from a watery thing to the bird that lives there”. Adding $\\mathbf{v}$ to *sky* takes the same step from a different starting point, and the word waiting at the far corner is the answer. Excluding the three input words matters: in real embeddings the nearest word to $\\mathbf{r}$ is very often one of the inputs, and the standard analogy evaluations quietly remove them — a convention later critiques pointed out can flatter the results.',
        },
        {
          type: 'figure',
          svg: parallelogram,
          alt: 'A parallelogram: an arrow v from water up to heron, the same arrow from sky landing on swift, with the rivers and weather groups below and the band of birds above.',
          caption: 'The analogy as the piece draws it: the same vector $\\mathbf{v}$ taken from *water* and from *sky*.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'An authored space, a real algorithm',
      blocks: [
        {
          type: 'p',
          text: 'The piece has two halves that are honest in different ways. The *space* is authored: five groups placed by hand in a cube from −1 to 1, with 37 named words set at chosen offsets so the neighbours and the analogy read clearly. The *clustering* is real: k-means runs, at start-up, on the very positions the points will have on screen, and the piece then plays back what it did, iteration by iteration.',
        },
        {
          type: 'h',
          text: 'Points as a function of time',
        },
        {
          type: 'p',
          text: 'Each point has two homes: a *scattered* position drawn from a wide Gaussian, and a *target* inside its group (a Gaussian blob, or for the birds a long thin band). Where a point is at any moment is a pure function of the loop time $\\tau$ — there is no simulation state at all, which is what lets k-means be computed ahead of time and lets any frame be reproduced exactly. Each point also has its own small delay, so the cloud settles like a crowd finding its seats rather than all at once:',
        },
        {
          type: 'code',
          code: `function posAt(i: number, tau: number, out: Float32Array, o: number) {
  const e = ease.inOutCubic(clamp((tau - 1.2 - delay[i] * 1.4) / 7.2))
  const rel = ease.inOutCubic(clamp((tau - 21.8 - delay[i] * 0.3) / 1.85))
  const tight = 1 - 0.24 * smoothstep(10.4, 12.6, tau)
  const c = centreOf[truth[i]]
  for (let j = 0; j < 3; j++) {
    const t = c[j] + (tx[i * 3 + j] - c[j]) * (word[i] ? 1 : tight)
    const v = lerp(sx[i * 3 + j], t, e)
    out[o + j] = lerp(v, sx[i * 3 + j], rel)
  }
}`,
          caption: 'Scatter → target over about seven seconds, a gentle tightening of each group, and the release back to scatter at the end of the loop. Named words never tighten, so the analogy stays exact.',
        },
        {
          type: 'h',
          text: 'k-means, ahead of time',
        },
        {
          type: 'p',
          text: 'At start-up the piece seeds five centres with k-means++ using the positions at $\\tau = 3$ s, then runs eleven Lloyd iterations, each on the data *as it will be* at that iteration’s moment on screen (one every 0.7 s). It stores every assignment (one byte per point per iteration), every set of centres, the inertia and the largest centre shift. If the final grouping does not match the five authored groups one-to-one with at least 95% purity, it tries another seed, up to forty times; in practice the first seed or two succeed. The core of each iteration is the textbook loop:',
        },
        {
          type: 'code',
          code: `for (let i = 0; i < N; i++) {
  let best = Infinity
  let bk = 0
  for (let q = 0; q < K; q++) {
    const dx = tmp[i * 3] - cent[c0 + q * 3]
    const dy = tmp[i * 3 + 1] - cent[c0 + q * 3 + 1]
    const dz = tmp[i * 3 + 2] - cent[c0 + q * 3 + 2]
    const d = dx * dx + dy * dy + dz * dz
    if (d < best) {
      best = d
      bk = q
    }
  }
  assign[it * N + i] = bk
  J += best
  counts[bk]++
  for (let j = 0; j < 3; j++) sums[bk * 3 + j] += tmp[i * 3 + j]
}`,
          caption: 'The assignment step, accumulating the inertia $J$ and the sums for the update step in the same pass.',
        },
        {
          type: 'p',
          text: 'Playback is then cheap. In each 0.7-second iteration the points first switch colour to their new centre — each after its own short delay, so the change ripples through the cloud — and then the centres glide to their new means along an eased path. In the first iterations every point also throws a faint hairline to its centre, a spoke diagram of the assignment step. Those spokes, a thousand lines in five colours, are drawn as five paths per frame.',
        },
        {
          type: 'h',
          text: 'The camera',
        },
        {
          type: 'p',
          text: 'The plot is projected with a simple pinhole camera: rotate by a yaw about the vertical axis and a pitch about the horizontal, then divide by depth. Dots are drawn in three depth bands, larger and brighter in front, which is most of what makes the cloud feel solid. The yaw follows a speed profile — brisk while k-means runs, almost still while there is text to read — and the profile is integrated in closed form so that each loop makes *exactly* one full turn and every phase is seen from the same, composed angle:',
        },
        {
          type: 'code',
          code: `// one full turn per loop: brisk while k-means runs, nearly still while there is reading to do
const S_SLOW = 0.05
const SPAN = (x: number) => ssInt(11.2, 12.6, x) - ssInt(21, 22.4, x)
const S_FAST = (TAU - S_SLOW * SPAN(LOOP)) / (LOOP - SPAN(LOOP))
const yawF = (x: number) => S_FAST * x - (S_FAST - S_SLOW) * SPAN(x)
const YAW0 = 0.32 - yawF(19)`,
          caption: '`ssInt` is the integral of a smoothstep. Solving for the fast speed makes the loop close; `YAW0` aims the camera at the analogy’s parallelogram at nineteen seconds.',
        },
        {
          type: 'p',
          text: 'When you drag, a yaw and pitch offset is added on top. While you hold, the offset follows the pointer; when you let go it keeps a little of your fling and decays, and after a couple of idle seconds it eases back to zero, so the scripted views return on their own.',
        },
        {
          type: 'h',
          text: 'Labels that keep out of each other’s way',
        },
        {
          type: 'p',
          text: 'Group labels sit in two columns beside the plot, each joined to its centre by a leader line with an elbow. Every frame, labels on each side are sorted by the height of their centres and pushed apart until no two are closer than a line and a half; the stack is then clamped to the frame and relaxed back from the edges. On tall screens the columns become rows above and below. The query table, the iteration counter and the caption all condense or drop out on short or narrow screens.',
        },
        {
          type: 'h',
          text: 'Cost',
        },
        {
          type: 'p',
          text: 'The work per frame is small: a thousand position evaluations, a thousand projections, about thirty filled paths for the dots, and a handful of strokes. k-means costs a few milliseconds once, at start-up. The piece is comfortably under a millisecond of script per frame at full size.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Five phases, twenty-four seconds',
      blocks: [
        {
          type: 'table',
          head: ['Time', 'Phase', 'What happens'],
          rows: [
            ['0–3 s', '01 Scatter', 'A thousand points, unsorted, inside the plot box; the faint back walls and floor of the box draw on.'],
            ['3–11 s', '02 k-means', 'Five registration marks ($\\mu_1 \\ldots \\mu_5$) appear; each 0.7 s the points re-colour and the marks glide, leaving dotted trails. Spokes flash in the early iterations.'],
            ['11–13 s', '03 Clusters', 'Iteration 11 reads *converged*; groups tighten and their serif labels arrive on leader lines, with member counts.'],
            ['13–17 s', '04 Nearest', '*heron* flies down from the heading, lands, and draws lines to its nearest neighbours; the table lists them with cosine similarities.'],
            ['17–21.6 s', '05 Analogy', 'An arrow from *water* to *heron*, the same arrow (dashed) from *sky*, the parallelogram’s other sides dotted, and a registration mark landing on *swift*.'],
            ['21.6–24 s', 'Release', 'Annotation undraws, colours drain from the points and the cloud scatters, ready to start again.'],
          ],
        },
        {
          type: 'h',
          text: 'The readouts',
        },
        {
          type: 'list',
          items: [
            '**ITERATION** — which Lloyd iteration is playing, then *converged* once the assignments stop changing.',
            '**INERTIA** — the objective $J$ from equation (2) after that iteration’s assignment step, in the plot’s units. It falls steeply, then flattens.',
            '**MAX Δμ** — the farthest any centre moved in that iteration’s update step. It shrinks towards zero as k-means settles.',
            '**METRIC** — similarity is cosine, measured in this three-dimensional projection.',
            '**n** under each label — how many of the thousand points the final clustering gave that group.',
            '**cos** in the table and beside *swift* — equation (1) between the query (or the analogy vector) and that word.',
          ],
        },
        {
          type: 'h',
          text: 'Colour',
        },
        {
          type: 'p',
          text: 'Unassigned points are paper-white. After assignment each point takes its centre’s colour: lagoon for rivers, sky blue for weather, fern for birds, sage for instruments — and the colours group wears the whole palette, one accent per point, because it seemed unfair to give it only one. Annotation that belongs to a query or the analogy is drawn in paper-white hairlines so it sits above the data rather than among it.',
        },
        {
          type: 'aside',
          title: 'Try this',
          text: 'Drag during the analogy and orbit the parallelogram edge-on. The four corners stay in one flat plane because the vector really is the same in both places — the figure is not a trick of the viewing angle.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is real and what is staged',
      blocks: [
        {
          type: 'list',
          items: [
            '**The space is invented.** No language model produced these coordinates. The five groups and the 37 named words were placed by hand in three dimensions so the story reads clearly. A real embedding has hundreds of dimensions and is far messier: groups overlap, sizes and densities vary wildly, and a three-dimensional projection would scramble most neighbourhoods.',
            '**The analogy is guaranteed.** *Swift* was placed almost exactly at sky + (heron − water). In real embeddings analogies like king − man + woman ≈ queen hold for a useful minority of cases, depend on excluding the input words, and can encode the biases of the text they were trained on (Bolukbasi and colleagues, 2016, is the well-known study).',
            '**Only named words are searched.** Neighbours and the analogy are found among the 37 named words, not all thousand points; the other points are anonymous tokens that give the groups their mass.',
            '**k-means is real, but the data moves under it.** Each iteration runs on the positions at its own moment while the embedding is still settling, so the inertia can occasionally tick up between iterations. On fixed data Lloyd’s iteration never increases it.',
            '**Cosine in three dimensions is a blunt instrument.** With only three axes, centred cosine mostly measures direction from the middle of the cloud. It is enough to rank the authored neighbours sensibly; it is not how similarity behaves in a real high-dimensional space.',
            '**The camera is choreographed.** The turn speed, the dwell during reading and the exact angle at the analogy were all chosen for legibility.',
          ],
        },
      ],
    },
  ],
  interact: {
    gestures: [
      { gesture: 'drag', action: 'Orbit the plot. Let go and it drifts back to the scripted camera.' },
      { gesture: 'move', action: 'Hover a point to read its word, index and group.' },
    ],
    tip: 'Orbit the analogy edge-on: the parallelogram is flat in three dimensions, not an accident of the view.',
  },
  further: [
    { title: 'Distributional Structure', by: 'Zellig S. Harris', year: '1954', note: 'The distributional hypothesis, in *Word*.' },
    { title: 'A Synopsis of Linguistic Theory, 1930–1955', by: 'J. R. Firth', year: '1957', note: 'The source of “the company it keeps”.' },
    { title: 'Indexing by Latent Semantic Analysis', by: 'Scott Deerwester, Susan Dumais, George Furnas, Thomas Landauer, Richard Harshman', year: '1990' },
    { title: 'A Neural Probabilistic Language Model', by: 'Yoshua Bengio, Réjean Ducharme, Pascal Vincent, Christian Jauvin', year: '2003' },
    { title: 'Efficient Estimation of Word Representations in Vector Space', by: 'Tomáš Mikolov, Kai Chen, Greg Corrado, Jeffrey Dean', year: '2013', note: 'word2vec.' },
    { title: 'Linguistic Regularities in Continuous Space Word Representations', by: 'Tomáš Mikolov, Wen-tau Yih, Geoffrey Zweig', year: '2013', note: 'The king − man + woman analogy.' },
    { title: 'GloVe: Global Vectors for Word Representation', by: 'Jeffrey Pennington, Richard Socher, Christopher D. Manning', year: '2014' },
    { title: 'Least Squares Quantization in PCM', by: 'Stuart P. Lloyd', year: '1982', note: 'The standard k-means iteration, written in 1957.' },
    { title: 'k-means++: The Advantages of Careful Seeding', by: 'David Arthur, Sergei Vassilvitskii', year: '2007' },
    { title: 'Man is to Computer Programmer as Woman is to Homemaker? Debiasing Word Embeddings', by: 'Tolga Bolukbasi, Kai-Wei Chang, James Zou, Venkatesh Saligrama, Adam Kalai', year: '2016' },
    { title: 'Visualizing Data using t-SNE', by: 'Laurens van der Maaten, Geoffrey Hinton', year: '2008' },
  ],
}

export default guide
