import { useState, type FormEvent } from 'react'
import { toApiError } from '../../lib/errors'
import { useNow } from '../../lib/useNow'
import { useCancelBooking, useMarkOutcome, useMarkPaid } from './hooks'
import type { PaymentMethod } from './api'
import type { BookingSummary } from '../../types/domain'

/** Row actions allowed by the booking state machine. Cancelling asks for a reason the patient will see. */
const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' }, { value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'card', label: 'Card' },
]

export function BookingActions({ booking: b, inline = false }: { booking: BookingSummary; inline?: boolean }) {
  const [cancelling, setCancelling] = useState(false)
  const [paying, setPaying] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const now = useNow()
  const cancel = useCancelBooking()
  const outcome = useMarkOutcome()
  const paid = useMarkPaid()

  const started = b.startsAt.getTime() <= now
  const canCancel = b.status === 'confirmed' || b.status === 'pending_payment'
  const canMark = b.status === 'confirmed' && started
  const canPay = b.status === 'pending_payment'
  if (!canCancel && !canMark) return null

  const busy = cancel.isPending || outcome.isPending || paid.isPending
  const fail = (e: unknown) => setError(toApiError(e).userMessage)

  function submitCancel(e: FormEvent) {
    e.preventDefault()
    setError(null)
    cancel.mutate({ id: b.id, reason }, { onSuccess: () => { setCancelling(false); setReason('') }, onError: fail })
  }
  const mark = (value: 'completed' | 'no_show') => { setError(null); outcome.mutate({ id: b.id, outcome: value }, { onError: fail }) }

  const pad = inline ? '' : 'lg:pl-[52px]'
  const confirmPaid = () => { setError(null); paid.mutate({ id: b.id, method }, { onSuccess: () => setPaying(false), onError: fail }) }

  return (
    <div className={inline ? '' : 'px-4 lg:px-6 pb-4 -mt-1'}>
      {paying ? (
        <div className={`flex flex-wrap items-center gap-2 ${pad}`}>
          <label className="sr-only" htmlFor={`method-${b.id}`}>Paid by</label>
          <select id={`method-${b.id}`} className="field !w-auto !py-2" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button className="btn-primary" disabled={busy} onClick={confirmPaid}>{paid.isPending ? 'Saving…' : 'Confirm paid'}</button>
          <button className="btn-secondary" disabled={busy} onClick={() => setPaying(false)}>Back</button>
          {error && <span role="alert" className="text-[12px] text-[var(--badge-rose-fg)]">{error}</span>}
        </div>
      ) : !cancelling ? (
        <div className={`flex flex-wrap items-center gap-2 ${pad}`}>
          {canPay && <button className="btn-primary" disabled={busy} onClick={() => setPaying(true)}>Mark as paid</button>}
          {canMark && <button className="btn-secondary" disabled={busy} onClick={() => mark('completed')}>Mark completed</button>}
          {canMark && <button className="btn-secondary" disabled={busy} onClick={() => mark('no_show')}>No-show</button>}
          {canCancel && <button className="btn-secondary" disabled={busy} onClick={() => setCancelling(true)}>{b.status === 'pending_payment' ? 'Cancel request' : 'Cancel session'}</button>}
          {error && <span role="alert" className="text-[12px] text-[var(--badge-rose-fg)]">{error}</span>}
        </div>
      ) : (
        <form onSubmit={submitCancel} className={`${pad} flex flex-col sm:flex-row gap-2 sm:items-start`}>
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
