import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Clock, Plus, Repeat2, X } from '../../lib/icons'
import { formatDay, localDateKey } from '../../lib/dates'
import { toApiError } from '../../lib/errors'
import { relativeDateTime } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { usePatients } from '../patients/hooks'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/StateViews'
import { useCreateFollowUp, useFollowUps, useSetFollowUpStatus } from './hooks'
import type { FollowUp } from './api'

/** Follow-ups page: what's due, what's coming, what's done. */
export default function LiveFollowUps() {
  const list = useFollowUps()
  const now = useNow()
  const [adding, setAdding] = useState(false)
  const all = list.data ?? []
  const open = all.filter((f) => f.status === 'scheduled')
  const due = open.filter((f) => f.dueAt.getTime() <= now)
  const upcoming = open.filter((f) => f.dueAt.getTime() > now)
  const done = all.filter((f) => f.status === 'sent').reverse().slice(0, 10)

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Follow-ups</h1>
          <p className="text-[13px] text-[var(--stone)] mt-1">Reminders to reach a patient between sessions. Due ones also show on Overview.</p>
        </div>
        {!adding && <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={14} />New follow-up</button>}
      </div>

      {adding && <div className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] p-5"><FollowUpForm onDone={() => setAdding(false)} /></div>}

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <section className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden" aria-labelledby="due-h">
          <header className="px-5 py-4 border-b border-[var(--hairline)] flex items-center gap-2">
            <h2 id="due-h" className="text-[16px] font-semibold">Due now</h2>
            {!list.isLoading && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-canvas-parchment)] border border-[var(--hairline)] tabular-nums">{due.length}</span>}
          </header>
          {list.isLoading && <SkeletonRows rows={2} />}
          {list.error && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
          {!list.isLoading && !list.error && due.length === 0 && (
            <EmptyState icon={<Repeat2 size={18} />} title="Nothing due" description="Follow-ups appear here on the day they’re due." />
          )}
          <ul className="divide-y divide-[var(--hairline)]">{due.map((f) => <FollowUpRow key={f.id} f={f} overdue />)}</ul>
        </section>

        <section className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden" aria-labelledby="upcoming-h">
          <header className="px-5 py-4 border-b border-[var(--hairline)]"><h2 id="upcoming-h" className="text-[16px] font-semibold">Coming up</h2></header>
          {!list.isLoading && !list.error && upcoming.length === 0 && <p className="px-5 py-6 text-[12px] text-[var(--stone)]">No follow-ups scheduled ahead.</p>}
          <ul className="divide-y divide-[var(--hairline)]">{upcoming.map((f) => <FollowUpRow key={f.id} f={f} />)}</ul>
          {done.length > 0 && (
            <>
              <p className="px-5 pt-4 text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">RECENTLY DONE</p>
              <ul className="divide-y divide-[var(--hairline)]">{done.map((f) => <FollowUpRow key={f.id} f={f} />)}</ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export function FollowUpRow({ f, overdue = false, compact = false }: { f: FollowUp; overdue?: boolean; compact?: boolean }) {
  const set = useSetFollowUpStatus()
  const [error, setError] = useState<string | null>(null)
  const act = (status: 'sent' | 'cancelled' | 'scheduled') => { setError(null); set.mutate({ id: f.id, status }, { onError: (e) => setError(toApiError(e).userMessage) }) }
  const isDone = f.status === 'sent'
  return (
    <li className={`flex items-start gap-3 ${compact ? 'py-3' : 'px-5 py-3.5'}`}>
      {!compact && <span className="w-9 h-9 rounded-full bg-[var(--color-canvas-parchment)] text-[var(--slate)] flex items-center justify-center shrink-0"><Clock size={15} /></span>}
      <div className="flex-1 min-w-0">
        {!compact && <Link to={`/app/patients/${f.patientId}`} className="text-[13px] font-semibold hover:underline">{f.patientName}</Link>}
        <p className={`text-[13px] ${compact ? '' : 'mt-0.5 text-[var(--slate)]'} ${isDone ? 'line-through text-[var(--stone)]' : ''}`}>{f.message}</p>
        <p className={`text-[11px] mt-1 ${overdue ? 'text-amber-700 font-medium' : 'text-[var(--stone)]'}`}>{isDone ? `Done ${f.sentAt ? relativeDateTime(f.sentAt) : ''}` : `Due ${formatDay(f.dueAt)}`}</p>
        {error && <p role="alert" className="text-[12px] text-[var(--badge-rose-fg)] mt-1">{error}</p>}
      </div>
      {isDone ? (
        <button className="btn-quiet" disabled={set.isPending} onClick={() => act('scheduled')}>Undo</button>
      ) : (
        <div className="flex gap-1.5 shrink-0">
          <button className="btn-quiet btn-quiet--next" disabled={set.isPending} onClick={() => act('sent')}><Check size={13} />Done</button>
          <button aria-label="Remove follow-up" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-canvas-parchment)] text-[var(--stone)]" disabled={set.isPending} onClick={() => act('cancelled')}><X size={13} /></button>
        </div>
      )}
    </li>
  )
}

export function FollowUpForm({ patientId, onDone }: { patientId?: string; onDone: () => void }) {
  const patients = usePatients()
  const create = useCreateFollowUp()
  const [pid, setPid] = useState(patientId ?? '')
  const [date, setDate] = useState(() => localDateKey(new Date(Date.now() + 7 * 86_400_000)))
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault(); setErrors({}); setNotice(null)
    create.mutate({ patientId: pid, dueAt: new Date(`${date}T09:00:00+05:30`), message }, {
      onSuccess: onDone,
      onError: (err) => { const a = toApiError(err); if (a.fields) setErrors(a.fields); else setNotice(a.userMessage) },
    })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {notice && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{notice}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {!patientId && (
          <div>
            <label htmlFor="fu-patient" className="field-label">Patient</label>
            <select id="fu-patient" className="field" value={pid} onChange={(e) => setPid(e.target.value)} aria-invalid={!!errors.patient}>
              <option value="">Choose a patient</option>
              {(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.patient && <p className="form-error">{errors.patient}</p>}
          </div>
        )}
        <div>
          <label htmlFor="fu-date" className="field-label">Due</label>
          <input id="fu-date" type="date" className="field" min={localDateKey(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
          {errors.due_at && <p className="form-error">{errors.due_at}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="fu-message" className="field-label">What to follow up on</label>
        <textarea id="fu-message" className="field" rows={2} maxLength={1000} placeholder="e.g. Ask how the morning routine went" value={message} aria-invalid={!!errors.message} onChange={(e) => setMessage(e.target.value)} />
        {errors.message && <p className="form-error">{errors.message}</p>}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add follow-up'}</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

/** Patient page card: this patient's open follow-ups and a quick add. */
export function PatientFollowUps({ patientId }: { patientId: string }) {
  const list = useFollowUps(patientId)
  const now = useNow()
  const [adding, setAdding] = useState(false)
  const open = (list.data ?? []).filter((f) => f.status === 'scheduled')
  return (
    <div className="rounded-[12px] border border-[var(--hairline)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] flex items-center gap-1.5"><Repeat2 size={12} /> FOLLOW-UPS</p>
        {!adding && <button className="text-[12px] font-medium text-[var(--ink)] hover:underline" onClick={() => setAdding(true)}>Add</button>}
      </div>
      {adding && <div className="mt-3"><FollowUpForm patientId={patientId} onDone={() => setAdding(false)} /></div>}
      {list.error && <ErrorState compact error={list.error} onRetry={() => void list.refetch()} />}
      {!list.isLoading && !list.error && open.length === 0 && !adding && <p className="text-[12px] text-[var(--stone)] mt-2">None scheduled.</p>}
      <ul className="divide-y divide-[var(--hairline)]">{open.map((f) => <FollowUpRow key={f.id} f={f} compact overdue={f.dueAt.getTime() <= now} />)}</ul>
    </div>
  )
}
