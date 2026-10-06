/*
 * FIG. M.01 — ATTENTION. Multi-head self-attention over one sentence, drawn
 * as an arc diagram. The sentence is set, tokenised (brackets, token ids,
 * embedding strips), then each of four heads reads it one query at a time:
 * arcs fan from the query to every key with stroke weight = softmax weight.
 *
 * The weights are computed, not drawn by hand: seeded token embeddings plus
 * sinusoidal positions, fixed random W_q / W_k per head, scaled dot product,
 * softmax — plus a per-head bias so each head tells its story (a previous-
 * token head, a coreference head where "it" finds "trophy" — the Winograd
 * sentence — a syntax head, and a broad, near-uniform head). The four
 * attention matrices fill row by row as Hinton diagrams; at the peak every
 * head draws at once. Loop: 23 s.
 *
 * Interaction (full mode): hover a word to read its row in all four heads,
 * hover a matrix cell to read one weight, tap to pin (tap again or tap the
 * paper to release). ← → step the pinned query, 1–4 solo a head, 0 shows
 * all heads, Space pauses the timeline.
 */

import { C, clamp, cropMarks, ease, gauss, inkOn, lerp, mixHex, rgba, rng, setFont, TAU, text } from '../kit'
import type { CreatePiece } from '../types'

/* ------------------------------------------------------------------ data */

interface Tok {
  s: string
  id: number
  /** preceded by a space in running text */
  sp: boolean
}

const TOKS: Tok[] = [
  { s: 'The', id: 464, sp: false },
  { s: 'trophy', id: 26393, sp: true },
  { s: 'didn', id: 1422, sp: true },
  { s: '’t', id: 470, sp: false },
  { s: 'fit', id: 4197, sp: true },
  { s: 'in', id: 287, sp: true },
  { s: 'the', id: 262, sp: true },
  { s: 'suitcase', id: 33836, sp: true },
  { s: 'because', id: 780, sp: true },
  { s: 'it', id: 340, sp: true },
  { s: 'was', id: 373, sp: true },
  { s: 'too', id: 1165, sp: true },
  { s: 'big', id: 1263, sp: true },
  { s: '.', id: 13, sp: false },
]
const N = TOKS.length
const SENTENCE = TOKS.map((t, i) => (i > 0 && t.sp ? ' ' : '') + t.s).join('')
const D = 16
const DK = 8
const [THE, TROPHY, DIDN, NT, FIT, IN, THE2, SUITCASE, BECAUSE, IT, WAS, TOO, BIG, DOT] = TOKS.map((_, i) => i)

interface Head {
  key: string
  name: string
  color: string
  /** scale on the random QKᵀ part */
  gain: number
  /** arc height multiplier, so the heads layer at the peak */
  mul: number
  /** overall opacity at the peak */
  alpha: number
  bias: (i: number, j: number) => number
}

const pairs = (list: [number, number, number][]) => {
  const m = new Map<number, number>()
  for (const [i, j, v] of list) m.set(i * N + j, v)
  return (i: number, j: number) => m.get(i * N + j) ?? 0
}

const corefB = pairs([
  [IT, TROPHY, 5.4],
  [IT, SUITCASE, 3.7],
  [BIG, TROPHY, 2.8],
  [THE, TROPHY, 2.2],
  [THE2, SUITCASE, 2.4],
  [SUITCASE, TROPHY, 1.8],
  [WAS, IT, 1.8],
  [TOO, BIG, 1.2],
  [DOT, TROPHY, 1.6],
])
const syntaxB = pairs([
  [THE, TROPHY, 2.6],
  [TROPHY, FIT, 2.6],
  [DIDN, FIT, 2.8],
  [NT, DIDN, 3.4],
  [FIT, TROPHY, 3.2],
  [IN, SUITCASE, 3.2],
  [THE2, SUITCASE, 1.6],
  [SUITCASE, IN, 2.8],
  [BECAUSE, FIT, 3.0],
  [IT, WAS, 2.4],
  [WAS, BIG, 2.2],
  [TOO, BIG, 3.2],
  [BIG, IT, 2.8],
  [DOT, FIT, 2.6],
])

const HEADS: Head[] = [
  { key: 'H1', name: 'Previous token', color: C.ocean, gain: 0.45, mul: 0.46, alpha: 1, bias: (i, j) => (j === i - 1 ? 4.6 : i === 0 && j === 0 ? 4 : j === i ? 0.6 : 0) },
  { key: 'H2', name: 'Coreference', color: C.lagoon, gain: 0.6, mul: 1, alpha: 1, bias: (i, j) => corefB(i, j) + (i === j ? 1.3 : 0) },
  { key: 'H3', name: 'Syntax', color: C.moss, gain: 0.55, mul: 0.78, alpha: 0.9, bias: (i, j) => syntaxB(i, j) + (i === j ? 0.5 : 0) },
  { key: 'H4', name: 'Broad', color: C.fern, gain: 0.2, mul: 0.62, alpha: 0.55, bias: (_i, j) => (j === DOT ? 0.45 : j === THE ? 0.3 : 0) },
]
const NH = HEADS.length

/** Embeddings, per-head projections, scaled dot-product attention. */
function computeAttention() {
  const E = new Float32Array(N * D)
  for (let i = 0; i < N; i++) {
    const tr = rng(TOKS[i].id * 7919 + 17)
    for (let d = 0; d < D; d++) {
      const k = Math.floor(d / 2)
      const ang = i / Math.pow(10000, (2 * k) / D)
      E[i * D + d] = gauss(tr) * 0.8 + (d % 2 === 0 ? Math.sin(ang) : Math.cos(ang)) * 0.5
    }
  }
  const r = rng(1729)
  const A: Float32Array[] = []
  const q = new Float32Array(N * DK)
  const k = new Float32Array(N * DK)
  const row = new Float32Array(N)
  for (const head of HEADS) {
    const Wq = new Float32Array(D * DK)
    const Wk = new Float32Array(D * DK)
    for (let i = 0; i < D * DK; i++) Wq[i] = gauss(r) / Math.sqrt(D)
    for (let i = 0; i < D * DK; i++) Wk[i] = gauss(r) / Math.sqrt(D)
    for (let i = 0; i < N; i++)
      for (let c = 0; c < DK; c++) {
        let sq = 0
        let sk = 0
        for (let d = 0; d < D; d++) {
          sq += E[i * D + d] * Wq[d * DK + c]
          sk += E[i * D + d] * Wk[d * DK + c]
        }
        q[i * DK + c] = sq
        k[i * DK + c] = sk
      }
    const W = new Float32Array(N * N)
    for (let i = 0; i < N; i++) {
      let mx = -Infinity
      for (let j = 0; j < N; j++) {
        let s = 0
        for (let c = 0; c < DK; c++) s += q[i * DK + c] * k[j * DK + c]
        row[j] = (s / Math.sqrt(DK)) * head.gain + head.bias(i, j)
        if (row[j] > mx) mx = row[j]
      }
      let sum = 0
      for (let j = 0; j < N; j++) {
        row[j] = Math.exp(row[j] - mx)
        sum += row[j]
      }
      for (let j = 0; j < N; j++) W[i * N + j] = row[j] / sum
    }
    A.push(W)
  }
  return { E, A }
}

