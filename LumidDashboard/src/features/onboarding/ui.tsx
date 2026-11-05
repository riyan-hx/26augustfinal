import type { ReactNode } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { env } from '../../lib/env'
import { bookingUrlLabel } from '../../lib/links'
import { Check, Clock, Globe, MapPin } from '../../lib/icons'
import { priceLabel, type AboutDraft, type SessionDraft } from './model'

export function Chip({ pressed, onClick, children, ghost }: { pressed?: boolean; onClick: () => void; children: ReactNode; ghost?: boolean }) {
  return (
    <button type="button" className={`ob-chip ${ghost ? 'ob-chip--ghost' : ''}`} aria-pressed={pressed ?? undefined} onClick={onClick}>
      {pressed && <Check size={13} strokeWidth={2.4} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="ob-toggle" onClick={() => onChange(!checked)} />
}

/** Inline field message. Not a live region itself: the field points at it with
 * aria-describedby, and the wizard announces errors once from a single region. */
export function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null
  return <p id={id} className="form-error">{children}</p>
}

/** A small, honest preview of the public booking page as it'll look to patients. */
export function BookingPreview({ about, slug, sessions, compact }: {
  about: AboutDraft; slug: string; sessions: SessionDraft[]; compact?: boolean
}) {
  const name = about.displayName.trim() || 'Your name'
  const active = sessions.filter((s) => s.isActive && s.name.trim())
  return (
    <figure className="ob-card overflow-hidden" aria-label="Preview of your booking page">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--ob-line)] bg-[var(--ob-warm)]">
        <span className="flex gap-1" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-[var(--ob-line-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--ob-line-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--ob-line-strong)]" />
        </span>
        <span className="flex-1 min-w-0 truncate text-center text-[11px] text-[var(--ob-muted)] font-medium">
          {slug ? bookingUrlLabel(slug) : 'your-link'}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3.5">
          <Avatar name={name} size={52} />
          <div className="min-w-0">
            <p className="text-[16px] font-semibold truncate">{name}</p>
            <p className="text-[13px] text-[var(--ob-muted)] truncate">{about.title.trim() || 'Psychologist'}</p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--ob-muted)]">
          <span className="inline-flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{about.city.trim() || 'City'}</span>
          <span className="inline-flex items-center gap-1.5 min-w-0"><Globe size={13} aria-hidden="true" />
            <span className="truncate">{about.languages.length ? about.languages.join(', ') : 'Languages'}</span>
          </span>
        </div>
        {!compact && about.bio.trim() && (
          <p className="mt-3.5 text-[13px] leading-relaxed text-[var(--ob-ink)]/80 line-clamp-3">{about.bio}</p>
        )}
        {!compact && (
          <div className="mt-4 space-y-2">
            {(active.length ? active : [null]).slice(0, 3).map((s, i) => (
              <div key={s?.key ?? i} className={`flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 ${s ? 'border-[var(--ob-line)]' : 'border-dashed border-[var(--ob-line-strong)]'}`}>
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold truncate ${s ? '' : 'text-[var(--ob-muted)]'}`}>{s?.name ?? 'Your sessions appear here'}</p>
                  {s && <p className="text-[11px] text-[var(--ob-muted)] inline-flex items-center gap-1"><Clock size={11} aria-hidden="true" />{s.durationMinutes} min</p>}
                </div>
                {s && <span className="text-[13px] font-semibold shrink-0">{priceLabel(s.priceText)}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-full bg-[var(--ob-forest)] text-white text-[13px] font-semibold text-center py-2.5" aria-hidden="true">
          Book a session
        </div>
        <p className="mt-2 text-center text-[11px] text-[var(--ob-muted)]">{env.onlinePayments ? 'Secure online payment' : 'Pay at the session'} · No account needed</p>
      </div>
      <figcaption className="sr-only">Updates as you type.</figcaption>
    </figure>
  )
}
