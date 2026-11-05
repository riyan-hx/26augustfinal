import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from '../../lib/icons'

/**
 * The one page-header pattern for every dashboard screen:
 * optional back link → title → one-line purpose, with the page's actions on
 * the right. Put the single primary action LAST in `actions` so it sits at
 * the far right on desktop and first-in-reach on mobile.
 */
export function PageHeader({ title, description, meta, actions, back, icon }: {
  title: ReactNode
  description?: ReactNode
  /** Small live facts under the description, e.g. "8 total · 2 awaiting". */
  meta?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  icon?: ReactNode
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1.5 mb-3 -ml-1 px-1 py-0.5 rounded-md text-[12px] font-semibold text-[var(--color-ink-muted-48)] hover:text-[var(--color-primary)] transition-colors">
          <ArrowLeft size={14} /> {back.label}
        </Link>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0 flex items-start gap-3">
          {icon && <span className="icon-tile mt-0.5 hidden sm:inline-flex">{icon}</span>}
          <div className="min-w-0">
            <h1 className="text-[26px] leading-[1.15] font-semibold tracking-tight text-[var(--color-ink)]">{title}</h1>
            {description && <p className="text-[13px] text-[var(--color-ink-muted-48)] mt-1.5 max-w-[640px] leading-relaxed">{description}</p>}
            {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-ink-muted-48)]">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end shrink-0">{actions}</div>}
      </div>
    </header>
  )
}

export type BadgeTone = 'green' | 'amber' | 'rose' | 'sky' | 'neutral'

/** Status pill. Tones are functional: green = paid/confirmed/active,
 *  amber = waiting on something, rose = cancelled/overdue, sky = new/info,
 *  neutral = done or archived. */
export function Badge({ tone, icon, children, className = '' }: { tone: BadgeTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return <span className={`badge badge--${tone} ${className}`}>{icon}{children}</span>
}
