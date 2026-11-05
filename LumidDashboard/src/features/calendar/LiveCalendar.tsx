import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Video, X } from '../../lib/icons'
import { DEFAULT_TIMEZONE, formatDay, formatTime, localDayBounds } from '../../lib/dates'
import { formatINR } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { useBookings } from '../bookings/hooks'
import { BookingActions } from '../bookings/BookingActions'
import { useAvailability } from '../practice/hooks'
import { CopyBookingLinkButton } from '../practice/CopyBookingLinkButton'
import { NewBookingButton } from '../bookings/NewBookingDialog'
import { PaymentBadge } from '../../components/ui/PaymentBadge'
import { Avatar } from '../../components/ui/Avatar'
import { ErrorState, Skeleton } from '../../components/ui/StateViews'
import { PageHeader } from '../../components/ui/PageHeader'
import type { BookingStatus, BookingSummary } from '../../types/domain'

const DAY = 86_400_000
const FIRST_HOUR = 8
const LAST_HOUR = 21
const HOUR_PX = 56
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i)
const SHOWN: BookingStatus[] = ['confirmed', 'pending_payment', 'completed', 'no_show']

const tone: Record<BookingStatus, string> = {
  confirmed: 'bg-[var(--badge-green-bg)] border-l-[var(--color-primary)] text-[var(--color-forest)]',
  pending_payment: 'bg-[var(--badge-amber-bg)] border-l-[var(--badge-amber-fg)] text-[#5E3A00]',
  completed: 'bg-[var(--color-canvas-parchment)] border-l-[var(--color-hairline-strong)] text-[var(--stone)]',
  no_show: 'bg-[var(--badge-neutral-bg)] border-l-[var(--badge-neutral-fg)] text-[var(--badge-neutral-fg)]',
  cancelled: '', expired: '',
}

