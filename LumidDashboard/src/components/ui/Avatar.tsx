import { initials } from '../../lib/format'

// Muted, opaque tones (bg, ink). A person keeps the same one everywhere.
const TONES: [string, string][] = [
  ['#E8F3E1', '#2F5D1E'], ['#E6EEF5', '#2C4A63'], ['#F4ECE2', '#6B4A26'], ['#EEE8F3', '#4E3D63'],
  ['#E3F1EF', '#25554F'], ['#F5E7E7', '#6E3434'], ['#EEF0E2', '#4D5326'], ['#E9ECEF', '#3E4650'],
]
function toneFor(name: string): [string, string] {
  let h = 0
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]!
}

/** Initials avatar. Uses an uploaded photo only when one exists — never a third-party placeholder. */
export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) }
  if (src) {
    return <img src={src} alt="" style={style} className="rounded-full object-cover border border-[var(--hairline)] shrink-0" />
  }
  const [bg, ink] = toneFor(name)
  return (
    <span aria-hidden="true" style={{ ...style, background: bg, color: ink }}
      className="rounded-full inline-flex items-center justify-center font-semibold tracking-[0.02em] shrink-0 [text-box:trim-both_cap_alphabetic]">
      {initials(name)}
    </span>
  )
}
