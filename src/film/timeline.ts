import { hexToRgb, type RGB } from './math'

/*
 * The reel is scored at 128 BPM and choreographed in beats: an index, four
 * figures of eight beats each, and the mark's construction. It plays once,
 * then settles into an idle state for as long as the page is open.
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
  { id: 'game', from: 24, to: 32 },
  { id: 'music', from: 32, to: 40 },
  { id: 'resolve', from: 40, to: 48 },
]

export const REEL_BEATS = 48
export const REEL_END = REEL_BEATS * BEAT
/** the mark completes on this beat */
export const SNAP_BEAT = 42.5
/** the hero's HTML copy (the real wordmark) rises in here */
export const REVEAL_BEAT = 43.5
/** section changes are hairline wipes this long (beats) */
export const WIPE = 0.6

/* The page palette, used as linework on paper. */
export const INK = {
  paper: '#F3F6F2',
  paper2: '#E3EBE5',
  ink: '#122630',
  ink2: '#3A4F58',
  muted: '#6C7F86',
  faint: '#A9B6B8',
  ocean: '#2B6A93',
  sky: '#7FB6D9',
  lagoon: '#1F8A86',
  moss: '#3F7A55',
  sage: '#9DB9A0',
  fern: '#6F952F',
}

export interface Chapter {
  id: SectionId
  label: string
  caption: string
  note: string
  color: string
  rgb: RGB
  from: number
  to: number
}

const chapter = (id: SectionId, label: string, caption: string, note: string, color: string): Chapter => {
  const s = SECTIONS.find((x) => x.id === id)!
  return { id, label, caption, note, color, rgb: hexToRgb(color), from: s.from, to: s.to }
}

export const CHAPTERS: Chapter[] = [
  chapter('code', 'Engineering', 'Production systems at enterprise scale.', 'C# / .NET · GraphQL · React · Azure DevOps', INK.ocean),
  chapter('design', 'Interface design', 'Type, grid and motion, designed with intent.', '12 columns · 8 px baseline · cubic-bezier(.65, 0, .35, 1)', INK.lagoon),
  chapter('game', 'Game systems', 'Real-time simulation and game feel.', '60 Hz · 260 agents · deterministic', INK.moss),
  chapter('music', 'Sound', 'Synthesis, sequencing and signal.', '128 BPM · A minor · Web Audio', INK.fern),
]
