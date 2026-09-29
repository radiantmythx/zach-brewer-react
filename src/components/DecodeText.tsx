import { useEffect, useRef, useState } from 'react'

/*
 * Text that "decodes" from digital noise into words the first time it scrolls
 * into view — the site's ASCII-vs-nature thesis in one effect. The server
 * renders the real text (SEO/no-JS safe); the client scrambles it on mount
 * and reveals it left-to-right when observed. Skipped for reduced motion.
 */

const NOISE = '█▓▒░<>/\\|=+*#10'

function scramble(text: string, from: number): string {
  let out = text.slice(0, from)
  for (let i = from; i < text.length; i++) {
    out += text[i] === ' ' ? ' ' : NOISE[Math.floor(Math.random() * NOISE.length)]
  }
  return out
}

interface DecodeTextProps {
  text: string
  className?: string
}

export default function DecodeText({ text, className }: DecodeTextProps) {
  const [display, setDisplay] = useState(text)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional rewind: SSR shows real text, client scrambles before reveal
    setDisplay(scramble(text, 0))

    let interval = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return
        started.current = true
        observer.disconnect()

        let revealed = 0
        const step = Math.max(1, Math.round(text.length / 16))
        interval = window.setInterval(() => {
          revealed += step
          if (revealed >= text.length) {
            setDisplay(text)
            clearInterval(interval)
            return
          }
          setDisplay(scramble(text, revealed))
        }, 38)
      },
      { threshold: 0.35 },
    )
    observer.observe(el)

    // Safety net: if the observer never fires (exotic browsers, frozen tabs),
    // quietly restore the real text so it can't stay scrambled forever.
    const failsafe = window.setTimeout(() => {
      if (!started.current) {
        started.current = true
        observer.disconnect()
        setDisplay(text)
      }
    }, 12000)

    return () => {
      observer.disconnect()
      clearInterval(interval)
      clearTimeout(failsafe)
    }
  }, [text])

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{display}</span>
    </span>
  )
}
