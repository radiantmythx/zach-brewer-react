import { Suspense, lazy, useEffect, useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Experience from './components/Experience'
import About from './components/About'
import Contact from './components/Contact'
import PetalField from './components/PetalField'
import MigrationHUD from './components/MigrationHUD'
import { ERA_NAMES, startEraEngine, subscribeEra, triggerPetalStorm } from './era'

// Lazy-loaded so the PDF library is split into its own chunk and never enters
// the server/prerender bundle. Only fetched when the user opens the resume.
const ResumeModal = lazy(() => import('./components/Resume'))

export default function App() {
  const [showResume, setShowResume] = useState(false)
  const [crossEffect, setCrossEffect] = useState<'sweep' | 'bloom' | null>(null)

  // The era engine drives the whole page's mainframe → cloud migration:
  // scroll position interpolates the global palette CSS variables.
  useEffect(() => startEraEngine(), [])

  // Era-crossing moments — each fires ONCE per page load, and the effects
  // themselves migrate from digital to nature as the page progresses:
  //   entering era 2 → RGB glitch (pure digital artifact)
  //   entering era 3 → luminous scan-line sweep (softer, warmer)
  //   entering era 4 → bloom pulse + petal flurry (nature takes over)
  useEffect(() => {
    const eraIndex = (p: number) => ERA_NAMES.findIndex((e) => p <= e.until)
    const fired = new Set<number>()
    let lastEra = eraIndex(0)
    const timers: number[] = []

    const unsub = subscribeEra((p) => {
      const idx = eraIndex(p)
      if (idx > lastEra && !fired.has(idx)) {
        fired.add(idx)
        if (idx === 1) {
          document.documentElement.classList.add('era-glitch')
          timers.push(
            window.setTimeout(() => document.documentElement.classList.remove('era-glitch'), 320),
          )
        } else if (idx === 2) {
          setCrossEffect('sweep')
          timers.push(window.setTimeout(() => setCrossEffect(null), 1000))
        } else if (idx === 3) {
          setCrossEffect('bloom')
          triggerPetalStorm(0.4)
          timers.push(window.setTimeout(() => setCrossEffect(null), 1200))
        }
      }
      lastEra = idx
    })
    return () => {
      unsub()
      timers.forEach(clearTimeout)
    }
  }, [])

  // Engagement details: a DevTools calling card and a tab title that notices
  // when you leave.
  useEffect(() => {
    console.log(
      '%c❀ ZACH BREWER — MAINFRAME → CLOUD ❀',
      'color:#ff8fb8; font-family:monospace; font-size:14px; font-weight:bold; text-shadow:0 0 8px rgba(226,87,143,0.6)',
    )
    console.log(
      '%c    *  .  ❀     you found the console.\n' +
        '  .   ❀    *    there is a terminal on the homepage —\n' +
        '    ❀  *   .    try typing: sakura\n',
      'color:#46f78f; font-family:monospace;',
    )

    const originalTitle = document.title
    const onVisibility = () => {
      document.title = document.hidden ? '❀ migration paused — come back' : originalTitle
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.title = originalTitle
    }
  }, [])

  return (
    <>
      <Nav onResumeClick={() => setShowResume(true)} />
      <PetalField />
      <MigrationHUD />
      {crossEffect === 'sweep' && <div className="sweep-overlay" aria-hidden="true" />}
      {crossEffect === 'bloom' && <div className="bloom-pulse-overlay" aria-hidden="true" />}
      {showResume && (
        <Suspense fallback={null}>
          <ResumeModal isOpen onClose={() => setShowResume(false)} />
        </Suspense>
      )}
      <main>
        <Hero onOpenResume={() => setShowResume(true)} />
        <Experience />
        <About />
        <Contact />
      </main>
    </>
  )
}
