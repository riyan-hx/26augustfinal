import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, CheckCircle2, ClipboardList, CreditCard, Repeat2 } from '../../lib/icons'
import { formatTime } from '../../lib/dates'
import { toApiError } from '../../lib/errors'
import { useSetFollowUpStatus } from '../care/hooks'
import type { FollowUp } from '../care/api'
import { ErrorState, Skeleton } from '../../components/ui/StateViews'
import type { BookingSummary } from '../../types/domain'
import { card, CardTitle, IconTile, pillAction, type Tone } from './ui'
import { dayLabel, fmt, reminderMailto } from './utils'

interface Query { isLoading: boolean; error: unknown; refetch: () => unknown }

/** Unpaid sessions, sessions still to mark, and follow-ups that are due. */
export function NeedsAttention({ awaiting, toReview, dueFollowUps, practice, now, dayStart, bookingsQ, followUpsQ }: {
  awaiting: BookingSummary[]; toReview: BookingSummary[]; dueFollowUps: FollowUp[]; practice: string; now: number; dayStart: Date; bookingsQ: Query; followUpsQ: Query
}) {
  const count = awaiting.length + toReview.length + dueFollowUps.length
  const loading = bookingsQ.isLoading || followUpsQ.isLoading
  const error = bookingsQ.error ?? followUpsQ.error
  return (
    <section className={`${card} p-5`} aria-labelledby="attention-h">
      <CardTitle id="attention-h" title="Needs your attention"
        sub={loading || error ? ' ' : count ? `${count} ${count === 1 ? 'thing needs' : 'things need'} you` : 'Nothing waiting on you'}
        right={!loading && !error && count > 0 ? <span className="min-w-6 h-6 px-1.5 rounded-full bg-[var(--color-surface-panel)] text-[12px] font-semibold flex items-center justify-center tabular-nums">{count}</span> : undefined} />
      {loading && <div className="mt-4 space-y-3"><Skeleton className="h-11" /><Skeleton className="h-11" /></div>}
      {!loading && !!error && <div className="mt-3"><ErrorState compact error={error} onRetry={() => { void bookingsQ.refetch(); void followUpsQ.refetch() }} /></div>}
      {!loading && !error && count === 0 && (
        <div className="py-8 text-center">
          <CheckCircle2 size={20} className="mx-auto text-[var(--badge-green-fg)]" />
          <p className="text-[14px] font-semibold mt-2">You’re all caught up</p>
          <p className="text-[13px] text-[var(--stone)] mt-1">Unpaid sessions, sessions to mark and due follow-ups show up here.</p>
        </div>
      )}
      {!loading && !error && count > 0 && (
        <ul className="mt-4 space-y-3">
          {awaiting.map((b) => {
            const mail = reminderMailto(b, practice)
            const today = dayLabel(b.startsAt, now) === 'Today'
            const sub = b.startsAt.getTime() < now ? 'Session done · mark it paid'
              : today ? `Unpaid · session today at ${formatTime(b.startsAt)}` : `${fmt(b.startsAt, { weekday: 'long' })}’s booking not paid yet`
            return (
              <Row key={b.id} tone={today ? 'amber' : 'sky'} icon={today ? <CreditCard size={16} /> : <CalendarDays size={16} />}
                title={b.patientName} sub={sub} to={`/app/patients/${b.patientId}`}
                action={mail ? <a href={mail} className={pillAction} aria-label={`Send ${b.patientName} a payment reminder`}>Remind</a>
                  : <Link to="/app/bookings?status=awaiting" className={pillAction}>View</Link>} />
            )
          })}
          {toReview.map((b) => (
            <Row key={`${b.id}-review`} tone="green" icon={<ClipboardList size={16} />} title={b.patientName}
              sub={`${dayLabel(b.startsAt, now)}, ${formatTime(b.startsAt)} · mark completed or no-show`} to={`/app/patients/${b.patientId}`}
              action={<Link to="/app/sessions" className={pillAction}>Mark</Link>} />
          ))}
          {dueFollowUps.map((f) => <FollowUpItem key={f.id} f={f} overdue={f.dueAt.getTime() < dayStart.getTime()} />)}
        </ul>
      )}
    </section>
  )
}

function Row({ tone, icon, title, sub, to, action }: { tone: Tone; icon: React.ReactNode; title: string; sub: string; to: string; action: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 min-w-0">
      <IconTile tone={tone}>{icon}</IconTile>
      <Link to={to} className="min-w-0 flex-1 group">
        <p className="text-[13px] font-medium truncate group-hover:underline underline-offset-4">{title}</p>
        <p className="text-[12px] text-[var(--stone)] truncate">{sub}</p>
      </Link>
      {action}
    </li>
  )
}

function FollowUpItem({ f, overdue }: { f: FollowUp; overdue: boolean }) {
  const set = useSetFollowUpStatus()
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <Row tone="rose" icon={<Repeat2 size={16} />} title={f.patientName}
        sub={`${overdue ? 'Follow-up overdue' : 'Follow-up due today'} · ${f.message}`} to={`/app/patients/${f.patientId}`}
        action={<button type="button" className={pillAction} disabled={set.isPending}
          onClick={() => { setError(null); set.mutate({ id: f.id, status: 'sent' }, { onError: (e) => setError(toApiError(e).userMessage) }) }}>
          <Check size={14} />Done
        </button>} />
      {error && <li role="alert" className="text-[12px] text-[var(--badge-rose-fg)] pl-[46px]">{error}</li>}
    </>
  )
}
