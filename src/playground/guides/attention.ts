import type { Guide } from '../guide'

/*
 * Notes for motion/attention — FIG. M.01, multi-head self-attention.
 */

const pipeline = `<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, Menlo, monospace" font-size="8" letter-spacing="0.8">
<g opacity="0.75"><rect x="10" y="20" width="44" height="22"/><rect x="10" y="62" width="44" height="22"/><rect x="10" y="104" width="44" height="22"/></g>
<g fill="currentColor" stroke="none"><text x="18" y="34">x W_q</text><text x="18" y="76">x W_k</text><text x="18" y="118">x W_v</text>
<text x="66" y="16">q · k / √d_k</text><text x="150" y="16">softmax</text><text x="232" y="16">Σ a v</text>
<text x="10" y="144" opacity="0.7">ONE QUERY, FOURTEEN KEYS, ONE HEAD</text></g>
<path d="M54 31H70M54 73H70M70 31V73M70 52H86"/>
<g stroke-opacity="0.5"><path d="M90 30V74M98 30V74M106 30V74M114 30V74M122 30V74"/></g>
<path d="M90 60h4M98 44h4M106 66h4M114 38h4M122 56h4" stroke-width="2"/>
<path d="M130 52H146M142 49l4 3-4 3"/>
<g stroke="#1F8A86"><path d="M152 72V68M160 72V70M168 72V40M176 72V66M184 72V69M192 72V71M200 72V64" stroke-width="3"/></g>
<path d="M150 72.5H204" stroke-opacity="0.5"/>
<path d="M208 52H224M220 49l4 3-4 3"/>
<path d="M54 115H240V64" stroke-opacity="0.6" stroke-dasharray="2 3"/>
<circle cx="240" cy="52" r="10"/><path d="M234 52H246M240 46V58" stroke-opacity="0.6"/>
<path d="M250 52H300M296 49l4 3-4 3"/>
<g fill="currentColor" stroke="none"><text x="262" y="46">out</text></g>
</svg>`

