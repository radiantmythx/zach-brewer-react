import { useEffect, useState } from 'react'
import { toggleGrid, useGrid } from '../../lib/grid'

/*
 * The colophon: how the page is made. Type specimens, the palette, the
 * system it's built on, and a hairline clock keeping Hopkins, Minnesota time.
 */

const SWATCHES = [
  ['Paper', '#F3F6F2'],
  ['Ink', '#122630'],
  ['Ocean', '#2B6A93'],
  ['Lagoon', '#1F8A86'],
  ['Moss', '#3F7A55'],
  ['Fern', '#6F952F'],
] as const

function useHopkinsTime() {
  const [t, setT] = useState<{ h: number; m: number; s: number; label: string } | null>(null)
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    })
    const tick = () => {
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]))
      const h = Number(parts.hour) % 24
      const m = Number(parts.minute)
      const s = Number(parts.second)
      setT({ h, m, s, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${parts.timeZoneName ?? ''}`.trim() })
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  return t
}

function Clock({ t }: { t: ReturnType<typeof useHopkinsTime> }) {
  const hr = t ? ((t.h % 12) + t.m / 60) * 30 : 0
  const mn = t ? (t.m + t.s / 60) * 6 : 0
  const sc = t ? t.s * 6 : 0
  return (
    <svg className="clock" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="33" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2
        const r0 = i % 5 === 0 ? 27 : 30
        return (
          <line
            key={i}
            x1={36 + Math.sin(a) * r0}
            y1={36 - Math.cos(a) * r0}
            x2={36 + Math.sin(a) * 33}
            y2={36 - Math.cos(a) * 33}
            stroke="currentColor"
            strokeOpacity={i % 5 === 0 ? 0.8 : 0.3}
          />
        )
      })}
      {t && (
        <>
          <line x1="36" y1="36" x2="36" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${hr} 36 36)`} />
          <line x1="36" y1="36" x2="36" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" transform={`rotate(${mn} 36 36)`} />
          <line x1="36" y1="41" x2="36" y2="7" stroke="#9DB9A0" strokeWidth="0.8" transform={`rotate(${sc} 36 36)`} />
        </>
      )}
      <circle cx="36" cy="36" r="1.6" fill="currentColor" />
    </svg>
  )
}

export default function Colophon() {
  const t = useHopkinsTime()
  const grid = useGrid()
  return (
    <section className="colophon container" aria-label="Colophon">
      <div>
        <p className="colo-h">Type</p>
        <ul className="colo-type">
          <li>
            <span className="colo-aa" style={{ fontFamily: 'var(--font-display)' }}>
              Aa
            </span>
            Instrument Serif — display
          </li>
          <li>
            <span className="colo-aa" style={{ fontFamily: 'var(--font-sans)' }}>
              Aa
            </span>
            Geist — text
          </li>
          <li>
            <span className="colo-aa colo-aa--mono" style={{ fontFamily: 'var(--font-mono)' }}>
              Aa
            </span>
            Geist Mono — annotation
          </li>
        </ul>
      </div>
      <div>
        <p className="colo-h">Colour</p>
        <ul className="colo-swatches">
          {SWATCHES.map(([name, hex]) => (
            <li key={hex}>
              <i style={{ background: hex }} />
              <span>{name}</span>
              <code>{hex}</code>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="colo-h">System</p>
        <dl className="colo-spec">
          <div>
            <dt>Grid</dt>
            <dd>12 col · 20 px gutter</dd>
          </div>
          <div>
            <dt>Baseline</dt>
            <dd>8 px</dd>
          </div>
          <div>
            <dt>Reel</dt>
            <dd>Canvas 2D · 128 BPM · 48 beats</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>React · Vite · pre-rendered</dd>
          </div>
        </dl>
        <button type="button" className="pill colo-grid" onClick={toggleGrid} aria-pressed={grid}>
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M1.5 1.5 H10.5 V10.5 H1.5 Z M4.5 1.5 V10.5 M7.5 1.5 V10.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
          {grid ? 'Hide grid' : 'Show grid'} <kbd>G</kbd>
        </button>
      </div>
      <div>
        <p className="colo-h">Local time</p>
        <div className="colo-time">
          <Clock t={t} />
          <p>
            <b>{t ? t.label : '—'}</b>
            <span>Hopkins, Minnesota</span>
          </p>
        </div>
      </div>
    </section>
  )
}
