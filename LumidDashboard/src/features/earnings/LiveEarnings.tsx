import { useQuery } from '@tanstack/react-query'
import { CreditCard } from '../../lib/icons'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '../../components/ui/StateViews'
import { formatDay, localDayBounds } from '../../lib/dates'
import { formatINR } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { CopyBookingLinkButton } from '../practice/CopyBookingLinkButton'
import { useBookings } from '../bookings/hooks'
import { sumPaise } from '../../lib/money'
import { getSummary, listPayments } from './api'

const DAY = 86_400_000
const statusStyle: Record<string, string> = {
  captured: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  refunded: 'bg-zinc-100 border-zinc-300 text-zinc-600',
  partially_refunded: 'bg-amber-50 border-amber-200 text-amber-700',
  failed: 'bg-red-50 border-red-200 text-red-700',
}
const statusLabel = (s: string) => (s === 'captured' ? 'Paid' : s === 'partially_refunded' ? 'Part refunded' : s[0]!.toUpperCase() + s.slice(1))

export default function LiveEarnings() {
  const now = useNow()
  const { start } = localDayBounds(new Date(now))
  const day = start.getTime()
  const today = useQuery({ queryKey: ['earnings', 'today', day], queryFn: () => getSummary(new Date(day), new Date(day + DAY)) })
  const week = useQuery({ queryKey: ['earnings', 'week', day], queryFn: () => getSummary(new Date(day - 6 * DAY), new Date(day + DAY)) })
  const month = useQuery({ queryKey: ['earnings', 'month', day], queryFn: () => getSummary(new Date(day - 29 * DAY), new Date(day + DAY)) })
  const payments = useQuery({ queryKey: ['earnings', 'payments'], queryFn: () => listPayments() })
  // Unpaid sessions from two weeks back onwards, including upcoming ones.
  const recent = useBookings({ from: new Date(day - 14 * DAY) })
  const unpaid = (recent.data ?? []).filter((b) => b.status === 'pending_payment')

  const cards = [
    { label: 'Today', q: today, sub: (n: number) => `${n} paid session${n === 1 ? '' : 's'}` },
    { label: 'Last 7 days', q: week, sub: (n: number) => `${n} paid session${n === 1 ? '' : 's'}` },
    { label: 'Last 30 days', q: month, sub: (n: number) => `${n} paid session${n === 1 ? '' : 's'}` },
  ]

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <h1 className="font-serif text-[26px] font-semibold tracking-tight">Earnings</h1>
      <p className="text-[12px] text-[var(--stone)] mt-1">Money collected for sessions, after any Razorpay fees and refunds. Not accounting software.</p>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, q, sub }) => (
          <div key={label} className="bg-white border border-[var(--hairline)] rounded-[12px] p-5">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] uppercase">{label}</p>
            {q.isLoading ? <Skeleton className="h-7 w-24 mt-2" /> : q.error ? <p className="text-[12px] text-[var(--stone)] mt-2">Couldn’t load</p> : (
              <>
                <p className="text-[22px] font-semibold mt-1 tabular-nums">{formatINR(q.data!.netPaise)}</p>
                <p className="text-[11px] text-[var(--stone)]">{sub(q.data!.paidSessions)}{q.data!.refundedPaise > 0 ? ` · ${formatINR(q.data!.refundedPaise)} refunded` : ''}</p>
              </>
            )}
          </div>
        ))}
        <div className="bg-white border border-[var(--hairline)] rounded-[12px] p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] uppercase">Awaiting payment</p>
          {recent.isLoading ? <Skeleton className="h-7 w-24 mt-2" /> : <p className="text-[22px] font-semibold mt-1 tabular-nums">{formatINR(sumPaise(unpaid.map((b) => b.pricePaise)))}</p>}
          <p className="text-[11px] text-[var(--stone)]">{unpaid.length} unpaid session{unpaid.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--hairline)]">
          <h2 className="text-[13px] font-semibold">Transaction history</h2>
        </div>
        {payments.isLoading && <SkeletonRows rows={5} />}
        {payments.error && <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />}
        {!payments.isLoading && !payments.error && payments.data?.length === 0 && (
          <EmptyState icon={<CreditCard size={18} />} title="No payments yet" description="Payments appear here when you mark a session paid or a patient pays online." action={<CopyBookingLinkButton />} />
        )}
        <ul className="divide-y divide-[var(--hairline)]">
          {payments.data?.map((p) => (
            <li key={p.id} className="px-6 py-3.5 flex items-center gap-3 text-[12px]">
              <Avatar name={p.patientName} size={32} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{p.patientName}</p>
                <p className="text-[var(--stone)] text-[11px]"><span className="font-mono">{p.code}</span>{p.capturedAt ? ` · ${formatDay(p.capturedAt)}` : ''} · {p.method}</p>
              </div>
              <span className="hidden sm:block text-[var(--stone)] tabular-nums">{p.feesPaise ? `Fee ${formatINR(p.feesPaise)}` : '—'}</span>
              <span className="font-semibold tabular-nums w-[84px] text-right">{formatINR(p.amountPaise - p.refundedPaise)}</span>
              <span className={`px-2 py-1 rounded-full border text-[11px] font-semibold ${statusStyle[p.status] ?? 'bg-zinc-100 border-zinc-300 text-zinc-600'}`}>{statusLabel(p.status)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
