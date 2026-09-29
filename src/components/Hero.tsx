import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { setDirectorTarget } from '../film/director'
import { FilmEngine } from '../film/engine'
import { attachFilm, seekSound, setSoundOn, subscribeSound, syncSound } from '../film/sound'
import { BEAT, CHAPTERS, REEL_END, REVEAL_BEAT, SNAP_BEAT } from '../film/timeline'

/*
 * The hero is a stage for the reel. While it plays, the copy is held back;
 * on the logo snap the real wordmark (HTML, for SEO and a11y) slams in under
 * the resolved mark. The stage then holds for a beat of scroll while the
 * frame recedes into a card on the page. Chapter bars double as a scrubber.
 */

const SEEN = 'zb-reel-seen'
const NAME = 'Zach Brewer'
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const chaptersRef = useRef<HTMLDivElement>(null)
  const fills = useRef<(HTMLSpanElement | null)[]>([])
  const engineRef = useRef<FilmEngine | null>(null)
  const inView = useRef(true)
  const [chapter, setChapter] = useState(-1)
  const [resolved, setResolved] = useState(true)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [sound, setSound] = useState(false)

  useEffect(() => subscribeSound(setSound), [])

  // Decide before first paint whether the reel plays, so the copy never flashes.
  useIsoLayoutEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN) === '1'
    } catch {
      /* storage blocked — just play */
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setResolved(seen || reduce)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    let lastK = -2
    let lastResolved: boolean | null = null
    let engine: FilmEngine
    try {
      engine = new FilmEngine(canvas, {
        onFrame: (T) => {
          const b = T / BEAT
          let k = -1
          CHAPTERS.forEach((c, i) => {
            const p = Math.min(1, Math.max(0, (b - c.from) / (c.to - c.from)))
            if (b >= c.from && b < c.to) k = i
            const el = fills.current[i]
            if (el) el.style.transform = `scaleX(${p.toFixed(4)})`
          })
          if (k !== lastK) {
            lastK = k
            setChapter(k)
          }
          const r = b >= REVEAL_BEAT
          if (r !== lastResolved) {
            lastResolved = r
            setResolved(r)
            if (r) {
              try {
                sessionStorage.setItem(SEEN, '1')
              } catch {
                /* ignore */
              }
            }
          }
        },
      })
    } catch {
      return
    }
    engineRef.current = engine
    setDirectorTarget(engine)
    if (import.meta.env.DEV) (window as unknown as { __film: FilmEngine }).__film = engine

    const run = () => {
      if (inView.current && !document.hidden && !engine.paused) engine.start()
      else {
        engine.stop()
        engine.refresh()
      }
    }

    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN) === '1'
    } catch {
      /* ignore */
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || seen) {
      engine.seek(REEL_END + 0.01)
      if (reduce) {
        engine.pause()
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion is only knowable on the client
        setPaused(true)
      }
    } else {
      // Hold the cold open until the display type is loaded (or 1.2s passes).
      engine.seek(0)
      engine.pause()
      const go = () => {
        if (engine.paused && engine.now() === 0) {
          engine.seek(0)
          engine.play()
          run()
        }
      }
      const fonts = document.fonts
      if (fonts) {
        Promise.race([
          Promise.all([fonts.load('800 100px Unbounded'), fonts.load('500 20px "Geist Mono"'), fonts.load('italic 400 40px "Instrument Serif"')]),
          new Promise((r) => setTimeout(r, 1200)),
        ]).then(go, go)
      } else go()
    }
    attachFilm(engine)

    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting
      run()
    })
    io.observe(section)
    const onVis = () => run()
    document.addEventListener('visibilitychange', onVis)

    // The reel plays between the nav and the chapter bar; the resolved logo
    // rests above wherever the hero copy actually starts.
    const measure = () => {
      const inner = innerRef.current
      const chapters = chaptersRef.current
      const controls = inner?.querySelector('.hero-controls')
      if (!inner || !chapters || !controls) return
      const base = canvas.getBoundingClientRect().top
      const top = Math.min(84, canvas.clientHeight * 0.1) + 4
      const bottom = Math.min(chapters.getBoundingClientRect().top, controls.getBoundingClientRect().top) - base
      engine.setSafeArea(top, bottom - 14, inner.getBoundingClientRect().top - base - 18)
    }
    measure()
    const ro = new ResizeObserver(() => {
      measure()
      engine.resize()
    })
    ro.observe(canvas)
    if (innerRef.current) ro.observe(innerRef.current)
    void document.fonts?.ready.then(measure)

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') engine.pointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const scrollFx = () => {
      const stage = stageRef.current
      if (!stage) return
      const travel = section.offsetHeight - window.innerHeight
      const p = travel > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel)) : 0
      stage.style.setProperty('--p', p.toFixed(4))
    }
    scrollFx()
    window.addEventListener('scroll', scrollFx, { passive: true })
    window.addEventListener('resize', scrollFx)

    engine.render(engine.now(), 1 / 60)
    run()
    setReady(true)

    return () => {
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', scrollFx)
      window.removeEventListener('resize', scrollFx)
      attachFilm(null)
      setDirectorTarget(null)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  const seekTo = (t: number) => {
    const e = engineRef.current
    if (!e) return
    e.seek(t)
    seekSound(t)
    e.refresh()
  }

  const togglePause = () => {
    const e = engineRef.current
    if (!e) return
    if (e.paused) {
      e.play()
      if (inView.current) e.start()
    } else {
      e.pause()
      e.stop()
      e.refresh()
    }
    setPaused(e.paused)
    syncSound()
  }

  const replay = () => {
    const e = engineRef.current
    if (e?.paused) {
      e.play()
      setPaused(false)
      syncSound()
      if (inView.current) e.start()
    }
    seekTo(0)
  }

  const cls = ['hero', ready ? 'is-ready' : '', resolved ? 'is-resolved' : 'is-reel'].filter(Boolean).join(' ')
  const accent = chapter >= 0 ? CHAPTERS[chapter].color : '#3DE3F5'

  return (
    <section id="top" ref={sectionRef} className={cls} aria-label="Introduction" style={{ '--chapter': accent } as CSSProperties}>
      <div className="hero-sticky">
        <div className="hero-stage" ref={stageRef}>
          <canvas ref={canvasRef} className={`film${ready ? ' is-ready' : ''}`} aria-hidden="true" />
          <p className="sr-only">
            A 24-second showreel drawn live in your browser: kinetic type, code assembling itself, vector shapes
            snapping to a grid, a top-down action RPG boss fight, and a music visualizer, resolving into the ZB
            logo.
          </p>
          <div className="film-grain" aria-hidden="true" />
          <div className="film-vignette" aria-hidden="true" />

          <div className="hero-inner" ref={innerRef}>
            <div className="hero-copy">
              <p className="hero-kicker">
                <i aria-hidden="true" />
                Software engineer · Designer · Hopkins, MN
              </p>
              <h1 className="hero-title">
                {[...NAME].map((ch, i) => (
                  <span key={i} className={ch === ' ' ? 'sp' : undefined} style={{ '--i': i } as CSSProperties}>
                    {ch}
                  </span>
                ))}
              </h1>
              <p className="hero-sub">
                I build enterprise systems by day, and games, interfaces and music the rest of the time, all with
                the same obsession for how things feel in motion.
              </p>
            </div>
            <div className="hero-controls">
              <button type="button" className="pill" onClick={togglePause} aria-pressed={paused} aria-label={paused ? 'Play' : 'Pause'}>
                {paused ? (
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3 1.5 L10.5 6 L3 10.5 Z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <rect x="2.5" y="1.5" width="2.4" height="9" rx="0.8" fill="currentColor" />
                    <rect x="7.1" y="1.5" width="2.4" height="9" rx="0.8" fill="currentColor" />
                  </svg>
                )}
              </button>
              <button type="button" className="pill" onClick={() => setSoundOn(!sound)} aria-pressed={sound}>
                <span className={`eq${sound ? ' is-on' : ''}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {sound ? 'Sound on' : 'Sound off'}
              </button>
              {resolved ? (
                <button type="button" className="pill" onClick={replay}>
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.2 6 A3.8 3.8 0 1 0 3.3 3.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M3.6 1 L3.3 3.4 L5.7 3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Replay
                </button>
              ) : (
                <button type="button" className="pill" onClick={() => seekTo(SNAP_BEAT * BEAT - 0.05)}>
                  Skip intro
                </button>
              )}
            </div>
          </div>

          <div className="chapters" role="group" aria-label="Reel chapters" ref={chaptersRef}>
            {CHAPTERS.map((c, i) => (
              <button
                type="button"
                key={c.id}
                className="chapter"
                style={{ '--c': c.color } as CSSProperties}
                aria-current={chapter === i ? 'step' : undefined}
                aria-label={`Play from chapter ${i + 1}: ${c.label}`}
                onClick={() => {
                  const e = engineRef.current
                  if (e?.paused) togglePause()
                  seekTo(c.from * BEAT)
                }}
              >
                <span className="chapter-track">
                  <span
                    className="chapter-fill"
                    ref={(el) => {
                      fills.current[i] = el
                    }}
                  />
                </span>
                <span className="chapter-num">0{i + 1}</span>
                <span className="chapter-name">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
