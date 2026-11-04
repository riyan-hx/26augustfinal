import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from '../../lib/icons'
import { formatDateTime } from '../../lib/dates'
import { formatINR } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { SlidingTabs } from '../../lib/animated'
import { useBookings } from '../bookings/hooks'
import { BookingActions } from '../bookings/BookingActions'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/StateViews'
import type { BookingSummary } from '../../types/domain'

const tabs = ['Needs outcome', 'Completed', 'No-show'] as const
type Tab = typeof tabs[number]

const inTab = (t: Tab, b: BookingSummary, now: number) =>
  t === 'Needs outcome' ? b.status === 'confirmed' && b.endsAt.getTime() <= now
    : t === 'Completed' ? b.status === 'completed'
    : b.status === 'no_show'

export default function LiveSessions() {
  const now = useNow()
  const [tab, setTab] = useState<Tab>('Needs outcome')
  const past = useBookings({ to: new Date(now) })
  const all = past.data ?? []
  const rows = all.filter((b) => inTab(tab, b, now)).reverse()
  const count = (t: Tab) => all.filter((b) => inTab(t, b, now)).length

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <h1 className="text-[26px] font-semibold tracking-tight">Sessions</h1>
      <p className="text-[13px] text-[var(--stone)] mt-1">Sessions that have happened. Mark each one so your records and earnings stay accurate.</p>

      <div className="mt-6 grid lg:grid-cols-4 grid-cols-2 bg-white border border-[var(--hairline)] rounded-[16px] divide-x divide-[var(--hairline)] overflow-hidden">
        {tabs.map((t) => (
          <div key={t} className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--stone)]">{t}</p>
            <p className="text-[24px] font-semibold tabular-nums mt-1">{past.isLoading ? '—' : count(t)}</p>
          </div>
        ))}
        <div className="px-5 py-4 hidden lg:block">
          <p className="text-[11px] uppercase tracking-wide text-[var(--stone)]">Earned from completed</p>
          <p className="text-[24px] font-semibold tabular-nums mt-1">{past.isLoading ? '—' : formatINR(all.filter((b) => b.status === 'completed').reduce((s, b) => s + b.pricePaise, 0))}</p>
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
                  <Link to={`/app/patients/${b.patientId}`} className="text-[14px] font-semibold hover:underline">{b.patientName}</Link>
                  <p className="text-[12px] text-[var(--stone)] truncate">{b.sessionTypeName} · {formatDateTime(b.startsAt)} · {formatINR(b.pricePaise)}</p>
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
