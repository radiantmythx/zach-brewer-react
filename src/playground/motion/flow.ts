/*
 * FLOW FIELD — thousands of particles advected by curl noise. Each one
 * leaves a hairline, and the hairlines pile up at low alpha into a combed,
 * woven texture. Every ten seconds the paper turns a page: a hairline wipe
 * sweeps across, clearing to paper, and the field reseeds with a new
 * character — laminar, turbulent, then a vortex street shed by a cylinder.
 *
 *   arrival  the wipe crosses; strokes start behind it
 *   build    the texture densifies as the field's z drifts
 *   peak     ~7 s in: the page is a full, silky weave
 *   release  the next wipe clears it, and the loop goes on
 *
 * The strokes live in an offscreen buffer (faded, never cleared) so the
 * annotation on top stays crisp. Full mode: press and drag to stir — a
 * vortex rides the pointer, spinning the way you circle, and drags the
 * nearby fluid along. Until the viewer touches it, a ghost demonstrates.
 */

import { ACCENTS, C, clamp, cropMarks, damp, ease, hatch, lerp, makeNoise, rgba, rng, setFont, smoothstep, TAU, text, ticks, type Noise } from '../kit'
import type { CreatePiece } from '../types'

const PAGE = 10
const WIPE = 1.25

interface Kind {
  name: string
  em: string
  re: string
  note: string
}

const KINDS: Kind[] = [
  { name: 'Laminar', em: 'flow', re: '≈ 40', note: 'PLANE POISEUILLE · PARABOLIC PROFILE' },
  { name: 'Turbulent', em: 'flow', re: '≈ 4,000', note: 'TWO OCTAVES OF CURL NOISE' },
  { name: 'Vortex', em: 'street', re: '≈ 150', note: 'KÁRMÁN WAKE · St 0.21' },
]

/** speeds are in S (the short side) per second */
const U_LAM = 0.24
const U_VOR = 0.12
/** per-frame (60 fps) fade toward paper */
const FADE = 0.012

interface Field {
  page: number
  kind: number
  seed: number
  noise: Noise
  /** grid of the noise part of the velocity (S/s) and the colour field */
  vx: Float32Array
  vy: Float32Array
  band: Float32Array
}

/** 0 at the walls, 1 on the centreline */
const poiseuille = (f: number) => {
  const e = clamp(f) * 2 - 1
  return 1 - e * e
}
const hex4 = (n: number) => '0x' + (n & 0xffff).toString(16).toUpperCase().padStart(4, '0')
const seedOf = (p: number) => ((Math.imul(p + 3, 2654435761) >>> 0) ^ 0x5a17) & 0xffff
const fmtInt = (n: number) => n.toLocaleString('en-US')

