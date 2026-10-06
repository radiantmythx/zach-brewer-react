import type { GestureKind, Interact } from '../guide'
import { renderInline } from './format'

/*
 * How to interact, drawn: keys as keycaps, gestures as small hairline
 * glyphs. Used in the viewer's control bar and at the top of the notes.
 */

export function GestureIcon({ kind }: { kind: GestureKind }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg className={`pg-gesture pg-gesture--${kind}`} viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'tap' && (
        <>
          <circle cx="12" cy="12" r="3.2" {...common} />
          <circle className="pg-gesture-ring" cx="12" cy="12" r="8" {...common} strokeDasharray="2 2.4" />
        </>
      )}
      {kind === 'hold' && (
        <>
          <circle cx="12" cy="12" r="3.6" fill="currentColor" />
          <circle cx="12" cy="12" r="8" {...common} />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2" {...common} />
        </>
      )}
      {kind === 'drag' && (
        <>
          <circle cx="6" cy="17" r="2.6" {...common} />
          <path d="M8.2 15.2 C 11 12, 14 9.5, 18.5 7" {...common} strokeDasharray="2 2" />
          <path d="M15.6 6.2 L18.8 6.9 L17.7 10" {...common} />
        </>
      )}
      {kind === 'swipe' && (
        <>
          <path d="M3.5 12 H19" {...common} />
          <path d="M15.5 8.5 L19.5 12 L15.5 15.5" {...common} />
          <path d="M3.5 8.5 v7" {...common} opacity="0.5" />
        </>
      )}
      {kind === 'move' && <path d="M7 4.5 L7 18 L10.6 14.6 L13.2 20 L15.4 19 L12.8 13.7 L17.6 13.4 Z" {...common} />}
      {kind === 'pinch' && (
        <>
          <circle cx="7" cy="7" r="2.4" {...common} />
          <circle cx="17" cy="17" r="2.4" {...common} />
          <path d="M9 9 L11 11 M15 15 L13 13" {...common} />
        </>
      )}
    </svg>
  )
}

const GESTURE_WORD: Record<GestureKind, string> = { tap: 'Tap', hold: 'Hold', drag: 'Drag', swipe: 'Swipe', move: 'Move', pinch: 'Pinch' }

interface LegendProps {
  interact: Interact
  /** show keyboard keys (hidden on touch-only devices by CSS) */
  keys?: boolean
  gestures?: boolean
  tip?: boolean
  className?: string
  /** show at most this many keys and gestures (the notes always show all) */
  maxKeys?: number
  maxGestures?: number
}

export default function Legend({ interact, keys = true, gestures = true, tip = false, className, maxKeys = 99, maxGestures = 99 }: LegendProps) {
  const keyList = (interact.keys ?? []).slice(0, maxKeys)
  const gestureList = (interact.gestures ?? []).slice(0, maxGestures)
  return (
    <div className={`pg-legend${className ? ` ${className}` : ''}`}>
      {keys && keyList.length > 0 && (
        <ul className="pg-legend-keys">
          {keyList.map((k, i) => (
            <li key={i}>
              <span className="pg-legend-caps">
                {k.keys.map((key) => (
                  <kbd key={key} className={key.length > 2 ? 'is-wide' : undefined}>
                    {key}
                  </kbd>
                ))}
              </span>
              <span className="pg-legend-act">{k.action}</span>
            </li>
          ))}
        </ul>
      )}
      {gestures && gestureList.length > 0 && (
        <ul className="pg-legend-gestures">
          {gestureList.map((g, i) => (
            <li key={i}>
              <GestureIcon kind={g.gesture} />
              <span className="pg-legend-word">{GESTURE_WORD[g.gesture]}</span>
              <span className="pg-legend-act">{g.action}</span>
            </li>
          ))}
        </ul>
      )}
      {tip && interact.tip && <p className="pg-legend-tip" dangerouslySetInnerHTML={{ __html: renderInline(interact.tip) }} />}
    </div>
  )
}
