import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Check, Plus, Trash2, X } from '../../lib/icons'
import { toApiError } from '../../lib/errors'
import { ErrorState, PrimaryButton, Skeleton } from '../../components/ui/StateViews'
import { useProfileDetails, useSaveProfileDetails } from './hooks'
import type { ProfileDetails, Qualification } from './details'

const AREA_IDEAS = ['Anxiety & overwhelm', 'Stress & burnout', 'Procrastination', 'Low mood', 'Relationships', 'Self-esteem', 'Sleep', 'Grief & loss']
const APPROACH_IDEAS = ['CBT', 'ACT', 'DBT', 'Mindfulness-based', 'Solution-focused', 'Psychodynamic', 'Person-centred']
const AUDIENCE_IDEAS = ['Adults', 'Young adults (18–30)', 'Students', 'Working professionals', 'Couples', 'Parents']

const card = 'bg-white border border-[var(--hairline)] rounded-[16px] p-5 lg:p-6 scroll-mt-[120px]'

export function ProfileDetailsSection() {
  const { data, isLoading, error, refetch } = useProfileDetails()
  return (
    <section id="details" className={card} aria-labelledby="details-h">
      <h2 id="details-h" className="text-[16px] font-semibold">Profile details</h2>
      <p className="text-[12px] text-[var(--stone)] mt-1">Help patients choose you. Each part shows on your booking page once filled in; empty parts stay hidden.</p>
      {isLoading && <div className="mt-4 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-24" /><Skeleton className="h-10" /></div>}
      {error && <ErrorState compact error={error} onRetry={() => void refetch()} />}
      {data && <DetailsForm details={data} />}
    </section>
  )
}

