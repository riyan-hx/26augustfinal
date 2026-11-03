import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CalendarPlus, X } from '../../lib/icons'
import { localDateKey } from '../../lib/dates'
import { toApiError } from '../../lib/errors'
import { formatINR } from '../../lib/money'
import { usePatients } from '../patients/hooks'
import { useSessionTypes } from '../practice/hooks'
import { useCreateBooking } from './hooks'

/** "New booking" button plus the dialog it opens. For patients who call or message directly. */
export function NewBookingButton({ className = 'btn-primary' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><CalendarPlus size={14} />New booking</button>
      {open && <NewBookingDialog onClose={() => setOpen(false)} />}
    </>
  )
}

export function NewBookingDialog({ onClose }: { onClose: () => void }) {
  const patients = usePatients()
  const types = useSessionTypes()
  const create = useCreateBooking()
  const active = (types.data ?? []).filter((t) => t.isActive)
  const hasPatients = (patients.data?.length ?? 0) > 0

  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [patientId, setPatientId] = useState('')
  const [person, setPerson] = useState({ fullName: '', email: '', phone: '' })
  const [typeId, setTypeId] = useState('')
  const [date, setDate] = useState(() => localDateKey(new Date(Date.now() + 86_400_000)))
  const [time, setTime] = useState('10:00')
  const [paid, setPaid] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const first = useRef<HTMLInputElement>(null)

  const sessionTypeId = typeId || active[0]?.id || ''
  const chosenType = active.find((t) => t.id === sessionTypeId)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    setErrors({}); setNotice(null)
    if (mode === 'existing' && !patientId) { setErrors({ patient: 'Choose a patient.' }); return }
    create.mutate({
      patient: mode === 'existing' ? { id: patientId } : person,
      sessionTypeId,
      startsAt: new Date(`${date}T${time}:00+05:30`),
      paid,
    }, {
      onSuccess: () => setDone(true),
      onError: (err) => {
        const api = toApiError(err)
        if (api.fields) setErrors(api.fields)
        else setNotice(api.userMessage)
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="nb-title" className="w-full sm:max-w-[520px] bg-white rounded-t-[20px] sm:rounded-[20px] shadow-xl max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 id="nb-title" className="text-[18px] font-semibold">{done ? 'Session booked' : 'New booking'}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-canvas-parchment)]"><X size={14} /></button>
        </header>

        {done ? (
          <div className="px-6 pb-6">
            <p className="text-[13px] text-[var(--stone)]">
              {chosenType?.name} on {new Date(`${date}T${time}:00+05:30`).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.{' '}
              {paid ? 'Marked as paid and added to your earnings.' : 'It shows as awaiting payment until you mark it paid.'}
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn-primary" onClick={onClose}>Done</button>
              <button className="btn-secondary" onClick={() => { setDone(false); setPerson({ fullName: '', email: '', phone: '' }); setPatientId('') }}>Book another</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="px-6 pb-6 space-y-4">
            {notice && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{notice}</p>}

            <div>
              <div className="flex items-center justify-between">
                <p className="field-label !mb-0">Patient</p>
                {hasPatients && (
                  <div className="flex text-[12px] rounded-full border border-[var(--hairline)] p-0.5">
                    {(['new', 'existing'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                        className={`px-3 py-1 rounded-full ${mode === m ? 'bg-[var(--color-neutral-strong)] text-white' : 'text-[var(--stone)]'}`}>{m === 'new' ? 'New' : 'Existing'}</button>
                    ))}
                  </div>
                )}
              </div>
              {mode === 'existing' ? (
                <div className="mt-2">
                  <select className="field" value={patientId} onChange={(e) => setPatientId(e.target.value)} aria-invalid={!!errors.patient}>
                    <option value="">Choose a patient</option>
                    {(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
                  </select>
                  {errors.patient && <p className="form-error">{errors.patient}</p>}
                </div>
              ) : (
                <div className="mt-2 grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input ref={first} className="field" placeholder="Full name" autoComplete="off" value={person.fullName} aria-invalid={!!errors.full_name} onChange={(e) => setPerson({ ...person, fullName: e.target.value })} />
                    {errors.full_name && <p className="form-error">{errors.full_name}</p>}
                  </div>
                  <div>
                    <input className="field" type="email" placeholder="Email" autoComplete="off" value={person.email} aria-invalid={!!errors.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
                    {errors.email && <p className="form-error">{errors.email}</p>}
                  </div>
                  <div>
                    <input className="field" type="tel" placeholder="Phone (optional)" autoComplete="off" value={person.phone} aria-invalid={!!errors.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
                    {errors.phone && <p className="form-error">{errors.phone}</p>}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="nb-type" className="field-label">Session</label>
              {active.length === 0 && !types.isLoading
                ? <p className="text-[12px] text-[var(--stone)]">Add a session type in Settings first.</p>
                : (
                  <select id="nb-type" className="field" value={sessionTypeId} onChange={(e) => setTypeId(e.target.value)}>
                    {active.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.durationMinutes} min · {formatINR(t.pricePaise)}</option>)}
                  </select>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nb-date" className="field-label">Date</label>
                <input id="nb-date" type="date" className="field" value={date} min={localDateKey(new Date())} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.starts_at} />
              </div>
              <div>
                <label htmlFor="nb-time" className="field-label">Time (IST)</label>
                <input id="nb-time" type="time" step={900} className="field" value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={!!errors.starts_at} />
              </div>
              {errors.starts_at && <p className="form-error col-span-2">{errors.starts_at}</p>}
            </div>

            <fieldset>
              <legend className="field-label">Payment</legend>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: false, t: 'Collect later', d: 'Shows as awaiting payment' }, { v: true, t: 'Already paid', d: 'UPI, cash or transfer' }].map((o) => (
                  <label key={String(o.v)} className={`rounded-xl border p-3 cursor-pointer ${paid === o.v ? 'border-[var(--color-neutral-strong)] bg-[var(--color-canvas-parchment)]' : 'border-[var(--hairline)]'}`}>
                    <input type="radio" name="nb-paid" className="sr-only" checked={paid === o.v} onChange={() => setPaid(o.v)} />
                    <span className="block text-[13px] font-semibold">{o.t}</span>
                    <span className="block text-[11px] text-[var(--stone)]">{o.d}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex gap-2 pt-1">
              <button className="btn-primary flex-1 justify-center" disabled={create.isPending || active.length === 0}>
                {create.isPending ? 'Booking…' : `Book${chosenType ? ` · ${formatINR(chosenType.pricePaise)}` : ''}`}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
