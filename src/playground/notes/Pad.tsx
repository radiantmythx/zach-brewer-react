import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Pad as PadSpec, PadButton } from '../guide'

/*
 * On-screen controls for touch screens. Each button presses its key on
 * touch-down and releases it on lift (or when the finger slides off), so
 * held actions — thrust, soft drop, auto-fire — work like real keys.
 * Rendered as two clusters so the viewer can place them beside the stage
 * (a phone on its side) or below it (portrait).
 */

type Send = (code: string, down: boolean) => void

function Key({ b, send, className = '' }: { b: PadButton; send: Send; className?: string }) {
  const down = useRef(false)
  const press = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* not capturable */
    }
    if (down.current) return
    down.current = true
    e.currentTarget.classList.add('is-down')
    send(b.code, true)
    navigator.vibrate?.(6)
  }
  const release = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!down.current) return
    down.current = false
    e.currentTarget.classList.remove('is-down')
    send(b.code, false)
  }
  return (
    <button
      type="button"
      className={`pg-pad-key${b.wide ? ' is-wide' : ''}${!b.wide && b.label.length > 4 ? ' is-long' : ''}${className}`}
      aria-label={b.aria ?? b.label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span>{b.label}</span>
    </button>
  )
}

const ARROWS: Record<string, string> = { ArrowUp: '↑', ArrowLeft: '←', ArrowRight: '→', ArrowDown: '↓', KeyW: '↑', KeyA: '←', KeyD: '→', KeyS: '↓' }

export function PadLeft({ pad, send }: { pad: PadSpec; send: Send }) {
  if (pad.dpad) {
    const [u, l, r, d] = pad.dpad
    const lab = (c: string, f: string) => ARROWS[c] ?? f
    return (
      <div className="pg-pad pg-pad--left pg-dpad" role="group" aria-label="Direction">
        <Key b={{ label: lab(u, '↑'), code: u, aria: 'Up' }} send={send} className=" pg-dpad-u" />
        <Key b={{ label: lab(l, '←'), code: l, aria: 'Left' }} send={send} className=" pg-dpad-l" />
        <span className="pg-dpad-hub" aria-hidden="true" />
        <Key b={{ label: lab(r, '→'), code: r, aria: 'Right' }} send={send} className=" pg-dpad-r" />
        <Key b={{ label: lab(d, '↓'), code: d, aria: 'Down' }} send={send} className=" pg-dpad-d" />
      </div>
    )
  }
  if (!pad.left?.length) return <div className="pg-pad pg-pad--left is-empty" />
  return (
    <div className="pg-pad pg-pad--left" role="group" aria-label="Movement">
      {pad.left.map((b) => (
        <Key key={b.code + b.label} b={b} send={send} />
      ))}
    </div>
  )
}

export function PadRight({ pad, send }: { pad: PadSpec; send: Send }) {
  if (!pad.right?.length) return <div className="pg-pad pg-pad--right is-empty" />
  return (
    <div className="pg-pad pg-pad--right" role="group" aria-label="Actions">
      {pad.right.map((b) => (
        <Key key={b.code + b.label} b={b} send={send} />
      ))}
    </div>
  )
}
