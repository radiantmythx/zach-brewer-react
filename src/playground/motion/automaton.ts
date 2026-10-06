/*
 * AUTOMATA — four elementary cellular automata printed like woven cloth,
 * then Conway's Life.
 *
 * Each rule is a single byte: the eight possible neighbourhoods of a cell and
 * the state each one produces (the Wolfram icons in the label). The loom head
 * prints one generation per row, top to bottom, over the faded previous
 * textile — Rules 30, 90, 110 and 184, each in its own dye. Then the last row
 * of Rule 184 is lifted out alone and becomes the seed of a Game of Life,
 * which burns outward into gliders and oscillators before the loop restarts.
 *
 * Rows are rasterised once into an offscreen layer (one path per colour), so
 * a frame is a single drawImage plus the annotation.
 *
 * In the viewer the rules are editable: tap one of the eight icons to flip
 * that bit of the rule and the cloth reprints with the new number; in Life,
 * tap a neighbour count to add or remove it from the birth or survival rule.
 * Tap the cloth itself to move on to the next rule.
 */

import { C, clamp, cropMarks, ease, ground, hud, lerp, rgba, rng, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. M.12'

interface RuleDef {
  n: number
  color: string
  note: string
  seed: 'centre' | 'right' | 'random'
}

const RULES: RuleDef[] = [
  // order → flow → complexity → chaos, and then life
  { n: 90, color: C.ocean, note: 'ADDITIVE · SIERPIŃSKI TRIANGLE', seed: 'centre' },
  { n: 184, color: C.lagoon, note: 'TRAFFIC FLOW · DENSITY CONSERVED', seed: 'random' },
  { n: 110, color: C.moss, note: 'CLASS 4 · TURING COMPLETE', seed: 'right' },
  { n: 30, color: C.ink, note: 'CLASS 3 · CHAOS FROM ONE CELL', seed: 'centre' },
]

/** seconds: each rule prints for PRINT then holds; Life runs for LIFE */
const PRINT = 4.3
const RULE_LEN = 5.5
const LIFT = 1.0
const LIFE = 8
const GEN_RATE = 18
/**
 * The seed is the last row woven a few threads thick (odd, so the growth stays
 * mirror-symmetric). How lively that is depends on the grid's width, so each
 * layout tries these and keeps the one that is still busiest at the end.
 */
const THREAD_CHOICES = [5, 7, 9]
const THREAD_WORDS: Record<number, string> = { 5: 'FIVE', 7: 'SEVEN', 9: 'NINE' }
const LIFE_GENS = Math.floor((LIFE - LIFT - 0.6) * GEN_RATE)
/** the ghost demonstrations, full mode only, until the viewer acts */
const GHOST_ICON = [1.3, 3.9] as const
const GHOST_CLOTH = [3.9, 6.4] as const
const B3S23: [number, number] = [1 << 3, (1 << 2) | (1 << 3)]
const LOOP = RULES.length * RULE_LEN + LIFE


/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces (on the Playground page they are
 * already loaded and this resolves at once). Never blocks for long.
 */
if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('400 64px "Instrument Serif"'), document.fonts.load('italic 400 64px "Instrument Serif"'), document.fonts.load('500 12px "Geist Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'

  let w = 1
  let h = 1
  let portrait = false
  let m = 20
  // textile frame (CSS px) and grid
  let fx = 0
  let fy = 0
  let fw = 1
  let fh = 1
  let cs = 5
  let cols = 1
  let rows = 1
  // label column
  let lx = 0
  let ly = 0
  let lw = 1

  // offscreen textile layer
  const layer = document.createElement('canvas')
  const lctx = layer.getContext('2d')!

  // automaton state
  let row = new Uint8Array(1)
  let next = new Uint8Array(1)
  let lastRow = new Uint8Array(1)
  let life = new Uint8Array(1)
  let lifeN = new Uint8Array(1)
  let born = new Uint8Array(1)
  let died = new Uint8Array(1)
  let pop: number[] = []
  let threads = 5
  let density = 0
  const usage = new Float32Array(8)

  /** what the layer currently holds */
  const st = { loop: -1, phase: -1, rows: 0, gen: -1, valid: false }
  let lastPhase = -1

  // the viewer's edits: a rule number per phase, and Life's birth/survival masks (bit n = n neighbours)
  const custom = new Map<number, number>()
  let rulesB = B3S23[0]
  let rulesS = B3S23[1]
  let editLoop = 0
  const ruleOf = (ri: number) => custom.get(ri) ?? RULES[ri].n
  // the piece's own clock, so a tap can move it; equals t until the viewer acts
  let clk = 0
  let acted = false
  let short = false
  let tiny = false
  // hit areas laid out by the label each frame
  type Hit = { x: number; y: number; w: number; h: number; kind: 'bit' | 'birth' | 'survive'; n: number }
  let hits: Hit[] = []
  let hover: Hit | null = null
  let hoverCloth = false
  let downAt: { x: number; y: number; ms: number } | null = null

  function layout() {
    portrait = h > w * 1.1
    short = !preview && !portrait && h < 380
    tiny = !preview && !portrait && h < 260
    m = preview || short ? 10 : Math.max(18, Math.min(w, h) * 0.035)
    if (portrait) {
      fx = m + 8
      fy = m + 18
      fw = w - 2 * fx
      fh = Math.round(h * 0.56)
      lx = fx
      ly = fy + fh + 30
      lw = fw
    } else {
      lw = preview ? Math.round(w * 0.34) : Math.round(Math.min(short ? 300 : 380, Math.max(Math.min(240, w * 0.38), w * 0.27)))
      lx = m + (preview ? 6 : short ? 8 : 14)
      ly = m + (preview ? 14 : short ? 12 : 24)
      fx = lx + lw + (preview ? 8 : short ? 22 : 34)
      fy = m + (preview ? 10 : short ? 14 : 18)
      fw = w - fx - m - (preview ? 4 : short ? 8 : 14)
      fh = h - 2 * fy
    }
    const target = preview ? 110 : portrait ? 130 : 150
    cs = Math.max(3, Math.round(Math.min(fw * 1.2, fh) / target))
    cols = Math.max(8, Math.floor(fw / cs))
    rows = Math.max(8, Math.floor(fh / cs))
    // centre the grid in the frame
    const gw = cols * cs
    const gh = rows * cs
    fx += Math.floor((fw - gw) / 2)
    fy += Math.floor((fh - gh) / 2)
    fw = gw
    fh = gh
    const dpr = env.dpr
    layer.width = Math.max(1, Math.round(fw * dpr))
    layer.height = Math.max(1, Math.round(fh * dpr))
    row = new Uint8Array(cols)
    next = new Uint8Array(cols)
    lastRow = new Uint8Array(cols)
    life = new Uint8Array(cols * rows)
    lifeN = new Uint8Array(cols * rows)
    born = new Uint8Array(cols * rows)
    died = new Uint8Array(cols * rows)
    chooseThreads()
    st.valid = false
  }

  /** rehearse Life from the final row of the last rule at each thickness; keep the liveliest */
  function chooseThreads() {
    const keep: [number, number] = [rulesB, rulesS]
    rulesB = B3S23[0]
    rulesS = B3S23[1]
    printQuiet(RULES.length - 1)
    let best = THREAD_CHOICES[0]
    let bestPop = -1
    for (const th of THREAD_CHOICES) {
      threads = th
      seedLife()
      for (let g = 0; g < LIFE_GENS; g++) stepLife()
      const final = pop[pop.length - 1]
      if (final > bestPop) {
        bestPop = final
        best = th
      }
    }
    threads = best
    pop = []
    rulesB = keep[0]
    rulesS = keep[1]
  }

  /** run a rule to its last row without painting (sets lastRow) */
  function printQuiet(ri: number) {
    seedRow(ri)
    for (let r = 0; r < rows - 1; r++) stepRow(RULES[ri].n)
    lastRow.set(row)
  }

  /* ------------------------------------------------------------ simulation */

  function seedRow(ri: number) {
    row.fill(0)
    const def = RULES[ri]
    if (def.seed === 'centre') row[Math.floor(cols / 2)] = 1
    else if (def.seed === 'right') row[cols - 2] = 1
    else {
      const r = rng(184)
      for (let i = 0; i < cols; i++) row[i] = r() < 0.6 ? 1 : 0
    }
  }

  function stepRow(rule: number) {
    for (let i = 0; i < cols; i++) {
      const l = row[(i + cols - 1) % cols]
      const c = row[i]
      const r = row[(i + 1) % cols]
      next[i] = (rule >> ((l << 2) | (c << 1) | r)) & 1
    }
    const t = row
    row = next
    next = t
  }

  function measureRow() {
    usage.fill(0)
    let on = 0
    for (let i = 0; i < cols; i++) {
      const l = row[(i + cols - 1) % cols]
      const c = row[i]
      const r = row[(i + 1) % cols]
      usage[(l << 2) | (c << 1) | r]++
      on += c
    }
    density = on / cols
  }

  function seedLife() {
    life.fill(0)
    born.fill(0)
    died.fill(0)
    const mid = Math.floor(rows / 2)
    for (let j = -(threads >> 1); j <= threads >> 1; j++) for (let i = 0; i < cols; i++) life[(mid + j) * cols + i] = lastRow[i]
    pop = [lastRow.reduce((s, v) => s + v, 0) * threads]
  }

  /** one generation on the torus; a running three-column window keeps it cheap */
  function stepLife() {
    const birth = rulesB
    const survive = rulesS
    const W = cols
    const H = rows
    const L = life
    const N = lifeN
    let count = 0
    for (let y = 0; y < H; y++) {
      const ym = (y === 0 ? H - 1 : y - 1) * W
      const y0 = y * W
      const yp = (y === H - 1 ? 0 : y + 1) * W
      // column sums of the three rows: left, centre, right
      let cl = L[ym + W - 1] + L[y0 + W - 1] + L[yp + W - 1]
      let cc = L[ym] + L[y0] + L[yp]
      for (let x = 0; x < W; x++) {
        const xr = x === W - 1 ? 0 : x + 1
        const cr = L[ym + xr] + L[y0 + xr] + L[yp + xr]
        const alive = L[y0 + x]
        const n = cl + cc + cr - alive
        const v = ((alive ? survive : birth) >> n) & 1
        N[y0 + x] = v
        born[y0 + x] = v & (alive ^ 1)
        died[y0 + x] = alive & (v ^ 1)
        count += v
        cl = cc
        cc = cr
      }
    }
    life = N
    lifeN = L
    pop.push(count)
  }

  /* ------------------------------------------------------------ layer painting */

  function beginLayer() {
    lctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
  }

  const gap = () => (cs >= 5 ? 1 : cs >= 4 ? 0.8 : 0.6)

  function paintRow(r: number, color: string) {
    beginLayer()
    const y = r * cs
    lctx.fillStyle = C.paper
    lctx.fillRect(0, y, fw, cs)
    const g = gap()
    const s = cs - g
    lctx.fillStyle = color
    lctx.beginPath()
    for (let i = 0; i < cols; i++) if (row[i]) lctx.rect(i * cs + g / 2, y + g / 2, s, s)
    lctx.fill()
  }

  function dimLayer(a: number) {
    beginLayer()
    lctx.fillStyle = rgba(C.paper, a)
    lctx.fillRect(0, 0, fw, fh)
  }

  function clearLayer() {
    beginLayer()
    lctx.fillStyle = C.paper
    lctx.fillRect(0, 0, fw, fh)
  }

  function paintLife() {
    beginLayer()
    lctx.fillStyle = C.paper
    lctx.fillRect(0, 0, fw, fh)
    const g = gap()
    const s = cs - g
    // the cells that just died leave a hairline ghost
    lctx.strokeStyle = rgba(C.ink, 0.28)
    lctx.lineWidth = 0.6
    lctx.beginPath()
    for (let i = 0; i < life.length; i++) if (died[i]) lctx.rect((i % cols) * cs + g / 2 + 0.3, Math.floor(i / cols) * cs + g / 2 + 0.3, s - 0.6, s - 0.6)
    lctx.stroke()
    lctx.fillStyle = rgba(C.ink, 0.9)
    lctx.beginPath()
    for (let i = 0; i < life.length; i++) if (life[i] && !born[i]) lctx.rect((i % cols) * cs + g / 2, Math.floor(i / cols) * cs + g / 2, s, s)
    lctx.fill()
    lctx.fillStyle = C.moss
    lctx.beginPath()
    for (let i = 0; i < life.length; i++) if (born[i]) lctx.rect((i % cols) * cs + g / 2, Math.floor(i / cols) * cs + g / 2, s, s)
    lctx.fill()
  }

  /** print rule ri completely into the layer (used to rebuild history) */
  function printWhole(ri: number) {
    seedRow(ri)
    for (let r = 0; r < rows; r++) {
      paintRow(r, RULES[ri].color)
      if (r < rows - 1) stepRow(ruleOf(ri))
    }
    lastRow.set(row)
  }

  function lifeFinal() {
    seedLife()
    const gens = LIFE_GENS
    for (let g = 0; g < gens; g++) stepLife()
    paintLife()
  }

  /** bring the layer to (loop, phase, rows printed | generation) */
  function sync(loop: number, phase: number, wantRows: number, wantGen: number) {
    const same = st.valid && st.loop === loop && st.phase === phase
    const nextPhase = st.valid && ((st.loop === loop && st.phase === phase - 1) || (st.loop === loop - 1 && st.phase === RULES.length && phase === 0))
    if (same && phase < RULES.length && wantRows >= st.rows) {
      const def = RULES[phase]
      const rule = ruleOf(phase)
      for (let r = st.rows; r < wantRows; r++) {
        if (r > 0) stepRow(rule)
        paintRow(r, def.color)
      }
      st.rows = wantRows
      if (wantRows > 0) measureRow()
      if (wantRows >= rows) lastRow.set(row)
      return
    }
    if (same && phase === RULES.length && wantGen >= st.gen) {
      if (st.gen < 0 && wantGen >= 0) seedLife()
      let changed = false
      for (let g = Math.max(0, st.gen); g < wantGen; g++) {
        stepLife()
        changed = true
      }
      if (wantGen >= 0 && (changed || st.gen < 0)) paintLife()
      st.gen = wantGen
      return
    }
    if (nextPhase) {
      // finish the outgoing phase, then start the new one over it
      if (st.phase < RULES.length) sync(st.loop, st.phase, rows, -1)
      if (phase < RULES.length) {
        dimLayer(0.8)
        seedRow(phase)
        st.loop = loop
        st.phase = phase
        st.rows = 0
        st.gen = -1
        sync(loop, phase, wantRows, wantGen)
      } else {
        st.loop = loop
        st.phase = phase
        st.rows = rows
        st.gen = -1
        sync(loop, phase, wantRows, wantGen)
      }
      return
    }
    // rebuild from scratch
    clearLayer()
    if (phase < RULES.length) {
      if (phase > 0) printWhole(phase - 1)
      else if (loop > 0) {
        printWhole(RULES.length - 1)
        lifeFinal()
      }
      if (phase > 0 || loop > 0) dimLayer(0.8)
      seedRow(phase)
      st.loop = loop
      st.phase = phase
      st.rows = 0
      st.gen = -1
      st.valid = true
      sync(loop, phase, wantRows, wantGen)
    } else {
      printWhole(RULES.length - 1)
      st.loop = loop
      st.phase = phase
      st.rows = rows
      st.gen = -1
      st.valid = true
      sync(loop, phase, wantRows, wantGen)
    }
  }

  /* ------------------------------------------------------------ annotation */

  /** Wolfram-style rule icons: eight neighbourhoods and their outcome. */
  function ruleIcons(rule: number, x: number, y: number, maxW: number, p: number, color: string, showUsage: boolean, ghost: number) {
    const q = Math.max(3, Math.min(preview ? 5 : 9, Math.floor(maxW / (8 * 3.3 + 7 * 1.6 + 1))))
    const g = q >= 6 ? 2 : 1
    const iw = q * 3 + g * 2
    const gapX = Math.max(3, (maxW - iw * 8) / 7)
    ctx.lineWidth = 1
    let total = 0
    for (let i = 0; i < 8; i++) total += usage[i]
    for (let i = 0; i < 8; i++) {
      const a = clamp(p * 9 - i)
      if (a <= 0) continue
      const pat = 7 - i
      const out = (rule >> pat) & 1
      const ix = x + i * (iw + gapX)
      if (!preview) hits.push({ x: ix - 3, y: y - 8, w: iw + 6, h: q * 2 + 30, kind: 'bit', n: pat })
      const hot = hover?.kind === 'bit' && hover.n === pat
      if (hot || (ghost > 0 && i === 3)) {
        // the hovered icon (or the ghost's) gets a hairline frame
        ctx.globalAlpha = hot ? 1 : 0.5 + 0.5 * Math.sin(ghost * 18)
        ctx.strokeStyle = C.moss
        ctx.setLineDash(hot ? [] : [2, 2])
        ctx.strokeRect(Math.round(ix - 3) + 0.5, Math.round(y - 4) + 0.5, Math.round(iw + 6), Math.round(q * 2 + g + 2 + 8 + (preview ? 13 : 17)))
        ctx.setLineDash([])
      }
      ctx.globalAlpha = a
      for (let b = 0; b < 3; b++) {
        const on = (pat >> (2 - b)) & 1
        const bx = Math.round(ix + b * (q + g)) + 0.5
        const by = Math.round(y) + 0.5
        if (on) {
          ctx.fillStyle = C.ink
          ctx.fillRect(bx, by, q, q)
        }
        ctx.strokeStyle = C.ink
        ctx.strokeRect(bx, by, q, q)
      }
      const ox = Math.round(ix + q + g) + 0.5
      const oy = Math.round(y + q + g + 2) + 0.5
      if (out) {
        ctx.fillStyle = color
        ctx.fillRect(ox, oy, q, q)
      }
      ctx.strokeStyle = out ? color : rgba(C.ink, 0.5)
      ctx.strokeRect(ox, oy, q, q)
      text(ctx, String(out), ix + iw / 2, y + q * 2 + (preview ? 13 : 17), { size: preview ? 8 : 9.5, align: 'center', color: out ? color : C.muted })
      // how often this neighbourhood occurs in the row being printed
      if (showUsage && total > 0) {
        const u = usage[pat] / total
        ctx.strokeStyle = rgba(color, 0.8)
        ctx.beginPath()
        ctx.moveTo(ix, y - 5.5)
        ctx.lineTo(ix + iw * clamp(u * 3), y - 5.5)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    return q * 2 + (preview ? 16 : 22)
  }

  /** the Life rule as two rows of neighbour counts (B3/S23 unless edited) */
  function lifeIcons(x: number, y: number, maxW: number, p: number) {
    const lab = preview || short ? 54 : 66
    const q = Math.max(3, Math.min(preview ? 6 : 10, Math.floor((maxW - lab - 16) / 9)))
    const gx = Math.max(2, (maxW - lab - 4 - q * 9) / 8)
    const set = (mask: number) => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((n) => (mask >> n) & 1)
    const rowsDef: [string, number[]][] = [
      ['BIRTH', set(rulesB)],
      ['SURVIVE', set(rulesS)],
    ]
    rowsDef.forEach(([label, on], r) => {
      const yy = y + r * (q + (preview ? 10 : 14))
      text(ctx, label, x, yy + q - 1, { size: preview || short ? 7.5 : 8.5, color: C.muted, tracking: 0.12 })
      for (let n = 0; n <= 8; n++) {
        const a = clamp(p * 12 - n - r * 2)
        if (a <= 0) continue
        const bx = Math.round(x + lab + n * (q + gx)) + 0.5
        const by = Math.round(yy) + 0.5
        const kind = r === 0 ? 'birth' : 'survive'
        if (!preview) hits.push({ x: bx - gx / 2, y: by - 4, w: q + gx, h: q + 8, kind, n })
        if (hover?.kind === kind && hover.n === n) {
          ctx.strokeStyle = C.moss
          ctx.strokeRect(bx - 2, by - 2, q + 4, q + 4)
        }
        ctx.globalAlpha = a
        if (on.includes(n)) {
          ctx.fillStyle = C.moss
          ctx.fillRect(bx, by, q, q)
        }
        ctx.strokeStyle = on.includes(n) ? C.moss : rgba(C.ink, 0.45)
        ctx.lineWidth = 1
        ctx.strokeRect(bx, by, q, q)
        if (r === 1 && !preview && !short) text(ctx, String(n), bx + q / 2, yy + q + 13, { size: 8.5, align: 'center', color: C.muted })
        ctx.globalAlpha = 1
      }
    })
    return 2 * q + (preview || short ? 14 : 34)
  }

  const lifeName = () => {
    const list = (mask: number) => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((n) => (mask >> n) & 1).join('')
    return `B${list(rulesB)}/S${list(rulesS)}`
  }

  /* ------------------------------------------------------------ the viewer's hand */

  function restartPhase(phase: number) {
    const loop = Math.floor(clk / LOOP)
    clk = loop * LOOP + phase * RULE_LEN
    st.valid = false
  }

  function skip(step: number) {
    const loop = Math.floor(clk / LOOP)
    const lt = clk - loop * LOOP
    const phase = Math.min(RULES.length, Math.floor(lt / RULE_LEN))
    const pt = lt - phase * RULE_LEN
    let to = step > 0 ? phase + 1 : pt > 1.2 ? phase : phase - 1
    let lp = loop
    if (to > RULES.length) {
      to = 0
      lp++
    }
    if (to < 0) {
      to = RULES.length
      lp = Math.max(0, lp - 1)
    }
    clk = lp * LOOP + to * RULE_LEN
    if (step < 0) st.valid = false
    acted = true
  }

  function apply(hit: Hit) {
    acted = true
    const loop = Math.floor(clk / LOOP)
    const phase = Math.min(RULES.length, Math.floor((clk - loop * LOOP) / RULE_LEN))
    if (hit.kind === 'bit' && phase < RULES.length) {
      custom.set(phase, ruleOf(phase) ^ (1 << hit.n))
      if (custom.get(phase) === RULES[phase].n) custom.delete(phase)
      env.sfx.tone(330 * (1 + hit.n / 8), 0.12, { type: 'triangle', gain: 0.06 })
      restartPhase(phase)
    } else if (hit.kind === 'birth') {
      rulesB ^= 1 << hit.n
      env.sfx.tone(392, 0.1, { type: 'triangle', gain: 0.05 })
    } else if (hit.kind === 'survive') {
      rulesS ^= 1 << hit.n
      env.sfx.tone(294, 0.1, { type: 'triangle', gain: 0.05 })
    }
  }

  const inCloth = (x: number, y: number) => x >= fx && x <= fx + fw && y >= fy && y <= fy + fh
  const hitAt = (x: number, y: number, touch: boolean) => {
    const pad = touch ? 6 : 0
    for (const hh of hits) if (x >= hh.x - pad && x <= hh.x + hh.w + pad && y >= hh.y - pad && y <= hh.y + hh.h + pad) return hh
    return null
  }

  function sparkline(x: number, y: number, sw: number, sh: number) {
    if (pop.length < 2) return
    let mx = 1
    for (const v of pop) mx = Math.max(mx, v)
    const total = Math.floor((LIFE - LIFT - 0.6) * GEN_RATE)
    ctx.strokeStyle = rgba(C.ink, 0.2)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y + sh + 0.5)
    ctx.lineTo(x + sw, y + sh + 0.5)
    ctx.stroke()
    ctx.strokeStyle = C.moss
    ctx.beginPath()
    pop.forEach((v, i) => {
      const px = x + (i / total) * sw
      const py = y + sh - (v / mx) * sh
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    })
    ctx.stroke()
    const lx2 = x + ((pop.length - 1) / total) * sw
    const ly2 = y + sh - (pop[pop.length - 1] / mx) * sh
    ctx.fillStyle = C.moss
    ctx.fillRect(lx2 - 1.5, ly2 - 1.5, 3, 3)
  }

  function bigTitle(kicker: string, title: string, italic: boolean, color: string, x: number, y: number, size: number, p: number) {
    // the kicker and the title rise out of masks
    const e = ease.outCubic(clamp(p))
    const ks = preview ? 13 : portrait ? 20 : Math.min(30, size * 0.2)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x - 4, y - 4, lw + 8, ks * 1.25 + size * (italic ? 1.2 : 0.95))
    ctx.clip()
    text(ctx, kicker, x, y + ks + (1 - e) * ks * 1.4, { font: 'serif', italic: true, size: ks, color: C.moss })
    const base = y + ks * 1.1 + size * 0.8
    text(ctx, title, x - size * 0.03, base + (1 - e) * size, { font: 'serif', italic, size, color })
    ctx.restore()
    return ks * 1.1 + size * 0.86
  }

  return {
    resize(width, height) {
      w = width
      h = height
      layout()
    },
    pointer(pi) {
      if (preview) return
      const touch = pi.pointerType === 'touch'
      if (pi.type === 'leave') {
        hover = null
        hoverCloth = false
        downAt = null
        env.setCursor('default')
        return
      }
      hover = hitAt(pi.x, pi.y, touch)
      hoverCloth = !hover && inCloth(pi.x, pi.y)
      env.setCursor(hover || hoverCloth ? 'pointer' : 'default')
      if (pi.type === 'down') downAt = { x: pi.x, y: pi.y, ms: performance.now() }
      if (pi.type === 'up' && downAt) {
        const tap = Math.hypot(pi.x - downAt.x, pi.y - downAt.y) < (touch ? 16 : 10) && performance.now() - downAt.ms < 450
        downAt = null
        if (!tap) return
        const hh = hitAt(pi.x, pi.y, touch)
        if (hh) apply(hh)
        else if (inCloth(pi.x, pi.y)) skip(1)
        if (touch) hover = null
      }
    },
    key(code, down, e) {
      const loop = Math.floor(clk / LOOP)
      const phase = Math.min(RULES.length, Math.floor((clk - loop * LOOP) / RULE_LEN))
      const digit = /^Digit([0-9])$/.exec(code)
      if (digit) {
        if (!down) return true
        const d = Number(digit[1])
        if (phase < RULES.length && d >= 1 && d <= 8) apply({ x: 0, y: 0, w: 0, h: 0, kind: 'bit', n: 8 - d })
        else if (phase === RULES.length) apply({ x: 0, y: 0, w: 0, h: 0, kind: e.shiftKey ? 'survive' : 'birth', n: d === 9 ? 8 : d })
        return true
      }
      if (code === 'ArrowRight' || code === 'Space' || code === 'Enter') {
        if (down) skip(1)
        return true
      }
      if (code === 'ArrowLeft') {
        if (down) skip(-1)
        return true
      }
      if (code === 'KeyR') {
        if (down) {
          acted = true
          if (phase < RULES.length) {
            custom.delete(phase)
            restartPhase(phase)
          } else {
            rulesB = B3S23[0]
            rulesS = B3S23[1]
          }
        }
        return true
      }
      return false
    },
    frame(t, dt) {
      clk += dt
      void t
      const loop = Math.floor(clk / LOOP)
      if (loop !== editLoop) {
        // each pass of the loop starts from the canonical rules
        editLoop = loop
        if (custom.size || rulesB !== B3S23[0] || rulesS !== B3S23[1]) st.valid = false
        custom.clear()
        rulesB = B3S23[0]
        rulesS = B3S23[1]
      }
      const lt = clk - loop * LOOP
      const phase = Math.min(RULES.length, Math.floor(lt / RULE_LEN))
      const pt = lt - phase * RULE_LEN
      let wantRows = 0
      let wantGen = -1
      if (phase < RULES.length) wantRows = Math.min(rows, Math.floor(ease.inOutSine(clamp(pt / PRINT)) * rows * 0.15 + clamp(pt / PRINT) * rows * 0.85))
      else wantGen = pt < LIFT ? -1 : Math.min(Math.floor((LIFE - LIFT - 0.6) * GEN_RATE), Math.floor((pt - LIFT) * GEN_RATE))
      sync(loop, phase, wantRows, wantGen)
      if (phase !== lastPhase) {
        if (lastPhase !== -1) env.sfx.tone(220 * [1, 5 / 4, 3 / 2, 15 / 8, 2][phase], 0.6, { type: 'triangle', gain: 0.05, room: 0.4 })
        lastPhase = phase
      }

      ground(ctx, w, h, 'paper')
      // --- the textile
      const isLife = phase === RULES.length
      if (isLife && pt < LIFT) {
        // the cloth fades away; its last row lifts to the middle
        const p = ease.inOutCubic(clamp(pt / LIFT))
        ctx.globalAlpha = 1 - p
        ctx.drawImage(layer, fx, fy, fw, fh)
        ctx.globalAlpha = 1
        const ry = lerp(fy + (rows - 1) * cs, fy + Math.floor(rows / 2) * cs, p)
        const g = gap()
        const thick = smoothstep(0.55, 1, p)
        const half = (threads >> 1) * cs * thick
        ctx.fillStyle = C.paper
        ctx.fillRect(fx, ry - half, fw, cs + half * 2)
        ctx.fillStyle = C.ink
        ctx.beginPath()
        for (let j = -(threads >> 1); j <= threads >> 1; j++) {
          const yy = ry + j * cs * thick
          if (j && thick <= 0) continue
          for (let i = 0; i < cols; i++) if (lastRow[i]) ctx.rect(fx + i * cs + g / 2, yy + g / 2, cs - g, cs - g)
        }
        ctx.fill()
        ctx.strokeStyle = rgba(C.moss, 0.8 * p)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(fx - 10, ry + cs / 2)
        ctx.lineTo(fx - 3, ry + cs / 2)
        ctx.moveTo(fx + fw + 3, ry + cs / 2)
        ctx.lineTo(fx + fw + 10, ry + cs / 2)
        ctx.stroke()
      } else ctx.drawImage(layer, fx, fy, fw, fh)

      // frame, crop marks, column ticks
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ctx.strokeRect(Math.round(fx) - 0.5, Math.round(fy) - 0.5, Math.round(fw) + 1, Math.round(fh) + 1)
      ctx.strokeStyle = rgba(C.ink, 0.65)
      cropMarks(ctx, fx - 7, fy - 7, fw + 14, fh + 14, preview ? 6 : 9)
      if (!preview) {
        ctx.strokeStyle = rgba(C.ink, 0.3)
        ctx.beginPath()
        const every = cols > 120 ? 10 : 5
        for (let i = 0; i <= cols; i += every) {
          const x = Math.round(fx + i * cs) + 0.5
          ctx.moveTo(x, fy - 2)
          ctx.lineTo(x, fy - (i % (every * 5) === 0 ? 7 : 4))
        }
        ctx.stroke()
        // axes: space runs across, time runs down
        if (!short) text(ctx, 'SPACE →', fx + fw, fy - 12, { size: 8.5, color: C.muted, align: 'right', tracking: 0.14 })
        if (!portrait && !short) {
          ctx.save()
          ctx.translate(fx - 12, fy + fh)
          ctx.rotate(-Math.PI / 2)
          text(ctx, '← TIME', 0, 0, { size: 8.5, color: C.muted, tracking: 0.14 })
          ctx.restore()
        }
      }

      // the loom head
      if (!isLife && pt < PRINT + 0.2) {
        const hy = fy + Math.min(rows, wantRows) * cs
        const col = RULES[phase].color
        ctx.strokeStyle = col
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(fx - (preview ? 4 : 10), hy + 0.5)
        ctx.lineTo(fx + fw + (preview ? 4 : 10), hy + 0.5)
        ctx.stroke()
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(fx + fw + 4, hy + 0.5)
        ctx.lineTo(fx + fw + 10, hy - 3.5)
        ctx.lineTo(fx + fw + 10, hy + 4.5)
        ctx.closePath()
        ctx.fill()
        if (!preview && !portrait && !short) text(ctx, String(wantRows).padStart(3, '0'), fx - 9, hy + 3.5, { size: 9, color: col, tracking: 0.08, align: 'right' })
      }

      // --- the label
      const k = { ink: C.ink, muted: C.muted }
      hits = []
      text(ctx, `${FIG} — AUTOMATA`, lx, ly, { size: preview || short ? 8 : 9.5, color: k.muted, tracking: 0.14 })
      if (!preview && lw >= 200) text(ctx, `${String(phase + 1).padStart(2, '0')} / 05`, lx + lw, ly, { size: short ? 8 : 9.5, color: k.muted, align: 'right', tracking: 0.14 })
      const appear = smoothstep(0, 0.55, pt)
      const def = RULES[Math.min(phase, RULES.length - 1)]
      const rule = ruleOf(Math.min(phase, RULES.length - 1))
      const edited = !isLife && rule !== def.n
      const showNote = !preview && !tiny
      const showBits = !preview && !short
      let size = preview ? Math.min(76, h * 0.24) : portrait ? Math.min(96, h * 0.115) : short ? h * 0.28 : Math.min(210, Math.max(110, h * 0.25))
      size = Math.min(size, lw / (isLife ? 1.25 : 1.45))
      const titleH = (preview || short ? 13 : portrait ? 20 : Math.min(30, size * 0.2)) * 1.1 + size * (isLife ? 0.9 * 1.08 : 0.86)
      const blockH = titleH + (preview || short ? 6 : 14) + (showNote ? 16 : 0) + (showBits ? 50 : 0) + (preview || short ? 26 : 44)
      const colTop = ly + (preview || short ? 6 : 18)
      const colBottom = h - m - (preview ? 34 : short ? (h >= 300 ? 30 : 4) : isLife ? 120 : 70)
      let y = colTop + Math.max(0, (colBottom - colTop - blockH) * (preview || short ? 0.3 : 0.42))
      let usedH: number
      if (isLife) usedH = bigTitle('Conway’s', 'Life', true, C.moss, lx, y, size * 0.9, appear)
      else usedH = bigTitle(edited ? 'Your rule' : 'Rule', String(rule), false, def.color === C.ink ? C.ink : def.color, lx, y, size, appear)
      y += usedH + (isLife ? size * 0.16 : 0) + (preview || short ? 6 : 14)
      // the note, and the rule's binary
      if (showNote) {
        const life = lifeName()
        const note = isLife
          ? life === 'B3/S23'
            ? short ? 'B3/S23' : `B3/S23 · THE LAST ROW, ${THREAD_WORDS[threads]} THREADS THICK`
            : `${life} · EDITED FROM B3/S23`
          : edited
            ? `EDITED FROM RULE ${def.n} · R RESETS`
            : `${def.note}`
        // narrow columns keep only what fits: the first clause, or nothing
        const fz = short ? 8.5 : 9.5
        setFont(ctx, { size: fz, tracking: 0.12 })
        let fitNote = note
        if (ctx.measureText(fitNote).width > lw) fitNote = note.split(' · ')[0]
        if (ctx.measureText(fitNote).width > lw) fitNote = ''
        if (fitNote) text(ctx, fitNote, lx, y, { size: fz, color: edited || (isLife && life !== 'B3/S23') ? C.moss : C.ink2, tracking: 0.12, alpha: appear })
        y += short ? 12 : 16
      }
      if (showBits) {
        if (!isLife && lw >= 200) text(ctx, `${rule.toString(2).padStart(8, '0').split('').join(' ')}  =  ${rule}`, lx, y, { size: 9.5, color: C.muted, tracking: 0.1, alpha: appear })
        y += portrait ? 26 : 34
      } else y += short ? 6 : 0
      const iconW = Math.min(lw, preview ? lw : 330)
      const ghostIcon = !preview && !acted && t > GHOST_ICON[0] && t < GHOST_ICON[1] ? (t - GHOST_ICON[0]) / (GHOST_ICON[1] - GHOST_ICON[0]) : 0

      if (isLife) y += lifeIcons(lx, y, iconW, clamp((pt - 0.2) / 1.2))
      else y += ruleIcons(rule, lx, y + 6, iconW, clamp((pt - 0.15) / 1.0), def.color, !preview && wantRows > 0 && pt < PRINT, ghostIcon)
      // contextual line under the icons: what a tap would do, or the ghost's instruction
      if (!preview && !tiny) {
        let hint = ''
        if (hover?.kind === 'bit' && !isLife) {
          const pat = hover.n.toString(2).padStart(3, '0')
          const out = (rule >> hover.n) & 1
          hint = `${pat} → ${1 - out} · RULE ${rule} → ${rule ^ (1 << hover.n)}`
        } else if ((hover?.kind === 'birth' || hover?.kind === 'survive') && isLife) {
          const on = ((hover.kind === 'birth' ? rulesB : rulesS) >> hover.n) & 1
          hint = `${on ? 'REMOVE' : 'ADD'} ${hover.n} · ${hover.kind === 'birth' ? 'BIRTH' : 'SURVIVAL'}`
        } else if (ghostIcon > 0) hint = short ? 'TAP AN ICON TO FLIP A BIT' : 'TAP AN ICON TO FLIP ITS BIT'
        if (hint) {
          ctx.globalAlpha = ghostIcon > 0 && !hover ? smoothstep(0, 0.1, ghostIcon) * (1 - smoothstep(0.85, 1, ghostIcon)) : 1
          text(ctx, hint, lx, Math.min(y + 20, h - m - 2), { size: 8.5, color: C.moss, tracking: 0.14 })
          ctx.globalAlpha = 1
          y += 14
        }
      }
      // the cloth: a hover line, and the ghost's second lesson
      const ghostCloth = !preview && !acted && t > GHOST_CLOTH[0] && t < GHOST_CLOTH[1] ? (t - GHOST_CLOTH[0]) / (GHOST_CLOTH[1] - GHOST_CLOTH[0]) : 0
      if (!preview && (hoverCloth || ghostCloth > 0)) {
        const a = hoverCloth ? 1 : smoothstep(0, 0.12, ghostCloth) * (1 - smoothstep(0.85, 1, ghostCloth))
        const label = isLife ? 'TAP THE CLOTH TO START AGAIN' : 'TAP THE CLOTH FOR THE NEXT RULE'
        ctx.globalAlpha = a
        setFont(ctx, { size: 8.5, tracking: 0.14 })
        const tw = ctx.measureText(label).width + 12
        ctx.fillStyle = rgba(C.paper, 0.92)
        ctx.fillRect(fx + fw - tw - 6, fy + fh - 22, tw, 16)
        ctx.strokeStyle = rgba(C.moss, 0.7)
        ctx.lineWidth = 1
        ctx.strokeRect(Math.round(fx + fw - tw - 6) + 0.5, Math.round(fy + fh - 22) + 0.5, Math.round(tw), 16)
        text(ctx, label, fx + fw - 12, fy + fh - 11, { size: 8.5, color: C.moss, align: 'right', tracking: 0.14 })
        ctx.globalAlpha = 1
      }

      // readouts
      if ((!preview || !portrait) && !tiny) {
        const items = isLife
          ? [
              { label: 'Generation', value: String(Math.max(0, wantGen)).padStart(3, '0') },
              { label: 'Population', value: String(wantGen < 0 ? lastRow.reduce((a, v) => a + v, 0) * threads : (pop[pop.length - 1] ?? 0)).padStart(4, '0') },
            ]
          : [
              { label: 'Row', value: `${String(wantRows).padStart(3, '0')} / ${rows}` },
              { label: 'Density', value: density.toFixed(3) },
            ]
        if (!preview) items.push({ label: 'Grid', value: `${cols} × ${rows}` })
        if (short || lw < 280) items.splice(2)
        const hy = preview ? h - m - 26 : h - m - (short ? 24 : 30)
        if (hy > y + 10) hud(ctx, items, lx, hy, { size: preview || short ? 10 : portrait ? 11 : 13, gap: preview || short ? 12 : 22 })
        if (isLife && !preview && !short) {
          const sy = hy - 64
          if (sy > y + 6) {
            text(ctx, 'POPULATION', lx, sy - 6, { size: 8.5, color: C.muted, tracking: 0.14 })
            sparkline(lx, sy, Math.min(lw, 300), 34)
          }
        }
      }
      // portrait: the column's own small frame of ticks
      if (portrait && !preview) {
        ctx.strokeStyle = rgba(C.ink, 0.18)
        ctx.beginPath()
        ctx.moveTo(lx, ly - 14.5)
        ctx.lineTo(lx + lw, ly - 14.5)
        ctx.stroke()
      }
      // corner crop marks of the sheet
      if (!preview && !short) {
        ctx.strokeStyle = rgba(C.ink, 0.35)
        cropMarks(ctx, m * 0.4, m * 0.4, w - m * 0.8, h - m * 0.8, 9)
      }
    },
  }
}

export default create
