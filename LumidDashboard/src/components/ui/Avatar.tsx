import { initials } from '../../lib/format'

/** Initials avatar. Uses an uploaded photo only when one exists — never a third-party placeholder. */
export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.3)) }
  if (src) {
    return <img src={src} alt="" style={style} className="rounded-full object-cover border border-[var(--hairline)] shrink-0" />
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="rounded-full bg-[var(--green-50)] border border-[var(--green-200)] inline-flex items-center justify-center font-bold text-[var(--green-700)] shrink-0"
    >
      {initials(name)}
    </span>
  )
}
