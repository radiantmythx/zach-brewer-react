import { BAR } from './timeline'

/*
 * One progression, IV – V – iii – vi in C (Fmaj9 → G6 → Em7 → Am9), one chord
 * per bar, looping every chapter. The picture reads the same chart as the
 * synth: chapter four's waveform is literally built from these intervals.
 */
export interface ChordDef {
  name: string
  /** MIDI root for the bass */
  bass: number
  /** MIDI pad voicing */
  notes: number[]
  /** four intervals (semitones) used for the on-screen partials */
  semis: [number, number, number, number]
}

export const PROGRESSION: ChordDef[] = [
  { name: 'Fmaj9', bass: 41, notes: [57, 60, 64, 67], semis: [0, 4, 7, 14] },
  { name: 'G6', bass: 43, notes: [59, 62, 64, 67], semis: [0, 4, 7, 9] },
  { name: 'Em7', bass: 40, notes: [55, 59, 62, 64], semis: [0, 3, 7, 10] },
  { name: 'Am9', bass: 45, notes: [60, 64, 67, 71], semis: [0, 3, 10, 14] },
]

export const barIndex = (loopTime: number) => Math.floor(loopTime / BAR) % PROGRESSION.length
export const chordAt = (loopTime: number) => PROGRESSION[barIndex(loopTime)]
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
