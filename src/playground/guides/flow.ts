import type { Guide } from '../guide'

const curl = `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g opacity="0.45"><ellipse cx="110" cy="90" rx="78" ry="56"/><ellipse cx="110" cy="90" rx="52" ry="36"/><ellipse cx="110" cy="90" rx="26" ry="17"/></g>
<path d="M110 34 L150 34" stroke-width="1.3"/><path d="M144 30 L151 34 L144 38"/>
<path d="M188 90 L188 128" stroke-width="1.3"/><path d="M184 122 L188 129 L192 122"/>
<path d="M110 146 L70 146" stroke-width="1.3"/><path d="M76 142 L69 146 L76 150"/>
<path d="M32 90 L32 52" stroke-width="1.3"/><path d="M28 58 L32 51 L36 58"/>
<path d="M232 70 Q262 40 292 70 T292 120" stroke-dasharray="2 3"/>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="9" letter-spacing="1">
<text x="98" y="94">ψ MAX</text><text x="214" y="30">CONTOURS OF ψ</text><text x="214" y="44" opacity="0.7">ARE STREAMLINES</text>
<text x="214" y="150">v = (∂ψ/∂y, −∂ψ/∂x)</text><text x="214" y="164" opacity="0.7">∇ · v = 0</text></g>
</svg>`

