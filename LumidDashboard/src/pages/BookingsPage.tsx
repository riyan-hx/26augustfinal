import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, CheckCircle2, Clock3, XCircle, AlertTriangle, ClipboardList, ChevronRight } from '../lib/icons'
import { AnimatedNumber, SlidingTabs } from '../lib/animated'
import { formatINR } from '../lib/money'
import { relativeDateTime } from '../lib/format'
import { useAwaitingPayments, useBookings } from '../features/bookings/hooks'
import { useNow } from '../lib/useNow'
import { sortForList } from '../features/bookings/sort'
import { readSessionValue, writeSessionValue } from '../lib/sessionValue'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateViews'
import { Badge, PageHeader, type BadgeTone } from '../components/ui/PageHeader'
import { CopyBookingLinkButton } from '../features/practice/CopyBookingLinkButton'
import { NewBookingButton } from '../features/bookings/NewBookingDialog'
import { BookingActions } from '../features/bookings/BookingActions'
import type { BookingStatus } from '../types/domain'

const statusTone: Record<BookingStatus, BadgeTone> = {
  confirmed: 'green',
  pending_payment: 'amber',
  completed: 'neutral',
  cancelled: 'rose',
  no_show: 'neutral',
  expired: 'neutral',
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

/** `?status=` values, so Overview and other screens can deep-link a tab. */
const filterParam: Record<BookingFilter, string | null> = {
  All: null,
  'Awaiting payment': 'awaiting',
  Confirmed: 'confirmed',
  Completed: 'completed',
  Cancelled: 'cancelled',
  'No-show': 'no-show',
}
const paramFilter = Object.fromEntries(
  Object.entries(filterParam).filter(([, v]) => v).map(([k, v]) => [v, k]),
) as Record<string, BookingFilter>

function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return <Badge tone={statusTone[status]} icon={<StatusIcon status={status} />} className={className}>{statusLabel[status]}</Badge>
}

const SEARCH_KEY = 'lumid:bookings-search'

