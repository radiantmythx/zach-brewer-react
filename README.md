# Zach Brewer Personal Site

A modern personal portfolio built with React, TypeScript, and Vite.

This site is designed to feel clean, fast, and human. It showcases projects, work experience, and contact information, and includes an in-site Resume viewer modal with zoom, drag-to-pan, page controls, and one-click download.

## Highlights

- Built with React + TypeScript + Vite for a snappy experience
- Custom navigation and section-based portfolio layout
- Interactive Resume modal (no external page routing)
- PDF controls: zoom buttons, zoom slider, reset view, page navigation, drag-to-pan
- Mobile-friendly behavior so the Resume stays readable on smaller screens

## Tech Stack

- React
- TypeScript
- Vite
- pdfjs-dist

## Getting Started

1. Install dependencies

   npm install

2. Run development server

   npm run dev

3. Build for production

   npm run build

## Resume File Location

The live Resume used by the modal is served from:

public/resume/resume.pdf

If you want to replace the Resume, swap that file with your updated PDF and restart the dev server if needed.

## Available Scripts

- npm run dev: start local development server
- npm run build: type-check and create production build
- npm run build:all: build demo assets and this site build

## Notes

This project currently tracks generated demo assets under public/demo for deployment convenience.

---

Built with care to be pleasant to explore, easy to maintain, and fun to keep improving.
