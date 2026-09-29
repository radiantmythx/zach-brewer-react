import { PROGRESSION } from '../harmony'
import { blend, makePts, resample, type Pts } from '../line'
import { easeInOutCubic, lerp, rgba, seg, TAU, win, type RGB } from '../math'
import { SANS, setSpacing, style, uiFont, type Scene, type SceneEnv } from '../scene'
import { BAR, BEAT, CHAPTERS } from '../timeline'
import { STOMP } from './game'
import { strike } from './string'

/*
 * CHAPTER 04 — MUSIC
 * The struck terrain rings as a string and rises to center. Its vibration
 * becomes a waveform: the sum of four partials tuned to the chord of each
 * bar, one partial per discipline, pulsing on the beat. Then the sound
 * decays, and the line reels itself back into the caret. Loop.
 */

const GOLD = CHAPTERS[3].rgb
const AMPS = [46, 30, 24, 16]
const PHASE = [0, 1.3, 2.1, 0.7]
const KAPPA = 1.6
const NU = 0.42
const REEL = [6.9, 7.9] as const

const ratios = [1, 1, 1, 1]
function chordRatios(t: number) {
  const b = Math.max(0, Math.min(3, Math.floor(t / BAR)))
  const prev = PROGRESSION[(b + 3) % 4].semis
  const cur = PROGRESSION[b].semis
  const k = seg(t - b * BAR, 0, 0.35)
  for (let i = 0; i < 4; i++) ratios[i] = Math.pow(2, lerp(prev[i], cur[i], k) / 12)
  return ratios
}

export function beatPulse(t: number) {
  const bp = (((t % BEAT) + BEAT) % BEAT) / BEAT
  const down = ((t % BAR) + BAR) % BAR < BEAT ? 1.35 : 1
  return Math.exp(-5 * bp) * down
}

const waveEnv = (t: number) => seg(t, 0.9, 2.2) * (1 - seg(t, 6.2, 7.0))
const baseYAt = (t: number, env: SceneEnv) =>
  lerp(env.L.groundY, env.L.stringY, seg(t, 0.4, 1.9, easeInOutCubic))
const windowAt = (s: number) => Math.pow(Math.max(0, Math.sin(Math.PI * s)), 0.7)

const flat = makePts()
const caret = makePts()

function writeCaret(env: SceneEnv, out: Pts) {
  const { x, y, h } = env.L.caret
  const n = out.length / 2
  for (let k = 0; k < n; k++) {
    out[2 * k] = x
    out[2 * k + 1] = y - h / 2 + (h * k) / (n - 1)
  }
}

