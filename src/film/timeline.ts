import { hexToRgb, type RGB } from './math'

/*
 * The reel is scored at 128 BPM and choreographed in beats. It plays once —
 * cold open, four technique beats, logo resolve — then settles into an idle
 * state that runs for as long as the page is open.
 */
export const BPM = 128
export const BEAT = 60 / BPM
export const BAR = BEAT * 4

export type SectionId = 'open' | 'code' | 'design' | 'game' | 'music' | 'resolve'

export interface Section {
  id: SectionId
  /** in beats */
  from: number
  to: number
}

export const SECTIONS: Section[] = [
  { id: 'open', from: 0, to: 8 },
  { id: 'code', from: 8, to: 16 },
  { id: 'design', from: 16, to: 24 },
  { id: 'game', from: 24, to: 36 },
  { id: 'music', from: 36, to: 44 },
  { id: 'resolve', from: 44, to: 52 },
]

export const REEL_BEATS = 52
export const REEL_END = REEL_BEATS * BEAT
/** the logo snaps together on this beat */
export const SNAP_BEAT = 46.5
/** the hero's HTML copy (the real wordmark) slams in here */
export const REVEAL_BEAT = 47.5

/* Cool neon for the film — one hue per craft — plus a rare hot accent for impacts. */
export const NEON = {
  white: '#F2FBFF',
  blue: '#5CA8FF',
  cyan: '#3DE3F5',
  mint: '#3DFFA8',
  lime: '#B8FF5C',
  violet: '#8B7CFF',
  hot: '#FF4F8B',
  gold: '#FFD166',
}

export interface Chapter {
  id: SectionId
  label: string
  color: string
  rgb: RGB
  from: number
  to: number
}

const chapter = (id: SectionId, label: string, color: string): Chapter => {
  const s = SECTIONS.find((x) => x.id === id)!
  return { id, label, color, rgb: hexToRgb(color), from: s.from, to: s.to }
}

export const CHAPTERS: Chapter[] = [
  chapter('code', 'Programming', NEON.blue),
  chapter('design', 'Design', NEON.cyan),
  chapter('game', 'Game dev', NEON.mint),
  chapter('music', 'Music', NEON.lime),
]
