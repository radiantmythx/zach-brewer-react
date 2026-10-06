import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Guide } from './guide'
import { loadGuide } from './guides'
import { GestureIcon } from './notes/Legend'
import Legend from './notes/Legend'
import Notes from './notes/Notes'
import { PadLeft, PadRight } from './notes/Pad'
import type { Entry } from './registry'
import { getSound, setSound, subscribeSound } from './sfx'
import Stage from './Stage'

/*
 * The full-frame viewer: one piece with keyboard, touch and sound, a top bar
 * of actions, a controls legend, on-screen pads for touch screens, and the
 * notes — beside the running piece on wide screens, as a sheet on phones.
 * Escape closes (the notes first); the back button closes (#hash entries).
 */

interface ViewerProps {
  entries: Entry[]
  openId: string | null
  notesOpen: boolean
  onClose: () => void
  onNavigate: (id: string) => void
  onNotes: (open: boolean) => void
}

const useSound = () => useSyncExternalStore(subscribeSound, getSound, () => false)

const WIDE = '(min-width: 1024px) and (min-height: 560px)'
function useWide() {
  return useSyncExternalStore(
    (fn) => {
      const mq = window.matchMedia(WIDE)
      mq.addEventListener('change', fn)
      return () => mq.removeEventListener('change', fn)
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  )
}

const I = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const Icon = {
  notes: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 3.2 C4.6 2.4 6.4 2.6 8 3.6 C9.6 2.6 11.4 2.4 13.5 3.2 V12.8 C11.4 12 9.6 12.2 8 13.2 C6.4 12.2 4.6 12 2.5 12.8 Z M8 3.6 V13.2" {...I} />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.5 3.5 V12.5 M10.5 3.5 V12.5" {...I} strokeWidth={1.6} />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3.2 L12.6 8 L5 12.8 Z" {...I} />
    </svg>
  ),
  restart: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.3 8 A4.7 4.7 0 1 0 5 4.4 M4.6 1.9 L5 4.4 L2.6 5" {...I} />
    </svg>
  ),
  prev: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10 3.5 L5.5 8 L10 12.5" {...I} />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3.5 L10.5 8 L6 12.5" {...I} />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4 L12 12 M12 4 L4 12" {...I} />
    </svg>
  ),
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <span className={`pg-sound-bars${on ? ' is-on' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export default function Viewer({ entries, openId, notesOpen, onClose, onNavigate, onNotes }: ViewerProps) {
  const index = entries.findIndex((e) => e.id === openId)
  const entry = index >= 0 ? entries[index] : null
  const [paused, setPaused] = useState(false)
  const [restart, setRestart] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [guide, setGuide] = useState<{ id: string; g: Guide | null } | null>(null)
  const [hint, setHint] = useState(false)
  const sound = useSound()
  const wide = useWide()
  const stageRef = useRef<HTMLDivElement>(null)
  const keyBus = useRef<((code: string, down: boolean) => void) | null>(null)

  // a fresh start for every piece
  const [shownId, setShownId] = useState(openId)
  if (openId !== shownId) {
    setShownId(openId)
    setPaused(false)
    setHint(false)
  }

  // load the piece's guide (notes, controls, pad)
  useEffect(() => {
    if (!entry) return
    let alive = true
    loadGuide(entry.id).then((g) => {
      if (!alive) return
      setGuide({ id: entry.id, g })
      // a first-open hint for pieces whose interaction would otherwise be hidden
      if (g?.interact.gestures?.length && entry.kind !== 'game') setHint(true)
    })
    return () => {
      alive = false
    }
  }, [entry])

  useEffect(() => {
    if (!hint) return
    const id = window.setTimeout(() => setHint(false), 5200)
    return () => window.clearTimeout(id)
  }, [hint])

  const layout: 'side' | 'sheet' = wide ? 'side' : 'sheet'
  const covered = notesOpen && layout === 'sheet'

  const onKeyEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (notesOpen) onNotes(false)
      else onClose()
    },
    [notesOpen, onNotes, onClose],
  )

  useEffect(() => {
    if (!entry) return
    const html = document.documentElement
    html.classList.add('pg-viewing')
    const onVis = () => setHidden(document.hidden)
    window.addEventListener('keydown', onKeyEsc)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      html.classList.remove('pg-viewing')
      window.removeEventListener('keydown', onKeyEsc)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [entry, onKeyEsc])

  // focus follows the reading: the stage for play, the notes for reading
  useEffect(() => {
    if (!entry) return
    const id = window.setTimeout(() => {
      const el = notesOpen ? document.querySelector<HTMLElement>('.pg-notes') : stageRef.current
      el?.focus({ preventScroll: true })
    }, 30)
    return () => window.clearTimeout(id)
  }, [entry, notesOpen])

  if (!entry) return null

  const g = guide && guide.id === entry.id ? guide.g : null
  const prev = entries[(index - 1 + entries.length) % entries.length]
  const next = entries[(index + 1) % entries.length]
  // hand focus back to the stage so Space and arrows reach the piece, not the button
  const refocus = () => stageRef.current?.focus({ preventScroll: true })
  const send = (code: string, down: boolean) => keyBus.current?.(code, down)
  const pad = g?.pad
  const firstGesture = g?.interact.gestures?.[0]

  return (
    <div
      className={`pg-viewer${entry.ground === 'night' ? ' is-night' : ''}`}
      data-pad={pad ? '' : undefined}
      data-notes={notesOpen ? layout : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pg-viewer-title"
    >
      <header className="pg-v-top">
        <p className="pg-viewer-id">
          <span>{entry.code}</span>
          <b id="pg-viewer-title">{entry.title}</b>
          <em>{entry.after ?? entry.theme}</em>
        </p>
        <div className="pg-viewer-actions">
          <button
            type="button"
            className={`pg-btn pg-btn--notes${notesOpen ? ' is-on' : ''}`}
            onClick={() => onNotes(!notesOpen)}
            aria-pressed={notesOpen}
            title="Notes: how it works"
          >
            {Icon.notes}
            <span className="pg-btn-label">Notes</span>
          </button>
          <span className="pg-v-sep" aria-hidden="true" />
          <button
            type="button"
            className="pg-btn pg-btn--icon"
            onClick={() => {
              setPaused((p) => !p)
              refocus()
            }}
            aria-pressed={paused}
            aria-label={paused ? 'Play' : 'Pause'}
            title={paused ? 'Play' : 'Pause'}
          >
            {paused ? Icon.play : Icon.pause}
          </button>
          <button
            type="button"
            className="pg-btn pg-btn--icon"
            onClick={() => {
              setRestart((r) => r + 1)
              setPaused(false)
              refocus()
            }}
            aria-label="Restart"
            title="Restart"
          >
            {Icon.restart}
          </button>
          <button
            type="button"
            className={`pg-btn pg-btn--sound${sound ? ' is-on' : ''}`}
            onClick={() => {
              setSound(!sound)
              refocus()
            }}
            aria-pressed={sound}
            aria-label={sound ? 'Sound on' : 'Sound off'}
            title={sound ? 'Sound on' : 'Sound off'}
          >
            <SoundIcon on={sound} />
            <span className="pg-btn-label">{sound ? 'On' : 'Off'}</span>
          </button>
          <span className="pg-v-sep" aria-hidden="true" />
          <button type="button" className="pg-btn pg-btn--icon pg-btn--nav" onClick={() => onNavigate(prev.id)} aria-label={`Previous: ${prev.title}`} title={prev.title}>
            {Icon.prev}
          </button>
          <button type="button" className="pg-btn pg-btn--icon pg-btn--nav" onClick={() => onNavigate(next.id)} aria-label={`Next: ${next.title}`} title={next.title}>
            {Icon.next}
          </button>
          <button type="button" className="pg-btn pg-btn--icon" onClick={onClose} aria-label="Close (Escape)" title="Close (Esc)">
            {Icon.close}
          </button>
        </div>
      </header>

      {pad && (
        <div className="pg-v-padl">
          <PadLeft pad={pad} send={send} />
        </div>
      )}

      <div ref={stageRef} className="pg-v-stage" tabIndex={-1} onPointerDown={() => setHint(false)}>
        <Stage
          key={entry.id}
          pieceKey={entry.key}
          mode="full"
          running={!paused && !hidden && !covered}
          restart={restart}
          keyBus={keyBus}
          label={`${entry.title}, ${entry.after ?? entry.theme}`}
        />
        <span className="pg-viewer-crop" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        {hint && firstGesture && (
          <p className="pg-v-hint" role="status">
            <GestureIcon kind={firstGesture.gesture} />
            {firstGesture.action}
          </p>
        )}
      </div>

      {pad && (
        <div className="pg-v-padr">
          <PadRight pad={pad} send={send} />
        </div>
      )}

      <footer className="pg-v-foot">
        {g ? <Legend interact={g.interact} className="pg-v-legend" maxKeys={3} maxGestures={2} /> : <p className="pg-viewer-controls">{entry.controls ?? entry.blurb}</p>}
        <button type="button" className="pg-v-foot-notes link-u" onClick={() => onNotes(true)}>
          How it works →
        </button>
      </footer>

      {notesOpen && <Notes entry={entry} guide={g} layout={layout} onClose={() => onNotes(false)} />}
    </div>
  )
}
