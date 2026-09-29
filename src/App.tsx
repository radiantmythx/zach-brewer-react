import { Suspense, lazy, useEffect, useState } from 'react'
import About from './components/About'
import Contact from './components/Contact'
import Crafts from './components/Crafts'
import Experience from './components/Experience'
import Hero from './components/Hero'
import Nav from './components/Nav'
import { toggleCommentary } from './film/director'

// Lazy-loaded so the PDF library is split into its own chunk and never enters
// the server/prerender bundle. Only fetched when the user opens the résumé.
const ResumeModal = lazy(() => import('./components/Resume'))

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

export default function App() {
  const [showResume, setShowResume] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // The one easter egg: the Konami code turns on the director's commentary,
  // which reveals the film's rig (points, control polygons, clocks, fps).
  useEffect(() => {
    console.log(
      '%cZach Brewer%c  one line, four crafts',
      'font: 400 22px "Instrument Serif", Georgia, serif; color: #f2efe8; background: #08080a; padding: 8px 4px 8px 12px;',
      'font: 12px "Geist Mono", monospace; color: #ffc24d; background: #08080a; padding: 12px 12px 12px 4px;',
    )
    console.log(
      '%cThe film at the top of the page is drawn live: 520 points, four scenes, one clock, no video files.\n' +
        'Want to see the rig? Try the Konami code on the page.  ↑ ↑ ↓ ↓ ← → ← → B A',
      'font: 12px "Geist Mono", monospace; color: #7c9dff; line-height: 1.7;',
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
        <About />
        <Crafts />
        <Experience />
        <Contact onOpenResume={() => setShowResume(true)} />
      </main>
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