/* -------------------------------------------------------------- timeline */

const LOOP = 23
const SWEEPS: [number, number][] = [
  [4.0, 6.6],
  [6.6, 10.4],
  [10.4, 13.0],
  [13.0, 15.4],
]
const PEAK = 15.6
const REL = 20.0
const CLOSE0 = 20.8
const CLOSE1 = 21.7
const FALL0 = 21.9


/** Slot start/length per sweep and query; the coreference head lingers on "it". */
const SLOTS = SWEEPS.map(([t0, t1], h) => {
  const w = TOKS.map((_, i) => (h === 1 && i === IT ? 9 : 1))
  const total = w.reduce((a, b) => a + b, 0)
  const start: number[] = []
  const len: number[] = []
  let acc = t0
  for (let i = 0; i < N; i++) {
    start.push(acc)
    len.push(((t1 - t0) * w[i]) / total)
    acc += len[i]
  }
  return { start, len }
})

const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const drawDur = (len: number) => Math.min(0.55, len * 0.75)

/* --------------------------------------------------------------- layout */

interface Layout {
  portrait: boolean
  small: boolean
  /** very short frames: no matrices, no formula */
  tiny: boolean
  pad: number
  fs: number
  bpad: number
  /** text-state and token-state positions (left x, baseline y) */
  ax: Float32Array
  ay: Float32Array
  bx: Float32Array
  by: Float32Array
  tw: Float32Array
  /** arc anchors in token state */
  px: Float32Array
  py: Float32Array
  arcMax: number
  span: number
  /** matrices */
  mx: number[]
  my: number
  ms: number
  rowLabels: boolean
  /** readout panel */
  rx: number
  ry: number
  rw: number
  idsLeft: number
  capY: number
}

/* ---------------------------------------------------------------- piece */

