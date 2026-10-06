import type { Guide } from './guide'

/* The notes behind each piece, code-split and loaded when a viewer opens. */

const mods = import.meta.glob<{ default: Guide }>('./guides/*.ts')

export function loadGuide(id: string): Promise<Guide | null> {
  const load = mods[`./guides/${id}.ts`]
  return load ? load().then((m) => m.default) : Promise.resolve(null)
}
