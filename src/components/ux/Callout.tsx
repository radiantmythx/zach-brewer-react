import { useRef, type ReactNode } from 'react'

/*
 * A technical-drawing callout on a phrase: a dotted hairline under the
 * text, and on hover or focus a leader line to a small annotated note.
 * Focusable, so it works by keyboard and by tap. When it opens, the note
 * is nudged sideways (--dx) to stay inside the viewport; the leader
 * counter-shifts so it still lands on the phrase.
 */

const EDGE = 12

export default function Callout({ note, title, children }: { note: string; title: string; children: ReactNode }) {
  const boxRef = useRef<HTMLSpanElement>(null)

  const place = () => {
    const box = boxRef.current
    if (!box || !box.offsetWidth) return
    const w = box.offsetWidth
    const vw = document.documentElement.clientWidth
    // untransformed left edge, then where the default -28% anchor puts it
    const shift = new DOMMatrixReadOnly(getComputedStyle(box).transform).m41
    const base = box.getBoundingClientRect().left - shift - 0.28 * w
    const lo = EDGE - base
    const hi = vw - EDGE - w - base
    box.style.setProperty('--dx', `${Math.round(Math.max(lo, Math.min(0, hi)))}px`)
  }
  const open = () => {
    place()
    requestAnimationFrame(place)
  }

  return (
    <span className="callout" tabIndex={0} onPointerEnter={open} onFocus={open}>
      <span className="callout-text">{children}</span>
      <span className="callout-box" role="note" ref={boxRef}>
        <b>{title}</b>
        <span>{note}</span>
      </span>
    </span>
  )
}
