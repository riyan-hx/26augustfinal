import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { demoBookings, demoDelay } from '../demo/fixtures'
import { demoPaymentInfo } from '../bookings/api'

export interface EarningsSummary { collectedPaise: number; refundedPaise: number; feesPaise: number; netPaise: number; pendingPaise: number; paidSessions: number }
export interface PaymentRow {
  id: string; patientName: string; code: string; status: string
  amountPaise: number; feesPaise: number; refundedPaise: number; capturedAt: Date | null; method: string
}

interface SummaryRow { collected_paise: number; refunded_paise: number; fee_paise: number; net_paise: number; pending_paise: number; paid_sessions: number }
interface PaymentJoin {
  id: string; status: string; method: string | null; razorpay_order_id: string; amount_paise: number; fee_paise: number; tax_paise: number; refunded_paise: number; captured_at: string | null
  bookings: { code: string; patients: { full_name: string } | null } | null
}

// Demo: payments are derived from the demo bookings, so Earnings agrees with
// Overview and Bookings. Demo patients pay directly (UPI) at the session, so
// there are no gateway fees and the payment date is the session date — except
// payments marked in this visit, which keep the method and time recorded.
const PAID = new Set(['captured', 'partially_refunded', 'refunded'])

function demoPayments(): PaymentRow[] {
  return demoBookings
    .filter((b) => b.paymentStatus && PAID.has(b.paymentStatus))
    .map((b) => ({
      id: `pay-${b.id}`, patientName: b.patientName, code: b.code, status: b.paymentStatus!,
      amountPaise: b.pricePaise, feesPaise: 0, refundedPaise: b.paymentStatus === 'refunded' ? b.pricePaise : 0,
      capturedAt: demoPaymentInfo.get(b.id)?.capturedAt ?? b.startsAt, method: methodLabel(demoPaymentInfo.get(b.id)?.method ?? 'upi'),
    }))
    .sort((a, b) => b.capturedAt!.getTime() - a.capturedAt!.getTime())
}

function demoSummary(from: Date, to: Date): EarningsSummary {
  const inRange = demoPayments().filter((p) => p.capturedAt! >= from && p.capturedAt! < to)
  const collected = inRange.reduce((s, p) => s + p.amountPaise, 0)
  const refunded = inRange.reduce((s, p) => s + p.refundedPaise, 0)
  const pending = demoBookings
    .filter((b) => b.status === 'pending_payment' && b.startsAt >= from && b.startsAt < to)
    .reduce((s, b) => s + b.pricePaise, 0)
  return {
    collectedPaise: collected, refundedPaise: refunded, feesPaise: 0, netPaise: collected - refunded, pendingPaise: pending,
    paidSessions: inRange.filter((p) => p.status === 'captured' || p.status === 'partially_refunded').length,
  }
}

export async function getSummary(from: Date, to: Date): Promise<EarningsSummary> {
  if (isDemoMode) return demoDelay(demoSummary(from, to))
  const rows = unwrap(await db().rpc('earnings_summary', { p_from: from.toISOString(), p_to: to.toISOString() })) as SummaryRow[]
  const r = rows[0]
  return {
    collectedPaise: Number(r?.collected_paise ?? 0), refundedPaise: Number(r?.refunded_paise ?? 0), feesPaise: Number(r?.fee_paise ?? 0),
    netPaise: Number(r?.net_paise ?? 0), pendingPaise: Number(r?.pending_paise ?? 0), paidSessions: Number(r?.paid_sessions ?? 0),
  }
}

export async function listPayments(limit = 50): Promise<PaymentRow[]> {
  if (isDemoMode) return demoDelay(demoPayments().slice(0, limit))
  const rows = unwrap(
    await db().from('payments')
      .select('id, status, method, razorpay_order_id, amount_paise, fee_paise, tax_paise, refunded_paise, captured_at, bookings(code, patients(full_name))')
      .neq('status', 'created').order('created_at', { ascending: false }).limit(limit),
  ) as unknown as PaymentJoin[]
  return rows.map((r) => ({
    id: r.id, patientName: r.bookings?.patients?.full_name ?? 'Patient', code: r.bookings?.code ?? '—', status: r.status,
    amountPaise: r.amount_paise, feesPaise: r.fee_paise + r.tax_paise, refundedPaise: r.refunded_paise,
    capturedAt: r.captured_at ? new Date(r.captured_at) : null,
    method: r.razorpay_order_id.startsWith('offline:') ? methodLabel(r.method) : 'Razorpay',
  }))
}

const METHOD_LABELS: Record<string, string> = { upi: 'UPI', cash: 'Cash', bank_transfer: 'Bank transfer', card: 'Card', offline: 'Paid directly' }
const methodLabel = (m: string | null) => METHOD_LABELS[m ?? 'offline'] ?? 'Paid directly'
