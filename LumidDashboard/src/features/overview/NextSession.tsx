import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, FileText, Video } from '../../lib/icons'
import { formatINR } from '../../lib/money'
import { formatTime } from '../../lib/dates'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews'
import { CopyBookingLinkButton } from '../practice/CopyBookingLinkButton'
import type { BookingSummary, PatientSummary } from '../../types/domain'
import { card, CardTitle, panel, Pill } from './ui'
import { dayLabel, durationMin, isPaid, reminderMailto } from './utils'

interface Query { isLoading: boolean; error: unknown; refetch: () => unknown }

function startsIn(b: BookingSummary, now: number): string {
  const ms = b.startsAt.getTime() - now
  if (ms <= 0) return `In progress · ends ${formatTime(b.endsAt)}`
  const min = Math.round(ms / 60_000)
  if (min < 60) return `Starts in ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Starts in ${h} h`
  return `${dayLabel(b.startsAt, now)}, ${formatTime(b.startsAt)}`
}

/** The next session, with what's ready for it and the one-tap join. */
export function NextSession({ booking: b, patient, now, practice, q }: {
  booking: BookingSummary | undefined; patient: PatientSummary | undefined; now: number; practice: string; q: Query
}) {
  if (q.isLoading) return <section className={`${card} p-5`}><Skeleton className="h-6 w-40" /><Skeleton className="h-12 w-64 mt-6" /><Skeleton className="h-11 mt-6 rounded-full" /><Skeleton className="h-[92px] mt-4 rounded-[16px]" /></section>
  if (q.error) return <section className={card}><ErrorState error={q.error} onRetry={() => void q.refetch()} /></section>
  if (!b) {
    return (
      <section className={`${card} p-5`} aria-labelledby="next-h">
        <CardTitle id="next-h" title="Next session" />
        <EmptyState icon={<CalendarDays size={18} />} title="Nothing booked this week" description="Share your booking link so patients can pick a time." action={<CopyBookingLinkButton />} />
      </section>
    )
  }

  const paid = isPaid(b)
  const mail = paid ? null : reminderMailto(b, practice)
  const sessionNo = patient ? patient.sessionsCompleted + 1 : null
  const ended = b.endsAt.getTime() <= now
  const checks = [
    { label: 'Payment', ok: paid, value: formatINR(b.pricePaise), note: paid ? 'Received' : 'Awaiting' },
    { label: 'Prep note', ok: !!patient?.prepNote, value: patient?.prepNote ? 'Added' : 'None yet', note: patient?.prepNote ? 'From last session' : sessionNo === 1 ? 'First session' : 'Optional' },
    { label: 'Meet link', ok: !!b.meetUrl, value: b.meetUrl ? 'Added' : 'Missing', note: b.meetUrl ? 'Shared' : 'Add before start' },
  ]
  const done = checks.filter((c) => c.ok).length

  return (
    <section className={`${card} p-5 flex flex-col`} aria-labelledby="next-h">
      <CardTitle id="next-h" title="Next session" sub={`${startsIn(b, now)} · Google Meet`}
        right={<Pill tone={paid ? 'green' : 'amber'} dot>{formatINR(b.pricePaise)} · {paid ? 'Paid' : 'Awaiting'}</Pill>} />

      <Link to={`/app/patients/${b.patientId}`} className="mt-4 flex items-center gap-2.5 min-w-0 group w-fit max-w-full">
        <Avatar name={b.patientName} size={36} />
        <span className="text-[20px] font-medium tracking-tight truncate group-hover:underline underline-offset-4">{b.patientName}</span>
      </Link>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-[var(--stone)]">
        {sessionNo != null && <Pill>{sessionNo === 1 ? 'First session' : `Session ${sessionNo}`}</Pill>}
        <span>{dayLabel(b.startsAt, now) === 'Today' ? '' : `${dayLabel(b.startsAt, now)} · `}{formatTime(b.startsAt)} · {b.sessionTypeName} · {durationMin(b)} min</span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {b.meetUrl && !ended
          ? <a href={b.meetUrl} target="_blank" rel="noreferrer" className="btn-primary !h-10 !text-[13px] !font-medium"><Video size={15} />Join Google Meet</a>
          : <Link to="/app/calendar" className="btn-primary !h-10 !text-[13px] !font-medium"><CalendarDays size={15} />Open in calendar</Link>}
        <Link to={`/app/patients/${b.patientId}`} className="inline-flex items-center justify-center gap-2 h-10 rounded-full bg-[var(--color-surface-panel)] hover:bg-[#e8ece7] text-[13px] font-medium transition-colors">
          <FileText size={15} />Session notes
        </Link>
      </div>

      <div className={`${panel} mt-3 p-2.5`}>
        <p className="px-1 text-[12px] font-medium">Ready for {formatTime(b.startsAt)} <span className="text-[var(--stone)] font-normal ml-1">{done} of 3 done</span></p>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {checks.map((c) => (
            <li key={c.label} className="bg-white rounded-[10px] px-2.5 py-2 min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--stone)]">
                <CheckCircle2 size={13} className={c.ok ? 'text-[var(--badge-green-fg)]' : 'text-[#b9c0b6]'} />{c.label}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold truncate">
                {c.value} <span className={`text-[11px] font-normal ${c.ok ? 'text-[var(--badge-green-fg)]' : 'text-[var(--badge-amber-fg)]'}`}>· {c.note}</span>
              </p>
              {c.label === 'Payment' && mail && <a href={mail} className="text-[12px] font-medium text-[var(--badge-green-fg)] hover:underline">Send reminder</a>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
