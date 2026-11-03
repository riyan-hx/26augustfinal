import { useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Video } from '../../lib/icons'
import { formatDateTime, localDateKey } from '../../lib/dates'
import { toApiError } from '../../lib/errors'
import { formatINR } from '../../lib/money'
import { groupSlotsByDay } from '../../lib/slots'
import { useNow } from '../../lib/useNow'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews'
import { getManagedBooking, getSlots, patientCancel, patientReschedule, type ManagedBooking } from './api'
import { Panel, Shell } from './PublicBookingPage'

const statusCopy: Record<string, { label: string; tone: string }> = {
  confirmed: { label: 'Confirmed', tone: 'bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)]' },
  pending_payment: { label: 'Reserved · pay before the session', tone: 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]' },
  completed: { label: 'Completed', tone: 'bg-[var(--color-canvas-parchment)] text-[var(--ink)]' },
  cancelled: { label: 'Cancelled', tone: 'bg-zinc-100 text-zinc-600' },
  expired: { label: 'Released', tone: 'bg-zinc-100 text-zinc-600' },
  no_show: { label: 'Missed', tone: 'bg-zinc-100 text-zinc-600' },
}

/** Patient self-service from the private link: see the booking, move it, or cancel it. */
export default function ManageBookingPage() {
  const { bookingId = '' } = useParams()
  const token = typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.slice(1)) : ''
  const booking = useQuery({ queryKey: ['manage', bookingId], queryFn: () => getManagedBooking(bookingId, token), retry: false, enabled: !!token })

  if (!token) return <Shell><Invalid /></Shell>
  if (booking.isLoading) return <Shell><Skeleton className="h-72 max-w-[560px] mx-auto" /></Shell>
  if (booking.error) {
    return <Shell>{toApiError(booking.error).code === 'NOT_FOUND' ? <Invalid /> : <div className="max-w-[560px] mx-auto bg-white border border-[var(--hairline)] rounded-[20px]"><ErrorState error={booking.error} onRetry={() => void booking.refetch()} /></div>}</Shell>
  }
  return <Shell slug={booking.data!.practiceSlug}><Manage b={booking.data!} token={token} /></Shell>
}

function Invalid() {
  return (
    <div className="max-w-[560px] mx-auto bg-white border border-[var(--hairline)] rounded-[20px]">
      <EmptyState icon={<CalendarDays size={18} />} title="This booking link isn’t valid" description="Check that you copied the whole link. If you still need help, contact the practice directly." />
    </div>
  )
}

