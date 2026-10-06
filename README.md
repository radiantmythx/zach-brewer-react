# Zach Brewer — Personal Site

A single-page site with a hero **reel**: a 22-second piece drawn live on a
canvas, in the same minimalist language as the page. It's ink hairlines on
paper, set up as a technical drawing: an index, four figures (Engineering,
Interface design, Game systems, Sound) and the ZB monogram constructed with
compass and grid. Below it is an editorial page: About, Disciplines,
Experience, and Contact.

It's React + TypeScript + Vite, **pre-rendered to static HTML** at build time
for SEO, then hydrated. The reel and its optional soundtrack are hand-written
Canvas 2D and Web Audio, with no animation or audio libraries and no video files.

## The reel (`src/film/`)

Everything is a pure function of time, so it can pause, seek (the chapter bars
are a scrubber), replay, and stay locked to the audio clock.

| File | Role |
| --- | --- |
| `timeline.ts` | 128 BPM. Index + four 8-beat figures + resolve = 48 beats. Palette, chapter captions |
| `engine.ts` | Paper stage, figure/caption layout, hairline wipes between sections, crop marks, beat ruler and timecode |
| `kit.ts` | Draw-on primitives (lines, rects, arcs, polylines), dimension lines, registration marks, hatching, masked serif type, figure captions |
| `scenes/open.ts` | Index: a ruled line field with a travelling lens, the contents with timecodes as page numbers |
| `scenes/code.ts` | Fig. 01: an editor types a pipeline while a service topology routes itself, packets flow and the mainframe is retired |
| `scenes/design.ts` | Fig. 02: 12-column grid, a wireframe with redlines, a bezier editor, a type specimen, the palette |
| `scenes/game.ts` | Fig. 03: 260 agents in waves along a flow field, resolved on a 16th-note grid of sweeps and bursts, then a structure cut and shattered |
| `scenes/music.ts` | Fig. 04: a staff whose notes are the melody you hear, a waveform, the drum sequencer and a spectrum |
| `scenes/resolve.ts` | The ZB mark as a construction drawing, then the idle state |
| `score.ts`, `harmony.ts` | Generative soundtrack, scheduled from the same beat times as the picture |
| `sound.ts` | "Sound on" store. The score takes over the film's clock so they can't drift |
| `logo.ts` | ZB monogram geometry (also mirrored in `scripts/generate-og.mjs`) |

The reel plays once per session and resolves into the real HTML wordmark
(`Zach Brewer`), then idles. **Reduced motion:** it starts resolved and paused.
**Easter egg:** the Konami code toggles the director's commentary (figure
bounds, beat clock, fps, hitboxes). In dev, `window.__film` exposes the engine
(`__film.pause(); __film.seek(12.4)`) for frame-accurate review.

## Design

- One surface: paper `#f3f6f2`, ink `#122630`, with ocean `#2b6a93`, lagoon `#1f8a86`, moss `#3f7a55` and fern `#6f952f` as accents
- Linework over fills: 1px hairlines, crop marks, rulers, dimension lines
- Type: Instrument Serif (display), Geist (text), Geist Mono (labels and annotations)
- Tokens live in `src/index.css` under `@theme`

### Page details (`src/components/ux/`, `src/lib/`)

The page carries the reel's drawing-sheet language through to the end. Scroll
state is shared by one passive listener in `src/lib/scroll.ts`.

| Detail | Where |
| --- | --- |
| Scroll ruler: fixed tick ruler with a playhead and jump marks per section (≥1080px) | `ScrollRuler.tsx` |
| Back to top: a registration mark whose ring fills with read progress | `BackToTop.tsx` |
| Construction dividers: tick-ruled hairlines that draw out from a registration mark | `Divider.tsx` |
| Ticker: tools and disciplines on two rows that speed up with scroll velocity | `Ticker.tsx` |
| Callouts: dotted-underline phrases in About with leader-line notes, clamped to the viewport | `Callout.tsx` |
| Magnetic pills and buttons | `Magnetic.tsx` |
| Layout grid overlay: 12 columns, 20px gutter, 8px baseline. Press **G** | `GridOverlay.tsx`, `lib/grid.ts` |
| Colophon: type specimens, palette, system spec and a hairline clock on Hopkins time | `Colophon.tsx` |
| Career ruler (a Gantt of roles, linked to the timeline rows) and data figures under each SPARC stat | `Experience.tsx` |
| Crop marks and figure specs on discipline cards; scroll-spy brackets in the nav; paper grain and sheet corners | `Crafts.tsx`, `Nav.tsx`, `index.css` |

Everything is server-rendered visible and animates in on the client.
Reduced motion turns the motion off.

## The Playground (`/playground/`, `src/playground/`)

