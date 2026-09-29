import { useEffect, useState } from 'react'
import { LOGO } from '../film/logo'

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
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d={LOGO.hex} fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
      <g fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
        <path d={LOGO.bars} />
        <path d={LOGO.diag} />
        <path d={LOGO.bowls} />
      </g>
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
