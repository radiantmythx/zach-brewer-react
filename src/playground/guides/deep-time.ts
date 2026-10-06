import type { Guide } from '../guide'

const siccarFigure = `<svg viewBox="0 0 440 220" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
  <path d="M20 118 C 80 108, 120 126, 170 114 S 270 104, 320 116 S 400 112, 420 110" stroke-width="1.4"/>
  <g opacity="0.75">
    <path d="M34 200 L 44 120"/><path d="M58 200 L 66 117"/><path d="M82 200 L 89 115"/><path d="M106 200 L 112 119"/><path d="M130 200 L 135 121"/>
    <path d="M154 200 L 158 117"/><path d="M178 200 L 181 113"/><path d="M202 200 L 205 112"/><path d="M226 200 L 229 110"/><path d="M250 200 L 253 108"/>
    <path d="M274 200 L 277 110"/><path d="M298 200 L 300 114"/><path d="M322 200 L 324 116"/><path d="M346 200 L 348 115"/><path d="M370 200 L 372 113"/><path d="M394 200 L 396 111"/>
  </g>
  <g opacity="0.75">
    <path d="M20 100 C 120 92, 260 86, 420 80"/><path d="M20 84 C 120 76, 260 70, 420 64"/><path d="M20 68 C 120 60, 260 54, 420 48"/><path d="M20 52 C 120 44, 260 38, 420 32"/>
  </g>
  <g fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="9">
    <text x="24" y="24">OLD RED SANDSTONE · DEVONIAN · ~370 MILLION YEARS</text>
    <text x="24" y="214">GREYWACKE, TILTED ON END · SILURIAN · ~435 MILLION YEARS</text>
    <text x="250" y="132" fill="#2B6A93">THE GAP · TENS OF MILLIONS OF YEARS</text>
  </g>
</svg>`

