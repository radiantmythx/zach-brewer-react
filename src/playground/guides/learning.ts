import type { Guide } from '../guide'

/*
 * Notes for motion/learning — FIG. M.03, a small neural network trained live.
 */

const backprop = `<svg viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, Menlo, monospace" font-size="8" letter-spacing="0.8">
<g stroke-opacity="0.35"><path d="M40 40L120 25M40 40L120 65M40 40L120 105M40 90L120 25M40 90L120 65M40 90L120 105"/><path d="M120 25L200 25M120 25L200 65M120 25L200 105M120 65L200 25M120 65L200 65M120 65L200 105M120 105L200 25M120 105L200 65M120 105L200 105"/><path d="M200 25L280 65M200 65L280 65M200 105L280 65"/></g>
<g><circle cx="40" cy="40" r="6"/><circle cx="40" cy="90" r="6"/><circle cx="120" cy="25" r="6"/><circle cx="120" cy="65" r="6"/><circle cx="120" cy="105" r="6"/><circle cx="200" cy="25" r="6"/><circle cx="200" cy="65" r="6"/><circle cx="200" cy="105" r="6"/><circle cx="280" cy="65" r="8"/></g>
<path d="M60 10H262M258 7l4 3-4 3" stroke="#2B6A93"/>
<path d="M262 122H60M64 119l-4 3 4 3" stroke="#3F7A55"/>
<g fill="currentColor" stroke="none"><text x="128" y="8" fill="#2B6A93">FORWARD: a = tanh(Wa + b)</text><text x="96" y="129" fill="#3F7A55">BACKWARD: δ = (Wᵀδ) ⊙ (1 − a²)</text><text x="272" y="88">p − y</text><text x="24" y="66">x</text></g>
</svg>`