A second pre-rendered page: a sketchbook of experiments made with AI as a
collaborator. It has one long showcase piece, twelve motion studies and twelve
small games after golden-age arcade classics, all drawn live in Canvas 2D in the
site's linework language. Cards preview each piece live while it is on screen,
and a full-frame viewer adds keyboard, touch and optional sound. Viewer links are
shareable (`/playground/#golden-angle`), and the back button closes the viewer.

| File | Role |
| --- | --- |
| `types.ts` | The piece contract: `CreatePiece(env) → { frame, resize, pointer, key, destroy }` |
| `Stage.tsx` | Hosts one piece on one canvas: DPR, resize, loop (~30 fps in previews), pausing, input, errors |
| `kit.ts` | Palette, type, math, seeded rng, simplex/curl noise, easing, linework helpers, game chrome (`gameFit`, `gameFrame`, `gameHud`, `card`), input (`Keys`, `Touch`) |
| `sfx.ts` | One lazy AudioContext, a soft bus with a small room, `tone`/`noise` voices, the persisted sound toggle |
| `registry.ts` | What's listed and in what order (metadata only; code is split per piece via `loaders.ts`) |
| `Card.tsx`, `Viewer.tsx`, `PlaygroundApp.tsx` | The page |
| `showcase/golden-angle.ts` | S.01: phyllotaxis in six chapters, a pure function of time that loops seamlessly |
| `motion/*.ts` | M.01–M.12: attention, diffusion, a network training live, flow, attractors, kinetic type, gradient descent, latent space, murmuration, epicycles, interference, automata |
| `games/*.ts` | G.01–G.12, each with an attract-mode bot. `games/_template.ts` is the reference game |
| `guide.ts`, `guides/*.ts` | The notes for each piece (a long read: the phenomenon, the maths, how it works, liberties taken, further reading), its controls, and its touch pad. Loaded when a viewer opens |
| `notes/` | The notes reader (`Notes.tsx`), a small TeX-subset typesetter and inline markup (`format.ts`), the controls legend and the on-screen touch pad |

**Golden Angle.** Seeds are placed by Vogel's model: seed *i* sits at radius
c·√i and angle i·θ. The turn steps through the convergents of 1/φ² (1/2, 1/3,
2/5, 3/8, 5/13, 8/21, 13/34), which give 2, 3, 5, 8, 13, 21 and 34 spokes. It then
locks on 1/φ², where the 21 and 34 spirals draw themselves. A flower blooms and
goes to seed, the wind (your pointer) carries the seeds, a meadow grows, and the
camera dives into one flower's centre until a single seed is left, which is the
first frame. With sound on, each seed is a note pitched from its angle, so
rational turns repeat and the golden turn never does.

**Notes and controls.** Every piece has a guide in `guides/<id>.ts`. The viewer's
*Notes* button (or `/playground/#<id>/notes`) opens it beside the running piece
on wide screens, or as a sheet on phones. The viewer's footer shows the controls
as keycaps and gesture icons. On touch screens, games show an on-screen pad whose
buttons press and release real key codes through the Stage. The viewer and the
games also have layouts for very short screens, such as a phone on its side: the
pads sit either side of the stage, and `kit.gameFit` reports `compact` or `side`
so HUDs condense or move into the margins.

**Testing a piece.** `/playground/?solo=games/stack&mode=full&t=6` renders one piece
full-bleed and steps it deterministically to `t` seconds, then freezes it.
`&mode=preview&w=420&h=315` renders it at card size, and other params reach the piece
(`&state=play&bot=1` lets a game's bot play; `&at=57` seeks Golden Angle). This
works with headless Chrome or Edge `--screenshot`.

## Pre-rendering (SEO)

`npm run build` runs three steps:

1. `vite build`: client bundles + two HTML templates, `dist/index.html` and
   `dist/playground/index.html` (each contains `<!--app-html-->`)
2. `vite build --ssr src/entry-server.tsx`: a server bundle in `dist/server`
3. `node scripts/prerender.mjs`: renders each page to HTML (`render(url)`), injects
   it into its template, and removes the temporary server bundle

The client hydrates the pre-rendered markup, or renders from scratch in dev,
where the template is empty. The résumé modal (and pdfjs) is `lazy()`-loaded
and only rendered when opened.

SEO assets: `index.html` carries full meta + Open Graph + Twitter + JSON-LD
`Person` schema; `public/robots.txt`, `public/sitemap.xml`, `public/humans.txt`.
Regenerate `public/favicon.svg`, `public/og-image.png` and
`public/apple-touch-icon.png` with `node scripts/generate-og.mjs`. It uses
opentype.js (pinned to 1.3; 2.x mis-parses the italic) and
`@fontsource/instrument-serif` to set the wordmark as paths.

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
