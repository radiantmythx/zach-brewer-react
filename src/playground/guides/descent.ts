import type { Guide } from '../guide'

/*
 * Notes for motion/descent — FIG. M.07, three optimizers on a loss landscape.
 */

const squares = `<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, Menlo, monospace" font-size="8" letter-spacing="0.8">
<g stroke-opacity="0.45"><rect x="20" y="20" width="70" height="70"/><rect x="125" y="20" width="70" height="70"/><rect x="230" y="20" width="70" height="70"/></g>
<g fill="currentColor" stroke="none">
<circle cx="20" cy="20" r="3"/><circle cx="90" cy="20" r="3" fill-opacity="0.15"/><circle cx="90" cy="90" r="3" fill-opacity="0.15"/><circle cx="20" cy="90" r="3" fill-opacity="0.15"/>
<circle cx="125" cy="20" r="3"/><circle cx="195" cy="20" r="3"/><circle cx="195" cy="90" r="3" fill-opacity="0.15"/><circle cx="125" cy="90" r="3" fill-opacity="0.15"/>
<circle cx="230" cy="20" r="3" fill-opacity="0.15"/><circle cx="300" cy="20" r="3"/><circle cx="300" cy="90" r="3" fill-opacity="0.15"/><circle cx="230" cy="90" r="3"/>
<text x="20" y="108">ONE CORNER</text><text x="125" y="108">TWO, ADJACENT</text><text x="230" y="108">SADDLE: ASK THE CENTRE</text></g>
<g stroke="#2B6A93" stroke-width="1.5"><path d="M20 48 L52 20"/><path d="M125 58 L195 44"/><path d="M230 52 L264 90"/><path d="M266 20 L300 58"/></g>
<path d="M260 55 l10 0 M265 50 l0 10" stroke-opacity="0.6"/>
</svg>`

