import { Check, Clock3, Repeat2 } from '../../lib/icons'
import type { BookingSummary } from '../../types/domain'
import { Badge } from './PageHeader'

/** Payment state as a scannable pill: green Paid, amber Awaiting, sky Refunded. */
export function PaymentBadge({ booking: b, className = '' }: { booking: Pick<BookingSummary, 'status' | 'paymentStatus'>; className?: string }) {
  if (b.paymentStatus === 'refunded') return <Badge tone="sky" icon={<Repeat2 size={11} />} className={className}>Refunded</Badge>
  if (b.paymentStatus === 'captured' || b.paymentStatus === 'partially_refunded') return <Badge tone="green" icon={<Check size={11} />} className={className}>Paid</Badge>
  if (b.status === 'cancelled' || b.status === 'expired') return <Badge tone="neutral" className={className}>No charge</Badge>
  return <Badge tone="amber" icon={<Clock3 size={11} />} className={className}>Awaiting</Badge>
}
