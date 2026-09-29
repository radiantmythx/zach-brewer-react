import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { setDirectorTarget } from '../film/director'
import { FilmEngine } from '../film/engine'
import { attachFilm, seekSound, setSoundOn, subscribeSound, syncSound } from '../film/sound'
import { CHAPTER, CHAPTERS, LOOP, POSTER_TIME } from '../film/timeline'

/*
 * The hero is a stage for the film. It holds for a beat of scroll while the
 * frame recedes into a card on the paper page (clip-path inset driven by
 * --p), then scrolls away. Chapter bars double as a scrubber.
 */

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const fills = useRef<(HTMLSpanElement | null)[]>([])
  const engineRef = useRef<FilmEngine | null>(null)
  const inView = useRef(true)
  const [chapter, setChapter] = useState(0)
  const [paused, setPaused] = useState(false)
  const [sound, setSound] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => subscribeSound(setSound), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    let lastK = -1
    let engine: FilmEngine
    try {
      engine = new FilmEngine(canvas, {
        onFrame: (_t, k, p) => {
          fills.current.forEach((el, i) => {
            if (el) el.style.transform = `scaleX(${i < k ? 1 : i === k ? p.toFixed(4) : 0})`
          })
          if (k !== lastK) {
            lastK = k
            setChapter(k)
          }
        },
      })
    } catch {
      return
    }
    engineRef.current = engine
    setDirectorTarget(engine)
    if (import.meta.env.DEV) (window as unknown as { __film: FilmEngine }).__film = engine

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      engine.seek(POSTER_TIME)
      engine.pause()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion is only knowable on the client
      setPaused(true)
    }
    attachFilm(engine)

    const run = () => {
      if (inView.current && !document.hidden && !engine.paused) engine.start()
      else {
        engine.stop()
        engine.refresh()
      }
    }
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting
      run()
    })
    io.observe(section)
    const onVis = () => run()
    document.addEventListener('visibilitychange', onVis)

    // Fit the film between the nav and wherever the type block actually starts.
    const measure = () => {
      const inner = innerRef.current
      if (!inner) return
      const top = Math.min(84, canvas.clientHeight * 0.1) + 6
      engine.setSafeArea(top, inner.offsetTop - 18)
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

    // Canvas text uses Geist Mono — make sure it's requested even before CSS needs it.
    void document.fonts?.load('24px "Geist Mono"')

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

  const jump = (i: number) => {
    const e = engineRef.current
    if (!e) return
    const base = Math.floor(e.now() / LOOP) * LOOP
    const t = base + i * CHAPTER + (e.paused ? 4.2 : 0.02)
    e.seek(t)
    seekSound(t)
    e.refresh()
  }

  return (
    <section
      id="top"
      ref={sectionRef}
      className="hero"
      aria-label="Introduction"
      style={{ '--chapter': CHAPTERS[chapter].color } as CSSProperties}
    >
      <div className="hero-sticky">
        <div className="hero-stage" ref={stageRef}>
          <canvas ref={canvasRef} className={`film${ready ? ' is-ready' : ''}`} aria-hidden="true" />
          <p className="sr-only">
            A short looping film drawn live in your browser: a single line types a snippet of code, becomes a
            bezier curve in a design tool, turns into a game level with a little running character, and ends as a
            sound wave before starting over.
          </p>
          <div className="film-grain" aria-hidden="true" />
          <div className="film-vignette" aria-hidden="true" />

          <div className="hero-inner" ref={innerRef}>
            <div>
              <p className="hero-kicker">
                <i aria-hidden="true" />
                Software engineer · Designer · Hopkins, MN
              </p>
              <h1 className="hero-title">
                Zach <em>Brewer</em>
              </h1>
              <p className="hero-sub">
                I build enterprise systems by day, and games, interfaces and music the rest of the time, all with
                the same obsession for how things feel in motion.
              </p>
            </div>
            <div className="hero-controls">
              <button type="button" className="pill" onClick={togglePause} aria-pressed={paused} aria-label={paused ? 'Play film' : 'Pause film'}>
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
                {paused ? 'Play' : 'Pause'}
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
            </div>
          </div>

          <div className="chapters" role="group" aria-label="Film chapters">
            {CHAPTERS.map((c, i) => (
              <button
                type="button"
                key={c.id}
                className="chapter"
                style={{ '--c': c.color } as CSSProperties}
                aria-current={chapter === i ? 'step' : undefined}
                aria-label={`Chapter ${i + 1}: ${c.label}`}
                onClick={() => jump(i)}
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
