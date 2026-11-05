import type { ReactNode } from 'react'

/** Overview card surface: white with a soft hairline on the near-white canvas. */
export const card = 'bg-white rounded-[20px] border border-[#ecedea] shadow-[0_1px_2px_rgba(36,46,33,0.03)]'

/** Inner panel on a white card. */
export const panel = 'bg-[var(--color-surface-panel)] rounded-[14px]'

/** Card heading with an optional subtitle and right-hand slot. */
export function CardTitle({ id, title, sub, right }: { id: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-[16px] font-semibold tracking-tight">{title}</h2>
        {sub != null && <p className="text-[12px] text-[var(--stone)] mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export type Tone = 'green' | 'amber' | 'rose' | 'sky' | 'neutral'

const toneClass: Record<Tone, string> = {
  green: 'bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)]',
  amber: 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]',
  rose: 'bg-[var(--badge-rose-bg)] text-[var(--badge-rose-fg)]',
  sky: 'bg-[var(--badge-sky-bg)] text-[var(--badge-sky-fg)]',
  neutral: 'bg-[var(--color-surface-panel)] text-[var(--slate)]',
}

/** Rounded square icon tile in a status tone. */
export function IconTile({ children, tone = 'green', size = 34 }: { children: ReactNode; tone?: Tone; size?: number }) {
  return <span style={{ width: size, height: size }} className={`rounded-[10px] flex items-center justify-center shrink-0 ${toneClass[tone]}`}>{children}</span>
}

/** Small pill label. */
export function Pill({ tone = 'green', dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap tabular-nums ${toneClass[tone]}`}>
      {dot && <i aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Outlined pill action, as used in "Needs your attention". */
export const pillAction = 'inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full border border-[var(--hairline)] bg-white text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--color-surface-panel)] transition-colors shrink-0 disabled:opacity-50'
