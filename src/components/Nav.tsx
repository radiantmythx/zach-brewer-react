import { useEffect, useState } from 'react'

/*
 * Minimal fixed nav. mix-blend-mode: difference keeps it legible on the dark
 * film, the light page, and the dark contact section with a single color.
 * It tucks away while scrolling down and returns on the way up.
 */

interface NavProps {
  onResumeClick: () => void
}

export function Mark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 19 C 11 19, 13 5, 21 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="3" cy="19" r="1.9" fill="currentColor" />
      <circle cx="21" cy="5" r="1.9" fill="currentColor" />
    </svg>
  )
}

export default function Nav({ onResumeClick }: NavProps) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) < 6) return
      setHidden(y > last && y > 160)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav${hidden ? ' is-hidden' : ''}`} onFocus={() => setHidden(false)}>
      <a href="#top" className="nav-mark" aria-label="Zach Brewer — back to top">
        <Mark />
        <span>Zach Brewer</span>
      </a>
      <nav className="nav-links" aria-label="Primary">
        <a className="link-u nav-optional" href="#about">About</a>
        <a className="link-u nav-optional" href="#crafts">Crafts</a>
        <a className="link-u nav-optional" href="#experience">Experience</a>
        <a className="link-u" href="#contact">Contact</a>
        <button type="button" className="nav-cta" onClick={onResumeClick}>
          Résumé
        </button>
      </nav>
    </header>
  )
}
