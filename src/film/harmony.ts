import { BAR, REEL_END } from './timeline'

/*
 * One harmonic world, A minor: Am9 → Fmaj7 → Cmaj9 → G6. The reel moves
 * through it bar by bar and resolves on Cmaj9 at the logo snap; the idle
 * ambience loops it slowly. The music chapter's on-screen chord names match.
 */
export interface ChordDef {
  name: string
  bass: number
  notes: number[]
}

export const CHORDS: Record<'Am9' | 'Fmaj7' | 'Cmaj9' | 'G6', ChordDef> = {
  Am9: { name: 'Am9', bass: 45, notes: [60, 64, 67, 71] },
  Fmaj7: { name: 'Fmaj7', bass: 41, notes: [57, 60, 64, 67] },
  Cmaj9: { name: 'Cmaj9', bass: 48, notes: [64, 67, 71, 74] },
  G6: { name: 'G6', bass: 43, notes: [59, 62, 64, 67] },
}

type Name = keyof typeof CHORDS

/** chord per bar of the reel (12 bars) */
export const REEL_CHORDS: Name[] = ['Am9', 'Fmaj7', 'Am9', 'Fmaj7', 'Cmaj9', 'G6', 'Am9', 'Fmaj7', 'Am9', 'Fmaj7', 'G6', 'Cmaj9']

/** idle ambience: two bars per chord */
export const IDLE_CHORDS: Name[] = ['Am9', 'Am9', 'Fmaj7', 'Fmaj7', 'Cmaj9', 'Cmaj9', 'G6', 'G6']
export const IDLE_LEN = IDLE_CHORDS.length * BAR

export function chordAt(t: number): ChordDef {
  if (t < REEL_END) return CHORDS[REEL_CHORDS[Math.max(0, Math.min(REEL_CHORDS.length - 1, Math.floor(t / BAR)))]]
  const k = Math.floor((((t - REEL_END) % IDLE_LEN) + IDLE_LEN) % IDLE_LEN / BAR)
  return CHORDS[IDLE_CHORDS[k]]
}

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
