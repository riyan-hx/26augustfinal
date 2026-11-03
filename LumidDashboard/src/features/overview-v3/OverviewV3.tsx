import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatINR, sumPaise } from '../../lib/money'
import { formatTime } from '../../lib/dates'
import { bookingUrl, bookingUrlLabel } from '../../lib/links'
import { useNow } from '../../lib/useNow'
import { toApiError } from '../../lib/errors'
import { setUiVersion } from '../../lib/uiVersion'
import { useBookings } from '../bookings/hooks'
import { BookingActions } from '../bookings/BookingActions'
import { NewBookingDialog } from '../bookings/NewBookingDialog'
import { usePatients } from '../patients/hooks'
import { useProfile, useSessionTypes } from '../practice/hooks'
import { careKeys, useFollowUps, useSetFollowUpStatus } from '../care/hooks'
import { listNotes } from '../care/api'
import { getSlots } from '../public-booking/api'
import { Skeleton } from '../../components/ui/StateViews'
import type { BookingSummary, PatientSummary } from '../../types/domain'
import type { FollowUp } from '../care/api'
import { useAddToWaitlist, useSessionsByMonth, useSetWaitlistStatus, useWaitlist } from './hooks'
import type { WaitlistEntry } from './api'
import { V3Shell } from './Shell'
import { V3Avatar } from './V3Avatar'
import { DAY, dayLabel, dayStart, durationMin, firstName, fmt, isLive, isPaid, monthStart, reminderMailto, weekStart } from './utils'
import greetPlus from '../../assets/v3/greet-plus.svg'
import dotMint from '../../assets/v3/badge-dot-mint.svg'
import dotSun from '../../assets/v3/badge-dot-sun.svg'
import btnVideo from '../../assets/v3/btn-video.svg'
import btnNotes from '../../assets/v3/btn-notes.svg'
import checkCircle from '../../assets/v3/icon-check-circle.svg'
import kWallet from '../../assets/v3/kpi-wallet.svg'
import kCard from '../../assets/v3/kpi-card.svg'
import kRepeat from '../../assets/v3/kpi-repeat.svg'
import kTrending from '../../assets/v3/kpi-trending.svg'
import btnCopy from '../../assets/v3/btn-copy.svg'
import iGlobe from '../../assets/v3/icon-globe.svg'
import iSearchSm from '../../assets/v3/icon-search-sm.svg'
import iFilter from '../../assets/v3/icon-filter.svg'
import dotPaid from '../../assets/v3/dot-paid.svg'
import dotAwaiting from '../../assets/v3/dot-awaiting.svg'
import iMore from '../../assets/v3/icon-more.svg'
import iCheckWhite from '../../assets/v3/icon-check-white.svg'
import btnReschedule from '../../assets/v3/btn-reschedule.svg'
import btnMail from '../../assets/v3/btn-mail.svg'
import tCard from '../../assets/v3/tile-card.svg'
import tRepeat from '../../assets/v3/tile-repeat.svg'
import tCalendar from '../../assets/v3/tile-calendar.svg'
import tIntake from '../../assets/v3/tile-intake.svg'
import iClockSky from '../../assets/v3/icon-clock-sky.svg'
import btnCalendar from '../../assets/v3/btn-calendar.svg'

type Period = 'today' | 'week' | 'month'

function greeting(now: number): string {
  const hour = Number(fmt(new Date(now), { hour: 'numeric', hour12: false }))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/** Overview, v3 design (Figma "01 Overview — A · Compact"), on live data. */
export default function OverviewV3() {
  const now = useNow()
  const today = dayStart(new Date(now))
  const bookings = useBookings({ from: monthStart(today, -1), to: new Date(today.getTime() + 8 * DAY) })
  const followUps = useFollowUps()
  const patients = usePatients()
  const { data: profile } = useProfile()
  const [period, setPeriod] = useState<Period>('today')
  const [booking, setBooking] = useState(false)

  const all = bookings.data ?? []
  const byPatient = useMemo(() => new Map((patients.data ?? []).map((p) => [p.id, p])), [patients.data])
  const tomorrow = today.getTime() + DAY
  const todays = all.filter((b) => isLive(b) && b.startsAt >= today && b.startsAt.getTime() < tomorrow)
  const todayPaid = todays.filter(isPaid).length
  const practice = profile?.displayName ?? 'Your psychologist'
  const attention = buildAttention(all, followUps.data ?? [], now, today)

  return (
    <V3Shell alerts={attention.length > 0}>
      {/* Greeting */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-[6px] min-w-0">
          <h1 className="font-['General_Sans','Manrope',sans-serif] font-medium text-[26px] lg:text-[28px] leading-[1.15] tracking-[-0.48px]">
            {greeting(now)}{profile ? `, ${profile.displayName.split(' ').slice(0, 2).join(' ')}` : ''}
          </h1>
          <p className="text-[14px] leading-[1.5] text-[var(--v3-ink-3)]">
            {fmt(new Date(now), { weekday: 'long', day: 'numeric', month: 'long' })}
            {bookings.data && ` · ${todays.length} ${todays.length === 1 ? 'session' : 'sessions'} today`}
            {bookings.data && todays.length > 0 && ` · ${todayPaid} paid, ${todays.length - todayPaid} awaiting payment`}
          </p>
        </div>
        <div className="flex gap-[10px] items-center flex-wrap">
          <div className="bg-white rounded-full p-1 flex gap-[2px]" role="group" aria-label="Earnings period">
            {(['today', 'week', 'month'] as const).map((p) => (
              <button key={p} type="button" className="v3-nav v3-seg" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {p === 'today' ? 'Today' : p === 'week' ? 'This week' : 'This month'}
              </button>
            ))}
          </div>
          <button type="button" className="v3-pill-lg" onClick={() => setBooking(true)}><img src={greetPlus} alt="" width={18} height={18} />New booking</button>
        </div>
      </div>
      {booking && <NewBookingDialog onClose={() => setBooking(false)} />}

      {/* Row 1 */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,480fr)_minmax(0,560fr)_minmax(0,484fr)]">
        <NextSession bookings={all} patients={byPatient} now={now} loading={bookings.isLoading} />
        <Kpis bookings={all} followUps={followUps.data ?? []} period={period} now={now} today={today} loading={bookings.isLoading} />
        <div className="lg:col-span-2 xl:col-span-1 min-w-0 flex"><SessionsByMonth now={now} /></div>
      </div>

      {/* Row 2 */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,480fr)_minmax(0,1064fr)]">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[auto_1fr] min-w-0">
          <Collected bookings={all} now={now} />
          <BookingPage />
        </div>
        <Schedule bookings={all} patients={byPatient} now={now} today={today} practice={practice} loading={bookings.isLoading} />
      </div>

      {/* Row 3 */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,480fr)_minmax(0,560fr)_minmax(0,484fr)]">
        <div className="xl:col-span-2 min-w-0 flex"><Attention items={attention} practice={practice} loading={bookings.isLoading || followUps.isLoading} /></div>
        <Waitlist bookings={all} now={now} />
      </div>
      {bookings.error && <p role="alert" className="mt-4 v3-sub">{toApiError(bookings.error).userMessage}</p>}
      <p className="mt-6 text-center"><button type="button" className="v3-caption hover:text-[var(--v3-ink)] underline underline-offset-2" onClick={() => setUiVersion('classic')}>Switch to the classic Overview</button></p>
    </V3Shell>
  )
}

