import { useEffect, useRef, useState } from 'react'
import { loaderFor } from './loaders'
import { sfxEngine, silentSfx } from './sfx'
import type { Mode, PieceEnv, PieceInstance, PieceStore, PointerInfo } from './types'

/*
 * Hosts one piece on one canvas: sizing and pixel ratio, the frame loop
 * (~30 fps in previews), pausing, pointer and keyboard routing, and error
 * containment. `fixedTime` steps the piece deterministically to that time
 * and freezes it (the solo/test route uses this for headless screenshots).
 */

interface StageProps {
  pieceKey: string
  mode: Mode
  /** false pauses the clock (offscreen, viewer closed, user pause) */
  running: boolean
  /** change to tear down and recreate the piece */
  restart?: number
  fixedTime?: number | null
  /** preview only: fast-forward this many seconds before the first paint */
  preroll?: number
  params?: URLSearchParams
  className?: string
  /** accessible label for the canvas */
  label: string
  /** filled with a function that sends a key to the piece (on-screen touch controls) */
  keyBus?: { current: ((code: string, down: boolean) => void) | null }
}

const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'Home', 'End']

function makeStore(key: string): PieceStore {
  const prefix = `pg:${key}:`
  return {
    get(k) {
      try {
        return localStorage.getItem(prefix + k)
      } catch {
        return null
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(prefix + k, v)
      } catch {
        /* storage blocked */
      }
    },
  }
}

