import { Check, Plus, X } from '../../lib/icons'
import {
  DAY_LONG, DAY_SHORT, HOURS_PRESETS, WEEK_ORDER, dayError, nextRange, presetActive, timeLabel, timeOptions,
  togglePreset, weekSummary, type Range, type Week,
} from './model'

interface Props { value: Week; onChange: (w: Week) => void; formError?: string }

export function StepHours({ value, onChange, formError }: Props) {
  const setDay = (day: number, ranges: Range[]) => onChange(value.map((r, i) => (i === day ? ranges : r)))
  const toggleDay = (day: number) => {
    if (value[day]!.length) return setDay(day, [])
    // A newly opened day copies the hours of the nearest open day, so a week fills in fast.
    const template = WEEK_ORDER.map((d) => value[d]!).find((r) => r.length)
    setDay(day, template ? template.map((r) => ({ ...r })) : [{ start: '10:00', end: '17:00' }])
  }
  const { days, hours } = weekSummary(value)

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="field-label">Start from a pattern</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {HOURS_PRESETS.map((p) => {
            const on = presetActive(value, p)
            return (
              <button key={p.id} type="button" className="ob-preset flex items-start gap-3" aria-pressed={on} onClick={() => onChange(togglePreset(value, p))}>
                <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${on ? 'bg-[var(--ob-forest)] border-[var(--ob-forest)] text-[var(--ob-lime)]' : 'border-[var(--ob-line-strong)] bg-white'}`} aria-hidden="true">
                  {on && <Check size={12} strokeWidth={2.6} />}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold">{p.label}</span>
                  <span className="block text-[12px] text-[var(--ob-muted)] mt-0.5">{p.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="ob-hint">Combine them — mornings and evenings on the same day is fine.</p>
      </fieldset>

      <fieldset>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <legend className="field-label !mb-0">Fine-tune each day</legend>
          <p className="text-[12px] font-semibold text-[var(--ob-moss)] tabular-nums" aria-live="polite">
            {days ? `${days} day${days === 1 ? '' : 's'} · ${hours} hrs a week` : 'No hours yet'}
          </p>
        </div>
        <div className="ob-card !rounded-[16px] !shadow-none divide-y divide-[var(--ob-line)]">
          {WEEK_ORDER.map((day) => {
            const ranges = value[day]!
            const err = dayError(ranges)
            return (
              <div key={day} className="flex items-start gap-3 sm:gap-4 px-3 sm:px-4 py-3">
                <button type="button" className="ob-day shrink-0" aria-pressed={ranges.length > 0} onClick={() => toggleDay(day)}
                  aria-label={`Open on ${DAY_LONG[day]}`}>
                  {DAY_SHORT[day]}
                </button>
                <div className="flex-1 min-w-0 min-h-[44px] flex flex-col justify-center gap-2">
                  {ranges.length === 0 && <p className="text-[13px] text-[var(--ob-muted)]">Closed</p>}
                  {ranges.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <TimeSelect label={`${DAY_LONG[day]} start ${i + 1}`} value={r.start}
                        onChange={(start) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, start } : x)))} invalid={!!err} />
                      <span className="text-[12px] text-[var(--ob-muted)]">to</span>
                      <TimeSelect label={`${DAY_LONG[day]} end ${i + 1}`} value={r.end}
                        onChange={(end) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, end } : x)))} invalid={!!err} />
                      <button type="button" className="ob-icon-btn" aria-label={`Remove ${timeLabel(r.start)} to ${timeLabel(r.end)} on ${DAY_LONG[day]}`}
                        onClick={() => setDay(day, ranges.filter((_, j) => j !== i))}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {err && <p className="form-error !mt-0" role="alert">{err}</p>}
                  {ranges.length > 0 && ranges.length < 4 && (
                    <button type="button" className="ob-link self-start inline-flex items-center gap-1 !text-[12px]"
                      onClick={() => setDay(day, [...ranges, nextRange(ranges)])}>
                      <Plus size={13} aria-hidden="true" /> Add hours
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="ob-hint">Times are in India time (IST). Patients only see open slots — never your other commitments.</p>
      </fieldset>
      {formError && <p className="form-error" role="alert">{formError}</p>}
    </div>
  )
}

function TimeSelect({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="field ob-time !py-2 !text-[13px]" aria-invalid={invalid || undefined}>
      {timeOptions(value).map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
    </select>
  )
}
