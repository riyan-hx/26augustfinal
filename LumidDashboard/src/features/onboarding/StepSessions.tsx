import { env } from '../../lib/env'
import { Clock, Plus } from '../../lib/icons'
import { DURATION_CHOICES, priceLabel, validateSession, type SessionDraft } from './model'
import { FieldError, Toggle } from './ui'

interface Props {
  value: SessionDraft[]
  onChange: (v: SessionDraft[]) => void
  showErrors: boolean
  formError?: string
}

export function StepSessions({ value, onChange, showErrors, formError }: Props) {
  const update = (key: string, patch: Partial<SessionDraft>) => onChange(value.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const add = () => {
    onChange([...value, {
      key: `custom-${crypto.randomUUID()}`, name: '', description: '', durationMinutes: 50, priceText: '', bufferMinutes: 10, isActive: true,
    }])
  }
  const activeCount = value.filter((s) => s.isActive).length

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--ob-muted)]" aria-live="polite">
        {activeCount === 0 ? 'Turn on at least one session to continue.' : `${activeCount} session type${activeCount === 1 ? '' : 's'} on your page`}
      </p>
      {value.map((s) => {
        const errs = showErrors ? validateSession(s) : {}
        const id = `ob-s-${s.key}`
        const durations = DURATION_CHOICES.includes(s.durationMinutes) ? DURATION_CHOICES : [...DURATION_CHOICES, s.durationMinutes].sort((a, b) => a - b)
        return (
          <div key={s.key} className="ob-session" data-on={s.isActive}>
            <div className="flex items-center gap-3 p-4">
              <Toggle checked={s.isActive} onChange={(v) => update(s.key, { isActive: v })} label={`Offer ${s.name || 'this session'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold truncate ${s.isActive ? '' : 'text-[var(--ob-muted)]'}`}>{s.name || 'New session'}</p>
                <p className="text-[12px] text-[var(--ob-muted)] inline-flex items-center gap-1">
                  <Clock size={12} aria-hidden="true" />{s.durationMinutes} min · {priceLabel(s.priceText)}
                </p>
              </div>
            </div>
            {s.isActive && (
              <div className="ob-fade grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 px-4 pb-4 pt-1 border-t border-[var(--ob-line)]">
                <div className="pt-3">
                  <label htmlFor={`${id}-name`} className="field-label">Name</label>
                  <input id={`${id}-name`} className="field" value={s.name} maxLength={80} placeholder="e.g. Couples session"
                    onChange={(e) => update(s.key, { name: e.target.value })}
                    aria-invalid={errs.name ? true : undefined} aria-describedby={errs.name ? `${id}-name-err` : undefined} />
                  <FieldError id={`${id}-name-err`}>{errs.name}</FieldError>
                </div>
                <div className="sm:pt-3">
                  <label htmlFor={`${id}-price`} className="field-label">Fee</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--ob-muted)]" aria-hidden="true">₹</span>
                    <input id={`${id}-price`} className="field !pl-8 tabular-nums" inputMode="decimal" value={s.priceText} placeholder="1500"
                      onChange={(e) => update(s.key, { priceText: e.target.value.replace(/[^\d.,]/g, '') })}
                      aria-invalid={errs.price ? true : undefined} aria-describedby={errs.price ? `${id}-price-err` : undefined} />
                  </div>
                  <FieldError id={`${id}-price-err`}>{errs.price}</FieldError>
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className="field-label">Length</legend>
                  <div className="flex flex-wrap gap-2">
                    {durations.map((d) => (
                      <button key={d} type="button" className="ob-chip tabular-nums" aria-pressed={s.durationMinutes === d}
                        onClick={() => update(s.key, { durationMinutes: d })}>{d} min</button>
                    ))}
                  </div>
                  <FieldError id={`${id}-dur-err`}>{errs.duration}</FieldError>
                </fieldset>
              </div>
            )}
          </div>
        )
      })}
      <button type="button" onClick={add} className="w-full ob-session !border-dashed !bg-transparent flex items-center justify-center gap-2 py-3.5 text-[13px] font-semibold text-[var(--ob-moss)] hover:!bg-white transition-colors">
        <Plus size={15} aria-hidden="true" /> Add another session type
      </button>
      <p className="ob-hint">{env.onlinePayments ? 'Patients pay online when they book.' : 'Patients pay at the session.'} Descriptions and gaps between sessions can be fine-tuned later in Settings.</p>
      {formError && <p className="form-error" role="alert">{formError}</p>}
    </div>
  )
}
