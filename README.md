# Zach Brewer — Personal Site

A single-page site built around one idea: **one line, four crafts.** The hero
is a 32-second film, drawn live on a canvas, in which a single glowing line
performs programming → design → game design → music. The page below it is a
warm, editorial layout: About, Crafts, Experience, and Contact.

It's React + TypeScript + Vite, **pre-rendered to static HTML** at build time
for SEO, then hydrated. The film and its soundtrack are hand-written Canvas 2D
and Web Audio, with no animation or audio libraries and no video files.

## The film (`src/film/`)

Everything in the film is a pure function of time, so it can loop, pause,
seek (the chapter bars are a scrubber) and stay in sync with sound.

| File | Role |
| --- | --- |
| `timeline.ts` | 120 BPM grid: beat 0.5s, bar 2s, chapter = 4 bars = 8s, loop = 32s |
| `engine.ts` | Fits the frame, blends chapters at boundaries, draws the line (halo → glow → body → core + a half-res motion trail) |
| `line.ts` | The line is 520 points. `resample` (arc-length), `blend` (travelling wipe), `uncurl` (curvature-space straightening) |
| `scenes/code.ts` | Code types itself; the caret leaps as a comet and plots `cubic-bezier(0.65, 0, 0.35, 1)` |
| `scenes/design.ts` | Pen-tool handles are dragged (live properties panel), bounding box + smart guides, golden spiral, which unrolls into… |
| `scenes/game.ts` | …a level: hills, spikes, a block, coins, a squash-and-stretch hero, and a stomp that strikes… |
| `scenes/music.ts` | …a string, which becomes a waveform made of four partials (one per discipline), then reels back into the caret |
| `harmony.ts` | The chord chart (Fmaj9 → G6 → Em7 → Am9) shared by picture and sound |
| `score.ts` | Generative soundtrack: pads, bass, FM bells, Karplus-Strong strings, drums, all scheduled from the same event times as the picture |
| `sound.ts` | "Sound on" store. The score takes over the film's clock so they can't drift |
| `layout.ts` | Choreography frames: 1600×900 landscape, 700×900 portrait |

Scenes are choreographed in a virtual frame that the engine fits between the
nav and the hero's type block (`setSafeArea`, measured by `Hero.tsx`).
Terrain and the string read `visL/visR` to run edge to edge.

**Reduced motion:** the film starts paused on a still (`POSTER_TIME`), and
visitors can press Play. There's always a Pause control.

**Easter egg:** the Konami code toggles the "director's commentary", which
draws the rig: sample points, control polygons, clock source and fps.

In dev, `window.__film` exposes the engine (`__film.pause(); __film.seek(12.4)`)
for frame-accurate review.

## Design

- Dark film stage, then a warm paper page (`--color-paper #f2efe8`, ink `#131312`, one vermilion accent `#ff5a36`)
- Discipline hues appear only where something moves: code `#7c9dff`, design `#ff6b4a`, game `#3fe0a0`, music `#ffc24d`
- Type: Instrument Serif (display), Geist (text), Geist Mono (labels and film UI)
- Tokens live in `src/index.css` under `@theme`

## Pre-rendering (SEO)

`npm run build` runs three steps:

1. `vite build`: client bundle + `dist/index.html` template (contains `<!--app-html-->`)
2. `vite build --ssr src/entry-server.tsx`: a server bundle in `dist/server`
3. `node scripts/prerender.mjs`: renders the app to HTML, injects it into
   `dist/index.html`, and removes the temporary server bundle

The client hydrates the pre-rendered markup, or renders from scratch in dev,
where the template is empty. The résumé modal (and pdfjs) is `lazy()`-loaded
and only rendered when opened.

SEO assets: `index.html` carries full meta + Open Graph + Twitter + JSON-LD
`Person` schema; `public/robots.txt`, `public/sitemap.xml`, `public/humans.txt`.
Regenerate `public/og-image.png` and `public/apple-touch-icon.png` with
`node scripts/generate-og.mjs`.

## Security

Security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`) are configured for both hosts:
`netlify.toml` → `[[headers]]` and `vercel.json` → `headers`.

## Scripts

- `npm run dev`: local dev server
- `npm run build`: type-check, build, and pre-render to static HTML
- `npm run preview`: preview the production build
- `npm run lint`: eslint

## Résumé

The live résumé is served from `public/resume/resume.pdf`. Swap that file to update it.

## Notes

`public/demo-*` and `public/demo-sites/` contain older standalone demo bundles. They
are not linked from the site and are disallowed in `robots.txt`. Before deleting
them, check whether any external listing still points at them, e.g. the
Equalization Anywhere Chrome Web Store privacy-policy URL
(`/demo-equalization-anywhere/privacy-policy.html`).