export const musicScene: Scene = {
  line(t, env, out) {
    const { f, L } = env
    const x0 = f.visL - 20
    const x1 = f.visR + 20
    const xp = (L.charX - x0) / (x1 - x0)
    const sAmp = f.portrait ? 120 : 165
    const baseY = baseYAt(t, env)
    const r = chordRatios(t)
    const amp = waveEnv(t) * (0.8 + 0.28 * beatPulse(t)) * (f.portrait ? 0.8 : 1)
    const cx = f.w / 2
    const target = t > REEL[0] ? flat : out
    resample((s, o) => {
      const x = lerp(x0, x1, s)
      let w = 0
      if (amp > 0.0005) {
        const xn = (x - cx) / 1000
        for (let k = 0; k < 4; k++) w += AMPS[k] * Math.sin(TAU * (KAPPA * r[k] * xn - NU * r[k] * t) + PHASE[k])
        w *= amp * windowAt(s)
      }
      o.x = x
      o.y = baseY + strike(s, t + (8 - STOMP), xp, sAmp) + w
    }, target)
    if (t <= REEL[0]) return style(1, 0, 0.1)

    const k = seg(t, REEL[0], REEL[1], easeInOutCubic)
    writeCaret(env, caret)
    blend(flat, caret, k, out, 0.6, true)
    return style(1, 0, lerp(0.1, 0, k))
  },

  back(g, t, env) {
    if (t < -0.2 || t > 8.2) return
    const { f, px } = env
    const baseY = baseYAt(t, env)
    const e = waveEnv(t)

    // warm band of light under the string, breathing with the beat
    if (e > 0.01) {
      const cx = f.w / 2
      const rx = (f.visR - f.visL) / 2
      g.save()
      g.translate(cx, baseY)
      g.scale(1, 0.14)
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx)
      gr.addColorStop(0, rgba(GOLD, (0.06 + 0.06 * beatPulse(t)) * e))
      gr.addColorStop(1, rgba(GOLD, 0))
      g.fillStyle = gr
      g.fillRect(-rx, -rx, rx * 2, rx * 2)
      g.restore()
    }

    // the four partials, one per discipline, that sum to the line
    const pa = win(t, 2.0, 2.8, 5.8, 6.4) * 0.38
    if (pa < 0.003) return
    const r = chordRatios(t)
    const amp = e * (0.8 + 0.28 * beatPulse(t)) * (f.portrait ? 0.8 : 1)
    const x0 = f.visL - 20
    const x1 = f.visR + 20
    const cx = f.w / 2
    g.lineWidth = 1.2 * px
    for (let k = 0; k < 4; k++) {
      g.strokeStyle = rgba(CHAPTERS[k].rgb, pa)
      g.beginPath()
      for (let x = x0; x <= x1; x += 8) {
        const s = (x - x0) / (x1 - x0)
        const y =
          baseY +
          AMPS[k] * Math.sin(TAU * (KAPPA * r[k] * ((x - cx) / 1000) - NU * r[k] * t) + PHASE[k]) * amp * windowAt(s)
        if (x === x0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
  },

  front(g, t, env) {
    if (t < 0.5 || t > 7.5) return
    const { f, px } = env
    const A = win(t, 1.0, 1.6, 6.4, 7.0)
    if (A > 0.003) {
      const hx = f.portrait ? 40 : 70
      const hy = f.portrait ? 44 : 70
      const b = Math.max(0, Math.min(3, Math.floor(t / BAR)))
      const local = t - b * BAR
      const inK = seg(local, 0, 0.3)
      g.textBaseline = 'middle'
      g.textAlign = 'left'
      g.font = uiFont(env, 13, 500)
      g.fillStyle = rgba(GOLD, A * inK)
      g.fillText(PROGRESSION[b].name, hx, hy + (1 - inK) * 8 * px)
      if (b > 0 && inK < 1) {
        g.fillStyle = rgba(GOLD, A * (1 - inK))
        g.fillText(PROGRESSION[b - 1].name, hx, hy - inK * 8 * px)
      }
      g.font = uiFont(env, 10, 500)
      setSpacing(g, '0.12em')
      g.fillStyle = `rgba(255,255,255,${0.42 * A})`
      g.fillText(`BAR ${b + 1}/4 · 120 BPM`, hx, hy + 22 * px)
      setSpacing(g, '0px')
      const beat = Math.floor(local / BEAT)
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i === beat ? rgba(GOLD, A) : `rgba(255,255,255,${0.2 * A})`
        g.beginPath()
        g.arc(hx + 3 * px + i * 12 * px, hy + 42 * px, 2.6 * px, 0, TAU)
        g.fill()
      }
    }

    // legend: the partials are the four disciplines
    const la = win(t, 2.2, 3.0, 5.9, 6.5) * 0.85
    if (la > 0.003) {
      const y = env.L.stringY + (f.portrait ? 200 : 205)
      g.font = uiFont(env, 11, 400, SANS)
      g.textBaseline = 'middle'
      const items = CHAPTERS.map((c) => ({ label: c.label.toLowerCase(), rgb: c.rgb as RGB }))
      const sw = 14 * px
      const gap = 6 * px
      const space = 20 * px
      const widths = items.map((it) => sw + gap + g.measureText(it.label).width)
      const total = widths.reduce((a, b) => a + b, 0) + space * (items.length - 1)
      let x = f.w / 2 - total / 2
      items.forEach((it, i) => {
        g.strokeStyle = rgba(it.rgb, la)
        g.lineWidth = 2 * px
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + sw, y)
        g.stroke()
        g.fillStyle = `rgba(255,255,255,${0.6 * la})`
        g.fillText(it.label, x + sw + gap, y)
        x += widths[i] + space
      })
    }
  },
}
