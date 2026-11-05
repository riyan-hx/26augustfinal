import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)
}

/**
 * Modal focus handling: moves focus into `ref` on mount (preferring
 * `initial`), keeps Tab / Shift+Tab inside it, closes on Escape, and returns
 * focus to the element that had it before opening (or `returnTo`) on unmount.
 */
export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  onEscape: () => void,
  options: { initial?: RefObject<HTMLElement | null>; returnTo?: HTMLElement | null } = {},
) {
  const escape = useRef(onEscape)
  useEffect(() => { escape.current = onEscape })
  const { initial, returnTo } = options
  const returnRef = useRef(returnTo)

  useEffect(() => {
    const active = document.activeElement
    const opener = returnRef.current ?? (active instanceof HTMLElement && active !== document.body ? active : null)
    const root = ref.current
    if (root) {
      const target = initial?.current ?? focusables(root)[0] ?? root
      target.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      const el = ref.current
      if (!el) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        escape.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables(el)
      if (items.length === 0) { e.preventDefault(); el.focus(); return }
      const first = items[0]!
      const last = items[items.length - 1]!
      const active = document.activeElement
      if (!el.contains(active)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Deferred so it runs after React finishes the commit; skipped when
      // something else (e.g. a dialog opened from this one) has taken focus.
      if (opener) setTimeout(() => {
        const active = document.activeElement
        if (opener.isConnected && (!active || active === document.body)) opener.focus()
      }, 0)
    }
  }, [ref, initial])
}