/** Minutes since local midnight and weekday (0 = Sunday) in the practice timezone. */
function localClock(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TIMEZONE, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const top = (minutes: number) => ((minutes - FIRST_HOUR * 60) / 60) * HOUR_PX
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`

export default function LiveCalendar() {
  const now = useNow()
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const weekStart = useMemo(() => {
    const today = localDayBounds(new Date(now)).start
    return new Date(today.getTime() - localClock(new Date(now)).weekday * DAY + offset * 7 * DAY)
  }, [now, offset])
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY + 12 * 3_600_000))
  const week = useBookings({ from: weekStart, to: new Date(weekStart.getTime() + 7 * DAY) })
  const rules = useAvailability()

  const events = (week.data ?? []).filter((b) => SHOWN.includes(b.status))
  const selected = events.find((b) => b.id === selectedId) ?? null
  const nowClock = localClock(new Date(now))
  const todayIndex = offset === 0 ? nowClock.weekday : -1
  const range = `${formatDay(days[0]!)} – ${formatDay(days[6]!)}`
  const paid = events.filter((b) => b.paymentStatus === 'captured' || b.paymentStatus === 'partially_refunded')

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
      <PageHeader
        title="Calendar"
        description="Your week at a glance. Green bands are the hours patients can book."
        meta={<span className="font-semibold text-[var(--color-ink)]">{range} <span className="font-normal text-[var(--color-ink-muted-48)]">· times in IST</span></span>}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOffset(0)} disabled={offset === 0}>Today</button>
            <div className="flex rounded-full border border-[var(--color-hairline-strong)] bg-white">
              <button type="button" aria-label="Previous week" className="w-9 h-9 flex items-center justify-center rounded-l-full hover:bg-[var(--color-primary-tint)]" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={16} /></button>
              <button type="button" aria-label="Next week" className="w-9 h-9 flex items-center justify-center rounded-r-full hover:bg-[var(--color-primary-tint)] border-l border-[var(--hairline)]" onClick={() => setOffset((o) => o + 1)}><ChevronRight size={16} /></button>
            </div>
            <CopyBookingLinkButton className="btn-secondary" />
            <NewBookingButton />
          </>
        }
      />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden" aria-label="Week view">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-[var(--hairline)]">
                <span />
                {days.map((d, i) => {
                  const [wd, num] = [d.toLocaleDateString('en-IN', { timeZone: DEFAULT_TIMEZONE, weekday: 'short' }), d.toLocaleDateString('en-IN', { timeZone: DEFAULT_TIMEZONE, day: 'numeric' })]
                  const isToday = i === todayIndex
                  return (
                    <div key={i} className="py-3 flex flex-col items-center gap-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--stone)]">{wd}</span>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-semibold tabular-nums ${isToday ? 'bg-[var(--color-primary)] text-white' : ''}`}>{num}</span>
                    </div>
                  )
                })}
              </div>

              <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height: HOURS.length * HOUR_PX }}>
                <div className="relative">
                  {/* Labels sit centred on their line; the first and last are kept inside the grid. */}
                  {[...HOURS, LAST_HOUR].map((h) => (
                    <span key={h} className={`absolute right-2 text-[10px] text-[var(--stone)] tabular-nums leading-none ${h === FIRST_HOUR ? 'translate-y-0.5' : h === LAST_HOUR ? '-translate-y-full -mt-0.5' : '-translate-y-1/2'}`} style={{ top: top(h * 60) }}>{hourLabel(h)}</span>
                  ))}
                </div>
                {days.map((_, i) => (
                  <div key={i} className="relative border-l border-[var(--hairline)]">
                    {HOURS.map((h) => <div key={h} className="absolute inset-x-0 border-t border-[var(--hairline)]/70" style={{ top: top(h * 60) }} />)}
                    {(rules.data ?? []).filter((r) => r.weekday === i).map((r) => (
                      <div key={r.id} className="absolute inset-x-0 bg-[var(--color-primary-soft)]/40" style={{ top: Math.max(0, top(toMinutes(r.startTime))), height: top(toMinutes(r.endTime)) - Math.max(0, top(toMinutes(r.startTime))) }} />
                    ))}
                    {events.filter((b) => localClock(b.startsAt).weekday === i).map((b) => (
                      <EventBlock key={b.id} booking={b} selected={b.id === selectedId} onSelect={() => setSelectedId(b.id)} />
                    ))}
                    {i === todayIndex && nowClock.minutes >= FIRST_HOUR * 60 && nowClock.minutes < LAST_HOUR * 60 && (
                      <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: top(nowClock.minutes) }}>
                        <span className="absolute -left-1 -top-[4px] w-2 h-2 rounded-full bg-[var(--badge-rose-fg)]" />
                        <div className="h-px bg-[var(--badge-rose-fg)]" />
                      </div>
                    )}
                  </div>
                ))}

                {week.isLoading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Skeleton className="h-8 w-40 rounded-full" /></div>}
                {!week.isLoading && !week.error && events.length === 0 && (
                  <div className="absolute inset-0 flex items-start justify-center pt-24 pointer-events-none">
                    <div className="pointer-events-auto bg-white/95 backdrop-blur border border-[var(--hairline)] shadow-sm rounded-[14px] px-5 py-4 text-center max-w-[320px]">
                      <p className="text-[14px] font-semibold">No sessions this week</p>
                      <p className="text-[12px] text-[var(--stone)] mt-1">Green bands are your bookable hours. Patients pick a slot from your link.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {week.error && <ErrorState compact error={week.error} onRetry={() => void week.refetch()} />}
        </section>

        <aside className="space-y-4">
          {selected ? <BookingPanel key={selected.id} booking={selected} onClose={() => setSelectedId(null)} /> : (
            <section className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
              <h2 className="text-[15px] font-semibold">This week</h2>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Sessions" value={String(events.length)} />
                <Stat label="Paid" value={formatINR(paid.reduce((s, b) => s + b.pricePaise, 0))} />
                <Stat label="Awaiting" value={String(events.filter((b) => b.status === 'pending_payment').length)} />
              </dl>
              <p className="text-[12px] text-[var(--stone)] mt-4">Select a session to see details, join the call or mark the outcome.</p>
            </section>
          )}
          <section className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
            <h2 className="text-[15px] font-semibold">Bookable hours</h2>
            {rules.data?.length ? (
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {rules.data.map((r) => (
                  <li key={r.id} className="flex justify-between"><span className="text-[var(--stone)]">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.weekday]}</span><span className="tabular-nums">{r.startTime} – {r.endTime}</span></li>
                ))}
              </ul>
            ) : <p className="text-[12px] text-[var(--stone)] mt-2">No weekly hours yet, so patients can’t book.</p>}
            <Link to="/app/settings" className="btn-secondary mt-4 w-full justify-center">Edit hours</Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

