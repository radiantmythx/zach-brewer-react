/*
 * The guide format: the long-form notes behind each piece, how to interact
 * with it, and (for touch screens) its on-screen controls. One module per
 * piece in src/playground/guides/<id>.ts with a default export of `Guide`,
 * loaded only when its viewer or notes open.
 *
 * Inline text (`Inline`) supports a small markup:
 *   *italic*   **bold**   `code`   $math$   [label](https://…)
 * Math (inline $…$ and `math` blocks) is a TeX subset, typeset in HTML:
 *   x_i  x_{i+1}  x^2  e^{-x}   \frac{a}{b}  \sqrt{x}  \hat{x} \bar{x} \vec{v} \dot{x}
 *   \text{upright words}  \mathbf{W}  \operatorname{softmax}
 *   greek: \alpha … \omega, \Gamma \Delta \Theta \Lambda \Pi \Sigma \Phi \Psi \Omega
 *   operators: \sum \prod \int \partial \nabla \infty \cdot \times \pm \approx \neq \leq \geq
 *              \to \leftarrow \mapsto \in \propto \sim \ldots \circ \lfloor \rfloor
 *   functions (upright): \sin \cos \tan \exp \log \ln \max \min \arg \tanh \det
 *   spacing: \, \; \quad    grouping: { }  ( )  [ ]  |x|   \{ \}
 */

/** A string with the inline markup described above. */
export type Inline = string

export type Block =
  /** a paragraph */
  | { type: 'p'; text: Inline }
  /** a subheading inside a section */
  | { type: 'h'; text: string }
  /** a display equation; `label` is shown at the right, e.g. '(1)' */
  | { type: 'math'; tex: string; label?: string; caption?: Inline }
  | { type: 'list'; items: Inline[]; ordered?: boolean }
  /** a short code excerpt (≤ 30 lines), usually TypeScript from the piece itself */
  | { type: 'code'; code: string; caption?: Inline; lang?: string }
  | { type: 'table'; head: string[]; rows: Inline[][]; caption?: Inline }
  /** a boxed aside: a definition, a historical note, a caveat */
  | { type: 'aside'; title?: string; text: Inline }
  | { type: 'quote'; text: Inline; cite: string }
  /**
   * A small hand-drawn diagram: an SVG string with a viewBox, drawn in
   * hairlines with stroke="currentColor" (accents may use the palette hexes),
   * no fixed width/height, no scripts. Use sparingly; one or two per guide.
   */
  | { type: 'figure'; svg: string; caption: Inline; alt: string }

export interface Section {
  /** slug for in-page links */
  id: string
  title: string
  /** small mono label above the title, e.g. 'Mathematics' */
  kicker?: string
  blocks: Block[]
}

export type GestureKind = 'tap' | 'drag' | 'swipe' | 'hold' | 'move' | 'pinch'

export interface Interact {
  /** keyboard: keys as shown on keycaps ('←', 'Space', 'Z', 'Shift', 'Enter'), and what they do */
  keys?: { keys: string[]; action: string }[]
  /** pointer / touch gestures */
  gestures?: { gesture: GestureKind; action: string }[]
  /** one line of advice */
  tip?: Inline
}

export interface PadButton {
  /** short label on the button ('←', 'Fire', '↻', 'Drop') */
  label: string
  /** the KeyboardEvent.code the button sends (pressed on touch, released on lift) */
  code: string
  /** accessible name if the label is a symbol */
  aria?: string
  /** a wider button (e.g. a main action) */
  wide?: boolean
}

/**
 * On-screen controls for touch screens. `left` is usually movement and `right`
 * actions. When `dpad` is set, the left cluster is drawn as a four-way pad
 * from [up, left, right, down] codes instead of `left`.
 */
export interface Pad {
  dpad?: [string, string, string, string]
  left?: PadButton[]
  right?: PadButton[]
}

export interface Reading {
  title: string
  by: string
  year?: string
  note?: Inline
}

export interface Guide {
  /** one or two sentences, the standfirst under the title */
  lede: Inline
  /** a spec sheet: [label, value] pairs (6–10), e.g. ['Model', 'Vogel, 1979'] */
  facts: [string, Inline][]
  /** the long read, in order */
  sections: Section[]
  /** how to interact (shown in the viewer's control legend and at the top of the notes) */
  interact: Interact
  /** on-screen touch controls, if the piece has discrete actions (games) */
  pad?: Pad
  further?: Reading[]
}
