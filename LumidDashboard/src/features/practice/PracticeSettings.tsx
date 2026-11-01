import { useEffect, useState, type FormEvent } from 'react'
import { Calendar, Check, Globe, Settings, Shield, Trash2, Plus, Clock } from '../../lib/icons'
import { formatINR, parseRupeesToPaise } from '../../lib/money'
import { toApiError } from '../../lib/errors'
import { isDemoMode } from '../../lib/env'
import { ErrorState, PrimaryButton, Skeleton } from '../../components/ui/StateViews'
import { useAuth } from '../auth/AuthProvider'
import { bookingUrl, bookingUrlParts } from '../../lib/links'
import {
  useArchiveSessionType, useAvailability, useProfile, usePublish, useSaveSessionType,
  useSaveWeeklyHours, useSessionTypes, useSetupStatus, useUpdateProfile,
} from './hooks'
import type { AvailabilityRule, PracticeProfile, SessionType } from '../../types/domain'

const sections = [
  { id: 'profile', label: 'Profile & link', icon: Globe },
  { id: 'sessions', label: 'Session types', icon: Clock },
  { id: 'hours', label: 'Weekly hours', icon: Calendar },
  { id: 'privacy', label: 'Privacy & account', icon: Shield },
] as const

const card = 'bg-white border border-[var(--hairline)] rounded-[16px] p-5 scroll-mt-20'