const guide: Guide = {
  lede:
    'Three thousand weightless particles ride a velocity field built from noise. Each leaves a hairline, and the hairlines comb themselves into silk; every ten seconds the page turns and the fluid changes character.',
  facts: [
    ['Particles', '3,000 (900 in the preview)'],
    ['Field', 'Curl of 3-D simplex noise, sampled on a grid'],
    ['Pages', 'Laminar · turbulent · vortex street, 10 s each'],
    ['Integration', 'Forward Euler, one step per frame'],
    ['Strokes', 'Four paths per frame, one per colour band'],
    ['Buffer', 'Opaque offscreen canvas, faded toward paper'],
    ['Script cost', 'About 2 ms per frame at 1920 × 1080'],
    ['Ground', 'Paper'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Drawing the invisible',
      blocks: [
        {
          type: 'p',
          text: 'Moving air and water are transparent. To see a flow at all you have to put something in it that the flow carries — smoke, dye, aluminium flakes, soap film, hydrogen bubbles — and then look at the marks it leaves. Osborne Reynolds did exactly this in 1883, threading a fine stream of dye into water flowing through a glass pipe. At low speeds the dye stayed a single straight thread; past a certain speed it suddenly broke up and filled the pipe. He called the two regimes *direct* and *sinuous*. We call them laminar and turbulent, and the dimensionless number that separates them carries his name.',
        },
        {
          type: 'p',
          text: 'Flow visualization became a science and an art at once. Ludwig Prandtl filmed water channels sprinkled with particles; Milton Van Dyke’s *An Album of Fluid Motion* (1982) collected hundreds of photographs that are still the best introduction to how fluids behave. More recently the same idea moved onto screens: Fernanda Viégas and Martin Wattenberg’s *Wind Map* (2012) and Cameron Beccario’s *earth* (2013) drew live wind forecasts as thousands of short-lived streaks, and the look — faint lines that crowd together where the flow converges and thin out where it spreads — became a visual language of its own. Generative artists took it further still, dropping particles into invented fields and letting them trace long hairlines until the canvas reads like combed ink or wood grain.',
        },
        {
          type: 'p',
          text: 'This piece belongs to that last tradition. The fields are invented, not computed from physics — but each page is shaped to show one real regime of fluid motion, and the annotation on the paper explains which.',
        },
        {
          type: 'h',
          text: 'Laminar, turbulent, and in between',
        },
        {
          type: 'p',
          text: 'The **Reynolds number** compares the inertia of a flow, which tends to amplify disturbances, with its viscosity, which damps them:',
        },
        {
          type: 'math',
          tex: String.raw`\mathrm{Re} = \frac{U L}{\nu}`,
          label: '(1)',
          caption: '$U$ a typical speed, $L$ a typical length (a pipe’s diameter, a cylinder’s width), $\\nu$ the kinematic viscosity.',
        },
        {
          type: 'p',
          text: 'At low Reynolds numbers viscosity wins and neighbouring layers of fluid slide past one another in order — *laminar* flow, from the Latin for a thin plate. Between two parallel walls driven by a steady pressure difference, the laminar solution is the **plane Poiseuille flow**: still at the walls, fastest on the centreline, with a velocity profile that is exactly a parabola. At high Reynolds numbers inertia wins, small disturbances grow faster than viscosity can smooth them, and the flow fills with eddies of every size, each feeding smaller ones — *turbulence*, still counted among the great open problems of classical physics.',
        },
        {
          type: 'p',
          text: 'In between lies one of the most beautiful patterns in nature. Flow past a cylinder at a Reynolds number of roughly fifty to a few hundred does not stay symmetric: vortices peel off the top and bottom of the cylinder alternately and drift downstream in two staggered rows. Henri Bénard studied the pattern in 1908; Theodore von Kármán explained in 1911 why that staggered arrangement is the one that survives, and the **Kármán vortex street** now bears his name. You can see it in clouds downwind of islands, hear it as the hum of telephone wires in a breeze (the frequency Vincenc Strouhal measured in 1878), and feel it as the shudder that engineers design chimneys and bridges to avoid.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'Mathematics',
      title: 'Divergence-free by construction',
      blocks: [
        {
          type: 'h',
          text: 'Why curl',
        },
        {
          type: 'p',
          text: 'Water is very nearly incompressible: as much fluid flows into any small region as flows out. For a velocity field $\\vec{v} = (u, w)$ that is the condition $\\nabla \\cdot \\vec{v} = 0$. A field built from raw noise does not satisfy it; particles drift into sinks and pile up in clumps, which looks like dust, not fluid. The fix, popularized for graphics by Robert Bridson and colleagues in 2007, is to build the field as the **curl** of a scalar *stream function* $\\psi$:',
        },
        {
          type: 'math',
          tex: String.raw`\vec{v} = \left( \frac{\partial \psi}{\partial y}, \; -\frac{\partial \psi}{\partial x} \right) \quad \Rightarrow \quad \nabla \cdot \vec{v} = \frac{\partial^2 \psi}{\partial x \, \partial y} - \frac{\partial^2 \psi}{\partial y \, \partial x} = 0`,
          label: '(2)',
        },
        {
          type: 'p',
          text: 'Mixed partial derivatives commute, so the divergence vanishes identically, whatever $\\psi$ is. There is a second gift: the velocity is always perpendicular to the gradient of $\\psi$, so particles move *along* the contour lines of the stream function. Draw $\\psi$ as a topographic map and the streamlines are its contours; the flow circles every hill and every valley. Choose $\\psi$ to be smooth noise and you get a field of interlocking eddies that conserves area exactly — no clumping, no voids.',
        },
        {
          type: 'figure',
          svg: curl,
          alt: 'Concentric contour ellipses around a maximum of the stream function, with velocity arrows tangent to them circling clockwise.',
          caption: 'Velocity from a stream function runs along its contours: the flow circles each peak of $\\psi$.',
        },
        {
          type: 'p',
          text: 'Here $\\psi$ is three-dimensional **simplex noise** $n(x, y, z)$ — Ken Perlin’s 2001 successor to his 1985 gradient noise — with the third coordinate used as slow time. The derivatives are taken by central differences with a step of 0.01:',
        },
        {
          type: 'math',
          tex: String.raw`u \approx \frac{n(x, y + \epsilon, z) - n(x, y - \epsilon, z)}{2\epsilon}, \qquad w \approx -\frac{n(x + \epsilon, y, z) - n(x - \epsilon, y, z)}{2\epsilon}`,
          label: '(3)',
        },
        {
          type: 'p',
          text: 'Letting $z$ drift moves the hills of $\\psi$ around, so the streamlines slowly change. Particles that follow yesterday’s streamlines lay down hairlines at a slightly different angle from those following today’s, and the crossings at shallow angles are what make the texture read as woven rather than merely striped.',
        },
        {
          type: 'h',
          text: 'Flow past a cylinder',
        },
        {
          type: 'p',
          text: 'The third page adds two pieces of classical theory to the noise. Ideal (inviscid, irrotational) flow at speed $U$ past a cylinder of radius $R$ has the complex potential $W(z) = U(z + R^2 / z)$ with $z = x + iy$ measured from the cylinder’s centre. Differentiating gives the velocity:',
        },
        {
          type: 'math',
          tex: String.raw`u = U \left( 1 - \frac{R^2 (x^2 - y^2)}{r^4} \right), \qquad w = -U \, \frac{2 R^2 x y}{r^4}`,
          label: '(4)',
          caption: 'Streamlines part around the cylinder and close up behind it.',
        },
        {
          type: 'p',
          text: 'Ideal flow closes up perfectly behind the cylinder, which real flow never does, so the piece adds a wake (a band behind the cylinder where the stream runs slower) and a row of shed vortices. Each vortex of strength $\\Gamma$ induces a swirl around its centre. A point vortex has speed $\\Gamma / 2\\pi r$, which blows up at the centre; the piece softens it with a core radius $a$:',
        },
        {
          type: 'math',
          tex: String.raw`\vec{v}_\Gamma(\vec{r}) = \frac{\Gamma}{2\pi \, (r^2 + a^2)} \, (-r_y, \; r_x)`,
          label: '(5)',
        },
        {
          type: 'p',
          text: 'The vortices are shed alternately from the top and bottom at the frequency the **Strouhal number** predicts, $f = \\mathrm{St} \\, U / D$ with $\\mathrm{St} \\approx 0.21$ and $D = 2R$, drift downstream at about 86% of the free stream, and sit in two rows whose separation $h$ and spacing $a$ keep the ratio $h / a \\approx 0.281$ — von Kármán’s value for a street that neither collapses nor spreads.',
        },
        {
          type: 'h',
          text: 'Three ways to draw a flow',
        },
        {
          type: 'p',
          text: 'Fluid dynamicists distinguish three kinds of line, and it is worth knowing which one you are looking at. A **streamline** is everywhere tangent to the velocity at one instant: a snapshot of where the flow is pointing. A **pathline** is the track of one particle over time: what a long-exposure photograph of a single glowing speck would show. A **streakline** joins every particle that has passed through one fixed point: what you see when dye is let out continuously from a nozzle, or smoke from a chimney. In a steady flow the three coincide. In an unsteady flow — any flow whose pattern changes — they part company, sometimes dramatically.',
        },
        {
          type: 'p',
          text: 'This piece draws pathlines, or rather their recent past: each particle’s last second or two of motion, fading behind it. Because the field drifts slowly, those pathlines are close to the instantaneous streamlines, and the texture reads as a map of the flow. The dye released at the cylinder on the third page draws streaklines, and that is why it shows the rolled-up vortices so clearly, exactly as dye does in a water channel: the streakline remembers where the fluid has been, while a streamline only shows where it is going.',
        },
        {
          type: 'h',
          text: 'Advection',
        },
        {
          type: 'p',
          text: 'Each particle is a massless tracer: its velocity is the field’s velocity where it stands. Positions advance by one forward-Euler step per frame, $\\vec{p} \\leftarrow \\vec{p} + \\vec{v}(\\vec{p}) \\, \\Delta t$. Euler is the crudest integrator there is, but steps are small (a pixel or two), errors only nudge a particle onto a neighbouring streamline, and nobody can tell.',
        },
        {
          type: 'p',
          text: 'There is a quiet consequence of the zero divergence in equation (2). A divergence-free flow in the plane preserves area: a patch of particles can be stretched into a long thin filament, but its area never changes. So if particles start spread evenly they stay spread evenly, and the texture never develops bald patches or dark clots of its own accord. The piece still gives every particle a lifetime of a few seconds and reborn particles a random position — that keeps the density even at the edges, where particles leave the sheet, and gives the weave a steady supply of fresh starts.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'A field, a buffer and three thousand pens',
      blocks: [
        {
          type: 'h',
          text: 'The field on a grid',
        },
        {
          type: 'p',
          text: 'Evaluating curl noise costs four 3-D noise lookups. Doing that for three thousand particles every frame is affordable but wasteful, because the field is smooth on the scale of tens of pixels. Instead the noise part of the velocity is evaluated on a coarse grid — one sample every 3% of the frame’s short side — refreshed every other frame, and particles read it back with bilinear interpolation. One field function per page shapes its character:',
        },
        {
          type: 'code',
          code: `if (kind === 0) {
  // plane Poiseuille flow: a parabolic profile between two walls, gently perturbed
  const p = poiseuille((j * sp) / H)
  const c = nz.curl2(u * 0.9 + 3.1, v * 1.5, z)
  vx = U_LAM * (0.1 + 0.9 * p) + c[0] * 0.006
  vy = c[1] * 0.014 * (0.4 + p)
} else if (kind === 1) {
  const a = nz.curl2(u * 2.1, v * 2.1, z)
  const b = nz.curl2(u * 5.2 + 40, v * 5.2, z * 1.7 + 9)
  vx = 0.025 + a[0] * 0.075 + b[0] * 0.028
  vy = a[1] * 0.075 + b[1] * 0.028
} else {
  const c = nz.curl2(u * 2.4 + 8, v * 2.4, z)
  vx = c[0] * 0.012
  vy = c[1] * 0.012
}`,
          caption: 'Speeds are in short-sides per second, so the piece behaves the same at any size. Laminar: a parabola plus a whisper of noise. Turbulent: two octaves of curl. Vortex street: a little noise; the rest is analytic, per particle.',
        },
        {
          type: 'p',
          text: 'The vortex street’s cylinder flow and its dozen shed vortices are computed exactly for every particle, because a vortex core is too small for the grid to resolve:',
        },
        {
          type: 'code',
          code: `const r4 = r2 * r2
// the wake runs slower than the free stream
const wake = dx > 0 ? 0.55 * Math.exp(-((dy / (c.R * 1.6)) ** 2)) * Math.exp(-dx / (c.R * 34)) * smoothstep(0, c.R * 2, dx) : 0
const U = U_VOR * S * (1 - wake)
vx += U * (1 - (R2 * (dx * dx - dy * dy)) / r4)
vy += -U * ((2 * R2 * dx * dy) / r4)
const core = (S * 0.022) ** 2
for (let k = 0; k < nV; k++) {
  const ex = x - VX[k]
  const ey = y - VY[k]
  const q = (VG[k] * S * S) / (TAU * (ex * ex + ey * ey + core))
  vx += -ey * q
  vy += ex * q
}`,
          caption: 'Equation (4) for the cylinder, a hand-made wake deficit, and equation (5) for each shed vortex.',
        },
        {
          type: 'p',
          text: 'A third of the particles on that page are released as *dye* at the cylinder’s top and bottom, where the boundary layer separates in a real flow. Those streaks roll up into the vortices exactly as smoke does in a wind tunnel, and they are what make the street legible.',
        },
        {
          type: 'h',
          text: 'Strokes that accumulate',
        },
        {
          type: 'p',
          text: 'Every frame each particle contributes one tiny segment, from where it was to where it is. Those segments are drawn into an offscreen canvas that is never cleared, at about a quarter opacity, so lines build up wherever particles keep passing. The annotation is drawn fresh on top every frame, so it stays crisp while the texture underneath accumulates. Colour comes from a separate, very slow noise field split into four bands — ocean, lagoon, moss, fern — and each band is one path: four stroke calls draw all three thousand segments.',
        },
        {
          type: 'p',
          text: 'The texture must also forget, or it would saturate. The obvious approach — paint a nearly transparent rectangle over the buffer every frame — fails in two instructive ways. With 8-bit colour channels, a fade of 1% per frame rounds to nothing once the remaining difference is small, so old strokes never quite disappear. And the first version of this piece faded a transparent buffer with `destination-out`, which made faint strokes drift toward cyan and yellow: canvases store colour premultiplied by alpha, and at low alpha the three channels round to zero at different moments. The fix is an opaque paper-coloured buffer, faded toward paper in larger, less frequent steps:',
        },
        {
          type: 'code',
          code: `// a slow fade toward paper, in larger steps so 8-bit channels don't stall short of it
fadeAcc += dt
if (fadeAcc >= 0.1) {
  b.fillStyle = rgba(C.paper, 1 - Math.pow(1 - FADE, fadeAcc * 60))
  b.fillRect(0, 0, W, H)
  fadeAcc = 0
}`,
          caption: 'Six frames’ worth of fade at once is the same total as six small fades, but large enough to keep rounding from stalling.',
        },
        {
          type: 'h',
          text: 'Turning the page',
        },
        {
          type: 'p',
          text: 'Every ten seconds a hairline sweeps across the sheet with a tick ruler and the new page’s name riding on it. The strip it crosses each frame is painted back to paper, and every particle it passes is adopted by the new field. Particles ahead of the line keep following the old one, so for a second the two characters meet at a clean vertical seam. The new page’s seed is derived from its number, so the sequence is deterministic and the seed shown in the title block is the one in use.',
        },
        {
          type: 'h',
          text: 'Stirring',
        },
        {
          type: 'p',
          text: 'Press and drag and a softened vortex, equation (5), rides the pointer; it also drags the fluid close to the pointer along with the pointer’s own velocity, a little like a spoon. The vortex spins the way you circle. The piece measures the turning angle between successive drag segments and keeps a running, decaying sum; once it is clearly positive or negative the spin follows:',
        },
        {
          type: 'code',
          code: `// spin the way the pointer is circling: accumulate the turning angle of its path
const dx = p.x - ptr.lx
const dy = p.y - ptr.ly
if (dx * dx + dy * dy > 9) {
  if (ptr.dx || ptr.dy) {
    const turn = Math.atan2(ptr.dx * dy - ptr.dy * dx, ptr.dx * dx + ptr.dy * dy)
    ptr.turn = ptr.turn * 0.85 + turn
    if (Math.abs(ptr.turn) > 0.35) pv.spin = ptr.turn > 0 ? 1 : -1
  }
  ptr.dx = dx
  ptr.dy = dy
}`,
          caption: 'The signed angle between two steps is atan2 of their cross and dot products.',
        },
        {
          type: 'p',
          text: 'Until you touch the sheet, a ghost demonstrates once in the first seconds: a dot circles, stirring a real vortex into the laminar flow, beside the words *press and drag to stir*.',
        },
        {
          type: 'h',
          text: 'Cost and determinism',
        },
        {
          type: 'p',
          text: 'At 1920 × 1080 the grid has about 2,400 vertices, each needing two curl evaluations (eight noise lookups) on the turbulent page and refreshed every other frame; the three thousand particles then cost one bilinear lookup each, plus the analytic cylinder and a dozen vortices on the third page. All of it comes to about two milliseconds of script per frame. Rasterizing three thousand short hairlines into the buffer and copying the buffer to the screen is cheap work for a graphics card. The previews use 900 particles and a coarser grid.',
        },
        {
          type: 'p',
          text: 'Everything random comes from seeded generators — the particles’ starting points and rebirths from one, each page’s noise from a seed derived from the page number — so the same sequence of frames always draws the same picture. That is what lets the Playground’s test route jump to an exact moment and photograph it.',
        },
        {
          type: 'h',
          text: 'Resizes and repaints',
        },
        {
          type: 'p',
          text: 'Because the texture is history, a resize cannot simply redraw it. When the canvas changes size the buffer is copied into a new one of the new size, particle positions are scaled to match, and the grid is rebuilt; the texture looks briefly stretched until the next page turns. Repaints that do not advance time (the host sends a frame with $\\Delta t = 0$ after a resize) only re-composite the buffer and annotation.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'What the annotation says',
      blocks: [
        {
          type: 'table',
          head: ['Page', 'Character', 'Annotation'],
          rows: [
            ['01 · 0–10 s', 'Laminar flow (Re ≈ 40)', 'Arrows at the left show the parabolic velocity profile $U(y) = U_0 (1 - \\eta^2)$, with $\\eta$ running from −1 at one wall to 1 at the other; a dotted line joins their tips.'],
            ['02 · 10–20 s', 'Turbulent flow (Re ≈ 4,000)', 'Two octaves of curl noise: big eddies with smaller ones riding on them. No inflow; it is a patch of a much larger turbulent sea.'],
            ['03 · 20–30 s', 'Vortex street (Re ≈ 150)', 'A hatched cylinder with its diameter $D$ dimensioned, uniform inflow arrows, and small rotation arrows on the first shed vortices.'],
          ],
          caption: 'The pages cycle forever, each with a new seed.',
        },
        {
          type: 'list',
          items: [
            '**The page clock** (top right) is a ten-second ruler with a marker; the time beside it is the page’s own clock.',
            '**The title block** (bottom right): the field, its nominal Reynolds number, the particle count, the noise seed, the current $z$ of the noise (its slow time), and a key to the four colour bands.',
            '**The wipe** is the hairline that crosses the sheet at each page turn, carrying the next page’s name.',
            '**The stir marker**: a registration mark at the vortex, an arrow showing which way it spins, and $\\Gamma$, its signed strength.',
          ],
        },
        {
          type: 'p',
          text: 'Within a page there is a shape to watch: the wipe arrives on clean paper, the texture thickens for five or six seconds as the field’s $z$ drifts, peaks as a full weave around seven seconds, and is cleared by the next wipe.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'Kinematics, not dynamics',
      blocks: [
        {
          type: 'list',
          items: [
            '**No fluid equations are solved.** Real flows obey the Navier–Stokes equations, in which the velocity field evolves under its own momentum, pressure and viscosity. Here the field is *prescribed*: noise for the eddies, formulas for the cylinder and the street. It is divergence-free, so it moves like a fluid, but it does not behave like one — nothing here would predict when a real flow turns turbulent.',
            '**The Reynolds numbers are labels.** They name the regime each page imitates; they are not computed from the field.',
            '**The vortex street is choreographed.** Shedding times, positions and strengths are set by formula from the Strouhal number and von Kármán’s ratio, rather than emerging from the flow; the wake deficit is a hand-tuned band of slower water; and the shed vortices have no image vortices inside the cylinder, so the flow near it is only approximately right.',
            '**Particles are massless and immortal-ish.** Each lives a few seconds and is then reborn somewhere random (or, on the third page, as dye at the cylinder), which keeps the density even. Real tracer particles have inertia and do not respawn.',
            '**Colour bands are arbitrary.** They come from a separate noise field and mean nothing physical; they are there to make the regions of the weave legible.',
            '**The stir is not a spoon.** It is a softened vortex plus a drag-along term; it does not push fluid out of its way or leave a wake of its own.',
          ],
        },
      ],
    },
  ],
  interact: {
    gestures: [
      { gesture: 'drag', action: 'Stir. A vortex rides the pointer and drags the nearby fluid along; circle to choose which way it spins.' },
      { gesture: 'move', action: 'Hovering shows the reach of the stir before you press.' },
    ],
    tip: 'Stir slowly across the laminar page: the parallel layers fold around the vortex and carry the fold downstream.',
  },
  further: [
    { title: 'Curl-noise for Procedural Fluid Flow', by: 'Robert Bridson, Jim Hourihan, Marcus Nordenstam', year: '2007', note: 'SIGGRAPH; the stream-function trick used here.' },
    { title: 'An Image Synthesizer', by: 'Ken Perlin', year: '1985', note: 'SIGGRAPH; the original gradient noise.' },
    { title: 'Simplex Noise Demystified', by: 'Stefan Gustavson', year: '2005', note: 'The clearest account of simplex noise, and the basis of the kit’s implementation.' },
    { title: 'An Experimental Investigation of the Circumstances Which Determine Whether the Motion of Water Shall Be Direct or Sinuous', by: 'Osborne Reynolds', year: '1883' },
    { title: 'An Album of Fluid Motion', by: 'Milton Van Dyke', year: '1982' },
    { title: 'An Introduction to Fluid Dynamics', by: 'G. K. Batchelor', year: '1967', note: 'Potential flow, vortices and the cylinder, rigorously.' },
    { title: 'Stable Fluids', by: 'Jos Stam', year: '1999', note: 'SIGGRAPH; how to actually solve the fluid equations at interactive rates.' },
  ],
}

export default guide
