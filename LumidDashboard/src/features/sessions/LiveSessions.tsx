import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList } from '../../lib/icons'
import { formatDateTime, localDayBounds } from '../../lib/dates'
import { formatINR } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { SlidingTabs } from '../../lib/animated'
import { useBookings } from '../bookings/hooks'
import { BookingActions } from '../bookings/BookingActions'
import { PaymentBadge } from '../../components/ui/PaymentBadge'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/StateViews'
import { PageHeader } from '../../components/ui/PageHeader'
import type { BookingSummary } from '../../types/domain'

const tabs = ['Needs outcome', 'Completed', 'No-show'] as const
type Tab = typeof tabs[number]
/** `?tab=completed|no-show` (default: needs outcome) */
const tabParam: Record<Tab, string | null> = { 'Needs outcome': null, Completed: 'completed', 'No-show': 'no-show' }
const paramTab: Record<string, Tab> = { completed: 'Completed', 'no-show': 'No-show' }

const inTab = (t: Tab, b: BookingSummary, now: number) =>
  t === 'Needs outcome' ? b.status === 'confirmed' && b.endsAt.getTime() <= now
    : t === 'Completed' ? b.status === 'completed'
    : b.status === 'no_show'

export default function LiveSessions() {
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const tab: Tab = paramTab[params.get('tab') ?? ''] ?? 'Needs outcome'
  const setTab = (t: Tab) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    const v = tabParam[t]
    if (v) next.set('tab', v); else next.delete('tab')
    return next
  })
  // Stable for the whole day (the key changes at midnight, not every minute);
  // sessions that haven't ended yet are filtered out below.
  const { end } = localDayBounds(new Date(now))
  const past = useBookings({ to: end })
  const all = (past.data ?? []).filter((b) => b.endsAt.getTime() <= now || b.status === 'completed' || b.status === 'no_show')
  const rows = all.filter((b) => inTab(tab, b, now)).reverse()
  const count = (t: Tab) => all.filter((b) => inTab(t, b, now)).length

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
      <PageHeader title="Sessions" description="Sessions that have happened. Mark each one so your records and earnings stay accurate." />

      <div className="grid lg:grid-cols-4 grid-cols-2 bg-white border border-[var(--hairline)] rounded-[16px] divide-x divide-[var(--hairline)] overflow-hidden">
        {tabs.map((t) => {
          const attention = t === 'Needs outcome' && !past.isLoading && count(t) > 0
          return (
            <button type="button" key={t} onClick={() => setTab(t)} className={`px-5 py-4 text-left transition-colors ${attention ? 'bg-[var(--badge-amber-bg)]/70 hover:bg-[var(--badge-amber-bg)]' : 'hover:bg-[var(--color-canvas-parchment)]'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${attention ? 'text-[var(--badge-amber-fg)]' : 'text-[var(--stone)]'}`}>{t}</p>
              <p className="text-[24px] font-semibold tabular-nums mt-1">{past.isLoading ? '—' : count(t)}</p>
            </button>
          )
        })}
        <div className="px-5 py-4 hidden lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--stone)]">Earned from completed</p>
          <p className="text-[24px] font-semibold tabular-nums mt-1 text-[var(--color-forest)]">{past.isLoading ? '—' : formatINR(all.filter((b) => b.status === 'completed').reduce((s, b) => s + b.pricePaise, 0))}</p>
        </div>
      </div>

      <section className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="px-5 pt-4 border-b border-[var(--hairline)] pb-3">
          <SlidingTabs options={tabs} active={tab} onChange={setTab} counts={past.isLoading ? undefined : { 'Needs outcome': count('Needs outcome'), Completed: count('Completed'), 'No-show': count('No-show') }} />
        </div>
        {past.isLoading && <SkeletonRows rows={4} />}
        {past.error && <ErrorState error={past.error} onRetry={() => void past.refetch()} />}
        {!past.isLoading && !past.error && rows.length === 0 && (
          <EmptyState icon={<ClipboardList size={18} />}
            title={tab === 'Needs outcome' ? 'Nothing to mark' : `No ${tab.toLowerCase()} sessions yet`}
            description={tab === 'Needs outcome' ? 'When a confirmed session ends, it waits here until you mark it completed or a no-show.' : 'Sessions you mark show up here with their fee.'}
            action={all.length === 0 ? <Link to="/app/calendar" className="btn-secondary">Open calendar</Link> : undefined} />
        )}
        <ul className="divide-y divide-[var(--hairline)]">
          {rows.map((b) => (
            <li key={b.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={b.patientName} />
                <div className="min-w-0">
                  <Link to={`/app/patients/${b.patientId}`} className="text-[14px] font-medium hover:underline">{b.patientName}</Link>
                  <p className="text-[12px] text-[var(--stone)] truncate">{b.sessionTypeName} · {formatDateTime(b.startsAt)} · {formatINR(b.pricePaise)}</p>
                  <PaymentBadge booking={b} className="mt-1.5" />
                </div>
              </div>
              <BookingActions booking={b} inline />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
