/*
 * FIG. M.03 — LEARNING. A small neural network trained live, for real, in
 * the browser: a 2 → 12 → 12 → 1 multilayer perceptron (tanh hidden units,
 * sigmoid output, binary cross-entropy, Adam, minibatches of 32), seeded so
 * every run is the same.
 *
 * Left, the input plane: the two classes (ocean dots, moss rings) and the
 * network's output p(x) as contour lines from marching squares, 0.1 … 0.9,
 * with the 0.5 decision boundary drawn heavier and the p > 0.5 side lightly
 * hatched. Right, the network itself: edges whose width and colour are the
 * weights' magnitude and sign, nodes showing the activations for a probe
 * point that wanders the plane, and forward-pass pulses. Below, the loss
 * and accuracy curves. At ≥ 98 % accuracy it holds, dissolves, re-initialises
 * and moves to the next dataset: two spirals → circles → moons → XOR.
 *
 * Interaction (full mode): hover the plane to move the probe (the network
 * diagram shows that point's activations); click or tap to add a
 * counterexample — a point of the class the network currently gets wrong
 * there — and watch it retrain around it. N next dataset, R retrain from
 * fresh weights, Space pause training.
 */

import { C, clamp, cropMarks, ease, fract, gauss, inkOn, lerp, mixHex, rgba, rng, setFont, TAU, text } from '../kit'
import type { CreatePiece } from '../types'

/* ------------------------------------------------------------------ data */

interface Dataset {
  key: string
  name: string
  lr: number
  /** training steps per second */
  sps: number
  make: (r: () => number) => { x: Float32Array; y: Float32Array; c: Uint8Array }
}

const NPTS = 200
/** room for the points the viewer adds */
const EXTRA = 80
const CAP = NPTS + EXTRA

function build(fn: (i: number, r: () => number) => [number, number, number]) {
  return (r: () => number) => {
    const x = new Float32Array(NPTS)
    const y = new Float32Array(NPTS)
    const c = new Uint8Array(NPTS)
    for (let i = 0; i < NPTS; i++) {
      const [a, b, k] = fn(i, r)
      x[i] = a
      y[i] = b
      c[i] = k
    }
    return { x, y, c }
  }
}

const DATASETS: Dataset[] = [
  {
    key: 'spirals',
    name: 'Two spirals',
    lr: 0.02,
    sps: 220,
    make: build((i, r) => {
      const c = i % 2
      const k = Math.floor(i / 2) / (NPTS / 2)
      const a = k * 1.5 * TAU + c * Math.PI
      const rad = 0.1 + k * 0.85
      return [rad * Math.cos(a) + gauss(r) * 0.03, rad * Math.sin(a) + gauss(r) * 0.03, c]
    }),
  },
  {
    key: 'circles',
    name: 'Concentric circles',
    lr: 0.008,
    sps: 42,
    make: build((i, r) => {
      const c = i % 2
      const a = r() * TAU
      const rad = c ? 0.36 + gauss(r) * 0.06 : 0.8 + gauss(r) * 0.06
      return [rad * Math.cos(a), rad * Math.sin(a), c]
    }),
  },
  {
    key: 'moons',
    name: 'Two moons',
    lr: 0.008,
    sps: 50,
    make: build((i, r) => {
      const c = i % 2
      const a = r() * Math.PI
      let x = c ? Math.cos(a) * 0.62 - 0.31 : 0.31 - Math.cos(a) * 0.62
      let y = c ? Math.sin(a) * 0.62 - 0.2 : 0.2 - Math.sin(a) * 0.62
      x += gauss(r) * 0.06
      y += gauss(r) * 0.06
      return [x, y, c]
    }),
  },
  {
    key: 'xor',
    name: 'XOR',
    lr: 0.008,
    sps: 42,
    make: build((_i, r) => {
      let x = r() * 1.8 - 0.9
      let y = r() * 1.8 - 0.9
      if (Math.abs(x) < 0.08) x += x < 0 ? -0.08 : 0.08
      if (Math.abs(y) < 0.08) y += y < 0 ? -0.08 : 0.08
      return [x, y, x * y > 0 ? 1 : 0]
    }),
  },
]

/* ------------------------------------------------------------------- MLP */

const H = 12
const LAYERS = [2, H, H, 1]
const oW1 = 0
const ob1 = 2 * H
const oW2 = 3 * H
const ob2 = 3 * H + H * H
const oW3 = 4 * H + H * H
const ob3 = 5 * H + H * H
const NP = ob3 + 1
const BATCH = 32

class MLP {
  P = new Float64Array(NP)
  G = new Float64Array(NP)
  M = new Float64Array(NP)
  V = new Float64Array(NP)
  t = 0
  a1 = new Float64Array(H)
  a2 = new Float64Array(H)
  d1 = new Float64Array(H)
  d2 = new Float64Array(H)

  init(r: () => number) {
    const P = this.P
    for (let i = 0; i < 2 * H; i++) P[oW1 + i] = gauss(r) * Math.sqrt(1 / 2)
    for (let i = 0; i < H * H; i++) P[oW2 + i] = gauss(r) * Math.sqrt(1 / H)
    for (let i = 0; i < H; i++) P[oW3 + i] = gauss(r) * Math.sqrt(1 / H)
    for (let i = 0; i < H; i++) {
      P[ob1 + i] = 0
      P[ob2 + i] = 0
    }
    P[ob3] = 0
    this.M.fill(0)
    this.V.fill(0)
    this.t = 0
  }

  /** p(x); hidden activations are left in a1, a2. */
  forward(x: number, y: number) {
    const P = this.P
    const a1 = this.a1
    const a2 = this.a2
    for (let j = 0; j < H; j++) a1[j] = Math.tanh(P[oW1 + j * 2] * x + P[oW1 + j * 2 + 1] * y + P[ob1 + j])
    for (let j = 0; j < H; j++) {
      let s = P[ob2 + j]
      const row = oW2 + j * H
      for (let i = 0; i < H; i++) s += P[row + i] * a1[i]
      a2[j] = Math.tanh(s)
    }
    let s = P[ob3]
    for (let i = 0; i < H; i++) s += P[oW3 + i] * a2[i]
    return 1 / (1 + Math.exp(-s))
  }

  /** One Adam step on a minibatch; returns the mean BCE. */
  step(X: Float32Array, Y: Float32Array, Cl: Uint8Array, n: number, r: () => number, lr: number) {
    const P = this.P
    const G = this.G
    const { a1, a2, d1, d2 } = this
    G.fill(0)
    let loss = 0
    for (let b = 0; b < BATCH; b++) {
      const idx = Math.floor(r() * n)
      const x = X[idx]
      const y = Y[idx]
      const yt = Cl[idx]
      const p = this.forward(x, y)
      loss -= yt ? Math.log(p + 1e-9) : Math.log(1 - p + 1e-9)
      const dz = p - yt
      for (let i = 0; i < H; i++) {
        G[oW3 + i] += dz * a2[i]
        d2[i] = dz * P[oW3 + i] * (1 - a2[i] * a2[i])
      }
      G[ob3] += dz
      for (let j = 0; j < H; j++) {
        const row = oW2 + j * H
        for (let i = 0; i < H; i++) G[row + i] += d2[j] * a1[i]
        G[ob2 + j] += d2[j]
      }
      for (let i = 0; i < H; i++) {
        let s = 0
        for (let j = 0; j < H; j++) s += d2[j] * P[oW2 + j * H + i]
        d1[i] = s * (1 - a1[i] * a1[i])
      }
      for (let j = 0; j < H; j++) {
        G[oW1 + j * 2] += d1[j] * x
        G[oW1 + j * 2 + 1] += d1[j] * y
        G[ob1 + j] += d1[j]
      }
    }
    this.t++
    const bc1 = 1 - Math.pow(0.9, this.t)
    const bc2 = 1 - Math.pow(0.999, this.t)
    const M = this.M
    const V = this.V
    for (let i = 0; i < NP; i++) {
      const g = G[i] / BATCH
      M[i] = 0.9 * M[i] + 0.1 * g
      V[i] = 0.999 * V[i] + 0.001 * g * g
      P[i] -= (lr * (M[i] / bc1)) / (Math.sqrt(V[i] / bc2) + 1e-8)
    }
    return loss / BATCH
  }

  /** weight of the edge from node i in layer l to node j in layer l+1 */
  w(l: number, i: number, j: number) {
    if (l === 0) return this.P[oW1 + j * 2 + i]
    if (l === 1) return this.P[oW2 + j * H + i]
    return this.P[oW3 + i]
  }
}

/* ------------------------------------------------------ marching squares */

const LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

function contour(v: Float32Array, n: number, x0: number, y0: number, cs: number, paths: Path2D[]) {
  const W = n + 1
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = v[j * W + i]
      const b = v[j * W + i + 1]
      const c = v[(j + 1) * W + i + 1]
      const d = v[(j + 1) * W + i]
      const lo = Math.min(a, b, c, d)
      const hi = Math.max(a, b, c, d)
      if (hi < 0.1 || lo > 0.9) continue
      const X = x0 + i * cs
      const Y = y0 + j * cs
      for (let k = 0; k < LEVELS.length; k++) {
        const L = LEVELS[k]
        if (L < lo || L >= hi) continue
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0)
        const p = paths[k]
        const tx = X + ((L - a) / (b - a)) * cs
        const ry = Y + ((L - b) / (c - b)) * cs
        const bx = X + ((L - d) / (c - d)) * cs
        const ly = Y + ((L - a) / (d - a)) * cs
        switch (idx) {
          case 1:
          case 14:
            p.moveTo(X, ly)
            p.lineTo(bx, Y + cs)
            break
          case 2:
          case 13:
            p.moveTo(bx, Y + cs)
            p.lineTo(X + cs, ry)
            break
          case 3:
          case 12:
            p.moveTo(X, ly)
            p.lineTo(X + cs, ry)
            break
          case 4:
          case 11:
            p.moveTo(tx, Y)
            p.lineTo(X + cs, ry)
            break
          case 6:
          case 9:
            p.moveTo(tx, Y)
            p.lineTo(bx, Y + cs)
            break
          case 7:
          case 8:
            p.moveTo(X, ly)
            p.lineTo(tx, Y)
            break
          case 5:
          case 10: {
            const centre = (a + b + c + d) / 4 > L
            if ((idx === 5) === centre) {
              p.moveTo(X, ly)
              p.lineTo(tx, Y)
              p.moveTo(bx, Y + cs)
              p.lineTo(X + cs, ry)
            } else {
              p.moveTo(tx, Y)
              p.lineTo(X + cs, ry)
              p.moveTo(X, ly)
              p.lineTo(bx, Y + cs)
            }
            break
          }
        }
      }
    }
  }
}

/* ----------------------------------------------------------------- piece */

type Phase = 'enter' | 'train' | 'hold' | 'dissolve'
const ENTER = 1.1
const HOLD = 2.0
const DISSOLVE = 1.1
const MAX_TRAIN = 16
const HIST = 512

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === "preview"
  let GN = preview ? 26 : 44
  let field = new Float32Array((GN + 1) * (GN + 1))
  const net = new MLP()
  const pick = rng(4242)

  // state
  let di = 0
  const data = { x: new Float32Array(CAP), y: new Float32Array(CAP), c: new Uint8Array(CAP) }
  /** points in use: the dataset's NPTS plus any the viewer added */
  let np = NPTS
  let added = 0
  const born = new Float32Array(CAP)
  let phase: Phase = 'enter'
  let phaseT = 0
  let trainT = 0
  let steps = 0
  let stepAcc = 0
  let lossEma = 0.7
  let acc = 0.5
  let wrong = new Uint8Array(CAP)
  const histLoss = new Float32Array(HIST)
  const histAcc = new Float32Array(HIST)
  let histN = 0
  let histEvery = 2
  let histNext = 0
  let convergedAt = -1
  const scatter = new Float32Array(CAP * 2)

  // interaction
  let hover: { x: number; y: number } | null = null
  let down: { x: number; y: number } | null = null
  let interacted = false
  let paused = false
  let holdUntil = -1
  let lastT = 0

  function startDataset(i: number) {
    di = i % DATASETS.length
    const d = DATASETS[di].make(rng(101 + di * 17))
    data.x.set(d.x)
    data.y.set(d.y)
    data.c.set(d.c)
    np = NPTS
    added = 0
    holdUntil = -1
    net.init(rng(2 + di * 31))
    version++
    phase = 'enter'
    phaseT = 0
    trainT = 0
    steps = 0
    stepAcc = 0
    lossEma = 0.7
    histN = 0
    histEvery = DATASETS[di].sps > 100 ? 4 : 1
    histNext = 0
    convergedAt = -1
    evaluate()
    const r = rng(77 + di)
    for (let k = 0; k < CAP; k++) {
      const a = r() * TAU
      scatter[k * 2] = Math.cos(a) * (0.2 + r() * 0.5)
      scatter[k * 2 + 1] = Math.sin(a) * (0.2 + r() * 0.5)
    }
  }

  function evaluate() {
    let c = 0
    const w = new Uint8Array(CAP)
    for (let i = 0; i < np; i++) {
      const ok = net.forward(data.x[i], data.y[i]) > 0.5 === (data.c[i] === 1)
      if (ok) c++
      else w[i] = 1
    }
    acc = c / np
    wrong = w
  }

  /** Back to training (after the viewer changed the data or the weights). */
  function resume() {
    if (phase !== 'train') {
      phase = 'train'
      phaseT = 0
    }
    trainT = Math.min(trainT, MAX_TRAIN - 6)
    trainT = Math.max(trainT, 2.5)
  }

  /** Add a counterexample at (x, y): the class the network currently gets wrong there. */
  function addPoint(x: number, y: number) {
    const p = net.forward(x, y)
    const i = np < CAP ? np++ : NPTS + (added % EXTRA)
    data.x[i] = x
    data.y[i] = y
    data.c[i] = p > 0.5 ? 0 : 1
    born[i] = lastT
    added++
    evaluate()
    resume()
    holdUntil = lastT + 10
    env.sfx.tone(data.c[i] ? 659.25 : 493.88, 0.18, { type: 'sine', gain: 0.05, room: 0.3 })
  }

  /** Fresh weights on the same data (keeps the viewer's points). */
  function retrain() {
    net.init(rng(2 + di * 31 + steps))
    version++
    steps = 0
    stepAcc = 0
    lossEma = 0.7
    histN = 0
    histNext = 0
    histEvery = DATASETS[di].sps > 100 ? 4 : 1
    convergedAt = -1
    evaluate()
    phase = 'train'
    phaseT = 0
    trainT = 0
    holdUntil = lastT + 10
  }

  function record() {
    if (histN >= HIST) {
      // downsample by two and widen the interval
      for (let i = 0; i < HIST / 2; i++) {
        histLoss[i] = (histLoss[i * 2] + histLoss[i * 2 + 1]) / 2
        histAcc[i] = (histAcc[i * 2] + histAcc[i * 2 + 1]) / 2
      }
      histN = HIST / 2
      histEvery *= 2
    }
    histLoss[histN] = lossEma
    histAcc[histN] = acc
    histN++
  }

  function update(dt: number) {
    phaseT += dt
    const D = DATASETS[di]
    if (phase === 'enter' && phaseT >= ENTER) {
      phase = 'train'
      phaseT = 0
    } else if (phase === 'train' && paused) {
      // paused: hold still
    } else if (phase === 'train') {
      trainT += dt
      // a gentle ramp so the first moves of the boundary are visible
      const rate = D.sps * (0.35 + 0.65 * clamp(trainT / 2.5))
      stepAcc += rate * dt
      while (stepAcc >= 1) {
        stepAcc -= 1
        const l = net.step(data.x, data.y, data.c, np, pick, D.lr)
        version++
        lossEma = steps === 0 ? l : lossEma * 0.96 + l * 0.04
        steps++
        if (steps >= histNext) {
          if (steps % 10 === 0 || histNext === 0) evaluate()
          record()
          histNext = steps + histEvery
        }
        if (steps % 10 === 0) {
          evaluate()
          if (acc >= 0.98 && steps >= 40) {
            phase = 'hold'
            phaseT = 0
            convergedAt = steps
            env.sfx.tone(523.25, 0.5, { type: 'sine', gain: 0.06, room: 0.4 })
            env.sfx.tone(783.99, 0.7, { type: 'sine', gain: 0.045, room: 0.4, when: 0.09 })
            break
          }
        }
      }
      if (phase === 'train' && trainT > MAX_TRAIN) {
        phase = 'hold'
        phaseT = 0
        convergedAt = steps
      }
    } else if (phase === 'hold' && phaseT >= HOLD && lastT >= holdUntil) {
      phase = 'dissolve'
      phaseT = 0
    } else if (phase === 'dissolve' && phaseT >= DISSOLVE) startDataset(di + 1)
  }

  /* ------------------------------------------------------------ layout */
  let W = env.width
  let Hh = env.height
  let pad = 20
  let small = false
  let portrait = false
  let plane = { x: 0, y: 0, s: 100 }
  let netBox = { x: 0, y: 0, w: 100, h: 100 }
  let chart = { x: 0, y: 0, w: 100, h: 60 }
  let read = { x: 0, y: 0, w: 100 }
  let nodes: { x: number; y: number }[][] = []
  let nodeR = 5

  function layout(w: number, h: number) {
    W = w
    Hh = h
    portrait = h > w * 1.08
    small = preview || Math.min(w, h) < 380 || (h <= w * 1.08 && w < 600)
    pad = clamp(Math.min(w, h) * 0.05, 14, 44)
    const top = pad + (small ? 34 : 64)
    const capBand = small ? 20 : 30
    if (!portrait) {
      const avH = h - top - capBand - pad * 0.62
      const s = Math.floor(Math.min(avH, w * (small ? 0.56 : 0.47)))
      plane = { x: pad + (small ? 0 : 22), y: top + (avH - s) / 2, s }
      const rx = plane.x + s + (small ? 18 : clamp(w * 0.05, 40, 90))
      const rw = w - pad - rx
      if (small) {
        const nh = Math.round(s * 0.6)
        netBox = { x: rx, y: plane.y, w: rw, h: nh }
        const by = plane.y + nh + 14
        if (rw > 250) {
          // wide and short: readout and chart side by side under the network
          read = { x: rx, y: by + 8, w: 110 }
          chart = { x: rx + 124, y: by, w: rw - 124, h: Math.max(24, plane.y + s - by) }
        } else {
          read = { x: rx, y: by + 6, w: rw }
          chart = { x: rx, y: plane.y + s - 30, w: rw, h: 28 }
        }
      } else {
        // network on top, the readout block, then the chart down to the plane's bottom edge
        const nh = Math.round(s * 0.52)
        netBox = { x: rx, y: plane.y + 4, w: rw, h: nh }
        read = { x: rx, y: plane.y + nh + 46, w: rw }
        const cy = read.y + 120
        chart = { x: rx + 30, y: cy, w: rw - 30, h: Math.max(30, plane.y + s - cy) }
      }
    } else {
      const s = Math.floor(Math.min(w - pad * 2 - (small ? 0 : 22), h * 0.4))
      plane = { x: pad + (small ? 0 : 22) + (w - pad * 2 - (small ? 0 : 22) - s) / 2, y: top, s }
      const ny = plane.y + s + (small ? 20 : 40)
      const nh = Math.round(h * (small ? 0.2 : 0.17))
      netBox = { x: pad, y: ny, w: w - pad * 2, h: nh }
      read = { x: pad, y: ny + nh + (small ? 14 : 36), w: w - pad * 2 }
      const cy = read.y + (small ? 44 : 114)
      chart = { x: pad + 30, y: cy, w: w - pad * 2 - 30, h: Math.max(26, h - capBand - pad * 0.62 - 18 - cy) }
    }
    // whole pixels, so the cached layers blit without resampling
    plane = { x: Math.round(plane.x), y: Math.round(plane.y), s: plane.s }
    netBox = { x: Math.round(netBox.x), y: Math.round(netBox.y), w: Math.round(netBox.w), h: Math.round(netBox.h) }
    // field resolution follows the plane's size (≈ 11 px cells)
    const gn = preview ? 26 : Math.round(clamp(plane.s / 11, 36, 64))
    if (gn !== GN) {
      GN = gn
      field = new Float32Array((GN + 1) * (GN + 1))
      fieldKey = ''
    }
    // network nodes: layers left → right
    nodes = []
    const nb = netBox
    const lx = (l: number) => nb.x + (small ? 8 : 26) + (l / (LAYERS.length - 1)) * (nb.w - (small ? 16 : 26 + 64))
    nodeR = clamp(Math.min(nb.h / (H * 2.6), 7), 2.2, 7)
    for (let l = 0; l < LAYERS.length; l++) {
      const n = LAYERS[l]
      const col: { x: number; y: number }[] = []
      const span = n === 1 ? 0 : n === 2 ? nb.h * 0.36 : nb.h - nodeR * 4 - (small ? 4 : 20)
      for (let i = 0; i < n; i++) col.push({ x: lx(l), y: nb.y + nb.h / 2 - (small ? 0 : 8) + (n === 1 ? 0 : (i / (n - 1) - 0.5) * span) })
      nodes.push(col)
    }
  }


  /* ----------------------------------------------------------- drawing */
  const toPX = (x: number) => plane.x + ((x + 1.2) / 2.4) * plane.s
  const toPY = (y: number) => plane.y + ((1.2 - y) / 2.4) * plane.s

  function evalField() {
    for (let j = 0; j <= GN; j++)
      for (let i = 0; i <= GN; i++) {
        const x = -1.2 + (2.4 * i) / GN
        const y = 1.2 - (2.4 * j) / GN
        field[j * (GN + 1) + i] = net.forward(x, y)
      }
  }

  function fieldAt(px: number, py: number) {
    const fi = clamp(((px - plane.x) / plane.s) * GN, 0, GN - 0.0001)
    const fj = clamp(((py - plane.y) / plane.s) * GN, 0, GN - 0.0001)
    const i = Math.floor(fi)
    const j = Math.floor(fj)
    const u = fi - i
    const v = fj - j
    const W1 = GN + 1
    const a = field[j * W1 + i]
    const b = field[j * W1 + i + 1]
    const c = field[(j + 1) * W1 + i + 1]
    const d = field[(j + 1) * W1 + i]
    return (a * (1 - u) + b * u) * (1 - v) + (d * (1 - u) + c * u) * v
  }

  // offscreen layers for the slow-changing linework (weights change, not the frame)
  let fieldLayer: HTMLCanvasElement | null = null
  let fieldCtx: CanvasRenderingContext2D | null = null
  let netLayer: HTMLCanvasElement | null = null
  let netCtx: CanvasRenderingContext2D | null = null
  let version = 0
  let frameNo = 0
  let fieldKey = ''
  let fieldAt0 = -99
  let netKey = ''
  let netAt0 = -99
  const REFRESH = 2

  function makeLayer(w: number, h: number, prev: HTMLCanvasElement | null): [HTMLCanvasElement | null, CanvasRenderingContext2D | null] {
    try {
      const c = prev ?? document.createElement('canvas')
      const dpr = env.dpr || 1
      const pw = Math.max(1, Math.round(w * dpr))
      const ph = Math.max(1, Math.round(h * dpr))
      if (c.width !== pw || c.height !== ph) {
        c.width = pw
        c.height = ph
      }
      const g = c.getContext('2d')
      if (!g) return [null, null]
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, pw, ph)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      return [c, g]
    } catch {
      return [null, null]
    }
  }

  function refreshField() {
    const key = `${version}|${phase === 'hold'}|${plane.s}|${env.dpr}`
    if (key === fieldKey || (frameNo - fieldAt0 < REFRESH && fieldLayer && phase === 'train' && key.split('|')[1] === fieldKey.split('|')[1])) return
    fieldKey = key
    fieldAt0 = frameNo
    evalField()
    const { x, y, s } = plane
    ;[fieldLayer, fieldCtx] = makeLayer(s + 4, s + 4, fieldLayer)
    const g = fieldCtx
    if (!g) return
    g.translate(2 - x, 2 - y)
    const gap = small ? 5 : 6
    const step = Math.max(2.5, s / GN / 2)
    g.beginPath()
    for (let q = -s; q <= s; q += gap) {
      // a 45° scanline from (x + q, y + s), split where p crosses 0.5
      let inside = false
      let have = false
      let prevV = 0
      let prevX = 0
      let prevY = 0
      for (let d = 0; d <= s * 1.42; d += step) {
        const px = x + q + d * 0.7071
        const py = y + s - d * 0.7071
        if (px > x + s || py < y) break
        if (px < x) continue
        const v = fieldAt(px, py)
        const now = v > 0.5
        if (!have) {
          if (now) g.moveTo(px, py)
          inside = now
          have = true
        } else if (now !== inside) {
          const f = clamp((0.5 - prevV) / (v - prevV || 1))
          const cx = lerp(prevX, px, f)
          const cy = lerp(prevY, py, f)
          if (now) g.moveTo(cx, cy)
          else g.lineTo(cx, cy)
          inside = now
        }
        prevV = v
        prevX = px
        prevY = py
      }
      if (inside) g.lineTo(prevX, prevY)
    }
    g.strokeStyle = rgba(C.moss, 0.17)
    g.lineWidth = 1
    g.stroke()
    const paths = LEVELS.map(() => new Path2D())
    contour(field, GN, x, y, s / GN, paths)
    for (let q = 0; q < LEVELS.length; q++) {
      const L = LEVELS[q]
      if (L === 0.5) continue
      const off = Math.abs(L - 0.5) / 0.4
      g.strokeStyle = rgba(L < 0.5 ? C.ocean : C.moss, 0.62 - off * 0.38)
      g.lineWidth = 1
      g.stroke(paths[q])
    }
    g.strokeStyle = rgba(C.ink, 0.9)
    g.lineWidth = phase === 'hold' ? 2 : 1.6
    g.lineJoin = 'round'
    g.stroke(paths[4])
  }

  function refreshNet(build: number) {
    const key = `${version}|${build.toFixed(3)}|${netBox.w}|${netBox.h}|${env.dpr}`
    if (key === netKey || (frameNo - netAt0 < REFRESH && netLayer && build >= 1 && netKey.split('|')[1] === key.split('|')[1])) return
    netKey = key
    netAt0 = frameNo
    const M = 12
    ;[netLayer, netCtx] = makeLayer(netBox.w + M * 2, netBox.h + M * 2, netLayer)
    const g = netCtx
    if (!g) return
    g.translate(M - netBox.x, M - netBox.y)
    const BUCK = 6
    for (let sign = 0; sign < 2; sign++) {
      for (let b = 0; b < BUCK; b++) {
        g.beginPath()
        let any = false
        for (let l = 0; l < LAYERS.length - 1; l++) {
          const lp = clamp(build * 3 - l)
          if (lp <= 0) continue
          for (let i = 0; i < LAYERS[l]; i++)
            for (let j = 0; j < LAYERS[l + 1]; j++) {
              const w = net.w(l, i, j)
              if ((w >= 0 ? 0 : 1) !== sign) continue
              const m = Math.min(1, Math.abs(w) / 2)
              if (Math.min(BUCK - 1, Math.floor(m * BUCK)) !== b) continue
              const A = nodes[l][i]
              const B = nodes[l + 1][j]
              g.moveTo(A.x + nodeR, A.y)
              g.lineTo(lerp(A.x + nodeR, B.x - nodeR, lp), lerp(A.y, B.y, lp))
              any = true
            }
        }
        if (!any) continue
        const m = (b + 0.5) / BUCK
        g.lineWidth = (small ? 0.4 : 0.45) + m * (small ? 1.4 : 2.2)
        g.strokeStyle = rgba(sign ? C.fern : C.ocean, 0.12 + 0.7 * m)
        g.stroke()
      }
    }
  }

  function drawPlane(t: number, fieldA: number, pointsA: number, dis: number) {
    const k = inkOn('paper')
    const { x, y, s } = plane
    // hatch + contours live in a cached layer, refreshed as the weights change
    if (fieldA > 0) {
      refreshField()
      if (fieldLayer) {
        ctx.globalAlpha = fieldA
        ctx.drawImage(fieldLayer, x - 2, y - 2, s + 4, s + 4)
        ctx.globalAlpha = 1
      }
    }
    // points
    if (pointsA > 0) {
      const r = small ? 1.9 : 2.5
      const ent = phase === 'enter' ? phaseT / ENTER : 1
      const dots = new Path2D()
      const rings = new Path2D()
      const miss = new Path2D()
      const fresh = new Path2D()
      for (let i = 0; i < np; i++) {
        const appear = i < NPTS ? ease.outBack(clamp(ent * 1.6 - (i / NPTS) * 0.6)) : ease.outBack(clamp((t - born[i]) / 0.35))
        if (appear <= 0) continue
        const e = ease.inCubic(dis)
        const px = toPX(data.x[i] + scatter[i * 2] * e)
        const py = toPY(data.y[i] + scatter[i * 2 + 1] * e)
        const rr = r * appear
        if (data.c[i]) {
          rings.moveTo(px + rr * 1.1, py)
          rings.arc(px, py, rr * 1.1, 0, TAU)
        } else {
          dots.moveTo(px + rr, py)
          dots.arc(px, py, rr, 0, TAU)
        }
        if (wrong[i] && phase === 'train' && steps > 0) {
          miss.moveTo(px + r * 2.6, py)
          miss.arc(px, py, r * 2.6, 0, TAU)
        }
        // a ring released by a point the viewer just added
        const age = t - born[i]
        if (i >= NPTS && age < 0.7) {
          const rr2 = r * 2 + 16 * ease.outCubic(age / 0.7)
          fresh.moveTo(px + rr2, py)
          fresh.arc(px, py, rr2, 0, TAU)
        }
      }
      ctx.strokeStyle = rgba(C.ink, 0.45)
      ctx.lineWidth = 1
      ctx.stroke(fresh)
      ctx.globalAlpha = pointsA * (1 - dis)
      ctx.fillStyle = C.ocean
      ctx.fill(dots)
      ctx.strokeStyle = C.moss
      ctx.lineWidth = small ? 1 : 1.2
      ctx.stroke(rings)
      ctx.strokeStyle = rgba(C.ink, 0.55)
      ctx.lineWidth = 1
      ctx.stroke(miss)
      ctx.globalAlpha = 1
    }
    // probe crosshair
    const [qx, qy] = probe(t)
    const px = toPX(qx)
    const py = toPY(qy)
    if ((!small || hover) && fieldA > 0) {
      ctx.globalAlpha = fieldA
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(px, py, 4.5, 0, TAU)
      ctx.moveTo(px - 11, py)
      ctx.lineTo(px - 6, py)
      ctx.moveTo(px + 6, py)
      ctx.lineTo(px + 11, py)
      ctx.moveTo(px, py - 11)
      ctx.lineTo(px, py - 6)
      ctx.moveTo(px, py + 6)
      ctx.lineTo(px, py + 11)
      ctx.stroke()
      const p = net.forward(qx, qy)
      const right = px < x + s * 0.62
      const lab = `p = ${p.toFixed(3)}`
      const add = hover ? (W < 700 ? 'TAP TO ADD' : 'CLICK TO ADD A COUNTEREXAMPLE') : ''
      setFont(ctx, { size: 9, tracking: 0.06 })
      const tw = Math.max(ctx.measureText(lab).width, add ? ctx.measureText(add).width + 12 : 0)
      const lx = right ? px + 14 : px - 14 - tw
      ctx.fillStyle = rgba(C.paper, 0.85)
      ctx.fillRect(lx - 3, py - 20, tw + 6, add ? 27 : 13)
      text(ctx, lab, lx, py - 10, { size: 9, color: C.ink, tracking: 0.06 })
      if (add) {
        // the class that would be added: the one the network gets wrong here
        const c1 = p <= 0.5
        ctx.beginPath()
        ctx.arc(lx + 3, py + 0.5, 2.6, 0, TAU)
        if (c1) {
          ctx.strokeStyle = C.moss
          ctx.lineWidth = 1.2
          ctx.stroke()
        } else {
          ctx.fillStyle = C.ocean
          ctx.fill()
        }
        text(ctx, add, lx + 12, py + 4, { size: 8.5, color: c1 ? C.moss : C.ocean, tracking: 0.12 })
      }
      ctx.globalAlpha = 1
    }
    // frame, ticks and axes
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(s), Math.round(s))
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    for (let i = 0; i <= 24; i++) {
      const f = i / 24
      const len = i % 6 === 0 ? 6 : 3
      const xx = Math.round(x + f * s) + 0.5
      const yy = Math.round(y + f * s) + 0.5
      ctx.moveTo(xx, y + s + 1)
      ctx.lineTo(xx, y + s + 1 + len)
      ctx.moveTo(x - 1, yy)
      ctx.lineTo(x - 1 - len, yy)
    }
    ctx.stroke()
    if (!small) {
      for (const v of [-1, 0, 1]) {
        text(ctx, v === 0 ? '0' : v < 0 ? '−1' : '1', toPX(v), y + s + 18, { size: 8.5, color: k.muted, align: 'center', tracking: 0.04 })
        text(ctx, v === 0 ? '0' : v < 0 ? '−1' : '1', x - 10, toPY(v) + 3, { size: 8.5, color: k.muted, align: 'right', tracking: 0.04 })
      }
      text(ctx, 'x₁', x + s, y + s + 18, { font: 'serif', size: 14, italic: true, color: k.ink2, align: 'right' })
      text(ctx, 'x₂', x - 10, y + 2, { font: 'serif', size: 14, italic: true, color: k.ink2, align: 'right', baseline: 'top' })
    }
    ctx.strokeStyle = rgba(C.ink, 0.6)
    cropMarks(ctx, x - 6, y - 6, s + 12, s + 12, 8)
  }

  /** The probe point: the pointer when it is over the plane, else a slow Lissajous wander. */
  function probe(t: number): [number, number] {
    if (hover) return [hover.x, hover.y]
    return [0.86 * Math.sin(t * 0.31 + 0.4), 0.86 * Math.sin(t * 0.47 + 1.3)]
  }

  /** CSS px → data coordinates, if on the plane. */
  function planeAt(X: number, Y: number): { x: number; y: number } | null {
    const x = ((X - plane.x) / plane.s) * 2.4 - 1.2
    const y = 1.2 - ((Y - plane.y) / plane.s) * 2.4
    return Math.abs(x) <= 1.2 && Math.abs(y) <= 1.2 ? { x, y } : null
  }

  function drawNet(t: number, alpha: number, build: number) {
    const k = inkOn('paper')
    if (alpha <= 0) return
    // activations for the probe point
    const [qx, qy] = probe(t)
    const p = net.forward(qx, qy)
    const acts: ArrayLike<number>[] = [[qx, qy], Float64Array.from(net.a1), Float64Array.from(net.a2), [p * 2 - 1]]
    // edges (cached layer)
    refreshNet(build)
    if (netLayer) {
      ctx.globalAlpha = alpha
      ctx.drawImage(netLayer, netBox.x - 12, netBox.y - 12, netBox.w + 24, netBox.h + 24)
      ctx.globalAlpha = 1
    }
    // forward-pass pulses on the stronger edges
    if (!small && build >= 1) {
      const wave = fract(t / 1.8)
      const l = Math.min(2, Math.floor(wave * 3))
      const u = ease.inOutSine(wave * 3 - l)
      for (let sign = 0; sign < 2; sign++) {
        ctx.beginPath()
        for (let i = 0; i < LAYERS[l]; i++)
          for (let j = 0; j < LAYERS[l + 1]; j++) {
            const w = net.w(l, i, j)
            if ((w >= 0 ? 0 : 1) !== sign || Math.abs(w) < 0.9) continue
            const A = nodes[l][i]
            const B = nodes[l + 1][j]
            const px = lerp(A.x + nodeR, B.x - nodeR, u)
            const py = lerp(A.y, B.y, u)
            ctx.moveTo(px + 1.6, py)
            ctx.arc(px, py, 1.6, 0, TAU)
          }
        ctx.fillStyle = rgba(sign ? C.fern : C.ocean, 0.9 * alpha)
        ctx.fill()
      }
    }
    // nodes
    for (let l = 0; l < LAYERS.length; l++) {
      for (let i = 0; i < LAYERS[l]; i++) {
        const n = nodes[l][i]
        const a = clamp(acts[l][i], -1, 1)
        const np = ease.outBack(clamp(build * 3 - l + 0.3))
        if (np <= 0) continue
        const r = nodeR * (l === 3 ? 1.5 : l === 0 ? 1.25 : 1) * np
        ctx.globalAlpha = alpha
        ctx.fillStyle = C.paper
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, TAU)
        ctx.fill()
        if (l === 3) {
          ctx.fillStyle = mixHex(C.ocean, C.moss, p)
          ctx.beginPath()
          ctx.arc(n.x, n.y, r * 0.72, 0, TAU)
          ctx.fill()
        } else if (Math.abs(a) > 0.02) {
          ctx.fillStyle = a >= 0 ? C.ocean : C.fern
          ctx.beginPath()
          ctx.arc(n.x, n.y, r * 0.78 * Math.sqrt(Math.abs(a)), 0, TAU)
          ctx.fill()
        }
        ctx.strokeStyle = C.ink
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, TAU)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }
    if (small) return
    // labels
    ctx.globalAlpha = alpha
    const labY = netBox.y + netBox.h + 2
    const names = ['INPUT · 2', 'TANH · 12', 'TANH · 12', 'σ · 1']
    for (let l = 0; l < LAYERS.length; l++) text(ctx, names[l], nodes[l][0].x, labY, { size: 8.5, color: k.muted, align: 'center', tracking: 0.14 })
    text(ctx, 'x₁', nodes[0][0].x - nodeR * 1.25 - 6, nodes[0][0].y + 4, { font: 'serif', size: 14, italic: true, color: k.ink2, align: 'right' })
    text(ctx, 'x₂', nodes[0][1].x - nodeR * 1.25 - 6, nodes[0][1].y + 4, { font: 'serif', size: 14, italic: true, color: k.ink2, align: 'right' })
    ctx.globalAlpha = alpha * clamp(build * 3 - 2.4)
    text(ctx, `p ${p.toFixed(2)}`, nodes[3][0].x + nodeR * 1.5 + 8, nodes[3][0].y + 3.5, { size: 9, color: k.ink, tracking: 0.06 })
    ctx.globalAlpha = alpha
    // legend for the edges
    const ly = netBox.y - 8
    text(ctx, '+w', netBox.x + netBox.w - 70, ly, { size: 8.5, color: C.ocean, tracking: 0.1 })
    text(ctx, '−w', netBox.x + netBox.w - 34, ly, { size: 8.5, color: C.fern, tracking: 0.1 })
    text(ctx, `${NP} PARAMETERS`, netBox.x, ly, { size: 8.5, color: k.muted, tracking: 0.14 })
    ctx.globalAlpha = 1
  }

  function drawChart(alpha: number) {
    const k = inkOn('paper')
    const { x, y, w, h } = chart
    if (alpha <= 0 || w < 40) return
    ctx.globalAlpha = alpha
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + 0.5, y)
    ctx.lineTo(Math.round(x) + 0.5, Math.round(y + h) + 0.5)
    ctx.lineTo(x + w, Math.round(y + h) + 0.5)
    ctx.stroke()
    // accuracy ruler at 98 %
    const ay = (v: number) => y + h - v * h
    ctx.strokeStyle = rgba(C.moss, 0.35)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(x, Math.round(ay(0.98)) + 0.5)
    ctx.lineTo(x + w, Math.round(ay(0.98)) + 0.5)
    ctx.stroke()
    ctx.setLineDash([])
    if (histN > 1) {
      const lo = -1.5
      const hi = 0.1
      const ly = (v: number) => y + h - clamp((Math.log10(Math.max(1e-4, v)) - lo) / (hi - lo)) * h
      const X = (i: number) => x + (i / Math.max(1, histN - 1)) * w
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.moveTo(X(0), ly(histLoss[0]))
      for (let i = 1; i < histN; i++) ctx.lineTo(X(i), ly(histLoss[i]))
      ctx.stroke()
      ctx.strokeStyle = C.moss
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(X(0), ay(histAcc[0]))
      for (let i = 1; i < histN; i++) ctx.lineTo(X(i), ay(histAcc[i]))
      ctx.stroke()
    }
    if (!small) {
      text(ctx, 'LOSS · LOG', x, y - 6, { size: 8.5, color: k.ink2, tracking: 0.14 })
      text(ctx, 'ACCURACY', x + 80, y - 6, { size: 8.5, color: C.moss, tracking: 0.14 })
      text(ctx, '98%', x + w, ay(0.98) - 4, { size: 8, color: C.moss, align: 'right', tracking: 0.06 })
      text(ctx, '1.0', x - 6, y + h - ((0 + 1.5) / 1.6) * h + 3, { size: 8, color: k.muted, align: 'right', tracking: 0.04 })
      text(ctx, '0.03', x - 6, y + h + 3, { size: 8, color: k.muted, align: 'right', tracking: 0 })
      text(ctx, `STEP ${steps}`, x + w, y + h + 13, { size: 8.5, color: k.muted, align: 'right', tracking: 0.14 })
    }
    ctx.globalAlpha = 1
  }

  function drawReadout(alpha: number) {
    const k = inkOn('paper')
    const D = DATASETS[di]
    const epoch = Math.floor((steps * BATCH) / np)
    ctx.globalAlpha = alpha
    if (small) {
      const x = read.x
      let y = read.y
      text(ctx, D.name.toUpperCase(), x, y, { size: 8, color: k.ink, tracking: 0.12 })
      y += 12
      text(ctx, `EPOCH ${String(epoch).padStart(3, '0')}`, x, y, { size: 8, color: k.ink2, tracking: 0.1 })
      y += 12
      text(ctx, `ACC ${(acc * 100).toFixed(1)}%`, x, y, { size: 8, color: phase === 'hold' ? C.moss : k.ink2, tracking: 0.1 })
      if (paused) text(ctx, 'PAUSED', x, y + 12, { size: 8, color: k.ink2, tracking: 0.12 })
      ctx.globalAlpha = 1
      return
    }
    const x = read.x
    let y = read.y
    text(ctx, `DATASET ${di + 1} / ${DATASETS.length}`, x, y, { size: 8.5, color: k.muted, tracking: 0.14 })
    const ns = portrait ? 22 : clamp(W * 0.017, 20, 28)
    y += ns + 4
    text(ctx, D.name, x, y, { font: 'serif', size: ns, color: k.ink })
    y += 22
    const cols: [string, string][] = [
      ['EPOCH', String(epoch).padStart(4, '0')],
      ['STEP', String(steps).padStart(5, '0')],
      ['LOSS', lossEma.toFixed(4)],
      ['ACC', `${(acc * 100).toFixed(1)}%`],
    ]
    const cw = Math.min(110, read.w / 4)
    cols.forEach(([a, b], i) => {
      text(ctx, a, x + i * cw, y, { size: 8.5, color: k.muted, tracking: 0.14 })
      text(ctx, b, x + i * cw, y + 16, { size: 12, color: i === 3 && phase === 'hold' ? C.moss : k.ink, tracking: 0.04 })
    })
    y += 36
    const status =
      phase === 'enter' ? 'INITIALISE · W ~ N(0, 1/n)' : phase === 'train' && paused ? 'PAUSED · SPACE TO RESUME' : phase === 'train' ? `TRAINING · ADAM η ${D.lr} · BATCH ${BATCH}` : phase === 'hold' ? (acc >= 0.98 ? `CONVERGED AT STEP ${convergedAt}` : `STOPPED AT STEP ${convergedAt}`) : 'NEXT DATASET'
    text(ctx, status, x, y, { size: 8.5, color: phase === 'hold' ? C.moss : k.ink2, tracking: 0.14 })
    ctx.globalAlpha = 1
  }

  /** Until the viewer has tried it: a prompt over the plane and a ghost of the tap on a misclassified point. */
  function drawHint(t: number) {
    if (preview || interacted || (phase !== 'train' && phase !== 'hold')) return
    const k = inkOn('paper')
    const a = clamp((t - 2.2) / 0.5) * (phase === 'hold' ? 1 - clamp((phaseT - HOLD + 0.4) / 0.4) : 1)
    if (a <= 0) return
    const s = W < 700 ? 'TAP THE PLANE TO ADD A POINT' : 'HOVER TO PROBE THE NETWORK · CLICK TO ADD A COUNTEREXAMPLE'
    // above the plane when there is room under the formula, else on the caption line
    const above = plane.y - 12 >= pad + (small ? 44 : 60)
    if (!above) {
      // on the caption line: reserve its width so the caption shortens around it
      setFont(ctx, { size: 8.5, tracking: 0.14 })
      hintW = ctx.measureText(s).width + 16
    }
    text(ctx, s, above ? plane.x + plane.s : W - pad, above ? plane.y - 12 : Hh - pad * 0.62, { size: 8.5, color: k.ink2, align: 'right', tracking: 0.14, alpha: a })
    // the ghost tap, on the first misclassified point, during the first dataset
    if (t > 12 || phase !== 'train') return
    let target = -1
    for (let i = 0; i < np && target < 0; i++) if (wrong[i]) target = i
    if (target < 0) return
    const X = toPX(data.x[target])
    const Y = toPY(data.y[target])
    const ph = fract(t * 0.8)
    ctx.globalAlpha = a * (1 - ph)
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2.5])
    ctx.beginPath()
    ctx.arc(X, Y, 5 + 14 * ease.outCubic(ph), 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  function formula(x: number, y: number, size: number) {
    let px = x
    const put = (s: string, o: { italic?: boolean; sub?: boolean } = {}) => {
      const sz = o.sub ? size * 0.62 : size
      setFont(ctx, { font: 'serif', size: sz, italic: o.italic })
      ctx.fillStyle = C.ink
      ctx.fillText(s, px, y + (o.sub ? size * 0.2 : 0))
      px += ctx.measureText(s).width
    }
    put('p', { italic: true })
    put(' = σ(')
    put('W', { italic: true })
    put('3', { sub: true })
    put(' tanh(')
    put('W', { italic: true })
    put('2', { sub: true })
    put(' tanh(')
    put('W', { italic: true })
    put('1', { sub: true })
    put('x', { italic: true })
    put(')))')
  }

  let hintW = 0
  function frame(t: number, dt: number) {
    const k = inkOn('paper')
    lastT = t
    hintW = 0
    if (dt > 0) update(dt)
    frameNo++
    ctx.fillStyle = C.paper
    ctx.fillRect(0, 0, W, Hh)

    const enterP = phase === 'enter' ? clamp(phaseT / ENTER) : 1
    const dis = phase === 'dissolve' ? clamp(phaseT / DISSOLVE) : 0
    const fieldA = (phase === 'enter' ? ease.inOutCubic(clamp((phaseT - 0.3) / (ENTER - 0.3))) : 1) * (1 - ease.inOutCubic(dis))
    drawPlane(t, fieldA, 1, dis)
    drawNet(t, 1 - ease.inCubic(dis), phase === 'enter' ? ease.inOutCubic(enterP) : 1)
    drawChart(1 - dis * 0.7)
    drawReadout(1)
    drawHint(t)

    // chrome
    const chromeIn = ease.outCubic(clamp(t / 0.9))
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.5 * chromeIn)
    cropMarks(ctx, pad * 0.45, pad * 0.45, W - pad * 0.9, Hh - pad * 0.9, small ? 7 : 10)
    const hs = small ? 8.5 : 10
    const hy = pad + (small ? 4 : 6)
    ctx.globalAlpha = chromeIn
    ctx.strokeStyle = C.ocean
    ctx.beginPath()
    ctx.moveTo(pad, hy - 3.5)
    ctx.lineTo(pad + 18, hy - 3.5)
    ctx.stroke()
    text(ctx, 'FIG. M.03', pad + 26, hy, { size: hs, color: C.ocean, tracking: 0.14 })
    setFont(ctx, { size: hs, tracking: 0.14 })
    const figW = ctx.measureText('FIG. M.03').width
    text(ctx, small || W < 560 ? 'LEARNING' : 'A NEURAL NETWORK, TRAINED LIVE', pad + 26 + figW + hs * 0.9, hy, { size: hs, color: k.muted, tracking: 0.14 })
    const tc = `T ${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`
    text(ctx, tc, W - pad, hy, { size: hs, color: k.muted, align: 'right', tracking: 0.12 })
    if (!small) formula(pad, hy + 32, clamp(W * 0.016, 17, 24))
    else formula(pad, hy + 22, 13)
    const capY = Hh - pad * 0.62
    const cap = small ? `FIG. M.03 — ${DATASETS[di].name.toUpperCase()}` : `FIG. M.03 — MLP 2 → 12 → 12 → 1 · TANH · SIGMOID · BCE · ADAM · ${np} POINTS`
    setFont(ctx, { size: small ? 8 : 9.5, tracking: 0.14 })
    const room = W - pad * 2 - hintW
    const mid = `FIG. M.03 — MLP 2 → 12 → 12 → 1`
    const capS = ctx.measureText(cap).width < room ? cap : ctx.measureText(mid).width < room ? mid : 'FIG. M.03'
    text(ctx, capS, pad, capY, { size: small ? 8 : 9.5, color: k.muted, tracking: 0.14 })
    ctx.globalAlpha = 1
  }

  layout(env.width, env.height)
  // ?dataset=1…4 starts on that dataset (for the test route)
  startDataset(Math.min(3, Math.max(0, Math.floor(Number(env.params.get('dataset') ?? 1) - 1) || 0)))
  // test route: &probe=x,y (data coordinates) pins the probe, as hovering does
  {
    const q = env.params.get('probe')?.split(',').map(Number)
    if (q && q.length === 2 && q.every(Number.isFinite)) {
      hover = { x: clamp(q[0], -1.2, 1.2), y: clamp(q[1], -1.2, 1.2) }
      interacted = true
    }
    // &add=x,y;x,y… adds counterexamples at the start
    for (const pt of (env.params.get('add') ?? '').split(';')) {
      const v = pt.split(',').map(Number)
      if (v.length === 2 && v.every(Number.isFinite)) {
        interacted = true
        addPoint(clamp(v[0], -1.2, 1.2), clamp(v[1], -1.2, 1.2))
      }
    }
  }

  const KEYS = ['KeyN', 'KeyR', 'Space']

  return {
    resize(w, h) {
      layout(w, h)
    },
    frame,
    pointer(p) {
      if (preview) return
      const touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hover = null
        down = null
        env.setCursor('default')
        return
      }
      const at = planeAt(p.x, p.y)
      hover = touch && !p.pressed ? null : at
      env.setCursor(at ? 'crosshair' : 'default')
      if (p.type === 'down') down = { x: p.x, y: p.y }
      if (p.type === 'up') {
        if (down && at && Math.hypot(p.x - down.x, p.y - down.y) < 14 && phase !== 'enter') {
          interacted = true
          addPoint(at.x, at.y)
        }
        down = null
        if (touch) hover = null
      }
      if (at && !touch) interacted = interacted || p.type === 'move'
    },
    key(code, isDown) {
      if (!KEYS.includes(code)) return false
      if (!isDown) return true
      interacted = true
      if (code === 'KeyN') startDataset(di + 1)
      else if (code === 'KeyR') retrain()
      else paused = !paused
      return true
    },
  }
}

export default create
