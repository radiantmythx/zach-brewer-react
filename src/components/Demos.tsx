import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'

/*
 * Live demos: a panel listing the builds that live under /demo*, opened from the
 * nav and from the contact links. Cauldron Lake is a friend's site in preview, so it
 * sits behind a playful code prompt. Not security, just a door with a word on it:
 * the pages themselves are plain static files.
 */

interface Demo {
  title: string
  href: string
  kind: string
  blurb: string
  gated?: boolean
}

const DEMOS: Demo[] = [
  {
    title: 'Survivor',
    href: '/demo/',
    kind: 'Game engine · Canvas + React',
    blurb: 'A survivor-style action RPG engine: canvas runtime, React overlays, items, passives and bosses.',
  },
  {
    title: 'Nitro Type Trainer',
    href: '/demo-nitro-type/',
    kind: 'Tool · React + TypeScript',
    blurb: 'A configurable typing trainer with timed modes, modifiers and performance tracking.',
  },
  {
    title: 'Timing Trainer',
    href: '/demo-timing-trainer/',
    kind: 'Audio · Web Audio API',
    blurb: 'Rhythm practice with a scheduled metronome, microphone hit detection and latency calibration.',
  },
  {
    title: 'EQ Anywhere',
    href: '/demo-equalization-anywhere/',
    kind: 'Audio · Browser extension',
    blurb: 'The demo for a Chromium extension: a 10-band EQ and effects running on live audio.',
  },
  {
    title: 'Artist portfolio',
    href: '/demo-sites/artistic-portfolio-site/',
    kind: 'Client site · React',
    blurb: 'A portfolio site built so the artist edits a single file.',
  },
  {
    title: 'Cauldron Lake',
    href: '/demo-sites/cauldron-lake/',
    kind: 'Client site · Astro + three.js',
    blurb: 'A storefront for a 3D-printing studio, in three design directions. Private preview.',
    gated: true,
  },
]

const CODES = ['lorjun', 'Lorjun']

function DemosDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [gate, setGate] = useState<Demo | null>(null)
  const [code, setCode] = useState('')
  const [miss, setMiss] = useState(0)
  // keep the latest onClose without re-running the effect (showModal must run once)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (!d.open) d.showModal()
    const closed = () => onCloseRef.current()
    d.addEventListener('close', closed)
    document.documentElement.classList.add('is-locked')
    return () => {
      d.removeEventListener('close', closed)
      document.documentElement.classList.remove('is-locked')
    }
  }, [])

  // focus the code field when the prompt opens, and again after a miss (the shake remounts it)
  useEffect(() => {
    if (gate) input.current?.focus()
  }, [gate, miss])

  const close = () => ref.current?.close()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (gate && CODES.includes(code.trim())) {
      window.location.href = gate.href
      return
    }
    setMiss((m) => m + 1)
    setCode('')
  }

  return (
    <dialog
      ref={ref}
      className="demos"
      aria-labelledby="demos-title"
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      <div className="demos-panel">
        <header className="demos-head">
          <p className="demos-label">{gate ? 'Private preview' : 'Live demos'}</p>
          <h2 id="demos-title" className="demos-title">
            {gate ? gate.title : 'Things you can open and use'}
          </h2>
          <button type="button" className="demos-close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2 L12 12 M12 2 L2 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {gate ? (
          <form className="demos-gate" onSubmit={submit}>
            <p className="demos-gate-text">
              This one is a friend&apos;s site, still in preview. Enter the code to go in.
            </p>
            <label className="demos-gate-label" htmlFor="demos-code">
              Code
            </label>
            <div className={`demos-gate-row${miss ? ' is-miss' : ''}`} key={miss}>
              <input
                ref={input}
                id="demos-code"
                className="demos-gate-input"
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-describedby={miss ? 'demos-miss' : undefined}
              />
              <button type="submit" className="nav-cta demos-gate-go">
                Open
              </button>
            </div>
            <p id="demos-miss" className="demos-gate-miss" role="status" aria-live="polite">
              {miss ? 'Not quite. The lake stays misty.' : ''}
            </p>
            <button type="button" className="demos-back link-u" onClick={() => { setGate(null); setMiss(0); setCode('') }}>
              ← All demos
            </button>
          </form>
        ) : (
          <ol className="demos-list">
            {DEMOS.map((d, i) => (
              <li key={d.href}>
                {d.gated ? (
                  <button type="button" className="demos-item" onClick={() => setGate(d)}>
                    <Row demo={d} index={i} />
                  </button>
                ) : (
                  <a className="demos-item" href={d.href}>
                    <Row demo={d} index={i} />
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </dialog>
  )
}

function Row({ demo, index }: { demo: Demo; index: number }) {
  return (
    <>
      <span className="demos-no">{String(index + 1).padStart(2, '0')}</span>
      <span className="demos-body">
        <span className="demos-name">
          {demo.title}
          {demo.gated && (
            <svg className="demos-lock" viewBox="0 0 12 14" aria-label="needs a code" role="img">
              <rect x="1.5" y="6" width="9" height="6.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3.5 6 V4.2 a2.5 2.5 0 0 1 5 0 V6" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </span>
        <span className="demos-blurb">{demo.blurb}</span>
      </span>
      <span className="demos-kind">{demo.kind}</span>
      <svg className="demos-arrow" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 6 H9.5 M6.5 3 L9.5 6 L6.5 9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  )
}

/** The trigger: a nav link by default, or a pill for the contact links. */
export default function Demos({ variant = 'nav' }: { variant?: 'nav' | 'pill' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={variant === 'nav' ? 'link-u nav-demos' : 'pill'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Demos
      </button>
      {open && createPortal(<DemosDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}
