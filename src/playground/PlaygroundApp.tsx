import { Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Nav from '../components/Nav'
import BackToTop from '../components/ux/BackToTop'
import Divider from '../components/ux/Divider'
import ScrollRuler from '../components/ux/ScrollRuler'
import GridOverlay from '../components/ux/GridOverlay'
import Magnetic from '../components/ux/Magnetic'
import Card from './Card'
import { ALL, SHELVES, SHOWCASE } from './registry'
import { getSound, sfxEngine } from './sfx'
import Viewer from './Viewer'

const ResumeModal = lazy(() => import('../components/Resume'))

const CHAPTERS = ['A turn', 'Close is not enough', 'The golden angle', 'Bloom', 'Wind', 'Begin again']

const RULER = [
  { id: 'top', label: 'Playground', index: '00' },
  { id: 'showcase', label: 'Showcase', index: '01' },
  ...SHELVES.map((s) => ({ id: s.id, label: s.label, index: s.index })),
]
const TOTAL = ALL.length

/** '#stack' → { id: 'stack', notes: false }, '#stack/notes' → notes open */
const fromHash = () => {
  if (typeof window === 'undefined') return { id: null, notes: false }
  const [id, sub] = decodeURIComponent(window.location.hash.slice(1)).split('/')
  return ALL.some((e) => e.id === id) ? { id, notes: sub === 'notes' } : { id: null, notes: false }
}
const hashFor = (id: string, notes: boolean) => `#${id}${notes ? '/notes' : ''}`

export default function PlaygroundApp() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [notes, setNotes] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const pushed = useRef(false)

  // deep links (#golden-angle) and the back button
  useEffect(() => {
    const sync = () => {
      const { id, notes: n } = fromHash()
      setOpenId(id)
      setNotes(n)
      if (!id) {
        pushed.current = false
        sfxEngine.setEnabled(false)
      }
    }
    sync()
    // sound can only start from a gesture; resume it on the first one
    const wake = () => {
      if (getSound() && fromHash().id) sfxEngine.setEnabled(true)
    }
    window.addEventListener('popstate', sync)
    window.addEventListener('pointerdown', wake, { once: true })
    window.addEventListener('keydown', wake, { once: true })
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  const open = useCallback((id: string, from: HTMLElement, withNotes = false) => {
    opener.current = from
    if (getSound()) sfxEngine.setEnabled(true)
    window.history.pushState({ pg: id }, '', hashFor(id, withNotes))
    pushed.current = true
    setOpenId(id)
    setNotes(withNotes)
  }, [])

  const navigate = useCallback(
    (id: string) => {
      window.history.replaceState({ pg: id }, '', hashFor(id, notes))
      setOpenId(id)
    },
    [notes],
  )

  const toggleNotes = useCallback(
    (on: boolean) => {
      if (!openId) return
      window.history.replaceState({ pg: openId }, '', hashFor(openId, on))
      setNotes(on)
    },
    [openId],
  )

  const close = useCallback(() => {
    sfxEngine.setEnabled(false)
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setOpenId(null)
    const el = opener.current
    if (el) requestAnimationFrame(() => el.focus({ preventScroll: true }))
  }, [])

  const viewing = openId !== null

  return (
    <>
      <Nav page="playground" onResumeClick={() => setShowResume(true)} />
      <main id="top" className="pg" aria-hidden={viewing || undefined}>
        <header className="pg-hero container">
          <p className="label">(00) Playground</p>
          <h1 className="display pg-title">
            Play<em>ground</em>
          </h1>
          <div className="pg-hero-grid">
            <p className="pg-lede">
              A sketchbook of experiments made with AI as a collaborator: forty-two studies in motion, color, space and time, twelve small games
              after the arcade classics of the 1980s, and one long piece about how a single number grows a flower.
            </p>
            <dl className="pg-facts">
              <div>
                <dt>Pieces</dt>
                <dd>{TOTAL}</dd>
              </div>
              <div>
                <dt>Notes</dt>
                <dd>A long read for each</dd>
              </div>
              <div>
                <dt>Sound</dt>
                <dd>Web Audio, optional</dd>
              </div>
              <div>
                <dt>Video files</dt>
                <dd>0</dd>
              </div>
            </dl>
          </div>
          <nav className="pg-jump" aria-label="Sections">
            <a className="link-u" href="#showcase">
              <span>01</span> Showcase
            </a>
            {SHELVES.map((sh) => (
              <a key={sh.id} className="link-u" href={`#${sh.id}`}>
                <span>{sh.index}</span> {sh.label}
                <em>{sh.entries.length}</em>
              </a>
            ))}
          </nav>
        </header>

        <Divider index="01" label="Showcase" />
        <section id="showcase" className="section pg-section">
          <div className="container pg-feature">
            <Card entry={SHOWCASE} onOpen={open} paused={viewing} feature />
            <div className="pg-feature-text">
              <p className="label">
                {SHOWCASE.code} · {SHOWCASE.theme}
              </p>
              <h2 className="pg-feature-title">
                Golden <em>Angle</em>
              </h2>
              <p className="pg-feature-blurb">{SHOWCASE.blurb}</p>
              <ol className="pg-chapters">
                {CHAPTERS.map((c, i) => (
                  <li key={c}>
                    <span>{['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</span>
                    {c}
                  </li>
                ))}
              </ol>
              <div className="pg-feature-cta">
                <button type="button" className="pill pill--solid" onClick={(e) => open(SHOWCASE.id, e.currentTarget)}>
                  Open the piece <span aria-hidden="true">↗</span>
                </button>
                <button type="button" className="pill" onClick={(e) => open(SHOWCASE.id, e.currentTarget, true)}>
                  Read the notes
                </button>
                <span className="pg-feature-note">1 min 40 s · best with sound</span>
              </div>
            </div>
          </div>
        </section>

        {SHELVES.map((sh) => (
          <div key={sh.id} className="pg-shelf" data-shelf={sh.id}>
            <Divider index={sh.index} label={sh.divider} />
            <section id={sh.id} className="section pg-section">
              <div className="container">
                <div className="pg-section-head">
                  <p className="label">
                    ({sh.index}) {sh.label}
                  </p>
                  <h2 className="pg-section-title">
                    {sh.title[0]} <em>{sh.title[1]}</em>
                  </h2>
                  <p className="pg-section-lede">{sh.lede}</p>
                </div>
                <div className="pg-grid">
                  {sh.entries.map((e, i) => (
                    <Card key={e.id} entry={e} onOpen={open} paused={viewing} style={{ '--i': i % 3 } as CSSProperties} />
                  ))}
                </div>
              </div>
            </section>
          </div>
        ))}

        <footer className="pg-foot container">
          <p>
            Made with Claude as a collaborator, drawn live with Canvas 2D and Web Audio. Press <kbd>G</kbd> for the layout grid.
          </p>
          <a className="link-u" href="/">
            ← Back to the site
          </a>
        </footer>
      </main>

      <div className="sheet" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <ScrollRuler sections={RULER} />
      <BackToTop />
      <GridOverlay />
      <Magnetic />
      <Viewer entries={ALL} openId={openId} notesOpen={notes} onClose={close} onNavigate={navigate} onNotes={toggleNotes} />
      {showResume && (
        <Suspense fallback={null}>
          <ResumeModal isOpen onClose={() => setShowResume(false)} />
        </Suspense>
      )}
    </>
  )
}
