import type { Guide } from '../guide'

const causesFigure = `<svg viewBox="0 0 420 210" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <line x1="40" y1="170" x2="380" y2="170" opacity="0.5"/>
  <text x="40" y="188" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">400</text>
  <text x="200" y="188" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">550</text>
  <text x="356" y="188" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">700 nm</text>
  <line x1="40" y1="30" x2="40" y2="170" opacity="0.5"/>
  <text x="46" y="26" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">REFLECTANCE</text>
  <path d="M40 160 L150 158 L178 120 L200 60 L230 46 L380 44" stroke="#C49A1A"/>
  <text x="300" y="38" font-family="Geist Mono, monospace" font-size="9" fill="#C49A1A" stroke="none">CdS · BAND GAP</text>
  <line x1="190" y1="30" x2="190" y2="170" stroke="#C49A1A" stroke-dasharray="2 3" opacity="0.7"/>
  <text x="150" y="104" font-family="Geist Mono, monospace" font-size="9" fill="#C49A1A" stroke="none">≈ 512</text>
  <path d="M40 140 L90 120 L130 112 L170 118 L220 140 L280 156 L330 150 L380 128" stroke="#2B6A93"/>
  <text x="70" y="104" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none">ULTRAMARINE · S₃⁻</text>
  <path d="M290 156 L290 166" stroke="#2B6A93"/>
  <text x="250" y="150" font-family="Geist Mono, monospace" font-size="9" fill="#2B6A93" stroke="none" opacity="0.8">ABSORBS ~600</text>
</svg>`

const scatterFigure = `<svg viewBox="0 0 420 180" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <rect x="30" y="40" width="100" height="100" opacity="0.5"/>
  <rect x="160" y="40" width="100" height="100" opacity="0.5"/>
  <rect x="290" y="40" width="100" height="100" opacity="0.5"/>
  <circle cx="60" cy="70" r="6"/><circle cx="95" cy="88" r="6"/><circle cx="70" cy="115" r="6"/><circle cx="108" cy="122" r="6"/>
  <circle cx="190" cy="70" r="6"/><circle cx="225" cy="88" r="6"/><circle cx="200" cy="115" r="6"/><circle cx="238" cy="122" r="6"/>
  <circle cx="320" cy="70" r="6" opacity="0.35"/><circle cx="355" cy="88" r="6" opacity="0.35"/><circle cx="330" cy="115" r="6" opacity="0.35"/><circle cx="368" cy="122" r="6" opacity="0.35"/>
  <path d="M40 20 L60 64 L36 36 M60 64 L84 30" stroke="#2B6A93"/>
  <path d="M170 20 L190 64 L174 44" stroke="#2B6A93"/>
  <path d="M300 20 L320 64 L330 140" stroke="#2B6A93" opacity="0.7"/>
  <text x="30" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">TiO₂ · n 2.7</text>
  <text x="30" y="172" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">R ≈ 8 %</text>
  <text x="160" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">LEAD WHITE · n 2.0</text>
  <text x="160" y="172" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">R ≈ 2 %</text>
  <text x="290" y="160" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none">CHALK · n 1.6</text>
  <text x="290" y="172" font-family="Geist Mono, monospace" font-size="9" fill="#3F7A55" stroke="none">R ≈ 0.1 %</text>
  <text x="30" y="16" font-family="Geist Mono, monospace" font-size="9" fill="currentColor" stroke="none" opacity="0.6">GRAINS IN LINSEED OIL · n 1.5</text>
</svg>`

