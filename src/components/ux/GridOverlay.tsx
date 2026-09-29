import { useEffect } from 'react'
import { isGridOn, setGrid, toggleGrid, useGrid } from '../../lib/grid'

/*
 * The page's layout grid, made visible: 12 columns, 20 px gutters, an 8 px
 * baseline. Press G (or use the colophon toggle) to show and hide it.
 */

export default function GridOverlay() {
  const visible = useGrid()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'g' || e.key === 'G') toggleGrid()
      if (e.key === 'Escape' && isGridOn()) setGrid(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`grid-overlay${visible ? ' is-on' : ''}`} aria-hidden="true">
      <div className="grid-overlay-cols container">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>
            <b>{String(i + 1).padStart(2, '0')}</b>
          </span>
        ))}
      </div>
      <p className="grid-overlay-label">12 columns · 20 px gutter · 8 px baseline — press G to hide</p>
    </div>
  )
}
