import type { Guide } from '../guide'

/*
 * Notes for motion/diffusion — FIG. M.02, reverse diffusion with an ideal denoiser.
 */

const forwardReverse = `<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" font-family="ui-monospace, Menlo, monospace" font-size="8" letter-spacing="0.8">
<path d="M30 38 l14 -14 l14 14 l-14 14 z" stroke="#7FB6D9"/>
<g fill="currentColor" stroke="none" fill-opacity="0.85">
<circle cx="128" cy="26" r="1.2"/><circle cx="140" cy="31" r="1.2"/><circle cx="133" cy="44" r="1.2"/><circle cx="146" cy="40" r="1.2"/><circle cx="122" cy="38" r="1.2"/><circle cx="150" cy="24" r="1.2"/><circle cx="138" cy="50" r="1.2"/>
<circle cx="214" cy="18" r="1.2"/><circle cx="246" cy="30" r="1.2"/><circle cx="224" cy="52" r="1.2"/><circle cx="258" cy="46" r="1.2"/><circle cx="206" cy="40" r="1.2"/><circle cx="238" cy="14" r="1.2"/><circle cx="232" cy="60" r="1.2"/><circle cx="266" cy="24" r="1.2"/><circle cx="202" cy="58" r="1.2"/>
</g>
<path d="M70 38H108M104 35l4 3-4 3M164 38H192M188 35l4 3-4 3" stroke-opacity="0.7"/>
<path d="M192 84H164M168 81l-4 3 4 3M108 84H70M74 81l-4 3 4 3" stroke="#9DB9A0"/>
<g fill="currentColor" stroke="none">
<text x="28" y="72">x₀  DATA</text><text x="118" y="72">x_t</text><text x="204" y="72">x_T ≈ N(0, I)</text>
<text x="72" y="30" opacity="0.8">ADD NOISE</text><text x="170" y="30" opacity="0.8">… T STEPS</text>
<text x="72" y="100" fill="#9DB9A0">DENOISE</text><text x="170" y="100" fill="#9DB9A0">… T STEPS</text>
<text x="28" y="114" opacity="0.6">FORWARD: FIXED, EASY · REVERSE: LEARNED, THE MODEL</text></g>
</svg>`