const guide: Guide = {
  lede:
    'Squeeze the Earth’s 4.54 billion years into one calendar year and most of it passes in silence: oceans by mid-January, the first life in March, animals in November, and everything anyone has ever written in the last 36 seconds of December 31.',
  facts: [
    ['Scale', 'One year = 4.54 billion years'],
    ['One day', '12.4 million years'],
    ['One minute', '8,638 years'],
    ['One second', '144 years'],
    ['First life', 'March (by about 3.7 billion years ago, debated)'],
    ['Our species', 'December 31, 23:25'],
    ['Writing', '23:59:24, about 36 seconds before midnight'],
    ['A life of 80 years', 'The last 0.56 seconds'],
    ['After', 'Carl Sagan’s Cosmic Calendar, *The Dragons of Eden*, 1977'],
    ['Running time', '90 s in six chapters, looping'],
  ],
  interact: {
    keys: [{ keys: ['←', '→'], action: 'Previous or next chapter' }],
    gestures: [
      { gesture: 'move', action: 'Hover (or drag, on touch) along the spiral to read any day: its date, its age and its eon' },
      { gesture: 'drag', action: 'In the last day, drag around the dial or along the ruler to read hours and seconds' },
      { gesture: 'tap', action: 'Tap an event’s mark to go to that moment' },
      { gesture: 'tap', action: 'Tap the ruler along the bottom to jump to a chapter' },
    ],
    tip: 'Run your finger slowly around the outer turn, from November 18 to December 31: almost every animal you can name lives in that last arc.',
  },
  pad: {
    left: [{ label: '‹ Chapter', code: 'ArrowLeft', aria: 'Previous chapter', wide: true }],
    right: [{ label: 'Chapter ›', code: 'ArrowRight', aria: 'Next chapter', wide: true }],
  },
  sections: [
    {
      id: 'phenomenon',
      kicker: 'Geology',
      title: 'The abyss of time',
      blocks: [
        {
          type: 'p',
          text: 'Human beings are good with time on human scales. We can feel a minute, remember a decade, imagine a century. Beyond a few thousand years our intuition gives out, and a million and a billion begin to sound alike. The writer John McPhee named the problem **deep time**, in *Basin and Range* (1981): the time of geology, so long that it has to be imagined by analogy, because it cannot be felt.',
        },
        {
          type: 'p',
          text: 'The idea that the Earth is that old belongs to the Scottish naturalist James Hutton. Watching soil wash from the fields into the rivers, and rivers carry it to the sea, he reasoned that the rocks of today’s land were made from the debris of older lands, laid down under ancient seas, hardened, lifted and worn away again, in cycles too slow to see. In his *Theory of the Earth*, read to the Royal Society of Edinburgh in 1785 and published in 1788, he concluded that he found no vestige of a beginning and no prospect of an end.',
        },
        {
          type: 'p',
          text: 'In the summer of 1788 Hutton took his friends John Playfair and James Hall by boat along the Berwickshire coast to a headland called Siccar Point. There, gray rock stood on end in near-vertical layers, and on top of its worn surface lay gently sloping beds of red sandstone. Each layer of the gray rock had been laid flat in water, buried, hardened, tipped on end by some huge movement of the crust, raised and eroded flat, and then sunk again under new sediment that became the red layers above. The contact between them, an **unconformity**, records an immense span of time in a single line. Playfair later wrote that the mind seemed to grow giddy by looking so far into the abyss of time.',
        },
        { type: 'figure', svg: siccarFigure, alt: 'A section through Siccar Point: near-vertical tilted strata below an eroded surface, with gently sloping layers of red sandstone above.', caption: 'Hutton’s unconformity at Siccar Point. Every line in the lower rock was once a level sea floor.' },
        { type: 'h', text: 'How old' },
        {
          type: 'p',
          text: 'Hutton could not say how old; nobody could until the twentieth century. Lord Kelvin, calculating how long a molten Earth would take to cool to its present temperature, arrived at tens of millions of years, too little time for the geologists and for Darwin. Radioactivity undid the calculation in two ways: it heats the Earth from within, and it provided a clock. In 1907 Bertram Boltwood dated uranium minerals at hundreds of millions to more than two billion years. Arthur Holmes spent his career building a radiometric time scale. In 1956 Clair Patterson, measuring lead isotopes in meteorites, found the age of the Earth that still stands, now given as 4.54 ± 0.05 billion years.',
        },
        {
          type: 'p',
          text: 'The geologic time scale divides that span into **eons** (the Hadean, the Archean from about 4 billion years ago, the Proterozoic from 2.5 billion, and the Phanerozoic, the eon of visible animal life, from 538.8 million) and finer units within them, with boundaries fixed by the International Commission on Stratigraphy at reference points in real rock. The colors of the spiral in the piece are those four eons.',
        },
        {
          type: 'aside',
          title: 'The Cosmic Calendar',
          text: 'The idea of compressing history into a single year was made famous by Carl Sagan in *The Dragons of Eden* (1977) and the television series *Cosmos* (1980). Sagan compressed the whole history of the universe, which he took as 15 billion years, so that the Big Bang fell on January 1, the Earth formed in September, and all of recorded history fit in the last seconds of December 31. This piece uses the same device for the Earth alone.',
        },
      ],
    },
    {
      id: 'arithmetic',
      kicker: 'Arithmetic',
      title: 'Compressing 4.54 billion years',
      blocks: [
        {
          type: 'p',
          text: 'Let one year of 365 days stand for the age of the Earth, $A = 4.54 \\times 10^9$ years. Every unit of the calendar then stands for a fixed span of geological time:',
        },
        {
          type: 'table',
          head: ['On the calendar', 'Stands for', 'Arithmetic'],
          rows: [
            ['one year', '4.54 billion years', '$A$'],
            ['one month (average)', '378 million years', '$A / 12$'],
            ['one day', '12.4 million years', '$A / 365$'],
            ['one hour', '518,000 years', '$A / 8{,}760$'],
            ['one minute', '8,638 years', '$A / 525{,}600$'],
            ['one second', '144 years', '$A / 31{,}536{,}000$'],
          ],
        },
        {
          type: 'p',
          text: 'An event that happened $a$ years ago falls on calendar day $c$ (counting from midnight at the start of January 1), or $s$ seconds before the final midnight:',
        },
        { type: 'math', tex: 'c = 365 \\left(1 - \\frac{a}{A}\\right) \\text{ days}, \\qquad s = \\frac{a}{A}\\, (365 \\times 86{,}400) \\approx \\frac{a}{144 \\text{ years}} \\text{ seconds}', label: '(1)' },
        {
          type: 'p',
          text: 'So writing, about 5,200 years old, comes $5{,}200 / 143.96 \\approx 36.1$ seconds before midnight, at 23:59:24. The Great Pyramid, about 4,580 years old, is at 23:59:28. Gutenberg’s press, about 576 years ago, is 4.0 seconds before the end; the first steam engines about two; and a human life of eighty years is $80 / 143.96 = 0.56$ seconds. Everything ever written, by everyone who has ever written anything, fits comfortably inside the last minute.',
        },
        { type: 'h', text: 'Why a year, and not a day' },
        {
          type: 'p',
          text: 'The same history can be squeezed into a single day, and the numbers are instructive. One second of that day stands for about 52,500 years. Life appears at about 04:26 in the morning; the Cambrian animals at 21:09; the dinosaurs at 22:46; the asteroid at 23:39; our species 5.7 seconds before midnight; and all of written history in the last tenth of a second. A human life is 1.5 milliseconds, about the time it takes sound to travel half a meter. That is true, but it is too small to imagine. A year keeps human history in seconds, which you can count aloud, and so this piece uses a year.',
        },
        {
          type: 'p',
          text: 'Another version, for the hands rather than the eyes: let one meter stand for a million years, and walk 4.54 kilometers, about an hour on foot, from the Earth’s formation to today. The first oceans come after 140 meters, the first life at about 840 meters, the Cambrian with 539 meters to go and the dinosaurs’ extinction 66 meters from the end. Writing begins 5.2 millimeters from the finish, and a human life is 0.08 millimeters, about the thickness of the page you might read this on.',
        },
        {
          type: 'p',
          text: 'Notice what a linear calendar does that a logarithmic chart does not. On a logarithmic scale (a decade per tick) the last thousand years get as much room as the first billion, which makes history look crowded and comfortable. On a calendar each day weighs the same, and the emptiness is the truth: for more than 85 percent of the year, almost nothing alive could have been seen without a microscope.',
        },
      ],
    },
    {
      id: 'events',
      kicker: 'Earth history',
      title: 'The year, month by month',
      blocks: [
        {
          type: 'p',
          text: 'The dates below are those used in the piece. Ages near the start of the record are uncertain by tens or hundreds of millions of years, and some are actively argued over; the hedges matter.',
        },
        {
          type: 'table',
          head: ['Event', 'Age', 'Calendar', 'Evidence and uncertainty'],
          rows: [
            ['The Earth forms', '4.54 billion years', 'Jan 1', 'Lead isotopes in meteorites; ± 0.05 billion'],
            ['The Moon-forming impact', 'about 4.5 billion', 'Jan 3', 'Lunar rock ages; estimates range from about 4.5 to 4.4 billion'],
            ['The first oceans', 'by 4.4 billion', 'Jan 12', 'Oxygen isotopes in Jack Hills zircons'],
            ['The first life', 'by about 3.7 billion', 'Mar 9', 'Debated traces at 3.7; stromatolites at 3.48 are widely accepted; some argue older'],
            ['The Great Oxidation', 'about 2.4 billion', 'Jun 22', 'Oxygen appears in the air between about 2.4 and 2.1 billion'],
            ['Complex cells', 'by about 1.8 billion', 'Aug 9', 'Fossils of eukaryotes from about 1.7–1.6 billion; molecular estimates older'],
            ['Snowball Earth', '720–635 million', 'Nov 4', 'Glacial deposits near the equator, twice (Sturtian and Marinoan)'],
            ['The Cambrian explosion', '538.8 million', 'Nov 18', 'Base of the Cambrian; the Ediacaran biota is older'],
            ['Plants on land', 'about 470 million', 'Nov 24', 'Fossil spores of the earliest land plants'],
            ['The first dinosaurs', 'about 233 million', 'Dec 13', 'Late Triassic fossils from Argentina'],
            ['The asteroid', '66 million', 'Dec 26', 'The Chicxulub crater and a worldwide iridium layer'],
            ['The first humans', 'about 2.8 million', 'Dec 31, 18:36', 'A jaw of early *Homo* from Ledi-Geraru, Ethiopia'],
            ['Our own species', 'about 300,000', '23:25', 'Fossils from Jebel Irhoud, Morocco'],
            ['Farming', 'about 12,000', '23:58:37', 'Domesticated cereals in the Fertile Crescent; some put it nearer 11,000'],
            ['Writing', 'about 5,200', '23:59:24', 'Cuneiform in Sumer, around 3200 BCE'],
            ['The pyramids', 'about 4,580', '23:59:28', 'The Great Pyramid of Giza, around 2560 BCE'],
            ['The printing press', 'about 576', '23:59:56', 'Gutenberg, Mainz, around 1450'],
            ['You', '80 years', 'the last 0.56 s', 'One long life'],
          ],
        },
        {
          type: 'p',
          text: 'A few things the table hides. The first half of the year belongs entirely to single cells, and for most of it the air had almost no oxygen; the gas that animals breathe was a waste product that the cyanobacteria slowly poured into the sky. Complex cells, with a nucleus and mitochondria (once free-living bacteria, swallowed and kept), appear in August, but multicellular life of any size waits until autumn. The two Snowball glaciations of November may have covered the planet in ice to the tropics. Then, within two calendar weeks, come shells, eyes, legs and teeth, the arthropods of the Cambrian, fish, the first forests, the first animals on land, and the dinosaurs, which rule from mid-December until the late afternoon of the 26th, when a rock about ten kilometers across ends their reign; their descendants, the birds, are still here.',
        },
        {
          type: 'p',
          text: 'The genus *Homo* arrives on the last evening of the year. Our own species appears at 23:25, thirty-five minutes before midnight. Farming, cities, writing, the pyramids, the printing press and everything after are crammed into the last 83 seconds.',
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
          text: 'Deep Time is one TypeScript module drawing to a single canvas. The whole film is a **pure function of time**: given a moment $T$ between 0 and 90 seconds, the calendar day, the layout and every drawing follow. There is no simulation and no state that builds up, apart from where your pointer is.',
        },
        { type: 'h', text: 'A clock that dwells' },
        {
          type: 'p',
          text: 'Run at a constant rate, the calendar would spend 82 percent of the film among microbes and pass the dinosaurs in a quarter of a second. So the story is written as a table of knots, pairs of (film time, calendar day). Between an event and the next, the calendar eases from one to the other; at each event it dwells for 1.4 seconds, moving only slightly, so the drawing can be read. The speed readout in the top right always reports the real rate, in years of Earth history per second, from nearly 300 million in the long transits to a few years in the last half-second.',
        },
        {
          type: 'code',
          code: `const KNOTS: [number, number][] = [
  [0, 0],
  [5, 0],
  [7, EC[1]],                 // the Moon-forming impact
  [8.4, EC[1] + 0.2],         // …dwell
  // … one pair per event, through the asteroid on December 26 …
  [50.4, 364],                // midnight, December 30
  [53, EC[11]],               // the first humans, 18:36
  // … the last day, then the last two minutes …
  [74.5, EC[17]],             // a lifetime before midnight
  [80, YEAR_DAYS],
]

function calAt(T: number) {
  if (T >= 86) return YEAR_DAYS * (1 - ease.inOutCubic(clamp((T - 86) / 3.4)))
  for (let i = 1; i < KNOTS.length; i++) {
    const [t1, c1] = KNOTS[i]
    if (T <= t1) {
      const [t0, c0] = KNOTS[i - 1]
      return lerp(c0, c1, ease.inOutSine(clamp((T - t0) / (t1 - t0))))
    }
  }
  return YEAR_DAYS
}`,
          caption: 'The story as data (trimmed). `EC[i]` is event $i$’s calendar day from equation (1). After midnight the year rewinds to January 1 for the next loop.',
        },
        { type: 'h', text: 'A spiral of months' },
        {
          type: 'p',
          text: 'The year is an Archimedean spiral of twelve turns, one per month, starting at the top and running clockwise, with January innermost and December outermost. Each month gets a full turn whatever its length, so a calendar day is a fraction of its month’s turn; the radius grows linearly, so the later months are the longest arcs. Reading the spiral under the pointer inverts the map: the angle gives the fraction of a month, and the radius says which turn is nearest.',
        },
        {
          type: 'code',
          code: `function spiralXY(u: number, cx: number, cy: number, R: number) {
  const r0 = R * 0.1
  const r = r0 + (R - r0) * u
  const th = u * 12 * TAU
  return [cx + r * Math.sin(th), cy - r * Math.cos(th)] as const
}
/** nearest spiral point to (x, y): returns u, or -1 if too far */
function spiralHit(x: number, y: number, cx: number, cy: number, R: number) {
  const dx = x - cx
  const dy = y - cy
  const r = Math.hypot(dx, dy)
  if (r > R + 14) return -1
  const r0 = R * 0.1
  let th = Math.atan2(dx, -dy)
  if (th < 0) th += TAU
  const f = th / TAU
  const m = clamp(Math.round(((r - r0) / (R - r0)) * 12 - f), 0, 11)
  return clamp((m + f) / 12)
}`,
          caption: '$u$ runs from 0 (midnight, January 1) to 1 (midnight, December 31). The hit test returns the turn whose radius at that angle is closest.',
        },
        {
          type: 'p',
          text: 'The spiral is drawn twice: a faint hairline for the whole year, and over it the part already passed, in the color of its eon (ink for the Hadean, ocean for the Archean, lagoon for the Proterozoic, moss for the Phanerozoic). Events sit on it as small rings, filled once passed, with short labels placed radially outside it; a label that would overlap another is simply left out.',
        },
        { type: 'h', text: 'The last day and the last minutes' },
        {
          type: 'p',
          text: 'December 31 is too small on the spiral to show anything (a thirty-first of the outermost turn), so at the end of December the spiral shrinks into the corner and hands over, through dotted leader lines like a detail view in an engineering drawing, to a 24-hour dial. Arcs on the dial show our genus from 18:36 and our species from 23:25. A second detail view then opens the dial’s last two minutes into a ruler 120 seconds long, one tick a second, where farming, writing, the pyramids, the printing press and a human lifetime each get a mark, a small drawing and their distance from midnight. The ruler is linear like the calendar, so a lifetime really is the thin moss sliver at its right-hand end.',
        },
        {
          type: 'p',
          text: 'The small drawings are each about a dozen lines of path code in a unit square, scaled to wherever they appear: an accreting planet, two worlds colliding, waves inside a globe, dividing cells, banded iron under rising bubbles, a cell with a nucleus and mitochondria, an iced-over globe, a trilobite, a forked Cooksonia stem, a sauropod, a crater and its streak, a hand axe, a hand stencil (dots sprayed around a hand, the hand left bare), an ear of wheat, a clay tablet of wedges, two pyramids, an open book, and a dot with a ring for you.',
        },
        {
          type: 'p',
          text: 'Layout is computed for every frame size: on wide frames the spiral sits beside the card and the dial view puts the spiral, the dial and the card in a band above a full-width ruler; on tall phones they stack; on short landscape phones the spiral, dial and card step aside in the last minutes so that the ruler has the stage. With sound on, each event rings a soft bell that climbs a pentatonic scale through the year, and midnight is a single high note.',
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
            '**Top right:** the calendar date and time, how long ago that moment was, and the speed in years of history per second of film.',
            '**The spiral:** twelve turns for twelve months, January at the center; month names along the spine at the top. The inked part is the year so far, colored by eon, with a legend beside it.',
            '**Event marks:** small rings on the spiral, filled once passed, labeled outside the spiral. Tap one to go there.',
            '**The card:** the current event, its date on the calendar, its real age (with its hedge) and a line about it.',
            '**The dial:** December 31 from midnight to midnight; arcs for *Homo* (fern) and *Homo sapiens* (moss).',
            '**The ruler:** the last two minutes, 23:58:00 to midnight, a second per tick, with the last minute dimensioned; an ocean hand shows the present moment.',
            '**Hover or drag:** an ocean callout reads the date or time under the pointer, how long ago it was, its eon, and any event close by.',
          ],
        },
        {
          type: 'p',
          text: 'Things worth watching for: how little ink there is on the spiral between March and November, a long quiet of microbes; how crowded the outer arc of December is; the leader lines that hand the story from spiral to dial to ruler, each a zoom of hundreds of times; and the end, when the ruler’s hand reaches the moss sliver, and then midnight.',
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
            '**The clock is not uniform.** The calendar itself is strictly linear, but the film lingers at events; the speed readout shows how fast it is running at every moment.',
            '**Dates are rounded and some are contested.** The first life, the Moon-forming impact, complex cells and the start of farming all have serious alternative dates, given in the table. The piece uses one value for each.',
            '**Months are equal turns.** On the spiral every month is one turn, so a day in February takes a little more angle than a day in January.',
            '**“The first humans” is a choice.** The genus *Homo* is used here; hominins that walked upright are older, and stone tools older still.',
            '**The start is a convention.** The Earth took tens of millions of years to accrete; January 1 marks the conventional age of 4.54 billion years.',
            '**“You” is eighty years long,** and the present is taken as the year this piece was made.',
            '**The drawings are emblems,** not reconstructions; the sauropod in particular stands for dinosaurs in general, though the first dinosaurs were small and walked on two legs.',
          ],
        },
      ],
    },
  ],
  further: [
    { title: 'Theory of the Earth', by: 'James Hutton', year: '1788', note: '*Transactions of the Royal Society of Edinburgh* 1.' },
    { title: 'Biographical Account of the Late Dr James Hutton', by: 'John Playfair', year: '1805', note: '*Transactions of the Royal Society of Edinburgh* 5. Siccar Point and the abyss of time.' },
    { title: 'Basin and Range', by: 'John McPhee', year: '1981', note: 'Farrar, Straus and Giroux. Where the phrase “deep time” comes from; later collected in *Annals of the Former World* (1998).' },
    { title: 'The Dragons of Eden', by: 'Carl Sagan', year: '1977', note: 'Random House. The Cosmic Calendar.' },
    { title: 'Time’s Arrow, Time’s Cycle', by: 'Stephen Jay Gould', year: '1987', note: 'Harvard University Press. Hutton, Lyell and the discovery of deep time.' },
    { title: 'Bursting the Limits of Time', by: 'Martin J. S. Rudwick', year: '2005', note: 'University of Chicago Press. The history of geochronology in the age of revolution.' },
    { title: 'Geologic Time Scale 2020', by: 'Felix M. Gradstein, James G. Ogg, Mark D. Schmitz & Gabi M. Ogg (eds.)', year: '2020', note: 'Elsevier. The reference for boundary ages.' },
    { title: 'The age of the Earth in the twentieth century: a problem (mostly) solved', by: 'G. Brent Dalrymple', year: '2001', note: 'Geological Society, London, Special Publications 190.' },
  ],
}

export default guide