export default function Stage({ pieceKey, mode, running, restart = 0, fixedTime = null, preroll = 0, params, className, label, keyBus }: StageProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runningRef = useRef(running)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    runningRef.current = running
  }, [running])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !wrap || !ctx) return
    let disposed = false
    let inst: PieceInstance | null = null
    let frozen = false
    let failed = false
    let raf = 0
    let t = 0
    let last = 0
    const held = new Set<string>()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dprCap = mode === 'full' ? 2 : 1.5
    let cursor = ''
    const env: PieceEnv = {
      canvas,
      ctx,
      width: 0,
      height: 0,
      dpr: 1,
      mode,
      reducedMotion: reduced,
      sfx: mode === 'full' ? sfxEngine : silentSfx,
      store: makeStore(pieceKey),
      params: params ?? new URLSearchParams(),
      setCursor(c: string) {
        if (c === cursor) return
        cursor = c
        canvas.style.cursor = c
      },
    }

    const fail = (e: unknown) => {
      if (failed) return
      failed = true
      console.error(`[playground] ${pieceKey}:`, e)
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }

    const step = (dt: number) => {
      if (!inst || failed) return
      ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.lineCap = 'butt'
      ctx.lineJoin = 'miter'
      ctx.setLineDash([])
      try {
        inst.frame(t, dt)
      } catch (e) {
        fail(e)
      }
    }

    const measure = () => {
      const r = wrap.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width))
      const h = Math.max(1, Math.round(r.height))
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      if (w === env.width && h === env.height && dpr === env.dpr) return false
      env.width = w
      env.height = h
      env.dpr = dpr
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      return true
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!inst || frozen || failed) return
      if (!runningRef.current) {
        last = 0
        return
      }
      if (!last) {
        last = now
        return
      }
      const el = (now - last) / 1000
      if (mode === 'preview' && el < 1 / 31) return
      last = now
      const dt = Math.min(el, 0.05)
      t += dt
      step(dt)
    }

    const ro = new ResizeObserver(() => {
      if (!measure() || !inst) return
      try {
        inst.resize?.(env.width, env.height)
      } catch (e) {
        fail(e)
      }
      // resizing clears the canvas; repaint without advancing time
      step(0)
    })

    const toInfo = (e: PointerEvent, type: PointerInfo['type']): PointerInfo => {
      const r = canvas.getBoundingClientRect()
      return { type, x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId, pointerType: e.pointerType, pressed: type === 'down' || (type === 'move' && e.buttons > 0) }
    }
    const onPointer = (type: PointerInfo['type']) => (e: PointerEvent) => {
      if (!inst?.pointer || frozen) return
      if (type === 'down' && mode === 'full') {
        try {
          canvas.setPointerCapture(e.pointerId)
        } catch {
          /* not capturable */
        }
      }
      try {
        inst.pointer(toInfo(e, type))
      } catch (err) {
        fail(err)
      }
    }
    const pDown = onPointer('down')
    const pMove = onPointer('move')
    const pUp = onPointer('up')
    const pLeave = onPointer('leave')
    canvas.addEventListener('pointerdown', pDown)
    canvas.addEventListener('pointermove', pMove)
    canvas.addEventListener('pointerup', pUp)
    canvas.addEventListener('pointercancel', pLeave)
    canvas.addEventListener('pointerleave', pLeave)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Tab' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      // reading the notes: arrows and space scroll the text, not the piece
      if (target?.closest?.('[data-keys-pass]')) return
      // let a deliberately focused control (button, link) keep Enter/Space
      if (target?.closest?.('button, a, input, select, textarea') && (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter')) return
      e.stopPropagation()
      const down = e.type === 'keydown'
      if (down) held.add(e.code)
      else held.delete(e.code)
      let handled = false
      try {
        handled = !!inst?.key?.(e.code, down, e)
      } catch (err) {
        fail(err)
      }
      if (handled || NAV_KEYS.includes(e.code)) e.preventDefault()
    }
    const onBlur = () => {
      for (const code of held) {
        try {
          inst?.key?.(code, false, new KeyboardEvent('keyup', { code }))
        } catch {
          /* ignore */
        }
      }
      held.clear()
    }
    if (keyBus) {
      keyBus.current = (code, down) => {
        if (down) held.add(code)
        else held.delete(code)
        try {
          inst?.key?.(code, down, new KeyboardEvent(down ? 'keydown' : 'keyup', { code }))
        } catch (err) {
          fail(err)
        }
      }
    }
    if (mode === 'full') {
      window.addEventListener('keydown', onKey, { capture: true })
      window.addEventListener('keyup', onKey, { capture: true })
      window.addEventListener('blur', onBlur)
    }

    const load = loaderFor(pieceKey)
    if (!load) {
      fail(new Error(`No piece module for "${pieceKey}"`))
    } else {
      load()
        .then((mod) => {
          if (disposed) return
          measure()
          inst = mod.default(env)
          inst.resize?.(env.width, env.height)
          setStatus('ready')
          if (fixedTime !== null && fixedTime !== undefined) {
            const dt = mode === 'full' ? 1 / 60 : 1 / 30
            while (t < fixedTime && !failed) {
              t += dt
              step(dt)
            }
            frozen = true
          } else if (reduced && mode === 'preview') {
            // a settled still frame instead of a loop
            for (let i = 0; i < 45 && !failed; i++) {
              t += 1 / 30
              step(1 / 30)
            }
            frozen = true
          } else {
            if (mode === 'preview' && preroll > 0) {
              for (let i = 0; i < preroll * 30 && !failed; i++) {
                t += 1 / 30
                step(1 / 30)
              }
            }
            step(0)
          }
          ro.observe(wrap)
          raf = requestAnimationFrame(loop)
        })
        .catch(fail)
    }

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', pDown)
      canvas.removeEventListener('pointermove', pMove)
      canvas.removeEventListener('pointerup', pUp)
      canvas.removeEventListener('pointercancel', pLeave)
      canvas.removeEventListener('pointerleave', pLeave)
      window.removeEventListener('keydown', onKey, { capture: true })
      window.removeEventListener('keyup', onKey, { capture: true })
      window.removeEventListener('blur', onBlur)
      if (keyBus) keyBus.current = null
      try {
        inst?.destroy?.()
      } catch {
        /* ignore */
      }
      inst = null
    }
    // params is read once per (re)creation by design
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceKey, mode, restart, fixedTime])

  return (
    <div ref={wrapRef} className={`pg-stage${className ? ` ${className}` : ''}`} data-status={status}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
      {status === 'error' && <p className="pg-stage-error">This piece hit an error{import.meta.env.DEV && error ? `: ${error}` : '.'}</p>}
    </div>
  )
}
