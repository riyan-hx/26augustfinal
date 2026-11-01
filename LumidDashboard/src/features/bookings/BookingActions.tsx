import { useState, type FormEvent } from 'react'
import { toApiError } from '../../lib/errors'
import { useNow } from '../../lib/useNow'
import { useCancelBooking, useMarkOutcome } from './hooks'
import type { BookingSummary } from '../../types/domain'

/** Row actions allowed by the booking state machine. Cancelling asks for a reason the patient will see. */
export function BookingActions({ booking: b }: { booking: BookingSummary }) {
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const now = useNow()
  const cancel = useCancelBooking()
  const outcome = useMarkOutcome()

  const started = b.startsAt.getTime() <= now
  const canCancel = b.status === 'confirmed' || b.status === 'pending_payment'
  const canMark = b.status === 'confirmed' && started
  if (!canCancel && !canMark) return null

  const busy = cancel.isPending || outcome.isPending
  const fail = (e: unknown) => setError(toApiError(e).userMessage)

  function submitCancel(e: FormEvent) {
    e.preventDefault()
    setError(null)
    cancel.mutate({ id: b.id, reason }, { onSuccess: () => { setCancelling(false); setReason('') }, onError: fail })
  }
  const mark = (value: 'completed' | 'no_show') => { setError(null); outcome.mutate({ id: b.id, outcome: value }, { onError: fail }) }

  return (
    <div className="px-4 lg:px-6 pb-4 -mt-1">
      {!cancelling ? (
        <div className="flex flex-wrap items-center gap-2 lg:pl-[52px]">
          {canMark && <button className="btn-secondary" disabled={busy} onClick={() => mark('completed')}>Mark completed</button>}
          {canMark && <button className="btn-secondary" disabled={busy} onClick={() => mark('no_show')}>No-show</button>}
          {canCancel && <button className="btn-secondary" disabled={busy} onClick={() => setCancelling(true)}>{b.status === 'pending_payment' ? 'Release hold' : 'Cancel session'}</button>}
          {error && <span role="alert" className="text-[12px] text-[var(--badge-rose-fg)]">{error}</span>}
        </div>
      ) : (
        <form onSubmit={submitCancel} className="lg:pl-[52px] flex flex-col sm:flex-row gap-2 sm:items-start">
          <div className="flex-1">
            <label className="sr-only" htmlFor={`reason-${b.id}`}>Reason for the patient</label>
            <input id={`reason-${b.id}`} className="field" autoFocus placeholder="Reason the patient will see" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
            {error && <p role="alert" className="form-error">{error}</p>}
          </div>
          <button className="btn-primary" disabled={busy}>{cancel.isPending ? 'Cancelling…' : 'Confirm cancel'}</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setCancelling(false); setError(null) }}>Keep</button>
        </form>
      )}
    </div>
  )
}