export default function BookingsPage() {
  const [params, setParams] = useSearchParams()
  const filter: BookingFilter = paramFilter[params.get('status') ?? ''] ?? 'All'
  // Search stays in memory (and this tab's session storage), never in the URL:
  // patient names don't belong in history, logs or shared links.
  const [query, setQueryState] = useState(() => readSessionValue(SEARCH_KEY))
  const setQuery = (q: string) => { setQueryState(q); writeSessionValue(SEARCH_KEY, q) }
  const { data: bookings = [], isLoading, error, refetch } = useBookings()
  const awaitingQ = useAwaitingPayments()
  const now = useNow()

  // Tab changes are history entries, so Back returns to the previous tab.
  const setFilter = (f: BookingFilter) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    const v = filterParam[f]
    if (v) next.set('status', v); else next.delete('status')
    return next
  })
  const clearAll = () => { setQuery(''); setParams(new URLSearchParams(), { replace: true }) }

  const q = query.trim().toLowerCase()
  const filtered = sortForList(bookings
    .filter((b) => matchesFilter(filter, b.status))
    .filter((b) => !q || b.patientName.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)), now)
  const counts = Object.fromEntries(
    filters.map((f) => [f, bookings.filter((b) => matchesFilter(f, b.status)).length]),
  ) as Record<BookingFilter, number>

  const noBookings = !isLoading && !error && bookings.length === 0
  const noMatches = !isLoading && !error && bookings.length > 0 && filtered.length === 0
  const awaiting = awaitingQ.data ?? []

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
      <PageHeader
        title="Bookings"
        description="Every request and session in one list. A booking is confirmed once it’s marked paid."
        meta={<span><span className="font-semibold text-[var(--color-ink)] tabular-nums"><AnimatedNumber value={filtered.length} /></span> {filter === 'All' ? 'total' : filter.toLowerCase()}{q ? ` matching “${query.trim()}”` : ''}</span>}
        actions={
          <>
            <label className="field !w-auto flex items-center gap-2 !rounded-full !py-0 !min-h-[36px] focus-within:!border-[var(--color-primary)]">
              <Search size={14} className="text-[var(--color-ink-muted-48)] shrink-0" />
              <span className="sr-only">Search bookings</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient or booking ID" className="bg-transparent outline-none text-[13px] w-full sm:w-[190px] min-w-0" />
            </label>
            <NewBookingButton />
          </>
        }
      />

      {/* The one thing on this page that needs action: payments to collect. */}
      {awaiting.length > 0 && filter !== 'Awaiting payment' && (
        <button type="button" onClick={() => setFilter('Awaiting payment')}
          className="mb-4 w-full flex items-center gap-3 rounded-[14px] border border-[color-mix(in_oklch,var(--badge-amber-fg)_22%,var(--color-hairline))] bg-[var(--badge-amber-bg)] px-4 py-3 text-left hover:brightness-[0.98] transition">
          <span className="w-8 h-8 rounded-full bg-white/70 text-[var(--badge-amber-fg)] flex items-center justify-center shrink-0"><Clock3 size={15} /></span>
          <span className="flex-1 min-w-0 text-[13px] text-[var(--color-ink)]">
            <span className="font-semibold">{awaiting.length} {awaiting.length === 1 ? 'booking is' : 'bookings are'} awaiting payment</span>
            <span className="text-[var(--color-ink-muted-80)]"> · {formatINR(awaiting.reduce((s, b) => s + b.pricePaise, 0))} to collect</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--badge-amber-fg)]">Review <ChevronRight size={14} /></span>
        </button>
      )}

      <SlidingTabs options={filters} active={filter} onChange={setFilter} counts={counts} size="sm" />

      <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="list-head hidden lg:grid grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.8fr] gap-4 px-6 py-3 text-[11px] font-semibold tracking-[0.08em] text-[var(--color-ink-muted-48)]">
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
            action={<button className="btn-secondary" onClick={clearAll}>Clear filters</button>}
          />
        )}

        <ul className="divide-y divide-[var(--hairline)]">
          {filtered.map((b) => (
            <li key={b.id}>
              <div className="hidden lg:grid grid-cols-[1.2fr_1fr_0.9fr_0.6fr_0.8fr] gap-4 px-6 py-4 items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={b.patientName} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-none truncate">{b.patientName}</p>
                    <p className="text-[11px] text-[var(--color-ink-muted-48)] font-mono mt-1">{b.code}</p>
                  </div>
                </div>
                <span className="text-[12px]">{b.sessionTypeName}</span>
                <span className="text-[12px]">{relativeDateTime(b.startsAt)}</span>
                <span className="text-[13px] font-semibold tabular-nums">{formatINR(b.pricePaise)}</span>
                <StatusBadge status={b.status} />
              </div>
              <div className="lg:hidden p-4 flex gap-3">
                <Avatar name={b.patientName} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{b.patientName} <span className="text-[11px] text-[var(--stone)] font-mono">• {b.code}</span></p>
                  <p className="text-[12px] text-[var(--stone)]">{b.sessionTypeName} • {relativeDateTime(b.startsAt)} • {formatINR(b.pricePaise)}</p>
                  <StatusBadge status={b.status} className="mt-2" />
                </div>
              </div>
              <BookingActions booking={b} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 bg-[var(--color-surface-pearl)] border border-dashed border-[var(--hairline)] rounded-[16px] p-4 flex gap-3">
        <div className="w-8 h-8 rounded-full bg-white border border-[var(--hairline)] flex items-center justify-center shrink-0"><Clock3 size={14} className="text-[var(--color-ink-muted-48)]" /></div>
        <div>
          <p className="text-[13px] font-semibold">How confirmation works</p>
          <p className="text-[12px] text-[var(--slate)] leading-relaxed mt-1">A requested time is held for the patient until you mark it paid. If it isn’t marked paid within 3 days after the session, the hold is released and the booking shows as Hold expired.</p>
        </div>
      </div>
    </div>
  )
}
