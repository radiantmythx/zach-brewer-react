import { PHI } from './math'

/*
 * Scenes are choreographed in a virtual "frame" (1600×900 landscape, or
 * 700×1000 portrait for phones) that the engine fits inside the part of the
 * hero not covered by type. Anything that should feel infinite (terrain, the
 * string) reads visL/visR to run edge to edge of the real viewport instead.
 */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Frame {
  w: number
  h: number
  portrait: boolean
  /** CSS px per frame unit */
  scale: number
  /** frame units per CSS px — use for UI that should stay a constant on-screen size */
  px: number
  /** viewport edges expressed in frame units */
  visL: number
  visR: number
  visT: number
  visB: number
}

export interface Layout {
  code: { x: number; y: number; font: number; lh: number }
  caret: { x: number; y: number; h: number }
  graph: Box
  design: Box
  golden: Box
  groundY: number
  charX: number
  stringY: number
  panel: { x: number; y: number }
}

export function frameDims(portrait: boolean) {
  return portrait ? { w: 700, h: 900 } : { w: 1600, h: 900 }
}

export function makeLayout(f: Frame): Layout {
  if (f.portrait) {
    const code = { x: 40, y: 50, font: 24, lh: 36 }
    const gw = 560
    return {
      code,
      caret: { x: code.x, y: code.y + code.lh / 2, h: code.font * 1.15 },
      graph: { x: 130, y: 390, w: 440, h: 350 },
      design: { x: 125, y: 270, w: 450, h: 370 },
      golden: { x: 350 - gw / 2, y: 450 - gw / PHI / 2, w: gw, h: gw / PHI },
      groundY: 650,
      charX: 200,
      stringY: 440,
      panel: { x: 130, y: 830 },
    }
  }
  const code = { x: 150, y: 300, font: 24, lh: 40 }
  const gw = 780
  return {
    code,
    caret: { x: code.x, y: code.y + code.lh / 2, h: code.font * 1.15 },
    graph: { x: 900, y: 210, w: 520, h: 470 },
    design: { x: 540, y: 220, w: 520, h: 460 },
    golden: { x: 800 - gw / 2, y: 450 - gw / PHI / 2, w: gw, h: gw / PHI },
    groundY: 650,
    charX: 560,
    stringY: 450,
    panel: { x: 1180, y: 250 },
  }
}
