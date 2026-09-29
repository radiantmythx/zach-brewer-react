import { useEffect, useState } from 'react'
import { eraName, subscribeEra, triggerPetalStorm } from '../era'

const BAR_CELLS = 14

/*
 * Fixed mono readout tracking the visitor's scroll as a system migration.
 * Clicking the blossom glyph fires the petal storm (same as the `sakura`
 * terminal command) — a small reward for the curious.
 */
export default function MigrationHUD() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const update = () => setVisible(!mq.matches)
    update()
    mq.addEventListener('change', update)

    // Throttle to whole-percent changes so we don't re-render every frame
    const unsub = subscribeEra((p) => {
      setProgress((prev) => {
        const next = Math.round(p * 100)
        return next === Math.round(prev * 100) ? prev : p
      })
    })
    return () => {
      mq.removeEventListener('change', update)
      unsub()
    }
  }, [])

  if (!visible) return null

  const pct = Math.round(progress * 100)
  const filled = Math.round(progress * BAR_CELLS)
  const bar = '█'.repeat(filled) + '░'.repeat(BAR_CELLS - filled)

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '1.25rem',
        bottom: '1.25rem',
        zIndex: 45,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.62rem',
        letterSpacing: '0.08em',
        lineHeight: 1.7,
        color: 'var(--era-accent)',
        background: 'rgba(0, 0, 0, 0.35)',
        border: '1px solid var(--era-accent-soft)',
        borderRadius: '6px',
        padding: '0.55rem 0.8rem',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        userSelect: 'none',
        transition: 'color 0.2s linear, border-color 0.2s linear',
      }}
    >
      <div style={{ opacity: 0.85 }}>
        MIGRATION ▸ {String(pct).padStart(3, '0')}%
      </div>
      <div>
        [{bar}] {eraName(progress)}
      </div>
      <div style={{ opacity: 0.6, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        S/370 → AZURE
        <button
          type="button"
          onClick={() => triggerPetalStorm()}
          title="sakura"
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
            padding: 0,
            opacity: 0.9,
          }}
        >
          {progress < 0.33 ? '*' : progress < 0.62 ? '❀' : '🌸'}
        </button>
      </div>
    </div>
  )
}