const guide: Guide = {
  lede:
    'Three ways of walking downhill, raced across a contour map. They start from the same place and follow the same slope, but one settles for the first hollow it finds, one carries enough speed to roll out of it, and one rescales every step.',
  facts: [
    ['Optimizers', 'Gradient descent (“SGD”), momentum (heavy ball), Adam'],
    ['Gradients', 'Central finite differences, $h = 10^{-4}$'],
    ['Landscapes', 'A local minimum · B saddle point · C curved ravine'],
    ['Race', '200 steps in 8 s per landscape'],
    ['Contours', 'Marching squares, 26 levels spaced as $k^2$, index every fifth'],
    ['Loss chart', '$\\log_{10}$ of the loss above the global minimum'],
    ['Cycle', '12 s per landscape, 36 s loop'],
    ['Ground', 'Paper'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Learning is walking downhill in the dark',
      blocks: [
        {
          type: 'p',
          text: 'Training a neural network means choosing its parameters — millions or billions of numbers — so that a single number, the **loss**, is as small as possible. The loss measures how wrong the network is on its training data. Picture every possible setting of the parameters as a point in a vast space, and the loss as a height above each point: a landscape. Training is a search for low ground.',
        },
        {
          type: 'p',
          text: 'You cannot see the landscape. Its dimension is the number of parameters, and evaluating the loss even once may mean running the network over a large dataset. What you can compute, cheaply, is the **gradient**: the direction in which the loss rises fastest at the point where you are standing. Walk the other way, a little, and repeat. That is gradient descent, and nearly every network in use was trained by some refinement of it.',
        },
        {
          type: 'p',
          text: 'The method is old. Augustin-Louis Cauchy described it in 1847, as a way to solve systems of equations by minimizing a sum of squares. In 1951 Herbert Robbins and Sutton Monro showed that the idea survives noise — that you can follow a gradient you can only estimate, if the steps shrink at the right rate — which is the ancestor of **stochastic gradient descent**, where each step uses the gradient on a small random batch of training examples instead of all of them. In 1964 Boris Polyak added **momentum**, his “heavy ball” method: let the walker build up speed, so it coasts through flat stretches and is less thrown about by every bump. When David Rumelhart, Geoffrey Hinton and Ronald Williams popularized backpropagation in 1986, momentum was part of the recipe.',
        },
        {
          type: 'p',
          text: 'The newest of the three, **Adam**, was published by Diederik Kingma and Jimmy Ba in 2014. It combines momentum with an idea from AdaGrad (John Duchi, Elad Hazan and Yoram Singer, 2011) and RMSProp (proposed by Geoffrey Hinton in a 2012 course lecture): give every parameter its own step size, scaled by how large that parameter’s gradients have recently been. A parameter whose gradient is consistently tiny gets a bigger step; one whose gradient swings wildly gets a smaller one. Adam’s defaults work tolerably on almost anything, which is a large part of why it became the default.',
        },
        {
          type: 'h',
          text: 'What goes wrong',
        },
        {
          type: 'p',
          text: 'Each landscape in the piece is built to show one of the classic difficulties.',
        },
        {
          type: 'list',
          items: [
            '**A — a local minimum.** A hollow that is lower than everything around it but not the lowest point of the map. A walker that only ever goes downhill, and stops when the ground is flat, has no reason to leave. Here plain descent and Adam settle in the first basin they reach; momentum arrives with enough speed to climb out over the rim and finds the deeper basin beyond.',
            '**B — a saddle point.** A place that is a minimum in one direction and a maximum in another, like the low point of a mountain pass. The gradient there is zero, so a walker that arrives along the ridge slows almost to a stop. Plain descent idles near the saddle until a tiny sideways slope, growing exponentially, finally tips it off; Adam, rescaling the tiny sideways gradient into a full-sized step, heads for the valley almost at once.',
            '**C — an ill-conditioned ravine.** A long, narrow, curving valley, steep across and nearly flat along. A step size large enough to make progress along the floor is too large across it, so plain descent zigzags from wall to wall. Momentum averages the zigzags away and runs along the floor.',
          ],
        },
        {
          type: 'p',
          text: 'The local minimum is the most famous picture and, for big networks, probably the least important. In very high dimensions a critical point is a true minimum only if the surface curves upward in *every* direction, which becomes unlikely; most flat places are saddles. Yann Dauphin and colleagues argued in 2014 that saddles, not local minima, are the main obstacle in training deep networks, and Anna Choromanska and colleagues found in 2015 that the local minima of large networks tend to have losses close to the global one. The two-dimensional pictures are still the clearest way to see what each optimizer does — as long as you remember they are cartoons of a much stranger space.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Three update rules',
      blocks: [
        {
          type: 'p',
          text: 'Let $\\theta$ be the parameters (here just a point $(x, y)$ in the plane), $L(\\theta)$ the loss and $g_t = \\nabla L(\\theta_t)$ its gradient at step $t$. The step size, or **learning rate**, is $\\eta$. Plain gradient descent is the formula set in the top left of the piece:',
        },
        { type: 'math', tex: String.raw`\theta_{t+1} = \theta_t - \eta \, g_t`, label: '(1)' },
        {
          type: 'p',
          text: 'Near a minimum the loss looks like a bowl, $L \\approx \\frac{1}{2} \\sum_i \\lambda_i u_i^2$ along the bowl’s principal axes $u_i$, with curvatures $\\lambda_i$. Each step multiplies the distance along axis $i$ by $(1 - \\eta \\lambda_i)$. That converges only if $\\eta < 2 / \\lambda_{\\max}$, so the steepest direction caps the step size — and progress along the flattest direction then goes at the rate $1 - \\eta \\lambda_{\\min}$. The ratio $\\kappa = \\lambda_{\\max} / \\lambda_{\\min}$, the **condition number**, sets how many steps it takes; landscape C has a large one. When $\\eta \\lambda_{\\max}$ is between 1 and 2 the factor is negative and the walker overshoots back and forth across the valley: the zigzag.',
        },
        {
          type: 'h',
          text: 'Momentum',
        },
        { type: 'math', tex: String.raw`v_{t+1} = \beta \, v_t + g_t, \qquad \theta_{t+1} = \theta_t - \eta \, v_{t+1}`, label: '(2)' },
        {
          type: 'p',
          text: 'The velocity $v$ is a running sum of past gradients, each discounted by $\\beta$ per step; with $\\beta = 0.9$ it remembers roughly the last ten. Where successive gradients agree — along a valley floor — they add up, and the effective step grows toward $\\eta / (1 - \\beta)$, ten times the plain step. Where they alternate — across a narrow valley — they cancel. Physically it is a ball with mass rolling in the landscape with friction: it can overshoot, oscillate around a minimum before settling, and climb a rise if it is moving fast enough. That last property is what carries it out of landscape A’s first basin. Gabriel Goh’s interactive essay *Why Momentum Really Works* is the best place to see the algebra come alive.',
        },
        {
          type: 'h',
          text: 'Adam',
        },
        { type: 'math', tex: String.raw`m_t = \beta_1 m_{t-1} + (1 - \beta_1)\, g_t, \qquad s_t = \beta_2 s_{t-1} + (1 - \beta_2)\, g_t^2`, label: '(3)' },
        { type: 'math', tex: String.raw`\hat{m}_t = \frac{m_t}{1 - \beta_1^{\,t}}, \quad \hat{s}_t = \frac{s_t}{1 - \beta_2^{\,t}}, \qquad \theta_t = \theta_{t-1} - \eta \, \frac{\hat{m}_t}{\sqrt{\hat{s}_t} + \epsilon}`, label: '(4)' },
        {
          type: 'p',
          text: 'Everything is per coordinate: $g_t^2$ squares each component, and the division in (4) divides each component by its own root-mean-square gradient. $m$ is a momentum-like average of the gradient, $s$ an average of its square. Both start at zero, so in the first steps they are biased toward zero; dividing by $1 - \\beta^t$ corrects that. The defaults, used here, are $\\beta_1 = 0.9$, $\\beta_2 = 0.999$, $\\epsilon = 10^{-8}$.',
        },
        {
          type: 'p',
          text: 'The consequence is that Adam’s step in each coordinate is roughly $\\eta$ in size whatever the gradient’s scale — it follows the gradient’s *sign*, smoothed, more than its magnitude. That is why it shoots off the saddle in landscape B: the sideways gradient is a hundred times smaller than the slope it arrived on, but after normalization it is as large as any other. It is also why, in landscape A, Adam goes neatly into the nearest basin and stays: its steps shrink as the gradient’s average does, and it has no reserve of speed to climb out. Neither behavior is better in general. Sashank Reddi, Satyen Kale and Sanjiv Kumar showed in 2018 that Adam can fail to converge on some simple problems, and much later work has been about when to prefer which.',
        },
        {
          type: 'h',
          text: 'The landscapes',
        },
        {
          type: 'p',
          text: 'Each landscape is an explicit function of $(x, y)$, built from a few terms: quadratic valleys, a double well $(x^2 - 1)^2$, a sine-curved ravine, and Gaussian bumps and dips $G(x, y) = \\exp(-(x - c_x)^2 / 2\\sigma_x^2 - (y - c_y)^2 / 2\\sigma_y^2)$. Landscape A, for example, is a bent valley with a shallow dip near its start, a hump in the middle and a deep dip at the far end:',
        },
        { type: 'math', tex: String.raw`L_A = 0.9\,(y - 0.42x^2 + 0.55)^2 + 0.1\,(x - 1.25)^2 - 0.42\,G_1 + 0.35\,G_2 - 0.9\,G_3`, label: '(5)' },
        {
          type: 'p',
          text: 'Landscape B is a double well with a gentle tilt toward the right-hand basin, $0.42(x^2 - 1)^2 + 0.9 y^2 - 0.012x$, plus a small bump below the saddle; the saddle sits at the origin, where the surface curves down along $x$ and up along $y$. Landscape C is $0.06(x + 1.6)^2 + 1.8\\,(y - 0.35 \\sin 1.4x)^2$: across the ravine the curvature is 3.6, along its floor 0.12, a condition number of thirty.',
        },
        {
          type: 'aside',
          title: 'The name “SGD”',
          text: 'The blue walker is labeled SGD because that is what the method is called in every deep-learning library. Strictly it is plain gradient descent: these landscapes are fixed functions, so there is no minibatch and no noise. Real SGD’s noise matters — it jostles the walker off saddles and, some argue, steers it toward flat minima that generalize better — and it is the most important thing these pictures leave out.',
        },
      ],
    },
    {
      id: 'how-it-works',
      kicker: 'How the piece works',
      title: 'Contours, races and a cached map',
      blocks: [
        {
          type: 'h',
          text: 'The race is precomputed',
        },
        {
          type: 'p',
          text: 'When a landscape is prepared, all three optimizers are run for 200 steps from its starting point and every position, loss and gradient is stored in typed arrays. Gradients come from central differences, $\\partial L / \\partial x \\approx (L(x + h, y) - L(x - h, y)) / 2h$ with $h = 10^{-4}$ — accurate to about eight digits for these smooth functions and free of hand-derived formulas that could drift from the functions themselves. The three update rules are a dozen lines:',
        },
        {
          type: 'code',
          code: `if (o.key === 'sgd') {
  x -= L.hp.sgd * gx
  y -= L.hp.sgd * gy
} else if (o.key === 'mom') {
  vx = L.hp.beta * vx + gx
  vy = L.hp.beta * vy + gy
  x -= L.hp.mom * vx
  y -= L.hp.mom * vy
} else {
  const k = t + 1
  m1x = 0.9 * m1x + 0.1 * gx
  m1y = 0.9 * m1y + 0.1 * gy
  m2x = 0.999 * m2x + 0.001 * gx * gx
  m2y = 0.999 * m2y + 0.001 * gy * gy
  const bc1 = 1 - Math.pow(0.9, k)
  const bc2 = 1 - Math.pow(0.999, k)
  x -= (L.hp.adam * (m1x / bc1)) / (Math.sqrt(m2x / bc2) + 1e-8)
  y -= (L.hp.adam * (m1y / bc1)) / (Math.sqrt(m2y / bc2) + 1e-8)
}`,
          caption: 'Equations (1)–(4), one coordinate at a time. Each landscape has its own learning rates, listed in the legend.',
        },
        {
          type: 'p',
          text: 'Playback is then a matter of indexing: 8 seconds of the 12-second cycle map linearly to steps 0–200, and the head of each trail is interpolated between stored steps. An optimizer counts as **settled** after the last step at which it moved more than 0.006 units over four steps; it is labeled *global min* if its final loss is within 0.01 of the landscape’s lowest value, *local min* if it settled elsewhere.',
        },
        {
          type: 'h',
          text: 'Contours by marching squares',
        },
        {
          type: 'p',
          text: 'The map is drawn the way a surveyor would: as lines of equal height. The loss is sampled on a grid covering the whole frame (cells of 6–10 CSS pixels, 7 in the preview), and each contour is traced with **marching squares**, the two-dimensional version of William Lorensen and Harvey Cline’s 1987 marching cubes. For each cell and each level, the four corners are marked above or below the level, giving one of sixteen cases. Each case says which cell edges the contour crosses; the crossing point on each edge is found by linear interpolation between the two corner values. Two cases are ambiguous — opposite corners above, the other two below — and are resolved by asking whether the average of the four corners, an estimate of the value at the cell’s centre, is above the level.',
        },
        { type: 'figure', svg: squares, alt: 'Three grid cells. In the first one corner is above the level and the contour cuts off that corner. In the second two adjacent corners are above and the contour crosses the cell. In the third two opposite corners are above, and the contour’s shape depends on the value at the centre.', caption: 'Marching squares. Filled corners are above the level; the contour separates them from the rest. Opposite corners make a saddle, decided by the cell’s centre.' },
        {
          type: 'code',
          code: `case 5:
case 10: {
  const centre = (a + b + c + d) / 4 > L
  // 5: b,d above · 10: a,c above
  if ((idx === 5) === centre) {
    seg(X, ly, tx, Y)
    seg(bx, Y + cell, X + cell, ry)
  } else {
    seg(tx, Y, X + cell, ry)
    seg(X, ly, bx, Y + cell)
  }
  break
}`,
          caption: 'The ambiguous cases. If the centre agrees with the two corners that are above, those corners are joined through the middle and the other two are cut off.',
        },
        {
          type: 'p',
          text: 'There are 26 levels, at heights $4.6\\,(k / 26)^2$ above the minimum. For a quadratic bowl $L \\propto r^2$, levels spaced as $k^2$ fall at equally spaced radii, so every basin is drawn as evenly spaced rings however steep it is — the note *contours ∝ k²* in the corner. Every fifth level is an index contour, drawn darker and labeled with its height on a paper knockout. The labels are placed along a ray from the global minimum, chosen among 24 directions to stay clear of the three trails and the chart.',
        },
        {
          type: 'p',
          text: 'All 26 levels for a landscape are built once into `Path2D` objects, then drawn once into an offscreen canvas, so a settled frame costs a single image copy plus the trails. When one landscape gives way to the next, the two grids of values are blended linearly and re-contoured as they blend (about thirty times a second, which is smooth to the eye), so the hills appear to flow into their new shapes rather than cross-fade. The lowest basin of each landscape — everywhere within 0.035 of the minimum — is hatched in lagoon at 45°, the way water is drawn on a map; the hatching is traced along scanlines that switch on and off where they cross that level.',
        },
        {
          type: 'h',
          text: 'Your own start',
        },
        {
          type: 'p',
          text: 'Clicking the map converts the pointer position back into $(x, y)$, reruns all three optimizers from there, and rewinds the cycle to the start of the race. Once the walkers settle, the landscape holds for eight seconds, so you can try again, before the loop moves on. Hovering shows the loss at the pointer and a small arrow along $-\\nabla L$ — the direction all three walkers will take their first step.',
        },
        {
          type: 'code',
          code: `function rerun(start: [number, number] | null) {
  const ci = Math.floor((clock % LOOPLEN) / CYCLE)
  const p = preps[ci]
  const L = LANDS[ci]
  if (start) {
    p.start = [clamp(start[0], -2.3, 2.3), clamp(start[1], -1.45, 1.45)]
    p.runs = runAll(L, p.fmin, p.start)
    userStart[ci] = p.start
    holdUntil = lastT + (RUN1 + 1.4 - RUN0 + 0.35) + 8
  } else {
    p.start = [L.start[0], L.start[1]]
    p.runs = p.base
    userStart[ci] = null
  }
  clock = cycleBase() + ci * CYCLE + RUN0 - 0.35
}`,
          caption: 'A dropped start reruns the race (600 gradient evaluations, well under a millisecond) and rewinds the piece’s own clock to just before the start.',
        },
        {
          type: 'p',
          text: 'Everything is deterministic — the landscapes are fixed functions, there is no randomness anywhere — so the same moment always looks the same, which is what lets the test route photograph any frame exactly.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'Marks, readouts and beats',
      blocks: [
        {
          type: 'table',
          head: ['Element', 'Meaning'],
          rows: [
            ['Grey hairlines', 'Contours of equal loss. Darker lines, with numbers, are every fifth level; the numbers are loss above the global minimum.'],
            ['Lagoon hatching', 'The deepest basin, within 0.035 of the minimum.'],
            ['Crosshair θ₀', 'The common starting point, with its coordinates.'],
            ['Ocean dots', 'SGD (plain gradient descent): one filled dot per step.'],
            ['Lagoon rings', 'Momentum: one ring per step.'],
            ['Moss squares', 'Adam: one square per step.'],
            ['Spacing of the marks', 'Step length. Marks bunch up where an optimizer is slow, and spread out where it is fast.'],
            ['Small arrow at each head', '$-\\nabla L$ at the current position: where the slope says to go, which momentum and Adam do not always obey.'],
            ['Rings at the end', 'An optimizer has settled; dashed circles and leaders mark local and global minima.'],
            ['Legend, top', 'Each optimizer’s learning rate, step, loss and outcome.'],
            ['Chart, bottom right', 'Loss above the minimum on a log scale, one line per optimizer. A curve that flattens high has stopped in a local minimum; momentum’s curve wiggles as it oscillates in the basin.'],
            ['Scale bar', 'One unit of $\\theta$ on the map.'],
          ],
        },
        {
          type: 'h',
          text: 'Each 12-second cycle',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Morph, 0–1.4 s.** The previous landscape’s contours flow into the new one’s.',
            '**Set, 1–2 s.** θ₀ marks the start; the hatching and contour labels appear.',
            '**Race, 1.6–9.6 s.** Two hundred steps, trails drawing on, the chart drawing alongside.',
            '**Settle and hold, to 11.2 s.** Rings at each resting place, minima marked.',
            '**Release, 11.2–12 s.** The trails fade and the next landscape begins to form.',
          ],
        },
        {
          type: 'p',
          text: 'As each race finishes, a dashed crosshair glides to an open spot on the map and pulses, with the words *click the map* — the cue that you can drop your own starting point. It stops appearing once you have.',
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
            '**Two dimensions.** Real losses live in millions of dimensions, where intuitions from contour maps can mislead: local minima are rarer, saddles far more common, and “valleys” are high-dimensional and mostly flat.',
            '**No noise.** The walker labeled SGD sees the exact gradient. Real stochastic gradients are noisy estimates, which changes how optimizers behave around saddles and narrow minima.',
            '**Tuned for the story.** Each landscape has its own learning rates, chosen so the race reads clearly in two hundred steps. The outcomes are sensitive to them: on landscape A, momentum with $\\eta = 0.02$ instead of 0.03 stays in the first basin too. Which optimizer “wins” here says nothing general about which is better.',
            '**Designed functions.** The landscapes are sums of simple terms, made to show one difficulty each; real loss surfaces are not drawn from a short formula.',
            '**Interpolated playback.** Between stored steps, the trail head slides along a straight line; the optimizers themselves only ever take discrete steps.',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Previous or next landscape' },
      { keys: ['R', 'Space'], action: 'Rerun from the landscape’s own start' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Click or tap the map to start all three optimizers from there' },
      { gesture: 'move', action: 'Hover to read the loss and the downhill direction at the pointer' },
    ],
    tip: 'On landscape A, drop a start just past the hump, between the two basins — then on the far side of the first basin — and watch which optimizers change their minds.',
  },
  further: [
    { title: 'Méthode générale pour la résolution des systèmes d’équations simultanées', by: 'Augustin-Louis Cauchy', year: '1847', note: '*Comptes rendus de l’Académie des sciences*. Gradient descent’s first appearance.' },
    { title: 'A Stochastic Approximation Method', by: 'Herbert Robbins, Sutton Monro', year: '1951' },
    { title: 'Some methods of speeding up the convergence of iteration methods', by: 'Boris T. Polyak', year: '1964', note: 'The heavy-ball method.' },
    { title: 'Learning representations by back-propagating errors', by: 'David E. Rumelhart, Geoffrey E. Hinton, Ronald J. Williams', year: '1986' },
    { title: 'Adaptive Subgradient Methods for Online Learning and Stochastic Optimization', by: 'John Duchi, Elad Hazan, Yoram Singer', year: '2011', note: 'AdaGrad.' },
    { title: 'Adam: A Method for Stochastic Optimization', by: 'Diederik P. Kingma, Jimmy Ba', year: '2014' },
    { title: 'On the Convergence of Adam and Beyond', by: 'Sashank J. Reddi, Satyen Kale, Sanjiv Kumar', year: '2018' },
    { title: 'Identifying and attacking the saddle point problem in high-dimensional non-convex optimization', by: 'Yann N. Dauphin, Razvan Pascanu, Caglar Gulcehre, Kyunghyun Cho, Surya Ganguli, Yoshua Bengio', year: '2014' },
    { title: 'The Loss Surfaces of Multilayer Networks', by: 'Anna Choromanska, Mikael Henaff, Michael Mathieu, Gérard Ben Arous, Yann LeCun', year: '2015' },
    { title: 'Why Momentum Really Works', by: 'Gabriel Goh', year: '2017', note: '*Distill*. An interactive essay.' },
    { title: 'An overview of gradient descent optimization algorithms', by: 'Sebastian Ruder', year: '2016', note: 'A readable survey of the whole family.' },
    { title: 'Marching Cubes: A High Resolution 3D Surface Construction Algorithm', by: 'William E. Lorensen, Harvey E. Cline', year: '1987' },
  ],
}

export default guide
