import { useEffect, useRef, useState } from 'react'

/** Tweens a number linearly from its last rendered value to the new one, so
 *  a stat visibly recalculates instead of snapping when its filter changes.
 *  Shared by every page that pairs a segmented control with live counts
 *  (Overview's KPI row, Patients/Bookings' filter tabs, …). */
export function AnimatedNumber({ value, format, duration = 450 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration) // linear — no easing
      setDisplay(from + (to - from) * t)
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  const rounded = Math.round(display * 10) / 10
  return <>{format ? format(rounded) : Math.round(rounded)}</>
}

/** A segmented control whose active state is one pill that slides between
 *  options (measured off the real button, not a class swap) instead of the
 *  highlight just jumping. Pass `counts` to show a small badge per option —
 *  wrap it in AnimatedNumber at the call site if the count should tween too. */
export function SlidingTabs<T extends string>({ options, active, onChange, counts, size = 'md' }: {
  options: readonly T[]
  active: T
  onChange: (v: T) => void
  counts?: Partial<Record<T, number>>
  size?: 'sm' | 'md'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    const el = btnRefs.current[active]
    if (el && containerRef.current) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
  }, [active, options.length])

  const pad = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-1.5'

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5 bg-[var(--color-canvas-parchment)] w-fit max-w-full overflow-x-auto p-1 rounded-full border border-[var(--color-hairline)]">
      {indicator && (
        <span aria-hidden="true" className="absolute top-1 left-0 bottom-1 rounded-full bg-[var(--color-canvas)] shadow-sm transition-[transform,width] duration-300 ease-linear"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }} />
      )}
      {options.map(opt => (
        <button key={opt} ref={el => { btnRefs.current[opt] = el }} onClick={() => onChange(opt)}
          className={`relative z-10 shrink-0 ${pad} rounded-full text-[12px] font-medium transition-colors duration-300 inline-flex items-center gap-1.5 ${active === opt ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted-48)] hover:text-[var(--color-ink)]'}`}>
          {opt}
          {counts?.[opt] !== undefined && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[10px]"
              style={active === opt ? { background: 'var(--color-neutral-strong-soft)', color: 'var(--color-neutral-strong)' } : { background: 'var(--color-hairline)', color: 'var(--color-ink-muted-48)' }}>
              <AnimatedNumber value={counts[opt] as number} />
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