function EventBlock({ booking: b, selected, onSelect }: { booking: BookingSummary; selected: boolean; onSelect: () => void }) {
  const start = localClock(b.startsAt).minutes
  const end = start + (b.endsAt.getTime() - b.startsAt.getTime()) / 60_000
  const y = top(Math.max(start, FIRST_HOUR * 60))
  const h = Math.max(24, top(Math.min(end, LAST_HOUR * 60)) - y - 2)
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className={`absolute left-1 right-1 z-[5] rounded-[6px] border-l-[3px] px-2 py-1 text-left overflow-hidden transition-shadow ${tone[b.status]} ${selected ? 'shadow-[0_4px_14px_rgba(0,0,0,0.12)] outline outline-1 outline-[var(--color-primary)]/50' : 'hover:shadow-sm'}`}
      style={{ top: y + 1, height: h }}>
      <p className="text-[12px] font-medium truncate">{b.patientName}</p>
      {h > 36 && <p className="text-[11px] opacity-80 truncate">{formatTime(b.startsAt)} · {b.sessionTypeName}</p>}
    </button>
  )
}

function BookingPanel({ booking: b, onClose }: { booking: BookingSummary; onClose: () => void }) {
  return (
    <section className="bg-white border border-[var(--hairline)] rounded-[16px] p-5" aria-label="Session details">
      <div className="flex items-start gap-3">
        <Avatar name={b.patientName} size={40} />
        <div className="flex-1 min-w-0">
          <Link to={`/app/patients/${b.patientId}`} className="text-[15px] font-medium hover:underline truncate block">{b.patientName}</Link>
          <p className="text-[12px] text-[var(--stone)]">{b.sessionTypeName}</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-canvas-parchment)]"><X size={14} /></button>
      </div>
      <dl className="mt-4 space-y-2 text-[13px]">
        <div className="flex justify-between"><dt className="text-[var(--stone)] flex items-center gap-1.5"><CalendarDays size={13} />Date</dt><dd>{formatDay(b.startsAt)}</dd></div>
        <div className="flex justify-between"><dt className="text-[var(--stone)] flex items-center gap-1.5"><Clock size={13} />Time</dt><dd className="tabular-nums">{formatTime(b.startsAt)} – {formatTime(b.endsAt)}</dd></div>
        <div className="flex justify-between"><dt className="text-[var(--stone)]">Fee</dt><dd className="flex items-center gap-2 tabular-nums">{formatINR(b.pricePaise)}<PaymentBadge booking={b} /></dd></div>
      </dl>
      {b.meetUrl
        ? <a href={b.meetUrl} target="_blank" rel="noreferrer" className="btn-primary w-full justify-center mt-4"><Video size={14} />Join Google Meet</a>
        : <p className="mt-4 text-[12px] text-[var(--stone)] bg-[var(--color-canvas-parchment)] rounded-[10px] px-3 py-2">Meet link appears here once Google Calendar is connected.</p>}
      <div className="mt-3"><BookingActions booking={b} inline /></div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[var(--stone)]">{label}</dt>
      <dd className="text-[20px] font-semibold tabular-nums mt-0.5 text-[var(--color-forest)]">{value}</dd>
    </div>
  )
}
