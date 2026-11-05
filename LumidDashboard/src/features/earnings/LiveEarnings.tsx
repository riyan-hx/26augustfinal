import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, Clock3, CreditCard } from '../../lib/icons'
import { Badge, PageHeader, type BadgeTone } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '../../components/ui/StateViews'
import { formatDay, localDayBounds } from '../../lib/dates'
import { formatINR } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { CopyBookingLinkButton } from '../practice/CopyBookingLinkButton'
import { useAwaitingPayments } from '../bookings/hooks'
import { sumPaise } from '../../lib/money'
import { env } from '../../lib/env'
import { getSummary, listPayments } from './api'

const DAY = 86_400_000
const statusTone: Record<string, BadgeTone> = {
  captured: 'green',
  refunded: 'neutral',
  partially_refunded: 'amber',
  failed: 'rose',
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
  // Same source as the nav badge and the Bookings callout.
  const recent = useAwaitingPayments()
  const unpaid = recent.data ?? []

  const cards = [
    { label: 'Today', q: today, sub: (n: number) => `${n} paid session${n === 1 ? '' : 's'}` },
    { label: 'Last 7 days', q: week, sub: (n: number) => `${n} paid session${n === 1 ? '' : 's'}` },
    { label: 'Last 30 days', q: month, sub: (n: number) => `${n} paid session${n === 1 ? '' : 's'}` },
  ]

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
      <PageHeader
        title="Earnings"
        description={env.onlinePayments
          ? 'Money collected for sessions, after Razorpay fees and refunds. Not accounting software.'
          : 'Payments you’ve marked as collected for sessions, after refunds. Patients pay you directly. Not accounting software.'}
        actions={unpaid.length > 0 ? <Link to="/app/bookings?status=awaiting" className="btn-primary">Collect {unpaid.length} payment{unpaid.length === 1 ? '' : 's'}</Link> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, q, sub }, i) => (
          <div key={label} className={`bg-white border border-[var(--hairline)] rounded-[16px] p-5 ${i === 2 ? 'ring-1 ring-[color-mix(in_oklch,var(--color-primary)_20%,transparent)]' : ''}`}>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--color-ink-muted-48)] uppercase">{label}</p>
            {q.isLoading ? <Skeleton className="h-7 w-24 mt-2" /> : q.error ? <p className="text-[12px] text-[var(--stone)] mt-2">Couldn’t load</p> : (
              <>
                <p className="text-[24px] font-semibold mt-1.5 tabular-nums text-[var(--color-forest)]">{formatINR(q.data!.netPaise)}</p>
                <p className="text-[11px] text-[var(--color-ink-muted-48)] mt-0.5">{sub(q.data!.paidSessions)}{q.data!.refundedPaise > 0 ? ` · ${formatINR(q.data!.refundedPaise)} refunded` : ''}</p>
              </>
            )}
          </div>
        ))}
        <Link to="/app/bookings?status=awaiting" className={`group rounded-[16px] p-5 border transition-colors ${unpaid.length ? 'bg-[var(--badge-amber-bg)] border-[color-mix(in_oklch,var(--badge-amber-fg)_22%,var(--color-hairline))] hover:brightness-[0.98]' : 'bg-white border-[var(--hairline)] hover:bg-[var(--color-canvas-parchment)]'}`}>
          <p className={`text-[11px] font-semibold tracking-[0.08em] uppercase flex items-center gap-1.5 ${unpaid.length ? 'text-[var(--badge-amber-fg)]' : 'text-[var(--color-ink-muted-48)]'}`}><Clock3 size={12} />Awaiting payment</p>
          {recent.isLoading ? <Skeleton className="h-7 w-24 mt-2" /> : <p className="text-[24px] font-semibold mt-1.5 tabular-nums">{formatINR(sumPaise(unpaid.map((b) => b.pricePaise)))}</p>}
          <p className="text-[11px] text-[var(--color-ink-muted-80)] mt-0.5 flex items-center gap-1">{unpaid.length} unpaid session{unpaid.length === 1 ? '' : 's'}<ChevronRight size={12} className="ml-auto group-hover:translate-x-0.5 transition" /></p>
        </Link>
      </div>

      <div className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--hairline)]">
          <h2 className="text-[15px] font-semibold">Transaction history</h2>
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
                <p className="font-medium truncate">{p.patientName}</p>
                <p className="text-[var(--stone)] text-[11px]"><span className="font-mono">{p.code}</span>{p.capturedAt ? ` · ${formatDay(p.capturedAt)}` : ''} · {p.method}</p>
              </div>
              {env.onlinePayments && <span className="hidden sm:block text-[var(--stone)] tabular-nums">{p.feesPaise ? `Razorpay fee ${formatINR(p.feesPaise)}` : 'No fee'}</span>}
              <span className="font-semibold tabular-nums w-[84px] text-right">{formatINR(p.amountPaise - p.refundedPaise)}</span>
              <Badge tone={statusTone[p.status] ?? 'neutral'}>{statusLabel(p.status)}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