const create: CreatePiece = (env) => {
  const { ctx } = env
  const { E, A } = computeAttention()
  const preview = env.mode === 'preview'

  // per head: arcs grouped by weight level for batched stroking
  const LEVELS = 9
  const levelOf = (w: number) => Math.min(LEVELS - 1, Math.floor(Math.sqrt(w) * LEVELS))
  const groups: Uint16Array[][] = A.map((W) => {
    const lv: number[][] = Array.from({ length: LEVELS }, () => [])
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) lv[levelOf(W[i * N + j])].push(i * N + j)
    return lv.map((l) => Uint16Array.from(l))
  })
  const styleW = (w: number) => 0.45 + 2.6 * w
  const styleA = (w: number) => 0.1 + 0.9 * Math.sqrt(w)
  const top3 = A.map((W) =>
    TOKS.map((_, i) =>
      TOKS.map((__, j) => j)
        .sort((a, b) => W[i * N + b] - W[i * N + a])
        .slice(0, 3),
    ),
  )
  const entropy = A.map((W) =>
    TOKS.map((_, i) => {
      let s = 0
      for (let j = 0; j < N; j++) {
        const p = W[i * N + j]
        if (p > 1e-9) s -= p * Math.log(p)
      }
      return s
    }),
  )

  let L: Layout = layout(env.width, env.height)
  let fontsReady = fontsLoaded()
  let lastNote = -1

  /* ---------------------------------------------------------- interaction */
  // the piece keeps its own clock so that inspecting (hover / pin / pause) freezes the timeline
  let clock = 0
  let paused = false
  interface Focus {
    /** query token */
    i: number
    /** head, or -1 for all heads */
    h: number
    /** key (hovering a matrix cell), or -1 */
    j: number
  }
  let hover: Focus | null = null
  let pin: Focus | null = null
  let solo = -1
  let interacted = false
  let focusKey = ''
  let focusT = 0
  let down: { x: number; y: number } | null = null
  let canInspect = false
  let gridVisible = false
  // test route: &pin=i[,head 1-4[,key]] or &hover=… to see the inspector headlessly
  for (const name of ['pin', 'hover'] as const) {
    const v = env.params.get(name)
    if (!v) continue
    const [i, h, j] = v.split(',').map(Number)
    const f = { i: clamp(i | 0, 0, N - 1), h: h ? clamp(h - 1, 0, NH - 1) : -1, j: Number.isFinite(j) ? clamp(j | 0, 0, N - 1) : -1 }
    if (name === 'pin') pin = f
    else hover = f
    interacted = true
  }

  /** What is under the pointer: a token, or a cell of one of the four matrices. */
  function hitTest(x: number, y: number, touch: boolean): Focus | null {
    if (!canInspect) return null
    const slop = touch ? 10 : 3
    for (let i = 0; i < N; i++) {
      const x0 = L.bx[i] - L.bpad - slop
      const x1 = L.bx[i] + L.tw[i] + L.bpad + slop
      const y0 = L.by[i] - L.fs * 0.9 - slop
      const y1 = L.by[i] + L.fs * 0.3 + slop
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return { i, h: -1, j: -1 }
    }
    if (gridVisible && L.ms > 0) {
      const cell = L.ms / N
      for (let h = 0; h < NH; h++) {
        const cx = (x - L.mx[h]) / cell
        const cy = (y - L.my) / cell
        if (cx >= 0 && cx < N && cy >= 0 && cy < N) return { i: Math.floor(cy), h, j: Math.floor(cx) }
      }
    }
    return null
  }

  /** The query being inspected, if any (hover wins over the pin). */
  function focus(): Focus | null {
    const f = hover ?? pin
    if (!f) return null
    return { i: f.i, h: f.h >= 0 ? f.h : solo, j: f.j }
  }

  /** Jump the clock to a moment where the tokens are laid out, so a pin set by key can be read. */
  function ensureSpread() {
    const lt = clock % LOOP
    if (lt < 3.4) clock += 3.4 - lt
    else if (lt > CLOSE0 - 0.3) clock += LOOP - lt + 3.4
  }

  function fontsLoaded() {
    try {
      return typeof document !== 'undefined' && !!document.fonts && document.fonts.check('40px "Instrument Serif"')
    } catch {
      return true
    }
  }

  function measure(s: string, size: number) {
    setFont(ctx, { font: 'serif', size })
    return ctx.measureText(s).width
  }

  function layout(w: number, h: number): Layout {
    const portrait = h > w * 1.08
    const small = preview || Math.min(w, h) < 380 || (h <= w * 1.08 && w < 600)
    const pad = clamp(Math.min(w, h) * 0.05, 14, 44)
    const ax = new Float32Array(N)
    const ay = new Float32Array(N)
    const bx = new Float32Array(N)
    const by = new Float32Array(N)
    const tw = new Float32Array(N)
    const px = new Float32Array(N)
    const py = new Float32Array(N)
    const ref = TOKS.map((t) => measure(t.s, 100))
    const spaceRef = measure(' ', 100)
    const capY = h - pad * 0.62
    const tiny = !portrait && h < 250
    const topBand = pad + (tiny ? 34 : small ? 30 : 58)

    if (!portrait) {
      // token row: brackets (0.16 fs each side) and gaps (0.2 fs)
      const avail = w - pad * 2
      const unit = ref.reduce((a, b) => a + b, 0) / 100 + N * 0.32 + (N - 1) * 0.24
      const fs = clamp(Math.min(avail / unit, h * 0.072), 10, 64)
      const bpad = fs * 0.16
      const gap = fs * 0.24
      const total = unit * fs
      // matrices + readout band at the bottom
      const gapM = small ? 8 : clamp(w * 0.018, 12, 30)
      const rw = small ? 0 : clamp(w * 0.2, 170, 250)
      const rowLabels = !small && h > 560 && w > 900
      const labelW = rowLabels ? 62 : 0
      const msW = (w - pad * 2 - labelW - gapM * 3 - (rw ? rw + gapM * 1.6 : 0)) / 4
      const ms = tiny ? 0 : Math.floor(Math.max(30, Math.min(msW, h * (small ? 0.27 : 0.25))))
      const my = capY - (small ? 10 : 20) - ms
      const bandW = labelW + ms * 4 + gapM * 3 + (rw ? rw + gapM * 1.6 : 0)
      const bandX = pad + Math.max(0, (w - pad * 2 - bandW) / 2)
      const mx = [0, 1, 2, 3].map((k) => bandX + labelW + k * (ms + gapM))
      const rx = mx[3] + ms + gapM * 1.6
      // tokens sit above the matrix labels with room for ids + embedding strips
      const below = small ? fs * 0.45 : fs * 1.45 + 30
      const baseY = tiny ? capY - 18 - fs * 0.3 : my - (small ? 16 : 26) - below
      let x = pad + (avail - total) / 2
      // natural sentence, centred
      let nat = 0
      ref.forEach((r, i) => (nat += (r / 100) * fs + (i > 0 && TOKS[i].sp ? (spaceRef / 100) * fs : 0)))
      let nx = pad + (avail - nat) / 2
      for (let i = 0; i < N; i++) {
        tw[i] = (ref[i] / 100) * fs
        if (i > 0 && TOKS[i].sp) nx += (spaceRef / 100) * fs
        ax[i] = nx
        ay[i] = baseY
        nx += tw[i]
        x += bpad
        bx[i] = x
        by[i] = baseY
        x += tw[i] + bpad + gap
        px[i] = bx[i] + tw[i] / 2
        py[i] = baseY - fs * 0.8 - 5
      }
      const arcMax = Math.max(20, (py[0] - topBand) * 0.96)
      return { portrait, small, tiny, pad, fs, bpad, ax, ay, bx, by, tw, px, py, arcMax, span: px[N - 1] - px[0], mx, my, ms, rowLabels, rx, ry: my - (small ? 8 : 12), rw, idsLeft: 0, capY }
    }

    // portrait: tokens in a column, arcs bulge to the right
    const gapM = 8
    const ms = Math.floor((w - pad * 2 - gapM * 3) / 4)
    const readH = small ? 0 : 104
    const colTop = topBand + 6
    const colBottom = capY - 22 - readH - ms - 22
    const rh = clamp((colBottom - colTop) / N, 14, 40)
    const fs = clamp(rh * 0.72, 10, 30)
    const bpad = fs * 0.16
    const idW = small ? 0 : 40
    const maxW = Math.max(...ref) / 100 * fs
    const anchor = pad + idW + maxW + bpad * 2 + 6
    // natural paragraph, wrapped to the width
    const lineH = fs * 1.35
    const space = (spaceRef / 100) * fs
    let lx = pad
    let ly = colTop + fs
    for (let i = 0; i < N; i++) {
      tw[i] = (ref[i] / 100) * fs
      const lead = i > 0 && TOKS[i].sp ? space : 0
      if (lx + lead + tw[i] > w - pad && TOKS[i].sp) {
        lx = pad
        ly += lineH
      } else lx += lead
      ax[i] = lx
      ay[i] = ly
      lx += tw[i]
      bx[i] = anchor - bpad - tw[i]
      by[i] = colTop + rh * (i + 0.72)
      px[i] = anchor + 5
      py[i] = by[i] - fs * 0.3
    }
    const my = colTop + rh * N + 26
    const mx = [0, 1, 2, 3].map((k) => pad + k * (ms + gapM))
    return {
      portrait,
      small,
      tiny: false,
      pad,
      fs,
      bpad,
      ax,
      ay,
      bx,
      by,
      tw,
      px,
      py,
      arcMax: Math.max(20, w - pad - anchor - 14),
      span: py[N - 1] - py[0],
      mx,
      my,
      ms,
      rowLabels: false,
      rx: pad,
      ry: my + ms + 24,
      rw: w - pad * 2,
      idsLeft: pad,
      capY,
    }
  }

  /* ------------------------------------------------------------ geometry */

  // arc i → j for head h: quadratic from anchor i to anchor j
  function ctrl(h: number, i: number, j: number): [number, number] {
    const mul = HEADS[h].mul
    if (!L.portrait) {
      const d = Math.abs(L.px[j] - L.px[i])
      const hh = L.arcMax * mul * Math.pow(d / L.span, 0.62) + 4
      return [(L.px[i] + L.px[j]) / 2, L.py[i] - hh * 2]
    }
    const d = Math.abs(L.py[j] - L.py[i])
    const hh = L.arcMax * mul * Math.pow(d / L.span, 0.62) + 4
    return [L.px[i] + hh * 2, (L.py[i] + L.py[j]) / 2]
  }

  /** Add the [a, b] parameter range of arc (h, i → j) to the current path. */
  function addArc(h: number, i: number, j: number, a: number, b: number) {
    if (b <= a) return
    if (i === j) {
      const r = (L.portrait ? 4 : 5) + 5 * HEADS[h].mul
      const x = L.px[i]
      const y = L.py[i]
      const cx = L.portrait ? x + r : x
      const cy = L.portrait ? y : y - r
      const s = L.portrait ? Math.PI : Math.PI / 2
      ctx.moveTo(cx + Math.cos(s + a * TAU) * r, cy + Math.sin(s + a * TAU) * r)
      ctx.arc(cx, cy, r, s + a * TAU, s + b * TAU)
      return
    }
    const x0 = L.px[i]
    const y0 = L.py[i]
    const x1 = L.px[j]
    const y1 = L.py[j]
    const [cx, cy] = ctrl(h, i, j)
    // blossom of the quadratic: sub-curve [a, b]
    const ax = (1 - a) * (1 - a) * x0 + 2 * (1 - a) * a * cx + a * a * x1
    const ay = (1 - a) * (1 - a) * y0 + 2 * (1 - a) * a * cy + a * a * y1
    const bx = (1 - b) * (1 - b) * x0 + 2 * (1 - b) * b * cx + b * b * x1
    const by = (1 - b) * (1 - b) * y0 + 2 * (1 - b) * b * cy + b * b * y1
    const qx = (1 - a) * (1 - b) * x0 + ((1 - a) * b + a * (1 - b)) * cx + a * b * x1
    const qy = (1 - a) * (1 - b) * y0 + ((1 - a) * b + a * (1 - b)) * cy + a * b * y1
    ctx.moveTo(ax, ay)
    ctx.quadraticCurveTo(qx, qy, bx, by)
  }

  function apex(h: number, i: number, j: number): [number, number] {
    if (i === j) {
      const r = (L.portrait ? 4 : 5) + 5 * HEADS[h].mul
      return L.portrait ? [L.px[i] + r * 2, L.py[i]] : [L.px[i], L.py[i] - r * 2]
    }
    const [cx, cy] = ctrl(h, i, j)
    return [(L.px[i] + 2 * cx + L.px[j]) / 4, (L.py[i] + 2 * cy + L.py[j]) / 4]
  }

  /* -------------------------------------------------------------- drawing */

  function strokeLevel(h: number, lev: number, alphaMul: number) {
    const w = Math.pow((lev + 0.5) / LEVELS, 2)
    ctx.lineWidth = styleW(w)
    ctx.strokeStyle = rgba(HEADS[h].color, styleA(w) * alphaMul)
    ctx.stroke()
  }

  /** All arcs of head h; range(i) → [a, b] parameter range per query (or null). */
  function drawHead(h: number, alphaMul: number, range: (i: number, j: number) => number, from: (i: number, j: number) => number, minW = 0) {
    if (alphaMul <= 0.002) return
    const W = A[h]
    for (let lev = 0; lev < LEVELS; lev++) {
      const g = groups[h][lev]
      if (!g.length) continue
      ctx.beginPath()
      let any = false
      for (let k = 0; k < g.length; k++) {
        const i = Math.floor(g[k] / N)
        const j = g[k] % N
        if (W[g[k]] < minW) continue
        const b = range(i, j)
        const a = from(i, j)
        if (b > a) {
          addArc(h, i, j, a, b)
          any = true
        }
      }
      if (any) strokeLevel(h, lev, alphaMul)
    }
  }

  function drawQuery(h: number, i: number, p: number, alphaMul: number, labels: number) {
    const W = A[h]
    ctx.lineCap = 'round'
    for (let j = 0; j < N; j++) {
      const w = W[i * N + j]
      const d = L.portrait ? Math.abs(L.py[j] - L.py[i]) : Math.abs(L.px[j] - L.px[i])
      const pj = ease.outCubic(clamp(p / (0.55 + 0.45 * (d / L.span))))
      if (pj <= 0) continue
      ctx.beginPath()
      addArc(h, i, j, 0, pj)
      ctx.lineWidth = styleW(w)
      ctx.strokeStyle = rgba(HEADS[h].color, styleA(w) * alphaMul)
      ctx.stroke()
      // landing dot
      if (pj >= 1 && w > 0.04) {
        ctx.fillStyle = rgba(HEADS[h].color, alphaMul * (0.4 + w))
        ctx.beginPath()
        ctx.arc(L.px[j], L.py[j], 1 + 2.2 * Math.sqrt(w), 0, TAU)
        ctx.fill()
      }
    }
    ctx.lineCap = 'butt'
    // weight labels at the apex of the strongest arcs
    if (labels > 0) {
      const k = inkOn('paper')
      top3[h][i].slice(0, 2).forEach((j, n) => {
        const [x, y] = apex(h, i, j)
        const s = W[i * N + j].toFixed(2)
        setFont(ctx, { size: L.small ? 8.5 : 10, weight: 500 })
        const tw = ctx.measureText(s).width + 8
        ctx.globalAlpha = labels * (n === 0 ? 1 : 0.8)
        ctx.fillStyle = C.paper
        ctx.fillRect(x - tw / 2, y - 7, tw, 14)
        text(ctx, s, x, y + 0.5, { size: L.small ? 8.5 : 10, color: n === 0 ? HEADS[h].color : k.ink2, align: 'center', baseline: 'middle', tracking: 0.04 })
        ctx.globalAlpha = 1
      })
    }
  }

  function tokenPos(i: number, k: number): [number, number] {
    return [lerp(L.ax[i], L.bx[i], k), lerp(L.ay[i], L.by[i], k)]
  }

  function drawFormula(x: number, y: number, size: number, color: string, alpha: number) {
    if (alpha <= 0) return
    ctx.globalAlpha = alpha
    let cx = x
    const put = (s: string, o: { italic?: boolean; scale?: number; dy?: number } = {}) => {
      const sz = size * (o.scale ?? 1)
      setFont(ctx, { font: 'serif', size: sz, italic: o.italic })
      ctx.fillStyle = color
      ctx.fillText(s, cx, y + (o.dy ?? 0) * size)
      cx += ctx.measureText(s).width
    }
    put('softmax(')
    put('QK', { italic: true })
    put('T', { scale: 0.6, dy: -0.42 })
    cx += size * 0.12
    put('/')
    cx += size * 0.1
    // a drawn radical over d_k
    const r0 = cx
    setFont(ctx, { font: 'serif', size, italic: true })
    const dw = ctx.measureText('d').width
    setFont(ctx, { font: 'serif', size: size * 0.6, italic: true })
    const kw = ctx.measureText('k').width
    const rad = dw + kw + size * 0.12
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(r0, y - size * 0.36)
    ctx.lineTo(r0 + size * 0.1, y - size * 0.42)
    ctx.lineTo(r0 + size * 0.26, y + size * 0.04)
    ctx.lineTo(r0 + size * 0.46, y - size * 0.8)
    ctx.lineTo(r0 + size * 0.5 + rad, y - size * 0.8)
    ctx.stroke()
    cx = r0 + size * 0.52
    put('d', { italic: true })
    put('k', { italic: true, scale: 0.6, dy: 0.2 })
    cx += size * 0.1
    put(')')
    put('V', { italic: true })
    ctx.globalAlpha = 1
    return cx - x
  }

  function frame(t: number, dt: number) {
    const w = env.width
    const h = env.height
    if (!fontsReady && fontsLoaded()) {
      fontsReady = true
      L = layout(w, h)
    }
    const k = inkOn('paper')
    const f0 = focus()
    // inspecting holds the timeline once everything is laid out (the tokenising beat finishes first);
    // during the release it skips ahead to the next loop's laid-out state
    const lt0 = clock % LOOP
    if (f0 && canInspect && lt0 > REL) clock += LOOP - lt0 + SWEEPS[0][0]
    const frozen = paused || (!!f0 && canInspect && lt0 >= SWEEPS[0][0])
    if (!frozen) clock += dt
    const lt = clock % LOOP
    const first = clock < LOOP
    ctx.fillStyle = C.paper
    ctx.fillRect(0, 0, w, h)
    const { pad, fs, small } = L

    /* ------------------------------------------------------------ chrome */
    const chromeIn = first ? ease.outCubic(seg(t, 0, 0.9)) : 1
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.5 * chromeIn)
    cropMarks(ctx, pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9, small ? 7 : 10)
    const hy = pad + (small ? 4 : 6)
    ctx.globalAlpha = chromeIn
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    const hs = small ? 8.5 : 10
    text(ctx, 'FIG. M.01', pad + 26, hy, { size: hs, color: C.ocean, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const figW = ctx.measureText('FIG. M.01').width
    text(ctx, small || w < 560 ? 'SELF-ATTENTION' : 'SELF-ATTENTION · 4 HEADS', pad + 26 + figW + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    const tc = `T ${String(Math.floor(lt / 60)).padStart(2, '0')}:${lt.toFixed(2).padStart(5, '0')}`
    text(ctx, tc, w - pad, hy, { size: small ? 8.5 : 10, color: k.muted, align: 'right', tracking: 0.12 })
    ctx.globalAlpha = 1
    // the formula, set under the figure label
    const fSize = small ? 15 : clamp(w * 0.017, 17, 26)
    const formulaIn = first ? seg(t, 0.4, 1.2) : 1
    if (!L.tiny) drawFormula(pad, hy + fSize + (small ? 6 : 12), fSize, C.ink, formulaIn)
    if (!small) {
      // phase label under the timecode
      const fp = canInspect ? focus() : null
      const phase = fp
        ? `INSPECT · “${TOKS[fp.i].s}” · ${fp.h >= 0 ? `HEAD ${fp.h + 1}` : 'ALL HEADS'}`
        : lt < 1.9 ? `INPUT · ${SENTENCE.length} CHARACTERS` : lt < SWEEPS[0][0] ? 'TOKENISE · 14 TOKENS' : lt < PEAK ? `READ · HEAD ${Math.min(3, SWEEPS.findIndex(([, b]) => lt < b)) + 1} OF 4` : lt < REL ? 'ALL HEADS · 784 WEIGHTS' : 'RELEASE'
      text(ctx, phase, w - pad, hy + 18, { size: 9.5, color: k.ink2, align: 'right', tracking: 0.14, alpha: chromeIn })
    }

    /* ------------------------------------------------- token state 0 → 1 */
    const spread = ease.inOutCubic(seg(lt, 2.1, 3.1)) * (1 - ease.inOutCubic(seg(lt, CLOSE0, CLOSE1)))
    const brk = seg(lt, 1.9, 2.5) * (1 - seg(lt, CLOSE0 - 0.4, CLOSE0 + 0.2))
    const idsIn = seg(lt, 2.6, 3.2)
    const idsOut = 1 - seg(lt, CLOSE0 - 0.5, CLOSE0)
    const ids = idsIn * idsOut
    const emb = seg(lt, 2.8, 3.6) * (1 - seg(lt, CLOSE0 - 0.6, CLOSE0 - 0.1))
    const gridIn = seg(lt, 3.1, 4.0) * (1 - seg(lt, REL + 0.5, CLOSE0 + 0.4))
    canInspect = !preview && spread > 0.98
    gridVisible = gridIn > 0.5
    const F = canInspect ? f0 : null
    const fk = F ? `${F.i}|${F.h}` : ''
    if (fk !== focusKey) {
      focusKey = fk
      focusT = 0
    } else focusT += dt
    if (!preview) env.setCursor(canInspect && hover ? 'pointer' : 'default')

    // active sweep / query
    let sweep = -1
    for (let s = 0; s < SWEEPS.length; s++) if (lt >= SWEEPS[s][0] && lt < SWEEPS[s][1]) sweep = s
    let query = -1
    let qp = 0
    if (sweep >= 0) {
      const S = SLOTS[sweep]
      for (let i = 0; i < N; i++) if (lt >= S.start[i]) query = i
      qp = (lt - S.start[query]) / drawDur(S.len[query])
    }
    // the peak's reading scan
    const scanP = seg(lt, PEAK + 1.6, REL - 0.2)
    const scan = lt >= PEAK + 1.6 && lt < REL - 0.2 ? Math.min(N - 1, Math.floor(scanP * N)) : -1

    // sound: a soft note per query step
    const note = sweep >= 0 ? sweep * N + query : scan >= 0 ? 100 + scan : -1
    if (note !== lastNote) {
      if (note >= 0 && env.mode === 'full') {
        const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31]
        const qi = sweep >= 0 ? query : scan
        const base = sweep >= 0 ? [220, 247.5, 196, 165][sweep] : 110
        env.sfx.tone(base * Math.pow(2, PENTA[qi] / 12), sweep === 1 && qi === IT ? 1.2 : 0.16, { type: 'sine', gain: 0.05, room: 0.35, pan: (qi / (N - 1)) * 1.2 - 0.6 })
      }
      lastNote = note
    }

    /* ------------------------------------------------------------- arcs */
    ctx.lineCap = 'round'
    if (F) drawInspect(F, focusT)
    else for (let hh = 0; hh < NH; hh++) {
      const [t0, t1] = SWEEPS[hh]
      const S = SLOTS[hh]
      if (lt >= t0 && lt < PEAK + 0.6) {
        // ghosts of queries already read in this head
        const fade = lt < t1 ? 1 : 1 - seg(lt, t1, t1 + 0.7)
        drawHead(
          hh,
          0.2 * fade * (lt > PEAK - 0.2 ? 1 - seg(lt, PEAK - 0.2, PEAK + 0.6) : 1),
          (i) => (S.start[i] + S.len[i] <= lt ? 1 : 0),
          () => 0,
        )
      }
    }
    if (!F && sweep >= 0 && query >= 0) {
      const S = SLOTS[sweep]
      const long = S.len[query] > 0.6
      const out = 1 - seg(lt, S.start[query] + S.len[query] - 0.05, S.start[query] + S.len[query])
      const labA = long ? seg(lt, S.start[query] + 0.5, S.start[query] + 0.8) * out : 0
      drawQuery(sweep, query, qp, Math.max(0.2, out), labA)
      // the story of the coreference head, in words
      if (labA > 0 && sweep === 1 && query === IT && !small) {
        const [ax, ay] = apex(1, IT, TROPHY)
        const say = '“it” is the trophy'
        const sz = clamp(fs * 0.5, 15, 24)
        const ty = L.portrait ? ay + sz + 8 : ay - 18
        setFont(ctx, { font: 'serif', size: sz, italic: true })
        const tw = ctx.measureText(say).width
        // landscape: centred over the apex · portrait: inside the arc, left of it
        const left = L.portrait ? ax - tw - 24 : ax - tw / 2
        ctx.globalAlpha = labA
        ctx.fillStyle = C.paper
        ctx.fillRect(left - 4, ty - sz * 0.8, tw + 8, sz * 1.05)
        text(ctx, say, left, ty, { font: 'serif', size: sz, italic: true, color: C.lagoon })
        ctx.globalAlpha = 1
      }
    }
    // the peak: all heads at once, drawn on per query, then retracted
    if (!F && lt >= PEAK && lt < REL + 1.6) {
      for (let hh = NH - 1; hh >= 0; hh--) {
        drawHead(
          hh,
          (scan >= 0 ? 0.62 : 1) * HEADS[hh].alpha,
          (i) => ease.outCubic(seg(lt, PEAK + i * 0.055 + hh * 0.12, PEAK + i * 0.055 + hh * 0.12 + 0.9)),
          (i) => ease.inOutCubic(seg(lt, REL + i * 0.045, REL + i * 0.045 + 0.8)),
          preview ? 0.02 : 0.008,
        )
      }
      if (scan >= 0) {
        const fadeS = Math.min(seg(lt, PEAK + 1.6, PEAK + 1.9), 1 - seg(lt, REL - 0.5, REL - 0.2))
        for (let hh = NH - 1; hh >= 0; hh--) drawQuery(hh, scan, 1, fadeS, 0)
      }
    }
    ctx.lineCap = 'butt'

    /* ----------------------------------------------------------- tokens */
    const qColor = F ? (F.h >= 0 ? HEADS[F.h].color : C.ink) : sweep >= 0 ? HEADS[sweep].color : C.ink
    const qIdx = F ? F.i : sweep >= 0 ? query : -1
    for (let i = 0; i < N; i++) {
      const rise = ease.outCubic(seg(lt, 0.3 + i * 0.065, 0.9 + i * 0.065))
      const fall = ease.inCubic(seg(lt, FALL0 + i * 0.03, FALL0 + i * 0.03 + 0.5))
      if (rise <= 0 || fall >= 1) continue
      const [x, y] = tokenPos(i, spread)
      let color: string = C.ink
      if (F) {
        // tint each key by the strongest weight it receives from the query
        let m = 0
        for (let hh = 0; hh < NH; hh++) if (F.h < 0 || F.h === hh) m = Math.max(m, A[hh][F.i * N + i])
        if (i === F.i) color = qColor
        else if (F.j === i && F.h >= 0) color = HEADS[F.h].color
        else color = mixHex(C.ink, '#9AA8AD', 0.55 - Math.min(0.55, Math.sqrt(m) * 1.2))
      } else if (sweep >= 0 && query >= 0) {
        if (i === query) color = qColor
        else color = mixHex(C.ink, '#9AA8AD', 0.55 - Math.min(0.55, Math.sqrt(A[sweep][query * N + i]) * 1.2))
      }
      ctx.save()
      ctx.beginPath()
      ctx.rect(x - fs * 0.2, y - fs * 1.05, L.tw[i] + fs * 0.4, fs * 1.4)
      ctx.clip()
      text(ctx, TOKS[i].s, x, y + (1 - rise) * fs * 1.1 + fall * fs * 1.1, { font: 'serif', size: fs, color })
      ctx.restore()
      // query underline
      if (i === qIdx) {
        ctx.strokeStyle = qColor
        ctx.lineWidth = 2
        ctx.beginPath()
        if (L.portrait) {
          ctx.moveTo(x - L.bpad - 6, y - fs * 0.62)
          ctx.lineTo(x - L.bpad - 6, y + fs * 0.05)
        } else {
          ctx.moveTo(x, y + fs * 0.2)
          ctx.lineTo(x + L.tw[i], y + fs * 0.2)
        }
        ctx.stroke()
      }
    }

    // brackets, ids, embedding strips
    if (brk > 0) {
      ctx.strokeStyle = rgba(C.ink, 0.55)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const p = ease.outCubic(clamp(brk * 1.6 - i * 0.04))
        if (p <= 0) continue
        const [x, y] = tokenPos(i, spread)
        const y0 = y - fs * 0.82
        const y1 = y + fs * 0.24
        const xl = x - L.bpad * spread - 1
        const xr = x + L.tw[i] + L.bpad * spread + 1
        const s = Math.max(2, L.bpad * 0.7) * p
        const ym = (y0 + y1) / 2
        const hh = ((y1 - y0) / 2) * p
        ctx.moveTo(xl + s, ym - hh)
        ctx.lineTo(xl, ym - hh)
        ctx.lineTo(xl, ym + hh)
        ctx.lineTo(xl + s, ym + hh)
        ctx.moveTo(xr - s, ym - hh)
        ctx.lineTo(xr, ym - hh)
        ctx.lineTo(xr, ym + hh)
        ctx.lineTo(xr - s, ym + hh)
      }
      ctx.stroke()
    }
    if (ids > 0) {
      const sz = small ? 7.5 : clamp(fs * 0.24, 8.5, 10.5)
      for (let i = 0; i < N; i++) {
        const [x, y] = tokenPos(i, spread)
        const s = String(TOKS[i].id)
        const shown = s.slice(0, Math.ceil(s.length * clamp(idsIn * 1.4 - i * 0.03)))
        if (!shown) continue
        if (small) continue
        if (L.portrait) {
          text(ctx, shown, L.idsLeft, y - fs * 0.22, { size: sz, color: k.muted, tracking: 0.06, baseline: 'middle', alpha: idsOut })
        } else text(ctx, shown, x + L.tw[i] / 2, y + fs * 0.24 + sz + 5, { size: sz, color: k.muted, align: 'center', tracking: 0.06, alpha: idsOut })
      }
    }
    if (emb > 0 && !L.portrait && !small) {
      const sy = L.by[0] + fs * 0.24 + clamp(fs * 0.24, 8.5, 10.5) + 16
      const amp = fs * 0.3
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const [x] = tokenPos(i, spread)
        const sw = L.tw[i] + L.bpad * 2
        const x0 = x - L.bpad
        const step = sw / D
        for (let d = 0; d < D; d++) {
          const p = clamp(emb * 1.8 - i * 0.05 - d * 0.01)
          if (p <= 0) continue
          const bxp = x0 + step * (d + 0.5)
          ctx.moveTo(bxp, sy + amp)
          ctx.lineTo(bxp, sy + amp - clamp(E[i * D + d] / 2.2, -1, 1) * amp * p)
        }
      }
      ctx.stroke()
      ctx.strokeStyle = rgba(C.ink, 0.16 * emb)
      ctx.beginPath()
      ctx.moveTo(L.bx[0] - L.bpad, sy + amp + 0.5)
      ctx.lineTo(L.bx[0] - L.bpad + (L.bx[N - 1] + L.tw[N - 1] + L.bpad - L.bx[0] + L.bpad) * emb, sy + amp + 0.5)
      ctx.stroke()
      text(ctx, 'x · 16 DIMS', L.bx[0] - L.bpad, sy + amp * 2 + 14, { size: 9, color: k.muted, tracking: 0.14, alpha: emb })
      text(ctx, 'TOKEN + POSITION EMBEDDING', L.bx[N - 1] + L.tw[N - 1] + L.bpad, sy + amp * 2 + 14, { size: 9, color: k.muted, tracking: 0.14, align: 'right', alpha: emb })
    }

    /* ---------------------------------------------------------- matrices */
    if (gridIn > 0 && L.ms > 0) {
      const ms = L.ms
      const cell = ms / N
      for (let hh = 0; hh < NH; hh++) {
        const mx = L.mx[hh]
        const my = L.my
        const gp = ease.outCubic(clamp(gridIn * 1.5 - hh * 0.15))
        if (gp <= 0) continue
        // frame + grid
        ctx.lineWidth = 1
        ctx.strokeStyle = rgba(C.ink, 0.07 * gp)
        ctx.beginPath()
        for (let c = 1; c < N; c++) {
          const o = Math.round(c * cell) + 0.5
          ctx.moveTo(mx + o, my)
          ctx.lineTo(mx + o, my + ms * gp)
          ctx.moveTo(mx, my + o)
          ctx.lineTo(mx + ms * gp, my + o)
        }
        ctx.stroke()
        ctx.strokeStyle = rgba(C.ink, 0.45 * gp)
        ctx.strokeRect(Math.round(mx) + 0.5, Math.round(my) + 0.5, Math.round(ms * gp), Math.round(ms * gp))
        // label
        const lab = small || ms < 120 ? HEADS[hh].key : `${HEADS[hh].key} · ${HEADS[hh].name.toUpperCase()}`
        text(ctx, lab, mx, my - 7, { size: small ? 8 : 9.5, color: HEADS[hh].color, tracking: 0.12, alpha: gp })
        // cells, Hinton style: side ∝ √w, filled as the row is read
        const S = SLOTS[hh]
        const W = A[hh]
        ctx.fillStyle = rgba(HEADS[hh].color, 0.88)
        ctx.beginPath()
        for (let i = 0; i < N; i++) {
          const land = S.start[i] + drawDur(S.len[i]) * 0.5
          let g = F ? 1 : ease.outBack(seg(lt, land, land + 0.28))
          if (!F) g *= 1 - ease.inCubic(seg(lt, REL + 0.1 + hh * 0.08 + i * 0.02, REL + 0.6 + hh * 0.08 + i * 0.02))
          if (g <= 0) continue
          for (let j = 0; j < N; j++) {
            const s = Math.sqrt(W[i * N + j]) * cell * 0.94 * g
            if (s < 0.6) continue
            ctx.rect(mx + (j + 0.5) * cell - s / 2, my + (i + 0.5) * cell - s / 2, s, s)
          }
        }
        ctx.fill()
        // current row (and, when a cell is hovered, that cell)
        const row = F ? (F.h < 0 || F.h === hh ? F.i : -1) : sweep === hh ? query : scan
        if (row >= 0) {
          ctx.strokeStyle = HEADS[hh].color
          ctx.lineWidth = 1
          ctx.strokeRect(mx - 2.5, my + row * cell - 0.5, ms + 5, cell + 1)
        }
        if (F && F.j >= 0 && F.h === hh) {
          ctx.strokeStyle = C.ink
          ctx.strokeRect(mx + F.j * cell - 1.5, my + F.i * cell - 1.5, cell + 3, cell + 3)
        }
      }
      // axis notes
      const sz = small ? 7.5 : 8.5
      const gp = ease.outCubic(clamp(gridIn * 1.5))
      if (L.rowLabels) {
        for (let i = 0; i < N; i++) {
          const hi = F ? i === F.i : (sweep >= 0 && i === query) || i === scan
          text(ctx, TOKS[i].s, L.mx[0] - 8, L.my + (i + 0.5) * cell, { size: Math.min(9, cell * 0.72), color: hi ? C.ink : k.muted, align: 'right', baseline: 'middle', tracking: 0.04, alpha: gp })
        }
      }
      if (L.rowLabels) text(ctx, 'Q ↓  K →', L.mx[0] - 8, L.my - 7, { size: sz, color: k.muted, tracking: 0.12, align: 'right', alpha: gp })
    }

    /* ----------------------------------------------------------- readout */
    if (F) drawReadout(lt, F.h, F.i, F.h < 0 ? F.i : -1, F.j)
    else drawReadout(lt, sweep, query, scan)
    drawHints(lt, sweep >= 0 ? query : -1)

    /* ----------------------------------------------------------- caption */
    const capIn = first ? seg(t, 0.6, 1.4) : 1
    const capLong = 'FIG. M.01 — MULTI-HEAD SELF-ATTENTION · 14 TOKENS · 4 HEADS · d 16 · d_k 8'
    setFont(ctx, { size: 9.5, tracking: 0.14 })
    const fitsLong = !small && ctx.measureText(capLong).width < w - pad * 2 - 130
    text(ctx, fitsLong ? capLong : 'FIG. M.01 — 4 HEADS × 14 TOKENS · d 16', pad, L.capY, { size: small ? 8 : 9.5, color: k.muted, tracking: 0.14, alpha: capIn })
    if (fitsLong) text(ctx, 'ROWS SUM TO 1', w - pad, L.capY, { size: 8.5, color: k.muted, tracking: 0.14, align: 'right', alpha: capIn * clamp(gridIn * 1.5) })
  }

  /** The inspected query: its arcs in one head (with weights) or in all four. */
  function drawInspect(F: Focus, ft: number) {
    const p = ease.outCubic(clamp(ft / 0.4))
    if (F.h >= 0) {
      drawQuery(F.h, F.i, p, 1, clamp((ft - 0.25) / 0.25))
      if (F.j >= 0 && !top3[F.h][F.i].slice(0, 2).includes(F.j) && p >= 1) {
        const [x, y] = apex(F.h, F.i, F.j)
        const s = A[F.h][F.i * N + F.j].toFixed(3)
        setFont(ctx, { size: 10, weight: 500 })
        const tw = ctx.measureText(s).width + 8
        ctx.fillStyle = C.paper
        ctx.fillRect(x - tw / 2, y - 7, tw, 14)
        text(ctx, s, x, y + 0.5, { size: 10, color: C.ink, align: 'center', baseline: 'middle', tracking: 0.04 })
      }
    } else for (let hh = NH - 1; hh >= 0; hh--) drawQuery(hh, F.i, p, HEADS[hh].alpha, 0)
  }

  /** Contextual prompts: a ghost demonstration early on, then the pin / pause state. */
  function drawHints(lt: number, autoQuery: number) {
    if (preview) return
    const k = inkOn('paper')
    const x = env.width - L.pad
    const y = L.small ? L.capY : L.pad + 6 + 36
    const narrow = env.width < 700
    if (pin && canInspect) {
      const col = pin.h >= 0 ? HEADS[pin.h].color : solo >= 0 ? HEADS[solo].color : C.ink
      text(ctx, narrow ? `PINNED “${TOKS[pin.i].s}” · TAP TO RELEASE` : `PINNED · “${TOKS[pin.i].s}” · ← → STEP · 1–4 SOLO A HEAD · TAP TO RELEASE`, x, y, { size: 8.5, color: col, align: 'right', tracking: 0.14 })
      return
    }
    if (paused && !hover) {
      text(ctx, 'PAUSED · SPACE TO RESUME', x, y, { size: 8.5, color: k.ink2, align: 'right', tracking: 0.14 })
      return
    }
    // the ghost: a dotted ring that hops between three words, in the first loop only
    if (interacted || clock > LOOP || lt < 4.4 || lt > 10.4 || !canInspect) return
    const a = Math.min(seg(lt, 4.4, 4.9), 1 - seg(lt, 9.9, 10.4))
    const order = [TROPHY, SUITCASE, BIG]
    const i = order[Math.floor((lt - 4.4) / 2) % 3]
    text(ctx, narrow ? 'TAP A WORD TO READ IT' : 'HOVER A WORD TO READ ITS ATTENTION · TAP TO PIN', x, y, { size: 8.5, color: k.ink2, align: 'right', tracking: 0.14, alpha: a })
    if (i === autoQuery) return
    const cx = L.bx[i] + L.tw[i] / 2
    const cy = L.by[i] - L.fs * 0.3
    const rx = L.tw[i] / 2 + L.bpad + 5
    const pulse = 0.5 + 0.5 * Math.sin(lt * 5)
    ctx.globalAlpha = a
    ctx.strokeStyle = rgba(C.ink, 0.3 + 0.3 * pulse)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, L.fs * 0.8, 0, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  function drawReadout(lt: number, sweep: number, query: number, scan: number, key = -1) {
    const k = inkOn('paper')
    const { rx, ry, small } = L
    const inspecting = !!focus() && canInspect
    if (small && !L.portrait) {
      // short frames: one compact line under the timecode, right-aligned
      const h = sweep >= 0 ? sweep : -1
      const q = query >= 0 ? query : scan
      if (q < 0) return
      let s: string
      let col: string
      if (h >= 0) {
        const best = key >= 0 ? key : top3[h][q][0]
        s = `${HEADS[h].key} · ${TOKS[q].s} → ${TOKS[best].s} ${A[h][q * N + best].toFixed(2)}`
        col = HEADS[h].color
      } else if (inspecting) {
        s = `“${TOKS[q].s}” → ` + HEADS.map((_, hh) => TOKS[top3[hh][q][0]].s).join(' · ')
        col = C.ink
      } else return
      text(ctx, s, env.width - L.pad, L.pad + 26, { size: 8.5, color: col, align: 'right', tracking: 0.08 })
      return
    }
    if (small) return
    const size = 9.5
    const lh = 15
    let y = ry
    const inA = inspecting ? 1 : seg(lt, 3.4, 4.0) * (1 - seg(lt, REL + 0.6, CLOSE0 + 0.3))
    if (inA <= 0) return
    ctx.globalAlpha = inA
    const h = sweep >= 0 ? sweep : -1
    if (h >= 0 && query >= 0) {
      const W = A[h]
      text(ctx, `HEAD ${h + 1} / 4 — ${HEADS[h].name.toUpperCase()}`, rx, y, { size, color: HEADS[h].color, tracking: 0.12 })
      y += lh + 3
      text(ctx, `QUERY  “${TOKS[query].s}”  POS ${String(query).padStart(2, '0')}`, rx, y, { size, color: k.ink, tracking: 0.08 })
      y += lh
      const bw = Math.min(70, L.rw * 0.32)
      const rows = key >= 0 && !top3[h][query].includes(key) ? [...top3[h][query].slice(0, 2), key] : top3[h][query]
      for (const j of rows) {
        const v = W[query * N + j]
        text(ctx, TOKS[j].s, rx, y + 4, { size, color: j === key ? C.ink : k.ink2, tracking: 0.04 })
        const bx = rx + (L.portrait ? 92 : L.rw - bw - 40)
        ctx.strokeStyle = rgba(C.ink, 0.25)
        ctx.lineWidth = 1
        ctx.strokeRect(Math.round(bx) + 0.5, Math.round(y - 1) + 0.5, bw, 5)
        ctx.fillStyle = HEADS[h].color
        ctx.fillRect(Math.round(bx) + 0.5, Math.round(y - 1) + 0.5, bw * v, 5)
        text(ctx, v.toFixed(3), bx + bw + 8, y + 4, { size, color: k.ink, tracking: 0.04 })
        y += lh
      }
      text(ctx, `ENTROPY ${entropy[h][query].toFixed(2)} NATS · ${(Math.log(N)).toFixed(2)} MAX`, rx, y + 4, { size: 8.5, color: k.muted, tracking: 0.12 })
    } else if (scan >= 0 || (lt >= PEAK && lt < REL)) {
      text(ctx, inspecting ? 'ALL HEADS — ONE QUERY' : 'ALL HEADS — 4 × 14 × 14', rx, y, { size, color: k.ink, tracking: 0.12 })
      y += lh + 3
      if (scan >= 0) {
        text(ctx, `QUERY  “${TOKS[scan].s}”`, rx, y, { size, color: k.ink, tracking: 0.08 })
        y += lh
        for (let hh = 0; hh < NH; hh++) {
          const j = top3[hh][scan][0]
          text(ctx, `${HEADS[hh].key} → ${TOKS[j].s}`, rx, y + 4, { size, color: HEADS[hh].color, tracking: 0.06 })
          text(ctx, A[hh][scan * N + j].toFixed(3), rx + (L.portrait ? 160 : L.rw - 40), y + 4, { size, color: k.ink, tracking: 0.04 })
          y += lh
        }
      } else text(ctx, '784 WEIGHTS, ONE PASS', rx, y, { size, color: k.muted, tracking: 0.12 })
    } else if (lt < SWEEPS[0][0] + 0.2) {
      text(ctx, 'EMBED · d = 16', rx, y, { size, color: k.ink, tracking: 0.12 })
      y += lh + 3
      text(ctx, 'q = xW_q   k = xW_k', rx, y, { size, color: k.ink2, tracking: 0.06 })
      y += lh
      text(ctx, 'a = softmax(q · k / √8)', rx, y, { size, color: k.ink2, tracking: 0.06 })
    }
    ctx.globalAlpha = 1
  }

  const KEYS = ['ArrowLeft', 'ArrowRight', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Space']

  return {
    resize(w, h) {
      L = layout(w, h)
    },
    frame,
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hover = null
        down = null
        return
      }
      const hit = hitTest(p.x, p.y, touch)
      // touch has no hover: a press shows the row, a tap pins it
      hover = touch && !p.pressed ? null : hit
      if (p.type === 'down') down = { x: p.x, y: p.y }
      if (p.type === 'up') {
        if (down && Math.hypot(p.x - down.x, p.y - down.y) < 12) {
          interacted = true
          if (hit && (!pin || pin.i !== hit.i || pin.h !== hit.h)) pin = hit
          else pin = null
        }
        down = null
        if (touch) hover = null
      }
      if (hit) interacted = true
    },
    key(code, isDown) {
      if (!KEYS.includes(code)) return false
      if (!isDown) return true
      interacted = true
      if (code === 'Space') {
        paused = !paused
        return true
      }
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        const step = code === 'ArrowRight' ? 1 : N - 1
        const from = pin ? pin.i : IT + N - step
        pin = { i: (from + step) % N, h: pin ? pin.h : -1, j: -1 }
        ensureSpread()
        return true
      }
      // 0 → all heads · 1–4 → solo a head (again to release)
      const n = Number(code.slice(5))
      solo = n === 0 || solo === n - 1 ? -1 : n - 1
      pin = { i: pin ? pin.i : IT, h: solo, j: -1 }
      ensureSpread()
      return true
    },
  }
}

export default create
