import { Link } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Clock3, CreditCard, Video, CalendarDays } from '../../lib/icons'
import { formatINR, sumPaise } from '../../lib/money'
import { formatTime, localDayBounds } from '../../lib/dates'
import { relativeDateTime } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { useBookings } from '../bookings/hooks'
import { useSetupStatus } from '../practice/hooks'
import { CopyBookingLinkButton } from '../practice/CopyBookingLinkButton'
import { NewBookingButton } from '../bookings/NewBookingDialog'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '../../components/ui/StateViews'
import type { BookingSummary, SetupStatus } from '../../types/domain'

const DAY = 86_400_000

function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/** Overview on real data: setup checklist until published, then today + what needs attention. */
export default function LiveOverview() {
  const setup = useSetupStatus()
  const now = useNow()
  const { start } = localDayBounds(new Date(now))
  const week = useBookings({ from: start, to: new Date(start.getTime() + 7 * DAY) })

  const firstName = setup.profile?.displayName.replace(/^Dr\.?\s+/i, '').split(' ')[0]
  const today = (week.data ?? []).filter((b) => b.startsAt.getTime() < start.getTime() + DAY)
  const live = today.filter((b) => b.status === 'confirmed' || b.status === 'pending_payment' || b.status === 'completed')
  const awaiting = (week.data ?? []).filter((b) => b.status === 'pending_payment')
  const upcomingWeek = (week.data ?? []).filter((b) => b.status === 'confirmed' && b.startsAt.getTime() > now)

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="text-[13px] text-[var(--stone)] mt-1">Here’s what needs your attention today.</p>
        </div>
        <div className="flex gap-2">
          {setup.status?.published && <CopyBookingLinkButton className="btn-secondary" />}
          {setup.status?.hasSessionTypes && <NewBookingButton />}
        </div>
      </div>

      {setup.error && <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px]"><ErrorState compact error={setup.error} /></div>}
      {setup.status && !setup.status.published && <SetupChecklist status={setup.status} />}

      {/* KPI row */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 bg-white border border-[var(--hairline)] rounded-[16px] divide-x divide-y lg:divide-y-0 divide-[var(--hairline)] overflow-hidden">
        <Kpi label="SESSIONS TODAY" loading={week.isLoading} value={String(live.length)}
          sub={`${live.filter((b) => b.status !== 'pending_payment').length} paid · ${live.filter((b) => b.status === 'pending_payment').length} awaiting`} />
        <Kpi label="TODAY’S EARNINGS" loading={week.isLoading}
          value={formatINR(sumPaise(live.filter((b) => b.status !== 'pending_payment').map((b) => b.pricePaise)))} sub="Collected via Razorpay" />
        <Kpi label="AWAITING PAYMENT" loading={week.isLoading} value={String(awaiting.length)} sub={awaiting.length ? formatINR(sumPaise(awaiting.map((b) => b.pricePaise))) : 'Nothing pending'} />
        <Kpi label="NEXT 7 DAYS" loading={week.isLoading} value={String(upcomingWeek.length)} sub="Confirmed sessions" />
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        <section className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden" aria-labelledby="today-h">
          <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--hairline)]">
            <h2 id="today-h" className="text-[16px] font-semibold">Today’s schedule</h2>
            <Link to="/app/calendar" className="btn-secondary">Open calendar</Link>
          </header>
          {week.isLoading && <SkeletonRows rows={3} height="h-[72px]" />}
          {week.error && <ErrorState error={week.error} onRetry={() => void week.refetch()} />}
          {!week.isLoading && !week.error && live.length === 0 && (
            <EmptyState icon={<CalendarDays size={18} />} title="No sessions today"
              description={upcomingWeek[0] ? `Next: ${upcomingWeek[0].patientName}, ${relativeDateTime(upcomingWeek[0].startsAt)}.` : 'Share your booking link so patients can book a time.'}
              action={upcomingWeek[0] ? undefined : <CopyBookingLinkButton />} />
          )}
          <ul className="divide-y divide-[var(--hairline)]">
            {live.map((b) => <ScheduleRow key={b.id} booking={b} now={now} />)}
          </ul>
        </section>

        <div className="space-y-6">
        <section className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden" aria-labelledby="attention-h">
          <header className="px-5 py-4 border-b border-[var(--hairline)] flex items-center gap-2">
            <h2 id="attention-h" className="text-[16px] font-semibold">Needs attention</h2>
            {!week.isLoading && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-canvas-parchment)] border border-[var(--hairline)] tabular-nums">{awaiting.length}</span>}
          </header>
          {week.isLoading && <div className="p-5 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}
          {!week.isLoading && !week.error && awaiting.length === 0 && (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 size={18} className="mx-auto text-[var(--badge-green-fg)]" />
              <p className="text-[13px] font-semibold mt-2">You’re all caught up</p>
              <p className="text-[12px] text-[var(--stone)] mt-1">Unpaid bookings and due follow-ups show up here.</p>
            </div>
          )}
          <ul className="divide-y divide-[var(--hairline)]">
            {awaiting.map((b) => (
              <li key={b.id}>
                <Link to="/app/bookings" className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--color-canvas-parchment)]">
                  <span className="w-9 h-9 rounded-full bg-[var(--badge-rose-bg)] text-[var(--badge-rose-fg)] flex items-center justify-center shrink-0"><CreditCard size={15} /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">{b.patientName} — payment pending</p>
                    <p className="text-[12px] text-[var(--stone)] truncate">{formatINR(b.pricePaise)} · {relativeDateTime(b.startsAt)}</p>
                  </div>
                  <ArrowRight size={14} className="ml-auto text-[var(--stone)] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <WeekStrip bookings={week.data ?? []} start={start} loading={week.isLoading} />
        </div>
      </div>
    </div>
  )
}

