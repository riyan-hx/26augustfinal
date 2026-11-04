import { useSyncExternalStore } from 'react'

/** Which Overview design to show. 'v3' is the Figma redesign; 'classic' is the previous one. */
export type UiVersion = 'v3' | 'classic'

const KEY = 'lumid.ui'
const listeners = new Set<() => void>()

function read(): UiVersion {
  try { return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'v3' } catch { return 'v3' }
}

export function setUiVersion(v: UiVersion) {
  try { localStorage.setItem(KEY, v) } catch { /* private mode: keep for this session only */ }
  listeners.forEach((l) => l())
}

export function useUiVersion(): UiVersion {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, read, () => 'v3')
}
