// Per-tab memory for small UI values (e.g. a list's search text). Session
// storage can be unavailable (private mode, blocked storage), so every access
// is guarded and the app works without it.

export function readSessionValue(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

export function writeSessionValue(key: string, value: string): void {
  try {
    if (value) window.sessionStorage.setItem(key, value)
    else window.sessionStorage.removeItem(key)
  } catch {
    /* storage unavailable: the value just isn't remembered */
  }
}