const guide: Guide = {
  lede:
    'How image generators make pictures out of static, shown with two thousand points instead of millions of pixels. A cloud of pure noise is denoised over a thousand steps until it becomes a shape — a monogram, a flower, a bird, a word — then dissolved back into noise for the next.',
  facts: [
    ['Process', 'Denoising diffusion (Sohl-Dickstein et al., 2015; Ho et al., 2020)'],
    ['Schedule', 'Cosine, $s = 0.008$ (Nichol & Dhariwal, 2021), $T = 1000$'],
    ['Sampler', 'DDIM (Song, Meng & Ermon, 2021), $\\eta = 0.35$'],
    ['Denoiser', 'Ideal: each particle is steered toward its own point on the shape'],
    ['Inset', 'The optimal denoiser $E[x_0 | x_t]$ for the shape, computed exactly'],
    ['Particles', '2,200 (760 in the preview), each one 2-D sample'],
    ['Targets', 'ZB monogram, flower, bird in flight, “Play” in Instrument Serif'],
    ['Loop', '4 × 10.5 s: 6 s reverse, 2 s hold, 2.5 s forward'],
    ['Ground', 'Night'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Making something by unmaking it',
      blocks: [
        {
          type: 'p',
          text: 'Take a photograph and add a little random noise to every pixel. Then a little more, and more, a thousand times, until nothing is left but static. Each small step is easy to describe and easy to compute; the whole sequence destroys the picture completely. A **diffusion model** is a neural network trained to run that film backward: shown a noisy image and told how noisy it is, it predicts the noise, so that a little of it can be taken away. Start from pure static, apply the network a few dozen or a thousand times, and a new picture appears — one that was never in the training data but looks as if it could have been.',
        },
        {
          type: 'p',
          text: 'The idea was introduced in 2015 by Jascha Sohl-Dickstein, Eric Weiss, Niru Maheswaranathan and Surya Ganguli, borrowing from non-equilibrium thermodynamics: destroy structure slowly with a known diffusion process, and learn the reverse. For five years it was a curiosity. Then, in 2020, Jonathan Ho, Ajay Jain and Pieter Abbeel showed that with a simple training objective — predict the noise that was added — *denoising diffusion probabilistic models* could generate images as good as the best generative adversarial networks. In parallel Yang Song and Stefano Ermon had developed *score-based* models that learn the gradient of the data’s log-density at many noise levels, and in 2021 Song and colleagues showed the two were the same idea, written as stochastic differential equations.',
        },
        {
          type: 'p',
          text: 'Improvements arrived quickly. Alex Nichol and Prafulla Dhariwal introduced the **cosine noise schedule** used here, which destroys information more evenly than the original linear one, and then showed diffusion beating GANs on ImageNet. Jiaming Song, Chenlin Meng and Stefano Ermon’s **DDIM** sampler — the one in this piece — made it possible to sample in far fewer steps than the model was trained with. Robin Rombach and colleagues ran the process in the compressed *latent* space of an autoencoder rather than on pixels, which is the design of Stable Diffusion, and Jonathan Ho and Tim Salimans’s *classifier-free guidance* made it practical to steer generation with a text prompt. Most of the image and video generators of the last few years are built on these pieces.',
        },
        {
          type: 'h',
          text: 'Why points',
        },
        {
          type: 'p',
          text: 'An image is a single point in a space with one dimension per pixel value — millions of dimensions — and a diffusion model moves that one point. You cannot draw that. But the mathematics does not care about the dimension, so the piece does the same thing in two: each of 2,200 particles is one sample, a point in the plane, and the “data” are the points of a shape. Pure noise is a round Gaussian cloud. Each particle, denoised step by step, lands somewhere on the shape, and together they draw it. The cloud of particles is a picture of the *distribution* — what an image model’s outputs would look like if you could generate thousands at once and plot them.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Noise in, noise out',
      blocks: [
        {
          type: 'h',
          text: 'The forward process',
        },
        {
          type: 'p',
          text: 'Start from a data point $x_0$. Each forward step shrinks it slightly and adds Gaussian noise, with a small variance $\\beta_t$ set by the *schedule*:',
        },
        { type: 'math', tex: String.raw`q(x_t | x_{t-1}) = \mathcal{N}(\sqrt{1 - \beta_t}\, x_{t-1}, \; \beta_t I)`, label: '(1)' },
        {
          type: 'p',
          text: 'Because Gaussians compose, you can jump straight to any step. Writing $\\bar{\\alpha}_t = \\prod_{s \\leq t} (1 - \\beta_s)$, the fraction of the original signal’s power that survives to step $t$:',
        },
        { type: 'math', tex: String.raw`x_t = \sqrt{\bar{\alpha}_t}\, x_0 + \sqrt{1 - \bar{\alpha}_t}\, \epsilon, \qquad \epsilon \sim \mathcal{N}(0, I)`, label: '(2)' },
        {
          type: 'p',
          text: 'This is the formula set in the top left of the piece. At $t = 0$, $\\bar{\\alpha} = 1$ and $x_t$ is the data; at $t = T$, $\\bar{\\alpha} \\approx 0$ and $x_t$ is pure noise, whatever $x_0$ was. The **signal-to-noise ratio** $\\bar{\\alpha}_t / (1 - \\bar{\\alpha}_t)$ falls from infinity to zero along the way; the readout shows it.',
        },
        {
          type: 'h',
          text: 'The cosine schedule',
        },
        {
          type: 'p',
          text: 'Ho and colleagues used a linear schedule for $\\beta_t$. Nichol and Dhariwal noticed that with it the last stretch of steps is spent on images that are already almost pure noise, contributing little; information is destroyed too quickly. They proposed defining $\\bar{\\alpha}$ directly, so that it falls more evenly:',
        },
        { type: 'math', tex: String.raw`\bar{\alpha}_t = \frac{f(t)}{f(0)}, \qquad f(t) = \cos^2 ( \frac{t / T + s}{1 + s} \cdot \frac{\pi}{2} ), \quad s = 0.008`, label: '(3)' },
        {
          type: 'p',
          text: 'The small offset $s$ keeps the first steps from being vanishingly small. The chart in the corner draws $\\sqrt{\\bar{\\alpha}_t}$, the signal’s amplitude, as a solid sky line falling from 1 to 0, and $\\sqrt{1 - \\bar{\\alpha}_t}$, the noise’s, dashed and rising; the playhead marks the current step.',
        },
        {
          type: 'h',
          text: 'What the network learns',
        },
        {
          type: 'p',
          text: 'Training is almost embarrassingly simple. Take a training image $x_0$, a random step $t$ and random noise $\\epsilon$, form $x_t$ by (2), and ask a network $\\epsilon_\\theta$ to recover the noise:',
        },
        { type: 'math', tex: String.raw`\mathcal{L} = E_{x_0, t, \epsilon} \, | \epsilon - \epsilon_\theta(x_t, t) |^2`, label: '(4)' },
        {
          type: 'p',
          text: 'Predicting the noise is equivalent to predicting the clean data, since (2) can be solved for either: $\\hat{x}_0 = (x_t - \\sqrt{1 - \\bar{\\alpha}_t}\\, \\hat{\\epsilon}) / \\sqrt{\\bar{\\alpha}_t}$. It is also equivalent to learning the **score**, the gradient of the log-density of the noisy data, $\\nabla \\log p_t(x_t) = -\\hat{\\epsilon} / \\sqrt{1 - \\bar{\\alpha}_t}$ — the direction in which the data become more likely. Pascal Vincent showed in 2011 that denoising and score matching are the same problem; that identity is what ties the diffusion and score-based views together.',
        },
        {
          type: 'h',
          text: 'The best possible denoiser',
        },
        {
          type: 'p',
          text: 'Given a noisy point, the prediction of $x_0$ that minimizes the squared error is the average of all the clean points that could have produced it, weighted by how likely each is. For data made of $M$ points $x^{j}$ that average can be written exactly. Each candidate is weighted by the Gaussian likelihood of having been noised into $x_t$:',
        },
        { type: 'math', tex: String.raw`E[x_0 | x_t] = \sum_{j=1}^{M} w_j \, x^{j}, \qquad w_j \propto \exp( -\frac{| x_t - \sqrt{\bar{\alpha}_t}\, x^{j} |^2}{2 (1 - \bar{\alpha}_t)} )`, label: '(5)' },
        {
          type: 'p',
          text: 'At high noise the weights are nearly equal, and the best guess is the middle of the data — a blur. As the noise falls, the weights concentrate on the candidates near the particle, and the guess sharpens into one region of the shape and finally one point. The inset in the piece draws this, computed exactly for 260 of the particles against 280 points of the shape. It is the most revealing thing on screen: a gray smudge that unfolds into the target while the particles themselves are still a cloud.',
        },
        {
          type: 'h',
          text: 'DDIM sampling',
        },
        {
          type: 'p',
          text: 'With a denoiser in hand, each reverse step uses the current prediction to move a little toward the data while keeping the right amount of noise. DDIM writes the step as: go to where $\\hat{x}_0$ would be at step $t-1$, point back along the predicted noise, and optionally add fresh noise:',
        },
        { type: 'math', tex: String.raw`x_{t-1} = \sqrt{\bar{\alpha}_{t-1}}\, \hat{x}_0 + \sqrt{1 - \bar{\alpha}_{t-1} - \sigma_t^2}\; \hat{\epsilon} + \sigma_t z, \qquad z \sim \mathcal{N}(0, I)`, label: '(6)' },
        { type: 'math', tex: String.raw`\sigma_t = \eta \, \sqrt{\frac{1 - \bar{\alpha}_{t-1}}{1 - \bar{\alpha}_t}} \, \sqrt{1 - \frac{\bar{\alpha}_t}{\bar{\alpha}_{t-1}}}`, label: '(7)' },
        {
          type: 'p',
          text: 'With $\\eta = 1$ this is the original stochastic DDPM sampler; with $\\eta = 0$ it is deterministic, every noise sample $x_T$ mapping to exactly one output. The piece uses $\\eta = 0.35$, a little fresh noise per step, which keeps the particles’ trails lively without changing where they end up.',
        },
        { type: 'figure', svg: forwardReverse, alt: 'Data on the left, a noisy version in the middle, pure noise on the right. Arrows to the right are the fixed forward process; arrows to the left are the learned reverse process.', caption: 'The forward process is fixed and needs no learning. All of a diffusion model’s knowledge lives in the reverse direction — in the denoiser.' },
      ],
    },
    {
      id: 'how-it-works',
      kicker: 'How the piece works',
      title: 'An ideal denoiser, honestly labeled',
      blocks: [
        {
          type: 'p',
          text: 'The piece has no trained network. Its denoiser is *ideal* in the strongest sense: every particle is paired, when a sample begins, with one point $x^{i}$ on the target shape, and the reverse steps use that point as $\\hat{x}_0$. The predicted noise follows from (2), and the update is the DDIM step (6), exactly:',
        },
        {
          type: 'code',
          code: `function denoise(t: number) {
  const at = ABAR[t]
  const ap = ABAR[t - 1]
  const sa = Math.sqrt(at)
  const s1 = Math.sqrt(1 - at)
  const sig = ETA * Math.sqrt((1 - ap) / (1 - at)) * Math.sqrt(Math.max(0, 1 - at / ap))
  const dirC = Math.sqrt(Math.max(0, 1 - ap - sig * sig))
  const sap = Math.sqrt(ap)
  const xy = cur.xy
  for (let i = 0; i < N; i++) {
    // each particle is denoised toward its own sample of the shape
    const px0 = xy[i * 2]
    const py0 = xy[i * 2 + 1]
    const epx = (x[i] - sa * px0) / s1
    const epy = (y[i] - sa * py0) / s1
    x[i] = sap * px0 + dirC * epx + (sig > 0 ? sig * gauss(noise) : 0)
    y[i] = sap * py0 + dirC * epy + (sig > 0 ? sig * gauss(noise) : 0)
  }
}`,
          caption: 'One DDIM step for all particles. `x̂₀` is the particle’s own target, `ε̂` follows from equation (2), and `sig` is $\\sigma_t$ from equation (7).',
        },
        {
          type: 'p',
          text: 'This is not a cheat on the arithmetic. If $x_T$ is drawn from $\\mathcal{N}(0, I)$ and every step uses the true $x_0$, then at every step each particle is distributed exactly as $\\mathcal{N}(\\sqrt{\\bar{\\alpha}_t} x^{i}, (1 - \\bar{\\alpha}_t) I)$ — the true marginal of the forward process. So the cloud on screen, at every $t$, looks exactly as a cloud of noised samples of the shape should: round and featureless at first, then a blurred shape, then the shape. What it is not is a learned model. A real sampler does not know which point each particle is headed for; it has only $E[x_0 | x_t]$, the blurred average in the inset, and a particle commits to a destination gradually as the noise falls. In the piece every particle knows its destination from the first step, so its individual path is straighter than a real sampler’s would be — the population is right, the biographies are idealized.',
        },
        {
          type: 'aside',
          title: 'What a learned network would do instead',
          text: 'A trained diffusion model is a network $\\epsilon_\\theta$ that approximates the optimal denoiser from finitely many examples. If it matched equation (5) exactly for its training set, it would only ever reproduce training examples — and large image models can, occasionally, regurgitate memorized images, as Nicholas Carlini and colleagues showed in 2023. They usually do not, because a network with limited capacity, trained on a huge and varied dataset, learns a smoother function than (5): one that interpolates between examples and generalizes to new ones. Zahra Kadkhodaie and colleagues argued in 2024 that this generalization comes from biases in the network’s architecture that suit natural images. In this piece the “dataset” is the shape itself, so the ideal denoiser *is* the right answer: it is the denoiser a perfect model of these points would have.',
        },
        {
          type: 'h',
          text: 'The inset',
        },
        {
          type: 'p',
          text: 'The inset computes equation (5) for real: for 260 of the particles, a softmax over the squared distances to 280 points of the shape, at the current noise level, refreshed every few steps. Using the same log-sum-exp trick as any softmax, it subtracts the largest exponent before exponentiating so nothing overflows:',
        },
        {
          type: 'code',
          code: `const inv = 1 / (2 * (1 - at))
for (let i = 0; i < K; i++) {
  let mx = -Infinity
  for (let j = 0; j < M; j++) {
    const dx = x[i] - sa * xy[j * 2]
    const dy = y[i] - sa * xy[j * 2 + 1]
    const l = -(dx * dx + dy * dy) * inv
    wts[j] = l
    if (l > mx) mx = l
  }
  let sw = 0, sx = 0, sy = 0
  for (let j = 0; j < M; j++) {
    const e = Math.exp(wts[j] - mx)
    sw += e
    sx += e * xy[j * 2]
    sy += e * xy[j * 2 + 1]
  }
  hx[i] = sx / sw
  hy[i] = sy / sw
}`,
          caption: 'The optimal denoiser $E[x_0 | x_t]$ of equation (5): 260 × 280 weights per refresh, about seventy thousand exponentials.',
        },
        {
          type: 'h',
          text: 'Timing the steps',
        },
        {
          type: 'p',
          text: 'Played at a constant rate, a thousand steps of the cosine schedule would show a long stretch of static and then a sudden snap, because most of the visible change happens in a narrow band of noise levels. Samplers face the same problem and space their steps unevenly. The piece spaces them evenly in **log signal-to-noise ratio**, $\\lambda_t = \\log(\\bar{\\alpha}_t / (1 - \\bar{\\alpha}_t))$, from about −14 at $t = 1000$ to 8 near $t = 0$, with a quick pass through the first stretch of pure noise. Every factor of ten in signal gets about the same screen time, so you see the cloud contract, the shape blur into existence, and the last crisp refinement, all at a readable pace. The six-second reverse phase still takes all 1,000 DDIM steps, one at a time — they are cheap, a few per frame at most.',
        },
        {
          type: 'p',
          text: 'The data are scaled so the shapes span ±1.6 against unit-variance noise. That matters: the signal-to-noise ratio, and so the moment the shape appears, depends on the size of the data relative to the noise. Image models face the same question, which is one reason the right schedule depends on image resolution.',
        },
        {
          type: 'h',
          text: 'The shapes',
        },
        {
          type: 'list',
          items: [
            '**The monogram** comes straight from the site’s logo paths. A small SVG path flattener in the piece (it handles lines, cubic Béziers and elliptical arcs, converting arcs from endpoint to center form as the SVG specification describes) turns the hexagon, the Z and the B into polylines, and points are sampled evenly along their length with a slight spread across the stroke.',
            '**The flower** is a five-petaled rose curve $r = 0.6 \\cos 5\\theta$ with a smaller rotated rose inside it, two rings at the center, and a stem and leaves drawn as Bézier curves.',
            '**The bird** is an outline drawn as cubic Béziers. About 40% of its points are sampled along the outline and the rest inside it, from the pixels of the silhouette rasterized on an offscreen canvas.',
            '**“Play”** is set in italic Instrument Serif on an offscreen canvas and its pixels sampled. Because the web font may not have loaded when the piece starts, the word is resampled once it has.',
          ],
        },
        {
          type: 'p',
          text: 'Each shape is normalized, shuffled (so which particle goes where is random) and colored in groups: the hexagon in paper white, the Z in sky, the B in sage, and so on. A particle’s color fades from paper toward its group’s color as $\\bar{\\alpha}$ rises, so the color, like the shape, emerges from the noise.',
        },
        {
          type: 'h',
          text: 'Rendering',
        },
        {
          type: 'p',
          text: 'Particle positions live in `Float32Array`s. Every frame, each particle draws a hairline from where it was one frame ago to where it is now, and a small square at its position; all of a color group’s trails go in one path and all of its squares in another, so the whole cloud is a dozen draw calls. Jumps longer than 26 pixels — the large early steps — are drawn fainter, so the opening reads as a soft shimmer rather than a scribble. The night ground, with its two glows, is painted once into an offscreen canvas and copied each frame.',
        },
        {
          type: 'h',
          text: 'Scrubbing',
        },
        {
          type: 'p',
          text: 'Dragging sets $t$ by hand. When the drag begins, the piece solves equation (2) backward for each particle’s noise, $\\epsilon = (x_t - \\sqrt{\\bar{\\alpha}_t}\\, x_0) / \\sqrt{1 - \\bar{\\alpha}_t}$, and holds it fixed; every position during the drag is then $\\sqrt{\\bar{\\alpha}_t} x_0 + \\sqrt{1 - \\bar{\\alpha}_t}\\, \\epsilon$ for the $t$ under your hand. That is exactly the path deterministic DDIM ($\\eta = 0$) would take with the ideal denoiser, so scrubbing back and forth is running the sampler in both directions. When you let go, the stochastic sampler takes over again from that step.',
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
            ['Particles and trails', 'Each particle is one 2-D sample; its hairline is how far it moved this frame.'],
            ['Particle color', 'Fades from paper to the shape’s colors as the signal $\\bar{\\alpha}$ rises.'],
            ['t counter', 'The diffusion step, 1000 (pure noise) to 0 (data). Sky at 0.'],
            ['Phase line', 'REVERSE $p_\\theta(x_{t-1} | x_t)$, SAMPLE at t = 0, FORWARD $q(x_t | x_0)$, or SCRUB.'],
            ['ᾱ and SNR', 'The signal fraction and the signal-to-noise ratio at this step.'],
            ['Inset', '$\\hat{x}_0 = E[x_0 | x_t]$, the ideal denoiser’s guess for 260 particles; at rest, the sample itself.'],
            ['Schedule chart', '$\\sqrt{\\bar{\\alpha}_t}$ solid sky (signal), $\\sqrt{1 - \\bar{\\alpha}_t}$ dashed (noise), playhead at the current $t$, with a handle you can drag.'],
            ['Crop marks and ring', 'The sample has landed: SAMPLE nn · x₀ ~ p(x), with its name.'],
          ],
        },
        {
          type: 'h',
          text: 'Each 10.5-second sample',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Noise, 0–1 s.** The cloud is round and featureless; the counter runs through the first hundred-odd steps, where nothing visible happens. The inset already shows a tight gray knot: the mean of the shape.',
            '**Emergence, 1–4 s.** The cloud contracts and takes on the shape’s outline, blurred; the inset unfolds from a smudge into the shape.',
            '**Refinement, 4–6 s.** The last ninety or so steps tighten every particle onto its line or letter, and the colors come in.',
            '**Hold, 6–8 s.** The sample, crisp, framed by crop marks; a ring releases from it.',
            '**Forward, 8–10.5 s.** Equation (2) with fresh noise and rising $t$ dissolves it back into the Gaussian cloud, and the next target begins.',
          ],
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
            '**There is no learned model.** The denoiser is ideal: each particle is steered toward its own preassigned point on the shape. The cloud at every step has the correct distribution, but individual particles take straighter paths than a real sampler’s would, because they never have to choose a destination. The inset shows what a perfect model would actually predict.',
            '**Two dimensions, not millions.** Each “image” here is a single point in the plane. The equations are identical in any dimension, but nothing in two dimensions captures how strange and sparse the space of images is.',
            '**The data are a drawing.** The shapes are point sets made for the piece, not a dataset of examples; generating “a new flower” here means landing on this flower.',
            '**Paced for the eye.** Steps are spaced in log-SNR and run on a fixed clock, and the shapes are scaled to ±1.6 so that the emergence happens in the middle of the reverse phase. The schedule’s last step is clamped ($\\bar{\\alpha}_T = 10^{-6}$ rather than exactly 0).',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['←', '→'], action: 'Step the noise level by 25 (the sampler resumes after a moment)' },
      { keys: ['N'], action: 'Dissolve now and move on to the next sample' },
      { keys: ['Space'], action: 'Pause or resume' },
    ],
    gestures: [
      { gesture: 'drag', action: 'Drag left or right anywhere to scrub the noise level t; drag the playhead on the schedule to set it directly' },
    ],
    tip: 'While a sample holds, drag slowly to the right: by t ≈ 250 the monogram has melted into a blob, but the inset — the ideal denoiser’s guess — still recovers much of its outline.',
  },
  further: [
    { title: 'Deep Unsupervised Learning using Nonequilibrium Thermodynamics', by: 'Jascha Sohl-Dickstein, Eric A. Weiss, Niru Maheswaranathan, Surya Ganguli', year: '2015', note: 'The first diffusion model.' },
    { title: 'Denoising Diffusion Probabilistic Models', by: 'Jonathan Ho, Ajay Jain, Pieter Abbeel', year: '2020', note: 'The noise-prediction objective and DDPM sampling.' },
    { title: 'Generative Modeling by Estimating Gradients of the Data Distribution', by: 'Yang Song, Stefano Ermon', year: '2019' },
    { title: 'Score-Based Generative Modeling through Stochastic Differential Equations', by: 'Yang Song, Jascha Sohl-Dickstein, Diederik P. Kingma, Abhishek Kumar, Stefano Ermon, Ben Poole', year: '2021' },
    { title: 'Denoising Diffusion Implicit Models', by: 'Jiaming Song, Chenlin Meng, Stefano Ermon', year: '2021', note: 'DDIM and the η parameter.' },
    { title: 'Improved Denoising Diffusion Probabilistic Models', by: 'Alex Nichol, Prafulla Dhariwal', year: '2021', note: 'The cosine schedule.' },
    { title: 'Diffusion Models Beat GANs on Image Synthesis', by: 'Prafulla Dhariwal, Alex Nichol', year: '2021' },
    { title: 'High-Resolution Image Synthesis with Latent Diffusion Models', by: 'Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser, Björn Ommer', year: '2022' },
    { title: 'Classifier-Free Diffusion Guidance', by: 'Jonathan Ho, Tim Salimans', year: '2022' },
    { title: 'A Connection Between Score Matching and Denoising Autoencoders', by: 'Pascal Vincent', year: '2011' },
    { title: 'Elucidating the Design Space of Diffusion-Based Generative Models', by: 'Tero Karras, Miika Aittala, Timo Aila, Samuli Laine', year: '2022', note: 'Step spacing, noise levels and samplers, clearly laid out.' },
    { title: 'Extracting Training Data from Diffusion Models', by: 'Nicholas Carlini, Jamie Hayes, Milad Nasr, Matthew Jagielski, Vikash Sehwag, Florian Tramèr, Borja Balle, Daphne Ippolito, Eric Wallace', year: '2023' },
    { title: 'Generalization in diffusion models arises from geometry-adaptive harmonic representations', by: 'Zahra Kadkhodaie, Florentin Guth, Eero P. Simoncelli, Stéphane Mallat', year: '2024' },
  ],
}

export default guide
