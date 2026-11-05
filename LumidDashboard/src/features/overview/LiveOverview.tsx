import { Navigate, useLocation } from 'react-router-dom'
import { formatINR, sumPaise } from '../../lib/money'
import { localDayBounds } from '../../lib/dates'
import { useNow } from '../../lib/useNow'
import { useBookings } from '../bookings/hooks'
import { useSetupStatus } from '../practice/hooks'
import { CopyBookingLinkButton } from '../practice/CopyBookingLinkButton'
import { NewBookingButton } from '../bookings/NewBookingDialog'
import { useFollowUps } from '../care/hooks'
import { ErrorState, Skeleton } from '../../components/ui/StateViews'
import { TodaySchedule } from './Schedule'
import { NeedsAttention } from './Attention'
import { NextSession } from './NextSession'
import { usePatients } from '../patients/hooks'
import type { BookingSummary } from '../../types/domain'
import { KpiRow, WeekStrip } from './Insights'
import { Waitlist } from './Waitlist'
import { SetupCard } from './SetupCard'
import { setupDone, setupSkipped } from './setup'
import { DAY, dayLabel, firstName, fmt, isPaid } from './utils'

function greeting(now: number): string {
  const hour = Number(fmt(new Date(now), { hour: 'numeric', hourCycle: 'h23' }))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/**
 * Overview, top to bottom by importance: today in numbers, the next session
 * beside what needs attention, the schedule table, then the week and waitlist.
 */
export default function LiveOverview() {
  const setup = useSetupStatus()
  const now = useNow()
  const { start } = localDayBounds(new Date(now))
  const week = useBookings({ from: start, to: new Date(start.getTime() + 7 * DAY) })
  // Unpaid sessions and sessions still to mark from the last two weeks, not just this week's.
  const recent = useBookings({ from: new Date(start.getTime() - 14 * DAY), to: new Date(start.getTime() + 7 * DAY) })
  const followUps = useFollowUps()
  const patientsQ = usePatients()
  const location = useLocation()
  const skipped = (location.state as { skipSetup?: boolean } | null)?.skipSetup === true || setupSkipped()

  if (setup.isLoading) return <OverviewSkeleton />
  // A brand-new practice goes straight to the guided setup (unless they chose to skip it).
  if (!skipped && setup.status && !setup.status.published && setupDone(setup.status) === 0) return <Navigate to="/app/setup" replace />

  const doctor = setup.profile ? firstName(setup.profile.displayName) : undefined
  const practice = setup.profile?.displayName ?? 'Your psychologist'
  const patients = new Map((patientsQ.data ?? []).map((p) => [p.id, p]))
  const isBooked = (b: BookingSummary) => b.status === 'confirmed' || b.status === 'pending_payment' || b.status === 'completed'

  const all = [...(week.data ?? [])].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const today = all.filter((b) => isBooked(b) && b.startsAt.getTime() < start.getTime() + DAY)
  const window4 = all.filter((b) => isBooked(b) && b.startsAt.getTime() < start.getTime() + 4 * DAY)
  const upcomingWeek = all.filter((b) => b.status === 'confirmed' && b.startsAt.getTime() > now)
  const next = all.find((b) => (b.status === 'confirmed' || b.status === 'pending_payment') && b.endsAt.getTime() > now)

  const recentAll = [...(recent.data ?? [])].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const awaiting = recentAll.filter((b) => b.status === 'pending_payment')
  const toReview = recentAll.filter((b) => b.status === 'confirmed' && b.endsAt.getTime() < now)
  const scheduled = (followUps.data ?? []).filter((f) => f.status === 'scheduled')
  const dueFollowUps = scheduled.filter((f) => f.dueAt.getTime() <= now)
  const overdue = dueFollowUps.filter((f) => f.dueAt.getTime() < start.getTime())

  // Today's earnings against the same weekday last week.
  const earnedToday = sumPaise(today.filter(isPaid).map((b) => b.pricePaise))
  const lastWeekFrom = start.getTime() - 7 * DAY
  const earnedLastWeek = sumPaise(recentAll.filter((b) => isBooked(b) && isPaid(b) && b.startsAt.getTime() >= lastWeekFrom && b.startsAt.getTime() < lastWeekFrom + DAY).map((b) => b.pricePaise))
  const change = earnedLastWeek ? Math.round(((earnedToday - earnedLastWeek) / earnedLastWeek) * 100) : null
  // No-shows among sessions held in the last 14 days.
  const held = recentAll.filter((b) => (b.status === 'completed' || b.status === 'no_show') && b.startsAt.getTime() < now)
  const noShows = held.filter((b) => b.status === 'no_show').length

  return (
    <div className="px-4 lg:px-6 py-5 lg:py-6 pb-20 lg:pb-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold tracking-tight">{greeting(now)}{doctor ? `, ${doctor}` : ''}</h1>
          <p className="text-[13px] text-[var(--stone)] mt-1">Here’s what needs your attention today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {setup.status?.published && <CopyBookingLinkButton className="btn-secondary" />}
          {setup.status?.hasSessionTypes && <NewBookingButton />}
        </div>
      </div>

      {!!setup.error && <div className="mt-4 bg-white rounded-[24px]"><ErrorState compact error={setup.error} /></div>}
      {setup.status && !setup.status.published && <SetupCard status={setup.status} />}

      <div className="mt-5 space-y-4">
        <KpiRow items={[
          { label: 'Today’s earnings', icon: 'earnings', hero: true, to: '/app/earnings', loading: week.isLoading, error: !!week.error,
            value: formatINR(earnedToday),
            chip: change != null ? { text: `${change >= 0 ? '+' : '−'}${Math.abs(change)}%`, tone: 'green' } : undefined,
            sub: change != null ? `vs last ${fmt(new Date(lastWeekFrom + 12 * 3_600_000), { weekday: 'long' })}` : `${today.filter(isPaid).length} of ${today.length} sessions paid` },
          { label: 'Awaiting payment', icon: 'awaiting', to: '/app/bookings?status=awaiting', loading: recent.isLoading, error: !!recent.error,
            value: formatINR(sumPaise(awaiting.map((b) => b.pricePaise))),
            chip: awaiting.length ? { text: `${awaiting.length} ${awaiting.length === 1 ? 'booking' : 'bookings'}`, tone: 'amber' } : { text: 'All paid', tone: 'green' },
            sub: awaiting[0] ? `${firstName(awaiting[0].patientName)} · ${dayLabel(awaiting[0].startsAt, now)}` : 'Nothing pending' },
          { label: 'Follow-ups due', icon: 'followups', to: '/app/follow-ups', loading: followUps.isLoading, error: !!followUps.error,
            value: String(dueFollowUps.length),
            chip: overdue.length ? { text: `${overdue.length} overdue`, tone: 'rose' } : { text: 'On track', tone: 'green' },
            sub: dueFollowUps.length ? 'Due today' : scheduled.length ? `${scheduled.length} scheduled ahead` : 'None scheduled' },
          { label: 'No-show rate', icon: 'noshow', to: '/app/sessions', loading: recent.isLoading, error: !!recent.error,
            value: held.length ? `${Math.round((noShows / held.length) * 100)}%` : '—',
            chip: held.length ? { text: `${noShows} of ${held.length}`, tone: noShows ? 'amber' : 'green' } : undefined,
            sub: held.length ? 'last 14 days' : 'No sessions held yet' },
        ]} />

        {/* Widths follow importance: next session, then attention, then the waitlist. */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-[1.3fr_1fr_0.75fr] gap-4 items-stretch [&>*]:min-w-0">
          <NextSession booking={next} patient={next ? patients.get(next.patientId) : undefined} now={now} practice={practice} q={week} />
          <NeedsAttention awaiting={awaiting} toReview={toReview} dueFollowUps={dueFollowUps} practice={practice} now={now} dayStart={start} bookingsQ={recent} followUpsQ={followUps} />
          <div className="lg:col-span-2 xl:col-span-1"><Waitlist bookings={week.data ?? []} now={now} /></div>
        </div>

        {/* Schedule beside the week at a glance. */}
        <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start [&>*]:min-w-0">
          <TodaySchedule rows={window4} patients={patients} upcomingWeek={upcomingWeek} now={now} practice={practice} q={week} />
          <WeekStrip bookings={week.data ?? []} start={start} q={week} />
        </div>
      </div>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="px-4 lg:px-6 py-6" role="status" aria-label="Loading overview">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-40 mt-2" />
      <div className="mt-6 grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <Skeleton className="h-[300px] rounded-[24px]" />
        <Skeleton className="h-[300px] rounded-[24px]" />
      </div>
    </div>
  )
}
