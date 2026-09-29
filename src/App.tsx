import { Suspense, lazy, useEffect, useState } from 'react'
import About from './components/About'
import Contact from './components/Contact'
import Crafts from './components/Crafts'
import Experience from './components/Experience'
import Hero from './components/Hero'
import Nav from './components/Nav'
import { toggleCommentary } from './film/director'
import BackToTop from './components/ux/BackToTop'
import Divider from './components/ux/Divider'
import GridOverlay from './components/ux/GridOverlay'
import Magnetic from './components/ux/Magnetic'
import ScrollRuler from './components/ux/ScrollRuler'
import Ticker from './components/ux/Ticker'

// Lazy-loaded so the PDF library is split into its own chunk and never enters
// the server/prerender bundle. Only fetched when the user opens the résumé.
const ResumeModal = lazy(() => import('./components/Resume'))

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

export default function App() {
  const [showResume, setShowResume] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // The one easter egg: the Konami code turns on the director's commentary,
  // which reveals the reel's rig (figure bounds, beat clock, fps, hitboxes).
  useEffect(() => {
    console.log(
      '%cZach Brewer%c  Software Engineer & Designer',
      'font: 400 22px "Instrument Serif", Georgia, serif; color: #122630; background: #f3f6f2; padding: 8px 4px 8px 12px;',
      'font: 12px "Geist Mono", monospace; color: #3f7a55; background: #f3f6f2; padding: 12px 12px 12px 4px;',
    )
    console.log(
      '%cThe reel above is drawn live on a canvas: six scenes, one clock, no video files.\n' +
        'The Konami code reveals the rig behind it.  ↑ ↑ ↓ ↓ ← → ← → B A',
      'font: 12px "Geist Mono", monospace; color: #2b6a93; line-height: 1.7;',
    )

    let i = 0
    let timer = 0
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      i = key === KONAMI[i] ? i + 1 : key === KONAMI[0] ? 1 : 0
      if (i < KONAMI.length) return
      i = 0
      const on = toggleCommentary()
      if (on === null) return
      setToast(on ? 'on' : 'off')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setToast(null), 2600)
      if (on && window.scrollY > window.innerHeight * 0.5) window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <Nav onResumeClick={() => setShowResume(true)} />
      <main>
        <Hero />
        <Divider index="01" label="Profile" />
        <About />
        <Divider index="02" label="Four practices" />
        <Crafts />
        <Ticker />
        <Divider index="03" label="2012 — present" />
        <Experience />
        <Contact onOpenResume={() => setShowResume(true)} />
      </main>
      <div className="sheet" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <ScrollRuler />
      <BackToTop />
      <GridOverlay />
      <Magnetic />
      <div className={`toast${toast ? ' is-on' : ''}`} role="status" aria-live="polite">
        {toast && (
          <>
            <b>Director&apos;s commentary</b> {toast}
          </>
        )}
      </div>
      {showResume && (
        <Suspense fallback={null}>
          <ResumeModal isOpen onClose={() => setShowResume(false)} />
        </Suspense>
      )}
    </>
  )
}
