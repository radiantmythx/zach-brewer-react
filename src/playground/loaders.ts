import type { CreatePiece } from './types'

/*
 * Every piece module, code-split and loaded on demand. Keys are paths
 * relative to src/playground without the extension: 'games/debris'.
 * New files are picked up automatically (handy for the solo test route).
 */

const mods = import.meta.glob<{ default: CreatePiece }>(['./motion/*.ts', './games/*.ts', './showcase/*.ts'])

export function loaderFor(key: string): (() => Promise<{ default: CreatePiece }>) | undefined {
  return mods[`./${key}.ts`]
}

export const allKeys = () => Object.keys(mods).map((k) => k.slice(2, -3))