const create: CreatePiece = (env) => {
  const { ctx } = env
  const small = env.mode === 'preview'
  // Particle count follows the frame so the texture keeps the same airy density at any size.
  // Coverage ≈ count × trail length / area, and trail length scales with the short side
  // (speeds are in short sides per second), so count ∝ area / short side = the long side.
  const CAPN = small ? 1200 : 3600
  const countFor = (w: number, h: number) =>
    Math.round(clamp(Math.max(w, h) / (small ? 420 : 1280), small ? 0.45 : 0.16, CAPN / (small ? 900 : 3000)) * (small ? 900 : 3000))
  let N = countFor(env.width, env.height)

  // particles
  const px = new Float32Array(CAPN)
  const py = new Float32Array(CAPN)
  const ox = new Float32Array(CAPN)
  const oy = new Float32Array(CAPN)
  const life = new Float32Array(CAPN)
  const pg = new Int16Array(CAPN).fill(-1)
  const band = new Uint8Array(CAPN)
  const r = rng(0x51f7)

  // layout
  let W = env.width
  let H = env.height
  let S = Math.min(W, H)
  let sp = 30
  let gc = 2
  let gr = 2
  let buf: HTMLCanvasElement | null = null
  let bctx: CanvasRenderingContext2D | null = null
  let bdpr = 1

  let cur: Field | null = null
  let old: Field | null = null
  let wipeX = 0
  let frameNo = 0
  let fadeAcc = 0
  let lastT = 0

  // the stir: a vortex (and a drag-along jet) that rides the pointer or the ghost demo
  const pv = { x: 0, y: 0, tx: 0, ty: 0, s: 0, spin: 1, vx: 0, vy: 0, lx: 0, ly: 0 }
  const ptr = { x: 0, y: 0, over: false, down: false, touch: false, lx: 0, ly: 0, dx: 0, dy: 0, turn: 0 }
  let touched = false
  let stirredOnce = false
  let tight = small

  function makeBuffer() {
    const dpr = env.dpr
    const nb = document.createElement('canvas')
    nb.width = Math.max(1, Math.round(W * dpr))
    nb.height = Math.max(1, Math.round(H * dpr))
    const nctx = nb.getContext('2d', { alpha: false })
    if (!nctx) return
    nctx.fillStyle = C.paper
    nctx.fillRect(0, 0, nb.width, nb.height)
    if (buf) nctx.drawImage(buf, 0, 0, nb.width, nb.height)
    buf = nb
    bctx = nctx
    bdpr = dpr
  }

  function newField(page: number): Field {
    const seed = seedOf(page)
    const f: Field = {
      page,
      kind: page % 3,
      seed,
      noise: makeNoise(seed),
      vx: new Float32Array(gc * gr),
      vy: new Float32Array(gc * gr),
      band: new Float32Array(gc * gr),
    }
    fillGrid(f, 0)
    return f
  }

  /** The noise part of a field, on the grid. */
  function fillGrid(f: Field, t: number) {
    const lt = t - f.page * PAGE
    const nz = f.noise
    const kind = f.kind
    const z = kind === 0 ? lt * 0.045 : kind === 1 ? lt * 0.075 : lt * 0.05
    const bz = 7.3 + t * 0.018
    for (let j = 0; j < gr; j++) {
      const v = (j * sp) / S
      for (let i = 0; i < gc; i++) {
        const u = (i * sp) / S
        const k = j * gc + i
        let vx = 0
        let vy = 0
        if (kind === 0) {
          // plane Poiseuille flow: a parabolic profile between two walls, gently perturbed
          const p = poiseuille((j * sp) / H)
          const c = nz.curl2(u * 0.9 + 3.1, v * 1.5, z)
          vx = U_LAM * (0.1 + 0.9 * p) + c[0] * 0.006
          vy = c[1] * 0.014 * (0.4 + p)
        } else if (kind === 1) {
          const a = nz.curl2(u * 2.1, v * 2.1, z)
          const b = nz.curl2(u * 5.2 + 40, v * 5.2, z * 1.7 + 9)
          vx = 0.025 + a[0] * 0.075 + b[0] * 0.028
          vy = a[1] * 0.075 + b[1] * 0.028
        } else {
          const c = nz.curl2(u * 2.4 + 8, v * 2.4, z)
          vx = c[0] * 0.012
          vy = c[1] * 0.012
        }
        f.vx[k] = vx
        f.vy[k] = vy
        f.band[k] = nz.n3(u * 0.85 + 50, v * 0.85, bz)
      }
    }
  }

  function resize(w: number, h: number) {
    const sx = W > 0 ? w / W : 1
    const sy = H > 0 ? h / H : 1
    for (let i = 0; i < CAPN; i++) {
      px[i] *= sx
      py[i] *= sy
      ox[i] = px[i]
      oy[i] = py[i]
    }
    pv.x *= sx
    pv.y *= sy
    W = w
    H = h
    S = Math.max(1, Math.min(w, h))
    const n = countFor(w, h)
    // particles that wake up join the current page where they already are
    for (let i = N; i < n; i++) {
      pg[i] = cur ? cur.page : -1
      life[i] = 0.5 + r() * 5
    }
    N = n
    sp = Math.max(14, S * (small ? 0.05 : 0.03))
    tight = small || H < 440 || W < 360
    gc = Math.ceil(W / sp) + 2
    gr = Math.ceil(H / sp) + 2
    makeBuffer()
    wipeX = wipeX * sx
    if (cur) cur = { ...cur, vx: new Float32Array(gc * gr), vy: new Float32Array(gc * gr), band: new Float32Array(gc * gr) }
    if (old) old = { ...old, vx: new Float32Array(gc * gr), vy: new Float32Array(gc * gr), band: new Float32Array(gc * gr) }
    if (cur) fillGrid(cur, lastT)
    if (old) fillGrid(old, lastT)
  }

  // initial scatter
  for (let i = 0; i < CAPN; i++) {
    px[i] = ox[i] = r() * W
    py[i] = oy[i] = r() * H
    life[i] = 1 + r() * 6
  }

  /* --------------------------------------------------------- the vortex street */

  const cyl = () => ({ x: W * 0.17 + S * 0.04, y: H * 0.5, R: S * 0.045 })

  /** Kármán street: vortices shed alternately from the cylinder, advected downstream. */
  const VX = new Float32Array(32)
  const VY = new Float32Array(32)
  const VG = new Float32Array(32)
  let nV = 0
  function streetAt(lt: number) {
    const c = cyl()
    const D = (c.R * 2) / S
    const f = (0.21 * U_VOR) / D
    const uc = 0.86 * U_VOR
    const a = uc / f
    const hs = 0.281 * a
    const half = 1 / (2 * f)
    const x0 = c.x / S + D * 0.9
    const maxX = W / S + 0.3
    nV = 0
    const kMax = Math.floor(lt / half)
    for (let k = kMax; k > kMax - 40 && nV < 32; k--) {
      const age = lt - k * half
      const x = x0 + uc * age * Math.min(1, 0.55 + age * 0.6)
      if (x > maxX) break
      const sgn = k % 2 === 0 ? 1 : -1
      VX[nV] = x * S
      VY[nV] = c.y + sgn * hs * 0.5 * S * smoothstep(0, 1.4, age)
      VG[nV] = sgn * 0.15 * smoothstep(0, 1.1, age) * (1 - 0.4 * clamp((x - x0) / (maxX - x0)))
      nV++
    }
  }

  /* ------------------------------------------------------------- simulation */

  function sample(f: Field, x: number, y: number, out: Float32Array) {
    let fx = x / sp
    let fy = y / sp
    if (fx < 0) fx = 0
    if (fy < 0) fy = 0
    if (fx > gc - 1.001) fx = gc - 1.001
    if (fy > gr - 1.001) fy = gr - 1.001
    const i = fx | 0
    const j = fy | 0
    const tx = fx - i
    const ty = fy - j
    const k = j * gc + i
    const a = (1 - tx) * (1 - ty)
    const b = tx * (1 - ty)
    const c = (1 - tx) * ty
    const d = tx * ty
    out[0] = f.vx[k] * a + f.vx[k + 1] * b + f.vx[k + gc] * c + f.vx[k + gc + 1] * d
    out[1] = f.vy[k] * a + f.vy[k + 1] * b + f.vy[k + gc] * c + f.vy[k + gc + 1] * d
    out[2] = f.band[k] * a + f.band[k + 1] * b + f.band[k + gc] * c + f.band[k + gc + 1] * d
  }

  const tmp = new Float32Array(3)

  function respawn(i: number, page: number, maxX: number) {
    const f = page === cur?.page ? cur : old
    if (f && f.kind === 2 && r() < 0.32) {
      // dye: released at the cylinder's separation points, so streaklines roll up into the street
      const c = cyl()
      if (c.x + c.R < maxX) {
        const a = (r() < 0.5 ? -1 : 1) * (Math.PI * (0.5 + r() * 0.08))
        px[i] = ox[i] = c.x + Math.cos(a) * c.R * 1.08
        py[i] = oy[i] = c.y + Math.sin(a) * c.R * 1.08
        life[i] = 5 + r() * 4.5
        pg[i] = page
        return
      }
    }
    px[i] = ox[i] = r() * maxX
    py[i] = oy[i] = r() * H
    life[i] = 2.5 + r() * 5
    pg[i] = page
  }

  /** The ghost demonstration: a dot circling once, early in full mode, until the viewer touches. */
  const G0 = 2.2
  const G1 = 6.6
  function ghostAt(t: number) {
    if (env.mode !== 'full' || touched || t < G0 || t > G1) return null
    const u = (t - G0) / (G1 - G0)
    const rad = S * 0.11
    const a = -Math.PI * 0.6 + u * Math.PI * 1.7
    const cxg = W * (tight ? 0.6 : 0.62)
    const cyg = H * 0.56
    return { x: cxg + Math.cos(a) * rad, y: cyg + Math.sin(a) * rad, s: smoothstep(0, 0.12, u) * (1 - smoothstep(0.86, 1, u)), u, cx: cxg, cy: cyg, rad, a }
  }

  function step(t: number, dt: number) {
    const P = Math.floor(t / PAGE)
    if (!cur || cur.page !== P) {
      old = cur
      cur = newField(P)
      wipeX = 0
    }
    const lt = t - P * PAGE
    const wp = clamp(lt / WIPE)
    const X = wp >= 1 ? W + 2 : ease.inOutCubic(wp) * (W + 2)
    const b = bctx
    if (!b || !buf) return
    b.setTransform(bdpr, 0, 0, bdpr, 0, 0)

    // the wipe clears the strip it crossed this frame
    if (X > wipeX) {
      b.fillStyle = C.paper
      b.fillRect(Math.floor(wipeX) - 1, 0, Math.ceil(X - wipeX) + 2, H)
      wipeX = X
    }
    if (wp >= 1) old = null

    // field grids: refresh the noise every other frame (z drifts slowly)
    frameNo++
    if (small || frameNo % 2 === 0) {
      fillGrid(cur, t)
      if (old) fillGrid(old, t)
    }
    const street = cur.kind === 2 || old?.kind === 2
    const streetPage = cur.kind === 2 ? cur.page : old ? old.page : P
    if (street) streetAt(t - streetPage * PAGE)
    const c = cyl()

    // the stir follows the pointer while pressed, or the ghost demonstration
    const g = ghostAt(t)
    const want = ptr.down ? 1 : g ? g.s : 0
    if (ptr.down) {
      pv.tx = ptr.x
      pv.ty = ptr.y
    } else if (g) {
      pv.tx = g.x
      pv.ty = g.y
      pv.spin = 1
      if (pv.s < 0.02) {
        pv.x = pv.lx = g.x
        pv.y = pv.ly = g.y
      }
    }
    pv.s = lerp(pv.s, want, damp(want > pv.s ? 5 : 1.1, dt))
    pv.x = lerp(pv.x, pv.tx, damp(14, dt))
    pv.y = lerp(pv.y, pv.ty, damp(14, dt))
    // the stir's own velocity drags nearby fluid along with it
    const kv = damp(8, dt)
    pv.vx = lerp(pv.vx, (pv.x - pv.lx) / Math.max(dt, 1e-3), kv)
    pv.vy = lerp(pv.vy, (pv.y - pv.ly) / Math.max(dt, 1e-3), kv)
    pv.lx = pv.x
    pv.ly = pv.y
    const pg2 = 0.11 * pv.s * pv.spin * S * S
    const pa = (S * 0.035) ** 2
    const sig2 = (S * (ptr.touch ? 0.085 : 0.065)) ** 2
    const jet = 0.75 * pv.s

    const vmax = S * 0.6
    for (let i = 0; i < N; i++) {
      // the wipe adopts every particle it passes
      if (pg[i] < P && px[i] < X) {
        pg[i] = P
        life[i] = 2 + r() * 5
        ox[i] = px[i]
        oy[i] = py[i]
      }
      if (pg[i] < 0) continue
      const f = pg[i] === P ? cur : old
      if (!f) {
        pg[i] = P
        continue
      }
      life[i] -= dt
      if (life[i] <= 0) {
        respawn(i, pg[i] === P ? P : pg[i], pg[i] === P ? Math.max(1, X) : W)
        if (px[i] < X) pg[i] = P
        continue
      }
      const x = px[i]
      const y = py[i]
      sample(f, x, y, tmp)
      let vx = tmp[0] * S
      let vy = tmp[1] * S
      band[i] = tmp[2] < -0.22 ? 0 : tmp[2] < 0.02 ? 1 : tmp[2] < 0.26 ? 2 : 3
      if (f.kind === 2) {
        // uniform flow past a cylinder (potential flow) + the shed vortices
        const dx = x - c.x
        const dy = y - c.y
        const r2 = dx * dx + dy * dy
        const R2 = c.R * c.R
        if (r2 < R2 * 1.02) {
          respawn(i, pg[i], pg[i] === P ? Math.max(1, X) : W)
          continue
        }
        const r4 = r2 * r2
        // the wake runs slower than the free stream
        const wake = dx > 0 ? 0.55 * Math.exp(-((dy / (c.R * 1.6)) ** 2)) * Math.exp(-dx / (c.R * 34)) * smoothstep(0, c.R * 2, dx) : 0
        const U = U_VOR * S * (1 - wake)
        vx += U * (1 - (R2 * (dx * dx - dy * dy)) / r4)
        vy += -U * ((2 * R2 * dx * dy) / r4)
        const core = (S * 0.022) ** 2
        for (let k = 0; k < nV; k++) {
          const ex = x - VX[k]
          const ey = y - VY[k]
          const q = (VG[k] * S * S) / (TAU * (ex * ex + ey * ey + core))
          vx += -ey * q
          vy += ex * q
        }
      }
      if (pv.s > 0.01) {
        const ex = x - pv.x
        const ey = y - pv.y
        const r2 = ex * ex + ey * ey
        const q = pg2 / (TAU * (r2 + pa))
        vx += -ey * q
        vy += ex * q
        const w = jet * Math.exp(-r2 / sig2)
        vx += pv.vx * w
        vy += pv.vy * w
      }
      const sp2 = Math.hypot(vx, vy)
      if (sp2 > vmax) {
        vx *= vmax / sp2
        vy *= vmax / sp2
      }
      ox[i] = x
      oy[i] = y
      px[i] = x + vx * dt
      py[i] = y + vy * dt
      if (px[i] < -4 || px[i] > W + 4 || py[i] < -4 || py[i] > H + 4) respawn(i, pg[i], pg[i] === P ? Math.max(1, X) : W)
    }

    // strokes: one path per colour band
    b.lineWidth = small ? 0.7 : 0.7
    b.lineCap = 'round'
    const alpha = small ? 0.3 : 0.26
    for (let k = 0; k < 4; k++) {
      b.strokeStyle = rgba(ACCENTS[k], alpha)
      b.beginPath()
      for (let i = 0; i < N; i++) {
        if (pg[i] < 0 || band[i] !== k) continue
        if (ox[i] === px[i] && oy[i] === py[i]) continue
        b.moveTo(ox[i], oy[i])
        b.lineTo(px[i], py[i])
      }
      b.stroke()
    }

    // a slow fade toward paper, in larger steps so 8-bit channels don't stall short of it
    fadeAcc += dt
    if (fadeAcc >= 0.1) {
      b.fillStyle = rgba(C.paper, 1 - Math.pow(1 - FADE, fadeAcc * 60))
      b.fillRect(0, 0, W, H)
      fadeAcc = 0
    }
  }

  /* ------------------------------------------------------------- annotation */

  function halo(str: string, x: number, y: number, o: Parameters<typeof text>[4]) {
    setFont(ctx, o)
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = rgba(C.paper, 0.9)
    ctx.strokeText(o?.upper ? str.toUpperCase() : str, x, y)
    text(ctx, str, x, y, o)
  }

  /** The extent of the heading (kicker, title, note) in the top-left corner. */
  function headingBox(kind: Kind, P: number) {
    const m = tight ? 12 : Math.round(clamp(S * 0.04, 16, 34))
    const titleSize = tight ? 22 : Math.round(clamp(S * 0.05, 26, 44))
    const tx = m + (tight ? 10 : 16)
    setFont(ctx, { size: tight ? 8.5 : 9.5, tracking: 0.14 })
    const kw = ctx.measureText(`FIG. M.04 — FLOW FIELD · PAGE ${String(P + 1).padStart(2, '0')}`).width
    setFont(ctx, { font: 'serif', size: titleSize })
    const tw = ctx.measureText(`${kind.name} ${kind.em}`).width * 1.05
    setFont(ctx, { size: 9, tracking: 0.14 })
    const nw = tight ? 0 : ctx.measureText(kind.note).width
    const top = m + (tight ? 16 : 22)
    const base = top + titleSize + (tight ? 4 : 8)
    return { left: tx, right: tx + Math.max(kw, tw, nw), bottom: tight ? base + 6 : base + 24 }
  }

  function chrome(t: number) {
    if (!cur) return
    const P = cur.page
    const lt = t - P * PAGE
    const kind = KINDS[cur.kind]
    const m = tight ? 12 : Math.round(clamp(S * 0.04, 16, 34))
    const narrow = W < 560
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(C.ink, 0.55)
    cropMarks(ctx, m, m, W - m * 2, H - m * 2, tight ? 8 : 11)

    // the cylinder, for the vortex street (positions recomputed: this may be a resize repaint)
    if (cur.kind === 2 || old?.kind === 2) {
      streetAt(t - (cur.kind === 2 ? cur.page : (old?.page ?? P)) * PAGE)
      const c = cyl()
      const vis = cur.kind === 2 ? smoothstep(0, 0.3, (wipeX - (c.x - c.R)) / (c.R * 2)) : 1 - smoothstep(0, 0.3, (wipeX - (c.x - c.R)) / (c.R * 2))
      if (vis > 0.01) {
        ctx.save()
        ctx.globalAlpha = vis
        ctx.fillStyle = C.paper
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.R, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = C.ink
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.strokeStyle = rgba(C.ink, 0.45)
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.R, 0, TAU)
        hatch(ctx, c.x - c.R, c.y - c.R, c.R * 2, c.R * 2, tight ? 3 : 3.5, -Math.PI / 4, true)
        if (!tight) {
          // diameter dimension, above the cylinder
          const yy = c.y - c.R - 16
          ctx.strokeStyle = rgba(C.ink, 0.7)
          ctx.beginPath()
          ctx.moveTo(c.x - c.R, c.y - c.R - 4)
          ctx.lineTo(c.x - c.R, yy - 4)
          ctx.moveTo(c.x + c.R, c.y - c.R - 4)
          ctx.lineTo(c.x + c.R, yy - 4)
          ctx.moveTo(c.x - c.R, yy)
          ctx.lineTo(c.x + c.R, yy)
          ctx.stroke()
          halo('D', c.x, yy - 6, { size: 9.5, align: 'center', color: C.ink })
          // rotation glyphs on the first few vortices
          ctx.strokeStyle = rgba(C.ink, 0.5)
          for (let k = 0; k < Math.min(nV, 6); k++) {
            const g = VG[k]
            if (Math.abs(g) < 0.02) continue
            const rr = 5
            const dir = g > 0 ? 1 : -1
            const a0 = -Math.PI / 2
            const a1 = a0 + dir * Math.PI * 1.45
            ctx.beginPath()
            ctx.arc(VX[k], VY[k], rr, a0, a1, dir < 0)
            ctx.stroke()
            const hx = VX[k] + Math.cos(a1) * rr
            const hy = VY[k] + Math.sin(a1) * rr
            const ta = a1 + (dir * Math.PI) / 2
            ctx.beginPath()
            ctx.moveTo(hx - Math.cos(ta - 0.5) * 3, hy - Math.sin(ta - 0.5) * 3)
            ctx.lineTo(hx, hy)
            ctx.lineTo(hx - Math.cos(ta + 0.5) * 3, hy - Math.sin(ta + 0.5) * 3)
            ctx.stroke()
          }
        }
        ctx.restore()
      }
    }

    // inflow arrows on the left: the velocity profile (parabolic for laminar, uniform for the wake)
    if (cur.kind !== 1) {
      const a = smoothstep(0.4, 1.4, lt) * (1 - smoothstep(PAGE - 0.6, PAGE, lt))
      if (a > 0.01) {
        ctx.save()
        ctx.globalAlpha = a
        ctx.strokeStyle = rgba(C.ink, 0.65)
        ctx.lineWidth = 1
        const x0 = m + (tight ? 8 : 12)
        const maxLen = tight ? 26 : Math.min(64, W * 0.05)
        const lam = cur.kind === 0
        const ys = lam ? (H < 320 ? [0.42, 0.52, 0.62, 0.72] : [0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78]) : [0.38, 0.5, 0.62]
        const top = lam ? (H < 320 ? 0.36 : 0.26) : 0.34
        const bot = lam ? 0.82 : 0.66
        ctx.beginPath()
        ctx.moveTo(x0, H * top)
        ctx.lineTo(x0, H * bot)
        for (const f of ys) {
          const y = H * f
          const len = lam ? maxLen * (0.1 + 0.9 * poiseuille(f)) : maxLen * 0.6
          ctx.moveTo(x0, y)
          ctx.lineTo(x0 + len, y)
          ctx.moveTo(x0 + len - 4, y - 2.5)
          ctx.lineTo(x0 + len, y)
          ctx.lineTo(x0 + len - 4, y + 2.5)
        }
        ctx.stroke()
        if (lam) {
          // the envelope through the arrow tips
          ctx.setLineDash([2, 3])
          ctx.beginPath()
          for (let k = 0; k <= 24; k++) {
            const f = top + ((bot - top) * k) / 24
            const x = x0 + maxLen * (0.1 + 0.9 * poiseuille(f))
            if (k === 0) ctx.moveTo(x, H * f)
            else ctx.lineTo(x, H * f)
          }
          ctx.stroke()
          ctx.setLineDash([])
          if (!tight) halo('U(y) = U₀(1 − η²)', x0, H * bot + 16, { size: 9, color: C.ink2, tracking: 0.06 })
        } else if (!tight) halo('U∞', x0, H * 0.34 - 9, { size: 9, color: C.ink2 })
        ctx.restore()
      }
    }

    // the wipe: a hairline with a tick ruler and the page label riding on it
    if (wipeX > 0 && wipeX < W + 1) {
      const x = Math.round(wipeX) + 0.5
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
      ctx.strokeStyle = rgba(C.ink, 0.5)
      ticks(ctx, x, 0, x, H, Math.round(H / 12), 3, 5)
      const label = `PAGE ${String(P + 1).padStart(2, '0')} → ${kind.name.toUpperCase()}`
      setFont(ctx, { size: 9, tracking: 0.14 })
      const lw = ctx.measureText(label).width
      const lx = x + 8 + lw > W - m ? x - 8 - lw : x + 8
      // ride at the top, but drop below the heading while the line crosses it
      const hd = headingBox(kind, P)
      const over = lx < hd.right + 10 && lx + lw > hd.left - 10
      halo(label, lx, over ? hd.bottom + 16 : m + (tight ? 22 : 30), { size: 9, color: C.ink, tracking: 0.14 })
    }

    // title, top-left
    const titleSize = tight ? 22 : Math.round(clamp(S * 0.05, 26, 44))
    const tx = m + (tight ? 10 : 16)
    let ty = m + (tight ? 16 : 22)
    const ap = ease.outCubic(smoothstep(0.2, 1.0, lt))
    halo(`FIG. M.04 — FLOW FIELD · PAGE ${String(P + 1).padStart(2, '0')}`, tx, ty, { size: tight ? 8.5 : 9.5, color: C.muted, tracking: 0.14 })
    ty += titleSize + (tight ? 4 : 8)
    ctx.save()
    ctx.globalAlpha = ap
    setFont(ctx, { font: 'serif', size: titleSize })
    const tw = ctx.measureText(kind.name + ' ').width
    halo(kind.name, tx, ty + (1 - ap) * 8, { font: 'serif', size: titleSize, color: C.ink })
    halo(kind.em, tx + tw, ty + (1 - ap) * 8, { font: 'serif', size: titleSize, italic: true, color: C.moss })
    if (!tight) halo(kind.note, tx, ty + 20, { size: 9, color: C.ink2, tracking: 0.14 })
    ctx.restore()

    // page clock, top-right: a ten-second ruler with a running marker
    if (!narrow || !tight) {
      const rw = tight ? 70 : Math.min(150, W * 0.14)
      const rx = W - m - (tight ? 10 : 16) - rw
      const ry = m + (tight ? 14 : 20)
      ctx.strokeStyle = rgba(C.ink, 0.55)
      ctx.lineWidth = 1
      ticks(ctx, rx, ry, rx + rw, ry, 10, 3, 5)
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(rx + rw, ry)
      ctx.stroke()
      const mx = rx + rw * clamp(lt / PAGE)
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.moveTo(mx, ry - 1)
      ctx.lineTo(mx - 3, ry - 6)
      ctx.lineTo(mx + 3, ry - 6)
      ctx.closePath()
      ctx.fill()
      halo(`T ${lt.toFixed(2).padStart(5, '0')} / ${PAGE.toFixed(2)}`, rx + rw, ry + 18, { size: tight ? 8 : 9, align: 'right', color: C.ink2 })
    }

    // the title block, bottom-right: field · Re · particles · seed · z
    const rows: [string, string][] = [
      ['FIELD', `${kind.name} ${kind.em}`.toUpperCase()],
      ['RE', kind.re],
      ['PARTICLES', fmtInt(N)],
      ['SEED', hex4(cur.seed)],
      ['Z', (lt * (cur.kind === 1 ? 0.075 : cur.kind === 0 ? 0.045 : 0.05)).toFixed(3)],
    ]
    const shown = tight ? rows.filter((_, i) => i !== 1 && i !== 4) : rows
    const rowH = tight ? 13 : 16
    const lab = tight ? 50 : 68
    const val = tight ? 92 : 128
    const bw = lab + val
    const bh = rowH * shown.length + (tight ? 0 : rowH)
    const stack = !tight && W < 640
    const bx = W - m - (tight ? 8 : 14) - bw
    const by = H - m - (tight ? 8 : 14) - bh - (stack ? 22 : 0)
    ctx.fillStyle = rgba(C.paper, 0.92)
    ctx.fillRect(bx, by, bw, bh)
    ctx.strokeStyle = rgba(C.ink, 0.7)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(bx) + 0.5, Math.round(by) + 0.5, Math.round(bw), Math.round(bh))
    ctx.strokeStyle = rgba(C.ink, 0.18)
    ctx.beginPath()
    for (let k = 1; k < shown.length + (tight ? 0 : 1); k++) {
      const yy = Math.round(by + k * rowH) + 0.5
      ctx.moveTo(bx, yy)
      ctx.lineTo(bx + bw, yy)
    }
    ctx.moveTo(Math.round(bx + lab) + 0.5, by)
    ctx.lineTo(Math.round(bx + lab) + 0.5, by + rowH * shown.length)
    ctx.stroke()
    const fs = tight ? 7.5 : 8.5
    shown.forEach(([l, v], k) => {
      const yy = by + k * rowH + rowH / 2 + 0.5
      text(ctx, l, bx + 6, yy, { size: fs, color: C.muted, baseline: 'middle', tracking: 0.14 })
      text(ctx, v, bx + lab + 6, yy, { size: fs + 0.5, color: C.ink, baseline: 'middle', tracking: 0.08 })
    })
    if (!tight) {
      // colour key: the four bands of the slow noise field
      const yy = by + shown.length * rowH + rowH / 2
      text(ctx, 'BANDS', bx + 6, yy + 0.5, { size: fs, color: C.muted, baseline: 'middle', tracking: 0.14 })
      const kx = bx + lab + 6
      const kw = (val - 12) / 4
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = ACCENTS[k]
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(kx + k * kw, yy)
        ctx.lineTo(kx + k * kw + kw - 6, yy)
        ctx.stroke()
      }
      ctx.lineWidth = 1
    }

    // the stir: ghost demonstration, hover ring, live vortex marker
    if (env.mode === 'full') stirMarks(t, m)

    // caption, bottom-left
    if (!tight || W > 360) {
      halo(tight || W < 900 ? `${fmtInt(N)} PARTICLES · CURL NOISE` : `${fmtInt(N)} PARTICLES · CURL NOISE · ONE PATH PER BAND · A NEW PAGE EVERY ${PAGE} S`, m + (tight ? 10 : 16), H - m - (tight ? 10 : 16), {
        size: tight ? 8 : 9,
        color: C.muted,
        tracking: 0.14,
      })
    }

  }

  function stirMarks(t: number, m: number) {
    const g = ghostAt(t)
    if (g) {
      const a = smoothstep(0, 0.08, g.u) * (1 - smoothstep(0.9, 1, g.u))
      ctx.save()
      ctx.globalAlpha = a
      ctx.strokeStyle = rgba(C.ink, 0.55)
      ctx.lineWidth = 1
      ctx.setLineDash([1.5, 3.5])
      ctx.beginPath()
      ctx.arc(g.cx, g.cy, g.rad, -Math.PI * 0.6, g.a)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(g.x, g.y, 3.5, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(g.x, g.y, 9, 0, TAU)
      ctx.stroke()
      const label = 'PRESS AND DRAG TO STIR'
      setFont(ctx, { size: 9.5, tracking: 0.14 })
      const lw = ctx.measureText(label).width
      // beside the circle if there is room, otherwise under it
      if (g.cx + g.rad + 16 + lw < W - m) halo(label, g.cx + g.rad + 16, g.cy + 3, { size: 9.5, color: C.ink, tracking: 0.14 })
      else if (g.cx - g.rad - 16 - lw > m + 90) halo(label, g.cx - g.rad - 16, g.cy + 3, { size: 9.5, color: C.ink, tracking: 0.14, align: 'right' })
      else halo(label, clamp(g.cx, m + lw / 2 + 4, W - m - lw / 2 - 4), g.cy + g.rad + 24, { size: 9.5, color: C.ink, tracking: 0.14, align: 'center' })
      ctx.restore()
    }
    // hover: the reach of the stir, before pressing
    if (ptr.over && !ptr.down && !ptr.touch) {
      const rr = S * 0.065
      ctx.strokeStyle = rgba(C.ink, 0.4)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.arc(ptr.x, ptr.y, rr, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      if (!stirredOnce) halo('DRAG TO STIR', ptr.x + rr + 8, ptr.y + 3, { size: 9, color: C.ink, tracking: 0.14 })
    }
    // the live vortex, with an arrow for its spin
    if (pv.s > 0.02) {
      ctx.save()
      ctx.globalAlpha = pv.s
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(pv.x, pv.y, 4, 0, TAU)
      ctx.moveTo(pv.x - 10, pv.y)
      ctx.lineTo(pv.x - 6, pv.y)
      ctx.moveTo(pv.x + 6, pv.y)
      ctx.lineTo(pv.x + 10, pv.y)
      ctx.moveTo(pv.x, pv.y - 10)
      ctx.lineTo(pv.x, pv.y - 6)
      ctx.moveTo(pv.x, pv.y + 6)
      ctx.lineTo(pv.x, pv.y + 10)
      ctx.stroke()
      const dir = pv.spin
      const a0 = -Math.PI / 2
      const a1 = a0 + dir * Math.PI * 1.3
      const rr = 15
      ctx.beginPath()
      ctx.arc(pv.x, pv.y, rr, a0, a1, dir < 0)
      ctx.stroke()
      const hx = pv.x + Math.cos(a1) * rr
      const hy = pv.y + Math.sin(a1) * rr
      const ta = a1 + (dir * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(hx - Math.cos(ta - 0.5) * 4, hy - Math.sin(ta - 0.5) * 4)
      ctx.lineTo(hx, hy)
      ctx.lineTo(hx - Math.cos(ta + 0.5) * 4, hy - Math.sin(ta + 0.5) * 4)
      ctx.stroke()
      if (!tight) halo(`Γ ${dir < 0 ? '−' : '+'}${(0.11 * pv.s).toFixed(3)}`, pv.x + rr + 6, pv.y - 12, { size: 9, color: C.ink })
      ctx.restore()
    }
  }

  return {
    resize,
    frame(t, dt) {
      lastT = t
      if (!buf || buf.width !== Math.round(W * env.dpr) || buf.height !== Math.round(H * env.dpr)) makeBuffer()
      if (dt > 0 || !cur) step(t, dt)
      if (buf) ctx.drawImage(buf, 0, 0, W, H)
      else {
        ctx.fillStyle = C.paper
        ctx.fillRect(0, 0, W, H)
      }
      chrome(t)
    },
    pointer(p) {
      if (env.mode !== 'full') return
      ptr.touch = p.pointerType === 'touch'
      if (p.type === 'leave') {
        ptr.over = false
        ptr.down = false
        env.setCursor('default')
        return
      }
      ptr.over = true
      ptr.x = p.x
      ptr.y = p.y
      if (p.type === 'down') {
        touched = true
        ptr.down = true
        ptr.lx = p.x
        ptr.ly = p.y
        ptr.dx = ptr.dy = 0
        ptr.turn = 0
        if (pv.s < 0.05) {
          pv.x = pv.lx = p.x
          pv.y = pv.ly = p.y
        }
      } else if (p.type === 'up') {
        ptr.down = false
      } else if (p.type === 'move' && ptr.down) {
        // spin the way the pointer is circling: accumulate the turning angle of its path
        const dx = p.x - ptr.lx
        const dy = p.y - ptr.ly
        if (dx * dx + dy * dy > 9) {
          if (ptr.dx || ptr.dy) {
            const turn = Math.atan2(ptr.dx * dy - ptr.dy * dx, ptr.dx * dx + ptr.dy * dy)
            ptr.turn = ptr.turn * 0.85 + turn
            if (Math.abs(ptr.turn) > 0.35) pv.spin = ptr.turn > 0 ? 1 : -1
          }
          ptr.dx = dx
          ptr.dy = dy
          ptr.lx = p.x
          ptr.ly = p.y
          stirredOnce = true
        }
      }
      env.setCursor(ptr.down ? 'grabbing' : 'grab')
    },
    destroy() {
      buf = null
      bctx = null
    },
  }
}

export default create
