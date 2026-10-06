import { useEffect, useState } from 'react'
import { LOGO } from '../film/logo'
import { useActiveSection } from '../lib/scroll'

/*
 * Minimal fixed nav. mix-blend-mode: difference keeps it legible on the dark
 * film, the light page, and the dark contact section with a single color.
 * It tucks away while scrolling down and returns on the way up.
 */

interface NavProps {
  onResumeClick: () => void
  /** which page the nav sits on; section links point home from the Playground */
  page?: 'home' | 'playground'
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

export default function Nav({ onResumeClick, page = 'home' }: NavProps) {
  const [hidden, setHidden] = useState(false)
  const section = useActiveSection()
  const active = page === 'home' ? section : null
  const cls = (id: string, extra = '') => `link-u${extra}${active === id ? ' is-active' : ''}`
  const href = (id: string) => (page === 'home' ? `#${id}` : `/#${id}`)

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
      <a href={page === 'home' ? '#top' : '/'} className="nav-mark" aria-label={page === 'home' ? 'Zach Brewer — back to top' : 'Zach Brewer — home'}>
        <Mark />
        <span>Zach Brewer</span>
      </a>
      <nav className="nav-links" aria-label="Primary">
        <a className={cls('about', ' nav-optional')} href={href('about')} aria-current={active === 'about' ? 'location' : undefined}>
          About
        </a>
        <a className={cls('disciplines', ' nav-optional')} href={href('disciplines')} aria-current={active === 'disciplines' ? 'location' : undefined}>
          Disciplines
        </a>
        <a className={cls('experience', ' nav-optional')} href={href('experience')} aria-current={active === 'experience' ? 'location' : undefined}>
          Experience
        </a>
        <a
          className={`link-u${page === 'playground' ? ' is-active' : ''}`}
          href="/playground/"
          aria-current={page === 'playground' ? 'page' : undefined}
        >
          Playground
        </a>
        <a className={cls('contact')} href={href('contact')} aria-current={active === 'contact' ? 'location' : undefined}>
          Contact
        </a>
        <button type="button" className="nav-cta" onClick={onResumeClick}>
          Résumé
        </button>
      </nav>
    </header>
  )
}
