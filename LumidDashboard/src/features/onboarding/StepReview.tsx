import type { ReactNode } from 'react'
import { bookingUrlLabel } from '../../lib/links'
import { CalendarDays, Clock, Edit3, Globe, MapPin, Users } from '../../lib/icons'
import { Avatar } from '../../components/ui/Avatar'
import {
  DAY_SHORT, WEEK_ORDER, daysLabel, priceLabel, timeLabel, weekSummary,
  type AboutDraft, type SessionDraft, type StepId, type Week,
} from './model'

interface Props {
  about: AboutDraft
  slug: string
  sessions: SessionDraft[]
  week: Week
  published: boolean
  onEdit: (step: StepId) => void
  formError?: string
}

export function StepReview({ about, slug, sessions, week, published, onEdit, formError }: Props) {
  const active = sessions.filter((s) => s.isActive)
  const { days, hours } = weekSummary(week)
  // Group days with identical hours: "Mon–Fri · 9:00 AM – 1:00 PM, 5:00 PM – 8:00 PM".
  const groups = new Map<string, number[]>()
  for (const d of WEEK_ORDER) {
    const ranges = week[d]!
    if (!ranges.length) continue
    const key = ranges.map((r) => `${timeLabel(r.start)} – ${timeLabel(r.end)}`).join(', ')
    groups.set(key, [...(groups.get(key) ?? []), d])
  }

  return (
    <div className="space-y-3">
      <Section title="About you" icon={<Users size={16} />} onEdit={() => onEdit('about')}>
        <div className="flex items-center gap-3">
          <Avatar name={about.displayName || '?'} size={40} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate">{about.displayName}</p>
            <p className="text-[13px] text-[var(--ob-muted)] truncate">{about.title || 'Psychologist'}</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--ob-muted)]">
          <span className="inline-flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{about.city || 'No city yet'}</span>
          <span className="inline-flex items-center gap-1.5"><Globe size={13} aria-hidden="true" />{about.languages.join(', ') || 'No languages yet'}</span>
        </div>
        {!about.bio.trim() && <p className="mt-2 text-[12px] text-[#9a5b00]">No bio yet — a few lines help patients feel at ease.</p>}
      </Section>

      <Section title="Your link" icon={<Globe size={16} />} onEdit={() => onEdit('link')}>
        <p className="text-[14px] font-semibold break-all">{bookingUrlLabel(slug)}</p>
      </Section>

      <Section title="Sessions" icon={<Clock size={16} />} onEdit={() => onEdit('sessions')}>
        <ul className="space-y-1.5">
          {active.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="truncate">{s.name} <span className="text-[var(--ob-muted)]">· {s.durationMinutes} min</span></span>
              <span className="font-semibold tabular-nums shrink-0">{priceLabel(s.priceText)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Weekly hours" icon={<CalendarDays size={16} />} onEdit={() => onEdit('hours')}>
        <ul className="space-y-1 text-[13px]">
          {[...groups].map(([label, ds]) => (
            <li key={label}><span className="font-semibold">{daysLabel(ds)}</span> <span className="text-[var(--ob-muted)]">· {label}</span></li>
          ))}
        </ul>
        <p className="mt-1.5 text-[12px] text-[var(--ob-muted)]">
          {days} day{days === 1 ? '' : 's'} · {hours} hrs a week · closed {WEEK_ORDER.filter((d) => !week[d]!.length).map((d) => DAY_SHORT[d]).join(', ') || 'never'}
        </p>
      </Section>

      <p className="pt-2 text-[13px] leading-relaxed text-[var(--ob-muted)]">
        {published
          ? 'Your page is already live. Any changes you made are saved and showing.'
          : 'Publishing makes your page visible at your link. You can pause it anytime from Settings.'}
      </p>
      {formError && <p className="form-error" role="alert">{formError}</p>}
    </div>
  )
}

function Section({ title, icon, onEdit, children }: { title: string; icon: ReactNode; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="ob-card !rounded-[16px] !shadow-none p-4 sm:p-5" aria-label={title}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--ob-muted)]">
          <span className="text-[var(--ob-moss)]" aria-hidden="true">{icon}</span>{title}
        </h2>
        <button type="button" className="ob-link inline-flex items-center gap-1 !text-[12px]" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}>
          <Edit3 size={13} aria-hidden="true" /> Edit
        </button>
      </div>
      {children}
    </section>
  )
}
