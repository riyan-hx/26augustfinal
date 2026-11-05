import { bookingUrlLabel } from '../../lib/links'
import { CalendarDays, Check, Clock, Edit3, Globe, ShieldCheck } from '../../lib/icons'
import { Avatar } from '../../components/ui/Avatar'
import { photoSrc } from '../../lib/photos'
import { AGREEMENTS, weekSummary, type AboutDraft, type SessionDraft, type StepId, type Week } from './model'

interface Props {
  about: AboutDraft
  slug: string
  sessions: SessionDraft[]
  week: Week
  checked: ReadonlySet<string>
  onToggle: (id: string) => void
  onEdit: (step: StepId) => void
  published: boolean
  formError?: string
}

/** Step 4: a one-glance summary, then the three things they confirm before going live. */
export function StepAgreement({ about, slug, sessions, week, checked, onToggle, onEdit, published, formError }: Props) {
  const active = sessions.filter((s) => s.isActive).length
  const { days, hours } = weekSummary(week)
  const tiles = [
    { step: 'profile' as const, tone: 'lime', icon: <Globe size={15} />, label: 'Your link', value: bookingUrlLabel(slug) },
    { step: 'sessions' as const, tone: 'peach', icon: <Clock size={15} />, label: 'Sessions', value: `${active} on your page` },
    { step: 'hours' as const, tone: 'sky', icon: <CalendarDays size={15} />, label: 'Weekly hours', value: `${days} day${days === 1 ? '' : 's'} · ${hours} hrs` },
  ]
  return (
    <div className="space-y-6">
      <section aria-label="Your page at a glance" className="ob-card !shadow-none p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Avatar name={about.displayName || '?'} src={photoSrc(about.photoPath)} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold truncate">{about.displayName}</p>
            <p className="text-[13px] text-[var(--ob-muted)] truncate">{about.title || 'Psychologist'}{about.languages.length ? ` · ${about.languages.join(', ')}` : ''}</p>
          </div>
          <button type="button" className="ob-link inline-flex items-center gap-1 !text-[12px]" onClick={() => onEdit('profile')} aria-label="Edit profile"><Edit3 size={13} aria-hidden="true" />Edit</button>
        </div>
        <ul className="mt-4 grid sm:grid-cols-3 gap-2">
          {tiles.map((t) => (
            <li key={t.label}>
              <button type="button" onClick={() => onEdit(t.step)} className={`ob-tile ob-tone-${t.tone} w-full text-left`} aria-label={`${t.label}: ${t.value}. Edit`}>
                <span className="ob-tile__icon" aria-hidden="true">{t.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] opacity-80">{t.label}</span>
                  <span className="block text-[13px] font-semibold truncate text-[var(--ob-ink)]">{t.value}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <fieldset className="space-y-2.5">
        <legend className="field-label"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-[var(--ob-violet)]" aria-hidden="true" />Before you go live, please confirm</span></legend>
        {AGREEMENTS.map((a) => {
          const on = checked.has(a.id)
          return (
            <label key={a.id} className="ob-agree" data-on={on}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(a.id)} />
              <span className="ob-agree__box" aria-hidden="true">{on && <Check size={13} strokeWidth={3} />}</span>
              <span className="text-[14px] leading-snug">{a.text}</span>
            </label>
          )
        })}
      </fieldset>

      <p className="text-[13px] leading-relaxed text-[var(--ob-muted)]">
        Lumid helps you run your practice — clinical decisions always stay with you.
        {published ? ' Your page is already live; changes show straight away.' : ' Publishing makes your page visible at your link. You can pause it anytime from Settings.'}
      </p>
      {formError && <p className="form-error" role="alert">{formError}</p>}
    </div>
  )
}