function DetailsForm({ details }: { details: ProfileDetails }) {
  const save = useSaveProfileDetails()
  const [form, setForm] = useState({ ...details, years: details.yearsExperience === null ? '' : String(details.yearsExperience) })
  const [saved, setSaved] = useState(false)
  const fields = save.error ? toApiError(save.error).fields ?? {} : {}
  const update = (patch: Partial<typeof form>) => { setSaved(false); setForm((f) => ({ ...f, ...patch })) }
  const setQual = (i: number, patch: Partial<Qualification>) =>
    update({ qualifications: form.qualifications.map((q, j) => (j === i ? { ...q, ...patch } : q)) })

  function submit(e: FormEvent) {
    e.preventDefault()
    const years = form.years.trim()
    save.mutate({
      specialties: form.specialties, years_experience: years === '' ? null : Number(years), approach: form.approach,
      modalities: form.modalities, audiences: form.audiences,
      qualifications: form.qualifications
        .filter((q) => q.title.trim() || q.place.trim() || (q.year ?? '').trim())
        .map((q) => ({ title: q.title, place: q.place, year: q.year?.trim() ? q.year.trim() : null })),
      rci_number: form.rciNumber.trim() || null, show_rci: form.showRci && !!form.rciNumber.trim(),
    }, { onSuccess: () => setSaved(true) })
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-6">
      <div className="grid sm:grid-cols-[160px_1fr] gap-4">
        <div>
          <label htmlFor="years" className="field-label">Years of experience</label>
          <input id="years" inputMode="numeric" className="field" value={form.years} placeholder="e.g. 6"
            onChange={(e) => update({ years: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) })} aria-invalid={fields.years_experience ? true : undefined} />
          {fields.years_experience && <p className="form-error">{fields.years_experience}</p>}
        </div>
        <TagField id="specialties" label="Areas you help with" hint="Up to 12. Press Enter after each." values={form.specialties} max={12} itemMax={60}
          ideas={AREA_IDEAS} error={fields.specialties} onChange={(specialties) => update({ specialties })} />
      </div>

      <div>
        <label htmlFor="approach" className="field-label">How you work</label>
        <textarea id="approach" rows={4} maxLength={1500} className="field resize-y" value={form.approach}
          placeholder="What a first session looks like, how you work with clients, what they can expect."
          onChange={(e) => update({ approach: e.target.value })} />
        <p className="text-[11px] text-[var(--stone)] mt-1 text-right tabular-nums">{form.approach.length}/1500</p>
        {fields.approach && <p className="form-error">{fields.approach}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <TagField id="modalities" label="Approaches" hint="Up to 10." values={form.modalities} max={10} itemMax={40}
          ideas={APPROACH_IDEAS} error={fields.modalities} onChange={(modalities) => update({ modalities })} />
        <TagField id="audiences" label="Who you work with" hint="Up to 8." values={form.audiences} max={8} itemMax={60}
          ideas={AUDIENCE_IDEAS} error={fields.audiences} onChange={(audiences) => update({ audiences })} />
      </div>

      <fieldset>
        <legend className="field-label">Qualifications & training</legend>
        <div className="space-y-2">
          {form.qualifications.map((q, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_90px_auto] gap-2 items-start">
              <div className="col-span-2 sm:col-span-1">
                <input aria-label={`Qualification ${i + 1}`} className="field" placeholder="e.g. M.Phil in Clinical Psychology" maxLength={120}
                  value={q.title} onChange={(e) => setQual(i, { title: e.target.value })} aria-invalid={fields[`qualifications.${i}.title`] ? true : undefined} />
                {fields[`qualifications.${i}.title`] && <p className="form-error">{fields[`qualifications.${i}.title`]}</p>}
              </div>
              <input aria-label={`Institution or place ${i + 1}`} className="field" placeholder="Institution or city" maxLength={120}
                value={q.place} onChange={(e) => setQual(i, { place: e.target.value })} />
              <div>
                <input aria-label={`Year ${i + 1}`} inputMode="numeric" className="field" placeholder="Year" value={q.year ?? ''}
                  onChange={(e) => setQual(i, { year: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} aria-invalid={fields[`qualifications.${i}.year`] ? true : undefined} />
                {fields[`qualifications.${i}.year`] && <p className="form-error">{fields[`qualifications.${i}.year`]}</p>}
              </div>
              <button type="button" className="btn-quiet !min-h-[40px] !px-2.5" aria-label={`Remove qualification ${i + 1}`}
                onClick={() => update({ qualifications: form.qualifications.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        {form.qualifications.length < 8 && (
          <button type="button" className="btn-secondary mt-2" onClick={() => update({ qualifications: [...form.qualifications, { title: '', place: '', year: null }] })}>
            <Plus size={13} /> Add qualification
          </button>
        )}
        {fields.qualifications && <p className="form-error">{fields.qualifications}</p>}
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="rci" className="field-label">RCI registration number</label>
          <input id="rci" className="field" maxLength={40} placeholder="Optional" value={form.rciNumber} onChange={(e) => update({ rciNumber: e.target.value })} />
          {fields.rci_number && <p className="form-error">{fields.rci_number}</p>}
        </div>
        <label className={`flex items-center gap-2.5 text-[13px] min-h-[40px] ${form.rciNumber.trim() ? '' : 'opacity-50'}`}>
          <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" disabled={!form.rciNumber.trim()}
            checked={form.showRci && !!form.rciNumber.trim()} onChange={(e) => update({ showRci: e.target.checked })} />
          Show it on my booking page
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        {save.error && !toApiError(save.error).fields && <p className="form-error !mt-0 mr-auto">{toApiError(save.error).userMessage}</p>}
        {save.error && toApiError(save.error).fields && <p className="form-error !mt-0 mr-auto">Check the highlighted fields.</p>}
        {saved && !save.isPending && <span className="text-[12px] text-[var(--badge-green-fg)] inline-flex items-center gap-1" aria-live="polite"><Check size={13} /> Saved</span>}
        <PrimaryButton type="submit" loading={save.isPending}>Save details</PrimaryButton>
      </div>
    </form>
  )
}

function TagField({ id, label, hint, values, max, itemMax, ideas, error, onChange }: {
  id: string; label: string; hint: string; values: string[]; max: number; itemMax: number; ideas: string[]; error?: string
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const full = values.length >= max
  const add = (raw: string) => {
    const v = raw.trim().slice(0, itemMax)
    if (!v || full || values.some((x) => x.toLowerCase() === v.toLowerCase())) return
    onChange([...values, v])
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); setDraft('') }
    else if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1))
  }
  const unused = ideas.filter((i) => !values.some((v) => v.toLowerCase() === i.toLowerCase()))
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="field !h-auto flex flex-wrap gap-1.5 items-center !py-1.5" aria-invalid={error ? true : undefined}>
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-tint)] border border-[var(--hairline)] pl-2.5 pr-1 py-0.5 text-[12px] font-medium">
            {v}
            <button type="button" aria-label={`Remove ${v}`} className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-white" onClick={() => onChange(values.filter((x) => x !== v))}><X size={11} /></button>
          </span>
        ))}
        <input id={id} value={draft} disabled={full} maxLength={itemMax} placeholder={full ? 'Limit reached' : values.length ? 'Add another' : 'Type and press Enter'}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-[13px] py-1" onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
          onBlur={() => { if (draft.trim()) { add(draft); setDraft('') } }} />
      </div>
      <p className="text-[11px] text-[var(--stone)] mt-1">{hint}</p>
      {!full && unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.slice(0, 6).map((i) => (
            <button key={i} type="button" className="text-[11px] font-medium rounded-full border border-dashed border-[var(--hairline-strong,var(--hairline))] px-2.5 py-1 hover:bg-[var(--color-primary-tint)]" onClick={() => add(i)}>+ {i}</button>
          ))}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