function CardHeader({ title, sub, right, id }: { title: string; sub?: string; right?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-[3px] min-w-0">
        <h2 id={id} className="v3-title">{title}</h2>
        {sub && <p className="v3-sub truncate">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/* ---------------- Next session ---------------- */

function startsIn(b: BookingSummary, now: number): string {
  const mins = Math.round((b.startsAt.getTime() - now) / 60_000)
  if (mins <= 0) return `In session · ends ${formatTime(b.endsAt)}`
  if (mins < 60) return `Starts in ${mins} min`
  if (mins < 24 * 60) return `Starts in ${Math.round(mins / 60)} h`
  return `${dayLabel(b.startsAt, now)}, ${formatTime(b.startsAt)}`
}

function NextSession({ bookings, patients, now, loading }: { bookings: BookingSummary[]; patients: Map<string, PatientSummary>; now: number; loading: boolean }) {
  const next = bookings.find((b) => (b.status === 'confirmed' || b.status === 'pending_payment') && b.endsAt.getTime() > now)
  const pid = next?.patientId ?? ''
  const notes = useQuery({ queryKey: careKeys.notes(pid), queryFn: () => listNotes(pid), enabled: !!pid })
  if (loading) return <section className="v3-card"><Skeleton className="h-[345px] rounded-[18px]" /></section>
  if (!next) {
    return (
      <section className="v3-card" aria-labelledby="next-h">
        <CardHeader id="next-h" title="Next session" sub="Nothing booked in the next week" />
        <div className="flex-1 rounded-[18px] bg-[var(--v3-subtle)] p-6 flex flex-col items-start justify-center gap-3">
          <p className="text-[14px] font-semibold">Your calendar is open</p>
          <p className="v3-sub">Share your booking page so patients can pick a time.</p>
          <Link to="/app/your-page" className="v3-pill">Open your page</Link>
        </div>
      </section>
    )
  }
  const paid = isPaid(next)
  const patient = patients.get(next.patientId)
  const latest = notes.data?.[0]
  const checks = [
    { label: 'Payment', value: paid ? formatINR(next.pricePaise) : 'Awaiting', sub: paid ? 'Received' : 'Due at session', ok: paid },
    { label: 'Notes', value: latest ? `${notes.data!.length} on file` : 'None yet', sub: latest ? `Updated ${fmt(latest.updatedAt, { day: 'numeric', month: 'short' })}` : 'After session', ok: !!latest },
    { label: 'Meet link', value: next.meetUrl ? 'Added' : 'Not added', sub: next.meetUrl ? 'Shared' : 'Add in settings', ok: !!next.meetUrl },
  ]
  return (
    <section className="v3-card" aria-labelledby="next-h">
      <CardHeader id="next-h" title="Next session" sub={`${startsIn(next, now)}${next.meetUrl ? ' · Google Meet' : ''}`}
        right={<span className={`v3-badge shrink-0 ${paid ? 'bg-[var(--v3-mint-soft)] text-[var(--v3-mint)]' : 'bg-[var(--v3-sun-soft)] text-[var(--v3-sun)]'}`}>
          <img src={paid ? dotMint : dotSun} alt="" width={6} height={6} />{formatINR(next.pricePaise)} · {paid ? 'Paid' : 'Awaiting'}</span>} />
      <div className="flex flex-col gap-2">
        <Link to={`/app/patients/${next.patientId}`} className="flex gap-3 items-center min-w-0 hover:opacity-80">
          <V3Avatar name={next.patientName} size={36} />
          <span className="font-bold text-[22px] leading-[1.2] tracking-[-0.3px] truncate">{next.patientName}</span>
        </Link>
        <div className="flex gap-2 items-center">
          <span className="v3-chip bg-[var(--v3-lime-soft)] text-[var(--v3-mint)]">Session {(patient?.sessionsCompleted ?? 0) + 1}</span>
          <span className="v3-sub truncate">{formatTime(next.startsAt)} · {next.sessionTypeName} · {durationMin(next)} min</span>
        </div>
      </div>
      <div className="flex gap-[10px]">
        {next.meetUrl
          ? <a href={next.meetUrl} target="_blank" rel="noreferrer" className="v3-pill-lg flex-1 min-w-0"><img src={btnVideo} alt="" width={18} height={18} />Join Google Meet</a>
          : <button type="button" disabled className="v3-pill-lg flex-1 min-w-0"><img src={btnVideo} alt="" width={18} height={18} />No meeting link</button>}
        <Link to={`/app/patients/${next.patientId}#notes-h`} className="v3-pill-lg v3-pill-lg--soft flex-1 min-w-0"><img src={btnNotes} alt="" width={18} height={18} />Session notes</Link>
      </div>
      <div className="bg-[var(--v3-subtle)] rounded-[16px] p-[10px] flex flex-col gap-2">
        <p className="px-1 flex gap-2 items-baseline">
          <span className="v3-label">Ready for {formatTime(next.startsAt)}</span>
          <span className="v3-caption">{checks.filter((c) => c.ok).length} of {checks.length} done</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {checks.map((c) => (
            <div key={c.label} className="bg-white rounded-[12px] px-3 py-[9px] flex flex-col gap-[2px] min-w-0" title={`${c.label}: ${c.value} · ${c.sub}`}>
              <span className="flex gap-[5px] items-center"><img src={checkCircle} alt="" width={14} height={14} className={c.ok ? '' : 'opacity-30 grayscale'} /><span className="v3-caption truncate">{c.label}</span></span>
              <span className="text-[13px] font-semibold leading-[1.3] truncate">{c.value} <span className={`hidden 2xl:inline text-[11px] font-normal ${c.ok ? 'text-[var(--v3-mint)]' : 'text-[var(--v3-sun)]'}`}>· {c.sub}</span></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- KPIs ---------------- */

const pct = (n: number) => `${(Math.round(n * 10) / 10).toString()}%`

function Kpis({ bookings, followUps, period, now, today, loading }: {
  bookings: BookingSummary[]; followUps: FollowUp[]; period: Period; now: number; today: Date; loading: boolean
}) {
  const t = today.getTime()
  const [from, to, prevFrom, prevTo] = period === 'today'
    ? [t, t + DAY, t - 7 * DAY, t - 6 * DAY]
    : period === 'week'
      ? [weekStart(today).getTime(), weekStart(today).getTime() + 7 * DAY, weekStart(today).getTime() - 7 * DAY, weekStart(today).getTime()]
      : [monthStart(today).getTime(), monthStart(today, 1).getTime(), monthStart(today, -1).getTime(), monthStart(today).getTime()]
  const earned = (a: number, b: number) => sumPaise(bookings.filter((x) => isPaid(x) && x.startsAt.getTime() >= a && x.startsAt.getTime() < b).map((x) => x.pricePaise))
  const cur = earned(from, to), prev = earned(prevFrom, prevTo)
  const change = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null

  const awaiting = bookings.filter((b) => b.status === 'pending_payment' && b.startsAt.getTime() >= t - 14 * DAY)
  const nextUnpaid = awaiting.find((b) => b.startsAt.getTime() >= t) ?? awaiting[0]

  const due = followUps.filter((f) => f.status === 'scheduled' && f.dueAt.getTime() < t + DAY)
  const overdue = due.filter((f) => f.dueAt.getTime() < t)
  const oldest = overdue[0]

  const rate = (a: number, b: number) => {
    const marked = bookings.filter((x) => (x.status === 'completed' || x.status === 'no_show') && x.startsAt.getTime() >= a && x.startsAt.getTime() < b)
    return marked.length ? (marked.filter((x) => x.status === 'no_show').length / marked.length) * 100 : null
  }
  const noShow = rate(monthStart(today).getTime(), now), noShowPrev = rate(monthStart(today, -1).getTime(), monthStart(today).getTime())
  const delta = noShow !== null && noShowPrev !== null ? noShow - noShowPrev : null

  const label = period === 'today' ? 'Today’s earnings' : period === 'week' ? 'This week’s earnings' : 'This month’s earnings'
  const vs = period === 'today' ? `vs last ${fmt(today, { weekday: 'long' })}` : period === 'week' ? 'vs last week' : 'vs last month'

  return (
    <section className="v3-card !p-[10px]" aria-label="Practice numbers">
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-[10px]">
      <Kpi className="v3-earnings" label={label} icon={kWallet} iconBg="v3-glass" value={loading ? null : formatINR(cur)}
        chip={change !== null ? <span className="v3-chip v3-glass">{change >= 0 ? '+' : '−'}{Math.abs(change)}%</span> : null}
        caption={change !== null ? vs : `Paid sessions ${period === 'today' ? 'today' : period === 'week' ? 'this week' : 'this month'}`} dark />
      <Kpi label="Awaiting payment" icon={kCard} value={loading ? null : formatINR(sumPaise(awaiting.map((b) => b.pricePaise)))}
        chip={<span className="v3-chip bg-[var(--v3-sun-soft)] text-[var(--v3-sun)]">{awaiting.length} {awaiting.length === 1 ? 'booking' : 'bookings'}</span>}
        caption={nextUnpaid ? `${firstName(nextUnpaid.patientName)} · ${dayLabel(nextUnpaid.startsAt, now)}` : 'Nothing pending'} />
      <Kpi label="Follow-ups due" icon={kRepeat} value={String(due.length)}
        chip={overdue.length ? <span className="v3-chip bg-[var(--v3-rose-soft)] text-[var(--v3-rose)]">{overdue.length} overdue</span>
          : <span className="v3-chip bg-[var(--v3-mint-soft)] text-[var(--v3-mint)]">On track</span>}
        caption={oldest ? `${shortName(oldest.patientName)}, ${Math.max(1, Math.round((t - dayStart(oldest.dueAt).getTime()) / DAY))} days` : due.length ? 'Due today' : 'Nothing due today'} />
      <Kpi label="No-show rate" icon={kTrending} value={loading ? null : noShow === null ? '—' : pct(noShow)}
        chip={delta !== null ? <span className={`v3-chip ${delta <= 0 ? 'bg-[var(--v3-mint-soft)] text-[var(--v3-mint)]' : 'bg-[var(--v3-rose-soft)] text-[var(--v3-rose)]'}`}>{delta <= 0 ? '−' : '+'}{Math.round(Math.abs(delta) * 10) / 10} pts</span> : null}
        caption={delta !== null ? 'vs last month' : noShow === null ? 'No sessions marked this month' : 'This month'} />
      </div>
    </section>
  )
}

const shortName = (n: string) => { const [a, b] = n.split(' '); return b ? `${a} ${b[0]}.` : n }

function Kpi({ label, icon, value, chip, caption, className = 'bg-[var(--v3-subtle)]', iconBg = 'bg-white', dark = false }: {
  label: string; icon: string; value: string | null; chip: React.ReactNode; caption: string; className?: string; iconBg?: string; dark?: boolean
}) {
  return (
    <div className={`${className} rounded-[18px] p-[14px] flex flex-col justify-between gap-2 min-w-0 min-h-[112px]`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`v3-label truncate ${dark ? 'text-white' : 'text-[var(--v3-ink-2)]'}`}>{label}</span>
        <span className={`${iconBg} w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0`}><img src={icon} alt="" width={16} height={16} /></span>
      </div>
      {value === null ? <Skeleton className="h-8 w-24" /> : <p className={`v3-num ${dark ? 'text-white' : ''}`}>{value}</p>}
      <div className="flex gap-2 items-center min-w-0">
        {chip}
        <span className={`text-[11px] leading-[1.4] truncate ${dark ? 'text-white' : 'text-[var(--v3-ink-3)]'}`}>{caption}</span>
      </div>
    </div>
  )
}

/* ---------------- Sessions by month ---------------- */

const BAR_H = 118

function SessionsByMonth({ now }: { now: number }) {
  const today = dayStart(new Date(now))
  const from = monthStart(today, -7), to = monthStart(today, 1)
  const q = useSessionsByMonth(from, to)
  const [hover, setHover] = useState<number | null>(null)
  const months = Array.from({ length: 8 }, (_, i) => {
    const m = monthStart(today, i - 7)
    const row = q.data?.find((r) => fmt(r.month, { year: 'numeric', month: '2-digit' }) === fmt(m, { year: 'numeric', month: '2-digit' }))
    return { label: fmt(m, { month: 'short' }), n: row?.newSessions ?? 0, r: row?.returningSessions ?? 0 }
  })
  const top = Math.max(10, Math.ceil(Math.max(...months.map((m) => m.n + m.r)) / 10) * 10)
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round(top - (top / 5) * i))
  const scale = BAR_H / top
  const active = hover ?? 7
  const sub = fmt(from, { year: 'numeric' }) === fmt(today, { year: 'numeric' }) ? `New and returning patients, ${fmt(today, { year: 'numeric' })}` : 'New and returning patients, last 8 months'

  return (
    <section className="v3-card flex-1 min-w-0" aria-labelledby="months-h">
      <CardHeader id="months-h" title="Sessions by month" sub={sub} />
      <div className="flex-1 bg-[var(--v3-subtle)] rounded-[18px] p-[14px] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="v3-label">Booked sessions</span>
          <span className="flex gap-3">
            <span className="flex gap-[5px] items-center text-[11px] text-[var(--v3-ink-2)]"><i className="w-[9px] h-[9px] rounded-[3px] bg-[var(--v3-lime)]" />New</span>
            <span className="flex gap-[5px] items-center text-[11px] text-[var(--v3-ink-2)]"><i className="w-[9px] h-[9px] rounded-[3px] bg-[var(--v3-ink)]" />Returning</span>
          </span>
        </div>
        {q.isLoading ? <Skeleton className="h-[200px] rounded-[12px]" /> : (
          <div className="flex gap-[10px]">
            <div className="flex flex-col justify-between w-5 text-[11px] leading-[1.4] text-[var(--v3-ink-3)]" style={{ height: BAR_H + 15 }} aria-hidden="true">
              {ticks.map((t) => <span key={t}>{t}</span>)}
            </div>
            <div className="relative flex-1 flex justify-between pt-[7px] min-w-0" role="img"
              aria-label={months.map((m) => `${m.label}: ${m.n} new, ${m.r} returning`).join('; ')}>
              {ticks.map((_, i) => <span key={i} className="absolute left-0 right-[-14px] h-px bg-[var(--v3-hairline)]" style={{ top: 7 + (i * BAR_H) / 5 }} />)}
              {months.map((m, i) => (
                <div key={m.label + i} className="relative flex flex-col gap-2 items-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <div className="flex flex-col gap-[3px] justify-end w-[22px]" style={{ height: BAR_H }}>
                    {m.n > 0 && <span className="rounded-[7px] bg-[var(--v3-lime)]" style={{ height: m.n * scale }} />}
                    {m.r > 0 && <span className="rounded-[7px] bg-[var(--v3-ink)]" style={{ height: m.r * scale }} />}
                  </div>
                  <span className={`text-[11px] leading-[1.4] ${i === active ? 'text-[var(--v3-ink)]' : 'text-[var(--v3-ink-3)]'}`}>{m.label}</span>
                  {i === active && (
                    <span className="absolute right-0 whitespace-nowrap rounded-full bg-[var(--v3-ink)] text-white px-[10px] py-[5px] text-[12px] font-medium leading-[1.3] pointer-events-none"
                      style={{ top: Math.max(0, BAR_H - (m.n + m.r) * scale - 30), right: i > 3 ? 0 : undefined, left: i > 3 ? undefined : 0 }}>
                      {m.n + m.r} {m.n + m.r === 1 ? 'session' : 'sessions'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------------- Collected + booking page ---------------- */

function Collected({ bookings, now }: { bookings: BookingSummary[]; now: number }) {
  const today = dayStart(new Date(now))
  const month = bookings.filter((b) => isLive(b) && b.startsAt >= monthStart(today) && b.startsAt < monthStart(today, 1))
  const booked = sumPaise(month.map((b) => b.pricePaise))
  const collected = sumPaise(month.filter(isPaid).map((b) => b.pricePaise))
  const share = booked ? Math.round((collected / booked) * 100) : 0
  return (
    <section className="v3-card" aria-labelledby="collected-h">
      <CardHeader id="collected-h" title="Collected this month" sub="Payments recorded for this month’s sessions" />
      <p className="flex gap-2 items-baseline whitespace-nowrap">
        <span className="v3-num">{formatINR(collected)}</span>
        <span className="v3-sub">of {formatINR(booked)} booked</span>
      </p>
      <div className="h-[14px] rounded-full bg-[var(--v3-sunken)] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share} aria-label="Collected">
        <div className="h-full rounded-full bg-[var(--v3-primary)] transition-[width] duration-200" style={{ width: `${share}%` }} />
      </div>
      <p className="flex justify-between">
        <span className="v3-label text-[var(--v3-primary)]">{share}% collected</span>
        <span className="v3-caption">{booked - collected > 0 ? `${formatINR(booked - collected)} still unpaid` : 'Nothing unpaid'}</span>
      </p>
    </section>
  )
}

function BookingPage() {
  const { data: profile } = useProfile()
  const types = useSessionTypes()
  const [copied, setCopied] = useState(false)
  const slug = profile?.slug
  const type = types.data?.find((t) => t.isActive)
  const slot = useQuery({
    queryKey: ['overview', 'next-slot', slug, type?.id],
    enabled: !!slug && !!type && !!profile?.published,
    queryFn: async () => (await getSlots(slug!, type!.id, new Date(), new Date(Date.now() + 14 * DAY), profile!.timezone))[0] ?? null,
  })
  const url = slug ? bookingUrl(slug) : null
  const copy = async () => {
    if (!url) return
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { window.prompt('Copy your booking link', url) }
  }
  const slotText = !profile?.published ? 'Publish your page to take bookings'
    : slot.data ? `Next free slot · ${fmt(slot.data, { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatTime(slot.data)}`
      : slot.isLoading ? 'Checking slots…' : 'No free slots in the next 2 weeks'

  return (
    <section className="v3-card" aria-labelledby="page-h">
      <CardHeader id="page-h" title="Your booking page"
        right={url ? <button type="button" className="v3-pill" onClick={copy} aria-live="polite"><img src={btnCopy} alt="" width={16} height={16} />{copied ? 'Copied' : 'Copy link'}</button>
          : <Link to="/app/settings#profile" className="v3-pill">Set up</Link>} />
      <a href={url ?? '/app/settings#profile'} target={url ? '_blank' : undefined} rel="noreferrer"
        className="v3-linkcard flex-1 min-h-[96px] rounded-[18px] p-[14px] flex flex-col justify-between gap-3 min-w-0 transition-[filter] duration-200 hover:brightness-110">
        <span className="flex items-center justify-between">
          <span className={`v3-chip ${profile?.published ? 'bg-[var(--v3-lime)] text-[var(--v3-ink)]' : 'v3-glass'}`}>{profile?.published ? 'Live' : 'Draft'}</span>
          <img src={iGlobe} alt="" width={20} height={20} />
        </span>
        <span className="flex flex-col gap-1 min-w-0">
          <span className="text-[15px] font-semibold leading-[1.3] truncate">{slug ? bookingUrlLabel(slug) : 'No link yet'}</span>
          <span className="text-[12px] leading-[1.4] text-white/80 truncate">{slotText}</span>
        </span>
      </a>
    </section>
  )
}

/* ---------------- Today's schedule ---------------- */


function Schedule({ bookings, patients, now, today, practice, loading }: {
  bookings: BookingSummary[]; patients: Map<string, PatientSummary>; now: number; today: Date; practice: string; loading: boolean
}) {
  const [query, setQuery] = useState('')
  const [unpaidOnly, setUnpaidOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const end = today.getTime() + 4 * DAY
  const upcoming = bookings.filter((b) => (b.status === 'confirmed' || b.status === 'pending_payment' || b.status === 'completed') && b.startsAt >= today && b.startsAt.getTime() < end)
  const rows = upcoming
    .filter((b) => b.patientName.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((b) => !unpaidOnly || !isPaid(b))
  const picked = upcoming.filter((b) => selected.has(b.id))
  const unpaidPicked = picked.filter((b) => !isPaid(b))
  const mail = reminderMailto(unpaidPicked, practice)
  const movable = picked.length === 1 && picked[0]!.status === 'confirmed' && picked[0]!.startsAt.getTime() > now
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((b) => selected.has(b.id))

  return (
    <section className="v3-card" aria-labelledby="schedule-h">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col gap-[3px]">
          <h2 id="schedule-h" className="v3-title">Today’s schedule</h2>
          <p className="v3-sub">{upcoming.length} {upcoming.length === 1 ? 'session' : 'sessions'} · today and next 3 days</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="bg-white border border-[var(--v3-hairline)] rounded-full px-[14px] py-[10px] flex gap-2 items-center w-full md:w-[240px]">
            <img src={iSearchSm} alt="" width={16} height={16} />
            <span className="sr-only">Search patients</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patients"
              className="flex-1 min-w-0 bg-transparent outline-none text-[13px] leading-[1.45] placeholder:text-[var(--v3-ink-3)]" />
          </label>
          <button type="button" className={`v3-pill shrink-0 ${unpaidOnly ? '!bg-[var(--v3-sun-soft)] !border-transparent' : ''}`} aria-pressed={unpaidOnly} onClick={() => setUnpaidOnly((u) => !u)}>
            <img src={iFilter} alt="" width={16} height={16} />Unpaid only
          </button>
        </div>
      </div>

      <div className="relative border border-[var(--v3-hairline)] rounded-[18px] overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-[var(--v3-subtle)] text-[12px] font-medium leading-[1.3] text-[var(--v3-ink-3)]">
              <th className="pl-4 py-[11px] w-[32px]"><Check on={allOn} label="Select all" onClick={() => setSelected(allOn ? new Set() : new Set(rows.map((b) => b.id)))} /></th>
              <th className="px-3 font-medium w-[112px]">Time</th>
              <th className="px-3 font-medium w-[30%]">Patient</th>
              <th className="px-3 font-medium">Session</th>
              <th className="px-3 font-medium w-[88px]">Fee</th>
              <th className="px-3 font-medium w-[112px]">Payment</th>
              <th className="pr-4 w-[40px]"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-4"><Skeleton className="h-[160px] rounded-[12px]" /></td></tr>}
            {!loading && rows.length === 0 && (
              <tr className="border-t border-[var(--v3-hairline)]"><td colSpan={7} className="px-4 py-8 text-center v3-sub">
                {upcoming.length ? 'No sessions match.' : 'No sessions in the next 4 days.'}
              </td></tr>
            )}
            {rows.map((b) => {
              const on = selected.has(b.id)
              const p = patients.get(b.patientId)
              const paid = isPaid(b)
              return (
                <ScheduleRow key={b.id} b={b} on={on} paid={paid} open={open === b.id} now={now}
                  sub={p?.focus || (p && p.sessionsCompleted === 0 ? 'New patient' : p ? `${p.sessionsCompleted} sessions done` : '')}
                  onToggle={() => toggle(b.id)} onMore={() => setOpen(open === b.id ? null : b.id)} />
              )
            })}
          </tbody>
        </table>
      </div>

      {picked.length > 0 && <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="v3-caption truncate">{picked.length} selected · {picked.map((b) => b.patientName).join(', ')}</p>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="v3-pill v3-pill--soft" onClick={() => setSelected(new Set())}>Clear</button>
          <button type="button" className="v3-pill v3-pill--soft" disabled={!movable} onClick={() => setOpen(picked[0]!.id)}>
            <img src={btnReschedule} alt="" width={16} height={16} />Reschedule
          </button>
          {mail
            ? <a href={mail} className="v3-pill v3-pill--dark"><img src={btnMail} alt="" width={16} height={16} />Send payment reminder</a>
            : <button type="button" disabled className="v3-pill v3-pill--dark" title={unpaidPicked.length ? 'No email on file' : 'Select an unpaid session'}>
                <img src={btnMail} alt="" width={16} height={16} />Send payment reminder</button>}
        </div>
      </div>}
      {picked.length === 0 && <Link to="/app/calendar" className="mt-auto self-start v3-caption hover:text-[var(--v3-ink)]">Open full calendar →</Link>}
    </section>
  )
}

function Check({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} onClick={onClick} className="v3-check">
      {on && <img src={iCheckWhite} alt="" width={12} height={12} />}
    </button>
  )
}

function ScheduleRow({ b, on, paid, open, now, sub, onToggle, onMore }: {
  b: BookingSummary; on: boolean; paid: boolean; open: boolean; now: number; sub: string; onToggle: () => void; onMore: () => void
}) {
  return (
    <>
      <tr className={`border-t border-[var(--v3-hairline)] ${on ? 'bg-[var(--v3-subtle)]' : 'bg-white'}`}>
        <td className="pl-4 py-[13px]"><Check on={on} label={`Select ${b.patientName}`} onClick={onToggle} /></td>
        <td className="px-3">
          <span className="block text-[12px] font-medium leading-[1.3]">{formatTime(b.startsAt)}</span>
          <span className="block v3-caption">{dayLabel(b.startsAt, now)}</span>
        </td>
        <td className="px-3">
          <Link to={`/app/patients/${b.patientId}`} className="flex gap-[10px] items-center hover:opacity-80">
            <V3Avatar name={b.patientName} size={32} />
            <span className="flex flex-col gap-px min-w-0">
              <span className="text-[12px] font-medium leading-[1.3] truncate">{b.patientName}</span>
              {sub && <span className="v3-caption truncate">{sub}</span>}
            </span>
          </Link>
        </td>
        <td className="px-3 min-w-0">
          <span className="block text-[13px] leading-[1.45] text-[var(--v3-ink-2)] truncate">{b.sessionTypeName}</span>
          <span className="block v3-caption">{durationMin(b)} min</span>
        </td>
        <td className="px-3 text-[12px] font-medium leading-[1.3]">{formatINR(b.pricePaise)}</td>
        <td className="px-3">
          <span className="flex gap-[7px] items-center text-[13px] leading-[1.45]"><img src={paid ? dotPaid : dotAwaiting} alt="" width={7} height={7} />{paid ? 'Paid' : 'Awaiting'}</span>
        </td>
        <td className="pr-4">
          <button type="button" onClick={onMore} aria-expanded={open} aria-label={`Actions for ${b.patientName}`} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--v3-sunken)]">
            <img src={iMore} alt="" width={18} height={18} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className={on ? 'bg-[var(--v3-subtle)]' : 'bg-white'}>
          <td colSpan={7} className="px-4 pb-3">
            <RowActions b={b} />
          </td>
        </tr>
      )}
    </>
  )
}

function RowActions({ b }: { b: BookingSummary }) {
  const canAct = b.status === 'confirmed' || b.status === 'pending_payment'
  return canAct ? <div className="pl-[44px]"><BookingActions booking={b} inline /></div>
    : <p className="pl-[44px] v3-caption">No actions for a {b.status === 'completed' ? 'completed' : 'past'} session. <Link to={`/app/patients/${b.patientId}`} className="underline">Open patient</Link></p>
}

/* ---------------- Needs your attention ---------------- */

function possessiveDay(d: Date, now: number): string {
  const l = dayLabel(d, now)
  return l === 'Today' ? 'today’s' : l === 'Yesterday' ? 'yesterday’s' : `the ${l}`
}

interface AttentionItem { key: string; tone: 'sun' | 'rose' | 'sky' | 'lavender'; name: string; text: string; booking?: BookingSummary; followUp?: FollowUp; href?: string }
const TILE: Record<AttentionItem['tone'], [string, string]> = {
  sun: ['bg-[var(--v3-sun-soft)]', tCard], rose: ['bg-[var(--v3-rose-soft)]', tRepeat], sky: ['bg-[var(--v3-sky-soft)]', tCalendar], lavender: ['bg-[var(--v3-lavender-soft)]', tIntake],
}

function buildAttention(bookings: BookingSummary[], followUps: FollowUp[], now: number, today: Date): AttentionItem[] {
  const t = today.getTime()
  const items: AttentionItem[] = []
  for (const b of bookings) {
    if (b.status === 'pending_payment' && b.startsAt.getTime() >= t - 14 * DAY && b.startsAt.getTime() < t + DAY) {
      const when = b.startsAt.getTime() < now ? `session was ${dayLabel(b.startsAt, now).toLowerCase()} at ${formatTime(b.startsAt)}` : `session ${Number(fmt(b.startsAt, { hour: 'numeric', hour12: false })) >= 17 ? 'tonight' : 'today'} at ${formatTime(b.startsAt)}`
      items.push({ key: b.id, tone: 'sun', name: b.patientName, text: `Unpaid · ${when}`, booking: b })
    }
  }
  for (const f of followUps) {
    if (f.status !== 'scheduled' || f.dueAt.getTime() > now) continue
    const days = Math.round((t - dayStart(f.dueAt).getTime()) / DAY)
    items.push({ key: f.id, tone: 'rose', name: f.patientName, text: days > 0 ? `Follow-up overdue by ${days} ${days === 1 ? 'day' : 'days'}` : 'Follow-up due today', followUp: f })
  }
  for (const b of bookings) {
    if (b.status === 'pending_payment' && b.startsAt.getTime() >= t + DAY) {
      items.push({ key: b.id, tone: 'sky', name: b.patientName, text: `${dayLabel(b.startsAt, now) === 'Tomorrow' ? 'Tomorrow’s' : `${fmt(b.startsAt, { weekday: 'long' })}’s`} booking not paid yet`, booking: b })
    }
    if (b.status === 'confirmed' && b.endsAt.getTime() < now) {
      items.push({ key: `${b.id}-o`, tone: 'lavender', name: b.patientName, text: `Mark how ${possessiveDay(b.startsAt, now)} ${formatTime(b.startsAt)} session went`, href: '/app/bookings' })
    }
  }
  return items
}

function Attention({ items, practice, loading }: { items: AttentionItem[]; practice: string; loading: boolean }) {
  const setStatus = useSetFollowUpStatus()
  const shown = items.slice(0, 4)
  const summary = items.length ? `${items.length} ${items.length === 1 ? 'thing' : 'things'} need you` : 'You’re all caught up'
  return (
    <section className="v3-card flex-1 min-w-0" aria-labelledby="attention-h">
      <CardHeader id="attention-h" title="Needs your attention" sub={loading ? ' ' : summary}
        right={items.length > 0 ? <span className="v3-badge bg-[var(--v3-sunken)] text-[var(--v3-ink-2)]">{items.length}</span> : undefined} />
      {loading && <Skeleton className="h-[200px] rounded-[18px]" />}
      {!loading && items.length === 0 && (
        <div className="flex-1 rounded-[18px] bg-[var(--v3-subtle)] p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
          <img src={checkCircle} alt="" width={18} height={18} />
          <p className="text-[14px] font-semibold">Nothing needs you</p>
          <p className="v3-sub max-w-[320px]">Unpaid sessions, due follow-ups and sessions to mark show up here.</p>
        </div>
      )}
      <div className="grid gap-x-8 gap-y-3 2xl:grid-cols-2">
      {shown.map((it) => {
        const [bg, icon] = TILE[it.tone]
        const mail = it.booking ? reminderMailto([it.booking], practice) : null
        return (
          <div key={it.key} className="flex gap-3 items-center">
            <span className={`${bg} w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0`}><img src={icon} alt="" width={20} height={20} /></span>
            <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
              <span className="text-[12px] font-medium leading-[1.3] truncate">{it.name}</span>
              <span className="v3-caption truncate">{it.text}</span>
            </span>
            {it.followUp ? <button type="button" className="v3-pill" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: it.followUp!.id, status: 'sent' })}>Check in</button>
              : it.href ? <Link to={it.href} className="v3-pill">Review</Link>
                : mail ? <a href={mail} className="v3-pill">Remind</a>
                  : <Link to="/app/bookings" className="v3-pill">View</Link>}
          </div>
        )
      })}
      </div>
      {items.length > 4 && <Link to="/app/bookings" className="v3-caption hover:underline">+{items.length - 4} more</Link>}
    </section>
  )
}

/* ---------------- Waitlist ---------------- */

function Waitlist({ bookings, now }: { bookings: BookingSummary[]; now: number }) {
  const list = useWaitlist()
  const setStatus = useSetWaitlistStatus()
  const { data: profile } = useProfile()
  const [adding, setAdding] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const waiting = list.data ?? []
  const opened = bookings.filter((b) => b.status === 'cancelled' && b.startsAt.getTime() > now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0]
  const first = waiting.find((w) => w.status === 'waiting') ?? waiting[0]

  async function offer(w: WaitlistEntry) {
    setNote(null)
    const link = profile?.slug ? bookingUrl(profile.slug) : ''
    const slotText = opened ? `${fmt(opened.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} at ${formatTime(opened.startsAt)}` : 'a time that suits you'
    const body = `Hi ${firstName(w.fullName)},\n\nA slot has opened up: ${slotText}.${link ? ` You can book it here: ${link}` : ''}\n\n${profile?.displayName ?? ''}`
    if (w.email) {
      window.location.assign(`mailto:${w.email}?${new URLSearchParams({ subject: 'A session slot opened up', body }).toString().replace(/\+/g, '%20')}`)
    } else {
      try { await navigator.clipboard.writeText(body); setNote('No email on file — message copied to paste in WhatsApp or SMS.') } catch { window.prompt('Copy this message', body) }
    }
    setStatus.mutate({ id: w.id, status: 'offered' })
  }

  return (
    <section className="v3-card" aria-labelledby="waitlist-h">
      <CardHeader id="waitlist-h" title="Waitlist" sub={waiting.length ? `${waiting.length} ${waiting.length === 1 ? 'patient' : 'patients'} waiting for a slot` : 'People waiting for an opening'}
        right={<button type="button" className="v3-pill" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>{adding ? 'Cancel' : 'Add person'}</button>} />
      {opened && (
        <div className="bg-[var(--v3-sky-soft)] rounded-[16px] p-3 flex gap-[10px] items-center text-[var(--v3-sky)]">
          <img src={iClockSky} alt="" width={18} height={18} />
          <span className="flex flex-col gap-[2px] min-w-0">
            <span className="text-[12px] font-medium leading-[1.3]">{fmt(opened.startsAt, { weekday: 'short' })}, {formatTime(opened.startsAt)} opened up</span>
            <span className="text-[11px] leading-[1.4] truncate">{opened.patientName} cancelled · {durationMin(opened)} min</span>
          </span>
        </div>
      )}
      {adding && <WaitlistForm onDone={() => setAdding(false)} />}
      {list.isLoading && <Skeleton className="h-[120px] rounded-[16px]" />}
      {!list.isLoading && waiting.length === 0 && !adding && (
        <div className="flex-1 rounded-[18px] bg-[var(--v3-subtle)] p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
          <img src={btnCalendar} alt="" width={18} height={18} className="opacity-70" />
          <p className="text-[14px] font-semibold">No one waiting</p>
          <p className="v3-sub max-w-[320px]">Add people who asked for a slot. When a session is cancelled, you can offer them the time in one tap.</p>
        </div>
      )}
      {waiting.slice(0, 3).map((w) => (
        <div key={w.id} className="flex gap-[10px] items-center group">
          <V3Avatar name={w.fullName} size={32} />
          <span className="flex-1 min-w-0 flex flex-col gap-px">
            <span className="text-[12px] font-medium leading-[1.3] truncate">{w.fullName}{w.status === 'offered' ? ' · offered' : ''}</span>
            <span className="v3-caption truncate">{w.preference || 'Any time'} · {Math.max(0, Math.floor((now - w.createdAt.getTime()) / DAY))} days</span>
          </span>
          <button type="button" className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--v3-ink-3)] hover:bg-[var(--v3-subtle)] hover:text-[var(--v3-ink)] text-[16px] leading-none" onClick={() => setStatus.mutate({ id: w.id, status: 'removed' })} aria-label={`Remove ${w.fullName}`} title="Remove">×</button>
        </div>
      ))}
      {note && <p role="status" className="v3-caption">{note}</p>}
      {first && (
        <button type="button" className="v3-pill-lg w-full mt-auto" onClick={() => void offer(first)} disabled={setStatus.isPending}>
          <img src={btnCalendar} alt="" width={18} height={18} />Offer slot to {firstName(first.fullName)}
        </button>
      )}
    </section>
  )
}

function WaitlistForm({ onDone }: { onDone: () => void }) {
  const add = useAddToWaitlist()
  const [v, setV] = useState({ fullName: '', email: '', phone: '', preference: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <form className="grid grid-cols-2 gap-2" noValidate onSubmit={(e) => {
      e.preventDefault(); setErrors({})
      add.mutate(v, { onSuccess: onDone, onError: (err) => { const a = toApiError(err); setErrors(a.fields ?? { form: a.userMessage }) } })
    }}>
      <label className="col-span-2"><span className="sr-only">Name</span><input className="v3-field" placeholder="Name" value={v.fullName} onChange={set('fullName')} aria-invalid={!!errors.full_name} /></label>
      <label><span className="sr-only">Email</span><input className="v3-field" type="email" placeholder="Email" value={v.email} onChange={set('email')} aria-invalid={!!errors.email} /></label>
      <label><span className="sr-only">Phone</span><input className="v3-field" type="tel" placeholder="Phone" value={v.phone} onChange={set('phone')} aria-invalid={!!errors.phone} /></label>
      <label className="col-span-2"><span className="sr-only">Preference</span><input className="v3-field" placeholder="Preference, e.g. Prefers mornings" maxLength={200} value={v.preference} onChange={set('preference')} /></label>
      {Object.values(errors).length > 0 && <p role="alert" className="col-span-2 text-[12px] text-[var(--v3-rose)]">{Object.values(errors).join(' ')}</p>}
      <button className="v3-pill v3-pill--dark col-span-2" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add to waitlist'}</button>
    </form>
  )
}
