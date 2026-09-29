import { useSyncExternalStore } from 'react'

/*
 * One passive scroll listener for the whole page. The ruler, the back-to-top
 * mark, the nav's scroll-spy and the ticker all read from here instead of
 * each binding their own.
 */

export const PAGE_SECTIONS = [
  { id: 'top', label: 'Reel', index: '00' },
  { id: 'about', label: 'About', index: '01' },
  { id: 'disciplines', label: 'Disciplines', index: '02' },
  { id: 'experience', label: 'Experience', index: '03' },
  { id: 'contact', label: 'Contact', index: '04' },
] as const

export type SectionId = (typeof PAGE_SECTIONS)[number]['id']

export interface ScrollState {
  y: number
  /** 0–1 through the whole document */
  progress: number
  /** px per second, smoothed */
  velocity: number
  active: SectionId
  /** each section's start, 0–1 through the document */
  marks: { id: SectionId; at: number }[]
}

let state: ScrollState = { y: 0, progress: 0, velocity: 0, active: 'top', marks: PAGE_SECTIONS.map((s, i) => ({ id: s.id, at: i / PAGE_SECTIONS.length })) }
const listeners = new Set<(s: ScrollState) => void>()
let bound = false
let lastY = 0
let lastT = 0

function measure(): ScrollState {
  const y = window.scrollY
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  const now = performance.now()
  const dt = Math.max(1, now - lastT)
  const inst = ((y - lastY) / dt) * 1000
  lastY = y
  lastT = now
  const velocity = state.velocity + (inst - state.velocity) * 0.25
  const marks = PAGE_SECTIONS.map((s) => {
    const el = document.getElementById(s.id)
    return { id: s.id, at: el ? Math.min(1, el.offsetTop / max) : 0 }
  })
  const probe = y + window.innerHeight * 0.4
  let active: SectionId = 'top'
  for (const s of PAGE_SECTIONS) {
    const el = document.getElementById(s.id)
    if (el && el.offsetTop <= probe) active = s.id
  }
  return { y, progress: Math.min(1, Math.max(0, y / max)), velocity, active, marks }
}

function emit() {
  state = measure()
  listeners.forEach((fn) => fn(state))
}

function bind() {
  if (bound || typeof window === 'undefined') return
  bound = true
  lastY = window.scrollY
  lastT = performance.now()
  window.addEventListener('scroll', emit, { passive: true })
  window.addEventListener('resize', emit)
  // velocity decays back to zero once scrolling stops
  window.setInterval(() => {
    if (Math.abs(state.velocity) > 1) emit()
  }, 120)
  requestAnimationFrame(emit)
}

export function subscribeScroll(fn: (s: ScrollState) => void) {
  bind()
  listeners.add(fn)
  fn(state)
  return () => {
    listeners.delete(fn)
  }
}

export const getScroll = () => state

/** Re-renders only when the active section changes. */
export function useActiveSection(): SectionId {
  return useSyncExternalStore(
    (cb) => subscribeScroll(cb),
    () => state.active,
    () => 'top',
  )
}

export function scrollToSection(id: SectionId) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: id === 'top' ? 0 : el.offsetTop, behavior: reduce ? 'auto' : 'smooth' })
}
