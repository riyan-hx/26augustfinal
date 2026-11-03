import { useState } from 'react'
import { Search, CheckCircle2, Clock3, XCircle, AlertTriangle, ClipboardList } from '../lib/icons'
import { AnimatedNumber, SlidingTabs } from '../lib/animated'
import { formatINR } from '../lib/money'
import { relativeDateTime } from '../lib/format'
import { useBookings } from '../features/bookings/hooks'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateViews'
import { CopyBookingLinkButton } from '../features/practice/CopyBookingLinkButton'
import { NewBookingButton } from '../features/bookings/NewBookingDialog'
import { BookingActions } from '../features/bookings/BookingActions'
import type { BookingStatus } from '../types/domain'

const statusStyles: Record<BookingStatus, string> = {
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  pending_payment: 'bg-amber-50 border-amber-200 text-amber-700',
  completed: 'bg-slate-50 border-slate-200 text-slate-700',
  cancelled: 'bg-red-50 border-red-200 text-red-700',
  no_show: 'bg-zinc-100 border-zinc-300 text-zinc-600',
  expired: 'bg-zinc-100 border-zinc-300 text-zinc-600',
}

const statusLabel: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  pending_payment: 'Awaiting payment',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  expired: 'Hold expired',
}

const StatusIcon = ({ status }: { status: BookingStatus }) =>
  status === 'confirmed' ? <CheckCircle2 size={12} />
    : status === 'pending_payment' ? <Clock3 size={12} />
    : status === 'cancelled' ? <XCircle size={12} />
    : status === 'no_show' ? <AlertTriangle size={12} />
    : null

const filters = ['All', 'Awaiting payment', 'Confirmed', 'Completed', 'Cancelled', 'No-show'] as const
type BookingFilter = typeof filters[number]
const filterStatus: Record<Exclude<BookingFilter, 'All'>, BookingStatus> = {
  'Awaiting payment': 'pending_payment',
  Confirmed: 'confirmed',
  Completed: 'completed',
  Cancelled: 'cancelled',
  'No-show': 'no_show',
}
const matchesFilter = (f: BookingFilter, status: BookingStatus) => f === 'All' || filterStatus[f] === status

export default function BookingsPage() {
  const [filter, setFilter] = useState<BookingFilter>('All')
  const [query, setQuery] = useState('')
  const { data: bookings = [], isLoading, error, refetch } = useBookings()

  const q = query.trim().toLowerCase()
  const filtered = bookings
    .filter((b) => matchesFilter(filter, b.status))
    .filter((b) => !q || b.patientName.toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
  const counts = Object.fromEntries(
    filters.map((f) => [f, bookings.filter((b) => matchesFilter(f, b.status)).length]),
  ) as Record<BookingFilter, number>

  const noBookings = !isLoading && !error && bookings.length === 0
  const noMatches = !isLoading && !error && bookings.length > 0 && filtered.length === 0

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Bookings</h1>
          <p className="text-[12px] text-[var(--stone)] mt-1"><AnimatedNumber value={filtered.length} /> {filter === 'All' ? 'total' : filter.toLowerCase()} • Confirmed once paid</p>
        </div>
        <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 bg-white border border-[var(--hairline)] rounded-full px-3 py-2">
          <Search size={14} className="text-[var(--stone)]" />
          <span className="sr-only">Search bookings</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, booking ID…" className="bg-transparent outline-none text-[12px] w-[180px]" />
        </label>
        <NewBookingButton />
        </div>
      </div>

      <div className="mt-4">
        <SlidingTabs options={filters} active={filter} onChange={setFilter} counts={counts} size="sm" />
      </div>

      <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.8fr] gap-4 px-6 py-3 bg-[var(--canvas)] text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">
          <span>PATIENT / BOOKING</span><span>SESSION</span><span>DATE & TIME</span><span>AMOUNT</span><span>STATUS</span>
        </div>

        {isLoading && <SkeletonRows rows={6} />}
        {error && <ErrorState error={error} onRetry={() => void refetch()} />}
        {noBookings && (
          <EmptyState
            icon={<ClipboardList size={18} />}
            title="No bookings yet"
            description="When a patient books and pays through your page, the booking shows up here and on your calendar."
            action={<CopyBookingLinkButton />}
          />
        )}
        {noMatches && (
          <EmptyState
            title="No bookings match"
            description="Try another name, booking ID or filter."
            action={<button className="btn-secondary" onClick={() => { setQuery(''); setFilter('All') }}>Clear filters</button>}
          />
        )}

        <ul className="divide-y divide-[var(--hairline)]">
          {filtered.map((b) => (
            <li key={b.id}>
              <div className="hidden lg:grid grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.8fr] gap-4 px-6 py-4 items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={b.patientName} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-none truncate">{b.patientName}</p>
                    <p className="text-[11px] text-[var(--stone)] font-mono">{b.code}</p>
                  </div>
                </div>
                <span className="text-[12px]">{b.sessionTypeName}</span>
                <span className="text-[12px]">{relativeDateTime(b.startsAt)}</span>
                <span className="text-[12px] font-medium tabular-nums">{formatINR(b.pricePaise)}</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold w-fit ${statusStyles[b.status]}`}>
                  <StatusIcon status={b.status} /> {statusLabel[b.status]}
                </span>
              </div>
              <div className="lg:hidden p-4 flex gap-3">
                <Avatar name={b.patientName} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">{b.patientName} <span className="text-[11px] text-[var(--stone)] font-mono">• {b.code}</span></p>
                  <p className="text-[12px] text-[var(--stone)]">{b.sessionTypeName} • {relativeDateTime(b.startsAt)} • {formatINR(b.pricePaise)}</p>
                  <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusStyles[b.status]}`}>
                    <StatusIcon status={b.status} /> {statusLabel[b.status]}
                  </span>
                </div>
              </div>
              <BookingActions booking={b} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 bg-[var(--color-canvas-parchment)] border border-[var(--hairline)] rounded-[16px] p-4 flex gap-3">
        <div className="w-8 h-8 rounded-full bg-white border border-[var(--hairline)] flex items-center justify-center shrink-0"><Clock3 size={14} className="text-[var(--stone)]" /></div>
        <div>
          <p className="text-[13px] font-semibold">How confirmation works</p>
          <p className="text-[12px] text-[var(--slate)] leading-relaxed mt-1">A requested time is held for the patient until you mark it paid. If it isn’t marked paid within 3 days after the session, the hold is released and the booking shows as Hold expired.</p>
        </div>
      </div>
    </div>
  )
}