export default function PracticeSettings() {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6 max-w-[1040px]">
      <h1 className="font-serif text-[26px] font-semibold tracking-tight flex items-center gap-2"><Settings size={20} className="text-[var(--green-700)]" /> Practice settings</h1>
      <p className="text-[12px] text-[var(--stone)] mt-1">Everything your public booking page uses. Changes save per section.</p>

      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-6">
        <nav aria-label="Settings sections" className="bg-white border border-[var(--hairline)] rounded-[16px] p-2 h-fit lg:sticky lg:top-[68px]">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium hover:bg-[var(--canvas)] text-[var(--slate)]">
              <s.icon size={16} /> {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-4 min-w-0">
          <PublishCard />
          <ProfileSection />
          <SessionTypesSection />
          <WeeklyHoursSection />
          <PrivacySection />
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- publish */

function PublishCard() {
  const { status, isLoading, profile } = useSetupStatus()
  const publish = usePublish()
  if (isLoading || !status) return <Skeleton className="h-[88px] rounded-[16px]" />

  const ready = status.hasProfile && status.hasSlug && status.hasSessionTypes && status.hasAvailability
  const error = publish.error ? toApiError(publish.error) : null

  return (
    <div className={`${card} flex flex-col sm:flex-row sm:items-center gap-4`}>
      <div className="flex-1">
        <p className="text-[13px] font-semibold">{status.published ? 'Your booking page is live' : 'Your booking page is not published'}</p>
        <p className="text-[12px] text-[var(--stone)] mt-1">
          {status.published && profile?.slug
            ? bookingUrl(profile.slug)
            : ready ? 'Everything is set. Publish to start taking bookings.' : 'Add your link, a session type and weekly hours to publish.'}
        </p>
        {error && <p className="form-error">{error.code === 'PUBLISH_REQUIREMENTS' ? 'Finish the sections below before publishing.' : error.userMessage}</p>}
      </div>
      {status.published ? (
        <button className="btn-secondary" disabled={publish.isPending} onClick={() => publish.mutate(false)}>Unpublish</button>
      ) : (
        <PrimaryButton disabled={!ready} loading={publish.isPending} onClick={() => publish.mutate(true)}>Publish page</PrimaryButton>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- profile */

function ProfileSection() {
  const { data, isLoading, error, refetch } = useProfile()
  return (
    <section id="profile" className={card} aria-labelledby="profile-h">
      <h2 id="profile-h" className="text-[13px] font-semibold">Profile & link</h2>
      <p className="text-[12px] text-[var(--stone)] mt-1">Shown to patients on your booking page.</p>
      {isLoading && <div className="mt-4 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-24" /></div>}
      {error && <ErrorState compact error={error} onRetry={() => void refetch()} />}
      {data && <ProfileForm profile={data} />}
    </section>
  )
}

function ProfileForm({ profile }: { profile: PracticeProfile }) {
  const save = useUpdateProfile()
  const [form, setForm] = useState({
    display_name: profile.displayName,
    title: profile.title,
    slug: profile.slug ?? '',
    city: profile.city,
    languages: profile.languages.join(', '),
    bio: profile.bio,
  })
  const [saved, setSaved] = useState(false)
  const fields = save.error ? toApiError(save.error).fields ?? {} : {}
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => { setSaved(false); setForm({ ...form, [k]: e.target.value }) }

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate(
      {
        display_name: form.display_name,
        title: form.title,
        slug: form.slug,
        city: form.city,
        bio: form.bio,
        languages: form.languages.split(',').map((l) => l.trim()).filter(Boolean),
        specialties: [],
        years_experience: null,
        rci_number: null,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid sm:grid-cols-2 gap-4">
      <Field id="display_name" label="Full name" value={form.display_name} onChange={set('display_name')} error={fields.display_name} />
      <Field id="title" label="Title" value={form.title} onChange={set('title')} error={fields.title} />
      <div className="sm:col-span-2">
        <label htmlFor="slug" className="field-label">Booking link</label>
        <div className="flex items-center gap-0 field !p-0 overflow-hidden" aria-invalid={fields.slug ? true : undefined}>
          <span className="hidden sm:inline px-3 text-[13px] text-[var(--stone)] border-r border-[var(--hairline)] bg-[var(--color-canvas-parchment)] py-2.5 whitespace-nowrap">{bookingUrlParts().prefix}</span>
          <input id="slug" value={form.slug} onChange={set('slug')} className="flex-1 px-3 py-2.5 outline-none text-[13px] min-w-0" placeholder="yourname" aria-describedby={fields.slug ? 'slug-err' : undefined} />
          {bookingUrlParts().suffix && <span className="px-3 text-[13px] text-[var(--stone)] py-2.5">{bookingUrlParts().suffix}</span>}
        </div>
        {fields.slug && <p id="slug-err" className="form-error">{fields.slug}</p>}
      </div>
      <Field id="city" label="City" value={form.city} onChange={set('city')} error={fields.city} />
      <Field id="languages" label="Languages (comma separated)" value={form.languages} onChange={set('languages')} error={fields.languages} />
      <div className="sm:col-span-2">
        <label htmlFor="bio" className="field-label">About you</label>
        <textarea id="bio" rows={4} value={form.bio} onChange={set('bio')} className="field resize-y" maxLength={2000} />
        {fields.bio && <p className="form-error">{fields.bio}</p>}
      </div>
      <FormFooter pending={save.isPending} saved={saved} error={save.error} />
    </form>
  )
}

/* ---------------------------------------------------------- session types */

function SessionTypesSection() {
  const { data, isLoading, error, refetch } = useSessionTypes()
  const [adding, setAdding] = useState(false)
  return (
    <section id="sessions" className={card} aria-labelledby="sessions-h">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="sessions-h" className="text-[13px] font-semibold">Session types</h2>
          <p className="text-[12px] text-[var(--stone)] mt-1">What patients can book, how long it runs, and the price.</p>
        </div>
        {!adding && <button className="btn-secondary" onClick={() => setAdding(true)}><Plus size={13} /> Add</button>}
      </div>
      {isLoading && <div className="mt-4 space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
      {error && <ErrorState compact error={error} onRetry={() => void refetch()} />}
      {data && data.length === 0 && !adding && (
        <p className="mt-4 text-[13px] text-[var(--stone)]">No session types yet. Add one — for example a 50-minute consultation at ₹1,500.</p>
      )}
      <div className="mt-4 space-y-2">
        {data?.map((t) => <SessionTypeRow key={t.id} type={t} />)}
        {adding && <SessionTypeForm onDone={() => setAdding(false)} />}
      </div>
    </section>
  )
}

function SessionTypeRow({ type }: { type: SessionType }) {
  const [editing, setEditing] = useState(false)
  const archive = useArchiveSessionType()
  if (editing) return <SessionTypeForm type={type} onDone={() => setEditing(false)} />
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--hairline)]">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{type.name}</p>
        <p className="text-[12px] text-[var(--stone)]">{type.durationMinutes} min • {formatINR(type.pricePaise)} • {type.bufferMinutes} min buffer</p>
      </div>
      <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
      <button className="btn-secondary !px-2.5" aria-label={`Remove ${type.name}`} disabled={archive.isPending} onClick={() => archive.mutate(type.id)}><Trash2 size={13} /></button>
    </div>
  )
}

function SessionTypeForm({ type, onDone }: { type?: SessionType; onDone: () => void }) {
  const save = useSaveSessionType()
  const [name, setName] = useState(type?.name ?? '')
  const [duration, setDuration] = useState(String(type?.durationMinutes ?? 50))
  const [price, setPrice] = useState(type ? String(type.pricePaise / 100) : '1500')
  const [buffer, setBuffer] = useState(String(type?.bufferMinutes ?? 10))
  const [localError, setLocalError] = useState<string | null>(null)
  const fields = save.error ? toApiError(save.error).fields ?? {} : {}

  function submit(e: FormEvent) {
    e.preventDefault()
    const pricePaise = parseRupeesToPaise(price)
    if (pricePaise === null) { setLocalError('Enter a price like 1500 or 1500.50.'); return }
    setLocalError(null)
    save.mutate(
      { id: type?.id, name, description: type?.description ?? '', duration_minutes: Number(duration), price_paise: pricePaise, buffer_minutes: Number(buffer), is_active: true },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="p-3 rounded-xl border border-[var(--color-neutral-strong)] grid sm:grid-cols-[1.6fr_0.7fr_0.8fr_0.7fr] gap-3 items-start">
      <Field id={`st-name-${type?.id ?? 'new'}`} label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fields.name} />
      <Field id={`st-dur-${type?.id ?? 'new'}`} label="Minutes" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} error={fields.duration_minutes} />
      <Field id={`st-price-${type?.id ?? 'new'}`} label="Price (₹)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={localError ?? fields.price_paise} />
      <Field id={`st-buf-${type?.id ?? 'new'}`} label="Buffer (min)" type="number" value={buffer} onChange={(e) => setBuffer(e.target.value)} error={fields.buffer_minutes} />
      <div className="sm:col-span-4 flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <PrimaryButton type="submit" loading={save.isPending}>Save</PrimaryButton>
      </div>
      {save.error && !Object.keys(fields).length && <p className="form-error sm:col-span-4">{toApiError(save.error).userMessage}</p>}
    </form>
  )
}

/* ----------------------------------------------------------- weekly hours */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
interface DayHours { on: boolean; start: string; end: string }

function toDays(rules: AvailabilityRule[]): DayHours[] {
  return WEEKDAYS.map((_, weekday) => {
    const r = rules.find((x) => x.weekday === weekday)
    return r ? { on: true, start: r.startTime, end: r.endTime } : { on: false, start: '10:00', end: '18:00' }
  })
}

function WeeklyHoursSection() {
  const { data, isLoading, error, refetch } = useAvailability()
  return (
    <section id="hours" className={card} aria-labelledby="hours-h">
      <h2 id="hours-h" className="text-[13px] font-semibold">Weekly hours</h2>
      <p className="text-[12px] text-[var(--stone)] mt-1">Patients can book inside these hours (India Standard Time). Sessions never cross midnight.</p>
      {isLoading && <div className="mt-4 space-y-2">{WEEKDAYS.map((d) => <Skeleton key={d} className="h-10" />)}</div>}
      {error && <ErrorState compact error={error} onRetry={() => void refetch()} />}
      {data && <WeeklyHoursForm rules={data} />}
    </section>
  )
}

function WeeklyHoursForm({ rules }: { rules: AvailabilityRule[] }) {
  const save = useSaveWeeklyHours()
  const [days, setDays] = useState<DayHours[]>(() => toDays(rules))
  const [saved, setSaved] = useState(false)
  useEffect(() => setDays(toDays(rules)), [rules])

  const invalid = days.some((d) => d.on && d.end <= d.start)
  const update = (i: number, patch: Partial<DayHours>) => {
    setSaved(false)
    setDays(days.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (invalid) return
    save.mutate(
      days.flatMap((d, weekday) => (d.on ? [{ weekday, start_time: d.start, end_time: d.end }] : [])),
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4">
      <div className="divide-y divide-[var(--hairline)]">
        {days.map((d, i) => (
          <div key={WEEKDAYS[i]} className="py-2.5 grid grid-cols-1 sm:grid-cols-[140px_1fr] items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-2 text-[13px] font-medium">
              <input type="checkbox" checked={d.on} onChange={(e) => update(i, { on: e.target.checked })} className="w-4 h-4 accent-[var(--color-neutral-strong)]" />
              {WEEKDAYS[i]}
            </label>
            {d.on ? (
              <div className="flex flex-wrap items-center gap-2">
                <input type="time" aria-label={`${WEEKDAYS[i]} start`} value={d.start} onChange={(e) => update(i, { start: e.target.value })} className="field !w-[116px] !py-2" />
                <span className="text-[12px] text-[var(--stone)]">to</span>
                <input type="time" aria-label={`${WEEKDAYS[i]} end`} value={d.end} onChange={(e) => update(i, { end: e.target.value })} aria-invalid={d.end <= d.start || undefined} className="field !w-[116px] !py-2" />
                {d.end <= d.start && <span className="form-error !mt-0">End must be after start</span>}
              </div>
            ) : (
              <span className="text-[12px] text-[var(--stone)]">Unavailable</span>
            )}
          </div>
        ))}
      </div>
      <FormFooter pending={save.isPending} saved={saved} error={save.error} disabled={invalid} />
    </form>
  )
}

/* ----------------------------------------------------------------- privacy */

function PrivacySection() {
  const auth = useAuth()
  return (
    <section id="privacy" className={card} aria-labelledby="privacy-h">
      <h2 id="privacy-h" className="text-[13px] font-semibold flex items-center gap-2"><Shield size={14} className="text-[var(--green-700)]" /> Privacy & account</h2>
      <div className="mt-3 space-y-2 text-[12px]">
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--hairline)]"><span>Private patient conversations</span><span className="text-[var(--stone)] font-medium">Never shared</span></div>
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--hairline)]"><span>Session notes</span><span className="text-[var(--stone)] font-medium">Encrypted, visible only to you</span></div>
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--hairline)]"><span>Payments</span><span className="text-[var(--stone)] font-medium">Processed by Razorpay</span></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-[12px] text-[var(--stone)] flex-1">Signed in as <span className="font-medium text-[var(--ink)]">{auth.email}</span>{isDemoMode && ' (demo)'}</p>
        {!isDemoMode && <button className="btn-secondary" onClick={() => void auth.signOut()}>Sign out</button>}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- shared */

function Field({ id, label, error, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} {...input} className="field" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} />
      {error && <p id={`${id}-err`} className="form-error">{error}</p>}
    </div>
  )
}

function FormFooter({ pending, saved, error, disabled }: { pending: boolean; saved: boolean; error: unknown; disabled?: boolean }) {
  const apiError = error ? toApiError(error) : null
  return (
    <div className="sm:col-span-2 flex items-center justify-end gap-3 mt-4">
      {apiError && !apiError.fields && <p className="form-error !mt-0 mr-auto">{apiError.userMessage}</p>}
      {saved && !pending && <span className="text-[12px] text-[var(--badge-green-fg)] inline-flex items-center gap-1" aria-live="polite"><Check size={13} /> Saved</span>}
      <PrimaryButton type="submit" loading={pending} disabled={disabled}>Save changes</PrimaryButton>
    </div>
  )
}
