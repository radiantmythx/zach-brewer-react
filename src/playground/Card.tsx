import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Entry } from './registry'
import Stage from './Stage'

/*
 * A catalogue card: a live preview (mounted the first time it nears the
 * viewport, running only while visible) with the piece's number, title,
 * theme and one line. The whole preview is the button that opens the viewer.
 */

interface CardProps {
  entry: Entry
  onOpen: (id: string, from: HTMLElement, notes?: boolean) => void
  /** pause every preview while the viewer is open */
  paused: boolean
  feature?: boolean
  style?: CSSProperties
}

export default function Card({ entry, onOpen, paused, feature = false, style }: CardProps) {
  const ref = useRef<HTMLElement>(null)
  const [armed, setArmed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting)
        if (e.isIntersecting) setArmed(true)
      },
      { rootMargin: '160px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const label = `${entry.title} — ${entry.after ?? entry.theme}`

  return (
    <article ref={ref} className={`pg-card${feature ? ' pg-card--feature' : ''}`} data-kind={entry.kind} style={style}>
      <button
        type="button"
        className={`pg-card-stage${entry.ground === 'night' ? ' is-night' : ''}`}
        onClick={(e) => onOpen(entry.id, e.currentTarget)}
        aria-label={`Open ${entry.title}`}
      >
        {armed && <Stage pieceKey={entry.key} mode="preview" running={visible && !paused} preroll={entry.preroll} label={label} />}
        <span className="crop" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="pg-card-open" aria-hidden="true">
          {entry.kind === 'game' ? 'Play' : 'Open'} <span>↗</span>
        </span>
      </button>
      {!feature && (
        <div className="pg-card-meta">
          <p className="pg-card-code">
            <span>{entry.code}</span>
            {entry.after ?? entry.theme}
          </p>
          <h3 className="pg-card-title">{entry.title}</h3>
          <p className="pg-card-blurb">{entry.blurb}</p>
          <p className="pg-card-actions">
            <button type="button" className="pg-card-link" onClick={(e) => onOpen(entry.id, e.currentTarget)}>
              {entry.kind === 'game' ? 'Play' : 'Open'} <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="pg-card-link" onClick={(e) => onOpen(entry.id, e.currentTarget, true)}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.5 3.2 C4.6 2.4 6.4 2.6 8 3.6 C9.6 2.6 11.4 2.4 13.5 3.2 V12.8 C11.4 12 9.6 12.2 8 13.2 C6.4 12.2 4.6 12 2.5 12.8 Z M8 3.6 V13.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              Notes: how it works
            </button>
          </p>
        </div>
      )}
    </article>
  )
}
