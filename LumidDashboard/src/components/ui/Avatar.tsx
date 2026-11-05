import { initials } from '../../lib/format'

// Muted, opaque tones (bg, ink). A person keeps the same one everywhere.
// Warm, low-chroma pairs that sit next to the green-led UI without competing.
const TONES: [string, string][] = [
  ['#E6F2DC', '#2F5D1E'], ['#E4EDF3', '#2C4A63'], ['#F5EBDD', '#6B4A26'], ['#ECE7F2', '#4E3D63'],
  ['#E0EFEA', '#25554F'], ['#F5E6E3', '#6E3434'], ['#EEEFDD', '#4D5326'], ['#ECEAE4', '#46493F'],
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
    return <img src={src} alt="" style={style} className="rounded-full object-cover ring-1 ring-[var(--hairline)] shrink-0" />
  }
  const [bg, ink] = toneFor(name)
  return (
    <span aria-hidden="true" style={{ ...style, background: bg, color: ink, boxShadow: 'inset 0 0 0 1px rgba(36, 46, 33, 0.06)' }}
      className="rounded-full inline-flex items-center justify-center font-semibold tracking-[0.02em] shrink-0 [text-box:trim-both_cap_alphabetic]">
      {initials(name)}
    </span>
  )
}
