import type { Guide } from '../guide'

const anatomy = `<svg viewBox="0 0 330 150" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1">
<g opacity="0.4"><path d="M10 22 H320"/><path d="M10 28 H320"/><path d="M10 62 H320"/><path d="M10 128 H320" stroke-dasharray="2 3"/></g>
<path d="M10 104 H320" stroke="#1F8A86"/>
<path d="M40 104 L62 28 L84 104 M49 78 H75" stroke-width="2"/>
<path d="M120 62 C 98 62 98 92 120 92 C 142 92 142 62 120 62 M138 64 C 140 54 146 52 150 56 M120 92 C 100 96 100 104 118 106 C 150 108 150 128 120 130 C 96 130 96 112 110 106" stroke-width="2"/>
<g stroke="#3F7A55"><path d="M176 104 V28 M172 28 H180 M172 104 H180"/><path d="M196 104 V62 M192 62 H200"/><path d="M216 104 V128 M212 128 H220"/></g>
<g stroke="none" fill="currentColor" font-family="ui-monospace, monospace" font-size="8" letter-spacing="1">
<text x="236" y="19" opacity="0.7">ASCENDER</text><text x="236" y="36" opacity="0.7">CAP HEIGHT</text><text x="236" y="59" opacity="0.7">X-HEIGHT</text>
<text x="236" y="101" fill="#1F8A86">BASELINE</text><text x="236" y="140" opacity="0.7">DESCENDER</text>
<text x="160" y="70" fill="#3F7A55">CAP</text><text x="198" y="86" fill="#3F7A55">X</text><text x="222" y="120" fill="#3F7A55">D</text>
<text x="40" y="22" opacity="0.7">APEX</text><text x="148" y="50" opacity="0.7">EAR</text><text x="80" y="140" opacity="0.7">LOOP</text></g>
</svg>`

