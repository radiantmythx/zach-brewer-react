import { Suspense, lazy, useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Experience from './components/Experience'
import About from './components/About'
import Contact from './components/Contact'

// Lazy-loaded so the PDF library is split into its own chunk and never enters
// the server/prerender bundle. Only fetched when the user opens the resume.
const ResumeModal = lazy(() => import('./components/Resume'))

export default function App() {
  const [showResume, setShowResume] = useState(false)

  return (
    <>
      <Nav onResumeClick={() => setShowResume(true)} />
      {showResume && (
        <Suspense fallback={null}>
          <ResumeModal isOpen onClose={() => setShowResume(false)} />
        </Suspense>
      )}
      <main>
        <Hero />
        <Experience />
        <About />
        <Contact />
      </main>
    </>
  )
}
