import { useSyncExternalStore } from 'react'

/* Visibility of the layout-grid overlay, shared by the G key and the colophon toggle. */

let on = false
const listeners = new Set<() => void>()

export const isGridOn = () => on

export function setGrid(next: boolean) {
  on = next
  listeners.forEach((fn) => fn())
}

export const toggleGrid = () => setGrid(!on)

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const useGrid = () => useSyncExternalStore(subscribe, isGridOn, () => false)
