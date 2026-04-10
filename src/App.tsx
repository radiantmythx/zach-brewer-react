import { useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Work from './components/Work'
import About from './components/About'
import Contact from './components/Contact'
import ResumeModal from './components/Resume'

export default function App() {
  const [showResume, setShowResume] = useState(false)

  return (
    <>
      <Nav onResumeClick={() => setShowResume(true)} />
      <ResumeModal isOpen={showResume} onClose={() => setShowResume(false)} />
      <main>
        <Hero />
        <Work />
        <About />
        <Contact />
      </main>
    </>
  )
}
