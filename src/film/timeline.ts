import { hexToRgb, type RGB } from './math'

/*
 * The film is scored at 120 BPM: one beat = 0.5s, one bar = 2s, and each of
 * the four chapters is exactly four bars. Visual events land on the grid so
 * the optional soundtrack and the picture feel choreographed together.
 */
export const BPM = 120
export const BEAT = 60 / BPM
export const BAR = BEAT * 4
export const CHAPTER = BAR * 4

export interface Chapter {
  id: 'code' | 'design' | 'game' | 'music'
  label: string
  color: string
  rgb: RGB
}

export const CHAPTERS: Chapter[] = [
  { id: 'code', label: 'Programming', color: '#7C9DFF', rgb: hexToRgb('#7C9DFF') },
  { id: 'design', label: 'Design', color: '#FF6B4A', rgb: hexToRgb('#FF6B4A') },
  { id: 'game', label: 'Game design', color: '#3FE0A0', rgb: hexToRgb('#3FE0A0') },
  { id: 'music', label: 'Music', color: '#FFC24D', rgb: hexToRgb('#FFC24D') },
]

export const LOOP = CHAPTER * CHAPTERS.length

/** A beautiful still for reduced-motion visitors: mid-drag in the design chapter. */
export const POSTER_TIME = CHAPTER * 1 + 2.1

export const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP
