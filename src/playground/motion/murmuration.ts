/*
 * MURMURATION — starlings over a reed bed at dusk.
 *
 * A 3D flock of boids (separation, alignment, cohesion on a spatial hash of
 * the nearest dozen neighbours, plus a soft wandering attractor) projected
 * onto the sky, so the flock's sheets read as dark folds where they turn
 * edge-on. Each bird is a hairline chevron that flickers with its wingbeat.
 * Every few seconds a peregrine stoops through the flock: the birds nearest
 * it flash outward and the escape turn travels through the flock as a wave
 * (an excitable medium: fuse, fire, refractory).
 *
 * In the viewer the pointer is a hawk: the flock parts around it and the
 * alarm spreads from wherever it hunts. A tap sends the falcon down through
 * that spot. Until the viewer moves, a ghost hawk demonstrates.
 */

import { C, TAU, clamp, cropMarks, damp, ease, ground, hud, lerp, makeNoise, rgba, rng, setFont, smoothstep, text } from '../kit'
import type { CreatePiece } from '../types'

const FIG = 'FIG. M.09'
/** seconds of flight simulated before t = 0, so the first frame already has a formed flock */
const WARM = 4
/** the falcon stoops at FIRST, FIRST + PERIOD, … (piece time); later in the viewer, after the ghost demo */
const FIRST_PREVIEW = 3.2
const FIRST_FULL = 6.2
const PERIOD = 10.5
/** the ghost hawk's demonstration, full mode only, until the viewer moves */
const GHOST_FROM = 0.8
const GHOST_TO = 4.8
const DIVE = 3.4
/** world units → metres, for the annotations */
const M_PER_UNIT = 0.1

const HASH = 8192
const MASK = HASH - 1
const TRAIL = 40

/** the 27 neighbouring cells, centre first, then faces, edges and corners, alternating sides */
const OFFS = (() => {
  const list: number[][] = []
  for (let z = -1; z <= 1; z++) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) list.push([x, y, z])
  list.sort((a, b) => a[0] * a[0] + a[1] * a[1] + a[2] * a[2] - (b[0] * b[0] + b[1] * b[1] + b[2] * b[2]) || (a[0] + a[1] + a[2] > 0 ? 1 : -1))
  return Int8Array.from(list.flat())
})()

const hash3 = (x: number, y: number, z: number) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & MASK

interface Reed {
  x: number
  h: number
  seed: number
  back: boolean
  leaves: number
}


/*
 * Wait briefly for the web fonts before the first frame, so even a frozen
 * test frame is set in the real faces (on the Playground page they are
 * already loaded and this resolves at once). Never blocks for long.
 */
if (typeof document !== 'undefined' && document.fonts) {
  await Promise.race([
    Promise.all([document.fonts.load('500 12px "Geist Mono"')]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined)
}

const create: CreatePiece = (env) => {
  const { ctx } = env
  const preview = env.mode === 'preview'
  const N = preview ? 560 : 2500
  const spread = Math.cbrt(2500 / N)
  const R = 26 * spread
  const R2 = R * R
  const RS = 8 * spread
  const RS2 = RS * RS
  const K = 20
  const VMIN = 105
  const VMAX = 185
  const REFR = 1.9
  const noise = makeNoise(9)

  // --- flock state (typed arrays, no per-frame allocation)
  const px = new Float32Array(N)
  const py = new Float32Array(N)
  const pz = new Float32Array(N)
  const vx = new Float32Array(N)
  const vy = new Float32Array(N)
  const vz = new Float32Array(N)
  const ax = new Float32Array(N)
  const ay = new Float32Array(N)
  const az = new Float32Array(N)
  const wave = new Float32Array(N)
  const refr = new Float32Array(N)
  const fuse = new Float32Array(N).fill(-1)
  const ex = new Float32Array(N)
  const ey = new Float32Array(N)
  const ez = new Float32Array(N)
  const phase = new Float32Array(N)
  const flap = new Float32Array(N)
  const jitter = new Float32Array(N)
  const bin = new Uint8Array(N)
  const sx = new Float32Array(N)
  const sy = new Float32Array(N)
  const cellOf = new Int32Array(N)
  const start = new Int32Array(HASH + 1)
  const fill = new Int32Array(HASH)
  const sorted = new Int32Array(N)
  const rose = new Float32Array(24)

  // --- layout (CSS px) and world mapping
  let w = 1
  let h = 1
  let hy = 1 // horizon
  let s = 1 // px per world unit
  let scx = 0
  let scy = 0
  let halfW = 700
  let skyTop = -300
  let skyBot = 300
  let portrait = false
  let reeds: Reed[] = []
  let trees: Float32Array = new Float32Array(0)

  // --- stats
  let phi = 0
  let meanN = 0
  let heading = 0
  let excited = 0

  // --- falcon
  const fal = { x: 0, y: 0, z: 0, vx: 0, vy: 0, speed: 0, active: false, k: -1, u: 0 }
  const dive = { sx: 0, sy: 0, c1x: 0, c1y: 0, c2x: 0, c2y: 0, ex: 0, ey: 0, z: 0 }
  const trailX = new Float32Array(TRAIL)
  const trailY = new Float32Array(TRAIL)
  let trailN = 0
  let simT = -WARM
  // dives are scheduled, or requested by the viewer (a tap: a point; a key: the flock)
  let nextDive = preview ? FIRST_PREVIEW : FIRST_FULL
  let diveT0 = -1
  let diveCount = 0
  let pending: { x: number; y: number } | 'flock' | null = null
  let alarmX = 0
  // the viewer's hawk: screen position, fade, and its world position for the sim
  const hawk = { x: 0, y: 0, on: false, press: false, a: 0, dx: -0.7, dy: 0.7, wx: 0, wy: 0, touch: false, ghost: false }
  let acted = false
  let downAt: { x: number; y: number; ms: number } | null = null
  // flock centroid (world), for the ghost's path
  let fcx = 0
  let fcy = 0
  // short frames (a phone on its side) condense the annotation
  let short = false
  let narrow = false
  let long = false
  let tiny = false
  let m = 18
  let hudBottom = 60
  const box = { x: 0, y: 0, z: 0, a: 300, b: 80, c: 220, ca: 1, sa: 0, ct: 1, st: 0, bend: 0, twist: 0 }

  function layout() {
    portrait = h > w * 1.1
    narrow = w < 640
    short = !preview && h < 380
    long = !preview && !portrait && !short && !narrow
    tiny = !preview && h < 260
    m = preview || short ? 12 : Math.max(18, Math.min(w, h) * 0.035)
    hudBottom = m + (preview ? 30 : tiny ? 36 : short ? 40 : 48)
    hy = Math.round(h * (portrait ? 0.8 : short ? 0.8 : 0.765))
    s = portrait ? w / 820 : Math.min(w / 1400, h / (short ? 600 : 800))
    scx = w / 2
    scy = hy * (portrait ? 0.5 : 0.47)
    halfW = w / 2 / s
    skyTop = -scy / s
    skyBot = (hy - scy) / s

    // reed bed: a dense stand on the right, a few stragglers on the left; open water under the caption
    const r = rng(77)
    reeds = []
    // the reed bed starts clear of the caption, which sits over open water
    setFont(ctx, { size: short || preview ? 8.5 : 9.5, tracking: 0.14 })
    const capW = ctx.measureText(long ? `${FIG} — MURMURATION · STURNUS VULGARIS AT DUSK` : `${FIG} — MURMURATION`).width
    const bedFrom = clamp((m + 4 + capW + 18) / w, preview ? 0.44 : 0.36, 0.62)
    const count = preview ? 50 : portrait ? 70 : 115
    for (let i = 0; i < count; i++) {
      const u = r()
      const x = portrait ? lerp(0.56, 1.04, Math.pow(u, 0.8)) : lerp(bedFrom, 1.03, Math.pow(u, 0.75))
      reeds.push({ x: x * w, h: (h - hy) * (0.45 + 0.7 * Math.pow(r(), 1.4)) * (0.8 + 0.35 * u), seed: r() * 100, back: false, leaves: r() < 0.55 ? 2 : 1 })
    }
    const backN = preview ? 40 : portrait ? 45 : 90
    for (let i = 0; i < backN; i++) {
      const u = r()
      // clumps along the far bank
      const x = lerp(portrait ? 0.4 : 0.3, 1.0, Math.pow(u, 0.6)) + (noise.n2(u * 9, 2) * 0.03)
      const clump = 0.5 + 0.5 * noise.n2(x * 7, 5)
      if (clump < 0.3) continue
      reeds.push({ x: x * w, h: (h - hy) * (0.08 + 0.2 * clump * r()), seed: r() * 100, back: true, leaves: r() < 0.5 ? 1 : 0 })
    }
    // distant tree line: a height per 2px column, zero where there are no trees
    const cols = Math.ceil(w / 2) + 1
    trees = new Float32Array(cols)
    const th = Math.max(8, h * 0.034)
    for (let c = 0; c < cols; c++) {
      const x = (c * 2) / w
      const clumpA = smoothstep(0.0, 0.02, x) * (1 - smoothstep(0.24, 0.33, x))
      const clumpB = smoothstep(0.86, 0.9, x) * (1 - smoothstep(0.985, 1.0, x)) * 0.7
      const k = Math.max(clumpA, clumpB)
      if (k <= 0) continue
      const crown = 0.55 + 0.3 * noise.fbm2(c * 0.035, 3.1, 3) + 0.25 * Math.abs(Math.sin(c * 0.16 + noise.n2(c * 0.01, 0) * 3))
      trees[c] = th * k * clamp(crown, 0.15, 1.3)
    }
  }

  /**
   * The flock's envelope: a soft, bent, rotating pancake that drifts around
   * the sky. Turning it edge-on to the viewer packs the birds into a dark
   * band; face-on it opens into a pale veil. Birds outside it are steered back.
   */
  function setTarget(ts: number) {
    const a = 205 * spread * (1 + 0.2 * Math.sin(ts * 0.21 + 0.5))
    const b = 62 * spread * (1 + 0.45 * Math.sin(ts * 0.27 + 2.0))
    const c = 150 * spread * (1 + 0.2 * Math.sin(ts * 0.17 + 4.1))
    const reach = Math.max(0, halfW - a * 1.05 - 40)
    const vh = (skyBot - skyTop) / 2
    const reachY = Math.max(0, vh - a * 0.65 - 60) * 0.7
    const midY = (skyTop + skyBot) / 2 - vh * 0.02
    box.x = reach * 0.8 * (0.7 * Math.sin(ts * 0.11 + 0.6) + 0.3 * Math.sin(ts * 0.29 + 2.1))
    box.y = midY + reachY * 0.75 * (0.65 * Math.sin(ts * 0.13 + 1.7) + 0.35 * Math.sin(ts * 0.37 + 0.4))
    box.z = 0
    box.a = a
    box.b = b
    box.c = c
    const alpha = 0.42 * Math.sin(ts * 0.09 + 1) + 0.18 * Math.sin(ts * 0.23)
    const theta = ts * 0.16 + 0.8 * Math.sin(ts * 0.07)
    box.ca = Math.cos(alpha)
    box.sa = Math.sin(alpha)
    box.ct = Math.cos(theta)
    box.st = Math.sin(theta)
    box.bend = 0.9 * Math.sin(ts * 0.19 + 0.3)
    box.twist = 0.7 * Math.sin(ts * 0.13 + 2.2)
  }

  function seed() {
    const r = rng(2024)
    setTarget(-WARM)
    for (let i = 0; i < N; i++) {
      const a = r() * TAU
      const b = Math.acos(2 * r() - 1)
      const rad = Math.cbrt(r())
      px[i] = box.x + Math.sin(b) * Math.cos(a) * rad * box.a
      py[i] = box.y + Math.cos(b) * rad * box.b
      pz[i] = Math.sin(b) * Math.sin(a) * rad * box.c
      vx[i] = 140 + r() * 20
      vy[i] = (r() - 0.5) * 30
      vz[i] = (r() - 0.5) * 30
      phase[i] = r() * TAU
      flap[i] = 11 + r() * 6
      jitter[i] = r()
    }
  }

  /**
   * Falcon path for dive k: an off-screen start high on one side, through the
   * flock (or through the point the viewer tapped), out low on the other.
   */
  function planDive(k: number, at: { x: number; y: number } | null) {
    let cx = 0
    let cy = 0
    let cz = 0
    for (let i = 0; i < N; i++) {
      cx += px[i]
      cy += py[i]
      cz += pz[i]
    }
    cx = lerp(cx / N, box.x, 0.5)
    cy = lerp(cy / N, box.y, 0.5)
    cz /= N
    if (at) {
      cx = at.x
      cy = at.y
    }
    const side = at ? (at.x > 0 ? -1 : 1) : k % 2 === 0 ? 1 : -1
    const reachX = halfW + 120
    dive.sx = side * reachX * 0.85
    dive.sy = skyTop - 160
    dive.c1x = lerp(dive.sx, cx, 0.7)
    dive.c1y = cy - 140
    dive.c2x = cx - side * 160
    dive.c2y = cy + 170
    dive.ex = -side * reachX
    dive.ey = cy - 40
    dive.z = cz
  }

  function bez(a: number, b: number, c: number, d: number, u: number) {
    const v = 1 - u
    return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d
  }

  function startDive(at: { x: number; y: number } | null) {
    planDive(diveCount++, at)
    diveT0 = simT
    trailN = 0
    fal.active = false
    if (simT > 0.05) env.sfx.noise(1.8, { filter: 380, to: 2200, q: 0.8, gain: 0.05, room: 0.3 })
  }

  function updateFalcon(ts: number, dt: number) {
    if (diveT0 >= 0 && ts - diveT0 > DIVE) diveT0 = -1
    if (diveT0 < 0) {
      if (pending) {
        startDive(pending === 'flock' ? null : pending)
        pending = null
        nextDive = ts + PERIOD
      } else if (ts >= nextDive) {
        startDive(null)
        nextDive += PERIOD
      }
    }
    const local = ts - diveT0
    if (diveT0 >= 0 && local <= DIVE) {
      const u = ease.inOutSine(local / DIVE) * 0.8 + (local / DIVE) * 0.2
      const x = bez(dive.sx, dive.c1x, dive.c2x, dive.ex, u)
      const y = bez(dive.sy, dive.c1y, dive.c2y, dive.ey, u)
      if (fal.active && dt > 0) {
        fal.vx = x - fal.x
        fal.vy = y - fal.y
        fal.speed = Math.hypot(fal.vx, fal.vy) / dt
      } else {
        fal.vx = dive.c1x - dive.sx
        fal.vy = dive.c1y - dive.sy
      }
      fal.x = x
      fal.y = y
      fal.z = dive.z
      fal.u = local / DIVE
      fal.active = true
    } else fal.active = false
  }

  function step(dt: number) {
    simT += dt
    setTarget(simT)
    updateFalcon(simT, dt)

    // --- spatial hash (counting sort into buckets)
    start.fill(0)
    for (let i = 0; i < N; i++) {
      const hsh = hash3(Math.floor(px[i] / R), Math.floor(py[i] / R), Math.floor(pz[i] / R))
      cellOf[i] = hsh
      start[hsh + 1]++
    }
    for (let b = 0; b < HASH; b++) {
      start[b + 1] += start[b]
      fill[b] = start[b]
    }
    for (let i = 0; i < N; i++) sorted[fill[cellOf[i]]++] = i

    const RF = 105 * spread
    const RF2 = RF * RF
    const RH = (hawk.press ? 105 : 78) * spread * (hawk.touch ? 1.15 : 1)
    const RH2 = RH * RH
    alarmX = fal.active ? fal.x : hawk.a > 0.02 ? hawk.wx : alarmX
    let nSum = 0
    const decay = Math.exp(-dt * 3.4)
    const nt = simT * 0.08
    for (let i = 0; i < N; i++) {
      const x = px[i]
      const y = py[i]
      const z = pz[i]
      const ix = Math.floor(x / R)
      const iy = Math.floor(y / R)
      const iz = Math.floor(z / R)
      let n = 0
      let avx = 0
      let avy = 0
      let avz = 0
      let cx = 0
      let cy = 0
      let cz = 0
      let sx2 = 0
      let sy2 = 0
      let sz2 = 0
      let maxw = 0
      // nearest cells first, so the neighbour cap never biases the flock to one side
      outer: for (let o = 0; o < 81; o += 3) {
            const hh = hash3(ix + OFFS[o], iy + OFFS[o + 1], iz + OFFS[o + 2])
            const e = start[hh + 1]
            for (let q = start[hh]; q < e; q++) {
              const j = sorted[q]
              if (j === i) continue
              const ddx = px[j] - x
              const ddy = py[j] - y
              const ddz = pz[j] - z
              const d2 = ddx * ddx + ddy * ddy + ddz * ddz
              if (d2 >= R2) continue
              n++
              avx += vx[j]
              avy += vy[j]
              avz += vz[j]
              cx += ddx
              cy += ddy
              cz += ddz
              if (d2 < RS2) {
                const k = 1 / (d2 + 4)
                sx2 -= ddx * k
                sy2 -= ddy * k
                sz2 -= ddz * k
              }
              if (wave[j] > maxw) maxw = wave[j]
              if (n >= K) break outer
            }
          }
      nSum += n
      let fx = 0
      let fy = 0
      let fz = 0
      if (n > 0) {
        const inv = 1 / n
        fx += (avx * inv - vx[i]) * 1.6 + cx * inv * 1.0 + sx2 * 1200
        fy += (avy * inv - vy[i]) * 1.6 + cy * inv * 1.0 + sy2 * 1200
        fz += (avz * inv - vz[i]) * 1.6 + cz * inv * 1.0 + sz2 * 1200
      }
      // the envelope: steer back into the bent, rotating pancake
      {
        const dx = x - box.x
        const dy = y - box.y
        const dz = z - box.z
        const u1 = dx * box.ca + dy * box.sa
        const v1 = -dx * box.sa + dy * box.ca
        const v2 = v1 * box.ct + dz * box.st
        const w2 = -v1 * box.st + dz * box.ct
        const un = u1 / box.a
        const v3 = v2 - box.b * un * un * (box.bend * 1.8 + box.twist * un * 1.5)
        const q = Math.sqrt(un * un + (v3 / box.b) * (v3 / box.b) + (w2 / box.c) * (w2 / box.c))
        {
          let gu = un / box.a
          let gv = v3 / (box.b * box.b)
          let gw = w2 / (box.c * box.c)
          const gl = Math.sqrt(gu * gu + gv * gv + gw * gw) + 1e-9
          // a gentle harmonic pull inside, a firm wall outside
          const k = -(55 * q + (q > 0.85 ? Math.min(q - 0.85, 0.9) * 560 : 0)) / gl
          gu *= k
          gv *= k
          gw *= k
          const vb = gv * box.ct - gw * box.st
          fx += gu * box.ca - vb * box.sa
          fy += gu * box.sa + vb * box.ca
          fz += gv * box.st + gw * box.ct
        }
      }
      // a slow, divergence-free breeze (cheap trig stream function) folds the sheet
      fx += Math.sin(y * 0.011 + nt * 3.1) * 26
      fy += Math.sin(x * 0.009 - nt * 2.3) * 20
      fz += Math.sin(x * 0.007 + y * 0.005 + nt * 1.7) * 26
      // stay in the sky
      const floor = skyBot - 40
      if (y > floor) fy -= (y - floor) * 6
      const ceil = (hudBottom + (portrait ? 70 : 40) - scy) / s
      if (y < ceil) fy += (ceil - y) * 4
      if (x > halfW + 60) fx -= (x - halfW - 60) * 2
      if (x < -halfW - 60) fx += (-halfW - 60 - x) * 2

      // the falcon: flee, and light the fuse of the escape wave
      if (fal.active) {
        const ddx = x - fal.x
        const ddy = y - fal.y
        const ddz = z - fal.z
        const d2 = ddx * ddx + ddy * ddy + ddz * ddz
        if (d2 < RF2) {
          const d = Math.sqrt(d2) + 1e-3
          const k = (1 - d / RF) * 2600
          fx += (ddx / d) * k
          fy += (ddy / d) * k
          fz += (ddz / d) * k
          if (refr[i] <= 0) {
            wave[i] = 1
            refr[i] = REFR
            ex[i] = ddx / d
            ey[i] = ddy / d
            ez[i] = ddz / d
            fuse[i] = -1
          }
        }
      }
      // the viewer's hawk: a column of fear through the flock (it hunts in the picture plane)
      if (hawk.a > 0.02) {
        const ddx = x - hawk.wx
        const ddy = y - hawk.wy
        const d2 = ddx * ddx + ddy * ddy
        if (d2 < RH2) {
          const d = Math.sqrt(d2) + 1e-3
          const k = (1 - d / RH) * 2300 * hawk.a
          fx += (ddx / d) * k
          fy += (ddy / d) * k
          if (refr[i] <= 0 && d < RH * 0.75) {
            wave[i] = 1
            refr[i] = REFR
            ex[i] = ddx / d
            ey[i] = ddy / d
            ez[i] = 0
            fuse[i] = -1
          }
        }
      }
      // the wave: excitable medium (fuse → fire → refractory)
      if (fuse[i] >= 0) {
        fuse[i] -= dt
        if (fuse[i] < 0) {
          wave[i] = 1
          refr[i] = REFR
          // turn away from where the alarm came from: keep heading, bank sideways
          const vl = Math.hypot(vx[i], vy[i]) + 1e-3
          const sgn = alarmX < x ? 1 : -1
          ex[i] = (-vy[i] / vl) * sgn * 0.6 + sgn * 0.4
          ey[i] = (vx[i] / vl) * sgn * 0.6 - 0.2
          ez[i] = 0
        }
      } else if (refr[i] <= 0 && maxw > 0.5) fuse[i] = 0.05 + jitter[i] * 0.05
      if (wave[i] > 0.02) {
        const k = wave[i] * 420
        fx += ex[i] * k
        fy += ey[i] * k
        fz += ez[i] * k
      }
      ax[i] = fx
      ay[i] = fy
      az[i] = fz
    }
    meanN = nSum / N

    // integrate
    let ux = 0
    let uy = 0
    let uz = 0
    let sumX = 0
    let sumY = 0
    excited = 0
    for (let i = 0; i < N; i++) {
      let nvx = vx[i] + ax[i] * dt
      let nvy = vy[i] + ay[i] * dt
      let nvz = vz[i] + az[i] * dt
      const sp = Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz) + 1e-6
      const vmax = VMAX * (1 + wave[i] * 0.45)
      const cl = sp > vmax ? vmax / sp : sp < VMIN ? VMIN / sp : 1
      nvx *= cl
      nvy *= cl
      nvz *= cl
      vx[i] = nvx
      vy[i] = nvy
      vz[i] = nvz
      px[i] += nvx * dt
      py[i] += nvy * dt
      pz[i] += nvz * dt
      sumX += px[i]
      sumY += py[i]
      const inv = 1 / (sp * cl)
      ux += nvx * inv
      uy += nvy * inv
      uz += nvz * inv
      phase[i] += dt * flap[i] * (1 + wave[i] * 0.8)
      wave[i] *= decay
      refr[i] -= dt
      if (wave[i] > 0.25) excited++
    }
    phi = Math.sqrt(ux * ux + uy * uy + uz * uz) / N
    fcx = sumX / N
    fcy = sumY / N
    heading = Math.atan2(uy, ux)

    if (fal.active) {
      if (trailN < TRAIL) trailN++
      for (let k = trailN - 1; k > 0; k--) {
        trailX[k] = trailX[k - 1]
        trailY[k] = trailY[k - 1]
      }
      trailX[0] = fal.x
      trailY[0] = fal.y
    }
  }

  seed()
  // warm-up flight (not drawn)
  for (let k = 0; k < WARM * 30; k++) step(1 / 30)
  simT = 0

  /* ---------------------------------------------------------------- drawing */

  const D = 1900
  const proj = (x: number, y: number, z: number) => {
    const f = D / (D - z)
    return [scx + x * s * f, scy + y * s * f, f] as const
  }

  function drawSky(t: number) {
    ground(ctx, w, h, 'paper')
    const g = ctx.createLinearGradient(0, 0, 0, hy)
    g.addColorStop(0, rgba(C.sky, 0.05))
    g.addColorStop(0.45, rgba(C.sky, 0))
    g.addColorStop(0.8, rgba(C.sage, 0.1))
    g.addColorStop(1, rgba(C.sage, 0.28))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, hy)
    const g2 = ctx.createLinearGradient(0, hy, 0, h)
    g2.addColorStop(0, rgba(C.sage, 0.16))
    g2.addColorStop(1, rgba(C.sage, 0.02))
    ctx.fillStyle = g2
    ctx.fillRect(0, hy, w, h - hy)

    // the setting sun: a hairline disc with striations, sinking slowly
    const rs = Math.min(w, h) * (portrait ? 0.07 : 0.06)
    const sunX = w * (portrait ? 0.24 : 0.27)
    const sunY = hy - rs * (0.5 - 0.0025 * (t % 120))
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w, hy)
    ctx.clip()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.32)
    ctx.beginPath()
    ctx.arc(sunX, sunY, rs, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.2)
    ctx.beginPath()
    for (let k = 1; k <= 7; k++) {
      const dy = rs * (1 - Math.pow(k / 8, 1.6))
      const yy = sunY + dy
      const half = Math.sqrt(Math.max(0, rs * rs - dy * dy))
      ctx.moveTo(sunX - half, yy)
      ctx.lineTo(sunX + half, yy)
    }
    ctx.stroke()
    ctx.restore()
    // its reflection: broken strokes on the water
    ctx.strokeStyle = rgba(C.ink, 0.2)
    ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      const yy = hy + 5 + k * k * 1.6 + k * 3
      const half = rs * (0.85 - k * 0.12) * (0.8 + 0.2 * noise.n2(k * 3.1, t * 0.6))
      const off = noise.n2(k * 1.7, t * 0.4) * 6
      ctx.moveTo(sunX - half + off, yy)
      ctx.lineTo(sunX - half * 0.25 + off, yy)
      ctx.moveTo(sunX + half * 0.1 + off, yy)
      ctx.lineTo(sunX + half + off, yy)
    }
    ctx.stroke()

    // distant tree line: hatched silhouette
    ctx.strokeStyle = rgba(C.ink, 0.2)
    ctx.beginPath()
    for (let c = 0; c < trees.length; c++) {
      const v = trees[c]
      if (v <= 0.5) continue
      ctx.moveTo(c * 2 + 0.5, hy)
      ctx.lineTo(c * 2 + 0.5, hy - v)
    }
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.5)
    ctx.beginPath()
    let pen = false
    for (let c = 0; c < trees.length; c++) {
      const v = trees[c]
      if (v <= 0.5) {
        pen = false
        continue
      }
      if (!pen) ctx.moveTo(c * 2, hy)
      ctx.lineTo(c * 2, hy - v)
      pen = true
    }
    ctx.stroke()

    // horizon
    ctx.strokeStyle = rgba(C.ink, 0.62)
    ctx.beginPath()
    ctx.moveTo(0, hy + 0.5)
    ctx.lineTo(w, hy + 0.5)
    ctx.stroke()
    // water: a few broken lines
    ctx.strokeStyle = rgba(C.ink, 0.14)
    ctx.beginPath()
    const rows = 7
    for (let k = 0; k < rows; k++) {
      const yy = Math.round(hy + 8 + Math.pow(k / rows, 1.5) * (h - hy) * 0.8) + 0.5
      const seg = 30 + k * 18
      for (let x0 = -((t * (6 + k * 2)) % (seg * 2)); x0 < w; x0 += seg * 2) {
        const n = noise.n2(x0 * 0.01 + k * 9, k)
        if (n < -0.25) continue
        ctx.moveTo(x0, yy)
        ctx.lineTo(x0 + seg * (0.4 + 0.5 * (n + 1) * 0.5), yy)
      }
    }
    ctx.stroke()
  }

  function drawReeds(t: number) {
    const gust = 0.5 + 0.5 * noise.n2(t * 0.12, 4.2)
    for (const backPass of [true, false]) {
      ctx.strokeStyle = backPass ? rgba(C.ink, 0.26) : rgba(C.ink, 0.5)
      ctx.lineWidth = 1
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (const rd of reeds) {
        if (rd.back !== backPass) continue
        const baseY = rd.back ? hy + 3 + (rd.seed % 1) * 6 : h + 6
        const sway = noise.n3(rd.x * 0.0035 - t * 0.32, rd.seed * 0.01, t * 0.07)
        const lean = (0.05 + 0.1 * gust + 0.09 * sway) * rd.h
        const tipX = rd.x + lean
        const tipY = baseY - rd.h + Math.abs(lean) * 0.18
        const cx = rd.x + lean * 0.25
        const cy = baseY - rd.h * 0.62
        ctx.moveTo(rd.x, baseY)
        ctx.quadraticCurveTo(cx, cy, tipX, tipY)
        // plume: a drooping feather downwind
        const pl = rd.back ? rd.h * 0.22 : Math.min(18, rd.h * 0.1) * (preview ? 0.8 : 1)
        const ang = 1.15 - 0.5 * (gust * 0.6 + sway * 0.4)
        for (let f = -1; f <= 1; f++) {
          const fa = ang + f * 0.32
          const fl = pl * (1 - Math.abs(f) * 0.25)
          ctx.moveTo(tipX, tipY)
          ctx.quadraticCurveTo(tipX + Math.cos(fa - 0.5) * fl * 0.5, tipY + Math.sin(fa - 0.5) * fl * 0.5, tipX + Math.cos(fa) * fl, tipY + Math.sin(fa) * fl)
        }
        // leaves: long blades rising out and arching downwind
        for (let l = 0; l < rd.leaves; l++) {
          const at = l === 0 ? 0.42 : 0.66
          const mx = lerp(rd.x, tipX, at * at)
          const my = lerp(baseY, tipY, at)
          const side = l === 0 ? 1 : -0.7
          const len = rd.h * (rd.back ? 0.35 : 0.26)
          ctx.moveTo(mx, my)
          ctx.quadraticCurveTo(mx + side * len * 0.12 + lean * 0.15, my - len * 0.7, mx + side * len * 0.55 + lean * 0.6, my - len * 0.55)
        }
      }
      ctx.stroke()
    }
    ctx.lineCap = 'butt'
  }

  function drawFlock() {
    rose.fill(0)
    const L0 = (1.3 + 1.0 * Math.sqrt(s)) * (preview ? 1.1 : 1)
    for (let i = 0; i < N; i++) {
      const [X, Y, f] = proj(px[i], py[i], pz[i])
      sx[i] = X
      sy[i] = Y
      bin[i] = wave[i] > 0.22 ? 3 : f < 0.965 ? 0 : f < 1.035 ? 1 : 2
      const a = Math.atan2(vy[i], vx[i])
      rose[Math.floor(((a + Math.PI) / TAU) * 24) % 24]++
    }
    const styles = [rgba(C.ink, 0.5), rgba(C.ink, 0.72), rgba(C.ink, 0.9), rgba(C.ink, 1)]
    for (let b = 0; b < 4; b++) {
      ctx.strokeStyle = styles[b]
      ctx.lineWidth = b === 3 ? 1.2 : 1
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        if (bin[i] !== b) continue
        const hx = vx[i]
        const hyv = vy[i]
        const hl = Math.hypot(hx, hyv) + 1e-6
        const sp = Math.hypot(hl, vz[i])
        const fore = hl / sp
        const ux = hx / hl
        const uy = hyv / hl
        const beta = 0.98 + 0.42 * Math.sin(phase[i])
        const L = L0 * (D / (D - pz[i])) * (1 + wave[i] * 0.7)
        const back = L * Math.cos(beta) * fore
        const side = L * Math.sin(beta)
        const X = sx[i]
        const Y = sy[i]
        ctx.moveTo(X - ux * back - uy * side, Y - uy * back + ux * side)
        ctx.lineTo(X, Y)
        ctx.lineTo(X - ux * back + uy * side, Y - uy * back - ux * side)
      }
      ctx.stroke()
    }
  }

  function drawFalcon() {
    if (!fal.active) return
    // trail
    if (trailN > 2) {
      ctx.strokeStyle = rgba(C.ocean, 0.5)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      for (let k = 0; k < trailN; k++) {
        const [X, Y] = proj(trailX[k], trailY[k], fal.z)
        if (k) ctx.lineTo(X, Y)
        else ctx.moveTo(X, Y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    const [X, Y, f] = proj(fal.x, fal.y, fal.z)
    // wings half-tucked through the stoop, spread on the pull-out
    const tuck = smoothstep(0.1, 0.45, fal.u) * (1 - smoothstep(0.6, 0.9, fal.u))
    raptor(X, Y, Math.atan2(fal.vy, fal.vx), (preview ? 0.75 : 1.05) * Math.max(0.8, Math.sqrt(s)) * f, tuck, C.ink)
    callout(X, Y)
  }

  /** a hairline raptor, heading +x before rotation: pointed, swept wings, square tail */
  function raptor(X: number, Y: number, a: number, sc: number, tuck: number, color: string) {
    const span = lerp(11, 6, tuck)
    const tip = lerp(-5, -9, tuck)
    ctx.save()
    ctx.translate(X, Y)
    ctx.rotate(a)
    ctx.scale(sc, sc)
    ctx.beginPath()
    ctx.moveTo(8, 0)
    ctx.quadraticCurveTo(6.5, -1.5, 3.5, -1.7)
    ctx.quadraticCurveTo(1.5, -span * 0.55, tip, -span)
    ctx.quadraticCurveTo(-2.4, -span * 0.4, -2.2, -1.6)
    ctx.lineTo(-7.5, -1.6)
    ctx.lineTo(-8.6, -0.6)
    ctx.lineTo(-8.6, 0.6)
    ctx.lineTo(-7.5, 1.6)
    ctx.lineTo(-2.2, 1.6)
    ctx.quadraticCurveTo(-2.4, span * 0.4, tip, span)
    ctx.quadraticCurveTo(1.5, span * 0.55, 3.5, 1.7)
    ctx.quadraticCurveTo(6.5, 1.5, 8, 0)
    ctx.closePath()
    ctx.fillStyle = C.paper
    ctx.fill()
    ctx.lineWidth = 1.2 / sc
    ctx.strokeStyle = color
    ctx.stroke()
    ctx.restore()
  }

  function callout(X: number, Y: number) {
    if (!preview && !tiny && X > 40 && X < w - 40 && Y > hudBottom + 40 && Y < hy - 20) {
      const right = X < w * 0.62
      const lx = X + (right ? 34 : -34)
      const ly = Y - 30 < 70 ? Y + 34 : Y - 30
      ctx.strokeStyle = rgba(C.ocean, 0.8)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(X + (right ? 8 : -8), Y + (ly < Y ? -6 : 6))
      ctx.lineTo(lx, ly)
      ctx.lineTo(lx + (right ? 16 : -16), ly)
      ctx.stroke()
      const tx = lx + (right ? 20 : -20)
      ctx.fillStyle = rgba(C.paper, 0.85)
      ctx.fillRect(right ? tx - 3 : tx - 132, ly - 12, 135, 27)
      const speed = fal.speed * M_PER_UNIT * 3.6
      text(ctx, 'Falco peregrinus', tx, ly - 2, { size: 9, color: C.ocean, align: right ? 'left' : 'right', upper: true, tracking: 0.14 })
      text(ctx, `STOOP ${Math.round(speed)} KM/H`, tx, ly + 10, { size: 9, color: C.muted, align: right ? 'left' : 'right', tracking: 0.14 })
    }
  }

  /** a mono label with a paper halo, legible over birds */
  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.92)
    ctx.strokeText(str, x, y)
    ctx.lineJoin = 'miter'
    text(ctx, str, x, y, o)
  }

  /** the ghost's path: a shallow arc through the flock, in screen space, u in [0, 1] */
  function ghostAt(u: number): [number, number] {
    const [cx, cy] = proj(fcx, fcy, 0)
    const R = clamp(w * 0.2, 70, 260)
    const e = ease.inOutSine(u)
    return [cx + lerp(-R, R, e), cy - R * 0.32 + Math.sin(e * Math.PI) * R * 0.5]
  }

  function updateHawk(t: number, dt: number) {
    if (preview) return
    const ghostOn = !acted && t >= GHOST_FROM && t <= GHOST_TO
    hawk.ghost = ghostOn
    if (ghostOn) {
      const u = (t - GHOST_FROM) / (GHOST_TO - GHOST_FROM)
      const [gx, gy] = ghostAt(u)
      const [nx, ny] = ghostAt(Math.min(1, u + 0.02))
      const l = Math.hypot(nx - gx, ny - gy) || 1
      hawk.dx = (nx - gx) / l
      hawk.dy = (ny - gy) / l
      hawk.x = gx
      hawk.y = gy
      hawk.a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.88, 1, u))
    } else {
      const want = hawk.on && hawk.y < hy ? 1 : 0
      hawk.a += (want - hawk.a) * damp(want ? 14 : 6, dt)
      if (hawk.a < 0.01) hawk.a = 0
    }
    hawk.wx = (hawk.x - scx) / s
    hawk.wy = (hawk.y - scy) / s
  }

  function drawHawk() {
    if (preview || hawk.a <= 0.01) return
    const rpx = (hawk.press ? 105 : 78) * spread * s * (hawk.touch ? 1.15 : 1)
    ctx.save()
    ctx.globalAlpha = hawk.a
    // the ghost's whole path, dotted
    if (hawk.ghost) {
      ctx.strokeStyle = rgba(C.ocean, 0.45)
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 4])
      ctx.beginPath()
      for (let k = 0; k <= 40; k++) {
        const [x, y] = ghostAt(k / 40)
        if (k) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    // its reach: the radius inside which the flock gives way
    ctx.strokeStyle = rgba(C.ocean, 0.55)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.arc(hawk.x, hawk.y, rpx, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    raptor(hawk.x, hawk.y, Math.atan2(hawk.dy, hawk.dx), 0.9 * Math.max(0.8, Math.sqrt(s)), hawk.press ? 0.8 : 0.2, C.ocean)
    ctx.restore()
    const lx = hawk.x + rpx * 0.74 + 6
    const ly = Math.max(hudBottom + 12, hawk.y - rpx * 0.74)
    const label = hawk.ghost ? (tiny ? 'MOVE · TAP' : 'MOVE TO HUNT · TAP TO STOOP') : tiny ? '' : hawk.press ? 'STOOP' : 'HAWK'
    if (!label) return
    setFont(ctx, { size: 9, tracking: 0.14 })
    const right = lx + ctx.measureText(label).width < w - m
    ctx.globalAlpha = hawk.a
    halo(label, right ? lx : hawk.x - rpx * 0.74 - 6, ly, { size: hawk.ghost ? 9 : 8.5, color: C.ocean, align: right ? 'left' : 'right', tracking: 0.14 })
    ctx.globalAlpha = 1
  }

  function drawChrome(t: number) {
    const k = { ink: C.ink, muted: C.muted }
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.55)
    cropMarks(ctx, m * 0.5, m * 0.5, w - m, h - m, preview ? 7 : 10)

    // readouts
    const tt = Math.max(0, t)
    const mm = Math.floor(tt / 60)
    const ss = tt - mm * 60
    const clock = `${String(mm).padStart(2, '0')}:${ss.toFixed(2).padStart(5, '0')}`
    const items = preview
      ? [
          { label: 'N', value: N.toLocaleString('en-US') },
          { label: 'T', value: clock },
        ]
      : [
          { label: 'Birds', value: N.toLocaleString('en-US') },
          { label: 'Time', value: clock },
          ...(tiny ? [] : [{ label: 'Order φ', value: phi.toFixed(3) }]),
          ...(portrait || short || narrow
            ? []
            : [
                { label: 'Neighbours', value: meanN.toFixed(1) },
                { label: 'Alarmed', value: String(excited).padStart(4, '0') },
              ]),
        ]
    const compact = preview || short
    hud(ctx, items, m + 4, m + (compact ? 10 : 12), { size: preview || tiny ? 10 : portrait || short ? 11 : 13, gap: compact ? 12 : portrait ? 14 : 22 })

    // heading rose (top right)
    const rr = preview ? 15 : tiny ? 11 : short ? 15 : portrait ? 22 : 27
    const ox = w - m - 4 - rr
    const oy = m + (compact ? 4 : 16) + rr
    ctx.strokeStyle = rgba(C.ink, 0.35)
    ctx.beginPath()
    ctx.arc(ox, oy, rr, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.14)
    ctx.beginPath()
    ctx.arc(ox, oy, rr * 0.5, 0, TAU)
    ctx.moveTo(ox - rr - 4, oy)
    ctx.lineTo(ox + rr + 4, oy)
    ctx.moveTo(ox, oy - rr - 4)
    ctx.lineTo(ox, oy + rr + 4)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.ink, 0.4)
    ctx.beginPath()
    for (let q = 0; q < 24; q++) {
      const a = (q / 24) * TAU
      const l = q % 6 === 0 ? 4 : 2
      ctx.moveTo(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr)
      ctx.lineTo(ox + Math.cos(a) * (rr - l), oy + Math.sin(a) * (rr - l))
    }
    ctx.stroke()
    let mx = 1
    for (let q = 0; q < 24; q++) mx = Math.max(mx, rose[q])
    ctx.strokeStyle = rgba(C.ink, 0.75)
    ctx.beginPath()
    for (let q = 0; q <= 24; q++) {
      const qq = q % 24
      const a = -Math.PI + ((qq + 0.5) / 24) * TAU
      const l = rr * 0.9 * Math.sqrt(rose[qq] / mx)
      const X = ox + Math.cos(a) * l
      const Y = oy + Math.sin(a) * l
      if (q) ctx.lineTo(X, Y)
      else ctx.moveTo(X, Y)
    }
    ctx.stroke()
    // mean heading needle, length = polarisation
    const nl = rr * phi
    const hx = ox + Math.cos(heading) * nl
    const hyy = oy + Math.sin(heading) * nl
    ctx.strokeStyle = C.ocean
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(hx, hyy)
    ctx.moveTo(hx + Math.cos(heading + 2.6) * 4, hyy + Math.sin(heading + 2.6) * 4)
    ctx.lineTo(hx, hyy)
    ctx.lineTo(hx + Math.cos(heading - 2.6) * 4, hyy + Math.sin(heading - 2.6) * 4)
    ctx.stroke()
    ctx.lineWidth = 1
    const deg = Math.round((((heading * 180) / Math.PI + 90) % 360 + 360) % 360)
    if (!preview) {
      if (short) text(ctx, `${String(deg).padStart(3, '0')}°`, ox - rr - 8, oy + 3.5, { size: 10, color: k.ink, align: 'right', tracking: 0.08 })
      else {
        text(ctx, 'HEADING', ox, oy - rr - 12, { size: 8.5, color: k.muted, align: 'center', tracking: 0.14 })
        text(ctx, `${String(deg).padStart(3, '0')}°`, ox, oy + rr + 18, { size: 10, color: k.ink, align: 'center', tracking: 0.08 })
      }
    }

    // altitude ruler along the left edge, from the horizon up
    if (!preview && !short) {
      const top = m + (portrait ? 64 : 76)
      const x0 = m + 4
      const step = 10 / M_PER_UNIT // 10 m
      ctx.strokeStyle = rgba(C.ink, 0.35)
      ctx.beginPath()
      let idx = 0
      for (let y = hy; y > top; y -= step * s, idx++) {
        const yy = Math.round(y) + 0.5
        ctx.moveTo(x0, yy)
        ctx.lineTo(x0 + (idx % 2 === 0 ? 7 : 4), yy)
      }
      ctx.moveTo(x0 + 0.5, hy)
      ctx.lineTo(x0 + 0.5, Math.max(top, hy - Math.floor((hy - top) / (step * s)) * step * s))
      ctx.stroke()
      idx = 0
      for (let y = hy; y > top; y -= step * s, idx++) {
        if (idx % 2 !== 0 || idx === 0) continue
        text(ctx, `${idx * 10} M`, x0 + 11, y + 3, { size: 8.5, color: k.muted, tracking: 0.12 })
      }
    }

    // caption + scale bar over the open water
    const capY = h - m - (preview || short ? 2 : 4)
    if (short) text(ctx, `${FIG} — MURMURATION`, m + 4, capY, { size: 8.5, color: k.muted, tracking: 0.14 })
    else if (!preview) {
      const bar = (20 / M_PER_UNIT) * s
      const bx = m + 4
      const by = capY - 26
      ctx.strokeStyle = rgba(C.ink, 0.6)
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + bar, by)
      for (let q = 0; q <= 4; q++) {
        ctx.moveTo(bx + (bar * q) / 4 + 0.5, by)
        ctx.lineTo(bx + (bar * q) / 4 + 0.5, by - (q % 2 === 0 ? 5 : 3))
      }
      ctx.stroke()
      text(ctx, '0', bx, by - 9, { size: 8.5, color: k.muted, align: 'center' })
      text(ctx, '20 M', bx + bar, by - 9, { size: 8.5, color: k.muted, align: 'center' })
      text(ctx, long ? `${FIG} — MURMURATION · STURNUS VULGARIS AT DUSK` : `${FIG} — MURMURATION`, m + 4, capY, { size: 9.5, color: k.muted, tracking: 0.14 })
    } else text(ctx, `${FIG} — MURMURATION`, m + 4, capY, { size: 8.5, color: k.muted, tracking: 0.14 })
  }

  return {
    resize(width, height) {
      w = width
      h = height
      layout()
    },
    pointer(p) {
      if (preview) return
      hawk.touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        hawk.on = false
        hawk.press = false
        downAt = null
        env.setCursor('default')
        return
      }
      const sky = p.y < hy
      if (p.type === 'move' || p.type === 'down') {
        const ddx = p.x - hawk.x
        const ddy = p.y - hawk.y
        const l = Math.hypot(ddx, ddy)
        if (l > 1.5 && !hawk.ghost) {
          hawk.dx = lerp(hawk.dx, ddx / l, 0.35)
          hawk.dy = lerp(hawk.dy, ddy / l, 0.35)
        }
        hawk.x = p.x
        hawk.y = p.y
        // a mouse hunts on hover; a finger only while it is down
        if (!hawk.touch || p.pressed) {
          hawk.on = sky
          acted = true
          hawk.ghost = false
        }
        env.setCursor(sky ? 'crosshair' : 'default')
      }
      if (p.type === 'down') {
        hawk.press = true
        downAt = { x: p.x, y: p.y, ms: performance.now() }
      }
      if (p.type === 'up') {
        hawk.press = false
        // a tap in the sky sends the falcon through that spot
        if (downAt && sky && Math.hypot(p.x - downAt.x, p.y - downAt.y) < (hawk.touch ? 16 : 10) && performance.now() - downAt.ms < 350) {
          pending = { x: (p.x - scx) / s, y: (p.y - scy) / s }
        }
        downAt = null
        if (hawk.touch) hawk.on = false
      }
    },
    key(code, down) {
      if (code === 'Space' || code === 'Enter' || code === 'KeyF') {
        if (down) {
          pending = 'flock'
          acted = true
        }
        return true
      }
      return false
    },
    frame(t, dt) {
      updateHawk(t, dt)
      if (dt > 0) {
        // two half-steps keep the flock stable at low frame rates
        if (dt > 1 / 45) {
          step(dt / 2)
          step(dt / 2)
        } else step(dt)
      }
      drawSky(t)
      drawFlock()
      drawFalcon()
      drawHawk()
      drawReeds(t)
      drawChrome(t)
    },
  }
}

export default create
