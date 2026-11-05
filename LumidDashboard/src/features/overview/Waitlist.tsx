import { useEffect, useState, type ChangeEvent } from 'react'
import { Plus, X } from '../../lib/icons'
import { formatTime } from '../../lib/dates'
import { bookingUrl } from '../../lib/links'
import { toApiError } from '../../lib/errors'
import { Avatar } from '../../components/ui/Avatar'
import { ErrorState, Skeleton } from '../../components/ui/StateViews'
import { useProfile } from '../practice/hooks'
import type { BookingSummary } from '../../types/domain'
import { useAddToWaitlist, useSetWaitlistStatus, useWaitlist } from './hooks'
import type { WaitlistEntry } from './api'
import { card, CardTitle } from './ui'
import { DAY, durationMin, fmt, mailto, offerMessage } from './utils'

/** People waiting for a slot; offer one when a session is cancelled. */
export function Waitlist({ bookings, now }: { bookings: BookingSummary[]; now: number }) {
  const list = useWaitlist()
  const setStatus = useSetWaitlistStatus()
  const { data: profile } = useProfile()
  const [adding, setAdding] = useState(false)
  // A short note about the last offer, tied to the person it was about.
  const [note, setNote] = useState<{ id: string; text: string } | null>(null)
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(null), 6000)
    return () => clearTimeout(t)
  }, [note])
  const waiting = list.data ?? []
  const opened = bookings.filter((b) => b.status === 'cancelled' && b.startsAt.getTime() > now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0]

  async function offer(w: WaitlistEntry) {
    setNote(null)
    // Only share the link once the page is live — before that it doesn't work for patients.
    const link = profile?.slug && profile.published ? bookingUrl(profile.slug) : ''
    const { subject, body } = offerMessage(w.fullName, opened ? `${fmt(opened.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} at ${formatTime(opened.startsAt)}` : null, link, profile?.displayName ?? '')
    if (w.email) window.location.assign(mailto(w.email, subject, body))
    else {
      try { await navigator.clipboard.writeText(body); setNote({ id: w.id, text: 'No email on file. Message copied — paste it into WhatsApp or SMS.' }) } catch { window.prompt('Copy this message', body) }
    }
    setStatus.mutate({ id: w.id, status: 'offered' }, { onError: (e) => setNote({ id: w.id, text: toApiError(e).userMessage }) })
  }

  function remove(w: WaitlistEntry) {
    if (note?.id === w.id) setNote(null)
    setStatus.mutate({ id: w.id, status: 'removed' })
  }

  return (
    <section className={`${card} p-5 h-full`} aria-labelledby="waitlist-h">
      <CardTitle id="waitlist-h" title="Waitlist"
        right={<button type="button" className="btn-link inline-flex items-center gap-1" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          {adding ? 'Cancel' : <><Plus size={13} />Add</>}
        </button>} />
      <p className="text-[12px] text-[var(--stone)] mt-0.5">
        {list.isLoading || list.error ? ' ' : waiting.length ? `${waiting.length} waiting for a slot` : 'No one waiting'}
      </p>
      {opened && (
        <p className="mt-3 text-[12px] px-3 py-2 rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--badge-green-fg)]">
          {fmt(opened.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })}, {formatTime(opened.startsAt)} opened up · {opened.patientName} cancelled ({durationMin(opened)} min)
        </p>
      )}
      {adding && <WaitlistForm onDone={() => setAdding(false)} />}
      {list.isLoading && <Skeleton className="h-[72px] mt-3" />}
      {!!list.error && <div className="mt-3 -mx-6"><ErrorState compact error={list.error} onRetry={() => void list.refetch()} /></div>}
      {!list.isLoading && !list.error && waiting.length === 0 && !adding && (
        <p className="text-[12px] text-[var(--slate)] mt-3 leading-relaxed">Add people who asked for a time. When a session is cancelled, offer them the slot in one tap.</p>
      )}
      {waiting.length > 0 && (
        <ul className="mt-2 divide-y divide-[var(--hairline)]">
          {waiting.slice(0, 5).map((w) => (
            <li key={w.id} className="flex gap-2.5 items-center py-2.5">
              <Avatar name={w.fullName} size={30} />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium truncate">{w.fullName}</span>
                <span className="block text-[11px] text-[var(--stone)] truncate">
                  {w.preference || 'Any time'} · {Math.max(0, Math.floor((now - w.createdAt.getTime()) / DAY))}d{w.status === 'offered' ? ' · offered' : ''}
                </span>
              </span>
              <button type="button" className="btn-quiet btn-quiet--next shrink-0" disabled={setStatus.isPending} onClick={() => void offer(w)}>
                {w.status === 'offered' ? 'Offer again' : 'Offer slot'}
              </button>
              <button type="button" onClick={() => remove(w)} aria-label={`Remove ${w.fullName}`} title="Remove" disabled={setStatus.isPending}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[var(--stone)] hover:bg-[var(--color-canvas-parchment)] hover:text-[var(--ink)]"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      {waiting.length > 5 && <p className="text-[11px] text-[var(--stone)] mt-1">+{waiting.length - 5} more waiting</p>}
      <p role="status" className="text-[12px] text-[var(--slate)] mt-2 empty:hidden">{note?.text}</p>
    </section>
  )
}

function WaitlistForm({ onDone }: { onDone: () => void }) {
  const add = useAddToWaitlist()
  const [v, setV] = useState({ fullName: '', email: '', phone: '', preference: '' })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <form className="mt-3 grid grid-cols-2 gap-2" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      add.mutate(v, { onSuccess: onDone, onError: (err) => { const a = toApiError(err); setError(a.fields ? Object.values(a.fields).join(' ') : a.userMessage) } })
    }}>
      <input aria-label="Name" className="field col-span-2" placeholder="Name" autoFocus value={v.fullName} onChange={set('fullName')} />
      <input aria-label="Email" className="field min-w-0" type="email" placeholder="Email" value={v.email} onChange={set('email')} />
      <input aria-label="Phone" className="field min-w-0" type="tel" placeholder="Phone" value={v.phone} onChange={set('phone')} />
      <input aria-label="Preference" className="field col-span-2" placeholder="Preference, e.g. weekday mornings" maxLength={200} value={v.preference} onChange={set('preference')} />
      {error && <p role="alert" className="col-span-2 text-[12px] text-[var(--badge-rose-fg)]">{error}</p>}
      <button className="btn-primary col-span-2" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add to waitlist'}</button>
    </form>
  )
}
