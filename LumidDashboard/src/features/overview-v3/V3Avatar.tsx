import { initials } from '../../lib/format'

const TONES = ['lime', 'sky', 'peach', 'lavender', 'sun'] as const
const TONE_COLORS: Record<(typeof TONES)[number], [string, string]> = {
  lime: ['var(--v3-lime-soft)', 'var(--v3-primary)'],
  sky: ['var(--v3-sky-soft)', 'var(--v3-sky)'],
  peach: ['var(--v3-peach-soft)', 'var(--v3-peach)'],
  lavender: ['var(--v3-lavender-soft)', 'var(--v3-lavender)'],
  sun: ['var(--v3-sun-soft)', 'var(--v3-sun)'],
}

/** Initials in one of the v3 accent tones; a person keeps the same tone everywhere. */
export function V3Avatar({ name, size = 36 }: { name: string; size?: number }) {
  let h = 0
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [bg, ink] = TONE_COLORS[TONES[h % TONES.length]!]
  return (
    <span aria-hidden="true" className="inline-flex items-center justify-center rounded-full shrink-0 font-medium text-[12px] leading-[16px]"
      style={{ width: size, height: size, background: bg, color: ink }}>
      {initials(name)}
    </span>
  )
}