const guide: Guide = {
  lede:
    'A neural network with 205 parameters learns to tell two classes of points apart, live, in your browser. Watch the boundary bend around two interlocking spirals, a ring, two moons and a checkerboard — then add a point it gets wrong and watch it learn again.',
  facts: [
    ['Network', 'Multilayer perceptron 2 → 12 → 12 → 1, 205 parameters'],
    ['Activations', 'tanh hidden layers, sigmoid output'],
    ['Loss', 'Binary cross-entropy'],
    ['Optimizer', 'Adam, minibatches of 32, learning rate 0.02 or 0.008'],
    ['Data', '200 points per dataset: spirals, circles, moons, XOR'],
    ['Boundary', 'Marching squares on a 36–64 cell grid, levels 0.1–0.9'],
    ['Stop', '≥ 98% training accuracy, then hold and switch'],
    ['Ground', 'Paper'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'A machine that bends a line',
      blocks: [
        {
          type: 'p',
          text: 'The task in the figure is the simplest one in machine learning: given a point on a plane, say which of two classes it belongs to — ocean dot or moss ring. A rule that does this draws a **decision boundary**, a curve with one class on each side. The question this piece answers is how a network finds that curve, when nobody tells it the shape.',
        },
        {
          type: 'p',
          text: 'The oldest answer is a straight line. In 1943 Warren McCulloch and Walter Pitts described an idealized neuron that adds up weighted inputs and fires if the sum crosses a threshold; in 1958 Frank Rosenblatt built the **perceptron**, a machine that learned those weights from examples. A single perceptron can only draw a straight boundary. In their 1969 book *Perceptrons*, Marvin Minsky and Seymour Papert made the limitation precise: such a network cannot even compute exclusive-or, where the classes sit in opposite corners of a square — the last dataset in this piece. The book is often blamed for a long cooling of interest in neural networks.',
        },
        {
          type: 'p',
          text: 'The way out was to stack layers. A network with a *hidden* layer between input and output can combine several straight boundaries into a bent one, and with enough hidden units it can approximate any reasonable boundary at all — a result proved in 1989 by George Cybenko and, independently, by Kurt Hornik, Maxwell Stinchcombe and Halbert White. What was missing was a way to train the hidden layers. The answer, **backpropagation**, has a long history — Seppo Linnainmaa described reverse-mode differentiation in 1970 and Paul Werbos applied it to networks in his 1974 thesis — but it was the 1986 paper by David Rumelhart, Geoffrey Hinton and Ronald Williams that made it the standard way to learn.',
        },
        {
          type: 'h',
          text: 'The two spirals',
        },
        {
          type: 'p',
          text: 'The first dataset has its own history. In 1988 Kevin Lang and Michael Witbrock published *Learning to Tell Two Spirals Apart*, and two interleaved spirals became a standard torture test for small networks: the boundary has to wind between the arms, and a network that has learned only a rough split gets half the points wrong. It is still the hardest of the four here. The circles, moons and XOR datasets are the friendlier staples of every introductory course; the look of the figure owes a debt to *TensorFlow Playground*, the browser demonstration Daniel Smilkov and Shan Carter made in 2016.',
        },
        {
          type: 'p',
          text: 'What makes the piece worth watching is that the network is not replaying a recording. It is a real network, initialized at random and trained by real gradient descent while you watch, and the contours are its actual output. When it hesitates — a spiral arm half-captured, a stubborn cluster of misclassified points — that is the optimization genuinely struggling.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Forward, backward, step',
      blocks: [
        {
          type: 'h',
          text: 'The network',
        },
        {
          type: 'p',
          text: 'The input is a point $x = (x_1, x_2)$. Two hidden layers of 12 units each transform it, and one output unit turns the result into a probability $p$ that the point is a moss ring:',
        },
        { type: 'math', tex: String.raw`a^{(1)} = \tanh(W_1 x + b_1), \qquad a^{(2)} = \tanh(W_2 a^{(1)} + b_2)`, label: '(1)' },
        { type: 'math', tex: String.raw`p = \sigma(w_3 \cdot a^{(2)} + b_3), \qquad \sigma(z) = \frac{1}{1 + e^{-z}}`, label: '(2)' },
        {
          type: 'p',
          text: '$W_1$ is $12 \\times 2$, $W_2$ is $12 \\times 12$ and $w_3$ has 12 entries; with the biases that is $24 + 12 + 144 + 12 + 12 + 1 = 205$ parameters. Each first-layer unit computes a straight line across the plane and squashes it with $\\tanh$ into a soft step from −1 to 1. The second layer combines twelve soft steps into twelve more complicated shapes, and the output combines those. The boundary is where $p = 0.5$, the heavy line in the figure.',
        },
        {
          type: 'h',
          text: 'The loss',
        },
        {
          type: 'p',
          text: 'For a point with label $y \\in \\{0, 1\\}$, the network is scored by the **binary cross-entropy**, the negative log of the probability it gave the right answer:',
        },
        { type: 'math', tex: String.raw`\ell = -\,y \ln p - (1 - y) \ln (1 - p)`, label: '(3)' },
        {
          type: 'p',
          text: 'It is zero for a confident correct answer and grows without bound for a confident wrong one. It pairs neatly with the sigmoid: the derivative of $\\ell$ with respect to the output unit’s input $z$ is simply $p - y$, the error itself. Averaged over a batch, it is the LOSS readout; a coin-flipping network scores $\\ln 2 \\approx 0.69$.',
        },
        {
          type: 'h',
          text: 'Backpropagation',
        },
        {
          type: 'p',
          text: 'To improve, the network needs the gradient of the loss with respect to all 205 parameters. The chain rule, applied from the output back toward the input, gives it in one sweep. Define $\\delta$, the sensitivity of the loss to each unit’s input, layer by layer:',
        },
        { type: 'math', tex: String.raw`\delta^{(3)} = p - y, \qquad \delta^{(2)} = (w_3 \, \delta^{(3)}) \odot (1 - a^{(2)} \odot a^{(2)})`, label: '(4)' },
        { type: 'math', tex: String.raw`\delta^{(1)} = (W_2^{T} \delta^{(2)}) \odot (1 - a^{(1)} \odot a^{(1)}), \qquad \frac{\partial \ell}{\partial W_k} = \delta^{(k)} \, (a^{(k-1)})^{T}`, label: '(5)' },
        {
          type: 'p',
          text: 'Here $\\odot$ is element-wise multiplication, $1 - a^2$ is the derivative of $\\tanh$, and $a^{(0)} = x$. Each weight’s gradient is the product of the signal arriving at it on the way forward and the sensitivity arriving at it on the way back. The cost is about twice that of the forward pass, however many parameters there are — which is the whole reason deep learning is possible.',
        },
        { type: 'figure', svg: backprop, alt: 'A small network: signals flow forward from the two inputs through two hidden layers to the output; errors flow backward along the same edges.', caption: 'The forward pass computes activations; the backward pass sends the error $p - y$ back along the same edges, scaled by each weight and each unit’s slope.' },
        {
          type: 'h',
          text: 'Minibatches and Adam',
        },
        {
          type: 'p',
          text: 'Each training step draws 32 points at random, averages their gradients and updates every parameter with **Adam** (Diederik Kingma and Jimmy Ba, 2014): running averages of each parameter’s gradient $m$ and squared gradient $s$, corrected for their start at zero, and a step of $\\eta\\, \\hat{m} / (\\sqrt{\\hat{s}} + \\epsilon)$ — see the Descent study, FIG. M.07, for the full equations and a picture of what they do. A random batch makes each step noisy, which is cheap and, at this size, harmless; the loss curve’s jitter is that noise.',
        },
        {
          type: 'h',
          text: 'Initialization',
        },
        {
          type: 'p',
          text: 'Weights start as Gaussian random numbers with variance $1 / n_{in}$, where $n_{in}$ is the number of inputs to the unit, and biases start at zero. The scaling, recommended by Yann LeCun and colleagues in *Efficient BackProp* (1998) and refined by Xavier Glorot and Yoshua Bengio in 2010, keeps each unit’s input at about unit variance so that $\\tanh$ starts in its responsive middle rather than flat against ±1. Each dataset gets a fresh, seeded set of weights, so its first boundary is a random tangle — and always the same random tangle.',
        },
        {
          type: 'h',
          text: 'Why tanh',
        },
        {
          type: 'p',
          text: 'Most large networks today use the rectified linear unit, $\\max(0, z)$, popularized around 2010 by Vinod Nair and Geoffrey Hinton and by Xavier Glorot, Antoine Bordes and Yoshua Bengio, because its gradient does not fade for large inputs and deep stacks of it train well. In a network this small, working in two dimensions, the choice shows up directly in the picture. A ReLU network’s output is piecewise linear, so its boundary is a polygon, with corners wherever a unit switches on or off. A tanh network’s output is smooth, so its boundaries are the soft curves you see, and its contours are evenly nested where the network is unsure. Tanh is also centered on zero, which suits the symmetric datasets here.',
        },
        {
          type: 'h',
          text: 'What a hidden unit sees',
        },
        {
          type: 'p',
          text: 'It helps to picture the first layer geometrically. Unit $j$ computes $\\tanh(w_{j1} x_1 + w_{j2} x_2 + b_j)$: zero along the straight line $w_{j1} x_1 + w_{j2} x_2 + b_j = 0$, rising toward +1 on one side and falling toward −1 on the other, with a steepness set by the size of the weights. So the twelve first-layer units are twelve soft folds across the plane, each oriented by its two incoming edges in the diagram. Training rotates, shifts and sharpens those folds, and the second layer learns which combinations of folds make up each class. For the circles, a handful of folds arranged around the center are enough to approximate a ring; for the spirals, the second layer has to stitch together many more, which is why it takes so much longer.',
        },
      ],
    },
    {
      id: 'how-it-works',
      kicker: 'How the piece works',
      title: 'Training in a frame budget',
      blocks: [
        {
          type: 'p',
          text: 'The network is about a hundred lines of plain TypeScript: all 205 parameters in one `Float64Array`, with offsets for each matrix, and matching arrays for the gradient and Adam’s two averages. No library, no automatic differentiation — equations (1) to (5) written out by hand. The backward pass and update, as they appear in the piece:',
        },
        {
          type: 'code',
          code: `const p = this.forward(x, y)
loss -= yt ? Math.log(p + 1e-9) : Math.log(1 - p + 1e-9)
const dz = p - yt
for (let i = 0; i < H; i++) {
  G[oW3 + i] += dz * a2[i]
  d2[i] = dz * P[oW3 + i] * (1 - a2[i] * a2[i])
}
G[ob3] += dz
for (let j = 0; j < H; j++) {
  const row = oW2 + j * H
  for (let i = 0; i < H; i++) G[row + i] += d2[j] * a1[i]
  G[ob2 + j] += d2[j]
}
for (let i = 0; i < H; i++) {
  let s = 0
  for (let j = 0; j < H; j++) s += d2[j] * P[oW2 + j * H + i]
  d1[i] = s * (1 - a1[i] * a1[i])
}
// … first-layer gradients, then for every parameter:
M[i] = 0.9 * M[i] + 0.1 * g
V[i] = 0.999 * V[i] + 0.001 * g * g
P[i] -= (lr * (M[i] / bc1)) / (Math.sqrt(V[i] / bc2) + 1e-8)`,
          caption: 'Backpropagation through two tanh layers (equations 4 and 5), accumulated over the batch, then the Adam update. `G` is the gradient, `M` and `V` Adam’s averages.',
        },
        {
          type: 'h',
          text: 'Pacing',
        },
        {
          type: 'p',
          text: 'The piece trains at a fixed rate in simulated steps per second — 220 for the spirals, 42–50 for the easier datasets — carried by an accumulator, so a slow frame does more steps and a fast one fewer, and the training runs at the same speed on every machine. The rate ramps up over the first 2.5 seconds so the first, largest moves of the boundary are slow enough to follow. Each step takes tens of microseconds; at the spirals’ rate the network does under four steps per frame.',
        },
        {
          type: 'p',
          text: 'Every ten steps the network is evaluated on all its points. Points it gets wrong get a thin ring; the accuracy readout is the fraction it gets right. Once accuracy reaches 98% (and at least 40 steps have passed), training stops, the boundary thickens, two soft notes sound, and the result holds for two seconds before the points scatter and the next dataset arrives. A safety cap stops any dataset after sixteen seconds of training. A full pass through the four datasets takes about thirty-five seconds, roughly nine for each; the spirals need four to eight times as many steps as the others, so the piece trains them faster to keep the pace even.',
        },
        {
          type: 'p',
          text: 'Because the minibatches come from a seeded random generator and the initial weights from fixed seeds, the sequence of weights is identical on every run: step 900 of the spirals always has the same boundary. Only how many steps land in each frame depends on the frame rate.',
        },
        {
          type: 'h',
          text: 'The boundary',
        },
        {
          type: 'p',
          text: 'To draw $p(x)$, the network is evaluated on a square grid over the plane — one cell per 11 CSS pixels, between 36 and 64 cells across (26 in the small preview) — and contoured with marching squares at nine levels: 0.1 to 0.4 in ocean, 0.6 to 0.9 in moss, and 0.5, the decision boundary, in heavy ink. The p > 0.5 side is hatched at 45°: each hatch line is sampled along its length and switched on and off where the interpolated output crosses 0.5, with the crossing found by linear interpolation so the hatching meets the boundary cleanly.',
        },
        {
          type: 'p',
          text: 'That is a few thousand forward passes and a few dozen paths, too much to redo for every frame at 60 frames per second on a laptop. So the field, its contours and its hatching are drawn into an offscreen canvas that is redrawn only when the weights have changed, and at most every second frame — 30 times a second, faster than the eye can follow the boundary’s motion. The network diagram is cached the same way. A frame then costs two image copies, the 200 points and the readouts.',
        },
        {
          type: 'h',
          text: 'The diagram',
        },
        {
          type: 'p',
          text: 'Every one of the 180 weights is an edge. Its width and opacity grow with its magnitude (saturating at 2), and its color gives its sign: ocean for positive, fern for negative. The edges are sorted into six magnitude buckets per sign, so the whole diagram is twelve strokes. The nodes show the activations for a **probe** point — the crosshair on the plane, which drifts on a slow Lissajous path, or follows your pointer. A node’s fill grows with $\\sqrt{|a|}$ and is ocean for positive, fern for negative; the output node shades from ocean to moss with $p$. Every 1.8 seconds a wave of small dots travels along the strongest edges, layer by layer: the forward pass, made visible.',
        },
        {
          type: 'h',
          text: 'Teaching it yourself',
        },
        {
          type: 'p',
          text: 'Clicking the plane adds a **counterexample**: a new point at that spot, labeled with the class the network currently gets *wrong* there. It joins the training set (up to 80 extra points), the network goes back to training if it had stopped, and the hold is extended so you can watch it adapt:',
        },
        {
          type: 'code',
          code: `function addPoint(x: number, y: number) {
  const p = net.forward(x, y)
  const i = np < CAP ? np++ : NPTS + (added % EXTRA)
  data.x[i] = x
  data.y[i] = y
  data.c[i] = p > 0.5 ? 0 : 1
  born[i] = lastT
  added++
  evaluate()
  resume()
  holdUntil = lastT + 10
}`,
          caption: 'A counterexample: the label is whichever class the network does not predict at that point. The newest 80 additions are kept.',
        },
        {
          type: 'p',
          text: 'A single counterexample in the middle of a solid region is often left wrong: one point against two hundred still leaves accuracy above 98%, so training stops before the boundary bothers to reach it. Five or more close together pull accuracy under the target and force the network to carve out a pocket. A few points just across a boundary nudge it over. It is a quick way to feel how a model, and its stopping rule, trade fitting every example against keeping a simple shape.',
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
            ['Ocean dots, moss rings', 'The two classes: label 0 and label 1.'],
            ['Thin grey ring around a point', 'The network currently misclassifies it.'],
            ['Heavy ink line', 'The decision boundary, $p = 0.5$.'],
            ['Ocean and moss contours', 'Levels of $p$ from 0.1 to 0.9; close together where the network is confident and its output changes fast.'],
            ['Moss hatching', 'The side the network calls class 1.'],
            ['Crosshair and p readout', 'The probe point and the network’s output there.'],
            ['Edges', 'Weights: width ∝ magnitude, ocean positive, fern negative.'],
            ['Node fills', 'Activations for the probe point; the output node shades with $p$.'],
            ['EPOCH, STEP', 'Steps are minibatch updates; an epoch is as many examples as there are points.'],
            ['LOSS', 'Training loss, smoothed (an exponential moving average over about 25 steps).'],
            ['ACC', 'Fraction of points classified correctly; moss once it passes 98%.'],
            ['Chart', 'Loss on a log scale (ink) and accuracy (moss) over training; the dashed line is the 98% target.'],
          ],
        },
        {
          type: 'h',
          text: 'Each dataset',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Initialize, about 1 s.** The points pop in; the network’s edges draw on from input to output; the first, random boundary fades up.',
            '**Train.** The boundary moves, slowly at first; misclassified points lose their rings as it passes them; loss falls and accuracy climbs.',
            '**Converge.** At 98% the boundary thickens, the readout turns moss and the status line reports the step.',
            '**Hold, 2 s, then dissolve.** The points scatter, and the next dataset begins with fresh weights.',
          ],
        },
        {
          type: 'p',
          text: 'Watch the spirals in particular. The boundary usually captures the broad outer turns first and spends a while on the tight turns near the center, where the arms are closest together, before it snaps into place. The accuracy curve shows it as a long plateau in the high eighties followed by a climb.',
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
            '**There is no test set.** Accuracy is measured on the training points themselves. A real model is judged on data it has not seen, and a network this flexible could, given time, wrap a boundary around every noisy point — overfitting — without the piece showing any cost.',
            '**The schedule is tuned.** The learning rates and steps per second are chosen per dataset so that each converges in a watchable time; the spirals get a larger learning rate than the rest.',
            '**It is tiny.** Real networks have millions to billions of parameters and are trained on GPUs for days. The mechanics — forward pass, cross-entropy, backpropagation, Adam — are the same.',
            '**Smoothed readouts.** The LOSS figure is a moving average of minibatch losses, not the loss over all points.',
            '**The data is synthetic.** Two-dimensional toy datasets let you see the whole input space at once; real inputs (images, text) have thousands of dimensions and no picture like this.',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['N'], action: 'Next dataset' },
      { keys: ['R'], action: 'Retrain from fresh random weights (keeps your points)' },
      { keys: ['Space'], action: 'Pause or resume training' },
    ],
    gestures: [
      { gesture: 'move', action: 'Hover the plane to move the probe and read the network’s output there' },
      { gesture: 'tap', action: 'Click or tap the plane to add a point of the class the network gets wrong there' },
    ],
    tip: 'Once the circles have converged, drop six or more points close together inside the inner ring and watch the network carve a pocket around them.',
  },
  further: [
    { title: 'A Logical Calculus of the Ideas Immanent in Nervous Activity', by: 'Warren S. McCulloch, Walter Pitts', year: '1943' },
    { title: 'The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain', by: 'Frank Rosenblatt', year: '1958' },
    { title: 'Perceptrons', by: 'Marvin Minsky, Seymour Papert', year: '1969' },
    { title: 'Learning representations by back-propagating errors', by: 'David E. Rumelhart, Geoffrey E. Hinton, Ronald J. Williams', year: '1986' },
    { title: 'Approximation by superpositions of a sigmoidal function', by: 'George Cybenko', year: '1989' },
    { title: 'Multilayer feedforward networks are universal approximators', by: 'Kurt Hornik, Maxwell Stinchcombe, Halbert White', year: '1989' },
    { title: 'Learning to Tell Two Spirals Apart', by: 'Kevin J. Lang, Michael J. Witbrock', year: '1988', note: 'Proceedings of the 1988 Connectionist Models Summer School.' },
    { title: 'Efficient BackProp', by: 'Yann LeCun, Léon Bottou, Genevieve B. Orr, Klaus-Robert Müller', year: '1998' },
    { title: 'Understanding the difficulty of training deep feedforward neural networks', by: 'Xavier Glorot, Yoshua Bengio', year: '2010' },
    { title: 'Rectified Linear Units Improve Restricted Boltzmann Machines', by: 'Vinod Nair, Geoffrey E. Hinton', year: '2010' },
    { title: 'Deep Sparse Rectifier Neural Networks', by: 'Xavier Glorot, Antoine Bordes, Yoshua Bengio', year: '2011' },
    { title: 'Adam: A Method for Stochastic Optimization', by: 'Diederik P. Kingma, Jimmy Ba', year: '2014' },
    { title: 'Neural Networks and Deep Learning', by: 'Michael Nielsen', year: '2015', note: 'A free online book; chapter 2 is the clearest derivation of backpropagation there is.' },
  ],
}

export default guide
