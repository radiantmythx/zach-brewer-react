# Zach Brewer — Personal Site

A modern, dark, tech-forward personal site built with React, TypeScript, and Vite.

The site is a single page — Hero, Experience, About, Contact — with an in-site
Resume viewer (zoom, drag-to-pan, page controls, download). It is **pre-rendered
to static HTML at build time** so crawlers and social scrapers receive a fully
populated page, then hydrated in the browser.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind v4 (design tokens) + inline component styles
- pdfjs-dist (lazy-loaded resume viewer)

## Design

- Dark surfaces, glowing accent (`#7c6bff` → `#22d3ee`), animated canvas hero
- Type: Space Grotesk (display), Inter (body), JetBrains Mono (labels)
- Tokens live in `src/index.css` under `@theme`

## Pre-rendering (SEO)

`npm run build` runs three steps:

1. `vite build` — client bundle + `dist/index.html` template (contains `<!--app-html-->`)
2. `vite build --ssr src/entry-server.tsx` — a server bundle in `dist/server`
3. `node scripts/prerender.mjs` — renders the app to HTML, injects it into
   `dist/index.html`, and removes the temporary server bundle

Entry points:
- `src/entry-client.tsx` — hydrates the pre-rendered markup
- `src/entry-server.tsx` — `render()` used only at build time

The resume modal (and pdfjs) is `lazy()`-loaded and rendered only when opened, so
it never enters the server bundle and ships as a separate client chunk.

SEO assets: `index.html` carries full meta + Open Graph + Twitter + JSON-LD
`Person` schema; `public/robots.txt`, `public/sitemap.xml`, and `public/og-image.svg`.

## Security

Security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`) are configured for both hosts:
- `netlify.toml` → `[[headers]]`
- `vercel.json` → `headers`

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check, build, and pre-render to static HTML
- `npm run preview` — preview the production build
- `npm run lint` — eslint

## Resume

The live resume is served from `public/resume/resume.pdf`. Swap that file to update it.

## Notes

`public/demo-*` and `public/demo-sites/` contain older standalone demo bundles. They
are no longer linked from the site and are disallowed in `robots.txt`. They can be
deleted if you don't need them — but check first whether any external listing (e.g.
the Equalization Anywhere Chrome Web Store privacy-policy URL) still points at them.