const guide: Guide = {
  lede: 'A history of color as a cabinet of specimens: sixteen pigments and dyes, from ochre ground in a South African cave 100,000 years ago to a blue pulled from a furnace in Oregon in 2009, each with its chemistry, its story and its price.',
  facts: [
    ['Specimens', '16 pigments and dyes, in order of first known use'],
    ['Span', 'About 100,000 years: Blombos Cave ochre to YInMn blue, 2009'],
    ['First synthetic pigment', 'Egyptian blue, CaCuSi₄O₁₀, by about 2500 BCE'],
    ['First industrial synthetic dye', 'Mauveine, William Perkin, 1856'],
    ['Toxic', 'Lead white, vermilion, Scheele’s green, cadmium yellow'],
    ['Colors', 'Approximate sRGB renderings of each masstone'],
    ['Timeline', 'Logarithmic in age, so deep time and recent centuries both fit'],
    ['Grains', '2,400 per specimen in the viewer, 900 on the card'],
    ['Running time', '87 s in five beats, looping'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Previous or next specimen' }],
    gestures: [
      { gesture: 'move', action: 'Hover a drawer to bring its specimen back to the stage (the clock waits)' },
      { gesture: 'tap', action: 'Tap a drawer to pin its specimen and story; tap it again to let go' },
      { gesture: 'drag', action: 'Drag along the timeline to travel through the specimens' },
      { gesture: 'tap', action: 'In the color chart, tap a swatch to read its story along the bottom' },
    ],
    tip: 'Wait for the chart at the end, then read the prices in red: snails, mercury, arsenic, an accident, a lucky furnace.',
  },
  pad: {
    left: [{ label: '‹ Specimen', code: 'ArrowLeft', aria: 'Previous specimen', wide: true }],
    right: [{ label: 'Specimen ›', code: 'ArrowRight', aria: 'Next specimen', wide: true }],
  },
  sections: [
    {
      id: 'materials',
      kicker: 'Materials',
      title: 'What a pigment is',
      blocks: [
        {
          type: 'p',
          text: 'A *pigment* is a colored powder that does not dissolve in the medium it is used in. Its grains sit suspended in a *binder*, which holds them to the surface: egg yolk in tempera, linseed oil in oil paint, gum arabic in watercolor, lime itself in fresco, an acrylic polymer in modern paints. A *dye* is different. It dissolves, and binds to a fiber molecule by molecule, which is why dyes color cloth and pigments color walls. Between the two sits the *lake*: a dye precipitated onto an inert, colorless powder, usually aluminum hydroxide made from alum, turning a soluble color into a usable pigment. In the piece, pigments and lakes are drawn as heaps of grains, and the two dyes, Tyrian purple and mauveine, as swatches of dyed cloth.',
        },
        {
          type: 'p',
          text: 'Because a pigment is a population of particles, its color depends on more than its chemistry. The same mineral ground coarse and ground fine can look like two different paints. Egyptian blue, azurite and smalt are deep when coarse and pale when fine, and painters learned to grind them only lightly. The binder matters as much: a grain looks pale and opaque when its refractive index differs strongly from that of the binder around it, and dark and glassy when the two are close, which is why the same powder can read differently in watercolor and in oil. Painters describe a pigment by its *masstone*, the color of a thick, opaque layer, and its *undertone*, the color of a thin layer or a tint with white. The swatches here are masstones.',
        },
        { type: 'h', text: 'Where the color comes from' },
        {
          type: 'p',
          text: 'A pigment looks colored because it absorbs some wavelengths of visible light and scatters the rest back. The absorption has a handful of physical causes, and the sixteen specimens in the cabinet cover most of them. The energy of a photon and its wavelength are related by',
        },
        { type: 'math', tex: 'E = \\frac{hc}{\\lambda}, \\qquad \\lambda_{\\text{nm}} \\approx \\frac{1240}{E_{\\text{eV}}}', label: '(1)', caption: '$h$ is Planck’s constant, $c$ the speed of light. A photon of 2.0 eV has a wavelength of about 620 nm; one of 3.0 eV, about 413 nm.' },
        {
          type: 'p',
          text: 'Some pigments are *semiconductors*. Cadmium sulfide has a band gap of about 2.4 eV: every photon with more energy than that, every wavelength shorter than about 512 nm, can lift an electron across the gap and is absorbed, and everything longer is reflected. What remains is yellow. Vermilion, mercury sulfide, has a gap near 2.0 eV, so it absorbs up to about 620 nm and is red. Titanium dioxide’s gap is around 3.0 to 3.2 eV, in the ultraviolet, so it absorbs no visible light at all and is white.',
        },
        {
          type: 'p',
          text: 'Others owe their color to a single kind of ion in a particular cage. In Egyptian blue, copper ions sit in a square-planar arrangement of oxygen atoms; in cobalt blue, cobalt ions sit in tetrahedral sites; in both, the electrons of the metal absorb orange and red light, leaving blue. Ultramarine is a crystalline cage, the mineral lazurite, holding a tiny trapped molecule, the trisulfur radical anion S₃⁻, which absorbs strongly near 600 nm. Prussian blue absorbs deep red light when an electron hops between iron atoms of two different charges, an *intervalence charge transfer*. YInMn blue gets its color from manganese ions held in an unusual trigonal-bipyramidal site, which was the scientific surprise of its discovery. The organic colors, Tyrian purple, carmine and mauveine, are long conjugated molecules whose shared electrons absorb particular bands of light. And carbon black absorbs everything, because the electrons of graphitic carbon can take up energy across the whole visible range.',
        },
        { type: 'figure', svg: causesFigure, alt: 'Sketched reflectance curves: cadmium yellow rising steeply near 512 nanometers, ultramarine with a broad dip near 600 nanometers.', caption: 'Two causes of color, sketched: a band-gap edge (cadmium yellow) and an absorption band (ultramarine).' },
        { type: 'h', text: 'Why white is white' },
        {
          type: 'p',
          text: 'A white pigment absorbs nothing; it works entirely by scattering. Each grain reflects a little light at its surface, an amount set by how different its refractive index $n_p$ is from that of the binder $n_b$. At normal incidence, the fraction reflected at one surface is given by Fresnel’s formula:',
        },
        { type: 'math', tex: 'R = \\left( \\frac{n_p - n_b}{n_p + n_b} \\right)^2', label: '(2)', caption: '$R$ is the reflectance of a single grain surface; real paint layers scatter many times, but $R$ ranks how well a white covers.' },
        {
          type: 'p',
          text: 'In linseed oil, $n_b \\approx 1.5$. Rutile titanium dioxide, $n_p \\approx 2.7$, gives $R \\approx 8\\%$ at each surface. Lead white, $n_p \\approx 2.0$, gives about 2%. Chalk, $n_p \\approx 1.6$, gives about 0.1%, almost nothing, which is why chalk that is brilliantly white in water or glue turns into a translucent paste in oil. It is also why titanium white, arriving in the 1920s, covered so much better than the lead white it replaced, and why lead white in old oil paintings grows more transparent as the oil yellows and its refractive index slowly rises, letting earlier drawing show through.',
        },
        { type: 'figure', svg: scatterFigure, alt: 'Three groups of grains in oil: titanium dioxide scatters light strongly, lead white less, chalk hardly at all.', caption: 'The same grains in oil: the bigger the index difference, the more light comes back.' },
      ],
    },
    {
      id: 'history',
      kicker: 'History',
      title: 'The specimens',
      blocks: [
        { type: 'h', text: 'I · Earth' },
        {
          type: 'p',
          text: 'The first colors were dug from the ground. Red ochre is clay colored by hematite, Fe₂O₃; yellow ochre by goethite, a hydrated iron oxide. Heat yellow ochre and it loses its water and turns red, a trick people discovered very early. In 2011 Christopher Henshilwood and colleagues described a toolkit at Blombos Cave in South Africa, about 100,000 years old: two abalone shells holding a ground mixture of ochre, bone and charcoal, with the grindstones beside them, a paint workshop. People were collecting ochre long before that. Black came from the fire: the lions, horses and rhinoceroses of Chauvet Cave in France, more than 30,000 years old, are drawn in charcoal, and the horses of Lascaux, about 17,000 years old, are painted in red and yellow earth.',
        },
        { type: 'h', text: 'II · Fire and trade' },
        {
          type: 'p',
          text: 'Egyptian blue is the first pigment we know of that was made rather than found. Sand, a copper mineral and lime, with a little natron as flux, were heated together to roughly 850–1000 °C, forming calcium copper silicate, CaCuSi₄O₁₀. It was in use in Egypt by the middle of the third millennium BCE, perhaps earlier, spread across the Mediterranean, and was described by the Roman architect Vitruvius. Its use faded after antiquity. It has a remarkable property: under red light it glows in the near infrared, so conservators now find it, even in invisible traces, by photographing objects with an infrared camera.',
        },
        {
          type: 'p',
          text: 'Tyrian purple, chemically 6,6′-dibromoindigo, came from the glands of murex sea snails. Production on Minoan Crete may go back to around 1800 BCE; the Phoenician city of Tyre made it famous. The yield was tiny. In 1909 the chemist Paul Friedländer extracted about 1.4 g of the dye from 12,000 snails, so the figure in the piece, roughly ten thousand snails for a gram, is if anything generous. It became the color of power: Roman emperors at times restricted it by law, and the Byzantine phrase for a child born to a reigning emperor was "born in the purple."',
        },
        {
          type: 'p',
          text: 'Lead white, basic lead carbonate, was made by exposing lead to the fumes of vinegar; Theophrastus described the process in the 4th century BCE. It was the essential white of European painting for two thousand years, warm, flexible and fast-drying in oil, and it poisoned the workers who made it. Vermilion, mercury sulfide, was first the mineral cinnabar; the Romans mined it at Almadén in Spain, and Pliny the Elder wrote of its value. Later it was made synthetically from mercury and sulfur, in China and then in medieval Europe. It is brilliant, costly and toxic, and in some conditions it darkens.',
        },
        {
          type: 'p',
          text: 'Ultramarine, "from beyond the sea," was ground from lapis lazuli mined in the mountains of Badakhshan in what is now Afghanistan. Some of its earliest known uses are in the Buddhist cave paintings at Bamiyan in the 6th and 7th centuries CE. Getting the blue out of the stone is laborious: ground lapis is mostly gray, and the blue lazurite must be separated, a process the Florentine painter Cennino Cennini described around 1400 using a dough of wax, resin and oil. In Renaissance Italy it was among the most expensive materials an artist could buy, at times worth more than its weight in gold, and patrons wrote it into contracts by quality and price, often reserving it for the robes of the Virgin. In 1824 a French society offered a prize for a synthetic version; Jean-Baptiste Guimet claimed it, and Christian Gmelin in Germany found a method at about the same time. Synthetic ultramarine made the blue cheap.',
        },
        {
          type: 'p',
          text: 'Carmine came from the New World. Cochineal insects, which live on prickly-pear cactus, contain carminic acid, and people in Mexico and the Andes had used them as a red dye for centuries. After the Spanish conquest, dried cochineal was shipped to Europe from the 1520s and became one of the most valuable exports of New Spain, often said to be second only to silver. Tens of thousands of insects go into a pound; fixed onto alum it makes the lake pigment carmine.',
        },
        { type: 'h', text: 'III · Accidents and industry' },
        {
          type: 'p',
          text: 'Prussian blue was an accident. In Berlin around 1706 (accounts give dates from 1704 to 1707), the colormaker Johann Jacob Diesbach was making a red lake from cochineal and used potash that had been contaminated with an animal oil prepared by the alchemist Johann Konrad Dippel. The product was blue, the first modern synthetic pigment, iron(III) hexacyanoferrate(II). It was cheap and strong, and by the 1820s it had reached Japan, where Hokusai used it in *The Great Wave off Kanagawa*. Today it is also a medicine: taken by mouth it binds radioactive cesium and thallium, and it is on the World Health Organization’s list of essential medicines as an antidote.',
        },
        {
          type: 'p',
          text: 'In 1775 the Swedish chemist Carl Wilhelm Scheele made a brilliant green from copper and arsenic. Scheele’s green, and the even more popular emerald green that followed in 1814, colored wallpapers, fabrics, artificial flowers and even sweets through the nineteenth century, and people sickened from them. In damp rooms molds could turn the arsenic into a volatile gas, a hypothesis put forward by the Italian physician Bartolomeo Gosio in the 1890s; it has even been suggested, though not established, that green wallpaper contributed to Napoleon’s death on St Helena.',
        },
        {
          type: 'p',
          text: 'Cobalt blue was commissioned. In 1802 the French government, through the minister Jean-Antoine Chaptal, asked the chemist Louis Jacques Thénard to find a cheaper substitute for ultramarine; Thénard made cobalt aluminate, CoAl₂O₄. Cadmium was discovered in 1817 by Friedrich Stromeyer as an impurity in zinc ore, and cadmium sulfide, a fierce, lightfast yellow, became a commercial pigment in the 1840s; Monet used it. Cadmium compounds are toxic, and their use is now restricted in many products.',
        },
        {
          type: 'p',
          text: 'Mauveine was the accident that started an industry. In 1856, at the age of 18 and working in a home laboratory during his Easter holiday, William Henry Perkin tried to make the antimalarial quinine by oxidizing a compound from coal tar. He got a black sludge. Cleaning his flask with alcohol, he found it dissolved to a vivid purple that dyed silk. He patented it, built a factory, and within a few years mauve was the color of fashionable London. Mauveine was the first synthetic dye produced on an industrial scale, and the chemical industry that grew from coal-tar dyes went on to make drugs, plastics and explosives.',
        },
        {
          type: 'p',
          text: 'Titanium white was industrial from the start. Commercial production of titanium dioxide pigment began around 1916, in Norway and the United States, and by the 1920s it was displacing lead white. It is bright, opaque and non-toxic, and the world now makes millions of tonnes of it a year, for paint, paper, plastics, cosmetics and toothpaste.',
        },
        { type: 'h', text: 'IV · A new blue' },
        {
          type: 'p',
          text: 'In 2009 the materials chemist Mas Subramanian and his group at Oregon State University were making oxides of yttrium, indium and manganese, looking for new electronic properties. One sample came out of the furnace a brilliant blue. The graduate student who made it, Andrew Smith, and the team traced the color to manganese ions held in a trigonal-bipyramidal site, and published it that year. YInMn blue, YIn₁₋ₓMnₓO₃, is durable and stable, and it reflects near-infrared light strongly, so surfaces painted with it stay cooler in the sun. It was licensed to a pigment maker and approved for commercial use in the late 2010s. It is often called the first new inorganic blue pigment in about two centuries.',
        },
        {
          type: 'aside',
          title: 'The price',
          text: 'Every color in the cabinet cost something, and the chart at the end of the piece says what: digging, a burnt stick, copper and fire, snails by the thousand, the makers’ health, mercury, gold, insects by the pound, an accident, arsenic, a state commission, a heavy metal, coal tar, an industry, a lucky furnace. For most of history, color was rare, expensive or dangerous, and the cheap, safe, brilliant palette we now take for granted is less than two centuries old.',
        },
        {
          type: 'table',
          head: ['Specimen', 'Formula', 'Date in the piece', 'Source', 'Toxic'],
          rows: [
            ['Red ochre', 'Fe₂O₃ in clay', '≈ 100,000 years ago', 'Blombos Cave', ''],
            ['Carbon black', 'C', '≈ 36,000 years ago', 'Chauvet Cave', ''],
            ['Yellow ochre', 'FeO(OH)·nH₂O', '≈ 17,000 years ago', 'Lascaux', ''],
            ['Egyptian blue', 'CaCuSi₄O₁₀', 'by c. 2500 BCE', 'Egypt', ''],
            ['Tyrian purple', 'C₁₆H₈Br₂N₂O₂', 'by c. 1500 BCE', 'Levant coast', ''],
            ['Lead white', '2PbCO₃·Pb(OH)₂', '4th c. BCE', 'Greece', 'yes'],
            ['Vermilion', 'HgS', '1st c. CE', 'Almadén', 'yes'],
            ['Ultramarine', 'Na₇Al₆Si₆O₂₄S₃ (approx.)', '6th–7th c. CE', 'Badakhshan', ''],
            ['Carmine', 'carminic acid on alumina', '1520s in Europe', 'Mexico', ''],
            ['Prussian blue', 'Fe₄[Fe(CN)₆]₃', 'c. 1706', 'Berlin', ''],
            ['Scheele’s green', 'CuHAsO₃', '1775', 'Sweden', 'yes'],
            ['Cobalt blue', 'CoAl₂O₄', '1802', 'Paris', ''],
            ['Cadmium yellow', 'CdS', '1840s', 'Germany, France', 'yes'],
            ['Mauveine', 'C₂₆H₂₃N₄⁺', '1856', 'London', ''],
            ['Titanium white', 'TiO₂', 'c. 1916', 'Norway, US', ''],
            ['YInMn blue', 'YIn₁₋ₓMnₓO₃', '2009', 'Oregon State', ''],
          ],
          caption: 'The cabinet, in order. Dates are representative moments, not always the very first use; see the notes above.',
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
          text: 'Pigments is one TypeScript module, and its content is a table: sixteen records with a name, formula, representative year, date and source labels, kind, an sRGB masstone, a toxicity flag, a one-line story and a price. Everything else is drawn from that table. The film is a pure function of an 87-second clock: three seconds to draw the empty cabinet, 4.2 s for each specimen, then 14 s of color chart and a short release in which the drawers empty and the loop begins again.',
        },
        {
          type: 'p',
          text: 'Each specimen has the same choreography. Its grains pour in from above, bottom first, and settle into a heap; a hairline string runs from a pin to the top of the heap, and the label card draws in; the story fades in beneath; and in the last 0.85 s the heap shrinks and flies into its numbered drawer, as the next specimen starts to pour. Hovering or pinning a drawer brings its specimen back to the stage and holds the clock, so it can be read at leisure.',
        },
        { type: 'h', text: 'A heap of grains' },
        {
          type: 'p',
          text: 'Every heap is the same 2,400 grains, generated once by rejection sampling under a profile curve, a rounded cone with a spreading foot, $h(x) = (1 - |x|^{1.6})^{1.25}$. Each grain gets a shade from 0 to 4, lit from the upper left so the left flank is bright and the right in shade, with random scatter so it reads as powder, and a delay that makes the bottom land first:',
        },
        {
          type: 'code',
          code: `while (n < NG) {
  const x = r() * 2 - 1
  const hmax = heap(x)
  const y = r()
  if (y > hmax) continue
  gx[n] = x
  gy[n] = y
  // lit from the upper left: the left flank bright, the right in shade, with grain-to-grain scatter
  const surf = 1 - (hmax - y) / Math.max(0.05, hmax)
  const v = 0.52 - 0.42 * x * (0.35 + 0.65 * surf) + (r() - 0.5) * 0.42
  gl[n] = Math.max(0, Math.min(4, Math.floor(v * 5)))
  gd[n] = 0.7 * y + 0.3 * r()
  n++
}`,
          caption: 'The grains live in typed arrays: position, shade level and pour delay.',
        },
        {
          type: 'p',
          text: 'The five shades of each pigment are computed in OKLab, stepping the lightness of its masstone from −0.13 to +0.10 and easing its chroma, so that a white heap still has form and a black one still has highlights. Drawing a heap is then five fills: every grain becomes a tiny square in one of five `Path2D` objects, one per shade, under a mid-tone silhouette and a two-step shaded flank. A hairline traces the heap’s contour, which is what makes lead white and titanium white visible on paper. Drawers reuse the same grains, every eighth one, drawn larger.',
        },
        {
          type: 'code',
          code: `const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()]
const g = Math.max(1, halfW * 0.019) * (every > 1 ? Math.min(2.4, Math.sqrt(every) * 0.85) : 1)
for (let n = 0; n < NG; n += every) {
  const d = gd[n] * 0.82
  if (progress < d) continue
  const f = ease.outCubic(clamp((progress - d) / 0.18))
  const x = cx + gx[n] * halfW
  const y = baseY - gy[n] * H - (1 - f) * H * 0.6
  paths[gl[n]].rect(x - g / 2, y - g, g, g)
}`,
          caption: 'A grain falls from 0.6 of the heap’s height to its resting place over 0.18 of the pour.',
        },
        { type: 'h', text: 'A timeline for deep time' },
        {
          type: 'p',
          text: 'The specimens span a hundred thousand years, but ten of the sixteen fall in the last two thousand years. A linear timeline would crush them into a sliver. The piece uses a logarithmic axis of age, measured back from a reference year of 2030 so that even 2009 has room:',
        },
        { type: 'math', tex: 'x(y) = x_0 + (x_1 - x_0)\\,\\frac{\\log_{10} A_0 - \\log_{10}(2030 - y)}{\\log_{10} A_0 - \\log_{10} A_1}', label: '(3)', caption: '$y$ is the year (negative for BCE), $A_0$ and $A_1$ the ages at the two ends of the axis (162,030 and 14 years), $x_0$ and $x_1$ its ends on screen.' },
        {
          type: 'p',
          text: 'On this axis each factor of ten in age, counted back from 2030, gets the same width: ages from 100,000 to 10,000 years take as much room as ages from 140 to 14, roughly 1890 to 2016. The ticks are labelled at 100,000 years ago, 10,000, 1000 BCE, 1 CE, 1500, 1800, 1900 and 2000. Each specimen has a small square on the axis, filled with its color once it has arrived, and the playhead travels from one date to the next as each specimen is filed. Dragging along the axis jumps to the nearest specimen.',
        },
        { type: 'h', text: 'The chart' },
        {
          type: 'p',
          text: 'At 70.6 s the cabinet opens. Each drawer interpolates from its place in the cabinet to a cell of a color chart that fills the frame, eight by two on wide screens and four by four on tall ones, staggered so the change ripples through the drawers. As a cell grows, its heap gives way to a flat swatch of the masstone, and three lines are set beneath it: the name, the date and, in red, the price. With sound on, each specimen arrives with a soft pour of filtered noise, a tick when it is pinned and a note when it is filed, and the chart opens on a slow chord.',
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
            '**Top right:** the beat and specimen number, such as *II — Fire and trade · specimen 08 / 16*.',
            '**The stage:** the specimen as a heap of grains (or, for a dye, a swatch of dyed cloth with its weave and fringe), on a hairline slab, framed by crop marks.',
            '**The label:** name in serif; formula; date; source; kind in blue; a red *toxic* tag for lead white, vermilion, Scheele’s green and cadmium yellow. A hairline string runs from its pin to the heap.',
            '**The story:** one to three lines under the specimen.',
            '**The cabinet:** sixteen numbered drawers, filled in order, each with a small heap and its name.',
            '**The timeline:** a logarithmic axis of age with a colored square per specimen and a playhead. Drag along it.',
            '**The chart (V):** every masstone as a flat swatch with name, date and, in red, its price.',
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
            '**The colors are approximations.** Each swatch is an sRGB rendering of a typical masstone, chosen from published swatches and descriptions, not measured. Real samples of one pigment vary with source, grind, binder and age by more than the differences between some of these numbers, and several (cadmium yellow, ultramarine) are more saturated in life than sRGB can show.',
            '**Dates are representative.** Each specimen is pinned to one well-attested moment: Blombos for red ochre, Chauvet for charcoal, Lascaux for yellow ochre, Almadén for vermilion. Earlier uses exist for many of them, and the dates of the older ones are uncertain by centuries or more.',
            '**Some stories are contested.** The arsenic-gas explanation for wallpaper poisoning and the Napoleon story are hypotheses. "More than gold" is true of some times and places, not all. Cochineal’s rank among New Spain’s exports varies by account.',
            '**"The first new blue in two centuries"** is how YInMn blue is usually described. Strictly, cerulean blue (on the market from the 1860s) and manganese blue (the 1930s) are also inorganic blues later than cobalt, so the claim depends on what counts as new.',
            '**Formulas are simplified.** Ultramarine’s composition varies; yellow ochre is a mixture; carmine is a complex of carminic acid with aluminum and calcium; mauveine is a mixture of several closely related molecules; YInMn blue is a family, typically with $x$ around 0.2.',
            '**The heaps are drawings.** Real grains are a few micrometers across; the piece draws about 2,400 squares, lit by rule, not by optics.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Bright Earth: Art and the Invention of Color', by: 'Philip Ball', year: '2001', note: 'The history of pigments and the chemistry that made them, from antiquity to the 20th century.' },
    { title: 'Colour: Travels Through the Paintbox', by: 'Victoria Finlay', year: '2002', note: 'Published in the US as *Color: A Natural History of the Palette*. Lapis mines, cochineal farms and murex shells, visited.' },
    { title: 'Mauve: How One Man Invented a Colour That Changed the World', by: 'Simon Garfield', year: '2000', note: 'William Perkin and the birth of the synthetic dye industry.' },
    { title: 'A 100,000-year-old ochre-processing workshop at Blombos Cave, South Africa', by: 'Christopher S. Henshilwood et al.', year: '2011', note: '*Science* 334. The paint kit in two abalone shells.' },
    { title: 'Mn³⁺ in trigonal bipyramidal coordination: a new blue chromophore', by: 'Andrew E. Smith, Hiroshi Mizoguchi, Kris Delaney, Nicola A. Spaldin, Arthur W. Sleight & M. A. Subramanian', year: '2009', note: '*Journal of the American Chemical Society* 131. The discovery of YInMn blue.' },
    { title: 'Artists’ Pigments: A Handbook of Their History and Characteristics', by: 'National Gallery of Art (Washington), ed. R. L. Feller, A. Roy, E. W. FitzHugh and B. H. Berrie', year: '1986–2007', note: 'Four volumes; the standard technical reference for most of the pigments here.' },
    { title: 'The Physics and Chemistry of Color: The Fifteen Causes of Color', by: 'Kurt Nassau', year: '1983', note: 'Band gaps, ligand fields, charge transfer and the rest, explained.' },
    { title: 'Il Libro dell’Arte', by: 'Cennino Cennini', note: 'A painter’s handbook of around 1400, with the recipe for extracting ultramarine from lapis; several English translations.' },
  ],
}

export default guide