function Manage({ b, token }: { b: ManagedBooking; token: string }) {
  const qc = useQueryClient()
  const now = useNow()
  const [mode, setMode] = useState<'view' | 'move' | 'cancel'>('view')
  const [done, setDone] = useState<'moved' | 'cancelled' | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['manage', b.bookingId] })
  const changeable = (b.status === 'confirmed' || b.status === 'pending_payment') && now < b.changesAllowedUntil.getTime()
  const active = b.status === 'confirmed' || b.status === 'pending_payment'
  const st = statusCopy[b.status] ?? statusCopy.confirmed!

  if (done === 'cancelled') return <Panel tone="success" icon={<CheckCircle2 size={20} />} title="Booking cancelled" body={`Your ${b.sessionTypeName} with ${b.practiceName} is cancelled. The time is free for someone else.`} />

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      {done === 'moved' && <p role="status" className="text-[13px] rounded-xl bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)] px-4 py-3">Your session has been moved.</p>}
      <section className="bg-white border border-[var(--hairline)] rounded-[20px] p-6" aria-labelledby="mb-h">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] text-[var(--stone)]">{b.practiceName}</p>
            <h1 id="mb-h" className="text-[20px] font-semibold mt-0.5">{b.sessionTypeName}</h1>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.tone}`}>{st.label}</span>
        </div>
        <dl className="mt-5 space-y-2 text-[13px]">
          <div className="flex justify-between gap-4"><dt className="text-[var(--stone)] flex items-center gap-1.5"><CalendarDays size={13} />When</dt><dd className="text-right">{formatDateTime(b.startsAt, b.timezone)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--stone)] flex items-center gap-1.5"><Clock size={13} />Length</dt><dd>{Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000)} min</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--stone)]">Fee</dt><dd className="tabular-nums">{formatINR(b.pricePaise)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--stone)]">Booking ID</dt><dd className="font-mono">{b.code}</dd></div>
        </dl>
        {b.meetUrl && <a href={b.meetUrl} target="_blank" rel="noreferrer" className="btn-primary w-full justify-center mt-5"><Video size={14} />Join the call</a>}

        {active && mode === 'view' && (
          changeable ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setMode('move')}>Change time</button>
              <button className="btn-secondary" onClick={() => setMode('cancel')}>Cancel booking</button>
              <p className="w-full text-[11px] text-[var(--stone)]">You can make changes until {formatDateTime(b.changesAllowedUntil, b.timezone)}.</p>
            </div>
          ) : (
            <p className="mt-5 text-[12px] text-[var(--stone)] flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" />Changes close {b.cancellationCutoffHours} hours before the session. Please contact {b.practiceName} directly.</p>
          )
        )}
      </section>

      {mode === 'move' && <MoveForm b={b} token={token} onCancel={() => setMode('view')} onDone={() => { setMode('view'); setDone('moved'); void refresh() }} />}
      {mode === 'cancel' && <CancelForm b={b} token={token} onCancel={() => setMode('view')} onDone={() => { setDone('cancelled'); void refresh() }} />}
    </div>
  )
}

function MoveForm({ b, token, onCancel, onDone }: { b: ManagedBooking; token: string; onCancel: () => void; onDone: () => void }) {
  const now = useNow(3_600_000)
  const range = useMemo(() => ({ from: new Date(now), to: new Date(now + 14 * 86_400_000) }), [now])
  const slots = useQuery({ queryKey: ['manage-slots', b.practiceSlug, b.sessionTypeId, localDateKey(range.from)], queryFn: () => getSlots(b.practiceSlug, b.sessionTypeId, range.from, range.to, b.timezone) })
  const days = useMemo(() => groupSlotsByDay(slots.data ?? [], b.timezone), [slots.data, b.timezone])
  const [dayKey, setDayKey] = useState<string | null>(null)
  const [slot, setSlot] = useState<Date | null>(null)
  const move = useMutation({ mutationFn: (d: Date) => patientReschedule(b.bookingId, token, d) })
  const [error, setError] = useState<string | null>(null)
  const active = days.find((d) => d.key === dayKey) ?? days[0]

  function submit(e: FormEvent) {
    e.preventDefault(); if (!slot) return; setError(null)
    move.mutate(slot, { onSuccess: onDone, onError: (err) => { setError(toApiError(err).userMessage); void slots.refetch() } })
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[var(--hairline)] rounded-[20px] p-6 space-y-3" aria-label="Choose a new time">
      <h2 className="text-[16px] font-semibold">Choose a new time</h2>
      {error && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{error}</p>}
      {slots.isLoading && <Skeleton className="h-24" />}
      {slots.error && <ErrorState compact error={slots.error} onRetry={() => void slots.refetch()} />}
      {!slots.isLoading && !slots.error && days.length === 0 && <p className="text-[12px] text-[var(--stone)]">No other open times in the next 14 days.</p>}
      {active && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Day">
            {days.map((d) => (
              <button key={d.key} type="button" role="tab" aria-selected={d.key === active.key} onClick={() => { setDayKey(d.key); setSlot(null) }}
                className={`shrink-0 px-3 py-2 rounded-xl border text-[12px] font-medium ${d.key === active.key ? 'bg-[var(--color-primary)] text-white border-transparent' : 'bg-white border-[var(--hairline)]'}`}>{d.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {active.slots.map((s) => (
              <button key={s.startsAt.toISOString()} type="button" aria-pressed={slot?.getTime() === s.startsAt.getTime()} onClick={() => setSlot(s.startsAt)}
                className={`py-2 rounded-lg border text-[12px] font-medium tabular-nums ${slot?.getTime() === s.startsAt.getTime() ? 'bg-[var(--color-primary)] text-white border-transparent' : 'bg-white border-[var(--hairline)] hover:bg-[var(--color-canvas-parchment)]'}`}>{s.label}</button>
            ))}
          </div>
        </>
      )}
      <div className="flex gap-2 pt-1">
        <button className="btn-primary" disabled={!slot || move.isPending}>{move.isPending ? 'Moving…' : slot ? `Move to ${formatDateTime(slot, b.timezone)}` : 'Pick a time'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Back</button>
      </div>
    </form>
  )
}

function CancelForm({ b, token, onCancel, onDone }: { b: ManagedBooking; token: string; onCancel: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cancel = useMutation({ mutationFn: () => patientCancel(b.bookingId, token, reason) })
  function submit(e: FormEvent) {
    e.preventDefault(); setError(null)
    cancel.mutate(undefined, { onSuccess: onDone, onError: (err) => setError(toApiError(err).userMessage) })
  }
  return (
    <form onSubmit={submit} className="bg-white border border-[var(--hairline)] rounded-[20px] p-6 space-y-3" aria-label="Cancel booking">
      <h2 className="text-[16px] font-semibold">Cancel this booking?</h2>
      <p className="text-[12px] text-[var(--stone)]">{b.status === 'confirmed' ? `If you’ve already paid, ${b.practiceName} will arrange the refund with you.` : 'You haven’t been charged.'}</p>
      {error && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{error}</p>}
      <label htmlFor="mb-reason" className="field-label">Reason (optional, shared with {b.practiceName})</label>
      <textarea id="mb-reason" className="field" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={cancel.isPending}>{cancel.isPending ? 'Cancelling…' : 'Cancel booking'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Keep it</button>
      </div>
    </form>
  )
}
