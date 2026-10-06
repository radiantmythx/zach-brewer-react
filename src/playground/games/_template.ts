/*
 * REFERENCE GAME — not listed on the page. A complete, tiny game ("catch the
 * falling marks") that shows the conventions every Playground game follows:
 *
 *   state flow   attract → (full mode) title → play → over → play …
 *                In preview mode the bot plays forever (attract), no cards.
 *                In full mode the attract demo runs *behind* the title card.
 *   the bot      a few lines of "AI" that plays well enough to look alive
 *   layout       a fixed logical playfield, letterboxed with kit.fit()
 *   chrome       kit.gameFrame, kit.hud, kit.card — so all games match
 *   input        kit.Keys + kit.Touch; Enter/Space/tap to start
 *   sound        env.sfx.tone/noise (silent unless the viewer turns it on)
 *   persistence  kit.highScore(env.store)
 */

import { C, card, clamp, damp, enterFit, fmtScore, gameFit, gameFrame, gameHud, ground, highScore, Keys, lerp, rng, Rings, Sparks, START_KEYS, toField, Touch } from '../kit'
import type { CreatePiece } from '../types'

const LW = 480
const LH = 360

type State = 'attract' | 'title' | 'play' | 'over'

const create: CreatePiece = (env) => {
  const { ctx } = env
  const keys = new Keys()
  const touch = new Touch()
  const hi = highScore(env.store)
  const sparks = new Sparks(300)
  const rings = new Rings()
  const r = rng(7)
  let f = gameFit(env.width, env.height, env.mode, LW, LH)

  let state: State = env.mode === 'full' ? 'title' : 'attract'
  if (env.params.get('state') === 'play') state = 'play'
  let stateT = 0
  let score = 0
  let lives = 3
  let paddle = LW / 2
  let marks: { x: number; y: number; vy: number }[] = []
  let spawn = 0
  let newRecord = false

  function reset() {
    score = 0
    lives = 3
    paddle = LW / 2
    marks = []
    spawn = 0
    sparks.clear()
    rings.clear()
  }

  function go(next: State) {
    state = next
    stateT = 0
    if (next === 'play') reset()
    if (next === 'over') newRecord = hi.submit(score)
  }

  function update(dt: number, bot: boolean) {
    spawn -= dt
    if (spawn <= 0) {
      spawn = lerp(0.9, 0.35, clamp(score / 40))
      marks.push({ x: 30 + r() * (LW - 60), y: -10, vy: 70 + r() * 50 + score * 2 })
    }
    // input → target x
    let target = paddle
    if (bot) {
      const next = marks.reduce<{ x: number; y: number } | null>((best, m) => (!best || m.y > best.y ? m : best), null)
      if (next) target = next.x + Math.sin(stateT * 3) * 12
    } else {
      if (keys.down('ArrowLeft', 'KeyA')) target = paddle - 400 * dt
      if (keys.down('ArrowRight', 'KeyD')) target = paddle + 400 * dt
      if (touch.pressed) target = toField(f, touch.x, touch.y).x
    }
    paddle = clamp(lerp(paddle, target, bot ? damp(6, dt) : 1), 30, LW - 30)

    for (const m of marks) m.y += m.vy * dt
    marks = marks.filter((m) => {
      if (m.y > LH - 34 && m.y < LH - 18 && Math.abs(m.x - paddle) < 34) {
        score++
        sparks.emit(m.x, LH - 26, 12, { color: C.moss, speed: 140, dir: -Math.PI / 2, spread: 2.4 })
        rings.add(m.x, LH - 26, 26, 0.45, C.moss)
        env.sfx.tone(660 + (score % 5) * 110, 0.12, { type: 'triangle', gain: 0.12 })
        return false
      }
      if (m.y > LH + 10) {
        if (!bot) {
          lives--
          env.sfx.noise(0.25, { filter: 300, gain: 0.25 })
          if (lives <= 0) go('over')
        }
        return false
      }
      return true
    })
  }

  return {
    resize(w, h) {
      f = gameFit(w, h, env.mode, LW, LH)
    },
    key(code, down) {
      return keys.key(code, down, ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', ...START_KEYS])
    },
    pointer(p) {
      touch.pointer(p)
    },
    frame(t, dt) {
      stateT += dt
      const wantsStart = keys.hit(...START_KEYS) || touch.tapped
      if ((state === 'title' || (state === 'over' && stateT > 0.6)) && wantsStart) go('play')

      if (state === 'play') update(dt, false)
      else if (dt > 0) update(dt, true) // attract / title / over: the bot keeps playing behind the card
      sparks.update(dt, 120)
      rings.update(dt)

      // --- draw
      ground(ctx, env.width, env.height, 'paper')
      gameFrame(ctx, f, { caption: 'FIG. G.00 — REFERENCE' })
      enterFit(ctx, f)
      ctx.lineWidth = 1 / f.s // a 1 CSS px hairline in playfield units
      ctx.strokeStyle = C.ink
      for (const m of marks) {
        ctx.beginPath()
        ctx.moveTo(m.x - 5, m.y)
        ctx.lineTo(m.x + 5, m.y)
        ctx.moveTo(m.x, m.y - 5)
        ctx.lineTo(m.x, m.y + 5)
        ctx.stroke()
      }
      ctx.strokeRect(paddle - 30, LH - 24, 60, 6)
      sparks.draw(ctx, 1 / f.s)
      rings.draw(ctx, 1 / f.s)
      ctx.restore()

      gameHud(ctx, f, env.mode, [{ label: 'Score', value: fmtScore(score, 4) }, { label: 'Lives', value: String(lives) }], [{ label: 'Best', value: fmtScore(Math.max(hi.get(), score), 4) }])

      const cx = f.ox
      const cy = f.oy
      const cw = f.lw * f.s
      const ch = f.lh * f.s
      if (state === 'title') card(ctx, cx, cy, cw, ch, { kicker: 'Reference · not a real game', title: 'Catch', titleEm: 'marks', lines: ['← → or drag to move'], prompt: 'Press Enter · Tap to start', t, appear: stateT * 2 })
      if (state === 'over') card(ctx, cx, cy, cw, ch, { kicker: newRecord ? 'New best' : 'Game over', title: fmtScore(score, 4), lines: [`Best ${fmtScore(hi.get(), 4)}`], prompt: 'Press Enter · Tap to play again', t, appear: stateT * 2 })

      keys.endFrame()
      touch.endFrame()
    },
  }
}

export default create