const guide: Guide = {
  lede:
    'Forty-four beats at 120 BPM: words from this site rise out of masks, stand up glyph by glyph, echo as outlines, breathe in their spacing, are measured like a type specimen and finally snap into a twelve-column poster. Every frame is meant to be a poster in its own right.',
  facts: [
    ['Tempo', '120 BPM: a beat is 0.5 s, a sixteenth 0.125 s'],
    ['Length', '44 beats, 22 s, in seven sequences'],
    ['Faces', 'Instrument Serif (roman and italic), Geist Mono'],
    ['Grid', '12 columns, gutters of 1.6% of the measure'],
    ['Easing', 'Exponential in and out, back-out for the glyphs'],
    ['Metrics', 'Measured from the face each frame'],
    ['Drawing', 'Canvas 2D: fillText, strokeText, clipping masks'],
    ['Script cost', 'Well under 1 ms per frame'],
  ],
  sections: [
    {
      id: 'phenomenon',
      kicker: 'The phenomenon',
      title: 'Letters that move',
      blocks: [
        {
          type: 'p',
          text: 'Type has always moved a little. Words scroll on a ticker, credits roll, a neon sign blinks. But **kinetic typography** — type whose motion is composed, timed and meant to carry meaning — is largely a story of film titles. Through the first half of the twentieth century, title cards were mostly static lettering on a plain background, shown before the story began. In the 1950s Saul Bass changed what a title sequence could be. For Otto Preminger’s *The Man with the Golden Arm* (1955) he made a jagged white arm and stark bars move to the jazz score; for Alfred Hitchcock’s *Vertigo* (1958) spirals turned in an eye; and for *North by Northwest* (1959) the names of the cast slid along the grid of a skyscraper’s glass façade, arriving and leaving on the lines of the building. Type was no longer a label in front of the film. It was the first scene.',
        },
        {
          type: 'p',
          text: 'Others pushed in different directions. Pablo Ferro hand-lettered the shaky, overlapping credits of *Dr. Strangelove* (1964). Maurice Binder built the Bond openings. In the 1990s Kyle Cooper’s scratched, flickering titles for *Se7en* (1995) set off a new wave of title design, now made on computers. And with screens everywhere — interfaces, advertising, music videos, the opening seconds of a product launch — motion became an ordinary part of a typographer’s brief. Designers began to speak of type that *performs*: words that enter in character, hold for the length of a phrase, and leave on the beat.',
        },
        {
          type: 'p',
          text: 'The other half of this piece’s ancestry is still. In Switzerland after the Second World War, designers such as Josef Müller-Brockmann, Emil Ruder and Armin Hofmann developed what became known as the **International Typographic Style**: sans-serif type, asymmetric layouts, flush-left lines and, above all, the **grid** — a set of columns and rows, fixed before any content is placed, that every element aligns to. Müller-Brockmann’s *Grid Systems in Graphic Design* (1981) made the method a manual. The grid gives a page rhythm the way a bar line gives music rhythm: the eye learns the intervals and feels each alignment as a small resolution.',
        },
        {
          type: 'p',
          text: 'Music and type share more than metaphor. Both are made of intervals — the spaces between notes, the spaces between letters and lines — and both are judged by whether those intervals feel inevitable. Choreographing type to a tempo makes that kinship literal. At 120 beats per minute a beat lasts half a second, a sixteenth note an eighth of a second; a word that arrives on a downbeat feels placed, one that arrives a sixteenth late feels syncopated. The piece is scored in beats, not seconds, and every entrance and exit sits on a beat or a subdivision of one.',
        },
        {
          type: 'h',
          text: 'The anatomy of a letter',
        },
        {
          type: 'p',
          text: 'Typographers describe letters against a set of horizontal guides. The **baseline** is the line letters sit on. The **x-height** is the height of a lowercase *x* — the body of the lowercase alphabet, and the single biggest factor in how large a face looks at a given size. The **cap height** is the height of flat capitals such as *H*. **Ascenders** rise above the x-height in letters like *d*, *h* and *l*, often a little above the cap height; **descenders** drop below the baseline in *g*, *p* and *y*. Round letters overshoot the guides slightly so that they look the same size as flat ones.',
        },
        {
          type: 'p',
          text: 'Individual parts of letters have names too. The point where the strokes of an *A* meet is its **apex** and its horizontal stroke the **crossbar**. A double-storey *g* — the kind Instrument Serif has — is a small upper **bowl** joined to a lower **loop**, with a little flag at its top right called the **ear**. All of these are measured relative to the **em**, the nominal size of the type: a 100-pixel font has a 100-pixel em, and its x-height might be 0.5 em.',
        },
        {
          type: 'figure',
          svg: anatomy,
          caption: 'The guides the specimen sequence draws, and the parts it names. Heights are measured up from the baseline; the descender down from it.',
          alt: 'Letters A and g on a baseline with horizontal guides for x-height, cap height, ascender and descender, and vertical dimension lines.',
        },
        {
          type: 'h',
          text: 'Spacing',
        },
        {
          type: 'p',
          text: '**Tracking** is a uniform change to the space between all the letters of a word; **kerning** adjusts particular pairs, such as tucking an *o* under a *T*. Tight tracking makes a word read as a single shape; open tracking turns it into a row of separate letters, slower to read and more stately. Typographers usually track display type tighter and small capitals looser. In this piece tracking becomes an instrument: struck on each beat and left to decay, like a drum.',
        },
      ],
    },
    {
      id: 'mathematics',
      kicker: 'The mathematics',
      title: 'Time, easing and measure',
      blocks: [
        {
          type: 'p',
          text: 'Everything is scheduled in beats. With tempo $T = 120$ beats per minute, the beat clock is',
        },
        {
          type: 'math',
          tex: 'b(t) = \\frac{T}{60}\\, t = 2t, \\quad \\beta = b \\text{ mod } 44',
          label: '(1)',
          caption: 'Each of the seven sequences owns a range of beats, and inside it everything is a function of the local beat — the beat minus the sequence’s first beat.',
        },
        {
          type: 'p',
          text: 'A motion from beat $a$ to beat $c$ is driven by a progress value that runs from 0 to 1 and is then shaped by an **easing function**. Linear motion looks mechanical; real things accelerate and decelerate. The piece mostly uses Robert Penner’s exponential and back easings, the family that became the standard vocabulary of interface animation:',
        },
        {
          type: 'math',
          tex: 'p = \\operatorname{clamp}(\\frac{\\beta - a}{c - a}), \\quad \\text{out-expo}(p) = 1 - 2^{-10p}, \\quad \\text{in-expo}(p) = 2^{10p - 10}',
          label: '(2)',
          caption: 'Out-expo arrives fast and settles slowly, which reads as a confident entrance; in-expo leaves slowly and then snaps away. Entrances use the first and exits the second.',
        },
        {
          type: 'math',
          tex: '\\text{out-back}(p) = 1 + 2.70158\\,(p - 1)^3 + 1.70158\\,(p - 1)^2',
          label: '(3)',
          caption: 'Overshoots by about 10% and comes back: the glyphs in the second sequence lean slightly past upright before they settle.',
        },
        {
          type: 'h',
          text: 'Fitting a word to a measure',
        },
        {
          type: 'p',
          text: 'Many layouts here say *this word fills these columns*. Text width scales linearly with font size, so the piece measures a word once at 100 px and solves for the size that makes it exactly as wide as the span:',
        },
        {
          type: 'math',
          tex: 's = 100 \\cdot \\frac{W_{\\text{span}}}{w_{100}}',
          label: '(4)',
          caption: '$w_{100}$ is the word’s measured width at 100 px. The twelve-column grid has column width $(W - 11g)/12$ for a measure $W$ and gutter $g$, and a span of columns $a$ to $c$ is $(c - a + 1)$ columns plus $(c - a)$ gutters.',
        },
        {
          type: 'h',
          text: 'Standing a glyph up',
        },
        {
          type: 'p',
          text: 'In the second sequence each letter of *Designer* is drawn rotated about its own baseline-left corner. It starts lying flat, a quarter turn clockwise, and stands up as its progress runs from 0 to 1 over 0.9 beats, the letters starting a sixteenth apart:',
        },
        {
          type: 'math',
          tex: '\\theta_i(\\beta) = \\frac{\\pi}{2}(1 - \\text{out-back}(p_i)), \\quad p_i = \\operatorname{clamp}(\\frac{\\beta - 0.35 - 0.25\\, i}{0.9})',
          label: '(5)',
          caption: 'The overshoot of out-back makes $\\theta$ go slightly negative before settling at zero: each glyph rocks back past upright, like a domino set down firmly.',
        },
        {
          type: 'h',
          text: 'Tracking as an envelope',
        },
        {
          type: 'p',
          text: 'In the fourth sequence the tracking of *Sound*, in ems, is a sum of four struck notes, one per beat. Each note has a fast attack and an exponential decay, the shape of a plucked string or a drum:',
        },
        {
          type: 'math',
          tex: '\\tau(\\beta) = 0.04 + \\sum_{j=0}^{3} h_j\\, e^{-3.2(\\beta - j)}(1 - e^{-40(\\beta - j)}) \\quad \\text{for } \\beta \\geq j, \\quad h = (0.95,\\, 0.35,\\, 0.7,\\, 0.2)',
          label: '(6)',
          caption: 'Strong, weak, medium, weak: the accent pattern of a bar of four. The plot in the lower left of that sequence is this function.',
        },
      ],
    },
    {
      id: 'how',
      kicker: 'How the piece works',
      title: 'Seven sequences on one clock',
      blocks: [
        {
          type: 'p',
          text: 'The piece is a table of seven sections, each with a first and last beat, and one drawing function per section that takes the local beat and paints its whole composition. Nothing carries over between frames except the clock: every position, opacity and size is computed afresh from the beat. That makes the piece easy to scrub, deterministic for testing, and immune to dropped frames.',
        },
        {
          type: 'table',
          head: ['Beats', 'Sequence', 'What happens'],
          rows: [
            ['0–8', 'I · Reveal', 'Four disciplines rise out of masks on eighth notes; rules draw under them; a design-tool selection box hops down the list; they leave upward.'],
            ['8–12', 'II · Build', '*Designer* is set glyph by glyph, each standing up from its baseline on a sixteenth, with a protractor on the one in motion.'],
            ['12–16', 'III · Echo', '*Play* repeated nine times as outlines, cascading in on sixteenths, waving, then folding back into the front copy as it fills with moss.'],
            ['16–20', 'IV · Track', '*Sound* breathes: tracking struck on each beat and decaying, with a width dimension, an oscilloscope and the envelope plot.'],
            ['20–28', 'V · Anatomy', 'A specimen of *Ag*: baseline, x-height, cap height, ascender and descender drawn on, dimensioned and named.'],
            ['28–36', 'VI · Grid', 'Twelve columns draw in; the words fly in from two columns away and snap into a poster every three sixteenths, the target span flashing as each lands.'],
            ['36–44', 'VII · Hold', 'The finished poster holds, the grid fades back, a caret blinks on the beat, and a hairline wipe returns to the top.'],
          ],
        },
        {
          type: 'h',
          text: 'Masks',
        },
        {
          type: 'p',
          text: 'Most entrances are **masked reveals**, the oldest trick in title design: a word slides up into a window that is exactly its own size, so it seems to rise out of a slot in the page rather than fade in. On a canvas the window is a clipping rectangle around the word’s final position, and the word is drawn offset by its progress.',
        },
        {
          type: 'code',
          code: `/** serif word rising into (p) and out of (q) a mask; returns its width */
function maskWord(str: string, x: number, y: number, size: number, p: number, q = 0, o: { italic?: boolean; color?: string; align?: CanvasTextAlign } = {}) {
  const wd = measure(str, size, o.italic)
  if (p <= 0 || q >= 1) return wd
  const left = o.align === 'center' ? x - wd / 2 : o.align === 'right' ? x - wd : x
  ctx.save()
  ctx.beginPath()
  ctx.rect(left - size * 0.15, y - size * 1.02, wd + size * 0.4, size * 1.3)
  ctx.clip()
  ctx.fillStyle = o.color ?? C.ink
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(str, x, y + (1 - p) * size * 1.1 - q * size * 1.15)
  ctx.restore()
  return wd
}`,
          caption: 'One function serves both directions: `p` brings the word up from below the window, `q` sends it up and out of the top.',
        },
        {
          type: 'h',
          text: 'Glyph by glyph',
        },
        {
          type: 'p',
          text: 'To animate letters one at a time you need to know where each would sit in the set word, kerning included. The piece measures the prefix of the word up to each letter — `measureText(word.slice(0, i))` — which includes the font’s kerning of every pair so far, and places each glyph at that offset. Each letter is then drawn in its own rotated frame.',
        },
        {
          type: 'code',
          code: `const gx = left + ctx.measureText(word.slice(0, i)).width
const gw = ctx.measureText(word[i]).width
const tIn = 0.35 + i * 0.25
const pin = clamp((lb - tIn) / 0.9)
const pout = clamp((lb - (3.35 + i * 0.07)) / 0.45)
if (pin <= 0 || pout >= 1) continue
const ang = (1 - ease.outBack(pin)) * (Math.PI / 2) + ease.inExpo(pout) * (Math.PI / 2)
ctx.save()
ctx.translate(gx, base)
ctx.rotate(ang)
ctx.globalAlpha = clamp(pin * 3) * (1 - pout)
ctx.fillStyle = C.ink
ctx.fillText(word[i], 0, 0)
ctx.restore()`,
          caption: 'Equation (5) in code, with the exit folded in: at the end of the bar each glyph falls back the way it came, faster and closer together.',
        },
        {
          type: 'h',
          text: 'Outlines and echoes',
        },
        {
          type: 'p',
          text: 'The echo sequence uses `strokeText`, which draws a glyph’s outline instead of filling it. Nine copies of *Play* are stacked from back to front, each offset by a fraction of an em up and to the right; each back copy is first filled with paper, so the copies in front hide the ones behind and the stack reads as a solid extrusion rather than a tangle of lines. Their offsets are multiplied by a travelling sine, $1 + 0.55 \\sin(\\pi\\beta - 0.55k)$ for copy $k$, so a wave runs through the stack.',
        },
        {
          type: 'h',
          text: 'Measuring a face that may not be there yet',
        },
        {
          type: 'p',
          text: 'Web fonts arrive asynchronously. Until Instrument Serif has loaded, the canvas quietly substitutes a fallback serif, which is wider and has different proportions. A piece that measured its layout once would be laid out for the wrong face forever. This one never caches a measurement: every size, width and metric is measured again every frame, which costs a few dozen `measureText` calls — microseconds — and means the layout corrects itself the moment the real face appears. The module also waits up to one and a half seconds for the fonts before its first frame, so in practice you rarely see the fallback.',
        },
        {
          type: 'p',
          text: 'The specimen measures the face too, rather than trusting published numbers. It reads the bounding boxes of single glyphs at 100 px: the top of *H* for the cap height, *x* for the x-height, the taller of *d* and *l* for the ascender, the deeper of *g* and *p* for the descender. For Instrument Serif that gives an x-height of about 0.51 em, a cap height of 0.73, an ascender of 0.75 and a descender of 0.22. The labels are placed by priority — above their line if there is room, below it if not, or not at all — so that the close pair of ascender and cap height never collide.',
        },
        {
          type: 'h',
          text: 'The poster',
        },
        {
          type: 'p',
          text: 'The final composition is computed from the grid. On a landscape screen *Engineer* fills columns 1 to 9 and *Designer* columns 4 to 12, and the third row shares one size between *Game systems* (columns 1 to 6), *Sound* (7 to 9) and *Play.* (10 to 12) so that they align on a common baseline. Each word is sized by equation (4); the stack is then scaled down uniformly if it would not fit the height, and centred. Portrait screens stack every word across all twelve columns; wide, short screens set two rows of words side by side.',
        },
        {
          type: 'code',
          code: `const sA = fit('Engineer', spanW(0, 8))
const sB = fit('Designer', spanW(3, 11), true)
const s3 = Math.min(fit('Game systems', spanW(0, 5)), fit('Sound', spanW(6, 8)), fit('Play.', spanW(9, 11), true))
const lab = 24
const total = lab + sA * 0.98 + lab + sB * 0.98 + lab + s3 * 0.98
const k = Math.min(1, (H - 10) / total)`,
          caption: 'Three sizes from three spans, and one scale factor to make the whole stack fit.',
        },
        {
          type: 'h',
          text: 'Your hand on the clock',
        },
        {
          type: 'p',
          text: 'In the viewer the piece keeps its own clock in beats, advanced by each frame’s time step. A tap anywhere moves the clock to the first beat of the next sequence; the score along the foot of the frame is a map, and tapping one of its sections goes straight there. Because every frame is computed from the beat alone, a jump costs nothing: the next frame is simply drawn at the new time.',
        },
      ],
    },
    {
      id: 'reading',
      kicker: 'Reading the drawing',
      title: 'What the annotations say',
      blocks: [
        {
          type: 'table',
          head: ['Mark', 'Meaning'],
          rows: [
            ['Header', 'The figure number, the current sequence, the tempo and the bar and beat, with four squares that light on each beat (the downbeat in moss).'],
            ['Score', 'Along the foot: one tick per beat, longer every bar, the seven sections labelled, and a moss playhead. Hovering a section underlines it; tapping goes there.'],
            ['Faint columns', 'The twelve-column grid under every sequence, which the sixth one makes visible.'],
            ['01–04 and notes', 'In Reveal: the index of each discipline and the tools behind it.'],
            ['W × H tag', 'The selection box’s size readout, as a design tool would show it.'],
            ['BASELINE, CAP HEIGHT', 'In Build: the guides the glyphs stand on and reach.'],
            ['θ', 'The angle of the glyph still standing up.'],
            ['LAYERS, OFFSET', 'In Echo: how many copies, and each copy’s offset in ems.'],
            ['TRACKING, W', 'In Track: the current tracking in ems and the word’s width in pixels.'],
            ['Specimen labels', 'In Anatomy: each guide with its height in ems, dimension lines in pixels, and named parts.'],
            ['COL a–b', 'In Grid: the span a word is snapping to.'],
          ],
          caption: 'On short screens the footnotes, the column numbers and the colophon are dropped, and the score keeps only its numerals.',
        },
        {
          type: 'p',
          text: 'Colour is used sparingly and always means the same thing. Ink is the text itself. Moss marks emphasis — the italic words, the selection, the playhead, the dimensions — and lagoon marks structure: the baseline and the grid.',
        },
        {
          type: 'p',
          text: 'With sound on, a low note marks the start of each sequence and a soft click each downbeat, so you can hear the bar lines the motion is written to.',
        },
      ],
    },
    {
      id: 'liberties',
      kicker: 'Liberties taken',
      title: 'Where the specimen is approximate',
      blocks: [
        {
          type: 'list',
          items: [
            '**Bounding boxes, not design metrics.** Cap height and the rest are read from the outlines of particular glyphs, not from the font’s own tables, so they include whatever overshoot those glyphs have.',
            '**Callouts are placed by proportion.** The apex, crossbar, ear and loop markers are positioned from the glyphs’ measured widths and heights, which fit Instrument Serif closely but would drift for a very different face.',
            '**Letter-by-letter tracking ignores kerning.** In the tracking sequence each letter is placed by its own advance plus the tracking, so the font’s pair kerning is lost — invisible at wide tracking, slightly visible near zero.',
            '**The echo is opaque.** Each outline is backed with paper so the stack reads as solid, which is a drawing choice rather than how outlines naturally overlap.',
            '**The tempo is fixed.** Real title sequences are cut to their music; here the music is implied by the beat counter and the score.',
          ],
        },
      ],
    },
  ],
  interact: {
    keys: [
      { keys: ['→', 'Space', 'Enter'], action: 'Next sequence' },
      { keys: ['←'], action: 'Back to the start of this sequence, or the one before' },
      { keys: ['1–7'], action: 'Go straight to a sequence' },
    ],
    gestures: [
      { gesture: 'tap', action: 'Tap to jump to the next sequence' },
      { gesture: 'tap', action: 'Tap a section of the score along the foot to go straight to it' },
    ],
    tip: 'Jump to V and watch the guides draw on in order — baseline first, descender last.',
  },
  further: [
    { title: 'Grid Systems in Graphic Design', by: 'Josef Müller-Brockmann', year: '1981', note: 'The manual of the twelve-column page.' },
    { title: 'Typographie: A Manual of Design', by: 'Emil Ruder', year: '1967' },
    { title: 'The New Typography', by: 'Jan Tschichold', year: '1928', note: '*Die neue Typographie*; English translation by Ruari McLean, 1995.' },
    { title: 'The Elements of Typographic Style', by: 'Robert Bringhurst', year: '1992', note: 'On spacing, measure and the anatomy of letters.' },
    { title: 'Saul Bass: A Life in Film and Design', by: 'Jennifer Bass and Pat Kirkham', year: '2011' },
    { title: 'Robert Penner’s Programming Macromedia Flash MX', by: 'Robert Penner', year: '2002', note: 'The chapter on motion that published the easing equations used everywhere since.' },
  ],
}

export default guide