/** Next seven days at a glance: one bar per day, height by sessions booked. */
function WeekStrip({ bookings, start, loading }: { bookings: BookingSummary[]; start: Date; loading: boolean }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = start.getTime() + i * DAY
    const n = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'expired' && b.startsAt.getTime() >= from && b.startsAt.getTime() < from + DAY).length
    return { label: new Date(from + 12 * 3_600_000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'narrow' }), n }
  })
  const max = Math.max(1, ...days.map((d) => d.n))
  return (
    <section className="bg-white border border-[var(--hairline)] rounded-[16px] p-5" aria-labelledby="week-h">
      <div className="flex items-baseline justify-between">
        <h2 id="week-h" className="text-[16px] font-semibold">Next 7 days</h2>
        <Link to="/app/calendar" className="text-[12px] text-[var(--stone)] hover:text-[var(--ink)]">Calendar →</Link>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2 items-end h-[96px]" aria-label="Sessions per day">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
            <span className="text-[11px] tabular-nums text-[var(--stone)]">{loading ? '' : d.n || ''}</span>
            <span className={`w-full rounded-[6px] transition-[height] duration-300 ${i === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary-soft)]'}`}
              style={{ height: loading ? 8 : Math.max(6, (d.n / max) * 56) }} />
            <span className={`text-[11px] ${i === 0 ? 'font-semibold' : 'text-[var(--stone)]'}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Kpi({ label, value, sub, loading }: { label: string; value: string; sub: string; loading: boolean }) {
  return (
    <div className="p-5">
      <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--stone)]">{label}</p>
      {loading ? <Skeleton className="h-8 w-20 mt-2" /> : <p className="text-[28px] font-semibold tracking-tight mt-1 tabular-nums">{value}</p>}
      <p className="text-[12px] text-[var(--stone)] mt-1">{sub}</p>
    </div>
  )
}

function ScheduleRow({ booking: b, now }: { booking: BookingSummary; now: number }) {
  const paid = b.status !== 'pending_payment'
  const startsSoon = b.startsAt.getTime() - now < 10 * 60_000 && b.endsAt.getTime() > now
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="text-[13px] text-[var(--stone)] w-[72px] shrink-0 tabular-nums">{formatTime(b.startsAt)}</span>
      <Avatar name={b.patientName} />
      <Link to={`/app/patients/${b.patientId}`} className="min-w-0 flex-1 hover:underline">
        <p className="text-[14px] font-semibold truncate">{b.patientName}</p>
        <p className="text-[12px] text-[var(--stone)] truncate">{b.sessionTypeName}</p>
      </Link>
      <span className="text-[13px] font-medium tabular-nums hidden sm:inline">{formatINR(b.pricePaise)}</span>
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${paid ? 'bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)]' : 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]'}`}>
        {paid ? <Check size={11} /> : <Clock3 size={11} />} {paid ? 'Paid' : 'Awaiting'}
      </span>
      {b.meetUrl && startsSoon && (
        <a href={b.meetUrl} target="_blank" rel="noreferrer" className="btn-primary !py-1.5 !px-3 !text-[12px]"><Video size={13} /> Join</a>
      )}
    </li>
  )
}

const steps: { key: keyof SetupStatus; label: string; hint: string; href: string }[] = [
  { key: 'hasProfile', label: 'Add your name and photo', hint: 'Shown on your booking page', href: '/app/settings#profile' },
  { key: 'hasSlug', label: 'Choose your booking link', hint: 'The link patients book from', href: '/app/settings#profile' },
  { key: 'hasSessionTypes', label: 'Add a session type', hint: 'Length and price', href: '/app/settings#sessions' },
  { key: 'hasAvailability', label: 'Set your weekly hours', hint: 'When patients can book', href: '/app/settings#hours' },
]

function SetupChecklist({ status }: { status: SetupStatus }) {
  const done = steps.filter((s) => status[s.key]).length
  const nextStep = steps.find((s) => !status[s.key])
  return (
    <section className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] p-5" aria-labelledby="setup-h">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 id="setup-h" className="text-[16px] font-semibold">Set up your practice</h2>
          <p className="text-[12px] text-[var(--stone)] mt-1">{done} of {steps.length} done · then publish your booking page</p>
        </div>
        <Link to={nextStep?.href ?? '/app/settings'} className="btn-primary">{nextStep ? 'Continue setup' : 'Publish your page'} <ArrowRight size={13} /></Link>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-[var(--color-hairline)] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
        <div className="h-full bg-[var(--color-primary)] transition-[width] duration-300" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {steps.map((s) => {
          const isDone = status[s.key]
          return (
            <li key={s.key}>
              <Link to={s.href} className={`flex items-start gap-2.5 p-3 rounded-xl border ${s === nextStep ? 'border-[var(--color-neutral-strong)]' : 'border-[var(--hairline)]'} hover:bg-[var(--color-canvas-parchment)] h-full`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-[var(--color-primary)] text-white' : 'border-2 border-[var(--hairline)]'}`}>
                  {isDone && <Check size={11} />}
                </span>
                <span>
                  <span className={`block text-[13px] font-semibold ${isDone ? 'text-[var(--stone)] line-through' : ''}`}>{s.label}</span>
                  <span className="block text-[11px] text-[var(--stone)]">{s.hint}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