const guide: Guide = {
  lede:
    'One sentence, read four ways at once. Each word asks a question of every other word, and the answers — real softmax weights, drawn as arcs — show a machine working out that “it” means the trophy.',
  facts: [
    ['Model', 'Scaled dot-product self-attention, after Vaswani et al., 2017'],
    ['Sentence', '“The trophy didn’t fit in the suitcase because it was too big.” — 14 tokens'],
    ['Heads', '4: previous token, coreference, syntax, broad'],
    ['Widths', 'Embedding $d = 16$, query and key $d_k = 8$'],
    ['Weights', '4 × 14 × 14 = 784, each row a softmax summing to 1'],
    ['Projections', 'Fixed seeded random $W_q$, $W_k$ plus a per-head bias'],
    ['Loop', '23 s: set, tokenize, four sweeps, all heads, release'],
    ['Ground', 'Paper'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Every word looks at every other word',
      blocks: [
        {
          type: 'p',
          text: 'Read the sentence in the figure and you resolve it without noticing: *the trophy didn’t fit in the suitcase because it was too big*. “It” is the trophy. Change one word — *because it was too small* — and “it” becomes the suitcase. Nothing in the grammar decides this. You decide it from what you know about trophies, suitcases and the meaning of *fit*. Sentences like this one are called *Winograd schemas*, after the computer scientist Terry Winograd, who used a similar pair in 1972 to show how much world knowledge ordinary reading takes. In 2012 Hector Levesque, Ernest Davis and Leora Morgenstern proposed a whole test built from them, the Winograd Schema Challenge, as a sturdier alternative to the Turing test. The trophy and the suitcase are their example.',
        },
        {
          type: 'p',
          text: 'A language model has to do the same thing with arithmetic. The mechanism that lets it, and the one this piece draws, is **attention**: for each word, the model computes how relevant every other word is, turns those relevances into weights that sum to one, and builds a new representation of the word as a weighted mixture of the others. When the model processes “it”, attention is how information about “trophy” — eight words back — arrives at “it” and changes what it means.',
        },
        {
          type: 'h',
          text: 'From alignment to attention',
        },
        {
          type: 'p',
          text: 'The idea came out of machine translation. Around 2014 the best translators were *encoder–decoder* recurrent networks: one network read the source sentence word by word and compressed it into a single fixed-length vector; a second network unspooled that vector into the target language. Long sentences suffered, because everything had to squeeze through the one vector. Dzmitry Bahdanau, Kyunghyun Cho and Yoshua Bengio proposed letting the decoder look back at *all* of the encoder’s states each time it produced a word, scoring each one for relevance and taking a weighted average. They called it learning to *align* and translate; the weights were soon called attention. Minh-Thang Luong, Hieu Pham and Christopher Manning simplified the scoring in 2015, including the plain dot product used here.',
        },
        {
          type: 'p',
          text: 'In 2017 a team at Google — Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan Gomez, Łukasz Kaiser and Illia Polosukhin — took the next step in a paper whose title became a slogan: *Attention Is All You Need*. They removed the recurrence entirely. In their **Transformer**, every word attends to every word of its own sentence (*self*-attention), all at once and in parallel, and stacking a few such layers with small feed-forward networks between them was enough to beat the recurrent translators while training far faster on GPUs. They also split attention into several **heads**, each with its own projections, so that one layer can look for several kinds of relationship at the same time. Nearly every large language model since — BERT, the GPT series, and their descendants — is a stack of these layers.',
        },
        {
          type: 'h',
          text: 'What heads learn',
        },
        {
          type: 'p',
          text: 'Nobody tells a head what to look for; the patterns emerge from training on text. When researchers opened trained models up, they found recognizable specialists. Kevin Clark, Urvashi Khandelwal, Omer Levy and Christopher Manning, studying BERT in 2019, found heads that attend almost entirely to the previous or the next token, heads that attend broadly across the sentence, heads that track particular syntactic relations (a verb finding its object, a determiner finding its noun), and a head that does remarkably well at coreference — linking a pronoun to the noun it stands for. Elena Voita and colleagues found the same year that a translation model’s most important heads were positional, syntactic, or attentive to rare words, and that many of the rest could be pruned with little loss. Later work on *induction heads* by Catherine Olsson, Nelson Elhage and colleagues showed previous-token heads composing with later heads to copy patterns from earlier in the context.',
        },
        {
          type: 'p',
          text: 'The four heads in the piece are drawn from that catalogue: a **previous-token head** (H1, ocean), a **coreference head** (H2, lagoon), a **syntax head** (H3, moss) and a **broad head** (H4, fern) that spreads its weight thinly over everything. They are idealized portraits rather than heads extracted from a real model — more on that under *Liberties taken*.',
        },
        {
          type: 'aside',
          title: 'A caution about reading attention',
          text: 'Attention weights are seductive because they look like explanations: an arc from “it” to “trophy” reads as “the model thinks it is the trophy”. Sarthak Jain and Byron Wallace argued in 2019 that attention is not, by itself, an explanation — different weights can yield the same output — and Sarah Wiegreffe and Yuval Pinter replied that it can be under some conditions. Both are right in their way. In a real model the weights say where information *could* flow in one layer; what the model does with it depends on the value vectors, the other heads and every later layer.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Queries, keys and a softmax',
      blocks: [
        {
          type: 'p',
          text: 'Write the sentence as $n$ token vectors, stacked as the rows of a matrix $X \\in \\mathbb{R}^{n \\times d}$. Each row is the token’s *embedding* — a learned vector for its identity — plus a vector encoding its *position*, since attention by itself has no notion of word order. Each head multiplies $X$ by three matrices of its own to get *queries*, *keys* and *values*:',
        },
        { type: 'math', tex: String.raw`Q = X W_q, \quad K = X W_k, \quad V = X W_v, \qquad W_q, W_k \in \mathbb{R}^{d \times d_k}`, label: '(1)' },
        {
          type: 'p',
          text: 'Row $i$ of $Q$, the query $q_i$, is what token $i$ is looking for; row $j$ of $K$, the key $k_j$, is what token $j$ offers. Their dot product $q_i \\cdot k_j$ scores the match. Scaling by $\\sqrt{d_k}$ and applying a softmax across each row turns scores into weights:',
        },
        { type: 'math', tex: String.raw`a_{ij} = \frac{\exp(q_i \cdot k_j / \sqrt{d_k})}{\sum_{m=1}^{n} \exp(q_i \cdot k_m / \sqrt{d_k})}, \qquad \sum_{j} a_{ij} = 1`, label: '(2)' },
        {
          type: 'p',
          text: 'The head’s output for token $i$ is the weighted mixture of values, $\\sum_j a_{ij} v_j$. Written for all tokens at once, this is the formula set at the top left of the figure:',
        },
        { type: 'math', tex: String.raw`\operatorname{Attention}(Q, K, V) = \operatorname{softmax} ( \frac{QK^{T}}{\sqrt{d_k}} ) \, V`, label: '(3)' },
        { type: 'figure', svg: pipeline, alt: 'A diagram: the input is projected three ways; queries and keys are compared by dot products, scaled, passed through a softmax into weights, and the weights mix the values into the output.', caption: 'One head, one query. Scores $q \\cdot k / \\sqrt{d_k}$ for each key become a softmax distribution, which mixes the values. The piece draws the middle of this picture — the weights — as arcs.' },
        {
          type: 'h',
          text: 'Why divide by √d_k',
        },
        {
          type: 'p',
          text: 'If the components of $q$ and $k$ are independent with mean 0 and variance 1, their dot product is a sum of $d_k$ such products and has variance $d_k$. For a large $d_k$ the scores spread wide, the softmax saturates — one weight near 1, the rest near 0 — and its gradients become tiny, which makes learning slow. Dividing by $\\sqrt{d_k}$ restores unit variance. Vaswani and colleagues gave exactly this argument for the scaling; it is why the formula is called *scaled* dot-product attention.',
        },
        {
          type: 'h',
          text: 'Softmax, temperature and entropy',
        },
        {
          type: 'p',
          text: 'The softmax is unchanged by adding a constant to every score in a row, so only differences between scores matter. Multiplying all scores by a factor sharpens (factor > 1) or flattens (< 1) the distribution, like the temperature of a Boltzmann distribution. A useful single number for how focused a row is, is its **entropy**:',
        },
        { type: 'math', tex: String.raw`H_i = -\sum_{j} a_{ij} \ln a_{ij}, \qquad 0 \leq H_i \leq \ln n`, label: '(4)' },
        {
          type: 'p',
          text: 'It is 0 when all the weight sits on one key and $\\ln n$ — $\\ln 14 \\approx 2.64$ nats here — when it is spread evenly. The readout shows it for the current query: the previous-token head’s rows sit well under 1 nat; the broad head’s rows sit near the maximum.',
        },
        {
          type: 'h',
          text: 'Many heads',
        },
        {
          type: 'p',
          text: 'With $h$ heads, each with its own $W_q$, $W_k$, $W_v$ of width $d_k = d / h$, the outputs are concatenated and multiplied by one more matrix $W_o$. The total cost is about the same as one wide head, but each head computes its own weight matrix — its own $n \\times n$ pattern — so one layer can track adjacency, reference and syntax at once. Those four $n \\times n$ matrices are what assemble along the bottom of the figure.',
        },
        {
          type: 'aside',
          title: 'Encoders and decoders',
          text: 'In a translation encoder or a model like BERT every token may attend to every other, before and after it — as in this piece, where arcs reach forward as well as back. A GPT-style decoder, which generates text left to right, adds a *causal mask* that sets $a_{ij} = 0$ for $j > i$, so a word can only look at the words before it. Its weight matrices are lower-triangular.',
        },
      ],
    },
    {
      id: 'how-it-works',
      kicker: 'How the piece works',
      title: 'Real arithmetic, a guided story',
      blocks: [
        {
          type: 'p',
          text: 'Everything is computed once, when the piece starts, in `computeAttention()`. Each token gets a 16-dimensional embedding: Gaussian noise from a random generator seeded with the token’s id (so “the” always gets the same vector), scaled by 0.8, plus the sinusoidal position encoding of Vaswani et al. at half strength. Each head draws its own $W_q$ and $W_k$ — 16 × 8 matrices of Gaussian entries divided by $\\sqrt{16}$ — from a second seeded generator, projects every token, and takes all 196 dot products.',
        },
        {
          type: 'p',
          text: 'Random projections give random attention, which would make a truthful but meaningless drawing. So each head adds a **bias** to the scores before the softmax: a small table of hand-chosen boosts that encodes the head’s specialty — the previous token for H1; “it” → “trophy”, “the” → its noun and a few other links for H2; verb–argument and modifier links for H3; almost nothing for H4. The random part is scaled by a per-head *gain* so that the bias dominates where it should and the noise still gives every row texture. Then the softmax is computed exactly, with the usual subtraction of the row maximum for numerical safety:',
        },
        {
          type: 'code',
          code: `const W = new Float32Array(N * N)
for (let i = 0; i < N; i++) {
  let mx = -Infinity
  for (let j = 0; j < N; j++) {
    let s = 0
    for (let c = 0; c < DK; c++) s += q[i * DK + c] * k[j * DK + c]
    row[j] = (s / Math.sqrt(DK)) * head.gain + head.bias(i, j)
    if (row[j] > mx) mx = row[j]
  }
  let sum = 0
  for (let j = 0; j < N; j++) {
    row[j] = Math.exp(row[j] - mx)
    sum += row[j]
  }
  for (let j = 0; j < N; j++) W[i * N + j] = row[j] / sum
}`,
          caption: 'Scaled dot products, a per-head gain and bias, then a numerically safe softmax over each row. The result is the head’s 14 × 14 weight matrix.',
        },
        {
          type: 'p',
          text: 'The numbers the piece shows are therefore genuine outputs of equation (2) applied to these inputs: the coreference head really does put 0.817 of “it”’s attention on “trophy” and 0.116 on “suitcase”, and every row of every matrix sums to one. What is authored is the bias — the story — not the arithmetic.',
        },
        {
          type: 'h',
          text: 'Arcs',
        },
        {
          type: 'p',
          text: 'Each weight $a_{ij}$ is drawn as a quadratic Bézier from token $i$ to token $j$. Its height grows with the distance between the tokens raised to the power 0.62, so long arcs don’t tower over the frame, and each head has its own height multiplier (0.46 for H1 up to 1.0 for H2) so that at the peak the four heads nest instead of overlapping. Stroke width is $0.45 + 2.6\\,a$ CSS pixels and opacity $0.1 + 0.9\\sqrt{a}$: a weight of 0.8 is a firm two-pixel line, a weight of 0.01 is a whisper. A token attending to itself draws a small loop above its anchor.',
        },
        {
          type: 'p',
          text: 'Arcs are drawn on from the query outward, and retracted at the release, which means drawing only part of a curve. Splitting a Bézier is a classic trick: the sub-curve between parameters $a$ and $b$ is itself a quadratic Bézier, whose control points come from the *blossom* of the original. That is three evaluations and one `quadraticCurveTo`, with no flattening into polylines:',
        },
        {
          type: 'code',
          code: `// blossom of the quadratic: sub-curve [a, b]
const ax = (1 - a) * (1 - a) * x0 + 2 * (1 - a) * a * cx + a * a * x1
const ay = (1 - a) * (1 - a) * y0 + 2 * (1 - a) * a * cy + a * a * y1
const bx = (1 - b) * (1 - b) * x0 + 2 * (1 - b) * b * cx + b * b * x1
const by = (1 - b) * (1 - b) * y0 + 2 * (1 - b) * b * cy + b * b * y1
const qx = (1 - a) * (1 - b) * x0 + ((1 - a) * b + a * (1 - b)) * cx + a * b * x1
const qy = (1 - a) * (1 - b) * y0 + ((1 - a) * b + a * (1 - b)) * cy + a * b * y1
ctx.moveTo(ax, ay)
ctx.quadraticCurveTo(qx, qy, bx, by)`,
          caption: 'The part of a quadratic Bézier between $t = a$ and $t = b$: the end points are the curve at $a$ and $b$, and the new control point is the blossom $f(a, b)$.',
        },
        {
          type: 'h',
          text: 'Batching',
        },
        {
          type: 'p',
          text: 'At the peak the piece strokes all 784 arcs at once, every frame, while they draw on and later retract. Setting a stroke style per arc would be slow, so when the piece starts it sorts each head’s weights into nine levels by $\\sqrt{a}$. Each level is one path and one `stroke()` with that level’s width and opacity — at most 36 strokes for the whole lattice. Arcs for the query being read in the sweeps are few enough to stroke individually at their exact weights. Arcs below 0.008 (0.02 in the small preview) are skipped at the peak; you could not see them anyway.',
        },
        {
          type: 'h',
          text: 'Layout',
        },
        {
          type: 'p',
          text: 'On a landscape screen the tokens sit in a row and arcs rise above them; the matrices and readout share a band along the bottom. The type size is the largest that fits the fourteen bracketed tokens in the width, capped by the height. On a portrait phone the tokens stack into a column and the arcs bulge to the right, with the matrices below. On very short screens — a phone held sideways — the matrices and formula are dropped and the sentence moves down to give the arcs the height. The layout is recomputed whenever the frame changes size, and once more when Instrument Serif finishes loading, since the token widths depend on the font.',
        },
        {
          type: 'h',
          text: 'Inspecting',
        },
        {
          type: 'p',
          text: 'The piece keeps its own clock rather than using the host’s time directly, so that it can stop. While you hover or pin a word, the timeline holds and the inspector draws that query’s arcs instead: in all four heads, each at its exact weight, or in one head with its two largest weights labelled. Hovering a matrix cell selects a head, a query (the row) and a key (the column), and labels that one weight on its arc even if it is tiny. Every row of the matrices is filled while you inspect, so you can compare heads at a glance.',
        },
        {
          type: 'h',
          text: 'Sound',
        },
        {
          type: 'p',
          text: 'With sound on, each new query plays one soft sine note from a pentatonic scale, rising with the word’s position and panned left to right with it; each head has its own root. The coreference head’s long look at “it” holds its note for over a second.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'What every mark means',
      blocks: [
        {
          type: 'table',
          head: ['Element', 'Meaning'],
          rows: [
            ['Serif words in brackets', 'The 14 tokens. Brackets appear when the sentence is tokenized; “didn’t” splits into “didn” and “’t”, as byte-pair tokenizers usually split it.'],
            ['Numbers under the words', 'Token ids in a GPT-2–style vocabulary (illustrative; see *Liberties taken*).'],
            ['Bar strip under the ids', 'Each token’s 16-number input vector (token embedding + position), one tick per dimension, up or down from a baseline.'],
            ['Arcs', 'Attention weights $a_{ij}$, from the underlined query to every key. Width and opacity grow with the weight.'],
            ['Arc color', 'The head: ocean H1 previous token, lagoon H2 coreference, moss H3 syntax, fern H4 broad.'],
            ['Small dots on words', 'Where a query’s stronger arcs land; size grows with the weight.'],
            ['Numbers on arcs', 'The two largest weights for the current query, to two decimals.'],
            ['Grey and dark words', 'While a query is read, each word is darker the more weight it receives.'],
            ['Four matrices', 'Each head’s 14 × 14 weights, query rows by key columns. Square area is proportional to the weight (a Hinton diagram). The outlined row is the current query.'],
            ['Readout, bottom right', 'Head, query, its top three keys with bars and weights, and the row’s entropy against the maximum $\\ln 14$.'],
            ['Top right', 'Timecode and phase: input, tokenize, read head k of 4, all heads, release — or the word you are inspecting.'],
          ],
        },
        {
          type: 'h',
          text: 'The beats',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Set, 0–1.9 s.** The sentence rises out of a mask, word by word, as running text.',
            '**Tokenize, 1.9–4 s.** Brackets close around each token, the words spread apart, ids type in, the embedding strips draw, and the four empty matrices rule themselves.',
            '**Four sweeps, 4–15.4 s.** Each head in turn reads the sentence, one query at a time: arcs fan out, the row fills its matrix, the previous rows linger as ghosts. The coreference head spends almost half its sweep on “it”, with the line *“it” is the trophy* — the hinge of the piece.',
            '**All heads, 15.6–20 s.** Every head draws every arc at once, a dense lattice of four colors; then a reading scan steps through the queries showing all four heads’ strongest links.',
            '**Release, 20–23 s.** The arcs retract query by query, the matrices empty, the words close back into a sentence and fall away. The loop begins again.',
          ],
        },
        {
          type: 'p',
          text: 'Things to look for: H1’s matrix is an almost perfect diagonal one step below the main one — each token’s weight on the token before it. H4’s matrix is a nearly uniform field of small squares. H2 and H3 are sparse and irregular, the signature of heads that pick out particular relationships rather than positions.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'What is simplified',
      blocks: [
        {
          type: 'list',
          items: [
            '**The heads are not trained.** Real heads get their specialties from training on billions of words. Here the projections are random and the specialty is written in as a bias on the scores. The weights are honest outputs of the softmax, but the story is authored. A trained head would rarely be this clean; Clark and colleagues found real coreference heads to be useful but far from perfect.',
            '**Only the weights are drawn.** There are no value vectors, no output projection, no residual stream and no later layers — the parts that turn weights into meaning. The formula shows $V$ for completeness; the drawing stops at $\\operatorname{softmax}(QK^T / \\sqrt{d_k})$.',
            '**It is small.** Real models use embeddings of hundreds to thousands of dimensions, dozens of heads per layer and dozens of layers. Here: 16 dimensions, 4 heads, 1 layer, 14 tokens.',
            '**There is no causal mask.** Arcs reach both forward and backward, as in an encoder such as BERT. A GPT-style model reading left to right would let “it” look only at earlier words — which, as it happens, still includes “trophy”.',
            '**The token ids are illustrative.** They are styled on GPT-2’s byte-pair vocabulary and many match it, but the piece doesn’t run a real tokenizer, and the typographic apostrophe in “didn’t” would not tokenize exactly this way.',
            '**One sentence.** The weights are computed once; the same sentence plays every loop. That is what lets every number on screen be checked.',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Step the pinned word through the sentence' },
      { keys: ['1', '2', '3', '4'], action: 'Show one head only (press again for all four)' },
      { keys: ['0'], action: 'Show all four heads' },
      { keys: ['Space'], action: 'Pause or resume the timeline' },
    ],
    gestures: [
      { gesture: 'move', action: 'Hover a word to see where it looks, in all four heads; hover a matrix cell to read one weight' },
      { gesture: 'tap', action: 'Tap a word or cell to pin it; tap again, or tap the paper, to release' },
    ],
    tip: 'Pin “it”, then press 2 to see the coreference head alone, and 1 to compare the head that only ever looks one word back.',
  },
  further: [
    { title: 'Attention Is All You Need', by: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin', year: '2017', note: 'The Transformer, scaled dot-product and multi-head attention, sinusoidal positions.' },
    { title: 'Neural Machine Translation by Jointly Learning to Align and Translate', by: 'Dzmitry Bahdanau, Kyunghyun Cho, Yoshua Bengio', year: '2014', note: 'Attention’s origin in translation.' },
    { title: 'Effective Approaches to Attention-based Neural Machine Translation', by: 'Minh-Thang Luong, Hieu Pham, Christopher D. Manning', year: '2015', note: 'Dot-product scoring and other variants.' },
    { title: 'What Does BERT Look At? An Analysis of BERT’s Attention', by: 'Kevin Clark, Urvashi Khandelwal, Omer Levy, Christopher D. Manning', year: '2019', note: 'Positional, broad, syntactic and coreference heads in a trained model.' },
    { title: 'Analyzing Multi-Head Self-Attention: Specialized Heads Do the Heavy Lifting, the Rest Can Be Pruned', by: 'Elena Voita, David Talbot, Fedor Moiseev, Rico Sennrich, Ivan Titov', year: '2019' },
    { title: 'In-context Learning and Induction Heads', by: 'Catherine Olsson, Nelson Elhage, et al.', year: '2022', note: 'Previous-token heads composing into induction heads.' },
    { title: 'Attention is not Explanation', by: 'Sarthak Jain, Byron C. Wallace', year: '2019' },
    { title: 'Attention is not not Explanation', by: 'Sarah Wiegreffe, Yuval Pinter', year: '2019' },
    { title: 'The Winograd Schema Challenge', by: 'Hector J. Levesque, Ernest Davis, Leora Morgenstern', year: '2012', note: 'The trophy and the suitcase.' },
  ],
}

export default guide
